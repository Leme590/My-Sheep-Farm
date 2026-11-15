/* Schaf-Imperium: Dschungel-Event (Kai): Verlorene Artefakte, Tempel-Expedition, Umgebung, Nachrichten an alle,
   Geld-Übersicht und die Update-Nachricht beim ersten Start */
(function (SI) {
  'use strict';
  var G = SI.G, A = SI.art, N = SI.net, F = SI.farm, U = SI.ui, T = SI.T;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;
  var J = { tab: 'art', newsAfter: 0, busy: false };
  function tok() { var m = U.me(); return m && m.token; }
  function on() { return SI.jungleOn(); }
  function left() { return Math.max(0, (SI.JUNGLE_END - Date.now()) / 1000); }

  /* ---------- Umgebung (für alle Farmen gleich, stellt der Admin ein) ---------- */
  SI.env = 'wiese';
  function setEnv(e) {
    e = e === 'dschungel' ? 'dschungel' : 'wiese';
    if (SI.env === e) return;
    SI.env = e; if (F.envChanged) F.envChanged();
    var sh = U.sheet(); if (sh && sh.name === 'admin') U.renderSheet();
  }
  function loadEnv() { N.jungle.env().then(setEnv).catch(function () { /* alte Datenbank: Wiese */ }); }

  /* ---------- Artefakt gefunden ---------- */
  function found(x) {
    if (!x || !x.a) return;
    var n = G.artCount();
    U.modal('<div class="modal artm"><div class="artglow"><img src="' + A.artURL(x.k) + '" alt=""></div><div class="arttag">Verlorenes Artefakt!</div><h2>' + esc(x.a.n) + '</h2>' +
      '<p>' + esc(x.a.d) + '</p><div class="artcnt num">' + n + ' von ' + SI.ARTS.length + ' Artefakten</div>' +
      '<p class="hint">Es steht jetzt in deinem Tempel auf der Farm.</p><div class="btns"><button class="btn go" data-act="close">Super!</button></div></div>',
    function (ov) {
      SFX('artifact'); U.flash('#7dffb0'); var md = ov.querySelector('.modal');
      U.confetti(md, 90, '#14b84a'); U.sparks(md.querySelector('.artglow'), 50);
      if (navigator.vibrate) try { navigator.vibrate([120, 50, 120, 50, 240]); } catch (e) { /* egal */ }
    });
    if (x.waechter) waechterModal();
    var t = tok();
    if (t) {
      N.jungle.add(t, x.k).catch(function () {});
      if (x.waechter) setTimeout(function () { N.jungle.add(t, 'waechter').catch(function () {}); }, 800);
    }
    U.saveLocal(); U.saveCloud(); U.refresh();
  }
  function waechterModal() {
    U.modal('<div class="modal artm waechterm"><div class="artglow"><img src="' + A.sheepURL(T.waechter) + '" alt=""></div><div class="arttag">Alle 4 Artefakte!</div><h2>' + esc(T.waechter.n) + '</h2>' +
      '<p>Der Wächter des Dschungels hat dich auserwählt!</p><p class="jwbig">+10 % Geld für immer</p><p>Er bleibt auch nach einem Rebirth und nach dem Event bei dir.</p>' +
      '<p class="hint">Er wohnt oben auf deinem Tempel.</p><div class="btns"><button class="btn coin" data-act="close">Wow!</button></div></div>',
    function (ov) {
      SFX('reveal', 'm'); setTimeout(function () { SFX('trumpet'); }, 400);
      var md = ov.querySelector('.modal'); U.flash('#ffe066'); U.confetti(md, 120, '#ffd23f'); U.sparks(md.querySelector('.artglow'), 70);
      document.body.classList.remove('quake'); void document.body.offsetWidth; document.body.classList.add('quake');
      setTimeout(function () { document.body.classList.remove('quake'); }, 800);
    });
  }

  /* ---------- Nachricht an alle ---------- */
  function newsText(n) {
    if (n.kind === 'waechter') return n.username + ' hat alle 4 Artefakte und bekommt den Dschungelwächter!';
    var a = SI.ART[n.kind]; return a ? n.username + ' hat ein Verlorenes Artefakt gefunden: ' + a.n + '!' : '';
  }
  function showNews(n) {
    var txt = newsText(n); if (!txt) return;
    var el = document.createElement('div'); el.className = 'jgnews';
    el.innerHTML = '<img src="' + (n.kind === 'waechter' ? A.sheepURL(T.waechter) : A.artURL(n.kind)) + '" alt=""><span></span>';
    el.lastChild.textContent = txt;
    var box = $('#jgNews'); if (!box) { box = document.createElement('div'); box.id = 'jgNews'; document.body.appendChild(box); }
    box.appendChild(el); SFX('artifact');
    setTimeout(function () { el.classList.add('out'); }, 6500); setTimeout(function () { el.remove(); }, 7200);
  }
  function loadNews(first) {
    if (!on() && !first) return;
    N.jungle.news(J.newsAfter).then(function (list) {
      var me = U.me(), mine = me && me.username.toLowerCase();
      list.slice().reverse().forEach(function (n) {
        if (n.id > J.newsAfter) J.newsAfter = n.id;
        var age = Date.now() - new Date(n.created_at).getTime();
        if (n.username.toLowerCase() === mine) return;
        if (first && age > 10 * 60000) return; // beim Start nur ganz frische Funde zeigen
        showNews(n);
      });
    }).catch(function () {});
  }

  /* ---------- Tempel-Expedition (Minispiel) ---------- */
  var STAGES = 20, MAXPLAY = 6;
  var SAFE = { 1: 1, 5: 1, 10: 1, 15: 1, 20: 1 }; // Kai: hier keine Schlange
  var PLAY_SEC = [0, 120, 300, 600, 1200, 2400]; // Kai: jede weitere Runde kostet mehr (Minuten Einkommen)
  function jg() { var s = G.S.jg || (G.S.jg = {}); if (s.day !== G.today()) { s.day = G.today(); s.plays = 0; } return s; }
  function incNow() { return G.fullIncome() / G.boostMult(); }
  function playCost() { var n = jg().plays || 0; return n >= MAXPLAY ? Infinity : n === 0 ? 0 : Math.ceil(Math.max(2000 * n, incNow() * PLAY_SEC[n])); }
  function boxes() { return SI.BOX.filter(function (b) { return !b.ev && G.boxUnlocked(b.k); }); }
  function stageBox(st) { var u = boxes(); return u[Math.max(0, u.length - 1 - Math.max(0, 3 - Math.floor(st / 5)))].k; }
  function stageDeko(st) { return st < 6 ? 'c' : st < 11 ? 'r' : st < 16 ? 'e' : 'l'; }
  function stageSec(st) { return Math.round(30 * Math.pow(st, 1.5)); }
  function rollDoors(st) {
    var doors = [], pool = [['coins', 45], ['box', 25], ['boost', 15]];
    if (st >= 3) pool.push(['deko', 15]);
    var sum = pool.reduce(function (a, p) { return a + p[1]; }, 0);
    for (var i = 0; i < 4; i++) {
      var x = Math.random() * sum, k = pool[0][0];
      for (var j = 0; j < pool.length; j++) { if ((x -= pool[j][1]) < 0) { k = pool[j][0]; break; } }
      doors.push({ k: k });
    }
    var snake = SAFE[st] ? -1 : Math.floor(Math.random() * 4);
    if (snake >= 0) doors[snake] = { k: 'snake' };
    // Das Sonnen-Amulett versteckt sich manchmal ab Stufe 8 hinter einer Tür
    if (st >= 8 && !G.arts().amulett && Math.random() < 0.1) {
      var free = [0, 1, 2, 3].filter(function (i) { return i !== snake; });
      doors[free[Math.floor(Math.random() * free.length)]] = { k: 'amulett' };
    }
    doors.forEach(function (d) {
      if (d.k === 'coins') d.v = Math.max(150 * st, Math.ceil(incNow() * stageSec(st)));
      if (d.k === 'box') d.v = stageBox(st);
      if (d.k === 'boost') d.v = 60 * Math.max(2, Math.round(st * 1.5));
      if (d.k === 'deko') d.v = stageDeko(st);
    });
    return doors;
  }
  function startRun() {
    if (!on()) return;
    var s = jg(), c = playCost();
    if (s.run) { renderJ(); return; }
    if (s.plays >= MAXPLAY) { U.toast('Für heute hast du alle ' + MAXPLAY + ' Expeditionen gemacht. Morgen geht es weiter!'); return; }
    if (G.S.coins < c) { U.toast('Dir fehlen noch ' + fmt(c - G.S.coins) + ' Münzen.'); return; }
    G.S.coins -= c; s.plays++;
    s.run = { st: 1, doors: rollDoors(1), pick: -1, loot: { coins: 0, box: 0, boost: 0, deko: 0 } };
    G.S.stats.jgRuns = (G.S.stats.jgRuns || 0) + 1;
    SFX('jdoor'); U.saveLocal(); renderJ();
  }
  function doorPic(d) {
    if (d.k === 'coins') return '<img src="' + A.iconURL('coin') + '" alt="">';
    if (d.k === 'box') return '<img src="' + A.boxURL(d.v) + '" alt="">';
    if (d.k === 'deko') return '<img src="' + A.boxURL('g' + d.v) + '" alt="">';
    if (d.k === 'amulett') return '<img src="' + A.artURL('amulett') + '" alt="">';
    if (d.k === 'boost') return '<span class="dic">⚡</span>';
    return '<span class="dic">🐍</span>';
  }
  function doorText(d) {
    if (d.k === 'coins') return '+' + fmt(d.v);
    if (d.k === 'box') return SI.BK[d.v].n;
    if (d.k === 'deko') return 'Deko-Kiste';
    if (d.k === 'boost') return '2x Geld';
    if (d.k === 'amulett') return SI.ART.amulett.n;
    return 'Schlange!';
  }
  function pickDoor(i) {
    var s = jg(), r = s.run; if (!r || r.pick >= 0 || !r.doors[i]) return;
    r.pick = i; var d = r.doors[i];
    SFX('jdoor');
    if (d.k === 'snake') {
      r.dead = 1; setTimeout(function () { SFX('snake'); }, 250);
      G.S.stats.jgBest = Math.max(G.S.stats.jgBest || 0, r.st - 1);
    } else {
      if (d.k === 'coins') { G.earn(d.v); r.loot.coins += d.v; setTimeout(function () { SFX('sell'); }, 250); }
      if (d.k === 'boost') { G.addBoost(d.v); r.loot.boost += d.v; setTimeout(function () { SFX('star'); }, 250); }
      if (d.k === 'box') { r.loot.box++; var res = G.openBox(d.v, true); if (res) setTimeout(function () { U.sheepReveal(res, '', 'Expedition · '); }, 600); }
      if (d.k === 'deko') { r.loot.deko++; var dr = G.giveDeko(d.v); setTimeout(function () { SFX('reveal', d.v); U.dekoReveal(dr, d.v); }, 600); }
      if (d.k === 'amulett') { var ar = G.giveArt('amulett'); if (ar) setTimeout(function () { found(ar); }, 600); }
      G.S.stats.jgBest = Math.max(G.S.stats.jgBest || 0, r.st);
      if (r.st >= STAGES) { // Kai: am Ende immer eine Galaxiekiste
        r.won = 1; G.S.stats.jgWins = (G.S.stats.jgWins || 0) + 1;
        setTimeout(function () {
          SFX('trumpet'); var gb = G.openBox('galaxie', true); if (gb) U.sheepReveal(gb, '', 'Expedition geschafft! · ');
        }, 900);
      }
    }
    U.saveLocal(); renderJ();
  }
  function nextStage() {
    var s = jg(), r = s.run; if (!r || r.pick < 0) return;
    if (r.dead || r.won || r.st >= STAGES) { s.run = null; U.saveLocal(); renderJ(); return; }
    r.st++; r.doors = rollDoors(r.st); r.pick = -1; SFX('pop'); U.saveLocal(); renderJ();
  }
  function lootHtml(l) {
    var p = [];
    if (l.coins) p.push('<span><img src="' + A.iconURL('coin') + '" alt="">' + fmt(l.coins) + '</span>');
    if (l.box) p.push('<span><i>📦</i>' + l.box + '× Kiste</span>');
    if (l.deko) p.push('<span><i>🎁</i>' + l.deko + '× Deko</span>');
    if (l.boost) p.push('<span><i>⚡</i>' + G.fmtTime(l.boost) + '</span>');
    return p.length ? '<div class="jloot">' + p.join('') + '</div>' : '<p class="hint center">Noch keine Beute.</p>';
  }
  function expHtml() {
    var s = jg(), r = s.run, h = '';
    if (!r) {
      var c = playCost(), n = s.plays || 0;
      h += '<div class="card jexp"><img class="jtemple" src="' + A.templeURL() + '" alt=""><h3>Tempel-Expedition</h3>' +
        '<p>Im alten Tempel warten auf jeder der 20 Stufen 4 Türen. Hinter den Türen gibt es Münzen, Kisten, Deko und Geld-Booster. Aber Vorsicht: Hinter einer Tür lauert eine Schlange! Dann ist die Expedition vorbei, aber du behältst alles, was du gefunden hast.</p>' +
        '<p class="hint">Auf Stufe 1, 5, 10, 15 und 20 gibt es keine Schlange. Je weiter du kommst, desto besser werden die Belohnungen. Wer alle 20 Stufen schafft, bekommt immer eine Galaxiekiste!</p>' +
        '<div class="jplays num">Heute gespielt: <b>' + n + ' von ' + MAXPLAY + '</b></div>';
      if (n >= MAXPLAY) h += '<p class="hint center">Für heute bist du fertig. Morgen geht es weiter!</p>';
      else if (c === 0) h += '<button class="btn go wide freebtn" data-jg="start"><span>🎁</span> Gratis starten</button>';
      else h += '<button class="btn coin wide" data-jg="start" data-cost="' + c + '">Nochmal starten · <span class="num">' + fmt(c) + '</span></button><p class="hint center">Jede weitere Expedition heute kostet mehr.</p>';
      if (G.S.stats.jgBest) h += '<p class="hint center num">Dein Rekord: Stufe ' + G.S.stats.jgBest + '</p>';
      return h + '</div>';
    }
    var dots = '';
    for (var i = 1; i <= STAGES; i++) dots += '<i class="' + (i < r.st || (i === r.st && r.pick >= 0 && !r.dead) ? 'ok' : i === r.st ? 'now' : '') + (SAFE[i] ? ' safe' : '') + '"></i>';
    h += '<div class="card jrun"><div class="jst"><b>Stufe ' + r.st + ' von ' + STAGES + '</b>' + (SAFE[r.st] ? '<span class="jsafe">Sicher: keine Schlange!</span>' : '<span class="jdanger"><span>🐍</span> Eine Tür hat eine Schlange</span>') + '</div><div class="jdots">' + dots + '</div>';
    h += '<div class="jdoors' + (r.pick >= 0 ? ' open' : '') + '">' + r.doors.map(function (d, k) {
      if (r.pick < 0) return '<button class="jdoor d' + k + '" data-jg="door:' + k + '"><span class="jknob"></span><b>' + (k + 1) + '</b></button>';
      return '<div class="jdoor d' + k + ' opened' + (k === r.pick ? ' picked' : '') + (d.k === 'snake' ? ' snake' : '') + '"><div class="jin">' + doorPic(d) + '<small>' + esc(doorText(d)) + '</small>' + (d.k === 'boost' ? '<small>' + G.fmtTime(d.v) + '</small>' : '') + '</div></div>';
    }).join('') + '</div>';
    if (r.pick >= 0) {
      if (r.dead) h += '<div class="jend bad"><b><span>🐍</span> Die Schlange hat dich erwischt!</b><p>Die Expedition ist vorbei. Deine Beute darfst du behalten.</p></div>';
      else if (r.won) h += '<div class="jend good"><b><span>🏆</span> Du hast alle 20 Stufen geschafft!</b><p>Als Belohnung bekommst du eine Galaxiekiste.</p></div>';
      h += '<button class="btn ' + (r.dead || r.won ? 'blue' : 'go') + ' wide" data-jg="next">' + (r.dead || r.won ? 'Fertig' : 'Weiter zu Stufe ' + (r.st + 1)) + '</button>';
    } else h += '<p class="hint center">Wähle eine Tür!</p>';
    h += '<h3 class="jlh">Deine Beute</h3>' + lootHtml(r.loot) + '</div>';
    return h;
  }

  /* ---------- Dschungel-Blatt ---------- */
  function artHtml() {
    var h = '<div class="card jarts"><h3>Verlorene Artefakte</h3><p class="hint">Irgendwo im Spiel sind 4 uralte Artefakte versteckt. Jedes gibt dir einen Bonus, solange das Dschungel-Event läuft.</p><div class="jpeds">';
    SI.ARTS.forEach(function (a) {
      var got = G.arts()[a.k];
      h += '<div class="jped' + (got ? ' got' : '') + '"><img src="' + A.artURL(a.k, !got) + '" alt=""><b>' + (got ? esc(a.n) : '???') + '</b><small>' + esc(a.d) + '</small></div>';
    });
    h += '</div><p class="num center jcount">' + G.artCount() + ' von ' + SI.ARTS.length + ' gefunden</p></div>';
    var w = !!G.S.waechter;
    h += '<div class="card jwaechter' + (w ? ' got' : '') + '"><img src="' + A.sheepURL(T.waechter, !w) + '" alt=""><div><h3>' + (w ? esc(T.waechter.n) : 'Der Dschungelwächter') + '</h3><p class="hint">' +
      (w ? 'Er gehört dir! +10 % Geld für immer, auch nach Rebirths und nach dem Event.' : 'Wer alle 4 Artefakte findet, bekommt dieses besondere Schaf. Es bleibt für immer, auch nach einem Rebirth und nach dem Event.') + '</p></div></div>';
    return h;
  }
  U.views.dschungel = function () {
    var h = '<div class="jhead"><span>🌴</span> Dschungel-Event · endet in <b class="num" id="jgLeft">' + G.fmtTime(left()) + '</b></div>';
    h += '<div class="tabs"><button class="' + (J.tab === 'art' ? 'on' : '') + '" data-jg="tab:art">Artefakte</button><button class="' + (J.tab === 'exp' ? 'on' : '') + '" data-jg="tab:exp">Tempel-Expedition</button></div>';
    h += J.tab === 'exp' ? expHtml() : artHtml();
    return { title: 'Dschungel', html: h };
  };
  function renderJ() { var sh = U.sheet(); if (sh && sh.name === 'dschungel') U.renderSheet(); U.hud(); }

  /* ---------- Admin: Umgebung für alle ---------- */
  var adminView = U.views.admin;
  U.views.admin = function () {
    var v = adminView();
    if (!U.admin()) return v;
    var e = SI.env;
    v.html = '<div class="card"><h3>Umgebung</h3><p class="hint">Gilt für alle Farmen. Im Dschungel gibt es Palmen, Tukane und Kolibris.</p>' +
      '<div class="seg envseg"><button class="' + (e !== 'dschungel' ? 'on' : '') + '" data-jg="env:wiese"><span>🌼</span> Wiese</button><button class="' + (e === 'dschungel' ? 'on' : '') + '" data-jg="env:dschungel"><span>🌴</span> Dschungel</button></div></div>' + v.html;
    return v;
  };
  function adminEnv(e) {
    if (J.busy || !tok()) return; J.busy = true;
    N.jungle.setEnv(tok(), e).then(function () {
      setEnv(e); SFX('trumpet'); U.toast(e === 'dschungel' ? 'Alle Farmen sind jetzt im Dschungel!' : 'Alle Farmen sind jetzt wieder auf der Wiese!');
    }).catch(function (er) { SFX('cant'); U.toast(N.errText(er)); }).then(function () { J.busy = false; U.renderSheet(); });
  }

  /* ---------- Geld-Übersicht (Kai: Tippen auf das Geld oben links) ---------- */
  function moneyModal() {
    var base = 0, plain = 0;
    G.S.pens.forEach(function (p, i) { if (!p) return; base += G.penIncome(i); plain += Math.min(p.n || 0, G.penCap(p.lvl)) * T[p.t].inc * G.penMult(p.lvl); });
    var sheepN = G.S.pens.reduce(function (a, p) { return a + (p ? Math.min(p.n || 0, G.penCap(p.lvl)) : 0); }, 0);
    var rows = [], run = base;
    function mult(ic, name, m, note) {
      if (m === 1) return;
      var add = run * (m - 1); run *= m;
      rows.push('<div class="mrow"><span class="mi">' + ic + '</span><span class="mn">' + esc(name) + (note ? '<small>' + esc(note) + '</small>' : '') + '</span><b class="num ' + (m < 1 ? 'neg' : '') + '">' + (m < 1 ? '−' : '+') + fmt(Math.abs(add)) + '<small>' + (m < 1 ? '−' : '+') + Math.round(Math.abs(m - 1) * 100) + ' %</small></b></div>');
    }
    var gc = G.card('gold');
    mult('🃏', 'Goldkiste-Karten', 1 + 0.05 * gc, gc + (gc === 1 ? ' Karte' : ' Karten'));
    mult('🌺', 'Deko auf der Farm', 1 + G.dekoBonus(), G.S.dekoPlaced.length + ' Sachen');
    mult('📖', 'Sammel-Bonus', 1 + G.setBonus(), G.setsDone().length + ' Seltenheiten komplett');
    mult('🏺', 'Verlorene Artefakte', 1 + G.artMoney(), '');
    mult('🌴', 'Dschungelwächter', G.waechterMult(), '');
    mult('🔄', 'Rebirth', G.rbMult(), 'Rebirth ' + G.S.rebirths);
    mult('⚡', 'Geld-Booster', G.boostMult(), G.boostLeft() > 0 ? 'noch ' + G.fmtTime(G.boostLeft()) : '');
    if (G.wolfActive) mult('🐺', 'Wolf auf der Farm', 0.5, 'Verjag ihn!');
    var h = '<div class="modal moneym"><h2>Dein Geld pro Sekunde</h2>' +
      '<div class="mrow mbase"><span class="mi">🐑</span><span class="mn">Deine Schafe<small>' + sheepN + ' Schafe in Gehegen</small></span><b class="num">' + fmt(plain) + '</b></div>' +
      (base > plain ? '<div class="mrow"><span class="mi">✨</span><span class="mn">Mutationen<small>Glänzend und Regenbogen</small></span><b class="num">+' + fmt(base - plain) + '</b></div>' : '') +
      (rows.length ? '<div class="msep">Boni</div>' + rows.join('') : '<p class="hint">Noch keine Boni. Deko, Karten und Rebirths geben dir mehr Geld.</p>') +
      '<div class="mrow mtot"><span class="mi"><img src="' + A.iconURL('coin') + '" alt=""></span><span class="mn">Zusammen</span><b class="num">' + fmt(G.income()) + '/Sek.</b></div>' +
      '<div class="btns"><button class="btn" data-act="close">Okay</button></div></div>';
    SFX('coin'); U.modal(h);
  }

  /* ---------- Update-Nachricht beim ersten Start (Kai: ohne wie man Artefakte bekommt) ---------- */
  function updateNotice() {
    if (!on() || G.S.seenJungle) return;
    var iv = setInterval(function () {
      if (U.modalOpen() || document.querySelector('#tut')) return;
      if (G.S.seenJungle || !on()) { clearInterval(iv); return; }
      clearInterval(iv); G.S.seenJungle = 1; U.saveLocal();
      var ex = SI.TYPES.filter(function (t) { return t.jg && !t.special; }).slice(0, 4).map(function (t) { return '<img src="' + A.sheepURL(t) + '" alt="">'; }).join('');
      U.modal('<div class="modal jupd"><div class="jupbanner"><span>🌴</span> Dschungel-Update!</div><div class="jupsheep">' + ex + '</div>' +
        '<div class="jupl">' + [
          ['🐆', SI.TYPES.filter(function (t) { return t.jg && !t.special; }).length + ' neue Dschungel-Schafe', 'Dazu gibt es die neue Seltenheit Exotisch.'],
          ['📦', 'Dschungelkiste', 'Die neue Kiste findest du bei den Mystery-Boxen.'],
          ['🌺', 'Dschungel-Deko', 'Bambus, Totem, Wasserfall und mehr.'],
          ['🛕', 'Tempel-Expedition', 'Ein alter Tempel steht jetzt auf deiner Farm. Wage dich durch 20 Stufen mit je 4 Türen, aber pass auf die Schlange auf!'],
          ['🏺', '4 Verlorene Artefakte', 'Sie sind irgendwo versteckt. Jedes gibt dir einen Bonus: mehr Glück in Kisten, schnellere Zucht oder mehr Geld.'],
          ['🌴', 'Dschungelwächter', 'Wer alle 4 Artefakte findet, bekommt dieses besondere Schaf. Es bleibt für immer.'],
          ['💰', 'Tipp', 'Tippe oben links auf dein Geld, dann siehst du, woher es kommt.']
        ].map(function (x) { return '<p><i>' + x[0] + '</i><span><b>' + x[1] + '</b><span>' + x[2] + '</span></span></p>'; }).join('') + '</div>' +
        '<p class="hint center">Das Event läuft noch ' + G.fmtTime(left()) + ' lang. Danach sind die Artefakte und die Expedition weg.</p>' +
        '<div class="btns"><button class="btn ghost" data-act="close">Später</button><button class="btn go" data-act="closeOpen:dschungel">Los geht\'s!</button></div></div>',
      function (ov) { SFX('trumpet'); U.confetti(ov.querySelector('.modal'), 60, '#2fd08a'); });
    }, 700);
  }

  /* ---------- Klicks und Takt ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.money') && U.me() && !U.modalOpen()) { moneyModal(); return; }
    var el = e.target.closest('[data-jg]'); if (!el || el.disabled) return;
    var p = el.dataset.jg.split(':'), a = p[0], arg = p[1];
    if (a === 'tab') { if (J.tab !== arg) SFX('tab'); J.tab = arg; renderJ(); }
    else if (a === 'start') startRun();
    else if (a === 'door') pickDoor(+arg);
    else if (a === 'next') nextStage();
    else if (a === 'env') { SFX('click'); adminEnv(arg); }
  });
  function chip() {
    var c = $('#jgChip'); if (c) c.hidden = !on();
    var d = $('#dotJg'); if (d) d.hidden = !(on() && (jg().plays || 0) === 0);
  }
  setInterval(function () {
    if (!U.me()) return;
    chip();
    var sh = U.sheet();
    if (sh && sh.name === 'dschungel') {
      if (!on()) { U.closeSheet(); U.toast('Das Dschungel-Event ist vorbei.'); return; }
      var l = $('#jgLeft'); if (l) l.textContent = G.fmtTime(left());
    }
  }, 1000);
  setInterval(function () { if (U.me()) { loadEnv(); loadNews(false); } }, 60000);

  var prevEnter = U.onEnter;
  U.onEnter = function () {
    if (prevEnter) prevEnter();
    loadEnv(); loadNews(true); chip(); updateNotice();
    F.cb.temple = function () {
      if (on()) { SFX('chime'); J.tab = 'art'; U.openSheet('dschungel'); }
      else if (G.S.waechter) { SFX('chime'); U.toast('Der Dschungelwächter bewacht deine Farm: +10 % Geld für immer!'); }
    };
  };
  SI.jg = { found: found, money: moneyModal, setEnv: setEnv, rollDoors: rollDoors, state: J };
})(window.SI);
