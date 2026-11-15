/* Phraortes — Capture → Action (capture.js)
   Give the agent anything (photo, screenshot, file, pasted text, a voice note) and it works out what to DO with it:
   the AI answers with a ```capture fence and this file turns it into action cards (calendar, reminder, task, note,
   contact, expense, link, message). */
(function () {
  "use strict";
  var W = window, D = document;
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  function pad(n) { return ("0" + n).slice(-2) }
  var ICON = { event: "📅", reminder: "⏰", task: "☑︎", note: "✎", contact: "👤", expense: "💳", link: "🔗", message: "💬" };
  var LABEL = { event: "Event", reminder: "Reminder", task: "Task", note: "Note", contact: "Contact", expense: "Expense", link: "Link", message: "Message" };

  function css() {
    if (D.getElementById("cp-css")) return;
    var s = D.createElement("style"); s.id = "cp-css";
    s.textContent = [
      ".cp-card{margin:14px 0;border-radius:22px;overflow:hidden;border:1px solid rgba(111,227,160,.3);background:linear-gradient(180deg,#0b1612,#070b09);box-shadow:0 14px 40px rgba(0,0,0,.45);max-width:540px;direction:ltr;text-align:left;font-family:-apple-system,system-ui,'Inter',sans-serif}",
      ".cp-h{position:relative;padding:14px 16px 12px;border-bottom:1px solid rgba(111,227,160,.14)}",
      ".cp-h:before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#6fe3a0,#E8C468,transparent)}",
      ".cp-k{font:700 10px/1 'Space Mono',ui-monospace,monospace;letter-spacing:.22em;color:#6fe3a0}",
      ".cp-t{margin-top:8px;font-size:17px;font-weight:700;color:#eafff3;line-height:1.3}",
      ".cp-s{margin-top:4px;font-size:13.5px;color:#8fb3a1;line-height:1.5}",
      ".cp-all{display:block;width:calc(100% - 24px);margin:12px;padding:13px;border:0;border-radius:14px;background:linear-gradient(135deg,#6fe3a0,#3fbf86);color:#04120b;font:700 14px/1 -apple-system,system-ui,sans-serif;cursor:pointer}",
      ".cp-all:active{transform:scale(.98)}",
      ".cp-all[disabled]{opacity:.55}",
      ".cp-r{display:flex;align-items:center;gap:12px;padding:11px 14px;border-top:1px solid rgba(111,227,160,.1)}",
      ".cp-ic{flex:none;width:36px;height:36px;border-radius:11px;background:rgba(111,227,160,.09);display:flex;align-items:center;justify-content:center;font-size:17px}",
      ".cp-b{flex:1;min-width:0}",
      ".cp-b b{display:block;color:#f2fff7;font-size:14.5px;font-weight:600;line-height:1.35;word-break:break-word}",
      ".cp-b span{display:block;margin-top:2px;color:#79a08c;font-size:12.5px;line-height:1.4;word-break:break-word}",
      ".cp-btns{flex:none;display:flex;flex-direction:column;gap:6px}",
      ".cp-btns button,.cp-btns a{border:1px solid rgba(111,227,160,.35);background:rgba(111,227,160,.08);color:#9ff0c3;border-radius:11px;padding:8px 12px;font:600 12px/1 -apple-system,system-ui,sans-serif;cursor:pointer;text-decoration:none;text-align:center;white-space:nowrap}",
      ".cp-btns .d{background:rgba(111,227,160,.2);border-color:transparent;color:#6fe3a0;pointer-events:none}",
      "body.light-theme .cp-card{background:linear-gradient(180deg,#f3faf6,#e9f3ed);border-color:rgba(30,120,80,.3)}",
      "body.light-theme .cp-t,body.light-theme .cp-b b{color:#0d2b1c}body.light-theme .cp-s,body.light-theme .cp-b span{color:#3d6b55}"
    ].join("\n");
    D.head.appendChild(s);
  }

  function parse(src) {
    var t = String(src || "").trim(), j = null;
    try { j = JSON.parse(t) } catch (e) { var m = /\{[\s\S]*\}/.exec(t); if (m) { try { j = JSON.parse(m[0]) } catch (e2) { } } }
    if (!j || typeof j !== "object" || !Array.isArray(j.actions)) return null;
    j.actions = j.actions.filter(function (a) { return a && ICON[a.type] }).slice(0, 10);
    return j;
  }
  function pdate(s) { var m = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || "")); if (!m) return null; return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 9), +(m[5] || 0)) }
  function fmt(d) { if (!d) return ""; var dd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]; return dd + " " + d.getDate() + "/" + (d.getMonth() + 1) + " · " + pad(d.getHours()) + ":" + pad(d.getMinutes()) }
  function key(j) { var h = 0, s = JSON.stringify(j); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "c" + Math.abs(h) }
  function doneSet() { try { return JSON.parse(LS("phr_cap_done") || "{}") } catch (e) { return {} } }
  function mark(k) { var d = doneSet(); d[k] = 1; var ks = Object.keys(d); if (ks.length > 300) delete d[ks[0]]; LS("phr_cap_done", JSON.stringify(d)) }

  function sub(a) {
    var d = a.type === "event" ? pdate(a.start) : a.type === "reminder" ? pdate(a.when) : a.type === "task" ? pdate(a.due) : null, bits = [];
    if (d) bits.push(fmt(d)); if (a.location) bits.push("📍 " + a.location);
    if (a.type === "expense") bits.push([a.amount, a.currency].filter(Boolean).join(" "), a.date || "");
    if (a.type === "contact") bits.push([a.phone, a.email, a.org].filter(Boolean).join(" · "));
    if (a.type === "link") bits.push(a.url || ""); if (a.type === "message") bits.push((a.to ? "To " + a.to + ": " : "") + (a.text || ""));
    if (a.type === "note") bits.push(""); if (a.notes) bits.push(a.notes);
    return bits.filter(Boolean).join(" · ");
  }
  function titleOf(a) { return a.title || a.name || a.text || (a.type === "link" ? a.url : "") || LABEL[a.type] }
  function btnsFor(a, i, k, done) {
    var d = function (x) { return done[k + ":" + i + ":" + x] };
    var B = function (id, t) { return d(id) ? '<button class="d" type="button">✓ Done</button>' : '<button type="button" data-a="' + id + '" data-i="' + i + '" onclick="PHR_CAPTURE.act(this)">' + t + "</button>" };
    switch (a.type) {
      case "event": return B("cal", "Add to Calendar") + (pdate(a.start) && pdate(a.start) > new Date() ? B("rem", "Remind me") : "");
      case "reminder": return B("rem", "Set reminder") + B("cal", "Calendar");
      case "task": return B("save", "Save task");
      case "note": return B("save", "Save note");
      case "expense": return B("save", "Save");
      case "contact": return B("vcf", "Save contact");
      case "link": return a.url ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener">Open</a>' : "";
      case "message": return B("copy", "Copy");
    }
    return "";
  }
  function html(src) {
    css(); var j = parse(src);
    if (!j) return '<div class="cp-card"><div class="cp-h"><div class="cp-k">CAPTURE</div><div class="cp-s">Reading it…</div></div></div>';
    var k = key(j), done = doneSet(), n = 0;
    var rows = j.actions.map(function (a, i) {
      n++; return '<div class="cp-r"><div class="cp-ic">' + ICON[a.type] + '</div><div class="cp-b"><b dir="auto">' + esc(titleOf(a)) + '</b><span dir="auto">' + esc(sub(a)) + '</span></div><div class="cp-btns">' + btnsFor(a, i, k, done) + "</div></div>";
    }).join("");
    try { W.__phrCapture = 0 } catch (e) { }
    return '<div class="cp-card" data-k="' + k + '" data-j="' + encodeURIComponent(JSON.stringify(j)) + '"><div class="cp-h"><div class="cp-k">CAPTURED · ' + n + " ACTION" + (n === 1 ? "" : "S") + '</div><div class="cp-t" dir="auto">' + esc(j.title || "Captured") + "</div>" + (j.summary ? '<div class="cp-s" dir="auto">' + esc(j.summary) + "</div>" : "") + "</div>" +
      (n > 1 ? '<button class="cp-all" type="button" onclick="PHR_CAPTURE.all(this)">Do all ' + n + " actions</button>" : "") + rows + "</div>";
  }

  /* ---- actions ---- */
  function icsEvent(a, uidn) {
    var s = pdate(a.start || a.when || a.due) || new Date(Date.now() + 36e5), e = pdate(a.end) || new Date(s.getTime() + 60 * 6e4);
    function f(z) { return z.getFullYear() + pad(z.getMonth() + 1) + pad(z.getDate()) + "T" + pad(z.getHours()) + pad(z.getMinutes()) + "00" }
    function x(t) { return String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n") }
    return ["BEGIN:VEVENT", "UID:cap" + uidn + "-" + Date.now() + "@phraortes", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), "DTSTART:" + f(s), "DTEND:" + f(e), "SUMMARY:" + x(titleOf(a)), a.location ? "LOCATION:" + x(a.location) : "", a.notes ? "DESCRIPTION:" + x(a.notes) : "", "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + x(titleOf(a)), "TRIGGER:-PT30M", "END:VALARM", "END:VEVENT"].filter(Boolean).join("\r\n");
  }
  function download(name, mime, text) {
    var a = D.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href) }, 5000);
  }
  function cal(list) { download("phraortes-events.ics", "text/calendar", ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phraortes//EN"].concat(list.map(function (a, i) { return icsEvent(a, i) })).concat(["END:VCALENDAR"]).join("\r\n")) }
  function vcf(a) { download((a.name || "contact") + ".vcf", "text/vcard", ["BEGIN:VCARD", "VERSION:3.0", "FN:" + (a.name || ""), a.org ? "ORG:" + a.org : "", a.phone ? "TEL:" + a.phone : "", a.email ? "EMAIL:" + a.email : "", "END:VCARD"].filter(Boolean).join("\r\n")) }
  function life(kind, text, due) { try { return W.LIFE && W.LIFE.add({ text: text, kind: kind, due: due, src: "capture" }) } catch (e) { return null } }
  function remind(a) {
    var d = pdate(a.when || a.start); if (!d) return false;
    var s = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    try { var r = W.PHR_HANDS && W.PHR_HANDS.tool("set_reminder", { text: titleOf(a), when: s }); return !/^Error/.test(String(r)) } catch (e) { return false }
  }
  function run(a, what) {
    switch (what) {
      case "cal": cal([a]); return true;
      case "rem": return remind(a);
      case "vcf": vcf(a); return true;
      case "copy": try { navigator.clipboard.writeText((a.text || "")); return true } catch (e) { return false }
      case "save":
        if (a.type === "task") return !!life("plan", titleOf(a) + (a.due ? " (due " + a.due + ")" : ""), a.due);
        if (a.type === "expense") return !!life("money", titleOf(a) + " " + [a.amount, a.currency].filter(Boolean).join(" ") + (a.date ? " on " + a.date : ""));
        return !!life("fact", a.text || titleOf(a));
    }
    return false;
  }
  function setDone(btn, ok) { if (ok) { btn.className = "d"; btn.textContent = "✓ Done"; btn.removeAttribute("onclick"); var c = btn.closest(".cp-card"); mark(c.dataset.k + ":" + btn.dataset.i + ":" + btn.dataset.a) } else { btn.textContent = "Couldn't" } }
  var API = {
    html: html,
    act: function (b) { var c = b.closest(".cp-card"); if (!c) return; var j = JSON.parse(decodeURIComponent(c.dataset.j)), a = j.actions[+b.dataset.i]; if (!a) return; var ok = run(a, b.dataset.a); if (b.dataset.a === "cal") ok = true; setDone(b, ok) },
    all: function (b) {
      var c = b.closest(".cp-card"); if (!c) return; var j = JSON.parse(decodeURIComponent(c.dataset.j)), evs = [], n = 0;
      j.actions.forEach(function (a, i) {
        if (a.type === "event") { evs.push(a); return }
        if (a.type === "reminder") { if (remind(a)) n++; evs.push(a); return }
        if (a.type === "task" || a.type === "note" || a.type === "expense") { if (run(a, "save")) n++ }
      });
      if (evs.length) { cal(evs); n += evs.length }
      [].forEach.call(c.querySelectorAll(".cp-btns button[data-a]"), function (x) { if (x.dataset.a !== "vcf" && x.dataset.a !== "copy") setDone(x, true) });
      b.disabled = true; b.textContent = "✓ Done · " + n + " saved" + (evs.length ? " (calendar file ready)" : "");
    },
    /* flow: open the picker (or take pasted text) and ask the AI to capture */
    start: function (text) {
      W.__phrCapture = Date.now();
      if (text && text.length > 8) { try { return W.PHR_sendText("Capture this:\n" + text) } catch (e) { return false } }
      var B = W.PHR_BRAIN; if (B && B.pick) { B.pick("Capture this: tell me what to do with it.", "What should I capture?"); return true }
      return false;
    },
    prompt: function () {
      var now = new Date(), tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch (e) { }
      var fresh = W.__phrCapture && Date.now() - W.__phrCapture < 120000;
      return "\n\nCAPTURE → ACTION: when the user gives you a photo, screenshot, document or pasted text that contains something to DO (an event, deadline, appointment, to-do, receipt or expense, contact, link, message to send), or says 'capture' / 'what should I do with this', answer with 1-2 short lines in THEIR language and then exactly one fenced block: ```capture\n{\"title\":\"short title\",\"summary\":\"one line\",\"actions\":[{\"type\":\"event\",\"title\":\"\",\"start\":\"YYYY-MM-DD HH:MM\",\"end\":\"YYYY-MM-DD HH:MM\",\"location\":\"\",\"notes\":\"\"},{\"type\":\"reminder\",\"title\":\"\",\"when\":\"YYYY-MM-DD HH:MM\"},{\"type\":\"task\",\"title\":\"\",\"due\":\"YYYY-MM-DD\"},{\"type\":\"note\",\"text\":\"\"},{\"type\":\"contact\",\"name\":\"\",\"phone\":\"\",\"email\":\"\",\"org\":\"\"},{\"type\":\"expense\",\"title\":\"\",\"amount\":\"\",\"currency\":\"\",\"date\":\"YYYY-MM-DD\"},{\"type\":\"link\",\"url\":\"\",\"title\":\"\"},{\"type\":\"message\",\"to\":\"\",\"text\":\"\"}]}\n```. Include only actions really present in the material (max 8, no invention; omit empty fields). Resolve relative dates against NOW = " + now.toString().slice(0, 21) + " (" + tz + "), 24-hour local time. If nothing actionable, just answer normally with no block." + (fresh ? " The user used Capture right now, so be thorough about extracting every actionable item." : "");
    }
  };
  W.PHR_CAPTURE = API;

  /* ---- agent hook ---- */
  var RX = /^(?:please |hey |ok )?(?:capture|scan|snap|digitize|digitise)(?: this| that| it| the| a| an| my)?(?: photo| picture| screenshot| image| page| document| note| text| flyer| poster| receipt| invoice| whiteboard)?\s*[:\-–—]?\s*(.*)$|^what (?:should|do) i (?:do|need to do) (?:with|about) (?:this|it|that)$|^turn (?:this|it|that) into (?:tasks?|reminders?|events?|actions?|a to-?do)|^(?:اینو|این رو|این را)?\s*(?:اسکن|کپچر|بگیر)(?: کن)?(?: این| اینو)?\s*[:\-–—]?\s*(.*)$|^(?:با این|با اینو) (?:چیکار|چه کار) (?:کنم|کنیم)$/i;
  function norm(t) { return String(t || "").trim().replace(/\s+/g, " ").replace(/[.!؟?]+$/, "") }
  function handle(raw) {
    var t = norm(raw), m = RX.exec(t); if (!m) return false;
    var body = (m[1] || m[2] || "").trim(), fa = /[؀-ۿ]/.test(t);
    if (body.length > 8) { API.start(body); return fa ? "دارم می‌خونمش." : "On it." }
    if (!API.start("")) return fa ? "الان نمی‌تونم باز کنم." : "I can't open the picker right now.";
    return fa ? "یه عکس یا فایل انتخاب کن." : "Pick a photo or file.";
  }
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__cap) return false; A.__cap = true;
    var oT = A.typed, oV = A.voice, oP = A.prompt;
    A.typed = function (t) { var r; try { r = handle(t) } catch (e) { r = false } return r || oT(t) };
    A.voice = function (t, quiet) { var r; try { r = handle(t) } catch (e) { r = false } if (r) { if (quiet) return r; try { (W.auraSetCaption || function () { })(r, "hint"); (W.auraSpeak || function () { })(r) } catch (e) { } return true } return oV(t, quiet) };
    A.prompt = function (t) { return oP(t) + API.prompt() };
    return true;
  }
  (function wait(n) { if (!install() && n < 120) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
