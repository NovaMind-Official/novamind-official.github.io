/**
 * ============================================================
 * PHRAORTES CHECKOUT — payment.js (v3)
 * ============================================================
 * One checkout sheet for every way of paying. It never verifies a payment itself: each method
 * ends in a call to the Cloudflare Worker, which does the real checking and returns a signed
 * license token (see index.js). The client only stores that token.
 *
 * HOW TO TURN A METHOD ON (the only thing you need to edit is PHR_PAY.methods below)
 * ------------------------------------------------------------------------------
 *  type "crypto"  USDT on-chain. Already live: /api/verify-payment and /api/verify-topup.
 *  type "link"    Any hosted checkout (Stripe Payment Link, PayPal, a Rial gateway, ...).
 *                 Set  enabled:true  and  url:"https://..."  — tokens you may use in the url:
 *                 {ref} {plan} {planName} {amount} {period} {topup}
 *                 The user pays on that page, comes back and taps "I've completed payment";
 *                 the app then calls POST /api/verify-link  { ref, plan | topup, isAnnual, methodId }
 *                 and expects  { ok:true, token }  (plan)  or  { ok:true, slots }  (top-up),
 *                 or { ok:false, pending:true } while the gateway has not confirmed yet.
 *  type "manual"  Bank / card-to-card. Fill  details  and set enabled:true. The user sends a
 *                 note (tracking number); the app calls POST /api/submit-manual
 *                 { ref, plan | topup, isAnnual, methodId, note } and expects { ok:true, pending:true }.
 *  Card numbers are never typed into Phraortes: cards always go through a hosted "link" page.
 *
 *  Plan keys stay  starter / pro / ultimate  everywhere (the Worker and licenses use them).
 *  Display names are only labels:  Plus / Pro / Max.
 * ============================================================
 */
let billing=[];try{billing=JSON.parse(localStorage.getItem("phraortes_billing")||"[]")}catch(e){billing=[]}

const PHR_PAY={
  showUnconfigured:true,            // show methods that are not switched on yet as dimmed "Soon" tiles
  support:{telegram:"",email:""},   // optional: shows a "Need help?" link in the checkout
  endpoints:{link:"/api/verify-link",manual:"/api/submit-manual"},
  methods:[
    {id:"usdt",type:"crypto",label:"USDT",sub:"BEP20 · automatic",icon:"coin",enabled:true,
     networks:[{id:"bep20",label:"USDT · BEP20 (BNB Smart Chain)"}]},
    {id:"card",type:"link",label:"Card",sub:"Visa · Mastercard · Apple Pay",icon:"card",enabled:false,url:"",
     note:"You will be taken to a secure checkout page. Card details are never entered inside Phraortes."},
    {id:"gateway",type:"link",label:"Rial gateway",sub:"Iranian bank cards",icon:"gate",enabled:false,url:"",
     note:"You will be taken to your bank's secure payment page and returned here afterwards."},
    {id:"paypal",type:"link",label:"PayPal",sub:"Balance or linked card",icon:"pp",enabled:false,url:"",
     note:"You will be taken to PayPal to approve the payment."},
    {id:"bank",type:"manual",label:"Bank transfer",sub:"Approved by our team",icon:"bank",enabled:false,
     details:[["Account name",""],["Card / IBAN",""],["Bank",""]],
     note:"Transfer the exact amount, then send the tracking number below. We activate your plan after checking it."}
  ]
};
window.PHR_PAY=PHR_PAY;

const PLAN_PRICE_DATA={
  Plus:{monthly:14.99,annual:10.49,annualTotal:125.88},
  Pro:{monthly:49.99,annual:34.99,annualTotal:419.88},
  Max:{monthly:119.99,annual:83.99,annualTotal:1007.88}
};
const PLAN_NAME_KEY={Plus:"starter",Pro:"pro",Max:"ultimate",Satrap:"starter",Immortal:"pro",Shahanshah:"ultimate"};
const PLAN_KEY_NAME={starter:"Plus",pro:"Pro",ultimate:"Max"};
const PLAN_COLOR={starter:"#3FD0C9",pro:"#3FE0A0",ultimate:"#E8C468"};
const TOPUP_PACKS={
  slots50:{label:"+50 Extra Slots",price:2.99,slots:50},
  slots200:{label:"+200 Extra Slots",price:8.99,slots:200}
};
const PLAN_FEATURES={
  starter:["Live web search with cited sources","Reads photos, links and documents","Intellect: deep reasoning and research","100 premium requests every month"],
  pro:["Apex: engineering-grade reasoning","Workspace, canvas and PDF export","Deep Research with sourced reports","350 premium requests every month"],
  ultimate:["Sovereign: our most capable engine","Aura live voice, five personalities","Unlimited custom assistants","Unlimited premium requests"]
};
const TXID_PATTERN=/^0x[a-fA-F0-9]{64}$/;   // UX fast-fail only; the server enforces the same pattern
let pendingTopupKey=null;

/* ---------------- state ---------------- */
const PK={built:false,key:null,topup:null,color:"#E8C468",method:null,stage:"idle",ref:"",busy:false,timers:[],price:0};
const $pk=id=>document.getElementById(id);
const pkEsc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pkHap=t=>{try{haptic(t||"light")}catch(e){}};
const pkIcon={
  coin:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5h3.8a1.7 1.7 0 0 1 0 3.4H10m0 0h3.6a1.8 1.8 0 0 1 0 3.6H9.5M12 7v2M12 16.5v2"/></svg>',
  card:'<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
  gate:'<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>',
  pp:'<svg viewBox="0 0 24 24"><path d="M7 20l1.6-11.2A1.5 1.5 0 0 1 10.1 7.5h4.4a3.6 3.6 0 0 1 0 7.2h-2.8"/><path d="M5 17l1.4-10A1.5 1.5 0 0 1 7.9 5.7h4.6"/></svg>',
  bank:'<svg viewBox="0 0 24 24"><path d="M4 9h16M5 9v9m4-9v9m6-9v9m4-9v9M3 20h18M12 3l9 4.5H3z"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></svg>',
  ext:'<svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg>',
  bolt:'<svg viewBox="0 0 24 24"><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/></svg>'
};

