(() => {
const views=["scanner","history","learn"];
const copy={
en:{scanner:"Scanner",history:"History",learn:"Learn",historyNote:"Recent scans are stored only in this browser. Opening one runs a fresh scan.",empty:"No scans yet.",learnNote:"Understand the evidence behind a security report.",mintTitle:"Mint authority",mintText:"An active mint authority can create additional tokens. This is a risk indicator, not proof of wrongdoing.",freezeTitle:"Freeze authority",freezeText:"A freeze authority can restrict transfers from token accounts.",holderTitle:"Holder concentration",holderText:"A few accounts may hold much of the supply. Accounts do not necessarily represent different people.",liquidityTitle:"Liquidity evidence",liquidityText:"Liquidity data describes available pool assets. Lock information may be incomplete or unverified.",scoreTitle:"Risk scores",scoreText:"A lower score means fewer observed risk indicators, not a guarantee of safety."},
pcm:{scanner:"Check token",history:"Past checks",learn:"Learn",historyNote:"Na only this browser keep your past checks. Open any one to check am afresh.",empty:"You never check any token.",learnNote:"Understand the evidence wey dey inside security report.",mintTitle:"Power to create token",mintText:"If mint power still dey active, dem fit create more tokens. Na risk sign, no be proof of bad thing.",freezeTitle:"Power to freeze",freezeText:"Freeze power fit stop transfer from token accounts.",holderTitle:"Big token holders",holderText:"Few accounts fit hold plenty tokens. Different accounts no always mean different people.",liquidityTitle:"Liquidity evidence",liquidityText:"Liquidity data show assets wey dey pool. Information about lock fit no complete or never confirm.",scoreTitle:"Risk score",scoreText:"Lower score mean say we see fewer risk signs. E no guarantee safety."}
};
Object.assign(copy.en,{demoOpen:"Try a fictional demo",demoClose:"Close demo",demoTitle:"Practice report — fictional data",demoNote:"This is not a real token or live scan. No AI or blockchain request is needed.",demoSummary:"Two concerns are visible and one finding is unknown. Missing evidence is not evidence of safety.",demoMint:"Concern: more tokens can be created",demoFreeze:"Observed: freeze authority disabled",demoFreezeText:"The example has no active freeze authority. This finding alone does not establish safety.",demoHolder:"Concern: concentrated ownership",demoLiquidity:"Unknown: liquidity protection",demoQuestion:"Does unknown liquidity protection mean the token is safe?",yes:"Yes",no:"No",correct:"Correct. Unknown means the evidence is incomplete.",incorrect:"Not quite. Unknown means the evidence is incomplete, not that the token is safe."});
Object.assign(copy.pcm,{demoOpen:"Try practice example",demoClose:"Close practice",demoTitle:"Practice report — na example data",demoNote:"No be real token or live check. E no need AI or blockchain request.",demoSummary:"Two risk signs dey and one finding never confirm. Missing evidence no mean safety.",demoMint:"Risk sign: dem fit create more tokens",demoFreeze:"Wetin we see: freeze power no dey active",demoFreezeText:"For this example, freeze power no dey active. That one alone no guarantee safety.",demoHolder:"Risk sign: few accounts hold plenty",demoLiquidity:"Never confirm: liquidity protection",demoQuestion:"If liquidity protection never confirm, e mean say token safe?",yes:"Yes",no:"No",correct:"Correct. E mean say evidence never complete.",incorrect:"No be so. Evidence never complete; e no mean say token safe."});
const demo=document.getElementById("demo-panel"),toggle=document.getElementById("demo-toggle"),feedback=document.getElementById("demo-feedback");
let answer=null;
function demoText(){const c=copy[document.getElementById("pcm").getAttribute("aria-pressed")==="true"?"pcm":"en"];toggle.textContent=c[demo.hidden?"demoOpen":"demoClose"];feedback.textContent=answer===null?"":c[answer==="no"?"correct":"incorrect"]}
toggle.addEventListener("click",()=>{demo.hidden=!demo.hidden;toggle.setAttribute("aria-expanded",String(!demo.hidden));demoText()});
document.querySelectorAll("[data-demo-answer]").forEach(b=>b.addEventListener("click",()=>{answer=b.dataset.demoAnswer;demoText()}));
document.addEventListener("pool-shield:scan",()=>{demo.hidden=true;toggle.setAttribute("aria-expanded","false");demoText()});
function translate(){
const p=document.getElementById("pcm").getAttribute("aria-pressed")==="true";
document.documentElement.lang=p?"pcm":"en";
document.querySelectorAll("[data-copy]").forEach(el=>{el.textContent=copy[p?"pcm":"en"][el.dataset.copy]});
demoText();
const select=document.getElementById("theme-choice");
["System","Light","Dark"].forEach((v,i)=>select.options[i].textContent=p?["Follow device","Light","Dark"][i]:v);
select.setAttribute("aria-label",p?"Choose how screen go look":"Color theme");
document.querySelector(".workspace-nav").setAttribute("aria-label",p?"Main menu":"Main navigation");
document.querySelector(".top").setAttribute("aria-label",p?"Screen and language settings":"Display preferences");
document.getElementById("scanner-panel").setAttribute("aria-label",copy[p?"pcm":"en"].scanner);
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
