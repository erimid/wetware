// Wetware — touch: a floating move stick, thumb buttons and tap targets for phones and tablets
'use strict';
(function () {
  var I = W.input;
  var T = W.touch = {
    on: false,
    stick: null,            // { id, ox, oy, dx, dy }
    aim: null,              // { id, ox, oy, dx, dy, btn } drag-to-aim on Attack / Special
    tapAt: null,            // screen point of a tap on open ground
    pressed: {},            // one-frame actions
    lastAim: null,          // world aim kept between frames
    lastTouchT: -1e9
  };
  var R = 58;               // stick radius in css px
  var el = {};

  // ---------- mode ----------
  function setMode(on) {
    if (T.on === on) return;
    T.on = on; I.touchMode = on;
    document.body.classList.toggle('touch', on);
    if (on) I.lastDevice = 'touch';
    if (W.ui && W.ui.refreshHint) W.ui.refreshHint();
    if (!on) release();
  }
  T.setMode = setMode;
  function release() {
    T.stick = null; T.aim = null;
    if (el.stick) el.stick.style.display = 'none';
    I.mdown[0] = false; I.mdown[2] = false;
    for (var k in el.btn) el.btn[k].classList.remove('down');
  }

  // ---------- build ----------
  var BTNS = [
    ['attack', 'Attack', ''],
    ['special', 'Special', ''],
    ['dash', 'Dash', ''],
    ['tag', 'Skill', 'Q'],
    ['vent', 'Vent', 'E'],
    ['active', 'Implant', 'F']
  ];
  function build() {
    var root = document.createElement('div'); root.id = 'touch';
    root.innerHTML = '<div id="stick"><i></i></div><div id="tbtns"></div>';
    document.body.insertBefore(root, document.getElementById('overlay'));
    el.root = root; el.stick = root.querySelector('#stick'); el.knob = el.stick.querySelector('i'); el.btns = root.querySelector('#tbtns'); el.btn = {};
    BTNS.forEach(function (b) {
      var d = document.createElement('div'); d.className = 'tb'; d.id = 'tb-' + b[0];
      d.innerHTML = '<u></u><span>' + b[1] + '</span>' + (b[2] ? '<kbd>' + b[2] + '</kbd>' : '');
      el.btns.appendChild(d); el.btn[b[0]] = d; d._act = b[0];
    });
    // top-right body grid button, beside the sound toggle
    var g = document.createElement('div'); g.id = 'tgrid'; g.className = 'ui-click'; g.textContent = 'Grid';
    document.getElementById('hud').appendChild(g); el.grid = g;
    g.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; e.preventDefault(); T.pressed.grid = true; });

    root.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    // tap the prompt or the speech box to interact / read on
    ['prompt', 'say'].forEach(function (id) {
      document.getElementById(id).addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; e.preventDefault(); T.pressed.interact = true; });
    });
  }

  function btnAt(target) { var b = target && target.closest ? target.closest('.tb') : null; return b ? b._act : null; }
  function down(e) {
    if (e.pointerType === 'mouse') return;
    e.preventDefault(); setMode(true); T.lastTouchT = performance.now();
    var act = btnAt(e.target), x = e.clientX, y = e.clientY;
    if (act) {
      el.btn[act].classList.add('down');
      if (act === 'attack') { I.mdown[0] = true; I.mpressed[0] = true; T.aim = { id: e.pointerId, ox: x, oy: y, dx: 0, dy: 0, btn: act }; }
      else if (act === 'special') { I.mdown[2] = true; I.mpressed[2] = true; T.aim = { id: e.pointerId, ox: x, oy: y, dx: 0, dy: 0, btn: act }; }
      else { T.pressed[act] = true; if (act === 'vent') T.pressed.interact = true; }
      el.btn[act]._pid = e.pointerId;
      return;
    }
    if (x < window.innerWidth * 0.5) {
      if (T.stick) return;
      T.stick = { id: e.pointerId, ox: x, oy: y, dx: 0, dy: 0 };
      el.stick.style.display = 'block'; el.stick.style.transform = 'translate(' + x + 'px,' + y + 'px)'; el.knob.style.transform = 'translate(0px,0px)';
    } else {
      // tap open ground on the right: strike toward it
      T.tapAt = { x: x, y: y }; I.mpressed[0] = true;
    }
  }
  function move(e) {
    if (e.pointerType === 'mouse') {
      // a real mouse moving well after the last touch hands control back to mouse and keyboard
      if (T.on && performance.now() - T.lastTouchT > 900 && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) setMode(false);
      return;
    }
    var s = T.stick;
    if (s && e.pointerId === s.id) {
      e.preventDefault();
      var dx = e.clientX - s.ox, dy = e.clientY - s.oy, l = Math.hypot(dx, dy);
      // the base follows a thumb that drifts past the rim
      if (l > R) { s.ox += dx / l * (l - R); s.oy += dy / l * (l - R); dx = e.clientX - s.ox; dy = e.clientY - s.oy; el.stick.style.transform = 'translate(' + s.ox + 'px,' + s.oy + 'px)'; }
      s.dx = dx; s.dy = dy; el.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }
    var a = T.aim;
    if (a && e.pointerId === a.id) { e.preventDefault(); a.dx = e.clientX - a.ox; a.dy = e.clientY - a.oy; }
  }
  function up(e) {
    if (e.pointerType === 'mouse') return;
    if (T.stick && e.pointerId === T.stick.id) { T.stick = null; el.stick.style.display = 'none'; }
    if (T.aim && e.pointerId === T.aim.id) {
      if (T.aim.btn === 'attack') I.mdown[0] = false; else I.mdown[2] = false;
      T.aim = null;
    }
    for (var k in el.btn) if (el.btn[k]._pid === e.pointerId) { el.btn[k].classList.remove('down'); el.btn[k]._pid = null; }
  }

  // ---------- actions ----------
  function nearestEnemy(P, range) {
    var G = W.game, best = null, bd = range;
    for (var i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i]; if (e.dead || e.spawnT > 0 || e.team !== 1) continue;
      var d = W.dist(P.x, P.z, e.x, e.z); if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  // folds touch input into the frame's actions (called from W.readActions)
  T.apply = function (a) {
    var p = T.pressed, s = T.stick;
    if (s) {
      var mx = s.dx / R, mz = s.dy / R, l = Math.hypot(mx, mz);
      if (l > 0.18) { if (l > 1) { mx /= l; mz /= l; } a.mx += mx; a.mz += mz; }
    }
    if (p.dash) a.dash = true; if (p.tag) a.tag = true; if (p.vent) a.vent = true; if (p.active) a.active = true; if (p.grid) a.grid = true; if (p.interact) a.interact = true;
    if (!T.on) return;
    // aim: a drag on Attack / Special, else a tap point, else the nearest enemy, else where the stick points
    var P = W.game.player, dir = null;
    if (T.aim && Math.hypot(T.aim.dx, T.aim.dy) > 16) dir = { x: T.aim.dx, z: T.aim.dy };
    else if (T.tapAt && P) { var gp = W.gfx.groundPoint(T.tapAt.x, T.tapAt.y); dir = { x: gp.x - P.x, z: gp.z - P.z }; }
    else if (P) {
      var e = nearestEnemy(P, 15);
      if (e) dir = { x: e.x - P.x, z: e.z - P.z };
      else if (a.mx || a.mz) dir = { x: a.mx, z: a.mz };
    }
    if (dir) { var dl = Math.hypot(dir.x, dir.z); if (dl > 1e-4) T.lastAim = { x: dir.x / dl, z: dir.z / dl }; }
    if (!T.lastAim && P) T.lastAim = { x: Math.sin(P.facing || 0), z: Math.cos(P.facing || 0) };
    if (T.lastAim) a.aimDir = T.lastAim;
  };
  T.endFrame = function () { T.pressed = {}; T.tapAt = null; };

  // ---------- per-frame look ----------
  var lastKey = '';
  T.update = function () {
    if (!el.root) return;
    var G = W.game, U = W.ui, P = G.player;
    var live = T.on && !U.modal && !G.attract && !!P && P.alive && G.state !== 'end' && !(G.cinematic > 0);
    var key = live ? 1 : 0;
    if (key !== lastKey) { lastKey = key; el.root.classList.toggle('live', !!live); document.body.classList.toggle('tlive', !!live); if (!live) release(); }
    if (!live) return;
    var act = G.B && G.B.active;
    el.btn.active.style.display = act ? '' : 'none';
    var tagK = P.tagMax ? W.sat(P.tagCd / P.tagMax) : 0, actK = act ? W.sat(P.activeCd / (act === 'emp' ? 12 : 8)) : 0;
    el.btn.tag.firstChild.style.height = Math.round(tagK * 100) + '%';
    el.btn.active.firstChild.style.height = Math.round(actK * 100) + '%';
    var c = W.combat.char && W.combat.char(), qn = c && c.qShort ? c.qShort : 'Skill';
    var near = G.spots && !G.inCombat && G.spots.some(function (s) { return W.dist(P.x, P.z, s.x, s.z) < s.r; });
    var lbl = qn + '|' + (near || G.sq ? 'Use' : 'Vent');
    if (lbl !== T._lbl) { T._lbl = lbl; el.btn.tag.querySelector('span').textContent = qn; el.btn.vent.querySelector('span').textContent = near || G.sq ? 'Use' : 'Vent'; }
  };

  // ---------- wire in ----------
  var endFrame = I.endFrame;
  I.endFrame = function () { endFrame(); T.endFrame(); };
  window.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { setMode(true); T.lastTouchT = performance.now(); I.any = true; } }, true);
  window.addEventListener('keydown', function (e) { if (!e.repeat && T.on) setMode(false); });
  function boot() {
    build();
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || W.params.touch) setMode(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
