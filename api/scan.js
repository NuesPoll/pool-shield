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
    const out = await scan(q.mint.trim(), { fresh: q.fresh === "1", quiet: q.live === "1", src: typeof q.src === "string" ? q.src.replace(/[^a-z0-9_-]/gi, "").slice(0, 20) : "" });
    return res.status(200).json(out);
  } catch (e) {
    if (e.code === "NOT_MINT" || /not a token mint/i.test(String(e.message))) return res.status(400).json({ error: "This address is not a token mint. Paste the token address, or a link to the token." });
    if (/valid Solana/i.test(String(e.message))) return res.status(400).json({ error: "Enter a valid Solana token address or link." });
    return res.status(503).json({ error: "Scan service temporarily unavailable. Please try again." });
  }
};
