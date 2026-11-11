/* Schaf-Imperium: Duelle gegen andere Spieler (Schere Stein Papier, Tic Tac Toe, Vier gewinnt) */
(function (SI) {
  'use strict';
  var G = SI.G, A = SI.art, N = SI.net, T = SI.T, U = SI.ui;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;
  var MODES = {
    rps: { n: 'Schere Stein Papier', ic: '✌️', d: 'Wer zuerst 3 Runden gewinnt' },
    ttt: { n: 'Tic Tac Toe', ic: '⭕', d: 'Drei in einer Reihe' },
    c4: { n: 'Vier gewinnt', ic: '🔴', d: 'Vier in einer Reihe' }
  };
  var RPS = [{ ic: '✌️', n: 'Schere' }, { ic: '✊', n: 'Stein' }, { ic: '✋', n: 'Papier' }];

  var D = {
    cur: null, at: 0,        // laufendes Duell (so wie der Server es zuletzt geschickt hat)
    final: null,             // fertiges Duell, das gerade auf dem Bildschirm steht
    shownId: null, built: '',
    invites: [], seenInv: {},
    nameIn: '', status: {}, statusAt: 0,
    draft: null, draftFor: null, sendT: null, sending: false,
    pollBusy: false, timer: null, cd: -1
  };
  function tok() { var m = U.me(); return m && m.token; }
  function favs() { if (!Array.isArray(G.S.favs)) G.S.favs = []; return G.S.favs; }
  function isFav(n) { n = String(n || '').toLowerCase(); return favs().some(function (x) { return x.toLowerCase() === n; }); }
  function err(e) { U.toast(N.errText(e)); }
  function parseAmt(v) {
    var m = String(v || '').trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*([kmbtKMBT]?)$/);
    if (!m) return NaN;
    return Math.floor(parseFloat(m[1]) * ({ '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[2].toLowerCase()]));
  }
  function sheepList(st) { return Object.keys((st && st.sheep) || {}).filter(function (t) { return T[t]; }).sort(function (a, b) { return T[b].inc - T[a].inc; }); }
  function stakeText(st) {
    var p = [];
    if (st && st.money > 0) p.push(fmt(st.money) + ' Münzen');
    sheepList(st).forEach(function (t) { p.push(st.sheep[t] + '× ' + T[t].n); });
    return p.length ? p.join(', ') : 'nichts';
  }
  function stakeHtml(st) {
    var h = '<div class="dustake">';
    h += '<div class="dumoney num"><img src="' + A.iconURL('coin') + '" alt="">' + fmt((st && st.money) || 0) + '</div>';
    var l = sheepList(st);
    h += l.length ? '<div class="dusheep">' + l.map(function (t) { return '<span class="dus"><img src="' + A.sheepURL(T[t]) + '" alt="' + esc(T[t].n) + '"><b class="num">' + st.sheep[t] + '×</b></span>'; }).join('') + '</div>' : '<p class="hint">keine Schafe</p>';
    return h + '</div>';
  }
  function left(v, key) { var x = v[key]; return x == null ? null : x - (Date.now() - D.at); }
  function mine(v, w) { return w === v.side; }

  /* ---------- Abfragen beim Server ---------- */
  function interval() { var sh = U.sheet(); return D.cur || D.final || (sh && sh.name === 'duell') ? 1000 : 4000; }
  function loop() { clearTimeout(D.timer); D.timer = setTimeout(loop, interval()); poll(); }
  function poll() {
    if (!tok() || D.pollBusy) return;
    D.pollBusy = true;
    N.duel.poll(tok()).then(function (r) {
      D.invites = r.invites || [];
      (r.results || []).forEach(settle);
      setCur(r.duel);
      showInvites();
      sheetSync();
    }).catch(function (e) { if ((e.message || '').indexOf('bad_token') >= 0) clearTimeout(D.timer); })
      .then(function () { D.pollBusy = false; });
  }
  // Menü nur neu zeichnen, wenn sich etwas geändert hat (sonst verliert das Namensfeld beim Tippen den Fokus)
  var lastSig = '';
  function sheetSync(force) {
    var sh = U.sheet(); if (!sh || sh.name !== 'duell') { lastSig = ''; return; }
    var c = D.cur, sig = JSON.stringify([c && c.id, c && c.state, D.invites, D.status, favs()]);
    if (force || sig !== lastSig) { lastSig = sig; U.renderSheet(); }
  }
  function setCur(v) {
    var was = D.cur;
    D.cur = v || null; D.at = Date.now();
    if (v && v.state === 'play') escrow(v);
    if (v && (v.state === 'setup' || v.state === 'play')) {
      if (!was || was.id !== v.id || was.state === 'invite') { U.closeSheet(); SFX('trumpet'); }
      if (D.draftFor !== v.id) { D.avatar = mySheep(); D.draftFor = v.id; D.draft = JSON.parse(JSON.stringify(v.my_stake || { money: 0, sheep: {} })); }
      D.final = null; D.shownId = v.id;
      render();
    } else if (!D.final) hide();
  }
  // Wenn das Spiel startet, wird der Einsatz abgegeben (damit ihn niemand während des Spiels ausgibt)
  function escrow(v) {
    var S = G.S; S.duelEsc = S.duelEsc || {};
    if (S.duelEsc[v.id] || done(v.id)) return;
    S.duelEsc[v.id] = G.payStake(v.my_stake || {});
    U.saveLocal(); U.refresh();
  }
  function done(id) { return (G.S.duelDone || []).indexOf(id) >= 0; }
  function markDone(id) { var a = G.S.duelDone = (G.S.duelDone || []); a.push(id); if (a.length > 40) a.splice(0, a.length - 40); }

  /* ---------- Ergebnis verrechnen ---------- */
  var WHY = {
    declined: '{o} hat abgelehnt.', expired: '{o} hat nicht geantwortet.', left: 'Das Duell wurde abgebrochen.',
    cancelled: 'Die Einladung wurde zurückgezogen.', forfeit: '{o} hat aufgegeben.', timeout: '{o} hat zu lange gebraucht.',
    timeout_both: 'Keiner hat rechtzeitig gespielt.', draw: 'Unentschieden!', win: ''
  };
  function settle(v) {
    if (done(v.id)) { N.duel.ack(tok(), v.id).catch(function () {}); return; }
    var S = G.S, escd = (S.duelEsc || {})[v.id], info = { win: null, gain: null, lost: null, rescued: false };
    if (v.state === 'done') {
      if (v.winner === 2) { if (escd) G.getStake(escd); info.win = 'draw'; }
      else if (mine(v, v.winner)) {
        if (escd) G.getStake(escd);
        G.getStake(v.opp_stake); info.win = 'me'; info.gain = v.opp_stake;
        S.stats.duelWins = (S.stats.duelWins || 0) + 1;
      } else {
        info.lost = escd || G.payStake(v.my_stake || {});
        info.win = 'opp'; info.rescued = G.rescue();
      }
    } else if (escd) G.getStake(escd);
    if (S.duelEsc) delete S.duelEsc[v.id];
    markDone(v.id); U.saveLocal(); U.saveCloud(); U.refresh();
    N.duel.ack(tok(), v.id).catch(function () { /* beim nächsten Mal */ });
    var why = (WHY[v.reason] || '').replace('{o}', v.opp || '');
    if (v.reason === 'forfeit' && info.win === 'opp') why = 'Du hast aufgegeben.';
    if (v.reason === 'timeout' && info.win === 'opp') why = 'Du hast zu lange gebraucht.';
    info.why = why;
    if (D.shownId === v.id || (D.cur && D.cur.id === v.id)) {
      D.final = v; D.finalInfo = info; D.cur = null; D.shownId = v.id;
      if (info.win === 'me') { SFX('win'); U.flash('#ffe066'); } else if (info.win === 'opp') SFX('hit'); else SFX('pop');
      render();
    } else if (v.state === 'done') {
      U.modal('<div class="modal"><h2>' + (info.win === 'me' ? 'Duell gewonnen!' : info.win === 'opp' ? 'Duell verloren' : 'Unentschieden') + '</h2>' +
        '<p>Dein Duell gegen <b>' + esc(v.opp) + '</b> ist vorbei. ' + esc(why) + '</p>' + resultLines(info) +
        '<div class="btns"><button class="btn coin" data-act="close">Okay</button></div></div>');
    } else if (v.reason !== 'cancelled' || v.side === 1) {
      if (v.side === 0 || v.reason !== 'declined') U.toast(why || 'Das Duell ist vorbei.');
    }
  }
  function resultLines(info) {
    var h = '';
    if (info.win === 'me' && info.gain) h += '<p class="duwin">Du bekommst: <b>' + esc(stakeText(info.gain)) + '</b></p>';
    if (info.win === 'opp' && info.lost) h += '<p class="dulose">Du verlierst: <b>' + esc(stakeText(info.lost)) + '</b></p>';
    if (info.win === 'draw') h += '<p>Jeder behält seinen Einsatz.</p>';
    if (info.rescued) h += '<p class="hint">Du hattest kein Schaf mehr, deshalb schenken wir dir ein Wiesenschaf. So kannst du wieder neu anfangen!</p>';
    return h;
  }

  /* ---------- Einladungen ---------- */
  function showInvites() {
    if (D.cur && D.cur.state !== 'invite') return;
    D.invites.forEach(function (iv) {
      if (D.seenInv[iv.id]) return; D.seenInv[iv.id] = 1;
      SFX('trumpet');
      U.modal('<div class="modal duinv"><div class="duswords">⚔️</div><h2>Duell!</h2><p><b>' + esc(iv.from) + '</b> fordert dich zu einem Duell heraus!</p>' +
        '<p class="hint">Ihr sucht euch ein Spiel aus und setzt Geld und Schafe. Wer gewinnt, bekommt alles.</p>' +
        '<div class="btns"><button class="btn ghost" data-act="duNo:' + iv.id + '">Ablehnen</button><button class="btn" data-act="duYes:' + iv.id + '">Annehmen</button></div></div>');
    });
  }
  function answer(id, yes) {
    N.duel.answer(tok(), id, yes).then(function (v) { if (yes) setCur(v); else sheetSync(true); })
      .catch(err).then(poll);
  }
  function invite(name) {
    name = String(name || '').trim();
    if (!name) { U.toast('Schreib zuerst den Namen von einem Spieler.'); return; }
    N.duel.invite(tok(), name).then(function (v) { D.cur = v; D.at = Date.now(); SFX('trumpet'); U.toast('Einladung an ' + v.opp + ' geschickt!');
      var sh = U.sheet(); if (!sh || sh.name !== 'duell') U.openSheet('duell'); else sheetSync(true); })
      .catch(err);
  }
  function toggleFav(name) {
    name = String(name || '').trim(); if (!name) return;
    var f = favs(), i = -1;
    f.forEach(function (x, j) { if (x.toLowerCase() === name.toLowerCase()) i = j; });
    if (i >= 0) { f.splice(i, 1); U.toast(name + ' ist kein Favorit mehr.'); }
    else {
      if (f.length >= 30) { U.toast('Du kannst höchstens 30 Favoriten haben.'); return; }
      f.push(name); SFX('star'); U.toast(name + ' ist jetzt ein Favorit!'); loadStatus();
    }
    U.saveLocal(); sheetSync(true);
  }
  function loadStatus() {
    D.statusAt = Date.now();
    if (!tok() || !favs().length) return;
    N.duel.status(tok(), favs()).then(function (rows) {
      D.status = {}; rows.forEach(function (r) { D.status[r.username.toLowerCase()] = r; });
      // Schreibweise vom Server übernehmen
      G.S.favs = favs().map(function (n) { var r = D.status[n.toLowerCase()]; return r ? r.username : n; });
      sheetSync();
    }).catch(function () {});
  }

  /* ---------- Menü "Duelle" ---------- */
  U.views.duell = function () {
    var h = '', c = D.cur;
    if (Date.now() - D.statusAt > 10000) setTimeout(loadStatus, 0);
    if (c && c.state === 'invite') {
      h += '<div class="card duwait"><h3>Warte auf ' + esc(c.opp) + ' …</h3><p class="hint">Deine Einladung ist unterwegs. Sobald ' + esc(c.opp) + ' annimmt, geht es los.</p>' +
        '<div class="duspin">⚔️</div><button class="btn ghost" data-act="duCancel:' + c.id + '">Einladung zurückziehen</button></div>';
    }
    if (D.invites.length) {
      h += '<div class="card"><h3>Einladungen an dich</h3><div class="list">' + D.invites.map(function (iv) {
        return '<div class="li"><span class="duav">⚔️</span><div class="t"><b>' + esc(iv.from) + '</b><small>will ein Duell</small></div>' +
          '<button class="btn ghost" data-act="duNo:' + iv.id + '">Nein</button><button class="btn" data-act="duYes:' + iv.id + '">Ja</button></div>';
      }).join('') + '</div></div>';
    }
    h += '<div class="card"><h3>Spieler herausfordern</h3><p class="hint">Schreib den Namen von einem Spieler. Er bekommt eine Einladung auf seinen Bildschirm.</p>' +
      '<label class="field">Spielername<input id="duName" data-duel="name" value="' + esc(D.nameIn) + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="16" placeholder="z. B. SchafBoss_7"></label>' +
      '<div class="row"><button class="btn red" data-act="duInvite"' + (c ? ' disabled' : '') + '>⚔️ Herausfordern</button>' +
      '<button class="btn coin" data-act="duFavIn">' + (D.nameIn && isFav(D.nameIn) ? '★ Kein Favorit mehr' : '☆ Als Favorit') + '</button></div></div>';
    var f = favs();
    h += '<div class="card"><h3>Favoriten</h3>';
    if (!f.length) h += '<p class="hint">Noch keine Favoriten. Schreib oben einen Namen und tippe auf „Als Favorit“. Dann steht der Spieler immer hier.</p>';
    else h += '<div class="list">' + f.map(function (n) {
      var st = D.status[n.toLowerCase()], on = st && st.online, sel = D.nameIn.toLowerCase() === n.toLowerCase();
      return '<div class="li dufav' + (sel ? ' sel' : '') + '" data-act="duPick:' + esc(n) + '"><i class="dudot' + (on ? ' on' : '') + '"></i><div class="t"><b>' + esc(n) + '</b><small>' +
        (st ? (on ? 'online' : 'gerade nicht da') : (D.statusAt ? 'unbekannt' : '…')) + '</small></div>' +
        '<button class="btn red" data-act="duInvite:' + esc(n) + '"' + (c ? ' disabled' : '') + '>⚔️</button><button class="dustar" data-act="duFav:' + esc(n) + '" aria-label="Favorit entfernen">★</button></div>';
    }).join('') + '</div>';
    h += '</div>';
    if (!N.online) h += '<div class="card"><h3>Test-Gegner</h3><p class="hint">Im Test-Modus gibt es noch keine anderen Spieler. Probier es gegen den <b>' + N.BOT + '</b>! Er setzt immer das Gleiche wie du.</p><button class="btn purple" data-act="duInvite:' + N.BOT + '"' + (c ? ' disabled' : '') + '>Gegen den ' + N.BOT + ' spielen</button></div>';
    h += '<div class="card"><h3>So geht es</h3><p class="hint">1. Fordere jemanden heraus. 2. Sucht euch zusammen ein Spiel aus. 3. Setzt Geld und Schafe. 4. Wenn beide bereit sind, geht es nach 3 Sekunden los. Wer gewinnt, bekommt den Einsatz des anderen. Wer aufgibt oder zu lange wartet, verliert.</p></div>';
    return { title: 'Duelle', html: h };
  };

  /* ---------- Duell-Bildschirm ---------- */
  function el() {
    var e = $('#duel');
    if (!e) { e = document.createElement('div'); e.id = 'duel'; e.hidden = true; document.body.appendChild(e); }
    return e;
  }
  function hide() { var e = el(); e.hidden = true; e.innerHTML = ''; D.built = ''; D.shownId = null; document.body.classList.remove('induel'); }
  function phase(v) {
    if (D.final) return 'end:' + D.final.id;
    if (v.state === 'setup') return 'setup:' + v.id;
    var s = left(v, 'start_in');
    return (s != null && s > 0 ? 'cd:' : 'play:') + v.id;
  }
  function render() {
    var v = D.final || D.cur, e = el();
    if (!v) { hide(); return; }
    e.hidden = false; document.body.classList.add('induel');
    var ph = phase(v);
    if (ph !== D.built) { D.built = ph; D.setupSig = ''; build(v, ph.split(':')[0]); }
    update(v, ph.split(':')[0]);
  }
  function head(v) {
    return '<div class="duhead"><div class="duvs"><span class="dume">' + esc(v.me) + '</span><span class="duvsx">VS</span><span class="duop">' + esc(v.opp) + '</span></div>' +
      (D.final ? '' : '<button class="btn ghost dulv" data-act="duLeave">' + (v.state === 'play' ? 'Aufgeben' : 'Verlassen') + '</button>') + '</div>';
  }
  function build(v, ph) {
    var h = '<div class="dubox">' + head(v);
    if (ph === 'setup') {
      h += '<div class="ducard"><h3>1. Spiel aussuchen</h3><div class="dumodes" id="duModes"></div><p class="hint" id="duModeBy"></p></div>';
      h += '<div class="ducard"><h3>2. Dein Einsatz</h3>' +
        '<label class="field">Geld (z. B. 500, 25K, 3M)<input id="duMoney" data-duel="money" inputmode="decimal" autocomplete="off" placeholder="0"></label>' +
        '<div class="quick"><button data-act="duMoneyQ:0">0</button><button data-act="duMoneyQ:10">10 %</button><button data-act="duMoneyQ:50">50 %</button><button data-act="duMoneyQ:100">Alles Geld</button></div>' +
        '<div class="dupick" id="duPick"></div>' +
        '<div class="quick"><button data-act="duAllSheep">Alle Schafe</button><button data-act="duNoSheep">Keine Schafe</button><button data-act="duAll">Alles setzen</button><button class="dusame" data-act="duSame">Gleich wie ' + esc(v.opp) + '</button></div></div>';
      h += '<div class="ducard"><h3>Einsatz von ' + esc(v.opp) + '</h3><div id="duOpp"></div></div>';
      h += '<div class="duready" id="duReady"></div>';
    } else if (ph === 'cd' || ph === 'play') {
      h += '<div class="dugame" id="duGame"></div><div class="dutime"><div class="bar"><i id="duBar"></i></div><small class="num" id="duTimeT"></small></div>';
      h += '<div class="dupot"><div><small>Dein Einsatz</small>' + stakeHtml(v.my_stake) + '</div><div><small>Einsatz von ' + esc(v.opp) + '</small>' + stakeHtml(v.opp_stake) + '</div></div>';
      if (ph === 'cd') h += '<div class="ducount" id="duCount"></div>';
    } else {
      var info = D.finalInfo || {};
      var title = v.state === 'gone' ? 'Kein Duell' : info.win === 'me' ? 'Gewonnen!' : info.win === 'opp' ? 'Verloren' : 'Unentschieden';
      var rpsEnd = v.game && v.mode === 'rps';
      if (rpsEnd) h += '<div class="dugame" id="duGame"></div>';
      h += '<div class="duend ' + (info.win || 'none') + (rpsEnd ? ' late' : '') + '"><div class="dubig">' + (info.win === 'me' ? '🏆' : info.win === 'opp' ? '😢' : '🤝') + '</div><h2>' + title + '</h2>' +
        (info.why ? '<p>' + esc(info.why) + '</p>' : '') + resultLines(info) + '</div>';
      if (v.game && v.mode !== 'rps') h += '<div class="dugame small" id="duGame"></div>';
      h += '<div class="' + (rpsEnd ? 'late' : '') + '">';
      h += '<div class="btns"><button class="btn coin" data-act="duDone">Fertig</button>' +
        (v.opp && v.opp !== '' ? '<button class="btn red" data-act="duAgain:' + esc(v.opp) + '">⚔️ Revanche</button>' : '') +
        '<button class="btn ghost" data-act="duFav:' + esc(v.opp) + '" id="duFavBtn">' + (isFav(v.opp) ? '★ Favorit' : '☆ Als Favorit') + '</button></div>';
      h += '</div>';
    }
    el().innerHTML = h + '</div>';
    if (ph === 'setup') { var mi = $('#duMoney'); mi.value = moneyStr(D.draft && D.draft.money); }
  }
  function update(v, ph) {
    if (ph === 'setup') {
      var miss = G.stakeMissing(D.draft || {}), sig = [v.ver, v.mode, v.my_ready, v.opp_ready, JSON.stringify(D.draft), JSON.stringify(v.opp_stake), D.sending, miss.join(), JSON.stringify(G.S.sheep)].join('|');
      if (sig === D.setupSig) return;
      D.setupSig = sig;
      $('#duModes').innerHTML = Object.keys(MODES).map(function (k) {
        var m = MODES[k]; return '<button class="dumode' + (v.mode === k ? ' on' : '') + '" data-act="duMode:' + k + '"><span>' + m.ic + '</span><b>' + m.n + '</b><small>' + m.d + '</small></button>';
      }).join('');
      $('#duModeBy').textContent = v.mode_by == null ? 'Ihr könnt beide das Spiel ändern.' : (v.mode_by === v.side ? 'Du hast ' : v.opp + ' hat ') + MODES[v.mode].n + ' ausgesucht.';
      renderPick();
      $('#duOpp').innerHTML = stakeHtml(v.opp_stake);
      $('#duReady').innerHTML = '<div class="durow"><span class="dust' + (v.my_ready ? ' ok' : '') + '">' + (v.my_ready ? '✔ Du bist bereit' : 'Du bist noch nicht bereit') + '</span>' +
        '<span class="dust' + (v.opp_ready ? ' ok' : '') + '">' + (v.opp_ready ? '✔ ' + esc(v.opp) + ' ist bereit' : esc(v.opp) + ' überlegt noch …') + '</span></div>' +
        (miss.length ? '<p class="dumiss">Dir fehlt: ' + esc(miss.join(', ')) + '</p>' : '') +
        '<button class="btn wide ' + (v.my_ready ? 'ghost' : '') + '" data-act="duReady"' + (D.sending ? ' disabled' : '') + '>' + (v.my_ready ? 'Doch nicht bereit' : '3. Bereit!') + '</button>';
      return;
    }
    if (ph === 'cd') {
      var s = Math.ceil(left(v, 'start_in') / 1000), c = $('#duCount');
      if (c && D.cd !== s) { D.cd = s; c.innerHTML = '<b>' + (s > 3 ? 3 : s) + '</b>'; SFX('click'); }
    }
    if (ph === 'play' && D.cd !== 0) { D.cd = 0; SFX('unlock'); }
    if (ph === 'cd' || ph === 'play' || ph === 'end') { var g = $('#duGame'); if (g && g.dataset.ver !== String(v.ver) + ph) { g.dataset.ver = String(v.ver) + ph; g.innerHTML = gameHtml(v, ph); } }
    if (ph === 'play' || ph === 'cd') timeBar(v);
  }
  function timeBar(v) {
    var l = left(v, 'left'), full = v.mode === 'rps' ? 20000 : 30000, bar = $('#duBar'), t = $('#duTimeT');
    if (l == null || !bar) return;
    if (left(v, 'start_in') > 0) l = full;
    l = Math.max(0, l);
    bar.style.width = Math.min(100, l / full * 100) + '%';
    bar.parentNode.classList.toggle('low', l < 8000);
    var myTurn = v.mode === 'rps' ? v.game && v.game[v.side === 0 ? 'pa' : 'pb'] < 0 : v.turn === v.side;
    t.textContent = (myTurn ? 'Noch ' + Math.ceil(l / 1000) + ' Sek. für deinen Zug' : esc(v.opp) + ' hat noch ' + Math.ceil(l / 1000) + ' Sek.');
  }
  var TLINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var TLPOS = [[50, 16.7, 0, 92], [50, 50, 0, 92], [50, 83.3, 0, 92], [16.7, 50, 90, 92], [50, 50, 90, 92], [83.3, 50, 90, 92], [50, 50, 45, 124], [50, 50, -45, 124]];
  function mySheep() {
    var best = 'wiese', inc = -1;
    Object.keys(G.S.sheep).forEach(function (t) { if (T[t] && G.S.sheep[t] > 0 && T[t].inc > inc) { inc = T[t].inc; best = t; } });
    return T[best];
  }
  function stars(n) { var h = ''; for (var i = 0; i < 3; i++) h += '<i class="rstar' + (i < n ? ' on' : '') + '">★</i>'; return h; }
  function rpsImg(i, cls) { return '<img class="' + (cls || '') + '" src="' + A.rpsURL(i) + '" alt="' + RPS[i].n + '">'; }
  function gameHtml(v, ph) {
    var g = v.game || {}, me = v.side, h = '';
    var playing = ph === 'play' && v.state === 'play';
    var meS = A.sheepURL(D.avatar || mySheep()), opS = A.sheepURL(T.schwarz);
    if (v.mode === 'rps') {
      var my = g[me === 0 ? 'pa' : 'pb'], op = g[me === 0 ? 'pb' : 'pa'], sm = g[me === 0 ? 'sa' : 'sb'] || 0, so = g[me === 0 ? 'sb' : 'sa'] || 0;
      var lastRound = (g.round || 1) - 1, key = v.id + ':' + lastRound;
      var clash = !!g.last && D.rpsAnim !== key && (my < 0 && op !== -2);
      if (clash) D.rpsAnim = key;
      h += '<div class="rbar"><div class="rside"><img src="' + meS + '" alt=""><b>Du</b><div class="rstars">' + stars(sm) + '</div></div>' +
        '<div class="rmid num"><b>' + sm + ' : ' + so + '</b><small>Runde ' + Math.min(g.round || 1, 99) + '</small><small>Wer zuerst 3 hat, gewinnt!</small></div>' +
        '<div class="rside op"><img src="' + opS + '" alt=""><b>' + esc(v.opp) + '</b><div class="rstars">' + stars(so) + '</div></div></div>';
      var showLast = !!g.last && my < 0 && op !== -2;
      h += '<div class="rarena' + (clash ? ' clash' : '') + '">';
      if (showLast) {
        var lm = g.last[me === 0 ? 'a' : 'b'], lo = g.last[me === 0 ? 'b' : 'a'], w = g.last.w, res = w === 2 ? 'tie' : w === me ? 'won' : 'lost';
        h += '<div class="rslot me ' + (res === 'won' ? 'win' : res === 'lost' ? 'lose' : '') + '">' + (clash ? rpsImg(1, 'pre') : '') + rpsImg(lm, 'real') + '<small>' + RPS[lm].n + '</small></div>' +
          '<div class="rvs">VS</div>' +
          '<div class="rslot op ' + (res === 'lost' ? 'win' : res === 'won' ? 'lose' : '') + '">' + (clash ? rpsImg(1, 'pre') : '') + rpsImg(lo, 'real') + '<small>' + RPS[lo].n + '</small></div>';
        if (clash) h += '<div class="rchant"><span>Schere …</span><span>Stein …</span><span>Papier!</span></div>';
        h += '<div class="rres ' + res + '">' + (res === 'tie' ? 'Gleich! Nochmal!' : res === 'won' ? '⭐ Punkt für dich!' : 'Punkt für ' + esc(v.opp)) + '</div>';
      } else {
        h += '<div class="rslot me">' + (my >= 0 ? rpsImg(my, 'real pick') : '<span class="rq">?</span>') + '<small>' + (my >= 0 ? RPS[my].n : 'Du') + '</small></div><div class="rvs">VS</div>' +
          '<div class="rslot op">' + (op === -2 ? '<img class="real back" src="' + A.cardBackURL() + '" alt=""><small>✔ hat gewählt</small>' : '<span class="rq think">…</span><small>überlegt</small>') + '</div>';
      }
      h += '</div>';
      if (ph === 'end') return h;
      h += '<div class="rpick' + (clash ? ' late' : '') + '">';
      if (playing && my >= 0) h += '<p class="duturn">Warte auf ' + esc(v.opp) + ' …</p>';
      else if (playing) h += '<p class="duturn me">Wähle deine Waffe!</p>';
      else h += '<p class="duturn">Gleich geht es los!</p>';
      h += '<div class="durps">' + RPS.map(function (r, i) {
        return '<button class="durpsb' + (my === i ? ' on' : '') + '" data-act="duMove:' + i + '"' + (playing && my < 0 ? '' : ' disabled') + '>' + rpsImg(i) + '<b>' + r.n + '</b></button>';
      }).join('') + '</div></div>';
      return h;
    }
    var b = g.b || [], wl = g.wl || [], myT = playing && v.turn === me;
    if (ph !== 'end') {
      var you = v.mode === 'ttt' ? '<img class="tico" src="' + A.sheepURL(T.wiese) + '" alt="">Du bist das weiße Schaf' : '<i class="disc mine"></i>Du bist Rot';
      h += '<div class="dutop"><span class="duyou">' + you + '</span><span class="duturnpill' + (myT ? ' me' : '') + '">' + (ph === 'cd' ? 'Gleich geht es los!' : myT ? 'Du bist dran!' : esc(v.opp) + ' ist dran …') + '</span></div>';
      if (g.drawn) h += '<p class="dudraw">Unentschieden! Nochmal, Runde ' + g.g + ' von 3.</p>';
    }
    if (v.mode === 'ttt') {
      var li = -1;
      if (wl.length === 3) TLINES.forEach(function (l, k) { if (l.join() === wl.join()) li = k; });
      h += '<div class="duttt' + (myT ? ' myturn' : '') + '">' + b.map(function (x, i) {
        var mineP = x === me;
        return '<button class="ducell' + (wl.indexOf(i) >= 0 ? ' win' : '') + (g.lm === i ? ' last' : '') + (x >= 0 ? (mineP ? ' mine' : ' theirs') : '') + '" data-act="duMove:' + i + '"' + (myT && x < 0 ? '' : ' disabled') + '>' +
          (x >= 0 ? '<img src="' + (mineP ? A.sheepURL(T.wiese) : A.sheepURL(T.schwarz)) + '" alt="">' : '') + '</button>';
      }).join('');
      if (li >= 0) { var tp = TLPOS[li]; h += '<i class="tline' + (wl.length && b[wl[0]] === me ? ' mine' : '') + '" style="left:' + tp[0] + '%;top:' + tp[1] + '%;width:' + tp[3] + '%;--a:' + tp[2] + 'deg"></i>'; }
      h += '</div>';
    } else {
      h += '<div class="duc4wrap"><div class="duc4' + (myT ? ' myturn' : '') + '">';
      for (var c = 0; c < 7; c++) {
        var colFree = b[c] < 0;
        h += '<button class="ducol" data-act="duMove:' + c + '"' + (myT && colFree ? '' : ' disabled') + '><i class="ghost"></i>';
        for (var r = 0; r < 6; r++) {
          var i = r * 7 + c, x = b[i];
          h += '<i class="hole' + (x >= 0 ? (x === me ? ' mine' : ' theirs') : '') + (wl.indexOf(i) >= 0 ? ' win' : '') + (g.lm === i ? ' last' : '') + '" style="--r:' + (r + 1) + '"></i>';
        }
        h += '</button>';
      }
      h += '</div></div>';
    }
    return h;
  }
  function renderPick() {
    var p = $('#duPick'); if (!p) return;
    var own = Object.keys(G.S.sheep).filter(function (t) { return T[t] && G.S.sheep[t] > 0; }).sort(function (a, b) { return T[b].inc - T[a].inc; });
    var st = D.draft.sheep || {};
    p.innerHTML = own.length ? own.map(function (t) {
      var n = st[t] || 0, have = G.S.sheep[t];
      return '<div class="dupk' + (n ? ' on' : '') + '"><img src="' + A.sheepURL(T[t]) + '" alt=""><small>' + esc(T[t].n) + '</small><b class="num">' + n + ' / ' + have + '</b>' +
        '<div class="dupm"><button data-act="duSheep:' + t + ':-1" aria-label="weniger"' + (n ? '' : ' disabled') + '>−</button><button data-act="duSheep:' + t + ':1" aria-label="mehr"' + (n < have ? '' : ' disabled') + '>+</button></div></div>';
    }).join('') : '<p class="hint">Du hast keine Schafe zum Setzen.</p>';
  }

  /* ---------- Einsatz schicken ---------- */
  function sendDraft() {
    clearTimeout(D.sendT);
    D.sendT = setTimeout(function () {
      var v = D.cur; if (!v || v.state !== 'setup') return;
      N.duel.set(tok(), v.id, null, D.draft).then(function (r) { if (D.cur && D.cur.id === r.id) { D.cur = r; D.at = Date.now(); render(); } }).catch(err);
    }, 350);
  }
  function changed() { if (D.cur) { D.cur.my_ready = false; render(); } sendDraft(); }
  function moneyStr(m) { return !m ? '' : m < 1e6 ? String(m) : fmt(m).replace(/,/g, ''); }
  function setMoney(m) { D.draft.money = Math.max(0, Math.floor(m || 0)); var mi = $('#duMoney'); if (mi) { mi.value = moneyStr(D.draft.money); mi.classList.remove('bad'); } changed(); }

  /* ---------- Klicks ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
    var parts = t.dataset.act.split(':'), a = parts[0], arg = parts[1], v = D.cur;
    if (a.slice(0, 2) !== 'du') return;
    switch (a) {
      case 'duYes': case 'duNo': if (U.modalOpen() && t.closest('#overlay')) U.nextModal(); answer(arg, a === 'duYes'); break;
      case 'duInvite': invite(arg || ($('#duName') && $('#duName').value) || D.nameIn); break;
      case 'duAgain': D.final = null; hide(); invite(arg); break;
      case 'duCancel': N.duel.leave(tok(), arg).then(function () { D.cur = null; sheetSync(true); }).catch(err).then(poll); break;
      case 'duFavIn': toggleFav(D.nameIn); break;
      case 'duFav': e.stopPropagation(); toggleFav(arg); if (D.final) { var fb = $('#duFavBtn'); if (fb) fb.textContent = isFav(arg) ? '★ Favorit' : '☆ Als Favorit'; } break;
      case 'duPick': D.nameIn = arg; SFX('pick'); sheetSync(true); break;
      case 'duMode': if (!v || v.state !== 'setup' || v.mode === arg) break; SFX('pick'); v.mode = arg; v.mode_by = v.side; v.my_ready = v.opp_ready = false; render();
        N.duel.set(tok(), v.id, arg, null).then(function (r) { D.cur = r; D.at = Date.now(); render(); }).catch(err); break;
      case 'duMoneyQ': setMoney(Math.floor(G.S.coins) * (+arg) / 100); break;
      case 'duSheep':
        var tp = arg, d = +parts[2], st = D.draft.sheep = D.draft.sheep || {}, n = (st[tp] || 0) + d;
        n = Math.max(0, Math.min(G.S.sheep[tp] || 0, n)); if (n) st[tp] = n; else delete st[tp]; SFX(d > 0 ? 'pick' : 'unpick'); changed(); break;
      case 'duAllSheep': D.draft.sheep = {}; Object.keys(G.S.sheep).forEach(function (k) { if (T[k] && G.S.sheep[k] > 0) D.draft.sheep[k] = G.S.sheep[k]; }); changed(); break;
      case 'duNoSheep': D.draft.sheep = {}; changed(); break;
      case 'duAll': D.draft.sheep = {}; Object.keys(G.S.sheep).forEach(function (k) { if (T[k] && G.S.sheep[k] > 0) D.draft.sheep[k] = G.S.sheep[k]; }); setMoney(Math.floor(G.S.coins)); break;
      case 'duSame':
        if (!v) break;
        var os = v.opp_stake || { money: 0, sheep: {} }, miss = G.stakeMissing(os);
        if (miss.length) { U.toast('Das geht nicht, dir fehlt: ' + miss.join(', ')); SFX('cant'); break; }
        D.draft = JSON.parse(JSON.stringify(os)); setMoney(os.money); break;
      case 'duReady':
        if (!v || v.state !== 'setup') break;
        if (!v.my_ready) {
          var ms = G.stakeMissing(D.draft); if (ms.length) { U.toast('Dir fehlt: ' + ms.join(', ')); SFX('cant'); break; }
        }
        clearTimeout(D.sendT); D.sending = true; render();
        var want = !v.my_ready, me = U.me();
        // zuerst den Einsatz und den Spielstand speichern, damit der Server sieht, dass du alles hast
        (N.stakeKey(D.draft) === N.stakeKey(v.my_stake) ? Promise.resolve() : N.duel.set(tok(), v.id, null, D.draft))
          .then(function () { return want && N.online ? N.save(me.token, G.S, G.fullIncome(), G.S.playtime, G.S.rebirths) : true; })
          .then(function () { return N.duel.ready(tok(), v.id, want); })
          .then(function (r) { SFX(want ? 'lvl' : 'unpick'); setCur(r); })
          .catch(err).then(function () { D.sending = false; render(); });
        break;
      case 'duMove':
        if (!v || v.state !== 'play') break;
        SFX('place');
        N.duel.move(tok(), v.id, +arg).then(function (r) { if (r.state === 'play') setCur(r); else poll(); }).catch(err);
        break;
      case 'duLeave':
        if (!v) { hide(); break; }
        if (v.state === 'play') {
          U.modal('<div class="modal"><h2>Aufgeben?</h2><p>Wenn du aufgibst, verlierst du deinen Einsatz: <b>' + esc(stakeText(v.my_stake)) + '</b>.</p>' +
            '<div class="btns"><button class="btn ghost" data-act="close">Weiterspielen</button><button class="btn red" data-act="duQuit">Aufgeben</button></div></div>');
        } else N.duel.leave(tok(), v.id).then(function () { poll(); }).catch(err);
        break;
      case 'duQuit': U.nextModal(); if (v) N.duel.leave(tok(), v.id).then(poll).catch(err); break;
      case 'duDone': D.final = null; hide(); SFX('close'); U.refresh(); break;
    }
  });
  document.addEventListener('input', function (e) {
    var k = e.target.dataset && e.target.dataset.duel; if (!k) return;
    if (k === 'name') { D.nameIn = e.target.value.trim(); var b = document.querySelector('[data-act="duFavIn"]'); if (b) b.textContent = D.nameIn && isFav(D.nameIn) ? '★ Kein Favorit mehr' : '☆ Als Favorit'; }
    if (k === 'money') {
      var m = e.target.value.trim() === '' ? 0 : parseAmt(e.target.value);
      e.target.classList.toggle('bad', isNaN(m));
      if (!isNaN(m)) { D.draft.money = m; changed(); }
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'duName') { e.preventDefault(); invite(e.target.value); } });

  // Zeitanzeigen und Countdown flüssig halten
  setInterval(function () { if (D.cur && !D.final && !el().hidden) render(); }, 250);

  U.onEnter = function () { D.seenInv = {}; loop(); loadStatus(); };
  SI.duel = D;
})(window.SI);
