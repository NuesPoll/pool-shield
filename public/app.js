// Paste your Google Form link between the quotes to show a "Give feedback" link in the footer.
const FEEDBACK_URL="";
const UI={
 en:{lead:"Paste a Solana token address. See the risks before you put money in its liquidity pool.",ph:"Token address",go:"Scan token",busy:"Scanning...",risk:"risk",tip:"Tap any row to see why it matters.",dex:"View on Dexscreener",liq:"liquidity",vol:"24h volume",price:"price",mcap:"market cap",unk:"Unknown token",
  live:"Live",paused:"Paused",rescan:"Re-scan now",updated:"Updated {s}s ago",onchain:"Safety checks from {m} min ago",
  qr:"Scan QR",qrphoto:"Choose a photo",qrshow:"Show QR",qrlink:"Result link",qrtoken:"Token address",qrcap1:"Scan this to open this result in Pool Shield.",qrcap2:"Scan this to read the token address, for example with Pool Shield's Scan QR.",qrhint:"Point the camera at a QR code that holds a token address.",qrfail:"No Solana token address found in that QR code.",qrdenied:"Camera not available. Use Choose a photo below instead.",close:"Close",
  meth:"How it works",rep:"Report an error",fb:"Give feedback",copy:"Copy link",copied:"Copied",wa:"Share on WhatsApp",img:"Save as image",recent:"Recent scans",clear:"Clear",
  stxt:"Pool Shield scan: {n} - {v}. Check any Solana token free:",disc:"Not financial advice. A lower score means fewer red flags, not a safe investment.",flags:"Biggest flags",cov:"{a} of {b} checks completed. Grey rows could not be checked.",
  foot:"Reads public Solana data and Dexscreener. A lower score means fewer red flags, not a safe investment. Not financial advice. Independent project by Rudy, cybersecurity student at LAUTECH, built for the Degxifi community."},
 pcm:{lead:"Paste Solana token address. Check the risk before you put your money for the liquidity pool.",ph:"Token address",go:"Check am",busy:"E dey check...",risk:"risk",tip:"Tap any row make you see why e matter.",dex:"See am for Dexscreener",liq:"liquidity",vol:"24h volume",price:"price",mcap:"market cap",unk:"Token wey we no know",
  live:"Live",paused:"Paused",rescan:"Check again now",updated:"Updated {s}s ago",onchain:"Safety checks from {m} min ago",
  qr:"Scan QR",qrphoto:"Choose a picture",qrshow:"Show QR",qrlink:"Result link",qrtoken:"Token address",qrcap1:"Scan am to open this result for Pool Shield.",qrcap2:"Scan am to read the token address, like with Pool Shield Scan QR.",qrhint:"Point the camera at QR code wey get token address.",qrfail:"We no see Solana token address for that QR code.",qrdenied:"Camera no dey available. Use Choose a picture below.",close:"Close",
  meth:"How e dey work",rep:"Report error",fb:"Tell us wetin you see",copy:"Copy link",copied:"E don copy",wa:"Share for WhatsApp",img:"Save as picture",recent:"Recent checks",clear:"Clear",
  stxt:"Pool Shield check: {n} - {v}. Check any Solana token free:",disc:"No be financial advice. Small score mean small red flags, e no mean say the investment safe.",flags:"Biggest flags",cov:"{a} of {b} checks don finish. Grey rows we no fit check.",
  foot:"We dey read public Solana data and Dexscreener. Small score mean small red flags, e no mean say the investment safe. No be financial advice. Rudy, cybersecurity student for LAUTECH, build am as independent project for the Degxifi community."}
};
const ICON={
 refresh:'<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
 share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4"/></svg>',
 camera:'<svg viewBox="0 0 24 24"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="4"/></svg>'};
