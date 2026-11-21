/* Phraortes — Tools menu v3 (toolsmenu.js)
   A compact, searchable replacement for the tools sheet. It reads the real tool tiles (so every tool added by any
   script shows up) and shows them as small cards with: search, "recent" chips, category chips, and shortcuts for
   chat search / pinned messages. Tapping a card runs the original tile, so nothing else has to change. */
(function () {
  "use strict";
  var W = window, D = document, KEY = "phr_tm_use";
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }
  var use = {}; try { use = JSON.parse(LS(KEY) || "{}") } catch (e) { }
  var cat = "all", q = "", built = false, tiles = [];

  function css() {
    if (D.getElementById("tm-css")) return; var s = D.createElement("style"); s.id = "tm-css";
    s.textContent = [
      "#tools-menu.tm3 > .menu-header-label,#tools-menu.tm3 > .tool-group-label,#tools-menu.tm3 > .tools-grid{display:none!important}",
      "#tools-menu.tm3{padding-bottom:calc(10px + env(safe-area-inset-bottom))!important}",
      "#tm2{box-sizing:border-box;width:100%;min-width:0;padding:2px 12px 6px;font-family:'Space Grotesk','Vazirmatn',-apple-system,system-ui,sans-serif}",
      "#tm2 .r1{min-width:0;display:flex;gap:8px;align-items:center}",
      "#tm2 .sb{flex:1;display:flex;align-items:center;gap:9px;height:42px;padding:0 13px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.5)}",
      "#tm2 .sb input{flex:1;min-width:0;background:none;border:0;outline:0;color:#fff;font-weight:500;font-size:15px;line-height:1.2;-webkit-user-select:text;user-select:text}#tm2 .sb input::placeholder{color:rgba(255,255,255,.42)}",
      "#tm2 .sq{flex:none;width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;padding:0}#tm2 .sq:active{transform:scale(.94)}",
      "#tm2 .sq b{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:8px;padding:0 4px;background:var(--p,#E8C468);color:#1a1205;font:800 9.5px/16px inherit;text-align:center}",
      "#tm2 .rc{margin-top:10px;display:none;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}#tm2 .rc.on{display:flex}#tm2 .rc::-webkit-scrollbar{display:none}",
      "#tm2 .rc button{flex:none;display:flex;align-items:center;gap:7px;padding:6px 12px 6px 7px;border-radius:99px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-weight:600;font-size:12.5px;line-height:1.2;cursor:pointer}",
      "#tm2 .rc .mi{width:22px;height:22px;border-radius:50%}#tm2 .rc .mi svg{width:12px;height:12px}",
      "#tm2 .rl{margin:10px 2px 0;font:700 9.5px 'Space Mono',ui-monospace,monospace;letter-spacing:.16em;color:rgba(255,255,255,.38);display:none}#tm2 .rl.on{display:block}",
      "#tm2 .ch{margin-top:10px;display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}#tm2 .ch::-webkit-scrollbar{display:none}",
      "#tm2 .ch button{flex:none;padding:7px 14px;border-radius:99px;border:0;background:rgba(255,255,255,.07);color:rgba(255,255,255,.72);font-weight:600;font-size:12.5px;line-height:1.2;cursor:pointer}#tm2 .ch button.on{background:var(--p,#E8C468);color:#1a1205}",
      "#tm2 .gd{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      "#tm2 .cd{display:flex;align-items:center;gap:10px;padding:9px 10px;min-width:0;border-radius:16px;cursor:pointer;text-align:start;color:#fff;font:inherit;border:1px solid color-mix(in srgb,var(--tc) 30%,transparent);background:linear-gradient(140deg,color-mix(in srgb,var(--tc) 17%,transparent),rgba(255,255,255,.03) 75%);-webkit-tap-highlight-color:transparent}#tm2 .cd:active{transform:scale(.97)}",
      "#tm2 .mi{flex:none;width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--tc);background:color-mix(in srgb,var(--tc) 20%,#0c0b09);border:1px solid color-mix(in srgb,var(--tc) 38%,transparent)}",
      "#tm2 .mi svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}",
      "#tm2 .tx{min-width:0;flex:1}#tm2 .tx b{display:block;font-weight:650;font-size:13.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tm2 .tx small{display:block;margin-top:2px;font-weight:400;font-size:11px;line-height:1.2;color:rgba(255,255,255,.46);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#tm2 .em{grid-column:1/-1;text-align:center;padding:26px 0;color:rgba(255,255,255,.45);font-size:13.5px}",
      "body.light-theme #tm2 .sb,body.light-theme #tm2 .sq{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.1);color:#241c0e}body.light-theme #tm2 .sb input{color:#241c0e}body.light-theme #tm2 .cd,body.light-theme #tm2 .rc button{color:#241c0e}body.light-theme #tm2 .tx small{color:rgba(36,28,14,.55)}body.light-theme #tm2 .ch button{background:rgba(0,0,0,.06);color:#4a3f2a}"
    ].join("\n");
    D.head.appendChild(s);
  }

  function read() {
    var m = D.getElementById("tools-menu"); if (!m) return [];
    var out = [], seen = {};
    [].forEach.call(m.querySelectorAll(".tool-tile"), function (t) {
      var n = (t.querySelector(".tt-n") || {}).textContent; if (!n) return; n = n.trim(); if (seen[n]) return; seen[n] = 1;
      var grid = t.closest(".tools-grid"), lab = grid && grid.previousElementSibling, g = lab && lab.classList.contains("tool-group-label") ? lab.textContent.trim() : "More";
      var st = t.getAttribute("style") || "", mm = /--tile-color:\s*([^;]+)/.exec(st), ic = t.querySelector(".tt-ic");
      out.push({ n: n, s: ((t.querySelector(".tt-s") || {}).textContent || "").trim(), g: g, c: mm ? mm[1].trim() : "#E8C468", i: ic ? ic.innerHTML : "", el: t });
    });
    return out;
  }
  function card(t, small) {
    return '<button type="button" class="cd" style="--tc:' + esc(t.c) + '" data-n="' + esc(t.n) + '"><span class="mi">' + t.i + '</span><span class="tx"><b>' + esc(t.n) + "</b>" + (t.s ? "<small>" + esc(t.s) + "</small>" : "") + "</span></button>";
  }
  function render() {
    var box = D.getElementById("tm2"); if (!box) return;
    tiles = read(); if (!tiles.length) return;
    var fa = D.documentElement.dir === "rtl", groups = []; tiles.forEach(function (t) { if (groups.indexOf(t.g) < 0) groups.push(t.g) });
    if (cat !== "all" && groups.indexOf(cat) < 0) cat = "all";
    var rec = Object.keys(use).filter(function (n) { return tiles.some(function (t) { return t.n === n }) }).sort(function (a, b) { return use[b] - use[a] }).slice(0, 5).map(function (n) { return tiles.filter(function (t) { return t.n === n })[0] });
    var qq = q.trim().toLowerCase(), list = tiles.filter(function (t) { return (cat === "all" || t.g === cat) && (!qq || (t.n + " " + t.s + " " + t.g).toLowerCase().indexOf(qq) >= 0) });
    var pin = D.getElementById("pinned-msgs-count"), pc = pin ? parseInt(pin.textContent, 10) || 0 : 0;
    box.innerHTML = '<div class="r1"><label class="sb"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="tm-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="' + (fa ? "جست‌وجوی ابزار" : "Search tools") + '" value="' + esc(q) + '"></label>' +
      '<button type="button" class="sq" data-a="chat" aria-label="Search this chat"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><circle cx="12" cy="11.5" r="2.6"/><path d="M14 13.5l2 2"/></svg></button>' +
      '<button type="button" class="sq" data-a="pin" aria-label="Pinned messages"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 3.5 5 10 5 10s5-6.5 5-10a5 5 0 0 0-5-5z"/><circle cx="12" cy="7" r="1.8"/><path d="M12 17v5"/></svg>' + (pc ? "<b>" + pc + "</b>" : "") + "</button></div>" +
      (rec.length && !qq && cat === "all" ? '<div class="rl on">' + (fa ? "اخیر" : "RECENT") + '</div><div class="rc on">' + rec.map(function (t) { return '<button type="button" data-n="' + esc(t.n) + '" style="--tc:' + esc(t.c) + '"><span class="mi">' + t.i + "</span>" + esc(t.n) + "</button>" }).join("") + "</div>" : "") +
      '<div class="ch"><button type="button" data-c="all" class="' + (cat === "all" ? "on" : "") + '">' + (fa ? "همه" : "All") + "</button>" + groups.map(function (g) { return '<button type="button" data-c="' + esc(g) + '" class="' + (cat === g ? "on" : "") + '">' + esc(g) + "</button>" }).join("") + "</div>" +
      '<div class="gd">' + (list.length ? list.map(card).join("") : '<div class="em">' + (fa ? "ابزاری پیدا نشد" : "No tool matches") + "</div>") + "</div>";
    var inp = D.getElementById("tm-q"); if (inp) inp.oninput = function () { q = inp.value; var p = inp.selectionStart; render(); var n = D.getElementById("tm-q"); if (n) { n.focus(); try { n.setSelectionRange(p, p) } catch (e) { } } };
  }
  function run(name) {
    var t = tiles.filter(function (x) { return x.n === name })[0]; if (!t) return;
    use[name] = Date.now(); LS(KEY, JSON.stringify(use));
    try { if (typeof W.closeAllDropMenus === "function") W.closeAllDropMenus() } catch (e) { }
    setTimeout(function () { try { t.el.click() } catch (e) { } }, 30);
  }
  function build() {
    var m = D.getElementById("tools-menu"); if (!m) return false;
    css(); if (built && D.getElementById("tm2")) return true;
    var box = D.createElement("div"); box.id = "tm2"; m.appendChild(box); m.classList.add("tm3"); built = true;
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-n],[data-c],[data-a]"); if (!b) return;
      if (b.dataset.n) run(b.dataset.n);
      else if (b.dataset.c) { cat = b.dataset.c; render() }
      else if (b.dataset.a === "chat") { try { W.closeAllDropMenus() } catch (e) { } setTimeout(function () { try { W.openChatSearch() } catch (e) { } }, 30) }
      else if (b.dataset.a === "pin") { try { W.closeAllDropMenus() } catch (e) { } setTimeout(function () { try { W.openPinnedMsgsPanel() } catch (e) { } }, 30) }
    });
    var pend = 0; new MutationObserver(function (ms) { if (pend) return; if (ms.every(function (x) { return box.contains(x.target) })) return; pend = setTimeout(function () { pend = 0; render() }, 200) }).observe(m, { childList: true, subtree: true, characterData: true });
    new MutationObserver(function () { if (m.classList.contains("show")) { q = ""; render() } }).observe(m, { attributes: true, attributeFilter: ["class"] });
    render(); return true;
  }
  W.PHR_TM = { render: render, rebuild: function () { render() } };
  (function wait(n) { if (!build() && n < 80) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
