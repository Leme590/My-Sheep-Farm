/* Schaf-Imperium: Tutorial für neue Spieler (Kai). Schritt für Schritt wird ein Knopf hervorgehoben
   und Schäfer Wolle erklärt ihn kurz. Die Texte werden wie alles andere über lang.js übersetzt. */
(function (SI) {
  'use strict';
  var U = SI.ui, A = SI.art, T = SI.T;
  var $ = function (s) { return document.querySelector(s); };
  var esc = U.esc;
  var STEPS = [
    { t: 'Willkommen, {name}!', d: 'Ich bin Schäfer Wolle und zeige dir kurz das Wichtigste. Das dauert nur eine Minute!' },
    { el: ['.money'], t: 'Dein Geld', d: 'Hier siehst du deine Münzen. Darunter steht in Grün, wie viel du pro Sekunde verdienst. Geld gibt es nur, solange das Spiel offen ist.' },
    { farm: 1, t: 'Deine Farm', d: 'Jede Schafsorte wohnt in einem Gehege. Tippe auf ein Gehege, um es auszubauen oder Schafe zu verkaufen. Wische, um dich umzusehen.' },
    { el: ['.nb[data-act="sheet:boxen"]'], t: 'Mystery-Boxen', d: 'Hier kaufst du Kisten mit neuen Schafen. Je seltener ein Schaf, desto mehr Geld macht es. Manchmal steckt auch eine Upgrade-Karte drin.' },
    { el: ['.nb[data-act="sheet:deko"]'], t: 'Deko', d: 'Im Deko-Shop gibt es jeden Tag neue Kisten. Jede Deko, die auf deiner Farm steht, bringt dir mehr Geld.' },
    { el: ['.nb[data-act="sheet:zucht"]'], t: 'Zucht', d: 'Wähle zwei Schafe aus und bekomme ein Baby. Manche Paare ergeben sogar ein geheimes Schaf!' },
    { el: ['.nb[data-act="sheet:buch"]'], t: 'Sammelbuch', d: 'Hier siehst du alle Schafe und Deko, die du schon gefunden hast, und was dir noch fehlt.' },
    { el: ['.nb[data-act="sheet:mehr"]'], t: 'Mehr', d: 'Tägliche Belohnung, Rebirth, Upgrade-Karten, Erfolge und Einstellungen. Mit einem Rebirth fängst du neu an und verdienst danach für immer mehr.' },
    { el: ['.questchip'], t: 'Aufgaben', d: 'Jeden Tag und jede Woche gibt es neue Aufgaben. Schaffst du sie, bekommst du Belohnungen.' },
    { el: ['.visitchip', '.clubchip'], t: 'Besuchen und Clubs', d: 'Schau dir die Farmen anderer Spieler an und gib ihnen ein Like. Im Club spielt ihr zusammen, und jeden Freitag gibt es das Schafrennen.' },
    { el: ['.duelchip'], t: 'Duelle', d: 'Fordere andere Spieler heraus: Schere Stein Papier, Tic Tac Toe oder Vier gewinnt. Wer gewinnt, bekommt den Einsatz.' },
    { el: ['.hchip.board', '.codechip'], t: 'Bestenliste und Codes', d: 'Beim Pokal siehst du die besten Spieler. Bei Code kannst du geschenkte Codes einlösen.' },
    { t: 'Achte auf Überraschungen!', d: 'Goldene Schafe schnell antippen, nachts Wölfe verjagen und beim Wanderhändler Angebote holen. Dienstags ist Taco Tuesday. Viel Spaß!' }
  ];
  var cur = -1, root = null, waiting = false;

  function rectOf(sels) {
    var r = null;
    sels.forEach(function (s) {
      var e = $(s); if (!e || e.offsetParent === null) return;
      var b = e.getBoundingClientRect(); if (!b.width) return;
      r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
    });
    return r;
  }
  function place() {
    if (!root || cur < 0) return;
    var st = STEPS[cur], spot = root.querySelector('.tspot'), bub = root.querySelector('.tbub'), W = innerWidth, H = innerHeight;
    var r = st.el ? rectOf(st.el) : null;
    if (st.farm) r = { l: W * 0.12, t: H * 0.3, r: W * 0.88, b: H * 0.62 };
    if (r) {
      var pad = 6;
      spot.style.cssText = 'left:' + (r.l - pad) + 'px;top:' + (r.t - pad) + 'px;width:' + (r.r - r.l + pad * 2) + 'px;height:' + (r.b - r.t + pad * 2) + 'px';
      spot.hidden = false; root.classList.remove('nospot');
    } else { spot.hidden = true; root.classList.add('nospot'); }
    var bw = Math.min(360, W - 24), bh = bub.offsetHeight || 200, x, y;
    if (!r) { x = (W - bw) / 2; y = Math.max(12, (H - bh) / 2); bub.className = 'tbub'; }
    else {
      var below = r.b + 16, above = r.t - 16 - bh;
      if (below + bh < H - 8 && (r.t + r.b) / 2 < H / 2) { y = below; bub.className = 'tbub up'; }
      else if (above > 8) { y = above; bub.className = 'tbub down'; }
      else { y = Math.max(8, (H - bh) / 2); bub.className = 'tbub'; }
      x = Math.max(12, Math.min(W - bw - 12, (r.l + r.r) / 2 - bw / 2));
      bub.style.setProperty('--ax', Math.max(18, Math.min(bw - 18, (r.l + r.r) / 2 - x)) + 'px');
    }
    bub.style.left = x + 'px'; bub.style.top = y + 'px'; bub.style.width = bw + 'px';
  }
  function show(i) {
    cur = i; var st = STEPS[i], me = U.me(), last = i === STEPS.length - 1;
    var title = st.t.indexOf('{name}') >= 0 ? null : st.t;
    root.querySelector('.tbub').innerHTML = '<div class="thead"><img src="' + A.sheepURL(T.wiese) + '" alt=""><div><small class="num">' + (i + 1) + ' / ' + STEPS.length + '</small><h3>' +
      (title ? esc(title) : 'Willkommen, ' + esc(me ? me.username : '') + '!') + '</h3></div></div><p>' + esc(st.d) + '</p>' +
      '<div class="tdots">' + STEPS.map(function (s, k) { return '<i class="' + (k === i ? 'on' : k < i ? 'done' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="btns">' + (last ? '' : '<button class="btn ghost" data-tut="skip">Überspringen</button>') + (i > 0 ? '<button class="btn blue" data-tut="back">Zurück</button>' : '') +
      '<button class="btn ' + (last ? 'coin' : 'go') + '" data-tut="next">' + (last ? 'Los geht\'s!' : 'Weiter') + '</button></div>';
    place(); requestAnimationFrame(place);
    if (U.SFX) U.SFX(i ? 'pageTurn' : 'reveal', 'c');
  }
  function end() {
    if (root) { root.remove(); root = null; }
    cur = -1; SI.G.S.tut = 1; U.saveLocal(); U.saveCloud && U.saveCloud();
    if (U.SFX) U.SFX('trumpet');
  }
  function start() {
    if (root) return;
    U.closeSheet && U.closeSheet();
    root = document.createElement('div'); root.id = 'tut';
    root.innerHTML = '<div class="tspot" hidden></div><div class="tbub"></div>';
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tut]'); if (!b) return;
      var a = b.getAttribute('data-tut');
      if (a === 'skip') end();
      else if (a === 'back') show(Math.max(0, cur - 1));
      else if (cur >= STEPS.length - 1) end(); else show(cur + 1);
    });
    document.body.appendChild(root); show(0);
  }
  // Wartet, bis keine anderen Fenster (z. B. tägliche Belohnung) mehr offen sind
  function queue() {
    if (waiting) return; waiting = true;
    var iv = setInterval(function () {
      if (U.modalOpen() || $('#overlay:not([hidden])')) return;
      clearInterval(iv); waiting = false; start();
    }, 400);
  }
  addEventListener('resize', function () { setTimeout(place, 80); });
  SI.tut = { start: start, queue: queue, steps: STEPS };
})(window.SI);
