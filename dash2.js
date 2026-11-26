/* dash2.js — Live Dashboard from a CSV / Excel file.
   Drop a file (or paste data) → KPIs, auto charts (trend, top categories, share), filters, searchable sortable table, AI insight
   (only aggregates are sent to the model, never raw rows), CSV export of the filtered view, and a share link (the data travels
   inside the link's #fragment, compressed — no server involved).
   Open:  PHR_DASH.open()  ·  tools tile "Live Dashboard"  ·  chat fence ```livedash (inline CSV) → mini card + "Open". */
(function () {
  "use strict";
  if (window.__dash2) return; window.__dash2 = 1;
  var D = document, PAL = ["#F4D98B", "#6FB7FF", "#58C48F", "#FF8F6B", "#B58CFF", "#FF6FA8", "#7BE0D8", "#C4C46B"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fa() { return /[؀-ۿ]/.test((D.getElementById("ui") || {}).value || "") || /[؀-ۿ]/.test(D.title || ""); }
  var S = {
    en: { title: "Live Dashboard", sub: "Drop a CSV or Excel file", pick: "Choose file", paste: "…or paste data here", build: "Build dashboard", drop: "Drag a file here or tap to choose", rows: "Rows", filters: "Filters", search: "Search rows", all: "All", measure: "Measure", group: "Group by", by: "by", count: "Count", sum: "Sum", avg: "Average", trend: "Trend", top: "Top groups", share: "Share", table: "Data", more: "Show more", insight: "AI insight", thinking: "Reading the numbers…", copy: "Link copied", csv: "Export CSV", reset: "Reset filters", empty: "No rows match", err: "Could not read this file", back: "Close", shown: "shown", vs: "vs previous half", sheet: "Sheet", big: "Large file — using the first 20,000 rows", linkBig: "Data is too large for a link — shared the first rows only", fail: "AI insight is unavailable right now", demo: "Try sample data", shareView: "Shared dashboard · read only", mini: "Open dashboard", noNum: "No numeric column found — showing counts" },
    fa: { title: "داشبورد زنده", sub: "فایل CSV یا اکسل را بینداز", pick: "انتخاب فایل", paste: "…یا داده را اینجا بچسبان", build: "ساخت داشبورد", drop: "فایل را اینجا بینداز یا بزن تا انتخاب کنی", rows: "ردیف", filters: "فیلترها", search: "جستجو در ردیف‌ها", all: "همه", measure: "معیار", group: "دسته‌بندی", by: "بر اساس", count: "تعداد", sum: "جمع", avg: "میانگین", trend: "روند", top: "برترین‌ها", share: "اشتراک", table: "داده", more: "نمایش بیشتر", insight: "تحلیل هوشمند", thinking: "در حال خواندن اعداد…", copy: "لینک کپی شد", csv: "خروجی CSV", reset: "پاک کردن فیلترها", empty: "ردیفی پیدا نشد", err: "این فایل خوانده نشد", back: "بستن", shown: "نمایش", vs: "نسبت به نیمه قبل", sheet: "شیت", big: "فایل بزرگ است — ۲۰٬۰۰۰ ردیف اول استفاده شد", linkBig: "داده برای لینک بزرگ است — فقط ردیف‌های اول به اشتراک رفت", fail: "تحلیل هوشمند فعلاً در دسترس نیست", demo: "داده نمونه", shareView: "داشبورد اشتراکی · فقط خواندنی", mini: "باز کردن داشبورد", noNum: "ستون عددی پیدا نشد — تعداد نمایش داده می‌شود" }
  };
  function T(k) { return (S[fa() ? "fa" : "en"][k]) || S.en[k] || k; }
  function toEn(s) { return String(s).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/٫/g, ".").replace(/٬/g, ","); }

  /* ------------------------------------------------ parsing */
  function parseCSV(text) {
    text = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    var first = text.split("\n").slice(0, 5).join("\n"), delim = ",", best = 0;
    [",", ";", "\t", "|"].forEach(function (d) { var n = first.split(d).length; if (n > best) { best = n; delim = d; } });
    var rows = [], row = [], cur = "", q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === delim) { row.push(cur); cur = ""; } else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; } else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ""; }); });
  }
  function toNum(v) { if (typeof v === "number") return v; var s = toEn(v).trim().replace(/[\s$€£¥﷼٪%]|تومان|ریال/g, ""); if (!s || !/^[-+(]?\d[\d,]*\.?\d*\)?$|^[-+]?\.\d+$/.test(s)) return NaN; var neg = /^\(/.test(s); s = s.replace(/[(),]/g, ""); var n = parseFloat(s); return neg ? -n : n; }
  function toDate(v) { if (v instanceof Date) return v; var s = toEn(v).trim(); if (!/\d/.test(s) || /^\d+(\.\d+)?$/.test(s) || s.length < 6) return null; var d = new Date(s); return isNaN(d) ? null : d; }
  function build(rows, name) {
    var head = rows[0].map(function (h, i) { h = String(h == null ? "" : h).trim(); return h || "Column " + (i + 1); }), seen = {};
    head = head.map(function (h) { if (seen[h]) { seen[h]++; return h + " " + seen[h]; } seen[h] = 1; return h; });
    var body = rows.slice(1), big = body.length > 20000; if (big) body = body.slice(0, 20000);
    var cols = head.map(function (h, ci) {
      var vals = body.map(function (r) { return r[ci]; }), ne = vals.filter(function (v) { return v !== "" && v != null; }), n = ne.length || 1, s = ne.slice(0, 300);
      var numOk = s.filter(function (v) { return !isNaN(toNum(v)); }).length / (s.length || 1), dateOk = s.filter(function (v) { return toDate(v); }).length / (s.length || 1), u = {}; ne.forEach(function (v) { u[v] = 1; });
      var uc = Object.keys(u).length, type = numOk >= .9 ? "num" : dateOk >= .9 ? "date" : (uc <= 40 || uc / n < .5) ? "cat" : "text";
      if (type === "num" && uc <= 6 && /id|code|کد|شماره/i.test(h)) type = "cat";
      return { name: h, type: type, uniq: uc };
    });
    var data = body.map(function (r) { return cols.map(function (c, ci) { var v = r[ci]; if (c.type === "num") { var x = toNum(v); return isNaN(x) ? null : x; } if (c.type === "date") { var d = toDate(v); return d ? d.getTime() : null; } return v == null ? "" : String(v); }); });
    return { name: name || "Data", cols: cols, rows: data, big: big };
  }
  function readFile(file) {
    return new Promise(function (res, rej) {
      var ext = (file.name.split(".").pop() || "").toLowerCase(), rd = new FileReader();
      rd.onerror = function () { rej(new Error("read")); };
      if (/^(xlsx|xls|xlsm|ods)$/.test(ext)) {
        if (!window.XLSX) return rej(new Error("xlsx missing"));
        rd.onload = function () { try { var wb = XLSX.read(rd.result, { type: "array", cellDates: true }); res({ sheets: wb.SheetNames, get: function (n) { return XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }); }, name: file.name }); } catch (e) { rej(e); } };
        rd.readAsArrayBuffer(file);
      } else { rd.onload = function () { res({ sheets: [""], get: function () { return parseCSV(rd.result); }, name: file.name }); }; rd.readAsText(file); }
    });
  }

  /* ------------------------------------------------ aggregation helpers */
  function fmtN(v) { if (v == null || isNaN(v)) return "—"; var a = Math.abs(v); if (a >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B"; if (a >= 1e6) return (v / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M"; if (a >= 1e4) return (v / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K"; return (Math.round(v * 100) / 100).toLocaleString("en-US"); }
  function fmtD(t, g) { var d = new Date(t); return g === "day" ? d.toISOString().slice(0, 10) : g === "year" ? String(d.getFullYear()) : d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
  function agg(vals, how) { if (how === "count") return vals.length; var n = vals.filter(function (x) { return x != null; }); if (!n.length) return 0; var s = n.reduce(function (a, b) { return a + b; }, 0); return how === "avg" ? s / n.length : s; }
  var SUMNAME = /amount|total|price|sales|revenue|qty|quantity|cost|profit|income|spend|مبلغ|فروش|قیمت|تعداد|درآمد|هزینه|سود|جمع/i;

  /* ------------------------------------------------ CSS */
  var CSS = "#dash-ov{position:fixed;inset:0;z-index:10060;display:none;background:#0d0906;color:#F4EBDD;font-family:'Space Grotesk','Vazirmatn',-apple-system,system-ui,sans-serif;overflow:auto;-webkit-overflow-scrolling:touch}#dash-ov.on{display:block;animation:dsIn .35s cubic-bezier(.32,.72,0,1)}@keyframes dsIn{from{opacity:0;transform:translateY(24px)}}" +
    ".ds{max-width:1040px;margin:0 auto;padding:calc(14px + env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom))}.ds-h{display:flex;align-items:center;gap:10px;margin-bottom:14px}.ds-h h1{margin:0;font-size:20px;letter-spacing:-.02em;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ds-h small{display:block;font-weight:400;font-size:12px;opacity:.55;margin-top:2px}" +
    ".ds-b{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#F4EBDD;border-radius:12px;padding:9px 14px;font:600 13px inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}.ds-b.g{background:linear-gradient(135deg,#F4D98B,#C79A3E);color:#1a1206;border-color:transparent}.ds-x{width:36px;height:36px;border-radius:50%;padding:0}" +
    ".ds-drop{display:grid;place-items:center;text-align:center;gap:10px;padding:46px 20px;border-radius:24px;border:1.5px dashed rgba(244,217,139,.45);background:radial-gradient(120% 120% at 50% 0,rgba(244,217,139,.1),transparent 60%),rgba(255,255,255,.03);cursor:pointer}.ds-drop.hot{background:rgba(244,217,139,.14)}.ds-drop b{font-size:16px}.ds-drop span{opacity:.6;font-size:13px}" +
    ".ds-ta{width:100%;box-sizing:border-box;margin-top:14px;min-height:90px;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font:12.5px/1.5 'IBM Plex Mono',monospace;outline:0;-webkit-user-select:text;user-select:text}" +
    ".ds-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:6px 0 14px}.ds-k{padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))}.ds-k small{display:block;font:600 10.5px 'Space Mono',monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ds-k b{display:block;font-size:26px;letter-spacing:-.02em;margin:6px 0 2px;direction:ltr;text-align:start}.ds-k i{font-style:normal;font-size:11.5px;font-weight:700}.ds-k i.u{color:#7be0ae}.ds-k i.d{color:#ff8d7f}" +
    ".ds-f{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.ds-f input[type=search],.ds-f select{height:38px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:13.5px inherit;outline:0;max-width:100%}.ds-f select option{background:#1b150e}.ds-f input[type=search]{flex:1;min-width:140px}" +
    ".ds-ch{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:10px;align-items:center}.ds-ch::-webkit-scrollbar{display:none}.ds-ch em{font-style:normal;flex:none;font:700 10.5px 'Space Mono',monospace;opacity:.5;letter-spacing:.08em;text-transform:uppercase;margin-inline-end:4px}.ds-ch button{flex:none;padding:6px 12px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(244,235,221,.85);font:600 12px inherit;cursor:pointer}.ds-ch button.on{background:#F4D98B;color:#1a1206;border-color:transparent}" +
    ".ds-g{display:grid;grid-template-columns:1fr;gap:12px}@media(min-width:760px){.ds-g{grid-template-columns:1.4fr 1fr}.ds-g .w{grid-column:1/-1}}.ds-c{padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));min-width:0}.ds-c h3{margin:0 0 10px;font:700 11px 'Space Mono',monospace;letter-spacing:.12em;text-transform:uppercase;opacity:.6;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ds-c h3 select{height:28px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:600 11px inherit;padding:0 6px;max-width:150px;text-transform:none;letter-spacing:0}.ds-c h3 select option{background:#1b150e}.ds-c svg{width:100%;height:auto;display:block;overflow:visible}" +
    ".ds-bar{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12.5px;cursor:pointer}.ds-bar .l{flex:none;width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ds-bar .t{flex:1;height:18px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden}.ds-bar .t i{display:block;height:100%;border-radius:6px;transition:width .5s cubic-bezier(.2,.8,.2,1)}.ds-bar .v{flex:none;width:58px;text-align:end;font-family:'IBM Plex Mono',monospace;font-size:11.5px;opacity:.8;direction:ltr}.ds-bar.on .l{color:#F4D98B;font-weight:700}" +
    ".ds-leg{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:10px;font-size:11.5px;opacity:.85}.ds-leg span::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-inline-end:6px}" +
    ".ds-tb{overflow:auto;max-height:420px;border-radius:12px}.ds-tb table{border-collapse:collapse;width:100%;font-size:12.5px;direction:ltr}.ds-tb th{position:sticky;top:0;background:#17110b;text-align:start;padding:9px 10px;font:700 11px 'Space Grotesk';letter-spacing:.03em;border-bottom:1px solid rgba(255,255,255,.14);white-space:nowrap;cursor:pointer}.ds-tb td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06);white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}.ds-tb td.n{text-align:end;font-family:'IBM Plex Mono',monospace}" +
    ".ds-ai{margin:0 0 12px;padding:14px 16px;border-radius:18px;border:1px solid rgba(244,217,139,.35);background:rgba(244,217,139,.07);font-size:14px;line-height:1.75;white-space:pre-wrap}.ds-ai b{color:#F4D98B}.ds-ro{font:700 11px 'Space Mono',monospace;letter-spacing:.1em;color:#F4D98B;opacity:.9;margin:0 0 10px}" +
    ".ds-mini{padding:14px}.ds-mini .ds-kp{margin:8px 0}.ds-tip{position:fixed;pointer-events:none;z-index:10070;padding:6px 10px;border-radius:9px;background:#000c;color:#fff;font:12px 'Space Grotesk';display:none;direction:ltr}" +
    "body.light-theme #dash-ov{background:#faf6ee;color:#241c0e}body.light-theme .ds-k,body.light-theme .ds-c{border-color:rgba(60,45,20,.12);background:rgba(255,255,255,.7)}body.light-theme .ds-b,body.light-theme .ds-f input,body.light-theme .ds-f select,body.light-theme .ds-c h3 select{color:#241c0e;background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12)}body.light-theme .ds-tb th{background:#efe7d6}";
  var st = D.createElement("style"); st.id = "ds-css"; st.textContent = CSS; D.head.appendChild(st);

  /* ------------------------------------------------ dashboard renderer */
  function dashboard(host, ds, opts) {
    opts = opts || {};
    var C = ds.cols, nums = C.map(function (c, i) { return c.type === "num" ? i : -1; }).filter(function (i) { return i >= 0; }), cats = C.map(function (c, i) { return c.type === "cat" && c.uniq > 1 ? i : -1; }).filter(function (i) { return i >= 0; }), dates = C.map(function (c, i) { return c.type === "date" ? i : -1; }).filter(function (i) { return i >= 0; });
    var pm = nums.filter(function (i) { return /revenue|amount|total|sales|income|profit|درآمد|فروش|مبلغ|جمع/i.test(C[i].name); })[0]; if (pm == null) pm = nums.filter(function (i) { return SUMNAME.test(C[i].name); })[0]; if (pm == null) pm = nums[0];
    var state = { f: {}, q: "", m: nums.length ? pm : -1, how: nums.length ? (SUMNAME.test(C[pm].name) ? "sum" : "avg") : "count", g: cats.length ? cats[0] : -1, sort: -1, dir: 1, shown: 50, g2: cats.length > 1 ? cats[1] : -1 };
    function filtered() {
      var q = state.q.toLowerCase();
      return ds.rows.filter(function (r) {
        for (var ci in state.f) { var set = state.f[ci]; if (set && Object.keys(set).length && !set[r[ci]]) return false; }
        if (q) { var hit = false; for (var i = 0; i < r.length; i++) { var v = C[i].type === "date" && r[i] != null ? fmtD(r[i], "day") : r[i]; if (v != null && String(v).toLowerCase().indexOf(q) >= 0) { hit = true; break; } } if (!hit) return false; }
        return true;
      });
    }
    function col(rows, i) { return rows.map(function (r) { return r[i]; }); }
    function groupBy(rows, gi, mi, how) { var m = {}; rows.forEach(function (r) { var k = r[gi] === "" || r[gi] == null ? "—" : r[gi]; (m[k] = m[k] || []).push(mi >= 0 ? r[mi] : 1); }); return Object.keys(m).map(function (k) { return { k: k, v: agg(m[k], mi >= 0 ? how : "count"), n: m[k].length }; }).sort(function (a, b) { return b.v - a.v; }); }
    function series(rows, di, mi, how) {
      var ts = col(rows, di).filter(function (x) { return x != null; }); if (!ts.length) return { g: "month", pts: [] };
      var span = (Math.max.apply(null, ts) - Math.min.apply(null, ts)) / 864e5, g = span > 800 ? "year" : span > 70 ? "month" : "day", m = {};
      rows.forEach(function (r) { if (r[di] == null) return; var k = fmtD(r[di], g); (m[k] = m[k] || []).push(mi >= 0 ? r[mi] : 1); });
      return { g: g, pts: Object.keys(m).sort().map(function (k) { return { k: k, v: agg(m[k], mi >= 0 ? how : "count") }; }) };
    }
    function kpis(rows) {
      var out = [{ l: T("rows"), v: rows.length.toLocaleString("en-US"), d: null }];
      var di = dates[0];
      nums.slice(0, 3).forEach(function (ni) {
        var how = SUMNAME.test(C[ni].name) ? "sum" : "avg", v = agg(col(rows, ni), how), d = null;
        if (di != null && rows.length > 3) { var s = rows.filter(function (r) { return r[di] != null; }).sort(function (a, b) { return a[di] - b[di]; }), h = Math.floor(s.length / 2), a = agg(col(s.slice(0, h), ni), how), b = agg(col(s.slice(h), ni), how); if (a) d = (b - a) / Math.abs(a) * 100; }
        out.push({ l: C[ni].name + " · " + T(how), v: fmtN(v), d: d });
      });
      return out;
    }
    host.innerHTML = '<div class="ds-ai" hidden></div><div class="ds-kp"></div><div class="ds-f"><input type="search" placeholder="' + esc(T("search")) + '"><button class="ds-b" data-a="reset">' + esc(T("reset")) + '</button></div><div class="ds-fc"></div><div class="ds-g"><div class="ds-c w" data-c="trend"></div><div class="ds-c" data-c="top"></div><div class="ds-c" data-c="share"></div><div class="ds-c w" data-c="table"></div></div>';
    var q = function (s) { return host.querySelector(s); };

    function paintFilters() {
      q(".ds-fc").innerHTML = cats.slice(0, 3).map(function (ci) {
        var vals = groupBy(ds.rows, ci, -1).slice(0, 12), set = state.f[ci] || {}, any = Object.keys(set).length;
        return '<div class="ds-ch"><em>' + esc(C[ci].name) + '</em><button data-ci="' + ci + '" data-v="" class="' + (any ? "" : "on") + '">' + esc(T("all")) + "</button>" + vals.map(function (x) { return '<button data-ci="' + ci + '" data-v="' + esc(x.k) + '" class="' + (set[x.k] ? "on" : "") + '">' + esc(String(x.k).slice(0, 22)) + "</button>"; }).join("") + "</div>";
      }).join("");
    }
    function sel(id, opts2, cur) { return '<select data-s="' + id + '">' + opts2.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; }
    function line(pts, w, h) {
      if (pts.length < 2) return '<div class="em" style="opacity:.5;padding:20px 0">—</div>';
      var mx = Math.max.apply(null, pts.map(function (p) { return p.v; })), mn = Math.min(0, Math.min.apply(null, pts.map(function (p) { return p.v; }))), px = 36, py = 10, iw = w - px - 8, ih = h - py - 24, rng = (mx - mn) || 1;
      var X = function (i) { return px + i / (pts.length - 1) * iw; }, Y = function (v) { return py + ih - (v - mn) / rng * ih; };
      var d = pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.v).toFixed(1); }).join(" "), area = d + " L" + X(pts.length - 1).toFixed(1) + " " + (py + ih) + " L" + px + " " + (py + ih) + "Z";
      var grid = [0, .5, 1].map(function (t) { var y = py + ih - t * ih; return '<line x1="' + px + '" x2="' + (w - 8) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.09)"/><text x="' + (px - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="rgba(255,255,255,.5)">' + fmtN(mn + t * rng) + "</text>"; }).join("");
      var xl = [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (i) { return '<text x="' + X(i) + '" y="' + (h - 6) + '" text-anchor="' + (i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle") + '" font-size="10" fill="rgba(255,255,255,.5)">' + esc(pts[i].k) + "</text>"; }).join("");
      var dots = pts.length <= 40 ? pts.map(function (p, i) { return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3.2" fill="#F4D98B"><title>' + esc(p.k + ": " + fmtN(p.v)) + "</title></circle>"; }).join("") : "";
      return '<svg viewBox="0 0 ' + w + " " + h + '" role="img"><defs><linearGradient id="dsg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F4D98B" stop-opacity=".35"/><stop offset="1" stop-color="#F4D98B" stop-opacity="0"/></linearGradient></defs>' + grid + '<path d="' + area + '" fill="url(#dsg)"/><path d="' + d + '" fill="none" stroke="#F4D98B" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' + dots + xl + "</svg>";
    }
    function donut(items) {
      var tot = items.reduce(function (a, b) { return a + Math.max(0, b.v); }, 0) || 1, a0 = -Math.PI / 2, R = 62, r = 38, segs = "";
      items.forEach(function (it, i) { var f = Math.max(0, it.v) / tot, a1 = a0 + f * Math.PI * 2; if (f > 0.9999) a1 -= .001; var x0 = 80 + R * Math.cos(a0), y0 = 80 + R * Math.sin(a0), x1 = 80 + R * Math.cos(a1), y1 = 80 + R * Math.sin(a1), x2 = 80 + r * Math.cos(a1), y2 = 80 + r * Math.sin(a1), x3 = 80 + r * Math.cos(a0), y3 = 80 + r * Math.sin(a0), lg = f > .5 ? 1 : 0; segs += '<path d="M' + x0 + " " + y0 + "A" + R + " " + R + " 0 " + lg + " 1 " + x1 + " " + y1 + "L" + x2 + " " + y2 + "A" + r + " " + r + " 0 " + lg + " 0 " + x3 + " " + y3 + 'Z" fill="' + PAL[i % PAL.length] + '"><title>' + esc(it.k + ": " + fmtN(it.v) + " (" + Math.round(f * 100) + "%)") + "</title></path>"; a0 = a1; });
      return '<svg viewBox="0 0 160 160" style="max-width:190px;margin:0 auto">' + segs + '<text x="80" y="85" text-anchor="middle" font-size="15" font-weight="700" fill="#F4EBDD">' + fmtN(tot) + "</text></svg><div class=\"ds-leg\">" + items.map(function (it, i) { return '<span style="--c:' + PAL[i % PAL.length] + '">' + esc(String(it.k).slice(0, 18)) + " · " + Math.round(Math.max(0, it.v) / tot * 100) + "%</span>"; }).join("") + "</div>";
    }
    function paint() {
      var rows = filtered(), K = kpis(rows);
      q(".ds-kp").innerHTML = K.map(function (k) { return '<div class="ds-k"><small>' + esc(k.l) + "</small><b>" + esc(k.v) + "</b>" + (k.d == null || !isFinite(k.d) ? "" : '<i class="' + (k.d >= 0 ? "u" : "d") + '">' + (k.d >= 0 ? "▲ " : "▼ ") + Math.abs(k.d).toFixed(1) + "% " + esc(T("vs")) + "</i>") + "</div>"; }).join("");
      var how = state.m >= 0 ? state.how : "count", mOpts = [[-1, T("count")]].concat(nums.map(function (i) { return [i, C[i].name]; })), hOpts = [["sum", T("sum")], ["avg", T("avg")]];
      var head = function (t, extra) { return "<h3>" + esc(t) + (extra || "") + "</h3>"; };
      var tr = q('[data-c="trend"]'), tp = q('[data-c="top"]'), sh = q('[data-c="share"]');
      if (dates.length) { var se = series(rows, dates[0], state.m, how); tr.hidden = false; tr.innerHTML = head(T("trend"), " " + sel("m", mOpts, state.m) + (state.m >= 0 ? sel("how", hOpts, how) : "")) + line(se.pts, 640, 220); } else { tr.hidden = !nums.length && !cats.length; tr.innerHTML = head(T("measure"), " " + sel("m", mOpts, state.m) + (state.m >= 0 ? sel("how", hOpts, how) : "")) + '<div style="font-size:13px;opacity:.7;line-height:1.7">' + (nums.length ? "" : esc(T("noNum"))) + "</div>"; if (!dates.length && !nums.length) tr.hidden = true; }
      if (state.g >= 0) {
        var gOpts = cats.map(function (i) { return [i, C[i].name]; }), gr = groupBy(rows, state.g, state.m, how).slice(0, 8), mx = Math.max.apply(null, gr.map(function (x) { return Math.abs(x.v); }).concat([1])), set = state.f[state.g] || {};
        tp.hidden = false; tp.innerHTML = head(T("top"), " " + sel("g", gOpts, state.g)) + (gr.length ? gr.map(function (x, i) { return '<div class="ds-bar ' + (set[x.k] ? "on" : "") + '" data-ci="' + state.g + '" data-v="' + esc(x.k) + '"><span class="l">' + esc(x.k) + '</span><span class="t"><i style="width:' + Math.max(2, Math.abs(x.v) / mx * 100) + "%;background:" + PAL[i % PAL.length] + '"></i></span><span class="v">' + fmtN(x.v) + "</span></div>"; }).join("") : '<div style="opacity:.5">' + esc(T("empty")) + "</div>");
      } else tp.hidden = true;
      var g2 = state.g2 >= 0 ? state.g2 : state.g;
      if (g2 >= 0) { var gr2 = groupBy(rows, g2, state.m, how).slice(0, 6); sh.hidden = false; sh.innerHTML = head(T("by") + " " + C[g2].name, cats.length > 1 ? " " + sel("g2", cats.map(function (i) { return [i, C[i].name]; }), g2) : "") + (gr2.length ? donut(gr2) : ""); } else sh.hidden = true;
      var tb = q('[data-c="table"]'), view = rows.slice();
      if (state.sort >= 0) view.sort(function (a, b) { var x = a[state.sort], y = b[state.sort]; return (x == null ? -Infinity : x) > (y == null ? -Infinity : y) ? state.dir : -state.dir; });
      var show = view.slice(0, state.shown);
      tb.innerHTML = head(T("table"), ' <span style="opacity:.6;text-transform:none;letter-spacing:0;font-weight:500">' + show.length.toLocaleString("en-US") + " / " + rows.length.toLocaleString("en-US") + " " + esc(T("shown")) + '</span><button class="ds-b" style="padding:5px 10px;font-size:11px" data-a="csv">' + esc(T("csv")) + "</button>") + (rows.length ? '<div class="ds-tb"><table><thead><tr>' + C.map(function (c, i) { return '<th data-sort="' + i + '">' + esc(c.name) + (state.sort === i ? (state.dir > 0 ? " ▲" : " ▼") : "") + "</th>"; }).join("") + "</tr></thead><tbody>" + show.map(function (r) { return "<tr>" + r.map(function (v, i) { var c = C[i]; return '<td class="' + (c.type === "num" ? "n" : "") + '">' + esc(c.type === "num" ? fmtN(v) : c.type === "date" ? (v == null ? "" : fmtD(v, "day")) : v) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" + (rows.length > state.shown ? '<div style="text-align:center;margin-top:10px"><button class="ds-b" data-a="more">' + esc(T("more")) + "</button></div>" : "") : '<div style="opacity:.5;padding:16px 0">' + esc(T("empty")) + "</div>");
      host._view = { rows: rows };
    }
    function summary() {
      var rows = filtered(), K = kpis(rows), how = state.m >= 0 ? state.how : "count", o = { dataset: ds.name, rows: rows.length, columns: C.map(function (c) { return c.name + " (" + c.type + ")"; }), kpis: K.map(function (k) { return k.l + ": " + k.v + (k.d != null && isFinite(k.d) ? " (" + k.d.toFixed(1) + "% " + T("vs") + ")" : ""); }) };
      if (state.g >= 0) o.top_groups = { by: C[state.g].name, measure: (state.m >= 0 ? C[state.m].name : "count") + " " + how, items: groupBy(rows, state.g, state.m, how).slice(0, 8).map(function (x) { return x.k + ": " + fmtN(x.v); }) };
      if (dates.length) { var s = series(rows, dates[0], state.m, how); o.trend = { granularity: s.g, points: s.pts.slice(-18).map(function (p) { return p.k + ": " + fmtN(p.v); }) }; }
      return JSON.stringify(o);
    }
    var t0 = 0;
    host.addEventListener("input", function (e) { if (e.target.type === "search") { clearTimeout(t0); t0 = setTimeout(function () { state.q = e.target.value; state.shown = 50; paint(); }, 200); } });
    host.addEventListener("change", function (e) { var s = e.target.getAttribute("data-s"); if (!s) return; if (s === "how") state.how = e.target.value; else state[s] = +e.target.value; paint(); });
    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ci],[data-a],[data-sort]"); if (!b) return;
      var ci = b.getAttribute("data-ci"), a = b.getAttribute("data-a"), so = b.getAttribute("data-sort");
      if (ci != null) { var v = b.getAttribute("data-v"); if (!v) delete state.f[ci]; else { var set = state.f[ci] || (state.f[ci] = {}); if (set[v]) delete set[v]; else set[v] = 1; } state.shown = 50; paintFilters(); paint(); }
      else if (so != null) { so = +so; if (state.sort === so) state.dir = -state.dir; else { state.sort = so; state.dir = 1; } paint(); }
      else if (a === "more") { state.shown += 100; paint(); }
      else if (a === "reset") { state.f = {}; state.q = ""; q('input[type=search]').value = ""; state.sort = -1; state.shown = 50; paintFilters(); paint(); }
      else if (a === "csv") { var rows = (host._view || {}).rows || [], esc2 = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }, out = [C.map(function (c) { return esc2(c.name); }).join(",")].concat(rows.map(function (r) { return r.map(function (v, i) { return esc2(C[i].type === "date" && v != null ? fmtD(v, "day") : v); }).join(","); })).join("\n"), u = URL.createObjectURL(new Blob(["﻿" + out], { type: "text/csv" })), l = D.createElement("a"); l.href = u; l.download = (ds.name.replace(/\.[^.]+$/, "") || "data") + "-filtered.csv"; D.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 3000); }
    });
    paintFilters(); paint();
    return { summary: summary, state: state, paint: paint, aiBox: function () { return q(".ds-ai"); } };
  }

  /* ------------------------------------------------ share link */
  function b64u(buf) { var s = "", u = new Uint8Array(buf), i; for (i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), u = new Uint8Array(b.length), i; for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function pipe(data, ctor) { var cs = new ctor("gzip"), w = cs.writable.getWriter(); w.write(data); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); }
  async function makeLink(ds) {
    var max = 60000, n = ds.rows.length, trimmed = false;
    for (;;) {
      var payload = JSON.stringify({ v: 1, n: ds.name, c: ds.cols, r: ds.rows.slice(0, n) }), enc = new TextEncoder().encode(payload), out;
      out = typeof CompressionStream === "function" ? "z" + b64u(await pipe(enc, CompressionStream)) : "r" + b64u(enc);
      if (out.length <= max || n <= 20) return { url: location.href.split("#")[0] + "#dash=" + out, trimmed: trimmed };
      n = Math.floor(n * (max / out.length) * .85); trimmed = true;
    }
  }
  async function readLink(h) {
    var s = h.replace(/^#dash=/, ""), buf = s[0] === "z" ? await pipe0(unb64u(s.slice(1))) : unb64u(s.slice(1));
    var o = JSON.parse(new TextDecoder().decode(buf)); return { name: o.n, cols: o.c, rows: o.r };
  }
  async function pipe0(data) { var ds = new DecompressionStream("gzip"), w = ds.writable.getWriter(); w.write(data); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }

  /* ------------------------------------------------ overlay */
  var ov = null, inst = null;
  function ensure() { if (ov) return; ov = D.createElement("div"); ov.id = "dash-ov"; D.body.appendChild(ov); }
  function close() { if (!ov) return; ov.classList.remove("on"); ov.innerHTML = ""; try { D.body.classList.remove("phr-recede"); } catch (e) {} if (/^#dash=/.test(location.hash)) try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  function toast(m) { try { window.showToast(m); } catch (e) {} }
  function startScreen(err) {
    ensure(); ov.classList.add("on"); try { D.body.classList.add("phr-recede"); } catch (e) {}
    ov.innerHTML = '<div class="ds"><div class="ds-h"><h1>' + esc(T("title")) + "<small>" + esc(T("sub")) + '</small></h1><button class="ds-b ds-x" data-a="close">✕</button></div><div class="ds-drop" data-a="pick"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#F4D98B" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg><b>' + esc(T("drop")) + "</b><span>CSV · TSV · XLSX · XLS</span></div>" + (err ? '<p style="color:#ff8d7f;font-size:13px">' + esc(err) + "</p>" : "") + '<textarea class="ds-ta" placeholder="' + esc(T("paste")) + '"></textarea><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="ds-b g" data-a="paste">' + esc(T("build")) + '</button><button class="ds-b" data-a="demo">' + esc(T("demo")) + '</button></div><input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods,text/csv" style="display:none"></div>';
    var drop = ov.querySelector(".ds-drop"), fi = ov.querySelector("input[type=file]");
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("hot"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("hot"); }); });
    drop.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) load(f); });
    fi.addEventListener("change", function () { if (fi.files[0]) load(fi.files[0]); });
    ov.onclick = function (e) { var b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a"); if (a === "close") close(); else if (a === "pick") fi.click(); else if (a === "paste") { var t = ov.querySelector(".ds-ta").value; try { show(build(parseCSV(t), "Pasted data")); } catch (x) { startScreen(T("err")); } } else if (a === "demo") show(build(parseCSV(DEMO), "Sample sales.csv")); };
  }
  async function load(file) {
    try {
      var src = await readFile(file), sheet = src.sheets[0];
      if (src.sheets.length > 1) { var pick = window.prompt(T("sheet") + ": " + src.sheets.join(" | "), src.sheets[0]); if (pick && src.sheets.indexOf(pick) >= 0) sheet = pick; }
      var rows = src.get(sheet); if (!rows || rows.length < 2) throw new Error("empty"); show(build(rows, file.name + (sheet ? " · " + sheet : "")));
    } catch (e) { console.warn("[dash]", e); startScreen(T("err")); }
  }
  function show(ds, readOnly) {
    ensure(); ov.classList.add("on"); try { D.body.classList.add("phr-recede"); } catch (e) {}
    ov.innerHTML = '<div class="ds"><div class="ds-h"><h1>' + esc(ds.name) + "<small>" + ds.rows.length.toLocaleString("en-US") + " " + esc(T("rows")) + " · " + ds.cols.length + ' cols</small></h1>' + (readOnly ? "" : '<button class="ds-b" data-a="ai">✦ ' + esc(T("insight")) + '</button><button class="ds-b g" data-a="share">' + esc(T("share")) + "</button>") + '<button class="ds-b ds-x" data-a="close">✕</button></div>' + (readOnly ? '<div class="ds-ro">' + esc(T("shareView")) + "</div>" : "") + (ds.big ? '<div style="opacity:.6;font-size:12px;margin:-6px 0 10px">' + esc(T("big")) + "</div>" : "") + '<div class="ds-body"></div></div>';
    inst = dashboard(ov.querySelector(".ds-body"), ds); inst.ds = ds;
    ov.onclick = async function (e) {
      var b = e.target.closest(".ds-h [data-a]"); if (!b) return; var a = b.getAttribute("data-a");
      if (a === "close") close();
      else if (a === "share") { try { var r = await makeLink(ds); try { await navigator.clipboard.writeText(r.url); toast(T("copy") + (r.trimmed ? " — " + T("linkBig") : "")); } catch (x) { window.prompt(T("share"), r.url); } if (navigator.share && !r.trimmed) { try { navigator.share({ title: ds.name, url: r.url }); } catch (x) {} } } catch (x) { toast(T("err")); } }
      else if (a === "ai") {
        var box = inst.aiBox(); box.hidden = false; box.textContent = T("thinking");
        try {
          var lang = fa() ? "Persian (Farsi)" : "English", sys = { role: "system", content: "You are a sharp data analyst. You get ONLY aggregated statistics of a dataset. Write 4-6 short bullet insights (what stands out, trend, concentration, anomalies, one suggested next question). Be concrete with the numbers given; never invent numbers. Reply in " + lang + ". Use plain text with • bullets." }, usr = { role: "user", content: inst.summary() };
          var r2 = await window.fetchAI([sys, usr], false, false); box.textContent = typeof r2 === "string" ? r2 : (r2 && r2.content) || T("fail");
        } catch (x) { box.textContent = T("fail"); }
      }
    };
  }
  var DEMO = (function () { var cat = ["Electronics", "Clothing", "Home", "Sports"], reg = ["North", "South", "East", "West"], out = ["date,category,region,units,revenue"], seed = 7; function r() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; } for (var i = 0; i < 240; i++) { var d = new Date(2025, 0, 1 + Math.floor(i * 1.5)), c = Math.floor(r() * 4), u = 1 + Math.floor(r() * 20); out.push(d.toISOString().slice(0, 10) + "," + cat[c] + "," + reg[Math.floor(r() * 4)] + "," + u + "," + Math.round(u * (20 + c * 35 + r() * 30) * (1 + i / 400))); } return out.join("\n"); })();

  function openData(text, name) { try { show(build(parseCSV(text), name || "Data")); } catch (e) { startScreen(T("err")); } }
  function tile() {
    var g = D.querySelector("#tools-menu .tools-grid"); if (!g) return false; if (g.querySelector("[data-ds]")) return true;
    var t = D.createElement("div"); t.className = "tool-tile"; t.setAttribute("data-ds", "1"); t.style.setProperty("--tile-color", "#6FB7FF");
    t.innerHTML = '<i class="tt-ic"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></i><span class="tt-n">' + esc(T("title")) + '</span><small class="tt-s">CSV · Excel</small>';
    t.addEventListener("click", function () { try { window.closeAllDropMenus && window.closeAllDropMenus(); } catch (e) {} startScreen(); });
    g.insertBefore(t, g.firstChild); return true;
  }
  var n = 0, iv = setInterval(function () { if (tile() || ++n > 30) clearInterval(iv); }, 700);

  // chat fence: ```livedash with inline CSV → mini card
  var W = window.PHRW;
  if (W && W.builders) {
    var oldKind = W.kindOf; W.kindOf = function (l) { return /^(livedash|csvdash|datadash)$/i.test(String(l || "")) ? "livedash" : oldKind(l); }; W.kinds.livedash = 1;
    W.builders.livedash = function (root) {
      var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
      var body = raw.replace(/^\s*title\s*:.*\n/i, ""), ds = build(parseCSV(body), (raw.match(/^\s*title\s*:\s*(.+)$/im) || [0, "Data"])[1]);
      root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(T("title")) + '</span><span class="phr-w-title">' + esc(ds.name) + '</span></div><div class="ds-mini"><div class="ds-body"></div><div style="padding-top:8px"><button class="phr-w-btn gold" data-a="open">' + esc(T("mini")) + "</button></div></div>";
      var h = root.querySelector(".ds-body"); dashboard(h, ds); [].forEach.call(h.querySelectorAll(".ds-fc,.ds-f,.ds-g .w[data-c=table]"), function (x) { x.remove(); });
      root.querySelector('[data-a="open"]').onclick = function () { show(ds); };
    };
  }

  // shared link on load
  function boot() { if (/^#dash=/.test(location.hash)) readLink(location.hash).then(function (ds) { show(ds, true); }).catch(function (e) { console.warn("[dash] bad link", e); }); }
  if (D.readyState !== "loading") boot(); else D.addEventListener("DOMContentLoaded", boot);
  window.PHR_DASH = { open: startScreen, openData: openData, parseCSV: parseCSV, build: build, makeLink: makeLink };
})();
