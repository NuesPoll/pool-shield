// Offline tests with a mocked network. Run: node tests/unit.js
const assert = require("assert"), crypto = require("crypto");
const { scan, _onCurve, _clearCache } = require("../lib/scan");
let RPC_CALLS = 0;
const MINT = "DHTSie9phDCpRZYV229bNk8b9hvs9PUZT4nW47Kyjupx";
const SYS = "11111111111111111111111111111111";
const PDA = "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM";
const BURN = "1nc1nerator11111111111111111111111111111111";
const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const enc = (buf) => { let n = BigInt("0x" + buf.toString("hex")), s = ""; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; } return s; };
const wallet = () => enc(crypto.generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" }).slice(-32));

const pair = (o = {}) => ({ chainId: "solana", dexId: o.dex || "raydium", baseToken: o.baseToken || { address: MINT, name: "Test", symbol: "TST" }, quoteToken: o.quoteToken || { address: "Q", name: "Quote", symbol: "QTE" },
  liquidity: { usd: o.liq === undefined ? 500000 : o.liq }, volume: { h24: o.vol === undefined ? 200000 : o.vol }, pairCreatedAt: Date.now() - (o.ageDays === undefined ? 100 : o.ageDays) * 864e5, fdv: o.fdv || 5e6, url: "https://dexscreener.com/solana/x" });
const small = () => [2, 1.5, 1, 1, 0.5].map((pct) => ({ pct, owner: wallet() }));

function mock(s) {
  _clearCache(); RPC_CALLS = 0;
  global.fetch = async (url, opt) => {
    const ok = (b) => ({ ok: true, status: 200, json: async () => b });
    if (String(url).includes("rugcheck")) return s.rug === undefined ? { ok: false, status: 500, json: async () => ({}) } : { ok: true, status: 200, json: async () => s.rug };
    if (String(url).includes("dexscreener")) return ok({ pairs: s.pairs === undefined ? [pair()] : s.pairs });
    const { method, params } = JSON.parse(opt.body); RPC_CALLS++;
    if (method === "getAccountInfo") return ok({ result: { value: { data: { program: "spl-token", parsed: { type: s.notMint ? "account" : "mint", info: Object.assign({ decimals: 6, supply: "1000000000000000", mintAuthority: null, freezeAuthority: null }, s.mint) } } } } });
    if (method === "getTokenLargestAccounts") {
      if (s.holdersFail) return { ok: false, status: 500, json: async () => ({}) };
      return ok({ result: { value: s.holders.map((h, i) => ({ address: "T" + i, uiAmount: (h.pct / 100) * 1e9 })) } });
    }
    if (method === "getMultipleAccounts") {
      if (params[0][0].startsWith("T")) return ok({ result: { value: s.holders.map((h) => ({ data: { parsed: { info: { owner: h.owner } } } })) } });
      return ok({ result: { value: params[0].map((o) => { const h = s.holders.find((x) => x.owner === o); return h && h.nul ? null : { owner: (h && h.prog) || SYS }; }) } });
    }
  };
}
const get = (r, id) => r.checks.find((c) => c.id === id);
let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; console.log("PASS", name); } catch (e) { fail++; console.log("FAIL", name, "-", e.message); } }

