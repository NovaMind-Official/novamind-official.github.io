/* Phraortes — Code, done properly (code2.js)
   · Own syntax highlighter (works with no CDN — highlight.js is used only when it is present)
   · Code cards: language chip, line numbers, wrap, long-code collapse, download, tidy toolbar
   · Full-screen code viewer (replaces the plain textarea): numbered lines, search with hits, wrap, text size, copy, download
   · Professional tables and inline code. */
(function () {
  "use strict";
  var W = window, D = document;
  function $(s, r) { return (r || D).querySelector(s) }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") }
  function LS(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { return null } }
  function hap(t) { try { W.haptic && W.haptic(t || "light") } catch (e) { } }
  function toast(m, t) { try { W.showToast(m, t || "success") } catch (e) { } }

  /* ───────── languages ───────── */
  var NAMES = { js: "JavaScript", javascript: "JavaScript", jsx: "JSX", ts: "TypeScript", typescript: "TypeScript", tsx: "TSX", py: "Python", python: "Python", html: "HTML", htm: "HTML", css: "CSS", scss: "SCSS", json: "JSON", bash: "Bash", sh: "Shell", shell: "Shell", zsh: "Shell", sql: "SQL", java: "Java", c: "C", cpp: "C++", "c++": "C++", cs: "C#", csharp: "C#", go: "Go", rust: "Rust", rs: "Rust", php: "PHP", rb: "Ruby", ruby: "Ruby", swift: "Swift", kotlin: "Kotlin", kt: "Kotlin", dart: "Dart", yaml: "YAML", yml: "YAML", xml: "XML", md: "Markdown", markdown: "Markdown", lua: "Lua", r: "R", txt: "Text", text: "Text", code: "Code", diff: "Diff", dockerfile: "Dockerfile", toml: "TOML", ini: "INI", vue: "Vue", svelte: "Svelte" };
  var COL = { js: "#f1e05a", javascript: "#f1e05a", jsx: "#f1e05a", ts: "#3178c6", typescript: "#3178c6", tsx: "#3178c6", py: "#3572a5", python: "#3572a5", html: "#e34c26", htm: "#e34c26", css: "#9b6bdc", scss: "#c6538c", json: "#9aa4b2", bash: "#89e051", sh: "#89e051", shell: "#89e051", zsh: "#89e051", sql: "#e38c00", java: "#e76f00", c: "#8a93a6", cpp: "#f34b7d", "c++": "#f34b7d", cs: "#68217a", csharp: "#68217a", go: "#00add8", rust: "#dea584", rs: "#dea584", php: "#8892bf", rb: "#cc342d", ruby: "#cc342d", swift: "#f05138", kotlin: "#a97bff", kt: "#a97bff", dart: "#00b4ab", yaml: "#cb171e", yml: "#cb171e", xml: "#e34c26", md: "#7aa2d6", markdown: "#7aa2d6", lua: "#5b6bcf", r: "#198ce7", vue: "#41b883", svelte: "#ff3e00" };
  var EXT = { javascript: "js", typescript: "ts", python: "py", bash: "sh", shell: "sh", zsh: "sh", csharp: "cs", "c++": "cpp", rust: "rs", ruby: "rb", kotlin: "kt", markdown: "md", yml: "yml", text: "txt", code: "txt", htm: "html" };
  function ext(l) { return EXT[l] || l || "txt" }
  function fam(l) {
    if (/^(js|javascript|jsx|ts|typescript|tsx|java|c|cpp|c\+\+|cs|csharp|go|rust|rs|php|swift|kotlin|kt|dart|scala|vue|svelte|objc|solidity|sol)$/.test(l)) return "c";
    if (/^(py|python|rb|ruby|yaml|yml|toml|ini|r|dockerfile|make|makefile|perl|pl|conf)$/.test(l)) return "py";
    if (/^(bash|sh|shell|zsh|fish)$/.test(l)) return "sh";
    if (/^(sql|mysql|pgsql|postgres|sqlite|plsql)$/.test(l)) return "sql";
    if (/^(html|htm|xml|svg|jsx-html|xhtml)$/.test(l)) return "ml";
    if (/^(css|scss|sass|less)$/.test(l)) return "css";
    if (l === "json" || l === "jsonc") return "json";
    if (l === "diff" || l === "patch") return "diff";
    if (l === "lua") return "lua";
    return "gen";
  }
  var KW = "abstract|as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|final|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|namespace|new|of|override|package|private|protected|public|readonly|return|set|static|super|switch|synchronized|this|throw|throws|try|type|typeof|var|void|volatile|while|with|yield|fn|func|impl|mod|mut|pub|struct|trait|use|where|match|loop|move|ref|unsafe|defer|go|chan|select|range|fallthrough|goto|using|virtual|operator|template|typename|inline|extern|register|sealed|lazy|val|fun|when|object|companion|internal|data|guard|extension|protocol|init|deinit|subscript|echo|elif|except|def|lambda|pass|raise|global|nonlocal|assert|del|is|not|and|or|end|then|begin|unless|until|rescue|ensure|module|require|include|do|print|let|mut";
  var LIT = "true|false|null|undefined|nil|None|True|False|NaN|Infinity|NULL|self|cls|this|void";
  var BUILT = "console|window|document|Math|JSON|Object|Array|String|Number|Boolean|Date|Promise|Map|Set|RegExp|Error|Symbol|parseInt|parseFloat|setTimeout|setInterval|fetch|require|module|exports|process|print|len|range|int|str|float|list|dict|tuple|set|bool|open|input|map|filter|zip|enumerate|isinstance|super|printf|scanf|malloc|free|sizeof|std|cout|cin|endl|vector|string|println|fmt|Println|Sprintf|String|Vec|Option|Result|Some|Ok|Err|Box|Rc|Arc|System|Console|WriteLine|String|List|Dictionary|File|Path";
  function re(w) { return new RegExp("^(?:" + w + ")$") }
  var RKW = re(KW), RLIT = re(LIT), RBI = re(BUILT);
  var SQLKW = re("select|from|where|and|or|not|insert|into|values|update|set|delete|create|table|drop|alter|add|column|index|view|join|inner|left|right|full|outer|cross|on|as|group|by|order|having|limit|offset|union|all|distinct|null|is|in|like|between|exists|case|when|then|else|end|primary|key|foreign|references|unique|default|check|constraint|with|asc|desc|count|sum|avg|min|max|begin|commit|rollback|transaction|if|returning|using|over|partition|true|false|integer|int|varchar|text|boolean|date|timestamp|serial|bigint");

  function sp(c, t) { return '<span class="hljs-' + c + '">' + esc(t) + "</span>" }
  /* generic scanner: rules = [[regex-source, handler(match)->html]] */
  function scan(code, rules) {
    var src = rules.map(function (r) { return "(" + r[0] + ")" }).join("|"), rx = new RegExp(src, "g"), out = "", last = 0, m;
    while ((m = rx.exec(code))) {
      if (m[0] === "") { rx.lastIndex++; continue }
      if (m.index > last) out += esc(code.slice(last, m.index));
      var k = 1; while (k <= rules.length && m[k] === undefined) k++;
      out += rules[k - 1][1](m[0], m);
      last = rx.lastIndex;
    }
    return out + esc(code.slice(last));
  }
  var NUM = "\\b(?:0[xX][\\da-fA-F_]+|0[bB][01_]+|\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b";
  function word(t, next, prevDot, f) {
    if (RLIT.test(t)) return sp("literal", t);
    if (RKW.test(t) && !prevDot) return sp("keyword", t);
    if (RBI.test(t)) return sp("built_in", t);
    if (next) return sp("title function_", t);
    if (/^[A-Z][A-Za-z0-9_]*$/.test(t) && t.length > 1 && !/^[A-Z0-9_]+$/.test(t)) return sp("title class_", t);
    return esc(t);
  }
  function word2(t) {
    var mm = t.match(/^(\.?)([A-Za-z_$][\w$]*)(\s*\()?$/); if (!mm) return esc(t);
    var d = mm[1], w = mm[2], p = mm[3] || "";
    return d + word(w, !!p, !!d) + esc(p);
  }
  function hlC(code) {
    return scan(code, [
      ["\\/\\*[\\s\\S]*?(?:\\*\\/|$)|\\/\\/[^\\n]*", function (t) { return sp("comment", t) }],
      ["\"(?:\\\\[\\s\\S]|[^\"\\\\\\n])*\"|'(?:\\\\[\\s\\S]|[^'\\\\\\n])*'|`(?:\\\\[\\s\\S]|[^`\\\\])*`", function (t) { return sp("string", t) }],
      [NUM, function (t) { return sp("number", t) }],
      ["@[A-Za-z_][\\w.]*", function (t) { return sp("meta", t) }],
      ["\\.?[A-Za-z_$][\\w$]*(?:\\s*\\()?", function (t) { return word2(t) }]
    ]);
  }
  function hlPy(code) {
    return scan(code, [
      ["#[^\\n]*", function (t) { return sp("comment", t) }],
      ["(?:[rRbBfFuU]{1,2})?(?:\"\"\"[\\s\\S]*?(?:\"\"\"|$)|'''[\\s\\S]*?(?:'''|$)|\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*')", function (t) { return sp("string", t) }],
      [NUM, function (t) { return sp("number", t) }],
      ["@[A-Za-z_][\\w.]*", function (t) { return sp("meta", t) }],
      ["\\.?[A-Za-z_][\\w]*(?:\\s*\\()?", function (t) { return word2(t) }]
    ]);
  }
  function hlSh(code) {
    return scan(code, [
      ["(?:^|(?<=\\s))#[^\\n]*", function (t) { return sp("comment", t) }],
      ["\"(?:\\\\.|[^\"\\\\])*\"|'[^']*'", function (t) { return sp("string", t) }],
      ["\\$(?:\\{[^}]*\\}|[A-Za-z_]\\w*|[0-9?@#!$*])", function (t) { return sp("variable", t) }],
      ["(?<=\\s|^)--?[A-Za-z][\\w-]*", function (t) { return sp("attr", t) }],
      [NUM, function (t) { return sp("number", t) }],
      ["\\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|export|local|source|alias|unset|set|exit|break|continue|sudo|echo|cd|ls|cat|grep|sed|awk|curl|wget|git|npm|npx|pip|python|node|docker|chmod|chown|mkdir|rm|cp|mv|touch|tar|ssh|apt|brew)\\b", function (t) { return sp(/^(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|export|local)$/.test(t) ? "keyword" : "built_in", t) }]
    ]);
  }
  function hlSql(code) {
    return scan(code, [
      ["--[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)", function (t) { return sp("comment", t) }],
      ["'(?:''|[^'])*'", function (t) { return sp("string", t) }],
      [NUM, function (t) { return sp("number", t) }],
      ["[A-Za-z_][\\w]*(?:\\s*\\()?", function (t) { var m = t.match(/^([A-Za-z_]\w*)(\s*\()?$/); var w = m[1]; if (SQLKW.test(w.toLowerCase())) return sp("keyword", w) + esc(m[2] || ""); return m[2] ? sp("title function_", w) + esc(m[2]) : esc(t) }]
    ]);
  }
  function hlCss(code) {
    return scan(code, [
      ["\\/\\*[\\s\\S]*?(?:\\*\\/|$)", function (t) { return sp("comment", t) }],
      ["\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'", function (t) { return sp("string", t) }],
      ["@[\\w-]+", function (t) { return sp("keyword", t) }],
      ["#[\\da-fA-F]{3,8}\\b", function (t) { return sp("number", t) }],
      ["-?\\d*\\.?\\d+(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|pt)?\\b", function (t) { return sp("number", t) }],
      ["--[\\w-]+|[a-z-]+(?=\\s*:(?!:))", function (t) { return sp("attr", t) }],
      ["[.#][A-Za-z_][\\w-]*|::?[a-z-]+(?:\\([^)]*\\))?", function (t) { return sp("selector-class", t) }],
      ["\\b[a-z][\\w-]*(?=\\()", function (t) { return sp("title function_", t) }]
    ]);
  }
  function hlJson(code) {
    return scan(code, [
      ["\"(?:\\\\.|[^\"\\\\\\n])*\"(?=\\s*:)", function (t) { return sp("attr", t) }],
      ["\"(?:\\\\.|[^\"\\\\\\n])*\"", function (t) { return sp("string", t) }],
      ["\\b(?:true|false|null)\\b", function (t) { return sp("literal", t) }],
      ["-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?", function (t) { return sp("number", t) }],
      ["\\/\\/[^\\n]*", function (t) { return sp("comment", t) }]
    ]);
  }
  function hlMl(code) {
    return scan(code, [
      ["<!--[\\s\\S]*?(?:-->|$)", function (t) { return sp("comment", t) }],
      ["<!DOCTYPE[^>]*>", function (t) { return sp("meta", t) }],
      ["<\\/?[A-Za-z][\\w:.-]*(?:\\s+[^<>]*?)?\\/?>", function (t) {
        var m = t.match(/^<(\/?)([A-Za-z][\w:.-]*)([\s\S]*?)(\/?)>$/); if (!m) return esc(t);
        var attrs = m[3].replace(/([\w:@.-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+)?/g, function (a, n, eq, v) { return '<span class="hljs-attr">' + esc(n) + "</span>" + (eq ? esc(eq) : "") + (v ? '<span class="hljs-string">' + esc(v) + "</span>" : "") });
        return '<span class="hljs-tag">' + esc("<" + m[1]) + '<span class="hljs-name">' + esc(m[2]) + "</span></span>" + attrs + '<span class="hljs-tag">' + esc(m[4] + ">") + "</span>";
      }],
      ["&[#\\w]+;", function (t) { return sp("symbol", t) }]
    ]);
  }
  function hlDiff(code) {
    return code.split("\n").map(function (l) { var c = l.charAt(0); return c === "+" && l.slice(0, 3) !== "+++" ? '<span class="hljs-addition">' + esc(l) + "</span>" : c === "-" && l.slice(0, 3) !== "---" ? '<span class="hljs-deletion">' + esc(l) + "</span>" : c === "@" ? sp("meta", l) : esc(l) }).join("\n");
  }
  function hlGen(code) {
    return scan(code, [
      ["\\/\\*[\\s\\S]*?(?:\\*\\/|$)|\\/\\/[^\\n]*|(?:^|(?<=\\s))#[^\\n]*", function (t) { return sp("comment", t) }],
      ["\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'", function (t) { return sp("string", t) }],
      [NUM, function (t) { return sp("number", t) }]
    ]);
  }
  function ownHL(code, l) {
    var f = fam(l);
    try {
      return f === "c" ? hlC(code) : f === "py" ? hlPy(code) : f === "sh" ? hlSh(code) : f === "sql" ? hlSql(code) : f === "ml" ? hlMl(code) : f === "css" ? hlCss(code) : f === "json" ? hlJson(code) : f === "diff" ? hlDiff(code) : hlGen(code);
    } catch (e) { return esc(code) }
  }
  function highlight(code, l) {
    var h = W.hljs, out = null;
    try {
      if (h && l && l !== "code" && l !== "text" && l !== "txt" && h.getLanguage(l)) out = h.highlight(code, { language: l, ignoreIllegals: true }).value;
    } catch (e) { out = null }
    return out == null ? ownHL(code, l) : out;
  }
  /* split highlighted html into lines, re-opening spans that cross a newline */
  function lines(html) {
    var out = [], stack = [], cur = "", i = 0, n = html.length;
    while (i < n) {
      var c = html.charAt(i);
      if (c === "<") {
        var j = html.indexOf(">", i); if (j < 0) j = n - 1;
        var tag = html.slice(i, j + 1);
        if (tag.charAt(1) === "/") stack.pop(); else if (!/\/>$/.test(tag)) stack.push(tag);
        cur += tag; i = j + 1;
      } else if (c === "\n") {
        out.push(cur + stack.map(function () { return "</span>" }).join("")); cur = stack.join(""); i++;
      } else { cur += c; i++ }
    }
    out.push(cur + stack.map(function () { return "</span>" }).join(""));
    return out;
  }
  function rows(code, l) {
    code = String(code).replace(/\r\n?/g, "\n").replace(/\n$/, "");
    return lines(highlight(code, l)).map(function (h) { return '<span class="ln">' + (h || " ") + "</span>" }).join("");
  }

  /* ───────── icons ───────── */
  function I(d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>" }
  var IC = {
    copy: I('<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A2.5 2.5 0 012 12.5v-8A2.5 2.5 0 014.5 2h8A2.5 2.5 0 0115 4.5V5"/>'),
    ok: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    wrap: I('<path d="M3 6h18M3 12h13a3.5 3.5 0 010 7h-4M3 18h5"/><path d="M13 16.5L11 19l2 2.5"/>'),
    dl: I('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>'),
    full: I('<path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/>'),
    shrink: I('<path d="M3 8h3a2 2 0 002-2V3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M21 16h-3a2 2 0 00-2 2v3"/>'),
    run: I('<path d="M7 4.5v15l12-7.5z" fill="currentColor" fill-opacity=".2"/>'),
    canvas: I('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 14h4"/>'),
    x: I('<path d="M6 6l12 12M18 6L6 18"/>', 18),
    search: I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    up: I('<path d="M6 15l6-6 6 6"/>'),
    down: I('<path d="M6 9l6 6 6-6"/>'),
    file: I('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>')
  };

  /* ───────── card ───────── */
  var COLLAPSE = 18;
  function card(code, l, enc) {
    var nm = NAMES[l] || (l ? l.charAt(0).toUpperCase() + l.slice(1) : "Code"), col = COL[l] || "#8a93a6";
    var n = String(code).replace(/\n$/, "").split("\n").length, run = /^(javascript|js|html)$/.test(l);
    return '<div class="code-block-wrapper cxb' + (n > COLLAPSE ? " cx-fold" : "") + '" data-cx-l="' + l + '" data-cx-n="' + n + '">' +
      '<div class="code-header cxh"><span class="cx-lang"><i style="background:' + col + '"></i>' + esc(nm) + '</span><span class="cx-n">' + n + " ln" + '</span>' +
      '<div class="code-tools cxt">' +
      (run ? '<button type="button" class="code-tool-btn cx-b cx-run" title="Run" aria-label="Run" onclick="runCodeBlock(this,\'' + enc + "','" + l + '\')">' + IC.run + "<em>Run</em></button>" : "") +
      '<button type="button" class="code-tool-btn cx-b" data-cx="wrap" title="Wrap lines" aria-label="Wrap lines">' + IC.wrap + "</button>" +
      '<button type="button" class="code-tool-btn cx-b" data-cx="dl" data-code="' + enc + '" title="Download" aria-label="Download">' + IC.dl + "</button>" +
      '<button type="button" class="code-tool-btn cx-b" title="Send to canvas" aria-label="Canvas" onclick="sendToCanvas(\'' + enc + '\')">' + IC.canvas + "</button>" +
      '<button type="button" class="code-tool-btn cx-b" title="Full screen" aria-label="Full screen" onclick="toggleFsCode(this)">' + IC.full + "</button>" +
      '<button type="button" class="code-tool-btn cx-b copy-code-btn cx-copy" data-code="' + enc + '" title="Copy" aria-label="Copy">' + IC.copy + "<em>Copy</em></button>" +
      "</div></div>" +
      '<div class="cx-body"><pre><code class="hljs cx-code">' + rows(code, l) + "</code></pre></div>" +
      (n > COLLAPSE ? '<button type="button" class="cx-more" data-cx="more">Show all ' + n + " lines</button>" : "") +
      "</div>";
  }

  /* ───────── hook the markdown renderer ───────── */
  function hook() {
    var r; try { r = renderer } catch (e) { return false }
    if (!r || typeof r.code !== "function") return false;
    if (r.code.__cx) return true;
    var orig = r.code;
    r.code = function (c, lang) {
      var T = W.PHR_trusted, raw;
      W.PHR_trusted = function (h) { return h };
      try { raw = orig.apply(this, arguments) } finally { W.PHR_trusted = T }
      try {
        if (typeof raw === "string" && raw.indexOf('<div class="code-block-wrapper"><div class="code-header">') === 0 && raw.indexOf('<pre><code class="hljs') > 0) {
          var m = raw.match(/data-code="([^"]*)"/), lm = raw.match(/letter-spacing:0\.5px">([^<]*)<\/span>/);
          if (m && lm) {
            var enc = m[1], code = decodeURIComponent(enc), l = lm[1].toLowerCase();
            raw = card(code, l, enc);
          }
        }
      } catch (e) { }
      return T ? T(raw) : raw;
    };
    r.code.__cx = 1;
    return true;
  }

  /* ───────── interactions ───────── */
  function dlName(l) { return "snippet." + ext(l) }
  function download(text, name) {
    try {
      var b = new Blob([text], { type: "text/plain;charset=utf-8" }), a = D.createElement("a");
      a.href = URL.createObjectURL(b); a.download = name; D.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 4000);
    } catch (e) { }
  }
  D.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cx]"); if (!b) {
      var cp = e.target.closest(".cx-copy"); if (cp) { cp.classList.add("done"); var o = cp.innerHTML; cp.innerHTML = IC.ok + "<em>Copied</em>"; setTimeout(function () { cp.classList.remove("done"); cp.innerHTML = o }, 1500) }
      return;
    }
    var w = b.closest(".cxb"), a = b.dataset.cx; hap();
    if (a === "wrap" && w) { w.classList.toggle("cx-wrap"); b.classList.toggle("on", w.classList.contains("cx-wrap")) }
    if (a === "more" && w) { w.classList.remove("cx-fold"); b.remove() }
    if (a === "dl") { var t = ""; try { t = decodeURIComponent(b.dataset.code) } catch (er) { } download(t, dlName((w && w.dataset.cxL) || "txt")); toast("Saved") }
  });
  (function () {
    var o = W.toggleFsCode; if (typeof o !== "function" || o.__cx) return;
    W.toggleFsCode = function (btn) {
      var r = o.apply(this, arguments);
      try { var w = btn.closest(".cxb"); if (w) btn.innerHTML = w.classList.contains("code-fullscreen") ? IC.shrink : IC.full } catch (e) { }
      return r;
    };
    W.toggleFsCode.__cx = 1;
  })();

  /* ───────── full-screen viewer ───────── */
  var V = null, vs = { fs: +LS("phr_cx_fs") || 13, wrap: LS("phr_cx_wrap") === "1", hits: [], at: -1 };
  function viewCss() {
    if ($("#cx-css")) return;
    var s = D.createElement("style"); s.id = "cx-css"; s.textContent = CSS; D.head.appendChild(s);
    try { var f = D.createElement("link"); f.rel = "stylesheet"; f.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"; D.head.appendChild(f) } catch (e) { }
  }
  function buildView() {
    if (V) return V;
    viewCss();
    V = D.createElement("div"); V.id = "cx-view";
    V.innerHTML =
      '<div class="cv-top"><button type="button" class="cv-i" data-v="close" aria-label="Close">' + IC.x + "</button>" +
      '<div class="cv-t"><b id="cv-name"></b><small id="cv-meta"></small></div>' +
      '<button type="button" class="cv-i" data-v="search" aria-label="Search">' + IC.search + "</button>" +
      '<button type="button" class="cv-i" data-v="wrap" id="cv-wrap" aria-label="Wrap">' + IC.wrap + "</button>" +
      '<button type="button" class="cv-i" data-v="copy" aria-label="Copy">' + IC.copy + "</button>" +
      '<button type="button" class="cv-i" data-v="dl" aria-label="Download">' + IC.dl + "</button></div>" +
      '<div class="cv-sr" id="cv-sr"><input id="cv-q" placeholder="Find in code" autocomplete="off" autocapitalize="off" spellcheck="false"><span id="cv-cnt"></span><button type="button" class="cv-i s" data-v="prev" aria-label="Previous">' + IC.up + '</button><button type="button" class="cv-i s" data-v="next" aria-label="Next">' + IC.down + "</button></div>" +
      '<div class="cv-body" id="cv-body"><pre><code class="hljs cx-code" id="cv-code"></code></pre></div>' +
      '<div class="cv-bot"><button type="button" class="cv-i" data-v="fm" aria-label="Smaller text">A−</button><span id="cv-fs"></span><button type="button" class="cv-i" data-v="fp" aria-label="Larger text">A+</button></div>';
    D.body.appendChild(V);
    V.addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]"); if (!b) return; var a = b.dataset.v; hap();
      if (a === "close") closeView();
      else if (a === "wrap") { vs.wrap = !vs.wrap; LS("phr_cx_wrap", vs.wrap ? "1" : "0"); applyView() }
      else if (a === "fm" || a === "fp") { vs.fs = Math.max(10, Math.min(22, vs.fs + (a === "fp" ? 1 : -1))); LS("phr_cx_fs", String(vs.fs)); applyView() }
      else if (a === "copy") { var t = V._text || ""; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("Copied") }, function () { var ta = D.createElement("textarea"); ta.value = t; D.body.appendChild(ta); ta.select(); try { D.execCommand("copy"); toast("Copied") } catch (er) { } ta.remove() }) }
      else if (a === "dl") { download(V._text || "", V._name || "file.txt"); toast("Saved") }
      else if (a === "search") { var sr = $("#cv-sr"); sr.classList.toggle("on"); if (sr.classList.contains("on")) setTimeout(function () { $("#cv-q").focus() }, 80); else { $("#cv-q").value = ""; find("") } }
      else if (a === "next") step(1); else if (a === "prev") step(-1);
    });
    $("#cv-q").addEventListener("input", function () { find(this.value) });
    $("#cv-q").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1) } });
    D.addEventListener("keydown", function (e) { if (e.key === "Escape" && V.classList.contains("on")) closeView() });
    return V;
  }
  function applyView() {
    $("#cv-body").style.setProperty("--fs", vs.fs + "px"); $("#cv-fs").textContent = vs.fs;
    V.classList.toggle("cx-wrap", vs.wrap); $("#cv-wrap").classList.toggle("on", vs.wrap);
  }
  function unmark() {
    [].forEach.call(V.querySelectorAll("mark.cx-hit"), function (m) { var p = m.parentNode; p.replaceChild(D.createTextNode(m.textContent), m); p.normalize() });
  }
  function find(q) {
    unmark(); vs.hits = []; vs.at = -1; var c = $("#cv-cnt"); c.textContent = "";
    if (!q) return;
    var ql = q.toLowerCase(), w = D.createTreeWalker($("#cv-code"), NodeFilter.SHOW_TEXT, null), nodes = [], nd;
    while ((nd = w.nextNode())) nodes.push(nd);
    nodes.forEach(function (n) {
      var t = n.nodeValue, tl = t.toLowerCase(), i = tl.indexOf(ql); if (i < 0) return;
      var f = D.createDocumentFragment(), last = 0;
      while (i >= 0 && vs.hits.length < 500) {
        if (i > last) f.appendChild(D.createTextNode(t.slice(last, i)));
        var m = D.createElement("mark"); m.className = "cx-hit"; m.textContent = t.slice(i, i + q.length); f.appendChild(m); vs.hits.push(m);
        last = i + q.length; i = tl.indexOf(ql, last);
      }
      f.appendChild(D.createTextNode(t.slice(last))); n.parentNode.replaceChild(f, n);
    });
    c.textContent = vs.hits.length ? "1/" + vs.hits.length : "0";
    if (vs.hits.length) step(1);
  }
  function step(d) {
    if (!vs.hits.length) return;
    if (vs.hits[vs.at]) vs.hits[vs.at].classList.remove("cur");
    vs.at = (vs.at + d + vs.hits.length) % vs.hits.length;
    var m = vs.hits[vs.at]; m.classList.add("cur");
    $("#cv-cnt").textContent = vs.at + 1 + "/" + vs.hits.length;
    var body = $("#cv-body"), r = m.getBoundingClientRect(), br = body.getBoundingClientRect();
    body.scrollTop += r.top - br.top - br.height / 3;
    if (!vs.wrap) body.scrollLeft += Math.min(0, r.left - br.left - 60) + Math.max(0, r.right - br.right + 30);
  }
  function openView(enc, name, n, lang) {
    var text = ""; try { text = decodeURIComponent(enc) } catch (e) { text = String(enc) }
    var l = String(lang || (name || "").split(".").pop() || "").toLowerCase();
    buildView(); V._text = text; V._name = name || "snippet.txt";
    $("#cv-name").textContent = V._name;
    var cnt = text.replace(/\n$/, "").split("\n").length;
    $("#cv-meta").textContent = cnt + " lines · " + (NAMES[l] || l || "text") + " · " + (text.length > 1024 ? (text.length / 1024).toFixed(1) + " KB" : text.length + " B");
    $("#cv-code").innerHTML = rows(text, l);
    $("#cv-sr").classList.remove("on"); $("#cv-q").value = ""; $("#cv-cnt").textContent = "";
    applyView(); $("#cv-body").scrollTop = 0; $("#cv-body").scrollLeft = 0;
    V.classList.add("on"); D.body.style.overflow = "hidden";
  }
  function closeView() { if (V) { V.classList.remove("on"); D.body.style.overflow = "" } }
  W.openVirtualEditor = openView; W.closeVirtualEditor = closeView;

  /* ───────── style ───────── */
  var MONO = "'JetBrains Mono','Fira Code',ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace";
  var CSS = [
    ":root{--cx-mono:" + MONO + ";--cx-bg:#0e1116;--cx-bg2:#141922;--cx-ln:rgba(255,255,255,.28);--cx-bd:rgba(255,255,255,.09);--cx-fg:#d6dbe4;--cx-k:#c792ea;--cx-s:#9ed17f;--cx-n:#f0a96b;--cx-c:#6f7b8f;--cx-f:#6cb6ff;--cx-t:#f0cd7c;--cx-l:#59c4d4;--cx-v:#ee7b86;--cx-m:#8d9bb0;--cx-r:#e9a35b}",
    "body.light-theme{--cx-bg:#fbfaf6;--cx-bg2:#f1eee4;--cx-ln:rgba(43,35,19,.34);--cx-bd:rgba(43,35,19,.12);--cx-fg:#2b2e36;--cx-k:#a626a4;--cx-s:#2f7d32;--cx-n:#b5530a;--cx-c:#8a8f9a;--cx-f:#0a62c9;--cx-t:#946200;--cx-l:#0b7285;--cx-v:#c4263a;--cx-m:#6b7280;--cx-r:#a04a00}",
    /* tokens */
    ".cx-code .hljs-keyword,.cx-code .hljs-selector-tag,.cx-code .hljs-doctag{color:var(--cx-k)}",
    ".cx-code .hljs-string,.cx-code .hljs-addition,.cx-code .hljs-template-variable{color:var(--cx-s)}",
    ".cx-code .hljs-number,.cx-code .hljs-attr,.cx-code .hljs-attribute,.cx-code .hljs-selector-attr{color:var(--cx-n)}",
    ".cx-code .hljs-comment,.cx-code .hljs-quote{color:var(--cx-c);font-style:italic}",
    ".cx-code .hljs-title,.cx-code .hljs-title.function_,.cx-code .hljs-function .hljs-title{color:var(--cx-f)}",
    ".cx-code .hljs-title.class_,.cx-code .hljs-type,.cx-code .hljs-class .hljs-title,.cx-code .hljs-selector-class,.cx-code .hljs-selector-id{color:var(--cx-t)}",
    ".cx-code .hljs-literal,.cx-code .hljs-built_in,.cx-code .hljs-symbol,.cx-code .hljs-bullet{color:var(--cx-l)}",
    ".cx-code .hljs-variable,.cx-code .hljs-tag,.cx-code .hljs-name,.cx-code .hljs-deletion,.cx-code .hljs-params{color:var(--cx-v)}",
    ".cx-code .hljs-tag .hljs-name{color:var(--cx-v)}.cx-code .hljs-tag{color:var(--cx-m)}",
    ".cx-code .hljs-meta,.cx-code .hljs-meta .hljs-keyword{color:var(--cx-m)}",
    ".cx-code .hljs-regexp{color:var(--cx-r)}",
    ".cx-code .hljs-addition{background:rgba(70,160,90,.14);display:inline-block;width:100%}.cx-code .hljs-deletion{background:rgba(230,80,80,.14);display:inline-block;width:100%}",
    /* lines */
    ".cx-code{display:block;counter-reset:ln;font-family:var(--cx-mono)!important;font-variant-ligatures:none;font-feature-settings:'liga' 0,'calt' 0;tab-size:2;color:var(--cx-fg)}",
    ".cx-code .ln{display:block;position:relative;padding:0 16px 0 52px;min-height:1.7em;white-space:pre}",
    ".cx-code .ln::before{counter-increment:ln;content:counter(ln);position:absolute;left:0;width:38px;text-align:right;color:var(--cx-ln);font-size:.86em;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}",
    ".cx-wrap .cx-code .ln,.cxb.cx-wrap .cx-code .ln{white-space:pre-wrap;word-break:break-word}",
    /* card */
    ".msg .code-block-wrapper.cxb,.code-block-wrapper.cxb{margin:14px 0!important;border-radius:14px!important;border:1px solid var(--cx-bd)!important;background:var(--cx-bg)!important;box-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 8px 24px -14px rgba(0,0,0,.6);overflow:hidden;max-width:100%;position:relative;font-family:var(--cx-mono)}",
    ".code-block-wrapper.cxb::before{display:none!important}",
    ".cxb .cxh{display:flex!important;align-items:center;gap:10px;padding:0 6px 0 14px!important;min-height:42px;background:var(--cx-bg2)!important;border-bottom:1px solid var(--cx-bd)!important;flex-wrap:nowrap!important;font-family:var(--cx-mono)!important}",
    ".cx-lang{display:flex;align-items:center;gap:8px;font:600 12px/1 -apple-system,system-ui,'Space Grotesk',sans-serif;color:var(--cx-fg);white-space:nowrap;flex-shrink:0}.cx-lang i{width:9px;height:9px;border-radius:50%;display:block;box-shadow:0 0 0 2px rgba(255,255,255,.06)}",
    ".cx-n{font:500 11px/1 var(--cx-mono);color:var(--cx-ln);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis}",
    ".cxb .cxt{margin-left:auto!important;display:flex!important;align-items:center;gap:2px;flex-shrink:0}",
    ".cxb .cx-b{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;min-width:34px;height:34px;padding:0 8px!important;border:0!important;border-radius:9px!important;background:none!important;color:var(--cx-m)!important;font:600 12px/1 -apple-system,system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important;text-transform:none!important;letter-spacing:0!important}",
    ".cxb .cx-b em{font-style:normal}.cxb .cx-b:not(.cx-run):not(.cx-copy) em{display:none}",
    ".cxb .cx-b:active{background:rgba(128,128,128,.18)!important}.cxb .cx-b.on{color:var(--p,#D4A24C)!important;background:rgba(128,128,128,.14)!important}",
    ".cxb .cx-run{color:#5fd08a!important}.cxb .cx-copy.done{color:#5fd08a!important}",
    "@media(max-width:420px){.cxb .cx-b em{display:none!important}.cxb .cx-run em,.cxb .cx-copy em{display:none!important}}",
    ".cx-body{overflow-x:auto;-webkit-overflow-scrolling:touch;background:transparent}",
    "body .code-block-wrapper.cxb .cx-body pre,body .msg .code-block-wrapper.cxb .cx-body pre,body #cx-view .cv-body pre{border:0!important;border-radius:0!important;box-shadow:none!important;outline:0!important;background:transparent!important;background-image:none!important}",
    ".cxb pre::before,.cxb pre::after,.cv-body pre::before,.cv-body pre::after{display:none!important}",
    ".cxb pre{margin:0!important;padding:12px 0!important;background:transparent!important;border:0!important;font-size:12.5px;line-height:1.7;overflow:visible!important}",
    ".cxb pre code{background:transparent!important;padding:0!important;font-size:inherit!important;display:block;width:max-content;min-width:100%}",
    ".cxb.cx-wrap pre code{width:auto}",
    ".cxb.cx-fold .cx-body{max-height:calc(1.7em * 18 + 24px);overflow-y:hidden;-webkit-mask-image:linear-gradient(#000 78%,transparent);mask-image:linear-gradient(#000 78%,transparent)}",
    ".cx-more{display:block;width:100%;border:0;border-top:1px solid var(--cx-bd);background:var(--cx-bg2);color:var(--cx-fg);padding:11px;font:600 12.5px -apple-system,system-ui,sans-serif;cursor:pointer}.cx-more:active{opacity:.7}",
    ".cxb.code-fullscreen{border-radius:0!important;max-height:none;border:0!important}.cxb.code-fullscreen .cx-body{max-height:none;-webkit-mask-image:none;mask-image:none;overflow:auto;height:calc(100dvh - 60px)}.cxb.code-fullscreen pre{font-size:13.5px}",
    ".cxb.code-fullscreen .cxh{padding-top:env(safe-area-inset-top)!important;min-height:calc(46px + env(safe-area-inset-top))}",
    /* inline code */
    ".msg.ai code:not(pre code),.ai code:not(pre code){font-family:var(--cx-mono)!important;font-size:.85em!important;padding:.14em .42em!important;border-radius:6px!important;background:rgba(127,127,140,.16)!important;color:inherit!important;border:1px solid rgba(127,127,140,.18);font-variant-ligatures:none}",
    /* file card */
    ".code-file-card{border-radius:14px!important;border:1px solid var(--cx-bd)!important;background:var(--cx-bg)!important;gap:13px!important;padding:12px 14px!important}",
    ".code-file-card .cfc-name{font:600 14px/1.2 var(--cx-mono)!important}.code-file-card .cfc-meta{font:500 11.5px/1.3 -apple-system,system-ui,sans-serif!important;opacity:.62}",
    /* tables */
    ".msg .table-scroll,.table-scroll{margin:14px 0!important;border-radius:12px!important;border:1px solid var(--cx-bd)!important;background:transparent!important;overflow-x:auto;-webkit-overflow-scrolling:touch}",
    ".msg table,.table-scroll table{width:100%;min-width:max-content;border-collapse:separate!important;border-spacing:0;font:14px/1.55 -apple-system,system-ui,'Vazirmatn','Space Grotesk',sans-serif!important;font-variant-numeric:tabular-nums;border:0!important;margin:0!important;background:transparent!important}",
    ".msg thead th,.table-scroll thead th{position:sticky;top:0;text-align:start;padding:10px 14px!important;font:650 12px/1.3 -apple-system,system-ui,'Vazirmatn',sans-serif!important;letter-spacing:.02em!important;text-transform:none!important;color:var(--txt,#fff)!important;background:var(--cx-bg2)!important;border-bottom:1px solid var(--cx-bd)!important;white-space:nowrap}",
    ".msg tbody td,.table-scroll tbody td{padding:10px 14px!important;border:0!important;border-bottom:1px solid var(--cx-bd)!important;vertical-align:top;background:transparent!important}",
    ".msg tbody tr:last-child td{border-bottom:0!important}",
    ".msg tbody tr:nth-child(even) td{background:rgba(127,127,140,.06)!important}",
    ".msg tbody tr:active td{background:rgba(127,127,140,.12)!important}",
    ".msg td code,.msg th code{font-size:.84em}",
    /* viewer */
    "#cx-view{position:fixed;inset:0;z-index:9500;display:none;flex-direction:column;background:var(--cx-bg);color:var(--cx-fg);font-family:-apple-system,system-ui,'Vazirmatn',sans-serif}",
    "#cx-view.on{display:flex;animation:cxin .26s cubic-bezier(.2,1,.3,1)}@keyframes cxin{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}",
    ".cv-top{display:flex;align-items:center;gap:2px;padding:calc(8px + env(safe-area-inset-top)) 8px 8px;background:var(--cx-bg2);border-bottom:1px solid var(--cx-bd)}",
    ".cv-t{flex:1;min-width:0;padding:0 8px}.cv-t b{display:block;font:600 14.5px/1.25 var(--cx-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--cx-fg)}.cv-t small{display:block;margin-top:2px;font-size:11.5px;color:var(--cx-ln);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".cv-i{flex:none;min-width:40px;height:40px;border:0;border-radius:11px;background:none;color:var(--cx-fg);display:grid;place-items:center;cursor:pointer;font:600 14px -apple-system,system-ui,sans-serif;padding:0 6px;opacity:.85}.cv-i:active{background:rgba(128,128,128,.2)}.cv-i.on{color:var(--p,#D4A24C);background:rgba(128,128,128,.14);opacity:1}.cv-i sup{font-size:9px}",
    ".cv-sr{display:none;align-items:center;gap:4px;padding:8px 12px;background:var(--cx-bg2);border-bottom:1px solid var(--cx-bd)}.cv-sr.on{display:flex}",
    ".cv-sr input{flex:1;min-width:0;height:38px;border:0;border-radius:10px;background:rgba(127,127,140,.14);color:var(--cx-fg);padding:0 12px;font:16px var(--cx-mono);outline:none}.cv-sr span{font:500 12px var(--cx-mono);color:var(--cx-ln);min-width:42px;text-align:center}.cv-i.s{min-width:36px;height:36px}",
    ".cv-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;--fs:13px;-webkit-user-select:text;user-select:text}.cv-body pre{margin:0;padding:12px 0 calc(40px + env(safe-area-inset-bottom));font-size:var(--fs);line-height:1.7;background:transparent;overflow:visible}.cv-body pre code{display:block;width:max-content;min-width:100%;background:transparent;-webkit-user-select:text;user-select:text}",
    "#cx-view.cx-wrap .cv-body pre code{width:auto}",
    ".cv-bot{display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px calc(6px + env(safe-area-inset-bottom));background:var(--cx-bg2);border-top:1px solid var(--cx-bd)}.cv-bot span{min-width:30px;text-align:center;font:600 12px var(--cx-mono);color:var(--cx-ln)}",
    "mark.cx-hit{background:rgba(255,200,60,.28);color:inherit;border-radius:3px;padding:0 1px}mark.cx-hit.cur{background:rgba(255,160,40,.7);color:#000}"
  ].join("\n");

  viewCss();
  (function wait(n) { if (!hook() && n < 100) setTimeout(function () { wait(n + 1) }, 100) })(0);
  W.PHR_CODE = { highlight: ownHL, rows: rows, card: card, open: openView, close: closeView };
})();
