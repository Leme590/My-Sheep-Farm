/* Schaf-Imperium: Clubs mit eigenem Wappen */
(function (SI) {
  'use strict';
  var G = SI.G, A = SI.art, N = SI.net, U = SI.ui;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;
  var COST = 1000, MAX = 15;

  /* ---------- Wappen ---------- */
  var COLS = ['#e8463c', '#ff8a1c', '#ffd23f', '#7ed957', '#2fb36b', '#35c3d8', '#3f8fe8', '#2a3f9e', '#8a4fe0', '#e0358a', '#ff9cc0', '#ffffff', '#b0b8c4', '#5a6270', '#1c1c24', '#8a5228'];
  var SYMN = ['Schaf', 'Schwerter', 'Krone', 'Feuer', 'Stern', 'Mond', 'Blitz', 'Kleeblatt', 'Diamant', 'Wolf', 'Regenbogen', 'Schild', 'Löwe', 'Blume', 'Burg', 'Schneeflocke', 'Drache', 'Zielscheibe', 'Pizza', 'Taco', 'Rakete', 'Totenkopf', 'Musik', 'Herz'];
  // Eigene Wappen-Symbole in Schwarz-Weiß (Kai: keine Emojis). Mitte = 0,0, Größe etwa ±24.
  var K = '#17171f', W = '#ffffff';
  function blob(cs) { // runde Teile mit einem Umriss drumherum
    var a = cs.map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + 3.4) + '" fill="' + K + '"/>'; }).join('');
    return a + cs.map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + W + '"/>'; }).join('');
  }
  function star(n, r1, r2, rot) { var p = []; for (var i = 0; i < n * 2; i++) { var a = (rot || -90) * Math.PI / 180 + i * Math.PI / n, r = i % 2 ? r2 : r1; p.push((Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1)); } return p.join(' '); }
  var WS = ' fill="' + W + '" stroke="' + K + '" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"';
  var KF = ' fill="' + K + '"';
  function sword(rot) {
    return '<g transform="rotate(' + rot + ')"><path d="M-3.5 10V-20L0 -26L3.5 -20V10Z"' + WS + '/><rect x="-10" y="8" width="20" height="5" rx="2"' + WS + '/><rect x="-2.6" y="13" width="5.2" height="10" rx="2"' + KF + '/><circle cx="0" cy="25" r="3.2"' + KF + '/></g>';
  }
  function flake() {
    var arm = function (r) { return '<g transform="rotate(' + r + ')"><path d="M0 -23V23M0 -15L-7 -21M0 -15L7 -21M0 15L-7 21M0 15L7 21"/></g>'; };
    var arms = [0, 60, 120].map(arm).join('');
    return '<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="' + K + '" stroke-width="9">' + arms + '</g><g stroke="' + W + '" stroke-width="4">' + arms + '</g></g><circle r="5"' + WS + '/>';
  }
  var SYMG = [
    // 0 Schaf
    blob([[-6, -6, 9], [6, -8, 9], [14, 0, 8], [6, 8, 9], [-6, 8, 9], [-12, 0, 8], [0, 0, 9]]) +
      '<rect x="-8" y="13" width="5" height="11" rx="2"' + KF + '/><rect x="5" y="13" width="5" height="11" rx="2"' + KF + '/>' +
      '<ellipse cx="-19" cy="-2" rx="8" ry="9.5"' + KF + ' stroke="' + W + '" stroke-width="2"/><circle cx="-21" cy="-4" r="2.4" fill="' + W + '"/><path d="M-26 -8 L-30 -12 L-24 -11Z" ' + KF + '/>',
    // 1 Schwerter
    sword(-40) + sword(40),
    // 2 Krone
    '<path d="M-23 12L-24 -12L-12 0L0 -19L12 0L24 -12L23 12Z"' + WS + '/><rect x="-23" y="10" width="46" height="10" rx="3"' + WS + '/>' +
      '<circle cx="-12" cy="15" r="2.6"' + KF + '/><circle cx="0" cy="15" r="2.6"' + KF + '/><circle cx="12" cy="15" r="2.6"' + KF + '/><circle cx="0" cy="-19" r="3.5"' + KF + '/><circle cx="-24" cy="-12" r="3"' + KF + '/><circle cx="24" cy="-12" r="3"' + KF + '/>',
    // 3 Feuer
    '<path d="M0 -25C9 -13 21 -6 19 8C17 20 8 25 0 25C-8 25 -17 20 -19 8C-21 -3 -12 -7 -8 -15C-6 -7 -3 -5 -1 -3C2 -11 -2 -19 0 -25Z"' + WS + '/>' +
      '<path d="M0 -2C5 4 10 8 9 14C8 19 4 21 0 21C-4 21 -8 19 -9 14C-10 9 -5 6 -3 2C-2 6 0 7 1 7C2 4 0 1 0 -2Z"' + KF + '/>',
    // 4 Stern
    '<polygon points="' + star(5, 25, 11) + '"' + WS + '/><polygon points="' + star(5, 9, 4) + '"' + KF + '/>',
    // 5 Mond
    '<path d="M7 -22A23 23 0 1 0 7 22A17.5 17.5 0 1 1 7 -22Z"' + WS + '/><polygon transform="translate(15 -10)" points="' + star(4, 7, 2.2) + '"' + KF + '/><polygon transform="translate(19 8)" points="' + star(4, 4.5, 1.5) + '"' + KF + '/>',
    // 6 Blitz
    '<path d="M-3 -25H14L5 -5H15L-9 25L-3 3H-13Z"' + WS + '/>',
    // 7 Kleeblatt
    '<path d="M2 4Q8 16 16 24" fill="none" stroke="' + K + '" stroke-width="8" stroke-linecap="round"/><path d="M2 4Q8 16 16 24" fill="none" stroke="' + W + '" stroke-width="3" stroke-linecap="round"/>' +
      [0, 90, 180, 270].map(function (r) { return '<path transform="rotate(' + (r + 45) + ')" d="M0 0C-13 -5 -14 -20 -6 -21C-2 -21 0 -18 0 -16C0 -18 2 -21 6 -21C14 -20 13 -5 0 0Z"' + WS + '/>'; }).join('') +
      '<circle r="3"' + KF + '/>',
    // 8 Diamant
    '<path d="M-22 -7L-11 -19H11L22 -7L0 22Z"' + WS + '/><path d="M-22 -7H22M-11 -19L-6 -7L0 22L6 -7L11 -19M-6 -7L0 -19L6 -7" fill="none" stroke="' + K + '" stroke-width="2.4" stroke-linejoin="round"/>',
    // 9 Wolf
    '<path d="M-20 -23L-8 -10H8L20 -23L21 1L11 14L0 23L-11 14L-21 1Z"' + WS + '/><path d="M-15 -15L-9 -10M15 -15L9 -10" stroke="' + K + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M-12 -1L-5 1L-11 4Z M12 -1L5 1L11 4Z"' + KF + '/><path d="M-5 11H5L0 17Z"' + KF + '/><path d="M0 17V21" stroke="' + K + '" stroke-width="2.4"/>',
    // 10 Regenbogen
    '<path d="M-20 12A20 20 0 0 1 20 12" fill="none" stroke="' + K + '" stroke-width="20"/><path d="M-20 12A20 20 0 0 1 20 12" fill="none" stroke="' + W + '" stroke-width="13"/><path d="M-20 12A20 20 0 0 1 20 12" fill="none" stroke="' + K + '" stroke-width="3"/>' +
      blob([[-22, 14, 6], [-15, 17, 5], [-27, 18, 4.5]]) + blob([[22, 14, 6], [15, 17, 5], [27, 18, 4.5]]),
    // 11 Schild
    '<path d="M0 -24L19 -17V0C19 12 9 20 0 25C-9 20 -19 12 -19 0V-17Z"' + WS + '/><path d="M0 -15V17M-11 -2H11" stroke="' + K + '" stroke-width="6" stroke-linecap="round"/>',
    // 12 Löwe
    '<polygon points="' + star(12, 25, 18, -90) + '"' + WS + '/><circle r="13"' + WS + '/><circle cx="-5" cy="-3" r="2.2"' + KF + '/><circle cx="5" cy="-3" r="2.2"' + KF + '/>' +
      '<path d="M-4 3H4L0 7Z"' + KF + '/><path d="M0 7Q-3 11 -6 9M0 7Q3 11 6 9" fill="none" stroke="' + K + '" stroke-width="2" stroke-linecap="round"/>',
    // 13 Blume
    (function () { var s = ''; for (var i = 0; i < 10; i++) s += '<ellipse cx="0" cy="-16" rx="5.5" ry="9" transform="rotate(' + i * 36 + ')"' + WS + '/>'; return s; })() +
      '<circle r="10"' + KF + ' stroke="' + W + '" stroke-width="2"/><circle cx="-3" cy="-3" r="1.4" fill="' + W + '"/><circle cx="3" cy="2" r="1.4" fill="' + W + '"/><circle cx="-2" cy="4" r="1.2" fill="' + W + '"/><circle cx="4" cy="-4" r="1.2" fill="' + W + '"/>',
    // 14 Burg
    '<path d="M-22 23V-18H-15V-12H-8V-18H-1V-12H1V-18H8V-12H15V-18H22V23Z"' + WS + '/><path d="M-7 23V8A7 7 0 0 1 7 8V23Z"' + KF + '/><rect x="-16" y="-4" width="5" height="8" rx="2"' + KF + '/><rect x="11" y="-4" width="5" height="8" rx="2"' + KF + '/>',
    // 15 Schneeflocke
    flake(),
    // 16 Drache
    '<path d="M-22 14L-10 -2L-14 -22L-2 -10L6 -18L6 -8L22 -2L18 6H4L12 16L-2 12L-12 22Z"' + WS + '/><circle cx="4" cy="-3" r="2.6"' + KF + '/><path d="M14 2H20" stroke="' + K + '" stroke-width="2.4" stroke-linecap="round"/><path d="M-12 8L-4 4M-8 14L0 10" stroke="' + K + '" stroke-width="2.2" stroke-linecap="round"/>',
    // 17 Zielscheibe
    '<circle r="24"' + WS + '/><circle r="16"' + KF + '/><circle r="10" fill="' + W + '"/><circle r="4.5"' + KF + '/>',
    // 18 Pizza
    '<path d="M0 24L-19 -14Q0 -23 19 -14Z"' + WS + '/><path d="M-19 -14Q0 -23 19 -14L16 -8Q0 -16 -16 -8Z"' + KF + '/><circle cx="-5" cy="-2" r="3.6"' + KF + '/><circle cx="6" cy="1" r="3.2"' + KF + '/><circle cx="0" cy="11" r="3"' + KF + '/>',
    // 19 Taco
    '<path d="M-24 10A24 22 0 0 1 24 10Z"' + WS + '/><path d="M-19 -1Q-14 -7 -9 -2Q-4 -9 1 -3Q6 -10 10 -3Q15 -8 19 -1" fill="none" stroke="' + K + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-8" cy="4" r="2"' + KF + '/><circle cx="4" cy="5" r="2"' + KF + '/><circle cx="13" cy="4" r="1.6"' + KF + '/>',
    // 20 Rakete
    '<path d="M-7 10L-16 20V8L-8 0Z M7 10L16 20V8L8 0Z"' + WS + '/><path d="M0 -25C11 -14 11 4 8 12H-8C-11 4 -11 -14 0 -25Z"' + WS + '/><circle cy="-6" r="4.6"' + KF + '/><path d="M-5 14L0 25L5 14Z"' + KF + '/>',
    // 21 Totenkopf
    '<path d="M-17 0A17 17 0 1 1 17 0V8L9 11V19H-9V11L-17 8Z"' + WS + '/><circle cx="-7" cy="0" r="5"' + KF + '/><circle cx="7" cy="0" r="5"' + KF + '/><path d="M0 6L-3 11H3Z"' + KF + '/><path d="M-4 13V19M0 13V19M4 13V19" stroke="' + K + '" stroke-width="2"/>',
    // 22 Musiknote
    '<path d="M-8 -16L14 -22V12" fill="none" stroke="' + K + '" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="M-8 -16L14 -22V12" fill="none" stroke="' + W + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<path d="M-8 -16V18" stroke="' + K + '" stroke-width="8" stroke-linecap="round"/><path d="M-8 -16V18" stroke="' + W + '" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="-14" cy="18" rx="8" ry="6" transform="rotate(-20 -14 18)"' + WS + '/><ellipse cx="8" cy="12" rx="8" ry="6" transform="rotate(-20 8 12)"' + WS + '/>',
    // 23 Herz
    '<path d="M0 23C-30 3 -19 -25 0 -10C19 -25 30 3 0 23Z"' + WS + '/><path d="M-12 -8Q-14 -2 -10 3" fill="none" stroke="' + K + '" stroke-width="2.4" stroke-linecap="round"/>'
  ];
  function symSVG(i, x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + SYMG[i] + '</g>'; }
  var SHAPES = [
    ['Schild', 'M10 8H90V50C90 80 70 98 50 106C30 98 10 80 10 50Z'],
    ['Kreis', 'M50 9A46 46 0 1 1 49.9 9Z'],
    ['Raute', 'M50 4L96 55L50 106L4 55Z'],
    ['Banner', 'M12 4H88V102L50 84L12 102Z'],
    ['Sechseck', 'M50 4L94 29V81L50 106L6 81V29Z'],
    ['Viereck', 'M26 8H74Q92 8 92 26V84Q92 102 74 102H26Q8 102 8 84V26Q8 8 26 8Z']
  ];
  function ok(c) { c = c || {}; var f = function (v, mx) { v = v | 0; return Math.max(0, Math.min(mx, v)); }; return { sh: f(c.sh, 5), bg: f(c.bg, 15), fg: f(c.fg, 15), sy: f(c.sy, 23) }; }
  function crest(c, size, cls) {
    c = ok(c); var d = SHAPES[c.sh][1], bg = COLS[c.bg], fg = COLS[c.fg];
    return '<svg class="crest ' + (cls || '') + '" viewBox="-8 -8 116 126" width="' + size + '" height="' + Math.round(size * 1.086) + '" aria-hidden="true">' +
      '<path d="' + d + '" transform="translate(0 5)" fill="rgba(0,0,0,.28)" stroke="rgba(0,0,0,.28)" stroke-width="14" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="' + bg + '" stroke="#2a1d14" stroke-width="15" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="' + bg + '" stroke="' + fg + '" stroke-width="8" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="url(#crestShade)"/>' +
      '<path d="' + d + '" fill="none" stroke="#2a1d14" stroke-width="1.6" stroke-opacity=".55" transform="translate(50 55) scale(.92) translate(-50 -55)"/>' +
      '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="2" stroke-opacity=".55" stroke-dasharray="2 5" stroke-linecap="round" transform="translate(50 55) scale(.8) translate(-50 -55)"/>' +
      symSVG(c.sy, 50, 56, 1.12) +
      '<path d="' + d + '" fill="url(#crestShine)" opacity=".45" transform="translate(50 30) scale(.86 .5) translate(-50 -30)"/>' +
      '<path d="M22 22l2.4 5.6 5.6 2.4-5.6 2.4L22 38l-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#fff" opacity=".85"/></svg>';
  }
  // Glanz für alle Wappen (einmal ins Dokument)
  (function () {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
    s.innerHTML = '<defs><linearGradient id="crestShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="crestShade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient></defs>';
    document.body.appendChild(s);
  })();

  /* ---------- Zustand ---------- */
  var C = { mine: undefined, list: null, search: '', err: '', mode: 'main', draft: null, busy: false, peek: null };
  function tok() { var m = U.me(); return m && m.token; }
  function err(e) { SFX('cant'); U.toast(N.errText(e)); }
  function rerender() { var sh = U.sheet(); if (sh && sh.name === 'club') U.renderSheet(); }
  function load() {
    if (!tok()) return;
    N.club.mine(tok()).then(function (m) { C.mine = m || null; G.S.club = m ? { id: m.id, name: m.name, crest: m.crest } : null; }).catch(function (e) { C.err = N.errText(e); }).then(rerender);
    loadList();
  }
  function loadList() { N.club.list(tok(), C.search).then(function (r) { C.list = r; }).catch(function (e) { C.err = N.errText(e); }).then(rerender); }

  /* ---------- Menü ---------- */
  function editor(title) {
    var d = C.draft, c = ok(d.crest), h = '';
    h += '<div class="card cedit"><h3>' + title + '</h3><div class="cprev">' + crest(c, 110, 'big') + '<div class="cpn">' + esc(d.name || 'Dein Club') + '</div></div>';
    if (C.mode === 'create') h += '<label class="field">Name vom Club (3 bis 20 Zeichen)<input data-club="name" maxlength="20" autocomplete="off" value="' + esc(d.name) + '" placeholder="z. B. Wollige Wikinger"></label>';
    h += '<h4>Form</h4><div class="cpick shapes">' + SHAPES.map(function (s, i) { return '<button class="' + (c.sh === i ? 'on' : '') + '" data-act="clSet:sh:' + i + '" aria-label="' + s[0] + '">' + crest({ sh: i, bg: c.bg, fg: c.fg, sy: c.sy }, 40) + '</button>'; }).join('') + '</div>';
    h += '<h4>Symbol</h4><div class="cpick syms">' + SYMG.map(function (s, i) { return '<button class="' + (c.sy === i ? 'on' : '') + '" style="background:' + COLS[c.bg] + '" data-act="clSet:sy:' + i + '" aria-label="' + SYMN[i] + '"><svg viewBox="-30 -30 60 60" width="34" height="34">' + s + '</svg></button>'; }).join('') + '</div>';
    h += '<h4>Farbe</h4><div class="cpick cols">' + COLS.map(function (col, i) { return '<button class="' + (c.bg === i ? 'on' : '') + '" style="background:' + col + '" data-act="clSet:bg:' + i + '" aria-label="Farbe ' + (i + 1) + '"></button>'; }).join('') + '</div>';
    h += '<h4>Rand</h4><div class="cpick cols">' + COLS.map(function (col, i) { return '<button class="' + (c.fg === i ? 'on' : '') + '" style="background:' + col + '" data-act="clSet:fg:' + i + '" aria-label="Rand ' + (i + 1) + '"></button>'; }).join('') + '</div>';
    h += '<button class="btn ghost" data-act="clRandom">🎲 Zufällig</button>';
    h += '<div class="btns"><button class="btn ghost" data-act="clCancel">Abbrechen</button>' +
      (C.mode === 'create' ? '<button class="btn coin" data-act="clCreate" data-cost="' + COST + '"' + (C.busy ? ' disabled' : '') + '>Gründen · <span class="num">' + fmt(COST) + '</span></button>'
        : '<button class="btn go" data-act="clSaveCrest"' + (C.busy ? ' disabled' : '') + '>Speichern</button>') + '</div></div>';
    return h;
  }
  function avatar(name) { var pool = SI.TYPES.filter(function (t) { return t.r !== 's' && !t.ev; }); return A.sheepURL(pool[A.hash(String(name).toLowerCase()) % pool.length]); }
  function memberRows(m, me) {
    var list = m.members.slice().sort(function (a, b) { return (b.owner ? 1 : 0) - (a.owner ? 1 : 0) || b.income - a.income; });
    return '<div class="cmem">' + list.map(function (x, i) {
      var isMe = me && x.username.toLowerCase() === me.username.toLowerCase();
      return '<div class="cm' + (isMe ? ' me' : '') + (x.owner ? ' boss' : '') + '"><span class="cmr num">' + (i + 1) + '</span><span class="cav"><img src="' + avatar(x.username) + '" alt="">' + (x.owner ? '<i>👑</i>' : '') + '</span>' +
        '<div class="t"><b>' + esc(x.username) + (isMe ? ' <small>(du)</small>' : '') + '</b><small class="num">' + (x.owner ? '<em>Chef</em> · ' : '') + '💰 ' + fmt(x.income) + '/Sek. · ⚔️ ' + x.wins + '</small></div>' +
        (isMe || x.username === N.BOT && N.online ? '' : '<button class="btn blue sm" data-act="visit:' + esc(x.username) + '" aria-label="Farm besuchen">🏡</button>') + '</div>';
    }).join('') + '</div>';
  }
  function sum(m) { var s = 0, w = 0; m.members.forEach(function (x) { s += x.income; w += x.wins; }); return { inc: s, wins: w }; }
  U.views.club = function () {
    var me = U.me(), h = '';
    if (C.mode === 'create') return { title: 'Club gründen', html: editor('Dein Wappen') };
    if (C.mode === 'crest') return { title: 'Wappen ändern', html: editor('Wappen ändern') };
    if (C.mine === undefined) return { title: 'Clubs', html: '<p class="hint center">Lädt …</p>' };
    if (C.mine) {
      var m = C.mine, t = sum(m), owner = me && m.owner && m.owner.toLowerCase() === me.username.toLowerCase(), cc = ok(m.crest);
      h += '<div class="chero" style="--cb:' + COLS[cc.bg] + ';--cf:' + COLS[cc.fg] + '"><div class="chrays"></div>' + crest(m.crest, 118, 'big') +
        '<div class="chname"><small>Dein Club</small><b>' + esc(m.name) + '</b></div>' +
        '<div class="cstats num"><div><i>👥</i><b>' + m.members.length + '<small>/' + MAX + '</small></b><span>Mitglieder</span></div><div><i>💰</i><b>' + fmt(t.inc) + '</b><span>pro Sek.</span></div><div><i>⚔️</i><b>' + t.wins + '</b><span>Duell-Siege</span></div></div>' +
        '<div class="cfill"><i style="width:' + (m.members.length / MAX * 100) + '%"></i></div></div>';
      h += '<div class="cacts">' + (owner ? '<button class="btn purple" data-act="clEditCrest">🎨 Wappen ändern</button>' : '') +
        '<button class="btn racebtn" data-act="sheet:rennen">🏁 Schafrennen' + (SI.net.raceFriday() ? ' · HEUTE!' : '') + '</button></div>';
      h += '<div class="card"><h3>Mitglieder</h3>' + memberRows(m, me) + '</div>';
      h += '<p class="hint center">In der Bestenliste (🏆) gibt es eine Rangliste für Clubs. Da wird das Geld pro Sekunde von allen Mitgliedern zusammengezählt.</p>';
      h += '<button class="btn ghost wide cleave" data-act="clLeaveAsk">Club verlassen</button>';
      return { title: 'Clubs', html: h };
    }
    h += '<div class="card cnew"><div class="cnewc">' + crest({ sh: 0, bg: 8, fg: 2, sy: 0 }, 70) + crest({ sh: 4, bg: 0, fg: 11, sy: 2 }, 56, 'b2') + crest({ sh: 1, bg: 6, fg: 2, sy: 4 }, 56, 'b3') + '</div><div><h3>Eigenen Club gründen</h3><p class="hint">Denk dir einen Namen aus und gestalte dein eigenes Wappen. Bis zu ' + MAX + ' Spieler können mitmachen.</p>' +
      '<button class="btn coin" data-act="clNew" data-cost="' + COST + '">Club gründen · <span class="num">' + fmt(COST) + '</span></button></div></div>';
    h += '<div class="card"><h3>Club beitreten</h3><div class="durow"><input data-club="search" placeholder="Club suchen" autocomplete="off" value="' + esc(C.search) + '"><button class="btn blue" data-act="clSearch">Suchen</button></div>';
    if (C.err) h += '<p class="hint">' + esc(C.err) + '</p>';
    if (!C.list) h += '<p class="hint center">Lädt …</p>';
    else if (!C.list.length) h += '<p class="hint center">' + (C.search ? 'Keinen Club gefunden.' : 'Es gibt noch keine Clubs. Gründe den ersten!') + '</p>';
    else h += '<div class="list clist">' + C.list.map(function (c) {
      var full = c.members >= MAX;
      return '<div class="li crow"><button class="cbtn" data-act="clPeek:' + c.id + '" aria-label="Ansehen">' + crest(c.crest, 50) + '</button><div class="t"><b>' + esc(c.name) + '</b><small class="num">👥 ' + c.members + ' / ' + MAX + ' · 💰 ' + fmt(c.income) + '/Sek.</small><div class="cfill sm"><i style="width:' + (c.members / MAX * 100) + '%"></i></div></div>' +
        '<button class="btn ' + (full ? 'ghost' : 'go') + ' sm" data-act="clJoin:' + c.id + '"' + (full || C.busy ? ' disabled' : '') + '>' + (full ? 'Voll' : 'Beitreten') + '</button></div>';
    }).join('') + '</div><p class="hint center">Tipp: Tippe auf ein Wappen, um die Mitglieder zu sehen.</p>';
    h += '</div>';
    return { title: 'Clubs', html: h };
  };

  /* ---------- Aktionen ---------- */
  function newDraft() { return { name: '', crest: { sh: 0, bg: Math.floor(Math.random() * 11), fg: 2, sy: 0 } }; }
  document.addEventListener('input', function (e) {
    var k = e.target.dataset && e.target.dataset.club; if (!k) return;
    if (k === 'name' && C.draft) { C.draft.name = e.target.value; var pn = $('.cpn'); if (pn) pn.textContent = e.target.value || 'Dein Club'; }
    if (k === 'search') C.search = e.target.value;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.club === 'search') { C.list = null; rerender(); loadList(); } });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    var parts = el.dataset.act.split(':'), a = parts[0], arg = parts[1];
    if (a === 'sheet' && arg === 'club') { C.mode = 'main'; C.err = ''; load(); return; }
    if (a.slice(0, 2) !== 'cl' || G.visiting) return;
    switch (a) {
      case 'clNew':
        if (G.S.coins < COST) { SFX('cant'); U.toast('Dir fehlen noch ' + fmt(COST - G.S.coins) + ' Münzen.'); break; }
        C.mode = 'create'; C.draft = newDraft(); SFX('ui'); rerender(); break;
      case 'clEditCrest': C.mode = 'crest'; C.draft = { name: C.mine.name, crest: ok(C.mine.crest) }; SFX('ui'); rerender(); break;
      case 'clCancel': C.mode = 'main'; rerender(); break;
      case 'clSet': C.draft.crest[arg] = +parts[2]; SFX('ui'); rerender(); break;
      case 'clRandom': C.draft.crest = { sh: rnd(6), bg: rnd(16), fg: rnd(16), sy: rnd(24) }; SFX('pop'); rerender(); break;
      case 'clCreate':
        if (G.S.coins < COST) { SFX('cant'); U.toast('Dir fehlen noch ' + fmt(COST - G.S.coins) + ' Münzen.'); break; }
        C.busy = true; rerender();
        N.club.create(tok(), C.draft.name, C.draft.crest).then(function (m) {
          G.S.coins -= COST; C.mine = m; C.mode = 'main'; G.S.club = { id: m.id, name: m.name, crest: m.crest };
          SFX('trumpet'); U.flash('#ffe066'); U.toast('🛡️ Dein Club „' + m.name + '“ ist gegründet!'); U.saveLocal(); U.saveCloud(); U.refresh();
        }).catch(err).then(function () { C.busy = false; rerender(); });
        break;
      case 'clSaveCrest':
        C.busy = true; rerender();
        N.club.crest(tok(), C.draft.crest).then(function (m) { C.mine = m; C.mode = 'main'; SFX('star'); U.toast('Neues Wappen gespeichert!'); }).catch(err).then(function () { C.busy = false; rerender(); });
        break;
      case 'clSearch': C.list = null; rerender(); loadList(); break;
      case 'clJoin': join(arg); break;
      case 'clPeek':
        N.club.info(tok(), arg).then(function (m) {
          var t = sum(m), full = m.members.length >= MAX;
          U.modal('<div class="modal cpeek">' + crest(m.crest, 90, 'big') + '<h2>' + esc(m.name) + '</h2><p class="num">👥 ' + m.members.length + ' / ' + MAX + ' Mitglieder · 💰 ' + fmt(t.inc) + '/Sek.</p>' + memberRows(m, U.me()) +
            '<div class="btns"><button class="btn ghost" data-act="close">Schließen</button>' + (C.mine || full ? '' : '<button class="btn go" data-act="clJoinPeek:' + m.id + '">Beitreten</button>') + '</div></div>');
        }).catch(err);
        break;
      case 'clJoinPeek': U.nextModal(); join(arg); break;
      case 'clLeaveAsk':
        var last = C.mine && C.mine.members.length <= 1;
        U.modal('<div class="modal"><h2>Club verlassen?</h2><p>' + (last ? 'Du bist das letzte Mitglied. Wenn du gehst, wird der Club <b>gelöscht</b>.' : 'Du kannst jederzeit wieder einem Club beitreten.') + '</p>' +
          '<div class="btns"><button class="btn ghost" data-act="close">Bleiben</button><button class="btn red" data-act="clLeave">Verlassen</button></div></div>');
        break;
      case 'clLeave':
        U.nextModal();
        N.club.leave(tok()).then(function () { var nm = C.mine && C.mine.name; C.mine = null; G.S.club = null; SFX('close'); U.toast('Du hast den Club' + (nm ? ' „' + nm + '“' : '') + ' verlassen.'); U.saveLocal(); loadList(); })
          .catch(err).then(rerender);
        break;
    }
  });
  function join(id) {
    C.busy = true; rerender();
    N.club.join(tok(), id).then(function (m) { C.mine = m; G.S.club = { id: m.id, name: m.name, crest: m.crest }; SFX('trumpet'); U.toast('Willkommen im Club „' + m.name + '“!'); U.saveLocal(); })
      .catch(function (e2) { err(e2); loadList(); }).then(function () { C.busy = false; rerender(); });
  }
  function rnd(n) { return Math.floor(Math.random() * n); }
  SI.club = { crest: crest, load: load };
})(window.SI);
