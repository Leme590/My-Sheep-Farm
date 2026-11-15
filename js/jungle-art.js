/* Schaf-Imperium: Dschungel-Update (Kai, 15.11.2026). Bilder für Dschungel-Schafe, Gehege, Deko,
   Dschungel-Bäume, Tukane, Kolibris, den Tempel mit den Verlorenen Artefakten und die Artefakte selbst. */
(function (SI) {
  'use strict';
  var A = SI.art, TAU = Math.PI * 2;
  var ell = A.ell, circ = A.circ, rrect = A.rrect, poly = A.poly, sfill = A.sfill, line = A.line, blob = A.blob, mix = A.mix, OUT = A.OUT;
  var sprite = A.sprite;

  /* ---------- Aussehen der Dschungel-Schafe ---------- */
  var L = SI.LOOK;
  L.bananen = { pat: 'bananas', mood: 'happy', head: 'banana' };
  L.lianen = { pat: 'vines', mood: 'happy', head: 'leaf' };
  L.frosch = { pat: 'frogspots', mood: 'happy', head: 'frogeyes' };
  L.orchidee = { pat: 'petals', mood: 'lash', head: 'orchid' };
  L.faultier = { pat: 'moss', mood: 'sleepy', head: 'leaf' };
  L.tukan = { pat: 'bib', mood: 'happy', head: 'toucan' };
  L.jaguar = { pat: 'rosettes', mood: 'cool', head: 'catears' };
  L.gorilla = { pat: 'chest', mood: 'angry', head: 'banana' };
  L.chamaeleon = { pat: 'scales', mood: 'star', head: 'curl' };
  L.panther = { pat: 'rosettes', mood: 'cool', head: 'catears' };
  L.tempel = { pat: 'glyphs', mood: 'star', head: 'templecrown' };
  L.smaragd = { pat: 'facets', mood: 'star', back: 'emeralds', head: 'emerald' };
  L.quetzal = { pat: 'feathers2', mood: 'happy', back: 'tailfeathers', head: 'plume' };
  L.urwald = { pat: 'moss', mood: 'sleepy', back: 'mushrooms', head: 'antlers' };
  L.tarn = { mood: 'cool', head: 'leaf' };
  L.waechter = { pat: 'glyphs', mood: 'star', back: 'sunrays', head: 'templecrown' };

  var P = A.extPat, H = A.extHead, B = A.extBack;
  P.bananas = function (g, t, R) {
    for (var i = 0; i < 5; i++) {
      var x = -18 + R() * 32, y = -32 + R() * 22; g.save(); g.translate(x, y); g.rotate(R() * 2 - 1);
      g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(0, 5, 5, 0); g.quadraticCurveTo(0, 2.6, -5, 0); g.closePath(); g.fillStyle = '#f2c21a'; g.fill(); g.strokeStyle = '#8a6a10'; g.lineWidth = 0.7; g.stroke();
      g.restore();
    }
  };
  P.vines = function (g, t, R) {
    g.strokeStyle = '#3f8a2a'; g.lineWidth = 1.6;
    for (var i = 0; i < 3; i++) { var x = -16 + i * 14; g.beginPath(); g.moveTo(x, -40); g.bezierCurveTo(x + 6, -28, x - 6, -18, x + 2, -4); g.stroke(); }
    g.fillStyle = '#5fbf3a'; for (i = 0; i < 9; i++) ell(g, -18 + R() * 34, -34 + R() * 28, 2.4, 1.2);
  };
  P.frogspots = function (g, t, R) {
    g.fillStyle = '#2f8a3a'; for (var i = 0; i < 8; i++) circ(g, -18 + R() * 34, -32 + R() * 26, 1.6 + R() * 2);
    g.fillStyle = 'rgba(255,255,200,.5)'; ell(g, 0, -6, 16, 5);
  };
  P.petals = function (g, t, R) {
    for (var i = 0; i < 6; i++) { var x = -16 + R() * 30, y = -30 + R() * 22; g.fillStyle = i % 2 ? '#c86be0' : '#ffffff'; for (var k = 0; k < 5; k++) circ(g, x + Math.cos(k * 1.26) * 2, y + Math.sin(k * 1.26) * 2, 1.5); g.fillStyle = '#ffd23f'; circ(g, x, y, 1); }
  };
  P.bib = function (g) { // Tukan: weiße Brust
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(12, -16, 9, 11, 0.2, 0, TAU); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(13, -22, 6, 4, 0.2, 0, TAU); g.fill();
  };
  P.rosettes = function (g, t, R) {
    var dark = t.id === 'panther';
    for (var i = 0; i < 10; i++) {
      var x = -18 + R() * 34, y = -32 + R() * 26;
      g.strokeStyle = dark ? 'rgba(140,110,255,.55)' : '#5a3a10'; g.lineWidth = 1.3;
      g.beginPath(); g.arc(x, y, 2.6, 0.3, 5.6); g.stroke();
      g.fillStyle = dark ? 'rgba(90,70,160,.5)' : '#c8801a'; circ(g, x, y, 1.2);
    }
  };
  P.chest = function (g) { g.fillStyle = 'rgba(160,160,180,.55)'; g.beginPath(); g.ellipse(8, -14, 10, 9, 0, 0, TAU); g.fill(); };
  P.glyphs = function (g, t, R) {
    g.strokeStyle = t.id === 'waechter' ? '#2fa070' : '#7a5a1a'; g.lineWidth = 1.2;
    for (var i = 0; i < 6; i++) {
      var x = -16 + (i % 3) * 13, y = -30 + Math.floor(i / 3) * 14;
      g.strokeRect(x - 3.5, y - 3.5, 7, 7); g.beginPath();
      if (i % 3 === 0) { g.arc(x, y, 1.8, 0, TAU); } else if (i % 3 === 1) { g.moveTo(x - 2, y); g.lineTo(x + 2, y); g.moveTo(x, y - 2); g.lineTo(x, y + 2); } else { g.moveTo(x - 2, y + 2); g.lineTo(x, y - 2); g.lineTo(x + 2, y + 2); }
      g.stroke();
    }
  };
  P.feathers2 = function (g, t, R) {
    ['#1fa0d0', '#3fe0a0', '#e8322e'].forEach(function (c, k) { g.fillStyle = c; for (var i = 0; i < 5; i++) { g.save(); g.translate(-20 + i * 9 + k * 2, -30 + k * 9); g.rotate(0.5); ell(g, 0, 0, 4.4, 2); g.restore(); } });
  };

  H.banana = function (g) {
    g.save(); g.translate(19, -35); g.rotate(-0.3);
    g.beginPath(); g.moveTo(-7, 0); g.quadraticCurveTo(0, 7, 7, -1); g.quadraticCurveTo(0, 3, -7, 0); g.closePath(); sfill(g, '#ffd23a', 1.2);
    line(g, [7, -1, 8.5, -3], '#5a4010', 1.4); g.restore();
  };
  H.frogeyes = function (g) {
    [[14.5, -31], [23.5, -31]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 3.6, 0, TAU); sfill(g, '#7ae05a', 1.2); g.fillStyle = '#ffffff'; circ(g, p[0], p[1] - 0.5, 2.4); g.fillStyle = '#111'; circ(g, p[0] + 0.4, p[1] - 0.5, 1.2); });
  };
  H.orchid = function (g) {
    g.save(); g.translate(23, -32);
    [0, 1.25, 2.5, 3.75, 5].forEach(function (a) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -3.6, 2.2, 3.6, 0, 0, TAU); sfill(g, '#e98bff', 0.9); g.restore(); });
    g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); sfill(g, '#ffd23f', 0.8); g.restore();
  };
  H.toucan = function (g) { // großer bunter Schnabel
    g.beginPath(); g.moveTo(24, -24); g.quadraticCurveTo(36, -26, 33, -16); g.quadraticCurveTo(30, -17, 25, -17); g.closePath(); sfill(g, '#ff9a1a', 1.2);
    g.fillStyle = '#e8322e'; g.beginPath(); g.moveTo(30, -25); g.quadraticCurveTo(35, -24, 33, -17); g.lineTo(31, -18); g.closePath(); g.fill();
    line(g, [25, -20.5, 32, -20], OUT, 0.8);
  };
  H.catears = function (g, t) {
    var c = t.id === 'panther' ? '#2a2638' : '#e8a030';
    [[13, -28, -0.4], [24, -28, 0.4]].forEach(function (p) { g.save(); g.translate(p[0], p[1]); g.rotate(p[2]); g.beginPath(); g.moveTo(-3.4, 2); g.lineTo(0, -6); g.lineTo(3.4, 2); g.closePath(); sfill(g, c, 1.2); g.fillStyle = '#ff9db5'; poly(g, [-1.6, 1, 0, -3, 1.6, 1]); g.restore(); });
    line(g, [24, -18, 31, -19], OUT, 0.7); line(g, [24, -16.5, 31, -15.5], OUT, 0.7);
  };
  H.curl = function (g) { // Chamäleon-Kamm
    g.beginPath(); g.moveTo(13, -28); g.quadraticCurveTo(18, -40, 25, -29); g.closePath(); sfill(g, '#3fd0c0', 1.2);
    g.fillStyle = '#ffd23f'; circ(g, 18.5, -32, 1.4);
  };
  H.templecrown = function (g, t) {
    var gold = '#ffcc22';
    g.beginPath(); g.moveTo(11, -29); g.lineTo(11, -36); g.lineTo(14, -36); g.lineTo(14, -39); g.lineTo(17, -39); g.lineTo(17, -42); g.lineTo(20, -42); g.lineTo(20, -39); g.lineTo(23, -39); g.lineTo(23, -36); g.lineTo(26, -36); g.lineTo(26, -29); g.closePath(); sfill(g, gold, 1.3);
    g.fillStyle = '#2fd08a'; circ(g, 18.5, -33, 2); g.fillStyle = '#e8322e'; circ(g, 13.5, -32, 1); circ(g, 23.5, -32, 1);
  };
  H.emerald = function (g) {
    g.beginPath(); g.moveTo(18.5, -27); g.lineTo(14.5, -32); g.lineTo(16.5, -37); g.lineTo(20.5, -37); g.lineTo(22.5, -32); g.closePath(); sfill(g, '#2fe08a', 1.2);
    g.fillStyle = 'rgba(255,255,255,.7)'; poly(g, [16.5, -33, 17.5, -36, 19, -36, 18, -33]);
  };
  H.plume = function (g) {
    [['#e8322e', -0.5], ['#3fe0a0', 0], ['#1fa0d0', 0.5]].forEach(function (p) { g.save(); g.translate(19, -29); g.rotate(p[1]); g.beginPath(); g.ellipse(0, -7, 2.4, 7, 0, 0, TAU); sfill(g, p[0], 1); g.restore(); });
  };
  B.tailfeathers = function (g, t, front) {
    if (front) return;
    ['#1fa0d0', '#3fe0a0', '#5ff0b0'].forEach(function (c, i) {
      g.save(); g.translate(-18, -16); g.rotate(-2.6 + i * 0.25);
      g.beginPath(); g.ellipse(0, -12, 3.4, 13, 0, 0, TAU); sfill(g, c, 1.2);
      g.fillStyle = '#e8322e'; circ(g, 0, -22, 1.6); g.restore();
    });
  };
  B.emeralds = function (g, t, front) {
    if (front) return;
    [[-12, -28], [-2, -33], [8, -30]].forEach(function (p) {
      g.beginPath(); g.moveTo(p[0] - 3.5, p[1] + 5); g.lineTo(p[0] - 2.5, p[1] - 6); g.lineTo(p[0], p[1] - 10); g.lineTo(p[0] + 2.5, p[1] - 6); g.lineTo(p[0] + 3.5, p[1] + 5); g.closePath();
      sfill(g, '#3fe09a', 1.3); g.fillStyle = 'rgba(255,255,255,.6)'; poly(g, [p[0] - 1, p[1] + 3, p[0] - 1, p[1] - 6, p[0] + 0.3, p[1] - 8, p[0] + 0.3, p[1] + 3]);
    });
  };

  // Zaunfarben der neuen Seltenheiten
  if (A.FENCE) {
    A.FENCE.x = { post: '#1f9a4a', rail: '#7fe0a0', top: '#0f6a30' };
    A.FENCE.u = { post: '#d9a520', rail: '#ffe08a', top: '#8a6010' };
  }

  /* ---------- Dinge im Gehege ---------- */
  var PB = A.PROP_BOX;
  PB.bananatree = [-22, -60, 22, 3]; PB.fern = [-18, -24, 18, 2]; PB.jtree = [-26, -70, 26, 3]; PB.lily = [-16, -10, 16, 4];
  PB.orchid = [-10, -26, 10, 2]; PB.ruin = [-18, -36, 18, 3]; PB.bamboo = [-14, -58, 14, 2];
  function fern(g, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s);
    [-1.2, -0.6, 0, 0.6, 1.2].forEach(function (a, i) {
      g.save(); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -10, 0, -20); g.quadraticCurveTo(5, -10, 0, 0); g.closePath(); sfill(g, i % 2 ? (col || '#3fae4a') : mix(col || '#3fae4a', '#000000', 0.15), 1.1);
      line(g, [0, -2, 0, -17], 'rgba(255,255,255,.35)', 0.8); g.restore();
    });
    g.restore();
  }
  A.fern = fern;
  function bananaTree(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); rrect(g, -3, -34, 6, 34, 2.5); sfill(g, '#8aa04a', 1.2);
    [[-1.1, 0], [-0.4, 1], [0.4, 0], [1.1, 1]].forEach(function (p) {
      g.save(); g.translate(0, -34); g.rotate(p[0]); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-7, -14, 0, -26); g.quadraticCurveTo(7, -14, 0, 0); g.closePath(); sfill(g, p[1] ? '#4cb84a' : '#3fa043', 1.2); line(g, [0, -2, 0, -22], 'rgba(255,255,255,.3)', 0.9); g.restore();
    });
    [[-3, -30], [1, -28], [4, -31]].forEach(function (p) { g.save(); g.translate(p[0], p[1]); g.beginPath(); g.moveTo(-2, -4); g.quadraticCurveTo(-3, 2, 1.5, 5); g.quadraticCurveTo(0, 0, 1, -4); g.closePath(); sfill(g, '#ffd23a', 0.8); g.restore(); });
    g.restore();
  }
  A.props.bananatree = function (g) { bananaTree(g, 0, 0, 1.1); };
  A.props.fern = function (g) { fern(g, 0, 0, 1); };
  function jTree(g, x, y, s, k) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(-5, 0); g.lineTo(-3, -36); g.lineTo(3, -36); g.lineTo(5, 0); g.closePath(); sfill(g, '#7a5a3a', 1.3);
    line(g, [-5, 0, -10, 3], '#7a5a3a', 3); line(g, [5, 0, 10, 3], '#7a5a3a', 3);
    blob(g, [[-14, -40, 12], [12, -40, 12], [0, -52, 14], [0, -38, 12], [-20, -32, 7], [20, -32, 7]], k ? '#2f8a3a' : '#3a9a40', 2.4);
    g.fillStyle = k ? '#3fa648' : '#4cb04f'; circ(g, -5, -56, 6); circ(g, 9, -48, 4.5);
    // Lianen
    line(g, [-14, -30, -15, -14, -12, -6], '#3f7a2a', 1.6); line(g, [12, -32, 13, -18], '#3f7a2a', 1.6);
    g.fillStyle = '#5fbf3a'; [[-15, -18], [-13, -10], [13, -22]].forEach(function (p) { ell(g, p[0], p[1], 2.4, 1.3); });
    if (k === 2) { g.fillStyle = '#ff4f6a'; [[-8, -44], [6, -40], [0, -54]].forEach(function (p) { circ(g, p[0], p[1], 2); }); }
    g.restore();
  }
  A.props.jtree = function (g) { jTree(g, 0, 0, 1.05, 0); };
  A.props.lily = function (g) {
    g.beginPath(); g.ellipse(0, -2, 15, 6, 0, 0, TAU); g.fillStyle = 'rgba(60,140,200,.55)'; g.fill();
    [[-6, -3], [6, -1]].forEach(function (p) { g.beginPath(); g.ellipse(p[0], p[1], 5, 2.6, 0, 0.3, TAU); g.lineTo(p[0], p[1]); g.closePath(); sfill(g, '#4cb84a', 1); });
    g.fillStyle = '#ff9fd0'; circ(g, -6, -4.5, 1.8); g.fillStyle = '#fff'; circ(g, -6, -5, 0.8);
  };
  A.props.orchid = function (g) {
    line(g, [0, 0, 1, -18], '#3f8a2a', 1.6);
    fern(g, 0, 0, 0.45, '#4cb84a');
    [[1, -19], [-3, -14], [4, -12]].forEach(function (p, i) { g.save(); g.translate(p[0], p[1]); [0, 1.25, 2.5, 3.75, 5].forEach(function (a) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -2.4, 1.6, 2.6, 0, 0, TAU); sfill(g, i ? '#ffffff' : '#e98bff', 0.7); g.restore(); }); g.fillStyle = '#ffd23f'; circ(g, 0, 0, 1); g.restore(); });
  };
  function ruinBlock(g, x, y, w, h, moss) {
    g.beginPath(); rrect(g, x - w / 2, y - h, w, h, 2); sfill(g, '#a8a080', 1.3);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x - w / 2 + 2, y - h / 2, w - 4, 1.2);
    g.strokeStyle = '#6a6450'; g.lineWidth = 1; g.strokeRect(x - 3, y - h + 4, 6, 6);
    if (moss) { g.fillStyle = '#5fae3e'; ell(g, x - w / 4, y - h + 1, w / 3, 2.2); }
  }
  A.props.ruin = function (g) {
    ruinBlock(g, -6, 0, 18, 22, 1); ruinBlock(g, 9, 0, 12, 14, 0); ruinBlock(g, -4, -22, 12, 10, 1);
    line(g, [8, -14, 6, -4, 9, 0], '#3f7a2a', 1.4);
  };
  function bamboo(g, x, y, h, col) {
    g.beginPath(); rrect(g, x - 2.6, y - h, 5.2, h, 2); sfill(g, col || '#8ac43a', 1.2);
    for (var k = y - 10; k > y - h; k -= 11) line(g, [x - 2.6, k, x + 2.6, k], '#5a8a20', 1.3);
    g.save(); g.translate(x, y - h + 6); g.rotate(0.6); g.beginPath(); g.ellipse(5, 0, 6, 1.8, 0, 0, TAU); sfill(g, '#5fbf3a', 0.9); g.restore();
  }
  A.props.bamboo = function (g) { bamboo(g, -6, 0, 50); bamboo(g, 2, 0, 40, '#9ad04a'); bamboo(g, 9, 0, 46); };

  /* ---------- Dschungel-Deko ---------- */
  var DB = A.DEKO_BOX, DA = A.DEKO_ANIM, D = A.deko;
  DB.riesenblatt = [-22, -32, 22, 4]; DB.bambus = [-18, -66, 18, 3]; DB.bananenstaude = [-26, -70, 26, 4]; DB.totem = [-16, -78, 16, 4];
  DB.haengebruecke = [-40, -44, 40, 6]; DB.tempelruine = [-38, -72, 38, 6]; DB.wasserfall = [-44, -96, 44, 10];
  DA.wasserfall = 1; DA.totem = 2;
  D.riesenblatt = function (g) { fern(g, -8, 0, 1.3, '#3a9a40'); fern(g, 9, 2, 1.1, '#4cb84a'); };
  D.bambus = function (g) { bamboo(g, -9, 0, 58); bamboo(g, -1, 2, 48, '#9ad04a'); bamboo(g, 7, 0, 62); bamboo(g, 13, 2, 40, '#9ad04a'); };
  D.bananenstaude = function (g) { bananaTree(g, -6, 0, 1.5); fern(g, 12, 2, 0.8); };
  D.totem = function (g, t) {
    var cols = ['#c8401a', '#2f8a5a', '#2a6ab8'], blink = Math.sin(t * Math.PI) > 0.9;
    [0, 1, 2].forEach(function (i) {
      var y = -i * 22;
      g.beginPath(); rrect(g, -11, y - 22, 22, 22, 3); sfill(g, '#a0703a', 1.4);
      g.fillStyle = cols[i]; g.fillRect(-11, y - 22, 22, 4);
      g.fillStyle = '#fff'; circ(g, -5, y - 13, 3); circ(g, 5, y - 13, 3);
      g.fillStyle = '#111'; if (!(blink && i === 2)) { circ(g, -5, y - 13, 1.5); circ(g, 5, y - 13, 1.5); }
      g.beginPath(); rrect(g, -6, y - 7, 12, 3.5, 1.5); sfill(g, i === 1 ? '#ffffff' : '#3a1a0a', 0.8);
    });
    g.beginPath(); g.moveTo(-16, -60); g.lineTo(-11, -52); g.lineTo(-11, -60); g.closePath(); sfill(g, '#ffd23f', 1);
    g.beginPath(); g.moveTo(16, -60); g.lineTo(11, -52); g.lineTo(11, -60); g.closePath(); sfill(g, '#ffd23f', 1);
    [-8, 0, 8].forEach(function (x, i) { g.beginPath(); g.ellipse(x, -70, 3, 7, (i - 1) * 0.4, 0, TAU); sfill(g, ['#e8322e', '#3fe0a0', '#1fa0d0'][i], 1); });
  };
  D.haengebruecke = function (g) {
    [[-34, 0], [34, 0]].forEach(function (p) { g.beginPath(); rrect(g, p[0] - 3, -38, 6, 38, 2); sfill(g, '#7a5a3a', 1.3); });
    g.beginPath(); g.moveTo(-34, -14); g.quadraticCurveTo(0, 2, 34, -14); g.strokeStyle = OUT; g.lineWidth = 5; g.stroke(); g.strokeStyle = '#c8a06a'; g.lineWidth = 3; g.stroke();
    for (var i = -30; i <= 30; i += 6) { var yy = -14 + (1 - (i / 34) * (i / 34)) * 8; g.beginPath(); rrect(g, i - 2.4, yy - 1.5, 4.8, 4, 1); sfill(g, '#a8743a', 0.9); }
    line(g, [-34, -34, 0, -20, 34, -34], '#8a6a3a', 1.6);
    for (i = -28; i <= 28; i += 8) { var yt = -34 + (1 - (i / 34) * (i / 34)) * 14, yb = -14 + (1 - (i / 34) * (i / 34)) * 8; line(g, [i, yt, i, yb], '#8a6a3a', 1); }
    fern(g, -34, 2, 0.6); fern(g, 34, 2, 0.6);
  };
  D.tempelruine = function (g, t, lit) {
    g.beginPath(); g.moveTo(-34, 0); g.lineTo(-28, -14); g.lineTo(28, -14); g.lineTo(34, 0); g.closePath(); sfill(g, '#a8a080', 1.4);
    g.beginPath(); g.moveTo(-26, -14); g.lineTo(-20, -30); g.lineTo(20, -30); g.lineTo(26, -14); g.closePath(); sfill(g, '#b8b090', 1.4);
    g.beginPath(); g.moveTo(-18, -30); g.lineTo(-12, -46); g.lineTo(12, -46); g.lineTo(18, -30); g.closePath(); sfill(g, '#c8c0a0', 1.4);
    g.beginPath(); rrect(g, -10, -60, 20, 14, 2); sfill(g, '#a8a080', 1.3);
    g.beginPath(); g.moveTo(-6, -46); g.lineTo(-6, -54); g.quadraticCurveTo(0, -59, 6, -54); g.lineTo(6, -46); g.closePath(); sfill(g, lit ? '#ffd86b' : '#2a2418', 1.1);
    for (var i = 0; i < 5; i++) { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(-4, -13 - i * 0, 8, 13); }
    g.fillStyle = '#5fae3e'; ell(g, -20, -15, 9, 2.6); ell(g, 14, -31, 7, 2.2); ell(g, -6, -47, 5, 1.8);
    line(g, [-24, -14, -26, -4], '#3f7a2a', 1.4); line(g, [18, -30, 20, -18], '#3f7a2a', 1.4);
    fern(g, -32, 2, 0.7); fern(g, 30, 2, 0.6);
  };
  D.wasserfall = function (g, t, lit) {
    // Felsen
    blob(g, [[-30, -40, 14], [-24, -66, 14], [26, -42, 15], [22, -70, 13], [0, -80, 14], [-12, -78, 10], [12, -80, 10]], '#7a7a6a', 2.4);
    // Becken
    g.beginPath(); g.ellipse(0, -4, 40, 11, 0, 0, TAU); sfill(g, '#3fa0d0', 1.6);
    g.fillStyle = 'rgba(255,255,255,.35)'; ell(g, -10, -6, 16, 3);
    // Wasser fällt
    var off = (t % 1) * 12;
    g.save(); g.beginPath(); rrect(g, -12, -78, 24, 72, 4); g.clip();
    g.fillStyle = '#6cc6f0'; g.fillRect(-12, -78, 24, 74);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2;
    for (var x = -9; x <= 9; x += 6) for (var y = -84 + off; y < 0; y += 12) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 6); g.stroke(); }
    g.restore();
    g.strokeStyle = OUT; g.lineWidth = 1.4; g.beginPath(); rrect(g, -12, -78, 24, 72, 4); g.stroke();
    blob(g, [[-12, -6, 5], [0, -4, 6], [12, -6, 5]], '#ffffff', 1.4);
    fern(g, -34, -2, 0.8); fern(g, 34, -2, 0.7, '#4cb84a');
    if (lit) { g.fillStyle = 'rgba(160,240,255,.35)'; ell(g, 0, -40, 20, 40); }
  };

  /* ---------- Dschungel-Bäume am Rand (statt Wald) ---------- */
  A.jungleTreeSpr = function (k) {
    return sprite('jtr|' + k, [-30, -76, 30, 3], function (g) {
      if (k === 1) { // Palme
        g.save(); g.translate(0, 0);
        for (var i = 0; i < 9; i++) { var q = i / 9, px = Math.sin(q * 1.6) * 7, py = -q * 48; g.beginPath(); g.ellipse(px, py - 2, 4 - q, 3.2, -0.1, 0, TAU); sfill(g, i % 2 ? '#a8742e' : '#c48a3e', 1.1); }
        var tx = 7, ty = -50;
        [[-1.2, 0], [0.2, 1], [-0.5, 1], [0.25, 0], [-0.55, 0], [-1.9, 1]].forEach(function (p, j) {
          g.save(); g.translate(tx, ty); g.scale(j % 2 ? -1 : 1, 1); g.rotate(p[0]);
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(13, -11, 27, 3); g.quadraticCurveTo(18, 0, 14, 4); g.quadraticCurveTo(8, -1, 0, 0); g.closePath(); sfill(g, p[1] ? '#2f9a3e' : '#45b44f', 1.3);
          g.restore();
        });
        g.beginPath(); g.arc(tx - 2.4, ty + 2, 3, 0, TAU); sfill(g, '#6b4422', 1); g.beginPath(); g.arc(tx + 2.4, ty + 2.6, 3, 0, TAU); sfill(g, '#7a4e28', 1);
        g.restore();
      } else if (k === 2) { // Bananenstaude mit Farn
        bananaTree(g, 0, 0, 1.35); fern(g, -14, 2, 0.8); fern(g, 14, 2, 0.7, '#4cb84a');
      } else jTree(g, 0, 0, 1.1, k);
    }, { ol: 1.6 });
  };

  /* ---------- Tukane (statt Vögel) und Kolibris (statt Schmetterlinge) ---------- */
  A.drawToucan = function (ctx, x, y, dir, ph) {
    var f = Math.sin(ph) * 6;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    // Flügel
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(-8, -10 - f, -14, -6 - f); ctx.quadraticCurveTo(-8, -2, -2, 2); ctx.closePath(); ctx.fillStyle = '#1c1c22'; ctx.fill(); ctx.stroke();
    // Körper
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 5.5, 0, 0, TAU); ctx.fillStyle = '#22222a'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(6, -0.5, 4, 3.6, 0, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(6, 2, 3, 1.6, 0, 0, TAU); ctx.fill();
    // Schnabel
    ctx.beginPath(); ctx.moveTo(8.5, -3); ctx.quadraticCurveTo(20, -4, 21, 1); ctx.quadraticCurveTo(15, 0, 9, 1); ctx.closePath(); ctx.fillStyle = '#ff9a1a'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8322e'; ctx.beginPath(); ctx.moveTo(17, -3.5); ctx.quadraticCurveTo(21, -3, 21, 1); ctx.lineTo(18, 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5fd0ff'; ctx.beginPath(); ctx.arc(7, -2.4, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7.3, -2.4, 0.8, 0, TAU); ctx.fill();
    // Schwanz
    ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(-16, 1); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fillStyle = '#1c1c22'; ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  A.drawHummingbird = function (ctx, x, y, dir, ph, col) {
    var w = Math.abs(Math.sin(ph * 40));
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.strokeStyle = OUT; ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.7; ctx.fillStyle = 'rgba(220,255,255,.9)';
    ctx.beginPath(); ctx.ellipse(-1, -4 - w * 3, 2.5, 6 * w + 1, -0.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.globalAlpha /= 0.7;
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.8, -0.3, 0, TAU); ctx.fillStyle = '#2fd08a'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(2.4, 0.6, 2, 1.4, -0.3, 0, TAU); ctx.fillStyle = col || '#ff3d7f'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -1.6); ctx.lineTo(10, -2.6); ctx.lineTo(4, -0.4); ctx.closePath(); ctx.fillStyle = '#2a2a2a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(-9, 3); ctx.lineTo(-4, 2.4); ctx.closePath(); ctx.fillStyle = '#1fa070'; ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(3, -1.2, 0.7, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* ---------- Verlorene Artefakte (Kai: 100 mal cooler) ---------- */
  function lgr(g, x0, y0, x1, y1, st) { var f = g.createLinearGradient(x0, y0, x1, y1); st.forEach(function (c, i) { f.addColorStop(i / (st.length - 1), c); }); return f; }
  function rgr(g, x, y, r, st) { var f = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r); st.forEach(function (c, i) { f.addColorStop(i / (st.length - 1), c); }); return f; }
  var GOLD = ['#fff6b0', '#ffd23f', '#e09a10', '#a8600a'];
  function gold(g, y0, y1) { return lgr(g, 0, y0, 0, y1, GOLD); }
  // geschliffener Edelstein: Achteck mit Facetten in hell, mittel und dunkel
  function facet(g, x, y, r, c, n) {
    n = n || 8; var p = [], q = [];
    for (var i = 0; i < n; i++) { var a = i / n * TAU - Math.PI / 2 + Math.PI / n; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); q.push([x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55]); }
    g.beginPath(); p.forEach(function (v, i) { if (i) g.lineTo(v[0], v[1]); else g.moveTo(v[0], v[1]); }); g.closePath(); sfill(g, c[1], 1.3);
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n; g.beginPath(); g.moveTo(p[i][0], p[i][1]); g.lineTo(p[j][0], p[j][1]); g.lineTo(q[j][0], q[j][1]); g.lineTo(q[i][0], q[i][1]); g.closePath();
      g.fillStyle = i < n * 0.4 ? c[0] : i < n * 0.7 ? c[1] : c[2]; g.fill();
    }
    g.beginPath(); q.forEach(function (v, i) { if (i) g.lineTo(v[0], v[1]); else g.moveTo(v[0], v[1]); }); g.closePath(); g.fillStyle = rgr(g, x, y, r * 0.55, ['#ffffff', c[0], c[1]]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.5; for (i = 0; i < n; i++) { g.beginPath(); g.moveTo(p[i][0], p[i][1]); g.lineTo(q[i][0], q[i][1]); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.9)'; star4(g, x - r * 0.3, y - r * 0.3, r * 0.32);
  }
  function star4(g, x, y, s) { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.25, y - s * 0.25); g.lineTo(x + s, y); g.lineTo(x + s * 0.25, y + s * 0.25); g.lineTo(x, y + s); g.lineTo(x - s * 0.25, y + s * 0.25); g.lineTo(x - s, y); g.lineTo(x - s * 0.25, y - s * 0.25); g.closePath(); g.fill(); }
  function rays(g, x, y, r1, r2, n, col, w) { for (var i = 0; i < n; i++) { var a = i / n * TAU; g.beginPath(); g.moveTo(x + Math.cos(a - w) * r1, y + Math.sin(a - w) * r1); g.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); g.lineTo(x + Math.cos(a + w) * r1, y + Math.sin(a + w) * r1); g.closePath(); sfill(g, typeof col === 'function' ? col(i) : col, 1.1); } }
  var RUBY = ['#ffb0a8', '#e8221e', '#7a0608'], SAPH = ['#b8e8ff', '#2f7fe8', '#0c2a7a'], TOPAZ = ['#fff6b0', '#ffc21a', '#b86a00'], EMER = ['#c8ffd8', '#18c060', '#05502a'];
  function artDraw(g, k) {
    var cy = -26;
    if (k === 'auge') { // Rubin-Auge: goldene Sonnenscheibe mit Flammenflügeln und einem lebendigen Rubin-Auge
      rays(g, 0, cy, 17, 29, 12, function (i) { return i % 2 ? '#c8401a' : '#ff6a3a'; }, 0.16);
      [-1, 1].forEach(function (s) { // Flügel
        g.beginPath(); g.moveTo(s * 18, cy - 4); g.bezierCurveTo(s * 30, cy - 18, s * 34, cy - 4, s * 29, cy + 2); g.bezierCurveTo(s * 33, cy + 6, s * 28, cy + 14, s * 18, cy + 6); g.closePath(); sfill(g, lgr(g, s * 18, cy - 10, s * 32, cy + 10, ['#ffd23f', '#ff7a1a', '#c8201a']), 1.5);
        line(g, [s * 21, cy - 2, s * 28, cy - 6], 'rgba(120,20,0,.6)', 1); line(g, [s * 21, cy + 3, s * 28, cy + 4], 'rgba(120,20,0,.6)', 1);
      });
      g.beginPath(); g.arc(0, cy, 19, 0, TAU); sfill(g, gold(g, cy - 19, cy + 19), 2);
      g.strokeStyle = '#a8600a'; g.lineWidth = 1; for (var i = 0; i < 24; i++) { var a = i / 24 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 15.5, cy + Math.sin(a) * 15.5); g.lineTo(Math.cos(a) * 18, cy + Math.sin(a) * 18); g.stroke(); }
      g.beginPath(); g.moveTo(-15, cy); g.quadraticCurveTo(0, cy - 15, 15, cy); g.quadraticCurveTo(0, cy + 15, -15, cy); g.closePath(); sfill(g, rgr(g, 0, cy, 15, ['#ffffff', '#f2e8d8', '#c8b090']), 1.5);
      g.save(); g.clip();
      g.beginPath(); g.arc(0, cy, 9, 0, TAU); g.fillStyle = rgr(g, 0, cy, 9, ['#ffd0c8', '#ff3a2e', '#a80c10', '#3a0004']); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = 'rgba(255,200,120,.6)'; g.lineWidth = 0.6; for (i = 0; i < 16; i++) { a = i / 16 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 3.5, cy + Math.sin(a) * 3.5); g.lineTo(Math.cos(a) * 8, cy + Math.sin(a) * 8); g.stroke(); }
      g.fillStyle = '#1a0002'; ell(g, 0, cy, 2.2, 7);
      g.fillStyle = 'rgba(255,255,255,.95)'; circ(g, -3.5, cy - 3.5, 2.2); circ(g, 3, cy + 3, 0.9);
      g.restore();
      g.strokeStyle = OUT; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-15, cy); g.quadraticCurveTo(0, cy - 15, 15, cy); g.stroke();
      [[0, cy - 19], [0, cy + 19], [-19, cy], [19, cy]].forEach(function (p) { facet(g, p[0], p[1], 3.6, RUBY, 6); });
      facet(g, 0, cy - 30, 4.5, RUBY);
    } else if (k === 'maske') { // Saphir-Maske: Widder-Maske aus Saphir mit Goldhörnern und leuchtenden Augen
      [-1, 1].forEach(function (s) { // Hörner
        g.beginPath(); g.moveTo(s * 10, cy - 14); g.bezierCurveTo(s * 30, cy - 26, s * 34, cy + 4, s * 22, cy + 6); g.bezierCurveTo(s * 14, cy + 6, s * 14, cy - 4, s * 21, cy - 4);
        g.bezierCurveTo(s * 25, cy - 4, s * 25, cy - 12, s * 18, cy - 12); g.closePath(); sfill(g, lgr(g, 0, cy - 24, 0, cy + 8, GOLD), 1.6);
        g.strokeStyle = 'rgba(140,80,0,.55)'; g.lineWidth = 0.9; [0.3, 0.5, 0.7].forEach(function (t) { g.beginPath(); g.arc(s * 22, cy - 6, 6 + t * 6, 0, TAU); g.stroke(); });
      });
      g.beginPath(); g.moveTo(-14, cy - 16); g.quadraticCurveTo(0, cy - 24, 14, cy - 16); g.quadraticCurveTo(18, cy + 6, 0, cy + 24); g.quadraticCurveTo(-18, cy + 6, -14, cy - 16); g.closePath();
      sfill(g, lgr(g, -14, cy - 20, 14, cy + 24, ['#7fd0ff', '#2f7fe8', '#1a3fa8', '#0c1f5a']), 2);
      g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(-14, cy - 18); g.lineTo(-4, cy - 18); g.lineTo(-12, cy + 10); g.lineTo(-18, cy + 4); g.closePath(); g.fill(); g.restore();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 1.3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, cy - 6); g.lineTo(0, cy + 18); g.moveTo(-8, cy + 8); g.lineTo(-3, cy + 14); g.moveTo(8, cy + 8); g.lineTo(3, cy + 14); g.moveTo(-11, cy - 2); g.quadraticCurveTo(-6, cy + 2, -10, cy + 6); g.moveTo(11, cy - 2); g.quadraticCurveTo(6, cy + 2, 10, cy + 6); g.stroke();
      blob(g, [[-10, cy - 19, 5], [-4, cy - 22, 5.5], [3, cy - 22, 5.5], [10, cy - 19, 5], [0, cy - 17, 5]], '#eaf6ff', 1.5);
      g.fillStyle = '#b8d8f0'; circ(g, -6, cy - 20, 1.6); circ(g, 4, cy - 21, 1.6);
      [-1, 1].forEach(function (s) { // Augen leuchten
        g.beginPath(); g.moveTo(s * 3, cy - 4); g.lineTo(s * 11, cy - 6); g.lineTo(s * 9, cy); g.lineTo(s * 3, cy + 1); g.closePath(); sfill(g, '#06123a', 1.3);
        g.fillStyle = rgr(g, s * 7, cy - 2.5, 3.2, ['#ffffff', '#9ff0ff', '#2fc8ff']); circ(g, s * 7, cy - 2.5, 2.4);
      });
      facet(g, 0, cy - 10, 3.4, SAPH, 6);
      [-1, 1].forEach(function (s) { line(g, [s * 6, cy + 20, s * 8, cy + 28], '#ffd23f', 1.4); g.beginPath(); g.ellipse(s * 8.5, cy + 30, 2.4, 3.4, 0, 0, TAU); sfill(g, '#2f7fe8', 1); });
    } else if (k === 'krone') { // Jaguar-Krone: Goldkrone mit Jaguarflecken, Topasen und Jaguarkopf
      var pts = [[-24, cy + 14], [-27, cy - 12], [-16, cy - 2], [-10, cy - 22], [0, cy - 8], [10, cy - 22], [16, cy - 2], [27, cy - 12], [24, cy + 14]];
      g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); sfill(g, gold(g, cy - 22, cy + 14), 2);
      g.save(); g.clip();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(-26, cy - 14); g.lineTo(-18, cy - 14); g.lineTo(-24, cy + 14); g.lineTo(-30, cy + 14); g.closePath(); g.fill();
      [[-18, cy + 2], [-6, cy - 2], [6, cy + 4], [18, cy], [-12, cy + 8], [12, cy - 6], [-21, cy - 6], [21, cy - 6]].forEach(function (p) { g.fillStyle = '#8a4a08'; ell(g, p[0], p[1], 2.6, 2.1); g.fillStyle = '#e8a020'; ell(g, p[0], p[1], 1.2, 0.9); });
      g.restore();
      g.beginPath(); rrect(g, -26, cy + 10, 52, 9, 3); sfill(g, lgr(g, 0, cy + 10, 0, cy + 19, ['#ffe9a0', '#e8b030', '#a8600a']), 1.6);
      for (var j = 0; j < 7; j++) { g.fillStyle = '#5a2a00'; circ(g, -21 + j * 7, cy + 14.5, 1.3); }
      [[-27, cy - 12], [-10, cy - 22], [10, cy - 22], [27, cy - 12]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 3.2, 0, TAU); sfill(g, rgr(g, p[0], p[1], 3.2, ['#ffffff', '#ffe14d', '#c88a00']), 1.2); });
      // Jaguarkopf vorne
      g.beginPath(); g.arc(0, cy + 2, 8.5, 0, TAU); sfill(g, rgr(g, 0, cy + 2, 8.5, ['#ffe9a0', '#ffc21a', '#c87a00']), 1.6);
      [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * 6.5, cy - 5, 2.8, 0, TAU); sfill(g, '#ffc21a', 1.2); g.fillStyle = '#8a4a08'; circ(g, s * 6.5, cy - 5, 1.2); });
      g.fillStyle = '#2a1400'; [[-4, cy - 1], [4, cy - 1]].forEach(function (p) { ell(g, p[0], p[1], 1.8, 1.4); });
      g.fillStyle = '#7fff9a'; ell(g, -4, cy - 1, 0.7, 1.1); ell(g, 4, cy - 1, 0.7, 1.1);
      g.fillStyle = '#5a2a00'; poly(g, [-2, cy + 3, 2, cy + 3, 0, cy + 5.5]); line(g, [0, cy + 5.5, 0, cy + 7, -2.5, cy + 8.5], '#5a2a00', 0.9); line(g, [0, cy + 7, 2.5, cy + 8.5], '#5a2a00', 0.9);
      g.fillStyle = '#8a4a08'; [[-5, cy + 5], [5, cy + 5], [-3, cy - 4], [3, cy - 4]].forEach(function (p) { circ(g, p[0], p[1], 0.8); });
      facet(g, 0, cy - 12, 4.2, TOPAZ);
      g.fillStyle = '#ffffff'; star4(g, -18, cy - 8, 3); star4(g, 20, cy + 8, 2.2);
    } else { // Smaragd-Amulett: Kette, goldener Ring mit Smaragd-Strahlen und großer geschliffener Smaragd
      g.strokeStyle = OUT; g.lineWidth = 3.2; g.beginPath(); g.moveTo(-18, cy - 30); g.quadraticCurveTo(0, cy - 20, 18, cy - 30); g.stroke();
      g.strokeStyle = '#e8b030'; g.lineWidth = 1.8; g.setLineDash([2.2, 1.4]); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(0, cy - 22, 3, 0, TAU); sfill(g, gold(g, cy - 25, cy - 19), 1.2);
      rays(g, 0, cy, 15, 27, 16, function (i) { return i % 2 ? '#0f8a44' : '#3fe07a'; }, 0.13);
      g.beginPath(); g.arc(0, cy, 17, 0, TAU); sfill(g, gold(g, cy - 17, cy + 17), 2);
      g.beginPath(); g.arc(0, cy, 13.5, 0, TAU); g.fillStyle = '#0a3a1c'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
      for (var l = 0; l < 8; l++) { // Blätter auf dem Ring
        var la = l / 8 * TAU + 0.2; g.save(); g.translate(Math.cos(la) * 15.3, cy + Math.sin(la) * 15.3); g.rotate(la + Math.PI / 2);
        g.fillStyle = '#a8600a'; g.beginPath(); g.ellipse(0, 0, 2.6, 1, 0, 0, TAU); g.fill(); g.restore();
      }
      facet(g, 0, cy, 11, EMER, 8);
      [[-12, cy + 18], [12, cy + 18], [0, cy + 22]].forEach(function (p, i) { line(g, [p[0] * 0.6, cy + 14, p[0], p[1]], '#e8b030', 1.2); facet(g, p[0], p[1] + 2, i === 2 ? 3.2 : 2.4, EMER, 6); });
      g.fillStyle = '#ffffff'; star4(g, 14, cy - 14, 3.2); star4(g, -16, cy + 8, 2.2);
    }
  }
  A.artSpr = function (k, shadow) {
    return sprite('art2|' + k + (shadow ? 's' : ''), [-34, -60, 34, 12], function (g) { artDraw(g, k); },
      shadow ? { silhouette: '#5a6a50', olc: '#3a4a30', shade: false, sc: 3 } : { ol: 1.8, sc: 4 });
  };
  var aurl = {};
  A.artURL = function (k, shadow) { var key = k + (shadow ? 's' : ''); if (!aurl[key]) aurl[key] = A.artSpr(k, shadow).c.toDataURL(); return aurl[key]; };

  /* ---------- Tempel auf der Farm (mit 4 Sockeln für die Artefakte) ---------- */
  A.templeSpr = function (night) {
    return sprite('temple|' + (night ? 1 : 0), [-64, -112, 64, 4], function (g) {
      // Stufen-Pyramide
      [[60, 0, 14, '#a8a080'], [50, -14, 14, '#b4ac8c'], [40, -28, 14, '#c0b898'], [30, -42, 14, '#ccc4a4']].forEach(function (s) {
        g.beginPath(); rrect(g, -s[0], s[1] - s[2], s[0] * 2, s[2], 2); sfill(g, s[3], 1.6);
        g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(-s[0] + 2, s[1] - 3, s[0] * 2 - 4, 3);
      });
      // Treppe in der Mitte
      g.fillStyle = '#d8d0b0'; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-8, -56); g.lineTo(8, -56); g.lineTo(10, 0); g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
      for (var y = -4; y > -56; y -= 5) line(g, [-9, y, 9, y], 'rgba(0,0,0,.18)', 1);
      // Tempelhaus oben
      g.beginPath(); rrect(g, -22, -82, 44, 26, 2); sfill(g, '#b8b090', 1.6);
      g.beginPath(); g.moveTo(-26, -82); g.lineTo(0, -100); g.lineTo(26, -82); g.closePath(); sfill(g, '#a8a080', 1.6);
      g.beginPath(); g.moveTo(-7, -56); g.lineTo(-7, -70); g.quadraticCurveTo(0, -77, 7, -70); g.lineTo(7, -56); g.closePath(); sfill(g, night ? '#ffd86b' : '#2a2418', 1.2);
      g.strokeStyle = '#7a7058'; g.lineWidth = 1; [-16, 12].forEach(function (x) { g.strokeRect(x, -76, 5, 5); });
      // Moos und Lianen
      g.fillStyle = '#5fae3e'; ell(g, -40, -15, 12, 3); ell(g, 34, -29, 9, 2.6); ell(g, -16, -83, 8, 2.4); ell(g, 18, -43, 7, 2.2);
      line(g, [-48, -14, -50, 0], '#3f7a2a', 1.6); line(g, [36, -42, 38, -30, 36, -22], '#3f7a2a', 1.6);
      fern(g, -58, 3, 0.8); fern(g, 58, 3, 0.7, '#4cb84a');
    }, { ol: 1.8 });
  };
  // Sockel: links und rechts auf den Stufen
  var PED = [[-44, -14], [-30, -28], [30, -28], [44, -14]];
  A.drawTemple = function (ctx, x, y, time, night, arts, waechter) {
    A.blit(ctx, A.templeSpr(night), x, y, 1, false, [62, 12]);
    if (SI.jungleOn()) SI.ARTS.forEach(function (a, i) { // nach dem Event sind die Artefakte weg (Kai)
      var p = PED[i], px = x + p[0], py = y + p[1];
      ctx.fillStyle = '#8a8270'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
      A.rrect(ctx, px - 7, py - 10, 14, 10, 2); ctx.fill(); ctx.stroke();
      if (arts[a.k]) {
        var bob = Math.sin(time * 2 + i) * 2;
        var gr = ctx.createRadialGradient(px, py - 20, 1, px, py - 20, 15); gr.addColorStop(0, a.col + 'b0'); gr.addColorStop(1, a.col + '00');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py - 20, 15, 0, TAU); ctx.fill();
        A.blit(ctx, A.artSpr(a.k), px, py - 13 + bob, 0.27);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '12px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', px, py - 13);
      }
    });
    if (waechter && SI.T.waechter) {
      var gw = ctx.createRadialGradient(x, y - 112, 2, x, y - 112, 36); gw.addColorStop(0, 'rgba(255,220,90,.7)'); gw.addColorStop(1, 'rgba(255,220,90,0)');
      ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(x, y - 112, 36, 0, TAU); ctx.fill();
      A.drawSheep2(ctx, SI.T.waechter, x, y - 98, Math.floor(time * 2) % 2, false, 0.9, false);
    }
  };

  /* ---------- Tempel-Expedition: Steintüren, Torbögen und die Schlange ---------- */
  var XCOL = [['#ffb02e', '#a8641a'], ['#3fe07a', '#1d7a34'], ['#4fb4ff', '#1d5ab8'], ['#ff5a4a', '#a81f1a']];
  function glyph(g, k, col) { // eingeritzte Zeichen: Sonne, Blatt, Welle, Jaguar
    g.strokeStyle = col; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round';
    if (k === 0) { g.beginPath(); g.arc(0, -52, 8, 0, TAU); g.stroke(); for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 12, -52 + Math.sin(a) * 12); g.lineTo(Math.cos(a) * 17, -52 + Math.sin(a) * 17); g.stroke(); } }
    else if (k === 1) { g.beginPath(); g.moveTo(0, -36); g.quadraticCurveTo(-16, -52, 0, -70); g.quadraticCurveTo(16, -52, 0, -36); g.moveTo(0, -38); g.lineTo(0, -66); g.stroke(); }
    else if (k === 2) { [0, 9, 18].forEach(function (y) { g.beginPath(); g.moveTo(-14, -62 + y); g.quadraticCurveTo(-7, -68 + y, 0, -62 + y); g.quadraticCurveTo(7, -56 + y, 14, -62 + y); g.stroke(); }); }
    else { g.beginPath(); g.moveTo(-13, -62); g.lineTo(-8, -70); g.lineTo(-3, -62); g.moveTo(13, -62); g.lineTo(8, -70); g.lineTo(3, -62); g.stroke(); g.beginPath(); g.arc(0, -52, 12, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-5, -55); g.lineTo(-5, -53); g.moveTo(5, -55); g.lineTo(5, -53); g.moveTo(-4, -46); g.quadraticCurveTo(0, -43, 4, -46); g.stroke(); }
  }
  A.xdoorSpr = function (k) {
    return sprite('xdoor|' + k, [-34, -112, 34, 0], function (g) {
      var c = XCOL[k];
      var gr = g.createLinearGradient(0, -110, 0, 0); gr.addColorStop(0, '#8a7c60'); gr.addColorStop(1, '#5a5040');
      g.beginPath(); g.moveTo(-30, 0); g.lineTo(-30, -78); g.quadraticCurveTo(-30, -108, 0, -108); g.quadraticCurveTo(30, -108, 30, -78); g.lineTo(30, 0); g.closePath(); sfill(g, gr, 2.2);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.4; [-30, -14].forEach(function (y) { g.beginPath(); g.moveTo(-28, y); g.lineTo(28, y); g.stroke(); });
      g.fillStyle = 'rgba(0,0,0,.22)'; glyph(g, k, 'rgba(0,0,0,.35)'); g.save(); g.translate(0, -1); glyph(g, k, c[0]); g.restore();
      g.beginPath(); g.arc(0, -90, 6, 0, TAU); sfill(g, c[0], 1.6); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, -2, -92, 2);
      g.fillStyle = 'rgba(70,140,60,.7)'; ell(g, -22, -4, 9, 4); ell(g, 18, -96, 7, 3);
      g.beginPath(); g.arc(20, -40, 3.4, 0, TAU); sfill(g, '#c8a04a', 1.2);
    }, { ol: 1.6 });
  };
  A.xarchSpr = function (k) {
    return sprite('xarch|' + k, [-44, -128, 44, 2], function (g) {
      var c = XCOL[k];
      g.beginPath(); g.moveTo(-42, 2); g.lineTo(-42, -80); g.quadraticCurveTo(-42, -126, 0, -126); g.quadraticCurveTo(42, -126, 42, -80); g.lineTo(42, 2);
      g.lineTo(32, 2); g.lineTo(32, -78); g.quadraticCurveTo(32, -110, 0, -110); g.quadraticCurveTo(-32, -110, -32, -78); g.lineTo(-32, 2); g.closePath(); sfill(g, '#a89870', 2.2);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.2; [-20, -45, -70].forEach(function (y) { [-37, 37].forEach(function (x) { g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.stroke(); }); });
      g.beginPath(); g.moveTo(-9, -126); g.lineTo(9, -126); g.lineTo(6, -112); g.lineTo(-6, -112); g.closePath(); sfill(g, '#c8b890', 1.6);
      g.beginPath(); g.arc(0, -119, 4, 0, TAU); sfill(g, c[0], 1.2);
      line(g, [-40, -60, -46, -40, -42, -20], '#2f8a34', 2.4); g.fillStyle = '#3fa645'; ell(g, -45, -42, 4, 2); ell(g, 38, -100, 5, 2.4);
    }, { ol: 1.4 });
  };
  A.snakeSpr = function () {
    return sprite('xsnake', [-40, -70, 40, 6], function (g) {
      g.beginPath(); g.ellipse(0, -6, 30, 10, 0, 0, TAU); sfill(g, '#3fa645', 2); g.beginPath(); g.ellipse(0, -14, 22, 8, 0, 0, TAU); sfill(g, '#4cb84a', 1.8);
      g.fillStyle = '#ffd23f'; [[-18, -8], [-4, -4], [12, -8], [-10, -16], [6, -18]].forEach(function (p) { ell(g, p[0], p[1], 3, 2); });
      g.beginPath(); g.moveTo(-6, -18); g.quadraticCurveTo(-14, -40, 4, -48); g.lineTo(14, -44); g.quadraticCurveTo(0, -36, 8, -18); g.closePath(); sfill(g, '#4cb84a', 2);
      g.beginPath(); g.ellipse(10, -52, 15, 11, -0.2, 0, TAU); sfill(g, '#5ac850', 2);
      g.beginPath(); g.moveTo(14, -48); g.lineTo(30, -40); g.lineTo(26, -54); g.closePath(); sfill(g, '#c8233a', 1.6);
      g.fillStyle = '#fff'; poly(g, [17, -47, 19, -41, 21, -46]); poly(g, [23, -44, 24, -39, 26, -43]);
      line(g, [29, -42, 37, -40, 40, -44], '#e8322e', 1.6); line(g, [37, -40, 40, -37], '#e8322e', 1.6);
      g.beginPath(); g.ellipse(6, -58, 4.5, 4, 0, 0, TAU); sfill(g, '#ffe14d', 1.4); g.fillStyle = '#111'; ell(g, 6.5, -58, 1.2, 3.4);
      g.beginPath(); g.ellipse(16, -59, 3.5, 3, 0, 0, TAU); sfill(g, '#ffe14d', 1.2); g.fillStyle = '#111'; ell(g, 16.3, -59, 1, 2.6);
      line(g, [0, -63, 9, -61], OUT, 1.8); line(g, [13, -63, 20, -62], OUT, 1.6);
      g.beginPath(); g.moveTo(28, -6); g.quadraticCurveTo(40, -10, 36, -20); sfill(g, '#3fa645', 1.4);
    }, { ol: 1.8 });
  };
  var xurl = {};
  function xu(key, f) { if (!xurl[key]) xurl[key] = f().c.toDataURL(); return xurl[key]; }
  A.xdoorURL = function (k) { return xu('d' + k, function () { return A.xdoorSpr(k); }); };
  A.xarchURL = function (k) { return xu('a' + k, function () { return A.xarchSpr(k); }); };
  A.snakeURL = function () { return xu('s', A.snakeSpr); };
  var turl = null;
  A.templeURL = function () { if (!turl) turl = A.templeSpr(false).c.toDataURL(); return turl; };
  A.drawShrine = A.drawTemple;
})(window.SI);
