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
      "#wk-dot[data-m=armed]{background:#8a806a}#wk-dot::after{content:\"\";position:absolute;inset:-16px}" +
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
  function hideCap() { clearTimeout(say.t); if (cap) cap.classList.remove("show") }
  function mode(m) { st.mode = m; paint(); con("mode", m); }

  /* ---------- screen wake lock ---------- */
  function lock(on) {
    try {
      if (on && navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { st.lock = l }).catch(function () {});
      else if (!on && st.lock) { st.lock.release(); st.lock = null }
    } catch (e) {}
  }
  D.addEventListener("visibilitychange", function () { if (!D.hidden && st.on) { lock(true); startRec() } });


  /* ---------- Whisper engine (works in the installed iPhone app, where Apple speech is blocked) ---------- */
  var STT_BASE = (function () { try { return WORKER_BASE_URL } catch (e) { return "https://phraortes-api.esmaeilimatin20.workers.dev" } })();
  var MIC = null, HALL = /^(thank you\.?|thanks for watching\.?|thanks\.?|you\.?|bye\.?|\.+|…|اشتراک|ترجمه.*)$/i;
  function standalone() { try { return W.navigator.standalone === true || (W.matchMedia && W.matchMedia("(display-mode: standalone)").matches) } catch (e) { return false } }
  function useWhisper() { var p = LS("phr_stt"); if (p === "native") return !SR; if (p === "whisper") return true; return !SR || standalone() }
  function wav16(chunks, rate) {
    var n = 0, i, j; chunks.forEach(function (c) { n += c.length });
    var all = new Float32Array(n), o = 0; chunks.forEach(function (c) { all.set(c, o); o += c.length });
    var ratio = rate / 16000, m = Math.floor(n / ratio), pcm = new Int16Array(m);
    for (i = 0; i < m; i++) { var p = i * ratio, a = Math.floor(p), f = p - a, v = all[a] * (1 - f) + (all[a + 1] || all[a]) * f; v = Math.max(-1, Math.min(1, v)); pcm[i] = v < 0 ? v * 32768 : v * 32767 }
    var b = new ArrayBuffer(44 + m * 2), d = new DataView(b);
    function w(off, t) { for (var k = 0; k < t.length; k++) d.setUint8(off + k, t.charCodeAt(k)) }
    w(0, "RIFF"); d.setUint32(4, 36 + m * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 16000, true); d.setUint32(28, 32000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, m * 2, true);
    for (j = 0; j < m; j++) d.setInt16(44 + j * 2, pcm[j], true);
    return new Blob([b], { type: "audio/wav" });
  }
  function getMic() {
    if (MIC && MIC.stream && MIC.stream.active) { try { MIC.ctx.state !== "running" && MIC.ctx.resume() } catch (e) {} return Promise.resolve(MIC) }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject({ name: "NotSupported", message: "no mic api" });
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      var Ctx = W.AudioContext || W.webkitAudioContext, ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume();
      var src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(2048, 1, 1), sink = ctx.createGain(); sink.gain.value = 0;
      var M = MIC = { stream: stream, ctx: ctx, src: src, proc: proc, sink: sink, cons: null, nf: .006, pre: [], seg: null, hot: 0, last: 0, t0: 0 };
      proc.onaudioprocess = function (ev) {
        var c = M.cons; if (!c || !c._alive) { M.seg = null; M.pre = []; return }
        var inp = ev.inputBuffer.getChannelData(0), buf = new Float32Array(inp), sum = 0, i, now = Date.now();
        for (i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        var rms = Math.sqrt(sum / buf.length), thr = Math.max(.014, M.nf * 3.2), voice = rms > thr;
        if (!M.seg) {
          if (!voice) M.nf = M.nf * .985 + rms * .015;
          M.pre.push(buf); if (M.pre.length > 8) M.pre.shift();
          M.hot = voice ? M.hot + 1 : 0;
          if (M.hot >= 2) { M.seg = M.pre.slice(); M.pre = []; M.t0 = now; M.last = now; con("vad", "voice") }
        } else {
          M.seg.push(buf); if (voice) M.last = now;
          if (now - M.last > 800 || now - M.t0 > 9000) {
            var seg = M.seg, voiced = (M.last - M.t0) / 1000; M.seg = null; M.hot = 0;
            if (voiced > .3) sendSeg(c, wav16(seg, ctx.sampleRate), voiced);
          }
        }
      };
      src.connect(proc); proc.connect(sink); sink.connect(ctx.destination);
      return M;
    });
  }
  function releaseMic() {
    var M = MIC; MIC = null; if (!M) return;
    try { M.proc.onaudioprocess = null; M.src.disconnect(); M.proc.disconnect() } catch (e) {}
    try { M.stream.getTracks().forEach(function (t) { t.stop() }) } catch (e) {}
    try { M.ctx.close() } catch (e) {}
  }
  var inflight = 0;
  function sendSeg(c, blob, dur) {
    if (inflight >= 2) return; inflight++;
    var code = (st.lang || "en-US").split("-")[0];
    fetch(STT_BASE + "/api/stt?lang=" + code, { method: "POST", headers: { "Content-Type": "audio/wav" }, body: blob })
      .then(function (r) {
        if (r.status === 404 || r.status === 405 || r.status === 501) { throw { code: "stt-missing" } }
        if (r.status === 429) { throw { code: "stt-busy" } }
        if (!r.ok) throw { code: "stt-fail" };
        return r.json();
      })
      .then(function (j) {
        inflight--; if (!c._alive) return;
        var t = String((j && j.text) || "").trim(); if (!t) return;
        if (dur < 1.8 && HALL.test(t)) return;
        con("stt", t); c.onresult && c.onresult({ resultIndex: 0, results: [{ 0: { transcript: t }, isFinal: true, length: 1 }] });
      })
      .catch(function (e) { inflight--; if (c._alive) c.onerror && c.onerror({ error: (e && e.code) || "network" }) });
  }
  function WhisperRec() { this.lang = "en-US"; this.continuous = true; this.interimResults = true; this.maxAlternatives = 1; this.onresult = this.onend = this.onerror = null; this._alive = false }
  WhisperRec.prototype.start = function () {
    var self = this; self._alive = true;
    getMic().then(function (M) { if (!self._alive) return; M.cons = self; M.seg = null; M.pre = []; M.hot = 0 })
      .catch(function (e) {
        var den = /NotAllowed|denied|Permission/i.test((e && e.name || "") + (e && e.message || ""));
        self.onerror && self.onerror({ error: den ? "not-allowed" : "audio-capture" }); self.onend && self.onend();
      });
  };
  WhisperRec.prototype.abort = WhisperRec.prototype.stop = function () { this._alive = false; if (MIC && MIC.cons === this) { MIC.cons = null; MIC.seg = null } };
  D.addEventListener("visibilitychange", function () { if (!D.hidden && MIC) { try { MIC.ctx.state !== "running" && MIC.ctx.resume() } catch (e) {} } });

  /* ---------- recognition ---------- */
  function stopRec() {
    var r = st.rec; st.rec = null;
    if (r) { r.onend = r.onerror = r.onresult = null; try { r.abort() } catch (e) {} }
  }
  function startRec() {
    if (!st.on || st.speaking || D.hidden) return;
    if (W.__auraActive) { return }                    /* Aura owns the mic */
    if (st.rec || st.paused) return;
    var wh = useWhisper(), r = wh ? new WhisperRec() : new SR(), g = ++st.gen; r.__wh = wh;
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
      if (!r.__wh && (e.error === "service-not-allowed" || e.error === "network" || e.error === "language-not-supported") && navigator.mediaDevices) {
        LS("phr_stt", "whisper"); con("err", "native speech blocked → switching to Whisper"); stopRec(); st.gen++; st.fails = 0; setTimeout(startRec, 200); return;
      }
      if (e.error === "stt-missing") { say(fa() ? "سرور هنوز برای شنیدن صدا آماده نیست؛ به‌روزرسانی Worker لازم است." : "The server isn't set up for voice yet. The Worker needs the /api/stt update.", 7000); con("err", "worker has no /api/stt"); off(true); arm(); return }
      if (e.error === "stt-busy") { say(fa() ? "الان شلوغ است؛ چند لحظه بعد دوباره." : "Voice is busy — try again in a moment.", 3500); return }
      if (e.error === "stt-fail") { st.fails++; if (st.fails > 6) { say(fa() ? "شنیدن صدا خطا داد." : "Voice recognition failed.", 4000); off(true); arm() } return }
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { say(fa() ? "اجازه میکروفون داده نشد. از تنظیمات سافاری فعالش کن." : "Microphone permission denied. Enable it in Safari settings.", 5000); off(true); arm(); return }
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "audio-capture") { say(fa() ? "میکروفون پیدا نشد یا دست برنامهٔ دیگری است." : "No microphone available, or another app is using it.", 5000); off(true); arm(); return }
      if (e.error === "network") { st.fails += 2; if (st.fails > 4) { say(fa() ? "شنیدن صدا به اینترنت نیاز دارد و وصل نشد. اتصال را بررسی کن (در حالت اپ نصب‌شده روی آیفون ممکن است کار نکند؛ در سافاری باز کن)." : "Speech needs a connection and couldn't reach it. Check your network (an installed home-screen app on iPhone may not support it; open in Safari).", 6000); off(true); arm(); return } }
      st.fails++;
    };
    r.onend = function () {
      if (g !== st.gen) return;
      st.rec = null;
      if (!st.on || st.speaking) return;
      if (st.fails > 6) { say(fa() ? "شنیدن قطع شد؛ نقطهٔ بالای صفحه را لمس کن." : "Listening stopped — tap the dot at the top to resume.", 4000); off(true); arm(); return }
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
    var end = function () { if (fin) return; fin = true; st.speaking = false; clearInterval(keep); chime(false); if (!st.on) hideCap(); done && done() };
    if (!raw || !W.speechSynthesis) { return end() }
    st.speaking = true; mode("say"); say(raw.length > 140 ? raw.slice(0, 137) + "…" : raw, 0);
    stopRec(); st.gen++;
    var keep = 0, L = /[؀-ۿ]/.test(raw) ? "fa-IR" : "en-US";
    function sys() {
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(raw);
        u.lang = L; var v = (W.PHR_VOICE && PHR_VOICE.pickDevice(L)) || pickVoice(L); if (v) { u.voice = v; u.lang = v.lang } u.rate = 1.02 * (W.PHR_VOICE ? PHR_VOICE.rate() : 1);
        u.onend = u.onerror = function () { setTimeout(end, 250) };
        speechSynthesis.speak(u);
        keep = setInterval(function () { if (!speechSynthesis.speaking) { end() } }, 1500);
        setTimeout(end, 45000);
      } catch (e) { end() }
    }
    if (W.PHR_VOICE && PHR_VOICE.wants(raw, L)) {
      PHR_VOICE.fetch(raw, { lang: L }).then(function (a) {
        if (fin) return;
        if (!a) return sys();
        if (!st.speaking) return;
        PHR_VOICE.play(a, function () { setTimeout(end, 250) });
        setTimeout(end, 60000);
      });
    } else sys();
  }

  var STOP = /^(?:stop listening|turn off|go to sleep|goodbye|bye|گوش نده|خاموش شو|خاموش|برو بخواب|خداحافظ)/i;
  /* ---------- on / off ---------- */
  function on() {
    if (!SR && !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { say(fa() ? "این مرورگر به میکروفون دسترسی نمی‌ده." : "This browser can't reach the microphone.", 5000); return }
    if (W.__auraActive) { say(fa() ? "اول Aura رو ببند." : "Close Aura first.", 2500); return }
    try { if (W.speechSynthesis) { var u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u) } } catch (e) {} /* unlock TTS inside the tap */
    try { AC = AC || new (W.AudioContext || W.webkitAudioContext)(); AC.resume() } catch (e) {}
    st.on = true; st.fails = 0; lock(true); mode("wake"); chime(true);
    say(fa() ? "آماده‌ام. بگو «هی فراورتس»." : "Ready. Say “Hey Phraortes”.", 3200);
    stopRec(); startRec();
  }
  function off(keep) {
    st.on = false; clearTimeout(st.cmdTimer); stopRec(); st.gen++; lock(false); releaseMic();
    try { speechSynthesis.cancel() } catch (e) {} try { W.PHR_VOICE && PHR_VOICE.stop() } catch (e) {}
    st.speaking = false; mode("off"); hideCap(); armed = false; if (dot) { dot.onclick = null; dot.style.pointerEvents = "" } if (!keep) LS("phr_wake_on", "0");
  }
  /* persisted switch (Settings → Hey Phraortes). No on-screen button: after a reload the first touch anywhere starts listening. */
  var armed = false;
  function arm() {
    if (armed || st.on || LS("phr_wake_on") !== "1") return; armed = true; mode("armed");
    dot.style.pointerEvents = "auto";
    dot.onclick = function (ev) { ev.stopPropagation(); dot.onclick = null; dot.style.pointerEvents = ""; armed = false; if (LS("phr_wake_on") === "1" && !st.on) on(); };
    say(fa() ? "برای شروع گوش دادن، نقطهٔ بالای صفحه را لمس کن." : "Tap the small dot at the top to start listening.", 4200);
  }
  function setEnabled(v) {
    if (v) { LS("phr_wake_on", "1"); on() }
    else { off(); say(fa() ? "گوش‌دادن خاموش شد." : "Stopped listening.", 1800); }
    var t = D.getElementById("wake-toggle"); if (t) t.checked = !!v; paintRow();
  }
  function pause() { if (!st.on) return; st.paused = true; clearTimeout(st.cmdTimer); stopRec(); st.gen++; mode("armed") }
  function resume() { if (!st.on || !st.paused) return; st.paused = false; mode("wake"); setTimeout(startRec, 600) }
  function paintRow() { var ik = D.getElementById("img-key"); if (ik && !ik.value) ik.value = LS("phr_img_key") || ""; var ca = D.getElementById("con-auto"); if (ca) ca.checked = LS("phr_con_auto") !== "0"; var e = D.getElementById("ac2-ag-st"); if (e) e.textContent = LS("phr_wake_on") === "1" ? "On" : "Off"; var t = D.getElementById("wake-toggle"); if (t) t.checked = LS("phr_wake_on") === "1" }
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
