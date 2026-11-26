/* plan2.js — Plan → Approve → Run.
   Replaces the ```plan board: the agent first shows a DRAFT (editable steps, time estimate per step and in total, flags for
   steps that would send / book / pay / delete / publish). Nothing runs until the user taps Approve. Risky steps still pause for a
   per-step OK, and the model is told to prepare them only (never to send/book on its own). */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders || window.__plan2) return; window.__plan2 = 1;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function inline(s) { return window.PHR_inline ? window.PHR_inline(s) : esc(s); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function toFa(n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  function busy() { return typeof window.PHR_busy === "function" ? window.PHR_busy() : false; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var RISK = /\b(send|email|e-mail|mail|book|reserve|buy|purchase|pay|transfer|delete|cancel|post|publish|tweet|submit|call|invite)\b|ارسال|بفرست|ایمیل|پیام بده|رزرو|بخر|خرید|سفارش|پرداخت|واریز|حذف|پاک|لغو|منتشر|پست کن|تماس بگیر|دعوت|اشتراک/i;
  var S = {
    en: { draft: "Plan · draft", running: "Plan · running", done: "Plan · done", approve: "Approve & run", stepwise: "Step by step", add: "Add step", est: "Estimated", min: "min", sec: "s", edit: "Edit", needs: "Needs your OK", allow: "Allow this step", skip: "Skip step", stop: "Stop", reset: "Reset", ready: "Plan complete", nothing: "Nothing runs until you approve.", next: "Run next", all: "Run all", ph: "Describe the step", locked: "Approved", risky: "Will not send, book or pay without asking you", paused: "Paused for your OK" },
    fa: { draft: "پلن · پیش‌نویس", running: "پلن · در حال اجرا", done: "پلن · کامل", approve: "تأیید و اجرا", stepwise: "گام‌به‌گام", add: "افزودن گام", est: "زمان تخمینی", min: "دقیقه", sec: "ثانیه", edit: "ویرایش", needs: "نیاز به تأیید تو", allow: "اجازه برای این گام", skip: "رد کردن گام", stop: "توقف", reset: "از اول", ready: "پلن کامل شد", nothing: "تا تأیید نکنی هیچ چیزی اجرا نمی‌شود.", next: "اجرای بعدی", all: "اجرای همه", ph: "گام را بنویس", locked: "تأییدشده", risky: "بدون پرسیدن از تو چیزی ارسال، رزرو یا پرداخت نمی‌شود", paused: "منتظر تأیید تو" }
  };
  function mins(e) { var m = String(e || "").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).match(/~?\s*(\d+(?:\.\d+)?)\s*(s|sec|m|min|h|hr|ثانیه|دقیقه|ساعت)?/i); if (!m) return 0; var v = parseFloat(m[1]), u = (m[2] || "m").toLowerCase(); return /^(s|sec|ثانیه)/.test(u) ? v / 60 : /^(h|hr|ساعت)/.test(u) ? v * 60 : v; }
  function parse(raw) {
    var top = {}, steps = [];
    String(raw || "").replace(/\r/g, "").split("\n").forEach(function (ln) {
      var m = ln.match(/^\s*(?:[-*]|\d+[.)])\s*(?:\[([ xX~!\/])\]\s*)?(.+)$/);
      var k = ln.match(/^\s*(id|goal|title|auto|lang)\s*:\s*(.*)$/i);
      if (k && !m) { top[k[1].toLowerCase()] = k[2].trim(); return; }
      if (!m) { if (k) top[k[1].toLowerCase()] = k[2].trim(); return; }
      var c = (m[1] || " ").toLowerCase(), p = m[2].split(/\s\|\s/), t = p[0].trim(), n = "", e = "";
      p.slice(1).forEach(function (x) { x = x.trim(); if (/^~?\s*[\d۰-۹]+(\.\d+)?\s*(s|sec|m|min|h|hr|ثانیه|دقیقه|ساعت)?$/i.test(x)) e = x; else if (!n) n = x; });
      steps.push({ t: t, n: n, e: e, s: c === "x" ? "x" : c === "~" || c === "/" ? "r" : c === "!" ? "f" : "" });
    });
    return { top: top, steps: steps };
  }
  var CSS = ".p2{padding:14px 14px 4px;color:#F4EBDD}.p2-g{font-size:16px;font-weight:650;line-height:1.55;margin:0 0 4px}.p2-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font:600 11.5px 'Space Grotesk','Vazirmatn',sans-serif;opacity:.75;margin:4px 0 10px}.p2-chip{padding:4px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06)}.p2-chip.w{border-color:rgba(244,217,139,.45);color:#F4D98B}.p2-chip.ok{border-color:rgba(88,196,143,.5);color:#7be0ae}" +
    ".p2-m{height:4px;border-radius:2px;background:rgba(255,255,255,.12);margin:2px 0 12px;overflow:hidden}.p2-m i{display:block;height:100%;width:0;background:linear-gradient(90deg,#F4D98B,#C79A3E);transition:width .5s}" +
    ".p2-s{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}.p2-s:first-child{border-top:0}.p2-n{flex:none;width:24px;height:24px;border-radius:50%;border:1.5px solid rgba(255,255,255,.28);display:grid;place-items:center;font:700 11px 'IBM Plex Mono',monospace;margin-top:1px}.p2-s.x .p2-n{background:linear-gradient(135deg,#F4D98B,#C79A3E);border-color:transparent;color:#1a1206}.p2-s.r .p2-n{border-color:#F4D98B;border-top-color:transparent;animation:agspin 1s linear infinite}.p2-s.f .p2-n{border-color:#ff6b5a;color:#ff6b5a}.p2-s.k .p2-n{border-color:#aaa;color:#aaa}" +
    ".p2-b{flex:1;min-width:0}.p2-t{font-size:14.5px;line-height:1.6;word-break:break-word}.p2-s.x .p2-t{opacity:.55;text-decoration:line-through}.p2-nt{display:block;font-size:12.5px;opacity:.6;margin-top:2px}.p2-tags{display:flex;gap:6px;margin-top:5px;flex-wrap:wrap}.p2-tag{font:600 10.5px 'Space Grotesk','Vazirmatn',sans-serif;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.07);opacity:.85}.p2-tag.risk{background:rgba(255,166,0,.16);color:#ffb84d}" +
    ".p2-ed{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:11px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;font:14.5px/1.5 inherit;outline:0;resize:none;-webkit-user-select:text;user-select:text}.p2-ctl{flex:none;display:flex;flex-direction:column;gap:2px}.p2-ctl button{width:28px;height:26px;border:0;border-radius:8px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);font-size:12px;cursor:pointer}" +
    ".p2-ok{margin:0 14px 10px;padding:12px;border-radius:14px;border:1px solid rgba(255,166,0,.45);background:rgba(255,166,0,.09);font-size:13.5px;line-height:1.6}.p2-ok .row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.p2-bar{display:flex;gap:8px;padding:6px 14px 14px;flex-wrap:wrap;align-items:center}.p2-sp{flex:1}.p2-note{padding:0 14px 12px;font-size:11.5px;opacity:.5}";
  (function () { var s = document.createElement("style"); s.id = "p2-css"; s.textContent = CSS; document.head.appendChild(s); })();

  W.builders.plan = function (root) {
    var lg = root._lang === "fa" ? "fa" : "en", T = S[lg], num = function (n) { return lg === "fa" ? toFa(n) : String(n); };
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var P = parse(raw); if (!P.steps.length) throw new Error("plan: no steps");
    var goal = P.top.goal || P.top.title || "", id = "phr_plan2_" + (P.top.id || hash(goal + P.steps.map(function (s) { return s.t; }).join("|")));
    var saved = null; try { saved = JSON.parse(ls(id) || "null"); } catch (e) {}
    var steps = (saved && saved.steps ? saved.steps : P.steps).map(function (s) { s.risk = RISK.test(s.t + " " + (s.n || "")); return s; });
    var approved = !!(saved && saved.approved), auto = false, token = 0, wait = null, editing = -1;
    function save() { ls(id, JSON.stringify({ approved: approved, steps: steps.map(function (s) { return { t: s.t, n: s.n, e: s.e, s: s.s === "r" ? "" : s.s }; }) })); }
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge"></span><span class="phr-w-title">' + esc(P.top.title || "") + '</span></div><div class="p2"><div class="p2-g"></div><div class="p2-meta"></div><div class="p2-m"><i></i></div><div class="p2-list"></div></div><div class="p2-ok" hidden></div><div class="p2-bar"></div><div class="p2-note"></div>';
    var q = function (s) { return root.querySelector(s); }, list = q(".p2-list"), bar = q(".p2-bar"), meta = q(".p2-meta"), okb = q(".p2-ok");
    q(".p2-g").innerHTML = inline(goal);
    function total() { return steps.reduce(function (a, s) { return a + (s.s === "x" || s.s === "k" ? 0 : mins(s.e)); }, 0); }
    function fmt(m) { if (!m) return ""; if (m < 1) return num(Math.max(5, Math.round(m * 60))) + " " + T.sec; if (m >= 90) return num(Math.round(m / 6) / 10) + " h"; return "~" + num(Math.round(m)) + " " + T.min; }
    function paint() {
      var d = steps.filter(function (s) { return s.s === "x" || s.s === "k"; }).length, running = steps.some(function (s) { return s.s === "r"; }), allDone = d === steps.length;
      q(".phr-w-badge").textContent = allDone ? T.done : approved ? T.running : T.draft;
      var risky = steps.filter(function (s) { return s.risk; }).length;
      meta.innerHTML = (total() ? '<span class="p2-chip">⏱ ' + esc(T.est) + " " + esc(fmt(total())) + "</span>" : "") + (risky ? '<span class="p2-chip w">⚠ ' + num(risky) + " · " + esc(T.needs) + "</span>" : "") + (allDone ? '<span class="p2-chip ok">✓ ' + esc(T.ready) + "</span>" : approved ? '<span class="p2-chip ok">● ' + esc(T.locked) + "</span>" : "");
      q(".p2-m i").style.width = Math.round(d / steps.length * 100) + "%";
      list.innerHTML = steps.map(function (s, i) {
        var canEdit = !approved && editing === i;
        return '<div class="p2-s ' + (s.s || "") + '" data-i="' + i + '"><span class="p2-n">' + (s.s === "x" ? "✓" : s.s === "f" ? "✕" : s.s === "k" ? "–" : s.s === "r" ? "" : num(i + 1)) + '</span><div class="p2-b">' +
          (canEdit ? '<textarea class="p2-ed" rows="2" placeholder="' + esc(T.ph) + '">' + esc(s.t) + "</textarea>" : '<div class="p2-t">' + inline(s.t) + "</div>" + (s.n ? '<span class="p2-nt">' + inline(s.n) + "</span>" : "")) +
          '<div class="p2-tags">' + (s.e ? '<span class="p2-tag">⏱ ' + esc(fmt(mins(s.e)) || s.e) + "</span>" : "") + (s.risk ? '<span class="p2-tag risk">⚠ ' + esc(T.needs) + "</span>" : "") + "</div></div>" +
          (!approved ? '<div class="p2-ctl"><button data-a="up" title="↑">↑</button><button data-a="dn">↓</button><button data-a="ed">' + (canEdit ? "✓" : "✎") + '</button><button data-a="rm">✕</button></div>' : "") + "</div>";
      }).join("");
      if (!approved) bar.innerHTML = '<button class="phr-w-btn" data-a="add">+ ' + esc(T.add) + '</button><span class="p2-sp"></span><button class="phr-w-btn" data-a="step">' + esc(T.stepwise) + '</button><button class="phr-w-btn gold" data-a="approve">' + esc(T.approve) + "</button>";
      else bar.innerHTML = (running || auto ? '<button class="phr-w-btn" data-a="stop">' + esc(T.stop) + "</button>" : !allDone ? '<button class="phr-w-btn" data-a="one">' + esc(T.next) + '</button><button class="phr-w-btn gold" data-a="all">' + esc(T.all) + "</button>" : "") + '<span class="p2-sp"></span><span style="font:600 12px monospace;opacity:.6;direction:ltr">' + num(d) + "/" + num(steps.length) + "</span>" + (d ? '<button class="phr-w-btn" data-a="reset">' + esc(T.reset) + "</button>" : "");
      q(".p2-note").textContent = approved ? T.risky : T.nothing;
      if (allDone && !root._d) { root._d = 1; try { window.PHR_BRAIN && PHR_BRAIN.missionDone(P.top.title); } catch (e) {} }
    }
    function pend(i) { return new Promise(function (res) { wait = res; var s = steps[i]; okb.hidden = false; okb.innerHTML = "<b>" + esc(T.paused) + "</b><br>" + inline(s.t) + '<div class="row"><button class="phr-w-btn gold" data-a="allow">' + esc(T.allow) + '</button><button class="phr-w-btn" data-a="skip">' + esc(T.skip) + "</button></div>"; }); }
    okb.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || !wait) return; var w = wait; wait = null; okb.hidden = true; w(b.getAttribute("data-a")); });
    function nextIdx() { for (var i = 0; i < steps.length; i++) if (steps[i].s !== "x" && steps[i].s !== "k") return i; return -1; }
    function msg(i, ok) { var s = steps[i]; return "[agent] Mission: " + goal + "\nThe user APPROVED this plan. Execute step " + (i + 1) + " of " + steps.length + ": " + s.t + (s.n ? " (" + s.n + ")" : "") + "\nDo only this step now: actually produce its result (use the right artifact or tool), keep it tight, do not repeat the plan." + (s.risk ? (ok ? " The user just explicitly allowed this specific step." : " This step may touch the outside world: PREPARE it (draft/confirm card) but do not send, book, pay, post or delete anything yourself.") : "") + " End with one line: 'Step " + (i + 1) + " done' or what blocked you."; }
    async function runStep(chain, tk) {
      var i = nextIdx(); if (i < 0) { auto = false; paint(); return; }
      var ok = false;
      if (steps[i].risk) { steps[i].s = ""; paint(); var ans = await pend(i); if (tk !== token) return; if (ans === "skip") { steps[i].s = "k"; save(); paint(); if (chain && auto) return runStep(true, tk); auto = false; paint(); return; } ok = true; }
      steps[i].s = "r"; paint();
      var sent = false, tries = 0; while (!sent && tries < 60 && tk === token && root.isConnected) { sent = typeof window.PHR_sendText === "function" && window.PHR_sendText(msg(i, ok)); if (!sent) { tries++; await sleep(1000); } }
      if (!sent || tk !== token) { if (steps[i].s === "r") steps[i].s = ""; paint(); return; }
      var t0 = Date.now(); while (!busy() && Date.now() - t0 < 10000 && tk === token) await sleep(250);
      while (busy() && tk === token && root.isConnected) await sleep(500);
      if (tk !== token) return;
      steps[i].s = "x"; save(); paint();
      if (chain && auto && nextIdx() >= 0) { await sleep(900); if (tk === token) runStep(true, tk); } else { auto = false; paint(); }
    }
    root.addEventListener("input", function (e) { if (e.target.classList.contains("p2-ed")) { var i = +e.target.closest(".p2-s").getAttribute("data-i"); steps[i].t = e.target.value; steps[i].risk = RISK.test(steps[i].t); } });
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".p2-ctl button, .p2-bar button"); if (!b) return; var a = b.getAttribute("data-a"), row = b.closest(".p2-s"), i = row ? +row.getAttribute("data-i") : -1;
      if (a === "up" && i > 0) { var t = steps[i]; steps[i] = steps[i - 1]; steps[i - 1] = t; editing = -1; save(); paint(); }
      else if (a === "dn" && i < steps.length - 1) { var u = steps[i]; steps[i] = steps[i + 1]; steps[i + 1] = u; editing = -1; save(); paint(); }
      else if (a === "ed") { if (editing === i) { editing = -1; if (!String(steps[i].t).trim()) steps.splice(i, 1); save(); paint(); } else { editing = i; paint(); var ta = list.querySelector(".p2-ed"); if (ta) ta.focus(); } }
      else if (a === "rm") { steps.splice(i, 1); editing = -1; if (!steps.length) steps.push({ t: "", n: "", e: "", s: "" }); save(); paint(); }
      else if (a === "add") { steps.push({ t: "", n: "", e: "", s: "" }); editing = steps.length - 1; paint(); var tb = list.querySelector(".p2-ed"); if (tb) tb.focus(); }
      else if (a === "approve" || a === "step") { steps = steps.filter(function (s) { return String(s.t).trim(); }); if (!steps.length) return; editing = -1; approved = true; save(); if (a === "approve") { auto = true; paint(); runStep(true, ++token); } else { paint(); runStep(false, ++token); } }
      else if (a === "one") runStep(false, ++token); else if (a === "all") { auto = true; runStep(true, ++token); }
      else if (a === "stop") { auto = false; token++; if (wait) { var w = wait; wait = null; okb.hidden = true; w("skip-stop"); } steps.forEach(function (s) { if (s.s === "r") s.s = ""; }); save(); paint(); }
      else if (a === "reset") { steps.forEach(function (s) { s.s = ""; }); auto = false; token++; approved = false; if (wait) { var w2 = wait; wait = null; okb.hidden = true; w2("skip-stop"); } save(); paint(); }
    });
    paint();
  };
})();
