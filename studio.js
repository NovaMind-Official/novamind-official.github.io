/* =====================================================================
   Phraortes — Studio (studio.js)
   A serious in-chat code workbench. ```studio blocks open a sandboxed project:
     title: Sales explorer
     libs: chart, tailwind          (chart d3 three plotly gsap math lodash marked tailwind react)
     layout: phone | tablet | desktop
     --- html / --- css / --- js / --- jsx / --- py / --- data
   • Python runs in the browser (Pyodide: numpy, pandas, matplotlib, scipy …) — plots appear in the preview
   • Library presets from pinned CDNs only; everything else is blocked by CSP (no network, no cookies,
     no access to chats)
   • Highlighted editor, live-run, versions (undo/redo), device sizes, console + REPL, "Fix with AI",
     download as one .html file, save to Workspace.
   Needs artifacts.js (window.PHRW).
   ===================================================================== */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var ALIAS = { studio: 1, webapp: 1, codestudio: 1, project: 1, app: 1 };
  var oldKind = W.kindOf; W.kindOf = function (l) { return ALIAS[String(l || "").toLowerCase()] ? "studio" : oldKind(l); };
  W.kinds.studio = 1;
  var esc = W.esc || function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var SEQ = 0, PYV = "0.25.1";
  var LIBS = {
    chart: { n: "Chart.js", js: ["https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"] },
    d3: { n: "D3", js: ["https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"] },
    three: { n: "Three.js", js: ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"] },
    plotly: { n: "Plotly", js: ["https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.27.0/plotly.min.js"] },
    gsap: { n: "GSAP", js: ["https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"] },
    math: { n: "math.js", js: ["https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.2.1/math.min.js"] },
    lodash: { n: "Lodash", js: ["https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"] },
    marked: { n: "marked", js: ["https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"] },
    tailwind: { n: "Tailwind", js: ["https://cdn.tailwindcss.com"] },
    react: { n: "React", js: ["https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js", "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js", "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"] }
  };
  var LIBALIAS = { chartjs: "chart", "chart.js": "chart", threejs: "three", "three.js": "three", mathjs: "math", tw: "tailwind", tailwindcss: "tailwind", reactjs: "react", jsx: "react" };
  var L = {
    en: { badge: "Studio", preview: "Preview", console: "Console", html: "HTML", css: "CSS", js: "JS", py: "Python", data: "Data", run: "▶ Run", stop: "■ Stop", live: "Live", undo: "↶", redo: "↷", dl: "Download", copy: "Copy", ws: "Workspace", done: "Done", fix: "✦ Fix with AI", clear: "Clear", empty: "Nothing logged yet.", sandbox: "Sandboxed: no cookies, no access to your chats. Network only for the listed libraries.", repl: "Run JavaScript in the preview…", loadpy: "Loading Python…", saved: "Saved to Workspace", nocode: "studio: add code after  --- html / --- js / --- py", phone: "Phone", tablet: "Tablet", desktop: "Desktop", libs: "Libraries", v: "Version" },
    fa: { badge: "استودیو", preview: "پیش‌نمایش", console: "کنسول", html: "HTML", css: "CSS", js: "JS", py: "پایتون", data: "داده", run: "▶ اجرا", stop: "■ توقف", live: "زنده", undo: "↶", redo: "↷", dl: "دانلود", copy: "کپی", ws: "Workspace", done: "انجام شد", fix: "✦ رفع با هوش مصنوعی", clear: "پاک‌کردن", empty: "هنوز چیزی ثبت نشده.", sandbox: "ایزوله: بدون کوکی و بدون دسترسی به چت‌ها. اینترنت فقط برای کتابخانه‌های فهرست‌شده.", repl: "اجرای جاوااسکریپت در پیش‌نمایش…", loadpy: "در حال بارگذاری پایتون…", saved: "در Workspace ذخیره شد", nocode: "studio: بعد از  --- html / --- js / --- py  کد بنویس", phone: "موبایل", tablet: "تبلت", desktop: "دسکتاپ", libs: "کتابخانه‌ها", v: "نسخه" }
  };
  function tt(lg, k) { return (L[lg] && L[lg][k]) || L.en[k] || k; }
  var css = document.createElement("style"); css.id = "st-css";
  css.textContent = [
    ".st{color:#F4EBDD}.st-bar{display:flex;gap:6px;padding:2px 14px 8px;overflow-x:auto;scrollbar-width:none;align-items:center}.st-bar::-webkit-scrollbar{display:none}",
    ".st-tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(255,255,255,.7);border-radius:20px;padding:6px 13px;font:600 11.5px 'Space Mono',monospace;position:relative;cursor:pointer;transition:all .25s}",
    ".st-tab.on{background:rgba(232,196,104,.15);border-color:rgba(232,196,104,.45);color:#E8C468}.st-tab i{position:absolute;top:-2px;right:-1px;width:8px;height:8px;border-radius:50%;background:#ff6b6b;display:none}.st-tab.err i{display:block}",
    ".st-dvr{display:flex;justify-content:flex-end;margin-bottom:8px}.st-dev{display:flex;gap:2px;padding:2px;border-radius:12px;background:rgba(255,255,255,.06);flex:none}.st-dev button{border:0;background:none;color:rgba(255,255,255,.55);border-radius:10px;width:32px;height:28px;display:grid;place-items:center;cursor:pointer}.st-dev button.on{background:rgba(232,196,104,.2);color:#E8C468}.st-dev svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}",
    ".st-pane{display:none;margin:0 14px}.st-pane.on{display:block}",
    ".st-stage{position:relative;border-radius:14px;overflow:hidden;background:#fff;border:1px solid rgba(255,255,255,.1)}.st-stage.dev{background:repeating-conic-gradient(#1a1510 0 25%,#14100b 0 50%) 0 0/16px 16px}",
    ".st-fr{border:0;background:#fff;display:block;transform-origin:0 0}.st-stage.dev .st-fr{border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.5)}",
    ".st-ov{position:absolute;inset:0;display:none;place-items:center;background:rgba(12,9,6,.82);color:#E8C468;font:600 13px 'Space Grotesk','Vazirmatn';text-align:center;padding:20px}.st-ov.on{display:grid}",
    ".st-ed{position:relative;height:300px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:#080604;overflow:hidden}",
    ".st-ed pre,.st-ed textarea{position:absolute;inset:0;margin:0;padding:12px;border:0;font:12.5px/1.65 'Space Mono',ui-monospace,monospace;tab-size:2;white-space:pre;overflow:auto;direction:ltr;text-align:left;letter-spacing:0;word-spacing:0}",
    ".st-ed pre{color:#e8dcc0;pointer-events:none;overflow:hidden}.st-ed textarea{background:transparent;color:transparent;caret-color:#E8C468;resize:none;outline:none;-webkit-text-fill-color:transparent;-webkit-overflow-scrolling:touch}.st-ed textarea::selection{background:rgba(232,196,104,.28);-webkit-text-fill-color:transparent}",
    ".tk-c{color:#6f6a5c;font-style:italic}.tk-s{color:#9bd38a}.tk-k{color:#e0a45c}.tk-n{color:#7fb7e8}.tk-t{color:#e86a8a}.tk-a{color:#c8a3ff}",
    ".st-con{height:300px;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:14px 14px 0 0;background:#080604;padding:6px 0;direction:ltr;text-align:left}",
    ".st-ln{padding:5px 12px;font:12px/1.55 'Space Mono',monospace;color:rgba(255,255,255,.82);border-bottom:1px solid rgba(255,255,255,.05);white-space:pre-wrap;overflow-wrap:anywhere}.st-ln.warn{color:#ffd27a;background:rgba(255,210,122,.06)}.st-ln.error{color:#ff8a80;background:rgba(255,107,107,.08)}.st-ln.sys{color:#7fb7e8}.st-ln.res{color:#9bd38a}",
    ".st-em{padding:14px;font:12px 'Space Mono',monospace;color:rgba(255,255,255,.4)}",
    ".st-rp{display:flex;border:1px solid rgba(255,255,255,.12);border-top:0;border-radius:0 0 14px 14px;background:#0d0a07;direction:ltr}.st-rp span{padding:10px 0 0 12px;color:#E8C468;font:12px 'Space Mono'}.st-rp input{flex:1;min-width:0;background:none;border:0;outline:none;color:#f3e9d0;padding:10px 12px;font:12.5px 'Space Mono',monospace}",
    ".st-act{display:flex;gap:7px;padding:10px 14px 4px;overflow-x:auto;scrollbar-width:none;align-items:center}.st-act::-webkit-scrollbar{display:none}",
    ".st-b{flex:0 0 auto;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:rgba(255,255,255,.88);border-radius:11px;padding:7px 12px;font:500 12px 'Space Grotesk','Vazirmatn',sans-serif;cursor:pointer;transition:transform .2s}.st-b:active{transform:scale(.95)}.st-b.gold{background:linear-gradient(135deg,#F3D98C,#E8C468 60%,#CFA64A);color:#1a1204;border-color:transparent;font-weight:600}.st-b[disabled]{opacity:.35}.st-b.on{background:rgba(63,224,160,.18);border-color:rgba(63,224,160,.5);color:#6FE9B8}.st-b.fx{border-color:rgba(191,122,245,.55);color:#d9b6ff;background:rgba(191,122,245,.14)}",
    ".st-lib{display:flex;gap:5px;flex-wrap:wrap;padding:2px 14px 0}.st-lib span{font:600 10px 'Space Mono';letter-spacing:.04em;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.6)}",
    ".st-note{padding:6px 14px 12px;font-size:11px;opacity:.5}",
    ".phr-w.phr-full .st-ed,.phr-w.phr-full .st-con{height:calc(100vh - 250px)}",
    "@media (prefers-reduced-motion:reduce){.st *{transition:none!important}}"
  ].join("");
  document.head.appendChild(css);

  /* ------------------------------------------------------------ parsing */
  function parse(body) {
    var P = { title: "", libs: [], layout: "", live: true, html: "", css: "", js: "", py: "", data: "", jsx: false }, cur = null, any = false, head = [];
    String(body || "").replace(/\r/g, "").split("\n").forEach(function (ln) {
      var m = /^\s*-{2,}\s*(html|css|js|javascript|jsx|script|style|py|python|data)\s*-*\s*$/i.exec(ln);
      if (m) { var k = m[1].toLowerCase(); if (k === "jsx") { P.jsx = true; k = "js"; } cur = k === "javascript" || k === "script" ? "js" : k === "style" ? "css" : k === "python" ? "py" : k; any = true; return; }
      if (cur) P[cur] += ln + "\n"; else head.push(ln);
    });
    var rest = head.filter(function (ln) {
      var m = /^\s*(title|libs?|layout|live|height)\s*[:=]\s*(.*)$/i.exec(ln); if (!m) return true;
      var k = m[1].toLowerCase(), v = m[2].trim();
      if (k === "title") P.title = v; else if (k === "lib" || k === "libs") v.split(/[,\s،]+/).forEach(function (x) { x = x.toLowerCase().replace(/^@/, ""); x = LIBALIAS[x] || x; if (LIBS[x] && P.libs.indexOf(x) < 0) P.libs.push(x); });
      else if (k === "layout") P.layout = /^(phone|mobile|tablet|desktop)$/i.test(v) ? v.toLowerCase().replace("mobile", "phone") : ""; else if (k === "live") P.live = !/^(off|no|false|0)$/i.test(v);
      return false;
    }).join("\n").trim();
    if (!any && rest) { if (/<[a-z!]/i.test(rest)) P.html = rest; else if (/^\s*(import |from \w+ import |def |print\()/m.test(rest)) P.py = rest; else P.js = rest; }
    ["html", "css", "js", "py", "data"].forEach(function (k) { P[k] = P[k].replace(/^\n+|\s+$/g, ""); });
    if (P.jsx && P.libs.indexOf("react") < 0) P.libs.push("react");
    if (/\b(React\.|ReactDOM\.|createRoot)/.test(P.js) && P.libs.indexOf("react") < 0) P.libs.push("react");
    return P;
  }
  function guard(src) {
    return String(src).replace(/\b(for|while)\s*\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)\s*\{/g, function (m) { return m + "__lp();"; }).replace(/\bdo\s*\{/g, function (m) { return m + "__lp();"; });
  }

  /* ------------------------------------------------------------ iframe document */
  function buildDoc(id, P, forExport) {
    var libs = P.libs.map(function (k) { return LIBS[k].js.map(function (u) { return '<script src="' + u + '"><\/script>'; }).join(""); }).join("");
    var react = P.libs.indexOf("react") >= 0, hasPy = !!P.py.trim();
    var csp = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src data: blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; media-src data: blob:; connect-src https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; worker-src blob:";
    var bridge = "(function(){var L=0,ID=" + JSON.stringify(id) + ";window.__lp=function(){if(++L>3000000){throw new Error('LOOP')}};" +
      "['requestAnimationFrame','setTimeout','setInterval'].forEach(function(n){var o=window[n];window[n]=function(f){var a=[].slice.call(arguments);if(typeof f==='function'){a[0]=function(){L=0;return f.apply(this,arguments)}}return o.apply(window,a)}});" +
      "function S(x){if(typeof x==='string')return x;if(x instanceof Error)return x.name+': '+x.message;try{var s=JSON.stringify(x,null,typeof x==='object'&&x&&Object.keys(x).length<8?1:0);return s===undefined?String(x):s}catch(e){return String(x)}}" +
      "function send(t,a){try{parent.postMessage({phrst:ID,t:t,m:a.map(function(x){var s=S(x);return s.length>1500?s.slice(0,1500)+'…':s}).join(' ')},'*')}catch(e){}}window.__send=send;" +
      "['log','info','warn','error','table'].forEach(function(k){var o=console[k];console[k]=function(){send(k==='info'||k==='table'?'log':k,[].slice.call(arguments));try{o.apply(console,arguments)}catch(e){}}});" +
      "window.addEventListener('error',function(e){var m=e.message||'error';send('error',[/LOOP/.test(m)?'Stopped: a loop ran too long':m+(e.lineno?'  (line '+e.lineno+')':'')])});" +
      "window.addEventListener('unhandledrejection',function(e){send('error',[e.reason])});" +
      "window.addEventListener('message',function(e){var d=e.data;if(!d||d.phrst_eval==null)return;try{var r=(0,eval)(String(d.phrst_eval));if(r&&typeof r.then==='function'){r.then(function(v){send('res',[v])},function(x){send('error',[x])})}else if(r!==undefined)send('res',[r])}catch(x){send('error',[x])}});" +
      "window.__phrImg=function(b){var d=document.getElementById('__py')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'__py'}));var i=new Image();i.src='data:image/png;base64,'+b;i.style.cssText='max-width:100%;display:block;margin:10px auto;border-radius:8px';d.appendChild(i)};" +
      "send('sys',['ready']);})();";
    var baseCss = "html{color:#111;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}body{margin:0;padding:" + (P.html || react ? "0" : "14px") + "}";
    var meta = (forExport ? "" : '<meta http-equiv="Content-Security-Policy" content="' + csp + '">') + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    var js = P.js.trim() ? (react ? '<script type="text/babel" data-presets="react">' + P.js.replace(/<\/script/gi, "<\\/script") + "<\/script>" : "<script>" + guard(P.js).replace(/<\/script/gi, "<\\/script") + "<\/script>") : "";
    var dataS = P.data ? "<script>window.DATA=" + JSON.stringify(P.data).replace(/</g, "\\u003c") + ";try{window.DATA_JSON=JSON.parse(window.DATA)}catch(e){}<\/script>" : "";
    var py = "";
    if (hasPy) {
      var pcode = P.py.replace(/<\/script/gi, "<\\/script");
      py = '<div id="__py"></div>' + (P.html ? "" : '<pre id="__po" style="font:13px/1.55 ui-monospace,Menlo,monospace;white-space:pre-wrap;margin:10px 0 0;color:#222"></pre>') +
        '<script src="https://cdn.jsdelivr.net/pyodide/v' + PYV + '/full/pyodide.js"><\/script><script>(async function(){var po=document.getElementById("__po");function out(s){if(po)po.textContent+=s+"\\n"}' +
        'try{console.log("Loading Python…");var py=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v' + PYV + '/full/"});py.setStdout({batched:function(s){console.log(s);out(s)}});py.setStderr({batched:function(s){console.error(s)}});' +
        'var code=' + JSON.stringify(P.py) + ';await py.loadPackagesFromImports(code);' + (P.data ? 'py.globals.set("DATA",window.DATA);' : "") +
        'if(/matplotlib/.test(code)){await py.runPythonAsync("import matplotlib\\nmatplotlib.use(\\"AGG\\")\\nimport matplotlib.pyplot as plt\\nimport io,base64,js\\ndef _show(*a,**k):\\n    for n in plt.get_fignums():\\n        f=plt.figure(n);b=io.BytesIO();f.savefig(b,format=\\"png\\",dpi=110,bbox_inches=\\"tight\\",facecolor=\\"white\\");js.__phrImg(base64.b64encode(b.getvalue()).decode())\\n    plt.close(\\"all\\")\\nplt.show=_show")}' +
        'await py.runPythonAsync(code);if(/matplotlib/.test(code))await py.runPythonAsync("import matplotlib.pyplot as plt\\nplt.show()");console.log("✓ Python finished")}catch(e){var m=String(e&&e.message||e);var ls=m.split("\\n").filter(Boolean);console.error(ls.slice(-4).join("\\n"))}})()<\/script>';
    }
    var head = '<style>' + baseCss + P.css + '</style>' + (forExport ? "" : "<script>" + bridge + "<\/script>") + libs;
    var body = (P.html || (react ? '<div id="root"></div>' : "")) + dataS + py + js;
    if (/<html[\s>]|<!doctype/i.test(P.html)) {
      var d = P.html; if (/<head[^>]*>/i.test(d)) d = d.replace(/<head[^>]*>/i, function (m) { return m + meta + head; }); else d = d.replace(/<html[^>]*>/i, function (m) { return m + "<head>" + meta + head + "</head>"; });
      var tail = dataS + py + js; return /<\/body>/i.test(d) ? d.replace(/<\/body>/i, tail + "</body>") : d + tail;
    }
    return "<!doctype html><html><head>" + meta + head + "</head><body>" + body + "</body></html>";
  }

  /* ------------------------------------------------------------ highlighter */
  var KW_JS = "const|let|var|function|return|if|else|for|while|do|class|extends|new|import|from|export|default|async|await|try|catch|finally|throw|switch|case|break|continue|typeof|instanceof|of|in|true|false|null|undefined|this|void|delete|yield";
  var KW_PY = "def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|lambda|yield|in|is|not|and|or|None|True|False|pass|break|continue|global|async|await|print";
  var RE = {
    js: new RegExp("(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)|\\b(" + KW_JS + ")\\b|(\\b\\d+\\.?\\d*\\b)", "g"),
    py: new RegExp("(#[^\\n]*)|(\"\"\"[\\s\\S]*?\"\"\"|\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*')|\\b(" + KW_PY + ")\\b|(\\b\\d+\\.?\\d*\\b)", "g"),
    css: /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@[\w-]+|!important)|(#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|deg)?\b)/g,
    html: /(<!--[\s\S]*?-->)|("[^"]*"|'[^']*')|(<\/?[\w-]+)|(\/?>)/g,
    data: /("(?:\\.|[^"\\\n])*")|(\b\d+\.?\d*\b)/g
  };
  var CLS = { js: ["tk-c", "tk-s", "tk-k", "tk-n"], py: ["tk-c", "tk-s", "tk-k", "tk-n"], css: ["tk-c", "tk-s", "tk-k", "tk-n"], html: ["tk-c", "tk-s", "tk-t", "tk-t"], data: ["tk-s", "tk-n"] };
  function hl(lang, code) {
    var re = RE[lang]; if (!re) return esc(code) + "\n"; re.lastIndex = 0;
    var out = "", last = 0, m, cl = CLS[lang];
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      var gi = 1; while (gi < m.length && m[gi] == null) gi++;
      out += '<span class="' + cl[gi - 1] + '">' + esc(m[0]) + "</span>"; last = m.index + m[0].length; if (m[0].length === 0) re.lastIndex++;
    }
    return out + esc(code.slice(last)) + "\n";
  }
  function editorKeys(ta, onChange) {
    var pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
    ta.addEventListener("keydown", function (e) {
      var s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      function put(txt, selOff) { ta.value = v.slice(0, s) + txt + v.slice(en); ta.selectionStart = ta.selectionEnd = s + (selOff == null ? txt.length : selOff); onChange(); }
      if (e.key === "Tab") { e.preventDefault(); if (s !== en && v.slice(s, en).indexOf("\n") >= 0) { var a = v.lastIndexOf("\n", s - 1) + 1, blk = v.slice(a, en), nb = e.shiftKey ? blk.replace(/^ {1,2}/gm, "") : blk.replace(/^/gm, "  "); ta.value = v.slice(0, a) + nb + v.slice(en); ta.selectionStart = a; ta.selectionEnd = a + nb.length; onChange(); } else if (e.shiftKey) { } else put("  "); return; }
      if (e.key === "Enter") { var ls = v.lastIndexOf("\n", s - 1) + 1, ind = /^[ \t]*/.exec(v.slice(ls, s))[0], pc = v[s - 1], nc = v[s]; e.preventDefault(); if ((pc === "{" && nc === "}") || (pc === "(" && nc === ")") || (pc === "[" && nc === "]")) put("\n" + ind + "  \n" + ind, ind.length + 3); else put("\n" + ind + (/[{(\[:]$/.test(v.slice(ls, s).trimEnd()) ? "  " : "")); return; }
      if (pairs[e.key] && s === en && !e.ctrlKey && !e.metaKey) { var nx = v[s]; if ((e.key === '"' || e.key === "'" || e.key === "`") && (/\w/.test(v[s - 1] || "") || nx === e.key)) { if (nx === e.key) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; } return; } e.preventDefault(); put(e.key + pairs[e.key], 1); return; }
      if ((e.key === ")" || e.key === "]" || e.key === "}") && s === en && v[s] === e.key) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; }
    });
  }

  /* ------------------------------------------------------------ builder */
  var IC = { phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>', tablet: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M11 18h2"/>', desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>' };
  var DEVW = { phone: 390, tablet: 768, desktop: 0 };
  W.builders.studio = function (root, lines, map) {
    var lg = root._lang === "fa" ? "fa" : "en", T = function (k) { return tt(lg, k); };
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var P = parse(raw); if (!P.html && !P.css && !P.js && !P.py) throw new Error(T("nocode"));
    var id = "st" + (++SEQ) + "_" + Math.random().toString(36).slice(2, 7), title = P.title || map.title || "";
    var secs = ["html", "css", "js"].filter(function (k) { return P[k] || k === "html" || k === "js"; }); if (P.py) secs = ["py"].concat(secs.filter(function (k) { return k !== "html" || P.html; })); if (P.data) secs.push("data");
    if (P.py && !P.html) secs = secs.filter(function (k) { return k !== "html"; });
    var tabs = ["preview", "console"].concat(secs), cur = "preview", logs = [], errs = 0, live = P.live, dev = P.layout || "", running = false, hist = [], hi = -1, orig = JSON.stringify(P);
    var h = 320;
    root.classList.add("st");
    var devBtns = ["phone", "tablet", "desktop"].map(function (k) { return '<button data-d="' + k + '" title="' + esc(T(k)) + '"><svg viewBox="0 0 24 24">' + IC[k] + "</svg></button>"; }).join("");
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(T("badge")) + '</span><span class="phr-w-title">' + esc(title) + '</span><button class="phr-w-btn" data-a="full">⤢</button></div>' +
      (P.libs.length || P.py ? '<div class="st-lib">' + P.libs.map(function (k) { return "<span>" + esc(LIBS[k].n) + "</span>"; }).join("") + (P.py ? "<span>Python</span>" : "") + "</div>" : "") +
      '<div class="st-bar" style="padding-top:10px">' + tabs.map(function (k) { return '<button class="st-tab' + (k === cur ? " on" : "") + '" data-t="' + k + '">' + esc(T(k)) + (k === "console" ? "<i></i>" : "") + "</button>"; }).join("") + "</div>" +
      '<div class="st-pane on" data-p="preview"><div class="st-dvr"><div class="st-dev">' + devBtns + '</div></div><div class="st-stage"><iframe class="st-fr" sandbox="allow-scripts" title="preview"></iframe><div class="st-ov"></div></div></div>' +
      '<div class="st-pane" data-p="console"><div class="st-con"></div><div class="st-rp"><span>›</span><input type="text" placeholder="' + esc(T("repl")) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>' +
      secs.map(function (k) { return '<div class="st-pane" data-p="' + k + '"><div class="st-ed"><pre aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" data-k="' + k + '"></textarea></div></div>'; }).join("") +
      '<div class="st-act"><button class="st-b gold" data-a="run">' + esc(T("run")) + '</button><button class="st-b on" data-a="live">' + esc(T("live")) + '</button><button class="st-b" data-a="undo" disabled>' + T("undo") + '</button><button class="st-b" data-a="redo" disabled>' + T("redo") + '</button><button class="st-b fx" data-a="fix" style="display:none">' + esc(T("fix")) + '</button><button class="st-b" data-a="dl">' + esc(T("dl")) + '</button><button class="st-b" data-a="copy">' + esc(T("copy")) + '</button><button class="st-b" data-a="ws">' + esc(T("ws")) + "</button></div>" +
      '<div class="st-note">' + esc(T("sandbox")) + "</div>";
    var q = function (s) { return root.querySelector(s); }, qa = function (s) { return [].slice.call(root.querySelectorAll(s)); };
    var frame = q(".st-fr"), stage = q(".st-stage"), ov = q(".st-ov"), con = q(".st-con"), fixBtn = q('[data-a="fix"]'), undoB = q('[data-a="undo"]'), redoB = q('[data-a="redo"]');
    /* editors */
    qa(".st-ed").forEach(function (ed) {
      var ta = ed.querySelector("textarea"), pre = ed.querySelector("pre"), k = ta.getAttribute("data-k"), lang = k === "py" ? "py" : k;
      function paint() { pre.innerHTML = hl(lang, ta.value); pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; }
      ta.value = P[k]; paint();
      var onCh = function () { P[k] = ta.value; paint(); schedule(); };
      ta.addEventListener("input", onCh); ta.addEventListener("scroll", function () { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; }, { passive: true });
      editorKeys(ta, onCh); ed._paint = function () { ta.value = P[k]; paint(); };
    });
    /* console */
    function paintCon() {
      if (!logs.length) { con.innerHTML = '<div class="st-em">' + esc(T("empty")) + "</div>"; return; }
      con.innerHTML = logs.map(function (l) { return '<div class="st-ln ' + l.t + '">' + esc(l.m) + "</div>"; }).join(""); con.scrollTop = con.scrollHeight;
    }
    function show(t) {
      cur = t; qa(".st-tab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-t") === t); }); qa(".st-pane").forEach(function (p) { p.classList.toggle("on", p.getAttribute("data-p") === t); });
      if (t === "console") { paintCon(); q('[data-t="console"]').classList.remove("err"); } if (t === "preview") fit();
    }
    /* device sizing */
    function fit() {
      var w = stage.clientWidth || 300, dw = DEVW[dev] || 0, full = root.classList.contains("phr-full");
      h = full ? Math.max(260, window.innerHeight - 250) : (dev === "phone" ? 520 : dev === "tablet" ? 460 : 340);
      stage.classList.toggle("dev", !!dw);
      if (!dw) { frame.style.width = "100%"; frame.style.height = h + "px"; frame.style.transform = ""; stage.style.height = h + "px"; frame.style.margin = "0"; return; }
      var sc = Math.min(1, (w - 16) / dw), fh = h / sc; frame.style.width = dw + "px"; frame.style.height = fh + "px"; frame.style.transform = "scale(" + sc + ")"; frame.style.margin = "8px " + Math.max(8, (w - dw * sc) / 2) + "px"; stage.style.height = (h + 16) + "px";
    }
    function setDev(d) { dev = dev === d ? "" : d; qa(".st-dev button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-d") === dev); }); fit(); try { window.PHR_haptic && window.PHR_haptic("light"); } catch (e) {} }
    /* run */
    function snap() { var s = JSON.stringify({ html: P.html, css: P.css, js: P.js, py: P.py, data: P.data }); if (hist[hi] === s) return; hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 25) hist.shift(); hi = hist.length - 1; navBtns(); }
    function navBtns() { undoB.disabled = hi <= 0; redoB.disabled = hi >= hist.length - 1; }
    function restore(i) { var o = JSON.parse(hist[i]); ["html", "css", "js", "py", "data"].forEach(function (k) { P[k] = o[k]; }); qa(".st-ed").forEach(function (e) { e._paint && e._paint(); }); hi = i; navBtns(); run(true); }
    function run(nosnap) {
      if (!nosnap) snap(); logs = []; errs = 0; q('[data-t="console"]').classList.remove("err"); fixBtn.style.display = "none"; paintCon();
      ov.classList.remove("on"); if (P.py) { ov.textContent = T("loadpy"); ov.classList.add("on"); }
      running = true; fit(); load(buildDoc(id, P, false));
    }
    var fb = 0, pend = "", nrun = 0, got = false;
    function load(html) {
      pend = html; got = false; clearTimeout(fb); frame.removeAttribute("srcdoc"); frame.src = "studio-frame.html?" + id + "_" + (++nrun);
      fb = setTimeout(function () { if (!got) { frame.removeAttribute("src"); frame.srcdoc = html; } }, 2200);
    }
    var tmr = 0; function schedule() { if (!live) return; clearTimeout(tmr); tmr = setTimeout(function () { run(false); }, P.py ? 1800 : 700); }
    function onMsg(e) {
      if (!root.isConnected) { window.removeEventListener("message", onMsg); return; }
      var d = e.data; if (d && d.phrst_frame === true && e.source === frame.contentWindow) { got = true; clearTimeout(fb); try { frame.contentWindow.postMessage({ phrst_doc: pend }, "*"); } catch (x) {} return; }
      if (!d || d.phrst !== id || e.source !== frame.contentWindow) return;
      if (d.t === "sys") { if (!P.py) ov.classList.remove("on"); return; }
      if (/^✓ Python/.test(d.m)) ov.classList.remove("on");
      if (/^Loading Python/.test(d.m)) { return; }
      if (logs.length < 400) logs.push({ t: d.t === "warn" || d.t === "error" || d.t === "res" ? d.t : "log", m: String(d.m) });
      if (d.t === "error") { errs++; ov.classList.remove("on"); fixBtn.style.display = ""; if (cur !== "console") q('[data-t="console"]').classList.add("err"); }
      if (cur === "console") paintCon();
    }
    window.addEventListener("message", onMsg);
    function ask(text) { try { var ui = document.getElementById("ui"); if (ui && typeof window.send === "function") { ui.value = text; ui.dispatchEvent(new Event("input", { bubbles: true })); window.send(); return true; } } catch (e) {} return false; }
    function code() { return (P.html ? "```html\n" + P.html + "\n```\n" : "") + (P.css ? "```css\n" + P.css + "\n```\n" : "") + (P.js ? "```js\n" + P.js + "\n```\n" : "") + (P.py ? "```python\n" + P.py + "\n```\n" : ""); }
    function download() {
      var doc = buildDoc("x", P, true), b = new Blob([doc], { type: "text/html" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = ((title || "project").replace(/[^\w\u0600-\u06FF-]+/g, "-").slice(0, 40) || "project") + ".html"; a.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-t]"); if (b) { show(b.getAttribute("data-t")); return; }
      b = e.target.closest("[data-d]"); if (b) { setDev(b.getAttribute("data-d")); return; }
      b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a");
      if (a === "run") { run(false); show("preview"); try { window.PHR_haptic && window.PHR_haptic("light"); } catch (x) {} }
      else if (a === "live") { live = !live; b.classList.toggle("on", live); }
      else if (a === "undo" && hi > 0) restore(hi - 1);
      else if (a === "redo" && hi < hist.length - 1) restore(hi + 1);
      else if (a === "fix") { var last = logs.filter(function (l) { return l.t === "error"; }).slice(-1)[0]; var ok = ask("My code in the Studio throws this error:\n\n" + (last ? last.m : "(see console)") + "\n\nHere is the code:\n\n" + code() + "\nFix it and reply with the full corrected ```studio block."); if (!ok) { try { navigator.clipboard.writeText(code()); } catch (x) {} } }
      else if (a === "dl") download();
      else if (a === "copy") { var o = b.textContent; try { navigator.clipboard.writeText(code()); } catch (x) {} b.textContent = T("done"); setTimeout(function () { b.textContent = o; }, 1100); }
      else if (a === "ws") {
        try { var chat = window.chats && chats.find(function (c) { return c.id == window.curId; }); if (chat) { chat.files = chat.files || []; var nm = ((title || "project").replace(/[^\w\u0600-\u06FF-]+/g, "-").slice(0, 40) || "project") + ".html", body = buildDoc("x", P, true), ex = chat.files.filter(function (f) { return f.name === nm; })[0]; if (ex) { ex.content = body; ex.ts = Date.now(); } else chat.files.push({ id: Date.now() + "-s", type: "code", name: nm, content: body, extra: "", ts: Date.now() }); window.save && save(); window.updateFilesBadge && updateFilesBadge(); window.showToast && showToast(T("saved"), "success"); } } catch (x) {}
      }
    });
    q(".st-rp input").addEventListener("keydown", function (e) { if (e.key !== "Enter") return; var v = e.target.value.trim(); if (!v) return; e.target.value = ""; logs.push({ t: "sys", m: "› " + v }); paintCon(); try { frame.contentWindow.postMessage({ phrst_eval: v }, "*"); } catch (x) {} });
    W.attachExpand(root, q('[data-a="full"]'), function () { fit(); qa(".st-ed").forEach(function (e) { e._paint && e._paint(); }); });
    W.observeResize(root, fit);
    if (dev) qa(".st-dev button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-d") === dev); });
    snap(); run(true);
  };
  W.studio = { parse: parse, buildDoc: buildDoc, LIBS: LIBS };
})();
