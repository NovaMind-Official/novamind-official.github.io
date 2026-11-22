/* Phraortes — Settings & account, the familiar layout (acct3.js)
   Replaces the stacked-card hub with what people already know from Claude / ChatGPT:
   a profile header, then plain grouped lists (icon · label · value · chevron), and a user row pinned to the bottom of the
   chat list that opens a small menu (Upgrade, Settings, What's new, Sign out). Existing pages are reused as they are. */
(function () {
  "use strict";
  var W = window, D = document;
  function $(s, r) { return (r || D).querySelector(s) }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  function hap(t) { try { W.haptic && W.haptic(t || "light") } catch (e) { } }
  function planId() { try { return typeof activePlan !== "undefined" ? activePlan : "free" } catch (e) { return "free" } }
  var PN = { free: "Free", starter: "Plus", pro: "Pro", ultimate: "Max" };
  function who() {
    var nm = ($("#ac-user-name-big") || {}).textContent || "", em = ($("#ac-user-email-big") || {}).textContent || "";
    var signed = !!nm && !/not signed in/i.test(nm);
    var img = $("#ac-avatar-big img");
    return { signed: signed, name: signed ? nm.trim() : "Guest", email: signed ? em.trim() : "", img: img ? img.src : "" };
  }
  function avatar(u, cls) {
    var ini = (u.name || "G").trim().charAt(0).toUpperCase();
    return '<span class="' + cls + '">' + (u.img ? '<img alt="" src="' + esc(u.img) + '">' : esc(ini)) + "</span>";
  }

  /* line icons, 20px, currentColor */
  function ic(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>" }
  var IC = {
    user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
    card: ic('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>'),
    bars: ic('<path d="M5 20V11M12 20V4M19 20v-6"/>'),
    shield: ic('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    brush: ic('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 010 18" fill="currentColor" fill-opacity=".25"/>'),
    palette: ic('<path d="M12 3a9 9 0 100 18c1.7 0 2-1.2 1.3-2.2-.7-1 0-2.3 1.2-2.3H17a4 4 0 004-4c0-5-4-9.5-9-9.5z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="11" r="1"/>'),
    wave: ic('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>'),
    bell: ic('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>'),
    mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'),
    key: ic('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'),
    spark: ic('<path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z"/>'),
    out: ic('<path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3M16 8l4 4-4 4M20 12H9"/>'),
    google: ic('<path d="M20 12a8 8 0 11-2.3-5.6M12 12h8"/>'),
    help: ic('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/>'),
    search: ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    chev: '<svg class="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'
  };

  /* every row opens an existing page */
  var OPEN = {
    profile: function () { W.acOpen("profile") },
    plan: function () { W.acOpen("billing") },
    usage: function () { W.acOpen("usage") },
    security: function () { W.acOpen("security") },
    privacy: function () { W.acOpen("privacy") },
    look: function () { W.acOpen("settings") },
    themes: function () { W.PHR_LOOK && W.PHR_LOOK.open("themes") },
    voice: function () { W.PHR_VOICE && W.PHR_VOICE.open() },
    notif: function () { W.acOpen("notifications") },
    agent: function () { W.acOpen("agent") },
    keys: function () { W.PHR_AX && W.PHR_AX.open("keys") },
    news: function () { try { W.openWhatsNew(false) } catch (e) { } }
  };
  var GROUPS = [
    { t: "Account", rows: [["profile", "Profile", "user"], ["plan", "Plan", "card"], ["usage", "Usage", "bars"], ["security", "Sign-in & security", "shield"]] },
    { t: "App", rows: [["look", "Appearance", "brush"], ["themes", "Themes", "palette"], ["voice", "Voice", "wave"], ["notif", "Notifications", "bell"]] },
    { t: "Assistant", rows: [["agent", "Agent", "mic"], ["keys", "Keys", "key"], ["privacy", "Data & privacy", "lock"]] },
    { t: "About", rows: [["news", "What’s new", "spark"]] }
  ];
  var KEYW = { profile: "name email avatar", plan: "billing upgrade subscription pay pro plus max", usage: "limit messages tokens quota", security: "google login sign out password", look: "dark light text motion size", themes: "theme colour color accent rank level", voice: "speech tts sound call", notif: "alerts reminders push", agent: "wake word routines habits shadow console", keys: "codeword shortcut macro", privacy: "memory backup export delete activity", news: "updates changelog features" };

  function val(id) {
    try {
      var u = who();
      switch (id) {
        case "profile": return u.signed ? u.name.split(" ")[0] : "Guest";
        case "plan": return PN[planId()] || "Free";
        case "usage": var l = $("#ac2-left"), ll = $("#ac2-leftl"); return l ? (l.textContent + " " + (ll ? ll.textContent : "")).trim() : "";
        case "security": return u.signed ? "Google" : "";
        case "themes": var tn = D.body.dataset.theme || "obsidian", th = W.PHR_LOOK && W.PHR_LOOK.themes.filter(function (x) { return x[0] === tn })[0]; return th ? th[1] : "";
        case "voice": return W.PHR_VOICE ? W.PHR_VOICE.label() : "";
        case "agent": return W.PHR_WAKE && W.PHR_WAKE.enabled() ? "Listening" : "Off";
        case "keys": var n = W.PHR_KEYS ? W.PHR_KEYS.all().length : 0; return n ? String(n) : "";
        case "privacy": return W.PHR_SHADOW && W.PHR_SHADOW.enabled() ? "Shadow on" : "";
        case "news": try { return localStorage.getItem("phraortes_whatsnew_seen") !== WHATS_NEW[0].id ? "New" : "" } catch (e) { return "" }
      }
    } catch (e) { }
    return "";
  }

  function css() {
    if ($("#x4-css")) return;
    var s = D.createElement("style"); s.id = "x4-css";
    s.textContent = [
      /* hide the old stack, neutral page backgrounds */
      "#x3{display:none!important}",
      "#account-page[data-x3][data-view]:not([data-view=hub]){background-image:none!important}",
      "#ac2-bar .t{display:block!important}",
      "#ac2-bar{background:linear-gradient(180deg,var(--bg),transparent)!important;pointer-events:auto;height:auto!important}",
      /* hub */
      "#x4{--s:rgba(255,255,255,.07);--s2:rgba(255,255,255,.11);--ln:rgba(255,255,255,.09);--mut:rgba(255,255,255,.52);padding:4px 0 34px;font-family:-apple-system,system-ui,'Vazirmatn',sans-serif;color:var(--txt,#fff)}",
      "body.light-theme #x4{--s:rgba(43,35,19,.06);--s2:rgba(43,35,19,.1);--ln:rgba(43,35,19,.09);--mut:rgba(43,35,19,.55)}",
      ".x4-h{display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 0 20px}",
      ".x4-av{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,var(--p),color-mix(in srgb,var(--p) 45%,#000));color:#1a1204;font:700 30px -apple-system,system-ui,sans-serif}",
      ".x4-av img,.x4-sav img{width:100%;height:100%;object-fit:cover}",
      ".x4-h b{margin-top:12px;font-size:21px;font-weight:650;letter-spacing:-.01em}",
      ".x4-h small{margin-top:3px;font-size:13.5px;color:var(--mut)}",
      ".x4-pill{margin-top:10px;display:inline-block;padding:4px 11px;border-radius:99px;background:var(--s2);font-size:12px;font-weight:600}",
      ".x4-in{margin:4px 0 4px;width:100%;border:0;border-radius:14px;padding:14px;background:var(--txt,#fff);color:var(--bg,#000);font:600 15px -apple-system,system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}",
      ".x4-in svg{width:18px;height:18px}",
      ".x4-q{position:relative;margin:2px 0 4px}.x4-q svg{position:absolute;left:13px;top:50%;margin-top:-9px;width:18px;height:18px;color:var(--mut)}",
      ".x4-q input{width:100%;box-sizing:border-box;border:0;border-radius:12px;background:var(--s);color:inherit;padding:12px 14px 12px 40px;font:16px -apple-system,system-ui,sans-serif;outline:none}",
      ".x4-g{margin-top:22px}.x4-g.h{display:none}",
      ".x4-gt{margin:0 16px 7px;font-size:12.5px;font-weight:600;color:var(--mut);letter-spacing:.02em;text-transform:uppercase}",
      ".x4-l{border-radius:16px;background:var(--s);overflow:hidden}",
      ".x4-r{display:flex;align-items:center;gap:13px;width:100%;border:0;background:none;color:inherit;padding:0 14px;min-height:52px;font:500 16px -apple-system,system-ui,'Vazirmatn',sans-serif;text-align:left;cursor:pointer;position:relative}",
      ".x4-r.h{display:none}",
      ".x4-r+.x4-r::before{content:'';position:absolute;top:0;left:51px;right:0;height:.5px;background:var(--ln)}",
      ".x4-r:active{background:var(--s2)}",
      ".x4-r>svg{flex:none;width:22px;height:22px;opacity:.82}",
      ".x4-r span.n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".x4-r span.v{flex:none;max-width:44%;font-size:14.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".x4-r span.v.new{color:var(--p);font-weight:700}",
      ".x4-r svg.c{flex:none;width:16px;height:16px;opacity:.35}",
      ".x4-r.red{color:#ff6b6b}.x4-r.red>svg{opacity:1}",
      ".x4-ver{margin:22px 0 0;text-align:center;font-size:12px;color:var(--mut)}",
      /* sidebar user row + popover */
      ".x4-su{flex:none;display:flex;align-items:center;gap:11px;margin:0;padding:11px 14px calc(11px + env(safe-area-inset-bottom));border:0;border-top:.5px solid var(--brd,rgba(255,255,255,.1));background:none;color:var(--txt,#fff);width:100%;text-align:left;cursor:pointer;font-family:-apple-system,system-ui,'Vazirmatn',sans-serif}",
      ".x4-su:active{background:rgba(255,255,255,.06)}",
      ".x4-sav{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,var(--p),color-mix(in srgb,var(--p) 45%,#000));color:#1a1204;font:700 15px -apple-system,system-ui,sans-serif}",
      ".x4-su div{flex:1;min-width:0}.x4-su b{display:block;font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.x4-su small{display:block;font-size:12px;opacity:.6;margin-top:1px}",
      ".x4-su>svg{flex:none;width:18px;height:18px;opacity:.45}",
      "#x4-pop{position:fixed;left:10px;bottom:calc(66px + env(safe-area-inset-bottom));width:272px;z-index:4600;border-radius:18px;padding:6px;background:rgba(28,24,20,.97);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:.5px solid rgba(255,255,255,.14);box-shadow:0 18px 50px rgba(0,0,0,.6);color:#f4efe4;opacity:0;transform:translateY(8px) scale(.98);pointer-events:none;transition:opacity .16s,transform .2s cubic-bezier(.2,1,.3,1);transform-origin:bottom left}",
      "#x4-pop.on{opacity:1;transform:none;pointer-events:auto}",
      "body.light-theme #x4-pop{background:rgba(250,247,240,.98);color:#2b2313;border-color:rgba(43,35,19,.14)}",
      "#x4-pop .em{padding:9px 12px 8px;font-size:12.5px;opacity:.62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#x4-pop button{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;color:inherit;padding:11px 12px;border-radius:11px;font:500 15px -apple-system,system-ui,sans-serif;text-align:left;cursor:pointer}",
      "#x4-pop button:active{background:rgba(255,255,255,.09)}body.light-theme #x4-pop button:active{background:rgba(43,35,19,.07)}",
      "#x4-pop button svg{flex:none;width:19px;height:19px;opacity:.8}",
      "#x4-pop button.red{color:#ff7b7b}#x4-pop hr{border:0;height:.5px;background:rgba(128,128,128,.28);margin:5px 8px}",
      "#x4-scrim{position:fixed;inset:0;z-index:4590;display:none}#x4-scrim.on{display:block}"
    ].join("\n");
    D.head.appendChild(s);
  }

  /* ───────── hub ───────── */
  function paint() {
    var u = who(), hd = $("#x4-h");
    if (hd) hd.innerHTML = avatar(u, "x4-av") + "<b>" + esc(u.name) + "</b>" + (u.email ? "<small>" + esc(u.email) + "</small>" : "") + '<span class="x4-pill">' + esc(PN[planId()] || "Free") + " plan</span>";
    var sg = $("#x4-in"); if (sg) sg.style.display = u.signed ? "none" : "flex";
    D.querySelectorAll("#x4 .x4-r[data-id]").forEach(function (r) {
      var id = r.dataset.id; if (id === "out") { r.style.display = u.signed ? "" : "none"; return }
      var v = r.querySelector(".v"), t = val(id); if (v) { v.textContent = t; v.classList.toggle("new", id === "news" && t === "New") }
    });
    paintSide();
  }
  function build() {
    var hub = $("#ac2-hub"); if (!hub) return false; if ($("#x4")) return true;
    css();
    var d = D.createElement("div"); d.id = "x4";
    var h = '<div class="x4-h" id="x4-h"></div>' +
      '<button type="button" class="x4-in" id="x4-in">' + IC.google + 'Sign in with Google</button>' +
      '<div class="x4-q">' + IC.search + '<input id="x4-q" placeholder="Search settings" autocomplete="off" autocapitalize="off"></div>';
    GROUPS.forEach(function (g, gi) {
      h += '<div class="x4-g" data-g="' + gi + '"><div class="x4-gt">' + esc(g.t) + '</div><div class="x4-l">';
      g.rows.forEach(function (r) { h += '<button type="button" class="x4-r" data-id="' + r[0] + '">' + IC[r[2]] + '<span class="n">' + esc(r[1]) + '</span><span class="v"></span>' + IC.chev + "</button>" });
      h += "</div></div>";
    });
    h += '<div class="x4-g"><div class="x4-l"><button type="button" class="x4-r red" data-id="out">' + IC.out + '<span class="n">Sign out</span></button></div></div>';
    d.innerHTML = h;
    hub.insertBefore(d, hub.firstChild);
    d.addEventListener("click", function (e) {
      var r = e.target.closest(".x4-r"); if (!r) return; hap("light");
      var id = r.dataset.id;
      if (id === "out") { try { W.handleLogout() } catch (er) { } return }
      try { OPEN[id]() } catch (er) { }
    });
    $("#x4-in").onclick = function () { try { W.initiateGoogleOAuth() } catch (e) { } };
    $("#x4-q").oninput = function () {
      var q = this.value.trim().toLowerCase();
      d.querySelectorAll(".x4-r[data-id]").forEach(function (r) {
        var id = r.dataset.id; if (id === "out") return;
        var t = (r.querySelector(".n").textContent + " " + (KEYW[id] || "")).toLowerCase();
        r.classList.toggle("h", !!q && t.indexOf(q) < 0);
      });
      d.querySelectorAll(".x4-g[data-g]").forEach(function (g) { g.classList.toggle("h", !g.querySelector(".x4-r:not(.h)")) });
    };
    paint(); return true;
  }

  /* ───────── sidebar user row + menu ───────── */
  var pop, scrim;
  function closePop() { if (pop) pop.classList.remove("on"); if (scrim) scrim.classList.remove("on") }
  function openSettings() { closePop(); try { W.toggleS && D.getElementById("sidebar").classList.contains("active") && W.toggleS() } catch (e) { } setTimeout(function () { try { W.openAccountPage() } catch (e) { } }, 120) }
  function buildSide() {
    var sb = $("#sidebar"); if (!sb) return false; if ($("#x4-su")) return true;
    css();
    var b = D.createElement("button"); b.type = "button"; b.id = "x4-su"; b.className = "x4-su";
    sb.appendChild(b);
    scrim = D.createElement("div"); scrim.id = "x4-scrim"; scrim.onclick = closePop; D.body.appendChild(scrim);
    pop = D.createElement("div"); pop.id = "x4-pop"; D.body.appendChild(pop);
    b.onclick = function (e) { e.stopPropagation(); hap(); paintSide(); var on = !pop.classList.contains("on"); pop.classList.toggle("on", on); scrim.classList.toggle("on", on) };
    pop.onclick = function (e) {
      var t = e.target.closest("button"); if (!t) return; hap(); var a = t.dataset.a; closePop();
      var sidebarClose = function () { try { D.getElementById("sidebar").classList.contains("active") && W.toggleS() } catch (er) { } };
      if (a === "settings") return openSettings();
      if (a === "plan") { sidebarClose(); setTimeout(function () { try { W.openPremium() } catch (er) { } }, 140); return }
      if (a === "news") { sidebarClose(); setTimeout(function () { try { W.openWhatsNew(false) } catch (er) { } }, 140); return }
      if (a === "in") { try { W.initiateGoogleOAuth() } catch (er) { } return }
      if (a === "out") { try { W.handleLogout() } catch (er) { } }
    };
    paintSide(); return true;
  }
  function paintSide() {
    var b = $("#x4-su"); if (!b) return; var u = who(), p = PN[planId()] || "Free";
    b.innerHTML = avatar(u, "x4-sav") + "<div><b>" + esc(u.name) + "</b><small>" + esc(p) + "</small></div>" + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>';
    if (pop) pop.innerHTML = (u.signed ? '<div class="em">' + esc(u.email || u.name) + "</div>" : "") +
      '<button type="button" data-a="plan">' + IC.card + (planId() === "ultimate" ? "Your plan" : "Upgrade plan") + "</button>" +
      '<button type="button" data-a="settings">' + IC.user + "Settings</button>" +
      '<button type="button" data-a="news">' + IC.spark + "What’s new</button><hr>" +
      (u.signed ? '<button type="button" class="red" data-a="out">' + IC.out + "Sign out</button>" : '<button type="button" data-a="in">' + IC.google + "Sign in with Google</button>");
  }

  /* ───────── wiring ───────── */
  W.PHR_ACCT3 = { paint: paint, close: closePop };
  function wire() {
    var ok = build(), ok2 = buildSide();
    if (!ok || !ok2) return false;
    var op = W.openAccountPage;
    if (typeof op === "function" && !op.__x4) { W.openAccountPage = function () { var r = op.apply(this, arguments); setTimeout(paint, 300); return r }; W.openAccountPage.__x4 = 1 }
    var ob = W.acBack;
    if (typeof ob === "function" && !ob.__x4) { W.acBack = function () { var r = ob.apply(this, arguments); setTimeout(paint, 80); return r }; W.acBack.__x4 = 1 }
    setInterval(function () { if (!D.hidden) paintSide() }, 4000);
    return true;
  }
  (function wait(n) { if (!wire() && n < 240) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
