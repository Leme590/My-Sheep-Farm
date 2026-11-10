/* Schaf-Imperium: Accounts, Spielstand online speichern, Bestenliste.
   Online-Modus: Supabase (config.js). Ohne config.js: Test-Modus, alles nur auf diesem Gerät. */
(function (SI) {
  'use strict';
  var CFG = window.SCHAF_CONFIG || {};
  var ONLINE = !!(CFG.supabaseUrl && CFG.supabaseKey);
  var N = SI.net = { online: ONLINE };

  var ERR = {
    name_invalid: 'Der Name darf 3 bis 16 Zeichen haben: Buchstaben, Zahlen und _.',
    pass_short: 'Das Passwort braucht mindestens 4 Zeichen.',
    name_taken: 'Diesen Namen gibt es schon. Such dir einen anderen aus.',
    login_failed: 'Name oder Passwort stimmt nicht.',
    bad_token: 'Bitte melde dich neu an.',
    code_invalid: 'Diesen Code gibt es nicht.',
    code_used: 'Diesen Code hat schon jemand anderes eingelöst.',
    code_taken: 'Diesen Code gibt es schon. Nimm einen anderen.',
    code_format: 'Ein Code darf 3 bis 32 Zeichen haben: Buchstaben, Zahlen, - und _.',
    not_admin: 'Dafür brauchst du Admin-Rechte.',
    no_player: 'Diesen Spieler gibt es nicht.',
    bad_amount: 'Bitte gib einen gültigen Betrag ein.',
    network: 'Keine Verbindung zum Server. Prüfe dein Internet und versuch es nochmal.'
  };
  N.errText = function (e) {
    var m = (e && e.message) || '';
    for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    return ERR.network;
  };

  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* voll oder gesperrt */ } }
  N.lsGet = lsGet; N.lsSet = lsSet;

  /* ---------- Online (Supabase RPC) ---------- */
  function rpc(fn, args) {
    var headers = { 'Content-Type': 'application/json', apikey: CFG.supabaseKey };
    if (/^eyJ/.test(CFG.supabaseKey)) headers.Authorization = 'Bearer ' + CFG.supabaseKey;
    return fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: headers, body: JSON.stringify(args)
    }).then(function (r) {
      return r.text().then(function (txt) {
        var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
        if (!r.ok) throw new Error((j && (j.message || j.hint)) || 'network');
        return j;
      });
    }, function () { throw new Error('network'); });
  }

  /* ---------- Test-Modus (nur dieses Gerät) ---------- */
  function hashPw(name, pw) {
    var s = 'schaf:' + name.toLowerCase() + ':' + pw;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
        return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
      });
    }
    var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Promise.resolve('x' + (h >>> 0).toString(16));
  }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    });
  }
  // Prüfsumme des Admin-Codes (der Code selbst steht nirgends im Spiel)
  var ADMIN_SUM = 'd22f5a05d40751a81c50694b17854a8dcdc973469d4cf72434706b695cb3072a';
  function uid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  var LOCAL = {
    all: function () { return lsGet('schaf_accounts', {}); },
    put: function (a) { lsSet('schaf_accounts', a); },
    register: function (name, pw) {
      if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return Promise.reject(new Error('name_invalid'));
      if (pw.length < 4) return Promise.reject(new Error('pass_short'));
      var a = LOCAL.all();
      if (a[name.toLowerCase()]) return Promise.reject(new Error('name_taken'));
      return hashPw(name, pw).then(function (h) {
        var tok = uid();
        a[name.toLowerCase()] = { username: name, hash: h, token: tok, save: null, income: 0, playtime: 0, rebirths: 0 };
        LOCAL.put(a);
        return { token: tok, username: name };
      });
    },
    login: function (name, pw) {
      var a = LOCAL.all(), acc = a[(name || '').toLowerCase()];
      if (!acc) return Promise.reject(new Error('login_failed'));
      return hashPw(acc.username, pw).then(function (h) {
        if (h !== acc.hash) throw new Error('login_failed');
        return { token: acc.token, username: acc.username };
      });
    },
    find: function (tok) { var a = LOCAL.all(); for (var k in a) if (a[k].token === tok) return { a: a, k: k }; return null; },
    load: function (tok) {
      var f = LOCAL.find(tok); if (!f) return Promise.reject(new Error('bad_token'));
      return Promise.resolve({ username: f.a[f.k].username, save: f.a[f.k].save, admin: !!f.a[f.k].admin });
    },
    save: function (tok, save, income, playtime, rebirths) {
      var f = LOCAL.find(tok); if (!f) return Promise.reject(new Error('bad_token'));
      var acc = f.a[f.k]; acc.save = save; acc.income = income; acc.playtime = playtime; acc.rebirths = rebirths;
      LOCAL.put(f.a); return Promise.resolve(true);
    },
    inbox: function (tok) {
      var f = LOCAL.find(tok); if (!f) return Promise.reject(new Error('bad_token'));
      var box = f.a[f.k].inbox || []; f.a[f.k].inbox = []; LOCAL.put(f.a); return Promise.resolve(box);
    },
    redeem: function (tok, code) {
      var f = LOCAL.find(tok); if (!f) return Promise.reject(new Error('bad_token'));
      code = (code || '').trim();
      return sha('schaf-admin:' + code).then(function (h) {
        var a = LOCAL.all(), me = a[f.k];
        if (h === ADMIN_SUM) { me.admin = true; LOCAL.put(a); return { type: 'admin' }; }
        var codes = lsGet('schaf_codes', {}), c = codes[code.toLowerCase()];
        if (!c) throw new Error('code_invalid');
        if (c.by) throw new Error('code_used');
        c.by = me.username; c.at = Date.now(); lsSet('schaf_codes', codes);
        return { type: c.kind, value: c.value };
      });
    },
    isAdmin: function (tok) { var f = LOCAL.find(tok); if (!f) throw new Error('bad_token'); if (!f.a[f.k].admin) throw new Error('not_admin'); return f; },
    adminGive: function (tok, target, amount) {
      try { LOCAL.isAdmin(tok); } catch (e) { return Promise.reject(e); }
      if (!(amount > 0) || amount > 1e30) return Promise.reject(new Error('bad_amount'));
      var a = LOCAL.all(), t = a[(target || '').trim().toLowerCase()], me = LOCAL.find(tok);
      if (!t) return Promise.reject(new Error('no_player'));
      t.inbox = (t.inbox || []).concat([{ type: 'money', amount: amount, from: me.a[me.k].username }]); LOCAL.put(a);
      return Promise.resolve(true);
    },
    adminCode: function (tok, code, kind, value) {
      var f; try { f = LOCAL.isAdmin(tok); } catch (e) { return Promise.reject(e); }
      code = (code || '').trim();
      if (!/^[A-Za-z0-9_-]{3,32}$/.test(code)) return Promise.reject(new Error('code_format'));
      var codes = lsGet('schaf_codes', {});
      if (codes[code.toLowerCase()]) return Promise.reject(new Error('code_taken'));
      codes[code.toLowerCase()] = { code: code, kind: kind, value: String(value), by: null, made: Date.now() };
      lsSet('schaf_codes', codes); return Promise.resolve(true);
    },
    adminCodes: function (tok) {
      try { LOCAL.isAdmin(tok); } catch (e) { return Promise.reject(e); }
      var codes = lsGet('schaf_codes', {});
      return Promise.resolve(Object.keys(codes).map(function (k) { var c = codes[k]; return { code: c.code, kind: c.kind, value: c.value, redeemed_by: c.by, created_at: c.made }; })
        .sort(function (x, y) { return y.created_at - x.created_at; }).slice(0, 30));
    },
    board: function (kind) {
      var a = LOCAL.all();
      var rows = Object.keys(a).map(function (k) { return { username: a[k].username, value: a[k][kind] || 0 }; });
      rows.sort(function (x, y) { return y.value - x.value; });
      return Promise.resolve(rows.slice(0, 500));
    }
  };

  N.register = function (name, pw) {
    name = (name || '').trim();
    if (!ONLINE) return LOCAL.register(name, pw);
    return rpc('sp_register', { p_name: name, p_pass: pw });
  };
  N.login = function (name, pw) {
    name = (name || '').trim();
    if (!ONLINE) return LOCAL.login(name, pw);
    return rpc('sp_login', { p_name: name, p_pass: pw });
  };
  N.load = function (tok) {
    if (!ONLINE) return LOCAL.load(tok);
    return rpc('sp_load', { p_token: tok });
  };
  N.save = function (tok, save, income, playtime, rebirths) {
    if (!ONLINE) return LOCAL.save(tok, save, income, playtime, rebirths);
    return rpc('sp_save', { p_token: tok, p_save: save, p_income: income, p_playtime: Math.floor(playtime), p_rebirths: rebirths });
  };
  N.board = function (kind) {
    if (!ONLINE) return LOCAL.board(kind);
    return rpc('sp_leaderboard', { p_kind: kind }).then(function (r) { return r || []; });
  };

  N.inbox = function (tok) { return ONLINE ? rpc('sp_inbox', { p_token: tok }).then(function (r) { return r || []; }) : LOCAL.inbox(tok); };
  N.redeem = function (tok, code) { return ONLINE ? rpc('sp_redeem', { p_token: tok, p_code: (code || '').trim() }) : LOCAL.redeem(tok, code); };
  N.adminGive = function (tok, target, amount) { return ONLINE ? rpc('sp_admin_give', { p_token: tok, p_target: target, p_amount: amount }) : LOCAL.adminGive(tok, target, amount); };
  N.adminCode = function (tok, code, kind, value) { return ONLINE ? rpc('sp_admin_code', { p_token: tok, p_code: code, p_kind: kind, p_value: String(value) }) : LOCAL.adminCode(tok, code, kind, value); };
  N.adminCodes = function (tok) { return ONLINE ? rpc('sp_admin_codes', { p_token: tok }).then(function (r) { return r || []; }) : LOCAL.adminCodes(tok); };

  /* ---------- Duelle ---------- */
  // Online prüft der Server jeden Zug. Im Test-Modus läuft alles hier auf dem Gerät, mit dem Schafbot als Gegner.
  ['duel_self:Du kannst dich nicht selbst herausfordern.', 'duel_busy_me:Du bist schon in einem Duell.', 'duel_busy:Dieser Spieler ist gerade in einem anderen Duell.',
    'duel_spam:Du hast gerade sehr viele Spieler eingeladen. Warte kurz.', 'duel_gone:Dieses Duell gibt es nicht mehr.', 'duel_locked:Das Spiel hat schon angefangen.',
    'duel_wait:Warte kurz auf deinen Gegner.', 'duel_not_turn:Du bist gerade nicht dran.', 'duel_bad_move:Dieser Zug geht nicht.', 'duel_not_enough:So viel hast du gar nicht. Setz etwas weniger.'].forEach(function (x) {
    var i = x.indexOf(':'); ERR[x.slice(0, i)] = x.slice(i + 1);
  });
  N.BOT = 'Schafbot';
  var LINES3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var RPS_MS = 20000, TURN_MS = 30000, START_MS = 3500;
  function c4Win(b, idx, s) {
    var r = Math.floor(idx / 7), c = idx % 7, dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var d = 0; d < 4; d++) for (var k = -3; k <= 0; k++) {
      var cells = [];
      for (var i = 0; i < 4; i++) { var rr = r + (k + i) * dirs[d][0], cc = c + (k + i) * dirs[d][1]; if (rr >= 0 && rr < 6 && cc >= 0 && cc < 7) cells.push(rr * 7 + cc); }
      if (cells.length === 4 && cells.every(function (x) { return b[x] === s; })) return cells;
    }
    return null;
  }
  function c4Drop(b, col) { if (b[col] >= 0) return -1; var r = 5; while (b[r * 7 + col] >= 0) r--; return r * 7 + col; }
  function tttWin(b, s) { for (var i = 0; i < 8; i++) { var l = LINES3[i]; if (l.every(function (x) { return b[x] === s; })) return l; } return null; }
  N.duelRules = { c4Win: c4Win, c4Drop: c4Drop, tttWin: tttWin };

  var DL = {
    all: function () { return lsGet('schaf_duels', []); },
    put: function (d) { lsSet('schaf_duels', d.slice(-40)); },
    me: function (tok) { var f = LOCAL.find(tok); if (!f) throw new Error('bad_token'); return f.k; },
    name: function (k) { if (k === 'bot') return N.BOT; var a = LOCAL.all(); return a[k] ? a[k].username : k; },
    view: function (d, s) {
      var g = d.game ? JSON.parse(JSON.stringify(d.game)) : null, now = Date.now();
      if (d.mode === 'rps' && g) { var ok = s === 0 ? 'pb' : 'pa'; g[ok] = g[ok] >= 0 ? -2 : -1; }
      return { id: d.id, side: s, me: DL.name(s === 0 ? d.a : d.b), opp: DL.name(s === 0 ? d.b : d.a), state: d.state, mode: d.mode, mode_by: d.mode_by,
        my_stake: s === 0 ? d.a_stake : d.b_stake, opp_stake: s === 0 ? d.b_stake : d.a_stake, my_ready: s === 0 ? d.a_ready : d.b_ready, opp_ready: s === 0 ? d.b_ready : d.a_ready,
        start_in: d.start_at == null ? null : d.start_at - now, left: d.deadline == null ? null : d.deadline - now,
        turn: d.turn, game: g, winner: d.winner, reason: d.reason, ver: d.ver };
    },
    busy: function (list, k) { return list.some(function (d) { return (d.a === k || d.b === k) && (d.state === 'setup' || d.state === 'play'); }); },
    end: function (d, w, why) { d.state = 'done'; d.winner = w; d.reason = why; d.ver++; },
    tick: function (d) {
      var now = Date.now();
      if (d.state === 'invite' && d.created_at < now - 60000) { d.state = 'gone'; d.reason = 'expired'; d.ver++; }
      else if (d.state === 'setup' && (d.a_seen < now - 30000 || d.b_seen < now - 30000)) { d.state = 'gone'; d.reason = 'left'; d.ver++; }
      else if (d.state === 'play' && d.deadline < now) {
        if (d.mode === 'rps') { if (d.game.pa < 0 && d.game.pb < 0) DL.end(d, 2, 'timeout_both'); else DL.end(d, d.game.pa >= 0 ? 0 : 1, 'timeout'); }
        else DL.end(d, 1 - d.turn, 'timeout');
      }
      if (d.state !== 'gone' && d.state !== 'done' && (d.a === 'bot' || d.b === 'bot')) DL.bot(d, now);
    },
    get: function (tok, id) {
      var k = DL.me(tok), list = DL.all(), d = list.filter(function (x) { return x.id === id && (x.a === k || x.b === k); })[0];
      if (!d) throw new Error('duel_gone');
      DL.tick(d); return { k: k, list: list, d: d, s: d.a === k ? 0 : 1 };
    },
    start: function (d) {
      var f = Math.random() < 0.5 ? 0 : 1, now = Date.now();
      d.state = 'play'; d.start_at = now + START_MS;
      d.game = d.mode === 'rps' ? { pa: -1, pb: -1, sa: 0, sb: 0, round: 1 } : d.mode === 'ttt' ? { b: fill(9), g: 1, first: f, lm: -1 } : { b: fill(42), lm: -1 };
      d.turn = d.mode === 'rps' ? null : f;
      d.deadline = now + START_MS + (d.mode === 'rps' ? RPS_MS : TURN_MS);
    },
    move: function (d, s, mv) {
      var g = d.game, now = Date.now();
      if (d.state !== 'play') throw new Error('duel_locked');
      if (now < d.start_at) throw new Error('duel_wait');
      mv = Math.floor(+mv);
      if (d.mode === 'rps') {
        if (!(mv >= 0 && mv <= 2)) throw new Error('duel_bad_move');
        var key = s === 0 ? 'pa' : 'pb'; if (g[key] >= 0) throw new Error('duel_wait');
        g[key] = mv;
        if (g.pa >= 0 && g.pb >= 0) {
          var pa = g.pa, pb = g.pb, w = pa === pb ? 2 : ((pa === 0 && pb === 2) || (pa === 1 && pb === 0) || (pa === 2 && pb === 1)) ? 0 : 1;
          if (w === 0) g.sa++; if (w === 1) g.sb++;
          g.last = { a: pa, b: pb, w: w }; g.pa = -1; g.pb = -1; g.round++;
          if (g.sa >= 2 || g.sb >= 2) DL.end(d, g.sa >= 2 ? 0 : 1, 'win'); else d.deadline = now + RPS_MS + 3000;
        }
        d.ver++; return;
      }
      if (d.turn !== s) throw new Error('duel_not_turn');
      var b = g.b, idx, wl;
      if (d.mode === 'ttt') {
        if (!(mv >= 0 && mv <= 8) || b[mv] >= 0) throw new Error('duel_bad_move');
        b[mv] = s; idx = mv; wl = tttWin(b, s);
      } else {
        if (!(mv >= 0 && mv <= 6)) throw new Error('duel_bad_move');
        idx = c4Drop(b, mv); if (idx < 0) throw new Error('duel_bad_move');
        b[idx] = s; wl = c4Win(b, idx, s);
      }
      g.lm = idx; g.drawn = false;
      var full = b.every(function (x) { return x >= 0; });
      if (wl) { g.wl = wl; DL.end(d, s, 'win'); }
      else if (full && d.mode === 'ttt' && g.g < 3) { g.b = fill(9); g.g++; g.first = 1 - g.first; g.lm = -1; g.drawn = true; d.turn = g.first; d.deadline = now + TURN_MS + 2000; d.ver++; }
      else if (full) DL.end(d, 2, 'draw');
      else { d.turn = 1 - s; d.deadline = now + TURN_MS; d.ver++; }
    },
    // Der Schafbot: nimmt an, setzt das Gleiche wie du und spielt ganz ordentlich
    bot: function (d, now) {
      var bs = d.a === 'bot' ? 0 : 1, hs = 1 - bs;
      d[bs === 0 ? 'a_seen' : 'b_seen'] = now;
      if (d.state === 'invite') { if (bs === 1 && now - d.created_at > 1500) { d.state = 'setup'; d.a_seen = d.b_seen = now; d.ver++; } return; }
      if (d.state === 'setup') {
        var hst = hs === 0 ? d.a_stake : d.b_stake, key = bs === 0 ? 'a_stake' : 'b_stake';
        if (JSON.stringify(d[key]) !== JSON.stringify(hst)) { d[key] = JSON.parse(JSON.stringify(hst)); d.ver++; }
        var hr = hs === 0 ? d.a_ready : d.b_ready;
        if (hr) { if (!d.botAt) d.botAt = now + 1000; else if (now >= d.botAt) { d.botAt = null; d[bs === 0 ? 'a_ready' : 'b_ready'] = true; DL.start(d); d.ver++; } }
        else d.botAt = null;
        return;
      }
      if (d.state !== 'play' || now < d.start_at) return;
      var g = d.game, mine = d.mode === 'rps' ? g[bs === 0 ? 'pa' : 'pb'] < 0 : d.turn === bs;
      if (!mine) { d.botAt = null; return; }
      if (!d.botAt) { d.botAt = now + 900 + Math.random() * 900; return; }
      if (now < d.botAt) return;
      d.botAt = null;
      DL.move(d, bs, DL.botMove(d, bs));
    },
    botMove: function (d, s) {
      if (d.mode === 'rps') return Math.floor(Math.random() * 3);
      var b = d.game.b, free = [], i, t;
      if (d.mode === 'ttt') {
        for (i = 0; i < 9; i++) if (b[i] < 0) free.push(i);
        for (var who = 0; who < 2; who++) { var p = who === 0 ? s : 1 - s; for (i = 0; i < free.length; i++) { t = b.slice(); t[free[i]] = p; if (tttWin(t, p)) return free[i]; } }
        if (b[4] < 0 && Math.random() < 0.7) return 4;
        return free[Math.floor(Math.random() * free.length)];
      }
      for (i = 0; i < 7; i++) if (b[i] < 0) free.push(i);
      for (var w2 = 0; w2 < 2; w2++) { var p2 = w2 === 0 ? s : 1 - s; for (i = 0; i < free.length; i++) { t = b.slice(); var ix = c4Drop(t, free[i]); t[ix] = p2; if (c4Win(t, ix, p2)) return free[i]; } }
      var safe = free.filter(function (c) { var t2 = b.slice(), ix2 = c4Drop(t2, c); t2[ix2] = s; var up = ix2 - 7; if (up < 0) return true; t2[up] = 1 - s; return !c4Win(t2, up, 1 - s); });
      var pool = safe.length ? safe : free;
      pool.sort(function (x, y) { return Math.abs(x - 3) - Math.abs(y - 3) + (Math.random() - 0.5) * 2.5; });
      return pool[0];
    }
  };
  function fill(n) { var a = []; for (var i = 0; i < n; i++) a.push(-1); return a; }
  function cleanStake(st) {
    var m = Math.floor(+((st && st.money) || 0)), sh = {}, src = (st && st.sheep) || {}, n = 0;
    if (!(m >= 0) || m > 1e30) throw new Error('bad_amount');
    Object.keys(src).forEach(function (k) { var v = src[k]; if (!/^[a-z0-9_]{1,20}$/.test(k) || v !== Math.floor(v) || v < 1 || v > 1e6) throw new Error('bad_amount'); sh[k] = v; n++; });
    if (n > 80) throw new Error('bad_amount');
    return { money: m, sheep: sh };
  }
  N.stakeKey = function (st) { st = st || {}; var sh = st.sheep || {}; return Math.floor(st.money || 0) + '|' + Object.keys(sh).sort().map(function (k) { return k + ':' + sh[k]; }).join(','); };
  function lp(fn) { try { return Promise.resolve(fn()); } catch (e) { return Promise.reject(e); } }
  var LD = {
    invite: function (tok, target) {
      return lp(function () {
        var k = DL.me(tok), list = DL.all(), t = (target || '').trim().toLowerCase();
        if (t === N.BOT.toLowerCase()) t = 'bot'; else if (!LOCAL.all()[t]) throw new Error('no_player');
        if (t === k) throw new Error('duel_self');
        list.forEach(DL.tick);
        if (DL.busy(list, k)) throw new Error('duel_busy_me');
        if (DL.busy(list, t)) throw new Error('duel_busy');
        list.forEach(function (d) { if (d.a === k && d.state === 'invite') { d.state = 'gone'; d.reason = 'cancelled'; d.ver++; } });
        var now = Date.now(), d = { id: uid(), a: k, b: t, state: 'invite', mode: 'rps', mode_by: null, a_stake: { money: 0, sheep: {} }, b_stake: { money: 0, sheep: {} },
          a_ready: false, b_ready: false, start_at: null, game: null, turn: null, deadline: null, winner: null, reason: null, a_ack: false, b_ack: false, a_seen: now, b_seen: now, ver: 0, created_at: now };
        list.push(d); DL.put(list); return DL.view(d, 0);
      });
    },
    poll: function (tok) {
      return lp(function () {
        var k = DL.me(tok), list = DL.all(), now = Date.now(), act = null, inv = [], res = [];
        var a = LOCAL.all(); if (a[k]) { a[k].seen = now; LOCAL.put(a); }
        list.forEach(function (d) {
          if (d.state === 'setup' || d.state === 'play') { if (d.a === k) d.a_seen = now; if (d.b === k) d.b_seen = now; }
          if (d.a === k || d.b === k) DL.tick(d);
        });
        list.forEach(function (d) {
          if ((d.a === k && /^(invite|setup|play)$/.test(d.state)) || (d.b === k && /^(setup|play)$/.test(d.state))) act = DL.view(d, d.a === k ? 0 : 1);
          if (d.b === k && d.state === 'invite') inv.push({ id: d.id, from: DL.name(d.a) });
          if ((d.state === 'done' || d.state === 'gone') && ((d.a === k && !d.a_ack) || (d.b === k && !d.b_ack)) && res.length < 5) res.push(DL.view(d, d.a === k ? 0 : 1));
        });
        DL.put(list); return { duel: act, invites: inv, results: res };
      });
    },
    act: function (tok, id, fn) { return lp(function () { var x = DL.get(tok, id); fn(x.d, x.s, x); DL.put(x.list); return DL.view(x.d, x.s); }); },
    answer: function (tok, id, yes) {
      return LD.act(tok, id, function (d, s, x) {
        if (s !== 1 || d.state !== 'invite') throw new Error('duel_gone');
        if (!yes) { d.state = 'gone'; d.reason = 'declined'; d.b_ack = true; d.ver++; return; }
        if (DL.busy(x.list, x.k)) throw new Error('duel_busy_me');
        if (DL.busy(x.list, d.a)) { d.state = 'gone'; d.reason = 'cancelled'; d.ver++; throw new Error('duel_busy'); }
        x.list.forEach(function (o) { if (o.a === x.k && o.state === 'invite') { o.state = 'gone'; o.reason = 'cancelled'; o.ver++; } });
        d.state = 'setup'; d.a_seen = d.b_seen = Date.now(); d.ver++;
      });
    },
    set: function (tok, id, mode, stake) {
      return LD.act(tok, id, function (d, s) {
        if (d.state !== 'setup') throw new Error('duel_locked');
        var ch = false, key = s === 0 ? 'a_stake' : 'b_stake';
        if (mode != null) { if (!/^(rps|ttt|c4)$/.test(mode)) throw new Error('bad_amount'); if (mode !== d.mode) { ch = true; d.mode = mode; d.mode_by = s; } }
        if (stake != null) { var st = cleanStake(stake); if (N.stakeKey(st) !== N.stakeKey(d[key])) { ch = true; d[key] = st; } }
        if (ch) { d.a_ready = d.b_ready = false; d.ver++; }
      });
    },
    ready: function (tok, id, r) {
      return LD.act(tok, id, function (d, s) {
        if (d.state !== 'setup') throw new Error('duel_locked');
        d[s === 0 ? 'a_ready' : 'b_ready'] = !!r; d.ver++;
        if (d.a_ready && d.b_ready) DL.start(d);
      });
    },
    move: function (tok, id, mv) { return LD.act(tok, id, function (d, s) { DL.move(d, s, mv); }); },
    leave: function (tok, id) {
      return LD.act(tok, id, function (d, s) {
        if (d.state === 'invite') { d.state = 'gone'; d.reason = s === 0 ? 'cancelled' : 'declined'; d.ver++; }
        else if (d.state === 'setup') { d.state = 'gone'; d.reason = 'left'; d.ver++; }
        else if (d.state === 'play') DL.end(d, 1 - s, 'forfeit');
      });
    },
    ack: function (tok, id) {
      return lp(function () {
        var k = DL.me(tok), list = DL.all();
        list.forEach(function (d) { if (d.id === id && (d.state === 'done' || d.state === 'gone')) { if (d.a === k) d.a_ack = true; if (d.b === k) d.b_ack = true; } });
        DL.put(list); return true;
      });
    },
    status: function (tok, names) {
      return lp(function () {
        DL.me(tok); var a = LOCAL.all(), now = Date.now();
        return (names || []).slice(0, 50).map(function (n) {
          var k = String(n).toLowerCase();
          if (k === N.BOT.toLowerCase()) return { username: N.BOT, online: true };
          return a[k] ? { username: a[k].username, online: (a[k].seen || 0) > now - 45000 } : null;
        }).filter(Boolean);
      });
    }
  };
  N.duel = {
    invite: function (tok, target) { return ONLINE ? rpc('sp_duel_invite', { p_token: tok, p_target: target }) : LD.invite(tok, target); },
    poll: function (tok) { return ONLINE ? rpc('sp_duel_poll', { p_token: tok }) : LD.poll(tok); },
    answer: function (tok, id, yes) { return ONLINE ? rpc('sp_duel_answer', { p_token: tok, p_id: id, p_accept: !!yes }) : LD.answer(tok, id, yes); },
    set: function (tok, id, mode, stake) { return ONLINE ? rpc('sp_duel_set', { p_token: tok, p_id: id, p_mode: mode || null, p_stake: stake || null }) : LD.set(tok, id, mode, stake); },
    ready: function (tok, id, r) { return ONLINE ? rpc('sp_duel_ready', { p_token: tok, p_id: id, p_ready: !!r }) : LD.ready(tok, id, r); },
    move: function (tok, id, mv) { return ONLINE ? rpc('sp_duel_move', { p_token: tok, p_id: id, p_move: mv }) : LD.move(tok, id, mv); },
    leave: function (tok, id) { return ONLINE ? rpc('sp_duel_leave', { p_token: tok, p_id: id }) : LD.leave(tok, id); },
    ack: function (tok, id) { return ONLINE ? rpc('sp_duel_ack', { p_token: tok, p_id: id }) : LD.ack(tok, id); },
    status: function (tok, names) { return ONLINE ? rpc('sp_duel_status', { p_token: tok, p_names: names }).then(function (r) { return r || []; }) : LD.status(tok, names); }
  };


  N.session = function () { return lsGet('schaf_session', null); };
  N.setSession = function (s) { if (s) lsSet('schaf_session', s); else { try { localStorage.removeItem('schaf_session'); } catch (e) { /* egal */ } } };
})(window.SI);
