/* Phraortes — Council (council.js)
   "council: should I price my template at 900k or 1.5M?"  /  «شورا: ...»
   Instead of one voice, four minds with OPPOSED lenses answer the same question, then a judge shows where they
   agree, where they truly clash, and what to do. The AI answers with a ```council JSON fence; this file renders it
   as a round table: tap a seat to hear that mind, tap "Let them argue" for a rebuttal round. */
(function () {
  "use strict";
  var W = window, D = document;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  var COL = ["#7cc4ff", "#ff8a7a", "#b9f27c", "#e8c468", "#c79bff"];
  var ST = { for: ["YES", "#7be3a6"], against: ["NO", "#ff7a7a"], mixed: ["IT DEPENDS", "#ffc35f"] };

  function css() {
    if (D.getElementById("cn-css")) return;
    var s = D.createElement("style"); s.id = "cn-css";
    s.textContent = [
      ".cn{margin:14px 0;max-width:560px;border-radius:24px;overflow:hidden;border:1px solid rgba(232,196,104,.28);background:radial-gradient(120% 80% at 50% 0%,#201a0e 0%,#0d0b08 62%);box-shadow:0 16px 44px rgba(0,0,0,.5);color:#f1ece0;font-family:-apple-system,system-ui,sans-serif}",
      ".cn-h{padding:15px 16px 0}",
      ".cn-k{font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;color:#e8c468}",
      ".cn-q{margin-top:8px;font-size:16px;font-weight:700;line-height:1.35;word-break:break-word}",
      ".cn-t{position:relative;height:300px;margin:6px 0 0}",
      ".cn-t svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}",
      ".cn-seat{position:absolute;width:74px;margin:-30px 0 0 -37px;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .25s cubic-bezier(.2,1,.3,1),opacity .25s}",
      ".cn-seat i{display:block;width:46px;height:46px;margin:0 auto;border-radius:50%;font:700 19px/42px Georgia,serif;font-style:normal;color:#0d0b08;border:2px solid transparent;box-shadow:0 0 0 0 transparent;transition:box-shadow .3s}",
      ".cn-seat b{display:block;margin-top:5px;font-size:11px;font-weight:650;line-height:1.15;color:#d9d2c0;word-break:break-word}",
      ".cn-seat em{display:inline-block;margin-top:3px;font:700 8.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;font-style:normal}",
      ".cn-seat.on{transform:scale(1.1)}.cn-seat.on i{box-shadow:0 0 0 4px rgba(255,255,255,.14),0 0 22px currentColor}.cn.has .cn-seat:not(.on){opacity:.55}",
      ".cn-core{position:absolute;left:50%;top:50%;width:70px;margin:-24px 0 0 -35px;text-align:center;font:700 22px/1 ui-monospace,Menlo,monospace;color:#e8c468;pointer-events:none}",
      ".cn-core small{display:block;margin-top:4px;font-size:8.5px;letter-spacing:.16em;color:#9b9078}",
      ".cn-say{display:none;margin:0 14px 12px;padding:13px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);animation:cnIn .3s ease}",
      ".cn-say.on{display:block}@keyframes cnIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
      ".cn-say .who{font:700 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em}",
      ".cn-say p{margin:8px 0 0;font-size:14px;line-height:1.55;color:#ece6d6;word-break:break-word}",
      ".cn-say .bet{margin-top:9px;padding-top:9px;border-top:1px dashed rgba(255,255,255,.14);font-size:12.5px;line-height:1.5;color:#b9b19a}",
      ".cn-say .bet em{font:700 9.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#e8c468;font-style:normal;margin-right:6px}",
      ".cn-hint{margin:0 14px 12px;font-size:11.5px;color:#8f866f;text-align:center}.cn.has .cn-hint{display:none}",
      ".cn-c{padding:12px 16px;border-top:1px solid rgba(232,196,104,.14)}",
      ".cn-c h5{margin:0 0 8px;font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;color:#ff9a8a}",
      ".cn-cl{display:flex;gap:9px;align-items:flex-start;margin-top:8px;font-size:13.2px;line-height:1.5;color:#dcd5c3;word-break:break-word}",
      ".cn-cl s{flex:none;display:flex;margin-top:3px;text-decoration:none}.cn-cl s u{width:9px;height:9px;border-radius:50%;margin-right:-2px;border:1.5px solid #0d0b08;text-decoration:none}",
      ".cn-v{padding:14px 16px;border-top:1px solid rgba(232,196,104,.2);background:rgba(232,196,104,.05)}",
      ".cn-v .m{display:flex;align-items:center;gap:10px;font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#e8c468}",
      ".cn-v .m span{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}.cn-v .m span i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#ff8a7a,#e8c468,#7be3a6);transition:width 1s cubic-bezier(.2,1,.3,1)}",
      ".cn-v p{margin:11px 0 0;font-size:14.5px;line-height:1.55;font-weight:600;word-break:break-word}",
      ".cn-v .act{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(123,227,166,.08);border:1px solid rgba(123,227,166,.25);font-size:13px;line-height:1.45;color:#c4f3d8}.cn-v .act em{display:block;margin-bottom:3px;font:700 9.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#7be3a6;font-style:normal}",
      ".cn-b{display:flex;gap:8px;padding:0 16px 16px}",
      ".cn-b button{flex:1;border:0;border-radius:13px;padding:12px 8px;font:700 13px/1 -apple-system,system-ui,sans-serif;cursor:pointer}.cn-b button:active{transform:scale(.98)}",
      ".cn-b .a{background:linear-gradient(135deg,#e8c468,#c9983a);color:#17120a}.cn-b .b{background:rgba(255,255,255,.09);color:#f1ece0}",
      "#cn-sheet{position:fixed;inset:0;z-index:9700;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}#cn-sheet.on{display:flex}",
      "#cn-sheet .s{width:100%;max-width:560px;box-sizing:border-box;padding:18px 18px calc(18px + env(safe-area-inset-bottom));border-radius:26px 26px 0 0;background:linear-gradient(180deg,#1d170c,#0c0a07);border:1px solid rgba(232,196,104,.3);border-bottom:0;color:#f1ece0;font-family:-apple-system,system-ui,sans-serif}",
      "#cn-sheet h4{margin:0;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;color:#e8c468}#cn-sheet p{margin:8px 0 12px;font-size:14px;line-height:1.5;color:#cfc7b0}",
      "#cn-sheet textarea{width:100%;box-sizing:border-box;min-height:96px;border-radius:14px;border:1px solid rgba(232,196,104,.3);background:rgba(0,0,0,.35);color:#fff;padding:12px 14px;font:16px/1.45 -apple-system,system-ui,sans-serif;resize:none}",
      "#cn-sheet .row{display:flex;gap:8px;margin-top:12px}#cn-sheet .row button{flex:1;border:0;border-radius:13px;padding:13px;font:700 14px/1 -apple-system,system-ui,sans-serif;cursor:pointer}",
      "#cn-sheet .go{background:linear-gradient(135deg,#e8c468,#c9983a);color:#17120a}#cn-sheet .no{background:rgba(255,255,255,.1);color:#fff}",
      "body.light-theme .cn{background:linear-gradient(180deg,#fbf6e8,#f3ead2);color:#2b2412;border-color:rgba(160,120,30,.35)}body.light-theme .cn-say p,body.light-theme .cn-cl,body.light-theme .cn-seat b{color:#2b2412}body.light-theme .cn-say{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.1)}"
    ].join("\n");
    D.head.appendChild(s);
  }

  function parse(src) {
    var t = String(src || "").trim(), j = null;
    try { j = JSON.parse(t) } catch (e) { var m = /\{[\s\S]*\}/.exec(t); if (m) { try { j = JSON.parse(m[0]) } catch (e2) { } } }
    if (!j || typeof j !== "object" || !Array.isArray(j.minds)) return null;
    j.minds = j.minds.filter(function (x) { return x && x.name && x.take }).slice(0, 5);
    return j.minds.length >= 2 ? j : null;
  }
  function html(src) {
    css();
    var j = parse(src); if (!j) return '<pre class="cn-raw">' + esc(src) + "</pre>";
    var n = j.minds.length, W0 = 100, cx = 50, cy = 50, rx = 34, ry = 31, seats = "", ring = "";
    j.minds.forEach(function (m, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), c = COL[i % COL.length], st = ST[String(m.stance).toLowerCase()] || ST.mixed;
      m.id = m.id || ("m" + i);
      seats += '<div class="cn-seat" data-i="' + i + '" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%" onclick="PHR_COUNCIL.pick(this)"><i style="background:' + c + ";color:#0d0b08;" + '">' + esc(String(m.name).replace(/^the\s+/i, "").charAt(0).toUpperCase()) + "</i><b>" + esc(m.name) + '</b><em style="color:' + st[1] + '">' + st[0] + "</em></div>";
      ring += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + c + '" stroke-opacity=".35" stroke-width=".5" stroke-dasharray="1.2 1.2" vector-effect="non-scaling-stroke"/>';
    });
    var ag = Math.max(0, Math.min(100, Math.round(+j.agree || 0)));
    var clash = (Array.isArray(j.clash) ? j.clash : []).slice(0, 3).map(function (c) {
      var dots = (Array.isArray(c.between) ? c.between : []).map(function (id) { var k = j.minds.findIndex(function (m) { return m.id === id || m.name === id }); return k < 0 ? "" : '<u style="background:' + COL[k % COL.length] + '"></u>' }).join("");
      return '<div class="cn-cl"><s>' + dots + '</s><span dir="auto">' + esc(c.over || c) + "</span></div>";
    }).join("");
    return '<div class="cn" data-j="' + encodeURIComponent(JSON.stringify(j)) + '"><div class="cn-h"><div class="cn-k">THE COUNCIL · ' + n + ' MINDS</div><div class="cn-q" dir="auto">' + esc(j.q || j.title || "") + "</div></div>" +
      '<div class="cn-t"><svg viewBox="0 0 100 100" preserveAspectRatio="none">' + ring + '</svg><div class="cn-core">' + ag + '%<small>AGREE</small></div>' + seats + "</div>" +
      '<div class="cn-hint">Tap a seat to hear that mind</div><div class="cn-say"></div>' +
      (clash ? '<div class="cn-c"><h5>WHERE THEY TRULY CLASH</h5>' + clash + "</div>" : "") +
      '<div class="cn-v"><div class="m">CONSENSUS<span><i style="width:' + ag + '%"></i></span>' + ag + '%</div>' + (j.verdict ? '<p dir="auto">' + esc(j.verdict) + "</p>" : "") + (j.action ? '<div class="act" dir="auto"><em>DO THIS NEXT</em>' + esc(j.action) + "</div>" : "") + "</div>" +
      '<div class="cn-b"><button type="button" class="a" onclick="PHR_COUNCIL.argue(this)">Let them argue</button><button type="button" class="b" onclick="PHR_COUNCIL.again(this)">New question</button></div></div>';
  }
  function data(b) { var c = b.closest(".cn"); try { return c ? JSON.parse(decodeURIComponent(c.dataset.j)) : null } catch (e) { return null } }
  function pick(el) {
    var c = el.closest(".cn"), j = data(el), i = +el.dataset.i, m = j && j.minds[i], box = c && c.querySelector(".cn-say"); if (!m || !box) return;
    var was = el.classList.contains("on");
    [].forEach.call(c.querySelectorAll(".cn-seat"), function (s) { s.classList.remove("on") });
    if (was) { box.classList.remove("on"); c.classList.remove("has"); return }
    el.classList.add("on"); c.classList.add("has");
    var col = COL[i % COL.length], st = ST[String(m.stance).toLowerCase()] || ST.mixed;
    box.innerHTML = '<div class="who" style="color:' + col + '">' + esc(String(m.name).toUpperCase()) + ' · <span style="color:' + st[1] + '">' + st[0] + '</span></div><p dir="auto">' + esc(m.take) + "</p>" + (m.bet ? '<div class="bet" dir="auto"><em>WOULD DO</em>' + esc(m.bet) + "</div>" : "");
    box.classList.add("on");
  }

  var sheet;
  function ask(pre) {
    css();
    if (!sheet) {
      sheet = D.createElement("div"); sheet.id = "cn-sheet";
      sheet.innerHTML = '<div class="s"><h4>THE COUNCIL</h4><p>Ask a decision or a hard question. Four minds with opposing lenses will answer, then show where they truly disagree.</p><textarea id="cn-q" placeholder="e.g. Should I raise my template price to 1.5M?"></textarea><div class="row"><button class="no" onclick="PHR_COUNCIL.close()">Cancel</button><button class="go" onclick="PHR_COUNCIL.go()">Convene</button></div></div>';
      sheet.addEventListener("click", function (e) { if (e.target === sheet) close() });
      D.body.appendChild(sheet);
    }
    setTimeout(function () { sheet.classList.add("on"); var q = D.getElementById("cn-q"); if (q) { q.value = typeof pre === "string" ? pre : ""; setTimeout(function () { try { q.focus() } catch (e) { } }, 200) } }, 50);
  }
  function close() { if (sheet) sheet.classList.remove("on") }
  function go() { var q = D.getElementById("cn-q"), t = q ? q.value.trim() : ""; if (t.length < 4) return; close(); start(t) }
  function start(t, extra) { W.__phrCN = Date.now(); try { return W.PHR_sendText("Council: " + t + (extra || "")) } catch (e) { return false } }

  function prompt(text) {
    var on = (W.__phrCN && Date.now() - W.__phrCN < 120000) || /^\s*(?:council|\/council|شورا)\b/i.test(String(text || "")); if (!on) return "";
    return "\n\nCOUNCIL: the user wants a question or decision examined by a council. Reply with ONE short line in THEIR language, then exactly one fenced block: ```council\n{\"q\":\"the question, restated short\",\"minds\":[{\"id\":\"slug\",\"name\":\"The Skeptic\",\"stance\":\"for|against|mixed\",\"take\":\"max 45 words, first person, concrete, in THEIR language\",\"bet\":\"the one thing this mind would actually do\"}],\"clash\":[{\"between\":[\"id1\",\"id2\"],\"over\":\"the real point they disagree on, one sentence\"}],\"agree\":0-100 how much the minds agree,\"verdict\":\"your judgement as the judge, 1-2 sentences, take a side\",\"action\":\"one concrete step for today\"}\n``` Use exactly 4 minds with genuinely OPPOSED lenses chosen for THIS question (e.g. The Builder who wants to act, The Skeptic who hunts the flaw, The Realist who counts money/time/risk, The Outsider with a fresh angle; for study questions use Teacher, Examiner, Beginner, Expert). They must disagree for real: at least one 'for' and one 'against' unless the question is factual. No filler or hedging; each take must contain a specific fact, number or consequence. If the user's message asks for a rebuttal round, each mind must answer the others by name and may change its stance. Valid JSON only.";
  }

  W.PHR_COUNCIL = {
    html: html, ask: ask, close: close, go: go, start: start, prompt: prompt, pick: pick,
    argue: function (b) { var j = data(b); if (!j) return; start(j.q || "", " — ROUND 2: let the minds rebut each other by name; if any changes its mind, say so.") },
    again: function () { ask("") }
  };

  var RX = /^(?:please |hey |ok )?(?:\/?council|convene the council|ask the council|شورا)(?: about| on| for)?\s*[:\-–—،]?\s*(.*)$/i;
  function handle(raw) {
    var t = String(raw || "").trim().replace(/\s+/g, " "), m = RX.exec(t); if (!m || (/^Council:/i.test(t) && W.__phrCN && Date.now() - W.__phrCN < 4000)) return false;
    var body = (m[1] || "").trim(), fa = /[؀-ۿ]/.test(t);
    if (body.length >= 4) { start(body); return fa ? "شورا را تشکیل می‌دهم." : "Convening the council." }
    ask(""); return fa ? "سؤالت را بگو." : "What should the council weigh?";
  }
  function install() {
    var A = W.PHR_AGENT; if (!A || A.__cn) return false; A.__cn = true;
    var oT = A.typed, oV = A.voice, oP = A.prompt;
    A.typed = function (t) { var r; try { r = handle(t) } catch (e) { r = false } return r || oT(t) };
    A.voice = function (t, quiet) { var r; try { r = handle(t) } catch (e) { r = false } if (r) return r; return oV(t, quiet) };
    A.prompt = function (t) { return oP(t) + prompt(t) };
    return true;
  }
  (function wait(n) { if (!install() && n < 120) setTimeout(function () { wait(n + 1) }, 150) })(0);
})();