/* ---------------- styles ---------------- */
(function(){const st=document.createElement("style");st.id="pk-css";st.textContent=`
#payment-overlay{position:fixed;inset:0;z-index:29000;display:none;align-items:flex-end;justify-content:center;background:rgba(5,3,2,0);-webkit-backdrop-filter:none;backdrop-filter:none;transition:background .4s}
#payment-overlay.show{display:flex}#payment-overlay.in{background:rgba(5,3,2,.62)}
.pk{--pc:#E8C468;width:100%;max-width:480px;max-height:94vh;max-height:94dvh;display:flex;flex-direction:column;position:relative;overflow:hidden;color:#f3eee4;font-family:'Space Grotesk','Vazirmatn',sans-serif;border-radius:30px 30px 0 0;background:radial-gradient(120% 60% at 50% -10%,color-mix(in srgb,var(--pc) 28%,transparent),transparent 60%),linear-gradient(180deg,rgba(26,19,15,.97),rgba(12,9,7,.99));border:.5px solid color-mix(in srgb,var(--pc) 45%,transparent);border-bottom:0;box-shadow:0 -24px 70px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.18);transform:translateY(105%);transition:transform .6s cubic-bezier(.2,1.1,.3,1)}
#payment-overlay.in .pk{transform:none}
@media(min-width:640px){#payment-overlay{align-items:center}.pk{border-radius:30px;border-bottom:.5px solid color-mix(in srgb,var(--pc) 45%,transparent);transform:translateY(40px) scale(.96);opacity:0;transition:transform .5s cubic-bezier(.2,1.1,.3,1),opacity .35s}#payment-overlay.in .pk{opacity:1}}
.pk *{box-sizing:border-box}.pk svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.pk-grip{width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.22);margin:9px auto 0;flex:none}
.pk-top{display:flex;align-items:center;gap:10px;padding:10px 16px 6px;flex:none}
.pk-ib{width:38px;height:38px;border-radius:50%;border:.5px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none;transition:transform .3s cubic-bezier(.3,1.35,.5,1)}.pk-ib:active{transform:scale(.9)}
.pk-title{flex:1;font:400 20px Georgia,serif;letter-spacing:.005em}
.pk-sec{display:flex;align-items:center;gap:6px;font:700 10px 'Space Mono',monospace;letter-spacing:.12em;color:#7be0a6;padding:6px 10px;border-radius:12px;background:rgba(80,200,130,.1);border:.5px solid rgba(80,200,130,.3)}.pk-sec svg{width:13px;height:13px}
.pk-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 16px 14px;scrollbar-width:none}.pk-scroll::-webkit-scrollbar{display:none}
.pk-sum{position:relative;margin-top:6px;padding:18px;border-radius:26px;overflow:hidden;background:linear-gradient(160deg,rgba(255,255,255,.11),rgba(255,255,255,.03));border:.5px solid color-mix(in srgb,var(--pc) 40%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
.pk-sum-row{display:flex;align-items:center;gap:14px}
.pk-orb{flex:none;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;color:#1a1206;background:radial-gradient(circle at 35% 28%,#fff9,var(--pc) 48%,color-mix(in srgb,var(--pc) 40%,#000));box-shadow:0 0 30px color-mix(in srgb,var(--pc) 55%,transparent);animation:pkBreath 4s ease-in-out infinite}.pk-orb svg{width:24px;height:24px}
@keyframes pkBreath{50%{transform:scale(1.07)}}
.pk-nm small{display:block;font:700 10px 'Space Mono',monospace;letter-spacing:.18em;color:var(--pc);text-transform:uppercase}.pk-nm b{font:400 26px Georgia,serif;display:block;margin-top:2px}
.pk-pr{margin-left:auto;text-align:right}.pk-pr b{font:400 32px Georgia,serif;display:block;line-height:1}.pk-pr span{font-size:12px;opacity:.55}
.pk-seg{position:relative;display:grid;grid-template-columns:1fr 1fr;margin-top:16px;padding:3px;border-radius:16px;background:rgba(255,255,255,.07);border:.5px solid rgba(255,255,255,.1)}
.pk-seg i{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:13px;background:linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,.1));box-shadow:inset 0 1px 0 rgba(255,255,255,.3);transition:transform .45s cubic-bezier(.3,1.25,.5,1)}.pk-seg.an i{transform:translateX(100%)}
.pk-seg button{position:relative;z-index:1;height:38px;border:0;background:none;color:rgba(255,255,255,.65);font:600 13px 'Space Grotesk',sans-serif;cursor:pointer;transition:color .25s;display:flex;align-items:center;justify-content:center;gap:6px}.pk-seg button.on{color:#fff}.pk-seg em{font:700 9px 'Space Mono',monospace;font-style:normal;letter-spacing:.06em;padding:2px 6px;border-radius:8px;background:var(--pc);color:#10100c}
.pk-note{margin:12px 2px 0;font-size:12.5px;line-height:1.5;color:rgba(243,238,228,.55)}.pk-note b{color:var(--pc);font-weight:600}
.pk-lab{margin:20px 4px 10px;font:700 10.5px 'Space Mono',monospace;letter-spacing:.2em;color:rgba(243,238,228,.45);text-transform:uppercase}
.pk-ms{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.pk-m{position:relative;text-align:left;padding:14px 14px 13px;border-radius:20px;border:.5px solid rgba(255,255,255,.12);background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02));color:#fff;cursor:pointer;font-family:inherit;transition:transform .35s cubic-bezier(.3,1.35,.5,1),border-color .3s,background .3s,box-shadow .3s}
.pk-m:active{transform:scale(.97)}.pk-m svg{width:22px;height:22px;color:var(--pc);margin-bottom:10px;display:block}.pk-m b{display:block;font-size:15px;font-weight:600}.pk-m small{display:block;margin-top:3px;font-size:11px;line-height:1.35;color:rgba(243,238,228,.5)}
.pk-m.on{border-color:var(--pc);background:linear-gradient(160deg,color-mix(in srgb,var(--pc) 22%,transparent),rgba(255,255,255,.03));box-shadow:0 0 28px -6px color-mix(in srgb,var(--pc) 55%,transparent),inset 0 1px 0 rgba(255,255,255,.2)}
.pk-m.on::after{content:"";position:absolute;top:12px;right:12px;width:18px;height:18px;border-radius:50%;background:var(--pc) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310100c' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7'/%3E%3C/svg%3E") center/11px no-repeat;animation:pkPop .5s cubic-bezier(.3,1.5,.5,1)}
@keyframes pkPop{from{transform:scale(0)}}
.pk-m.soon{opacity:.45;cursor:default}.pk-m.soon:active{transform:none}.pk-m .pk-soon{position:absolute;top:12px;right:12px;font:700 8.5px 'Space Mono',monospace;letter-spacing:.1em;padding:3px 7px;border-radius:8px;background:rgba(255,255,255,.1)}
.pk-paneW{margin-top:12px;overflow:hidden;transition:height .5s cubic-bezier(.25,1,.35,1)}
.pk-pane{padding:16px;border-radius:22px;background:rgba(255,255,255,.045);border:.5px solid rgba(255,255,255,.1);transition:opacity .22s,transform .22s}.pk-pane.out{opacity:0;transform:translateY(8px)}
.pk-pane>*+*{margin-top:12px}
.pk-f{display:block;font:700 10px 'Space Mono',monospace;letter-spacing:.14em;color:rgba(243,238,228,.45);margin-bottom:6px;text-transform:uppercase}
.pk-in,.pk-sel{width:100%;height:48px;padding:0 14px;border-radius:14px;border:.5px solid rgba(255,255,255,.16);background:rgba(0,0,0,.3);color:#fff;font:500 16px 'Space Grotesk',sans-serif;outline:none;transition:border-color .25s,box-shadow .25s}
.pk-in:focus,.pk-sel:focus{border-color:var(--pc);box-shadow:0 0 0 3px color-mix(in srgb,var(--pc) 22%,transparent)}.pk-in.bad{border-color:#ff6b5e}.pk-in.good{border-color:#5ee09a}
.pk-sel option{background:#1a130f}.pk-chip{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:12px;background:rgba(255,255,255,.07);font-size:13px}
.pk-qr{display:grid;place-items:center}.pk-qr div{padding:10px;border-radius:20px;background:#fff;box-shadow:0 12px 36px rgba(0,0,0,.45)}.pk-qr canvas{display:block;border-radius:8px}
.pk-addr{display:flex;gap:8px}.pk-addr input{flex:1;min-width:0;height:46px;padding:0 12px;border-radius:14px;border:.5px solid rgba(255,255,255,.14);background:rgba(0,0,0,.3);color:rgba(255,255,255,.8);font:12px 'Space Mono',monospace}
.pk-cp{flex:none;height:46px;padding:0 14px;border-radius:14px;border:.5px solid color-mix(in srgb,var(--pc) 50%,transparent);background:color-mix(in srgb,var(--pc) 16%,transparent);color:var(--pc);font:700 12px 'Space Mono',monospace;cursor:pointer;display:flex;align-items:center;gap:6px}.pk-cp svg{width:15px;height:15px}.pk-cp.ok{background:var(--pc);color:#10100c}
.pk-info{display:flex;gap:10px;font-size:12.5px;line-height:1.5;color:rgba(243,238,228,.62)}.pk-info svg{flex:none;width:17px;height:17px;margin-top:1px;color:var(--pc)}
.pk-kv{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 0;border-top:.5px solid rgba(255,255,255,.08);font-size:13.5px}.pk-kv:first-child{border-top:0;padding-top:0}.pk-kv span{opacity:.55}.pk-kv b{font-weight:600;word-break:break-all;text-align:right}
.pk-wait{display:flex;align-items:center;gap:12px;font-size:13.5px}.pk-spin{flex:none;width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(255,255,255,.15);border-top-color:var(--pc);animation:pkSp 1s linear infinite}@keyframes pkSp{to{transform:rotate(360deg)}}
.pk-err{display:none;margin:12px 0 0;padding:12px 14px;border-radius:16px;background:rgba(255,90,80,.12);border:.5px solid rgba(255,90,80,.4);color:#ffb3ac;font-size:13px;line-height:1.5}.pk-err.show{display:block;animation:pkShake .5s}
@keyframes pkShake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.pk-bar{flex:none;padding:12px 16px calc(14px + env(safe-area-inset-bottom));border-top:.5px solid rgba(255,255,255,.08);background:rgba(12,9,7,.82);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)}
.pk-btn{position:relative;width:100%;height:56px;border:0;border-radius:28px;font:700 16px 'Space Grotesk',sans-serif;color:#10100c;cursor:pointer;overflow:hidden;background:linear-gradient(180deg,color-mix(in srgb,var(--pc) 55%,#fff),var(--pc) 60%,color-mix(in srgb,var(--pc) 70%,#000));box-shadow:0 12px 30px -8px color-mix(in srgb,var(--pc) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.5);transition:transform .3s cubic-bezier(.3,1.35,.5,1),opacity .25s,filter .25s}
.pk-btn:active{transform:scale(.97)}.pk-btn:disabled{opacity:.42;filter:saturate(.5);cursor:not-allowed;transform:none}
.pk-btn.load{pointer-events:none}.pk-btn.load::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.45),transparent 70%);transform:translateX(-100%);animation:pkSh 1.1s infinite}@keyframes pkSh{to{transform:translateX(100%)}}
.pk-trust{margin:10px 0 0;text-align:center;font-size:11.5px;color:rgba(243,238,228,.42);display:flex;align-items:center;justify-content:center;gap:6px}.pk-trust svg{width:13px;height:13px}.pk-trust a{color:var(--pc);text-decoration:none}
.pk-ok{position:absolute;inset:0;z-index:5;display:none;flex-direction:column;background:radial-gradient(100% 50% at 50% 0,color-mix(in srgb,var(--pc) 32%,transparent),transparent 70%),linear-gradient(180deg,#1a130f,#0c0907);overflow-y:auto}
.pk-ok.show{display:flex;animation:pkIn .5s ease both}@keyframes pkIn{from{opacity:0}}
.pk-ok-in{padding:48px 24px 10px;text-align:center;flex:1}
.pk-burst{position:relative;width:132px;height:132px;margin:0 auto 8px;display:grid;place-items:center}
.pk-burst .ring{position:absolute;inset:0;border-radius:50%;border:2px solid var(--pc);opacity:0;animation:pkRing 1.5s .25s cubic-bezier(.2,.8,.3,1) both}.pk-burst .ring.r2{animation-delay:.5s}
@keyframes pkRing{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.9);opacity:0}}
.pk-burst .core{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 28%,#fff9,var(--pc) 50%,color-mix(in srgb,var(--pc) 40%,#000));box-shadow:0 0 70px color-mix(in srgb,var(--pc) 65%,transparent);animation:pkCore .8s cubic-bezier(.3,1.5,.5,1) both}@keyframes pkCore{from{transform:scale(0)}}
.pk-burst svg{width:44px;height:44px;stroke:#10100c;stroke-width:3.2}.pk-burst svg path{stroke-dasharray:30;stroke-dashoffset:30;animation:pkDraw .6s .55s ease forwards}@keyframes pkDraw{to{stroke-dashoffset:0}}
.pk-burst i{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:var(--pc);opacity:0;animation:pkPart 1.2s .35s cubic-bezier(.2,.8,.3,1) both}
@keyframes pkPart{0%{opacity:1;transform:translate(-50%,-50%)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy)))}}
.pk-ok h2{margin:14px 0 6px;font:400 30px Georgia,serif;animation:pkUp .6s .5s both}.pk-ok p{margin:0 auto;max-width:34ch;color:rgba(243,238,228,.62);line-height:1.55;font-size:14.5px;animation:pkUp .6s .6s both}
@keyframes pkUp{from{opacity:0;transform:translateY(12px)}}
.pk-un{list-style:none;margin:22px 0 0;padding:0;text-align:left}.pk-un li{display:flex;align-items:center;gap:12px;padding:13px 4px;border-top:.5px solid rgba(255,255,255,.1);font-size:14.5px;animation:pkUp .5s both}.pk-un li:before{content:"";flex:none;width:9px;height:9px;border-radius:50%;background:var(--pc);box-shadow:0 0 12px var(--pc)}
.pk-rc{margin:20px 0 0;padding:6px 16px;border-radius:20px;background:rgba(255,255,255,.05);border:.5px solid rgba(255,255,255,.1);animation:pkUp .6s 1s both}
.pk-ok-bar{padding:12px 16px calc(14px + env(safe-area-inset-bottom));flex:none}
@media(prefers-reduced-motion:reduce){.pk,.pk-m,.pk-btn,.pk-orb,.pk-burst *,.pk-ok *{animation:none!important;transition:none!important}.pk-burst svg path{stroke-dashoffset:0}}`;document.head.appendChild(st)})();

