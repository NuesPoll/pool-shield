// Pool Shield scanner: reads public Solana chain data + Dexscreener. No keys needed.
function cleanRpc(v) {
  let u = String(v || "").trim().replace(/^["']|["']$/g, "");
  if (!u) return "https://api.mainnet-beta.solana.com";
  u = u.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}
const RPC = cleanRpc(process.env.RPC_URL);

// Vault owners: balances here are liquidity, not whales.
const POOL_PROGRAMS = new Set([
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN", // Meteora bonding curve
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG", // Meteora DAMM v2
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB", // Meteora Dynamic AMM
]);
const VERSION = "2.4.0";
const SYSTEM = "11111111111111111111111111111111";
const BURN = new Set(["1nc1nerator11111111111111111111111111111111"]);
const POOL_AUTHORITIES = new Set(["5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"]);

// A wallet address is a point on the ed25519 curve. Program-controlled accounts (pools, vaults, bonding curves)
// use PDA addresses, which are by design OFF the curve. So an off-curve owner can only be a program.
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58bytes(str) {
  let n = 0n;
  for (const c of str) { const i = B58.indexOf(c); if (i < 0) return null; n = n * 58n + BigInt(i); }
  const out = [];
  while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
  for (const c of str) { if (c === "1") out.unshift(0); else break; }
  return out;
}
const FP = (1n << 255n) - 19n;
function modPow(b, e, m) { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; }
const FD = (((FP - 121665n) % FP) * modPow(121666n, FP - 2n, FP)) % FP;
function onCurve(addr) {
  const b = b58bytes(addr);
  if (!b || b.length !== 32) return true; // unknown format: treat as a normal wallet
  let y = 0n;
  for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(i === 31 ? b[i] & 0x7f : b[i]);
  if (y >= FP) return false;
  const y2 = (y * y) % FP;
  const u = (y2 - 1n + FP) % FP, v = (FD * y2 + 1n) % FP;
  const x2 = (u * modPow(v, FP - 2n, FP)) % FP;
  return x2 === 0n || modPow(x2, (FP - 1n) / 2n, FP) === 1n;
}

// Regulated stablecoins: issuer powers are by design, so we label them instead of scoring them as risk.
const KNOWN = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "Circle (USDC)",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "Tether (USDT)",
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": "Paxos (PYUSD)",
};

// id: [label, label (Pidgin), why it matters, why it matters (Pidgin)]
const T = {
  mint: ["Mint authority", "Who fit print more", "Think of a printing press. If the creator keeps it, they can print millions of new tokens and sell them, so each token you hold is worth less. Revoked means the press was destroyed.", "Na like printing machine. If creator still get am, e fit print plenty new tokens sell, so your own go dey worth less. Revoked mean say dem don destroy the machine."],
  freeze: ["Freeze authority", "Who fit freeze wallet", "Think of a padlock the creator can put on your wallet. If they keep it, they can stop you from selling and trap your money. Revoked means nobody can lock your tokens.", "Na like padlock wey creator fit put for your wallet. If dem still get am, dem fit stop you to sell and trap your money. Revoked mean say nobody fit lock your tokens."],
  ext: ["Token extensions", "Special token rules", "Some tokens carry hidden rules. A transfer fee takes a cut every time tokens move, and a permanent delegate lets one wallet take tokens from anyone. Plain tokens have none of these.", "Some tokens get hidden rules. Transfer fee dey collect small part every time tokens move, and permanent delegate let one wallet carry tokens from anybody. Normal tokens no get these ones."],
  top1: ["Biggest wallet", "Biggest wallet", "One huge holder can dump and crash the price, leaving pool providers holding the worst token.", "If one wallet get plenty, e fit dump and price go crash. Pool providers go carry the loss."],
  top10: ["Top 10 wallets", "Top 10 wallets", "If a few wallets own most of the supply, they control the price.", "If few wallets own most of the tokens, na dem dey control price."],
  pool: ["Trading pool", "Trading pool", "No pool means nowhere to trade, so there is nothing to provide liquidity to.", "No pool mean say nowhere to trade, so you no fit add liquidity."],
  liq: ["Liquidity depth", "How deep the pool be", "Thin pools move a lot on small trades and are hard to exit.", "If pool thin, small trade fit shake price and e go hard to comot."],
  age: ["Pool age", "How old the pool be", "Most rugs happen in the first day or two. Older pools have survived longer.", "Most rug dey happen for first day or two. Older pool don survive pass."],
  ratio: ["Liquidity vs value", "Liquidity vs value", "If liquidity is tiny compared to market cap, the price can swing hard.", "If liquidity small pass market cap, price fit swing well well."],
  vault: ["Pool and program holdings", "Wetin dey pool and program", "Tokens inside a pool or program account are not held by a person, so we do not count them as whales. Check that it is a normal pool.", "Tokens wey dey inside pool or program no dey person hand, so we no count dem as whales. Check say na normal pool."],
  activity: ["Trading activity", "How people dey trade", "Liquidity providers earn fees from trades. With almost no volume, a pool earns little and exits can be slow.", "Liquidity providers dey earn fee from trade. If nobody dey trade, pool go earn small and e fit slow to comot."],
  yield: ["Volume vs liquidity", "Trade vs liquidity", "Liquidity providers earn fees when people trade. This compares one day of trading with the size of the pool. Very low means little income. Very high can mean hype or fake volume.", "Liquidity providers dey earn fee when people dey trade. This one compare one day trading with the pool size. Very low mean small income. Very high fit mean hype or fake volume."],
  lock: ["Liquidity lock", "Liquidity lock", "If the creator can pull the pool money out, that is a rug. Check that the LP is locked or burned.", "If creator fit comot the pool money, na rug be that. Check say LP dey locked or burned."],
};

async function rpc(method, params) {
  let host;
  try { host = new URL(RPC).host; }
  catch (e) { throw new Error("Your RPC URL is not valid. Delete rpc.txt and paste the full https:// URL from Alchemy or Helius."); }
  for (let i = 0; i < 3; i++) {
    const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(10000) });
    if (r.status === 429 && i < 2) { await new Promise((res) => setTimeout(res, 900 * (i + 1))); continue; }
    if (!r.ok) {
      const hint = host === "api.mainnet-beta.solana.com" ? " Your key is NOT being used (public node)." : " Your key is being used; wait a few seconds and scan again.";
      throw new Error("RPC error " + r.status + " from " + host + "." + hint);
    }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  }
}

