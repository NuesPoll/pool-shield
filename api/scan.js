const { scan } = require("../lib/scan");
const hits = new Map(); // Best effort, per instance; not a distributed quota.
const WINDOW = 60000, LIMIT = 120, MAX_KEYS = 5000;
function limited(ip) {
  const now = Date.now();
  let entry = hits.get(ip);
  if (entry && now - entry.start >= WINDOW) { hits.delete(ip); entry = null; }
  if (!entry) {
    if (hits.size >= MAX_KEYS) {
      for (const [key, value] of hits) if (now - value.start >= WINDOW) hits.delete(key);
      if (hits.size >= MAX_KEYS) return true;
    }
    entry = { start: now, count: 0 };
    hits.set(ip, entry);
  }
  if (entry.count >= LIMIT) return true;
  entry.count++;
  return false;
}
// Optional shared quota. Credentials stay on the server.
async function sharedLimited(ip) {
  const explicit = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN;
  const url = explicit ? process.env.UPSTASH_REDIS_REST_URL : process.env.KV_REST_API_URL;
  const token = explicit ? process.env.UPSTASH_REDIS_REST_TOKEN : process.env.KV_REST_API_TOKEN;
  if (!url && !token) return false;
  if (!url || !token) throw new Error("Incomplete shared quota configuration");
  const key = "pool-shield:scan:" + require("node:crypto").createHash("sha256").update(ip).digest("hex");
  const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(["EVAL", script, 1, key, WINDOW]),
    signal: AbortSignal.timeout(2500),
    redirect: "error"
  });
  if (!response.ok) throw new Error("Shared quota unavailable");
  const data = await response.json();
  if (!Number.isSafeInteger(data.result) || data.result < 1) throw new Error("Invalid shared quota response");
  return data.result > LIMIT;
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const ip = String((process.env.VERCEL ? req.headers["x-vercel-forwarded-for"] : null) || req.socket?.remoteAddress || "unknown").split(",")[0].trim().slice(0, 128);
  if (limited(ip)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many scans from this connection. Wait a minute and try again." });
  }
  const q = req.query || {};
  if (typeof q.mint !== "string" || !q.mint.trim() || q.mint.length > 2048) {
    return res.status(400).json({ error: "Enter a valid Solana token address or link." });
  }
  try {
    if (await sharedLimited(ip)) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Too many scans from this connection. Wait a minute and try again." });
    }
    const out = await scan(q.mint.trim(), { fresh: q.fresh === "1", quiet: q.live === "1", src: typeof q.src === "string" ? q.src.replace(/[^a-z0-9_-]/gi, "").slice(0, 20) : "" });
    return res.status(200).json(out);
  } catch (e) {
    if (e.code === "NOT_MINT" || /not a token mint/i.test(String(e.message))) return res.status(400).json({ error: "This address is not a token mint. Paste the token address, or a link to the token." });
    if (/valid Solana/i.test(String(e.message))) return res.status(400).json({ error: "Enter a valid Solana token address or link." });
    console.warn(JSON.stringify({ event: "scan_unavailable", category: e.name === "TimeoutError" ? "timeout" : "service_failure" }));
    return res.status(503).json({ error: "Scan service temporarily unavailable. Please try again." });
  }
};
