/* Phraortes — voice whiteboard (board.js)
   Say / type: "open the board, draw a straight line, then a circle under it, then a cube" — it draws live, one by one. */
(function () {
  "use strict";
  var W_ = window, D = document, TAU = Math.PI * 2;
  var S = { open: false, shapes: [], q: [], busy: false, cur: null, W: 0, H: 0, dpr: 1, ov: null, cv: null, cx: null, free: null, hint: null, raf: 0 };

  /* ───────── geometry ───────── */
  function arc(cx, cy, rx, ry, a0, a1, n) { var p = [], i, t; n = n || 48; for (i = 0; i <= n; i++) { t = a0 + (a1 - a0) * i / n; p.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]) } return p }
  function poly(pts, close) { var p = pts.slice(); if (close) p.push(pts[0]); return p }
  function ring(n, R, rot) { var p = [], i; for (i = 0; i < n; i++) p.push([R * Math.cos(rot + i * TAU / n), R * Math.sin(rot + i * TAU / n)]); return p }
  function head(x1, y1, x2, y2, k) { var a = Math.atan2(y2 - y1, x2 - x1); return [[x2 - k * Math.cos(a - .45), y2 - k * Math.sin(a - .45)], [x2, y2], [x2 - k * Math.cos(a + .45), y2 - k * Math.sin(a + .45)]] }
  function sc(pts, s) { return pts.map(function (q) { return [q[0] * s, q[1] * s] }) }

  function build(k, s, o) {
    var L = [], m = function (pts, opt) { opt = opt || {}; opt.p = pts; L.push(opt) }, R, a, d, i, p;
    switch (k) {
      case "line":
        if (o.dir === "v") m([[0, -1.2 * s], [0, 1.2 * s]]); else if (o.dir === "d") m([[-1.2 * s, 1.2 * s], [1.2 * s, -1.2 * s]]); else m([[-1.6 * s, 0], [1.6 * s, 0]]); break;
      case "arrow":
        if (o.dir === "v") { m([[0, 1.2 * s], [0, -1.2 * s]]); m(head(0, 1.2 * s, 0, -1.2 * s, .3 * s)) } else if (o.dir === "d") { m([[-1.2 * s, 1.2 * s], [1.2 * s, -1.2 * s]]); m(head(-1.2 * s, 1.2 * s, 1.2 * s, -1.2 * s, .3 * s)) } else { m([[-1.6 * s, 0], [1.6 * s, 0]]); m(head(-1.6 * s, 0, 1.6 * s, 0, .3 * s)) } break;
      case "circle": R = .8 * s; m(arc(0, 0, R, R, 0, TAU, 72), { f: 1 }); break;
      case "ellipse": m(arc(0, 0, 1.2 * s, .7 * s, 0, TAU, 72), { f: 1 }); break;
      case "rect": m(poly([[-1.1 * s, -.7 * s], [1.1 * s, -.7 * s], [1.1 * s, .7 * s], [-1.1 * s, .7 * s]], 1), { f: 1 }); break;
      case "square": a = .8 * s; m(poly([[-a, -a], [a, -a], [a, a], [-a, a]], 1), { f: 1 }); break;
      case "triangle": m(poly([[0, -.8 * s], [.92 * s, .78 * s], [-.92 * s, .78 * s]], 1), { f: 1 }); break;
      case "diamond": m(poly([[0, -1 * s], [.7 * s, 0], [0, 1 * s], [-.7 * s, 0]], 1), { f: 1 }); break;
      case "pentagon": m(poly(ring(5, .9 * s, -Math.PI / 2), 1), { f: 1 }); break;
      case "hexagon": m(poly(ring(6, .9 * s, 0), 1), { f: 1 }); break;
      case "star": p = []; for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; d = i % 2 ? .38 * s : .95 * s; p.push([d * Math.cos(a), d * Math.sin(a)]) } m(poly(p, 1), { f: 1 }); break;
      case "heart": p = []; for (i = 0; i <= 80; i++) { a = i * TAU / 80; p.push([16 * Math.pow(Math.sin(a), 3) * .055 * s, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * .055 * s]) } m(p, { f: 1 }); break;
      case "cube": a = 1.25 * s; d = .5 * a;
        m(poly([[0, d], [a, d], [a, d + a], [0, d + a]], 1), { f: 1 });
        m([[0, d], [d, 0], [a + d, 0], [a + d, a], [a, d + a]]); m([[a, d], [a + d, 0]]);
        m([[d, 0], [d, a], [a + d, a]], { dash: 1 }); m([[0, d + a], [d, a]], { dash: 1 }); break;
      case "sphere": R = .85 * s; m(arc(0, 0, R, R, 0, TAU, 72), { f: 1 }); m(arc(0, 0, R, .3 * R, 0, Math.PI, 40)); m(arc(0, 0, R, .3 * R, Math.PI, TAU, 40), { dash: 1 }); break;
      case "cylinder": a = .7 * s; d = .22 * s; m(arc(0, -.9 * s, a, d, 0, TAU, 48)); m([[-a, -.9 * s], [-a, .9 * s]]); m([[a, -.9 * s], [a, .9 * s]]); m(arc(0, .9 * s, a, d, 0, Math.PI, 36)); m(arc(0, .9 * s, a, d, Math.PI, TAU, 36), { dash: 1 }); break;
      case "cone": a = .8 * s; d = .25 * s; m([[-a, .8 * s], [0, -1.1 * s], [a, .8 * s]]); m(arc(0, .8 * s, a, d, 0, Math.PI, 36)); m(arc(0, .8 * s, a, d, Math.PI, TAU, 36), { dash: 1 }); break;
      case "pyramid": m([[-.9 * s, .75 * s], [.5 * s, .75 * s], [.9 * s, .35 * s]]); m([[-.9 * s, .75 * s], [0, -1 * s], [.5 * s, .75 * s]]); m([[0, -1 * s], [.9 * s, .35 * s]]); m([[-.5 * s, .35 * s], [.9 * s, .35 * s]], { dash: 1 }); m([[-.5 * s, .35 * s], [-.9 * s, .75 * s]], { dash: 1 }); m([[-.5 * s, .35 * s], [0, -1 * s]], { dash: 1 }); break;
      case "axes": m([[-1.2 * s, 0], [1.2 * s, 0]]); m(head(-1.2 * s, 0, 1.2 * s, 0, .16 * s)); m([[0, 1.2 * s], [0, -1.2 * s]]); m(head(0, 1.2 * s, 0, -1.2 * s, .16 * s)); for (i = -2; i <= 2; i++) if (i) { m([[i * .5 * s, -.05 * s], [i * .5 * s, .05 * s]]); m([[-.05 * s, i * .5 * s], [.05 * s, i * .5 * s]]) } break;
      case "sine": p = []; for (i = 0; i <= 90; i++) { a = i / 90; p.push([(-1.6 + 3.2 * a) * s, -.6 * s * Math.sin(a * TAU * 2)]) } m(p); break;
      case "spiral": p = []; for (i = 0; i <= 140; i++) { a = i / 140 * TAU * 3; d = i / 140 * s; p.push([d * Math.cos(a), d * Math.sin(a)]) } m(p); break;
      case "house": m(poly([[-.8 * s, 0], [.8 * s, 0], [.8 * s, .9 * s], [-.8 * s, .9 * s]], 1), { f: 1 }); m([[-1 * s, 0], [0, -.8 * s], [1 * s, 0]]); m(poly([[-.18 * s, .9 * s], [-.18 * s, .4 * s], [.18 * s, .4 * s], [.18 * s, .9 * s]], 0)); m(poly([[.3 * s, .18 * s], [.6 * s, .18 * s], [.6 * s, .48 * s], [.3 * s, .48 * s]], 1)); break;
      case "sun": m(arc(0, 0, .45 * s, .45 * s, 0, TAU, 48), { f: 1 }); for (i = 0; i < 8; i++) { a = i * TAU / 8; m([[.65 * s * Math.cos(a), .65 * s * Math.sin(a)], [.98 * s * Math.cos(a), .98 * s * Math.sin(a)]]) } break;
      case "tree": m(arc(0, -.3 * s, .62 * s, .62 * s, 0, TAU, 56), { f: 1 }); m(poly([[-.12 * s, .32 * s], [-.12 * s, .95 * s], [.12 * s, .95 * s], [.12 * s, .32 * s]], 0)); break;
      case "smiley": R = .85 * s; m(arc(0, 0, R, R, 0, TAU, 64), { f: 1 }); m(arc(-.3 * s, -.25 * s, .09 * s, .09 * s, 0, TAU, 16)); m(arc(.3 * s, -.25 * s, .09 * s, .09 * s, 0, TAU, 16)); m(arc(0, .05 * s, .5 * s, .5 * s, .15 * Math.PI, .85 * Math.PI, 28)); break;
      case "path": (o.strokes || []).forEach(function (st) { m(st.map(function (q) { return [(q[0] - 50) / 100 * 2.6 * s, (q[1] - 50) / 100 * 2.6 * s] })) }); break;
      case "free": (o.pts || []).length && m(o.pts); break;
      default: m([[-1 * s, 0], [1 * s, 0]]);
    }
    /* recentre bbox, measure lengths */
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, tot = 0;
    L.forEach(function (l) { l.p.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]) }) });
    if (!isFinite(x0)) { x0 = y0 = x1 = y1 = 0 }
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    L.forEach(function (l) { l.p = l.p.map(function (q) { return [q[0] - mx, q[1] - my] }); l.len = 0; l.seg = []; for (var j = 1; j < l.p.length; j++) { var dd = Math.hypot(l.p[j][0] - l.p[j - 1][0], l.p[j][1] - l.p[j - 1][1]); l.seg.push(dd); l.len += dd } tot += l.len });
    return { L: L, w: x1 - x0, h: y1 - y0, len: tot };
  }

  /* ───────── canvas / render ───────── */
  var PAL = { white: "#f4ead0", gold: "#e0b653", red: "#ff6b6b", blue: "#6aa8ff", green: "#5fd68a", yellow: "#ffe066", orange: "#ff9f4a", purple: "#b58cff", pink: "#ff8fcf", cyan: "#5fe0e0", gray: "#a9a493" };
  function geoOf(sh) {
    var m = Math.min(S.W, S.H), key = S.W + "x" + S.H;
    if (sh._k !== key) { sh._g = build(sh.k, sh.sc * m, sh.o || {}); sh._k = key } return sh._g;
  }
  function stroke(c, l, d, w) {            /* draw polyline l up to distance d */
    var i, rem = d, p = l.p; if (p.length < 2) return null;
    c.beginPath(); c.moveTo(p[0][0], p[0][1]); var tip = p[0];
    for (i = 1; i < p.length; i++) {
      var sg = l.seg[i - 1];
      if (rem >= sg) { c.lineTo(p[i][0], p[i][1]); rem -= sg; tip = p[i] }
      else { var t = sg ? rem / sg : 0; tip = [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]; c.lineTo(tip[0], tip[1]); rem = 0; break }
    }
    c.stroke(); return tip;
  }
  function drawShape(c, sh, prog) {
    var g = geoOf(sh), px = sh.fx * S.W, py = sh.fy * S.H, col = sh.col, lw = Math.max(2.4, sh.sc * Math.min(S.W, S.H) * .05), tip = null;
    c.save(); c.translate(px, py); c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = lw; c.strokeStyle = col; c.fillStyle = col;
    if (sh.k === "text") {
      var fs = Math.max(16, sh.sc * Math.min(S.W, S.H) * .62), rtl = /[؀-ۿ]/.test(sh.o.txt);
      c.font = "600 " + fs + "px -apple-system,system-ui,'Vazirmatn',sans-serif"; c.textBaseline = "middle"; c.textAlign = "center"; c.direction = rtl ? "rtl" : "ltr";
      var tw = c.measureText(sh.o.txt).width; c.beginPath();
      if (rtl) c.rect(tw / 2 - tw * prog, -fs, tw * prog + 2, fs * 2); else c.rect(-tw / 2, -fs, tw * prog + 2, fs * 2);
      c.clip(); c.fillText(sh.o.txt, 0, 0); c.restore(); return;
    }
    var dist = prog * g.len, off = 0;
    if (sh.fill && prog >= .9) { var f = g.L.filter(function (l) { return l.f })[0]; if (f) { c.globalAlpha = .26 * Math.min(1, (prog - .9) / .1); c.beginPath(); f.p.forEach(function (q, i) { i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]) }); c.closePath(); c.fill(); c.globalAlpha = 1 } }
    g.L.forEach(function (l) {
      if (dist <= off) return; var d = Math.min(l.len, dist - off); off += l.len;
      c.setLineDash(l.dash ? [lw * 2.2, lw * 2.2] : []); c.globalAlpha = l.dash ? .5 : 1;
      var t = stroke(c, l, d); if (t && d < l.len + .01) tip = t; if (d >= l.len) tip = t || tip;
    });
    c.setLineDash([]); c.globalAlpha = 1;
    if (prog < 1 && tip) { c.shadowColor = col; c.shadowBlur = 18; c.fillStyle = "#fff"; c.beginPath(); c.arc(tip[0], tip[1], lw * 1.1, 0, TAU); c.fill() }
    c.restore();
  }
  function render() {
    var c = S.cx; if (!c) return; c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); c.clearRect(0, 0, S.W, S.H);
    c.fillStyle = "rgba(212,168,75,.16)"; for (var x = 18; x < S.W; x += 26) for (var y = 18; y < S.H; y += 26) c.fillRect(x, y, 1.5, 1.5);
    S.shapes.forEach(function (sh) { if (!S.cur || S.cur.sh !== sh) drawShape(c, sh, 1) });
    if (S.cur) drawShape(c, S.cur.sh, S.cur.p);
    if (S.free && S.free.pts.length > 1) { c.save(); c.strokeStyle = PAL.white; c.lineWidth = 3; c.lineCap = c.lineJoin = "round"; c.beginPath(); S.free.pts.forEach(function (q, i) { i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]) }); c.stroke(); c.restore() }
    if (S.hint) S.hint.style.opacity = S.shapes.length || S.cur ? 0 : 1;
  }
  function resize() {
    if (!S.cv) return; var r = S.cv.getBoundingClientRect(); if (!r.width) return;
    S.dpr = Math.min(3, W_.devicePixelRatio || 1); S.W = r.width; S.H = r.height; S.cv.width = Math.round(S.W * S.dpr); S.cv.height = Math.round(S.H * S.dpr); S.cx = S.cv.getContext("2d"); render();
  }

  /* ───────── placement ───────── */
  function bbox(sh) { var g = geoOf(sh), w = g.w, h = g.h; if (sh.k === "text") { var fs = Math.max(16, sh.sc * Math.min(S.W, S.H) * .62); S.cx.font = "600 " + fs + "px system-ui"; w = S.cx.measureText(sh.o.txt).width; h = fs * 1.2 } return { w: w, h: h } }
  function place(sh, pos) {
    var m = Math.min(S.W, S.H), gap = m * .09, b = bbox(sh), last = S.shapes[S.shapes.length - 1], lb = last && bbox(last), lx = last && last.fx * S.W, ly = last && last.fy * S.H, x, y, top = m * .1 + b.h / 2;
    if (pos === "center") { x = S.W / 2; y = S.H / 2 }
    else if (!last) { x = S.W / 2; y = Math.max(top, S.H * .16 + b.h / 2) }
    else if (pos === "right") { x = lx + lb.w / 2 + gap + b.w / 2; y = ly }
    else if (pos === "left") { x = lx - lb.w / 2 - gap - b.w / 2; y = ly }
    else if (pos === "above") { x = lx; y = ly - lb.h / 2 - gap - b.h / 2 }
    else { x = lx; y = ly + lb.h / 2 + gap + b.h / 2 + (last.k === "line" || last.k === "arrow" ? 0 : 0) }
    if (y + b.h / 2 > S.H - gap) { var mr = 0; S.shapes.forEach(function (q) { mr = Math.max(mr, q.fx * S.W + bbox(q).w / 2) }); x = mr + gap + b.w / 2; y = top }   /* column full → next column */
    if (y - b.h / 2 < gap * .3) y = gap * .3 + b.h / 2;
    x = Math.max(b.w / 2 + 8, Math.min(S.W - b.w / 2 - 8, x)); y = Math.max(b.h / 2 + 4, Math.min(S.H - b.h / 2 - 4, y));
    sh.fx = x / S.W; sh.fy = y / S.H;
  }

  /* ───────── queue / animation ───────── */
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }
  function animate(sh) {
    return new Promise(function (res) {
      var g = geoOf(sh), dur = sh.k === "text" ? 300 + sh.o.txt.length * 70 : Math.max(650, Math.min(2200, 450 + g.len * 1.5)), t0 = 0;
      S.cur = { sh: sh, p: 0 };
      function f(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur); S.cur.p = ease(p); render(); if (p < 1 && S.open) S.raf = requestAnimationFrame(f); else { S.shapes.push(sh); S.cur = null; render(); setTimeout(res, 160) } }
      S.raf = requestAnimationFrame(f);
    });
  }
  function pump() {
    if (S.busy) return; S.busy = true;
    (function next() {
      var job = S.q.shift(); if (!job) { S.busy = false; return }
      Promise.resolve().then(job).then(next, next);
    })();
  }
  function enqueue(fn) { S.q.push(fn); pump() }

  /* ───────── UI ───────── */
  function css() {
    if (D.getElementById("bd-css")) return; var s = D.createElement("style"); s.id = "bd-css";
    s.textContent = "#bd-ov{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;background:#100d08;opacity:0;transform:translateY(14px);pointer-events:none;transition:opacity .28s,transform .28s;font-family:-apple-system,system-ui,'Vazirmatn',sans-serif}" +
      "#bd-ov.on{opacity:1;transform:none;pointer-events:auto}" +
      "#bd-bar{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;border-bottom:1px solid rgba(212,168,75,.2);color:#f3e3b4}" +
      "#bd-bar b{flex:1;font-size:15px;letter-spacing:.3px}" +
      "#bd-bar button{border:1px solid rgba(212,168,75,.35);background:rgba(212,168,75,.1);color:#f3e3b4;border-radius:12px;padding:8px 12px;font:600 13px/1 inherit;-webkit-tap-highlight-color:transparent}" +
      "#bd-bar button:active{background:rgba(212,168,75,.28)}#bd-bar button.hl{box-shadow:0 0 0 2px #d4a84b}" +
      "#bd-cv{flex:1;width:100%;touch-action:none;display:block}" +
      "#bd-hint{position:absolute;left:0;right:0;top:46%;text-align:center;color:#8f8467;font-size:14px;line-height:1.9;pointer-events:none;transition:opacity .3s;padding:0 28px}";
    D.head.appendChild(s);
  }
  function build_ui() {
    if (S.ov) return; css();
    var o = D.createElement("div"); o.id = "bd-ov"; o.setAttribute("dir", "auto");
    o.innerHTML = '<div id="bd-bar"><b>Whiteboard · تخته</b><button data-a="undo">↶</button><button data-a="clear">🗑</button><button data-a="save">⬇︎</button><button data-a="close">✕</button></div><canvas id="bd-cv"></canvas><div id="bd-hint">بگو: «خط صاف بکش، بعد زیرش دایره، بعد مکعب»<br><span style="opacity:.7">Say: “draw a line, then a circle under it, then a cube”</span><br><span style="opacity:.7">یا با انگشت بکش · or draw with your finger</span></div>';
    D.body.appendChild(o); S.ov = o; S.cv = o.querySelector("#bd-cv"); S.hint = o.querySelector("#bd-hint");
    o.querySelector("#bd-bar").addEventListener("click", function (e) { var a = e.target.getAttribute && e.target.getAttribute("data-a"); if (a === "close") close(); else if (a === "clear") clear(); else if (a === "undo") undo(); else if (a === "save") save() });
    var cv = S.cv;
    cv.addEventListener("pointerdown", function (e) { var r = cv.getBoundingClientRect(); S.free = { pts: [[e.clientX - r.left, e.clientY - r.top]] }; try { cv.setPointerCapture(e.pointerId) } catch (_) { } });
    cv.addEventListener("pointermove", function (e) { if (!S.free) return; var r = cv.getBoundingClientRect(); S.free.pts.push([e.clientX - r.left, e.clientY - r.top]); render() });
    function up() {
      if (!S.free) return; var p = S.free.pts; S.free = null;
      if (p.length > 2) { var xs = p.map(function (q) { return q[0] }), ys = p.map(function (q) { return q[1] }), cx = (Math.min.apply(0, xs) + Math.max.apply(0, xs)) / 2, cy = (Math.min.apply(0, ys) + Math.max.apply(0, ys)) / 2; S.shapes.push({ k: "free", o: { pts: p.map(function (q) { return [q[0] - cx, q[1] - cy] }) }, sc: 1, fx: cx / S.W, fy: cy / S.H, col: PAL.white, _k: "" }) } render();
    }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    W_.addEventListener("resize", resize); W_.addEventListener("orientationchange", function () { setTimeout(resize, 300) });
  }
  function open() {
    build_ui(); if (S.open) return Promise.resolve(); S.open = true; S.ov.classList.add("on");
    return new Promise(function (r) { setTimeout(function () { resize(); r() }, 60) });
  }
  function close() { S.open = false; if (S.ov) S.ov.classList.remove("on"); cancelAnimationFrame(S.raf); if (S.cur) { S.shapes.push(S.cur.sh); S.cur = null } }
  function clear() { S.shapes = []; S.cur = null; render() }
  function undo() { if (S.cur) { S.cur = null } else S.shapes.pop(); render() }
  function save() {
    if (!S.cv) return; render();
    S.cv.toBlob(function (b) {
      if (!b) return; var f = new File([b], "phraortes-board.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () { }) }
      else { var a = D.createElement("a"); a.href = URL.createObjectURL(b); a.download = "phraortes-board.png"; D.body.appendChild(a); a.click(); a.remove() }
    });
  }

  /* ───────── adding shapes ───────── */
  function addShape(spec) {
    return enqueue(function () {
      return open().then(function () {
        if (spec.clear) { clear(); }
        if (!spec.k) return;
        var m = Math.min(S.W, S.H), base = spec.k === "text" ? .22 : .17, sh = { k: spec.k, o: { dir: spec.dir, txt: spec.txt, strokes: spec.strokes }, sc: base * (spec.size || 1), col: spec.col || PAL.white, fill: !!spec.fill, fx: .5, fy: .5, _k: "" };
        place(sh, spec.pos); return animate(sh);
      });
    });
  }

  /* ───────── language ───────── */
  function norm(t) {
    return String(t || "").toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d) }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d) })
      .replace(/پنج\s*ضلعی/g, "پنجضلعی").replace(/شش\s*ضلعی/g, "ششضلعی").replace(/محور\s*مختصات/g, "محور").replace(/خط\s*صاف/g, "خط").replace(/[‌]/g, " ").replace(/[.!?؟،,;؛]/g, " , ").replace(/\s+/g, " ").trim();
  }
  var SHAPES = [
    ["line", /^(خط|line)$/], ["arrow", /^(فلش|arrow)$/], ["circle", /^(دایره|دایره‌|circle)$/], ["sphere", /^(کره|sphere|ball|توپ)$/], ["ellipse", /^(بیضی|oval|ellipse)$/],
    ["rect", /^(مستطیل|rectangle|rect)$/], ["square", /^(مربع|square)$/], ["triangle", /^(مثلث|triangle)$/], ["diamond", /^(لوزی|diamond)$/], ["pentagon", /^(پنجضلعی|pentagon)$/], ["hexagon", /^(ششضلعی|hexagon)$/],
    ["star", /^(ستاره|star)$/], ["heart", /^(قلب|heart)$/], ["cube", /^(مکعب|cube|box|جعبه)$/], ["cylinder", /^(استوانه|سیلندر|cylinder)$/], ["cone", /^(مخروط|cone)$/], ["pyramid", /^(هرم|pyramid)$/],
    ["axes", /^(محور|axes|axis)$/], ["sine", /^(سینوس|موج|sine|wave)$/], ["spiral", /^(مارپیچ|spiral)$/], ["house", /^(خونه|خانه|house|home)$/], ["sun", /^(خورشید|sun)$/], ["tree", /^(درخت|tree)$/], ["smiley", /^(لبخند|smiley|smile|emoji)$/]
  ];
  var COLORS = [[/قرمز|red/, "red"], [/آبی|blue/, "blue"], [/سبز|green/, "green"], [/زرد|yellow/, "yellow"], [/نارنجی|orange/, "orange"], [/بنفش|purple|violet/, "purple"], [/صورتی|pink/, "pink"], [/طلایی|gold/, "gold"], [/فیروزه|cyan|turquoise/, "cyan"], [/خاکستری|gray|grey/, "gray"], [/سفید|white/, "white"]];
  var NUM = { "دو": 2, "سه": 3, "چهار": 4, "پنج": 5, two: 2, three: 3, four: 4, five: 5 };
  function strip(w) { var o = [w]; ["رو", "را", "ی", "ای", "ها", "های", "ش", "اش", "s"].forEach(function (x) { if (w.length > x.length + 1 && w.slice(-x.length) === x) o.push(w.slice(0, -x.length)) }); return o }
  function shapeOf(tok) { for (var i = 0; i < SHAPES.length; i++) { var v = strip(tok); for (var j = 0; j < v.length; j++) if (SHAPES[i][1].test(v[j])) return SHAPES[i][0] } return null }

  var RX_BOARD = /تخته|بورد|whiteboard|\bboard\b/, RX_OPEN = /باز|open|show|نشون|نشان|بیار|launch|بیاور|فعال|start/, RX_CLOSE = /ببند|close|hide|بستن|خاموش/, RX_VERB = /بکش|رسم|draw|sketch|بساز|بذار|بزار|add|make|بنویس|write|type|بکشی|ترسیم|اضافه/;
  var RX_SPLIT = /\s*,\s*|(?:^|\s)(?:and then|after that|then|next|و سپس|سپس|بعد از اون|بعد از آن|و بعد|بعدش|بعد)(?=\s|$)\s*/;

  function parseStep(st, ctx) {
    var out = [], fa = /[؀-ۿ]/.test(st), toks = st.split(" ");
    if (RX_BOARD.test(st) && RX_CLOSE.test(st)) return [{ a: "close" }];
    if (RX_BOARD.test(st) && RX_OPEN.test(st) && !RX_VERB.test(st)) return [{ a: "open" }];
    if (/(پاک|clear|erase|wipe|حذف|delete|remove)/.test(st)) {
      if (/(آخر|قبلی|last|previous|undo)/.test(st)) return [{ a: "undo" }];
      if (RX_BOARD.test(st) || /(همه|کل|everything|all|clear)/.test(st) || ctx.open) return [{ a: "clear" }];
    }
    if (/^(undo|برگرد)$|یه قدم برگرد/.test(st)) return [{ a: "undo" }];
    if (/(ذخیره|save|دانلود|download)/.test(st) && (RX_BOARD.test(st) || /(عکس|تصویر|image|picture|نقاشی)/.test(st) || ctx.open)) return [{ a: "save" }];
    /* text */
    var tm = /(?:بنویس|write|type)\s+(.+)$/.exec(st); if (tm && !shapeOf(tm[1].split(" ")[0])) { var col0 = null; return [{ a: "draw", k: "text", txt: tm[1].replace(/^(?:روی تخته|on the board)\s*/, "").trim(), col: col0 }] }
    var found = [], i, n = 1;
    for (i = 0; i < toks.length; i++) {
      var k = shapeOf(toks[i]); if (!k) continue; var cnt = 1, prev = toks[i - 1] && toks[i - 1] === "تا" ? toks[i - 2] : toks[i - 1];
      if (prev && NUM[prev]) cnt = NUM[prev]; else if (prev && /^\d+$/.test(prev)) cnt = Math.min(5, +prev); if (toks[i - 1] === "تا" && /^\d+$/.test(toks[i - 2] || "")) cnt = Math.min(5, +toks[i - 2]);
      found.push([k, cnt]);
    }
    if (!found.length) return out;
    var col = null; COLORS.some(function (c) { if (c[0].test(st)) { col = PAL[c[1]]; return true } });
    var size = /خیلی بزرگ|huge|giant/.test(st) ? 1.8 : /بزرگ|big|large/.test(st) ? 1.4 : /کوچیک|کوچک|small|tiny|little/.test(st) ? .65 : 1;
    var fill = /توپر|پر |filled|solid|رنگی/.test(st + " ");
    var dir = /عمودی|vertical|vertically|قائم/.test(st) ? "v" : /مورب|اریب|diagonal|oblique/.test(st) ? "d" : "h";
    var pos = /(وسط|مرکز|center|centre|middle)/.test(st) ? "center" : /(زیر|پایین|below|under|beneath|down)/.test(st) ? "below" : /(کنار|راست|next to|beside|right)/.test(st) ? "right" : /(چپ|left)/.test(st) ? "left" : /(بالا|above|over|top)/.test(st) ? "above" : null;
    found.forEach(function (f) { for (var j = 0; j < f[1]; j++) out.push({ a: "draw", k: f[0], col: col, size: size, fill: fill, dir: dir, pos: j ? "right" : pos }) });
    return out;
  }
  function parse(text) {
    var t = norm(text), steps = t.split(RX_SPLIT).filter(Boolean), acts = [], ctx = { open: S.open };
    var board = RX_BOARD.test(t), verb = RX_VERB.test(t);
    steps.forEach(function (st) { parseStep(st, ctx).forEach(function (a) { acts.push(a); if (a.a === "open") ctx.open = true; if (a.a === "close") ctx.open = false }) });
    if (!acts.length) return null;
    /* gate: don't hijack ordinary questions */
    var drawing = acts.some(function (a) { return a.a === "draw" });
    if (!S.open && !board) return null;
    if (drawing && !verb) return null;
    if (/[?؟]|چطور|چگونه|چیه|چیست|how (do|to|can)|what is|what's/.test(String(text).toLowerCase())) return null;
    if (t.length > 400) return null;
    return acts;
  }

  function run(acts, fa) {
    acts.forEach(function (a) {
      if (a.a === "open") enqueue(function () { return open() });
      else if (a.a === "close") enqueue(function () { close() });
      else if (a.a === "clear") enqueue(function () { return open().then(clear) });
      else if (a.a === "undo") enqueue(function () { undo() });
      else if (a.a === "save") enqueue(function () { save() });
      else if (a.a === "draw") addShape(a);
    });
    var nd = acts.filter(function (a) { return a.a === "draw" }).length;
    if (acts.length === 1 && acts[0].a === "open") return fa ? "تخته باز شد." : "Board open.";
    if (acts.length === 1 && acts[0].a === "close") return fa ? "تخته بسته شد." : "Board closed.";
    if (nd) return fa ? "باشه، دارم می‌کشم." : "On it — drawing.";
    return fa ? "انجام شد." : "Done.";
  }
  function handle(text) {
    try { var acts = parse(text); if (!acts) return false; return run(acts, /[؀-ۿ]/.test(text)) } catch (e) { return false }
  }

  /* ───────── AI tool ───────── */
  function tool(args) {
    args = args || {}; var n = 0;
    if (args.clear) { enqueue(function () { return open().then(clear) }) }
    (args.steps || []).forEach(function (s) {
      var k = String(s.shape || "").toLowerCase(), k2 = shapeOf(k) || (/^(path|draw|custom)$/.test(k) ? "path" : (/^text$/.test(k) ? "text" : null)); if (!k2) return;
      var col = s.color ? (PAL[String(s.color).toLowerCase()] || (/^#[0-9a-f]{3,8}$/i.test(s.color) ? s.color : null)) : null;
      addShape({ k: k2, col: col, size: +s.size || 1, fill: !!s.fill, dir: s.direction === "vertical" ? "v" : s.direction === "diagonal" ? "d" : "h", pos: s.position || null, txt: s.text, strokes: s.strokes }); n++;
    });
    if (!n && !args.clear) return enqueue(function () { return open() }), "Whiteboard opened.";
    return "Drawing " + n + " item(s) on the whiteboard now, one by one.";
  }

  W_.PHR_BOARD = { open: open, close: close, clear: clear, undo: undo, save: save, handle: handle, parse: parse, tool: tool, state: function () { return { open: S.open, shapes: S.shapes.length, queued: S.q.length } } };

  /* ───────── hook into the agent ───────── */
  function install() {
    var A = W_.PHR_AGENT; if (!A || A.__board) return false; A.__board = true;
    try { A.panels.push({ id: "board", en: "Whiteboard", fa: "تخته", kw: ["whiteboard", "board", "تخته", "بورد"], is: function () { return S.open }, open: function () { open() }, close: function () { close() } }) } catch (e) { }
    var oT = A.typed, oV = A.voice, oP = A.prompt;
    A.typed = function (t) { var r = handle(t); return r || oT(t) };
    A.voice = function (t, quiet) { var r = handle(t); if (r) { if (quiet) return r; try { var G = function (n) { return W_[n] || function () { } }; G("auraSetCaption")(r, "hint"); G("auraSpeak")(r) } catch (e) { } return true } return oV(t, quiet) };
    A.prompt = function (text) {
      var b = oP(text);
      if (/تخته|بورد|whiteboard|board|draw|sketch|بکش|رسم|نقاشی/i.test(String(text || "")) || S.open)
        b += "\n\nWHITEBOARD: you have a live drawing board. Call board_draw to draw on it step by step (animated). shape ∈ line, arrow, circle, ellipse, square, rect, triangle, diamond, pentagon, hexagon, star, heart, cube, sphere, cylinder, cone, pyramid, axes, sine, spiral, house, sun, tree, smiley, text, or path. For anything else (rocket, car, cat, a diagram…) use shape \"path\" with \"strokes\": a list of polylines, each a list of [x,y] points on a 0–100 grid (y down), composed from several strokes. position ∈ below, right, left, above, center (relative to the previous shape).";
      return b;
    };
    return true;
  }
  (function wait(n) { if (!install() && n < 100) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