const CHAIN_TTL = 5 * 60 * 1000, MARKET_TTL = 8 * 1000;
const chainCache = new Map(), marketCache = new Map();
const cget = (map, key, ttl) => { const e = map.get(key); return e && Date.now() - e.t < ttl ? e : null; };
const cset = (map, key, v) => { map.delete(key); while (map.size >= 500) map.delete(map.keys().next().value); map.set(key, { t: Date.now(), v }); };
function clearCache() { chainCache.clear(); marketCache.clear(); }

function mkAdd(known) {
  const checks = [];
  let risk = 0;
  const add = (id, status, en, pcm, pts = 0) => {
    if (known && (id === "top1" || id === "top10") && status !== "ok") status = "info";
    const t = T[id];
    checks.push({ id, status, label: t[0], labelPcm: t[1], why: t[2], whyPcm: t[3], detail: en, detailPcm: pcm });
    if (!known) risk += pts;
  };
  return { checks, add, risk: () => risk };
}

// Third-party lock data (RugCheck, free read endpoint). Any failure returns null and the row shows as unknown.
async function fetchLock(mint) {
  try {
    const r = await fetch("https://api.rugcheck.xyz/v1/tokens/" + mint + "/report/summary", { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.lpLockedPct == null || typeof j.lpLockedPct !== "number") return null;
    const p = j.lpLockedPct;
    return Number.isFinite(p) && p >= 0 && p <= 100 ? p : null;
  } catch (e) { return null; }
}

// On-chain safety checks. These change slowly, so they are cached for a few minutes.
async function chainPart(mint, known) {
  const { checks, add, risk } = mkAdd(known);
  const acc = await rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  const data = acc.value && acc.value.data;
  if (!data || !data.parsed || data.parsed.type !== "mint") { const err = new Error("This address is not a token mint. Paste the token address, or a link to the token."); err.code = "NOT_MINT"; throw err; }
  const m = data.parsed.info;
  const supply = Number(m.supply) / Math.pow(10, m.decimals);
  const issuerEn = known ? "Controlled by " + known + ", the issuer. Normal for a regulated stablecoin, but they hold this power." : "";
  const issuerPcm = known ? "Na " + known + " (the issuer) hold am. E normal for stablecoin, but dem get this power." : "";

  if (m.mintAuthority) known ? add("mint", "info", issuerEn, issuerPcm) : add("mint", "bad", "The creator can still mint new tokens and dilute holders.", "Creator fit still print new tokens and make your own value drop.", 30);
  else add("mint", "ok", "Revoked. The supply is fixed.", "Dem don remove am. Supply no go change.");

  if (m.freezeAuthority) known ? add("freeze", "info", issuerEn, issuerPcm) : add("freeze", "bad", "The creator can freeze wallets so holders cannot sell.", "Creator fit freeze wallet, you no go fit sell.", 25);
  else add("freeze", "ok", "Revoked. Nobody can freeze your tokens.", "Dem don remove am. Nobody fit freeze your tokens.");

  const ext = (m.extensions || []).map((e) => e.extension);
  if (ext.includes("permanentDelegate")) add("ext", "bad", "A permanent delegate can move or burn tokens from any wallet.", "One wallet get power to carry or burn tokens from any wallet.", 30);
  else if (ext.includes("transferHook")) add("ext", "warn", "A transfer hook runs custom code on every transfer. Read what it does.", "Special code dey run for every transfer. Read wetin e dey do.", 15);
  else if (ext.includes("transferFeeConfig")) add("ext", "warn", "Every transfer pays a fee to the creator.", "Every transfer dey pay fee to creator.", 10);
  else add("ext", "ok", ext.length ? "Extensions present, none of the risky ones." : "Standard token, no special extensions.", "Normal token, no wahala.");

  let holderList = [];
  try {
    const lg = await rpc("getTokenLargestAccounts", [mint]);
    const list = lg.value.slice(0, 20);
    const ta = await rpc("getMultipleAccounts", [list.map((x) => x.address), { encoding: "jsonParsed" }]);
    const owners = ta.value.map((a) => (a && a.data && a.data.parsed ? a.data.parsed.info.owner : null));
    const uniq = [...new Set(owners.filter(Boolean))];
    const oa = await rpc("getMultipleAccounts", [uniq, { encoding: "jsonParsed" }]);
    const prog = {};
    uniq.forEach((o, i) => { prog[o] = oa.value[i] ? oa.value[i].owner : null; });
    const kind = (i) => {
      const o = owners[i];
      if (BURN.has(o)) return "burn";
      if (POOL_AUTHORITIES.has(o) || POOL_PROGRAMS.has(prog[o])) return "pool";
      if (prog[o] && prog[o] !== SYSTEM) return "program";
      if (!onCurve(o)) return "program";
      return "wallet";
    };
    const rows = list.map((x, i) => ({ pct: supply ? (x.uiAmount / supply) * 100 : 0, kind: kind(i), owner: owners[i], amount: x.uiAmount }));
    holderList = rows.slice(0, 10).map((r) => ({ owner: r.owner, pct: supply > 0 ? Math.round(r.pct * 100) / 100 : null, amount: r.amount, kind: r.kind }));
    const real = rows.filter((w) => w.kind === "wallet");
    const held = (k) => rows.filter((w) => w.kind === k).reduce((t, w) => t + w.pct, 0);
    const poolPct = held("pool"), progPct = held("program"), burnPct = held("burn");
    const top1 = real[0] ? real[0].pct : 0;
    const top10 = real.slice(0, 10).reduce((s, w) => s + w.pct, 0);
    const a = top1.toFixed(1) + "%", b = top10.toFixed(1) + "%";
    if (!(supply > 0)) add("top1", "unknown", "This token reports a supply of 0 (common for wrapped tokens), so holder shares cannot be calculated.", "This token dey show supply as 0 (e common for wrapped tokens), so we no fit calculate holder shares.");
    else if (top1 > 20) add("top1", "bad", "One wallet holds " + a + " of supply (pools excluded). It can crash the price.", "One wallet get " + a + " of the supply (pools no count). E fit crash price.", 20);
    else if (top1 > 10) add("top1", "warn", "One wallet holds " + a + " of supply (pools excluded).", "One wallet get " + a + " of the supply (pools no count).", 10);
    else add("top1", "ok", "Largest wallet holds " + a + " (pools excluded).", "Biggest wallet get " + a + " (pools no count).");
    if (!(supply > 0)) { /* shares unavailable, already reported above */ }
    else if (top10 > 60) add("top10", "bad", "They hold " + b + " together. Supply is concentrated.", "Dem get " + b + " together. Supply dey one side.", 15);
    else if (top10 > 40) add("top10", "warn", "They hold " + b + " together.", "Dem get " + b + " together.", 8);
    else add("top10", "ok", "They hold " + b + " together.", "Dem get " + b + " together.");
    const en = [], pc = [];
    if (poolPct >= 1) { en.push(poolPct.toFixed(1) + "% in pool accounts"); pc.push(poolPct.toFixed(1) + "% dey pool accounts"); }
    if (progPct >= 1) { en.push(progPct.toFixed(1) + "% in program-controlled accounts (a pool, vault, lock or multisig)"); pc.push(progPct.toFixed(1) + "% dey program accounts (pool, vault, lock or multisig)"); }
    if (burnPct >= 1) { en.push(burnPct.toFixed(1) + "% burned"); pc.push(burnPct.toFixed(1) + "% don burn"); }
    if (en.length) add("vault", "info", en.join("; ") + ". Not counted as whales.", pc.join("; ") + ". We no count dem as whales.");
  } catch (e) {
    add("top1", "unknown", "Holder data is temporarily unavailable.", "We no fit read the holders now.");
  }
  return { checks, risk: risk(), holders: holderList, supply };
}

// Market checks. These move fast, so they are always fetched fresh (8 second dedupe only).
async function marketPart(mint, known) {
  const { checks, add, risk } = mkAdd(known);
  const lockP = fetchLock(mint);
  let pair = null;
  const hit = cget(marketCache, mint, MARKET_TTL);
  if (hit) pair = hit.v;
  else {
    try {
      const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + mint, { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const all = (j.pairs || []).filter((p) => p.chainId === "solana");
      const byLiq = (x, y) => ((y.liquidity && y.liquidity.usd) || 0) - ((x.liquidity && x.liquidity.usd) || 0);
      pair = all.filter((p) => p.baseToken.address === mint).sort(byLiq)[0] || all.sort(byLiq)[0] || null;
      cset(marketCache, mint, pair);
    } catch (e) { /* handled below */ }
  }

  let summary = null, curve = false, ageH = null;
  if (!pair) {
    add("pool", "bad", "No trading pool found. There is nothing to provide liquidity to yet.", "We no see trading pool. Nothing to add liquidity to yet.", 30);
  } else {
    const liq = (pair.liquidity && pair.liquidity.usd) || 0;
    const L = "$" + Math.round(liq).toLocaleString();
    curve = /dbc|pumpfun|launch|bond/i.test(pair.dexId || "");
    ageH = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 36e5 : null;
    if (!(liq > 0)) add("liq", "unknown", (curve ? "This is a bonding-curve pool, which Dexscreener does not size. " : "Dexscreener reports no liquidity for this pool, which can mean a dead pool. ") + "Check the pool directly on its launch platform.", (curve ? "Na bonding-curve pool, Dexscreener no dey measure am. " : "Dexscreener no see liquidity for this pool, e fit mean say pool don die. ") + "Check the pool for where dem launch am.");
    else if (liq < 10000) add("liq", "bad", "Only " + L + " in the pool. Easy to move, hard to exit.", "Na only " + L + " dey the pool. E easy to shake, hard to comot.", 20);
    else if (liq < 50000) add("liq", "warn", L + " in the pool. Thin.", L + " dey the pool. E thin.", 10);
    else add("liq", "ok", L + " in the pool.", L + " dey the pool.");
    if (ageH !== null) {
      const t = ageH < 48 ? Math.round(ageH) + " hours" : Math.round(ageH / 24) + " days";
      if (ageH < 24) add("age", "bad", "Created " + t + " ago. Most rugs happen in the first day.", "Dem create am " + t + " ago. Most rug dey happen first day.", 20);
      else if (ageH < 168) add("age", "warn", "Created " + t + " ago. Still new.", "Dem create am " + t + " ago. E still new.", 10);
      else add("age", "ok", "Created " + t + " ago.", "Dem create am " + t + " ago.");
    }
    if (!known && liq > 0 && pair.baseToken.address === mint && pair.fdv && liq / pair.fdv < 0.02) add("ratio", "warn", "Liquidity is under 2% of market cap. A small sell can move price a lot.", "Liquidity no reach 2% of market cap. Small sell fit shake price.", 5);
    const vol = (pair.volume && pair.volume.h24) || 0;
    const V = "$" + Math.round(vol).toLocaleString();
    if (vol < 100) add("activity", "warn", "Only " + V + " traded in 24 hours. Liquidity providers earn almost no fees and exits can be slow.", "Na only " + V + " dem trade for 24 hours. Liquidity providers go earn small fee and e fit slow to comot.", 5);
    else add("activity", "ok", V + " traded in the last 24 hours.", V + " don trade for 24 hours.");
    if (!known && liq > 0) {
      const t = vol / liq, tp = (t * 100).toFixed(t < 1 ? 1 : 0) + "%";
      if (t < 0.05) add("yield", "warn", "Only " + tp + " of the pool's size traded in 24 hours, so providers earn little in fees. Shown for information, not scored.", "Na only " + tp + " of the pool size dem trade for 24 hours, so providers go earn small fee. For information only, e no dey count for score.");
      else if (t > 3) add("yield", "warn", t.toFixed(1) + " times the pool's size traded in 24 hours. That can mean hype or fake volume, and prices can swing. Shown for information, not scored.", t.toFixed(1) + " times the pool size dem trade for 24 hours. E fit mean hype or fake volume, and price fit swing. For information only, e no dey count for score.");
      else add("yield", "ok", "About " + tp + " of the pool's size traded in 24 hours, a healthy level of trading.", "About " + tp + " of the pool size dem trade for 24 hours, na healthy level.");
    }
    summary = {
      dex: pair.dexId, liquidityUsd: liq > 0 ? liq : null, fdv: pair.fdv || null, marketCap: pair.marketCap || pair.fdv || null,
      volume24h: (pair.volume && pair.volume.h24) || null, priceUsd: pair.priceUsd || null,
      priceChange24h: pair.priceChange && pair.priceChange.h24 != null ? pair.priceChange.h24 : null, ageHours: ageH, url: pair.url || null,
    };
  }

  const lp = await lockP;
  if (!pair) add("lock", "unknown", "There is no pool to check yet.", "No pool dey to check yet.");
  else if (curve) add("lock", "unknown", "This token is still on a bonding curve, so there is no separate LP to lock yet.", "This token still dey bonding curve, so no separate LP to lock yet.");
  else if (lp === null) add("lock", "unknown", "Could not read lock data from RugCheck right now. Check who holds the LP tokens and whether they are locked or burned.", "We no fit read lock data from RugCheck now. Check who hold the LP and whether dem lock or burn am.");
  else {
    const p = Math.round(lp) + "%";
    if (lp >= 90) add("lock", "ok", p + " of the pool's LP is locked or burned (source: RugCheck).", p + " of the pool LP don lock or burn (source: RugCheck).");
    else if (lp >= 50) add("lock", "warn", p + " of LP is locked or burned (source: RugCheck). The rest could still be pulled.", p + " of LP don lock or burn (source: RugCheck). The rest fit still comot.", 5);
    else if (ageH !== null && ageH < 720) add("lock", "bad", "Only " + p + " of LP is locked or burned (source: RugCheck). The creator may be able to pull the pool's money out.", "Na only " + p + " of LP don lock or burn (source: RugCheck). Creator fit comot the pool money.", 20);
    else add("lock", "warn", "Only " + p + " of LP is locked or burned (source: RugCheck). Common for older pools that keep LP in unlocked positions, so read with care.", "Na only " + p + " of LP don lock or burn (source: RugCheck). E common for older pools, so read am with care.", 5);
  }
  return { checks, risk: risk(), summary, token: pair ? (({ name, symbol }) => ({ name, symbol }))(pair.baseToken.address === mint ? pair.baseToken : pair.quoteToken) : null };
}

const MAJORS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]);
// A pool address is not a token. Ask Dexscreener which token the pool holds (skipping SOL and stablecoins).
async function resolvePool(addr) {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana/" + addr, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const p = (j.pairs && j.pairs[0]) || j.pair;
    if (!p || !p.baseToken) return null;
    const useQuote = MAJORS.has(p.baseToken.address) && p.quoteToken && !MAJORS.has(p.quoteToken.address);
    return (useQuote ? p.quoteToken.address : p.baseToken.address) || null;
  } catch (e) { return null; }
}

