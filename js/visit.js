/* Schaf-Imperium: Farmen von anderen Spielern besuchen und Herzen verschenken */
(function (SI) {
  'use strict';
  var G = SI.G, A = SI.art, N = SI.net, F = SI.farm, U = SI.ui;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc, fmt = G.fmt, SFX = U.SFX;

  var V = { home: null, merch: null, name: '', data: null, busy: false, nameIn: '', myHearts: null };
  function tok() { var m = U.me(); return m && m.token; }
  function recent() { if (!Array.isArray(G.S.visRecent)) G.S.visRecent = []; return G.S.visRecent; }

  /* ---------- Besuchen ---------- */
  function start(name) {
    name = String(name || '').trim();
    var me = U.me(); if (!me || V.busy) return;
    if (!name) { U.toast('Schreib zuerst den Namen von einem Spieler.'); return; }
    if (name.toLowerCase() === me.username.toLowerCase()) { U.toast('Das ist deine eigene Farm!'); return; }
    V.busy = true;
    N.farm.visit(tok(), name).then(function (d) {
      if (!d || !d.save) { U.toast(esc(d && d.username || name) + ' hat noch keine Farm.'); return; }
      enter(d);
    }).catch(function (e) { SFX('cant'); U.toast(N.errText(e)); })
      .then(function () { V.busy = false; });
  }
  function enter(d) {
    if (G.visiting) { var keep = V.cam; leave(true); V.cam = keep; }
    U.saveLocal(); U.saveCloud();
    // fremden Spielstand vorbereiten, ohne den eigenen anzufassen
    var home = G.S, sv = {};
    Object.keys(d.save).forEach(function (k) { if (d.save[k] != null) sv[k] = d.save[k]; });
    try { G.adopt(sv); V.data = G.S; } finally { G.S = home; }
    var S = G.S; S.stats.visits = (S.stats.visits || 0) + 1;
    var r = recent(), i = r.map(function (x) { return x.toLowerCase(); }).indexOf(d.username.toLowerCase());
    if (i >= 0) r.splice(i, 1); r.unshift(d.username); if (r.length > 8) r.length = 8;
    U.saveLocal();
    V.home = home; V.merch = G.merch; G.merch = null; V.name = d.username; V.info = d;
    G.S = V.data; G.visiting = true;
    if (!V.cam) V.cam = F.cam();
    F.farmName = d.username + 's Farm'; F.visitReset(); F.focusPen(0);
    U.closeSheet(); if (U.modalOpen()) U.nextModal();
    document.body.classList.add('visiting');
    bar(); SFX('gate');
  }
  function leave(quiet) {
    if (!G.visiting) return;
    G.S = V.home; G.merch = V.merch; G.visiting = false; V.home = null; V.data = null;
    var me = U.me(); F.farmName = me ? me.username + 's Farm' : 'Meine Farm'; F.visitReset();
    if (V.cam) { F.cam(V.cam); V.cam = null; }
    document.body.classList.remove('visiting');
    var b = $('#visitbar'); if (b) b.hidden = true; var hb = $('#visHeart'); if (hb) hb.hidden = true;
    if (!quiet) SFX('close');
    U.refresh();
  }
  var HEART = '<svg viewBox="-26 -24 52 50" class="hsvg" aria-hidden="true"><path d="M0 22C-30 2 -20 -24 0 -9C20 -24 30 2 0 22Z" fill="currentColor" stroke="#2a1d14" stroke-width="4" stroke-linejoin="round"/><path d="M-13 -9Q-17 -2 -12 4" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".8"/></svg>';
  function heart() {
    if (!G.visiting || V.busy || V.info.liked) return;
    V.busy = true; var hb0 = $('#visHeart'); if (hb0) hb0.classList.add('press');
    N.farm.heart(tok(), V.name).then(function (n) {
      V.info.liked = true; V.info.hearts = n;
      var S = V.home; S.stats.hearts = (S.stats.hearts || 0) + 1;
      SFX('heart'); likeBurst();
    }).catch(function (e) { SFX('cant'); U.toast(N.errText(e)); if ((e.message || '').indexOf('heart_done') >= 0) V.info.liked = true; })
      .then(function () { V.busy = false; bar(); var hb = $('#visHeart'); if (hb && V.info.liked) { hb.classList.add('pop'); var c = hb.querySelector('.hcnt'); if (c) c.classList.add('bump'); } });
  }
  // Like-Animation: großes Herz in der Mitte und viele kleine Herzen fliegen hoch
  function likeBurst() {
    var fx = document.createElement('div'); fx.className = 'likefx';
    var h = '<div class="lbig">' + HEART + '<span>Like!</span></div><div class="lring"></div>';
    var cols = ['#ff4f8b', '#ff7aa8', '#e8336f', '#ffb3cf', '#ff2d6f'];
    for (var i = 0; i < 18; i++) {
      var a = (i / 18) * Math.PI * 2, d = 90 + Math.random() * 70;
      h += '<i style="--x:' + Math.round(Math.cos(a) * d) + 'px;--y:' + Math.round(Math.sin(a) * d - 40) + 'px;--s:' + (0.5 + Math.random() * 0.7).toFixed(2) + ';--d:' + (Math.random() * 0.15).toFixed(2) + 's;color:' + cols[i % cols.length] + '">' + HEART + '</i>';
    }
    fx.innerHTML = h; document.body.appendChild(fx);
    var hb = $('#visHeart');
    if (hb) { var r = hb.getBoundingClientRect(); for (var k = 0; k < 10; k++) { var f = document.createElement('i'); f.className = 'hfloat'; f.innerHTML = HEART; f.style.left = (r.left + r.width * (0.2 + Math.random() * 0.6)) + 'px'; f.style.top = (r.top + 6) + 'px'; f.style.setProperty('--dx', Math.round(Math.random() * 80 - 40) + 'px'); f.style.animationDelay = (k * 0.07) + 's'; document.body.appendChild(f); setTimeout(function (el) { el.remove(); }.bind(null, f), 1900); } }
    U.flash('#ffb3cf'); setTimeout(function () { fx.remove(); }, 1600);
  }
  function bar() {
    var b = $('#visitbar');
    if (!b) { b = document.createElement('div'); b.id = 'visitbar'; b.className = 'visitbar'; document.body.appendChild(b); }
    b.hidden = false;
    var S = V.data, d = V.info, sheep = 0; Object.keys(S.sheep || {}).forEach(function (k) { sheep += S.sheep[k]; });
    var deko = (S.dekoPlaced || []).length, cl = S.club && S.club.name ? S.club : null;
    b.innerHTML = '<div class="vtop"><span class="vav"><img src="' + avatar(V.name) + '" alt=""></span><div class="vt"><small>Zu Besuch bei</small><b>' + esc(V.name) + '</b>' +
      (cl ? '<span class="vclub">' + (SI.club ? SI.club.crest(cl.crest, 16) : '') + esc(cl.name) + '</span>' : '') + '</div>' +
      '<button class="btn ghost vhome" data-act="visHome">🏠 Heim</button></div>' +
      '<div class="vstats num"><span><i>🐑</i><b>' + sheep + '</b><small>Schafe</small></span><span><i>🎀</i><b>' + deko + '</b><small>Deko</small></span><span><i>🔁</i><b>' + (S.rebirths || 0) + '</b><small>Rebirths</small></span>' +
      '<span><i>💰</i><b>' + (d.income ? fmt(d.income) : '–') + '</b><small>pro Sek.</small></span></div>';
    var hb = $('#visHeart');
    if (!hb) { hb = document.createElement('button'); hb.id = 'visHeart'; hb.dataset.act = 'visHeart'; document.body.appendChild(hb); }
    hb.hidden = false; hb.className = 'vheart' + (d.liked ? ' on' : ''); hb.disabled = !!d.liked;
    hb.innerHTML = '<span class="hic">' + HEART + '</span><span class="hlb">' + (d.liked ? 'Geliked!' : 'Like') + '</span><b class="hcnt num">' + (d.hearts || 0) + '</b>';
  }

  /* ---------- Menü ---------- */
  function loadMine() {
    var me = U.me(); if (!me) return;
    N.farm.visit(tok(), me.username).then(function (d) { V.myHearts = d.hearts || 0; var sh = U.sheet(); if (sh && sh.name === 'besuch') U.renderSheet(); }).catch(function () { /* egal */ });
  }
  U.views.besuch = function () {
    var me = U.me(), h = '';
    h += '<div class="card vme"><span class="vbig">' + HEART + '<b class="num">' + (V.myHearts == null ? '…' : V.myHearts) + '</b></span><div><h3>Deine Likes</h3><p class="hint">' + (V.myHearts == null ? 'Lädt …' : 'So viele Likes hast du von anderen Spielern für deine Farm bekommen.') + '</p></div></div>';
    h += '<div class="card"><h3>Farm besuchen</h3><div class="durow"><input id="visName" data-vis="name" placeholder="Name vom Spieler" autocomplete="off" autocapitalize="off" maxlength="16" value="' + esc(V.nameIn) + '">' +
      '<button class="btn" data-act="visGo">Besuchen</button></div><p class="hint">Du kannst dir die Farm ansehen und jedem Spieler einmal am Tag ein Like ❤️ geben. Ändern kannst du dort nichts.</p></div>';
    var names = [], seenN = {};
    function add(n, why) { var k = String(n || '').toLowerCase(); if (!k || seenN[k] || (me && k === me.username.toLowerCase())) return; seenN[k] = 1; names.push([n, why]); }
    if (!N.online) add(N.BOT, 'Test-Farm');
    (Array.isArray(G.S.favs) ? G.S.favs : []).forEach(function (n) { add(n, '★ Favorit'); });
    recent().forEach(function (n) { add(n, 'zuletzt besucht'); });
    if (names.length) {
      h += '<div class="card"><h3>Schnell besuchen</h3><div class="list">' + names.map(function (x) {
        return '<div class="li"><img src="' + avatar(x[0]) + '" alt=""><div class="t">' + esc(x[0]) + '<small>' + esc(x[1]) + '</small></div><button class="btn blue" data-act="visit:' + esc(x[0]) + '">🏡 Besuchen</button></div>';
      }).join('') + '</div></div>';
    }
    h += '<p class="hint center">Tipp: In der Bestenliste (🏆) kannst du auch auf jeden Spieler tippen.</p>';
    return { title: 'Farmen besuchen', html: h };
  };
  function avatar(name) { var pool = SI.TYPES.filter(function (t) { return t.r !== 's'; }); return A.sheepURL(pool[A.hash(String(name).toLowerCase()) % pool.length]); }

  document.addEventListener('input', function (e) { if (e.target.dataset && e.target.dataset.vis === 'name') V.nameIn = e.target.value; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.vis === 'name') start(e.target.value); });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    var i = el.dataset.act.indexOf(':'), a = i < 0 ? el.dataset.act : el.dataset.act.slice(0, i), arg = i < 0 ? '' : el.dataset.act.slice(i + 1);
    if (a === 'sheet' && arg === 'besuch') { V.myHearts = V.myHearts == null ? null : V.myHearts; loadMine(); return; }
    if (a === 'visit') start(arg);
    else if (a === 'visGo') { var inp = $('#visName'); start(inp ? inp.value : V.nameIn); }
    else if (a === 'visHome') leave();
    else if (a === 'visHeart') heart();
  });
  SI.visit = { start: start, leave: leave };
})(window.SI);
