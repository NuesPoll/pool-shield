const { scan } = require("../lib/scan");
module.exports = async (req, res) => {
  const mint = String((req.query && req.query.mint) || "").trim();
  try {
    const out = await scan(mint);
    res.setHeader("Cache-Control", "s-maxage=60");
    res.status(200).json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
