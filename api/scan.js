const { scan } = require("../lib/scan");
const hits = new Map(); // per-instance, best-effort limiter to protect the RPC quota
function limited(ip) {
  const now = Date.now();
  const a = (hits.get(ip) || []).filter((t) => now - t < 60000);
  a.push(now);
  hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > 120;
}
module.exports = async (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim();
  if (limited(ip)) return res.status(429).json({ error: "Too many scans from this connection. Wait a minute and try again." });
  const mint = String((req.query && req.query.mint) || "").trim();
  try {
    const out = await scan(mint, { fresh: req.query && req.query.fresh === "1", quiet: req.query && req.query.live === "1", src: String((req.query && req.query.src) || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 20) });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(out);
  } catch (e) {
    res.status(400).json({ error: e.name === "TimeoutError" ? "The network was slow. Please try again." : e.message });
  }
};
