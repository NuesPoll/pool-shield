const { scan } = require("../lib/scan");
const hits = new Map(); // per-instance, best-effort limiter to protect the RPC quota
function limited(ip) {
  const now = Date.now();
  const a = (hits.get(ip) || []).filter((t) => now - t < 60000);
  a.push(now);
  hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > 60;
}
module.exports = async (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim();
  if (limited(ip)) return res.status(429).json({ error: "Too many scans from this connection. Wait a minute and try again." });
  const mint = String((req.query && req.query.mint) || "").trim();
  try {
    const out = await scan(mint);
    res.setHeader("Cache-Control", "s-maxage=60");
    res.status(200).json(out);
  } catch (e) {
    res.status(400).json({ error: e.name === "TimeoutError" ? "The network was slow. Please try again." : e.message });
  }
};
