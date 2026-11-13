/* Schaf-Imperium: lädt das Spiel auch bei schlechtem Internet schneller. Immer erst online, sonst aus dem Speicher. */
var CACHE = 'schaf-v33';
var FILES = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'js/lang.js', 'js/i18n.js', 'js/data.js', 'js/art.js', 'js/style.js', 'js/sound.js', 'js/net.js', 'js/game.js', 'js/farm.js', 'js/ui.js', 'js/duel.js', 'js/quest.js', 'js/visit.js', 'js/club.js', 'js/race.js', 'icons/icon-192.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return r;
  }).catch(function () { return caches.match(e.request); }));
});
