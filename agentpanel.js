/* Phraortes — Agent section of the Account panel (agentpanel.js)
   Adds to the Account hub: a live agent card, Memory / Routines / Activity shortcuts, and three full panes:
   Dashboard (7-day chart, what you use it for), Routines manager, Activity log. Memory opens the existing Life Memory sheet. */
(function () {
  "use strict";
  var W = window, D = document, $ = function (s, r) { return (r || D).querySelector(s) };
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  var KEY = "phr_activity_v1", MAX = 200;
  var INT = [
    [/^(capture|scan)|اسکن|کپچر/, "capture", "Capture"],
    [/(make|generate|create|imagine).*(image|picture|photo|logo|poster|wallpaper)|\/imagine|عکس.*بساز/, "image", "Images"],
    [/board|draw|sketch|plot|circle|cube|line|تخته|بکش|رسم/, "board", "Whiteboard"],
    [/timer|alarm|remind|تایمر|زنگ|یادآور/, "timer", "Timers & alarms"],
    [/remember|recall|forget|what do you remember|یادت باشه|یادته|فراموش/, "memory", "Memory"],
    [/routine|habit|روتین/, "routine", "Routines"],
    [/photo|picture|file|camera|عکس|فایل|دوربین/, "device", "Photos & files"],
    [/mission|background|ماموریت|مأموریت/, "mission", "Missions"]
  ];
  function intent(t) { t = String(t || "").toLowerCase(); for (var i = 0; i < INT.length; i++) if (INT[i][0].test(t)) return INT[i][1]; return "chat" }
  var LABEL = { capture: "Capture", image: "Images", board: "Whiteboard", timer: "Timers & alarms", memory: "Memory", routine: "Routines", device: "Photos & files", mission: "Missions", chat: "Questions & chat" };
  var COLOR = { capture: "#6fe3a0", image: "#E8C468", board: "#7fb2ff", timer: "#ff9f6b", memory: "#e48cff", routine: "#5fd0d0", device: "#ffd166", mission: "#9aa5ff", chat: "#b9b2a0" };

  /* ───────── activity log ───────── */
  function log() { try { return JSON.parse(LS(KEY) || "[]") } catch (e) { return [] } }
  function push(c, ok, src) {
    if (LS("phr_act_off") === "1") return;
    c = String(c || "").trim(); if (c.length < 2) return;
    var a = log(), l = a[a.length - 1], now = Date.now();
    if (l && l.c === c && now - l.t < 4000) { if (ok !== undefined && ok !== null) l.ok = ok ? 1 : 0; LS(KEY, JSON.stringify(a)); return }
    a.push({ t: now, c: c.slice(0, 160), i: intent(c), ok: ok === false ? 0 : 1, s: src || "agent" });
    while (a.length > MAX) a.shift(); LS(KEY, JSON.stringify(a));
  }
  function mark(ok) { var a = log(); if (!a.length) return; a[a.length - 1].ok = ok ? 1 : 0; LS(KEY, JSON.stringify(a)) }

  function hook() {
    var C = W.PHR_CON, A = W.PHR_AGENT, done = 0;
    if (C && C.ev && !C.__ax) {
      C.__ax = 1; var o = C.ev;
      C.ev = function (t, a, b) { try { if (t === "cmd") push(a, true, "voice"); else if (t === "err") mark(false); else if (t === "done" || t === "answer") mark(true) } catch (e) { } return o.apply(this, arguments) };
      done++;
    } else if (C && C.__ax) done++;
    if (A && !A.__ax) {
      A.__ax = 1; var oT = A.typed, oV = A.voice;
      var mk = function (t) { if (!/^(?:please )?(?:make|turn|save) (?:that|it|this|the habit) (?:into )?(?:a |an )?(?:routine|shortcut|habit)/i.test(String(t).trim())) return false; var h = habits()[0]; if (!h) return "I haven't spotted a repeating habit yet. Keep using me and I'll find one."; var n = makeRoutine(h); return "Done. Say “" + n + "” any time to run it."; };
      A.typed = function (t) { var m = mk(t); if (m) return m; var r = oT(t); if (r) try { push(t, true, "chat") } catch (e) { } return r };
      A.voice = function (t, q) { var m = mk(t); if (m) { try { (W.auraSpeak || function () { })(m) } catch (e) { } return true } var r = oV(t, q); if (r) try { push(t, true, "aura") } catch (e) { } return r };
      done++;
    } else if (A && A.__ax) done++;
    return done >= 2;
  }
  (function wait(n) { if (!hook() && n < 200) setTimeout(function () { wait(n + 1) }, 200) })(0);


  /* ───────── Habit Radar: the agent learns what you repeat and offers to automate it ───────── */
  function normCmd(c) { return String(c || "").toLowerCase().replace(/^(?:hey |ok |please |can you |could you )+/, "").replace(/[.!?؟]+$/, "").replace(/\s+/g, " ").trim() }
  var STOP = /^(?:set|a|an|the|for|my|to|me|open|start|run|make|create|please|up|on|of|and|then|new|at|in|it|show|go)$/;
  function shortName(c) { var w = normCmd(c).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(function (x) { return x && !STOP.test(x) }).slice(0, 3).join(" "); return w || normCmd(c).slice(0, 18) }
  function dayPart(h) { return h < 5 ? "late at night" : h < 11 ? "in the morning" : h < 14 ? "around noon" : h < 18 ? "in the afternoon" : h < 22 ? "in the evening" : "at night" }
  function dismissed() { try { return JSON.parse(LS("phr_habit_dis") || "[]") } catch (e) { return [] } }
  function habits() {
    var a = log().filter(function (e) { return e.i !== "chat" && e.c.length < 90 }), out = [], dis = dismissed(), by = {}, i;
    a.forEach(function (e) { var k = normCmd(e.c); if (k.length < 4 || /^(run|start) /.test(k) && routines().some(function (r) { return k.indexOf(r.name.toLowerCase()) >= 0 })) return; (by[k] = by[k] || []).push(e) });
    Object.keys(by).forEach(function (k) {
      var l = by[k]; if (l.length < 3) return;
      var days = {}; l.forEach(function (e) { days[dayStart(e.t)] = 1 }); var nd = Object.keys(days).length; if (nd < 2) return;
      var hrs = l.map(function (e) { return new Date(e.t).getHours() + new Date(e.t).getMinutes() / 60 }), mean = hrs.reduce(function (s, x) { return s + x }, 0) / hrs.length;
      var near = hrs.filter(function (h) { return Math.abs(h - mean) <= 1.5 }).length, timed = near / hrs.length >= .66;
      out.push({ id: "c:" + k, kind: "repeat", title: "“" + k + "”", why: "You asked " + l.length + " times on " + nd + " days" + (timed ? ", usually " + dayPart(Math.round(mean)) : "") + ".", name: shortName(k), steps: [k], score: l.length * 2 + (timed ? 3 : 0) });
    });
    /* sequences: A then B within 3 minutes, seen 3+ times */
    var pairs = {};
    for (i = 1; i < a.length; i++) { var p = a[i - 1], q = a[i]; if (q.t - p.t > 18e4 || q.t - p.t < 0) continue; var kp = normCmd(p.c), kq = normCmd(q.c); if (kp === kq) continue; var key = kp + " → " + kq; (pairs[key] = pairs[key] || { a: kp, b: kq, n: 0 }).n++ }
    Object.keys(pairs).forEach(function (k) { var pr = pairs[k]; if (pr.n < 3) return; out.push({ id: "s:" + k, kind: "sequence", title: "“" + pr.a + "” then “" + pr.b + "”", why: "You did these back to back " + pr.n + " times.", name: (shortName(pr.a).split(" ")[0] + " " + shortName(pr.b).split(" ")[0]).trim(), steps: [pr.a, pr.b], score: pr.n * 3 + 2 }) });
    var inSeq = []; out.forEach(function (h) { if (h.kind === "sequence") inSeq = inSeq.concat(h.steps) });
    out = out.filter(function (h) { return !(h.kind === "repeat" && inSeq.indexOf(h.steps[0]) >= 0) });
    out = out.filter(function (h) { return dis.indexOf(h.id) < 0 && !routines().some(function (r) { return JSON.stringify(r.steps) === JSON.stringify(h.steps) }) });
    out.sort(function (x, y) { return y.score - x.score });
    return out.slice(0, 3);
  }
  function makeRoutine(h) { var a = routines().filter(function (r) { return r.name.toLowerCase() !== h.name.toLowerCase() }); a.push({ name: h.name, steps: h.steps, at: Date.now(), auto: 1 }); LS("phr_routines_v1", JSON.stringify(a)); return h.name }
  function habitCards() {
    var hs = habits(); if (!hs.length) return "";
    return '<div class="ax-c" style="border-color:rgba(232,196,104,.4);background:linear-gradient(160deg,rgba(232,196,104,.12),rgba(255,255,255,.02))"><h4 style="color:#E8C468">✦ Habit radar · I noticed</h4>' + hs.map(function (h, i) {
      return '<div class="ax-row"><div class="tx" dir="auto">' + esc(h.title) + "<small>" + esc(h.why) + ' Make it one tap: say “<b>' + esc(h.name) + '</b>”.</small></div><div style="display:flex;flex-direction:column;gap:6px"><button class="ax-b g" onclick="PHR_AX.habit(' + i + ')">Make routine</button><button class="ax-b" onclick="PHR_AX.hide(' + i + ')">Not now</button></div></div>';
    }).join("") + "</div>";
  }

  /* ───────── data helpers ───────── */
  function dayStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() }
  function stats() {
    var a = log(), t0 = dayStart(Date.now()), days = [], i, by = {}, ok = 0;
    for (i = 6; i >= 0; i--) days.push({ s: t0 - i * 864e5, n: 0 });
    a.forEach(function (e) { by[e.i] = (by[e.i] || 0) + 1; if (e.ok) ok++; for (var k = 0; k < 7; k++) if (e.t >= days[k].s && e.t < days[k].s + 864e5) days[k].n++ });
    var today = days[6].n, streak = 0; for (i = 6; i >= 0 && days[i].n > 0; i--) streak++;
    return { all: a, total: a.length, today: today, days: days, by: by, ok: a.length ? Math.round(ok / a.length * 100) : 100, streak: streak };
  }
  function routines() { try { return W.PHR_BRAIN ? W.PHR_BRAIN.routines() : [] } catch (e) { return [] } }
  function memCount() { try { return W.LIFE ? W.LIFE.all().length : 0 } catch (e) { return 0 } }
  function wakeOn() { try { return !!(W.PHR_WAKE && W.PHR_WAKE.enabled()) } catch (e) { return false } }

  /* ───────── styles ───────── */
  function css() {
    if ($("#ax-css")) return;
    var s = D.createElement("style"); s.id = "ax-css";
    s.textContent = [
      ".ax-h{margin:22px 4px 8px;font:600 10.5px 'Space Mono',ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.45)}",
      ".ax-hero{position:relative;display:flex;align-items:center;gap:14px;width:100%;text-align:left;border:.5px solid rgba(111,227,160,.32);border-radius:26px;padding:16px;color:#fff;cursor:pointer;overflow:hidden;background:radial-gradient(120% 140% at 0 0,rgba(111,227,160,.16),transparent 55%),linear-gradient(160deg,#0d1a14,#07100c);-webkit-tap-highlight-color:transparent;transition:transform .25s cubic-bezier(.2,1,.3,1)}",
      ".ax-hero:active{transform:scale(.975)}",
      ".ax-hero:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 1px,transparent 1px 3px);pointer-events:none;opacity:.55}",
      ".ax-hero>*{position:relative}",
      ".ax-orb{flex:none;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(111,227,160,.28),rgba(111,227,160,.04) 65%);border:1px solid rgba(111,227,160,.5);box-shadow:0 0 24px rgba(111,227,160,.25)}",
      ".ax-orb i{width:12px;height:12px;border-radius:50%;background:var(--ax,#6fe3a0);box-shadow:0 0 14px var(--ax,#6fe3a0);animation:axp 1.8s ease-in-out infinite}",
      ".ax-orb.off{border-color:rgba(255,255,255,.18);box-shadow:none;background:rgba(255,255,255,.04)}",
      ".ax-orb.off i{--ax:#6b7a72;animation:none;box-shadow:none}",
      "@keyframes axp{50%{transform:scale(1.7);opacity:.45}}",
      ".ax-hero b{display:block;font:700 12px 'Space Mono',ui-monospace,monospace;letter-spacing:.16em;color:#9ff0c3}",
      ".ax-hero strong{display:block;margin-top:5px;font:600 16.5px/1.25 -apple-system,system-ui,sans-serif;color:#f3fff8}",
      ".ax-hero span{display:block;margin-top:3px;font:500 12.5px/1.35 -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.55)}",
      ".ax-hero .go{margin-left:auto;flex:none;font-size:22px;color:rgba(255,255,255,.35)}",
      ".ax-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}",
      ".ax-t{position:relative;text-align:left;border:.5px solid rgba(255,255,255,.14);border-radius:22px;padding:14px 12px 12px;color:#fff;cursor:pointer;background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.025));-webkit-tap-highlight-color:transparent;transition:transform .25s cubic-bezier(.2,1,.3,1)}",
      ".ax-t:active{transform:scale(.95)}",
      ".ax-t em{display:block;font:700 26px/1 'Playfair Display',Georgia,serif;font-style:normal}",
      ".ax-t small{display:block;margin-top:7px;font:600 10px 'Space Mono',ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55)}",
      ".ax-t i{position:absolute;right:10px;top:10px;width:7px;height:7px;border-radius:50%;background:var(--c)}",
      /* panes */
      "#ax-pane{position:fixed;left:0;right:0;bottom:0;top:8vh;z-index:8001;background:radial-gradient(120% 60% at 50% -10%,color-mix(in srgb,var(--p) 14%,#15100a),#0a0806 70%);color:#fff;border-top-left-radius:26px;border-top-right-radius:26px;border-top:.5px solid rgba(255,255,255,.14);transform:translateX(100%);visibility:hidden;transition:transform .5s cubic-bezier(.2,1,.3,1),visibility 0s .5s;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}",
      "#ax-pane.on{transform:none;visibility:visible;transition:transform .5s cubic-bezier(.2,1,.3,1)}",
      "#ax-pane .bar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;padding:12px 14px 10px;background:linear-gradient(#0c0906,rgba(12,9,6,.86));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}",
      "#ax-pane .bar button{border:0;background:none;color:var(--p-hi,var(--p));font:500 17px -apple-system,system-ui,sans-serif;display:flex;align-items:center;gap:2px;cursor:pointer;padding:6px 4px}",
      "#ax-pane .bar h3{position:absolute;left:0;right:0;text-align:center;margin:0;font:600 17px -apple-system,system-ui,sans-serif;pointer-events:none}",
      "#ax-pane .in{max-width:560px;margin:0 auto;padding:6px 16px calc(40px + env(safe-area-inset-bottom))}",
      ".ax-c{border:.5px solid rgba(255,255,255,.13);border-radius:24px;padding:16px;margin-top:12px;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02))}",
      ".ax-c h4{margin:0 0 12px;font:600 10.5px 'Space Mono',ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5)}",
      ".ax-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
      ".ax-st div{text-align:center}.ax-st em{display:block;font:700 28px/1 'Playfair Display',Georgia,serif;font-style:normal}.ax-st small{display:block;margin-top:6px;font:600 9.5px 'Space Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5)}",
      ".ax-bars{display:flex;align-items:flex-end;gap:8px;height:110px}",
      ".ax-bars div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px}",
      ".ax-bars i{display:block;width:100%;border-radius:8px 8px 4px 4px;background:linear-gradient(#6fe3a0,#2f9d6c);min-height:4px;transition:height .9s cubic-bezier(.16,1,.3,1)}",
      ".ax-bars i.z{background:rgba(255,255,255,.1)}",
      ".ax-bars small{font:600 9.5px 'Space Mono',monospace;color:rgba(255,255,255,.45)}",
      ".ax-use{display:flex;align-items:center;gap:10px;margin:9px 0;font:500 13.5px -apple-system,system-ui,sans-serif}",
      ".ax-use span{width:112px;flex:none;color:rgba(255,255,255,.8)}.ax-use u{flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;text-decoration:none}.ax-use u i{display:block;height:100%;border-radius:5px;transition:width .9s cubic-bezier(.16,1,.3,1)}.ax-use b{width:26px;text-align:right;font:600 12px 'Space Mono',monospace;color:rgba(255,255,255,.6)}",
      ".ax-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:.5px solid rgba(255,255,255,.1)}.ax-row:first-of-type{border-top:0}",
      ".ax-row .tx{flex:1;min-width:0;font:600 15px/1.35 -apple-system,system-ui,sans-serif;word-break:break-word}.ax-row .tx small{display:block;margin-top:3px;font:500 12px/1.4 -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.5);font-weight:500}",
      ".ax-b{flex:none;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;border-radius:12px;padding:8px 13px;font:600 12.5px -apple-system,system-ui,sans-serif;cursor:pointer}",
      ".ax-b.g{background:rgba(111,227,160,.16);border-color:rgba(111,227,160,.45);color:#9ff0c3}.ax-b.r{color:#ff8f8f;border-color:rgba(255,120,120,.35);background:rgba(255,90,90,.08)}",
      ".ax-b:active{transform:scale(.95)}",
      ".ax-tag{flex:none;font:700 9.5px 'Space Mono',monospace;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;border-radius:99px;color:#0b0b0b;background:var(--c)}",
      ".ax-em{text-align:center;padding:26px 8px;color:rgba(255,255,255,.55);font:500 14px/1.6 -apple-system,system-ui,sans-serif}.ax-em b{color:#fff}",
      ".ax-f{display:flex;flex-direction:column;gap:8px}.ax-f input{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;padding:12px 14px;font:16px -apple-system,system-ui,sans-serif}",
      ".ax-sw{position:relative;display:inline-block;width:51px;height:31px;flex:none}.ax-sw input{opacity:0;width:0;height:0}.ax-sw span{position:absolute;inset:0;border-radius:99px;background:rgba(255,255,255,.18);transition:.3s;cursor:pointer}.ax-sw span:before{content:'';position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;transition:.3s cubic-bezier(.2,1,.3,1);box-shadow:0 2px 6px rgba(0,0,0,.35)}.ax-sw input:checked+span{background:#34C759}.ax-sw input:checked+span:before{transform:translateX(20px)}",
      "body.light-theme .ax-hero,body.light-theme .ax-t,body.light-theme .ax-c{color:#2b2313}",
      "body.light-theme #ax-pane{background:rgba(250,246,238,.99);color:#2b2313}body.light-theme #ax-pane .bar{background:rgba(250,246,238,.9)}"
    ].join("\n");
    D.head.appendChild(s);
  }

  /* ───────── hub section ───────── */
  function ensureHub() {
    var hub = $("#ac2-hub"); if (!hub || $("#ax-sec")) return !!$("#ax-sec");
    var first = hub.querySelector(".ac2-list"); if (!first) return false;
    css();
    var s = D.createElement("div"); s.id = "ax-sec";
    s.innerHTML = '<div class="ax-h">Agent</div>' +
      '<button class="ax-hero" type="button" onclick="PHR_AX.open(\'dash\')"><div class="ax-orb off" id="ax-orb"><i></i></div><div style="min-width:0"><b>PHRAORTES //AGENT</b><strong id="ax-line">Voice is off</strong><span id="ax-sub">—</span></div><div class="go">›</div></button>' +
      '<div class="ax-3"><button type="button" class="ax-t" style="--c:#e48cff" onclick="PHR_AX.open(\'memory\')"><i></i><em id="ax-n-mem">0</em><small>Memory</small></button>' +
      '<button type="button" class="ax-t" style="--c:#5fd0d0" onclick="PHR_AX.open(\'routines\')"><i></i><em id="ax-n-rt">0</em><small>Routines</small></button>' +
      '<button type="button" class="ax-t" style="--c:#E8C468" onclick="PHR_AX.open(\'activity\')"><i></i><em id="ax-n-act">0</em><small>Activity</small></button></div>';
    hub.insertBefore(s, first); refresh(); return true;
  }
  function refresh() {
    if (!$("#ax-sec")) return;
    var st = stats(), on = wakeOn(), r = routines().length, m = memCount();
    $("#ax-orb").className = "ax-orb" + (on ? "" : " off");
    $("#ax-line").textContent = on ? "Listening for “Hey Phraortes”" : "Voice is off";
    var hb = 0; try { hb = habits().length } catch (e) { }
    $("#ax-sub").textContent = hb ? "✦ " + hb + " habit" + (hb === 1 ? "" : "s") + " found · tap to review" : st.today + " command" + (st.today === 1 ? "" : "s") + " today" + (st.streak > 1 ? " · " + st.streak + "-day streak" : "") + (on ? "" : " · tap to set up");
    $("#ax-n-mem").textContent = m; $("#ax-n-rt").textContent = r; $("#ax-n-act").textContent = st.total;
  }

  /* ───────── panes ───────── */
  var pane, cur = "";
  function build() {
    if (pane) return; css();
    pane = D.createElement("div"); pane.id = "ax-pane";
    pane.innerHTML = '<div class="bar"><button type="button" onclick="PHR_AX.back()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>Account</button><h3 id="ax-t"></h3></div><div class="in" id="ax-in"></div>';
    D.body.appendChild(pane);
  }
  function fmtT(t) { var d = new Date(t), n = new Date(), p = function (x) { return ("0" + x).slice(-2) }; var hm = p(d.getHours()) + ":" + p(d.getMinutes()); if (dayStart(d) === dayStart(n)) return "Today · " + hm; if (dayStart(d) === dayStart(n) - 864e5) return "Yesterday · " + hm; return d.getDate() + "/" + (d.getMonth() + 1) + " · " + hm }

  function viewDash() {
    var st = stats(), on = wakeOn(), mx = Math.max.apply(null, st.days.map(function (d) { return d.n }).concat([1]));
    var dn = ["S", "M", "T", "W", "T", "F", "S"];
    var bars = st.days.map(function (d) { return '<div><i class="' + (d.n ? "" : "z") + '" data-h="' + Math.round(d.n / mx * 84) + '" style="height:4px"></i><small>' + dn[new Date(d.s).getDay()] + "</small></div>" }).join("");
    var keys = Object.keys(st.by).sort(function (a, b) { return st.by[b] - st.by[a] }), top = st.by[keys[0]] || 1;
    var uses = keys.length ? keys.slice(0, 6).map(function (k) { return '<div class="ax-use"><span>' + esc(LABEL[k]) + '</span><u><i data-w="' + Math.round(st.by[k] / top * 100) + '" style="width:0;background:' + COLOR[k] + '"></i></u><b>' + st.by[k] + "</b></div>" }).join("") : '<div class="ax-em">Nothing yet. Say <b>“Hey Phraortes, set a timer for 5 minutes”</b> and it shows up here.</div>';
    return habitCards() + '<div class="ax-c" style="margin-top:6px"><div class="ax-row" style="border:0;padding:0"><div class="tx">Wake by voice<small>' + (on ? "On. Say “Hey Phraortes”." : "Off. Turn on, then tap the screen once.") + '</small></div><label class="ax-sw"><input type="checkbox" id="ax-wk"' + (on ? " checked" : "") + ' onchange="PHR_AX.wake(this.checked)"><span></span></label></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px"><button class="ax-b g" style="flex:1;padding:12px" onclick="PHR_AX.console()">Open agent console</button><button class="ax-b" style="flex:1;padding:12px" onclick="PHR_AX.open(\'memory\')">Memory</button></div></div>' +
      '<div class="ax-c"><h4>Overview</h4><div class="ax-st"><div><em>' + st.today + "</em><small>Today</small></div><div><em>" + st.total + "</em><small>All time</small></div><div><em>" + st.ok + "%</em><small>Success</small></div></div></div>" +
      '<div class="ax-c"><h4>Last 7 days</h4><div class="ax-bars">' + bars + "</div></div>" +
      '<div class="ax-c"><h4>What you use it for</h4>' + uses + "</div>";
  }
  function viewRoutines() {
    var rs = routines();
    var list = rs.length ? rs.map(function (r, i) {
      return '<div class="ax-row"><div class="tx">' + esc(r.name) + "<small>" + esc((r.steps || []).join("  →  ")) + '</small></div><div style="display:flex;flex-direction:column;gap:6px"><button class="ax-b g" onclick="PHR_AX.runR(' + i + ')">Run</button><button class="ax-b r" onclick="PHR_AX.delR(' + i + ')">Delete</button></div></div>';
    }).join("") : '<div class="ax-em">No routines yet.<br>Create one below, or say <b>“create routine study mode: timer 25 minutes, dark mode”</b>.</div>';
    return '<div class="ax-c" style="margin-top:6px">' + list + '</div><div class="ax-c"><h4>New routine</h4><div class="ax-f"><input id="ax-rn" placeholder="Name, e.g. morning" autocapitalize="off"><input id="ax-rs" placeholder="Steps separated by commas, e.g. weather, my tasks, timer 25 minutes" autocapitalize="off"><button class="ax-b g" style="padding:13px" onclick="PHR_AX.addR()">Save routine</button></div></div>';
  }
  function viewActivity() {
    var a = log().slice().reverse();
    if (!a.length) return '<div class="ax-em" style="margin-top:20px">No activity yet.<br>Everything the agent does for you will be listed here.</div>';
    return '<div class="ax-c" style="margin-top:6px">' + a.slice(0, 80).map(function (e) {
      return '<div class="ax-row"><div class="tx" dir="auto">' + esc(e.c) + "<small>" + fmtT(e.t) + " · " + esc(e.s) + " · " + (e.ok ? "done" : "failed") + '</small></div><span class="ax-tag" style="--c:' + COLOR[e.i] + '">' + esc((LABEL[e.i] || "").split(" ")[0]) + "</span></div>";
    }).join("") + '</div><div style="text-align:center;margin-top:16px"><button class="ax-b r" onclick="PHR_AX.clear()">Clear activity</button></div>';
  }
  function render() {
    var el = $("#ax-in"), T = { dash: "Agent", routines: "Routines", activity: "Activity" }, X = (W.PHR_AX && W.PHR_AX.views || {})[cur];
    $("#ax-t").textContent = X ? X.title : (T[cur] || "");
    el.innerHTML = X ? X.render() : cur === "dash" ? viewDash() : cur === "routines" ? viewRoutines() : viewActivity();
    if (X && X.after) { try { X.after(el) } catch (e) { } }
    setTimeout(function () {
      [].forEach.call(el.querySelectorAll("[data-h]"), function (i) { i.style.height = Math.max(4, +i.dataset.h) + "px" });
      [].forEach.call(el.querySelectorAll("[data-w]"), function (i) { i.style.width = i.dataset.w + "%" });
    }, 60);
  }
  function toast(t) { try { if (typeof W.showToast === "function") W.showToast(t, "info") } catch (e) { } }

  W.PHR_AX = {
    open: function (v) {
      if (v === "memory") { try { W.closeAccountPage && W.closeAccountPage() } catch (e) { } setTimeout(function () { try { W.LIFE.open() } catch (e) { } }, 380); return }
      build(); cur = v; render(); pane.scrollTop = 0; pane.classList.add("on"); try { W.haptic && W.haptic("light") } catch (e) { }
    },
    back: function () { if (pane) pane.classList.remove("on"); refresh(); try { W.haptic && W.haptic("light") } catch (e) { } },
    wake: function (v) { try { W.PHR_WAKE.setEnabled(!!v) } catch (e) { } setTimeout(function () { if (cur === "dash") render(); refresh() }, 250) },
    console: function () { try { W.closeAccountPage && W.closeAccountPage() } catch (e) { } if (pane) pane.classList.remove("on"); setTimeout(function () { try { W.PHR_CON.open() } catch (e) { } }, 380) },
    runR: function (i) { var r = routines()[i]; if (!r) return; try { W.closeAccountPage && W.closeAccountPage() } catch (e) { } if (pane) pane.classList.remove("on"); setTimeout(function () { try { W.PHR_AGENT.typed("run " + r.name) } catch (e) { } }, 450) },
    delR: function (i) { var a = routines(), r = a[i]; if (!r) return; a.splice(i, 1); LS("phr_routines_v1", JSON.stringify(a)); render(); refresh() },
    addR: function () {
      var n = ($("#ax-rn").value || "").trim(), s = ($("#ax-rs").value || "").trim(); if (!n || !s) { toast("Add a name and at least one step"); return }
      var steps = s.split(/\s*,\s*/).filter(Boolean), a = routines().filter(function (r) { return r.name.toLowerCase() !== n.toLowerCase() }); a.push({ name: n, steps: steps, at: Date.now() }); LS("phr_routines_v1", JSON.stringify(a)); render(); refresh(); toast("Routine saved");
    },
    habit: function (i) { var h = habits()[i]; if (!h) return; var n = makeRoutine(h); toast("Routine “" + n + "” created. Say its name to run it."); render(); refresh() },
    hide: function (i) { var h = habits()[i]; if (!h) return; var d = dismissed(); d.push(h.id); LS("phr_habit_dis", JSON.stringify(d)); render(); refresh() },
    habits: habits,
    clear: function () { LS(KEY, "[]"); render(); refresh() },
    refresh: refresh, log: push, stats: stats,
    views: {}, rerender: function () { if (pane && pane.classList.contains("on")) render() }, toast: toast
  };

  /* keep the hub card fresh whenever the Account page opens or returns to the hub */
  function patch() {
    if (W.__axp) return true; if (typeof W.openAccountPage !== "function" || typeof W.acBack !== "function") return false; W.__axp = 1;
    var oo = W.openAccountPage; W.openAccountPage = function () { var r = oo.apply(this, arguments); setTimeout(function () { ensureHub(); refresh() }, 360); return r };
    var ob = W.acBack; W.acBack = function () { var r = ob.apply(this, arguments); setTimeout(refresh, 300); return r };
    var oc = W.closeAccountPage; if (typeof oc === "function") W.closeAccountPage = function () { if (pane) pane.classList.remove("on"); return oc.apply(this, arguments) };
    return true;
  }
  (function wait(n) { var a = ensureHub(), b = patch(); if (!(a && b) && n < 150) setTimeout(function () { wait(n + 1) }, 250) })(0);
})();
