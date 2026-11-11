/* Schaf-Imperium: Spieldaten (Schafe, Gehege, Boxen, Deko, Erfolge) */
window.SI = window.SI || {};
(function (SI) {
  'use strict';

  SI.RAR = {
    c: { n: 'Gewöhnlich', col: '#8a9a80' },
    r: { n: 'Selten', col: '#2f86d6' },
    e: { n: 'Episch', col: '#9445d8' },
    l: { n: 'Legendär', col: '#e58a00' },
    m: { n: 'Mythisch', col: '#e0367f' },
    s: { n: 'Geheim', col: '#0f9f8f' }
  };
  SI.RORDER = ['c', 'r', 'e', 'l', 'm', 's'];

  // pen: g = Boden, s = Muster-Farbe, sk = Muster-Art, props = Dinge im Gehege
  SI.TYPES = [
    { id: 'wiese', n: 'Wiesenschaf', r: 'c', inc: 1, w: '#f4f0e6', f: '#3b3330',
      pen: { name: 'Blumenwiese', g: '#8fcf62', s: '#a9dd80', sk: 'dot', props: ['flower:#ffffff', 'flower:#ffe066', 'bush'] } },
    { id: 'schwarz', n: 'Schwarzschaf', r: 'c', inc: 2, w: '#3b3937', f: '#161413',
      pen: { name: 'Felsweide', g: '#62904a', s: '#527c3c', sk: 'dot', props: ['rock:#7d7f86', 'bush', 'rock:#6b6d73'] } },
    { id: 'braun', n: 'Kakaoschaf', r: 'c', inc: 4, w: '#a87a55', f: '#4a3020',
      pen: { name: 'Matschkuhle', g: '#b78a55', s: '#9c7244', sk: 'dot', props: ['puddle:#7a5230', 'hay', 'puddle:#86603c'] } },
    { id: 'locke', n: 'Lockenschaf', r: 'c', inc: 7, w: '#efdcb2', f: '#5a4636',
      pen: { name: 'Strohhof', g: '#e3cf8f', s: '#d4bd73', sk: 'stripe', props: ['hay', 'hay', 'flower:#f28fb0'] } },
    { id: 'rosa', n: 'Zuckerwatteschaf', r: 'r', inc: 25, w: '#f6b3c9', f: '#6b3a4a',
      pen: { name: 'Süßigkeitenland', g: '#ffd3e4', s: '#ffb3cf', sk: 'dot', props: ['lolli:#ff6fae', 'lolli:#5ab8ff', 'lolli:#ffd23f'] } },
    { id: 'himmel', n: 'Himmelschaf', r: 'r', inc: 45, w: '#9fd2f3', f: '#2e4a63',
      pen: { name: 'Himmelsgarten', g: '#bfe2fb', s: '#ffffff', sk: 'dot', props: ['cloud:#ffffff', 'flower:#5ab8ff', 'cloud:#ffffff'] } },
    { id: 'minz', n: 'Minzschaf', r: 'r', inc: 80, w: '#a6e3bf', f: '#2f5a44',
      pen: { name: 'Minzbeet', g: '#b5ebcb', s: '#8fdcb0', sk: 'dot', props: ['leaf', 'leaf', 'bush'] } },
    { id: 'wolke', n: 'Wolkenschaf', r: 'r', inc: 140, w: '#ffffff', f: '#7a8aa0',
      pen: { name: 'Wolkenweide', g: '#e6eeff', s: '#ffffff', sk: 'dot', props: ['cloud:#ffffff', 'cloud:#f3f6ff', 'cloud:#ffffff'] } },
    { id: 'feuer', n: 'Feuerschaf', r: 'e', inc: 1000, w: ['#ffd23f', '#ff6a2b', '#d6281b'], f: '#4a1608',
      pen: { name: 'Lavafeld', g: '#4a2418', s: '#ff6a2b', sk: 'lava', props: ['rock:#3a2a26', 'fire', 'rock:#5a3a30'], glow: '#ff6a2b' } },
    { id: 'eis', n: 'Eisschaf', r: 'e', inc: 1800, w: ['#ffffff', '#b9ecff', '#6cc6f0'], f: '#24506b',
      pen: { name: 'Schneefeld', g: '#e4f6ff', s: '#ffffff', sk: 'dot', props: ['pine', 'ice', 'pine'] } },
    { id: 'moos', n: 'Moosschaf', r: 'e', inc: 3200, w: ['#8fd16a', '#4e9a4a'], f: '#233d22',
      pen: { name: 'Zauberwald', g: '#3f7a3a', s: '#5a9a48', sk: 'dot', props: ['mushroom', 'tree', 'mushroom'] } },
    { id: 'blitz', n: 'Blitzschaf', r: 'e', inc: 5500, w: '#ffe24a', f: '#3a3000', bolt: 1,
      pen: { name: 'Gewitterhügel', g: '#f3e3a0', s: '#ffd23f', sk: 'stripe', props: ['rock:#8a8f99', 'crystal:#ffe24a', 'rock:#9aa0aa'] } },
    { id: 'gold', n: 'Goldschaf', r: 'l', inc: 15000, w: ['#fff1a8', '#f5c542', '#c98a12'], f: '#5a3a00',
      pen: { name: 'Schatzkammer', g: '#f0d27a', s: '#ffe9a0', sk: 'dot', props: ['coin', 'crystal:#f5c542', 'coin'] } },
    { id: 'kristall', n: 'Kristallschaf', r: 'l', inc: 40000, w: ['#efe6ff', '#c4adff', '#8f6cf0'], f: '#3b2a6b',
      pen: { name: 'Kristallhöhle', g: '#e3d8ff', s: '#c4adff', sk: 'dot', props: ['crystal:#a98bff', 'crystal:#d7c8ff', 'crystal:#8f6cf0'], glow: '#b39bff' } },
    { id: 'nacht', n: 'Nachtschaf', r: 'l', inc: 100000, w: ['#4a55a0', '#1e2350'], f: '#0c0e24', stars: 1,
      pen: { name: 'Mondwiese', g: '#262b55', s: '#ffffff', sk: 'star', props: ['rock:#3a4070', 'crystal:#9aa6ff', 'rock:#454b80'], glow: '#9aa6ff' } },
    { id: 'regen', n: 'Regenbogenschaf', r: 'm', inc: 3000000, w: ['#ff5f6d', '#ffc371', '#fff36b', '#6bf08a', '#5ab8ff', '#b36bff'], f: '#2a2a2a',
      pen: { name: 'Regenbogental', g: 'rainbow', s: '#ffffff', sk: 'dot', props: ['cloud:#ffffff', 'flower:#ff5f6d', 'cloud:#ffffff'] } },
    { id: 'galaxie', n: 'Galaxieschaf', r: 'm', inc: 12000000, w: ['#ff7ae0', '#7a3cff', '#1b1550'], f: '#0a0820', stars: 1,
      pen: { name: 'Sternenstaub', g: '#1b1550', s: '#ffffff', sk: 'star', props: ['planet', 'crystal:#ff7ae0', 'planet'], glow: '#ff7ae0' } },
    { id: 'drache', n: 'Drachenschaf', r: 'm', inc: 50000000, w: ['#b8f57f', '#2fa85a', '#14603a'], f: '#0f2a18', horns: 1,
      pen: { name: 'Drachennest', g: '#4b5236', s: '#6b7348', sk: 'dot', props: ['rock:#5a5f48', 'fire', 'rock:#4a4f3a'], glow: '#ff8a2b' } },
    { id: 'zebra', n: 'Zebraschaf', r: 's', inc: 9000, w: ['#ffffff', '#222222', '#ffffff', '#222222', '#ffffff', '#222222', '#ffffff'], hard: 1, f: '#161413',
      pen: { name: 'Savanne', g: '#d9c27a', s: '#c9ae5f', sk: 'dot', props: ['acacia', 'rock:#a08a60', 'bush'] } },
    { id: 'lava', n: 'Lavaschaf', r: 's', inc: 8000000, w: ['#ffb02e', '#e2401c', '#3a1a12'], f: '#1a0905',
      pen: { name: 'Vulkankrater', g: '#2a1410', s: '#ff8a2b', sk: 'lava', props: ['rock:#3a2420', 'fire', 'fire'], glow: '#ff6a2b' } },
    { id: 'dampf', n: 'Dampfschaf', r: 's', inc: 2500, w: ['#ffffff', '#d9dde3', '#a9b2bd'], f: '#3c434c',
      pen: { name: 'Heiße Quellen', g: '#c9d1d8', s: '#9fd7e8', sk: 'dot', props: ['steam', 'rock:#8a929a', 'steam'] } },
    { id: 'gewitter', n: 'Gewitterschaf', r: 's', inc: 30000, w: ['#8a93ab', '#3c4256'], f: '#151824', bolt: 1,
      pen: { name: 'Sturmfeld', g: '#59627a', s: '#7f89a3', sk: 'stripe', props: ['cloud:#8a93ab', 'crystal:#ffe24a', 'cloud:#7a8399'] } },
    { id: 'diamant', n: 'Diamantschaf', r: 's', inc: 600000, w: ['#ffffff', '#bff5ff', '#7fd8ff', '#d5c6ff'], f: '#284a66',
      pen: { name: 'Diamantmine', g: '#e6fbff', s: '#bff5ff', sk: 'dot', props: ['diamond', 'crystal:#7fd8ff', 'diamond'], glow: '#7fd8ff' } },
    { id: 'sonne', n: 'Sonnenschaf', r: 's', inc: 75000000, w: ['#fff6c0', '#ffd23f', '#ff8a00'], f: '#5a2a00', sun: 1,
      pen: { name: 'Sonnenblumenfeld', g: '#ffe28a', s: '#fff3c0', sk: 'dot', props: ['sunflower', 'sunflower', 'sunflower'], glow: '#ffd23f' } },
    // Taco Tuesday (Kai): gibt es nur dienstags aus der Nacho-Box. ev = Event, kommt nicht in normalen Boxen vor
    { id: 'guac', n: 'Guacamoleschaf', r: 'e', inc: 2000, ev: 'taco', w: ['#d9f08a', '#8cc63f', '#4f8a2a'], f: '#1f3a12',
      pen: { name: 'Avocado-Hain', g: '#d8b47a', s: '#e8cc95', sk: 'dot', props: ['avocado', 'cactus', 'avocado'] } },
    { id: 'chili', n: 'Chilischaf', r: 'l', inc: 30000, ev: 'taco', w: ['#ff9a5a', '#ec3a22', '#a8160f'], f: '#3a0a05',
      pen: { name: 'Chili-Feld', g: '#c07040', s: '#d68a52', sk: 'stripe', props: ['chili', 'cactus', 'chili'], glow: '#ff5a2b' } },
    { id: 'pinata', n: 'Piñataschaf', r: 'm', inc: 5000000, ev: 'taco', w: ['#ff5fa2', '#ffd23f', '#3fc7ff', '#7be05a', '#b36bff', '#ff8a3a'], hard: 1, f: '#3a1a3a',
      pen: { name: 'Fiesta-Platz', g: '#f3d9a0', s: '#ff9fc4', sk: 'dot', props: ['papel', 'pinatabig', 'cactus'] } },
    { id: 'taco', n: 'Tacoschaf', r: 's', inc: 45000, ev: 'taco', w: ['#ffe39a', '#f2b83a', '#c98a12'], f: '#5a3a00',
      pen: { name: 'Taco-Stand', g: '#e8c27a', s: '#9fd45a', sk: 'dot', props: ['tacoprop', 'chili', 'avocado'] } }
  ];
  SI.T = {};
  SI.TYPES.forEach(function (t) { SI.T[t.id] = t; });
  SI.RECIPES = { 'eis+feuer': 'dampf', 'moos+nacht': 'zebra', 'blitz+kristall': 'gewitter', 'gold+kristall': 'diamant', 'drache+feuer': 'lava', 'galaxie+regen': 'sonne', 'chili+guac': 'taco' };

  // rb = ab welchem Rebirth die Kiste freigeschaltet ist
  SI.BOX = [
    { k: 'holz', n: 'Holzkiste', cost: 100, odds: { c: 84, r: 15, e: 1 }, card: 8, col: '#b07a45' },
    { k: 'eisen', n: 'Eisenkiste', cost: 3500, odds: { c: 50, r: 44, e: 5.5, l: 0.5 }, card: 10, col: '#7d8794' },
    { k: 'silber', n: 'Silberkiste', cost: 120000, odds: { c: 20, r: 55, e: 23, l: 2 }, card: 12, col: '#c9d3de' },
    { k: 'gold', n: 'Goldkiste', cost: 7.2e6, odds: { r: 30, e: 60, l: 9.5, m: 0.5 }, card: 14, col: '#f2b632', rb: 1 },
    { k: 'kristall', n: 'Kristallkiste', cost: 1.5e8, odds: { e: 55, l: 42, m: 3 }, card: 15, col: '#a98bff', rb: 2 },
    { k: 'regen', n: 'Regenbogenkiste', cost: 5e9, odds: { e: 20, l: 68, m: 12 }, card: 15, col: 'rainbow', rb: 3 },
    { k: 'galaxie', n: 'Galaxiekiste', cost: 3e11, odds: { l: 55, m: 45 }, card: 15, col: '#2a1f6b', rb: 4 }
  ];

  SI.BK = {};
  SI.BOX.forEach(function (b) { SI.BK[b.k] = b; });
  // Nacho-Box: nur am Taco Tuesday, nur mexikanische Schafe (steht nicht in SI.BOX, damit der Händler sie nicht anbietet)
  SI.NACHO = { k: 'nacho', n: 'Nacho-Box', cost: 75e6, odds: { e: 60, l: 35, m: 5 }, card: 8, col: '#ffb52e', ev: 'taco' };
  SI.BK.nacho = SI.NACHO;

  // Upgrade-Karten (Kai): per = Bonus pro Karte in %, max = höchstens so viele Karten (ohne max: unendlich)
  SI.CARDS = [
    { k: 'glueck', n: 'Glücksklee', d: '+5 % Glück beim Öffnen von Kisten', what: 'Glück bei Kisten', per: 5, max: 20, w: 30 },
    { k: 'gold', n: 'Goldkiste', d: '+5 % mehr Geld-Einnahmen', what: 'mehr Geld', per: 5, w: 34 },
    { k: 'hirte', n: 'Hirtenstab', d: '+5 % Glück und +5 % schneller beim Züchten', what: 'Zucht-Glück und Zucht-Tempo', per: 5, max: 10, w: 18 },
    { k: 'technik', n: 'Technik', d: 'Gehege ausbauen kostet 5 % weniger', what: 'billigere Gehege-Ausbauten', per: 5, max: 10, w: 16 },
    { k: 'hund', n: 'Hütehund', d: 'Verjagt Wölfe von allein', w: 4, max: 1 }
  ];
  SI.CK = {};
  SI.CARDS.forEach(function (c) { SI.CK[c.k] = c; });

  // Deko: rad = Platzbedarf, light = leuchtet nachts (Radius)
  SI.DEKO = [
    { id: 'heu', n: 'Heuballen', r: 'c', rad: 16 },
    { id: 'fass', n: 'Holzfass', r: 'c', rad: 13 },
    { id: 'blumen', n: 'Blumenbeet', r: 'c', rad: 18 },
    { id: 'laterne', n: 'Laterne', r: 'c', rad: 12, light: 90 },
    { id: 'pilz', n: 'Pilzkreis', r: 'c', rad: 16 },
    { id: 'busch', n: 'Beerenbusch', r: 'c', rad: 15 },
    { id: 'lampe', n: 'Straßenlampe', r: 'r', rad: 12, light: 140 },
    { id: 'brunnen', n: 'Brunnen', r: 'r', rad: 20 },
    { id: 'vogel', n: 'Vogelscheuche', r: 'r', rad: 14 },
    { id: 'baum', n: 'Apfelbaum', r: 'r', rad: 22 },
    { id: 'bank', n: 'Parkbank', r: 'r', rad: 18 },
    { id: 'scheune', n: 'Rote Scheune', r: 'e', rad: 40, light: 80 },
    { id: 'muehle', n: 'Windmühle', r: 'e', rad: 26 },
    { id: 'teich', n: 'Ententeich', r: 'e', rad: 32 },
    { id: 'feuer', n: 'Lagerfeuer', r: 'e', rad: 18, light: 170 },
    { id: 'statue', n: 'Goldene Schafstatue', r: 'l', rad: 22 },
    { id: 'leucht', n: 'Leuchtturm', r: 'l', rad: 20, light: 220 },
    { id: 'regenbrunnen', n: 'Regenbogenbrunnen', r: 'l', rad: 26, light: 120 },
    { id: 'kristallbaum', n: 'Kristallbaum', r: 'm', rad: 28, light: 200 },
    { id: 'drache', n: 'Drachenstatue', r: 'm', rad: 36, light: 120 },
    { id: 'ufo', n: 'UFO', r: 'm', rad: 28, light: 180 },
    // Taco Tuesday: mexikanische Deko, nur aus der Taco-Kiste
    { id: 'kaktus', n: 'Kaktus', r: 'r', rad: 14, ev: 'taco' },
    { id: 'papelgirlande', n: 'Fiesta-Girlande', r: 'r', rad: 24, ev: 'taco' },
    { id: 'sombrero', n: 'Riesen-Sombrero', r: 'e', rad: 24, ev: 'taco' },
    { id: 'gitarre', n: 'Mariachi-Gitarre', r: 'e', rad: 16, ev: 'taco' },
    { id: 'pinatadeko', n: 'Piñata', r: 'l', rad: 18, ev: 'taco' },
    { id: 'tacotruck', n: 'Taco-Truck', r: 'm', rad: 40, light: 150, ev: 'taco' }
  ];
  SI.TACO_ODDS = { r: 30, e: 38, l: 24, m: 8 };
  SI.DK = {};
  SI.DEKO.forEach(function (d) { SI.DK[d.id] = d; });
  SI.DEKO_BONUS = { c: 0.01, r: 0.02, e: 0.04, l: 0.08, m: 0.15 };
  SI.DEKO_ODDS = { c: 50, r: 27, e: 14, l: 7, m: 2 };
  // Chance auf eine weitere Kiste derselben Seltenheit (bis 6 pro Platz)
  SI.DEKO_EXTRA = { c: 0.75, r: 0.6, e: 0.45, l: 0.3, m: 0.15 };
  SI.DEKO_MAX = 6;
  SI.DEKO_PRICE = { c: [400, 240], r: [3000, 700], e: [25000, 1800], l: [200000, 4500], m: [2000000, 12000], taco: [140000, 3150] }; // Taco-Kiste: etwas günstiger als eine legendäre

  SI.ACH = [
    { k: 'box1', n: 'Erste Box', d: 'Öffne deine erste Mystery-Box', t: function (S) { return S.stats.boxes >= 1; } },
    { k: 'box50', n: 'Kisten-Profi', d: 'Öffne 50 Boxen', t: function (S) { return S.stats.boxes >= 50; } },
    { k: 'box250', n: 'Kisten-König', d: 'Öffne 250 Boxen', t: function (S) { return S.stats.boxes >= 250; } },
    { k: 'h10', n: 'Kleine Herde', d: 'Besitze 10 Schafe', t: function (S, G) { return G.sheepCount() >= 10; } },
    { k: 'h50', n: 'Große Herde', d: 'Besitze 50 Schafe', t: function (S, G) { return G.sheepCount() >= 50; } },
    { k: 'fr', n: 'Etwas Besonderes', d: 'Finde ein seltenes Schaf', t: function (S, G) { return G.hasRar('r'); } },
    { k: 'fe', n: 'Episch!', d: 'Finde ein episches Schaf', t: function (S, G) { return G.hasRar('e'); } },
    { k: 'fl', n: 'Legende', d: 'Finde ein legendäres Schaf', t: function (S, G) { return G.hasRar('l'); } },
    { k: 'fm', n: 'Mythos', d: 'Finde ein mythisches Schaf', t: function (S, G) { return G.hasRar('m'); } },
    { k: 'fs', n: 'Geheimnis gelüftet', d: 'Züchte ein geheimes Schaf', t: function (S, G) { return G.hasRar('s'); } },
    { k: 'b12', n: 'Sammler', d: 'Finde 12 verschiedene Schafe', t: function (S) { return Object.keys(S.found).length >= 12; } },
    { k: 'ball', n: 'Schafologe', d: 'Finde alle 24 Schafe', t: function (S) { return Object.keys(S.found).length >= SI.TYPES.length; } },
    { k: 'd1', n: 'Dekorateur', d: 'Stelle deine erste Deko auf', t: function (S) { return S.dekoPlaced.length >= 1; } },
    { k: 'd10', n: 'Schöne Farm', d: 'Stelle 10 Deko-Sachen auf', t: function (S) { return S.dekoPlaced.length >= 10; } },
    { k: 'dm', n: 'Wunderding', d: 'Finde eine mythische Deko', t: function (S) { return SI.DEKO.some(function (d) { return d.r === 'm' && S.dekoFound[d.id]; }); } },
    { k: 'p6', n: 'Großgrundbesitzer', d: 'Besitze 6 Gehege', t: function (S, G) { return G.penCount() >= 6; } },
    { k: 'mio', n: 'Millionär', d: 'Verdiene insgesamt 1 M', t: function (S) { return S.total >= 1e6; } },
    { k: 'mrd', n: 'Milliardär', d: 'Verdiene insgesamt 1 B', t: function (S) { return S.total >= 1e9; } },
    { k: 'wolf', n: 'Wolfsschreck', d: 'Verjage 5 Wölfe', t: function (S) { return S.stats.wolves >= 5; } },
    { k: 'gold5', n: 'Goldfänger', d: 'Fange 5 goldene Schafe', t: function (S) { return S.stats.golden >= 5; } },
    { k: 'z10', n: 'Züchter', d: 'Züchte 10 Babys', t: function (S) { return S.stats.breeds >= 10; } },
    { k: 'rb1', n: 'Wiedergeburt', d: 'Mache deinen ersten Rebirth', t: function (S) { return S.rebirths >= 1; } },
    { k: 'rb5', n: 'Unsterblich', d: 'Mache alle 6 Rebirths', t: function (S) { return S.rebirths >= 6; } },
    { k: 'nacht', n: 'Nachteule', d: 'Spiele eine ganze Nacht durch', t: function (S) { return S.stats.nights >= 1; } }
  ];

  SI.DAILY = ['5 Min. Geld', 'Holzkiste', '15 Min. Geld', 'Silberkiste', '45 Min. Geld', 'Goldkiste', 'Deko-Kiste Episch'];

  SI.DAY_LEN = 600;   // Sekunden Tag
  SI.NIGHT_LEN = 360; // Sekunden Nacht
})(window.SI);
