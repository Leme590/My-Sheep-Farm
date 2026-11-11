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
    var b = $('#visitbar'); if (b) b.hidden = true;
    if (!quiet) SFX('close');
    U.refresh();
  }
  function heart() {
    if (!G.visiting || V.busy || V.info.liked) return;
    V.busy = true;
    N.farm.heart(tok(), V.name).then(function (n) {
      V.info.liked = true; V.info.hearts = n;
      var S = V.home; S.stats.hearts = (S.stats.hearts || 0) + 1;
      SFX('heart'); U.toast('❤️ Du hast ' + V.name + ' ein Herz geschenkt!');
      var hb = $('#visHeart'); if (hb) U.sparks(hb, 14);
    }).catch(function (e) { SFX('cant'); U.toast(N.errText(e)); if ((e.message || '').indexOf('heart_done') >= 0) V.info.liked = true; })
      .then(function () { V.busy = false; bar(); });
  }
  function bar() {
    var b = $('#visitbar');
    if (!b) { b = document.createElement('div'); b.id = 'visitbar'; b.className = 'visitbar'; document.body.appendChild(b); }
    b.hidden = false;
    var S = V.data, d = V.info, sheep = 0; Object.keys(S.sheep || {}).forEach(function (k) { sheep += S.sheep[k]; });
    var deko = (S.dekoPlaced || []).length;
    b.innerHTML = '<div class="vtop"><span class="vic">🏡</span><div class="vt"><small>Du besuchst</small><b>' + esc(V.name) + 's Farm</b></div>' +
      '<button class="btn ghost vhome" data-act="visHome">🏠 Nach Hause</button></div>' +
      '<div class="vstats num"><span>🐑 <b>' + sheep + '</b> Schafe</span><span>🎀 <b>' + deko + '</b> Deko</span><span>🔁 <b>' + (S.rebirths || 0) + '</b> Rebirth' + (S.rebirths === 1 ? '' : 's') + '</span>' + (d.income ? '<span>💰 <b>' + fmt(d.income) + '</b>/Sek.</span>' : '') + '</div>' +
      '<button class="vheart' + (d.liked ? ' on' : '') + '" id="visHeart" data-act="visHeart"' + (d.liked ? ' disabled' : '') + '><span>' + (d.liked ? '❤️' : '🤍') + '</span>' +
      (d.liked ? 'Herz geschenkt!' : 'Herz schenken') + '<b class="num">' + (d.hearts || 0) + '</b></button>';
  }

  /* ---------- Menü ---------- */
  function loadMine() {
    var me = U.me(); if (!me) return;
    N.farm.visit(tok(), me.username).then(function (d) { V.myHearts = d.hearts || 0; var sh = U.sheet(); if (sh && sh.name === 'besuch') U.renderSheet(); }).catch(function () { /* egal */ });
  }
  U.views.besuch = function () {
    var me = U.me(), h = '';
    h += '<div class="card vme"><span class="vbig">❤️</span><div><h3>Deine Farm</h3><p class="hint">' + (V.myHearts == null ? 'Lädt …' : 'Andere Spieler haben dir <b>' + V.myHearts + (V.myHearts === 1 ? ' Herz' : ' Herzen') + '</b> geschenkt.') + '</p></div></div>';
    h += '<div class="card"><h3>Farm besuchen</h3><div class="durow"><input id="visName" data-vis="name" placeholder="Name vom Spieler" autocomplete="off" autocapitalize="off" maxlength="16" value="' + esc(V.nameIn) + '">' +
      '<button class="btn" data-act="visGo">Besuchen</button></div><p class="hint">Du kannst dir die Farm ansehen und einmal am Tag ein Herz schenken. Ändern kannst du dort nichts.</p></div>';
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
