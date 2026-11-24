/* acts2.js — pro "steps" card + bottom sheet, full AI replies, tiny "Show more" for long user messages */
(function () {
  if (window.__acts2) return; window.__acts2 = 1;

  /* ---------- icons (line, one per kind of work) ---------- */
  var P = {
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    page: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    cards: '<rect x="4" y="6" width="13" height="14" rx="2"/><path d="M8 3h11a1 1 0 0 1 1 1v12"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    flask: '<path d="M9 3h6M10 3v6L5 19a1 1 0 0 0 1 1.5h12a1 1 0 0 0 1-1.5l-5-10V3"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    ok: '<path d="M5 12l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chev: '<path d="M6 9l6 6 6-6"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (P[k] || P.spark) + '</svg>'; }
  function kind(t) {
    t = (t || "").toLowerCase();
    if (/backup|busy|switch|پشتیبان|شلوغ/.test(t)) return "swap";
    if (/search|source|web|look up|جست|منبع/.test(t)) return "web";
    if (/read(ing)? (your|the) (question|message)|خواندن سؤال|خواندن سوال/.test(t)) return "eye";
    if (/read|page|fetch|open|خوان|صفحه/.test(t)) return "page";
    if (/think|plan|weigh|about|بررسی|برنامه|سنجیدن|فکر/.test(t)) return "spark";
    if (/run|benchmark|execut|writing code|building a live code|python|javascript|اجرا|نوشتن کد/.test(t)) return "code";
    if (/chart|graph|plot|stat|number|dashboard|نمودار|آمار/.test(t)) return "chart";
    if (/quiz|flash|card|آزمون|فلش/.test(t)) return "cards";
    if (/circuit|wire|مدار|سیم/.test(t)) return "bolt";
    if (/chem|molecul|periodic|balanc|شیمی|مولکول|موازنه/.test(t)) return "flask";
    if (/writ|draft|answer|compar|نوشت/.test(t)) return "pen";
    return "spark";
  }
  function esc(s) { return (window.PHR_esc ? PHR_esc(s) : String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; })); }
  function sec(ms) { if (ms < 950) return "<1s"; var s = ms / 1000; return s < 10 ? s.toFixed(1) + "s" : Math.round(s) + "s"; }

  /* ---------- CSS ---------- */
  var css = [
    /* live card */
    ".act{border-radius:16px!important;border:1px solid rgba(232,196,104,.15)!important;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02)),rgba(20,16,10,.7)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 8px 26px rgba(0,0,0,.28);overflow:hidden}",
    ".act-inner{gap:0!important;padding:4px 14px 10px!important}",
    ".as-row{display:flex;align-items:center;gap:11px;padding:7px 0;position:relative;font-size:13px;line-height:1.35;color:rgba(235,225,200,.62);animation:slideUp .3s var(--ease)}",
    ".as-row:not(:last-child)::after{content:'';position:absolute;left:12px;top:32px;bottom:-7px;width:1px;background:rgba(232,196,104,.16)}",
    ".as-ic{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;flex:none;background:#1c170d;border:1px solid rgba(232,196,104,.2)}",
    ".as-ic svg{width:12.5px;height:12.5px;stroke:#d9b66a;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}",
    ".as-t{min-width:0;flex:1;overflow-wrap:anywhere}",
    ".as-r{margin-left:auto;font:500 10.5px 'Space Mono',monospace;color:rgba(235,225,200,.38);flex:none}",
    ".as-row.on{color:#fbefc9}.as-row.on .as-ic{border-color:#e8c468;background:#251c0b;box-shadow:0 0 12px rgba(232,196,104,.35)}",
    ".as-row.done .as-ic{background:rgba(111,191,138,.1);border-color:rgba(111,191,138,.35)}.as-row.done .as-ic svg{stroke:#7fd09a}",
    ".as-dots{display:flex;gap:3px}.as-dots i{width:4px;height:4px;border-radius:50%;background:#e8c468;animation:asB 1.1s infinite}.as-dots i:nth-child(2){animation-delay:.15s}.as-dots i:nth-child(3){animation-delay:.3s}",
    "@keyframes asB{0%,100%{opacity:.25}50%{opacity:1}}",
    /* finished pill */
    ".ad-pill{display:flex;align-items:center;gap:9px;max-width:100%;margin:2px 0 8px;padding:6px 12px 6px 7px;border-radius:999px;border:1px solid rgba(232,196,104,.2);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02)),rgba(22,17,9,.8);color:#d9cdb0;font:inherit;font-size:12.5px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s,border-color .2s}",
    ".ad-pill:active{transform:scale(.97);border-color:#e8c468}",
    ".ad-o{width:19px;height:19px;border-radius:50%;flex:none;display:grid;place-items:center;background:radial-gradient(circle at 35% 28%,#fff6d8,#e8c468 55%,#b8862f)}",
    ".ad-o svg{width:10px;height:10px;stroke:#3a2a08;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}",
    ".ad-pill b{font-weight:600;color:#f3e8cc}.ad-pill span{color:#8f866f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".ad-pill>svg{width:13px;height:13px;stroke:#bba76f;fill:none;stroke-width:2.2;stroke-linecap:round;transform:rotate(-90deg);flex:none}",
    /* sheet */
    "#as-sheet{position:fixed;inset:0;z-index:10050;display:none}#as-sheet.on{display:block}",
    "#as-scrim{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;transition:opacity .3s ease}",
    "#as-sheet.in #as-scrim{opacity:1}",
    "#as-card{position:absolute;left:50%;bottom:0;width:min(100%,440px);max-height:58vh;display:flex;flex-direction:column;transform:translate(-50%,100%);transition:transform .38s cubic-bezier(.32,.72,0,1);border-radius:24px 24px 0 0;padding:8px 16px calc(18px + env(safe-area-inset-bottom));",
    "background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.03)),rgba(24,19,11,.88);-webkit-backdrop-filter:blur(26px) saturate(1.6);backdrop-filter:blur(26px) saturate(1.6);border:1px solid rgba(232,196,104,.16);border-bottom:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 -20px 60px rgba(0,0,0,.55);color:#f3eee3}",
    "#as-sheet.in #as-card{transform:translate(-50%,0)}",
    "#as-grab{width:36px;height:4px;border-radius:4px;background:rgba(255,255,255,.22);margin:0 auto 12px;flex:none}",
    "#as-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex:none}",
    "#as-top .ad-o{width:28px;height:28px;box-shadow:0 0 14px rgba(232,196,104,.4)}#as-top .ad-o svg{width:13px;height:13px}",
    "#as-tt{font-size:14.5px;font-weight:600;line-height:1.2}#as-tt small{display:block;font-weight:400;font-size:11.5px;color:#8f866f;margin-top:2px}",
    "#as-x{margin-left:auto;width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.08);display:grid;place-items:center;cursor:pointer}",
    "#as-x svg{width:12px;height:12px;stroke:#cfc5ae;fill:none;stroke-width:2.2;stroke-linecap:round}",
    "#as-list{overflow:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px}",
    "#as-list .as-row{font-size:13px;color:#d3c9b0;animation:none}#as-list .as-row:last-child::after{display:none}",
    "#as-note{font-size:12px;line-height:1.6;color:rgba(235,225,200,.45);font-style:italic;border-inline-start:2px solid rgba(255,255,255,.1);padding-inline-start:10px;margin-top:8px}",
    "body.light-theme .ad-pill,body.light-theme .act{background:rgba(255,252,244,.8)!important;color:#3a3020}body.light-theme .ad-pill b{color:#2b2313}body.light-theme .as-row{color:rgba(60,48,26,.7)}",
    /* user bubble: tiny in-bubble "Show more" */
    ".msg.user .u-body.u-c{max-height:150px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 62%,transparent);mask-image:linear-gradient(#000 62%,transparent)}",
    ".u-more{display:block;margin:5px 0 -2px auto;padding:2px 0;background:none;border:0;font:500 11px/1.2 inherit;font-family:inherit;color:inherit;opacity:.62;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}",
    ".u-more:active{opacity:1}",
    "@media(prefers-reduced-motion:reduce){#as-card,#as-scrim{transition:none}.as-dots i{animation:none}}"
  ].join("\n");
  var st = document.createElement("style"); st.id = "acts2-css"; st.textContent = css; document.head.appendChild(st);

  /* ---------- live card rows ---------- */
  window.actRender = function (elId) {
    var a = (typeof ACT !== "undefined") ? ACT[elId] : null; if (!a) return;
    var box = document.getElementById(elId + "-ai"); if (!box) return;
    var n = a.steps.length;
    box.innerHTML = a.steps.map(function (s, i) {
      var running = !s.done && i === n - 1 && !a.finished;
      var cls = running ? "on" : "done";
      var right = running ? '<span class="as-r as-dots"><i></i><i></i><i></i></span>' : '<span class="as-r">' + sec(((a.steps[i + 1] ? a.steps[i + 1].t : Date.now()) - s.t)) + '</span>';
      return '<div class="as-row ' + cls + '"><span class="as-ic">' + svg(running ? kind(s.text) : "ok") + '</span><span class="as-t">' + esc(s.text) + '</span>' + right + '</div>';
    }).join("") + (a.reasoning ? '<div class="act-note" dir="auto">' + esc(a.reasoning.slice(-700)) + '</div>' : "");
  };

  /* ---------- finished record keeps per-step times ---------- */
  var oldFinish = window.actFinish;
  window.actFinish = function (elId) {
    var a = (typeof ACT !== "undefined") ? ACT[elId] : null; var times = [], texts = [];
    if (a) {
      var w = (typeof actT === "function" ? actT(a, "write") : "");
      a.steps.forEach(function (s, i) {
        if (s.text === w && i !== a.steps.length - 1) return;
        texts.push(s.text);
        times.push(Math.max(0, ((a.steps[i + 1] ? a.steps[i + 1].t : Date.now()) - s.t)));
      });
    }
    var rec = oldFinish ? oldFinish(elId) : null;
    if (rec && texts.length) { rec.steps = texts.slice(0, 12); rec.times = times.slice(0, 12); }
    return rec;
  };

  /* ---------- finished pill ---------- */
  var recs = {}; var rid = 0;
  window.actDoneHTML = function (rec) {
    if (!rec) return "";
    var T = (typeof ACT_T !== "undefined" && (ACT_T[rec.lang] || ACT_T.en)) || { thought: "Worked for", steps: "steps", step: "step" };
    var id = "r" + (++rid); recs[id] = rec;
    var n = rec.steps.length;
    var label = rec.lang === "fa" ? T.thought + " " + rec.secs + "s" : "Worked for " + rec.secs + "s";
    var sub = n > 1 ? " · " + n + " " + (rec.lang === "fa" ? T.steps : (n === 1 ? "step" : "steps")) : "";
    return '<button type="button" class="ad-pill" data-rec="' + id + '"><span class="ad-o">' + svg("ok") + '</span><b>' + esc(label) + '</b><span>' + esc(sub) + '</span><svg viewBox="0 0 24 24">' + P.chev + '</svg></button>';
  };

  /* ---------- bottom sheet ---------- */
  var sheet;
  function build() {
    if (sheet) return;
    sheet = document.createElement("div"); sheet.id = "as-sheet";
    sheet.innerHTML = '<div id="as-scrim"></div><div id="as-card" role="dialog" aria-label="Steps"><div id="as-grab"></div><div id="as-top"><span class="ad-o">' + svg("ok") + '</span><div id="as-tt"></div><button id="as-x" type="button" aria-label="Close">' + svg("x") + '</button></div><div id="as-list"></div></div>';
    document.body.appendChild(sheet);
    sheet.querySelector("#as-scrim").addEventListener("click", close);
    sheet.querySelector("#as-x").addEventListener("click", close);
    // swipe down on the handle area to close
    var card = sheet.querySelector("#as-card"), y0 = null, dy = 0;
    var head = sheet.querySelector("#as-grab"), top = sheet.querySelector("#as-top");
    [head, top].forEach(function (h) {
      h.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; dy = 0; card.style.transition = "none"; }, { passive: true });
      h.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); card.style.transform = "translate(-50%," + dy + "px)"; }, { passive: true });
      h.addEventListener("touchend", function () { if (y0 == null) return; card.style.transition = ""; card.style.transform = ""; if (dy > 70) close(); y0 = null; });
    });
  }
  function open(rec) {
    build();
    var n = rec.steps.length, fa = rec.lang === "fa";
    sheet.querySelector("#as-tt").innerHTML = esc(fa ? "فکر کرد " + rec.secs + "s" : "Worked for " + rec.secs + "s") + "<small>" + n + (fa ? " گام" : (n === 1 ? " step" : " steps")) + (fa ? " · انجام شد" : " · all done") + "</small>";
    sheet.querySelector("#as-list").innerHTML = rec.steps.map(function (t, i) {
      var tm = rec.times && rec.times[i] != null ? '<span class="as-r">' + sec(rec.times[i]) + '</span>' : "";
      return '<div class="as-row done"><span class="as-ic">' + svg(kind(t)) + '</span><span class="as-t">' + esc(t) + '</span>' + tm + '</div>';
    }).join("") + (rec.notes ? '<div id="as-note" dir="auto">' + esc(rec.notes) + '</div>' : "");
    sheet.classList.add("on");
    try { if (window.haptic) haptic("light"); } catch (e) { }
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add("in"); }); });
  }
  function close() {
    if (!sheet) return; sheet.classList.remove("in");
    setTimeout(function () { if (!sheet.classList.contains("in")) sheet.classList.remove("on"); }, 380);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".ad-pill"); if (!b) return;
    var r = recs[b.getAttribute("data-rec")]; if (r) open(r);
  });
  window.PHR_STEPS = { open: open, close: close };

  /* ---------- AI replies: always full ---------- */
  var oldRM = window.applyReadMore;
  window.applyReadMore = function (id) { /* AI answers are shown in full */ };

  /* ---------- user messages: tiny in-bubble "Show more" ---------- */
  function clampUser(el) {
    if (!el || el.dataset.rm) return;
    if (el.querySelector("img,audio,.phr-w,.gal")) { el.dataset.rm = "x"; return; }
    if (el.scrollHeight < 190) { el.dataset.rm = el.isConnected ? "0" : ""; return; }
    el.dataset.rm = "1";
    var body = document.createElement("div"); body.className = "u-body u-c";
    while (el.firstChild) body.appendChild(el.firstChild);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "u-more"; btn.textContent = "Show more";
    btn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var c = body.classList.toggle("u-c"); btn.textContent = c ? "Show more" : "Show less";
      try { if (window.haptic) haptic("light"); } catch (x) { }
    });
    el.appendChild(body); el.appendChild(btn);
  }
  function scan(root) {
    (root || document).querySelectorAll(".msg.user:not([data-rm])").forEach(function (el) { clampUser(el); });
  }
  var queued = 0;
  function later() { if (queued) return; queued = requestAnimationFrame(function () { queued = 0; scan(); }); }
  function hook() {
    var cb = document.getElementById("chat-box"); if (!cb) return false;
    new MutationObserver(later).observe(cb, { childList: true, subtree: true });
    scan(); return true;
  }
  if (!hook()) { var n = 0, t = setInterval(function () { if (hook() || ++n > 40) clearInterval(t); }, 250); }
})();
