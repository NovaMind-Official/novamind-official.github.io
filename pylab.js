/* Phraortes — in-app Python computer.
   Real CPython (Pyodide) runs in a Web Worker inside the page. Files live in /work and persist in IndexedDB.
   The AI writes a ```pyrun block; the app runs it, and the result (or the error) can flow back to the AI. */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var CDN = window.PHR_PY_CDN || "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

  /* ---------------- worker ---------------- */
  function workerMain(CDN) {
    var py = null, cur = 0, chain = Promise.resolve();
    function post(m) { self.postMessage(m); }
    var FIG = "import io,base64\ndef __phr_figs():\n import matplotlib.pyplot as plt\n o=[]\n for n in plt.get_fignums():\n  b=io.BytesIO();plt.figure(n).savefig(b,format='png',dpi=110,bbox_inches='tight');o.append(base64.b64encode(b.getvalue()).decode())\n plt.close('all')\n return o\n";
    var mplReady = false;
    function sync(load) { return new Promise(function (res) { try { py.FS.syncfs(!!load, function () { res(); }); } catch (e) { res(); } }); }
    function ls() {
      var out = [];
      try { py.FS.readdir("/work").forEach(function (n) { if (n === "." || n === "..") return; var st = py.FS.stat("/work/" + n); if (!py.FS.isDir(st.mode)) out.push({ name: n, size: st.size }); }); } catch (e) {}
      return out;
    }
    async function init() {
      try {
        post({ t: "status", s: "download" });
        importScripts(CDN + "pyodide.js");
        py = await loadPyodide({ indexURL: CDN });
        post({ t: "status", s: "mount" });
        try { py.FS.mkdirTree("/work"); py.FS.mount(py.FS.filesystems.IDBFS, {}, "/work"); await sync(true); } catch (e) {}
        py.FS.chdir("/work");
        py.setStdout({ batched: function (s) { post({ t: "out", id: cur, k: "o", s: s + "\n" }); } });
        py.setStderr({ batched: function (s) { post({ t: "out", id: cur, k: "e", s: s + "\n" }); } });
        post({ t: "ready", files: ls() });
      } catch (e) { post({ t: "fatal", e: String(e && e.message || e) }); }
    }
    async function run(m) {
      cur = m.id;
      try {
        await py.loadPackagesFromImports(m.code, { messageCallback: function (s) { post({ t: "status", s: "pkg", d: s }); }, errorCallback: function () {} });
        var mpl = /matplotlib|pyplot/.test(m.code);
        if (mpl && !mplReady) { py.runPython("import matplotlib\nmatplotlib.use('agg')\nimport matplotlib.pyplot as plt\nplt.style.use('dark_background')\n" + FIG); mplReady = true; }
        post({ t: "status", s: "run" });
        var r = await py.runPythonAsync(m.code), figs = [];
        if (mpl) { try { figs = py.runPython("__phr_figs()").toJs(); } catch (e) {} }
        var rs = null; if (r !== undefined && r !== null) { try { rs = String(r); } catch (e) { rs = "[object]"; } if (r && r.destroy) try { r.destroy(); } catch (e) {} }
        await sync(false);
        post({ t: "done", id: m.id, ok: true, result: rs, figs: figs, files: ls() });
      } catch (err) {
        var msg = String(err && err.message || err).split("\n"); if (msg.length > 16) msg = ["…"].concat(msg.slice(-15));
        try { await sync(false); } catch (e) {}
        post({ t: "done", id: m.id, ok: false, error: msg.join("\n"), figs: [], files: ls() });
      }
    }
    self.onmessage = function (e) {
      var m = e.data;
      if (m.t === "init") { init(); return; }
      chain = chain.then(async function () {
        if (!py) return;
        if (m.t === "run") return run(m);
        if (m.t === "ls") { post({ t: "files", files: ls() }); return; }
        if (m.t === "write") { try { py.FS.writeFile("/work/" + m.name, new Uint8Array(m.data)); await sync(false); } catch (er) {} post({ t: "files", files: ls() }); return; }
        if (m.t === "rm") { try { py.FS.unlink("/work/" + m.name); await sync(false); } catch (er) {} post({ t: "files", files: ls() }); return; }
        if (m.t === "read") { var d = null; try { d = py.FS.readFile("/work/" + m.name); } catch (er) {} post({ t: "file", id: m.id, name: m.name, data: d }); return; }
      });
    };
  }

  /* ---------------- manager ---------------- */
  var PY = window.PHR_PY = { w: null, state: "idle", status: "", files: [], subs: [], runs: {}, seq: 0, queue: [], busy: false, err: "" };
  function emit() { PY.subs.forEach(function (f) { try { f(); } catch (e) {} }); }
  PY.sub = function (f) { PY.subs.push(f); };
  PY.unsub = function (f) { PY.subs = PY.subs.filter(function (x) { return x !== f; }); };
  PY.start = function () {
    if (PY.w) return;
    PY.state = "loading"; PY.status = "download"; PY.err = "";
    var url; try { url = URL.createObjectURL(new Blob(["(" + workerMain.toString() + ")(" + JSON.stringify(CDN) + ")"], { type: "text/javascript" })); } catch (e) { PY.state = "fatal"; PY.err = String(e); emit(); return; }
    var w = new Worker(url); PY.w = w;
    w.onerror = function (e) { PY.state = "fatal"; PY.err = (e && e.message) || "worker error"; PY.fail(); };
    w.onmessage = function (e) {
      var m = e.data;
      if (m.t === "status") { PY.status = m.s + (m.d ? ":" + m.d : ""); }
      else if (m.t === "ready") { PY.state = "ready"; PY.status = ""; PY.files = m.files || []; PY.pump(); }
      else if (m.t === "fatal") { PY.state = "fatal"; PY.err = m.e; PY.fail(); }
      else if (m.t === "out") { var r = PY.runs[m.id]; if (r) r.on && r.on(m.k, m.s); }
      else if (m.t === "done") { var r2 = PY.runs[m.id]; delete PY.runs[m.id]; PY.files = m.files || PY.files; PY.busy = false; if (r2) r2.res(m); PY.pump(); }
      else if (m.t === "files") { PY.files = m.files || []; }
      else if (m.t === "file") { var f = PY.fileReq && PY.fileReq[m.id]; if (f) { delete PY.fileReq[m.id]; f(m.data); } }
      emit();
    };
    w.postMessage({ t: "init" }); emit();
  };
  PY.fail = function () {
    var q = PY.queue.splice(0); Object.keys(PY.runs).forEach(function (k) { q.push(PY.runs[k]); }); PY.runs = {}; PY.busy = false;
    q.forEach(function (r) { r.res({ ok: false, error: PY.err || "Python failed to start", figs: [], files: PY.files, fatal: true }); });
    try { PY.w && PY.w.terminate(); } catch (e) {} PY.w = null; emit();
  };
  PY.pump = function () {
    if (PY.state !== "ready" || PY.busy || !PY.queue.length) return;
    var r = PY.queue.shift(); PY.busy = true; PY.runs[r.id] = r; PY.w.postMessage({ t: "run", id: r.id, code: r.code });
  };
  PY.run = function (code, on) {
    return new Promise(function (res) { var r = { id: ++PY.seq, code: code, on: on, res: res }; PY.queue.push(r); PY.start(); PY.pump(); emit(); });
  };
  PY.stop = function () {
    var q = PY.queue.splice(0); Object.keys(PY.runs).forEach(function (k) { q.push(PY.runs[k]); }); PY.runs = {}; PY.busy = false;
    try { PY.w && PY.w.terminate(); } catch (e) {} PY.w = null; PY.state = "idle"; PY.status = "";
    q.forEach(function (r) { r.res({ ok: false, error: "stopped", stopped: true, figs: [], files: PY.files }); }); emit();
  };
  PY.write = function (name, buf) { PY.start(); var go = function () { PY.w.postMessage({ t: "write", name: name, data: buf }, [buf]); }; if (PY.state === "ready") go(); else { var f = function () { if (PY.state === "ready") { PY.unsub(f); go(); } }; PY.sub(f); } };
  PY.rm = function (name) { if (PY.state === "ready") PY.w.postMessage({ t: "rm", name: name }); };
  PY.read = function (name, cb) { PY.fileReq = PY.fileReq || {}; var id = ++PY.seq; PY.fileReq[id] = cb; PY.w.postMessage({ t: "read", id: id, name: name }); };

  /* ---------------- chat bridge ---------------- */
  var chainN = 0, chainT = 0;
  function sendToChat(text, tries) {
    tries = tries || 0;
    if (typeof window.PHR_sendText !== "function") return false;
    if (window.PHR_sendText(text)) return true;
    if (tries < 40) setTimeout(function () { sendToChat(text, tries + 1); }, 700);
    return false;
  }
  function allowAuto() { var now = Date.now(); if (now - chainT > 120000) chainN = 0; if (chainN >= 4) return false; chainN++; chainT = now; return true; }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); }
  function ranBefore(h) { try { return (localStorage.getItem("phr_pyran") || "").split(",").indexOf(h) >= 0; } catch (e) { return false; } }
  function markRan(h) { try { var a = (localStorage.getItem("phr_pyran") || "").split(",").filter(Boolean); a.push(h); localStorage.setItem("phr_pyran", a.slice(-40).join(",")); } catch (e) {} }

  /* ---------------- strings ---------------- */
  var S = {
    en: { badge: "python", code: "Code", out: "Output", files: "Files", run: "Run", running: "Running…", stop: "Stop", send: "Send result to AI", fix: "Ask AI to fix", dl: "Download", del: "Delete", up: "Add file",
      empty: "No files yet. Anything the code saves in the current folder appears here and stays after you close the app.", first: "First run downloads the Python engine (about 10 MB, cached afterwards).",
      s_download: "Downloading Python…", s_mount: "Preparing files…", s_pkg: "Loading packages…", s_run: "Running…", ok: "Finished", err: "Error", stopped: "Stopped", noout: "(no output)", plots: "plots",
      fatal: "Couldn't start Python. Check your connection (some networks block the CDN) and try again.", note: "Runs on your device, in a private sandbox. Files stay on this device.", reset: "Reset" },
    fa: { badge: "پایتون", code: "کد", out: "خروجی", files: "فایل‌ها", run: "اجرا", running: "در حال اجرا…", stop: "توقف", send: "ارسال نتیجه به AI", fix: "بگو درستش کند", dl: "دانلود", del: "حذف", up: "افزودن فایل",
      empty: "هنوز فایلی نیست. هر چیزی که کد در پوشه فعلی ذخیره کند اینجا می‌آید و بعد از بستن اپ هم می‌ماند.", first: "اولین اجرا موتور پایتون را دانلود می‌کند (حدود ۱۰ مگابایت، بعدش ذخیره می‌شود).",
      s_download: "در حال دانلود پایتون…", s_mount: "آماده‌سازی فایل‌ها…", s_pkg: "بارگذاری کتابخانه‌ها…", s_run: "در حال اجرا…", ok: "تمام شد", err: "خطا", stopped: "متوقف شد", noout: "(بدون خروجی)", plots: "نمودار",
      fatal: "پایتون شروع نشد. اتصال را بررسی کن (بعضی شبکه‌ها CDN را مسدود می‌کنند) و دوباره امتحان کن.", note: "روی دستگاه خودت و در یک محیط جدا اجرا می‌شود. فایل‌ها روی همین دستگاه می‌مانند.", reset: "بازنشانی" }
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtSize(n) { return n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB"; }

  /* ---------------- styles ---------------- */
  var st = document.createElement("style"); st.id = "phr-pylab-css";
  st.textContent =
    ".pl-ed{display:block;width:100%;min-height:170px;max-height:420px;resize:vertical;border:0;outline:0;background:#0b0e12;color:#e4e8ee;font:13px/1.55 'IBM Plex Mono',ui-monospace,Menlo,monospace;padding:14px;tab-size:2;white-space:pre;overflow:auto;direction:ltr;text-align:left;-webkit-text-size-adjust:100%}" +
    ".pl-out{margin:0;padding:14px;min-height:120px;max-height:420px;overflow:auto;background:#0b0e12;font:13px/1.55 'IBM Plex Mono',ui-monospace,Menlo,monospace;color:#d8dde5;white-space:pre-wrap;word-break:break-word;direction:ltr;text-align:left}" +
    ".pl-out .e{color:#ff8a7a}.pl-out .r{color:#E2BE6A}.pl-out .m{color:#7d8793}" +
    ".pl-out img{display:block;max-width:100%;border-radius:10px;margin:10px 0;background:#000}" +
    ".pl-st{display:flex;align-items:center;gap:8px;padding:8px 14px;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#8a95a1;border-top:1px solid rgba(255,255,255,.07);direction:ltr}" +
    ".pl-dot{width:7px;height:7px;border-radius:50%;background:#5a6571;flex:none}.pl-dot.run{background:#E2BE6A;animation:plp 1s infinite}.pl-dot.ok{background:#58C48F}.pl-dot.bad{background:#ff6b5a}" +
    "@keyframes plp{50%{opacity:.35}}" +
    ".pl-files{padding:8px 12px 12px;display:grid;gap:6px;min-height:120px}" +
    ".pl-f{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.03)}" +
    ".pl-f b{font:600 13px 'IBM Plex Mono',monospace;direction:ltr;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}.pl-f small{color:#8a95a1;font:11px 'IBM Plex Mono',monospace}" +
    ".pl-emp{padding:22px 10px;text-align:center;color:#8a95a1;font-size:13px;line-height:1.7}" +
    ".pl-bar{display:flex;flex-wrap:wrap;gap:8px;padding:10px 12px}";
  document.head.appendChild(st);

  /* ---------------- widget ---------------- */
  W.ALIAS && ["pyrun", "pylab", "python-run", "pyexec", "pycomputer", "computer"].forEach(function (k) { W.ALIAS[k] = "pylab"; });
  W.kinds.pylab = 1;
  W.builders.pylab = function (root, lines, map) {
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var code = raw.replace(/^\n+/, "").replace(/\s+$/, "");
    if (!code) throw new Error("empty");
    var T = S[root._lang === "fa" ? "fa" : "en"];
    var head = code.split("\n").slice(0, 4).join("\n");
    var wantAuto = /^\s*#\s*autorun\b/im.test(head), wantReport = /^\s*#\s*report\b/im.test(head);
    var title = (head.match(/^\s*#\s*title\s*[:=]\s*(.+)$/im) || [])[1] || "";
    var tab = "code", outHTML = "", last = null, running = false, myRun = 0, h0 = hash(code), attempts = 0;

    root.innerHTML =
      '<div class="phr-w-head"><span class="phr-w-badge">' + esc(T.badge) + '</span><span class="phr-w-title">' + esc(title) + "</span></div>" +
      '<div class="pg-tabs"><button class="pg-tab on" data-t="code">' + T.code + '</button><button class="pg-tab" data-t="out">' + T.out + '</button><button class="pg-tab" data-t="files">' + T.files + "</button></div>" +
      '<div data-p="code"><textarea class="pl-ed" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea></div>' +
      '<div data-p="out" hidden><pre class="pl-out"></pre></div>' +
      '<div data-p="files" hidden><div class="pl-files"></div></div>' +
      '<div class="pl-st"><i class="pl-dot"></i><span class="pl-msg"></span></div>' +
      '<div class="pl-bar"><button class="phr-w-btn gold" data-a="run"></button><button class="phr-w-btn" data-a="stop" hidden></button><button class="phr-w-btn" data-a="send" hidden></button><button class="phr-w-btn" data-a="fix" hidden></button><button class="phr-w-btn" data-a="up"></button><input type="file" hidden multiple></div>' +
      '<div class="phr-note" style="opacity:.55;padding-top:0">' + esc(T.note) + "</div>";
    var $ = function (s) { return root.querySelector(s); }, ta = $(".pl-ed"), pre = $(".pl-out"), dot = $(".pl-dot"), msg = $(".pl-msg"), filesEl = $(".pl-files");
    var bRun = $('[data-a="run"]'), bStop = $('[data-a="stop"]'), bSend = $('[data-a="send"]'), bFix = $('[data-a="fix"]'), bUp = $('[data-a="up"]'), fin = $("input[type=file]");
    ta.value = code; bRun.textContent = T.run; bStop.textContent = T.stop; bSend.textContent = T.send; bFix.textContent = T.fix; bUp.textContent = T.up;
    msg.textContent = PY.state === "ready" ? "Python 3 · /work" : T.first;
    function setTab(t) { tab = t; [].forEach.call(root.querySelectorAll(".pg-tab"), function (b) { b.classList.toggle("on", b.getAttribute("data-t") === t); }); ["code", "out", "files"].forEach(function (k) { $('[data-p="' + k + '"]').hidden = k !== t; }); if (t === "files") paintFiles(); }
    [].forEach.call(root.querySelectorAll(".pg-tab"), function (b) { b.addEventListener("click", function () { setTab(b.getAttribute("data-t")); }); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Tab") { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); go(false); } });

    function paintStatus() {
      var s = PY.status.split(":")[0];
      if (running) { dot.className = "pl-dot run"; msg.textContent = PY.state === "loading" ? (T["s_" + s] || T.s_download) : (s === "pkg" ? T.s_pkg + " " + (PY.status.split(":")[1] || "") : T.s_run); }
      else if (PY.state === "fatal") { dot.className = "pl-dot bad"; msg.textContent = T.fatal; }
    }
    function paintFiles() {
      var fl = PY.files || [];
      if (!fl.length) { filesEl.innerHTML = '<div class="pl-emp">' + esc(T.empty) + "</div>"; return; }
      filesEl.innerHTML = fl.map(function (f) { return '<div class="pl-f"><div style="min-width:0;flex:1"><b>' + esc(f.name) + "</b><small>" + fmtSize(f.size) + '</small></div><button class="phr-w-btn" data-dl="' + esc(f.name) + '">' + T.dl + '</button><button class="phr-w-btn" data-rm="' + esc(f.name) + '">' + T.del + "</button></div>"; }).join("");
    }
    filesEl.addEventListener("click", function (e) {
      var d = e.target.getAttribute && e.target.getAttribute("data-dl"), r = e.target.getAttribute && e.target.getAttribute("data-rm");
      if (d && PY.state === "ready") PY.read(d, function (data) { if (!data) return; var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data])); a.download = d; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); });
      if (r) { PY.rm(r); }
    });
    bUp.addEventListener("click", function () { fin.click(); });
    fin.addEventListener("change", function () { [].forEach.call(fin.files, function (f) { var rd = new FileReader(); rd.onload = function () { PY.write(f.name.replace(/[^\w.\- ]+/g, "_"), rd.result); setTimeout(function () { if (tab === "files") paintFiles(); }, 400); }; rd.readAsArrayBuffer(f); }); fin.value = ""; setTab("files"); });
    var sub = function () { if (!root.isConnected) { PY.unsub(sub); return; } paintStatus(); if (tab === "files") paintFiles(); };
    PY.sub(sub);

    function out(kind, s) { var sp = document.createElement("span"); if (kind === "e") sp.className = "e"; sp.textContent = s; pre.appendChild(sp); pre.scrollTop = pre.scrollHeight; }
    function summary(res, maxc) {
      var t = pre.textContent.replace(/\s+$/, ""); if (t.length > maxc) t = t.slice(0, maxc) + "\n…(truncated)";
      return t;
    }
    function go(auto) {
      if (running) return; running = true; myRun++; var me = myRun;
      pre.innerHTML = ""; setTab("out"); bRun.disabled = true; bRun.textContent = T.running; bStop.hidden = false; bSend.hidden = true; bFix.hidden = true; dot.className = "pl-dot run"; paintStatus();
      PY.run(ta.value, function (k, s) { if (me === myRun) out(k, s); }).then(function (res) {
        if (me !== myRun) return; running = false; last = res; bRun.disabled = false; bRun.textContent = T.run; bStop.hidden = true;
        if (res.stopped) { dot.className = "pl-dot"; msg.textContent = T.stopped; return; }
        if (res.ok) {
          if (res.result && res.result !== "None") { var rs = document.createElement("span"); rs.className = "r"; rs.textContent = "→ " + res.result + "\n"; pre.appendChild(rs); }
          (res.figs || []).forEach(function (b) { var im = document.createElement("img"); im.src = "data:image/png;base64," + b; im.alt = "plot"; pre.appendChild(im); });
          if (!pre.textContent.trim() && !(res.figs || []).length) { var nm = document.createElement("span"); nm.className = "m"; nm.textContent = T.noout; pre.appendChild(nm); }
          dot.className = "pl-dot ok"; msg.textContent = T.ok + (res.figs && res.figs.length ? " · " + res.figs.length + " " + T.plots : "") + (PY.files.length ? " · " + PY.files.length + " " + T.files.toLowerCase() : "");
          bSend.hidden = false;
        } else {
          out("e", res.error + "\n"); dot.className = "pl-dot bad"; msg.textContent = T.err; bSend.hidden = false; bFix.hidden = res.fatal ? true : false;
        }
        if (auto && !res.fatal) {
          if (!res.ok && attempts < 3 && allowAuto()) { attempts++; sendToChat("[pyrun error]\n```\n" + summary(res, 1800) + "\n```\nThe code failed. Fix it and run it again with a ```pyrun block."); }
          else if (res.ok && wantReport && allowAuto()) sendToChat(resultMessage(res));
        }
      });
    }
    function resultMessage(res) {
      var t = summary(res, 3000), extra = [];
      if (res.result && res.result !== "None") extra.push("return value: " + res.result);
      if (res.figs && res.figs.length) extra.push(res.figs.length + " plot(s) shown to the user");
      if (PY.files.length) extra.push("files in /work: " + PY.files.map(function (f) { return f.name + " (" + fmtSize(f.size) + ")"; }).join(", "));
      return "[pyrun result]\n```\n" + (t.replace(/→ .*\n?/, "") || "(no output)") + "\n```\n" + (extra.length ? extra.join("; ") + "\n" : "") + "Use this result to continue.";
    }
    bRun.addEventListener("click", function () { go(false); });
    bStop.addEventListener("click", function () { PY.stop(); });
    bSend.addEventListener("click", function () { if (last) sendToChat(last.ok ? resultMessage(last) : "[pyrun error]\n```\n" + summary(last, 1800) + "\n```\nPlease fix it."); });
    bFix.addEventListener("click", function () { if (last && !last.ok) sendToChat("[pyrun error]\n```\n" + summary(last, 1800) + "\n```\nThe code failed. Fix it and run it again with a ```pyrun block."); });

    // Auto-run only for a block that arrived live in this session (never when an old chat is reopened), and only once per code.
    var live = window.PHR_LIVE && Date.now() - window.PHR_LIVE < 240000;
    if ((wantAuto || wantReport) && live && !ranBefore(h0)) { markRan(h0); setTimeout(function () { go(true); }, 250); }
  };
})();
