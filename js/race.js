/* Schaf-Imperium: Schafrennen-Cup der Clubs (jeden Freitag) */
(function (SI) {
  'use strict';
  var G = SI.G, N = SI.net, U = SI.ui;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;

  /* ---------- Renn-Schaf zeichnen ---------- */
  var WOOL = ['#ffffff', '#f4e3c3', '#ffd23f', '#ff9a3c', '#e8463c', '#ff9cc0', '#c9a2ff', '#8a4fe0', '#7fd3ff', '#3f8fe8', '#8be06a', '#2fb36b', '#b0b8c4', '#5a6270', '#2a2a35', '#a0662f'];
  var PATS = ['Keins', 'Punkte', 'Streifen', 'Sterne', 'Herzen', 'Flecken', 'Karo', 'Blitze'];
  var ACCS = [['', 'Nichts'], ['👑', 'Krone'], ['🎩', 'Zylinder'], ['🧢', 'Kappe'], ['🎓', 'Doktorhut'], ['⛑️', 'Helm'], ['🕶️', 'Sonnenbrille'], ['🎀', 'Schleife'],
    ['🌸', 'Blume'], ['🎧', 'Kopfhörer'], ['🔥', 'Feuer'], ['⭐', 'Stern'], ['🌈', 'Regenbogen'], ['🍕', 'Pizza'], ['🦄', 'Einhorn'], ['🏆', 'Pokal']];
  var BODY = [[40, 50, 20], [58, 40, 22], [78, 42, 21], [92, 55, 17], [62, 62, 20], [42, 64, 15], [80, 64, 17]];
  var pid = 0;
  function patDef(id, p, dark) {
    var ink = dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.2)';
    switch (p) {
      case 1: return '<pattern id="' + id + '" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="3.2" fill="' + ink + '"/></pattern>';
      case 2: return '<pattern id="' + id + '" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="12" height="5" fill="' + (dark ? 'rgba(255,255,255,.4)' : 'rgba(232,70,60,.45)') + '"/></pattern>';
      case 3: return '<pattern id="' + id + '" width="20" height="20" patternUnits="userSpaceOnUse"><text x="4" y="14" font-size="12" fill="#ffd23f" stroke="#7a5a00" stroke-width=".6">★</text></pattern>';
      case 4: return '<pattern id="' + id + '" width="20" height="18" patternUnits="userSpaceOnUse"><text x="4" y="13" font-size="11" fill="#e8336f">♥</text></pattern>';
      case 5: return '<pattern id="' + id + '" width="30" height="26" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="6" fill="' + (dark ? 'rgba(255,255,255,.5)' : 'rgba(40,30,30,.55)') + '"/><circle cx="23" cy="19" r="4.5" fill="' + (dark ? 'rgba(255,255,255,.5)' : 'rgba(40,30,30,.55)') + '"/></pattern>';
      case 6: return '<pattern id="' + id + '" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="' + ink + '"/><rect x="8" y="8" width="8" height="8" fill="' + ink + '"/></pattern>';
      case 7: return '<pattern id="' + id + '" width="20" height="20" patternUnits="userSpaceOnUse"><text x="3" y="15" font-size="12">⚡</text></pattern>';
    }
    return '';
  }
  function ok(r) { r = r || {}; var f = function (v, mx) { v = v | 0; return Math.max(0, Math.min(mx, v)); }; return { col: f(r.col, 15), pat: f(r.pat, 7), acc: f(r.acc, 15) }; }
  function racer(r, w, cls) {
    r = ok(r); var id = 'rp' + (++pid), col = WOOL[r.col], dark = r.col >= 13 || r.col === 7 || r.col === 9;
    var circ = function (fill, grow, stroke) { return BODY.map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + grow) + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '"' : '') + '/>'; }).join(''); };
    var acc = ACCS[r.acc][0], glasses = r.acc === 6;
    var h = '<svg class="racer ' + (cls || '') + '" viewBox="0 0 132 100" width="' + w + '" height="' + Math.round(w * 100 / 132) + '" aria-hidden="true">' +
      (r.pat ? '<defs>' + patDef(id, r.pat, dark) + '</defs>' : '') +
      '<g class="legs"><rect class="lg a" x="36" y="60" width="9" height="26" rx="4" fill="#3b2c2a"/><rect class="lg b" x="52" y="62" width="9" height="24" rx="4" fill="#3b2c2a"/>' +
      '<rect class="lg b" x="74" y="62" width="9" height="24" rx="4" fill="#3b2c2a"/><rect class="lg a" x="88" y="60" width="9" height="26" rx="4" fill="#3b2c2a"/></g>' +
      '<g class="bd"><circle cx="22" cy="46" r="10" fill="#3d2a1c"/><circle cx="22" cy="46" r="7.5" fill="' + col + '"/>' +
      circ('#3d2a1c', 3.5) + circ(col, 0) + (r.pat ? circ('url(#' + id + ')', 0) : '') +
      circ('rgba(255,255,255,.18)', -9) +
      '<ellipse cx="96" cy="33" rx="8" ry="4.5" fill="#3b2c2a" transform="rotate(-25 96 33)"/>' +
      '<ellipse cx="107" cy="47" rx="16" ry="17.5" fill="#3b2c2a" stroke="#1d1414" stroke-width="2.5"/>' +
      '<ellipse cx="106" cy="31" rx="11" ry="6" fill="' + col + '" stroke="#3d2a1c" stroke-width="2.5"/>' +
      (glasses ? '' : '<circle cx="111" cy="44" r="5" fill="#fff"/><circle cx="112.6" cy="44.5" r="2.4" fill="#111"/><circle cx="113.4" cy="43.5" r=".9" fill="#fff"/>') +
      '<circle cx="104" cy="54" r="3" fill="#ff8a95" opacity=".7"/><path d="M110 56q4 3 8 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      (acc ? (glasses ? '<text x="111" y="46" text-anchor="middle" dominant-baseline="central" font-size="20">' + acc + '</text>'
        : '<text x="106" y="20" text-anchor="middle" dominant-baseline="central" font-size="26">' + acc + '</text>') : '') +
      '</g></svg>';
    return h;
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
    h += '<h4>Farbe</h4><div class="cpick cols">' + WOOL.map(function (c, i) { return '<button class="' + (d.col === i ? 'on' : '') + '" style="background:' + c + '" data-act="rcSet:col:' + i + '" aria-label="Farbe ' + (i + 1) + '"></button>'; }).join('') + '</div>';
    h += '<h4>Muster</h4><div class="cpick rpats">' + PATS.map(function (n, i) { return '<button class="' + (d.pat === i ? 'on' : '') + '" data-act="rcSet:pat:' + i + '">' + racer({ col: d.col, pat: i, acc: 0 }, 44) + '<small>' + n + '</small></button>'; }).join('') + '</div>';
    h += '<h4>Accessoire</h4><div class="cpick syms">' + ACCS.map(function (a, i) { return '<button class="' + (d.acc === i ? 'on' : '') + '" data-act="rcSet:acc:' + i + '" title="' + a[1] + '">' + (a[0] || '✖') + '</button>'; }).join('') + '</div>';
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
    U.modal('<div class="modal race">' + racer({ col: 2, pat: 3, acc: 1 }, 150, 'run') + '<h2>🏁 Schafrennen-Freitag!</h2>' +
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
      case 'rcEdit': R.mode = 'edit'; R.draft = ok(R.mine && R.mine.racer); SFX('pick'); rerender(); break;
      case 'rcCancel': R.mode = 'main'; rerender(); break;
      case 'rcSet': R.draft[arg] = +parts[2]; SFX('pick'); rerender(); break;
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
  SI.race = { racer: racer, notice: notice, claim: claim };
})(window.SI);
