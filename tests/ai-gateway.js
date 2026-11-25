const assert=require("node:assert/strict");
const {handler}=require("../lib/ai-gateway");
(async()=>{
 let calls=[];
 const deps={env:{AI_FOLLOWUPS_ENABLED:"true"},verify:async()=>{calls.push("verify");return true},loadEvidence:async()=>{calls.push("load");return {scannedAt:"example"}},reserveQuota:async()=>{calls.push("reserve");return true},generate:async()=>{calls.push("generate");return "Evidence explanation"}};
 const req={method:"POST",headers:{"x-firebase-appcheck":"test"},body:{reportId:"a".repeat(64),topic:"risk",language:"en"}};
 async function run(overrides={},request=req){calls=[];const res={setHeader(){},status(n){this.code=n;return this},json(b){this.body=b;return this}};await handler({...deps,...overrides})(request,res);return res}
 assert.equal((await run({env:{}})).code,503);assert.deepEqual(calls,[]);
 assert.equal((await run({}, {...req,method:"GET"})).code,405);
 assert.equal((await run({}, {...req,body:{...req.body,topic:"arbitrary"}})).code,400);
 assert.equal((await run({}, {...req,headers:{}})).code,401);assert.deepEqual(calls,[]);
 assert.equal((await run({verify:async()=>false})).code,401);assert.deepEqual(calls,[]);
 assert.equal((await run({loadEvidence:async()=>null})).code,404);assert.deepEqual(calls,["verify"]);
 assert.equal((await run({reserveQuota:async()=>false})).code,429);assert.deepEqual(calls,["verify","load"]);
 assert.equal((await run({reserveQuota:async()=>{throw Error("offline")}})).code,503);assert.deepEqual(calls,["verify","load"]);
 assert.equal((await run({generate:async()=>"x".repeat(4001)})).code,503);
 const ok=await run();assert.equal(ok.code,200);assert.equal(ok.body.answer,"Evidence explanation");assert.deepEqual(calls,["verify","load","reserve","generate"]);
 console.log("AI gateway tests passed");
})().catch(e=>{console.error(e);process.exitCode=1});
