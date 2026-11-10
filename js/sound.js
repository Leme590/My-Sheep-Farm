/* Schaf-Imperium: Sounds und Musik, alles live erzeugt (keine Sounddateien) */
(function (SI) {
  'use strict';
  var X = null, master = null, sfxBus = null, musBus = null, ambBus = null, musOut = null;
  var on = load('schaf_sound', true), music = load('schaf_music', true);
  var sfxVol = loadN('schaf_sfxvol', 0.8), musVol = loadN('schaf_musvol', 0.6);
  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } }
  function loadN(k, d) { try { var v = parseFloat(localStorage.getItem(k)); return isFinite(v) ? Math.max(0, Math.min(1, v)) : d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, typeof v === 'number' ? String(v) : (v ? '1' : '0')); } catch (e) { /* egal */ } }

  // Hall für die Musik: zufälliges, abklingendes Rauschen
  function makeReverb(sec) {
    var len = Math.floor(X.sampleRate * sec), b = X.createBuffer(2, len, X.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    var cv = X.createConvolver(); cv.buffer = b; return cv;
  }
  function init() {
    if (X) return true;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { X = new AC(); } catch (e) { return false; }
    var comp = X.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = X.createGain(); master.gain.value = 0.8; master.connect(comp); comp.connect(X.destination);
    sfxBus = X.createGain(); sfxBus.connect(master);
    ambBus = X.createGain(); ambBus.connect(master);
    // Musik: weicher Tiefpass + Hall
    musBus = X.createGain();
    var lp = X.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.3;
    var dry = X.createGain(), wet = X.createGain(), rv = makeReverb(3.2);
    dry.gain.value = 0.75; wet.gain.value = 0.45;
    musOut = X.createGain(); musOut.connect(master);
    musBus.connect(lp); lp.connect(dry); lp.connect(rv); rv.connect(wet); dry.connect(musOut); wet.connect(musOut);
    applyVol();
    return true;
  }
  function applyVol() {
    if (!X) return;
    sfxBus.gain.value = on ? sfxVol * 1.25 : 0; ambBus.gain.value = on ? sfxVol * 0.7 : 0;
    musOut.gain.value = music ? musVol * 0.9 : 0;
  }
  function ready() { return X && X.state === 'running'; }

  /* ---------- Bausteine ---------- */
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  // Ton: f Frequenz, d Dauer, o.type, o.vol, o.to (Gleiten), o.at (Startversatz), o.bus
  function tone(f, d, o) {
    o = o || {}; var t = X.currentTime + (o.at || 0);
    var os = X.createOscillator(), g = X.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d);
    env(g, t, o.a || 0.008, o.vol || 0.2, d);
    os.connect(g); g.connect(o.bus || sfxBus); os.start(t); os.stop(t + d + 0.05);
    return os;
  }
  var noiseBuf = null;
  function noise(d, o) {
    o = o || {}; var t = X.currentTime + (o.at || 0);
    if (!noiseBuf) {
      noiseBuf = X.createBuffer(1, X.sampleRate, X.sampleRate);
      var ch = noiseBuf.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    var s = X.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = X.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1500, t); f.Q.value = o.q || 1;
    if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + d);
    var g = X.createGain(); env(g, t, o.a || 0.005, o.vol || 0.2, d);
    s.connect(f); f.connect(g); g.connect(o.bus || sfxBus); s.start(t); s.stop(t + d + 0.05);
  }
  function notes(list, step, o) { list.forEach(function (f, i) { if (f) tone(f, (o && o.d) || step * 1.6, Object.assign({}, o, { at: ((o && o.at) || 0) + i * step })); }); }
  var N = function (n) { return 440 * Math.pow(2, (n - 69) / 12); }; // MIDI-Note

  // Schafs-Mäh: Sägezahn mit Vibrato durch zwei "Mund"-Filter
  // Schafs-Mäh, möglichst echt: Stimme mit "Meckern" (schnelles Zittern), Mund geht von "m" zu "äh" auf, etwas Atem
  function baa(pitch, vol, bus) {
    var t = X.currentTime, d = 0.75 + Math.random() * 0.45, out = bus || sfxBus;
    var p = pitch || 230 + Math.random() * 130; vol = vol || 0.5;
    var g = X.createGain(); g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 0.35, t + 0.05); g.gain.linearRampToValueAtTime(vol, t + 0.16);
    g.gain.setValueAtTime(vol, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    // Meckern: Lautstärke zittert 18-26 mal pro Sekunde
    var trem = X.createGain(); trem.gain.value = 0.6;
    var tl = X.createOscillator(), tg = X.createGain(); tl.frequency.value = 18 + Math.random() * 8; tg.gain.value = 0.4; tl.connect(tg); tg.connect(trem.gain);
    var src = X.createGain(); src.gain.value = 1;
    [0, 7].forEach(function (det, k) {
      var o = X.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      o.frequency.setValueAtTime(p * 0.82, t); o.frequency.linearRampToValueAtTime(p * 1.04, t + 0.14); o.frequency.linearRampToValueAtTime(p * 0.97, t + d * 0.6); o.frequency.linearRampToValueAtTime(p * 0.84, t + d);
      var pg = X.createGain(); pg.gain.value = k ? 0.5 : 1; o.connect(pg); pg.connect(src); o.start(t); o.stop(t + d + 0.05);
    });
    // Atem
    if (!noiseBuf) noise(0.001, { vol: 0.0001 });
    var nb = X.createBufferSource(); nb.buffer = noiseBuf; nb.loop = true; var nf = X.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2500; nf.Q.value = 0.8;
    var ng = X.createGain(); ng.gain.value = 0.18; nb.connect(nf); nf.connect(ng); ng.connect(src); nb.start(t); nb.stop(t + d + 0.05);
    src.connect(trem);
    // Mund-Formanten: öffnen sich am Anfang ("mmäääh")
    var F = [[350, 720, 6, 1], [1100, 1750, 8, 0.7], [2500, 2600, 9, 0.35]];
    F.forEach(function (f) {
      var bp = X.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = f[2];
      bp.frequency.setValueAtTime(f[0], t); bp.frequency.linearRampToValueAtTime(f[1], t + 0.18); bp.frequency.linearRampToValueAtTime(f[1] * 0.92, t + d);
      var fg = X.createGain(); fg.gain.value = f[3] * 2.2; trem.connect(bp); bp.connect(fg); fg.connect(g);
    });
    var lp = X.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    g.connect(lp); lp.connect(out);
    tl.start(t); tl.stop(t + d + 0.05);
  }
  // Holz knarzt: viele winzige Klicks hintereinander durch einen Resonanzfilter
  function creak(at, d, r0, r1, res, vol, bus) {
    var t = X.currentTime + at, o = X.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(r0, t); o.frequency.linearRampToValueAtTime(r1, t + d * 0.6); o.frequency.linearRampToValueAtTime(r0 * 1.2, t + d);
    var bp = X.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = res; bp.Q.value = 9;
    var bp2 = X.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = res * 2.3; bp2.Q.value = 12;
    var g = X.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.04); g.gain.setValueAtTime(vol, t + d * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(bp); o.connect(bp2); bp.connect(g); bp2.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + d + 0.05);
  }
  // Klopfen auf Holz
  function knock(at, f, vol) {
    tone(f, 0.09, { at: at, type: 'sine', vol: vol, to: f * 0.6, a: 0.002 });
    noise(0.04, { at: at, ft: 'bandpass', f: f * 4, q: 2.5, vol: vol * 0.6, a: 0.001 });
  }
  // Metall klingt (Münzen, Glöckchen): nicht-harmonische Obertöne
  function clink(at, f, vol, d) {
    [1, 2.76, 5.4, 8.93].forEach(function (m, i) { tone(f * m, (d || 0.35) / (1 + i * 0.7), { at: at, type: 'sine', vol: vol / (1 + i * 0.8), a: 0.001 }); });
  }
  // Papier / Stoff raschelt
  function swish(at, d, f0, f1, vol) { noise(d, { at: at, ft: 'bandpass', f: f0, fto: f1, q: 0.9, vol: vol, a: d * 0.35 }); }


  /* ---------- Soundeffekte ---------- */
  var FX = {
    click: function () { knock(0, 260 + Math.random() * 80, 0.18); },
    tab: function () { knock(0, 200 + Math.random() * 40, 0.2); swish(0.01, 0.12, 2500, 4000, 0.05); },
    close: function () { swish(0, 0.18, 3000, 1200, 0.08); knock(0.12, 170, 0.12); },
    cant: function () { knock(0, 120, 0.25); knock(0.12, 105, 0.2); },
    coin: function () { var f = 1900 + Math.random() * 500; clink(0, f, 0.09, 0.3); clink(0.07 + Math.random() * 0.03, f * 1.12, 0.07, 0.4); },
    buy: function () { for (var i = 0; i < 4; i++) clink(i * 0.05 + Math.random() * 0.03, 1700 + Math.random() * 900, 0.06, 0.3); swish(0, 0.1, 5000, 7000, 0.03); },
    // Kiste wackelt (0,9 Sek.)
    shake: function (r) {
      var d = ({ c: 0.9, r: 1, e: 1.25, l: 1.55, m: 1.85, s: 1.85 }[r] || 0.9), n = Math.round(d / 0.19);
      for (var i = 0; i < n; i++) { var a = i * d / n; noise(0.08, { at: a, f: 300 + i * 50, q: 2, vol: 0.22 + i * 0.01 }); tone(110 + i * 10, 0.08, { at: a, type: 'triangle', vol: 0.18 }); }
      tone(260, d, { type: 'sine', vol: 0.05, to: 1400 });
    },
    // Auspacken je nach Seltenheit
    reveal: function (r) {
      noise(0.35, { f: 1200, fto: 6000, q: 0.6, vol: 0.18 });
      var tri = { type: 'triangle', vol: 0.18 };
      if (r === 'c') notes([N(72), N(79)], 0.09, tri);
      else if (r === 'r') notes([N(72), N(76), N(79), N(84)], 0.08, tri);
      else if (r === 'e') { notes([N(69), N(72), N(76), N(81), N(84)], 0.075, { type: 'square', vol: 0.09 }); sparkle(0.3, 10); }
      else if (r === 'l') { fanfare(N(72)); sparkle(0.35, 16); boom(); }
      else { fanfare(N(74)); notes([N(86), N(90), N(93), N(98)], 0.09, { type: 'triangle', vol: 0.12, at: 0.55 }); sparkle(0.3, 26); boom(); }
    },
    card: function () { notes([N(76), N(83), N(88)], 0.08, { type: 'triangle', vol: 0.16 }); sparkle(0.2, 6); },
    lvl: function () { tone(N(60), 0.35, { type: 'square', vol: 0.06, to: N(84) }); notes([N(72), N(76), N(79), N(84)], 0.06, { type: 'triangle', vol: 0.14, at: 0.2 }); },
    breed: function () { notes([N(76), N(81)], 0.12, { type: 'sine', vol: 0.2 }); tone(N(88), 0.3, { type: 'sine', vol: 0.1, at: 0.25 }); },
    baby: function () { baa(620, 0.4); },
    goldSpawn: function () { sparkle(0, 14); notes([N(84), N(88), N(91)], 0.06, { type: 'sine', vol: 0.12 }); },
    gold: function () { FX.coin(); notes([N(91), N(96), N(100)], 0.05, { type: 'square', vol: 0.06, at: 0.15 }); sparkle(0.1, 10); },
    wolf: function () {
      var o = tone(300, 1.6, { type: 'sine', vol: 0.18, a: 0.25, to: 520 }), t = X.currentTime;
      o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(560, t + 0.5); o.frequency.linearRampToValueAtTime(420, t + 1.6);
      tone(150, 1.2, { type: 'triangle', vol: 0.05, a: 0.3, to: 260 });
    },
    hit: function () { tone(160, 0.12, { type: 'square', vol: 0.12, to: 60 }); noise(0.06, { f: 900, vol: 0.2 }); },
    win: function () { notes([N(67), N(72), N(76), N(79)], 0.08, { type: 'square', vol: 0.08 }); },
    merchant: function () { [0, 0.18].forEach(function (a) { tone(N(81), 0.5, { at: a, type: 'sine', vol: 0.14 }); tone(N(88), 0.5, { at: a, type: 'sine', vol: 0.06 }); }); },
    daily: function () { notes([N(72), N(76), N(79), N(84), N(88)], 0.09, { type: 'triangle', vol: 0.14 }); },
    rebirth: function () {
      noise(1.4, { ft: 'lowpass', f: 200, fto: 8000, q: 1, vol: 0.22, a: 0.6 });
      [N(60), N(64), N(67), N(72)].forEach(function (f) { tone(f, 1.6, { type: 'triangle', vol: 0.08, at: 1.1, a: 0.05 }); });
      sparkle(1.1, 24); boom(1.1);
    },
    place: function () { knock(0, 140, 0.3); noise(0.15, { ft: 'lowpass', f: 500, vol: 0.15 }); },
    pickup: function () { swish(0, 0.18, 1200, 3500, 0.1); },
    // Buch: Seiten blättern
    page: function () { swish(0, 0.16, 1500, 4500, 0.14); swish(0.12, 0.2, 4000, 1800, 0.11); noise(0.03, { at: 0.3, ft: 'bandpass', f: 1200, q: 1.5, vol: 0.1 }); },
    pageTurn: function () { swish(0, 0.13, 2000, 5000, 0.12); swish(0.09, 0.14, 4500, 2000, 0.08); },
    // Kisten-Menü: Truhe knarzt
    chest: function () { creak(0, 0.42, 22, 48, 900, 0.12); knock(0.42, 110, 0.3); noise(0.12, { at: 0.42, ft: 'lowpass', f: 600, vol: 0.12 }); },
    // Deko-Menü: Windspiel
    chime: function () { [0, 1, 2, 3].forEach(function (i) { clink(i * 0.11 + Math.random() * 0.05, [1320, 1570, 1760, 2090][i], 0.05, 1.4); }); },
    // Zucht-Menü: Herzklopfen
    heart: function () { [0, 0.18, 0.75, 0.93].forEach(function (a, i) { tone(i % 2 ? 55 : 68, 0.14, { type: 'sine', vol: 0.45, to: 38, at: a, a: 0.004 }); }); },
    // Mehr-Menü: Plopp
    pop: function () { swish(0, 0.22, 900, 3000, 0.12); knock(0.16, 230, 0.12); },
    // Bestenliste: kleine Fanfare
    trumpet: function () { clink(0, 1046, 0.06, 1.2); clink(0.12, 1318, 0.05, 1.2); clink(0.24, 1568, 0.05, 1.4); },
    settings: function () { [0, 0.07, 0.13].forEach(function (a) { knock(a, 900 + Math.random() * 200, 0.05); }); },
    // Gehege: Tor quietscht
    gate: function () { creak(0, 0.5, 30, 70, 1400, 0.08); knock(0.48, 150, 0.25); clink(0.5, 900, 0.03, 0.2); },
    // Ausbauen: Hämmern
    hammer: function () { [0, 0.14, 0.28].forEach(function (a) { tone(180, 0.07, { at: a, type: 'square', vol: 0.08, to: 90 }); noise(0.05, { at: a, f: 2400, q: 2, vol: 0.15 }); }); },
    demolish: function () { noise(0.7, { ft: 'lowpass', f: 1200, fto: 150, q: 0.7, vol: 0.3 }); for (var i = 0; i < 6; i++) noise(0.05, { at: 0.05 + i * 0.08 + Math.random() * 0.05, f: 800 + Math.random() * 1500, q: 3, vol: 0.12 }); boom(); },
    sell: function () { noise(0.08, { f: 6000, q: 1, vol: 0.06 }); notes([N(84), N(91), N(96)], 0.06, { type: 'square', vol: 0.05 }); },
    pick: function () { baa(480 + Math.random() * 200, 0.22); },
    unpick: function () { swish(0, 0.12, 3000, 1500, 0.06); },
    ach: function () { notes([N(79), N(84), N(88), N(91)], 0.07, { type: 'triangle', vol: 0.14 }); sparkle(0.25, 8); },
    star: function () { tone(3200, 0.6, { type: 'sine', vol: 0.05, to: 1400 }); sparkle(0.05, 6); },
    rainbow: function () { [72, 76, 79, 84, 88, 91].forEach(function (n, i) { tone(N(n), 1.2, { type: 'sine', vol: 0.035, at: i * 0.11 }); }); },
    flock: function () { for (var k = 0; k < 4; k++) { var b = 2600 + Math.random() * 1500; tone(b, 0.07, { at: k * 0.1, type: 'sine', vol: 0.04, to: b * 1.3, bus: ambBus }); } },
    newItem: function () { [72, 76, 79, 84, 88].forEach(function (n, i) { clink(i * 0.08, N(n), 0.06, 0.9); }); sparkle(0.35, 12); },
    toast: function () { clink(0, 2400, 0.03, 0.25); }
  };
  function fanfare(root) {
    var s = { type: 'square', vol: 0.08 };
    notes([root, root, root, root * 1.335], 0.11, s);
    [1, 1.26, 1.5, 2].forEach(function (m) { tone(root * m, 0.9, { type: 'sawtooth', vol: 0.035, at: 0.44, a: 0.02 }); });
  }
  function sparkle(at, n) { for (var i = 0; i < n; i++) tone(2000 + Math.random() * 3000, 0.12, { type: 'sine', vol: 0.05, at: at + i * 0.04 + Math.random() * 0.03 }); }
  function boom(at) { tone(120, 0.6, { type: 'sine', vol: 0.35, to: 40, at: at || 0 }); }

  /* ---------- Umgebung: Vögel, Grillen, Mähen ---------- */
  var nextBird = 0, nextBaa = 0, nextCricket = 0;
  function bird() {
    var b = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) tone(b, 0.09, { at: i * 0.12, type: 'sine', vol: 0.05, to: b * (1.25 + Math.random() * 0.3), bus: ambBus });
  }
  function cricket() {
    for (var i = 0; i < 6; i++) tone(4300, 0.025, { at: i * 0.045, type: 'square', vol: 0.012, bus: ambBus });
  }
  function ambient(night, sheepN) {
    if (!ready() || !on) return;
    var t = X.currentTime;
    if (!night && t > nextBird) { bird(); nextBird = t + 4 + Math.random() * 9; }
    if (night && t > nextCricket) { cricket(); if (Math.random() < 0.6) setTimeout(function () { if (ready()) cricket(); }, 320); nextCricket = t + 1.5 + Math.random() * 2.5; }
    if (sheepN > 0 && t > nextBaa) {
      baa(night ? 280 + Math.random() * 60 : null, night ? 0.12 : 0.22, ambBus);
      nextBaa = t + Math.max(5, 26 - sheepN * 0.6) * (0.6 + Math.random() * 0.8) * (night ? 2 : 1);
    }
  }

  /* ---------- Musik: drei ruhige Stücke, zufällig nacheinander ----------
     1 "Wiesenmorgen": weiche Flächen, Spieluhr-Melodie (4/4)
     2 "Lagerfeuer": gezupfte Gitarren-Arpeggios, Flöte (4/4)
     3 "Sonntagswalzer": sanftes Klavier im Dreivierteltakt */
  var beat = 0, nextBeat = 0, musNight = false, motif = null, motifFor = -1, track = Math.floor(Math.random() * 3), barsLeft = 0, rest = 0;
  var MAJ = [0, 2, 4, 7, 9, 12, 14, 16], MIN = [0, 3, 5, 7, 10, 12, 15, 17];
  function pad(f, at, d, vol, type) {
    var t = X.currentTime + at;
    [-4, 4].forEach(function (det) {
      var o = X.createOscillator(), g = X.createGain(); o.type = type || 'triangle'; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + d * 0.35); g.gain.linearRampToValueAtTime(vol * 0.7, t + d * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + d * 1.15);
      o.connect(g); g.connect(musBus); o.start(t); o.stop(t + d * 1.2);
    });
  }
  function bell(f, at, vol) { tone(f, 1.6, { at: at, type: 'sine', vol: vol, a: 0.005, bus: musBus }); tone(f * 2, 0.5, { at: at, type: 'sine', vol: vol * 0.25, a: 0.003, bus: musBus }); }
  function pluck(f, at, vol) { // Gitarre: heller Anschlag, schnell weicher
    var t = X.currentTime + at, o = X.createOscillator(), lp = X.createBiquadFilter(), g = X.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(lp); lp.connect(g); g.connect(musBus); o.start(t); o.stop(t + 1.5);
  }
  function flute(f, at, d, vol) {
    var t = X.currentTime + at, o = X.createOscillator(), g = X.createGain(), v = X.createOscillator(), vg = X.createGain();
    o.type = 'sine'; o.frequency.value = f; v.frequency.value = 5; vg.gain.value = f * 0.008; v.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.12); g.gain.setValueAtTime(vol, t + d * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(musBus); o.start(t); v.start(t); o.stop(t + d + 0.05); v.stop(t + d + 0.05);
    noise(d * 0.6, { at: at, f: f * 2, q: 4, vol: vol * 0.08, a: 0.1, bus: musBus });
  }
  function piano(f, at, vol, d) {
    [1, 2, 3].forEach(function (m, i) { tone(f * m, (d || 2) / (1 + i), { at: at, type: i ? 'sine' : 'triangle', vol: vol / (1 + i * 2.2), a: 0.004, bus: musBus }); });
  }
  function newMotif(n) { var m = []; for (var i = 0; i < n; i++) m.push(Math.random() < 0.45 ? Math.floor(Math.random() * 8) : null); return m; }
  var TRACKS = [
    { name: 'Wiesenmorgen', spb: 0.82, per: 4, day: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], night: [[45, 52, 55, 60], [41, 48, 52, 57], [48, 52, 55, 59], [43, 50, 55, 59]],
      play: function (at, st, bar, spb, ch, mo, nt) {
        if (st === 0) { ch.forEach(function (n) { pad(N(n), at, spb * 4, nt ? 0.022 : 0.026); }); tone(N(ch[0] - 12), spb * 2.6, { at: at, type: 'sine', vol: 0.13, a: 0.06, bus: musBus }); }
        if (st === 2) tone(N(ch[0] - 5), spb * 1.6, { at: at, type: 'sine', vol: 0.07, a: 0.05, bus: musBus });
        if (bar % 8 < 6 || nt) [0, 1].forEach(function (h) { var d = mo[bar % 2][st * 2 + h]; if (d != null) bell(N(nt ? 69 + MIN[d] : 72 + MAJ[d]), at + h * spb / 2, nt ? 0.035 : 0.045); });
        if (!nt && (st === 1 || st === 3)) noise(0.06, { at: at + spb / 2, f: 7000, q: 1.5, vol: 0.012, bus: musBus });
      } },
    { name: 'Lagerfeuer', spb: 0.75, per: 4, day: [[55, 59, 62, 67], [54, 57, 62, 66], [52, 55, 59, 64], [48, 52, 55, 60]], night: [[52, 55, 59, 64], [48, 52, 55, 60], [55, 59, 62, 67], [50, 54, 57, 62]],
      play: function (at, st, bar, spb, ch, mo, nt) {
        var arp = [0, 2, 1, 3, 2, 1, 3, 2];
        [0, 1].forEach(function (h) { var k = st * 2 + h; pluck(N(ch[arp[k]]), at + h * spb / 2, nt ? 0.05 : 0.065); });
        if (st === 0) pluck(N(ch[0] - 12), at, 0.09);
        if (st === 2) pluck(N(ch[0] - 5), at, 0.06);
        if (bar % 4 >= 2) { var d = mo[0][st * 2]; if (d != null && st % 2 === 0) flute(N((nt ? 76 : 79) + (nt ? MIN : MAJ)[d] - 7), at, spb * 1.8, nt ? 0.04 : 0.05); }
      } },
    { name: 'Sonntagswalzer', spb: 0.62, per: 3, day: [[50, 54, 57], [47, 50, 54], [43, 47, 50], [45, 49, 52]], night: [[47, 50, 54], [43, 47, 50], [50, 54, 57], [45, 49, 52]],
      play: function (at, st, bar, spb, ch, mo, nt) {
        if (st === 0) piano(N(ch[0] - 12), at, 0.09, 2.2);
        else ch.forEach(function (n) { piano(N(n), at, nt ? 0.022 : 0.028, 0.9); });
        var d = mo[bar % 2][st * 2]; if (d != null && bar % 8 < 7) piano(N((nt ? 69 : 74) + (nt ? MIN : MAJ)[d]), at, nt ? 0.05 : 0.06, 2.4);
      } },
    // 4 "Fiesta de las Ovejas": nur am Taco Tuesday. Gitarre mit Schlagmuster, Marimba in Terzen, leiser Shaker (6/8)
    { name: 'Fiesta de las Ovejas', ev: 'taco', spb: 0.3, per: 6, day: [[48, 52, 55, 60], [53, 57, 60, 65], [55, 59, 62, 65], [48, 52, 55, 60]], night: [[45, 48, 52, 57], [50, 53, 57, 62], [52, 56, 59, 62], [45, 48, 52, 57]],
      play: function (at, st, bar, spb, ch, mo, nt) {
        var v = nt ? 0.7 : 1;
        if (st === 0) pluck(N(ch[0] - 12), at, 0.1 * v);
        if (st === 3) pluck(N((bar % 2 ? ch[2] : ch[1]) - 12), at, 0.08 * v);
        if (st === 1 || st === 2 || st === 4 || st === 5) ch.slice(1).forEach(function (n, i) { pluck(N(n), at + i * 0.012, (st === 4 ? 0.035 : 0.025) * v); });
        if (!nt) noise(0.05, { at: at, f: 8000, q: 1.2, vol: st % 3 === 0 ? 0.016 : 0.009, bus: musBus });
        var d = mo[bar % 2][st]; if (d != null && st % 2 === 0 && bar % 8 < 7) {
          var DIA = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], top = (nt ? 69 : 72) + DIA[d + 2], low = (nt ? 69 : 72) + DIA[d];
          [top, low].forEach(function (m, i) { tone(N(m), 0.4, { at: at, type: 'sine', vol: (i ? 0.03 : 0.045) * v, a: 0.003, bus: musBus }); tone(N(m) * 4, 0.08, { at: at, type: 'sine', vol: 0.008 * v, a: 0.002, bus: musBus }); });
        }
      } }
  ];
  // Taco Tuesday? (SI.G gibt es erst nach dem Laden des Spiels)
  function tacoDay() { return SI.G && SI.G.isTaco ? SI.G.isTaco() : new Date().getDay() === 2; }
  function pickTrack(avoid) {
    if (tacoDay() && avoid !== 3 && Math.random() < 0.6) return 3; // am Dienstag meistens die Fiesta
    var nt; do { nt = Math.floor(Math.random() * 3); } while (nt === avoid);
    return nt;
  }
  track = pickTrack(-1);
  function schedMusic() {
    if (!ready() || !music) return;
    var tr = TRACKS[track], spb = tr.spb * (musNight ? 1.2 : 1);
    if (nextBeat < X.currentTime) nextBeat = X.currentTime + 0.1;
    while (nextBeat < X.currentTime + 1.2) {
      var at = nextBeat - X.currentTime;
      if (rest > 0) { rest--; nextBeat += spb; continue; } // kurze Pause zwischen zwei Stücken
      if (barsLeft <= 0 && beat % tr.per === 0) { barsLeft = 40 + Math.floor(Math.random() * 24); }
      var bar = Math.floor(beat / tr.per), st = beat % tr.per, ch = (musNight ? tr.night : tr.day)[bar % 4];
      var section = Math.floor(bar / 8);
      if (section !== motifFor) { motifFor = section; motif = [newMotif(8), newMotif(8)]; }
      tr.play(at, st, bar, spb, ch, motif, musNight);
      beat++; nextBeat += spb;
      if (st === tr.per - 1 && --barsLeft <= 0) { // nächstes Stück, zufällig, aber ein anderes
        track = pickTrack(track); beat = 0; motifFor = -1; rest = 4; break;
      }
    }
  }
  setInterval(schedMusic, 300);

  /* ---------- Öffentlich ---------- */
  SI.sfx = {
    unlock: function () { if (!init()) return; if (X.state !== 'running') X.resume(); },
    play: function (name, arg) { if (!on || !ready() || !FX[name]) return; try { FX[name](arg); } catch (e) { /* Ton egal */ } },
    ambient: function (night, sheepN) { if (musNight !== night) { musNight = night; } try { ambient(night, sheepN); } catch (e) { /* egal */ } },
    on: function () { return on; }, musicOn: function () { return music; },
    sfxVol: function () { return sfxVol; }, musVol: function () { return musVol; },
    setOn: function (v) { on = v; store('schaf_sound', v); applyVol(); },
    setMusic: function (v) { music = v; store('schaf_music', v); applyVol(); },
    setSfxVol: function (v) { sfxVol = v; store('schaf_sfxvol', v); applyVol(); },
    selfTest: function () { if (!init()) return ['no audio']; var bad = []; Object.keys(FX).forEach(function (k) { try { FX[k]('l'); } catch (e) { bad.push(k + ': ' + e.message); } }); try { baa(); TRACKS.forEach(function (tr) { for (var b = 0; b < 8; b++) tr.play(0.1, b % tr.per, b, tr.spb, tr.day[0], [newMotif(8), newMotif(8)], b > 3); }); } catch (e) { bad.push('music: ' + e.message); } return bad; },
    trackName: function () { return TRACKS[track].name; }, nextTrack: function () { barsLeft = 1; },
    setMusVol: function (v) { musVol = v; store('schaf_musvol', v); applyVol(); }
  };
  // Browser erlauben Ton erst nach dem ersten Tippen
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) { window.addEventListener(e, function () { SI.sfx.unlock(); }, { passive: true }); });
})(window.SI);
