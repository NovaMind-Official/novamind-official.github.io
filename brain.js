/* Phraortes — agent brain (brain.js)
   voice memory · routines · device picker (photos/camera/files) · mission-done alerts */
(function () {
  "use strict";
  var W = window, D = document;
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null };
  function norm(t) {
    return String(t || "").toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d) }).replace(/[‌]/g, " ").replace(/\s+/g, " ").trim();
  }
  function fa(t) { return /[؀-ۿ]/.test(t) }
  function L(t, en, faT) { return fa(t) ? faT : en }
  function card(text, sub, btn, fn, opt) { try { W.PHR_HANDS && PHR_HANDS.card(text, sub, btn, fn, opt) } catch (e) { } }

  /* ───────── 1 · voice memory ───────── */
  var TIMEY = /ساعت|فردا|امروز|دقیقه|ثانیه|یادآور|یادم بنداز|remind|tomorrow|today|\bat \d|minutes?|timer|alarm|تایمر|آلارم/;
  var STOP_W = /^(the|a|an|my|is|was|what|whats|what's|do|you|i|me|of|to|که|را|رو|من|ام|م|چی|چیه|بود|کی|کجا|چند|یادته|یادت|هست|این|اون)$/;
  function toks(s) { return norm(s).replace(/[.,!?؟،:;"'«»()]/g, " ").split(" ").filter(function (w) { return w.length > 1 && !STOP_W.test(w) }) }
  function items() { try { return (W.LIFE && LIFE.all && LIFE.all()) || [] } catch (e) { return [] } }
  function recall(q) {
    var qt = toks(q); if (!qt.length) return null; var best = null, bs = 0;
    items().forEach(function (it) {
      var txt = norm(it.text || it.t || ""), s = 0;
      qt.forEach(function (w) { if (txt.indexOf(w) >= 0) s++ });
      var sc = s / qt.length; if (s && sc > bs) { bs = sc; best = it }
    });
    return bs >= .5 ? best : null;
  }
  function memory(raw) {
    var t = norm(raw), m;
    if (!W.LIFE) return false;
    if ((m = /^(?:please )?(?:remember|keep in mind|note down|note|save)(?: that| this)?[:,]? (.+)$/.exec(t)) || (m = /^(?:یادت باشه|یادت بمونه|بخاطر بسپار|به خاطر بسپار|به یاد بسپار|یاد بگیر|ذخیره کن)\s*(?:که)?\s*[:،]?\s*(.+)$/.exec(t))) {
      if (TIMEY.test(m[1]) && /remind|یادآور|یادم/.test(t)) return false;
      var e = null; try { e = LIFE.add({ text: m[1].trim(), kind: "fact", src: "voice" }) } catch (x) { }
      return e ? L(t, "Got it, I'll remember that.", "باشه، یادم می‌مونه.") : false;
    }
    if ((m = /^(?:forget|delete)(?: that| about)? (.+)$/.exec(t)) || (m = /^(.+?)(?: رو| را)? (?:فراموش کن|پاک کن از حافظه)$/.exec(t)) || (m = /^فراموش کن\s*(.+)$/.exec(t))) {
      if (/chat|history|تاریخچه|چت|همه|everything|all|board|تخته/.test(m[1])) return false;
      var n = 0; try { n = LIFE.forget(m[1]) } catch (x) { }
      return n ? L(t, "Forgotten.", "فراموش شد.") : false;
    }
    if (/^(?:what do you (?:remember|know about me)|what have i told you|چی یادته|چه چیزایی یادته|چی ازم یادته)\??$/.test(t.replace(/[؟?]/g, ""))) {
      var all = items().filter(function (i) { return i.kind !== "reminder" }); if (!all.length) return L(t, "I don't have anything saved yet.", "هنوز چیزی ذخیره نکردم.");
      return L(t, "I remember " + all.length + " things. Latest: " + all.slice(-3).map(function (i) { return i.text }).join("; "), all.length + " مورد یادمه. آخری‌ها: " + all.slice(-3).map(function (i) { return i.text }).join("؛ "));
    }
    var q = null;
    if ((m = /^(?:what(?:'s| is| was| are| were)? (?:my|our|the) (.+)|do you remember (.+)|what did i (?:say|tell you) about (.+))$/.exec(t.replace(/[?؟]$/, "")))) q = m[1] || m[2] || m[3];
    else if ((m = /^(.+?) (?:چی بود|چیه|چند بود|کی بود|کجا بود|چی هست|چه بود)$/.exec(t.replace(/[?؟]$/, "")))) q = m[1];
    else if ((m = /^(?:یادته|یادت هست) (.+)$/.exec(t.replace(/[?؟]$/, "")))) q = m[1];
    if (q) { var hit = recall(q); if (hit) return hit.text }
    return false;
  }

  /* ───────── 2 · routines ───────── */
  function routines() { try { return JSON.parse(LS("phr_routines_v1") || "[]") } catch (e) { return [] } }
  function saveR(a) { LS("phr_routines_v1", JSON.stringify(a)) }
  function splitSteps(s) { return s.split(/\s*(?:,|،|;|؛|\bthen\b|\band then\b|\bafter that\b|\band\b|و بعد|بعدش|سپس|بعد از اون|بعد)\s*/).map(function (x) { return x.trim() }).filter(Boolean) }
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms) }) };
  function findR(t) {
    var best = null, bl = 0; routines().forEach(function (r) { var n = norm(r.name); if (n.length >= 2 && t.indexOf(n) >= 0 && n.length > bl) { best = r; bl = n.length } }); return best;
  }
  function runRoutine(r) {
    var A = W.PHR_AGENT; if (!A) return;
    (async function () {
      for (var i = 0; i < r.steps.length; i++) {
        var st = r.steps[i], ok = false;
        try { ok = !!A.typed(st) } catch (e) { }
        if (!ok && i === r.steps.length - 1 && typeof W.PHR_sendText === "function" && !(W.PHR_busy && PHR_busy())) { try { PHR_sendText(st) } catch (e) { } }
        await sleep(900);
      }
    })();
  }
  function icsDaily(name, hh, mm) {
    var d = new Date(); d.setHours(hh, mm, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1);
    var z = function (n) { return (n < 10 ? "0" : "") + n }, f = function (x) { return x.getFullYear() + z(x.getMonth() + 1) + z(x.getDate()) + "T" + z(x.getHours()) + z(x.getMinutes()) + "00" };
    var l = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phraortes//EN", "BEGIN:VEVENT", "UID:r" + Date.now() + "@phraortes", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), "DTSTART:" + f(d), "DURATION:PT10M", "RRULE:FREQ=DAILY", "SUMMARY:Phraortes — " + name, "DESCRIPTION:Open Phraortes and say the routine name.", "BEGIN:VALARM", "TRIGGER:PT0S", "ACTION:DISPLAY", "DESCRIPTION:" + name, "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
    return URL.createObjectURL(new Blob([l.join("\r\n")], { type: "text/calendar" }));
  }
  function routine(raw) {
    var t = norm(raw), m;
    /* create */
    if ((m = /^(?:create|make|save|add|new)(?: a| my)? routine(?: called| named)? (.+?)\s*(?::|—| - |that does|to do|which does| with)\s*(.+)$/.exec(t)) || (m = /^روتین (.+?)(?: رو| را)? (?:بساز|درست کن|تعریف کن|ذخیره کن)\s*[:،]?\s*(.+)$/.exec(t))) {
      var steps = splitSteps(m[2]); if (!steps.length) return false;
      var a = routines().filter(function (r) { return norm(r.name) !== norm(m[1]) }); a.push({ name: m[1].trim(), steps: steps, at: Date.now() }); saveR(a);
      return L(t, "Routine “" + m[1] + "” saved with " + steps.length + " steps. Just say its name to run it.", "روتین «" + m[1] + "» با " + steps.length + " مرحله ذخیره شد. هر وقت اسمش رو بگی اجرا می‌شه.");
    }
    /* list */
    if (/^(?:list|show|what are)(?: my)? routines|^روتین(?: |‌)?هام(?: چیه| چیا هستن| رو نشون بده)?|^روتین(?: |‌)?هامو? نشون بده/.test(t)) {
      var r = routines(); if (!r.length) return L(t, "You have no routines yet. Say: create routine study mode: timer 25 minutes, dark mode.", "هنوز روتینی نداری. بگو: روتین حالت مطالعه بساز: تایمر ۲۵ دقیقه، تم تاریک");
      return r.map(function (x) { return x.name + " (" + x.steps.length + ")" }).join(" · ");
    }
    /* delete */
    if ((m = /^(?:delete|remove)(?: the)? routine (.+)$/.exec(t)) || (m = /^روتین (.+?)(?: رو| را)? (?:حذف کن|پاک کن)$/.exec(t))) {
      var before = routines(), keep = before.filter(function (r) { return norm(r.name) !== norm(m[1]) }); saveR(keep);
      return keep.length < before.length ? L(t, "Routine deleted.", "روتین حذف شد.") : false;
    }
    /* daily schedule */
    if (/(?:every ?day|daily|each morning|every morning|هر روز|هر صبح|هر شب|روزانه)/.test(t)) {
      var rr = findR(t); if (rr && W.PHR_HANDS) {
        var p = null; try { p = PHR_HANDS.parse(t.replace(/every ?day|daily|each morning|every morning|هر روز|هر صبح|هر شب|روزانه/g, " "), new Date()) } catch (e) { }
        if (p && p.at) {
          var d = new Date(p.at), url = icsDaily(rr.name, d.getHours(), d.getMinutes());
          card(L(t, "Daily at ", "هر روز ساعت ") + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + " · " + rr.name, L(t, "Adds a repeating alarm to Calendar", "یه آلارم تکرارشونده به تقویم اضافه می‌کنه"), L(t, "Add to Calendar", "افزودن به تقویم"), null, { href: url, download: "phraortes-routine.ics", ttl: 90000 });
          return L(t, "I can't run it by myself in the background, but tap the button to get a daily alarm at that time. Then say “" + rr.name + "”.", "تو پس‌زمینه خودم اجرا نمی‌شم، ولی دکمه رو بزن تا هر روز همون ساعت یه آلارم داشته باشی. بعد فقط بگو «" + rr.name + "».");
        }
      }
    }
    /* run */
    var run = null;
    if ((m = /^(?:run|start|do|activate|launch|begin)(?: my| the)? (.+?)(?: routine)?$/.exec(t)) || (m = /^(?:اجرا کن|فعال کن|شروع کن|روتین)\s+(.+?)(?: رو| را)?(?: اجرا کن| فعال کن)?$/.exec(t))) run = findR(norm(m[1]));
    if (!run) { var f = findR(t); if (f && t.split(" ").length <= norm(f.name).split(" ").length + 3) run = f }
    if (run) { runRoutine(run); return L(t, "Starting " + run.name + ".", "«" + run.name + "» شروع شد.") }
    return false;
  }

  /* ───────── 4 · device picker (photos / camera / files) ───────── */
  var RX_DEV = /(?:open|show|pick|choose|select|grab|get|take|use)(?: me)?(?: a| an| my| the| some)? (photos?|pictures?|pics?|gallery|photo library|camera|files?|documents?|screenshot)|(?:(عکس(?: ?ها| ?هام)?|عکسام|تصاویر|گالری|دوربین|فایل(?: ?ها| ?هام)?|اسکرین ?شات|مدرک)(?: رو| را)? (?:باز کن|نشون بده|انتخاب کن|بیار|بزن|بده|بگیر))|عکس بگیر|(?:یه|یک) عکس (?:انتخاب کن|بیار)/;
  var RX_INSTR = /(?:then |and |و |بعد |سپس |تا |که )?((?:analy[sz]e|describe|explain|solve|summari[sz]e|translate|read|extract|check|tell me|what(?:'s| is)|identify|review|grade|تحلیل|توضیح|حل|خلاصه|ترجمه|بخون|استخراج|چک کن|بررسی|چی هست|چیه|بگو).*)$/;
  var pending = null;
  function pickerUI() {
    var o = D.getElementById("br-pick"); if (o) return o;
    var s = D.createElement("style"); s.textContent = "#br-pick{position:fixed;inset:0;z-index:9500;display:none;align-items:flex-end;justify-content:center;background:rgba(6,5,3,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:-apple-system,system-ui,sans-serif}#br-pick.on{display:flex}#br-pick .p{width:min(480px,100%);padding:22px 18px calc(22px + env(safe-area-inset-bottom));border-radius:28px 28px 0 0;background:#14110b;border:1px solid rgba(212,168,75,.3);color:#f3e3b4}#br-pick h3{margin:0 0 4px;font-size:18px}#br-pick small{display:block;margin:0 0 16px;opacity:.65;font-size:13px;line-height:1.5}#br-pick label,#br-pick .x{display:flex;align-items:center;gap:12px;padding:16px 18px;margin-top:10px;border-radius:18px;background:rgba(212,168,75,.1);border:1px solid rgba(212,168,75,.35);font-weight:600;font-size:16px;cursor:pointer}#br-pick .x{justify-content:center;background:none;border-color:rgba(255,255,255,.14);color:#c9c2ae;font-weight:500}#br-pick input{display:none}";
    D.head.appendChild(s);
    o = D.createElement("div"); o.id = "br-pick"; o.innerHTML = '<div class="p"><h3 id="br-t"></h3><small id="br-s"></small><label>🖼 <span id="br-l1"></span><input type="file" id="br-in1" accept="image/*" multiple></label><label>📷 <span id="br-l2"></span><input type="file" id="br-in2" accept="image/*" capture="environment"></label><label>📄 <span id="br-l3"></span><input type="file" id="br-in3" multiple></label><div class="x" id="br-x"></div></div>';
    D.body.appendChild(o);
    function got(e) {
      var files = e.target.files; if (!files || !files.length) return; o.classList.remove("on");
      try { handleFiles({ target: { files: files } }) } catch (x) { return }
      var instr = pending; pending = null;
      if (instr) { var n = files.length, tries = 0; (function w() { var have = (typeof attachedFiles !== "undefined") ? attachedFiles.length : n; if (have >= n || tries++ > 30) { setTimeout(function () { try { PHR_sendText(instr) } catch (x) { } }, 250) } else setTimeout(w, 200) })() }
      e.target.value = "";
    }
    ["br-in1", "br-in2", "br-in3"].forEach(function (id) { o.querySelector("#" + id).addEventListener("change", got) });
    o.querySelector("#br-x").addEventListener("click", function () { o.classList.remove("on"); pending = null });
    o.addEventListener("click", function (e) { if (e.target === o) { o.classList.remove("on"); pending = null } });
    return o;
  }
  function device(raw) {
    var t = norm(raw); if (!RX_DEV.test(t)) return false;
    if (typeof handleFiles !== "function") return false;
    var m = RX_INSTR.exec(t), instr = m ? m[1].trim() : null;
    pending = instr && instr.length > 3 ? instr : null;
    var o = pickerUI(), F = fa(t);
    o.querySelector("#br-t").textContent = F ? "چی بیارم؟" : "What should I bring in?";
    o.querySelector("#br-s").textContent = F ? "iOS اجازه نمی‌ده خودم توی عکس‌هات بگردم؛ یه لمس تو انتخاب می‌کنه، بقیه‌ش با منه." + (pending ? " بعد از انتخاب، کارت رو انجام می‌دم." : "") : "iOS doesn't let a web app browse your photos on its own. One tap from you picks it; I do the rest." + (pending ? " Then I'll do what you asked." : "");
    o.querySelector("#br-l1").textContent = F ? "کتابخانه‌ی عکس" : "Photo library"; o.querySelector("#br-l2").textContent = F ? "عکس بگیر" : "Take a photo"; o.querySelector("#br-l3").textContent = F ? "فایل‌ها" : "Files"; o.querySelector("#br-x").textContent = F ? "بیخیال" : "Cancel";
    o.classList.add("on");
    return F ? "یه لمس بزن و انتخاب کن." : "Tap to choose.";
  }

  /* ───────── 6 · mission done ───────── */
  function notify(title, body) {
    try {
      if (!("Notification" in W) || Notification.permission !== "granted") return false;
      if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(title, { body: body, icon: "icon-192.png", tag: "phr-mission" }) });
      else new Notification(title, { body: body });
      return true;
    } catch (e) { return false }
  }
  function missionDone(title) {
    var F = fa(title || "");
    if (D.hidden && notify(F ? "ماموریت تموم شد" : "Mission complete", title || "")) return;
    card(F ? "✓ ماموریت تموم شد" : "✓ Mission complete", title || "", F ? "ببین" : "View", null, { ttl: 30000 });
    try { navigator.vibrate && navigator.vibrate([30, 40, 30]) } catch (e) { }
  }
  function notifyCmd(raw) {
    var t = norm(raw);
    if (!/(enable|turn on|allow)(?: the)? notifications?|اعلان(?:‌|\s)?ها رو (?:روشن|فعال) کن|نوتیفیکیشن (?:روشن|فعال) کن/.test(t)) return false;
    if (!("Notification" in W)) return L(t, "Notifications aren't available here. Add Phraortes to the Home Screen first.", "اعلان اینجا در دسترس نیست. اول Phraortes رو به صفحه‌ی اصلی اضافه کن.");
    if (Notification.permission === "granted") return L(t, "Notifications are already on.", "اعلان‌ها از قبل روشنه.");
    card(L(t, "Allow notifications?", "اعلان‌ها روشن بشه؟"), L(t, "So you hear when a mission finishes", "تا وقتی ماموریت تموم شد خبرت کنم"), L(t, "Allow", "اجازه"), function () { try { Notification.requestPermission() } catch (e) { } }, { ttl: 60000 });
    return L(t, "Tap Allow.", "روی اجازه بزن.");
  }

  W.PHR_BRAIN = { memory: memory, routine: routine, device: device, missionDone: missionDone, notify: notify, routines: routines, recall: recall };

  /* ───────── hook into the agent ───────── */
  function handle(t) { var r; try { return notifyCmd(t) || routine(t) || device(t) || memory(t) } catch (e) { return false } }
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__brain) return false; A.__brain = true;
    var oT = A.typed, oV = A.voice, oP = A.prompt;
    A.typed = function (t) { var r = handle(t); return r || oT(t) };
    A.voice = function (t, quiet) { var r = handle(t); if (r) { if (quiet) return r; try { (W.auraSetCaption || function () { })(r, "hint"); (W.auraSpeak || function () { })(r) } catch (e) { } return true } return oV(t, quiet) };
    A.prompt = function (text) {
      var b = oP(text);
      b += "\n\nROUTINES & MEMORY: the user can say 'create routine <name>: <step>, <step>' to save a multi-step routine and then say its name to run it; 'remember that …' saves a fact. If asked to pick or analyse a photo or file, say you'll open the picker (they tap once, iOS requires it) and tell them to say e.g. 'open photos and describe it'.";
      return b;
    };
    return true;
  }
  (function wait(n) { if (!install() && n < 100) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
