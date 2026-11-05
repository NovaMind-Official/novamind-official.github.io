/* =====================================================================
   Phraortes — Life Memory (life.js)
   A structured, dated memory: facts, plans, reminders, money, people.
   • The assistant writes to it with remember_fact (kind + optional due) and reads with recall_memory.
   • Only what is relevant to the current message is put in the prompt (not a flat dump).
   • Reminders fire as an in-app banner (and a system notification when permission is granted).
   Public API: window.LIFE = { add, search, prompt, forget, open, close, tick, all, migrate }
   ===================================================================== */
(function(){
"use strict";
const KEY="phraortes_life_v1",MAX=400;
const KINDS={fact:{n:"Facts",c:"#BF7AF5"},plan:{n:"Plans",c:"#5B9BEF"},reminder:{n:"Reminders",c:"#E8C468"},money:{n:"Money",c:"#3DDC97"},person:{n:"People",c:"#E58A45"},note:{n:"Notes",c:"#9AA7B5"}};
let L=[],S={open:false,f:"all",q:"",built:false};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hap=t=>{try{haptic(t||"light")}catch(e){}};
const toast=(m,t)=>{try{showToast(m,t||"success")}catch(e){}};
function load(){try{L=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(L))L=[]}catch(e){L=[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(L))}catch(e){}}
const norm=s=>String(s||"").toLowerCase().replace(/[ً-ٟ‌]/g,"").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/\s+/g," ").trim();
const toks=s=>norm(s).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>1);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function parseDue(d){if(!d)return null;if(typeof d==="number")return d;const t=Date.parse(String(d).replace(" ","T"));return isNaN(t)?null:t}
function guessKind(t){
  if(/(یادم باش|یادآور|فراموش نکن|remind|deadline|ددلاین)/i.test(t))return"reminder";
  if(/(\$|تومان|ریال|دلار|یورو|بودجه|حقوق|قیمت|budget|salary|price|usd|eur)/i.test(t))return"money";
  if(/(قصد دارم|برنامه دارم|می‌خواهم|plans? to|going to|goal|هدف)/i.test(t))return"plan";
  if(/(دوستم|همسرم|برادرم|خواهرم|مادرم|پدرم|my (friend|wife|husband|brother|sister|mother|father|boss))/i.test(t))return"person";
  return"fact";
}
function add(o){
  if(typeof o==="string")o={text:o};
  const text=String(o.text||o.fact||"").trim().slice(0,400);if(!text)return null;
  const n=norm(text);const ex=L.find(x=>norm(x.t)===n);
  if(ex){if(o.due&&!ex.due){ex.due=parseDue(o.due);ex.fired=false;save()}return ex}
  const kind=KINDS[o.kind]?o.kind:guessKind(text);
  const e={id:uid(),t:text,k:kind,ts:Date.now(),due:parseDue(o.due),pin:!!o.pin,src:o.src||"ai"};
  if(e.due&&kind!=="reminder"&&kind!=="plan")e.k="reminder";
  L.unshift(e);
  if(L.length>MAX){const keep=L.filter(x=>x.pin||(x.due&&!x.done));const rest=L.filter(x=>!(x.pin||(x.due&&!x.done)));L=keep.concat(rest).slice(0,MAX).sort((a,b)=>b.ts-a.ts)}
  save();if(S.open)paint();return e;
}
function fmtDay(ts){
  const d=new Date(ts),n=new Date(),t0=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime(),day=864e5;
  if(ts>=t0)return"Today";if(ts>=t0-day)return"Yesterday";if(ts>=t0-6*day)return d.toLocaleDateString(undefined,{weekday:"long"});
  return d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:d.getFullYear()===n.getFullYear()?undefined:"numeric"});
}
function fmtDue(ts){const d=new Date(ts),n=Date.now(),diff=ts-n;
  const tm=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  if(diff<0)return"Overdue · "+fmtDay(ts)+" "+tm;
  return fmtDay(ts)+" · "+tm}
