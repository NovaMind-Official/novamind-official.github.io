/* Phraortes coach — questions everywhere.
   ```ask    one or more diagnostic questions; the result can flow back to the AI so it adapts
   ```exam   timed mock exam with grading, topic breakdown and a report for the AI
   ```sketch a drawing board; the drawing goes to the AI as an image
   Also adds "Quiz me" buttons to every other artifact. */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var inline = function (s) { return window.PHR_inline ? window.PHR_inline(s) : esc(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function faDigits(s) { return String(s).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/٫/g, ".").replace(/٬/g, "").replace(/(\d),(\d)/g, "$1.$2"); }
  function toFa(n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }

  var S = {
    en: { ask: "check", exam: "exam", sketch: "sketch", hint: "Hint", next: "Next", prev: "Back", finish: "See result", correct: "Correct", wrong: "Not quite", ans: "Answer", check: "Check", send: "Continue with the AI",
      sent: "Sent", your: "Your answer", right: "Correct answer", of: "of", start: "Start exam", qs: "questions", min: "min", flag: "Flag", flagged: "Flagged", submit: "Submit", unanswered: "unanswered", submitSure: "Submit with {n} unanswered?",
      yes: "Submit", back: "Keep going", score: "Score", topics: "By topic", review: "Review", report: "Send report to the AI", timeup: "Time is up", pen: "Pen", eraser: "Eraser", undo: "Undo", clear: "Clear", grid: "Grid", checkAI: "Check with the AI",
      draw: "Draw here with your finger", quizMe: "Quiz me", clarify: "questions", multi: "Select all that apply", typeAns: "Write your answer…", sendAns: "Send my answers", skip: "Skip", other: "Something else…", sentClar: "Answers sent to the AI", testMe: "Mini exam", typeNum: "Type a number", empty: "Nothing drawn yet", ok: "Done" },
    fa: { ask: "سؤال", exam: "آزمون", sketch: "بوم", hint: "راهنمایی", next: "بعدی", prev: "قبلی", finish: "دیدن نتیجه", correct: "درست", wrong: "نه کاملاً", ans: "جواب", check: "بررسی", send: "ادامه با هوش مصنوعی",
      sent: "ارسال شد", your: "جواب تو", right: "جواب درست", of: "از", start: "شروع آزمون", qs: "سؤال", min: "دقیقه", flag: "نشان‌گذاری", flagged: "نشان‌دار", submit: "پایان آزمون", unanswered: "بی‌جواب", submitSure: "با {n} سؤال بی‌جواب تحویل بدهم؟",
      yes: "تحویل", back: "ادامه می‌دهم", score: "نمره", topics: "به تفکیک مبحث", review: "مرور", report: "ارسال گزارش به AI", timeup: "زمان تمام شد", pen: "قلم", eraser: "پاک‌کن", undo: "برگردان", clear: "پاک کردن همه", grid: "شبکه", checkAI: "بررسی با AI",
      draw: "با انگشت اینجا بکش", quizMe: "از من بپرس", clarify: "چند سؤال", multi: "همه گزینه‌های درست را انتخاب کن", typeAns: "جوابت را بنویس…", sendAns: "ارسال جواب‌ها", skip: "نمی‌دانم", other: "چیز دیگر…", sentClar: "جواب‌ها برای AI فرستاده شد", testMe: "آزمون کوتاه", typeNum: "یک عدد بنویس", empty: "هنوز چیزی نکشیده‌ای", ok: "تمام" }
  };

  /* ---------- parser ---------- */
  var KEY = /^\s*(q|a\*|a|why|hint|topic|type|answer|tol|unit|other|labels|min|max)\s*:\s?(.*)$/i;
  function parse(raw) {
    var lines = String(raw || "").replace(/\r/g, "").split("\n"), top = {}, qs = [], cur = null, last = null, i, m;
    function nq() { cur = { q: "", opts: [], why: "", hint: "", topic: "", type: "", answer: "", tol: "", unit: "", other: "", labels: "", min: "", max: "" }; qs.push(cur); last = null; }
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (/^\s*-{3,}\s*$/.test(ln)) { cur = null; last = null; continue; }
      m = ln.match(KEY);
      if (m) {
        var k = m[1].toLowerCase(), v = m[2];
        if (k === "q") { nq(); cur.q = v; last = "q"; continue; }
        if (!cur) { if (k === "a" || k === "a*") { nq(); } else continue; }
        if (k === "a" || k === "a*") { var parts = v.split("::"); cur.opts.push({ t: parts[0].trim(), why: (parts[1] || "").trim(), ok: k === "a*" }); last = "opt"; }
        else { cur[k] = v; last = k; }
        continue;
      }
      var t = ln.match(/^\s*(title|time|report|lang|prompt|grid|level|mode|intro)\s*:\s*(.*)$/i);
      if (t && (!cur || /^(title|time|report|lang|prompt|grid|mode|intro)$/i.test(t[1]))) { top[t[1].toLowerCase()] = t[2].trim(); last = null; continue; }
      if (cur && last && ln.trim()) { if (last === "opt") { var o = cur.opts[cur.opts.length - 1]; o.t += " " + ln.trim(); } else cur[last] += "\n" + ln.trim(); }
    }
    top.clarify = /^(clarify|gather|interview|survey|poll)$/i.test(top.mode || "");
    qs = qs.filter(function (q) { return q.q; });
    qs.forEach(function (q) {
      var t = String(q.type || "").toLowerCase();
      q.type = /num/.test(t) ? "number" : /open|text|free|short/.test(t) ? "open" : /multi|check|several/.test(t) ? "multi" : /scale|rate|slider|confid/.test(t) ? "scale" : /choice|single|mcq/.test(t) ? "choice" : (q.opts.length ? "choice" : (q.answer !== "" ? "number" : "open"));
      if (q.type === "choice" && q.opts.filter(function (o) { return o.ok; }).length > 1) q.type = "multi";
    });
    qs = qs.filter(function (q) { return (q.type === "choice" || q.type === "multi") ? q.opts.length >= 2 : true; });
    return { top: top, qs: qs };
  }
  // pick: index (choice) or array (multi); returns true/false, or null when the question is not gradable
  function grade(q, pick, text) {
    if (q.type === "open" || q.type === "scale") return null;
    if (q.type === "number") {
      var x = parseFloat(faDigits(text).replace(/[^\d.eE+\-]/g, "")), a = parseFloat(faDigits(q.answer)), tol = q.tol !== "" ? parseFloat(faDigits(q.tol)) : Math.max(1e-6, Math.abs(a) * 0.01);
      return isFinite(x) && isFinite(a) && Math.abs(x - a) <= (isFinite(tol) ? tol : 0);
    }
    if (q.type === "multi") { var ps = pick || []; if (!q.opts.some(function (o) { return o.ok; })) return null; return q.opts.every(function (o, i) { return o.ok === (ps.indexOf(i) >= 0); }); }
    if (!q.opts.some(function (o) { return o.ok; })) return null;
    return pick >= 0 && !!q.opts[pick] && q.opts[pick].ok;
  }
  function correctText(q) { if (q.type === "number") return q.answer + (q.unit ? " " + q.unit : ""); return q.opts.filter(function (o) { return o.ok; }).map(function (o) { return o.t; }).join(" + "); }
  function pickedText(q, r) {
    if (q.type === "number" || q.type === "open") return r.text || "—";
    if (q.type === "scale") return r.pick >= 0 ? String(r.pick) : "—";
    var arr = q.type === "multi" ? (r.pick || []) : (r.pick >= 0 ? [r.pick] : []), s = arr.map(function (i) { return q.opts[i] && q.opts[i].t; }).filter(Boolean);
    if (r.text) s.push("(other) " + r.text);
    return s.length ? s.join(" + ") : "—";
  }

  /* ---------- chat bridge ---------- */
  function sendToChat(text, tries) {
    tries = tries || 0;
    if (typeof window.PHR_sendText !== "function") return false;
    if (window.PHR_sendText(text)) return true;
    if (tries < 40) setTimeout(function () { sendToChat(text, tries + 1); }, 700);
    return false;
  }
  function short(s, n) { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ---------- styles ---------- */
  var st = document.createElement("style"); st.id = "phr-coach-css";
  st.textContent =
    ".cc{padding:14px 14px 4px}.cc-q{font-size:16px;line-height:1.6;font-weight:600;letter-spacing:-.01em;margin:2px 0 14px}" +
    ".cc-prog{display:flex;gap:5px;margin:0 0 12px}.cc-prog i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.14)}.cc-prog i.on{background:var(--p,#E2BE6A)}.cc-prog i.ok{background:#58C48F}.cc-prog i.no{background:#ff6b5a}" +
    ".cc-o{display:flex;gap:11px;align-items:flex-start;width:100%;text-align:start;margin:0 0 8px;padding:12px 13px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.035);color:inherit;font:inherit;line-height:1.5;cursor:pointer;min-height:48px;-webkit-tap-highlight-color:transparent;transition:border-color .2s,background .2s}" +
    ".cc-o:active{background:rgba(255,255,255,.07)}.cc-o b{flex:none;width:24px;height:24px;border-radius:8px;border:1px solid rgba(255,255,255,.2);display:grid;place-items:center;font:600 11px 'IBM Plex Mono',monospace;direction:ltr}" +
    ".cc-o.sel{border-color:var(--p,#E2BE6A);background:rgba(226,190,106,.09)}.cc-o.ok{border-color:#58C48F;background:rgba(88,196,143,.12)}.cc-o.ok b{background:#58C48F;border-color:#58C48F;color:#06220f}.cc-o.no{border-color:#ff6b5a;background:rgba(255,107,90,.1)}.cc-o.no b{background:#ff6b5a;border-color:#ff6b5a;color:#2a0a05}" +
    ".cc-o[disabled]{cursor:default}.cc-num{display:flex;gap:8px;margin:0 0 10px}.cc-num input{flex:1;min-width:0;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;font:600 16px 'IBM Plex Mono',monospace;padding:0 14px;direction:ltr;outline:none}.cc-num input:focus{border-color:var(--p,#E2BE6A)}" +
    ".cc-ta{width:100%;min-height:84px;resize:vertical;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;font:15px/1.6 inherit;font-family:inherit;padding:11px 13px;outline:none;margin:0 0 8px}.cc-ta:focus,.cc-oth input:focus{border-color:var(--p,#E2BE6A)}.cc-oth input{direction:auto;font:15px inherit;font-family:inherit}" +
    ".cc-scale{display:flex;gap:6px;margin:0 0 6px}.cc-scale button{flex:1;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.035);color:inherit;font:600 15px 'IBM Plex Mono',monospace;cursor:pointer}.cc-scale button.sel{background:var(--p,#E2BE6A);color:#1a1206;border-color:transparent}.cc-lab{display:flex;justify-content:space-between;font-size:11.5px;opacity:.6;margin:0 2px 10px}.cc-o.sel b{background:var(--p,#E2BE6A);border-color:transparent;color:#1a1206}" +
    ".cc-fb{margin:4px 0 10px;padding:12px 14px;border-radius:14px;font-size:14px;line-height:1.65;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)}.cc-fb b.t{display:block;font:700 11px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}.cc-fb.ok b.t{color:#58C48F}.cc-fb.no b.t{color:#ff8a7a}" +
    ".cc-hint{margin:0 0 10px;color:#c9b27a;font-size:13.5px;line-height:1.6}.cc-bar{display:flex;flex-wrap:wrap;gap:8px;padding:6px 14px 14px;align-items:center}.cc-sp{flex:1}" +
    ".cc-big{font:800 52px/1 'Inter Tight',sans-serif;letter-spacing:-.04em;direction:ltr;display:inline-block}.cc-sum{display:flex;align-items:center;gap:16px;padding:6px 0 14px}" +
    ".cc-tp{display:grid;gap:8px;margin:6px 0 12px}.cc-tp div{font-size:13px}.cc-tp .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:4px}.cc-tp .bar i{display:block;height:100%;border-radius:3px}" +
    ".cc-timer{margin-inline-start:auto;font:700 14px 'IBM Plex Mono',monospace;direction:ltr;padding:3px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.14)}.cc-timer.lo{color:#ffb44a;border-color:#ffb44a}.cc-timer.crit{color:#ff6b5a;border-color:#ff6b5a}" +
    ".cc-dots{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.cc-dots button{width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font:600 12px 'IBM Plex Mono',monospace;cursor:pointer;position:relative;padding:0}.cc-dots button.cur{border-color:var(--p,#E2BE6A);color:var(--p,#E2BE6A)}.cc-dots button.done{background:rgba(255,255,255,.09)}.cc-dots button.fl::after{content:'';position:absolute;top:3px;right:3px;width:6px;height:6px;border-radius:50%;background:#ffb44a}" +
    ".cc-strip{display:flex;flex-wrap:wrap;gap:8px;padding:2px 14px 14px}.cc-strip button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:inherit;border-radius:20px;padding:7px 13px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;min-height:34px}.cc-strip button:active{background:rgba(226,190,106,.12)}" +
    ".cc-sk{display:block;width:100%;touch-action:none;background:#fbfaf6;border-radius:0;cursor:crosshair}.cc-tools{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px}.cc-sw{width:30px;height:30px;border-radius:50%;border:2px solid transparent;padding:0;cursor:pointer}.cc-sw.on{border-color:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.5)}" +
    ".cc-mod{position:relative}.cc-mod .ov{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,12,16,.82);z-index:3;padding:20px;text-align:center}.cc-mod .ov div{max-width:300px}";
  document.head.appendChild(st);

  function head(root, badge, title, extra) { return '<div class="phr-w-head"><span class="phr-w-badge">' + esc(badge) + '</span><span class="phr-w-title">' + esc(title || "") + "</span>" + (extra || "") + "</div>"; }
  function langOf(root) { return S[root._lang === "fa" ? "fa" : "en"]; }
  function num(root, n) { return root._lang === "fa" ? toFa(n) : String(n); }
  var LET = ["A", "B", "C", "D", "E", "F"];

  /* ================= ASK ================= */
  W.builders.ask = function (root) {
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var P = parse(raw); if (!P.qs.length) throw new Error("ask: no question");
    var T = langOf(root), qs = P.qs, idx = 0, results = [], sent = false, clar = P.top.clarify;
    var report = clar || /^(true|yes|1)$/i.test(P.top.report || "");
    root.innerHTML = head(root, clar ? T.clarify : T.ask, P.top.title || "") + '<div class="cc"></div><div class="cc-bar"></div>';
    var body = root.querySelector(".cc"), bar = root.querySelector(".cc-bar");
    function prog() { return qs.length > 1 ? '<div class="cc-prog">' + qs.map(function (q, i) { var r = results[i]; return '<i class="' + (r ? (r.ok === true ? "ok" : r.ok === false ? "no" : "on") : i === idx ? "on" : "") + '"></i>'; }).join("") + "</div>" : ""; }
    function otherRow(q) { return /^(true|yes|1)$/i.test(q.other || "") || (clar && q.opts.length) ? '<div class="cc-num cc-oth"><input type="text" data-o autocomplete="off" placeholder="' + esc(T.other) + '"></div>' : ""; }
    function show() {
      var q = qs[idx], done = results[idx], sel = []; var cur = { pick: q.type === "multi" ? [] : -1, text: "" };
      var h = prog() + (idx === 0 && P.top.intro ? '<div class="cc-hint" style="color:inherit;opacity:.8">' + inline(P.top.intro) + "</div>" : "") + '<div class="cc-q">' + inline(q.q) + "</div>";
      if (q.type === "choice" || q.type === "multi") h += (q.type === "multi" ? '<div class="cc-hint" style="margin:-6px 0 8px;font-size:12px;opacity:.7">' + T.multi + "</div>" : "") + q.opts.map(function (o, i) { return '<button class="cc-o" data-i="' + i + '"><b>' + (q.type === "multi" ? "✓" : LET[i]) + "</b><span>" + inline(o.t) + "</span></button>"; }).join("") + otherRow(q);
      else if (q.type === "number") h += '<div class="cc-num"><input type="text" inputmode="decimal" autocomplete="off" placeholder="' + esc(T.typeNum) + (q.unit ? " (" + esc(q.unit) + ")" : "") + '"></div>';
      else if (q.type === "open") h += '<textarea class="cc-ta" rows="3" placeholder="' + esc(T.typeAns) + '"></textarea>';
      else { var lo = (q.labels.split("|")[0] || "").trim(), hi = (q.labels.split("|")[1] || "").trim(), mx = Math.min(10, Math.max(3, parseInt(q.max, 10) || 5)), mn = parseInt(q.min, 10) || 1; h += '<div class="cc-scale">' + Array.apply(null, Array(mx - mn + 1)).map(function (_, i) { return '<button data-v="' + (mn + i) + '">' + num(root, mn + i) + "</button>"; }).join("") + '</div><div class="cc-lab"><span>' + esc(lo) + "</span><span>" + esc(hi) + "</span></div>"; }
      h += '<div class="cc-slot"></div>'; body.innerHTML = h;
      var slot = body.querySelector(".cc-slot"), hb;
      var inp = body.querySelector("input:not([data-o])"), ta = body.querySelector("textarea"), oth = body.querySelector("input[data-o]");
      var optBtns = body.querySelectorAll(".cc-o");
      optBtns.forEach(function (b) { b.addEventListener("click", function () {
        if (results[idx]) return; var i = +b.getAttribute("data-i");
        if (q.type === "multi") { var p = cur.pick.indexOf(i); if (p >= 0) cur.pick.splice(p, 1); else cur.pick.push(i); b.classList.toggle("sel"); }
        else { cur.pick = i; if (oth) oth.value = ""; if (!clar) return commit(cur); optBtns.forEach(function (x) { x.classList.toggle("sel", x === b); }); }
        paintBar(); }); });
      body.querySelectorAll(".cc-scale button").forEach(function (b) { b.addEventListener("click", function () { if (results[idx]) return; cur.pick = +b.getAttribute("data-v"); body.querySelectorAll(".cc-scale button").forEach(function (x) { x.classList.toggle("sel", x === b); }); paintBar(); }); });
      function ready() { if (q.type === "number") return !!(inp && inp.value.trim()); if (q.type === "open") return !!(ta && ta.value.trim()); if (q.type === "scale") return cur.pick >= 0; if (q.type === "multi") return cur.pick.length > 0 || !!(oth && oth.value.trim()); return cur.pick >= 0 || !!(oth && oth.value.trim()); }
      function paintBar() {
        var need = q.type === "number" || q.type === "open" || q.type === "scale" || q.type === "multi" || clar; var last = idx === qs.length - 1;
        var lbl = clar || q.type === "open" || q.type === "scale" ? (last ? T.sendAns : T.next) : (q.type === "multi" || q.type === "number" ? T.check : T.next);
        bar.innerHTML = (q.hint ? '<button class="phr-w-btn" data-a="hint">' + T.hint + "</button>" : "") + '<span class="cc-sp"></span>' + (clar || q.type !== "choice" ? '<button class="phr-w-btn" data-a="skip">' + T.skip + "</button>" : "") + (need ? '<button class="phr-w-btn gold" data-a="go"' + (ready() ? "" : " disabled") + ">" + lbl + "</button>" : "");
        hb = bar.querySelector('[data-a="hint"]'); if (hb) hb.addEventListener("click", function () { if (slot.querySelector(".cc-hint")) return; var d = document.createElement("div"); d.className = "cc-hint"; d.innerHTML = "💡 " + inline(q.hint); slot.appendChild(d); hb.disabled = true; });
        var g = bar.querySelector('[data-a="go"]'); if (g) g.addEventListener("click", function () { cur.text = (inp && inp.value) || (ta && ta.value) || (oth && oth.value) || ""; commit(cur); });
        var sk = bar.querySelector('[data-a="skip"]'); if (sk) sk.addEventListener("click", function () { results[idx] = { ok: null, pick: q.type === "multi" ? [] : -1, text: "", skipped: true, q: q }; advance(); });
      }
      [inp, ta, oth].forEach(function (el) { if (el) el.addEventListener("input", function () { if (el === oth && q.type === "choice" && el.value) { cur.pick = -1; optBtns.forEach(function (x) { x.classList.remove("sel"); }); } var g = bar.querySelector('[data-a="go"]'); if (g) g.disabled = !ready(); }); });
      if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { var g = bar.querySelector('[data-a="go"]'); if (g && !g.disabled) g.click(); } });
      if (done) { reveal(done, true); } else paintBar();
    }
    function commit(cur) {
      if (results[idx]) return; var q = qs[idx], text = String(cur.text || "").trim();
      var ok = clar ? null : grade(q, cur.pick, text);
      var r = results[idx] = { ok: ok, pick: cur.pick, text: text, q: q };
      if (ok === null || clar) { advance(); return; }
      reveal(r);
    }
    function reveal(r) {
      var q = r.q, slot = body.querySelector(".cc-slot");
      if (q.type === "choice" || q.type === "multi") body.querySelectorAll(".cc-o").forEach(function (b, i) { b.disabled = true; var picked = q.type === "multi" ? (r.pick || []).indexOf(i) >= 0 : i === r.pick; b.classList.remove("sel"); if (q.opts[i].ok) b.classList.add("ok"); else if (picked) b.classList.add("no"); });
      else { var inp = body.querySelector("input"); if (inp) { inp.value = r.text; inp.disabled = true; } }
      var why = (q.type === "choice" && r.pick >= 0 && q.opts[r.pick] && q.opts[r.pick].why && !r.ok ? q.opts[r.pick].why + "\n" : "") + (q.why || "");
      var d = document.createElement("div"); d.className = "cc-fb " + (r.ok ? "ok" : "no");
      d.innerHTML = '<b class="t">' + (r.ok ? T.correct : T.wrong) + "</b>" + (!r.ok ? '<div>' + esc(T.right) + ": <b>" + inline(correctText(q)) + "</b></div>" : "") + (why ? "<div>" + inline(why).replace(/\n/g, "<br>") + "</div>" : "");
      slot.appendChild(d);
      var pg = body.querySelector(".cc-prog"); if (pg) pg.outerHTML = prog();
      bar.innerHTML = '<span class="cc-sp"></span><button class="phr-w-btn gold" data-a="n">' + (idx < qs.length - 1 ? T.next : (report ? T.send : T.finish)) + "</button>";
      bar.querySelector('[data-a="n"]').addEventListener("click", advance);
    }
    function advance() { if (idx < qs.length - 1) { idx++; show(); } else finish(); }
    function message() {
      var t = P.top.title || (qs[0].topic || ""), s = (clar ? "[ask answers]\n" : "[ask result]\n") + (t ? "Topic: " + t + "\n" : "");
      qs.forEach(function (q, i) { var r = results[i]; if (!r) return; var ans = r.skipped ? "(skipped)" : pickedText(q, r) + (q.type === "scale" && r.pick >= 0 ? "/" + (q.max || 5) : "");
        s += (i + 1) + ". " + short(q.q, 140) + "\n   user: " + short(ans, 600) + (r.ok === true ? " → correct" : r.ok === false ? " → incorrect (correct: " + correctText(q) + ")" : "") + "\n"; });
      return s + (clar ? "These are my answers to your clarifying questions. Now proceed with the real answer, tailored to them. Do not ask the same things again." : "Adapt your next reply to this result: confirm what is solid, fix the misconception (and review any open answers I wrote), then go deeper or simpler.");
    }
    function finish() {
      var graded = results.filter(function (r) { return r && r.ok !== null && r.ok !== undefined; }), ok = graded.filter(function (r) { return r.ok; }).length;
      if (report && !sent) { sent = true; sendToChat(message()); }
      var sumHTML = graded.length > 1 ? '<div class="cc-sum"><span class="cc-big">' + num(root, ok) + "/" + num(root, graded.length) + "</span></div>" : "";
      body.innerHTML = prog() + sumHTML + (report ? '<div class="cc-fb"><b class="t">' + T.sent + "</b>" + esc(clar ? T.sentClar : T.send) + " ✓</div>" : ""); bar.innerHTML = "";
    }
    show();
  };

  /* ================= EXAM ================= */
  W.builders.exam = function (root) {
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var P = parse(raw); P.qs = P.qs.filter(function (q) { return q.type === "choice" || q.type === "number"; }); if (!P.qs.length) throw new Error("exam: no questions");
    var T = langOf(root), qs = P.qs, mins = Math.max(1, Math.min(180, parseInt(faDigits(P.top.time || ""), 10) || Math.ceil(qs.length * 1.5)));
    var ans = qs.map(function () { return { pick: -1, text: "" }; }), flag = qs.map(function () { return false; }), cur = 0, left = mins * 60, tm = null, phase = "intro", sent = false;
    root.innerHTML = head(root, T.exam, P.top.title || "", '<span class="cc-timer" hidden></span>') + '<div class="cc-mod"><div class="cc"></div></div><div class="cc-bar"></div>';
    var body = root.querySelector(".cc"), bar = root.querySelector(".cc-bar"), timer = root.querySelector(".cc-timer"), mod = root.querySelector(".cc-mod");
    function mmss(s) { return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
    function tick() { if (!root.isConnected) { clearInterval(tm); return; } left--; paintTimer(); if (left <= 0) { clearInterval(tm); finish(true); } }
    function paintTimer() { timer.textContent = mmss(Math.max(0, left)); timer.className = "cc-timer" + (left < 60 ? " crit" : left < mins * 60 * .2 ? " lo" : ""); }
    function intro() {
      phase = "intro"; timer.hidden = true;
      body.innerHTML = '<div class="cc-sum"><span class="cc-big">' + num(root, qs.length) + '</span><div style="font-size:15px;line-height:1.6">' + T.qs + "<br>" + num(root, mins) + " " + T.min + "</div></div>";
      bar.innerHTML = '<button class="phr-w-btn gold" data-a="go">' + T.start + "</button>"; bar.querySelector("button").addEventListener("click", function () { phase = "run"; timer.hidden = false; paintTimer(); tm = setInterval(tick, 1000); run(); });
    }
    function dots() { return '<div class="cc-dots">' + qs.map(function (q, i) { var a = ans[i], d = q.type === "choice" ? a.pick >= 0 : a.text.trim() !== ""; return '<button data-j="' + i + '" class="' + (i === cur ? "cur " : "") + (d ? "done " : "") + (flag[i] ? "fl" : "") + '">' + num(root, i + 1) + "</button>"; }).join("") + "</div>"; }
    function run() {
      var q = qs[cur], a = ans[cur];
      var h = dots() + '<div class="cc-q">' + inline(q.q) + "</div>";
      if (q.type === "choice") h += q.opts.map(function (o, i) { return '<button class="cc-o' + (a.pick === i ? " sel" : "") + '" data-i="' + i + '"><b>' + LET[i] + "</b><span>" + inline(o.t) + "</span></button>"; }).join("");
      else h += '<div class="cc-num"><input type="text" inputmode="decimal" autocomplete="off" value="' + esc(a.text) + '" placeholder="' + esc(T.typeNum) + (q.unit ? " (" + esc(q.unit) + ")" : "") + '"></div>';
      body.innerHTML = h;
      body.querySelectorAll(".cc-dots button").forEach(function (b) { b.addEventListener("click", function () { cur = +b.getAttribute("data-j"); run(); }); });
      body.querySelectorAll(".cc-o").forEach(function (b) { b.addEventListener("click", function () { ans[cur].pick = +b.getAttribute("data-i"); run(); }); });
      var inp = body.querySelector("input"); if (inp) inp.addEventListener("input", function () { ans[cur].text = inp.value; var d = body.querySelector('.cc-dots button[data-j="' + cur + '"]'); if (d) d.classList.toggle("done", inp.value.trim() !== ""); });
      bar.innerHTML = (cur > 0 ? '<button class="phr-w-btn" data-a="p">' + T.prev + "</button>" : "") + '<button class="phr-w-btn" data-a="f">' + (flag[cur] ? "⚑ " + T.flagged : "⚐ " + T.flag) + '</button><span class="cc-sp"></span>' + (cur < qs.length - 1 ? '<button class="phr-w-btn gold" data-a="n">' + T.next + "</button>" : '<button class="phr-w-btn gold" data-a="s">' + T.submit + "</button>");
      var g = function (k, f) { var b = bar.querySelector('[data-a="' + k + '"]'); if (b) b.addEventListener("click", f); };
      g("p", function () { cur--; run(); }); g("n", function () { cur++; run(); }); g("f", function () { flag[cur] = !flag[cur]; run(); }); g("s", confirmSubmit);
    }
    function unans() { return qs.filter(function (q, i) { return q.type === "choice" ? ans[i].pick < 0 : !ans[i].text.trim(); }).length; }
    function confirmSubmit() {
      var n = unans(); if (!n) return finish(false);
      var ov = document.createElement("div"); ov.className = "ov"; ov.innerHTML = "<div><p style='margin:0 0 14px;line-height:1.6'>" + esc(T.submitSure.replace("{n}", num(root, n))) + "</p><button class='phr-w-btn gold' data-a='y'>" + T.yes + "</button> <button class='phr-w-btn' data-a='b'>" + T.back + "</button></div>";
      mod.appendChild(ov); ov.querySelector("[data-a=y]").addEventListener("click", function () { finish(false); }); ov.querySelector("[data-a=b]").addEventListener("click", function () { ov.remove(); });
    }
    function finish(timeUp) {
      clearInterval(tm); phase = "result"; mod.querySelectorAll(".ov").forEach(function (o) { o.remove(); }); timer.hidden = true;
      var res = qs.map(function (q, i) { return { q: q, ok: grade(q, ans[i].pick, ans[i].text), a: ans[i] }; }), ok = res.filter(function (r) { return r.ok; }).length, pct = Math.round(ok / qs.length * 100);
      var tp = {}; res.forEach(function (r) { var t = r.q.topic || P.top.title || "—"; (tp[t] = tp[t] || { n: 0, ok: 0 }); tp[t].n++; if (r.ok) tp[t].ok++; });
      var col = function (p) { return p >= 75 ? "#58C48F" : p >= 50 ? "#E2BE6A" : "#ff6b5a"; };
      var h = (timeUp ? '<div class="cc-fb no"><b class="t">' + T.timeup + "</b></div>" : "") + '<div class="cc-sum"><span class="cc-big" style="color:' + col(pct) + '">' + num(root, pct) + '%</span><div style="font-size:15px;line-height:1.6">' + num(root, ok) + " " + T.of + " " + num(root, qs.length) + "</div></div>";
      var tk = Object.keys(tp); if (tk.length > 1 || (tk[0] && tk[0] !== "—")) h += '<div class="cc-q" style="font-size:12px;margin:0 0 6px;opacity:.6;font-family:IBM Plex Mono;letter-spacing:.1em;text-transform:uppercase">' + T.topics + '</div><div class="cc-tp">' + tk.map(function (t) { var p = Math.round(tp[t].ok / tp[t].n * 100); return "<div><span>" + esc(t) + "</span> <span style='float:inline-end;direction:ltr'>" + num(root, tp[t].ok) + "/" + num(root, tp[t].n) + '</span><div class="bar"><i style="width:' + p + "%;background:" + col(p) + '"></i></div></div>'; }).join("") + "</div>";
      h += '<div class="cc-q" style="font-size:12px;margin:10px 0 8px;opacity:.6;font-family:IBM Plex Mono;letter-spacing:.1em;text-transform:uppercase">' + T.review + "</div>";
      h += res.map(function (r, i) { var q = r.q, mine = q.type === "choice" ? (r.a.pick >= 0 ? q.opts[r.a.pick].t : "—") : (r.a.text || "—"); return '<div class="cc-fb ' + (r.ok ? "ok" : "no") + '"><b class="t">' + num(root, i + 1) + " · " + (r.ok ? T.correct : T.wrong) + "</b><div>" + inline(q.q) + "</div>" + (!r.ok ? "<div style='margin-top:6px'>" + T.your + ": " + inline(mine) + "<br>" + T.right + ": <b>" + inline(correctText(q)) + "</b></div>" : "") + (q.why ? "<div style='margin-top:6px;opacity:.85'>" + inline(q.why) + "</div>" : "") + "</div>"; }).join("");
      body.innerHTML = h;
      bar.innerHTML = '<button class="phr-w-btn gold" data-a="r">' + T.report + "</button>";
      bar.querySelector("button").addEventListener("click", function () { if (sent) return; sent = true; this.disabled = true; this.textContent = T.sent + " ✓"; sendToChat(report(res, ok, pct, tp)); });
      try { if (window.PHR_learn && PHR_learn.note) { var weak = tk.filter(function (t) { return t !== "—" && tp[t].ok / tp[t].n < .6; }); if (weak.length) PHR_learn.note("I am weak in: " + weak.join(", ")); } } catch (e) {}
    }
    function report(res, ok, pct, tp) {
      var s = "[exam result]\n" + (P.top.title ? P.top.title + "\n" : "") + "Score: " + ok + "/" + qs.length + " (" + pct + "%), time used " + mmss(mins * 60 - Math.max(0, left)) + " of " + mmss(mins * 60) + "\nBy topic: " + Object.keys(tp).map(function (t) { return t + " " + tp[t].ok + "/" + tp[t].n; }).join("; ") + "\nMissed:\n";
      res.forEach(function (r, i) { if (!r.ok) s += (i + 1) + ". " + short(r.q.q, 120) + " | user: " + (r.q.type === "choice" ? (r.a.pick >= 0 ? r.q.opts[r.a.pick].t : "no answer") : (r.a.text || "no answer")) + " | correct: " + correctText(r.q) + "\n"; });
      return s + "Analyse my weak topics, explain the most important mistakes, and give me a short study plan.";
    }
    intro();
  };

  /* ================= SKETCH ================= */
  W.builders.sketch = function (root) {
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var top = parse(raw).top, T = langOf(root), prompt = top.prompt || "", grid = !/^(false|no|0|none)$/i.test(top.grid || "true");
    var COLORS = ["#1b2430", "#2f6fe0", "#d6392b", "#1f9d55"], color = COLORS[0], size = 3, erase = false, strokes = [], curS = null;
    root.innerHTML = head(root, T.sketch, top.title || "") + (prompt ? '<div class="cc" style="padding-bottom:10px"><div class="cc-q" style="margin:0">' + inline(prompt) + "</div></div>" : "") +
      '<canvas class="cc-sk"></canvas><div class="cc-tools"></div><div class="cc-bar"></div>';
    var cv = root.querySelector("canvas"), tools = root.querySelector(".cc-tools"), bar = root.querySelector(".cc-bar"), ctx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1), cw = 300, ch = 320;
    tools.innerHTML = COLORS.map(function (c, i) { return '<button class="cc-sw' + (i === 0 ? " on" : "") + '" data-c="' + c + '" style="background:' + c + '" aria-label="pen"></button>'; }).join("") +
      '<button class="phr-w-btn" data-a="thin">—</button><button class="phr-w-btn" data-a="thick">▬</button><button class="phr-w-btn" data-a="er">' + T.eraser + '</button><button class="phr-w-btn" data-a="undo">' + T.undo + '</button><button class="phr-w-btn" data-a="clear">' + T.clear + '</button><button class="phr-w-btn on" data-a="grid">' + T.grid + "</button>";
    bar.innerHTML = '<span class="cc-sp"></span><button class="phr-w-btn gold" data-a="send">' + T.checkAI + "</button>";
    function size_() { var w = Math.max(240, cv.clientWidth || root.clientWidth || 300); cw = w; ch = Math.round(Math.min(380, Math.max(260, w * .85))); cv.style.height = ch + "px"; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); redraw(); }
    function bg() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#fbfaf6"; ctx.fillRect(0, 0, cw, ch);
      if (grid) { ctx.strokeStyle = "#e7e4da"; ctx.lineWidth = 1; for (var x = 0; x <= cw; x += 28) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, ch); ctx.stroke(); } for (var y = 0; y <= ch; y += 28) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(cw, y + .5); ctx.stroke(); } }
    }
    function stroke(s) { if (!s.p.length) return; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = s.e ? "#fbfaf6" : s.c; ctx.lineWidth = s.e ? s.w * 5 : s.w; ctx.beginPath(); ctx.moveTo(s.p[0][0] * cw, s.p[0][1] * ch); if (s.p.length === 1) ctx.lineTo(s.p[0][0] * cw + .1, s.p[0][1] * ch); for (var i = 1; i < s.p.length; i++) ctx.lineTo(s.p[i][0] * cw, s.p[i][1] * ch); ctx.stroke(); }
    function redraw() { bg(); strokes.forEach(stroke); if (curS) stroke(curS); }
    function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
    cv.addEventListener("pointerdown", function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} curS = { c: color, w: size, e: erase, p: [pt(e)] }; redraw(); });
    cv.addEventListener("pointermove", function (e) { if (!curS) return; e.preventDefault(); var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(function (ev) { curS.p.push(pt(ev)); }); redraw(); });
    function end() { if (curS) { strokes.push(curS); curS = null; redraw(); } }
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    tools.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var c = b.getAttribute("data-c"), a = b.getAttribute("data-a");
      if (c) { color = c; erase = false; tools.querySelectorAll(".cc-sw").forEach(function (s) { s.classList.toggle("on", s === b); }); tools.querySelector('[data-a="er"]').classList.remove("on"); }
      else if (a === "thin") size = 2; else if (a === "thick") size = 6;
      else if (a === "er") { erase = !erase; b.classList.toggle("on", erase); }
      else if (a === "undo") { strokes.pop(); redraw(); } else if (a === "clear") { strokes = []; redraw(); }
      else if (a === "grid") { grid = !grid; b.classList.toggle("on", grid); redraw(); }
    });
    bar.querySelector('[data-a="send"]').addEventListener("click", function () {
      if (!strokes.length) { var n = document.createElement("div"); n.className = "cc-hint"; n.style.margin = "0 14px 12px"; n.textContent = T.empty; bar.parentNode.insertBefore(n, bar); setTimeout(function () { n.remove(); }, 2200); return; }
      var o = document.createElement("canvas"), sc = Math.min(1, 1000 / cw); o.width = Math.round(cw * sc); o.height = Math.round(ch * sc); var c2 = o.getContext("2d"); c2.drawImage(cv, 0, 0, o.width, o.height);
      var url = o.toDataURL("image/jpeg", .88), txt = (root._lang === "fa" ? "این جواب من است. " : "Here is my answer. ") + (prompt ? "(" + short(prompt, 180) + ") " : "") + (root._lang === "fa" ? "دقیق بررسی کن: چه چیزی درست است و چه چیزی کم یا اشتباه است." : "Check it carefully: what is right, and what is missing or wrong?");
      if (typeof window.PHR_sendImage === "function") window.PHR_sendImage(url, txt);
      this.disabled = true; this.textContent = T.sent + " ✓"; var b = this; setTimeout(function () { b.disabled = false; b.textContent = T.checkAI; }, 4000);
    });
    var ro = window.ResizeObserver ? new ResizeObserver(function () { if (root.isConnected && cv.clientWidth && Math.abs(cv.clientWidth - cw) > 2) size_(); }) : null; if (ro) ro.observe(root);
    setTimeout(size_, 0);
  };

  /* ================= aliases + everywhere ================= */
  var AL = { ask: "ask", diagnostic: "ask", checkpoint: "ask", predict: "ask", exam: "exam", mockexam: "exam", "mock-exam": "exam", sketch: "sketch", drawboard: "sketch", whiteboard: "sketch" };
  if (W.ALIAS) Object.keys(AL).forEach(function (k) { W.ALIAS[k] = AL[k]; });
  W.kinds.ask = W.kinds.exam = W.kinds.sketch = 1;

  var SKIP = { deck: 1, map: 1, board: 1, lab: 1, plan: 1, act: 1, ask: 1, exam: 1, sketch: 1, pylab: 1, quiz: 1, flash: 1, solution: 1, playground: 1, studio: 1 };
  var baseMount = W.mount;
  W.mount = function (root) {
    var was = root && root._m; baseMount.call(W, root);
    try {
      if (was || !root || !root.isConnected) return;
      var k = root.getAttribute("data-w"); if (SKIP[k] || root.querySelector(".phr-err,.phr-w-sk") || root.querySelector(".cc-strip")) return;
      var T = S[root._lang === "fa" ? "fa" : "en"], fa = root._lang === "fa";
      var d = document.createElement("div"); d.className = "cc-strip";
      d.innerHTML = '<button data-m="q">✦ ' + T.quizMe + '</button><button data-m="e">⏱ ' + T.testMe + "</button>";
      d.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return; var m = b.getAttribute("data-m"); b.disabled = true; setTimeout(function () { b.disabled = false; }, 2500);
        var kind = k === "chemlab" ? "chemistry" : k;
        sendToChat(m === "q" ? (fa ? "از من درباره همین (" + kind + ") یک سؤال بپرس." : "Quiz me on this (" + kind + ").") : (fa ? "یک آزمون کوتاه درباره همین (" + kind + ") برایم بگذار." : "Give me a short mini exam on this (" + kind + ")."));
      });
      root.appendChild(d);
    } catch (e) {}
  };
})();
