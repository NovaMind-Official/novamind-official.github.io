/* Phraortes — Account, stacked cards (acct2.js)
   Replaces the Account home with a stack of live cards (graphite, one tinted icon each). Tapping a card lifts it to
   full height and opens its page, tinted with that section's colour. Adds two pages: Sign-in & security, Privacy.
   Existing pages (Profile, Usage, Agent, Appearance, Billing, Notifications) are reused untouched. */
(function () {
  "use strict";
  var W = window, D = document;
  function $(s, r) { return (r || D).querySelector(s) }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function hap(t) { try { W.haptic && W.haptic(t || "light") } catch (e) { } }
  function toast(t) { try { W.showToast && W.showToast(t, "info") } catch (e) { } }
  function planId() { try { return typeof activePlan !== "undefined" ? activePlan : "free" } catch (e) { return "free" } }
  var PN = { free: "Free", starter: "Plus", pro: "Pro", ultimate: "Max" };

  /* icons (stroke, 18px) */
  function ic(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>" }
  var IC = {
    user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
    shield: ic('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'),
    brush: ic('<path d="M12 3a9 9 0 100 18c1.7 0 2-1.2 1.3-2.2-.7-1 0-2.3 1.2-2.3H17a4 4 0 004-4c0-5-4-9.5-9-9.5z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="11" r="1"/>'),
    card: ic('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>'),
    bars: ic('<path d="M5 20V11M12 20V4M19 20v-6"/>'),
    key: ic('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'),
    palette: ic('<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 21a2.5 2.5 0 010-5h2"/>'),
    spark: ic('<path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z"/><path d="M19 16v4M17 18h4"/>'),
    wave: ic('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>'),
    bell: ic('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>')
  };
  /* id, title, icon, colour, keywords, opener */
  var SECT = [
    { id: "account", t: "Account", i: "user", c: "#4a78c9", k: "profile name email avatar", open: function () { W.acOpen("profile") } },
    { id: "new", t: "What's new", i: "spark", c: "#e8c468", k: "new features updates changelog latest release", open: function () { try { W.openWhatsNew(false) } catch (e) { } } },
    { id: "security", t: "Sign-in & security", i: "shield", c: "#2fa596", k: "google login password sign out logout secure", open: function () { W.acOpen("security") } },
    { id: "privacy", t: "Privacy", i: "lock", c: "#8a70d6", k: "memory data backup export restore activity shadow delete", open: function () { W.acOpen("privacy") } },
    { id: "agent", t: "Agent", i: "mic", c: "#3dae7b", k: "voice wake word routines habits shadow pre-mortem console memory", open: function () { W.acOpen("agent") } },
    { id: "themes", t: "Themes", i: "palette", c: "#e0795a", k: "theme themes colour color accent dark ember ocean aurora rank level", open: function () { W.PHR_LOOK && W.PHR_LOOK.open("themes") } },
    { id: "voice", t: "Voice", i: "wave", c: "#5aa0c9", k: "voice speech tts speak sound call agent aura luna orion", open: function () { W.PHR_VOICE && W.PHR_VOICE.open() } },
    { id: "look", t: "Appearance", i: "brush", c: "#c96a9d", k: "theme colour color accent dark light text motion rank look", open: function () { W.acOpen("settings") } },
    { id: "plan", t: "Plan", i: "card", c: "#d6aa45", k: "billing upgrade pro plus max pay subscription", open: function () { W.acOpen("billing") } },
    { id: "usage", t: "Usage", i: "bars", c: "#4f87d9", k: "limit messages tokens quota left", open: function () { W.acOpen("usage") } },
    { id: "keys", t: "Keys", i: "key", c: "#dc8b4b", k: "codeword shortcut macro key", open: function () { W.PHR_AX && W.PHR_AX.open("keys") } },
    { id: "notif", t: "Notifications", i: "bell", c: "#d05f5f", k: "alerts reminders push", open: function () { W.acOpen("notifications") } }
  ];
  function val(id) {
    try {
      var nm = ($("#ac-user-name-big") || {}).textContent || "", signed = nm && !/not signed in/i.test(nm);
      switch (id) {
        case "account": return signed ? nm.split(" ")[0] : "Guest";
        case "new": try { return localStorage.getItem("phraortes_whatsnew_seen") !== WHATS_NEW[0].id ? "NEW" : "Latest" } catch (e) { return "Latest" }
        case "security": return signed ? "Google" : "Not signed in";
        case "privacy": return W.PHR_SHADOW && W.PHR_SHADOW.enabled() ? "Shadow on" : "Private";
        case "agent": return W.PHR_WAKE && W.PHR_WAKE.enabled() ? "Listening" : "Off";
        case "themes": var tn = D.body.dataset.theme || "obsidian", th = W.PHR_LOOK && W.PHR_LOOK.themes.filter(function (x) { return x[0] === tn })[0]; return th ? th[1] : tn;
        case "look": return "Text, motion";
        case "voice": return W.PHR_VOICE ? W.PHR_VOICE.label() : "Automatic";
        case "plan": return PN[planId()] || "Free";
        case "usage": var l = $("#ac2-left"), ll = $("#ac2-leftl"); return l ? (l.textContent + " " + (ll ? ll.textContent : "")).trim() : "";
        case "keys": var n = W.PHR_KEYS ? W.PHR_KEYS.all().length : 0; return n ? n + (n === 1 ? " key" : " keys") : "None yet";
      }
    } catch (e) { }
    return "";
  }

  /* ───────── styles ───────── */
  function css() {
    if ($("#x3-css")) return;
    var rise = ""; for (var i = 1; i <= 9; i++) rise += "#account-page[data-view]:not([data-view=hub]) .ac-page-body>div[id^=actab-]>*:nth-child(" + i + "){animation-delay:" + (60 + i * 55) + "ms}";
    var s = D.createElement("style"); s.id = "x3-css";
    s.textContent = [
      "#ac2-bar{background:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;pointer-events:none;height:54px;min-height:54px;padding:9px 14px 0!important;box-sizing:border-box}",
      "#ac2-bar .t{display:none!important}",
      "#ac2-bar .x,#ac2-bar .b,.lk-bar>button{pointer-events:auto;display:grid;place-items:center;width:36px;height:36px;padding:0!important;border-radius:50%;border:.5px solid rgba(255,255,255,.2);background:rgba(30,26,20,.55);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);color:#f4efe4;font-size:0;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);transition:transform .2s,background .2s}",
      "#ac2-bar .x:active,#ac2-bar .b:active,.lk-bar>button:active{transform:scale(.9);background:rgba(60,52,40,.7)}",
      "#ac2-bar .x svg,#ac2-bar .b svg,.lk-bar>button svg{width:16px;height:16px;display:block}",
      "#ac2-bar .b{display:none}#account-page[data-view]:not([data-view=hub]) #ac2-bar .b{display:grid}",
      ".lk-bar{background:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;pointer-events:none;height:54px;box-sizing:border-box}.lk-bar h3{display:none}",
      "#ac2-hub>.ac2-hero,#ac2-hub>.ac2-grid,#ac2-hub>.ac2-list,#ac2-hub>#ax-sec{display:none!important}",
      "#x3{padding:6px 0 30px;font-family:-apple-system,system-ui,sans-serif}",
      ".x3-top{display:flex;align-items:center;gap:13px}",
      ".x3-med{flex:none;width:52px;height:52px;position:relative;filter:drop-shadow(0 6px 16px rgba(232,196,104,.35))}.x3-med svg{width:100%;height:100%}",
      ".x3-who{flex:1;min-width:0}.x3-who b{display:block;font-size:21px;letter-spacing:-.01em;color:#f4efe4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".x3-m{font:700 9.5px/1 'Space Mono',ui-monospace,Menlo,monospace;letter-spacing:.16em;color:#9b917c}",
      ".x3-si{flex:none;width:40px;height:40px;border-radius:50%;border:.5px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);display:grid;place-items:center;color:#f4efe4;cursor:pointer}",
      ".x3-si svg{width:18px;height:18px}",
      ".x3-sr{display:none;margin-top:12px}.x3-sr.on{display:block}",
      ".x3-sr input{width:100%;box-sizing:border-box;border-radius:14px;border:.5px solid rgba(232,196,104,.4);background:rgba(232,196,104,.07);color:#f4efe4;padding:12px 14px;font:16px -apple-system,system-ui,sans-serif;outline:none}",
      ".x3-sign{margin-top:12px;display:none;width:100%;border:0;border-radius:14px;padding:13px;background:linear-gradient(135deg,#f6e2a2,#d4a843);color:#1a1204;font:700 14px -apple-system,system-ui,sans-serif;cursor:pointer}",
      ".x3-chips{display:flex;gap:7px;margin-top:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.x3-chips::-webkit-scrollbar{display:none}",
      ".x3-chip{flex:none;padding:8px 13px;border-radius:99px;border:.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#e9dcc0;font:600 12px ui-monospace,Menlo,monospace;cursor:pointer}",
      ".x3-chip.n{border-style:dashed;color:#a99f8b}.x3-chip:active{transform:scale(.95)}",
      ".x3-day{margin-top:12px;border-radius:18px;border:.5px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);padding:11px 13px;font-size:12.5px;display:flex;gap:10px;align-items:center;color:#d8cdb4}",
      ".x3-day em{font-style:normal;font:700 9.5px ui-monospace,Menlo,monospace;letter-spacing:.16em;color:#E8C468}.x3-day .o{color:#ff9a8a}",
      "#x3-stack{position:relative;margin-top:16px}",
      ".x3-c{display:flex;align-items:flex-start;position:absolute;left:0;right:0;height:100px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:linear-gradient(160deg,#26221c,#110f0c);box-shadow:0 -8px 22px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.13) inset;padding:0 15px;text-align:left;color:#f4efe4;cursor:pointer;transition:top .45s cubic-bezier(.3,1,.3,1),transform .25s cubic-bezier(.2,1,.3,1),opacity .3s;-webkit-tap-highlight-color:transparent;font-family:inherit}",
      ".x3-c.h{display:none}",
      ".x3-c:active{transform:scale(.975)}",
      ".x3-r{width:100%;height:46px;display:flex;align-items:center;gap:11px}",
      ".x3-i{flex:none;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;box-shadow:0 3px 10px var(--cc)}.x3-i svg{width:16px;height:16px}",
      ".x3-r b{flex:1;font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".x3-r .v{font-size:11.5px;color:#a99f8b;white-space:nowrap;max-width:42%;overflow:hidden;text-overflow:ellipsis}.x3-r u{text-decoration:none;opacity:.4;font-size:13px}",
      "@keyframes x3in{from{opacity:0;transform:translateY(70px) scale(.93)}to{opacity:1;transform:none}}",
      "#x3.go .x3-c{animation:x3in .62s cubic-bezier(.2,1.12,.3,1) both;animation-delay:calc(var(--n)*48ms)}",
      "#x3.go .x3-top,#x3.go .x3-chips,#x3.go .x3-day{animation:x3in .5s cubic-bezier(.2,1,.3,1) both}#x3.go .x3-chips{animation-delay:70ms}#x3.go .x3-day{animation-delay:130ms}",
      ".x3-lift{position:fixed;z-index:8300;overflow:hidden;box-sizing:border-box;transition:top .48s cubic-bezier(.3,.9,.2,1),left .48s cubic-bezier(.3,.9,.2,1),width .48s cubic-bezier(.3,.9,.2,1),height .48s cubic-bezier(.3,.9,.2,1),border-radius .48s cubic-bezier(.3,.9,.2,1),opacity .3s;padding:0 15px}",
      ".x3-lift .x3-r{height:46px}",
      ".x3-lift.out{opacity:0}",
      "#account-page[data-x3][data-view]:not([data-view=hub]){background-image:linear-gradient(176deg,color-mix(in srgb,var(--x3a) 38%,#0a0806) 0,#0a0806 55%)!important}",
      "@keyframes x3rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}",
      "#account-page[data-view]:not([data-view=hub]) .ac-page-body>div[id^=actab-]>*{animation:x3rise .55s cubic-bezier(.2,1,.3,1) both}", rise,
      /* new pages */
      ".x3p{padding:4px 0 40px;font-family:-apple-system,system-ui,sans-serif;color:#f4efe4}",
      ".x3p .hero{border-radius:20px;padding:14px;display:flex;gap:12px;align-items:center;border:1px solid var(--cc);background:linear-gradient(150deg,color-mix(in srgb,var(--cc) 22%,transparent),rgba(255,255,255,.03))}",
      ".x3p .hero b{display:block;font-size:15px}.x3p .hero small{display:block;margin-top:3px;font-size:12px;color:color-mix(in srgb,var(--cc) 55%,#fff)}",
      ".x3p .hero i{font-size:26px;font-style:normal}",
      ".x3p .sec{font:700 9.5px ui-monospace,Menlo,monospace;letter-spacing:.18em;color:var(--cc);margin:18px 3px 6px}",
      ".x3p .gl{border-radius:20px;background:rgba(255,255,255,.055);border:.5px solid rgba(255,255,255,.12);padding:0 14px}",
      ".x3p .rw{display:flex;align-items:center;gap:10px;padding:13px 0;border-top:.5px solid rgba(255,255,255,.11)}.x3p .rw:first-child{border:0}",
      ".x3p .rw div{flex:1;min-width:0;font-size:14.5px}.x3p .rw small{display:block;margin-top:2px;font-size:11.5px;color:#9a9185}",
      ".x3p .bt{flex:none;border:0;border-radius:11px;padding:9px 13px;background:rgba(255,255,255,.1);color:#f4efe4;font:600 12.5px -apple-system,system-ui,sans-serif;cursor:pointer}.x3p .bt.r{background:rgba(255,107,107,.16);color:#ff9d9d}.x3p .bt:active{transform:scale(.96)}",
      ".x3p .tg{flex:none;width:44px;height:26px;border-radius:99px;background:rgba(255,255,255,.18);position:relative;border:0;padding:0;cursor:pointer;transition:background .25s}.x3p .tg:after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.3,1.3,.5,1)}.x3p .tg.on{background:#34c77b}.x3p .tg.on:after{transform:translateX(18px)}",
      ".x3p .full{display:block;width:100%;margin-top:14px;border:0;border-radius:14px;padding:14px;background:rgba(255,255,255,.1);color:#f4efe4;font:600 14px -apple-system,system-ui,sans-serif;cursor:pointer}.x3p .full.r{background:rgba(255,107,107,.16);color:#ff9d9d}",
      ".x3p .note{margin:14px 3px 0;font-size:12px;line-height:1.55;color:#8d8576}"
    ].join("\n");
    D.head.appendChild(s);
  }

  /* ───────── hub ───────── */
  var order = SECT.slice(), STEP = 54, built = false;
  function layout(list) {
    var st = $("#x3-stack"); if (!st) return;
    var shown = 0;
    SECT.forEach(function (s) {
      var el = D.getElementById("x3c-" + s.id); if (!el) return;
      var idx = list.indexOf(s);
      if (idx < 0) { el.classList.add("h"); return }
      el.classList.remove("h"); el.style.top = idx * STEP + "px"; el.style.zIndex = idx + 1; el.style.setProperty("--n", idx); shown++;
    });
    st.style.height = shown ? (shown - 1) * STEP + 100 + "px" : "0";
  }
  function paintVals() {
    SECT.forEach(function (s) { var el = $("#x3c-" + s.id + " .v"); if (el) el.textContent = val(s.id) });
    var nm = ($("#ac-user-name-big") || {}).textContent || "", signed = nm && !/not signed in/i.test(nm);
    var w = $("#x3-name"); if (w) w.textContent = signed ? nm.split(" ")[0] : "Guest";
    var sg = $(".x3-sign"); if (sg) sg.style.display = signed ? "none" : "block";
    var P = planId(), L = W.PHR_LOOK, lv = 1, title = "";
    try { lv = L.level() } catch (e) { }
    var md = $("#x3-med"); if (md && L && L.emblem) { try { md.innerHTML = L.emblem(P, true) } catch (e) { } }
    var m = $("#x3-meta"); if (m) m.textContent = (PN[P] || "Free").toUpperCase() + " · LEVEL " + lv;
    /* quick keys */
    var kc = $("#x3-chips"); if (kc) {
      var ks = W.PHR_KEYS ? W.PHR_KEYS.all().slice().sort(function (a, b) { return (b.n || 0) - (a.n || 0) }).slice(0, 6) : [];
      kc.innerHTML = ks.map(function (k, i) { return '<button type="button" class="x3-chip" data-k="' + i + '">' + esc(k.k) + "</button>" }).join("") + '<button type="button" class="x3-chip n" data-new="1">' + (ks.length ? "+ key" : "+ Create a key") + "</button>";
      [].forEach.call(kc.querySelectorAll("[data-k]"), function (b) { b.onclick = function () { var k = ks[+b.dataset.k]; if (!k) return; hap("medium"); try { W.closeAccountPage() } catch (e) { } setTimeout(function () { W.PHR_KEYS.run(k.k) }, 450) } });
      var nb = kc.querySelector("[data-new]"); if (nb) nb.onclick = function () { SECT.filter(function (x) { return x.id === "keys" })[0].open() };
    }
    /* today */
    var dy = $("#x3-day"); if (dy) {
      var st = { today: 0, streak: 0 }, od = 0; try { st = W.PHR_AX.stats() } catch (e) { }
      try { var now = Date.now(); od = W.LIFE.all().filter(function (e) { return e.due && !e.done && e.due < now }).length } catch (e) { }
      dy.innerHTML = "<em>TODAY</em><span>" + st.today + " agent action" + (st.today === 1 ? "" : "s") + (od ? ' · <span class="o">' + od + " overdue</span>" : "") + (st.streak > 1 ? " · " + st.streak + "-day streak" : "") + "</span>";
    }
  }
  function build() {
    var hub = $("#ac2-hub"); if (!hub || $("#x3")) return !!$("#x3");
    css();
    var d = D.createElement("div"); d.id = "x3";
    d.innerHTML = '<div class="x3-top"><div class="x3-med" id="x3-med"></div><div class="x3-who"><b id="x3-name">Guest</b><div class="x3-m" id="x3-meta" style="margin-top:6px"></div></div><button type="button" class="x3-si" id="x3-sbtn" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg></button></div>' +
      '<div class="x3-sr" id="x3-sr"><input id="x3-q" placeholder="Search settings…" autocomplete="off" autocapitalize="off"></div>' +
      '<button type="button" class="x3-sign" onclick="initiateGoogleOAuth()">Sign in with Google</button>' +
      '<div class="x3-chips" id="x3-chips"></div><div class="x3-day" id="x3-day"></div><div id="x3-stack"></div>';
    hub.insertBefore(d, hub.firstChild);
    var st = $("#x3-stack");
    SECT.forEach(function (s) {
      var b = D.createElement("button"); b.type = "button"; b.className = "x3-c"; b.id = "x3c-" + s.id; b.dataset.id = s.id;
      b.innerHTML = '<div class="x3-r"><span class="x3-i" style="background:linear-gradient(145deg,' + s.c + ',color-mix(in srgb,' + s.c + ' 50%,#000));--cc:color-mix(in srgb,' + s.c + ' 45%,transparent)">' + IC[s.i] + "</span><b>" + esc(s.t) + "</b><span class=\"v\"></span><u>›</u></div>";
      b.onclick = function () { lift(s, b) };
      st.appendChild(b);
    });
    $("#x3-sbtn").onclick = function () { var r = $("#x3-sr"); r.classList.toggle("on"); if (r.classList.contains("on")) { setTimeout(function () { $("#x3-q").focus() }, 120) } else { $("#x3-q").value = ""; layout(SECT) } hap() };
    $("#x3-q").oninput = function () {
      var q = this.value.trim().toLowerCase(); if (!q) return layout(SECT);
      layout(SECT.filter(function (s) { return (s.t + " " + s.k).toLowerCase().indexOf(q) >= 0 }));
    };
    layout(SECT); paintVals(); return true;
  }
  function play() { var d = $("#x3"); if (!d) return; paintVals(); layout(SECT); var q = $("#x3-q"); if (q) q.value = ""; var r = $("#x3-sr"); if (r) r.classList.remove("on"); d.classList.remove("go"); void d.offsetWidth; d.classList.add("go") }

  /* ───────── lift transition ───────── */
  function lift(s, el) {
    hap("medium");
    var pg = $("#account-page"), r = el.getBoundingClientRect(), pr = pg.getBoundingClientRect();
    var o = D.createElement("div"); o.className = "x3-lift";
    o.style.cssText += "left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px;border-radius:22px;background:linear-gradient(160deg,color-mix(in srgb," + s.c + " 40%,#1a1612),#0b0907 70%);border:1px solid " + s.c + "aa;";
    o.innerHTML = el.innerHTML; D.body.appendChild(o);
    void o.offsetWidth;
    o.style.left = pr.left + "px"; o.style.top = pr.top + "px"; o.style.width = pr.width + "px"; o.style.height = pr.height + "px"; o.style.borderRadius = "26px 26px 0 0";
    pg.style.setProperty("--x3a", s.c); pg.dataset.x3 = "1";
    setTimeout(function () {
      try { s.open() } catch (e) { }
      setTimeout(function () { o.classList.add("out"); setTimeout(function () { o.remove() }, 340) }, 60);
    }, 420);
  }

  /* ───────── pages ───────── */
  function pageHost(id) {
    var h = D.getElementById("actab-" + id); if (h) return h;
    var body = $(".ac-page-body"); if (!body) return null;
    h = D.createElement("div"); h.id = "actab-" + id; h.style.display = "none"; body.appendChild(h); return h;
  }
  function tg(on, fn) { return '<button type="button" class="tg' + (on ? " on" : "") + '" onclick="' + fn + '" aria-pressed="' + (on ? "true" : "false") + '"></button>' }
  function renderSecurity() {
    var h = pageHost("security"); if (!h) return;
    var nm = ($("#ac-user-name-big") || {}).textContent || "", em = ($("#ac-user-email-big") || {}).textContent || "", signed = nm && !/not signed in/i.test(nm);
    h.innerHTML = '<div class="x3p" style="--cc:#2fa596"><div class="hero"><i>🛡</i><div><b>' + (signed ? "You’re signed in" : "You’re not signed in") + "</b><small>" + (signed ? "Your account is protected by Google sign-in" : "Sign in to keep your plan on this account") + "</small></div></div>" +
      '<div class="sec">SIGN-IN</div><div class="gl"><div class="rw"><div>Signed in with<small>' + (signed ? "Google · " + esc(em || nm) : "Not signed in") + "</small></div>" + (signed ? '<button class="bt" onclick="PHR_ACCT2.out()">Sign out</button>' : '<button class="bt" onclick="PHR_ACCT2.inn()">Sign in</button>') + "</div>" +
      '<div class="rw"><div>Password<small>Not used. Google handles your sign-in</small></div></div></div>' +
      '<div class="sec">THIS DEVICE</div><div class="gl"><div class="rw"><div>Chats and memory<small>Stored on this device only</small></div></div><div class="rw"><div>Sign-in data<small>Kept in this browser until you sign out</small></div></div><div class="rw"><div>What leaves the device<small>Only the message you send to the AI</small></div></div></div>' +
      (signed ? '<button class="full r" onclick="PHR_ACCT2.out()">Sign out of this device</button>' : "") +
      '<div class="note">Two-step verification and device lists are managed in your Google account settings.</div></div>';
  }
  function renderPrivacy() {
    var h = pageHost("privacy"); if (!h) return;
    var sh = !!(W.PHR_SHADOW && W.PHR_SHADOW.enabled()), act = LS("phr_act_off") !== "1";
    h.innerHTML = '<div class="x3p" style="--cc:#8a70d6"><div class="hero"><i>🔐</i><div><b>You decide what’s remembered</b><small>Everything below lives on this device</small></div></div>' +
      '<div class="sec">AGENT</div><div class="gl"><div class="rw"><div>Activity log<small>Used for habits and suggestions</small></div>' + tg(act, "PHR_ACCT2.act(this)") + '</div><div class="rw"><div>Shadow suggestions<small>A quiet chip, a few times a day</small></div>' + tg(sh, "PHR_ACCT2.shadow(this)") + '</div><div class="rw"><div>What I remember<small>View or delete saved memory</small></div><button class="bt" onclick="PHR_ACCT2.mem()">Open</button></div></div>' +
      '<div class="sec">YOUR DATA</div><div class="gl"><div class="rw"><div>Backup & restore<small>Export chats, memory and settings</small></div><button class="bt" onclick="PHR_ACCT2.backup()">Open</button></div><div class="rw"><div>Clear activity history<small>Erases habits the agent learned</small></div><button class="bt r" onclick="PHR_ACCT2.clearAct()">Clear</button></div></div>' +
      '<div class="note">Messages you send are processed by the AI service to answer you. Sign-in data and payment licences are never included in backups.</div></div>';
  }
  W.PHR_ACCT2 = {
    out: function () { try { W.handleLogout() } catch (e) { } },
    inn: function () { try { W.initiateGoogleOAuth() } catch (e) { } },
    act: function (b) { var on = !b.classList.contains("on"); LS("phr_act_off", on ? "0" : "1"); b.classList.toggle("on", on); hap() },
    shadow: function (b) { var on = !b.classList.contains("on"); try { W.PHR_SHADOW.setOn(on) } catch (e) { } b.classList.toggle("on", on); paintVals(); hap() },
    mem: function () { try { W.closeAccountPage() } catch (e) { } setTimeout(function () { try { W.LIFE.open() } catch (e) { toast("Memory isn’t available") } }, 450) },
    backup: function () { try { W.closeAccountPage() } catch (e) { } setTimeout(function () { try { W.phrHub_o("data") } catch (e) { toast("Backup isn’t available") } }, 450) },
    clearAct: function () { try { if (confirm("Erase the agent’s activity history?")) { W.PHR_AX.clear(); toast("Activity cleared") } } catch (e) { } },
    refresh: paintVals, play: play
  };

  /* ───────── wiring ───────── */
  function barIcons() {
    var x = $("#ac2-bar .x"); if (x && !x.querySelector("svg")) x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var b = $("#ac2-bar .b"); if (b) { var sv = b.querySelector("svg"); if (sv) b.innerHTML = sv.outerHTML }
    [].forEach.call(D.querySelectorAll(".lk-bar>button"), function (q) { var sv = q.querySelector("svg"); if (sv && q.childNodes.length > 1) q.innerHTML = sv.outerHTML });
  }
  function wire() {
    var oa = W.acOpen, ob = W.acBack, op = W.openAccountPage;
    if (typeof oa !== "function" || !$("#ac2-hub")) return false;
    if (oa.__x3) return true;
    css(); barIcons(); setInterval(barIcons, 1500); build(); pageHost("security"); pageHost("privacy");
    W.acOpen = function (tab) {
      var mine = tab === "security" || tab === "privacy";
      ["security", "privacy"].forEach(function (t) { var e = D.getElementById("actab-" + t); if (e) e.style.display = "none" });
      var r = oa.apply(this, arguments);
      if (mine) {
        if (tab === "security") renderSecurity(); else renderPrivacy();
        var e = D.getElementById("actab-" + tab); if (e) e.style.display = "block";
        var t = $("#ac2-t"); if (t) t.textContent = tab === "security" ? "Sign-in & security" : "Privacy";
      }
      var s = SECT.filter(function (x) { return x.id === tab || (tab === "profile" && x.id === "account") || (tab === "settings" && x.id === "look") || (tab === "billing" && x.id === "plan") || (tab === "notifications" && x.id === "notif") })[0];
      if (s) { var pg = $("#account-page"); pg.style.setProperty("--x3a", s.c); pg.dataset.x3 = "1" }
      return r;
    };
    W.acOpen.__x3 = 1;
    if (typeof ob === "function") W.acBack = function () { var r = ob.apply(this, arguments); setTimeout(play, 60); return r };
    if (typeof op === "function") W.openAccountPage = function () { var r = op.apply(this, arguments); setTimeout(play, 330); return r };
    /* the agent tools tiles live at the top of the Agent page */
    (function mv(n) { var ax = $("#ax-sec"), ag = D.getElementById("actab-agent"); if (ax && ag) { ag.insertBefore(ax, ag.firstChild); ax.style.setProperty("display", "block", "important"); ax.style.marginBottom = "16px" } else if (n < 60) setTimeout(function () { mv(n + 1) }, 300) })(0);
    return true;
  }
  (function wait(n) { if (!wire() && n < 200) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
