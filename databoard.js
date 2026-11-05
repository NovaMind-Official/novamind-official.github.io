/* =====================================================================
   Phraortes — Data Board (databoard.js)
   Drop a CSV / Excel file → profile, insights, charts, table — all on the device.
   • window.PHR_DATA  : ingest(file) → dataset, summary(ds) (compact text for the model), get(id)
   • ```databoard  id: <dataset id>   → interactive dashboard artifact (needs artifacts.js / PHRW)
   Nothing is uploaded anywhere; datasets live in memory + IndexedDB on this device.
   ===================================================================== */
(function () {
  "use strict";
  var W = window.PHRW;
  var DS = {}, SEQ = 0;
  var MAXROWS = 100000;

  /* ------------------------------------------------------------ helpers */
  function normDigits(s) { return String(s).replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x06F0; }).replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x0660; }).replace(/٫/g, ".").replace(/٬/g, ","); }
  function toNum(v) {
    if (v == null || v === "") return NaN;
    if (typeof v === "number") return isFinite(v) ? v : NaN;
    if (typeof v === "boolean" || v instanceof Date) return NaN;
    var s = normDigits(v).trim().replace(/[\s$€£¥﷼]|تومان|ریال|usd|eur/gi, "").replace(/%$/, "");
    if (/^\(.*\)$/.test(s)) s = "-" + s.slice(1, -1);
    s = s.replace(/,(?=\d{3}(\D|$))/g, "");
    if (!/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  }
  function j2g(jy, jm, jd) { // Jalali → Gregorian
    jy += 1595; var days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
    var gy = 400 * Math.floor(days / 146097); days %= 146097;
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var gd = days + 1, md = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], gm;
    for (gm = 0; gm < 13 && gd > md[gm]; gm++) gd -= md[gm];
    return new Date(Date.UTC(gy, gm - 1, gd));
  }
  function toDate(v) {
    if (v == null || v === "") return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    if (typeof v === "number") return null;
    var s = normDigits(v).trim(), m;
    if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T]\d{1,2}:\d{2}.*)?$/.exec(s))) {
      var y = +m[1], mo = +m[2], d = +m[3];
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      if (y >= 1300 && y <= 1500) return j2g(y, mo, d);
      if (y >= 1700 && y <= 2200) return new Date(Date.UTC(y, mo - 1, d));
      return null;
    }
    if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(s))) { var a = +m[1], b = +m[2], yy = +m[3]; if (yy < 1700 || yy > 2200) return null; var mm = a > 12 ? b : a, dd = a > 12 ? a : b; return mm > 12 ? null : new Date(Date.UTC(yy, mm - 1, dd)); }
    if (/^[A-Za-z]{3,9}\.? \d{1,2},? \d{4}$/.test(s) || /^\d{1,2} [A-Za-z]{3,9} \d{4}$/.test(s)) { var t = Date.parse(s + " UTC"); return isNaN(t) ? null : new Date(t); }
    return null;
  }
  function full(n, lg) { try { return new Intl.NumberFormat(lg === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 2 }).format(n); } catch (e) { return String(n); } }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; }
  function quant(s, p) { var i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lang() { return /[؀-ۿ]/.test(document.body.getAttribute("data-lang") || "") ? "fa" : (window.__phrLang || "en"); }
  function fmt(n, lg) {
    if (n == null || isNaN(n)) return "—";
    var a = Math.abs(n), o = a >= 1e9 ? [n / 1e9, "B"] : a >= 1e6 ? [n / 1e6, "M"] : a >= 1e4 ? [n / 1e3, "K"] : [n, ""];
    var s; try { s = new Intl.NumberFormat(lg === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: Math.abs(o[0]) >= 100 ? 0 : Math.abs(o[0]) >= 10 ? 1 : 2 }).format(o[0]); } catch (e) { s = String(Math.round(o[0] * 100) / 100); }
    return s + o[1];
  }

  /* ------------------------------------------------------------ parse */
  function readFile(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = function () { rej(new Error("read")); };
      fr.onload = function () { res(fr.result); };
      fr.readAsArrayBuffer(file);
    });
  }
  function sheetsFrom(buf, name) {
    if (!window.XLSX) throw new Error("Spreadsheet engine isn't loaded yet — check your connection and try again.");
    var out = [], wb;
    if (/\.(csv|tsv|txt)$/i.test(name)) {
      var txt = new TextDecoder("utf-8").decode(buf);
      if ((txt.match(/�/g) || []).length > 3) { try { txt = new TextDecoder("windows-1256").decode(buf); } catch (e) {} }
      txt = txt.replace(/^﻿/, "");
      wb = XLSX.read(txt, { type: "string", cellDates: true, raw: true, FS: /\.tsv$/i.test(name) ? "\t" : undefined });
    } else wb = XLSX.read(buf, { type: "array", cellDates: true });
    wb.SheetNames.forEach(function (n) {
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null, blankrows: false });
      if (rows.length > 1) out.push({ name: n, rows: rows });
    });
    return out;
  }
  function build(name, sheetName, rows, sheets) {
    var hi = 0; for (var i = 0; i < Math.min(rows.length, 8); i++) { var r = rows[i] || [], ne = r.filter(function (x) { return x != null && x !== ""; }), st = ne.filter(function (x) { return typeof x === "string"; }); if (ne.length >= Math.max(2, (rows[hi] || []).length * 0.5) && st.length >= ne.length * 0.6) { hi = i; break; } }
    var hdr = (rows[hi] || []).map(function (h, i) { return h == null || h === "" ? "Column " + (i + 1) : String(h).trim(); });
    var seen = {}; hdr = hdr.map(function (h) { if (seen[h]) { seen[h]++; return h + " (" + seen[h] + ")"; } seen[h] = 1; return h; });
    var body = rows.slice(hi + 1, hi + 1 + MAXROWS).filter(function (r) { return r && r.some(function (x) { return x != null && x !== ""; }); });
    var nc = hdr.length;
    // drop fully empty columns
    var keep = []; for (var c = 0; c < nc; c++) { var any = false; for (var j = 0; j < body.length && j < 2000; j++) { if (body[j][c] != null && body[j][c] !== "") { any = true; break; } } if (any) keep.push(c); }
    var ds = { id: "ds" + Date.now().toString(36) + (++SEQ), name: name, sheet: sheetName, sheets: sheets || [], n: body.length, cols: [], rows: [] };
    ds.rows = body.map(function (r) { return keep.map(function (c) { var v = r[c]; if (typeof v === "string") { v = v.trim(); if (v === "" || /^(null|nan|n\/a|na|none|-|—|نامشخص|ندارد)$/i.test(v)) v = null; } return v === undefined ? null : v; }); });
    keep.forEach(function (c, i) { ds.cols.push({ name: hdr[c], i: i }); });
    typeAndProfile(ds);
    return ds;
  }
  function typeAndProfile(ds) {
    ds.cols.forEach(function (col, ci) {
      var vals = [], nn = 0, nums = 0, dates = 0, bools = 0, uniq = {}, nu = 0;
      for (var r = 0; r < ds.rows.length; r++) {
        var v = ds.rows[r][ci]; if (v == null) continue; nn++;
        if (r < 3000) { if (!isNaN(toNum(v))) nums++; if (toDate(v)) dates++; if (typeof v === "boolean" || /^(true|false|yes|no|بله|خیر)$/i.test(String(v))) bools++; }
      }
      var sampled = Math.min(ds.rows.length, 3000), denom = Math.max(1, Math.min(nn, sampled));
      var type = "text";
      if (nn === 0) type = "empty";
      else if (v0(ds, ci, "Date")) type = "date";
      else if (bools / denom >= .95) type = "bool";
      else if (nums / denom >= .9) type = "number";
      else if (dates / denom >= .9) type = "date";
      col.type = type; col.missing = ds.rows.length - nn;
      if (type === "number") {
        var a = []; ds.rows.forEach(function (r) { var x = toNum(r[ci]); if (!isNaN(x)) a.push(x); });
        var s = a.slice().sort(function (x, y) { return x - y; }), sum = a.reduce(function (p, q) { return p + q; }, 0), mean = sum / a.length;
        var sd = Math.sqrt(a.reduce(function (p, q) { return p + (q - mean) * (q - mean); }, 0) / Math.max(1, a.length - 1));
        col.stats = { n: a.length, min: s[0], max: s[s.length - 1], sum: sum, mean: mean, median: quant(s, .5), q1: quant(s, .25), q3: quant(s, .75), sd: sd };
        col.integer = a.every(function (x) { return Math.round(x) === x; });
      } else if (type === "date") {
        var ds2 = []; ds.rows.forEach(function (r) { var d = toDate(r[ci]) || (r[ci] instanceof Date ? r[ci] : null); if (d) ds2.push(+d); });
        ds2.sort(function (x, y) { return x - y; }); col.stats = { n: ds2.length, min: ds2[0], max: ds2[ds2.length - 1] };
      } else {
        var cnt = {}; ds.rows.forEach(function (r) { var v = r[ci]; if (v == null) return; v = String(v); cnt[v] = (cnt[v] || 0) + 1; });
        var keys = Object.keys(cnt); col.unique = keys.length;
        col.top = keys.sort(function (x, y) { return cnt[y] - cnt[x]; }).slice(0, 12).map(function (k) { return [k, cnt[k]]; });
        if (type === "text" && col.unique <= Math.max(25, nn * 0.08)) col.type = "category";
        if (type === "text" && col.unique > nn * 0.9 && nn > 20) col.id = true;
      }
    });
    // duplicates
    var seen = {}, dup = 0; ds.rows.forEach(function (r) { var k = JSON.stringify(r); if (seen[k]) dup++; else seen[k] = 1; }); ds.dups = dup;
    // cache numeric/date arrays for speed
    ds.cols.forEach(function (c, ci) {
      if (c.type === "number") c.arr = ds.rows.map(function (r) { var x = toNum(r[ci]); return isNaN(x) ? null : x; });
      if (c.type === "date") c.arr = ds.rows.map(function (r) { var d = r[ci] instanceof Date ? r[ci] : toDate(r[ci]); return d ? +d : null; });
    });
  }
  function v0(ds, ci, t) { for (var r = 0; r < ds.rows.length && r < 50; r++) { var v = ds.rows[r][ci]; if (v != null) return t === "Date" && v instanceof Date; } return false; }

  /* ------------------------------------------------------------ insights */
  function T(lg, en, fa) { return lg === "fa" ? fa : en; }
  function pearson(x, y) {
    var n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (var i = 0; i < x.length; i++) { var a = x[i], b = y[i]; if (a == null || b == null) continue; n++; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b; }
    if (n < 8) return null; var d = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy)); return d ? (n * sxy - sx * sy) / d : null;
  }
  function monthly(ds, di, ni, agg) {
    var m = {}, c = ds.cols[di].arr, v = ds.cols[ni].arr, span = ds.cols[di].stats.max - ds.cols[di].stats.min, byDay = span < 120 * 864e5;
    for (var i = 0; i < c.length; i++) { if (c[i] == null || v[i] == null) continue; var d = new Date(c[i]), k = d.toISOString().slice(0, byDay ? 10 : 7); (m[k] = m[k] || []).push(v[i]); }
    var ks = Object.keys(m).sort();
    return ks.map(function (k) { var a = m[k], s = a.reduce(function (p, q) { return p + q; }, 0); return [k, agg === "avg" ? s / a.length : s]; });
  }
  function insights(ds, lg) {
    var out = [], N = ds.rows.length, nums = ds.cols.filter(function (c) { return c.type === "number" && !c.id; });
    // quality
    ds.cols.forEach(function (c) { var p = c.missing / N; if (p > .05 && c.type !== "empty") out.push({ k: "warn", s: 2 + p, t: T(lg, "“" + c.name + "” is " + Math.round(p * 100) + "% empty", "ستون «" + c.name + "» " + Math.round(p * 100) + "٪ خالی است"), d: T(lg, "Averages and totals only use the filled rows — fill or drop it before trusting them.", "میانگین و جمع فقط با ردیف‌های پر محاسبه می‌شود؛ قبل از اتکا به نتیجه، پر یا حذفش کن.") }); });
    if (ds.dups > 0) out.push({ k: "warn", s: 2.5, t: T(lg, ds.dups + " duplicate rows", ds.dups + " ردیف تکراری"), d: T(lg, "Exact copies of another row — they inflate counts and totals.", "کپی دقیق ردیف دیگری هستند و شمارش و جمع را بالا می‌برند.") });
    // outliers
    nums.forEach(function (c) {
      var s = c.stats; if (!s || s.n < 12 || !s.sd) return; var iqr = s.q3 - s.q1, lo = s.q1 - 3 * iqr, hi = s.q3 + 3 * iqr, k = 0;
      c.arr.forEach(function (x) { if (x != null && (x < lo || x > hi)) k++; });
      if (k > 0 && iqr > 0) out.push({ k: "out", s: 3 + Math.min(2, k / s.n * 40), t: T(lg, k + " extreme " + (k > 1 ? "values" : "value") + " in “" + c.name + "”", k + " مقدار بسیار پرت در «" + c.name + "»"), d: T(lg, "Typical is about " + fmt(s.median, lg) + ", but it reaches " + fmt(s.max, lg) + (s.min < lo ? " and drops to " + fmt(s.min, lg) : "") + ". Check if they are errors or real spikes.", "حالت معمول حدود " + fmt(s.median, lg) + " است ولی تا " + fmt(s.max, lg) + (s.min < lo ? " و تا " + fmt(s.min, lg) + " هم می‌رسد" : "") + ". ببین اشتباه ثبت شده‌اند یا جهش واقعی‌اند.") });
    });
    // correlations
    var cn = nums.slice(0, 14), best = [];
    for (var i = 0; i < cn.length; i++) for (var j = i + 1; j < cn.length; j++) { var r = pearson(cn[i].arr, cn[j].arr); if (r != null && Math.abs(r) >= .55 && Math.abs(r) < .999) best.push([r, cn[i], cn[j]]); }
    best.sort(function (a, b) { return Math.abs(b[0]) - Math.abs(a[0]); }).slice(0, 3).forEach(function (b) {
      out.push({ k: "corr", s: 3 + Math.abs(b[0]), x: b[1].name, y: b[2].name, t: T(lg, "“" + b[1].name + "” and “" + b[2].name + "” move " + (b[0] > 0 ? "together" : "in opposite directions"), "«" + b[1].name + "» و «" + b[2].name + "» " + (b[0] > 0 ? "با هم بالا و پایین می‌روند" : "برعکس هم حرکت می‌کنند")), d: T(lg, "Correlation " + (Math.round(b[0] * 100) / 100) + ". A link, not proof that one causes the other.", "همبستگی " + (Math.round(b[0] * 100) / 100) + ". ارتباط هست ولی لزوماً یکی عامل دیگری نیست.") });
    });
    // trends
    var dc = ds.cols.filter(function (c) { return c.type === "date" && c.stats && c.stats.n > 10; })[0];
    if (dc) {
      var tr = [];
      nums.slice(0, 8).forEach(function (c) {
        var ser = monthly(ds, dc.i, c.i, "sum"); if (ser.length < 4) return;
        var k = Math.max(1, Math.floor(ser.length / 3)), f = ser.slice(0, k), l = ser.slice(-k);
        var af = f.reduce(function (p, q) { return p + q[1]; }, 0) / f.length, al = l.reduce(function (p, q) { return p + q[1]; }, 0) / l.length;
        if (!af) return; tr.push([(al - af) / Math.abs(af), c, ser]);
      });
      tr.sort(function (a, b) { return Math.abs(b[0]) - Math.abs(a[0]); }).slice(0, 2).forEach(function (t) {
        var p = Math.round(t[0] * 100); if (Math.abs(p) < 8) return;
        out.push({ k: "trend", s: 3.5 + Math.min(1, Math.abs(t[0])), x: dc.name, y: t[1].name, t: T(lg, "“" + t[1].name + "” " + (p > 0 ? "grew " : "fell ") + Math.abs(p) + "% over time", "«" + t[1].name + "» در طول زمان " + Math.abs(p) + "٪ " + (p > 0 ? "رشد کرد" : "افت کرد")), d: T(lg, "Comparing the first and last third of the period (" + iso(new Date(dc.stats.min)) + " → " + iso(new Date(dc.stats.max)) + ").", "مقایسه‌ی یک‌سوم اول و آخر بازه (" + iso(new Date(dc.stats.min)) + " ← " + iso(new Date(dc.stats.max)) + ").") });
      });
    }
    // concentration
    var cats = ds.cols.filter(function (c) { return c.type === "category" && c.unique >= 3 && c.unique <= 30; });
    var m1 = nums.filter(function (c) { return /(sales|revenue|amount|total|price|cost|profit|فروش|مبلغ|قیمت|سود|درآمد|هزینه)/i.test(c.name); })[0] || nums[0];
    if (m1 && cats.length) {
      cats.slice(0, 5).forEach(function (c) {
        var sum = {}, tot = 0; ds.rows.forEach(function (r, ri) { var v = m1.arr[ri], k = r[c.i]; if (v == null || k == null || v < 0) return; k = String(k); sum[k] = (sum[k] || 0) + v; tot += v; });
        var ks = Object.keys(sum).sort(function (a, b) { return sum[b] - sum[a]; }); if (!ks.length || !tot) return;
        var sh = sum[ks[0]] / tot; if (sh >= .35 && ks.length >= 3) out.push({ k: "conc", s: 3.2 + sh, x: c.name, y: m1.name, t: T(lg, "“" + ks[0] + "” makes up " + Math.round(sh * 100) + "% of " + m1.name, "«" + ks[0] + "» " + Math.round(sh * 100) + "٪ از " + m1.name + " را می‌سازد"), d: T(lg, "Across “" + c.name + "” (" + ks.length + " groups). Heavy reliance on one group is a risk.", "در «" + c.name + "» (" + ks.length + " گروه). اتکای زیاد به یک گروه ریسک است.") });
      });
    }
    return out.sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
  }

  /* ------------------------------------------------------------ text summary for the model */
  function summary(ds, lg) {
    var L = ["DATASET “" + ds.name + "”" + (ds.sheet ? " (sheet " + ds.sheet + ")" : "") + " — " + ds.rows.length + " rows × " + ds.cols.length + " columns. An interactive dashboard of it is shown to the user automatically above your reply — do NOT redraw the same charts; interpret instead.", "COLUMNS:"];
    ds.cols.forEach(function (c) {
      var s = c.stats, d = "- " + c.name + " [" + c.type + (c.missing ? ", " + c.missing + " missing" : "") + "]";
      if (c.type === "number" && s) d += " min " + fmt(s.min) + ", median " + fmt(s.median) + ", mean " + fmt(s.mean) + ", max " + fmt(s.max) + ", sum " + fmt(s.sum);
      else if (c.type === "date" && s) d += " " + iso(new Date(s.min)) + " → " + iso(new Date(s.max));
      else if (c.top) d += " " + c.unique + " unique; top: " + c.top.slice(0, 5).map(function (t) { return t[0] + " (" + t[1] + ")"; }).join(", ");
      L.push(d);
    });
    var ins = insights(ds, "en"); if (ins.length) { L.push("AUTOMATIC FINDINGS:"); ins.forEach(function (i) { L.push("- " + i.t + ". " + i.d); }); }
    L.push("SAMPLE ROWS (first 12):"); L.push(ds.cols.map(function (c) { return c.name; }).join(" | "));
    ds.rows.slice(0, 12).forEach(function (r) { L.push(r.map(function (v) { return v == null ? "" : v instanceof Date ? iso(v) : String(v).slice(0, 40); }).join(" | ")); });
    return L.join("\n").slice(0, 9000);
  }

  /* ------------------------------------------------------------ persistence */
  function idb() { return new Promise(function (res, rej) { try { var q = indexedDB.open("phr_data", 1); q.onupgradeneeded = function () { q.result.createObjectStore("ds"); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; } catch (e) { rej(e); } }); }
  function persist(ds) {
    var slim = { id: ds.id, name: ds.name, sheet: ds.sheet, sheets: ds.sheets, n: ds.n, rows: ds.rows.map(function (r) { return r.map(function (v) { return v instanceof Date ? { d: +v } : v; }); }), cols: ds.cols.map(function (c) { return c.name; }), ts: Date.now() };
    idb().then(function (db) { var tx = db.transaction("ds", "readwrite"); tx.objectStore("ds").put(slim, ds.id); try { var st = tx.objectStore("ds"); st.getAllKeys().onsuccess = function (e) { var ks = e.target.result; if (ks.length > 12) ks.slice(0, ks.length - 12).forEach(function (k) { st.delete(k); }); }; } catch (x) {} }).catch(function () {});
  }
  function restore(id) {
    return idb().then(function (db) { return new Promise(function (res) { var q = db.transaction("ds").objectStore("ds").get(id); q.onsuccess = function () { var s = q.result; if (!s) return res(null); var rows = s.rows.map(function (r) { return r.map(function (v) { return v && typeof v === "object" && "d" in v ? new Date(v.d) : v; }); }); var ds = { id: s.id, name: s.name, sheet: s.sheet, sheets: s.sheets || [], n: s.n, cols: s.cols.map(function (n, i) { return { name: n, i: i }; }), rows: rows }; typeAndProfile(ds); DS[id] = ds; res(ds); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; });
  }
  function ingest(file) {
    return readFile(file).then(function (buf) {
      var sh = sheetsFrom(buf, file.name || "data.csv"); if (!sh.length) throw new Error("No table found in this file.");
      var best = sh.slice().sort(function (a, b) { return b.rows.length - a.rows.length; })[0];
      var ds = build(file.name || "data", sh.length > 1 ? best.name : "", best.rows, sh.map(function (s) { return s.name; }));
      if (!ds.cols.length || ds.rows.length < 2) throw new Error("This file has no usable table.");
      DS[ds.id] = ds; persist(ds); return ds;
    });
  }
  function get(id) { return DS[id] ? Promise.resolve(DS[id]) : restore(id); }
  window.PHR_DATA = { ingest: ingest, get: get, summary: summary, insights: insights, DS: DS, fmt: fmt };

  /* ------------------------------------------------------------ dashboard UI */
  if (!W || !W.builders) return;
  var ALIAS = { databoard: 1, datadash: 1, dataset: 1, datalab2: 1 };
  var oldKind = W.kindOf; W.kindOf = function (l) { return ALIAS[String(l || "").toLowerCase()] ? "databoard" : oldKind(l); };
  W.kinds.databoard = 1;
  var PAL = ["#E8C468", "#5AA9E6", "#BF7AF5", "#3FD0A0", "#E2552B", "#E86A9A", "#9AA7B5", "#C8D65A", "#4FD1C5", "#F6AD55"];
  var css = document.createElement("style"); css.id = "db-css";
  css.textContent = [
    ".db{--g:#E8C468;color:#F4EBDD;font-family:'Space Grotesk','Vazirmatn',system-ui,sans-serif}",
    ".db-top{display:flex;align-items:center;gap:8px;padding:2px 14px 10px;flex-wrap:wrap}",
    ".db-nm{flex:1;min-width:0;font:600 15px Georgia,'Vazirmatn',serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-nm small{display:block;font:500 11px 'Space Grotesk','Vazirmatn';color:rgba(244,235,221,.5);margin-top:2px}",
    ".db-tabs{display:flex;gap:4px;margin:0 14px 12px;padding:3px;border-radius:13px;background:rgba(255,255,255,.06)}",
    ".db-tab{flex:1;border:0;background:none;color:rgba(244,235,221,.6);padding:8px 2px;border-radius:10px;font:500 12.5px 'Space Grotesk','Vazirmatn';cursor:pointer;transition:all .3s cubic-bezier(.3,1.3,.5,1)}.db-tab.on{background:rgba(232,196,104,.17);color:#fff;box-shadow:inset 0 0 0 1px rgba(232,196,104,.38)}",
    ".db-pane{display:none;padding:0 14px 14px;animation:dbIn .45s cubic-bezier(.3,1.2,.5,1) both}.db-pane.on{display:block}@keyframes dbIn{from{opacity:0;transform:translateY(8px)}}",
    ".db-kp{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.db-k{padding:11px 10px;border-radius:15px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);text-align:center}.db-k b{display:block;font:600 19px 'Space Grotesk';font-variant-numeric:tabular-nums}.db-k small{font-size:10.5px;color:rgba(244,235,221,.5)}",
    ".db-h{font:600 10.5px 'Space Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,235,221,.42);margin:16px 2px 8px}",
    ".db-ins{display:flex;gap:11px;padding:12px;margin-bottom:8px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);cursor:default;animation:dbIn .5s cubic-bezier(.3,1.2,.5,1) both}.db-ins[data-go]{cursor:pointer}",
    ".db-ic{flex:none;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 18%,transparent);color:var(--c)}.db-ic svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
    ".db-it{flex:1;min-width:0;font-size:13.5px;line-height:1.45;font-weight:500}.db-it small{display:block;margin-top:3px;font-weight:400;font-size:12px;color:rgba(244,235,221,.58);line-height:1.5}",
    ".db-gal{display:grid;grid-template-columns:1fr 1fr;gap:9px}.db-gc{padding:10px 10px 6px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);cursor:pointer;min-width:0;transition:transform .25s,border-color .25s}.db-gc:active{transform:scale(.97)}.db-gc small{display:block;font:500 11px 'Space Grotesk','Vazirmatn';color:rgba(244,235,221,.62);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".db-ctl{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}.db-ctl select{flex:1;min-width:96px;height:36px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:inherit;padding:0 8px;font:500 12.5px 'Space Grotesk','Vazirmatn';outline:none;color-scheme:dark}",
    ".db-ch{border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);padding:12px 8px 8px;position:relative}.db-ch svg{display:block;width:100%;height:auto;overflow:visible}",
    ".db-tip{position:absolute;left:50%;top:6px;transform:translateX(-50%);padding:5px 10px;border-radius:9px;background:rgba(0,0,0,.75);font:500 12px 'Space Grotesk','Vazirmatn';white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s}.db-tip.on{opacity:1}",
    ".db-bar{transform-box:fill-box;transform-origin:50% 100%;animation:dbBar .7s cubic-bezier(.3,1.15,.5,1) both;cursor:pointer;transition:opacity .2s}.db-bar:hover,.db-bar.sel{opacity:.82}@keyframes dbBar{from{transform:scaleY(0)}}",
    ".db-hb{transform-box:fill-box;transform-origin:0 50%;animation:dbHb .7s cubic-bezier(.3,1.15,.5,1) both}@keyframes dbHb{from{transform:scaleX(0)}}",
    ".db-ln{stroke-dasharray:var(--L);stroke-dashoffset:var(--L);animation:dbLn 1.1s .1s cubic-bezier(.4,.1,.2,1) forwards}@keyframes dbLn{to{stroke-dashoffset:0}}.db-ar{animation:dbFade 1s .5s both}@keyframes dbFade{from{opacity:0}}",
    ".db-dot{animation:dbPop .5s cubic-bezier(.3,1.5,.5,1) both;transform-box:fill-box;transform-origin:center}@keyframes dbPop{from{transform:scale(0);opacity:0}}",
    ".db-tw{overflow:auto;border-radius:16px;border:1px solid rgba(255,255,255,.08);max-height:420px;-webkit-overflow-scrolling:touch}.db-tw table{border-collapse:collapse;width:100%;font-size:12.5px;font-variant-numeric:tabular-nums}.db-tw th{position:sticky;top:0;background:#1a1510;padding:9px 11px;text-align:left;font:600 11.5px 'Space Grotesk','Vazirmatn';white-space:nowrap;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.1)}.db-tw td{padding:8px 11px;border-top:1px solid rgba(255,255,255,.05);white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}.db-tw td.n{text-align:right}.db-tw td.m{color:rgba(244,235,221,.25)}.db-tw tr:nth-child(even) td{background:rgba(255,255,255,.02)}",
    ".db-sr{width:100%;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:inherit;padding:0 13px;font:400 13.5px 'Space Grotesk','Vazirmatn';outline:none;margin-bottom:9px}",
    ".db-more{display:block;margin:9px auto 0;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;border-radius:11px;padding:8px 18px;font:500 12.5px 'Space Grotesk','Vazirmatn';cursor:pointer}",
    ".db-cl{padding:12px;margin-bottom:8px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}.db-cl-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}.db-cl-h b{flex:1;min-width:0;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-bd{font:600 9.5px 'Space Mono';letter-spacing:.08em;padding:3px 7px;border-radius:99px;background:color-mix(in srgb,var(--c) 18%,transparent);color:var(--c);text-transform:uppercase}",
    ".db-st{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;color:rgba(244,235,221,.6);margin-top:6px}.db-st b{color:#F4EBDD;font-weight:500}",
    ".db-tp{display:flex;align-items:center;gap:8px;font-size:12px;margin:3px 0}.db-tp i{flex:0 0 38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:normal;color:rgba(244,235,221,.75)}.db-tp u{flex:1;height:7px;border-radius:4px;background:rgba(255,255,255,.07);position:relative;text-decoration:none;overflow:hidden}.db-tp u s{position:absolute;inset:0 auto 0 0;border-radius:4px;background:var(--c);text-decoration:none}.db-tp span{flex:none;color:rgba(244,235,221,.5);font-variant-numeric:tabular-nums}",
    ".db-ai{margin-top:12px;padding:14px;border-radius:18px;background:linear-gradient(150deg,rgba(191,122,245,.16),rgba(191,122,245,.04));border:1px solid rgba(191,122,245,.35);font-size:13.5px;line-height:1.7;white-space:pre-wrap}.db-ai b{color:#fff}",
    ".db-sk{height:10px;border-radius:5px;margin:9px 0;background:linear-gradient(90deg,rgba(255,255,255,.06),rgba(255,255,255,.16),rgba(255,255,255,.06));background-size:200% 100%;animation:dbSk 1.2s linear infinite}@keyframes dbSk{to{background-position:-200% 0}}",
    "@media (max-width:380px){.db-kp{grid-template-columns:1fr 1fr}}@media (prefers-reduced-motion:reduce){.db *{animation:none!important}}"
  ].join("");
  document.head.appendChild(css);
  var IC = { warn: '<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>', out: '<path d="M3 17l5-6 4 4 8-10"/><circle cx="20" cy="5" r="1.4"/>', corr: '<circle cx="7" cy="8" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M9 10l6 4"/>', trend: '<path d="M3 17l6-6 4 4 8-9M15 6h6v6"/>', conc: '<path d="M12 3v9h9"/><circle cx="12" cy="12" r="9"/>' };
  var KC = { warn: "#F6AD55", out: "#E86A9A", corr: "#5AA9E6", trend: "#3FD0A0", conc: "#E8C468" };
  var TL = { en: { ov: "Overview", ch: "Charts", tb: "Table", co: "Columns", rows: "Rows", cols: "Columns", miss: "Missing", dup: "Duplicates", find: "What stands out", sugg: "Charts to start with", ai: "AI read", aiBusy: "Reading your data…", save: "Report", csv: "CSV", count: "Count", sum: "Sum", avg: "Average", max: "Max", min: "Min", auto: "Auto", search: "Search rows…", more: "Show more", x: "Group by", y: "Value", agg: "Aggregate", type: "Chart", bar: "Bars", line: "Line", scatter: "Scatter", hist: "Histogram", donut: "Donut", none: "No findings — the data looks clean and unremarkable.", gone: "This dataset is no longer on the device. Attach the file again.", saved: "Report saved to Workspace", of: "of", unique: "unique", nodata: "Nothing to chart with this selection.", sheet: "Sheet", aifail: "Couldn't reach the AI right now." }, fa: { ov: "نمای کلی", ch: "نمودار", tb: "جدول", co: "ستون‌ها", rows: "ردیف", cols: "ستون", miss: "خالی", dup: "تکراری", find: "نکته‌های مهم", sugg: "نمودارهای پیشنهادی", ai: "تحلیل هوش مصنوعی", aiBusy: "در حال خواندن داده‌ها…", save: "گزارش", csv: "CSV", count: "تعداد", sum: "جمع", avg: "میانگین", max: "بیشترین", min: "کمترین", auto: "خودکار", search: "جستجو در ردیف‌ها…", more: "نمایش بیشتر", x: "گروه‌بندی", y: "مقدار", agg: "محاسبه", type: "نمودار", bar: "ستونی", line: "خطی", scatter: "پراکندگی", hist: "هیستوگرام", donut: "دونات", none: "نکته‌ی خاصی پیدا نشد؛ داده تمیز و عادی به نظر می‌رسد.", gone: "این داده دیگر روی دستگاه نیست. فایل را دوباره پیوست کن.", saved: "گزارش در Workspace ذخیره شد", of: "از", unique: "یکتا", nodata: "با این انتخاب چیزی برای رسم نیست.", sheet: "شیت", aifail: "الان به هوش مصنوعی وصل نشد." } };

  /* ---- chart svg ---- */
  var VW = 340, VH = 190, PL = 34, PB = 24, PT = 10, PR = 8;
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function axisY(max, lg, min) { var s = ""; for (var i = 0; i <= 3; i++) { var v = (min || 0) + (max - (min || 0)) * i / 3, y = VH - PB - (VH - PB - PT) * i / 3; s += '<line x1="' + PL + '" x2="' + (VW - PR) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/><text x="' + (PL - 5) + '" y="' + (y + 3) + '" text-anchor="end" fill="rgba(244,235,221,.45)" font-size="9">' + fmt(v, lg) + '</text>'; } return s; }
  function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function svgBar(items, lg, color) {
    if (!items.length) return "";
    var max = niceMax(Math.max.apply(null, items.map(function (i) { return i[1]; }).concat([0]))), min = Math.min.apply(null, items.map(function (i) { return i[1]; }).concat([0])), neg = min < 0, lo = neg ? -niceMax(-min) : 0;
    var w = (VW - PL - PR) / items.length, bw = Math.min(34, w * .66), s = axisY(max, lg, lo), y0 = VH - PB - (VH - PB - PT) * ((0 - lo) / (max - lo));
    items.forEach(function (it, i) { var v = it[1], h = Math.abs(v) / (max - lo) * (VH - PB - PT), x = PL + w * i + (w - bw) / 2, y = v >= 0 ? y0 - h : y0; s += '<rect class="db-bar" data-i="' + i + '" x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(1, h) + '" rx="4" fill="' + (color || PAL[i % PAL.length]) + '" style="animation-delay:' + i * 40 + 'ms"/>'; if (items.length <= 12) s += '<text x="' + (x + bw / 2) + '" y="' + (VH - 8) + '" text-anchor="middle" fill="rgba(244,235,221,.55)" font-size="8.5">' + esc(clip(/^\d{4}-\d\d/.test(it[0]) ? String(it[0]).slice(2) : it[0], items.length > 8 ? 6 : 9)) + '</text>'; });
    return '<svg viewBox="0 0 ' + VW + " " + VH + '">' + s + "</svg>";
  }
  function svgLine(items, lg, color) {
    if (items.length < 2) return "";
    var vs = items.map(function (i) { return i[1]; }), mx = Math.max.apply(null, vs), mn = Math.min.apply(null, vs), lo = mn >= 0 ? 0 : -niceMax(-mn), max = niceMax(mx);
    var xs = function (i) { return PL + (VW - PL - PR) * i / (items.length - 1); }, ys = function (v) { return VH - PB - (VH - PB - PT) * (v - lo) / (max - lo || 1); };
    var d = items.map(function (it, i) { return (i ? "L" : "M") + xs(i).toFixed(1) + " " + ys(it[1]).toFixed(1); }).join(""), len = Math.round(items.length * 18 + 400);
    var area = d + "L" + xs(items.length - 1) + " " + (VH - PB) + "L" + xs(0) + " " + (VH - PB) + "Z", s = axisY(max, lg, lo);
    s += '<defs><linearGradient id="dbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (color || PAL[0]) + '" stop-opacity=".35"/><stop offset="1" stop-color="' + (color || PAL[0]) + '" stop-opacity="0"/></linearGradient></defs><path class="db-ar" d="' + area + '" fill="url(#dbg)"/><path class="db-ln" style="--L:' + len + '" d="' + d + '" fill="none" stroke="' + (color || PAL[0]) + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    var step = Math.ceil(items.length / 5); items.forEach(function (it, i) { if ((i % step === 0 && i < items.length - 1 - step / 2) || i === items.length - 1) s += '<text x="' + xs(i) + '" y="' + (VH - 8) + '" text-anchor="' + (i === 0 ? "start" : i === items.length - 1 ? "end" : "middle") + '" fill="rgba(244,235,221,.5)" font-size="8.5">' + esc(String(it[0]).slice(2)) + '</text>'; });
    items.forEach(function (it, i) { s += '<circle class="db-bar" data-i="' + i + '" cx="' + xs(i) + '" cy="' + ys(it[1]) + '" r="' + (items.length > 40 ? 5 : 3.2) + '" fill="' + (items.length > 40 ? "transparent" : "#0E0B07") + '" stroke="' + (items.length > 40 ? "transparent" : color || PAL[0]) + '" stroke-width="1.8" style="animation:none"/>'; });
    return '<svg viewBox="0 0 ' + VW + " " + VH + '">' + s + "</svg>";
  }
  function svgScatter(pts, lg, xn, yn) {
    if (pts.length < 3) return "";
    var xsr = pts.map(function (p) { return p[0]; }), ysr = pts.map(function (p) { return p[1]; }), x0 = Math.min.apply(null, xsr), x1 = Math.max.apply(null, xsr), y0 = Math.min.apply(null, ysr), y1 = Math.max.apply(null, ysr);
    var X = function (v) { return PL + (VW - PL - PR) * (v - x0) / (x1 - x0 || 1); }, Y = function (v) { return VH - PB - (VH - PB - PT) * (v - y0) / (y1 - y0 || 1); }, s = axisY(y1, lg, y0);
    var step = Math.max(1, Math.ceil(pts.length / 400)); pts.forEach(function (p, i) { if (i % step) return; s += '<circle class="db-dot" cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="2.8" fill="' + PAL[1] + '" fill-opacity=".62" style="animation-delay:' + Math.min(600, i * 2) + 'ms"/>'; });
    var n = pts.length, mx = xsr.reduce(function (a, b) { return a + b; }, 0) / n, my = ysr.reduce(function (a, b) { return a + b; }, 0) / n, sxy = 0, sxx = 0; pts.forEach(function (p) { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) * (p[0] - mx); });
    if (sxx) { var b = sxy / sxx, a = my - b * mx; s += '<line x1="' + X(x0) + '" y1="' + Y(a + b * x0) + '" x2="' + X(x1) + '" y2="' + Y(a + b * x1) + '" stroke="' + PAL[0] + '" stroke-width="2" stroke-dasharray="5 4"/>'; }
    s += '<text x="' + (VW - PR) + '" y="' + (VH - 8) + '" text-anchor="end" fill="rgba(244,235,221,.5)" font-size="9">' + esc(clip(xn, 22)) + " → " + fmt(x1, lg) + '</text><text x="' + PL + '" y="' + (VH - 8) + '" fill="rgba(244,235,221,.5)" font-size="9">' + fmt(x0, lg) + "</text>";
    return '<svg viewBox="0 0 ' + VW + " " + VH + '">' + s + "</svg>";
  }
  function svgDonut(items, lg) {
    var tot = items.reduce(function (s, i) { return s + Math.max(0, i[1]); }, 0); if (!tot) return "";
    var R = 70, r = 44, cx = 100, cy = 95, a0 = -Math.PI / 2, s = "";
    items.forEach(function (it, i) { var f = Math.max(0, it[1]) / tot, a1 = a0 + f * Math.PI * 2 - (items.length > 1 ? .02 : 0), lg2 = f > .5 ? 1 : 0; if (f > 0) { var d = "M" + (cx + R * Math.cos(a0)) + " " + (cy + R * Math.sin(a0)) + "A" + R + " " + R + " 0 " + lg2 + " 1 " + (cx + R * Math.cos(a1)) + " " + (cy + R * Math.sin(a1)) + "L" + (cx + r * Math.cos(a1)) + " " + (cy + r * Math.sin(a1)) + "A" + r + " " + r + " 0 " + lg2 + " 0 " + (cx + r * Math.cos(a0)) + " " + (cy + r * Math.sin(a0)) + "Z"; s += '<path class="db-bar" data-i="' + i + '" d="' + d + '" fill="' + PAL[i % PAL.length] + '" style="animation-delay:' + i * 60 + 'ms;transform-origin:center"/>'; } a0 += f * Math.PI * 2; });
    s += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" fill="#F4EBDD" font-size="15" font-weight="600">' + fmt(tot, lg) + "</text>";
    items.slice(0, 7).forEach(function (it, i) { s += '<rect x="196" y="' + (30 + i * 18) + '" width="9" height="9" rx="3" fill="' + PAL[i % PAL.length] + '"/><text x="211" y="' + (38 + i * 18) + '" fill="rgba(244,235,221,.8)" font-size="10">' + esc(clip(it[0], 16)) + " · " + Math.round(Math.max(0, it[1]) / tot * 100) + "%</text>"; });
    return '<svg viewBox="0 0 340 190">' + s + "</svg>";
  }
  function histo(c, bins) {
    var s = c.stats, a = c.arr.filter(function (x) { return x != null; }); bins = bins || Math.min(14, Math.max(6, Math.round(Math.sqrt(a.length)))); var w = (s.max - s.min) / bins || 1, h = new Array(bins).fill(0);
    a.forEach(function (x) { var i = Math.min(bins - 1, Math.floor((x - s.min) / w)); h[i]++; });
    return h.map(function (n, i) { return [fmt(s.min + w * i), n]; });
  }
  function group(ds, xi, yi, agg, topN) {
    var xc = ds.cols[xi], yc = yi >= 0 ? ds.cols[yi] : null, m = {}, cnt = {};
    for (var r = 0; r < ds.rows.length; r++) {
      var k;
      if (xc.type === "date") { var t = xc.arr[r]; if (t == null) continue; var span = xc.stats.max - xc.stats.min; k = new Date(t).toISOString().slice(0, span < 120 * 864e5 ? 10 : 7); }
      else { k = ds.rows[r][xi]; if (k == null) continue; k = k instanceof Date ? iso(k) : String(k); }
      var v = yc ? yc.arr[r] : 1; if (yc && v == null) continue;
      m[k] = (m[k] || 0) + (agg === "max" ? 0 : v); cnt[k] = (cnt[k] || 0) + 1;
      if (agg === "max") m[k] = Math.max(cnt[k] === 1 ? -Infinity : m[k], v); if (agg === "min") m[k] = cnt[k] === 1 ? v : Math.min(m[k], v);
    }
    var ks = Object.keys(m); if (agg === "avg") ks.forEach(function (k) { m[k] = m[k] / cnt[k]; }); if (agg === "count") ks.forEach(function (k) { m[k] = cnt[k]; });
    var out = ks.map(function (k) { return [k, m[k]]; });
    if (xc.type === "date") out.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }); else { out.sort(function (a, b) { return b[1] - a[1]; }); if (out.length > topN) { var rest = out.slice(topN - 1).reduce(function (s, i) { return s + i[1]; }, 0); out = out.slice(0, topN - 1); if (agg === "sum" || agg === "count") out.push(["…", rest]); } }
    return out;
  }
  function suggest(ds, lg) {
    var out = [], nums = ds.cols.filter(function (c) { return c.type === "number" && !c.id; }), cats = ds.cols.filter(function (c) { return c.type === "category" && c.unique >= 2 && c.unique <= 40; }), dc = ds.cols.filter(function (c) { return c.type === "date" && c.stats && c.stats.n > 5; })[0];
    var m1 = nums.filter(function (c) { return /(sales|revenue|amount|total|price|profit|فروش|مبلغ|قیمت|سود|درآمد)/i.test(c.name); })[0] || nums[0];
    if (dc && m1) out.push({ type: "line", x: dc.i, y: m1.i, agg: "sum" });
    if (cats[0]) out.push({ type: "bar", x: cats[0].i, y: m1 ? m1.i : -1, agg: m1 ? "sum" : "count" });
    if (nums[0]) out.push({ type: "hist", y: nums[Math.min(1, nums.length - 1)].i });
    if (nums.length > 1) { var best = null; for (var i = 0; i < Math.min(nums.length, 10); i++) for (var j = i + 1; j < Math.min(nums.length, 10); j++) { var r = pearson(nums[i].arr, nums[j].arr); if (r != null && (!best || Math.abs(r) > Math.abs(best[0]))) best = [r, nums[i], nums[j]]; } if (best) out.push({ type: "scatter", x: best[1].i, y: best[2].i }); }
    if (cats[1] && out.length < 4) out.push({ type: "donut", x: cats[1].i, y: m1 ? m1.i : -1, agg: m1 ? "sum" : "count" });
    return out.slice(0, 4);
  }
  function chartHTML(ds, o, lg) {
    var yc = o.y >= 0 ? ds.cols[o.y] : null, xc = o.x >= 0 ? ds.cols[o.x] : null;
    if (o.type === "hist") { if (!yc || yc.type !== "number") return ""; return svgBar(histo(yc), lg, PAL[2]); }
    if (o.type === "scatter") { if (!xc || !yc || xc.type !== "number" || yc.type !== "number") return ""; var p = []; for (var i = 0; i < ds.rows.length; i++) if (xc.arr[i] != null && yc.arr[i] != null) p.push([xc.arr[i], yc.arr[i]]); return svgScatter(p, lg, xc.name, yc.name); }
    if (!xc) return ""; var items = group(ds, o.x, yc && yc.type === "number" ? o.y : -1, yc && yc.type === "number" ? o.agg : "count", o.type === "donut" ? 8 : o.type === "line" ? 400 : 12);
    if (o.type === "line") return svgLine(items.length > 120 ? items.filter(function (_, i) { return i % Math.ceil(items.length / 120) === 0; }) : items, lg);
    if (o.type === "donut") return svgDonut(items, lg);
    return svgBar(items, lg);
  }
  function chartTitle(ds, o, t) {
    var x = o.x >= 0 ? ds.cols[o.x].name : "", y = o.y >= 0 ? ds.cols[o.y].name : "";
    if (o.type === "hist") return y; if (o.type === "scatter") return y + " ~ " + x;
    return (o.y >= 0 && ds.cols[o.y].type === "number" ? t[o.agg] + " " + y + " · " : t.count + " · ") + x;
  }

  W.builders.databoard = function (root, lines, map) {
    var lg = root._lang === "fa" ? "fa" : "en", t = TL[lg];
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var m = /(?:^|\n)\s*id\s*[:=]\s*([\w-]+)/i.exec(raw), id = m ? m[1] : (map && map.id) || "";
    root.classList.add("db");
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(lg === "fa" ? "داده" : "Data") + '</span><span class="phr-w-title"></span><button class="phr-w-btn" data-a="full">⤢</button></div><div style="padding:6px 14px 14px"><div class="db-sk" style="width:60%"></div><div class="db-sk"></div><div class="db-sk" style="width:80%"></div></div>';
    get(id).then(function (ds) {
      if (!ds || !root.isConnected) { if (root.isConnected) root.innerHTML = '<div style="padding:18px;font-size:13px;opacity:.7">' + esc(t.gone) + "</div>"; return; }
      mount(root, ds, lg, t);
    });
  };

  function mount(root, ds, lg, t) {
    var N = ds.rows.length, tab = "ov", chOpt = null, sortC = -1, sortD = 1, shown = 30, q = "", aiTxt = "";
    var miss = ds.cols.reduce(function (s, c) { return s + c.missing; }, 0), ins = insights(ds, lg), sg = suggest(ds, lg), numC = ds.cols.filter(function (c) { return c.type === "number"; });
    var ico = function (k) { return '<svg viewBox="0 0 24 24">' + (IC[k] || IC.trend) + "</svg>"; };
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(lg === "fa" ? "داده" : "Data") + '</span><span class="phr-w-title"></span><button class="phr-w-btn" data-a="full">⤢</button></div>' +
      '<div class="db-top"><div class="db-nm">' + esc(ds.name) + "<small>" + fmt(N, lg) + " " + t.rows + " · " + ds.cols.length + " " + t.cols + (ds.sheet ? " · " + t.sheet + " " + esc(ds.sheet) : "") + '</small></div><button class="phr-w-btn" data-a="ai">✦ ' + esc(t.ai) + '</button><button class="phr-w-btn" data-a="rep">' + esc(t.save) + '</button><button class="phr-w-btn" data-a="csv">' + esc(t.csv) + "</button></div>" +
      '<div class="db-tabs">' + [["ov", t.ov], ["ch", t.ch], ["tb", t.tb], ["co", t.co]].map(function (x) { return '<button class="db-tab' + (x[0] === tab ? " on" : "") + '" data-t="' + x[0] + '">' + esc(x[1]) + "</button>"; }).join("") + "</div>" +
      '<div class="db-pane on" data-p="ov"></div><div class="db-pane" data-p="ch"></div><div class="db-pane" data-p="tb"></div><div class="db-pane" data-p="co"></div>';
    var P = function (k) { return root.querySelector('[data-p="' + k + '"]'); };
    /* overview */
    var h = '<div class="db-kp"><div class="db-k"><b>' + fmt(N, lg) + "</b><small>" + t.rows + '</small></div><div class="db-k"><b>' + ds.cols.length + "</b><small>" + t.cols + '</small></div><div class="db-k"><b>' + fmt(miss, lg) + "</b><small>" + t.miss + '</small></div><div class="db-k"><b>' + fmt(ds.dups, lg) + "</b><small>" + t.dup + "</small></div></div>";
    h += '<div data-r="ai"></div><div class="db-h">' + esc(t.find) + "</div>";
    h += ins.length ? ins.map(function (i, n) { return '<div class="db-ins" style="--c:' + KC[i.k] + ";animation-delay:" + n * 50 + 'ms"' + (i.x ? ' data-go="' + esc(i.k) + "|" + esc(i.x) + "|" + esc(i.y) + '"' : "") + '><div class="db-ic">' + ico(i.k) + '</div><div class="db-it">' + esc(i.t) + "<small>" + esc(i.d) + "</small></div></div>"; }).join("") : '<div style="opacity:.6;font-size:13px;padding:6px 2px">' + esc(t.none) + "</div>";
    if (sg.length) h += '<div class="db-h">' + esc(t.sugg) + '</div><div class="db-gal">' + sg.map(function (o, i) { return '<div class="db-gc" data-s="' + i + '"><small>' + esc(chartTitle(ds, o, t)) + "</small>" + chartHTML(ds, o, lg) + "</div>"; }).join("") + "</div>";
    P("ov").innerHTML = h;
    /* charts */
    var chart = function () {
      var o = chOpt || sg[0] || { type: "bar", x: 0, y: -1, agg: "count" }; chOpt = o;
      var colOpt = function (sel, filter, none) { return (none ? '<option value="-1"' + (sel < 0 ? " selected" : "") + ">" + esc(none) + "</option>" : "") + ds.cols.filter(filter).map(function (c) { return '<option value="' + c.i + '"' + (c.i === sel ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join(""); };
      var types = ["bar", "line", "scatter", "hist", "donut"];
      var html = '<div class="db-ctl"><select data-o="type">' + types.map(function (k) { return '<option value="' + k + '"' + (o.type === k ? " selected" : "") + ">" + esc(t[k]) + "</option>"; }).join("") + "</select>";
      if (o.type !== "hist") html += '<select data-o="x">' + colOpt(o.x, function (c) { return c.type !== "empty" && (o.type === "scatter" ? c.type === "number" : true); }) + "</select>";
      html += '<select data-o="y">' + colOpt(o.y, function (c) { return c.type === "number"; }, o.type === "hist" || o.type === "scatter" ? null : t.count) + "</select>";
      if (o.type !== "hist" && o.type !== "scatter") html += '<select data-o="agg">' + ["sum", "avg", "count", "max", "min"].map(function (k) { return '<option value="' + k + '"' + (o.agg === k ? " selected" : "") + ">" + esc(t[k]) + "</option>"; }).join("") + "</select>";
      html += '</div><div class="db-ch"><div class="db-tip"></div>' + (chartHTML(ds, o, lg) || '<div style="padding:30px 10px;text-align:center;opacity:.55;font-size:13px">' + esc(t.nodata) + "</div>") + "</div>";
      P("ch").innerHTML = html; chData = null;
    }, chData = null;
    /* table */
    var rowsView = function () {
      var r = ds.rows.map(function (x, i) { return i; });
      if (q) { var ql = q.toLowerCase(); r = r.filter(function (i) { return ds.rows[i].some(function (v) { return v != null && String(v instanceof Date ? iso(v) : v).toLowerCase().indexOf(ql) >= 0; }); }); }
      if (sortC >= 0) { var c = ds.cols[sortC]; r.sort(function (a, b) { var x = c.arr ? c.arr[a] : ds.rows[a][sortC], y = c.arr ? c.arr[b] : ds.rows[b][sortC]; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * sortD; }); }
      return r;
    };
    var table = function (keep) {
      var v = rowsView(), pane = P("tb"), y = keep ? (pane.querySelector(".db-tw") || {}).scrollTop : 0;
      var cell = function (c, val) { if (val == null) return '<td class="m">—</td>'; if (val instanceof Date) return "<td>" + iso(val) + "</td>"; if (c.type === "number") { var n = toNum(val); return '<td class="n">' + (isNaN(n) ? esc(val) : full(n, lg)) + "</td>"; } if (c.type === "date" && typeof val !== "object") { var d = toDate(val); return "<td>" + (d ? iso(d) : esc(val)) + "</td>"; } return '<td title="' + esc(val) + '">' + esc(val) + "</td>"; };
      pane.innerHTML = '<input class="db-sr" placeholder="' + esc(t.search) + '" value="' + esc(q) + '"><div class="db-tw"><table><thead><tr>' + ds.cols.map(function (c) { return '<th data-c="' + c.i + '">' + esc(c.name) + (sortC === c.i ? (sortD > 0 ? " ▲" : " ▼") : "") + "</th>"; }).join("") + "</tr></thead><tbody>" + v.slice(0, shown).map(function (i) { return "<tr>" + ds.rows[i].map(function (val, ci) { return cell(ds.cols[ci], val); }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" + (v.length > shown ? '<button class="db-more">' + esc(t.more) + " · " + fmt(v.length - shown, lg) + "</button>" : '<div style="text-align:center;font-size:11.5px;opacity:.5;margin-top:8px">' + fmt(v.length, lg) + " " + t.rows + "</div>");
      if (keep) { var tw = pane.querySelector(".db-tw"); if (tw) tw.scrollTop = y; var si = pane.querySelector(".db-sr"); if (si) { si.focus(); si.setSelectionRange(q.length, q.length); } }
    };
    /* columns */
    var TC = { number: "#5AA9E6", category: "#E8C468", date: "#3FD0A0", text: "#9AA7B5", bool: "#BF7AF5", empty: "#555" };
    var cols = function () {
      P("co").innerHTML = ds.cols.map(function (c) {
        var body = "", s = c.stats;
        if (c.type === "number" && s) { var hs = histo(c, 18), mx = Math.max.apply(null, hs.map(function (x) { return x[1]; })) || 1; body = '<svg viewBox="0 0 300 36" style="width:100%;height:36px;display:block">' + hs.map(function (x, i) { var hh = Math.max(1.5, x[1] / mx * 34); return '<rect x="' + (i * 16.7 + 1) + '" y="' + (36 - hh) + '" width="14.5" height="' + hh + '" rx="2.5" fill="' + TC.number + '" opacity=".85"/>'; }).join("") + '</svg><div class="db-st"><span>min <b>' + fmt(s.min, lg) + "</b></span><span>" + t.avg + " <b>" + fmt(s.mean, lg) + "</b></span><span>median <b>" + fmt(s.median, lg) + "</b></span><span>max <b>" + fmt(s.max, lg) + "</b></span></div>"; }
        else if (c.type === "date" && s) body = '<div class="db-st"><span><b>' + iso(new Date(s.min)) + "</b> → <b>" + iso(new Date(s.max)) + "</b></span></div>";
        else if (c.top) { var tm = c.top[0][1] || 1; body = c.top.slice(0, 5).map(function (x) { return '<div class="db-tp" style="--c:' + TC[c.type] + '"><i>' + esc(x[0]) + "</i><u><s style=\"width:" + (x[1] / tm * 100) + '%"></s></u><span>' + fmt(x[1], lg) + "</span></div>"; }).join("") + '<div class="db-st"><span><b>' + fmt(c.unique, lg) + "</b> " + t.unique + "</span></div>"; }
        return '<div class="db-cl" style="--c:' + TC[c.type] + '"><div class="db-cl-h"><b>' + esc(c.name) + '</b><span class="db-bd">' + c.type + "</span>" + (c.missing ? '<span class="db-st" style="margin:0"><span>' + Math.round(c.missing / N * 100) + "% " + t.miss + "</span></span>" : "") + "</div>" + body + "</div>";
      }).join("");
    };
    var built = { ch: 0, tb: 0, co: 0 };
    function show(k) {
      tab = k; [].forEach.call(root.querySelectorAll(".db-tab"), function (b) { b.classList.toggle("on", b.getAttribute("data-t") === k); });
      [].forEach.call(root.querySelectorAll(".db-pane"), function (p) { p.classList.toggle("on", p.getAttribute("data-p") === k); });
      if (k === "ch" && !built.ch) { built.ch = 1; chart(); } if (k === "tb" && !built.tb) { built.tb = 1; table(); } if (k === "co" && !built.co) { built.co = 1; cols(); }
    }
    root.addEventListener("click", function (e) {
      var el = e.target, b;
      if ((b = el.closest(".db-tab"))) { show(b.getAttribute("data-t")); try { haptic("light"); } catch (x) {} return; }
      if ((b = el.closest("[data-s]"))) { chOpt = sg[+b.getAttribute("data-s")]; built.ch = 1; chart(); show("ch"); return; }
      if ((b = el.closest("[data-go]"))) { var g = b.getAttribute("data-go").split("|"), xi = ds.cols.filter(function (c) { return c.name === g[1]; })[0], yi = ds.cols.filter(function (c) { return c.name === g[2]; })[0]; if (g[0] === "corr" && xi && yi) chOpt = { type: "scatter", x: xi.i, y: yi.i }; else if (g[0] === "trend" && xi && yi) chOpt = { type: "line", x: xi.i, y: yi.i, agg: "sum" }; else if (g[0] === "conc" && xi && yi) chOpt = { type: "donut", x: xi.i, y: yi.i, agg: "sum" }; else return; built.ch = 1; chart(); show("ch"); return; }
      if ((b = el.closest("th[data-c]"))) { var c = +b.getAttribute("data-c"); if (sortC === c) sortD = -sortD; else { sortC = c; sortD = 1; } table(true); return; }
      if (el.closest(".db-more")) { shown += 40; table(true); return; }
      var bar = el.closest("[data-i]");
      if (bar && el.closest(".db-ch")) { var tip = root.querySelector(".db-tip"), items = tipItems(); var i = +bar.getAttribute("data-i"); if (items && items[i]) { tip.textContent = items[i][0] + " · " + fmt(items[i][1], lg); tip.classList.add("on"); clearTimeout(tip._t); tip._t = setTimeout(function () { tip.classList.remove("on"); }, 2200); try { haptic("light"); } catch (x) {} } return; }
      var a = el.closest("[data-a]"); if (!a) return; var act = a.getAttribute("data-a");
      if (act === "csv") dl(ds);
      if (act === "rep") report(ds, ins, lg, t);
      if (act === "ai") askAI(a);
    });
    root.addEventListener("change", function (e) {
      var s = e.target.closest("[data-o]"); if (!s) return; var k = s.getAttribute("data-o"), v = s.value; chOpt[k] = k === "type" || k === "agg" ? v : +v;
      if (k === "type") { var nums = ds.cols.filter(function (c) { return c.type === "number"; }); if ((v === "scatter") && (ds.cols[chOpt.x] || {}).type !== "number") chOpt.x = (nums[0] || { i: 0 }).i; if ((v === "hist" || v === "scatter") && (chOpt.y < 0 || (ds.cols[chOpt.y] || {}).type !== "number")) chOpt.y = (nums[1] || nums[0] || { i: 0 }).i; if (!chOpt.agg) chOpt.agg = "sum"; }
      chart();
    });
    root.addEventListener("input", function (e) { if (e.target.classList.contains("db-sr")) { q = e.target.value; shown = 30; clearTimeout(root._qt); root._qt = setTimeout(function () { table(true); }, 160); } });
    function tipItems() { var o = chOpt; if (!o) return null; var yc = o.y >= 0 ? ds.cols[o.y] : null; if (o.type === "hist") return yc && yc.type === "number" ? histo(yc) : null; if (o.type === "scatter") return null; var items = group(ds, o.x, yc && yc.type === "number" ? o.y : -1, yc && yc.type === "number" ? o.agg : "count", o.type === "donut" ? 8 : o.type === "line" ? 400 : 12); if (o.type === "line" && items.length > 120) items = items.filter(function (_, i) { return i % Math.ceil(items.length / 120) === 0; }); return items; }
    function askAI(btn) {
      var box = root.querySelector('[data-r="ai"]'); if (btn.disabled) return; btn.disabled = true;
      box.innerHTML = '<div class="db-ai"><div class="db-sk" style="width:90%"></div><div class="db-sk"></div><div class="db-sk" style="width:70%"></div></div>'; show("ov");
      var sys = { role: "system", content: "You are a sharp data analyst. Reply in " + (lg === "fa" ? "Persian (فارسی)" : "English") + ". Be concrete and brief: exactly 4 numbered findings that cite column names and numbers, then 'Do next:' with 2 actions, then 'Careful:' with 1 caveat about the data quality or what the data cannot prove. No filler, no restating the schema." };
      var usr = { role: "user", content: summary(ds, lg) };
      Promise.resolve().then(function () { return window.fetchAI([sys, usr], false, false); }).then(function (txt) {
        aiTxt = String(txt || "").trim(); box.innerHTML = '<div class="db-ai">' + esc(aiTxt).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") + "</div>";
      }).catch(function () { box.innerHTML = '<div class="db-ai">' + esc(t.aifail) + "</div>"; }).then(function () { btn.disabled = false; });
    }
    W.attachExpand(root, root.querySelector('[data-a="full"]'), function () {});
  }
  function dl(ds) {
    var csv = [ds.cols.map(function (c) { return '"' + c.name.replace(/"/g, '""') + '"'; }).join(",")].concat(ds.rows.map(function (r) { return r.map(function (v) { if (v == null) return ""; if (v instanceof Date) v = iso(v); v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); })).join("\n");
    var b = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = (ds.name || "data").replace(/\.\w+$/, "") + "-clean.csv"; a.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
  }
  function report(ds, ins, lg, t) {
    var L = ["# " + ds.name, "", fmt(ds.rows.length, lg) + " " + t.rows + " · " + ds.cols.length + " " + t.cols, "", "## " + t.find, ""];
    ins.forEach(function (i) { L.push("- **" + i.t + "** — " + i.d); }); L.push("", "## " + t.co, "");
    ds.cols.forEach(function (c) { var s = c.stats; L.push("- **" + c.name + "** (" + c.type + ")" + (c.missing ? ", " + c.missing + " " + t.miss : "") + (c.type === "number" && s ? " — min " + fmt(s.min, lg) + ", " + t.avg + " " + fmt(s.mean, lg) + ", max " + fmt(s.max, lg) : "")); });
    try {
      var chat = window.chats && chats.find(function (c) { return c.id == window.curId; }), name = (ds.name || "data").replace(/\.\w+$/, "") + "-report.md";
      if (chat) { chat.files = chat.files || []; var ex = chat.files.filter(function (f) { return f.name === name; })[0], body = L.join("\n"); if (ex) { ex.content = body; ex.ts = Date.now(); } else chat.files.push({ id: Date.now() + "-r", type: "doc", name: name, content: body, extra: "", ts: Date.now() }); window.save && save(); window.updateFilesBadge && updateFilesBadge(); window.showToast && showToast(t.saved, "success"); return; }
    } catch (e) {}
    var b = new Blob([L.join("\n")], { type: "text/markdown" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = "report.md"; a.click();
  }
})();
