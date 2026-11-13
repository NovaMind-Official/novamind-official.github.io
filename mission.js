/* Phraortes agent layer
   ```plan  — mission board: the AI lays out steps, the app runs them one by one (or all) and tracks status.
   ```act   — a tap-to-confirm action on the user's phone: calendar event (.ics), Shortcuts, mail, sms, call, map, share, link. */
(function () {
  "use strict";
  var W = window.PHRW; if (!W || !W.builders) return;
  var inline = function (s) { return window.PHR_inline ? window.PHR_inline(s) : esc(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toFa(n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  var S = {
    en: { plan: "mission", act: "action", run: "Run next", all: "Run all", stop: "Stop", done: "Done", of: "of", running: "Running…", ready: "Mission complete", again: "Reset",
      go: "Do it", copy: "Copy", copied: "Copied", cal: "Add to Calendar", sc: "Run shortcut", mail: "Open mail", sms: "Open Messages", call: "Call", map: "Open in Maps", share: "Share", link: "Open", tapNote: "Runs only when you tap" },
    fa: { plan: "مأموریت", act: "اقدام", run: "اجرای بعدی", all: "اجرای همه", stop: "توقف", done: "تمام", of: "از", running: "در حال اجرا…", ready: "مأموریت کامل شد", again: "از اول",
      go: "انجام بده", copy: "کپی", copied: "کپی شد", cal: "افزودن به تقویم", sc: "اجرای میان‌بر", mail: "باز کردن ایمیل", sms: "باز کردن پیام", call: "تماس", map: "باز کردن نقشه", share: "اشتراک‌گذاری", link: "باز کردن", tapNote: "فقط با لمس تو اجرا می‌شود" }
  };
  function T(root) { return S[root._lang === "fa" ? "fa" : "en"]; }
  function num(root, n) { return root._lang === "fa" ? toFa(n) : String(n); }
  function cfg(root) { try { return decodeURIComponent(root.getAttribute("data-cfg") || ""); } catch (e) { return ""; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function busy() { return typeof window.PHR_busy === "function" ? window.PHR_busy() : false; }
  function head(badge, title) { return '<div class="phr-w-head"><span class="phr-w-badge">' + esc(badge) + '</span><span class="phr-w-title">' + esc(title || "") + "</span></div>"; }

  var st = document.createElement("style"); st.id = "phr-agent-css";
  st.textContent =
    ".ag{padding:14px 14px 6px}.ag-goal{font-size:16px;font-weight:650;line-height:1.55;letter-spacing:-.01em;margin:0 0 4px}.ag-meter{height:4px;border-radius:2px;background:rgba(255,255,255,.12);margin:10px 0 14px;overflow:hidden}.ag-meter i{display:block;height:100%;background:linear-gradient(90deg,#F4D98B,#C79A3E);transition:width .5s cubic-bezier(.2,.8,.2,1)}" +
    ".ag-st{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(255,255,255,.07);cursor:pointer;-webkit-tap-highlight-color:transparent}.ag-st:first-of-type{border-top:0}" +
    ".ag-ic{flex:none;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(255,255,255,.28);display:grid;place-items:center;font:700 11px 'IBM Plex Mono',monospace;margin-top:1px;transition:all .3s}.ag-st.x .ag-ic{background:linear-gradient(135deg,#F4D98B,#C79A3E);border-color:transparent;color:#1a1206}.ag-st.r .ag-ic{border-color:#F4D98B;border-top-color:transparent;animation:agspin 1s linear infinite}.ag-st.f .ag-ic{border-color:#ff6b5a;color:#ff6b5a}" +
    "@keyframes agspin{to{transform:rotate(360deg)}}.ag-tx{flex:1;font-size:14.5px;line-height:1.6;min-width:0}.ag-st.x .ag-tx{opacity:.55;text-decoration:line-through;text-decoration-color:rgba(255,255,255,.25)}.ag-nt{display:block;font-size:12.5px;opacity:.6;margin-top:2px}" +
    ".ag-bar{display:flex;gap:8px;padding:6px 14px 14px;flex-wrap:wrap;align-items:center}.ag-sp{flex:1}.ag-fin{padding:2px 14px 12px;font-size:13.5px;color:#58C48F}" +
    ".ac{padding:14px}.ac-t{font-size:16px;font-weight:650;line-height:1.5;margin:0 0 10px}.ac-r{display:flex;gap:10px;font-size:13.5px;line-height:1.6;padding:5px 0;border-top:1px solid rgba(255,255,255,.07)}.ac-r b{flex:none;width:68px;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;opacity:.55;padding-top:3px}.ac-r span{flex:1;min-width:0;word-break:break-word}" +
    ".ac-bar{display:flex;gap:8px;align-items:center;padding:12px 14px 14px;flex-wrap:wrap}.ac-nt{font-size:11.5px;opacity:.5;flex:1}";
  document.head.appendChild(st);

  /* ================= PLAN ================= */
  function parsePlan(raw) {
    var lines = String(raw || "").replace(/\r/g, "").split("\n"), top = {}, steps = [];
    lines.forEach(function (ln) {
      var m = ln.match(/^\s*(?:[-*]|\d+[.)])\s*\[([ xX~!\/])\]\s*(.+)$/);
      if (m) { var c = m[1].toLowerCase(), t = m[2], note = ""; var p = t.split(/\s\|\s/); t = p[0].trim(); note = (p[1] || "").trim(); steps.push({ t: t, n: note, s: c === "x" ? "x" : c === "~" || c === "/" ? "r" : c === "!" ? "f" : "" }); return; }
      var k = ln.match(/^\s*(id|goal|title|auto|lang)\s*:\s*(.*)$/i); if (k) { top[k[1].toLowerCase()] = k[2].trim(); return; }
      var b = ln.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/); if (b) { var q = b[1].split(/\s\|\s/); steps.push({ t: q[0].trim(), n: (q[1] || "").trim(), s: "" }); }
    });
    return { top: top, steps: steps };
  }
  W.builders.plan = function (root) {
    var P = parsePlan(cfg(root)); if (!P.steps.length) throw new Error("plan: no steps");
    var t = T(root), goal = P.top.goal || P.top.title || "", id = "phr_plan_" + (P.top.id || hash(goal + P.steps.map(function (s) { return s.t; }).join("|")));
    var stored = {}; try { stored = JSON.parse(ls(id) || "{}"); } catch (e) {}
    var steps = P.steps.map(function (s) { return { t: s.t, n: s.n, s: s.s || stored[hash(s.t)] || "" }; });
    var auto = false, token = 0;
    root.innerHTML = head(t.plan, P.top.title || "") + '<div class="ag"><div class="ag-goal"></div><div class="ag-meter"><i></i></div><div class="ag-list"></div></div><div class="ag-fin" hidden>✓ ' + esc(t.ready) + '</div><div class="ag-bar"></div>';
    var gEl = root.querySelector(".ag-goal"), list = root.querySelector(".ag-list"), meter = root.querySelector(".ag-meter i"), bar = root.querySelector(".ag-bar"), fin = root.querySelector(".ag-fin");
    gEl.innerHTML = inline(goal);
    function save() { var o = {}; steps.forEach(function (s) { if (s.s) o[hash(s.t)] = s.s; }); ls(id, JSON.stringify(o)); }
    function nextIdx() { for (var i = 0; i < steps.length; i++) if (steps[i].s !== "x") return i; return -1; }
    function paint() {
      var d = steps.filter(function (s) { return s.s === "x"; }).length;
      list.innerHTML = steps.map(function (s, i) { return '<div class="ag-st ' + s.s + '" data-i="' + i + '"><span class="ag-ic">' + (s.s === "x" ? "✓" : s.s === "f" ? "✕" : s.s === "r" ? "" : num(root, i + 1)) + '</span><div class="ag-tx">' + inline(s.t) + (s.n ? '<span class="ag-nt">' + inline(s.n) + "</span>" : "") + "</div></div>"; }).join("");
      meter.style.width = Math.round(d / steps.length * 100) + "%"; fin.hidden = d !== steps.length;
      var running = steps.some(function (s) { return s.s === "r"; });
      bar.innerHTML = (auto || running ? '<button class="phr-w-btn" data-a="stop">' + t.stop + "</button>" : (d < steps.length ? '<button class="phr-w-btn" data-a="one">' + t.run + '</button><button class="phr-w-btn gold" data-a="all">' + t.all + "</button>" : "")) + '<span class="ag-sp"></span><span style="font:600 12px monospace;opacity:.6;direction:ltr">' + num(root, d) + "/" + num(root, steps.length) + "</span>" + (d ? '<button class="phr-w-btn" data-a="reset">' + t.again + "</button>" : "");
    }
    list.addEventListener("click", function (e) { var el = e.target.closest(".ag-st"); if (!el) return; var s = steps[+el.getAttribute("data-i")]; s.s = s.s === "x" ? "" : "x"; save(); paint(); });
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var a = b.getAttribute("data-a");
      if (a === "stop") { auto = false; token++; steps.forEach(function (s) { if (s.s === "r") s.s = ""; }); save(); paint(); }
      else if (a === "reset") { steps.forEach(function (s) { s.s = ""; }); auto = false; token++; save(); paint(); }
      else if (a === "one") runStep(false, ++token); else if (a === "all") { auto = true; runStep(true, ++token); }
    });
    function msg(i) { return "[agent] Mission: " + goal + "\nExecute step " + (i + 1) + " of " + steps.length + ": " + steps[i].t + (steps[i].n ? " (" + steps[i].n + ")" : "") + "\nDo only this step now: actually produce its result (use the right artifact or tool), keep it tight, do not repeat the plan. End with one line: 'Step " + (i + 1) + " done' or what blocked you."; }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    async function runStep(chain, tk) {
      var i = nextIdx();
      if (i < 0) { auto = false; paint(); return; }
      steps[i].s = "r"; paint();
      var sentOk = false, tries = 0;
      while (!sentOk && tries < 60 && tk === token && root.isConnected) { sentOk = typeof window.PHR_sendText === "function" && window.PHR_sendText(msg(i)); if (!sentOk) { tries++; await sleep(1000); } }
      if (!sentOk || tk !== token) { if (steps[i].s === "r") steps[i].s = ""; paint(); return; }
      var t0 = Date.now(); while (!busy() && Date.now() - t0 < 10000 && tk === token) await sleep(250);
      while (busy() && tk === token && root.isConnected) await sleep(500);
      if (tk !== token) return;
      steps[i].s = "x"; save(); paint();
      if (chain && auto && nextIdx() >= 0) { await sleep(900); if (tk === token) runStep(true, tk); } else { auto = false; paint(); }
    }
    paint();
  };

  /* ================= ACT ================= */
  function parseAct(raw) { var o = {}, last = null; String(raw || "").replace(/\r/g, "").split("\n").forEach(function (ln) { var m = ln.match(/^\s*([a-z_]+)\s*:\s?(.*)$/i); if (m) { last = m[1].toLowerCase(); o[last] = m[2].trim(); } else if (last && ln.trim()) o[last] += "\n" + ln.trim(); }); return o; }
  function pad(n) { return ("0" + n).slice(-2); }
  function dtICS(s) { var m = String(s || "").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/); return m ? m[1] + pad(m[2]) + pad(m[3]) + "T" + pad(m[4]) + m[5] + "00" : null; }
  function addMin(s, mins) { var m = s.match(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)/); var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5] + mins); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00"; }
  function icsEsc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function makeICS(c) {
    var s = dtICS(c.start); if (!s) return null; var e = dtICS(c.end) || addMin(s, parseInt(c.duration, 10) || 60), al = parseInt(c.alarm, 10);
    var l = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phraortes//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "@phraortes", "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d+/g, ""), "DTSTART:" + s, "DTEND:" + e, "SUMMARY:" + icsEsc(c.title || "Event")];
    if (c.notes) l.push("DESCRIPTION:" + icsEsc(c.notes)); if (c.place) l.push("LOCATION:" + icsEsc(c.place));
    if (isFinite(al)) l.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(c.title || "Event"), "TRIGGER:-PT" + Math.max(0, al) + "M", "END:VALARM");
    l.push("END:VEVENT", "END:VCALENDAR"); return l.join("\r\n");
  }
  function openURL(u) { var a = document.createElement("a"); a.href = u; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
  W.builders.act = function (root) {
    var c = parseAct(cfg(root)), t = T(root), type = (c.type || "link").toLowerCase().replace(/[^a-z]/g, "");
    var rows = [], label = t.go, doit = null, textToCopy = "";
    function row(k, v) { if (v) rows.push('<div class="ac-r"><b>' + esc(k) + "</b><span>" + inline(v) + "</span></div>"); }
    if (type === "event" || type === "calendar" || type === "reminder" || type === "alarm") {
      var ics = makeICS(c); if (!ics) throw new Error("act: start must be YYYY-MM-DD HH:MM");
      label = t.cal; row("when", c.start + (c.end ? " → " + c.end : "")); row("place", c.place); row("alarm", c.alarm ? c.alarm + " min" : ""); row("notes", c.notes);
      doit = function () { var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); var a = document.createElement("a"); a.href = url; a.download = "event.ics"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 20000); }; textToCopy = ics;
    } else if (type === "shortcut" || type === "shortcuts") {
      if (!c.name) throw new Error("act: shortcut name");
      label = t.sc; row("shortcut", c.name); row("input", c.input); var u = "shortcuts://run-shortcut?name=" + encodeURIComponent(c.name) + (c.input ? "&input=text&text=" + encodeURIComponent(c.input) : "");
      doit = function () { openURL(u); }; textToCopy = c.input || c.name;
    } else if (type === "mail" || type === "email") {
      label = t.mail; row("to", c.to); row("subject", c.subject); row("body", c.body); var u2 = "mailto:" + encodeURIComponent(c.to || "") + "?subject=" + encodeURIComponent(c.subject || "") + "&body=" + encodeURIComponent(c.body || "");
      doit = function () { openURL(u2); }; textToCopy = c.body || "";
    } else if (type === "sms" || type === "message") {
      label = t.sms; row("to", c.to || c.number); row("text", c.body || c.text); var u3 = "sms:" + (c.to || c.number || "") + "&body=" + encodeURIComponent(c.body || c.text || "");
      doit = function () { openURL(u3); }; textToCopy = c.body || c.text || "";
    } else if (type === "call" || type === "tel") {
      label = t.call; row("number", c.number || c.to); doit = function () { openURL("tel:" + String(c.number || c.to).replace(/[^\d+]/g, "")); };
    } else if (type === "map" || type === "maps") {
      label = t.map; row("place", c.query || c.place); doit = function () { openURL("https://maps.apple.com/?q=" + encodeURIComponent(c.query || c.place || "")); };
    } else if (type === "share") {
      label = t.share; row("text", c.text || c.body); textToCopy = c.text || c.body || "";
      doit = function () { if (navigator.share) navigator.share({ text: textToCopy, title: c.title || "" }).catch(function () {}); else copy(); };
    } else { // link
      if (!/^https?:\/\//i.test(c.url || "")) throw new Error("act: url must be http(s)"); label = t.link; row("url", c.url); doit = function () { window.open(c.url, "_blank", "noopener"); }; textToCopy = c.url;
    }
    function copy() { try { navigator.clipboard.writeText(textToCopy); } catch (e) {} }
    root.innerHTML = head(t.act, "") + '<div class="ac"><div class="ac-t">' + inline(c.title || label) + "</div>" + rows.join("") + '</div><div class="ac-bar"><span class="ac-nt">' + esc(t.tapNote) + (textToCopy ? '</span><button class="phr-w-btn" data-a="c">' + t.copy + "</button>" : "</span>") + '<button class="phr-w-btn gold" data-a="g">' + esc(label) + "</button></div>";
    root.querySelector('[data-a="g"]').addEventListener("click", doit);
    var cb = root.querySelector('[data-a="c"]'); if (cb) cb.addEventListener("click", function () { copy(); cb.textContent = t.copied + " ✓"; setTimeout(function () { cb.textContent = t.copy; }, 1800); });
  };

  var AL = { plan: "plan", agent: "plan", mission: "plan", act: "act", action: "act", phone: "act", shortcut: "act", remind: "act", calendar: "act" };
  if (W.ALIAS) Object.keys(AL).forEach(function (k) { W.ALIAS[k] = AL[k]; });
  W.kinds.plan = W.kinds.act = 1;
})();
