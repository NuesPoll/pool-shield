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
]);
const POOL_AUTHORITIES = new Set(["5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"]);

// Regulated stablecoins: issuer powers are by design, so we label them instead of scoring them as risk.
const KNOWN = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "Circle (USDC)",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "Tether (USDT)",
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": "Paxos (PYUSD)",
};

// id: [label, label (Pidgin), why it matters, why it matters (Pidgin)]
const T = {
  mint: ["Mint authority", "Who fit print more", "If the creator can still create tokens, they can flood the market and your share loses value.", "If creator fit still print tokens, dem fit flood market and your own go dey worth less."],
  freeze: ["Freeze authority", "Who fit freeze wallet", "A freeze power lets the creator lock your wallet so you cannot sell or exit.", "Freeze power mean say creator fit lock your wallet, you no go fit sell."],
  ext: ["Token extensions", "Special token rules", "Some built-in rules can take tokens from wallets or charge hidden fees on every transfer.", "Some special rules fit collect tokens from wallet or take hidden fee for every transfer."],
  top1: ["Biggest wallet", "Biggest wallet", "One huge holder can dump and crash the price, leaving pool providers holding the worst token.", "If one wallet get plenty, e fit dump and price go crash. Pool providers go carry the loss."],
  top10: ["Top 10 wallets", "Top 10 wallets", "If a few wallets own most of the supply, they control the price.", "If few wallets own most of the tokens, na dem dey control price."],
  pool: ["Trading pool", "Trading pool", "No pool means nowhere to trade, so there is nothing to provide liquidity to.", "No pool mean say nowhere to trade, so you no fit add liquidity."],
  liq: ["Liquidity depth", "How deep the pool be", "Thin pools move a lot on small trades and are hard to exit.", "If pool thin, small trade fit shake price and e go hard to comot."],
  age: ["Pool age", "How old the pool be", "Most rugs happen in the first day or two. Older pools have survived longer.", "Most rug dey happen for first day or two. Older pool don survive pass."],
  ratio: ["Liquidity vs value", "Liquidity vs value", "If liquidity is tiny compared to market cap, the price can swing hard.", "If liquidity small pass market cap, price fit swing well well."],
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

async function scan(mint) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) throw new Error("That is not a valid Solana token address.");
  const known = KNOWN[mint] || null;
  const checks = [];
  let risk = 0;
  const add = (id, status, en, pcm, pts = 0) => {
    if (known && (id === "top1" || id === "top10") && status !== "ok") status = "info";
    const t = T[id];
    checks.push({ id, status, label: t[0], labelPcm: t[1], why: t[2], whyPcm: t[3], detail: en, detailPcm: pcm });
    if (!known) risk += pts;
  };

  const acc = await rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  const data = acc.value && acc.value.data;
  if (!data || !data.parsed || data.parsed.type !== "mint") throw new Error("This address is not a token mint. Paste the token address, not a wallet or pool.");
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

  try {
    const lg = await rpc("getTokenLargestAccounts", [mint]);
    const list = lg.value.slice(0, 20);
    const ta = await rpc("getMultipleAccounts", [list.map((x) => x.address), { encoding: "jsonParsed" }]);
    const owners = ta.value.map((a) => (a && a.data && a.data.parsed ? a.data.parsed.info.owner : null));
    const uniq = [...new Set(owners.filter(Boolean))];
    const oa = await rpc("getMultipleAccounts", [uniq, { encoding: "jsonParsed" }]);
    const prog = {};
    uniq.forEach((o, i) => { prog[o] = oa.value[i] ? oa.value[i].owner : null; });
    const real = list.map((x, i) => ({ pct: supply ? (x.uiAmount / supply) * 100 : 0, pool: POOL_AUTHORITIES.has(owners[i]) || POOL_PROGRAMS.has(prog[owners[i]]) })).filter((w) => !w.pool);
    const top1 = real[0] ? real[0].pct : 0;
    const top10 = real.slice(0, 10).reduce((s, w) => s + w.pct, 0);
    const a = top1.toFixed(1) + "%", b = top10.toFixed(1) + "%";
    if (top1 > 20) add("top1", "bad", "One wallet holds " + a + " of supply (pools excluded). It can crash the price.", "One wallet get " + a + " of the supply (pools no count). E fit crash price.", 20);
    else if (top1 > 10) add("top1", "warn", "One wallet holds " + a + " of supply (pools excluded).", "One wallet get " + a + " of the supply (pools no count).", 10);
    else add("top1", "ok", "Largest wallet holds " + a + " (pools excluded).", "Biggest wallet get " + a + " (pools no count).");
    if (top10 > 60) add("top10", "bad", "They hold " + b + " together. Supply is concentrated.", "Dem get " + b + " together. Supply dey one side.", 15);
    else if (top10 > 40) add("top10", "warn", "They hold " + b + " together.", "Dem get " + b + " together.", 8);
    else add("top10", "ok", "They hold " + b + " together.", "Dem get " + b + " together.");
  } catch (e) {
    add("top1", "unknown", "Could not read holders (" + e.message + ").", "We no fit read the holders now.");
  }

  let pair = null;
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + mint, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const all = (j.pairs || []).filter((p) => p.chainId === "solana");
    const byLiq = (x, y) => ((y.liquidity && y.liquidity.usd) || 0) - ((x.liquidity && x.liquidity.usd) || 0);
    pair = all.filter((p) => p.baseToken.address === mint).sort(byLiq)[0] || all.sort(byLiq)[0] || null;
  } catch (e) { /* handled below */ }

  let summary = null;
  if (!pair) {
    add("pool", "bad", "No trading pool found. There is nothing to provide liquidity to yet.", "We no see trading pool. Nothing to add liquidity to yet.", 30);
  } else {
    const liq = (pair.liquidity && pair.liquidity.usd) || 0;
    const L = "$" + Math.round(liq).toLocaleString();
    const ageH = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 36e5 : null;
    if (liq < 10000) add("liq", "bad", "Only " + L + " in the pool. Easy to move, hard to exit.", "Na only " + L + " dey the pool. E easy to shake, hard to comot.", 20);
    else if (liq < 50000) add("liq", "warn", L + " in the pool. Thin.", L + " dey the pool. E thin.", 10);
    else add("liq", "ok", L + " in the pool.", L + " dey the pool.");
    if (ageH !== null) {
      const t = ageH < 48 ? Math.round(ageH) + " hours" : Math.round(ageH / 24) + " days";
      if (ageH < 24) add("age", "bad", "Created " + t + " ago. Most rugs happen in the first day.", "Dem create am " + t + " ago. Most rug dey happen first day.", 20);
      else if (ageH < 168) add("age", "warn", "Created " + t + " ago. Still new.", "Dem create am " + t + " ago. E still new.", 10);
      else add("age", "ok", "Created " + t + " ago.", "Dem create am " + t + " ago.");
    }
    if (!known && pair.baseToken.address === mint && pair.fdv && liq / pair.fdv < 0.02) add("ratio", "warn", "Liquidity is under 2% of market cap. A small sell can move price a lot.", "Liquidity no reach 2% of market cap. Small sell fit shake price.", 5);
    summary = { dex: pair.dexId, liquidityUsd: liq, fdv: pair.fdv || null, volume24h: (pair.volume && pair.volume.h24) || null, priceUsd: pair.priceUsd || null, ageHours: ageH, url: pair.url || null };
  }
  add("lock", "unknown", "Not checked in this version. Look up who holds the LP tokens and whether they are locked or burned.", "We never check this one yet. Find who hold the LP and whether dem lock or burn am.");

  const score = Math.min(100, risk);
  const v = known ? ["Known issuer", "Known issuer"] : score <= 15 ? ["Lower risk", "Risk small"] : score <= 45 ? ["Caution", "Dey careful"] : ["High risk", "Risk high"];
  console.log(JSON.stringify({ scan: mint, score, verdict: v[0] }));
  return {
    mint, score: known ? null : score, verdict: v[0], verdictPcm: v[1], checks, pair: summary,
    token: pair ? (({ name, symbol }) => ({ name, symbol }))(pair.baseToken.address === mint ? pair.baseToken : pair.quoteToken) : null,
    scannedAt: new Date().toISOString(),
  };
}

module.exports = { scan };
