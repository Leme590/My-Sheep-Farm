/* Schaf-Imperium: Schaf-Schach für die Duelle (Kai, 17.11.2026).
   Normale Schachregeln (Rochade, en passant, Bauer wird zur Dame). Die Figuren sind Schafe,
   aber man erkennt sie sofort: Turm mit Zinnen, Springer mit Pferdekopf, Läufer mit Mitra, Dame und König mit Krone.
   Brett: 64 Zeichen, Feld 0 = a8 oben links, 63 = h1. Große Buchstaben = Weiß. Ein Zug = von * 64 + nach.
   Der Server (supabase.sql) rechnet genau gleich. */
(function (SI) {
  'use strict';
  var CH = {};
  CH.START = 'rnbqkbnrpppppppp' + '................................' + 'PPPPPPPPRNBQKBNR';
  var KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var ALL = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  function at(b, r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8 ? b[r * 8 + c] : '#'; }
  function isW(p) { return p >= 'A' && p <= 'Z'; }
  function foe(q, w) { return q !== '.' && q !== '#' && isW(q) !== w; }

  function attacked(b, sq, byW) {
    var r = sq >> 3, c = sq & 7, i, k, p, d;
    var dr = byW ? 1 : -1, P = byW ? 'P' : 'p', N = byW ? 'N' : 'n', K = byW ? 'K' : 'k';
    var RQ = byW ? 'RQ' : 'rq', BQ = byW ? 'BQ' : 'bq';
    if (at(b, r + dr, c - 1) === P || at(b, r + dr, c + 1) === P) return true;
    for (i = 0; i < 8; i++) if (at(b, r + KN[i][0], c + KN[i][1]) === N) return true;
    for (i = 0; i < 8; i++) if (at(b, r + KG[i][0], c + KG[i][1]) === K) return true;
    for (i = 0; i < 8; i++) {
      d = ALL[i]; k = 1;
      while ((p = at(b, r + d[0] * k, c + d[1] * k)) === '.') k++;
      if (p !== '#' && (d[0] === 0 || d[1] === 0 ? RQ : BQ).indexOf(p) >= 0) return true;
    }
    return false;
  }
  function pseudo(b, w, ep, cr) {
    var res = [], sq, p, lp, r, c, i, k, q, d, dir, t;
    for (sq = 0; sq < 64; sq++) {
      p = b[sq]; if (p === '.' || isW(p) !== w) continue;
      lp = p.toLowerCase(); r = sq >> 3; c = sq & 7;
      if (lp === 'p') {
        dir = w ? -1 : 1;
        if (at(b, r + dir, c) === '.') {
          res.push(sq * 64 + (r + dir) * 8 + c);
          if (r === (w ? 6 : 1) && at(b, r + 2 * dir, c) === '.') res.push(sq * 64 + (r + 2 * dir) * 8 + c);
        }
        for (k = -1; k <= 1; k += 2) {
          q = at(b, r + dir, c + k); t = (r + dir) * 8 + c + k;
          if (foe(q, w)) res.push(sq * 64 + t);
          else if (q === '.' && t === ep) res.push(sq * 64 + t);
        }
      } else if (lp === 'n' || lp === 'k') {
        var L = lp === 'n' ? KN : KG;
        for (i = 0; i < 8; i++) { q = at(b, r + L[i][0], c + L[i][1]); if (q === '.' || foe(q, w)) res.push(sq * 64 + (r + L[i][0]) * 8 + c + L[i][1]); }
      } else {
        for (i = 0; i < 8; i++) {
          d = ALL[i];
          if (lp === 'r' && d[0] !== 0 && d[1] !== 0) continue;
          if (lp === 'b' && (d[0] === 0 || d[1] === 0)) continue;
          for (k = 1; ; k++) {
            q = at(b, r + d[0] * k, c + d[1] * k); if (q === '#') break;
            t = (r + d[0] * k) * 8 + c + d[1] * k;
            if (q === '.') { res.push(sq * 64 + t); continue; }
            if (foe(q, w)) res.push(sq * 64 + t);
            break;
          }
        }
      }
    }
    // Rochade: König und Turm stehen noch, Felder dazwischen frei, König steht nicht im Schach und läuft nicht durch Schach
    if (w && b[60] === 'K') {
      if (cr.indexOf('K') >= 0 && b[61] === '.' && b[62] === '.' && b[63] === 'R' && !attacked(b, 60, false) && !attacked(b, 61, false) && !attacked(b, 62, false)) res.push(60 * 64 + 62);
      if (cr.indexOf('Q') >= 0 && b[59] === '.' && b[58] === '.' && b[57] === '.' && b[56] === 'R' && !attacked(b, 60, false) && !attacked(b, 59, false) && !attacked(b, 58, false)) res.push(60 * 64 + 58);
    }
    if (!w && b[4] === 'k') {
      if (cr.indexOf('k') >= 0 && b[5] === '.' && b[6] === '.' && b[7] === 'r' && !attacked(b, 4, true) && !attacked(b, 5, true) && !attacked(b, 6, true)) res.push(4 * 64 + 6);
      if (cr.indexOf('q') >= 0 && b[3] === '.' && b[2] === '.' && b[1] === '.' && b[0] === 'r' && !attacked(b, 4, true) && !attacked(b, 3, true) && !attacked(b, 2, true)) res.push(4 * 64 + 2);
    }
    return res;
  }
  function apply(b, f, t, ep) {
    var a = b.split(''), p = a[f], lp = p.toLowerCase();
    if (lp === 'p' && t === ep && a[t] === '.') a[(f >> 3) * 8 + (t & 7)] = '.';
    if (lp === 'p' && ((t >> 3) === 0 || (t >> 3) === 7)) p = isW(p) ? 'Q' : 'q';
    a[t] = p; a[f] = '.';
    if (lp === 'k' && Math.abs(t - f) === 2) {
      if (t > f) { a[f + 1] = a[f + 3]; a[f + 3] = '.'; } else { a[f - 1] = a[f - 4]; a[f - 4] = '.'; }
    }
    return a.join('');
  }
  function legal(b, w, ep, cr) {
    return pseudo(b, w, ep, cr).filter(function (m) {
      var nb = apply(b, m >> 6, m & 63, ep);
      return !attacked(nb, nb.indexOf(w ? 'K' : 'k'), !w);
    });
  }
  CH.attacked = attacked;
  CH.init = function (wh) { return { b: CH.START, wh: wh, cr: 'KQkq', ep: -1, hm: 0, n: 0, lm: -1, chk: false }; };
  CH.legal = function (g, s) { return legal(g.b, s === g.wh, g.ep, g.cr); };
  // Ein Zug von Seite s. Gibt das neue Spiel zurück und res: null (weiter), s (Schachmatt) oder 2 (Remis)
  CH.play = function (g, s, mv) {
    var w = s === g.wh;
    if (CH.legal(g, s).indexOf(mv) < 0) throw new Error('duel_bad_move');
    var f = mv >> 6, t = mv & 63, lp = g.b[f].toLowerCase(), cap = g.b[t] !== '.' || (lp === 'p' && t === g.ep);
    var nb = apply(g.b, f, t, g.ep), cr = g.cr;
    [[60, 'KQ'], [63, 'K'], [56, 'Q'], [4, 'kq'], [7, 'k'], [0, 'q']].forEach(function (x) { if (f === x[0] || t === x[0]) cr = cr.replace(new RegExp('[' + x[1] + ']', 'g'), ''); });
    var ep = lp === 'p' && Math.abs(t - f) === 16 ? (f + t) / 2 : -1;
    var hm = cap || lp === 'p' ? 0 : (g.hm || 0) + 1;
    var ow = !w, chk = attacked(nb, nb.indexOf(ow ? 'K' : 'k'), w), om = legal(nb, ow, ep, cr);
    var ng = { b: nb, wh: g.wh, cr: cr, ep: ep, hm: hm, n: (g.n || 0) + 1, lm: [f, t], chk: chk, cap: cap }, res = null;
    var rest = nb.replace(/[.Kk]/g, '');
    if (!om.length) { if (chk) { ng.mate = true; res = s; } else { ng.stale = true; res = 2; } }
    else if (!rest.length || (rest.length === 1 && /[NBnb]/.test(rest)) || hm >= 100) { ng.nomat = true; res = 2; }
    return { g: ng, res: res };
  };

  /* ---------- Schafbot (Test-Modus): schaut zwei Halbzüge voraus ---------- */
  var VAL = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };
  function material(b, w) {
    var s = 0;
    for (var i = 0; i < 64; i++) {
      var p = b[i]; if (p === '.') continue;
      var v = VAL[p.toLowerCase()], r = i >> 3, c = i & 7;
      v += 0.04 * (3.5 - Math.abs(3.5 - c)) + 0.03 * (3.5 - Math.abs(3.5 - r)); // Mitte ist gut
      s += isW(p) === w ? v : -v;
    }
    return s;
  }
  CH.bot = function (g, s) {
    var w = s === g.wh, best = null, bestV = -1e9;
    CH.legal(g, s).forEach(function (m) {
      var r = CH.play(g, s, m), v;
      if (r.res === s) v = 1000;
      else if (r.res === 2) v = -0.5 - material(g.b, w) * 0.1;
      else {
        var worst = 1e9;
        CH.legal(r.g, 1 - s).forEach(function (m2) {
          var r2 = CH.play(r.g, 1 - s, m2), v2 = r2.res === 1 - s ? -1000 : material(r2.g.b, w);
          if (v2 < worst) worst = v2;
        });
        v = worst;
      }
      v += Math.random() * 0.6;
      if (v > bestV) { bestV = v; best = m; }
    });
    return best;
  };
  SI.chess = CH;

  /* ---------- Die Schaf-Figuren ---------- */
  var A = SI.art; if (!A) return;
  var TAU = Math.PI * 2, OUT = A.OUT;
  function ell(g, x, y, rx, ry) { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, TAU); } // nur Pfad, ohne Füllen
  function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
  var TEAM = {
    w: { wool: '#ffffff', woolD: '#d9dde6', face: '#3a2c2c', ear: '#4a3838', acc: '#ffcf3a', accD: '#d79a12', base: '#f4ead2', baseD: '#c8b58a' },
    b: { wool: '#4c4658', woolD: '#2c2834', face: '#18141c', ear: '#241e2a', acc: '#ff4f5e', accD: '#b4202e', base: '#3a3442', baseD: '#211c28' }
  };
  function fo(g, fill, lw) { g.fillStyle = fill; g.fill(); g.strokeStyle = OUT; g.lineWidth = lw || 1.5; g.stroke(); }
  function vg(g, y0, y1, a, b) { var gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
  function wool(g, pts, C) { // Wolle aus vielen Kreisen mit gemeinsamem Umriss
    g.strokeStyle = OUT; g.lineWidth = 3;
    g.beginPath(); pts.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); }); g.stroke();
    var y0 = Math.min.apply(null, pts.map(function (p) { return p[1] - p[2]; })), y1 = Math.max.apply(null, pts.map(function (p) { return p[1] + p[2]; }));
    g.fillStyle = vg(g, y0, y1, C.wool, C.woolD);
    g.beginPath(); pts.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); }); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; pts.forEach(function (p) { if (p[2] > 4) { g.beginPath(); ell(g, p[0] - p[2] * 0.3, p[1] - p[2] * 0.4, p[2] * 0.35, p[2] * 0.22); g.fill(); } });
  }
  function base(g, C, w) {
    w = w || 17;
    g.beginPath(); g.moveTo(-w, 0); g.lineTo(w, 0); g.quadraticCurveTo(w + 1, -5, w - 3, -6); g.lineTo(-w + 3, -6); g.quadraticCurveTo(-w - 1, -5, -w, 0); g.closePath();
    fo(g, vg(g, -6, 0, C.base, C.baseD), 1.8);
    g.beginPath(); ell(g, 0, -7, w - 5, 3.2); fo(g, C.accD, 1.4);
    g.beginPath(); ell(g, 0, -7.6, w - 7, 1.6); g.fillStyle = C.acc; g.fill();
  }
  function face(g, x, y, s, C, side) {
    g.save(); g.translate(x, y); g.scale(s, s);
    // Ohren
    [-1, 1].forEach(function (k) { g.save(); g.translate(k * 7.5, -1.5); g.rotate(k * 0.5); g.beginPath(); ell(g, 0, 0, 4.4, 2.3); fo(g, C.ear, 1.2); g.beginPath(); ell(g, k * 0.6, 0, 2.4, 1.1); g.fillStyle = '#ff9fae'; g.fill(); g.restore(); });
    g.beginPath(); g.ellipse(0, 1, 6.6, 7.6, 0, 0, TAU); fo(g, C.face, 1.3);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); ell(g, -2, -2.5, 3, 1.8); g.fill();
    // Augen
    [-1, 1].forEach(function (k) {
      g.fillStyle = '#fff'; g.beginPath(); ell(g, k * 2.7, 0, 2.1, 2.5); g.fill();
      g.fillStyle = '#111'; g.beginPath(); circ(g, k * 2.7 + (side || 0) * 0.5, 0.4, 1.25); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); circ(g, k * 2.7 + 0.5, -0.4, 0.5); g.fill();
    });
    g.fillStyle = '#ff9fae'; g.beginPath(); ell(g, 0, 4.8, 1.7, 1); g.fill();
    g.restore();
  }
  function gem(g, x, y, r, col) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath(); fo(g, col, 1); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); circ(g, x - r * 0.25, y - r * 0.3, r * 0.25); g.fill(); }

  function drawPiece(g, k, C) {
    if (k === 'p') { // Bauer: kleines rundes Schaf
      base(g, C, 14);
      wool(g, [[-8, -14, 6], [8, -14, 6], [0, -13, 8], [-6, -22, 7], [6, -22, 7], [0, -27, 8]], C);
      face(g, 0, -20, 0.95, C);
    } else if (k === 'r') { // Turm: Woll-Turm mit Zinnen
      base(g, C, 17);
      g.beginPath(); g.moveTo(-13, -8); g.lineTo(-11, -38); g.lineTo(11, -38); g.lineTo(13, -8); g.closePath(); fo(g, vg(g, -38, -8, C.wool, C.woolD), 2);
      wool(g, [[-12, -12, 4], [-12, -20, 4], [-11.5, -28, 4], [-11, -35, 4], [12, -12, 4], [12, -20, 4], [11.5, -28, 4], [11, -35, 4]], C);
      g.beginPath(); g.moveTo(-14, -38); g.lineTo(14, -38); g.lineTo(14, -42); g.lineTo(-14, -42); g.closePath(); fo(g, vg(g, -42, -38, C.acc, C.accD), 1.6);
      [-14, -3.5, 7].forEach(function (x) { g.beginPath(); g.rect(x, -50, 7, 8.5); fo(g, vg(g, -50, -42, C.acc, C.accD), 1.6); });
      g.strokeStyle = C.accD; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, -40); g.lineTo(12, -40); g.stroke();
      face(g, 0, -24, 1.05, C);
    } else if (k === 'n') { // Springer: Schafkopf von der Seite wie ein Pferd, mit Woll-Mähne
      base(g, C, 17);
      wool(g, [[-6, -12, 8], [6, -12, 8], [0, -16, 9]], C);
      g.beginPath(); g.moveTo(-9, -16); g.quadraticCurveTo(-10, -32, -2, -42); g.quadraticCurveTo(4, -50, 2, -54); g.quadraticCurveTo(10, -50, 12, -40);
      g.quadraticCurveTo(14, -26, 10, -16); g.closePath(); fo(g, vg(g, -54, -16, C.wool, C.woolD), 2);
      // Kopf nach links mit langer Schnauze
      g.beginPath(); g.moveTo(-1, -45); g.quadraticCurveTo(-14, -44, -19, -35); g.quadraticCurveTo(-21, -29, -15, -28); g.quadraticCurveTo(-8, -29, -3, -32); g.quadraticCurveTo(4, -36, 3, -42); g.closePath(); fo(g, C.face, 1.6);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); ell(g, -9, -40, 4, 1.6); g.fill();
      g.fillStyle = '#ff9fae'; g.beginPath(); ell(g, -17.5, -31.5, 1.6, 1); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); ell(g, -6, -39, 2.3, 2.6); g.fill(); g.fillStyle = '#111'; g.beginPath(); circ(g, -6.6, -38.6, 1.3); g.fill(); g.fillStyle = '#fff'; g.beginPath(); circ(g, -6.1, -39.4, 0.5); g.fill();
      g.save(); g.translate(1, -46); g.rotate(-0.9); g.beginPath(); ell(g, 0, 0, 4.6, 2.2); fo(g, C.ear, 1.2); g.restore();
      // Mähne aus Wolle
      wool(g, [[4, -50, 3.6], [8, -45, 3.8], [11, -39, 3.8], [12, -32, 3.8], [12, -25, 3.6], [11, -19, 3.4]], C);
      gem(g, 6, -14, 3, C.acc);
    } else if (k === 'b') { // Läufer: Schaf mit Bischofsmütze (Mitra mit Schlitz)
      base(g, C, 16);
      wool(g, [[-9, -13, 7], [9, -13, 7], [0, -14, 9], [-7, -23, 7], [7, -23, 7], [0, -27, 8]], C);
      face(g, 0, -22, 1, C);
      g.beginPath(); g.moveTo(-9, -31); g.quadraticCurveTo(-10, -44, 0, -53); g.quadraticCurveTo(10, -44, 9, -31); g.quadraticCurveTo(0, -28, -9, -31); g.closePath();
      fo(g, vg(g, -53, -30, C.acc, C.accD), 1.8);
      g.strokeStyle = OUT; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-3, -46); g.lineTo(4, -39); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8.6, -33); g.quadraticCurveTo(0, -30.5, 8.6, -33); g.stroke();
      g.beginPath(); circ(g, 0, -55, 2.6); fo(g, C.acc, 1.3);
    } else if (k === 'q') { // Dame: Schaf mit Krönchen voller Perlen
      base(g, C, 17);
      wool(g, [[-10, -13, 7], [10, -13, 7], [0, -14, 9], [-8, -24, 7.5], [8, -24, 7.5], [0, -29, 9], [-4, -36, 6], [4, -36, 6]], C);
      face(g, 0, -25, 1.05, C);
      g.beginPath(); g.moveTo(-11, -38); g.lineTo(-13, -50); g.lineTo(-6.5, -43); g.lineTo(0, -53); g.lineTo(6.5, -43); g.lineTo(13, -50); g.lineTo(11, -38); g.quadraticCurveTo(0, -35, -11, -38); g.closePath();
      fo(g, vg(g, -53, -36, C.acc, C.accD), 1.8);
      [[-13, -51], [0, -54.5], [13, -51]].forEach(function (p) { g.beginPath(); circ(g, p[0], p[1], 2.4); fo(g, '#fff', 1.1); });
      gem(g, 0, -41, 2.6, C === TEAM.w ? '#ff4f7a' : '#7ad8ff');
    } else { // König: größtes Schaf mit Krone und Kreuz
      base(g, C, 18);
      wool(g, [[-11, -13, 7.5], [11, -13, 7.5], [0, -14, 10], [-9, -25, 8], [9, -25, 8], [0, -30, 9.5], [-5, -37, 6.5], [5, -37, 6.5]], C);
      face(g, 0, -26, 1.1, C);
      g.beginPath(); g.moveTo(-12, -39); g.lineTo(-12, -49); g.lineTo(-6, -44); g.lineTo(0, -50); g.lineTo(6, -44); g.lineTo(12, -49); g.lineTo(12, -39); g.quadraticCurveTo(0, -36, -12, -39); g.closePath();
      fo(g, vg(g, -50, -37, C.acc, C.accD), 1.8);
      g.beginPath(); g.rect(-1.9, -60, 3.8, 11); fo(g, C.acc, 1.4);
      g.beginPath(); g.rect(-5, -57, 10, 3.6); fo(g, C.acc, 1.4);
      g.fillStyle = C.acc; g.fillRect(-1.2, -57.2, 2.4, 3.2);
      gem(g, 0, -42.5, 2.4, C === TEAM.w ? '#ff4f7a' : '#7ad8ff');
      gem(g, -7.5, -41.5, 1.6, '#8fe0ff'); gem(g, 7.5, -41.5, 1.6, '#8fe0ff');
    }
  }
  var curl = {};
  A.chessURL = function (p) {
    if (curl[p]) return curl[p];
    var w = p >= 'A' && p <= 'Z';
    curl[p] = A.sprite('chess|' + p, [-22, -62, 22, 2], function (g) { drawPiece(g, p.toLowerCase(), w ? TEAM.w : TEAM.b); }, { ol: 1.2, sc: 3 }).c.toDataURL();
    return curl[p];
  };
})(window.SI);
