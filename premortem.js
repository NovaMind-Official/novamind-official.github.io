/* Phraortes — Pre-Mortem (premortem.js)
   Before a decision, launch or plan: "pre-mortem: launch my template on Zhaket Friday".
   The agent imagines it has already FAILED, uses what it knows about you (memory, habits, recent activity, open tasks)
   to find the real reasons, and answers with a ```premortem JSON fence that this file renders as a risk card
   with one concrete fix per risk and a single first step. */
(function () {
  "use strict";
  var W = window, D = document;
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  var LV = { high: 3, med: 2, medium: 2, low: 1 };
  var VER = { go: ["GO", "#6fe3a0"], careful: ["CAREFUL", "#ffc35f"], stop: ["STOP & RETHINK", "#ff6b6b"] };

  function css() {
    if (D.getElementById("pm-css")) return;
    var s = D.createElement("style"); s.id = "pm-css";
    s.textContent = [
      ".pm-card{margin:14px 0;border-radius:22px;overflow:hidden;border:1px solid rgba(255,122,122,.32);background:linear-gradient(180deg,#1a0d0e,#0b0707);box-shadow:0 14px 40px rgba(0,0,0,.45);max-width:560px;direction:ltr;text-align:left;font-family:-apple-system,system-ui,sans-serif;color:#ffecec}",
      ".pm-h{position:relative;display:flex;align-items:center;gap:14px;padding:16px;border-bottom:1px solid rgba(255,122,122,.16)}",
      ".pm-h:before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#ff6b6b,#ffc35f,transparent)}",
      ".pm-g{flex:none;position:relative;width:68px;height:68px}",
      ".pm-g svg{width:68px;height:68px;transform:rotate(-90deg)}",
      ".pm-g circle{fill:none;stroke-width:7;stroke-linecap:round}",
      ".pm-g .bg{stroke:rgba(255,255,255,.09)}",
      ".pm-g .fg{transition:stroke-dashoffset 1.1s cubic-bezier(.2,1,.3,1)}",
      ".pm-g b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 18px ui-monospace,Menlo,monospace}",
      ".pm-k{font:700 10px/1 'Space Mono',ui-monospace,monospace;letter-spacing:.16em;color:#ff7a7a}",
      ".pm-t{margin-top:7px;font-size:16.5px;font-weight:700;line-height:1.3;color:#fff2f2}",
      ".pm-v{display:inline-block;margin-top:8px;padding:4px 9px;border-radius:99px;font:700 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#140808}",
      ".pm-r{padding:13px 16px;border-top:1px solid rgba(255,122,122,.1)}",
      ".pm-rt{display:flex;gap:10px;align-items:flex-start}",
      ".pm-n{flex:none;width:22px;height:22px;border-radius:7px;background:rgba(255,122,122,.14);color:#ff9a9a;font:700 12px/22px ui-monospace,Menlo,monospace;text-align:center}",
      ".pm-rt b{display:block;font-size:14.5px;font-weight:650;line-height:1.38;color:#fff2f2;word-break:break-word}",
      ".pm-heat{display:flex;gap:4px;margin:7px 0 0 32px;align-items:center}",
      ".pm-heat i{width:22px;height:5px;border-radius:3px;background:rgba(255,255,255,.12)}",
      ".pm-heat small{margin-left:6px;font:600 10.5px ui-monospace,Menlo,monospace;color:#b78a8a;letter-spacing:.04em}",
      ".pm-why{margin:7px 0 0 32px;font-size:13px;line-height:1.5;color:#c9a3a3;word-break:break-word}",
      ".pm-fix{margin:9px 0 0 32px;padding:10px 12px;border-radius:12px;background:rgba(111,227,160,.07);border:1px solid rgba(111,227,160,.22);display:flex;gap:10px;align-items:center}",
      ".pm-fix span{flex:1;min-width:0;font-size:13px;line-height:1.45;color:#bff2d6;word-break:break-word}",
      ".pm-fix span em{font:700 9.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#6fe3a0;font-style:normal;display:block;margin-bottom:3px}",
      ".pm-fix button{flex:none;border:1px solid rgba(111,227,160,.4);background:rgba(111,227,160,.12);color:#9ff0c3;border-radius:10px;padding:8px 11px;font:600 12px/1 -apple-system,system-ui,sans-serif;cursor:pointer}",
      ".pm-fix button.d{pointer-events:none;background:rgba(111,227,160,.22);border-color:transparent}",
      ".pm-f{padding:14px 16px;border-top:1px solid rgba(255,122,122,.16);background:rgba(255,255,255,.025)}",
      ".pm-f .first{font-size:14px;line-height:1.5;color:#fff2f2}",
      ".pm-f .first em{font:700 10px ui-monospace,Menlo,monospace;letter-spacing:.16em;color:#ffc35f;font-style:normal;display:block;margin-bottom:4px}",
      ".pm-f .ask{margin-top:10px;font-size:13px;line-height:1.5;color:#c9a3a3}",
      ".pm-btns{display:flex;gap:8px;margin-top:12px}",
      ".pm-btns button{flex:1;border:0;border-radius:13px;padding:12px;font:700 13.5px/1 -apple-system,system-ui,sans-serif;cursor:pointer}",
      ".pm-btns .a{background:linear-gradient(135deg,#6fe3a0,#3fbf86);color:#04120b}",
      ".pm-btns .b{background:rgba(255,255,255,.09);color:#ffdede}",
      ".pm-btns button:active{transform:scale(.98)}",
      "#pm-sheet{position:fixed;inset:0;z-index:9700;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}",
      "#pm-sheet.on{display:flex}",
      "#pm-sheet .s{width:100%;max-width:560px;box-sizing:border-box;padding:18px 18px calc(18px + env(safe-area-inset-bottom));border-radius:26px 26px 0 0;background:linear-gradient(180deg,#1d0f10,#0c0707);border:1px solid rgba(255,122,122,.3);border-bottom:0;color:#ffecec;font-family:-apple-system,system-ui,sans-serif}",
      "#pm-sheet h4{margin:0;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;color:#ff7a7a}",
      "#pm-sheet p{margin:8px 0 12px;font-size:14px;line-height:1.5;color:#d9b7b7}",
      "#pm-sheet textarea{width:100%;box-sizing:border-box;min-height:96px;border-radius:14px;border:1px solid rgba(255,122,122,.3);background:rgba(0,0,0,.35);color:#fff;padding:12px 14px;font:16px/1.45 -apple-system,system-ui,sans-serif;resize:none}",
      "#pm-sheet .row{display:flex;gap:8px;margin-top:12px}",
      "#pm-sheet .row button{flex:1;border:0;border-radius:13px;padding:13px;font:700 14px/1 -apple-system,system-ui,sans-serif;cursor:pointer}",
      "#pm-sheet .go{background:linear-gradient(135deg,#ff7a7a,#ffc35f);color:#1a0808}#pm-sheet .no{background:rgba(255,255,255,.1);color:#fff}",
      "body.light-theme .pm-card{background:linear-gradient(180deg,#fff3f1,#fbe8e5);color:#3b1414;border-color:rgba(190,60,60,.3)}",
      "body.light-theme .pm-t,body.light-theme .pm-rt b,body.light-theme .pm-f .first{color:#3b1414}body.light-theme .pm-why,body.light-theme .pm-f .ask{color:#7d4a4a}body.light-theme .pm-fix span{color:#1d5a3a}"
    ].join("\n");
    D.head.appendChild(s);
  }

  function parse(src) {
    var t = String(src || "").trim(), j = null;
    try { j = JSON.parse(t) } catch (e) { var m = /\{[\s\S]*\}/.exec(t); if (m) { try { j = JSON.parse(m[0]) } catch (e2) { } } }
    if (!j || typeof j !== "object" || !Array.isArray(j.risks) || !j.risks.length) return null;
    j.risks = j.risks.filter(function (r) { return r && r.risk }).slice(0, 7);
    j.risks.sort(function (a, b) { return (LV[String(b.chance).toLowerCase()] || 2) * (LV[String(b.impact).toLowerCase()] || 2) - (LV[String(a.chance).toLowerCase()] || 2) * (LV[String(a.impact).toLowerCase()] || 2) });
    return j;
  }
  function heat(r) {
    var c = LV[String(r.chance).toLowerCase()] || 2, i = LV[String(r.impact).toLowerCase()] || 2, s = c * i, col = s >= 6 ? "#ff6b6b" : s >= 3 ? "#ffc35f" : "#6fe3a0";
    var bars = ""; for (var k = 1; k <= 3; k++) bars += '<i style="' + (k <= Math.ceil(s / 3) ? "background:" + col : "") + '"></i>';
    return '<div class="pm-heat">' + bars + "<small>" + String(r.chance || "med").toUpperCase() + " chance · " + String(r.impact || "med").toUpperCase() + " impact</small></div>";
  }
  function html(src) {
    css();
    var j = parse(src); if (!j) return '<pre class="pm-raw">' + esc(src) + "</pre>";
    var sc = Math.max(0, Math.min(100, Math.round(+j.risk || +j.score || 50))), v = VER[String(j.verdict).toLowerCase()] || (sc >= 66 ? VER.stop : sc >= 36 ? VER.careful : VER.go);
    var C = 2 * Math.PI * 28, off = C * (1 - sc / 100);
    var rows = j.risks.map(function (r, i) {
      return '<div class="pm-r"><div class="pm-rt"><span class="pm-n">' + (i + 1) + "</span><b dir=\"auto\">" + esc(r.risk) + "</b></div>" + heat(r) +
        (r.why ? '<div class="pm-why" dir="auto">' + esc(r.why) + "</div>" : "") +
        (r.fix ? '<div class="pm-fix"><span dir="auto"><em>FIX THIS WEEK</em>' + esc(r.fix) + '</span><button type="button" data-i="' + i + '" onclick="PHR_PM.task(this)">+ Task</button></div>' : "") + "</div>";
    }).join("");
    return '<div class="pm-card" data-j="' + encodeURIComponent(JSON.stringify(j)) + '"><div class="pm-h"><div class="pm-g"><svg viewBox="0 0 68 68"><circle class="bg" cx="34" cy="34" r="28"/><circle class="fg" cx="34" cy="34" r="28" stroke="' + v[1] + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b style="color:' + v[1] + '">' + sc + '</b></div><div style="min-width:0"><div class="pm-k">PRE-MORTEM · FAILED IN ADVANCE</div><div class="pm-t" dir="auto">' + esc(j.title || "What could go wrong") + '</div><span class="pm-v" style="background:' + v[1] + '">' + v[0] + "</span></div></div>" + rows +
      '<div class="pm-f">' + (j.first ? '<div class="first" dir="auto"><em>FIRST STEP TODAY</em>' + esc(j.first) + "</div>" : "") + (j.ask ? '<div class="ask" dir="auto">One question that would change this: <b>' + esc(j.ask) + "</b></div>" : "") +
      '<div class="pm-btns"><button type="button" class="a" onclick="PHR_PM.all(this)">Save all fixes as tasks</button><button type="button" class="b" onclick="PHR_PM.again(this)">Run again</button></div></div></div>';
  }
  function data(b) { var c = b.closest(".pm-card"); try { return c ? JSON.parse(decodeURIComponent(c.dataset.j)) : null } catch (e) { return null } }
  function addTask(r, title) { try { return !!(W.LIFE && W.LIFE.add({ text: "Fix: " + r.fix + (title ? " (" + title + ")" : ""), kind: "plan", src: "premortem" })) } catch (e) { return false } }
  function toast(t) { try { W.showToast && W.showToast(t, "info") } catch (e) { } }

  /* ───────── ask sheet ───────── */
  var sheet;
  function ask(pre) {
    css();
    if (!sheet) {
      sheet = D.createElement("div"); sheet.id = "pm-sheet";
      sheet.innerHTML = '<div class="s"><h4>PRE-MORTEM</h4><p>What are you about to decide, launch or start? I’ll imagine it has already failed and tell you why, using what I know about you.</p><textarea id="pm-q" placeholder="e.g. Launch my restaurant template on Zhaket this Friday"></textarea><div class="row"><button class="no" type="button" onclick="PHR_PM.close()">Cancel</button><button class="go" type="button" onclick="PHR_PM.go()">Run pre-mortem</button></div></div>';
      sheet.addEventListener("click", function (e) { if (e.target === sheet) close() });
      D.body.appendChild(sheet);
    }
    try { W.closeAccountPage && W.closeAccountPage() } catch (e) { }
    setTimeout(function () { sheet.classList.add("on"); var q = D.getElementById("pm-q"); if (q) { q.value = typeof pre === "string" ? pre : ""; setTimeout(function () { try { q.focus() } catch (e) { } }, 200) } }, 380);
  }
  function close() { if (sheet) sheet.classList.remove("on") }
  function go() {
    var q = D.getElementById("pm-q"), t = q ? q.value.trim() : ""; if (t.length < 4) { toast("Describe it in a few words"); return }
    close(); start(t);
  }
  function start(t) { W.__phrPM = Date.now(); try { return W.PHR_sendText("Pre-mortem: " + t) } catch (e) { return false } }

  /* ───────── personal context for the prompt ───────── */
  function context() {
    var out = [];
    try { var h = W.PHR_AX && W.PHR_AX.habits && W.PHR_AX.habits(); if (h && h.length) out.push("Habits: " + h.map(function (x) { return x.title + " (" + x.why + ")" }).join(" | ")) } catch (e) { }
    try {
      var a = JSON.parse(LS("phr_activity_v1") || "[]").slice(-12).map(function (e) { return e.c }); if (a.length) out.push("Recent things they asked the agent: " + a.join("; "));
    } catch (e) { }
    try {
      var L = W.LIFE && W.LIFE.all ? W.LIFE.all() : [], now = Date.now();
      var open = L.filter(function (e) { return e.due && !e.done }).sort(function (x, y) { return x.due - y.due }).slice(0, 6).map(function (e) { return e.t + (e.due < now ? " [OVERDUE]" : "") }); if (open.length) out.push("Open dated items: " + open.join("; "));
      var facts = L.filter(function (e) { return !e.due }).slice(0, 8).map(function (e) { return e.t }); if (facts.length) out.push("Things they told you to remember: " + facts.join("; "));
      var od = L.filter(function (e) { return e.due && !e.done && e.due < now }).length; if (od) out.push("Overdue count: " + od);
    } catch (e) { }
    return out.join("\n");
  }
  function prompt(text) {
    var on = (W.__phrPM && Date.now() - W.__phrPM < 120000) || /^\s*pre-?mortem\b/i.test(String(text || "")); if (!on) return "";
    var ctx = context();
    return "\n\nPRE-MORTEM: the user wants to know how a plan, decision or launch could FAIL. Imagine it is 3 months later and it failed, then work out why. Reply with ONE short line in THEIR language, then exactly one fenced block: ```premortem\n{\"title\":\"short name of the plan\",\"risk\":0-100 overall chance of failure,\"verdict\":\"go|careful|stop\",\"risks\":[{\"risk\":\"specific way it fails\",\"chance\":\"high|med|low\",\"impact\":\"high|med|low\",\"why\":\"one sentence, tied to THIS person\",\"fix\":\"one concrete action doable this week\"}],\"first\":\"the single first step to take today\",\"ask\":\"the one question whose answer would change your verdict most\"}\n``` Give 4-6 risks, most dangerous first. No generic filler (no 'market changes', 'lack of motivation'). Be specific: use their situation, time, money, habits and open commitments. If you lack facts, base risks on the plan text and put the missing fact in \"ask\". Valid JSON only; keep every string short."
      + (ctx ? "\nWHAT YOU KNOW ABOUT THEM (use it, do not recite it):\n" + ctx : "");
  }

  W.PHR_PM = {
    html: html, ask: ask, close: close, go: go, start: start, prompt: prompt, context: context,
    task: function (b) { var j = data(b), r = j && j.risks[+b.dataset.i]; if (!r) return; var ok = addTask(r, j.title); b.className = ok ? "d" : ""; b.textContent = ok ? "✓ Added" : "Couldn't"; b.removeAttribute("onclick") },
    all: function (b) { var j = data(b); if (!j) return; var n = 0; j.risks.forEach(function (r) { if (r.fix && addTask(r, j.title)) n++ }); [].forEach.call(b.closest(".pm-card").querySelectorAll(".pm-fix button"), function (x) { x.className = "d"; x.textContent = "✓ Added"; x.removeAttribute("onclick") }); b.disabled = true; b.textContent = "✓ " + n + " tasks saved"; try { W.haptic && W.haptic("medium") } catch (e) { } },
    again: function (b) { var j = data(b); ask(j && j.title ? j.title + " — " : "") }
  };

  /* ───────── agent hook ───────── */
  var RX = /^(?:please |hey |ok )?(?:run |do |give me |start )?(?:a |an )?(?:pre-?\s?mortem|stress[- ]test)(?: (?:on|for|of|my))?\s*[:\-–—]?\s*(.*)$|^what (?:could|can|might) go wrong(?: with| if| when| in)?\s*(.*)$|^(?:پری ?مورتم|پیش ?مرگ|چی ممکنه خراب بشه|چه چیزی ممکنه اشتباه بشه|چی ممکنه اشتباه بشه)\s*[:\-–—]?\s*(.*)$/i;
  function handle(raw) {
    var t = String(raw || "").trim().replace(/\s+/g, " ").replace(/[.!؟?]+$/, ""), m = RX.exec(t); if (!m || (/^Pre-mortem:/i.test(t) && W.__phrPM && Date.now() - W.__phrPM < 4000)) return false;
    var body = (m[1] || m[2] || m[3] || "").trim(), fa = /[؀-ۿ]/.test(t);
    if (body.length >= 6) { start(body); return fa ? "دارم بررسی می‌کنم." : "Running it." }
    ask(""); return fa ? "بگو چی رو می‌خوای بررسی کنم." : "Tell me what to stress-test.";
  }
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__pm) return false; A.__pm = true;
    var oT = A.typed, oV = A.voice, oP = A.prompt;
    A.typed = function (t) { var r; try { r = handle(t) } catch (e) { r = false } return r || oT(t) };
    A.voice = function (t, quiet) { var r; try { r = handle(t) } catch (e) { r = false } if (r) { if (quiet) return r; try { (W.auraSetCaption || function () { })(r, "hint"); (W.auraSpeak || function () { })(r) } catch (e) { } return true } return oV(t, quiet) };
    A.prompt = function (t) { return oP(t) + prompt(t) };
    return true;
  }
  (function wait(n) { if (!install() && n < 120) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
