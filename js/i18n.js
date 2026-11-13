/* Schaf-Imperium: Sprachen (Deutsch, Englisch, Französisch, Spanisch)
   Das Spiel ist auf Deutsch geschrieben. Ist eine andere Sprache aktiv, übersetzt diese Datei jeden Text,
   der auf dem Bildschirm landet (Menüs, Hinweise, Knöpfe und Schrift auf der Farm), mit der Liste aus lang.js.
   Zahlen und Namen in einem Text werden als {x} erkannt, zum Beispiel "Dir fehlen noch {x} Münzen." */
window.SI = window.SI || {};
(function (SI) {
  'use strict';
  var CODES = ['de', 'en', 'fr', 'es'];
  var NAMES = { de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español' };
  function detect() {
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'de'];
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i] || '').slice(0, 2).toLowerCase();
      if (CODES.indexOf(c) >= 0) return c;
    }
    return 'en';
  }
  var saved = null;
  try { saved = localStorage.getItem('schaf_lang'); } catch (e) { /* kein Speicher */ }
  var device = detect();
  var L = CODES.indexOf(saved) >= 0 ? saved : device;
  var I = { lang: L, auto: CODES.indexOf(saved) < 0, device: device, codes: CODES, names: NAMES, misses: window.__i18nMiss ? new Set() : null };
  I.set = function (code) {
    try { if (code === 'auto') localStorage.removeItem('schaf_lang'); else localStorage.setItem('schaf_lang', code); } catch (e) { /* egal */ }
    if (I.beforeReload) try { I.beforeReload(); } catch (e) { /* egal */ }
    location.reload();
  };
  SI.i18n = I;
  try { document.documentElement.lang = L; } catch (e) { /* egal */ }
  if (L === 'de') { I.t = function (s) { return s; }; return; }

  var COL = { en: 0, fr: 1, es: 2 }[L];
  var NUM = /\d[\d,.]*(?:Qa|Qi|Sx|Sp|Oc|No|Dc|[KMBT](?![a-zäöü]))?/g;
  var LET = /[A-Za-zÄÖÜäöüß]{2,}/;
  var exact = null, norm = null, pats = null;
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function build() {
    exact = Object.create(null); norm = Object.create(null); pats = [];
    var D = SI.LANG || {};
    for (var k in D) {
      var v = D[k] && D[k][COL]; if (v == null) continue;
      exact[k] = v;
      if (k.indexOf('{x}') < 0 && !/\d/.test(k)) continue;
      // Zahlen im Schlüssel werden zu {x}, damit "Öffne 3 Boxen" auch "Öffne 7 Boxen" findet
      var kn = k.replace(NUM, '{x}');
      var nk = (k.match(NUM) || []).length, nv = (v.match(NUM) || []).length;
      var vn = (nk && nk === nv) ? v.replace(NUM, '{x}') : v;
      if (nk && nk !== nv && v.indexOf('{x}') < 0) continue;
      if (!(kn in norm)) norm[kn] = vn;
      var lit = kn.replace(/\{x\}/g, '');
      if (lit.replace(/[^A-Za-zÄÖÜäöüß]/g, '').length < 2) continue;
      var re = new RegExp('^' + reEsc(kn).replace(/\\\{x\\\}/g, '(.+?)') + '$');
      pats.push({ re: re, v: vn, w: lit.length });
    }
    pats.sort(function (a, b) { return b.w - a.w; });
  }
  function fill(tpl, caps, depth) {
    var i = 0;
    return tpl.replace(/\{(x|\d)\}/g, function (m, g) {
      var c = g === 'x' ? caps[i++] : caps[+g - 1];
      return c == null ? '' : tr(c, depth + 1);
    });
  }
  var cache = new Map();
  function core(s, depth) {
    if (s in exact) return exact[s];
    var caps = [], kn = s.replace(NUM, function (m) { caps.push(m); return '{x}'; });
    if (caps.length && kn in norm) return fill(norm[kn], caps, depth);
    if (depth > 2) return null;
    for (var i = 0; i < pats.length; i++) {
      var m = pats[i].re.exec(s);
      if (m) return fill(pats[i].v, m.slice(1), depth);
    }
    // Zusammengesetzte Texte: "Wiesenschaf · 1/4", "Karte + Deko-Kiste", "📦 Eisenkiste", "Selten 15 %", "Öffnen ·"
    var seps = [' · ', ' + ', ' – ', ' / '];
    for (i = 0; i < seps.length; i++) {
      if (s.indexOf(seps[i]) > 0) {
        var ps = s.split(seps[i]), ch = false;
        ps = ps.map(function (x) { var y = tr(x, depth + 1); if (y !== x) ch = true; return y; });
        if (ch) return ps.join(seps[i]);
      }
    }
    var pm = /^([^A-Za-zÄÖÜäöüß„“"(]+)([A-Za-zÄÖÜäöüß„“"(][\s\S]*)$/.exec(s);
    if (pm) { var r1 = core(pm[2], depth + 1); if (r1 != null) return pm[1] + r1; }
    var sm = /^([\s\S]+?)(\s+[\d.,]+[KMBT]?\s*%?|\s*[:!.…·]+)$/.exec(s);
    if (sm) { var r2 = core(sm[1], depth + 1); if (r2 != null) return r2 + sm[2]; }
    return null;
  }
  function tr(s, depth) {
    if (typeof s !== 'string' || !LET.test(s)) return s;
    if (!exact) build();
    depth = depth || 0;
    if (!depth) { var hit = cache.get(s); if (hit !== undefined) return hit; }
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), out = core(m[2], depth);
    var res = out == null ? s : m[1] + out + m[3];
    if (out == null && I.misses && !depth) I.misses.add(m[2]);
    if (!depth) { if (cache.size > 4000) cache.clear(); cache.set(s, res); }
    return res;
  }
  I.t = function (s) { return tr(s, 0); };

  /* ---------- Bildschirm-Texte ---------- */
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var seen = new WeakMap();
  function textNode(n) {
    var v = n.data; if (seen.get(n) === v) return;
    var o = tr(v, 0); if (o !== v) n.data = o;
    seen.set(n, o);
  }
  function attrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a); if (!v) continue;
      var o = tr(v, 0); if (o !== v) el.setAttribute(a, o);
    }
  }
  function skip(el) { var t = el.tagName; return t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA' || t === 'CODE' || (el.hasAttribute && el.hasAttribute('data-notr')); }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { var p = root.parentNode; if (!p || !skip(p)) textNode(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    attrs(root);
    var w = document.createTreeWalker(root, 5, { acceptNode: function (n) { return n.nodeType === 1 && skip(n) ? 2 : 1; } }), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
  }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
      else if (m.type === 'characterData') { var p = m.target.parentNode; if (!p || !skip(p)) textNode(m.target); }
      else if (m.type === 'attributes') { var v = m.target.getAttribute(m.attributeName), o = v && tr(v, 0); if (o && o !== v) m.target.setAttribute(m.attributeName, o); }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  walk(document.documentElement);
  document.addEventListener('DOMContentLoaded', function () { walk(document.documentElement); });

  /* ---------- Schrift auf der Farm (Canvas) ---------- */
  var P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (P) ['fillText', 'strokeText', 'measureText'].forEach(function (f) {
    var orig = P[f];
    P[f] = function (t) { if (typeof t === 'string') { var a = Array.prototype.slice.call(arguments); a[0] = tr(t, 0); return orig.apply(this, a); } return orig.apply(this, arguments); };
  });
})(window.SI);
