/* Phraortes — Smart agent layer (smart.js)
   1) Acts first: the agent infers missing details from time, habits and recent use instead of asking questions.
   2) Safe by design: risky actions show a preview card (Confirm / Cancel); reversible ones run at once with an Undo chip.
   3) Follows up: plans the user mentions are remembered and checked on later ("Did you change the price?").
   Works through PHR_AGENT (app_do) and PHR_HANDS (reminders/timers); no server needed. */
(function () {
  "use strict";
  var W = window, D = document;
  var G = function (n) { try { return (0, eval)(n) } catch (e) { return undefined } };
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }
  var RTL = /[֐-ࣿ]/;
  var isFa = function (t) { return RTL.test(t || "") || D.documentElement.dir === "rtl" };

  /* ───────────── UI dock ───────────── */
  function css() {
    if (D.getElementById("sm-css")) return; var s = D.createElement("style"); s.id = "sm-css";
    s.textContent = [
      "#sm-dock{position:fixed;left:0;right:0;bottom:calc(92px + env(safe-area-inset-bottom));z-index:9400;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 14px;font-family:'Space Grotesk','Vazirmatn',-apple-system,system-ui,sans-serif}",
      "#sm-dock>*{pointer-events:auto;animation:smIn .32s cubic-bezier(.2,1,.3,1)}@keyframes smIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}",
      ".sm-chip{display:flex;align-items:center;gap:12px;max-width:100%;padding:9px 9px 9px 15px;border-radius:99px;background:rgba(24,20,13,.94);border:1px solid rgba(232,196,104,.4);box-shadow:0 10px 30px rgba(0,0,0,.45);color:#f4efe2;font-size:13.5px;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}",
      ".sm-chip span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sm-chip button{flex:none;border:0;border-radius:99px;padding:8px 15px;background:linear-gradient(135deg,#f2d98a,#c9983a);color:#1a1205;font:700 12.5px inherit;font-family:inherit;cursor:pointer}",
      ".sm-card{width:100%;max-width:430px;box-sizing:border-box;padding:15px 16px 14px;border-radius:22px;background:linear-gradient(180deg,#1d1810,#110e09);border:1px solid rgba(232,196,104,.45);box-shadow:0 16px 44px rgba(0,0,0,.55);color:#f4efe2}",
      ".sm-card .k{font:700 10px 'Space Mono',ui-monospace,monospace;letter-spacing:.16em;color:#E8C468}",
      ".sm-card .t{margin-top:8px;font-size:15.5px;line-height:1.4;font-weight:600;word-break:break-word}.sm-card .d{margin-top:4px;font-size:12.5px;color:#a89f88}",
      ".sm-card .b{display:flex;gap:8px;margin-top:13px}.sm-card .b button{flex:1;border:0;border-radius:13px;padding:12px 8px;font:700 13.5px inherit;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.09);color:#f4efe2}.sm-card .b button:active{transform:scale(.97)}",
      ".sm-card .b .p{background:linear-gradient(135deg,#f2d98a,#c9983a);color:#1a1205}.sm-card .b .r{background:rgba(255,95,85,.16);color:#ff9a90}",
      "body.light-theme .sm-card,body.light-theme .sm-chip{background:#fffaf0;color:#241c0e}body.light-theme .sm-card .b button{background:rgba(0,0,0,.07);color:#241c0e}"
    ].join("\n");
    D.head.appendChild(s);
  }
  function dock() { css(); var d = D.getElementById("sm-dock"); if (!d) { d = D.createElement("div"); d.id = "sm-dock"; D.body.appendChild(d) } return d }
  function chip(msg, label, fn, ms) {
    var d = dock(); [].forEach.call(d.querySelectorAll(".sm-chip"), function (c) { c.remove() });
    var c = D.createElement("div"); c.className = "sm-chip"; c.dir = isFa(msg) ? "rtl" : "ltr";
    c.innerHTML = "<span>" + esc(msg) + '</span><button type="button">' + esc(label) + "</button>";
    var t = setTimeout(function () { c.remove() }, ms || 7000);
    c.querySelector("button").onclick = function () { clearTimeout(t); c.remove(); try { fn() } catch (e) { } };
    d.appendChild(c);
  }
  function card(o) {
    var d = dock(), c = D.createElement("div"); c.className = "sm-card"; c.dir = isFa(o.t) ? "rtl" : "ltr";
    c.innerHTML = '<div class="k">' + esc(o.k) + '</div><div class="t">' + esc(o.t) + "</div>" + (o.d ? '<div class="d">' + esc(o.d) + "</div>" : "") + '<div class="b">' + o.b.map(function (b, i) { return '<button type="button" class="' + (b.c || "") + '" data-i="' + i + '">' + esc(b.l) + "</button>" }).join("") + "</div>";
    c.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; c.remove(); var x = o.b[+b.dataset.i]; try { x.f && x.f() } catch (er) { } });
    d.appendChild(c); return c;
  }
  function toast(m) { try { W.showToast(m) } catch (e) { } }

  /* ───────────── 1) act first, don't interrogate ───────────── */
  function ctx() {
    var n = new Date(), use = {}; try { use = JSON.parse(LS("phr_tm_use") || "{}") } catch (e) { }
    var top = Object.keys(use).sort(function (a, b) { return use[b] - use[a] }).slice(0, 3);
    var h = n.getHours(), part = h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
    return "It is " + n.toLocaleString("en-US", { weekday: "long", hour: "2-digit", minute: "2-digit" }) + " (" + part + ") for the user." + (top.length ? " Tools they use most lately: " + top.join(", ") + "." : "");
  }
  function style() {
    return "\n\nAGENT STYLE: Act first, do not interrogate. For any low-risk request, infer missing details (time, name, amount, duration, which item) from memory, habits, the current time and recent use, DO it, then add ONE short line saying what you assumed, e.g. \"I set it for 8:00, tell me if you want another time.\" Ask a question only when the action is irreversible, spends money, sends something to another person, or a critical detail is truly unknowable, and then ask exactly one short question. Never ask a list of questions. " + ctx() +
      "\nFOLLOW-UPS: when the user states a plan or intention they will act on later (\"I'll change the price tomorrow\", \"I need to email the client\") and it is not a timed alarm, call app_do with action follow_up and args {text: their plan in their own words and language, when: local time \"YYYY-MM-DD HH:MM\", usually the next evening or when it makes sense}. Do not mention the tool, just say you will check back.";
  }

  /* ───────────── 3) follow-ups ───────────── */
  var FK = "phr_followups";
  function load() { try { return JSON.parse(LS(FK) || "[]") } catch (e) { return [] } }
  function save(l) { LS(FK, JSON.stringify(l.slice(-60))) }
  function parseWhen(w) {
    var now = new Date(), s = String(w || "").trim(), m;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) { var d = new Date(s.replace(" ", "T")); if (!isNaN(d)) return d.getTime() }
    if (m = /^(\d+)\s*(min|minute|minutes|m)\b/i.exec(s)) return now.getTime() + m[1] * 60000;
    if (m = /^(\d+)\s*(h|hour|hours)\b/i.exec(s)) return now.getTime() + m[1] * 3600000;
    if (m = /^(\d+)\s*(d|day|days)\b/i.exec(s)) { var x = new Date(now.getTime() + m[1] * 864e5); x.setHours(18, 0, 0, 0); return x.getTime() }
    var t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(18, 0, 0, 0); return t.getTime();
  }
  var shownFU = {};
  function check() {
    var l = load(), now = Date.now(), due = l.filter(function (x) { return x.state === "open" && x.due <= now && !shownFU[x.id] })[0];
    if (!due) return; if (D.getElementById("sm-dock") && D.querySelector("#sm-dock .sm-card")) return;
    if (W.__auraActive) return;
    shownFU[due.id] = 1; var fa = isFa(due.text), ago = Math.max(1, Math.round((now - due.created) / 3600000));
    card({
      k: fa ? "پیگیری" : "FOLLOW-UP", t: due.text,
      d: fa ? "این را برنامه‌ریزی کرده بودی. انجام شد؟" : "You planned this " + (ago >= 24 ? Math.round(ago / 24) + " day" + (ago >= 48 ? "s" : "") : ago + " h") + " ago. Did you get to it?",
      b: [{ l: fa ? "انجام شد" : "Done", c: "p", f: function () { set(due.id, { state: "done" }); toast(fa ? "ثبت شد ✓" : "Nice. Marked done.") } },
      { l: fa ? "فردا" : "Tomorrow", f: function () { var t = new Date(); t.setDate(t.getDate() + 1); t.setHours(18, 0, 0, 0); set(due.id, { due: t.getTime() }); delete shownFU[due.id]; toast(fa ? "فردا دوباره می‌پرسم" : "I'll ask again tomorrow.") } },
      { l: fa ? "حذف" : "Drop", c: "r", f: function () { set(due.id, { state: "dropped" }) } }]
    });
  }
  function set(id, p) { var l = load(); l.forEach(function (x) { if (x.id === id) Object.assign(x, p) }); save(l) }
  function addFU(a) {
    var text = String(a && (a.text || a.query) || "").trim().slice(0, 200); if (text.length < 3) return "Error: tell me what to follow up on.";
    var due = parseWhen(a.when); if (due < Date.now() + 60000) due = Date.now() + 3600000;
    var l = load(); l.push({ id: Date.now() + "" + Math.floor(Math.random() * 99), text: text, due: due, created: Date.now(), state: "open" }); save(l);
    return "Follow-up saved for " + new Date(due).toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" }) + ": " + text + ". The user will be asked about it then.";
  }
  function listFU() { var l = load().filter(function (x) { return x.state === "open" }); return l.length ? l.map(function (x) { return "- " + new Date(x.due).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + ": " + x.text }).join("\n") : "No open follow-ups." }
  function doneFU(a) { var q = String(a && (a.query || a.text) || "").toLowerCase(), n = 0, l = load(); l.forEach(function (x) { if (x.state === "open" && (!q || x.text.toLowerCase().indexOf(q) >= 0)) { x.state = "done"; n++ } }); save(l); return n ? "Marked " + n + " follow-up(s) done." : "No matching follow-up." }

  /* ───────────── 2) preview / confirm / undo ───────────── */
  function curChat() { var id = G("curId"), C = G("chats") || []; for (var i = 0; i < C.length; i++) if (C[i].id == id) return C[i]; return null }
  function snap(key, a) {
    var A = W.PHR_AGENT.actions, c = curChat();
    switch (key) {
      case "theme": var lt = D.body.classList.contains("light-theme"); return { m: "Theme changed", u: function () { A.theme({ mode: lt ? "light" : "dark" }) } };
      case "accent": var ac = LS("phraortes_accent") || "auto"; return { m: "Accent changed", u: function () { G("setAccent")(ac) } };
      case "core": var cm = G("activeModel"); return { m: "Core switched", u: function () { A.core({ name: String(cm) }) } };
      case "rename_chat": if (!c) return null; var nm = c.name; return { m: "Chat renamed", u: function () { c.name = nm; G("save")(); G("renderH")() } };
      case "pin_chat": var pc = a && a.query ? null : c; if (!pc) return null; return { m: pc.pinned ? "Chat unpinned" : "Chat pinned", u: function () { G("togglePinSession")(pc.id) } };
      case "new_chat": case "switch_chat": var pid = G("curId"); if (pid == null) return null; return { m: key === "new_chat" ? "New chat started" : "Switched chat", u: function () { (0, eval)("curId=" + JSON.stringify(pid)); G("loadChat")(pid) } };
    }
    return null;
  }
  function target(a) {
    var C = G("chats") || [], q = String(a && a.query || "").toLowerCase().trim();
    if (!q) { var c = curChat(); return c ? c.name : "this chat" }
    var f = C.filter(function (x) { return String(x.name || "").toLowerCase().indexOf(q) >= 0 })[0]; return f ? f.name : q;
  }
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__smart || !A.actions) return false; A.__smart = true;
    var oDo = A.do, oPrompt = A.prompt;
    A.prompt = function (t) { return oPrompt(t) + style() };
    A.extend({ follow_up: addFU, list_follow_ups: listFU, done_follow_up: doneFU });
    var oh = A.actions.help; A.actions.help = function () { return oh() + " Follow-ups: follow_up{text,when}, list_follow_ups, done_follow_up{query}." };
    A.do = function (action, args) {
      var key = String(action || "").trim().toLowerCase().replace(/[\s-]+/g, "_"), a = args;
      if (typeof a === "string") { try { a = JSON.parse(a) } catch (e) { a = { query: a } } } a = a || {};
      if (key === "delete_chat") {
        var nm = target(a), fa = isFa(nm);
        return new Promise(function (res) {
          card({
            k: fa ? "تأیید لازم است" : "CONFIRM", t: (fa ? "این چت حذف شود؟ " : "Delete this chat? ") + "«" + nm + "»", d: fa ? "قابل بازگشت نیست." : "This can't be undone.",
            b: [{ l: fa ? "انصراف" : "Cancel", f: function () { res("The user cancelled, nothing was deleted.") } },
            {
              l: fa ? "حذف" : "Delete", c: "r", f: function () {
                var oc = W.confirm; W.confirm = function () { return true }; var r; try { r = oDo(action, args) } finally { W.confirm = oc } res(r)
              }
            }]
          });
        });
      }
      var s = null; try { s = snap(key, a) } catch (e) { }
      var r = oDo(action, args);
      if (s && !/^(Failed|Unknown|Need|No |Theme control)/.test(String(r))) chip(s.m, W.PHR_AGENT && isFa(r) ? "برگردان" : "Undo", s.u);
      return r;
    };
    return true;
  }
  function hands(n) {
    var H = W.PHR_HANDS; if (!H || !H.tool) { if (n < 120) setTimeout(function () { hands(n + 1) }, 200); return }
    if (H.__sm) return; H.__sm = true; var oT = H.tool;
    H.tool = function (name, args) {
      var r = oT.apply(H, arguments);
      if (name === "set_reminder" || name === "set_timer") {
        Promise.resolve(r).then(function (x) {
          if (!/^(Error|Unknown)/.test(String(x || ""))) { var lab = String(args && (args.text || args.label) || ""); chip((name === "set_timer" ? "Timer set" : (args && args.kind === "alarm" ? "Alarm set" : "Reminder set")) + (lab ? " · " + lab.slice(0, 28) : ""), isFa(lab) ? "برگردان" : "Undo", function () { try { oT.call(H, "phone_action", { type: "cancel", query: lab || "timer" }); toast("Cancelled") } catch (e) { } }) }
        });
      }
      return r;
    };
  }
  W.PHR_SMART = { followups: load, add: addFU, check: check, chip: chip, card: card };
  hands(0);
  (function wait(n) { if (!install() && n < 120) setTimeout(function () { wait(n + 1) }, 150); else if (n >= 120) return; else { setTimeout(check, 4000); setInterval(check, 60000); D.addEventListener("visibilitychange", function () { if (!D.hidden) setTimeout(check, 1500) }) } })(0);
})();
