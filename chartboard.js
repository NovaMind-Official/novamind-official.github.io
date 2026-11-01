/* Phraortes — chart board artifact: donut (shares / percent) + bar or line chart, editable, tap to select.
 * ```chart  title: Monthly budget / unit: $ / type: combo|bar|line|donut / goal: 2000 / Rent: 800 / Food: 420 ...
 * Needs artifacts.js (window.PHRW). No eval, no external libraries. */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var ALIAS = { chart: 1, charts: 1, chartboard: 1, dashboard: 1, pie: 1, donut: 1, doughnut: 1, budget: 1, percent: 1, barchart: 1, linechart: 1, piechart: 1 };
  var oldKind = W.kindOf;
  W.kindOf = function (l) { return ALIAS[String(l || "").toLowerCase()] ? "chart" : oldKind(l); };
  W.kinds.chart = 1;
  var PAL = ["#D4A24C", "#5AA9E6", "#8A63D8", "#E2552B", "#3FBF8F", "#E86A9A", "#9AA7B5", "#C8D65A", "#4FD1C5", "#F6AD55"];
  var L = {
    en: { badge: "Chart", total: "Total", avg: "Average", max: "Highest", min: "Lowest", share: "Share", edit: "Edit data", done: "Done", bar: "Bars", line: "Line", goal: "Goal", of: "of", need: "Add some values, e.g.  Rent: 800", ph: "One per line:  Label: value", full: "Expand", close: "Close", left: "left", over: "over goal" },
    fa: { badge: "نمودار", total: "جمع", avg: "میانگین", max: "بیشترین", min: "کمترین", share: "سهم", edit: "ویرایش داده", done: "تمام", bar: "ستونی", line: "خطی", goal: "هدف", of: "از", need: "مقدارها را بنویس، مثلاً  اجاره: ۸۰۰", ph: "هر خط یکی:  عنوان: مقدار", full: "بزرگ‌نمایی", close: "بستن", left: "مانده", over: "بیشتر از هدف" }
  };
  var KEYS = { title: 1, unit: 1, type: 1, goal: 1, lang: 1, labels: 1, values: 1, data: 1, colors: 1 };
  var css = document.createElement("style");
  css.textContent = ".cb-top{display:grid;grid-template-columns:minmax(150px,46%) 1fr;gap:6px 14px;align-items:center;padding:4px 14px 6px}@media(max-width:420px){.cb-top{grid-template-columns:1fr}}" +
    ".cb-donut{position:relative;width:100%;max-width:230px;margin:0 auto;aspect-ratio:1}.cb-donut canvas{width:100%;height:100%;display:block;touch-action:manipulation;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important}" +
    ".cb-mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center}.cb-mid b{font:700 24px 'Space Grotesk','Vazirmatn',sans-serif;letter-spacing:-.02em}.cb-mid small{font:500 11px 'Space Grotesk','Vazirmatn',sans-serif;opacity:.6;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".cb-leg{display:flex;flex-direction:column;gap:2px}.cb-row{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:12px;font:500 13px 'Space Grotesk','Vazirmatn',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .2s}.cb-row.on{background:rgba(255,255,255,.07)}.cb-row i{width:10px;height:10px;border-radius:50%;flex:0 0 auto}.cb-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cb-row em{font-style:normal;opacity:.55;font-size:12px}.cb-row b{font-weight:600;min-width:42px;text-align:right}" +
    ".cb-sw{display:flex;gap:6px;padding:4px 14px 0}.cb-goal{margin:6px 14px 0;padding:11px 13px;border-radius:14px;background:rgba(255,255,255,.04);font:500 12px 'Space Grotesk','Vazirmatn',sans-serif}.cb-gb{height:7px;border-radius:9px;background:rgba(255,255,255,.1);margin-top:8px;overflow:hidden}.cb-gb i{display:block;height:100%;border-radius:9px;background:var(--p,#D4A24C);transition:width .7s cubic-bezier(.22,.8,.24,1)}" +
    ".cb-ed{width:calc(100% - 28px);margin:8px 14px 12px;min-height:110px;resize:vertical;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:#080604;color:#f3e9d0;font:13px/1.7 'Space Mono',monospace;padding:10px 12px;direction:ltr;text-align:left}";
  document.head.appendChild(css);
  function norm(s) { return String(s).replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x06F0; }).replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x0660; }).replace(/٫/g, ".").replace(/[،]/g, ","); }
  function num(s) { s = norm(s).replace(/,/g, "").replace(/%/g, "").trim(); var m = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.exec(s); return m ? parseFloat(s) : NaN; }
  function parse(body) {
    var cfg = { rows: [] }, lines = String(body || "").replace(/\r/g, "").split("\n"), lab = null, val = null;
    lines.forEach(function (ln) {
      if (!ln.trim()) return;
      var m = /^\s*([^:=]+?)\s*[:=]\s*(.*)$/.exec(ln.replace(/^\s*[-•*]\s+/, ""));
      if (!m) return;
      var k = m[1].trim().toLowerCase(), v = m[2].trim();
      if (KEYS[k]) {
        if (k === "labels") lab = v.split(/[,،;]/).map(function (x) { return x.trim(); }).filter(Boolean);
        else if (k === "values" || k === "data") val = norm(v).split(/[,;\s]+/).map(num).filter(function (x) { return !isNaN(x); });
        else cfg[k] = v;
      } else { var n = num(v); if (!isNaN(n)) cfg.rows.push({ l: m[1].trim(), v: n }); }
    });
    if (lab && val) for (var i = 0; i < Math.min(lab.length, val.length); i++) cfg.rows.push({ l: lab[i], v: val[i] });
    cfg.rows = cfg.rows.slice(0, 40);
    return cfg;
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  W.builders.chart = function (root, lines) {
    var lang = root._lang, T = function (k) { return (L[lang] || L.en)[k] || k; }, esc = W.esc;
    var body = ""; try { body = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var cfg = parse(body); if (!cfg.rows.length) throw new Error(T("need"));
    var unit = cfg.unit || "", mode = /^(bar|line|donut)$/i.test(cfg.type || "") ? cfg.type.toLowerCase() : "combo", kind = mode === "line" ? "line" : "bar";
    var goal = num(cfg.goal || ""), sel = -1, anim = 1, rows = cfg.rows, editing = false;
    var nf = (function () { try { return new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 2 }); } catch (e) { return { format: String }; } })();
    var pf = function (p) { return nf.format(Math.round(p * 10) / 10) + (lang === "fa" ? "٪" : "%"); };
    var fv = function (v) { var s = nf.format(v); return /^[$€£¥]$/.test(unit) ? unit + s : s + (unit ? " " + unit : ""); };
    var pal = (cfg.colors ? cfg.colors.split(/[,\s]+/).filter(function (c) { return /^#[0-9a-f]{3,8}$/i.test(c); }) : []).concat(PAL);
    var col = function (i) { return pal[i % pal.length]; };
    var tot = function () { return rows.reduce(function (s, r) { return s + Math.max(0, r.v); }, 0); };
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(T("badge")) + '</span><span class="phr-w-title">' + esc(cfg.title || "") + '</span><button class="phr-w-btn" data-a="ed">' + esc(T("edit")) + '</button><button class="phr-w-btn" data-a="full">⤢</button></div>' +
      '<div class="cb-top"><div class="cb-donut"><canvas></canvas><div class="cb-mid"><b></b><small></small></div></div><div class="cb-leg"></div></div>' +
      '<div data-r="goal"></div><div data-r="sw" class="cb-sw"></div><div class="phr-cvwrap" data-r="bw"><canvas data-r="bar"></canvas></div><div class="phr-reads" data-r="reads"></div><div data-r="edwrap" style="display:none"><textarea class="cb-ed" spellcheck="false" placeholder="' + esc(T("ph")) + '"></textarea></div>';
    var q = function (s) { return root.querySelector(s); };
    var dcv = q(".cb-donut canvas"), bcv = q('[data-r="bar"]'), leg = q(".cb-leg"), mid = q(".cb-mid"), reads = q('[data-r="reads"]');
    var ta = q(".cb-ed");
    if (mode === "donut") { q('[data-r="bw"]').style.display = "none"; }
    function txt() { return rows.map(function (r) { return r.l + ": " + r.v; }).join("\n"); }
    ta.value = txt();
    function drawDonut() {
      var c = W.fitCanvas(dcv, 1, 140, 240), ctx = c.ctx, w = c.w, h = c.h, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6, r = R * 0.64, T0 = tot(), a = -Math.PI / 2;
      ctx.clearRect(0, 0, w, h);
      if (T0 <= 0) return;
      var sweep = Math.PI * 2 * easeOut(anim);
      rows.forEach(function (rw, i) {
        var v = Math.max(0, rw.v); if (!v) return;
        var da = (v / T0) * sweep, gap = rows.length > 1 ? 0.018 : 0, on = i === sel, rr = on ? R + 4 : R;
        ctx.beginPath(); ctx.arc(cx, cy, rr, a + gap, a + da - gap); ctx.arc(cx, cy, r, a + da - gap, a + gap, true); ctx.closePath();
        ctx.fillStyle = col(i); ctx.globalAlpha = sel < 0 || on ? 1 : 0.35; ctx.fill(); ctx.globalAlpha = 1; a += da;
      });
    }
    function drawBars() {
      if (mode === "donut") return;
      var c = W.fitCanvas(bcv, 0.5, 170, 300), ctx = c.ctx, w = c.w, h = c.h, n = rows.length, pad = { l: 8, r: 8, t: 22, b: 30 };
      ctx.clearRect(0, 0, w, h);
      var mx = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1e-9])), mn = Math.min.apply(null, rows.map(function (r) { return r.v; }).concat([0]));
      var span = (mx - mn) || 1, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b, bw = pw / n, e = easeOut(anim);
      var y0 = pad.t + ph * (mx / span), Y = function (v) { return pad.t + ph * ((mx - v) / span); };
      ctx.strokeStyle = "rgba(255,255,255,.1)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, y0); ctx.lineTo(w - pad.r, y0); ctx.stroke();
      var pts = rows.map(function (r, i) { return [pad.l + bw * (i + 0.5), y0 - (y0 - Y(r.v)) * e]; });
      ctx.font = "500 10.5px 'Space Grotesk',sans-serif"; ctx.textAlign = "center";
      if (kind === "bar") {
        rows.forEach(function (r, i) {
          var bwid = Math.min(46, bw * 0.62), x = pts[i][0] - bwid / 2, y = Math.min(pts[i][1], y0), hh = Math.abs(y0 - pts[i][1]), on = i === sel;
          ctx.globalAlpha = sel < 0 || on ? 1 : 0.35; ctx.fillStyle = col(i);
          var rad = Math.min(8, bwid / 2, hh); ctx.beginPath(); ctx.moveTo(x, y + hh); ctx.lineTo(x, y + rad); ctx.quadraticCurveTo(x, y, x + rad, y); ctx.lineTo(x + bwid - rad, y); ctx.quadraticCurveTo(x + bwid, y, x + bwid, y + rad); ctx.lineTo(x + bwid, y + hh); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        });
      } else {
        ctx.strokeStyle = W.accent(); ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke();
        var g = ctx.createLinearGradient(0, pad.t, 0, y0); g.addColorStop(0, "rgba(212,162,76,.28)"); g.addColorStop(1, "rgba(212,162,76,0)");
        ctx.fillStyle = g; ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.lineTo(pts[n - 1][0], y0); ctx.lineTo(pts[0][0], y0); ctx.closePath(); ctx.fill();
        pts.forEach(function (p, i) { ctx.beginPath(); ctx.arc(p[0], p[1], i === sel ? 5.5 : 3.5, 0, 7); ctx.fillStyle = i === sel ? "#fff" : col(i); ctx.fill(); });
      }
      ctx.fillStyle = "rgba(255,255,255,.62)";
      rows.forEach(function (r, i) {
        var lbl = r.l.length > (n > 6 ? 5 : 9) ? r.l.slice(0, n > 6 ? 4 : 8) + "…" : r.l;
        if (n <= 12 || i % 2 === 0) ctx.fillText(lbl, pts[i][0], h - 10);
        if (i === sel || (n <= 6 && sel < 0)) { ctx.fillStyle = "#fff"; ctx.fillText(nf.format(r.v), pts[i][0], Math.max(12, pts[i][1] - 7)); ctx.fillStyle = "rgba(255,255,255,.62)"; }
      });
    }
    function paintLegend() {
      var T0 = tot();
      leg.innerHTML = rows.map(function (r, i) { return '<div class="cb-row' + (i === sel ? " on" : "") + '" data-i="' + i + '"><i style="background:' + col(i) + '"></i><span>' + esc(r.l) + '</span><em>' + esc(fv(r.v)) + '</em><b>' + pf(T0 > 0 ? Math.max(0, r.v) / T0 * 100 : 0) + '</b></div>'; }).join("");
      var m = mid.querySelector("b"), s = mid.querySelector("small");
      if (sel >= 0) { m.textContent = pf(T0 > 0 ? Math.max(0, rows[sel].v) / T0 * 100 : 0); s.textContent = rows[sel].l; } else { m.textContent = fv(T0); s.textContent = T("total"); }
      m.style.fontSize = m.textContent.length > 9 ? "15px" : m.textContent.length > 6 ? "19px" : "";
    }
    function paintReads() {
      var vals = rows.map(function (r) { return r.v; }), s = vals.reduce(function (a, b) { return a + b; }, 0), ix = vals.indexOf(Math.max.apply(null, vals)), im = vals.indexOf(Math.min.apply(null, vals));
      var cell = function (k, v, sub) { return '<div class="phr-read"><small>' + esc(k) + "</small><b>" + esc(v) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>"; };
      reads.innerHTML = cell(T("total"), fv(s)) + cell(T("avg"), fv(s / rows.length)) + cell(T("max"), fv(vals[ix]), rows[ix].l) + cell(T("min"), fv(vals[im]), rows[im].l);
      var gw = q('[data-r="goal"]');
      if (isFinite(goal) && goal > 0) { var p = s / goal * 100, d = goal - s; gw.innerHTML = '<div class="cb-goal"><b>' + esc(T("goal") + ": " + fv(goal)) + "</b> · " + pf(p) + " · " + esc(fv(Math.abs(d)) + " " + (d >= 0 ? T("left") : T("over"))) + '<div class="cb-gb"><i style="width:' + Math.min(100, p) + '%;background:' + (p > 100 ? "#E2552B" : "") + '"></i></div></div>'; } else gw.innerHTML = "";
    }
    function sw() {
      var box = q('[data-r="sw"]'); if (mode !== "combo") { box.style.display = "none"; return; }
      box.innerHTML = '<button class="pg-tab' + (kind === "bar" ? " on" : "") + '" data-k="bar">' + esc(T("bar")) + '</button><button class="pg-tab' + (kind === "line" ? " on" : "") + '" data-k="line">' + esc(T("line")) + "</button>";
    }
    function paint() { paintLegend(); drawDonut(); drawBars(); paintReads(); }
    function run() {
      var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) { anim = 1; paint(); return; }
      var t0 = performance.now(); anim = 0;
      (function step(now) { anim = Math.min(1, (now - t0) / 800); drawDonut(); drawBars(); if (anim < 1) requestAnimationFrame(step); })(t0);
      paintLegend(); paintReads();
    }
    function pick(i) { sel = sel === i ? -1 : i; try { window.PHR_haptic && window.PHR_haptic("light"); } catch (e) {} paintLegend(); drawDonut(); drawBars(); }
    leg.addEventListener("click", function (ev) { var r = ev.target.closest(".cb-row"); if (r) pick(+r.getAttribute("data-i")); });
    dcv.addEventListener("click", function (ev) {
      var b = dcv.getBoundingClientRect(), x = ev.clientX - b.left - b.width / 2, y = ev.clientY - b.top - b.height / 2, d = Math.hypot(x, y), R = Math.min(b.width, b.height) / 2;
      if (d < R * 0.5 || d > R) { if (sel >= 0) pick(sel); return; }
      var ang = Math.atan2(y, x) + Math.PI / 2; if (ang < 0) ang += Math.PI * 2; var T0 = tot(), acc = 0;
      for (var i = 0; i < rows.length; i++) { acc += Math.max(0, rows[i].v) / T0 * Math.PI * 2; if (ang <= acc) { pick(i); return; } }
    });
    bcv.addEventListener("click", function (ev) { var b = bcv.getBoundingClientRect(), i = Math.floor((ev.clientX - b.left - 8) / ((b.width - 16) / rows.length)); if (i >= 0 && i < rows.length) pick(i); });
    root.addEventListener("click", function (ev) {
      var k = ev.target.closest("[data-k]"); if (k) { kind = k.getAttribute("data-k"); sw(); drawBars(); return; }
      var a = ev.target.closest("[data-a]"); if (!a) return;
      if (a.getAttribute("data-a") === "ed") { editing = !editing; q('[data-r="edwrap"]').style.display = editing ? "" : "none"; a.textContent = editing ? T("done") : T("edit"); }
    });
    ta.addEventListener("input", function () {
      var nr = parse(ta.value).rows; if (!nr.length) return; rows = nr; sel = -1; anim = 1; paint();
    });
    W.attachExpand(root, root.querySelector('[data-a="full"]'), function () { drawDonut(); drawBars(); });
    W.observeResize(root, function () { drawDonut(); drawBars(); });
    sw(); paintLegend(); run();
    if ("IntersectionObserver" in window) { var seen = false; new IntersectionObserver(function (en) { if (en[0].isIntersecting && !seen) { seen = true; run(); } }, { threshold: 0.2 }).observe(root); }
  };
})();
