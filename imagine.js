/* Phraortes — Image Studio (imagine.js)
   The AI writes a rich English prompt and answers with a ```imagine fence; this file turns that fence into a live
   image card: styles, aspect ratios, variations, prompt editing, save. `/imagine …` works instantly with no AI call. */
(function () {
  "use strict";
  var W = window, D = document;
  var STYLES = {
    auto: ["Auto", ", highly detailed, sharp focus, professional quality, 4k"],
    photo: ["Photo", ", ultra realistic photograph, natural lighting, 85mm lens, shallow depth of field, sharp focus, high detail"],
    cinematic: ["Cinematic", ", cinematic still, dramatic lighting, anamorphic lens, film grain, rich color grading"],
    anime: ["Anime", ", anime illustration, clean line art, vibrant colors, studio quality"],
    "3d": ["3D", ", professional 3D render, Pixar-quality, soft studio lighting, global illumination, subsurface scattering, ultra detailed, octane render, 8k"],
    illustration: ["Illustration", ", digital illustration, detailed, rich colors, concept art, trending on artstation"],
    watercolor: ["Watercolor", ", watercolor painting, soft washes, textured paper, delicate details"],
    logo: ["Logo", ", minimal vector logo, flat design, clean geometric shapes, white background"],
    pixel: ["Pixel", ", pixel art, 16-bit, crisp pixels, limited palette"],
    sketch: ["Sketch", ", pencil sketch, hand drawn, cross hatching, paper texture"]
  };
  var RATIOS = { "1:1": [1152, 1152], "4:5": [1024, 1280], "3:2": [1344, 896], "16:9": [1536, 864], "9:16": [864, 1536] };
  var ST = {}, uid = 0;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return Math.abs(h) % 99999 }
  function css() {
    if (D.getElementById("im-css")) return;
    var s = D.createElement("style"); s.id = "im-css";
    s.textContent = [
      ".im-card{margin:14px 0;border-radius:22px;overflow:hidden;border:1px solid rgba(232,196,104,.28);background:linear-gradient(180deg,#14100a,#0a0806);box-shadow:0 14px 40px rgba(0,0,0,.45);direction:ltr;text-align:left;max-width:520px}",
      ".im-top{display:flex;justify-content:space-between;align-items:center;padding:11px 14px 9px;font:700 10.5px/1 'Space Mono',ui-monospace,monospace;letter-spacing:.2em;color:#E8C468}",
      ".im-top em{font-style:normal;color:#8d8472;letter-spacing:.08em;font-weight:500}",
      ".im-grid{display:grid;grid-template-columns:1fr;gap:6px;padding:0 10px}",
      ".im-grid.two{grid-template-columns:1fr 1fr}",
      ".im-cell{position:relative;border-radius:14px;overflow:hidden;background:#0d0b08;aspect-ratio:var(--ar,1);cursor:zoom-in}",
      ".im-cell img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .7s}",
      ".im-cell.ok img{opacity:1}",
      ".im-cell .sh{position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(232,196,104,.13) 50%,transparent 70%) 0 0/250% 100%,radial-gradient(circle at 50% 50%,rgba(232,196,104,.07),transparent 70%);animation:imsh 1.6s linear infinite}",
      ".im-cell.ok .sh,.im-cell.bad .sh{display:none}",
      "@keyframes imsh{to{background-position:-250% 0,0 0}}",
      ".im-cell .st{position:absolute;left:0;right:0;bottom:10px;text-align:center;font:600 11px/1 'Space Mono',ui-monospace,monospace;letter-spacing:.12em;color:#c7b27a}",
      ".im-cell.ok .st{display:none}",
      ".im-cell.bad .st{color:#ff8f8f}",
      ".im-chips{display:flex;gap:6px;overflow-x:auto;padding:10px 10px 0;scrollbar-width:none}",
      ".im-chips::-webkit-scrollbar{display:none}",
      ".im-chips button,.im-acts button{flex:none;border:1px solid rgba(232,196,104,.25);background:rgba(232,196,104,.06);color:#d9c58c;border-radius:999px;padding:7px 12px;font:600 11.5px/1 -apple-system,system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
      ".im-chips button.on{background:#E8C468;color:#1a1306;border-color:#E8C468}",
      ".im-acts{display:flex;gap:6px;flex-wrap:wrap;padding:10px}",
      ".im-acts button{border-radius:12px;padding:9px 13px}",
      ".im-acts button:active,.im-chips button:active{transform:scale(.96)}",
      ".im-edit{display:none;padding:0 10px 12px}",
      ".im-edit.on{display:block}",
      ".im-edit textarea{width:100%;box-sizing:border-box;min-height:84px;border-radius:12px;border:1px solid rgba(232,196,104,.3);background:rgba(0,0,0,.35);color:#f3e9cc;padding:10px 12px;font:13px/1.5 -apple-system,system-ui,sans-serif;resize:vertical}",
      ".im-edit button{margin-top:8px;border:0;border-radius:12px;padding:10px 16px;background:#E8C468;color:#1a1306;font:700 12.5px/1 -apple-system,system-ui,sans-serif}",
      "body.light-theme .im-card{background:linear-gradient(180deg,#fbf8f0,#f3eddd);border-color:rgba(160,120,30,.35)}",
      "body.light-theme .im-chips button,body.light-theme .im-acts button{color:#6b5217;background:rgba(160,120,30,.08)}",
      "body.light-theme .im-chips button.on{color:#1a1306}"
    ].join("\n");
    D.head.appendChild(s);
  }

  function LSget(k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function parse(src) {
    var t = String(src || "").trim(), j = null;
    try { j = JSON.parse(t) } catch (e) {
      var m = /\{[\s\S]*\}/.exec(t); if (m) { try { j = JSON.parse(m[0]) } catch (e2) { } }
      if (!j && t && t.charAt(0) !== "{") j = { prompt: t }
    }
    if (!j || typeof j !== "object" || !String(j.prompt || "").trim()) return null;
    return j;
  }
  function norm(j) {
    var st = String(j.style || "auto").toLowerCase().replace(/[^a-z0-9]/g, ""); if (!STYLES[st]) st = st === "realistic" || st === "photorealistic" ? "photo" : st === "vector" || st === "icon" ? "logo" : st === "digitalart" || st === "art" ? "illustration" : "auto";
    var ar = String(j.aspect || j.ratio || "1:1").replace(/\s/g, ""); if (!RATIOS[ar]) ar = /^(wide|landscape|16x9)$/i.test(ar) ? "16:9" : /^(tall|portrait|story|9x16)$/i.test(ar) ? "9:16" : "1:1";
    var p = String(j.prompt).trim().slice(0, 900);
    var seed = isFinite(+j.seed) && +j.seed > 0 ? +j.seed : hash(p);
    return { prompt: p, style: st, aspect: ar, seed: seed };
  }
  function url(s, seed, model) {
    var r = RATIOS[s.aspect], full = s.prompt + STYLES[s.style][1];
    return "https://image.pollinations.ai/prompt/" + encodeURIComponent(full) + "?width=" + r[0] + "&height=" + r[1] + "&nologo=true&private=true&seed=" + seed + "&model=" + (model || "flux");
  }
  function chips(items, cur, kind) {
    return items.map(function (k) { return '<button type="button" class="' + (k[0] === cur ? "on" : "") + '" data-k="' + kind + '" data-v="' + esc(k[0]) + '" onclick="PHR_IMG.pick(this)">' + esc(k[1]) + "</button>" }).join("");
  }
  function cellHTML(id, seed, s) {
    return '<div class="im-cell" data-seed="' + seed + '" data-try="0" style="--ar:' + RATIOS[s.aspect][0] + "/" + RATIOS[s.aspect][1] + '" onclick="PHR_IMG.zoom(this)"><div class="sh"></div><div class="st">CREATING…</div></div>';
  }

  function html(src) {
    css();
    var j = parse(src);
    if (!j) return '<div class="im-card"><div class="im-top"><span>✦ IMAGE</span><em>composing prompt…</em></div><div class="im-grid"><div class="im-cell" style="--ar:1"><div class="sh"></div><div class="st">WRITING THE PROMPT…</div></div></div><div style="height:12px"></div></div>';
    var s = norm(j), id = "im" + (++uid) + "_" + Date.now().toString(36);
    ST[id] = { s: s, seeds: [s.seed], n: 1 };
    setTimeout(function () { paintAll(id) }, 30);
    return '<div class="im-card" id="' + id + '" data-id="' + id + '"><div class="im-top"><span>✦ IMAGE</span><em class="im-meta">' + esc(STYLES[s.style][0]) + " · " + s.aspect + '</em></div><div class="im-grid" id="' + id + '-g">' + cellHTML(id, s.seed, s) + "</div>" +
      '<div class="im-chips">' + chips(Object.keys(STYLES).map(function (k) { return [k, STYLES[k][0]] }), s.style, "style") + "</div>" +
      '<div class="im-chips">' + chips(Object.keys(RATIOS).map(function (k) { return [k, k] }), s.aspect, "aspect") + "</div>" +
      '<div class="im-acts"><button type="button" onclick="PHR_IMG.more(this)">↻ Variation</button><button type="button" onclick="PHR_IMG.edit(this)">✎ Edit prompt</button><button type="button" onclick="PHR_IMG.save(this)">⇩ Save</button><button type="button" onclick="PHR_IMG.copy(this)">⧉ Prompt</button></div>' +
      '<div class="im-edit" id="' + id + '-e"><textarea dir="auto" spellcheck="false">' + esc(s.prompt) + '</textarea><button type="button" onclick="PHR_IMG.apply(this)">Generate again</button></div></div>';
  }
  function root(el) { return el.closest ? el.closest(".im-card") : null }
  function paintAll(id) {
    var card = D.getElementById(id), st = ST[id]; if (!card || !st) return;
    var cells = card.querySelectorAll(".im-cell");
    [].forEach.call(cells, function (c, i) { load(c, id, st.seeds[i] || st.seeds[0], 0) });
    var g = card.querySelector(".im-grid"); g.className = "im-grid" + (cells.length > 1 ? " two" : "");
    var m = card.querySelector(".im-meta"); if (m) m.textContent = STYLES[st.s.style][0] + " · " + st.s.aspect;
  }
  var MODELS = ["flux", "turbo", ""];
  function load(cell, id, seed, attempt) {
    var st = ST[id]; if (!st) return;
    cell.classList.remove("ok", "bad"); cell.dataset.seed = seed; cell.querySelector(".st").textContent = attempt ? "RETRYING…" : "CREATING…";
    var old = cell.querySelector("img"); if (old) old.remove();
    cell.style.setProperty("--ar", RATIOS[st.s.aspect][0] + "/" + RATIOS[st.s.aspect][1]);
    var img = new Image(); img.alt = st.s.prompt; img.decoding = "async"; img.crossOrigin = "anonymous";
    var ver = (cell._ver = (cell._ver || 0) + 1);
    img.onload = function () { if (cell._ver !== ver) return; cell.classList.add("ok"); cell.dataset.url = img.src };
    img.onerror = function () {
      if (cell._ver !== ver) return;
      if (attempt < 2) { setTimeout(function () { if (cell._ver === ver) load(cell, id, seed, attempt + 1) }, 1800); return }
      cell.classList.add("bad"); cell.querySelector(".st").textContent = "FAILED · TAP ↻ TO TRY AGAIN";
    };
    cell.appendChild(img);
    var key = (LSget("phr_img_key") || "").trim();
    if (key) {
      /* optional personal API key: unlocks the watermark-free endpoint; falls back to the free one if anything fails */
      var full = st.s.prompt + STYLES[st.s.style][1], r = RATIOS[st.s.aspect];
      fetch("https://gen.pollinations.ai/image/" + encodeURIComponent(full) + "?width=" + r[0] + "&height=" + r[1] + "&seed=" + seed + "&model=flux&nologo=true", { headers: { Authorization: "Bearer " + key } })
        .then(function (res) { if (!res.ok) throw 0; return res.blob() })
        .then(function (bl) { if (cell._ver === ver) img.src = URL.createObjectURL(bl) })
        .catch(function () { if (cell._ver === ver) img.src = url(st.s, seed, MODELS[attempt] || "") });
    } else img.src = url(st.s, seed, MODELS[attempt] || "");
  }
  function cardOf(el) { var c = root(el); return c ? { c: c, id: c.dataset.id, st: ST[c.dataset.id] } : null }

  var API = {
    html: html,
    pick: function (b) {
      var o = cardOf(b); if (!o || !o.st) return; var k = b.dataset.k, v = b.dataset.v;
      o.st.s[k] = v; [].forEach.call(b.parentNode.children, function (x) { x.classList.toggle("on", x === b) });
      paintAll(o.id);
    },
    more: function (b) {
      var o = cardOf(b); if (!o || !o.st) return;
      if (o.st.seeds.length >= 4) { o.st.seeds = [o.st.seeds[0]]; o.c.querySelector(".im-grid").innerHTML = cellHTML(o.id, o.st.seeds[0], o.st.s) }
      var seed = Math.floor(Math.random() * 99998) + 1; o.st.seeds.push(seed);
      var g = o.c.querySelector(".im-grid"); g.insertAdjacentHTML("beforeend", cellHTML(o.id, seed, o.st.s));
      g.className = "im-grid two"; load(g.lastElementChild, o.id, seed, 0);
    },
    edit: function (b) { var o = cardOf(b); if (!o) return; var e = D.getElementById(o.id + "-e"); e.classList.toggle("on"); if (e.classList.contains("on")) { var t = e.querySelector("textarea"); setTimeout(function () { try { t.focus() } catch (x) { } }, 60) } },
    apply: function (b) { var o = cardOf(b); if (!o || !o.st) return; var t = o.c.querySelector(".im-edit textarea").value.trim(); if (!t) return; o.st.s.prompt = t.slice(0, 900); o.st.seeds = [Math.floor(Math.random() * 99998) + 1]; o.c.querySelector(".im-grid").innerHTML = cellHTML(o.id, o.st.seeds[0], o.st.s); o.c.querySelector(".im-edit").classList.remove("on"); paintAll(o.id) },
    copy: function (b) { var o = cardOf(b); if (!o || !o.st) return; var t = o.st.s.prompt + STYLES[o.st.s.style][1]; try { navigator.clipboard.writeText(t); toast("Prompt copied") } catch (e) { toast("Couldn't copy") } },
    zoom: function (cell) { var u = cell.dataset.url; if (u && typeof W.openLightbox === "function") W.openLightbox(u) },
    save: function (b) {
      var o = cardOf(b); if (!o) return; var cell = o.c.querySelector(".im-cell.ok"); if (!cell) { toast("Wait for the image first"); return }
      var u = cell.dataset.url;
      fetch(u).then(function (r) { return r.blob() }).then(function (bl) {
        var a = D.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "phraortes-image.png"; D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href) }, 4000);
      }).catch(function () { if (typeof W.openLightbox === "function") W.openLightbox(u); toast("Press and hold the image to save it") });
    },
    /* /imagine <text>: no AI round trip */
    direct: function (aiId, chat, dispHtml, txt, idx) {
      var raw = String(txt || "").replace(/^\/imagine\s*/i, "").trim() || "a futuristic city at dusk, glowing neon, cinematic";
      var style = "auto", aspect = "1:1", p = raw, L = raw.toLowerCase();
      var sm = { photo: /\b(photo|photograph|realistic)\b/, cinematic: /\bcinematic\b/, anime: /\banime\b/, "3d": /\b3d\b/, watercolor: /\bwatercolou?r\b/, logo: /\blogo\b/, pixel: /\bpixel/, sketch: /\bsketch\b/, illustration: /\billustration\b/ };
      Object.keys(sm).some(function (k) { if (sm[k].test(L)) { style = k; return true } });
      if (/\b(wide|landscape|16:9|wallpaper)\b/.test(L)) aspect = "16:9"; else if (/\b(story|vertical|9:16|phone wallpaper)\b/.test(L)) aspect = "9:16"; else if (/\b(portrait|4:5|poster)\b/.test(L)) aspect = "4:5";
      var fence = "```imagine\n" + JSON.stringify({ prompt: p, style: style, aspect: aspect }) + "\n```";
      try { finishTurn(aiId, renderMD(fence), fence, chat, dispHtml, txt, idx) } catch (e) { if (typeof W.animImgLoader === "function") W.animImgLoader(aiId, chat, dispHtml, txt, idx) }
    },
    prompt: function () {
      return "\n\nIMAGE CREATION: you CAN create images. When the user asks you to make, generate, draw (as a picture), design or illustrate an image, photo, poster, wallpaper, avatar, logo or artwork, reply with one short friendly line in THEIR language, then exactly one fenced block: ```imagine\n{\"prompt\":\"<rich ENGLISH description: subject, setting, composition, lighting, mood, lens/medium, colours, details; 40-90 words; no text inside the image unless asked>\",\"style\":\"auto|photo|cinematic|anime|3d|illustration|watercolor|logo|pixel|sketch\",\"aspect\":\"1:1|4:5|3:2|16:9|9:16\"}\n```. Pick the style and aspect that fit the request (wallpaper for phone = 9:16, banner = 16:9, avatar = 1:1). Always translate the idea to English in the prompt, whatever language the user wrote. This OVERRIDES any rule about SVG: whenever the user asks you to draw, paint, illustrate, sketch or render a subject (a house, animal, person, character, scene, object, art, \"نقاشی\"), produce this image block, never SVG and never a childish drawing. For draw/paint requests choose style 3d (or cinematic/photo/illustration when the user implies it) and write a premium prompt: precise subject, materials, camera angle, professional lighting, depth, background, colour palette, \"ultra detailed, sharp focus, 4k\". Never say you cannot create images. For a logo or flat vector, use style logo. Do not describe the picture again after the block.";
    }
  };
  function toast(t) { try { if (typeof W.showToast === "function") W.showToast(t, "info") } catch (e) { } }
  W.PHR_IMG = API;

  /* teach the model about the fence (rides on the agent prompt) */
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__img) return false; A.__img = true;
    var oP = A.prompt; A.prompt = function (t) { return oP(t) + API.prompt() };
    return true;
  }
  (function wait(n) { if (!install() && n < 120) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
