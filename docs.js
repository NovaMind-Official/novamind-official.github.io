/* Phraortes documents & images: shrink photos before sending, and read scanned PDFs by rendering pages as images. */
(function () {
  "use strict";
  window.phrShrink = function (dataURL, max) {
    max = max || 1568;
    return new Promise(function (res) {
      try {
        var im = new Image();
        im.onload = function () {
          try {
            var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, max / Math.max(w, h));
            if (k >= 1 && dataURL.length < 900000) return res(dataURL);
            var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
            var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
            res(c.toDataURL("image/jpeg", .86));
          } catch (e) { res(dataURL); }
        };
        im.onerror = function () { res(dataURL); }; im.src = dataURL;
      } catch (e) { res(dataURL); }
    });
  };
  window.PHR_pdfImages = async function (file, max, from) {
    var buf = await file.arrayBuffer(), pdf = await pdfjsLib.getDocument({ data: buf }).promise, out = [], n = Math.min(pdf.numPages, (from || 1) + (max || 4) - 1);
    for (var p = from || 1; p <= n; p++) {
      var page = await pdf.getPage(p), vp = page.getViewport({ scale: 1 }), k = Math.min(2, 1200 / vp.width), v = page.getViewport({ scale: k });
      var c = document.createElement("canvas"); c.width = Math.round(v.width); c.height = Math.round(v.height); var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: v }).promise; out.push(c.toDataURL("image/jpeg", .82));
    }
    return { images: out, pages: pdf.numPages };
  };
  // called after text extraction; scanned / image-only PDFs have almost no text, so attach the first pages as images
  window.PHR_pdfScan = function (file, text) {
    var sparse = String(text || "").replace(/\s+/g, "").length < 250;
    if (!sparse) return;
    window.PHR_pdfImages(file, 4).then(function (r) {
      if (!r.images.length || typeof attachedFiles === "undefined") return;
      r.images.forEach(function (d, i) { attachedFiles.push({ id: "pg" + Date.now() + i, file: null, type: "image", name: file.name + " p" + (i + 1), size: Math.round(d.length * .75 / 1024) + " KB", dataURL: d }); });
      if (typeof renderPreviews === "function") renderPreviews();
      if (typeof showToast === "function") showToast("Scanned PDF: attached " + r.images.length + " page image" + (r.images.length > 1 ? "s" : "") + (r.pages > r.images.length ? " of " + r.pages : ""));
    }).catch(function () {});
  };
})();
