/* stepsui.js — compact "Activity" pill + timeline for the agent's steps (replaces the wide plain list).
   Collapsed: a small glass pill (orb · live status · time). Open: a timeline with kind icons, check nodes and per-step time. */
(function () {
  "use strict";
  if (window.__stepsui) return; window.__stepsui = 1;
  var D = document;
  var IC = {
    search: '<path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    read: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    build: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    think: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    plan: '<path d="M5 6h14M5 12h14M5 18h9"/>',
    done: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  function kind(t) {
    t = String(t || "").toLowerCase();
    if (/search|source|web|fetch|page|look up|browse|جست|منبع|وب/.test(t)) return "search";
    if (/code|writ|script|test|debug|fix|html|css|js|کد|نوشت|تست/.test(t)) return "code";
    if (/read|open|file|document|photo|image|scan|attach|خواند|فایل|سند|عکس/.test(t)) return "read";
    if (/build|model|draw|render|3d|part|assembl|design|ساخت|مدل|طراحی|بکش/.test(t)) return "build";
    if (/plan|step|outline|organi|برنامه|مرحله|طرح/.test(t)) return "plan";
    return "think";
  }
  function svg(k) { return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + IC[k] + "</svg>"; }
  function esc(s) { return typeof window.PHR_esc === "function" ? window.PHR_esc(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function secs(ms) { return ms < 950 ? "" : ms < 59500 ? Math.round(ms / 100) / 10 + "s" : Math.floor(ms / 60000) + "m " + Math.round(ms % 60000 / 1000) + "s"; }

  var SPEC = {
    search:[{n:"lens",t:"sphere",r:.5,pos:[-.1,.15,0],color:"#bfe6ff",glass:true,opacity:.35,rough:.04},{n:"ring",t:"torus",R:.52,r:.085,pos:[-.1,.15,0],rot:[90,0,0],color:"#E8C468",metal:1,rough:.22},{n:"handle",t:"capsule",r:.1,h:.7,pos:[.5,-.45,0],rot:[0,0,45],color:"#E8C468",metal:1,rough:.25},{n:"shine",t:"sphere",r:.07,pos:[-.28,.38,.45],color:"#ffffff",emissive:"#ffffff",glow:2}],
    read:[{n:"back",t:"box",size:[1,.07,1.3],pos:[.14,0,-.1],rot:[75,20,0],color:"#d8cdb4",rough:.7},{n:"page",t:"box",size:[1,.08,1.3],pos:[0,0,.05],rot:[75,20,0],color:"#ffffff",rough:.5,emissive:"#ffffff",glow:.35},{n:"bar",t:"box",size:[.62,.02,.1],pos:[-.04,.3,.17],rot:[75,20,0],color:"#E8C468",emissive:"#E8C468",glow:.6},{n:"l1",t:"box",size:[.62,.02,.05],pos:[-.02,.1,.2],rot:[75,20,0],color:"#9a917f"},{n:"l2",t:"box",size:[.5,.02,.05],pos:[-.02,-.08,.22],rot:[75,20,0],color:"#9a917f"}],
    code:[{n:"body",t:"box",size:[1.4,1,.14],color:"#1f1d1a",metal:.55,rough:.3,rot:[8,-22,0]},{n:"bar",t:"box",size:[1.4,.14,.16],pos:[0,.43,.01],color:"#E8C468",metal:1,rough:.25,rot:[8,-22,0]},{n:"c1",t:"box",size:[.6,.07,.03],pos:[-.18,.1,.1],color:"#35d89a",emissive:"#35d89a",glow:1.6,rot:[8,-22,0]},{n:"c2",t:"box",size:[.8,.07,.03],pos:[-.05,-.08,.1],color:"#E8C468",emissive:"#E8C468",glow:1.4,rot:[8,-22,0]},{n:"c3",t:"box",size:[.45,.07,.03],pos:[-.25,-.26,.1],color:"#8ab4ff",emissive:"#8ab4ff",glow:1.4,rot:[8,-22,0]}],
    build:[{n:"a",t:"box",size:[.55,.55,.55],pos:[0,-.3,0],color:"#E8C468",metal:.9,rough:.25},{n:"b",t:"box",size:[.55,.55,.55],pos:[.58,-.3,0],color:"#f3eee4",metal:.1,rough:.4},{n:"c",t:"box",size:[.55,.55,.55],pos:[0,.28,0],color:"#4a86ff",metal:.4,rough:.2,emissive:"#2a5cff",glow:.4},{n:"d",t:"box",size:[.55,.55,.55],pos:[0,-.3,.58],color:"#35d89a",metal:.3,rough:.3}],
    think:[{n:"core",t:"sphere",r:.4,color:"#b48cff",emissive:"#8a5cff",glow:1.3,rough:.2},{n:"r1",t:"torus",R:.75,r:.04,rot:[70,0,0],color:"#E8C468",metal:1,rough:.2},{n:"r2",t:"torus",R:.75,r:.04,rot:[70,0,60],color:"#f3eee4",metal:1,rough:.2},{n:"s",t:"sphere",r:.09,pos:[.75,0,0],color:"#fff",emissive:"#fff",glow:2}],
    plan:[{n:"a",t:"box",size:[1.2,.22,.22],pos:[0,.45,0],color:"#E8C468",metal:.9,rough:.25,rot:[10,-20,0]},{n:"b",t:"box",size:[1.2,.22,.22],pos:[0,0,0],color:"#f3eee4",rough:.4,rot:[10,-20,0]},{n:"c",t:"box",size:[.8,.22,.22],pos:[-.2,-.45,0],color:"#4a86ff",emissive:"#2a5cff",glow:.4,rot:[10,-20,0]}],
    done:[{n:"disc",t:"cylinder",r:.75,h:.18,rot:[90,0,0],color:"#0fa968",metal:.5,rough:.25},{n:"c1",t:"box",size:[.2,.5,.12],pos:[-.24,-.1,.12],rot:[0,0,45],color:"#eafff5",emissive:"#eafff5",glow:.8},{n:"c2",t:"box",size:[.2,.9,.12],pos:[.12,.04,.12],rot:[0,0,-45],color:"#eafff5",emissive:"#eafff5",glow:.8}]
  };
  var ICONS = null, LSK = "phr_su_icons_v1";
  try { ICONS = JSON.parse(localStorage.getItem(LSK) || "null"); } catch (e) {}
  function applyIcons() {
    if (!ICONS) return;
    [].forEach.call(D.querySelectorAll(".su-n[data-k]"), function (n) { var k = n.getAttribute("data-k"); if (ICONS[k] && !n.__i && !n.getAttribute("data-i")) { n.__i = 1; n.innerHTML = '<img alt="" src="' + ICONS[k] + '">'; n.classList.add("g3"); } });
  }
  var making = false;
  function makeIcons() {
    if (ICONS || making || !window.PHR_MODEL3D || !window.PHR_MODEL3D.mount) return; making = true;
    var host = D.createElement("div"); host.style.cssText = "position:fixed;left:0;top:0;width:96px;height:96px;opacity:.01;pointer-events:none;z-index:-1"; D.body.appendChild(host);
    var out = {}, keys = Object.keys(SPEC), i = 0;
    (function next() {
      if (i >= keys.length) { try { localStorage.setItem(LSK, JSON.stringify(out)); } catch (e) {} ICONS = out; host.remove(); applyIcons(); return; }
      var k = keys[i++];
      try {
        host.innerHTML = ""; var a = window.PHR_MODEL3D.mount(host, { title: "", parts: SPEC[k] }, { look: "studio", noFloor: true });
        a.auto && a.auto(false); a.state.yaw = .55; a.state.pitch = .3;
        setTimeout(function () { try { var cv = host.querySelectorAll("canvas"); out[k] = cv[cv.length - 1].toDataURL("image/png"); } catch (e) {} try { a.destroy && a.destroy(); } catch (e) {} next(); }, 380);
      } catch (e) { next(); }
    })();
  }
  function css() {
    if (D.getElementById("su-css")) return; var s = D.createElement("style"); s.id = "su-css";
    s.textContent =
      ".act{width:auto;max-width:100%;border:0!important;background:none!important;box-shadow:none!important;border-radius:0!important;margin:2px 0 8px;position:relative;-webkit-backdrop-filter:none;backdrop-filter:none}.act::before{display:none!important}" +
      ".act-head{padding:3px 2px;gap:8px;width:fit-content}.act-head .phr-orb{width:18px;height:18px}.act-live{font-size:12.5px}.act-time{font-size:10.5px;opacity:.7}.act-chev{width:11px;height:11px}" +
      ".act-inner{border:0!important;padding:4px 0 2px!important;gap:0!important}" +
      ".su-t{display:flex;flex-direction:column;max-width:310px}" +
      ".su-r{display:flex;flex-wrap:wrap;align-items:center;gap:9px;padding:1px 0;font-size:12.5px;line-height:1.35;color:rgba(255,255,255,.5);cursor:pointer;-webkit-tap-highlight-color:transparent;animation:suIn .3s cubic-bezier(.2,.9,.3,1) both}" +
      ".su-n{flex:none;width:26px;height:26px;display:grid;place-items:center;color:rgba(255,255,255,.5)}.su-n.g3{filter:drop-shadow(0 4px 5px rgba(0,0,0,.45))}.su-n img{width:26px;height:26px;display:block}" +
      ".su-r.on{color:#fff}.su-r.on .su-n{animation:suBob 1.6s ease-in-out infinite}" +
      ".su-r.on .su-x{background:linear-gradient(90deg,#fff 30%,var(--p) 50%,#fff 70%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:actShimmer 2s linear infinite}" +
      ".su-x{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.su-s{flex:none;font:500 10px 'Space Mono',monospace;color:rgba(255,255,255,.3)}" +
      ".su-c{flex:none;width:7px;height:7px;border-right:1.5px solid rgba(255,255,255,.3);border-bottom:1.5px solid rgba(255,255,255,.3);transform:rotate(45deg);margin:0 3px 3px 2px;transition:transform .25s}.su-r.x .su-c{transform:rotate(-135deg);margin-bottom:-2px}" +
      ".su-d{display:grid;grid-template-rows:0fr;width:100%;transition:grid-template-rows .3s cubic-bezier(.2,.9,.3,1)}.su-r.x .su-d{grid-template-rows:1fr}.su-d>div{overflow:hidden}" +
      ".su-d p{margin:2px 0 6px 35px;padding-left:10px;border-left:1.5px solid rgba(232,196,104,.4);font-size:11.5px;line-height:1.5;color:rgba(255,255,255,.62);white-space:normal}.su-d p em{font-style:normal;color:var(--p);font-weight:600}" +
      ".su-r.done .su-n{opacity:.95}.su-r.done .su-x{color:rgba(255,255,255,.62)}" +
      "details.act-done{width:fit-content;max-width:100%;border:0!important;background:none!important;box-shadow:none!important;border-radius:0!important;margin:0 0 8px}details.act-done>summary{padding:3px 2px;font-size:12px;gap:7px}details.act-done .act-inner{border:0}" +
      "@keyframes suIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}@keyframes suBob{50%{transform:translateY(-2px) rotate(-4deg)}}" +
      "@media(prefers-reduced-motion:reduce){.su-r,.su-r.on .su-n{animation:none}}";
    D.head.appendChild(s);
  }
  var LBL = { search: "Search", code: "Code", read: "Reading", build: "Building", plan: "Planning", think: "Thinking" };
  function row(text, st, ms, note) {
    var k = kind(text), has = ICONS && ICONS[k];
    return '<div class="su-r ' + st + '"><span class="su-n' + (has ? " g3" : "") + '" data-k="' + k + '"' + (has ? " data-i=1" : "") + '>' + (has ? '<img alt="" src="' + ICONS[k] + '">' : svg(k)) + '</span><span class="su-x">' + esc(text) + '</span><span class="su-s">' + (ms || "") + '</span><i class="su-c"></i><div class="su-d"><div><p><em>' + LBL[k] + "</em>" + (ms ? " · " + ms : "") + "<br>" + esc(note || text) + "</p></div></div></div>";
  }
  D.addEventListener("click", function (e) { var r = e.target.closest && e.target.closest(".su-r"); if (r) r.classList.toggle("x"); });
  function patch() {
    if (typeof window.actRender !== "function" || window.actRender.__su) return !!(window.actRender && window.actRender.__su);
    var ACTg = function () { try { return (0, eval)("ACT"); } catch (e) { return null; } };
    var r = function (elId) {
      var A = ACTg(), a = A && A[elId]; if (!a) return;
      var box = D.getElementById(elId + "-ai"); if (!box) return;
      var n = a.steps.length;
      box.innerHTML = '<div class="su-t">' + a.steps.map(function (st, i) {
        var on = !st.done && i === n - 1 && !a.finished, nx = a.steps[i + 1], dur = secs(((nx && nx.t) || (on ? Date.now() : (st.t + 1200))) - st.t);
        return row(st.text, on ? "on" : "done", on ? "" : dur, "");
      }).join("") + "</div>";
      applyIcons();
    };
    r.__su = 1; window.actRender = r;
    var oD = window.actDoneHTML;
    if (typeof oD === "function") {
      window.actDoneHTML = function (rec) {
        if (!rec) return "";
        var T = (typeof ACT_T !== "undefined" && ACT_T[rec.lang]) || { thought: "Worked for", step: "step", steps: "steps" }, n = rec.steps.length;
        return '<details class="act-done"><summary><span class="sp">✦</span>' + T.thought + " " + rec.secs + "s" + (n > 1 ? " · " + n + " " + (n === 1 ? T.step : T.steps) : "") + '</summary><div class="act-inner"><div class="su-t">' + rec.steps.map(function (t) { return row(t, "done", ""); }).join("") + "</div></div></details>"; 
      };
    }
    return true;
  }
  css(); setTimeout(makeIcons, 1500); setTimeout(applyIcons, 1600);
  if (!patch()) { var n = 0, t = setInterval(function () { if (patch() || ++n > 80) clearInterval(t); }, 250); }
  window.PHR_STEPSUI = { kind: kind, row: row };
})();
