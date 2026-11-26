/* projmem.js — Project memory.
   A project = name + standing instructions + reference files + pinned decisions. A chat can be attached to a project; from then on
   every reply is generated with that context (instructions + pins always, the most relevant file excerpts per message).
   Storage: localStorage "phr_projects"; the link is chat.projectId. */
(function () {
  "use strict";
  if (window.__projmem) return; window.__projmem = 1;
  var KEY = "phr_projects", D = document;
  function G(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function all() { try { var a = JSON.parse(ls(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function put(a) { ls(KEY, JSON.stringify(a)); }
  function get(id) { return all().filter(function (p) { return p.id === id; })[0] || null; }
  function upd(id, fn) { var a = all(), p = a.filter(function (x) { return x.id === id; })[0]; if (!p) return null; fn(p); p.ts = Date.now(); put(a); return p; }
  function chat() { var C = G("chats") || [], id = G("curId"); for (var i = 0; i < C.length; i++) if (C[i].id == id) return C[i]; return null; }
  function persist() { try { if (typeof window.save === "function") window.save(); else if (G("save")) G("save")(); } catch (e) {} }
  function fa() { var c = chat(), s = (c && (c.name + " " + ((c.msgs || []).slice(-1)[0] || {}).uText)) || ""; return /[؀-ۿ]/.test(s); }
  var S = {
    en: { title: "Projects", sub: "Memory that stays with a piece of work", newp: "New project", name: "Project name", instr: "Standing instructions", instrPh: "e.g. Always answer as a senior backend engineer. Stack: Node + Postgres. Keep answers short.", files: "Reference files", addf: "Add files", pins: "Pinned decisions", pinPh: "Pin a decision, e.g. “We use PostgreSQL, not MongoDB”", add: "Add", attach: "Use in this chat", detach: "Detach from chat", attached: "Attached to this chat", del: "Delete project", back: "Back", none: "No projects yet — create one to give a chat lasting memory.", fromChat: "Pin from recent replies", empty: "Nothing yet", chars: "chars", created: "Project created", pinned: "Pinned to project", tools: "Projects", tsub: "Memory for your work", confirm: "Delete this project and its memory?", nofile: "Could not read that file" },
    fa: { title: "پروژه‌ها", sub: "حافظه‌ای که با کار تو می‌ماند", newp: "پروژه جدید", name: "نام پروژه", instr: "دستورهای ثابت", instrPh: "مثلاً: همیشه مثل یک مهندس ارشد بک‌اند جواب بده. استک: Node + Postgres. کوتاه بگو.", files: "فایل‌های مرجع", addf: "افزودن فایل", pins: "تصمیم‌های پین‌شده", pinPh: "یک تصمیم پین کن، مثل «از PostgreSQL استفاده می‌کنیم»", add: "افزودن", attach: "استفاده در این چت", detach: "جدا کردن از چت", attached: "به این چت وصل است", del: "حذف پروژه", back: "بازگشت", none: "هنوز پروژه‌ای نیست — یکی بساز تا چت حافظه ماندگار بگیرد.", fromChat: "پین از پاسخ‌های اخیر", empty: "هنوز چیزی نیست", chars: "نویسه", created: "پروژه ساخته شد", pinned: "به پروژه پین شد", tools: "پروژه‌ها", tsub: "حافظه برای کارت", confirm: "این پروژه و حافظه‌اش حذف شود؟", nofile: "فایل خوانده نشد" }
  };
  function T(k) { return (S[fa() ? "fa" : "en"][k]) || S.en[k] || k; }

  /* ------------------------------------------------ prompt injection */
  var STOP = /^(the|and|for|with|that|this|from|you|are|was|how|what|برای|این|که|را|از|با|در|به|و|یا)$/i;
  function words(s) { return String(s || "").toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter(function (w) { return w.length > 2 && !STOP.test(w); }); }
  function excerpt(file, qw, budget) {
    var t = String(file.t || ""); if (t.length <= budget) return t;
    var paras = t.split(/\n{2,}|(?<=\.)\s+(?=[A-Z])/), sc = paras.map(function (p, i) { var pw = words(p), s = 0; qw.forEach(function (w) { if (pw.indexOf(w) >= 0) s++; }); return { p: p, i: i, s: s }; });
    sc.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    var out = [], used = 0; for (var k = 0; k < sc.length && used < budget; k++) { var p = sc[k].p.slice(0, Math.min(900, budget - used)); out.push(sc[k]); used += p.length; }
    out.sort(function (a, b) { return a.i - b.i; }); return out.map(function (x) { return x.p.slice(0, 900); }).join("\n…\n").slice(0, budget);
  }
  function block(p, query) {
    if (!p) return "";
    var qw = words(query), h = "\n\nPROJECT MEMORY — the user is working inside the project “" + p.name + "”. Treat everything below as standing context for this whole chat; stay consistent with it and never contradict a pinned decision without saying so.";
    if (p.instr) h += "\nStanding instructions: " + p.instr.slice(0, 2000);
    if (p.pins && p.pins.length) h += "\nPinned decisions:\n" + p.pins.slice(-30).map(function (x, i) { return (i + 1) + ". " + x.t; }).join("\n").slice(0, 2500);
    var left = 5000, fs = (p.files || []).slice().map(function (f) { var fw = words(f.n + " " + f.t.slice(0, 1500)), s = 0; qw.forEach(function (w) { if (fw.indexOf(w) >= 0) s++; }); return { f: f, s: s }; }).sort(function (a, b) { return b.s - a.s; });
    fs.forEach(function (x) { if (left < 300) return; var per = Math.min(left, Math.max(600, Math.floor(left / Math.max(1, fs.length)))); var e = excerpt(x.f, qw, per); left -= e.length; h += "\n--- reference file: " + x.f.n + " ---\n" + e; });
    h += "\nIf a decision made in this chat is clearly important and lasting, you may end with one line “📌 Decision: …” so the user can pin it.";
    return h;
  }
  function currentBlock(txt) { var c = chat(); if (!c || !c.projectId) return ""; return block(get(c.projectId), txt); }
  function wrapGuide() {
    var old = window.stemGuide; if (typeof old !== "function" || old.__pm) return false;
    var w = function (c, txt) { var g = ""; try { g = old.apply(this, arguments); } catch (e) { g = ""; } try { g += currentBlock(txt); } catch (e) {} return g; };
    w.__pm = 1; window.stemGuide = w; return true;
  }
  if (!wrapGuide()) { var n = 0, t = setInterval(function () { if (wrapGuide() || ++n > 60) clearInterval(t); }, 500); }

  /* ------------------------------------------------ UI */
  var CSS = "#pm-chip{display:none;align-items:center;gap:7px;margin:0 auto 6px;max-width:760px;width:fit-content;padding:5px 12px 5px 9px;border-radius:99px;border:1px solid rgba(244,217,139,.35);background:rgba(244,217,139,.1);color:#F4D98B;font:600 12px 'Space Grotesk','Vazirmatn',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}#pm-chip.on{display:flex}#pm-chip svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}" +
    "#pm-sh{position:fixed;inset:0;z-index:10050;display:none}#pm-sh.on{display:block}#pm-sh .bd{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;transition:opacity .3s}#pm-sh.on .bd{opacity:1}" +
    "#pm-sh .pn{position:absolute;left:0;right:0;bottom:0;max-width:640px;margin:0 auto;max-height:88vh;display:flex;flex-direction:column;border-radius:26px 26px 0 0;background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.03)),rgba(20,16,11,.92);-webkit-backdrop-filter:blur(26px) saturate(1.6);backdrop-filter:blur(26px) saturate(1.6);border:1px solid rgba(255,255,255,.11);border-bottom:0;box-shadow:0 -24px 60px rgba(0,0,0,.55);transform:translateY(100%);transition:transform .42s cubic-bezier(.32,.72,0,1);color:#F4EBDD;font-family:'Space Grotesk','Vazirmatn',sans-serif;padding-bottom:env(safe-area-inset-bottom)}#pm-sh.on .pn{transform:none}" +
    "#pm-sh .gr{width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.22);margin:9px auto 4px}#pm-sh .hd{display:flex;align-items:center;gap:10px;padding:8px 18px 10px}#pm-sh .hd b{font-size:19px;letter-spacing:-.01em}#pm-sh .hd small{display:block;opacity:.55;font-size:12px;margin-top:2px}#pm-sh .hd .sp{flex:1}#pm-sh .x{width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:#fff;font-size:15px;cursor:pointer}" +
    "#pm-sh .bd2{overflow:auto;padding:4px 16px 18px;-webkit-overflow-scrolling:touch}#pm-sh .it{display:flex;align-items:center;gap:12px;padding:13px 14px;margin:8px 0;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);cursor:pointer}#pm-sh .it .ic{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(244,217,139,.14);color:#F4D98B;font-weight:800}#pm-sh .it .tx{flex:1;min-width:0}#pm-sh .it b{display:block;font-size:14.5px}#pm-sh .it small{opacity:.55;font-size:11.5px}#pm-sh .it .ok{color:#7be0ae;font-size:11px;font-weight:700}" +
    "#pm-sh label{display:block;margin:16px 2px 6px;font:700 10.5px 'Space Mono',monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.5}#pm-sh input[type=text],#pm-sh textarea{width:100%;box-sizing:border-box;padding:12px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font:15px/1.55 inherit;outline:0;-webkit-user-select:text;user-select:text}#pm-sh textarea{min-height:92px;resize:vertical}" +
    "#pm-sh .row{display:flex;gap:8px;align-items:center}#pm-sh .row>input{flex:1}#pm-sh .bt{flex:none;padding:11px 16px;border-radius:13px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#fff;font:600 13.5px inherit;cursor:pointer}#pm-sh .bt.g{background:linear-gradient(135deg,#F4D98B,#C79A3E);color:#1a1206;border-color:transparent}#pm-sh .bt.r{color:#ff8d7f;border-color:rgba(255,107,90,.35)}" +
    "#pm-sh .li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;margin:6px 0;border-radius:14px;background:rgba(255,255,255,.045);font-size:13.5px;line-height:1.55}#pm-sh .li span{flex:1;min-width:0;word-break:break-word}#pm-sh .li button{flex:none;border:0;background:none;color:rgba(255,255,255,.5);font-size:16px;cursor:pointer;padding:0 4px}#pm-sh .li small{display:block;opacity:.5;font-size:11px}" +
    "#pm-sh .em{padding:22px 8px;text-align:center;opacity:.5;font-size:13.5px;line-height:1.7}body.light-theme #pm-sh .pn{background:rgba(255,251,243,.94);color:#241c0e;border-color:rgba(60,45,20,.12)}body.light-theme #pm-sh input,body.light-theme #pm-sh textarea{color:#241c0e;background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12)}body.light-theme #pm-sh .it,body.light-theme #pm-sh .li{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.08)}body.light-theme #pm-sh .bt{color:#241c0e;background:rgba(0,0,0,.05)}body.light-theme #pm-sh .x{color:#241c0e;background:rgba(0,0,0,.07)}" +
    "@media(prefers-reduced-motion:reduce){#pm-sh .pn,#pm-sh .bd{transition:none}}";
  var st = D.createElement("style"); st.id = "pm-css"; st.textContent = CSS; D.head.appendChild(st);

  var sh = null, view = "list", curP = null;
  function ensure() {
    if (sh) return;
    sh = D.createElement("div"); sh.id = "pm-sh"; sh.innerHTML = '<div class="bd"></div><div class="pn" role="dialog" aria-modal="true"><div class="gr"></div><div class="hd"></div><div class="bd2"></div></div>';
    D.body.appendChild(sh); sh.querySelector(".bd").addEventListener("click", close);
    sh.addEventListener("click", onClick); sh.addEventListener("input", onInput); sh.addEventListener("change", onChange);
  }
  function open(id) { ensure(); curP = id || null; view = id ? "edit" : "list"; paint(); sh.classList.add("on"); try { D.body.classList.add("phr-recede"); } catch (e) {} }
  function close() { if (!sh) return; sh.classList.remove("on"); try { D.body.classList.remove("phr-recede"); } catch (e) {} chip(); }
  function toast(m) { try { window.showToast(m); } catch (e) {} }

  function paint() {
    var hd = sh.querySelector(".hd"), bd = sh.querySelector(".bd2"), c = chat();
    if (view === "list") {
      hd.innerHTML = '<div><b>' + esc(T("title")) + '</b><small>' + esc(T("sub")) + '</small></div><span class="sp"></span><button class="x" data-a="close">✕</button>';
      var a = all(); bd.innerHTML = '<div class="row" style="margin:6px 0 10px"><input type="text" data-r="newname" placeholder="' + esc(T("name")) + '"><button class="bt g" data-a="create">' + esc(T("newp")) + '</button></div>' +
        (a.length ? a.map(function (p) { return '<div class="it" data-a="edit" data-id="' + p.id + '"><div class="ic">' + esc((p.name || "?").trim().charAt(0).toUpperCase()) + '</div><div class="tx"><b>' + esc(p.name) + '</b><small>' + (p.files || []).length + " files · " + (p.pins || []).length + " pins</small></div>" + (c && c.projectId === p.id ? '<span class="ok">● ' + esc(T("attached")) + "</span>" : "") + "</div>"; }).join("") : '<div class="em">' + esc(T("none")) + "</div>");
    } else {
      var p = get(curP); if (!p) { view = "list"; return paint(); }
      var on = c && c.projectId === p.id;
      hd.innerHTML = '<button class="x" data-a="back">‹</button><div style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.name) + '</b></div><button class="bt ' + (on ? "" : "g") + '" data-a="' + (on ? "detach" : "attach") + '">' + esc(on ? T("detach") : T("attach")) + '</button><button class="x" data-a="close">✕</button>';
      var recent = ((c && c.msgs) || []).filter(function (m) { return m.aRaw; }).slice(-5).reverse();
      bd.innerHTML = '<label>' + esc(T("name")) + '</label><input type="text" data-r="name" value="' + esc(p.name) + '">' +
        '<label>' + esc(T("instr")) + '</label><textarea data-r="instr" placeholder="' + esc(T("instrPh")) + '">' + esc(p.instr || "") + '</textarea>' +
        '<label>' + esc(T("pins")) + '</label>' + ((p.pins || []).length ? p.pins.map(function (x, i) { return '<div class="li"><span>📌 ' + esc(x.t) + '</span><button data-a="unpin" data-i="' + i + '">✕</button></div>'; }).join("") : '<div class="em" style="padding:8px">' + esc(T("empty")) + "</div>") +
        '<div class="row" style="margin-top:8px"><input type="text" data-r="pin" placeholder="' + esc(T("pinPh")) + '"><button class="bt" data-a="addpin">' + esc(T("add")) + '</button></div>' +
        (recent.length ? '<label>' + esc(T("fromChat")) + '</label>' + recent.map(function (m, i) { var tx = String(m.aRaw).replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim().slice(0, 130); return '<div class="li"><span>' + esc(tx) + '</span><button data-a="pinmsg" data-i="' + i + '" title="Pin">📌</button></div>'; }).join("") : "") +
        '<label>' + esc(T("files")) + '</label>' + ((p.files || []).length ? p.files.map(function (f, i) { return '<div class="li"><span>' + esc(f.n) + "<small>" + f.t.length + " " + esc(T("chars")) + '</small></span><button data-a="rmfile" data-i="' + i + '">✕</button></div>'; }).join("") : '<div class="em" style="padding:8px">' + esc(T("empty")) + "</div>") +
        '<div class="row" style="margin-top:8px"><button class="bt" data-a="addfile">' + esc(T("addf")) + '</button><input type="file" data-r="file" multiple accept=".txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.xml,.yml,.yaml,.sql,.log,.java,.c,.cpp,.go,.rs,.php,.sh,text/*" style="display:none"></div>' +
        '<div class="row" style="margin-top:22px"><button class="bt r" data-a="delete">' + esc(T("del")) + "</button></div>";
    }
  }
  var ft = 0;
  function onInput(e) {
    var r = e.target.getAttribute("data-r"); if (!curP || (r !== "name" && r !== "instr")) return;
    clearTimeout(ft); ft = setTimeout(function () { upd(curP, function (p) { if (r === "name") p.name = e.target.value.trim() || p.name; else p.instr = e.target.value; }); chip(); }, 350);
  }
  function onChange(e) {
    if (e.target.getAttribute("data-r") !== "file" || !curP) return;
    var fs = [].slice.call(e.target.files || []), left = fs.length; if (!left) return;
    fs.forEach(function (f) {
      var rd = new FileReader(); rd.onload = function () { var t = String(rd.result || ""); if (/\u0000/.test(t.slice(0, 2000))) toast(T("nofile")); else upd(curP, function (p) { p.files = (p.files || []).concat([{ n: f.name, t: t.slice(0, 60000) }]); }); if (--left === 0) paint(); };
      rd.onerror = function () { toast(T("nofile")); if (--left === 0) paint(); }; rd.readAsText(f);
    });
    e.target.value = "";
  }
  function onClick(e) {
    var b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a"), id = b.getAttribute("data-id"), i = +b.getAttribute("data-i"), c = chat();
    if (a === "close") close();
    else if (a === "back") { view = "list"; paint(); }
    else if (a === "create") { var inp = sh.querySelector('[data-r="newname"]'), nm = (inp.value || "").trim() || "Project " + (all().length + 1), p = { id: uid(), name: nm.slice(0, 60), instr: "", files: [], pins: [], ts: Date.now() }; var L = all(); L.unshift(p); put(L); curP = p.id; view = "edit"; paint(); toast(T("created")); }
    else if (a === "edit") { curP = id; view = "edit"; paint(); }
    else if (a === "attach") { if (c) { c.projectId = curP; persist(); } paint(); chip(); }
    else if (a === "detach") { if (c) { delete c.projectId; persist(); } paint(); chip(); }
    else if (a === "addpin") { var pi = sh.querySelector('[data-r="pin"]'), v = (pi.value || "").trim(); if (!v) return; upd(curP, function (p) { (p.pins = p.pins || []).push({ t: v.slice(0, 400), ts: Date.now() }); }); paint(); toast(T("pinned")); }
    else if (a === "pinmsg") { var recent = ((c && c.msgs) || []).filter(function (m) { return m.aRaw; }).slice(-5).reverse(), m = recent[i]; if (!m) return; var tx = String(m.aRaw).replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim().slice(0, 300); upd(curP, function (p) { (p.pins = p.pins || []).push({ t: tx, ts: Date.now() }); }); paint(); toast(T("pinned")); }
    else if (a === "unpin") { upd(curP, function (p) { p.pins.splice(i, 1); }); paint(); }
    else if (a === "rmfile") { upd(curP, function (p) { p.files.splice(i, 1); }); paint(); }
    else if (a === "addfile") sh.querySelector('[data-r="file"]').click();
    else if (a === "delete") { if (!window.confirm(T("confirm"))) return; put(all().filter(function (p) { return p.id !== curP; })); (G("chats") || []).forEach(function (x) { if (x.projectId === curP) delete x.projectId; }); persist(); view = "list"; curP = null; paint(); chip(); }
  }

  /* chip above the composer */
  function chip() {
    var el = D.getElementById("pm-chip"), bar = D.getElementById("main-input-bar");
    if (!el) { if (!bar) return; el = D.createElement("div"); el.id = "pm-chip"; el.setAttribute("role", "button"); el.addEventListener("click", function (e) { e.stopPropagation(); var c = chat(); open(c && c.projectId); }); bar.parentNode.insertBefore(el, bar); }
    var c = chat(), p = c && c.projectId ? get(c.projectId) : null;
    if (c && c.projectId && !p) { delete c.projectId; persist(); }
    el.classList.toggle("on", !!p); if (p) el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' + esc(p.name);
  }
  function tile() {
    var g = D.querySelector("#tools-menu .tools-grid"); if (!g || g.querySelector("[data-pm]")) return !!g;
    var t = D.createElement("div"); t.className = "tool-tile"; t.setAttribute("data-pm", "1"); t.style.setProperty("--tile-color", "#E8C468");
    t.innerHTML = '<i class="tt-ic"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></i><span class="tt-n">' + esc(T("tools")) + '</span><small class="tt-s">' + esc(T("tsub")) + "</small>";
    t.addEventListener("click", function () { try { window.closeAllDropMenus && window.closeAllDropMenus(); } catch (e) {} var c = chat(); open(c && c.projectId); });
    g.insertBefore(t, g.firstChild); return true;
  }
  function boot() { chip(); tile(); }
  if (D.readyState !== "loading") boot(); else D.addEventListener("DOMContentLoaded", boot);
  var tries = 0, iv = setInterval(function () { boot(); if (++tries > 20) clearInterval(iv); }, 800);
  // keep chip in sync when the user switches chats
  var last = null; setInterval(function () { var c = chat(), id = c && c.id + ":" + c.projectId; if (id !== last) { last = id; chip(); } }, 900);

  window.PHR_PROJ = { open: open, all: all, get: get, block: block, current: function () { var c = chat(); return c && c.projectId ? get(c.projectId) : null; }, addPin: function (t) { var c = chat(); if (!c || !c.projectId) return false; upd(c.projectId, function (p) { (p.pins = p.pins || []).push({ t: String(t).slice(0, 400), ts: Date.now() }); }); return true; } };
})();