/* ---------- search ---------- */
const TIME={today:0,"امروز":0,yesterday:1,"دیروز":1,"last week":7,"هفته پیش":7,"هفته گذشته":7,"last month":30,"ماه پیش":30,"ماه گذشته":30};
function search(q,limit){
  limit=limit||12;q=String(q||"").trim();
  if(!q||/^(everything|all|همه)$/i.test(q))return L.slice().sort((a,b)=>(b.pin-a.pin)||(b.ts-a.ts)).slice(0,limit);
  let since=0;const ql=q.toLowerCase();
  for(const k in TIME){if(ql.includes(k)){since=Date.now()-Math.max(1,TIME[k])*864e5;break}}
  const qt=toks(q).filter(w=>!(w in TIME));
  const sc=L.map(e=>{
    const et=toks(e.t);let s=0;
    qt.forEach(w=>{if(et.some(x=>x===w))s+=3;else if(et.some(x=>x.includes(w)||w.includes(x)))s+=1.2});
    if(KINDS[ql]&&e.k===ql)s+=2;
    if(since&&e.ts>=since)s+=2;
    if(e.pin)s+=.5;
    return{e,s}
  }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||b.e.ts-a.e.ts);
  return sc.slice(0,limit).map(x=>x.e);
}
function line(e){const d=new Date(e.ts).toISOString().slice(0,10);return"- "+e.t+(e.due?` [due ${new Date(e.due).toISOString().slice(0,16).replace("T"," ")}]`:"")+` (${e.k}, ${d})`}
function brief(e){return{text:e.t,kind:e.k,saved:new Date(e.ts).toISOString().slice(0,10),due:e.due?new Date(e.due).toISOString().slice(0,16):undefined,done:e.done||undefined}}
/* what goes into the system prompt: pinned + relevant + recent + upcoming — never the whole store */
function promptFor(userText){
  if(!L.length)return"";
  const seen=new Set(),out=[];
  const take=e=>{if(e&&!seen.has(e.id)&&out.length<14){seen.add(e.id);out.push(e)}};
  L.filter(e=>e.pin).forEach(take);
  const soon=Date.now()+3*864e5;
  L.filter(e=>e.due&&!e.done&&e.due<soon).sort((a,b)=>a.due-b.due).slice(0,4).forEach(take);
  if(userText)search(userText,6).forEach(take);
  L.filter(e=>e.k==="fact").slice(0,5).forEach(take);
  if(!out.length)return"";
  return"\n\nLife memory — what you know about this user (dated; use naturally and only when it helps, never recite it; you can save more with remember_fact and look things up with recall_memory):\n"+out.map(line).join("\n");
}
function forget(q){
  const hit=search(q,50).filter(e=>norm(e.t).includes(norm(q))||toks(q).every(w=>norm(e.t).includes(w)));
  hit.forEach(h=>{L=L.filter(x=>x.id!==h.id)});save();if(S.open)paint();return hit.length;
}
function migrate(){
  try{
    if(localStorage.getItem("phraortes_life_migrated"))return;
    const old=JSON.parse(localStorage.getItem("phraortes_longmemory")||"[]");
    if(Array.isArray(old)&&old.length){old.slice().reverse().forEach(f=>{if(typeof f==="string"&&f.trim()){const e=add({text:f,src:"migrated"});if(e)e.ts=Date.now()-864e5}})}
    localStorage.setItem("phraortes_life_migrated","1");
  }catch(e){}
}
/* ---------- reminders ---------- */
let banner=null;
function notify(e){
  hap("success");
  try{if("Notification" in window&&Notification.permission==="granted"&&document.visibilityState!=="visible"){new Notification("Phraortes",{body:e.t,tag:e.id})}}catch(x){}
  showBanner(e);
}
function showBanner(e){
  if(!document.getElementById("lf-css"))return;
  const b=document.createElement("div");b.className="lf-bn";
  b.innerHTML=`<div class="lf-bn-i"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg></div><div class="lf-bn-t"><small>Reminder</small>${esc(e.t)}</div><button data-d>Done</button><button data-s>Later</button>`;
  b.addEventListener("click",ev=>{
    const x=ev.target.closest("button");if(!x)return;
    if(x.dataset.d!==undefined){e.done=true;save();if(S.open)paint()}
    else{e.due=Date.now()+30*60000;e.fired=false;save()}
    b.classList.remove("in");setTimeout(()=>b.remove(),400);hap();
  });
  document.body.appendChild(b);requestAnimationFrame(()=>requestAnimationFrame(()=>b.classList.add("in")));
  setTimeout(()=>{if(b.isConnected){b.classList.remove("in");setTimeout(()=>b.remove(),400)}},14000);
}
function tick(){
  const now=Date.now();let fired=0;
  L.forEach(e=>{if(e.due&&!e.done&&!e.fired&&e.due<=now){e.fired=true;fired++;setTimeout(()=>notify(e),fired*900)}});
  if(fired)save();
}
function askPermission(){try{if("Notification" in window&&Notification.permission==="default")Notification.requestPermission()}catch(e){}}
/* ---------- styles ---------- */
(function(){const st=document.createElement("style");st.id="lf-css";st.textContent=`
#life-sheet{position:fixed;inset:0;z-index:15000;display:none;align-items:flex-end;justify-content:center;font-family:'Space Grotesk','Vazirmatn',system-ui,sans-serif;color:#F4EBDD}
#life-sheet.on{display:flex}
.lf-scrim{position:absolute;inset:0;background:rgba(4,3,2,.62);opacity:0;transition:opacity .35s}
#life-sheet.in .lf-scrim{opacity:1}
.lf-card{position:relative;width:100%;max-width:520px;height:min(88dvh,780px);display:flex;flex-direction:column;border-radius:28px 28px 0 0;background:linear-gradient(180deg,#17120C,#0E0B07);border:1px solid rgba(191,122,245,.2);border-bottom:0;box-shadow:0 -30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,236,190,.08);transform:translateY(100%);transition:transform .5s cubic-bezier(.3,1.15,.5,1);overflow:hidden}
#life-sheet.in .lf-card{transform:none}
.lf-card::before{content:'';position:absolute;inset:0;background:radial-gradient(90% 40% at 100% 0%,rgba(191,122,245,.14),transparent 70%);pointer-events:none}
.lf-head{position:relative;padding:8px 18px 10px;flex:none;touch-action:none}
.lf-grip{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,.18);margin:0 auto 12px}
.lf-top{display:flex;align-items:center;justify-content:space-between}
.lf-title{font:600 25px/1.1 Georgia,serif;margin:0}.lf-title small{display:block;font:500 11.5px 'Space Grotesk';color:rgba(244,235,221,.5);margin-top:4px;letter-spacing:.02em}
.lf-x{width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.07);color:inherit;display:grid;place-items:center;cursor:pointer}
.lf-x svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round}
.lf-srch{position:relative;margin-top:12px}
.lf-srch input{width:100%;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:inherit;padding:0 14px 0 40px;font:400 14.5px 'Space Grotesk','Vazirmatn';outline:none;transition:border-color .25s}
.lf-srch input:focus{border-color:rgba(191,122,245,.55)}
.lf-srch svg{position:absolute;left:13px;top:12px;width:18px;height:18px;stroke:rgba(244,235,221,.5);fill:none;stroke-width:2;stroke-linecap:round}
.lf-chips{display:flex;gap:7px;overflow-x:auto;padding:10px 18px 4px;flex:none;scrollbar-width:none}.lf-chips::-webkit-scrollbar{display:none}
.lf-chip{flex:none;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(244,235,221,.75);border-radius:99px;padding:7px 13px;font:500 12.5px 'Space Grotesk';cursor:pointer;transition:all .25s}
.lf-chip.on{background:rgba(191,122,245,.18);border-color:rgba(191,122,245,.6);color:#fff}
.lf-body{position:relative;flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px 16px 14px}
.lf-sec{font:600 10.5px 'Space Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,235,221,.42);margin:16px 4px 8px}
.lf-up{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.lf-up::-webkit-scrollbar{display:none}
.lf-upc{flex:none;width:178px;padding:13px 14px;border-radius:18px;background:linear-gradient(150deg,rgba(232,196,104,.18),rgba(232,196,104,.04));border:1px solid rgba(232,196,104,.3)}
.lf-upc small{font:600 10px 'Space Mono';letter-spacing:.08em;color:#E8C468;text-transform:uppercase}.lf-upc.od small{color:#ff8a7a}
.lf-upc div{margin-top:6px;font-size:13.5px;line-height:1.4}
.lf-it{position:relative;display:flex;gap:11px;padding:12px 12px;margin-bottom:8px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);animation:lfIn .45s cubic-bezier(.3,1.2,.5,1) both}
@keyframes lfIn{from{opacity:0;transform:translateY(8px)}}
.lf-it.done .lf-tx{opacity:.45;text-decoration:line-through}
.lf-dot{flex:none;width:9px;height:9px;border-radius:50%;margin-top:6px;background:var(--c);box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 18%,transparent)}
.lf-tx{flex:1;min-width:0;font-size:14px;line-height:1.5;word-break:break-word}
.lf-tx small{display:block;margin-top:3px;font:500 11px 'Space Grotesk';color:rgba(244,235,221,.45)}
.lf-tx small.od{color:#ff8a7a}.lf-tx small b{font-weight:500;color:var(--c)}
.lf-ac{display:flex;gap:2px;flex:none;align-items:flex-start}
.lf-ac button{width:30px;height:30px;border:0;border-radius:9px;background:none;color:rgba(244,235,221,.4);display:grid;place-items:center;cursor:pointer}
.lf-ac button:active{background:rgba(255,255,255,.08)}.lf-ac button.on{color:#E8C468}
.lf-ac svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.lf-empty{text-align:center;padding:44px 24px;color:rgba(244,235,221,.5);font-size:13.5px;line-height:1.7}
.lf-empty svg{width:46px;height:46px;stroke:#BF7AF5;fill:none;stroke-width:1.4;margin-bottom:10px;opacity:.8}
.lf-add{flex:none;padding:10px 14px calc(env(safe-area-inset-bottom) + 12px);border-top:1px solid rgba(255,255,255,.06);background:#0E0B07}
.lf-ar{display:flex;gap:8px}
.lf-ar input[type=text]{flex:1;min-width:0;height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:inherit;padding:0 14px;font:400 14.5px 'Space Grotesk','Vazirmatn';outline:none}
.lf-go{width:44px;height:44px;border:0;border-radius:14px;background:linear-gradient(135deg,#d9a3ff,#BF7AF5);color:#1a0b2a;display:grid;place-items:center;cursor:pointer;flex:none}
.lf-go svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.lf-opts{display:flex;gap:8px;margin-top:8px;align-items:center;overflow-x:auto;scrollbar-width:none}
.lf-opts select,.lf-opts input{height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:inherit;padding:0 10px;font:500 12.5px 'Space Grotesk';outline:none;color-scheme:dark}
.lf-ft{display:flex;justify-content:center;gap:18px;margin-top:10px}
.lf-ft button{border:0;background:none;color:rgba(244,235,221,.45);font:500 11.5px 'Space Grotesk';cursor:pointer;padding:4px}
.lf-bn{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top) + 10px);z-index:16000;max-width:480px;margin:0 auto;display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:20px;background:rgba(24,18,10,.92);-webkit-backdrop-filter:blur(30px) saturate(1.6);backdrop-filter:blur(30px) saturate(1.6);border:1px solid rgba(232,196,104,.4);box-shadow:0 18px 50px rgba(0,0,0,.6);color:#F4EBDD;font-family:'Space Grotesk','Vazirmatn';transform:translateY(-140%);transition:transform .55s cubic-bezier(.3,1.3,.5,1)}
.lf-bn.in{transform:none}
.lf-bn-i{width:38px;height:38px;border-radius:12px;background:rgba(232,196,104,.18);display:grid;place-items:center;flex:none}.lf-bn-i svg{width:20px;height:20px;stroke:#E8C468;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.lf-bn-t{flex:1;min-width:0;font-size:13.5px;line-height:1.35}.lf-bn-t small{display:block;font:600 10px 'Space Mono';letter-spacing:.1em;text-transform:uppercase;color:#E8C468;margin-bottom:2px}
.lf-bn button{border:0;border-radius:10px;padding:8px 11px;font:600 12px 'Space Grotesk';background:rgba(255,255,255,.1);color:inherit;cursor:pointer}.lf-bn button[data-d]{background:#E8C468;color:#1a1204}
@media (min-width:700px){#life-sheet{align-items:center}.lf-card{border-radius:28px;border-bottom:1px solid rgba(191,122,245,.2)}}
@media (prefers-reduced-motion:reduce){#life-sheet *,.lf-bn{transition-duration:.01ms!important;animation:none!important}}
`;document.head.appendChild(st)})();
/* ---------- UI ---------- */
const I={
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M12 17v5M9 3h6l-1 6 3 4H7l3-4z"/></svg>',
  del:'<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  ok:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  send:'<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  brain:'<svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
function build(){
  if(S.built)return;S.built=true;
  const el=document.createElement("div");el.id="life-sheet";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Memory");
  el.innerHTML=`<div class="lf-scrim" data-x></div><div class="lf-card" id="lf-card">
  <div class="lf-head" id="lf-head"><div class="lf-grip"></div>
    <div class="lf-top"><h2 class="lf-title">Memory<small id="lf-sub"></small></h2><button class="lf-x" data-x aria-label="Close">${I.x}</button></div>
    <div class="lf-srch">${I.search}<input id="lf-q" type="search" placeholder="Search memory…" autocomplete="off"></div></div>
  <div class="lf-chips" id="lf-chips"></div>
  <div class="lf-body" id="lf-body"></div>
  <div class="lf-add"><div class="lf-ar"><input type="text" id="lf-in" placeholder="Tell me something to remember…" maxlength="300" autocomplete="off"><button class="lf-go" id="lf-go" aria-label="Add">${I.send}</button></div>
    <div class="lf-opts"><select id="lf-k">${Object.keys(KINDS).map(k=>`<option value="${k}">${KINDS[k].n.replace(/s$/,"")}</option>`).join("")}</select><input type="datetime-local" id="lf-d" aria-label="Remind at"></div>
    <div class="lf-ft"><button data-a="export">Export</button><button data-a="notif">Enable notifications</button><button data-a="clear">Clear all</button></div></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
    const t=e.target;
    if(t.closest("[data-x]")){close();return}
    const ch=t.closest(".lf-chip");if(ch){S.f=ch.dataset.f;hap();paint();return}
    const a=t.closest("[data-a]");
    if(a){const k=a.dataset.a;
      if(k==="export"){const b=new Blob([JSON.stringify(L,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),l=document.createElement("a");l.href=u;l.download="phraortes-memory.json";l.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
      if(k==="notif"){askPermission();toast("Notifications work while the app is open or installed","success")}
      if(k==="clear"){if(a.dataset.c){L=[];save();paint();a.textContent="Clear all";delete a.dataset.c}else{a.dataset.c=1;a.textContent="Tap again to confirm";setTimeout(()=>{a.textContent="Clear all";delete a.dataset.c},3000)}}
      return}
    if(t.closest("#lf-go")){addFromUI();return}
    const it=t.closest(".lf-it"),btn=t.closest("[data-i]");
    if(it&&btn){const e2=L.find(x=>x.id===it.dataset.id);if(!e2)return;const k=btn.dataset.i;
      if(k==="pin"){e2.pin=!e2.pin}
      if(k==="done"){e2.done=!e2.done}
      if(k==="del"){L=L.filter(x=>x.id!==e2.id)}
      save();hap();paint(true)}
  });
  $("lf-q").addEventListener("input",e=>{S.q=e.target.value;paint(true)});
  $("lf-in").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addFromUI()}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.open)close()});
  const h=$("lf-head"),card=$("lf-card");let y0=0,dy=0,on=false;
  h.addEventListener("touchstart",e=>{if(e.target.closest("input,button"))return;on=true;y0=e.touches[0].clientY;dy=0;card.style.transition="none"},{passive:true});
  h.addEventListener("touchmove",e=>{if(!on)return;dy=Math.max(0,e.touches[0].clientY-y0);card.style.transform=`translateY(${dy}px)`},{passive:true});
  const end=()=>{if(!on)return;on=false;card.style.transition="";if(dy>110)close();else card.style.transform="";dy=0};
  h.addEventListener("touchend",end);h.addEventListener("touchcancel",end);
}
function addFromUI(){
  const i=$("lf-in"),v=i.value.trim();if(!v)return;
  const d=$("lf-d").value;let k=$("lf-k").value;
  const e=add({text:v,kind:k,due:d||null,src:"user"});
  if(e){if(d)askPermission();i.value="";$("lf-d").value="";hap("success");paint();const b=$("lf-body");b.scrollTop=0}
}
function paint(keep){
  const b=$("lf-body");if(!b)return;const y=b.scrollTop;
  const q=S.q.trim(),flt=S.f;
  let list=q?search(q,60):L.slice().sort((a,c)=>(c.pin-a.pin)||(c.ts-a.ts));
  if(flt!=="all")list=list.filter(e=>e.k===flt);
  $("lf-sub").textContent=L.length?`${L.length} remembered · stays on this device`:"Stays on this device";
  const counts={all:L.length};Object.keys(KINDS).forEach(k=>counts[k]=L.filter(e=>e.k===k).length);
  $("lf-chips").innerHTML=[["all","All"]].concat(Object.keys(KINDS).filter(k=>counts[k]).map(k=>[k,KINDS[k].n])).map(([k,n])=>`<button class="lf-chip${flt===k?" on":""}" data-f="${k}">${n}${counts[k]?` · ${counts[k]}`:""}</button>`).join("");
  let h="";
  if(!q&&flt==="all"){
    const up=L.filter(e=>e.due&&!e.done).sort((a,c)=>a.due-c.due).slice(0,8);
    if(up.length)h+=`<div class="lf-sec">Coming up</div><div class="lf-up">${up.map(e=>`<div class="lf-upc${e.due<Date.now()?" od":""}"><small>${esc(fmtDue(e.due))}</small><div>${esc(e.t)}</div></div>`).join("")}</div>`;
  }
  if(!list.length){
    h+=`<div class="lf-empty">${I.brain}<br>${q?"Nothing matches that.":"Nothing here yet.<br>Tell me things like <b>“remind me to call Sara tomorrow at 5”</b> or <b>“my budget for the trip is $800”</b> in any chat, or add one below."}</div>`;
  }else{
    let last="";
    list.forEach((e,i)=>{
      const g=e.pin?"Pinned":fmtDay(e.ts);
      if(!q&&g!==last){h+=`<div class="lf-sec">${esc(g)}</div>`;last=g}
      const K=KINDS[e.k]||KINDS.fact;
      h+=`<div class="lf-it${e.done?" done":""}" data-id="${e.id}" style="--c:${K.c};animation-delay:${Math.min(i,10)*28}ms"><span class="lf-dot"></span>
      <div class="lf-tx">${esc(e.t)}<small${e.due&&!e.done&&e.due<Date.now()?' class="od"':""}><b>${K.n.replace(/s$/,"")}</b>${e.due?" · ⏰ "+esc(fmtDue(e.due)):""}${q?" · "+esc(fmtDay(e.ts)):""}</small></div>
      <div class="lf-ac">${e.due?`<button data-i="done" aria-label="Done" class="${e.done?"on":""}">${I.ok}</button>`:""}<button data-i="pin" aria-label="Pin" class="${e.pin?"on":""}">${I.pin}</button><button data-i="del" aria-label="Delete">${I.del}</button></div></div>`;
    });
  }
  b.innerHTML=h;if(keep)b.scrollTop=y;
}
function open(){
  build();paint();S.q="";$("lf-q").value="";
  const el=$("life-sheet"),card=$("lf-card");card.style.transform="";card.style.transition="";
  el.classList.add("on");S.open=true;$("lf-body").scrollTop=0;
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("in")));
  document.body.classList.add("phr-recede");
}
function close(){
  const el=$("life-sheet");if(!el||!S.open)return;S.open=false;
  $("lf-card").style.transform="";$("lf-card").style.transition="";el.classList.remove("in");
  setTimeout(()=>{if(!S.open){el.classList.remove("on");document.body.classList.remove("phr-recede")}},420);
}
load();migrate();
setTimeout(tick,2500);setInterval(tick,30000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")tick()});
window.addEventListener("storage",e=>{if(e.key===KEY){load();if(S.open)paint(true)}});
window.LIFE={askPermission,add,search,promptFor,forget,open,close,tick,all:()=>L.slice(),brief,line,KINDS};
})();
