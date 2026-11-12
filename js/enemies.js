// Wetware — enemies: nine types, each with its own silhouette, role and tell; elites; room hazards
'use strict';
(function () {
  var E = W.enemies = {};
  var C = W.combat, Wd = W.world, F = W.fx, K = F.K, M = W.models;
  var G; E.bind = function (g) { G = g; };
  function ang(dx, dz) { return Math.atan2(dx, dz); }
  var RED = 0xff4a26;

  E.SPEC = {
    leech: { hp: 16, r: 0.42, speed: 5.4, fly: true, y: 1.1, scrip: 1, mem: 1, name: 'Leech drone' },
    scav: { hp: 58, r: 0.6, speed: 3.1, scrip: 3, mem: 1, name: 'Pipe scav' },
    hound: { hp: 44, r: 0.62, speed: 6.6, scrip: 3, mem: 1, name: 'Gutter hound' },
    spitter: { hp: 70, r: 0.85, speed: 0, fixed: true, scrip: 4, mem: 2, name: 'Sump spitter' },
    warden: { hp: 100, r: 0.72, speed: 2.5, scrip: 5, mem: 2, name: 'Warden' },
    ghost: { hp: 44, r: 0.5, speed: 4.2, scrip: 4, mem: 2, name: 'Ghost runner' },
    rigger: { hp: 55, r: 0.55, speed: 3.6, scrip: 5, mem: 2, name: 'Rigger' },
    turret: { hp: 36, r: 0.55, speed: 0, fixed: true, scrip: 1, mem: 0, name: 'Turret' },
    bruiser: { hp: 220, r: 1.15, speed: 2.4, armor: 90, scrip: 9, mem: 4, name: 'Bruiser exo' },
    patch: { hp: 32, r: 0.5, speed: 4.6, fly: true, y: 1.9, scrip: 4, mem: 2, name: 'Patch drone' }
  };
  var TRAITS = ['swift', 'volatile', 'regen'];

  E.spawn = function (type, x, z, o) {
    o = o || {}; var s = E.SPEC[type], sc = G.hpScale || 1;
    var rigKind = { leech: 'leech', scav: 'scav', hound: 'hound', spitter: 'spitter', warden: 'warden', ghost: 'ghost', rigger: 'rigger', turret: 'turret', bruiser: 'bruiser', patch: 'patch' }[type];
    var rig = M.make(rigKind);
    var e = { type: type, x: x, z: z, y: s.y || 0, r: s.r, hp: Math.round((o.hp || s.hp) * sc), speed: s.speed, fly: !!s.fly, fixed: !!s.fixed, facing: Math.random() * 6.28, state: 'move', st: 0, kvx: 0, kvz: 0, mvx: 0, mvz: 0, stun: 0, slow: 0, tox: 0, toxT: 0, toxTick: 0, mark: 0, tag: 0, flash: 0, rig: rig, team: 1, rnd: Math.random(), cd: 1 + Math.random() * 1.5, spawnT: o.instant ? 0 : 0.75, dead: false, armor: 0, scrip: s.scrip, mem: s.mem, name: s.name, phase: Math.random() * 6, stagger: 0, root: 0, avoidT: 0, side: Math.random() < 0.5 ? 1 : -1, slowAtk: o.slow ? 1.45 : 1, windK: 1, summon: o.summon, owner: o.owner };
    e.maxHp = e.hp;
    if (s.armor) { e.armor = e.maxArmor = s.armor; }
    if (type === 'warden') { e.shieldUp = true; e.shieldHp = 34; }
    if (type === 'ghost') e.cloak = 1;
    if (o.elite) {
      e.elite = true; e.trait = o.trait || TRAITS[Math.floor(Math.random() * 3)];
      e.hp = e.maxHp = Math.round(e.hp * 1.7); e.armor = e.maxArmor = Math.max(e.armor, Math.round(e.maxHp * 0.45)); e.r *= 1.15;
      rig.root.scale.setScalar(1.22); M.setGlow(rig, 0.55, 0.12, 0.05);
      if (e.trait === 'swift') { e.speed *= 1.35; e.windK = 0.8; }
      e.name = { swift: 'Swift ', volatile: 'Volatile ', regen: 'Mending ' }[e.trait] + s.name.toLowerCase();
    }
    rig.root.position.set(x, 8, z); rig.root.visible = false;
    W.gfx.scene.add(rig.root);
    if (!o.instant) F.spawn(K.TCIRCLE, { x: x, z: z, s: e.r + 0.7, col: 0x0c0e14, dur: 0.75, p: [0, 6, 0, 0] });
    G.enemies.push(e);
    return e;
  };
  E.remove = function (e) { W.gfx.scene.remove(e.rig.root); if (e.markFx) F.kill(e.markFx); if (e.tagFx) F.kill(e.tagFx); };
  E.clearAll = function () { G.enemies.forEach(E.remove); G.enemies.length = 0; };

  function steer(e, tx, tz, sp, dt) {
    var dx = tx - e.x, dz = tz - e.z, l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    e.avoidT -= dt;
    if (!e.fly && e.avoidT <= 0 && l > 2.5 && Wd.blocked(G.room, e.x, e.z, e.x + dx * 2.4, e.z + dz * 2.4)) { e.avoidT = 0.6; e.avoidSide = Math.random() < 0.5 ? 1 : -1; }
    if (e.avoidT > 0) { var a = 1.25 * e.avoidSide, c = Math.cos(a), s = Math.sin(a), t = dx * c - dz * s; dz = dx * s + dz * c; dx = t; }
    e.mvx = dx * sp; e.mvz = dz * sp;
    return l;
  }
  function face(e, a, rate, dt) { e.facing = rate ? e.facing + W.clamp(W.angDiff(e.facing, a), -rate * dt, rate * dt) : a; }
  function go(e, st, o) { e.state = st; e.st = 0; if (o) for (var k in o) e[k] = o[k]; }
  function target(e) {
    if (e.team === 1) return G.player;
    var best = null, bd = 1e9;
    G.enemies.forEach(function (o) { if (o.team === 1 && !o.dead && o.spawnT <= 0) { var d = W.dist(e.x, e.z, o.x, o.z); if (d < bd) { bd = d; best = o; } } });
    return best;
  }
  function contact(e, dur, dmg, kb, rad) {
    return C.tell({ shape: 'circle', x: e.x, z: e.z, r: rad || e.r + 0.45, delay: 0, dur: dur, dmg: dmg, kb: kb, team: e.team === 2 ? 'e' : 'p', src: e, follow: { e: e, dist: 0.3 }, followActive: true, quiet: true });
  }

  var AI = {
    scav: function (e, dt, T, d, a) {
      if (e.state === 'move') {
        steer(e, T.x, T.z, e.speed, dt); face(e, a, 6, dt);
        if (d < 2.5 + T.r) { var w = 0.72 * e.slowAtk * e.windK; go(e, 'windup', { wind: w }); C.tell({ shape: 'sector', x: e.x, z: e.z, r: 3.2, half: 0.85, ang: e.facing, delay: w, dmg: 14, kb: 9, src: e, follow: { e: e }, col: RED }); W.audio.sfx('tellGrunt'); }
      } else if (e.state === 'windup') { if (e.st < e.wind * 0.55) face(e, a, 3.5, dt); if (e.st >= e.wind) { go(e, 'strike'); e.kvx += Math.sin(e.facing) * 5; e.kvz += Math.cos(e.facing) * 5; F.spawn(K.SLASH, { x: e.x, y: 1.1, z: e.z, s: 3.2, rot: e.facing, col: 0xffa07a, dur: 0.16, p: [0.85, 1, 0.34, 0] }); W.audio.sfx('swingHeavy', 0.5); } }
      else if (e.state === 'strike') { if (e.st > 0.2) go(e, 'recover', { recT: 0.85 * e.slowAtk }); }
      else if (e.st >= e.recT) go(e, 'move');
    },
    hound: function (e, dt, T, d, a) {
      if (e.state === 'move') {
        e.orbitT = (e.orbitT === undefined ? 1 + e.rnd * 1.6 : e.orbitT) - dt;
        var rad = 5.5, tx = T.x - Math.sin(a + e.side * 0.9) * rad, tz = T.z - Math.cos(a + e.side * 0.9) * rad;
        steer(e, tx, tz, e.speed, dt); face(e, ang(e.mvx, e.mvz), 10, dt);
        if (e.orbitT <= 0 && d < 9.5 && !Wd.blocked(G.room, e.x, e.z, T.x, T.z)) { var w = 0.46 * e.slowAtk * e.windK; go(e, 'windup', { wind: w }); e.facing = a; C.tell({ shape: 'line', x: e.x, z: e.z, ang: a, len: 8, w: 1.4, delay: w, dmg: 0, src: e, follow: { e: e }, col: RED }); W.audio.sfx('tellGrowl'); }
      } else if (e.state === 'windup') { if (e.st < e.wind * 0.7) face(e, a, 5, dt); if (e.st >= e.wind) { go(e, 'strike'); contact(e, 0.42, 10, 8); W.audio.sfx('lunge'); } }
      else if (e.state === 'strike') { e.mvx = Math.sin(e.facing) * 18; e.mvz = Math.cos(e.facing) * 18; if (e.st > 0.42) { go(e, 'recover', { recT: 0.75 }); e.orbitT = 1.2 + Math.random() * 1.4; e.side = -e.side; } }
      else if (e.st >= e.recT) go(e, 'move');
    },
    leech: function (e, dt, T, d, a) {
      if (e.attached) {
        var P = G.player; e.x = P.x - Math.sin(P.facing) * 0.3 + Math.sin(e.phase) * 0.25; e.z = P.z - Math.cos(P.facing) * 0.3 + Math.cos(e.phase) * 0.25; e.kvx = e.kvz = 0;
        e.biteT -= dt; if (e.biteT <= 0) { e.biteT = 0.6; C.hurtPlayer(2, null, { dot: true }); C.heat(4); F.spawn(K.SPARK, { x: P.x, y: 1.4, z: P.z, s: 0.5, bill: true, col: 0xff3a20, dur: 0.12 }); }
        if (!P.alive) e.attached = false;
        return;
      }
      if (e.state === 'move') {
        var wob = Math.sin(G.time * 5 + e.phase) * 1.6;
        steer(e, T.x + Math.cos(a) * wob, T.z - Math.sin(a) * wob, e.speed, dt); face(e, a, 8, dt);
        e.cd -= dt;
        if (d < 4.6 && e.cd <= 0) { var w = 0.5 * e.slowAtk; go(e, 'windup', { wind: w }); C.tell({ shape: 'line', x: e.x, z: e.z, ang: a, len: 5.6, w: 0.9, delay: w, dmg: 0, src: e, follow: { e: e }, col: RED }); W.audio.sfx('tellWhine'); }
      } else if (e.state === 'windup') { if (e.st < e.wind * 0.75) face(e, a, 6, dt); e.mvx = -Math.sin(e.facing) * 1.5; e.mvz = -Math.cos(e.facing) * 1.5; if (e.st >= e.wind) go(e, 'strike'); }
      else if (e.state === 'strike') {
        e.mvx = Math.sin(e.facing) * 13.5; e.mvz = Math.cos(e.facing) * 13.5;
        if (e.team === 1) {
          var P2 = G.player;
          if (P2.alive && W.dist(e.x, e.z, P2.x, P2.z) < 0.95) { if (C.hurtPlayer(4, e, {})) { var n = 0; G.enemies.forEach(function (o) { if (o.attached) n++; }); if (n < 3) { e.attached = true; e.biteT = 0.6; if (!G.hinted.leech) { G.hinted.leech = true; W.ui.toast('A leech is on you. Dash or vent to shake it off.'); } } } go(e, 'recover', { recT: 0.9 }); e.cd = 1.2; }
        } else if (T && W.dist(e.x, e.z, T.x, T.z) < 0.9 + T.r) { C.hitEnemy(T, 9, { src: 'shock', sx: e.x, sz: e.z, kb: 3 }); go(e, 'recover', { recT: 0.7 }); e.cd = 0.8; }
        if (e.st > 0.42 && e.state === 'strike') { go(e, 'recover', { recT: 0.9 }); e.cd = 1.0; }
      } else if (e.st >= e.recT) go(e, 'move');
    },
    spitter: function (e, dt, T, d, a) {
      face(e, a, 2.5, dt);
      if (e.state === 'move') { e.cd -= dt; if (e.cd <= 0 && d < 20) { go(e, 'windup', { wind: 0.5 }); W.audio.sfx('tellGulp'); } }
      else if (e.state === 'windup') {
        if (e.st >= e.wind) {
          var P = G.player, tx = T.x + (T === P ? Math.sin(P.moveAng) * P.speed * 0.3 : 0), tz = T.z + (T === P ? Math.cos(P.moveAng) * P.speed * 0.3 : 0);
          var fl = 1.05;
          C.shoot({ lob: fl, lt: 0, x: e.x, z: e.z, x0: e.x, z0: e.z, tx: tx, tz: tz, vx: 0, vz: 1, team: 'x', life: 9, col: 0xb8e04a, wid: 0.3, len: 0.3, y: 2.2 });
          C.tell({ shape: 'circle', x: tx, z: tz, r: 2.0, delay: fl, dmg: 8, kb: 4, team: 'p', src: e, keep: true, col: 0xb8e04a, onFire: function (t) { C.zone({ kind: 'acid', x: t.x, z: t.z, r: 2.0, life: 4.5 }); F.steamBurst(t.x, t.z, 4, 1.6, 0xd8f08a); W.audio.sfx('splat'); } });
          W.audio.sfx('lob'); go(e, 'recover', { recT: 0.4 }); e.cd = 2.7 * e.slowAtk;
        }
      } else if (e.st >= e.recT) go(e, 'move');
    },
    warden: function (e, dt, T, d, a) {
      if (e.state === 'move') {
        steer(e, T.x, T.z, e.speed, dt); face(e, a, 1.9, dt); e.cd -= dt;
        if (d < 3.2 + T.r && e.cd <= 0 && Math.abs(W.angDiff(e.facing, a)) < 0.7) { var w = 0.62 * e.windK; go(e, 'windup', { wind: w }); C.tell({ shape: 'line', x: e.x, z: e.z, ang: e.facing, len: 5, w: 2.0, delay: w, dmg: 0, src: e, follow: { e: e }, col: RED }); W.audio.sfx('tellClank'); }
      } else if (e.state === 'windup') { if (e.st < e.wind * 0.5) face(e, a, 1.5, dt); e.mvx = -Math.sin(e.facing) * 1.2; e.mvz = -Math.cos(e.facing) * 1.2; if (e.st >= e.wind) { go(e, 'strike'); contact(e, 0.4, 14, 13, 1.25); W.audio.sfx('lunge'); } }
      else if (e.state === 'strike') { e.mvx = Math.sin(e.facing) * 12; e.mvz = Math.cos(e.facing) * 12; if (e.st > 0.4) { go(e, 'recover', { recT: 1.2 }); e.cd = 1.5; } }
      else if (e.st >= e.recT) go(e, 'move');
    },
    ghost: function (e, dt, T, d, a) {
      var tc = 0;
      if (e.state === 'move') {
        tc = 1; e.cd -= dt;
        var want = 7; steer(e, T.x - Math.sin(a + e.side) * want, T.z - Math.cos(a + e.side) * want, e.speed, dt); face(e, a, 8, dt);
        if (e.cd <= 0 && d < 14) {
          var P = G.player, back = T === P ? P.facing + Math.PI : a, bx = T.x + Math.sin(back) * 2.3, bz = T.z + Math.cos(back) * 2.3;
          if (Wd.isSolid(G.room, bx, bz)) { bx = T.x - Math.sin(a) * 2.3; bz = T.z - Math.cos(a) * 2.3; }
          if (!Wd.isSolid(G.room, bx, bz)) { go(e, 'blink', { bx: bx, bz: bz }); C.tell({ shape: 'circle', x: bx, z: bz, r: 1.0, delay: 0.55, dmg: 0, src: e, col: 0xff3a3a }); W.audio.sfx('tellShimmer'); }
          else e.cd = 0.6;
        }
      } else if (e.state === 'blink') {
        tc = 1;
        if (e.st >= 0.55) {
          F.spawn(K.SPARK, { x: e.x, y: 1.2, z: e.z, s: 1.3, bill: true, col: 0x8a2030, dur: 0.2 });
          e.x = e.bx; e.z = e.bz; e.kvx = e.kvz = 0; var na = ang(T.x - e.x, T.z - e.z); e.facing = na;
          F.spawn(K.SPARK, { x: e.x, y: 1.2, z: e.z, s: 1.6, bill: true, col: 0xff3a3a, dur: 0.2 });
          var w = 0.4 * e.windK; go(e, 'windup', { wind: w }); C.tell({ shape: 'sector', x: e.x, z: e.z, r: 2.8, half: 1.0, ang: na, delay: w, dmg: 12, kb: 6, src: e, follow: { e: e }, col: RED }); W.audio.sfx('blink');
        }
      } else if (e.state === 'windup') { if (e.st < e.wind * 0.5) face(e, a, 4, dt); if (e.st >= e.wind) { go(e, 'strike'); F.spawn(K.SLASH, { x: e.x, y: 1.1, z: e.z, s: 2.9, rot: e.facing, col: 0xff8a8a, dur: 0.14, p: [1.0, -1, 0.28, 0] }); W.audio.sfx('swing', 0.8); } }
      else if (e.state === 'strike') { if (e.st > 0.18) go(e, 'recover', { recT: 1.05 }); }
      else if (e.st >= e.recT) { go(e, 'move'); e.cd = 1.6 + Math.random() * 1.6; e.side = -e.side; }
      e.cloak = W.damp(e.cloak, e.stun > 0 ? 0 : tc, 10, dt);
    },
    rigger: function (e, dt, T, d, a) {
      if (e.state === 'move') {
        e.cd -= dt;
        var tx, tz;
        if (d < 6.5) { tx = e.x - Math.sin(a) * 4; tz = e.z - Math.cos(a) * 4; } else if (d > 11) { tx = T.x; tz = T.z; } else { tx = e.x + Math.cos(a) * 3 * e.side; tz = e.z - Math.sin(a) * 3 * e.side; }
        steer(e, tx, tz, e.speed * (d < 6.5 ? 1.15 : 0.7), dt); face(e, d < 6.5 ? ang(e.mvx, e.mvz) : a, 8, dt);
        if (Math.random() < dt * 0.4) e.side = -e.side;
        var n = 0; G.enemies.forEach(function (o) { if (o.type === 'turret' && o.owner === e && !o.dead) n++; });
        if (e.cd <= 0 && n < 2) { var sx = e.x + Math.sin(a) * 1.4, sz = e.z + Math.cos(a) * 1.4; if (!Wd.isSolid(G.room, sx, sz)) { go(e, 'windup', { wind: 1.0, sx: sx, sz: sz }); C.tell({ shape: 'circle', x: sx, z: sz, r: 0.9, delay: 1.0, dmg: 0, src: e, col: 0xffb347 }); W.audio.sfx('tellRatchet'); } else e.cd = 0.5; }
      } else if (e.state === 'windup') { if (e.st >= e.wind) { var t = E.spawn('turret', e.sx, e.sz, { instant: true, owner: e, summon: true }); t.rig.root.visible = true; t.rig.root.position.set(t.x, 0, t.z); F.spawn(K.RING, { x: e.sx, y: 0.1, z: e.sz, s: 1.4, col: 0xffb347, dur: 0.25, p: [0.3, 0.12] }); go(e, 'recover', { recT: 0.5 }); e.cd = 6; } }
      else if (e.st >= e.recT) go(e, 'move');
    },
    turret: function (e, dt, T, d, a) {
      if (!T) return;
      if (e.state === 'move') { face(e, a, 3, dt); e.cd -= dt; if (e.cd <= 0 && d < 16) { go(e, 'windup', { wind: 0.72, shots: 3 }); e.aimTell = C.tell({ shape: 'line', x: e.x, z: e.z, ang: e.facing, len: 15, w: 0.5, delay: 0.72, dmg: 0, src: e, follow: { e: e }, col: e.team === 2 ? 0x49d3ff : RED, team: e.team === 2 ? 'x' : 'p' }); W.audio.sfx('tellBeep'); } }
      else if (e.state === 'windup') { if (e.st < e.wind * 0.6) face(e, a, 3, dt); if (e.st >= e.wind) go(e, 'strike', { shotT: 0 }); }
      else if (e.state === 'strike') {
        e.shotT -= dt;
        if (e.shotT <= 0 && e.shots > 0) { e.shots--; e.shotT = 0.13; var fx = Math.sin(e.facing), fz = Math.cos(e.facing); C.shoot({ x: e.x + fx * 1.1, z: e.z + fz * 1.1, vx: fx * 19, vz: fz * 19, dmg: e.team === 2 ? 9 : 6, team: e.team === 2 ? 'e' : 'p', life: 1.0, col: e.team === 2 ? 0x9fe8ff : 0xff7a4a, kb: 2 }); F.spawn(K.FLASH, { x: e.x + fx * 1.1, y: 1.0, z: e.z + fz * 1.1, s: 0.6, bill: true, col: 0xff9a5a, dur: 0.05 }); W.audio.sfx('turret'); }
        if (e.shots <= 0 && e.shotT <= 0) { go(e, 'recover', { recT: 0.3 }); e.cd = 1.9; }
      } else if (e.st >= e.recT) go(e, 'move');
    },
    bruiser: function (e, dt, T, d, a) {
      e.unstoppable = e.armor > 0; e.noKb = e.armor > 0;
      if (e.state === 'move') {
        steer(e, T.x, T.z, e.speed, dt); face(e, a, 2.6, dt); e.cd -= dt;
        if (d < 3.3 + T.r) { var w = 1.0 * e.windK; go(e, 'windup', { wind: w, atk: 'slam' }); C.tell({ shape: 'circle', x: e.x, z: e.z, r: 4.3, delay: w, dmg: 22, kb: 15, src: e, follow: { e: e }, col: RED, onFire: function (t) { F.spawn(K.RING, { x: t.x, y: 0.1, z: t.z, s: 4.4, col: 0xffd9a0, dur: 0.3, p: [0.2, 0.2] }); F.addShake(0.45); W.audio.sfx('slam'); } }); W.audio.sfx('tellServo'); }
        else if (d > 7.5 && e.cd <= 0 && !Wd.blocked(G.room, e.x, e.z, T.x, T.z)) { var w2 = 0.8 * e.windK; go(e, 'windup', { wind: w2, atk: 'charge' }); e.facing = a; C.tell({ shape: 'line', x: e.x, z: e.z, ang: a, len: 11, w: 2.5, delay: w2, dmg: 0, src: e, follow: { e: e }, col: RED }); W.audio.sfx('tellServo'); }
      } else if (e.state === 'windup') {
        if (e.atk === 'charge' && e.st < e.wind * 0.6) face(e, a, 2, dt);
        if (e.st >= e.wind) { go(e, 'strike'); if (e.atk === 'charge') { contact(e, 0.75, 18, 16, 1.6); W.audio.sfx('lunge'); } }
      } else if (e.state === 'strike') {
        if (e.atk === 'charge') { e.mvx = Math.sin(e.facing) * 13.5; e.mvz = Math.cos(e.facing) * 13.5; if (e.hitWall) { e.stun = 1.3; F.addShake(0.4); F.hitSpark(e.x, 1.4, e.z, 0xffd070, true); W.audio.sfx('thud'); go(e, 'recover', { recT: 0.5 }); e.cd = 5; G.tells.forEach(function (t) { if (t.src === e) t.cancel = true; }); } else if (e.st > 0.75) { go(e, 'recover', { recT: 1.0 }); e.cd = 5; } }
        else if (e.st > 0.25) go(e, 'recover', { recT: 1.3 });
      } else if (e.st >= e.recT) go(e, 'move');
    },
    patch: function (e, dt, T, d, a) {
      var P = G.player;
      if (e.team === 2) { steer(e, P.x - 1.5, P.z + 1, e.speed, dt); if (W.dist(e.x, e.z, P.x, P.z) < 4 && !P.redline) P.heat = Math.max(0, P.heat - 8 * dt); return; }
      var ally = null, low = 2; G.enemies.forEach(function (o) { if (o !== e && !o.dead && o.team === 1 && o.type !== 'patch' && o.type !== 'turret' && o.spawnT <= 0) { var k = o.hp / o.maxHp + W.dist(e.x, e.z, o.x, o.z) * 0.01; if (k < low) { low = k; ally = o; } } });
      var tx = e.x, tz = e.z;
      if (d < 7) { tx = e.x - Math.sin(a) * 5; tz = e.z - Math.cos(a) * 5; }
      else if (ally && W.dist(e.x, e.z, ally.x, ally.z) > 5) { tx = ally.x; tz = ally.z; }
      else { tx = e.x + Math.cos(G.time + e.phase) * 2; tz = e.z + Math.sin(G.time * 0.8 + e.phase) * 2; }
      steer(e, tx, tz, e.speed * (d < 7 ? 1.2 : 0.8), dt); face(e, ally ? ang(ally.x - e.x, ally.z - e.z) : a, 5, dt);
      if (ally && ally.hp < ally.maxHp && W.dist(e.x, e.z, ally.x, ally.z) < 9) {
        ally.hp = Math.min(ally.maxHp, ally.hp + 9 * dt); e.healT = (e.healT || 0) - dt;
        if (e.healT <= 0) { e.healT = 0.28; C.bolt(e.x, e.z, ally.x, ally.z, 0x40e08a); F.text(ally.x, 2.4, ally.z, '+', 'heal', 0.4); W.audio.sfx('heal', 0.3); }
      }
    }
  };

  E.update = function (dt) {
    var P = G.player, room = G.room;
    for (var i = G.enemies.length - 1; i >= 0; i--) {
      var e = G.enemies[i], rig = e.rig;
      if (e.dead) {
        e.deadT += dt; rig.mats.body.uniforms.uFade.value = Math.max(0.01, (e.deadT - 0.22) * 2.2); rig.mats.body.uniforms.uFlash.value = Math.max(0, 0.9 - e.deadT * 5);
        if (rig.human) M.poseHuman(rig, { t: G.time, act: 'dead' }, dt); else rig.root.position.y -= dt * 1.2;
        if (!e.fixed && (Math.abs(e.kvx) + Math.abs(e.kvz)) > 0.5) { var ww = Wd.isWater(room, e.x, e.z); Wd.move(room, e, e.kvx * dt, e.kvz * dt, e.r); var fd = Math.exp(-4 * dt); e.kvx *= fd; e.kvz *= fd; rig.root.position.x = e.x; rig.root.position.z = e.z; if (!ww && !e.fly && Wd.isWater(room, e.x, e.z)) { F.splash(e.x, e.z, 2 + e.r); F.steamBurst(e.x, e.z, 3, 1.2, 0xbfe8e4); W.audio.sfx('splash'); } }
        if (e.deadT > 0.62) { E.remove(e); G.enemies.splice(i, 1); }
        continue;
      }
      if (e.spawnT > 0) {
        e.spawnT -= dt;
        if (e.spawnT < 0.3) { rig.root.visible = true; var k = W.sat(e.spawnT / 0.3); rig.root.position.set(e.x, k * k * 7, e.z); }
        if (e.spawnT <= 0) { rig.root.position.y = 0; F.spawn(K.RING, { x: e.x, y: 0.1, z: e.z, s: e.r + 1.2, col: 0xdfe8e4, dur: 0.22, p: [0.3, 0.12] }); if (!e.fly) W.audio.sfx('land', 0.4); if (e.elite) F.text(e.x, 3.2, e.z, 'Elite: ' + e.name, 'call', 1.2); }
        continue;
      }
      if (e.boss) { W.boss.update(e, dt); continue; }
      // statuses
      e.flash = Math.max(0, e.flash - dt * 8); e.slow = Math.max(0, e.slow - dt); e.root = Math.max(0, e.root - dt); e.stagger = Math.max(0, e.stagger - dt);
      e.mark = Math.max(0, e.mark - dt); e.tag = Math.max(0, e.tag - dt); e.wreck = Math.max(0, (e.wreck || 0) - dt);
      if (e.hijackT) { e.hijackT -= dt; if (e.hijackT <= 0) { C.hitEnemy(e, 999, { src: 'cull', quiet: true }); continue; } }
      E.statusTick(e, dt);
      if (e.dead) continue;
      if (e.trait === 'regen' && G.time - (e.lastHit || 0) > 2) e.hp = Math.min(e.maxHp, e.hp + 5 * dt);
      e.mvx = 0; e.mvz = 0; e.hitWall = false;
      var T = target(e), d = 99, a = e.facing;
      if (T) { d = W.dist(e.x, e.z, T.x, T.z); a = ang(T.x - e.x, T.z - e.z); }
      e.st += dt;
      if (e.stun > 0) { e.stun -= dt; }
      else if (e.stagger > 0 && !e.unstoppable) { /* flinch */ }
      else if (T && (T !== P || P.alive)) AI[e.type](e, dt, T, d, a);
      if (e.attached) { place(e, dt); continue; }
      // physics
      var sm = (e.slow > 0 ? 0.5 : 1) * (e.root > 0 ? 0 : 1), kv = Math.hypot(e.kvx, e.kvz);
      var wasWater = !e.fly && Wd.isWater(room, e.x, e.z);
      if (e.fixed) { e.kvx = e.kvz = 0; }
      else {
        var hit = Wd.move(room, e, (e.mvx * sm + e.kvx) * dt, (e.mvz * sm + e.kvz) * dt, e.r);
        if (hit) { e.hitWall = true; if (kv > 8.5 && (e.slamCd || 0) <= 0) { e.slamCd = 0.5; e.kvx *= -0.2; e.kvz *= -0.2; C.wallSlamProc(e); if (e.dead) continue; } }
        e.slamCd = Math.max(0, (e.slamCd || 0) - dt);
        var fr = Math.exp(-5.5 * dt); e.kvx *= fr; e.kvz *= fr;
        if (!e.fly && !wasWater && kv > 4 && Wd.isWater(room, e.x, e.z)) { F.splash(e.x, e.z, 1.6 + e.r); F.steamBurst(e.x, e.z, 3, 1.2, 0xbfe8e4); W.audio.sfx('splash'); }
        if (e.wreck > 0 && kv > 6) G.enemies.forEach(function (o) { if (o !== e && !o.dead && o.team === 1 && o.spawnT <= 0 && W.dist(o.x, o.z, e.x, e.z) < o.r + e.r + 0.2 && (o.wreckHit || 0) < G.time) { o.wreckHit = G.time + 0.5; C.hitEnemy(o, 10, { kb: kv * 0.6, sx: e.x, sz: e.z, src: 'wall' }); } });
      }
      place(e, dt);
    }
    // separation
    var L = G.enemies;
    for (i = 0; i < L.length; i++) {
      var a2 = L[i]; if (a2.dead || a2.spawnT > 0 || a2.attached) continue;
      for (var j = i + 1; j < L.length; j++) {
        var b = L[j]; if (b.dead || b.spawnT > 0 || b.attached || a2.fly !== b.fly) continue;
        var dx = b.x - a2.x, dz = b.z - a2.z, dd = Math.hypot(dx, dz), min = (a2.r + b.r) * 0.9;
        if (dd < min && dd > 0.001) { var push = (min - dd) / 2; dx /= dd; dz /= dd; if (!a2.fixed && !a2.boss) { a2.x -= dx * push; a2.z -= dz * push; } if (!b.fixed && !b.boss) { b.x += dx * push; b.z += dz * push; } }
      }
      // body block against the player (dash passes through)
      if (!a2.fly && P.alive && P.state !== 'dash' && P.state !== 'leap' && a2.team === 1) {
        var px = P.x - a2.x, pz = P.z - a2.z, pd = Math.hypot(px, pz), pm = P.r + a2.r * 0.8;
        if (pd < pm && pd > 0.001) { var ps = pm - pd; P.x += px / pd * ps; P.z += pz / pd * ps; Wd.resolve(room, P, P.r); }
      }
    }
  };
  E.statusTick = function (e, dt) {
    if (e.tox > 0) {
      e.toxT -= dt; e.toxTick -= dt;
      if (e.toxTick <= 0) { e.toxTick = 0.5; C.hitEnemy(e, e.tox * 1.25 * (G.B.sets.quiet ? 1.2 : 1), { src: 'tox' }); }
      if (e.toxT <= 0) e.tox = 0;
    }
    if (e.tag > 0) { e.tagTick = (e.tagTick || 0) - dt; if (e.tagTick <= 0) { e.tagTick = 0.5; if (e.team === 1) C.hitEnemy(e, 2, { src: 'shock', quiet: true }); } }
    // markers
    if (e.mark > 0 && !e.markFx) e.markFx = F.spawn(K.MARK, { x: e.x, z: e.z, y: 0.07, s: e.r + 0.9, col: 0xff4058, manual: true, follow: e });
    if (e.mark <= 0 && e.markFx) { F.kill(e.markFx); e.markFx = null; }
    if (e.tag > 0 && !e.tagFx) e.tagFx = F.spawn(K.MARK, { x: e.x, z: e.z, y: 0.09, s: e.r + 0.55, col: 0xffb347, manual: true, follow: e });
    if (e.tag <= 0 && e.tagFx) { F.kill(e.tagFx); e.tagFx = null; }
  };
  E.tickStatus = E.statusTick;

  function place(e, dt) {
    var rig = e.rig, p = rig.parts, t = G.time, room = G.room;
    var fy = e.fly ? 0 : Wd.floorY(room, e.x, e.z);
    e.py = W.damp(e.py === undefined ? fy : e.py, fy, 14, dt);
    rig.root.position.set(e.x, e.py + (e.attached ? 0.5 : 0), e.z);
    var moving = Math.hypot(e.mvx, e.mvz);
    e.phase += moving * dt * 1.5;
    if (e.type !== 'turret' && e.type !== 'spitter') rig.root.rotation.y = W.angDamp(rig.root.rotation.y, e.facing, 16, dt);
    var act = e.stun > 0 ? 'stun' : (e.state === 'windup' ? 'windup' : (e.state === 'strike' ? 'strike' : null));
    if (rig.human) {
      var st = { t: t, speed: moving, phase: e.phase, act: act, k: e.state === 'windup' ? e.st / (e.wind || 1) : W.sat(e.st / 0.08), sub: 0 };
      if (e.type === 'warden') { st.shield = e.shieldUp; if (act === 'windup' || act === 'strike') st.act = 'bash'; else if (!act) st.act = e.shieldUp ? 'guard' : null; }
      if (e.type === 'rigger' && act === 'windup') st.act = 'kneel';
      if (e.type === 'bruiser') { st.sub = 5; if (e.atk === 'charge' && act) st.act = 'dash'; }
      if (e.type === 'ghost') { st.sub = 1; rig.mats.body.uniforms.uCloak.value = e.cloak > 0.05 ? e.cloak : 0; }
      if (e.type === 'scav' && act === 'strike') st.act = 'hold';
      M.poseHuman(rig, st, dt);
    } else if (e.type === 'leech') {
      p.rotor.rotation.y = t * 40; p.body.position.y = 1.1 + Math.sin(t * 6 + e.rnd * 9) * 0.12 + (e.state === 'windup' ? 0.35 : 0); p.body.rotation.x = e.state === 'windup' ? -0.6 : (e.state === 'strike' ? 0.7 : 0.1);
    } else if (e.type === 'hound') {
      var s = Math.sin(e.phase * 2.2), cr = e.state === 'windup' ? 1 : 0;
      p.legFL.rotation.x = s * 0.8 - cr * 0.6; p.legBR.rotation.x = s * 0.8 + cr * 0.6; p.legFR.rotation.x = -s * 0.8 - cr * 0.6; p.legBL.rotation.x = -s * 0.8 + cr * 0.6;
      p.body.position.y = W.damp(p.body.position.y, 0.85 - cr * 0.3 + Math.abs(s) * 0.05, 20, dt); p.body.rotation.x = W.damp(p.body.rotation.x, cr * 0.25 - (e.state === 'strike' ? 0.3 : 0), 20, dt); p.head.rotation.x = e.state === 'windup' ? -0.4 : 0;
    } else if (e.type === 'spitter') {
      p.tube.rotation.y = e.facing; p.tube.rotation.x = W.damp(p.tube.rotation.x, e.state === 'windup' ? 0.75 : 0.35, 12, dt); var sq = e.state === 'windup' ? 1 + Math.sin(e.st * 30) * 0.05 : 1 + Math.sin(t * 2 + e.rnd * 5) * 0.02; p.body.scale.set(sq, 2 - sq, sq);
    } else if (e.type === 'turret') { p.head.rotation.y = e.facing; p.head.position.y = 0.9 + (e.state === 'strike' ? Math.sin(t * 60) * 0.03 : 0); }
    else if (e.type === 'patch') { p.body.position.y = 1.9 + Math.sin(t * 3 + e.rnd * 7) * 0.2; p.body.rotation.z = Math.sin(t * 2) * 0.15; }
    if (e.stun > 0 && !rig.human) rig.root.rotation.z = Math.sin(t * 30) * 0.06; else if (!rig.human) rig.root.rotation.z = 0;
    M.setFlash(rig, e.flash);
    if (!e.elite && e.team === 1) { var g = e.tox > 0 ? 0.25 : 0; M.setGlow(rig, e.mark > 0 ? 0.4 : 0, g, 0); }
  }
  E.place = place;

  // ---------- room hazards: steam vents, live cables in water, falling cargo ----------
  E.updateHazards = function (dt) {
    var room = G.room; if (!room || !G.inCombat) return;
    room.vents.forEach(function (v) {
      v.t -= dt;
      if (v.t <= 0) {
        v.t = 4.5 + Math.random() * 2.5;
        C.tell({ shape: 'circle', x: v.x, z: v.z, r: 1.7, delay: 1.0, dur: 1.1, dmg: 8, kb: 5, team: 'a', col: 0xf2c24a, keep: true, onFire: function (t) { for (var i = 0; i < 5; i++) F.spawn(K.STEAM, { x: t.x + (Math.random() - 0.5), y: 0.6 + i * 0.5, z: t.z + (Math.random() - 0.5), s: 1.2, bill: true, col: 0xf0f6f2, col2: 0x8aa0a4, dur: 0.9, vy: 4, grow: 0.8, delay: i * 0.12 }); W.audio.sfx('steam'); } });
        W.audio.sfx('hiss', 0.4);
      }
    });
    room.cables.forEach(function (c) {
      c.t -= dt;
      if (c.t <= 0) {
        c.t = 5 + Math.random() * 3;
        C.tell({ shape: 'circle', x: c.x, z: c.z, r: 3.3, delay: 1.2, dur: 0.5, dmg: 10, kb: 3, team: 'a', col: 0xfff2a0, keep: true, stun: 0.6, onFire: function (t) { F.spawn(K.ZAP, { x: t.x, z: t.z, y: 0.02, s: 3.3, col: 0xfff2a0, dur: 0.5, p: [3, 0, 0, 1] }); F.flashLight(t.x, 1, t.z, [1, 0.95, 0.6], 2, 0.4, 9); W.audio.sfx('shock'); } });
        W.audio.sfx('tellBuzz', 0.5);
      }
    });
    room.drops.forEach(function (d) {
      d.t -= dt;
      if (d.t <= 0) {
        d.t = 6 + Math.random() * 4;
        C.tell({ shape: 'circle', x: d.x, z: d.z, r: 2.1, delay: 1.4, dur: 0.12, dmg: 15, kb: 8, team: 'a', col: 0xf2c24a, keep: true, heavy: true, onFire: function (t) { F.spawn(K.RING, { x: t.x, y: 0.1, z: t.z, s: 2.6, col: 0xd9c9a0, dur: 0.3, p: [0.2, 0.18] }); for (var i = 0; i < 8; i++) { var a = Math.random() * 6.28; F.spawn(K.SHARD, { x: t.x, y: 0.6, z: t.z, sx: 0.2, sz: 0.4, bill: true, rot: a, col: i % 2 ? 0x8a744a : 0x4a5a5a, dur: 0.45, vx: Math.cos(a) * 6, vy: 5 + Math.random() * 4, vz: Math.sin(a) * 6 }); } F.addShake(0.4); W.audio.sfx('crash'); } });
        F.spawn(K.DISC, { x: d.x, y: 9, z: d.z, s: 0.9, bill: true, col: 0x6a5a3a, col2: 0x0c0e14, dur: 1.4, vy: -6.2 });
      }
    });
  };
})();
