/* Schaf-Imperium: alle Grafiken werden hier mit Canvas gezeichnet */
(function (SI) {
  'use strict';
  var A = SI.art = {};
  var TAU = Math.PI * 2;

  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
  A.ell = ell; A.circ = circ; A.rrect = rrect; A.poly = poly;

  // kleiner Zufallsgenerator mit Startwert, damit alles immer gleich aussieht
  A.rng = function (seed) {
    var s = (seed | 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 100000) / 100000; };
  };
  A.hash = function (str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  function woolPaint(g, t, x1, y1, x2, y2) {
    if (!Array.isArray(t.w)) return t.w;
    var gr, n = t.w.length;
    if (t.hard) {
      gr = g.createLinearGradient(x1, 0, x2, 0);
      t.w.forEach(function (c, i) { gr.addColorStop(i / n, c); gr.addColorStop((i + 1) / n - 0.0001, c); });
    } else {
      gr = g.createLinearGradient(x1, y1, x2, y2);
      t.w.forEach(function (c, i) { gr.addColorStop(n > 1 ? i / (n - 1) : 0, c); });
    }
    return gr;
  }

  /* ---------- Schafe ---------- */
  // Schaf von schräg oben, schaut nach rechts. Ankerpunkt unten Mitte (26, 40).
  A.SHEEP_W = 52; A.SHEEP_H = 46; A.SHEEP_AX = 26; A.SHEEP_AY = 41;
  function drawSheep(g, t, frame, opt) {
    opt = opt || {};
    var shadow = opt.shadow;
    // Schatten
    g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, 26, 40, 18, 5);
    // Beine
    var leg = shadow ? '#9aa592' : '#2b2422';
    var a = frame ? 1.6 : -1.6;
    g.fillStyle = leg;
    rrect(g, 13 + a, 29, 4, 11, 2); g.fill();
    rrect(g, 20 - a, 30, 4, 10, 2); g.fill();
    rrect(g, 31 + a, 30, 4, 10, 2); g.fill();
    rrect(g, 38 - a, 29, 4, 11, 2); g.fill();
    // Wolle
    var wool = shadow ? '#b9c4ad' : woolPaint(g, t, 6, 6, 46, 36);
    var puffs = [[15, 24, 8], [21, 17, 8.5], [30, 15, 9], [38, 19, 8.5], [41, 26, 7.5], [33, 29, 8.5], [22, 29, 8.5], [12, 28, 6]];
    if (!shadow && (t.w === '#ffffff' || t.w === '#f4f0e6')) {
      g.fillStyle = 'rgba(0,0,0,.13)';
      puffs.forEach(function (p) { circ(g, p[0], p[1] + 1, p[2] + 1); });
    }
    g.fillStyle = wool;
    puffs.forEach(function (p) { circ(g, p[0], p[1], p[2]); });
    circ(g, 27, 23, 11);
    if (!shadow) {
      g.fillStyle = 'rgba(255,255,255,.35)';
      circ(g, 24, 14, 4); circ(g, 31, 12, 3.2); circ(g, 17, 19, 2.6);
      g.fillStyle = 'rgba(0,0,0,.08)';
      ell(g, 28, 32, 13, 3);
    }
    if (!shadow && t.stars) {
      g.fillStyle = '#fff';
      [[22, 16, 1.3], [33, 22, 1.1], [18, 27, 1], [37, 15, 1.2], [29, 29, 0.9]].forEach(function (p) { circ(g, p[0], p[1], p[2]); });
    }
    if (!shadow && t.bolt) {
      g.fillStyle = 'rgba(255,255,255,.9)';
      poly(g, [30, 11, 24, 21, 29, 21, 26, 30, 35, 18, 30, 18, 33, 11]);
    }
    if (!shadow && t.sun) {
      g.fillStyle = 'rgba(255,255,255,.55)'; circ(g, 28, 21, 5);
    }
    // Kopf
    var face = shadow ? '#9aa592' : t.f;
    g.fillStyle = face;
    g.save(); g.translate(42, 14); g.rotate(-0.5); ell(g, 0, 0, 4.5, 2.3); g.restore();
    ell(g, 45, 22, 6.8, 7.8);
    g.save(); g.translate(50, 15); g.rotate(0.5); ell(g, 0, 0, 4.2, 2.2); g.restore();
    g.fillStyle = wool; circ(g, 44, 14.5, 4.4);
    if (!shadow && t.horns) {
      g.fillStyle = '#f5e6a8';
      poly(g, [40, 13, 37, 5, 43, 11]); poly(g, [48, 12, 50, 4, 51, 13]);
    }
    if (!shadow) {
      if (opt.sleep) {
        g.strokeStyle = '#fff'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(45.5, 20.5); g.lineTo(49, 20.5); g.stroke();
      } else {
        g.fillStyle = '#fff'; circ(g, 47.5, 20.5, 1.8);
        g.fillStyle = '#111'; circ(g, 48, 20.8, 0.95);
      }
      g.fillStyle = 'rgba(255,140,160,.5)'; circ(g, 49, 25, 1.4);
    }
  }
  A.drawSheep = drawSheep;

  var sheepCache = {};
  A.sheepSprite = function (t, frame, sleep, shadow) {
    var key = t.id + '|' + frame + '|' + (sleep ? 1 : 0) + '|' + (shadow ? 1 : 0);
    if (sheepCache[key]) return sheepCache[key];
    var sc = 3, c = document.createElement('canvas');
    c.width = A.SHEEP_W * sc; c.height = A.SHEEP_H * sc;
    var g = c.getContext('2d');
    if (!shadow && 'lms'.indexOf(t.r) >= 0) {
      var tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
      var tg = tmp.getContext('2d'); tg.scale(sc, sc); drawSheep(tg, t, frame, { sleep: sleep });
      g.shadowColor = SI.RAR[t.r].col; g.shadowBlur = 7 * sc; g.drawImage(tmp, 0, 0);
    } else { g.scale(sc, sc); drawSheep(g, t, frame, { sleep: sleep, shadow: shadow }); }
    sheepCache[key] = c;
    return c;
  };
  var urlCache = {};
  A.sheepURL = function (t, shadow) {
    var key = t.id + (shadow ? '_s' : '');
    if (!urlCache[key]) urlCache[key] = A.sheepSprite(t, 0, false, shadow).toDataURL();
    return urlCache[key];
  };

  /* ---------- Kleine Dinge in den Gehegen ---------- */
  // Alle Zeichner arbeiten mit Fußpunkt (0,0), nach oben ist minus.
  var P = A.props = {};
  P.flower = function (g, c) {
    g.strokeStyle = '#3f8a3a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -8); g.stroke();
    g.fillStyle = c || '#fff';
    for (var i = 0; i < 5; i++) { var a = i / 5 * TAU; circ(g, Math.cos(a) * 3, -9 + Math.sin(a) * 2.4, 2.2); }
    g.fillStyle = '#ffcf33'; circ(g, 0, -9, 1.6);
  };
  P.bush = function (g) {
    g.fillStyle = '#3f8f3c'; circ(g, -6, -6, 7); circ(g, 6, -6, 7); circ(g, 0, -11, 8);
    g.fillStyle = '#58a84e'; circ(g, -3, -12, 4); circ(g, 4, -9, 3);
  };
  P.rock = function (g, c) {
    c = c || '#8a8f99';
    g.fillStyle = c; poly(g, [-11, 0, -9, -8, -2, -12, 7, -10, 11, -3, 9, 1]);
    g.fillStyle = 'rgba(255,255,255,.22)'; poly(g, [-7, -7, -2, -11, 4, -9, -2, -6]);
  };
  P.hay = function (g) {
    g.fillStyle = '#e8c35a'; rrect(g, -13, -14, 26, 15, 4); g.fill();
    g.fillStyle = '#f5d978'; rrect(g, -13, -16, 26, 6, 3); g.fill();
    g.strokeStyle = '#b38a2a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-5, -15); g.lineTo(-5, 0); g.moveTo(5, -15); g.lineTo(5, 0); g.stroke();
  };
  P.puddle = function (g, c) { g.fillStyle = c || '#7a5230'; ell(g, 0, -2, 16, 5); g.fillStyle = 'rgba(255,255,255,.25)'; ell(g, -4, -3, 5, 1.4); };
  P.lolli = function (g, c) {
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -16); g.stroke();
    g.fillStyle = c || '#ff6fae'; circ(g, 0, -20, 7);
    g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -20, 4, 0, 4.5); g.stroke();
  };
  P.cloud = function (g, c) {
    g.fillStyle = c || '#fff'; circ(g, -7, -8, 6); circ(g, 7, -8, 6); circ(g, 0, -12, 8); ell(g, 0, -6, 14, 4);
  };
  P.leaf = function (g) {
    g.fillStyle = '#4fbf7a';
    for (var i = 0; i < 4; i++) { g.save(); g.rotate(-0.9 + i * 0.6); ell(g, 0, -8, 3.2, 8); g.restore(); }
  };
  P.pine = function (g, c) {
    g.fillStyle = '#6b4a2a'; g.fillRect(-2, -6, 4, 6);
    g.fillStyle = c || '#2f6f4a'; poly(g, [-11, -6, 0, -22, 11, -6]); poly(g, [-9, -14, 0, -30, 9, -14]);
    g.fillStyle = '#fff'; poly(g, [-5, -22, 0, -30, 5, -22, 0, -24]);
  };
  P.ice = function (g) {
    g.fillStyle = '#9fe3ff'; poly(g, [-7, 0, -4, -16, 0, -22, 4, -15, 7, 0]);
    g.fillStyle = '#d9f6ff'; poly(g, [-3, -2, -2, -15, 0, -20, 0, -2]);
  };
  P.mushroom = function (g) {
    g.fillStyle = '#f2ead8'; g.fillRect(-2, -8, 4, 8);
    g.fillStyle = '#d9372b'; ell(g, 0, -9, 8, 5);
    g.fillStyle = '#fff'; circ(g, -3, -10, 1.3); circ(g, 3, -11, 1.1); circ(g, 1, -8, 0.9);
  };
  P.tree = function (g) {
    g.fillStyle = '#6b4a2a'; g.fillRect(-3, -14, 6, 14);
    g.fillStyle = '#2f7a3a'; circ(g, -8, -20, 10); circ(g, 8, -20, 10); circ(g, 0, -29, 11);
    g.fillStyle = '#46994a'; circ(g, -4, -30, 5); circ(g, 6, -23, 4);
  };
  P.coin = function (g) {
    for (var i = 0; i < 4; i++) { g.fillStyle = '#c98a12'; ell(g, 0, -i * 3, 7, 2.6); g.fillStyle = '#f5c542'; ell(g, 0, -i * 3 - 1, 7, 2.6); }
    g.fillStyle = '#c98a12'; ell(g, 9, 0, 6, 2.2); g.fillStyle = '#ffe07a'; ell(g, 9, -1, 6, 2.2);
  };
  P.crystal = function (g, c) {
    c = c || '#a98bff';
    g.fillStyle = c;
    poly(g, [-9, 0, -8, -10, -5, -14, -3, 0]); poly(g, [-3, 0, -2, -18, 1, -24, 4, -18, 4, 0]); poly(g, [4, 0, 6, -9, 9, -11, 10, 0]);
    g.fillStyle = 'rgba(255,255,255,.45)'; poly(g, [-1, -2, -1, -17, 1, -22, 1, -2]);
  };
  P.planet = function (g) {
    g.fillStyle = '#ff9ad5'; circ(g, 0, -12, 7);
    g.strokeStyle = '#ffe07a'; g.lineWidth = 1.8; g.beginPath(); g.ellipse(0, -12, 12, 3.5, -0.3, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; circ(g, -2, -14, 2.4);
  };
  P.fire = function (g, c, time) {
    var f = Math.sin((time || 0) * 9) * 1.5;
    g.fillStyle = '#5a3a20'; g.save(); g.rotate(0.3); g.fillRect(-9, -3, 18, 4); g.restore(); g.save(); g.rotate(-0.3); g.fillRect(-9, -3, 18, 4); g.restore();
    g.fillStyle = '#ff6a2b'; poly(g, [-7, -2, -5, -12 - f, 0, -20 + f, 5, -12 - f, 7, -2]);
    g.fillStyle = '#ffd23f'; poly(g, [-4, -2, -2, -9, 0, -14 - f, 3, -9, 4, -2]);
  };
  P.acacia = function (g) {
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -14); g.lineTo(-6, -24); g.moveTo(0, -14); g.lineTo(7, -24); g.stroke();
    g.fillStyle = '#5f8f3a'; ell(g, 0, -27, 20, 6); g.fillStyle = '#76a84a'; ell(g, -3, -29, 12, 3.5);
  };
  P.steam = function (g, c, time) {
    g.fillStyle = '#9fd7e8'; ell(g, 0, -2, 15, 5);
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (var i = 0; i < 3; i++) { var p = ((time || 0) * 0.5 + i / 3) % 1; circ(g, Math.sin(p * 6 + i) * 4, -6 - p * 22, 3 + p * 5); }
  };
  P.diamond = function (g) {
    g.fillStyle = '#7fd8ff'; poly(g, [-8, -12, -4, -17, 4, -17, 8, -12, 0, -1]);
    g.fillStyle = '#d9f6ff'; poly(g, [-4, -12, 0, -17, 4, -12, 0, -3]);
  };
  P.sunflower = function (g) {
    g.strokeStyle = '#3f8a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -20); g.stroke();
    g.fillStyle = '#4fa047'; ell(g, -4, -9, 4, 2); ell(g, 4, -13, 4, 2);
    g.fillStyle = '#ffd23f'; for (var i = 0; i < 10; i++) { var a = i / 10 * TAU; ell(g, Math.cos(a) * 5.5, -22 + Math.sin(a) * 5.5, 3, 3); }
    g.fillStyle = '#6b3a12'; circ(g, 0, -22, 4);
  };

  /* ---------- Gehege-Boden (einmal vorgezeichnet) ---------- */
  var penCache = {};
  A.penGround = function (t, w, h) {
    var key = t.id + w + 'x' + h;
    if (penCache[key]) return penCache[key];
    var sc = 1.5, c = document.createElement('canvas');
    c.width = w * sc; c.height = h * sc;
    var g = c.getContext('2d'); g.scale(sc, sc);
    var p = t.pen, R = A.rng(A.hash(t.id));
    if (p.g === 'rainbow') {
      var cols = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#d9c2ff'];
      cols.forEach(function (c2, i) { g.fillStyle = c2; g.fillRect(0, i * h / cols.length, w, h / cols.length + 1); });
    } else { g.fillStyle = p.g; g.fillRect(0, 0, w, h); }
    var i;
    if (p.sk === 'dot') {
      g.fillStyle = p.s;
      for (i = 0; i < w * h / 260; i++) ell(g, R() * w, R() * h, 1.5 + R() * 3, 1 + R() * 2);
    } else if (p.sk === 'stripe') {
      g.strokeStyle = p.s; g.lineWidth = 2;
      for (i = 0; i < w * h / 500; i++) { var x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + R() * 6, y + (R() - 0.5) * 3); g.stroke(); }
    } else if (p.sk === 'star') {
      g.fillStyle = p.s;
      for (i = 0; i < w * h / 300; i++) { g.globalAlpha = 0.3 + R() * 0.7; circ(g, R() * w, R() * h, 0.6 + R() * 1.4); }
      g.globalAlpha = 1;
    } else if (p.sk === 'lava') {
      g.fillStyle = 'rgba(0,0,0,.25)';
      for (i = 0; i < 18; i++) ell(g, R() * w, R() * h, 5 + R() * 9, 3 + R() * 5);
      for (i = 0; i < 6; i++) {
        var lx = 20 + R() * (w - 40), ly = 20 + R() * (h - 40), lr = 10 + R() * 14;
        var gr = g.createRadialGradient(lx, ly, 1, lx, ly, lr);
        gr.addColorStop(0, '#ffe07a'); gr.addColorStop(0.5, p.s); gr.addColorStop(1, 'rgba(255,80,20,0)');
        g.fillStyle = gr; ell(g, lx, ly, lr, lr * 0.75);
      }
    }
    // weicher Rand innen
    var edge = g.createLinearGradient(0, 0, 0, h);
    edge.addColorStop(0, 'rgba(0,0,0,.12)'); edge.addColorStop(0.12, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = edge; g.fillRect(0, 0, w, h);
    penCache[key] = c;
    return c;
  };

  A.FENCE = {
    c: { post: '#8a5a32', rail: '#a8703f', top: '#6b4424' },
    r: { post: '#f4f1ea', rail: '#ffffff', top: '#c9c3b5' },
    e: { post: '#8d939c', rail: '#a8aeb7', top: '#6b7079' },
    l: { post: '#e0a92a', rail: '#f5c542', top: '#a8760e' },
    m: { post: '#b07cff', rail: '#e0b8ff', top: '#7a3cff' },
    s: { post: '#2bb3a3', rail: '#6fe0d2', top: '#127a6e' }
  };

  /* ---------- Deko ---------- */
  var D = A.deko = {};
  function shadow() { /* Schatten malt jetzt style.js */ }
  D.heu = function (g) { P.hay(g); g.save(); g.translate(10, 4); P.hay(g); g.restore(); };
  D.fass = function (g) {
    shadow(g, 11);
    g.fillStyle = '#8a5a32'; rrect(g, -9, -22, 18, 22, 4); g.fill();
    g.fillStyle = '#a8703f'; ell(g, 0, -22, 9, 3);
    g.fillStyle = '#4a4f57'; g.fillRect(-9, -17, 18, 2); g.fillRect(-9, -6, 18, 2);
  };
  D.blumen = function (g) {
    g.fillStyle = '#7a5230'; ell(g, 0, -2, 18, 6);
    var cols = ['#ff6fae', '#ffd23f', '#ffffff', '#b36bff', '#ff5f6d'];
    for (var i = 0; i < 7; i++) { g.save(); g.translate(-12 + i * 4, -1 + (i % 2) * 2); g.scale(0.8, 0.8); P.flower(g, cols[i % cols.length]); g.restore(); }
  };
  D.laterne = function (g, t, night) {
    shadow(g, 6);
    g.fillStyle = '#3a3f47'; g.fillRect(-1.5, -26, 3, 26);
    g.fillStyle = '#3a3f47'; rrect(g, -6, -36, 12, 12, 2); g.fill();
    g.fillStyle = night ? '#ffe9a0' : '#fff6d6'; g.fillRect(-4, -34, 8, 8);
    g.fillStyle = '#3a3f47'; poly(g, [-7, -36, 0, -41, 7, -36]);
  };
  D.pilz = function (g) {
    for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; g.save(); g.translate(Math.cos(a) * 12, Math.sin(a) * 4); P.mushroom(g); g.restore(); }
  };
  D.busch = function (g) {
    P.bush(g); g.fillStyle = '#7a3cff'; [[-6, -8], [4, -12], [6, -5], [-2, -14], [-8, -3]].forEach(function (p) { circ(g, p[0], p[1], 1.6); });
  };
  D.lampe = function (g, t, night) {
    shadow(g, 6);
    g.fillStyle = '#2f3540'; g.fillRect(-2, -52, 4, 52); g.fillRect(-2, -52, 14, 3);
    g.fillStyle = '#2f3540'; poly(g, [6, -49, 18, -49, 15, -44, 9, -44]);
    g.fillStyle = night ? '#fff1b0' : '#f3f0e0'; ell(g, 12, -43, 4, 2);
  };
  D.brunnen = function (g) {
    shadow(g, 20);
    g.fillStyle = '#9aa0aa'; ell(g, 0, -4, 18, 7); g.fillRect(-18, -12, 36, 8); ell(g, 0, -12, 18, 7);
    g.fillStyle = '#4a7fb0'; ell(g, 0, -12, 13, 4.5);
    g.fillStyle = '#6b4424'; g.fillRect(-15, -34, 3, 22); g.fillRect(12, -34, 3, 22);
    g.fillStyle = '#b4472f'; poly(g, [-20, -32, 0, -44, 20, -32]);
    g.fillStyle = '#8a5a32'; g.fillRect(-3, -28, 6, 6);
  };
  D.vogel = function (g, t) {
    shadow(g, 8);
    var s = Math.sin((t || 0) * 2) * 0.05;
    g.save(); g.rotate(s);
    g.fillStyle = '#6b4424'; g.fillRect(-1.5, -40, 3, 40); g.fillRect(-14, -30, 28, 3);
    g.fillStyle = '#4f7fb5'; poly(g, [-9, -30, 9, -30, 7, -14, -7, -14]);
    g.fillStyle = '#e8d3a0'; circ(g, 0, -36, 6);
    g.fillStyle = '#d9b84a'; poly(g, [-10, -39, 10, -39, 4, -46, -4, -46]);
    g.fillStyle = '#e8c35a'; g.fillRect(-16, -30, 3, 6); g.fillRect(13, -30, 3, 6);
    g.fillStyle = '#222'; circ(g, -2, -36, 1); circ(g, 2.4, -36, 1);
    g.restore();
  };
  D.baum = function (g) {
    P.tree(g);
    g.fillStyle = '#e0362b'; [[-8, -22], [6, -26], [2, -16], [-2, -32], [9, -18]].forEach(function (p) { circ(g, p[0], p[1], 2); });
  };
  D.bank = function (g) {
    shadow(g, 18, 4);
    g.fillStyle = '#4a4f57'; g.fillRect(-15, -8, 2, 8); g.fillRect(13, -8, 2, 8);
    g.fillStyle = '#a8703f'; g.fillRect(-17, -10, 34, 4); g.fillRect(-17, -20, 34, 3); g.fillRect(-17, -15, 34, 3);
  };
  D.scheune = function (g, t, night) {
    shadow(g, 42, 9);
    g.fillStyle = '#b5372b'; g.fillRect(-36, -46, 72, 46);
    g.fillStyle = '#d24a3a'; g.fillRect(-36, -46, 72, 8);
    g.fillStyle = '#5a3a2a'; poly(g, [-42, -44, 0, -72, 42, -44]);
    g.fillStyle = '#7a4a32'; poly(g, [-36, -46, 0, -68, 36, -46]);
    g.fillStyle = '#fff'; g.fillRect(-14, -30, 28, 30);
    g.fillStyle = '#8a2b20'; g.fillRect(-12, -28, 24, 28);
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, -28); g.lineTo(12, 0); g.moveTo(12, -28); g.lineTo(-12, 0); g.stroke();
    g.fillStyle = night ? '#ffd86b' : '#3a2a20'; g.fillRect(-6, -60, 12, 9);
  };
  D.muehle = function (g, t) {
    shadow(g, 18);
    g.fillStyle = '#efe6d4'; poly(g, [-12, 0, -8, -50, 8, -50, 12, 0]);
    g.fillStyle = '#b4472f'; poly(g, [-11, -48, 0, -62, 11, -48]);
    g.fillStyle = '#6b4424'; g.fillRect(-4, -12, 8, 12);
    g.save(); g.translate(0, -48); g.rotate((t || 0) * 0.8);
    g.fillStyle = '#d9cbb0';
    for (var i = 0; i < 4; i++) { g.rotate(TAU / 4); g.fillRect(-3, -32, 6, 28); }
    g.fillStyle = '#6b4424'; circ(g, 0, 0, 3);
    g.restore();
  };
  D.teich = function (g, t) {
    g.fillStyle = '#6b8a4a'; ell(g, 0, -2, 34, 13);
    g.fillStyle = '#4a8fd0'; ell(g, 0, -2, 30, 10.5);
    g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, -10, -5, 9, 2);
    var dx = Math.sin((t || 0) * 0.4) * 12;
    g.fillStyle = '#ffffff'; ell(g, dx, -4, 5, 3.4); circ(g, dx + 4, -8, 2.6);
    g.fillStyle = '#ff9a1a'; poly(g, [dx + 6, -8.5, dx + 9, -7.5, dx + 6, -6.8]);
    g.fillStyle = '#4fa047'; ell(g, -22, -6, 4, 1.6); ell(g, 20, 2, 4, 1.6);
  };
  D.feuer = function (g, t) {
    g.fillStyle = '#8a8f99'; for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; circ(g, Math.cos(a) * 12, Math.sin(a) * 4 - 1, 3.4); }
    g.save(); g.scale(1.3, 1.3); P.fire(g, null, t); g.restore();
  };
  D.statue = function (g) {
    shadow(g, 18);
    g.fillStyle = '#9aa0aa'; g.fillRect(-15, -16, 30, 16); g.fillStyle = '#b8bec8'; ell(g, 0, -16, 15, 4);
    var spr = A.sheepSprite(SI.T.gold, 0, false, false);
    g.drawImage(spr, -26, -16 - 41, A.SHEEP_W, A.SHEEP_H);
  };
  D.leucht = function (g, t, night) {
    shadow(g, 14);
    g.fillStyle = '#ffffff'; poly(g, [-11, 0, -7, -60, 7, -60, 11, 0]);
    g.fillStyle = '#d9372b'; poly(g, [-10, -12, -9.2, -24, 9.2, -24, 10, -12]); poly(g, [-8.4, -36, -7.7, -48, 7.7, -48, 8.4, -36]);
    g.fillStyle = '#2f3540'; g.fillRect(-9, -62, 18, 3);
    g.fillStyle = night ? '#fff1b0' : '#cfe8ff'; g.fillRect(-6, -72, 12, 10);
    g.fillStyle = '#d9372b'; poly(g, [-8, -72, 0, -80, 8, -72]);
    if (night) {
      g.save(); g.translate(0, -67); g.rotate((t || 0) * 1.2);
      var gr = g.createLinearGradient(0, 0, 90, 0); gr.addColorStop(0, 'rgba(255,240,170,.7)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = gr; poly(g, [0, 0, 90, -14, 90, 14]); g.restore();
    }
  };
  D.regenbrunnen = function (g, t) {
    shadow(g, 26, 8);
    g.fillStyle = '#e6e9ef'; ell(g, 0, -4, 25, 9); g.fillRect(-25, -12, 50, 8); ell(g, 0, -12, 25, 9);
    g.fillStyle = '#7fd0ff'; ell(g, 0, -12, 20, 6.5);
    g.fillStyle = '#e6e9ef'; g.fillRect(-3, -30, 6, 18); ell(g, 0, -30, 9, 3);
    var cols = ['#ff5f6d', '#ffc371', '#fff36b', '#6bf08a', '#5ab8ff', '#b36bff'];
    g.lineWidth = 2;
    cols.forEach(function (c, i) {
      g.strokeStyle = c; g.beginPath(); g.arc(0, -30, 16 - i * 2, Math.PI, 0); g.stroke();
    });
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (var i = 0; i < 5; i++) { var p = ((t || 0) * 0.8 + i / 5) % 1; circ(g, -14 + i * 7, -30 + p * 18, 1.4); }
  };
  D.kristallbaum = function (g, t, night) {
    shadow(g, 18);
    g.fillStyle = '#6b5a8a'; poly(g, [-3, 0, -2, -22, 2, -22, 3, 0]);
    var cols = ['#c4adff', '#7fd8ff', '#ff9ad5'];
    [[-12, -26, 0], [10, -28, 1], [0, -40, 2], [-6, -34, 1], [8, -40, 0], [-12, -42, 2], [2, -52, 0]].forEach(function (p) {
      g.fillStyle = cols[p[2]]; poly(g, [p[0] - 5, p[1], p[0], p[1] - 11, p[0] + 5, p[1], p[0], p[1] + 4]);
      g.fillStyle = 'rgba(255,255,255,.5)'; poly(g, [p[0] - 1.5, p[1], p[0], p[1] - 8, p[0] + 1, p[1]]);
    });
    if (night) { g.fillStyle = 'rgba(255,255,255,.9)'; circ(g, Math.sin((t || 0) * 3) * 10, -38, 1.4); }
  };
  D.drache = function (g, t) {
    shadow(g, 30, 8);
    g.fillStyle = '#7a8090'; g.fillRect(-26, -12, 52, 12); g.fillStyle = '#9aa0aa'; ell(g, 0, -12, 26, 5);
    g.fillStyle = '#2fa85a';
    poly(g, [-18, -14, -10, -34, 8, -36, 18, -16]);
    poly(g, [6, -34, 14, -50, 24, -50, 26, -44, 16, -38]);
    poly(g, [-6, -30, -26, -52, -10, -30]); poly(g, [2, -32, -6, -58, 8, -34]);
    g.fillStyle = '#14603a'; poly(g, [-18, -14, -26, -10, -30, -18, -22, -16]);
    g.fillStyle = '#ffd23f'; circ(g, 20, -47, 1.6);
    var f = Math.sin((t || 0) * 2);
    if (f > 0.3) {
      g.fillStyle = 'rgba(255,106,43,.9)'; poly(g, [26, -46, 44 + f * 10, -52, 44 + f * 10, -38]);
      g.fillStyle = 'rgba(255,210,63,.9)'; poly(g, [26, -46, 36 + f * 6, -48, 36 + f * 6, -43]);
    }
  };
  D.ufo = function (g, t, night) {
    var hov = Math.sin((t || 0) * 2) * 3;
    if (night) {
      var gr = g.createLinearGradient(0, -34, 0, 0); gr.addColorStop(0, 'rgba(140,255,170,.6)'); gr.addColorStop(1, 'rgba(140,255,170,.05)');
      g.fillStyle = gr; poly(g, [-6, -34 + hov, 6, -34 + hov, 18, 0, -18, 0]);
    }
    g.fillStyle = '#9aa6b8'; ell(g, 0, -38 + hov, 24, 7);
    g.fillStyle = '#c9d2e0'; ell(g, 0, -41 + hov, 24, 5);
    g.fillStyle = 'rgba(160,230,255,.85)'; g.beginPath(); g.ellipse(0, -43 + hov, 11, 10, 0, Math.PI, 0); g.fill();
    for (var i = 0; i < 6; i++) { g.fillStyle = (Math.floor((t || 0) * 4) + i) % 2 ? '#ffe24a' : '#6bf08a'; circ(g, -18 + i * 7.2, -37 + hov, 1.8); }
  };

  /* ---------- Bauernhaus, Bäume, Wolf ---------- */
  A.house = function (g, t, night) {
    g.fillStyle = '#f2e6cf'; g.fillRect(-52, -58, 104, 58);
    g.fillStyle = '#e3d3b4'; g.fillRect(-52, -10, 104, 10);
    g.fillStyle = '#9c3b2b'; poly(g, [-60, -56, -40, -92, 40, -92, 60, -56]);
    g.fillStyle = '#b84a36'; poly(g, [-56, -58, -38, -88, 38, -88, 56, -58]);
    g.fillStyle = '#6b4424'; g.fillRect(28, -104, 10, 18);
    var win = night ? '#ffd86b' : '#9fd2f3';
    g.fillStyle = '#ffffff'; g.fillRect(-42, -44, 22, 20); g.fillRect(20, -44, 22, 20);
    g.fillStyle = win; g.fillRect(-40, -42, 18, 16); g.fillRect(22, -42, 18, 16);
    g.fillStyle = '#ffffff'; g.fillRect(-32, -42, 2, 16); g.fillRect(30, -42, 2, 16);
    g.fillStyle = '#7a4a2a'; rrect(g, -10, -36, 20, 36, 3); g.fill();
    g.fillStyle = '#e0a92a'; circ(g, 6, -18, 1.6);
    // Rauch
    g.fillStyle = 'rgba(255,255,255,.5)';
    for (var i = 0; i < 3; i++) { var p = ((t || 0) * 0.25 + i / 3) % 1; circ(g, 33 + Math.sin(p * 5) * 5, -108 - p * 30, 3 + p * 5); }
  };
  A.treeBig = function (g, kind) {
    if (kind === 1) { P.pine(g, '#2a6a42'); g.save(); g.translate(0, 0); g.scale(1.5, 1.5); P.pine(g, '#2f7a4a'); g.restore(); return; }
    g.fillStyle = '#6b4a2a'; g.fillRect(-4, -18, 8, 18);
    g.fillStyle = kind === 2 ? '#3f8f3c' : '#2f7a3a'; circ(g, -11, -26, 13); circ(g, 11, -26, 13); circ(g, 0, -38, 15);
    g.fillStyle = 'rgba(255,255,255,.12)'; circ(g, -5, -40, 6);
  };
  A.wolf = function (g, t) {
    var b = Math.sin((t || 0) * 10) * 1.2;
    g.fillStyle = '#4c525a'; g.fillRect(-14, -14, 4, 14); g.fillRect(8, -14, 4, 14);
    g.fillStyle = '#6f7680'; ell(g, 0, -18 + b, 20, 10);
    g.fillStyle = '#6f7680'; poly(g, [-18, -20 + b, -32, -30, -24, -16 + b]);
    g.fillStyle = '#868d96'; poly(g, [12, -26 + b, 30, -24 + b, 34, -16 + b, 22, -10 + b, 12, -14 + b]);
    g.fillStyle = '#4c525a'; poly(g, [16, -26 + b, 18, -36 + b, 22, -26 + b]); poly(g, [22, -26 + b, 26, -35 + b, 27, -25 + b]);
    g.fillStyle = '#ffd23f'; circ(g, 24, -21 + b, 1.8);
    g.fillStyle = '#222'; circ(g, 33.5, -17 + b, 1.6);
  };

  /* ---------- Boxen fürs Menü (als Bild) ---------- */
  var boxUrl = {};
  A.boxURL = function (col, mark) {
    var key = col + (mark || '');
    if (boxUrl[key]) return boxUrl[key];
    var sc = 3, c = document.createElement('canvas'); c.width = 80 * sc; c.height = 72 * sc;
    var g = c.getContext('2d'); g.scale(sc, sc);
    var f;
    if (col === 'rainbow') { f = g.createLinearGradient(0, 0, 80, 72); ['#ff5f6d', '#ffc371', '#fff36b', '#6bf08a', '#5ab8ff', '#b36bff'].forEach(function (c2, i) { f.addColorStop(i / 5, c2); }); }
    else f = col;
    var sh = g.createLinearGradient(0, 0, 0, 72); sh.addColorStop(0, 'rgba(255,255,255,.25)'); sh.addColorStop(1, 'rgba(0,0,0,.2)');
    g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, 40, 68, 34, 4);
    g.fillStyle = f; rrect(g, 8, 28, 64, 40, 6); g.fill(); g.fillStyle = sh; rrect(g, 8, 28, 64, 40, 6); g.fill();
    g.fillStyle = f; rrect(g, 4, 15, 72, 16, 6); g.fill(); g.fillStyle = sh; rrect(g, 4, 15, 72, 16, 6); g.fill();
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(35, 15, 10, 53);
    g.fillStyle = 'rgba(255,255,255,.92)'; circ(g, 40, 49, 10);
    g.fillStyle = '#3b2a12'; g.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(mark || '?', 40, 50);
    boxUrl[key] = c.toDataURL();
    return boxUrl[key];
  };
  var dekoUrl = {};
  A.dekoURL = function (d, shadowOnly) {
    var key = d.id + (shadowOnly ? '_s' : '');
    if (dekoUrl[key]) return dekoUrl[key];
    var sc = 2, W = 110, H = 110, c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc;
    var g = c.getContext('2d'); g.scale(sc, sc);
    var fit = d.rad > 30 ? 0.85 : 1.15;
    g.translate(W / 2, H - 14); g.scale(fit, fit);
    D[d.id](g, 1.2, false);
    if (shadowOnly) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#b9c4ad'; g.fillRect(0, 0, c.width, c.height); }
    dekoUrl[key] = c.toDataURL();
    return dekoUrl[key];
  };
})(window.SI);
