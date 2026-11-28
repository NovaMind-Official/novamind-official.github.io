/* model3d.js — real 3D models from a spec, rendered with our own WebGL engine (no library, works offline).
   The AI writes a compact JSON spec (lathe / cylinder / cone / sphere / capsule / torus / box / extrude / tube parts with
   PBR materials, panel lines, paint bands, glass, emissive glow, radial arrays, mirrors, animation). The engine builds
   the geometry, lights it with a procedural studio environment (reflections, fresnel, soft contact shadow, mirror floor)
   and lets you orbit, zoom, explode, wireframe, export a PNG, and refine it by talking ("longer nose, 4 fins, red metallic").
   Fence: ```model3d  (alias ```3d)      API: window.PHR_MODEL3D = { prompt, example, mount, parse } */
(function () {
  "use strict";
  var W = window.PHRW; if (window.__model3d) return; window.__model3d = 1;
  var D = document;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fa() { return /[؀-ۿ]/.test((D.getElementById("ui") || {}).value || "") || /[؀-ۿ]/.test(((D.querySelector(".msg.user:last-of-type") || {}).textContent) || ""); }
  var S = {
    en: { b: "3D model", auto: "Rotate", wire: "Wire", explode: "Explode", look: "Look", png: "PNG", change: "Change it… e.g. longer nose, four fins, red metallic", go: "Apply", undo: "Undo", copy: "Copy spec", err: "This model could not be built", fix: "Fix with AI", working: "Rebuilding…", nogl: "3D needs WebGL, which this browser does not offer.", parts: "parts", tris: "triangles", ok: "Done", hint: "Drag to rotate · pinch to zoom · double-tap to reset", full: "Full screen", replay: "Replay build", building: "Building" },
    fa: { b: "مدل سه‌بعدی", auto: "چرخش", wire: "سیمی", explode: "انفجاری", look: "حال‌وهوا", png: "PNG", change: "تغییرش بده… مثلاً دماغه بلندتر، چهار بال، قرمز متالیک", go: "اعمال", undo: "برگردان", copy: "کپی مشخصات", err: "ساخت این مدل ممکن نشد", fix: "رفع با AI", working: "در حال ساخت دوباره…", nogl: "سه‌بعدی به WebGL نیاز دارد که این مرورگر ندارد.", parts: "قطعه", tris: "مثلث", ok: "انجام شد", hint: "بکش تا بچرخد · دو انگشت برای زوم · دوبار لمس برای بازنشانی", full: "تمام‌صفحه", replay: "ساخت دوباره", building: "در حال ساخت" }
  };
  function T(k) { return (S[fa() ? "fa" : "en"][k]) || S.en[k] || k; }

  /* ================================================================ math */
  var M4 = {
    id: function () { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    mul: function (a, b) { var o = new Array(16), i, j, k; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) { var s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
    T: function (x, y, z) { var m = M4.id(); m[12] = x; m[13] = y; m[14] = z; return m; },
    S: function (x, y, z) { var m = M4.id(); m[0] = x; m[5] = y; m[10] = z; return m; },
    RX: function (a) { var c = Math.cos(a), s = Math.sin(a), m = M4.id(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
    RY: function (a) { var c = Math.cos(a), s = Math.sin(a), m = M4.id(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
    RZ: function (a) { var c = Math.cos(a), s = Math.sin(a), m = M4.id(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
    persp: function (fov, asp, n, f) { var t = 1 / Math.tan(fov / 2), m = new Array(16).fill(0); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
    look: function (e, c, up) { var z = nrm(sub(e, c)), x = nrm(cross(up, z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; },
    pt: function (m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
    n3: function (m) { // normal matrix (inverse transpose of upper 3x3), column-major 3x3
      var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
      var A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C || 1, id = 1 / det;
      return [A * id, (c * h - b * i) * id, (b * f - c * e) * id, B * id, (a * i - c * g) * id, (c * d - a * f) * id, C * id, (b * g - a * h) * id, (a * e - b * d) * id];
    }
  };
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function nrm(a) { var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  function hex(c, d) { c = String(c || d || "#cccccc"); var m = c.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return hex(d || "#cccccc"); var h = m[1]; if (h.length === 3) h = h.replace(/./g, "$&$&"); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
  function lin(c) { return c.map(function (v) { return Math.pow(v, 2.2); }); }

  /* ================================================================ geometry */
  function mk() { return { p: [], n: [], i: [] }; }
  function profileOf(spec, P) {
    if (Array.isArray(P)) return P.map(function (q) { return [Math.max(0, num(q[0], 0)), num(q[1], 0)]; });
    var s = String(P || ""), m = s.match(/^(\w+)\s*\(([^)]*)\)$/); if (!m) return [[0, 0], [0.5, 0], [0.5, 1], [0, 1]];
    var a = m[2].split(",").map(function (x) { return parseFloat(x); }), fn = m[1].toLowerCase(), out = [], i, N = 28;
    if (fn === "ogive") { var r = a[0] || .5, h = a[1] || 1, rho = (r * r + h * h) / (2 * r); out.push([0, 0]); for (i = 0; i <= N; i++) { var y = h * i / N; out.push([Math.max(0, Math.sqrt(Math.max(0, rho * rho - y * y)) + r - rho), y]); } out[out.length - 1][0] = 0; }
    else if (fn === "dome") { var rd = a[0] || .5; out.push([0, 0]); for (i = 0; i <= N; i++) { var t = i / N * Math.PI / 2; out.push([rd * Math.cos(t), rd * Math.sin(t)]); } out[out.length - 1][0] = 0; }
    else if (fn === "capsule") { var rc = a[0] || .4, hc = Math.max(a[1] || 2, 2 * rc), k; out.push([0, 0]); for (i = 0; i <= 14; i++) { var t2 = i / 14 * Math.PI / 2; out.push([rc * Math.sin(t2), rc - rc * Math.cos(t2)]); } for (i = 1; i <= 14; i++) { var t3 = i / 14 * Math.PI / 2; out.push([rc * Math.cos(t3), hc - rc + rc * Math.sin(t3)]); } out[out.length - 1][0] = 0; k = 0; }
    else if (fn === "bell") { var r0 = a[0] || .25, r1 = a[1] || .6, hb = a[2] || 1; out.push([0, 0]); for (i = 0; i <= 20; i++) { var tb = i / 20; out.push([r0 + (r1 - r0) * Math.pow(tb, .55), hb * tb]); } out.push([r1 * .93, hb]); for (i = 20; i >= 0; i--) { var tc = i / 20; out.push([Math.max(0, (r0 + (r1 - r0) * Math.pow(tc, .55)) * .93 - .02), hb * tc * .9 + hb * .06]); } out.push([0, hb * .08]); }
    else if (fn === "vase") { var rv = a[0] || .5, hv = a[1] || 1; out.push([0, 0]); for (i = 0; i <= N; i++) { var tv = i / N; out.push([rv * (0.55 + 0.45 * Math.sin(tv * Math.PI * 1.1 + .3)) * (1 - tv * .15), hv * tv]); } out.push([0, hv]); }
    else out = [[0, 0], [.5, 0], [.5, 1], [0, 1]];
    return out;
  }
  function lathe(prof, seg, flat, smooth) {
    var g = mk(), m = prof.length, si, k, j;
    if (m < 2) return g; var ns = [];
    for (k = 0; k < m - 1; k++) { var dr = prof[k + 1][0] - prof[k][0], dy = prof[k + 1][1] - prof[k][1], l = Math.sqrt(dr * dr + dy * dy) || 1; ns.push([dy / l, -dr / l]); }
    var cosS = Math.cos((smooth || 38) * Math.PI / 180);
    function vn(k, s) { var a = ns[s], b = k > 0 && s === k ? ns[k - 1] : k < m - 1 && s === k - 1 ? ns[k] : null; if (!b) return a; if (a[0] * b[0] + a[1] * b[1] > cosS) { var x = a[0] + b[0], y = a[1] + b[1], L = Math.sqrt(x * x + y * y) || 1; return [x / L, y / L]; } return a; }
    for (si = 0; si < m - 1; si++) {
      if (Math.abs(prof[si][0]) < 1e-6 && Math.abs(prof[si + 1][0]) < 1e-6) continue;
      var base = g.p.length / 3;
      if (flat) {
        for (j = 0; j < seg; j++) {
          var a0 = j / seg * Math.PI * 2, a1 = (j + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2, nn = ns[si], b2 = g.p.length / 3;
          [[0, a0], [0, a1], [1, a1], [1, a0]].forEach(function (q) { var P = prof[si + q[0]]; g.p.push(P[0] * Math.cos(q[1]), P[1], P[0] * Math.sin(q[1])); g.n.push(nn[0] * Math.cos(am), nn[1], nn[0] * Math.sin(am)); });
          g.i.push(b2, b2 + 2, b2 + 1, b2, b2 + 3, b2 + 2);
        }
      } else {
        for (k = 0; k < 2; k++) { var kk = si + k, n2 = vn(kk, si); for (j = 0; j <= seg; j++) { var a = j / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); g.p.push(prof[kk][0] * c, prof[kk][1], prof[kk][0] * s); g.n.push(n2[0] * c, n2[1], n2[0] * s); } }
        for (j = 0; j < seg; j++) { var A = base + j, B = base + j + 1, C = base + seg + 1 + j, Dd = base + seg + 2 + j; g.i.push(A, Dd, B, A, C, Dd); }
      }
    }
    return g;
  }
  function torus(R, r, seg, tub) {
    var g = mk(), i, j; for (i = 0; i <= seg; i++) for (j = 0; j <= tub; j++) { var u = i / seg * Math.PI * 2, v = j / tub * Math.PI * 2, cx = Math.cos(u), sx = Math.sin(u); g.p.push((R + r * Math.cos(v)) * cx, r * Math.sin(v), (R + r * Math.cos(v)) * sx); g.n.push(Math.cos(v) * cx, Math.sin(v), Math.cos(v) * sx); }
    for (i = 0; i < seg; i++) for (j = 0; j < tub; j++) { var a = i * (tub + 1) + j, b = a + tub + 1; g.i.push(a, a + 1, b, a + 1, b + 1, b); } return g;
  }
  function box(sx, sy, sz) {
    var g = mk(), F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, 1], [-1, 0, 0]], [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
    F.forEach(function (f) { var n = f[0], u = f[1], v = f[2], b = g.p.length / 3; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { g.p.push((n[0] + u[0] * q[0] + v[0] * q[1]) * sx / 2, (n[1] + u[1] * q[0] + v[1] * q[1]) * sy / 2, (n[2] + u[2] * q[0] + v[2] * q[1]) * sz / 2); g.n.push(n[0], n[1], n[2]); }); g.i.push(b, b + 1, b + 2, b, b + 2, b + 3); });
    return g;
  }
  function area(poly) { var s = 0, i; for (i = 0; i < poly.length; i++) { var a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  function earclip(poly) {
    var n = poly.length, idx = [], i; for (i = 0; i < n; i++) idx.push(i); if (area(poly) < 0) idx.reverse(); var out = [], guard = 0;
    function inTri(p, a, b, c) { var d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]), d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]), d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); }
    while (idx.length > 3 && guard++ < 2000) {
      var found = false;
      for (i = 0; i < idx.length; i++) {
        var a = poly[idx[(i + idx.length - 1) % idx.length]], b = poly[idx[i]], c = poly[idx[(i + 1) % idx.length]];
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 1e-9) continue;
        var ok = true; for (var j = 0; j < idx.length; j++) { var q = idx[j]; if (q === idx[(i + idx.length - 1) % idx.length] || q === idx[i] || q === idx[(i + 1) % idx.length]) continue; if (inTri(poly[q], a, b, c)) { ok = false; break; } }
        if (ok) { out.push([idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]]); idx.splice(i, 1); found = true; break; }
      }
      if (!found) break;
    }
    if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]); return out;
  }
  function extrude(poly, depth) {
    var g = mk(), n = poly.length, h = depth / 2, tris = earclip(poly), i;
    function face(z, nz, flip) { var b = g.p.length / 3; poly.forEach(function (p) { g.p.push(p[0], p[1], z); g.n.push(0, 0, nz); }); tris.forEach(function (t) { if (flip) g.i.push(b + t[0], b + t[2], b + t[1]); else g.i.push(b + t[0], b + t[1], b + t[2]); }); }
    face(h, 1, false); face(-h, -1, true);
    var sgn = area(poly) >= 0 ? 1 : -1;
    for (i = 0; i < n; i++) { var a = poly[i], b2 = poly[(i + 1) % n], dx = b2[0] - a[0], dy = b2[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, nx = dy / l * sgn, ny = -dx / l * sgn, b = g.p.length / 3; g.p.push(a[0], a[1], h, b2[0], b2[1], h, b2[0], b2[1], -h, a[0], a[1], -h); for (var k = 0; k < 4; k++) g.n.push(nx, ny, 0); g.i.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    return g;
  }
  function tube(path, r, seg) {
    var g = mk(), m = path.length, i, j; if (m < 2) return g; var prevN = null;
    for (i = 0; i < m; i++) {
      var t = nrm(sub(path[Math.min(m - 1, i + 1)], path[Math.max(0, i - 1)])), up = Math.abs(t[1]) > .95 ? [1, 0, 0] : [0, 1, 0], u = prevN ? nrm(sub(prevN, [t[0] * dot(prevN, t), t[1] * dot(prevN, t), t[2] * dot(prevN, t)])) : nrm(cross(t, up)), v = cross(t, u); prevN = u;
      var rr = Array.isArray(r) ? r[Math.min(r.length - 1, Math.floor(i / (m - 1) * r.length))] : r;
      for (j = 0; j <= seg; j++) { var a = j / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), nn = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s]; g.p.push(path[i][0] + nn[0] * rr, path[i][1] + nn[1] * rr, path[i][2] + nn[2] * rr); g.n.push(nn[0], nn[1], nn[2]); }
    }
    for (i = 0; i < m - 1; i++) for (j = 0; j < seg; j++) { var A = i * (seg + 1) + j, B = A + seg + 1; g.i.push(A, B, A + 1, A + 1, B, B + 1); }
    return g;
  }
  function bbox(g) { var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], i; for (i = 0; i < g.p.length; i += 3) for (var k = 0; k < 3; k++) { var v = g.p[i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; } return [lo, hi]; }

  /* ================================================================ spec → instances */
  var LIM = { parts: 160, inst: 700, tris: 700000 };
  function build(spec) {
    var inst = [], tris = 0, cache = {};
    function geo(p) {
      var t = String(p.t || p.type || "box").toLowerCase(), seg = Math.max(3, Math.min(96, Math.round(num(p.seg, t === "box" ? 4 : 48)))), key = JSON.stringify([t, p.r, p.rt, p.rb, p.h, p.R, p.size, p.profile, p.shape, p.depth, p.path, seg, p.flat]);
      if (cache[key]) return cache[key]; var g;
      if (t === "lathe") g = lathe(profileOf(spec, p.profile), seg, p.flat != null ? p.flat : seg <= 8);
      else if (t === "cylinder" || t === "cone" || t === "prism") { var h = num(p.h, 1), rb = num(p.rb != null ? p.rb : p.r, .5), rt = t === "cone" ? 0 : num(p.rt != null ? p.rt : p.r, rb); if (p.rt != null && t === "cone") rt = num(p.rt, 0); g = lathe([[0, -h / 2], [rb, -h / 2], [rt, h / 2], [0, h / 2]], seg, p.flat != null ? p.flat : seg <= 8); }
      else if (t === "sphere" || t === "ellipsoid") { var r = num(p.r, .5), pr = [[0, -r]], i; for (i = 1; i < 24; i++) { var a = -Math.PI / 2 + i / 24 * Math.PI; pr.push([r * Math.cos(a), r * Math.sin(a)]); } pr.push([0, r]); g = lathe(pr, Math.max(seg, 24), false, 80); }
      else if (t === "capsule") g = lathe(profileOf(spec, "capsule(" + num(p.r, .3) + "," + num(p.h, 1.2) + ")").map(function (q) { return [q[0], q[1] - num(p.h, 1.2) / 2]; }), seg, false, 60);
      else if (t === "torus" || t === "ring") g = torus(num(p.R, .5), num(p.r, .06), Math.max(12, seg), 14);
      else if (t === "extrude" || t === "fin" || t === "plate") { var sh = (p.shape || [[0, 0], [1, 0], [0, 1]]).map(function (q) { return [num(q[0], 0), num(q[1], 0)]; }); g = extrude(sh, num(p.depth, .05)); }
      else if (t === "tube" || t === "pipe") { var pa = (p.path || [[0, 0, 0], [0, 1, 0]]).map(function (q) { return [num(q[0], 0), num(q[1], 0), num(q[2], 0)]; }); g = tube(pa, p.r != null ? p.r : .05, Math.max(6, Math.min(24, seg))); }
      else { var sz = Array.isArray(p.size) ? p.size : [num(p.size, 1), num(p.size, 1), num(p.size, 1)]; g = box(num(sz[0], 1), num(sz[1], num(sz[0], 1)), num(sz[2], num(sz[0], 1))); }
      return (cache[key] = { g: g, bb: bbox(g) });
    }
    function xf(p) { var s = Array.isArray(p.scale) ? p.scale : [num(p.scale, 1), num(p.scale, 1), num(p.scale, 1)], r = (p.rot || [0, 0, 0]).map(function (x) { return num(x, 0) * Math.PI / 180; }), pos = p.pos || [0, 0, 0]; return M4.mul(M4.T(num(pos[0], 0), num(pos[1], 0), num(pos[2], 0)), M4.mul(M4.RZ(r[2] || 0), M4.mul(M4.RY(r[1] || 0), M4.mul(M4.RX(r[0] || 0), M4.S(num(s[0], 1), num(s[1], 1), num(s[2], 1)))))); }
    function mat(p) {
      var glass = !!p.glass, col = hex(p.color, "#c9ccd2");
      return { alb: lin(col), metal: Math.max(0, Math.min(1, num(p.metal, glass ? 0 : .1))), rough: Math.max(.04, Math.min(1, num(p.rough, glass ? .05 : .45))), emis: p.emissive ? lin(hex(p.emissive)).map(function (v) { return v * num(p.glow, 1.6); }) : [0, 0, 0], alpha: glass ? Math.max(.08, num(p.opacity, .35)) : Math.max(.05, Math.min(1, num(p.opacity, 1))), glass: glass ? 1 : 0, bands: (p.bands || []).slice(0, 4).map(function (b) { return { y0: num(b[0], 0), y1: num(b[1], 0), c: lin(hex(b[2], "#d33")) }; }), panels: p.panels ? [num(p.panels.ny, 0), num(p.panels.nth, 0)] : [0, 0], anim: p.anim || "", name: p.n || p.name || "" };
    }
    var curPi = 0, curNm = "";
    function emit(p, base) {
      if (inst.length >= LIM.inst) return; var G = geo(p), m = mat(p), M = M4.mul(base, xf(p)), n = Math.max(1, Math.min(48, Math.round(num(p.n_array || (p.t === "array" ? p.n : 1), 1)))), cnt = 1;
      var copies = [M];
      if (p.mirror) { var ax = String(p.mirror).toLowerCase(); copies.push(M4.mul(M4.S(ax.indexOf("x") >= 0 ? -1 : 1, ax.indexOf("y") >= 0 ? -1 : 1, ax.indexOf("z") >= 0 ? -1 : 1), M)); }
      copies.forEach(function (C) { inst.push({ g: G.g, bb: G.bb, M: C, mat: m, pi: curPi, nm: curNm }); tris += G.g.i.length / 3; });
    }
    var parts = (spec.parts || []).slice(0, LIM.parts);
    parts.forEach(function (p, pi) {
      curPi = pi; curNm = String(String(p.t || "").toLowerCase() === "array" ? ((p.of && p.of.n) || p.name || "parts") : (p.n || p.name || p.t || "part"));
      if (String(p.t || "").toLowerCase() === "array" || p.array) {
        var of = p.of || p.part || p, n = Math.max(1, Math.min(48, Math.round(num(p.n || (p.array && p.array.n), 4)))), ax = String(p.axis || (p.array && p.array.axis) || "y").toLowerCase(), st = num(p.start, 0) * Math.PI / 180, i;
        var base0 = M4.id();
        for (i = 0; i < n; i++) { var a = st + i / n * Math.PI * 2, R = ax === "x" ? M4.RX(a) : ax === "z" ? M4.RZ(a) : M4.RY(a); var q = JSON.parse(JSON.stringify(of)); if (p.array) { delete q.array; } emit(q, M4.mul(R, base0)); }
      } else emit(p, M4.id());
    });
    // world bbox
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    inst.forEach(function (it) { var b = it.bb, c = 0; for (; c < 8; c++) { var w = M4.pt(it.M, [c & 1 ? b[1][0] : b[0][0], c & 2 ? b[1][1] : b[0][1], c & 4 ? b[1][2] : b[0][2]]); for (var k = 0; k < 3; k++) { if (w[k] < lo[k]) lo[k] = w[k]; if (w[k] > hi[k]) hi[k] = w[k]; } } it.cen = M4.pt(it.M, [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2]); });
    if (!inst.length) throw new Error("no parts");
    return { inst: inst, lo: lo, hi: hi, tris: tris, nparts: parts.length };
  }

  /* ================================================================ shaders */
  var VS = "attribute vec3 aPos;attribute vec3 aNor;uniform mat4 uVP;uniform mat4 uM;uniform mat3 uN;uniform float uFlip;varying vec3 vW;varying vec3 vN;varying vec3 vL;void main(){vec4 w=uM*vec4(aPos,1.);vec3 n=normalize(uN*aNor);if(uFlip>.5){w.y=-w.y;n.y=-n.y;}vW=w.xyz;vN=n;vL=aPos;gl_Position=uVP*w;}";
  var FS = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n" +
    "varying vec3 vW;varying vec3 vN;varying vec3 vL;uniform vec3 uCam;uniform vec3 uAlb;uniform float uMetal;uniform float uRough;uniform vec3 uEmis;uniform float uAlpha;uniform float uGlass;uniform float uFlip;uniform float uFade;uniform float uH;uniform float uTime;uniform float uMode;uniform vec3 uSky;uniform vec3 uHor;uniform vec3 uGnd;uniform vec3 uBandC0;uniform vec3 uBandC1;uniform vec3 uBandC2;uniform vec3 uBandC3;uniform vec4 uBand;uniform vec4 uBandB;uniform vec2 uPanel;uniform float uPanelR;uniform float uFloor;uniform vec3 uFloorC;uniform float uSize;\n" +
    "float lobe(vec3 d,vec3 l,float p){return pow(max(dot(d,normalize(l)),0.),p);}\n" +
    "vec3 env(vec3 d,float r){float h=d.y;vec3 c;if(h>=0.){c=mix(uHor,uSky,smoothstep(0.,.9,h));}else{c=mix(uHor*.55,uGnd,smoothstep(0.,-.7,h));}float sh=mix(1.,.0,r);float p1=mix(220.,3.,r*r),p2=mix(90.,2.5,r*r);\n" +
    "if(uMode<.5){c+=vec3(1.,.93,.82)*3.2*lobe(d,vec3(.55,.75,.45),p1)*mix(1.,.45,r);c+=vec3(.7,.82,1.)*1.6*lobe(d,vec3(-.7,.35,.5),p2)*mix(1.,.5,r);c+=vec3(1.)*2.3*lobe(d,vec3(-.2,.5,-.85),p2)*mix(1.,.5,r);float strip=smoothstep(.9,.97,h)*mix(1.,.4,r);c+=vec3(1.)*1.4*strip;}\n" +
    "else if(uMode<1.5){c+=vec3(.35,.5,1.)*1.8*lobe(d,vec3(-.6,.4,.6),p2)*mix(1.,.5,r);c+=vec3(1.,.55,.9)*1.1*lobe(d,vec3(.7,.2,-.4),p2)*mix(1.,.5,r);c+=vec3(1.,.95,.9)*4.*lobe(d,vec3(.6,.55,.55),p1)*mix(1.,.5,r);}\n" +
    "else{c+=vec3(1.,.62,.3)*4.*lobe(d,vec3(.8,.18,.5),p1)*mix(1.,.5,r);c+=vec3(.6,.5,.9)*1.2*lobe(d,vec3(-.6,.5,-.4),p2)*mix(1.,.5,r);}\n" +
    "return mix(c,mix(uHor,uSky,.5)*1.1+vec3(.04),r*r*.65);}\n" +
    "float ggx(float nh,float a){float a2=a*a;float d=nh*nh*(a2-1.)+1.;return a2/(3.14159*d*d+1e-5);}\n" +
    "vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}\n" +
    "void main(){\n" +
    "if(uFloor>.5){float d=length(vW.xz)/uSize;float a=(1.-smoothstep(.15,1.,d))*.92;if(uFloor>1.5){float s=length(vW.xz/vec2(uSize*.16,uSize*.16));a=.62*(1.-smoothstep(.0,1.,s));gl_FragColor=vec4(0.,0.,0.,a);return;}gl_FragColor=vec4(uFloorC,a);return;}\n" +
    "vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;float NV=max(dot(N,V),1e-3);vec3 alb=uAlb;float rough=uRough;float metal=uMetal;\n" +
    "float yy=vL.y;\n" +
    "if(uBandB.x>.5){if(yy>=uBand.x&&yy<=uBand.y)alb=uBandC0;}if(uBandB.y>.5){if(yy>=uBand.z&&yy<=uBand.w)alb=uBandC1;}if(uBandB.z>.5){if(yy>=uBandB.w&&yy<=uBandB.w+uPanelR)alb=uBandC2;}\n" +
    "float pl=1.;if(uPanel.x>.5){float fy=abs(fract(yy*uPanel.x)-.5);pl*=1.-.55*(1.-smoothstep(.0,.012*uPanel.x,.5-fy));}if(uPanel.y>.5){float th=atan(vL.z,vL.x)/6.28318+.5;float fx=abs(fract(th*uPanel.y)-.5);pl*=1.-.5*(1.-smoothstep(.0,.012*uPanel.y,.5-fx));}alb*=pl;\n" +
    "vec3 F0=mix(vec3(.04),alb,metal);vec3 R=reflect(-V,N);\n" +
    "vec3 Fr=F0+(max(vec3(1.-rough),F0)-F0)*pow(1.-NV,5.);\n" +
    "float ao=mix(.5,1.,smoothstep(-.7,.7,N.y))*mix(.62,1.,smoothstep(.0,.9,vW.y));\n" +
    "vec3 diff=(1.-Fr)*(1.-metal)*alb*env(N,1.)*ao;vec3 spec=env(R,rough)*Fr*mix(.6,1.,ao);\n" +
    "vec3 Ls[3];Ls[0]=normalize(vec3(.55,.75,.45));Ls[1]=normalize(vec3(-.7,.35,.5));Ls[2]=normalize(vec3(-.2,.5,-.85));vec3 Lc[3];Lc[0]=vec3(1.,.95,.88)*2.4;Lc[1]=vec3(.7,.8,1.)*.9;Lc[2]=vec3(1.)*1.3;\n" +
    "if(uMode>1.5){Lc[0]=vec3(1.,.66,.38)*2.8;Lc[1]=vec3(.6,.55,.9)*.8;}if(uMode>.5&&uMode<1.5){Lc[0]=vec3(1.,.96,.92)*3.;Lc[1]=vec3(.4,.55,1.)*1.1;}\n" +
    "vec3 dl=vec3(0.);float a=rough*rough;for(int i=0;i<3;i++){vec3 L=Ls[i];vec3 H=normalize(L+V);float NL=max(dot(N,L),0.);float NH=max(dot(N,H),0.);float VH=max(dot(V,H),0.);vec3 Fd=F0+(1.-F0)*pow(1.-VH,5.);float k=(rough+1.)*(rough+1.)/8.;float G=(NL/(NL*(1.-k)+k))*(NV/(NV*(1.-k)+k));vec3 sp=ggx(NH,max(a,.03))*G*Fd/(4.*NL*NV+1e-3);dl+=(((1.-Fd)*(1.-metal)*alb/3.14159)+sp)*Lc[i]*NL;}\n" +
    "vec3 col=diff+spec+dl*.9+uEmis;float al=uAlpha;\n" +
    "if(uGlass>.5){float fr=pow(1.-NV,3.);col=spec*1.2+alb*env(N,.8)*.25+dl*.35;al=clamp(uAlpha+fr*.65,0.,1.);}\n" +
    "if(uFlip>.5){float f=clamp(1.+vW.y/(uH*.9+1e-3),0.,1.);al*=uFade*f*f;}\n" +
    "col=aces(col*.82);col=pow(col,vec3(1./2.2));\n" +
    "gl_FragColor=vec4(col,al);}";

  /* ================================================================ viewer */
  var LOOKS = {
    studio: { mode: 0, sky: [.20, .21, .24], hor: [.32, .31, .30], gnd: [.07, .065, .06], floor: [.1, .095, .09], bg: ["#3b3733", "#1a1714", "#0c0a08"] },
    space: { mode: 1, sky: [.012, .018, .05], hor: [.04, .05, .12], gnd: [.01, .012, .03], floor: [.015, .02, .045], bg: ["#0b1030", "#060818", "#020309"] },
    sunset: { mode: 2, sky: [.12, .12, .3], hor: [.9, .42, .18], gnd: [.1, .06, .05], floor: [.16, .09, .07], bg: ["#e0733a", "#6b3358", "#1a1030"] }
  };
  function mount(host, spec, opts) {
    opts = opts || {}; var canvas = D.createElement("canvas"), bg = D.createElement("canvas");
    [bg, canvas].forEach(function (c) { c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"; });
    canvas.style.touchAction = "none"; host.appendChild(bg); host.appendChild(canvas);
    var gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true }) || canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error(T("nogl"));
    var u32 = gl instanceof (window.WebGL2RenderingContext || function () { }) ? true : !!gl.getExtension("OES_element_index_uint");
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(o)); return o; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.bindAttribLocation(pr, 0, "aPos"); gl.bindAttribLocation(pr, 1, "aNor"); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(pr));
    gl.useProgram(pr); var U = {}; ["uVP", "uM", "uN", "uFlip", "uCam", "uAlb", "uMetal", "uRough", "uEmis", "uAlpha", "uGlass", "uFade", "uH", "uTime", "uMode", "uSky", "uHor", "uGnd", "uBandC0", "uBandC1", "uBandC2", "uBandC3", "uBand", "uBandB", "uPanel", "uPanelR", "uFloor", "uFloorC", "uSize"].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    var state = { look: opts.look || spec.env || "studio", yaw: .6, pitch: .22, dist: 1, auto: true, wire: false, expl: 0, idle: 0, t0: performance.now(), dead: false, build: null }, model = null, bufs = [], floorBuf = null, discBuf = null;
    function dispose() { bufs.forEach(function (b) { gl.deleteBuffer(b.p); gl.deleteBuffer(b.n); gl.deleteBuffer(b.i); if (b.w) gl.deleteBuffer(b.w); }); bufs = []; }
    function upload(g) { var P = gl.createBuffer(), N = gl.createBuffer(), I = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, P); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.p), gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, N); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.n), gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, I); var big = g.p.length / 3 > 65535; if (big && !u32) throw new Error("mesh too large"); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(g.i) : new Uint16Array(g.i), gl.STATIC_DRAW); return { p: P, n: N, i: I, cnt: g.i.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, g: g }; }
    function wireOf(b) { if (b.w) return; var g = b.g, set = {}, ed = [], i; for (i = 0; i < g.i.length; i += 3) for (var k = 0; k < 3; k++) { var a = g.i[i + k], c = g.i[i + (k + 1) % 3], key = a < c ? a + "_" + c : c + "_" + a; if (!set[key]) { set[key] = 1; ed.push(a, c); } } b.w = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.w); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.type === gl.UNSIGNED_INT ? new Uint32Array(ed) : new Uint16Array(ed), gl.STATIC_DRAW); b.wc = ed.length; }
    var fl = (function () { var g = mk(), N = 48, i; g.p.push(0, 0, 0); g.n.push(0, 1, 0); for (i = 0; i <= N; i++) { var a = i / N * Math.PI * 2; g.p.push(Math.cos(a), 0, Math.sin(a)); g.n.push(0, 1, 0); } for (i = 1; i <= N; i++) g.i.push(0, i + 1, i); return g; })();
    function setModel(sp) {
      var m = build(sp); dispose(); model = m; model.bufs = []; var seen = new Map();
      m.inst.forEach(function (it) { var b = seen.get(it.g); if (!b) { b = upload(it.g); seen.set(it.g, b); bufs.push(b); } it.buf = b; });
      var c = [(m.lo[0] + m.hi[0]) / 2, (m.lo[1] + m.hi[1]) / 2, (m.lo[2] + m.hi[2]) / 2], size = Math.max(m.hi[0] - m.lo[0], m.hi[1] - m.lo[1], m.hi[2] - m.lo[2]) || 1;
      model.c = c; model.size = size; model.h = m.hi[1] - m.lo[1]; model.foot = Math.max(m.hi[0] - m.lo[0], m.hi[2] - m.lo[2]) / 2 + size * .02; model.floorY = m.lo[1];
      state.dist = size * 2.25; state.base = state.dist; if (!floorBuf) { floorBuf = upload(fl); }
      paintBg(); if (opts.build) api && api.replay(opts); return m;
    }
    function paintBg() {
      var L = LOOKS[state.look] || LOOKS.studio, w = host.clientWidth || 300, h = host.clientHeight || 300, dpr = Math.min(2, window.devicePixelRatio || 1); bg.width = w * dpr; bg.height = h * dpr; var c = bg.getContext("2d"); c.scale(dpr, dpr);
      var gr = c.createRadialGradient(w / 2, h * .35, 0, w / 2, h * .45, Math.max(w, h) * .85); gr.addColorStop(0, L.bg[0]); gr.addColorStop(.55, L.bg[1]); gr.addColorStop(1, L.bg[2]); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      if (L.mode === 1) { var sd = 7, i; for (i = 0; i < 140; i++) { sd = (sd * 9301 + 49297) % 233280; var x = sd / 233280 * w; sd = (sd * 9301 + 49297) % 233280; var y = sd / 233280 * h; sd = (sd * 9301 + 49297) % 233280; var r = sd / 233280; c.fillStyle = "rgba(255,255,255," + (.2 + r * .7) + ")"; c.fillRect(x, y, r > .9 ? 2 : 1.2, r > .9 ? 2 : 1.2); } }
      host.setAttribute("data-look", state.look);
    }
    function resize() { var w = host.clientWidth, h = host.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1); if (!w || !h) return; if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); paintBg(); } }
    function setMat(mt, t, flip, fade) {
      gl.uniform3fv(U.uAlb, mt.alb); gl.uniform1f(U.uMetal, mt.metal); gl.uniform1f(U.uRough, mt.rough); var em = mt.emis; if (mt.anim === "flicker") { var f = .75 + .25 * Math.sin(t * 38) * Math.sin(t * 23 + 1); em = em.map(function (v) { return v * f; }); } gl.uniform3fv(U.uEmis, em); gl.uniform1f(U.uAlpha, mt.alpha); gl.uniform1f(U.uGlass, mt.glass);
      var b = mt.bands, z = [0, 0, 0, 0], cc = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]; b.forEach(function (q, i) { cc[i] = q.c; }); gl.uniform3fv(U.uBandC0, cc[0]); gl.uniform3fv(U.uBandC1, cc[1]); gl.uniform3fv(U.uBandC2, cc[2]); gl.uniform3fv(U.uBandC3, cc[3]);
      gl.uniform4f(U.uBand, b[0] ? b[0].y0 : 0, b[0] ? b[0].y1 : 0, b[1] ? b[1].y0 : 0, b[1] ? b[1].y1 : 0); gl.uniform4f(U.uBandB, b[0] ? 1 : 0, b[1] ? 1 : 0, b[2] ? 1 : 0, b[2] ? b[2].y0 : 0); gl.uniform1f(U.uPanelR, b[2] ? Math.max(0, b[2].y1 - b[2].y0) : 0); gl.uniform2f(U.uPanel, mt.panels[0], mt.panels[1]);
    }
    function draw(it, VP, t, flip, fade, wire) {
      var off = [0, 0, 0]; if (state.expl > 0) { var d = sub(it.cen, model.c), l = Math.sqrt(dot(d, d)) || 1; var k = state.expl * model.size * .55; off = [d[0] / l * k * Math.min(1, l / (model.size * .3)), d[1] / l * k * Math.min(1, l / (model.size * .3)), d[2] / l * k * Math.min(1, l / (model.size * .3))]; }
      var M = M4.mul(M4.T(off[0], off[1], off[2]), it.M); if (it.mat.anim === "spin") M = M4.mul(M, M4.RY(t * 4)); if (it.mat.anim === "flicker") M = M4.mul(M, M4.S(1, .88 + .12 * Math.sin(t * 31), 1)); if (it.mat.anim === "bob") M = M4.mul(M4.T(0, Math.sin(t * 2) * model.size * .02, 0), M);
      gl.uniformMatrix4fv(U.uM, false, M); gl.uniformMatrix3fv(U.uN, false, M4.n3(M)); gl.uniform1f(U.uFlip, flip ? 1 : 0); gl.uniform1f(U.uFade, fade || 1); setMat(it.mat, t, flip, fade);
      var b = it.buf; gl.bindBuffer(gl.ARRAY_BUFFER, b.p); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ARRAY_BUFFER, b.n); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      if (wire) { wireOf(b); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.w); gl.drawElements(gl.LINES, b.wc, b.type, 0); } else { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i); gl.drawElements(gl.TRIANGLES, b.cnt, b.type, 0); }
    }
    function frame(now) {
      if (state.dead) return; var t = (now - state.t0) / 1000;
      if (!host.isConnected) { state.dead = true; return; }
      var vis = host.getBoundingClientRect(); if (vis.bottom < -50 || vis.top > innerHeight + 50 || D.hidden) { requestAnimationFrame(frame); return; }
      resize(); if (!model) { requestAnimationFrame(frame); return; }
      if (state.auto && now - state.idle > 1800) state.yaw += .0042;
      var L = LOOKS[state.look] || LOOKS.studio, W_ = canvas.width, H_ = canvas.height, asp = W_ / H_, fovy = (asp < .9 ? 46 : 36) * Math.PI / 180, d = state.dist, cy = model.c[1] - model.floorY, ey = cy + Math.sin(state.pitch) * d, er = Math.cos(state.pitch) * d;
      var eye = [model.c[0] + Math.sin(state.yaw) * er, ey, model.c[2] + Math.cos(state.yaw) * er], tgt = [model.c[0], cy - model.size * .02, model.c[2]];
      var VP = M4.mul(M4.persp(fovy, asp, model.size * .05, model.size * 40), M4.look(eye, tgt, [0, 1, 0]));
      gl.viewport(0, 0, W_, H_); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.CULL_FACE);
      gl.useProgram(pr); gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniform3fv(U.uCam, eye); gl.uniform1f(U.uTime, t); gl.uniform1f(U.uMode, L.mode); gl.uniform3fv(U.uSky, L.sky); gl.uniform3fv(U.uHor, L.hor); gl.uniform3fv(U.uGnd, L.gnd); gl.uniform1f(U.uH, model.h); gl.uniform1f(U.uFloor, 0);
      // model sits on y = floorY; shift world so that floor is y=0 by translating model matrices once (done via base offset)
      var lift = -model.floorY, ins = model.inst;
      var saveC = model.c; model.c = [saveC[0], saveC[1] + lift, saveC[2]];
      var bd = null, B = state.build;
      if (B) {
        if (B.t0 == null) B.t0 = now;
        var el = (now - B.t0) / 1000, idx = Math.min(model.nparts - 1, Math.floor(el / B.per)); bd = { el: el, per: B.per, pop: Math.min(.8, B.per * 1.6) };
        if (idx !== B.last) { B.last = idx; try { B.onStep && B.onStep(idx, model.nparts, nameOf(idx)); } catch (e) {} }
        if (el > B.per * model.nparts + bd.pop) { state.build = null; bd = null; try { B.onDone && B.onDone(); } catch (e) {} }
      }
      function nameOf(i) { for (var j = 0; j < ins.length; j++) if (ins[j].pi === i) return ins[j].nm; return ""; }
      function drawAll(flip, fade, alphaPass) { ins.forEach(function (it) { var tr = it.mat.alpha < 1 || it.mat.glass; if (alphaPass ? !tr : tr) return; var M0 = it.M, c0 = it.cen, MM = M0, k = 1, dy = 0; if (bd) { var ti = bd.el - it.pi * bd.per; if (ti <= 0) return; var q = Math.min(1, ti / bd.pop), e = q - 1; k = Math.max(.001, 1 + 2.2 * e * e * e + 1.2 * e * e); dy = (1 - q) * model.size * .22; MM = M4.mul(M4.T(c0[0], c0[1], c0[2]), M4.mul(M4.S(k, k, k), M4.mul(M4.T(-c0[0], -c0[1], -c0[2]), M0))); } it.M = M4.mul(M4.T(0, lift + dy, 0), MM); it.cen = [c0[0], c0[1] + lift + dy, c0[2]]; draw(it, VP, t, flip, fade, state.wire); it.M = M0; it.cen = c0; }); }
      // 1) mirror reflection (opaque parts only, fading)
      if (!state.wire && !opts.noFloor) { gl.depthMask(true); gl.cullFace(gl.FRONT); drawAll(true, .32, false); }
      // 2) floor + contact shadow
      gl.depthMask(false); gl.uniform1f(U.uFlip, 0); gl.uniform1f(U.uSize, model.size * 3.2); gl.uniform3fv(U.uFloorC, L.floor);
      function floorDraw(mode, sc) { gl.uniform1f(U.uFloor, mode); gl.uniform1f(U.uSize, sc); var M = M4.S(sc, 1, sc); gl.uniformMatrix4fv(U.uM, false, M); gl.uniformMatrix3fv(U.uN, false, M4.n3(M)); gl.bindBuffer(gl.ARRAY_BUFFER, floorBuf.p); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ARRAY_BUFFER, floorBuf.n); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, floorBuf.i); gl.drawElements(gl.TRIANGLES, floorBuf.cnt, floorBuf.type, 0); }
      if (!state.wire && !opts.noFloor) { floorDraw(1, model.size * 3.2); gl.uniform3fv(U.uFloorC, [0, 0, 0]); floorDraw(2, Math.max(model.foot * 5.2, model.size * .5)); }
      gl.uniform1f(U.uFloor, 0);
      // 3) opaque then transparent
      gl.depthMask(true); drawAll(false, 1, false); gl.depthMask(false); drawAll(false, 1, true); gl.depthMask(true);
      model.c = saveC; requestAnimationFrame(frame);
    }
    // interaction
    var ptr = {}, pinch = 0, lastTap = 0;
    canvas.addEventListener("pointerdown", function (e) { canvas.setPointerCapture(e.pointerId); ptr[e.pointerId] = [e.clientX, e.clientY]; state.idle = performance.now(); if (Object.keys(ptr).length === 1) { var n = performance.now(); if (n - lastTap < 320) { state.yaw = .6; state.pitch = .22; state.dist = state.base; } lastTap = n; } });
    canvas.addEventListener("pointermove", function (e) { var p = ptr[e.pointerId]; if (!p) return; var ks = Object.keys(ptr); if (ks.length === 1) { state.yaw -= (e.clientX - p[0]) * .008; state.pitch = Math.max(-.2, Math.min(1.35, state.pitch + (e.clientY - p[1]) * .006)); ptr[e.pointerId] = [e.clientX, e.clientY]; } else { ptr[e.pointerId] = [e.clientX, e.clientY]; var a = ptr[ks[0]], b = ptr[ks[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) state.dist = Math.max(state.base * .35, Math.min(state.base * 2.6, state.dist * pinch / d)); pinch = d; } state.idle = performance.now(); });
    function up(e) { delete ptr[e.pointerId]; pinch = 0; state.idle = performance.now(); }
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", function (e) { e.preventDefault(); state.dist = Math.max(state.base * .35, Math.min(state.base * 2.6, state.dist * (1 + e.deltaY * .001))); state.idle = performance.now(); }, { passive: false });
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); state.dead = true; host.setAttribute("data-lost", "1"); });
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(host);
    var api = {
      state: state, replay: function (cb) { if (!model) return; state.build = { t0: null, per: Math.max(.28, Math.min(.7, 7 / Math.max(1, model.nparts))), last: -1, onStep: cb && cb.onStep, onDone: cb && cb.onDone }; state.yaw = .6; }, set: setModel, look: function (l) { state.look = l; paintBg(); }, auto: function (v) { state.auto = v; }, wire: function (v) { state.wire = v; }, explode: function (v) { state.expl = v; },
      png: function () { var o = D.createElement("canvas"); o.width = canvas.width; o.height = canvas.height; var c = o.getContext("2d"); c.drawImage(bg, 0, 0, o.width, o.height); c.drawImage(canvas, 0, 0); return o.toDataURL("image/png"); },
      stats: function () { return model ? { parts: model.inst.length, tris: model.tris } : {}; },
      destroy: function () { state.dead = true; try { gl.getExtension("WEBGL_lose_context") && gl.getExtension("WEBGL_lose_context").loseContext(); } catch (e) {} }
    };
    setModel(spec); resize(); requestAnimationFrame(frame); return api;
  }

  /* ================================================================ spec text / prompt */
  var EXAMPLE = '{"title":"Orbital rocket","env":"studio","parts":[' +
    '{"n":"core stage","t":"cylinder","r":0.62,"h":4.6,"pos":[0,3.3,0],"color":"#f4f4f6","metal":0.35,"rough":0.28,"seg":64,"panels":{"ny":3,"nth":18},"bands":[[1.4,1.9,"#1c1f28"]]},' +
    '{"n":"nose cone","t":"lathe","profile":"ogive(0.62,2.2)","pos":[0,5.6,0],"color":"#e8e9ee","metal":0.5,"rough":0.22,"seg":64,"bands":[[0,0.25,"#d6342a"]]},' +
    '{"n":"base ring","t":"cylinder","r":0.68,"h":0.35,"pos":[0,1.15,0],"color":"#2a2c33","metal":0.8,"rough":0.35,"seg":64},' +
    '{"n":"seam ring","t":"torus","R":0.63,"r":0.025,"pos":[0,5.6,0],"color":"#8b8f99","metal":0.9,"rough":0.3},' +
    '{"n":"engine bell","t":"lathe","profile":"bell(0.22,0.52,0.95)","pos":[0,0.2,0],"color":"#6e7078","metal":0.95,"rough":0.32,"seg":48},' +
    '{"n":"engine neck","t":"cylinder","r":0.3,"h":0.3,"pos":[0,1.0,0],"color":"#3a3c44","metal":0.9,"rough":0.4},' +
    '{"t":"array","n":4,"axis":"y","of":{"n":"fin","t":"extrude","shape":[[0,0],[0.9,-0.25],[0.9,-0.55],[0,-1.0],[0,0]],"depth":0.06,"pos":[0.6,2.2,0],"rot":[0,90,0],"color":"#d6342a","metal":0.3,"rough":0.35}},' +
    '{"t":"array","n":4,"axis":"y","start":45,"of":{"n":"strut","t":"capsule","r":0.05,"h":1.2,"pos":[0.66,2.0,0],"color":"#9a9da6","metal":0.9,"rough":0.3}},' +
    '{"n":"window","t":"cylinder","r":0.2,"h":0.1,"pos":[0,4.6,0.6],"rot":[90,0,0],"glass":true,"color":"#7fb6ff","opacity":0.4},' +
    '{"n":"window rim","t":"torus","R":0.2,"r":0.03,"pos":[0,4.6,0.62],"rot":[90,0,0],"color":"#2a2c33","metal":0.9,"rough":0.3},' +
    '{"n":"exhaust glow","t":"cone","rb":0.42,"h":1.9,"pos":[0,-0.55,0],"rot":[180,0,0],"color":"#ff8a3d","emissive":"#ff7a1f","glow":2.4,"opacity":0.75,"anim":"flicker"},' +
    '{"n":"exhaust core","t":"cone","rb":0.22,"h":1.3,"pos":[0,-0.2,0],"rot":[180,0,0],"color":"#fff1c8","emissive":"#fff0b0","glow":3,"opacity":0.9,"anim":"flicker"}]}';
  var PROMPT = "3D MODELS: when the user asks you to draw, design, build or show a physical OBJECT, vehicle, creature, building, machine, product or scene (rocket, car, house, chair, robot, plane, lamp…) reply with ONE short friendly line in THEIR language, then exactly one fenced block ```model3d containing ONLY valid JSON (no comments). The app renders it as a real, rotatable, lit 3D model with metal/glass/emissive materials. Do NOT use the imagine block or SVG for these requests (only for posters, photos, wallpapers, logos, avatars, portraits). " +
    "SPEC: {\"title\":str,\"env\":\"studio|space|sunset\",\"parts\":[part,…]}. Units are metres, +Y up, the model's lowest point is auto-placed on the floor. Each part: {\"n\":name,\"t\":type,…,\"pos\":[x,y,z],\"rot\":[degX,degY,degZ],\"scale\":num|[x,y,z],\"color\":\"#rrggbb\",\"metal\":0-1,\"rough\":0.05-1,\"seg\":3-96,\"emissive\":\"#hex\",\"glow\":num,\"glass\":true,\"opacity\":0-1,\"anim\":\"spin|flicker|bob\",\"mirror\":\"x|y|z\",\"panels\":{\"ny\":rows,\"nth\":cols},\"bands\":[[y0,y1,\"#hex\"],…≤3 paint rings in the part's local Y]}. " +
    "TYPES: cylinder{r|rb,rt,h} (centered on pos, along Y), cone{rb,h}, sphere{r}, capsule{r,h}, torus{R,r}, box{size:[x,y,z]}, lathe{profile:[[radius,y],…] or \"ogive(r,h)\" | \"dome(r)\" | \"bell(r0,r1,h)\" | \"capsule(r,h)\" | \"vase(r,h)\"} (revolved around Y from its own origin up), extrude{shape:[[x,y],…] polygon in XY,depth} for fins/wings/plates/brackets, tube{path:[[x,y,z],…],r} for pipes/cables/antennas. Repeat a part around an axis with {\"t\":\"array\",\"n\":4,\"axis\":\"y\",\"start\":deg,\"of\":{part placed at its radius}}. " +
    "OUTPUT RULES: the ```model3d block is REQUIRED — never answer with only text like \"here is the car\". Write COMPACT minified JSON (numbers with ≤2 decimals, no indentation, no comments), at most ~45 parts (use mirror and array for symmetric/repeated parts), nothing after the block. QUALITY RULES: real proportions; build 15-60 parts with the small details that make it believable (rings, seams, panels, struts, vents, rivets via arrays, lights, windows as glass, nozzles, wheels with torus tyres + cylinder hubs, handles, antennas); use metal 0.6-1 + rough 0.2-0.45 for metal, rough 0.5-0.9 for plastic/paint/wood, glass for windows, emissive + anim for fire/lights; keep a coherent 3-colour palette; never use flat primitives alone (a rocket is NOT a square + triangle). Example (rocket): ```model3d\n" + EXAMPLE + "\n```";

  /* ================================================================ chat widget */
  function parseSpec(raw) {
    var s = String(raw || "").trim().replace(/^```(?:json|model3d)?\s*|\s*```$/g, ""), a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a < 0 || b < 0) throw new Error("no JSON found"); s = s.slice(a, b + 1);
    try { return JSON.parse(s); } catch (e) { s = s.replace(/\/\/[^\n]*/g, "").replace(/,\s*([}\]])/g, "$1"); try { return JSON.parse(s); } catch (e2) { return repair(String(raw)); } }
  }
  /* truncated output (model ran out of tokens): keep every complete part and close the brackets */
  function repair(raw) {
    var t = String(raw).replace(/^```(?:json|model3d)?\s*/i, "").replace(/```\s*$/, ""), a = t.indexOf("{"); if (a < 0) throw new Error("no JSON found"); t = t.slice(a);
    var pi = t.indexOf('"parts"'); if (pi < 0) throw new Error("truncated JSON");
    var arr = t.indexOf("[", pi), depth = 0, inS = false, esc = false, last = -1, i;
    for (i = arr + 1; i < t.length; i++) { var c = t[i]; if (inS) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inS = false; continue; } if (c === '"') inS = true; else if (c === "{" || c === "[") depth++; else if (c === "}" || c === "]") { if (depth === 0) { last = i - 1; break; } depth--; if (depth === 0 && c === "}") last = i; } }
    if (last < 0) throw new Error("truncated JSON");
    var head = t.slice(0, arr + 1), body = t.slice(arr + 1, last + 1).replace(/,\s*$/, "");
    return JSON.parse((head + body + "]}").replace(/\/\/[^\n]*/g, "").replace(/,\s*([}\]])/g, "$1"));
  }
  function sniff(str) { return /"parts"\s*:\s*\[/.test(str) && /"t"\s*:\s*"(cylinder|cone|sphere|capsule|torus|box|lathe|extrude|tube|array)"/.test(str); }
  async function ai(sys, usr) { if (typeof window.fetchAI !== "function") throw new Error("AI unavailable"); var r = await window.fetchAI([{ role: "system", content: sys }, { role: "user", content: usr }], false, false); return String(typeof r === "string" ? r : (r && r.content) || ""); }
  var CSS = ".m3{color:#F4EBDD}.m3-st{position:relative;height:min(62vh,400px);min-height:280px;overflow:hidden;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);background:#0c0a08}.m3-st.full{position:fixed;inset:0;z-index:10040;height:auto;border:0}.m3-hint{position:absolute;left:0;right:0;bottom:8px;text-align:center;font:500 11px 'Space Grotesk','Vazirmatn',sans-serif;color:rgba(255,255,255,.45);pointer-events:none}.m3-info{position:absolute;left:12px;top:10px;font:600 10.5px 'Space Mono',monospace;color:rgba(255,255,255,.5);letter-spacing:.06em;pointer-events:none}" +
    ".m3-info.bld{color:#F4D98B}.m3-bar{display:flex;gap:6px;padding:10px 12px 4px;overflow-x:auto;scrollbar-width:none;align-items:center}.m3-bar::-webkit-scrollbar{display:none}.m3-b{flex:none;height:34px;padding:0 12px;border-radius:11px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);color:#F4EBDD;font:600 12.5px 'Space Grotesk','Vazirmatn',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}.m3-b.on{background:#F4D98B;color:#1a1206;border-color:transparent}.m3-bar label{flex:none;display:flex;align-items:center;gap:8px;font:600 12px 'Space Grotesk','Vazirmatn',sans-serif;opacity:.85}.m3-bar input[type=range]{width:96px;accent-color:#F4D98B}" +
    ".m3-in{display:flex;gap:8px;padding:6px 12px 12px}.m3-in input{flex:1;min-width:0;height:42px;border-radius:13px;border:1px solid rgba(244,217,139,.3);background:rgba(255,255,255,.06);color:#fff;padding:0 13px;font:14px 'Space Grotesk','Vazirmatn',sans-serif;outline:0;-webkit-user-select:text;user-select:text}.m3-in .m3-b{height:42px}.m3-err{padding:14px;font-size:13.5px;line-height:1.6;color:#ff8d7f}.m3-st .m3-x{position:absolute;right:10px;top:10px;z-index:3;width:34px;height:34px;border-radius:50%;border:0;background:rgba(0,0,0,.5);color:#fff;font-size:15px;cursor:pointer;display:none}.m3-st.full .m3-x{display:block}";
  var st = D.createElement("style"); st.id = "m3-css"; st.textContent = CSS; D.head.appendChild(st);

  function widget(root, raw) {
    var spec, hist = [], api = null, cfgRaw = raw;
    root.classList.add("m3");
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + esc(T("b")) + '</span><span class="phr-w-title"></span></div><div class="m3-st"><div class="m3-info"></div><button class="m3-x" data-a="full">✕</button><div class="m3-hint">' + esc(T("hint")) + '</div></div><div class="m3-bar"><button class="m3-b on" data-a="auto">' + esc(T("auto")) + '</button><button class="m3-b" data-a="wire">' + esc(T("wire")) + '</button><label>' + esc(T("explode")) + ' <input type="range" min="0" max="100" value="0" data-a="expl"></label><button class="m3-b" data-a="look">' + esc(T("look")) + ': studio</button><button class="m3-b" data-a="replay">' + esc(T("replay")) + '</button><button class="m3-b" data-a="png">' + esc(T("png")) + '</button><button class="m3-b" data-a="full">⤢</button><button class="m3-b" data-a="undo" hidden>' + esc(T("undo")) + '</button><button class="m3-b" data-a="copy">' + esc(T("copy")) + '</button></div><div class="m3-in"><input type="text" placeholder="' + esc(T("change")) + '"><button class="m3-b on" data-a="apply">' + esc(T("go")) + "</button></div>";
    var stage = root.querySelector(".m3-st"), info = root.querySelector(".m3-info"), looks = ["studio", "space", "sunset"], li = 0;
    function seenKey(sp) { try { var h = 0, t = JSON.stringify(sp); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return "m3_" + h; } catch (e) { return ""; } }
    function fresh(sp) { try { if (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches) return false; var k = seenKey(sp), L = JSON.parse(localStorage.getItem("phr_m3_seen") || "[]"); if (L.indexOf(k) >= 0) return false; L.push(k); localStorage.setItem("phr_m3_seen", JSON.stringify(L.slice(-150))); return true; } catch (e) { return true; } }
    function stats() { var s = api.stats(); info.textContent = s.parts + " " + T("parts") + " · " + Math.round(s.tris / 1000) + "k " + T("tris"); }
    function play() { if (!api) return; info.classList.add("bld"); api.replay({ onStep: function (i, n, nm) { info.textContent = T("building") + " · " + nm + "  " + (i + 1) + "/" + n; }, onDone: function () { info.classList.remove("bld"); stats(); } }); }
    function show(sp, anim) {
      if (api) { try { api.destroy(); } catch (e) {} } stage.querySelectorAll("canvas").forEach(function (c) { c.remove(); }); var er = stage.querySelector(".m3-err"); if (er) er.remove();
      try { api = mount(stage, sp, { look: sp.env }); if (anim !== false && fresh(sp)) play(); li = Math.max(0, looks.indexOf(api.state.look)); if (!info.classList.contains("bld")) stats(); root.querySelector(".phr-w-title").textContent = sp.title || ""; root.querySelector('[data-a="look"]').textContent = T("look") + ": " + api.state.look; spec = sp; return true; }
      catch (e) { console.warn("[model3d]", e); var d = D.createElement("div"); d.className = "m3-err"; d.innerHTML = esc(T("err")) + ": " + esc(e.message || e) + '<div style="margin-top:10px"><button class="m3-b on" data-a="fix">' + esc(T("fix")) + "</button></div>"; stage.appendChild(d); return false; }
    }
    try { spec = parseSpec(raw); } catch (e) { spec = null; }
    if (spec) show(spec); else { var d = D.createElement("div"); d.className = "m3-err"; d.innerHTML = esc(T("err")) + '<div style="margin-top:10px"><button class="m3-b on" data-a="fix">' + esc(T("fix")) + "</button></div>"; stage.appendChild(d); }
    async function change(instr, errMsg) {
      var btn = root.querySelector('[data-a="apply"]'), old = btn.textContent; btn.textContent = "…"; btn.disabled = true; info.textContent = T("working");
      try {
        var out = await ai("You are a master 3D modeller. " + PROMPT.replace(/^3D MODELS:[^.]*\./, "").replace(/ Example \(rocket\)[\s\S]*$/, "") + " Reply with ONLY the complete updated JSON spec (no fences, no commentary).", (spec ? "Current spec:\n" + JSON.stringify(spec) + "\n\n" : "Broken spec:\n" + cfgRaw + "\n\n") + (errMsg ? "It failed to build: " + errMsg + "\n" : "") + "Request: " + instr);
        var sp = parseSpec(out); build(sp); if (spec) hist.push(spec); if (show(sp)) root.querySelector('[data-a="undo"]').hidden = !hist.length;
      } catch (e) { info.textContent = T("err"); } finally { btn.textContent = old; btn.disabled = false; }
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b || b.type === "range") return; var a = b.getAttribute("data-a");
      if (a === "auto") { var on = !b.classList.contains("on"); b.classList.toggle("on", on); api && api.auto(on); }
      else if (a === "wire") { var w = !b.classList.contains("on"); b.classList.toggle("on", w); api && api.wire(w); }
      else if (a === "look") { li = (li + 1) % looks.length; api && api.look(looks[li]); b.textContent = T("look") + ": " + looks[li]; }
      else if (a === "replay") { play(); }
      else if (a === "png") { if (!api) return; var u = api.png(), l = D.createElement("a"); l.href = u; l.download = ((spec && spec.title) || "model").replace(/[^\w-]+/g, "-") + ".png"; D.body.appendChild(l); l.click(); l.remove(); }
      else if (a === "full") { var f = stage.classList.toggle("full"); D.body.style.overflow = f ? "hidden" : ""; }
      else if (a === "undo") { var p = hist.pop(); if (p) show(p); b.hidden = !hist.length; }
      else if (a === "copy") { try { navigator.clipboard.writeText(JSON.stringify(spec)); } catch (x) {} var o = b.textContent; b.textContent = T("ok"); setTimeout(function () { b.textContent = o; }, 1100); }
      else if (a === "apply") { var v = root.querySelector(".m3-in input"); if (v.value.trim()) { change(v.value.trim()); v.value = ""; } }
      else if (a === "fix") change("Fix this model so it builds and looks professional.", "invalid or empty spec");
    });
    root.addEventListener("input", function (e) { if (e.target.getAttribute("data-a") === "expl" && api) api.explode(e.target.value / 100); });
    root.querySelector(".m3-in input").addEventListener("keydown", function (e) { if (e.key === "Enter") root.querySelector('[data-a="apply"]').click(); });
    root._m3 = { api: function () { return api; }, spec: function () { return spec; } };
  }
  if (W && W.builders) {
    var oldKind = W.kindOf; W.kindOf = function (l) { return /^(model3d|3d|model-3d)$/i.test(String(l || "")) ? "model3d" : oldKind(l); }; W.kinds.model3d = 1;
    W.builders.model3d = function (root) { var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {} widget(root, raw); };
  }
  window.PHR_MODEL3D = { sniff: sniff, repair: repair, prompt: function () { return PROMPT; }, example: EXAMPLE, mount: mount, parse: parseSpec, build: build };
})();
