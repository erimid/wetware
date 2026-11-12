// Wetware — world: handmade room layouts, the painted room kit, collision
'use strict';
(function () {
  var Wd = W.world = {};
  var M = W.models, CS = 2;
  Wd.CS = CS;

  // Legend: # wall, . floor, ~ water, = raised dry deck, o pillar, c crates, p pump, s stall, L hanging lamp, v steam vent,
  //         x live cable (in water), k cargo drop zone, D door, E entry, (space) open drop with rail, special letters for hub props
  var R = Wd.ROOMS = {
    sumps: [
      { name: 'Low pump hall', map: [
        '###D###D###D###', '#.....L.......#', '#..~~.....~~..#', '#.~~~~...~~~~.#', '#.~~~~...~~~~.#', '#..~~.....~~..#', '#......L......#', '#.c.........p.#', '#.............#', '#......E......#', '###############'] },
      { name: 'Sluice crossing', map: [
        '###D###D###D###', '#..L.......L..#', '#.............#', '#..c.......o..#', '#~~~~==~~~==~~#', '#~~~~==~~~==~~#', '#~x~~==~~~==~~#', '#..o.......c..#', '#......L......#', '#......E......#', '###############'] },
      { name: 'Valve gallery', map: [
        '###D###D###D###', '#.....~~~.....#', '#.o.v.~~~.v.o.#', '#.....~~~.....#', '#L...........L#', '#~~~..o.o..~~~#', '#~~~.......~~~#', '#.....v.v.....#', '#.o....L....o.#', '#......E......#', '###############'] },
      { name: 'Drowned tunnel', map: [
        '###D###D###D###', '#~~~..L..~~~~~#', '#~~.......~~x~#', '#~..cc.....~~~#', '#~.........~~~#', '#~~~..~~~....~#', '#~x~~~~~~~...~#', '#~~~~~~~~..p.~#', '#~~...L......~#', '#~~....E...~~~#', '###############'] },
      { name: 'Pump pit', map: [
        '###D###D###D###', '#.............#', '#.L~~~~~~~~~L.#', '#.~~.......~~.#', '#.~..o...o..~.#', '#.~....v....~.#', '#.~..o...o..~.#', '#.~~.......~~.#', '#.L~~~~~~~~~L.#', '#......E......#', '###############'] },
      { name: 'Service junction', map: [
        '###D###D###D###', '#p....L.....p.#', '#.............#', '#..~~~o.o~~~..#', '#..~~~...~~~..#', '#v.~~~.x.~~~.v#', '#..~~~...~~~..#', '#.....o.o.....#', '#.c...L.....c.#', '#......E......#', '###############'] }
    ],
    market: [
      { name: 'Noodle row', map: [
        '###D###D###D###', '#.s.s.L.s.s.s.#', '#.............#', '#.............#', '#.s..~~~~~..s.#', '#....~~~~~....#', '#.s..........s#', '#......k......#', '#.c..L...L..c.#', '#......E......#', '###############'] },
      { name: 'Cable bazaar', map: [
        '###D###D###D###', '#s.L.s...s.L.s#', '#.............#', '#..o...k...o..#', '#.............#', '#.s.c..~..c.s.#', '#......~......#', '#..o...k...o..#', '#.....L.L.....#', '#......E......#', '###############'] },
      { name: 'Hanging walkways', map: [
        '###D###D###D###', '#.....L.......#', '#.ss.......ss.#', '#....     ....#', '#....     ....#', '#.L..     ..L.#', '#....     ....#', '#.c..v...v..c.#', '#.............#', '#......E......#', '###############'] },
      { name: 'Dye works', map: [
        '###D###D###D###', '#.s...L.....s.#', '#..~~~...~~~..#', '#..~~~.k.~~~..#', '#.............#', '#.o....s....o.#', '#.............#', '#..~~~.k.~~~..#', '#..~~~...~~~..#', '#.L....E....L.#', '###############'] },
      { name: 'Lantern court', map: [
        '###D###D###D###', '#.s.s.....s.s.#', '#......L......#', '#..o.......o..#', '#......~......#', '#.L...~~~...L.#', '#......~......#', '#..o.......o..#', '#.c....L....c.#', '#......E......#', '###############'] },
      { name: 'Cargo hoist', map: [
        '###D###D###D###', '#c...c.L.c...c#', '#.............#', '#..k...o...k..#', '#.............#', '#v....s.s....v#', '#.............#', '#..k...o...k..#', '#.c...L.L...c.#', '#......E......#', '###############'] }
    ],
    boss1: { name: 'Main pump hall', boss: true, map: [
      '#########D###########', '#...................#', '#.L...==.....==...L.#', '#.....==.....==.....#', '#...................#', '#....~~~~~~~~~~~....#', '#.==.~.........~.==.#', '#.==.~.........~.==.#', '#....~....B....~....#', '#.==.~.........~.==.#', '#.==.~.........~.==.#', '#....~~~~~~~~~~~....#', '#...................#', '#.....==.....==.....#', '#.L...==.....==...L.#', '#.........E.........#', '#####################'] },
    boss2: { name: 'The lantern exchange', boss: true, map: [
      '########D########', '#s.s...L...s.s.s#', '#...............#', '#..o.........o..#', '#...............#', '#.L.....~.....L.#', '#......~~~......#', '#.......~.......#', '#...............#', '#..o.........o..#', '#.L...........L.#', '#.......E.......#', '#################'] },
    hub: { name: "Mother Ruen's clinic", hub: true, map: [
      '######D######', '#p....L....c#', '#.T.......R.#', '#...........#', '#...........#', '#.M...L...b.#', '#...........#', '#.....E.....#', '#############'] },
    roof: { name: 'The landing pad', roof: true, map: [
      '#################', '#...............#', '#.......A.......#', '#...............#', '#.L...........L.#', '#...............#', '#.......E.......#', '#...............#', '#################'] },
    shop: { name: "Hask's stall", shop: true, map: [
      '###D###D###', '#c.......c#', '#....H....#', '#.........#', '#.L.....L.#', '#.........#', '#....E....#', '###########'] }
  };

  Wd.AREAS = {
    sumps: { wall: 0x566866, wall2: 0x7c8e86, floor: 0x5c6a66, floor2: 0x6e7c74, trim: 0x8a4a2a, water: [0.04, 0.125, 0.15], key: [0.84, 0.95, 0.96], amb: [0.5, 0.64, 0.68], shade: [0.2, 0.31, 0.4], rim: [0.25, 0.98, 0.86], lamp: [1.0, 0.55, 0.15], clear: 0x04090c, puddle: 0.5, rainK: 1 },
    market: { wall: 0x3a3632, wall2: 0x5c5046, floor: 0x46524e, floor2: 0x525e58, trim: 0xb8402a, water: [0.04, 0.1, 0.13], key: [0.92, 0.94, 0.9], amb: [0.5, 0.6, 0.62], shade: [0.17, 0.26, 0.34], rim: [1.0, 0.36, 0.2], lamp: [1.0, 0.42, 0.16], clear: 0x05060c, puddle: 0.72, rainK: 0.55 },
    hub: { wall: 0x5a7a6a, wall2: 0x8aaa96, floor: 0x4a5a52, floor2: 0x5a6a60, trim: 0x8a4a2a, water: [0.05, 0.14, 0.12], key: [0.9, 1.0, 0.94], amb: [0.55, 0.7, 0.64], shade: [0.2, 0.34, 0.34], rim: [0.56, 1.0, 0.7], lamp: [0.75, 1.0, 0.82], clear: 0x040a08, puddle: 0.35, rainK: 0.25 },
    roof: { wall: 0x5a5e5c, wall2: 0x7c807a, floor: 0x5c625e, floor2: 0x6a706a, trim: 0xd9a520, water: [0.46, 0.33, 0.22], key: [1.0, 0.88, 0.68], amb: [0.68, 0.68, 0.64], shade: [0.28, 0.36, 0.42], rim: [1.0, 0.82, 0.44], lamp: [1.0, 0.76, 0.46], clear: 0xd88a6a, puddle: 0.8, rainK: 0.8 }
  };

  // ---------- decal builder ----------
  function DecalBld() { this.pos = []; this.nor = []; this.uv = []; this.mat = []; this.idx = []; }
  // face: 's' (faces +z), 'e' (faces +x), 'w' (faces -x), 'u' (up)
  DecalBld.prototype.add = function (name, x, y, z, w, face, emis, rot) {
    var r = W.paint.rects[name]; if (!r) return;
    var h = w / r.aspect, hw = w / 2, hh = h / 2, base = this.pos.length / 3, c = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]], n;
    for (var i = 0; i < 4; i++) {
      var a = c[i][0], b = c[i][1];
      if (rot) { var ca = Math.cos(rot), sa = Math.sin(rot), t = a * ca - b * sa; b = a * sa + b * ca; a = t; }
      if (face === 's') { this.pos.push(x + a, y + b, z); n = [0, 0, 1]; }
      else if (face === 'e') { this.pos.push(x, y + b, z - a); n = [1, 0, 0]; }
      else if (face === 'w') { this.pos.push(x, y + b, z + a); n = [-1, 0, 0]; }
      else { this.pos.push(x + a, y, z - b); n = [0, 1, 0]; }
      this.nor.push(n[0], n[1], n[2]); this.mat.push(0, 0, emis || 0, (base * 0.137) % 1);
    }
    this.uv.push(r.u0, r.v0, r.u1, r.v0, r.u1, r.v1, r.u0, r.v1);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  DecalBld.prototype.build = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 4)); g.setIndex(this.idx);
    return g;
  };

  var envMat, decMat;
  function planeXZ(w, d) { var g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return g; }

  // ---------- build a room ----------
  Wd.build = function (def, areaKey, seed) {
    var G = W.gfx, rng = W.makeRng(seed || 1), A = Wd.AREAS[areaKey];
    if (!envMat) { envMat = G.paintMat({ env: true }); decMat = G.decalMat(); }
    var rows = def.map, Hh = rows.length, Ww = rows[0].length;
    var room = { def: def, area: areaKey, A: A, w: Ww, h: Hh, cells: [], solid: [], doors: [], lights: [], vents: [], cables: [], drops: [], props: {}, meshes: [], free: [], waterCells: [], time: 0 };
    var ox = -Ww * CS / 2, oz = -Hh * CS / 2;
    room.cx = function (c) { return ox + (c + 0.5) * CS; }; room.cz = function (r) { return oz + (r + 0.5) * CS; };
    room.minX = ox + CS; room.maxX = -ox - CS; room.minZ = oz + CS; room.maxZ = -oz - CS;
    var env = new M.Bld(), dec = new DecalBld(), lampCol = A.lamp;
    var WALLID = 0.5, FLOORID = 0.2, done = {};
    function ch(c, r) { return (r < 0 || r >= Hh || c < 0 || c >= Ww) ? '#' : rows[r][c]; }
    function lamp(x, y, z, rad, col, k) { room.lights.push({ x: x, y: y, z: z, r: rad, col: col || lampCol, k: k || 1, base: k || 1, flick: rng() }); }

    for (var r = 0; r < Hh; r++) {
      room.cells.push([]); room.solid.push([]);
      for (var c = 0; c < Ww; c++) {
        var k = ch(c, r), x = room.cx(c), z = room.cz(r), solid = false, floor = true, water = false, raised = false;
        if (k === '#') {
          solid = true; floor = false;
          var h = r === 0 ? 6.4 + rng() * 0.8 : (r === Hh - 1 ? 0.7 : (c === 0 || c === Ww - 1 ? 4.6 + rng() * 0.5 - (r / Hh) * 2.4 : 2.3));
          if (def.roof) h = 0.8;
          env.add(M.rbox(CS, h + 1, CS, 0.06), { p: [x, (h - 1) / 2, z] }, A.wall, 0, { grad: A.wall2, id: WALLID });
          if (r === 0 && !def.roof) decorateNorth(c, x, z + CS / 2 + 0.02, h);
          if ((c === 0 || c === Ww - 1) && r > 0 && r < Hh - 1 && !def.roof && rng() < 0.4) decorateSide(c === 0 ? 'e' : 'w', x + (c === 0 ? CS / 2 + 0.02 : -CS / 2 - 0.02), z);
        } else if (k === ' ') { solid = true; floor = false; }
        else if (k === 'D') { solid = true; floor = false; doorAt(c, r, x, z); }
        else if (k === '~' || k === 'x') { water = true; }
        else if (k === '=') { raised = true; }
        if (floor) {
          if (water) {
            env.add(planeXZ(CS, CS), { p: [x, -0.14, z] }, 0x1c3a3c, 0, { wet: 1, id: 0.9 });
            env.add(M.rbox(CS, 0.4, CS, 0.02), { p: [x, -0.75, z] }, 0x1a2224, 0, { id: 0.9 });
            room.waterCells.push({ c: c, r: r, x: x, z: z });
          } else {
            var fc = rng() < 0.5 ? A.floor : A.floor2, fy = raised ? 0.28 : 0;
            // big pours: some 2x2 blocks of plain floor become one slab, so the joints never read as a grid
            var plain = function (cc, rr) { var q = ch(cc, rr); return q !== '#' && q !== ' ' && q !== 'D' && q !== '~' && q !== 'x' && q !== '=' && !done[cc + ',' + rr]; };
            if (done[c + ',' + r]) { /* covered by a big slab */ }
            else if (!raised && plain(c + 1, r) && plain(c, r + 1) && plain(c + 1, r + 1) && rng() < 0.62) {
              done[(c + 1) + ',' + r] = done[c + ',' + (r + 1)] = done[(c + 1) + ',' + (r + 1)] = 1;
              env.add(M.rbox(CS * 2, 1.2, CS * 2, 0.035), { p: [x + CS / 2, -0.6, z + CS / 2] }, fc, 0, { id: FLOORID });
            } else
            env.add(M.rbox(CS, 1.2, CS, 0.035), { p: [x, fy - 0.6, z] }, raised ? A.trim : fc, 0, { id: raised ? 0.74 : FLOORID });
            if (raised) dec.add('hazard', x, fy + 0.012, z + 0.8, 1.9, 'u');
          }
          if (!solid && k !== 'o' && k !== 'c' && k !== 'p' && k !== 's') room.free.push({ c: c, r: r, x: x, z: z, water: water });
        }
        // props
        if (k === 'o') { solid = true; pillar(x, z); }
        else if (k === 'c') { solid = true; crates(x, z); }
        else if (k === 'p') { solid = true; pump(x, z); }
        else if (k === 's') { solid = true; stall(x, z, r); }
        else if (k === 'L') { hangLamp(x, z); }
        else if (k === 'v') { room.vents.push({ x: x, z: z, t: rng() * 4, state: 0 }); dec.add('grate', x, 0.012, z, 1.5, 'u'); }
        else if (k === 'x') { room.cables.push({ x: x, z: z, t: rng() * 5, state: 0 }); cableProp(x, z); }
        else if (k === 'k') { room.drops.push({ x: x, z: z, t: 2 + rng() * 5, state: 0 }); dec.add('hazard', x, 0.012, z, 1.9, 'u'); dec.add('hazard', x, 0.012, z, 1.9, 'u', 0, Math.PI / 2); }
        else if (k === 'E') { room.spawn = { x: x, z: z }; dec.add('arrow', x, 0.012, z + 0.3, 1.4, 'u', 0, Math.PI / 2); }
        else if (k === 'B') { room.bossPos = { x: x, z: z }; }
        else if ('TRMbHA'.indexOf(k) >= 0) { room.props[k] = { x: x, z: z }; hubProp(k, x, z); if (k !== 'A' && k !== 'M' && k !== 'H') solid = true; }
        if (k === ' ') railAt(c, r, x, z);
        room.cells[r].push(k); room.solid[r].push(solid);
        room['raised_' + c + '_' + r] = raised;
      }
    }
    // floor dressing
    var nDec = def.hub ? 3 : 7;
    for (var i = 0; i < nDec && room.free.length; i++) {
      var f = rng.pick(room.free); if (f.water) continue;
      var nm = rng.pick(['crack', 'crack', 'stencil' + rng.int(0, 5), 'manhole', 'grate', 'arrow']);
      dec.add(nm, f.x + rng.range(-0.3, 0.3), 0.012 + (room['raised_' + f.c + '_' + f.r] ? 0.28 : 0), f.z + rng.range(-0.3, 0.3), nm === 'crack' ? 2.0 : 1.4, 'u', 0, rng.int(0, 3) * Math.PI / 2);
    }
    backdrop();
    if (!def.roof && !def.hub) overhead();

    var envMesh = new THREE.Mesh(env.build(), envMat); envMesh.layers.enable(1); envMesh.frustumCulled = false;
    var decMesh = new THREE.Mesh(dec.build(), decMat); decMesh.frustumCulled = false; decMesh.renderOrder = 2;
    G.scene.add(envMesh); G.scene.add(decMesh); room.meshes.push(envMesh, decMesh);
    // flood plane (boss 1)
    if (def.boss && areaKey === 'sumps') {
      var fb = new M.Bld(); fb.add(planeXZ(Ww * CS - CS * 2, Hh * CS - CS * 2), {}, 0x1c3a3c, 0, { wet: 1, id: 0.9 });
      room.flood = new THREE.Mesh(fb.build(), envMat); room.flood.position.y = -0.6; G.scene.add(room.flood); room.meshes.push(room.flood); room.floodLevel = 0;
    }
    room.halfW = Ww * CS / 2; room.halfH = Hh * CS / 2;

    // ----- kit pieces -----
    function decorateNorth(c, x, z, h) {
      var roll = rng();
      if (areaKey === 'sumps' || areaKey === 'hub') {
        if (roll < 0.22) dec.add('poster' + rng.int(0, 5), x + rng.range(-0.2, 0.2), 1.9 + rng.range(-0.2, 0.3), z, 1.25, 's', 0, rng.range(-0.08, 0.08));
        else if (roll < 0.42) dec.add('stencil' + rng.int(0, 5), x, 3.4, z, 1.7, 's');
        else if (roll < 0.55) { dec.add('sign' + rng.pick([0, 1, 3, 4]), x, 4.3, z + 0.1, 1.9, 's', 1); lamp(x, 4.0, z + 0.8, 5.5, [1.0, 0.5, 0.2], 0.5); }
        else if (roll < 0.7) { // vertical pipe with flange
          env.add(M.cyl(0.22, h + 0.5, 10), { p: [x - 0.5, h / 2, z + 0.26] }, 0x6a4a34, 1, { grad: 0x9a6a44 });
          env.add(M.cyl(0.3, 0.14, 10), { p: [x - 0.5, 1.6, z + 0.26] }, 0x3a2e28, 1); env.add(M.cyl(0.3, 0.14, 10), { p: [x - 0.5, 4.2, z + 0.26] }, 0x3a2e28, 1);
        } else if (roll < 0.8) { dec.add('windows', x, 5.4, z, 1.8, 's', 0.8); }
        dec.add('hazard', x, 0.36, z, 2.0, 's');
      } else if (areaKey === 'market') {
        if (roll < 0.34) { dec.add('sign' + rng.int(0, 7), x, 3.4 + rng.range(0, 1.6), z + 0.12, rng.pick([1.9, 1.9, 0.9]), 's', 1); lamp(x, 3.6, z + 0.9, 5.5, rng.pick([[1.0, 0.4, 0.15], [0.3, 0.9, 0.7], [1.0, 0.75, 0.25]]), 0.5); }
        else if (roll < 0.52) dec.add('poster' + rng.int(0, 5), x + rng.range(-0.2, 0.2), 1.9 + rng.range(-0.2, 0.3), z, 1.25, 's', 0, rng.range(-0.08, 0.08));
        else if (roll < 0.66) dec.add('fac_' + rng.pick(W.paint.FKEYS), x, 3.0, z + 0.1, 1.5, 's', 0.9);
        else if (roll < 0.8) dec.add('windows', x, 5.2, z, 1.9, 's', 0.9);
        else dec.add('banner', x, 2.6, z, 1.95, 's');
        env.add(M.rbox(CS, 0.24, 0.3, 0.04), { p: [x, 2.3, z + 0.1] }, 0x2a1e1a, 0, { id: 0.6 });
      }
    }
    function decorateSide(face, x, z) {
      var nm = rng.pick(['poster' + rng.int(0, 5), 'stencil' + rng.int(0, 5), 'hazard']);
      dec.add(nm, x, nm === 'hazard' ? 0.4 : 1.8, z, nm === 'hazard' ? 2 : 1.2, face);
    }
    function doorAt(c, r, x, z) {
      // frame
      env.add(M.rbox(0.36, 4.6, 0.7, 0.06), { p: [x - 0.98, 2.1, z + 0.75] }, 0x2a3036, 1, { grad: 0x4a545c });
      env.add(M.rbox(0.36, 4.6, 0.7, 0.06), { p: [x + 0.98, 2.1, z + 0.75] }, 0x2a3036, 1, { grad: 0x4a545c });
      env.add(M.rbox(2.5, 0.6, 0.8, 0.08), { p: [x, 4.3, z + 0.75] }, 0x2a3036, 1, { grad: 0x4a545c });
      env.add(M.rbox(CS, 8, CS, 0.06), { p: [x, 3 + 4.6, z] }, A.wall, 0, { grad: A.wall2, id: WALLID });
      env.add(M.rbox(CS, 5, 0.3, 0.02), { p: [x, 2, z - 0.6] }, 0x05070a, 0, { id: 0.95 });
      env.add(M.rbox(CS, 1.2, CS, 0.035), { p: [x, -0.6, z] }, 0x2a3236, 0, { id: FLOORID });
      dec.add('hazard', x, 0.012, z + 1.15, 1.9, 'u');
      // leaf
      var lb = new M.Bld(); lb.add(M.rbox(1.64, 4.0, 0.22, 0.04), { p: [0, 2.0, 0] }, 0x4a3a2c, 1, { grad: 0x6a5238 });
      for (var i = 0; i < 4; i++) lb.add(M.rbox(1.66, 0.1, 0.26, 0.02), { p: [0, 0.6 + i * 0.95, 0] }, 0x1c1e22, 1);
      var leaf = new THREE.Mesh(lb.build(), envMat); leaf.position.set(x, 0, z + 0.7); leaf.layers.enable(1); G.scene.add(leaf); room.meshes.push(leaf);
      // lamps over the door
      function bulb(col) { var b = new M.Bld(); b.add(M.sph(0.2, 10, 8), {}, col, 2, { emis: 1 }); b.add(M.cyl(0.26, 0.12, 10), { p: [0, 0.16, 0] }, 0x14181c, 1); var m = new THREE.Mesh(b.build(), envMat); m.position.set(x, 4.9, z + 1.2); G.scene.add(m); room.meshes.push(m); return m; }
      var off = bulb(0x5a1a12), on = bulb(0xa8ffb0); on.visible = false;
      var d = { c: c, r: r, x: x, z: z + CS / 2 + 0.2, leaf: leaf, lampOff: off, lampOn: on, open: false, openK: 0, reward: null, active: false, light: { x: x, y: 4.6, z: z + 1.6, r: 5, col: [0.5, 1.0, 0.6], k: 0, base: 0, flick: 0 } };
      room.lights.push(d.light); room.doors.push(d);
    }
    function pillar(x, z) {
      if (areaKey === 'market') {
        env.add(M.rbox(1.3, 3.6, 1.3, 0.08), { p: [x, 1.5, z] }, 0x2e2a30, 1, { grad: 0x4a4650 }); env.add(M.rbox(1.5, 0.3, 1.5, 0.05), { p: [x, 3.3, z] }, 0x7a2a1a, 0);
        env.add(M.rbox(1.5, 0.4, 1.5, 0.06), { p: [x, 0.2, z] }, 0x7a2a1a, 0);
        dec.add(rng.pick(['poster0', 'poster3', 'fac_orrin', 'fac_quiet']), x, 1.9, z + 0.66, 1.0, 's'); dec.add('lanternp', x + 0.66, 2.6, z, 0.7, 'e', 1);
        lamp(x + 1.0, 2.6, z, 4, [1.0, 0.5, 0.2], 0.45);
      } else {
        env.add(M.cyl(0.72, 3.4, 16), { p: [x, 1.4, z] }, A.wall, 0, { grad: A.wall2 }); env.add(M.cyl(0.84, 0.3, 16), { p: [x, 3.1, z] }, 0x3a4444, 0);
        env.add(M.cyl(0.9, 0.5, 16), { p: [x, 0.25, z] }, 0x3a4444, 0); env.add(M.cyl(0.84, 0.2, 16), { p: [x, 2.2, z] }, 0x8a4a2a, 1);
        dec.add('stencil' + rng.int(0, 5), x, 1.5, z + 0.79, 1.0, 's');
      }
    }
    function crates(x, z) {
      var n = rng.int(1, 3);
      env.add(M.rbox(1.5, 1.1, 1.5, 0.06), { p: [x, 0.55, z], r: [0, rng.range(-0.15, 0.15), 0] }, 0x6a5a3a, 0, { grad: 0x8a744a });
      env.add(M.rbox(1.56, 0.14, 1.56, 0.03), { p: [x, 0.3, z] }, 0x2a2420, 0);
      if (n > 1) env.add(M.rbox(1.1, 0.9, 1.1, 0.06), { p: [x + 0.1, 1.55, z - 0.1], r: [0, rng.range(-0.4, 0.4), 0] }, 0x4a5a5a, 0, { grad: 0x66787a });
      if (n > 2) env.add(M.cyl(0.36, 0.9, 12), { p: [x - 0.4, 2.45, z + 0.1] }, 0x8a3a1a, 1, { grad: 0xb8502a });
      dec.add('stencil' + rng.int(0, 5), x, 0.62, z + 0.77, 1.0, 's');
    }
    function pump(x, z) {
      env.add(M.cyl(0.85, 2.6, 16), { p: [x, 1.3, z] }, 0x6a3e26, 1, { grad: 0x9a6238 });
      env.add(M.cyl(0.95, 0.2, 16), { p: [x, 0.6, z] }, 0x2a2420, 1); env.add(M.cyl(0.95, 0.2, 16), { p: [x, 2.0, z] }, 0x2a2420, 1);
      env.add(M.tor(0.42, 0.06), { p: [x, 1.4, z + 0.95] }, 0xb8402a, 1); env.add(M.cyl(0.07, 0.3, 6), { p: [x, 1.4, z + 0.85], r: [Math.PI / 2, 0, 0] }, 0x2a2420, 1);
      env.add(M.tube([[x, 2.6, z], [x, 3.6, z], [x + 0.3, 4.2, z - 0.6], [x + 0.3, 4.4, z - 1.6]], 0.2, 12, 8), {}, 0x6a4a34, 1);
      env.add(M.sph(0.14, 8, 6), { p: [x + 0.6, 2.2, z + 0.6] }, 0xff5a2a, 2, { emis: 0.8 });
    }
    function stall(x, z, r) {
      var cols = rng.pick([[0xb8402a, 0xe8dcc0], [0x2a6a5a, 0xe8dcc0], [0xd9a520, 0x8a2a1a], [0x3a4a8a, 0xe8dcc0]]);
      env.add(M.rbox(1.8, 1.0, 1.3, 0.06), { p: [x, 0.5, z] }, 0x5a3e2a, 0, { grad: 0x7a5a3a });
      env.add(M.rbox(1.9, 0.1, 1.4, 0.03), { p: [x, 1.04, z] }, 0x2a1e16, 0);
      for (var i = 0; i < 4; i++) env.add(M.cyl(0.05, 2.9, 6), { p: [x + (i % 2 ? 0.85 : -0.85), 1.45, z + (i < 2 ? 0.6 : -0.6)] }, 0x2a1e16, 0);
      for (i = 0; i < 5; i++) env.add(M.rbox(0.42, 0.06, 1.9, 0.02), { p: [x - 0.84 + i * 0.42, 2.9 - 0.0, z + 0.1], r: [0.32, 0, 0] }, cols[i % 2], 3, { id: 0.66 });
      for (i = 0; i < 4; i++) { var gx = x - 0.6 + i * 0.4; if (rng() < 0.5) env.add(M.sph(0.15, 8, 6), { p: [gx, 1.2, z + 0.2] }, rng.pick([0xe86a2a, 0x8fe04a, 0xe8d24a, 0xd8d8d0]), 0); else env.add(M.rbox(0.26, 0.3, 0.26, 0.04), { p: [gx, 1.24, z - 0.1] }, rng.pick([0x49a0c0, 0xc84a3a, 0xe8dcc0]), 0); }
      env.add(M.cyl(0.16, 0.34, 10), { p: [x + 0.6, 2.3, z + 0.7] }, 0xff8a3a, 2, { emis: 1 });
      lamp(x + 0.6, 2.2, z + 1.0, 4.2, [1.0, 0.45, 0.16], 0.5);
      dec.add('sign' + rng.int(0, 7), x, 0.5, z + 0.67, 1.3, 's', 0);
    }
    function hangLamp(x, z) {
      if (areaKey === 'market') {
        env.add(M.cyl(0.012, 3, 4), { p: [x, 8.6, z] }, 0x0c0e12, 0, { id: 0.5 });
        for (var i = 0; i < 3; i++) { var lx = x + (i - 1) * 0.36, ly = 7.0 - (i % 2) * 0.36; env.add(M.lathe([[0.03, 0.2], [0.13, 0.15], [0.17, 0], [0.13, -0.15], [0.03, -0.2]], 10), { p: [lx, ly, z] }, i === 1 ? 0xffa040 : 0xff5a2a, 2, { emis: 1 }); env.add(M.cyl(0.05, 0.05, 8), { p: [lx, ly + 0.22, z] }, 0x14161a, 1); }
        lamp(x, 3.6, z, 9, lampCol, 1.0);
      } else {
        env.add(M.cyl(0.012, 3, 4), { p: [x, 8.6, z] }, 0x0c0e12, 0, { id: 0.5 });
        env.add(M.lathe([[0.04, 0.16], [0.08, 0.14], [0.22, 0.0], [0.23, -0.03], [0.18, -0.02], [0.06, 0.1]], 10), { p: [x, 7.1, z] }, 0x2a3a36, 1, { grad: 0x4a5a56 });
        env.add(M.sph(0.11, 8, 6), { p: [x, 7.04, z] }, areaKey === 'hub' ? 0xc8ffd8 : 0xffb347, 2, { emis: 1 });
        lamp(x, 3.8, z, def.roof ? 8 : 9.5, lampCol, 1.0);
      }
    }
    function cableProp(x, z) {
      env.add(M.tube([[x - 0.8, 2.6, z - 0.9], [x - 0.3, 0.9, z - 0.3], [x, -0.1, z], [x + 0.4, -0.2, z + 0.5]], 0.07, 14, 6), {}, 0x14161a, 0);
      env.add(M.sph(0.12, 8, 6), { p: [x, -0.05, z] }, 0xfff2a0, 2, { emis: 1 });
    }
    function railAt(c, r, x, z) {
      // rail on sides that touch walkable floor
      var nb = [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']];
      nb.forEach(function (d) {
        var k2 = ch(c + d[0], r + d[1]); if (k2 === ' ' || k2 === '#') return;
        var px = x + d[0] * (CS / 2 - 0.08), pz = z + d[1] * (CS / 2 - 0.08), horiz = d[0] === 0;
        env.add(M.rbox(horiz ? CS : 0.1, 0.1, horiz ? 0.1 : CS, 0.03), { p: [px, 1.05, pz] }, 0xb8402a, 1);
        env.add(M.rbox(horiz ? CS : 0.06, 0.06, horiz ? 0.06 : CS, 0.02), { p: [px, 0.55, pz] }, 0x2a1e1a, 1);
        env.add(M.cyl(0.06, 1.1, 6), { p: [px + (horiz ? -0.95 : 0), 0.55, pz + (horiz ? 0 : -0.95)] }, 0x2a1e1a, 1);
      });
      // lights far below
      if (rng() < 0.6) env.add(M.rbox(0.5, 0.1, 0.3, 0.02), { p: [x + rng.range(-0.6, 0.6), -9 - rng() * 6, z + rng.range(-0.6, 0.6)] }, rng.pick([0xffa040, 0xff5a2a, 0x59e0c0]), 2, { emis: 1 });
    }
    function hubProp(k, x, z) {
      if (k === 'T') { // surgery table
        env.add(M.rbox(1.5, 0.22, 3.0, 0.06), { p: [x, 1.0, z] }, 0xc8d4cc, 1, { grad: 0xe8f0e8 });
        env.add(M.cyl(0.2, 1.0, 10), { p: [x, 0.5, z] }, 0x39424a, 1); env.add(M.cyl(0.6, 0.12, 12), { p: [x, 0.06, z] }, 0x2a2e34, 1);
        env.add(M.tube([[x - 0.9, 0, z - 1.2], [x - 0.9, 2.6, z - 1.2], [x - 0.4, 3.1, z - 0.6], [x, 2.9, z]], 0.06, 14, 6), {}, 0x39424a, 1);
        env.add(M.lathe([[0.05, 0.2], [0.5, 0], [0.5, -0.06], [0.1, 0.02]], 14), { p: [x, 2.85, z] }, 0xd8e4dc, 1); env.add(M.sph(0.18, 8, 6), { p: [x, 2.78, z] }, 0xc8ffd8, 2, { emis: 1 });
        lamp(x, 2.6, z, 7, [0.6, 1.0, 0.75], 1.1);
        env.add(M.rbox(0.7, 0.9, 0.5, 0.05), { p: [x + 1.3, 0.45, z - 0.9] }, 0x7fb6a0, 1); for (var i = 0; i < 3; i++) env.add(M.cyl(0.05, 0.3, 6), { p: [x + 1.1 + i * 0.2, 1.05, z - 0.9] }, [0xff5a2a, 0x8fe04a, 0x49d3ff][i], 2, { emis: 0.7 });
      } else if (k === 'R') { // weapon rack
        env.add(M.rbox(1.9, 2.8, 0.3, 0.05), { p: [x, 1.4, z - 0.5] }, 0x3a2e26, 0, { grad: 0x5a463a });
        var wb = new M.Bld();
        ['baton', 'carbine', 'hammer'].forEach(function (w, i) { var t = M.weaponTpl(w, 0x9ff4ff)(); env.add(t.parts[0].geo, { p: [x - 0.6 + i * 0.6, 2.4, z - 0.28] }, 0xffffff, 0); remap(env, t.parts[0].geo); });
        dec.add('fac_ninefold', x, 3.4, z - 0.34, 1.0, 's', 0.8);
      } else if (k === 'b') { // bounty board
        env.add(M.rbox(2.0, 1.6, 0.16, 0.04), { p: [x, 1.9, z - 0.3] }, 0x5a4636, 0, { grad: 0x6a5642 });
        env.add(M.cyl(0.07, 2.0, 6), { p: [x - 0.8, 1.0, z - 0.3] }, 0x2a2420, 0); env.add(M.cyl(0.07, 2.0, 6), { p: [x + 0.8, 1.0, z - 0.3] }, 0x2a2420, 0);
        dec.add('poster0', x - 0.5, 1.95, z - 0.2, 0.8, 's', 0, -0.06); dec.add('poster3', x + 0.45, 1.9, z - 0.2, 0.8, 's', 0, 0.07);
      } else if (k === 'M') { env.add(M.cyl(0.4, 0.6, 12), { p: [x + 0.9, 0.3, z] }, 0x6a4a34, 1); }
      else if (k === 'H') { // vending stall
        stall(x, z - 1.2, 0); stall(x - 2, z - 1.2, 0); stall(x + 2, z - 1.2, 0);
      }
    }
    function hubDress() {
      var z0 = oz + CS + 0.45, x0 = ox + CS, x1 = -ox - CS;
      for (var i = 0; i < 5; i++) { var sx = x0 + 2.2 + i * 4.3; if (Math.abs(sx) < 2.2) continue;
        env.add(M.rbox(2.6, 0.12, 0.7, 0.03), { p: [sx, 2.1, z0] }, 0x3a2e26, 0); env.add(M.rbox(2.6, 0.12, 0.7, 0.03), { p: [sx, 3.2, z0] }, 0x3a2e26, 0);
        for (var j = 0; j < 5; j++) { var jx = sx - 1.0 + j * 0.5, jy = rng() < 0.5 ? 2.16 : 3.26; if (rng() < 0.6) { env.add(M.cyl(0.16, 0.5, 10), { p: [jx, jy + 0.25, z0] }, rng.pick([0x8fe04a, 0x49d3ff, 0xffb347, 0xff4058]), 2, { emis: 0.55 }); env.add(M.cyl(0.18, 0.08, 10), { p: [jx, jy + 0.54, z0] }, 0x1c2026, 1); } else env.add(M.rbox(0.36, 0.4, 0.4, 0.04), { p: [jx, jy + 0.2, z0] }, rng.pick([0x7fb6a0, 0xc8c4b0, 0x8a4a2a]), 0); }
      }
      for (i = 0; i < 4; i++) { var bx = rng.range(x0 + 1, x1 - 1), bz = rng.range(oz + CS * 3, -oz - CS * 2); if (Math.abs(bx) < 3 && Math.abs(bz) < 4) continue; env.add(M.tube([[bx, 0.05, bz], [bx + 1.5, 0.05, bz + rng.range(-1, 1)], [bx + 3, 0.05, bz + rng.range(-1.5, 1.5)]], 0.05, 16, 5), {}, 0x14161a, 0); }
      env.add(M.rbox(1.2, 0.5, 2.6, 0.08), { p: [x1 - 0.8, 0.25, 4.0] }, 0x4a5a52, 0, { grad: 0x7a9a86 }); env.add(M.rbox(1.24, 0.3, 0.9, 0.06), { p: [x1 - 0.8, 0.62, 3.2] }, 0xc8c4b0, 3);
      env.add(M.rbox(0.9, 1.5, 0.9, 0.06), { p: [x0 + 0.7, 0.75, 5.2] }, 0x5a7a6a, 1, { grad: 0x8aaa96 }); env.add(M.sph(0.12, 8, 6), { p: [x0 + 0.7, 1.2, 5.68] }, 0xff5a2a, 2, { emis: 1 });
      dec.add('fac_quiet', x0 + 0.7, 1.0, 5.67, 0.7, 's', 0.6);
      lamp(x0 + 3, 2.4, z0 + 1.2, 5, [0.5, 1.0, 0.6], 0.5); lamp(x1 - 3, 2.4, z0 + 1.2, 5, [1.0, 0.6, 0.25], 0.6);
    }
    if (def.hub) hubDress();
    function remap(b, geo) {
      var n = geo.attributes.position.count, start = b.col.length / 3 - n, ca = geo.attributes.aCol, ma = geo.attributes.aMat;
      for (var i = 0; i < n; i++) { b.col[(start + i) * 3] = ca.getX(i); b.col[(start + i) * 3 + 1] = ca.getY(i); b.col[(start + i) * 3 + 2] = ca.getZ(i); for (var j = 0; j < 4; j++) b.mat[(start + i) * 4 + j] = ma.array[i * 4 + j]; }
    }
    function backdrop() {
      var nz = oz - 1.5;
      if (def.roof) {
        // dawn city below the pad: tower tops and a painted sky wall
        for (var i = 0; i < 16; i++) {
          var bx = -44 + i * 6 + rng.range(-1.5, 1.5), bh = 6 + rng() * 16, bz = nz - 14 - rng() * 22, bw = 4 + rng() * 4;
          env.add(M.rbox(bw, bh + 30, bw, 0.2), { p: [bx, bh / 2 - 15 - 6, bz] }, 0x4a4456, 0, { grad: 0xc88a7a, id: 0.4 });
          if (rng() < 0.7) dec.add('windows', bx, bh - 9, bz + bw / 2 + 0.05, bw * 0.8, 's', 0.6);
        }
        return;
      }
      for (var i2 = 0; i2 < 9; i2++) {
        var x = ox + (i2 + 0.5) * (Ww * CS / 9) + rng.range(-1, 1), hgt = 13 + rng() * 14, wid = 5 + rng() * 4, z = nz - 5 - rng() * 9;
        env.add(M.rbox(wid, hgt, 5, 0.15), { p: [x, hgt / 2, z] }, areaKey === 'market' ? 0x232838 : 0x26343a, 0, { grad: areaKey === 'market' ? 0x3a4058 : 0x44585a, id: 0.4 });
        for (var j = 0; j < 3; j++) if (rng() < 0.75) dec.add('windows', x + rng.range(-0.6, 0.6), 8.5 + j * 3.4, z + 2.52, Math.min(wid * 0.8, 4.4), 's', 0.75);
        if (rng() < 0.5) dec.add('sign' + rng.pick([2, 5]), x + wid / 2 - 0.5, 10 + rng() * 4, z + 2.56, 0.9, 's', 1);
      }
      // the Stack looms over everything in the Sumps
      if (areaKey === 'sumps') { env.add(M.rbox(16, 60, 8, 0.4), { p: [6, 30, nz - 22] }, 0x1c2a30, 0, { grad: 0x2e4044, id: 0.45 }); for (var q = 0; q < 6; q++) dec.add('windows', 2 + (q % 2) * 7, 16 + Math.floor(q / 2) * 6, nz - 17.9, 5, 's', 0.6); }
    }
    function overhead() {
      // cables and laundry strung above the north rows (they overlap the wall, not the fight)
      var n = areaKey === 'market' ? 3 : 2;
      for (var i = 0; i < n; i++) {
        var z = oz + CS * (1.2 + i * 0.5), y = 5.4 + i * 0.5, x0 = ox + 1, x1 = -ox - 1, sag = 0.7 + rng() * 0.6, pts = [];
        for (var s = 0; s <= 8; s++) { var t = s / 8; pts.push([W.lerp(x0, x1, t), y - Math.sin(t * Math.PI) * sag, z]); }
        env.add(M.tube(pts, 0.03, 32, 5), {}, 0x0c0e12, 0, { id: 0.5 });
        if (areaKey === 'market' || i === 0) {
          for (s = 1; s < 14; s++) {
            if (rng() < 0.4) continue; var t2 = s / 14, lx = W.lerp(x0, x1, t2), ly = y - Math.sin(t2 * Math.PI) * sag;
            if (areaKey === 'market' && rng() < 0.4) { env.add(M.sph(0.14, 8, 6), { p: [lx, ly - 0.2, z] }, rng.pick([0xffa040, 0xff5a2a, 0xffd070]), 2, { emis: 1 }); }
            else { var cw = 0.5 + rng() * 0.5, chh = 0.6 + rng() * 0.6; env.add(M.rbox(cw, chh, 0.04, 0.015), { p: [lx, ly - chh / 2 - 0.02, z], r: [0, 0, rng.range(-0.06, 0.06)] }, rng.pick([0xc8c0a8, 0x8a3a2a, 0x3a6a7a, 0xb89a4a, 0x6a7a5a, 0xd8d0c0]), 3, { id: 0.55 + rng() * 0.2 }); }
          }
        }
      }
    }
    return room;
  };

  Wd.dispose = function (room) {
    if (!room) return;
    room.meshes.forEach(function (m) { W.gfx.scene.remove(m); if (m.geometry) m.geometry.dispose(); });
    room.meshes.length = 0;
  };

  // ---------- queries & collision ----------
  Wd.cellAt = function (room, x, z) {
    var c = Math.floor((x + room.w * CS / 2) / CS), r = Math.floor((z + room.h * CS / 2) / CS);
    return { c: c, r: r };
  };
  Wd.solidAt = function (room, c, r) { return r < 0 || r >= room.h || c < 0 || c >= room.w || room.solid[r][c]; };
  Wd.isSolid = function (room, x, z) { var p = Wd.cellAt(room, x, z); return Wd.solidAt(room, p.c, p.r); };
  Wd.isWater = function (room, x, z) {
    var p = Wd.cellAt(room, x, z); if (p.r < 0 || p.r >= room.h || p.c < 0 || p.c >= room.w) return false;
    var k = room.cells[p.r][p.c];
    if (room.flooded && k !== '=' && !room.solid[p.r][p.c]) return true;
    return k === '~' || k === 'x';
  };
  Wd.floorY = function (room, x, z) {
    var p = Wd.cellAt(room, x, z); if (p.r < 0 || p.r >= room.h || p.c < 0 || p.c >= room.w) return 0;
    var k = room.cells[p.r][p.c];
    if (k === '=') return 0.28;
    if (k === '~' || k === 'x') return -0.3;
    if (room.flooded) return -0.12;
    return 0;
  };
  // resolve a circle against solid cells; returns true if pushed
  Wd.resolve = function (room, e, rad) {
    var hit = false, hx = room.w * CS / 2, hz = room.h * CS / 2;
    var c0 = Math.floor((e.x - rad + hx) / CS), c1 = Math.floor((e.x + rad + hx) / CS), r0 = Math.floor((e.z - rad + hz) / CS), r1 = Math.floor((e.z + rad + hz) / CS);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
      if (!Wd.solidAt(room, c, r)) continue;
      var bx0 = c * CS - hx, bz0 = r * CS - hz, bx1 = bx0 + CS, bz1 = bz0 + CS;
      var nx = W.clamp(e.x, bx0, bx1), nz = W.clamp(e.z, bz0, bz1), dx = e.x - nx, dz = e.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= rad * rad) continue;
      hit = true;
      if (d2 > 1e-8) { var d = Math.sqrt(d2), push = rad - d; e.x += dx / d * push; e.z += dz / d * push; Wd._nx = dx / d; Wd._nz = dz / d; }
      else { // centre inside the cell: push out the shortest way
        var l = e.x - bx0, rr = bx1 - e.x, u = e.z - bz0, dn = bz1 - e.z, m = Math.min(l, rr, u, dn);
        if (m === l) { e.x = bx0 - rad; Wd._nx = -1; Wd._nz = 0; } else if (m === rr) { e.x = bx1 + rad; Wd._nx = 1; Wd._nz = 0; } else if (m === u) { e.z = bz0 - rad; Wd._nx = 0; Wd._nz = -1; } else { e.z = bz1 + rad; Wd._nx = 0; Wd._nz = 1; }
      }
    }
    return hit;
  };
  // move with substeps so nothing tunnels; returns true if a wall was touched
  Wd.move = function (room, e, dx, dz, rad) {
    var dist = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(dist / 0.3)), hit = false;
    for (var i = 0; i < steps; i++) {
      e.x += dx / steps; e.z += dz / steps;
      if (Wd.resolve(room, e, rad)) { hit = true; Wd.resolve(room, e, rad); }
    }
    return hit;
  };
  // straight-line wall test
  Wd.blocked = function (room, ax, az, bx, bz) {
    var d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5);
    for (var i = 1; i < n; i++) { var t = i / n; if (Wd.isSolid(room, ax + (bx - ax) * t, az + (bz - az) * t)) return true; }
    return false;
  };
  Wd.freeSpot = function (room, rng, awayX, awayZ, minD, maxD) {
    for (var i = 0; i < 40; i++) {
      var f = rng.pick(room.free), d = W.dist(f.x, f.z, awayX, awayZ);
      if (d >= (minD || 0) && d <= (maxD || 999)) return { x: f.x + rng.range(-0.5, 0.5), z: f.z + rng.range(-0.5, 0.5) };
    }
    var f2 = rng.pick(room.free); return { x: f2.x, z: f2.z };
  };
})();
