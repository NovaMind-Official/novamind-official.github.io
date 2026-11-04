/* =====================================================================
   Phraortes — Plans sheet (plans.js)
   A quiet bottom sheet: four plans, one tap to expand, one button to continue.
   Continue → openPayment(<plan>) (payment.js). Internal plan keys are unchanged:
   free / starter / pro / ultimate  ⇄  Free / Plus / Pro / Max.
   Public API: window.PHR_PLANS = { open, close, sync, refresh }
   ===================================================================== */
(function(){
"use strict";
const ORDER=["free","starter","pro","ultimate"];
const NAME={free:"Free",starter:"Plus",pro:"Pro",ultimate:"Max"};
const COLOR={free:"#A99C86",starter:"#3FD0C9",pro:"#3FE0A0",ultimate:"#E8C468"};
const TAG={
  free:"Try it, no card",
  starter:"For everyday work",
  pro:"For serious projects",
  ultimate:"No ceilings"
};
const FEAT={
  free:["10 messages to get started","Prime core, quick and everyday","Chats stay on your device"],
  starter:["Live web search with cited sources","Reads photos, links and documents","Intellect core for deeper reasoning","100 premium requests a month"],
  pro:["Everything in Plus","Apex core for engineering-grade work","Workspace, canvas and PDF export","Deep Research with sourced reports","350 premium requests a month"],
  ultimate:["Everything in Pro","Sovereign, our most capable core","Aura live voice, five personalities","Unlimited premium requests and images","Unlimited custom assistants"]
};
const PRICE={starter:{m:14.99,a:10.49,t:125.88},pro:{m:49.99,a:34.99,t:419.88},ultimate:{m:119.99,a:83.99,t:1007.88}};
const S={built:false,open:false,sel:"pro",timers:[]};
const $=id=>document.getElementById(id);
const hap=t=>{try{haptic(t||"light")}catch(e){}};
const money=n=>"$"+(Math.round(n*100)/100).toFixed(2);
const cur=()=>{try{return activePlan||"free"}catch(e){return"free"}};
const annual=()=>{try{return !!isAnnual}catch(e){return false}};
const rank=k=>ORDER.indexOf(k);

/* ---------- styles ---------- */
(function(){const st=document.createElement("style");st.id="pl-css";st.textContent=`
#plans-sheet{position:fixed;inset:0;z-index:15000;display:none;align-items:flex-end;justify-content:center;font-family:'Space Grotesk','Vazirmatn',system-ui,sans-serif;color:#F4EBDD;-webkit-tap-highlight-color:transparent}
#plans-sheet.on{display:flex}
.pl-scrim{position:absolute;inset:0;background:rgba(4,3,2,.62);opacity:0;transition:opacity .35s ease}
#plans-sheet.in .pl-scrim{opacity:1}
.pl-card{position:relative;width:100%;max-width:520px;max-height:92dvh;display:flex;flex-direction:column;border-radius:28px 28px 0 0;background:linear-gradient(180deg,#17120C 0%,#0E0B07 100%);border:1px solid rgba(232,196,104,.16);border-bottom:0;box-shadow:0 -30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,236,190,.08);transform:translateY(100%);transition:transform .5s cubic-bezier(.3,1.15,.5,1);will-change:transform;overflow:hidden}
#plans-sheet.in .pl-card{transform:translateY(0)}
.pl-card.drag{transition:none}
.pl-head{padding:8px 20px 14px;touch-action:none;flex:none}
.pl-grip{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,.18);margin:0 auto 14px}
.pl-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pl-title{font:600 26px/1.1 Georgia,'Times New Roman',serif;letter-spacing:-.01em;margin:0}
.pl-x{width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.07);color:#F4EBDD;display:grid;place-items:center;cursor:pointer}
.pl-x svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round}
.pl-seg{position:relative;display:grid;grid-template-columns:1fr 1fr;margin-top:14px;padding:3px;border-radius:13px;background:rgba(255,255,255,.06)}
.pl-seg i{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:10px;background:rgba(232,196,104,.16);box-shadow:inset 0 0 0 1px rgba(232,196,104,.35);transition:transform .45s cubic-bezier(.3,1.35,.5,1)}
.pl-seg.an i{transform:translateX(100%)}
.pl-seg button{position:relative;z-index:1;border:0;background:none;color:rgba(244,235,221,.62);font:500 13px 'Space Grotesk',sans-serif;padding:9px 0;cursor:pointer;transition:color .25s}
.pl-seg button.on{color:#F4EBDD}
.pl-seg em{font-style:normal;font-size:10px;margin-left:6px;padding:2px 6px;border-radius:20px;background:rgba(63,224,160,.16);color:#6FE9B8}
.pl-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:2px 16px 12px;-webkit-overflow-scrolling:touch}
.pl-row{position:relative;margin-top:9px;border-radius:20px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);overflow:hidden;transition:border-color .3s,background .3s,opacity .3s}
.pl-row.sel{background:rgba(255,255,255,.055);border-color:var(--c)}
.pl-row.sel::before{content:'';position:absolute;inset:0;background:radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--c) 16%,transparent),transparent 60%);pointer-events:none}
.pl-row.lo{opacity:.55}
.pl-sum{position:relative;width:100%;display:flex;align-items:center;gap:12px;padding:15px 16px;border:0;background:none;color:inherit;text-align:left;cursor:pointer;font:inherit}
.pl-dot{width:11px;height:11px;border-radius:50%;background:var(--c);box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 18%,transparent);flex:none;transition:transform .4s cubic-bezier(.3,1.5,.5,1)}
.pl-row.sel .pl-dot{transform:scale(1.25)}
.pl-nm{flex:1;min-width:0}
.pl-nm b{display:flex;align-items:center;gap:8px;font:600 18px/1.2 Georgia,serif}
.pl-nm small{display:block;margin-top:2px;font-size:12.5px;color:rgba(244,235,221,.58)}
.pl-badge{font:600 9.5px/1 'Space Mono',monospace;letter-spacing:.08em;padding:4px 7px;border-radius:20px;background:rgba(232,196,104,.15);color:#E8C468;text-transform:uppercase}
.pl-badge.cur{background:rgba(255,255,255,.1);color:rgba(244,235,221,.8)}
.pl-pr{text-align:right;flex:none}
.pl-pr b{display:block;font:600 20px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums}
.pl-pr small{font-size:10.5px;color:rgba(244,235,221,.5)}
.pl-more{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.3,1.1,.5,1)}
.pl-row.sel .pl-more{grid-template-rows:1fr}
.pl-more>div{overflow:hidden}
.pl-more ul{list-style:none;margin:0;padding:0 16px 16px 39px;position:relative}
.pl-more li{position:relative;font-size:13.5px;line-height:1.4;color:rgba(244,235,221,.82);padding:5px 0 5px 22px;opacity:0;transform:translateY(6px);transition:opacity .4s,transform .4s}
.pl-row.sel .pl-more li{opacity:1;transform:none}
.pl-more li::before{content:'';position:absolute;left:0;top:10px;width:12px;height:12px;border-radius:50%;background:color-mix(in srgb,var(--c) 22%,transparent)}
.pl-more li::after{content:'';position:absolute;left:3.5px;top:12.5px;width:4px;height:7px;border:solid var(--c);border-width:0 1.8px 1.8px 0;transform:rotate(40deg) scale(.9)}
.pl-fold{margin-top:9px;border-radius:18px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);overflow:hidden}
.pl-fold>button{width:100%;display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:0;background:none;color:rgba(244,235,221,.8);font:500 13.5px 'Space Grotesk',sans-serif;cursor:pointer}
.pl-fold>button svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;transition:transform .35s}
.pl-fold.open>button svg{transform:rotate(180deg)}
.pl-fold .pl-more{grid-template-rows:0fr}
.pl-fold.open .pl-more{grid-template-rows:1fr}
.pl-tb{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 6px}
.pl-tb th,.pl-tb td{padding:8px 6px;text-align:center;border-top:1px solid rgba(255,255,255,.06)}
.pl-tb th:first-child,.pl-tb td:first-child{text-align:left;padding-left:16px;color:rgba(244,235,221,.62)}
.pl-tb th{font:600 11px 'Space Mono',monospace;letter-spacing:.04em;border-top:0}
.pl-tb td:last-child,.pl-tb th:last-child{padding-right:12px}
.pl-ex{display:flex;gap:9px;padding:0 12px 14px}
.pl-ex button{flex:1;text-align:left;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:#F4EBDD;font:500 13px 'Space Grotesk',sans-serif;cursor:pointer}
.pl-ex button small{display:block;color:rgba(244,235,221,.55);font-size:11.5px;margin-top:3px}
.pl-foot{flex:none;padding:12px 16px calc(env(safe-area-inset-bottom) + 14px);border-top:1px solid rgba(255,255,255,.06);background:linear-gradient(180deg,rgba(14,11,7,.2),#0E0B07 40%)}
.pl-go{position:relative;width:100%;height:54px;border:0;border-radius:17px;font:600 15.5px 'Space Grotesk',sans-serif;color:#1A1204;background:linear-gradient(135deg,#F3D98C,#E8C468 55%,#CFA64A);box-shadow:0 10px 30px -8px rgba(232,196,104,.55),inset 0 1px 0 rgba(255,255,255,.5);cursor:pointer;overflow:hidden;transition:transform .2s,opacity .3s,filter .3s}
.pl-go:active{transform:scale(.975)}
.pl-go[disabled]{background:rgba(255,255,255,.08);color:rgba(244,235,221,.5);box-shadow:none;cursor:default}
.pl-go::after{content:'';position:absolute;top:0;bottom:0;width:60%;left:-70%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);animation:plShine 3.6s ease-in-out infinite}
.pl-go[disabled]::after{display:none}
@keyframes plShine{0%,55%{left:-70%}100%{left:130%}}
.pl-note{text-align:center;font-size:11px;color:rgba(244,235,221,.45);margin-top:9px}
@media (prefers-reduced-motion:reduce){#plans-sheet *,#plans-sheet *::before,#plans-sheet *::after{transition-duration:.01ms!important;animation:none!important}}
@media (min-width:700px){#plans-sheet{align-items:center}.pl-card{border-radius:28px;border-bottom:1px solid rgba(232,196,104,.16);max-height:86dvh}}
`;document.head.appendChild(st)})();

/* ---------- build ---------- */
const chev='<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
function build(){
  if(S.built)return;S.built=true;
  const el=document.createElement("div");el.id="plans-sheet";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Plans");
  el.innerHTML=`<div class="pl-scrim" data-x></div>
  <div class="pl-card" id="pl-card">
    <div class="pl-head" id="pl-head"><div class="pl-grip"></div>
      <div class="pl-top"><h2 class="pl-title">Choose your plan</h2><button class="pl-x" data-x aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="pl-seg" id="pl-seg"><i></i><button data-b="m">Monthly</button><button data-b="a">Annual<em>−30%</em></button></div>
    </div>
    <div class="pl-body" id="pl-body"></div>
    <div class="pl-foot"><button class="pl-go" id="pl-go"></button><div class="pl-note">Cancel anytime · Secure checkout on the next step</div></div>
  </div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
    const t=e.target;
    if(t.closest("[data-x]")){close();return}
    const b=t.closest("[data-b]");if(b){setBilling(b.dataset.b==="a");return}
    const r=t.closest(".pl-sum");if(r){select(r.parentNode.dataset.k);return}
    const f=t.closest(".pl-fold>button");if(f){f.parentNode.classList.toggle("open");hap();return}
    const ex=t.closest("[data-top]");if(ex){close();setTimeout(()=>{try{openTopupPayment(ex.dataset.top)}catch(e){}},260);return}
    if(t.closest("#pl-go")){go()}
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.open)close()});
  drag();
}
function rows(){
  const a=annual(),c=cur();
  return ORDER.map(k=>{
    const p=PRICE[k],pr=k==="free"?"$0":money(a?p.a:p.m),sub=k==="free"?"forever":(a?"/mo · billed yearly":"/month");
    const badge=k===c?'<span class="pl-badge cur">Current</span>':(k==="pro"&&c!=="pro"&&c!=="ultimate"?'<span class="pl-badge">Popular</span>':"");
    return `<div class="pl-row${k===S.sel?" sel":""}${rank(k)<rank(c)?" lo":""}" data-k="${k}" style="--c:${COLOR[k]}">
      <button class="pl-sum" aria-expanded="${k===S.sel}"><span class="pl-dot"></span><span class="pl-nm"><b>${NAME[k]}${badge}</b><small>${TAG[k]}</small></span><span class="pl-pr"><b>${pr}</b><small>${sub}</small></span></button>
      <div class="pl-more"><div><ul>${FEAT[k].map((f,i)=>`<li style="transition-delay:${60+i*45}ms">${f}</li>`).join("")}</ul></div></div></div>`;
  }).join("")+`
  <div class="pl-fold"><button>Compare in detail${chev}</button><div class="pl-more"><div>
    <table class="pl-tb"><tr><th></th><th>Free</th><th>Plus</th><th>Pro</th><th>Max</th></tr>
    <tr><td>Cores</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
    <tr><td>Premium requests</td><td>—</td><td>100</td><td>350</td><td>∞</td></tr>
    <tr><td>Images / month</td><td>—</td><td>30</td><td>120</td><td>∞</td></tr>
    <tr><td>Aura voice</td><td>—</td><td>—</td><td>—</td><td>✓</td></tr></table></div></div></div>
  <div class="pl-fold"><button>Need more, right now?${chev}</button><div class="pl-more"><div><div class="pl-ex">
    <button data-top="slots50">+50 slots<small>${money(2.99)} · one-time</small></button><button data-top="slots200">+200 slots<small>${money(8.99)} · one-time</small></button></div></div></div></div>`;
}
function paintFoot(){
  const c=cur(),k=S.sel,g=$("pl-go");if(!g)return;
  if(k===c){g.disabled=true;g.textContent="Current plan"}
  else if(rank(k)<rank(c)){g.disabled=true;g.textContent="Included in your plan"}
  else if(k==="free"){g.disabled=true;g.textContent="Free plan"}
  else{const p=PRICE[k];g.disabled=false;g.textContent=`Continue with ${NAME[k]} · ${money(annual()?p.a:p.m)}/mo`}
}
function paint(keepScroll){
  const b=$("pl-body");if(!b)return;const y=b.scrollTop;
  const open=[...b.querySelectorAll(".pl-fold.open")].map(f=>f.querySelector("button").textContent.trim());
  b.innerHTML=rows();
  b.querySelectorAll(".pl-fold").forEach(f=>{if(open.includes(f.querySelector("button").textContent.trim()))f.classList.add("open")});
  const sg=$("pl-seg");sg.classList.toggle("an",annual());sg.querySelectorAll("button").forEach(x=>x.classList.toggle("on",(x.dataset.b==="a")===annual()));
  if(keepScroll)b.scrollTop=y;paintFoot();
}
function select(k){if(k===S.sel)return;S.sel=k;hap();
  const b=$("pl-body");b.querySelectorAll(".pl-row").forEach(r=>{const on=r.dataset.k===k;r.classList.toggle("sel",on);r.querySelector(".pl-sum").setAttribute("aria-expanded",on)});paintFoot()}
function setBilling(a){if(annual()===a)return;try{isAnnual=a}catch(e){}hap();
  const sg=$("pl-seg");sg.classList.toggle("an",a);sg.querySelectorAll("button").forEach(x=>x.classList.toggle("on",(x.dataset.b==="a")===a));
  document.querySelectorAll("#pl-body .pl-row").forEach(r=>{const k=r.dataset.k;if(k==="free")return;const p=PRICE[k],pr=r.querySelector(".pl-pr");
    pr.style.transition="opacity .15s,transform .15s";pr.style.opacity=0;pr.style.transform="translateY(-4px)";
    setTimeout(()=>{pr.innerHTML=`<b>${money(a?p.a:p.m)}</b><small>${a?"/mo · billed yearly":"/month"}</small>`;pr.style.opacity=1;pr.style.transform="none"},150)});
  paintFoot()}
function go(){
  const k=S.sel,g=$("pl-go");if(!g||g.disabled||k==="free")return;hap("medium");
  close();setTimeout(()=>{try{openPayment(NAME[k])}catch(e){try{showToast("Checkout is unavailable right now","error")}catch(_){}}},300);
}

/* ---------- open / close ---------- */
function open(preselect){
  build();
  const c=cur();
  S.sel=(preselect&&ORDER.includes(preselect))?preselect:(rank(c)>=rank("pro")?"ultimate":"pro");
  if(rank(S.sel)<=rank(c)&&c!=="ultimate")S.sel=ORDER[rank(c)+1];
  paint();
  const el=$("plans-sheet"),card=$("pl-card");
  card.style.transform="";card.classList.remove("drag");
  el.classList.add("on");S.open=true;$("pl-body").scrollTop=0;
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("in")));
  document.body.classList.add("phr-recede");
}
function close(){
  const el=$("plans-sheet");if(!el||!S.open)return;S.open=false;
  const card=$("pl-card");card.classList.remove("drag");card.style.transform="";
  el.classList.remove("in");
  setTimeout(()=>{if(!S.open){el.classList.remove("on");document.body.classList.remove("phr-recede")}},420);
}
function drag(){
  const h=$("pl-head"),card=$("pl-card");let y0=0,dy=0,on=false;
  h.addEventListener("touchstart",e=>{if(e.target.closest("button"))return;on=true;y0=e.touches[0].clientY;dy=0;card.classList.add("drag")},{passive:true});
  h.addEventListener("touchmove",e=>{if(!on)return;dy=Math.max(0,e.touches[0].clientY-y0);card.style.transform=`translateY(${dy}px)`},{passive:true});
  const end=()=>{if(!on)return;on=false;card.classList.remove("drag");if(dy>110)close();else card.style.transform="";dy=0};
  h.addEventListener("touchend",end);h.addEventListener("touchcancel",end);
}
function refresh(){if(S.built&&S.open)paint(true)}
function sync(){if(S.built&&S.open)paint(true)}

window.PHR_PLANS={open,close,refresh,sync,NAME,COLOR};
})();