(async () => {
  await t("clean token reads Lower risk with score 0", async () => {
    mock({ holders: small() }); const r = await scan(MINT);
    assert.strictEqual(r.verdict, "Lower risk"); assert.strictEqual(r.score, 0);
    assert.strictEqual(get(r, "lock").status, "unknown"); assert.strictEqual(r.coverage.done, r.coverage.total - 1);
  });
  await t("active mint and freeze authority are flagged High risk", async () => {
    mock({ holders: small(), mint: { mintAuthority: "X", freezeAuthority: "Y" } }); const r = await scan(MINT);
    assert.strictEqual(get(r, "mint").status, "bad"); assert.strictEqual(get(r, "freeze").status, "bad");
    assert.strictEqual(r.verdict, "High risk"); assert.ok(r.score >= 55);
  });
  await t("known stablecoin issuer is labelled, not scored", async () => {
    mock({ holders: small(), mint: { mintAuthority: "X", freezeAuthority: "Y" } }); const r = await scan("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    assert.strictEqual(r.verdict, "Known issuer"); assert.strictEqual(r.score, null); assert.strictEqual(get(r, "mint").status, "info");
  });
  await t("pool authority PDA holding 78.8% is not counted as a whale", async () => {
    mock({ holders: [{ pct: 78.8, owner: PDA, nul: true }, { pct: 4, owner: wallet() }, { pct: 2, owner: wallet() }] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "top1").status, "ok"); assert.ok(get(r, "top1").detail.includes("4.0%"));
    assert.ok(get(r, "vault").detail.includes("78.8%"));
  });
  await t("burn address is reported as burned", async () => {
    mock({ holders: [{ pct: 10, owner: BURN }, { pct: 2, owner: wallet() }] }); const r = await scan(MINT);
    assert.ok(get(r, "vault").detail.includes("burned")); assert.strictEqual(get(r, "top1").status, "ok");
  });
  await t("unrecognised program-owned holder is shown but not scored", async () => {
    mock({ holders: [{ pct: 40, owner: wallet(), prog: "SomeProgram11111111111111111111111111111111" }, { pct: 3, owner: wallet() }] }); const r = await scan(MINT);
    assert.ok(get(r, "vault").detail.includes("program-controlled")); assert.strictEqual(get(r, "top1").status, "ok");
  });
  await t("a real whale wallet is still flagged", async () => {
    mock({ holders: [{ pct: 35, owner: wallet() }, ...small()] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "top1").status, "bad");
  });
  await t("no trading pool is flagged", async () => {
    mock({ holders: small(), pairs: [] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "pool").status, "bad"); assert.ok(r.score >= 30);
  });
  await t("bonding-curve pool with no reported liquidity is unknown, not bad", async () => {
    mock({ holders: small(), pairs: [pair({ dex: "meteoradbc", liq: 0, vol: 0.11 })] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "liq").status, "unknown"); assert.strictEqual(r.pair.liquidityUsd, null); assert.strictEqual(get(r, "activity").status, "warn");
  });
  await t("thin brand-new pool is flagged", async () => {
    mock({ holders: small(), pairs: [pair({ liq: 8000, ageDays: 0.2 })] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "liq").status, "bad"); assert.strictEqual(get(r, "age").status, "bad");
  });
  await t("token name comes from the right side of the pair", async () => {
    mock({ holders: small(), pairs: [pair({ baseToken: { address: "OTHER", name: "Other", symbol: "OTH" }, quoteToken: { address: MINT, name: "Degxifi", symbol: "DEGX" } })] }); const r = await scan(MINT);
    assert.strictEqual(r.token.symbol, "DEGX");
  });
  await t("holder lookup failure degrades to unknown instead of crashing", async () => {
    mock({ holders: [], holdersFail: true }); const r = await scan(MINT);
    assert.strictEqual(get(r, "top1").status, "unknown"); assert.ok(r.coverage.done < r.coverage.total);
    assert.strictEqual(r.verdict, "Incomplete scan");
  });
  await t("invalid address is rejected", async () => { mock({ holders: [] }); await assert.rejects(() => scan("abc"), /valid Solana/); });
  await t("non-token address is rejected", async () => { mock({ holders: [], notMint: true }); await assert.rejects(() => scan(MINT), /not a token mint/); });
  await t("wallet vs program address detection", async () => {
    for (let i = 0; i < 40; i++) assert.ok(_onCurve(wallet()), "wallet misread as program");
    assert.ok(!_onCurve(PDA)); assert.ok(!_onCurve("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"));
  });
  await t("chain checks are cached but market data stays live", async () => {
    mock({ holders: small() }); await scan(MINT); const first = RPC_CALLS;
    await scan(MINT); assert.strictEqual(RPC_CALLS, first, "second scan hit the chain again");
    await scan(MINT, { fresh: true }); assert.ok(RPC_CALLS > first, "fresh did not bypass the cache");
  });
  await t("failed holder lookups are not cached", async () => {
    mock({ holders: [], holdersFail: true }); await scan(MINT); const first = RPC_CALLS; await scan(MINT);
    assert.ok(RPC_CALLS > first);
  });
  await t("fully locked liquidity reads ok", async () => { mock({ holders: small(), rug: { lpLockedPct: 100 } }); const r = await scan(MINT); assert.strictEqual(get(r, "lock").status, "ok"); });
  await t("unlocked LP on a young pool is flagged", async () => {
    mock({ holders: small(), rug: { lpLockedPct: 0 }, pairs: [pair({ ageDays: 3 })] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "lock").status, "bad");
  });
  await t("unlocked LP on an old pool is only a warning", async () => {
    mock({ holders: small(), rug: { lpLockedPct: 0 }, pairs: [pair({ ageDays: 200 })] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "lock").status, "warn");
  });
  await t("lock lookup failure stays unknown", async () => { mock({ holders: small() }); const r = await scan(MINT); assert.strictEqual(get(r, "lock").status, "unknown"); });
  await t("bonding curve skips the lock check", async () => {
    mock({ holders: small(), rug: { lpLockedPct: 0 }, pairs: [pair({ dex: "meteoradbc", liq: 0 })] }); const r = await scan(MINT);
    assert.strictEqual(get(r, "lock").status, "unknown");
  });
  await t("response carries price and timing for the live view", async () => {
    mock({ holders: small() }); const r = await scan(MINT);
    assert.ok(r.pair.priceUsd !== undefined && r.scannedAt && r.chainAgeSec >= 0);
  });
  console.log("\n" + pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
})();
