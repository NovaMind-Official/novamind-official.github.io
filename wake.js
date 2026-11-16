/* Phraortes — "Hey Phraortes" hands-free mode (wake.js)
   Works only while the app is open in the foreground (iOS limit). One tap per page load to start. */
(function () {
  "use strict";
  var W = window, D = document;
  var SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
  var st = { on: false, mode: "off", rec: null, speaking: false, lang: "en-US", fails: 0, lock: null, cmdBuf: "", cmdTimer: 0, gen: 0 };

  function con(t, a, b) { try { W.PHR_CON && W.PHR_CON.ev(t, a, b) } catch (e) {} }

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
  function skel(w) { return String(w || "").toLowerCase().replace(/ph/g, "f").replace(/[^a-z]/g, "").replace(/[aeiouyhw]/g, "").replace(/(.)\1+/g, "$1") }
  var GREET = /^(hey|hay|hi|hei|ok|okay|hello|yo|a|they|hate|hay)$/;
  function aliases() { var a = (LS("phr_wake_alias") || "").toLowerCase().split(/[,،;]/).map(function (x) { return x.trim() }).filter(Boolean); return a }
  /* returns {hit:true, rest:"text after wake word"} or null */
  function matchWake(text) {
    var raw = String(text || "").toLowerCase().replace(/[.!?؟،,]/g, " ").replace(/\s+/g, " ").trim();
    if (!raw) return null;
    var fm = FA.exec(raw);
    if (fm) return { hit: true, rest: raw.slice(fm.index + fm[0].length).trim() };
    var toks = raw.split(" "), al = aliases(), i, n, k, t, hit;
    for (i = 0; i < toks.length; i++) {
      var greet = i > 0 && GREET.test(toks[i - 1]) || /^(hey|hay|ok|okay)$/.test(toks[i]);
      for (n = 1; n <= 3 && i + n <= toks.length; n++) {
        t = toks.slice(i, i + n).join("").replace(/[^a-z]/g, "");
        if (t.length < 4 || t.length > 14) continue;
        hit = false;
        for (k = 0; k < KNOWN.length && !hit; k++) if (lev(t, KNOWN[k]) <= (greet ? 2 : 1)) hit = true;
        if (!hit) { var sk = skel(t); if (sk.length >= 3) { var d = lev(sk, "frts"); if ((d === 0 && (greet || t.length >= 8)) || (d <= 1 && greet) || (d <= 2 && greet && sk.length >= 4)) hit = true } }
        if (!hit) for (k = 0; k < al.length; k++) { var a = al[k].replace(/[^a-z؀-ۿ]/g, ""); if (a && (t === a || (a.length > 4 && lev(t, a) <= 1))) hit = true }
        if (hit) return { hit: true, rest: toks.slice(i + n).join(" ").trim() };
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
  var dot, cap;
  function css() {
    if (D.getElementById("wk-css")) return;
    var s = D.createElement("style"); s.id = "wk-css";
    s.textContent =
      "#wk-dot{position:fixed;top:calc(env(safe-area-inset-top) + 7px);left:50%;margin-left:-4px;width:8px;height:8px;border-radius:50%;z-index:9400;pointer-events:none;background:#6b6455;opacity:0;transition:opacity .3s,background .2s}" +
      "#wk-dot.on{opacity:.9}" +
      "#wk-dot[data-m=wake]{background:#d4a84b;animation:wkp 2.4s ease-in-out infinite}" +
      "#wk-dot[data-m=cmd]{background:#6fe3a0;animation:wkp .7s ease-in-out infinite}" +
      "#wk-dot[data-m=think]{background:#8ab4ff;animation:wkp .9s ease-in-out infinite}" +
      "#wk-dot[data-m=say]{background:#e48cff;animation:wkp 1.1s ease-in-out infinite}" +
      "#wk-dot[data-m=armed]{background:#6b6455}" +
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
      ? { off: "", wake: "بگو «هی فراورتس»", cmd: "می‌شنوم…", think: "دارم فکر می‌کنم", say: "دارم جواب می‌دم" }
      : { off: "Hey Phraortes", wake: "Say “Hey Phraortes”", cmd: "Listening…", think: "Thinking…", say: "Speaking…" };
    return M[st.mode] || M.off;
  }
  function paint() {
    if (!dot) return;
    dot.setAttribute("data-m", st.mode); dot.classList.toggle("on", st.mode !== "off");
  }
  function say(txt, ms) {
    if (!cap) return;
    cap.firstChild.textContent = txt; cap.classList.add("show");
    clearTimeout(say.t); if (ms !== 0) say.t = setTimeout(function () { cap.classList.remove("show") }, ms || 3200);
  }
  function mode(m) { st.mode = m; paint(); con("mode", m); }

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
    if (st.rec || st.paused) return;
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
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { say(fa() ? "اجازه میکروفون داده نشد. از تنظیمات سافاری فعالش کن." : "Microphone permission denied. Enable it in Safari settings.", 5000); off(true); arm(); return }
      st.fails++;
    };
    r.onend = function () {
      if (g !== st.gen) return;
      st.rec = null;
      if (!st.on || st.speaking) return;
      if (st.fails > 6) { say(fa() ? "شنیدن قطع شد؛ یه جا روی صفحه لمس کن." : "Listening stopped — tap anywhere to resume.", 4000); off(true); arm(); return }
      setTimeout(startRec, st.fails ? 600 : 120);
    };
    st.rec = r;
    try { r.start() } catch (e) { st.rec = null; st.fails++; setTimeout(startRec, 700) }
  }

  /* ---------- hearing logic ---------- */
  function onHear(txt, fin) {
    if (st.mode === "wake") {
      var hd = D.getElementById("wake-heard"); if (hd) hd.textContent = txt;
      var m = matchWake(txt);
      if (!m) { if (fin) say("“" + txt + "”", 1300); return }
      if (STOP.test(m.rest)) { setEnabled(false); return }
      chime(true); mode("cmd"); st.cmdBuf = ""; if (LS("phr_con_auto") !== "0") con("wake");
      say(fa() ? "بفرما…" : "Yes?", 0);
      /* restart recognition so the wake phrase isn't re-read in the command */
      stopRec(); st.gen++;
      if (m.rest && m.rest.split(" ").length >= 2) { finishCmd(m.rest); return }
      armCmdTimeout(7000);
      setTimeout(startRec, 60);
      return;
    }
    if (st.mode === "cmd") {
      st.cmdBuf = txt; say(txt, 0); con("hear", txt, fin);
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
  function backToWake() { clearTimeout(st.cmdTimer); st.cmdBuf = ""; if (!st.on) { st.manual = false; mode("off"); return } mode("wake"); stopRec(); st.gen++; setTimeout(startRec, 150) }

  /* ---------- run command ---------- */
  function finishCmd(cmd) {
    clearTimeout(st.cmdTimer);
    cmd = String(cmd || "").trim();
    if (!cmd) return backToWake();
    if (STOP.test(cmd)) { con("cmd", cmd); con("done", "listening off"); setEnabled(false); return }
    con("cmd", cmd);
    if (/^(?:close|hide|dismiss)\s+(?:the\s+)?console|کنسول.*(?:ببند|بسته)/i.test(cmd)) { try { W.PHR_CON && W.PHR_CON.close() } catch (e) {} return backToWake() }
    mode("think"); say(cmd, 0); stopRec(); st.gen++;
    /* the chat sits behind the Account page / sheets: bring it forward so the work is visible */
    try { if (D.getElementById("account-page") && D.getElementById("account-page").classList.contains("show") && typeof W.closeAccountPage === "function") W.closeAccountPage() } catch (e) {}
    try { var _t = D.querySelector("#toast,.toast"); if (_t) _t.textContent = "" } catch (e) {}
    var handled = false, reply = "";
    try {
      var A = W.PHR_AGENT;
      if (A && A.typed) { var r = A.typed(cmd); if (r) { handled = true; reply = typeof r === "string" ? r : (fa() ? "انجام شد." : "Done.") } }
    } catch (e) {}
    if (handled) { con("done", reply); return speak(reply, backToWake) }
    if (typeof W.PHR_sendText !== "function" || W.PHR_busy && W.PHR_busy()) { con("err", "agent busy"); speak(fa() ? "الان مشغولم، چند لحظه دیگه." : "I'm busy right now, try again in a moment.", backToWake); return }
    var before = D.querySelectorAll(".msg.ai").length, allBefore = D.querySelectorAll(".msg").length;
    var sent = W.PHR_sendText(cmd);
    if (sent === false) { con("err", "send failed"); speak(fa() ? "ارسال نشد." : "I couldn't send that.", backToWake); return }
    setTimeout(function () {
      if (!st.on || st.mode !== "think") return;
      var busyNow = W.PHR_busy && W.PHR_busy(), grew = D.querySelectorAll(".msg").length > allBefore;
      if (!busyNow && !grew) { con("err", "message not sent — plan or model limit?"); speak(fa() ? "پیام ارسال نشد؛ احتمالاً سقف پلن یا محدودیت مدل است." : "The message wasn't sent. You may have hit your plan or model limit.", backToWake) }
    }, 2500);
    var t0 = Date.now(), seen = false;
    (function poll() {
      if (!st.on && !st.manual) return;
      var busy = W.PHR_busy && W.PHR_busy();
      if (busy) seen = true;
      var done = (seen && !busy) || (!seen && Date.now() - t0 > 4000 && D.querySelectorAll(".msg.ai").length > before && !busy);
      if (done) { setTimeout(function () { var ans = lastAnswer(); con("answer", ans); speak(ans, backToWake) }, 350); return }
      if (Date.now() - t0 > 120000) { con("err", "timeout"); speak(fa() ? "خیلی طول کشید." : "That took too long.", backToWake); return }
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
    con("say", raw);
    if (st.manual && !st.on) { return done && done() }
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

  var STOP = /^(?:stop listening|turn off|go to sleep|goodbye|bye|گوش نده|خاموش شو|خاموش|برو بخواب|خداحافظ)/i;
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
  function off(keep) {
    st.on = false; clearTimeout(st.cmdTimer); stopRec(); st.gen++; lock(false);
    try { speechSynthesis.cancel() } catch (e) {}
    st.speaking = false; mode("off"); if (!keep) LS("phr_wake_on", "0");
  }
  /* persisted switch (Settings → Hey Phraortes). No on-screen button: after a reload the first touch anywhere starts listening. */
  var armed = false;
  function arm() {
    if (armed || st.on || LS("phr_wake_on") !== "1") return; armed = true; mode("armed");
    var go = function () { D.removeEventListener("pointerdown", go, true); D.removeEventListener("touchend", go, true); armed = false; if (LS("phr_wake_on") === "1" && !st.on) on(); };
    D.addEventListener("pointerdown", go, true); D.addEventListener("touchend", go, true);
    say(fa() ? "یه بار روی صفحه لمس کن تا گوش بدم." : "Tap anywhere once and I'll start listening.", 4200);
  }
  function setEnabled(v) {
    if (v) { LS("phr_wake_on", "1"); on() }
    else { off(); say(fa() ? "گوش‌دادن خاموش شد." : "Stopped listening.", 1800); speak(fa() ? "خاموش شد." : "Okay, stopped.", function () { }) }
    var t = D.getElementById("wake-toggle"); if (t) t.checked = !!v; paintRow();
  }
  function pause() { if (!st.on) return; st.paused = true; clearTimeout(st.cmdTimer); stopRec(); st.gen++; mode("armed") }
  function resume() { if (!st.on || !st.paused) return; st.paused = false; mode("wake"); setTimeout(startRec, 600) }
  function paintRow() { var ca = D.getElementById("con-auto"); if (ca) ca.checked = LS("phr_con_auto") !== "0"; var e = D.getElementById("ac2-ag-st"); if (e) e.textContent = LS("phr_wake_on") === "1" ? "On" : "Off"; var t = D.getElementById("wake-toggle"); if (t) t.checked = LS("phr_wake_on") === "1" }
  function setAlias(a) { LS("phr_wake_alias", String(a || "")) }
  function setLang(l) { st.lang = l; LS("phr_wake_lang", l); if (st.on) { stopRec(); st.gen++; setTimeout(startRec, 150) } }
  function run(cmd) { if (!st.on) st.manual = true; finishCmd(cmd) }
  W.PHR_WAKE = { run: run, paintRow: paintRow, pause: pause, resume: resume, setAlias: setAlias, on: on, off: off, setEnabled: setEnabled, setLang: setLang, match: matchWake, enabled: function () { return LS("phr_wake_on") === "1" }, lang: function () { return st.lang }, state: function () { return { on: st.on, mode: st.mode, lang: st.lang } } };

  function build() {
    css();
    dot = D.createElement("div"); dot.id = "wk-dot"; dot.setAttribute("aria-hidden", "true");
    cap = D.createElement("div"); cap.id = "wk-cap"; cap.innerHTML = "<span></span>";
    D.body.appendChild(cap); D.body.appendChild(dot);
    var t = D.getElementById("wake-toggle"); if (t) t.checked = LS("phr_wake_on") === "1";
    var l = D.getElementById("wake-lang"); if (l) l.value = st.lang; var al = D.getElementById("wake-alias"); if (al) al.value = LS("phr_wake_alias") || "";
    paint(); arm();
    /* ?listen=1 (Siri Shortcut / home-screen link): one big tap to start */
    if (/[?&]listen=1/.test(location.search)) {
      var b = D.createElement("div"); b.id = "wk-boot";
      b.innerHTML = '<button type="button">' + (fa() ? "لمس کن تا گوش بدم" : "Tap to start listening") + "<small>" + (fa() ? "بعدش فقط بگو «هی فراورتس»" : "then just say “Hey Phraortes”") + "</small></button>";
      b.firstChild.addEventListener("click", function () { b.remove(); LS("phr_wake_on", "1"); on() });
      D.body.appendChild(b);
    }
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", build); else build();
})();
