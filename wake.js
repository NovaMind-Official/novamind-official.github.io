/* Phraortes — "Hey Phraortes" hands-free mode (wake.js)
   Works only while the app is open in the foreground (iOS limit). One tap per page load to start. */
(function () {
  "use strict";
  var W = window, D = document;
  var SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
  var st = { on: false, mode: "off", rec: null, speaking: false, lang: LS("phr_wake_lang") || (/^fa/i.test(D.documentElement.lang || navigator.language || "") ? "fa-IR" : "en-US"), fails: 0, lock: null, cmdBuf: "", cmdTimer: 0, gen: 0 };

  /* ---------- wake-word matching ---------- */
  var KNOWN = ["phraortes", "fraortes", "phraotes", "fraortis", "frortes", "fraoortes", "fraorties", "phraortis"];
  var FA = /(?:ف|پ)ر[اآائ]?[وؤ]?ر[تط][ئی]?[سز]|فرائورتس|فراورتس|فرورتس|فراتورس|فرااورتس|فرائورتز|فرایورتس|فرورتیس|فراورتیس/;
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  /* returns {hit:true, rest:"text after wake word"} or null */
  function matchWake(text) {
    var raw = String(text || "").toLowerCase().replace(/[.!?؟،,]/g, " ").replace(/\s+/g, " ").trim();
    if (!raw) return null;
    var fm = FA.exec(raw);
    if (fm) return { hit: true, rest: raw.slice(fm.index + fm[0].length).trim() };
    var toks = raw.split(" "), pos = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i].replace(/[^a-z]/g, "");
      if (t.length >= 6 && t.length <= 11) {
        for (var k = 0; k < KNOWN.length; k++) {
          if (lev(t, KNOWN[k]) <= 2) return { hit: true, rest: toks.slice(i + 1).join(" ").trim() };
        }
      }
      /* split mis-hearings: "for aortis", "fray ortis" */
      if (i + 1 < toks.length) {
        var j2 = (toks[i] + toks[i + 1]).replace(/[^a-z]/g, "");
        if (j2.length >= 6 && j2.length <= 11) for (var q = 0; q < KNOWN.length; q++) if (lev(j2, KNOWN[q]) <= 2) return { hit: true, rest: toks.slice(i + 2).join(" ").trim() };
      }
    }
    return null;
  }

  /* ---------- chime ---------- */
  var AC = null;
  function chime(up) {
    try {
      AC = AC || new (W.AudioContext || W.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      var t = AC.currentTime, f = up ? [660, 990] : [990, 560];
      f.forEach(function (hz, i) {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = "sine"; o.frequency.value = hz; o.connect(g); g.connect(AC.destination);
        g.gain.setValueAtTime(0, t + i * .09); g.gain.linearRampToValueAtTime(.12, t + i * .09 + .02); g.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .22);
        o.start(t + i * .09); o.stop(t + i * .09 + .25);
      });
    } catch (e) {}
    try { navigator.vibrate && navigator.vibrate(up ? 18 : 8); } catch (e) {}
  }

  /* ---------- UI ---------- */
  var chip, cap;
  function css() {
    if (D.getElementById("wk-css")) return;
    var s = D.createElement("style"); s.id = "wk-css";
    s.textContent =
      "#wk-chip{position:fixed;left:12px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:9400;display:flex;align-items:center;gap:8px;padding:9px 14px 9px 11px;border-radius:999px;font:600 12.5px/1 -apple-system,system-ui,sans-serif;color:#f3e3b4;background:rgba(18,15,10,.82);border:1px solid rgba(212,168,75,.38);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 6px 22px rgba(0,0,0,.35);cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:manipulation}" +
      "#wk-chip .d{width:9px;height:9px;border-radius:50%;background:#6b6455;flex:none;transition:background .2s}" +
      "#wk-chip[data-m=wake] .d{background:#d4a84b;animation:wkp 2s ease-in-out infinite}" +
      "#wk-chip[data-m=cmd] .d{background:#6fe3a0;animation:wkp .7s ease-in-out infinite}" +
      "#wk-chip[data-m=think] .d{background:#8ab4ff;animation:wkp .9s ease-in-out infinite}" +
      "#wk-chip[data-m=say] .d{background:#e48cff;animation:wkp 1.1s ease-in-out infinite}" +
      "@keyframes wkp{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.7);opacity:.55}}" +
      "#wk-lang{margin-inline-start:2px;padding:3px 7px;border-radius:8px;background:rgba(212,168,75,.16);font-size:10.5px;letter-spacing:.4px}" +
      "#wk-cap{position:fixed;left:12px;right:12px;bottom:calc(132px + env(safe-area-inset-bottom));z-index:9399;text-align:center;pointer-events:none;opacity:0;transform:translateY(6px);transition:.25s}" +
      "#wk-cap.show{opacity:1;transform:none}" +
      "#wk-cap span{display:inline-block;max-width:92%;padding:9px 15px;border-radius:16px;background:rgba(18,15,10,.86);border:1px solid rgba(212,168,75,.3);color:#fff2cf;font:500 14px/1.5 -apple-system,system-ui,sans-serif;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}" +
      "#wk-boot{position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;background:rgba(8,7,5,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}" +
      "#wk-boot button{padding:22px 34px;border-radius:26px;border:1px solid rgba(212,168,75,.5);background:linear-gradient(160deg,#2a2112,#14100a);color:#f6e4ae;font:700 17px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 0 60px rgba(212,168,75,.25)}" +
      "#wk-boot small{display:block;margin-top:6px;font-weight:500;font-size:12.5px;opacity:.7}";
    D.head.appendChild(s);
  }
  function fa() { return st.lang === "fa-IR"; }
  function label() {
    var M = fa()
      ? { off: "هی فراورتس", wake: "بگو «هی فراورتس»", cmd: "می‌شنوم…", think: "دارم فکر می‌کنم", say: "دارم جواب می‌دم" }
      : { off: "Hey Phraortes", wake: "Say “Hey Phraortes”", cmd: "Listening…", think: "Thinking…", say: "Speaking…" };
    return M[st.mode] || M.off;
  }
  function paint() {
    if (!chip) return;
    chip.setAttribute("data-m", st.mode);
    chip.querySelector(".t").textContent = label();
    chip.querySelector("#wk-lang").textContent = fa() ? "FA" : "EN";
    chip.querySelector("#wk-lang").style.display = st.on ? "none" : "";
  }
  function say(txt, ms) {
    if (!cap) return;
    cap.firstChild.textContent = txt; cap.classList.add("show");
    clearTimeout(say.t); if (ms !== 0) say.t = setTimeout(function () { cap.classList.remove("show") }, ms || 3200);
  }
  function mode(m) { st.mode = m; paint(); }

  /* ---------- screen wake lock ---------- */
  function lock(on) {
    try {
      if (on && navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { st.lock = l }).catch(function () {});
      else if (!on && st.lock) { st.lock.release(); st.lock = null }
    } catch (e) {}
  }
  D.addEventListener("visibilitychange", function () { if (!D.hidden && st.on) { lock(true); startRec() } });

  /* ---------- recognition ---------- */
  function stopRec() {
    var r = st.rec; st.rec = null;
    if (r) { r.onend = r.onerror = r.onresult = null; try { r.abort() } catch (e) {} }
  }
  function startRec() {
    if (!st.on || st.speaking || !SR || D.hidden) return;
    if (W.__auraActive) { return }                    /* Aura owns the mic */
    if (st.rec) return;
    var r = new SR(), g = ++st.gen;
    r.lang = st.lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = function (e) {
      if (g !== st.gen) return;
      st.fails = 0;
      var txt = "", fin = false;
      for (var i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript + " "; if (e.results[i].isFinal) fin = true }
      txt = txt.trim(); if (!txt) return;
      onHear(txt, fin);
    };
    r.onerror = function (e) {
      if (g !== st.gen) return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { say(fa() ? "اجازه میکروفون داده نشد. از تنظیمات سافاری فعالش کن." : "Microphone permission denied. Enable it in Safari settings.", 5000); off(); return }
      st.fails++;
    };
    r.onend = function () {
      if (g !== st.gen) return;
      st.rec = null;
      if (!st.on || st.speaking) return;
      if (st.fails > 6) { say(fa() ? "شنیدن قطع شد؛ دوباره لمس کن." : "Listening stopped — tap to resume.", 4000); off(); return }
      setTimeout(startRec, st.fails ? 600 : 120);
    };
    st.rec = r;
    try { r.start() } catch (e) { st.rec = null; st.fails++; setTimeout(startRec, 700) }
  }

  /* ---------- hearing logic ---------- */
  function onHear(txt, fin) {
    if (st.mode === "wake") {
      var m = matchWake(txt);
      if (!m) return;
      chime(true); mode("cmd"); st.cmdBuf = "";
      say(fa() ? "بفرما…" : "Yes?", 0);
      /* restart recognition so the wake phrase isn't re-read in the command */
      stopRec(); st.gen++;
      if (m.rest && m.rest.split(" ").length >= 2) { finishCmd(m.rest); return }
      armCmdTimeout(7000);
      setTimeout(startRec, 60);
      return;
    }
    if (st.mode === "cmd") {
      st.cmdBuf = txt; say(txt, 0);
      armCmdTimeout(fin ? 900 : 1700);
    }
  }
  function armCmdTimeout(ms) {
    clearTimeout(st.cmdTimer);
    st.cmdTimer = setTimeout(function () {
      if (st.mode !== "cmd") return;
      if (st.cmdBuf) finishCmd(st.cmdBuf); else { chime(false); say(fa() ? "چیزی نشنیدم." : "Didn't catch that.", 1800); backToWake() }
    }, ms);
  }
  function backToWake() { clearTimeout(st.cmdTimer); st.cmdBuf = ""; if (!st.on) return; mode("wake"); stopRec(); st.gen++; setTimeout(startRec, 150) }

  /* ---------- run command ---------- */
  function finishCmd(cmd) {
    clearTimeout(st.cmdTimer);
    cmd = String(cmd || "").trim();
    if (!cmd) return backToWake();
    mode("think"); say(cmd, 0); stopRec(); st.gen++;
    var handled = false, reply = "";
    try {
      var A = W.PHR_AGENT;
      if (A && A.typed) { var r = A.typed(cmd); if (r) { handled = true; reply = typeof r === "string" ? r : (fa() ? "انجام شد." : "Done.") } }
    } catch (e) {}
    if (handled) { return speak(reply, backToWake) }
    if (typeof W.PHR_sendText !== "function" || W.PHR_busy && W.PHR_busy()) { speak(fa() ? "الان مشغولم، چند لحظه دیگه." : "I'm busy right now, try again in a moment.", backToWake); return }
    var before = D.querySelectorAll(".msg.ai").length;
    W.PHR_sendText(cmd);
    var t0 = Date.now(), seen = false;
    (function poll() {
      if (!st.on) return;
      var busy = W.PHR_busy && W.PHR_busy();
      if (busy) seen = true;
      var done = (seen && !busy) || (!seen && Date.now() - t0 > 4000 && D.querySelectorAll(".msg.ai").length > before && !busy);
      if (done) { setTimeout(function () { speak(lastAnswer(), backToWake) }, 350); return }
      if (Date.now() - t0 > 120000) { speak(fa() ? "خیلی طول کشید." : "That took too long.", backToWake); return }
      setTimeout(poll, 400);
    })();
  }
  function lastAnswer() {
    var all = D.querySelectorAll(".msg.ai"), el = all[all.length - 1];
    if (!el) return fa() ? "جوابی نبود." : "No answer.";
    var c = el.cloneNode(true);
    [].forEach.call(c.querySelectorAll("pre,code,.katex,button,svg,canvas,.stream-caret,.msg-actions,table"), function (x) { x.remove() });
    var t = (c.textContent || "").replace(/\s+/g, " ").trim();
    return t || (fa() ? "جواب روی صفحه است." : "The answer is on screen.");
  }

  /* ---------- speak ---------- */
  function clean(t) {
    return String(t || "").replace(/```[\s\S]*?```/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/[*_#>`~|]/g, "").replace(/\s+/g, " ").trim();
  }
  function pickVoice(lang) {
    var vs = []; try { vs = speechSynthesis.getVoices() || [] } catch (e) {}
    var b = lang.split("-")[0];
    return vs.find(function (v) { return v.lang === lang }) || vs.find(function (v) { return v.lang && v.lang.indexOf(b) === 0 }) || null;
  }
  function speak(text, done) {
    var raw = clean(text).slice(0, 700), fin = false;
    var end = function () { if (fin) return; fin = true; st.speaking = false; clearInterval(keep); chime(false); done && done() };
    if (!raw || !W.speechSynthesis) { return end() }
    st.speaking = true; mode("say"); say(raw.length > 140 ? raw.slice(0, 137) + "…" : raw, 0);
    stopRec(); st.gen++;
    var keep = 0;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(raw), L = /[؀-ۿ]/.test(raw) ? "fa-IR" : "en-US";
      u.lang = L; var v = pickVoice(L); if (v) u.voice = v; u.rate = 1.02;
      u.onend = u.onerror = function () { setTimeout(end, 250) };
      speechSynthesis.speak(u);
      keep = setInterval(function () { if (!speechSynthesis.speaking) { end() } }, 1500);
      setTimeout(end, 45000);
    } catch (e) { end() }
  }

  /* ---------- on / off ---------- */
  function on() {
    if (!SR) { say(fa() ? "این مرورگر شنیدن صدا رو پشتیبانی نمی‌کنه. سافاری رو امتحان کن." : "Speech recognition isn't supported in this browser. Try Safari.", 5000); return }
    if (W.__auraActive) { say(fa() ? "اول Aura رو ببند." : "Close Aura first.", 2500); return }
    try { if (W.speechSynthesis) { var u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u) } } catch (e) {} /* unlock TTS inside the tap */
    try { AC = AC || new (W.AudioContext || W.webkitAudioContext)(); AC.resume() } catch (e) {}
    st.on = true; st.fails = 0; lock(true); mode("wake"); chime(true);
    say(fa() ? "آماده‌ام. بگو «هی فراورتس»." : "Ready. Say “Hey Phraortes”.", 3200);
    stopRec(); startRec();
  }
  function off() {
    st.on = false; clearTimeout(st.cmdTimer); stopRec(); st.gen++; lock(false);
    try { speechSynthesis.cancel() } catch (e) {}
    st.speaking = false; mode("off"); LS("phr_wake_on", "0");
  }
  W.PHR_WAKE = { on: on, off: off, match: matchWake, state: function () { return { on: st.on, mode: st.mode, lang: st.lang } } };

  function build() {
    css();
    chip = D.createElement("div"); chip.id = "wk-chip"; chip.setAttribute("role", "button"); chip.setAttribute("aria-label", "Hey Phraortes hands-free");
    chip.innerHTML = '<span class="d"></span><span class="t"></span><span id="wk-lang"></span>';
    cap = D.createElement("div"); cap.id = "wk-cap"; cap.innerHTML = "<span></span>";
    D.body.appendChild(cap); D.body.appendChild(chip);
    var press = 0, longT = 0;
    chip.addEventListener("click", function (e) {
      if (e.target.id === "wk-lang") { st.lang = fa() ? "en-US" : "fa-IR"; LS("phr_wake_lang", st.lang); paint(); say(fa() ? "زبان شنیدن: فارسی" : "Listening language: English", 1800); return }
      if (st.on) { off(); say(fa() ? "خاموش شد." : "Hands-free off.", 1500) } else { LS("phr_wake_on", "1"); on() }
    });
    paint();
    /* ?listen=1 (Siri Shortcut / home-screen link): one big tap to start */
    if (/[?&]listen=1/.test(location.search)) {
      var b = D.createElement("div"); b.id = "wk-boot";
      b.innerHTML = '<button type="button">' + (fa() ? "لمس کن تا گوش بدم" : "Tap to start listening") + "<small>" + (fa() ? "بعدش فقط بگو «هی فراورتس»" : "then just say “Hey Phraortes”") + "</small></button>";
      b.firstChild.addEventListener("click", function () { b.remove(); on() });
      D.body.appendChild(b);
    }
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", build); else build();
})();
