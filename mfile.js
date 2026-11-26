/* mfile.js — multi-file projects with file tree, tabs, live preview, tests, self-fix loop and ZIP export.
   Fence:  ```files   (aliases: multifile, repo, codeproject, workspace)
     title: Todo app
     entry: index.html
     --- file: index.html
     ...
     --- file: src/app.js
     ...
     --- test: tests/app.test.js      (JS tests: test(name,fn) + expect()/assert())
     --- test: tests/test_logic.py    (Python tests: functions named test_*, plain assert)
   Build & Test: if the project has tests, they run automatically; failures are sent back to the model (max 3 rounds),
   the fixed files replace the project, and the badge tells the honest result. */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders || window.__mfile) return; window.__mfile = 1;
  var ALIAS = { files: 1, multifile: 1, repo: 1, codeproject: 1, workspace: 1 };
  var oldKind = W.kindOf; W.kindOf = function (l) { return ALIAS[String(l || "").toLowerCase()] ? "mfile" : oldKind(l); };
  W.kinds.mfile = 1;
  var esc = W.esc || function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var SEQ = 0, MAXFIX = 3, PYV = "0.25.1";
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  var L = {
    en: { badge: "Project", files: "Files", preview: "Preview", tests: "Tests", console: "Console", run: "▶ Run", test: "Run tests", zip: "Export ZIP", copy: "Copy all", fix: "Fix with AI", add: "New file", del: "Delete", name: "File name (e.g. src/util.js)",
      none: "No tests in this project", testing: "Testing…", verified: "Verified", failing: "Not passing", fixing: "Self-fixing", attempt: "attempt", honest: "Tests still fail after 3 automatic attempts — treat this code as unverified.", noTests: "Unverified (no tests)", pass: "passed", fail: "failed", sandbox: "Runs in an isolated sandbox · no network", log: "Verification log", nofiles: "The project has no files", empty: "—", ok: "Done" },
    fa: { badge: "پروژه", files: "فایل‌ها", preview: "پیش‌نمایش", tests: "تست‌ها", console: "کنسول", run: "▶ اجرا", test: "اجرای تست‌ها", zip: "خروجی ZIP", copy: "کپی همه", fix: "رفع با هوش مصنوعی", add: "فایل جدید", del: "حذف", name: "نام فایل (مثلاً src/util.js)",
      none: "این پروژه تست ندارد", testing: "در حال تست…", verified: "تأییدشده", failing: "ناموفق", fixing: "رفع خودکار", attempt: "تلاش", honest: "بعد از ۳ تلاش خودکار هنوز تست‌ها شکست می‌خورند — این کد را تأییدنشده در نظر بگیر.", noTests: "تأییدنشده (بدون تست)", pass: "موفق", fail: "ناموفق", sandbox: "در سندباکس ایزوله اجرا می‌شود · بدون شبکه", log: "گزارش راستی‌آزمایی", nofiles: "پروژه فایلی ندارد", empty: "—", ok: "انجام شد" }
  };
  function tt(lg, k) { return (L[lg] && L[lg][k]) || L.en[k] || k; }

  /* ---------------------------------------------------------------- parse / serialize */
  function isTestName(n) { return /(^|\/)(test_[^/]*|[^/]*(\.|_)(test|spec)\.[a-z]+|tests?\/[^/]+)$/i.test(n); }
  function parse(body) {
    var P = { title: "", entry: "", files: [] }, cur = null, head = true;
    String(body || "").replace(/\r/g, "").split("\n").forEach(function (ln) {
      var m = ln.match(/^---\s*(file|test)\s*:\s*(.+?)\s*$/i);
      if (m) { head = false; cur = { name: m[2].replace(/^\.?\//, ""), test: m[1].toLowerCase() === "test", text: [] }; P.files.push(cur); return; }
      if (head) { var k = ln.match(/^\s*(title|entry)\s*:\s*(.*)$/i); if (k) P[k[1].toLowerCase()] = k[2].trim(); return; }
      if (cur) cur.text.push(ln);
    });
    P.files.forEach(function (f) { f.text = f.text.join("\n").replace(/^\n+|\s+$/g, "") + "\n"; if (!f.test && isTestName(f.name) && /\.(js|py|mjs)$/i.test(f.name)) f.test = true; });
    if (!P.entry) { var h = P.files.filter(function (f) { return /(^|\/)index\.html?$/i.test(f.name); })[0] || P.files.filter(function (f) { return /\.html?$/i.test(f.name); })[0]; P.entry = h ? h.name : ""; }
    return P;
  }
  function serialize(P) {
    return (P.title ? "title: " + P.title + "\n" : "") + (P.entry ? "entry: " + P.entry + "\n" : "") + P.files.map(function (f) { return "--- " + (f.test ? "test" : "file") + ": " + f.name + "\n" + f.text.replace(/\n+$/, ""); }).join("\n") + "\n";
  }
  function extractProject(reply) {
    var m = String(reply || "").match(/```(?:files|multifile|repo|codeproject|workspace)[^\n]*\n([\s\S]*?)\n```/i);
    if (!m) return null; var P = parse(m[1]); return P.files.length ? P : null;
  }

  /* ---------------------------------------------------------------- ZIP (store only) */
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { var c = 0xFFFFFFFF, i; for (i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) { // files: [{name,text}]
    var enc = new TextEncoder(), parts = [], cen = [], off = 0, d = new Date();
    var dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    function u16(v) { return [v & 255, (v >> 8) & 255]; } function u32(v) { return [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var nm = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var lh = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dt), u16(dd), u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0));
      parts.push(new Uint8Array(lh), nm, data);
      cen.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dt), u16(dd), u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
      off += lh.length + nm.length + data.length;
    });
    var cs = 0; cen.forEach(function (p) { cs += p.length; });
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cs), u32(off), u16(0)));
    return new Blob(parts.concat(cen, [end]), { type: "application/zip" });
  }
  W.zip = zip;

  /* ---------------------------------------------------------------- sandbox documents */
  function guard(src) { return String(src).replace(/\b(for|while)\s*\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)\s*\{/g, function (m) { return m + "__lp();"; }); }
  function inlineDoc(P, withTests, id) {
    var by = {}; P.files.forEach(function (f) { by[f.name] = f; });
    function look(p) { p = String(p || "").replace(/^\.?\//, "").split(/[?#]/)[0]; var base = (P.entry || "").replace(/[^/]*$/, ""); return by[p] || by[base + p] || by[p.replace(/^.*\//, "")] || null; }
    var html = P.entry && by[P.entry] ? by[P.entry].text : "<!doctype html><html><head><meta charset=utf-8></head><body></body></html>";
    var used = {};
    html = html.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, function (tag) { var h = tag.match(/href=["']([^"']+)["']/i), f = h && look(h[1]); if (!f) return tag; used[f.name] = 1; return "<style>" + f.text.replace(/<\/style/gi, "<\\/style") + "</style>"; });
    html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, function (all, a, src, b) { var f = look(src); if (!f) return all; used[f.name] = 1; return "<script>" + guard(f.text).replace(/<\/script/gi, "<\\/script") + "<\/script>"; });
    var bridge = "<script>(function(){var ID=" + JSON.stringify(id) + ";var n=0;window.__lp=function(){if(++n>4e6)throw new Error('Infinite loop stopped')};function S(x){if(typeof x==='string')return x;if(x instanceof Error)return x.name+': '+x.message;try{return JSON.stringify(x)}catch(e){return String(x)}}function send(t,a){try{parent.postMessage({phrmf:ID,t:t,m:[].map.call(a,S).join(' ').slice(0,1500)},'*')}catch(e){}}['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){send(k,arguments);try{o.apply(console,arguments)}catch(e){}}});window.addEventListener('error',function(e){send('error',[e.message+(e.lineno?' (line '+e.lineno+')':'')])});window.addEventListener('unhandledrejection',function(e){send('error',['Unhandled: '+S(e.reason)])})})();<\/script>";
    var extra = "";
    if (withTests) {
      var js = P.files.filter(function (f) { return f.test && /\.m?js$/i.test(f.name); });
      extra = "<script>" + HARNESS.replace("__ID__", JSON.stringify(id)) + "<\/script>" + js.map(function (f) { return "<script>__file(" + JSON.stringify(f.name) + ");try{\n" + guard(f.text).replace(/<\/script/gi, "<\\/script") + "\n}catch(e){__fail(" + JSON.stringify(f.name) + ",e)}<\/script>"; }).join("") + "<script>__go()<\/script>";
    }
    // non-inlined plain scripts (not referenced from html) are NOT auto-run: only what the entry file references runs.
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, function (m) { return m + bridge; }); else html = bridge + html;
    if (extra) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, function () { return extra + "</body>"; }) : html + extra;
    return html;
  }
  var HARNESS = "(function(){var ID=__ID__,Q=[],cf='';window.__file=function(n){cf=n};window.__fail=function(n,e){Q.push([n+' (load)',function(){throw e}])};" +
    "function S(x){if(typeof x==='string')return JSON.stringify(x);try{return JSON.stringify(x)}catch(e){return String(x)}}" +
    "window.test=window.it=function(n,f){Q.push([(cf?cf+' › ':'')+n,f])};window.describe=function(n,f){var o=cf;cf=(cf?cf+' › ':'')+n;try{f()}finally{cf=o}};" +
    "function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}" +
    "function mk(a,neg){function c(ok,msg){if(neg?ok:!ok)throw new Error((neg?'Expected NOT: ':'')+msg)}return{toBe:function(b){c(Object.is(a,b),'Expected '+S(a)+' to be '+S(b))},toEqual:function(b){c(eq(a,b),'Expected '+S(a)+' to equal '+S(b))},toStrictEqual:function(b){c(eq(a,b),'Expected '+S(a)+' to equal '+S(b))},toBeTruthy:function(){c(!!a,'Expected '+S(a)+' to be truthy')},toBeFalsy:function(){c(!a,'Expected '+S(a)+' to be falsy')},toBeNull:function(){c(a===null,'Expected null, got '+S(a))},toBeUndefined:function(){c(a===undefined,'Expected undefined, got '+S(a))},toBeDefined:function(){c(a!==undefined,'Expected a defined value')},toContain:function(b){c(a!=null&&a.indexOf(b)>=0,'Expected '+S(a)+' to contain '+S(b))},toHaveLength:function(n){c(a!=null&&a.length===n,'Expected length '+n+', got '+(a&&a.length))},toBeGreaterThan:function(b){c(a>b,'Expected '+a+' > '+b)},toBeGreaterThanOrEqual:function(b){c(a>=b,'Expected '+a+' >= '+b)},toBeLessThan:function(b){c(a<b,'Expected '+a+' < '+b)},toBeLessThanOrEqual:function(b){c(a<=b,'Expected '+a+' <= '+b)},toBeCloseTo:function(b,d){c(Math.abs(a-b)<Math.pow(10,-(d==null?2:d))/2,'Expected '+a+' ≈ '+b)},toMatch:function(r){c(r.test?r.test(a):String(a).indexOf(r)>=0,'Expected '+S(a)+' to match '+r)},toThrow:function(){var t=false;try{a()}catch(e){t=true}c(t,'Expected function to throw')}}}" +
    "window.expect=function(a){var o=mk(a,false);o.not=mk(a,true);return o};window.assert=function(c,m){if(!c)throw new Error(m||'assertion failed')};assert.equal=function(a,b){if(a!=b)throw new Error('Expected '+S(a)+' == '+S(b))};assert.strictEqual=function(a,b){if(!Object.is(a,b))throw new Error('Expected '+S(a)+' === '+S(b))};assert.deepEqual=function(a,b){if(!eq(a,b))throw new Error('Expected '+S(a)+' deep-equal '+S(b))};" +
    "window.__go=async function(){var R=[];for(var i=0;i<Q.length;i++){var t0=Date.now();try{await Promise.race([Promise.resolve(Q[i][1]()),new Promise(function(_,j){setTimeout(function(){j(new Error('Timeout 4s'))},4000)})]);R.push({n:Q[i][0],ok:1})}catch(e){R.push({n:Q[i][0],ok:0,e:String(e&&e.message||e).slice(0,400)})}}parent.postMessage({phrmf:ID,t:'tests',r:R},'*')}})();";

  function pyDoc(P, id) {
    var files = {}; P.files.forEach(function (f) { if (/\.py$/i.test(f.name)) files[f.name] = f.text; });
    var tests = P.files.filter(function (f) { return f.test && /\.py$/i.test(f.name); }).map(function (f) { return f.name; });
    return "<!doctype html><meta charset=utf-8><script src='https://cdn.jsdelivr.net/pyodide/v" + PYV + "/full/pyodide.js'><\/script><script>(async function(){var ID=" + JSON.stringify(id) + ",F=" + JSON.stringify(files).replace(/</g, "\\u003c") + ",T=" + JSON.stringify(tests) + ";function post(r){parent.postMessage({phrmf:ID,t:'tests',r:r},'*')}try{var py=await loadPyodide();" +
      "for(var n in F){var d=n.split('/').slice(0,-1);var p='';d.forEach(function(x){p+=(p?'/':'')+x;try{py.FS.mkdir(p)}catch(e){}});py.FS.writeFile(n,F[n])}" +
      "py.globals.set('__T',T);var out=await py.runPythonAsync(\"import sys,json,importlib,traceback\\nsys.path.insert(0,'.')\\nR=[]\\nfor t in __T:\\n    mod=t[:-3].replace('/','.')\\n    try:\\n        m=importlib.import_module(mod)\\n    except Exception as e:\\n        R.append({'n':t+' (import)','ok':0,'e':traceback.format_exc()[-400:]});continue\\n    for k in sorted(dir(m)):\\n        if k.startswith('test') and callable(getattr(m,k)):\\n            try:\\n                getattr(m,k)();R.append({'n':t+' › '+k,'ok':1})\\n            except BaseException as e:\\n                R.append({'n':t+' › '+k,'ok':0,'e':(type(e).__name__+': '+str(e))[:400]})\\njson.dumps(R)\");post(JSON.parse(out))}catch(e){post([{n:'python runtime',ok:0,e:String(e&&e.message||e).slice(0,400)}])}})()<\/script>";
  }

  /* ---------------------------------------------------------------- UI */
  var CSS = ".mf{color:#F4EBDD}.mf-top{display:flex;align-items:center;gap:8px;padding:0 14px 10px;flex-wrap:wrap}.mf-badge{display:inline-flex;align-items:center;gap:6px;font:700 11px 'Space Grotesk',sans-serif;padding:5px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06)}.mf-badge i{width:7px;height:7px;border-radius:50%;background:#999}.mf-badge.ok{border-color:rgba(88,196,143,.5);color:#7be0ae}.mf-badge.ok i{background:#58C48F}.mf-badge.bad{border-color:rgba(255,107,90,.5);color:#ff8d7f}.mf-badge.bad i{background:#ff6b5a}.mf-badge.run i{background:#F4D98B;animation:mfp 1s infinite}@keyframes mfp{50%{opacity:.25}}" +
    ".mf-body{display:grid;grid-template-columns:minmax(0,130px) minmax(0,1fr);gap:0;border-top:1px solid rgba(255,255,255,.08)}.mf-tree{padding:8px 6px;border-right:1px solid rgba(255,255,255,.08);max-height:360px;overflow:auto;font:12px 'IBM Plex Mono',monospace}.mf-tree button{display:block;width:100%;text-align:left;background:none;border:0;color:rgba(244,235,221,.75);padding:6px 8px;border-radius:8px;font:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.mf-tree button.on{background:rgba(244,217,139,.14);color:#F4D98B}.mf-tree .t::after{content:' ✓';opacity:.5}.mf-tree .dir{padding:6px 8px 2px;opacity:.45;font-size:10.5px}" +
    ".mf-main{min-width:0}.mf-tabs{display:flex;gap:6px;padding:8px 10px;overflow-x:auto;scrollbar-width:none}.mf-tabs::-webkit-scrollbar{display:none}.mf-tabs button{flex:none;padding:6px 12px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(244,235,221,.8);font:600 12px 'Space Grotesk',sans-serif;cursor:pointer}.mf-tabs button.on{background:#F4D98B;color:#1a1206;border-color:transparent}" +
    ".mf-pane{display:none}.mf-pane.on{display:block}.mf-fr{width:100%;height:340px;border:0;background:#fff;display:block}.mf-ed{width:100%;height:340px;box-sizing:border-box;border:0;outline:0;resize:none;background:#0d0906;color:#F4EBDD;font:12.5px/1.65 'IBM Plex Mono',monospace;padding:12px;tab-size:2;white-space:pre;overflow:auto;direction:ltr;-webkit-user-select:text;user-select:text}" +
    ".mf-log{max-height:340px;overflow:auto;padding:10px 12px;font:12px/1.6 'IBM Plex Mono',monospace;direction:ltr;text-align:left;-webkit-user-select:text;user-select:text}.mf-log div{padding:2px 0;white-space:pre-wrap;word-break:break-word}.mf-log .error,.mf-log .no{color:#ff8d7f}.mf-log .warn{color:#F4D98B}.mf-log .yes{color:#7be0ae}.mf-log .hd{opacity:.55;margin-top:6px}" +
    ".mf-bar{display:flex;gap:8px;padding:10px 14px 12px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.08)}.mf-bar .phr-w-btn{flex:none}.mf-note{padding:0 14px 12px;font-size:11px;opacity:.5}.mf-hon{margin:0 14px 10px;padding:9px 12px;border-radius:12px;background:rgba(255,107,90,.1);border:1px solid rgba(255,107,90,.35);font-size:12.5px;line-height:1.6}" +
    "@media(max-width:520px){.mf-body{grid-template-columns:1fr}.mf-tree{max-height:none;border-right:0;border-bottom:1px solid rgba(255,255,255,.08);display:flex;gap:4px;overflow-x:auto;padding:6px}.mf-tree button{width:auto;flex:none}.mf-tree .dir{display:none}}";
  (function () { var s = document.createElement("style"); s.id = "mf-css"; s.textContent = CSS; document.head.appendChild(s); })();

  function ask(text) { try { var ui = document.getElementById("ui"); if (ui && typeof window.PHR_sendText === "function") return window.PHR_sendText(text); } catch (e) {} return false; }

  W.builders.mfile = function (root) {
    var lg = root._lang === "fa" ? "fa" : "en", T = function (k) { return tt(lg, k); };
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var P = parse(raw); if (!P.files.length) throw new Error(T("nofiles"));
    var key = "phr_mf_" + hash(raw), saved = null; try { saved = JSON.parse(ls(key) || "null"); } catch (e) {}
    var fresh = !saved; if (saved && saved.files) { P.files = saved.files; P.entry = saved.entry || P.entry; }
    var id = "mf" + (++SEQ) + "_" + Math.random().toString(36).slice(2, 7), cur = P.files.filter(function (f) { return !f.test; })[0] || P.files[0], logs = [], vlog = [], status = saved && saved.status || "", attempts = saved ? saved.attempts || 0 : 0, tab = "preview", frs = {}, busy = false, lastRes = null;
    var title = P.title || "";
    root.classList.add("mf");
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(T("badge")) + '</span><span class="phr-w-title">' + esc(title) + '</span><button class="phr-w-x" data-a="full" title="Expand">⤢</button></div>' +
      '<div class="mf-top"><span class="mf-badge"><i></i><b></b></span></div><div class="mf-hon" hidden></div>' +
      '<div class="mf-body"><div class="mf-tree"></div><div class="mf-main"><div class="mf-tabs"></div>' +
      '<div class="mf-pane on" data-p="preview"><iframe class="mf-fr" sandbox="allow-scripts" title="preview"></iframe></div>' +
      '<div class="mf-pane" data-p="tests"><div class="mf-log" data-l="tests"></div></div>' +
      '<div class="mf-pane" data-p="console"><div class="mf-log" data-l="console"></div></div>' +
      '<div class="mf-pane" data-p="edit"><textarea class="mf-ed" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea></div></div></div>' +
      '<div class="mf-bar"><button class="phr-w-btn" data-a="run">' + esc(T("run")) + '</button><button class="phr-w-btn" data-a="test">' + esc(T("test")) + '</button><button class="phr-w-btn" data-a="add">+ ' + esc(T("add")) + '</button><button class="phr-w-btn" data-a="del">' + esc(T("del")) + '</button><button class="phr-w-btn" data-a="fix">' + esc(T("fix")) + '</button><button class="phr-w-btn" data-a="copy">' + esc(T("copy")) + '</button><button class="phr-w-btn gold" data-a="zip">' + esc(T("zip")) + '</button></div>' +
      '<div class="mf-note">' + esc(T("sandbox")) + '</div>';
    var q = function (s) { return root.querySelector(s); };
    var ta = q(".mf-ed"), fr = q(".mf-fr"), badge = q(".mf-badge"), hon = q(".mf-hon");

    function hasTests() { return P.files.some(function (f) { return f.test; }); }
    function persist() { ls(key, JSON.stringify({ files: P.files, entry: P.entry, status: status, attempts: attempts })); }
    function setBadge(cls, txt) { badge.className = "mf-badge " + cls; badge.querySelector("b").textContent = txt; }
    function paintBadge() {
      if (busy) return;
      if (!hasTests()) { setBadge("", T("noTests")); return; }
      if (lastRes) { var p = lastRes.filter(function (r) { return r.ok; }).length, n = lastRes.length; if (p === n && n) setBadge("ok", T("verified") + " · " + p + "/" + n); else setBadge("bad", T("failing") + " · " + p + "/" + n); }
      else setBadge("", T("tests"));
    }
    function paintTree() {
      var dirs = {}, h = "";
      P.files.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (f) {
        var d = f.name.indexOf("/") > 0 ? f.name.replace(/\/[^/]*$/, "") : ""; if (d && !dirs[d]) { dirs[d] = 1; h += '<div class="dir">' + esc(d) + "/</div>"; }
        h += '<button class="' + (f === cur ? "on " : "") + (f.test ? "t" : "") + '" data-f="' + esc(f.name) + '">' + esc(f.name.replace(/^.*\//, "")) + "</button>";
      });
      q(".mf-tree").innerHTML = h;
    }
    function paintTabs() {
      var tabs = [["preview", T("preview")], ["edit", cur ? cur.name.replace(/^.*\//, "") : "—"], ["tests", T("tests")], ["console", T("console")]];
      q(".mf-tabs").innerHTML = tabs.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? "on" : "") + '">' + esc(t[1]) + "</button>"; }).join("");
      [].forEach.call(root.querySelectorAll(".mf-pane"), function (p) { p.classList.toggle("on", p.getAttribute("data-p") === tab); });
    }
    function paintLogs() {
      var c = q('[data-l="console"]'); c.innerHTML = logs.length ? logs.map(function (l) { return '<div class="' + l.t + '">' + esc(l.m) + "</div>"; }).join("") : '<div class="hd">' + esc(T("empty")) + "</div>"; c.scrollTop = c.scrollHeight;
      var t = q('[data-l="tests"]'), h = "";
      if (!hasTests()) h = '<div class="hd">' + esc(T("none")) + "</div>";
      else if (lastRes) h = lastRes.map(function (r) { return '<div class="' + (r.ok ? "yes" : "no") + '">' + (r.ok ? "✓ " : "✕ ") + esc(r.n) + (r.ok ? "" : "\n   " + esc(r.e || "")) + "</div>"; }).join("");
      if (vlog.length) h += '<div class="hd">— ' + esc(T("log")) + "</div>" + vlog.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join("");
      t.innerHTML = h || '<div class="hd">' + esc(T("empty")) + "</div>";
    }
    function runPreview() {
      logs = []; paintLogs(); if (!P.entry && !P.files.some(function (f) { return /\.html?$/i.test(f.name); })) { fr.srcdoc = "<body style='font:14px system-ui;padding:20px;color:#555'>No HTML entry — this project has no preview. Use Tests.</body>"; return; }
      fr.srcdoc = inlineDoc(P, false, id);
    }
    function runTests() {
      return new Promise(function (resolve) {
        var tid = id + "_t" + Date.now(), done = false, ifr = document.createElement("iframe");
        ifr.setAttribute("sandbox", "allow-scripts"); ifr.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0";
        var hasJs = P.files.some(function (f) { return f.test && /\.m?js$/i.test(f.name); }), hasPy = P.files.some(function (f) { return f.test && /\.py$/i.test(f.name); });
        var results = [], waiting = (hasJs ? 1 : 0) + (hasPy ? 1 : 0), ifrs = [];
        if (!waiting) { resolve([]); return; }
        function fin() { if (done) return; done = true; window.removeEventListener("message", on); ifrs.forEach(function (x) { x.remove(); }); resolve(results); }
        function on(e) { var d = e.data; if (!d || d.phrmf !== tid || d.t !== "tests") return; results = results.concat(d.r || []); if (--waiting <= 0) fin(); }
        window.addEventListener("message", on);
        if (hasJs) { var a = ifr; a.srcdoc = inlineDoc(P, true, tid); root.appendChild(a); ifrs.push(a); }
        if (hasPy) { var b = document.createElement("iframe"); b.setAttribute("sandbox", "allow-scripts"); b.style.cssText = ifr.style.cssText; b.srcdoc = pyDoc(P, tid); root.appendChild(b); ifrs.push(b); }
        setTimeout(function () { if (!done) { if (!results.length) results.push({ n: "test run", ok: 0, e: "Timed out (no response in 40s)" }); fin(); } }, 40000);
      });
    }
    function failText(res) { return res.filter(function (r) { return !r.ok; }).map(function (r) { return "- " + r.n + ": " + r.e; }).join("\n"); }

    async function verify(autoFix) {
      if (busy) return; busy = true;
      try {
        for (var round = 0; round <= MAXFIX; round++) {
          setBadge("run", T("testing")); paintLogs();
          var res = await runTests(); lastRes = res;
          var bad = res.filter(function (r) { return !r.ok; });
          vlog.push((round ? T("attempt") + " " + round + ": " : "") + (res.length - bad.length) + "/" + res.length + " " + T("pass")); paintLogs();
          if (!bad.length || !autoFix || round === MAXFIX || typeof window.fetchAI !== "function") { status = bad.length ? "fail" : "ok"; if (bad.length && autoFix) { hon.hidden = false; hon.textContent = T("honest"); } else hon.hidden = true; break; }
          setBadge("run", T("fixing") + " " + (round + 1) + "/" + MAXFIX); attempts = round + 1;
          var sys = { role: "system", content: "You are a careful senior engineer fixing a failing project. Reply with ONLY one fenced block whose language is  files  containing the FULL corrected project in the same format (header lines title:/entry:, then --- file: path and --- test: path sections). Do not weaken or delete tests just to make them pass unless a test is plainly wrong; fix the code. No prose, no triple backticks inside files." };
          var usr = { role: "user", content: "Failing tests:\n" + failText(res) + (logs.length ? "\n\nConsole errors:\n" + logs.filter(function (l) { return l.t === "error"; }).slice(-5).map(function (l) { return l.m; }).join("\n") : "") + "\n\nCurrent project:\n```files\n" + serialize(P) + "```" };
          var reply = ""; try { reply = await window.fetchAI([sys, usr], false, false); } catch (e) { vlog.push("AI: " + (e && e.message || e)); paintLogs(); status = "fail"; break; }
          var np = extractProject(typeof reply === "string" ? reply : (reply && reply.content) || "");
          if (!np) { vlog.push("AI reply had no project block"); paintLogs(); status = "fail"; break; }
          P.files = np.files; if (np.entry) P.entry = np.entry; cur = P.files.filter(function (f) { return f.name === (cur && cur.name); })[0] || P.files[0];
          paintTree(); paintTabs(); ta.value = cur.text; runPreview(); persist();
        }
      } finally { busy = false; persist(); paintBadge(); paintLogs(); }
    }

    function onMsg(e) { var d = e.data; if (!d || d.phrmf !== id || d.t === "tests") return; logs.push({ t: d.t, m: d.m }); if (logs.length > 200) logs.shift(); paintLogs(); }
    window.addEventListener("message", onMsg);
    ta.addEventListener("input", function () { if (cur) cur.text = ta.value; persist(); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Tab") { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; if (cur) cur.text = ta.value; } });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var f = b.getAttribute("data-f"), t = b.getAttribute("data-t"), a = b.getAttribute("data-a");
      if (f) { cur = P.files.filter(function (x) { return x.name === f; })[0]; ta.value = cur.text; tab = "edit"; paintTree(); paintTabs(); }
      else if (t) { tab = t; paintTabs(); if (t === "preview" && !fr.srcdoc) runPreview(); }
      else if (a === "run") { tab = "preview"; paintTabs(); runPreview(); }
      else if (a === "test") { tab = "tests"; paintTabs(); verify(false); }
      else if (a === "add") { var n = (window.prompt(T("name"), "src/new.js") || "").trim().replace(/^\.?\//, ""); if (!n || P.files.some(function (x) { return x.name === n; })) return; var nf = { name: n, text: "\n", test: isTestName(n) }; P.files.push(nf); cur = nf; ta.value = ""; tab = "edit"; paintTree(); paintTabs(); persist(); }
      else if (a === "del") { if (!cur || !window.confirm(T("del") + " " + cur.name + "?")) return; P.files = P.files.filter(function (x) { return x !== cur; }); cur = P.files[0]; ta.value = cur ? cur.text : ""; paintTree(); paintTabs(); persist(); }
      else if (a === "fix") {
        var fails = lastRes ? failText(lastRes) : "", errs = logs.filter(function (l) { return l.t === "error"; }).slice(-4).map(function (l) { return l.m; }).join("\n");
        ask("My multi-file project has problems.\n" + (fails ? "Failing tests:\n" + fails + "\n" : "") + (errs ? "Console errors:\n" + errs + "\n" : "") + "Please fix it and send the FULL updated ```files project (with tests).\n\nCurrent project:\n```files\n" + serialize(P) + "```");
      }
      else if (a === "copy") { try { navigator.clipboard.writeText(serialize(P)); } catch (x) {} var o = b.textContent; b.textContent = T("ok"); setTimeout(function () { b.textContent = o; }, 1200); }
      else if (a === "zip") { var blob = zip(P.files.map(function (x) { return { name: x.name, text: x.text }; })), u = URL.createObjectURL(blob), l = document.createElement("a"); l.href = u; l.download = ((title || "project").replace(/[^\w\u0600-\u06FF-]+/g, "-").replace(/^-|-$/g, "") || "project") + ".zip"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
    });
    if (W.attachExpand) W.attachExpand(root, q('[data-a="full"]'), function () {});
    ta.value = cur ? cur.text : ""; paintTree(); paintTabs(); paintLogs(); paintBadge(); runPreview();
    if (hasTests()) {
      var live = root.closest("#chat-box") && !root.closest(".msg-history"); // only auto-fix for fresh content
      if (saved && saved.status) { status = saved.status; verify(false); } else verify(!!fresh);
    }
    root._mf = { project: P, verify: verify };
  };
  W.mfile = { parse: parse, serialize: serialize, zip: zip, extract: extractProject };
})();
