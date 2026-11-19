// Paste your Google Form link between the quotes to show a "Give feedback" link in the footer.
const FEEDBACK_URL="";
const UI={
 en:{lead:"Paste a Solana token address. See the risks before you put money in its liquidity pool.",ph:"Token address",go:"Scan token",busy:"Scanning...",risk:"risk",tip:"Tap any row to see why it matters.",dex:"View on Dexscreener",liq:"liquidity",vol:"24h volume",price:"price",mcap:"market cap",unk:"Unknown token",
  live:"Live",paused:"Paused",rescan:"Re-scan now",updated:"Updated {s}s ago",onchain:"Safety checks from {m} min ago",
  meth:"How it works",rep:"Report an error",fb:"Give feedback",copy:"Copy link",copied:"Copied",wa:"Share on WhatsApp",img:"Save as image",recent:"Recent scans",clear:"Clear",
  stxt:"Pool Shield scan: {n} - {v}. Check any Solana token free:",disc:"Not financial advice. A lower score means fewer red flags, not a safe investment.",flags:"Biggest flags",cov:"{a} of {b} checks completed. Grey rows could not be checked.",
  foot:"Reads public Solana data and Dexscreener. A lower score means fewer red flags, not a safe investment. Not financial advice. Independent project by Rudy, cybersecurity student at LAUTECH, built for the Degxifi community."},
 pcm:{lead:"Paste Solana token address. Check the risk before you put your money for the liquidity pool.",ph:"Token address",go:"Check am",busy:"E dey check...",risk:"risk",tip:"Tap any row make you see why e matter.",dex:"See am for Dexscreener",liq:"liquidity",vol:"24h volume",price:"price",mcap:"market cap",unk:"Token wey we no know",
  live:"Live",paused:"Paused",rescan:"Check again now",updated:"Updated {s}s ago",onchain:"Safety checks from {m} min ago",
  meth:"How e dey work",rep:"Report error",fb:"Tell us wetin you see",copy:"Copy link",copied:"E don copy",wa:"Share for WhatsApp",img:"Save as picture",recent:"Recent checks",clear:"Clear",
  stxt:"Pool Shield check: {n} - {v}. Check any Solana token free:",disc:"No be financial advice. Small score mean small red flags, e no mean say the investment safe.",flags:"Biggest flags",cov:"{a} of {b} checks don finish. Grey rows we no fit check.",
  foot:"We dey read public Solana data and Dexscreener. Small score mean small red flags, e no mean say the investment safe. No be financial advice. Rudy, cybersecurity student for LAUTECH, build am as independent project for the Degxifi community."}
};
const $=s=>document.querySelector(s), out=$("#out");
let lang="en", last=null, live=true, mint="", timer=null, reqId=0;
try{lang=localStorage.getItem("lang")==="pcm"?"pcm":"en"}catch(e){}
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n}
function money(n){if(n==null||isNaN(n))return"n/a";n=Number(n);const a=Math.abs(n);if(a>=1e9)return"$"+(n/1e9).toFixed(2)+"B";if(a>=1e6)return"$"+(n/1e6).toFixed(2)+"M";if(a>=1e3)return"$"+(n/1e3).toFixed(1)+"K";return"$"+Math.round(n).toLocaleString()}
function price(n){if(n==null||isNaN(n))return"n/a";n=Number(n);if(n>=1)return"$"+n.toLocaleString(undefined,{maximumFractionDigits:2});if(n>=0.01)return"$"+n.toFixed(4);return"$"+n.toPrecision(3)}

// ---- recent scans (stored only in this browser)
function getRecent(){try{return JSON.parse(localStorage.getItem("recent")||"[]").filter(x=>x&&typeof x.mint==="string")}catch(e){return[]}}
function addRecent(d){
  try{
    const list=getRecent().filter(x=>x.mint!==d.mint);
    list.unshift({mint:d.mint,name:d.token?d.token.symbol:d.mint.slice(0,4)+"...",verdict:d.verdict,verdictPcm:d.verdictPcm});
    localStorage.setItem("recent",JSON.stringify(list.slice(0,6)));
  }catch(e){}
  renderRecent();
}
function renderRecent(){
  const box=$("#recent");if(!box)return;
  const list=getRecent(),u=UI[lang];
  if(!list.length){box.replaceChildren();return}
  const kids=[el("span",u.recent+":","stampline")];
  list.forEach(x=>{
    const b=el("button",x.name+" | "+(lang==="pcm"&&x.verdictPcm?x.verdictPcm:x.verdict),"chip");b.type="button";
    b.onclick=()=>{$("#mint").value=x.mint;history.replaceState(null,"","?mint="+encodeURIComponent(x.mint));run(x.mint)};
    kids.push(b);
  });
  const c=el("button",u.clear,"linklike");c.type="button";c.onclick=()=>{try{localStorage.removeItem("recent")}catch(e){}renderRecent()};
  kids.push(c);box.replaceChildren(...kids);
}

