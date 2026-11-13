/* Phraortes Agent — lets the AI (and voice) operate the app itself.
   Public: window.PHR_AGENT = { do(action,args), prompt(text), voice(text), state(), ids } */
(function(){
"use strict";
var G=function(n){try{return (0,eval)(n)}catch(e){return undefined}};          // read a global lexical binding by name
var $=function(i){return document.getElementById(i)};
var cls=function(id,c){var e=$(id);return !!(e&&e.classList.contains(c))};
var shown=function(id){var e=$(id);if(!e)return false;var c=getComputedStyle(e);return c.display!=="none"&&c.visibility!=="hidden"&&e.getBoundingClientRect().width>0};
var fn=function(n){var f=window[n];if(typeof f==="function")return f;f=G(n);return typeof f==="function"?f:null};
var call=function(n){var f=fn(n);if(!f)throw new Error(n+" unavailable");return f.apply(null,[].slice.call(arguments,1))};
var isFa=function(){try{return !!G("auraFa")()}catch(e){return /[؀-ۿ]/.test((G("uiInput")||{}).value||"")}};
// ── panels: id, label, aliases, isOpen, open, close ──
var P=[
{id:"tasks",en:"Tasks",fa:"تسک‌ها",kw:["tasks","task list","background tasks","تسک","وظایف"],is:function(){return cls("tasks-sheet","in")},open:function(){PHR_TASKS.open()},close:function(){PHR_TASKS.close()}},
{id:"memory",en:"Memory",fa:"حافظه",kw:["memory","memories","reminders","حافظه","یادآور"],is:function(){return cls("life-sheet","in")},open:function(){LIFE.open()},close:function(){LIFE.close()}},
{id:"plans",en:"Plans",fa:"پلن‌ها",kw:["plans","pricing","upgrade","subscription","پلن","برنامه","قیمت","اشتراک","ارتقا"],is:function(){return cls("plans-sheet","in")},open:function(a){PHR_PLANS.open(a&&a.plan)},close:function(){PHR_PLANS.close()}},
{id:"files",en:"Files",fa:"فایل‌ها",kw:["files","workspace","فایل"],is:function(){return cls("workspace-panel","show")},open:function(){call("openWorkspace","files")},close:function(){call("closeWorkspace")}},
{id:"canvas",en:"Canvas",fa:"بوم",kw:["canvas","editor","بوم","کنواس"],is:function(){return cls("workspace-panel","show")},open:function(){call("openWorkspace","canvas")},close:function(){call("closeWorkspace")}},
{id:"templates",en:"Templates",fa:"قالب‌ها",kw:["templates","prompt templates","قالب"],is:function(){return cls("templates-panel","show")},open:function(){call("openTemplatesPanel")},close:function(){call("closeTemplatesPanel")}},
{id:"pomodoro",en:"Pomodoro",fa:"پومودورو",kw:["pomodoro","focus timer","timer","پومودورو","تایمر"],is:function(){return shown("pomodoro-modal")},open:function(){call("openPomodoro")},close:function(){call("closePomodoro")}},
{id:"exam",en:"Exam mode",fa:"حالت آزمون",kw:["exam","exam mode","آزمون","امتحان"],is:function(){return shown("exam-modal")},open:function(){call("openExam")},close:function(){call("closeExam",true)}},
{id:"daily",en:"Daily quiz",fa:"کوییز روزانه",kw:["daily quiz","daily","کوییز روزانه","روزانه"],is:function(){return false},open:function(){call("openDaily")},close:null},
{id:"lab",en:"Lab",fa:"آزمایشگاه",kw:["lab","آزمایشگاه"],is:function(){return false},open:function(){call("openLab")},close:null},
{id:"together",en:"Study together",fa:"مطالعه با هم",kw:["together","study together","با هم"],is:function(){return false},open:function(){call("openTogether")},close:null},
{id:"constellation",en:"Chat map",fa:"نقشه چت‌ها",kw:["constellation","chat map","galaxy","صورت فلکی","نقشه"],is:function(){return cls("constellation-view","show")},open:function(){call("openConstellation")},close:function(){call("closeConstellation")}},
{id:"whatsnew",en:"What's new",fa:"تازه‌ها",kw:["what's new","whats new","updates","تازه","جدیدها"],is:function(){return cls("whats-new-overlay","show")},open:function(){call("openWhatsNew")},close:function(){call("closeWhatsNew")}},
{id:"account",en:"Account & settings",fa:"حساب و تنظیمات",kw:["account","settings","profile","تنظیمات","حساب","پروفایل"],is:function(){return cls("account-page","show")||cls("account-page","active")||cls("account-page","open")},open:function(){call("openAccountPage")},close:function(){call("closeAccountPage")}},
{id:"personas",en:"Personas",fa:"شخصیت‌ها",kw:["personas","characters","شخصیت"],is:function(){return cls("persona-manager","show")},open:function(){call("openPersonaManager")},close:function(){call("closePersonaManager")}},
{id:"pinned",en:"Pinned messages",fa:"پیام‌های پین‌شده",kw:["pinned","pins","پین"],is:function(){return cls("pinned-msgs-overlay","show")},open:function(){call("openPinnedMsgsPanel")},close:function(){call("closePinnedMsgsPanel")}},
{id:"search",en:"Search in chat",fa:"جستجو در چت",kw:["search","find in chat","جستجو"],is:function(){return cls("chat-search-bar","show")},open:function(a){call("openChatSearch");if(a&&a.query){var i=$("chat-search-input");if(i){i.value=a.query;call("performChatSearch",a.query)}}},close:function(){call("closeChatSearch")}},
{id:"sidebar",en:"Chat history",fa:"تاریخچه",kw:["sidebar","history","chat history","chats","تاریخچه","منو","سایدبار"],is:function(){return cls("sidebar","active")},open:function(){if(!cls("sidebar","active"))call("toggleS")},close:function(){if(cls("sidebar","active"))call("toggleS")}}
];
var PM={};P.forEach(function(p){PM[p.id]=p});
var openPanels=function(){return P.filter(function(p){return p.is()})};
// ── Aura docking: shrink the call into a pill so panels are visible ──
var D={on:false,pill:null};
function css(){if($("ag-css"))return;var s=document.createElement("style");s.id="ag-css";s.textContent=
"#aura-screen.ag-dock{opacity:0!important;pointer-events:none!important;transform:translateY(30px)}"+
"#ag-pill{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translate(-50%,-80px);z-index:60000;display:flex;align-items:center;gap:10px;padding:7px 8px 7px 12px;border-radius:99px;background:rgba(14,12,9,.9);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid rgba(232,196,104,.4);box-shadow:0 10px 36px rgba(0,0,0,.6);color:#f3eee4;font:600 13px 'Space Grotesk','Vazirmatn',sans-serif;transition:transform .5s cubic-bezier(.3,1.35,.5,1);cursor:pointer;-webkit-tap-highlight-color:transparent}"+
"#ag-pill.on{transform:translate(-50%,0)}#ag-pill{white-space:nowrap}#ag-pill i{flex:none;width:9px;height:9px;border-radius:50%;background:var(--ag,#E8C468);box-shadow:0 0 12px var(--ag,#E8C468);animation:agp 1.6s ease-in-out infinite}"+
"@keyframes agp{50%{transform:scale(1.5);opacity:.6}}#ag-pill b{font-weight:700}#ag-pill span{color:rgba(243,238,228,.6);font-weight:500}"+
"#ag-pill button{width:28px;height:28px;border-radius:50%;border:0;background:#e5372d;color:#fff;cursor:pointer;display:grid;place-items:center}"+
"@media(prefers-reduced-motion:reduce){#ag-pill{transition:none}#ag-pill i{animation:none}}";document.head.appendChild(s)}
function dock(){
 if(!window.__auraActive||D.on)return;css();var sc=$("aura-screen");if(!sc)return;D.on=true;sc.classList.add("ag-dock");document.body.style.overflow="";
 if(!D.pill){var p=document.createElement("div");p.id="ag-pill";p.innerHTML='<i></i><b></b><span></span><button type="button" aria-label="End call"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>';
  p.addEventListener("click",function(e){if(e.target.closest("button")){undock();call("closeAura");return}closeAllPanels();undock()});document.body.appendChild(p);D.pill=p}
 try{var nm=$("au-name");D.pill.querySelector("b").textContent=nm?nm.textContent:"Aura";var sw=document.querySelector("#au-personas .au-chip.on");if(sw)D.pill.style.setProperty("--ag",getComputedStyle(sw).getPropertyValue("--d")||"#E8C468")}catch(e){}
 D.pill.querySelector("span").textContent=isFa()?"· لمس کن تا برگردی":"· tap to return";
 requestAnimationFrame(function(){D.pill.classList.add("on")})}
function undock(){if(!D.on)return;D.on=false;var sc=$("aura-screen");if(sc){sc.classList.remove("ag-dock");if(window.__auraActive)document.body.style.overflow="hidden"}if(D.pill)D.pill.classList.remove("on")}
document.addEventListener("click",function(){},true);
// leave dock automatically when the call ends
setInterval(function(){if(D.on&&!window.__auraActive){D.on=false;if(D.pill)D.pill.classList.remove("on");var sc=$("aura-screen");if(sc)sc.classList.remove("ag-dock")}},800);
function closeAllPanels(){
 var op=openPanels(),n=0,done={};
 op.forEach(function(p){var key=p.close&&String(p.close);if(done[key])return;done[key]=1;try{p.close&&p.close();n++}catch(e){}});
 try{fn("closeAllDropMenus")&&fn("closeAllDropMenus")()}catch(e){}
 return n}
// ── chats ──
function chats(){return G("chats")||[]}
function findChat(q){
 q=String(q||"").toLowerCase().trim();var C=chats();if(!C.length)return null;
 if(/^(last|previous|prev|قبلی|آخرین)$/.test(q)){return C[1]||C[0]}
 var toks=q.split(/\s+/).filter(function(t){return t.length>1}),best=null,bs=0;
 C.forEach(function(c){var n=String(c.name||"").toLowerCase(),sc=0;if(n===q)sc=100;else if(n.indexOf(q)>=0)sc=50;else toks.forEach(function(t){if(n.indexOf(t)>=0)sc+=10});
  if(!sc&&toks.length){(c.msgs||[]).slice(-12).forEach(function(m){var tx=String(m.content||m.text||"").toLowerCase();toks.forEach(function(t){if(tx.indexOf(t)>=0)sc+=1})})}
  if(sc>bs){bs=sc;best=c}});return best}
function cur(){var id=G("curId"),C=chats();for(var i=0;i<C.length;i++)if(C[i].id==id)return C[i];return null}
// ── actions ──
var A={};
A.help=function(){return "Panels (action open_<name>/close_<name>): "+P.map(function(p){return p.id}).join(", ")+". Others: new_chat, switch_chat{query}, list_chats, rename_chat{name}, pin_chat, delete_chat{query}, theme{mode: dark|light|toggle}, accent{color: auto|gold|emerald|sky|violet|rose|orange}, core{name: prime|intellect|apex|sovereign}, persona{name}, aura_persona{name: nova|atlas|sage|spark|coach}, aura_mode{mode: tutor|quick|quiz|free|interview}, analyze_data, build_app, solve_photo, prefill{text}, close_all, state."};
P.forEach(function(p){
 A["open_"+p.id]=function(a){p.open(a||{});return "Opened "+p.en+"."};
 if(p.close)A["close_"+p.id]=function(){p.close();return "Closed "+p.en+"."};
});
A.close_all=function(){var n=closeAllPanels();return n?"Closed "+n+" panel(s).":"Nothing was open."};
A.new_chat=function(){call("newChat");return "Started a new chat."};
A.list_chats=function(){var C=chats().slice(0,15);return C.length?C.map(function(c,i){return (i+1)+". "+c.name+" ("+((c.msgs||[]).length)+" msgs)"+(c.pinned?" ⭐":"")}).join("\n"):"No chats yet."};
A.switch_chat=function(a){var c=findChat(a&&a.query);if(!c)return "No chat matches \""+(a&&a.query)+"\". Use list_chats.";(0,eval)("curId="+JSON.stringify(c.id));call("loadChat",c.id);if(cls("sidebar","active"))call("toggleS");return "Opened chat: "+c.name};
A.rename_chat=function(a){var c=cur(),n=String(a&&a.name||"").trim().slice(0,60);if(!c||!n)return "Need a name.";c.name=n;call("save");call("renderH");return "Renamed to: "+n};
A.pin_chat=function(a){var c=a&&a.query?findChat(a.query):cur();if(!c)return "No such chat.";call("togglePinSession",c.id);return (c.pinned?"Pinned: ":"Unpinned: ")+c.name};
A.delete_chat=function(a){var c=a&&a.query?findChat(a.query):cur();if(!c)return "No such chat.";
 if(!window.confirm((isFa()?"این چت حذف شود؟\n":"Delete this chat?\n")+c.name))return "The user declined, so nothing was deleted.";
 var C=chats(),i=C.indexOf(c);C.splice(i,1);call("save");if(String(G("curId"))===String(c.id)){if(C.length){(0,eval)("curId="+JSON.stringify(C[0].id));call("loadChat",C[0].id)}else call("newChat")}call("renderH");return "Deleted: "+c.name};
A.theme=function(a){var m=String(a&&a.mode||"toggle").toLowerCase(),t=$("theme-toggle"),light=document.body.classList.contains("light-theme");if(!t)return "Theme control missing.";var want=m==="light"?true:m==="dark"?false:!light;t.checked=want;call("toggleTheme");return "Theme: "+(want?"light":"dark")};
A.accent=function(a){var c=String(a&&a.color||"auto").toLowerCase();call("setAccent",c);return "Accent: "+c};
A.core=function(a){var n=String(a&&a.name||"").toLowerCase(),m={prime:"2.4",intellect:"2.5",apex:"2.6",sovereign:"2.7"}[n]||(/^2\.[4-7]$/.test(n)?n:null);if(!m)return "Unknown core. Use prime, intellect, apex or sovereign.";call("selectModel",m);return "Core requested: "+n+" (the app shows a plan prompt if it is locked)."};
A.persona=function(a){var n=String(a&&a.name||"").toLowerCase(),L=G("customPersonas")||[],p=L.filter(function(x){return String(x.name||"").toLowerCase().indexOf(n)>=0})[0];if(!p)return "No persona called \""+n+"\". Available: "+(L.map(function(x){return x.name}).join(", ")||"none");call("activatePersona",p.id);return "Persona: "+p.name};
A.aura_persona=function(a){var n=String(a&&a.name||"").toLowerCase(),L=G("AURA_PERSONAS")||[];var p=L.filter(function(x){return x.id===n||x.name.toLowerCase()===n})[0];if(!p)return "Unknown Aura persona.";(0,eval)("auraPid="+JSON.stringify(p.id));try{localStorage.setItem("phraortes_aura_persona",p.id)}catch(e){}try{call("auraTheme");call("auraBuildChips")}catch(e){}return "Aura persona: "+p.name};
A.aura_mode=function(a){var n=String(a&&a.mode||"").toLowerCase(),L=G("AURA_MODES")||[];var m=L.filter(function(x){return x.id===n})[0];if(!m)return "Unknown Aura mode.";(0,eval)("auraMode="+JSON.stringify(m.id));try{localStorage.setItem("phraortes_aura_mode",m.id);call("auraBuildChips")}catch(e){}return "Aura mode: "+m.en};
A.analyze_data=function(){call("closeAllDropMenus");var f=$("file-upload");if(f)f.click();return "Opened the file picker for a CSV or Excel file."};
A.build_app=function(){call("phrBuildPrompt");return "Ready: the input says \"Build me \". Tell me what to build."};
A.solve_photo=function(){call("phrSolvePhoto");return "Opened the photo solver."};
A.prefill=function(a){var u=$("ui");if(!u)return "No input.";u.value=String(a&&a.text||"");u.focus();return "Put the text in the message box (not sent)."};
A.state=function(){var c=cur();return JSON.stringify({chat:c?c.name:null,messages:c?(c.msgs||[]).length:0,chats:chats().length,plan:G("activePlan"),core:G("activeModel"),theme:document.body.classList.contains("light-theme")?"light":"dark",open:openPanels().map(function(p){return p.id}),call:!!window.__auraActive,language:isFa()?"fa":"en"})};
var IDS=Object.keys(A);
function run(action,args){
 action=String(action||"").trim();
 if(typeof args==="string"){try{args=JSON.parse(args)}catch(e){args={query:args}}}
 args=args||{};
 var key=action.toLowerCase().replace(/[\s-]+/g,"_");
 if(!A[key]){var alt=P.filter(function(p){return key===p.id||key==="open_"+p.id||key===p.id+"_open"})[0];if(alt)key="open_"+alt.id}
 if(!A[key])return "Unknown action \""+action+"\". "+A.help();
 try{
  var r=A[key](args);
  if(/^(open_)/.test(key)&&key!=="open_sidebar"||/^(analyze_data|solve_photo)$/.test(key)){if(window.__auraActive)setTimeout(dock,350)}
  if(/^close_/.test(key)||key==="close_all"){setTimeout(function(){if(D.on&&!openPanels().length)undock()},300)}
  try{fn("haptic")&&fn("haptic")("light")}catch(e){}
  return r;
 }catch(e){return "Failed: "+(e&&e.message||e)}
}
// ── prompt: gives the model the catalog only when the user seems to be steering the app ──
var CTRL=/\b(open|close|show|hide|go to|take me|switch|change|new chat|rename|delete|pin|dark|light|theme|settings|history|sidebar|search|upgrade|plans?|tasks?|memory|files?|templates?|pomodoro|exam|model|core|persona|accent|color|launch)\b|باز کن|ببند|نشون بده|نشانم بده|برو (به|توی)|عوض کن|چت جدید|تم |حالت (تاریک|روشن)|تنظیمات|تاریخچه|حذف کن|پین کن|اسم .* بذار/i;
function prompt(text){
 var base="\n\nYou can operate Phraortes itself with the app_do tool (open or close any panel, switch/rename/pin/delete chats, theme, accent, AI core, personas, Aura persona and mode, file picker, and more). When the user asks you to open, close, switch or change something in the app, DO it with app_do, then confirm in one short sentence. You may call app_do several times in one turn. For anything destructive the app asks the user to confirm. Never claim you did something in the app unless app_do returned success.";
 if(CTRL.test(String(text||""))||(window.__auraActive))base+="\nAPP ACTIONS: "+A.help();
 return base}
// ── voice fast path (no round trip) ──
function find(t){
 var best=null,bl=0;P.forEach(function(p){p.kw.forEach(function(k){if(t.indexOf(k)>=0&&k.length>bl){best=p;bl=k.length}})});return best}
function voice(raw,quiet){
 var t=String(raw||"").toLowerCase().replace(/[.!?؟،,]/g," ").replace(/\s+/g," ").trim();if(!t||t.length>80)return false;
 t=t.replace(/^(?:(?:hey|hi|ok|okay|so|and|now|lets|let's|just|پلیز|لطفا|لطفاً|خب|حالا)\s+)+/,"").replace(/^(?:(?:can|could|would|will) you(?: please)?|i want you to|i need you to|i would like you to|i'd like you to|می ?شه|میشه|میتونی|می‌تونی|لطفا)\s+/,"").replace(/\s+(?:for me|please|now|right now|thanks|thank you|panel|tool|sheet|menu|section|page|screen|window|لطفا|پلیز|الان|برام|بخش|منوی|پنل|صفحه)$/g,"").replace(/\s+(?:for me|please|now|panel|tool|sheet|menu|section|page|لطفا|پلیز|الان|برام)$/g,"").trim();if(!t||t.split(" ").length>7)return false;
 var fa=/[؀-ۿ]/.test(t),ack=function(en,faT){if(quiet)return fa?faT:en;try{G("auraSetCaption")(fa?faT:en,"hint");G("auraSpeak")(fa?faT:en)}catch(e){}return true};
 var rm=/^(?:please |hey )?(open|show|show me|go to|take me to|launch|bring up|pull up)(?: the| my)? (.+)$/.exec(t),rf=/^(.+?)\s*(?:رو|را)?\s*(?:باز کن|بازش کن|نشون بده|نشانم بده|نشون بدید|ببر)$|^(?:برو (?:به|توی) )(.+)$/.exec(t);
 var rp=/^(?:باز کن|نشون بده|نشانم بده|بیار)\s+(.+)$/.exec(t),tgt=rm?rm[2]:rf?(rf[1]||rf[2]):rp?rp[1]:null;if(tgt){tgt=tgt.replace(/\s+(?:رو|را)$/,"").replace(/^(?:the|my|your|a|an)\s+/,"").trim();if(tgt.split(" ").length>3)tgt=null}
 if(tgt){var p=find(tgt);if(p){run("open_"+p.id);return ack("Opening "+p.en+".","باز می‌کنم: "+p.fa+".")}}
 var cm=/^(?:please )?(close|hide|dismiss)(?: the| my)? (.+)$/.exec(t),cf=/^(.+?)\s*(?:رو|را)?\s*(?:ببند|ببندش|ببند لطفا)$/.exec(t);
 var ct=cm?cm[2]:cf?cf[1]:null;
 if(ct){var q=find(ct);if(q&&q.close&&q.is()){run("close_"+q.id);return ack("Closed.","بسته شد.")}}
 if(/^(close|hide) (everything|all)|^(همه رو|همه را) ببند|^همه چیز رو ببند/.test(t)){run("close_all");return ack("Closed everything.","همه بسته شد.")}
 if(/^(start |open )?(a )?new (chat|conversation)$|چت جدید|گفتگوی جدید/.test(t)&&t.split(" ").length<=5){run("new_chat");return ack("New chat.","چت جدید ساخته شد.")}
 var th=/(dark|light) (mode|theme)|(حالت|تم) (تاریک|روشن)/.exec(t);if(th&&t.split(" ").length<=5){var m=/dark|تاریک/.test(th[0])?"dark":"light";run("theme",{mode:m});return ack(m==="dark"?"Dark mode.":"Light mode.",m==="dark"?"حالت تاریک.":"حالت روشن.")}
 var sw=/^(?:open|switch to|go to) (?:the )?chat (?:about |called |named )?(.+)$|^چت (.+?) رو باز کن$/.exec(t);if(sw){var res=run("switch_chat",{query:sw[1]||sw[2]});return ack(res.indexOf("Opened")===0?"Opened it.":"I couldn't find that chat.",res.indexOf("Opened")===0?"باز شد.":"چنین چتی پیدا نکردم.")}
 var mdl=/(?:switch to|use|change to|عوض کن به|برو روی) (prime|intellect|apex|sovereign|پرایم|اینتلکت|اپکس|سوورین)/.exec(t);if(mdl){var mp={"پرایم":"prime","اینتلکت":"intellect","اپکس":"apex","سوورین":"sovereign"};run("core",{name:mp[mdl[1]]||mdl[1]});return ack("Switching core.","هسته عوض شد.")}
 return false}
window.PHR_AGENT={do:run,prompt:prompt,voice:voice,typed:function(r){return voice(r,true)},state:A.state,ids:IDS,help:function(){return A.help()},panels:P,dock:dock,undock:undock,actions:A,extend:function(o){for(var k in o)A[k]=o[k];IDS=Object.keys(A);window.PHR_AGENT.ids=IDS}};
})();
