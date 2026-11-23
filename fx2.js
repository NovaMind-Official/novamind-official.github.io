/* fx2.js — richer aurora, glass sheets, calm "recede" motion */
(function () {
  if (window.__fx2) return; window.__fx2 = 1;
  var css = [
    /* ---------- calm recede: no spring overshoot, no filter on the huge page ---------- */
    "html body main{transition:transform .42s cubic-bezier(.32,.72,0,1),opacity .32s ease;transform-origin:50% 0;will-change:auto}",
    "html body.phr-recede main{transform:scale(.965) translateY(6px);filter:none;border-radius:0;opacity:.45;pointer-events:none}",
    "html body.light-theme.phr-recede main{filter:none;opacity:.55}",
    /* soft scrim behind sheets */
    "body::after{content:'';position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.42);opacity:0;pointer-events:none;transition:opacity .34s ease}",
    "body.phr-recede::after{opacity:1}",
    "body.light-theme::after{background:rgba(40,30,10,.22)}",
    /* sheets slide with the same iOS curve */
    ".source-drawer-panel{transition:transform .42s cubic-bezier(.32,.72,0,1)!important}",

    /* ---------- glass ---------- */
    ".source-drawer-panel,#core-menu,#tools-menu,.drop-menu,#x4-pop{",
    "background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.03)),rgba(20,16,11,.58)!important;",
    "-webkit-backdrop-filter:blur(26px) saturate(1.7);backdrop-filter:blur(26px) saturate(1.7);",
    "border:1px solid rgba(255,255,255,.11)!important;",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 24px 60px rgba(0,0,0,.55)!important}",
    "body.light-theme .source-drawer-panel,body.light-theme #core-menu,body.light-theme #tools-menu,body.light-theme .drop-menu,body.light-theme #x4-pop{",
    "background:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,.5)),rgba(255,250,240,.6)!important;border-color:rgba(60,45,20,.12)!important;",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 20px 50px rgba(60,40,10,.18)!important}",
    ".source-drawer-panel .source-item-link{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08)}",

    /* ---------- aurora: fuller, with a drifting ribbon ---------- */
    "#aurora{opacity:.8}",
    "#aurora .a4{position:absolute;width:90vmax;height:18vmax;left:-25vmax;top:34vh;border-radius:50%;filter:blur(70px);",
    "background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--p) 38%,#ff7ab6 14%),color-mix(in srgb,var(--p) 20%,#7a4cff 30%),transparent);",
    "mix-blend-mode:screen;will-change:transform;animation:auR 44s ease-in-out infinite alternate;transform:rotate(-14deg)}",
    "@keyframes auR{0%{transform:rotate(-14deg) translate3d(-6vmax,0,0)}100%{transform:rotate(-6deg) translate3d(10vmax,-8vmax,0)}}",
    "body.ai-busy #aurora{opacity:1}",
    "body.light-theme #aurora{opacity:.38}",
    "@media(prefers-reduced-motion:reduce){#aurora .a4{animation:none}body::after{transition:none}html body main{transition:none}}"
  ].join("\n");
  var st = document.createElement("style"); st.id = "fx2-css"; st.textContent = css; document.head.appendChild(st);

  function addRibbon() {
    var a = document.getElementById("aurora");
    if (!a) return false;
    if (!a.querySelector(".a4")) { var i = document.createElement("i"); i.className = "a4"; a.appendChild(i); }
    return true;
  }
  if (!addRibbon()) { var n = 0, t = setInterval(function () { if (addRibbon() || ++n > 40) clearInterval(t); }, 250); }
})();
