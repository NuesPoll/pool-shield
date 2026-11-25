const {load}=require("./ai-evidence");
const {reserve}=require("./ai-quota");
// Dependencies must be supplied by a verified server-side provider adapter.
function handler({verify,generate,loadEvidence=load,reserveQuota=reserve,env=process.env}={}){
 return async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
  if(env.AI_FOLLOWUPS_ENABLED!=="true"||typeof verify!=="function"||typeof generate!=="function")return res.status(503).json({error:"AI follow-ups unavailable"});
  const b=req.body;
  if(!b||typeof b!=="object"||Array.isArray(b)||typeof b.reportId!=="string"||!/^[a-f0-9]{64}$/.test(b.reportId)||!["risk","limitations","verification"].includes(b.topic)||!["en","pcm"].includes(b.language))return res.status(400).json({error:"Invalid request"});
  const token=req.headers?.["x-firebase-appcheck"];
  if(typeof token!=="string"||!token||token.length>8192)return res.status(401).json({error:"Security verification required"});
  try{if(await verify(token)!==true)return res.status(401).json({error:"Security verification failed"});}catch{return res.status(401).json({error:"Security verification failed"});}
  try{
   const evidence=await loadEvidence(b.reportId);
   if(!evidence)return res.status(404).json({error:"Report expired; run a fresh scan"});
   if(!await reserveQuota({reportId:b.reportId}))return res.status(429).json({error:"AI request limit reached"});
   const output=await generate({evidence,topic:b.topic,language:b.language});
   if(typeof output!=="string"||!output.trim()||output.length>4000)throw Error("Invalid output");
   return res.status(200).json({answer:output,scannedAt:evidence.scannedAt});
  }catch{return res.status(503).json({error:"AI follow-up unavailable"});}
 };
}
module.exports={handler};
