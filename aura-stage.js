/* Aura Stage — live visuals inside the voice call, instant voice commands.
   Public: window.AURA_STAGE = { command(text), show(node), hide(), active() } */
(function(){
"use strict";
var FENCES="chart|charts|chartboard|dashboard|pie|donut|doughnut|budget|percent|graph|plot|function-plot|sim|simulation|physics|solution|steps|worked|quiz|practice|flashcards|flashcard|cards|periodic|periodictable|ptable|molecule|molecules|mol|balance|equation|reaction|circuit|schematic|playground|databoard|studio|webapp|codestudio|project|app|codeplayground|livecode|webdemo|stats|statistics|statslab|histogram|regression";
var FENCE_RE=new RegExp("```(?:"+FENCES+")\\b[\\s\\S]*?```","gi");
var S={card:null,node:null,ph:null,seen:new Set(),timer:0,hist:[]};
function fa(){try{return !!auraFa()}catch(e){return false}}
function $(i){return document.getElementById(i)}
function css(){if($("as-css"))return;var st=document.createElement("style");st.id="as-css";st.textContent=
"#au-stage{display:flex;align-items:flex-start;justify-content:center;padding:0 14px;min-height:0}"+
"#au-stagecard{position:relative;display:none;flex-direction:column;width:100%;max-height:100%;max-width:640px;margin:6px auto 4px;border-radius:22px;overflow:hidden;background:rgba(14,12,9,.72);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.12);box-shadow:0 20px 60px -20px rgba(0,0,0,.8),0 0 0 1px rgba(232,196,104,.12) inset;opacity:0;transform:translateY(24px) scale(.96);transition:opacity .5s ease,transform .6s cubic-bezier(.3,1.35,.5,1)}"+
"#au-stagecard.on{opacity:1;transform:none}"+
"#au-stagecard .as-h{display:flex;align-items:center;gap:8px;padding:9px 10px 9px 14px;border-bottom:1px solid rgba(255,255,255,.08);font:600 12px 'Space Grotesk','Vazirmatn',sans-serif;color:rgba(243,238,228,.7);letter-spacing:.04em}"+
"#au-stagecard .as-h i{width:7px;height:7px;border-radius:50%;background:var(--c1,#E8C468);box-shadow:0 0 10px var(--c1,#E8C468)}"+
"#au-stagecard .as-h span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
"#au-stagecard .as-h button{width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:15px;line-height:1;cursor:pointer}"+
"#au-stagecard .as-b{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:8px;overscroll-behavior:contain}"+
"#au-stagecard .as-b .phr-w{margin:0!important;max-width:100%!important}"+
"#aura-screen.as-on #aura-cv{opacity:.42}#aura-screen.as-on .au-personas{display:none}"+
"#aura-screen #aura-cv{transition:opacity .7s ease}"+
"#aura-screen.as-on .au-cap{max-height:15vh;font-size:16px}"+
"@media(prefers-reduced-motion:reduce){#au-stagecard,#aura-screen #aura-cv{transition:none}}";document.head.appendChild(st)}
function build(){css();var st=$("au-stage");if(!st)return null;if(S.card&&st.contains(S.card))return S.card;
 var c=document.createElement("div");c.id="au-stagecard";c.innerHTML='<div class="as-h"><i></i><span></span><button type="button" aria-label="Close">✕</button></div><div class="as-b"></div>';
 c.querySelector("button").addEventListener("click",function(e){e.stopPropagation();hide()});
 c.addEventListener("click",function(e){e.stopPropagation()});
 st.appendChild(c);S.card=c;return c}
function titleOf(n){var t=n.querySelector("[data-title],.phr-w-title,.w-title,h3,h4,b");var s=t&&t.textContent.trim();return (s&&s.length<48?s:(fa()?"صحنه زنده":"Live"))}
function show(node){
 if(!node||!window.__auraActive)return;var c=build();if(!c)return;
 if(S.node&&S.node!==node)restore();
 if(S.node!==node){S.ph=document.createComment("aura-stage");node.parentNode.insertBefore(S.ph,node);c.querySelector(".as-b").appendChild(node);S.node=node}
 c.querySelector(".as-h span").textContent=titleOf(node);c.style.display="flex";
 $("aura-screen").classList.add("as-on");requestAnimationFrame(function(){requestAnimationFrame(function(){c.classList.add("on")})});
 try{window.dispatchEvent(new Event("resize"))}catch(e){}
 setTimeout(function(){try{window.dispatchEvent(new Event("resize"))}catch(e){}},700);
 try{auraHaptic("medium")}catch(e){}
}
function restore(){
 if(S.node&&S.ph&&S.ph.parentNode){S.ph.parentNode.insertBefore(S.node,S.ph);S.ph.remove()}
 else if(S.node&&S.node.parentNode&&S.card&&S.card.contains(S.node)){S.node.remove()}
 S.node=null;S.ph=null}
function hide(){
 var c=S.card;if(c){c.classList.remove("on");setTimeout(function(){if(!S.node||!c.classList.contains("on"))c.style.display="none"},520)}
 restore();var sc=$("aura-screen");if(sc)sc.classList.remove("as-on")}
function allWidgets(){return [].slice.call(document.querySelectorAll(".phr-w")).filter(function(w){return !(S.card&&S.card.contains(w))})}
function poll(){
 clearInterval(S.timer);var n=0;
 S.timer=setInterval(function(){
  n++;if(!window.__auraActive||n>24){clearInterval(S.timer);return}
  var fresh=allWidgets().filter(function(w){return !S.seen.has(w)});
  if(fresh.length){fresh.forEach(function(w){S.seen.add(w)});clearInterval(S.timer);show(fresh[fresh.length-1])}
 },300)}
// ── instant voice commands ──
var P_RE=/\b(nova|atlas|sage|spark|coach)\b|نووا|نوا|اطلس|سیج|اسپارک|کوچ/i;
var P_MAP={"نووا":"nova","نوا":"nova","اطلس":"atlas","سیج":"sage","اسپارک":"spark","کوچ":"coach"};
function say(en,faTxt){try{auraSetCaption(fa()?faTxt:en,"hint")}catch(e){}try{auraSpeak(fa()?faTxt:en)}catch(e){}}
function command(raw){
 var t=String(raw||"").toLowerCase().replace(/[.!?؟،,]/g," ").replace(/\s+/g," ").trim();if(!t||t.length>60)return false;
 if(/^(please )?(end|stop) (the |this )?(call|chat)|^hang up|^(good ?bye|bye)\b|تماس.*(تمام|قطع|ببند)|خداحافظ|^قطع کن/.test(t)){setTimeout(function(){closeAura()},50);return true}
 if(/^(please )?(close|hide|dismiss|remove|clear) (it|this|that|the (graph|chart|plot|model|molecule|circuit|screen|card|app|board|stage))|^(ببندش|ببند|مخفی کن|پنهان کن|حذفش کن)$/.test(t)){if(S.node){hide();say("Closed.","بسته شد.");return true}return false}
 if(/^(please )?(say|repeat) (that|it) again|^repeat( that)?$|^(what did you say|say again)|دوباره بگو|تکرار کن|چی گفتی/.test(t)){
  var last=null;try{for(var i=auraLog.length-1;i>=0;i--)if(auraLog[i].w==="ai"){last=auraLog[i].t;break}}catch(e){}
  if(last){try{auraSpeak(last)}catch(e){}return true}return false}
 var m=t.match(/(switch to|change to|talk to|use|be|put on|بذار|عوض کن|برو روی|با)\b.*?/);
 if(m&&P_RE.test(t)&&t.split(" ").length<=6){var h=t.match(P_RE)[0].toLowerCase();var id=P_MAP[h]||h;
  try{if(AURA_PERSONAS.some(function(p){return p.id===id})){auraPid=id;localStorage.setItem("phraortes_aura_persona",id);auraTheme();auraBuildChips();auraSpeak(auraP().hi[fa()?1:0]);return true}}catch(e){}}
 var md=null;
 if(/quiz me|از من (بپرس|امتحان)|امتحانم کن/.test(t))md="quiz";else if(/(quick|short) (mode|answers)|کوتاه جواب بده|پاسخ سریع/.test(t))md="quick";else if(/(tutor|teach) mode|حالت (آموزگار|تدریس)|آموزگار/.test(t))md="tutor";else if(/interview( me)?|مصاحبه/.test(t)&&t.split(" ").length<=5)md="interview";else if(/free (talk|chat)|گفتگوی آزاد/.test(t))md="free";
 if(md){try{auraMode=md;localStorage.setItem("phraortes_aura_mode",md);auraBuildChips();var M=AURA_MODES.find(function(x){return x.id===md});say((M?M.en:md)+" mode.","حالت "+(M?M.fa:md)+".");return true}catch(e){}}
 try{return window.PHR_AGENT?!!PHR_AGENT.voice(raw):false}catch(e){return false}}
function install(){
 if(typeof window.callAura!=="function"||typeof window.auraSpeak!=="function"||typeof window.auraStripForSpeech!=="function"||typeof window.closeAura!=="function"||typeof window.auraStyleHint!=="function"){return false}
 if(window.__asInstalled)return true;window.__asInstalled=true;
 var oCall=window.callAura,oSpeak=window.auraSpeak,oClose=window.closeAura,oStrip=window.auraStripForSpeech,oHint=window.auraStyleHint;
 window.callAura=function(){S.seen=new Set(allWidgets());var r=oCall.apply(this,arguments);if(window.__auraActive)build();return r};
 window.auraSpeak=function(txt){var isAi=window.__auraWaiting;var r=oSpeak.apply(this,arguments);if(isAi&&window.__auraActive)poll();return r};
 window.closeAura=function(){clearInterval(S.timer);hide();return oClose.apply(this,arguments)};
 window.auraStripForSpeech=function(raw){return oStrip(String(raw||"").replace(FENCE_RE," "))};
 window.auraStyleHint=function(){return oHint.apply(this,arguments)+"\n\nVISUALS: if you build a graph, molecule, circuit, chart, app or data board, it appears live on the call screen right above this conversation, so NEVER say 'check the screen'. Instead, in one or two spoken sentences, say what it shows and the single most important insight. Do not read formulas symbol by symbol. For a quick visual request, put the visual block first and keep the text brief."};
 return true}
var tries=0,iv=setInterval(function(){if(install()||++tries>80)clearInterval(iv)},250);
window.AURA_STAGE={command:command,show:show,hide:hide,active:function(){return !!S.node}};
})();
