// Live regression check against the real chain. Needs Node 18+ and your RPC_URL.
//   node tests/live.js          run the seed list and compare with the saved baseline
//   node tests/live.js --save   save today's results as the new baseline
// The expectations below are things that should stay true. If one fails, check the token on Solscan
// BEFORE blaming the code, because an expectation can be wrong. Add your own tokens as new lines.
const fs = require("fs"), path = require("path");
const { scan } = require("../lib/scan");
const SEED = [
  { name: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", expect: { verdict: "Known issuer" } },
  { name: "USDT", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", expect: { verdict: "Known issuer" } },
  { name: "PYUSD", mint: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", expect: { verdict: "Known issuer" } },
  { name: "Wrapped SOL", mint: "So11111111111111111111111111111111111111112", expect: { checks: { mint: "ok", freeze: "ok" } } },
  { name: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", expect: { checks: { mint: "ok", freeze: "ok" } } },
  { name: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", expect: { checks: { mint: "ok", freeze: "ok" } } },
  { name: "DEGX (address pinned on the verified @degxifi account)", mint: "DHTSie9phDCpRZYV229bNk8b9hvs9PUZT4nW47Kyjupx", expect: { checks: { mint: "ok", freeze: "ok", top1: "ok", top10: "ok" } } },
];
const file = path.join(__dirname, "baseline.json");
const save = process.argv.includes("--save");
const base = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
const out = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let bad = 0;
  for (const t of SEED) {
    try {
      const r = await scan(t.mint);
      const st = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
      out[t.name] = { verdict: r.verdict, score: r.score, status: st };
      const problems = [];
      if (t.expect.verdict && r.verdict !== t.expect.verdict) problems.push("verdict is " + r.verdict + ", expected " + t.expect.verdict);
      for (const [id, want] of Object.entries(t.expect.checks || {})) if (st[id] !== want) problems.push(id + " is " + st[id] + ", expected " + want);
      const b = base[t.name];
      if (b && !save) {
        if (b.verdict !== r.verdict) problems.push("changed since baseline: verdict " + b.verdict + " -> " + r.verdict);
        for (const id of Object.keys(st)) if (b.status[id] && b.status[id] !== st[id]) problems.push("changed since baseline: " + id + " " + b.status[id] + " -> " + st[id]);
      }
      console.log((problems.length ? "CHECK " : "ok    ") + t.name + " | " + r.verdict + (r.score == null ? "" : " " + r.score) + " | " + r.coverage.done + "/" + r.coverage.total + " checks");
      problems.forEach((p) => console.log("        - " + p));
      if (problems.length) bad++;
    } catch (e) { bad++; console.log("ERROR " + t.name + " | " + e.message); }
    await sleep(1200);
  }
  if (save) { fs.writeFileSync(file, JSON.stringify(out, null, 2)); console.log("\nBaseline saved to tests/baseline.json"); }
  else console.log("\n" + (bad ? bad + " need a look (see above)" : "All clear"));
})();
