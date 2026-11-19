/* Phraortes — Gateway (gateway.js)
   Lets the app reach its API through more than one address, so users where one address is blocked or throttled
   (e.g. *.workers.dev in Iran) still get through without a VPN.
   • Every request to the primary Worker is tried on the best reachable address first, then on the others.
   • On start it quietly probes all addresses (no server change needed) and remembers the fastest one.
   • Add your own addresses to MIRRORS below (same Worker deployed behind a custom domain, a second account, etc.). */
(function () {
  "use strict";
  var W = window;
  var PRIMARY = "https://phraortes-api.esmaeilimatin20.workers.dev";
  /* ▼ ADD YOUR ADDRESSES HERE, e.g. "https://api.yourdomain.com" — no trailing slash ▼ */
  var MIRRORS = [
  ];
  var LSK = "phr_gw_best";
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
  var extra = []; try { extra = JSON.parse(LS("phr_gw_extra") || "[]") } catch (e) { }
  var ALL = [PRIMARY].concat(MIRRORS, extra).filter(function (u, i, a) { return u && a.indexOf(u) === i }).map(function (u) { return String(u).replace(/\/+$/, "") });
  var _fetch = W.fetch.bind(W);
  var best = LS(LSK); if (ALL.indexOf(best) < 0) best = PRIMARY;
  var probing = null, bad = {};

  function isApi(u) { for (var i = 0; i < ALL.length; i++) if (u.indexOf(ALL[i] + "/") === 0 || u === ALL[i]) return ALL[i]; return null }
  function order() { return [best].concat(ALL.filter(function (b) { return b !== best && !bad[b] }), ALL.filter(function (b) { return b !== best && bad[b] })).filter(function (x, i, a) { return a.indexOf(x) === i }) }

  /* reachability probe: a no-cors GET resolves for ANY HTTP answer (even 404) and rejects only when the address can't be reached */
  function ping(base, ms) {
    return new Promise(function (res, rej) {
      var c = new AbortController(), t = setTimeout(function () { c.abort(); rej(0) }, ms), t0 = Date.now();
      _fetch(base + "/?p=" + t0, { mode: "no-cors", cache: "no-store", signal: c.signal }).then(function () { clearTimeout(t); res(Date.now() - t0) }, function () { clearTimeout(t); rej(0) });
    });
  }
  function probe() {
    if (ALL.length < 2) return Promise.resolve(best);
    if (probing) return probing;
    probing = new Promise(function (done) {
      var left = ALL.length, won = false;
      ALL.forEach(function (b) {
        ping(b, 5000).then(function () { bad[b] = false; if (!won) { won = true; best = b; LS(LSK, b); done(b) } }, function () { bad[b] = true; if (--left === 0 && !won) done(best) });
      });
    }).then(function (b) { setTimeout(function () { probing = null }, 60000); return b });
    return probing;
  }

  W.fetch = function (input, init) {
    var u = typeof input === "string" ? input : (input && input.url) || "", base = ALL.length > 1 ? isApi(u) : null;
    if (!base) return _fetch(input, init);
    var path = u.slice(base.length), sig = init && init.signal;
    return Promise.resolve(probing || (bad[best] === undefined ? probe() : null)).then(function () {
      var list = order(), i = 0;
      function next(err) {
        if (i >= list.length) throw err;
        var b = list[i++];
        return _fetch(b + path, init).then(function (r) { if (b !== best && r) { best = b; LS(LSK, b) } bad[b] = false; return r }, function (e) {
          if ((sig && sig.aborted) || (e && e.name === "AbortError")) throw e;
          bad[b] = true; return next(e);
        });
      }
      return next(new TypeError("Network error"));
    });
  };

  W.PHR_GATEWAY = { all: function () { return ALL.slice() }, best: function () { return best }, probe: function () { probing = null; return probe() }, add: function (u) { u = String(u || "").replace(/\/+$/, ""); if (/^https:\/\/[^\s/]+$/.test(u) && ALL.indexOf(u) < 0) { ALL.push(u); extra.push(u); LS("phr_gw_extra", JSON.stringify(extra)); return true } return false } };
  if (ALL.length > 1) setTimeout(probe, 300);
  W.addEventListener("online", function () { probing = null; probe() });
})();
