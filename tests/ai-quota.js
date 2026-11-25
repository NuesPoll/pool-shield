const assert=require("node:assert/strict");
const {reserve}=require("../lib/ai-quota");
(async()=>{
const env={KV_REST_API_URL:"https://example.invalid",KV_REST_API_TOKEN:"test",AI_DAILY_LIMIT:"3"};
const counts=new Map();
const fetcher=async(url,options)=>{
const [cmd,script,n,report,global,limit]=JSON.parse(options.body);
assert.equal(cmd,"EVAL");assert.equal(n,2);assert.match(script,/redis.call/);
const r=counts.get(report)||0,g=counts.get(global)||0;
if(r>=2||g>=limit)return {ok:true,json:async()=>({result:0})};
counts.set(report,r+1);counts.set(global,g+1);
return {ok:true,json:async()=>({result:1})};
};
const call=(reportId)=>reserve({reportId,env,fetcher});
const a="a".repeat(64),b="b".repeat(64);
assert.deepEqual(await Promise.all([call(a),call(a),call(a)]),[true,true,false]);
assert.equal(await call(b),true);assert.equal(await call(b),false);
await assert.rejects(()=>call("bad"));
await assert.rejects(()=>reserve({reportId:a,env:{},fetcher}));
await assert.rejects(()=>reserve({reportId:a,env,fetcher:async()=>({ok:false})}));
await assert.rejects(()=>reserve({reportId:a,env,fetcher:async()=>({ok:true,json:async()=>({result:99})})}));
console.log("AI quota mock tests passed");
})().catch(e=>{console.error(e);process.exitCode=1});
