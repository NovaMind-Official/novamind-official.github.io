/* docstudio.js — Doc Studio: write reports, resumes, contracts and letters on a real page.
   • templates + "write it with AI" from a short brief
   • select any text → floating AI actions (shorter, longer, formal, friendly, fix, translate, custom…) with native undo
   • whole-document AI command bar ("make it shorter", "add a conclusion")
   • autosave, recent documents, export to PDF and Word (.docx)
   Open: PHR_DOCS.open()  ·  tools tile "Doc Studio"  ·  chat fence ```docstudio (markdown) → preview card + "Edit". */
(function () {
  "use strict";
  if (window.__docstudio) return; window.__docstudio = 1;
  var D = document, KEY = "phr_docs";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function uid() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4); }
  function isFa(s) { return /[؀-ۿ]/.test(s || ""); }
  function uiFa() { return isFa((D.getElementById("ui") || {}).value) || isFa(D.title); }
  function toast(m) { try { window.showToast(m); } catch (e) {} }
  var S = {
    en: { title: "Doc Studio", sub: "Write it. Polish it. Export it.", tpl: "Start from", blank: "Blank page", report: "Report", resume: "Resume", contract: "Contract", letter: "Letter", brief: "Describe what you need — AI writes the first draft", briefPh: "e.g. A 2-page market report on electric scooters in Iran, with a summary, 3 findings and recommendations", write: "Write with AI", recent: "Recent documents", none: "No documents yet", untitled: "Untitled document", export: "Export", pdf: "PDF", word: "Word (.docx)", close: "Close", shorter: "Shorter", longer: "Longer", formal: "Formal", friendly: "Friendly", fix: "Fix grammar", improve: "Improve", translate: "Translate", custom: "Ask AI…", customPh: "What should change?", working: "AI is writing…", fail: "AI is unavailable right now", doc: "Ask AI to change the whole document…", go: "Go", saved: "Saved", del: "Delete", h1: "Title", h2: "Heading", p: "Text", exported: "File ready", tolang: "Translate to", dir: "Direction", style: "Style", modern: "Modern", classic: "Classic", compact: "Compact", mini: "Edit in Doc Studio", confirmDel: "Delete this document?", popup: "Allow pop-ups to save the PDF" },
    fa: { title: "استودیوی سند", sub: "بنویس. صیقل بده. خروجی بگیر.", tpl: "شروع از", blank: "صفحه خالی", report: "گزارش", resume: "رزومه", contract: "قرارداد", letter: "نامه", brief: "بگو چه می‌خواهی — هوش مصنوعی پیش‌نویس اول را می‌نویسد", briefPh: "مثلاً: گزارش ۲ صفحه‌ای بازار اسکوتر برقی در ایران با خلاصه، ۳ یافته و پیشنهاد", write: "نوشتن با هوش مصنوعی", recent: "سندهای اخیر", none: "هنوز سندی نیست", untitled: "سند بدون عنوان", export: "خروجی", pdf: "PDF", word: "ورد (.docx)", close: "بستن", shorter: "کوتاه‌تر", longer: "بلندتر", formal: "رسمی", friendly: "صمیمی", fix: "اصلاح نگارش", improve: "بهتر کن", translate: "ترجمه", custom: "از AI بخواه…", customPh: "چه چیزی تغییر کند؟", working: "هوش مصنوعی در حال نوشتن…", fail: "هوش مصنوعی فعلاً در دسترس نیست", doc: "از AI بخواه کل سند را تغییر دهد…", go: "انجام", saved: "ذخیره شد", del: "حذف", h1: "عنوان", h2: "سرتیتر", p: "متن", exported: "فایل آماده شد", tolang: "ترجمه به", dir: "جهت", style: "سبک", modern: "مدرن", classic: "کلاسیک", compact: "فشرده", mini: "ویرایش در استودیوی سند", confirmDel: "این سند حذف شود؟", popup: "برای ذخیره PDF اجازه پاپ‌آپ بده" }
  };
  function T(k) { return (S[uiFa() ? "fa" : "en"][k]) || S.en[k] || k; }

  /* ------------------------------------------------ markdown → html (small, safe) and sanitizer */
  function inl(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>"); }
  function md2html(md) {
    var lines = String(md || "").replace(/\r/g, "").split("\n"), out = [], list = null, tbl = null, para = [];
    function flushP() { if (para.length) { out.push("<p>" + inl(para.join(" ")) + "</p>"); para = []; } }
    function flushL() { if (list) { out.push("</" + list + ">"); list = null; } }
    function flushT() { if (tbl) { out.push("<table><thead><tr>" + tbl[0].map(function (c) { return "<th>" + inl(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + tbl.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inl(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>"); tbl = null; } }
    lines.forEach(function (ln) {
      var m;
      if (/^\s*\|.*\|\s*$/.test(ln)) { flushP(); flushL(); var cells = ln.trim().replace(/^\||\|$/g, "").split("|").map(function (x) { return x.trim(); }); if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) return; (tbl = tbl || []).push(cells); return; } else flushT();
      if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); var n = Math.min(3, m[1].length); out.push("<h" + n + ">" + inl(m[2]) + "</h" + n + ">"); }
      else if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) { flushP(); if (list !== "ul") { flushL(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inl(m[1]) + "</li>"); }
      else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (list !== "ol") { flushL(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inl(m[1]) + "</li>"); }
      else if (/^\s*---+\s*$/.test(ln)) { flushP(); flushL(); out.push("<hr>"); }
      else if (!ln.trim()) { flushP(); flushL(); }
      else { flushL(); para.push(ln.trim()); }
    });
    flushP(); flushL(); flushT(); return out.join("\n");
  }
  var OK = { H1: 1, H2: 1, H3: 1, H4: 1, P: 1, UL: 1, OL: 1, LI: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1, HR: 1, DIV: 1, SPAN: 1, BLOCKQUOTE: 1, CODE: 1 };
  function clean(html) {
    var doc = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
    (function walk(n) { [].slice.call(n.childNodes).forEach(function (c) { if (c.nodeType === 8) c.remove(); else if (c.nodeType === 1) { if (!OK[c.tagName]) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|FORM|INPUT|BUTTON|SVG|IMG)$/.test(c.tagName)) c.remove(); else { walk(c); while (c.firstChild) n.insertBefore(c.firstChild, c); c.remove(); } } else { [].slice.call(c.attributes).forEach(function (a) { if (!(a.name === "style" && /^(text-align:\s*(left|right|center|justify);?\s*)$/i.test(a.value)) && !(a.name === "dir" && /^(rtl|ltr)$/.test(a.value)) && !(a.name === "colspan") && !(a.name === "rowspan")) c.removeAttribute(a.name); }); walk(c); } } }); })(doc.body);
    return doc.body.innerHTML;
  }
  function looksHtml(s) { return /<(h[1-4]|p|ul|ol|table)\b/i.test(s); }
  function toHtml(s) { s = String(s || "").replace(/^```(?:html|markdown|md)?\s*\n?|\n?```\s*$/g, ""); return clean(looksHtml(s) ? s : md2html(s)); }

  /* ------------------------------------------------ templates */
  function tpl(k, fa) {
    var f = !!fa;
    if (k === "report") return f ? "<h1>عنوان گزارش</h1><p><i>تهیه‌کننده · تاریخ</i></p><h2>خلاصه مدیریتی</h2><p>در سه چهار جمله مهم‌ترین نتیجه را بنویس.</p><h2>پیشینه</h2><p>…</p><h2>یافته‌ها</h2><ul><li>یافته اول</li><li>یافته دوم</li><li>یافته سوم</li></ul><h2>پیشنهادها</h2><ol><li>…</li><li>…</li></ol><h2>جمع‌بندی</h2><p>…</p>" : "<h1>Report title</h1><p><i>Prepared by · Date</i></p><h2>Executive summary</h2><p>State the single most important conclusion in three or four sentences.</p><h2>Background</h2><p>…</p><h2>Findings</h2><ul><li>Finding one</li><li>Finding two</li><li>Finding three</li></ul><h2>Recommendations</h2><ol><li>…</li><li>…</li></ol><h2>Conclusion</h2><p>…</p>";
    if (k === "resume") return f ? "<h1>نام و نام خانوادگی</h1><p>عنوان شغلی · شهر · ایمیل · تلفن</p><h2>خلاصه</h2><p>دو جمله درباره تخصص و ارزشی که می‌سازی.</p><h2>تجربه کاری</h2><h3>سمت — شرکت <span>(۱۴۰۱ تا اکنون)</span></h3><ul><li>دستاورد قابل‌اندازه‌گیری</li><li>دستاورد قابل‌اندازه‌گیری</li></ul><h2>تحصیلات</h2><p>مدرک — دانشگاه</p><h2>مهارت‌ها</h2><p>مهارت ۱ · مهارت ۲ · مهارت ۳</p>" : "<h1>Your Name</h1><p>Job title · City · email · phone</p><h2>Summary</h2><p>Two sentences on your craft and the value you create.</p><h2>Experience</h2><h3>Role — Company <span>(2021 – Present)</span></h3><ul><li>Measurable achievement</li><li>Measurable achievement</li></ul><h2>Education</h2><p>Degree — University</p><h2>Skills</h2><p>Skill 1 · Skill 2 · Skill 3</p>";
    if (k === "contract") return f ? "<h1>قرارداد همکاری</h1><p>این قرارداد در تاریخ ____ بین «طرف اول» به نشانی ____ و «طرف دوم» به نشانی ____ منعقد می‌شود.</p><h2>ماده ۱ — موضوع قرارداد</h2><p>…</p><h2>ماده ۲ — مدت</h2><p>…</p><h2>ماده ۳ — مبلغ و نحوه پرداخت</h2><p>…</p><h2>ماده ۴ — تعهدات طرفین</h2><ul><li>…</li><li>…</li></ul><h2>ماده ۵ — فسخ و حل اختلاف</h2><p>…</p><p><br></p><p>امضای طرف اول: ________ &nbsp;&nbsp;&nbsp; امضای طرف دوم: ________</p><p><i>این پیش‌نویس جایگزین مشاوره حقوقی نیست.</i></p>" : "<h1>Services Agreement</h1><p>This agreement is made on ____ between “Party A”, of ____, and “Party B”, of ____.</p><h2>1. Scope of work</h2><p>…</p><h2>2. Term</h2><p>…</p><h2>3. Fees and payment</h2><p>…</p><h2>4. Responsibilities</h2><ul><li>…</li><li>…</li></ul><h2>5. Termination and disputes</h2><p>…</p><p><br></p><p>Signed (Party A): ________ &nbsp;&nbsp;&nbsp; Signed (Party B): ________</p><p><i>This draft is not a substitute for legal advice.</i></p>";
    if (k === "letter") return f ? "<p>تاریخ: ____</p><p>جناب آقای/سرکار خانم ____<br>سمت · سازمان</p><p><b>موضوع:</b> ____</p><p>با سلام و احترام،</p><p>…</p><p>با تشکر<br>نام و امضا</p>" : "<p>Date: ____</p><p>Dear ____,</p><p><b>Subject:</b> ____</p><p>…</p><p>Sincerely,<br>Your name</p>";
    return "<p><br></p>";
  }

  /* ------------------------------------------------ CSS */
  var CSS = "#dc-ov{position:fixed;inset:0;z-index:10060;display:none;flex-direction:column;background:#120d08;color:#F4EBDD;font-family:'Space Grotesk','Vazirmatn',-apple-system,system-ui,sans-serif}#dc-ov.on{display:flex;animation:dsIn .35s cubic-bezier(.32,.72,0,1)}" +
    ".dc-top{flex:none;display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 12px 8px}.dc-top input{flex:1;min-width:0;background:none;border:0;outline:0;color:#F4EBDD;font:700 17px inherit;letter-spacing:-.01em}.dc-b{flex:none;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#F4EBDD;border-radius:11px;padding:8px 12px;font:600 13px inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;white-space:nowrap}.dc-b.g{background:linear-gradient(135deg,#F4D98B,#C79A3E);color:#1a1206;border-color:transparent}.dc-b.x{width:34px;height:34px;padding:0;border-radius:50%}" +
    ".dc-tb{flex:none;display:flex;gap:6px;padding:4px 12px 8px;overflow-x:auto;scrollbar-width:none;align-items:center}.dc-tb::-webkit-scrollbar{display:none}.dc-tb button,.dc-tb select{flex:none;height:34px;min-width:34px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#F4EBDD;font:700 13px inherit;cursor:pointer}.dc-tb select{padding:0 6px}.dc-tb select option{background:#1b150e}.dc-tb .sep{flex:none;width:1px;height:20px;background:rgba(255,255,255,.14);margin:0 3px}" +
    ".dc-wrap{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:6px 10px 120px;background:radial-gradient(80% 50% at 50% 0,rgba(244,217,139,.07),transparent 70%)}.dc-page{max-width:794px;min-height:1000px;margin:0 auto;background:#fffdf8;color:#1d1a14;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.55);padding:48px 52px;box-sizing:border-box;outline:0;font:16px/1.75 'Vazirmatn','Space Grotesk',Georgia,serif;-webkit-user-select:text;user-select:text;overflow-wrap:anywhere}" +
    "@media(max-width:600px){.dc-page{padding:26px 20px;min-height:700px;font-size:15.5px}}.dc-page h1{font-size:30px;line-height:1.25;margin:0 0 6px;letter-spacing:-.02em}.dc-page h2{font-size:20px;margin:24px 0 6px;padding-bottom:4px;border-bottom:1px solid #e5dccb}.dc-page h3{font-size:16.5px;margin:16px 0 4px}.dc-page p{margin:0 0 10px}.dc-page ul,.dc-page ol{margin:0 0 10px;padding-inline-start:24px}.dc-page table{border-collapse:collapse;width:100%;margin:10px 0}.dc-page th,.dc-page td{border:1px solid #d9cfba;padding:7px 10px;text-align:start}.dc-page th{background:#f3ecdc}.dc-page code{background:#f1ead9;padding:1px 5px;border-radius:4px;font-size:.9em}.dc-page blockquote{margin:10px 0;padding-inline-start:14px;border-inline-start:3px solid #d4a24c;color:#5a5140}" +
    ".dc-page.classic{font-family:Georgia,'Times New Roman','Vazirmatn',serif}.dc-page.classic h1{font-size:28px;text-align:center}.dc-page.classic h2{border:0;font-variant:small-caps;letter-spacing:.04em}.dc-page.compact{font-size:14px;line-height:1.55;padding:34px 40px}.dc-page.compact h1{font-size:24px}.dc-page.compact h2{font-size:16px;margin-top:16px}" +
    ".dc-bub{position:fixed;z-index:10080;display:none;max-width:calc(100vw - 16px);gap:4px;padding:6px;border-radius:16px;background:rgba(24,18,11,.94);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 40px rgba(0,0,0,.6);flex-wrap:wrap;justify-content:center}.dc-bub.on{display:flex}.dc-bub button,.dc-bub select{border:0;background:rgba(255,255,255,.08);color:#F4EBDD;border-radius:10px;padding:7px 11px;font:600 12.5px inherit;cursor:pointer}.dc-bub select option{background:#1b150e}.dc-bub button.g{background:#F4D98B;color:#1a1206}.dc-bub .st{width:100%;text-align:center;font-size:12px;opacity:.8;padding:4px 0}" +
    ".dc-cmd{position:absolute;left:0;right:0;bottom:0;padding:10px 12px calc(12px + env(safe-area-inset-bottom));display:flex;gap:8px;background:linear-gradient(0deg,#120d08 60%,transparent)}.dc-cmd input{flex:1;min-width:0;height:44px;border-radius:14px;border:1px solid rgba(244,217,139,.3);background:rgba(255,255,255,.07);color:#fff;padding:0 14px;font:14.5px inherit;outline:0}.dc-cmd button{height:44px}" +
    ".dc-start{flex:1;overflow:auto;padding:6px 16px 40px;max-width:760px;width:100%;margin:0 auto;box-sizing:border-box}.dc-start h4{margin:20px 2px 8px;font:700 10.5px 'Space Mono',monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.5}.dc-tp{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}.dc-tp button{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));color:#F4EBDD;font:700 14px inherit;cursor:pointer;text-align:start}.dc-tp i{display:block;width:100%;height:58px;border-radius:8px;background:#fffdf8;opacity:.92;position:relative;overflow:hidden}.dc-tp i::before{content:'';position:absolute;left:10px;top:9px;width:55%;height:6px;border-radius:3px;background:#d4a24c}.dc-tp i::after{content:'';position:absolute;left:10px;top:22px;right:10px;height:26px;background:repeating-linear-gradient(#ddd4c0 0 3px,transparent 3px 8px)}" +
    ".dc-ta{width:100%;box-sizing:border-box;min-height:96px;padding:13px;border-radius:16px;border:1px solid rgba(244,217,139,.3);background:rgba(255,255,255,.05);color:#fff;font:15px/1.6 inherit;outline:0;-webkit-user-select:text;user-select:text}.dc-rc{display:flex;align-items:center;gap:10px;padding:12px 14px;margin:7px 0;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);cursor:pointer}.dc-rc b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.dc-rc small{opacity:.5;font-size:11.5px}.dc-rc button{border:0;background:none;color:rgba(255,255,255,.45);font-size:15px;cursor:pointer}" +
    ".dc-mini{padding:14px}.dc-mini .dc-page{min-height:0;max-height:260px;overflow:hidden;padding:20px 22px;font-size:13px;border-radius:10px;box-shadow:none;position:relative;-webkit-mask-image:linear-gradient(#000 70%,transparent);mask-image:linear-gradient(#000 70%,transparent)}.dc-ex{position:fixed;z-index:10090;right:12px;top:calc(56px + env(safe-area-inset-top));display:none;flex-direction:column;gap:4px;padding:6px;border-radius:16px;background:rgba(24,18,11,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 40px rgba(0,0,0,.6)}.dc-ex.on{display:flex}.dc-ex button{border:0;background:rgba(255,255,255,.07);color:#F4EBDD;border-radius:10px;padding:11px 18px;font:600 14px inherit;text-align:start;cursor:pointer}" +
    "body.light-theme #dc-ov{background:#f3ede0;color:#241c0e}body.light-theme .dc-top input,body.light-theme .dc-b,body.light-theme .dc-tb button,body.light-theme .dc-tb select{color:#241c0e}body.light-theme .dc-b,body.light-theme .dc-tb button,body.light-theme .dc-tb select{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12)}";
  var st = D.createElement("style"); st.id = "dc-css"; st.textContent = CSS; D.head.appendChild(st);

  /* ------------------------------------------------ store */
  function docs() { try { var a = JSON.parse(ls(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveDoc(d) { var a = docs().filter(function (x) { return x.id !== d.id; }); d.ts = Date.now(); a.unshift({ id: d.id, title: d.title, html: d.html, ts: d.ts, style: d.style, dir: d.dir }); ls(KEY, JSON.stringify(a.slice(0, 30))); }

  /* ------------------------------------------------ editor */
  var ov, bub, ex, cur = null, rng = null, busy = false;
  function ensure() {
    if (ov) return;
    ov = D.createElement("div"); ov.id = "dc-ov"; D.body.appendChild(ov);
    bub = D.createElement("div"); bub.className = "dc-bub"; D.body.appendChild(bub);
    ex = D.createElement("div"); ex.className = "dc-ex"; D.body.appendChild(ex);
    D.addEventListener("selectionchange", onSel);
    D.addEventListener("click", function (e) { if (!ex.contains(e.target) && !(e.target.closest && e.target.closest('[data-a="export"]'))) ex.classList.remove("on"); });
  }
  function close() { if (!ov) return; flush(); ov.classList.remove("on"); ov.innerHTML = ""; bub.classList.remove("on"); ex.classList.remove("on"); try { D.body.classList.remove("phr-recede"); } catch (e) {} }
  function flush() { if (cur && cur.page) { cur.html = cur.page.innerHTML; cur.title = (ov.querySelector(".dc-top input") || {}).value || cur.title; if (cur.html.replace(/<[^>]*>|&nbsp;|\s/g, "").length || cur.saved) { saveDoc(cur); cur.saved = 1; } } }

  function start() {
    ensure(); ov.classList.add("on"); try { D.body.classList.add("phr-recede"); } catch (e) {} cur = null;
    var r = docs();
    ov.innerHTML = '<div class="dc-top"><b style="flex:1;font-size:19px;letter-spacing:-.02em">' + esc(T("title")) + '<small style="display:block;font-weight:400;font-size:12px;opacity:.55;margin-top:2px">' + esc(T("sub")) + '</small></b><button class="dc-b x" data-a="close">✕</button></div><div class="dc-start">' +
      '<h4>' + esc(T("brief")) + '</h4><textarea class="dc-ta" placeholder="' + esc(T("briefPh")) + '"></textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="dc-b g" data-a="gen">✦ ' + esc(T("write")) + '</button></div>' +
      '<h4>' + esc(T("tpl")) + '</h4><div class="dc-tp">' + ["report", "resume", "contract", "letter", "blank"].map(function (k) { return '<button data-a="tpl" data-k="' + k + '"><i></i>' + esc(T(k)) + "</button>"; }).join("") + "</div>" +
      '<h4>' + esc(T("recent")) + '</h4>' + (r.length ? r.map(function (d) { return '<div class="dc-rc" data-a="openr" data-id="' + d.id + '"><b>' + esc(d.title || T("untitled")) + "</b><small>" + new Date(d.ts).toLocaleDateString() + '</small><button data-a="delr" data-id="' + d.id + '" title="' + esc(T("del")) + '">✕</button></div>'; }).join("") : '<div style="opacity:.45;font-size:13px;padding:6px 2px">' + esc(T("none")) + "</div>") + "</div>";
    ov.onclick = function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a");
      if (a === "close") close();
      else if (a === "tpl") { var k = b.getAttribute("data-k"), fa = uiFa(); edit({ id: uid(), title: k === "blank" ? "" : T(k), html: tpl(k, fa), dir: fa ? "rtl" : "ltr", style: k === "contract" || k === "letter" ? "classic" : "modern" }); }
      else if (a === "openr") { var d = docs().filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]; if (d) edit(d); }
      else if (a === "delr") { e.stopPropagation(); if (window.confirm(T("confirmDel"))) { ls(KEY, JSON.stringify(docs().filter(function (x) { return x.id !== b.getAttribute("data-id"); }))); start(); } }
      else if (a === "gen") { var br = ov.querySelector(".dc-ta").value.trim(); if (!br) return; generate(br, b); }
    };
  }
  async function ai(sys, usr) { if (typeof window.fetchAI !== "function") throw new Error("no ai"); var r = await window.fetchAI([{ role: "system", content: sys }, { role: "user", content: usr }], false, false); return String(typeof r === "string" ? r : (r && r.content) || "").trim(); }
  async function generate(brief, btn) {
    var fa = isFa(brief); btn.disabled = true; btn.textContent = T("working");
    try {
      var out = await ai("You are an expert professional writer. Write the complete document the user describes. Output ONLY the document as clean HTML using h1, h2, h3, p, ul, ol, li, table (with thead/tbody/th/td), b, i — no html/head/body tags, no markdown fences, no commentary. Start with one h1 title. Be concrete, well structured and ready to use; where the user must supply a fact you cannot know, leave a short ____ placeholder. Write in " + (fa ? "Persian (Farsi)" : "the same language as the request") + ".", brief);
      var html = toHtml(out); if (!html.trim()) throw new Error("empty");
      var t = (html.match(/<h1[^>]*>(.*?)<\/h1>/i) || [0, ""])[1].replace(/<[^>]+>/g, "");
      edit({ id: uid(), title: t.slice(0, 80), html: html, dir: fa ? "rtl" : "ltr", style: "modern" });
    } catch (e) { btn.disabled = false; btn.textContent = "✦ " + T("write"); toast(T("fail")); }
  }
  function tbBtn(c, label, title) { return '<button data-c="' + c + '" title="' + esc(title || c) + '">' + label + "</button>"; }
  function edit(d) {
    cur = d; cur.saved = !!d.ts;
    ov.innerHTML = '<div class="dc-top"><button class="dc-b x" data-a="back">‹</button><input type="text" value="' + esc(d.title || "") + '" placeholder="' + esc(T("untitled")) + '"><button class="dc-b g" data-a="export">' + esc(T("export")) + '</button><button class="dc-b x" data-a="close">✕</button></div>' +
      '<div class="dc-tb">' + tbBtn("undo", "↶") + tbBtn("redo", "↷") + '<span class="sep"></span><select data-s="block"><option value="">' + esc(T("p")) + '</option><option value="h1">' + esc(T("h1")) + '</option><option value="h2">' + esc(T("h2")) + '</option><option value="h3">H3</option></select>' + tbBtn("bold", "<b>B</b>") + tbBtn("italic", "<i>I</i>") + tbBtn("underline", "<u>U</u>") + '<span class="sep"></span>' + tbBtn("insertUnorderedList", "•≡") + tbBtn("insertOrderedList", "1≡") + tbBtn("justifyLeft", "⇤") + tbBtn("justifyCenter", "↔") + tbBtn("justifyRight", "⇥") + '<span class="sep"></span><button data-c="dir" title="' + esc(T("dir")) + '">⇄ ' + (d.dir === "rtl" ? "RTL" : "LTR") + '</button><select data-s="style"><option value="modern">' + esc(T("modern")) + '</option><option value="classic">' + esc(T("classic")) + '</option><option value="compact">' + esc(T("compact")) + "</option></select></div>" +
      '<div class="dc-wrap"><div class="dc-page ' + (d.style || "modern") + '" contenteditable="true" spellcheck="false" dir="' + (d.dir || "ltr") + '"></div></div><div class="dc-cmd"><input type="text" placeholder="' + esc(T("doc")) + '"><button class="dc-b g" data-a="cmd">' + esc(T("go")) + "</button></div>";
    var page = ov.querySelector(".dc-page"); page.innerHTML = clean(d.html) || "<p><br></p>"; cur.page = page;
    ov.querySelector('[data-s="style"]').value = d.style || "modern";
    var tm = 0; page.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { flush(); }, 900); });
    page.addEventListener("paste", function (e) { var t = (e.clipboardData || window.clipboardData); if (!t) return; var h = t.getData("text/html"), p = t.getData("text/plain"); e.preventDefault(); if (h) D.execCommand("insertHTML", false, clean(h)); else D.execCommand("insertText", false, p); });
    ov.onclick = function (e) {
      var b = e.target.closest("[data-a],[data-c]"); if (!b) return; var a = b.getAttribute("data-a"), c = b.getAttribute("data-c");
      if (c) { if (c === "dir") { cur.dir = page.getAttribute("dir") === "rtl" ? "ltr" : "rtl"; page.setAttribute("dir", cur.dir); b.textContent = "⇄ " + cur.dir.toUpperCase(); } else { page.focus(); D.execCommand(c, false, null); } return; }
      if (a === "close") close(); else if (a === "back") { flush(); start(); }
      else if (a === "export") { e.stopPropagation(); ex.innerHTML = '<button data-x="pdf">PDF</button><button data-x="docx">' + esc(T("word")) + "</button>"; ex.classList.toggle("on"); }
      else if (a === "cmd") whole();
    };
    ov.onchange = function (e) { var s = e.target.getAttribute("data-s"); if (s === "block") { page.focus(); D.execCommand("formatBlock", false, e.target.value || "p"); e.target.value = ""; } else if (s === "style") { cur.style = e.target.value; page.className = "dc-page " + cur.style; flush(); } };
    ov.querySelector(".dc-cmd input").addEventListener("keydown", function (e) { if (e.key === "Enter") whole(); });
    ex.onclick = function (e) { var b = e.target.closest("[data-x]"); if (!b) return; ex.classList.remove("on"); doExport(b.getAttribute("data-x")); };
  }

  /* ------------------------------------------------ AI: whole doc + selection */
  async function whole() {
    var inp = ov.querySelector(".dc-cmd input"), cmd = inp.value.trim(); if (!cmd || busy) return; busy = true; var btn = ov.querySelector('[data-a="cmd"]'), old = btn.textContent; btn.textContent = "…"; btn.disabled = true;
    try {
      var out = await ai("You are an expert editor. Apply the user's instruction to the document and return the COMPLETE updated document as clean HTML (h1,h2,h3,p,ul,ol,li,table,b,i only; no fences, no commentary). Keep everything the instruction does not touch. Keep the document's language unless told otherwise.", "Instruction: " + cmd + "\n\nDocument:\n" + cur.page.innerHTML);
      var html = toHtml(out); if (!html.trim()) throw new Error("empty");
      cur.page.focus(); var sel = getSelection(), r = D.createRange(); r.selectNodeContents(cur.page); sel.removeAllRanges(); sel.addRange(r); D.execCommand("insertHTML", false, html); inp.value = ""; flush(); toast(T("saved"));
    } catch (e) { toast(T("fail")); } finally { busy = false; btn.textContent = old; btn.disabled = false; }
  }
  var LANGS = [["English", "English"], ["Persian (Farsi)", "فارسی"], ["Arabic", "العربية"], ["Turkish", "Türkçe"], ["German", "Deutsch"], ["French", "Français"], ["Spanish", "Español"], ["Russian", "Русский"], ["Chinese", "中文"]];
  var ACT = { shorter: "Rewrite this text shorter and tighter, keeping every key point.", longer: "Expand this text with a little more useful detail, same tone.", formal: "Rewrite this text in a polished, formal, professional tone.", friendly: "Rewrite this text in a warm, friendly, natural tone.", fix: "Fix spelling, grammar and punctuation only. Do not change the wording otherwise.", improve: "Improve clarity, flow and word choice while keeping the meaning and length similar." };
  function onSel() {
    if (!ov || !ov.classList.contains("on") || !cur || !cur.page || busy) return;
    var s = getSelection(); if (!s.rangeCount || s.isCollapsed || !cur.page.contains(s.anchorNode) || !cur.page.contains(s.focusNode)) { if (!bub.contains(D.activeElement)) bub.classList.remove("on"); return; }
    var r = s.getRangeAt(0); if (String(s).trim().length < 2) { bub.classList.remove("on"); return; }
    rng = r.cloneRange(); var rect = r.getBoundingClientRect(), vw = innerWidth;
    bub.innerHTML = ["shorter", "longer", "formal", "friendly", "fix", "improve"].map(function (k) { return '<button data-k="' + k + '">' + esc(T(k)) + "</button>"; }).join("") + '<select data-k="tr"><option value="">' + esc(T("translate")) + "</option>" + LANGS.map(function (l) { return '<option value="' + esc(l[0]) + '">' + esc(l[1]) + "</option>"; }).join("") + '</select><button class="g" data-k="custom">' + esc(T("custom")) + "</button>";
    bub.classList.add("on"); var bw = bub.offsetWidth, bh = bub.offsetHeight, top = rect.bottom + 10; if (top + bh > innerHeight - 70) top = Math.max(60, rect.top - bh - 10);
    bub.style.top = top + "px"; bub.style.left = Math.max(8, Math.min(vw - bw - 8, rect.left + rect.width / 2 - bw / 2)) + "px";
  }
  async function runSel(instr) {
    if (!rng || busy) return; var s = getSelection(), text = rng.toString(); if (!text.trim()) return; busy = true;
    bub.innerHTML = '<div class="st">' + esc(T("working")) + "</div>";
    try {
      var ctx = (cur.page.textContent || "").slice(0, 1500), out = await ai("You edit a selected passage inside a document. Return ONLY the rewritten passage as plain text — no quotes, no labels, no explanations. Keep the original language unless the instruction says to translate. Preserve paragraph breaks with blank lines.", "Instruction: " + instr + "\n\nDocument context (for tone only):\n" + ctx + "\n\nSelected passage:\n" + text);
      out = out.replace(/^["“«]|["”»]$/g, "").trim(); if (!out) throw new Error("empty");
      cur.page.focus(); s.removeAllRanges(); s.addRange(rng); D.execCommand("insertText", false, out); flush();
    } catch (e) { toast(T("fail")); } finally { busy = false; bub.classList.remove("on"); }
  }
  D.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".dc-bub [data-k]"); if (!b || b.tagName === "SELECT") return; var k = b.getAttribute("data-k");
    if (ACT[k]) runSel(ACT[k]); else if (k === "custom") { var q = window.prompt(T("customPh")); if (q && q.trim()) runSel(q.trim()); }
  });
  D.addEventListener("change", function (e) { if (e.target.matches && e.target.matches(".dc-bub select[data-k=tr]") && e.target.value) runSel("Translate this text into " + e.target.value + ". Keep the meaning, names and formatting."); });
  D.addEventListener("mousedown", function (e) { if (e.target.closest && e.target.closest(".dc-bub")) { if (e.target.tagName !== "SELECT") e.preventDefault(); } });

  /* ------------------------------------------------ export */
  function nameOf() { return ((ov.querySelector(".dc-top input") || {}).value || cur.title || "document").replace(/[\\/:*?"<>|]+/g, "-").trim() || "document"; }
  function download(blob, name) { var u = URL.createObjectURL(blob), a = D.createElement("a"); a.href = u; a.download = name; D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
  async function doExport(kind) {
    flush(); var nm = nameOf(), el = cur.page.cloneNode(true); el.removeAttribute("contenteditable");
    try {
      if (kind === "docx") {
        if (window.PHR_FILE && PHR_FILE._docx) { el.setAttribute("dir", cur.dir || "ltr"); download(PHR_FILE._docx(el), nm + ".docx"); }
        else { var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body dir="' + (cur.dir || "ltr") + '">' + el.innerHTML + "</body></html>"; download(new Blob(["﻿", h], { type: "application/msword" }), nm + ".doc"); }
        toast(T("exported"));
      } else if (window.html2pdf) {
        var holder = D.createElement("div"); holder.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff"; el.style.cssText = "box-shadow:none;border-radius:0;min-height:0;margin:0;width:794px"; holder.appendChild(el); D.body.appendChild(holder);
        await html2pdf().set({ margin: [10, 8, 12, 8], filename: nm + ".pdf", image: { type: "jpeg", quality: .96 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }, pagebreak: { mode: ["css", "legacy"], avoid: ["h1", "h2", "h3", "tr", "li"] } }).from(el).save();
        holder.remove(); toast(T("exported"));
      } else { var w = window.open("", "_blank"); if (!w) { toast(T("popup")); return; } w.document.write("<!doctype html><meta charset=utf-8><title>" + esc(nm) + "</title><style>body{font:16px/1.7 system-ui,Vazirmatn;max-width:760px;margin:30px auto}</style><body dir=" + (cur.dir || "ltr") + ">" + el.innerHTML + "</body>"); w.document.close(); w.print(); }
    } catch (e) { console.warn("[docstudio] export", e); toast(T("fail")); }
  }

  /* ------------------------------------------------ entries */
  function open(html, title) { ensure(); if (html) { var fa = isFa(html); ov.classList.add("on"); try { D.body.classList.add("phr-recede"); } catch (e) {} edit({ id: uid(), title: title || "", html: toHtml(html), dir: fa ? "rtl" : "ltr", style: "modern" }); } else start(); }
  function tile() {
    var g = D.querySelector("#tools-menu .tools-grid"); if (!g) return false; if (g.querySelector("[data-dc]")) return true;
    var t = D.createElement("div"); t.className = "tool-tile"; t.setAttribute("data-dc", "1"); t.style.setProperty("--tile-color", "#B58CFF");
    t.innerHTML = '<i class="tt-ic"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg></i><span class="tt-n">' + esc(T("title")) + '</span><small class="tt-s">Reports · CV · Contracts</small>';
    t.addEventListener("click", function () { try { window.closeAllDropMenus && window.closeAllDropMenus(); } catch (e) {} open(); });
    g.insertBefore(t, g.firstChild); return true;
  }
  var n = 0, iv = setInterval(function () { if (tile() || ++n > 30) clearInterval(iv); }, 700);
  var W = window.PHRW;
  if (W && W.builders) {
    var oldKind = W.kindOf; W.kindOf = function (l) { return /^(docstudio|document|docpage)$/i.test(String(l || "")) ? "docstudio" : oldKind(l); }; W.kinds.docstudio = 1;
    W.builders.docstudio = function (root) {
      var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
      var title = (raw.match(/^\s*title\s*:\s*(.+)$/im) || [0, ""])[1].trim(), body = raw.replace(/^\s*title\s*:.*\n?/im, ""), html = toHtml(body), fa = isFa(body);
      root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(T("title")) + '</span><span class="phr-w-title">' + esc(title) + '</span></div><div class="dc-mini"><div class="dc-page" dir="' + (fa ? "rtl" : "ltr") + '">' + html + '</div><div style="padding-top:10px"><button class="phr-w-btn gold" data-a="o">' + esc(T("mini")) + "</button></div></div>";
      root.querySelector('[data-a="o"]').onclick = function () { open(html, title); };
    };
  }
  window.PHR_DOCS = { open: open, md2html: md2html, clean: clean, tpl: tpl };
})();
