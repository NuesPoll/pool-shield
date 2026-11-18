const UI={
 en:{lead:"Paste a Solana token address. See the risks before you put money in its liquidity pool.",ph:"Token address",go:"Scan token",busy:"Scanning...",risk:"risk",tip:"Tap any row to see why it matters.",dex:"View on Dexscreener",liq:"liquidity",vol:"24h volume",price:"price",mcap:"market cap",unk:"Unknown token",
  live:"Live",paused:"Paused",rescan:"Re-scan now",updated:"Updated {s}s ago",onchain:"Safety checks from {m} min ago",
  meth:"How it works",rep:"Report an error",cov:"{a} of {b} checks completed. Grey rows could not be checked.",
  foot:"Reads public Solana data and Dexscreener. A lower score means fewer red flags, not a safe investment. Not financial advice. Independent project by Rudy, cybersecurity student at LAUTECH, built for the Degxifi community."},
 pcm:{lead:"Paste Solana token address. Check the risk before you put your money for the liquidity pool.",ph:"Token address",go:"Check am",busy:"E dey check...",risk:"risk",tip:"Tap any row make you see why e matter.",dex:"See am for Dexscreener",liq:"liquidity",vol:"24h volume",price:"price",mcap:"market cap",unk:"Token wey we no know",
  live:"Live",paused:"Paused",rescan:"Check again now",updated:"Updated {s}s ago",onchain:"Safety checks from {m} min ago",
  meth:"How e dey work",rep:"Report error",cov:"{a} of {b} checks don finish. Grey rows we no fit check.",
  foot:"We dey read public Solana data and Dexscreener. Small score mean small red flags, e no mean say the investment safe. No be financial advice. Rudy, cybersecurity student for LAUTECH, build am as independent project for the Degxifi community."}
};
const $=s=>document.querySelector(s), out=$("#out");
let lang="en", last=null, live=true, mint="", timer=null, reqId=0;
try{lang=localStorage.getItem("lang")==="pcm"?"pcm":"en"}catch(e){}
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n}
function money(n){if(n==null||isNaN(n))return"n/a";n=Number(n);const a=Math.abs(n);if(a>=1e9)return"$"+(n/1e9).toFixed(2)+"B";if(a>=1e6)return"$"+(n/1e6).toFixed(2)+"M";if(a>=1e3)return"$"+(n/1e3).toFixed(1)+"K";return"$"+Math.round(n).toLocaleString()}
function price(n){if(n==null||isNaN(n))return"n/a";n=Number(n);if(n>=1)return"$"+n.toLocaleString(undefined,{maximumFractionDigits:2});if(n>=0.01)return"$"+n.toFixed(4);return"$"+n.toPrecision(3)}
function chrome(){
  const u=UI[lang];
  $("#lead").textContent=u.lead;$("#mint").placeholder=u.ph;$("#go").textContent=u.go;$("#foot").textContent=u.foot;$("#lm").textContent=u.meth;$("#lr").textContent=u.rep;
  $("#en").setAttribute("aria-pressed",lang==="en");$("#pcm").setAttribute("aria-pressed",lang==="pcm");
}
function stamp(){
  const n=$("#stamp");if(!n||!last)return;
  const u=UI[lang],s=Math.max(0,Math.round((Date.now()-Date.parse(last.scannedAt))/1000));
  let t=u.updated.replace("{s}",s);
  if(last.chainAgeSec>=60)t+=" | "+u.onchain.replace("{m}",Math.round(last.chainAgeSec/60));
  n.textContent=t;
}
function render(d){
  const u=UI[lang],p=lang==="pcm";
  const open=new Set([...out.querySelectorAll("details[open]")].map(x=>x.dataset.id));
  const strip=el("div",null,"strip");
  d.checks.forEach(c=>{const x=el("div",null,"pad "+c.status);x.title=p?c.labelPcm:c.label;strip.append(x)});
  const meta=el("p",null,"meta");
  if(d.pair){
    const q=d.pair,ch=q.priceChange24h;
    let t=q.dex+" | "+u.price+" "+price(q.priceUsd);
    if(ch!=null)t+=" ("+(ch>0?"+":"")+Number(ch).toFixed(1)+"% 24h)";
    t+=" | "+u.mcap+" "+money(q.marketCap)+" | "+u.liq+" "+money(q.liquidityUsd)+" | "+u.vol+" "+money(q.volume24h)+" ";
    meta.append(document.createTextNode(t));
    if(q.url&&q.url.startsWith("https://dexscreener.com/")){const a=el("a",u.dex);a.href=q.url;a.target="_blank";a.rel="noopener noreferrer";meta.append(a)}
  }
  const ctl=el("div",null,"ctl");
  const lb=el("button",(live?u.live+" (on)":u.paused),"mini");lb.type="button";lb.setAttribute("aria-pressed",live);
  lb.onclick=()=>{live=!live;render(last);if(live)refresh(false);else clearTimeout(timer)};
  const rb=el("button",u.rescan,"mini");rb.type="button";rb.onclick=()=>refresh(true);
  const st=el("span",null,"stampline");st.id="stamp";
  ctl.append(lb,rb,st);
  const list=el("div");
  d.checks.forEach(c=>{
    const row=el("div",null,"row");row.append(el("i",null,c.status));
    const det=el("details"),sum=el("summary");det.dataset.id=c.id;if(open.has(c.id))det.open=true;
    sum.append(el("b",p?c.labelPcm:c.label),el("span",p?c.detailPcm:c.detail));
    det.append(sum,el("p",p?c.whyPcm:c.why));row.append(det);list.append(row);
  });
  const head=(p?d.verdictPcm:d.verdict)+(d.score==null?"":" ("+d.score+"/100 "+u.risk+")");
  out.replaceChildren(strip,el("h2",head),el("p",d.token?d.token.name+" ("+d.token.symbol+")":u.unk,"tok"),meta,ctl,el("p",d.coverage?u.cov.replace("{a}",d.coverage.done).replace("{b}",d.coverage.total):"","tip"),el("p",u.tip,"tip"),list);
  stamp();
}
function schedule(){clearTimeout(timer);if(live&&mint&&!document.hidden)timer=setTimeout(()=>refresh(false),20000)}
async function refresh(fresh){
  if(!mint)return;
  const id=++reqId;
  try{
    const r=await fetch("/api/scan?mint="+encodeURIComponent(mint)+"&live=1"+(fresh?"&fresh=1":""),{cache:"no-store"});
    const d=await r.json();if(id!==reqId)return;
    if(r.ok){last=d;render(d)}
  }catch(e){}
  schedule();
}
async function run(m){
  mint=m;clearTimeout(timer);const id=++reqId;
  out.replaceChildren(el("p",UI[lang].busy,"muted"));
  try{
    const r=await fetch("/api/scan?mint="+encodeURIComponent(m),{cache:"no-store"});const d=await r.json();
    if(id!==reqId)return;
    if(!r.ok)throw new Error(d.error||"Scan failed");
    last=d;render(d);schedule();
  }catch(e){last=null;mint="";out.replaceChildren(el("p",e.message,"err"))}
}
function setLang(l){lang=l;try{localStorage.setItem("lang",l)}catch(e){}chrome();if(last)render(last)}
$("#en").addEventListener("click",()=>setLang("en"));$("#pcm").addEventListener("click",()=>setLang("pcm"));
$("#f").addEventListener("submit",e=>{e.preventDefault();const m=$("#mint").value.trim();if(m){history.replaceState(null,"","?mint="+encodeURIComponent(m));run(m)}});
document.addEventListener("visibilitychange",()=>{if(document.hidden)clearTimeout(timer);else if(live&&mint)refresh(false)});
setInterval(stamp,1000);
chrome();
const q=new URLSearchParams(location.search).get("mint");if(q){$("#mint").value=q;run(q)}
