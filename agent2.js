/* agent2.js — Agent Pro: Do-it mode, Shortcuts bridge, See & do (vision), 3D routing, hub sheet.
   Needs: hands.js (PHR_HANDS.card), agent.js (PHR_AGENT), brain.js (PHR_BRAIN.pick), wake.js, model3d.js (optional). */
(function () {
  "use strict";
  if (window.__agent2) return; window.__agent2 = 1;
  var D = document, W = window;
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fa(s) { return /[؀-ۿ]/.test(s || ""); }
  var RISK = /\b(book|reserve|buy|purchase|pay|transfer|delete|cancel|publish|tweet|submit|invite|wipe|erase)\b|بفرست|ایمیل|رزرو|بخر|پرداخت|حذف|پاک|لغو|منتشر|تماس|زنگ بزن|ثبت سفارش|واریز/i;
  var on = function (k, d) { var v = LS(k); return v == null ? d : v === "1"; };
  var wakeOn = function () { try { var s = W.PHR_WAKE && W.PHR_WAKE.state(); return !!(s && s.on) } catch (e) { return false } };

  /* ───── 1. Do-it mode: open the app by itself when the agent speaks the action ───── */
  var hidden = false;
  D.addEventListener("visibilitychange", function () { if (D.visibilityState === "hidden") hidden = true });
  W.addEventListener("pagehide", function () { hidden = true });
  function auto(card) {
    if (!on("phr_doit", true) || !card || card.__a2) return; card.__a2 = 1;
    var a = card.querySelector("a.agh-b[href]"); if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^(blob:|data:|javascript:|#)/i.test(href) || a.hasAttribute("download") || a.target === "_blank" && /^https?:/i.test(href)) return;
    if (!wakeOn() && !on("phr_doit_all", false)) return;
    if (RISK.test(card.textContent || "")) { note(card, "Sensitive action — tap to confirm"); return; }
    hidden = false;
    setTimeout(function () {
      try { a.click(); } catch (e) {}
      setTimeout(function () {
        if (!hidden && D.visibilityState === "visible" && card.parentNode) note(card, "iOS wants one tap here");
      }, 1400);
    }, 350);
  }
  function note(card, t) {
    try { var s = card.querySelector("small"); if (s) s.textContent = t + " · " + s.textContent; else { var d = card.firstChild; var m = D.createElement("small"); m.textContent = t; d.appendChild(m); } } catch (e) {}
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.classList && n.classList.contains("agh-c")) auto(n); }); });
  }).observe(D.documentElement, { childList: true, subtree: true });

  /* ───── 4. Shortcuts bridge ───── */
  function sc() { try { return JSON.parse(LS("phr_shortcuts") || "[]") } catch (e) { return [] } }
  function scSave(a) { LS("phr_shortcuts", JSON.stringify(a.slice(0, 40))); }
  function runShortcut(name, input) {
    var back = location.origin + location.pathname + "#agent-done=" + encodeURIComponent(name);
    var u = "shortcuts://x-callback-url/run-shortcut?name=" + encodeURIComponent(name) + (input ? "&input=text&text=" + encodeURIComponent(input) : "") +
      "&x-success=" + encodeURIComponent(back) + "&x-cancel=" + encodeURIComponent(back + "&cancelled=1") + "&x-error=" + encodeURIComponent(back + "&error=1");
    var H = W.PHR_HANDS; if (!H || !H.card) { location.href = u; return; }
    H.card((fa(name) ? "اجرای شورتکات: " : "Run Shortcut: ") + name, fa(name) ? "بعد از اتمام برمی‌گردم" : "I'll be here when it finishes", fa(name) ? "اجرا" : "Run", null, { href: u, ttl: 60000 });
  }
  function matchShortcut(t) {
    var s = String(t || "").trim().replace(/[.!؟?]+$/, ""), m, name = null, list = sc();
    if ((m = s.match(/^(?:please\s+)?(?:run|start|launch|execute|do)\s+(?:my\s+|the\s+)*shortcut\s+(.+)$/i)) || (m = s.match(/^shortcut\s+(.+)$/i))) name = m[1];
    else if ((m = s.match(/^(?:شورتکات|میانبر)\s+(.+?)(?:\s+(?:را|رو))?(?:\s+اجرا(?:\s+کن)?)?$/)) || (m = s.match(/^(?:اجرا کن|اجرا)\s+(?:شورتکات|میانبر)\s+(.+)$/)) || (m = s.match(/^(.+?)\s+(?:را|رو)?\s*(?:شورتکات|میانبر)\s*(?:اجرا کن)?$/))) name = m[1];
    else if ((m = s.match(/^(?:please\s+)?(?:run|start|launch|execute|اجرا کن)\s+(.+)$/i))) {
      var q = m[1].toLowerCase().replace(/^(?:my|the)\s+/, ""); for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === q) return list[i];
      return null;
    }
    if (!name) return null; name = name.trim();
    for (var j = 0; j < list.length; j++) if (list[j].toLowerCase() === name.toLowerCase()) return list[j];
    return name;
  }
  /* returning from a Shortcut: the app reopens with #agent-done=… */
  function backFromShortcut() {
    var m = /#agent-done=([^&]*)(.*)$/.exec(location.hash || ""); if (!m) return;
    var name = decodeURIComponent(m[1]), bad = /error=1/.test(m[2]), canc = /cancelled=1/.test(m[2]);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; }
    var msg = bad ? "Shortcut “" + name + "” hit an error." : canc ? "Shortcut “" + name + "” was cancelled." : "Shortcut “" + name + "” is done.";
    try { W.showToast && W.showToast(msg); } catch (e) {}
    try { if (W.PHR_WAKE && W.PHR_WAKE.state().on && W.auraSpeak) { W.auraSpeak(msg); } } catch (e) {}
  }
  setTimeout(backFromShortcut, 700); W.addEventListener("hashchange", backFromShortcut);

  /* ───── 7. See & do: camera/photo + instruction ───── */
  var SEE = /^(?:please\s+)?(?:look at|see|scan|read|check|analy[sz]e|inspect)\s+(?:this|that|my|the)\b|^take a (?:photo|picture)|^(?:اینو|این رو|این را)?\s*(?:ببین|نگاه کن|اسکن کن)|^عکس بگیر/i;
  function seeAndDo(instr) {
    var B = W.PHR_BRAIN; if (!B || !B.pick) return false;
    var i = (instr || "").trim(); if (!i || SEE.test(i) && i.split(/\s+/).length < 5) i = "Look at this image carefully. Say what it is, then do the most useful thing with it (extract text, events, numbers, to-dos or fix what is wrong) and offer next steps.";
    else i = i + " (use the attached image)";
    return B.pick(i, fa(i) ? "چی رو ببینم؟" : "What should I look at?");
  }

  /* ───── wrap the agent: shortcuts + vision first ───── */
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__a2) return false; A.__a2 = 1;
    var oT = A.typed, oV = A.voice;
    function handle(t) {
      try {
        var n = matchShortcut(t); if (n) { runShortcut(n); return (fa(n) ? "شورتکات " : "Running shortcut ") + n; }
        if (SEE.test(String(t).trim())) { if (seeAndDo(t)) return fa(t) ? "یه لمس بزن: عکس بگیر یا انتخاب کن." : "Tap Camera or Photos and I'll take it from there."; }
      } catch (e) {}
      return false;
    }
    var oP = A.prompt;
    A.prompt = function (t) { var b = oP.apply(this, arguments); try { if (on("phr_3d", true) && W.PHR_MODEL3D && OBJ.test(t || "") && !NOT.test(t || "")) b += OVR; } catch (e) {} return b; };
    A.typed = function (t) { return handle(t) || oT.apply(this, arguments); };
    A.voice = function (t, q) { var r = handle(t); if (r) { if (q) return r; try { W.auraSetCaption && W.auraSetCaption(r, "hint"); W.auraSpeak && W.auraSpeak(r) } catch (e) {} return true } return oV.apply(this, arguments); };
    return true;
  }
  (function wait(n) { if (!install() && n < 120) setTimeout(function () { wait(n + 1) }, 150) })(0);

  /* ───── 3D routing: give the model the 3D-modeller prompt for object requests ───── */
  var OBJ = /(\bdraw\b|\bsketch\b|\bdesign\b|\bmodel\b|\brender\b|\b3d\b|\b(?:make|create|build|generate|show)\b|بکش|طراحی|نقاشی|سه ?بعدی|مدل|بساز|بسازی|ساختن|درست کن|نشان بده)/i;
  var NOT = /(poster|wallpaper|logo|avatar|photo|picture|image|pic\b|portrait|banner|icon|\bui\b|landing|website|web ?page|\bapp\b|screen|code|script|game|table|chart|plan|document|doc\b|deck|slides|email|essay|story|song|پوستر|والپیپر|لوگو|آواتار|عکس|تصویر|بنر|آیکون|صفحه|سایت|برنامه|کد|بازی|جدول|نمودار|طرح|سند|ایمیل|داستان)/i;
  var OVR = "\n\n3D OVERRIDE: for a physical object, vehicle, creature, building or machine (e.g. rocket, car, robot, house) ALWAYS answer with a ```model3d block. NEVER use the ```imagine block or SVG for these, even if an earlier rule says to make images; use imagine only if the user explicitly says image, photo, picture, poster, wallpaper or logo.";
  function wrapGuide() {
    var old = W.stemGuide; if (typeof old !== "function" || old.__a2) return false;
    var w = function (c, txt) {
      var g = ""; try { g = old.apply(this, arguments); } catch (e) { g = ""; }
      try { if (on("phr_3d", true) && W.PHR_MODEL3D && OBJ.test(txt || "") && !NOT.test(txt || "")) g += "\n\n" + W.PHR_MODEL3D.prompt() + OVR; } catch (e) {}
      return g;
    };
    w.__a2 = 1; W.stemGuide = w; return true;
  }
  if (!wrapGuide()) { var n3 = 0, t3 = setInterval(function () { if (wrapGuide() || ++n3 > 60) clearInterval(t3); }, 500); }

  /* ───── hub sheet ───── */
  function css() {
    if (D.getElementById("a2-css")) return; var s = D.createElement("style"); s.id = "a2-css";
    s.textContent = "#a2{position:fixed;inset:0;z-index:9400;display:none;align-items:flex-end;justify-content:center;background:rgba(6,5,3,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:-apple-system,'Inter Tight','Vazirmatn',sans-serif}#a2.on{display:flex}" +
      "#a2 .p{width:min(560px,100%);max-height:88vh;overflow:auto;background:#14110c;border:1px solid rgba(232,196,104,.35);border-radius:24px 24px 0 0;padding:18px 18px calc(22px + env(safe-area-inset-bottom));color:#f3eee4}" +
      "#a2 h3{margin:0 0 2px;font-size:19px;letter-spacing:-.01em}#a2 .sub{opacity:.6;font-size:12.5px;margin-bottom:12px;display:block}" +
      "#a2 .r{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)}#a2 .r div{flex:1;min-width:0}#a2 .r b{display:block;font-size:14px}#a2 .r small{display:block;opacity:.58;font-size:12px;margin-top:2px;line-height:1.35}" +
      "#a2 .sw{flex:none;width:46px;height:28px;border-radius:99px;background:rgba(255,255,255,.14);position:relative;border:0;cursor:pointer}#a2 .sw:after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:.2s}#a2 .sw.on{background:#E8C468}#a2 .sw.on:after{left:21px;background:#15110a}" +
      "#a2 .btn{flex:none;border:0;border-radius:99px;padding:9px 14px;background:#E8C468;color:#15110a;font:700 13px -apple-system,sans-serif;cursor:pointer}#a2 .btn.g{background:rgba(255,255,255,.1);color:#f3eee4}" +
      "#a2 .chips{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0}#a2 .chip{display:inline-flex;gap:8px;align-items:center;padding:7px 8px 7px 12px;border-radius:99px;background:rgba(255,255,255,.08);font-size:13px}#a2 .chip button{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:50%;width:20px;height:20px;line-height:1;cursor:pointer}" +
      "#a2 .add{display:flex;gap:8px}#a2 input[type=text]{flex:1;min-width:0;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;padding:0 12px;font:500 14px -apple-system,sans-serif}" +
      "#a2 .eg{font-size:12px;opacity:.55;margin-top:8px;line-height:1.5}";
    D.head.appendChild(s);
  }
  var ROWS = [
    ["phr_doit", true, "Do-it mode", "With voice on, I open apps and links myself — no extra tap from me. iOS may still show its own “Open in …?” prompt; sending, paying or deleting always waits for your tap."],
    ["phr_follow", true, "Live conversation", "After I answer, I keep listening for a few seconds so you can just keep talking. Say “that's all” to end."],
    ["phr_3d", true, "3D models", "“Draw a rocket” becomes a real 3D model you can rotate, explode, refine and export."]
  ];
  function render() {
    var o = D.getElementById("a2"), list = sc();
    o.querySelector(".p").innerHTML = "<h3>Agent Pro</h3><span class='sub'>Do things by voice, stay in the conversation.</span>" +
      ROWS.map(function (r, i) { return "<div class='r'><div><b>" + r[2] + "</b><small>" + r[3] + "</small></div><button class='sw" + (on(r[0], r[1]) ? " on" : "") + "' data-k='" + r[0] + "' aria-label='" + r[2] + "'></button></div>"; }).join("") +
      "<div class='r' style='display:block'><b style='font-size:14px'>My Shortcuts</b><small style='opacity:.58;font-size:12px;display:block;margin:2px 0 4px'>Add the exact name of a Shortcut you made in the Shortcuts app, then say “run shortcut …”. I'll know when it finishes.</small>" +
      "<div class='chips'>" + (list.map(function (n, i) { return "<span class='chip'>" + esc(n) + "<button data-d='" + i + "' aria-label='Remove'>✕</button></span>"; }).join("") || "<small style='opacity:.5'>none yet</small>") + "</div>" +
      "<div class='add'><input type='text' id='a2-n' placeholder='Shortcut name' autocapitalize='off'><button class='btn' id='a2-add'>Add</button></div><div class='eg'>Try: “run shortcut Morning routine”, or just “run Morning routine”.</div></div>" +
      "<div class='r'><div><b>See &amp; do</b><small>Take or pick a photo and I act on it: read, extract, fix, plan.</small></div><button class='btn' id='a2-see'>Open</button></div>" +
      "<div class='r' style='border:0'><div></div><button class='btn g' id='a2-x'>Close</button></div>";
    var p = o.querySelector(".p");
    p.querySelectorAll(".sw").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-k"), d = ROWS.filter(function (r) { return r[0] === k })[0][1]; LS(k, on(k, d) ? "0" : "1"); b.classList.toggle("on"); }; });
    p.querySelectorAll("[data-d]").forEach(function (b) { b.onclick = function () { var a = sc(); a.splice(+b.getAttribute("data-d"), 1); scSave(a); render(); }; });
    p.querySelector("#a2-add").onclick = function () { var v = p.querySelector("#a2-n").value.trim(); if (!v) return; var a = sc(); if (a.indexOf(v) < 0) a.push(v); scSave(a); render(); };
    p.querySelector("#a2-see").onclick = function () { close(); seeAndDo(""); };
    p.querySelector("#a2-x").onclick = close;
  }
  function open() { css(); var o = D.getElementById("a2"); if (!o) { o = D.createElement("div"); o.id = "a2"; o.innerHTML = "<div class='p'></div>"; o.addEventListener("click", function (e) { if (e.target === o) close(); }); D.body.appendChild(o); } render(); o.classList.add("on"); }
  function close() { var o = D.getElementById("a2"); if (o) o.classList.remove("on"); }
  function tile() {
    var g = D.querySelector("#tools-menu .tools-grid"); if (!g || g.querySelector("[data-a2]")) return !!g;
    var t = D.createElement("div"); t.className = "tool-tile"; t.setAttribute("data-a2", "1"); t.style.setProperty("--tile-color", "#E8C468");
    t.innerHTML = '<i class="tt-ic"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg></i><span class="tt-n">Agent Pro</span><small class="tt-s">Do-it, shortcuts, vision</small>';
    t.addEventListener("click", function () { try { W.closeAllDropMenus && W.closeAllDropMenus(); } catch (e) {} open(); });
    g.insertBefore(t, g.firstChild); return true;
  }
  function boot() { tile(); }
  if (D.readyState !== "loading") boot(); else D.addEventListener("DOMContentLoaded", boot);
  var k = 0, iv = setInterval(function () { boot(); if (++k > 20) clearInterval(iv); }, 800);

  W.PHR_AGENT2 = { open: open, runShortcut: runShortcut, shortcuts: sc, see: seeAndDo, match: matchShortcut, _auto: auto };
})();
