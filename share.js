/* Phraortes — Minds & Rooms (share.js)
   MINDS  A Mind is an assistant with a personality and a job. Build one, polish it with AI, and share it as a single link —
          the link carries the whole Mind (no server, nothing uploaded). Whoever opens it can chat with it or add it.
   ROOMS  A shared room where people and the AI talk together. Everything is end-to-end encrypted in the browser (the key lives in
          the link’s # part, which is never sent anywhere). Messages travel through a small public relay and are kept 12 hours there;
          each device keeps its own history. Ask the AI with “@ai …” or the ✦ button — it answers for everyone. */
(function () {
  "use strict";
  var W = window, D = document;
  function $(s, r) { return (r || D).querySelector(s) }
  function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)) }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  function LS(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch (e) { } return null }
  function J(k, d) { try { var v = JSON.parse(LS(k)); return v == null ? d : v } catch (e) { return d } }
  function hap(t) { try { W.haptic && W.haptic(t || "light") } catch (e) { } }
  function toast(m, t) { try { W.showToast(m, t || "success") } catch (e) { } }
  function rid(n) { var a = new Uint8Array(n), s = ""; (W.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256 }); var al = "abcdefghijkmnpqrstuvwxyz23456789"; for (var i = 0; i < n; i++) s += al[a[i] % al.length]; return s }
  function b64u(bytes) { var s = ""; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }
  function unb64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a }
  var TE = new TextEncoder(), TD = new TextDecoder();
  function clip(s, n) { return String(s == null ? "" : s).slice(0, n) }
  function myName() {
    var n = LS("phr_me_name"); if (n) return n;
    var el = $("#ac-user-name-big"), t = el ? el.textContent.trim() : ""; if (t && !/not signed in|guest/i.test(t)) return t.split(" ")[0];
    return "";
  }
  function uid() { var u = LS("phr_me_id"); if (!u) { u = rid(8); LS("phr_me_id", u) } return u }
  var COLORS = ["#D4A24C", "#e07a5f", "#81b29a", "#6c8ebf", "#b48ead", "#e5989b", "#4cc9f0", "#9bbf6c"];
  function colorFor(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length] }

  /* ───────── compress / decompress for links ───────── */
  async function pack(obj) {
    var raw = TE.encode(JSON.stringify(obj));
    if (typeof CompressionStream !== "undefined") {
      try { var cs = new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw")); var buf = new Uint8Array(await new Response(cs).arrayBuffer()); return "1" + b64u(buf) } catch (e) { }
    }
    return "0" + b64u(raw);
  }
  async function unpack(s) {
    var mode = s.charAt(0), bytes = unb64u(s.slice(1));
    if (mode === "1") { var ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")); bytes = new Uint8Array(await new Response(ds).arrayBuffer()) }
    return JSON.parse(TD.decode(bytes));
  }

  /* ───────── icons & css ───────── */
  function I(d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>" }
  var IC = {
    back: I('<path d="M15 5l-7 7 7 7"/>'), x: I('<path d="M6 6l12 12M18 6L6 18"/>'), plus: I('<path d="M12 5v14M5 12h14"/>'),
    share: I('<path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>'), send: I('<path d="M5 12l14-7-5 14-2.5-5.5z"/>'),
    spark: I('<path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z"/>'), edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), trash: I('<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>'),
    link: I('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
    lock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', 14), list: I('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'), chat: I('<path d="M4 5h16v11H9l-5 4z"/>')
  };
  var CSS = [
    ".sh{position:fixed;inset:0;z-index:9300;display:none;flex-direction:column;background:var(--bg,#0b0b0e);color:var(--txt,#f4efe4);font-family:-apple-system,system-ui,'Vazirmatn',sans-serif;--s:rgba(255,255,255,.07);--s2:rgba(255,255,255,.12);--ln:rgba(255,255,255,.1);--mut:rgba(255,255,255,.55)}",
    "body.light-theme .sh{--s:rgba(43,35,19,.06);--s2:rgba(43,35,19,.1);--ln:rgba(43,35,19,.1);--mut:rgba(43,35,19,.55)}",
    ".sh.on{display:flex;animation:shin .28s cubic-bezier(.2,1,.3,1)}@keyframes shin{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}",
    ".sh-top{display:flex;align-items:center;gap:4px;padding:calc(8px + env(safe-area-inset-top)) 8px 8px;border-bottom:.5px solid var(--ln);background:var(--bg,#0b0b0e)}",
    ".sh-t{flex:1;min-width:0;padding:0 6px}.sh-t b{display:block;font-size:17px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sh-t small{display:block;font-size:12px;color:var(--mut);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".sh-i{flex:none;min-width:42px;height:42px;border:0;border-radius:12px;background:none;color:inherit;display:grid;place-items:center;cursor:pointer;padding:0 8px;font:600 14px -apple-system,system-ui,sans-serif}.sh-i:active{background:var(--s2)}.sh-i.p{background:var(--p,#D4A24C);color:#1a1204}",
    ".sh-b{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 16px calc(28px + env(safe-area-inset-bottom))}",
    ".sh-tabs{display:flex;gap:4px;padding:4px;margin:0 0 16px;border-radius:13px;background:var(--s)}.sh-tabs button{flex:1;border:0;border-radius:10px;background:none;color:var(--mut);padding:9px;font:600 14px -apple-system,system-ui,sans-serif;cursor:pointer}.sh-tabs button.on{background:var(--s2);color:inherit}",
    ".sh-h{margin:20px 4px 8px;font-size:12.5px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--mut)}",
    ".mn-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    ".mn-c{position:relative;border:0;border-radius:18px;padding:14px;text-align:left;color:inherit;cursor:pointer;min-height:138px;display:flex;flex-direction:column;gap:6px;font-family:inherit;overflow:hidden;background:var(--s)}",
    ".mn-c::before{content:'';position:absolute;inset:0;background:linear-gradient(160deg,var(--c) 0%,transparent 70%);opacity:.22;pointer-events:none}",
    ".mn-c:active{transform:scale(.98)}.mn-e{font-size:30px;line-height:1;position:relative}.mn-n{font-size:15px;font-weight:650;position:relative;line-height:1.2}.mn-t{font-size:12.5px;color:var(--mut);line-height:1.35;position:relative;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
    ".mn-c.new{align-items:center;justify-content:center;border:1.5px dashed var(--s2);background:none;color:var(--mut)}.mn-c.new::before{display:none}",
    ".mn-d{text-align:center;padding:10px 0 4px}.mn-d .big{width:92px;height:92px;border-radius:28px;margin:6px auto 12px;display:grid;place-items:center;font-size:46px;background:linear-gradient(150deg,var(--c),transparent 130%),var(--s)}.mn-d h2{margin:0;font-size:24px;letter-spacing:-.01em}.mn-d p{margin:6px 0 0;color:var(--mut);font-size:14.5px}",
    ".mn-st{display:flex;flex-direction:column;gap:8px;margin:18px 0}.mn-st button{border:0;text-align:left;padding:13px 14px;border-radius:14px;background:var(--s);color:inherit;font:500 14.5px/1.4 -apple-system,system-ui,'Vazirmatn',sans-serif;cursor:pointer}.mn-st button:active{background:var(--s2)}",
    ".sh-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:14px;padding:14px;background:var(--s);color:inherit;font:650 15px -apple-system,system-ui,sans-serif;cursor:pointer;margin-top:8px}.sh-btn.p{background:var(--p,#D4A24C);color:#1a1204}.sh-btn:active{opacity:.8}.sh-btn.red{color:#ff6b6b}",
    ".sh-btn.row{display:flex}.sh-rowb{display:flex;gap:8px}.sh-rowb .sh-btn{margin-top:8px}",
    ".sh-pre{margin:10px 0 0;padding:12px 14px;border-radius:14px;background:var(--s);font-size:13px;line-height:1.55;color:var(--mut);white-space:pre-wrap;max-height:34vh;overflow:auto;text-align:left}",
    ".sh-f label{display:block;margin:16px 4px 6px;font-size:12.5px;font-weight:600;color:var(--mut)}.sh-f input,.sh-f textarea{width:100%;box-sizing:border-box;border:0;border-radius:13px;background:var(--s);color:inherit;padding:13px 14px;font:16px/1.45 -apple-system,system-ui,'Vazirmatn',sans-serif;outline:none;resize:vertical}",
    ".sh-em{display:flex;gap:6px;flex-wrap:wrap}.sh-em button{width:42px;height:42px;border:0;border-radius:12px;background:var(--s);font-size:22px;cursor:pointer}.sh-em button.on{outline:2px solid var(--p,#D4A24C)}",
    ".sh-co{display:flex;gap:10px;flex-wrap:wrap}.sh-co button{width:32px;height:32px;border-radius:50%;border:0;cursor:pointer}.sh-co button.on{outline:2px solid var(--txt,#fff);outline-offset:2px}",
    ".sh-note{margin:14px 4px 0;font-size:12.5px;line-height:1.5;color:var(--mut)}",
    /* rooms */
    ".rm-i{display:flex;align-items:center;gap:13px;width:100%;border:0;background:var(--s);border-radius:16px;padding:12px 14px;margin-bottom:8px;color:inherit;text-align:left;cursor:pointer;font-family:inherit}.rm-i:active{background:var(--s2)}",
    ".rm-av{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font:700 18px -apple-system,system-ui,sans-serif;color:#1a1204}",
    ".rm-i div{flex:1;min-width:0}.rm-i b{display:block;font-size:15.5px;font-weight:620}.rm-i small{display:block;font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}.rm-u{flex:none;min-width:22px;height:22px;border-radius:11px;background:var(--p,#D4A24C);color:#1a1204;font:700 12px/22px -apple-system,sans-serif;text-align:center;padding:0 6px}",
    ".rm-feed{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 12px 8px;display:flex;flex-direction:column;gap:6px}",
    ".rm-m{max-width:84%;align-self:flex-start;display:flex;flex-direction:column;gap:2px}.rm-m.me{align-self:flex-end;align-items:flex-end}",
    ".rm-w{font-size:11.5px;font-weight:650;margin:0 8px}.rm-bb{padding:9px 13px;border-radius:18px;background:var(--s2);font-size:15px;line-height:1.45;white-space:pre-wrap;word-break:break-word}.rm-m.me .rm-bb{background:var(--p,#D4A24C);color:#1a1204;border-bottom-right-radius:6px}.rm-m:not(.me) .rm-bb{border-bottom-left-radius:6px}",
    ".rm-m.ai{max-width:94%;align-self:stretch}.rm-m.ai .rm-bb{background:linear-gradient(160deg,rgba(212,162,76,.18),rgba(212,162,76,.06));border:1px solid rgba(212,162,76,.35);border-radius:16px}.rm-m.ai .rm-w{color:var(--p,#D4A24C)}",
    ".rm-sys{align-self:center;font-size:12px;color:var(--mut);padding:4px 10px;border-radius:99px;background:var(--s);margin:4px 0}",
    ".rm-tp{align-self:flex-start;font-size:12.5px;color:var(--p,#D4A24C);padding:4px 12px}",
    ".rm-bar{display:flex;gap:6px;overflow-x:auto;padding:6px 12px 0;scrollbar-width:none}.rm-bar::-webkit-scrollbar{display:none}.rm-bar button{flex:none;border:0;border-radius:99px;background:var(--s);color:inherit;padding:8px 13px;font:600 13px -apple-system,system-ui,sans-serif;cursor:pointer}.rm-bar button:active{background:var(--s2)}",
    ".rm-in{display:flex;align-items:flex-end;gap:8px;padding:8px 10px calc(10px + env(safe-area-inset-bottom))}.rm-in textarea{flex:1;min-width:0;max-height:120px;border:0;border-radius:20px;background:var(--s);color:inherit;padding:11px 15px;font:16px/1.4 -apple-system,system-ui,'Vazirmatn',sans-serif;outline:none;resize:none}",
    ".rm-in button{flex:none;width:42px;height:42px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;background:var(--s2);color:inherit}.rm-in .go{background:var(--p,#D4A24C);color:#1a1204}",
    ".rm-lock{display:flex;align-items:center;gap:6px;justify-content:center;font-size:11.5px;color:var(--mut);padding:2px 0 8px}",
    /* invite */
    "#sh-inv{position:fixed;inset:0;z-index:9600;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}#sh-inv.on{display:flex}",
    "#sh-inv .card{width:100%;max-width:520px;max-height:88dvh;overflow:auto;border-radius:26px 26px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));background:var(--bg,#101014);color:var(--txt,#f4efe4);text-align:center;font-family:-apple-system,system-ui,sans-serif;--s:rgba(255,255,255,.07);--s2:rgba(255,255,255,.12);--mut:rgba(255,255,255,.55);animation:shin .3s cubic-bezier(.2,1,.3,1)}",
    "body.light-theme #sh-inv .card{--s:rgba(43,35,19,.06);--s2:rgba(43,35,19,.1);--mut:rgba(43,35,19,.55)}",
    "#sh-inv .by{font-size:13px;color:var(--mut)}"
  ].join("\n");
  function css() { if ($("#sh-css")) return; var s = D.createElement("style"); s.id = "sh-css"; s.textContent = CSS; D.head.appendChild(s) }
  function sheet(id) {
    css(); var e = $("#" + id); if (e) return e;
    e = D.createElement("div"); e.id = id; e.className = "sh"; D.body.appendChild(e); return e;
  }
  function openSheet(e) { e.classList.add("on"); D.body.style.overflow = "hidden" }
  function closeSheet(e) { if (!e) return; e.classList.remove("on"); if (!$$(".sh.on").length) D.body.style.overflow = "" }
  function closeAcct() { try { var pg = $("#account-page"); if (pg && pg.classList.contains("show")) { if (typeof W.closeAccountPage === "function") W.closeAccountPage(); } } catch (e) { } }
  function share(url, title, text) {
    if (navigator.share) { navigator.share({ url: url, title: title, text: text }).catch(function () { }); return }
    copy(url, "Link copied");
  }
  function copy(t, msg) {
    var done = function () { toast(msg || "Copied") };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () { fb() }); else fb();
    function fb() { var ta = D.createElement("textarea"); ta.value = t; ta.style.cssText = "position:fixed;opacity:0"; D.body.appendChild(ta); ta.select(); try { D.execCommand("copy"); done() } catch (e) { } ta.remove() }
  }
  function baseUrl() { return location.origin + location.pathname }

  /* ═════════════════════════ MINDS ═════════════════════════ */
  var STARTERS = [
    { k: "konkur", e: "🎓", c: "#6c8ebf", n: "Konkur Coach", t: "Plans your study, explains hard topics, quizzes you.", i: "You are a Konkur (Iranian university entrance exam) coach. Explain concepts simply, then check understanding with a short question. Build realistic weekly study plans around the student’s weak topics and available hours. Solve problems step by step and point out the common trap in each. Be encouraging but honest about gaps. Answer in the student’s language (Persian if they write Persian).", s: ["Make me a 4-week plan for physics and math", "Explain electric potential with a simple picture", "Quiz me on organic chemistry"] },
    { k: "lease", e: "🏠", c: "#81b29a", n: "Rent & Contracts", t: "Explains rental and everyday contracts in plain words.", i: "You help people understand rental agreements and everyday contracts in Iran in plain language. Explain what each clause means, what to watch out for, and what questions to ask before signing. You are not a lawyer: always say when something needs a licensed lawyer or notary, and never invent legal articles or numbers — say when you are not sure. Answer in the user’s language.", s: ["What should I check before signing a lease?", "Explain this clause in simple words", "Draft questions to ask my landlord"] },
    { k: "poet", e: "🪶", c: "#b48ead", n: "Persian Poet", t: "Hafez, Saadi, Rumi — meaning, mood and your own verse.", i: "You are a warm, literate guide to Persian poetry. Explain verses (Hafez, Saadi, Rumi, Khayyam, Forough and others) with meaning, context and mood. When asked, write original verse in a classical or modern Persian style on the user’s theme. Never claim an invented verse is by a real poet. Keep answers short and graceful.", s: ["Give me a Hafez verse for a hard day, with meaning", "Write a short ghazal about autumn", "Explain a Rumi verse about patience"] },
    { k: "review", e: "🧪", c: "#4cc9f0", n: "Code Reviewer", t: "Finds real bugs, security holes and simpler designs.", i: "You are a senior engineer doing code review. Read the code carefully. List real defects first (bugs, security, race conditions, edge cases), then maintainability. For each issue: where, why it matters, and a concrete fix. Do not praise filler or invent problems. If the code is fine, say so briefly. Keep the answer compact.", s: ["Review this code for bugs and security", "How would you simplify this function?", "What edge cases am I missing?"] },
    { k: "interview", e: "🎤", c: "#e07a5f", n: "Interview Coach", t: "Runs a mock interview and scores your answers.", i: "You are a tough but fair interview coach. Run a realistic mock interview for the role the user names: ask one question at a time, wait for the answer, then give a short score out of 10, what was strong, what was weak, and a better version of the answer. Adapt difficulty. Offer a final summary with the top three things to improve.", s: ["Interview me for a junior frontend developer role", "Practice 'tell me about yourself'", "Ask me hard behavioral questions"] },
    { k: "fit", e: "💪", c: "#9bbf6c", n: "Training Coach", t: "Simple workouts and habits that fit your real week.", i: "You are a practical fitness and habit coach. Ask about goal, level, equipment, injuries and available days before planning. Give simple progressive plans, exercise form cues and recovery tips. Avoid extreme diets or medical claims; suggest a doctor for pain or health conditions. Keep the tone motivating and brief.", s: ["Build me a 3-day home workout plan", "I only have 20 minutes a day", "How do I stay consistent?"] },
    { k: "write", e: "✍️", c: "#D4A24C", n: "Sharp Editor", t: "Tightens writing without losing your voice.", i: "You are a sharp, respectful editor. When given text: keep the author’s voice, cut filler, fix clarity and flow, and show the improved version first, then a short list of the main changes and why. Ask what the audience and goal are if unclear. Work in the text’s own language.", s: ["Edit this email to be clearer and shorter", "Make this paragraph more persuasive", "Rewrite my bio in three tones"] },
    { k: "trade", e: "📈", c: "#e5989b", n: "Trading Journal", t: "Turns your trades into lessons, not tips.", i: "You are a trading journal coach. You do not give buy/sell signals or predictions. When the user shares trades, help them extract patterns: entry reason, risk size, emotions, rule breaks, and what to change. Compute simple stats (win rate, average win/loss, expectancy) when numbers are given and show the arithmetic. Remind them that you are not a financial advisor when advice is requested.", s: ["Here are my last 10 trades, find my patterns", "Help me write a pre-trade checklist", "Calculate my expectancy from these results"] }
  ];
  var EMOJI = ["🎓", "🧠", "🪶", "🧪", "🎤", "💪", "✍️", "📈", "🏠", "🍳", "🎨", "🎧", "🩺", "⚖️", "🛠️", "🌍", "📚", "🔭", "🧩", "🦉"];
  function personas() { try { return customPersonas } catch (e) { return [] } }
  function savePersonas() { try { LS("phraortes_personas", JSON.stringify(customPersonas)) } catch (e) { } }
  function sanitizeMind(m) {
    var c = /^#[0-9a-f]{6}$/i.test(m && m.c) ? m.c : "#D4A24C";
    return {
      name: clip(m && m.n, 40).trim() || "Untitled Mind", emoji: clip(m && m.e, 8) || "🧠", color: c,
      tagline: clip(m && m.t, 120), instructions: clip(m && m.i, 4000),
      starters: ((m && m.s) || []).slice(0, 4).map(function (x) { return clip(x, 160) }).filter(Boolean), author: clip(m && m.a, 30)
    };
  }
  function addMind(m, src) {
    var ps = personas(), ex = src && ps.filter(function (p) { return p.src === src })[0]; if (ex) return ex;
    var s = sanitizeMind({ n: m.name || m.n, e: m.emoji || m.e, c: m.color || m.c, t: m.tagline || m.t, i: m.instructions || m.i, s: m.starters || m.s, a: m.author || m.a });
    var p = { id: "p" + Date.now() + rid(3), name: s.name, instructions: s.instructions, emoji: s.emoji, color: s.color, tagline: s.tagline, starters: s.starters, author: s.author, src: src || "", createdAt: Date.now() };
    ps.push(p); savePersonas(); try { W.renderPersonaGrid && W.renderPersonaGrid() } catch (e) { } return p;
  }
  function useMind(p, starter) {
    try { if (typeof activePersonaId !== "undefined" && activePersonaId !== p.id) W.activatePersona(p.id) } catch (e) { }
    closeSheet($("#mn")); closeAcct();
    try { W.newChat() } catch (e) { }
    setTimeout(function () {
      var inp = $("#ui");
      if (starter && inp) { inp.value = starter; try { inp.dispatchEvent(new Event("input", { bubbles: true })) } catch (e) { } inp.focus() }
    }, 350);
    toast(p.name + " is ready");
  }
  var mv = { tab: "discover", cur: null };
  function mindTop(title, sub, back, right) {
    return '<div class="sh-top"><button class="sh-i" data-a="' + (back || "close") + '" aria-label="Back">' + (back ? IC.back : IC.x) + '</button><div class="sh-t"><b>' + esc(title) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>" + (right || "") + "</div>";
  }
  function card(m, key, mine) {
    return '<button class="mn-c" style="--c:' + esc(m.color || m.c) + '" data-a="open" data-k="' + esc(key) + '" data-mine="' + (mine ? 1 : 0) + '"><span class="mn-e">' + esc(m.emoji || m.e) + '</span><span class="mn-n">' + esc(m.name || m.n) + '</span><span class="mn-t">' + esc(m.tagline || m.t || "") + "</span></button>";
  }
  function renderMinds() {
    var e = sheet("mn"); css();
    if (mv.cur) return renderDetail(e);
    if (mv.edit) return renderEdit(e);
    var mine = personas(), h = mindTop("Minds", "Assistants with a job — build one, share it as a link", null, '<button class="sh-i p" data-a="new" aria-label="New">' + IC.plus + "</button>");
    h += '<div class="sh-b"><div class="sh-tabs"><button data-a="tab" data-t="discover" class="' + (mv.tab === "discover" ? "on" : "") + '">Discover</button><button data-a="tab" data-t="mine" class="' + (mv.tab === "mine" ? "on" : "") + '">My Minds' + (mine.length ? " · " + mine.length : "") + "</button></div>";
    if (mv.tab === "discover") {
      h += '<div class="mn-g">' + STARTERS.map(function (m) { return card(m, "s:" + m.k, false) }).join("") + "</div>";
      h += '<p class="sh-note">Open a Mind to chat with it, or add it to My Minds and make it yours.</p>';
    } else {
      h += '<div class="mn-g">' + mine.map(function (p) { return card(p, "p:" + p.id, true) }).join("") + '<button class="mn-c new" data-a="new"><span class="mn-e">' + IC.plus + '</span><span class="mn-n">Create a Mind</span></button></div>';
    }
    e.innerHTML = h + "</div>";
  }
  function getMind(k) {
    if (!k) return null;
    if (k.slice(0, 2) === "s:") { var s = STARTERS.filter(function (x) { return x.k === k.slice(2) })[0]; return s ? { m: s, builtin: true } : null }
    var p = personas().filter(function (x) { return x.id === k.slice(2) })[0]; return p ? { m: p, mine: true } : null;
  }
  function renderDetail(e) {
    var r = getMind(mv.cur); if (!r) { mv.cur = null; return renderMinds() }
    var m = r.m, nm = m.name || m.n, em = m.emoji || m.e, co = m.color || m.c, tg = m.tagline || m.t, ins = m.instructions || m.i, st = m.starters || m.s || [];
    var h = mindTop("", "", "back", r.mine ? '<button class="sh-i" data-a="edit" aria-label="Edit">' + IC.edit + '</button><button class="sh-i" data-a="share" aria-label="Share">' + IC.share + "</button>" : '<button class="sh-i" data-a="share" aria-label="Share">' + IC.share + "</button>");
    h += '<div class="sh-b"><div class="mn-d" style="--c:' + esc(co) + '"><div class="big">' + esc(em) + "</div><h2>" + esc(nm) + "</h2><p>" + esc(tg) + (m.author ? " · by " + esc(m.author) : "") + "</p></div>";
    h += '<div class="mn-st">' + st.map(function (s, i) { return '<button data-a="starter" data-i="' + i + '">' + esc(s) + "</button>" }).join("") + "</div>";
    h += '<button class="sh-btn p" data-a="chat">' + IC.chat + " Chat with " + esc(nm) + "</button>";
    if (r.builtin) h += '<button class="sh-btn" data-a="add">' + IC.plus + " Add to My Minds</button>";
    h += '<button class="sh-btn" data-a="peek">' + IC.list + " View instructions</button><div id=\"mn-pk\"></div>";
    if (r.mine) h += '<button class="sh-btn red" data-a="del">' + IC.trash + " Delete</button>";
    e.innerHTML = h + "</div>"; e._ins = ins;
  }
  var ed = null;
  function renderEdit(e) {
    var o = ed, h = mindTop(o.id ? "Edit Mind" : "New Mind", "", "back", '<button class="sh-i p" data-a="save">Save</button>');
    h += '<div class="sh-b sh-f"><label>Icon</label><div class="sh-em">' + EMOJI.map(function (x) { return '<button type="button" data-a="emo" data-v="' + x + '" class="' + (o.emoji === x ? "on" : "") + '">' + x + "</button>" }).join("") + "</div>";
    h += '<label>Colour</label><div class="sh-co">' + COLORS.map(function (x) { return '<button type="button" data-a="col" data-v="' + x + '" style="background:' + x + '" class="' + (o.color === x ? "on" : "") + '"></button>' }).join("") + "</div>";
    h += '<label>Name</label><input id="mn-n" maxlength="40" placeholder="e.g. Konkur Coach" value="' + esc(o.name) + '">';
    h += '<label>One line about it</label><input id="mn-t" maxlength="120" placeholder="What is it for?" value="' + esc(o.tagline) + '">';
    h += '<label>Instructions</label><textarea id="mn-i" rows="8" maxlength="4000" placeholder="Who is it, how should it talk, what should it never do…">' + esc(o.instructions) + "</textarea>";
    h += '<button class="sh-btn" data-a="polish" type="button">' + IC.spark + " Improve with AI</button>";
    h += "<label>Starter questions (optional)</label>";
    for (var i = 0; i < 3; i++) h += '<input class="mn-s" maxlength="160" style="margin-bottom:8px" placeholder="Starter ' + (i + 1) + '" value="' + esc(o.starters[i] || "") + '">';
    e.innerHTML = h + "</div>";
  }
  function readEdit() {
    var e = $("#mn"); if (!ed || !$("#mn-n", e)) return;
    ed.name = $("#mn-n", e).value; ed.tagline = $("#mn-t", e).value; ed.instructions = $("#mn-i", e).value;
    ed.starters = $$(".mn-s", e).map(function (x) { return x.value.trim() }).filter(Boolean);
  }
  async function polish() {
    readEdit(); if (!ed.instructions.trim() && !ed.name.trim()) { toast("Write a few words first", "error"); return }
    var b = $('#mn [data-a="polish"]'); if (b) { b.disabled = true; b.textContent = "Improving…" }
    try {
      var out = await W.fetchAI([{ role: "system", content: "You turn a rough idea into a precise system prompt for an AI assistant. Output ONLY the improved instructions (no preface, no markdown headings). Keep the user's language. Define: role, tone, how to answer, what to ask when unclear, and clear limits. Max 900 words. Do not add facts you were not given." }, { role: "user", content: "Name: " + ed.name + "\nPurpose: " + ed.tagline + "\nRough instructions:\n" + ed.instructions }], false, false);
      var t = typeof out === "string" ? out : (out && out.content) || ""; if (t.trim()) ed.instructions = t.trim().slice(0, 4000);
      renderEdit($("#mn")); toast("Instructions improved");
    } catch (er) { toast("Couldn't improve right now", "error"); renderEdit($("#mn")) }
  }
  async function shareMind(m) {
    var s = sanitizeMind({ n: m.name || m.n, e: m.emoji || m.e, c: m.color || m.c, t: m.tagline || m.t, i: m.instructions || m.i, s: m.starters || m.s, a: m.author || m.a || myName() });
    var p = await pack({ v: 1, n: s.name, e: s.emoji, c: s.color, t: s.tagline, i: s.instructions, s: s.starters, a: s.author });
    share(baseUrl() + "#mind=" + p, s.name + " — a Mind on Phraortes", s.tagline || "Chat with this Mind");
  }
  function mindsClick(ev) {
    var b = ev.target.closest("[data-a]"); if (!b) return; var a = b.dataset.a; hap(); var e = $("#mn");
    if (a === "close") { closeSheet(e); return }
    if (a === "back") { if (mv.edit) { mv.edit = false; ed = null } else mv.cur = null; renderMinds(); return }
    if (a === "tab") { mv.tab = b.dataset.t; renderMinds(); return }
    if (a === "open") { mv.cur = b.dataset.k; renderMinds(); e.querySelector(".sh-b").scrollTop = 0; return }
    if (a === "new") { ed = { id: "", name: "", tagline: "", instructions: "", emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)], color: COLORS[Math.floor(Math.random() * COLORS.length)], starters: [] }; mv.edit = true; mv.cur = null; renderMinds(); return }
    if (a === "emo") { readEdit(); ed.emoji = b.dataset.v; renderEdit(e); return }
    if (a === "col") { readEdit(); ed.color = b.dataset.v; renderEdit(e); return }
    if (a === "polish") { polish(); return }
    if (a === "save") {
      readEdit(); if (!ed.name.trim()) { toast("Give it a name", "error"); return } if (!ed.instructions.trim()) { toast("Write its instructions", "error"); return }
      var s = sanitizeMind({ n: ed.name, e: ed.emoji, c: ed.color, t: ed.tagline, i: ed.instructions, s: ed.starters, a: myName() });
      if (ed.id) { var p = personas().filter(function (x) { return x.id === ed.id })[0]; if (p) { p.name = s.name; p.emoji = s.emoji; p.color = s.color; p.tagline = s.tagline; p.instructions = s.instructions; p.starters = s.starters; savePersonas(); try { W.renderPersonaGrid() } catch (er) { } } mv.cur = "p:" + ed.id }
      else { var np = addMind({ name: s.name, emoji: s.emoji, color: s.color, tagline: s.tagline, instructions: s.instructions, starters: s.starters, author: s.author }); mv.cur = "p:" + np.id; mv.tab = "mine" }
      mv.edit = false; ed = null; renderMinds(); toast("Saved"); return
    }
    var r = getMind(mv.cur); if (!r) return; var m = r.m;
    if (a === "edit") { ed = { id: m.id, name: m.name, tagline: m.tagline || "", instructions: m.instructions, emoji: m.emoji, color: m.color, starters: (m.starters || []).slice() }; mv.edit = true; renderMinds(); return }
    if (a === "add") { var np2 = addMind(m, "builtin:" + m.k); mv.cur = "p:" + np2.id; mv.tab = "mine"; renderMinds(); toast("Added to My Minds"); return }
    if (a === "chat") { useMind(r.builtin ? addMind(m, "builtin:" + m.k) : m); return }
    if (a === "starter") { var st = (m.starters || m.s || [])[+b.dataset.i]; useMind(r.builtin ? addMind(m, "builtin:" + m.k) : m, st); return }
    if (a === "peek") { var pk = $("#mn-pk"); pk.innerHTML = pk.innerHTML ? "" : '<div class="sh-pre">' + esc(e._ins) + "</div>"; return }
    if (a === "share") { shareMind(m); return }
    if (a === "del") { if (confirm("Delete " + m.name + "?")) { var ps = personas(), ix = ps.indexOf(m); if (ix >= 0) { ps.splice(ix, 1); try { if (activePersonaId === m.id) { activePersonaId = null; LS("phraortes_active_persona", null) } } catch (er) { } savePersonas(); try { W.renderPersonaGrid() } catch (er) { } } mv.cur = null; mv.tab = "mine"; renderMinds() } return }
  }
  function openMinds(tab) {
    var e = sheet("mn"); if (!e._w) { e._w = 1; e.addEventListener("click", mindsClick) }
    mv.cur = null; mv.edit = false; ed = null; mv.tab = tab || (personas().length ? "mine" : "discover");
    renderMinds(); openSheet(e);
  }
  /* incoming link */
  function inviteCard(html) {
    css(); var e = $("#sh-inv"); if (!e) { e = D.createElement("div"); e.id = "sh-inv"; D.body.appendChild(e); e.addEventListener("click", function (ev) { if (ev.target === e) e.classList.remove("on") }) }
    e.innerHTML = '<div class="card">' + html + "</div>"; e.classList.add("on"); return e;
  }
  async function receiveMind(payload) {
    var m; try { m = sanitizeMind(await unpack(payload)) } catch (e) { toast("That Mind link is damaged", "error"); return }
    var e = inviteCard('<div class="mn-d" style="--c:' + esc(m.color) + '"><div class="big">' + esc(m.emoji) + "</div><h2>" + esc(m.name) + "</h2><p>" + esc(m.tagline) + "</p>" + (m.author ? '<div class="by" style="margin-top:6px">Shared by ' + esc(m.author) + "</div>" : "") + "</div>" +
      '<button class="sh-btn p" data-i="chat">' + IC.chat + ' Chat with it</button><button class="sh-btn" data-i="add">' + IC.plus + ' Add to My Minds</button><button class="sh-btn" data-i="view">' + IC.list + ' View instructions</button><div id="iv-pk"></div><p class="sh-note">Only add Minds from people you trust — the instructions shape how the assistant behaves.</p><button class="sh-btn" data-i="no">Not now</button>');
    e.onclick = function (ev) {
      var b = ev.target.closest("[data-i]"); if (!b) { if (ev.target === e) e.classList.remove("on"); return } var i = b.dataset.i; hap();
      if (i === "no") e.classList.remove("on");
      if (i === "view") { var pk = $("#iv-pk", e); pk.innerHTML = pk.innerHTML ? "" : '<div class="sh-pre">' + esc(m.instructions) + "</div>" }
      if (i === "add") { addMind(m); e.classList.remove("on"); toast("Added to My Minds") }
      if (i === "chat") { var p = addMind(m); e.classList.remove("on"); useMind(p, m.starters[0]) }
    };
  }

  /* ═════════════════════════ ROOMS ═════════════════════════ */
  var RELAYS = function () { var o = LS("phr_relay"); return o ? [o] : ["https://ntfy.sh"] };
  var R = { list: J("phr_rooms", []), cur: null, timer: null, busy: false, sess: {} };
  function saveRooms() { LS("phr_rooms", JSON.stringify(R.list)) }
  function roomMsgs(id) { return J("phr_rm_" + id, []) }
  function saveMsgs(id, a) { LS("phr_rm_" + id, JSON.stringify(a.slice(-300))) }
  async function importKey(b) { return crypto.subtle.importKey("raw", unb64u(b), "AES-GCM", false, ["encrypt", "decrypt"]) }
  async function enc(room, obj) {
    var k = R.sess[room.id] || (R.sess[room.id] = await importKey(room.key)), iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, TE.encode(JSON.stringify(obj))));
    var out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return b64u(out);
  }
  async function dec(room, s) {
    try { var k = R.sess[room.id] || (R.sess[room.id] = await importKey(room.key)), a = unb64u(s); return JSON.parse(TD.decode(new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: a.subarray(0, 12) }, k, a.subarray(12))))) } catch (e) { return null }
  }
  async function relay(path, opt) {
    var rs = RELAYS(), last;
    var best = LS("phr_relay_best"); if (best && rs.indexOf(best) > 0) { rs = [best].concat(rs.filter(function (x) { return x !== best })) }
    for (var i = 0; i < rs.length; i++) {
      try { var c = new AbortController(), t = setTimeout(function () { c.abort() }, 9000); opt = opt || {}; opt.signal = c.signal; var r = await fetch(rs[i] + path, opt); clearTimeout(t); if (r.ok) { LS("phr_relay_best", rs[i]); return r } last = new Error("relay " + r.status) } catch (e) { last = e }
    }
    throw last || new Error("relay");
  }
  async function publish(room, obj) { var body = await enc(room, obj); await relay("/" + room.id, { method: "POST", body: body }) }
  async function poll(room) {
    var since = room.since || "all";
    var r = await relay("/" + room.id + "/json?poll=1&since=" + encodeURIComponent(since)), t = await r.text(), n = 0, got = [];
    var lines = t.split("\n").filter(Boolean);
    for (var i = 0; i < lines.length; i++) {
      var ev; try { ev = JSON.parse(lines[i]) } catch (e) { continue }
      if (ev.event !== "message") continue; room.since = ev.id;
      var o = await dec(room, ev.message || ""); if (!o || !o.t) continue;
      o.nid = ev.id; o.at = (ev.time || 0) * 1000 || Date.now(); got.push(o);
    }
    /* apply synchronously against the freshest copy so a message typed meanwhile is never lost */
    var msgs = roomMsgs(room.id), seen = {}; msgs.forEach(function (m) { if (m.nid) seen[m.nid] = 1 });
    got.forEach(function (o) {
      if (seen[o.nid]) return;
      var mine = o.mid && msgs.filter(function (m) { return m.mid === o.mid })[0];
      if (mine) { mine.nid = o.nid; seen[o.nid] = 1; return }
      msgs.push(o); seen[o.nid] = 1; n++;
      if (o.t === "m" || o.t === "ai") { room.last = (o.n ? o.n + ": " : "") + clip(o.x, 60); room.lastAt = o.at; if (!(R.cur && R.cur.id === room.id && $("#rm").classList.contains("on"))) room.unread = (room.unread || 0) + 1 }
    });
    msgs.sort(function (a, b) { return (a.at || 0) - (b.at || 0) });
    saveMsgs(room.id, msgs); saveRooms(); return n;
  }
  function memberCount(id) { var s = {}; roomMsgs(id).forEach(function (m) { if (m.u) s[m.u] = 1 }); return Object.keys(s).length }
  function roomLink(room) { return baseUrl() + "#room=" + room.id + "." + room.key + "." + encodeURIComponent(room.name).replace(/\./g, "%2E") }
  function initial(s) { return (s || "?").trim().charAt(0).toUpperCase() }

  function renderRooms() {
    var e = sheet("rm"); css(); if (R.cur) return renderRoom(e);
    var h = '<div class="sh-top"><button class="sh-i" data-a="close" aria-label="Close">' + IC.x + '</button><div class="sh-t"><b>Rooms</b><small>Talk together — the AI joins when you ask</small></div><button class="sh-i p" data-a="new" aria-label="New room">' + IC.plus + "</button></div><div class=\"sh-b\">";
    var ls = R.list.slice().sort(function (a, b) { return (b.lastAt || b.created || 0) - (a.lastAt || a.created || 0) });
    if (!ls.length) h += '<div class="mn-d"><div class="big" style="--c:#D4A24C">💬</div><h2>No rooms yet</h2><p>Create a room, send the link, and chat with friends, family or your team — with the AI in the middle.</p></div><button class="sh-btn p" data-a="new">' + IC.plus + ' New room</button><button class="sh-btn" data-a="join">' + IC.link + " Join with a link</button>";
    else h += ls.map(function (r) { return '<button class="rm-i" data-a="open" data-id="' + esc(r.id) + '"><span class="rm-av" style="background:' + colorFor(r.id) + '">' + esc(initial(r.name)) + "</span><div><b>" + esc(r.name) + "</b><small>" + esc(r.last || "No messages yet") + "</small></div>" + (r.unread ? '<span class="rm-u">' + (r.unread > 99 ? "99+" : r.unread) + "</span>" : "") + "</button>" }).join("") + '<button class="sh-btn" data-a="join">' + IC.link + " Join with a link</button>";
    h += '<p class="sh-note">' + IC.lock + " End-to-end encrypted in your browser. The key is in the link, so only people you send it to can read the room. The relay keeps messages for 12 hours; your device keeps the history.</p>";
    e.innerHTML = h + "</div>";
  }
  function renderRoom(e) {
    var r = R.cur, msgs = roomMsgs(r.id), me = uid();
    var h = '<div class="sh-top"><button class="sh-i" data-a="back" aria-label="Back">' + IC.back + '</button><div class="sh-t"><b>' + esc(r.name) + "</b><small>" + memberCount(r.id) + " in this room</small></div><button class=\"sh-i\" data-a=\"invite\" aria-label=\"Invite\">" + IC.share + '</button><button class="sh-i" data-a="more" aria-label="More">' + I('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>') + '</button></div><div class="rm-feed" id="rm-feed"></div>';
    h += '<div class="rm-lock">' + IC.lock + " End-to-end encrypted</div><div class=\"rm-bar\"><button data-a=\"ask\">✦ Ask AI</button><button data-a=\"sum\">Summarize</button><button data-a=\"dec\">Decisions &amp; tasks</button></div>";
    h += '<div class="rm-in"><textarea id="rm-t" rows="1" placeholder="Message — or @ai to ask the AI"></textarea><button class="go" data-a="send" aria-label="Send">' + IC.send + "</button></div>";
    e.innerHTML = h; feed(true);
  }
  function feed(force) {
    var f = $("#rm-feed"); if (!f || !R.cur) return; var msgs = roomMsgs(R.cur.id), me = uid(), atEnd = force || f.scrollHeight - f.scrollTop - f.clientHeight < 90, out = "";
    msgs.forEach(function (m) {
      if (m.t === "j") { out += '<div class="rm-sys">' + esc(m.n) + " joined</div>"; return }
      if (m.t === "ai") { out += '<div class="rm-m ai"><div class="rm-w">✦ Phraortes' + (m.f ? " · asked by " + esc(m.f) : "") + '</div><div class="rm-bb">' + esc(m.x) + "</div></div>"; return }
      if (m.t !== "m") return; var mine = m.u === me;
      out += '<div class="rm-m' + (mine ? " me" : "") + '">' + (mine ? "" : '<div class="rm-w" style="color:' + esc(colorFor(m.u || "")) + '">' + esc(m.n) + "</div>") + '<div class="rm-bb">' + esc(m.x) + "</div></div>";
    });
    if (R.thinking === R.cur.id) out += '<div class="rm-tp">✦ Phraortes is thinking…</div>';
    f.innerHTML = out; if (atEnd) f.scrollTop = f.scrollHeight;
    var sm = $("#rm .sh-t small"); if (sm) { var c = memberCount(R.cur.id); sm.textContent = c + (c === 1 ? " person" : " people") + " in this room" }
  }
  async function pushMsg(obj) {
    var room = R.cur; if (!room) return; obj.mid = rid(10); obj.at = Date.now();
    var msgs = roomMsgs(room.id); msgs.push(obj); saveMsgs(room.id, msgs); feed(true);
    try { await publish(room, obj) } catch (e) { toast("Couldn't send — check your connection", "error"); msgs = roomMsgs(room.id).filter(function (m) { return m.mid !== obj.mid }); saveMsgs(room.id, msgs); feed() }
  }
  function ctx(room, n) {
    return roomMsgs(room.id).filter(function (m) { return m.t === "m" || m.t === "ai" }).slice(-(n || 24)).map(function (m) { return (m.t === "ai" ? "Phraortes" : m.n) + ": " + m.x }).join("\n");
  }
  async function askAI(kind, q) {
    var room = R.cur; if (!room || R.thinking) return; R.thinking = room.id; feed(true);
    var who = myName() || "Someone";
    var sys = "You are Phraortes, an AI assistant sitting in a group chat room with several people. Be concise (under 180 words unless asked for more), plain text only, no markdown headings. Address the group naturally, answer in the language the question is written in. Never invent what people said; use only the chat provided.";
    var user = kind === "sum" ? "Summarize this conversation in 5 short bullet points (use '• '). Then one line: what is still undecided.\n\nCHAT:\n" + ctx(room, 60)
      : kind === "dec" ? "From this conversation list: DECISIONS made, and TASKS with the person responsible if said (use '• '). If none, say so.\n\nCHAT:\n" + ctx(room, 60)
        : "Recent chat for context:\n" + ctx(room, 16) + "\n\n" + who + " asks you: " + q;
    try {
      var out = await W.fetchAI([{ role: "system", content: sys }, { role: "user", content: user }], false, false);
      var t = (typeof out === "string" ? out : (out && out.content) || "").trim(); if (!t) throw new Error("empty");
      R.thinking = null; await pushMsg({ t: "ai", x: clip(t, 2300), f: who });
    } catch (e) { R.thinking = null; feed(); toast("The AI couldn't answer right now", "error") }
  }
  function ensureName(cb) {
    var n = myName(); if (n) { cb(n); return }
    var e = inviteCard('<div class="mn-d"><h2>What should people call you?</h2><p>Shown next to your messages in rooms.</p></div><div class="sh-f"><input id="nm-i" maxlength="24" placeholder="Your name" autocomplete="off"></div><button class="sh-btn p" id="nm-ok">Continue</button>');
    e.onclick = function (ev) { if (ev.target.id === "nm-ok") { var v = $("#nm-i").value.trim(); if (!v) return; LS("phr_me_name", v); e.classList.remove("on"); cb(v) } };
    setTimeout(function () { var i = $("#nm-i"); i && i.focus() }, 120);
  }
  async function createRoom(name) {
    var k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]), raw = new Uint8Array(await crypto.subtle.exportKey("raw", k));
    var room = { id: "phr-" + rid(20), key: b64u(raw), name: clip(name, 40) || "Room", created: Date.now(), unread: 0 };
    R.list.push(room); saveRooms(); return room;
  }
  async function joinFromLink(str, silent) {
    var m = String(str).match(/#?room=([a-z0-9-]+)\.([A-Za-z0-9_-]{40,50})(?:\.([^\s&]*))?/); if (!m) { toast("That doesn't look like a room link", "error"); return null }
    var room = R.list.filter(function (x) { return x.id === m[1] })[0], nm = ""; try { nm = decodeURIComponent(m[3] || "") } catch (e) { }
    if (!room) { room = { id: m[1], key: m[2], name: clip(nm, 40) || "Room", created: Date.now(), unread: 0 }; R.list.push(room); saveRooms() }
    return room;
  }
  async function enterRoom(room) {
    R.cur = room; room.unread = 0; saveRooms(); var e = roomSheet(); renderRooms(); openSheet(e);
    ensureName(async function (n) {
      var ms = roomMsgs(room.id);
      if (!ms.some(function (m) { return m.t === "j" && m.u === uid() })) { await pushMsg({ t: "j", n: n, u: uid() }) }
      tick(true);
    });
    startPoll();
  }
  async function tick(force) {
    if (R.busy || !R.cur) return; R.busy = true;
    try { var n = await poll(R.cur); if (n || force) feed() } catch (e) { } finally { R.busy = false }
  }
  function startPoll() { stopPoll(); R.timer = setInterval(function () { if (!D.hidden) tick() }, 2200) }
  function stopPoll() { if (R.timer) clearInterval(R.timer); R.timer = null }
  function roomsClick(ev) {
    var b = ev.target.closest("[data-a]"); if (!b) return; var a = b.dataset.a, e = $("#rm"); hap();
    if (a === "close") { closeSheet(e); stopPoll(); R.cur = null; return }
    if (a === "back") { stopPoll(); R.cur = null; renderRooms(); return }
    if (a === "new") { ensureName(function () { var e2 = inviteCard('<div class="mn-d"><h2>New room</h2><p>Give it a name, then send the link.</p></div><div class="sh-f"><input id="rn-i" maxlength="40" placeholder="e.g. Study group" autocomplete="off"></div><button class="sh-btn p" id="rn-ok">Create room</button><button class="sh-btn" id="rn-no">Cancel</button>'); e2.onclick = async function (ev) { if (ev.target.id === "rn-no") e2.classList.remove("on"); if (ev.target.id === "rn-ok") { var nm = $("#rn-i").value.trim(); if (!nm) return; e2.classList.remove("on"); var room = await createRoom(nm); await enterRoom(room); setTimeout(function () { share(roomLink(room), room.name + " — join me on Phraortes", "Join our room") }, 500) } }; setTimeout(function () { var i = $("#rn-i"); i && i.focus() }, 120) }); return }
    if (a === "join") { var l = prompt("Paste the room link"); if (l) joinFromLink(l).then(function (r) { if (r) enterRoom(r) }); return }
    if (a === "open") { var r = R.list.filter(function (x) { return x.id === b.dataset.id })[0]; if (r) enterRoom(r); return }
    if (!R.cur) return;
    if (a === "invite") { share(roomLink(R.cur), R.cur.name + " — join me on Phraortes", "Join our room"); return }
    if (a === "more") {
      var em = inviteCard('<div class="mn-d"><h2>' + esc(R.cur.name) + '</h2><p>' + memberCount(R.cur.id) + ' in this room</p></div><button class="sh-btn p" data-i="cp">' + IC.link + ' Copy invite link</button><button class="sh-btn red" data-i="lv">' + IC.trash + ' Leave room</button><button class="sh-btn" data-i="no">Close</button><p class="sh-note">Leaving removes the room and its history from this device only.</p>');
      em.onclick = function (ev) { var bb = ev.target.closest("[data-i]"); if (!bb) { if (ev.target === em) em.classList.remove("on"); return } var k = bb.dataset.i; em.classList.remove("on"); if (k === "cp") copy(roomLink(R.cur), "Invite link copied"); if (k === "lv") { var id = R.cur.id; R.list = R.list.filter(function (x) { return x.id !== id }); LS("phr_rm_" + id, null); saveRooms(); stopPoll(); R.cur = null; renderRooms() } };
      return;
    }
    var t = $("#rm-t");
    if (a === "send") { var v = t.value.trim(); if (!v) return; t.value = ""; t.style.height = ""; sendText(v) }
    if (a === "ask") { var q = t.value.trim(); if (!q) { t.focus(); toast("Type your question, then tap ✦ Ask AI", "info"); return } t.value = ""; sendText("@ai " + q) }
    if (a === "sum") askAI("sum"); if (a === "dec") askAI("dec");
  }
  async function sendText(v) {
    var n = myName() || "Me", isAI = /^@ai\b/i.test(v), q = v.replace(/^@ai\b[:,]?\s*/i, "");
    await pushMsg({ t: "m", n: n, u: uid(), x: clip(isAI ? "✦ " + q : v, 2300) });
    if (isAI && q) askAI("ask", q);
  }
  function roomSheet() {
    var e = sheet("rm"); if (!e._w) { e._w = 1; e.addEventListener("click", roomsClick); e.addEventListener("input", function (ev) { if (ev.target.id === "rm-t") { ev.target.style.height = "auto"; ev.target.style.height = Math.min(120, ev.target.scrollHeight) + "px" } }); e.addEventListener("keydown", function (ev) { if (ev.target.id === "rm-t" && ev.key === "Enter" && !ev.shiftKey && !/iPhone|iPad|Android/i.test(navigator.userAgent)) { ev.preventDefault(); roomsClick({ target: $('[data-a="send"]', e) }) } }) }
    return e;
  }
  function openRooms() {
    var e = roomSheet(); R.cur = null; renderRooms(); openSheet(e);
    R.list.forEach(function (r) { poll(r).then(function () { if (!R.cur) renderRooms() }, function () { }) });
  }
  /* unread badge for the menu */
  function unread() { return R.list.reduce(function (s, r) { return s + (r.unread || 0) }, 0) }
  setInterval(function () { if (D.hidden || !R.list.length || (R.cur && $("#rm").classList.contains("on"))) return; var i = 0; (function nx() { if (i >= R.list.length) { try { W.PHR_ACCT3 && W.PHR_ACCT3.paint() } catch (e) { } return } var r = R.list[i++]; poll(r).then(nx, nx) })() }, 20000);

  /* ───────── deep links ───────── */
  function handleHash() {
    var h = location.hash || ""; if (!h) return;
    if (/^#mind=/.test(h)) { var p = h.slice(6); history.replaceState(null, "", location.pathname + location.search); receiveMind(p) }
    else if (/^#room=/.test(h)) { var hh = h; history.replaceState(null, "", location.pathname + location.search); joinFromLink(hh).then(function (r) { if (r) { var e = inviteCard('<div class="mn-d"><div class="big" style="--c:' + colorFor(r.id) + '">💬</div><h2>' + esc(r.name) + "</h2><p>You’ve been invited to a room. Messages are end-to-end encrypted.</p></div><button class=\"sh-btn p\" data-i=\"go\">Join room</button><button class=\"sh-btn\" data-i=\"no\">Not now</button>"); e.onclick = function (ev) { var b = ev.target.closest("[data-i]"); if (!b) return; e.classList.remove("on"); if (b.dataset.i === "go") enterRoom(r) } } }) }
  }
  W.addEventListener("hashchange", handleHash);
  W.PHR_SHARE = { minds: openMinds, rooms: openRooms, unread: unread, count: function () { return personas().length }, _unpack: unpack, _pack: pack };
  setTimeout(handleHash, 1500);
})();
