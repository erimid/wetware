// Wetware — paint: textures, invented script, emblems, portraits and icons, all drawn in code
'use strict';
(function () {
  var P = W.paint = {};
  var INK = '#0c0e14';
  P.FACTION = {
    orrin: { name: 'Orrin Mechanica', short: 'Orrin', col: '#f2b824', dark: '#6b4a08', contact: 'Colonel Vey Tarn', key: 'orrin' },
    ninefold: { name: 'Saint Ninefold', short: 'Ninefold', col: '#49d3ff', dark: '#0c4a66', contact: 'Sister Static', key: 'ninefold' },
    quiet: { name: 'Quietwater Pharmaceutical', short: 'Quietwater', col: '#8fe04a', dark: '#2d5a12', contact: 'Dr. Lune Asp', key: 'quiet' },
    halcyon: { name: 'Halcyon Optics', short: 'Halcyon', col: '#ff4058', dark: '#6e0f1e', contact: 'Iris Vale', key: 'halcyon' }
  };
  P.FKEYS = ['orrin', 'ninefold', 'quiet', 'halcyon'];

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  P.canvas = canvas;

  // ---------- brush texture (R mottle, G dry-brush hatch, B speckle), tileable ----------
  P.makeBrush = function () {
    var S = 512, rng = W.makeRng(4242);
    function layer(fn, base) {
      var c = canvas(S, S), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, S, S);
      fn(x, function (draw) { for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) { x.save(); x.translate(ox * S, oy * S); draw(); x.restore(); } });
      return x.getImageData(0, 0, S, S).data;
    }
    var R = layer(function (x, tile) {
      for (var i = 0; i < 260; i++) (function () {
        var px = rng() * S, py = rng() * S, r = 18 + rng() * 80, a = 0.05 + rng() * 0.13, v = rng() < 0.5 ? 255 : 0;
        tile(function () { var g = x.createRadialGradient(px, py, r * 0.2, px, py, r); g.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'); g.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); });
      })();
      for (i = 0; i < 380; i++) (function () {
        var px = rng() * S, py = rng() * S, w = 14 + rng() * 60, h = 5 + rng() * 16, rot = rng() * 3.14, a = 0.06 + rng() * 0.14, v = rng() < 0.5 ? 255 : 0;
        tile(function () { x.save(); x.translate(px, py); x.rotate(rot); x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'; x.beginPath(); x.moveTo(-w / 2, -h / 2); x.quadraticCurveTo(0, -h * 0.9, w / 2, -h / 3); x.lineTo(w / 2 - 3, h / 2); x.quadraticCurveTo(0, h * 0.7, -w / 2 + 2, h / 2); x.fill(); x.restore(); });
      })();
    }, '#808080');
    var Gc = layer(function (x, tile) {
      x.lineCap = 'round';
      for (var i = 0; i < 1500; i++) (function () {
        var px = rng() * S, py = rng() * S, len = 24 + rng() * 110, ang = -0.6 + (rng() - 0.5) * 0.5, lw = 0.8 + rng() * 2.6, a = 0.2 + rng() * 0.5, v = rng() < 0.62 ? 255 : 0;
        tile(function () { x.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'; x.lineWidth = lw; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); x.stroke(); });
      })();
    }, '#6a6a6a');
    var c = canvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    for (var i = 0; i < S * S; i++) {
      d[i * 4] = R[i * 4]; d[i * 4 + 1] = Gc[i * 4];
      var sp = rng(); d[i * 4 + 2] = Math.floor((sp * sp * 0.5 + rng() * 0.5) * 255); d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
    t.colorSpace = THREE.NoColorSpace;
    return t;
  };

  // ---------- invented script ----------
  var GLY = [];
  (function () {
    var rng = W.makeRng(31337);
    for (var g = 0; g < 28; g++) {
      var strokes = [], n = 2 + Math.floor(rng() * 3);
      for (var s = 0; s < n; s++) {
        var k = Math.floor(rng() * 6);
        strokes.push([k, Math.floor(rng() * 3) / 2, Math.floor(rng() * 4) / 3, Math.floor(rng() * 3) / 2, Math.floor(rng() * 4) / 3, rng()]);
      }
      GLY.push(strokes);
    }
  })();
  P.glyph = function (x, idx, gx, gy, h, col, lw) {
    var w = h * 0.55, st = GLY[idx % GLY.length];
    x.strokeStyle = col; x.fillStyle = col; x.lineWidth = lw || Math.max(1.5, h * 0.13); x.lineCap = 'round'; x.lineJoin = 'round';
    for (var i = 0; i < st.length; i++) {
      var s = st[i], ax = gx + s[1] * w, ay = gy + s[2] * h, bx = gx + s[3] * w, by = gy + s[4] * h;
      x.beginPath();
      if (s[0] === 0) { x.moveTo(ax, gy); x.lineTo(ax, gy + h); }
      else if (s[0] === 1) { x.moveTo(gx, ay); x.lineTo(gx + w, ay); }
      else if (s[0] === 2) { x.moveTo(ax, ay); x.lineTo(bx, by); }
      else if (s[0] === 3) { x.arc(gx + w / 2, ay, w / 2, s[5] > 0.5 ? 0 : Math.PI, s[5] > 0.5 ? Math.PI : Math.PI * 2); }
      else if (s[0] === 4) { x.arc(ax, ay, Math.max(1, h * 0.07), 0, 7); x.fill(); continue; }
      else { x.moveTo(ax, gy); x.quadraticCurveTo(gx + w * 1.1, gy + h * 0.5, bx, gy + h); }
      x.stroke();
    }
    return w;
  };
  P.script = function (x, seed, gx, gy, h, col, count, lw) {
    var rng = W.makeRng(W.hash(seed)), cx = gx;
    for (var i = 0; i < count; i++) {
      if (i > 0 && rng() < 0.22) { cx += h * 0.45; }
      cx += P.glyph(x, Math.floor(rng() * 28), cx, gy, h, col, lw) + h * 0.28;
    }
    return cx - gx;
  };

  // ---------- emblems ----------
  P.emblem = function (x, key, cx, cy, r, col, bg) {
    x.save(); x.translate(cx, cy); x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = col; x.fillStyle = col; x.lineWidth = r * 0.16;
    if (key === 'orrin') { // piston chevron in a toothed ring
      for (var i = 0; i < 8; i++) { x.save(); x.rotate(i * Math.PI / 4); x.fillRect(-r * 0.13, -r * 1.0, r * 0.26, r * 0.28); x.restore(); }
      x.beginPath(); x.arc(0, 0, r * 0.74, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(-r * 0.4, r * 0.25); x.lineTo(0, -r * 0.3); x.lineTo(r * 0.4, r * 0.25); x.stroke();
      x.beginPath(); x.moveTo(-r * 0.4, r * 0.5); x.lineTo(r * 0.4, r * 0.5); x.stroke();
    } else if (key === 'ninefold') { // nine points under a halo
      x.beginPath(); x.arc(0, -r * 0.1, r * 0.92, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) { x.beginPath(); x.arc((a - 1) * r * 0.42, (b - 1) * r * 0.42 + r * 0.12, r * 0.13, 0, 7); x.fill(); }
    } else if (key === 'quiet') { // droplet over still water
      x.beginPath(); x.moveTo(0, -r * 0.95); x.bezierCurveTo(r * 0.75, -r * 0.1, r * 0.55, r * 0.5, 0, r * 0.5); x.bezierCurveTo(-r * 0.55, r * 0.5, -r * 0.75, -r * 0.1, 0, -r * 0.95); x.stroke();
      x.beginPath(); x.moveTo(-r * 0.9, r * 0.85); x.lineTo(r * 0.9, r * 0.85); x.stroke();
    } else { // halcyon: aperture eye
      x.beginPath(); x.moveTo(-r, 0); x.quadraticCurveTo(0, -r * 0.95, r, 0); x.quadraticCurveTo(0, r * 0.95, -r, 0); x.stroke();
      x.beginPath(); x.arc(0, 0, r * 0.3, 0, 7); x.fill();
      x.beginPath(); x.moveTo(0, -r * 1.05); x.lineTo(0, -r * 0.62); x.moveTo(0, r * 0.62); x.lineTo(0, r * 1.05); x.stroke();
    }
    x.restore();
  };

  // rough painted rectangle with a torn / dry edge
  function roughRect(x, rx, ry, rw, rh, rng, j) {
    x.beginPath(); var n = 9;
    for (var i = 0; i <= n; i++) x.lineTo(rx + rw * i / n, ry + (rng() - 0.5) * j);
    for (i = 0; i <= n; i++) x.lineTo(rx + rw + (rng() - 0.5) * j, ry + rh * i / n);
    for (i = n; i >= 0; i--) x.lineTo(rx + rw * i / n, ry + rh + (rng() - 0.5) * j);
    for (i = n; i >= 0; i--) x.lineTo(rx + (rng() - 0.5) * j, ry + rh * i / n);
    x.closePath();
  }
  function dabs(x, rx, ry, rw, rh, rng, n, col, aMax) {
    for (var i = 0; i < n; i++) { x.fillStyle = col; x.globalAlpha = rng() * aMax; var w = 8 + rng() * rw * 0.4, h = 2 + rng() * 6; x.fillRect(rx + rng() * (rw - w), ry + rng() * (rh - h), w, h); }
    x.globalAlpha = 1;
  }

  // ---------- atlas ----------
  P.makeAtlas = function () {
    var S = 2048, c = canvas(S, S), x = c.getContext('2d'), rng = W.makeRng(9001);
    var rects = P.rects = {};
    var cx = 8, cy = 8, rowH = 0;
    function slot(name, w, h) {
      if (cx + w + 8 > S) { cx = 8; cy += rowH + 12; rowH = 0; }
      var r = { x: cx, y: cy, w: w, h: h, u0: cx / S, v0: 1 - (cy + h) / S, u1: (cx + w) / S, v1: 1 - cy / S, aspect: w / h };
      rects[name] = r; cx += w + 12; rowH = Math.max(rowH, h); return r;
    }
    // shop signs (lit)
    var signCols = [['#ff5a2a', '#fff0c8'], ['#ffc23a', '#2a1606'], ['#59e0c0', '#07201c'], ['#f4ead0', '#b02a16'], ['#ff7a3a', '#1c0a04'], ['#8fe04a', '#0b2204'], ['#49d3ff', '#04202c'], ['#ff4058', '#fff0e0']];
    for (var i = 0; i < 8; i++) {
      var tall = i % 3 === 2, w = tall ? 120 : (i % 2 ? 380 : 300), h = tall ? 360 : 120, r = slot('sign' + i, w, h), sc = signCols[i];
      x.fillStyle = sc[0]; roughRect(x, r.x + 3, r.y + 3, w - 6, h - 6, rng, 4); x.fill();
      dabs(x, r.x + 6, r.y + 6, w - 12, h - 12, rng, 26, '#ffffff', 0.16); dabs(x, r.x + 6, r.y + 6, w - 12, h - 12, rng, 20, '#000000', 0.13);
      x.strokeStyle = sc[1]; x.lineWidth = 5; x.strokeRect(r.x + 12, r.y + 12, w - 24, h - 24);
      if (tall) { for (var g = 0; g < 4; g++) P.glyph(x, Math.floor(rng() * 28), r.x + w / 2 - 22, r.y + 30 + g * 78, 62, sc[1], 9); }
      else P.script(x, 'sign' + i, r.x + 30, r.y + 30, h - 60, sc[1], i % 2 ? 6 : 4, 9);
    }
    // faction boards (lit)
    P.FKEYS.forEach(function (k) {
      var f = P.FACTION[k], r = slot('fac_' + k, 200, 200);
      x.fillStyle = '#10141c'; roughRect(x, r.x + 3, r.y + 3, 194, 194, rng, 4); x.fill();
      x.strokeStyle = f.col; x.lineWidth = 6; x.strokeRect(r.x + 12, r.y + 12, 176, 176);
      P.emblem(x, k, r.x + 100, r.y + 86, 50, f.col);
      P.script(x, 'fac' + k, r.x + 34, r.y + 152, 22, f.col, 5, 4);
    });
    // posters (unlit paper)
    var paper = ['#d8cfb4', '#c9b98f', '#b8c4bc', '#d6b9a0', '#cfc9a8', '#a9b7b0'];
    for (i = 0; i < 6; i++) {
      r = slot('poster' + i, 170, 236);
      x.fillStyle = paper[i]; roughRect(x, r.x + 4, r.y + 4, 162, 228, rng, 7); x.fill();
      dabs(x, r.x + 6, r.y + 6, 158, 224, rng, 30, '#3a2c1a', 0.12);
      x.fillStyle = INK;
      if (i === 0) { // wanted: courier silhouette
        x.beginPath(); x.moveTo(r.x + 85, r.y + 40); x.bezierCurveTo(r.x + 130, r.y + 46, r.x + 128, r.y + 100, r.x + 140, r.y + 150); x.lineTo(r.x + 30, r.y + 150); x.bezierCurveTo(r.x + 42, r.y + 100, r.x + 40, r.y + 46, r.x + 85, r.y + 40); x.fill();
        x.fillStyle = '#e6502a'; x.fillRect(r.x + 62, r.y + 78, 46, 12);
      } else if (i === 1) { P.emblem(x, 'orrin', r.x + 85, r.y + 90, 46, '#7a4a08'); }
      else if (i === 2) { P.emblem(x, 'quiet', r.x + 85, r.y + 92, 46, '#23541a'); }
      else if (i === 3) { // the Stack
        x.fillRect(r.x + 60, r.y + 30, 50, 130); x.fillRect(r.x + 44, r.y + 80, 82, 80); x.fillStyle = '#e6502a'; for (g = 0; g < 6; g++) x.fillRect(r.x + 68 + (g % 2) * 22, r.y + 44 + Math.floor(g / 2) * 30, 10, 14);
      } else if (i === 4) { P.emblem(x, 'halcyon', r.x + 85, r.y + 92, 48, '#8a1424'); }
      else { P.emblem(x, 'ninefold', r.x + 85, r.y + 96, 46, '#0c4a66'); }
      P.script(x, 'poster' + i, r.x + 24, r.y + 176, 20, INK, 6, 3.5);
      P.script(x, 'posterb' + i, r.x + 24, r.y + 204, 12, '#40342a', 9, 2);
    }
    // stencils (worn paint)
    for (i = 0; i < 6; i++) {
      r = slot('stencil' + i, 220, 120);
      var col = i % 2 ? '#d9b23a' : '#c9d2cf';
      x.font = '900 104px "Big Shoulders Display", Impact, sans-serif'; x.fillStyle = col; x.textBaseline = 'top';
      var txt = ['07', 'B2', '13', 'P4', '21', 'S9'][i];
      x.fillText(txt, r.x + 10, r.y + 6);
      x.globalCompositeOperation = 'destination-out';
      for (g = 0; g < 70; g++) { x.globalAlpha = 0.5 + rng() * 0.5; x.fillRect(r.x + rng() * 220, r.y + rng() * 120, 2 + rng() * 22, 1 + rng() * 3); }
      x.fillRect(r.x + 62, r.y, 5, 120); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    // hazard stripe
    r = slot('hazard', 400, 60);
    for (g = 0; g < 12; g++) { x.fillStyle = g % 2 ? '#d9a520' : '#14161c'; x.beginPath(); x.moveTo(r.x + g * 36 - 8, r.y + 60); x.lineTo(r.x + g * 36 + 28, r.y); x.lineTo(r.x + g * 36 + 64, r.y); x.lineTo(r.x + g * 36 + 28, r.y + 60); x.fill(); }
    x.clearRect(r.x + 400, r.y, 80, 60);
    x.globalCompositeOperation = 'destination-out'; for (g = 0; g < 60; g++) { x.globalAlpha = 0.6; x.fillRect(r.x + rng() * 400, r.y + rng() * 60, 3 + rng() * 20, 1 + rng() * 3); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    // arrow
    r = slot('arrow', 200, 120); x.fillStyle = '#c9d2cf'; x.beginPath(); x.moveTo(r.x + 10, r.y + 44); x.lineTo(r.x + 110, r.y + 44); x.lineTo(r.x + 110, r.y + 12); x.lineTo(r.x + 190, r.y + 60); x.lineTo(r.x + 110, r.y + 108); x.lineTo(r.x + 110, r.y + 76); x.lineTo(r.x + 10, r.y + 76); x.fill();
    x.globalCompositeOperation = 'destination-out'; for (g = 0; g < 40; g++) { x.globalAlpha = 0.6; x.fillRect(r.x + rng() * 200, r.y + rng() * 120, 3 + rng() * 20, 1 + rng() * 3); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    // drain grate
    r = slot('grate', 150, 150); x.fillStyle = '#1a2026'; x.fillRect(r.x + 4, r.y + 4, 142, 142); x.fillStyle = '#05070a'; for (g = 0; g < 6; g++) x.fillRect(r.x + 16, r.y + 16 + g * 21, 118, 11); x.strokeStyle = '#4a565c'; x.lineWidth = 5; x.strokeRect(r.x + 6, r.y + 6, 138, 138);
    // manhole
    r = slot('manhole', 170, 170); x.fillStyle = '#232a30'; x.beginPath(); x.arc(r.x + 85, r.y + 85, 80, 0, 7); x.fill(); x.strokeStyle = '#0a0c10'; x.lineWidth = 6; x.beginPath(); x.arc(r.x + 85, r.y + 85, 78, 0, 7); x.stroke(); x.beginPath(); x.arc(r.x + 85, r.y + 85, 54, 0, 7); x.stroke();
    P.emblem(x, 'quiet', r.x + 85, r.y + 85, 26, '#4a565c');
    // cracks
    r = slot('crack', 240, 240); x.strokeStyle = '#0a0d12'; x.lineCap = 'round';
    for (g = 0; g < 5; g++) { var px = r.x + 120, py = r.y + 120, ang = rng() * 6.28; x.lineWidth = 4.5; x.beginPath(); x.moveTo(px, py); for (var s = 0; s < 7; s++) { ang += (rng() - 0.5) * 1.1; px += Math.cos(ang) * 17; py += Math.sin(ang) * 17; x.lineTo(px, py); x.lineWidth *= 0.86; } x.stroke(); }
    // long script banner (unlit)
    r = slot('banner', 500, 70); x.fillStyle = '#1d2228'; roughRect(x, r.x + 2, r.y + 2, 496, 66, rng, 4); x.fill(); P.script(x, 'banner', r.x + 20, r.y + 16, 38, '#c9b98f', 11, 6);
    // paper lantern glyph panel
    r = slot('lanternp', 120, 160); x.fillStyle = '#ffb04a'; roughRect(x, r.x + 3, r.y + 3, 114, 154, rng, 3); x.fill(); dabs(x, r.x + 4, r.y + 4, 110, 150, rng, 14, '#fff', 0.2); P.glyph(x, 7, r.x + 34, r.y + 34, 90, '#7a1a08', 12);
    // window strip (lit rooms far away)
    r = slot('windows', 256, 128); x.fillStyle = '#0b1016'; x.fillRect(r.x, r.y, 256, 128);
    for (g = 0; g < 40; g++) { if (rng() < 0.45) continue; x.fillStyle = rng() < 0.7 ? '#ffb347' : '#9fe8e0'; x.globalAlpha = 0.5 + rng() * 0.5; x.fillRect(r.x + 8 + (g % 10) * 25, r.y + 8 + Math.floor(g / 10) * 31, 14, 20); } x.globalAlpha = 1;

    var t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
    P.atlasCanvas = c;
    return t;
  };

  // ---------- portraits ----------
  // o: bg, skin, coat, hat:{type,col}, eyes:{type,col}, mouth type, rim col, extra
  P.portraitDefs = {
    kestrel: { bg: '#16323a', coat: '#2a3a44', skin: '#2a3a44', hood: '#33474f', eyes: 'goggles', eyeCol: '#ffb347', mask: 'resp', rim: '#3fe0d0', name: 'Kestrel' },
    vesper: { bg: '#3a1c14', coat: '#7a2e22', skin: '#b98a6a', hat: 'brim', hatCol: '#2a2220', eyes: 'squint', eyeCol: '#141414', mask: 'chin', rim: '#ffd070', name: 'Vesper Quill', hair: '#2a2220' },
    bram: { bg: '#2a2410', coat: '#39444c', skin: '#3a3a3a', hat: 'helm', hatCol: '#d9a520', eyes: 'visor', eyeCol: '#ff7a3a', mask: 'jaw', rim: '#ff7a3a', name: 'Bram Tolliver' },
    ruen: { bg: '#1c3a2c', coat: '#d8d4c0', skin: '#b98a6a', hat: 'cap', hatCol: '#7fb6a0', eyes: 'loupe', eyeCol: '#8fffb0', mask: 'chin', rim: '#8fffb0', name: 'Mother Ruen', hair: '#d9d9d2' },
    pike: { bg: '#2a2440', coat: '#c8502a', skin: '#8a5a44', hat: 'phones', hatCol: '#e8d24a', eyes: 'visor', eyeCol: '#49d3ff', rim: '#ffb347', name: 'Pike', hair: '#1a1620' },
    brine: { bg: '#3a2a1c', coat: '#4a5a3a', skin: '#a07a5a', hat: 'brim', hatCol: '#2a2e22', eyes: 'patch', eyeCol: '#e8e0c8', mask: 'beard', rim: '#ffb347', name: 'Brine', hair: '#8a8a80' },
    hask: { bg: '#40200e', coat: '#5a4636', skin: '#c08a66', hat: 'flat', hatCol: '#3a2c22', eyes: 'squint', eyeCol: '#141414', mask: 'stache', rim: '#ff5a36', name: 'Hask', hair: '#5a4a3a' },
    orrin: { bg: '#3a2c08', coat: '#4a4a44', skin: '#b08a70', hat: 'peak', hatCol: '#2c2c28', eyes: 'squint', eyeCol: '#141414', mask: 'jaw', rim: '#f2b824', name: 'Colonel Vey Tarn', hair: '#6a6a60' },
    ninefold: { bg: '#062a3a', coat: '#1a2a3a', skin: '#101820', hood: '#22384a', eyes: 'nine', eyeCol: '#49d3ff', mask: 'blank', rim: '#49d3ff', name: 'Sister Static' },
    quiet: { bg: '#16300c', coat: '#e6eadc', skin: '#c8a48a', hat: 'bob', hatCol: '#1c2a1a', eyes: 'round', eyeCol: '#8fe04a', mask: 'resp', rim: '#8fe04a', name: 'Dr. Lune Asp', hair: '#1c2a1a' },
    halcyon: { bg: '#3a0a14', coat: '#1c1c22', skin: '#d8b8a0', hat: 'slick', hatCol: '#e8e4dc', eyes: 'mirror', eyeCol: '#ff4058', rim: '#ff4058', name: 'Iris Vale', hair: '#e8e4dc' },
    marrow: { bg: '#3a1418', coat: '#d8d2c4', skin: '#d8d2c4', hood: '#eee8da', eyes: 'slash', eyeCol: '#ff3030', mask: 'resp', rim: '#ff5a36', name: 'Marrow' },
    dredge: { bg: '#2a2410', coat: '#6a4a1a', skin: '#3a3a3a', hat: 'helm', hatCol: '#d9a520', eyes: 'visor', eyeCol: '#ffb347', mask: 'resp', rim: '#ffb347', name: 'The Dredge' },
    buyer: { bg: '#5a3a30', coat: '#16181e', skin: '#16181e', hat: 'brim', hatCol: '#0c0e12', eyes: 'none', eyeCol: '#fff', mask: 'blank', rim: '#ffd070', name: 'The buyer' }
  };
  var pcache = {};
  P.portrait = function (key) {
    if (pcache[key]) return pcache[key];
    var o = P.portraitDefs[key] || P.portraitDefs.kestrel, S = 220, c = canvas(S, S), x = c.getContext('2d'), rng = W.makeRng(W.hash(key));
    x.lineJoin = 'round'; x.lineCap = 'round';
    // painted ground
    x.fillStyle = o.bg; x.fillRect(0, 0, S, S);
    for (var i = 0; i < 40; i++) { x.globalAlpha = 0.07 + rng() * 0.1; x.fillStyle = rng() < 0.5 ? '#000' : o.rim; x.save(); x.translate(rng() * S, rng() * S); x.rotate(-0.6); x.fillRect(-50, -4, 60 + rng() * 80, 4 + rng() * 10); x.restore(); }
    x.globalAlpha = 1;
    function inked(fill, path, lw) { x.beginPath(); path(); x.closePath(); x.fillStyle = fill; x.fill(); x.strokeStyle = INK; x.lineWidth = lw || 5; x.stroke(); }
    // shoulders
    inked(o.coat, function () { x.moveTo(8, S + 4); x.quadraticCurveTo(20, 150, 78, 138); x.lineTo(142, 138); x.quadraticCurveTo(200, 150, 212, S + 4); }, 6);
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.beginPath(); x.moveTo(8, S); x.quadraticCurveTo(24, 160, 78, 146); x.lineTo(96, S); x.fill();
    // collar
    inked(o.coat, function () { x.moveTo(74, 150); x.lineTo(110, 128); x.lineTo(146, 150); x.lineTo(128, 176); x.lineTo(110, 160); x.lineTo(92, 176); }, 4);
    // head
    var hoodCol = o.hood;
    if (hoodCol) inked(hoodCol, function () { x.moveTo(110, 18); x.bezierCurveTo(176, 20, 176, 96, 168, 150); x.lineTo(52, 150); x.bezierCurveTo(44, 96, 44, 20, 110, 18); }, 6);
    inked(o.skin, function () { x.moveTo(110, 40); x.bezierCurveTo(150, 40, 152, 84, 146, 108); x.quadraticCurveTo(134, 140, 110, 142); x.quadraticCurveTo(86, 140, 74, 108); x.bezierCurveTo(68, 84, 70, 40, 110, 40); }, 5);
    // shade side of the face (two tones)
    x.fillStyle = 'rgba(6,14,22,0.38)'; x.beginPath(); x.moveTo(110, 42); x.bezierCurveTo(72, 42, 68, 86, 76, 110); x.quadraticCurveTo(88, 138, 108, 140); x.quadraticCurveTo(92, 100, 110, 42); x.fill();
    // hair / hats
    var hc = o.hatCol || '#222';
    if (o.hair && !hoodCol) inked(o.hair, function () { x.moveTo(70, 80); x.bezierCurveTo(62, 30, 158, 26, 150, 80); x.quadraticCurveTo(140, 52, 110, 54); x.quadraticCurveTo(82, 54, 70, 80); }, 4);
    if (o.hat === 'cap') inked(hc, function () { x.moveTo(68, 66); x.bezierCurveTo(66, 22, 154, 22, 152, 66); x.quadraticCurveTo(110, 52, 68, 66); }, 5);
    if (o.hat === 'flat') inked(hc, function () { x.moveTo(60, 60); x.bezierCurveTo(70, 26, 150, 22, 160, 54); x.quadraticCurveTo(176, 62, 170, 68); x.quadraticCurveTo(110, 46, 60, 60); }, 5);
    if (o.hat === 'brim') { inked(hc, function () { x.moveTo(20, 70); x.quadraticCurveTo(110, 36, 200, 70); x.quadraticCurveTo(110, 62, 20, 70); }, 5); inked(hc, function () { x.moveTo(70, 56); x.bezierCurveTo(74, 14, 146, 14, 150, 56); }, 5); }
    if (o.hat === 'peak') { inked(hc, function () { x.moveTo(62, 58); x.lineTo(70, 22); x.quadraticCurveTo(110, 8, 150, 22); x.lineTo(158, 58); x.quadraticCurveTo(110, 46, 62, 58); }, 5); inked('#14161a', function () { x.moveTo(62, 58); x.quadraticCurveTo(110, 46, 158, 58); x.quadraticCurveTo(110, 76, 62, 58); }, 4); x.fillStyle = o.rim; x.beginPath(); x.arc(110, 32, 7, 0, 7); x.fill(); }
    if (o.hat === 'helm') { inked(hc, function () { x.moveTo(60, 76); x.bezierCurveTo(56, 14, 164, 14, 160, 76); x.quadraticCurveTo(110, 60, 60, 76); }, 6); x.fillStyle = INK; x.fillRect(104, 20, 12, 44); }
    if (o.hat === 'phones') { inked(hc, function () { x.moveTo(60, 84); x.bezierCurveTo(52, 10, 168, 10, 160, 84); x.lineTo(150, 84); x.bezierCurveTo(152, 26, 68, 26, 70, 84); }, 4); inked(hc, function () { x.rect(50, 74, 24, 42); }, 4); inked(hc, function () { x.rect(146, 74, 24, 42); }, 4); x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(164, 76); x.lineTo(186, 20); x.stroke(); }
    if (o.hat === 'bob') inked(hc, function () { x.moveTo(64, 120); x.bezierCurveTo(50, 20, 170, 20, 156, 120); x.lineTo(146, 100); x.quadraticCurveTo(146, 56, 110, 56); x.quadraticCurveTo(74, 56, 74, 100); }, 5);
    if (o.hat === 'slick') inked(hc, function () { x.moveTo(68, 76); x.bezierCurveTo(60, 20, 160, 18, 154, 70); x.quadraticCurveTo(132, 44, 68, 76); }, 4);
    // eyes
    var ec = o.eyeCol;
    if (o.eyes === 'goggles') { inked('#1a1e24', function () { x.rect(66, 70, 88, 30); }, 4); inked(ec, function () { x.ellipse(90, 85, 17, 13, 0, 0, 7); }, 5); inked(ec, function () { x.ellipse(132, 85, 17, 13, 0, 0, 7); }, 5); x.fillStyle = '#fff6d8'; x.fillRect(82, 78, 12, 4); x.fillRect(124, 78, 12, 4); }
    if (o.eyes === 'loupe') { x.fillStyle = INK; x.fillRect(84, 84, 14, 4); inked('#20262a', function () { x.arc(132, 86, 19, 0, 7); }, 5); inked(ec, function () { x.arc(132, 86, 11, 0, 7); }, 3); x.strokeStyle = INK; x.lineWidth = 4; x.beginPath(); x.moveTo(150, 80); x.lineTo(166, 66); x.stroke(); }
    if (o.eyes === 'visor') { inked(ec, function () { x.moveTo(70, 76); x.lineTo(150, 76); x.lineTo(146, 96); x.lineTo(74, 96); }, 4); x.fillStyle = '#fff'; x.globalAlpha = 0.6; x.fillRect(78, 80, 30, 4); x.globalAlpha = 1; }
    if (o.eyes === 'patch') { inked('#14161a', function () { x.moveTo(78, 78); x.lineTo(102, 76); x.lineTo(100, 96); x.lineTo(80, 94); }, 3); x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(70, 66); x.lineTo(150, 92); x.stroke(); x.fillStyle = ec; x.beginPath(); x.ellipse(130, 86, 7, 4, 0, 0, 7); x.fill(); x.fillStyle = INK; x.beginPath(); x.arc(131, 86, 2.5, 0, 7); x.fill(); }
    if (o.eyes === 'squint') { x.strokeStyle = INK; x.lineWidth = 5; x.beginPath(); x.moveTo(82, 86); x.lineTo(100, 88); x.moveTo(122, 88); x.lineTo(140, 86); x.stroke(); x.lineWidth = 6; x.beginPath(); x.moveTo(78, 76); x.lineTo(102, 80); x.moveTo(120, 80); x.lineTo(144, 76); x.stroke(); }
    if (o.eyes === 'nine') { for (i = 0; i < 9; i++) { x.fillStyle = ec; x.beginPath(); x.arc(92 + (i % 3) * 18, 68 + Math.floor(i / 3) * 18, 4.5, 0, 7); x.fill(); } x.strokeStyle = ec; x.lineWidth = 4; x.beginPath(); x.arc(110, 60, 70, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
    if (o.eyes === 'round') { inked('#e8f4e0', function () { x.arc(92, 86, 13, 0, 7); }, 4); inked('#e8f4e0', function () { x.arc(130, 86, 13, 0, 7); }, 4); x.fillStyle = ec; x.beginPath(); x.arc(92, 86, 5, 0, 7); x.arc(130, 86, 5, 0, 7); x.fill(); x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(105, 86); x.lineTo(117, 86); x.stroke(); }
    if (o.eyes === 'mirror') { inked(ec, function () { x.moveTo(72, 78); x.lineTo(106, 80); x.lineTo(102, 94); x.lineTo(78, 94); }, 3); inked(ec, function () { x.moveTo(148, 78); x.lineTo(114, 80); x.lineTo(118, 94); x.lineTo(142, 94); }, 3); x.fillStyle = '#fff'; x.fillRect(80, 82, 14, 3); x.fillRect(122, 82, 14, 3); x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(92, 116); x.quadraticCurveTo(110, 120, 128, 114); x.stroke(); }
    if (o.eyes === 'slash') { inked(ec, function () { x.moveTo(66, 92); x.lineTo(156, 70); x.lineTo(154, 84); x.lineTo(68, 102); }, 4); }
    // lower face
    if (o.mask === 'resp') { inked('#22282e', function () { x.moveTo(78, 104); x.lineTo(142, 104); x.quadraticCurveTo(140, 140, 110, 146); x.quadraticCurveTo(80, 140, 78, 104); }, 5); inked('#3a444c', function () { x.arc(86, 126, 11, 0, 7); }, 4); inked('#3a444c', function () { x.arc(134, 126, 11, 0, 7); }, 4); x.strokeStyle = INK; x.lineWidth = 3; for (i = 0; i < 3; i++) { x.beginPath(); x.moveTo(102, 114 + i * 8); x.lineTo(118, 114 + i * 8); x.stroke(); } }
    if (o.mask === 'chin') { inked('#9fd0c0', function () { x.moveTo(84, 130); x.quadraticCurveTo(110, 150, 136, 130); x.quadraticCurveTo(110, 142, 84, 130); }, 3); x.strokeStyle = INK; x.lineWidth = 4; x.beginPath(); x.moveTo(96, 118); x.quadraticCurveTo(110, 114, 124, 119); x.stroke(); x.lineWidth = 2; x.beginPath(); x.moveTo(80, 100); x.lineTo(88, 104); x.moveTo(140, 100); x.lineTo(132, 104); x.stroke(); }
    if (o.mask === 'beard') inked(o.hair, function () { x.moveTo(74, 104); x.quadraticCurveTo(110, 116, 146, 104); x.quadraticCurveTo(144, 160, 110, 168); x.quadraticCurveTo(76, 160, 74, 104); }, 4);
    if (o.mask === 'stache') { inked(o.hair, function () { x.moveTo(78, 112); x.quadraticCurveTo(110, 96, 142, 112); x.quadraticCurveTo(126, 124, 110, 114); x.quadraticCurveTo(94, 124, 78, 112); }, 3); x.strokeStyle = INK; x.lineWidth = 4; x.beginPath(); x.moveTo(98, 130); x.lineTo(122, 130); x.stroke(); }
    if (o.mask === 'jaw') { inked('#8a9298', function () { x.moveTo(74, 108); x.lineTo(146, 108); x.quadraticCurveTo(140, 140, 110, 144); x.quadraticCurveTo(80, 140, 74, 108); }, 4); x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(84, 122); x.lineTo(136, 122); x.stroke(); x.fillStyle = INK; x.beginPath(); x.arc(80, 112, 3, 0, 7); x.arc(140, 112, 3, 0, 7); x.fill(); }
    if (o.mask === 'blank') { /* smooth mask, nothing */ }
    if (!o.mask) { x.strokeStyle = INK; x.lineWidth = 4; x.beginPath(); x.moveTo(98, 122); x.quadraticCurveTo(110, 127, 124, 120); x.stroke(); }
    // hard rim light down the right side
    x.strokeStyle = o.rim; x.lineWidth = 5; x.beginPath(); x.moveTo(152, 50); x.bezierCurveTo(160, 80, 156, 106, 146, 124); x.stroke();
    x.beginPath(); x.moveTo(176, 150); x.quadraticCurveTo(204, 160, 210, 200); x.stroke();
    // frame
    x.strokeStyle = INK; x.lineWidth = 8; x.strokeRect(4, 4, S - 8, S - 8);
    pcache[key] = c; return c;
  };

  // ---------- icons (door rewards, HUD) ----------
  var icache = {};
  P.icon = function (kind, col) {
    var key = kind + col; if (icache[key]) return icache[key];
    var S = 64, c = canvas(S, S), x = c.getContext('2d'); col = col || '#f0e8d0';
    x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = INK; x.fillStyle = col; x.lineWidth = 4;
    function ink(path) { x.beginPath(); path(); x.closePath(); x.fill(); x.stroke(); }
    if (kind === 'implant') { ink(function () { x.rect(18, 18, 28, 28); }); x.lineWidth = 3; for (var i = 0; i < 3; i++) { x.beginPath(); x.moveTo(24 + i * 8, 18); x.lineTo(24 + i * 8, 9); x.moveTo(24 + i * 8, 46); x.lineTo(24 + i * 8, 55); x.moveTo(18, 24 + i * 8); x.lineTo(9, 24 + i * 8); x.moveTo(46, 24 + i * 8); x.lineTo(55, 24 + i * 8); x.stroke(); } x.fillStyle = INK; x.fillRect(27, 27, 10, 10); }
    else if (kind === 'chop') { ink(function () { x.moveTo(12, 46); x.lineTo(36, 22); x.bezierCurveTo(30, 8, 46, 4, 54, 10); x.lineTo(44, 18); x.lineTo(48, 24); x.lineTo(58, 16); x.bezierCurveTo(60, 28, 52, 36, 42, 30); x.lineTo(18, 54); }); }
    else if (kind === 'gear') { ink(function () { x.moveTo(14, 20); x.lineTo(50, 20); x.lineTo(54, 50); x.lineTo(10, 50); }); x.fillStyle = INK; x.fillRect(22, 28, 20, 6); x.lineWidth = 4; x.beginPath(); x.moveTo(22, 20); x.quadraticCurveTo(32, 4, 42, 20); x.stroke(); }
    else if (kind === 'scrip') { ink(function () { x.moveTo(32, 8); x.lineTo(54, 22); x.lineTo(54, 42); x.lineTo(32, 56); x.lineTo(10, 42); x.lineTo(10, 22); }); x.fillStyle = INK; x.fillRect(29, 20, 6, 24); x.fillRect(22, 26, 20, 5); }
    else if (kind === 'health') { ink(function () { x.moveTo(24, 10); x.lineTo(40, 10); x.lineTo(40, 24); x.lineTo(54, 24); x.lineTo(54, 40); x.lineTo(40, 40); x.lineTo(40, 54); x.lineTo(24, 54); x.lineTo(24, 40); x.lineTo(10, 40); x.lineTo(10, 24); x.lineTo(24, 24); }); }
    else if (kind === 'memory') { x.lineWidth = 9; x.strokeStyle = INK; x.beginPath(); for (i = 0; i < 40; i++) { var a = i * 0.36, r = 3 + i * 0.58; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.stroke(); x.lineWidth = 4.5; x.strokeStyle = col; x.stroke(); }
    else if (kind === 'core') { ink(function () { x.moveTo(32, 6); x.lineTo(52, 32); x.lineTo(32, 58); x.lineTo(12, 32); }); x.fillStyle = INK; x.beginPath(); x.arc(32, 32, 6, 0, 7); x.fill(); }
    else if (kind === 'elite') { ink(function () { x.moveTo(32, 8); x.bezierCurveTo(58, 8, 58, 40, 44, 44); x.lineTo(44, 54); x.lineTo(20, 54); x.lineTo(20, 44); x.bezierCurveTo(6, 40, 6, 8, 32, 8); }); x.fillStyle = INK; x.beginPath(); x.arc(23, 30, 6, 0, 7); x.arc(41, 30, 6, 0, 7); x.fill(); }
    else if (kind === 'event') { x.font = '900 52px "Big Shoulders Display", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeText('?', 32, 36); x.fillText('?', 32, 36); }
    else if (kind === 'shop') { ink(function () { x.moveTo(8, 24); x.lineTo(14, 10); x.lineTo(50, 10); x.lineTo(56, 24); }); ink(function () { x.rect(12, 24, 40, 30); }); x.fillStyle = INK; x.fillRect(26, 34, 12, 20); }
    else if (kind === 'boss') { ink(function () { x.moveTo(8, 50); x.lineTo(14, 16); x.lineTo(24, 32); x.lineTo(32, 10); x.lineTo(40, 32); x.lineTo(50, 16); x.lineTo(56, 50); }); }
    else { ink(function () { x.arc(32, 32, 18, 0, 7); }); }
    icache[key] = c; return c;
  };

  // lettering canvas texture for in-world labels (door plaques)
  P.labelTexture = function (text, col) {
    var c = canvas(256, 64), x = c.getContext('2d');
    x.fillStyle = '#0c0e14'; x.fillRect(0, 0, 256, 64); x.fillStyle = col || '#f0e8d0'; x.font = '700 40px "Big Shoulders Display", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 34);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  };
})();
