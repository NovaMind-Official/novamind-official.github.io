/* Phraortes — learner profile (private, stored only on this device).
 * Tracks which math / physics / chemistry topics the student asks about, gets confused by, or misses in quizzes,
 * then (1) tells the model to explain weak topics with extra care and (2) shows a "Learning profile" card with a
 * one-tap practice button. window.PHR_learn.{note, answer, hint, panel, reset}. */
(function () {
  "use strict";
  var KEY = "phraortes_learner_v1";
  var TOPICS = [
    ["deriv", "Derivatives", "مشتق", /derivativ|differentiat|chain rule|product rule|\bd\/dx\b|مشتق/i],
    ["integ", "Integrals", "انتگرال", /integra|antiderivativ|انتگرال/i],
    ["limit", "Limits", "حد", /\blimit|l'?hopital|حد\s|حدگیری/i],
    ["algebra", "Algebra & equations", "جبر و معادله", /quadratic|factor|polynomial|inequalit|simplif|solve for|equation|معادله|نامعادله|تجزیه|چندجمله/i],
    ["trig", "Trigonometry", "مثلثات", /\bsin\b|\bcos\b|\btan\b|trigonom|radian|مثلثات|سینوس|کسینوس/i],
    ["linalg", "Matrices & vectors", "ماتریس و بردار", /matri[xc]|determinant|eigen|vector|ماتریس|دترمینان|بردار/i],
    ["prob", "Probability & statistics", "احتمال و آمار", /probabilit|combinat|permutat|standard deviation|variance|\bmean\b|regression|احتمال|ترکیب|آمار|واریانس|انحراف/i],
    ["kinem", "Kinematics & forces", "حرکت و نیرو", /kinematic|velocity|acceleration|projectile|newton|friction|incline|force|سرعت|شتاب|نیرو|اصطکاک|پرتاب/i],
    ["energy", "Energy & momentum", "انرژی و تکانه", /\benergy\b|momentum|collision|work-energy|power\b|انرژی|تکانه|برخورد|کار و/i],
    ["wave", "Waves & optics", "موج و اپتیک", /\bwave|optic|lens|mirror|refraction|interference|frequency|موج|عدسی|آینه|شکست|تداخل/i],
    ["elec", "Electricity & circuits", "الکتریسیته و مدار", /circuit|resistor|voltage|current|ohm|capacitor|coulomb|مدار|مقاومت|ولتاژ|جریان|خازن|الکتریک/i],
    ["thermo", "Heat & thermodynamics", "گرما و ترمودینامیک", /thermo|\bheat\b|entropy|ideal gas|temperature|گرما|دما|ترمودینامیک|گاز کامل/i],
    ["stoich", "Moles & stoichiometry", "مول و استوکیومتری", /\bmole|stoichiom|molar|limiting reagent|concentration|مول|استوکیومتری|جرم مولی|غلظت|واکنش‌دهنده/i],
    ["balance", "Balancing equations", "موازنه‌ی معادله", /balanc|موازنه/i],
    ["atom", "Atoms & periodic table", "اتم و جدول تناوبی", /electron config|orbital|periodic|valence|isotope|آرایش الکترونی|اوربیتال|جدول تناوبی|ایزوتوپ|لایه/i],
    ["acid", "Acids, bases & pH", "اسید و باز", /\bph\b|acid|\bbase\b|buffer|titration|اسید|باز|تیتراسیون|بافر/i],
    ["organic", "Organic chemistry", "شیمی آلی", /organic|alkane|alkene|alcohol|benzene|functional group|آلی|آلکان|آلکن|الکل|بنزن|گروه عاملی/i],
    ["equil", "Equilibrium & kinetics", "تعادل و سینتیک", /equilibri|le chatelier|rate law|kinetic|تعادل|سینتیک|سرعت واکنش|لوشاتلیه/i]
  ];
  var CONF = /(don'?t|do not|didn'?t|still)\s+(get|understand|follow)|confus|stuck|lost me|makes? no sense|why\s+(is|does)\s+(this|that)|نفهم|گیج|متوجه نشد|سر در نیاورد|یاد نگرفت|بازم|دوباره توضیح|هنوز.*(نمی|نفهم)/i;
  var FA = /[؀-ۿ]/;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  var D = load(); if (!D.t) D.t = {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  function match(text) { var out = []; TOPICS.forEach(function (t) { if (t[3].test(text)) out.push(t[0]); }); return out.slice(0, 3); }
  function rec(id) { return D.t[id] || (D.t[id] = { a: 0, c: 0, qn: 0, qo: 0, last: 0 }); }
  function score(r) {
    var age = (Date.now() - (r.last || Date.now())) / 864e5, f = age > 45 ? 0.4 : age > 21 ? 0.7 : 1;
    return Math.max(0, (r.c * 2 + (r.qn - r.qo) * 1.5 + Math.max(0, r.a - 3) * 0.4 - r.qo * 0.6) * f);
  }
  function name(id, fa) { for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i][0] === id) return fa ? TOPICS[i][2] : TOPICS[i][1]; return id; }
  var L = {
    last: ""
  };
  var api = window.PHR_learn = {
    note: function (text) {
      text = String(text || ""); if (text.length < 4) return;
      if (FA.test(text)) D.fa = 1; else D.fa = 0;
      var ids = match(text), conf = CONF.test(text);
      if (!ids.length && conf && D.lastTopic) ids = [D.lastTopic];
      ids.forEach(function (id) { var r = rec(id); r.a++; r.last = Date.now(); if (conf) r.c++; });
      if (ids.length) D.lastTopic = ids[0];
      save();
    },
    answer: function (qText, good) {
      var ids = match(String(qText || "")); if (!ids.length && D.lastTopic) ids = [D.lastTopic];
      ids.forEach(function (id) { var r = rec(id); r.qn++; if (good) r.qo++; r.last = Date.now(); });
      save();
    },
    weak: function () { return Object.keys(D.t).map(function (k) { return [k, score(D.t[k])]; }).filter(function (x) { return x[1] >= 3; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).map(function (x) { return x[0]; }); },
    strong: function () { return Object.keys(D.t).filter(function (k) { var r = D.t[k]; return r.qn >= 3 && r.qo / r.qn >= 0.8 && score(r) < 1; }).slice(0, 3); },
    hint: function () {
      var w = api.weak(); if (!w.length) return "";
      var s = api.strong();
      return "\n\nLearner profile (private; adapt silently, do not mention it unless asked): the student has struggled with " + w.map(function (k) { return name(k, 0); }).join(", ") +
        (s.length ? " and is solid at " + s.map(function (k) { return name(k, 0); }).join(", ") : "") +
        ". When a question touches those topics, explain with smaller steps and one concrete example, then end with a one-line check question.";
    },
    reset: function () { D = { t: {} }; save(); },
    panel: function (body) {
      var ks = Object.keys(D.t).filter(function (k) { return D.t[k].a || D.t[k].qn; }).sort(function (a, b) { return score(D.t[b]) - score(D.t[a]) || D.t[b].a - D.t[a].a; }).slice(0, 6);
      var fa = !!D.fa, T = function (en, f) { return fa ? f : en; };
      var box = document.createElement("div"); box.id = "learn-card";
      box.style.cssText = "margin-top:14px;padding:14px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);" + (fa ? "direction:rtl;text-align:right;" : "");
      var h = '<div style="font:600 13px \'Space Grotesk\',\'Vazirmatn\',sans-serif;margin-bottom:10px">' + T("Learning profile", "پروفایل یادگیری") + ' <span style="opacity:.5;font-weight:400;font-size:11px">· ' + T("stays on this device", "فقط روی همین دستگاه") + "</span></div>";
      if (!ks.length) h += '<div style="font-size:12.5px;color:rgba(255,255,255,.5);line-height:1.7">' + T("Ask a few study questions or take a quiz and Phraortes will learn where you need more help.", "چند سؤال درسی بپرس یا آزمون بده تا Phraortes بفهمد کجا به کمک بیشتری نیاز داری.") + "</div>";
      else {
        h += ks.map(function (k) {
          var r = D.t[k], sc = score(r), weak = sc >= 3, acc = r.qn ? Math.round(r.qo / r.qn * 100) : null;
          var pct = Math.max(8, Math.min(100, 100 - sc * 14));
          return '<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12.5px"><span>' + name(k, fa) + (weak ? ' <b style="color:#E2552B">•</b>' : "") + '</span><span style="opacity:.55;font-size:11.5px">' + (fa ? "" : "") + r.a + "× " + T("asked", "پرسیده") + (acc !== null ? " · " + acc + (fa ? "٪" : "%") : "") + '</span></div><div style="height:5px;border-radius:5px;background:rgba(255,255,255,.08);margin-top:5px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + "%;border-radius:5px;background:" + (weak ? "#E2552B" : "#3FBF8F") + '"></i></div></div>';
        }).join("");
      }
      var w = api.weak();
      if (w.length) h += '<button id="learn-go" style="margin-top:6px;width:100%;padding:10px;border-radius:12px;border:1px solid rgba(212,162,76,.4);background:rgba(212,162,76,.12);color:#D4A24C;font:600 13px \'Space Grotesk\',\'Vazirmatn\',sans-serif;cursor:pointer">' + T("Practice my weak spots", "تمرین نقاط ضعفم") + "</button>";
      if (ks.length) h += '<button id="learn-rs" style="margin-top:8px;background:none;border:0;color:rgba(255,255,255,.4);font:500 11.5px \'Space Grotesk\',\'Vazirmatn\',sans-serif;cursor:pointer">' + T("Reset profile", "پاک کردن پروفایل") + "</button>";
      box.innerHTML = h; body.appendChild(box);
      var go = box.querySelector("#learn-go");
      if (go) go.addEventListener("click", function () {
        var names = w.map(function (k) { return name(k, fa); }).join(fa ? "، " : ", "), el = document.getElementById("ui");
        if (!el || typeof window.send !== "function") return;
        el.value = fa ? "از روی نقاط ضعفم (" + names + ") یک آزمون ۵ سؤالی چهارگزینه‌ای بساز و پاسخ‌ها را کامل توضیح بده." : "Make me a 5-question multiple-choice quiz on my weak spots (" + names + ") and explain each answer.";
        try { typeof window.closeMemoryManager === "function" ? window.closeMemoryManager() : document.getElementById("memory-panel").classList.remove("show"); } catch (e) {}
        window.send();
      });
      var rs = box.querySelector("#learn-rs"); if (rs) rs.addEventListener("click", function () { api.reset(); var o = document.getElementById("learn-card"); if (o) o.remove(); api.panel(body); });
    }
  };
  // The app script runs after hydration (later than this file), so attach the two hooks once its functions exist.
  var hooked = { m: 0, g: 0 }, tries = 0;
  function hook() {
    if (!hooked.m && typeof window.renderMemoryPanel === "function") {
      hooked.m = 1; var orig = window.renderMemoryPanel;
      window.renderMemoryPanel = function () {
        orig.apply(this, arguments);
        try { var b = document.getElementById("memory-panel-body"); if (b) { var o = document.getElementById("learn-card"); if (o) o.remove(); api.panel(b); } } catch (e) {}
      };
    }
    if (!hooked.g && typeof window.getLongMemoryPrompt === "function") {
      hooked.g = 1; var og = window.getLongMemoryPrompt;
      window.getLongMemoryPrompt = function () { var s = og.apply(this, arguments); try { return s + api.hint(); } catch (e) { return s; } };
    }
    if ((hooked.m && hooked.g) || ++tries > 120) clearInterval(timer);
  }
  var timer = setInterval(hook, 250); hook();
})();
