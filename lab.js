/* Phraortes virtual lab — ```lab  experiment: volcano | mg-acid | elephant | titration | alkali
   Realistic canvas simulations: the user (or the AI) adds reagents from a shelf and the reaction runs. */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var inline = function (s) { return window.PHR_inline ? window.PHR_inline(s) : esc(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toFa(n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  var TAU = Math.PI * 2, clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function mkR(seed) { var s = seed || 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  var S = {
    en: { lab: "LAB", reset: "Reset", slow: "Slow-mo", explain: "Explain it", shelf: "REAGENT SHELF · TAP TO ADD", temp: "TEMP", gas: "GAS", ph: "pH", idle: "idle", reacting: "reacting", done: "done", empty: "Add reagents to start", testGas: "Test the gas", pop: "Squeaky pop → hydrogen", drip: "+0.5 mL", pour: "+2 mL", auto: "Auto drip", stop: "Stop", safety: "Simulation only. Never try this with real alkali metals.", vol: "VOLUME", end: "Endpoint!" },
    fa: { lab: "آزمایشگاه", reset: "از نو", slow: "حرکت آهسته", explain: "توضیح بده", shelf: "قفسه مواد · برای افزودن لمس کن", temp: "دما", gas: "گاز", ph: "pH", idle: "آماده", reacting: "در حال واکنش", done: "تمام", empty: "برای شروع ماده اضافه کن", testGas: "آزمون گاز", pop: "صدای «پَق» → هیدروژن", drip: "+۰٫۵ mL", pour: "+۲ mL", auto: "چکیدن خودکار", stop: "توقف", safety: "فقط شبیه‌سازی است؛ هرگز با فلز قلیایی واقعی امتحان نکن.", vol: "حجم", end: "نقطه پایان!" }
  };

  /* ---------- drawing helpers ---------- */
  function rgb(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function bubble(x, px, py, r, c, alpha) {
    var g = x.createRadialGradient(px - r * .3, py - r * .35, r * .05, px, py, r);
    g.addColorStop(0, rgb(mix(c, [255, 255, 255], .75), (alpha || 1) * .85)); g.addColorStop(.4, rgb(c, (alpha || 1) * .55)); g.addColorStop(1, rgb(mix(c, [0, 0, 0], .55), (alpha || 1) * .6));
    x.fillStyle = rgb(c, (alpha || 1)); x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    x.fillStyle = "rgba(255,255,255," + (.7 * (alpha || 1)) + ")"; x.beginPath(); x.arc(px - r * .36, py - r * .4, Math.max(.5, r * .16), 0, TAU); x.fill();
  }
  function airBubble(x, px, py, r, a) {
    x.strokeStyle = "rgba(235,245,255," + (.55 * a) + ")"; x.lineWidth = Math.max(.7, r * .18); x.beginPath(); x.arc(px, py, r, 0, TAU); x.stroke();
    var g = x.createRadialGradient(px - r * .3, py - r * .3, 0, px, py, r); g.addColorStop(0, "rgba(255,255,255," + (.35 * a) + ")"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
  }
  function glass(x, l, t, wd, ht, level, col, opt) {
    opt = opt || {}; var r = opt.r == null ? 10 : opt.r, lh = ht * level;
    x.save(); x.beginPath(); x.moveTo(l, t); x.lineTo(l, t + ht - r); x.quadraticCurveTo(l, t + ht, l + r, t + ht); x.lineTo(l + wd - r, t + ht); x.quadraticCurveTo(l + wd, t + ht, l + wd, t + ht - r); x.lineTo(l + wd, t);
    if (lh > 1 && col) { x.save(); x.clip(); var g = x.createLinearGradient(0, t + ht - lh, 0, t + ht); g.addColorStop(0, rgb(col, .78)); g.addColorStop(1, rgb(mix(col, [0, 0, 0], .25), .92)); x.fillStyle = g; x.fillRect(l, t + ht - lh, wd, lh + 2); x.fillStyle = rgb(mix(col, [255, 255, 255], .5), .5); x.fillRect(l, t + ht - lh, wd, 2); x.restore(); opt.clipLiquid && 0; }
    x.restore();
  }
  function glassRim(x, l, t, wd, ht, r) {
    r = r == null ? 10 : r; x.save(); x.strokeStyle = "rgba(225,240,255,.5)"; x.lineWidth = 2.2; x.beginPath(); x.moveTo(l, t); x.lineTo(l, t + ht - r); x.quadraticCurveTo(l, t + ht, l + r, t + ht); x.lineTo(l + wd - r, t + ht); x.quadraticCurveTo(l + wd, t + ht, l + wd, t + ht - r); x.lineTo(l + wd, t); x.stroke();
    var g = x.createLinearGradient(l, 0, l + wd, 0); g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(.12, "rgba(255,255,255,0)"); g.addColorStop(.86, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.12)"); x.fillStyle = g; x.fillRect(l, t, wd, ht);
    x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(l + 5, t + 8, 3, ht * .55); x.restore();
  }
  function table(x, w, h, y) { var g = x.createLinearGradient(0, y, 0, h); g.addColorStop(0, "#2a2f36"); g.addColorStop(1, "#14171b"); x.fillStyle = g; x.fillRect(0, y, w, h - y); x.fillStyle = "rgba(255,255,255,.06)"; x.fillRect(0, y, w, 1.5); }
  function backdrop(x, w, h) { var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0e1319"); g.addColorStop(1, "#171b21"); x.fillStyle = g; x.fillRect(0, 0, w, h); var v = x.createRadialGradient(w / 2, h * .45, 20, w / 2, h * .45, w * .8); v.addColorStop(0, "rgba(255,255,255,.04)"); v.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = v; x.fillRect(0, 0, w, h); }

  /* ================= ENGINES =================
     each: function(w,h) → { reagents:[{id,en,fa,col,unit,step}], add(id), actions:[{id,en,fa}], act(id), update(dt), draw(x), read(), eq(), reset(), amounts() } */

  /* ---- 1. chemical volcano ---- */
  function eVolcano(w, h) {
    var R = mkR(5), cx = w / 2, base = h - 6, ctop = h - Math.min(175, h * .5), rim = 24;
    function surf(px) { var d = Math.abs(px - cx); if (d < rim) return ctop + Math.pow(d / rim, 2) * 5; var t = (d - rim) / (w / 2 - rim + 14); return ctop + 5 + (base - ctop - 5) * (1 - Math.pow(1 - Math.min(1, t), 1.9)) * 1.02; }
    var bg = null, fo = null, fx = null, dpr = 2;
    function build(D) { dpr = D; bg = document.createElement("canvas"); bg.width = w * D; bg.height = h * D; var b = bg.getContext("2d"); b.scale(D, D); b.fillStyle = "#0f1318"; b.fillRect(0, 0, w, h);
      b.beginPath(); b.moveTo(0, h); for (var px = 0; px <= w; px += 2) b.lineTo(px, surf(px)); b.lineTo(w, h); b.closePath(); var rg = b.createLinearGradient(0, ctop, 0, base); rg.addColorStop(0, "#6b5849"); rg.addColorStop(.55, "#463529"); rg.addColorStop(1, "#251b15"); b.fillStyle = rg; b.fill(); b.save(); b.clip();
      var Rr = mkR(9); for (var i = 0; i < 4200; i++) { var qx = Rr() * w, qy = ctop + Rr() * (h - ctop); if (qy < surf(qx)) continue; var l = Rr() > .5; b.fillStyle = l ? "rgba(255,230,200," + (.02 + Rr() * .05) + ")" : "rgba(0,0,0," + (.05 + Rr() * .12) + ")"; b.beginPath(); b.ellipse(qx, qy, 1 + Rr() * 3.5, .5 + Rr() * 1.6, (qx - cx) * .01, 0, TAU); b.fill(); }
      var sh = b.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, "rgba(255,200,150,.12)"); sh.addColorStop(.5, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.4)"); b.fillStyle = sh; b.fillRect(0, 0, w, h); b.restore();
      fo = document.createElement("canvas"); fo.width = w * D; fo.height = h * D; fx = fo.getContext("2d"); fx.scale(D, D); }
    var F = [], Fs = [], Pl = [], Sm = [], st;
    function reset() { st = { soda: 0, vin: 0, soap: 0, dye: 0, sulf: 0, nS: 0, nA: 0, co2: 0, foam: 0, T: 21, ph: 7, tot: 0, t: 0 }; F = []; Fs = []; var Rr = mkR(21); for (var i = 0; i < 4200; i++) F.push({ side: Rr() < .5 ? -1 : 1, u: Math.pow(Rr(), .9), n: Rr(), r: 2.2 + Rr() * 4.4, j: Rr(), d: 0 });
      for (var k = 0; k < 7; k++) { var tx = (k - 3) * (w / 6.2) + (Rr() - .5) * 20, ph = Rr() * 6, len = .55 + Rr() * .4; for (i = 0; i < 230; i++) { var u = Math.pow(Rr(), .8) * len; Fs.push({ u: u, k: k, x: cx + tx * u + Math.sin(u * 9 + ph) * 8 * u + (Rr() - .5) * (9 - u * 3), y: ctop + 8 + (h - ctop - 16) * Math.pow(u, 1.15) + (Rr() - .5) * 6, r: (2.6 + Rr() * 3.4) * (1 - u * .35), j: Rr(), d: 0, o: Rr() * 14 }); } }
      Pl = []; Sm = []; if (fx) fx.clearRect(0, 0, w, h); }
    reset();
    var DYES = [[225, 80, 34], [60, 130, 230], [70, 190, 110], [220, 70, 150]];
    function fcol(j) { var d = DYES[st.dye % DYES.length], k = .85 + j * .3; return [d[0] * k, d[1] * k, d[2] * k]; }
    function pos(f, off) { var px = cx + f.side * (rim * .2 + f.u * (w / 2 - rim * .2 + 8)); return [px, surf(px) - off]; }
    return {
      reagents: [{ id: "soda", en: "Soda", fa: "جوش‌شیرین", col: [235, 230, 214], unit: "g", step: 10, key: "soda", f: .75 }, { id: "vin", en: "Vinegar", fa: "سرکه", col: [231, 217, 168], unit: "mL", step: 75, key: "vin", f: .7 }, { id: "soap", en: "Soap", fa: "مایع ظرف‌شویی", col: [255, 122, 168], unit: "mL", step: 5, key: "soap", f: .5 }, { id: "dye", en: "Dye", fa: "رنگ", col: [220, 70, 70], unit: "", step: 1, key: "dye", f: .6, nocount: 1 }, { id: "sulf", en: "Sulfur", fa: "گوگرد", col: [232, 210, 74], unit: "g", step: 5, key: "sulf", f: .6 }],
      actions: [], build: build, reset: reset, amounts: function () { return { soda: st.soda, vin: st.vin, soap: st.soap, sulf: st.sulf }; },
      add: function (id, n) { n = n || 1; if (id === "dye") { st.dye++; return; } var r = this.reagents.filter(function (q) { return q.id === id; })[0]; if (!r) return; st[r.key] += r.step * n; if (id === "soda") st.nS += r.step * n / 84; if (id === "vin") st.nA += r.step * n * .00083; },
      act: function () { },
      update: function (dt) {
        st.t += dt; var m = Math.min(st.nS, st.nA), r = m > 1e-6 ? m * (1 - Math.exp(-dt * .55)) : 0; if (m < 2e-5) r = m;
        if (r > 0) { st.nS -= r; st.nA -= r; st.co2 += r * 24; st.cons = (st.cons || 0) + r; var amp = st.soap > 0 ? (.8 + st.soap / 8) : .12; st.foam += r * 24 * amp * 2.6; st.T = Math.max(14, st.T - r * 90 * .3); }
        st.T += (21 - st.T) * dt * .02; var tot0 = (st.cons || 0) + Math.min(st.nS, st.nA); st.ph = st.nS > 1e-5 && st.nA < 1e-5 ? 8.3 : st.nA > 1e-5 ? (st.nS > 1e-5 ? 5.4 : 3.2) : 7;
        if (!st.soda && !st.vin) st.ph = 7; this.rate = r / Math.max(dt, 1e-3);
        var spawn = Math.min(14, Math.round(r * 24 * 520 * (st.soap > 0 ? 1 : .15)));
        for (var i = 0; i < spawn; i++) { var a = -Math.PI / 2 + (R() - .5) * 1.05, v = 2.4 + R() * 3.4; Pl.push({ x: cx + (R() - .5) * 16, y: ctop - 2, vx: Math.cos(a) * v * .55, vy: Math.sin(a) * v * .9, r: 2 + R() * 3.4, l: 0, j: R() }); }
        if (r > 0 && Math.random() < .5) Sm.push({ x: cx + (R() - .5) * 24, y: ctop - 6, vx: (R() - .5) * .3, vy: -.45 - R() * .5, r: 8 + R() * 8, a: .17 });
        for (i = Pl.length - 1; i >= 0; i--) { var p = Pl[i]; p.vy += .16 * 60 * dt * .6; p.x += p.vx * 60 * dt * .6; p.y += p.vy * 60 * dt * .6; if (p.y > surf(p.x) - 2 || p.y > h) Pl.splice(i, 1); }
        for (i = Sm.length - 1; i >= 0; i--) { var q = Sm[i]; q.x += q.vx; q.y += q.vy; q.r += .15; q.a *= .988; if (q.a < .01) Sm.splice(i, 1); }
        // grow foam mass
        var front = clamp(st.foam / 14, 0, 1) * .8, th = clamp(st.foam / 11, 0, 1);
        for (i = 0; i < F.length; i++) { var f = F[i]; if (f.d || f.u > front) continue; var mx = (24 - f.u * 13) * (.4 + .6 * (1 - f.u)), need = f.n * (24 - f.u * 13) * (.4 + .6 * (1 - f.u)); if (need > th * mx * 1.0 + .001 && f.u > .05) continue; f.d = 1; var o = f.n * th * mx; var pp = pos(f, o + f.r * .4); bubble(fx, pp[0], pp[1], f.r * (.8 + .5 * th), fcol(f.j)); }
        var f2 = clamp(st.foam / 16, 0, 1); for (i = 0; i < Fs.length; i++) { var s = Fs[i]; if (s.d || s.u > f2 * .95) continue; s.d = 1; bubble(fx, s.x, s.y, s.r, fcol(s.j)); }
        this.state = r > 1e-6 ? "reacting" : (st.cons ? "done" : "idle");
      },
      draw: function (x) {
        x.drawImage(bg, 0, 0, w, h);
        var gl = x.createRadialGradient(cx, ctop, 5, cx, ctop, 190), d = fcol(.5), act = this.state === "reacting" ? 1 : .35; gl.addColorStop(0, rgb(d, .26 * act)); gl.addColorStop(1, rgb(d, 0)); x.fillStyle = gl; x.fillRect(0, 0, w, h);
        // crater liquid
        if (st.vin > 0 || st.soda > 0) { x.fillStyle = st.soda > st.vin / 8 && st.vin < 1 ? "rgba(235,230,214,.9)" : "rgba(210,190,140,.8)"; x.beginPath(); x.ellipse(cx, ctop + 1, rim * .85, 4, 0, 0, TAU); x.fill(); }
        if (st.sulf > 0) { x.fillStyle = "rgba(232,210,74,.9)"; for (var i = 0; i < Math.min(40, st.sulf * 3); i++) { x.beginPath(); x.arc(cx + (Math.sin(i * 12.9) * rim * .9), ctop + 1 + Math.cos(i * 7.3) * 3, 1.3, 0, TAU); x.fill(); } }
        x.drawImage(fo, 0, 0, w, h);
        for (i = 0; i < Pl.length; i++) { var p = Pl[i]; bubble(x, p.x, p.y, p.r, fcol(p.j)); }
        var sc = st.sulf > 0 ? [225, 215, 120] : [200, 196, 192];
        for (i = 0; i < Sm.length; i++) { var q = Sm[i], g = x.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); g.addColorStop(0, rgb(sc, q.a)); g.addColorStop(1, rgb(sc, 0)); x.fillStyle = g; x.beginPath(); x.arc(q.x, q.y, q.r, 0, TAU); x.fill(); }
        var vg = x.createRadialGradient(cx, h * .6, 70, cx, h * .6, 270); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.45)"); x.fillStyle = vg; x.fillRect(0, 0, w, h);
      },
      read: function () { return { temp: st.T, gas: st.co2, ph: st.ph, gasName: "CO₂" }; },
      eq: function () { var e = "NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂↑"; if (st.sulf > 0) e += "\nS + O₂ → SO₂↑  (real volcanoes)"; return (st.soda || st.vin) ? e : null; }
    };
  }

  /* ---- 2. magnesium in acid ---- */
  function eMg(w, h) {
    var R = mkR(3), bw = Math.min(190, w * .55), bl = (w - bw) / 2, bt = 40, bh = h - 80, st, B = [], pop = 0, pops = 0;
    function reset() { st = { aMol: 0, mMol: 0, mg0: 0, vol: 0, T: 21, h2: 0, ph: 7, cons: 0, hcl: 0, wat: 0, mg: 0 }; B = []; pop = 0; }
    reset();
    return {
      reagents: [{ id: "hcl", en: "HCl 1 M", fa: "HCl یک مولار", col: [220, 235, 240], unit: "mL", step: 25, key: "hcl", f: .7 }, { id: "wat", en: "Water", fa: "آب", col: [160, 210, 255], unit: "mL", step: 25, key: "wat", f: .6 }, { id: "mg", en: "Mg ribbon", fa: "نوار منیزیم", col: [190, 196, 205], unit: "g", step: .5, key: "mg", f: .4 }],
      actions: [{ id: "test", en: "Test the gas", fa: "آزمون گاز" }],
      reset: reset, amounts: function () { return { hcl: st.hcl, wat: st.wat, mg: +(st.mMol * 24.3).toFixed(2) }; },
      add: function (id, n) { n = n || 1; if (st.vol >= 150 && id !== "mg") return; if (id === "hcl") { st.hcl += 25 * n; st.aMol += .025 * n; st.vol += 25 * n; } if (id === "wat") { st.wat += 25 * n; st.vol += 25 * n; } if (id === "mg") { st.mg += .5 * n; st.mMol += .5 * n / 24.3; st.mg0 += .5 * n / 24.3; } },
      act: function (id) { if (id === "test" && st.h2 > .02) { pop = 1; pops = Math.min(1, st.h2); } },
      update: function (dt) {
        var conc = st.vol > 0 ? st.aMol / (st.vol / 1000) : 0, dm = 0;
        if (st.mMol > 1e-6 && st.aMol > 2e-6) { var k = .16 * conc * (1 + (st.T - 20) / 25); dm = Math.min(st.mMol, st.aMol / 2) * (1 - Math.exp(-dt * Math.max(k, .01))); if (dm < 1e-7) dm = Math.min(st.mMol, st.aMol / 2) * .5; }
        if (dm > 0) { st.mMol -= dm; st.aMol -= 2 * dm; st.h2 += dm * 24; st.cons += dm; st.T += dm * 466000 / (Math.max(st.vol, 20) * 4.18); }
        st.T += (21 - st.T) * dt * .035;
        var cH = st.vol > 0 ? Math.max(st.aMol, 0) / (st.vol / 1000) : 0; st.ph = !st.vol ? 7 : cH > 1e-4 ? clamp(-Math.log10(cH), 0, 7) : (st.mMol > 1e-6 ? 9.6 : 7);
        this.rate = dm / Math.max(dt, 1e-3); var n = Math.min(6, Math.round(dm * 24 * 900 + (dm > 0 ? Math.random() : 0)));
        var lvl = clamp(st.vol / 150, 0, .9) * bh, surfY = bt + bh - lvl, rl = bl + bw * .22, rt = bt + bh - 6;
        for (var i = 0; i < n; i++) B.push({ x: bl + 14 + R() * (bw - 30) * .55 + bw * .12, y: bt + bh - 14 - R() * 20, r: 1.6 + R() * 3.4, vy: -(30 + R() * 50), ph: R() * 6 });
        for (i = B.length - 1; i >= 0; i--) { var b = B[i]; b.y += b.vy * dt; b.x += Math.sin(b.ph + b.y * .06) * .35; b.vy -= 10 * dt; if (b.y < surfY + 2) B.splice(i, 1); }
        if (pop > 0) pop -= dt * 1.4; this.state = dm > 0 ? "reacting" : (st.cons ? "done" : "idle");
      },
      draw: function (x) {
        backdrop(x, w, h); table(x, w, h, bt + bh + 2);
        var lvl = clamp(st.vol / 150, 0, .9), liq = st.vol ? mix([200, 225, 235], [230, 240, 235], clamp(st.cons * 25, 0, 1)) : null;
        // glow when hot
        if (st.T > 30) { var gg = x.createRadialGradient(w / 2, bt + bh * .7, 10, w / 2, bt + bh * .7, 160); gg.addColorStop(0, "rgba(255,160,90," + clamp((st.T - 30) / 90, 0, .25) + ")"); gg.addColorStop(1, "rgba(255,160,90,0)"); x.fillStyle = gg; x.fillRect(0, 0, w, h); }
        glass(x, bl, bt, bw, bh, lvl, liq, { r: 12 });
        // ribbon
        var lh = bh * lvl, frac = st.mg0 > 0 ? st.mMol / st.mg0 : 0;
        if (st.mMol > 1e-6) { var rl = bl + bw * .3, rb = bt + bh - 8, len = Math.min(bh * .8, 20 + st.mMol * 24.3 * 80) * (.35 + .65 * frac); x.save(); x.strokeStyle = "#b9bec6"; x.lineWidth = 5; x.lineCap = "round"; x.beginPath(); x.moveTo(rl, rb); x.quadraticCurveTo(rl + 10, rb - len * .5, rl + 22 + Math.sin(len) * 3, rb - len); x.stroke(); x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(rl - 1, rb); x.quadraticCurveTo(rl + 9, rb - len * .5, rl + 21, rb - len); x.stroke(); x.restore(); }
        for (var i = 0; i < B.length; i++) airBubble(x, B[i].x, B[i].y, B[i].r, .95);
        // foam at surface
        if (this.state === "reacting") { var sy = bt + bh - lh; for (i = 0; i < 18; i++) airBubble(x, bl + 8 + (i * 37 % (bw - 16)), sy + 1 + Math.sin(i * 3 + Date.now() / 260) * 1.5, 2 + (i % 3), .8); }
        glassRim(x, bl, bt, bw, bh, 12);
        // lip
        x.strokeStyle = "rgba(225,240,255,.55)"; x.lineWidth = 3; x.beginPath(); x.moveTo(bl - 5, bt); x.lineTo(bl + bw + 5, bt); x.stroke();
        // graduation
        x.fillStyle = "rgba(255,255,255,.4)"; x.font = "600 9px IBM Plex Mono,monospace"; for (i = 1; i <= 4; i++) { var gy = bt + bh - bh * .9 * i / 4 * 1; x.fillRect(bl + bw - 16, gy, 12, 1.2); x.fillText(String(i * 37), bl + bw - 36, gy + 3); }
        // splint + pop
        if (pop > 0) { var px = w - 70, py = bt + 20; x.save(); x.strokeStyle = "#8a6a3a"; x.lineWidth = 3; x.beginPath(); x.moveTo(px + 40, py + 40); x.lineTo(px, py); x.stroke(); var fl = x.createRadialGradient(px, py, 0, px, py, 30 * (2 - pop)); fl.addColorStop(0, "rgba(255,255,230," + pop + ")"); fl.addColorStop(.4, "rgba(255,170,60," + pop * .8 + ")"); fl.addColorStop(1, "rgba(255,120,30,0)"); x.fillStyle = fl; x.beginPath(); x.arc(px, py, 30 * (2 - pop), 0, TAU); x.fill(); x.fillStyle = "rgba(255,230,160," + pop + ")"; x.font = "700 13px Inter,sans-serif"; x.textAlign = "center"; x.fillText("POP!", px, py - 36); x.restore(); }
        else if (pop <= 0 && pops) { } 
      },
      read: function () { return { temp: st.T, gas: st.h2, ph: st.ph, gasName: "H₂" }; },
      eq: function () { return (st.hcl || st.mg) ? "Mg + 2HCl → MgCl₂ + H₂↑   (exothermic)" : null; }
    };
  }

  /* ---- 3. elephant toothpaste ---- */
  function eElephant(w, h) {
    var R = mkR(11), cw = Math.min(70, w * .2), cl = (w - cw) / 2, ct = h - 128, ch = 112, st, FB = [], Ste = [];
    function reset() { st = { h2o2: 0, soap: 0, dye: 0, cat: 0, T: 21, o2: 0, foam: 0, mol: 0 }; Ste = []; FB = []; var Rr = mkR(31); for (var i = 0; i < 1500; i++) FB.push({ u: Rr(), a: Rr() * TAU, r: 3 + Rr() * 5.2, j: Rr(), s: Rr() }); }
    reset();
    var DY = [[235, 70, 90], [70, 150, 235], [90, 200, 120], [240, 200, 70]];
    function fcol(j, u) { var d = DY[st.dye % DY.length], k = .8 + j * .35, st2 = (Math.floor(u * 9) % 2) ? .75 : 1; return [clamp(d[0] * k * st2 + 20, 0, 255), clamp(d[1] * k * st2 + 20, 0, 255), clamp(d[2] * k * st2 + 20, 0, 255)]; }
    return {
      reagents: [{ id: "h2o2", en: "H₂O₂ 6%", fa: "آب‌اکسیژنه ۶٪", col: [200, 230, 255], unit: "mL", step: 20, key: "h2o2", f: .7 }, { id: "soap", en: "Soap", fa: "مایع ظرف‌شویی", col: [255, 122, 168], unit: "mL", step: 5, key: "soap", f: .5 }, { id: "dye", en: "Dye", fa: "رنگ", col: [235, 70, 90], unit: "", step: 1, key: "dye", nocount: 1, f: .6 }, { id: "cat", en: "Catalyst (yeast)", fa: "کاتالیزور (مخمر)", col: [220, 190, 130], unit: "g", step: 3, key: "cat", f: .4 }],
      actions: [], reset: reset, amounts: function () { return { h2o2: st.h2o2, soap: st.soap, cat: st.cat }; },
      add: function (id, n) { n = n || 1; if (id === "dye") { st.dye++; return; } var r = this.reagents.filter(function (q) { return q.id === id; })[0]; st[r.key] += r.step * n; if (id === "h2o2") st.mol += r.step * n * .00176; },
      act: function () { },
      update: function (dt) {
        var dm = 0; if (st.cat > 0 && st.mol > 1e-6) { dm = st.mol * (1 - Math.exp(-dt * (.25 + st.cat * .09))); st.mol -= dm; st.o2 += dm / 2 * 24; st.foam += dm * 1000 * (st.soap > 0 ? (.5 + st.soap / 9) : .06); st.T += dm * 98000 / 2 / (Math.max(st.h2o2, 20) * 4.18) * .8; }
        st.T += (21 - st.T) * dt * .04; this.rate = dm / Math.max(dt, 1e-3);
        if (st.T > 32 && dm > 0 && Math.random() < .6) Ste.push({ x: w / 2 + (R() - .5) * 40, y: ct - 20 - clamp(st.foam, 0, 1.25) / 1.25 * (ct - 30), vx: (R() - .5) * .3, vy: -.5 - R() * .5, r: 7 + R() * 8, a: .16 });
        for (var i = Ste.length - 1; i >= 0; i--) { var q = Ste[i]; q.x += q.vx; q.y += q.vy; q.r += .18; q.a *= .985; if (q.a < .01) Ste.splice(i, 1); }
        this.state = dm > 1e-8 ? "reacting" : (st.o2 ? "done" : "idle");
      },
      draw: function (x) {
        backdrop(x, w, h); table(x, w, h, ct + ch + 2);
        var lvl = clamp(st.h2o2 / 80, 0, .6) * (st.mol > 1e-6 || !st.cat ? 1 : 0); var liq = st.h2o2 ? (st.soap ? mix([200, 230, 255], DY[st.dye % DY.length], st.dye ? .5 : 0) : [200, 230, 255]) : null;
        glass(x, cl, ct, cw, ch, st.foam > .05 ? 0 : lvl, liq, { r: 8 });
        // foam column
        var CH = ct - 30, H = clamp(st.foam, 0, 1.25) / 1.25 * CH, n = Math.floor(FB.length * clamp(st.foam / 1.25, 0, 1));
        for (var i = 0; i < n; i++) { var f = FB[i]; if (f.u * CH > H) continue; var y = ct - f.u * CH + 4, spread = cw * .5 + Math.sin(f.u * 7 + f.a) * 4 + f.u * 10 * (f.s); var px = w / 2 + Math.cos(f.a) * spread * (.2 + .8 * Math.abs(Math.sin(f.a * 2 + f.u * 5))) + Math.sin(f.u * 11) * 5 * f.u; bubble(x, px, y + (st.foam > 1 ? 0 : 0), f.r * (.8 + f.s * .3), fcol(f.j, f.u)); }
        // overflow down the cylinder when big
        if (st.foam > .5) { var ov = clamp((st.foam - .5) / .75, 0, 1) * 110; for (i = 0; i < 260; i++) { var rr = mkR(i * 7 + 3), side = rr() < .5 ? -1 : 1, yy = ct + rr() * ov, xx = w / 2 + side * (cw * .5 + 3 + rr() * 18 * (1 - (yy - ct) / 140)); bubble(x, xx, yy, 3 + rr() * 4, fcol(rr(), rr())); } }
        glassRim(x, cl, ct, cw, ch, 8); x.strokeStyle = "rgba(225,240,255,.55)"; x.lineWidth = 3; x.beginPath(); x.moveTo(cl - 4, ct); x.lineTo(cl + cw + 4, ct); x.stroke();
        for (i = 0; i < Ste.length; i++) { var s = Ste[i], g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r); g.addColorStop(0, "rgba(220,225,230," + s.a + ")"); g.addColorStop(1, "rgba(220,225,230,0)"); x.fillStyle = g; x.beginPath(); x.arc(s.x, s.y, s.r, 0, TAU); x.fill(); }
      },
      read: function () { return { temp: st.T, gas: st.o2, ph: 7, gasName: "O₂" }; },
      eq: function () { return st.h2o2 ? "2H₂O₂ —(catalyst)→ 2H₂O + O₂↑   (exothermic)" : null; }
    };
  }

  /* ---- 4. acid-base titration ---- */
  function eTitr(w, h) {
    var R = mkR(2), st, drops = [], swirl = 0, hist = [], auto = false, aT = 0, topH = Math.round(h * .62);
    function ph(v) { var nA = .0025, nB = v * .0001, V = 25 + v; if (Math.abs(nA - nB) < 1e-9) return 7; if (nB < nA) return -Math.log10((nA - nB) / (V / 1000)); return 14 + Math.log10((nB - nA) / (V / 1000)); }
    function reset() { st = { v: 0, ind: 0, T: 21, acid: 0 }; drops = []; hist = []; swirl = 0; auto = false; }
    reset();
    function inj(a) { if (!st.acid) return; var left = 40 - st.v; a = Math.min(a, left); if (a <= 0) return; st.v += a; var n = Math.max(1, Math.round(a * 4)); for (var i = 0; i < n; i++) drops.push({ y: 28 + R() * 6, v: 60 + R() * 20, l: i * .03 }); swirl = 1; hist.push([st.v, ph(st.v)]); st.T += a * .02; }
    return {
      reagents: [{ id: "acid", en: "HCl 0.1 M · 25 mL", fa: "HCl ۰٫۱ مولار · ۲۵ mL", col: [225, 235, 240], unit: "", step: 1, key: "acid", f: .6, nocount: 1, once: 1 }, { id: "ind", en: "Phenolphthalein", fa: "فنول‌فتالئین", col: [240, 120, 170], unit: "", step: 1, key: "ind", f: .5, nocount: 1, once: 1 }],
      actions: [{ id: "drip", en: "+0.5 mL", fa: "+۰٫۵ mL" }, { id: "pour", en: "+2 mL", fa: "+۲ mL" }, { id: "auto", en: "Auto drip", fa: "چکیدن خودکار" }],
      reset: reset, amounts: function () { return { acid: st.acid ? 25 : 0, indicator: st.ind ? 1 : 0, naoh: +st.v.toFixed(1) }; },
      add: function (id) { if (id === "acid") st.acid = 1; if (id === "ind") st.ind = 1; },
      act: function (id) { if (id === "drip") inj(.5); if (id === "pour") inj(2); if (id === "auto") auto = !auto; },
      update: function (dt) { if (auto) { aT += dt; if (aT > .35) { aT = 0; inj(.5); if (st.v >= 40) auto = false; } } for (var i = drops.length - 1; i >= 0; i--) { var d = drops[i]; if (d.l > 0) { d.l -= dt; continue; } d.y += d.v * dt; d.v += 380 * dt; if (d.y > topH - 120) drops.splice(i, 1); } swirl *= Math.exp(-dt * 1.6); this.state = st.acid ? (drops.length || auto ? "reacting" : (st.v > 0 ? "done" : "idle")) : "idle"; },
      draw: function (x) {
        backdrop(x, w, h); var fx = w * .42, fb = topH - 8, fw = 96, ftop = topH - 120;
        // burette
        var bx = fx, by = 10, bh = 80; x.fillStyle = "rgba(220,235,255,.09)"; x.fillRect(bx - 7, by, 14, bh); var lv = clamp(1 - st.v / 40, 0, 1) * (bh - 8); x.fillStyle = "rgba(200,220,255,.5)"; x.fillRect(bx - 5, by + bh - 4 - lv, 10, lv); x.strokeStyle = "rgba(225,240,255,.55)"; x.lineWidth = 1.6; x.strokeRect(bx - 7, by, 14, bh); x.fillStyle = "rgba(255,255,255,.3)"; for (var i = 0; i < 9; i++) x.fillRect(bx + 7, by + 6 + i * 8, i % 2 ? 4 : 7, 1);
        x.fillStyle = "#9aa3ad"; x.fillRect(bx - 2, by + bh, 4, 12);
        // flask (erlenmeyer)
        var fl = fx - fw / 2, ftp = ftop, fh = 120, neck = 22;
        x.save(); x.beginPath(); x.moveTo(fx - neck / 2, ftp); x.lineTo(fx - neck / 2, ftp + 36); x.lineTo(fl, ftp + fh - 8); x.quadraticCurveTo(fl, ftp + fh, fl + 10, ftp + fh); x.lineTo(fl + fw - 10, ftp + fh); x.quadraticCurveTo(fl + fw, ftp + fh, fl + fw, ftp + fh - 8); x.lineTo(fx + neck / 2, ftp + 36); x.lineTo(fx + neck / 2, ftp); x.closePath();
        var pink = st.ind ? clamp((ph(st.v) - 8.2) / 1.2, 0, 1) : 0, flash = st.ind ? swirl * .5 * (st.v > 0 ? 1 : 0) : 0, col = st.acid ? mix([205, 228, 238], [238, 70, 150], clamp(pink + (ph(st.v) < 8.2 ? flash * (ph(st.v) > 3 ? .5 : 0) : 0), 0, 1)) : null;
        if (col) { x.save(); x.clip(); var lvl = (st.acid ? .5 + st.v / 40 * .1 : 0), g = x.createLinearGradient(0, ftp + fh * (1 - lvl), 0, ftp + fh); g.addColorStop(0, rgb(col, .8)); g.addColorStop(1, rgb(mix(col, [0, 0, 0], .25), .95)); x.fillStyle = g; x.fillRect(fl, ftp + fh * (1 - lvl), fw, fh * lvl + 2); x.restore(); }
        x.strokeStyle = "rgba(225,240,255,.55)"; x.lineWidth = 2.2; x.stroke(); x.fillStyle = "rgba(255,255,255,.3)"; x.fillRect(fx - neck / 2 + 3, ftp + 4, 2.5, 30); x.restore();
        for (i = 0; i < drops.length; i++) { var d = drops[i]; if (d.l > 0) continue; x.fillStyle = "rgba(210,230,255,.9)"; x.beginPath(); x.ellipse(bx, by + bh + 12 + d.y, 2.2, 3.4, 0, 0, TAU); x.fill(); }
        table(x, w, h, topH + 2);
        // chart
        var cl = 42, cr = w - 14, cb = h - 26, ct2 = topH + 18; x.strokeStyle = "rgba(255,255,255,.14)"; x.lineWidth = 1; x.fillStyle = "rgba(255,255,255,.5)"; x.font = "600 9px IBM Plex Mono,monospace"; x.textAlign = "right";
        for (var p = 0; p <= 14; p += 7) { var yy = cb - (cb - ct2) * p / 14; x.beginPath(); x.moveTo(cl, yy); x.lineTo(cr, yy); x.stroke(); x.fillText(String(p), cl - 5, yy + 3); } x.textAlign = "center"; for (var v = 0; v <= 40; v += 10) { var xx = cl + (cr - cl) * v / 40; x.fillText(String(v), xx, cb + 12); }
        x.strokeStyle = "rgba(226,190,106,.3)"; x.setLineDash([3, 4]); var xe = cl + (cr - cl) * 25 / 40; x.beginPath(); x.moveTo(xe, ct2); x.lineTo(xe, cb); x.stroke(); x.setLineDash([]);
        if (hist.length) { x.strokeStyle = "#E2BE6A"; x.lineWidth = 2; x.lineJoin = "round"; x.beginPath(); x.moveTo(cl, cb - (cb - ct2) * ph(0) / 14); var pts = [[0, ph(0)]].concat(hist); pts.forEach(function (q) { x.lineTo(cl + (cr - cl) * q[0] / 40, cb - (cb - ct2) * clamp(q[1], 0, 14) / 14); }); x.stroke(); var l = pts[pts.length - 1]; x.fillStyle = "#E2BE6A"; x.beginPath(); x.arc(cl + (cr - cl) * l[0] / 40, cb - (cb - ct2) * clamp(l[1], 0, 14) / 14, 4, 0, TAU); x.fill(); }
        x.textAlign = "start";
      },
      read: function () { return { temp: st.T, gas: st.v, ph: st.acid ? ph(st.v) : 7, gasName: "NaOH mL" }; },
      eq: function () { return st.acid ? "HCl + NaOH → NaCl + H₂O" + (Math.abs(st.v - 25) < 1 ? "\n≈ equivalence point (25 mL)" : "") : null; }
    };
  }

  /* ---- 5. alkali metals in water (top view) ---- */
  function eAlkali(w, h) {
    var R = mkR(8), cx = w / 2, cy = h / 2 + 4, rad = Math.min(w, h) * .43, st, M = [], Bu = [], Fl = [], Pa = [];
    function reset() { st = { ind: 0, T: 21, h2: 0, oh: 0, water: 1, n: 0 }; M = []; Bu = []; Fl = []; Pa = []; }
    reset();
    var TYP = { li: { c: [190, 195, 205], life: 14, sp: 20, fl: null, b: 5 }, na: { c: [210, 214, 222], life: 7, sp: 65, fl: [255, 190, 50], b: 12 }, k: { c: [200, 205, 215], life: 3.2, sp: 100, fl: [190, 140, 255], b: 20 } };
    return {
      reagents: [{ id: "li", en: "Lithium", fa: "لیتیم", col: [180, 186, 198], unit: "", step: 1, key: "li", nocount: 1, f: .5 }, { id: "na", en: "Sodium", fa: "سدیم", col: [210, 214, 222], unit: "", step: 1, key: "na", nocount: 1, f: .5 }, { id: "k", en: "Potassium", fa: "پتاسیم", col: [200, 205, 215], unit: "", step: 1, key: "k", nocount: 1, f: .5 }, { id: "ind", en: "Phenolphthalein", fa: "فنول‌فتالئین", col: [240, 120, 170], unit: "", step: 1, key: "ind", nocount: 1, once: 1, f: .5 }],
      actions: [], reset: reset, amounts: function () { return { pieces_added: st.n, indicator: st.ind }; },
      add: function (id) { if (id === "ind") { st.ind = 1; return; } var t = TYP[id]; if (!t) return; st.n++; var a = R() * TAU; M.push({ t: id, x: cx + Math.cos(a) * rad * .3, y: cy + Math.sin(a) * rad * .3, vx: Math.cos(a + 1) * t.sp, vy: Math.sin(a + 1) * t.sp, life: t.life * (.8 + R() * .4), age: 0, r: 7 }); },
      act: function () { },
      update: function (dt) {
        for (var i = M.length - 1; i >= 0; i--) { var m = M[i], t = TYP[m.t]; m.age += dt; m.vx += (R() - .5) * t.sp * 9 * dt; m.vy += (R() - .5) * t.sp * 9 * dt; var sp = Math.hypot(m.vx, m.vy), mx = t.sp * 1.4; if (sp > mx) { m.vx *= mx / sp; m.vy *= mx / sp; } m.x += m.vx * dt; m.y += m.vy * dt; var dx = m.x - cx, dy = m.y - cy, d = Math.hypot(dx, dy); if (d > rad - m.r) { var nx = dx / d, ny = dy / d, dot = m.vx * nx + m.vy * ny; m.vx -= 2 * dot * nx; m.vy -= 2 * dot * ny; m.x = cx + nx * (rad - m.r); m.y = cy + ny * (rad - m.r); }
          m.r = 7 * (1 - m.age / m.life * .75); var mol = dt / t.life * .004; st.h2 += mol / 2 * 24 * 10; st.oh += mol; st.T += dt * (m.t === "k" ? .6 : m.t === "na" ? .3 : .1);
          for (var k = 0; k < t.b / 30 * 60 * dt; k++) Bu.push({ x: m.x + (R() - .5) * 8, y: m.y + (R() - .5) * 8, r: 1 + R() * 2.5, l: .5 + R() * .6, a: 1 });
          if (t.fl && Math.random() < .03 * (m.t === "k" ? 3 : 1)) Fl.push({ x: m.x, y: m.y, l: .25, c: t.fl, r: 9 });
          if (m.age >= m.life) { if (m.t !== "li") { for (var q = 0; q < 26; q++) { var a = R() * TAU, s = 80 + R() * 160; Pa.push({ x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: .5 + R() * .4, c: t.fl }); } Fl.push({ x: m.x, y: m.y, l: .4, c: t.fl, r: 34 }); st.T += 1.5; } M.splice(i, 1); } }
        for (i = Bu.length - 1; i >= 0; i--) { Bu[i].l -= dt; if (Bu[i].l <= 0) Bu.splice(i, 1); }
        for (i = Fl.length - 1; i >= 0; i--) { Fl[i].l -= dt; if (Fl[i].l <= 0) Fl.splice(i, 1); }
        for (i = Pa.length - 1; i >= 0; i--) { var p = Pa[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; p.l -= dt; if (p.l <= 0) Pa.splice(i, 1); }
        st.T += (21 - st.T) * dt * .03; this.state = M.length ? "reacting" : (st.n ? "done" : "idle");
      },
      draw: function (x) {
        backdrop(x, w, h); table(x, w, h, 0);
        // dish
        var g = x.createRadialGradient(cx - rad * .3, cy - rad * .3, 10, cx, cy, rad + 14); g.addColorStop(0, "#3b434d"); g.addColorStop(1, "#14171b"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad + 10, 0, TAU); x.fill();
        var ohc = clamp(st.oh / .004, 0, 1), wc = st.ind ? mix([95, 150, 190], [225, 60, 140], clamp(ohc * 1.2, 0, 1)) : [95, 150, 190];
        var wg = x.createRadialGradient(cx - rad * .3, cy - rad * .35, 10, cx, cy, rad); wg.addColorStop(0, rgb(mix(wc, [255, 255, 255], .35), .85)); wg.addColorStop(1, rgb(mix(wc, [0, 0, 0], .3), .95)); x.fillStyle = wg; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill();
        x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.clip();
        x.strokeStyle = "rgba(255,255,255,.06)"; x.lineWidth = 1.2; for (var i = 0; i < 5; i++) { x.beginPath(); x.ellipse(cx, cy, rad * (.3 + i * .16), rad * (.3 + i * .16) * .92, 0, 0, TAU); x.stroke(); }
        for (i = 0; i < Bu.length; i++) airBubble(x, Bu[i].x, Bu[i].y, Bu[i].r, clamp(Bu[i].l * 2, 0, 1));
        for (i = 0; i < M.length; i++) { var m = M[i], t = TYP[m.t], mg = x.createRadialGradient(m.x - m.r * .3, m.y - m.r * .3, 1, m.x, m.y, m.r + 1); mg.addColorStop(0, "#f4f6fa"); mg.addColorStop(1, rgb(t.c, 1)); x.fillStyle = mg; x.beginPath(); x.arc(m.x, m.y, m.r + 1, 0, TAU); x.fill(); x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = .8; x.stroke(); }
        for (i = 0; i < Fl.length; i++) { var f = Fl[i], a = clamp(f.l * 3, 0, 1), fg = x.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); fg.addColorStop(0, "rgba(255,255,235," + a + ")"); fg.addColorStop(.35, rgb(f.c, a * .85)); fg.addColorStop(1, rgb(f.c, 0)); x.fillStyle = fg; x.beginPath(); x.arc(f.x, f.y, f.r, 0, TAU); x.fill(); }
        for (i = 0; i < Pa.length; i++) { var p = Pa[i]; x.fillStyle = rgb(p.c, clamp(p.l * 2, 0, 1)); x.beginPath(); x.arc(p.x, p.y, 1.8, 0, TAU); x.fill(); }
        x.restore(); x.strokeStyle = "rgba(225,240,255,.5)"; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, rad + 5, 0, TAU); x.stroke(); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, rad + 5, Math.PI * 1.05, Math.PI * 1.35); x.stroke();
      },
      read: function () { return { temp: st.T, gas: st.h2, ph: 7 + clamp(st.oh / .004, 0, 1) * 6, gasName: "H₂" }; },
      eq: function () { return st.n ? "2M + 2H₂O → 2MOH + H₂↑  (M = Li, Na, K)" : null; }
    };
  }

  var ENG = { volcano: eVolcano, "mg-acid": eMg, mg: eMg, elephant: eElephant, titration: eTitr, alkali: eAlkali };
  var NAME = { volcano: ["Chemical Volcano", "آتشفشان شیمیایی"], "mg-acid": ["Magnesium in Acid", "منیزیم در اسید"], elephant: ["Elephant Toothpaste", "خمیردندان فیل"], titration: ["Acid–Base Titration", "تیتراسیون اسید و باز"], alkali: ["Alkali Metals in Water", "فلزات قلیایی در آب"] };
  var ALIASK = { mg: "mg-acid", magnesium: "mg-acid", elephanttoothpaste: "elephant", "elephant-toothpaste": "elephant", toothpaste: "elephant", titrate: "titration", alkalimetals: "alkali", sodium: "alkali", metals: "alkali", eruption: "volcano", vulcano: "volcano" };

  /* ---------- css ---------- */
  var st = document.createElement("style"); st.id = "phr-lab-css";
  st.textContent = ".lb-st{position:relative;background:#0e1319;overflow:hidden}.lb-st canvas{display:block;width:100%}.lb-tags{position:absolute;top:10px;left:12px;right:12px;display:flex;gap:6px;flex-wrap:wrap;pointer-events:none}.lb-tg{font:600 10.5px 'IBM Plex Mono',monospace;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.12);color:#e6e9ee;direction:ltr}.lb-tg b{color:#E2BE6A;font-weight:600}" +
    ".lb-state{margin-inline-start:auto;font:600 11px 'IBM Plex Mono',monospace;color:#7d8794;display:flex;align-items:center;gap:6px}.lb-state i{width:7px;height:7px;border-radius:50%;background:currentColor}.lb-state.r{color:#58C48F}.lb-state.r i{animation:lbp 1s infinite}@keyframes lbp{50%{opacity:.3}}" +
    ".lb-g{display:flex;gap:8px;padding:10px 12px 0}.lb-g div{flex:1;min-width:0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px}.lb-g small{display:block;font:600 9px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#7d8794}.lb-g b{display:block;font:700 16px 'IBM Plex Mono',monospace;margin-top:2px;direction:ltr;text-align:start;white-space:nowrap}" +
    ".lb-eq{margin:10px 12px 0;padding:10px 12px;border-radius:12px;background:rgba(226,190,106,.07);border:1px solid rgba(226,190,106,.25);font:12.5px/1.6 'IBM Plex Mono',monospace;direction:ltr;text-align:start;white-space:pre-line;min-height:20px}.lb-eq.e{opacity:.6;font-family:inherit;direction:inherit;text-align:center}" +
    ".lb-sh{margin-top:12px;padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.18)}.lb-sh p{margin:0 0 8px;font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:#7d8794}.lb-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.lb-row::-webkit-scrollbar{display:none}" +
    ".lb-ing{flex:none;width:64px;text-align:center;background:none;border:0;color:inherit;padding:0;cursor:pointer;font:inherit;-webkit-tap-highlight-color:transparent}.lb-ing .b{height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.14);display:grid;place-items:center;background:rgba(255,255,255,.04);position:relative;transition:transform .15s,border-color .2s}.lb-ing:active .b{transform:scale(.92)}.lb-ing.on .b{border-color:#E2BE6A}.lb-ing span{display:block;font-size:10.5px;margin-top:4px;color:#aab3be;line-height:1.3}.lb-ing em{position:absolute;top:-5px;right:-3px;font:700 9px 'IBM Plex Mono',monospace;background:#E2BE6A;color:#1a1206;border-radius:8px;padding:1px 5px;font-style:normal;direction:ltr}" +
    ".lb-ob{width:20px;height:28px;border-radius:5px 5px 8px 8px;border:1.5px solid rgba(255,255,255,.55);position:relative;overflow:hidden}.lb-ob::after{content:'';position:absolute;left:0;right:0;bottom:0;height:var(--h,60%);background:var(--c)}" +
    ".lb-bar{display:flex;gap:8px;padding:2px 12px 14px;flex-wrap:wrap}.lb-bar .phr-w-btn.on{border-color:#E2BE6A;color:#E2BE6A}.lb-sf{padding:0 12px 12px;font-size:11.5px;color:#9a8f72;line-height:1.5}";
  document.head.appendChild(st);

  W.builders.lab = function (root) {
    var raw = ""; try { raw = decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) {}
    var cfg = {}; raw.replace(/\r/g, "").split("\n").forEach(function (l) { var m = l.match(/^\s*([a-z_-]+)\s*:\s*(.*)$/i); if (m) cfg[m[1].toLowerCase()] = m[2].trim(); });
    var key = String(cfg.experiment || cfg.type || "volcano").toLowerCase().replace(/\s+/g, "-"); key = ALIASK[key] || key; var make = ENG[key]; if (!make) throw new Error("lab: unknown experiment '" + key + "' (volcano, mg-acid, elephant, titration, alkali)");
    var fa = root._lang === "fa", T = S[fa ? "fa" : "en"], nm = NAME[key] || NAME[ALIASK[key]] || [key, key];
    var num = function (v, d) { var s = (+v).toFixed(d == null ? 1 : d); return fa ? toFa(s).replace(".", "٫") : s; };
    root.innerHTML = '<div class="phr-w-head"><span class="phr-w-badge">' + T.lab + '</span><span class="phr-w-title">' + esc(cfg.title || nm[fa ? 1 : 0]) + '</span><span class="lb-state"><i></i><b>' + T.idle + '</b></span></div>' +
      '<div class="lb-st"><canvas></canvas><div class="lb-tags"></div></div><div class="lb-g"><div><small>' + T.temp + '</small><b data-g="t"></b></div><div><small data-g="gn">' + T.gas + '</small><b data-g="g"></b></div><div><small>' + T.ph + '</small><b data-g="p"></b></div></div><div class="lb-eq e"></div><div class="lb-sh"><p>' + T.shelf + '</p><div class="lb-row"></div></div><div class="lb-bar"></div>' + (key === "alkali" ? '<div class="lb-sf">⚠ ' + esc(T.safety) + "</div>" : "");
    var stage = root.querySelector(".lb-st"), cv = stage.querySelector("canvas"), tags = root.querySelector(".lb-tags"), eqEl = root.querySelector(".lb-eq"), row = root.querySelector(".lb-row"), bar = root.querySelector(".lb-bar"), stEl = root.querySelector(".lb-state");
    var w = Math.max(260, Math.round(root.clientWidth || 340)), h = key === "titration" ? 380 : key === "volcano" ? 340 : 320, D = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * D; cv.height = h * D; cv.style.height = h + "px"; var x = cv.getContext("2d"); x.scale(D, D);
    var eng = make(w, h); if (eng.build) eng.build(D); else if (key === "volcano") { /* built lazily */ }
    var slow = false, counts = {};
    // volcano needs its static layers
    if (key === "volcano" && eng.reset) { try { eng._b = true; } catch (e) {} }
    row.innerHTML = eng.reagents.map(function (r) { var fl = r.f == null ? .6 : r.f; return '<button class="lb-ing" data-id="' + r.id + '"><div class="b"><div class="lb-ob" style="--c:' + rgb(r.col) + ";--h:" + Math.round(fl * 100) + '%"></div></div><span>' + esc(fa ? r.fa : r.en) + "</span></button>"; }).join("");
    function paintTags() { if (key === "titration" || key === "alkali") { tags.innerHTML = ""; return; } var am = eng.amounts(), h2 = []; Object.keys(am).forEach(function (k) { if (!am[k]) return; var r = eng.reagents.filter(function (q) { return q.id === k || q.key === k; })[0], unit = r && r.unit ? " " + r.unit : ""; h2.push('<span class="lb-tg">' + esc(r ? (fa ? r.fa : r.en) : k) + " <b>" + num(am[k], am[k] % 1 ? 1 : 0) + unit + "</b></span>"); }); tags.innerHTML = h2.join(""); }
    function addR(id, n) { eng.add(id, n); counts[id] = (counts[id] || 0) + (n || 1); var b = row.querySelector('[data-id="' + id + '"]'); if (b) { b.classList.add("on"); setTimeout(function () { b.classList.remove("on"); }, 450); } paintTags(); run(); }
    row.addEventListener("click", function (e) { var b = e.target.closest(".lb-ing"); if (!b) return; if (window.PHR_haptic) try { PHR_haptic(); } catch (_) {} addR(b.getAttribute("data-id")); });
    var btns = (eng.actions || []).map(function (a) { return '<button class="phr-w-btn" data-act="' + a.id + '">' + esc(fa ? a.fa : a.en) + "</button>"; }).join("");
    bar.innerHTML = btns + '<span style="flex:1"></span><button class="phr-w-btn" data-a="reset">' + T.reset + '</button><button class="phr-w-btn" data-a="slow">' + T.slow + '</button><button class="phr-w-btn gold" data-a="ex">✦ ' + T.explain + "</button>";
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var a = b.getAttribute("data-a"), ac = b.getAttribute("data-act");
      if (ac) { eng.act(ac); run(); if (ac === "auto") b.classList.toggle("on"); return; }
      if (a === "reset") { eng.reset(); counts = {}; row.querySelectorAll(".on").forEach(function (q) { q.classList.remove("on"); }); bar.querySelectorAll(".on").forEach(function (q) { q.classList.remove("on"); }); paintTags(); run(); }
      else if (a === "slow") { slow = !slow; b.classList.toggle("on", slow); }
      else if (a === "ex") { var rd = eng.read(), am = eng.amounts(); var msg = "[lab state]\nExperiment: " + nm[0] + "\nReagents: " + (Object.keys(am).filter(function (k) { return am[k]; }).map(function (k) { return k + " " + am[k]; }).join(", ") || "none yet") + "\nReadings: temp " + rd.temp.toFixed(1) + " °C, " + rd.gasName + " " + rd.gas.toFixed(2) + ", pH " + rd.ph.toFixed(1) + "\nState: " + (eng.state || "idle") + "\nExplain what is happening: the balanced equation, why each observation happens, and one safety note. Then ask me one question to check understanding."; if (typeof window.PHR_sendText === "function") window.PHR_sendText(msg); }
    });
    // initial reagents from config:  add: soda 20, vinegar 150
    function preload() { if (!cfg.add) return; var map = { soda: "soda", "baking-soda": "soda", vinegar: "vin", vin: "vin", soap: "soap", dye: "dye", sulfur: "sulf", sulphur: "sulf", hcl: "hcl", acid: key === "titration" ? "acid" : "hcl", water: "wat", mg: "mg", magnesium: "mg", h2o2: "h2o2", peroxide: "h2o2", catalyst: "cat", yeast: "cat", indicator: "ind", li: "li", lithium: "li", na: "na", sodium: "na", k: "k", potassium: "k" };
      cfg.add.split(/[;,]/).forEach(function (p) { var m = p.trim().toLowerCase().match(/^([a-z0-9-]+)\s*(\d+(?:\.\d+)?)?/); if (!m) return; var id = map[m[1]] || m[1], r = eng.reagents.filter(function (q) { return q.id === id; })[0]; if (!r) return; var n = m[2] ? Math.max(1, Math.round(parseFloat(m[2]) / (r.step || 1))) : 1; if (r.nocount || r.once) n = 1; addR(id, n); }); }
    // loop
    var raf = 0, last = 0, vis = true, io = window.IntersectionObserver ? new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) run(); }, { threshold: .01 }) : null; if (io) io.observe(root);
    var idleFrames = 0;
    function frame(t) {
      raf = 0; if (!root.isConnected) { if (io) io.disconnect(); return; } if (!vis) return;
      var dt = Math.min(.05, (t - last) / 1000 || .016) * (slow ? .3 : 1); last = t; eng.update(dt);
      x.clearRect(0, 0, w, h); eng.draw(x);
      var rd = eng.read(); root.querySelector('[data-g="t"]').textContent = num(rd.temp, 1) + " °C"; root.querySelector('[data-g="g"]').textContent = num(rd.gas, key === "titration" ? 1 : 2) + (key === "titration" ? " mL" : " L"); root.querySelector('[data-g="p"]').textContent = num(rd.ph, 1);
      var gl = root.querySelector('[data-g="gn"]'); gl.textContent = key === "titration" ? T.vol : rd.gasName;
      var e = eng.eq(); eqEl.classList.toggle("e", !e); eqEl.textContent = e || T.empty;
      var s = eng.state || "idle"; stEl.className = "lb-state" + (s === "reacting" ? " r" : ""); stEl.querySelector("b").textContent = s === "reacting" ? T.reacting : s === "done" ? T.done : T.idle;
      if (s === "reacting" || eng.alive) idleFrames = 0; else idleFrames++;
      if (idleFrames > 90) { return; } raf = requestAnimationFrame(frame);
    }
    function run() { idleFrames = 0; if (!raf && vis) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    paintTags(); preload(); run(); setTimeout(run, 50);
    root._labRun = run;
  };
  var AL = { lab: "lab", experiment: "lab", vlab: "lab", virtuallab: "lab", reaction: "lab" };
  if (W.ALIAS) Object.keys(AL).forEach(function (k) { W.ALIAS[k] = AL[k]; });
  W.kinds.lab = 1;
})();
