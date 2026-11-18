const UI={
 en:{lead:"Paste a Solana token address. See the risks before you put money in its liquidity pool.",ph:"Token address",go:"Scan token",busy:"Scanning...",risk:"risk",tip:"Tap any row to see why it matters.",dex:"View on Dexscreener",liq:"liquidity",vol:"24h volume",unk:"Unknown token",
  foot:"Reads public Solana data and Dexscreener. A lower score means fewer red flags, not a safe investment. Not financial advice. Independent project by Rudy, cybersecurity student at LAUTECH, built for the Degxifi community."},
 pcm:{lead:"Paste Solana token address. Check the risk before you put your money for the liquidity pool.",ph:"Token address",go:"Check am",busy:"E dey check...",risk:"risk",tip:"Tap any row make you see why e matter.",dex:"See am for Dexscreener",liq:"liquidity",vol:"24h volume",unk:"Token wey we no know",
  foot:"We dey read public Solana data and Dexscreener. Small score mean small red flags, e no mean say the investment safe. No be financial advice. Rudy, cybersecurity student for LAUTECH, build am as independent project for the Degxifi community."}
};
UI.en.meth="How it works";UI.en.rep="Report an error";UI.en.cov="{a} of {b} checks completed. Grey rows could not be checked.";
UI.pcm.meth="How e dey work";UI.pcm.rep="Report error";UI.pcm.cov="{a} of {b} checks don finish. Grey rows we no fit check.";
const $=s=>document.querySelector(s), out=$("#out");
let lang="en", last=null;
try{lang=localStorage.getItem("lang")==="pcm"?"pcm":"en"}catch(e){}
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n}
function money(n){return n==null?"n/a":"$"+Math.round(n).toLocaleString()}
function chrome(){
  const u=UI[lang];
  $("#lead").textContent=u.lead;$("#mint").placeholder=u.ph;$("#go").textContent=u.go;$("#foot").textContent=u.foot;$("#lm").textContent=u.meth;$("#lr").textContent=u.rep;
  document.documentElement.lang=lang==="pcm"?"en":"en";
  $("#en").setAttribute("aria-pressed",lang==="en");$("#pcm").setAttribute("aria-pressed",lang==="pcm");
}
function render(d){
  const u=UI[lang],p=lang==="pcm";
  const strip=el("div",null,"strip");
  d.checks.forEach(c=>{const x=el("div",null,"pad "+c.status);x.title=p?c.labelPcm:c.label;strip.append(x)});
  const meta=el("p",null,"meta");
  if(d.pair){
    meta.append(document.createTextNode(d.pair.dex+" | "+u.liq+" "+money(d.pair.liquidityUsd)+" | "+u.vol+" "+money(d.pair.volume24h)+" "));
    if(d.pair.url&&d.pair.url.startsWith("https://dexscreener.com/")){const a=el("a",u.dex);a.href=d.pair.url;a.target="_blank";a.rel="noopener noreferrer";meta.append(a)}
  }
  const list=el("div");
  d.checks.forEach(c=>{
    const row=el("div",null,"row");row.append(el("i",null,c.status));
    const det=el("details"),sum=el("summary");
    sum.append(el("b",p?c.labelPcm:c.label),el("span",p?c.detailPcm:c.detail));
    det.append(sum,el("p",p?c.whyPcm:c.why));row.append(det);list.append(row);
  });
  const head=(p?d.verdictPcm:d.verdict)+(d.score==null?"":" ("+d.score+"/100 "+u.risk+")");
  out.replaceChildren(strip,el("h2",head),el("p",d.token?d.token.name+" ("+d.token.symbol+")":u.unk,"tok"),meta,el("p",d.coverage?u.cov.replace("{a}",d.coverage.done).replace("{b}",d.coverage.total):"","tip"),el("p",u.tip,"tip"),list);
}
async function run(mint){
  out.replaceChildren(el("p",UI[lang].busy,"muted"));
  try{const r=await fetch("/api/scan?mint="+encodeURIComponent(mint));const d=await r.json();if(!r.ok)throw new Error(d.error||"Scan failed");last=d;render(d)}
  catch(e){last=null;out.replaceChildren(el("p",e.message,"err"))}
}
function setLang(l){lang=l;try{localStorage.setItem("lang",l)}catch(e){}chrome();if(last)render(last)}
$("#en").addEventListener("click",()=>setLang("en"));$("#pcm").addEventListener("click",()=>setLang("pcm"));
$("#f").addEventListener("submit",e=>{e.preventDefault();const m=$("#mint").value.trim();if(m){history.replaceState(null,"","?mint="+encodeURIComponent(m));run(m)}});
chrome();
const q=new URLSearchParams(location.search).get("mint");if(q){$("#mint").value=q;run(q)}
