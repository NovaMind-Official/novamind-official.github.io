/* Phraortes — Keys (keys.js)
   A Key is a word or phrase of your choosing that stands for ANY instruction. Say or type the key and the agent does
   what it was bound to: open things, run a routine, set a timer, write, plan, build, answer — anything the agent can do.
   "friday"                      → runs the steps you gave it
   "friday for Ali"              → the extra words are handed to the instruction  ({*} marks where they go)
   Create:  "create key friday: weather; my tasks; summarize my week"   (steps separated by ;)
   Manage:  "list keys", "delete key friday"   — or Account → Agent → Keys. */
(function () {
  "use strict";
  var W = window, D = document, KEY = "phr_keys_v1";
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  function $(s, r) { return (r || D).querySelector(s) }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  function norm(t) { return String(t || "").toLowerCase().replace(/[“”"'`‘’«»]/g, "").replace(/[.!؟?,،;:]+/g, " ").replace(/\s+/g, " ").trim() }
  function all() { try { var a = JSON.parse(LS(KEY) || "[]"); return Array.isArray(a) ? a : [] } catch (e) { return [] } }
  function save(a) { LS(KEY, JSON.stringify(a.slice(0, 60))) }
  function toast(t) { try { W.showToast && W.showToast(t, "info") } catch (e) { } }
  function steps(s) { return String(s || "").split(/\s*(?:;|\n|&&)\s*/).map(function (x) { return x.trim() }).filter(Boolean).slice(0, 10) }

  /* ───────── store ───────── */
  function add(name, doText, hide) {
    var k = norm(name), d = String(doText || "").trim();
    if (k.length < 3) return { ok: 0, why: "short" };
    if (k.length > 40) return { ok: 0, why: "long" };
    if (!d) return { ok: 0, why: "empty" };
    var a = all().filter(function (x) { return x.k !== k });
    a.unshift({ k: k, d: d.slice(0, 1200), h: hide ? 1 : 0, at: Date.now(), n: 0 });
    save(a); return { ok: 1, k: k, steps: steps(d).length };
  }
  function del(name) { var k = norm(name), a = all(), b = a.filter(function (x) { return x.k !== k }); save(b); return a.length !== b.length }
  function find(text) {
    var t = norm(text).replace(/^(?:key|code|codeword|کلید|رمز)\s+/, ""), best = null;
    if (!t) return null;
    all().forEach(function (x) {
      if (t === x.k || t.indexOf(x.k + " ") === 0) { if (!best || x.k.length > best.k.length) best = x }
    });
    if (!best) return null;
    var extra = t.length > best.k.length ? t.slice(best.k.length).trim() : "";
    return { key: best, extra: extra };
  }

  /* ───────── run ───────── */
  function run(hit, via) {
    var x = hit.key, extra = hit.extra, d = x.d;
    d = /\{\*\}|\{extra\}/i.test(d) ? d.replace(/\{\*\}|\{extra\}/ig, extra) : (extra ? d + " " + extra : d);
    var st = steps(d), A = W.PHR_AGENT;
    var a = all(); a.forEach(function (y) { if (y.k === x.k) { y.n = (y.n || 0) + 1; y.last = Date.now() } }); save(a);
    try { W.PHR_CON && W.PHR_CON.ev && W.PHR_CON.ev("exe", "key · " + x.k) } catch (e) { }
    var ai = [], i = 0, local = 0;
    (function next() {
      if (i >= st.length) {
        if (ai.length) { var msg = ai.length === 1 ? ai[0] : "Do these in order:\n" + ai.map(function (s, n) { return (n + 1) + ". " + s }).join("\n"); try { if (!W.PHR_sendText(msg)) toast("The agent is busy. Try the key again in a moment.") } catch (e) { toast("Couldn't send") } }
        return;
      }
      var s = st[i++], r = false;
      try { r = A && A.__keyBase ? A.__keyBase(s) : false } catch (e) { r = false }
      if (r) { local++; setTimeout(next, 650) } else { ai.push(s); next() }
    })();
    return st.length;
  }

  /* ───────── conversational create / list / delete ───────── */
  var RX_NEW = [
    /^(?:please )?(?:create|make|add|new|set(?: up)?|save)(?: a| new| me a)?(?: new)? (?:key|keyword|codeword|code word|passphrase|code)(?: called| named| word)? (.+?)\s*(?::|=|->|→|\bthat\b|\bto\b|\bmeans\b|\bwhich\b|\bdoes\b|\bruns\b)\s*(.+)$/i,
    /^(?:please )?(?:make|set|turn) (.{2,40}?) (?:into |as )?(?:a |my )?(?:key|keyword|codeword|code word|passphrase)(?: that| which| to| for)?\s*[:,]?\s*(.+)$/i,
    /^(?:کلید|رمز)\s+(.{2,40}?)\s+(?:رو|را)?\s*(?:بساز|تعریف کن|بذار)\s*[:،]?\s*(.+)$/
  ];
  function handleAdmin(raw) {
    var t = String(raw || "").trim().replace(/\s+/g, " "), m, fa = /[؀-ۿ]/.test(t);
    for (var i = 0; i < RX_NEW.length; i++) if ((m = RX_NEW[i].exec(t))) {
      var r = add(m[1].replace(/^["“'`]|["”'`]$/g, ""), m[2]);
      if (r.ok) return fa ? "کلید «" + r.k + "» ساخته شد. هر وقت گفتی‌اش اجرا می‌شه." : "Key “" + r.k + "” saved. Say it any time and I'll do it.";
      return r.why === "short" ? (fa ? "کلید باید حداقل سه حرف باشه." : "A key needs at least 3 characters.") : r.why === "empty" ? (fa ? "بگو کلید چه کاری انجام بده." : "Tell me what the key should do.") : (fa ? "کلید خیلی طولانیه." : "That key is too long.");
    }
    if ((m = /^(?:delete|remove|forget|clear) (?:the )?(?:key|keyword|codeword|code) (.+)$/i.exec(t) || /^کلید (.+?)\s*(?:رو|را)?\s*(?:حذف کن|پاک کن)$/.exec(t)))
      return del(m[1]) ? (fa ? "کلید حذف شد." : "Key deleted.") : (fa ? "همچین کلیدی نداری." : "No such key.");
    if (/^(?:list|show|what are)(?: me)?(?: all)?(?: my)? (?:keys|keywords|codewords|codes)\??$/i.test(t) || /^کلید(?:‌|\s)?هام(?: رو)?(?: نشون بده)?$/.test(t)) {
      var a = all(); if (!a.length) return fa ? "هنوز کلیدی نساختی." : "No keys yet. Say: create key friday: weather; my tasks.";
      try { W.PHR_AX && W.PHR_AX.open("keys") } catch (e) { }
      return fa ? a.length + " کلید داری." : "You have " + a.length + " key" + (a.length === 1 ? "" : "s") + ".";
    }
    return false;
  }

  /* ───────── hub tiles + pane ───────── */
  function hubRow() {
    var sec = $("#ax-sec"); if (!sec) return false;
    if (!$("#ax-more")) {
      var d = D.createElement("div"); d.id = "ax-more"; d.className = "ax-3"; d.style.marginTop = "10px";
      d.innerHTML = '<button type="button" class="ax-t" style="--c:#ffb25f" onclick="PHR_AX.open(\'keys\')"><i></i><em id="ax-n-key">0</em><small>Keys</small></button>' +
        '<button type="button" class="ax-t" style="--c:#6fe3a0" onclick="PHR_AX.open(\'shadow\')"><i></i><em id="ax-n-sh">On</em><small>Shadow</small></button>' +
        '<button type="button" class="ax-t" style="--c:#ff7a7a" onclick="window.PHR_PM&&PHR_PM.ask()"><i></i><em>⚑</em><small>Pre-mortem</small></button>';
      sec.appendChild(d);
    }
    stat(); return true;
  }
  function stat() {
    var k = $("#ax-n-key"); if (k) k.textContent = all().length;
    var s = $("#ax-n-sh"); if (s) { var on = W.PHR_SHADOW ? W.PHR_SHADOW.enabled() : false; s.textContent = on ? "On" : "Off" }
  }
  function view() {
    var a = all();
    var list = a.length ? a.map(function (x, i) {
      return '<div class="ax-row"><div class="tx"><b style="font-family:ui-monospace,Menlo,monospace;color:#ffb25f">' + esc(x.k) + "</b><small>" + (x.h ? "Steps hidden · " : esc(x.d.length > 120 ? x.d.slice(0, 118) + "…" : x.d) + " · ") + (x.n ? "used " + x.n + "×" : "unused") + '</small></div><div style="display:flex;flex-direction:column;gap:6px"><button class="ax-b g" onclick="PHR_KEYS.runIdx(' + i + ')">Run</button><button class="ax-b r" onclick="PHR_KEYS.delIdx(' + i + ')">Delete</button></div></div>';
    }).join("") : '<div class="ax-em">No keys yet.<br>A key is a word you choose. Say it and the agent does <b>anything</b> you attached to it.</div>';
    var ex = ["lockdown → dark mode; close everything; timer 25 minutes", "report → summarize my week and list what is overdue", "pitch → write a short sales pitch for {*}"].map(function (s, i) { return '<button class="ax-b" style="text-align:left;line-height:1.4;font-weight:500" onclick="PHR_KEYS.fill(' + i + ')">' + esc(s) + "</button>" }).join("");
    return '<div class="ax-c" style="margin-top:6px">' + list + '</div><div class="ax-c"><h4>New key</h4><div class="ax-f"><input id="kx-n" placeholder="The word or phrase, e.g. friday" autocapitalize="off" autocomplete="off"><input id="kx-d" placeholder="What it does. Separate steps with ;" autocapitalize="off" autocomplete="off">' +
      '<div class="ax-row" style="border:0;padding:4px 0 0"><div class="tx">Hide steps in this list<small>For private codewords</small></div><label class="ax-sw"><input type="checkbox" id="kx-h"><span></span></label></div>' +
      '<button class="ax-b g" style="padding:13px" onclick="PHR_KEYS.addUI()">Save key</button></div></div>' +
      '<div class="ax-c"><h4>Ideas</h4><div style="display:flex;flex-direction:column;gap:8px">' + ex + '</div><div class="ax-em" style="padding:14px 4px 2px;font-size:13px">Anything after the key is passed along: <b>pitch Nova Cafe</b> fills <b>{*}</b>.<br>You can also say: <b>create key friday: weather; my tasks</b></div></div>';
  }
  var EXS = [["lockdown", "dark mode; close everything; timer 25 minutes"], ["report", "summarize my week and list what is overdue"], ["pitch", "write a short sales pitch for {*}"]];

  W.PHR_KEYS = {
    all: all, add: add, del: del, find: find, run: function (t) { var h = find(t); return h ? run(h) : 0 },
    runIdx: function (i) { var x = all()[i]; if (!x) return; try { W.closeAccountPage && W.closeAccountPage() } catch (e) { } setTimeout(function () { run({ key: x, extra: "" }) }, 450) },
    delIdx: function (i) { var x = all()[i]; if (!x) return; del(x.k); W.PHR_AX && W.PHR_AX.rerender(); stat() },
    fill: function (i) { var n = $("#kx-n"), d = $("#kx-d"); if (n) n.value = EXS[i][0]; if (d) d.value = EXS[i][1] },
    addUI: function () {
      var n = $("#kx-n"), d = $("#kx-d"), h = $("#kx-h"), r = add(n && n.value, d && d.value, h && h.checked);
      if (!r.ok) { toast(r.why === "short" ? "A key needs at least 3 characters" : r.why === "empty" ? "Say what the key should do" : "That key is too long"); return }
      toast("Key “" + r.k + "” saved"); W.PHR_AX && W.PHR_AX.rerender(); stat();
      try { W.haptic && W.haptic("medium") } catch (e) { }
    },
    stat: stat
  };

  /* ───────── agent hook (outermost: keys win over everything) ───────── */
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__keys) return false; A.__keys = true;
    var oT = A.typed, oV = A.voice;
    A.__keyBase = function (s) { return oT(s) };
    function handle(raw) {
      var t = String(raw || ""); if (!t || t.length > 600) return false;
      var adm = handleAdmin(t); if (adm) return adm;
      var h = find(t); if (!h) return false;
      var fa = /[؀-ۿ]/.test(t), n = run(h);
      return fa ? "کلید «" + h.key.k + "» اجرا شد." : "Key “" + h.key.k + "” · " + n + " step" + (n === 1 ? "" : "s");
    }
    A.typed = function (t) { var r; try { r = handle(t) } catch (e) { r = false } return r || oT(t) };
    A.voice = function (t, quiet) {
      var r; try { r = handle(t) } catch (e) { r = false }
      if (r) { if (quiet) return r; try { (W.auraSetCaption || function () { })(r, "hint"); (W.auraSpeak || function () { })(r) } catch (e) { } return true }
      return oV(t, quiet);
    };
    return true;
  }
  (function wait(n) { if (!install() && n < 120) setTimeout(function () { wait(n + 1) }, 150) })(0);

  /* register the pane view + hub row */
  (function reg(n) {
    if (W.PHR_AX && W.PHR_AX.views) { W.PHR_AX.views.keys = { title: "Keys", render: view } }
    else if (n < 120) return setTimeout(function () { reg(n + 1) }, 200);
    (function hub(m) { if (!hubRow() && m < 150) setTimeout(function () { hub(m + 1) }, 250) })(0);
    var oo = W.openAccountPage; if (typeof oo === "function" && !W.__kxp) { W.__kxp = 1; W.openAccountPage = function () { var r = oo.apply(this, arguments); setTimeout(function () { hubRow(); stat() }, 520); return r } }
  })(0);
})();
