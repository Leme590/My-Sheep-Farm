/* Schaf-Imperium: die Farm (Canvas), schräg von oben, wischen und zoomen */
(function (SI) {
  'use strict';
  var F = SI.farm = {};
  var A = SI.art, G = SI.G, T = SI.T;
  var K = 0.64;                 // Neigung: ca. 50 Grad
  var PW = 220, PH = 160, GAP = 86, COLS = 4, TOP = 250;
  F.K = K;

  var cv, ctx, lightCv, lg, W = 0, H = 0, dpr = 1;
  var cam = { x: 0, yp: 0, z: 1 };
  var agents = {};      // Schafe pro Gehege-Index
  var trees = [], treeKey = '';
  var grassPat = null, outerPat = null;
  var mode = 'normal', placeId = null, ghost = null;
  var ev = { gold: null, wolf: null, next: Date.now() + 60000 };
  var fireflies = [];
  var time = 0, last = performance.now();
  F.cb = {};

  /* ---------- Maße ---------- */
  F.rows = function () { return Math.ceil(G.plotCount() / COLS); };
  F.size = function () { return { w: COLS * PW + (COLS + 1) * GAP, h: TOP + F.rows() * (PH + GAP) + 40 }; };
  F.plotRect = function (i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GAP + c * (PW + GAP), y: TOP + r * (PH + GAP), w: PW, h: PH };
  };
  var HOUSE = { x: 190, y: 190, w: 150, h: 60 };
  var MERCH = { x: HOUSE.x - 128, y: HOUSE.y + 6 }; // Wanderhändler steht links neben dem Haus

  /* ---------- Start ---------- */
  F.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    lightCv = document.createElement('canvas'); lg = lightCv.getContext('2d');
    makePatterns();
    resize();
    window.addEventListener('resize', resize);
    // Handy drehen: Größe kommt manchmal erst später an, darum nochmal nachmessen (Kai: Querformat war verzerrt)
    window.addEventListener('orientationchange', function () { [50, 250, 600].forEach(function (t) { setTimeout(resize, t); }); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    var s = F.size();
    cam.z = W < 600 ? 0.74 : 1;
    cam.x = Math.min(s.w / 2, W / 2 / cam.z - 20); cam.yp = (TOP + 90) * K;
    clamp();
    bindInput();
    for (var i = 0; i < 40; i++) fireflies.push({ x: Math.random(), y: Math.random(), p: Math.random() * 10 });
    requestAnimationFrame(frame);
  };
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || window.innerWidth; H = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    lightCv.width = cv.width; lightCv.height = cv.height;
    clamp();
  }
  function makePatterns() {
    var c = document.createElement('canvas'); c.width = c.height = 160;
    var g = c.getContext('2d'), R = A.rng(7), i;
    g.fillStyle = '#86d65a'; g.fillRect(0, 0, 160, 160);
    g.fillStyle = '#7ccc50'; for (i = 0; i < 160; i += 40) g.fillRect(i, 0, 20, 160);
    for (i = 0; i < 70; i++) {
      var x = R() * 160, y = R() * 160;
      g.strokeStyle = R() < 0.5 ? '#9be36c' : '#63b23f'; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 2, y + 2); g.lineTo(x - 1, y - 2); g.moveTo(x, y + 2); g.lineTo(x + 1, y - 3); g.moveTo(x + 2, y + 2); g.lineTo(x + 3.5, y - 1.5); g.stroke();
    }
    for (i = 0; i < 10; i++) { var fx = R() * 160, fy = R() * 160; g.fillStyle = ['#ffffff', '#ffe066', '#ff8fb8'][i % 3]; for (var k = 0; k < 5; k++) A.circ(g, fx + Math.cos(k * 1.26) * 1.6, fy + Math.sin(k * 1.26) * 1.6, 1.1); g.fillStyle = '#ffb000'; A.circ(g, fx, fy, 0.9); }
    grassPat = ctx.createPattern(c, 'repeat');
    var o = document.createElement('canvas'); o.width = o.height = 128;
    g = o.getContext('2d'); R = A.rng(11);
    g.fillStyle = '#4fa63e'; g.fillRect(0, 0, 128, 128);
    for (i = 0; i < 110; i++) { g.fillStyle = R() < 0.5 ? '#5bb348' : '#469935'; A.ell(g, R() * 128, R() * 128, 1 + R() * 3, 1 + R() * 2); }
    outerPat = ctx.createPattern(o, 'repeat');
  }
  function buildTrees() {
    var s = F.size(), key = s.w + 'x' + s.h;
    if (key === treeKey) return;
    treeKey = key; trees = [];
    var R = A.rng(99), x, y;
    for (x = -260; x < s.w + 260; x += 46) {
      for (y = -40; y > -260; y -= 60) trees.push({ x: x + R() * 30, y: y + R() * 30, k: Math.floor(R() * 3) });
      for (y = s.h + 50; y < s.h + 300; y += 60) trees.push({ x: x + R() * 30, y: y + R() * 30, k: Math.floor(R() * 3) });
    }
    for (y = 0; y < s.h + 40; y += 52) {
      for (x = -50; x > -260; x -= 50) trees.push({ x: x + R() * 26, y: y + R() * 26, k: Math.floor(R() * 3) });
      for (x = s.w + 50; x < s.w + 260; x += 50) trees.push({ x: x + R() * 26, y: y + R() * 26, k: Math.floor(R() * 3) });
    }
  }

  /* ---------- Kamera ---------- */
  function clamp() {
    var s = F.size();
    cam.z = Math.max(0.35, Math.min(1.8, cam.z));
    cam.x = Math.max(-40, Math.min(s.w + 40, cam.x));
    cam.yp = Math.max(-40 * K, Math.min((s.h + 40) * K, cam.yp));
  }
  F.toWorld = function (sx, sy) { return { x: (sx - W / 2) / cam.z + cam.x, y: ((sy - H / 2) / cam.z + cam.yp) / K }; };
  F.toScreen = function (wx, wy, h) { return { x: (wx - cam.x) * cam.z + W / 2, y: (wy * K - (h || 0) - cam.yp) * cam.z + H / 2 }; };
  F.cam = function (c) { if (c) { cam.x = c.x; cam.yp = c.yp; cam.z = c.z; clamp(); } return { x: cam.x, yp: cam.yp, z: cam.z }; };
  F.focusPen = function (i) { var r = F.plotRect(i); cam.x = r.x + r.w / 2; cam.yp = (r.y + r.h / 2) * K; clamp(); };

  /* ---------- Eingabe: wischen, zoomen, tippen ---------- */
  var pts = {}, drag = null, pinch = null;
  function bindInput() {
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId);
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length === 1) drag = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.yp, moved: false };
      if (ids.length === 1 && mode === 'move' && dekoAt(F.toWorld(e.clientX, e.clientY)) === moveIdx) { dragDeko = true; }
      else if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z }; drag = null;
      }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) {
        if (mode === 'place') ghost = F.toWorld(e.clientX, e.clientY);
        return;
      }
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (pinch && ids.length >= 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        cam.z = pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(10, pinch.d); clamp();
      } else if (drag) {
        var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
        if (drag.moved && dragDeko && G.S.dekoPlaced[moveIdx]) { var wp = F.toWorld(e.clientX, e.clientY); G.S.dekoPlaced[moveIdx].x = Math.round(wp.x); G.S.dekoPlaced[moveIdx].y = Math.round(wp.y + 10); }
        else if (drag.moved) { cam.x = drag.cx - dx / cam.z; cam.yp = drag.cy - dy / cam.z; clamp(); }
      }
      if (mode === 'place') ghost = F.toWorld(e.clientX, e.clientY);
    });
    function up(e) {
      var wasTap = drag && !drag.moved && Object.keys(pts).length === 1;
      delete pts[e.pointerId];
      if (Object.keys(pts).length < 2) pinch = null;
      if (wasTap && e.type === 'pointerup') tap(e.clientX, e.clientY);
      else if (dragDeko && drag && drag.moved) dropDeko();
      if (!Object.keys(pts).length) dragDeko = false;
      if (!Object.keys(pts).length) drag = null;
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      var before = F.toWorld(e.clientX, e.clientY);
      cam.z *= e.deltaY < 0 ? 1.1 : 0.9; clamp();
      var after = F.toWorld(e.clientX, e.clientY);
      cam.x += before.x - after.x; cam.yp += (before.y - after.y) * K; clamp();
    }, { passive: false });
  }
  F.zoom = function (f) { cam.z *= f; clamp(); };

  // Modi: normal, place (Deko aus dem Lager), edit (wegräumen), move (Deko verschieben), movePen (Gehege tauschen)
  var moveIdx = -1, moveOrig = null, dragDeko = false;
  F.setMode = function (m, id) {
    if (mode === 'move' && m !== 'move' && moveOrig && G.S.dekoPlaced[moveIdx]) { // abgebrochen: zurück an den alten Platz, falls ungültig
      var p = G.S.dekoPlaced[moveIdx]; if (!F.canPlace(p.id, p.x, p.y, moveIdx)) { p.x = moveOrig.x; p.y = moveOrig.y; }
    }
    mode = m; placeId = (m === 'place') ? id : null; ghost = null;
    moveIdx = (m === 'move' || m === 'movePen') ? id : -1; dragDeko = false;
    moveOrig = (m === 'move' && G.S.dekoPlaced[id]) ? { x: G.S.dekoPlaced[id].x, y: G.S.dekoPlaced[id].y } : null;
  };
  function dekoAt(w) {
    var best = -1, bd = 1e9;
    G.S.dekoPlaced.forEach(function (p, i) { var d = Math.hypot(p.x - w.x, (p.y - 14 - w.y) * 1.3); if (d < SI.DK[p.id].rad + 16 && d < bd) { bd = d; best = i; } });
    return best;
  }
  F.moveTarget = function () { return moveIdx; };
  F.mode = function () { return mode; };

  function inRect(p, r, pad) { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; }
  F.canPlace = function (id, x, y, ignore) {
    var d = SI.DK[id], s = F.size(), r = d.rad;
    if (x < r + 10 || y < r + 30 || x > s.w - r - 10 || y > s.h - 10) return false;
    for (var i = 0; i < G.plotCount(); i++) if (inRect({ x: x, y: y }, F.plotRect(i), r * 0.6 + 6)) return false;
    if (inRect({ x: x, y: y }, { x: HOUSE.x - HOUSE.w / 2 - 10, y: HOUSE.y - HOUSE.h, w: HOUSE.w + 20, h: HOUSE.h + 20 }, r * 0.6)) return false;
    for (var j = 0; j < G.S.dekoPlaced.length; j++) {
      if (j === ignore) continue;
      var p = G.S.dekoPlaced[j], o = SI.DK[p.id];
      if (Math.hypot((p.x - x), (p.y - y) * 1.4) < (o.rad + r) * 0.75) return false;
    }
    return true;
  };

  function dropDeko() {
    var p = G.S.dekoPlaced[moveIdx]; if (!p) return;
    if (F.canPlace(p.id, p.x, p.y, moveIdx)) { moveOrig = { x: p.x, y: p.y }; F.cb.moved && F.cb.moved(p.id); }
    else { if (moveOrig) { p.x = moveOrig.x; p.y = moveOrig.y; } F.cb.toast && F.cb.toast('Da passt sie nicht hin. Zieh sie auf freie Wiese.'); SI.sfx && SI.sfx.play('cant'); }
  }
  function tap(sx, sy) {
    if (G.visiting) return; // fremde Farm: nur anschauen
    var w = F.toWorld(sx, sy);
    // 1. Ereignisse
    if (ev.gold) {
      var gs = F.toScreen(ev.gold.x, ev.gold.y);
      if (Math.hypot(gs.x - sx, gs.y - 18 * cam.z - sy) < Math.max(34, 34 * cam.z)) {
        var a = Math.max(70, G.fullIncome() * 84); G.earn(a); G.S.stats.golden++; // Kai: 70 % von vorher (120 Sek.)
        F.cb.pop && F.cb.pop(sx, sy, '+' + G.fmt(a)); F.cb.toast && F.cb.toast('Goldenes Schaf gefangen! +' + G.fmt(a));
        ev.gold = null; SI.sfx && SI.sfx.play('gold'); F.cb.change && F.cb.change(); return;
      }
    }
    if (ev.wolf) {
      var ws = F.toScreen(ev.wolf.x, ev.wolf.y);
      if (Math.hypot(ws.x - sx, ws.y - 18 * cam.z - sy) < Math.max(40, 40 * cam.z)) {
        ev.wolf.hp--; ev.wolf.hit = 0.25; SI.sfx && SI.sfx.play('hit');
        F.cb.pop && F.cb.pop(sx, sy, ev.wolf.hp > 0 ? 'Noch ' + ev.wolf.hp + '×' : 'Weg!');
        if (ev.wolf.hp <= 0) {
          ev.wolf = null; G.wolfActive = false; G.S.stats.wolves++;
          var b = Math.max(50, G.fullIncome() * 30); G.earn(b);
          F.cb.toast && F.cb.toast('Wolf verjagt! Belohnung: +' + G.fmt(b)); SI.sfx && SI.sfx.play('win');
        }
        F.cb.change && F.cb.change(); return;
      }
    }
    // 2. Deko setzen / wegnehmen
    if (mode === 'place') {
      if (F.canPlace(placeId, w.x, w.y)) { F.cb.place && F.cb.place(placeId, w.x, w.y); }
      else F.cb.toast && F.cb.toast('Hier ist kein Platz. Tippe auf freie Wiese zwischen den Gehegen.');
      return;
    }
    if (mode === 'move') {
      var p = G.S.dekoPlaced[moveIdx]; if (!p) return;
      var hit0 = dekoAt(w);
      if (hit0 >= 0 && hit0 !== moveIdx) { F.setMode('move', hit0); F.cb.dekoTap && F.cb.dekoTap(hit0); return; }
      if (hit0 === moveIdx) return;
      var ox0 = p.x, oy0 = p.y; p.x = Math.round(w.x); p.y = Math.round(w.y);
      if (F.canPlace(p.id, p.x, p.y, moveIdx)) { moveOrig = { x: p.x, y: p.y }; F.cb.moved && F.cb.moved(p.id); }
      else { p.x = ox0; p.y = oy0; F.cb.toast && F.cb.toast('Da ist kein Platz. Tippe auf freie Wiese.'); SI.sfx && SI.sfx.play('cant'); }
      return;
    }
    if (mode === 'movePen') {
      for (var pi = 0; pi < G.plotCount(); pi++) {
        if (!inRect(w, F.plotRect(pi), 4)) continue;
        if (pi === moveIdx) { F.cb.penMoved && F.cb.penMoved(-1); return; }
        var tmp = G.S.pens[pi]; G.S.pens[pi] = G.S.pens[moveIdx]; G.S.pens[moveIdx] = tmp;
        var ta = agents[pi]; agents[pi] = agents[moveIdx]; agents[moveIdx] = ta;
        if (!agents[pi]) delete agents[pi]; if (!agents[moveIdx]) delete agents[moveIdx];
        F.cb.penMoved && F.cb.penMoved(pi); return;
      }
      F.cb.toast && F.cb.toast('Tippe auf einen anderen Gehege-Platz.');
      return;
    }
    if (mode === 'edit') {
      var best = -1, bd = 1e9;
      G.S.dekoPlaced.forEach(function (p, i) { var d = Math.hypot(p.x - w.x, (p.y - w.y) * 1.3); if (d < SI.DK[p.id].rad + 14 && d < bd) { bd = d; best = i; } });
      if (best >= 0) F.cb.pickup && F.cb.pickup(best);
      return;
    }
    // 3. Deko antippen = verschieben
    var dk = dekoAt(w);
    if (dk >= 0) { F.cb.dekoTap && F.cb.dekoTap(dk); return; }
    // 4. Gehege und Schafe
    for (var i = 0; i < G.plotCount(); i++) {
      var r = F.plotRect(i);
      if (!inRect(w, r, 4)) continue;
      var pen = G.S.pens[i];
      if (!pen) { F.cb.empty && F.cb.empty(i); return; }
      var list = agents[i] || [], hit = null, hd = 1e9;
      list.forEach(function (ag) { var d = Math.hypot(r.x + ag.x - w.x, (r.y + ag.y - w.y) * 1.3 + 10); if (d < 26 && d < hd) { hd = d; hit = ag; } });
      if (hit) return; // Schafe antippen macht nichts
      F.cb.pen && F.cb.pen(i); return;
    }
    if (G.merch && inRect(w, { x: MERCH.x - 44, y: MERCH.y - 120, w: 88, h: 130 })) { F.cb.merchantTap && F.cb.merchantTap(); return; }
    if (inRect(w, { x: HOUSE.x - HOUSE.w / 2, y: HOUSE.y - 90, w: HOUSE.w, h: 100 })) { F.cb.house && F.cb.house(); }
  }

  /* ---------- Schafe laufen lassen ---------- */
  function syncAgents() {
    for (var i = 0; i < G.plotCount(); i++) {
      var pen = G.S.pens[i];
      var want = pen ? Math.min(pen.n || 0, G.penCap(pen.lvl), 14) : 0;
      var list = agents[i];
      if (!list || (pen && list.t !== pen.t) || !pen) { list = agents[i] = []; list.t = pen ? pen.t : null; }
      while (list.length < want) list.push(newAgent());
      if (list.length > want) list.length = want;
    }
    Object.keys(agents).forEach(function (k) { if (+k >= G.plotCount()) delete agents[k]; });
  }
  function newAgent() {
    var x = 24 + Math.random() * (PW - 48), y = 40 + Math.random() * (PH - 60);
    return { x: x, y: y, tx: x, ty: y, wait: Math.random() * 3, face: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * 10, hop: 0 };
  }
  // Das Nachtschaf ist andersrum: es schläft am Tag und ist nachts wach (Kai)
  function sleepsNow(tid, sleeping, owlSleep) { return tid === 'nacht' ? owlSleep : sleeping; }
  function moveAgents(dt, sleeping, owlSleep) {
    Object.keys(agents).forEach(function (k) {
      var pen = G.S.pens[k], zz = sleepsNow(pen && pen.t, sleeping, owlSleep);
      agents[k].forEach(function (a) {
        if (a.hop > 0) a.hop -= dt;
        if (zz) return;
        var dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d < 1) {
          a.wait -= dt;
          if (a.wait <= 0) { a.tx = 24 + Math.random() * (PW - 48); a.ty = 40 + Math.random() * (PH - 60); a.wait = 1 + Math.random() * 4; }
        } else {
          var sp = 16 * dt; a.x += dx / d * Math.min(sp, d); a.y += dy / d * Math.min(sp, d);
          if (Math.abs(dx) > 0.5) a.face = dx > 0 ? 1 : -1;
          a.ph += dt * 8;
        }
      });
    });
  }

  /* ---------- Ereignisse ---------- */
  function events(dt, cyc) {
    var now = Date.now(), s = F.size();
    if (ev.gold) {
      ev.gold.x += ev.gold.dir * 130 * dt; ev.gold.ph += dt * 14;
      if (ev.gold.x < -400 || ev.gold.x > s.w + 400) ev.gold = null;
    }
    if (ev.wolf) {
      if (ev.wolf.hit > 0) ev.wolf.hit -= dt;
      if (now > ev.wolf.end || !cyc.night) { ev.wolf = null; G.wolfActive = false; F.cb.toast && F.cb.toast('Der Wolf ist weitergezogen.'); }
    }
    if (now < ev.next || ev.gold || ev.wolf || G.merch || G.sheepCount() < 2 || (F.cb.busy && F.cb.busy())) return;
    ev.next = now + (80 + Math.random() * 110) * 1000;
    var r = Math.random();
    if (cyc.night && r < 0.45) spawnWolf();
    else if (!cyc.night && r < 0.55) spawnGold();
    else if (r < 0.85) { F.cb.merchant && F.cb.merchant(); }
    else spawnGold();
  }
  function spawnGold() {
    var s = F.size(), dir = Math.random() < 0.5 ? 1 : -1;
    var cy = cam.yp / K + (Math.random() - 0.5) * (H / cam.z / K) * 0.4;
    var halfW = W / 2 / cam.z;
    ev.gold = { x: dir > 0 ? cam.x - halfW - 60 : cam.x + halfW + 60, y: Math.min(s.h - 20, Math.max(TOP - 40, cy)), dir: dir, ph: 0 };
    F.cb.toast && F.cb.toast('Ein goldenes Schaf rennt über die Farm! Schnell antippen!'); SI.sfx && SI.sfx.play('goldSpawn');
  }
  function spawnWolf() {
    if (G.card('hund')) { G.S.stats.wolves++; F.cb.toast && F.cb.toast('Ein Wolf kam vorbei, dein Hütehund hat ihn verjagt!'); return; }
    var pens = []; for (var i = 0; i < G.plotCount(); i++) if (G.S.pens[i]) pens.push(i);
    if (!pens.length) return;
    var r = F.plotRect(G.rnd(pens));
    ev.wolf = { x: r.x + r.w / 2 + (Math.random() < 0.5 ? -70 : 70), y: r.y + r.h + 46, hp: 5, end: Date.now() + 30000, hit: 0 };
    G.wolfActive = true;
    cam.x = ev.wolf.x; cam.yp = (ev.wolf.y - 40) * K; clamp();
    F.cb.toast && F.cb.toast('Ein Wolf schleicht um deine Schafe! Tippe ihn 5× an.'); SI.sfx && SI.sfx.play('wolf');
  }
  F.debugEvent = function (k) { if (k === 'gold') spawnGold(); if (k === 'wolf') spawnWolf(); };

  /* ---------- Zeichnen ---------- */
  var OUTC = '#2a1a12';
  function drawFence(r, rar, front, label, lvl) {
    var f = A.FENCE[rar] || A.FENCE.c;
    if (lvl >= 5) f = { post: f.post, rail: f.rail, top: '#ffd23f' };
    var yT = r.y * K, yB = (r.y + r.h) * K, x0 = r.x, x1 = r.x + r.w;
    function post(x, y) {
      A.rrect(ctx, x - 3.2, y - 20, 6.4, 20, 2); ctx.fillStyle = f.post; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 1.5; ctx.stroke();
      A.rrect(ctx, x - 3.2, y - 21.5, 6.4, 4, 1.6); ctx.fillStyle = f.top; ctx.fill(); ctx.stroke();
    }
    function rail(xa, ya, xb, yb) {
      ctx.lineCap = 'round';
      [15, 7].forEach(function (h) {
        ctx.strokeStyle = OUTC; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(xa, ya - h); ctx.lineTo(xb, yb - h); ctx.stroke();
        ctx.strokeStyle = f.rail; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(xa, ya - h); ctx.lineTo(xb, yb - h); ctx.stroke();
      });
    }
    var n, i, x, y;
    if (!front) {
      rail(x0, yT, x1, yT);
      n = Math.round(r.w / 30); for (i = 0; i <= n; i++) post(x0 + r.w * i / n, yT);
      rail(x0, yT, x0, yB); rail(x1, yT, x1, yB);
      n = Math.round(r.h / 32);
      for (i = 1; i < n; i++) { y = yT + (yB - yT) * i / n; post(x0, y); post(x1, y); }
    } else {
      var gate = 30, mid = x0 + r.w / 2;
      rail(x0, yB, mid - gate, yB); rail(mid + gate, yB, x1, yB);
      n = Math.round(r.w / 30);
      for (i = 0; i <= n; i++) { x = x0 + r.w * i / n; if (Math.abs(x - mid) > gate - 2 || i === 0 || i === n) post(x, yB); }
      post(mid - gate, yB); post(mid + gate, yB);
      if (label) {
        var fs = Math.round(Math.min(22, Math.max(12, 9 / cam.z)));
        ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
        var tw = ctx.measureText(label).width + fs * 1.3, lh = fs * 1.75, top = yB - 22 - lh;
        A.rrect(ctx, mid - 2, yB - 24, 4, 24, 1); ctx.fillStyle = '#7a4a2a'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 1.3; ctx.stroke();
        A.rrect(ctx, mid - tw / 2, top + 2.5, tw, lh, 7); ctx.fillStyle = '#5e3b1f'; ctx.fill();
        A.rrect(ctx, mid - tw / 2, top, tw, lh, 7); ctx.fillStyle = '#c98a4a'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 2; ctx.stroke();
        A.rrect(ctx, mid - tw / 2 + 3, top + 3, tw - 6, lh * 0.4, 5); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.strokeStyle = OUTC; ctx.lineWidth = fs * 0.28; ctx.strokeText(label, mid, top + lh / 2 + 1);
        ctx.fillStyle = '#ffffff'; ctx.fillText(label, mid, top + lh / 2 + 1);
        // Sterne für die Ausbau-Stufe
        for (var st = 0; st < (lvl || 1) - 1; st++) {
          var sx = mid + (st - ((lvl || 1) - 2) / 2) * fs * 1.05, sy = top - fs * 0.35;
          A.star(ctx, sx, sy, fs * 0.5, fs * 0.22, 5); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 1.6; ctx.stroke();
        }
      }
    }
  }

  function frame(nowMs) {
    var dt = Math.min(0.1, (nowMs - last) / 1000); last = nowMs; time += dt;
    if (cv.clientWidth && (cv.clientWidth !== W || cv.clientHeight !== H)) resize(); // Bild nie verzerren
    var cyc = G.cycle();
    var sleeping = cyc.night && cyc.dark > 0.8, owlSleep = !cyc.night && cyc.dark < 0.2;
    buildTrees(); syncAgents(); moveAgents(dt, sleeping, owlSleep); events(dt, cyc);
    var s = F.size();
    var z = cam.z, ox = W / 2 - cam.x * z, oy = H / 2 - cam.yp * z;

    // Boden
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#45993a'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * z, 0, 0, dpr * z * K, dpr * ox, dpr * oy);
    ctx.fillStyle = outerPat; ctx.fillRect(-900, -900, s.w + 1800, s.h + 1800);
    A.rrect(ctx, -14, -14, s.w + 28, s.h + 28, 34); ctx.fillStyle = '#3b7f2c'; ctx.fill();
    ctx.fillStyle = grassPat; A.rrect(ctx, -10, -10, s.w + 20, s.h + 20, 30); ctx.fill();
    // Wege (mit Rand)
    var py = TOP - GAP / 2 - 17;
    function paths(pad, col) {
      ctx.fillStyle = col;
      A.rrect(ctx, 20 - pad, py - pad, s.w - 40 + pad * 2, 34 + pad * 2, 17 + pad); ctx.fill();
      for (var c = 0; c <= COLS; c++) { var px = GAP / 2 + c * (PW + GAP) - 16; A.rrect(ctx, px - pad, py - pad, 32 + pad * 2, s.h - py - 30 + pad * 2, 16 + pad); ctx.fill(); }
      A.rrect(ctx, HOUSE.x - 20 - pad, HOUSE.y - 6 - pad, 40 + pad * 2, py - HOUSE.y + 24 + pad * 2, 12); ctx.fill();
    }
    paths(4, '#b98a4e'); paths(0, '#f0cf8c');
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    var R0 = A.rng(5); for (var q = 0; q < 60; q++) { A.ell(ctx, 30 + R0() * (s.w - 60), py + 4 + R0() * 26, 2, 1.2); }
    // Gehege-Böden
    var i, r, pen;
    for (i = 0; i < G.plotCount(); i++) {
      r = F.plotRect(i); pen = G.S.pens[i];
      if (pen) {
        A.rrect(ctx, r.x - 5, r.y - 5, r.w + 10, r.h + 12, 16); ctx.fillStyle = 'rgba(30,60,20,.35)'; ctx.fill();
        ctx.save(); A.rrect(ctx, r.x, r.y, r.w, r.h, 12); ctx.clip();
        ctx.drawImage(A.penGround(T[pen.t], PW, PH), r.x, r.y, r.w, r.h);
        ctx.restore();
        A.rrect(ctx, r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = OUTC; ctx.lineWidth = 3; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.12)'; A.rrect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
        ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 3; A.rrect(ctx, r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // Platzier-Vorschau
    if (mode === 'place' && ghost) {
      var ok = F.canPlace(placeId, ghost.x, ghost.y), rad = SI.DK[placeId].rad;
      ctx.fillStyle = ok ? 'rgba(80,255,120,.35)' : 'rgba(255,60,60,.35)'; A.ell(ctx, ghost.x, ghost.y, rad, rad);
    }
    if (mode === 'move' && G.S.dekoPlaced[moveIdx]) {
      var mp = G.S.dekoPlaced[moveIdx], mr = SI.DK[mp.id].rad + 8, okm = F.canPlace(mp.id, mp.x, mp.y, moveIdx);
      ctx.fillStyle = okm ? 'rgba(80,255,120,.35)' : 'rgba(255,60,60,.4)'; A.ell(ctx, mp.x, mp.y, mr, mr);
      ctx.strokeStyle = okm ? '#ffffff' : '#ff4040'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -time * 20;
      ctx.beginPath(); ctx.ellipse(mp.x, mp.y, mr + 4, mr + 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    if (mode === 'movePen') {
      for (var mq = 0; mq < G.plotCount(); mq++) {
        var rq = F.plotRect(mq), sel = mq === moveIdx;
        ctx.strokeStyle = sel ? '#ffd23f' : 'rgba(255,255,255,' + (0.55 + 0.35 * Math.sin(time * 5)) + ')'; ctx.lineWidth = sel ? 7 : 4;
        ctx.setLineDash(sel ? [] : [14, 10]); ctx.lineDashOffset = -time * 30; A.rrect(ctx, rq.x - 8, rq.y - 8, rq.w + 16, rq.h + 16, 18); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    if (mode === 'edit') {
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
      G.S.dekoPlaced.forEach(function (p) { ctx.beginPath(); ctx.ellipse(p.x, p.y, SI.DK[p.id].rad + 6, SI.DK[p.id].rad + 6, 0, 0, Math.PI * 2); ctx.stroke(); });
      ctx.setLineDash([]);
    }

    // Aufrechte Dinge, von hinten nach vorne
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
    var list = [];
    sky.forEach(function (e) { if (e.k === 'rainbow' && e.t >= 0) list.push({ y: -1e6, f: function () { drawRainbow(e); } }); });
    trees.forEach(function (t) { list.push({ y: t.y, f: function () { A.drawTree(ctx, t.k, t.x, t.y * K); } }); });
    list.push({ y: HOUSE.y, f: function () { A.drawHouse(ctx, HOUSE.x, HOUSE.y * K, time, cyc.dark > 0.4); } });
    if (G.merch) list.push({ y: MERCH.y, f: function () {
      A.drawMerchant(ctx, MERCH.x, MERCH.y * K, time);
      // hüpfendes Ausrufezeichen über dem Händler
      var by = MERCH.y * K - 96 - Math.abs(Math.sin(time * 3.2)) * 8, sc = 1 + Math.sin(time * 6) * 0.05;
      ctx.save(); ctx.translate(MERCH.x + 4, by); ctx.scale(sc, sc);
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.283); ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(0, 20); ctx.lineTo(5, 12); ctx.closePath(); ctx.fillStyle = '#ffcf3a'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 12.5, 0, 6.283); ctx.fill();
      ctx.font = '22px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4; ctx.strokeText('!', 0, 1.5); ctx.fillStyle = '#fff'; ctx.fillText('!', 0, 1.5);
      ctx.restore();
    } });
    // Briefkasten mit Schild
    list.push({ y: HOUSE.y + 10, f: function () {
      ctx.save(); ctx.translate(HOUSE.x + 110, (HOUSE.y + 10) * K);
      var nm = F.farmName || 'Meine Farm';
      ctx.font = '16px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      var tw = ctx.measureText(nm).width + 22;
      A.rrect(ctx, -3, -32, 6, 32, 1.5); ctx.fillStyle = '#7a4a2a'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 1.4; ctx.stroke();
      A.rrect(ctx, -tw / 2, -54 + 3, tw, 26, 7); ctx.fillStyle = '#5e3b1f'; ctx.fill();
      A.rrect(ctx, -tw / 2, -54, tw, 26, 7); ctx.fillStyle = '#c98a4a'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4.4; ctx.strokeText(nm, 0, -40); ctx.fillStyle = '#ffe9a0'; ctx.fillText(nm, 0, -40);
      ctx.restore();
    } });
    for (i = 0; i < G.plotCount(); i++) (function (i) {
      var r = F.plotRect(i), pen = G.S.pens[i];
      if (!pen) {
        list.push({ y: r.y + r.h, f: function () {
          var cx = r.x + r.w / 2, cy = (r.y + r.h / 2) * K;
          ctx.beginPath(); ctx.arc(cx, cy - 8, 15, 0, Math.PI * 2); ctx.fillStyle = '#5ccf4a'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 2.4; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.fillRect(cx - 7, cy - 10.5, 14, 5); ctx.fillRect(cx - 2.5, cy - 15, 5, 14);
          ctx.font = '13px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
          ctx.strokeStyle = OUTC; ctx.lineWidth = 3.5; ctx.strokeText('Freier Platz', cx, cy + 18); ctx.fillStyle = '#fff'; ctx.fillText('Freier Platz', cx, cy + 18);
        } });
        return;
      }
      var t = T[pen.t];
      list.push({ y: r.y + r.h, f: function () {
        drawFence(r, t.r, false, null, pen.lvl);
        var R = A.rng(A.hash(t.id + i));
        t.pen.props.forEach(function (pr, k) {
          var parts = pr.split(':'), fn = A.props[parts[0]];
          var px = r.x + 26 + (k / Math.max(1, t.pen.props.length - 1)) * (r.w - 52) + (R() - 0.5) * 20;
          var pyy = r.y + 16 + R() * 14;
          A.drawProp(ctx, parts[0], parts[1], px, pyy * K, time);
        });
        // Ausbau-Stufen: hinten
        if (pen.lvl >= 3) { A.drawPenItem(ctx, 'lantern', r.x + 10, r.y * K + 4); A.drawPenItem(ctx, 'lantern', r.x + r.w - 10, r.y * K + 4); }
        if (pen.lvl >= 4) A.drawPenItem(ctx, 'shelter', r.x + r.w - 40, (r.y + 46) * K);
        if (pen.lvl >= 5) A.drawPenItem(ctx, 'flag', r.x + 34, (r.y + 40) * K, SI.RAR[t.r].col);
        var ags = (agents[i] || []).slice().sort(function (a, b) { return a.y - b.y; });
        var zz = sleepsNow(pen.t, sleeping, owlSleep);
        ags.forEach(function (a, k) {
          var fr = zz ? 0 : (Math.floor(a.ph) % 2), hop = a.hop > 0 ? Math.sin((0.35 - a.hop) / 0.35 * Math.PI) * 10 : 0;
          var sx = r.x + a.x, sy = (r.y + a.y) * K - hop;
          A.drawSheep2(ctx, t, sx, sy, fr, zz, 0.82, a.face < 0);
          if (zz && k % 2 === 0) {
            var zp = (time * 0.5 + k * 0.3) % 1;
            ctx.globalAlpha = 1 - zp; ctx.font = (10 + zp * 7) + 'px "Lilita One", sans-serif'; ctx.textAlign = 'center';
            ctx.strokeStyle = OUTC; ctx.lineWidth = 3; ctx.strokeText('z', sx + 14 * a.face + zp * 8, sy - 38 - zp * 14);
            ctx.fillStyle = '#fff'; ctx.fillText('z', sx + 14 * a.face + zp * 8, sy - 38 - zp * 14); ctx.globalAlpha = 1;
          }
        });
        // Ausbau-Stufen: vorne
        if (pen.lvl >= 2) { A.drawPenItem(ctx, 'trough', r.x + r.w - 42, (r.y + r.h - 14) * K); A.drawPenItem(ctx, 'bucket', r.x + 26, (r.y + r.h - 12) * K); }
        if (pen.lvl >= 3) A.drawPenItem(ctx, 'flowerbox', r.x + r.w / 2 - 52, (r.y + r.h - 8) * K);
        if (pen.lvl >= 5) {
          for (var sp = 0; sp < 5; sp++) { var ph = (time * 0.6 + sp * 0.37 + i * 0.13) % 1, sxp = r.x + 20 + ((sp * 53 + i * 31) % (r.w - 40)), syp = (r.y + 20 + ((sp * 37) % (r.h - 40))) * K - ph * 30;
            ctx.globalAlpha = Math.sin(ph * Math.PI); A.star(ctx, sxp, syp, 4, 1.5, 4); ctx.fillStyle = '#fff6a0'; ctx.fill(); ctx.globalAlpha = 1; }
        }
        var cnt = pen.n || 0, cap = G.penCap(pen.lvl), wait = G.penOf(pen.t) === i ? G.extras(pen.t) : 0;
        drawFence(r, t.r, true, t.n + ' · ' + cnt + '/' + cap + (wait ? ' +' + wait : ''), pen.lvl);
      } });
    })(i);
    G.S.dekoPlaced.forEach(function (p) {
      list.push({ y: p.y, f: function () { A.drawDeko(ctx, p.id, p.x, p.y * K, time, cyc.dark > 0.4); } });
    });
    if (mode === 'place' && ghost) {
      list.push({ y: ghost.y, f: function () { ctx.globalAlpha = 0.65; A.drawDeko(ctx, placeId, ghost.x, ghost.y * K, time, false); ctx.globalAlpha = 1; } });
    }
    if (ev.gold) {
      list.push({ y: ev.gold.y, f: function () {
        var g = ev.gold, hop = Math.abs(Math.sin(g.ph * 0.5)) * 8;
        ctx.save(); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 18;
        A.blit(ctx, A.sheepSpr(T.gold, Math.floor(g.ph) % 2, false), g.x, g.y * K - hop, 1.15, g.dir < 0);
        ctx.restore();
        ctx.fillStyle = 'rgba(255,240,150,.9)';
        for (var k = 0; k < 4; k++) A.circ(ctx, g.x - g.dir * (20 + k * 12), g.y * K - 10 - Math.sin(time * 8 + k) * 6, 2.2 - k * 0.4);
      } });
    }
    if (ev.wolf) {
      list.push({ y: ev.wolf.y, f: function () {
        var w = ev.wolf;
        A.drawWolf(ctx, w.x + (w.hit > 0 ? Math.sin(time * 60) * 3 : 0), w.y * K, time, 1.5);
        ctx.font = '14px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        A.rrect(ctx, w.x - 32, w.y * K - 84, 64, 24, 12); ctx.fillStyle = '#e8402e'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeText('Tipp ' + w.hp + '×', w.x, w.y * K - 71.5); ctx.fillStyle = '#fff'; ctx.fillText('Tipp ' + w.hp + '×', w.x, w.y * K - 71.5);
      } });
    }
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (it) { it.f(); });

    // Nacht und Licht
    if (cyc.dark > 0.01) drawNight(cyc.dark, ox, oy, z);
    // Himmel, Geld pro Sekunde über jedem Gehege (grün) und Effekte – alles in Welt-Koordinaten
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
    drawSky(dt, cyc);
    drawIncomeLabels();
    drawNewMarks();
    drawBursts(dt);
    requestAnimationFrame(frame);
  }

  /* ---------- Himmel: Regenbogen, Vögel, Sternschnuppen, Glühwürmchen ----------
     Alles liegt fest in der Welt (wie die Schafe): Zoomen und Wischen bewegt es mit. */
  var sky = [], skyNext = Date.now() + 20000;
  function view() { var a = F.toWorld(0, 0), b = F.toWorld(W, H); return { x0: a.x, y0: a.y, x1: b.x, y1: b.y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
  function skySpawn(kind) {
    var v = view(), snd = !!SI.sfx;
    if (kind === 'rainbow') { var fsz = F.size(); sky.push({ k: 'rainbow', t: 0, life: 40, x: Math.max(300, Math.min(fsz.w - 300, v.cx)), y: -60, R: 430 }); snd && SI.sfx.play('rainbow'); }
    if (kind === 'birds') {
      var dir = Math.random() < 0.5 ? 1 : -1, n = 5 + Math.floor(Math.random() * 5), y = v.y0 + (v.y1 - v.y0) * (0.3 + Math.random() * 0.5), birds = [];
      for (var i = 0; i < n; i++) { var row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; birds.push({ dx: -dir * row * 30, dy: side * row * 24 * (i ? 1 : 0), ph: Math.random() * 6 }); }
      var span = v.x1 - v.x0 + 600;
      sky.push({ k: 'birds', t: 0, life: span / 90, x: dir > 0 ? v.x0 - 300 : v.x1 + 300, y: y, dir: dir, b: birds, h: 130 });
      snd && SI.sfx.play('flock');
    }
    if (kind === 'butterflies') {
      for (var j = 0; j < 4; j++) sky.push({ k: 'fly', t: 0, life: 20, x: v.cx + (Math.random() - 0.5) * (v.x1 - v.x0) * 0.7, y: v.cy + (Math.random() - 0.5) * (v.y1 - v.y0) * 0.6, ph: Math.random() * 6, c: ['#ff8ad8', '#ffd23f', '#7fd8ff', '#b88aff'][j] });
    }
    if (kind === 'star' || kind === 'shower') {
      var m = kind === 'shower' ? 4 + Math.floor(Math.random() * 4) : 1;
      for (var q = 0; q < m; q++) {
        var ang = 0.45 + Math.random() * 0.35, sp = 650 + Math.random() * 300, sd = Math.random() < 0.5 ? 1 : -1;
        var sx = v.x0 + (v.x1 - v.x0) * (sd > 0 ? 0.05 + Math.random() * 0.5 : 0.45 + Math.random() * 0.5), sy = (v.y0 + (v.y1 - v.y0) * Math.random() * 0.35) * K;
        sky.push({ k: 'star', t: -q * (0.35 + Math.random() * 0.4), life: 1.3, x: sx, y: sy, vx: Math.cos(ang) * sp * sd, vy: Math.sin(ang) * sp });
        if (snd) setTimeout(function () { SI.sfx.play('star'); }, q * 450);
      }
    }
    if (kind === 'swarm') { var s2 = F.size(); for (var w = 0; w < 26; w++) fireflies.push({ x: (v.cx + (Math.random() - 0.5) * 300) / s2.w, y: (v.cy + (Math.random() - 0.5) * 220) / s2.h, p: Math.random() * 20, tmp: 25 }); }
  }
  F.debugSky = skySpawn;
  // Regenbogen über der Farm: steht hinter dem Wald am oberen Rand, die Bäume verdecken seine Enden
  function drawRainbow(e) {
    var fade = Math.min(1, e.t / 3, (e.life - e.t) / 3), R = e.R, lw = 16, cy = e.y * K;
    ctx.save(); ctx.globalAlpha = 0.5 * fade; ctx.lineWidth = lw;
    ['#ff5f6d', '#ffa64a', '#fff36b', '#6bf08a', '#5ab8ff', '#7a6bff', '#c36bff'].forEach(function (c, i) {
      ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(e.x, cy, R - i * lw, Math.PI, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 0.25 * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(e.x, cy, R + lw * 0.5 + 2, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function drawSky(dt, cyc) {
    var now = Date.now();
    if (now > skyNext && !(F.cb.busy && F.cb.busy())) {
      skyNext = now + (20 + Math.random() * 35) * 1000;
      if (cyc.dark < 0.3) { var x = Math.random(); skySpawn(x < 0.18 ? 'rainbow' : x < 0.7 ? 'birds' : 'butterflies'); }
      else if (cyc.dark > 0.6) { var y = Math.random(); skySpawn(y < 0.55 ? 'star' : y < 0.75 ? 'shower' : 'swarm'); }
    }
    // Glühwürmchen (nachts), schweben über der Farm
    if (cyc.dark > 0.5) {
      var fs = F.size();
      fireflies = fireflies.filter(function (f) { return f.tmp == null || (f.tmp -= dt) > 0; });
      fireflies.forEach(function (f) {
        f.p += dt;
        var wx = f.x * fs.w + Math.sin(f.p * 0.7) * 40, wy = (f.y * fs.h + Math.cos(f.p * 0.5) * 30) * K - 18 - Math.sin(f.p * 1.3) * 10;
        var a = Math.max(0, Math.sin(f.p * 2.2 + f.x * 9)) * cyc.dark * (f.tmp != null ? Math.min(1, f.tmp / 3) : 1);
        if (a < 0.02) return;
        var gr = ctx.createRadialGradient(wx, wy, 0, wx, wy, 12);
        gr.addColorStop(0, 'rgba(230,255,120,' + 0.55 * a + ')'); gr.addColorStop(1, 'rgba(230,255,120,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(wx, wy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,200,' + a + ')'; ctx.beginPath(); ctx.arc(wx, wy, 2.2, 0, Math.PI * 2); ctx.fill();
      });
    }
    if (!sky.length) return;
    // Tag-Sachen verschwinden, wenn es dunkel wird
    if (cyc.dark > 0.5) sky.forEach(function (e) { if (e.k !== 'star' && e.life - e.t > 3) e.life = e.t + 3; });
    sky = sky.filter(function (e) { return (e.t += dt) < e.life; });
    sky.forEach(function (e) {
      if (e.t < 0) return;
      var fade = Math.min(1, e.t / 3, (e.life - e.t) / 3);
      if (e.k === 'rainbow') {
        // wird hinter den Bäumen gezeichnet (siehe drawRainbow)
      } else if (e.k === 'birds') {
        e.x += e.dir * 90 * dt;
        e.b.forEach(function (b) {
          var x = e.x + b.dx, gy = (e.y + b.dy) * K, y = gy - e.h, f = Math.sin(e.t * 9 + b.ph) * 7;
          ctx.globalAlpha = 0.2; ctx.fillStyle = '#1a3010'; ctx.beginPath(); ctx.ellipse(x, gy, 9, 3.5, 0, 0, 6.283); ctx.fill(); // Schatten auf dem Boden
          ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(x - 12, y - f); ctx.quadraticCurveTo(x - 5, y - 5 - f * 0.4, x, y); ctx.quadraticCurveTo(x + 5, y - 5 - f * 0.4, x + 12, y - f);
          ctx.strokeStyle = OUTC; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.stroke();
        });
      } else if (e.k === 'fly') {
        e.ph += dt; e.x += (Math.cos(e.ph * 0.7) * 30 + 8) * dt; e.y += Math.sin(e.ph * 1.3) * 20 * dt;
        var wv = Math.abs(Math.sin(e.ph * 14)), bx = e.x, by = e.y * K - 30 - Math.sin(e.ph * 2) * 8;
        ctx.globalAlpha = 0.15 * fade; ctx.fillStyle = '#1a3010'; ctx.beginPath(); ctx.ellipse(bx, e.y * K, 4, 1.6, 0, 0, 6.283); ctx.fill();
        ctx.globalAlpha = fade; ctx.fillStyle = e.c; ctx.strokeStyle = OUTC; ctx.lineWidth = 1.2;
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(bx + sd * 4 * wv, by, 4.5 * wv + 0.8, 5.5, sd * 0.4, 0, 6.283); ctx.fill(); ctx.stroke(); });
        ctx.fillStyle = OUTC; ctx.fillRect(bx - 0.8, by - 4, 1.6, 8); ctx.globalAlpha = 1;
      } else if (e.k === 'star') {
        var x2 = e.x + e.vx * e.t, y2 = e.y + e.vy * e.t, len = 0.16, a2 = Math.min(1, (e.life - e.t) * 2);
        var g1 = ctx.createLinearGradient(x2, y2, x2 - e.vx * len, y2 - e.vy * len);
        g1.addColorStop(0, 'rgba(255,255,255,' + a2 + ')'); g1.addColorStop(0.3, 'rgba(255,240,170,' + 0.6 * a2 + ')'); g1.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.strokeStyle = g1; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - e.vx * len, y2 - e.vy * len); ctx.stroke();
        var g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, 11); g2.addColorStop(0, 'rgba(255,255,255,' + a2 + ')'); g2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x2, y2, 11, 0, 6.283); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }
  var newMarks = {};
  // beim Besuch einer anderen Farm alles zurücksetzen, was zur eigenen Farm gehört
  F.visitReset = function () { agents = {}; ev.gold = null; if (ev.wolf) { ev.wolf = null; G.wolfActive = false; } ev.next = Date.now() + 30000; };
  F.markNew = function (t) { newMarks[t] = Date.now() + 15000; };
  function drawNewMarks() {
    var now = Date.now();
    Object.keys(newMarks).forEach(function (t) {
      if (newMarks[t] < now) { delete newMarks[t]; return; }
      var i = G.penOf(t); if (i < 0) return;
      var r = F.plotRect(i), x = r.x + r.w - 22, y = r.y * K - 30 - Math.abs(Math.sin(time * 4)) * 6, sc = 1 + Math.sin(time * 8) * 0.06;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(-0.08);
      A.star(ctx, 0, 0, 30, 21, 12); ctx.fillStyle = '#e0367f'; ctx.fill(); ctx.strokeStyle = OUTC; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '17px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = OUTC; ctx.lineWidth = 4; ctx.strokeText('NEU!', 0, 1); ctx.fillStyle = '#fff'; ctx.fillText('NEU!', 0, 1);
      ctx.restore();
    });
  }
  function drawIncomeLabels() {
    var gm = G.globalMult() * (G.wolfActive ? 0.5 : 1);
    var fs = Math.round(Math.min(28, Math.max(18, 13 / cam.z)));
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (var i = 0; i < G.plotCount(); i++) {
      var pen = G.S.pens[i]; if (!pen) continue;
      var r = F.plotRect(i), v = G.penIncome(i) * gm;
      var txt = '+' + G.fmt(v) + '/Sek.', x = r.x + r.w / 2, y = r.y * K - 34 + Math.sin(time * 2 + i) * 2;
      var tw = ctx.measureText(txt).width + fs * 1.2, h = fs * 1.5;
      A.rrect(ctx, x - tw / 2, y - h / 2 + 2.5, tw, h, h / 2); ctx.fillStyle = 'rgba(20,60,10,.55)'; ctx.fill();
      A.rrect(ctx, x - tw / 2, y - h / 2, tw, h, h / 2); ctx.fillStyle = 'rgba(20,40,10,.45)'; ctx.fill();
      ctx.strokeStyle = OUTC; ctx.lineWidth = fs * 0.3; ctx.strokeText(txt, x, y + 1);
      ctx.fillStyle = v > 0 ? '#6dff5a' : '#b7c2b0'; ctx.fillText(txt, x, y + 1);
    }
  }
  // Funkel-Effekt auf der Farm (z. B. wenn ein seltenes Schaf einzieht)
  var bursts = [];
  F.burst = function (t, col, at) {
    var i = at != null && at >= 0 && G.S.pens[at] && G.S.pens[at].t === t ? at : G.penOf(t); if (i < 0) return;
    F.focusPen(i); var r = F.plotRect(i), n = 40;
    for (var k = 0; k < n; k++) {
      var a = Math.random() * 6.283, sp = 60 + Math.random() * 160;
      bursts.push({ x: r.x + r.w / 2, y: (r.y + r.h / 2) * K - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 80, life: 1 + Math.random() * 0.6, c: k % 3 ? col : '#fff6a0', s: 2 + Math.random() * 3.5 });
    }
    bursts.push({ ring: 1, x: r.x + r.w / 2, y: (r.y + r.h / 2) * K, life: 0.8, c: col });
  };
  function drawBursts(dt) {
    if (!bursts.length) return;
    bursts = bursts.filter(function (b) { return (b.life -= dt) > 0; });
    bursts.forEach(function (b) {
      ctx.globalAlpha = Math.min(1, b.life);
      if (b.ring) {
        var rr = (0.8 - b.life) * 260;
        ctx.strokeStyle = b.c; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(b.x, b.y, rr, rr * K, 0, 0, 6.283); ctx.stroke();
      } else {
        b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 220 * dt;
        ctx.fillStyle = b.c; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.life * 6);
        ctx.fillRect(-b.s, -b.s / 3, b.s * 2, b.s * 0.66); ctx.fillRect(-b.s / 3, -b.s, b.s * 0.66, b.s * 2); ctx.restore();
      }
    });
    ctx.globalAlpha = 1;
  }
  function drawNight(dark, ox, oy, z) {
    var lights = [];
    function L(wx, wy, h, rad, col) { lights.push({ x: (wx * z + ox), y: ((wy * K - h) * z + oy), r: rad * z, c: col }); }
    L(HOUSE.x - 31, HOUSE.y, 34, 90, '255,210,120'); L(HOUSE.x + 31, HOUSE.y, 34, 90, '255,210,120');
    G.S.dekoPlaced.forEach(function (p) {
      var d = SI.DK[p.id]; if (!d.light) return;
      var h = { laterne: 30, lampe: 44, leucht: 66, scheune: 50, kristallbaum: 36, ufo: 30, drache: 30, regenbrunnen: 20, feuer: 10 }[p.id] || 20;
      var col = { kristallbaum: '200,170,255', ufo: '140,255,170', regenbrunnen: '180,220,255', drache: '255,150,80', feuer: '255,150,60' }[p.id] || '255,220,140';
      L(p.x, p.y, h, d.light, col);
    });
    for (var i = 0; i < G.plotCount(); i++) {
      var pen = G.S.pens[i]; if (!pen) continue;
      var r = F.plotRect(i);
      if (pen.lvl >= 3) { L(r.x + 15, r.y, 30, 70, '255,210,120'); L(r.x + r.w - 5, r.y, 30, 70, '255,210,120'); }
      var t = T[pen.t]; if (!t.pen.glow) continue;
      var rgb = hexRgb(t.pen.glow);
      L(r.x + r.w / 2, r.y + r.h / 2, 0, 120, rgb);
    }
    // nur Lichter, die man sieht
    lights = lights.filter(function (l) { return l.x > -l.r && l.x < W + l.r && l.y > -l.r && l.y < H + l.r; });
    lg.setTransform(dpr, 0, 0, dpr, 0, 0);
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, W, H);
    lg.fillStyle = 'rgba(12,16,52,' + (0.72 * dark) + ')'; lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-out';
    lights.forEach(function (l) {
      var gr = lg.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.beginPath(); lg.ellipse(l.x, l.y, l.r, l.r * 0.8, 0, 0, Math.PI * 2); lg.fill();
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lightCv, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach(function (l) {
      var gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
      gr.addColorStop(0, 'rgba(' + l.c + ',' + (0.28 * dark) + ')'); gr.addColorStop(1, 'rgba(' + l.c + ',0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
})(window.SI);
