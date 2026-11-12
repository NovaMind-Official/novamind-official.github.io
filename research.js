/* Phraortes research board — ```board : sources with credibility + claims linked to the evidence that supports them. */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var inline = function (s) { return window.PHR_inline ? window.PHR_inline(s) : esc(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toFa(n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  var S = {
    en: { b: "RESEARCH", src: "Sources", cl: "Claims", all: "All", weak: "Needs evidence", strong: "Well supported", single: "Single source", none: "No source", open: "Open", verify: "Verify weak claims", hi: "High", md: "Medium", lo: "Low", cred: "credibility", n: "sources", c: "claims" },
    fa: { b: "تحقیق", src: "منابع", cl: "ادعاها", all: "همه", weak: "نیاز به شاهد", strong: "پشتوانه قوی", single: "یک منبع", none: "بدون منبع", open: "باز کردن", verify: "راستی‌آزمایی موارد ضعیف", hi: "بالا", md: "متوسط", lo: "پایین", cred: "اعتبار", n: "منبع", c: "ادعا" }
  };
  var st = document.createElement("style"); st.id = "phr-board-css";
  st.textContent = ".rb{padding:14px 14px 4px}.rb-sum{display:flex;gap:8px;margin:0 0 12px}.rb-sum div{flex:1;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px}.rb-sum b{display:block;font:700 18px 'Inter Tight',sans-serif}.rb-sum small{font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.55}" +
    ".rb-tabs{display:flex;gap:6px;margin:0 0 10px}.rb-tabs button{border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;border-radius:20px;padding:6px 13px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;min-height:32px}.rb-tabs button.on{border-color:var(--p,#E2BE6A);color:var(--p,#E2BE6A)}" +
    ".rb-h{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;opacity:.55;margin:14px 0 8px}.rb-c{padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;margin:0 0 8px;background:rgba(255,255,255,.03);font-size:14px;line-height:1.65}.rb-c.w{border-color:rgba(255,138,90,.45)}.rb-c.n{border-color:rgba(255,107,90,.6);background:rgba(255,107,90,.06)}" +
    ".rb-st{font:700 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.rb-st em{font-style:normal;color:#58C48F}.rb-c.w .rb-st em{color:#ffb44a}.rb-c.n .rb-st em{color:#ff6b5a}.rb-chip{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:inherit;border-radius:8px;padding:2px 8px;font:600 11px 'IBM Plex Mono',monospace;cursor:pointer}.rb-chip:active{background:rgba(226,190,106,.2)}" +
    ".rb-s{display:flex;gap:11px;padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;margin:0 0 8px;background:rgba(255,255,255,.03);transition:border-color .3s,background .3s}.rb-s.hl{border-color:var(--p,#E2BE6A);background:rgba(226,190,106,.09)}.rb-id{flex:none;width:28px;height:28px;border-radius:9px;background:rgba(255,255,255,.08);display:grid;place-items:center;font:700 11px 'IBM Plex Mono',monospace}.rb-b{flex:1;min-width:0}.rb-t{font-weight:650;font-size:14px;line-height:1.5}.rb-d{font:11px 'IBM Plex Mono',monospace;opacity:.55;direction:ltr;text-align:start;margin-top:2px;word-break:break-all}.rb-q{font-size:12.5px;line-height:1.6;opacity:.8;margin-top:6px;padding-inline-start:9px;border-inline-start:2px solid rgba(255,255,255,.2)}" +
    ".rb-cr{display:inline-block;font:700 9.5px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:7px;margin-top:6px}.rb-cr.h{background:rgba(88,196,143,.16);color:#58C48F}.rb-cr.m{background:rgba(255,180,74,.15);color:#ffb44a}.rb-cr.l{background:rgba(255,107,90,.15);color:#ff6b5a}.rb-bar{display:flex;gap:8px;padding:4px 14px 14px;flex-wrap:wrap}";
  document.head.appendChild(st);
  function dom(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }
  W.builders.board = function (root) {
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var fa = root._lang === "fa", T = S[fa ? "fa" : "en"], title = "", srcs = {}, order = [], claims = [];
    raw.replace(/\r/g, "").split("\n").forEach(function (ln) {
      var m;
      if ((m = ln.match(/^\s*title\s*:\s*(.*)$/i))) { title = m[1]; return; }
      if ((m = ln.match(/^\s*(s\d+)\s*:\s*(.*)$/i))) { var p = m[2].split(/\s\|\s/), url = (p[1] || "").trim(); if (!/^https?:\/\//i.test(url)) url = ""; var c = (p[2] || "").trim().toLowerCase(); srcs[m[1].toLowerCase()] = { id: m[1].toLowerCase(), t: p[0].trim(), url: url, cr: /^h/.test(c) ? "h" : /^l/.test(c) ? "l" : "m", q: (p[3] || "").trim().replace(/^["“]|["”]$/g, "") }; order.push(m[1].toLowerCase()); return; }
      if ((m = ln.match(/^\s*(?:claim|c)\s*:\s*(.*?)(?:\s*(?:->|→)\s*(.*))?$/i))) { var ids = (m[2] || "").split(/[,\s]+/).map(function (x) { return x.toLowerCase(); }).filter(function (x) { return srcs[x] || /^s\d+$/.test(x); }); claims.push({ t: m[1].trim(), ids: ids }); }
    });
    if (!order.length && !claims.length) throw new Error("board: no sources");
    claims.forEach(function (c) { c.ids = c.ids.filter(function (x) { return srcs[x]; }); c.lv = c.ids.length >= 2 ? "s" : c.ids.length === 1 ? "w" : "n"; });
    var nw = claims.filter(function (c) { return c.lv !== "s"; }).length, num = function (v) { return fa ? toFa(v) : String(v); }, filt = "all";
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + T.b + '</span><span class="phr-w-title">' + esc(title) + '</span></div><div class="rb"><div class="rb-sum"><div><b>' + num(order.length) + "</b><small>" + T.n + "</small></div><div><b>" + num(claims.length) + "</b><small>" + T.c + '</small></div><div><b style="color:' + (nw ? "#ffb44a" : "#58C48F") + '">' + num(nw) + "</b><small>" + T.weak + '</small></div></div><div class="rb-tabs"><button class="on" data-f="all">' + T.all + '</button><button data-f="weak">' + T.weak + '</button></div><div class="rb-cl"></div><div class="rb-h">' + T.src + '</div><div class="rb-sl"></div></div>' + (nw ? '<div class="rb-bar"><button class="phr-w-btn gold" data-a="v">' + T.verify + "</button></div>" : "");
    var cl = root.querySelector(".rb-cl"), sl = root.querySelector(".rb-sl");
    function paintC() { cl.innerHTML = claims.filter(function (c) { return filt === "all" || c.lv !== "s"; }).map(function (c) { return '<div class="rb-c ' + (c.lv === "s" ? "" : c.lv) + '"><div>' + inline(c.t) + '</div><div class="rb-st"><em>' + (c.lv === "s" ? "● " + T.strong : c.lv === "w" ? "◐ " + T.single : "○ " + T.none) + "</em>" + c.ids.map(function (x) { return '<button class="rb-chip" data-s="' + x + '">' + x.toUpperCase() + "</button>"; }).join("") + "</div></div>"; }).join(""); }
    sl.innerHTML = order.map(function (id) { var s = srcs[id], cnt = claims.filter(function (c) { return c.ids.indexOf(id) >= 0; }).length; return '<div class="rb-s" data-id="' + id + '"><span class="rb-id">' + id.toUpperCase() + '</span><div class="rb-b"><div class="rb-t">' + inline(s.t) + "</div>" + (s.url ? '<div class="rb-d">' + esc(dom(s.url)) + "</div>" : "") + (s.q ? '<div class="rb-q">' + inline(s.q) + "</div>" : "") + '<span class="rb-cr ' + s.cr + '">' + (s.cr === "h" ? T.hi : s.cr === "l" ? T.lo : T.md) + " " + T.cred + "</span>" + (s.url ? ' <button class="rb-chip" data-u="' + esc(s.url) + '">' + T.open + " ↗</button>" : "") + "</div></div>"; }).join("");
    paintC();
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || !root.contains(b)) return;
      if (b.hasAttribute("data-f")) { filt = b.getAttribute("data-f"); root.querySelectorAll(".rb-tabs button").forEach(function (x) { x.classList.toggle("on", x === b); }); paintC(); }
      else if (b.hasAttribute("data-s")) { var el = sl.querySelector('[data-id="' + b.getAttribute("data-s") + '"]'); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("hl"); setTimeout(function () { el.classList.remove("hl"); }, 1600); } }
      else if (b.hasAttribute("data-u")) window.open(b.getAttribute("data-u"), "_blank", "noopener");
      else if (b.getAttribute("data-a") === "v") { var list = claims.filter(function (c) { return c.lv !== "s"; }).map(function (c, i) { return (i + 1) + ". " + c.t; }).join("\n"); if (typeof window.PHR_sendText === "function") window.PHR_sendText("[board] Verify these weak claims: search for independent sources for each, and return an updated ```board block (keep the strong ones, add new sources, and clearly drop or flag what you cannot support):\n" + list); }
    });
  };
  var AL = { board: "board", sources: "board", evidence: "board", researchboard: "board" };
  if (W.ALIAS) Object.keys(AL).forEach(function (k) { W.ALIAS[k] = AL[k]; });
  W.kinds.board = 1;
})();
