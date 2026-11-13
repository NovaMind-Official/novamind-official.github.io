/* Phraortes Hands — the agent's real-world actions.
   Timers, alarms and reminders that actually ring, plus tap-to-open phone actions (call, SMS, mail, maps,
   WhatsApp, Telegram, Shortcuts, Calendar...). Understands Persian and English without a model round trip.
   Public: window.PHR_HANDS = { parse(text), run(text), tool(name,args), list(), cancel(q), ring(id) }
   Honest limits (iOS web): in-app alarms ring while the app is open. For an alarm that also works with the app
   closed, every reminder/alarm offers a Calendar button (an .ics with a built-in alert). */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var KEY = "phr_hands_v1";
  var G = function (n) { try { return (0, eval)(n); } catch (e) { return undefined; } };

  /* ───────── text helpers ───────── */
  function norm(s) {
    s = String(s || "");
    s = s.replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
    s = s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\u200f\u200e]/g, " ").replace(/٫/g, ".").replace(/[؟?!،,]+/g, " ");
    s = s.replace(/سه\s+شنبه/g, "سهشنبه").replace(/چهار\s+شنبه/g, "چهارشنبه").replace(/پنج\s+شنبه/g, "پنجشنبه").replace(/یک\s+شنبه/g, "یکشنبه").replace(/دو\s+شنبه/g, "دوشنبه");
    return s.replace(/\s+/g, " ").trim();
  }
  var NUMW = { "یک": 1, "یه": 1, "دو": 2, "سه": 3, "چهار": 4, "پنج": 5, "شش": 6, "شیش": 6, "هفت": 7, "هشت": 8, "نه": 9, "ده": 10, "یازده": 11, "دوازده": 12, "پانزده": 15, "بیست": 20, "سی": 30, "چهل": 40, "پنجاه": 50, "شصت": 60,
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60 };
  var NW = "یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده|یازده|دوازده|پانزده|بیست|سی|چهل|پنجاه|شصت|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty";
  function numOf(x) { x = String(x).toLowerCase(); return NUMW[x] != null ? NUMW[x] : parseFloat(x); }
  var UNIT = function (u) { u = u.toLowerCase(); if (/^(ثانیه|sec|second|s$)/.test(u)) return 1000; if (/^(دقیقه|min|m$)/.test(u)) return 60000; if (/^(ساعت|h|hr|hour)/.test(u)) return 3600000; return 0; };

  /* duration: "10 minutes", "۲ ساعت و ۳۰ دقیقه", "نیم ساعت", "یک ربع", "half an hour" → {ms, text} */
  function duration(t) {
    var ms = 0, used = [], m;
    var re = new RegExp("(\\d+(?:\\.\\d+)?|" + NW + ")\\s*(ثانیه|دقیقه|ساعت|seconds?|secs?|minutes?|mins?|hours?|hrs?|h|m|s)(?![a-zA-Zا-ی])", "gi");
    while ((m = re.exec(t))) {
      var n = numOf(m[1]), u = UNIT(m[2]);
      if (!isFinite(n) || !u) continue;
      /* "ساعت 5" is a clock, "5 ساعت" is a duration; a lone "m"/"h"/"s" needs a digit right before it */
      if (m[2].length === 1 && !/^\d/.test(m[1])) continue;
      ms += n * u; used.push(m[0]);
    }
    var h;
    if ((h = /(نیم ساعت|half an hour|half hour)/i.exec(t))) { ms += 1800000; used.push(h[0]); }
    if ((h = /(یک ربع|ربع ساعت|یه ربع|a quarter of an hour|quarter hour)/i.exec(t))) { ms += 900000; used.push(h[0]); }
    if (/(\d+|یک|یه)\s*(ساعت|hour)\s*(و\s*)?(نیم|half)/i.test(t) && !/نیم ساعت/.test(t)) { ms += 1800000; }
    return ms > 0 ? { ms: ms, used: used } : null;
  }

  var DAYS = { "یکشنبه": 0, "دوشنبه": 1, "سهشنبه": 2, "چهارشنبه": 3, "پنجشنبه": 4, "جمعه": 5, "شنبه": 6, "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6 };

  /* clock time: returns {h,m,mark,used} or null */
  function clock(t) {
    var m, mark = null, used = null, h, mi = 0;
    var MK = "(صبح|ظهر|عصر|بعد ?از ?ظهر|شب|بامداد|نیمه ?شب|am|pm|a\\.m\\.|p\\.m\\.)";
    if ((m = new RegExp("ساعت\\s*(\\d{1,2}|" + NW + ")(?:\\s*[:.]\\s*(\\d{2}))?(?:\\s*و\\s*(نیم|ربع|\\d{1,2}\\s*دقیقه))?\\s*" + MK + "?", "i").exec(t))) {
      h = numOf(m[1]); mi = m[2] ? +m[2] : 0;
      if (m[3]) mi = /نیم/.test(m[3]) ? 30 : /ربع/.test(m[3]) ? 15 : parseInt(m[3], 10);
      mark = m[4] || null; used = m[0];
    } else if ((m = new RegExp("(?:\\bat|\\bby|@)\\s*(\\d{1,2})(?:\\s*[:.]\\s*(\\d{2}))?\\s*" + MK + "?", "i").exec(t))) {
      h = +m[1]; mi = m[2] ? +m[2] : 0; mark = m[3] || null; used = m[0];
    } else if ((m = new RegExp("\\b(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\s*" + MK + "?", "i").exec(t))) {
      h = +m[1]; mi = +m[2]; mark = m[3] || null; used = m[0];
    } else if ((m = new RegExp("\\b(\\d{1,2})\\s*(am|pm|a\\.m\\.|p\\.m\\.)\\b", "i").exec(t))) {
      h = +m[1]; mark = m[2]; used = m[0];
    } else if ((m = /(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(صبح|ظهر|عصر|بعد ?از ?ظهر|شب)/.exec(t))) {
      h = +m[1]; mi = m[2] ? +m[2] : 0; mark = m[3]; used = m[0];
    } else if (/(نیمه ?شب|midnight)/.test(t)) { h = 0; mark = "mid"; used = /(نیمه ?شب|midnight)/.exec(t)[0]; }
    else if (/(\bnoon\b|ظهر)(?!.*\d)/.test(t) && /(\bat noon\b|ساعت ظهر|ظهر\b)/.test(t)) { h = 12; mark = "noon"; used = /noon|ظهر/.exec(t)[0]; }
    if (h == null || !isFinite(h) || h > 24 || mi > 59) return null;
    if (mark) mark = mark.replace(/\s/g, "").toLowerCase();
    return { h: h, m: mi, mark: mark, used: used };
  }

  /* resolve a natural-language time to a Date (or null). `now` is injectable for tests. */
  function when(text, now, intent) {
    now = now || new Date();
    var t = norm(text).toLowerCase(), used = [], at = null, m;
    /* explicit ISO date/time (from the model) */
    if ((m = /(\d{4})-(\d{2})-(\d{2})[ t](\d{1,2}):(\d{2})/.exec(t))) {
      at = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0); return at && !isNaN(at) ? { at: at, used: [m[0]] } : null;
    }
    var d = duration(t);
    var c = clock(t);
    /* "in 10 minutes" / "۱۰ دقیقه دیگه" / timer durations — only when there is no clock time */
    if (d && !c) { return { at: new Date(now.getTime() + d.ms), used: d.used, ms: d.ms, rel: true }; }
    if (!c) {
      /* day-only ("tomorrow", "فردا") → 9:00 */
      var dd0 = dayShift(t, now);
      if (dd0 && dd0.found && intent !== "timer") { var a0 = new Date(now); a0.setDate(a0.getDate() + dd0.shift); a0.setHours(9, 0, 0, 0); return { at: a0, used: [dd0.word], defaultedTime: true }; }
      return null;
    }
    var h = c.h, mk = c.mark, base = new Date(now), ds = dayShift(t, now), explicitDay = !!(ds && ds.found);
    if (ds && ds.found) { base.setDate(base.getDate() + ds.shift); used.push(ds.word); }
    if (/^(tonight|امشب)$/.test(ds && ds.word || "") && !mk && h < 12) mk = "pm";
    if (mk) {
      if (/^(pm|p\.m\.|عصر|بعدازظهر|شب)$/.test(mk)) { if (/^(شب)$/.test(mk) && h === 12) h = 0; else if (h < 12) h += 12; }
      else if (/^(am|a\.m\.|صبح|بامداد)$/.test(mk)) { if (h === 12) h = 0; }
      else if (mk === "ظهر" || mk === "noon") { if (h <= 4) h += 12; }
      else if (mk === "mid" || /نیمهشب/.test(mk)) { h = 0; }
    }
    var at2 = new Date(base); at2.setSeconds(0, 0);
    if (!mk && h <= 12 && !explicitDay) {
      /* no am/pm: next time that clock reads h:mm */
      var c1 = new Date(base); c1.setHours(h % 12, c.m, 0, 0);
      var c2 = new Date(base); c2.setHours((h % 12) + 12, c.m, 0, 0);
      var cs = [c1, c2];
      if (h === 12) { cs = [new Date(base), new Date(base)]; cs[0].setHours(12, c.m, 0, 0); cs[1].setHours(24, c.m, 0, 0); }
      var best = null; cs.forEach(function (x) { if (x > now && (!best || x < best)) best = x; });
      if (!best) { best = cs[0]; best.setDate(best.getDate() + 1); }
      at2 = best;
    } else {
      at2.setHours(h, c.m, 0, 0);
      if (!explicitDay && at2 <= now) at2.setDate(at2.getDate() + 1);
    }
    used.push(c.used);
    return { at: at2, used: used };
  }
  function dayShift(t, now) {
    var m;
    if ((m = /(پس ?فردا|day after tomorrow)/.exec(t))) return { found: true, shift: 2, word: m[0] };
    if ((m = /(فردا|tomorrow)/.exec(t))) return { found: true, shift: 1, word: m[0] };
    if ((m = /(امشب|tonight)/.exec(t))) return { found: true, shift: 0, word: m[0] };
    if ((m = /(امروز|today)/.exec(t))) return { found: true, shift: 0, word: m[0] };
    for (var k in DAYS) {
      var r = new RegExp("(?:^|\\s)(?:on |روز )?" + k + "(?:\\s|$)").exec(t);
      if (r) { var diff = (DAYS[k] - now.getDay() + 7) % 7 || 7; return { found: true, shift: diff, word: k }; }
    }
    return null;
  }

  /* ───────── intents ───────── */
  var RX_TIMER = /\b(timer|countdown|stopwatch)\b|تایمر|زمان ?سنج|شمارش معکوس/i;
  var RX_ALARM = /\balarm\b|wake me|wake-me|wake up|آلارم|الارم|زنگ (?:بزن|بذار|بزار|تنظیم|ساعت)|بیدارم کن|بیدار کن|ساعت (?:رو|را) (?:کوک|تنظیم)/i;
  var RX_REMIND = /\bremind(?:er)?\b|don'?t (?:let me )?forget|یادآور|یاد آور|یادم (?:بنداز|بنداز|بیار|باشه|بنداز)|به ?یادم|یادم ?بنداز|یادم بیار|خبرم کن|بهم بگو|صدام کن|اطلاع بده|گوشزد/i;
  var RX_NOT = /\b(how|why|what|which|python|javascript|code|css|html|function|script|api|explain)\b|چطور|چگونه|چرا|چیست|کد |برنامه ?نویسی|توضیح بده|یعنی چی/i;
  function intent(t) { if (RX_TIMER.test(t)) return "timer"; if (RX_ALARM.test(t)) return "alarm"; if (RX_REMIND.test(t)) return "reminder"; return null; }

  function cleanLabel(raw, usedBits) {
    var s = norm(raw);
    usedBits.forEach(function (u) { if (u) s = s.replace(norm(u), " "); });
    s = s.replace(/\b(please|pls|can you|could you|would you|hey|set|make|create|add|put|start|an?|the|for me|me|to|that|about|of|in|at|on|by|my|for)\b/gi, " ")
      .replace(/\b(timer|alarm|reminder|remind|countdown)\b/gi, " ")
      .replace(/(^|\s)(لطفا|لطفاً|پلیز|برام|برایم|برای من|برای|یه|یک|تنظیم کن|تنظیم|بذار|بزار|بذارید|بزن|کن|کنی|میشه|میتونی|می ?تونی|رو|را|که|تا|به من|بهم|یادم بنداز|یادم بیار|یادآوری|یاد آوری|یادآور|آلارم|الارم|تایمر|زنگ|خبرم|دیگه|دیگر|بعد|بامداد|بنداز|بیار|باشه|ای)(?=\s|$)/g, " ")
      .replace(/\b\d+\s*$/g, " ")
      .replace(/[:\-–—.]+/g, " ").replace(/\s+/g, " ").trim();
    return s;
  }

  /* parse a typed/spoken sentence → {type,at,label,ms} or null (null = let the model handle it) */
  function parse(text, now) {
    var raw = String(text || ""); if (!raw || raw.length > 200) return null;
    var t = norm(raw).toLowerCase();
    if (/[?؟]\s*$/.test(raw.trim()) || RX_NOT.test(t)) return null;
    var it = intent(t); if (!it) return null;
    var w = when(t, now, it);
    if (!w) return { type: it, needTime: true };
    var type = it;
    if (it === "timer" && !w.rel) type = "alarm";
    if (it === "alarm" && w.rel) type = "alarm";
    var label = cleanLabel(raw, (w.used || []).concat(["نیم ساعت", "یک ربع", "half an hour"]));
    return { type: type, at: w.at, ms: w.rel ? w.ms : null, label: label, defaultedTime: !!w.defaultedTime };
  }

  /* ───────── store + engine ───────── */
  var S = [];
  function load() { try { S = JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { S = []; } var cut = Date.now() - 864e5; S = S.filter(function (x) { return !x.done || x.at > cut; }); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S.slice(-60))); } catch (e) { } }
  var uid = function () { return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };
  function fa(s) { return /[؀-ۿ]/.test(s || ""); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtClock(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fmtLeft(ms) {
    if (ms < 0) ms = 0; var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); s = s % 60;
    if (h >= 24) { var dd = Math.floor(h / 24); return dd + "d " + (h % 24) + "h"; }
    return h ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
  }
  function fmtWhen(d, now) {
    now = now || new Date(); var same = d.toDateString() === now.toDateString(), tm = new Date(now.getTime() + 864e5).toDateString() === d.toDateString();
    return (same ? "" : tm ? "tomorrow " : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + " ") + fmtClock(d);
  }
  function rel(ms) { var m = Math.round(ms / 60000); if (m < 1) return Math.round(ms / 1000) + "s"; if (m < 60) return m + " min"; var h = Math.floor(m / 60); return h + "h" + (m % 60 ? " " + (m % 60) + "m" : ""); }

  /* sound */
  var AC = null, ringTimer = null;
  function unlock() { try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; if (!AC) AC = new C(); if (AC.state === "suspended") AC.resume(); } catch (e) { } }
  ["pointerdown", "touchend", "keydown", "click"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  function beep(f, t0, dur) { try { var o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(AC.destination); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.start(t0); o.stop(t0 + dur + 0.05); } catch (e) { } }
  function pattern() { if (!AC) return; unlock(); var t = AC.currentTime + 0.05; beep(880, t, 0.16); beep(1175, t + 0.22, 0.16); beep(880, t + 0.44, 0.16); beep(1175, t + 0.66, 0.3); }
  function stopRing() { if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } var r = $("agh-ring"); if (r) r.classList.remove("on"); }

  /* UI */
  function css() {
    if ($("agh-css")) return; var s = document.createElement("style"); s.id = "agh-css";
    s.textContent =
      "#agh-dock,#agh-dock *,#agh-ring,#agh-ring *{box-sizing:border-box}#agh-dock{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 58px);transform:translateX(-50%);z-index:59990;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;max-width:92vw}" +
      ".agh-p{pointer-events:auto;display:flex;align-items:center;gap:9px;padding:7px 8px 7px 13px;border-radius:99px;background:rgba(14,12,9,.92);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid rgba(232,196,104,.42);color:#f3eee4;font:600 13px/1 -apple-system,'Inter Tight',sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);animation:aghin .45s cubic-bezier(.2,.9,.3,1)}" +
      ".agh-p i{font-style:normal;font-size:15px}.agh-p b{font-variant-numeric:tabular-nums;color:#E8C468;min-width:2.4em}.agh-p span{max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(243,238,228,.75);font-weight:500}" +
      ".agh-p button{width:24px;height:24px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-size:13px;line-height:1}" +
      ".agh-c{pointer-events:auto;border-radius:18px;background:rgba(14,12,9,.94);border:1px solid rgba(232,196,104,.5);padding:11px 14px;color:#f3eee4;font:600 14px/1.25 -apple-system,'Inter Tight',sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.5);display:flex;align-items:center;gap:12px;animation:aghin .45s cubic-bezier(.2,.9,.3,1)}" +
      ".agh-c small{display:block;font-weight:500;color:rgba(243,238,228,.6);margin-top:3px;font-size:12px}" +
      ".agh-c a,.agh-c .agh-b{flex:none;background:#E8C468;color:#15110a;border:0;border-radius:99px;padding:9px 15px;font:700 13px/1 -apple-system,'Inter Tight',sans-serif;text-decoration:none;cursor:pointer}" +
      ".agh-c .agh-x{background:rgba(255,255,255,.12);color:#fff;padding:9px 11px;border:0;border-radius:99px;font-size:13px;line-height:1}" +
      "@keyframes aghin{from{opacity:0;transform:translateY(-10px) scale(.96)}to{opacity:1;transform:none}}" +
      "#agh-ring{position:fixed;inset:0;z-index:60010;display:none;place-items:center;background:rgba(5,4,3,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}#agh-ring.on{display:grid}" +
      "#agh-ring .card{width:min(88vw,360px);border-radius:30px;padding:30px 24px 24px;text-align:center;background:linear-gradient(180deg,#1c1710,#0e0c09);border:1px solid rgba(232,196,104,.5);box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 80px rgba(232,196,104,.18);color:#f3eee4;font-family:-apple-system,'Inter Tight',sans-serif}" +
      "#agh-ring .ic{width:74px;height:74px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;font-size:34px;background:rgba(232,196,104,.14);animation:aghpulse 1s ease-in-out infinite}" +
      "@keyframes aghpulse{50%{transform:scale(1.12);box-shadow:0 0 0 14px rgba(232,196,104,.12)}}" +
      "#agh-ring h3{margin:0;font:700 24px/1.2 -apple-system,'Inter Tight',sans-serif;word-break:break-word}#agh-ring p{margin:8px 0 0;color:rgba(243,238,228,.6);font-size:14px}" +
      "#agh-ring .row{display:flex;gap:10px;margin-top:22px}#agh-ring button{flex:1;padding:14px 0;border-radius:99px;border:0;font:700 15px/1 -apple-system,'Inter Tight',sans-serif;cursor:pointer}" +
      "#agh-ring .stop{background:#E8C468;color:#15110a}#agh-ring .snz{background:rgba(255,255,255,.12);color:#fff}" +
      "@media(prefers-reduced-motion:reduce){.agh-p,.agh-c{animation:none}#agh-ring .ic{animation:none}}";
    document.head.appendChild(s);
    var dock = document.createElement("div"); dock.id = "agh-dock"; document.body.appendChild(dock);
    var ring = document.createElement("div"); ring.id = "agh-ring"; ring.setAttribute("role", "alertdialog");
    ring.innerHTML = '<div class="card"><div class="ic" id="agh-ic">⏰</div><h3 id="agh-rt"></h3><p id="agh-rs"></p><div class="row"><button class="snz" id="agh-snz">Snooze 5 min</button><button class="stop" id="agh-stop">Stop</button></div></div>';
    document.body.appendChild(ring);
    $("agh-stop").onclick = function () { ackRing(); };
    $("agh-snz").onclick = function () { snooze(); };
  }
  var ringing = null;
  function ICON(t) { return t === "timer" ? "⏱" : t === "alarm" ? "⏰" : "🔔"; }
  function paintDock() {
    if (!document.body) return; css(); var dock = $("agh-dock"); if (!dock) return;
    var live = S.filter(function (x) { return !x.done; }).sort(function (a, b) { return a.at - b.at; });
    var have = {}; [].slice.call(dock.querySelectorAll(".agh-p")).forEach(function (e) { have[e.getAttribute("data-id")] = e; });
    live.forEach(function (x) {
      var el = have[x.id];
      if (!el) { el = document.createElement("div"); el.className = "agh-p"; el.setAttribute("data-id", x.id); el.innerHTML = "<i>" + ICON(x.type) + "</i><b></b><span></span><button type='button' aria-label='Cancel'>✕</button>"; el.querySelector("button").onclick = function () { cancelId(x.id); }; dock.insertBefore(el, dock.querySelector(".agh-c")); }
      var left = x.at - Date.now();
      el.querySelector("b").textContent = left > 864e5 ? fmtWhen(new Date(x.at)) : left > 36e5 * 3 ? fmtClock(new Date(x.at)) : fmtLeft(left);
      el.querySelector("span").textContent = x.label || "";
      delete have[x.id];
    });
    Object.keys(have).forEach(function (k) { have[k].remove(); });
  }
  function card(text, sub, btnLabel, onTap, opt) {
    css(); var dock = $("agh-dock"); var olds = dock.querySelectorAll(".agh-c"); for (var oi = 0; oi < olds.length - 2; oi++) olds[oi].remove(); var c = document.createElement("div"); c.className = "agh-c";
    c.innerHTML = "<div style='flex:1;min-width:0'>" + esc(text) + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>";
    var b = document.createElement(opt && opt.href ? "a" : "button"); b.className = "agh-b"; b.textContent = btnLabel;
    if (opt && opt.href) { b.href = opt.href; if (opt.download) b.setAttribute("download", opt.download); if (opt.blank) { b.target = "_blank"; b.rel = "noopener"; } }
    b.onclick = function () { try { onTap && onTap(); } catch (e) { } setTimeout(function () { c.remove(); }, 400); };
    var x = document.createElement("button"); x.className = "agh-x"; x.textContent = "✕"; x.setAttribute("aria-label", "Dismiss"); x.onclick = function () { c.remove(); };
    c.appendChild(b); c.appendChild(x); dock.appendChild(c);
    setTimeout(function () { if (c.parentNode) c.remove(); }, (opt && opt.ttl) || 45000);
    return c;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function ics(x) {
    var d = new Date(x.at), e = new Date(x.at + 15 * 60000);
    function f(z) { return z.getFullYear() + pad(z.getMonth() + 1) + pad(z.getDate()) + "T" + pad(z.getHours()) + pad(z.getMinutes()) + "00"; }
    function esc2(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phraortes//EN", "BEGIN:VEVENT", "UID:" + x.id + "@phraortes", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), "DTSTART:" + f(d), "DTEND:" + f(e), "SUMMARY:" + esc2(x.label || (x.type === "alarm" ? "Alarm" : "Reminder")),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc2(x.label || "Phraortes"), "TRIGGER:PT0S", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
    return L.join("\r\n");
  }
  function calendarChip(x) {
    var url = URL.createObjectURL(new Blob([ics(x)], { type: "text/calendar" }));
    card(fa(x.label) ? "برای زنگ‌خوردن حتی با بسته‌بودن اپ" : "Make it ring even if the app is closed", fa(x.label) ? "به تقویم اضافه کن" : "Adds an event with an alert to your Calendar", fa(x.label) ? "افزودن" : "Add", null, { href: url, download: "phraortes-reminder.ics", ttl: 60000 });
  }

  function addItem(type, atMs, label, opt) {
    load(); var x = { id: uid(), type: type, at: atMs, label: label || "", done: false, ack: false };
    if ((type === "reminder" || type === "alarm") && typeof G("LIFE") !== "undefined" && window.LIFE) {
      try {
        var due = new Date(atMs), s = due.getFullYear() + "-" + pad(due.getMonth() + 1) + "-" + pad(due.getDate()) + " " + pad(due.getHours()) + ":" + pad(due.getMinutes());
        var e = window.LIFE.add({ text: label || (type === "alarm" ? "Alarm" : "Reminder"), kind: "reminder", due: s, src: "agent" });
        if (e) { x.lifeId = e.id; e.fired = true; }
        window.LIFE.askPermission && window.LIFE.askPermission();
      } catch (err) { }
    }
    S.push(x); save(); paintDock();
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch (e) { }
    unlock();
    if (!(opt && opt.noCalendar) && type !== "timer" || (type === "timer" && atMs - Date.now() > 20 * 60000)) calendarChip(x);
    return x;
  }
  function cancelId(id) {
    load(); var x = S.filter(function (y) { return y.id === id; })[0]; if (!x) return false; x.done = true; save();
    try { if (x.lifeId && window.LIFE) window.LIFE.all().forEach(function (e) { if (e.id === x.lifeId) e.done = true; }); } catch (e) { }
    paintDock(); return true;
  }
  function cancel(q) {
    load(); q = norm(q || "").toLowerCase(); var n = 0;
    S.filter(function (x) { return !x.done; }).forEach(function (x) {
      if (!q || /^(all|everything|همه|هر چی)$/.test(q) || (x.label || "").toLowerCase().indexOf(q) >= 0 || x.type === q || (q === "timers" && x.type === "timer") || (q === "alarms" && x.type === "alarm")) { cancelId(x.id); n++; }
    });
    return n;
  }
  function list() { load(); return S.filter(function (x) { return !x.done; }).sort(function (a, b) { return a.at - b.at; }); }

  function notify(x) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      var title = "Phraortes", opts = { body: x.label || (x.type === "timer" ? "Timer finished" : "Time!"), tag: x.id, requireInteraction: true };
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (r) { if (r && r.showNotification) r.showNotification(title, opts); else new Notification(title, opts); }).catch(function () { try { new Notification(title, opts); } catch (e) { } });
      else new Notification(title, opts);
    } catch (e) { }
  }
  function ring(id, missedMs) {
    load(); var x = S.filter(function (y) { return y.id === id; })[0]; if (!x || x.ack) return;
    css(); ringing = x; var late = missedMs && missedMs > 90000;
    $("agh-ic").textContent = ICON(x.type);
    $("agh-rt").textContent = x.label || (x.type === "timer" ? (fa(x.label) ? "تایمر تمام شد" : "Timer finished") : x.type === "alarm" ? "Alarm" : "Reminder");
    $("agh-rs").textContent = late ? "Missed · was due " + fmtClock(new Date(x.at)) : fmtClock(new Date(x.at));
    $("agh-snz").textContent = "Snooze 5 min"; $("agh-ring").classList.add("on");
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 500]); } catch (e) { }
    if (document.hidden || late) notify(x);
    stopLoop(); var n = 0, max = late ? 3 : 24; pattern();
    ringTimer = setInterval(function () { if (++n >= max) { stopLoop(); return; } pattern(); try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) { } }, 1500);
    try { var h = G("haptic"); h && h("success"); } catch (e) { }
  }
  function stopLoop() { if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } }
  function ackRing() {
    stopLoop(); var r = $("agh-ring"); if (r) r.classList.remove("on");
    if (ringing) { load(); var x = S.filter(function (y) { return y.id === ringing.id; })[0]; if (x) { x.done = true; x.ack = true; save(); try { if (x.lifeId && window.LIFE) window.LIFE.all().forEach(function (e) { if (e.id === x.lifeId) e.done = true; }); } catch (e) { } } ringing = null; paintDock(); }
  }
  function snooze() {
    var x = ringing; stopLoop(); var r = $("agh-ring"); if (r) r.classList.remove("on");
    if (x) { load(); var y = S.filter(function (z) { return z.id === x.id; })[0]; if (y) { y.at = Date.now() + 5 * 60000; y.done = false; y.ack = false; save(); } ringing = null; paintDock(); try { window.showToast && window.showToast("Snoozed for 5 minutes"); } catch (e) { } }
  }
  function tick() {
    var now = Date.now(); load(); var due = S.filter(function (x) { return !x.done && x.at <= now && !x.ack; });
    if (due.length && !ringing) { var x = due.sort(function (a, b) { return a.at - b.at; })[0]; ring(x.id, now - x.at); }
    paintDock();
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
  window.addEventListener("pageshow", tick);
  window.addEventListener("focus", tick);

  /* ───────── phone actions (tap-to-open: iOS needs a user tap to leave the page) ───────── */
  var APPS = {
    whatsapp: ["whatsapp://", "WhatsApp", /واتس ?اپ|whatsapp/i], telegram: ["tg://", "Telegram", /تلگرام|telegram/i], instagram: ["instagram://app", "Instagram", /اینستا(?:گرام)?|instagram/i],
    youtube: ["youtube://", "YouTube", /یوتیوب|youtube/i], spotify: ["spotify://", "Spotify", /اسپاتیفای|spotify/i], maps: ["maps://", "Maps", /^(?:maps|apple maps|گوگل ?مپ|مپ)$/i],
    music: ["music://", "Music", /^(?:apple )?music$|موزیک اپل/i], messages: ["sms:", "Messages", /^messages$|پیام ?ها|پیامک/i], phone: ["tel:", "Phone", /^phone$|^dialer$|شماره ?گیر/i], mail: ["message://", "Mail", /^(?:mail|email)$|ایمیل|میل/i],
    facetime: ["facetime://", "FaceTime", /facetime|فیس ?تایم/i], calendar: ["calshow://", "Calendar", /^calendar$|تقویم/i], reminders: ["x-apple-reminderkit://", "Reminders", /^reminders$|ریمایندر/i],
    notes: ["mobilenotes://", "Notes", /^notes$|یادداشت/i], shortcuts: ["shortcuts://", "Shortcuts", /shortcuts|میانبر/i], files: ["shareddocuments://", "Files", /^files$|فایل ?ها$/i], twitter: ["twitter://", "X", /^(?:x|twitter)$|توییتر/i],
    linkedin: ["linkedin://", "LinkedIn", /linkedin|لینکدین/i], snapchat: ["snapchat://", "Snapchat", /snapchat|اسنپ ?چت/i], settings: ["app-settings:", "App settings", /^settings$/i]
  };
  function findApp(n) { n = norm(n || "").toLowerCase().replace(/^(the|my|app)\s+/, "").trim(); for (var k in APPS) { if (k === n || APPS[k][2].test(n)) return k; } return null; }
  function chip(label, sub, href, btn, blank) { card(label, sub, btn || "Open", null, { href: href, blank: !!blank, ttl: 60000 }); return "Showed a tap button: " + label + " — the user must tap it (iOS only allows leaving the app on a tap)."; }
  var P = {};
  P.open_app = function (a) {
    var k = findApp(a.name || a.app || a.value); if (!k) return "Unknown app \"" + (a.name || a.app || a.value) + "\". Known: " + Object.keys(APPS).join(", ") + ". Use open_url for a web address.";
    return chip("Open " + APPS[k][1], "", APPS[k][0], "Open");
  };
  P.open_url = function (a) { var u = String(a.url || a.value || ""); if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u; if (/^(javascript|data|file|blob):/i.test(u)) return "Blocked that link type."; return chip("Open link", u.replace(/^https?:\/\//, "").slice(0, 60), u, "Open", /^https?:/i.test(u)); };
  P.call = function (a) { var n = String(a.number || a.value || a.to || "").replace(/[^\d+*#]/g, ""); if (n.length < 3) return "Need a phone number (digits)."; return chip("Call " + n, "", "tel:" + n, "Call"); };
  P.sms = function (a) { var n = String(a.number || a.to || "").replace(/[^\d+]/g, ""), b = String(a.text || a.body || a.value || ""); return chip("Text " + (n || "someone"), b.slice(0, 60), "sms:" + n + (b ? "&body=" + encodeURIComponent(b) : ""), "Open Messages"); };
  P.mail = function (a) { var to = String(a.to || a.value || "").trim(); return chip("Email " + (to || "draft"), String(a.subject || "").slice(0, 60), "mailto:" + encodeURIComponent(to).replace(/%40/g, "@") + "?subject=" + encodeURIComponent(a.subject || "") + "&body=" + encodeURIComponent(a.text || a.body || ""), "Open Mail"); };
  P.map = function (a) { var q = String(a.query || a.place || a.value || ""); if (!q) return "Need a place."; return chip("Map: " + q, "", "https://maps.apple.com/?q=" + encodeURIComponent(q), "Open Maps", true); };
  P.directions = function (a) { var q = String(a.to || a.query || a.value || ""); if (!q) return "Need a destination."; return chip("Directions: " + q, "", "https://maps.apple.com/?daddr=" + encodeURIComponent(q), "Go", true); };
  P.whatsapp = function (a) { var n = String(a.number || "").replace(/[^\d]/g, ""), b = String(a.text || a.value || ""); return chip("WhatsApp" + (n ? " " + n : ""), b.slice(0, 60), "https://wa.me/" + n + (b ? "?text=" + encodeURIComponent(b) : ""), "Open", true); };
  P.telegram = function (a) { var u = String(a.username || a.value || "").replace(/^@/, ""); return chip("Telegram" + (u ? " @" + u : ""), "", u ? "https://t.me/" + u : "tg://", "Open", !!u); };
  P.search_web = function (a) { var q = String(a.query || a.value || ""); return chip("Search: " + q, "", "https://www.google.com/search?q=" + encodeURIComponent(q), "Search", true); };
  P.shortcut = function (a) { var n = String(a.name || a.value || ""); if (!n) return "Need the Shortcut's name."; return chip("Run Shortcut “" + n + "”", a.input ? String(a.input).slice(0, 60) : "", "shortcuts://run-shortcut?name=" + encodeURIComponent(n) + (a.input ? "&input=text&text=" + encodeURIComponent(a.input) : ""), "Run"); };
  P.copy = function (a) { var t = String(a.text || a.value || ""); if (!t) return "Nothing to copy."; card("Copy text", t.slice(0, 70), "Copy", function () { try { navigator.clipboard.writeText(t); } catch (e) { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (_) { } ta.remove(); } try { window.showToast && window.showToast("Copied", "success"); } catch (_) { } }, { ttl: 60000 }); return "Showed a Copy button — the user must tap it."; };
  P.share = function (a) { var t = String(a.text || a.value || ""), u = a.url || ""; return (function () { card("Share", t.slice(0, 70), "Share", function () { if (navigator.share) navigator.share({ text: t, url: u || undefined }).catch(function () { }); else if (navigator.clipboard) navigator.clipboard.writeText(t + (u ? " " + u : "")); }, { ttl: 60000 }); return "Showed a Share button."; })(); };
  P.calendar_event = function (a) {
    var w = when(String(a.start || a.when || ""), new Date(), "alarm"); if (!w) return "Could not read the start time. Use YYYY-MM-DD HH:MM."; var x = { id: uid(), type: "alarm", at: w.at.getTime(), label: String(a.title || a.text || "Event") };
    calendarChip(x); return "Showed an Add-to-Calendar button for " + x.label + " at " + fmtWhen(w.at) + ".";
  };

  /* ───────── the verbs the rest of the app calls ───────── */
  function setTimer(ms, label) { var x = addItem("timer", Date.now() + ms, label); return x; }
  function msgSet(x) {
    var d = new Date(x.at), r = rel(x.at - Date.now());
    if (x.type === "timer") return (fa(x.label) ? "تایمر " : "Timer ") + r + (x.label ? " · " + x.label : "") + " ✓";
    return (x.type === "alarm" ? "⏰ " : "🔔 ") + fmtWhen(d) + (x.label ? " · " + x.label : "") + " ✓";
  }
  function run(text, now) {
    var p = parse(text, now); if (!p) return null; var faT = fa(text);
    if (p.needTime) return null;
    var label = p.label; if (!label) label = p.type === "timer" ? "" : (faT ? (p.type === "alarm" ? "آلارم" : "یادآوری") : (p.type === "alarm" ? "Alarm" : "Reminder"));
    var x = p.type === "timer" ? setTimer(p.ms, label) : addItem(p.type, p.at.getTime(), label);
    return msgSet(x);
  }

  /* AI tool entry points */
  function tool(name, a) {
    a = a || {};
    if (name === "set_timer") {
      var ms = (+a.seconds || 0) * 1000 + (+a.minutes || 0) * 60000 + (+a.hours || 0) * 3600000; if (!ms && a.duration) { var d = duration(norm(a.duration).toLowerCase()); if (d) ms = d.ms; }
      if (!ms || ms < 1000 || ms > 7 * 864e5) return "Error: give a duration between 1 second and 7 days (minutes, seconds or hours).";
      var x = setTimer(ms, String(a.label || a.text || "")); return "Timer set: " + rel(ms) + (x.label ? " (" + x.label + ")" : "") + ". It rings while the app is open; a notification is sent if the app is in the background and notifications are allowed.";
    }
    if (name === "set_reminder") {
      var text = String(a.text || a.label || "").trim(), at = null;
      if (a.minutes != null && isFinite(+a.minutes)) at = new Date(Date.now() + (+a.minutes) * 60000);
      else if (a.when) { var w = when(String(a.when), new Date(), "alarm"); at = w && w.at; }
      if (!at || isNaN(at)) return "Error: could not read the time. Pass when as \"YYYY-MM-DD HH:MM\" (the user's local time) or minutes from now.";
      if (at.getTime() < Date.now() - 30000) return "Error: that time is in the past. Check the current local time and try again.";
      var kind = a.kind === "alarm" ? "alarm" : "reminder"; var y = addItem(kind, at.getTime(), text || (kind === "alarm" ? "Alarm" : "Reminder"));
      return (kind === "alarm" ? "Alarm" : "Reminder") + " set for " + fmtWhen(at) + " (in " + rel(at.getTime() - Date.now()) + "): " + y.label + ". It rings while Phraortes is open, and a Calendar button was shown so the user can make it ring even when the app is closed — tell them to tap it.";
    }
    if (name === "phone_action") {
      var ty = String(a.type || "").toLowerCase().replace(/[\s-]+/g, "_"); var args = Object.assign({}, a); delete args.type;
      if (ty === "list_reminders") return listText();
      if (ty === "cancel") { var n = cancel(a.query || a.value); return n ? "Cancelled " + n + " item(s)." : "Nothing matched."; }
      if (!P[ty]) return "Unknown phone action. Types: " + Object.keys(P).join(", ") + ", list_reminders, cancel.";
      return P[ty](args);
    }
    return "Unknown tool.";
  }
  function listText() {
    var L = list(); var out = L.map(function (x) { return "- " + ICON(x.type) + " " + fmtWhen(new Date(x.at)) + " (" + rel(x.at - Date.now()) + ") " + (x.label || ""); });
    try { if (window.LIFE) window.LIFE.all().filter(function (e) { return e.due && !e.done && !L.some(function (x) { return x.lifeId === e.id; }); }).slice(0, 8).forEach(function (e) { out.push("- 🔔 " + fmtWhen(new Date(e.due)) + " " + e.t); }); } catch (e) { }
    return out.length ? out.join("\n") : "No active timers or reminders.";
  }

  /* ───────── wire into PHR_AGENT (typed text, voice, prompt, app_do actions) ───────── */
  var TRY_OPEN = /^(?:please |لطفا )?(?:open|launch|go to|start)\s+(.+)$|^(.+?)\s*(?:رو|را)?\s*(?:باز کن|بازش کن|اجرا کن)$/;
  function typedExtra(text) {
    var t = norm(text).toLowerCase(); if (!t || t.length > 90) return null;
    var m = TRY_OPEN.exec(t); if (m) { var k = findApp(m[1] || m[2]); if (k) { P.open_app({ name: k }); return fa(text) ? "دکمهٔ باز کردن " + APPS[k][1] + " را بزن" : "Tap Open to launch " + APPS[k][1]; } }
    if (/^(?:cancel|stop|delete|clear|remove|کنسل|لغو|پاک)\s*(?:all|my|the)?\s*(timers?|alarms?|reminders?|تایمر|آلارم|الارم|یادآور|همه)/.test(t) || /(تایمر|آلارم|الارم|یادآوری)\s*(?:ها)?\s*(?:رو|را)?\s*(?:کنسل|لغو|پاک)/.test(t)) { var n = cancel(""); return n ? (fa(text) ? n + " مورد لغو شد" : "Cancelled " + n) : (fa(text) ? "چیزی فعال نبود" : "Nothing was active"); }
    if (/^(?:list|show)\s*(?:my )?(?:timers?|alarms?|reminders?)|(?:تایمر|آلارم|یادآوری)(?:ها)?\s*(?:ام|هام|هامو)?\s*(?:رو|را)?\s*(?:نشون بده|ببینم|لیست)/.test(t)) { paintDock(); return list().length ? list().length + (fa(text) ? " مورد فعال بالا نشان داده شد" : " active — shown at the top") : (fa(text) ? "چیزی فعال نیست" : "Nothing active"); }
    return null;
  }
  function install() {
    var A = window.PHR_AGENT; if (!A || A.__hands) return false; A.__hands = true;
    var oldTyped = A.typed, oldVoice = A.voice, oldPrompt = A.prompt;
    A.typed = function (t) { var r = null; try { r = run(t) || typedExtra(t); } catch (e) { r = null; } return r || oldTyped(t); };
    A.voice = function (t, quiet) {
      var r = null; try { r = run(t) || typedExtra(t); } catch (e) { r = null; }
      if (r) { if (quiet) return r; try { G("auraSetCaption")(r, "hint"); G("auraSpeak")(r.replace(/[✓⏰🔔⏱·]/g, "")); } catch (e) { } return true; }
      return oldVoice(t, quiet);
    };
    var HANDS_RE = /remind|timer|alarm|wake|schedule|countdown|call|text |sms|whatsapp|telegram|instagram|email|mail|map|directions|navigate|open |share|copy|shortcut|calendar|یادآور|یادم|تایمر|آلارم|الارم|زنگ|ساعت|بیدار|فردا|امشب|دقیقه|تماس|پیامک|واتس|تلگرام|ایمیل|نقشه|مسیر|باز کن|اشتراک|کپی|میانبر|تقویم/i;
    A.prompt = function (text) {
      var base = oldPrompt(text);
      if (HANDS_RE.test(String(text || "")) || window.__auraActive) {
        var n = new Date();
        base += "\n\nREAL-WORLD TOOLS (you can really do these): set_reminder, set_timer and phone_action. CURRENT LOCAL TIME: " + n.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " (" + (Intl.DateTimeFormat().resolvedOptions().timeZone || "local") + "). "
          + "When the user wants a reminder, alarm or timer, CALL the tool — never say you did it without calling. Compute the exact local time yourself from the current time above and pass when as \"YYYY-MM-DD HH:MM\" (or minutes from now). 'at 5' with no am/pm means the next 5 o'clock. "
          + "For calls, SMS, email, maps, WhatsApp, Telegram, apps, Shortcuts or links, call phone_action: the user then taps the button it shows (iOS needs a tap). Reminders and timers ring while the app is open; the Calendar button makes alarms work with the app closed. After the tool result, confirm in ONE short sentence in the user's language and mention the Calendar/tap button if shown. Never claim you can do something the tools above cannot.";
      }
      return base;
    };
    var X = {
      timer: function (a) { return tool("set_timer", a); }, set_timer: function (a) { return tool("set_timer", a); },
      reminder: function (a) { return tool("set_reminder", a); }, set_reminder: function (a) { return tool("set_reminder", a); }, alarm: function (a) { return tool("set_reminder", Object.assign({ kind: "alarm" }, a)); },
      list_reminders: function () { return listText(); }, list_timers: function () { return listText(); }, cancel_reminder: function (a) { var n = cancel(a && (a.query || a.value)); return n ? "Cancelled " + n + "." : "Nothing matched."; }, cancel_timer: function (a) { var n = cancel(a && (a.query || a.value)); return n ? "Cancelled " + n + "." : "Nothing matched."; },
      stop_ringing: function () { ackRing(); return "Stopped."; }
    };
    Object.keys(P).forEach(function (k) { X[k] = function (a) { return P[k](a || {}); }; });
    A.extend(X);
    var oldHelp = A.actions.help; A.actions.help = function () { return oldHelp() + " Real-world: timer{minutes|seconds,label}, reminder{text,when|minutes}, alarm{text,when}, list_reminders, cancel_reminder{query}, open_app{name}, open_url{url}, call{number}, sms{number,text}, mail{to,subject,text}, map{query}, directions{to}, whatsapp{number,text}, telegram{username}, shortcut{name,input}, copy{text}, share{text}, calendar_event{title,start}."; };
    return true;
  }
  var tries = 0; (function wait() { if (install()) return; if (++tries < 80) setTimeout(wait, 150); })();

  load(); if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { paintDock(); }); else paintDock();
  setInterval(tick, 1000); setTimeout(tick, 800);

  window.PHR_HANDS = { parse: parse, when: when, run: run, tool: tool, list: list, cancel: cancel, ring: ring, ack: ackRing, _norm: norm, _dur: duration, _clock: clock };
})();