UI.en.share="Share";UI.en.first="Read this first";UI.en.noflags="No red or amber flags in the checks that ran.";UI.en.qrdl="Download QR";UI.en.bd={ok:"Good",warn:"Watch",bad:"Risk",unknown:"Unknown",info:"Info"};
UI.pcm.share="Share";UI.pcm.first="Make you read this first";UI.pcm.noflags="No red or amber flag for the checks wey run.";UI.pcm.qrdl="Download QR";UI.pcm.bd={ok:"Good",warn:"Dey careful",bad:"Risk",unknown:"No know",info:"Info"};
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
  const c=document.createElement("canvas");c.width=1080;c.height=1300;
  const g=c.getContext("2d");if(!g)return null;
  const p=lang==="pcm",u=UI[lang],F='"Familjen Grotesk", system-ui, sans-serif';
  g.fillStyle="#F2F9F8";g.fillRect(0,0,1080,1300);
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
  wrapText(g,u.disc+" "+new Date(d.scannedAt).toISOString().slice(0,16).replace("T"," ")+" UTC",730,2).forEach((l,k)=>g.fillText(l,70,1150+k*30));
  if(window.qrcode){
    g.drawImage(qrCanvas(location.origin+"/?mint="+encodeURIComponent(d.mint),400),810,1070,200,200);
    g.fillStyle="#3d6580";g.font="400 22px "+F;g.fillText(p?"Scan am make you open":"Scan to open",810,1292);
  }
  return c;
}
async function saveImage(){
  if(!last)return;
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch(e){}
  try{await loadQrGen()}catch(e){}
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
  $("#qr").innerHTML=ICON.camera;$("#qr").title=u.qr;$("#qr").setAttribute("aria-label",u.qr);$("#qrphoto").textContent=u.qrphoto;$("#qrclose").textContent=u.close;
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
  const ctl=el("div",null,"bar");
  const lb=el("button",null,"live"+(live?" on":""));lb.type="button";lb.setAttribute("aria-pressed",live);
  lb.append(el("span",null,"dot"),document.createTextNode(live?u.live:u.paused));
  lb.onclick=()=>{live=!live;render(last);if(live)refresh(false);else clearTimeout(timer)};
  const rb=el("button",null,"icon");rb.type="button";rb.title=u.rescan;rb.setAttribute("aria-label",u.rescan);rb.innerHTML=ICON.refresh;rb.onclick=()=>refresh(true);
  const st=el("span",null,"stampline");st.id="stamp";
  const sb=el("button",null,"btn ghost");sb.type="button";sb.innerHTML=ICON.share;sb.append(document.createTextNode(u.share));
  const menu=el("div",null,"menu");menu.hidden=true;
  [[u.copy,copyLink],[u.wa,whatsapp],[u.img,saveImage],[u.qrshow,showQr]].forEach(([t,f])=>{const m=el("button",t,"mi");m.type="button";m.onclick=()=>{menu.hidden=true;f(m)};menu.append(m)});
  sb.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden};
  const shw=el("div",null,"shw");shw.append(sb,menu);
  ctl.append(lb,rb,st,shw);
  const list=el("div");
  d.checks.forEach(c=>{
    const row=el("div",null,"row");row.append(el("i",null,c.status));
    const det=el("details"),sum=el("summary");det.dataset.id=c.id;if(open.has(c.id))det.open=true;
    const nm=el("b",p?c.labelPcm:c.label);nm.append(el("span",u.bd[c.status],"badge "+c.status));
    sum.append(nm,el("span",p?c.detailPcm:c.detail));
    det.append(sum,el("p",p?c.whyPcm:c.why));row.append(det);list.append(row);
  });
  const head=(p?d.verdictPcm:d.verdict)+(d.score==null?"":" ("+d.score+"/100 "+u.risk+")");
  const vc=el("section",null,"vcard "+(VCOL[d.verdict]||"unknown"));
  vc.append(el("h2",head),el("p",d.token?d.token.name+" ("+d.token.symbol+")":u.unk,"tok"),meta,strip);
  const sev={bad:0,warn:1},flags=d.checks.filter(c=>c.status in sev).sort((x,y)=>sev[x.status]-sev[y.status]).slice(0,3);
  const know=el("div",null,"know");know.append(el("h3",u.first));
  if(flags.length){const ul=el("ul");flags.forEach(c=>{const li=el("li");li.append(el("b",p?c.labelPcm:c.label),document.createTextNode(": "+(p?c.detailPcm:c.detail)));ul.append(li)});know.append(ul)}
  else know.append(el("p",u.noflags));
  out.replaceChildren(vc,ctl,know,el("p",d.coverage?u.cov.replace("{a}",d.coverage.done).replace("{b}",d.coverage.total):"","tip"),el("p",u.tip,"tip"),list);
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
// ---- QR scanner (decoder is jsQR, loaded only when needed)
let qrStream=null,qrTimer=null,qrBusy=false;
function loadJsQR(){return new Promise((res,rej)=>{if(window.jsQR)return res();const s=document.createElement("script");s.src="/jsqr.js";s.onload=res;s.onerror=rej;document.head.append(s)})}
function addrFrom(text){const m=String(text||"").match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);return m?m[0]:null}
function qrMsg(t){$("#qrmsg").textContent=t}
function qrStop(){clearInterval(qrTimer);qrTimer=null;if(qrStream){qrStream.getTracks().forEach(x=>x.stop());qrStream=null}$("#qrbox").hidden=true}
function qrUse(text){
  const a=addrFrom(text);
  if(!a){qrMsg(UI[lang].qrfail);return false}
  qrStop();$("#mint").value=a;history.replaceState(null,"","?mint="+encodeURIComponent(a));run(a);return true;
}
async function qrStart(){
  const u=UI[lang];
  try{await loadJsQR()}catch(e){}
  $("#qrbox").hidden=false;qrMsg(u.qrhint);
  try{
    qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    const v=$("#qrvideo");v.srcObject=qrStream;await v.play();
    const c=document.createElement("canvas"),g=c.getContext("2d",{willReadFrequently:true});
    qrTimer=setInterval(()=>{
      if(qrBusy||!v.videoWidth||!window.jsQR)return;qrBusy=true;
      const w=Math.min(520,v.videoWidth),h=Math.round(v.videoHeight*w/v.videoWidth);c.width=w;c.height=h;g.drawImage(v,0,0,w,h);
      const r=window.jsQR(g.getImageData(0,0,w,h).data,w,h);
      qrBusy=false;if(r&&r.data)qrUse(r.data);
    },200);
  }catch(e){qrMsg(u.qrdenied)}
}
function qrFromFile(f){
  if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);
  img.onload=async()=>{
    try{await loadJsQR()}catch(e){}
    const w=Math.min(1000,img.width),h=Math.round(img.height*w/img.width),c=document.createElement("canvas");c.width=w;c.height=h;
    const g=c.getContext("2d");g.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
    const r=window.jsQR&&window.jsQR(g.getImageData(0,0,w,h).data,w,h);
    if(!(r&&r.data&&qrUse(r.data)))out.replaceChildren(el("p",UI[lang].qrfail,"err"));
  };
  img.src=url;
}
$("#qr").addEventListener("click",qrStart);
$("#qrphoto").addEventListener("click",()=>$("#qrfile").click());
$("#qrfile").addEventListener("change",e=>{qrFromFile(e.target.files[0]);e.target.value=""});
$("#qrclose").addEventListener("click",qrStop);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){qrStop();$("#qrout").hidden=true}});
// ---- QR generator (library is loaded only when needed)
function loadQrGen(){return new Promise((res,rej)=>{if(window.qrcode)return res();const s=document.createElement("script");s.src="/qrgen.js";s.onload=res;s.onerror=rej;document.head.append(s)})}
function qrCanvas(text,size){
  const q=window.qrcode(0,"M");q.addData(text);q.make();
  const n=q.getModuleCount(),pad=4,cell=Math.max(1,Math.floor(size/(n+pad*2))),s=cell*(n+pad*2);
  const c=document.createElement("canvas");c.width=c.height=s;
  const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,s,s);g.fillStyle="#0A3D62";
  for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))g.fillRect((k+pad)*cell,(r+pad)*cell,cell,cell);
  return c;
}
let qrMode="link";
function drawQr(){
  if(!last)return;
  const u=UI[lang],text=qrMode==="link"?shareUrl():last.mint;
  $("#qrt1").textContent=u.qrlink;$("#qrt2").textContent=u.qrtoken;$("#qrx").textContent=u.close;$("#qrdl").textContent=u.qrdl;$("#qrphoto").textContent=u.qrphoto;
  $("#qrt1").setAttribute("aria-pressed",qrMode==="link");$("#qrt2").setAttribute("aria-pressed",qrMode==="token");
  $("#qrcap").textContent=qrMode==="link"?u.qrcap1:u.qrcap2;
  $("#qrcv").replaceChildren(window.qrcode?qrCanvas(text,600):el("p",u.qrfail,"err"));
}
async function showQr(){if(!last)return;try{await loadQrGen()}catch(e){}$("#qrout").hidden=false;drawQr()}
$("#qrt1").addEventListener("click",()=>{qrMode="link";drawQr()});
$("#qrt2").addEventListener("click",()=>{qrMode="token";drawQr()});
async function downloadQr(){
  if(!last||!window.qrcode)return;
  const u=UI[lang],text=qrMode==="link"?shareUrl():last.mint,F='"Familjen Grotesk", system-ui, sans-serif';
  const q=qrCanvas(text,720),c=document.createElement("canvas");c.width=800;c.height=960;
  const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,800,960);g.imageSmoothingEnabled=false;g.drawImage(q,40,120,720,720);
  g.fillStyle="#0A3D62";g.font="700 44px "+F;g.fillText("Pool Shield",40,80);
  g.font="600 30px "+F;g.fillText((last.token?last.token.symbol:"")+" | "+(qrMode==="link"?u.qrlink:u.qrtoken),40,890);
  g.fillStyle="#3d6580";g.font="400 22px "+F;g.fillText(location.host,40,930);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob)return;
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="pool-shield-qr.png";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
$("#qrdl").addEventListener("click",downloadQr);
document.addEventListener("click",()=>document.querySelectorAll(".menu").forEach(m=>m.hidden=true));
$("#qrx").addEventListener("click",()=>{$("#qrout").hidden=true});
setInterval(stamp,1000);
chrome();
const q=new URLSearchParams(location.search).get("mint");if(q){$("#mint").value=q;run(q)}