// Accepts a token address, a link (pump.fun, Dexscreener, Solscan, Meteora...) or a pool address.
async function scan(input, opts = {}) {
  const raw = String(input || "").trim().slice(0, 600);
  const cands = [...new Set(raw.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [])].slice(0, 3);
  if (!cands.length) throw new Error("That is not a valid Solana token address. Paste an address, or a link from pump.fun, Dexscreener or Solscan.");
  let lastErr = null;
  for (const c of cands) {
    try {
      const out = await scanOne(c, opts);
      if (raw !== c) out.resolved = { kind: "link" };
      return out;
    } catch (e) {
      if (e.code !== "NOT_MINT") throw e;
      lastErr = e;
      const t = await resolvePool(c);
      if (t && t !== c) {
        try { const out = await scanOne(t, opts); out.resolved = { kind: "pool" }; return out; } catch (e2) { lastErr = e2; }
      }
    }
  }
  throw lastErr;
}

async function scanOne(mint, opts = {}) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) throw new Error("That is not a valid Solana token address.");
  const known = KNOWN[mint] || null;
  let ent = opts.fresh ? null : cget(chainCache, mint, CHAIN_TTL);
  if (!ent) {
    const v = await chainPart(mint, known);
    ent = { t: Date.now(), v };
    if (!v.checks.some((c) => c.status === "unknown")) cset(chainCache, mint, v);
  }
  const mk = await marketPart(mint, known);
  // Dexscreener does not size every token; estimate market cap from price and supply when it does not.
  if (mk.summary && !mk.summary.marketCap && ent.v.supply > 0 && Number(mk.summary.priceUsd) > 0) {
    mk.summary.marketCap = Number(mk.summary.priceUsd) * ent.v.supply; mk.summary.marketCapEstimated = true;
  }
  const checks = [...ent.v.checks, ...mk.checks];
  const score = Math.min(100, ent.v.risk + mk.risk);

  let v = known ? ["Known issuer", "Known issuer"] : score <= 15 ? ["Lower risk", "Risk small"] : score <= 45 ? ["Caution", "Dey careful"] : ["High risk", "Risk high"];
  // A clean-looking result is not trustworthy if a key check could not run.
  if (!known && score <= 15 && checks.some((c) => c.id === "top1" && c.status === "unknown")) v = ["Incomplete scan", "Scan never finish"];
  if (!opts.quiet) console.log(JSON.stringify({ scan: mint, score, verdict: v[0], src: opts.src || undefined }));
  return {
    version: VERSION, mint, score: known ? null : score, verdict: v[0], verdictPcm: v[1], checks,
    coverage: { done: checks.filter((c) => c.status !== "unknown").length, total: checks.length },
    pair: mk.summary, token: mk.token, holders: ent.v.holders || [], chainAgeSec: Math.round((Date.now() - ent.t) / 1000), scannedAt: new Date().toISOString(),
  };
}

module.exports = { scan, _onCurve: onCurve, _clearCache: clearCache };
