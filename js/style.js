/* Schaf-Imperium: Cartoon-Stil. Dicke Umrisse, Licht oben, Schatten unten, kräftige Farben.
   Jede Figur wird einmal in ein Bild gezeichnet (Sprite) und dann nur noch kopiert. */
(function (SI) {
  'use strict';
  var A = SI.art, TAU = Math.PI * 2;
  var ell = A.ell, circ = A.circ, rrect = A.rrect, poly = A.poly;
  var OUT = '#2a1a12';
  A.OUT = OUT;

  /* ---------- Sprite-Maschine ---------- */
  var cache = {};
  // draw(g) zeichnet mit Fußpunkt (0,0). box = [links, oben, rechts, unten] in Welt-Einheiten.
  function makeSprite(box, draw, opt) {
    opt = opt || {};
    var sc = opt.sc || 2.5, pad = 3;
    var w = box[2] - box[0] + pad * 2, h = box[3] - box[1] + pad * 2;
    var c = document.createElement('canvas');
    c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
    var g = c.getContext('2d');
    g.scale(sc, sc); g.translate(pad - box[0], pad - box[1]);
    draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (opt.shade !== false) {
      g.globalCompositeOperation = 'source-atop';
      var gr = g.createLinearGradient(0, 0, 0, c.height);
      gr.addColorStop(0, 'rgba(255,255,255,.20)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)');
      gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.20)');
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
    }
    if (opt.silhouette) {
      g.globalCompositeOperation = 'source-in'; g.fillStyle = opt.silhouette; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
    }
    var o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    var og = o.getContext('2d'), r = (opt.ol == null ? 1.6 : opt.ol) * sc;
    if (r > 0) {
      for (var i = 0; i < 16; i++) { var a = i / 16 * TAU; og.drawImage(c, Math.cos(a) * r, Math.sin(a) * r); }
      og.globalCompositeOperation = 'source-in'; og.fillStyle = opt.olc || OUT; og.fillRect(0, 0, o.width, o.height);
      og.globalCompositeOperation = 'source-over';
    }
    og.drawImage(c, 0, 0);
    return { c: o, w: w, h: h, ax: pad - box[0], ay: pad - box[1] };
  }
  A.makeSprite = makeSprite;
  function sprite(key, box, draw, opt) { if (!cache[key]) cache[key] = makeSprite(box, draw, opt); return cache[key]; }
  A.sprite = sprite;
  A.blit = function (ctx, s, x, y, sc, flip, sh) {
    sc = sc || 1;
    if (sh) { ctx.fillStyle = 'rgba(20,40,10,.28)'; ell(ctx, x, y, sh[0] * sc, sh[1] * sc); }
    if (flip) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(s.c, -s.ax * sc, -s.ay * sc, s.w * sc, s.h * sc); ctx.restore(); }
    else ctx.drawImage(s.c, x - s.ax * sc, y - s.ay * sc, s.w * sc, s.h * sc);
  };
  function blob(g, circles, fill, lw) { // Kreise mit gemeinsamem Umriss
    if (lw) { g.strokeStyle = OUT; g.lineWidth = lw; g.beginPath(); circles.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); }); g.stroke(); }
    g.fillStyle = fill; g.beginPath(); circles.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); }); g.fill();
  }
  function line(g, pts, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
  function sfill(g, col, lw) { g.fillStyle = col; g.fill(); g.strokeStyle = OUT; g.lineWidth = lw || 1.3; g.stroke(); }
  function star(g, x, y, r1, r2, n) { g.beginPath(); for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * TAU - Math.PI / 2, r = i % 2 ? r2 : r1; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  function lum(hex) { var n = parseInt(hex.slice(1), 16); return (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; }
  function mix(hex, to, k) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k), gg = Math.round(((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k), bl = Math.round((a & 255) * (1 - k) + (b & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (gg << 8) + bl).toString(16).slice(1);
  }
  A.mix = mix;

  /* ---------- Schafe ---------- */
  var PUFFS = [[-14, -14, 8], [-9, -23, 8.5], [0, -27, 9], [9, -25, 8.5], [14, -17, 8], [9, -9, 8.5], [-2, -8, 8.5], [-13, -8, 7], [0, -17, 12.5]];
  function bodyPath(g) { g.beginPath(); PUFFS.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); }); }
  function woolFill(g, t) {
    var w = t.w;
    if (!Array.isArray(w)) return w;
    var n = w.length, gr;
    if (t.hard) { gr = g.createLinearGradient(-22, 0, 22, 0); w.forEach(function (c, i) { gr.addColorStop(i / n, c); gr.addColorStop((i + 1) / n - 0.001, c); }); }
    else if (t.id === 'regen') { gr = g.createLinearGradient(0, -36, 0, 0); w.forEach(function (c, i) { gr.addColorStop(i / n, c); gr.addColorStop((i + 1) / n - 0.001, c); }); }
    else { gr = g.createLinearGradient(-20, -36, 18, 0); w.forEach(function (c, i) { gr.addColorStop(n > 1 ? i / (n - 1) : 0, c); }); }
    return gr;
  }
  function baseCol(t) { return Array.isArray(t.w) ? t.w[Math.floor(t.w.length / 2)] : t.w; }

  // Aussehen pro Sorte: Muster (pat), Laune (mood), Extras hinten (back) und am Kopf (head)
  var LOOK = {
    wiese: { mood: 'happy', head: 'daisy' },
    schwarz: { mood: 'cool', head: 'spike' },
    braun: { pat: 'drip', mood: 'happy', head: 'cherry' },
    locke: { pat: 'curls', mood: 'lash', head: 'bow' },
    rosa: { pat: 'sprinkles', mood: 'lash', head: 'heart' },
    himmel: { mood: 'happy', back: 'wings', head: 'halo' },
    minz: { pat: 'chips', mood: 'happy', head: 'leaf' },
    wolke: { pat: 'puffs', mood: 'sleepy', head: 'raincloud' },
    feuer: { pat: 'flames', mood: 'angry', head: 'flame' },
    eis: { pat: 'frost', mood: 'happy', back: 'icespikes', head: 'scarf' },
    moos: { pat: 'moss', mood: 'happy', back: 'mushrooms', head: 'antlers' },
    blitz: { pat: 'zigzag', mood: 'angry', head: 'zap' },
    gold: { pat: 'shine', mood: 'happy', head: 'crown' },
    kristall: { pat: 'facets', mood: 'happy', back: 'crystals', head: 'gem' },
    nacht: { pat: 'stars', mood: 'sleepy', head: 'moon' },
    regen: { pat: 'shine', mood: 'star', head: 'rainbowarc' },
    galaxie: { pat: 'stars', mood: 'star', back: 'ring', head: 'antenna' },
    drache: { pat: 'scales', mood: 'angry', back: 'dragon', head: 'horns' },
    zebra: { mood: 'cool', head: 'mohawk' },
    lava: { pat: 'cracks', mood: 'angry', head: 'smoke' },
    dampf: { pat: 'puffs', mood: 'happy', head: 'goggles' },
    gewitter: { pat: 'swirl', mood: 'angry', head: 'stormcloud' },
    diamant: { pat: 'facets', mood: 'star', head: 'diamond' },
    sonne: { pat: 'shine', mood: 'cool', back: 'sunrays', head: 'sunhat' },
    guac: { pat: 'avocado', mood: 'happy', head: 'avocadohalf' },
    chili: { pat: 'seeds', mood: 'angry', head: 'chilipepper' },
    pinata: { pat: 'fringe', mood: 'star', head: 'partyhat' },
    taco: { pat: 'tacofill', mood: 'happy', head: 'sombrero' }
  };
  SI.LOOK = LOOK;

  function drawPattern(g, t, pat) {
    var R = A.rng(A.hash(t.id + 'p')), i, x, y;
    switch (pat) {
      case 'drip':
        g.fillStyle = '#fff3e0';
        g.beginPath(); g.moveTo(-24, -24);
        for (i = 0; i <= 8; i++) { x = -22 + i * 5.5; g.lineTo(x, -22 + (i % 2 ? 7 + R() * 5 : 2)); }
        g.lineTo(26, -40); g.lineTo(-24, -40); g.closePath(); g.fill();
        g.fillStyle = '#ff5f8a'; [[-8, -30], [3, -33], [8, -27], [-14, -24], [-2, -26]].forEach(function (p, k) { g.save(); g.translate(p[0], p[1]); g.rotate(k); g.fillRect(-1.6, -0.6, 3.2, 1.2); g.restore(); });
        g.fillStyle = '#6bd6ff'; [[-4, -31], [6, -30], [-11, -27]].forEach(function (p, k) { g.save(); g.translate(p[0], p[1]); g.rotate(k * 2); g.fillRect(-1.6, -0.6, 3.2, 1.2); g.restore(); });
        break;
      case 'curls':
        g.strokeStyle = mix(baseCol(t), '#8a5a30', 0.35); g.lineWidth = 1.2;
        for (i = 0; i < 14; i++) { x = -18 + R() * 34; y = -32 + R() * 26; g.beginPath(); g.arc(x, y, 2.4, 0.3, 5.2); g.stroke(); }
        break;
      case 'sprinkles':
        ['#ffffff', '#ffe066', '#7ad7ff', '#b98bff'].forEach(function (c, k) {
          g.fillStyle = c;
          for (i = 0; i < 6; i++) { g.save(); g.translate(-18 + R() * 34, -32 + R() * 26); g.rotate(R() * 6); rrect(g, -1.8, -0.7, 3.6, 1.4, 0.7); g.fill(); g.restore(); }
        });
        break;
      case 'chips':
        g.fillStyle = '#5a3420'; for (i = 0; i < 12; i++) poly(g, (function (x, y) { return [x - 1.6, y + 1, x + 1.6, y + 1.2, x + 0.2, y - 1.6]; })(-18 + R() * 34, -32 + R() * 26));
        break;
      case 'puffs':
        g.fillStyle = 'rgba(255,255,255,.85)'; for (i = 0; i < 8; i++) circ(g, -17 + R() * 32, -33 + R() * 18, 2.5 + R() * 3);
        break;
      case 'flames':
        g.fillStyle = '#fff07a';
        for (i = 0; i < 5; i++) { x = -16 + i * 8; poly(g, [x - 3, -10, x, -22 - R() * 6, x + 3, -10]); }
        break;
      case 'frost':
        g.strokeStyle = '#ffffff'; g.lineWidth = 0.9;
        for (i = 0; i < 7; i++) { x = -17 + R() * 32; y = -32 + R() * 24; for (var k = 0; k < 3; k++) { var a = k * Math.PI / 3; line(g, [x - Math.cos(a) * 2.2, y - Math.sin(a) * 2.2, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2], '#ffffff', 0.9); } }
        break;
      case 'moss':
        g.fillStyle = '#3d7d35'; for (i = 0; i < 9; i++) ell(g, -17 + R() * 32, -32 + R() * 26, 2 + R() * 2.5, 1.5 + R() * 1.6);
        g.fillStyle = '#ffd23f'; for (i = 0; i < 4; i++) circ(g, -15 + R() * 28, -30 + R() * 20, 1.1);
        break;
      case 'zigzag':
        line(g, [-24, -18, -16, -24, -9, -16, -2, -24, 5, -16, 12, -24, 19, -16, 26, -22], '#e0a000', 4.2);
        line(g, [-24, -18, -16, -24, -9, -16, -2, -24, 5, -16, 12, -24, 19, -16, 26, -22], '#fff6a8', 1.6);
        break;
      case 'shine':
        g.fillStyle = 'rgba(255,255,255,.55)'; g.save(); g.translate(-6, -26); g.rotate(-0.5); ell(g, 0, 0, 9, 2.6); g.restore();
        star(g, 8, -30, 3.4, 1.1, 4); g.fillStyle = '#fff'; g.fill();
        star(g, -14, -15, 2.4, 0.8, 4); g.fill();
        break;
      case 'facets':
        g.fillStyle = 'rgba(255,255,255,.5)'; poly(g, [-10, -32, -2, -36, 0, -26, -8, -24]); poly(g, [4, -22, 12, -26, 14, -16, 6, -14]);
        g.fillStyle = 'rgba(80,40,160,.18)'; poly(g, [-16, -18, -8, -20, -6, -10, -14, -8]); poly(g, [0, -16, 8, -12, 4, -4, -4, -6]);
        break;
      case 'stars':
        for (i = 0; i < 9; i++) { star(g, -18 + R() * 34, -33 + R() * 26, 1.8 + R() * 1.2, 0.6, 4); g.fillStyle = i % 3 ? '#ffffff' : '#ffe066'; g.fill(); }
        break;
      case 'scales':
        g.strokeStyle = 'rgba(10,60,30,.45)'; g.lineWidth = 1.1;
        for (y = -32; y < -4; y += 5) for (x = -20 + (y % 2) * 2; x < 20; x += 6) { g.beginPath(); g.arc(x, y, 3, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
        break;
      case 'cracks':
        [[-18, -20, -10, -26, -6, -18, 2, -30], [4, -12, 10, -20, 18, -16], [-14, -10, -6, -6, 0, -12]].forEach(function (p) { line(g, p, '#ff7a1a', 3); line(g, p, '#ffe07a', 1.2); });
        break;
      case 'avocado': // Avocado-Kern auf dem Rücken
        g.fillStyle = '#f3f7a8'; ell(g, -3, -20, 10, 9);
        g.beginPath(); g.ellipse(-3, -20, 6, 5.6, 0, 0, TAU); sfill(g, '#8a5a2b', 1.2);
        g.fillStyle = 'rgba(255,255,255,.45)'; ell(g, -5, -22.5, 2.2, 1.4);
        break;
      case 'seeds': // Chili-Kerne und Glanz
        g.fillStyle = '#ffe7a8'; for (i = 0; i < 10; i++) { g.save(); g.translate(-18 + R() * 32, -32 + R() * 24); g.rotate(R() * 3); ell(g, 0, 0, 1.8, 1.1); g.restore(); }
        g.fillStyle = 'rgba(255,255,255,.5)'; g.save(); g.translate(-8, -30); g.rotate(-0.4); ell(g, 0, 0, 8, 2.2); g.restore();
        break;
      case 'fringe': // Papier-Fransen wie bei einer Piñata
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1;
        for (y = -34; y < -2; y += 6) { g.beginPath(); for (x = -24; x <= 26; x += 3) g.lineTo(x, y + ((x / 3) % 2 ? 2.2 : 0)); g.stroke(); }
        break;
      case 'tacofill': // Salat, Tomate und Käse oben drauf
        blob(g, [[-16, -34, 4.5], [-8, -37, 5], [1, -38, 5], [9, -36, 4.6], [16, -32, 3.8]], '#6fcf3a', 1.4);
        g.fillStyle = '#9be35a'; circ(g, -9, -38.5, 2); circ(g, 3, -39.5, 2);
        g.fillStyle = '#e8322e'; [[-12, -33], [-2, -35], [7, -33], [13, -30]].forEach(function (p) { circ(g, p[0], p[1], 2.4); });
        g.fillStyle = '#ffd23f'; [[-6, -31], [4, -30], [10, -28]].forEach(function (p) { g.save(); g.translate(p[0], p[1]); g.rotate(0.6); g.fillRect(-3, -0.8, 6, 1.6); g.restore(); });
        break;
      case 'swirl':
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.6;
        [[-8, -24, 6], [8, -18, 5], [-12, -12, 4]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], p[2], 0.2, 4.4); g.stroke(); });
        break;
    }
  }
  function drawBack(g, t, k, front) {
    switch (k) {
      case 'wings':
        if (front) return;
        [[-4, -30, -0.5], [4, -32, -0.2]].forEach(function (p, i) {
          g.save(); g.translate(p[0], p[1]); g.rotate(p[2]);
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-8, -14, -20, -12, -22, -4); g.bezierCurveTo(-16, -6, -14, 0, -18, 2); g.bezierCurveTo(-12, 2, -8, 4, 0, 2); g.closePath();
          sfill(g, i ? '#ffffff' : '#e6f3ff', 1.4); g.restore();
        });
        break;
      case 'icespikes':
        if (front) return;
        [[-12, -26], [-3, -31], [7, -30]].forEach(function (p, i) { g.beginPath(); g.moveTo(p[0] - 4, p[1] + 4); g.lineTo(p[0] + i - 1, p[1] - 10); g.lineTo(p[0] + 4, p[1] + 4); g.closePath(); sfill(g, '#bdf0ff', 1.3); });
        break;
      case 'mushrooms':
        if (!front) return;
        [[-10, -31, 5, '#e8402e'], [2, -34, 4, '#ffb02e'], [-1, -30, 0, 0]].forEach(function (p) {
          if (!p[2]) return;
          g.fillStyle = '#fff3e0'; rrect(g, p[0] - 1.4, p[1] - 1, 2.8, 5, 1); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
          g.beginPath(); g.ellipse(p[0], p[1] - 1, p[2], p[2] * 0.7, 0, Math.PI, 0); g.closePath(); sfill(g, p[3], 1.2);
          g.fillStyle = '#fff'; circ(g, p[0] - 1.5, p[1] - 2.6, 0.9); circ(g, p[0] + 1.6, p[1] - 2, 0.7);
        });
        break;
      case 'crystals':
        if (front) return;
        [[-12, -28, '#a98bff'], [-2, -33, '#d7c8ff'], [8, -30, '#8f6cf0']].forEach(function (p) {
          g.beginPath(); g.moveTo(p[0] - 3.5, p[1] + 5); g.lineTo(p[0] - 2.5, p[1] - 6); g.lineTo(p[0], p[1] - 10); g.lineTo(p[0] + 2.5, p[1] - 6); g.lineTo(p[0] + 3.5, p[1] + 5); g.closePath();
          sfill(g, p[2], 1.3); g.fillStyle = 'rgba(255,255,255,.6)'; poly(g, [p[0] - 1, p[1] + 3, p[0] - 1, p[1] - 6, p[0] + 0.3, p[1] - 8, p[0] + 0.3, p[1] + 3]);
        });
        break;
      case 'ring':
        g.save(); g.translate(0, -18); g.rotate(-0.25);
        g.beginPath(); if (front) g.ellipse(0, 0, 30, 7, 0, 0, Math.PI); else g.ellipse(0, 0, 30, 7, 0, Math.PI, TAU);
        g.strokeStyle = OUT; g.lineWidth = 5; g.stroke(); g.strokeStyle = '#ffd36b'; g.lineWidth = 3; g.stroke();
        g.restore();
        break;
      case 'dragon':
        if (!front) {
          g.save(); g.translate(-2, -30); g.rotate(-0.35);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, -16); g.lineTo(-14, -6); g.lineTo(-22, -10); g.lineTo(-20, 0); g.lineTo(-26, 0); g.lineTo(-14, 6); g.closePath();
          sfill(g, '#1f8a4a', 1.4); g.restore();
          // Schwanz
          g.beginPath(); g.moveTo(-18, -12); g.quadraticCurveTo(-30, -10, -32, -22); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#2fa85a'; g.stroke();
          g.beginPath(); g.moveTo(-32, -22); g.lineTo(-36, -28); g.lineTo(-28, -27); g.closePath(); sfill(g, '#ffd23f', 1.2);
        } else {
          [[-14, -26], [-7, -33], [1, -36], [9, -32]].forEach(function (p) { g.beginPath(); g.moveTo(p[0] - 2.5, p[1] + 2); g.lineTo(p[0], p[1] - 5); g.lineTo(p[0] + 2.5, p[1] + 2); g.closePath(); sfill(g, '#ffd23f', 1.1); });
        }
        break;
      case 'sunrays':
        if (front) return;
        for (var i = 0; i < 12; i++) {
          var a = i / 12 * TAU; g.save(); g.translate(19, -21); g.rotate(a);
          g.beginPath(); g.moveTo(9, -3); g.lineTo(16, 0); g.lineTo(9, 3); g.closePath(); sfill(g, i % 2 ? '#ffb000' : '#ffe14d', 1.1); g.restore();
        }
        break;
    }
  }
  function drawHead(g, t, k) {
    var c;
    switch (k) {
      case 'sombrero':
        g.beginPath(); g.ellipse(18.5, -30.5, 12.5, 3.8, -0.05, 0, TAU); sfill(g, '#f2c14e', 1.3);
        g.fillStyle = '#e8322e'; [[-9, 0], [-4.5, 2.2], [0, 2.8], [4.5, 2.2], [9, 0]].forEach(function (p) { circ(g, 18.5 + p[0], -30.5 + p[1] * 0.9, 1); });
        g.beginPath(); g.moveTo(13, -31.5); g.quadraticCurveTo(13.5, -42, 18.5, -42.5); g.quadraticCurveTo(23.5, -42, 24, -31.5); g.closePath(); sfill(g, '#f7d06a', 1.3);
        g.fillStyle = '#e8322e'; g.fillRect(13.3, -35, 10.4, 2.4); g.fillStyle = '#3fae4a'; g.fillRect(13.6, -35, 3.4, 2.4);
        break;
      case 'avocadohalf':
        g.save(); g.translate(17.5, -33); g.rotate(-0.3);
        g.beginPath(); g.ellipse(0, 0, 5, 6.2, 0, 0, TAU); sfill(g, '#3f7a22', 1.2); g.fillStyle = '#e9f29a'; ell(g, 0, 0.4, 3.8, 5);
        g.beginPath(); g.arc(0, 1.2, 2.3, 0, TAU); sfill(g, '#8a5a2b', 0.9); g.restore();
        break;
      case 'chilipepper':
        g.beginPath(); g.moveTo(13, -31); g.quadraticCurveTo(17, -41, 24, -38); g.quadraticCurveTo(20, -36, 15, -30); g.closePath(); sfill(g, '#e8221e', 1.2);
        g.fillStyle = 'rgba(255,255,255,.55)'; ell(g, 18, -37, 2.4, 0.8);
        line(g, [23.5, -38.4, 26, -40.5], '#2f8a2a', 1.8);
        break;
      case 'partyhat':
        g.beginPath(); g.moveTo(13.5, -30); g.lineTo(18, -45); g.lineTo(23, -30.5); g.closePath(); sfill(g, '#3fc7ff', 1.3);
        g.save(); g.beginPath(); g.moveTo(13.5, -30); g.lineTo(18, -45); g.lineTo(23, -30.5); g.closePath(); g.clip();
        ['#ff5fa2', '#ffd23f', '#7be05a'].forEach(function (cc, i) { g.fillStyle = cc; g.fillRect(10, -42 + i * 4.5, 16, 2.2); }); g.restore();
        g.beginPath(); g.moveTo(13.5, -30); g.lineTo(18, -45); g.lineTo(23, -30.5); g.closePath(); g.strokeStyle = OUT; g.lineWidth = 1.3; g.stroke();
        g.beginPath(); g.arc(18, -45.5, 2.4, 0, TAU); sfill(g, '#ff5fa2', 1);
        break;
      case 'daisy':
        for (c = 0; c < 6; c++) { var a = c / 6 * TAU; g.beginPath(); g.ellipse(14 + Math.cos(a) * 2.8, -32 + Math.sin(a) * 2.8, 2.1, 1.4, a, 0, TAU); sfill(g, '#ffffff', 0.9); }
        g.beginPath(); g.arc(14, -32, 1.7, 0, TAU); sfill(g, '#ffcf33', 0.9);
        break;
      case 'spike':
        g.beginPath(); g.moveTo(13, -28); g.lineTo(15, -37); g.lineTo(18, -30); g.lineTo(21, -38); g.lineTo(23, -29); g.closePath(); sfill(g, '#3b3937', 1.2);
        break;
      case 'cherry':
        line(g, [18, -33, 20, -38], '#3f8a3a', 1.2); g.beginPath(); g.arc(18, -32, 2.6, 0, TAU); sfill(g, '#e8202e', 1.1); g.fillStyle = '#fff'; circ(g, 17.2, -33, 0.7);
        break;
      case 'bow':
        g.beginPath(); g.moveTo(17, -31); g.lineTo(11, -35); g.lineTo(11, -27); g.closePath(); sfill(g, '#ff5f9a', 1.2);
        g.beginPath(); g.moveTo(17, -31); g.lineTo(23, -35); g.lineTo(23, -27); g.closePath(); sfill(g, '#ff5f9a', 1.2);
        g.beginPath(); g.arc(17, -31, 1.8, 0, TAU); sfill(g, '#ff8fb8', 1);
        break;
      case 'heart':
        g.save(); g.translate(24, -33); g.beginPath(); g.moveTo(0, 2.6); g.bezierCurveTo(-4.5, -0.5, -2.6, -4, 0, -1.8); g.bezierCurveTo(2.6, -4, 4.5, -0.5, 0, 2.6); g.closePath(); sfill(g, '#ff3d7f', 1); g.restore();
        break;
      case 'halo':
        g.beginPath(); g.ellipse(18, -37, 7, 2.2, -0.1, 0, TAU); g.strokeStyle = OUT; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = '#ffe14d'; g.lineWidth = 1.8; g.stroke();
        break;
      case 'leaf':
        line(g, [17, -30, 17, -34], '#2f6b3a', 1.2);
        g.save(); g.translate(17, -34); g.rotate(-0.6); g.beginPath(); g.ellipse(-3, 0, 4.5, 2.2, 0, 0, TAU); sfill(g, '#3fcf7a', 1); g.restore();
        g.save(); g.translate(17, -34); g.rotate(0.6); g.beginPath(); g.ellipse(3, 0, 4.5, 2.2, 0, 0, TAU); sfill(g, '#5ee39a', 1); g.restore();
        break;
      case 'raincloud':
        blob(g, [[14, -40, 3.6], [19, -42, 4.4], [24, -40, 3.4], [19, -38.5, 4]], '#ffffff', 2.6);
        g.fillStyle = '#5ab8ff'; [[15, -34], [20, -33], [24, -35]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1] - 2); g.quadraticCurveTo(p[0] + 1.4, p[1], p[0], p[1] + 0.8); g.quadraticCurveTo(p[0] - 1.4, p[1], p[0], p[1] - 2); g.fill(); });
        break;
      case 'flame':
        g.beginPath(); g.moveTo(12, -28); g.quadraticCurveTo(11, -36, 15, -41); g.quadraticCurveTo(16, -35, 18, -38); g.quadraticCurveTo(19, -44, 23, -46); g.quadraticCurveTo(22, -38, 26, -35); g.quadraticCurveTo(26, -30, 23, -27); g.closePath();
        sfill(g, '#ff6a1a', 1.3);
        g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(15, -28); g.quadraticCurveTo(16, -34, 19, -36); g.quadraticCurveTo(20, -32, 22, -33); g.quadraticCurveTo(23, -29, 21, -27); g.closePath(); g.fill();
        break;
      case 'scarf':
        g.beginPath(); g.ellipse(15, -13, 7, 3.2, 0.3, 0, TAU); sfill(g, '#e8402e', 1.3);
        g.beginPath(); rrect(g, 10, -13, 4, 9, 1.5); sfill(g, '#e8402e', 1.2);
        g.fillStyle = '#ffffff'; g.fillRect(10.5, -9, 3, 1.4); g.fillRect(12, -13.5, 6, 1.2);
        break;
      case 'antlers':
        line(g, [14, -28, 11, -36, 8, -38], OUT, 3.2); line(g, [11, -36, 13, -40], OUT, 3.2);
        line(g, [14, -28, 11, -36, 8, -38], '#8a5a32', 1.6); line(g, [11, -36, 13, -40], '#8a5a32', 1.6);
        line(g, [21, -29, 23, -37, 27, -39], OUT, 3.2); line(g, [23, -37, 22, -41], OUT, 3.2);
        line(g, [21, -29, 23, -37, 27, -39], '#8a5a32', 1.6); line(g, [23, -37, 22, -41], '#8a5a32', 1.6);
        break;
      case 'zap':
        g.beginPath(); g.moveTo(13, -28); g.lineTo(12, -38); g.lineTo(16, -33); g.lineTo(18, -42); g.lineTo(20, -33); g.lineTo(25, -38); g.lineTo(23, -28); g.closePath(); sfill(g, '#ffe24a', 1.3);
        break;
      case 'crown':
        g.beginPath(); g.moveTo(11, -29); g.lineTo(11, -38); g.lineTo(14.5, -34); g.lineTo(18, -40); g.lineTo(21.5, -34); g.lineTo(25, -38); g.lineTo(25, -29); g.closePath(); sfill(g, '#ffcc22', 1.4);
        g.fillStyle = '#e8202e'; circ(g, 18, -32.5, 1.5); g.fillStyle = '#3fb6ff'; circ(g, 13.5, -31.5, 1); circ(g, 22.5, -31.5, 1);
        break;
      case 'gem':
        g.beginPath(); g.moveTo(18, -27); g.lineTo(15, -31); g.lineTo(18, -34); g.lineTo(21, -31); g.closePath(); sfill(g, '#c4adff', 1.1);
        break;
      case 'moon':
        g.beginPath(); g.arc(18, -36, 5, 0.6, 5.2); g.arc(20.5, -37.5, 4, 4.7, 1.2, true); g.closePath(); sfill(g, '#ffe9a0', 1.3);
        g.fillStyle = '#5a63b8'; g.beginPath(); g.moveTo(10, -28); g.quadraticCurveTo(14, -36, 22, -31); g.lineTo(26, -27); g.closePath(); g.fill();
        break;
      case 'rainbowarc':
        ['#b36bff', '#5ab8ff', '#6bf08a', '#fff36b', '#ffc371', '#ff5f6d'].forEach(function (c, i) {
          g.beginPath(); g.arc(18, -28, 11 - i * 1.4, Math.PI * 1.05, Math.PI * 1.95); g.strokeStyle = c; g.lineWidth = 1.6; g.stroke();
        });
        g.beginPath(); g.arc(18, -28, 12, Math.PI * 1.05, Math.PI * 1.95); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
        blob(g, [[8, -29, 2.6], [10.5, -30.5, 2.4]], '#fff', 2); blob(g, [[28, -29, 2.6], [25.5, -30.5, 2.4]], '#fff', 2);
        break;
      case 'antenna':
        line(g, [16, -30, 13, -38], OUT, 2.4); line(g, [21, -30, 24, -38], OUT, 2.4);
        line(g, [16, -30, 13, -38], '#c9d2e0', 1); line(g, [21, -30, 24, -38], '#c9d2e0', 1);
        g.beginPath(); g.arc(13, -39, 2, 0, TAU); sfill(g, '#ff7ae0', 1); g.beginPath(); g.arc(24, -39, 2, 0, TAU); sfill(g, '#6bf08a', 1);
        break;
      case 'horns':
        g.beginPath(); g.moveTo(12, -27); g.quadraticCurveTo(8, -34, 10, -40); g.quadraticCurveTo(13, -34, 16, -29); g.closePath(); sfill(g, '#fff1c2', 1.2);
        g.beginPath(); g.moveTo(20, -28); g.quadraticCurveTo(22, -36, 27, -40); g.quadraticCurveTo(25, -33, 24, -27); g.closePath(); sfill(g, '#fff1c2', 1.2);
        break;
      case 'mohawk':
        for (c = 0; c < 5; c++) { g.beginPath(); g.moveTo(10 + c * 3, -28); g.lineTo(11 + c * 3, -36 - (c % 2) * 3); g.lineTo(13 + c * 3, -28); g.closePath(); sfill(g, c % 2 ? '#ffffff' : '#222222', 1); }
        break;
      case 'smoke':
        g.fillStyle = 'rgba(90,90,90,.85)'; circ(g, 16, -37, 3); circ(g, 19, -41, 3.6); circ(g, 23, -45, 4.2);
        break;
      case 'goggles':
        g.fillStyle = '#6b4424'; g.fillRect(10, -29.5, 17, 2.4);
        [[15, -29], [21.5, -29]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 3, 0, TAU); sfill(g, '#c98a12', 1.2); g.beginPath(); g.arc(p[0], p[1], 1.9, 0, TAU); g.fillStyle = '#9fe3ff'; g.fill(); g.fillStyle = '#fff'; circ(g, p[0] - 0.7, p[1] - 0.7, 0.6); });
        break;
      case 'stormcloud':
        blob(g, [[13, -41, 3.8], [18.5, -43.5, 4.6], [24, -41, 3.6], [18.5, -39.5, 4.2]], '#6b7389', 2.6);
        g.beginPath(); g.moveTo(19, -38); g.lineTo(16, -32); g.lineTo(19, -32); g.lineTo(17, -27); g.lineTo(23, -34); g.lineTo(20, -34); g.lineTo(22, -38); g.closePath(); sfill(g, '#ffe24a', 0.9);
        break;
      case 'diamond':
        g.beginPath(); g.moveTo(13, -37); g.lineTo(16, -40); g.lineTo(21, -40); g.lineTo(24, -37); g.lineTo(18.5, -29); g.closePath(); sfill(g, '#8fe6ff', 1.3);
        g.fillStyle = 'rgba(255,255,255,.75)'; poly(g, [16, -37, 18.5, -39.5, 21, -37, 18.5, -32]);
        break;
      case 'sunhat':
        g.beginPath(); g.ellipse(18, -30, 9, 2.4, 0, 0, TAU); sfill(g, '#f5d36b', 1.2);
        g.beginPath(); g.ellipse(18, -32, 5, 4, 0, Math.PI, TAU); g.closePath(); sfill(g, '#f5d36b', 1.2);
        g.fillStyle = '#ff6a2b'; g.fillRect(13, -32.3, 10, 1.6);
        break;
    }
  }
  function drawFace(g, t, mood, sleep) {
    var dark = lum(t.f) < 0.25, faceLine = dark ? 'rgba(255,255,255,.85)' : OUT;
    // Schnauze
    g.fillStyle = mix(t.f, '#ffffff', dark ? 0.22 : 0.35); ell(g, 22.5, -15.5, 5, 3.6);
    g.fillStyle = dark ? '#ffffff' : OUT; circ(g, 21.2, -16.6, 0.6); circ(g, 24, -16.6, 0.6);
    // Mund
    g.strokeStyle = faceLine; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath();
    if (mood === 'angry') { g.moveTo(20.5, -13.6); g.lineTo(24.5, -14.2); }
    else if (mood === 'cool') { g.moveTo(20.5, -14); g.quadraticCurveTo(23, -12.6, 25, -14.6); }
    else { g.arc(22.6, -15, 2.2, 0.25 * Math.PI, 0.8 * Math.PI); }
    g.stroke();
    // Bäckchen
    g.fillStyle = 'rgba(255,110,140,.55)'; ell(g, 14.8, -16.5, 2, 1.3);
    // Augen
    var E = [[16.8, -21.5, 2.9, 3.4], [22.6, -22, 2.6, 3.2]];
    if (sleep) {
      E.forEach(function (e) { g.beginPath(); g.arc(e[0], e[1], 2, 0.1 * Math.PI, 0.9 * Math.PI); g.strokeStyle = faceLine; g.lineWidth = 1.2; g.stroke(); });
      return;
    }
    if (mood === 'cool') {
      g.beginPath(); rrect(g, 13.4, -24.5, 6.6, 4.6, 2); sfill(g, '#141414', 1); g.beginPath(); rrect(g, 20.4, -24.8, 6.2, 4.4, 2); sfill(g, '#141414', 1);
      line(g, [20, -23, 20.4, -23], '#141414', 1.2);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(14.4, -23.8, 2, 1); g.fillRect(21.4, -24, 2, 1);
      return;
    }
    E.forEach(function (e, i) {
      g.beginPath(); g.ellipse(e[0], e[1], e[2], e[3], 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 0.9; g.stroke();
      if (mood === 'star') { star(g, e[0] + 0.5, e[1] + 0.3, 2.2, 0.9, 5); g.fillStyle = '#ffb000'; g.fill(); }
      else {
        g.fillStyle = '#1a1210'; ell(g, e[0] + 0.7, e[1] + 0.5, 1.75, 2.05);
        g.fillStyle = '#ffffff'; circ(g, e[0] + 1.3, e[1] - 0.4, 0.7);
      }
      if (mood === 'sleepy') { g.fillStyle = t.f; g.beginPath(); g.ellipse(e[0], e[1], e[2] + 0.3, e[3] + 0.3, 0, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill(); line(g, [e[0] - e[2], e[1], e[0] + e[2], e[1]], OUT, 0.9); }
      if (mood === 'angry') line(g, [e[0] - 2.8, e[1] - 4.2 - (i ? 0 : 0.8), e[0] + 2.4, e[1] - 3 + (i ? -0.8 : 0.4)], faceLine, 1.4);
      if (mood === 'lash') { line(g, [e[0] + 1.5, e[1] - 3, e[0] + 2.8, e[1] - 4.6], OUT, 0.9); line(g, [e[0] + 2.6, e[1] - 2, e[0] + 4, e[1] - 3.2], OUT, 0.9); }
    });
  }
  function drawSheepNew(g, t, frame, sleep) {
    var L = LOOK[t.id] || {}, a = frame ? 1.6 : -1.6;
    if (L.back) drawBack(g, t, L.back, false);
    // Beine
    var legC = mix(t.f, '#000000', 0.1);
    [[-11 - a, -1.5], [6 + a, -1.5]].forEach(function (p) { g.beginPath(); rrect(g, p[0] - 2.6, -10, 5.2, 10 + p[1], 2.4); sfill(g, mix(legC, '#000000', 0.25), 1.1); });
    [[-14 + a, 0], [10 - a, 0]].forEach(function (p) {
      g.beginPath(); rrect(g, p[0] - 2.8, -10, 5.6, 10.5, 2.5); sfill(g, legC, 1.2);
      g.fillStyle = mix(legC, '#000000', 0.45); rrect(g, p[0] - 2.8, -2, 5.6, 2.5, 1.2); g.fill();
    });
    // Körper
    g.save();
    bodyPath(g); g.strokeStyle = OUT; g.lineWidth = 2.6; g.stroke();
    bodyPath(g); g.fillStyle = woolFill(g, t); g.fill();
    bodyPath(g); g.clip();
    if (L.pat) drawPattern(g, t, L.pat);
    // weiche Wolle-Bögen
    g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 1.2;
    [[-10, -14, 5], [2, -20, 5], [10, -13, 4.5], [-4, -27, 4], [-16, -20, 3.5]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], p[2], 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); });
    g.fillStyle = 'rgba(0,0,0,.14)'; ell(g, 0, -2, 26, 7);
    g.fillStyle = 'rgba(255,255,255,.42)'; circ(g, -7, -30, 4.6); circ(g, 2, -33, 3.2); circ(g, -15, -21, 2.6);
    g.restore();
    if (L.back) drawBack(g, t, L.back, true);
    // Ohren
    var face = t.f;
    g.save(); g.translate(25, -27); g.rotate(0.7); g.beginPath(); g.ellipse(0, 0, 5, 2.4, 0, 0, TAU); sfill(g, mix(face, '#000000', 0.15), 1.2); g.restore();
    // Kopf
    g.beginPath(); g.ellipse(19.5, -20, 8.6, 9.6, 0.08, 0, TAU); sfill(g, face, 1.6);
    g.save(); g.translate(12.5, -27); g.rotate(-0.75); g.beginPath(); g.ellipse(0, 0, 5.2, 2.6, 0, 0, TAU); sfill(g, face, 1.2);
    g.fillStyle = '#ff9db5'; ell(g, 0.5, 0, 3, 1.2); g.restore();
    // Haarbüschel
    blob(g, [[15, -28.5, 4.2], [19.5, -30, 4.4], [23.5, -28, 3.4]], Array.isArray(t.w) ? t.w[0] : t.w, 2.4);
    drawFace(g, t, L.mood, sleep);
    if (L.head && !(sleep && L.head === 'goggles')) drawHead(g, t, L.head);
  }
  A.drawSheepNew = drawSheepNew;
  var SHEEP_BOX = [-40, -50, 34, 4];
  A.sheepSpr = function (t, frame, sleep, shadow) {
    var key = 'sh|' + t.id + frame + (sleep ? 1 : 0) + (shadow ? 1 : 0);
    return sprite(key, SHEEP_BOX, function (g) { drawSheepNew(g, t, frame, sleep); },
      shadow ? { silhouette: '#c2ccb6', olc: '#a3ae96', shade: false } : { sc: 3 });
  };
  var urls = {};
  A.sheepURL = function (t, shadow) {
    var k = t.id + (shadow ? 's' : '');
    if (!urls[k]) urls[k] = A.sheepSpr(t, 0, false, shadow).c.toDataURL();
    return urls[k];
  };
  A.drawSheep2 = function (ctx, t, x, y, frame, sleep, sc, flip) {
    A.blit(ctx, A.sheepSpr(t, frame, sleep), x, y, sc, flip, [17, 4.5]);
  };
  // Alte Schnittstelle (Statue nutzt sie)
  A.sheepSprite = function (t, frame, sleep, shadow) { return A.sheepSpr(t, frame, sleep, shadow).c; };

  /* ---------- Requisiten, Deko, Bäume, Haus, Wolf als Sprites ---------- */
  var PROP_BOX = { flower: [-8, -16, 8, 2], bush: [-15, -22, 15, 2], rock: [-13, -15, 13, 3], hay: [-15, -18, 15, 2], puddle: [-18, -9, 18, 4], lolli: [-9, -30, 9, 2],
    cloud: [-16, -22, 16, 2], leaf: [-12, -18, 12, 2], pine: [-13, -32, 13, 2], ice: [-9, -24, 9, 2], mushroom: [-10, -16, 10, 2], tree: [-20, -42, 20, 2],
    coin: [-10, -14, 18, 4], crystal: [-12, -26, 12, 2], planet: [-14, -22, 14, -2], fire: [-11, -24, 11, 3], acacia: [-22, -36, 22, 2], steam: [-17, -40, 17, 4],
    diamond: [-10, -19, 10, 2], sunflower: [-10, -30, 10, 2],
    avocado: [-13, -22, 13, 3], cactus: [-14, -38, 14, 2], chili: [-14, -24, 14, 2], papel: [-30, -42, 30, 2], pinatabig: [-18, -54, 18, 2], tacoprop: [-17, -18, 17, 3] };
  var PROP_ANIM = { fire: 0.7, steam: 2 };
  /* ---------- Gehege-Ausbau: Dinge, die mit jeder Stufe dazukommen ---------- */
  var PEN_ITEM = {
    trough: [[-25, -25, 25, 5], function (g) {
      g.beginPath(); rrect(g, -18, -6, 4, 9, 1); sfill(g, '#7a4a2a', 1.1); g.beginPath(); rrect(g, 14, -6, 4, 9, 1); sfill(g, '#7a4a2a', 1.1);
      g.beginPath(); g.moveTo(-21, -14); g.lineTo(21, -14); g.lineTo(17, -2); g.lineTo(-17, -2); g.closePath(); sfill(g, '#b9783f', 1.5);
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(-18, -8, 36, 1.4);
      blob(g, [[-12, -14, 4], [-5, -15.5, 4.5], [3, -15, 4.5], [11, -14.5, 4]], '#f2d46b', 1.1);
      g.fillStyle = '#c9a23a'; [[-9, -15], [0, -16], [8, -15]].forEach(function (p) { g.fillRect(p[0], p[1], 1.3, 3); });
    }],
    bucket: [[-14, -31, 14, 5], function (g) {
      g.beginPath(); g.moveTo(-9, -17); g.lineTo(9, -17); g.lineTo(7, 0); g.lineTo(-7, 0); g.closePath(); sfill(g, '#9aa3ad', 1.5);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-8.5, -11, 17, 1.5); g.fillRect(-7.8, -4, 15.6, 1.5);
      g.beginPath(); g.ellipse(0, -17, 9, 3, 0, 0, TAU); sfill(g, '#4fb3ff', 1.3);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-3, -17.5, 3, 0.9, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(0, -17, 9.5, Math.PI, 0); g.strokeStyle = OUT; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = '#c9d1db'; g.lineWidth = 1.2; g.stroke();
    }],
    flowerbox: [[-20, -22, 20, 5], function (g) {
      [-11, -4, 3, 10].forEach(function (x, i) { g.beginPath(); g.moveTo(x, -6); g.lineTo(x + 1, -11); g.strokeStyle = '#3f8a2e'; g.lineWidth = 1.6; g.stroke();
        blob(g, [[x + 1, -13, 2.6], [x + 3.2, -12, 2.3], [x - 1.2, -12, 2.3]], ['#ff6fae', '#ffd23f', '#ffffff', '#b36bff'][i], 0.9); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 1, -12.5, 1.1, 0, TAU); g.fill(); });
      g.beginPath(); rrect(g, -16, -8, 32, 9, 2); sfill(g, '#c46a3a', 1.4); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-14, -7, 28, 2);
    }],
    lantern: [[-10, -48, 13, 5], function (g) {
      g.beginPath(); rrect(g, -2, -40, 4, 40, 1); sfill(g, '#5a3a22', 1.2);
      g.beginPath(); g.moveTo(-1, -40); g.lineTo(7, -40); g.strokeStyle = OUT; g.lineWidth = 2.4; g.stroke();
      g.beginPath(); g.moveTo(5, -40); g.lineTo(5, -36); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
      g.beginPath(); rrect(g, 1, -36, 8, 11, 2); sfill(g, '#ffd86b', 1.3);
      g.fillStyle = '#fff6c0'; g.beginPath(); g.ellipse(5, -30.5, 2, 3, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(0, -36); g.lineTo(5, -40); g.lineTo(10, -36); g.closePath(); sfill(g, '#3a3a40', 1.1);
    }],
    shelter: [[-33, -53, 33, 5], function (g) {
      g.beginPath(); rrect(g, -24, -26, 48, 26, 2); sfill(g, '#c98a4a', 1.6);
      g.fillStyle = 'rgba(0,0,0,.14)'; for (var i = -18; i < 24; i += 8) g.fillRect(i, -25, 1.4, 24);
      g.beginPath(); g.moveTo(-11, 0); g.lineTo(-11, -16); g.quadraticCurveTo(0, -24, 11, -16); g.lineTo(11, 0); g.closePath(); sfill(g, '#3a2414', 1.3);
      blob(g, [[-6, -2, 4], [0, -3, 4.5], [6, -2, 4]], '#f2d46b', 1);
      g.beginPath(); g.moveTo(-30, -24); g.lineTo(0, -48); g.lineTo(30, -24); g.lineTo(26, -20); g.lineTo(0, -41); g.lineTo(-26, -20); g.closePath(); sfill(g, '#d9402e', 1.6);
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(-24, -26); g.lineTo(0, -45); g.lineTo(0, -42); g.lineTo(-22, -24); g.closePath(); g.fill();
    }],
    flag: [[-8, -80, 31, 5], function (g, col) {
      g.beginPath(); rrect(g, -1.8, -72, 3.6, 72, 1.4); sfill(g, '#e8c25a', 1.2);
      g.beginPath(); g.arc(0, -73, 3.2, 0, TAU); sfill(g, '#ffd23f', 1.1);
      g.beginPath(); g.moveTo(2, -70); g.quadraticCurveTo(14, -66, 27, -68); g.lineTo(20, -60); g.lineTo(27, -52); g.quadraticCurveTo(14, -51, 2, -54); g.closePath(); sfill(g, col || '#e8402e', 1.4);
      g.fillStyle = '#ffffff'; star(g, 12, -61, 4.5, 2, 5); g.fill();
    }]
  };
  A.drawPenItem = function (ctx, name, x, y, arg) {
    var it = PEN_ITEM[name]; if (!it) return;
    var s = sprite('pi|' + name + (arg || ''), it[0], function (g) { it[1](g, arg); }, { ol: 1.3 });
    A.blit(ctx, s, x, y, 1, false, [(it[0][2] - it[0][0]) * 0.36, 3]);
  };
  A.star = star;

  A.drawProp = function (ctx, name, arg, x, y, time) {
    var per = PROP_ANIM[name], fr = per ? Math.floor(((time % per) / per) * 8) : 0;
    var s = sprite('pr|' + name + (arg || '') + fr, PROP_BOX[name] || [-20, -40, 20, 4], function (g) { A.props[name](g, arg, per ? fr / 8 * per : 0); }, { ol: name === 'puddle' ? 0.9 : 1.4 });
    var b = PROP_BOX[name] || [-12, 0, 12, 0];
    A.blit(ctx, s, x, y, 1, false, name === 'puddle' ? null : [(b[2] - b[0]) * 0.38, 3.2]);
  };
  var DEKO_BOX = { heu: [-16, -20, 26, 8], fass: [-11, -26, 11, 2], blumen: [-20, -18, 20, 5], laterne: [-9, -44, 9, 2], pilz: [-20, -18, 20, 7], busch: [-15, -22, 15, 2],
    lampe: [-5, -56, 20, 2], brunnen: [-22, -48, 22, 4], vogel: [-20, -50, 20, 2], baum: [-20, -42, 20, 2], bank: [-19, -23, 19, 2], scheune: [-44, -76, 44, 2],
    muehle: [-36, -84, 36, 2], teich: [-36, -16, 36, 12], feuer: [-17, -32, 17, 6], statue: [-30, -62, 26, 2], leucht: [-14, -84, 98, 2], regenbrunnen: [-27, -50, 27, 6],
    kristallbaum: [-34, -98, 34, 6], drache: [-46, -102, 74, 6], ufo: [-26, -56, 26, 2],
    cupPokal: [-24, -72, 24, 4], cupFlagge: [-10, -78, 40, 4], cupBogen: [-44, -76, 44, 4], cupPodest: [-38, -40, 38, 4], cupStatue: [-30, -66, 30, 4],
    cupAmpel: [-14, -74, 14, 4], cupLorbeer: [-26, -64, 26, 4], cupKanone: [-30, -62, 34, 6], cupHufeisen: [-22, -62, 22, 4], cupMedaille: [-24, -76, 24, 4],
    kaktus: [-20, -54, 20, 4], papelgirlande: [-42, -58, 42, 4], sombrero: [-36, -40, 36, 6], gitarre: [-18, -66, 22, 4], pinatadeko: [-26, -74, 34, 4], tacotruck: [-50, -78, 52, 6] };
  var DEKO_ANIM = { cupFlagge: 1.5, cupAmpel: 3, cupKanone: 2, cupPokal: 2.5, muehle: 1.96, teich: 15.7, feuer: 0.7, vogel: 3.14, ufo: 3.14, leucht: 5.24, regenbrunnen: 1.25, kristallbaum: 2.1, drache: 3.14, papelgirlande: 3.14, gitarre: 2, pinatadeko: 2.5, tacotruck: 2 };
  A.dekoSpr = function (id, time, night) {
    var per = DEKO_ANIM[id], n = id === 'teich' ? 24 : 12, fr = per ? Math.floor(((time % per) / per) * n) : 0;
    var lit = night && SI.DK[id].light ? 1 : 0;
    return sprite('dk|' + id + fr + lit, DEKO_BOX[id], function (g) { A.deko[id](g, per ? fr / n * per : 0.5, !!lit); }, { ol: 1.5 });
  };
  A.drawDeko = function (ctx, id, x, y, time, night) {
    var b = DEKO_BOX[id], d = SI.DK[id];
    A.blit(ctx, A.dekoSpr(id, time, night), x, y, 1, false, id === 'teich' ? null : [d.rad * 0.9, d.rad * 0.28]);
  };
  var durl = {};
  A.dekoURL = function (d, shadowOnly) {
    var k = d.id + (shadowOnly ? 's' : '');
    if (durl[k]) return durl[k];
    var s = shadowOnly ? sprite('dks|' + d.id, DEKO_BOX[d.id], function (g) { A.deko[d.id](g, 0.5, false); }, { silhouette: '#c2ccb6', olc: '#a3ae96', shade: false }) : A.dekoSpr(d.id, 0.5, false);
    durl[k] = s.c.toDataURL(); return durl[k];
  };
  A.deko.statue = function (g) {
    g.beginPath(); rrect(g, -15, -16, 30, 16, 3); sfill(g, '#9aa0aa', 1.3);
    g.fillStyle = '#b8bec8'; ell(g, 0, -16, 15, 4);
    g.save(); g.translate(-4, -16); drawSheepNew(g, SI.T.gold, 0, false); g.restore();
  };
  /* ---------- Schafrennen-Cup: exklusive Deko (jede Woche eine, ohne Bonus) ---------- */
  function plinth(g, w, h, col) { g.beginPath(); rrect(g, -w / 2, -h, w, h, 3); sfill(g, col || '#8a5a3a', 1.4); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-w / 2 + 3, -h + 2, w - 6, 3); }
  var GOLD = function (g, y0, y1) { return vgrad(g, y0, y1, '#fff2a8', '#e0a400'); };
  A.deko.cupPokal = function (g, t) {
    plinth(g, 30, 12, '#5a3b8a');
    g.beginPath(); rrect(g, -9, -22, 18, 10, 2); fillOut(g, GOLD(g, -22, -12), 1.4);
    g.beginPath(); rrect(g, -3, -34, 6, 13, 2); fillOut(g, GOLD(g, -34, -21), 1.3);
    g.beginPath(); g.moveTo(-17, -66); g.lineTo(17, -66); g.quadraticCurveTo(16, -38, 0, -34); g.quadraticCurveTo(-16, -38, -17, -66); g.closePath(); fillOut(g, GOLD(g, -66, -34), 1.6);
    [-1, 1].forEach(function (d) { g.beginPath(); g.arc(d * 18, -56, 7, d > 0 ? -1.6 : 1.6 - Math.PI, d > 0 ? 1.4 : Math.PI + 1.7 - Math.PI, d < 0); g.strokeStyle = OUT; g.lineWidth = 4.5; g.stroke(); g.strokeStyle = '#ffd23f'; g.lineWidth = 2.4; g.stroke(); });
    g.fillStyle = '#fff'; g.font = '13px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#a06a00'; g.strokeText('1', 0, -52); g.fillText('1', 0, -52);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-8, -58, 3, 6, 0.2, 0, TAU); g.fill();
    var k = (Math.sin(t * 2.5) + 1) / 2; glint(g, 14, -68, 3 + k * 3); glint(g, -16, -40, 2 + (1 - k) * 2.5);
  };
  A.deko.cupFlagge = function (g, t) {
    line(g, [0, 0, 0, -76], OUT, 4.4); line(g, [0, 0, 0, -76], '#d8d8e0', 2.4);
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -77, 3.4, 0, TAU); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
    var w = function (x) { return Math.sin(t / 1.5 * TAU + x * 0.12) * 4; };
    for (var i = 0; i < 6; i++) for (var j = 0; j < 4; j++) {
      var x0 = 2 + i * 6, y0 = -72 + j * 6;
      g.beginPath(); g.moveTo(x0, y0 + w(x0)); g.lineTo(x0 + 6, y0 + w(x0 + 6)); g.lineTo(x0 + 6, y0 + 6 + w(x0 + 6)); g.lineTo(x0, y0 + 6 + w(x0)); g.closePath();
      g.fillStyle = (i + j) % 2 ? '#1c1c24' : '#ffffff'; g.fill();
    }
    g.beginPath(); g.moveTo(2, -72 + w(2)); for (var x = 2; x <= 38; x += 2) g.lineTo(x, -72 + w(x)); for (x = 38; x >= 2; x -= 2) g.lineTo(x, -48 + w(x)); g.closePath(); g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
  };
  A.deko.cupBogen = function (g) {
    [-38, 38].forEach(function (x) { g.beginPath(); rrect(g, x - 5, -62, 10, 62, 3); sfill(g, '#e8463c', 1.5); for (var y = -54; y < 0; y += 12) { g.fillStyle = '#fff'; g.fillRect(x - 4, y, 8, 5); } });
    g.beginPath(); rrect(g, -44, -76, 88, 18, 5); sfill(g, '#1c1c24', 1.6);
    for (var i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#fff' : '#1c1c24'; g.fillRect(-42 + i * 6, -74, 6, 3); g.fillStyle = i % 2 ? '#1c1c24' : '#fff'; g.fillRect(-42 + i * 6, -61, 6, 2.5); }
    g.fillStyle = '#ffd23f'; g.font = '13px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ZIEL', 0, -66.5);
    [[-30, -80, '#3fae4a'], [-10, -82, '#ffd23f'], [10, -82, '#3f8fe8'], [30, -80, '#ff5fa2']].forEach(function (b) { g.beginPath(); g.arc(b[0], b[1], 5, 0, TAU); sfill(g, b[2], 1.2); });
  };
  A.deko.cupPodest = function (g) {
    [[-24, 18, '#c9d3de', '2'], [0, 28, '#ffd23f', '1'], [24, 12, '#d89a5a', '3']].forEach(function (p) {
      g.beginPath(); rrect(g, p[0] - 12, -p[1], 24, p[1], 2); sfill(g, p[2], 1.5);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(p[0] - 10, -p[1] + 2, 20, 3);
      g.fillStyle = '#fff'; g.font = '12px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = OUT; g.lineWidth = 3; g.strokeText(p[3], p[0], -p[1] / 2); g.fillText(p[3], p[0], -p[1] / 2);
    });
    star(g, 0, -36, 7, 3, 5); fillOut(g, '#ffe24a', 1.3);
  };
  A.deko.cupStatue = function (g) {
    plinth(g, 40, 14, '#7a7f8a');
    g.fillStyle = '#ffd23f'; g.font = '8px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CUP', 0, -7);
    g.save(); g.translate(0, -14); drawSheepNew(g, SI.T.diamant || SI.T.gold, 2, false); g.restore();
    g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(200,230,255,.35)'; g.fillRect(-30, -66, 60, 52); g.restore();
    [[-14, -60], [12, -56]].forEach(function (p) { glint(g, p[0], p[1], 3.5); });
  };
  A.deko.cupAmpel = function (g, t) {
    line(g, [0, 0, 0, -30], OUT, 5); line(g, [0, 0, 0, -30], '#5a6270', 3);
    g.beginPath(); rrect(g, -10, -74, 20, 46, 6); sfill(g, '#2a2a35', 1.6);
    var ph = Math.floor(t % 3);
    [['#e8463c', 0], ['#ffd23f', 1], ['#3fe05a', 2]].forEach(function (l, i) {
      g.beginPath(); g.arc(0, -66 + i * 14, 5.4, 0, TAU); g.fillStyle = ph === i ? l[0] : 'rgba(255,255,255,.12)'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
      if (ph === i) { g.save(); g.globalAlpha = 0.35; g.fillStyle = l[0]; g.beginPath(); g.arc(0, -66 + i * 14, 9, 0, TAU); g.fill(); g.restore(); }
    });
  };
  A.deko.cupLorbeer = function (g) {
    line(g, [0, 0, 0, -22], OUT, 4.4); line(g, [0, 0, 0, -22], '#a0662f', 2.6);
    g.beginPath(); rrect(g, -12, -4, 24, 5, 2); sfill(g, '#8a5a3a', 1.2);
    for (var i = 0; i < 9; i++) [-1, 1].forEach(function (d) {
      var a = Math.PI / 2 + d * (0.35 + i * 0.29), x = Math.cos(a) * 20, y = -42 - Math.sin(a) * 20;
      g.save(); g.translate(x, y); g.rotate(a + d * 0.9); g.beginPath(); g.ellipse(0, 0, 6, 2.8, 0, 0, TAU); sfill(g, i % 2 ? '#4caf50' : '#2f8a3a', 1);
      g.restore();
    });
    g.beginPath(); g.moveTo(-6, -22); g.lineTo(-10, -12); g.lineTo(-3, -16); g.closePath(); sfill(g, '#e8463c', 1); g.beginPath(); g.moveTo(6, -22); g.lineTo(10, -12); g.lineTo(3, -16); g.closePath(); sfill(g, '#e8463c', 1);
    g.beginPath(); g.arc(0, -42, 9, 0, TAU); fillOut(g, GOLD(g, -51, -33), 1.4); g.fillStyle = '#a06a00'; g.font = '9px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 0, -42);
  };
  A.deko.cupKanone = function (g, t) {
    [[-14, -8], [10, -8]].forEach(function (w) { g.beginPath(); g.arc(w[0], w[1], 8, 0, TAU); sfill(g, '#8a5228', 1.4); g.fillStyle = '#d8a05a'; circ(g, w[0], w[1], 2.5); });
    g.save(); g.translate(-2, -20); g.rotate(-0.6); g.beginPath(); rrect(g, -10, -8, 36, 16, 6); sfill(g, '#3f8fe8', 1.6); g.fillStyle = '#ffd23f'; g.fillRect(4, -8, 4, 16); g.fillRect(16, -8, 4, 16);
    g.beginPath(); g.ellipse(26, 0, 3, 8, 0, 0, TAU); g.fillStyle = '#1c2a4a'; g.fill(); g.restore();
    var cols = ['#ff5fa2', '#ffd23f', '#3fc7ff', '#7be05a', '#b36bff', '#ff8a3a'];
    for (var i = 0; i < 12; i++) { var p = ((t / 2) + i / 12) % 1, a = -0.6 - 0.5 + (i % 5) * 0.25; var x = 18 + Math.cos(a) * p * 30, y = -38 + Math.sin(a) * p * 24 + p * p * 10;
      g.save(); g.translate(x, y); g.rotate(i + p * 6); g.fillStyle = cols[i % 6]; g.globalAlpha = 1 - p * 0.6; g.fillRect(-2, -1.2, 4, 2.4); g.restore(); }
  };
  A.deko.cupHufeisen = function (g) {
    line(g, [0, 0, 0, -24], OUT, 5); line(g, [0, 0, 0, -24], '#a0662f', 3);
    g.beginPath(); g.arc(0, -40, 17, Math.PI * 0.85, Math.PI * 2.15, false); g.strokeStyle = OUT; g.lineWidth = 12; g.stroke(); g.strokeStyle = GOLD(g, -58, -22); g.lineWidth = 8; g.stroke();
    g.fillStyle = '#a06a00'; for (var i = 0; i < 7; i++) { var a = Math.PI * 0.95 + i * Math.PI * 1.1 / 6; circ(g, Math.cos(a) * 17, -40 + Math.sin(a) * 17, 1.3); }
    glint(g, -12, -54, 4); glint(g, 14, -50, 3);
  };
  A.deko.cupMedaille = function (g) {
    line(g, [-10, 0, -10, -40], OUT, 4.4); line(g, [10, 0, 10, -40], OUT, 4.4); line(g, [-10, 0, -10, -40], '#8a5228', 2.4); line(g, [10, 0, 10, -40], '#8a5228', 2.4);
    g.beginPath(); g.moveTo(-14, -76); g.lineTo(-2, -48); g.lineTo(6, -52); g.lineTo(-4, -76); g.closePath(); sfill(g, '#e8463c', 1.3);
    g.beginPath(); g.moveTo(14, -76); g.lineTo(2, -48); g.lineTo(-6, -52); g.lineTo(4, -76); g.closePath(); sfill(g, '#3f8fe8', 1.3);
    g.beginPath(); g.arc(0, -38, 15, 0, TAU); fillOut(g, GOLD(g, -53, -23), 1.6);
    g.beginPath(); g.arc(0, -38, 10.5, 0, TAU); g.strokeStyle = '#c98a12'; g.lineWidth = 1.5; g.stroke();
    star(g, 0, -38, 7, 3, 5); fillOut(g, '#fff6c8', 1);
    glint(g, -9, -48, 3.5);
  };
  /* ---------- Taco Tuesday: Requisiten im Gehege ---------- */
  function cactusShape(g, x, y, h, s) { // Saguaro-Kaktus mit zwei Armen
    s = s || 1;
    g.beginPath(); rrect(g, x - 4.5 * s, y - h, 9 * s, h, 4.5 * s); sfill(g, '#3f9a4a', 1.3);
    g.beginPath(); g.moveTo(x - 4 * s, y - h * 0.45); g.quadraticCurveTo(x - 12 * s, y - h * 0.45, x - 11 * s, y - h * 0.75); g.lineTo(x - 7 * s, y - h * 0.75); g.quadraticCurveTo(x - 8 * s, y - h * 0.55, x - 4 * s, y - h * 0.58); g.closePath(); sfill(g, '#3f9a4a', 1.2);
    g.beginPath(); g.moveTo(x + 4 * s, y - h * 0.6); g.quadraticCurveTo(x + 12 * s, y - h * 0.6, x + 11 * s, y - h * 0.9); g.lineTo(x + 7 * s, y - h * 0.9); g.quadraticCurveTo(x + 8 * s, y - h * 0.7, x + 4 * s, y - h * 0.72); g.closePath(); sfill(g, '#3f9a4a', 1.2);
    line(g, [x - 1.2 * s, y - h + 4, x - 1.2 * s, y - 2], 'rgba(255,255,255,.35)', 1.2 * s);
    g.fillStyle = '#e9f5c8'; for (var i = 0; i < 5; i++) { circ(g, x + 2.5 * s, y - h + 5 + i * h / 6, 0.6 * s); }
  }
  A.props.avocado = function (g) {
    g.save(); g.rotate(-0.15);
    g.beginPath(); g.ellipse(0, -9, 11, 9, 0, 0, TAU); sfill(g, '#3f7a22', 1.3);
    g.fillStyle = '#d9ea8a'; ell(g, 0, -9, 8.4, 6.8); g.fillStyle = '#eef6b0'; ell(g, -1, -10, 6, 4.6);
    g.beginPath(); g.arc(1, -8, 4.2, 0, TAU); sfill(g, '#8a5a2b', 1.1); g.fillStyle = 'rgba(255,255,255,.4)'; circ(g, -0.2, -9.4, 1.3);
    g.restore();
  };
  A.props.cactus = function (g) {
    cactusShape(g, 0, 0, 34, 1);
    g.beginPath(); g.arc(0, -34.5, 2.6, 0, TAU); sfill(g, '#ff6fa8', 1);
  };
  A.props.chili = function (g) {
    blob(g, [[-7, -9, 7], [6, -9, 7], [0, -15, 8]], '#3f8f3c', 1.4);
    [[-6, -6, 0.4], [5, -11, -0.5], [0, -4, 0.1], [9, -5, -0.3], [-9, -13, 0.7]].forEach(function (p) {
      g.save(); g.translate(p[0], p[1]); g.rotate(p[2]);
      g.beginPath(); g.moveTo(0, -3); g.quadraticCurveTo(3, 2, 0, 7); g.quadraticCurveTo(-2, 1, 0, -3); g.closePath(); sfill(g, '#e8221e', 0.9);
      g.restore();
    });
  };
  var PAPEL = ['#ff5fa2', '#ffd23f', '#3fc7ff', '#7be05a', '#b36bff', '#ff8a3a'];
  function papelLine(g, x0, y0, x1, y1, sag, n, sway) {
    g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); g.stroke();
    for (var i = 1; i < n; i++) {
      var k = i / n, x = (1 - k) * (1 - k) * x0 + 2 * k * (1 - k) * (x0 + x1) / 2 + k * k * x1, y = (1 - k) * (1 - k) * y0 + 2 * k * (1 - k) * ((y0 + y1) / 2 + sag) + k * k * y1;
      g.save(); g.translate(x, y); g.rotate(Math.sin((sway || 0) + i) * 0.12);
      g.beginPath(); g.moveTo(-3.2, 0); g.lineTo(3.2, 0); g.lineTo(3.2, 7); g.lineTo(1.6, 5.6); g.lineTo(0, 7); g.lineTo(-1.6, 5.6); g.lineTo(-3.2, 7); g.closePath(); sfill(g, PAPEL[i % PAPEL.length], 0.8);
      g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, 0, 3, 0.9); g.restore();
    }
  }
  A.props.papel = function (g) {
    line(g, [-27, 0, -27, -38], '#7a4a2a', 2.4); line(g, [27, 0, 27, -38], '#7a4a2a', 2.4);
    papelLine(g, -27, -36, 27, -36, 8, 9, 0);
  };
  function starPinata(g, x, y, s, rot) { // Stern-Piñata mit Zacken und Bändern
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s);
    [0, 1, 2, 3, 4].forEach(function (i) { var a = i / 5 * TAU - Math.PI / 2; g.save(); g.rotate(a); g.beginPath(); g.moveTo(-4, -7); g.lineTo(0, -17); g.lineTo(4, -7); g.closePath(); sfill(g, PAPEL[i], 1.1); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-1.5, -14, 3, 1.4); g.restore(); });
    g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); sfill(g, '#ffd23f', 1.3);
    g.strokeStyle = '#ff5fa2'; g.lineWidth = 1.2; for (var k = -6; k <= 6; k += 3) { g.beginPath(); g.moveTo(-7, k); g.lineTo(7, k); g.stroke(); }
    [[-3, 15, '#ff5fa2'], [0, 17, '#3fc7ff'], [3, 15, '#7be05a']].forEach(function (p) { line(g, [p[0] * 0.6, 7, p[0], p[1]], p[2], 1.4); });
    g.restore();
  }
  A.props.pinatabig = function (g) {
    line(g, [-12, 0, -12, -50, 8, -50], '#7a4a2a', 2.6); line(g, [6, -50, 6, -44], '#5a3a1a', 0.9);
    starPinata(g, 6, -32, 0.75, 0.1);
  };
  function tacoShape(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    blob(g, [[-10, -9, 4.5], [-4, -12, 5], [3, -12.5, 5], [10, -9, 4.4]], '#6fcf3a', 1.3);
    g.fillStyle = '#e8322e'; circ(g, -6, -11, 2.3); circ(g, 4, -12, 2.3); g.fillStyle = '#ffd23f'; g.fillRect(-2, -12.5, 5, 1.6);
    g.beginPath(); g.moveTo(-15, -3); g.quadraticCurveTo(-14, -16, 0, -16); g.quadraticCurveTo(14, -16, 15, -3); g.quadraticCurveTo(0, 3, -15, -3); g.closePath();
    g.fillStyle = 'rgba(0,0,0,0)';
    g.beginPath(); g.moveTo(-15, -2); g.quadraticCurveTo(-13, -12, -2, -8); g.lineTo(2, -8); g.quadraticCurveTo(13, -12, 15, -2); g.quadraticCurveTo(0, 4, -15, -2); g.closePath(); sfill(g, '#f2b83a', 1.4);
    g.fillStyle = '#d9962a'; [[-8, -3], [-1, -1], [7, -3], [3, -4.5]].forEach(function (p) { circ(g, p[0], p[1], 0.9); });
    g.restore();
  }
  A.props.tacoprop = function (g) { tacoShape(g, 0, 0, 1.05); };

  /* ---------- Taco Tuesday: Deko ---------- */
  A.deko.kaktus = function (g) {
    g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, -12); g.lineTo(9, 2); g.lineTo(-9, 2); g.closePath(); sfill(g, '#d9733a', 1.4);
    g.beginPath(); rrect(g, -14, -15, 28, 5, 2); sfill(g, '#e88a4a', 1.2);
    g.fillStyle = '#ffd23f'; g.fillRect(-10, -7, 20, 2); g.fillStyle = '#3fc7ff'; g.fillRect(-9.5, -4, 19, 1.6);
    cactusShape(g, 0, -13, 34, 1.05);
    g.beginPath(); g.arc(-1, -47.5, 3, 0, TAU); sfill(g, '#ff5fa2', 1); g.fillStyle = '#ffd23f'; circ(g, -1, -47.5, 1);
  };
  A.deko.papelgirlande = function (g, t) {
    var sw = (t || 0) / 3.14 * TAU;
    [[-36, 0], [36, 0], [0, 0]].forEach(function (p, i) { if (i === 2) return; g.beginPath(); rrect(g, p[0] - 2, -50, 4, 50, 1.5); sfill(g, '#8a5a2b', 1.2); g.beginPath(); g.arc(p[0], -51, 3, 0, TAU); sfill(g, '#ffd23f', 1); });
    papelLine(g, -36, -48, 36, -48, 9, 11, sw);
    papelLine(g, -36, -36, 36, -36, 7, 10, sw + 1.5);
  };
  A.deko.sombrero = function (g) {
    g.beginPath(); g.ellipse(0, -8, 32, 11, 0, 0, TAU); sfill(g, '#f2c14e', 1.5);
    g.beginPath(); g.ellipse(0, -8, 32, 11, 0, 0, TAU); g.save(); g.clip(); g.fillStyle = 'rgba(160,90,20,.25)'; ell(g, 0, -2, 34, 9); g.restore();
    g.strokeStyle = '#e8322e'; g.lineWidth = 2.4; g.beginPath(); g.ellipse(0, -8, 28, 9, 0, 0, TAU); g.stroke();
    for (var i = 0; i < 14; i++) { var a = i / 14 * TAU; g.fillStyle = PAPEL[i % 6]; circ(g, Math.cos(a) * 25, -8 + Math.sin(a) * 8, 1.6); }
    g.beginPath(); g.moveTo(-14, -11); g.bezierCurveTo(-14, -30, -9, -36, 0, -36); g.bezierCurveTo(9, -36, 14, -30, 14, -11); g.quadraticCurveTo(0, -6, -14, -11); g.closePath();
    var cg = g.createLinearGradient(-14, 0, 14, 0); cg.addColorStop(0, '#ffe08a'); cg.addColorStop(1, '#d9a032'); sfill(g, cg, 1.5);
    g.beginPath(); g.moveTo(-13.6, -19); g.quadraticCurveTo(0, -14, 13.6, -19); g.lineTo(13.8, -14); g.quadraticCurveTo(0, -9, -13.8, -14); g.closePath(); sfill(g, '#e8322e', 1.1);
    g.fillStyle = '#3fae4a'; [-8, 0, 8].forEach(function (x) { poly(g, [x - 2.5, -15.5, x, -18.5, x + 2.5, -15.5, x, -12.5]); });
    g.fillStyle = 'rgba(255,255,255,.4)'; ell(g, -6, -29, 3, 5);
  };
  A.deko.gitarre = function (g, t) {
    var ph = (t || 0) / 2 * TAU;
    line(g, [-8, 0, 0, -14, 8, 0], '#5a3a1a', 2.2);
    g.save(); g.translate(0, -8); g.rotate(-0.12);
    g.beginPath(); rrect(g, -2.5, -50, 5, 30, 1.5); sfill(g, '#6b3a1a', 1.2);
    g.beginPath(); rrect(g, -4.5, -56, 9, 8, 2); sfill(g, '#8a4a22', 1.2);
    g.fillStyle = '#f4f1e6'; [[-4.5, -54], [-4.5, -50], [4.5, -54], [4.5, -50]].forEach(function (p) { circ(g, p[0], p[1], 1.2); });
    g.beginPath(); g.moveTo(0, -22); g.bezierCurveTo(-12, -24, -11, -12, -7, -10); g.bezierCurveTo(-14, -6, -12, 6, 0, 6); g.bezierCurveTo(12, 6, 14, -6, 7, -10); g.bezierCurveTo(11, -12, 12, -24, 0, -22); g.closePath();
    var bg = g.createLinearGradient(-12, -20, 12, 6); bg.addColorStop(0, '#ffcf7a'); bg.addColorStop(1, '#d9862a'); sfill(g, bg, 1.4);
    g.beginPath(); g.arc(0, -6, 4, 0, TAU); sfill(g, '#3a2210', 1.1);
    g.strokeStyle = '#e8322e'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, -6, 6, 0, TAU); g.stroke();
    g.beginPath(); rrect(g, -4, 1, 8, 2.4, 1); sfill(g, '#3a2210', 0.8);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.5; for (var s = -1.5; s <= 1.5; s += 1) { g.beginPath(); g.moveTo(s, -50); g.lineTo(s * 1.4, 2); g.stroke(); }
    g.restore();
    // Musiknoten schweben hoch
    for (var k = 0; k < 2; k++) {
      var q = ((ph / TAU) + k * 0.5) % 1; g.globalAlpha = Math.sin(q * Math.PI);
      var nx = 9 + k * 3 + Math.sin(q * 6) * 2, ny = -26 - q * 26;
      g.fillStyle = k ? '#ff5fa2' : '#3fc7ff'; g.beginPath(); g.ellipse(nx, ny, 2.4, 1.8, -0.4, 0, TAU); g.fill(); g.strokeStyle = OUT; g.lineWidth = 0.8; g.stroke();
      line(g, [nx + 2, ny, nx + 2, ny - 7, nx + 4.5, ny - 5], OUT, 0.9); g.globalAlpha = 1;
    }
  };
  A.deko.pinatadeko = function (g, t) {
    var sw = Math.sin((t || 0) / 2.5 * TAU) * 0.18;
    g.beginPath(); rrect(g, -20, -4, 14, 6, 2); sfill(g, '#8a5a2b', 1.2);
    g.beginPath(); rrect(g, -15, -70, 4, 68, 1.5); sfill(g, '#9a6a3a', 1.3);
    g.beginPath(); rrect(g, -15, -70, 34, 4, 1.5); sfill(g, '#9a6a3a', 1.3);
    g.save(); g.translate(12, -66); g.rotate(sw);
    line(g, [0, 0, 0, 14], '#5a3a1a', 1);
    starPinata(g, 0, 32, 1, -sw * 0.5);
    g.restore();
    g.fillStyle = PAPEL[0]; poly(g, [6, -2, 9, -4, 10, -1]); g.fillStyle = PAPEL[2]; poly(g, [14, 0, 17, -3, 18, 1]); g.fillStyle = PAPEL[1]; circ(g, 3, -1, 1.4);
  };
  A.deko.tacotruck = function (g, t, night) {
    var ph = (t || 0) / 2 * TAU;
    // Wagen
    g.beginPath(); rrect(g, -46, -46, 76, 38, 6); var wg = g.createLinearGradient(0, -46, 0, -8); wg.addColorStop(0, '#ffd86a'); wg.addColorStop(1, '#f2a32a'); sfill(g, wg, 1.6);
    g.beginPath(); g.moveTo(30, -40); g.lineTo(42, -40); g.quadraticCurveTo(48, -38, 48, -30); g.lineTo(48, -8); g.lineTo(30, -8); g.closePath(); sfill(g, '#ffc23a', 1.5);
    g.beginPath(); g.moveTo(32, -37); g.lineTo(41, -37); g.quadraticCurveTo(45, -35, 45, -28); g.lineTo(32, -28); g.closePath(); sfill(g, night ? '#fff2a8' : '#a8e4ff', 1.2);
    g.fillStyle = '#e8322e'; g.fillRect(-46, -22, 94, 4); g.fillStyle = '#3fae4a'; g.fillRect(-46, -18, 94, 3);
    // Fenster mit Markise
    g.beginPath(); rrect(g, -38, -40, 52, 16, 3); sfill(g, night ? '#fff2a8' : '#5a3a2a', 1.3);
    if (!night) { g.fillStyle = '#ffd2a8'; circ(g, -14, -31, 4); g.fillStyle = '#3a2a5e'; g.fillRect(-19, -38, 10, 3); }
    for (var i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-40 + i * 8, -46); g.lineTo(-32 + i * 8, -46); g.lineTo(-32 + i * 8, -42); g.quadraticCurveTo(-36 + i * 8, -38.5, -40 + i * 8, -42); g.closePath(); sfill(g, i % 2 ? '#ffffff' : '#3fae4a', 1); }
    g.beginPath(); rrect(g, -42, -26, 60, 3, 1); sfill(g, '#c9a070', 1);
    // Taco auf dem Dach + Schild
    g.beginPath(); rrect(g, -30, -54, 40, 8, 3); sfill(g, '#e8322e', 1.3);
    g.fillStyle = '#fff'; g.font = '7px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TACOS', -10, -49.6);
    tacoShape(g, -10, -54, 0.9 + Math.sin(ph) * 0.03);
    // Räder
    [[-28, -6], [30, -6]].forEach(function (w) { g.beginPath(); g.arc(w[0], w[1], 8, 0, TAU); sfill(g, '#2e2a2a', 1.4); g.beginPath(); g.arc(w[0], w[1], 3.5, 0, TAU); sfill(g, '#c9ced8', 1); });
    // Lichterkette
    for (var k = 0; k < 9; k++) { var on = night ? 0.6 + 0.4 * Math.sin(ph * 2 + k) : 0.85; g.fillStyle = mix(PAPEL[k % 6], '#ffffff', night ? 0.35 * on : 0); circ(g, -42 + k * 10, -45 + Math.sin(k * 1.3) * 1.2, 1.9); }
    // Dampf aus dem Fenster
    for (var s = 0; s < 2; s++) { var q = ((ph / TAU) + s * 0.5) % 1; g.globalAlpha = 0.6 * (1 - q); g.fillStyle = '#ffffff'; circ(g, 6 + s * 4 + q * 4, -40 - q * 18, 2.4 + q * 3); }
    g.globalAlpha = 1;
  };

  /* ---------- Mythische Deko, extra aufwendig (Kai: "100 mal besser") ---------- */
  // facettierter Kristall: Spitze nach oben, linke Seite hell, rechte Seite dunkel
  function crystal(g, x, y, h, w, ang, col, glow) {
    g.save(); g.translate(x, y); g.rotate(ang);
    var hi = mix(col, '#ffffff', 0.55 + glow * 0.2), lo = mix(col, '#2a1250', 0.35 - glow * 0.15);
    g.beginPath(); g.moveTo(0, -h); g.lineTo(w, -h * 0.62); g.lineTo(w * 0.8, 0); g.lineTo(-w * 0.8, 0); g.lineTo(-w, -h * 0.62); g.closePath();
    var gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, hi); gr.addColorStop(0.5, col); gr.addColorStop(1, lo);
    sfill(g, gr, 1.1);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -h); g.lineTo(-w, -h * 0.62); g.lineTo(-w * 0.35, -h * 0.55); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,10,70,.22)'; g.beginPath(); g.moveTo(0, -h); g.lineTo(w, -h * 0.62); g.lineTo(w * 0.8, 0); g.lineTo(w * 0.15, 0); g.lineTo(w * 0.2, -h * 0.58); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-w * 0.35, -h * 0.55); g.lineTo(-w * 0.3, -h * 0.08); g.stroke();
    g.restore();
  }
  function sparkle(g, x, y, r, a) { g.globalAlpha = a; g.fillStyle = '#ffffff'; star(g, x, y, r, r * 0.28, 4); g.fill(); g.globalAlpha = 1; }
  A.deko.kristallbaum = function (g, t, night) {
    t = t || 0; var gl = night ? 1 : 0, ph = t / 2.1 * TAU;
    // Felsen mit kleinen Kristallen
    g.beginPath(); g.moveTo(-26, 2); g.quadraticCurveTo(-30, -8, -20, -12); g.quadraticCurveTo(-12, -18, -2, -13); g.quadraticCurveTo(8, -19, 18, -12);
    g.quadraticCurveTo(29, -8, 26, 2); g.closePath();
    var rg = g.createLinearGradient(0, -18, 0, 2); rg.addColorStop(0, '#8d82a8'); rg.addColorStop(1, '#4e4566'); sfill(g, rg, 1.4);
    g.fillStyle = '#a99fc4'; ell(g, -14, -11, 5, 2); ell(g, 10, -12, 6, 2);
    crystal(g, -21, -6, 13, 4, -0.5, '#7fd8ff', gl); crystal(g, 22, -5, 11, 3.5, 0.55, '#ff9ad5', gl); crystal(g, 13, -9, 8, 3, 0.2, '#c4adff', gl);
    // Stamm aus Silber-Kristall, gedreht, mit zwei Ästen
    g.beginPath(); g.moveTo(-7, -11); g.bezierCurveTo(-6, -26, -10, -36, -4, -48); g.lineTo(3, -48); g.bezierCurveTo(0, -36, 6, -24, 6, -11); g.closePath();
    var tg = g.createLinearGradient(-8, 0, 8, 0); tg.addColorStop(0, '#f4f0ff'); tg.addColorStop(0.45, '#b9aee0'); tg.addColorStop(1, '#6f62a0'); sfill(g, tg, 1.3);
    line(g, [-3, -14, -1, -24, -5, -34, -1, -44], 'rgba(255,255,255,.65)', 1);
    g.beginPath(); g.moveTo(-4, -34); g.quadraticCurveTo(-14, -38, -19, -50); g.lineTo(-15, -51); g.quadraticCurveTo(-11, -42, -2, -39); g.closePath(); sfill(g, '#a79bd6', 1.1);
    g.beginPath(); g.moveTo(3, -30); g.quadraticCurveTo(13, -33, 18, -46); g.lineTo(21, -44); g.quadraticCurveTo(16, -32, 4, -25); g.closePath(); sfill(g, '#8f82c4', 1.1);
    // Krone: viele Kristalle strahlenförmig, hinten dunkler, vorne heller
    var cols = ['#b08cff', '#62d0ff', '#ff86c8', '#8ff0e0'];
    var back = [[-26, -58, -1.0, 20], [26, -60, 1.0, 20], [-16, -76, -0.5, 22], [16, -77, 0.5, 22], [0, -84, 0, 22], [-30, -44, -1.4, 14], [30, -46, 1.35, 14]];
    back.forEach(function (c, i) { crystal(g, c[0] * 0.55, c[1] + 12, c[3], c[3] * 0.32, c[2], mix(cols[i % 4], '#3a2470', 0.25), gl); });
    var front = [[-20, -52, -0.9, 18], [20, -53, 0.9, 18], [-9, -66, -0.35, 22], [9, -66, 0.35, 22], [0, -74, 0, 24], [-24, -40, -1.35, 13], [24, -41, 1.3, 13], [0, -52, 0, 14]];
    front.forEach(function (c, i) { crystal(g, c[0] * 0.5, c[1] + 10, c[3], c[3] * 0.34, c[2], cols[(i + 1) % 4], gl); });
    // leuchtender Herz-Kristall in der Mitte, pulsiert
    var pul = 0.5 + 0.5 * Math.sin(ph);
    g.beginPath(); g.moveTo(0, -60); g.lineTo(6, -52); g.lineTo(0, -42); g.lineTo(-6, -52); g.closePath();
    var hg = g.createRadialGradient(-1, -54, 1, 0, -52, 9); hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.45, mix('#ffd6f4', '#ff6fc8', pul * 0.6)); hg.addColorStop(1, '#b0309a');
    sfill(g, hg, 1.2);
    // hängende Leuchtperlen
    [[-14, -40], [13, -39], [-6, -36], [6, -35]].forEach(function (p, i) {
      line(g, [p[0], p[1] - 6, p[0], p[1]], 'rgba(230,220,255,.9)', 0.6);
      var on = 0.5 + 0.5 * Math.sin(ph + i * 1.6);
      g.fillStyle = mix('#d9c8ff', '#fff6a8', night ? on : on * 0.4); circ(g, p[0], p[1] + 1.4, 1.9);
    });
    // Funkeln, das um den Baum kreist
    for (var i = 0; i < 6; i++) {
      var a = ph + i / 6 * TAU, rr = 22 + (i % 2) * 6;
      var sx = Math.cos(a) * rr, sy = -58 + Math.sin(a) * rr * 0.45 - (i % 3) * 4;
      sparkle(g, sx, sy, 2.2 + (i % 2) * 1.2 + gl, 0.55 + 0.45 * Math.max(0, Math.sin(a * 2 + i)));
    }
    sparkle(g, 0, -92, 4 + pul * 2 + gl, 0.9);
  };
  A.deko.drache = function (g, t, night) {
    t = t || 0; var ph = t / 3.14 * TAU;
    var J = '#2fae62', JD = '#167a43', JL = '#7fe39b', GO = '#ffcf3a', GD = '#c98a12';
    // Sockel: zwei Stufen Stein, goldene Kante, roter Edelstein
    g.beginPath(); rrect(g, -38, -10, 76, 12, 3); var sg = g.createLinearGradient(0, -10, 0, 2); sg.addColorStop(0, '#9aa0ae'); sg.addColorStop(1, '#5d6372'); sfill(g, sg, 1.4);
    g.fillStyle = '#b6bcc8'; ell(g, 0, -10, 37, 4);
    g.beginPath(); rrect(g, -30, -21, 60, 12, 3); var sg2 = g.createLinearGradient(0, -21, 0, -9); sg2.addColorStop(0, '#b0b6c2'); sg2.addColorStop(1, '#6e7484'); sfill(g, sg2, 1.4);
    g.fillStyle = GO; g.fillRect(-30, -14, 60, 2.4); g.fillStyle = GD; g.fillRect(-30, -11.6, 60, 0.9);
    g.fillStyle = '#c9ced8'; ell(g, 0, -21, 29, 3.6);
    g.beginPath(); g.moveTo(0, -18.5); g.lineTo(4, -15); g.lineTo(0, -11); g.lineTo(-4, -15); g.closePath(); sfill(g, '#e8323f', 0.9);
    g.fillStyle = '#ffd0d4'; poly(g, [-1, -17, 1.5, -15, -1, -14]);
    // Schwanz mit Pfeilspitze
    g.beginPath(); g.moveTo(-8, -26); g.bezierCurveTo(-26, -24, -36, -26, -36, -36); g.bezierCurveTo(-36, -42, -30, -44, -27, -41);
    g.bezierCurveTo(-30, -38, -30, -32, -22, -30); g.bezierCurveTo(-16, -29, -10, -30, -6, -32); g.closePath(); sfill(g, J, 1.3);
    g.beginPath(); g.moveTo(-27, -41); g.lineTo(-21, -50); g.lineTo(-32, -47); g.closePath(); sfill(g, GO, 1.1);
    // hinterer Flügel (dunkler)
    g.beginPath(); g.moveTo(-2, -48); g.lineTo(-12, -90); g.quadraticCurveTo(-22, -80, -40, -78); g.quadraticCurveTo(-34, -70, -42, -60); g.quadraticCurveTo(-30, -58, -28, -50); g.quadraticCurveTo(-16, -50, -6, -40); g.closePath();
    sfill(g, '#1f6a4a', 1.3);
    line(g, [-12, -90, -28, -50], '#134a32', 1.2); line(g, [-12, -90, -40, -78], '#134a32', 1); line(g, [-12, -90, -42, -60], '#134a32', 1);
    // Körper
    g.beginPath(); g.moveTo(-14, -22); g.bezierCurveTo(-20, -34, -12, -46, 2, -48); g.bezierCurveTo(12, -48, 16, -38, 14, -26); g.bezierCurveTo(10, -21, -6, -20, -14, -22); g.closePath();
    var bg = g.createLinearGradient(-16, -48, 14, -22); bg.addColorStop(0, JL); bg.addColorStop(0.5, J); bg.addColorStop(1, JD); sfill(g, bg, 1.4);
    // Bauchschuppen
    g.beginPath(); g.moveTo(4, -46); g.bezierCurveTo(12, -40, 12, -30, 6, -22); g.lineTo(-2, -22); g.bezierCurveTo(4, -30, 4, -40, 0, -46); g.closePath(); sfill(g, '#f3e08a', 1);
    g.strokeStyle = '#c9a94a'; g.lineWidth = 0.8; for (var i = 0; i < 5; i++) { var yy = -42 + i * 4.4; g.beginPath(); g.moveTo(1 + i * 0.6, yy); g.lineTo(9 - i * 0.4, yy + 1); g.stroke(); }
    // Rückenschuppen-Muster
    g.fillStyle = 'rgba(255,255,255,.22)'; [[-8, -40], [-4, -34], [-10, -30], [-2, -42], [-6, -26]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 2.4, Math.PI, 0); g.fill(); });
    // Hinterbein
    g.beginPath(); g.ellipse(-8, -28, 8, 9, -0.3, 0, TAU); sfill(g, J, 1.3);
    g.beginPath(); rrect(g, -12, -24, 9, 5, 2); sfill(g, JD, 1.1);
    g.fillStyle = '#f4f1e6'; poly(g, [-12, -19.5, -13.5, -21.5, -11, -21]); poly(g, [-8, -19.5, -9, -21.8, -6.5, -21]);
    // Hals und Kopf
    g.beginPath(); g.moveTo(2, -46); g.bezierCurveTo(4, -56, 10, -62, 16, -64); g.lineTo(22, -58); g.bezierCurveTo(16, -54, 14, -48, 13, -38); g.closePath(); sfill(g, J, 1.3);
    [0, 1, 2, 3, 4, 5].forEach(function (i) { var px = -10 + i * 4.2, py = -47 - Math.sin(i / 5 * 2.4) * 8 - i * 1.6; g.beginPath(); g.moveTo(px - 2.4, py + 1); g.lineTo(px - 1, py - 4.5); g.lineTo(px + 2, py + 1.5); g.closePath(); sfill(g, GO, 0.9); });
    var open = Math.max(0, Math.sin(ph)) * 3;
    g.beginPath(); g.moveTo(13, -66); g.bezierCurveTo(16, -73, 26, -72, 30, -67); g.lineTo(40, -64); g.quadraticCurveTo(43, -61, 40, -59); g.lineTo(26, -58 - open * 0.2); g.bezierCurveTo(20, -55, 14, -58, 13, -66); g.closePath();
    var hg = g.createLinearGradient(14, -72, 34, -58); hg.addColorStop(0, JL); hg.addColorStop(1, J); sfill(g, hg, 1.3);
    g.beginPath(); g.moveTo(24, -58); g.lineTo(39, -58 + open); g.quadraticCurveTo(36, -54 + open, 26, -54); g.closePath(); sfill(g, JD, 1.1);
    if (open > 0.6) { g.fillStyle = '#7a1520'; poly(g, [26, -58, 38, -58.5 + open * 0.3, 38, -57 + open * 0.8]); }
    g.fillStyle = '#ffffff'; poly(g, [30, -58.5, 31.5, -56.5, 33, -58.5]); poly(g, [35, -58.6, 36.2, -56.8, 37.4, -58.6]);
    g.fillStyle = OUT; circ(g, 38.5, -63.2, 0.8);
    // Hörner aus Gold
    g.beginPath(); g.moveTo(17, -69); g.quadraticCurveTo(8, -74, 4, -84); g.quadraticCurveTo(12, -78, 21, -71); g.closePath(); sfill(g, GO, 1.1);
    g.beginPath(); g.moveTo(22, -71); g.quadraticCurveTo(18, -80, 20, -88); g.quadraticCurveTo(23, -80, 26, -71); g.closePath(); sfill(g, GD, 1.1);
    g.beginPath(); g.moveTo(14, -63); g.lineTo(8, -60); g.lineTo(13, -59); g.closePath(); sfill(g, GO, 0.9);
    // Auge (leuchtet nachts)
    g.beginPath(); g.ellipse(25, -66, 3.2, 2.2, -0.2, 0, TAU); sfill(g, night ? '#fff27a' : '#ffd23f', 0.9);
    g.fillStyle = OUT; g.beginPath(); g.ellipse(25.6, -66, 0.8, 1.9, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; circ(g, 24.2, -66.8, 0.6);
    // Vorderbein mit Krallen
    g.beginPath(); g.moveTo(6, -36); g.bezierCurveTo(12, -34, 14, -26, 12, -20); g.lineTo(5, -20); g.bezierCurveTo(6, -26, 4, -30, 2, -32); g.closePath(); sfill(g, J, 1.2);
    g.fillStyle = '#f4f1e6'; poly(g, [12, -20, 14.5, -20.5, 12.5, -22.5]); poly(g, [8.5, -19.8, 10.5, -20.8, 8.5, -22.6]);
    // vorderer Flügel (heller, mit Fingern)
    g.beginPath(); g.moveTo(-4, -46); g.quadraticCurveTo(-4, -70, 4, -94); g.quadraticCurveTo(-8, -84, -22, -86); g.quadraticCurveTo(-18, -76, -30, -72); g.quadraticCurveTo(-20, -64, -24, -56); g.quadraticCurveTo(-12, -54, -8, -42); g.closePath();
    var wg = g.createLinearGradient(-26, -90, -4, -46); wg.addColorStop(0, '#5fd88f'); wg.addColorStop(1, '#2a9a5c'); sfill(g, wg, 1.3);
    g.fillStyle = 'rgba(255,240,170,.28)'; g.beginPath(); g.moveTo(4, -94); g.quadraticCurveTo(-8, -84, -22, -86); g.quadraticCurveTo(-10, -72, -4, -50); g.quadraticCurveTo(-4, -72, 4, -94); g.fill();
    line(g, [4, -94, -24, -56], JD, 1.2); line(g, [4, -94, -22, -86], JD, 1.1); line(g, [4, -94, -30, -72], JD, 1.1);
    g.fillStyle = GO; poly(g, [4, -94, 7, -99, 6, -92]);
    // Feueratem mit Rauch
    var f = Math.sin(ph);
    if (f > 0.15) {
      var L = 10 + f * 18, fl = Math.sin(ph * 5) * 1.5;
      g.beginPath(); g.moveTo(40, -61); g.quadraticCurveTo(44 + L * 0.4, -70 + fl, 36 + L, -66 - fl); g.quadraticCurveTo(42 + L, -65, 46 + L, -60); g.quadraticCurveTo(42 + L, -55, 36 + L, -53 + fl); g.quadraticCurveTo(44 + L * 0.4, -51, 40, -59); g.closePath();
      var fg = g.createLinearGradient(40, 0, 42 + L, 0); fg.addColorStop(0, '#fff6b0'); fg.addColorStop(0.35, '#ffb02e'); fg.addColorStop(1, '#e8401c'); sfill(g, fg, 1);
      g.fillStyle = 'rgba(255,255,220,.85)'; ell(g, 44 + L * 0.2, -60, 3 + f * 2, 1.6);
    } else {
      for (var k = 0; k < 3; k++) { var q = ((t * 0.7 + k / 3) % 1); g.globalAlpha = 0.85 * (1 - q); g.fillStyle = '#f1f3f6'; circ(g, 41 + q * 10, -63 - q * 16 - k, 2 + q * 3); }
      g.globalAlpha = 1;
    }
  };
  // Bäume neu: runde Kronen mit Glanz
  A.treeSpr = function (k) {
    return sprite('tr|' + k, [-26, -66, 26, 2], function (g) {
      if (k === 1) {
        g.fillStyle = '#7a4f2a'; g.fillRect(-3, -10, 6, 10);
        [[-20, -10, '#2f8a4a'], [-16, -26, '#3aa257'], [-11, -40, '#4cb866']].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(0, p[1] - 22); g.lineTo(-p[0], p[1]); g.closePath(); sfill(g, p[2], 1.4); });
        g.fillStyle = '#ffffff'; poly(g, [-6, -52, 0, -62, 6, -52, 3, -54, 0, -51, -3, -54]);
      } else {
        g.beginPath(); rrect(g, -4, -20, 8, 20, 2); sfill(g, '#7a4f2a', 1.3);
        var c1 = k === 2 ? '#4cb04a' : '#3a9a44', c2 = k === 2 ? '#6fcc5a' : '#52b356';
        blob(g, [[-12, -28, 12], [12, -28, 12], [0, -42, 15], [0, -26, 13]], c1, 2.6);
        g.fillStyle = c2; circ(g, -4, -46, 7); circ(g, -14, -32, 4.5); circ(g, 8, -36, 4);
        if (k === 2) { g.fillStyle = '#e8402e'; [[-9, -24], [7, -30], [2, -20], [-2, -38]].forEach(function (p) { circ(g, p[0], p[1], 1.8); }); }
      }
    }, { ol: 1.6 });
  };
  A.drawTree = function (ctx, k, x, y) { A.blit(ctx, A.treeSpr(k), x, y, 1.25, false, [18, 5]); };
  A.houseSpr = function (time, night) {
    var fr = Math.floor((time % 4) / 4 * 8);
    return sprite('hs|' + fr + (night ? 1 : 0), [-64, -142, 64, 4], function (g) {
      // Wände
      g.beginPath(); rrect(g, -52, -60, 104, 60, 3); sfill(g, '#fff1d6', 1.6);
      g.fillStyle = '#ecd4a8'; g.fillRect(-52, -12, 104, 12);
      for (var i = -44; i < 52; i += 12) { g.fillStyle = 'rgba(160,110,60,.15)'; g.fillRect(i, -60, 1.5, 48); }
      // Dach
      g.beginPath(); g.moveTo(-62, -56); g.lineTo(-40, -96); g.lineTo(40, -96); g.lineTo(62, -56); g.closePath(); sfill(g, '#d8432f', 1.8);
      g.strokeStyle = '#a83020'; g.lineWidth = 1.6;
      for (var r = 0; r < 4; r++) { var yy = -62 - r * 9; g.beginPath(); g.moveTo(-58 + r * 5, yy); g.lineTo(58 - r * 5, yy); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.25)'; poly(g, [-40, -96, 40, -96, 44, -90, -44, -90]);
      // Schornstein
      g.beginPath(); rrect(g, 26, -112, 13, 22, 2); sfill(g, '#a8553a', 1.4); g.fillStyle = '#6b3424'; g.fillRect(25, -114, 15, 4);
      // Fenster
      var win = night ? '#ffd86b' : '#8fd3ff';
      [[-41, -46], [21, -46]].forEach(function (p) {
        g.beginPath(); rrect(g, p[0], p[1], 21, 19, 3); sfill(g, '#ffffff', 1.4);
        g.fillStyle = win; g.fillRect(p[0] + 2.5, p[1] + 2.5, 16, 14);
        g.fillStyle = '#ffffff'; g.fillRect(p[0] + 9.5, p[1] + 2.5, 2, 14); g.fillRect(p[0] + 2.5, p[1] + 8.5, 16, 2);
        g.beginPath(); rrect(g, p[0] - 2, p[1] + 18, 25, 5, 2); sfill(g, '#8a5a32', 1.1);
        g.fillStyle = '#ff5f8a'; circ(g, p[0] + 4, p[1] + 18, 2.2); g.fillStyle = '#ffd23f'; circ(g, p[0] + 11, p[1] + 17.5, 2.2); g.fillStyle = '#ffffff'; circ(g, p[0] + 18, p[1] + 18, 2.2);
      });
      // Tür
      g.beginPath(); g.moveTo(-11, 0); g.lineTo(-11, -28); g.quadraticCurveTo(0, -40, 11, -28); g.lineTo(11, 0); g.closePath(); sfill(g, '#8a4f2a', 1.5);
      g.fillStyle = '#ffcc22'; circ(g, 6, -14, 1.8);
      // Rauch
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (var k = 0; k < 3; k++) { var p = ((fr / 8) + k / 3) % 1; circ(g, 32 + Math.sin(p * 5) * 5, -118 - p * 22, 3 + p * 4); }
    }, { ol: 1.8 });
  };
  // Wanderhändler mit Karren (steht neben dem Bauernhaus, solange er da ist)
  A.merchantSpr = function (fr) {
    return sprite('mer2|' + fr, [-42, -78, 60, 8], function (g) {
      var wave = Math.sin(fr / 8 * TAU);
      // Karren
      g.beginPath(); rrect(g, -34, -30, 50, 18, 3); sfill(g, '#b8743c', 1.4);
      g.fillStyle = '#8a5228'; g.fillRect(-34, -22, 50, 2); g.fillRect(-34, -16, 50, 2);
      line(g, [16, -18, 36, -10], '#7a4a2a', 3);
      // Kisten auf dem Karren
      g.beginPath(); rrect(g, -30, -44, 14, 14, 2); sfill(g, '#d8a05a', 1.2); line(g, [-30, -37, -16, -37], '#8a5228', 1.2);
      g.beginPath(); rrect(g, -15, -42, 12, 12, 2); sfill(g, '#ffcf3a', 1.2); line(g, [-9, -42, -9, -30], '#d0302a', 2);
      g.beginPath(); rrect(g, -2, -40, 13, 10, 2); sfill(g, '#7fb8ff', 1.2);
      // Stangen und gestreiftes Dach
      line(g, [-32, -30, -32, -62], '#6b4424', 2.4); line(g, [14, -30, 14, -62], '#6b4424', 2.4);
      for (var i = 0; i < 6; i++) {
        g.beginPath(); g.moveTo(-38 + i * 9, -60); g.lineTo(-29 + i * 9, -60); g.lineTo(-29 + i * 9, -54); g.quadraticCurveTo(-33.5 + i * 9, -50, -38 + i * 9, -54); g.closePath();
        sfill(g, i % 2 ? '#ffffff' : '#e8463c', 1.1);
      }
      g.beginPath(); g.moveTo(-40, -60); g.lineTo(-36, -70); g.lineTo(18, -70); g.lineTo(22, -60); g.closePath(); sfill(g, '#e8463c', 1.3);
      g.fillStyle = '#fff'; poly(g, [-26, -60, -22, -70, -13, -70, -17, -60]); poly(g, [-8, -60, -4, -70, 5, -70, 1, -60]);
      // Räder
      [[-24, -10], [8, -10]].forEach(function (w) { g.beginPath(); g.arc(w[0], w[1], 8, 0, TAU); sfill(g, '#6b4424', 1.4); g.fillStyle = '#c9a070'; circ(g, w[0], w[1], 2.4);
        g.strokeStyle = '#c9a070'; g.lineWidth = 1.2; for (var k = 0; k < 4; k++) { var a = k / 4 * Math.PI; g.beginPath(); g.moveTo(w[0] - Math.cos(a) * 6, w[1] - Math.sin(a) * 6); g.lineTo(w[0] + Math.cos(a) * 6, w[1] + Math.sin(a) * 6); g.stroke(); } });
      // Händler: freundlicher Opa mit Weste, großen Augen, Lächeln und Hut mit Feder, winkt
      var bob = Math.abs(Math.sin(fr / 8 * TAU)) * 1.2;
      g.save(); g.translate(0, -bob);
      // Beine und Schuhe
      g.beginPath(); rrect(g, 25, -6, 5, 8, 2); sfill(g, '#6b4424', 1.1); g.beginPath(); rrect(g, 32, -6, 5, 8, 2); sfill(g, '#6b4424', 1.1);
      // Körper: grünes Hemd, orange Weste, runder Bauch
      g.beginPath(); g.moveTo(21, -2); g.quadraticCurveTo(18, -24, 27, -29); g.lineTo(35, -29); g.quadraticCurveTo(44, -24, 41, -2); g.closePath(); sfill(g, '#4caf50', 1.4);
      g.beginPath(); g.moveTo(22, -4); g.quadraticCurveTo(20, -22, 27, -27); g.lineTo(29, -6); g.closePath(); sfill(g, '#ff9f1c', 1.1);
      g.beginPath(); g.moveTo(40, -4); g.quadraticCurveTo(42, -22, 35, -27); g.lineTo(33, -6); g.closePath(); sfill(g, '#ff9f1c', 1.1);
      g.fillStyle = '#ffe066'; circ(g, 31, -18, 1.3); circ(g, 31, -12, 1.3);
      // andere Hand hält eine kleine Kiste
      g.beginPath(); rrect(g, 15, -16, 9, 8, 1.5); sfill(g, '#ffcf3a', 1.1); line(g, [19.5, -16, 19.5, -8], '#d0302a', 1.6);
      g.fillStyle = '#ffd2a8'; g.beginPath(); g.arc(22, -12, 2.6, 0, TAU); sfill(g, '#ffd2a8', 1);
      // Kopf
      g.beginPath(); g.arc(31, -37, 9, 0, TAU); sfill(g, '#ffd8b0', 1.4);
      // Ohren
      g.beginPath(); g.arc(22.3, -36, 2.4, 0, TAU); sfill(g, '#ffd2a8', 1); g.beginPath(); g.arc(39.7, -36, 2.4, 0, TAU); sfill(g, '#ffd2a8', 1);
      // rosige Bäckchen
      g.fillStyle = 'rgba(255,120,120,.55)'; circ(g, 25.8, -33.6, 2.3); circ(g, 36.2, -33.6, 2.3);
      // große freundliche Augen mit Glanz, hochgezogene Augenbrauen
      g.fillStyle = OUT; g.beginPath(); g.ellipse(27.6, -38, 1.7, 2.2, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(34.4, -38, 1.7, 2.2, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; circ(g, 28.1, -38.8, 0.7); circ(g, 34.9, -38.8, 0.7);
      line(g, [25.6, -42.2, 29.4, -43], '#8a6a4a', 1.2); line(g, [32.6, -43, 36.4, -42.2], '#8a6a4a', 1.2);
      // Nase und kleiner weißer Schnurrbart
      g.fillStyle = '#ffb08a'; circ(g, 31, -35, 1.7);
      g.beginPath(); g.moveTo(31, -33.6); g.quadraticCurveTo(27, -34.4, 25.8, -31.8); g.quadraticCurveTo(28.6, -32.4, 31, -32.6); g.quadraticCurveTo(33.4, -32.4, 36.2, -31.8); g.quadraticCurveTo(35, -34.4, 31, -33.6); sfill(g, '#f4f1e6', 0.9);
      // breites offenes Lächeln
      g.beginPath(); g.moveTo(27.6, -31.4); g.quadraticCurveTo(31, -26.4, 34.4, -31.4); g.closePath(); sfill(g, '#a8323a', 1);
      g.fillStyle = '#ff8a95'; g.beginPath(); g.ellipse(31, -29.4, 1.8, 0.9, 0, 0, TAU); g.fill();
      // Hut: brauner Filzhut mit grünem Band und roter Feder
      g.beginPath(); g.ellipse(31, -44.5, 12.5, 3.2, 0, 0, TAU); sfill(g, '#a0662f', 1.3);
      g.beginPath(); g.moveTo(24, -45); g.quadraticCurveTo(24, -55, 31, -55); g.quadraticCurveTo(38, -55, 38, -45); g.closePath(); sfill(g, '#a0662f', 1.3);
      g.fillStyle = '#4caf50'; g.fillRect(24.3, -48.4, 13.4, 2.6);
      g.beginPath(); g.moveTo(36, -47); g.quadraticCurveTo(44, -56, 41, -61); g.quadraticCurveTo(38, -55, 35, -48); g.closePath(); sfill(g, '#e8463c', 1);
      // winkender Arm
      g.save(); g.translate(40, -25); g.rotate(0.75 + wave * 0.4);
      g.beginPath(); rrect(g, -2.6, -14, 5.2, 15, 2.6); sfill(g, '#4caf50', 1.2); g.beginPath(); g.arc(0, -15.5, 3.3, 0, TAU); sfill(g, '#ffd8b0', 1);
      g.restore();
      g.restore();
    }, { ol: 1.5 });
  };
  A.drawMerchant = function (ctx, x, y, time) { A.blit(ctx, A.merchantSpr(Math.floor((time % 1.2) / 1.2 * 8)), x, y, 1, false, [36, 8]); };
  A.drawHouse = function (ctx, x, y, time, night) { A.blit(ctx, A.houseSpr(time, night), x, y, 1, false, [64, 12]); };
  A.wolfSpr = function (time) {
    var fr = Math.floor((time % 0.6) / 0.6 * 6);
    return sprite('wf|' + fr, [-36, -42, 40, 4], function (g) {
      var b = Math.sin(fr / 6 * TAU) * 1.2;
      g.beginPath(); rrect(g, -15, -14, 5, 14, 2); sfill(g, '#4c525a', 1.2); g.beginPath(); rrect(g, 9, -14, 5, 14, 2); sfill(g, '#4c525a', 1.2);
      g.beginPath(); g.moveTo(-18, -22 + b); g.quadraticCurveTo(-34, -34, -30, -20 + b); g.quadraticCurveTo(-26, -16, -18, -18 + b); g.closePath(); sfill(g, '#7a828c', 1.4);
      g.beginPath(); g.ellipse(0, -19 + b, 20, 10.5, 0, 0, TAU); sfill(g, '#7a828c', 1.6);
      g.fillStyle = '#c9ced6'; ell(g, 4, -14 + b, 12, 4);
      g.beginPath(); g.moveTo(11, -27 + b); g.lineTo(30, -25 + b); g.lineTo(36, -17 + b); g.lineTo(24, -11 + b); g.lineTo(12, -14 + b); g.closePath(); sfill(g, '#8d959f', 1.5);
      g.beginPath(); g.moveTo(15, -26 + b); g.lineTo(17, -37 + b); g.lineTo(22, -27 + b); g.closePath(); sfill(g, '#5a616a', 1.2);
      g.beginPath(); g.moveTo(21, -26 + b); g.lineTo(26, -36 + b); g.lineTo(27, -25 + b); g.closePath(); sfill(g, '#5a616a', 1.2);
      g.fillStyle = '#ffe14d'; ell(g, 24, -21 + b, 2.2, 1.6); g.fillStyle = '#111'; circ(g, 24.6, -21 + b, 0.9);
      line(g, [21, -24.5 + b, 26, -23 + b], OUT, 1.3);
      g.fillStyle = '#1a1a1a'; circ(g, 35, -17.5 + b, 1.8);
      g.fillStyle = '#fff'; poly(g, [27, -13 + b, 28.5, -10.5 + b, 30, -13 + b]);
    }, { ol: 1.6 });
  };
  A.drawWolf = function (ctx, x, y, time, sc) { A.blit(ctx, A.wolfSpr(time), x, y, sc, true, [22, 6]); };

  /* ---------- Boxen ---------- */
  var burl = {};
  /* ---------- Kisten: jede Sorte hat ein eigenes Design ---------- */
  var RAINBOW = ['#ff5f6d', '#ffc371', '#fff36b', '#6bf08a', '#5ab8ff', '#b36bff'];
  function rainbowGrad(g, x0, y0, x1, y1) { var f = g.createLinearGradient(x0, y0, x1, y1); RAINBOW.forEach(function (c, i) { f.addColorStop(i / 5, c); }); return f; }
  function vgrad(g, y0, y1, a, b) { var f = g.createLinearGradient(0, y0, 0, y1); f.addColorStop(0, a); f.addColorStop(1, b); return f; }
  function fillOut(g, fill, lw) { g.fillStyle = fill; g.fill(); g.strokeStyle = OUT; g.lineWidth = lw || 1.8; g.stroke(); }
  function gem(g, x, y, r, col) {
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.9, y - r * 0.2); g.lineTo(x, y + r); g.lineTo(x - r * 0.9, y - r * 0.2); g.closePath(); fillOut(g, col, 1.3);
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.35, y - r * 0.2); g.lineTo(x, y + r * 0.2); g.lineTo(x - r * 0.35, y - r * 0.2); g.closePath(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
  }
  function glint(g, x, y, s) { g.fillStyle = '#ffffff'; star(g, x, y, s, s * 0.3, 4); g.fill(); }
  // klassische Truhe: Körper, gewölbter Deckel, Bänder, Schloss
  function chest(g, o) {
    var body = o.body, lid = o.lid || o.body, band = o.band, lock = o.lock;
    if (o.glow) { g.save(); g.shadowColor = o.glow; g.shadowBlur = 16; g.beginPath(); rrect(g, -32, -40, 64, 40, 7); g.fillStyle = o.glow; g.fill(); g.restore(); }
    g.beginPath(); rrect(g, -32, -40, 64, 40, 7); fillOut(g, body);
    if (o.planks) { g.fillStyle = 'rgba(0,0,0,.14)'; for (var i = -22; i < 32; i += 14) g.fillRect(i, -38, 1.6, 36); }
    if (o.bodyArt) o.bodyArt(g);
    g.beginPath(); g.moveTo(-35, -38); g.lineTo(-35, -52); g.quadraticCurveTo(0, -70, 35, -52); g.lineTo(35, -38); g.closePath(); fillOut(g, lid);
    if (o.lidArt) o.lidArt(g);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(-30, -50); g.quadraticCurveTo(0, -64, 30, -50); g.lineTo(30, -47); g.quadraticCurveTo(0, -60, -30, -47); g.closePath(); g.fill();
    if (band) [-23, 23].forEach(function (x) { g.beginPath(); rrect(g, x - 4.5, -59, 9, 59, 2.5); fillOut(g, band, 1.4); });
    g.beginPath(); rrect(g, -36, -43, 72, 6, 2.5); fillOut(g, o.rim || mix(typeof body === 'string' ? body : '#888888', '#000000', 0.35), 1.3);
    if (o.rivets) { g.fillStyle = o.rivets; [-30, -16, 16, 30].forEach(function (x) { [-34, -8].forEach(function (y) { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); g.strokeStyle = OUT; g.lineWidth = 0.8; g.stroke(); }); }); }
    if (lock) lock(g); else { g.beginPath(); rrect(g, -9, -48, 18, 21, 5); fillOut(g, '#ffd23f', 1.5); g.beginPath(); g.arc(0, -40, 3, 0, TAU); g.fillStyle = OUT; g.fill(); g.fillRect(-1.3, -40, 2.6, 7); }
  }
  var BOXDRAW = {
    holz: function (g) { // offene Holzkiste mit Stroh
      g.fillStyle = '#f2d46b'; [[-20, -44], [-6, -48], [10, -46], [22, -43]].forEach(function (p, i) { g.beginPath(); g.ellipse(p[0], p[1], 10, 6, (i - 1.5) * 0.3, 0, TAU); fillOut(g, '#f2d46b', 1.3); });
      g.strokeStyle = '#c9a23a'; g.lineWidth = 1.2; for (var i = 0; i < 9; i++) { g.beginPath(); g.moveTo(-24 + i * 6, -42); g.lineTo(-27 + i * 6.5, -54 - (i % 3) * 3); g.stroke(); }
      g.beginPath(); rrect(g, -33, -42, 66, 42, 4); fillOut(g, vgrad(g, -42, 0, '#d9995a', '#a8692f'));
      g.fillStyle = 'rgba(80,40,10,.35)'; [-28, -14, 0, 14].forEach(function (y) { }); [-28, -14].forEach(function (y) { g.fillRect(-31, y, 62, 1.6); });
      g.strokeStyle = OUT; g.lineWidth = 1.6; g.lineCap = 'round';
      [[-31, -40, 31, -2], [-31, -2, 31, -40]].forEach(function (l) { g.strokeStyle = OUT; g.lineWidth = 7; g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); g.strokeStyle = '#c4834a'; g.lineWidth = 4.4; g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); });
      g.fillStyle = '#5a5a60'; [[-28, -37], [28, -37], [-28, -5], [28, -5], [0, -21]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 1.8, 0, TAU); g.fill(); });
      g.beginPath(); rrect(g, -14, -26, 28, 11, 3); fillOut(g, '#f4e2c0', 1.2);
      g.fillStyle = OUT; g.font = '9px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, -20.3);
    },
    eisen: function (g) {
      chest(g, { body: vgrad(g, -40, 0, '#8d98a6', '#5b6470'), lid: vgrad(g, -68, -38, '#a9b4c2', '#6f7987'), band: '#3f4650', rim: '#3a4048', rivets: '#c9d1db',
        lock: function (g) { g.beginPath(); rrect(g, -11, -50, 22, 24, 4); fillOut(g, '#4a525e', 1.6); g.beginPath(); g.arc(0, -39, 4, 0, TAU); g.fillStyle = '#1a1d22'; g.fill(); g.fillRect(-1.5, -39, 3, 8); g.fillStyle = '#c9d1db'; [[-7, -46], [7, -46], [-7, -30], [7, -30]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 1.4, 0, TAU); g.fill(); }); } });
    },
    silber: function (g) {
      chest(g, { body: vgrad(g, -40, 0, '#eef3f8', '#9fadbd'), lid: vgrad(g, -68, -38, '#ffffff', '#b8c4d2'), band: '#5a8fd6', rim: '#7d8ea3',
        bodyArt: function (g) { g.strokeStyle = 'rgba(90,143,214,.6)'; g.lineWidth = 1.4; [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * 10, -10); g.bezierCurveTo(s * 14, -22, s * 4, -26, s * 8, -32); g.stroke(); }); },
        lock: function (g) { g.beginPath(); rrect(g, -10, -50, 20, 22, 6); fillOut(g, '#dfe8f2', 1.5); gem(g, 0, -39, 7, '#4fa3ff'); } });
      glint(g, 27, -60, 4.5); glint(g, -27, -14, 3);
    },
    gold: function (g) {
      // Münzen quellen heraus
      g.fillStyle = '#ffd23f'; [[-18, -60], [-4, -64], [12, -62], [24, -57], [4, -58]].forEach(function (p) { g.beginPath(); g.ellipse(p[0], p[1], 7, 4, 0, 0, TAU); fillOut(g, '#ffd23f', 1.2); });
      chest(g, { body: vgrad(g, -40, 0, '#ffd75a', '#d99a14'), lid: vgrad(g, -68, -38, '#fff0a0', '#e8ac22'), band: '#b8321f', rim: '#a8700a',
        bodyArt: function (g) { gem(g, -14, -20, 5, '#e8402e'); gem(g, 14, -20, 5, '#2fbf71'); },
        lock: function (g) { g.beginPath(); rrect(g, -10, -51, 20, 23, 5); fillOut(g, '#fff3b0', 1.5); gem(g, 0, -40, 7.5, '#e8402e'); } });
      glint(g, 28, -62, 5); glint(g, -28, -16, 3.5); glint(g, 0, -70, 3);
    },
    kristall: function (g) { // großer Edelstein-Kasten
      g.save(); g.shadowColor = '#c4adff'; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(-34, -40); g.lineTo(-22, -66); g.lineTo(22, -66); g.lineTo(34, -40); g.lineTo(0, 0); g.closePath(); fillOut(g, vgrad(g, -66, 0, '#efe6ff', '#7a52e6'), 2);
      g.restore(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.3;
      [[-34, -40, 34, -40], [-22, -66, -10, -40], [22, -66, 10, -40], [0, -66, -10, -40], [0, -66, 10, -40], [-10, -40, 0, 0], [10, -40, 0, 0]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); });
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(-22, -66); g.lineTo(-10, -40); g.lineTo(-34, -40); g.closePath(); g.fill();
      g.fillStyle = 'rgba(60,20,140,.25)'; g.beginPath(); g.moveTo(10, -40); g.lineTo(34, -40); g.lineTo(0, 0); g.closePath(); g.fill();
      glint(g, -18, -56, 5); glint(g, 26, -30, 3.5); glint(g, 4, -18, 3);
    },
    regen: function (g) {
      chest(g, { body: rainbowGrad(g, -32, -40, 32, 0), lid: rainbowGrad(g, -35, -68, 35, -38), band: '#ffffff', rim: '#7a3cc0',
        lidArt: function (g) { g.fillStyle = '#ffffff'; [[-24, -48], [-12, -55], [12, -55], [24, -48]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 5, 0, TAU); g.fill(); }); },
        lock: function (g) { star(g, 0, -40, 12, 5.5, 5); fillOut(g, '#ffe24a', 1.6); g.fillStyle = 'rgba(255,255,255,.6)'; star(g, -1.5, -42, 5, 2.4, 5); g.fill(); } });
      glint(g, 29, -62, 5); glint(g, -29, -60, 4); glint(g, 26, -10, 3);
    },
    galaxie: function (g) {
      chest(g, { body: vgrad(g, -40, 0, '#3a2a8a', '#140d3a'), lid: vgrad(g, -68, -38, '#6a3cc8', '#241760'), band: '#ff7ae0', rim: '#0d0826', glow: '#ff7ae0',
        bodyArt: function (g) { g.fillStyle = '#ffffff'; [[-26, -30, 1.2], [-12, -12, 1], [20, -28, 1.4], [26, -8, 1], [-4, -30, 0.9], [8, -8, 1.2]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], p[2], 0, TAU); g.fill(); }); },
        lidArt: function (g) { g.fillStyle = '#ffffff'; [[-20, -52, 1.2], [14, -58, 1], [26, -48, 1.3], [-6, -60, 0.9]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], p[2], 0, TAU); g.fill(); }); },
        lock: function (g) {
          g.beginPath(); g.arc(0, -40, 9, 0, TAU); fillOut(g, vgrad(g, -49, -31, '#ffb3f0', '#b33cff'), 1.5);
          g.save(); g.translate(0, -40); g.rotate(-0.35); g.beginPath(); g.ellipse(0, 0, 15, 4, 0, 0, TAU); g.strokeStyle = OUT; g.lineWidth = 3.6; g.stroke(); g.strokeStyle = '#ffe24a'; g.lineWidth = 1.8; g.stroke(); g.restore();
        } });
      glint(g, 28, -64, 5); glint(g, -30, -58, 3.5); glint(g, -27, -6, 3);
    },
    turnier: function (g) { // Turnier-Kiste: nur vom Schafrennen-Cup
      chest(g, { body: vgrad(g, -40, 0, '#ff5a4a', '#b81f2a'), lid: vgrad(g, -68, -38, '#ffe066', '#e0960f'), band: '#ffd23f', rim: '#5a1414', glow: '#ffd23f',
        bodyArt: function (g) { g.save(); g.beginPath(); g.rect(-30, -38, 60, 36); g.clip(); for (var i = -4; i <= 4; i++) { g.fillStyle = i % 2 ? '#222' : '#fff'; g.fillRect(i * 7 - 3.5, -10, 7, 7); g.fillStyle = i % 2 ? '#fff' : '#222'; g.fillRect(i * 7 - 3.5, -3, 7, 3); } g.restore(); },
        lidArt: function (g) { gem(g, -16, -54, 4, '#7fe8ff'); gem(g, 16, -54, 4, '#ff7ae0'); },
        lock: function (g) {
          g.beginPath(); g.moveTo(-9, -48); g.lineTo(9, -48); g.quadraticCurveTo(9, -34, 0, -33); g.quadraticCurveTo(-9, -34, -9, -48); g.closePath(); fillOut(g, vgrad(g, -48, -33, '#fff3a0', '#f0a818'), 1.6);
          g.beginPath(); rrect(g, -2.5, -34, 5, 6, 1); fillOut(g, '#e0960f', 1.2);
          g.beginPath(); rrect(g, -8, -29, 16, 5, 2); fillOut(g, '#8a5a1a', 1.2);
          g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.arc(-10, -43, 4, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(10, -43, 4, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
        } });
      glint(g, 30, -64, 5.5); glint(g, -30, -58, 4); glint(g, 26, -14, 3.2);
    },
    nacho: function (g) { // Nacho-Schale mit Chips, Käse und Chili
      [[-22, -46, -0.5], [-10, -54, -0.15], [4, -56, 0.2], [17, -50, 0.5], [-2, -46, 0], [12, -44, 0.3], [-16, -42, -0.3]].forEach(function (p, i) {
        g.save(); g.translate(p[0], p[1]); g.rotate(p[2]); g.beginPath(); g.moveTo(-9, 6); g.lineTo(0, -10); g.lineTo(9, 6); g.closePath(); fillOut(g, i % 2 ? '#ffcf4a' : '#f5b830', 1.3);
        g.fillStyle = '#e09a20'; circ(g, -2, 1, 0.8); circ(g, 3, 3, 0.7); g.restore(); });
      g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(-24, -42); g.quadraticCurveTo(-10, -50, 4, -46); g.quadraticCurveTo(16, -52, 24, -42); g.lineTo(24, -38); g.lineTo(-24, -38); g.closePath(); g.fill();
      [[-14, -40, 6], [6, -40, 8], [18, -40, 5]].forEach(function (d) { g.beginPath(); rrect(g, d[0] - 2, d[1], 4, d[2], 2); g.fill(); });
      g.beginPath(); g.moveTo(-36, -40); g.lineTo(36, -40); g.lineTo(28, 0); g.lineTo(-28, 0); g.closePath(); fillOut(g, vgrad(g, -40, 0, '#ff5a3a', '#c8261a'));
      g.save(); g.beginPath(); g.moveTo(-36, -40); g.lineTo(36, -40); g.lineTo(28, 0); g.lineTo(-28, 0); g.closePath(); g.clip();
      for (var i = -5; i <= 5; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ffd23f'; g.fillRect(i * 8 - 2, -42, 4, 44); } g.restore();
      g.beginPath(); g.moveTo(-36, -40); g.lineTo(36, -40); g.lineTo(28, 0); g.lineTo(-28, 0); g.closePath(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
      g.beginPath(); rrect(g, -38, -44, 76, 7, 3); fillOut(g, '#3fae4a', 1.5);
      g.beginPath(); g.arc(0, -20, 10, 0, TAU); fillOut(g, '#fff6dc', 1.4);
      g.fillStyle = OUT; g.font = '14px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, -19.4);
      g.beginPath(); g.moveTo(24, -58); g.quadraticCurveTo(32, -50, 28, -42); g.quadraticCurveTo(26, -50, 22, -56); g.closePath(); fillOut(g, '#e8221e', 1.2);
      line(g, [23, -58, 21, -63], '#2f8a2a', 2);
      glint(g, -30, -54, 4.5); glint(g, 32, -10, 3.4);
    },
    taco: function (g) { // Taco-Kiste: bunte Geschenkkiste mit Sombrero obendrauf
      g.beginPath(); rrect(g, -29, -40, 58, 40, 5); fillOut(g, vgrad(g, -44, 0, '#ff8a3a', '#d9481a'));
      g.save(); g.beginPath(); rrect(g, -29, -40, 58, 40, 5); g.clip();
      ['#ff5fa2', '#ffd23f', '#3fc7ff', '#7be05a'].forEach(function (c, i) { g.fillStyle = c; g.fillRect(-30, -32 + i * 8, 60, 3); }); g.restore();
      g.beginPath(); rrect(g, -29, -40, 58, 40, 5); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
      g.beginPath(); rrect(g, -5, -40, 10, 40, 2); fillOut(g, '#3fae4a', 1.3);
      g.beginPath(); g.ellipse(0, -42, 36, 9, 0, 0, TAU); fillOut(g, '#f2c14e', 1.6);
      for (var i = 0; i < 12; i++) { var a = i / 12 * TAU; g.fillStyle = ['#e8322e', '#3fae4a', '#3fc7ff'][i % 3]; circ(g, Math.cos(a) * 30, -42 + Math.sin(a) * 7, 1.6); }
      g.beginPath(); g.moveTo(-14, -45); g.bezierCurveTo(-14, -64, -8, -70, 0, -70); g.bezierCurveTo(8, -70, 14, -64, 14, -45); g.quadraticCurveTo(0, -40, -14, -45); g.closePath(); fillOut(g, vgrad(g, -70, -45, '#ffe08a', '#e0a83a'), 1.6);
      g.beginPath(); g.moveTo(-13.6, -53); g.quadraticCurveTo(0, -48, 13.6, -53); g.lineTo(13.8, -48); g.quadraticCurveTo(0, -43, -13.8, -48); g.closePath(); fillOut(g, '#e8322e', 1.2);
      glint(g, 28, -60, 5); glint(g, -30, -14, 3.5);
    },
    herz: function (g) { // Baby-Geschenk aus der Zucht
      g.beginPath(); g.moveTo(0, -4); g.bezierCurveTo(-40, -30, -30, -66, 0, -50); g.bezierCurveTo(30, -66, 40, -30, 0, -4); g.closePath(); fillOut(g, vgrad(g, -66, -4, '#ffc2dc', '#e8508f'), 2);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-14, -46, 7, 4, -0.6, 0, TAU); g.fill();
      g.beginPath(); rrect(g, -3.5, -56, 7, 50, 2); fillOut(g, '#fff3b0', 1.2);
      bow(g, 0, -54, '#fff3b0');
    }
  };
  function bow(g, x, y, col) {
    [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + s * 18, y - 16, x + s * 20, y + 4, x, y); g.closePath(); fillOut(g, col, 1.4); });
    g.beginPath(); g.arc(x, y, 3.6, 0, TAU); fillOut(g, col, 1.3);
  }
  // Deko-Kisten: Geschenkpakete in der Farbe der Seltenheit
  var GIFT = { c: ['#9fd47a', '#5a9a3a', '#ffffff'], r: ['#6cb8ff', '#2f6fc0', '#ffe24a'], e: ['#c08aff', '#7a3cc0', '#ffe24a'], l: ['#ffc94a', '#d9820a', '#e8402e'], m: ['rainbow', '#7a3cc0', '#ffffff'] };
  function giftDraw(r) {
    return function (g) {
      var c = GIFT[r], body = c[0] === 'rainbow' ? rainbowGrad(g, -30, -44, 30, 0) : vgrad(g, -44, 0, c[0], c[1]);
      g.beginPath(); rrect(g, -29, -40, 58, 40, 5); fillOut(g, body);
      g.beginPath(); rrect(g, -33, -50, 66, 13, 4); fillOut(g, c[0] === 'rainbow' ? rainbowGrad(g, -33, -50, 33, -37) : c[0]);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-30, -48, 60, 3);
      if (r === 'e' || r === 'm' || r === 'l') { g.fillStyle = 'rgba(255,255,255,.5)'; [[-18, -26], [17, -14], [-12, -8], [20, -30]].forEach(function (p) { star(g, p[0], p[1], 3, 1.2, 4); g.fill(); }); }
      g.beginPath(); rrect(g, -5, -50, 10, 50, 2); fillOut(g, c[2], 1.3);
      bow(g, 0, -51, c[2]);
      if (r === 'm' || r === 'l') { glint(g, 30, -56, 5); glint(g, -30, -12, 3.5); }
    };
  }
  var DEKO_KIND = { '#9aa58f': 'gc', '#4f9ae0': 'gr', '#a463e6': 'ge', '#f2a20c': 'gl', rainbow: 'gm' };
  function boxKind(k) {
    if (BOXDRAW[k]) return k;
    if (/^g[crelm]$/.test(k)) return k;
    for (var i = 0; i < SI.BOX.length; i++) if (SI.BOX[i].col === k) return SI.BOX[i].k; // alte Aufrufe mit Farbe
    return DEKO_KIND[k] || (k === '#f6b3c9' ? 'herz' : 'holz');
  }
  A.boxSpr = function (k) {
    k = boxKind(k);
    var draw = BOXDRAW[k] || giftDraw(k.charAt(1));
    return sprite('bx2|' + k, [-42, -74, 42, 4], draw, { ol: 1.4, sc: 3 });
  };
  A.boxURL = function (k) { k = boxKind(k); if (!burl[k]) burl[k] = A.boxSpr(k).c.toDataURL(); return burl[k]; };
  A.giftKind = function (r) { return 'g' + r; };

  /* ---------- Symbole für Knöpfe ---------- */
  var iurl = {};
  A.iconURL = function (name) {
    if (iurl[name]) return iurl[name];
    var s = sprite('ic|' + name, [-16, -30, 16, 2], function (g) {
      switch (name) {
        case 'boxen':
          g.beginPath(); rrect(g, -13, -16, 26, 16, 3); sfill(g, '#c9783a', 1.4);
          g.beginPath(); g.moveTo(-14, -16); g.lineTo(-14, -21); g.quadraticCurveTo(0, -28, 14, -21); g.lineTo(14, -16); g.closePath(); sfill(g, '#e08a45', 1.4);
          g.beginPath(); rrect(g, -4, -20, 8, 9, 2); sfill(g, '#ffd23f', 1.2); break;
        case 'deko':
          g.beginPath(); rrect(g, -12, -18, 24, 18, 2); sfill(g, '#e8463a', 1.4);
          g.beginPath(); g.moveTo(-15, -16); g.lineTo(0, -29); g.lineTo(15, -16); g.closePath(); sfill(g, '#8a4f2a', 1.4);
          g.beginPath(); rrect(g, -4, -11, 8, 11, 1); sfill(g, '#ffffff', 1.2); break;
        case 'zucht':
          g.beginPath(); g.moveTo(0, -2); g.bezierCurveTo(-16, -12, -11, -27, 0, -19); g.bezierCurveTo(11, -27, 16, -12, 0, -2); g.closePath(); sfill(g, '#ff4f8a', 1.6);
          g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, -6, -19, 2.6, 1.8); break;
        case 'buch':
          g.beginPath(); rrect(g, -13, -24, 26, 22, 3); sfill(g, '#3f7fe0', 1.5);
          g.beginPath(); rrect(g, -10, -21, 20, 16, 2); sfill(g, '#fff6e0', 1);
          g.fillStyle = '#3f7fe0'; g.fillRect(-1, -24, 2, 22);
          g.fillStyle = '#ffd23f'; star(g, -5, -13, 3, 1.2, 5); g.fill(); break;
        case 'mehr':
          star(g, 0, -14, 13, 6, 5); sfill(g, '#ffd23f', 1.6); g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, -3, -18, 2.4, 1.6); break;
        case 'pokal':
          g.beginPath(); g.moveTo(-9, -26); g.lineTo(9, -26); g.quadraticCurveTo(9, -12, 0, -10); g.quadraticCurveTo(-9, -12, -9, -26); g.closePath(); sfill(g, '#ffcc22', 1.4);
          g.beginPath(); g.arc(-10, -21, 4, Math.PI * 0.5, Math.PI * 1.5); g.strokeStyle = OUT; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = '#ffcc22'; g.lineWidth = 1.8; g.stroke();
          g.beginPath(); g.arc(10, -21, 4, -Math.PI * 0.5, Math.PI * 0.5); g.strokeStyle = OUT; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = '#ffcc22'; g.lineWidth = 1.8; g.stroke();
          g.beginPath(); rrect(g, -2, -11, 4, 6, 1); sfill(g, '#e0a000', 1.1); g.beginPath(); rrect(g, -8, -5, 16, 4, 1.5); sfill(g, '#8a5a32', 1.2); break;
        case 'ticket':
          g.save(); g.translate(0, -14); g.rotate(-0.25);
          g.beginPath(); g.moveTo(-13, -8); g.lineTo(13, -8); g.lineTo(13, -3); g.arc(13, 0, 3, -Math.PI / 2, Math.PI / 2, true); g.lineTo(13, 8); g.lineTo(-13, 8); g.lineTo(-13, 3); g.arc(-13, 0, 3, Math.PI / 2, -Math.PI / 2, true); g.closePath(); sfill(g, '#ffd23f', 1.5);
          g.setLineDash([2, 2]); g.beginPath(); g.moveTo(5, -7); g.lineTo(5, 7); g.strokeStyle = '#b8860b'; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]);
          star(g, -4, 0, 4.5, 2, 5); g.fillStyle = '#e8402e'; g.fill(); g.restore(); break;
        case 'schild':
          g.beginPath(); g.moveTo(0, -28); g.lineTo(12, -23); g.quadraticCurveTo(12, -8, 0, -1); g.quadraticCurveTo(-12, -8, -12, -23); g.closePath(); sfill(g, '#ffd23f', 1.6);
          g.beginPath(); g.moveTo(0, -24); g.lineTo(8, -21); g.quadraticCurveTo(8, -10, 0, -5); g.closePath(); g.fillStyle = 'rgba(255,255,255,.45)'; g.fill();
          star(g, 0, -15, 6, 2.6, 5); g.fillStyle = '#e8402e'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke(); break;
        case 'zahnrad':
          g.save(); g.translate(0, -14);
          g.beginPath(); for (var zi = 0; zi < 16; zi++) { var za = zi / 16 * TAU, zr = zi % 2 ? 9 : 13; g.lineTo(Math.cos(za - 0.12) * zr, Math.sin(za - 0.12) * zr); g.lineTo(Math.cos(za + 0.12) * zr, Math.sin(za + 0.12) * zr); } g.closePath(); sfill(g, '#eef2f6', 1.5);
          g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); sfill(g, '#6b7a8c', 1.3); g.restore(); break;
        case 'coin':
          g.beginPath(); g.arc(0, -14, 12, 0, TAU); sfill(g, '#ffcc22', 1.6);
          g.beginPath(); g.arc(0, -14, 8.5, 0, TAU); g.strokeStyle = '#e09a00'; g.lineWidth = 1.6; g.stroke();
          blob(g, [[-3, -14, 3], [0, -16.5, 3.3], [3, -14, 3], [0, -12.5, 3.3]], '#ffffff', 0);
          g.fillStyle = '#5a3a00'; ell(g, 4.2, -14.8, 1.8, 2.1); g.fillStyle = 'rgba(255,255,255,.6)'; ell(g, -5, -20, 3, 1.6); break;
        case 'sonne':
          for (var i = 0; i < 8; i++) { g.save(); g.translate(0, -14); g.rotate(i / 8 * TAU); g.beginPath(); g.moveTo(8, -2.5); g.lineTo(13, 0); g.lineTo(8, 2.5); g.closePath(); sfill(g, '#ffb000', 1); g.restore(); }
          g.beginPath(); g.arc(0, -14, 7.5, 0, TAU); sfill(g, '#ffe14d', 1.4); break;
        case 'mond':
          g.beginPath(); g.arc(0, -14, 11, 0.7, 5.6); g.arc(5, -17, 9, 4.9, 1.4, true); g.closePath(); sfill(g, '#ffe9a0', 1.5);
          g.fillStyle = '#fff'; star(g, 8, -24, 2.4, 0.8, 4); g.fill(); break;
      }
    }, { ol: 1.3, sc: 3 });
    iurl[name] = s.c.toDataURL(); return iurl[name];
  };
  /* ---------- Upgrade-Karten: jede hat ihr eigenes Design ---------- */
  var CARD_TH = {
    glueck: { f1: '#7fe06a', f2: '#2e9a22', in1: '#eaffd9', in2: '#9fe07d' },
    gold: { f1: '#ffe066', f2: '#d98e00', in1: '#a8352a', in2: '#5c1410' },
    hirte: { f1: '#d9a066', f2: '#7a4a22', in1: '#d8f1ff', in2: '#7fc4f0' },
    technik: { f1: '#b9c6d8', f2: '#55657e', in1: '#3a4f78', in2: '#17223d' },
    hund: { f1: '#ff9a5c', f2: '#c4501c', in1: '#fff3c8', in2: '#ffcf6a' },
    back: { f1: '#c58bff', f2: '#6a2fb0', in1: '#8a4fe0', in2: '#3b1470' }
  };
  function cardFrame(g, th) {
    g.beginPath(); rrect(g, -16, -46, 32, 46, 5); fillOut(g, vgrad(g, -46, 0, th.f1, th.f2), 1.8);
    var rg = g.createRadialGradient(0, -26, 2, 0, -24, 24); rg.addColorStop(0, th.in1); rg.addColorStop(1, th.in2);
    g.beginPath(); rrect(g, -12.5, -42.5, 25, 34, 3.5); fillOut(g, rg, 1.2);
    // kleine Ecken-Steine und Glanz oben
    [[-13.5, -43.5], [13.5, -43.5], [-13.5, -3], [13.5, -3]].forEach(function (p) { g.beginPath(); circ(g, p[0], p[1], 1.7); fillOut(g, '#ffffff', 0.8); });
    g.globalAlpha = 0.35; g.fillStyle = '#ffffff'; g.beginPath(); rrect(g, -14, -45, 28, 4, 2); g.fill(); g.globalAlpha = 1;
    g.beginPath(); rrect(g, -9, -7.2, 18, 4.6, 2.3); fillOut(g, th.f2, 1);
  }
  function cardIcon(g, k) {
    var i;
    if (k === 'glueck') {
      line(g, [0, -24, 2, -16, 1, -12], OUT, 3.2); line(g, [0, -24, 2, -16, 1, -12], '#3d9a2a', 1.6);
      for (i = 0; i < 4; i++) {
        g.save(); g.translate(0, -26); g.rotate(i * TAU / 4 + 0.785);
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-7, -3, -6, -11, 0, -8.5); g.bezierCurveTo(6, -11, 7, -3, 0, 0); fillOut(g, i % 2 ? '#56c23c' : '#3fae2c', 1.2);
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -1); g.lineTo(0, -7); g.stroke();
        g.restore();
      }
      g.beginPath(); circ(g, 0, -26, 1.6); fillOut(g, '#2e8a1f', 0.8);
      glint(g, -8, -36, 2.2); glint(g, 8, -14, 1.8); glint(g, 9, -37, 1.4);
    } else if (k === 'gold') {
      // Strahlen
      g.save(); g.globalAlpha = 0.35; g.fillStyle = '#ffd23f';
      for (i = 0; i < 10; i++) { g.beginPath(); g.moveTo(0, -27); g.arc(0, -27, 20, i * TAU / 10, i * TAU / 10 + 0.3); g.closePath(); g.fill(); }
      g.restore();
      g.beginPath(); rrect(g, -9, -27, 18, 12, 2); fillOut(g, vgrad(g, -27, -15, '#ffd23f', '#e09a00'), 1.3);
      g.beginPath(); g.moveTo(-9.5, -27); g.quadraticCurveTo(0, -36, 9.5, -27); g.closePath(); fillOut(g, vgrad(g, -33, -27, '#ffe680', '#f2b01e'), 1.3);
      g.fillStyle = '#b06a00'; g.fillRect(-9, -27.6, 18, 1.6); g.fillRect(-1.5, -33, 3, 18);
      g.beginPath(); rrect(g, -2.4, -25, 4.8, 4, 1); fillOut(g, '#fff3b0', 0.9);
      [[-7, -37, 2.6], [6, -39, 3], [0, -41, 2.3]].forEach(function (c) { g.beginPath(); circ(g, c[0], c[1], c[2]); fillOut(g, '#ffd23f', 1); g.strokeStyle = '#c98a12'; g.lineWidth = 0.6; g.beginPath(); circ(g, c[0], c[1], c[2] * 0.55); g.stroke(); });
      glint(g, 9, -21, 2); glint(g, -9, -32, 1.6);
    } else if (k === 'hirte') {
      g.beginPath(); circ(g, 0, -14, 7); g.fillStyle = 'rgba(120,200,90,.6)'; g.fill(); // Hügel
      line(g, [3, -11, 3, -31], OUT, 4.4); line(g, [3, -11, 3, -31], '#b07a45', 2.6);
      g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 4.4; g.beginPath(); g.arc(-2, -31, 5, 0, Math.PI, true); g.stroke();
      g.strokeStyle = '#c98a55'; g.lineWidth = 2.6; g.beginPath(); g.arc(-2, -31, 5, 0, Math.PI, true); g.stroke();
      g.fillStyle = '#7a4a22'; g.fillRect(1.6, -24, 2.8, 2); // Griff-Band
      // Herz und kleine Sanduhr
      g.save(); g.translate(-6, -19); g.beginPath(); g.moveTo(0, 3); g.bezierCurveTo(-5, -1, -3, -6, 0, -3); g.bezierCurveTo(3, -6, 5, -1, 0, 3); fillOut(g, '#ff5f9a', 1); g.restore();
      g.save(); g.translate(8, -37); g.beginPath(); g.moveTo(-2.5, -3); g.lineTo(2.5, -3); g.lineTo(0, 0); g.lineTo(2.5, 3); g.lineTo(-2.5, 3); g.lineTo(0, 0); g.closePath(); fillOut(g, '#fff3c8', 0.8); g.restore();
      glint(g, -8, -38, 1.8);
    } else if (k === 'technik') {
      g.strokeStyle = 'rgba(120,170,255,.25)'; g.lineWidth = 0.5;
      for (i = -10; i <= 10; i += 4) { g.beginPath(); g.moveTo(i, -42); g.lineTo(i, -9); g.stroke(); }
      for (i = -40; i <= -10; i += 4) { g.beginPath(); g.moveTo(-12, i); g.lineTo(12, i); g.stroke(); }
      // Zahnrad
      g.save(); g.translate(-1, -27);
      g.beginPath(); for (i = 0; i < 16; i++) { var a = i / 16 * TAU, r = i % 2 ? 7 : 9.2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
      fillOut(g, vgrad(g, -9, 9, '#e6edf5', '#8a9bb3'), 1.2);
      g.beginPath(); circ(g, 0, 0, 3.2); fillOut(g, '#3a4f78', 1); g.restore();
      // Schraubenschlüssel
      g.save(); g.translate(5, -19); g.rotate(-0.8);
      g.beginPath(); rrect(g, -1.6, -2, 3.2, 13, 1.4); fillOut(g, '#ffc21a', 1);
      g.beginPath(); g.arc(0, -3.5, 3.6, 0.3, Math.PI - 0.3, true); g.lineTo(-1.2, -5); g.lineTo(1.2, -5); g.closePath(); fillOut(g, '#ffc21a', 1);
      g.restore();
      g.fillStyle = '#9fe1ff'; [[-8, -38], [8, -13], [9, -39]].forEach(function (p) { g.beginPath(); circ(g, p[0], p[1], 0.9); g.fill(); });
    } else if (k === 'hund') {
      g.beginPath(); ell(g, -7, -28, 3.4, 6.5); fillOut(g, '#6b3f1d', 1.1); g.beginPath(); ell(g, 7, -28, 3.4, 6.5); fillOut(g, '#6b3f1d', 1.1);
      g.beginPath(); circ(g, 0, -26, 8); fillOut(g, '#c98a55', 1.3);
      g.beginPath(); ell(g, 0, -21.5, 5, 3.8); fillOut(g, '#fff3e0', 1);
      g.fillStyle = OUT; g.beginPath(); ell(g, 0, -23.5, 1.8, 1.3); g.fill();
      g.beginPath(); circ(g, -3, -28, 1.3); g.fill(); g.beginPath(); circ(g, 3, -28, 1.3); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); circ(g, -2.6, -28.4, 0.45); g.fill(); g.beginPath(); circ(g, 3.4, -28.4, 0.45); g.fill();
      g.beginPath(); ell(g, 0, -19, 1.6, 1.4); g.fillStyle = '#ff6f8a'; g.fill();
      g.beginPath(); rrect(g, -6, -15.5, 12, 2.6, 1.3); fillOut(g, '#e0342a', 0.9); g.beginPath(); circ(g, 0, -13.6, 1.5); fillOut(g, '#ffd23f', 0.8);
    } else {
      // Rückseite: Fragezeichen-Stern
      g.save(); g.globalAlpha = 0.25; g.fillStyle = '#ffffff';
      for (i = 0; i < 12; i++) { g.beginPath(); g.moveTo(0, -25.5); g.arc(0, -25.5, 22, i * TAU / 12, i * TAU / 12 + 0.22); g.closePath(); g.fill(); }
      g.restore();
      star(g, 0, -25.5, 11, 5, 5); fillOut(g, vgrad(g, -37, -14, '#ffe066', '#ffb400'), 1.3);
      g.fillStyle = OUT; g.font = '900 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, -25);
    }
  }
  var curl = {};
  A.cardURL = function (k) {
    k = CARD_TH[k] ? k : 'glueck';
    if (curl[k]) return curl[k];
    curl[k] = sprite('card-' + k, [-18, -48, 18, 2], function (g) { cardFrame(g, CARD_TH[k]); cardIcon(g, k); }, { ol: 1.3, sc: 4 }).c.toDataURL();
    return curl[k];
  };
  /* ---------- Schere, Stein, Papier (für das Duell) ---------- */
  var rpsurl = {};
  A.rpsURL = function (i) {
    if (rpsurl[i]) return rpsurl[i];
    rpsurl[i] = sprite('rps-' + i, [-26, -50, 26, 2], function (g) {
      if (i === 0) { // Schere
        [[-1, 0.42], [1, -0.42]].forEach(function (s) {
          g.save(); g.translate(0, -22); g.rotate(s[1]);
          g.beginPath(); g.moveTo(-2.4, 0); g.lineTo(-1.2, -27); g.quadraticCurveTo(0, -30, 1.6, -27); g.lineTo(2.6, 0); g.closePath();
          fillOut(g, vgrad(g, -28, 0, '#ffffff', '#9aa6b8'), 1.4);
          g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-0.6, -3); g.lineTo(0, -25); g.stroke();
          g.restore();
        });
        [[-8.5, -11, -0.5], [8.5, -11, 0.5]].forEach(function (r) {
          g.save(); g.translate(r[0], r[1]); g.rotate(r[2]);
          g.beginPath(); ell(g, 0, 0, 7.5, 9.5); ell(g, 0, 0, 3.8, 5.6); g.fillStyle = vgrad(g, -10, 10, '#ff8a5c', '#d0302a'); g.fill('evenodd');
          g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); ell(g, 0, 0, 7.5, 9.5); g.stroke(); g.beginPath(); ell(g, 0, 0, 3.8, 5.6); g.stroke();
          g.restore();
        });
        g.beginPath(); circ(g, 0, -22, 2.6); fillOut(g, '#ffd23f', 1.2);
        glint(g, -10, -42, 2.6);
      } else if (i === 1) { // Stein
        g.beginPath(); g.moveTo(-21, -6); g.quadraticCurveTo(-24, -24, -12, -33); g.quadraticCurveTo(-2, -42, 10, -36); g.quadraticCurveTo(23, -30, 22, -14); g.quadraticCurveTo(22, -3, 10, -2); g.lineTo(-14, -2); g.quadraticCurveTo(-20, -2, -21, -6); g.closePath();
        fillOut(g, vgrad(g, -40, -2, '#b9c0c8', '#6b7480'), 1.8);
        g.save(); g.clip();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); ell(g, -6, -30, 10, 5); g.fill();
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); ell(g, 8, -6, 16, 6); g.fill();
        g.fillStyle = '#6fbf4a'; g.beginPath(); ell(g, -12, -31, 6, 3); g.fill(); g.beginPath(); ell(g, -5, -35.5, 4, 2.2); g.fill();
        g.restore();
        line(g, [4, -28, 8, -21, 6, -15], 'rgba(40,30,30,.55)', 1.2); line(g, [-10, -14, -5, -11], 'rgba(40,30,30,.45)', 1);
        [[-9, -20], [12, -24], [2, -9]].forEach(function (p) { g.fillStyle = 'rgba(60,60,70,.35)'; g.beginPath(); circ(g, p[0], p[1], 1.4); g.fill(); });
        glint(g, -12, -38, 2.4);
      } else { // Papier
        g.save(); g.translate(0, -24); g.rotate(-0.12);
        g.beginPath(); g.moveTo(-15, -21); g.lineTo(8, -21); g.lineTo(16, -13); g.lineTo(16, 20); g.quadraticCurveTo(0, 16, -15, 21); g.closePath();
        fillOut(g, vgrad(g, -21, 21, '#ffffff', '#e4e9ee'), 1.6);
        g.beginPath(); g.moveTo(8, -21); g.lineTo(8, -13); g.lineTo(16, -13); g.closePath(); fillOut(g, '#cfd6de', 1.2);
        g.strokeStyle = '#8fb6e8'; g.lineWidth = 1.1;
        for (var y = -10; y <= 12; y += 5) { g.beginPath(); g.moveTo(-11, y); g.lineTo(12, y - 0.5); g.stroke(); }
        g.strokeStyle = '#ff8a9a'; g.beginPath(); g.moveTo(-8, -18); g.lineTo(-8, 18); g.stroke();
        g.restore();
        glint(g, 14, -44, 2.2);
      }
    }, { ol: 1.4, sc: 4 }).c.toDataURL();
    return rpsurl[i];
  };
  A.cardBackURL = function () { return A.cardURL('back'); };
})(window.SI);
