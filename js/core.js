// Wetware — core: namespace, params, rng, math, save, input
'use strict';
var W = window.W = {};
(function () {
  var q = new URLSearchParams(location.search);
  W.params = {
    auto: q.get('auto') === '1',
    seed: q.has('seed') ? (parseInt(q.get('seed'), 10) || 1) : null,
    state: q.get('state'),
    view: q.get('view'),
    t: q.has('t') ? parseFloat(q.get('t')) : null,
    fresh: q.get('fresh') === '1',
    meta: q.get('meta'),
    bot: q.get('bot'),          // 'dodge' = dodge-only test player
    phase: q.has('phase') ? parseInt(q.get('phase'), 10) : null,
    weapon: q.get('weapon'),
    fps: q.get('fps') === '1',
    noattract: q.get('noattract') === '1',
    room: q.has('room') ? parseInt(q.get('room'), 10) : null,
    res: q.has('res') ? parseFloat(q.get('res')) : null,
    speed: q.has('speed') ? parseInt(q.get('speed'), 10) : 1
  };

  // ---------- rng ----------
  W.makeRng = function (seed) {
    var a = (seed >>> 0) || 1;
    var f = function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    f.range = function (lo, hi) { return lo + (hi - lo) * f(); };
    f.int = function (lo, hi) { return Math.floor(lo + (hi - lo + 1) * f()); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.shuffle = function (arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    f.chance = function (p) { return f() < p; };
    return f;
  };
  W.hash = function (s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  W.fxr = W.makeRng(977); // cosmetic rng (not gameplay)

  // ---------- math ----------
  W.clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  W.lerp = function (a, b, t) { return a + (b - a) * t; };
  W.sat = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  W.smooth = function (a, b, x) { var t = W.sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  W.damp = function (a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); };
  W.angDiff = function (a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  W.angDamp = function (a, b, k, dt) { return a + W.angDiff(a, b) * (1 - Math.exp(-k * dt)); };
  W.dist = function (ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
  W.easeOut = function (t) { t = W.sat(t); return 1 - (1 - t) * (1 - t) * (1 - t); };
  W.easeIn = function (t) { t = W.sat(t); return t * t * t; };
  W.easeBack = function (t) { t = W.sat(t); var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  W.hex = function (h) { return new THREE.Color(h); };

  // ---------- save ----------
  var KEY = 'wetware.save.v1';
  function blank() {
    return {
      v: 1, memory: 0, cores: 0, runs: 0, deaths: 0, wins: 0, boss1: 0, boss2: 0, bestRoom: 0,
      board: { cells: 0, hp: 0, dash: 0, defy: 0, doors: 0, reroll: 0 },
      unlocks: { carbine: false, hammer: false, baton1: false, baton2: false, carbine1: false, carbine2: false, hammer1: false, hammer2: false, pool: 0 },
      weapon: 'baton', variant: 0,
      bounty: { elites: false, fast: false, heal: false },
      talk: {}, lastChoice: null, snubbed: {}
    };
  }
  function preset(name) {
    var s = blank();
    if (name === 'mid') {
      s.memory = 140; s.cores = 2; s.runs = 6; s.deaths = 6; s.boss1 = 2; s.bestRoom = 9;
      s.board = { cells: 2, hp: 1, dash: 1, defy: 0, doors: 1, reroll: 1 };
      s.unlocks.carbine = true; s.unlocks.baton1 = true; s.unlocks.pool = 1;
    } else if (name === 'full') {
      s.memory = 400; s.cores = 6; s.runs = 21; s.deaths = 17; s.wins = 4; s.boss1 = 9; s.boss2 = 4; s.bestRoom = 14;
      s.board = { cells: 4, hp: 3, dash: 1, defy: 1, doors: 1, reroll: 2 };
      var u = s.unlocks; u.carbine = u.hammer = u.baton1 = u.baton2 = u.carbine1 = u.carbine2 = u.hammer1 = u.hammer2 = true; u.pool = 4;
    }
    return s;
  }
  var memStore = null, storageOk = true;
  W.save = null;
  W.loadSave = function () {
    var s = null;
    if (W.params.meta) { W.save = preset(W.params.meta); storageOk = false; return W.save; }
    if (!W.params.fresh) {
      try { var raw = window.localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { storageOk = false; s = memStore; }
    }
    if (!s || s.v !== 1) s = blank();
    var b = blank();
    for (var k in b) if (s[k] === undefined) s[k] = b[k];
    for (k in b.board) if (s.board[k] === undefined) s.board[k] = 0;
    for (k in b.unlocks) if (s.unlocks[k] === undefined) s.unlocks[k] = b.unlocks[k];
    W.save = s;
    if (W.params.fresh) W.writeSave();
    return s;
  };
  W.writeSave = function () {
    memStore = W.save;
    if (!storageOk) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(W.save)); } catch (e) { storageOk = false; }
  };

  // ---------- input ----------
  var I = W.input = {
    keys: {}, pressed: {}, mouseX: 0, mouseY: 0, mdown: [false, false, false], mpressed: [false, false, false],
    wheel: 0, any: false, lastDevice: 'kbm', pad: null, padPrev: {}, padNow: {},
    aimX: 0, aimZ: 1, // world aim direction for gamepad
    synth: null // bot-injected state
  };
  var gameKeys = { Tab: 1, Space: 1, KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyE: 1, KeyQ: 1, KeyF: 1, KeyR: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };
  window.addEventListener('keydown', function (e) {
    if (gameKeys[e.code]) e.preventDefault();
    if (!I.keys[e.code]) I.pressed[e.code] = true;
    I.keys[e.code] = true; I.any = true; I.lastDevice = 'kbm';
  });
  window.addEventListener('keyup', function (e) { I.keys[e.code] = false; });
  window.addEventListener('blur', function () { I.keys = {}; I.mdown = [false, false, false]; });
  window.addEventListener('mousemove', function (e) { I.mouseX = e.clientX; I.mouseY = e.clientY; I.moved = true; I.everMoved = true; I.lastDevice = 'kbm'; });
  window.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest && e.target.closest('.ui-click')) return;
    I.mdown[e.button] = true; I.mpressed[e.button] = true; I.any = true; I.lastDevice = 'kbm';
  });
  window.addEventListener('mouseup', function (e) { I.mdown[e.button] = false; });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('wheel', function (e) { I.wheel += Math.sign(e.deltaY); }, { passive: true });

  var PADMAP = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
  I.pollPad = function () {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var p = null;
    for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { p = pads[i]; break; }
    I.pad = p; I.padPrev = I.padNow; I.padNow = {};
    if (!p) return;
    for (var k in PADMAP) { var b = p.buttons[PADMAP[k]]; I.padNow[k] = !!(b && (b.pressed || b.value > 0.4)); if (I.padNow[k]) { I.lastDevice = 'pad'; I.any = true; } }
    var ax = p.axes;
    I.padLX = Math.abs(ax[0]) > 0.2 ? ax[0] : 0; I.padLY = Math.abs(ax[1]) > 0.2 ? ax[1] : 0;
    I.padRX = Math.abs(ax[2]) > 0.25 ? ax[2] : 0; I.padRY = Math.abs(ax[3]) > 0.25 ? ax[3] : 0;
    if (I.padLX || I.padLY || I.padRX || I.padRY) I.lastDevice = 'pad';
  };
  I.padHit = function (k) { return !!(I.padNow[k] && !I.padPrev[k]); };
  I.hit = function (code) { return !!I.pressed[code]; };
  I.endFrame = function () { I.pressed = {}; I.mpressed = [false, false, false]; I.wheel = 0; I.moved = false; };

  // Abstract game actions for a frame (player or bot fills this)
  W.readActions = function () {
    var a = { mx: 0, mz: 0, attack: false, attackHeld: false, special: false, specialHeld: false, dash: false, tag: false, vent: false, grid: false, active: false, interact: false, aimDir: null };
    if (I.keys.KeyW || I.keys.ArrowUp) a.mz -= 1;
    if (I.keys.KeyS || I.keys.ArrowDown) a.mz += 1;
    if (I.keys.KeyA || I.keys.ArrowLeft) a.mx -= 1;
    if (I.keys.KeyD || I.keys.ArrowRight) a.mx += 1;
    a.attack = I.mpressed[0]; a.attackHeld = I.mdown[0];
    a.special = I.mpressed[2]; a.specialHeld = I.mdown[2];
    a.dash = I.hit('Space'); a.tag = I.hit('KeyQ'); a.vent = I.hit('KeyE'); a.grid = I.hit('Tab'); a.active = I.hit('KeyF');
    a.interact = I.hit('KeyE') || I.hit('Enter');
    if (I.pad) {
      a.mx += I.padLX || 0; a.mz += I.padLY || 0;
      if (I.padRX || I.padRY) { var l = Math.hypot(I.padRX, I.padRY); I.aimX = I.padRX / l; I.aimZ = I.padRY / l; }
      else if (I.lastDevice === 'pad' && (I.padLX || I.padLY)) { var l2 = Math.hypot(I.padLX, I.padLY); I.aimX = I.padLX / l2; I.aimZ = I.padLY / l2; }
      if (I.lastDevice === 'pad') a.aimDir = { x: I.aimX, z: I.aimZ };
      a.attack = a.attack || I.padHit('x') || I.padHit('rt'); a.attackHeld = a.attackHeld || I.padNow.x || I.padNow.rt;
      a.special = a.special || I.padHit('y') || I.padHit('lt'); a.specialHeld = a.specialHeld || I.padNow.y || I.padNow.lt;
      a.dash = a.dash || I.padHit('a'); a.tag = a.tag || I.padHit('rb'); a.vent = a.vent || I.padHit('b');
      a.grid = a.grid || I.padHit('back'); a.active = a.active || I.padHit('lb'); a.interact = a.interact || I.padHit('b') || I.padHit('a');
    }
    var l3 = Math.hypot(a.mx, a.mz); if (l3 > 1) { a.mx /= l3; a.mz /= l3; }
    return a;
  };
})();
