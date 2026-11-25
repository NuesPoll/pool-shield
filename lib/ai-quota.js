const crypto = require("node:crypto");
// Internal primitive only. Call after authenticating the request and resolving server-held report evidence.
async function reserve({reportId, fetcher = fetch, env = process.env}) {
  if (typeof reportId !== "string" || !/^[a-f0-9]{64}$/.test(reportId)) throw new Error("Invalid report identifier");
  const explicit = env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN;
  const url = explicit ? env.UPSTASH_REDIS_REST_URL : env.KV_REST_API_URL;
  const token = explicit ? env.UPSTASH_REDIS_REST_TOKEN : env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("AI quota unavailable");
  const limit = Number(env.AI_DAILY_LIMIT);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("AI quota not configured");
  const key = "pool-shield:ai:report:" + crypto.createHash("sha256").update(reportId).digest("hex");
  const global = "pool-shield:ai:global:" + new Date().toISOString().slice(0,10);
  const script = "local r=tonumber(redis.call('GET',KEYS[1]) or '0'); local g=tonumber(redis.call('GET',KEYS[2]) or '0'); if r>=2 or g>=tonumber(ARGV[1]) then return 0 end; redis.call('INCR',KEYS[1]); if r==0 then redis.call('EXPIRE',KEYS[1],86400) end; redis.call('INCR',KEYS[2]); if g==0 then redis.call('EXPIRE',KEYS[2],172800) end; return 1";
  const response = await fetcher(url,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(["EVAL",script,2,key,global,limit]),signal:AbortSignal.timeout(2500),redirect:"error"});
  if (!response.ok) throw new Error("AI quota unavailable");
  const data = await response.json();
  if (data.result !== 0 && data.result !== 1) throw new Error("Invalid AI quota response");
  return data.result === 1;
}
module.exports = {reserve};
