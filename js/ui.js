/* Schaf-Imperium: Menüs, Login, Speichern, Spielschleife */
(function (SI) {
  'use strict';
  var G = SI.G, A = SI.art, N = SI.net, F = SI.farm, T = SI.T;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = G.fmt;
  var me = null;          // {username, token}
  var sheet = null;       // {name, arg}
  var picks = [], bookTab = 'schafe', boardTab = 'income';
  var modalQ = [], modalOpen = false;
  var started = false;

  /* ---------- kleine Bilder ---------- */
  function coinURL() {
    var c = document.createElement('canvas'); c.width = c.height = 96; var g = c.getContext('2d'); g.scale(3, 3);
    g.fillStyle = '#c98a12'; A.circ(g, 16, 17, 14); g.fillStyle = '#f5c542'; A.circ(g, 16, 15, 14);
    g.strokeStyle = 'rgba(120,80,0,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(16, 15, 10, 0, 7); g.stroke();
    g.fillStyle = '#fff'; [[12, 15, 4], [16, 12, 4.4], [20, 15, 4], [16, 17, 4.6]].forEach(function (p) { A.circ(g, p[0], p[1], p[2]); });
    g.fillStyle = '#5a3a00'; A.ell(g, 21.5, 14.5, 2.4, 2.8);
    return c.toDataURL();
  }
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="#e8a300" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="#ffd23f"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#ffe9a0"/></svg>';
  var ICON_STAR = '<svg width="15" height="15" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/></svg>';
  var ICON_HEART = '<svg class="heart" viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>';
  function rarBoxCol(r) { return r === 'taco' ? 'taco' : 'g' + r; }
  var SFX = function (n, a) { if (SI.sfx) SI.sfx.play(n, a); };

  /* ---------- Hinweise ---------- */
  function toast(msg) {
    if (/fehlen noch/.test(msg)) SFX('cant');
    var el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    $('#toasts').appendChild(el); setTimeout(function () { el.remove(); }, 2600);
    var all = $('#toasts').children; if (all.length > 2) all[0].remove();
  }
  function pop(x, y, txt) {
    var p = document.createElement('div'); p.className = 'pop'; p.textContent = txt;
    p.style.left = (x - 20) + 'px'; p.style.top = (y - 26) + 'px'; document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 900);
  }
  function modal(html, onOpen) { modalQ.push({ html: html, onOpen: onOpen }); if (!modalOpen) nextModal(); }
  function nextModal() {
    var m = modalQ.shift(), ov = $('#overlay');
    if (!m) { ov.hidden = true; ov.innerHTML = ''; modalOpen = false; return; }
    modalOpen = true; ov.hidden = false; ov.innerHTML = m.html;
    if (m.onOpen) m.onOpen(ov);
    var b = ov.querySelector('.btn'); if (b) b.focus({ preventScroll: true });
  }
  var pendingBurst = null;
  function closeModal() { SFX('close'); nextModal(); refresh(); if (pendingBurst && !modalOpen) { F.burst(pendingBurst[0], pendingBurst[1], pendingBurst[2]); pendingBurst = null; } }
  function sparks(box, n) {
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i'); s.className = 'spark'; var a = Math.random() * 6.283, d = 70 + Math.random() * 100;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.animationDelay = (Math.random() * 0.15) + 's'; if (i % 3 === 0) s.style.background = '#ffd23f';
      box.appendChild(s); (function (s) { setTimeout(function () { s.remove(); }, 1400); })(s);
    }
  }
  // Box öffnen: Wackeln (länger bei Seltenem), dann Blitz, Banner und Glitzer
  var BANNER = { e: 'EPISCH!', l: 'LEGENDÄR!', m: 'MYTHISCH!', s: 'GEHEIM!' };
  function flash(col) {
    var f = document.createElement('div'); f.className = 'flash'; f.style.background = col; document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 700);
  }
  function confetti(box, n, col) {
    var cols = [col, '#ffd23f', '#ffffff', '#5ab8ff', '#ff5f9a', '#6bf08a'];
    for (var i = 0; i < n; i++) {
      var c = document.createElement('i'); c.className = 'confetti';
      c.style.left = (Math.random() * 100) + '%'; c.style.background = cols[i % cols.length];
      c.style.animationDelay = (Math.random() * 0.5) + 's'; c.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      c.style.setProperty('--rx', (Math.random() * 720 - 360) + 'deg'); c.style.setProperty('--sx', (Math.random() * 80 - 40) + 'px');
      box.appendChild(c); (function (c) { setTimeout(function () { c.remove(); }, 3600); })(c);
    }
  }
  function reveal(o) {
    var rc = o.rc, again = o.again || '', r = o.r || 'c', rare = 'elms'.indexOf(r) >= 0;
    // Die Seltenheit sieht man beim Öffnen nur daran, wie lange und wie stark die Kiste wackelt (Kai)
    var wait = o.instant ? 10 : ({ c: 1000, r: 1300, e: 1800, l: 2400, m: 3000, s: 3000 }[r] || 1000);
    modal('<div class="modal reveal opening" style="--wait:' + wait + 'ms">' +
      '<div class="stage"><div class="rays" hidden></div><img class="shake shk-' + r + '" src="' + o.box + '" alt=""></div>' +
      (rare ? '<div class="banner" hidden>' + BANNER[r] + '</div>' : '') +
      '<div id="rvText" style="visibility:hidden;display:flex;flex-direction:column;gap:5px">' + o.body + '</div>' +
      (o.isNew ? '<span class="newtag" hidden>NEU!</span><div class="newribbon" hidden>' + (o.newText || 'Neu entdeckt!') + '</div>' : '') +
      '<div class="btns" id="rvBtns" style="visibility:hidden"><button class="btn" data-act="close">Super!</button>' + again + '</div></div>',
    function (ov) {
      if (!o.instant) SFX('shake', r);
      setTimeout(function () {
        var st = ov.querySelector('.stage'); if (!st) return;
        var md = ov.querySelector('.modal'); md.classList.remove('opening'); md.classList.add('rar-' + r); md.style.setProperty('--rc', rc);
        if (o.done) o.done();
        var im = st.querySelector('img'); im.className = 'pic'; im.src = o.pic;
        st.querySelectorAll('.rays').forEach(function (x) { x.hidden = false; });
        ov.querySelector('#rvText').style.visibility = 'visible'; ov.querySelector('#rvBtns').style.visibility = 'visible';
        var nt = ov.querySelector('.newtag'); if (nt) nt.hidden = false;
        var nr = ov.querySelector('.newribbon');
        if (nr) {
          nr.hidden = false; ov.querySelector('.modal').classList.add('isnew');
          setTimeout(function () { SFX('newItem'); }, rare ? 650 : 250);
          var sb = document.createElement('div'); sb.className = 'starburst'; st.appendChild(sb);
          if (!rare) { flash('#ffe066'); confetti(ov.querySelector('.modal'), 30, '#ffd23f'); }
        }
        var bn = ov.querySelector('.banner'); if (bn) bn.hidden = false;
        sparks(st, rare ? 60 : 24);
        SFX(o.card ? 'card' : 'reveal', r);
        if (rare) {
          flash(rc); ov.querySelector('.modal').classList.add('boom');
          confetti(ov.querySelector('.modal'), r === 'e' ? 40 : 80, rc);
          if (navigator.vibrate) try { navigator.vibrate(r === 'e' ? 60 : r === 'l' ? [80, 40, 120] : [120, 50, 120, 50, 240]); } catch (e) { /* egal */ }
        }
        if ('lms'.indexOf(r) >= 0) { // ganz selten: noch krasser
          document.body.classList.remove('quake'); void document.body.offsetWidth; document.body.classList.add('quake');
          setTimeout(function () { document.body.classList.remove('quake'); }, 800);
          for (var w = 0; w < (r === 'l' ? 2 : 4); w++) { var sw = document.createElement('div'); sw.className = 'shockwave'; sw.style.animationDelay = (w * 0.18) + 's'; st.appendChild(sw); }
          if (r !== 'l') {
            var bm = document.createElement('div'); bm.className = 'beams'; st.insertBefore(bm, st.firstChild);
            setTimeout(function () { flash('#ffffff'); }, 260); setTimeout(function () { flash(rc); }, 520);
            [700, 1400].forEach(function (d) { setTimeout(function () { var mm = ov.querySelector('.modal'); if (mm) confetti(mm, 60, rc); }, d); });
          }
        }
      }, wait);
    });
  }
  function sheepReveal(res, again, label) {
    if (res.card) {
      reveal({ rc: '#e8a300', box: A.boxURL(res.box.k), pic: A.cardURL(), again: again, card: 1,
        body: '<div class="rlabel">Upgrade-Karte</div><h2>' + esc(res.card.n) + '</h2><p>' + esc(res.card.d) + ' · jetzt Stufe ' + G.card(res.card.k) + '</p>' });
      return;
    }
    var t = res.t, where = res.placed ? (res.built ? (G.pensOf(t.id).length > 1 ? ' · Gehege voll, ein weiteres Gehege wurde gebaut!' : ' · neues Gehege gebaut!') : '') : ' · wartet in der Scheune (kein Platz)';
    if (('elms'.indexOf(t.r) >= 0 || res.isNew || res.built) && res.placed) pendingBurst = [t.id, SI.RAR[t.r].col, res.pen];
    if (res.isNew) F.markNew(t.id);
    reveal({ rc: SI.RAR[t.r].col, r: t.r, box: res.box ? A.boxURL(res.box.k) : A.boxURL('herz'), pic: A.sheepURL(t), isNew: res.isNew, newText: label === 'Baby · ' ? 'Neues Baby-Schaf!' : 'Neues Schaf entdeckt!', again: again,
      big: 'lms'.indexOf(t.r) >= 0,
      body: '<div class="rlabel">' + (label || '') + SI.RAR[t.r].n + '</div><h2>' + esc(t.n) + '</h2><p class="num">+' + fmt(t.inc) + ' Münzen pro Sek.' + where + '</p>' });
  }
  // Deko erst im Lager zeigen, wenn die Kiste ganz offen ist (Kai)
  var hiddenDeko = {};
  function dekoReveal(res, r) {
    var d = res.deko;
    hiddenDeko[d.id] = (hiddenDeko[d.id] || 0) + 1;
    reveal({ done: function () { hiddenDeko[d.id] = Math.max(0, (hiddenDeko[d.id] || 0) - 1); if (sheet && sheet.name === 'deko') renderSheet(); }, rc: SI.RAR[d.r].col, r: d.r, box: A.boxURL(rarBoxCol(r)), pic: A.dekoURL(d), isNew: res.isNew, newText: 'Neue Deko entdeckt!', big: 'lm'.indexOf(d.r) >= 0,
      body: '<div class="rlabel">Deko · ' + SI.RAR[d.r].n + '</div><h2>' + esc(d.n) + '</h2><p>+' + Math.round(SI.DEKO_BONUS[d.r] * 100) + ' % Geld, wenn sie auf der Farm steht' + (d.light ? '. Leuchtet nachts!' : '.') + '</p>',
      again: '<button class="btn purple" data-act="placeNow:' + d.id + '">Gleich aufstellen</button>' });
  }

  /* ---------- Login ---------- */
  var lmode = 'login';
  function showLogin(msg) {
    $('#login').hidden = false;
    $('#testnote').hidden = N.online;
    $('#lerr').textContent = msg || '';
    var h = $('#herd'); if (!h.children.length) ['wiese', 'regen', 'feuer'].forEach(function (k) { var im = new Image(); im.src = A.sheepURL(T[k]); im.alt = ''; h.appendChild(im); });
  }
  function setLMode(m) {
    lmode = m;
    $('#tabLogin').classList.toggle('on', m === 'login'); $('#tabReg').classList.toggle('on', m === 'reg');
    $('#lpass2wrap').hidden = m !== 'reg';
    $('#lpass').setAttribute('autocomplete', m === 'reg' ? 'new-password' : 'current-password');
    $('#lbtn').textContent = m === 'reg' ? 'Account erstellen' : "Los geht's";
    $('#lerr').textContent = '';
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#lname').value.trim(), pw = $('#lpass').value;
    if (lmode === 'reg' && pw !== $('#lpass2').value) { $('#lerr').textContent = 'Die beiden Passwörter sind nicht gleich.'; return; }
    $('#lbtn').disabled = true; $('#lerr').textContent = '';
    var p = lmode === 'reg' ? N.register(name, pw) : N.login(name, pw);
    p.then(function (r) {
      var s = { token: r.token, username: r.username }; N.setSession(s);
      return N.load(s.token).then(function (d) { s.admin = !!d.admin; enterGame(s, d.save); });
    }).catch(function (err) { $('#lerr').textContent = N.errText(err); })
      .then(function () { $('#lbtn').disabled = false; });
  });

  /* ---------- Spiel starten ---------- */
  function backupKey() { return 'schaf_backup_' + me.username.toLowerCase(); }
  function enterGame(s, cloudSave) {
    me = s;
    var local = N.lsGet(backupKey(), null);
    var use = cloudSave;
    if (local && local.v === 2 && (!use || (local.lastSave || 0) > (use.lastSave || 0) + 2000)) use = local;
    G.adopt(use);
    $('#login').hidden = true;
    ['#hud', '#nav', '#zoom'].forEach(function (k) { $(k).hidden = false; });
    F.farmName = me.username + 's Farm';
    if (!started) {
      started = true;
      F.cb = { pop: pop, toast: toast, change: refresh, pen: openPen, empty: openEmpty, dekoTap: dekoTap, moved: dekoMoved, penMoved: penMoved, house: function () { openSheet('mehr'); },
        place: placeDeko, pickup: pickupDeko, merchant: spawnMerchant, merchantTap: function () { SFX('merchant'); openSheet('boxen'); }, busy: function () { return modalOpen; } };
      F.init($('#farm'));
      setInterval(tick, 250);
    }
    // Kein Offline-Geld: Geld gibt es nur, solange das Spiel offen ist
    var away = (Date.now() - (G.S.lastSave || Date.now())) / 1000;
    if (away > 60 && use) {
      toast('Willkommen zurück! Deine Schafe haben auf dich gewartet.');
    } else if (!use) {
      modal('<div class="modal"><img src="' + A.sheepURL(T.wiese) + '" alt="" style="width:120px;height:106px;align-self:center"><h2>Hallo ' + esc(me.username) + '!</h2>' +
        '<p>Das ist deine Farm. Dein erstes Wiesenschaf verdient schon Geld, auch wenn du nichts machst. Aber nur, solange das Spiel offen ist!</p>' +
        '<p class="hint">Wische über den Bildschirm, um dich umzusehen. Tippe auf Gehege zum Ausbauen. Über jedem Gehege steht in Grün, wie viel Geld es pro Sekunde macht. Neue Schafe gibt es in den Boxen.</p>' +
        '<div class="btns"><button class="btn coin" data-act="close">Los geht\'s!</button></div></div>');
    }
    $('#adminChip').hidden = !me.admin;
    showDaily();
    tacoNotice();
    saveLocal(); saveCloud(); checkInbox();
    refresh();
    if (SI.ui.onEnter) SI.ui.onEnter();
  }

  /* ---------- Speichern ---------- */
  var cloudBusy = false, lastCloud = 0;
  function saveLocal() { if (!me) return; G.S.lastSave = Date.now(); N.lsSet(backupKey(), G.S); }
  function saveCloud() {
    if (!me || cloudBusy) return; cloudBusy = true; lastCloud = Date.now();
    G.S.lastSave = Date.now();
    N.save(me.token, G.S, G.fullIncome(), G.S.playtime, G.S.rebirths).catch(function (e) {
      if ((e && e.message || '').indexOf('bad_token') >= 0) { N.setSession(null); toast('Bitte melde dich neu an.'); }
    }).then(function () { cloudBusy = false; });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { saveLocal(); saveCloud(); } });
  window.addEventListener('pagehide', function () { saveLocal(); saveCloud(); });

  /* ---------- Takt ---------- */
  var lastT = Date.now(), achT = 0, locT = 0, sheetT = 0;
  function tick() {
    var now = Date.now(), dt = Math.min((now - lastT) / 1000, 1); lastT = now; // nie nachholen, wenn das Spiel zu war
    if (!me) return;
    G.tick(dt, !document.hidden);
    if (SI.sfx && !document.hidden) SI.sfx.ambient(G.cycle().night, G.sheepCount());
    if (G.merch && now > G.merch.end) { G.merch = null; renderMerchant(); toast('Der Händler ist weitergezogen.'); }
    if ((achT += dt) > 3) { achT = 0; G.checkAch().forEach(function (x) { SFX('ach'); toast('Erfolg: ' + x.a.n + ' · +' + fmt(x.r) + ' Münzen'); }); }
    if ((locT += dt) > 5) { locT = 0; saveLocal(); }
    if (now - lastCloud > 20000) { saveCloud(); checkInbox(); }
    if ((sheetT += dt) >= 1) { sheetT = 0; liveSheet(); merchTime(); }
    hud();
  }
  function hud() {
    $('#coinNum').textContent = fmt(G.S.coins);
    var inc = $('#incNum'); inc.textContent = '+' + fmt(G.income()) + ' pro Sek.' + (G.wolfActive ? ' (Wolf!)' : '');
    inc.classList.toggle('bad', G.wolfActive);
    var c = G.cycle(), m = Math.floor(c.left / 60), s = Math.floor(c.left % 60);
    var ck = $('#clock'), want = c.night ? 'n' : 'd';
    if (ck.dataset.m !== want) { ck.dataset.m = want; ck.innerHTML = '<img src="' + A.iconURL(c.night ? 'mond' : 'sonne') + '" alt=""><span></span>'; }
    ck.lastChild.textContent = (c.night ? 'Nacht ' : 'Tag ') + m + ':' + (s < 10 ? '0' : '') + s;
    ck.classList.toggle('night', c.night); ck.classList.toggle('day', !c.night);
    var rb = $('#rbChip'); rb.hidden = !G.S.rebirths; rb.textContent = 'Rebirth ' + G.S.rebirths + ' · ×' + G.rbMult().toLocaleString('de-DE');
    document.querySelectorAll('[data-cost]').forEach(function (b) { b.classList.toggle('cant', G.S.coins < +b.dataset.cost); });
    $('#dotBox').hidden = !(G.S.coins >= G.boxPrice('holz') || G.merch);
    var sh = G.shopToday();
    $('#dotDeko').hidden = !(G.dekoInvCount() > 0 || sh.slots.some(function (x, i) { return sh.left(i) > 0 && G.S.coins >= G.dekoPrice(x.r); }));
    $('#dotZucht').hidden = !(G.S.breed && Date.now() >= G.S.breed.end);
    $('#dotMehr').hidden = !(G.dailyReady() || (!G.rebirthMax() && G.S.coins >= G.rebirthCost()));
    hudBottom();
  }
  // Händler-Banner und Hinweise immer unter die Knöpfe oben rechts schieben
  var lastHudB = 0;
  function hudBottom() {
    var c = document.querySelector('.hud .chips'); if (!c) return;
    var b = Math.round(c.getBoundingClientRect().bottom);
    if (b > 0 && b !== lastHudB) { lastHudB = b; document.documentElement.style.setProperty('--hudb', b + 'px'); }
  }
  function refresh() { hud(); if (sheet) renderSheet(); }

  /* ---------- Händler ---------- */
  function spawnMerchant() {
    var aff = SI.BOX.filter(function (b) { return G.boxPrice(b.k) * 0.5 <= Math.max(G.S.coins * 1.5, 200); });
    var pool = SI.BOX.slice(0, Math.min(SI.BOX.length, aff.length + 1));
    var b = G.rnd(pool); G.merch = { k: b.k, end: Date.now() + 60000, len: 60 };
    renderMerchant(); SFX('merchant'); toast('Ein Wanderhändler ist da!');
  }
  function renderMerchant() {
    var el = $('#merchant');
    document.body.classList.toggle('hasMerch', !!G.merch);
    if (!G.merch) { el.innerHTML = ''; return; }
    var b = SI.BK[G.merch.k];
    el.innerHTML = '<div class="merchant"><span class="mbang">!</span><img src="' + A.boxURL(b.k) + '" alt=""><div class="t"><span class="mtitle">Wanderhändler ist da!</span>' + esc(b.n) + ' zum halben Preis<small class="num" id="merchT"></small></div>' +
      '<button class="btn coin num" data-act="open:' + b.k + '" data-cost="' + G.boxPrice(b.k) + '">' + fmt(G.boxPrice(b.k)) + '</button><div class="mbar"><i id="merchBar"></i></div></div>';
    merchTime();
  }

  /* ---------- Blätter ---------- */
  var SHEET_SND = { code: 'settings', admin: 'trumpet', boxen: 'chest', deko: 'chime', zucht: 'heart', buch: 'page', mehr: 'pop', board: 'trumpet', settings: 'settings', pen: 'gate', empty: 'pop' };
  function openSheet(name, arg) {
    if (name === 'admin' && me && me.admin) loadCodes();
    if (!sheet || sheet.name !== name) SFX(SHEET_SND[name] || 'tab');
    sheet = { name: name, arg: arg };
    if (name === 'board') loadBoard();
    $('#sheet').dataset.kind = name;
    renderSheet(); $('#sheet').hidden = false;
    document.querySelectorAll('.nb').forEach(function (b) { b.classList.toggle('on', b.dataset.act === 'sheet:' + name); });
  }
  function closeSheet() { sheet = null; $('#sheet').hidden = true; document.querySelectorAll('.nb').forEach(function (b) { b.classList.remove('on'); }); }
  function renderSheet() {
    if (!sheet) return;
    var v = VIEWS[sheet.name](sheet.arg);
    $('#sheetTitle').textContent = v.title;
    var bd = $('#sheetBody'), st = bd.scrollTop;
    bd.innerHTML = v.html; bd.scrollTop = st;
    hud();
  }
  function liveSheet() {
    if (!sheet) return;
    if (sheet.name === 'zucht' && G.S.breed) {
      var br = G.S.breed, p = Math.min(1, (Date.now() - br.start) / (br.end - br.start));
      var bar = $('#breedBar'); if (bar) bar.style.width = (p * 100) + '%';
      var t = $('#breedT'); if (t) t.textContent = 'Noch ' + G.fmtTime((br.end - Date.now()) / 1000);
      if (p >= 1 && t) renderSheet();
    }
    if (sheet.name === 'settings') { var tn = $('#trackName'); if (tn) tn.textContent = SI.sfx.trackName(); }
    if (sheet.name === 'deko') { var n = $('#shopT'); if (n) n.textContent = untilMidnight(); }
    if (sheet.name === 'pen') { var inc = $('#penInc'); if (inc) inc.textContent = '+' + fmt(G.penIncome(sheet.arg) * G.globalMult()) + ' pro Sek.'; }
  }
  function merchTime() {
    if (!G.merch) return;
    var left = Math.max(0, (G.merch.end - Date.now()) / 1000);
    var m = $('#merchT'), sec = Math.ceil(left); if (m) m.textContent = 'Nur noch ' + Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2) + ' Min.!';
    var bar = $('#merchBar'); if (bar) bar.style.width = (left / (G.merch.len || 60) * 100) + '%';
  }
  function untilMidnight() { var d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); return 'Neue Kisten in ' + G.fmtTime((m - d) / 1000); }
  function costBtn(cost, act, label, cls) {
    return '<button class="btn ' + (cls || 'coin') + '" data-act="' + act + '" data-cost="' + cost + '">' + label + ' · <span class="num">' + fmt(cost) + '</span></button>';
  }
  function tagR(r, txt) { return '<span class="tag rc-' + r + '">' + (txt || SI.RAR[r].n) + '</span>'; }

  var VIEWS = {};
  VIEWS.boxen = function () {
    var h = '';
    var barn = G.barn();
    if (barn.length) h += '<div class="card"><h3>In der Scheune: ' + barn.length + ' Sorte' + (barn.length > 1 ? 'n' : '') + '</h3><p class="hint">Diese Schafe haben kein Gehege und verdienen nichts. Tippe auf der Farm auf einen freien Platz oder reiße ein Gehege ab.</p></div>';
    // Taco Tuesday: Nacho-Box ganz oben
    if (G.isTaco()) {
      var nb = SI.NACHO;
      h += '<div class="boxcard bx-nacho taco"><img src="' + A.boxURL('nacho') + '" alt=""><div style="min-width:0"><div class="tacotag">🌮 Nur heute: Taco Tuesday!</div><h3>' + esc(nb.n) + '</h3>' +
        '<div class="odds">' + tagR('e', 'Episch 60 %') + tagR('l', 'Legendär 35 %') + tagR('m', 'Mythisch 5 %') + '<span class="tag" style="color:#c98a12">Karte ' + nb.card + ' %</span></div>' +
        costBtn(G.boxPrice('nacho'), 'open:nacho', 'Öffnen') + '</div></div>';
    } else h += '<p class="hint center">🌮 Jeden Dienstag ist Taco Tuesday mit der Nacho-Box!</p>';
    SI.BOX.forEach(function (b) {
      var tot = 0, k; for (k in b.odds) tot += b.odds[k];
      var chips = Object.keys(b.odds).map(function (r) { return tagR(r, SI.RAR[r].n + ' ' + Math.round(b.odds[r] / tot * 100) + ' %'); }).join('') + '<span class="tag" style="color:#c98a12">Karte ' + b.card + ' %</span>';
      if (!G.boxUnlocked(b.k)) {
        h += '<div class="boxcard locked bx-' + b.k + '"><div class="lockimg"><img src="' + A.boxURL(b.k) + '" alt=""><span class="padlock">🔒</span></div><div style="min-width:0"><h3>' + esc(b.n) + '</h3><div class="odds">' + chips + '</div><div class="lockmsg">Ab Rebirth ' + b.rb + ' freigeschaltet</div></div></div>';
        return;
      }
      var deal = G.merch && G.merch.k === b.k ? '<div class="deal">Händler-Angebot: halber Preis!</div>' : '';
      h += '<div class="boxcard bx-' + b.k + '"><img src="' + A.boxURL(b.k) + '" alt=""><div style="min-width:0"><h3>' + esc(b.n) + '</h3>' + deal + '<div class="odds">' + chips + '</div>' + costBtn(G.boxPrice(b.k), 'open:' + b.k, 'Öffnen') + '</div></div>';
    });
    h += '<p class="hint">Die Preise bleiben immer gleich. Bessere Kisten schaltest du mit Rebirths frei. Glücksklee-Karten machen seltene Schafe wahrscheinlicher' + (G.card('glueck') ? ' (gerade +' + G.card('glueck') * 5 + ' %)' : '') + '.</p>';
    return { title: 'Mystery-Boxen', html: h };
  };
  VIEWS.deko = function () {
    var sh = G.shopToday(), h = '';
    h += '<div class="card"><div class="row" style="justify-content:space-between"><h3>Deko-Shop</h3><span class="hint num" id="shopT">' + untilMidnight() + '</span></div><div class="shop">';
    sh.slots.forEach(function (x, i) {
      var r = x.r, left = sh.left(i), sold = left <= 0, stack = '';
      for (var k = Math.min(left, 3) - 1; k >= 1; k--) stack += '<img class="stk s' + k + '" src="' + A.boxURL(rarBoxCol(r)) + '" alt="">';
      h += '<div class="shopbox rc-' + r + (sold ? ' sold' : '') + '"><div class="stackw">' + stack + '<img class="top" src="' + A.boxURL(rarBoxCol(r)) + '" alt="">' +
        '<span class="cnt">' + left + '/' + x.n + '</span></div><b>' + (r === 'taco' ? 'Taco-Kiste' : SI.RAR[r].n) + '</b>' +
        (sold ? '<span class="hint">Ausverkauft</span>' : '<button class="btn coin num" data-act="deko:' + i + '" data-cost="' + G.dekoPrice(r) + '">' + fmt(G.dekoPrice(r)) + '</button>') + '</div>';
    });
    h += '</div>' + (G.isTaco() ? '<p class="hint tacohint">🌮 Taco Tuesday: Die Taco-Kiste hat nur mexikanische Deko und gibt es nur heute!</p>' : '') + '<p class="hint">Jeden Tag gibt es 3 neue Stapel. Von jeder Seltenheit gibt es 1 bis 6 Kisten, von seltenen Kisten meistens weniger. Jede Kiste kannst du einmal kaufen.</p></div>';
    var inv = Object.keys(G.S.dekoInv).filter(function (id) { return G.S.dekoInv[id] - (hiddenDeko[id] || 0) > 0; });
    h += '<div class="card"><h3>Im Lager</h3>';
    if (inv.length) {
      h += '<div class="grid">' + inv.map(function (id) {
        var d = SI.DK[id];
        return '<button class="tile" data-act="place:' + id + '"><img src="' + A.dekoURL(d) + '" alt=""><b>' + esc(d.n) + '</b><small class="num">' + (G.S.dekoInv[id] - (hiddenDeko[id] || 0)) + '× · Aufstellen</small></button>';
      }).join('') + '</div>';
    } else h += '<p class="hint">Leer. Kauf eine Kiste im Shop.</p>';
    h += '</div>';
    h += '<div class="card"><h3>Auf der Farm</h3><p class="hint num">' + G.S.dekoPlaced.length + ' Sachen aufgestellt. Sie geben dir +' + Math.round(G.dekoBonus() * 100) + ' % Geld.</p>' +
      (G.S.dekoPlaced.length ? '<p class="hint">Tipp: Tippe auf der Farm auf eine Deko, um sie zu verschieben.</p><button class="btn purple" data-act="editDeko">Deko wegräumen</button>' : '') + '</div>';
    return { title: 'Deko', html: h };
  };
  VIEWS.zucht = function () {
    var h = '';
    if (G.S.breed) {
      var br = G.S.breed, done = Date.now() >= br.end;
      h += '<div class="card"><div class="parents"><div class="pslot full"><img src="' + A.sheepURL(T[br.a]) + '" alt="">' + esc(T[br.a].n) + '</div>' +
        ICON_HEART.replace('class="heart"', 'class="heart' + (done ? '' : ' beat') + '"') +
        '<div class="pslot full"><img src="' + A.sheepURL(T[br.b]) + '" alt="">' + esc(T[br.b].n) + '</div></div>' +
        '<div class="bar"><i id="breedBar" style="width:' + Math.min(100, (Date.now() - br.start) / (br.end - br.start) * 100) + '%"></i></div>' +
        (done ? '<button class="btn pink wide" data-act="collect">Baby abholen</button>' : '<p class="hint num" id="breedT" style="text-align:center"></p>') + '</div>';
    } else {
      var sl = function (i) { return picks[i] ? '<button class="pslot full" data-act="unpick:' + i + '"><img src="' + A.sheepURL(T[picks[i]]) + '" alt="">' + esc(T[picks[i]].n) + '</button>' : '<div class="pslot">Elternteil ' + (i + 1) + '<br>wählen</div>'; };
      h += '<div class="card"><div class="parents">' + sl(0) + ICON_HEART + sl(1) + '</div>';
      if (picks.length === 2) {
        h += '<p class="hint" style="text-align:center">Dauer: ' + G.fmtTime(G.breedTime(picks[0], picks[1])) + '</p>' + costBtn(G.breedCost(picks[0], picks[1]), 'breed', 'Züchten', 'pink');
      } else h += '<p class="hint" style="text-align:center">Tippe unten auf zwei Schafe. Die Eltern bleiben in ihrem Gehege.</p>';
      h += '</div>';
      var ids = Object.keys(G.S.sheep).sort(function (a, b) { return T[b].inc - T[a].inc; });
      h += '<div class="grid">' + ids.map(function (id) {
        var left = G.S.sheep[id] - picks.filter(function (p) { return p === id; }).length;
        return '<button class="tile" data-act="pick:' + id + '"' + (left <= 0 || picks.length >= 2 ? ' disabled' : '') + '><img src="' + A.sheepURL(T[id]) + '" alt=""><b>' + esc(T[id].n) + '</b><small class="num">' + G.S.sheep[id] + '×</small></button>';
      }).join('') + '</div>';
    }
    h += '<p class="hint">Manche Paare bekommen immer ein geheimes Schaf, welche, musst du selbst herausfinden. Sonst gibt es ein Baby in der Seltenheit der Eltern, manchmal sogar eine Stufe besser.</p>';
    return { title: 'Zuchtstation', html: h };
  };
  VIEWS.buch = function () {
    var h = '<div class="tabs"><button class="' + (bookTab === 'schafe' ? 'on' : '') + '" data-act="book:schafe">Schafe</button><button class="' + (bookTab === 'deko' ? 'on' : '') + '" data-act="book:deko">Deko</button></div>';
    if (bookTab === 'schafe') {
      var n = Object.keys(G.S.found).length;
      h += '<div class="bar"><i style="width:' + (n / SI.TYPES.length * 100) + '%"></i></div><p class="hint num">' + n + ' von ' + SI.TYPES.length + ' Schafen gefunden. Geheime Schafe gibt es nur durch Zucht.</p>';
      SI.RORDER.forEach(function (r) {
        h += '<h3 class="rc-' + r + '" style="font-size:17px">' + SI.RAR[r].n + '</h3><div class="grid">';
        SI.TYPES.filter(function (t) { return t.r === r; }).sort(function (a, b) { return a.inc - b.inc; }).forEach(function (t) { // wenigstes Geld zuerst
          var f = G.S.found[t.id];
          h += '<div class="tile"><img src="' + A.sheepURL(t, !f) + '" alt=""><b>' + (f ? esc(t.n) : '???') + '</b><small class="num">' + (f ? '+' + fmt(t.inc) + '/Sek. · ' + esc(t.pen.name) : (t.r === 's' ? 'Geheim! Nur durch Zucht' : 'noch nicht gefunden')) + '</small></div>';
        });
        h += '</div>';
      });
    } else {
      var m = Object.keys(G.S.dekoFound).length;
      h += '<div class="bar"><i style="width:' + (m / SI.DEKO.length * 100) + '%"></i></div><p class="hint num">' + m + ' von ' + SI.DEKO.length + ' Deko-Sachen gefunden.</p>';
      ['c', 'r', 'e', 'l', 'm'].forEach(function (r) {
        h += '<h3 class="rc-' + r + '" style="font-size:17px">' + SI.RAR[r].n + '</h3><div class="grid">';
        SI.DEKO.filter(function (d) { return d.r === r; }).forEach(function (d) {
          var f = G.S.dekoFound[d.id];
          h += '<div class="tile"><img src="' + A.dekoURL(d, !f) + '" alt=""><b>' + (f ? esc(d.n) : '???') + '</b><small>' + (f ? '+' + Math.round(SI.DEKO_BONUS[r] * 100) + ' % Geld' + (d.light ? ' · leuchtet' : '') : 'noch nicht gefunden') + '</small></div>';
        });
        h += '</div>';
      });
    }
    return { title: 'Sammelbuch', html: h };
  };
  VIEWS.mehr = function () {
    var h = '', ready = G.dailyReady(), idx = G.dailyIndex(), doneN = ready ? idx : ((G.S.daily.streak - 1) % 7) + 1;
    h += '<div class="card"><h3>Tägliche Belohnung</h3><div class="days">' + SI.DAILY.map(function (d, i) {
      return '<div class="day' + (i < doneN ? ' done' : '') + (ready && i === idx ? ' now' : '') + '">Tag ' + (i + 1) + '<br>' + esc(d) + '</div>';
    }).join('') + '</div>' + (ready ? '<button class="btn" data-act="showDaily">Jetzt abholen</button>' : '<p class="hint">Heute schon abgeholt. Morgen gibt es das nächste Geschenk.</p>') + '</div>';
    var rc = G.rebirthCost();
    h += '<div class="card"><h3>Rebirth</h3><p class="hint">Fang neu an und werde stärker: Du verdienst danach für immer +25 % mehr pro Rebirth, deine Farm bekommt 2 neue Plätze und du schaltest bessere Kisten frei. Jeder Rebirth ist viel teurer als der davor. Es gibt insgesamt ' + G.MAXRB + ' Rebirths. Deko, Sammelbuch und Erfolge bleiben.</p>' +
      '<div class="stats num"><span>Rebirths</span><b>' + G.S.rebirths + ' / ' + G.MAXRB + '</b><span>Geld-Bonus jetzt</span><b>×' + G.rbMult().toLocaleString('de-DE') + '</b><span>Farm-Plätze</span><b>' + G.plotCount() + (G.rebirthMax() ? '' : ' → ' + (G.plotCount() + G.RB_PLOTS)) + '</b></div>' +
      (G.rebirthMax() ? '<p class="hint" style="text-align:center"><b>Alle ' + G.MAXRB + ' Rebirths geschafft!</b> Mehr gibt es nicht. Jetzt kannst du dein Imperium voll ausbauen.</p>' : costBtn(rc, 'rebirthAsk', 'Rebirth', 'pink')) + '</div>';
    var owned = SI.CARDS.filter(function (c) { return G.card(c.k); });
    h += '<div class="card"><h3>Upgrade-Karten</h3>' + (owned.length ? '<div class="list">' + owned.map(function (c) {
      return '<div class="li"><img src="' + A.cardURL() + '" alt=""><div class="t">' + esc(c.n) + '<small>' + esc(c.d) + '</small></div><b class="num">Stufe ' + G.card(c.k) + '</b></div>';
    }).join('') + '</div>' : '<p class="hint">Noch keine. Karten kommen manchmal aus Mystery-Boxen.</p>') + '</div>';
    var got = SI.ACH.filter(function (a) { return G.S.ach[a.k]; }).length;
    h += '<div class="card"><h3>Erfolge <span class="hint num">' + got + ' / ' + SI.ACH.length + '</span></h3><div>' + SI.ACH.map(function (a) {
      return '<div class="ach' + (G.S.ach[a.k] ? ' got' : '') + '"><span class="ic">' + ICON_STAR + '</span><div class="t">' + esc(a.n) + '<small>' + esc(a.d) + '</small></div></div>';
    }).join('') + '</div></div>';
    h += '<div class="card"><h3>Statistik</h3><div class="stats num"><span>Spielzeit</span><b>' + G.fmtTime(G.S.playtime) + '</b><span>Insgesamt verdient</span><b>' + fmt(G.S.total) + '</b>' +
      '<span>Schafe</span><b>' + G.sheepCount() + '</b><span>Boxen geöffnet</span><b>' + G.S.stats.boxes + '</b><span>Babys gezüchtet</span><b>' + G.S.stats.breeds + '</b>' +
      '<span>Wölfe verjagt</span><b>' + G.S.stats.wolves + '</b><span>Goldene Schafe</span><b>' + G.S.stats.golden + '</b><span>Geld verdienen</span><b>nur im Spiel</b></div></div>';
    h += '<div class="card"><h3>Einstellungen</h3><p class="hint">Soundeffekte und Musik an- und ausschalten oder leiser machen.</p><button class="btn blue" data-act="sheet:settings">Einstellungen öffnen</button></div>';
    h += '<div class="card"><h3>Als App aufs Handy</h3><p class="hint"><b>iPhone:</b> In Safari unten auf Teilen tippen, dann „Zum Home-Bildschirm“.<br><b>Android:</b> In Chrome oben rechts auf die drei Punkte, dann „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p></div>';
    h += '<div class="card"><h3>Account</h3><p class="hint">Angemeldet als <b>' + esc(me ? me.username : '') + '</b>' + (N.online ? '. Dein Spielstand wird online gespeichert, du kannst auf jedem Gerät weiterspielen.' : '. Test-Modus: nur auf diesem Gerät gespeichert.') + '</p><button class="btn red" data-act="logout">Abmelden</button></div>';
    return { title: 'Mehr', html: h };
  };
  VIEWS.pen = function (i) {
    var p = G.S.pens[i]; if (!p) { closeSheet(); return { title: '', html: '' }; }
    var t = T[p.t], cap = G.penCap(p.lvl), ex = G.extras(p.t), mine = G.pensOf(p.t), pull = G.canPull(i), fp = G.freePlot();
    var h = '<div class="li"><img src="' + A.sheepURL(t) + '" alt=""><div class="t">' + esc(t.n) + '<small>' + tagR(t.r) + ' +' + fmt(t.inc) + ' pro Schaf und Sek.</small></div></div>';
    h += '<div class="card"><div class="stats num"><span>Schafe im Gehege</span><b>' + p.n + ' / ' + cap + '</b>' + (mine.length > 1 ? '<span>Gehege mit ' + esc(t.n) + '</span><b>' + mine.length + ' Stück</b>' : '') + '<span>Stufe</span><b>' + p.lvl + ' / ' + G.MAXLVL + '</b>' +
      '<span>Gehege-Bonus</span><b>×' + G.penMult(p.lvl).toLocaleString('de-DE') + '</b><span>Nächste Stufe</span><b>' + (p.lvl < G.MAXLVL ? '+1 Platz, +25 % Geld, neues Aussehen' : '—') + '</b><span>Dieses Gehege macht</span><b id="penInc">+' + fmt(G.penIncome(i) * G.globalMult()) + ' pro Sek.</b></div>' +
      (p.lvl < G.MAXLVL ? costBtn(G.lvlCost(p.t, p.lvl), 'lvl:' + i, 'Ausbauen', 'go') : '<p class="hint">Höchste Stufe erreicht!</p>') + '</div>';
    if (pull) h += '<div class="card"><h3>Hier ist Platz frei!</h3><p class="hint">' + (ex ? 'Es warten noch Schafe in der Scheune' : 'In deinem anderen ' + (mine.length > 2 ? 'Gehegen' : 'Gehege') + ' sind noch ' + esc(t.n) + 'e') + '. Hol sie hierher, dann verdienen sie mehr. Ein Gehege, das leer wird, wird abgebaut und der Platz ist wieder frei.</p><button class="btn go" data-act="pull:' + i + '">' + pull + '× hierher holen</button></div>';
    if (ex && !pull) h += '<div class="card"><h3>' + ex + ' Schaf' + (ex > 1 ? 'e warten' : ' wartet') + ' in der Scheune</h3><p class="hint">Alle Gehege sind voll. Baue ein neues Gehege, baue aus oder verkaufe die übrigen.</p>' +
      (fp >= 0 ? '<button class="btn" data-act="build:' + p.t + ':' + fp + '">Neues Gehege bauen</button>' : '') +
      '<button class="btn ghost" data-act="sellEx:' + p.t + '">' + ex + '× verkaufen · +' + fmt(ex * G.sellValue(p.t)) + '</button></div>';
    h += '<div class="row"><button class="btn blue" data-act="movePen:' + i + '">Gehege verschieben</button><span class="hint">Das Gehege zieht mit allen Schafen an einen anderen Platz.</span></div>';
    h += '<div class="row"><button class="btn ghost" data-act="demolish:' + i + '">Gehege abreißen</button><span class="hint">Die Schafe warten dann in der Scheune.</span></div>';
    return { title: t.pen.name, html: h };
  };
  VIEWS.empty = function (i) {
    var barn = G.barn(), h = '';
    if (barn.length) {
      h += '<p class="hint">Diese Schafe warten in der Scheune. Wer soll hier einziehen?</p><div class="list">' + barn.map(function (k) {
        var t = T[k];
        return '<div class="li"><img src="' + A.sheepURL(t) + '" alt=""><div class="t">' + esc(t.n) + '<small class="num">' + G.extras(k) + '× warten · ' + esc(t.pen.name) + '</small></div><button class="btn" data-act="build:' + k + ':' + i + '">Einziehen</button></div>';
      }).join('') + '</div>';
    } else h += '<p class="hint">Hier kann ein neues Gehege hin. Sobald du eine neue Schafsorte bekommst oder ein Gehege voll ist, wird hier automatisch gebaut. Öffne dafür Mystery-Boxen!</p><button class="btn coin" data-act="sheet:boxen">Zu den Boxen</button>';
    return { title: 'Freier Platz', html: h };
  };
  var boardData = null, boardErr = '';
  function loadBoard() {
    boardData = null; boardErr = '';
    saveCloud();
    setTimeout(function () {
      N.board(boardTab).then(function (rows) { boardData = rows; }).catch(function (e) { boardErr = N.errText(e); })
        .then(function () { if (sheet && sheet.name === 'board') renderSheet(); });
    }, 400);
  }
  VIEWS.settings = function () {
    var X = SI.sfx, so = X.on(), mu = X.musicOn();
    function row(title, desc, act, onv, slAct, val, col) {
      return '<div class="card setrow"><div class="sethd"><div><h3>' + title + '</h3><p class="hint">' + desc + '</p></div>' +
        '<button class="switch' + (onv ? ' on ' + col : '') + '" data-act="' + act + '" role="switch" aria-checked="' + onv + '" aria-label="' + title + '"><i></i></button></div>' +
        '<div class="slider"><span>Leise</span><input type="range" min="0" max="100" value="' + Math.round(val * 100) + '" data-slide="' + slAct + '"' + (onv ? '' : ' disabled') + ' aria-label="Lautstärke ' + title + '"><span>Laut</span></div></div>';
    }
    var h = row('Soundeffekte', 'Kisten, Knöpfe, Tiere, Vögel und Grillen', 'sound', so, 'sfx', X.sfxVol(), 'blue') +
      row('Hintergrundmusik', 'Ruhige Musik, nachts noch etwas leiser', 'music', mu, 'mus', X.musVol(), 'purple');
    h += '<div class="card"><div class="sethd"><div><h3>Musikstücke</h3><p class="hint">3 ruhige Stücke laufen zufällig nacheinander: Wiesenmorgen, Lagerfeuer und Sonntagswalzer. Gerade: <b id="trackName">' + esc(X.trackName()) + '</b></p></div><button class="btn purple" data-act="nextTrack"' + (mu ? '' : ' disabled') + '>Nächstes</button></div></div>';
    h += '<p class="hint">Die Einstellungen werden auf diesem Gerät gespeichert.</p>';
    return { title: 'Einstellungen', html: h };
  };
  /* ---------- Codes und Admin ---------- */
  var codeIn = '', adm = { name: '', amount: '', code: '', kind: 'sheep', sheep: 'drache', deko: '', money: '' }, admCodes = null, busy = false;
  function parseAmt(v) {
    var m = String(v || '').trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*([kmbtKMBT]?)$/);
    if (!m) return NaN;
    return parseFloat(m[1]) * ({ '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[2].toLowerCase()]);
  }
  function checkInbox() {
    if (!me) return;
    N.inbox(me.token).then(function (items) {
      (items || []).forEach(function (it) {
        if (it.type !== 'money' || !(it.amount > 0)) return;
        G.earn(+it.amount); SFX('buy');
        modal('<div class="modal"><img src="' + A.boxURL('gl') + '" alt="" style="width:120px;height:106px;align-self:center"><h2>Geschenk!</h2>' +
          '<p><b>' + esc(it.from || 'Admin') + '</b> hat dir Geld geschenkt:</p><div class="big num">+' + fmt(+it.amount) + '</div>' +
          '<div class="btns"><button class="btn coin" data-act="close">Danke!</button></div></div>');
      });
      if (items && items.length) { saveLocal(); refresh(); }
    }).catch(function () { /* später nochmal */ });
  }
  function loadCodes() {
    admCodes = null;
    N.adminCodes(me.token).then(function (r) { admCodes = r; }).catch(function (e) { admCodes = { err: N.errText(e) }; })
      .then(function () { if (sheet && sheet.name === 'admin') renderSheet(); });
  }
  function randCode() { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = 'SCHAF-'; for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  VIEWS.code = function () {
    var h = '<div class="card"><h3>Code einlösen</h3><p class="hint">Hast du einen Code bekommen? Gib ihn hier ein. Jeder Code klappt nur einmal, der Schnellste bekommt die Belohnung!</p>' +
      '<label class="field">Code<input class="codein" id="codeIn" data-form="code" value="' + esc(codeIn) + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" placeholder="Code hier eingeben"></label>' +
      '<button class="btn" data-act="redeem"' + (busy ? ' disabled' : '') + '>Einlösen</button></div>';
    return { title: 'Code', html: h };
  };
  VIEWS.admin = function () {
    if (!me || !me.admin) return { title: 'Admin', html: '<p class="hint">Dafür brauchst du Admin-Rechte.</p>' };
    if (!adm.name) adm.name = me.username;
    var h = '<div class="card"><h3>Geld geben</h3><p class="hint">Dir selbst oder einem anderen Spieler. Das Geld kommt beim nächsten Speichern an (bei dir sofort).</p>' +
      '<label class="field">Spielername<input data-form="name" value="' + esc(adm.name) + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="16"></label>' +
      '<label class="field">Betrag (z. B. 500, 25K, 3M, 1B, 2T)<input data-form="amount" value="' + esc(adm.amount) + '" inputmode="decimal" autocomplete="off" placeholder="z. B. 1M"></label>' +
      '<div class="quick">' + ['1K', '1M', '1B', '1T'].map(function (q) { return '<button data-act="admQuick:' + q + '">' + q + '</button>'; }).join('') + '</div>' +
      '<button class="btn coin" data-act="adminGive"' + (busy ? ' disabled' : '') + '>Geld geben</button></div>';
    h += '<div class="card"><h3>Neuen Code erstellen</h3><p class="hint">Wer den Code als Erster einlöst, bekommt die Belohnung. Danach ist er verbraucht.</p>' +
      '<label class="field">Code<input class="codein" data-form="code" value="' + esc(adm.code) + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="32" placeholder="z. B. SOMMER24"></label>' +
      '<div class="quick"><button data-act="admRand">Zufälligen Code machen</button></div>' +
      '<div class="seg"><button class="' + (adm.kind === 'sheep' ? 'on' : '') + '" data-act="admKind:sheep">Schaf</button><button class="' + (adm.kind === 'deko' ? 'on' : '') + '" data-act="admKind:deko">Deko</button><button class="' + (adm.kind === 'money' ? 'on' : '') + '" data-act="admKind:money">Geld</button></div>';
    if (adm.kind === 'sheep') {
      h += '<label class="field">Welches Schaf?<select data-form="sheep">' + SI.RORDER.map(function (r) {
        return '<optgroup label="' + SI.RAR[r].n + '">' + SI.TYPES.filter(function (t) { return t.r === r; }).map(function (t) {
          return '<option value="' + t.id + '"' + (adm.sheep === t.id ? ' selected' : '') + '>' + esc(t.n) + ' (+' + fmt(t.inc) + '/Sek.)</option>';
        }).join('') + '</optgroup>';
      }).join('') + '</select></label>' +
        '<div style="text-align:center"><img src="' + A.sheepURL(T[adm.sheep] || T.wiese) + '" alt="" style="width:110px;height:96px"></div>';
    } else if (adm.kind === 'deko') {
      if (!SI.DK[adm.deko]) adm.deko = SI.DEKO[SI.DEKO.length - 1].id;
      h += '<label class="field">Welche Deko?<select data-form="deko">' + SI.RORDER.map(function (r) {
        var ds = SI.DEKO.filter(function (d) { return d.r === r; }); if (!ds.length) return '';
        return '<optgroup label="' + SI.RAR[r].n + '">' + ds.map(function (d) {
          return '<option value="' + d.id + '"' + (adm.deko === d.id ? ' selected' : '') + '>' + esc(d.n) + ' (+' + Math.round(SI.DEKO_BONUS[d.r] * 100) + ' %)</option>';
        }).join('') + '</optgroup>';
      }).join('') + '</select></label>' +
        '<div style="text-align:center"><img src="' + A.dekoURL(SI.DK[adm.deko]) + '" alt="" style="max-width:120px;max-height:110px"></div>';
    } else {
      h += '<label class="field">Geld-Betrag<input data-form="money" value="' + esc(adm.money) + '" inputmode="decimal" autocomplete="off" placeholder="z. B. 50M"></label>';
    }
    h += '<button class="btn red" data-act="adminCode"' + (busy ? ' disabled' : '') + '>Code erstellen</button></div>';
    h += '<div class="card"><h3>Deine Codes</h3>';
    if (!admCodes) h += '<p class="hint">Lädt …</p>';
    else if (admCodes.err) h += '<p class="hint">' + esc(admCodes.err) + '</p>';
    else if (!admCodes.length) h += '<p class="hint">Noch keine Codes erstellt.</p>';
    else h += '<div class="codelist">' + admCodes.map(function (c) {
      var what = c.kind === 'sheep' ? (T[c.value] ? T[c.value].n : c.value) : c.kind === 'deko' ? 'Deko: ' + (SI.DK[c.value] ? SI.DK[c.value].n : c.value) : fmt(+c.value) + ' Münzen';
      return '<div class="li"><div class="t"><code>' + esc(c.code) + '</code><small>' + esc(what) + ' · ' + (c.redeemed_by ? 'eingelöst von <b>' + esc(c.redeemed_by) + '</b>' : 'noch frei') + '</small></div></div>';
    }).join('') + '</div>';
    h += '</div>';
    return { title: 'Admin', html: h };
  };
  function doRedeem() {
    var c = codeIn.trim(); if (!c) { toast('Bitte gib zuerst einen Code ein.'); return; }
    busy = true; renderSheet();
    N.redeem(me.token, c).then(function (r) {
      codeIn = '';
      if (r.type === 'admin') {
        me.admin = true; N.setSession({ token: me.token, username: me.username }); $('#adminChip').hidden = false; closeSheet();
        SFX('reveal', 'm'); flash('#ffd23f');
        modal('<div class="modal rar-l"><img src="' + A.iconURL('schild') + '" alt="" style="width:110px;height:110px;align-self:center"><h2>Du bist jetzt Admin!</h2>' +
          '<p>Oben rechts gibt es jetzt den roten Admin-Knopf. Damit kannst du Geld verschenken und Codes für Schafe, Deko oder Geld erstellen.</p>' +
          '<div class="btns"><button class="btn red" data-act="closeOpen:admin">Admin-Menü öffnen</button></div></div>');
      } else if (r.type === 'sheep') {
        var t = T[r.value]; if (!t) { toast('Dieses Schaf gibt es nicht mehr.'); return; }
        var res = G.addSheep(t.id); closeSheet();
        sheepReveal({ t: t, box: SI.BK.galaxie, isNew: res.isNew, placed: res.placed, built: res.built }, '', 'Code · ');
      } else if (r.type === 'deko') {
        var dr = G.addDeko(r.value); if (!dr) { toast('Diese Deko gibt es nicht mehr.'); return; }
        closeSheet(); SFX('reveal', dr.deko.r); dekoReveal(dr, dr.deko.r);
      } else if (r.type === 'money') {
        var a = +r.value; if (!(a > 0)) return; G.earn(a); closeSheet(); SFX('reveal', 'l');
        reveal({ rc: '#e8a300', r: 'l', box: A.boxURL('gl'), pic: A.iconURL('coin'), body: '<div class="rlabel">Code eingelöst</div><h2>+' + fmt(a) + ' Münzen</h2>' });
      }
      saveLocal(); saveCloud(); refresh();
    }).catch(function (e) { SFX('cant'); toast(N.errText(e)); })
      .then(function () { busy = false; if (sheet) renderSheet(); });
  }
  function doAdminGive() {
    var amt = parseAmt(adm.amount), who = adm.name.trim();
    if (!who) { toast('Bitte gib einen Spielernamen ein.'); return; }
    if (!(amt > 0)) { toast('Bitte gib einen gültigen Betrag ein, z. B. 5M.'); return; }
    busy = true; renderSheet();
    N.adminGive(me.token, who, amt).then(function () {
      toast(fmt(amt) + ' Münzen an ' + who + ' geschickt!'); SFX('sell');
      if (who.toLowerCase() === me.username.toLowerCase()) checkInbox();
    }).catch(function (e) { SFX('cant'); toast(N.errText(e)); })
      .then(function () { busy = false; renderSheet(); });
  }
  function doAdminCode() {
    var code = adm.code.trim(), val = adm.kind === 'sheep' ? adm.sheep : adm.kind === 'deko' ? adm.deko : parseAmt(adm.money);
    if (adm.kind === 'money' && !(val > 0)) { toast('Bitte gib einen gültigen Geld-Betrag ein, z. B. 50M.'); return; }
    busy = true; renderSheet();
    N.adminCode(me.token, code, adm.kind, val).then(function () {
      toast('Code „' + code + '“ ist bereit!'); SFX('newItem'); adm.code = ''; loadCodes();
    }).catch(function (e) { SFX('cant'); toast(N.errText(e)); })
      .then(function () { busy = false; renderSheet(); });
  }

  var BTABS = [['income', 'Geld/Sek.', 'coin'], ['playtime', 'Spielzeit', 'sonne'], ['rebirths', 'Rebirths', 'pokal']];
  function boardVal(v) { return boardTab === 'income' ? fmt(v) + '/Sek.' : boardTab === 'playtime' ? G.fmtTime(v) : v + ' Rebirth' + (v == 1 ? '' : 's'); }
  function avatar(name) { var pool = SI.TYPES.filter(function (t) { return t.r !== 's'; }); return A.sheepURL(pool[A.hash(name.toLowerCase()) % pool.length]); }
  VIEWS.board = function () {
    var h = '<div class="btabs">' + BTABS.map(function (x) {
      return '<button class="' + (boardTab === x[0] ? 'on' : '') + '" data-act="btab:' + x[0] + '"><img src="' + A.iconURL(x[2]) + '" alt="">' + x[1] + '</button>';
    }).join('') + '</div>';
    if (boardErr) h += '<p class="hint center">' + esc(boardErr) + '</p>';
    else if (!boardData) h += '<p class="hint center">Lädt …</p>';
    else if (!boardData.length) h += '<p class="hint center">Noch niemand drin. Spiel ein bisschen, dann erscheinst du hier!</p>';
    else {
      var isMe = function (r) { return me && r.username.toLowerCase() === me.username.toLowerCase(); };
      // Siegertreppchen: 2. links, 1. Mitte, 3. rechts
      h += '<div class="podium">' + [1, 0, 2].map(function (i) {
        var r = boardData[i]; if (!r) return '<div class="pod empty"></div>';
        return '<div class="pod p' + (i + 1) + (isMe(r) ? ' me' : '') + '">' + (i === 0 ? '<span class="crown">👑</span>' : '') +
          '<img src="' + avatar(r.username) + '" alt=""><b class="pn">' + esc(r.username) + '</b><span class="pv num">' + boardVal(r.value) + '</span>' +
          '<div class="step"><span>' + (i + 1) + '</span></div></div>';
      }).join('') + '</div>';
      // Tabelle mit allen Spielern und ihren Plätzen (Kai)
      h += '<h3 class="btitle">Alle Spieler</h3><div class="board"><div class="brow bhead"><span class="pl">#</span><span></span><span class="nm">Spieler</span><b>' + BTABS.filter(function (x) { return x[0] === boardTab; })[0][1] + '</b></div>' +
        boardData.map(function (r, k) {
          return '<div class="brow' + (k < 3 ? ' top' + (k + 1) : '') + (isMe(r) ? ' me' : '') + '"><span class="pl">' + (k + 1) + '</span><img src="' + avatar(r.username) + '" alt=""><span class="nm">' + esc(r.username) + (isMe(r) ? ' <small>(du)</small>' : '') + '</span><b class="num">' + boardVal(r.value) + '</b></div>';
        }).join('') + '</div>';
      var mine = -1; boardData.forEach(function (r, i) { if (isMe(r)) mine = i; });
      h += '<div class="myrank">' + (mine >= 0 ? 'Du bist auf <b>Platz ' + (mine + 1) + '</b>!' : 'Du bist noch nicht in den Top ' + boardData.length + '. Weiter so!') + '</div>';
    }
    if (!N.online) h += '<p class="hint center">Test-Modus: Hier stehen nur Accounts von diesem Gerät.</p>';
    return { title: 'Bestenliste', html: h };
  };

  /* ---------- Farm-Rückrufe ---------- */
  function openPen(i) { openSheet('pen', i); }
  function openEmpty(i) { openSheet('empty', i); }
  function placeDeko(id, x, y) {
    if (G.placeDeko(id, x, y)) {
      SFX('place');
      toast(SI.DK[id].n + ' aufgestellt! +' + Math.round(SI.DEKO_BONUS[SI.DK[id].r] * 100) + ' % Geld');
      if (!G.S.dekoInv[id]) setMode('normal');
      saveLocal(); refresh();
    }
  }
  function pickupDeko(idx) {
    var p = G.S.dekoPlaced[idx]; if (!p) return;
    G.pickupDeko(idx); SFX('pickup'); toast(SI.DK[p.id].n + ' ist zurück im Lager.'); saveLocal(); refresh();
  }
  function setMode(m, id) {
    F.setMode(m, id);
    $('#modebar').hidden = m === 'normal';
    var ex = $('#modeExtra'), done = $('#modeDoneBtn');
    ex.hidden = m !== 'move'; done.textContent = m === 'movePen' ? 'Abbrechen' : 'Fertig';
    $('#modeText').textContent =
      m === 'place' ? 'Tippe auf eine freie Wiese, um „' + SI.DK[id].n + '“ aufzustellen.' :
      m === 'move' ? '„' + SI.DK[G.S.dekoPlaced[id].id].n + '“ verschieben: Zieh sie mit dem Finger oder tippe auf eine freie Stelle.' :
      m === 'movePen' ? 'Tippe auf den Platz, wo „' + T[G.S.pens[id].t].pen.name + '“ hin soll. Steht dort schon ein Gehege, tauschen die beiden.' :
      'Tippe auf eine Deko, um sie wegzuräumen.';
  }
  function dekoTap(idx) {
    if (!G.S.dekoPlaced[idx]) return;
    closeSheet(); SFX('pickup'); setMode('move', idx);
  }
  function dekoMoved(id) { SFX('place'); saveLocal(); }
  function penMoved(i) {
    if (i < 0) { setMode('normal'); return; }
    SFX('gate'); setTimeout(function () { SFX('place'); }, 350);
    toast('Gehege verschoben!'); setMode('normal'); saveLocal(); refresh();
  }

  /* ---------- Belohnungen ---------- */
  // Taco Tuesday: einmal pro Dienstag eine Benachrichtigung
  function tacoNotice() {
    $('#tacoChip').hidden = !G.isTaco();
    if (!G.isTaco() || G.S.tacoSeen === G.today()) return;
    G.S.tacoSeen = G.today();
    SFX('trumpet');
    modal('<div class="modal taco"><img src="' + A.boxURL('nacho') + '" alt="" style="width:130px;height:110px;align-self:center"><h2>🌮 Taco Tuesday!</h2>' +
      '<p>Heute gibt es die <b>Nacho-Box</b> mit mexikanischen Schafen und im Deko-Shop die <b>Taco-Kiste</b> mit mexikanischer Deko. Nur heute!</p>' +
      '<div class="btns"><button class="btn ghost" data-act="close">Später</button><button class="btn coin" data-act="closeOpen:boxen">Zur Nacho-Box</button></div></div>');
  }
  function showDaily() {
    if (!G.dailyReady()) return;
    var idx = G.dailyIndex();
    modal('<div class="modal"><h2>Tägliche Belohnung</h2><p>Komm jeden Tag wieder, dann werden die Geschenke immer besser.</p><div class="days">' +
      SI.DAILY.map(function (d, i) { return '<div class="day' + (i < idx ? ' done' : '') + (i === idx ? ' now' : '') + '">Tag ' + (i + 1) + '<br>' + esc(d) + '</div>'; }).join('') +
      '</div><div class="btns"><button class="btn coin" data-act="claimDaily">Tag ' + (idx + 1) + ' abholen</button></div></div>');
  }
  function claimDaily() {
    if (!G.dailyReady()) return;
    var idx = G.dailyIndex(); G.S.daily.streak = idx + 1; G.S.daily.last = G.today();
    nextModal(); SFX('daily');
    var secs = [300, 0, 900, 0, 2700, 0, 0][idx];
    if (secs) toast('+' + fmt(G.giveSec(secs)) + ' Münzen!');
    else if (idx === 6) dekoReveal(G.giveDeko('e'), 'e');
    else sheepReveal(G.openBox(['holz', 'silber', 'gold'][(idx - 1) / 2], true), '');
    saveLocal(); refresh();
  }

  /* ---------- Klicks ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.id === 'sheet') { closeSheet(); SFX('close'); return; }
    var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    var parts = el.dataset.act.split(':'), a = parts[0], arg = parts[1];
    if (['open', 'again', 'deko', 'close', 'closeSheet', 'collect', 'claimDaily', 'rebirth', 'lvl', 'breed', 'sound', 'music', 'sheet', 'board', 'book', 'pick', 'unpick', 'sellEx', 'demolishYes'].indexOf(a) < 0) SFX(el.classList.contains('nb') ? 'tab' : 'click');
    var res, i, v;
    switch (a) {
      case 'ltab': setLMode(arg); break;
      case 'sheet': if (sheet && sheet.name === arg) closeSheet(); else { picks = []; openSheet(arg); } break;
      case 'closeSheet': SFX('close'); closeSheet(); break;
      case 'sound': SI.sfx.setOn(!SI.sfx.on()); SFX('click'); renderSheet(); break;
      case 'settings': openSheet('settings'); break;
      case 'nextTrack': SI.sfx.nextTrack(); toast('Das nächste Stück kommt gleich.'); break;
      case 'music': SI.sfx.setMusic(!SI.sfx.musicOn()); SFX('click'); renderSheet(); break;
      case 'board': openSheet('board'); break;
      case 'btab': boardTab = arg; loadBoard(); renderSheet(); break;
      case 'book': if (bookTab !== arg) SFX('pageTurn'); bookTab = arg; renderSheet(); break;
      case 'zin': F.zoom(1.2); break;
      case 'zout': F.zoom(1 / 1.2); break;
      case 'close': closeModal(); break;
      case 'open': case 'again':
        if (a === 'again') nextModal();
        if (G.S.coins < G.boxPrice(arg)) { toast('Dir fehlen noch ' + fmt(G.boxPrice(arg) - G.S.coins) + ' Münzen.'); break; }
        res = G.openBox(arg); if (!res) break; SFX('buy'); renderMerchant();
        sheepReveal(res, '<button class="btn coin" data-act="again:' + arg + '">Nochmal · ' + fmt(G.boxPrice(arg)) + '</button>');
        saveLocal(); refresh(); break;
      case 'deko':
        i = +arg; var sh = G.shopToday(), r = sh.slots[i].r;
        if (G.S.coins < G.dekoPrice(r)) { toast('Dir fehlen noch ' + fmt(G.dekoPrice(r) - G.S.coins) + ' Münzen.'); break; }
        res = G.buyDeko(i); if (res) { SFX('buy'); dekoReveal(res, r); } saveLocal(); refresh(); break;
      case 'place': case 'placeNow':
        if (a === 'placeNow') nextModal();
        closeSheet(); setMode('place', arg); break;
      case 'editDeko': closeSheet(); setMode('edit'); break;
      case 'modeDone': setMode('normal'); break;
      case 'redeem': doRedeem(); break;
      case 'adminGive': doAdminGive(); break;
      case 'adminCode': doAdminCode(); break;
      case 'admQuick': adm.amount = arg; renderSheet(); break;
      case 'admRand': adm.code = randCode(); renderSheet(); break;
      case 'admKind': adm.kind = arg; renderSheet(); break;
      case 'closeOpen': nextModal(); openSheet(arg); break;
      case 'movePen': closeSheet(); setMode('movePen', +arg); F.focusPen(+arg); F.zoom(0.85); break;
      case 'moveStore': var mi = F.moveTarget(); setMode('normal'); if (mi >= 0) pickupDeko(mi); break;
      case 'pick': if (picks.length < 2) { SFX('pick'); picks.push(arg); renderSheet(); } break;
      case 'unpick': SFX('unpick'); picks.splice(+arg, 1); renderSheet(); break;
      case 'breed':
        if (picks.length === 2 && G.startBreed(picks[0], picks[1])) { SFX('breed'); picks = []; saveLocal(); renderSheet(); }
        else if (picks.length === 2) toast('Dir fehlen noch ' + fmt(G.breedCost(picks[0], picks[1]) - G.S.coins) + ' Münzen.');
        break;
      case 'collect':
        res = G.collectBreed(); if (res) { sheepReveal(res, '', 'Baby · '); if (res.t.r === 's') toast('Ein geheimes Schaf! Wow!'); }
        saveLocal(); refresh(); break;
      case 'lvl':
        i = +arg; var pn = G.S.pens[i];
        if (pn && G.levelUp(i)) { SFX('hammer'); setTimeout(function () { SFX('lvl'); }, 380); toast(T[pn.t].pen.name + ' ist jetzt Stufe ' + pn.lvl + '!'); saveLocal(); refresh(); }
        else if (pn) toast('Dir fehlen noch ' + fmt(G.lvlCost(pn.t, pn.lvl) - G.S.coins) + ' Münzen.');
        break;
      case 'sellEx': SFX('sell'); v = G.sellExtras(arg); toast('Verkauft für ' + fmt(v) + ' Münzen'); saveLocal(); refresh(); break;
      case 'demolish':
        modal('<div class="modal"><h2>Gehege abreißen?</h2><p>Die Schafe ziehen in die Scheune und verdienen dort nichts, bis sie wieder ein Gehege bekommen. Der Ausbau geht dabei verloren.</p>' +
          '<div class="btns"><button class="btn ghost" data-act="close">Abbrechen</button><button class="btn red" data-act="demolishYes:' + arg + '">Abreißen</button></div></div>');
        break;
      case 'demolishYes': SFX('demolish'); G.removePen(+arg); nextModal(); closeSheet(); toast('Gehege abgerissen. Der Platz ist jetzt frei.'); saveLocal(); refresh(); break;
      case 'pull':
        i = +arg; var pr = G.pullSheep(i);
        if (pr.moved) { SFX('place'); toast(pr.moved + '× umgezogen!' + (pr.removed ? ' Ein leeres Gehege wurde abgebaut.' : '')); F.burst(G.S.pens[i].t, SI.RAR[T[G.S.pens[i].t].r].col, i); saveLocal(); refresh(); renderSheet(); }
        break;
      case 'build': if (G.buildPen(arg, +parts[2])) { toast('Neues Gehege: ' + T[arg].pen.name + '!'); closeSheet(); saveLocal(); refresh(); } break;
      case 'showDaily': showDaily(); break;
      case 'claimDaily': claimDaily(); break;
      case 'rebirthAsk':
        if (G.rebirthMax()) { toast('Du hast schon alle ' + G.MAXRB + ' Rebirths geschafft.'); break; }
        if (G.S.coins < G.rebirthCost()) { toast('Dir fehlen noch ' + fmt(G.rebirthCost() - G.S.coins) + ' Münzen.'); break; }
        modal('<div class="modal"><h2>Rebirth machen?</h2><p>Deine Münzen, Schafe, Gehege und Karten werden zurückgesetzt. Dafür verdienst du ab jetzt <b>×' + G.rbMult(G.S.rebirths + 1).toLocaleString('de-DE') + '</b> und deine Farm wird größer.</p>' +
          '<div class="btns"><button class="btn ghost" data-act="close">Abbrechen</button><button class="btn coin" data-act="rebirth">Ja, Rebirth!</button></div></div>');
        break;
      case 'rebirth':
        if (G.doRebirth()) { SFX('rebirth'); flash('#ffffff'); nextModal(); picks = []; renderMerchant(); closeSheet(); toast('Rebirth geschafft! Deine Farm ist gewachsen.'); saveLocal(); saveCloud(); refresh(); }
        break;
      case 'logout': saveLocal(); saveCloud(); N.setSession(null); setTimeout(function () { location.reload(); }, 400); break;
    }
  });
  document.addEventListener('input', function (e) {
    var f = e.target.dataset && e.target.dataset.form;
    if (f) { if (sheet && sheet.name === 'code') codeIn = e.target.value; else adm[f] = e.target.value; return; }
    var k = e.target.dataset && e.target.dataset.slide; if (!k) return;
    var v = e.target.value / 100;
    if (k === 'sfx') SI.sfx.setSfxVol(v); else SI.sfx.setMusVol(v);
  });
  document.addEventListener('change', function (e) { if (e.target.dataset && (e.target.dataset.form === 'sheep' || e.target.dataset.form === 'deko')) { adm[e.target.dataset.form] = e.target.value; renderSheet(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'codeIn') { e.preventDefault(); doRedeem(); }
  });
  document.addEventListener('change', function (e) { if (e.target.dataset && e.target.dataset.slide === 'sfx') SFX('coin'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (modalOpen) closeModal(); else if (sheet) closeSheet(); else setMode('normal'); } });

  /* ---------- für duel.js ---------- */
  SI.ui = { toast: toast, modal: modal, nextModal: nextModal, closeModal: closeModal, esc: esc, SFX: SFX, flash: function (c) { flash(c); }, sparks: sparks,
    me: function () { return me; }, refresh: refresh, renderSheet: renderSheet, openSheet: openSheet, closeSheet: closeSheet,
    sheet: function () { return sheet; }, saveLocal: saveLocal, saveCloud: saveCloud, views: VIEWS, modalOpen: function () { return modalOpen; }, hooks: [] };

  /* ---------- Start ---------- */
  (function boot() {
    $('#coinImg').src = A.iconURL('coin');
    document.querySelectorAll('img[data-icon]').forEach(function (im) { im.src = A.iconURL(im.dataset.icon); });
    var s = N.session();
    if (!s) { showLogin(); return; }
    $('#login').hidden = true;
    N.load(s.token).then(function (d) { enterGame({ token: s.token, username: d.username || s.username, admin: !!d.admin }, d.save); })
      .catch(function (e) {
        if ((e.message || '').indexOf('bad_token') >= 0) { N.setSession(null); showLogin(); }
        else showLogin(N.errText(e));
      });
  })();
})(window.SI);
