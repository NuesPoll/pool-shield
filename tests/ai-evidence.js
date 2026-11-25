const assert=require("node:assert/strict");
const {save,load,TTL}=require("../lib/ai-evidence");
(async()=>{
 const store=new Map();
 const env={KV_REST_API_URL:"https://example.invalid",KV_REST_API_TOKEN:"test"};
 const fetcher=async(url,opts)=>{
  const [op,key,value,ex,ttl,nx]=JSON.parse(opts.body);
  if(op==="SET"){assert.equal(ex,"EX");assert.equal(ttl,900);assert.equal(nx,"NX");store.set(key,value);return {ok:true,json:async()=>({result:"OK"})}}
  assert.equal(op,"GET");return {ok:true,json:async()=>({result:store.get(key)??null})};
 };
 const options={env,fetcher};
 const report={mint:"example",scannedAt:"2026-01-01",checks:[{label:"Mint",status:"warn",why:"Example"}],privateField:"not stored"};
 const id=await save(report,options);
 assert.match(id,/^[a-f0-9]{64}$/);
 assert.equal(TTL,900);
 assert.equal((await load(id,options)).mint,"example");
 assert.equal((await load(id,options)).privateField,undefined);
 assert.notEqual(await save(report,options),id);
 store.clear();assert.equal(await load(id,options),null);
 await assert.rejects(load("invalid",options));
 await assert.rejects(save(report,{env:{},fetcher}));
 await assert.rejects(save(report,{env,fetcher:async()=>({ok:false})}));
 console.log("AI evidence tests passed");
})().catch(e=>{console.error(e);process.exitCode=1});
