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

  /* ---------- Artefakt gefunden (Kai: sehr sehr krasse Animation) ---------- */
  // Bildschirm wird dunkel, alles bebt und lädt sich in der Farbe des Artefakts auf, dann ein riesiger Knall
  function cine(o) {
    U.modal('<div class="modal artcine charge" style="--ac:' + o.col + '"><div class="acbg"></div><div class="acrays"></div><div class="acrays r2"></div><div class="acparts"></div>' +
      '<div class="acstage"><div class="acorb"></div><img class="acpic" src="' + o.shadow + '" alt=""></div>' +
      '<div class="acinfo"><div class="actop">' + o.top + '</div><h2 class="acname">' + esc(o.name) + '</h2>' + o.body + '<div class="btns"><button class="btn ' + (o.btn || 'go') + '" data-act="close">' + (o.ok || 'Super!') + '</button></div></div></div>',
    function (ov) {
      var md = ov.querySelector('.artcine'), parts = md.querySelector('.acparts');
      SFX('artroll');
      for (var i = 0; i < 46; i++) { // Funken fliegen zur Mitte
        var p = document.createElement('i'), a = Math.random() * 6.283, d = 160 + Math.random() * 260;
        p.style.setProperty('--x', Math.cos(a) * d + 'px'); p.style.setProperty('--y', Math.sin(a) * d + 'px'); p.style.animationDelay = (Math.random() * 1.8) + 's';
        parts.appendChild(p);
      }
      if (navigator.vibrate) try { navigator.vibrate([30, 80, 30, 70, 40, 60, 50, 50, 60, 40, 80]); } catch (e) { /* egal */ }
      setTimeout(function () {
        if (!md.isConnected) return;
        md.classList.remove('charge'); md.classList.add('boom');
        md.querySelector('.acpic').src = o.pic;
        SFX('artboom'); U.flash('#ffffff'); setTimeout(function () { U.flash(o.col); }, 180);
        document.body.classList.remove('quake'); void document.body.offsetWidth; document.body.classList.add('quake');
        setTimeout(function () { document.body.classList.remove('quake'); }, 800);
        var st = md.querySelector('.acstage');
        for (var w = 0; w < 4; w++) { var sw = document.createElement('div'); sw.className = 'shockwave'; sw.style.animationDelay = (w * 0.16) + 's'; sw.style.borderColor = w % 2 ? '#fff' : o.col; st.appendChild(sw); }
        U.sparks(st, 80); U.confetti(md, 110, o.col);
        [600, 1200, 1900].forEach(function (d) { setTimeout(function () { if (md.isConnected) { U.confetti(md, 50, d === 1200 ? '#ffd23f' : o.col); U.sparks(st, 30); } }, d); });
        if (navigator.vibrate) try { navigator.vibrate([200, 60, 120, 60, 300]); } catch (e) { /* egal */ }
        if (o.after) o.after(md);
      }, 2300);
    });
  }
  function slots(k) {
    return '<div class="acslots">' + SI.ARTS.map(function (a) { var got = G.arts()[a.k]; return '<span class="' + (got ? 'got' : '') + (a.k === k ? ' new' : '') + '" style="--sc:' + a.col + '"><img src="' + A.artURL(a.k, !got) + '" alt=""></span>'; }).join('') + '</div>';
  }
  function found(x) {
    if (!x || !x.a) return;
    cine({ col: x.a.col, pic: A.artURL(x.k), shadow: A.artURL(x.k, true), name: x.a.n,
      top: '<span class="actag">Verlorenes Artefakt gefunden!</span><span class="actype">' + esc(x.a.t) + '</span>',
      body: '<p class="acbonus">' + esc(x.a.d) + '</p>' + slots(x.k) + '<div class="artcnt num">' + G.artCount() + ' von ' + SI.ARTS.length + ' Artefakten</div>' +
        '<p class="hint">Es steht jetzt in deinem Tempel auf der Farm.</p>' });
    if (x.waechter) waechterModal();
    var t = tok();
    if (t) {
      N.jungle.add(t, x.k).catch(function () {});
      if (x.waechter) setTimeout(function () { N.jungle.add(t, 'waechter').catch(function () {}); }, 800);
    }
    U.saveLocal(); U.saveCloud(); U.refresh();
  }
  function waechterModal() {
    cine({ col: '#ffd23f', pic: A.sheepURL(T.waechter), shadow: A.sheepURL(T.waechter, true), name: T.waechter.n, btn: 'coin', ok: 'Wow!',
      top: '<span class="actag">Alle 4 Artefakte!</span>',
      body: '<p>Der Wächter des Dschungels hat dich auserwählt!</p><p class="jwbig">+10 % Geld für immer</p><p>Er bleibt auch nach einem Rebirth und nach dem Event bei dir.</p><p class="hint">Er wohnt oben auf deinem Tempel.</p>',
      after: function () { setTimeout(function () { SFX('trumpet'); }, 700); } });
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
    // Kai: Jede Tür (außer der Schlange) hat auf jeder Stufe 0,55 % Chance auf das Smaragd-Amulett
    if (!G.arts().amulett) {
      for (var a = 0; a < 4; a++) if (a !== snake && Math.random() < 0.0055) { doors[a] = { k: 'amulett' }; break; }
    }
    doors.forEach(function (d) {
      if (d.k === 'coins') d.v = Math.max(150 * st, Math.ceil(incNow() * stageSec(st)));
      if (d.k === 'box') d.v = stageBox(st);
      if (d.k === 'boost') d.v = 60 * Math.max(2, Math.round(st * 1.5));
      if (d.k === 'deko') d.v = stageDeko(st);
    });
    return doors;
  }
  /* ---------- Tempel-Expedition im Vollbild (Kai: 100 mal cooler) ---------- */
  var X = { open: false, el: null, cv: null, raf: 0, t0: 0, busy: false, parts: [], torchT: 0 };
  function startRun() {
    if (!on()) return;
    var s = jg(), c = playCost();
    if (s.run) { xRender(); return; }
    if (s.plays >= MAXPLAY) { U.toast('Für heute hast du alle ' + MAXPLAY + ' Expeditionen gemacht. Morgen geht es weiter!'); return; }
    if (G.S.coins < c) { SFX('cant'); U.toast('Dir fehlen noch ' + fmt(c - G.S.coins) + ' Münzen.'); return; }
    G.S.coins -= c; s.plays++;
    s.run = { st: 1, doors: rollDoors(1), pick: -1, loot: { coins: 0, box: 0, boost: 0, deko: 0 } };
    G.S.stats.jgRuns = (G.S.stats.jgRuns || 0) + 1;
    U.saveLocal(); U.hud(); xRender(); stageIntro();
  }
  function doorPic(d) {
    if (d.k === 'coins') return '<img src="' + A.iconURL('coin') + '" alt="">';
    if (d.k === 'box') return '<img src="' + A.boxURL(d.v) + '" alt="">';
    if (d.k === 'deko') return '<img src="' + A.boxURL('g' + d.v) + '" alt="">';
    if (d.k === 'amulett') return '<img src="' + A.artURL('amulett') + '" alt="">';
    if (d.k === 'boost') return '<span class="dic">⚡</span>';
    return '<img class="xsnk" src="' + A.snakeURL() + '" alt="">';
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
    var s = jg(), r = s.run; if (!r || r.pick >= 0 || !r.doors[i] || X.busy) return;
    r.pick = i; var d = r.doors[i];
    X.busy = true; SFX('xopen');
    if (d.k === 'snake') {
      r.dead = 1;
      G.S.stats.jgBest = Math.max(G.S.stats.jgBest || 0, r.st - 1);
    } else {
      if (d.k === 'coins') { G.earn(d.v); r.loot.coins += d.v; }
      if (d.k === 'boost') { G.addBoost(d.v); r.loot.boost += d.v; }
      if (d.k === 'box') { r.loot.box++; d.res = G.openBox(d.v, true); }
      if (d.k === 'deko') { r.loot.deko++; d.res = G.giveDeko(d.v); }
      if (d.k === 'amulett') d.res = G.giveArt('amulett');
      G.S.stats.jgBest = Math.max(G.S.stats.jgBest || 0, r.st);
      if (r.st >= STAGES) { r.won = 1; G.S.stats.jgWins = (G.S.stats.jgWins || 0) + 1; }
    }
    U.saveLocal(); U.hud();
    // Animation: Tür geht auf, dann Belohnung oder Schlange, danach die anderen Türen
    var dEl = X.el.querySelectorAll('.xdoor')[i];
    dEl.classList.add('opening');
    setTimeout(function () {
      xRender(true);
      var pk = X.el.querySelector('.xdoor.picked');
      if (d.k === 'snake') {
        SFX('xsnake'); X.el.classList.remove('shake'); void X.el.offsetWidth; X.el.classList.add('shake', 'redout');
        if (navigator.vibrate) try { navigator.vibrate([250, 80, 250]); } catch (e) { /* egal */ }
        var sn = document.createElement('img'); sn.className = 'xlunge'; sn.src = A.snakeURL(); X.el.appendChild(sn);
        setTimeout(function () { sn.remove(); }, 1600);
      } else {
        SFX('xreward'); if (d.k === 'coins') SFX('sell'); if (d.k === 'boost') SFX('star');
        burst(pk, d.k === 'amulett' ? '#2fd08a' : '#ffd23f', d.k === 'amulett' ? 60 : 30);
      }
      setTimeout(function () {
        X.el.querySelectorAll('.xdoor:not(.picked)').forEach(function (e, k) { setTimeout(function () { e.classList.add('reveal'); SFX('pop'); }, k * 140); });
      }, 700);
      setTimeout(function () {
        X.busy = false; xRender(true);
        if (d.k === 'box' && d.res) U.sheepReveal(d.res, '', 'Expedition · ');
        if (d.k === 'deko' && d.res) { SFX('reveal', d.v); U.dekoReveal(d.res, d.v); }
        if (d.k === 'amulett' && d.res) found(d.res);
        if (r.won) winShow();
      }, 1300);
    }, 650);
  }
  function nextStage() {
    var s = jg(), r = s.run; if (!r || r.pick < 0 || X.busy) return;
    if (r.dead || r.won || r.st >= STAGES) { s.run = null; U.saveLocal(); xRender(); return; }
    r.st++; r.doors = rollDoors(r.st); r.pick = -1; U.saveLocal(); xRender(); stageIntro();
  }
  function winShow() {
    var gb = G.openBox('galaxie', true); // Kai: am Ende immer eine Galaxiekiste
    SFX('xwin'); U.flash('#ffe066');
    var w = document.createElement('div'); w.className = 'xwin'; w.innerHTML = '<div class="xwr"></div><b>GESCHAFFT!</b><small>Alle 20 Stufen!</small>';
    X.el.appendChild(w); U.confetti(X.el, 140, '#ffd23f');
    setTimeout(function () { w.remove(); if (gb) U.sheepReveal(gb, '', 'Expedition geschafft! · '); }, 2600);
  }
  function stageIntro() {
    var r = jg().run; if (!r || !X.el) return;
    var b = document.createElement('div'); b.className = 'xbanner' + (SAFE[r.st] ? ' safe' : '');
    b.innerHTML = '<b>Stufe ' + r.st + '</b><small>' + (SAFE[r.st] ? 'Sicher: keine Schlange!' : 'Eine Tür hat eine Schlange') + '</small>';
    X.el.appendChild(b); SFX('xstage');
    setTimeout(function () { b.remove(); }, 1500);
  }
  function burst(el, col, n) {
    if (!el) return; var r = el.getBoundingClientRect(), xr = X.el.getBoundingClientRect();
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i'); p.className = 'xspark'; var a = Math.random() * 6.283, d = 60 + Math.random() * 140;
      p.style.left = (r.left - xr.left + r.width / 2) + 'px'; p.style.top = (r.top - xr.top + r.height * 0.45) + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px'); p.style.background = i % 3 ? col : '#fff';
      X.el.appendChild(p); (function (p) { setTimeout(function () { p.remove(); }, 1200); })(p);
    }
  }
  function lootHtml(l) {
    var p = [];
    if (l.coins) p.push('<span><img src="' + A.iconURL('coin') + '" alt="">' + fmt(l.coins) + '</span>');
    if (l.box) p.push('<span><i>📦</i>' + l.box + '× Kiste</span>');
    if (l.deko) p.push('<span><i>🎁</i>' + l.deko + '× Deko</span>');
    if (l.boost) p.push('<span><i>⚡</i>' + G.fmtTime(l.boost) + '</span>');
    return p.length ? p.join('') : '<em>Noch keine Beute.</em>';
  }
  function xHtml(keep) {
    var s = jg(), r = s.run, h = '<button class="xclose" data-jg="xclose" aria-label="Schließen">✕</button>';
    if (!r) {
      var c = playCost(), n = s.plays || 0;
      h += '<div class="xstart"><img class="xtemple" src="' + A.templeURL() + '" alt=""><h1 class="xtitle">Tempel-Expedition</h1>' +
        '<p>Im alten Tempel warten auf jeder der 20 Stufen 4 Türen. Hinter den Türen gibt es Münzen, Kisten, Deko und Geld-Booster. Aber Vorsicht: Hinter einer Tür lauert eine Schlange! Dann ist die Expedition vorbei, aber du behältst alles, was du gefunden hast.</p>' +
        '<p class="xhint">Auf Stufe 1, 5, 10, 15 und 20 gibt es keine Schlange. Je weiter du kommst, desto besser werden die Belohnungen. Wer alle 20 Stufen schafft, bekommt immer eine Galaxiekiste!</p>' +
        '<div class="xplays num">Heute gespielt: <b>' + n + ' von ' + MAXPLAY + '</b></div>';
      if (n >= MAXPLAY) h += '<p class="xhint">Für heute bist du fertig. Morgen geht es weiter!</p>';
      else if (c === 0) h += '<button class="btn go xgo" data-jg="start"><span>🎁</span> Gratis starten</button>';
      else h += '<button class="btn coin xgo" data-jg="start" data-cost="' + c + '">Nochmal starten · <span class="num">' + fmt(c) + '</span></button><p class="xhint">Jede weitere Expedition heute kostet mehr.</p>';
      if (G.S.stats.jgBest) h += '<p class="xhint num">Dein Rekord: Stufe ' + G.S.stats.jgBest + '</p>';
      return h + '</div>';
    }
    var path = '';
    for (var i = 1; i <= STAGES; i++) path += '<i class="' + (i < r.st || (i === r.st && r.pick >= 0 && !r.dead) ? 'ok' : i === r.st ? 'now' : '') + (SAFE[i] ? ' safe' : '') + (r.dead && i === r.st ? ' dead' : '') + '">' + (i === STAGES ? '<span>🏆</span>' : SAFE[i] ? '<span>🌿</span>' : '') + '</i>';
    h += '<div class="xhead"><b class="xst">Stufe ' + r.st + ' von ' + STAGES + '</b>' + (SAFE[r.st] ? '<span class="xsafe">Sicher: keine Schlange!</span>' : '<span class="xdanger"><img src="' + A.snakeURL() + '" alt="">Eine Tür hat eine Schlange</span>') + '</div>';
    h += '<div class="xpath">' + path + '</div>';
    h += '<div class="xdoors">' + r.doors.map(function (d, k) {
      var open = r.pick >= 0, cls = 'xdoor d' + k + (open ? ' isopen' : '') + (open && k === r.pick ? ' picked' : '') + (open && keep && k !== r.pick && !X.busy ? ' reveal' : '') + (d.k === 'snake' ? ' snake' : '') + (d.k === 'amulett' ? ' art' : '');
      return '<div class="' + cls + '"' + (open ? '' : ' data-jg="door:' + k + '" role="button" tabindex="0"') + '>' +
        '<div class="xin"><div class="xglow"></div>' + (open ? doorPic(d) + '<small>' + esc(doorText(d)) + '</small>' + (d.k === 'boost' ? '<small>' + G.fmtTime(d.v) + '</small>' : '') : '') + '</div>' +
        '<img class="xslab" src="' + A.xdoorURL(k) + '" alt=""><img class="xarch" src="' + A.xarchURL(k) + '" alt=""></div>';
    }).join('') + '</div>';
    if (r.pick >= 0 && !X.busy) {
      if (r.dead) h += '<div class="xend bad"><b><img src="' + A.snakeURL() + '" alt="">Die Schlange hat dich erwischt!</b><p>Die Expedition ist vorbei. Deine Beute darfst du behalten.</p></div>';
      else if (r.won) h += '<div class="xend good"><b><span>🏆</span> Du hast alle 20 Stufen geschafft!</b><p>Als Belohnung bekommst du eine Galaxiekiste.</p></div>';
      h += '<button class="btn ' + (r.dead || r.won ? 'blue' : 'go') + ' xgo xnext" data-jg="next">' + (r.dead || r.won ? 'Fertig' : 'Weiter zu Stufe ' + (r.st + 1)) + '</button>';
    } else if (r.pick < 0) h += '<p class="xpick">Wähle eine Tür!</p>';
    h += '<div class="xloot"><b>Deine Beute</b><div>' + lootHtml(r.loot) + '</div></div>';
    return h;
  }
  function xRender(keep) { if (!X.el) return; X.el.querySelector('.xui').innerHTML = xHtml(keep); renderJ(); }
  function xOpen() {
    if (!on()) return;
    U.closeSheet();
    if (!X.el) {
      X.el = document.createElement('div'); X.el.id = 'jgx';
      X.el.innerHTML = '<canvas class="xbg"></canvas><div class="xvig"></div><div class="xui"></div>';
      document.body.appendChild(X.el); X.cv = X.el.querySelector('.xbg');
      X.el.addEventListener('animationend', function (e) { if (e.target === X.el) X.el.classList.remove('shake', 'redout'); });
    }
    X.el.hidden = false; X.open = true; X.t0 = performance.now(); document.body.classList.add('inx');
    if (SI.sfx.force) SI.sfx.force('Tempelabenteuer');
    SFX('xstage'); xRender(); loop();
  }
  function xClose() {
    if (!X.el || X.busy) return;
    X.el.hidden = true; X.open = false; cancelAnimationFrame(X.raf); document.body.classList.remove('inx');
    if (SI.sfx.force) SI.sfx.force(null);
    SFX('close'); U.refresh();
  }
  // Hintergrund: Tempelhalle mit Fackeln, Lianen, Glühwürmchen und Nebel
  function loop() {
    if (!X.open) return;
    X.raf = requestAnimationFrame(loop);
    var cv = X.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); X.wall = null; }
    var g = cv.getContext('2d'), t = (performance.now() - X.t0) / 1000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!X.wall) X.wall = wallImg(W, H, dpr);
    g.drawImage(X.wall, 0, 0, W, H);
    // Fackeln links und rechts
    [[W * 0.07, H * 0.34], [W * 0.93, H * 0.34]].forEach(function (p, k) {
      var fl = 0.85 + Math.sin(t * 9 + k * 2) * 0.08 + Math.sin(t * 23 + k) * 0.05;
      var lg = g.createRadialGradient(p[0], p[1], 4, p[0], p[1], Math.min(W, H) * 0.55 * fl);
      lg.addColorStop(0, 'rgba(255,170,60,.45)'); lg.addColorStop(0.4, 'rgba(255,120,30,.14)'); lg.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
      g.fillStyle = '#3a2a18'; g.fillRect(p[0] - 4, p[1], 8, 34); g.fillStyle = '#5a4026'; g.fillRect(p[0] - 9, p[1] - 4, 18, 8);
      for (var f = 0; f < 3; f++) {
        var fh = (26 - f * 7) * fl, fw = 10 - f * 3, cx = p[0] + Math.sin(t * 12 + f + k) * 2;
        g.fillStyle = ['#ff6a1a', '#ffb02e', '#fff2a8'][f];
        g.beginPath(); g.moveTo(cx - fw, p[1] - 4); g.quadraticCurveTo(cx - fw, p[1] - fh * 0.6, cx + Math.sin(t * 15 + f) * 3, p[1] - 4 - fh); g.quadraticCurveTo(cx + fw, p[1] - fh * 0.6, cx + fw, p[1] - 4); g.closePath(); g.fill();
      }
    });
    // Lianen von oben
    for (var v = 0; v < 9; v++) {
      var vx = (v + 0.5) / 9 * W + Math.sin(v * 7.1) * 30, len = H * (0.12 + ((v * 37) % 10) / 45), sw = Math.sin(t * 0.8 + v) * 10;
      g.strokeStyle = '#1f5a24'; g.lineWidth = 4; g.beginPath(); g.moveTo(vx, -5); g.quadraticCurveTo(vx + sw, len * 0.5, vx + sw * 1.4, len); g.stroke();
      for (var l = 1; l < 6; l++) {
        var ly = len * l / 6, lx = vx + sw * 1.4 * (l / 6) * (l / 6) * 2 * 0.5 + sw * (l / 6) * 0.3;
        g.fillStyle = l % 2 ? '#2f8a34' : '#3fa645'; g.save(); g.translate(lx, ly); g.rotate((l % 2 ? 0.8 : -0.8) + Math.sin(t + l) * 0.1);
        g.beginPath(); g.ellipse(l % 2 ? 7 : -7, 0, 8, 3.5, 0, 0, 6.283); g.fill(); g.restore();
      }
    }
    // Glühwürmchen
    if (X.parts.length < 40) X.parts.push({ x: Math.random() * W, y: H * (0.3 + Math.random() * 0.7), vx: (Math.random() - 0.5) * 12, vy: -6 - Math.random() * 14, ph: Math.random() * 6 });
    X.parts.forEach(function (p) {
      p.x += p.vx / 60; p.y += p.vy / 60; p.ph += 0.05; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      var a = 0.4 + Math.sin(p.ph * 2) * 0.4; g.fillStyle = 'rgba(200,255,120,' + a.toFixed(2) + ')';
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(200,255,120,' + (a * 0.25).toFixed(2) + ')'; g.beginPath(); g.arc(p.x, p.y, 7, 0, 6.283); g.fill();
    });
    // Nebel unten
    var mg = g.createLinearGradient(0, H * 0.75, 0, H); mg.addColorStop(0, 'rgba(120,180,140,0)'); mg.addColorStop(1, 'rgba(120,180,140,' + (0.22 + Math.sin(t * 0.7) * 0.05).toFixed(2) + ')');
    g.fillStyle = mg; g.fillRect(0, H * 0.75, W, H * 0.25);
    if (t - X.torchT > 0.7) { X.torchT = t; if (SI.sfx.torch && Math.random() < 0.6) SI.sfx.torch(); }
  }
  function wallImg(W, H, dpr) {
    var c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    var g = c.getContext('2d'), R = A.rng(5); g.scale(dpr, dpr);
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16201a'); bg.addColorStop(0.55, '#2a2f22'); bg.addColorStop(1, '#141810');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var bh = 34, bw = 70;
    for (var y = 0; y < H; y += bh) for (var x = -((y / bh) % 2) * bw / 2; x < W; x += bw) {
      var sh = 0.05 + R() * 0.09; g.fillStyle = 'rgba(255,240,200,' + sh.toFixed(3) + ')'; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, bw - 4, bh - 4);
      if (R() < 0.12) { g.fillStyle = 'rgba(70,140,60,.35)'; g.beginPath(); g.ellipse(x + R() * bw, y + bh - 3, 10 + R() * 14, 4, 0, 0, 6.283); g.fill(); }
    }
    // große Steinfratze in der Mitte hinten
    g.save(); g.globalAlpha = 0.18; g.translate(W / 2, H * 0.2); g.fillStyle = '#e8d8a8';
    g.beginPath(); g.arc(0, 0, 60, 0, 6.283); g.fill(); g.fillStyle = '#141810';
    g.fillRect(-34, -14, 22, 12); g.fillRect(12, -14, 22, 12); g.fillRect(-24, 24, 48, 10); g.restore();
    return c;
  }
  function expHtml() {
    var s = jg(), n = s.plays || 0;
    return '<div class="card jexp"><img class="jtemple" src="' + A.templeURL() + '" alt=""><h3>Tempel-Expedition</h3>' +
      '<p class="hint center">20 Stufen, 4 Türen und eine Schlange. Am Ende wartet eine Galaxiekiste!</p>' +
      '<div class="jplays num">Heute gespielt: <b>' + n + ' von ' + MAXPLAY + '</b></div>' +
      '<button class="btn go wide xenter" data-jg="xopen"><span>🛕</span> ' + (s.run ? 'Weiter spielen' : 'Zum Tempel') + '</button></div>';
  }

  /* ---------- Dschungel-Blatt ---------- */
  function artHtml() {
    var h = '<div class="card jarts"><h3>Verlorene Artefakte</h3><p class="hint">Irgendwo im Spiel sind 4 uralte Artefakte versteckt. Jedes gibt dir einen Bonus, solange das Dschungel-Event läuft.</p><div class="jpeds">';
    SI.ARTS.forEach(function (a) {
      var got = G.arts()[a.k];
      h += '<div class="jped' + (got ? ' got' : '') + '" style="--pc:' + a.col + '"><span class="jtype">' + esc(a.t) + '</span><img src="' + A.artURL(a.k, !got) + '" alt=""><b>' + (got ? esc(a.n) : '???') + '</b><small>' + esc(a.d) + '</small></div>';
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && X.open && !U.modalOpen()) xClose(); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('.money') && U.me() && !U.modalOpen()) { moneyModal(); return; }
    var el = e.target.closest('[data-jg]'); if (!el || el.disabled) return;
    var p = el.dataset.jg.split(':'), a = p[0], arg = p[1];
    if (a === 'tab') { if (J.tab !== arg) SFX('tab'); J.tab = arg; renderJ(); }
    else if (a === 'start') startRun();
    else if (a === 'xopen') xOpen();
    else if (a === 'xclose') xClose();
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
    if (X.open && !on()) { X.busy = false; xClose(); U.toast('Das Dschungel-Event ist vorbei.'); }
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
  SI.jg = { open: xOpen, close: xClose, found: found, money: moneyModal, setEnv: setEnv, rollDoors: rollDoors, state: J };
})(window.SI);
