// Pool Shield scanner: reads public Solana chain data + Dexscreener. No keys needed.
function cleanRpc(v) {
  let u = String(v || "").trim().replace(/^["']|["']$/g, "");
  if (!u) return "https://api.mainnet-beta.solana.com";
  u = u.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}
const RPC = cleanRpc(process.env.RPC_URL);

// Programs/authorities that hold pool vaults. Their balances are liquidity, not whales.
const POOL_PROGRAMS = new Set([
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // Pump.fun bonding curve
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // PumpSwap
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM v4
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", // Raydium CPMM
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLMM
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", // Meteora DLMM
]);
const POOL_AUTHORITIES = new Set(["5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"]); // Raydium AMM v4 authority

async function rpc(method, params) {
  let host;
  try { host = new URL(RPC).host; }
  catch (e) { throw new Error("Your RPC URL is not valid. Delete rpc.txt and paste the full https:// URL from Alchemy or Helius."); }
  for (let i = 0; i < 3; i++) {
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
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
  const checks = [];
  let risk = 0;
  const add = (id, label, status, detail, pts = 0) => { checks.push({ id, label, status, detail }); risk += pts; };

  // 1. Mint account
  const acc = await rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  const data = acc.value && acc.value.data;
  if (!data || !data.parsed || data.parsed.type !== "mint") throw new Error("This address is not a token mint. Paste the token address, not a wallet or pool.");
  const m = data.parsed.info;
  const supply = Number(m.supply) / Math.pow(10, m.decimals);

  if (m.mintAuthority) add("mint", "Mint authority", "bad", "The creator can still mint new tokens and dilute holders.", 30);
  else add("mint", "Mint authority", "ok", "Revoked. The supply is fixed.");

  if (m.freezeAuthority) add("freeze", "Freeze authority", "bad", "The creator can freeze wallets so holders cannot sell.", 25);
  else add("freeze", "Freeze authority", "ok", "Revoked. Nobody can freeze your tokens.");

  const ext = (m.extensions || []).map((e) => e.extension);
  if (ext.includes("permanentDelegate")) add("ext", "Token extensions", "bad", "A permanent delegate can move or burn tokens from any wallet.", 30);
  else if (ext.includes("transferHook")) add("ext", "Token extensions", "warn", "A transfer hook runs custom code on every transfer. Read what it does.", 15);
  else if (ext.includes("transferFeeConfig")) add("ext", "Token extensions", "warn", "Every transfer pays a fee to the creator.", 10);
  else add("ext", "Token extensions", "ok", ext.length ? "Extensions present, none of the risky ones." : "Standard token, no special extensions.");

  // 2. Holder concentration (pool vaults excluded)
  try {
    const lg = await rpc("getTokenLargestAccounts", [mint]);
    const list = lg.value.slice(0, 20);
    const ta = await rpc("getMultipleAccounts", [list.map((x) => x.address), { encoding: "jsonParsed" }]);
    const owners = ta.value.map((a) => (a && a.data && a.data.parsed ? a.data.parsed.info.owner : null));
    const uniq = [...new Set(owners.filter(Boolean))];
    const oa = await rpc("getMultipleAccounts", [uniq, { encoding: "jsonParsed" }]);
    const prog = {};
    uniq.forEach((o, i) => { prog[o] = oa.value[i] ? oa.value[i].owner : null; });
    const real = list
      .map((x, i) => ({ pct: supply ? (x.uiAmount / supply) * 100 : 0, pool: POOL_AUTHORITIES.has(owners[i]) || POOL_PROGRAMS.has(prog[owners[i]]) }))
      .filter((w) => !w.pool);
    const top1 = real[0] ? real[0].pct : 0;
    const top10 = real.slice(0, 10).reduce((s, w) => s + w.pct, 0);
    const t1 = top1.toFixed(1) + "%", t10 = top10.toFixed(1) + "%";
    if (top1 > 20) add("top1", "Biggest wallet", "bad", "One wallet holds " + t1 + " of supply (pools excluded). It can crash the price.", 20);
    else if (top1 > 10) add("top1", "Biggest wallet", "warn", "One wallet holds " + t1 + " of supply (pools excluded).", 10);
    else add("top1", "Biggest wallet", "ok", "Largest wallet holds " + t1 + " (pools excluded).");
    if (top10 > 60) add("top10", "Top 10 wallets", "bad", "They hold " + t10 + " together. Supply is concentrated.", 15);
    else if (top10 > 40) add("top10", "Top 10 wallets", "warn", "They hold " + t10 + " together.", 8);
    else add("top10", "Top 10 wallets", "ok", "They hold " + t10 + " together.");
  } catch (e) {
    add("top1", "Holder spread", "unknown", "Could not read holders (" + e.message + ").");
  }

  // 3. Market / pool data
  let pair = null;
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + mint);
    const j = await r.json();
    const all = (j.pairs || []).filter((p) => p.chainId === "solana");
    const byLiq = (a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0);
    // Prefer pools where this token is the base token, so names and market cap belong to it.
    pair = all.filter((p) => p.baseToken.address === mint).sort(byLiq)[0] || all.sort(byLiq)[0] || null;
  } catch (e) { /* handled below */ }

  let summary = null;
  if (!pair) {
    add("pool", "Trading pool", "bad", "No trading pool found. There is nothing to provide liquidity to yet.", 30);
  } else {
    const liq = (pair.liquidity && pair.liquidity.usd) || 0;
    const ageH = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 36e5 : null;
    if (liq < 10000) add("liq", "Liquidity depth", "bad", "Only $" + Math.round(liq).toLocaleString() + " in the pool. Easy to move, hard to exit.", 20);
    else if (liq < 50000) add("liq", "Liquidity depth", "warn", "$" + Math.round(liq).toLocaleString() + " in the pool. Thin.", 10);
    else add("liq", "Liquidity depth", "ok", "$" + Math.round(liq).toLocaleString() + " in the pool.");
    if (ageH !== null) {
      const label = ageH < 48 ? Math.round(ageH) + " hours" : Math.round(ageH / 24) + " days";
      if (ageH < 24) add("age", "Pool age", "bad", "Created " + label + " ago. Most rugs happen in the first day.", 20);
      else if (ageH < 168) add("age", "Pool age", "warn", "Created " + label + " ago. Still new.", 10);
      else add("age", "Pool age", "ok", "Created " + label + " ago.");
    }
    if (pair.baseToken.address === mint && pair.fdv && liq / pair.fdv < 0.02) add("ratio", "Liquidity vs value", "warn", "Liquidity is under 2% of market cap. A small sell can move price a lot.", 5);
    summary = {
      dex: pair.dexId, liquidityUsd: liq, fdv: pair.fdv || null, volume24h: (pair.volume && pair.volume.h24) || null,
      priceUsd: pair.priceUsd || null, ageHours: ageH, url: pair.url || null,
    };
  }
  add("lock", "Liquidity lock", "unknown", "Not checked in this version. Look up who holds the LP tokens and whether they are locked or burned.");

  const score = Math.min(100, risk);
  const verdict = score <= 15 ? "Lower risk" : score <= 45 ? "Caution" : "High risk";
  return {
    mint, score, verdict, checks, pair: summary,
    token: pair ? (({ name, symbol }) => ({ name, symbol }))(pair.baseToken.address === mint ? pair.baseToken : pair.quoteToken) : null,
    scannedAt: new Date().toISOString(),
  };
}

module.exports = { scan };
