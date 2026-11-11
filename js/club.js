/* Schaf-Imperium: Clubs mit eigenem Wappen */
(function (SI) {
  'use strict';
  var G = SI.G, A = SI.art, N = SI.net, U = SI.ui;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;
  var COST = 1000, MAX = 15;

  /* ---------- Wappen ---------- */
  var COLS = ['#e8463c', '#ff8a1c', '#ffd23f', '#7ed957', '#2fb36b', '#35c3d8', '#3f8fe8', '#2a3f9e', '#8a4fe0', '#e0358a', '#ff9cc0', '#ffffff', '#b0b8c4', '#5a6270', '#1c1c24', '#8a5228'];
  var SYMS = ['🐑', '⚔️', '👑', '🔥', '⭐', '🌙', '⚡', '🍀', '💎', '🐺', '🌈', '🛡️', '🦁', '🌻', '🏰', '❄️', '🐉', '🎯', '🍕', '🌮', '🚀', '💀', '🎵', '❤️'];
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
    c = ok(c); var d = SHAPES[c.sh][1];
    return '<svg class="crest ' + (cls || '') + '" viewBox="-6 -6 112 122" width="' + size + '" height="' + Math.round(size * 1.09) + '" aria-hidden="true">' +
      '<path d="' + d + '" fill="' + COLS[c.bg] + '" stroke="#3d2a1c" stroke-width="13" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="' + COLS[c.bg] + '" stroke="' + COLS[c.fg] + '" stroke-width="6" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="url(#crestShine)" opacity=".35"/>' +
      '<text x="50" y="58" text-anchor="middle" dominant-baseline="central" font-size="46">' + SYMS[c.sy] + '</text></svg>';
  }
  // Glanz für alle Wappen (einmal ins Dokument)
  (function () {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
    s.innerHTML = '<defs><linearGradient id="crestShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>';
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
    h += '<h4>Symbol</h4><div class="cpick syms">' + SYMS.map(function (s, i) { return '<button class="' + (c.sy === i ? 'on' : '') + '" data-act="clSet:sy:' + i + '">' + s + '</button>'; }).join('') + '</div>';
    h += '<h4>Farbe</h4><div class="cpick cols">' + COLS.map(function (col, i) { return '<button class="' + (c.bg === i ? 'on' : '') + '" style="background:' + col + '" data-act="clSet:bg:' + i + '" aria-label="Farbe ' + (i + 1) + '"></button>'; }).join('') + '</div>';
    h += '<h4>Rand</h4><div class="cpick cols">' + COLS.map(function (col, i) { return '<button class="' + (c.fg === i ? 'on' : '') + '" style="background:' + col + '" data-act="clSet:fg:' + i + '" aria-label="Rand ' + (i + 1) + '"></button>'; }).join('') + '</div>';
    h += '<button class="btn ghost" data-act="clRandom">🎲 Zufällig</button>';
    h += '<div class="btns"><button class="btn ghost" data-act="clCancel">Abbrechen</button>' +
      (C.mode === 'create' ? '<button class="btn coin" data-act="clCreate" data-cost="' + COST + '"' + (C.busy ? ' disabled' : '') + '>Gründen · <span class="num">' + fmt(COST) + '</span></button>'
        : '<button class="btn go" data-act="clSaveCrest"' + (C.busy ? ' disabled' : '') + '>Speichern</button>') + '</div></div>';
    return h;
  }
  function memberRows(m, me) {
    return '<div class="list cmem">' + m.members.map(function (x) {
      var isMe = me && x.username.toLowerCase() === me.username.toLowerCase();
      return '<div class="li' + (isMe ? ' me' : '') + '"><span class="cav">' + (x.owner ? '👑' : '🐑') + '</span><div class="t">' + esc(x.username) + (isMe ? ' <small>(du)</small>' : '') +
        '<small class="num">💰 ' + fmt(x.income) + '/Sek. · ⚔️ ' + x.wins + ' Siege' + (x.owner ? ' · Chef' : '') + '</small></div>' +
        (isMe || x.username === N.BOT && N.online ? '' : '<button class="btn blue sm" data-act="visit:' + esc(x.username) + '">🏡</button>') + '</div>';
    }).join('') + '</div>';
  }
  function sum(m) { var s = 0, w = 0; m.members.forEach(function (x) { s += x.income; w += x.wins; }); return { inc: s, wins: w }; }
  U.views.club = function () {
    var me = U.me(), h = '';
    if (C.mode === 'create') return { title: 'Club gründen', html: editor('Dein Wappen') };
    if (C.mode === 'crest') return { title: 'Wappen ändern', html: editor('Wappen ändern') };
    if (C.mine === undefined) return { title: 'Clubs', html: '<p class="hint center">Lädt …</p>' };
    if (C.mine) {
      var m = C.mine, t = sum(m), owner = me && m.owner && m.owner.toLowerCase() === me.username.toLowerCase();
      h += '<div class="card chead">' + crest(m.crest, 96, 'big') + '<div class="cht"><small>Dein Club</small><h2>' + esc(m.name) + '</h2>' +
        '<div class="stats num"><span>Mitglieder</span><b>' + m.members.length + ' / ' + MAX + '</b><span>Geld zusammen</span><b>' + fmt(t.inc) + '/Sek.</b><span>Duell-Siege zusammen</span><b>' + t.wins + '</b></div></div></div>';
      if (owner) h += '<button class="btn purple wide" data-act="clEditCrest">🎨 Wappen ändern</button>';
      h += '<div class="card"><h3>Mitglieder</h3>' + memberRows(m, me) + '</div>';
      h += '<p class="hint center">In der Bestenliste (🏆) gibt es eine Rangliste für Clubs. Da wird das Geld pro Sekunde von allen Mitgliedern zusammengezählt.</p>';
      h += '<button class="btn red wide" data-act="clLeaveAsk">Club verlassen</button>';
      return { title: 'Clubs', html: h };
    }
    h += '<div class="card cnew"><span class="cbig">🛡️</span><div><h3>Eigenen Club gründen</h3><p class="hint">Denk dir einen Namen aus und gestalte dein eigenes Wappen. Bis zu ' + MAX + ' Spieler können mitmachen.</p>' +
      '<button class="btn coin" data-act="clNew" data-cost="' + COST + '">Club gründen · <span class="num">' + fmt(COST) + '</span></button></div></div>';
    h += '<div class="card"><h3>Club beitreten</h3><div class="durow"><input data-club="search" placeholder="Club suchen" autocomplete="off" value="' + esc(C.search) + '"><button class="btn blue" data-act="clSearch">Suchen</button></div>';
    if (C.err) h += '<p class="hint">' + esc(C.err) + '</p>';
    if (!C.list) h += '<p class="hint center">Lädt …</p>';
    else if (!C.list.length) h += '<p class="hint center">' + (C.search ? 'Keinen Club gefunden.' : 'Es gibt noch keine Clubs. Gründe den ersten!') + '</p>';
    else h += '<div class="list clist">' + C.list.map(function (c) {
      var full = c.members >= MAX;
      return '<div class="li"><button class="cbtn" data-act="clPeek:' + c.id + '" aria-label="Ansehen">' + crest(c.crest, 46) + '</button><div class="t">' + esc(c.name) + '<small class="num">👥 ' + c.members + ' / ' + MAX + ' · 💰 ' + fmt(c.income) + '/Sek.</small></div>' +
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
        C.mode = 'create'; C.draft = newDraft(); SFX('pick'); rerender(); break;
      case 'clEditCrest': C.mode = 'crest'; C.draft = { name: C.mine.name, crest: ok(C.mine.crest) }; SFX('pick'); rerender(); break;
      case 'clCancel': C.mode = 'main'; rerender(); break;
      case 'clSet': C.draft.crest[arg] = +parts[2]; SFX('pick'); rerender(); break;
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
