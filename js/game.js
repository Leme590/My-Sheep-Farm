/* Schaf-Imperium: Spielregeln, Geld, Spielstand */
(function (SI) {
  'use strict';
  var G = SI.G = {};
  var T = SI.T;

  function freshRun() {
    return { coins: 120, run: 0, sheep: { wiese: 1 }, pens: [{ t: 'wiese', lvl: 1, n: 1 }], cards: {}, bought: {}, breed: null };
  }
  G.fresh = function () {
    var s = freshRun();
    s.v = 2; s.total = 0; s.rebirths = 0; s.found = { wiese: 1 }; s.dekoFound = {}; s.dekoInv = {}; s.dekoPlaced = [];
    s.dekoShop = { date: '', cnt: {} }; s.ach = {};
    s.stats = { boxes: 0, wolves: 0, golden: 0, breeds: 0, taps: 0, dekoBoxes: 0, nights: 0, lvls: 0, duels: 0, duelWins: 0, visits: 0, hearts: 0 };
    s.daily = { last: '', streak: 0 }; s.playtime = 0; s.lastSave = Date.now(); s.lastNight = -1;
    return s;
  };
  G.S = G.fresh();

  G.adopt = function (d) {
    var f = G.fresh();
    if (!d || typeof d !== 'object' || d.v !== 2) { G.S = f; return; }
    var s = Object.assign(f, d);
    s.stats = Object.assign(G.fresh().stats, d.stats || {});
    s.daily = Object.assign({ last: '', streak: 0 }, d.daily || {});
    s.dekoShop = Object.assign({ date: '', cnt: {} }, d.dekoShop || {});
    if (!s.dekoShop.cnt) s.dekoShop = { date: '', cnt: {} }; // alter Spielstand
    var clean = {};
    Object.keys(s.sheep || {}).forEach(function (k) { if (T[k] && s.sheep[k] > 0) clean[k] = Math.floor(s.sheep[k]); });
    s.sheep = clean;
    s.pens = (s.pens || []).map(function (p) { return p && T[p.t] ? { t: p.t, lvl: Math.max(1, Math.min(G.MAXLVL, p.lvl | 0)), n: p.n == null ? -1 : Math.max(0, p.n | 0) } : null; });
    s.dekoPlaced = (s.dekoPlaced || []).filter(function (p) { return SI.DK[p.id]; });
    // alte Karten (bis 11.11.2026) in die neuen umwandeln
    var oc = s.cards || {}, nc = {};
    var add = function (k, n) { if (n > 0) nc[k] = (nc[k] || 0) + n; };
    Object.keys(oc).forEach(function (k) {
      var n = oc[k] | 0;
      if (k === 'schere') add('gold', 2 * n); else if (k === 'klee' || k === 'zeit') add('gold', n);
      else if (k === 'zucht') add('hirte', n); else if (SI.CK[k]) add(k, n);
    });
    Object.keys(nc).forEach(function (k) { if (SI.CK[k].max) nc[k] = Math.min(SI.CK[k].max, nc[k]); });
    s.cards = nc;
    G.S = s;
    // alte Spielstände (ohne Schaf-Anzahl pro Gehege): Gehege so voll wie möglich machen
    var old = s.pens.filter(function (p) { return p && p.n < 0; });
    old.forEach(function (p) { p.n = 0; });
    old.forEach(function (p) { p.n = Math.min(G.penCap(p.lvl), G.extras(p.t)); });
    G.fixPens();
  };

  /* ---------- Hilfen ---------- */
  // Amerikanische Kurzformen: K = tausend, M = Million, B = Milliarde (billion), T = Billion (trillion) ...
  G.fmt = function (n) {
    if (!isFinite(n)) return '∞';
    if (n < 1000) return (n < 10 ? Math.floor(n * 10) / 10 : Math.floor(n)).toLocaleString('en-US');
    var u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'], i = 0;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return (n < 100 ? Math.floor(n * 10) / 10 : Math.floor(n)).toLocaleString('en-US') + u[i];
  };
  G.fmtTime = function (s) {
    s = Math.max(0, Math.ceil(s));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    if (d) return d + ' T. ' + h + ' Std.';
    if (h) return h + ' Std. ' + m + ' Min.';
    if (m) return m + ' Min.' + (x ? ' ' + x + ' Sek.' : '');
    return x + ' Sek.';
  };
  G.today = function (off) { var d = new Date(Date.now() + (off || 0) * 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  G.rnd = rnd;
  G.card = function (k) { return G.S.cards[k] || 0; };
  // Gesamter Bonus einer Karten-Sorte in Prozent (höchstens bis zur Grenze)
  G.cardBonus = function (k) { var c = SI.CK[k]; if (!c || !c.per) return 0; return c.per * (c.max ? Math.min(c.max, G.card(k)) : G.card(k)); };
  G.cardMaxed = function (k) { var c = SI.CK[k]; return !!(c && c.max && G.card(k) >= c.max); };
  G.sheepCount = function () { var n = 0; for (var k in G.S.sheep) n += G.S.sheep[k]; return n; };
  G.hasRar = function (r) { return SI.TYPES.some(function (t) { return t.r === r && G.S.found[t.id]; }); };
  G.penCount = function () { return G.S.pens.filter(Boolean).length; };

  /* ---------- Farm & Gehege ---------- */
  // Kai: pro Rebirth +25 % Geld und 2 neue Plätze, höchstens 6 Rebirths
  G.RB_BONUS = 0.25; G.RB_PLOTS = 2;
  G.rbMult = function (n) { return 1 + G.RB_BONUS * (n == null ? G.S.rebirths : n); };
  G.plotCount = function () { return 8 + G.RB_PLOTS * Math.min(G.S.rebirths, 6); };
  G.penOf = function (t) { for (var i = 0; i < G.S.pens.length; i++) if (G.S.pens[i] && G.S.pens[i].t === t) return i; return -1; };
  // Kai: eine Schafsorte darf viele Gehege haben. Jedes Gehege merkt sich, wie viele Schafe drin sind (p.n).
  G.pensOf = function (t) { var r = []; for (var i = 0; i < G.plotCount(); i++) if (G.S.pens[i] && G.S.pens[i].t === t) r.push(i); return r; };
  G.assigned = function (t) { var n = 0; G.S.pens.forEach(function (p) { if (p && p.t === t) n += p.n || 0; }); return n; };
  G.extras = function (t) { return Math.max(0, (G.S.sheep[t] || 0) - G.assigned(t)); };
  // Wie viele Schafe könnte dieses Gehege aus anderen Gehegen derselben Sorte holen?
  G.canPull = function (i) {
    var p = G.S.pens[i]; if (!p) return 0;
    var free = G.penCap(p.lvl) - p.n, other = G.assigned(p.t) - p.n + G.extras(p.t);
    return Math.max(0, Math.min(free, other));
  };
  // Schafe aus den anderen Gehegen herholen (zuerst aus dem kleinsten Gehege). Leere Gehege werden abgebaut.
  G.pullSheep = function (i) {
    var p = G.S.pens[i], moved = 0, removed = 0; if (!p) return { moved: 0, removed: 0 };
    var ex = Math.min(G.extras(p.t), G.penCap(p.lvl) - p.n); if (ex > 0) { p.n += ex; moved += ex; } // zuerst die wartenden aus der Scheune
    var others = G.pensOf(p.t).filter(function (j) { return j !== i; }).sort(function (a, b) { return G.S.pens[a].lvl - G.S.pens[b].lvl || G.S.pens[a].n - G.S.pens[b].n; });
    others.forEach(function (j) {
      var q = G.S.pens[j], k = Math.min(G.penCap(p.lvl) - p.n, q.n); if (k <= 0) return;
      q.n -= k; p.n += k; moved += k;
      if (!q.n) { G.S.pens[j] = null; removed++; }
    });
    return { moved: moved, removed: removed };
  };
  // Farm voll? Dann macht ein schwächeres Zweit-Gehege (eine Sorte, die mehrere Gehege hat) Platz.
  // Dessen Schafe ziehen in die Scheune und können später zurück.
  G.freeDuplicate = function (t) {
    var best = -1;
    for (var i = 0; i < G.plotCount(); i++) {
      var p = G.S.pens[i]; if (!p || p.t === t || T[p.t].inc >= T[t].inc || G.pensOf(p.t).length < 2) continue;
      if (best < 0 || T[p.t].inc < T[G.S.pens[best].t].inc || (p.t === G.S.pens[best].t && (p.lvl < G.S.pens[best].lvl || (p.lvl === G.S.pens[best].lvl && p.n < G.S.pens[best].n)))) best = i;
    }
    if (best >= 0) G.S.pens[best] = null;
    return best;
  };
  // nach Änderungen: nie mehr Schafe in Gehegen als man hat, Gehege nie über voll
  G.fixPens = function () {
    var S = G.S;
    S.pens.forEach(function (p) { if (p) p.n = Math.max(0, Math.min(p.n | 0, G.penCap(p.lvl))); });
    Object.keys(T).forEach(function (t) {
      var over = G.assigned(t) - (S.sheep[t] || 0);
      for (var i = S.pens.length - 1; i >= 0 && over > 0; i--) { var p = S.pens[i]; if (p && p.t === t) { var k = Math.min(p.n, over); p.n -= k; over -= k; } }
    });
  };
  G.freePlot = function () { for (var i = 0; i < G.plotCount(); i++) if (!G.S.pens[i]) return i; return -1; };
  G.MAXLVL = 5; // 4 Ausbauten
  G.penCap = function (lvl) { return 4 + (lvl - 1); };
  G.penMult = function (lvl) { return 1 + 0.25 * (lvl - 1); };
  G.lvlCost = function (t, lvl) { return Math.ceil(Math.max(400, T[t].inc * 500) * Math.pow(4, lvl - 1) * (1 - G.cardBonus('technik') / 100)); };
  G.barn = function () { return Object.keys(G.S.sheep).filter(function (t) { return G.extras(t) > 0; }); };

  G.dekoBonus = function () {
    var b = 0; G.S.dekoPlaced.forEach(function (p) { b += SI.DK[p.id].ev === 'cup' ? 0 : SI.DEKO_BONUS[SI.DK[p.id].r]; }); return b;
  };
  G.globalMult = function () {
    return (1 + 0.05 * G.card('gold')) * (1 + G.dekoBonus()) * G.rbMult() * G.boostMult();
  };
  // Geld-Booster aus Aufgaben: doppeltes Geld für eine Weile
  G.boostLeft = function () { var b = G.S.boost; return b && b.end > Date.now() ? (b.end - Date.now()) / 1000 : 0; };
  G.boostMult = function () { return G.boostLeft() > 0 ? 2 : 1; };
  G.addBoost = function (sec) { var now = Date.now(), b = G.S.boost; G.S.boost = { end: Math.max(now, b && b.end || 0) + sec * 1000 }; };
  G.penIncome = function (i) {
    var p = G.S.pens[i]; if (!p) return 0;
    var n = Math.min(p.n || 0, G.penCap(p.lvl));
    return n * T[p.t].inc * G.penMult(p.lvl);
  };
  G.baseIncome = function () { var b = 0; for (var i = 0; i < G.S.pens.length; i++) b += G.penIncome(i); return b; };
  G.wolfActive = false;
  G.fullIncome = function () { return G.baseIncome() * G.globalMult(); };
  G.income = function () { return G.fullIncome() * (G.wolfActive ? 0.5 : 1); };
  G.earn = function (x) { G.S.coins += x; G.S.run += x; G.S.total += x; };
  G.giveSec = function (s) { var a = Math.max(50, G.fullIncome() / G.boostMult() * s); G.earn(a); return a; };
  G.sellValue = function (t) { return Math.ceil(T[t].inc * 60); };

  G.addSheep = function (t, n) {
    n = n || 1;
    var S = G.S, isNew = !S.found[t];
    S.found[t] = 1;
    S.sheep[t] = (S.sheep[t] || 0) + n;
    var placed = true, built = false, pen = -1;
    for (var k = 0; k < n; k++) {
      // zuerst in ein Gehege derselben Sorte mit freiem Platz, sonst ein neues Gehege bauen
      var room = G.pensOf(t).filter(function (i) { return S.pens[i].n < G.penCap(S.pens[i].lvl); })[0];
      if (room != null) { S.pens[room].n++; pen = room; continue; }
      var f = G.freePlot();
      if (f < 0) f = G.freeDuplicate(t);
      if (f >= 0) { S.pens[f] = { t: t, lvl: 1, n: 1 }; built = true; pen = f; } else placed = false;
    }
    return { isNew: isNew, placed: placed, built: built, pen: pen };
  };
  G.levelUp = function (i) {
    var p = G.S.pens[i]; if (!p || p.lvl >= G.MAXLVL) return false;
    var c = G.lvlCost(p.t, p.lvl); if (G.S.coins < c) return false;
    G.S.coins -= c; p.lvl++; G.S.stats.lvls = (G.S.stats.lvls || 0) + 1;
    var ex = Math.min(G.extras(p.t), G.penCap(p.lvl) - p.n); if (ex > 0) p.n += ex; // wartende Schafe ziehen gleich ein
    return true;
  };
  G.removePen = function (i) { G.S.pens[i] = null; };
  G.buildPen = function (t, i) {
    if (i == null || i < 0) i = G.freePlot();
    var ex = G.extras(t);
    if (i < 0 || G.S.pens[i] || !ex) return false;
    G.S.pens[i] = { t: t, lvl: 1, n: Math.min(ex, G.penCap(1)) }; return true;
  };
  G.sellExtras = function (t) {
    var n = G.extras(t); if (!n) return 0;
    var keep = (G.S.sheep[t] || 0) - n;
    var v = n * G.sellValue(t); G.earn(v);
    if (keep > 0) G.S.sheep[t] = keep; else delete G.S.sheep[t];
    G.fixPens(); return v;
  };
  G.sellAll = function (t) {
    var n = G.S.sheep[t] || 0; var v = n * G.sellValue(t); G.earn(v); delete G.S.sheep[t];
    G.pensOf(t).forEach(function (i) { G.S.pens[i] = null; });
    if (G.S.breed && (G.S.breed.a === t || G.S.breed.b === t)) { /* Zucht läuft weiter */ }
    return v;
  };

  /* ---------- Mystery-Boxen (Schafe) ---------- */
  G.merch = null; // {k, end, off: 0.5 | 0.75 | 1}
  G.boxPrice = function (k) {
    var b = SI.BK[k], p = b.cost;
    if (G.merch && G.merch.k === k) p *= 1 - (G.merch.off || 0.5);
    return Math.ceil(p);
  };
  function rollRarity(odds, luck) {
    var ent = Object.keys(odds).map(function (r) { return [r, r === 'c' ? odds[r] : odds[r] * (1 + luck)]; });
    var sum = ent.reduce(function (a, e) { return a + e[1]; }, 0), x = Math.random() * sum;
    for (var i = 0; i < ent.length; i++) { if ((x -= ent[i][1]) < 0) return ent[i][0]; }
    return ent[ent.length - 1][0];
  }
  G.rollRarity = rollRarity;
  G.rollCard = function () { return rollCard(); };
  function rollCard() {
    var pool = SI.CARDS.filter(function (c) { return !c.max || G.card(c.k) < c.max; });
    var sum = pool.reduce(function (a, c) { return a + c.w; }, 0), x = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) { if ((x -= pool[i].w) < 0) return pool[i]; }
    return pool[0];
  }
  // Taco Tuesday: jeden Dienstag (Ortszeit). G.tacoForce nur zum Testen.
  G.isTaco = function () { return !!G.tacoForce || new Date().getDay() === 2; };
  G.boxUnlocked = function (k) { var b = SI.BK[k]; if (b.ev === 'taco') return G.isTaco(); return !b.rb || G.S.rebirths >= b.rb; };
  G.openBox = function (k, free) {
    var b = SI.BK[k], S = G.S;
    if (!free) {
      if (!G.boxUnlocked(k)) return null;
      var p = G.boxPrice(k); if (S.coins < p) return null;
      S.coins -= p; S.bought[k] = (S.bought[k] || 0) + 1;
      if (G.merch && G.merch.k === k) G.merch = null;
    }
    S.stats.boxes++;
    if (Math.random() * 100 < b.card) {
      var c = rollCard(); S.cards[c.k] = G.card(c.k) + 1;
      return { card: c, box: b };
    }
    var r = rollRarity(b.odds, G.cardBonus('glueck') / 100);
    var pool = SI.TYPES.filter(function (x) { return x.r === r && (x.ev || null) === (b.ev || null); });
    if (!pool.length) pool = SI.TYPES.filter(function (x) { return x.r === r && !x.ev; });
    var t = rnd(pool);
    var res = G.addSheep(t.id);
    return { t: t, box: b, isNew: res.isNew, placed: res.placed, built: res.built, pen: res.pen };
  };

  // Turnier-Kiste: 3 zufällige Belohnungen (Schaf, Deko oder Münzen)
  G.openTurnier = function () {
    var T = SI.TURNIER, out = [], inc = G.fullIncome() / G.boostMult(); // Münzen nach dem Einkommen vor der Kiste
    for (var i = 0; i < T.n; i++) {
      var sum = 0, k; for (k in T.w) sum += T.w[k];
      var x = Math.random() * sum, kind = 'coins'; for (k in T.w) { if ((x -= T.w[k]) < 0) { kind = k; break; } }
      if (kind === 'sheep') out.push({ kind: 'sheep', res: G.openBox('turnier', true) });
      else if (kind === 'deko') out.push({ kind: 'deko', res: G.giveDeko(T.deko) });
      else {
        var min = T.coinMin[0] + Math.random() * (T.coinMin[1] - T.coinMin[0]);
        var c = Math.max(25000, Math.round(inc * 60 * min));
        G.S.coins += c; G.S.total += c; out.push({ kind: 'coins', coins: c, min: Math.round(min) });
      }
    }
    return out;
  };

  /* ---------- Deko-Shop (jeden Tag neu) ---------- */
  // 3 Plätze, jeder mit einer Seltenheit und 1 bis 6 Kisten (je seltener, desto seltener gibt es mehr)
  G.shopToday = function () {
    var date = G.today();
    var R = SI.art.rng(SI.art.hash('deko-' + date));
    var slots = [];
    for (var i = 0; i < 3; i++) {
      var sum = 0, k; for (k in SI.DEKO_ODDS) sum += SI.DEKO_ODDS[k];
      var x = R() * sum, r = 'c';
      for (k in SI.DEKO_ODDS) { if ((x -= SI.DEKO_ODDS[k]) < 0) { r = k; break; } }
      var n = 1; while (n < SI.DEKO_MAX && R() < SI.DEKO_EXTRA[r]) n++;
      slots.push({ r: r, n: n });
    }
    // Taco Tuesday: zusätzlich die Taco-Kiste (etwas günstiger als eine legendäre Kiste)
    if (G.isTaco()) { var tn = 2; while (tn < SI.DEKO_MAX && R() < 0.35) tn++; slots.push({ r: 'taco', n: tn }); }
    if (G.S.dekoShop.date !== date) G.S.dekoShop = { date: date, cnt: {} };
    var cnt = G.S.dekoShop.cnt;
    return { date: date, slots: slots, left: function (i) { return slots[i].n - (cnt[i] || 0); } };
  };
  G.dekoPrice = function (r) {
    var p = SI.DEKO_PRICE[r];
    return Math.ceil(Math.max(p[0], G.fullIncome() * p[1]));
  };
  G.giveDeko = function (r) {
    if (r === 'taco') { // Taco-Kiste: nur mexikanische Deko
      var sum = 0, k; for (k in SI.TACO_ODDS) sum += SI.TACO_ODDS[k];
      var x = Math.random() * sum; r = 'r'; for (k in SI.TACO_ODDS) { if ((x -= SI.TACO_ODDS[k]) < 0) { r = k; break; } }
      var td = rnd(SI.DEKO.filter(function (y) { return y.ev === 'taco' && y.r === r; })); return G.addDeko(td.id, true);
    }
    var d = rnd(SI.DEKO.filter(function (x) { return x.r === r && !x.ev; }));
    var isNew = !G.S.dekoFound[d.id];
    G.S.dekoFound[d.id] = 1;
    G.S.dekoInv[d.id] = (G.S.dekoInv[d.id] || 0) + 1;
    G.S.stats.dekoBoxes++;
    return { deko: d, isNew: isNew };
  };
  G.addDeko = function (id, fromBox) {
    var d = SI.DK[id]; if (!d) return null;
    if (fromBox) G.S.stats.dekoBoxes++;
    var isNew = !G.S.dekoFound[d.id];
    G.S.dekoFound[d.id] = 1;
    G.S.dekoInv[d.id] = (G.S.dekoInv[d.id] || 0) + 1;
    return { deko: d, isNew: isNew };
  };
  G.buyDeko = function (slot) {
    var sh = G.shopToday(); var r = sh.slots[slot].r;
    if (sh.left(slot) <= 0) return null;
    var p = G.dekoPrice(r); if (G.S.coins < p) return null;
    G.S.coins -= p; G.S.dekoShop.cnt[slot] = (G.S.dekoShop.cnt[slot] || 0) + 1;
    return G.giveDeko(r);
  };
  G.dekoInvCount = function () { var n = 0; for (var k in G.S.dekoInv) n += G.S.dekoInv[k]; return n; };
  G.placeDeko = function (id, x, y) {
    if (!G.S.dekoInv[id]) return false;
    G.S.dekoInv[id]--; if (!G.S.dekoInv[id]) delete G.S.dekoInv[id];
    G.S.dekoPlaced.push({ id: id, x: Math.round(x), y: Math.round(y) });
    return true;
  };
  G.pickupDeko = function (idx) {
    var p = G.S.dekoPlaced[idx]; if (!p) return;
    G.S.dekoPlaced.splice(idx, 1);
    G.S.dekoInv[p.id] = (G.S.dekoInv[p.id] || 0) + 1;
  };

  /* ---------- Zucht ---------- */
  G.recipeKey = function (a, b) { return [a, b].sort().join('+'); };
  G.breedCost = function (a, b) { return Math.ceil(30 * (T[a].inc + T[b].inc)); };
  G.breedTime = function (a, b) {
    var f = { c: 1, r: 2, e: 4, l: 8, m: 12, s: 10 };
    return 30 * Math.max(f[T[a].r], f[T[b].r]) * (1 - G.cardBonus('hirte') / 100);
  };
  G.startBreed = function (a, b) {
    if (G.S.breed) return false;
    var c = G.breedCost(a, b); if (G.S.coins < c) return false;
    G.S.coins -= c; G.S.breed = { a: a, b: b, start: Date.now(), end: Date.now() + G.breedTime(a, b) * 1000 };
    return true;
  };
  G.collectBreed = function () {
    var br = G.S.breed; if (!br || Date.now() < br.end) return null;
    var key = G.recipeKey(br.a, br.b), t;
    if (SI.RECIPES[key]) t = T[SI.RECIPES[key]];
    else {
      var ra = T[br.a].r === 's' ? 'l' : T[br.a].r, rb = T[br.b].r === 's' ? 'l' : T[br.b].r;
      var ri = Math.max(SI.RORDER.indexOf(ra), SI.RORDER.indexOf(rb));
      var r = SI.RORDER[ri];
      if (Math.random() < 0.15 + G.cardBonus('hirte') / 100 && ri < 4) r = SI.RORDER[ri + 1]; // Hirtenstab: mehr Glück
      t = rnd(SI.TYPES.filter(function (x) { return x.r === r && !x.ev; }));
    }
    var res = G.addSheep(t.id);
    G.S.breed = null; G.S.stats.breeds++;
    return { t: t, isNew: res.isNew, placed: res.placed };
  };

  /* ---------- Tägliche Belohnung ---------- */
  G.dailyReady = function () { return G.S.daily.last !== G.today(); };
  G.dailyIndex = function () { return G.S.daily.last === G.today(-1) ? G.S.daily.streak % 7 : 0; };

  /* ---------- Rebirth ---------- */
  // Preise der Rebirths (mit einer Spieler-Simulation abgestimmt: 1. Rebirth ca. 5 Min., danach immer länger)
  var RB_COST = [4e5, 1e7, 2e8, 2e10, 4e14, 1e16];
  G.MAXRB = 6; // Kai: es gibt höchstens 6 Rebirths
  G.rebirthMax = function () { return G.S.rebirths >= G.MAXRB; };
  G.rebirthCost = function () { return RB_COST[Math.min(G.S.rebirths, RB_COST.length - 1)]; };
  G.doRebirth = function () {
    if (G.rebirthMax() || G.S.coins < G.rebirthCost()) return false;
    var keep = G.S;
    var r = freshRun();
    Object.keys(r).forEach(function (k) { keep[k] = r[k]; });
    keep.rebirths++;
    G.merch = null;
    return true;
  };

  /* ---------- Tag und Nacht ---------- */
  var CYCLE = SI.DAY_LEN + SI.NIGHT_LEN;
  G.cycle = function () {
    var now = Date.now() / 1000;
    var t = now % CYCLE, night = t >= SI.DAY_LEN;
    var left = night ? CYCLE - t : SI.DAY_LEN - t;
    // Dunkelheit mit weichem Übergang (45 Sek.)
    var fade = 45, dark;
    if (!night) dark = t < fade ? 1 - t / fade : (SI.DAY_LEN - t < fade ? 1 - (SI.DAY_LEN - t) / fade : 0);
    else dark = 1;
    return { night: night, left: left, dark: Math.max(0, Math.min(1, dark)), id: Math.floor(now / CYCLE) };
  };

  /* ---------- Erfolge ---------- */
  G.checkAch = function () {
    var got = [];
    SI.ACH.forEach(function (a) {
      if (!G.S.ach[a.k] && a.t(G.S, G)) {
        G.S.ach[a.k] = 1;
        var r = Math.max(100, G.fullIncome() * 60); G.earn(r);
        got.push({ a: a, r: r });
      }
    });
    return got;
  };

  /* ---------- Spielzeit-Takt ---------- */
  var nightPlayed = 0, nightId = -1;
  /* ---------- Duelle: Einsätze ---------- */
  // Einsatz = { money: Zahl, sheep: { sorte: anzahl } }
  G.stakeEmpty = function (st) { return !st || (!(st.money > 0) && !Object.keys(st.sheep || {}).length); };
  // Was fehlt mir für diesen Einsatz? (leer = alles da)
  G.stakeMissing = function (st) {
    var miss = [], S = G.S;
    if ((st.money || 0) > Math.floor(S.coins)) miss.push(G.fmt(st.money - Math.floor(S.coins)) + ' Münzen');
    Object.keys(st.sheep || {}).forEach(function (t) { var d = st.sheep[t] - (S.sheep[t] || 0); if (d > 0) miss.push(d + '× ' + (T[t] ? T[t].n : t)); });
    return miss;
  };
  G.removeSheep = function (t, n) {
    var S = G.S, have = S.sheep[t] || 0, k = Math.min(have, n); if (k <= 0) return 0;
    if (have - k > 0) S.sheep[t] = have - k; else delete S.sheep[t];
    // zuerst Schafe aus der Scheune nehmen, dann aus den kleinsten Gehegen
    var over = G.assigned(t) - (S.sheep[t] || 0);
    var idx = G.pensOf(t).sort(function (a, b) { return S.pens[a].lvl - S.pens[b].lvl || S.pens[a].n - S.pens[b].n; });
    idx.forEach(function (i) { if (over <= 0) return; var p = S.pens[i], m = Math.min(p.n, over); p.n -= m; over -= m; });
    S.pens.forEach(function (p, i) { if (p && p.t === t && p.n <= 0) S.pens[i] = null; });
    G.fixPens();
    return k;
  };
  // Einsatz abgeben (beim Start des Spiels). Gibt zurück, was wirklich abgegeben wurde.
  G.payStake = function (st) {
    var S = G.S, out = { money: Math.min(Math.floor(S.coins), Math.max(0, st.money || 0)), sheep: {} };
    S.coins -= out.money;
    Object.keys(st.sheep || {}).forEach(function (t) { var k = G.removeSheep(t, st.sheep[t]); if (k) out.sheep[t] = k; });
    return out;
  };
  // Einsatz bekommen (Gewinn oder zurück)
  G.getStake = function (st) {
    if (!st) return;
    if (st.money > 0) { G.S.coins += st.money; }
    Object.keys(st.sheep || {}).forEach(function (t) { if (T[t] && st.sheep[t] > 0) G.addSheep(t, Math.floor(st.sheep[t])); });
  };
  // Nie ganz ohne etwas: Wer kein Schaf mehr hat, bekommt ein Wiesenschaf geschenkt.
  G.rescue = function () { if (G.sheepCount() > 0) return false; G.addSheep('wiese', 1); return true; };

  G.tick = function (dt, visible) {
    if (!visible) return; // im Hintergrund oder geschlossen: kein Geld
    G.earn(G.income() * dt);
    if (visible) {
      G.S.playtime += dt;
      var c = G.cycle();
      if (c.night) {
        if (nightId !== c.id) { nightId = c.id; nightPlayed = 0; }
        nightPlayed += dt;
        if (nightPlayed >= SI.NIGHT_LEN - 5 && G.S.lastNight !== c.id) { G.S.lastNight = c.id; G.S.stats.nights++; }
      }
    }
  };
})(window.SI);
