// Wetware — combat: tells, hits, heat, the player and the three weapon frames
'use strict';
(function () {
  var C = W.combat = {};
  var Wd = W.world, F = W.fx, K = F.K, M = W.models, D = W.data;
  var G; // W.game, bound at init
  C.bind = function (g) { G = g; };
  var TAU = Math.PI * 2;
  function ang(dx, dz) { return Math.atan2(dx, dz); }
  var FCOL = { orrin: 0xf2b824, ninefold: 0x49d3ff, quiet: 0x8fe04a, halcyon: 0xff4058 };
  C.FCOL = FCOL;

  // =============== tells (every attack in the game is one of these) ===============
  // o: shape circle|sector|line, x,z, r | ang,half,rin | len,w,ang ; delay, dur, dmg, team p|e|a, kb, col, src, onFire, onHit, follow{e,dist}, quiet, stun
  C.tell = function (o) {
    var t = { t: 0, fired: false, hit: [], dur: 0.1, team: 'p', col: 0xff4a26, kb: 6, dmg: 0, rin: 0, done: false };
    for (var k in o) t[k] = o[k];
    if (!t.quiet) {
      if (t.shape === 'circle') t.fx = F.spawn(K.TCIRCLE, { x: t.x, z: t.z, s: t.r, col: t.col, manual: true, p: [0, 5, 0, 0] });
      else if (t.shape === 'sector') t.fx = F.spawn(K.TSECTOR, { x: t.x, z: t.z, s: t.r, rot: t.ang, col: t.col, manual: true, p: [t.half, 5, t.rin / t.r, 0] });
      else t.fx = F.spawn(K.TLINE, { x: t.x + Math.sin(t.ang) * t.len / 2, z: t.z + Math.cos(t.ang) * t.len / 2, sx: t.w / 2, sz: t.len / 2, rot: t.ang, col: t.col, manual: true, p: [Math.min(0.2, 0.12 / t.w), 3 * t.len / Math.max(t.w, 0.5) * 0.3, 0, 0] });
    }
    G.tells.push(t); return t;
  };
  C.inTell = function (t, x, z, m) {
    m = m || 0; var dx = x - t.x, dz = z - t.z, d = Math.hypot(dx, dz);
    if (t.shape === 'circle') return d <= t.r + m;
    if (t.shape === 'sector') { if (d > t.r + m || d < t.rin - m) return false; if (d < 0.6) return true; return Math.abs(W.angDiff(t.ang, ang(dx, dz))) <= t.half + m / Math.max(d, 0.5); }
    var fx = Math.sin(t.ang), fz = Math.cos(t.ang), al = dx * fx + dz * fz, pr = Math.abs(dx * fz - dz * fx);
    return al >= -m && al <= t.len + m && pr <= t.w / 2 + m;
  };
  function tellPlace(t) {
    if (!t.fx) return; var m = t.fx.mesh;
    if (t.shape === 'line') { m.position.x = t.x + Math.sin(t.ang) * t.len / 2; m.position.z = t.z + Math.cos(t.ang) * t.len / 2; m.rotation.y = t.ang; }
    else { m.position.x = t.x; m.position.z = t.z; if (t.shape === 'sector') m.rotation.y = t.ang; }
    m.position.y = 0.05 + Wd.floorY(G.room, t.x, t.z) * 0.0 + (G.room && G.room.flooded ? 0.08 : 0);
  }
  C.updateTells = function (dt) {
    var P = G.player;
    for (var i = G.tells.length - 1; i >= 0; i--) {
      var t = G.tells[i];
      if (t.src && t.src.dead && !t.fired && !t.keep) { t.done = true; }
      if (t.cancel) t.done = true;
      if (!t.done) {
        t.t += dt;
        if (t.follow && (!t.fired || t.followActive)) { var e = t.follow.e; t.x = e.x + Math.sin(e.facing) * (t.follow.dist || 0); t.z = e.z + Math.cos(e.facing) * (t.follow.dist || 0); if (t.shape !== 'circle') t.ang = e.facing; tellPlace(t); }
        if (t.fx) t.fx.u.uT.value = Math.min(1, t.t / t.delay);
        if (t.t >= t.delay) {
          if (!t.fired) { t.fired = true; if (t.onFire) t.onFire(t); if (t.fx) t.fx.u.uP.value.w = 1; }
          // damage window
          if (t.dmg > 0 || t.onHit) {
            if ((t.team === 'p' || t.team === 'a') && P.alive && t.hit.indexOf(P) < 0 && C.inTell(t, P.x, P.z, P.r * 0.5)) {
              t.hit.push(P);
              var did = C.hurtPlayer(t.dmg, t.src || t, { kb: t.kb, tell: t });
              if (did && t.onHit) t.onHit(P, t);
            }
            if (t.team === 'e' || t.team === 'a') {
              for (var j = 0; j < G.enemies.length; j++) {
                var en = G.enemies[j];
                if (en.dead || en.spawnT > 0 || en === t.src || t.hit.indexOf(en) >= 0 || (t.team === 'e' && en.team === 2)) continue;
                if (C.inTell(t, en.x, en.z, en.r * 0.6)) { t.hit.push(en); C.hitEnemy(en, t.team === 'a' ? t.dmg * 1.5 : t.dmg, { kb: t.kb, sx: t.x, sz: t.z, stun: t.stun, src: 'tell', heavy: t.heavy }); if (t.onHit) t.onHit(en, t); }
              }
            }
          }
          if (t.t >= t.delay + t.dur) t.done = true;
        }
      }
      if (t.done) { if (t.fx) F.kill(t.fx); G.tells.splice(i, 1); }
    }
  };

  // =============== zones (pools, fields, clouds) ===============
  C.zone = function (o) {
    var z = { life: 4, tick: 0, r: 2, team: 'p', kind: 'acid' };
    for (var k in o) z[k] = o[k];
    var cols = { acid: [0xb8e04a, 0x4a6a12], slow: [0x8fe0c8, 0x2a6a5a], tox: [0x8fe04a, 0x2d5a12], steam: [0xe8f0ec, 0x8aa0a4] }[z.kind];
    z.fx = F.spawn(K.POOL, { x: z.x, z: z.z, s: z.r, col: cols[0], col2: cols[1], manual: true, p: [0, 0, 0, 0], y: 0.04 });
    z.max = z.life; G.zones.push(z); return z;
  };
  C.updateZones = function (dt) {
    var P = G.player;
    for (var i = G.zones.length - 1; i >= 0; i--) {
      var z = G.zones[i]; z.life -= dt; z.tick -= dt;
      z.fx.u.uP.value.x = Math.min(1, (z.max - z.life) * 5, z.life * 3);
      if (z.tick <= 0) {
        z.tick = 0.5;
        if (z.kind === 'acid') {
          if (P.alive && W.dist(P.x, P.z, z.x, z.z) < z.r * 0.92 && P.state !== 'dash') C.hurtPlayer(3, null, { dot: true });
          G.enemies.forEach(function (e) { if (!e.dead && !e.fly && e.type !== 'spitter' && W.dist(e.x, e.z, z.x, z.z) < z.r) C.hitEnemy(e, 2, { src: 'zone', quiet: true }); });
        } else if (z.kind === 'tox') {
          G.enemies.forEach(function (e) { if (!e.dead && e.team === 1 && W.dist(e.x, e.z, z.x, z.z) < z.r + e.r) C.addTox(e, z.stacks || 1); });
        }
      }
      if (z.kind === 'slow') G.enemies.forEach(function (e) { if (!e.dead && W.dist(e.x, e.z, z.x, z.z) < z.r + e.r) e.slow = Math.max(e.slow, 0.3); });
      if (z.life <= 0) { F.kill(z.fx); G.zones.splice(i, 1); }
    }
  };

  // =============== shots ===============
  C.shoot = function (o) {
    var s = { life: 1.2, r: 0.3, dmg: 5, team: 'p', pierce: 0, hit: [], y: 1.1, kind: 'needle', col: 0xffe08a, len: 1.1, wid: 0.12 };
    for (var k in o) s[k] = o[k];
    var a = ang(s.vx, s.vz);
    s.fx = F.spawn(K.BEAM, { x: s.x, y: s.y, z: s.z, sx: s.wid, sz: s.len, rot: a, col: s.col, manual: true, p: [0.9, 0, 0, 0] });
    G.shots.push(s); return s;
  };
  C.updateShots = function (dt) {
    var P = G.player;
    for (var i = G.shots.length - 1; i >= 0; i--) {
      var s = G.shots[i], dead = false;
      s.life -= dt;
      if (s.lob) { // lobbed canister: flies an arc, no collision until it lands
        s.lt += dt; var k = s.lt / s.lob; s.x = W.lerp(s.x0, s.tx, k); s.z = W.lerp(s.z0, s.tz, k); s.y = 1.6 + Math.sin(k * Math.PI) * 5 * (1 - k * 0.2);
        if (k >= 1) dead = true;
      } else {
        var steps = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vz) * dt / 0.4));
        for (var st = 0; st < steps && !dead; st++) {
          s.x += s.vx * dt / steps; s.z += s.vz * dt / steps;
          if (Wd.isSolid(G.room, s.x, s.z)) { dead = true; F.spawn(K.SPARK, { x: s.x, y: s.y, z: s.z, s: 0.5, bill: true, col: s.col, dur: 0.12 }); break; }
          if (s.team === 'p') {
            if (P.alive && W.dist(s.x, s.z, P.x, P.z) < s.r + P.r * 0.8 && s.hit.indexOf(P) < 0) { s.hit.push(P); if (C.hurtPlayer(s.dmg, { x: s.x - s.vx, z: s.z - s.vz }, { kb: 3 })) dead = true; }
          } else {
            for (var j = 0; j < G.enemies.length; j++) {
              var e = G.enemies[j];
              if (e.dead || e.spawnT > 0 || s.hit.indexOf(e) >= 0 || (e.team === 2 && s.kind !== 'tag')) continue;
              if (W.dist(s.x, s.z, e.x, e.z) < s.r + e.r) {
                s.hit.push(e);
                if (s.kind === 'tag') { C.applyTag(e); dead = true; break; }
                C.hitEnemy(e, s.dmg, { kb: s.kb || 2, sx: s.x - s.vx * 0.1, sz: s.z - s.vz * 0.1, direct: s.direct, heavy: s.heavy, mark: s.mark, src: 'shot' });
                if (s.pierce-- <= 0) { dead = true; break; }
              }
            }
          }
        }
      }
      var m = s.fx.mesh; m.position.set(s.x, s.y, s.z);
      if (s.life <= 0) dead = true;
      if (dead) { if (s.onEnd) s.onEnd(s); F.kill(s.fx); G.shots.splice(i, 1); }
    }
  };

  // =============== statuses & procs ===============
  C.addTox = function (e, n) {
    if (e.dead || e.boss && e.type === 'dredge' && e.phase < 0) return;
    e.tox = Math.min(G.B.toxMax, (e.tox || 0) + n); e.toxT = 4;
    if (G.B.toxSlow) e.slow = Math.max(e.slow || 0, 2);
  };
  C.mark = function (e, dur) { if (!e.dead) { e.mark = Math.max(e.mark || 0, dur || (G.B.sets.halcyon ? 12 : 6)); C.heat(4); } };
  C.near = function (x, z, r, skip) {
    var out = [];
    for (var i = 0; i < G.enemies.length; i++) { var e = G.enemies[i]; if (e.dead || e.spawnT > 0 || e.team !== 1 || e === skip) continue; var d = W.dist(x, z, e.x, e.z); if (d < r + e.r) out.push({ e: e, d: d }); }
    out.sort(function (a, b) { return a.d - b.d; });
    return out.map(function (o) { return o.e; });
  };
  C.bolt = function (ax, az, bx, bz, col) {
    var dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    F.spawn(K.BOLT, { x: (ax + bx) / 2, y: 1.2, z: (az + bz) / 2, sx: 0.5, sz: len / 2, rot: ang(dx, dz), col: col || 0x9fe8ff, dur: 0.18 });
  };
  // chain shock from a point, through up to n enemies
  C.chain = function (x, z, n, dmg, skip, extra) {
    var px = x, pz = z, done = [skip], hitAny = false;
    for (var i = 0; i < n; i++) {
      var c = C.near(px, pz, 7).filter(function (e) { return done.indexOf(e) < 0; })[0];
      if (!c) break;
      C.bolt(px, pz, c.x, c.z); done.push(c); hitAny = true;
      C.hitEnemy(c, dmg, { src: 'shock', kb: 1, sx: px, sz: pz, stun: 0.25 });
      if (extra) extra(c);
      px = c.x; pz = c.z;
    }
    if (hitAny) { F.flashLight(x, 1.5, z, [0.5, 0.85, 1.0], 1.4, 0.14, 7); W.audio.sfx('shock'); }
    return hitAny;
  };
  C.fusionCall = function (f, x, z) {
    var now = G.time; G.fusionSeen = G.fusionSeen || {};
    if (!G.fusionSeen[f.id] || now - G.fusionSeen[f.id] > 1.6) { F.text(x, 2.6, z, f.name, 'call fusion', 1.1); G.fusionSeen[f.id] = now; }
    G.run.stats.fusions++; C.heat(4);
  };
  C.applyTag = function (e) {
    var B = G.B, run = G.run, P = G.player;
    e.tag = 6; W.audio.sfx('tag');
    F.spawn(K.RING, { x: e.x, y: 0.1, z: e.z, s: 1.6, col: 0xffb347, dur: 0.25, p: [0.3, 0.12] });
    if (B.hijack) {
      if (e.type === 'turret' || e.type === 'leech' || e.type === 'patch') { e.team = 2; e.hijackT = B.hijackLong ? 999 : 12; e.attached = false; e.state = 'idle'; e.st = 0; M.setGlow(e.rig, 0.1, 0.5, 0.7); F.text(e.x, 2.4, e.z, 'Hijacked', 'call', 0.9); C.heat(8); W.audio.sfx('hijack'); }
      else if (!e.boss && !e.elite && e.hp < e.maxHp * 0.25) { C.hitEnemy(e, 999, { src: 'cull' }); return; }
    }
    if (B.sporeTag) { C.near(e.x, e.z, 3.5).forEach(function (o) { C.addTox(o, 3); }); F.spawn(K.STEAM, { x: e.x, y: 1.0, z: e.z, s: 1.5, bill: true, col: 0xb8e04a, col2: 0x4a7a1a, dur: 0.45, grow: 0.5, alpha: 0.85 }); C.heat(3); }
    if (B.markEvery || B.fusions.lattice) C.mark(e);
    if (run.deck === 'tether') { e.root = 2; }
    if (run.deck === 'echo' && !e._echo) { var o2 = C.near(e.x, e.z, 8, e)[0]; if (o2) { o2._echo = true; C.bolt(e.x, e.z, o2.x, o2.z, 0xffb347); C.applyTag(o2); o2._echo = false; } }
  };

  // =============== heat ===============
  C.heat = function (n) {
    var P = G.player; if (!P || P.redline || !P.alive) return;
    P.heat = Math.min(100, P.heat + n);
    if (P.heat >= 100) {
      P.redline = true; G.run.stats.redlines++;
      F.text(P.x, 3.0, P.z, 'Redline', 'call redline', 1.2); W.audio.sfx('redline');
      F.spawn(K.RING, { x: P.x, y: 0.1, z: P.z, s: 3, col: 0xff5a2a, dur: 0.3, p: [0.2, 0.16] });
      if (!G.hinted.redline) { G.hinted.redline = true; W.ui.toast('Redline: more damage, faster attacks, health drains. Press E to vent.'); }
    }
  };
  C.vent = function () {
    var P = G.player, B = G.B, h = P.heat;
    if (h < 12 || !P.alive) return false;
    var rad = (3.2 + h * 0.034) * (1 + B.ventPow * 0.6), dmg = (8 + h * 0.5) * (1 + B.ventPow), kb = 9 + h * 0.1;
    P.heat = 0; P.redline = false; P.slowT = 0.9; P.state = 'vent'; P.st = 0; P.charge = 0;
    G.run.stats.vents++;
    F.spawn(K.RING, { x: P.x, y: 0.4, z: P.z, s: rad, col: 0xf0f6f2, dur: 0.32, p: [0.15, 0.2] });
    F.steamBurst(P.x, P.z, 9 + Math.floor(h / 10), rad);
    F.addShake(0.25 + h * 0.003); F.flashLight(P.x, 1.5, P.z, [1, 1, 0.95], 1.2, 0.2, rad + 3);
    W.audio.sfx('vent', h / 100);
    C.near(P.x, P.z, rad).forEach(function (e) {
      C.hitEnemy(e, dmg, { kb: kb, sx: P.x, sz: P.z, src: 'vent', stun: B.ventStun || 0.2, heavy: h > 60 });
    });
    // leeches fall off, enemy shots are blown away
    G.enemies.forEach(function (e) { if (e.attached) { e.attached = false; e.stun = 1; e.kvx = (e.x - P.x) * 6 + 4; e.kvz = (e.z - P.z) * 6; } });
    G.shots.forEach(function (s) { if (s.team === 'p' && !s.lob && W.dist(s.x, s.z, P.x, P.z) < rad) s.life = 0; });
    if (B.blackLung) C.zone({ kind: 'tox', x: P.x, z: P.z, r: rad * 0.8, life: 4, stacks: Math.max(1, Math.round(h / 24)), team: 'e' });
    return true;
  };

  // =============== damage to enemies ===============
  C.hitEnemy = function (e, dmg, o) {
    o = o || {};
    if (e.dead || e.spawnT > 0 || e.invuln) return false;
    var P = G.player, B = G.B, run = G.run;
    var sx = o.sx === undefined ? P.x : o.sx, sz = o.sz === undefined ? P.z : o.sz;
    var dx = e.x - sx, dz = e.z - sz, dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    var crit = false;
    // riot shields
    if (e.shieldUp && o.src !== 'tox' && o.src !== 'zone') {
      var front = Math.abs(W.angDiff(e.facing, ang(-dx, -dz))) < 1.15;
      if (front) {
        if (o.heavy || B.breaker) {
          e.shieldHp -= dmg * (1 + B.armorDmg); F.hitSpark(e.x - dx * 0.6, 1.3, e.z - dz * 0.6, 0x9ff4ff, true); W.audio.sfx('clang');
          if (e.shieldHp <= 0) { e.shieldUp = false; e.stun = 1.4; F.text(e.x, 2.8, e.z, e.type === 'crab' ? 'Shell cracked' : 'Shield broken', 'call', 0.9); F.addShake(0.3); var shp = e.rig.parts.shell || e.rig.parts.armL; if (shp) shp.visible = false; }
          else { e.kvx += dx * 5; e.kvz += dz * 5; }
        } else {
          F.spawn(K.FLASH, { x: e.x - dx * 0.7, y: 1.3, z: e.z - dz * 0.7, s: 0.9, bill: true, col: 0x9ff4ff, dur: 0.08 }); W.audio.sfx('clang');
          if (!G.hinted.shield) { G.hinted.shield = true; W.ui.toast('Shield. Get behind it, or break it with a heavy hit.'); }
          F.text(e.x, 2.6, e.z, 'Blocked', 'small', 0.5);
        }
        return false;
      }
    }
    var CH = C.char(), sprung = false;
    if (e.guardT > 0 && o.src !== 'tox') {
      dmg *= 0.25; if (G.time - (e.guardSay || 0) > 0.8) { e.guardSay = G.time; F.text(e.x, 2.9, e.z, 'Shielded', 'small', 0.5); }
      if (!G.hinted.guard) { G.hinted.guard = true; W.ui.toast('An awning drone is shielding that one. Kill the drone first.'); }
    }
    if (o.direct) {
      var cc = B.crit + (P.redline ? B.redCrit : 0) + (run.modCrit || 0);
      if (Math.random() < cc || (B.opener && e.hp >= e.maxHp && !e.boss && !o.noProc)) { crit = true; dmg *= B.critMul; }
      if (P.redline) dmg *= 1.35 + (run.variantKey === 'hammer2' ? 0.4 : 0) + (CH.redDmg || 0);
      if (B.waterDmg && P.inWater) dmg *= 1 + B.waterDmg;
      if (CH.farDmg && W.dist(P.x, P.z, e.x, e.z) > 7) dmg *= 1 + CH.farDmg;
      if (run.variantKey === 'blades2' && P.heat < 30) dmg *= 1.35;
      if (!o.noProc) {
        if (P.dashBuff && B.dashHit) { P.dashBuff = false; dmg *= 1 + B.dashHit; sprung = true; C.heat(3); }
        if (P.hotShots > 0) { P.hotShots--; dmg *= 1.5; }
      }
      if (B.coldDmg && P.heat < 30) dmg *= 1 + B.coldDmg;
      if (B.stunDmg && e.stun > 0) dmg *= 1 + B.stunDmg;
    }
    if (o.src !== 'tox') {
      if (e.mark > 0) dmg *= 1 + B.markBonus;
      if (e.tag > 0) dmg *= 1.15 + (run.deck === 'bleed' ? 0.3 : 0);
      if (e.vuln) dmg *= e.vuln;
    }
    dmg = Math.max(1, Math.round(dmg));
    var kb = (o.kb || 0) * (o.direct || o.src === 'vent' ? B.kb * (run.modKb || 1) * (P.redline ? 1 + B.redKb : 1) : 1);
    if (sprung) kb = Math.max(kb, 8) * 1.8;
    if (o.pull) { dx = -dx; dz = -dz; }
    if (G.tutorial && o.direct) kb = Math.max(kb, 9) * 1.7;
    if (crit && B.fusions.deadweight) { kb = Math.max(kb, 9) * 2.4; e.wreck = 0.7; C.fusionCall(B.fusions.deadweight, e.x, e.z); }
    // armour soaks first
    if (e.armor > 0) {
      e.armor -= dmg * (1 + B.armorDmg); kb = 0;
      if (e.armor <= 0) { e.armor = 0; e.stun = Math.max(e.stun, 1.3); F.text(e.x, 3.0, e.z, 'Armour broken', 'call', 0.9); F.hitSpark(e.x, 1.6, e.z, 0xffd070, true); F.addShake(0.35); W.audio.sfx('armor'); if (e.state === 'windup') C.interrupt(e); }
      else W.audio.sfx('clang');
    } else e.hp -= dmg;
    e.flash = 1; e.lastHit = G.time;
    if (!o.quiet) {
      var big = o.big || crit;
      F.hitSpark(e.x - dx * e.r * 0.5, e.fly ? e.y + 0.2 : 1.2, e.z - dz * e.r * 0.5, o.src === 'tox' ? 0x8fe04a : (o.src === 'shock' ? 0x9fe8ff : (crit ? 0xff4058 : (e.armor > 0 ? 0xffd070 : 0xfff2c8))), big);
      F.text(e.x, e.fly ? e.y + 1 : 2.3, e.z, (crit ? '' : '') + dmg, crit ? 'crit' : (o.src === 'tox' ? 'tox' : (o.src === 'shock' ? 'shock' : 'dmg')), 0.55);
      if (o.direct || o.src === 'vent') { W.audio.sfx(o.sfx || 'hit', big ? 1 : 0.6); }
    }
    if (kb > 0 && !e.noKb) {
      e.kvx += dx * kb; e.kvz += dz * kb;
      if (!e.unstoppable && e.state === 'windup' && !e.elite) C.interrupt(e);
      if (!e.unstoppable) e.stagger = Math.max(e.stagger || 0, 0.18);
    }
    if (o.stun && !e.boss && !(e.armor > 0)) e.stun = Math.max(e.stun, o.stun);
    if (e.attached) { e.attached = false; }
    // procs from direct weapon hits
    if (o.direct && !o.noProc && e.team === 1) {
      P.hitCount++; if (B.count) C.heat(0.5 + B.count * 0.35);
      if (o.mark) C.mark(e);
      if (B.toxOnHit) { C.addTox(e, B.toxOnHit); C.heat(2); }
      var every = B.chainEvery || (run.variantKey === 'baton1' ? 3 : (run.variantKey === 'spear2' ? 2 : 0));
      if (run.variantKey === 'blades1' && P.hitCount % 2 === 0) C.addTox(e, 1);
      if (run.mods.indexOf('tracer') >= 0 && P.hitCount % 5 === 0) C.mark(e);
      if (crit && B.critMark) C.mark(e);
      if (every && P.hitCount % every === 0) { if (C.chain(e.x, e.z, B.chainTargets, B.chainDmg, e)) C.heat(8); }
      if (B.markEvery && P.hitCount % B.markEvery === 0) { C.mark(e); F.text(e.x, 2.9, e.z, 'Marked', 'small', 0.5); }
      if (B.fusions.plague && P.hitCount % 4 === 0) { if (C.chain(e.x, e.z, 2, 8, e, function (t) { C.addTox(t, 2); })) C.fusionCall(B.fusions.plague, e.x, e.z); }
      if (crit) {
        if (B.fusions.bloom) { C.near(e.x, e.z, 2.8).forEach(function (t) { C.addTox(t, 2); if (t !== e) C.hitEnemy(t, 12, { src: 'tox', sx: e.x, sz: e.z }); }); F.spawn(K.STEAM, { x: e.x, y: 1.0, z: e.z, s: 1.5, bill: true, col: 0xb8e04a, col2: 0x4a7a1a, dur: 0.4, grow: 0.6, alpha: 0.85 }); e.hp -= 8; C.fusionCall(B.fusions.bloom, e.x, e.z); }
        if (B.dawn) { P.heat = Math.max(0, P.heat - 6); P.dashCd = 0; if (P.dashes < P.maxDashes) P.dashes++; }
      }
      if (B.cull && !e.boss && e.hp > 0 && e.hp < e.maxHp * B.cull && e.armor <= 0) { e.hp = 0; F.text(e.x, 2.9, e.z, 'Culled', 'call', 0.7); C.chain(e.x, e.z, 2, 8, e); C.heat(3); }
      if (run.variantKey === 'hammer2') C.heat(6);
      if (o.sub !== undefined) { /* weapon-specific hooks live with the weapon */ }
    }
    if (e.onHurt) e.onHurt(e, dmg, o);
    if (e.hp <= 0) { if (kb > 0 && !e.fixed && !e.boss) { e.kvx += dx * kb * 0.6; e.kvz += dz * kb * 0.6; } C.kill(e, o); }
    return true;
  };
  C.interrupt = function (e) {
    e.state = 'recover'; e.st = 0; e.recT = 0.45;
    G.tells.forEach(function (t) { if (t.src === e && !t.fired) t.cancel = true; });
  };
  C.kill = function (e, o) {
    if (e.dead) return;
    var P = G.player, B = G.B, run = G.run;
    if (e.boss && e.onDeath && e.onDeath(e) === false) return; // boss phases intercept
    e.dead = true; e.deadT = 0; e.hp = 0; e.attached = false;
    G.tells.forEach(function (t) { if (t.src === e && !t.fired && !t.keep) t.cancel = true; });
    F.hitSpark(e.x, 1.2, e.z, 0x14161c, true);
    F.spawn(K.SPARK, { x: e.x, y: 0.08, z: e.z, s: 1.6 + e.r, col: 0x0c0e14, dur: 0.5, rot: Math.random() * 6 });
    W.audio.sfx('kill');
    if (e.team === 1 && !e.summon) {
      run.stats.kills++;
      var sc = ((e.scrip || 2) + (run.mods.indexOf('magnet') >= 0 ? 1 : 0)) * (1 + B.scripMul), mem = e.mem || 1;
      if (e.elite) { sc += 8 + (B.eliteMore ? 10 : 0); mem += 4 + (B.eliteMore ? 10 : 0); }
      if (B.lifesteal && P.alive) run.hp = Math.min(run.maxHp, run.hp + B.lifesteal);
      if (B.killCool) { if (!P.redline) P.heat = Math.max(0, P.heat - B.killCool); P.dashCd -= 0.3; }
      if (run.mods.indexOf('sprung') >= 0) P.dashCd -= 0.4;
      if (e.tox > 0 && B.toxSpread) C.near(e.x, e.z, 5, e).slice(0, 2).forEach(function (t) { C.bolt(e.x, e.z, t.x, t.z, 0x8fe04a); C.addTox(t, e.tox); });
      if (e.tag > 0 && run.deck === 'burn') { F.spawn(K.RING, { x: e.x, y: 0.1, z: e.z, s: 3.2, col: 0xffb347, dur: 0.28, p: [0.15, 0.2] }); F.addShake(0.25); W.audio.sfx('boom', 0.6); C.near(e.x, e.z, 3.2, e).forEach(function (t) { C.hitEnemy(t, 18, { src: 'shock', kb: 8, sx: e.x, sz: e.z }); }); }
      run.scrip += sc; G.gainMemory(mem);
      F.text(e.x, 1.6, e.z, '+' + sc, 'scrip', 0.7);
    }
    if (e.tox > 0 && B.drip && P.heat < 40 && P.alive) { G.heal(B.drip, true); }
    if ((e.mark > 0 || e.tag > 0) && B.fusions.lattice && e.team === 1) {
      var ts = C.near(e.x, e.z, 9, e).slice(0, 3);
      ts.forEach(function (t) { C.bolt(e.x, e.z, t.x, t.z, 0xff8aa0); C.hitEnemy(t, 15, { src: 'shock', sx: e.x, sz: e.z, stun: 0.3 }); C.mark(t); });
      if (ts.length) { C.fusionCall(B.fusions.lattice, e.x, e.z); W.audio.sfx('shock'); }
    }
    if (e.tag > 0 && run.deck === 'siphon') { P.heat = Math.max(0, P.heat - 25); run.scrip += 4; }
    if (e.trait === 'volatile') C.tell({ shape: 'circle', x: e.x, z: e.z, r: 3, delay: 0.8, dmg: 16, team: 'a', col: 0xffb347, keep: true, onFire: function (t) { F.steamBurst(t.x, t.z, 8, 3, 0xffd9a0); F.addShake(0.3); W.audio.sfx('boom'); } });
    if (e.onKilled) e.onKilled(e);
  };

  // =============== damage to the player ===============
  C.hurtPlayer = function (dmg, src, o) {
    o = o || {}; var P = G.player, B = G.B, run = G.run;
    if (!P.alive || G.cinematic > 0) return false;
    if (P.iframe > 0 || P.state === 'dash') {
      if (!o.dot && P.state === 'dash' && G.time - P.lastPerfect > 0.5) {
        P.lastPerfect = G.time; run.stats.dodges++;
        F.text(P.x, 2.6, P.z, 'Dodge', 'small', 0.4);
        if (B.stillframe) { G.slowmo = 1.4; C.heat(8); F.text(P.x, 3.0, P.z, 'Stillframe', 'call', 0.9); W.audio.sfx('still'); }
        if (run.rig === 'ghost' && !P.redline) P.heat = Math.max(0, P.heat - 8);
        if (B.dodgeBlast) { var bx0 = P.x - P.dashDx * 1.5, bz0 = P.z - P.dashDz * 1.5; F.spawn(K.RING, { x: bx0, y: 0.1, z: bz0, s: 3.2, col: 0xff4058, dur: 0.26, p: [0.15, 0.2] }); C.near(bx0, bz0, 3.2).forEach(function (e2) { C.hitEnemy(e2, B.dodgeBlast, { src: 'shock', kb: 7, sx: bx0, sz: bz0 }); }); C.heat(4); }
      }
      return false;
    }
    if (P.hurtT > 0 && !o.dot) return false;
    var CHh = C.char();
    dmg = Math.max(1, Math.round(dmg * Math.max(0.3, B.dmgTaken + (CHh.dmgTaken || 0)) * (G.dmgScale || 1)));
    if (CHh.hurtHeat && !o.dot) C.heat(CHh.hurtHeat);
    run.hp -= dmg; run.stats.dmgTaken += dmg;
    P.flash = 1; if (!o.dot) { P.hurtT = 0.5; G.hitstop = Math.max(G.hitstop, 0.07); F.addShake(0.32); }
    W.gfx.finalMat.uniforms.uPulse.value = 0.55; W.gfx.finalMat.uniforms.uPulseCol.value.set(0.9, 0.12, 0.08);
    F.text(P.x, 2.6, P.z, '-' + dmg, 'hurt', 0.6); W.audio.sfx('hurt');
    F.hitSpark(P.x, 1.2, P.z, 0xff3a20, false);
    if (src && src.x !== undefined && o.kb) { var dx = P.x - src.x, dz = P.z - src.z, l = Math.hypot(dx, dz) || 1; P.kvx += dx / l * o.kb; P.kvz += dz / l * o.kb; }
    if (P.state === 'charge') { P.state = 'idle'; P.charge = 0; }
    if (B.fusions.caustic && src && src.hp !== undefined && !src.dead && !src.boss) { C.addTox(src, 3); C.hitEnemy(src, 4, { kb: 12, src: 'tox' }); C.fusionCall(B.fusions.caustic, P.x, P.z); }
    else if (B.fusions.caustic && src && src.boss) { C.addTox(src, 3); C.fusionCall(B.fusions.caustic, P.x, P.z); }
    if (run.hp <= 0) {
      if (run.defy > 0) {
        run.defy--; run.hp = Math.round(run.maxHp * 0.4); P.iframe = 1.5; P.heat = 60;
        F.text(P.x, 3.2, P.z, 'Dead switch', 'call redline', 1.4); C.vent(); G.slowmo = 1.0; W.audio.sfx('defy');
      } else { run.hp = 0; G.onDeath(); }
    }
    return true;
  };

  // =============== the player ===============
  C.char = function () { return D.CHARS[(G.run && G.run.char) || 'kestrel'] || D.CHARS.kestrel; };
  C.maxDashes = function () { var run = G.run; return C.char().dashes + (W.save.board.dash ? 1 : 0) + (run.rig === 'twin' ? 1 : 0) + (G.B ? G.B.extraDash : 0); };
  C.makePlayer = function (x, z) {
    var run = G.run, CH = C.char(), rig = M.make(CH.model);
    var wd = D.WEAPONS[run.weapon];
    var w = M.makeWeapon(wd.model, wd.glow, rig.mats); w.position.set(0, -0.7, 0.04); rig.parts.armR.add(w); rig.parts.weapon = w;
    if (wd.dual) { var w2 = M.makeWeapon(wd.model, wd.glow, rig.mats); w2.position.set(0, -0.7, 0.04); rig.parts.armL.add(w2); rig.parts.weapon2 = w2; }
    W.gfx.scene.add(rig.root);
    var P = { x: x, z: z, y: 0, r: 0.5, facing: Math.PI, state: 'idle', st: 0, combo: 0, buffer: 0, bufferSp: 0, dashCd: 0, maxDashes: C.maxDashes(), hotShots: 0, dashBuff: false, shotN: 0, tagMax: CH.qCd, dashDx: 0, dashDz: 1, iframe: 0, tagCd: 0, activeCd: 0, slowT: 0, hurtT: 0, flash: 0, charge: 0, phase: 0, heat: run.heat || 0, redline: false, alive: true, kvx: 0, kvz: 0, hitCount: 0, lastPerfect: -9, rig: rig, speed: 0, fireCd: 0, atk: null, struck: false, inWater: false, moveAng: 0, lastAtk: -9 };
    P.dashes = P.maxDashes;
    rig.root.position.set(x, 0, z);
    C.refreshGlow(P);
    return P;
  };
  var nodeGeo = {}, nodeMat = null;
  var NODE_AT = { head: ['head', 0, 0.2, -0.16], armL: ['armL', -0.1, -0.3, 0], armR: ['armR', 0.1, -0.3, 0], heart: ['torso', 0.07, 0.42, 0.2], spine: ['torso', 0, 0.36, -0.22], legs: ['legR', 0.1, -0.35, 0.02] };
  // each installed implant shows as a lit node of its house colour on the matching part of Kestrel's body
  C.bodyNodes = function (P) {
    if (!nodeMat) nodeMat = W.gfx.paintMat({ rim: 0 });
    (P.nodes || []).forEach(function (n) { n.parent.remove(n); }); P.nodes = [];
    var map = D.cellMap(9), count = {};
    G.run.implants.forEach(function (it) {
      if (it.torn) return; var f = D.IMPLANTS[it.id].f, zone = map[it.cells[0][0] + ',' + it.cells[0][1]].zone, at = NODE_AT[zone], k = count[zone] = (count[zone] || 0) + 1;
      if (!nodeGeo[f]) { var b = new M.Bld(); b.add(M.sph(0.075, 8, 6), {}, FCOL[f], 2, { emis: 1 }); b.add(M.tor(0.1, 0.022), { r: [Math.PI / 2, 0, 0] }, 0x14181c, 1); nodeGeo[f] = b.build(); }
      var m = new THREE.Mesh(nodeGeo[f], nodeMat); m.position.set(at[1] + (k - 1) * 0.12 * (at[1] < 0 ? -1 : 1), at[2] - (k - 1) * 0.16, at[3]); P.rig.parts[at[0]].add(m); P.nodes.push(m);
    });
  };
  C.refreshGlow = function (P) {
    var B = G.B, c = new THREE.Color(0, 0, 0), n = 0, t = new THREE.Color();
    for (var f in B.factions) { t.set(FCOL[f]); c.add(t); n++; }
    if (n) c.multiplyScalar(0.55 / n);
    P.baseGlow = [c.r, c.g, c.b]; C.bodyNodes(P);
  };
  // every melee frame is a list of hits: wind-up, held pose, recovery, damage and knockback multipliers, pose id
  function atkList(run) {
    var w = run.weapon, v = run.variantKey, m, st;
    if (w === 'baton') {
      if (v === 'baton2') return [{ wind: 0.14, hold: 0.1, rec: 0.2, dmg: 1.6, kb: 10, dir: 1, lunge: 1.3, sub: 0, big: true }, { wind: 0.16, hold: 0.14, rec: 0.28, dmg: 2.1, kb: 16, dir: 1, lunge: 1.8, sub: 2, big: true, last: true }];
      m = v === 'baton1' ? 0.9 : 1;
      return [{ wind: 0.055, hold: 0.07, rec: 0.12, dmg: 1.0 * m, kb: 5, dir: 1, lunge: 1.1, sub: 0 }, { wind: 0.055, hold: 0.07, rec: 0.12, dmg: 1.0 * m, kb: 5, dir: -1, lunge: 1.1, sub: 1 }, { wind: 0.09, hold: 0.13, rec: 0.24, dmg: 1.6 * m, kb: 13, dir: 1, lunge: 1.9, sub: 2, big: true, last: true }];
    }
    if (w === 'whip') {
      m = v === 'whip2' ? 0.85 : 1; st = v === 'whip2' ? 0.3 : 0;
      return [{ wind: 0.12, hold: 0.1, rec: 0.16, dmg: 1.0 * m, kb: 7, dir: 1, lunge: 0.4, sub: 0, pull: true, stun: st }, { wind: 0.12, hold: 0.1, rec: 0.16, dmg: 1.0 * m, kb: 7, dir: -1, lunge: 0.4, sub: 1, pull: true, stun: st }, { wind: 0.17, hold: 0.14, rec: 0.3, dmg: 1.6 * m, kb: 11, dir: 1, lunge: 0.6, sub: 0, big: true, last: true, pull: true, stun: st, mark: v === 'whip1' }];
    }
    if (w === 'blades') return [{ wind: 0.04, hold: 0.05, rec: 0.09, dmg: 1.0, kb: 3, dir: 1, lunge: 1.3, sub: 0 }, { wind: 0.04, hold: 0.05, rec: 0.09, dmg: 1.0, kb: 3, dir: -1, lunge: 1.3, sub: 1 }, { wind: 0.04, hold: 0.05, rec: 0.09, dmg: 1.0, kb: 3, dir: 1, lunge: 1.3, sub: 0 }, { wind: 0.08, hold: 0.12, rec: 0.22, dmg: 1.7, kb: 10, dir: -1, lunge: 1.8, sub: 2, big: true, last: true }];
    if (w === 'spear') { var hk = v === 'spear1'; return [{ wind: 0.13, hold: 0.1, rec: 0.18, dmg: 1.0, kb: 8, dir: 1, lunge: 1.6, sub: 4, thrust: true, pull: hk }, { wind: 0.13, hold: 0.1, rec: 0.18, dmg: 1.0, kb: 8, dir: 1, lunge: 1.6, sub: 4, thrust: true, pull: hk }, { wind: 0.2, hold: 0.14, rec: 0.3, dmg: 1.7, kb: 15, dir: 1, lunge: 2.4, sub: 4, thrust: true, big: true, heavy: true, last: true }]; }
    if (w === 'fists') return [{ wind: 0.1, hold: 0.09, rec: 0.16, dmg: 1.0, kb: 12, dir: 1, lunge: 1.5, sub: 0, big: true, heavy: true }, { wind: 0.1, hold: 0.09, rec: 0.16, dmg: 1.0, kb: 12, dir: -1, lunge: 1.5, sub: 1, big: true, heavy: true }, { wind: 0.2, hold: 0.15, rec: 0.32, dmg: 1.6, kb: 24, dir: 1, lunge: 2.0, sub: 5, big: true, heavy: true, last: true, ring: true }];
    return [{ wind: 0.24, hold: 0.14, rec: 0.24, dmg: 1.0, kb: 17, dir: 1, lunge: 1.0, sub: 0, big: true, heavy: true }, { wind: 0.28, hold: 0.17, rec: 0.3, dmg: 1.35, kb: 22, dir: -1, lunge: 1.4, sub: 5, big: true, heavy: true, last: true, ring: true }];
  }
  C.weaponDmg = function () { var run = G.run; return D.WEAPONS[run.weapon].dmg * (1 + run.wtier * 0.1) * (run.mods.indexOf('weighted') >= 0 ? 1.2 : 1) * (1 + G.B.dmgMul); };
  C.atkSpeed = function () { var run = G.run, P = G.player; return (P.redline ? 1.25 * (run.mods.indexOf('livegrip') >= 0 ? 1.25 : 1) : 1) * (run.mods.indexOf('quick') >= 0 ? 1.18 : 1); };
  C.reach = function () { var run = G.run; return D.WEAPONS[run.weapon].range * (run.mods.indexOf('reach') >= 0 ? 1.2 : 1); };
  function specialHeat(n) { var run = G.run; C.heat((run.mods.indexOf('sink') >= 0 ? n * 0.5 : n) + (run.mods.indexOf('hotshoe') >= 0 ? 5 : 0)); }
  function specialMul() { return G.run.mods.indexOf('hotshoe') >= 0 ? 1.4 : 1; }

  C.meleeArc = function (P, range, half, dmg, kb, o) {
    var hits = 0, list = G.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i]; if (e.dead || e.spawnT > 0 || e.team === 2) continue;
      var dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
      if (d > range + e.r) continue;
      if (d > 1.1 + e.r && Math.abs(W.angDiff(P.facing, ang(dx, dz))) > half + Math.atan2(e.r, d)) continue;
      if (C.hitEnemy(e, dmg, { kb: kb, direct: true, big: o.big, heavy: o.heavy, sub: o.sub, pull: o.pull, stun: o.stun, mark: o.mark })) hits++;
    }
    return hits;
  };
  // a straight thrust: everything on the line in front
  function thrustLine(P, range, dmg, kb, o) {
    var hits = 0, fx = Math.sin(P.facing), fz = Math.cos(P.facing);
    G.enemies.forEach(function (e) {
      if (e.dead || e.spawnT > 0 || e.team === 2) return;
      var dx = e.x - P.x, dz = e.z - P.z, al = dx * fx + dz * fz, pr = Math.abs(dx * fz - dz * fx);
      if ((al > -0.3 && al < range + e.r && pr < 0.75 + e.r) || Math.hypot(dx, dz) < 1.0 + e.r) { if (C.hitEnemy(e, dmg, { kb: kb, direct: true, big: o.big, heavy: o.heavy, pull: o.pull })) hits++; }
    });
    return hits;
  }
  // a burst at a point: rivets, heavy shells
  function blast(x, z, r, dmg, o) {
    o = o || {};
    F.spawn(K.RING, { x: x, y: 0.12, z: z, s: r, col: o.col || 0xffb347, dur: 0.26, p: [0.16, 0.2] });
    F.spawn(K.SPARK, { x: x, y: 0.9, z: z, s: r * 0.8, bill: true, col: 0xfff2c8, dur: 0.14 });
    F.steamBurst(x, z, 3, r * 0.5, 0xffd9a0); F.addShake(o.heavy ? 0.4 : 0.16); F.flashLight(x, 1.2, z, [1, 0.8, 0.45], 1.4, 0.14, r + 4); W.audio.sfx('boom', o.heavy ? 1 : 0.45);
    var first = true;
    C.near(x, z, r).forEach(function (e) { C.hitEnemy(e, dmg, { direct: true, noProc: !first, kb: o.pull ? 10 : 8, pull: o.pull, big: true, heavy: o.heavy, stun: o.stun, sx: x, sz: z }); first = false; });
  }
  // a ring slam around the player: baton special, gauntlet quake
  function slam(P, rad, dmg, stun, kb, col, bolts) {
    var fx = Math.sin(P.facing), fz = Math.cos(P.facing);
    P.state = 'attack'; P.st = 0.2; P.atk = { wind: 0, hold: 0.16, rec: 0.25, sub: 2 }; P.atkK = 1; P.struck = true; P.hold = true;
    F.spawn(K.RING, { x: P.x, y: 0.1, z: P.z, s: rad, col: col, dur: 0.3, p: [0.12, 0.2] });
    F.spawn(K.SPARK, { x: P.x + fx, y: 0.1, z: P.z + fz, s: rad * 0.7, col: 0xffffff, dur: 0.2 });
    if (bolts) for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; C.bolt(P.x, P.z, P.x + Math.sin(a) * rad, P.z + Math.cos(a) * rad, col); }
    var n = 0; C.near(P.x, P.z, rad).forEach(function (e) { if (C.hitEnemy(e, dmg, { kb: kb, direct: true, big: true, heavy: true, stun: stun, sfx: 'slam' })) n++; });
    G.hitstop = Math.max(G.hitstop, n ? 0.08 : 0.03); F.addShake(0.4); F.flashLight(P.x, 1.5, P.z, [0.6, 0.95, 1.0], 1.8, 0.2, rad + 4);
    W.audio.sfx('slam');
  }
  // a piercing line from the player: rail shot, thrown spear
  function rail(P, len, dmg, col, o) {
    o = o || {}; var fx = Math.sin(P.facing), fz = Math.cos(P.facing);
    F.spawn(K.BEAM, { x: P.x + fx * len / 2, y: 1.15, z: P.z + fz * len / 2, sx: o.wide || 0.5, sz: len / 2, rot: P.facing, col: col, dur: 0.22, p: [0.8, 0, 0, 0] });
    F.spawn(K.FLASH, { x: P.x + fx * 1.4, y: 1.2, z: P.z + fz * 1.4, s: 1.6, bill: true, col: col, dur: 0.09 });
    var hit = 0; G.enemies.forEach(function (e) { if (e.dead || e.spawnT > 0 || e.team === 2) return; var dx = e.x - P.x, dz = e.z - P.z, al = dx * fx + dz * fz, pr = Math.abs(dx * fz - dz * fx); if (al > 0 && al < len && pr < 0.6 + e.r) { if (C.hitEnemy(e, dmg, { kb: 9, direct: true, big: true, heavy: true, sfx: 'rail', stun: o.stun })) hit++; } });
    G.hitstop = Math.max(G.hitstop, hit ? 0.07 : 0); F.addShake(0.3); P.kvx -= fx * 5; P.kvz -= fz * 5; F.flashLight(P.x + fx * 2, 1.3, P.z + fz * 2, [1, 0.9, 0.6], 1.6, 0.14, 9);
    W.audio.sfx('rail'); P.state = 'attack'; P.st = 0.2; P.atk = { wind: 0, hold: 0.12, rec: 0.2, sub: o.sub === undefined ? 3 : o.sub }; P.atkK = 1; P.struck = true;
  }

  function startAttack(P) {
    var run = G.run, WK = D.WEAPONS[run.weapon];
    if (WK.kind === 'ranged') return;
    var list = atkList(run), n = list.length;
    if (G.time - P.lastAtk > 0.75) P.combo = 0;
    var a = list[P.combo % n];
    P.atk = a; P.state = 'attack'; P.st = 0; P.struck = false; P.buffer = 0;
    P.atkK = 1 / C.atkSpeed();
    P.combo = (P.combo + 1) % n; P.lastAtk = G.time;
    W.audio.sfx(WK.heavy ? 'swingHeavy' : 'swing', a.big ? 1 : 0.6);
  }
  function strike(P) {
    var run = G.run, WK = D.WEAPONS[run.weapon], a = P.atk, range = C.reach(), half = WK.arc + (a.sub === 2 ? -0.35 : 0);
    var col = WK.glow, fx = Math.sin(P.facing), fz = Math.cos(P.facing);
    var dmg = C.weaponDmg() * a.dmg * (a.last && run.mods.indexOf('counter') >= 0 ? 1.35 : 1), hits;
    if (a.thrust) {
      F.spawn(K.BEAM, { x: P.x + fx * (range / 2 + 0.4), y: 1.1, z: P.z + fz * (range / 2 + 0.4), sx: a.big ? 0.5 : 0.32, sz: range / 2, rot: P.facing, col: col, dur: 0.15, p: [0.8, 0, 0, 0] });
      hits = thrustLine(P, range, dmg, a.kb, a);
    } else {
      F.spawn(K.SLASH, { x: P.x, y: 1.05, z: P.z, s: range + 0.25, rot: P.facing, col: col, dur: 0.17, p: [half, a.dir, a.big ? 0.42 : 0.3, 0] });
      hits = C.meleeArc(P, range, half, dmg, a.kb, a);
    }
    if (hits) { G.hitstop = Math.max(G.hitstop, a.big ? 0.075 : 0.045); if (a.big) F.addShake(WK.heavy ? 0.42 : 0.25); P.hold = true; if (run.weapon === 'blades') C.heat(1); }
    if (a.ring) { F.spawn(K.RING, { x: P.x + Math.sin(P.facing) * 2, y: 0.1, z: P.z + Math.cos(P.facing) * 2, s: 2.6, col: col, dur: 0.25, p: [0.2, 0.14] }); F.addShake(0.3); }
    F.flashLight(P.x + Math.sin(P.facing) * 1.5, 1.3, P.z + Math.cos(P.facing) * 1.5, [0.6, 0.9, 1.0], 0.7, 0.09, 6);
  }
  function startDash(P, act) {
    var run = G.run, B = G.B, dx = act.mx, dz = act.mz;
    if (!dx && !dz) { dx = Math.sin(P.facing); dz = Math.cos(P.facing); }
    var l = Math.hypot(dx, dz); dx /= l; dz /= l;
    var CH = C.char();
    P.state = 'dash'; P.st = 0; P.dashDx = dx; P.dashDz = dz; P.dashes--; P.dashCd = CH.dashCd; P.iframe = CH.iframe * (run.rig === 'ghost' ? 1.5 : 1); P.charge = 0; P.atk = null;
    P.dashLen = CH.dashLen * (run.rig === 'skip' ? 1.35 : 1); P.dashDur = CH.dashDur; P.dashHit = [];
    if (P.snare) { P.snare = 0; P.slowT = 0; F.text(P.x, 2.6, P.z, 'Torn free', 'small', 0.5); }
    if (run.rig === 'blast') { F.spawn(K.RING, { x: P.x, y: 0.1, z: P.z, s: 3.0, col: 0xdfeee8, dur: 0.22, p: [0.2, 0.15] }); C.near(P.x, P.z, 3).forEach(function (e) { C.hitEnemy(e, 6, { kb: 15, src: 'vent', sx: P.x, sz: P.z }); }); }
    P.moveAng = ang(dx, dz);
    F.spawn(K.TRAIL, { x: P.x + dx * 1.5, y: 0.9, z: P.z + dz * 1.5, sx: 0.75, sz: 2.6, rot: ang(-dx, -dz) + Math.PI, col: 0x3a4c5c, col2: 0x9fe8e0, dur: 0.22 });
    F.spawn(K.RING, { x: P.x, y: 0.08, z: P.z, s: 1.3, col: 0xdfeee8, dur: 0.2, p: [0.3, 0.1] });
    W.audio.sfx('dash');
    if (run.rig === 'cold') P.heat = Math.max(0, P.heat - 12);
    G.enemies.forEach(function (e) { if (e.attached) { e.attached = false; e.stun = 0.8; e.kvx = -dx * 8; e.kvz = -dz * 8; } });
    if (B.slowField) { C.zone({ kind: 'slow', x: P.x, z: P.z, r: 2.6, life: 3, team: 'e' }); C.heat(4); }
  }
  function endDash(P) {
    var B = G.B, CH = C.char();
    P.state = 'idle'; P.st = 0;
    if (B.dashHit) P.dashBuff = true;
    if (CH.dash === 'roll') { P.hotShots = 5; F.spawn(K.RING, { x: P.x, y: 0.1, z: P.z, s: 1.1, col: 0xffd070, dur: 0.2, p: [0.3, 0.1] }); }
    if (B.dashShock) {
      F.spawn(K.RING, { x: P.x, y: 0.1, z: P.z, s: 3.0, col: 0xf2b824, dur: 0.24, p: [0.2, 0.15] });
      C.near(P.x, P.z, 2.9).forEach(function (e) { C.hitEnemy(e, 8, { kb: 9, src: 'vent', sx: P.x, sz: P.z }); });
      C.heat(5); W.audio.sfx('thud');
    }
  }
  function doSpecialRelease(P) {
    var run = G.run, k = W.sat(P.charge / P.chargeMax), col = D.WEAPONS[run.weapon].glow, fx = Math.sin(P.facing), fz = Math.cos(P.facing);
    P.charge = 0;
    var sm = specialMul() * (1 + run.wtier * 0.1) * (1 + G.B.dmgMul), wk = run.weapon, i, a;
    if (wk === 'baton') { slam(P, 3.0 + k * 1.6, (20 + k * 22) * sm, 0.5 + k * 0.5, 10 + k * 6, col, true); specialHeat(14); }
    else if (wk === 'fists') { slam(P, 3.6 + k * 1.4, (26 + k * 24) * sm, 0.8 + k * 0.4, 15 + k * 6, col, false); F.addShake(0.3); specialHeat(13); }
    else if (wk === 'carbine') { rail(P, 24, (34 + k * 16) * sm, col); specialHeat(10); }
    else if (wk === 'spear') { rail(P, 22, (30 + k * 18) * sm, col, { stun: 0.4, sub: 4, wide: 0.6 }); specialHeat(11); }
    else if (wk === 'whip') { // spin: everything in reach is lashed and reeled in
      var wr = C.reach() + 0.6;
      P.state = 'attack'; P.st = 0.2; P.atk = { wind: 0, hold: 0.18, rec: 0.25, sub: 0 }; P.atkK = 1; P.struck = true; P.hold = true;
      F.spawn(K.SLASH, { x: P.x, y: 1.05, z: P.z, s: wr, rot: P.facing, col: col, dur: 0.22, p: [3.1, 1, 0.3, 0] });
      F.spawn(K.RING, { x: P.x, y: 0.1, z: P.z, s: wr, col: col, dur: 0.28, p: [0.1, 0.16] });
      var wn = 0; C.near(P.x, P.z, wr).forEach(function (e) { if (C.hitEnemy(e, (16 + k * 14) * sm, { kb: 13, pull: true, direct: true, big: true, stun: 0.3, mark: run.variantKey === 'whip1' })) wn++; });
      G.hitstop = Math.max(G.hitstop, wn ? 0.07 : 0.02); F.addShake(0.3); W.audio.sfx('swingHeavy', 1); specialHeat(12);
    } else if (wk === 'blades') { // a slashing dash through the line
      P.state = 'slash'; P.st = 0; P.dashDx = fx; P.dashDz = fz; P.iframe = 0.3; P.dashHit = []; P.slashDmg = (22 + k * 12) * sm; W.audio.sfx('dash'); W.audio.sfx('swing', 1);
      F.spawn(K.TRAIL, { x: P.x + fx * 2.5, y: 0.9, z: P.z + fz * 2.5, sx: 0.8, sz: 3.6, rot: P.facing, col: 0x3a4c5c, col2: col, dur: 0.26 });
      specialHeat(9);
    } else if (wk === 'rivet') { // one heavy shell, wide blast
      var hd = (38 + k * 20) * sm;
      C.shoot({ x: P.x + fx * 1.5, z: P.z + fz * 1.5, vx: fx * 24, vz: fz * 24, dmg: 1, team: 'e', life: 0.7, r: 0.5, col: 0xffb347, wid: 0.3, len: 0.7, onEnd: function (s) { blast(s.x, s.z, 4.2, hd, { heavy: true, stun: 0.5, pull: run.variantKey === 'rivet2' }); } });
      F.spawn(K.FLASH, { x: P.x + fx * 1.4, y: 1.2, z: P.z + fz * 1.4, s: 1.4, bill: true, col: col, dur: 0.09 }); P.kvx -= fx * 7; P.kvz -= fz * 7; F.addShake(0.3); W.audio.sfx('rail');
      P.state = 'attack'; P.st = 0.2; P.atk = { wind: 0, hold: 0.12, rec: 0.25, sub: 3 }; P.atkK = 1; P.struck = true; specialHeat(12);
    } else if (wk === 'pistols') { // fan the hammers
      for (i = -4; i <= 4; i++) { a = P.facing + i * 0.11; C.shoot({ x: P.x + fx * 1.2, z: P.z + fz * 1.2, vx: Math.sin(a) * 34, vz: Math.cos(a) * 34, dmg: C.weaponDmg() * (1.1 + k * 0.5) * specialMul(), team: 'e', direct: true, kb: 5, life: 0.36, pierce: 1, col: 0xffd070 }); }
      F.spawn(K.FLASH, { x: P.x + fx * 1.3, y: 1.2, z: P.z + fz * 1.3, s: 1.5, bill: true, col: col, dur: 0.08 }); F.flashLight(P.x + fx * 2, 1.3, P.z + fz * 2, [1, 0.85, 0.5], 1.5, 0.12, 8); F.addShake(0.25); P.kvx -= fx * 4; P.kvz -= fz * 4;
      W.audio.sfx('rail', 0.7); W.audio.sfx('needle'); P.state = 'attack'; P.st = 0.2; P.atk = { wind: 0, hold: 0.12, rec: 0.18, sub: 3 }; P.atkK = 1; P.struck = true; specialHeat(10);
    } else {
      if (run.variantKey === 'hammer1') { // pile driver: leap to the aim point and slam
        var tx = P.x + fx * Math.min(7, P.aimDist || 6), tz = P.z + fz * Math.min(7, P.aimDist || 6);
        P.state = 'leap'; P.st = 0; P.leapX0 = P.x; P.leapZ0 = P.z; P.leapX = tx; P.leapZ = tz; P.iframe = 0.4;
      } else { P.state = 'breach'; P.st = 0; P.breachDx = fx; P.breachDz = fz; P.grab = null; P.iframe = 0.15; W.audio.sfx('swingHeavy', 1); }
      specialHeat(12);
    }
  }
  function fireCarbine(P) {
    var run = G.run, v = run.variantKey, fx = Math.sin(P.facing), fz = Math.cos(P.facing), dmg = C.weaponDmg();
    var mx = P.x + fx * 1.5, mz = P.z + fz * 1.5;
    P.shotN++; if (run.mods.indexOf('counter') >= 0 && P.shotN % 5 === 0) dmg *= 1.35;
    if (run.weapon === 'pistols') { // alternate hands
      var side = P.shotN % 2 ? 0.28 : -0.28; mx = P.x + fx * 1.3 + fz * side; mz = P.z + fz * 1.3 - fx * side;
      C.shoot({ x: mx, z: mz, vx: Math.sin(P.facing + (Math.random() - 0.5) * 0.05) * 36, vz: Math.cos(P.facing + (Math.random() - 0.5) * 0.05) * 36, dmg: dmg, team: 'e', direct: true, kb: P.hotShots > 0 ? 6 : 2.5, life: C.reach() / 36, pierce: P.hotShots > 0 ? 1 : 0, col: P.hotShots > 0 ? 0xff9a4a : 0xffd070, wid: P.hotShots > 0 ? 0.2 : 0.12 });
      P.fireCd = 0.17 / C.atkSpeed();
      F.spawn(K.FLASH, { x: mx, y: 1.2, z: mz, s: 0.7, bill: true, col: 0xffe9a8, dur: 0.05, rot: Math.random() }); F.flashLight(mx, 1.3, mz, [1, 0.85, 0.5], 0.8, 0.06, 5);
      W.audio.sfx('needle'); P.shootPose = 0.18; return;
    }
    if (run.weapon === 'rivet') { // slow shells that burst
      var shell = function (da, m, r) { var a = P.facing + da; C.shoot({ x: mx, z: mz, vx: Math.sin(a) * 22, vz: Math.cos(a) * 22, dmg: 1, team: 'e', life: C.reach() / 22, r: 0.4, col: 0xffb347, wid: 0.22, len: 0.5, onEnd: function (s) { blast(s.x, s.z, r, dmg * m, { pull: v === 'rivet2' }); } }); };
      if (v === 'rivet1') { shell(-0.22, 0.55, 1.7); shell(0, 0.55, 1.7); shell(0.22, 0.55, 1.7); } else shell(0, 1, 2.3);
      P.fireCd = 0.62 / C.atkSpeed(); P.kvx -= fx * 2.5; P.kvz -= fz * 2.5;
      F.spawn(K.FLASH, { x: mx, y: 1.2, z: mz, s: 1.0, bill: true, col: 0xffb347, dur: 0.07, rot: Math.random() }); F.flashLight(mx, 1.3, mz, [1, 0.7, 0.3], 1.0, 0.08, 6); F.addShake(0.1);
      W.audio.sfx('thud', 0.7); P.shootPose = 0.25; return;
    }
    function needle(da, o) { var a = P.facing + da; var s = C.shoot({ x: mx, z: mz, vx: Math.sin(a) * 34, vz: Math.cos(a) * 34, dmg: dmg * (o.m || 1), team: 'e', direct: true, kb: o.kb || 2.5, life: (o.range || C.reach()) / 34, pierce: o.pierce || 0, col: 0xffe9a8 }); return s; }
    if (v === 'carbine1') { needle(-0.2, { range: 9 }); needle(0, { range: 9 }); needle(0.2, { range: 9 }); P.fireCd = 0.2; }
    else if (v === 'carbine2') { needle(0, { m: 3.4, pierce: 1, kb: 7 }); P.fireCd = 0.42; F.addShake(0.12); }
    else { needle((Math.random() - 0.5) * 0.07, {}); P.fireCd = 0.135; }
    P.fireCd /= C.atkSpeed();
    F.spawn(K.FLASH, { x: mx, y: 1.2, z: mz, s: 0.7, bill: true, col: 0xffe9a8, dur: 0.05, rot: Math.random() });
    F.flashLight(mx, 1.3, mz, [1, 0.85, 0.5], 0.8, 0.06, 5);
    W.audio.sfx('needle'); P.shootPose = 0.15;
  }

  C.updatePlayer = function (dt, act) {
    var P = G.player, run = G.run, B = G.B, room = G.room, CH = C.char(), WK = D.WEAPONS[run.weapon];
    if (!P.alive) { P.st += dt; M.poseHuman(P.rig, { t: G.time, act: 'dead' }, dt); return; }
    P.st += dt;
    P.iframe = Math.max(0, P.iframe - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.slowT = Math.max(0, P.slowT - dt);
    P.tagCd = Math.max(0, P.tagCd - dt); P.activeCd = Math.max(0, P.activeCd - dt); P.fireCd = Math.max(0, P.fireCd - dt);
    P.buffer = Math.max(0, P.buffer - dt); P.shootPose = Math.max(0, (P.shootPose || 0) - dt);
    if (P.dashes < P.maxDashes) { P.dashCd -= dt; if (P.dashCd <= 0) { P.dashes++; P.dashCd = CH.dashCd; } }
    if (P.snare > 0) { P.snare -= dt; P.slowT = Math.max(P.slowT, 0.1); }
    // aim
    var locked = (P.state === 'attack' && P.st < (P.atk.wind + P.atk.hold) * P.atkK) || P.state === 'dash' || P.state === 'breach' || P.state === 'leap' || P.state === 'slash';
    if (!locked) {
      if (act.aimDir) { P.facing = ang(act.aimDir.x, act.aimDir.z); P.aimDist = 6; }
      else if (act.aimAt) { P.facing = ang(act.aimAt.x - P.x, act.aimAt.z - P.z); P.aimDist = W.dist(act.aimAt.x, act.aimAt.z, P.x, P.z); }
    }
    // heat
    P.inWater = Wd.isWater(room, P.x, P.z);
    if (!P.redline) {
      if (B.passiveHeat && G.inCombat) P.heat = Math.min(99.5, P.heat + B.passiveHeat * dt);
      P.heat = Math.max(0, P.heat - (P.inWater ? 15 : (G.inCombat ? (run.bounty.fever ? 0 : 0.7) : 3) * B.heatDecay) * dt);
      if (P.inWater && P.heat > 5 && Math.random() < dt * 5) F.spawn(K.STEAM, { x: P.x, y: 0.4, z: P.z, s: 0.5, bill: true, col: 0xe8f0ec, col2: 0x8aa0a4, dur: 0.5, vy: 1.6 });
    } else { if (!B.noDrain) run.hp = Math.max(1, run.hp - (CH.drain || 3) * dt); if (Math.random() < dt * 14) F.spawn(K.STEAM, { x: P.x + (Math.random() - 0.5), y: 1 + Math.random(), z: P.z, s: 0.4, bill: true, col: 0xffb080, col2: 0xb8402a, dur: 0.35, vy: 2.4 }); }
    // inputs
    if (act.attack) P.buffer = 0.28;
    var canAct = P.state === 'idle' || (P.state === 'attack' && P.st >= (P.atk.wind + P.atk.hold) * P.atkK);
    var spd = CH.speed * (1 + B.speed) * (P.snare > 0 ? 0.3 : (P.slowT > 0 ? 0.55 : 1)), mvx = 0, mvz = 0;
    if (act.dash && P.dashes > 0 && P.state !== 'dash' && P.state !== 'breach' && P.state !== 'leap' && P.state !== 'slash' && (P.state !== 'attack' || P.st > P.atk.wind * P.atkK)) startDash(P, act);
    else if (act.vent && P.state !== 'dash' && P.state !== 'leap' && P.state !== 'breach' && P.state !== 'slash') { C.vent(); }

    if (P.state === 'idle') {
      if (act.tag && P.tagCd <= 0) useQ(P);
      if (act.active && B.active && P.activeCd <= 0 && P.state === 'idle') useActive(P);
      if (P.state !== 'idle') { /* the Q skill took over */ }
      else if (WK.kind === 'ranged') {
        if (act.attackHeld && P.fireCd <= 0) fireCarbine(P);
        if (act.attackHeld && run.weapon !== 'pistols') spd *= 0.62;
      } else if (P.buffer > 0) startAttack(P);
      if (act.special && P.state === 'idle') { P.state = 'charge'; P.st = 0; P.charge = 0; P.chargeMax = WK.charge[1]; P.chargeMin = WK.charge[0]; W.audio.sfx('charge'); }
      mvx = act.mx * spd; mvz = act.mz * spd;
    } else if (P.state === 'attack') {
      var a = P.atk, k = P.atkK, tw = a.wind * k, th = tw + a.hold * k, tr = th + a.rec * k;
      if (P.st < tw) { var lu = (a.lunge || 0) / Math.max(tw + 0.04, 0.05); mvx = Math.sin(P.facing) * lu; mvz = Math.cos(P.facing) * lu; }
      if (!P.struck && P.st >= tw) { P.struck = true; strike(P); }
      if (P.st >= th) { mvx = act.mx * spd * 0.5; mvz = act.mz * spd * 0.5; if (P.buffer > 0 && !a.last) startAttack(P); else if (P.buffer > 0 && a.last && P.st >= tr - 0.06) startAttack(P); }
      if (P.st >= tr && P.state === 'attack') { P.state = 'idle'; P.atk = null; }
    } else if (P.state === 'charge') {
      P.charge += dt; mvx = act.mx * spd * 0.35; mvz = act.mz * spd * 0.35;
      if (Math.random() < dt * 30) { var ca = Math.random() * TAU; F.spawn(K.SHARD, { x: P.x + Math.sin(ca) * 1.6, y: 1.2, z: P.z + Math.cos(ca) * 1.6, sx: 0.05, sz: 0.25, bill: true, rot: ca, col: D.WEAPONS[run.weapon].glow, dur: 0.18, vx: -Math.sin(ca) * 7, vz: -Math.cos(ca) * 7 }); }
      if ((!act.specialHeld && P.charge >= P.chargeMin) || P.charge >= P.chargeMax) doSpecialRelease(P);
    } else if (P.state === 'dash') {
      var v = P.dashLen / P.dashDur; mvx = P.dashDx * v; mvz = P.dashDz * v;
      if (run.rig === 'shock' || B.dashZap || CH.dash === 'ram') G.enemies.forEach(function (e) {
        if (e.dead || e.team !== 1 || e.spawnT > 0 || P.dashHit.indexOf(e) >= 0 || W.dist(e.x, e.z, P.x, P.z) > e.r + (CH.dash === 'ram' ? 1.2 : 0.9)) return;
        P.dashHit.push(e);
        if (run.rig === 'shock') C.hitEnemy(e, 8, { kb: 2, stun: 0.6, src: 'shock' });
        if (B.dashZap) { C.hitEnemy(e, B.dashZap, { kb: 1, stun: 0.7, src: 'shock' }); C.heat(3); }
        if (CH.dash === 'ram') { C.hitEnemy(e, 14 * (1 + run.wtier * 0.1), { kb: 18, direct: true, big: true, heavy: true, stun: 0.4, sfx: 'slam', sx: P.x - P.dashDx, sz: P.z - P.dashDz }); G.hitstop = Math.max(G.hitstop, 0.05); F.addShake(0.3); }
      });
      if (P.st >= P.dashDur) endDash(P);
    } else if (P.state === 'slash') { // blade special
      mvx = P.dashDx * 34; mvz = P.dashDz * 34;
      G.enemies.forEach(function (e) { if (e.dead || e.team !== 1 || e.spawnT > 0 || P.dashHit.indexOf(e) >= 0 || W.dist(e.x, e.z, P.x, P.z) > e.r + 1.3) return; P.dashHit.push(e); C.hitEnemy(e, P.slashDmg, { kb: 4, direct: true, big: true, sfx: 'hit' }); G.hitstop = Math.max(G.hitstop, 0.04); F.spawn(K.SLASH, { x: e.x, y: 1.1, z: e.z, s: 1.8, rot: P.facing + 1.2, col: 0x9fe8ff, dur: 0.14, p: [1.2, 1, 0.3, 0] }); });
      if (P.st >= 0.2) { P.state = 'attack'; P.st = 0; P.atk = { wind: 0, hold: 0.1, rec: 0.14, sub: 2 }; P.atkK = 1; P.struck = true; }
    } else if (P.state === 'vent') {
      mvx = act.mx * spd * 0.3; mvz = act.mz * spd * 0.3; if (P.st > 0.3) P.state = 'idle';
    } else if (P.state === 'breach') { // hammer special: carry the first enemy hit into a wall
      var bv = 24; mvx = P.breachDx * bv; mvz = P.breachDz * bv;
      if (!P.grab) { var c = C.near(P.x + P.breachDx * 1.2, P.z + P.breachDz * 1.2, 1.5)[0]; if (c && !c.noKb) { P.grab = c; c.stun = Math.max(c.stun, 0.6); G.hitstop = 0.05; W.audio.sfx('hit', 1); } else if (c) { finishBreach(P, c, false); } }
      if (P.grab) { P.grab.x = P.x + P.breachDx * (1.3 + P.grab.r); P.grab.z = P.z + P.breachDz * (1.3 + P.grab.r); P.grab.kvx = 0; P.grab.kvz = 0; if (Wd.isSolid(room, P.grab.x + P.breachDx * P.grab.r, P.grab.z + P.breachDz * P.grab.r)) finishBreach(P, P.grab, true); }
      if (P.state === 'breach' && P.st > 0.3) { if (P.grab) finishBreach(P, P.grab, false); else { P.state = 'attack'; P.st = 0; P.atk = { wind: 0, hold: 0.1, rec: 0.25, sub: 5 }; P.atkK = 1; P.struck = true; } }
    } else if (P.state === 'leap') {
      var lk = W.sat(P.st / 0.36); var nx = W.lerp(P.leapX0, P.leapX, lk), nz = W.lerp(P.leapZ0, P.leapZ, lk);
      mvx = (nx - P.x) / dt; mvz = (nz - P.z) / dt; P.y = Math.sin(lk * Math.PI) * 2.4;
      if (lk >= 1) {
        P.y = 0; P.state = 'attack'; P.st = 0; P.atk = { wind: 0, hold: 0.16, rec: 0.28, sub: 5 }; P.atkK = 1; P.struck = true;
        F.spawn(K.RING, { x: P.x, y: 0.1, z: P.z, s: 4.2, col: 0xffb347, dur: 0.3, p: [0.12, 0.2] }); F.addShake(0.5); G.hitstop = 0.07; W.audio.sfx('slam');
        C.near(P.x, P.z, 4).forEach(function (e) { C.hitEnemy(e, 42 * specialMul() * (1 + run.wtier * 0.1), { kb: 16, direct: true, big: true, heavy: true, stun: 0.6 }); });
      }
    }
    // knockback on the player + movement
    mvx += P.kvx; mvz += P.kvz; var fr = Math.exp(-9 * dt); P.kvx *= fr; P.kvz *= fr;
    var ox = P.x, oz = P.z;
    var hitWall = Wd.move(room, P, mvx * dt, mvz * dt, P.r);
    if (hitWall && P.state === 'breach' && !P.grab) { P.state = 'idle'; }
    if (hitWall && P.state === 'leap') { P.leapX = P.x; P.leapZ = P.z; P.leapX0 = P.x; P.leapZ0 = P.z; }
    var moved = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-4);
    P.speed = W.damp(P.speed, moved, 14, dt);
    if (P.state === 'idle' && (act.mx || act.mz)) P.moveAng = ang(act.mx, act.mz);
    P.phase += Math.min(moved, 9) * dt * 1.25;
    if (P.inWater && moved > 2 && Math.random() < dt * 9) F.spawn(K.RING, { x: P.x, y: -0.1, z: P.z, s: 0.9, col: 0xbfe8e4, dur: 0.45, p: [0.3, 0.07] });
    // rig
    var rig = P.rig, fy = Wd.floorY(room, P.x, P.z);
    if (P.state !== 'leap') P.y = W.damp(P.y, fy, 18, dt);
    rig.root.position.set(P.x, P.y, P.z);
    var showAng = (P.state === 'idle' && !act.attackHeld && P.shootPose <= 0 && WK.kind !== 'ranged' && G.time - P.lastAtk > 0.5 && P.speed > 1) ? P.moveAng : P.facing;
    if (P.state === 'dash') showAng = P.moveAng;
    rig.root.rotation.y = P.state === 'attack' || P.state === 'dash' ? showAng : W.angDamp(rig.root.rotation.y, showAng, 22, dt);
    if (P.state === 'dash' && CH.dash === 'roll') rig.parts.body.rotation.x = 0.75 + Math.sin(W.sat(P.st / P.dashDur) * Math.PI) * 1.4;
    var st = { t: G.time, speed: P.speed, phase: P.phase };
    if (P.state === 'attack') { var a2 = P.atk, k2 = P.atkK; st.sub = a2.sub; if (!P.struck) { st.act = 'windup'; st.k = P.st / (a2.wind * k2); } else { st.act = 'hold'; st.snap = P.st < (a2.wind + 0.05) * k2; } }
    else if (P.state === 'dash' || P.state === 'breach' || P.state === 'leap' || P.state === 'slash') st.act = 'dash';
    else if (P.state === 'charge') st.act = 'charge';
    else if (P.state === 'vent') st.act = 'vent';
    else if (WK.kind === 'ranged' && (act.attackHeld || P.shootPose > 0)) { st.act = 'hold'; st.sub = 3; }
    else if (P.shootPose > 0) { st.act = 'hold'; st.sub = 4; }
    M.poseHuman(rig, st, dt);
    // cape lag, flash, glow
    if (rig.mats.cape) {
      var lag = rig.mats.cape.uniforms.uLag.value, cs = Math.cos(-rig.root.rotation.y), sn = Math.sin(-rig.root.rotation.y);
      var lvx = -(P.x - ox) / Math.max(dt, 1e-4) * 0.05, lvz = -(P.z - oz) / Math.max(dt, 1e-4) * 0.05;
      lag.x = W.damp(lag.x, W.clamp(lvx * cs + lvz * sn, -0.8, 0.8), 12, dt); lag.z = W.damp(lag.z, W.clamp(-lvx * sn + lvz * cs, -0.8, 0.8), 12, dt);
    }
    P.flash = Math.max(0, P.flash - dt * 9);
    var blink = P.hurtT > 0 ? (Math.sin(G.time * 50) > 0 ? 0.5 : 0) : 0;
    M.setFlash(rig, Math.max(P.flash, blink));
    var hk = P.redline ? 1 : W.smooth(60, 100, P.heat) * 0.6, pulse = P.redline ? 0.5 + 0.5 * Math.sin(G.time * 16) : 0;
    M.setGlow(rig, P.baseGlow[0] * (1 - hk) + hk * (0.9 + pulse * 0.3), P.baseGlow[1] * (1 - hk) + hk * 0.25, P.baseGlow[2] * (1 - hk) + hk * 0.08);
  };
  // the Q skill: each courier has their own
  function useQ(P) {
    var CH = C.char(), run = G.run, fx = Math.sin(P.facing), fz = Math.cos(P.facing), i;
    P.tagCd = CH.qCd * (run.deck === 'swarm' ? 0.5 : 1); P.tagMax = P.tagCd;
    if (CH.q === 'fan') { // seven shots in a cone; the middle one carries the tag
      for (i = -3; i <= 3; i++) { var a = P.facing + i * 0.15; C.shoot({ kind: i === 0 ? 'tag' : 'needle', x: P.x + fx, z: P.z + fz, vx: Math.sin(a) * 32, vz: Math.cos(a) * 32, dmg: 9 * (1 + run.wtier * 0.1) * (1 + G.B.dmgMul), team: 'e', direct: true, noProc: true, kb: 6, life: 0.4, r: i === 0 ? 0.6 : 0.3, col: i === 0 ? 0xffb347 : 0xffd070, wid: i === 0 ? 0.2 : 0.12 }); }
      F.spawn(K.FLASH, { x: P.x + fx * 1.3, y: 1.2, z: P.z + fz * 1.3, s: 1.3, bill: true, col: 0xffe9a8, dur: 0.07 }); F.flashLight(P.x + fx * 2, 1.3, P.z + fz * 2, [1, 0.85, 0.5], 1.3, 0.1, 7); F.addShake(0.18);
      W.audio.sfx('needle'); W.audio.sfx('tagThrow'); P.shootPose = 0.3; P.kvx -= fx * 3; P.kvz -= fz * 3; C.heat(5);
    } else if (CH.q === 'grapple') { // grab the nearest body in front and throw it along the aim
      var c = C.near(P.x + fx * 2.2, P.z + fz * 2.2, 2.7)[0];
      if (!c) { P.tagCd = 0.5; F.text(P.x, 2.6, P.z, 'Nothing to grab', 'small', 0.5); return; }
      C.applyTag(c); if (c.dead) return;
      if (c.boss || c.noKb || c.fixed) C.hitEnemy(c, 26 * (1 + run.wtier * 0.1), { direct: true, big: true, heavy: true, stun: 0.5, kb: 6, sfx: 'slam' });
      else { c.x = P.x + fx * (1.3 + c.r); c.z = P.z + fz * (1.3 + c.r); C.hitEnemy(c, 10 * (1 + run.wtier * 0.1), { direct: true, big: true, heavy: true, kb: 0, sfx: 'slam' }); if (!c.dead) { c.kvx = fx * 30; c.kvz = fz * 30; c.stun = Math.max(c.stun, 1.0); c.wreck = 0.9; C.interrupt(c); } F.text(c.x, 2.9, c.z, 'Thrown', 'small', 0.5); }
      G.hitstop = Math.max(G.hitstop, 0.07); F.addShake(0.35); W.audio.sfx('swingHeavy', 1); C.heat(5);
      P.state = 'attack'; P.st = 0; P.atk = { wind: 0, hold: 0.16, rec: 0.2, sub: 5 }; P.atkK = 1; P.struck = true;
    } else {
      C.shoot({ kind: 'tag', x: P.x + fx, z: P.z + fz, vx: fx * 24, vz: fz * 24, team: 'e', life: 0.62, r: 0.7, col: 0xffb347, wid: 0.2, len: 0.6, y: 1.3 });
      W.audio.sfx('tagThrow'); P.shootPose = 0.2;
    }
  }
  function finishBreach(P, e, wall) {
    var run = G.run, B = G.B;
    P.state = 'attack'; P.st = 0; P.atk = { wind: 0, hold: 0.18, rec: 0.3, sub: 5 }; P.atkK = 1; P.struck = true; P.grab = null;
    var dmg = (wall ? 48 : 22) * specialMul() * (1 + run.wtier * 0.1);
    if (wall) { F.spawn(K.RING, { x: e.x, y: 0.1, z: e.z, s: 3.2, col: 0xffb347, dur: 0.28, p: [0.15, 0.2] }); F.addShake(0.6); G.hitstop = 0.09; F.text(e.x, 3, e.z, 'Wall breach', 'call', 0.8); W.audio.sfx('slam'); C.wallSlamProc(e, true); }
    C.hitEnemy(e, dmg, { kb: wall ? 3 : 20, direct: true, big: true, heavy: true, stun: wall ? 1.2 : 0.3, sx: P.x, sz: P.z });
  }
  function useActive(P) {
    var B = G.B, fx = Math.sin(P.facing), fz = Math.cos(P.facing);
    if (B.active === 'emp') {
      P.activeCd = 12; C.heat(25);
      F.spawn(K.RING, { x: P.x, y: 0.5, z: P.z, s: 7, col: 0x49d3ff, dur: 0.35, p: [0.1, 0.12] });
      for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; C.bolt(P.x, P.z, P.x + Math.sin(a) * 6.5, P.z + Math.cos(a) * 6.5); }
      C.near(P.x, P.z, 7).forEach(function (e) { C.hitEnemy(e, 12, { src: 'shock', stun: 1.6, kb: 2 }); });
      G.enemies.forEach(function (e) { if (e.boss && W.dist(e.x, e.z, P.x, P.z) < 7 + e.r) e.stagger = 0.5; });
      F.addShake(0.3); W.audio.sfx('emp'); F.text(P.x, 3, P.z, 'Overclock', 'call', 0.8);
    } else if (B.active === 'lance') {
      P.activeCd = 8; C.heat(20);
      var len = 26;
      F.spawn(K.BEAM, { x: P.x + fx * len / 2, y: 1.2, z: P.z + fz * len / 2, sx: 0.7, sz: len / 2, rot: P.facing, col: 0xff4058, dur: 0.3, p: [0.85, 0, 0, 0] });
      G.enemies.forEach(function (e) { if (e.dead || e.spawnT > 0 || e.team === 2) return; var dx = e.x - P.x, dz = e.z - P.z, al = dx * fx + dz * fz, pr = Math.abs(dx * fz - dz * fx); if (al > 0 && al < len && pr < 0.8 + e.r) { C.hitEnemy(e, 45, { kb: 6, direct: true, big: true, heavy: true, mark: true }); } });
      F.addShake(0.35); G.hitstop = 0.06; W.audio.sfx('rail'); F.text(P.x, 3, P.z, 'Lance', 'call', 0.8);
      F.flashLight(P.x + fx * 3, 1.3, P.z + fz * 3, [1, 0.3, 0.35], 2, 0.2, 10);
    }
    P.shootPose = 0.3;
  }
  // called when a thrown enemy meets a wall
  C.wallSlamProc = function (e, forced) {
    var B = G.B, P = G.player;
    var dmg = B.wallDmg * (P.redline && B.redWall ? 2 : 1);
    F.hitSpark(e.x, 1.0, e.z, 0xf2b824, true); F.addShake(0.3); W.audio.sfx('thud');
    e.stun = Math.max(e.stun, 0.7);
    if (dmg > 0 && !forced) { C.hitEnemy(e, dmg, { src: 'wall', heavy: true }); C.heat(6); F.text(e.x, 2.9, e.z, 'Slam', 'small', 0.5); }
    if (B.fusions.railhammer) { if (C.chain(e.x, e.z, 3, 12, e)) C.fusionCall(B.fusions.railhammer, e.x, e.z); else if (!e.dead) { C.hitEnemy(e, 8, { src: 'shock' }); C.fusionCall(B.fusions.railhammer, e.x, e.z); } }
  };
})();
