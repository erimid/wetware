// Wetware — bosses: the Dredge (three phases) and Marrow (three phases, her own grid and heat)
'use strict';
(function () {
  var Bs = W.boss = {};
  var C = W.combat, E = W.enemies, Wd = W.world, F = W.fx, K = F.K, M = W.models, D = W.data;
  var G; Bs.bind = function (g) { G = g; };
  function ang(dx, dz) { return Math.atan2(dx, dz); }
  var RED = 0xff4a26;

  function base(type, x, z, hp, r, name) {
    var rig = M.make(type);
    var e = { type: type, boss: true, x: x, z: z, y: 0, r: r, hp: hp, maxHp: hp, facing: Math.PI, state: 'intro', st: 0, kvx: 0, kvz: 0, mvx: 0, mvz: 0, stun: 0, slow: 0, tox: 0, toxT: 0, toxTick: 0, mark: 0, tag: 0, flash: 0, rig: rig, team: 1, spawnT: 0, dead: false, armor: 0, name: name, phase: 1, stagger: 0, root: 0, cd: 1.2, seq: 0, noKb: true, unstoppable: true, scrip: 30, mem: 15, rnd: 0.5, invuln: false, speedK: G.bossSpeed || 1 };
    rig.root.position.set(x, 0, z); W.gfx.scene.add(rig.root); G.enemies.push(e); G.boss = e;
    return e;
  }
  function phaseCheck(e) {
    var f = e.hp / e.maxHp, want = f > 0.66 ? 1 : (f > 0.33 ? 2 : 3);
    if (want > e.phase) { e.phase = want; return true; }
    return false;
  }
  function common(e, dt) {
    e.flash = Math.max(0, e.flash - dt * 8); e.mark = Math.max(0, e.mark - dt); e.tag = Math.max(0, e.tag - dt); e.stagger = Math.max(0, e.stagger - dt);
    E.statusTick(e, dt); M.setFlash(e.rig, Math.min(0.55, e.flash * (e.type === 'dredge' ? 0.5 : 0.8)));
  }

  // ======================= the Dredge =======================
  Bs.spawnDredge = function (room) {
    var e = base('dredge', room.bossPos.x, room.bossPos.z, 2200, 3.5, 'The Dredge');
    e.fixed = true; e.armAng = Math.PI; e.armTgt = Math.PI; e.armSpd = 0; e.dir = 1; e.jets = []; e.jetAng = 0; e.jetDir = 1; e.surge = null; e.leechT = 3; e.bucketY = 0;
    e.rig.parts.core.visible = false;
    // the scav crew at the levers
    e.crew = [[-0.9, 3.25, 0.9, 0.5], [0.9, 3.25, 0.7, -0.6]].map(function (c) { var r = M.make('scav'); r.root.scale.setScalar(0.8); r.root.position.set(c[0], c[1], c[2]); r.root.rotation.y = c[3]; e.rig.parts.shell.add(r.root); return r; });
    e.onKilled = function () { G.onBossDead(e); };
    return e;
  };
  function dredgeSweep(e, a, half, dur) {
    var mid = a + e.dir * half;
    C.tell({ shape: 'sector', x: e.x, z: e.z, r: 9.6, rin: 4.7, half: half, ang: mid, delay: dur, dur: 0.14, dmg: 20, kb: 16, src: e, col: RED, onFire: function () { F.addShake(0.4); W.audio.sfx('sweep'); F.spawn(K.SLASH, { x: e.x, y: 0.9, z: e.z, s: 9.6, rot: mid, col: 0xffd9a0, dur: 0.3, p: [half, e.dir, 0.3, 0] }); } });
    e.sweepFrom = a; e.sweepTo = a + e.dir * half * 2;
  }
  function dredgeSlam(e, tx, tz, delay) {
    var dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz), a = ang(dx, dz), rr = W.clamp(d, 5.2, 8.4);
    var px = e.x + Math.sin(a) * rr, pz = e.z + Math.cos(a) * rr;
    e.armTgt = a; e.slamAt = delay;
    C.tell({ shape: 'circle', x: px, z: pz, r: 2.8, delay: delay, dur: 0.12, dmg: 22, kb: 12, src: e, col: RED, heavy: true, onFire: function (t) { F.spawn(K.RING, { x: t.x, y: 0.12, z: t.z, s: 3.6, col: 0xffd9a0, dur: 0.3, p: [0.2, 0.2] }); F.addShake(0.5); W.audio.sfx('slam'); if (G.room.flooded) F.splash(t.x, t.z, 3); e.vulnT = 1.6; } });
  }
  function dredgeCans(e, n) {
    var P = G.player;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, rr = i === 0 ? 0 : 2 + Math.random() * 3.5, tx = P.x + Math.sin(a) * rr, tz = P.z + Math.cos(a) * rr, fl = 1.1 + i * 0.22;
      if (W.dist(tx, tz, e.x, e.z) < 4.6 || Wd.isSolid(G.room, tx, tz)) { tx = P.x; tz = P.z; }
      C.shoot({ lob: fl, lt: 0, x: e.x, z: e.z, x0: e.x, z0: e.z, tx: tx, tz: tz, vx: 0, vz: 1, team: 'x', life: 9, col: 0xb8e04a, wid: 0.34, len: 0.34, y: 3 });
      C.tell({ shape: 'circle', x: tx, z: tz, r: 1.9, delay: fl, dmg: 8, kb: 3, src: e, keep: true, col: 0xb8e04a, onFire: function (t) { C.zone({ kind: 'acid', x: t.x, z: t.z, r: 1.9, life: G.room.flooded ? 2 : 3.5 }); W.audio.sfx('splat'); } });
    }
    W.audio.sfx('lob');
  }
  function updDredge(e, dt) {
    var P = G.player, room = G.room, rig = e.rig, p = rig.parts, sk = e.speedK;
    common(e, dt);
    e.st += dt; e.vulnT = Math.max(0, (e.vulnT || 0) - dt); e.vuln = e.phase === 3 ? 1.3 : (e.vulnT > 0 ? 1.5 : 1);
    var pa = ang(P.x - e.x, P.z - e.z);
    if (e.state === 'intro') { if (e.st > 0.4) { e.state = 'idle'; e.st = 0; e.cd = 1.0; } }
    else if (phaseCheck(e)) {
      G.tells.forEach(function (t) { if (t.src === e && !t.fired) t.cancel = true; });
      e.state = 'shift'; e.st = 0; e.invuln = true; e.surge = null; W.gfx.uni.uSurge.value = 0;
      F.addShake(0.5); W.audio.sfx('bossPhase');
      if (e.phase === 2) { W.ui.banner('The hall floods', 'Water cools you. When it sparks, stand on the decks.'); }
      else { W.ui.banner('Pumps overload', 'The core is open. Move with the jets.'); }
    }
    if (e.state === 'shift') {
      if (e.phase === 2) { room.floodLevel = W.sat(e.st / 1.6); room.flood.position.y = -0.6 + room.floodLevel * 0.66; if (e.st > 0.8) room.flooded = true; }
      if (e.phase === 3 && e.st > 0.5 && p.shell.visible) {
        p.shell.visible = false; p.core.visible = true; p.arm.visible = false;
        F.steamBurst(e.x, e.z, 16, 7); for (var i = 0; i < 10; i++) { var a = Math.random() * 6.28; F.spawn(K.SHARD, { x: e.x, y: 2.5, z: e.z, sx: 0.4, sz: 0.8, bill: true, rot: a, col: i % 2 ? 0xc89a2a : 0x39424a, dur: 0.7, vx: Math.cos(a) * 9, vy: 6 + Math.random() * 5, vz: Math.sin(a) * 9 }); }
        F.addShake(0.7); W.audio.sfx('boom'); e.r = 2.2;
        for (i = 0; i < 4; i++) {
          var j = { x: e.x, z: e.z, facing: i * Math.PI / 2, dead: false };
          j.tell = C.tell({ shape: 'line', x: e.x, z: e.z, ang: j.facing, len: 8.2, w: 1.5, delay: 1.6, dur: 99999, dmg: 12, kb: 7, src: e, follow: { e: j, dist: 2.6 }, followActive: true, quiet: true });
          j.fx = F.spawn(K.JET, { x: e.x, y: 1.2, z: e.z, sx: 1.0, sz: 4.1, col: 0xf0f6f2, col2: 0x9ab0b4, manual: true, p: [0, 0, 0, 0], alpha: 0.95 });
          e.jets.push(j);
        }
      }
      if (e.st > 1.8) { e.state = 'idle'; e.st = 0; e.invuln = false; e.cd = 0.8; e.seq = 0; }
    }
    if (e.state === 'idle' && P.alive) {
      e.cd -= dt * sk;
      if (e.phase < 3) e.armTgt = pa;
      if (e.cd <= 0) {
        var s = e.seq++;
        if (e.phase === 1) {
          var m = s % 4;
          if (m === 0 || m === 2) { e.dir = m === 0 ? 1 : -1; e.state = 'sweepAim'; e.st = 0; e.armTgt = pa - e.dir * 1.25; }
          else if (m === 1) { e.state = 'slam'; e.st = 0; dredgeSlam(e, P.x, P.z, 1.05 / sk); }
          else { dredgeCans(e, 3); e.cd = 1.6; }
        } else if (e.phase === 2) {
          var m2 = s % 5;
          if (m2 === 0 || m2 === 3) { e.state = 'surge'; e.st = 0; e.surge = { warn: 1.5, live: 1.7 }; W.audio.sfx('tellBuzz'); W.ui.toast('The water is about to carry current. Get on a deck.'); }
          else if (m2 === 1) { // the safe ground moves: slam the deck the player stands on
            e.state = 'slam'; e.st = 0; dredgeSlam(e, P.x, P.z, 1.15 / sk);
          } else if (m2 === 2) { e.dir = -e.dir; e.state = 'sweepAim'; e.st = 0; e.armTgt = pa - e.dir * 1.25; }
          else { dredgeCans(e, 3); e.cd = 1.4; }
        } else {
          e.cd = 6; e.jetDirNext = -e.jetDir; e.state = 'jetFlip'; e.st = 0; W.audio.sfx('hiss');
        }
      }
    } else if (e.state === 'sweepAim') {
      if (e.st > 0.55 && !e.swTell) { e.swTell = true; dredgeSweep(e, e.armAng, 1.25, 1.0 / sk); e.sweepT = 1.0 / sk; }
      if (e.swTell && e.st > 0.55 + e.sweepT) { e.state = 'sweep'; e.st = 0; e.swTell = false; }
    } else if (e.state === 'sweep') {
      var k = W.sat(e.st / 0.32); e.armAng = W.lerp(e.sweepFrom, e.sweepTo, W.easeOut(k)); e.armTgt = e.armAng;
      if (e.st > 0.5) { e.state = 'idle'; e.st = 0; e.cd = 1.1; }
    } else if (e.state === 'slam') {
      var kk = e.st / e.slamAt; e.bucketY = kk < 1 ? W.easeOut(kk) * 2.2 : Math.max(-1.1, 2.2 - (e.st - e.slamAt) * 40);
      if (e.st > e.slamAt + 1.3) { e.state = 'idle'; e.st = 0; e.cd = 0.7; }
    } else if (e.state === 'surge') {
      var sg = e.surge;
      if (e.st < sg.warn) W.gfx.uni.uSurge.value = 0.18 + 0.14 * Math.sin(e.st * 26);
      else if (e.st < sg.warn + sg.live) {
        W.gfx.uni.uSurge.value = 1; if (!sg.on) { sg.on = true; W.audio.sfx('shock'); F.addShake(0.3); }
        sg.tick = (sg.tick || 0) - dt;
        if (sg.tick <= 0) { sg.tick = 0.45; if (P.alive && P.state !== 'dash' && Wd.isWater(room, P.x, P.z)) C.hurtPlayer(9, null, {}); G.enemies.forEach(function (o) { if (!o.boss && !o.dead && !o.fly && Wd.isWater(room, o.x, o.z)) C.hitEnemy(o, 12, { src: 'shock', stun: 0.5 }); }); F.flashLight(P.x, 2, P.z, [1, 0.95, 0.5], 1.2, 0.3, 14); }
      } else { W.gfx.uni.uSurge.value = 0; e.surge = null; e.state = 'idle'; e.st = 0; e.cd = 0.5; }
    } else if (e.state === 'jetFlip') { if (e.st > 1.2) { e.jetDir = e.jetDirNext; e.state = 'idle'; e.st = 0; } }
    G.surgeInfo = e.surge ? { t: e.st, warn: e.surge.warn, live: e.surge.live } : null;
    // arm motion
    if (e.phase < 3) {
      if (e.state !== 'sweep') e.armAng += W.clamp(W.angDiff(e.armAng, e.armTgt), -2.2 * dt * sk, 2.2 * dt * sk);
      if (e.state !== 'slam') e.bucketY = W.damp(e.bucketY, 0, 8, dt);
      p.arm.rotation.y = e.armAng; p.bucket.position.y = 1.6 + e.bucketY; p.boom.rotation.x = -e.bucketY * 0.05;
    } else {
      // rotating steam jets around the weak core
      var spin = e.state === 'jetFlip' ? 0 : 0.62 * e.jetDir * sk * (e.hp / e.maxHp < 0.15 ? 1.25 : 1);
      e.jetAng += spin * dt; e.jetOn = Math.min(1, (e.jetOn || 0) + dt * 0.7);
      e.rehit = (e.rehit || 0) - dt; var clear = e.rehit <= 0; if (clear) e.rehit = 0.6;
      e.jets.forEach(function (j, i) {
        j.facing = e.jetAng + i * Math.PI / 2; var m = j.fx.mesh, fx = Math.sin(j.facing), fz = Math.cos(j.facing);
        m.position.set(e.x + fx * 6.7, 1.2, e.z + fz * 6.7); m.rotation.y = j.facing; j.fx.u.uP.value.x = e.jetOn * 1.2; j.fx.u.uAlpha.value = e.state === 'jetFlip' ? (Math.sin(e.st * 30) > 0 ? 1 : 0.5) : 0.95;
        if (clear) j.tell.hit.length = 0;
      });
      p.core.rotation.y += dt * 1.5; p.core.scale.setScalar(1 + Math.sin(G.time * 9) * 0.04);
      e.leechT -= dt;
      if (e.leechT <= 0) { e.leechT = 6.5; var n = 0; G.enemies.forEach(function (o) { if (o.type === 'leech' && !o.dead) n++; }); if (n < 4) for (var q = 0; q < 2; q++) { var sp = Wd.freeSpot(room, G.rng, e.x, e.z, 11, 20); var l = E.spawn('leech', sp.x, sp.z, { summon: true }); l.cd = 1; } }
      F.lights.length < 6 && Math.random() < dt * 3 && F.flashLight(e.x, 3, e.z, [1, 0.5, 0.2], 1.2, 0.3, 12);
    }
    rig.root.position.set(e.x, Math.sin(G.time * 30) * 0.015 * (e.state === 'shift' ? 6 : 1), e.z);
    if (e.crew && p.shell.visible) e.crew.forEach(function (r, i) { M.poseHuman(r, { t: G.time + i, speed: 0, phase: 0, act: e.state === 'sweep' || e.state === 'slam' ? 'charge' : 'talk' }, dt); M.setFlash(r, Math.min(0.55, e.flash * 0.5)); });
  }

  // ======================= Marrow =======================
  Bs.spawnMarrow = function (room) {
    var e = base('marrow', room.bossPos ? room.bossPos.x : 0, room.bossPos ? room.bossPos.z : -4, 1900, 0.5, 'Marrow');
    var wd = M.makeWeapon('baton', 0xff3028, e.rig.mats); wd.position.set(0, -0.7, 0.04); e.rig.parts.armR.add(wd); e.rig.parts.weapon = wd;
    // she runs the house you have used least
    var used = G.run.used, best = 'orrin', bn = 1e9; W.paint.FKEYS.forEach(function (k) { var n = used[k] || 0; if (n < bn) { bn = n; best = k; } });
    e.faction = best; e.heat = 0; e.noKb = false; e.speed = 6.4; e.phaseT = 0; e.grabbed = false; e.grabCd = 4; e.facCd = 3.5; e.dashCd = 2; e.speedPhase = 0; e.cape = e.rig.mats.cape;
    var c = new THREE.Color(C.FCOL[best]); M.setGlow(e.rig, c.r * 0.45, c.g * 0.45, c.b * 0.45);
    e.onKilled = function () { G.onBossDead(e); };
    return e;
  };
  function mgo(e, st, o) { e.state = st; e.st = 0; if (o) for (var k in o) e[k] = o[k]; }
  function mHeat(e, n) { e.heat = Math.min(100, e.heat + n); }
  function mDash(e, tx, tz) {
    var dx = tx - e.x, dz = tz - e.z, l = Math.hypot(dx, dz) || 1;
    F.spawn(K.TRAIL, { x: e.x + dx / l * 1.5, y: 0.9, z: e.z + dz / l * 1.5, sx: 0.75, sz: 2.6, rot: ang(dx, dz), col: 0xc8c0ae, col2: 0xff3028, dur: 0.22 });
    mgo(e, 'dash', { dx: dx / l, dz: dz / l, dashLen: Math.min(l, 6.5) }); W.audio.sfx('dash');
  }
  function updMarrow(e, dt) {
    var P = G.player, room = G.room, rig = e.rig, sk = e.speedK * (e.phase === 1 ? 1 : (e.phase === 2 ? 1.12 : 1.2));
    common(e, dt);
    e.st += dt; e.mvx = 0; e.mvz = 0;
    var d = W.dist(e.x, e.z, P.x, P.z), a = ang(P.x - e.x, P.z - e.z), act = null, sub = 0, pk = 1;
    e.unstoppable = e.state !== 'spent';
    if (phaseCheck(e)) {
      G.tells.forEach(function (t) { if (t.src === e && !t.fired) t.cancel = true; });
      W.audio.sfx('bossPhase'); F.spawn(K.RING, { x: e.x, y: 0.2, z: e.z, s: 5, col: 0xff3028, dur: 0.35, p: [0.1, 0.16] });
      C.near; if (d < 5) { P.kvx += Math.sin(a) * 14; P.kvz += Math.cos(a) * 14; }
      if (e.phase === 3) { W.ui.say('marrow', D.LINES.marrow3[0], 3); e.grabCd = 2.2; }
      mgo(e, 'recover', { recT: 0.8 });
    }
    if (e.stun > 0) e.stun -= dt;
    if (e.state === 'intro') { if (e.st > 0.5) mgo(e, 'move'); }
    else if (e.state === 'move' && P.alive) {
      e.facCd -= dt * sk; e.dashCd -= dt; e.grabCd -= dt;
      if (e.heat >= 100) {
        mgo(e, 'ventWind'); C.tell({ shape: 'circle', x: e.x, z: e.z, r: 5.2, delay: 0.75, dmg: 16, kb: 16, src: e, follow: { e: e }, col: 0xf0f6f2, onFire: function (t) { F.spawn(K.RING, { x: t.x, y: 0.4, z: t.z, s: 5.2, col: 0xf0f6f2, dur: 0.32, p: [0.15, 0.2] }); F.steamBurst(t.x, t.z, 12, 5); F.addShake(0.35); W.audio.sfx('vent', 1); } });
        W.audio.sfx('redline');
      } else if (e.phase === 3 && !e.grabbed && e.grabCd <= 0 && d < 9 && d > 2.5 && G.run.implants.length > 0) {
        mgo(e, 'grabWind', { wind: 0.8 / sk }); e.facing = a; C.tell({ shape: 'line', x: e.x, z: e.z, ang: a, len: 7.5, w: 1.7, delay: 0.8 / sk, dmg: 0, src: e, follow: { e: e }, col: 0xfff2e0 }); W.audio.sfx('tellGrab'); F.text(e.x, 3, e.z, 'Grab', 'call redline', 0.8);
      } else if (e.facCd <= 0 && d > 3) { e.facCd = (e.phase === 1 ? 5.5 : 4.2); facMove(e, a, d, sk); }
      else if (d < 2.9) { var w = 0.42 / sk; mgo(e, 'windup', { wind: w, hitN: 0 }); C.tell({ shape: 'sector', x: e.x, z: e.z, r: 3.1, half: 1.0, ang: e.facing, delay: w, dmg: 12, kb: 8, src: e, follow: { e: e }, col: RED }); W.audio.sfx('tellMarrow'); }
      else if (e.phase >= 2 && e.dashCd <= 0 && d > 5 && d < 10 && !Wd.blocked(room, e.x, e.z, P.x, P.z)) { e.dashCd = 3.2; mgo(e, 'lungeWind', { wind: 0.5 / sk }); e.facing = a; C.tell({ shape: 'line', x: e.x, z: e.z, ang: a, len: 8.5, w: 1.5, delay: 0.5 / sk, dmg: 0, src: e, follow: { e: e }, col: RED }); W.audio.sfx('tellMarrow'); }
      else if (e.dashCd <= 0 && d > 7) { e.dashCd = 2.4; mDash(e, P.x - Math.sin(a + 0.8) * 3, P.z - Math.cos(a + 0.8) * 3); }
      else { var sp = e.speed * (d > 4 ? 1 : 0.6); e.mvx = Math.sin(a) * sp; e.mvz = Math.cos(a) * sp; }
      e.facing = W.angDamp(e.facing, a, 10, dt);
    } else if (e.state === 'windup') {
      act = 'windup'; sub = e.hitN % 2; pk = e.st / e.wind; if (e.st < e.wind * 0.5) e.facing = W.angDamp(e.facing, a, 6, dt);
      if (e.st >= e.wind) { F.spawn(K.SLASH, { x: e.x, y: 1.05, z: e.z, s: 3.2, rot: e.facing, col: 0xff8a7a, dur: 0.14, p: [1.0, e.hitN % 2 ? -1 : 1, 0.32, 0] }); e.kvx += Math.sin(e.facing) * 6; e.kvz += Math.cos(e.facing) * 6; W.audio.sfx('swing', 1); mHeat(e, 13); mgo(e, 'strike'); }
    } else if (e.state === 'strike') {
      act = 'hold'; sub = e.hitN % 2;
      if (e.st > 0.2) { e.hitN++; if (e.hitN < (e.phase === 1 ? 2 : 3) && d < 5) { var w2 = 0.3 / sk; e.facing = a; mgo(e, 'windup', { wind: w2 }); C.tell({ shape: 'sector', x: e.x, z: e.z, r: 3.1, half: 1.0, ang: e.facing, delay: w2, dmg: 12, kb: 8, src: e, follow: { e: e }, col: RED }); } else mgo(e, 'recover', { recT: 0.75 }); }
    } else if (e.state === 'recover') { if (e.st >= e.recT) mgo(e, 'move'); }
    else if (e.state === 'dash') { act = 'dash'; var v = e.dashLen / 0.17; e.mvx = e.dx * v; e.mvz = e.dz * v; e.invuln = true; if (e.st >= 0.17) { e.invuln = false; mgo(e, 'move'); } }
    else if (e.state === 'lungeWind') { act = 'windup'; sub = 4; pk = e.st / e.wind; if (e.st >= e.wind) { mgo(e, 'lunge'); C.tell({ shape: 'circle', x: e.x, z: e.z, r: 1.1, delay: 0, dur: 0.26, dmg: 14, kb: 10, src: e, follow: { e: e, dist: 0.4 }, followActive: true, quiet: true }); F.spawn(K.TRAIL, { x: e.x + Math.sin(e.facing) * 2, y: 0.9, z: e.z + Math.cos(e.facing) * 2, sx: 0.8, sz: 3, rot: e.facing, col: 0xc8c0ae, col2: 0xff3028, dur: 0.25 }); W.audio.sfx('dash'); mHeat(e, 16); } }
    else if (e.state === 'lunge') { act = 'strike'; sub = 4; e.mvx = Math.sin(e.facing) * 30; e.mvz = Math.cos(e.facing) * 30; if (e.st > 0.26) mgo(e, 'recover', { recT: 0.6 }); }
    else if (e.state === 'cast') { act = 'charge'; if (e.st >= e.castT) mgo(e, 'recover', { recT: 0.5 }); }
    else if (e.state === 'ventWind') { act = 'charge'; if (e.st >= 0.75) { e.heat = 0; mgo(e, 'spent', { recT: 2.7 }); F.text(e.x, 3, e.z, 'Overheated', 'call', 1.0); } }
    else if (e.state === 'spent') { act = 'stun'; e.vuln = 1.5; if (e.st >= e.recT) { e.vuln = 1; mgo(e, 'move'); } }
    else if (e.state === 'grabWind') { act = 'grab'; if (e.st < e.wind * 0.6) e.facing = W.angDamp(e.facing, a, 4, dt); if (e.st >= e.wind) { mgo(e, 'grab'); W.audio.sfx('dash'); } }
    else if (e.state === 'grab') {
      act = 'grab'; e.mvx = Math.sin(e.facing) * 26; e.mvz = Math.cos(e.facing) * 26;
      if (P.alive && P.state !== 'dash' && P.iframe <= 0 && W.dist(e.x, e.z, P.x, P.z) < 1.3) {
        var live = G.run.implants.filter(function (it) { return !it.torn; });
        if (live.length) {
          var it = live[Math.floor(Math.random() * live.length)]; it.torn = true; e.grabbed = true; e.tornId = it.id; G.rebuild();
          C.hurtPlayer(10, e, { kb: 12 }); G.hitstop = 0.14; F.addShake(0.6);
          F.text(P.x, 3.2, P.z, 'Torn out: ' + D.IMPLANTS[it.id].name, 'call redline', 1.8); W.audio.sfx('tear');
          F.hitSpark(P.x, 1.4, P.z, C.FCOL[D.IMPLANTS[it.id].f], true); W.ui.toast('Marrow tore out your ' + D.IMPLANTS[it.id].name + '. Beat her to take it back.');
        }
        mgo(e, 'recover', { recT: 1.0 });
      } else if (e.st > 0.3) { e.grabCd = 7; mgo(e, 'recover', { recT: 1.1 }); }
    }
    if (e.state !== 'spent') e.vuln = 1;
    // physics
    var hit = Wd.move(room, e, (e.mvx + e.kvx) * dt, (e.mvz + e.kvz) * dt, e.r);
    var fr = Math.exp(-7 * dt); e.kvx *= fr; e.kvz *= fr;
    if (!e.redShown && e.heat > 70) e.redShown = true;
    e.phaseA = (e.phaseA || 0) + Math.hypot(e.mvx, e.mvz) * dt * 1.25;
    rig.root.position.set(e.x, Wd.floorY(room, e.x, e.z), e.z); rig.root.rotation.y = e.state === 'windup' || e.state === 'strike' ? e.facing : W.angDamp(rig.root.rotation.y, e.facing, 20, dt);
    M.poseHuman(rig, { t: G.time, speed: Math.min(7, Math.hypot(e.mvx, e.mvz)), phase: e.phaseA, act: e.stun > 0 ? 'stun' : act, sub: sub, k: pk }, dt);
    var c = new THREE.Color(C.FCOL[e.faction]), hk = W.smooth(60, 100, e.heat);
    M.setGlow(rig, c.r * 0.4 * (1 - hk) + hk, c.g * 0.4 * (1 - hk) + hk * 0.25, c.b * 0.4 * (1 - hk) + hk * 0.08);
  }
  function facMove(e, a, d, sk) {
    var P = G.player, f = e.faction, n = e.phase >= 2 ? 2 : 1;
    mHeat(e, 24); mgo(e, 'cast', { castT: 0.9 / sk });
    F.text(e.x, 3, e.z, W.paint.FACTION[f].short, 'small', 0.7); W.audio.sfx('tellCast');
    if (f === 'orrin') {
      C.tell({ shape: 'circle', x: e.x, z: e.z, r: 5.4, delay: 0.9 / sk, dmg: 18, kb: 15, src: e, follow: { e: e }, col: 0xf2b824, onFire: function (t) { F.spawn(K.RING, { x: t.x, y: 0.1, z: t.z, s: 5.4, col: 0xf2b824, dur: 0.3, p: [0.2, 0.2] }); F.addShake(0.4); W.audio.sfx('slam'); } });
      if (n > 1) C.tell({ shape: 'sector', x: e.x, z: e.z, r: 10, rin: 5.4, half: 0.5, ang: a, delay: 1.5 / sk, dmg: 14, kb: 12, src: e, col: 0xf2b824, onFire: function () { W.audio.sfx('slam'); } });
    } else if (f === 'ninefold') {
      for (var i = -n; i <= n; i++) C.tell({ shape: 'line', x: e.x, z: e.z, ang: a + i * 0.42, len: 13, w: 0.9, delay: (0.85 + Math.abs(i) * 0.14) / sk, dmg: 12, kb: 4, src: e, col: 0x49d3ff, onFire: function (t) { C.bolt(t.x, t.z, t.x + Math.sin(t.ang) * 13, t.z + Math.cos(t.ang) * 13, 0x9fe8ff); W.audio.sfx('shock'); } });
    } else if (f === 'quiet') {
      for (var j = 0; j < 2 + n; j++) {
        var aa = Math.random() * 6.28, rr = j === 0 ? 0 : 2.4 + Math.random() * 2, tx = P.x + Math.sin(aa) * rr, tz = P.z + Math.cos(aa) * rr, fl = 0.95 + j * 0.2;
        if (Wd.isSolid(G.room, tx, tz)) { tx = P.x; tz = P.z; }
        C.shoot({ lob: fl, lt: 0, x: e.x, z: e.z, x0: e.x, z0: e.z, tx: tx, tz: tz, vx: 0, vz: 1, team: 'x', life: 9, col: 0x8fe04a, wid: 0.3, len: 0.3, y: 2 });
        C.tell({ shape: 'circle', x: tx, z: tz, r: 1.9, delay: fl, dmg: 9, kb: 3, src: e, keep: true, col: 0x8fe04a, onFire: function (t) { C.zone({ kind: 'acid', x: t.x, z: t.z, r: 1.9, life: 4 }); W.audio.sfx('splat'); } });
      }
    } else {
      e.facing = a;
      C.tell({ shape: 'line', x: e.x, z: e.z, ang: a, len: 22, w: 1.1, delay: 0.9 / sk, dmg: 20, kb: 8, src: e, col: 0xff4058, onFire: function (t) { F.spawn(K.BEAM, { x: t.x + Math.sin(t.ang) * 11, y: 1.2, z: t.z + Math.cos(t.ang) * 11, sx: 0.6, sz: 11, rot: t.ang, col: 0xff4058, dur: 0.25, p: [0.85, 0, 0, 0] }); F.addShake(0.3); W.audio.sfx('rail'); } });
      if (n > 1) C.tell({ shape: 'line', x: e.x, z: e.z, ang: a + 0.5, len: 22, w: 1.1, delay: 1.35 / sk, dmg: 20, kb: 8, src: e, col: 0xff4058, onFire: function (t) { F.spawn(K.BEAM, { x: t.x + Math.sin(t.ang) * 11, y: 1.2, z: t.z + Math.cos(t.ang) * 11, sx: 0.6, sz: 11, rot: t.ang, col: 0xff4058, dur: 0.25, p: [0.85, 0, 0, 0] }); W.audio.sfx('rail'); } });
    }
  }

  Bs.update = function (e, dt) { if (e.type === 'dredge') updDredge(e, dt); else updMarrow(e, dt); };
})();
