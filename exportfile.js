/* Phraortes — Save as file (exportfile.js)
   "···" menu of any AI answer → Save as file: Word (.docx), Excel (.xlsx, from the tables), PDF, Markdown.
   Everything is built on the device (own tiny zip writer) — no API, no upload, works offline. */
(function () {
  "use strict";
  var W = window, D = document;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }
  function xesc(s) { return esc(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") }
  var RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
  var FA = function () { try { return /[؀-ۿ]/.test(D.documentElement.lang || "") || D.documentElement.dir === "rtl" } catch (e) { return false } };

  /* ---------- zip (store) ---------- */
  var CT = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })();
  function crc(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0 }
  function u8(s) { return new TextEncoder().encode(s) }
  function zip(files) {
    var parts = [], cen = [], off = 0, i, f, nm, d, cr, h, dv;
    for (i = 0; i < files.length; i++) {
      f = files[i]; nm = u8(f[0]); d = typeof f[1] === "string" ? u8(f[1]) : f[1]; cr = crc(d);
      h = new Uint8Array(30 + nm.length); dv = new DataView(h.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true); dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0x21, true);
      dv.setUint32(14, cr, true); dv.setUint32(18, d.length, true); dv.setUint32(22, d.length, true); dv.setUint16(26, nm.length, true); dv.setUint16(28, 0, true); h.set(nm, 30);
      parts.push(h, d);
      var c = new Uint8Array(46 + nm.length), cv = new DataView(c.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true);
      cv.setUint32(16, cr, true); cv.setUint32(20, d.length, true); cv.setUint32(24, d.length, true); cv.setUint16(28, nm.length, true); cv.setUint32(42, off, true); c.set(nm, 46);
      cen.push(c); off += h.length + d.length;
    }
    var cs = 0; cen.forEach(function (c) { cs += c.length });
    var e = new Uint8Array(22), ev = new DataView(e.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cs, true); ev.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [e]));
  }

  /* ---------- read the rendered answer ---------- */
  function root(id) { var el = D.getElementById(id); return el || null }
  function titleOf(el) {
    var h = el.querySelector("h1,h2,h3"); var t = (h ? h.textContent : el.textContent).trim().replace(/\s+/g, " ");
    return (t.slice(0, 60) || "Phraortes").replace(/[\\/:*?"<>|#]/g, "").trim() || "Phraortes";
  }
  function tables(el) {
    return [].map.call(el.querySelectorAll("table"), function (t) {
      return [].map.call(t.querySelectorAll("tr"), function (r) { return [].map.call(r.children, function (c) { return c.textContent.replace(/\s+/g, " ").trim() }) }).filter(function (r) { return r.length });
    }).filter(function (t) { return t.length });
  }

  /* ---------- Word ---------- */
  function run(t, o) {
    o = o || {}; if (!t) return "";
    var rtl = RTL.test(t), rp = "";
    if (o.code) rp += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>';
    else if (rtl) rp += '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
    if (o.b) rp += "<w:b/><w:bCs/>"; if (o.i) rp += "<w:i/><w:iCs/>";
    if (o.color) rp += '<w:color w:val="' + o.color + '"/>';
    if (o.sz) rp += '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>';
    if (rtl) rp += "<w:rtl/>";
    return "<w:r>" + (rp ? "<w:rPr>" + rp + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + xesc(t) + "</w:t></w:r>";
  }
  function inline(n, o) {
    var out = "";
    n.childNodes.forEach(function (c) {
      if (c.nodeType === 3) out += run(c.nodeValue.replace(/\s+/g, " "), o);
      else if (c.nodeType === 1) {
        var tg = c.tagName.toLowerCase(), p = Object.assign({}, o);
        if (/^(script|style|button|svg|sup)$/.test(tg) || c.classList.contains("src-pill") || c.classList.contains("listen-ops")) return;
        if (tg === "br") { out += "<w:r><w:br/></w:r>"; return }
        if (tg === "strong" || tg === "b") p.b = 1; if (tg === "em" || tg === "i") p.i = 1; if (tg === "code") { p.code = 1; p.color = "9A3412" }
        if (tg === "a") { p.color = "1D4ED8" }
        if (/^(ul|ol|table|pre|div)$/.test(tg) && !c.classList.contains("katex")) return;
        out += inline(c, p);
      }
    });
    return out;
  }
  function para(inner, o) {
    o = o || {}; var txt = inner.replace(/<[^>]+>/g, ""), rtl = RTL.test(txt);
    var pp = "";
    if (o.style) pp += '<w:pStyle w:val="' + o.style + '"/>';
    if (o.num) pp += '<w:numPr><w:ilvl w:val="' + (o.lvl || 0) + '"/><w:numId w:val="' + o.num + '"/></w:numPr>';
    if (o.shade) pp += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>';
    if (o.ind) pp += '<w:ind w:left="' + o.ind + '"/>';
    if (rtl) pp += "<w:bidi/>";
    pp += '<w:spacing w:after="' + (o.after == null ? 120 : o.after) + '" w:line="300" w:lineRule="auto"/>';
    return "<w:p><w:pPr>" + pp + "</w:pPr>" + inner + "</w:p>";
  }
  function wtable(rows) {
    var n = Math.max.apply(null, rows.map(function (r) { return r.length })), rtl = rows.some(function (r) { return r.some(function (c) { return RTL.test(c) }) });
    var bd = '<w:top w:val="single" w:sz="4" w:color="C9C5BA"/><w:left w:val="single" w:sz="4" w:color="C9C5BA"/><w:bottom w:val="single" w:sz="4" w:color="C9C5BA"/><w:right w:val="single" w:sz="4" w:color="C9C5BA"/><w:insideH w:val="single" w:sz="4" w:color="C9C5BA"/><w:insideV w:val="single" w:sz="4" w:color="C9C5BA"/>';
    var x = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + (rtl ? "<w:bidiVisual/>" : "") + "<w:tblBorders>" + bd + '</w:tblBorders><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>';
    rows.forEach(function (r, ri) {
      x += "<w:tr>" + (ri === 0 ? "<w:trPr><w:tblHeader/></w:trPr>" : "");
      for (var i = 0; i < n; i++) {
        var c = r[i] || ""; x += '<w:tc><w:tcPr><w:tcW w:w="' + Math.floor(5000 / n) + '" w:type="pct"/>' + (ri === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="F3E7C0"/>' : "") + "</w:tcPr>" + para(run(c, { b: ri === 0 }), { after: 0 }) + "</w:tc>";
      }
      x += "</w:tr>";
    });
    return x + "</w:tbl>" + para("", { after: 120 });
  }
  function docBody(el) {
    var b = "";
    function walk(n, lvl) {
      n.childNodes.forEach(function (c) {
        if (c.nodeType === 3) { var t = c.nodeValue.trim(); if (t) b += para(run(t)); return }
        if (c.nodeType !== 1) return;
        var tg = c.tagName.toLowerCase();
        if (/^(script|style|button|svg)$/.test(tg) || c.classList.contains("listen-ops") || c.classList.contains("src-pill") || c.classList.contains("msg-menu")) return;
        if (/^h[1-6]$/.test(tg)) b += para(inline(c, { b: 1 }), { style: "Heading" + Math.min(3, +tg[1]), after: 80 });
        else if (tg === "p") b += para(inline(c));
        else if (tg === "ul" || tg === "ol") {
          var num = tg === "ol" ? 2 : 1;
          [].forEach.call(c.children, function (li) {
            if (li.tagName.toLowerCase() !== "li") return;
            b += para(inline(li), { num: num, lvl: Math.min(lvl, 3), after: 60 });
            [].forEach.call(li.children, function (k) { if (/^(ul|ol)$/i.test(k.tagName)) walk({ childNodes: [k] }, lvl + 1) });
          });
        }
        else if (tg === "pre") { (c.textContent || "").replace(/\n$/, "").split("\n").forEach(function (ln, i, a) { b += para(run(ln || " ", { code: 1, sz: 19 }), { shade: "F4F1E8", after: i === a.length - 1 ? 140 : 0, ind: 120 }) }) }
        else if (tg === "table") { var r = [].map.call(c.querySelectorAll("tr"), function (tr) { return [].map.call(tr.children, function (x) { return x.textContent.replace(/\s+/g, " ").trim() }) }).filter(function (x) { return x.length }); if (r.length) b += wtable(r) }
        else if (tg === "blockquote") b += para(inline(c, { i: 1, color: "5C574A" }), { ind: 360, shade: "FAF7EE" });
        else if (tg === "hr") b += para("", { after: 160 });
        else if (tg === "div" || tg === "section" || tg === "article" || tg === "span") {
          if (c.querySelector("p,h1,h2,h3,h4,ul,ol,pre,table,blockquote")) walk(c, lvl); else { var t2 = inline(c); if (c.textContent.trim()) b += para(t2) }
        }
        else { var t3 = inline(c); if (c.textContent.trim()) b += para(t3) }
      });
    }
    walk(el, 0);
    return b || para(run(el.textContent.trim()));
  }
  function docx(el) {
    var ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    var hs = function (id, sz, col) { return '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="heading ' + id.slice(-1) + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="80"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="' + col + '"/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr></w:style>' };
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + ns + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="24"/><w:lang w:val="en-US" w:bidi="fa-IR"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' + hs("Heading1", 40, "1F1B10") + hs("Heading2", 32, "3A3220") + hs("Heading3", 26, "5A4A22") + "</w:styles>";
    var lv = function (i, fmt, txt) { return '<w:lvl w:ilvl="' + i + '"><w:start w:val="1"/><w:numFmt w:val="' + fmt + '"/><w:lvlText w:val="' + txt + '"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="' + (540 + i * 360) + '" w:hanging="300"/></w:pPr></w:lvl>' };
    var bl = "", nl = ""; for (var i = 0; i < 4; i++) { bl += lv(i, "bullet", i % 2 ? "–" : "•"); nl += lv(i, "decimal", "%" + (i + 1) + ".") }
    var numbering = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ' + ns + '><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + bl + '</w:abstractNum><w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="hybridMultilevel"/>' + nl + '</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num></w:numbering>';
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + ns + "><w:body>" + docBody(el) + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:right="1300" w:bottom="1300" w:left="1300" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    return zip([
      ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'],
      ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ["word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>'],
      ["word/document.xml", doc], ["word/styles.xml", styles], ["word/numbering.xml", numbering]
    ]);
  }

  /* ---------- Excel ---------- */
  function col(n) { var s = ""; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }
  function xlsx(tbls) {
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>', wr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    var files = [];
    tbls.forEach(function (t, k) {
      var rtl = t.some(function (r) { return r.some(function (c) { return RTL.test(c) }) }), widths = [];
      var rows = t.map(function (r, ri) {
        return '<row r="' + (ri + 1) + '">' + r.map(function (c, ci) {
          widths[ci] = Math.max(widths[ci] || 8, Math.min(48, c.length + 3));
          var ref = col(ci) + (ri + 1), num = /^-?\d{1,15}([.,]\d+)?$/.test(c.replace(/[,\s]/g, "")) && ri > 0 && c !== "";
          if (num) return '<c r="' + ref + '"><v>' + c.replace(/[,\s]/g, "").replace(",", ".") + "</v></c>";
          return '<c r="' + ref + '" t="inlineStr"' + (ri === 0 ? ' s="1"' : "") + "><is><t xml:space=\"preserve\">" + xesc(c) + "</t></is></c>";
        }).join("") + "</row>";
      }).join("");
      var cols = "<cols>" + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>' }).join("") + "</cols>";
      files.push(["xl/worksheets/sheet" + (k + 1) + ".xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"' + (rtl ? ' rightToLeft="1"' : "") + '><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' + cols + "<sheetData>" + rows + "</sheetData></worksheet>"]);
      ct += '<Override PartName="/xl/worksheets/sheet' + (k + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      wb += '<sheet name="Table ' + (k + 1) + '" sheetId="' + (k + 1) + '" r:id="rId' + (k + 1) + '"/>';
      wr += '<Relationship Id="rId' + (k + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (k + 1) + '.xml"/>';
    });
    wr += '<Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3E7C0"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    files.unshift(["[Content_Types].xml", ct + "</Types>"], ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'], ["xl/workbook.xml", wb + "</sheets></workbook>"], ["xl/_rels/workbook.xml.rels", wr], ["xl/styles.xml", styles]);
    return zip(files);
  }

  /* ---------- Markdown / PDF ---------- */
  function md(el) {
    var out = [];
    function w(n) {
      n.childNodes.forEach(function (c) {
        if (c.nodeType === 3) { if (c.nodeValue.trim()) out.push(c.nodeValue.trim()); return }
        if (c.nodeType !== 1) return; var tg = c.tagName.toLowerCase();
        if (/^(script|style|button|svg)$/.test(tg) || c.classList.contains("listen-ops") || c.classList.contains("msg-menu") || c.classList.contains("src-pill")) return;
        if (/^h[1-6]$/.test(tg)) out.push(new Array(+tg[1] + 1).join("#") + " " + c.textContent.trim());
        else if (tg === "pre") out.push("```\n" + c.textContent.replace(/\n$/, "") + "\n```");
        else if (tg === "ul" || tg === "ol") out.push([].map.call(c.children, function (li, i) { return (tg === "ol" ? i + 1 + ". " : "- ") + li.textContent.trim().replace(/\n+/g, " ") }).join("\n"));
        else if (tg === "table") { var r = [].map.call(c.querySelectorAll("tr"), function (tr) { return "| " + [].map.call(tr.children, function (x) { return x.textContent.trim().replace(/\|/g, "/") }).join(" | ") + " |" }); if (r.length > 1) r.splice(1, 0, "|" + new Array(c.querySelector("tr").children.length + 1).join(" --- |")); out.push(r.join("\n")) }
        else if (tg === "p" || tg === "blockquote") out.push((tg === "blockquote" ? "> " : "") + c.textContent.trim());
        else if (c.querySelector("p,h1,h2,h3,ul,ol,pre,table")) w(c); else if (c.textContent.trim()) out.push(c.textContent.trim());
      });
    }
    w(el); return out.join("\n\n") + "\n";
  }
  function pdf(el, title) {
    var h = el.cloneNode(true); [].forEach.call(h.querySelectorAll(".listen-ops,.msg-menu,button,.src-pill,script,style"), function (x) { x.remove() });
    var rtl = RTL.test(el.textContent), w = W.open("", "_blank");
    if (!w) return false;
    w.document.write('<!doctype html><html dir="' + (rtl ? "rtl" : "ltr") + '"><head><meta charset="utf-8"><title>' + esc(title) + '</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>@page{margin:18mm}body{font:15px/1.65 -apple-system,"Segoe UI",Tahoma,Arial,sans-serif;color:#1b1812;max-width:760px;margin:0 auto;padding:18px}h1,h2,h3{line-height:1.25;margin:1.2em 0 .4em}h1{font-size:26px}h2{font-size:21px}h3{font-size:17px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #cfc9ba;padding:7px 10px;text-align:start}th{background:#f3e7c0}pre{background:#f4f1e8;padding:12px;border-radius:8px;white-space:pre-wrap;direction:ltr;font:13px/1.5 Menlo,Consolas,monospace}code{background:#f4f1e8;padding:1px 5px;border-radius:4px}blockquote{margin:10px 0;padding:6px 14px;border-inline-start:3px solid #e8c468;color:#5c574a}.b{position:fixed;top:10px;inset-inline-end:10px;background:#1b1812;color:#fff;border:0;border-radius:10px;padding:10px 16px;font:600 14px sans-serif}@media print{.b{display:none}}</style></head><body><button class="b" onclick="print()">Save as PDF</button>' + h.innerHTML + "<script>setTimeout(function(){try{print()}catch(e){}},500)<\/script></body></html>");
    w.document.close(); return true;
  }

  /* ---------- deliver ---------- */
  function deliver(blob, name, type) {
    var f; try { f = new File([blob], name, { type: type }) } catch (e) { f = null }
    var go = function () { var u = URL.createObjectURL(blob), a = D.createElement("a"); a.href = u; a.download = name; D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u) }, 20000) };
    try { if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: name }).catch(function (e) { if (e && e.name !== "AbortError") go() }); return } } catch (e) { }
    go();
  }
  function toast(m) { try { W.showToast(m) } catch (e) { } }

  /* ---------- sheet UI ---------- */
  function css() {
    if (D.getElementById("ef-css")) return; var s = D.createElement("style"); s.id = "ef-css";
    s.textContent = "#ef{position:fixed;inset:0;z-index:9800;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}#ef.on{display:flex}" +
      "#ef .s{width:100%;max-width:520px;box-sizing:border-box;padding:10px 16px calc(18px + env(safe-area-inset-bottom));border-radius:26px 26px 0 0;background:linear-gradient(180deg,#1b1610,#0d0b08);border:1px solid rgba(232,196,104,.28);border-bottom:0;color:#f1ece0;font-family:-apple-system,system-ui,sans-serif;animation:efUp .28s cubic-bezier(.2,1,.3,1)}@keyframes efUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}" +
      "#ef .g{width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.2);margin:0 auto 12px}#ef h4{margin:0 0 3px;font-size:17px}#ef .t{font-size:12.5px;color:#9b9078;margin-bottom:12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}" +
      "#ef button.o{display:flex;align-items:center;gap:14px;width:100%;margin-top:8px;padding:13px 14px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.05);color:inherit;text-align:start;cursor:pointer;font:inherit}#ef button.o:active{transform:scale(.985)}#ef button.o.dis{opacity:.4;pointer-events:none}" +
      "#ef .ic{flex:none;width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;font:800 13px ui-monospace,Menlo,monospace;color:#fff;letter-spacing:.02em}#ef b{display:block;font-size:15px}#ef small{display:block;margin-top:2px;font-size:12px;color:#9b9078}#ef .x{margin-top:12px;width:100%;border:0;background:none;color:#9b9078;font:600 14px inherit;padding:10px;cursor:pointer}";
    D.head.appendChild(s);
  }
  var cur = null, sh;
  function open(id) {
    var el = root(id); if (!el || !el.textContent.trim()) { toast("Nothing to save yet."); return }
    css(); cur = { id: id, el: el, title: titleOf(el), t: tables(el) };
    var fa = FA(), T = fa ? { h: "ذخیره به‌صورت فایل", w: "Word", wd: "سند قابل ویرایش با تیتر، فهرست و جدول", x: "Excel", xd: cur.t.length ? cur.t.length + " جدول در فایل Excel" : "این جواب جدولی ندارد", p: "PDF", pd: "آماده‌ی چاپ و اشتراک", m: "Markdown", md: "متن ساده با قالب‌بندی", c: "بستن" } : { h: "Save as file", w: "Word", wd: "Editable document with headings, lists and tables", x: "Excel", xd: cur.t.length ? cur.t.length + (cur.t.length > 1 ? " tables, one sheet each" : " table as a sheet") : "This answer has no table", p: "PDF", pd: "Ready to print or share", m: "Markdown", md: "Plain text with formatting", c: "Close" };
    if (!sh) { sh = D.createElement("div"); sh.id = "ef"; sh.addEventListener("click", function (e) { if (e.target === sh) close() }); D.body.appendChild(sh) }
    sh.dir = fa ? "rtl" : "ltr";
    sh.innerHTML = '<div class="s"><div class="g"></div><h4>' + T.h + '</h4><div class="t">' + esc(cur.title) + "</div>" +
      '<button class="o" onclick="PHR_FILE.save(\'docx\')"><span class="ic" style="background:linear-gradient(135deg,#4a86ff,#2557c9)">DOC</span><span><b>' + T.w + "</b><small>" + T.wd + "</small></span></button>" +
      '<button class="o' + (cur.t.length ? "" : " dis") + '" onclick="PHR_FILE.save(\'xlsx\')"><span class="ic" style="background:linear-gradient(135deg,#3fbf7f,#1f8a52)">XLS</span><span><b>' + T.x + "</b><small>" + T.xd + "</small></span></button>" +
      '<button class="o" onclick="PHR_FILE.save(\'pdf\')"><span class="ic" style="background:linear-gradient(135deg,#ff6b5e,#c93a30)">PDF</span><span><b>' + T.p + "</b><small>" + T.pd + "</small></span></button>" +
      '<button class="o" onclick="PHR_FILE.save(\'md\')"><span class="ic" style="background:linear-gradient(135deg,#8a8472,#4f4a3c)">MD</span><span><b>' + T.m + "</b><small>" + T.md + '</small></span></button><button class="x" onclick="PHR_FILE.close()">' + T.c + "</button></div>";
    setTimeout(function () { sh.classList.add("on") }, 10);
  }
  function close() { if (sh) sh.classList.remove("on") }
  function save(kind) {
    if (!cur) return; var el = cur.el, nm = cur.title;
    try {
      if (kind === "docx") deliver(docx(el), nm + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      else if (kind === "xlsx") { if (!cur.t.length) return; deliver(xlsx(cur.t), nm + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") }
      else if (kind === "md") deliver(new Blob([md(el)], { type: "text/markdown" }), nm + ".md", "text/markdown");
      else if (kind === "pdf") { if (!pdf(el, nm)) { toast("Allow pop-ups to save as PDF"); return } }
      close(); if (kind !== "pdf") toast("Saved · " + nm);
    } catch (e) { toast("Couldn't create the file") }
  }
  W.PHR_FILE = { open: open, close: close, save: save, _docx: docx, _xlsx: xlsx, _md: md, _tables: tables };

  /* ---------- add the row to every message menu ---------- */
  function addRows() {
    [].forEach.call(D.querySelectorAll(".msg-menu:not([data-ef])"), function (m) {
      m.dataset.ef = 1; var sp = m.querySelector("[onclick*='toggleSpeech']"), mm = sp && /toggleSpeech\('([^']+)'/.exec(sp.getAttribute("onclick")); if (!mm) return;
      var fa = m.getAttribute("dir") === "rtl", b = D.createElement("button"); b.className = "mm-row"; b.setAttribute("role", "menuitem");
      b.setAttribute("onclick", "closeMsgMenu();PHR_FILE.open('" + mm[1] + "')");
      b.innerHTML = "<span>" + (fa ? "ذخیره به‌صورت فایل" : "Save as file") + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5"/></svg>';
      var sep = m.querySelector(".mm-sep"); m.insertBefore(b, sep || null);
    });
  }
  var pend = 0, mo = new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; addRows() }, 250) });
  function boot() { addRows(); mo.observe(D.body, { childList: true, subtree: true }) }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot); else boot();
})();
