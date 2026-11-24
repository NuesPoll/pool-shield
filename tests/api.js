const assert = require("node:assert/strict");
const scanner = require("../lib/scan");
let calls = 0;
scanner.scan = async (mint) => {
  calls++;
  if (mint === "failure") throw new Error("internal diagnostic");
  if (mint === "notmint") throw Object.assign(new Error("not a token mint"), {code:"NOT_MINT"});
  return {mint};
};
const handler = require("../api/scan");
async function request(method, query, ip = "127.0.0.1") {
  const res = {headers:{}, setHeader(k,v){this.headers[k]=v;}, status(c){this.code=c;return this;},json(o){this.body=o;return this;}};
  await handler({method,query,headers:{},socket:{remoteAddress:ip}},res);
  return res;
}
(async()=>{
  let r = await request("POST",{mint:"example"});
  assert.equal(r.code,405); assert.equal(r.headers.Allow,"GET");
  for(const mint of [undefined,"",["a","b"],"x".repeat(2049)]) {
    r=await request("GET",{mint}); assert.equal(r.code,400);
  }
  assert.equal(calls,0);
  r=await request("GET",{mint:"example"}); assert.equal(r.code,200); assert.equal(r.headers["Cache-Control"],"no-store");
  r=await request("GET",{mint:"failure"}); assert.equal(r.code,503); assert.ok(!JSON.stringify(r.body).includes("internal diagnostic"));
  r=await request("GET",{mint:"notmint"}); assert.equal(r.code,400);
  for(let i=0;i<120;i++) assert.equal((await request("GET",{mint:"example"},"127.0.0.2")).code,200);
  r=await request("GET",{mint:"example"},"127.0.0.2"); assert.equal(r.code,429); assert.equal(r.headers["Retry-After"],"60");
  process.env.UPSTASH_REDIS_REST_URL="https://redis.example.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN="mock-only";
  global.fetch=async (url,options)=>{
    assert.equal(url,process.env.UPSTASH_REDIS_REST_URL);
    assert.equal(options.redirect,"error");
    assert.equal(JSON.parse(options.body)[0],"EVAL");
    return {ok:true,json:async()=>({result:121})};
  };
  r=await request("GET",{mint:"example"},"127.0.0.3"); assert.equal(r.code,429);
  global.fetch=async()=>({ok:true,json:async()=>({result:1})});
  r=await request("GET",{mint:"example"},"127.0.0.4"); assert.equal(r.code,200);
  global.fetch=async()=>{throw new Error("private redis diagnostic");};
  r=await request("GET",{mint:"example"},"127.0.0.5"); assert.equal(r.code,503); assert.ok(!JSON.stringify(r.body).includes("private redis diagnostic"));
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  console.log("API regression checks passed");
})().catch(e=>{console.error(e);process.exitCode=1;});
