/* =====================================================================
   Phraortes — Background Tasks (tasks.js)
   Hand off a big job ("compare the top 5 laptops under $1000 and recommend one"):
   plan → work through each step with the assistant's tools → write the final deliverable → notify.
   • Runs inside the app while it is open (also while you chat or use other screens).
   • State is saved after every step; an interrupted task can be resumed from where it stopped.
   • Result opens as a normal chat with a saved Workspace file.
   Public API: window.PHR_TASKS = { open, close, start, list }
   ===================================================================== */
(function(){
"use strict";
const KEY="phraortes_tasks_v1",MAXT=20;
let T=[],S={open:false,built:false,running:null,exp:{},seen:{}};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hap=t=>{try{haptic(t||"light")}catch(e){}};
const toast=(m,t)=>{try{showToast(m,t||"success")}catch(e){}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function load(){try{T=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(T))T=[]}catch(e){T=[]}
  T.forEach(t=>{if(t.status==="running"||t.status==="planning"||t.status==="writing")t.status="interrupted"})}
function save(){try{localStorage.setItem(KEY,JSON.stringify(T.slice(0,MAXT)))}catch(e){try{T.forEach(t=>{(t.steps||[]).forEach(s=>{if(s.out&&s.out.length>1500)s.out=s.out.slice(0,1500)})});localStorage.setItem(KEY,JSON.stringify(T.slice(0,MAXT)))}catch(_){}}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ai=(m,tools)=>window.fetchAI(m,false,false,tools?{enableTools:true}:undefined);
const DEPTH={quick:{n:3,rev:false,label:"Quick"},standard:{n:5,rev:true,label:"Standard"},deep:{n:7,rev:true,label:"Deep"}};

/* ---------- engine ---------- */
async function idle(t){ // never compete with a live chat turn for the shared tool state
  while(true){if(t.cancel)throw new Error("cancel");const ui=$("ui");if(!ui||!ui.disabled)return;await sleep(1200)}
}
function parsePlan(txt,n){
  try{
    const m=/\{[\s\S]*\}/.exec(txt);if(m){const o=JSON.parse(m[0]);if(Array.isArray(o.steps)&&o.steps.length)return{title:String(o.title||"").slice(0,70),steps:o.steps.map(x=>typeof x==="string"?x:(x.t||x.step||x.title||"")).filter(Boolean).slice(0,n)}}
    const arr=/\[[\s\S]*\]/.exec(txt);if(arr){const a=JSON.parse(arr[0]);if(Array.isArray(a)&&a.length)return{title:"",steps:a.map(x=>typeof x==="string"?x:(x.t||x.step||"")).filter(Boolean).slice(0,n)}}
  }catch(e){}
  const ls=String(txt).split("\n").map(l=>l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/,"").trim()).filter(l=>l.length>8).slice(0,n);
  return{title:"",steps:ls};
}
async function runTask(t){
  if(S.running&&S.running!==t.id)return;S.running=t.id;t.cancel=false;
  const D=DEPTH[t.depth]||DEPTH.standard;
  try{
    if(!t.steps.length){
      t.status="planning";paint();save();await idle(t);
      const r=await ai([{role:"system",content:"You are a planning agent. Break the user's goal into "+D.n+" concrete, ordered work steps that an assistant with web search, page reading and a calculator can execute one by one (research, compare, compute, verify). Final step must be 'gather the findings'. Reply with ONLY JSON: {\"title\":\"short title in the goal's language\",\"steps\":[\"step 1\",\"step 2\"]} — each step one imperative sentence in the goal's language."},{role:"user",content:t.goal}]);
      const p=parsePlan(r,D.n);if(!p.steps.length)throw new Error("Couldn't plan this task");
      t.title=p.title||t.goal.slice(0,50);t.steps=p.steps.map(s=>({t:s,out:"",st:"todo"}));save();paint();
    }
    t.status="running";
    for(let i=0;i<t.steps.length;i++){
      const s=t.steps[i];if(s.st==="done")continue;
      await idle(t);t.cur=i;s.st="run";paint();save();
      const notes=t.steps.filter(x=>x.st==="done").map((x,k)=>"STEP "+(k+1)+" — "+x.t+"\n"+x.out).join("\n\n").slice(-7000);
      const sys={role:"system",content:"You are an autonomous work agent executing ONE step of a larger task. Today is "+new Date().toISOString().slice(0,10)+". Use your tools (web_search, read_url, run_javascript, get_current_datetime) whenever facts, prices, dates or calculations matter — never guess them. Report ONLY the findings for this step: specific names, numbers, dates and the URLs they came from. Be compact (max ~250 words). Do NOT write the final report."};
      const usr={role:"user",content:"OVERALL GOAL: "+t.goal+"\n\nPLAN:\n"+t.steps.map((x,k)=>(k+1)+". "+x.t).join("\n")+(notes?"\n\nFINDINGS SO FAR:\n"+notes:"")+"\n\nNOW DO STEP "+(i+1)+": "+s.t};
      let out="",err=null;
      for(let a=0;a<2&&!out;a++){try{out=String(await ai([sys,usr],true)||"").trim()}catch(e){err=e;if(String(e&&e.message)==="phraortes_free_limit_reached")throw e;await sleep(1500)}}
      if(t.cancel)throw new Error("cancel");
      if(out){s.out=out.slice(0,3500);s.st="done"}else{s.st="fail";s.out=""}
      paint();save();
    }
    const done=t.steps.filter(x=>x.st==="done");
    if(done.length<Math.ceil(t.steps.length/2))throw new Error("Too many steps failed — check your connection and resume");
    t.status="writing";paint();save();await idle(t);
    const notes=done.map((x,k)=>"## "+x.t+"\n"+x.out).join("\n\n");
    let res=String(await ai([{role:"system",content:"You write the final deliverable of a completed work task. Write in the language of the goal. Structure in clear markdown: a 2–3 sentence answer/recommendation first, then well-organised sections (use tables for comparisons), concrete numbers, and a short 'Sources' list with the URLs present in the notes. Use ONLY facts present in the notes; where the notes are thin or conflicting, say so plainly. No filler, no mention of steps or agents."},{role:"user",content:"GOAL: "+t.goal+"\n\nNOTES:\n"+notes.slice(0,14000)}])||"").trim();
    if(D.rev&&res){await idle(t);try{const fixed=String(await ai([{role:"system",content:"You are a strict reviewer. Compare the DRAFT with the NOTES. Remove or correct any claim the notes do not support, fix arithmetic, fill obvious gaps only from the notes, keep the structure and language. Return ONLY the corrected final markdown."},{role:"user",content:"NOTES:\n"+notes.slice(0,9000)+"\n\nDRAFT:\n"+res}])||"").trim();if(fixed.length>res.length*.5)res=fixed}catch(e){}}
    if(!res)throw new Error("Couldn't write the result");
    t.result=res.slice(0,60000);t.status="done";t.end=Date.now();t.err="";save();paint();finished(t);
  }catch(e){
    if(String(e&&e.message)==="cancel"){t.status="cancelled"}
    else{t.status="failed";t.err=String(e&&e.message||"Failed").slice(0,140)}
    t.steps.forEach(s=>{if(s.st==="run")s.st="todo"});save();paint();
  }finally{S.running=null;next()}
}
function next(){const q=T.filter(t=>t.status==="queued").pop();if(q)runTask(q)}
function start(goal,depth){
  goal=String(goal||"").trim();if(goal.length<6){toast("Describe the task a bit more","error");return null}
  const t={id:uid(),goal:goal.slice(0,600),depth:DEPTH[depth]?depth:"standard",title:"",steps:[],status:"queued",ts:Date.now(),result:"",err:""};
  T.unshift(t);save();hap("success");
  try{if("Notification" in window&&Notification.permission==="default")Notification.requestPermission()}catch(e){}
  if(!S.running)runTask(t);paint();return t;
}
function finished(t){
  hap("success");
  try{if("Notification" in window&&Notification.permission==="granted"&&document.visibilityState!=="visible")new Notification("Phraortes — task finished",{body:t.title||t.goal.slice(0,80)})}catch(e){}
  const b=document.createElement("div");b.className="tk-bn";
  b.innerHTML=`<div class="tk-bi"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></div><div class="tk-bt"><small>Task finished</small>${esc(t.title||t.goal.slice(0,70))}</div><button>Open</button>`;
  b.querySelector("button").onclick=()=>{openAsChat(t.id);b.remove()};
  document.body.appendChild(b);requestAnimationFrame(()=>requestAnimationFrame(()=>b.classList.add("in")));
  setTimeout(()=>{if(b.isConnected){b.classList.remove("in");setTimeout(()=>b.remove(),400)}},12000);
}
function openAsChat(id){
  const t=T.find(x=>x.id===id);if(!t||!t.result)return;
  try{
    const cid=Date.now(),slug=(t.title||"task").replace(/[^\w؀-ۿ]+/g,"-").slice(0,40)||"task";
    chats.unshift({id:cid,name:(t.title||"Task").slice(0,22),msgs:[{u:esc(t.goal).replace(/\n/g,"<br>"),uText:t.goal,a:renderMD(t.result),aRaw:t.result,ts:cid}],pinned:false,files:[{id:cid+"-t",type:"doc",name:slug+".md",content:t.result,extra:"",ts:cid}]});
    curId=cid;save();loadChat(cid);close();
  }catch(e){toast("Couldn't open the result","error")}
}
/* ---------- UI ---------- */
(function(){const st=document.createElement("style");st.id="tk-css";st.textContent=`
#tasks-sheet{position:fixed;inset:0;z-index:15000;display:none;align-items:flex-end;justify-content:center;font-family:'Space Grotesk','Vazirmatn',system-ui,sans-serif;color:#F4EBDD}
#tasks-sheet.on{display:flex}.tk-scrim{position:absolute;inset:0;background:rgba(4,3,2,.62);opacity:0;transition:opacity .35s}#tasks-sheet.in .tk-scrim{opacity:1}
.tk-card{position:relative;width:100%;max-width:520px;height:min(90dvh,800px);display:flex;flex-direction:column;border-radius:28px 28px 0 0;background:linear-gradient(180deg,#14130F,#0B0A07);border:1px solid rgba(63,208,201,.22);border-bottom:0;box-shadow:0 -30px 80px rgba(0,0,0,.6);transform:translateY(100%);transition:transform .5s cubic-bezier(.3,1.15,.5,1);overflow:hidden}
#tasks-sheet.in .tk-card{transform:none}.tk-card::before{content:'';position:absolute;inset:0;background:radial-gradient(90% 38% at 0% 0%,rgba(63,208,201,.14),transparent 70%);pointer-events:none}
.tk-head{position:relative;padding:8px 18px 8px;flex:none;touch-action:none}.tk-grip{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,.18);margin:0 auto 12px}
.tk-top{display:flex;align-items:center;justify-content:space-between}.tk-title{font:600 25px/1.1 Georgia,serif;margin:0}.tk-title small{display:block;font:500 11.5px 'Space Grotesk';color:rgba(244,235,221,.5);margin-top:4px}
.tk-x{width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.07);color:inherit;display:grid;place-items:center;cursor:pointer}.tk-x svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round}
.tk-body{position:relative;flex:1;overflow-y:auto;overscroll-behavior:contain;padding:8px 16px 16px}
.tk-new{padding:14px;border-radius:20px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}
.tk-new textarea{width:100%;min-height:78px;resize:none;border:0;outline:none;background:none;color:inherit;font:400 15px/1.5 'Space Grotesk','Vazirmatn';padding:0}
.tk-chips{display:flex;gap:6px;overflow-x:auto;margin:10px 0 2px;scrollbar-width:none}.tk-chips::-webkit-scrollbar{display:none}
.tk-chips button{flex:none;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(244,235,221,.75);border-radius:99px;padding:6px 12px;font:500 12px 'Space Grotesk','Vazirmatn';cursor:pointer}
.tk-row{display:flex;align-items:center;gap:8px;margin-top:10px}.tk-seg{display:flex;padding:3px;border-radius:12px;background:rgba(255,255,255,.06);flex:1}.tk-seg button{flex:1;border:0;background:none;color:rgba(244,235,221,.6);padding:8px 0;border-radius:9px;font:500 12px 'Space Grotesk';cursor:pointer;transition:all .3s cubic-bezier(.3,1.3,.5,1)}.tk-seg button.on{background:rgba(63,208,201,.18);color:#fff;box-shadow:inset 0 0 0 1px rgba(63,208,201,.45)}
.tk-go{height:42px;padding:0 20px;border:0;border-radius:13px;background:linear-gradient(135deg,#7FEAE4,#3FD0C9 60%,#22A9A3);color:#04211F;font:600 14px 'Space Grotesk';cursor:pointer;flex:none}.tk-go:active{transform:scale(.96)}
.tk-h{font:600 10.5px 'Space Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,235,221,.42);margin:18px 4px 8px}
.tk-it{margin-bottom:10px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);overflow:hidden}.tk-it.fresh{animation:tkIn .45s cubic-bezier(.3,1.2,.5,1) both}@keyframes tkIn{from{opacity:0;transform:translateY(8px)}}
.tk-it.live{border-color:rgba(63,208,201,.5);box-shadow:0 0 0 1px rgba(63,208,201,.15),0 12px 40px -16px rgba(63,208,201,.4)}
.tk-ih{display:flex;gap:10px;align-items:flex-start;padding:13px 14px;cursor:pointer}.tk-in{flex:1;min-width:0}.tk-in b{display:block;font-size:14.5px;font-weight:600;line-height:1.35}.tk-in small{font-size:11.5px;color:rgba(244,235,221,.5)}
.tk-pill{flex:none;font:600 9.5px 'Space Mono',monospace;letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:99px;background:rgba(255,255,255,.08);color:rgba(244,235,221,.75)}
.tk-pill.run{background:rgba(63,208,201,.18);color:#7FEAE4}.tk-pill.done{background:rgba(63,224,160,.16);color:#6FE9B8}.tk-pill.fail,.tk-pill.cancelled{background:rgba(255,107,107,.14);color:#ff9a90}.tk-pill.interrupted{background:rgba(232,196,104,.15);color:#E8C468}
.tk-pg{height:3px;background:rgba(255,255,255,.07);position:relative;overflow:hidden}.tk-pg i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#3FD0C9,#7FEAE4);transition:width .8s cubic-bezier(.3,1,.4,1)}.tk-it.live .tk-pg i::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:tkSh 1.4s linear infinite}@keyframes tkSh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.tk-st{padding:6px 14px 4px}.tk-s{display:flex;gap:10px;padding:6px 0;font-size:12.5px;line-height:1.45;color:rgba(244,235,221,.72)}.tk-s i{flex:none;width:16px;height:16px;border-radius:50%;margin-top:1px;border:1.5px solid rgba(255,255,255,.25);display:grid;place-items:center}
.tk-s.done i{background:#3FE0A0;border-color:#3FE0A0}.tk-s.done i::after{content:'';width:4px;height:7px;border:solid #06281a;border-width:0 1.8px 1.8px 0;transform:rotate(40deg) translate(-1px,-1px)}.tk-s.run i{border-color:#3FD0C9;border-top-color:transparent;animation:tkSp .8s linear infinite}.tk-s.fail i{border-color:#ff7b70}.tk-s.run{color:#fff}@keyframes tkSp{to{transform:rotate(360deg)}}
.tk-ac{display:flex;gap:7px;padding:8px 14px 13px;flex-wrap:wrap}.tk-ac button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:rgba(255,255,255,.9);border-radius:11px;padding:8px 13px;font:500 12.5px 'Space Grotesk';cursor:pointer}.tk-ac button.p{background:linear-gradient(135deg,#7FEAE4,#3FD0C9);color:#04211F;border-color:transparent;font-weight:600}
.tk-em{text-align:center;padding:30px 20px;color:rgba(244,235,221,.5);font-size:13px;line-height:1.7}
.tk-bn{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top) + 10px);z-index:16000;max-width:480px;margin:0 auto;display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:20px;background:rgba(10,24,23,.94);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);border:1px solid rgba(63,208,201,.5);box-shadow:0 18px 50px rgba(0,0,0,.6);color:#F4EBDD;font-family:'Space Grotesk','Vazirmatn';transform:translateY(-140%);transition:transform .55s cubic-bezier(.3,1.3,.5,1)}.tk-bn.in{transform:none}
.tk-bi{width:38px;height:38px;border-radius:12px;background:rgba(63,208,201,.2);display:grid;place-items:center;flex:none}.tk-bi svg{width:20px;height:20px;stroke:#7FEAE4;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}.tk-bt{flex:1;min-width:0;font-size:13.5px;line-height:1.35}.tk-bt small{display:block;font:600 10px 'Space Mono';letter-spacing:.1em;text-transform:uppercase;color:#7FEAE4;margin-bottom:2px}.tk-bn button{border:0;border-radius:10px;padding:8px 13px;font:600 12px 'Space Grotesk';background:#3FD0C9;color:#04211F;cursor:pointer}
@media (min-width:700px){#tasks-sheet{align-items:center}.tk-card{border-radius:28px;border-bottom:1px solid rgba(63,208,201,.22)}}@media (prefers-reduced-motion:reduce){#tasks-sheet *,.tk-bn{transition-duration:.01ms!important;animation:none!important}}
`;document.head.appendChild(st)})();
const EX=["Compare the best laptops under $1000 and recommend one","Plan a 5-day Istanbul trip with a daily budget","Research how to start importing from China, step by step","تحقیق کن بهترین کارت گرافیک برای بازی کدام است و مقایسه کن"];
function build(){
  if(S.built)return;S.built=true;
  const el=document.createElement("div");el.id="tasks-sheet";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Tasks");
  el.innerHTML=`<div class="tk-scrim" data-x></div><div class="tk-card" id="tk-card"><div class="tk-head" id="tk-head"><div class="tk-grip"></div><div class="tk-top"><h2 class="tk-title">Tasks<small>Hand it off — it keeps working while you do other things</small></h2><button class="tk-x" data-x aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>
  <div class="tk-body" id="tk-body"><div class="tk-new"><textarea id="tk-in" placeholder="What should I work on? Be specific about what you want at the end…" maxlength="600"></textarea><div class="tk-chips">${EX.map(x=>`<button data-ex="${esc(x)}">${esc(x.length>34?x.slice(0,33)+"…":x)}</button>`).join("")}</div>
  <div class="tk-row"><div class="tk-seg" id="tk-seg">${Object.keys(DEPTH).map(k=>`<button data-dp="${k}" class="${k==="standard"?"on":""}">${DEPTH[k].label}</button>`).join("")}</div><button class="tk-go" id="tk-go">Start</button></div></div><div id="tk-list"></div></div></div>`;
  document.body.appendChild(el);
  let depth="standard";
  el.addEventListener("click",e=>{
    const t=e.target;
    if(t.closest("[data-x]")){close();return}
    const ex=t.closest("[data-ex]");if(ex){$("tk-in").value=ex.dataset.ex;$("tk-in").focus();hap();return}
    const dp=t.closest("[data-dp]");if(dp){depth=dp.dataset.dp;$("tk-seg").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b===dp));hap();return}
    if(t.closest("#tk-go")){const x=start($("tk-in").value,depth);if(x){$("tk-in").value=""}return}
    const a=t.closest("[data-a]");const it=t.closest(".tk-it");
    if(a&&it){const id=it.dataset.id,k=a.dataset.a,task=T.find(x=>x.id===id);if(!task)return;
      if(k==="open")openAsChat(id);
      if(k==="copy"){try{navigator.clipboard.writeText(task.result);toast("Copied")}catch(_){}}
      if(k==="cancel"){task.cancel=true;if(task.status==="queued"){task.status="cancelled"}paint()}
      if(k==="resume"){task.status="queued";task.err="";task.cancel=false;if(!S.running)runTask(task);paint()}
      if(k==="del"){T=T.filter(x=>x.id!==id);save();paint()}
      hap();return}
    if(it&&t.closest(".tk-ih")){const id=it.dataset.id;S.exp[id]=!S.exp[id];paint()}
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.open)close()});
  const h=$("tk-head"),card=$("tk-card");let y0=0,dy=0,on=false;
  h.addEventListener("touchstart",e=>{if(e.target.closest("button"))return;on=true;y0=e.touches[0].clientY;dy=0;card.style.transition="none"},{passive:true});
  h.addEventListener("touchmove",e=>{if(!on)return;dy=Math.max(0,e.touches[0].clientY-y0);card.style.transform=`translateY(${dy}px)`},{passive:true});
  const end=()=>{if(!on)return;on=false;card.style.transition="";if(dy>110)close();else card.style.transform="";dy=0};h.addEventListener("touchend",end);h.addEventListener("touchcancel",end);
}
const LBL={queued:"Queued",planning:"Planning",running:"Working",writing:"Writing",done:"Done",failed:"Failed",cancelled:"Cancelled",interrupted:"Paused"};
function pct(t){if(t.status==="done")return 100;if(!t.steps.length)return t.status==="planning"?6:2;const d=t.steps.filter(s=>s.st==="done"||s.st==="fail").length;return Math.round(8+d/t.steps.length*(t.status==="writing"?88:80))}
function ago(ts){const m=Math.round((Date.now()-ts)/60000);return m<1?"just now":m<60?m+" min ago":m<1440?Math.round(m/60)+" h ago":Math.round(m/1440)+" d ago"}
function paint(){
  const l=$("tk-list");if(!l)return;
  if(!T.length){l.innerHTML=`<div class="tk-em">No tasks yet.<br>Good ones: comparisons, research, plans, “find the best option and explain why”.</div>`;return}
  const open=S.exp;
  l.innerHTML=`<div class="tk-h">Your tasks</div>`+T.map((t,i)=>{
    const live=["planning","running","writing"].includes(t.status),ex=open[t.id]===undefined?live:open[t.id],cls=live?"run":t.status;
    const cur=t.steps[t.cur||0];
    const sub=live?(t.status==="planning"?"Planning the work…":t.status==="writing"?"Writing the final result…":cur?("Step "+((t.cur||0)+1)+" of "+t.steps.length+" · "+cur.t.slice(0,50)):"Working…"):t.status==="failed"?esc(t.err):ago(t.ts);
    const fresh=!S.seen[t.id];S.seen[t.id]=1;
    return `<div class="tk-it${live?" live":""}${fresh?" fresh":""}" data-id="${t.id}" style="animation-delay:${Math.min(i,6)*35}ms"><div class="tk-ih"><div class="tk-in"><b>${esc(t.title||t.goal.slice(0,60))}</b><small>${live?esc(sub):sub}</small></div><span class="tk-pill ${cls}">${LBL[t.status]||t.status}</span></div>
    ${t.status!=="queued"?`<div class="tk-pg"><i style="width:${pct(t)}%"></i></div>`:""}
    ${ex&&t.steps.length?`<div class="tk-st">${t.steps.map(s=>`<div class="tk-s ${s.st}"><i></i><span>${esc(s.t)}</span></div>`).join("")}</div>`:""}
    <div class="tk-ac">${t.status==="done"?`<button class="p" data-a="open">Open result</button><button data-a="copy">Copy</button>`:""}${live||t.status==="queued"?`<button data-a="cancel">Cancel</button>`:""}${t.status==="interrupted"||t.status==="failed"||t.status==="cancelled"?`<button class="p" data-a="resume">${t.steps.some(s=>s.st==="done")?"Resume":"Retry"}</button>`:""}${!live?`<button data-a="del">Delete</button>`:""}</div></div>`;
  }).join("");
}
function open(){build();paint();const el=$("tasks-sheet"),c=$("tk-card");c.style.transform="";c.style.transition="";el.classList.add("on");S.open=true;requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("in")));document.body.classList.add("phr-recede")}
function close(){const el=$("tasks-sheet");if(!el||!S.open)return;S.open=false;$("tk-card").style.transform="";$("tk-card").style.transition="";el.classList.remove("in");setTimeout(()=>{if(!S.open){el.classList.remove("on");document.body.classList.remove("phr-recede")}},420)}
load();
setInterval(()=>{if(S.open&&S.running)paint()},4000);
window.PHR_TASKS={open,close,start,list:()=>T.slice()};
})();
