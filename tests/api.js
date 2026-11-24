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
async function request(method, query, ip = "127.0.0.1", instance = handler) {
  const res = {headers:{}, setHeader(k,v){this.headers[k]=v;}, status(c){this.code=c;return this;},json(o){this.body=o;return this;}};
  await instance({method,query,headers:{},socket:{remoteAddress:ip}},res);
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
  process.env.KV_REST_API_URL="https://redis.example.invalid";
  process.env.KV_REST_API_TOKEN="mock-only";
  global.fetch=async(url,options)=>{
    assert.equal(url,process.env.KV_REST_API_URL);
    assert.equal(options.headers.Authorization,"Bearer mock-only");
    return {ok:true,json:async()=>({result:1})};
  };
  r=await request("GET",{mint:"example"},"127.0.0.6"); assert.equal(r.code,200);
  // Simulate a shared Redis counter across two independently loaded handlers.
  delete require.cache[require.resolve("../api/scan")];
  const second = require("../api/scan");
  let now = 0;
  const counters = new Map();
  global.fetch = async (url, options) => {
    const [command, script, keys, key, ttl] = JSON.parse(options.body);
    assert.equal(command,"EVAL"); assert.equal(keys,1); assert.equal(ttl,60000);
    assert.match(script,/PEXPIRE/);
    let entry = counters.get(key);
    if (!entry || now >= entry.expires) entry = {count:0,expires:now+ttl};
    entry.count++; counters.set(key,entry);
    return {ok:true,json:async()=>({result:entry.count})};
  };
  const ip = "127.0.0.7";
  for(let i=0;i<120;i++) assert.equal((await request("GET",{mint:"example"},ip,i%2?second:handler)).code,200);
  const before = calls;
  r=await request("GET",{mint:"example"},ip,second);
  assert.equal(r.code,429); assert.equal(r.headers["Retry-After"],"60"); assert.equal(calls,before);
  now+=60000;
  assert.equal((await request("GET",{mint:"example"},ip,handler)).code,200);
  global.fetch=async()=>({ok:true,json:async()=>({result:null})});
  assert.equal((await request("GET",{mint:"example"},"127.0.0.8")).code,503);
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  console.log("API regression checks passed");
})().catch(e=>{console.error(e);process.exitCode=1;});