/* ---------------- build ---------------- */
function pkBuild(){
  if(PK.built)return;const ov=$pk("payment-overlay");if(!ov)return;
  ov.innerHTML=`<div class="pk" id="pk" role="dialog" aria-modal="true" aria-label="Checkout">
  <div class="pk-grip"></div>
  <div class="pk-top"><button class="pk-ib" id="pk-back" aria-label="Back">${pkIcon.x}</button><div class="pk-title">Checkout</div><span class="pk-sec">${pkIcon.lock}SECURE</span></div>
  <div class="pk-scroll" id="pk-scroll">
    <div class="pk-sum" id="pk-sum"></div>
    <div class="pk-lab">Payment method</div><div class="pk-ms" id="pk-ms"></div>
    <div class="pk-paneW" id="pk-paneW"><div class="pk-pane" id="pk-pane"></div></div>
    <div class="pk-err" id="pk-err" role="alert"></div>
  </div>
  <div class="pk-bar"><button class="pk-btn" id="pk-btn"></button><div class="pk-trust" id="pk-trust"></div></div>
  <div class="pk-ok" id="pk-ok"></div></div>`;
  ov.onclick=e=>{if(e.target===ov)closePayment()};
  $pk("pk-back").onclick=()=>closePayment();
  $pk("pk-btn").onclick=pkPrimary;
  $pk("pk-ms").onclick=e=>{const b=e.target.closest(".pk-m");if(b&&!b.classList.contains("soon"))pkSelect(b.dataset.id)};
  $pk("pk-sum").onclick=e=>{const b=e.target.closest("[data-bill]");if(b)pkBilling(b.dataset.bill==="an")};
  $pk("pk-pane").addEventListener("input",pkValidate);
  $pk("pk-pane").addEventListener("click",e=>{const c=e.target.closest("[data-copy]");if(c)pkCopy(c)});
  // drag the sheet down to close (touch)
  let y0=null,dy=0;const sh=$pk("pk");
  sh.addEventListener("touchstart",e=>{if(e.target.closest(".pk-grip,.pk-top")&&innerWidth<640)y0=e.touches[0].clientY},{passive:true});
  sh.addEventListener("touchmove",e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);sh.style.transition="none";sh.style.transform=`translateY(${dy}px)`},{passive:true});
  sh.addEventListener("touchend",()=>{if(y0===null)return;sh.style.transition="";sh.style.transform="";if(dy>110)closePayment();y0=null;dy=0});
  PK.built=true;
}
function pkMethods(){return PHR_PAY.methods.filter(m=>pkLive(m)||PHR_PAY.showUnconfigured)}
function pkLive(m){
  if(!m.enabled)return false;
  if(m.type==="link")return !!m.url;
  if(m.type==="manual")return (m.details||[]).some(d=>d[1]);
  return true;
}
function pkInfo(){
  const topup=PK.topup?TOPUP_PACKS[PK.topup]:null;
  if(topup)return{name:topup.label,tag:"One-time",price:topup.price,per:"one-time",annualOK:false,exp:topup.price};
  const n=PLAN_KEY_NAME[PK.key],pd=PLAN_PRICE_DATA[n],an=!!isAnnual;
  const price=pd?(an?pd.annualTotal:pd.monthly):0;
  return{name:n,tag:"Plan",price,per:an?"per year":"per month",annualOK:!!pd,pd,an,exp:price};
}
function pkRender(){
  const I=pkInfo(),sh=$pk("pk");sh.style.setProperty("--pc",PK.color);PK.price=I.price;
  let h=`<div class="pk-sum-row"><div class="pk-orb">${PK.topup?pkIcon.bolt:`<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.4 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>`}</div>
   <div class="pk-nm"><small>${I.tag}</small><b>${pkEsc(I.name)}</b></div>
   <div class="pk-pr"><b id="pk-pn">$${I.price.toFixed(2)}</b><span>${I.per}</span></div></div>`;
  if(I.annualOK){
    h+=`<div class="pk-seg${I.an?" an":""}"><i></i><button data-bill="mo" class="${I.an?"":"on"}">Monthly</button><button data-bill="an" class="${I.an?"on":""}">Annual<em>-30%</em></button></div>
    <div class="pk-note">${I.an?`That is <b>$${I.pd.annual.toFixed(2)}</b> a month. You save <b>$${(I.pd.monthly*12-I.pd.annualTotal).toFixed(2)}</b> compared with paying monthly.`:`Billed monthly. Choose annual to save <b>$${(I.pd.monthly*12-I.pd.annualTotal).toFixed(2)}</b> a year.`}</div>`;
  }else h+=`<div class="pk-note">One-time purchase. The extra slots are added to your account as soon as the payment is confirmed.</div>`;
  $pk("pk-sum").innerHTML=h;
  const ms=pkMethods();
  $pk("pk-ms").innerHTML=ms.map(m=>{const live=pkLive(m);return `<button class="pk-m${live?"":" soon"}${PK.method&&PK.method.id===m.id?" on":""}" data-id="${m.id}" ${live?"":"tabindex=-1"}>${pkIcon[m.icon]||pkIcon.card}<b>${pkEsc(m.label)}</b><small>${pkEsc(m.sub||"")}</small>${live?"":'<span class="pk-soon">SOON</span>'}</button>`}).join("");
  const sup=PHR_PAY.support||{},link=sup.telegram?`https://t.me/${String(sup.telegram).replace(/^@/,"")}`:sup.email?`mailto:${sup.email}`:"";
  $pk("pk-trust").innerHTML=`${pkIcon.lock}<span>${PK.method&&PK.method.type==="crypto"?"Verified automatically on the blockchain":"Payments are confirmed before anything is activated"}</span>${link?` · <a href="${pkEsc(link)}" target="_blank" rel="noopener">Need help?</a>`:""}`;
}
function pkSwap(html,after){
  const w=$pk("pk-paneW"),p=$pk("pk-pane");if(!w||!p)return;
  const h0=w.getBoundingClientRect().height;w.style.height=h0+"px";p.classList.add("out");
  setTimeout(()=>{p.innerHTML=html;if(after)after();p.classList.remove("out");const h1=p.getBoundingClientRect().height;requestAnimationFrame(()=>{w.style.height=h1+"px"});setTimeout(()=>{w.style.height=""},520)},200);
}
function pkPaneHTML(){
  const m=PK.method,I=pkInfo();if(!m)return `<div class="pk-info">${pkIcon.lock}<span>Choose how you would like to pay. You will only be charged after you confirm.</span></div>`;
  if(m.type==="crypto"){
    const nets=m.networks||[];
    return `<div><span class="pk-f">Network</span>${nets.length>1?`<select class="pk-sel" id="pk-net">${nets.map(n=>`<option value="${n.id}">${pkEsc(n.label)}</option>`).join("")}</select>`:`<span class="pk-chip">${pkEsc(nets[0]?nets[0].label:"USDT")}</span>`}</div>
    <div class="pk-qr"><div><canvas id="pk-qr" width="150" height="150"></canvas></div></div>
    <div><span class="pk-f">Wallet address</span><div class="pk-addr"><input id="pk-addr" readonly value="${pkEsc(WALLETS[(nets[0]||{}).id||"bep20"]||"")}"><button class="pk-cp" data-copy="pk-addr">${pkIcon.copy}COPY</button></div></div>
    <div class="pk-info">${pkIcon.lock}<span>Send exactly <b style="color:#fff">$${I.price.toFixed(2)}</b> in USDT, then paste the transaction ID (TXID) below.</span></div>
    <div><span class="pk-f">Transaction ID</span><input class="pk-in" id="pk-txid" placeholder="0x…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>`;
  }
  if(m.type==="link"){
    if(PK.stage==="waiting")return `<div class="pk-wait"><div class="pk-spin"></div><div><b>Waiting for your payment</b><div style="opacity:.6;font-size:12.5px;margin-top:3px">Finish paying in the other tab, then come back and confirm.</div></div></div>
      <div class="pk-kv"><span>Reference</span><b>${pkEsc(PK.ref)}</b></div><button class="pk-cp" data-copy-text="${pkEsc(PK.ref)}" style="width:100%;justify-content:center">${pkIcon.copy}COPY REFERENCE</button>`;
    return `<div class="pk-info">${pkIcon.ext}<span>${pkEsc(m.note||"You will be taken to a secure checkout page.")}</span></div>`;
  }
  if(m.type==="manual"){
    const d=(m.details||[]).filter(x=>x[1]).map(x=>`<div class="pk-kv"><span>${pkEsc(x[0])}</span><b>${pkEsc(x[1])}</b></div>`).join("");
    return `<div class="pk-info">${pkIcon.bank}<span>${pkEsc(m.note||"")}</span></div><div>${d}<div class="pk-kv"><span>Amount</span><b>$${I.price.toFixed(2)}</b></div><div class="pk-kv"><span>Reference</span><b>${pkEsc(PK.ref)}</b></div></div>
    <div><span class="pk-f">Tracking number or note</span><input class="pk-in" id="pk-note" placeholder="e.g. last digits of the receipt" autocomplete="off"></div>`;
  }
  return "";
}
function pkSelect(id){
  if(PK.busy)return;const m=PHR_PAY.methods.find(x=>x.id===id);if(!m||!pkLive(m))return;
  if(PK.method&&PK.method.id===id)return;
  pkHap("light");PK.method=m;PK.stage="idle";pkErr("");
  document.querySelectorAll("#pk-ms .pk-m").forEach(b=>b.classList.toggle("on",b.dataset.id===id));
  pkSwap(pkPaneHTML(),()=>{if(m.type==="crypto"){const a=$pk("pk-addr");if(a)drawQR(a.value);const n=$pk("pk-net");if(n)n.onchange=()=>{a.value=WALLETS[n.value]||"";drawQR(a.value)}}});
  pkBtn();pkRenderTrust();
}
function pkRenderTrust(){const t=$pk("pk-trust");if(!t)return;const s=t.querySelector("span");if(s)s.textContent=PK.method&&PK.method.type==="crypto"?"Verified automatically on the blockchain":"Payments are confirmed before anything is activated"}
function pkBilling(an){
  if(PK.busy||PK.topup||!!isAnnual===an)return;pkHap("light");isAnnual=an;
  try{const t=$pk("prem-toggle");if(t)t.classList.toggle("on",an)}catch(e){}
  const I=pkInfo(),el=$pk("pk-pn"),from=PK.price,to=I.price,t0=performance.now();
  pkRender(); // re-render summary & methods (keeps selection)
  const pn=$pk("pk-pn");if(pn){(function f(t){const p=Math.min(1,(t-t0)/450),e=1-Math.pow(1-p,3);pn.textContent="$"+(from+(to-from)*e).toFixed(2);if(p<1)requestAnimationFrame(f)})(t0)}
  if(PK.method)pkSwap(pkPaneHTML(),()=>{if(PK.method.type==="crypto"){const a=$pk("pk-addr");if(a)drawQR(a.value)}});
  try{window.PHR_PLANS&&PHR_PLANS.sync()}catch(e){}
  pkBtn();
}
function pkCopy(b){
  const t=b.dataset.copy?($pk(b.dataset.copy)||{}).value:b.dataset.copyText;if(!t)return;
  const done=()=>{pkHap("success");const o=b.innerHTML;b.classList.add("ok");b.innerHTML=pkIcon.copy+"COPIED";setTimeout(()=>{b.classList.remove("ok");b.innerHTML=o},1400)};
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(done).catch(()=>{try{const i=document.createElement("input");i.value=t;document.body.appendChild(i);i.select();document.execCommand("copy");i.remove();done()}catch(e){}});
}
function pkErr(msg){const e=$pk("pk-err");if(!e)return;e.classList.remove("show");if(!msg){e.textContent="";return}e.textContent=msg;void e.offsetWidth;e.classList.add("show");e.scrollIntoView({block:"nearest",behavior:"smooth"});pkHap("error")}
function pkValidate(){
  const m=PK.method;if(!m)return;
  if(m.type==="crypto"){const i=$pk("pk-txid");if(i){const v=i.value.trim();i.classList.toggle("good",TXID_PATTERN.test(v));i.classList.toggle("bad",v.length>8&&!TXID_PATTERN.test(v)&&v.length>=66)}}
  pkBtn();
}
function pkBtn(){
  const b=$pk("pk-btn");if(!b)return;const m=PK.method,I=pkInfo();b.classList.toggle("load",PK.busy);
  let label="Choose a payment method",dis=true;
  if(m){
    if(m.type==="crypto"){const v=($pk("pk-txid")||{value:""}).value.trim();label=PK.busy?"Verifying on the blockchain…":"Confirm payment · $"+I.price.toFixed(2);dis=!TXID_PATTERN.test(v)}
    else if(m.type==="link"){label=PK.stage==="waiting"?(PK.busy?"Checking your payment…":"I have completed the payment"):"Continue to secure checkout · $"+I.price.toFixed(2);dis=false}
    else if(m.type==="manual"){label=PK.busy?"Sending…":"Submit payment for approval";dis=false}
  }
  b.textContent=label;b.disabled=dis||PK.busy&&false;if(PK.busy)b.disabled=false;
}
/* ---------------- flows ---------------- */
function pkPrimary(){
  const m=PK.method;if(!m||PK.busy)return;pkErr("");pkHap("light");
  if(m.type==="crypto")return pkVerifyCrypto();
  if(m.type==="link")return PK.stage==="waiting"?pkVerifyRemote("link"):pkOpenLink();
  if(m.type==="manual")return pkSubmitManual();
}
function pkRef(){return "PHR-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase()}
function pkPayload(extra){
  const I=pkInfo(),o={ref:PK.ref,methodId:PK.method&&PK.method.id,isAnnual:!!isAnnual&&!PK.topup,expectedAmount:I.exp};
  if(PK.topup)o.pack=PK.topup;else o.plan=PK.key;return Object.assign(o,extra||{});
}
async function pkPost(path,body,ms){
  const r=await fetchWithTimeout(WORKER_BASE_URL+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},ms||20000);
  if(r.status===404)return{ok:false,reason:"This payment method isn't active yet. Please choose another one."};
  return await r.json();
}
function pkFail(e){PK.busy=false;pkBtn();pkErr(typeof e==="string"?e:"Couldn't reach the server. Check your connection and try again.")}
async function pkVerifyCrypto(){
  const txid=($pk("pk-txid")||{value:""}).value.trim();
  if(!TXID_PATTERN.test(txid))return pkErr("That doesn't look like a transaction hash. It starts with 0x and is 66 characters long.");
  PK.busy=true;pkBtn();pkHap("double");let res;
  try{
    res=PK.topup?await pkPost("/api/verify-topup",{txHash:txid,pack:PK.topup},120000):await pkPost("/api/verify-payment",{txHash:txid,plan:PK.key,isAnnual:!!isAnnual,expectedAmount:pkInfo().exp},120000);
  }catch(e){return pkFail()}
  if(!res||!res.ok)return pkFail((res&&res.reason)||"Verification failed.");
  pkComplete(res,txid.substring(0,12)+"…");
}
function pkOpenLink(){
  const m=PK.method,I=pkInfo();PK.ref=PK.ref||pkRef();
  const url=String(m.url).replace(/\{(\w+)\}/g,(_,k)=>encodeURIComponent({ref:PK.ref,plan:PK.key||"",planName:PK.topup?"":PK.key?PLAN_KEY_NAME[PK.key]:"",amount:I.exp.toFixed(2),period:PK.topup?"once":isAnnual?"year":"month",topup:PK.topup||""}[k]||""));
  try{localStorage.setItem("phr_pay_pending",JSON.stringify({ref:PK.ref,methodId:m.id,key:PK.key,topup:PK.topup,an:!!isAnnual,ts:Date.now()}))}catch(e){}
  const w=window.open(url,"_blank","noopener");if(!w)location.href=url;
  PK.stage="waiting";pkSwap(pkPaneHTML());pkBtn();
}
async function pkVerifyRemote(kind){
  PK.busy=true;pkBtn();let res;
  try{res=await pkPost(PHR_PAY.endpoints[kind],pkPayload())}catch(e){return pkFail()}
  if(res&&res.pending){PK.busy=false;pkBtn();return pkErr(res.reason||"We haven't received the payment yet. Give it a minute and try again.")}
  if(!res||!res.ok)return pkFail((res&&res.reason)||"We couldn't confirm the payment.");
  try{localStorage.removeItem("phr_pay_pending")}catch(e){}
  pkComplete(res,PK.ref);
}
async function pkSubmitManual(){
  const note=(($pk("pk-note")||{}).value||"").trim();
  if(note.length<3)return pkErr("Add your tracking number or a short note so we can find the transfer.");
  PK.busy=true;pkBtn();let res;
  try{res=await pkPost(PHR_PAY.endpoints.manual,pkPayload({note}))}catch(e){return pkFail()}
  if(!res||!res.ok)return pkFail((res&&res.reason)||"We couldn't submit that.");
  PK.busy=false;pkDone({pending:true,title:"Payment received",sub:"We are checking your transfer. Your plan is activated as soon as it is approved.",feats:[],receipt:[["Reference",PK.ref],["Amount","$"+pkInfo().price.toFixed(2)],["Method",PK.method.label],["Status","Awaiting approval"]]});
}
function pkComplete(res,txShort){
  const I=pkInfo(),m=PK.method,date=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
  if(PK.topup){
    const pack=TOPUP_PACKS[PK.topup];extraSlots+=res.slots||pack.slots;localStorage.setItem("phraortes_extra_slots",String(extraSlots));
    billing.unshift({date:new Date().toLocaleDateString("en-GB"),item:pack.label,txid:txShort,amount:"$"+I.price.toFixed(2)+" · one-time"});
    localStorage.setItem("phraortes_billing",JSON.stringify(billing));try{renderBilling();updatePlanCTAs()}catch(e){}
    PK.busy=false;pendingTopupKey=null;
    return pkDone({title:"Slots added",sub:`+${res.slots||pack.slots} extra slots are in your account now.`,feats:[],receipt:[["Item",pack.label],["Amount","$"+I.price.toFixed(2)],["Method",m.label],["Date",date]]});
  }
  if(res.token)localStorage.setItem("phraortes_license",res.token);
  activePlan=PK.key;localStorage.setItem("phraortes_plan",activePlan);proSlotsUsed=0;trialCount=0;localStorage.setItem("phraortes_slots","0");localStorage.setItem("phraortes_trial","0");
  try{initPlanUI()}catch(e){}
  const per=isAnnual?"/ year":"/ month";
  billing.unshift({date:new Date().toLocaleDateString("en-GB"),item:I.name,txid:txShort,amount:"$"+I.price.toFixed(2)+" "+per});
  localStorage.setItem("phraortes_billing",JSON.stringify(billing));try{renderBilling()}catch(e){}
  PK.busy=false;
  pkDone({title:`Welcome to ${I.name}`,sub:"Your plan is active. Everything below is unlocked right now.",feats:PLAN_FEATURES[PK.key]||[],receipt:[["Plan",I.name+(isAnnual?" · annual":" · monthly")],["Amount","$"+I.price.toFixed(2)],["Method",m.label],["Date",date]]});
  try{window.PHR_PLANS&&PHR_PLANS.refresh()}catch(e){}
  setTimeout(()=>{try{if(typeof Notification==="undefined")return;if(Notification.permission==="granted")new Notification("Phraortes",{body:`${I.name} is now active.`,icon:"icon-192.png"});else if(Notification.permission!=="denied")Notification.requestPermission().then(p=>{if(p==="granted")new Notification("Phraortes",{body:`${I.name} is now active.`,icon:"icon-192.png"})})}catch(e){}},2500);
  try{playSound("chime")}catch(e){}
}
function pkDone(o){
  const ok=$pk("pk-ok");pkHap("success");PK.stage="done";
  const parts=Array.from({length:18},(_,i)=>{const a=i/18*Math.PI*2,r=70+Math.random()*34;return `<i style="--dx:${Math.cos(a)*r|0}px;--dy:${Math.sin(a)*r|0}px;animation-delay:${.35+Math.random()*.2}s"></i>`}).join("");
  ok.innerHTML=`<div class="pk-ok-in"><div class="pk-burst"><span class="ring"></span><span class="ring r2"></span>${parts}<div class="core">${o.pending?`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>`:`<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`}</div></div>
   <h2>${pkEsc(o.title)}</h2><p>${pkEsc(o.sub)}</p>
   ${o.feats&&o.feats.length?`<ul class="pk-un">${o.feats.map((f,i)=>`<li style="animation-delay:${.8+i*.12}s">${pkEsc(f)}</li>`).join("")}</ul>`:""}
   <div class="pk-rc">${o.receipt.map(r=>`<div class="pk-kv"><span>${pkEsc(r[0])}</span><b>${pkEsc(r[1])}</b></div>`).join("")}</div></div>
   <div class="pk-ok-bar"><button class="pk-btn" id="pk-done">${o.pending?"Done":"Start using Phraortes"}</button></div>`;
  ok.classList.add("show");$pk("pk-done").onclick=()=>closePayment();
}
/* ---------------- public API (names kept) ---------------- */
function openPayment(planName,fallbackPrice){
  pkBuild();if(!$pk("pk"))return;
  const key=PLAN_NAME_KEY[planName];
  PK.topup=null;pendingTopupKey=null;PK.key=key||null;
  if(!key){const pk=Object.keys(TOPUP_PACKS).find(k=>TOPUP_PACKS[k].label===planName);if(pk)PK.topup=pk;else{showToast("Unknown plan.","error");return}}
  pendingPlan=planName;pkOpen();
}
function openTopupPayment(packKey){
  const pack=TOPUP_PACKS[packKey];if(!pack)return;
  if(activePlan==="free"){showToast("Extra slots need the Plus plan or above.","error");openPremium();return}
  if(activePlan==="ultimate"){showToast("Max already has unlimited usage, so no top-up is needed.","error");return}
  pkBuild();PK.key=null;PK.topup=packKey;pendingTopupKey=packKey;pendingPlan=pack.label;pkOpen();
}
function pkOpen(){
  PK.color=PK.topup?"#E8C468":PLAN_COLOR[PK.key]||"#E8C468";PK.stage="idle";PK.busy=false;PK.ref=pkRef();PK.timers.forEach(clearTimeout);PK.timers=[];
  const live=PHR_PAY.methods.filter(pkLive);PK.method=live.length===1?live[0]:null; // a single option is pre-selected
  $pk("pk-ok").classList.remove("show");$pk("pk-ok").innerHTML="";pkErr("");
  pkRender();$pk("pk-pane").innerHTML=pkPaneHTML();$pk("pk-paneW").style.height="";
  if(PK.method&&PK.method.type==="crypto"){const a=$pk("pk-addr");if(a)setTimeout(()=>drawQR(a.value),30);const n=$pk("pk-net");if(n)n.onchange=()=>{a.value=WALLETS[n.value]||"";drawQR(a.value)}}
  pkBtn();
  const ov=$pk("payment-overlay");ov.classList.add("show");void ov.offsetWidth;requestAnimationFrame(()=>ov.classList.add("in"));
  $pk("pk-scroll").scrollTop=0;pkHap("light");
}
function closePayment(){
  const ov=$pk("payment-overlay");if(!ov)return;ov.classList.remove("in");PK.timers.forEach(clearTimeout);
  setTimeout(()=>{if(!ov.classList.contains("in"))ov.classList.remove("show")},420);
}
function drawQR(text){
  const canvas=$pk("pk-qr")||$pk("qr-canvas");if(!canvas)return;
  const css=parseInt(canvas.getAttribute("width"),10)||130,dpr=Math.min(3,window.devicePixelRatio||1);
  canvas.style.width=css+"px";canvas.style.height=css+"px";canvas.width=canvas.height=Math.round(css*dpr);
  const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;const size=canvas.width;
  ctx.fillStyle="#fff";ctx.fillRect(0,0,size,size);
  if(typeof qrcode==="undefined"||!text){ctx.fillStyle="#1a1a2e";ctx.font=Math.round(11*dpr)+"px sans-serif";ctx.textAlign="center";ctx.fillText("Copy the address below",size/2,size/2);return}
  try{const qr=qrcode(0,"M");qr.addData(text);qr.make();const n=qr.getModuleCount(),quiet=2,cell=Math.floor(size/(n+quiet*2)),off=Math.floor((size-cell*n)/2);ctx.fillStyle="#1a1a2e";for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(qr.isDark(r,c))ctx.fillRect(off+c*cell,off+r*cell,cell,cell)}}
  catch(e){ctx.fillStyle="#1a1a2e";ctx.font=Math.round(11*dpr)+"px sans-serif";ctx.textAlign="center";ctx.fillText("Copy the address below",size/2,size/2)}
}
function copyAddress(){const a=$pk("pk-addr");if(a&&navigator.clipboard)navigator.clipboard.writeText(a.value).then(()=>showToast("Address copied","success"))}
function verifyPayment(){pkPrimary()}
function renderBilling(){
  const list=document.getElementById("billing-scroll");if(!list)return;
  if(!billing.length){list.innerHTML=`<div style="text-align:center;padding:20px 0;color:#444;font-size:13px">No invoices yet</div>`;return}
  list.innerHTML=billing.map(b=>`<div class="billing-item"><div><div class="billing-plan">${pkEsc(b.item)}</div><div class="billing-tx">TX: ${pkEsc(b.txid)}</div></div><div class="billing-date">${pkEsc(b.date)}</div></div>`).join("");
}
/* a gateway can send people back with ?pay=return : reopen the checkout on the "waiting" step */
PHR_PAY.resume=function(){
  try{const p=JSON.parse(localStorage.getItem("phr_pay_pending")||"null");if(!p||Date.now()-p.ts>864e5)return;
    if(!/[?&]pay=return/.test(location.search))return;const m=PHR_PAY.methods.find(x=>x.id===p.methodId);if(!m||!pkLive(m))return;
    isAnnual=!!p.an;if(p.topup)openTopupPayment(p.topup);else openPayment(PLAN_KEY_NAME[p.key]);
    PK.ref=p.ref;pkSelect(m.id);setTimeout(()=>{PK.stage="waiting";pkSwap(pkPaneHTML());pkBtn()},300);
    history.replaceState(null,"",location.pathname)}catch(e){}
};
