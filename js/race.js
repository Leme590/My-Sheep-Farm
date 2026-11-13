/* Schaf-Imperium: Schafrennen-Cup der Clubs (jeden Freitag) */
(function (SI) {
  'use strict';
  var G = SI.G, N = SI.net, U = SI.ui;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;

  /* ---------- Renn-Schaf zeichnen ---------- */
  var WOOL = ['#ffffff', '#f4e3c3', '#ffd23f', '#ff9a3c', '#e8463c', '#ff9cc0', '#c9a2ff', '#8a4fe0', '#7fd3ff', '#3f8fe8', '#8be06a', '#2fb36b', '#b0b8c4', '#5a6270', '#2a2a35', '#a0662f'];
  var PATS = ['Keins', 'Punkte', 'Streifen', 'Sterne', 'Herzen', 'Flecken', 'Karo', 'Blitze'];
  // Kai: Accessoires sind echte gezeichnete Modelle (keine Emojis). Ursprung = Mitte oben auf dem Kopf (106, 29).
  var O = '#2a1a12';
  function starPath(cx, cy, r) { var d = ''; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(1) + ' ' + (cy + Math.sin(a) * q).toFixed(1); } return d + 'Z'; }
  var HEART = 'M0 4C-7-2-4-8 0-4C4-8 7-2 0 4Z', BOLT = 'M1.5-7L-4 1H0L-2 7L4.5-1H.5Z';
  var ACCS = [
    ['Nichts', ''],
    ['Krone', '<path d="M-13 2V-12L-6.5-5L0-16L6.5-5L13-12V2Z" fill="#ffd23f" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><rect x="-13" y="-2" width="26" height="5" rx="1.5" fill="#f2a900" stroke="' + O + '" stroke-width="2"/><circle cx="0" cy="-16" r="2.4" fill="#e8463c" stroke="' + O + '" stroke-width="1.4"/><circle cx="-13" cy="-12" r="2" fill="#3f8fe8" stroke="' + O + '" stroke-width="1.3"/><circle cx="13" cy="-12" r="2" fill="#3f8fe8" stroke="' + O + '" stroke-width="1.3"/><circle cx="0" cy=".5" r="1.8" fill="#e8463c"/>'],
    ['Zylinder', '<ellipse cx="0" cy="1" rx="17" ry="4.5" fill="#2a2a35" stroke="' + O + '" stroke-width="2.4"/><path d="M-10 1V-22Q0-25 10-22V1Z" fill="#2a2a35" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><rect x="-10" y="-6" width="20" height="5" fill="#e8463c"/><path d="M-7-20V-9" stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round"/>'],
    ['Kappe', '<path d="M-13 2Q-13-15 1-15Q14-15 14 2Z" fill="#e8463c" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 1Q20-2 27 3Q20 6 8 4Z" fill="#c42a1c" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M1-15V1" stroke="rgba(255,255,255,.35)" stroke-width="2"/><circle cx="1" cy="-15" r="2.2" fill="#fff" stroke="' + O + '" stroke-width="1.4"/>'],
    ['Doktorhut', '<path d="M-10 0V-6H10V0Q0 4-10 0Z" fill="#2a2a35" stroke="' + O + '" stroke-width="2.2"/><path d="M-20-9L0-17L20-9L0-1Z" fill="#3a3a48" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M0-9Q12-8 14 4" stroke="#ffd23f" stroke-width="2" fill="none"/><path d="M12 3L14 10L16 3Z" fill="#ffd23f" stroke="' + O + '" stroke-width="1.2"/>'],
    ['Helm', '<path d="M-15 8Q-17-17 2-18Q19-17 19 6L10 7Q8-2-2-3Z" fill="#3f8fe8" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M-12-6Q2-14 17-4" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M9 7Q20 6 22 13L12 13Z" fill="#7fd3ff" stroke="' + O + '" stroke-width="2" opacity=".9"/><circle cx="-12" cy="2" r="2.5" fill="#ffd23f" stroke="' + O + '" stroke-width="1.4"/>'],
    ['Sonnenbrille', '', '<g transform="translate(110 44)"><path d="M-12-3H12" stroke="' + O + '" stroke-width="2.4"/><path d="M-1-4Q-1 4-7 4Q-12 4-12-4Z" fill="#1a1a24" stroke="' + O + '" stroke-width="1.8"/><path d="M1-4Q1 4 7 4Q12 4 12-4Z" fill="#1a1a24" stroke="' + O + '" stroke-width="1.8"/><path d="M-9-2L-6-2M4-2L7-2" stroke="#7fd3ff" stroke-width="1.6" stroke-linecap="round"/></g>'],
    ['Schleife', '<g transform="translate(-6 -2) rotate(-15)"><path d="M0 0L-12-8Q-15 0-12 8Z" fill="#ff5f9a" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M0 0L12-8Q15 0 12 8Z" fill="#ff5f9a" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><circle r="4" fill="#ff8fbf" stroke="' + O + '" stroke-width="2"/></g>'],
    ['Blume', '<g transform="translate(-8 -4)">' + [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="0" cy="-6.5" rx="4.2" ry="6" fill="#fff" stroke="' + O + '" stroke-width="1.8" transform="rotate(' + a + ')"/>'; }).join('') + '<circle r="4.5" fill="#ffd23f" stroke="' + O + '" stroke-width="1.8"/><path d="M6 6Q10 12 6 18" stroke="#2fb36b" stroke-width="2.4" fill="none"/></g>'],
    ['Kopfhörer', '<path d="M-17 12Q-19-17 3-17Q23-17 21 12" stroke="#2a2a35" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-17 12Q-19-17 3-17Q23-17 21 12" stroke="#5a6270" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="-23" y="6" width="10" height="15" rx="4" fill="#e8463c" stroke="' + O + '" stroke-width="2.2"/><rect x="16" y="6" width="10" height="15" rx="4" fill="#e8463c" stroke="' + O + '" stroke-width="2.2"/>'],
    ['Feuer', '<path d="M-12 2Q-16-10-7-14Q-8-8-3-8Q-6-18 3-24Q1-14 8-12Q8-17 12-18Q16-8 12 2Z" fill="#ff6a2b" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M-6 1Q-8-6-2-8Q-1-4 2-4Q1-11 6-14Q6-7 9-5Q10 0 7 1Z" fill="#ffd23f"/>'],
    ['Stern', '<path d="' + starPath(0, -9, 11) + '" fill="#ffd23f" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="' + starPath(0, -9, 5) + '" fill="#fff6b0"/><circle cx="-14" cy="-16" r="1.6" fill="#fff"/><circle cx="14" cy="-2" r="1.3" fill="#fff"/>'],
    ['Regenbogen', '<g fill="none" stroke-linecap="round">' + ['#e8463c', '#ff9a3c', '#ffd23f', '#8be06a', '#3f8fe8', '#8a4fe0'].map(function (c, i) { var r = 21 - i * 2.6; return '<path d="M' + (-r) + ' 2A' + r + ' ' + r + ' 0 0 1 ' + r + ' 2" stroke="' + c + '" stroke-width="2.8"/>'; }).join('') + '</g><ellipse cx="-19" cy="3" rx="6" ry="4" fill="#fff" stroke="' + O + '" stroke-width="1.6"/><ellipse cx="19" cy="3" rx="6" ry="4" fill="#fff" stroke="' + O + '" stroke-width="1.6"/>'],
    ['Pizza', '<g transform="rotate(-8)"><path d="M-13-1L0-24L13-1Z" fill="#ffd25e" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M-14-1Q0 5 14-1" stroke="#c98a3a" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-3" cy="-8" r="2.6" fill="#d23a2a"/><circle cx="4" cy="-13" r="2.2" fill="#d23a2a"/><circle cx="3" cy="-5" r="2" fill="#d23a2a"/><path d="M-6-14L-4-15" stroke="#2fb36b" stroke-width="2"/></g>'],
    ['Einhorn', '<path d="M-5 0L4-28L7 0Z" fill="#ffe9a0" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M-3-6L6-9M-1-13L5-16M1-20L5-22" stroke="#ff8fbf" stroke-width="2"/><path d="M-12 2Q-16-6-10-8Q-11-2-6 0Z" fill="#c9a2ff" stroke="' + O + '" stroke-width="1.6"/><path d="M-16 8Q-22 0-16-4Q-15 2-11 4Z" fill="#7fd3ff" stroke="' + O + '" stroke-width="1.6"/>'],
    ['Pokal', '<path d="M-8-22H8V-17Q8-8 0-7Q-8-8-8-17Z" fill="#ffd23f" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M-8-19Q-14-19-12-14Q-11-11-7-12M8-19Q14-19 12-14Q11-11 7-12" stroke="' + O + '" stroke-width="2" fill="none"/><rect x="-2" y="-7" width="4" height="5" fill="#f2a900" stroke="' + O + '" stroke-width="1.6"/><rect x="-7" y="-3" width="14" height="5" rx="1.5" fill="#a0662f" stroke="' + O + '" stroke-width="2"/><path d="M-4-19V-13" stroke="#fff6b0" stroke-width="2" stroke-linecap="round"/>']
  ];
  var BODY = [[40, 50, 20], [58, 40, 22], [78, 42, 21], [92, 55, 17], [62, 62, 20], [42, 64, 15], [80, 64, 17]];
  var pid = 0;
  function patDef(id, p, pc) {
    var st = ' stroke="rgba(0,0,0,.28)" stroke-width=".8"';
    switch (p) {
      case 1: return '<pattern id="' + id + '" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="3.4" fill="' + pc + '"' + st + '/></pattern>';
      case 2: return '<pattern id="' + id + '" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="12" height="5.5" fill="' + pc + '"/></pattern>';
      case 3: return '<pattern id="' + id + '" width="20" height="20" patternUnits="userSpaceOnUse"><path d="' + starPath(10, 10, 6) + '" fill="' + pc + '"' + st + '/></pattern>';
      case 4: return '<pattern id="' + id + '" width="18" height="18" patternUnits="userSpaceOnUse"><path d="' + HEART + '" transform="translate(9 9) scale(1.1)" fill="' + pc + '"' + st + '/></pattern>';
      case 5: return '<pattern id="' + id + '" width="30" height="26" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="6.5" fill="' + pc + '"/><circle cx="23" cy="19" r="5" fill="' + pc + '"/></pattern>';
      case 6: return '<pattern id="' + id + '" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="' + pc + '"/><rect x="8" y="8" width="8" height="8" fill="' + pc + '"/></pattern>';
      case 7: return '<pattern id="' + id + '" width="18" height="18" patternUnits="userSpaceOnUse"><path d="' + BOLT + '" transform="translate(9 9)" fill="' + pc + '"' + st + '/></pattern>';
    }
    return '';
  }
  // Kai: zwei Farben. col = Wolle, col2 = zweite Farbe (Muster, Schopf, Schwanz und Startnummer-Decke)
  function ok(r) {
    r = r || {}; var f = function (v, mx, d) { v = parseInt(v, 10); return isNaN(v) ? d : Math.max(0, Math.min(mx, v)); };
    var col = f(r.col, 15, 0); return { col: col, col2: f(r.col2, 15, col === 4 ? 2 : 4), pat: f(r.pat, 7, 0), acc: f(r.acc, ACCS.length - 1, 0) };
  }
  function racer(r, w, cls, vb) {
    r = ok(r); var id = 'rp' + (++pid), col = WOOL[r.col], c2 = WOOL[r.col2], gid = id + 'g';
    var circ = function (fill, grow, extra) { return BODY.map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + grow) + '" fill="' + fill + '"' + (extra || '') + '/>'; }).join(''); };
    var a = ACCS[r.acc], hat = a[1], face = a[2] || '';
    var leg = function (cl, x, y, h) { return '<g class="lg ' + cl + '"><rect x="' + x + '" y="' + y + '" width="9" height="' + h + '" rx="4" fill="#3b2c2a" stroke="' + O + '" stroke-width="1.5"/><rect x="' + (x - 0.5) + '" y="' + (y + h - 6) + '" width="10" height="6" rx="2.5" fill="#1d1414"/></g>'; };
    return '<svg class="racer ' + (cls || '') + '" viewBox="' + (vb ? '74 -6 62 66' : '0 -10 132 110') + '" width="' + w + '" height="' + Math.round(w * (vb ? 66 / 62 : 110 / 132)) + '" aria-hidden="true">' +
      '<defs>' + (r.pat ? patDef(id, r.pat, c2) : '') + '<radialGradient id="' + gid + '" cx=".35" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient></defs>' +
      '<ellipse cx="66" cy="88" rx="44" ry="6" fill="rgba(0,0,0,.18)"/>' +
      '<g class="legs">' + leg('a', 36, 60, 26) + leg('b', 52, 62, 24) + leg('b', 74, 62, 24) + leg('a', 88, 60, 26) + '</g>' +
      '<g class="bd">' +
      '<circle cx="20" cy="44" r="10.5" fill="' + O + '"/><circle cx="20" cy="44" r="8" fill="' + c2 + '"/><circle cx="17" cy="41" r="3" fill="rgba(255,255,255,.4)"/>' +
      circ(O, 3.2) + circ(col, 0) + (r.pat ? circ('url(#' + id + ')', 0) : '') + circ('url(#' + gid + ')', 0) +
      // Startnummer-Decke in der zweiten Farbe
      '<path d="M48 36Q62 30 76 36L73 58Q62 62 51 58Z" fill="' + c2 + '" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><circle cx="62" cy="46" r="7" fill="#fff" stroke="' + O + '" stroke-width="1.8"/>' +
      '<path d="M60.5 42.5L63 41V51" stroke="' + O + '" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      // Kopf
      '<ellipse cx="96" cy="33" rx="8.5" ry="4.8" fill="#3b2c2a" stroke="' + O + '" stroke-width="1.8" transform="rotate(-25 96 33)"/><ellipse cx="95" cy="33" rx="4.5" ry="2" fill="#ff9cb4" transform="rotate(-25 96 33)"/>' +
      '<ellipse cx="107" cy="47" rx="16" ry="17.5" fill="#3b2c2a" stroke="' + O + '" stroke-width="2.6"/>' +
      '<ellipse cx="102" cy="40" rx="6" ry="4" fill="rgba(255,255,255,.12)"/>' +
      '<g><circle cx="99" cy="31" r="6" fill="' + c2 + '" stroke="' + O + '" stroke-width="2.2"/><circle cx="106" cy="28" r="7" fill="' + c2 + '" stroke="' + O + '" stroke-width="2.2"/><circle cx="113" cy="31" r="5.5" fill="' + c2 + '" stroke="' + O + '" stroke-width="2.2"/>' +
      '<circle cx="104" cy="26" r="2.2" fill="rgba(255,255,255,.45)"/></g>' +
      (face ? '' : '<ellipse cx="111" cy="44" rx="5.2" ry="5.6" fill="#fff"/><circle cx="112.8" cy="44.6" r="2.6" fill="#111"/><circle cx="113.6" cy="43.4" r="1" fill="#fff"/><path d="M105.5 37.5L116 39.5" stroke="#1d1414" stroke-width="2.2" stroke-linecap="round"/>') +
      '<circle cx="103" cy="54" r="3.2" fill="#ff8a95" opacity=".7"/><path d="M109.5 55.5q4.5 3.5 9 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      face + (hat ? '<g transform="translate(106 29)">' + hat + '</g>' : '') +
      '</g></svg>';
  }

  /* ---------- Punkte sammeln ---------- */
  // Jede Aktion am Freitag bringt dem Club Rennpunkte
  var PTS = [['boxes', 1, '📦 Kiste öffnen'], ['dekoBoxes', 1, '🎁 Deko-Kiste kaufen'], ['lvls', 2, '🔨 Gehege ausbauen'], ['breeds', 3, '💕 Schaf züchten'],
    ['wolves', 3, '🐺 Wolf verjagen'], ['quests', 4, '📜 Aufgabe schaffen'], ['golden', 5, '✨ Goldenes Schaf fangen'], ['duelWins', 5, '⚔️ Duell gewinnen']];
  var MAXP = 500;
  function score(S) { var p = 0; PTS.forEach(function (x) { p += (S.stats[x[0]] || 0) * x[1]; }); return p; }
  var R = { board: null, mine: undefined, mode: 'main', draft: null, busy: false, sending: false, lastPop: 0 };
  function tok() { var m = U.me(); return m && m.token; }
  function day() { return G.today(); }
  function track() {
    if (!U.me() || G.visiting || !N.raceFriday()) return;
    var S = G.S, sc = score(S), st = S.race;
    if (!st || st.day !== day()) st = S.race = { day: day(), base: sc, sent: 0 };
    var pts = sc - st.base;
    if (!S.club) { st.base = sc - st.sent; return; } // ohne Club zählt nichts
    var d = pts - st.sent; if (d <= 0 || R.sending || st.sent >= MAXP) return;
    R.sending = true; st.sent += d; U.saveLocal();
    N.race.add(tok(), d).then(function (n) {
      if (n > 0) { SFX('star'); U.toast('🏁 +' + n + ' Rennpunkte für ' + (S.club ? S.club.name : 'deinen Club') + '!'); }
      var sh = U.sheet(); if (sh && sh.name === 'rennen') loadBoard();
    }).catch(function () { st.sent -= d; }).then(function () { R.sending = false; });
  }
  setInterval(track, 5000);

  /* ---------- Menü ---------- */
  function loadBoard() {
    if (!tok()) return;
    N.race.board(tok()).then(function (b) { R.board = b; }).catch(function (e) { R.board = { err: N.errText(e) }; }).then(rerender);
  }
  function loadMine() { N.club.mine(tok()).then(function (m) { R.mine = m || null; }).catch(function () { R.mine = null; }).then(rerender); }
  function rerender() { var sh = U.sheet(); if (sh && sh.name === 'rennen') U.renderSheet(); }
  function untilEnd() { var d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); return (m - d) / 1000; }
  function daysToFriday() { var d = new Date().getDay(); return (5 - d + 7) % 7 || 7; }
  function lanes(rows, myId) {
    var top = rows.slice(0, 8), mine = rows.filter(function (r) { return r.id === myId; })[0];
    if (mine && top.indexOf(mine) < 0) top.push(mine);
    var max = Math.max(50, rows.length ? rows[0].points * 1.08 : 50);
    return '<div class="rtrack">' + top.map(function (r) {
      var i = rows.indexOf(r), pos = Math.min(100, r.points / max * 100);
      return '<div class="rlane' + (r.id === myId ? ' me' : '') + '"><div class="rlbl"><b>' + (i + 1) + '.</b>' + (SI.club ? SI.club.crest(r.crest, 18) : '') + '<span>' + esc(r.name) + '</span><em class="num">' + r.points + '</em></div>' +
        '<div class="rway"><div class="rrun" style="left:calc(' + pos + '% - ' + pos * 0.56 + 'px)">' + racer(r.racer, 56, 'run') + '</div></div></div>';
    }).join('') + '<div class="rfinish"></div></div>';
  }
  function podium(rows) {
    if (!rows || !rows.length) return '<p class="hint center">Letzten Freitag ist noch niemand gerannt.</p>';
    return '<div class="rpod">' + [1, 0, 2].map(function (i) {
      var r = rows[i]; if (!r) return '<div class="rp empty"></div>';
      return '<div class="rp p' + (i + 1) + '">' + (i === 0 ? '<span class="crown">👑</span>' : '') + racer(r.racer, i === 0 ? 76 : 60) + '<b>' + esc(r.name) + '</b><small class="num">' + r.points + ' Punkte</small><div class="step"><span>' + (i + 1) + '</span></div></div>';
    }).join('') + '</div>';
  }
  // Die Cup-Deko dieser Woche (für das nächste oder heutige Rennen)
  function nextFriday() { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function cupPrize() {
    var dk = SI.DK[SI.cupDekoFor(nextFriday())];
    return '<div class="rprize"><div class="rpi"><img src="' + SI.art.dekoURL(dk) + '" alt=""><small>' + esc(dk.n) + '</small></div><div class="rpi"><img src="' + SI.art.boxURL('turnier') + '" alt=""><small>Turnier-Kiste</small></div><div class="rpi"><b>⚡×2</b><small>30 Minuten</small></div></div>' +
      '<p class="hint center">Die Cup-Deko gibt es <b>nur diese Woche</b> und nur für den Sieger-Club! In der Turnier-Kiste stecken <b>3 Überraschungen</b>: Schafe, Deko oder Münzen.</p>';
  }
  function editor() {
    var d = R.draft, h = '<div class="card redit"><h3>Euer Renn-Schaf</h3><div class="rprev">' + racer(d, 150, 'run') + '</div>';
    var colRow = function (k, title) { return '<h4>' + title + '</h4><div class="cpick cols">' + WOOL.map(function (c, i) { return '<button class="' + (d[k] === i ? 'on' : '') + '" style="background:' + c + '" data-act="rcSet:' + k + ':' + i + '" aria-label="' + title + ' ' + (i + 1) + '"></button>'; }).join('') + '</div>'; };
    h += colRow('col', '1. Farbe (Wolle)') + colRow('col2', '2. Farbe (Muster, Schopf und Decke)');
    h += '<h4>Muster</h4><div class="cpick rpats">' + PATS.map(function (n, i) { return '<button class="' + (d.pat === i ? 'on' : '') + '" data-act="rcSet:pat:' + i + '">' + racer({ col: d.col, col2: d.col2, pat: i, acc: 0 }, 50) + '<small>' + n + '</small></button>'; }).join('') + '</div>';
    h += '<h4>Accessoire</h4><div class="cpick rpats raccs">' + ACCS.map(function (a, i) { return '<button class="' + (d.acc === i ? 'on' : '') + '" data-act="rcSet:acc:' + i + '">' + racer({ col: d.col, col2: d.col2, pat: d.pat, acc: i }, 46, '', 1) + '<small>' + a[0] + '</small></button>'; }).join('') + '</div>';
    h += '<button class="btn blue wide" data-act="rcRandom">🎲 Zufällig</button>';
    h += '<div class="btns"><button class="btn ghost" data-act="rcCancel">Abbrechen</button><button class="btn go" data-act="rcSave"' + (R.busy ? ' disabled' : '') + '>Speichern</button></div></div>';
    return h;
  }
  U.views.rennen = function () {
    if (R.mode === 'edit') return { title: 'Renn-Schaf gestalten', html: editor() };
    var b = R.board, me = U.me(), fri = N.raceFriday(), h = '';
    h += '<div class="card rhead"><div class="rflag">🏁</div><div><h3>Schafrennen-Cup</h3><p class="hint">' + (fri ? '<b>Heute ist Renntag!</b> Das Rennen endet in <b class="num" id="raceT">' + G.fmtTime(untilEnd()) + '</b>' :
      'Jeden <b>Freitag</b> rennen die Clubs gegeneinander. Nächstes Rennen ' + (daysToFriday() === 1 ? '<b>morgen</b>' : 'in <b>' + daysToFriday() + ' Tagen</b>') + '.') + '</p></div></div>';
    if (!b) h += '<p class="hint center">Lädt …</p>';
    else if (b.err) h += '<p class="hint center">' + esc(b.err) + '</p>';
    else {
      if (fri) {
        h += b.rows.length ? lanes(b.rows, b.myclub) : '<p class="hint center">Noch hat kein Club Punkte. Leg los!</p>';
        h += b.myclub ? '<div class="myrank">Du hast heute <b class="num">' + b.mine + ' / ' + MAXP + '</b> Punkte für deinen Club geholt.</div>' : '';
      }
      if (!b.myclub) h += '<div class="card"><p class="hint">Du bist in keinem Club. Tritt einem Club bei oder gründe einen, dann rennst du am Freitag mit!</p><button class="btn purple" data-act="sheet:club">🛡️ Zu den Clubs</button></div>';
      h += '<div class="card"><h3>So bekommt dein Club Punkte</h3><p class="hint">Alles, was du am Freitag machst, bringt deinem Club-Schaf Punkte (höchstens ' + MAXP + ' pro Spieler):</p><div class="rpts">' +
        PTS.map(function (x) { return '<span>' + x[2] + '<b class="num">+' + x[1] + '</b></span>'; }).join('') + '</div></div>';
      h += '<div class="card"><h3>Belohnungen</h3>' + cupPrize() + '<p class="hint">Nach dem Rennen bekommt <b>jedes Mitglied</b> vom Club:<br>🥇 <b>Platz 1:</b> 30 Min. doppeltes Geld, eine <b>Turnier-Kiste</b> und die <b>exklusive Cup-Deko</b> der Woche<br>🥈 <b>Platz 2:</b> 20 Min. doppeltes Geld und eine <b>Regenbogenkiste</b><br>🥉 <b>Platz 3:</b> 10 Min. doppeltes Geld und eine <b>Kristallkiste</b><br>🏃 <b>Alle anderen, die Punkte geholt haben:</b> 5 Min. doppeltes Geld</p></div>';
      h += '<div class="card"><h3>Sieger vom letzten Freitag</h3>' + podium(b.last) + '</div>';
      if (R.mine) {
        var owner = me && R.mine.owner && R.mine.owner.toLowerCase() === me.username.toLowerCase();
        h += '<div class="card rmine"><div class="rprev sm">' + racer(R.mine.racer, 110, 'run') + '</div><div><h3>Renn-Schaf von ' + esc(R.mine.name) + '</h3>' +
          (owner ? '<p class="hint">Du bist der Chef. Gestalte euer Schaf mit Farbe, Muster und Accessoire!</p><button class="btn purple" data-act="rcEdit">🎨 Schaf gestalten</button>' : '<p class="hint">Nur der Chef vom Club kann das Schaf gestalten.</p>') + '</div></div>';
      }
    }
    return { title: '🏁 Schafrennen', html: h };
  };

  /* ---------- Hinweis, Knopf und Belohnung ---------- */
  function notice() {
    var chip = $('#raceChip'); if (chip) chip.hidden = !N.raceFriday();
    if (!N.raceFriday() || G.S.raceSeen === G.today()) return;
    G.S.raceSeen = G.today(); SFX('trumpet');
    U.modal('<div class="modal race">' + racer({ col: 2, col2: 4, pat: 3, acc: 1 }, 150, 'run') + '<h2>🏁 Schafrennen-Freitag!</h2>' +
      '<p>Heute rennen alle Clubs gegeneinander. Alles, was du heute machst (Kisten öffnen, züchten, Duelle gewinnen, Aufgaben schaffen …), bringt eurem Renn-Schaf Punkte. Der beste Club gewinnt um Mitternacht!</p>' +
      (G.S.club ? '' : '<p class="hint">Du bist noch in keinem Club. Tritt schnell einem bei!</p>') +
      '<div class="btns"><button class="btn ghost" data-act="close">Später</button><button class="btn coin" data-act="closeOpen:rennen">Zur Rennbahn</button></div></div>');
  }
  var reward = null;
  function claim() {
    if (!tok()) return;
    N.race.claim(tok()).then(function (r) {
      if (!r || !r.place) return;
      reward = r; var p = r.place, md = p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏃';
      SFX(p <= 3 ? 'trumpet' : 'pop');
      U.modal('<div class="modal race"><div class="rbigm">' + md + '</div><h2>Schafrennen: Platz ' + p + '!</h2><p>Dein Club <b>' + esc(r.club) + '</b> ist letzten Freitag auf <b>Platz ' + p + '</b> gelandet.' + (r.points ? ' Du hast <b>' + r.points + ' Punkte</b> beigetragen.' : ' Als Mitglied bekommst du trotzdem die Belohnung!') + '</p>' +
        '<div class="btns"><button class="btn coin" data-act="raceReward">Belohnung abholen</button></div></div>');
    }).catch(function () { /* später nochmal */ });
  }
  // Kai: Sieger bekommen doppeltes Geld, eine Turnier-Kiste und die exklusive Cup-Deko der Woche
  function giveReward() {
    var r = reward; reward = null; if (!r) return;
    var bf = SI.quests && SI.quests.boxFor, p = r.place;
    var mins = p === 1 ? 30 : p === 2 ? 20 : p === 3 ? 10 : 5; // Kai: 1. 30 Min., 2. 20 Min., 3. 10 Min.
    G.addBoost(mins * 60); U.flash('#ffe066'); U.toast('⚡ ' + mins + ' Minuten doppeltes Geld!');
    if (p === 1) { var dk = SI.cupDekoFor(r.day); U.dekoReveal(G.addDeko(dk, false), 'm'); }
    if (p === 1) U.turnierReveal(G.openTurnier());
    else if (p === 2) U.sheepReveal(G.openBox('regen', true), ''); // Kai: Platz 2 Regenbogenkiste
    else if (p === 3) U.sheepReveal(G.openBox('kristall', true), ''); // Kai: Platz 3 Kristallkiste
    U.saveLocal(); U.saveCloud(); U.refresh();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    var parts = el.dataset.act.split(':'), a = parts[0], arg = parts[1];
    if (a === 'sheet' && arg === 'rennen') { R.mode = 'main'; R.board = null; loadBoard(); loadMine(); return; }
    if (a === 'closeOpen' && arg === 'rennen') { R.mode = 'main'; R.board = null; loadBoard(); loadMine(); return; }
    if (a === 'raceReward') { U.nextModal(); giveReward(); return; }
    if (a.slice(0, 2) !== 'rc' || G.visiting) return;
    switch (a) {
      case 'rcEdit': R.mode = 'edit'; R.draft = ok(R.mine && R.mine.racer); SFX('ui'); rerender(); break;
      case 'rcCancel': R.mode = 'main'; rerender(); break;
      case 'rcSet': R.draft[arg] = +parts[2]; SFX('ui'); rerender(); break;
      case 'rcRandom': R.draft = ok({ col: Math.random() * 16, col2: Math.random() * 16, pat: Math.random() * 8, acc: 1 + Math.random() * (ACCS.length - 1) }); SFX('ui'); rerender(); break;
      case 'rcSave':
        R.busy = true; rerender();
        N.club.racer(tok(), R.draft).then(function (m) { R.mine = m; R.mode = 'main'; SFX('star'); U.toast('Euer Renn-Schaf sieht super aus!'); loadBoard(); })
          .catch(function (e2) { SFX('cant'); U.toast(N.errText(e2)); }).then(function () { R.busy = false; rerender(); });
        break;
    }
  });
  // Rennbahn live halten
  setInterval(function () {
    var sh = U.sheet(); if (!sh || sh.name !== 'rennen' || R.mode !== 'main') return;
    var t = $('#raceT'); if (t) t.textContent = G.fmtTime(untilEnd());
  }, 1000);
  setInterval(function () { var sh = U.sheet(); if (sh && sh.name === 'rennen' && R.mode === 'main' && N.raceFriday()) loadBoard(); }, 15000);

  var prevEnter = U.onEnter;
  U.onEnter = function () {
    if (prevEnter) prevEnter();
    if (SI.club) SI.club.load();
    setTimeout(notice, 600); setTimeout(claim, 1500);
  };
  SI.race = { racer: racer, notice: notice, claim: claim, accs: ACCS };
})(window.SI);
