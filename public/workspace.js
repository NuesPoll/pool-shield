(() => {
const views=["scanner","history","learn"];
const copy={
en:{scanner:"Scanner",history:"History",learn:"Learn",historyNote:"Recent scans are stored only in this browser. Opening one runs a fresh scan.",empty:"No scans yet.",learnNote:"Understand the evidence behind a security report.",mintTitle:"Mint authority",mintText:"An active mint authority can create additional tokens. This is a risk indicator, not proof of wrongdoing.",freezeTitle:"Freeze authority",freezeText:"A freeze authority can restrict transfers from token accounts.",holderTitle:"Holder concentration",holderText:"A few accounts may hold much of the supply. Accounts do not necessarily represent different people.",liquidityTitle:"Liquidity evidence",liquidityText:"Liquidity data describes available pool assets. Lock information may be incomplete or unverified.",scoreTitle:"Risk scores",scoreText:"A lower score means fewer observed risk indicators, not a guarantee of safety."},
pcm:{scanner:"Check token",history:"Past checks",learn:"Learn",historyNote:"Na only this browser keep your past checks. Open any one to check am afresh.",empty:"You never check any token.",learnNote:"Understand the evidence wey dey inside security report.",mintTitle:"Power to create token",mintText:"If mint power still dey active, dem fit create more tokens. Na risk sign, no be proof of bad thing.",freezeTitle:"Power to freeze",freezeText:"Freeze power fit stop transfer from token accounts.",holderTitle:"Big token holders",holderText:"Few accounts fit hold plenty tokens. Different accounts no always mean different people.",liquidityTitle:"Liquidity evidence",liquidityText:"Liquidity data show assets wey dey pool. Information about lock fit no complete or never confirm.",scoreTitle:"Risk score",scoreText:"Lower score mean say we see fewer risk signs. E no guarantee safety."}
};
function translate(){
const p=document.getElementById("pcm").getAttribute("aria-pressed")==="true";
document.documentElement.lang=p?"pcm":"en";
document.querySelectorAll("[data-copy]").forEach(el=>{el.textContent=copy[p?"pcm":"en"][el.dataset.copy]});
const select=document.getElementById("theme-choice");
["System","Light","Dark"].forEach((v,i)=>select.options[i].textContent=p?["Device","Light","Dark"][i]:v);
}
function show(view){
if(!views.includes(view))return;
views.forEach(v=>{document.getElementById(v+"-panel").hidden=v!==view});
document.querySelectorAll("[data-view]").forEach(b=>{if(b.dataset.view===view)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
window.scrollTo(0,0);
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.view)));
const recent=document.getElementById("recent");
function empty(){document.getElementById("history-empty").hidden=recent.children.length>0}
new MutationObserver(empty).observe(recent,{childList:true});
recent.addEventListener("click",e=>{if(e.target.closest(".chip"))show("scanner")});
document.addEventListener("pool-shield:language",translate);
translate();empty();
})();
