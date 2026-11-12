/* Schaf-Imperium: tägliche und wöchentliche Aufgaben (Quests) */
(function (SI) {
  'use strict';
  var G = SI.G, A = SI.art, T = SI.T, U = SI.ui;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;

  // Was gezählt wird. Fortschritt = Wert jetzt minus Wert beim Start der Aufgabe.
  var STAT = {
    boxes: function (S) { return S.stats.boxes || 0; },
    breeds: function (S) { return S.stats.breeds || 0; },
    golden: function (S) { return S.stats.golden || 0; },
    wolves: function (S) { return S.stats.wolves || 0; },
    deko: function (S) { return S.stats.dekoBoxes || 0; },
    lvls: function (S) { return S.stats.lvls || 0; },
    duels: function (S) { return S.stats.duels || 0; },
    duelWins: function (S) { return S.stats.duelWins || 0; },
    visits: function (S) { return S.stats.visits || 0; },
    hearts: function (S) { return S.stats.hearts || 0; },
    nights: function (S) { return S.stats.nights || 0; },
    earn: function (S) { return S.total || 0; },
    play: function (S) { return Math.floor((S.playtime || 0) / 60); }
  };
  // Aufgaben: [Statistik, Bild, Text (Einzahl), Text (Mehrzahl), Ziel täglich, Ziel wöchentlich (0 = nur täglich / nicht wöchentlich)]
  var QUESTS = [
    ['boxes', '📦', 'Öffne {n} Mystery-Box', 'Öffne {n} Mystery-Boxen', 5, 40],
    ['breeds', '💕', 'Züchte {n} Baby-Schaf', 'Züchte {n} Baby-Schafe', 2, 10],
    ['golden', '✨', 'Fange {n} goldenes Schaf', 'Fange {n} goldene Schafe', 1, 4],
    ['wolves', '🐺', 'Verjage {n} Wolf', 'Verjage {n} Wölfe', 0, 3],
    ['deko', '🎁', 'Kaufe {n} Deko-Kiste', 'Kaufe {n} Deko-Kisten', 1, 5],
    ['lvls', '🔨', 'Baue {n}× ein Gehege aus', 'Baue {n}× ein Gehege aus', 1, 6],
    ['duels', '⚔️', 'Spiele {n} Duell', 'Spiele {n} Duelle', 1, 0],
    ['duelWins', '🏆', 'Gewinne {n} Duell', 'Gewinne {n} Duelle', 0, 2],
    ['visits', '🏡', 'Besuche {n} Farm', 'Besuche {n} Farmen', 2, 8],
    ['hearts', '❤️', 'Verschenke {n} Herz', 'Verschenke {n} Herzen', 1, 5],
    ['nights', '🌙', 'Bleib {n} Nacht wach', 'Bleib {n} Nächte wach', 0, 2],
    ['earn', '💰', 'Verdiene {n} Münzen', 'Verdiene {n} Münzen', -1, -1],
    ['play', '⏰', 'Spiele {n} Minute', 'Spiele {n} Minuten', 15, 120]
  ];
  var QK = {}; QUESTS.forEach(function (q) { QK[q[0]] = q; });

  // Belohnungen: nett, aber nicht zu stark
  var RW = {
    d: [{ t: 'coins', s: 300 }, { t: 'box', s: 1500 }, { t: 'boost', s: 600 }, { t: 'deko', r: 'c' }],
    w: [{ t: 'coins', s: 2700 }, { t: 'box', s: 9000 }, { t: 'boost', s: 1200 }, { t: 'card' }, { t: 'deko', r: 'r' }]
  };
  var BONUS = { d: [{ t: 'box', s: 3600 }], w: [{ t: 'card' }, { t: 'deko', r: 'e' }] };

  function baseInc() { return G.fullIncome() / G.boostMult(); }
  function nice(x) { if (x < 100) return Math.ceil(x); var p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.ceil(x / p) * p; }
  // Kai: Kisten richten sich nach deinem Geld. Täglich: eine Kiste unter der besten, die du dir gerade leisten kannst.
  // Wöchentlich: die beste, die du dir leisten kannst, mit kleiner Chance auf die nächstbessere.
  var UP_CHANCE = 0.12;
  function boxList() { return SI.BOX.filter(function (b) { return !b.ev && G.boxUnlocked(b.k); }); }
  function bestIdx(list) { var best = 0; list.forEach(function (b, i) { if (G.boxPrice(b.k) <= G.S.coins) best = i; }); return best; }
  function weekly(s) { return s >= 9000; }
  function boxFor(s) { var list = boxList(), b = bestIdx(list); return list[weekly(s) ? b : Math.max(0, b - 1)].k; }
  function boxUp(s) { var list = boxList(), b = bestIdx(list); return weekly(s) && b + 1 < list.length ? list[b + 1].k : null; }
  function rollBox(s) { var up = boxUp(s); return up && Math.random() < UP_CHANCE ? up : boxFor(s); }
  function weekId() {
    var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Montag
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function periodId(p) { return p === 'd' ? G.today() : weekId(); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  function makeRw(p, used) {
    var pool = RW[p].filter(function (r) { return used.indexOf(r.t) < 0; });
    var r = JSON.parse(JSON.stringify(G.rnd(pool.length ? pool : RW[p])));
    used.push(r.t);
    return r;
  }
  function makeQuest(p, k, rw) {
    var q = QK[k], S = G.S, n = q[p === 'd' ? 4 : 5];
    if (n === -1) n = nice(Math.max(p === 'd' ? 1000 : 20000, baseInc() * (p === 'd' ? 1200 : 12000)));
    return { k: k, n: n, base: STAT[k](S), rw: rw, cl: 0 };
  }
  function canUse(p, k) {
    var q = QK[k]; if (!q[p === 'd' ? 4 : 5]) return false;
    if (k === 'earn' && baseInc() <= 0) return false;
    return true;
  }
  function newSet(p) {
    var ks = shuffle(QUESTS.map(function (q) { return q[0]; }).filter(function (k) { return canUse(p, k); })).slice(0, 3), used = [];
    return { id: periodId(p), list: ks.map(function (k) { return makeQuest(p, k, makeRw(p, used)); }), bonus: 0, swap: 0 };
  }
  function set(p) {
    var Q = G.S.quests = G.S.quests || {};
    if (!Q[p] || Q[p].id !== periodId(p) || !Array.isArray(Q[p].list)) Q[p] = newSet(p);
    Q[p].list = Q[p].list.filter(function (q) { return q && QK[q.k]; });
    // Belohnungen immer nach der aktuellen Tabelle (falls sie geändert wurde)
    Q[p].list.forEach(function (q) { var def = RW[p].filter(function (x) { return q.rw && x.t === q.rw.t; })[0]; if (def) q.rw = JSON.parse(JSON.stringify(def)); });
    return Q[p];
  }
  function prog(q) { return Math.max(0, Math.min(q.n, STAT[q.k](G.S) - q.base)); }
  function done(q) { return prog(q) >= q.n; }
  function text(q) { var d = QK[q.k], s = q.n === 1 ? d[2] : d[3]; return s.replace('{n}', q.k === 'earn' ? fmt(q.n) : q.n); }
  function rwText(r) {
    switch (r.t) {
      case 'coins': return '💰 ' + (r.s >= 3600 ? (r.s / 3600).toLocaleString('de-DE') + ' Std.' : r.s / 60 + ' Min.') + ' Geld';
      case 'box': var up = boxUp(r.s); return '📦 ' + SI.BK[boxFor(r.s)].n + (up ? ' (' + Math.round(UP_CHANCE * 100) + ' % Chance auf ' + SI.BK[up].n + ')' : '');
      case 'boost': return '⚡ ' + r.s / 60 + ' Min. doppeltes Geld';
      case 'card': return '🃏 Upgrade-Karte';
      case 'deko': return '🎀 Deko-Kiste ' + SI.RAR[r.r].n;
    }
    return '';
  }
  function rwPic(r) {
    if (r.t === 'box') return A.boxURL(boxFor(r.s));
    if (r.t === 'card') return A.cardBackURL();
    if (r.t === 'deko') return A.boxURL('g' + r.r);
    return A.iconURL('coin');
  }
  // Belohnung geben (mit den schönen Kisten-Animationen)
  var later = [];
  function give(r) {
    switch (r.t) {
      case 'coins': var a = G.giveSec(r.s); SFX('coin'); U.toast('+' + fmt(a) + ' Münzen!'); break;
      case 'box': var bk = rollBox(r.s); if (bk !== boxFor(r.s)) { SFX('trumpet'); U.toast('🍀 Glück gehabt! Du bekommst sogar eine ' + SI.BK[bk].n + '!'); } U.sheepReveal(G.openBox(bk, true), ''); break;
      case 'boost': G.addBoost(r.s); SFX('unlock'); U.flash('#ffe066'); U.toast('⚡ Doppeltes Geld für ' + r.s / 60 + ' Minuten!'); break;
      case 'card': var c = G.rollCard(); G.S.cards[c.k] = G.card(c.k) + 1; U.sheepReveal({ card: c, box: SI.BK.holz }, ''); break;
      case 'deko': U.dekoReveal(G.giveDeko(r.r), r.r); break;
    }
  }

  /* ---------- Hinweise ---------- */
  var seen = {};
  function claimable() {
    var n = 0;
    ['d', 'w'].forEach(function (p) { var s = set(p); s.list.forEach(function (q) { if (!q.cl && done(q)) n++; }); if (!s.bonus && s.list.every(function (q) { return q.cl; })) n++; });
    return n;
  }
  function check() {
    var me = U.me(); if (!me || G.visiting) return;
    ['d', 'w'].forEach(function (p) {
      set(p).list.forEach(function (q, i) {
        var key = p + G.S.quests[p].id + i + q.k;
        if (!q.cl && done(q) && !seen[key]) { seen[key] = 1; SFX('ach'); U.toast('✅ Aufgabe geschafft: ' + text(q)); }
      });
    });
    var dot = $('#dotQuest'); if (dot) dot.hidden = !claimable();
    var sh = U.sheet(); if (sh && sh.name === 'quests') liveBars();
  }
  function liveBars() {
    ['d', 'w'].forEach(function (p) {
      set(p).list.forEach(function (q, i) {
        var b = $('#qb' + p + i), t = $('#qt' + p + i), v = prog(q);
        if (b) b.style.width = (v / q.n * 100) + '%';
        if (t) t.textContent = (q.k === 'earn' ? fmt(v) + ' / ' + fmt(q.n) : v + ' / ' + q.n);
        if (!q.cl && done(q) && b && !b.closest('.qrow').classList.contains('ready')) U.renderSheet();
      });
    });
    var a = $('#qLeftD'), w = $('#qLeftW');
    if (a) a.textContent = 'Neu in ' + G.fmtTime(untilNext('d'));
    if (w) w.textContent = 'Neu in ' + G.fmtTime(untilNext('w'));
  }
  function untilNext(p) {
    var d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0);
    if (p === 'w') m.setDate(m.getDate() + ((8 - m.getDay()) % 7));
    return (m - d) / 1000;
  }

  /* ---------- Menü ---------- */
  U.views.quests = function () {
    var h = '';
    [['d', 'Tägliche Aufgaben', 'qLeftD'], ['w', 'Wöchentliche Aufgaben', 'qLeftW']].forEach(function (x) {
      var p = x[0], s = set(p), all = s.list.every(function (q) { return q.cl; });
      h += '<div class="card qcard ' + p + '"><div class="row" style="justify-content:space-between"><h3>' + x[1] + '</h3><span class="hint num" id="' + x[2] + '">Neu in ' + G.fmtTime(untilNext(p)) + '</span></div>';
      s.list.forEach(function (q, i) {
        var v = prog(q), ok = v >= q.n;
        h += '<div class="qrow' + (q.cl ? ' claimed' : ok ? ' ready' : '') + '"><span class="qic">' + QK[q.k][1] + '</span><div class="qmid"><b>' + esc(text(q)) + '</b>' +
          '<div class="qbar"><i id="qb' + p + i + '" style="width:' + (v / q.n * 100) + '%"></i><span class="num" id="qt' + p + i + '">' + (q.k === 'earn' ? fmt(v) + ' / ' + fmt(q.n) : v + ' / ' + q.n) + '</span></div>' +
          '<small class="qrw"><img src="' + rwPic(q.rw) + '" alt="">' + esc(rwText(q.rw)) + '</small></div>' +
          (q.cl ? '<span class="qdone">✔</span>' : ok ? '<button class="btn coin qbtn" data-act="qClaim:' + p + ':' + i + '">Abholen</button>' :
            (s.swap ? '' : '<button class="qswap" data-act="qSwap:' + p + ':' + i + '" aria-label="Aufgabe tauschen" title="Aufgabe tauschen">🔄</button>')) + '</div>';
      });
      var bn = BONUS[p].map(rwText).join(' + ');
      h += '<div class="qbonus' + (s.bonus ? ' claimed' : all ? ' ready' : '') + '"><span class="qic">🎉</span><div class="qmid"><b>Alle 3 geschafft</b><small class="qrw">' + esc(bn) + '</small></div>' +
        (s.bonus ? '<span class="qdone">✔</span>' : all ? '<button class="btn pink qbtn" data-act="qBonus:' + p + '">Bonus!</button>' : '<span class="qlock">🔒</span>') + '</div>';
      h += '<p class="hint">' + (s.swap ? 'Du hast ' + (p === 'd' ? 'heute' : 'diese Woche') + ' schon eine Aufgabe getauscht.' : 'Mit 🔄 kannst du ' + (p === 'd' ? 'jeden Tag' : 'jede Woche') + ' eine Aufgabe gegen eine andere tauschen.') + '</p></div>';
    });
    return { title: 'Aufgaben', html: h };
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    var parts = el.dataset.act.split(':'), a = parts[0], p = parts[1], i = +parts[2];
    if (a !== 'qClaim' && a !== 'qBonus' && a !== 'qSwap') return;
    if (G.visiting) return;
    var s = set(p);
    if (a === 'qClaim') {
      var q = s.list[i]; if (!q || q.cl || !done(q)) return;
      q.cl = 1; G.S.stats.quests = (G.S.stats.quests || 0) + 1; SFX('daily'); give(q.rw);
    } else if (a === 'qBonus') {
      if (s.bonus || !s.list.every(function (x) { return x.cl; })) return;
      s.bonus = 1; SFX('trumpet'); BONUS[p].forEach(function (r) { give(r); });
    } else {
      var old = s.list[i]; if (!old || old.cl || s.swap) return;
      var have = s.list.map(function (x) { return x.k; });
      var pool = QUESTS.map(function (x) { return x[0]; }).filter(function (k) { return canUse(p, k) && have.indexOf(k) < 0; });
      if (!pool.length) return;
      s.list[i] = makeQuest(p, G.rnd(pool), old.rw); s.swap = 1; SFX('pick');
    }
    U.saveLocal(); U.refresh(); check();
  });

  setInterval(check, 1000);
  SI.quests = { set: set, check: check, boxFor: boxFor };
})(window.SI);
