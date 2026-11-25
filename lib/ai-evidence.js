const {randomBytes}=require("node:crypto");
const TTL=900;
async function command(args,{env=process.env,fetcher=fetch}={}){
  const explicit=env.UPSTASH_REDIS_REST_URL||env.UPSTASH_REDIS_REST_TOKEN;
  const url=explicit?env.UPSTASH_REDIS_REST_URL:env.KV_REST_API_URL;
  const token=explicit?env.UPSTASH_REDIS_REST_TOKEN:env.KV_REST_API_TOKEN;
  if(!url||!token)throw Error("Evidence store unavailable");
  const r=await fetcher(url,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(args),signal:AbortSignal.timeout(2500),redirect:"error"});
  if(!r.ok)throw Error("Evidence store unavailable");
  const data=await r.json();
  if(data.error||!Object.hasOwn(data,"result"))throw Error("Invalid evidence response");
  return data.result;
}
const key=id=>"pool-shield:ai:evidence:"+id;
async function save(report,options){
  const id=randomBytes(32).toString("hex");
  const evidence={mint:report.mint,scannedAt:report.scannedAt,coverage:report.coverage,checks:(report.checks||[]).slice(0,40).map(c=>({label:c.label,status:c.status,detail:c.detail,why:c.why}))};
  const json=JSON.stringify(evidence);
  if(Buffer.byteLength(json)>24000)throw Error("Evidence too large");
  if(await command(["SET",key(id),json,"EX",TTL,"NX"],options)!=="OK")throw Error("Evidence storage failed");
  return id;
}
async function load(id,options){
  if(typeof id!=="string"||!/^[a-f0-9]{64}$/.test(id))throw Error("Invalid report identifier");
  const raw=await command(["GET",key(id)],options);
  if(raw===null)return null;
  if(typeof raw!=="string"||Buffer.byteLength(raw)>24000)throw Error("Invalid stored evidence");
  return JSON.parse(raw);
}
module.exports={save,load,TTL};
