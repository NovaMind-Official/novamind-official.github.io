/* voice.js — one voice engine for read-aloud, the Aura call and the Agent.
   Online voices (Cloudflare Workers AI via POST /api/tts) + every voice on the device.
   If the Worker has no /api/tts yet, or the language is not supported online,
   everything falls back to the device voice automatically. */
(function () {
  "use strict";
  var W = window, D = document, KEY = "phr_voice_v1";
  var BASE = (function () { try { return WORKER_BASE_URL } catch (e) { return "https://phraortes-api.esmaeilimatin20.workers.dev" } })();

  /* ---- catalogue ---- */
  var AURA = [
    ["luna", "Luna", "Warm and soft"], ["asteria", "Asteria", "Clear and confident"], ["stella", "Stella", "Bright and friendly"],
    ["hera", "Hera", "Smooth and assured"], ["athena", "Athena", "Calm, British"],
    ["orion", "Orion", "Deep and steady"], ["arcas", "Arcas", "Natural, relaxed"], ["perseus", "Perseus", "Confident"],
    ["helios", "Helios", "Clear, British"], ["orpheus", "Orpheus", "Polished"], ["angus", "Angus", "Warm, Irish"], ["zeus", "Zeus", "Deep and strong"]
  ].map(function (a) { return { id: "aura:" + a[0], sp: a[0], n: a[1], d: a[2], m: "aura", lang: "en" } });
  var MELO = [["es", "Spanish"], ["fr", "French"], ["zh", "Chinese"], ["ja", "Japanese"], ["ko", "Korean"]].map(function (a) {
    return { id: "melo:" + a[0], sp: a[0], n: a[1], d: "Online", m: "melo", lang: a[0] };
  });

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { return {} } }
  var S = load(); if (!S.id) S.id = "auto"; if (!S.rate) S.rate = 1;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }
  function find(id) { return AURA.concat(MELO).filter(function (v) { return v.id === id })[0] }
  function script(t) { return /[؀-ۿ]/.test(t) ? "fa" : /[぀-ヿ]/.test(t) ? "ja" : /[가-힯]/.test(t) ? "ko" : /[一-鿿]/.test(t) ? "zh" : /[Ѐ-ӿ]/.test(t) ? "ru" : "" }

  /* ---- device voices ---- */
  function devVoices() { var a = []; try { a = speechSynthesis.getVoices() || [] } catch (e) { } return a }
  function pickDevice(lang) {
    if (S.id.indexOf("device:") !== 0) return null;
    var name = S.id.slice(7), v = devVoices().filter(function (x) { return x.name === name })[0];
    if (!v) return null;
    var b = String(lang || "").split("-")[0].toLowerCase();
    return !b || (v.lang || "").toLowerCase().indexOf(b) === 0 ? v : null;
  }

  /* ---- online voices ---- */
  var cache = {}, cur = null, down = 0, warned = false;
  function selOnline(text, lang) {
    var v = find(S.id), sc = script(text), L = String(lang || "").split("-")[0].toLowerCase();
    if (!v || Date.now() < down) return null;
    if (v.m === "aura") return (sc || (L && L !== "en")) ? null : v;
    if (v.m === "melo") return (sc && sc !== v.lang) ? null : v;
    return null;
  }
  function wants(text, lang) { return !!selOnline(text, lang) }
  function fetchAudio(text, o) {
    o = o || {}; text = String(text || "").slice(0, 600);
    var v = o.voice || selOnline(text, o.lang); if (!v || !text) return Promise.resolve(null);
    var ck = v.id + "|" + text;
    if (cache[ck]) return Promise.resolve(mk(cache[ck]));
    var c = new AbortController(), t = setTimeout(function () { c.abort() }, 15000);
    return fetch(BASE + "/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, signal: c.signal, body: JSON.stringify({ text: text, model: v.m, voice: v.sp, lang: v.lang }) })
      .then(function (r) { clearTimeout(t); var ct = r.headers.get("content-type") || ""; if (!r.ok || ct.indexOf("audio") < 0) { return r.text().then(function (tx) { throw new Error("HTTP " + r.status + (tx ? " · " + tx.replace(/\s+/g, " ").slice(0, 70) : "")) }) } return r.blob() })
      .then(function (b) { var keys = Object.keys(cache); if (keys.length > 30) delete cache[keys[0]]; cache[ck] = b; down = 0; return mk(b) })
      .catch(function (e) {
        clearTimeout(t); down = Date.now() + 5 * 60 * 1000; S.err = String((e && e.message) || e);
        if (o.loud || !warned) { warned = true; try { W.showToast && W.showToast("Online voice failed — " + S.err, "info") } catch (x) { } }
        return null;
      });
  }
  function mk(b) { var a = new Audio(URL.createObjectURL(b)); a.playbackRate = S.rate; return a }
  function play(a, end) {
    stop(); if (!a) return false; cur = a; a.playbackRate = S.rate;
    a.onended = a.onerror = function () { if (cur === a) cur = null; end && end() };
    var p = a.play(); if (p && p.catch) p.catch(function () { if (cur === a) cur = null; end && end() });
    return true;
  }
  function stop() { if (cur) { try { cur.onended = cur.onerror = null; cur.pause() } catch (e) { } cur = null } }

  /* the Aura call already calls window.PHR_TTS(text,{lang}) and falls back to the device voice when it returns nothing */
  W.PHR_TTS = function (text, o) { return fetchAudio(text, { lang: o && o.lang }) };

  function label() {
    if (S.id === "auto") return "Automatic";
    var v = find(S.id); if (v) return v.m === "melo" ? v.n : v.n;
    return S.id.slice(7).replace(/\s*\((Enhanced|Premium|Compact)\)/i, "");
  }
  function choose(id) { S.id = id; save(); refreshTags(); }
  function setRate(r) { S.rate = r; save(); if (cur) cur.playbackRate = r; }

  /* ---- preview ---- */
  function preview(id) {
    stop(); try { speechSynthesis.cancel() } catch (e) { }
    var v = find(id);
    if (v) {
      var line = v.m === "aura" ? "Hi, I'm " + v.n + ". This is how I sound." : { es: "Hola, así suena mi voz.", fr: "Bonjour, voici ma voix.", zh: "你好,这是我的声音。", ja: "こんにちは、これが私の声です。", ko: "안녕하세요, 제 목소리예요." }[v.lang];
      down = 0; fetchAudio(line, { voice: v, loud: true }).then(function (a) { if (a) play(a) });
      return;
    }
    if (id === "auto") { speakDevice("Hi, this is how I sound.", null); return }
    var d = devVoices().filter(function (x) { return "device:" + x.name === id })[0]; if (d) speakDevice(/^fa/i.test(d.lang) ? "سلام، این صدای من است." : "Hi, this is how I sound.", d);
  }
  function speakDevice(t, voice) {
    try { var u = new SpeechSynthesisUtterance(t); if (voice) { u.voice = voice; u.lang = voice.lang } u.rate = S.rate; speechSynthesis.speak(u) } catch (e) { }
  }

  /* ---- sheet ---- */
  function css() {
    if (D.getElementById("vc-css")) return; var s = D.createElement("style"); s.id = "vc-css";
    s.textContent = "#vc{position:fixed;inset:0;z-index:60000;display:none}#vc.on{display:block}#vc .bg{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .25s}#vc.on .bg{opacity:1}" +
      "#vc .sh{position:absolute;left:0;right:0;bottom:0;max-height:82vh;display:flex;flex-direction:column;background:linear-gradient(180deg,#1b1812,#100e0a);border-top:.5px solid rgba(255,255,255,.14);border-radius:26px 26px 0 0;transform:translateY(100%);transition:transform .38s cubic-bezier(.2,.9,.25,1);padding-bottom:env(safe-area-inset-bottom);color:#f1ece0;font-family:-apple-system,system-ui,sans-serif}#vc.on .sh{transform:none}" +
      "#vc .gr{width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.22);margin:9px auto 4px}" +
      "#vc .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 20px 8px}#vc .hd b{font:700 19px -apple-system,system-ui,sans-serif}#vc .hd button{width:34px;height:34px;border-radius:50%;border:.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:0;display:grid;place-items:center}" +
      "#vc .sp{display:flex;gap:6px;padding:2px 20px 10px;align-items:center}#vc .sp small{color:rgba(255,255,255,.5);font-size:12px;margin-right:4px}#vc .sp button{border:.5px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#f1ece0;border-radius:999px;padding:6px 12px;font:600 12.5px -apple-system,system-ui,sans-serif}#vc .sp button.on{background:#e8c468;color:#1a1408;border-color:#e8c468}" +
      "#vc .ls{overflow:auto;-webkit-overflow-scrolling:touch;padding:0 14px 18px}#vc h4{margin:16px 6px 6px;font:600 10.5px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.42)}" +
      "#vc .rw{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:.5px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:inherit;border-radius:16px;padding:11px 14px;margin-bottom:6px;font:inherit;cursor:pointer}#vc .rw:active{transform:scale(.98)}#vc .rw.on{border-color:rgba(232,196,104,.6);background:rgba(232,196,104,.1)}" +
      "#vc .rw i{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;background:rgba(232,196,104,.14);color:#e8c468;font:700 13px -apple-system,system-ui,sans-serif;font-style:normal}#vc .rw div{flex:1;min-width:0}#vc .rw b{display:block;font:600 14.5px -apple-system,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#vc .rw small{color:rgba(255,255,255,.5);font-size:12px}" +
      "#vc .rw em{font-style:normal;font-size:10.5px;color:#9ad7b4;border:.5px solid rgba(154,215,180,.4);border-radius:999px;padding:2px 7px}#vc .rw u{width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.25);flex:none;text-decoration:none}#vc .rw.on u{background:#e8c468;border-color:#e8c468;box-shadow:inset 0 0 0 4px #1a1408}" +
      "#vc .nt{color:rgba(255,255,255,.45);font-size:12px;line-height:1.5;padding:4px 8px}";
    D.head.appendChild(s);
  }
  function row(id, ini, n, d, tag) { return '<button type="button" class="rw' + (S.id === id ? " on" : "") + '" data-v="' + esc(id) + '"><i>' + esc(ini) + "</i><div><b>" + esc(n) + "</b><small>" + esc(d) + "</small></div>" + (tag ? "<em>" + tag + "</em>" : "") + "<u></u></button>" }
  function build() {
    var dv = devVoices().filter(function (v) { return !/novelty|eloquence|albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox/i.test(v.name) });
    dv.sort(function (a, b) { var f = function (v) { return (/^fa/i.test(v.lang) ? 0 : /^en/i.test(v.lang) ? 1 : 2) }; return f(a) - f(b) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name) });
    var h = '<div class="gr"></div><div class="hd"><b>Voice</b><button type="button" id="vc-x" aria-label="Close"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="sp"><small>Speed</small>' + [0.85, 1, 1.15, 1.3].map(function (r) { return '<button type="button" data-r="' + r + '" class="' + (S.rate === r ? "on" : "") + '">' + r + "×</button>" }).join("") + "</div>" +
      '<div class="ls"><h4>Default</h4>' + row("auto", "A", "Automatic", "Best voice for each language", "") +
      "<h4>Studio voices · English</h4>" + AURA.map(function (v) { return row(v.id, v.n[0], v.n, v.d, "online") }).join("") +
      "<h4>Studio voices · other languages</h4>" + MELO.map(function (v) { return row(v.id, v.n[0], v.n, v.d, "online") }).join("") +
      '<div class="nt">Online voices speak English and the languages above. Persian and anything else is spoken with a voice on your device, so it always works.</div>' +
      "<h4>On this device</h4>" + (dv.length ? dv.map(function (v) { return row("device:" + v.name, v.name[0], v.name.replace(/\s*\((Enhanced|Premium|Compact)\)/i, ""), v.lang + (/enhanced|premium/i.test(v.name) ? " · high quality" : ""), "") }).join("") : '<div class="nt">No device voices found.</div>') + "</div>";
    return h;
  }
  function refreshTags() { var el = D.getElementById("vc"); if (!el) return;[].forEach.call(el.querySelectorAll(".rw"), function (b) { b.classList.toggle("on", b.dataset.v === S.id) });[].forEach.call(el.querySelectorAll("[data-r]"), function (b) { b.classList.toggle("on", parseFloat(b.dataset.r) === S.rate) }); [].forEach.call(D.querySelectorAll("[data-vc-label]"), function (e) { e.textContent = label() }) }
  function open() {
    css(); var el = D.getElementById("vc");
    if (!el) {
      el = D.createElement("div"); el.id = "vc"; el.innerHTML = '<div class="bg"></div><div class="sh"></div>'; D.body.appendChild(el);
      el.addEventListener("click", function (e) {
        if (e.target.classList.contains("bg") || e.target.closest("#vc-x")) { close(); return }
        var r = e.target.closest("[data-r]"); if (r) { setRate(parseFloat(r.dataset.r)); refreshTags(); return }
        var b = e.target.closest(".rw"); if (b) { choose(b.dataset.v); preview(b.dataset.v) }
      });
    }
    el.querySelector(".sh").innerHTML = build(); el.style.display = "block"; requestAnimationFrame(function () { el.classList.add("on") });
  }
  function close() { var el = D.getElementById("vc"); if (!el) return; stop(); try { speechSynthesis.cancel() } catch (e) { } el.classList.remove("on"); setTimeout(function () { if (!el.classList.contains("on")) el.style.display = "none" }, 400); refreshTags() }
  try { speechSynthesis.addEventListener("voiceschanged", function () { var el = D.getElementById("vc"); if (el && el.classList.contains("on")) el.querySelector(".sh").innerHTML = build() }) } catch (e) { }

  /* ---- entry points ---- */
  function addAuraButton() {
    var sp = D.querySelector("#aura-screen .au-top > span.au-ib[aria-hidden]"); if (!sp || sp.dataset.vc) return;
    var b = D.createElement("button"); b.type = "button"; b.className = "au-ib"; b.dataset.vc = "1"; b.setAttribute("aria-label", "Voice");
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>';
    b.onclick = open; sp.replaceWith(b);
  }
  function addAgentRow() {
    var m = D.getElementById("ax-more"); if (!m || D.getElementById("ax-voice")) return;
    var b = D.createElement("button"); b.type = "button"; b.id = "ax-voice"; b.className = "ax-b"; b.style.cssText = "width:100%;margin-top:10px;text-align:left;display:flex;justify-content:space-between;align-items:center";
    b.innerHTML = "<span>Voice</span><span style='opacity:.6;font-weight:500' data-vc-label>" + esc(label()) + " ›</span>"; b.onclick = open; m.parentNode.insertBefore(b, m.nextSibling);
    b.querySelector("[data-vc-label]").textContent = label() + " ›";
  }
  setInterval(function () { addAuraButton(); addAgentRow() }, 1200);

  W.PHR_VOICE = {
    open: open, close: close, label: label, wants: wants, fetch: fetchAudio, play: play, stop: stop,
    pickDevice: pickDevice, rate: function () { return S.rate }, get: function () { return S.id }, set: choose,
    catalogue: function () { return AURA.concat(MELO) }
  };
})();
