/* Phraortes — Agent Console (console.js)
   A full-screen terminal-style cockpit that opens when the agent is called. It only listens to events from wake.js
   (PHR_CON.ev) and sends typed commands back through PHR_WAKE.run. */
(function () {
  "use strict";
  var W = window, D = document;
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) {} return null };
  var root, logEl, vizC, vctx, stEl, bigEl, micEl, upEl, liveEl, dockLine, inp;
  var S = { open: false, dock: false, state: "idle", t0: Date.now(), raf: 0, idle: 0, amp: 0, lines: 0 };
  var COL = { idle: "#6b7a72", wake: "#d4a84b", cmd: "#6fe3a0", think: "#7fb2ff", say: "#e48cff", off: "#6b7a72", armed: "#6b7a72" };
  var NAME = { idle: "STANDBY", off: "STANDBY", armed: "TAP TO ARM", wake: "AWAITING WAKE WORD", cmd: "LISTENING", think: "PROCESSING", say: "RESPONDING" };

  function css() {
    if (D.getElementById("cn-css")) return;
    var s = D.createElement("style"); s.id = "cn-css";
    s.textContent = [
      "#cn{--g:#6fe3a0;--a:#d4a84b;--b:#7fb2ff;--m:#e48cff;position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;background:radial-gradient(120% 60% at 50% 0,#0b1612 0,#050808 55%,#030505 100%);color:#bff5d3;font:12.5px/1.6 ui-monospace,'SF Mono','Space Mono',Menlo,monospace;transform:translateY(102%);visibility:hidden;transition:transform .55s cubic-bezier(.2,.85,.2,1),visibility 0s .55s;padding-top:env(safe-area-inset-top);overscroll-behavior:contain;-webkit-user-select:none;user-select:none}",
      "#cn.open{transform:none;visibility:visible;transition:transform .55s cubic-bezier(.2,.85,.2,1)}",
      "#cn:before{content:'';position:absolute;inset:0;background:linear-gradient(rgba(111,227,160,.045) 1px,transparent 1px) 0 0/100% 30px,linear-gradient(90deg,rgba(111,227,160,.045) 1px,transparent 1px) 0 0/30px 100%;mask-image:radial-gradient(90% 70% at 50% 25%,#000 20%,transparent 80%);-webkit-mask-image:radial-gradient(90% 70% at 50% 25%,#000 20%,transparent 80%);pointer-events:none}",
      "#cn:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px);pointer-events:none;mix-blend-mode:multiply;opacity:.7}",
      "#cn>*{position:relative;z-index:1}",
      "#cn .cn-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px}",
      "#cn .cn-brand{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:.22em;font-size:12px;color:#e9fff1}",
      "#cn .cn-brand i{width:8px;height:8px;border-radius:50%;background:var(--c,#6b7a72);box-shadow:0 0 12px var(--c,#6b7a72);animation:cnp 1.6s ease-in-out infinite}",
      "#cn .cn-brand b{color:var(--a);font-weight:700}",
      "@keyframes cnp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(1.5)}}",
      "#cn .cn-btns{display:flex;gap:8px}",
      "#cn button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}",
      "#cn .cn-btns button{width:34px;height:34px;border-radius:10px;border:1px solid rgba(111,227,160,.28);background:rgba(111,227,160,.06);color:#bff5d3;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center}",
      "#cn .cn-btns button:active{background:rgba(111,227,160,.2)}",
      "#cn .cn-stat{display:flex;gap:14px;flex-wrap:wrap;padding:0 16px 8px;font-size:10.5px;letter-spacing:.14em;color:#6f8a7c;border-bottom:1px solid rgba(111,227,160,.12)}",
      "#cn .cn-stat em{font-style:normal;color:#bff5d3}",
      "#cn .cn-hero{position:relative;height:216px;flex:none;display:flex;align-items:center;justify-content:center}",
      "#cn canvas{position:absolute;inset:0;width:100%;height:100%}",
      "#cn .cn-big{position:relative;text-align:center;pointer-events:none}",
      "#cn .cn-big b{display:block;font-size:13px;letter-spacing:.34em;color:var(--c,#6b7a72);text-shadow:0 0 18px var(--c,#6b7a72);font-weight:700}",
      "#cn .cn-big span{display:block;margin-top:6px;font-size:11px;color:#7d968a;letter-spacing:.06em;max-width:230px;min-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "#cn .cn-log{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px 16px 6px;border-top:1px solid rgba(111,227,160,.12);-webkit-user-select:text;user-select:text;mask-image:linear-gradient(transparent,#000 22px);-webkit-mask-image:linear-gradient(transparent,#000 22px)}",
      "#cn .ln{display:flex;gap:9px;margin:0 0 5px;word-break:break-word;animation:cnin .28s ease both}",
      "@keyframes cnin{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}",
      "#cn .ln .t{flex:none;width:58px;color:#4d6358;font-size:10.5px;padding-top:1px}",
      "#cn .ln .k{flex:none;width:46px;font-weight:700;font-size:10.5px;letter-spacing:.08em;padding-top:1px}",
      "#cn .ln .x{flex:1;min-width:0;white-space:pre-wrap}",
      "#cn .ln.sys .k{color:#4d6358}#cn .ln.sys .x{color:#6f8a7c}",
      "#cn .ln.hear .k{color:var(--g)}#cn .ln.hear .x{color:#eafff3}",
      "#cn .ln.int .k{color:var(--b)}#cn .ln.int .x{color:#9fc4ff}",
      "#cn .ln.exe .k{color:var(--a)}#cn .ln.exe .x{color:#f1d48e}",
      "#cn .ln.ok .k{color:var(--g)}#cn .ln.ok .x{color:#bff5d3}",
      "#cn .ln.ans .k{color:var(--m)}#cn .ln.ans .x{color:#f3d6ff}",
      "#cn .ln.err .k{color:#ff6b6b}#cn .ln.err .x{color:#ffb0b0}",
      "#cn .ln.live .x:after{content:'▍';margin-inline-start:2px;animation:cnb .9s steps(1) infinite}",
      "@keyframes cnb{50%{opacity:0}}",
      "#cn .cn-chips{display:flex;gap:7px;overflow-x:auto;padding:8px 16px 6px;scrollbar-width:none;flex:none}",
      "#cn .cn-chips::-webkit-scrollbar{display:none}",
      "#cn .cn-chips button{flex:none;padding:7px 12px;border-radius:999px;border:1px solid rgba(111,227,160,.26);background:rgba(111,227,160,.05);color:#a5e8c3;font-size:11.5px;white-space:nowrap}",
      "#cn .cn-chips button:active{background:rgba(111,227,160,.22)}",
      "#cn form{flex:none;display:flex;align-items:center;gap:8px;margin:4px 12px calc(12px + env(safe-area-inset-bottom));padding:6px 6px 6px 14px;border-radius:16px;border:1px solid rgba(111,227,160,.32);background:rgba(4,12,9,.8);box-shadow:0 0 0 1px rgba(0,0,0,.4) inset,0 0 26px rgba(111,227,160,.07)}",
      "#cn form:focus-within{border-color:var(--g);box-shadow:0 0 22px rgba(111,227,160,.18)}",
      "#cn form .ps{color:var(--a);font-weight:700}",
      "#cn input{flex:1;min-width:0;background:none;border:0;outline:0;color:#eafff3;font:inherit;font-size:16px;-webkit-user-select:text;user-select:text}",
      "#cn input::placeholder{color:#4d6358}",
      "#cn form button{width:38px;height:38px;border-radius:12px;border:1px solid rgba(111,227,160,.3);background:rgba(111,227,160,.08);color:var(--g);display:flex;align-items:center;justify-content:center;flex:none}",
      "#cn form button.go{background:var(--g);color:#04120b;border-color:var(--g)}",
      "#cn #cn-mic.on{background:rgba(212,168,75,.2);border-color:var(--a);color:var(--a)}",
      "#cn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
      /* docked HUD bar */
      "#cn .cn-dockline{display:none}",
      "#cn.dock{inset:auto 10px calc(10px + env(safe-area-inset-bottom)) 10px;height:auto;border-radius:18px;border:1px solid rgba(111,227,160,.3);padding-top:0;box-shadow:0 14px 40px rgba(0,0,0,.6),0 0 30px rgba(111,227,160,.08);background:rgba(4,9,7,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden}",
      "#cn.dock .cn-stat,#cn.dock .cn-hero,#cn.dock .cn-log,#cn.dock .cn-chips,#cn.dock form{display:none}",
      "#cn.dock .cn-top{padding:10px 12px 4px}",
      "#cn.dock .cn-dockline{display:block;padding:0 14px 11px;color:#9bd9b8;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#cn.dock:before,#cn.dock:after{display:none}",
      "#cn.dock .cn-top{cursor:pointer}"
    ].join("\n");
    D.head.appendChild(s);
  }

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] }) }
  function ts() { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2) }

  function build() {
    if (root) return;
    css();
    root = D.createElement("div"); root.id = "cn"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Agent console");
    root.innerHTML =
      '<div class="cn-top" id="cn-top"><div class="cn-brand"><i></i>PHRAORTES<b>//AGENT</b></div><div class="cn-btns"><button id="cn-dock" aria-label="Minimize"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button><button id="cn-x" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>' +
      '<div class="cn-dockline" id="cn-dl">standby</div>' +
      '<div class="cn-stat"><span>STATE <em id="cn-st">STANDBY</em></span><span>MIC <em id="cn-mc">OFF</em></span><span>LANG <em id="cn-lg">EN</em></span><span>UP <em id="cn-up">00:00</em></span></div>' +
      '<div class="cn-hero"><canvas id="cn-cv"></canvas><div class="cn-big"><b id="cn-big">STANDBY</b><span id="cn-live"></span></div></div>' +
      '<div class="cn-log" id="cn-log"></div>' +
      '<div class="cn-chips" id="cn-chips"></div>' +
      '<form id="cn-f" autocomplete="off"><span class="ps">❯</span><input id="cn-in" placeholder="type or say a command…" enterkeyhint="send" autocapitalize="off" autocorrect="off" spellcheck="false"><button type="button" id="cn-mic" aria-label="Voice"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></button><button class="go" type="submit" aria-label="Run"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>';
    D.body.appendChild(root);
    logEl = root.querySelector("#cn-log"); stEl = root.querySelector("#cn-st"); bigEl = root.querySelector("#cn-big"); micEl = root.querySelector("#cn-mc");
    upEl = root.querySelector("#cn-up"); liveEl = root.querySelector("#cn-live"); dockLine = root.querySelector("#cn-dl"); inp = root.querySelector("#cn-in");
    vizC = root.querySelector("#cn-cv"); vctx = vizC.getContext("2d");
    var CH = ["open the board", "draw a circle", "set a timer for 5 minutes", "remember my gym is at 7", "what do you remember", "my routines", "open photos", "plot y = x^2", "close console"];
    var ch = root.querySelector("#cn-chips");
    CH.forEach(function (c) { var b = D.createElement("button"); b.type = "button"; b.textContent = c; b.onclick = function () { run(c) }; ch.appendChild(b) });
    root.querySelector("#cn-x").onclick = function (e) { e.stopPropagation(); close() };
    root.querySelector("#cn-dock").onclick = function (e) { e.stopPropagation(); dock(true) };
    root.querySelector("#cn-top").onclick = function () { if (S.dock) dock(false) };
    root.querySelector("#cn-f").onsubmit = function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v) return; inp.value = ""; inp.blur(); run(v) };
    root.querySelector("#cn-mic").onclick = function () {
      var w = W.PHR_WAKE; if (!w) return;
      w.setEnabled(!w.enabled()); setTimeout(paintMic, 60);
    };
    root.addEventListener("pointerdown", function () { clearTimeout(S.idle) }, true);
    W.addEventListener("resize", sizeCanvas);
  }

  function paintMic() {
    if (!root) return;
    var on = W.PHR_WAKE && W.PHR_WAKE.enabled && W.PHR_WAKE.enabled();
    micEl.textContent = on ? "LIVE" : "OFF"; micEl.style.color = on ? "#6fe3a0" : "#ff8f8f";
    var m = root.querySelector("#cn-mic"); m.classList.toggle("on", !!on);
    var l = (W.PHR_WAKE && W.PHR_WAKE.lang && W.PHR_WAKE.lang()) || "en-US"; root.querySelector("#cn-lg").textContent = l.slice(0, 2).toUpperCase();
  }

  /* ---------- log ---------- */
  function line(kind, tag, text, live) {
    build();
    var el = D.createElement("div"); el.className = "ln " + kind + (live ? " live" : "");
    el.innerHTML = '<span class="t">' + ts() + '</span><span class="k">' + tag + '</span><span class="x" dir="auto"></span>';
    var x = el.querySelector(".x"); x.textContent = text || "";
    logEl.appendChild(el); S.lines++;
    while (logEl.children.length > 120) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
    return x;
  }
  function typeOut(kind, tag, text) {
    text = String(text || ""); var x = line(kind, tag, "", true), n = Math.max(1, Math.ceil(text.length / 38)), i = 0;
    (function step() { i = Math.min(text.length, i + n); x.textContent = text.slice(0, i); logEl.scrollTop = logEl.scrollHeight; if (i < text.length) setTimeout(step, 24); else x.parentNode.classList.remove("live") })();
  }
  var liveX = null;
  function intent(c) {
    var s = String(c).toLowerCase();
    if (/board|draw|sketch|plot|circle|cube|line|تخته|بکش|رسم/.test(s)) return ["BOARD", "board.draw"];
    if (/timer|alarm|remind|تایمر|زنگ|یادآور/.test(s)) return ["HANDS", "hands.timer"];
    if (/remember|recall|forget|what do you remember|یادت باشه|یادته|فراموش/.test(s)) return ["BRAIN", "brain.memory"];
    if (/routine|habit|every (day|morning|night)|روتین|هر روز/.test(s)) return ["BRAIN", "brain.routine"];
    if (/photo|picture|file|camera|عکس|فایل|دوربین/.test(s)) return ["DEVICE", "device.pick"];
    if (/mission|research for me|background|ماموریت|مأموریت/.test(s)) return ["MISSION", "mission.run"];
    return ["LLM", "model.chat"];
  }

  /* ---------- state ---------- */
  function setState(m) {
    S.state = m; if (!root) return;
    var c = COL[m] || COL.idle; root.style.setProperty("--c", c);
    var n = NAME[m] || "STANDBY"; stEl.textContent = n; bigEl.textContent = n; stEl.style.color = c;
    paintMic();
  }

  /* ---------- visualiser ---------- */
  function sizeCanvas() {
    if (!vizC) return; var r = vizC.getBoundingClientRect(), d = Math.min(2, W.devicePixelRatio || 1);
    vizC.width = Math.max(2, r.width * d); vizC.height = Math.max(2, r.height * d); vctx.setTransform(d, 0, 0, d, 0, 0); vizC._w = r.width; vizC._h = r.height;
  }
  function frame(t) {
    S.raf = 0; if (!S.open || S.dock) return;
    var w = vizC._w || 300, h = vizC._h || 200, cx = w / 2, cy = h / 2, c = COL[S.state] || COL.idle, m = S.state;
    var target = m === "cmd" ? 1 : m === "say" ? .8 : m === "think" ? .45 : m === "wake" ? .22 : .08;
    S.amp += (target - S.amp) * .06;
    vctx.clearRect(0, 0, w, h);
    var R = Math.min(w, h) * .27, N = 72, i, a, k, r2, sec = t / 1000;
    vctx.lineCap = "round";
    /* rings */
    for (k = 0; k < 3; k++) {
      vctx.beginPath(); vctx.globalAlpha = .16 - k * .04; vctx.strokeStyle = c; vctx.lineWidth = 1;
      vctx.arc(cx, cy, R + 14 + k * 15 + Math.sin(sec * (1 + k * .4)) * 2 * S.amp, 0, 7); vctx.stroke();
    }
    /* radial bars */
    vctx.globalAlpha = 1; vctx.strokeStyle = c; vctx.lineWidth = 2.2;
    for (i = 0; i < N; i++) {
      a = i / N * 6.2832 - 1.5708;
      var n = Math.sin(i * .9 + sec * (m === "think" ? 7 : 4)) * .5 + Math.sin(i * 2.3 - sec * 5.5) * .5 + (m === "cmd" ? Math.sin(i * 5.1 + sec * 11) * .6 : 0);
      var len = 3 + (Math.abs(n) * 22 * S.amp) + (m === "wake" ? Math.sin(sec * 1.4 + i * .3) * 2 + 2 : 0);
      vctx.globalAlpha = .45 + Math.min(.55, len / 30);
      vctx.beginPath(); vctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); vctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len)); vctx.stroke();
    }
    /* thinking sweep */
    if (m === "think") {
      vctx.globalAlpha = .9; vctx.lineWidth = 2.4; vctx.beginPath(); vctx.arc(cx, cy, R - 10, sec * 3, sec * 3 + 1.6); vctx.stroke();
      vctx.globalAlpha = .4; vctx.beginPath(); vctx.arc(cx, cy, R - 18, -sec * 2.2, -sec * 2.2 + 1.1); vctx.stroke();
    }
    /* core */
    var g = vctx.createRadialGradient(cx, cy, 0, cx, cy, R - 8); g.addColorStop(0, c + "30"); g.addColorStop(1, "transparent");
    vctx.globalAlpha = 1; vctx.fillStyle = g; vctx.beginPath(); vctx.arc(cx, cy, R - 8, 0, 7); vctx.fill();
    /* uptime */
    var up = Math.floor((Date.now() - S.t0) / 1000); upEl.textContent = ("0" + Math.floor(up / 60)).slice(-2) + ":" + ("0" + up % 60).slice(-2);
    S.raf = requestAnimationFrame(frame);
  }
  function kick() { if (!S.raf && S.open && !S.dock) S.raf = requestAnimationFrame(frame) }

  /* ---------- open / close / dock ---------- */
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    var L = [["sys", "SYS", "phraortes agent core v2 … ok"], ["sys", "SYS", "voice channel (webkit speech) … " + (W.SpeechRecognition || W.webkitSpeechRecognition ? "ok" : "unavailable")],
      ["sys", "SYS", "modules: " + ["hands", "board", "brain", "mission"].filter(function (k) { return W["PHR_" + k.toUpperCase()] }).join(" · ")], ["sys", "SYS", "ready. say a command or type below."]];
    L.forEach(function (l) { line(l[0], l[1], l[2]) });
  }
  function open() {
    build(); clearTimeout(S.idle);
    S.open = true; root.classList.add("open"); dock(false, true);
    setTimeout(function () { sizeCanvas(); kick() }, 30); setTimeout(sizeCanvas, 600);
    setState(S.state === "idle" ? ((W.PHR_WAKE && W.PHR_WAKE.state && W.PHR_WAKE.state().mode) || "idle") : S.state);
    boot(); paintMic();
  }
  function close() { if (!root) return; S.open = false; S.dock = false; root.classList.remove("open", "dock"); clearTimeout(S.idle) }
  function dock(v, silent) {
    build(); S.dock = !!v; root.classList.toggle("dock", !!v);
    if (v) { if (!S.open) { S.open = true; root.classList.add("open") } }
    else { setTimeout(function () { sizeCanvas(); kick() }, 30); try { logEl.scrollTop = logEl.scrollHeight } catch (e) {} }
  }
  function armIdle() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.open && !S.dock && S.state === "wake") dock(true) }, 9000) }

  /* ---------- running commands from the console ---------- */
  function run(cmd) {
    var w = W.PHR_WAKE; if (!w || !w.run) { line("err", "ERR", "agent core not ready"); return }
    if (/^(close|hide|dismiss)\s+(the\s+)?console|کنسول.*(ببند|بسته)/i.test(cmd)) { line("hear", "USR", cmd); close(); return }
    w.run(cmd);
  }

  /* ---------- events from wake.js ---------- */
  function ev(t, a, b) {
    if (t === "wake") { open(); line("sys", "SYS", "wake word detected"); return }
    if (t === "mode") {
      setState(a); if (S.open) { dockLine && (dockLine.textContent = NAME[a] || ""); kick() }
      if (a === "wake") armIdle(); else clearTimeout(S.idle);
      if (a === "wake" || a === "cmd") liveEl && (liveEl.textContent = ""); return;
    }
    if (!root) { if (t === "cmd") { build() } else return }
    if (t === "hear") { if (!liveX || !liveX.parentNode) liveX = line("hear", "USR", "", true); liveX.textContent = a; liveEl.textContent = a; if (b) { liveX.parentNode.classList.remove("live") } if (S.dock) dockLine.textContent = "❯ " + a; return }
    if (t === "cmd") {
      if (liveX && liveX.parentNode && liveX.parentNode.classList.contains("live")) { liveX.textContent = a; liveX.parentNode.classList.remove("live") } else line("hear", "USR", a);
      liveX = null; var it = intent(a); line("int", "INT", it[1]); line("exe", "EXE", "dispatching → " + it[0].toLowerCase());
      if (/BOARD|DEVICE|MISSION/.test(it[0]) && S.open && !/^close/i.test(a)) setTimeout(function () { dock(true) }, 1400);
      return;
    }
    if (t === "done") { typeOut("ok", "OK", a || "done"); if (S.dock) dockLine.textContent = "✓ " + (a || "done"); return }
    if (t === "answer") { typeOut("ans", "ANS", a); if (S.dock) dockLine.textContent = "« " + String(a).slice(0, 90); return }
    if (t === "err") { line("err", "ERR", a); return }
    if (t === "say") { liveEl && (liveEl.textContent = String(a).slice(0, 60)); return }
  }

  W.PHR_CON = { open: open, close: close, dock: dock, ev: ev, run: run, isOpen: function () { return S.open }, log: function (k, tg, t) { line(k, tg, t) } };
})();
