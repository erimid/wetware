// Wetware — bot: plays the game with the same actions a player has. Reads the same tells a player sees.
'use strict';
(function () {
  var Bt = W.bot = {};
  var C, Wd = W.world, D = W.data, U;
  var G; Bt.bind = function (g) { G = g; C = W.combat; U = W.ui; };
  var S = { spT: 0, spHold: 0, menuT: 0, path: null, pathT: 0, atkT: 0, redT: 0, lastDir: 0, stuckT: 0, lx: 0, lz: 0 };
  function ang(dx, dz) { return Math.atan2(dx, dz); }

  // ---- menus and the grid ----
  Bt.menu = function (dt) {
    var m = U.modal; if (!m) return; S.menuT += dt;
    if (m.type === 'grid') {
      if (S.menuT > 0.9 && U.grid.hold) { U.grid.auto(); S.menuT = 0.2; }
      else if (S.menuT > 1.5) { S.menuT = 0; U.grid.close(); }
      return;
    }
    if (S.menuT < 1.1) return; S.menuT = 0;
    var o = m.o, its = o.items || [], run = G.run, best = -1, bs = -1e9;
    its.forEach(function (it, i) {
      if (it.dis) return; var s = 0;
      if (it.imp) { var B = G.B; s = 5 + (B.factions[it.imp.f] ? 3 : 0) + (it.imp.zone === 'arm' ? 1 : 0); for (var f in B.factions) if (f !== it.imp.f && D.FUSIONS[D.fusionKey(f, it.imp.f)]) s += 2; if (!D.autoPlace(run, it.imp.id)) s -= 4; if (it.s) s = run.scrip > 80 ? 2 : -5; }
      else if (it.s) { s = it.s.id === 'heal' ? (run.hp < run.maxHp * 0.7 ? 9 : -9) : (it.s.id === 'gear' ? 4 : (it.s.id === 'mod' ? 3 : -9)); }
      else if (it.b) s = -9;
      else if (it.boon) s = it.boon.bot;
      else if (it.k && D.CHARS[it.k]) s = -9;
      else s = 3 - i * 0.1;
      if (o.title === 'An offer, at a price') s = i === 0 ? (run.maxHp > 90 ? 5 : 0) : (i === 2 ? 1 : 0);
      if (s > bs) { bs = s; best = i; }
    });
    if (best >= 0 && bs > -5) m.pick(best); else if (o.close) m.close(); else if (its.length) m.pick(0);
  };

  // ---- pathing on the room cells ----
  function bfs(room, sx, sz, tx, tz) {
    var a = Wd.cellAt(room, sx, sz), b = Wd.cellAt(room, tx, tz), w = room.w, h = room.h;
    if (a.c === b.c && a.r === b.r) return { x: tx, z: tz };
    var prev = new Int16Array(w * h).fill(-1), q = [b.r * w + b.c], head = 0; prev[b.r * w + b.c] = b.r * w + b.c;
    var start = a.r * w + a.c, found = false;
    while (head < q.length) {
      var cur = q[head++]; if (cur === start) { found = true; break; }
      var cc = cur % w, cr = (cur / w) | 0, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) { var nc = cc + nb[i][0], nr = cr + nb[i][1]; if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue; var id = nr * w + nc; if (prev[id] >= 0) continue; if (room.solid[nr][nc] && id !== start) continue; prev[id] = cur; q.push(id); }
    }
    if (!found) return { x: tx, z: tz };
    var nx = prev[start]; if (nx === b.r * w + b.c) return { x: tx, z: tz };
    // look one more cell ahead when the way is straight and open
    var n2 = prev[nx], t = n2 >= 0 && !Wd.blocked(room, sx, sz, room.cx(n2 % w), room.cz((n2 / w) | 0)) ? n2 : nx;
    return { x: room.cx(t % w), z: room.cz((t / w) | 0) };
  }

  // ---- danger: every tell, pool, shot and live water the player could also see ----
  function danger(x, z, horizon) {
    var d = 0, i, P = G.player;
    for (i = 0; i < G.tells.length; i++) {
      var t = G.tells[i]; if (t.team !== 'p' && t.team !== 'a') continue; if (t.done || t.cancel) continue;
      var left = t.delay - t.t; if (left > horizon) continue;
      if (t.fired && t.t > t.delay + t.dur) continue;
      var m = t.followActive ? 1.0 : 0.75;
      if (t.follow && !t.fired && t.shape === 'line') m = 1.1;
      if (C.inTell(t, x, z, m)) d += left < 0.35 ? 3 : (left < 0.7 ? 2 : 1);
    }
    for (i = 0; i < G.zones.length; i++) { var zn = G.zones[i]; if (zn.kind === 'acid' && W.dist(x, z, zn.x, zn.z) < zn.r + 0.3) d += 1.5; }
    for (i = 0; i < G.shots.length; i++) { var s = G.shots[i]; if (s.team !== 'p' || s.lob) continue; var dx = x - s.x, dz = z - s.z, sp = Math.hypot(s.vx, s.vz) || 1, al = (dx * s.vx + dz * s.vz) / sp, pr = Math.abs(dx * s.vz - dz * s.vx) / sp; if (al > -0.5 && al < sp * 0.5 && pr < 1.0) d += 2; }
    if (G.surgeInfo && Wd.isWater(G.room, x, z)) d += G.surgeInfo.t > G.surgeInfo.warn - 0.5 ? 3 : 1.2;
    // do not stand inside heavy bodies or in front of a charging bruiser
    for (i = 0; i < G.enemies.length; i++) { var e = G.enemies[i]; if (e.dead || e.team !== 1) continue; var dd = W.dist(x, z, e.x, e.z); if (dd < e.r + 0.7) d += 0.6; }
    return d;
  }
  Bt.danger = danger;

  function pickTarget(P) {
    var best = null, bs = -1e9, pr = { patch: 9, shepherd: 9, rigger: 7, sniper: 6, netter: 5, spitter: 4, turret: 3, leech: 2, ghost: 1, rat: 1 };
    G.enemies.forEach(function (e) {
      if (e.dead || e.spawnT > 0 || e.team !== 1) return;
      var d = W.dist(P.x, P.z, e.x, e.z), s = (pr[e.type] || 0) - d * 0.9 - (e.cloak > 0.5 ? 4 : 0) + (e.stun > 0 ? 2 : 0) + (e.boss ? 3 : 0);
      if (e.type === 'turret' && G.B.hijack) s -= 3;
      if (s > bs) { bs = s; best = e; }
    });
    return best;
  }

  Bt.act = function (dt) {
    var P = G.player, room = G.room, run = G.run, B = G.B;
    var a = { mx: 0, mz: 0, attack: false, attackHeld: false, special: false, specialHeld: false, dash: false, tag: false, vent: false, grid: false, active: false, interact: false, aimAt: null };
    if (!P.alive) return a;
    S.atkT -= dt; S.spT -= dt; S.spHold -= dt; S.pathT -= dt;
    var dodgeOnly = W.params.bot === 'dodge';
    var WK = D.WEAPONS[run.weapon], CH = C.char(), BW = WK.bot;
    var T = pickTarget(P), goal = null, range = 0, melee = WK.kind !== 'ranged';
    // ---- where do we want to be ----
    if (G.sq) a.interact = Math.random() < dt * 1.2;
    if (!T) {
      if (G.state === 'end') goal = G.buyer ? { x: G.buyer.x - 1.5, z: G.buyer.z + 2 } : null;
      else {
        var doors = room.doors.filter(function (d) { return d.open; });
        if (doors.length) {
          var pref = { implant: 6, chop: 4, gear: 4, memory: 2, scrip: 2, shrine: W.params.door === 'shrine' ? 9 : 3, risk: W.params.door === 'risk' ? 9 : 0.5, health: run.hp < run.maxHp * 0.6 ? 9 : 1, boss: 5, shop: 5, event: 5 };
          doors.sort(function (d1, d2) { return (pref[d2.reward.kind] || 0) - (pref[d1.reward.kind] || 0); });
          var d0 = doors[0];
          // at the stall: trade once before leaving
          if (G.roomKind === 'shop' && !S.shopped && G.spots && G.spots[0] && G.state === 'run') { goal = { x: G.spots[0].x, z: G.spots[0].z }; if (W.dist(P.x, P.z, goal.x, goal.z) < 1.5) { a.interact = true; S.shopped = true; } }
          else goal = { x: d0.x, z: d0.z - 1.4 };
        } else goal = { x: 0, z: 0 };
      }
      if (G.roomKind !== 'shop') S.shopped = false;
    } else {
      range = dodgeOnly ? 8 : (melee ? C.reach() * 0.8 + T.r : Math.min(9, C.reach() * 0.7));
      goal = { x: T.x, z: T.z };
      if (T.type === 'dredge') { range = T.phase === 3 ? 3.9 : 4.25; if (dodgeOnly) range = T.phase === 3 ? 6 : 4.3; }
      if (T.shieldUp) { goal = { x: T.x - Math.sin(T.facing) * 2.4, z: T.z - Math.cos(T.facing) * 2.4 }; range = 0.6; }
      if (T.type === 'bruiser' && T.state === 'windup' && T.atk === 'slam') range = 6;
      if (G.surgeInfo) { // get to a dry deck
        var bd = 1e9, bc = null; for (var r = 0; r < room.h; r++) for (var c = 0; c < room.w; c++) if (room.cells[r][c] === '=') { var cx = room.cx(c), cz = room.cz(r), dd = W.dist(P.x, P.z, cx, cz) + danger(cx, cz, 1.5) * 8; if (dd < bd) { bd = dd; bc = { x: cx, z: cz }; } }
        if (bc) { goal = bc; range = 0.3; }
      }
      if (P.redline && run.hp < run.maxHp * 0.35) a.vent = true;
    }
    if (!goal) return a;
    // ---- steering: sample directions, weigh danger against the goal ----
    var way = goal;
    if (Wd.blocked(room, P.x, P.z, goal.x, goal.z)) { if (S.pathT <= 0 || !S.path) { S.path = bfs(room, P.x, P.z, goal.x, goal.z); S.pathT = 0.25; } way = S.path; } else S.path = null;
    var gd = W.dist(P.x, P.z, goal.x, goal.z), here = danger(P.x, P.z, 1.0), bestS = -1e9, bx = 0, bz = 0, bestD = 0;
    var want = T ? range : 0.4;
    for (var i = -1; i < 16; i++) {
      var dx = 0, dz = 0; if (i >= 0) { var an = i / 16 * 6.283; dx = Math.sin(an); dz = Math.cos(an); }
      var step = T ? 1.5 : Math.min(1.5, Math.max(0.5, W.dist(P.x, P.z, way.x, way.z))), px = P.x + dx * step, pz = P.z + dz * step;
      if (i >= 0 && (Wd.isSolid(room, px, pz) || Wd.isSolid(room, P.x + dx * step * 0.5, P.z + dz * step * 0.5))) continue;
      var dg = danger(px, pz, 1.0) + (i >= 0 ? danger(P.x + dx * 3, P.z + dz * 3, 0.6) * 0.3 : 0);
      var wd = W.dist(px, pz, way.x, way.z), dist = way === goal ? Math.abs(wd - want) : wd;
      var sc = -dg * 60 - dist * 2.2;
      if (T && way === goal && melee && !T.boss && wd < want * 0.5) sc -= 2;
      if (i >= 0) sc += (dx * Math.sin(S.lastDir) + dz * Math.cos(S.lastDir)) * 0.8; // keep heading: no jitter
      if (P.heat > 55 && !P.redline && Wd.isWater(room, px, pz) && !G.surgeInfo) sc += 2.5;
      if (sc > bestS) { bestS = sc; bx = dx; bz = dz; bestD = dg; }
    }
    a.mx = bx; a.mz = bz; if (bx || bz) S.lastDir = ang(bx, bz);
    // ---- dash: when the hit is about to land and walking will not clear it ----
    var urgent = danger(P.x, P.z, 0.3);
    if (urgent >= 3 && P.dashes > 0 && P.state !== 'dash') {
      var ds = -1e9, ddx = bx, ddz = bz;
      for (i = 0; i < 16; i++) { var an2 = i / 16 * 6.283, x2 = Math.sin(an2), z2 = Math.cos(an2), ok = true; for (var q = 1; q <= 4; q++) if (Wd.isSolid(room, P.x + x2 * q * 1.5, P.z + z2 * q * 1.5)) { ok = false; break; } var sc2 = -danger(P.x + x2 * 6, P.z + z2 * 6, 1.2) * 10 - (ok ? 0 : 6) - W.dist(P.x + x2 * 6, P.z + z2 * 6, goal.x, goal.z) * 0.15; if (sc2 > ds) { ds = sc2; ddx = x2; ddz = z2; } }
      if (bestD > 0.5 || urgent >= 3) { a.dash = true; a.mx = ddx; a.mz = ddz; }
    }
    // leeches on the back: shake them off
    var att = 0; G.enemies.forEach(function (e) { if (e.attached) att++; });
    if (att && P.dashes > 0) a.dash = true; else if (att && P.heat > 15) a.vent = true;
    // long walks between fights: dash to keep the pace
    if (!T && gd > 9 && P.dashes > 0 && Math.random() < dt * 1.5 && here === 0) a.dash = true;
    if (G.surgeInfo && gd > 3 && P.dashes > 0 && here > 0) a.dash = true;
    // ---- fighting ----
    if (T && !dodgeOnly) {
      var td = W.dist(P.x, P.z, T.x, T.z), lead = melee ? 0 : 0.12;
      a.aimAt = { x: T.x + (T.mvx || 0) * lead, z: T.z + (T.mvz || 0) * lead };
      var reach = C.reach() + T.r, close = C.near(P.x, P.z, 3.4).length, safe = urgent < 3;
      if (melee) {
        if (td < reach * 0.95 && safe && S.atkT <= 0) { a.attack = true; S.atkT = 0.11; }
        var wantSp = S.spT <= 0 && P.state === 'idle' && safe && (BW.sp === 'crowd' ? (close >= 2 || (T.shieldUp && td < 3.2) || (T.boss && td < reach) || (T.armor > 0 && td < 3.2)) : (td < (BW.sp === 'far' ? 12 : 6) && (T.shieldUp || T.armor > 0 || T.hp > 30)));
        if (wantSp) { a.special = true; S.spT = BW.cd; S.spHold = BW.hold; a.attack = false; }
      } else {
        var los = !Wd.blocked(room, P.x, P.z, T.x, T.z);
        if (td < C.reach() - 1 && los) a.attackHeld = true;
        if (S.spT <= 0 && P.state === 'idle' && los && td < C.reach() + 2 && safe && (T.hp > 25 || T.shieldUp || T.armor > 0)) { a.special = true; S.spT = BW.cd; S.spHold = BW.hold; }
      }
      if (S.spHold > 0) a.specialHeld = true;
      if (P.tagCd <= 0 && td < CH.qRange + (CH.q === 'grapple' ? T.r : 0) && P.state === 'idle' && (T.hp > 20 || B.hijack)) { a.tag = true; if (B.hijack) { var hj = null; G.enemies.forEach(function (e) { if (!e.dead && e.team === 1 && (e.type === 'turret' || e.type === 'patch') && W.dist(e.x, e.z, P.x, P.z) < 13) hj = e; }); if (hj) a.aimAt = { x: hj.x, z: hj.z }; } }
      if (B.active && P.activeCd <= 0 && P.state === 'idle' && ((B.active === 'emp' && C.near(P.x, P.z, 6).length >= 2) || (B.active === 'lance' && td < 14) || (T.boss && td < 7))) a.active = true;
      // heat: vent into a crowd, or as soon as redline has paid for itself
      if (P.redline) { S.redT += dt; if (close >= 1 && S.redT > 2.5 || S.redT > 5 || run.hp < run.maxHp * 0.45) { a.vent = true; } } else S.redT = 0;
      if (!P.redline && P.heat > 70 && close >= 2) a.vent = true;
    } else if (T) { a.aimAt = { x: T.x, z: T.z }; if (P.redline) a.vent = true; }
    else if (P.redline) a.vent = true;
    // unstick
    if (Math.hypot(P.x - S.lx, P.z - S.lz) < 0.02 && (a.mx || a.mz) && P.state === 'idle') { S.stuckT += dt; if (S.stuckT > 0.6) { S.lastDir += 1.7; a.mx = Math.sin(S.lastDir); a.mz = Math.cos(S.lastDir); S.stuckT = 0.3; S.path = null; } } else S.stuckT = 0;
    S.lx = P.x; S.lz = P.z;
    return a;
  };
})();
