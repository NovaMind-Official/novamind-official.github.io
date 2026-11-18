/* Phraortes — Themes and Ranks (look.js)
   · 12 full-atmosphere themes (some unlocked by level or plan) + 6 more accent colours
   · a rank system: plan medal + XP level + titles, with a Rank pane */
(function () {
  "use strict";
  var W = window, D = document, $ = function (s, r) { return (r || D).querySelector(s) };
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }

  /* ───────── themes ───────── */
  // id, name, tagline, bg, grad1, grad2, primary, lock
  var T = [
    ["obsidian", "Obsidian Gold", "The classic", "", "", "", "#D4A24C", null],
    ["aurora", "Aurora", "Northern lights", "#04100f", "#0b4a46", "#2d1260", "#5eead4", null],
    ["ocean", "Deep Ocean", "Cold and calm", "#050c16", "#093a63", "#041a30", "#38bdf8", null],
    ["ember", "Ember", "Warm glow", "#150702", "#5a1c05", "#240c02", "#ff7a3d", null],
    ["quartz", "Rose Quartz", "Soft and sharp", "#140a10", "#44152d", "#1f0b24", "#ff8fb8", null],
    ["ink", "Mono Ink", "Pure focus", "#090909", "#262626", "#0d0d0d", "#e8e8e8", null],
    ["royal", "Royal Violet", "Deep amethyst", "#0b0716", "#331573", "#120a2b", "#b794ff", null],
    ["matrix", "Terminal", "Phosphor green", "#020a04", "#04301a", "#00100a", "#00ff88", ["level", 3]],
    ["tokyo", "Neon Tokyo", "Night district", "#0a0614", "#4a0d5e", "#06304a", "#ff2ea6", ["level", 5]],
    ["glacier", "Glacier", "Pro edition", "#050a10", "#244a66", "#0a1c2a", "#9fd8ff", ["plan", "pro"]],
    ["sovereign", "Sovereign", "Max edition", "#07060a", "#4a3608", "#150e02", "#f5d27a", ["plan", "ultimate"]],
    ["dune", "Desert Dune", "Dry sand", "#120d07", "#4d3512", "#1f1507", "#e7b76b", ["level", 8]],
    ["forest", "Forest", "Deep canopy", "#040d07", "#0f4a2a", "#04170d", "#5fd38d", null],
    ["moss", "Moss", "Soft earth", "#0a0f06", "#3a4a12", "#131a05", "#b5d36a", null],
    ["lagoon", "Lagoon", "Tropical shallows", "#03100f", "#0a5a5a", "#052a3a", "#2ee6d0", null],
    ["sakura", "Sakura", "Spring petals", "#150a0f", "#5c1f3d", "#2a0d1c", "#ffb3d1", null],
    ["sunset", "Sunset", "Golden hour", "#140806", "#7a2a12", "#2b0f3a", "#ff9a5a", null],
    ["copper", "Copper", "Burnished metal", "#120905", "#5a2f14", "#22110a", "#d98a56", null],
    ["wine", "Merlot", "Deep red wine", "#12050a", "#5a0f2a", "#200510", "#ff5d7e", null],
    ["mocha", "Mocha", "Warm coffee", "#0f0a07", "#43291a", "#1a110b", "#d2a679", null],
    ["laser", "Laser Blue", "Electric edge", "#02061a", "#0b2a8a", "#04103a", "#4d7cff", null],
    ["midnight", "Midnight", "Blue-black calm", "#04060e", "#141c3a", "#090d1c", "#8aa4ff", null],
    ["slate", "Slate", "Quiet steel", "#0a0c0f", "#2a3340", "#0f1318", "#9fb4c9", null],
    ["vapor", "Vaporwave", "Retro dream", "#0c0618", "#4b1a7a", "#0a2a5a", "#ff7be5", ["level", 4]],
    ["cyber", "Cyber Yellow", "Hazard tape", "#0a0a03", "#3d3a05", "#141403", "#ffe14d", ["level", 6]],
    ["nebula", "Nebula", "Deep space", "#07040f", "#3a1a6a", "#0d0a2a", "#c58bff", ["level", 10]],
    ["platinum", "Platinum", "Pro edition", "#0a0a0c", "#3a3a44", "#121216", "#e6e8ee", ["plan", "pro"]],
    ["emerald", "Emerald", "Max edition", "#031009", "#0a4a30", "#04180f", "#4ee8a2", ["plan", "ultimate"]]
  ];
  var CATS = [["Signature", ["obsidian", "sovereign", "royal", "quartz", "platinum", "emerald"]], ["Nature", ["aurora", "ocean", "glacier", "forest", "moss", "lagoon", "dune", "sakura"]], ["Warm", ["ember", "sunset", "copper", "wine", "mocha"]], ["Neon", ["matrix", "tokyo", "vapor", "cyber", "laser", "nebula"]], ["Calm", ["ink", "midnight", "slate"]]];
  var ACC = [["mint", "Mint", "#6ee7b7"], ["coral", "Coral", "#ff6f61"], ["ice", "Ice", "#a5f3fc"], ["lime", "Lime", "#bef264"], ["crimson", "Crimson", "#ef4444"], ["teal", "Teal", "#14b8a6"]];
  var PLAN_RANK = { free: 0, starter: 1, pro: 2, ultimate: 3 };

  function css() {
    if ($("#lk-css")) return;
    var s = [], MODES = ":not(.workspace-mode):not(.intellect-mode):not(.sovereign-mode)";
    T.forEach(function (t) {
      if (!t[3]) return;
      var c = t[6], r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
      s.push("body[data-theme=" + t[0] + "]:not(.light-theme)" + MODES + "{--bg:" + t[3] + ";--grad1:" + t[4] + ";--grad2:" + t[5] + ";--p:" + c + ";--glow:rgba(" + r + "," + g + "," + b + ",.2);--brd:rgba(" + r + "," + g + "," + b + ",.14);--latc:rgba(" + r + "," + g + "," + b + ",.05)}");
    });
    s.push("body[data-theme]:not([data-theme=obsidian]):not(.light-theme) .bg-lattice{background-image:repeating-linear-gradient(45deg,var(--latc,rgba(255,255,255,.04)) 0,var(--latc,rgba(255,255,255,.04)) 1px,transparent 1px,transparent 54px),repeating-linear-gradient(-45deg,var(--latc,rgba(255,255,255,.04)) 0,var(--latc,rgba(255,255,255,.04)) 1px,transparent 1px,transparent 54px)!important}");
    s.push("body[data-theme=matrix]:not(.light-theme) .bg-lattice{background-image:linear-gradient(rgba(0,255,136,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,.05) 1px,transparent 1px)!important;background-size:28px 28px!important}");
    ACC.forEach(function (a) {
      var c = a[2], r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
      s.push("body[data-accent=" + a[0] + "]{--p:" + c + "!important;--glow:rgba(" + r + "," + g + "," + b + ",.2)!important}");
      s.push("body.light-theme[data-accent=" + a[0] + "]{--p:" + shade(c, .6) + "!important}");
    });
    s.push([
      "#th-pane{position:fixed;left:0;right:0;bottom:0;top:8vh;z-index:8002;background:radial-gradient(120% 60% at 50% -10%,color-mix(in srgb,var(--p) 16%,#15100a),#0a0806 70%);color:#fff;border-top-left-radius:26px;border-top-right-radius:26px;border-top:.5px solid rgba(255,255,255,.14);transform:translateX(100%);visibility:hidden;transition:transform .5s cubic-bezier(.2,1,.3,1),visibility 0s .5s;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}",
      "#th-pane.on{transform:none;visibility:visible;transition:transform .5s cubic-bezier(.2,1,.3,1)}",
      ".lk-bar{position:sticky;top:0;z-index:3;display:flex;align-items:center;padding:12px 14px 10px;background:linear-gradient(#0c0906,rgba(12,9,6,.86));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}",
      ".lk-bar button{border:0;background:none;color:var(--p-hi,var(--p));font:500 17px -apple-system,system-ui,sans-serif;display:flex;align-items:center;cursor:pointer;padding:6px 4px}",
      ".lk-bar h3{position:absolute;left:0;right:0;text-align:center;margin:0;font:600 17px -apple-system,system-ui,sans-serif;pointer-events:none}",
      ".lk-in{max-width:560px;margin:0 auto;padding:8px 16px calc(40px + env(safe-area-inset-bottom))}",
      ".lk-sec{margin:20px 4px 10px;font:600 10.5px 'Space Mono',ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.45)}",
      ".lk-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}",
      ".lk-th{position:relative;border-radius:22px;overflow:hidden;border:1.5px solid rgba(255,255,255,.12);background:#0b0907;cursor:pointer;text-align:left;padding:0;color:#fff;-webkit-tap-highlight-color:transparent;transition:transform .3s cubic-bezier(.2,1,.3,1),border-color .3s}",
      ".lk-th:active{transform:scale(.96)}",
      ".lk-th.on{border-color:var(--c);box-shadow:0 0 0 1px var(--c),0 10px 30px -8px var(--c)}",
      ".lk-pv{height:96px;position:relative;background:radial-gradient(circle at 20% 25%,var(--g1) 0,transparent 70%),radial-gradient(circle at 85% 85%,var(--g2) 0,transparent 70%),var(--bg)}",
      ".lk-pv i{position:absolute;left:12px;top:14px;width:46%;height:14px;border-radius:9px 9px 9px 3px;background:rgba(255,255,255,.14)}",
      ".lk-pv i+i{left:auto;right:12px;top:36px;width:52%;border-radius:9px 9px 3px 9px;background:var(--c);opacity:.9}",
      ".lk-pv i+i+i{left:12px;right:auto;top:58px;width:34%;background:rgba(255,255,255,.14);border-radius:9px 9px 9px 3px;opacity:1}",
      ".lk-pv u{position:absolute;right:12px;bottom:10px;width:26px;height:26px;border-radius:50%;background:var(--c);box-shadow:0 0 16px var(--c);opacity:.95;text-decoration:none}",
      ".lk-nm{padding:10px 12px 12px}.lk-nm b{display:block;font:600 14px -apple-system,system-ui,sans-serif}.lk-nm small{display:block;margin-top:2px;font:500 11.5px -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.5)}",
      ".lk-tag{position:absolute;top:9px;right:9px;z-index:2;font:700 9px 'Space Mono',monospace;letter-spacing:.1em;padding:4px 8px;border-radius:99px;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff;border:.5px solid rgba(255,255,255,.25)}",
      ".lk-th.lock .lk-pv{filter:saturate(.35) brightness(.7)}",
      ".lk-th.on .lk-tag{background:var(--c);color:#111;border-color:transparent}",
      ".lk-acc{display:flex;flex-wrap:wrap;gap:12px}",
      ".lk-acc button{width:38px;height:38px;border-radius:50%;border:2px solid transparent;background:var(--c);box-shadow:0 0 0 1px rgba(255,255,255,.2);cursor:pointer;transition:transform .3s cubic-bezier(.2,1,.3,1)}",
      ".lk-acc button.on{border-color:#fff;transform:scale(1.14)}.lk-acc button:active{transform:scale(.85)}",
      ".lk-acc button.auto{background:conic-gradient(#ffb700,#00d68f,#2fb8ff,#a874ff,#ff4f8b,#ff8a1f,#ffb700)}",
      /* rank */
      ".ac2-rank .rk-em{position:absolute;right:8px;top:6px;width:64px;height:64px;pointer-events:none;filter:drop-shadow(0 6px 10px rgba(0,0,0,.3))}",
      ".ac2-rank .rk-lv{font:700 10px 'Space Mono',ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.8;margin-bottom:5px}",
      ".ac2-rank .rk-xp{height:5px;border-radius:4px;background:rgba(0,0,0,.2);overflow:hidden;margin-bottom:7px}.ac2-rank .rk-xp i{display:block;height:100%;border-radius:4px;background:currentColor;opacity:.85;transition:width 1.2s cubic-bezier(.16,1,.3,1)}",
      ".rk-hero{position:relative;text-align:center;padding:18px 10px 6px}",
      ".rk-hero svg.m{width:196px;height:196px;filter:drop-shadow(0 24px 36px rgba(0,0,0,.55));animation:rkf 5s ease-in-out infinite}",
      "@keyframes rkf{50%{transform:translateY(-7px) rotate(1.5deg)}}",
      ".rk-hero h2{margin:8px 0 2px;font:700 30px/1.1 'Playfair Display',Georgia,serif}",
      ".rk-hero p{margin:0;font:600 12px 'Space Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}",
      ".rk-bar{height:10px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:16px 6px 8px}.rk-bar i{display:block;height:100%;border-radius:6px;width:0;background:linear-gradient(90deg,var(--p),#fff);transition:width 1.3s cubic-bezier(.16,1,.3,1)}",
      ".rk-xl{display:flex;justify-content:space-between;margin:0 6px;font:600 12px 'Space Mono',monospace;color:rgba(255,255,255,.55)}",
      ".rk-c{border:.5px solid rgba(255,255,255,.13);border-radius:24px;padding:6px 16px;margin-top:14px;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02))}",
      ".rk-l{display:flex;align-items:center;gap:13px;padding:13px 0;border-top:.5px solid rgba(255,255,255,.1)}.rk-l:first-child{border:0}",
      ".rk-l .d{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:700 13px 'Space Mono',monospace;background:rgba(255,255,255,.08);color:rgba(255,255,255,.5)}",
      ".rk-l.done .d{background:var(--p);color:#111}.rk-l.cur .d{background:#fff;color:#111;box-shadow:0 0 0 4px color-mix(in srgb,var(--p) 40%,transparent)}",
      ".rk-l b{display:block;font:600 15px -apple-system,system-ui,sans-serif}.rk-l small{display:block;margin-top:2px;font:500 12px/1.4 -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.5)}.rk-l.dim{opacity:.5}",
      ".rk-tiers{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}",
      ".rk-t{border-radius:18px;padding:12px 4px 10px;text-align:center;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)}.rk-t svg{width:46px;height:46px}.rk-t b{display:block;margin-top:5px;font:600 12px -apple-system,system-ui,sans-serif}.rk-t small{display:block;margin-top:1px;font:600 9px 'Space Mono',monospace;letter-spacing:.08em;color:rgba(255,255,255,.5)}",
      ".rk-t.on{border-color:var(--p);box-shadow:0 0 0 1px var(--p)}.rk-t.off svg{filter:grayscale(1) brightness(.6)}",
      ".rk-btn{display:block;width:100%;margin-top:16px;padding:15px;border:0;border-radius:16px;background:linear-gradient(135deg,var(--p),color-mix(in srgb,var(--p) 55%,#000));color:#111;font:700 15px -apple-system,system-ui,sans-serif;cursor:pointer}",
      "body.light-theme #th-pane{background:rgba(250,246,238,.99);color:#2b2313}body.light-theme .lk-bar{background:rgba(250,246,238,.9)}body.light-theme .lk-th{background:#fff;color:#2b2313}body.light-theme .lk-nm small{color:rgba(0,0,0,.5)}"
    ].join("\n"));
    var el = D.createElement("style"); el.id = "lk-css"; el.textContent = s.join("\n"); D.head.appendChild(el);
  }
  function shade(hex, f) { var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return "#" + [r, g, b].map(function (v) { return ("0" + Math.round(v * f).toString(16)).slice(-2) }).join("") }

  function ACCS() { try { return typeof PHR_ACCENTS !== "undefined" ? PHR_ACCENTS : null } catch (e) { return null } }
  function level() { return lv(xp()).n }
  function plan() { try { return typeof activePlan !== "undefined" ? activePlan : "free" } catch (e) { return "free" } }
  function unlocked(t) {
    var k = t[7]; if (!k) return true;
    if (k[0] === "level") return level() >= k[1];
    return PLAN_RANK[plan()] >= PLAN_RANK[k[1]];
  }
  function lockText(t) { var k = t[7]; if (!k) return "FREE"; return k[0] === "level" ? "LV " + k[1] : k[1] === "pro" ? "PRO" : "MAX" }
  function applyTheme(id, save) {
    var t = T.filter(function (x) { return x[0] === id })[0] || T[0];
    if (t[0] === "obsidian") D.body.removeAttribute("data-theme"); else D.body.setAttribute("data-theme", t[0]);
    if (save !== false) LS("phr_theme_v1", t[0]);
    var m = $('meta[name="theme-color"]'); if (m && t[3]) m.setAttribute("content", t[3]);
  }
  function toast(t) { try { if (typeof W.showToast === "function") W.showToast(t, "info") } catch (e) { } }

  var pane;
  function buildPane() { if (pane) return; css(); pane = D.createElement("div"); pane.id = "th-pane"; pane.innerHTML = '<div class="lk-bar"><button type="button" onclick="PHR_LOOK.back()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>Account</button><h3 id="lk-t"></h3></div><div class="lk-in" id="lk-in"></div>'; D.body.appendChild(pane) }
  function viewThemes() {
    var cur = D.body.getAttribute("data-theme") || "obsidian", ca = D.body.getAttribute("data-accent") || "auto";
    var card = function (t) {
      var un = unlocked(t), on = t[0] === cur;
      var bg = t[3] || "#0f0a06", g1 = t[4] || "#2a1608", g2 = t[5] || "#140a04";
      return '<button type="button" class="lk-th' + (on ? " on" : "") + (un ? "" : " lock") + '" style="--c:' + t[6] + ';--bg:' + bg + ';--g1:' + g1 + ';--g2:' + g2 + '" onclick="PHR_LOOK.pick(\'' + t[0] + '\')"><span class="lk-tag">' + (on ? "ACTIVE" : un ? lockText(t) : "🔒 " + lockText(t)) + '</span><div class="lk-pv"><i></i><i></i><i></i><u></u></div><div class="lk-nm"><b>' + esc(t[1]) + "</b><small>" + esc(t[2]) + "</small></div></button>";
    };
    var cards = CATS.map(function (c) { return '<div class="lk-sec lk-cat">' + c[0] + '</div><div class="lk-grid">' + c[1].map(function (id) { var t = T.filter(function (x) { return x[0] === id })[0]; return t ? card(t) : "" }).join("") + "</div>" }).join("");
    var accs = '<button type="button" class="auto' + (ca === "auto" ? " on" : "") + '" aria-label="Auto" onclick="PHR_LOOK.acc(\'auto\')"></button>' + (ACCS() || []).filter(function (a) { return a[0] !== "auto" }).map(function (a) { return '<button type="button" class="' + (ca === a[0] ? "on" : "") + '" style="--c:' + a[2] + '" aria-label="' + esc(a[1]) + '" onclick="PHR_LOOK.acc(\'' + a[0] + '\')"></button>' }).join("");
    return '<div class="lk-sec" style="margin-top:6px">Themes · ' + T.filter(unlocked).length + "/" + T.length + ' unlocked</div>' + cards + '<div class="lk-sec">Accent colour</div><div class="lk-acc">' + accs + '</div><div class="lk-sec">Unlock more</div><div style="font:500 13px/1.6 -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.55)">Use the agent to level up and unlock Terminal, Neon Tokyo, Vaporwave, Cyber Yellow, Nebula and more. Glacier and Platinum come with Pro, Sovereign and Emerald with Max.</div>';
  }

  /* ───────── ranks ───────── */
  var TITLES = [[1, "Initiate"], [3, "Apprentice"], [5, "Adept"], [8, "Strategist"], [12, "Architect"], [18, "Sage"], [25, "Sovereign"]];
  var PERKS = { 1: "Welcome aboard", 3: "Unlocks the Terminal theme", 5: "Unlocks the Neon Tokyo theme", 8: "Unlocks the Desert Dune theme", 12: "Architect title", 18: "Sage title", 25: "Sovereign title" };
  function xpFor(n) { return 40 * (n - 1) * (n - 1) }
  function lv(x) { var n = Math.min(40, Math.floor(Math.sqrt(x / 40)) + 1), t = TITLES[0][1]; TITLES.forEach(function (z) { if (n >= z[0]) t = z[1] }); return { n: n, title: t, from: xpFor(n), to: xpFor(n + 1) } }
  function xp() {
    var a = []; try { a = JSON.parse(LS("phr_activity_v1") || "[]") } catch (e) { }
    var rt = 0; try { rt = JSON.parse(LS("phr_routines_v1") || "[]").length } catch (e) { }
    var mem = 0; try { mem = W.LIFE ? W.LIFE.all().length : 0 } catch (e) { }
    var d = 0; try { var s = JSON.parse(LS("phr_daily") || "{}"); d = Object.keys(s).filter(function (k) { return s[k] && s[k].done }).length } catch (e) { }
    var derived = a.length * 12 + rt * 30 + mem * 6 + d * 20, saved = +LS("phr_xp_v1") || 0, best = Math.max(saved, derived);
    if (best !== saved) LS("phr_xp_v1", String(best)); return best;
  }
  var METAL = { free: ["#f3f5f8", "#9aa1ad", "#555c68"], starter: ["#ffd2a1", "#c57d3b", "#6b3d14"], pro: ["#e5dcff", "#8d78e6", "#3d2d94"], ultimate: ["#fff2bd", "#e6b64a", "#8a5c0a"] };
  var uidn = 0;
  function emblem(p, anim) {
    var m = METAL[p] || METAL.free, id = "e" + (++uidn), shape;
    if (p === "starter") shape = '<path d="M60 8 100 24v30c0 28-17 47-40 58C37 101 20 82 20 54V24z"/>';
    else if (p === "pro") shape = '<path d="M60 6l16 33 36 5-26 25 6 36-32-17-32 17 6-36L8 44l36-5z"/>';
    else if (p === "ultimate") shape = '<path d="M14 92 8 34l30 24 22-40 22 40 30-24-6 58z"/><rect x="16" y="96" width="88" height="12" rx="5"/>';
    else shape = '<path d="M60 8l44 26v52L60 112 16 86V34z"/>';
    var inner = p === "ultimate" ? '<circle cx="60" cy="60" r="9" fill="#fff" opacity=".9"/><circle cx="60" cy="60" r="5" fill="' + m[2] + '"/>' : p === "pro" ? '<circle cx="60" cy="62" r="11" fill="#fff" opacity=".55"/>' : p === "starter" ? '<path d="M60 34v40M42 54h36" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".6"/>' : '<text x="60" y="76" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-size="46" font-weight="700" fill="' + m[2] + '" opacity=".8">Φ</text>';
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m[0] + '"/><stop offset=".55" stop-color="' + m[1] + '"/><stop offset="1" stop-color="' + m[2] + '"/></linearGradient><linearGradient id="' + id + 's" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="' + id + 'c">' + shape + '</clipPath></defs><g fill="url(#' + id + 'g)" stroke="' + m[0] + '" stroke-width="1.6" stroke-linejoin="round">' + shape + "</g>" + inner + '<g clip-path="url(#' + id + 'c)"><rect x="-60" y="-10" width="46" height="140" fill="url(#' + id + 's)" transform="skewX(-18)"><animate attributeName="x" values="-60;170;170" keyTimes="0;.45;1" dur="' + (anim ? 3.2 : 4.5) + 's" repeatCount="indefinite"/></rect></g></svg>';
  }
  function upgradeRankCard() {
    var rk = $("#ac2-rank"); if (!rk) return; css();
    var p = plan(), x = xp(), L = lv(x), pct = Math.round((x - L.from) / (L.to - L.from) * 100);
    var old = rk.querySelector(".em"); if (old) old.style.display = "none";
    var em = rk.querySelector(".rk-em"); if (!em) { em = D.createElement("div"); em.className = "rk-em"; rk.appendChild(em) }
    em.innerHTML = emblem(p, false);
    var s = $("#ac2-rs"); if (s) {
      s.innerHTML = '<span class="rk-lv" style="display:block">Lv ' + L.n + " · " + esc(L.title) + '</span><span class="rk-xp" style="display:block"><i style="width:' + pct + '%"></i></span><span>' + (p === "free" ? "Upgrade for more power" : p === "ultimate" ? "Unlimited. The throne." : "Manage your plan") + "</span>";
      s.style.display = "block";
    }
  }
  function viewRank() {
    var p = plan(), x = xp(), L = lv(x), pct = Math.round((x - L.from) / (L.to - L.from) * 100), names = { free: "Free", starter: "Plus", pro: "Pro", ultimate: "Max" };
    var ladder = TITLES.map(function (z, i) { var nx = TITLES[i + 1], cur = L.n >= z[0] && (!nx || L.n < nx[0]), done = L.n >= z[0] && !cur; return '<div class="rk-l ' + (cur ? "cur" : done ? "done" : "dim") + '"><div class="d">' + (done ? "✓" : z[0]) + "</div><div><b>" + z[1] + "</b><small>Level " + z[0] + " · " + PERKS[z[0]] + "</small></div></div>" }).join("");
    var tiers = ["free", "starter", "pro", "ultimate"].map(function (k) { return '<div class="rk-t ' + (k === p ? "on" : PLAN_RANK[k] < PLAN_RANK[p] ? "" : "off") + '">' + emblem(k, false) + "<b>" + names[k] + "</b><small>" + (k === p ? "YOU" : PLAN_RANK[k] < PLAN_RANK[p] ? "OWNED" : "LOCKED") + "</small></div>" }).join("");
    return '<div class="rk-hero">' + emblem(p, true).replace("<svg ", '<svg class="m" ') + "<h2>" + names[p] + '</h2><p>Lv ' + L.n + " · " + esc(L.title) + '</p></div><div class="rk-bar"><i id="rk-fill"></i></div><div class="rk-xl"><span>' + x + ' XP</span><span>' + L.to + ' XP → Lv ' + (L.n + 1) + '</span></div>' +
      '<div class="lk-sec">Plans</div><div class="rk-tiers">' + tiers + "</div>" + (p === "ultimate" ? "" : '<button class="rk-btn" onclick="PHR_LOOK.up()">Upgrade your plan</button>') +
      '<div class="lk-sec">Titles</div><div class="rk-c">' + ladder + '</div><div class="lk-sec">How to earn XP</div><div style="font:500 13px/1.7 -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.55)">Every agent command, saved routine, memory and daily streak earns XP. Use Phraortes more and your title climbs.</div>';
  }

  function render(v) {
    $("#lk-t").textContent = v === "rank" ? "Your rank" : "Themes";
    $("#lk-in").innerHTML = v === "rank" ? viewRank() : viewThemes();
    if (v === "rank") { var p = lv(xp()); setTimeout(function () { var f = $("#rk-fill"); if (f) f.style.width = Math.round((xp() - p.from) / (p.to - p.from) * 100) + "%" }, 120) }
  }
  var view = "themes";
  W.PHR_LOOK = {
    open: function (v) { buildPane(); view = v || "themes"; render(view); pane.scrollTop = 0; pane.classList.add("on"); try { W.haptic && W.haptic("light") } catch (e) { } },
    back: function () { if (pane) pane.classList.remove("on"); try { upgradeRankCard(); W.acRefresh && W.acRefresh() } catch (e) { } },
    pick: function (id) {
      var t = T.filter(function (x) { return x[0] === id })[0]; if (!t) return;
      if (!unlocked(t)) { var k = t[7]; toast(k[0] === "level" ? "Reach level " + k[1] + " to unlock " + t[1] : "Included with the " + (k[1] === "pro" ? "Pro" : "Max") + " plan"); if (k[0] === "plan") { try { W.haptic && W.haptic("warning") } catch (e) { } } return }
      applyTheme(id, true); render(view); try { W.haptic && W.haptic("light") } catch (e) { }
    },
    acc: function (a) { try { W.setAccent(a, true) } catch (e) { } render(view); try { W.haptic && W.haptic("light") } catch (e) { } },
    up: function () { if (pane) pane.classList.remove("on"); try { W.closeAccountPage && W.closeAccountPage() } catch (e) { } setTimeout(function () { try { W.openPremium() } catch (e) { } }, 380) },
    apply: applyTheme, themes: T, level: level, xp: xp, emblem: emblem, refresh: upgradeRankCard
  };

  /* ───────── wiring ───────── */
  function boot() {
    css();
    var AA = ACCS(); if (AA) ACC.forEach(function (a) { if (!AA.some(function (x) { return x[0] === a[0] })) AA.push(a) });
    var saved = LS("phr_theme_v1"); if (saved) { var t = T.filter(function (x) { return x[0] === saved })[0]; if (t) { if (unlocked(t)) applyTheme(saved, false); else applyTheme("obsidian", false) } }
    try { W.initAccent && W.initAccent() } catch (e) { }
  }
  function wireAccount() {
    var hub = $("#ac2-hub"); if (!hub) return false;
    if (!hub.dataset.lk) {
      hub.dataset.lk = 1; css();
      var look = hub.querySelector(".ac2-look h4"); if (look) { look.innerHTML = 'Look <span style="float:right;opacity:.6;text-transform:none;letter-spacing:0">Themes ›</span>'; look.style.cursor = "pointer"; look.onclick = function (e) { e.stopPropagation(); W.PHR_LOOK.open("themes") } }
      var lst = hub.querySelector(".ac2-list");
      if (lst && !$("#lk-row")) {
        var b = D.createElement("button"); b.className = "ac2-row"; b.id = "lk-row"; b.onclick = function () { W.PHR_LOOK.open("themes") };
        b.innerHTML = '<span class="ac2-ic" style="background:linear-gradient(145deg,#ff7a3d,#a02a8f)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="19" height="19"><circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3" fill="#fff"/><circle cx="12" cy="7.5" r="1.3" fill="#fff"/><circle cx="16" cy="10" r="1.3" fill="#fff"/><path d="M12 21a3 3 0 0 1 0-6h2a2 2 0 0 0 0-4"/></svg></span>Themes and colours';
        var after = Array.prototype.filter.call(lst.children, function (c) { return /Appearance/.test(c.textContent) })[0];
        lst.insertBefore(b, after ? after : lst.firstChild);
      }
      W.acRank = function () { W.PHR_LOOK.open("rank") };
    }
    upgradeRankCard(); return true;
  }
  boot();
  (function wait(n) { if (!wireAccount() && n < 200) setTimeout(function () { wait(n + 1) }, 250); else { var oo = W.openAccountPage; if (oo && !oo.__lk) { W.openAccountPage = function () { var r = oo.apply(this, arguments); setTimeout(upgradeRankCard, 380); return r }; W.openAccountPage.__lk = 1 } var oc = W.closeAccountPage; if (oc && !oc.__lk) { W.closeAccountPage = function () { if (pane) pane.classList.remove("on"); return oc.apply(this, arguments) }; W.closeAccountPage.__lk = 1 } } })(0);
  /* the Account page rebuilds the rank text on refresh(); repaint after it */
  setInterval(function () { var s = $("#ac2-rs"); if (s && !s.querySelector(".rk-lv")) upgradeRankCard() }, 1200);
})();