// ---- sharing
function shareUrl(){return location.origin+"/?mint="+encodeURIComponent(last.mint)}
function shareText(){
  const u=UI[lang],n=last.token?last.token.name+" ("+last.token.symbol+")":last.mint.slice(0,6)+"...";
  return u.stxt.replace("{n}",n).replace("{v}",lang==="pcm"?last.verdictPcm:last.verdict)+" "+shareUrl();
}
async function copyLink(btn){
  const u=UI[lang];
  try{await navigator.clipboard.writeText(shareUrl())}catch(e){const t=document.createElement("textarea");t.value=shareUrl();document.body.append(t);t.select();try{document.execCommand("copy")}catch(_){}t.remove()}
  btn.textContent=u.copied;setTimeout(()=>{btn.textContent=u.copy},1500);
}
function whatsapp(){window.open("https://wa.me/?text="+encodeURIComponent(shareText()),"_blank","noopener,noreferrer")}

// ---- result card image
const COL={ok:"#2E9E6B",warn:"#E9A23B",bad:"#D9482B",unknown:"#8A9BA8",info:"#1496A6"};
const VCOL={"Lower risk":"ok","Caution":"warn","High risk":"bad","Known issuer":"info","Incomplete scan":"unknown"};
function wrapText(g,text,max,lines){
  const words=String(text).split(" "),all=[];let cur="";
  for(const w of words){const t=cur?cur+" "+w:w;if(g.measureText(t).width>max&&cur){all.push(cur);cur=w}else cur=t}
  if(cur)all.push(cur);
  if(all.length<=lines)return all;
  const out=all.slice(0,lines);let last=out[lines-1];
  while(last&&g.measureText(last+"...").width>max)last=last.slice(0,-1);
  out[lines-1]=last+"...";return out;
}
function card(d){
  const c=document.createElement("canvas");c.width=1080;c.height=1200;
  const g=c.getContext("2d");if(!g)return null;
  const p=lang==="pcm",u=UI[lang],F='"Familjen Grotesk", system-ui, sans-serif';
  g.fillStyle="#F2F9F8";g.fillRect(0,0,1080,1200);
  g.fillStyle="#0A3D62";g.fillRect(0,0,1080,14);
  g.textBaseline="alphabetic";
  g.fillStyle="#0A3D62";g.font="700 64px "+F;g.fillText("Pool Shield",70,120);
  // strip
  g.fillStyle="#fff";g.fillRect(70,160,940,88);g.strokeStyle="#0A3D62";g.lineWidth=4;g.strokeRect(70,160,940,88);
  const n=d.checks.length,gap=8,pw=(920-gap*(n-1))/n;
  d.checks.forEach((x,i)=>{g.fillStyle=COL[x.status]||COL.unknown;g.fillRect(80+i*(pw+gap),170,pw,68)});
  // token + verdict
  g.fillStyle="#0A3D62";g.font="700 50px "+F;
  g.fillText(wrapText(g,d.token?d.token.name+" ("+d.token.symbol+")":d.mint.slice(0,8)+"...",940,1)[0],70,330);
  const q=d.pair;
  if(q){g.fillStyle="#3d6580";g.font="400 30px "+F;
    g.fillText(wrapText(g,q.dex+" | "+u.price+" "+price(q.priceUsd)+" | "+u.mcap+" "+money(q.marketCap)+" | "+u.liq+" "+money(q.liquidityUsd),940,1)[0],70,380)}
  g.fillStyle=COL[VCOL[d.verdict]||"unknown"];g.font="700 92px "+F;
  g.fillText((p?d.verdictPcm:d.verdict)+(d.score==null?"":" "+d.score+"/100"),70,500);
  // biggest flags
  const sev={bad:0,warn:1,unknown:2,info:3,ok:4};
  const rows=d.checks.map((x,i)=>({x,i})).sort((a,b)=>(sev[a.x.status]-sev[b.x.status])||(a.i-b.i)).slice(0,4);
  let y=570;
  rows.forEach(({x})=>{
    g.fillStyle=COL[x.status]||COL.unknown;g.fillRect(70,y,12,96);
    g.fillStyle="#0A3D62";g.font="700 34px "+F;g.fillText(p?x.labelPcm:x.label,104,y+34);
    g.fillStyle="#3d6580";g.font="400 27px "+F;
    wrapText(g,p?x.detailPcm:x.detail,900,2).forEach((l,k)=>g.fillText(l,104,y+66+k*30));
    y+=118;
  });
  // footer
  g.fillStyle="#0A3D62";g.font="700 36px "+F;g.fillText(location.host,70,1112);
  g.fillStyle="#3d6580";g.font="400 24px "+F;
  wrapText(g,u.disc+" "+new Date(d.scannedAt).toISOString().slice(0,16).replace("T"," ")+" UTC",940,2).forEach((l,k)=>g.fillText(l,70,1150+k*30));
  return c;
}
async function saveImage(){
  if(!last)return;
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch(e){}
  const c=card(last);if(!c)return;
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob)return;
  const sym=(last.token&&last.token.symbol?last.token.symbol:"scan").replace(/[^A-Za-z0-9]/g,"")||"scan";
  const file=new File([blob],"pool-shield-"+sym+".png",{type:"image/png"});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:shareText()});return}}catch(e){if(e&&e.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=file.name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function chrome(){
  const u=UI[lang];
  $("#lead").textContent=u.lead;$("#mint").placeholder=u.ph;$("#go").textContent=u.go;$("#foot").textContent=u.foot;$("#lm").textContent=u.meth;$("#lr").textContent=u.rep;
  if(FEEDBACK_URL){const a=$("#lf");a.textContent=u.fb;a.href=FEEDBACK_URL;$("#fbwrap").hidden=false}
  renderRecent();
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
  const sh=el("div",null,"ctl");
  const cb=el("button",u.copy,"mini");cb.type="button";cb.onclick=()=>copyLink(cb);
  const wb=el("button",u.wa,"mini");wb.type="button";wb.onclick=whatsapp;
  const ib=el("button",u.img,"mini");ib.type="button";ib.onclick=saveImage;
  sh.append(cb,wb,ib);
  const list=el("div");
  d.checks.forEach(c=>{
    const row=el("div",null,"row");row.append(el("i",null,c.status));
    const det=el("details"),sum=el("summary");det.dataset.id=c.id;if(open.has(c.id))det.open=true;
    sum.append(el("b",p?c.labelPcm:c.label),el("span",p?c.detailPcm:c.detail));
    det.append(sum,el("p",p?c.whyPcm:c.why));row.append(det);list.append(row);
  });
  const head=(p?d.verdictPcm:d.verdict)+(d.score==null?"":" ("+d.score+"/100 "+u.risk+")");
  out.replaceChildren(strip,el("h2",head),el("p",d.token?d.token.name+" ("+d.token.symbol+")":u.unk,"tok"),meta,ctl,sh,el("p",d.coverage?u.cov.replace("{a}",d.coverage.done).replace("{b}",d.coverage.total):"","tip"),el("p",u.tip,"tip"),list);
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
    last=d;render(d);addRecent(d);schedule();
  }catch(e){last=null;mint="";out.replaceChildren(el("p",e.message,"err"))}
}
function setLang(l){lang=l;try{localStorage.setItem("lang",l)}catch(e){}chrome();if(last)render(last)}
$("#en").addEventListener("click",()=>setLang("en"));$("#pcm").addEventListener("click",()=>setLang("pcm"));
$("#f").addEventListener("submit",e=>{e.preventDefault();const m=$("#mint").value.trim();if(m){history.replaceState(null,"","?mint="+encodeURIComponent(m));run(m)}});
document.addEventListener("visibilitychange",()=>{if(document.hidden)clearTimeout(timer);else if(live&&mint)refresh(false)});
setInterval(stamp,1000);
chrome();
const q=new URLSearchParams(location.search).get("mint");if(q){$("#mint").value=q;run(q)}
