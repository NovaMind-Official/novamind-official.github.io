/* Phraortes learning layer — ```deck (spaced-repetition flashcards with reminders) and ```map (living knowledge map). */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var inline = function (s) { return window.PHR_inline ? window.PHR_inline(s) : esc(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toFa(n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function cfg(root) { try { return decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) { return ""; } }
  function send(t) { if (typeof window.PHR_sendText === "function") return window.PHR_sendText(t); return false; }
  var S = {
    en: { deck: "DECK", map: "MAP", newc: "New", due: "Due", known: "Learned", start: "Review now", none: "Nothing due", next: "Next review", flip: "Tap to flip", again: "Again", hard: "Hard", good: "Good", easy: "Easy", done: "Session complete", rem: "Reminder set for", more: "Add more cards", tip: "Tap a node", got: "Got it", unsure: "Not sure", deeper: "Explain deeper", quiz: "Quiz me", know: "Mastery", min: "min", h: "h", d: "d", left: "left", reset: "Reset deck", ask: "Ask the AI to expand this map" },
    fa: { deck: "فلش‌کارت", map: "نقشه", newc: "جدید", due: "موعد مرور", known: "یادگرفته", start: "شروع مرور", none: "چیزی برای مرور نیست", next: "مرور بعدی", flip: "برای برگرداندن لمس کن", again: "دوباره", hard: "سخت", good: "خوب", easy: "آسان", done: "مرور تمام شد", rem: "یادآور تنظیم شد برای", more: "کارت بیشتر", tip: "یک گره را لمس کن", got: "بلدم", unsure: "مطمئن نیستم", deeper: "عمیق‌تر توضیح بده", quiz: "از من بپرس", know: "تسلط", min: "دقیقه", h: "ساعت", d: "روز", left: "مانده", reset: "از اول", ask: "از AI بخواه نقشه را گسترش بدهد" }
  };
  var st = document.createElement("style"); st.id = "phr-learn-css";
  st.textContent =
    ".dk{padding:14px}.dk-sum{display:flex;gap:8px;margin:0 0 14px}.dk-sum div{flex:1;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:9px 10px}.dk-sum b{display:block;font:700 22px 'Inter Tight',sans-serif}.dk-sum small{font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.55}" +
    ".dk-boxes{display:flex;gap:4px;align-items:flex-end;height:46px;margin:0 0 14px}.dk-boxes i{flex:1;background:linear-gradient(180deg,#F4D98B,#C79A3E);border-radius:4px 4px 2px 2px;opacity:.85;min-height:3px;transition:height .5s}" +
    ".dk-n{font-size:13px;opacity:.6;margin:0 0 6px}.dk-prog{height:3px;border-radius:2px;background:rgba(255,255,255,.12);margin:0 0 12px;overflow:hidden}.dk-prog i{display:block;height:100%;background:var(--p,#E2BE6A);transition:width .3s}" +
    ".dk-card{perspective:900px;height:210px;margin:0 0 12px;cursor:pointer;-webkit-tap-highlight-color:transparent}.dk-in{position:relative;width:100%;height:100%;transition:transform .55s cubic-bezier(.2,.8,.2,1);transform-style:preserve-3d}.dk-card.f .dk-in{transform:rotateY(180deg)}" +
    ".dk-f,.dk-b{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:20px;padding:20px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-size:18px;line-height:1.6;font-weight:600;overflow:auto;border:1px solid rgba(255,255,255,.14);background:linear-gradient(160deg,#1a2030,#12161d)}.dk-b{transform:rotateY(180deg);background:linear-gradient(160deg,#2a2412,#171309);border-color:rgba(226,190,106,.4);font-weight:500}.dk-h{position:absolute;bottom:10px;left:0;right:0;text-align:center;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.1em;opacity:.4;text-transform:uppercase}" +
    ".dk-r{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.dk-r button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:inherit;border-radius:13px;padding:10px 4px;font:600 13px inherit;font-family:inherit;cursor:pointer;min-height:46px}.dk-r button small{display:block;font:600 9.5px 'IBM Plex Mono',monospace;opacity:.55;margin-top:2px}.dk-r .a{border-color:rgba(255,107,90,.5)}.dk-r .g{border-color:rgba(88,196,143,.5)}.dk-r .e{border-color:rgba(226,190,106,.6)}" +
    ".dk-bar{display:flex;gap:8px;padding:2px 14px 14px;flex-wrap:wrap;align-items:center}.dk-note{font-size:12.5px;opacity:.65;padding:0 14px 6px;line-height:1.6}" +
    ".mp{padding:6px 8px 0}.mp svg{display:block;width:100%;height:auto;touch-action:manipulation}.mp .e{stroke:rgba(255,255,255,.2);stroke-width:1.5;fill:none;stroke-dasharray:200;stroke-dashoffset:200;animation:mpe .9s ease forwards}@keyframes mpe{to{stroke-dashoffset:0}}" +
    ".mp .n{cursor:pointer;opacity:0;animation:mpn .5s cubic-bezier(.2,.8,.2,1) forwards;transform-box:fill-box;transform-origin:center}@keyframes mpn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}.mp .n rect{fill:#171c24;stroke:rgba(255,255,255,.2);stroke-width:1.3;transition:stroke .25s,fill .25s}.mp .n.c rect{fill:url(#mpg);stroke:none}.mp .n.c text{fill:#1a1206}.mp .n.k rect{stroke:#58C48F;fill:rgba(88,196,143,.12)}.mp .n.u rect{stroke:#ffb44a;fill:rgba(255,180,74,.1)}.mp .n.sel rect{stroke:var(--p,#E2BE6A);stroke-width:2.2}" +
    ".mp text{font:600 11.5px 'Inter Tight','Vazirmatn',sans-serif;fill:#e8ebf0;text-anchor:middle;dominant-baseline:central;pointer-events:none}.mp-d{margin:4px 14px 10px;padding:12px 14px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.03);font-size:14px;line-height:1.7;min-height:56px}.mp-d b{display:block;margin-bottom:3px}.mp-m{display:flex;gap:10px;align-items:center;font:600 11px 'IBM Plex Mono',monospace;padding:0 14px 6px;opacity:.7}.mp-m i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}.mp-m i b{display:block;height:100%;background:#58C48F;transition:width .4s}";
  document.head.appendChild(st);

  /* ================= DECK ================= */
  var IV = [10 * 60e3, 864e5, 3 * 864e5, 7 * 864e5, 16 * 864e5, 35 * 864e5];
  function fmt(ms, T, fa) { var n = function (v) { return fa ? toFa(v) : v; }; if (ms < 36e5) return n(Math.max(1, Math.round(ms / 6e4))) + " " + T.min; if (ms < 864e5) return n(Math.round(ms / 36e5)) + " " + T.h; return n(Math.round(ms / 864e5)) + " " + T.d; }
  W.builders.deck = function (root) {
    var raw = cfg(root), fa = root._lang === "fa", T = S[fa ? "fa" : "en"], num = function (v) { return fa ? toFa(v) : String(v); }, title = "", cards = [];
    raw.replace(/\r/g, "").split("\n").forEach(function (ln) { var m; if ((m = ln.match(/^\s*title\s*:\s*(.*)$/i))) { title = m[1]; return; } m = ln.match(/^\s*(?:card\s*:|[-*]\s+|\d+[.)]\s+)\s*(.+?)\s*(?:::|\|\||=>)\s*(.+)$/i); if (m) cards.push({ f: m[1].trim(), b: m[2].trim() }); });
    if (!cards.length) throw new Error("deck: no cards (use  card: front :: back )");
    var key = "phr_deck_" + hash(title + "|" + cards.map(function (c) { return c.f; }).join("|")), data = {}; try { data = JSON.parse(ls(key) || "{}"); } catch (e) {}
    cards.forEach(function (c) { c.id = hash(c.f); var d = data[c.id]; c.box = d ? d.b : -1; c.due = d ? d.d : 0; });
    function save() { var o = {}; cards.forEach(function (c) { if (c.box >= 0) o[c.id] = { b: c.box, d: c.due }; }); ls(key, JSON.stringify(o)); }
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + T.deck + '</span><span class="phr-w-title">' + esc(title) + '</span></div><div class="dk"></div><div class="dk-bar"></div><div class="dk-note" hidden></div>';
    var body = root.querySelector(".dk"), bar = root.querySelector(".dk-bar"), note = root.querySelector(".dk-note"), queue = [], qi = 0, total = 0;
    function dueList() { var n = Date.now(); return cards.filter(function (c) { return c.box < 0 || c.due <= n; }); }
    function overview() {
      var nw = cards.filter(function (c) { return c.box < 0; }).length, du = dueList().length - nw, kn = cards.filter(function (c) { return c.box >= 4; }).length, boxes = [0, 0, 0, 0, 0, 0]; cards.forEach(function (c) { if (c.box >= 0) boxes[c.box]++; });
      var mx = Math.max(1, Math.max.apply(null, boxes)); var nxt = cards.filter(function (c) { return c.box >= 0 && c.due > Date.now(); }).map(function (c) { return c.due; }).sort()[0];
      body.innerHTML = '<div class="dk-sum"><div><b>' + num(nw) + "</b><small>" + T.newc + "</small></div><div><b>" + num(du) + "</b><small>" + T.due + "</small></div><div><b>" + num(kn) + "</b><small>" + T.known + '</small></div></div><div class="dk-boxes">' + boxes.map(function (v) { return '<i style="height:' + Math.max(7, v / mx * 100) + '%"></i>'; }).join("") + "</div>" + (dueList().length ? "" : '<div class="dk-n">' + T.none + (nxt ? " · " + T.next + ": " + fmt(nxt - Date.now(), T, fa) : "") + "</div>");
      bar.innerHTML = (dueList().length ? '<button class="phr-w-btn gold" data-a="go">' + T.start + " (" + num(dueList().length) + ")</button>" : "") + '<button class="phr-w-btn" data-a="more">' + T.more + '</button><span style="flex:1"></span><button class="phr-w-btn" data-a="reset">' + T.reset + "</button>";
    }
    function session() { queue = dueList().slice(0, 20); qi = 0; total = queue.length; if (!total) return overview(); show(); }
    function show() {
      if (qi >= queue.length) return finish(); var c = queue[qi];
      body.innerHTML = '<div class="dk-prog"><i style="width:' + Math.round(qi / total * 100) + '%"></i></div><div class="dk-card"><div class="dk-in"><div class="dk-f"><div>' + inline(c.f) + '</div><span class="dk-h">' + T.flip + '</span></div><div class="dk-b"><div>' + inline(c.b) + "</div></div></div></div>";
      var cardEl = body.querySelector(".dk-card"); bar.innerHTML = "";
      cardEl.addEventListener("click", function () { if (cardEl.classList.contains("f")) return; cardEl.classList.add("f"); bar.innerHTML = '<div class="dk-r" style="width:100%"><button class="a" data-r="0">' + T.again + "<small>" + fmt(IV[0], T, fa) + '</small></button><button data-r="1">' + T.hard + "<small>" + fmt(IV[Math.max(0, Math.min(5, c.box < 0 ? 0 : c.box))], T, fa) + '</small></button><button class="g" data-r="2">' + T.good + "<small>" + fmt(IV[Math.min(5, (c.box < 0 ? 0 : c.box) + 1)], T, fa) + '</small></button><button class="e" data-r="3">' + T.easy + "<small>" + fmt(IV[Math.min(5, (c.box < 0 ? 0 : c.box) + 2)], T, fa) + "</small></button></div>"; });
    }
    function rate(r) {
      var c = queue[qi], b = c.box < 0 ? 0 : c.box, nb = r === 0 ? 0 : r === 1 ? b : r === 2 ? Math.min(5, b + 1) : Math.min(5, b + 2); c.box = nb; c.due = Date.now() + IV[nb]; if (c.box === 0 && c.due - Date.now() < 12 * 6e4) c.due = Date.now() + IV[0];
      try { window.PHR_learn && window.PHR_learn.answer((title ? title + " " : "") + c.f, r >= 2); } catch (e) {}
      if (r === 0) queue.push(c); save(); qi++; show();
    }
    function finish() {
      save(); var nxt = cards.map(function (c) { return c.due; }).filter(function (d) { return d > Date.now(); }).sort()[0], msg = "";
      body.innerHTML = '<div class="dk-n" style="font-size:17px;opacity:1;font-weight:650;margin:10px 0">✓ ' + T.done + "</div>"; bar.innerHTML = "";
      if (nxt) { try { if (typeof LIFE !== "undefined" && LIFE.add) { var at = Math.max(nxt, Date.now() + 36e5); LIFE.add({ text: (fa ? "مرور فلش‌کارت: " : "Review flashcards: ") + (title || "deck"), kind: "reminder", due: at, src: "deck" }); try { LIFE.askPermission && LIFE.askPermission(); } catch (_) {} msg = T.rem + " " + new Date(at).toLocaleString(fa ? "fa-IR" : undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" }); } } catch (e) {} if (!msg) msg = T.next + ": " + fmt(nxt - Date.now(), T, fa); }
      note.hidden = !msg; note.textContent = msg; setTimeout(overview, 1800);
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || !root.contains(b)) return; var a = b.getAttribute("data-a"), r = b.getAttribute("data-r");
      if (r != null) rate(+r); else if (a === "go") session(); else if (a === "reset") { cards.forEach(function (c) { c.box = -1; c.due = 0; }); save(); overview(); }
      else if (a === "more") send("[deck] Add 8 more cards to the deck \"" + title + "\" on the same topic, avoiding duplicates of these fronts:\n" + cards.slice(0, 30).map(function (c) { return "- " + c.f; }).join("\n") + "\nReturn the full updated ```deck block.");
    });
    overview();
  };

  /* ================= MAP ================= */
  function wrap(t, n) { var w = String(t).split(/\s+/), L = [], cur = ""; w.forEach(function (x) { if ((cur + " " + x).trim().length > n && cur) { L.push(cur); cur = x; } else cur = (cur + " " + x).trim(); }); if (cur) L.push(cur); return L.slice(0, 3); }
  W.builders.map = function (root) {
    var raw = cfg(root), fa = root._lang === "fa", T = S[fa ? "fa" : "en"], title = "", center = "", nodes = [], byId = {};
    raw.replace(/\r/g, "").split("\n").forEach(function (ln) { var m; if ((m = ln.match(/^\s*title\s*:\s*(.*)$/i))) { title = m[1]; return; } if ((m = ln.match(/^\s*center\s*:\s*(.*)$/i))) { center = m[1].trim(); return; }
      if ((m = ln.match(/^\s*(?:node|n)\s*:\s*(.*)$/i))) { var p = m[1].split(/\s\|\s/); if (p.length >= 3) { var o = { id: p[0].trim().toLowerCase(), t: p[1].trim(), p: p[2].trim().toLowerCase(), d: (p[3] || "").trim(), k: [], kids: [] }; nodes.push(o); } } });
    if (!center) center = title || "Map"; if (!nodes.length) throw new Error("map: no nodes (use  node: id | label | parent | explanation )");
    nodes = nodes.slice(0, 28); var rootN = { id: "center", t: center, p: "", d: "", kids: [], depth: 0 }; byId.center = rootN; byId[rootN.id] = rootN; nodes.forEach(function (n) { byId[n.id] = n; });
    nodes.forEach(function (n) { var par = byId[n.p] && byId[n.p] !== n ? byId[n.p] : rootN; n.par = par; par.kids.push(n); }); nodes.forEach(function (n) { var d = 1, q = n.par; while (q && q !== rootN && d < 6) { d++; q = q.par; } n.depth = d; });
    var Wd = 360, H = 400, cx = 0, cy = 0, R = [0, 96, 168, 228, 280]; rootN.x = cx; rootN.y = cy; rootN.a = 0;
    (function lay(n, sector) { var k = n.kids.length; if (!k) return; n.kids.forEach(function (c, i) { var a; if (n === rootN) a = -Math.PI / 2 + 2 * Math.PI * i / k; else { var span = Math.min(sector * .9, .62 * k); a = n.a + (k === 1 ? 0 : (i - (k - 1) / 2) * (span / (k - 1))); } c.a = a; var r = R[Math.min(4, c.depth)]; c.x = cx + Math.cos(a) * r; c.y = cy + Math.sin(a) * r * .9; lay(c, n === rootN ? 2 * Math.PI / k : sector / k); }); })(rootN, 2 * Math.PI);
    var key = "phr_map_" + hash(title + center + nodes.map(function (n) { return n.id; }).join()), mark = {}; try { mark = JSON.parse(ls(key) || "{}"); } catch (e) {}
    function size(n) { var L = wrap(n.t, n === rootN ? 12 : 11), w = Math.max.apply(null, L.map(function (x) { return x.length; })) * 6.4 + 18; return { L: L, w: Math.min(112, Math.max(52, w)), h: L.length * 14 + 12 }; }
    var all = [rootN].concat(nodes); all.forEach(function (n) { n.sz = size(n); }); var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; all.forEach(function (n) { x0 = Math.min(x0, n.x - n.sz.w / 2); x1 = Math.max(x1, n.x + n.sz.w / 2); y0 = Math.min(y0, n.y - n.sz.h / 2); y1 = Math.max(y1, n.y + n.sz.h / 2); }); var vbW = x1 - x0 + 24, vbH = y1 - y0 + 24, svg = '<svg viewBox="' + (x0 - 12).toFixed(1) + " " + (y0 - 12).toFixed(1) + " " + vbW.toFixed(1) + " " + vbH.toFixed(1) + '"><defs><linearGradient id="mpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4D98B"/><stop offset="1" stop-color="#C79A3E"/></linearGradient></defs>';
    nodes.forEach(function (n, i) { svg += '<path class="e" style="animation-delay:' + (i * .04) + 's" d="M' + n.par.x.toFixed(1) + " " + n.par.y.toFixed(1) + " Q" + ((n.par.x + n.x) / 2 + (n.y - n.par.y) * .12).toFixed(1) + " " + ((n.par.y + n.y) / 2 - (n.x - n.par.x) * .12).toFixed(1) + " " + n.x.toFixed(1) + " " + n.y.toFixed(1) + '"/>'; });
    all.forEach(function (n, i) { var s = size(n); n.sz = s; svg += '<g class="n' + (n === rootN ? " c" : "") + '" data-id="' + n.id + '" style="animation-delay:' + (.15 + i * .05) + 's"><rect x="' + (n.x - s.w / 2).toFixed(1) + '" y="' + (n.y - s.h / 2).toFixed(1) + '" width="' + s.w + '" height="' + s.h + '" rx="' + (n === rootN ? 16 : 11) + '"/>' + s.L.map(function (l, j) { return '<text x="' + n.x.toFixed(1) + '" y="' + (n.y - (s.L.length - 1) * 7 + j * 14).toFixed(1) + '">' + esc(l) + "</text>"; }).join("") + "</g>"; });
    svg += "</svg>";
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + T.map + '</span><span class="phr-w-title">' + esc(title) + '</span></div><div class="mp">' + svg + '</div><div class="mp-m"><span>' + T.know + '</span><i><b></b></i><span class="mp-p"></span></div><div class="mp-d"><span style="opacity:.55">' + T.tip + '</span></div><div class="dk-bar" hidden></div>';
    var d = root.querySelector(".mp-d"), bar = root.querySelector(".dk-bar"), cur = null;
    function paint() { root.querySelectorAll(".mp .n").forEach(function (g) { var id = g.getAttribute("data-id"); g.classList.toggle("k", mark[id] === "k"); g.classList.toggle("u", mark[id] === "u"); g.classList.toggle("sel", cur === id); }); var k = nodes.filter(function (n) { return mark[n.id] === "k"; }).length; root.querySelector(".mp-m b").style.width = Math.round(k / nodes.length * 100) + "%"; root.querySelector(".mp-p").textContent = (fa ? toFa(k) : k) + "/" + (fa ? toFa(nodes.length) : nodes.length); }
    root.querySelector(".mp").addEventListener("click", function (e) { var g = e.target.closest(".n"); if (!g) return; cur = g.getAttribute("data-id"); var n = byId[cur]; d.innerHTML = "<b>" + inline(n.t) + "</b>" + (n.d ? inline(n.d) : '<span style="opacity:.55">…</span>'); bar.hidden = false; bar.innerHTML = (n === rootN ? "" : '<button class="phr-w-btn" data-a="k">✓ ' + T.got + '</button><button class="phr-w-btn" data-a="u">? ' + T.unsure + "</button>") + '<button class="phr-w-btn" data-a="x">' + T.deeper + '</button><button class="phr-w-btn gold" data-a="q">' + T.quiz + "</button>"; paint(); });
    bar.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || !cur) return; var a = b.getAttribute("data-a"), n = byId[cur]; if (a === "k" || a === "u") { mark[cur] = mark[cur] === a ? "" : a; ls(key, JSON.stringify(mark)); paint(); try { if (window.PHR_learn) PHR_learn.answer(center + " " + n.t, a === "k"); } catch (_) {} }
      else if (a === "x") send("[map] Explain \"" + n.t + "\" in more depth, in the context of \"" + center + "\". Give one example and one common mistake.");
      else if (a === "q") send("[map] Ask me one question on \"" + n.t + "\" (context: \"" + center + "\") using a ```ask block with report: true."); });
    paint();
  };

  var AL = { deck: "deck", srs: "deck", spaced: "deck", reviewdeck: "deck", map: "map", knowledgemap: "map", mindmap: "map", concept: "map", conceptmap: "map" };
  if (W.ALIAS) Object.keys(AL).forEach(function (k) { W.ALIAS[k] = AL[k]; });
  W.kinds.deck = W.kinds.map = 1;
})();
