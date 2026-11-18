/* Phraortes — Shadow Agent (shadow.js)
   Works quietly in the background. It never interrupts a task: at most a few times a day a small chip rises above the
   input with ONE useful suggestion drawn from what you actually do —
     • something you usually do around this time of day (and haven't yet today)
     • a habit it spotted that can become a one-word routine
     • something that is overdue
   Every chip can be done in one tap, skipped, or silenced for good. Controls: Account → Agent → Shadow. */
(function () {
  "use strict";
  var W = window, D = document, KEY = "phr_shadow_v1", ACT = "phr_activity_v1";
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function $(s, r) { return (r || D).querySelector(s) }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  function st() { var s; try { s = JSON.parse(LS(KEY) || "{}") } catch (e) { s = {} } s.on = s.on === 0 ? 0 : 1; s.dis = s.dis || {}; s.never = s.never || {}; s.max = s.max || 3; return s }
  function put(s) { LS(KEY, JSON.stringify(s)) }
  function dayKey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() }
  function dayStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
  function norm(c) { return String(c || "").toLowerCase().replace(/^(?:hey |ok |please |can you |could you )+/, "").replace(/[.!?؟]+$/, "").replace(/\s+/g, " ").trim() }
  function acts() { try { return JSON.parse(LS(ACT) || "[]") } catch (e) { return [] } }
  function dp(h) { return h < 5 ? "late at night" : h < 11 ? "in the morning" : h < 14 ? "around noon" : h < 18 ? "in the afternoon" : h < 22 ? "in the evening" : "at night" }

  /* ───────── what it notices ───────── */
  function candidates() {
    var out = [], now = Date.now(), nh = new Date(now).getHours() + new Date(now).getMinutes() / 60, a = acts(), S = st(), by = {};
    a.filter(function (e) { return e.i !== "chat" && e.c && e.c.length < 90 && now - e.t < 21 * 864e5 }).forEach(function (e) { var k = norm(e.c); if (k.length >= 4) (by[k] = by[k] || []).push(e) });
    var today0 = dayStart(now);
    Object.keys(by).forEach(function (k) {
      var l = by[k]; if (l.length < 3) return;
      var days = {}; l.forEach(function (e) { days[dayStart(e.t)] = 1 }); if (Object.keys(days).length < 2) return;
      var hrs = l.map(function (e) { var d = new Date(e.t); return d.getHours() + d.getMinutes() / 60 }), mean = hrs.reduce(function (s, x) { return s + x }, 0) / hrs.length;
      var near = hrs.filter(function (h) { return Math.abs(h - mean) <= 1.25 }).length; if (near / hrs.length < .6) return;
      if (Math.abs(nh - mean) > 0.9) return;
      if (l.some(function (e) { return e.t >= today0 })) return;
      out.push({ id: "t:" + k, kind: "time", score: 80 + l.length, text: "You usually “" + k + "” " + dp(Math.round(mean)) + ".", sub: "Done " + l.length + "× on " + Object.keys(days).length + " days", go: "Do it", cmd: k });
    });
    try {
      var hs = W.PHR_AX && W.PHR_AX.habits ? W.PHR_AX.habits() : [];
      hs.forEach(function (h, i) { out.push({ id: "h:" + h.id, kind: "habit", score: 60 - i, text: h.title.replace(/^“|”$/g, "") === h.title ? h.title : "I noticed a pattern: " + h.title, sub: h.why, go: "Make it a routine", habit: i }) });
    } catch (e) { }
    try {
      var L = W.LIFE && W.LIFE.all ? W.LIFE.all() : [];
      L.filter(function (e) { return e.due && !e.done && e.due < now && now - e.due < 5 * 864e5 }).sort(function (x, y) { return x.due - y.due }).slice(0, 1).forEach(function (e) {
        out.push({ id: "o:" + e.id, kind: "overdue", score: 90, text: "“" + e.t + "” is overdue.", sub: "Was due " + new Date(e.due).toLocaleDateString(undefined, { month: "short", day: "numeric" }), go: "Open memory", life: 1 });
      });
    } catch (e) { }
    return out.filter(function (c) { return !S.never[c.id] && !(S.dis[c.id] && now - S.dis[c.id] < (c.kind === "overdue" ? 6 : 20) * 36e5) }).sort(function (x, y) { return y.score - x.score });
  }

  /* ───────── the chip ───────── */
  var chip, hideT, cur;
  function css() {
    if (D.getElementById("sh-css")) return;
    var s = D.createElement("style"); s.id = "sh-css";
    s.textContent = [
      "#sh-chip{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));z-index:7500;width:calc(100% - 28px);max-width:440px;box-sizing:border-box;padding:12px 12px 12px 14px;border-radius:20px;background:rgba(14,18,16,.88);backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5);border:1px solid rgba(111,227,160,.32);box-shadow:0 18px 50px rgba(0,0,0,.5),0 0 0 .5px rgba(255,255,255,.06) inset;color:#eafff3;font-family:-apple-system,system-ui,sans-serif;transform:translate(-50%,30px) scale(.96);opacity:0;pointer-events:none;transition:transform .5s cubic-bezier(.2,1,.3,1),opacity .35s;direction:ltr;text-align:left}",
      "#sh-chip.on{transform:translate(-50%,0) scale(1);opacity:1;pointer-events:auto}",
      "#sh-chip .t{display:flex;align-items:center;gap:9px;font:700 9.5px/1 'Space Mono',ui-monospace,monospace;letter-spacing:.22em;color:#6fe3a0}",
      "#sh-chip .t i{width:8px;height:8px;border-radius:50%;background:#6fe3a0;box-shadow:0 0 0 0 rgba(111,227,160,.6);animation:shp 2s infinite}",
      "@keyframes shp{70%{box-shadow:0 0 0 9px rgba(111,227,160,0)}100%{box-shadow:0 0 0 0 rgba(111,227,160,0)}}",
      "#sh-chip .x{margin-left:auto;border:0;background:none;color:#7fa593;font-size:18px;line-height:1;padding:2px 4px;cursor:pointer}",
      "#sh-chip .m{margin-top:8px;font-size:14.5px;font-weight:600;line-height:1.4;word-break:break-word}",
      "#sh-chip .s{margin-top:3px;font-size:12px;color:#7fa593}",
      "#sh-chip .r{display:flex;gap:8px;margin-top:11px}",
      "#sh-chip .r button{border:0;border-radius:12px;padding:10px 13px;font:700 13px/1 -apple-system,system-ui,sans-serif;cursor:pointer}",
      "#sh-chip .y{flex:1;background:linear-gradient(135deg,#6fe3a0,#3fbf86);color:#04120b}",
      "#sh-chip .n{background:rgba(255,255,255,.09);color:#cfeedd}",
      "#sh-chip .z{background:none;color:#6f8d7d;padding:10px 6px!important;font-weight:600!important;font-size:12px!important}",
      "#sh-chip button:active{transform:scale(.97)}",
      "body.light-theme #sh-chip{background:rgba(245,252,248,.93);color:#0d2b1c;border-color:rgba(30,120,80,.35)}body.light-theme #sh-chip .n{background:rgba(0,0,0,.07);color:#1d4a33}"
    ].join("\n");
    D.head.appendChild(s);
  }
  function busy() {
    try { if (W.PHR_CON && W.PHR_CON.isOpen && W.PHR_CON.isOpen()) return true } catch (e) { }
    var ac = D.getElementById("account-page"); if (ac && /\bshow\b/.test(ac.className)) return true;
    var ax = D.getElementById("ax-pane"); if (ax && ax.classList.contains("on")) return true;
    var ae = D.activeElement; if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && String(ae.value || "").length > 0) return true;
    return false;
  }
  function show(c) {
    css(); cur = c;
    if (!chip) { chip = D.createElement("div"); chip.id = "sh-chip"; D.body.appendChild(chip) }
    chip.innerHTML = '<div class="t"><i></i>SHADOW<button class="x" type="button" aria-label="Dismiss" onclick="PHR_SHADOW.skip()">×</button></div><div class="m" dir="auto">' + esc(c.text) + "</div>" + (c.sub ? '<div class="s">' + esc(c.sub) + "</div>" : "") +
      '<div class="r"><button class="y" type="button" onclick="PHR_SHADOW.yes()">' + esc(c.go) + '</button><button class="n" type="button" onclick="PHR_SHADOW.skip()">Not now</button><button class="z" type="button" onclick="PHR_SHADOW.never()">Never</button></div>';
    requestAnimationFrame(function () { chip.classList.add("on") });
    try { W.haptic && W.haptic("light") } catch (e) { }
    clearTimeout(hideT); hideT = setTimeout(function () { if (cur === c) skip(true) }, 22000);
    var S = st(), k = dayKey(); if (S.day !== k) { S.day = k; S.n = 0 } S.n++; S.last = Date.now(); put(S);
  }
  function hide() { clearTimeout(hideT); if (chip) chip.classList.remove("on"); cur = null }
  function skip(auto) { if (cur) { var S = st(); S.dis[cur.id] = Date.now(); put(S) } hide() }
  function never() { if (cur) { var S = st(); S.never[cur.id] = 1; put(S) } hide(); try { W.showToast && W.showToast("Won’t suggest that again", "info") } catch (e) { } }
  function yes() {
    var c = cur; if (!c) return; var S = st(); S.dis[c.id] = Date.now(); put(S); hide();
    try {
      if (c.kind === "time") { W.PHR_AGENT.typed(c.cmd) || (W.PHR_sendText && W.PHR_sendText(c.cmd)) }
      else if (c.kind === "habit") { W.PHR_AX.habit(c.habit) }
      else if (c.life) { W.LIFE.open() }
    } catch (e) { }
  }

  /* ───────── scheduler ───────── */
  function tick(force) {
    var S = st(); if (!force && !S.on) return false;
    if (D.hidden || cur) return false;
    var now = Date.now(); if (!force) {
      if (S.last && now - S.last < 30 * 60000) return false;
      if (S.day === dayKey() && S.n >= S.max) return false;
      var h = new Date().getHours(); if (h < 7 || h >= 23) return false;
      if (busy()) return false;
      if (now - (W.__phrBoot || 0) < 20000) return false;
    }
    var c = candidates()[0]; if (!c) return false; show(c); return true;
  }
  W.__phrBoot = W.__phrBoot || Date.now();
  setInterval(function () { try { tick() } catch (e) { } }, 45000);
  D.addEventListener("visibilitychange", function () { if (!D.hidden) setTimeout(function () { try { tick() } catch (e) { } }, 4000) });

  /* ───────── pane ───────── */
  function view() {
    var S = st(), cs = candidates(), today = S.day === dayKey() ? S.n : 0;
    var nv = Object.keys(S.never).length;
    var list = cs.length ? cs.map(function (c) { return '<div class="ax-row"><div class="tx" dir="auto">' + esc(c.text) + "<small>" + esc(c.sub || "") + '</small></div><span class="ax-tag" style="--c:#6fe3a0">' + esc(c.kind) + "</span></div>" }).join("") : '<div class="ax-em" style="padding:18px 8px">Nothing to suggest right now.<br>Keep using the agent — I learn from what you do.</div>';
    return '<div class="ax-c" style="margin-top:6px"><div class="ax-row" style="border:0;padding:0"><div class="tx">Shadow suggestions<small>A quiet chip, at most ' + S.max + ' a day. Never while you type.</small></div><label class="ax-sw"><input type="checkbox" id="sh-on"' + (S.on ? " checked" : "") + ' onchange="PHR_SHADOW.setOn(this.checked)"><span></span></label></div></div>' +
      '<div class="ax-c"><h4>Per day</h4><div style="display:flex;gap:8px">' + [1, 2, 3, 5].map(function (n) { return '<button class="ax-b' + (S.max === n ? " g" : "") + '" style="flex:1;padding:11px" onclick="PHR_SHADOW.setMax(' + n + ')">' + n + "</button>" }).join("") + '</div><div class="ax-em" style="padding:10px 0 0;font-size:13px">Shown today: ' + today + "</div></div>" +
      '<div class="ax-c"><h4>What I’ve noticed</h4>' + list + '<div style="display:flex;gap:8px;margin-top:12px"><button class="ax-b g" style="flex:1;padding:12px" onclick="PHR_SHADOW.test()">Show one now</button>' + (nv ? '<button class="ax-b" style="flex:1;padding:12px" onclick="PHR_SHADOW.reset()">Reset ' + nv + " muted</button>" : "") + "</div></div>";
  }

  W.PHR_SHADOW = {
    enabled: function () { return !!st().on }, candidates: candidates, tick: tick, show: show,
    yes: yes, skip: skip, never: never,
    setOn: function (v) { var S = st(); S.on = v ? 1 : 0; put(S); W.PHR_KEYS && W.PHR_KEYS.stat(); W.PHR_AX && W.PHR_AX.rerender() },
    setMax: function (n) { var S = st(); S.max = n; put(S); W.PHR_AX && W.PHR_AX.rerender() },
    reset: function () { var S = st(); S.never = {}; S.dis = {}; put(S); W.PHR_AX && W.PHR_AX.rerender() },
    test: function () {
      var c = candidates()[0];
      try { W.PHR_AX && W.PHR_AX.back() } catch (e) { }
      try { W.closeAccountPage && W.closeAccountPage() } catch (e) { }
      setTimeout(function () { if (c) show(c); else show({ id: "demo", kind: "demo", text: "This is how a suggestion looks.", sub: "Use the agent for a few days and I’ll offer real ones", go: "Nice" }) }, 500);
    }
  };

  (function reg(n) {
    if (W.PHR_AX && W.PHR_AX.views) W.PHR_AX.views.shadow = { title: "Shadow", render: view };
    else if (n < 120) setTimeout(function () { reg(n + 1) }, 200);
  })(0);
})();
