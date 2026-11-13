// Wetware — data: body grid, implants, sets, fusions, weapons, gear, meta board, lines
'use strict';
(function () {
  var D = W.data = {};

  // ---------- the body grid ----------
  // [col, row, zone, tier]  tier = how many "more cells" upgrades are needed
  D.CELLS = [
    [2, 0, 'head', 3], [3, 0, 'head', 1], [4, 0, 'head', 3], [2, 1, 'head', 0], [3, 1, 'head', 0], [4, 1, 'head', 2],
    [0, 2, 'armL', 2], [1, 2, 'armL', 0], [0, 3, 'armL', 1], [1, 3, 'armL', 0], [0, 4, 'armL', 3], [1, 4, 'armL', 4],
    [5, 2, 'armR', 0], [6, 2, 'armR', 2], [5, 3, 'armR', 0], [6, 3, 'armR', 1], [6, 4, 'armR', 3], [5, 4, 'armR', 4],
    [2, 2, 'heart', 0], [3, 2, 'heart', 0], [2, 3, 'heart', 1], [3, 3, 'heart', 2],
    [4, 2, 'spine', 0], [4, 3, 'spine', 0], [4, 4, 'spine', 1], [3, 4, 'spine', 3], [2, 4, 'spine', 4],
    [2, 5, 'legs', 0], [3, 5, 'legs', 0], [4, 5, 'legs', 0], [2, 6, 'legs', 1], [4, 6, 'legs', 1], [2, 7, 'legs', 2], [4, 7, 'legs', 3], [3, 6, 'legs', 4]
  ];
  D.ZONE_NAME = { head: 'Head and eyes', armL: 'Left arm', armR: 'Right arm', heart: 'Heart', spine: 'Spine', legs: 'Legs' };
  D.cellMap = function (tier) {
    var m = {};
    D.CELLS.forEach(function (c) { m[c[0] + ',' + c[1]] = { zone: c[2], open: c[3] <= tier, tier: c[3] }; });
    return m;
  };
  var SH = D.SHAPES = { I1: [[0, 0]], I2: [[0, 0], [1, 0]], I3: [[0, 0], [1, 0], [2, 0]], L3: [[0, 0], [1, 0], [0, 1]], O4: [[0, 0], [1, 0], [0, 1], [1, 1]], T4: [[0, 0], [1, 0], [2, 0], [1, 1]] };
  D.rotate = function (shape, n) {
    var s = shape.map(function (p) { return [p[0], p[1]]; });
    for (var i = 0; i < (n % 4); i++) s = s.map(function (p) { return [-p[1], p[0]]; });
    var mx = 1e9, my = 1e9; s.forEach(function (p) { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); });
    return s.map(function (p) { return [p[0] - mx, p[1] - my]; });
  };

  // ---------- implants ----------
  // zone: 'arm' means either arm. heat: text only; numbers live in combat.
  var IMP = D.IMPLANTS = {
    ram_servo: { name: 'Ram servo', f: 'orrin', zone: 'arm', shape: 'I2', text: 'Knockback +50%. Enemies thrown into walls take 14 damage.', heat: '+6 heat per wall slam', mod: { kb: 0.5, wallDmg: 14 } },
    plate_lattice: { name: 'Plate lattice', f: 'orrin', zone: 'spine', shape: 'I2', text: 'Take 20% less damage.', heat: '+0.6 heat each second', mod: { dmgTaken: -0.2, passiveHeat: 0.6 } },
    piston_heel: { name: 'Piston heel', f: 'orrin', zone: 'legs', shape: 'I2', text: 'Your dash ends in a shockwave that hits and shoves.', heat: '+5 heat per dash', mod: { dashShock: 1 } },
    kinetic_heart: { name: 'Kinetic heart', f: 'orrin', zone: 'heart', shape: 'L3', text: 'In redline: knockback x1.6 and wall slams hit twice as hard.', heat: 'Rewards redline', mod: { redKb: 0.6, redWall: 1, wallDmg: 8 } },
    ballast_knuckle: { name: 'Ballast knuckle', f: 'orrin', zone: 'arm', shape: 'I1', text: '+25% damage to stunned enemies.', heat: 'No heat', mod: { stunDmg: 0.25 } },
    siege_frame: { name: 'Siege frame', f: 'orrin', zone: 'spine', shape: 'I3', text: '+25 health while installed. Every hit breaks shields.', heat: '+0.4 heat each second', mod: { maxHp: 25, breaker: 1, passiveHeat: 0.4 }, unlock: 1 },

    arc_coil: { name: 'Arc coil', f: 'ninefold', zone: 'arm', shape: 'I2', text: 'Every third hit chains a shock to 2 more enemies.', heat: '+8 heat per chain', mod: { chainEvery: 3 } },
    skeleton_key: { name: 'Skeleton key', f: 'ninefold', zone: 'head', shape: 'I1', text: 'Your tag drone hijacks turrets and drones, and finishes weak enemies.', heat: '+8 heat per hijack', mod: { hijack: 1 } },
    static_spine: { name: 'Static spine', f: 'ninefold', zone: 'spine', shape: 'I2', text: 'Your vent ring stuns for 1.5 seconds.', heat: 'No heat', mod: { ventStun: 1.5 } },
    cull_daemon: { name: 'Cull daemon', f: 'ninefold', zone: 'head', shape: 'I2', text: 'A hit on an enemy under 20% health kills it and shocks its neighbours.', heat: '+3 heat per cull', mod: { cull: 0.2 } },
    overclock: { name: 'Overclock', f: 'ninefold', zone: 'heart', shape: 'I2', text: 'Active (F): a pulse stuns everything near you.', heat: '+25 heat per use', mod: { active: 'emp' } },
    choir_node: { name: 'Choir node', f: 'ninefold', zone: 'head', shape: 'L3', text: 'Shocks jump to 2 more enemies. Hijacked machines stay yours.', heat: '+0.5 heat each second', mod: { chainTargets: 2, hijackLong: 1, passiveHeat: 0.5 }, unlock: 2 },

    toxin_gland: { name: 'Toxin gland', f: 'quiet', zone: 'arm', shape: 'I2', text: 'Hits add a stack of toxin. Stacks burn for 4 seconds.', heat: '+2 heat per hit', mod: { toxOnHit: 1 } },
    slow_bloom: { name: 'Slow bloom', f: 'quiet', zone: 'legs', shape: 'I2', text: 'Your dash leaves a field that slows enemies.', heat: '+4 heat per dash', mod: { slowField: 1 } },
    marrow_drip: { name: 'Marrow drip', f: 'quiet', zone: 'heart', shape: 'I2', text: 'While cold (heat under 40): killing a poisoned enemy mends 2 health.', heat: 'Rewards staying cold', mod: { drip: 2 } },
    coolant_sac: { name: 'Coolant sac', f: 'quiet', zone: 'spine', shape: 'I2', text: 'Heat fades 3x faster. +20% damage while heat is under 30.', heat: 'Rewards staying cold', mod: { heatDecay: 2, coldDmg: 0.2 } },
    spore_deck: { name: 'Spore deck', f: 'quiet', zone: 'head', shape: 'I1', text: 'Your tag drone bursts into spores: 3 toxin stacks on all nearby.', heat: '+3 heat per burst', mod: { sporeTag: 1 } },
    black_lung: { name: 'Black lung', f: 'quiet', zone: 'heart', shape: 'L3', text: 'Your vent leaves a toxic cloud. More heat, more stacks.', heat: 'Rewards big vents', mod: { blackLung: 1 }, unlock: 3 },

    marking_eye: { name: 'Marking eye', f: 'halcyon', zone: 'head', shape: 'I2', text: 'Every fourth hit marks. Marked enemies take +30% damage.', heat: '+4 heat per mark', mod: { markEvery: 4 } },
    hairline_optic: { name: 'Hairline optic', f: 'halcyon', zone: 'head', shape: 'I1', text: '+15% critical chance.', heat: 'No heat', mod: { crit: 0.15 } },
    stillframe: { name: 'Stillframe', f: 'halcyon', zone: 'legs', shape: 'I2', text: 'A perfect dodge slows time for 1.4 seconds.', heat: '+8 heat per slow', mod: { stillframe: 1 } },
    glass_nerve: { name: 'Glass nerve', f: 'halcyon', zone: 'spine', shape: 'I2', text: 'In redline: +35% critical chance.', heat: '+1 heat each second', mod: { redCrit: 0.35, passiveHeat: 1 } },
    lance: { name: 'Lance', f: 'halcyon', zone: 'arm', shape: 'L3', text: 'Active (F): a beam that pierces everything and marks it.', heat: '+20 heat per use', mod: { active: 'lance' } },
    dawn_eye: { name: 'Dawn eye', f: 'halcyon', zone: 'head', shape: 'L3', text: 'Critical hits shed 6 heat and refresh your dash.', heat: 'Sheds heat', mod: { dawn: 1, crit: 0.08 }, unlock: 4 },

    // second wave of stock
    anvil_plate: { name: 'Anvil plate', f: 'orrin', zone: 'spine', shape: 'I1', text: 'Hits against armour and shields deal double.', heat: 'No heat', mod: { armorDmg: 1 } },
    recoil_spring: { name: 'Recoil spring', f: 'orrin', zone: 'legs', shape: 'I1', text: 'After a dash, your next hit deals +60% and shoves hard.', heat: '+3 heat per sprung hit', mod: { dashHit: 0.6 } },
    furnace_core: { name: 'Furnace core', f: 'orrin', zone: 'heart', shape: 'I2', text: 'Your vent ring is 30% wider and hits 50% harder.', heat: 'Rewards big vents', mod: { ventPow: 0.5 } },
    relay_fang: { name: 'Relay fang', f: 'ninefold', zone: 'arm', shape: 'I1', text: 'Chain shocks hit 5 harder and reach 1 more enemy.', heat: 'No heat', mod: { chainDmg: 5, chainTargets: 1 } },
    ghost_step: { name: 'Ghost step', f: 'ninefold', zone: 'legs', shape: 'I2', text: 'Dashing through an enemy shocks it for 10 and stuns it.', heat: '+3 heat per enemy', mod: { dashZap: 10 } },
    feedback_loop: { name: 'Feedback loop', f: 'ninefold', zone: 'spine', shape: 'I1', text: 'Each kill sheds 5 heat and cuts 0.3 seconds off your dash.', heat: 'Sheds heat', mod: { killCool: 5 } },
    carrier_strain: { name: 'Carrier strain', f: 'quiet', zone: 'heart', shape: 'I1', text: 'When a poisoned enemy dies, its toxin jumps to 2 neighbours.', heat: 'No heat', mod: { toxSpread: 1 } },
    mire_gland: { name: 'Mire gland', f: 'quiet', zone: 'legs', shape: 'I1', text: 'While you stand in water: +30% damage.', heat: 'Rewards staying cold', mod: { waterDmg: 0.3 } },
    numbing_agent: { name: 'Numbing agent', f: 'quiet', zone: 'arm', shape: 'I2', text: 'Poisoned enemies are slowed while the toxin burns.', heat: 'No heat', mod: { toxSlow: 1 } },
    exit_wound: { name: 'Exit wound', f: 'halcyon', zone: 'arm', shape: 'I2', text: 'Critical hits mark the enemy.', heat: '+4 heat per mark', mod: { critMark: 1 } },
    opening_move: { name: 'Opening move', f: 'halcyon', zone: 'spine', shape: 'I1', text: 'Your first hit on an unhurt enemy is always a critical.', heat: 'No heat', mod: { opener: 1 } },
    afterimage: { name: 'Afterimage', f: 'halcyon', zone: 'legs', shape: 'I1', text: 'A perfect dodge leaves a blast where you stood: 16 damage.', heat: '+4 heat per blast', mod: { dodgeBlast: 16 } }
  };
  Object.keys(IMP).forEach(function (k) { IMP[k].id = k; });

  D.SETS = {
    orrin: { name: 'Bulwark', text: 'Knockback +30%. Take 10% less damage.' },
    ninefold: { name: 'Choir', text: 'Shocks reach 1 more enemy and hit 30% harder.' },
    quiet: { name: 'Slow tide', text: 'Toxin stacks 4 higher. Heat fades 50% faster.' },
    halcyon: { name: 'Clear sight', text: '+10% critical chance. Criticals hit for x2.4.' }
  };
  // a second tier: three or more of one house installed, with at least two linked
  D.SETS2 = {
    orrin: { name: 'Juggernaut', text: '+20 health. Wall slams deal 8 more.' },
    ninefold: { name: 'Storm choir', text: 'Shocks reach 1 more enemy and hit 25% harder.' },
    quiet: { name: 'Deep tide', text: 'Toxin stacks 3 higher. Marrow drip mends 1 more.' },
    halcyon: { name: 'Kill line', text: 'Marked enemies take 20% more. Criticals hit for +0.4.' }
  };
  D.FUSIONS = {
    'ninefold+orrin': { id: 'railhammer', name: 'Railhammer', text: 'An enemy thrown into a wall bursts into a chain shock.' },
    'orrin+quiet': { id: 'caustic', name: 'Caustic plating', text: 'When you are hit, the attacker is shoved away with 3 toxin stacks.' },
    'halcyon+orrin': { id: 'deadweight', name: 'Deadweight sight', text: '+10% critical chance. Criticals launch the enemy as a wrecking ball.' },
    'ninefold+quiet': { id: 'plague', name: 'Plague relay', text: 'Every fourth hit throws a shock that carries 2 toxin stacks to 2 enemies.' },
    'halcyon+ninefold': { id: 'lattice', name: 'Ghost lattice', text: 'Killing a tagged or marked enemy fires 3 shock bolts that mark.' },
    'halcyon+quiet': { id: 'bloom', name: 'Bloom sight', text: '+10% critical chance. Criticals burst in a toxic cloud.' }
  };
  D.fusionKey = function (a, b) { return a < b ? a + '+' + b : b + '+' + a; };

  // ---------- grid logic ----------
  // run.implants: [{id, cells:[[c,r]..], rot}]
  D.zoneOk = function (imp, zone) { return imp.zone === zone || (imp.zone === 'arm' && (zone === 'armL' || zone === 'armR')); };
  D.canPlace = function (run, imp, cells, ignoreIdx) {
    var map = D.cellMap(run.cellTier), zone = null;
    for (var i = 0; i < cells.length; i++) {
      var c = map[cells[i][0] + ',' + cells[i][1]];
      if (!c || !c.open || !D.zoneOk(imp, c.zone)) return false;
      if (zone && zone !== c.zone) return false; zone = c.zone;
    }
    for (var j = 0; j < run.implants.length; j++) {
      if (j === ignoreIdx) continue;
      var oc = run.implants[j].cells;
      for (i = 0; i < cells.length; i++) for (var k = 0; k < oc.length; k++) if (oc[k][0] === cells[i][0] && oc[k][1] === cells[i][1]) return false;
    }
    return true;
  };
  D.placements = function (run, imp) {
    var out = [], seen = {};
    for (var rot = 0; rot < 4; rot++) {
      var sh = D.rotate(SH[imp.shape], rot);
      for (var c = 0; c < 7; c++) for (var r = 0; r < 8; r++) {
        var cells = sh.map(function (p) { return [p[0] + c, p[1] + r]; });
        var key = cells.map(function (p) { return p[0] + ':' + p[1]; }).sort().join('|');
        if (seen[key]) continue; seen[key] = 1;
        if (D.canPlace(run, imp, cells, -1)) out.push({ cells: cells, rot: rot });
      }
    }
    return out;
  };
  D.fitsEmpty = function (imp, tier) {
    return D.placements({ cellTier: tier, implants: [] }, imp).length > 0;
  };
  function touching(a, b) {
    for (var i = 0; i < a.length; i++) for (var j = 0; j < b.length; j++) if (Math.abs(a[i][0] - b[j][0]) + Math.abs(a[i][1] - b[j][1]) === 1) return [a[i], b[j]];
    return null;
  }
  D.links = function (run) {
    var L = [], im = run.implants;
    for (var i = 0; i < im.length; i++) for (var j = i + 1; j < im.length; j++) {
      if (im[i].torn || im[j].torn) continue;
      var t = touching(im[i].cells, im[j].cells);
      if (t) { var fa = IMP[im[i].id].f, fb = IMP[im[j].id].f; L.push({ a: i, b: j, ca: t[0], cb: t[1], same: fa === fb, fa: fa, fb: fb, fusion: fa !== fb ? D.FUSIONS[D.fusionKey(fa, fb)] : null }); }
    }
    return L;
  };
  D.computeBuild = function (run) {
    var B = { kb: 1, wallDmg: 0, dmgTaken: 1, dashShock: 0, chainEvery: 0, chainTargets: 2, chainDmg: 10, hijack: 0, hijackLong: 0, cull: 0, ventStun: 0, toxOnHit: 0, toxMax: 6, slowField: 0, drip: 0, heatDecay: 1, coldDmg: 0, sporeTag: 0, markEvery: 0, markBonus: 0.3, crit: 0.05, critMul: 2, stillframe: 0, redCrit: 0, redKb: 0, redWall: 0, passiveHeat: 0, maxHp: 0, dawn: 0, blackLung: 0, stunDmg: 0, breaker: 0, armorDmg: 0, dashHit: 0, ventPow: 0, dashZap: 0, killCool: 0, toxSpread: 0, waterDmg: 0, toxSlow: 0, critMark: 0, opener: 0, dodgeBlast: 0,
      dmgMul: 0, speed: 0, startHeat: 0, noDrain: 0, scripMul: 0, lifesteal: 0, healMul: 0, extraDash: 0, eliteMore: 0,
      active: null, sets: {}, sets2: {}, fusions: {}, factions: {}, count: 0, boons: {} };
    (run.boons || []).forEach(function (id) { var bn = D.BOONS[id]; if (!bn) return; B.boons[id] = true; for (var bk in bn.mod) B[bk] += bn.mod[bk]; });
    run.implants.forEach(function (it) {
      if (it.torn) return;
      var d = IMP[it.id], m = d.mod; B.factions[d.f] = (B.factions[d.f] || 0) + 1; B.count++;
      for (var k in m) { if (k === 'active') B.active = m[k]; else B[k] += m[k]; }
    });
    D.links(run).forEach(function (l) {
      if (l.same) B.sets[l.fa] = true;
      else if (l.fusion) B.fusions[l.fusion.id] = l.fusion;
    });
    if (B.sets.orrin) { B.kb += 0.3; B.dmgTaken -= 0.1; }
    if (B.sets.ninefold) { B.chainTargets += 1; B.chainDmg *= 1.3; }
    if (B.sets.quiet) { B.toxMax += 4; B.heatDecay += 0.5; }
    if (B.sets.halcyon) { B.crit += 0.1; B.critMul = 2.4; }
    for (var sf in B.sets) if (B.factions[sf] >= 3) B.sets2[sf] = true;
    if (B.sets2.orrin) { B.maxHp += 20; B.wallDmg += 8; }
    if (B.sets2.ninefold) { B.chainTargets += 1; B.chainDmg *= 1.25; }
    if (B.sets2.quiet) { B.toxMax += 3; if (B.drip) B.drip += 1; }
    if (B.sets2.halcyon) { B.markBonus += 0.2; B.critMul += 0.4; }
    if (B.fusions.deadweight) B.crit += 0.1;
    if (B.fusions.bloom) B.crit += 0.1;
    return B;
  };
  // best spot for the bot / auto-place: most new links, fusions first
  D.autoPlace = function (run, id) {
    var imp = IMP[id], opts = D.placements(run, imp), best = null, bs = -1;
    opts.forEach(function (o) {
      var s = 0;
      run.implants.forEach(function (it) { if (touching(o.cells, it.cells)) s += IMP[it.id].f === imp.f ? 3 : (D.FUSIONS[D.fusionKey(IMP[it.id].f, imp.f)] ? 4 : 1); });
      if (s > bs) { bs = s; best = o; }
    });
    return best;
  };

  // ---------- weapons ----------
  D.WEAPONS = {
    baton: { name: 'Arc baton', model: 'baton', text: 'Fast three-hit chain. Special: charge, then slam with a shock ring.', dmg: 12, range: 2.9, arc: 1.15, glow: 0x9ff4ff, kind: 'melee', charge: [0.32, 0.8], bot: { sp: 'crowd', hold: 0.55, cd: 3.2 },
      variants: [{ name: 'Standard issue', text: 'The baton as it was built.' }, { name: 'Livewire', text: 'Every third hit throws a shock arc. Hits are 10% lighter.', key: 'baton1' }, { name: 'Riot stick', text: 'Two slow hits instead of three. +60% damage and knockback.', key: 'baton2' }] },
    carbine: { name: 'Needle carbine', model: 'carbine', text: 'Rapid needles at range. Special: charge a piercing rail shot.', dmg: 6, range: 17, glow: 0xffe08a, key: 'carbine', kind: 'ranged', charge: [0.32, 0.8], bot: { sp: 'far', hold: 0.65, cd: 3.5 },
      variants: [{ name: 'Standard issue', text: 'The carbine as it was built.' }, { name: 'Scatter choke', text: 'Three needles in a fan. Short reach.', key: 'carbine1' }, { name: 'Long rifle', text: 'Slow single shots that hit hard and pierce one enemy.', key: 'carbine2' }] },
    hammer: { name: 'Breach hammer', model: 'hammer', text: 'Slow, wide arcs and huge knockback. Special: drive an enemy into a wall.', dmg: 30, range: 3.5, arc: 1.35, glow: 0xffb347, key: 'hammer', kind: 'melee', heavy: true, charge: [0.18, 0.35], bot: { sp: 'single', hold: 0.2, cd: 4 },
      variants: [{ name: 'Standard issue', text: 'The hammer as it was built.' }, { name: 'Pile driver', text: 'Special becomes a leap that slams where you aim.', key: 'hammer1' }, { name: 'Furnace maul', text: 'Hits add 6 heat. +40% damage in redline.', key: 'hammer2' }] },
    whip: { name: 'Chain whip', model: 'whip', text: 'Long, sweeping lashes that drag enemies toward you. Special: a full spin that reels the whole room in.', dmg: 10, range: 5.2, arc: 0.95, glow: 0xff8a5a, key: 'whip', kind: 'melee', charge: [0.25, 0.6], bot: { sp: 'crowd', hold: 0.4, cd: 3.4 },
      variants: [{ name: 'Standard issue', text: 'The whip as it was built.' }, { name: 'Barbed chain', text: 'The last lash of each chain marks what it hits.', key: 'whip1' }, { name: 'Live chain', text: 'Every lash stuns for a moment. Hits are 15% lighter.', key: 'whip2' }] },
    blades: { name: 'Twin shock blades', model: 'blade', dual: true, text: 'Four quick cuts at close reach. Special: a slashing dash straight through the line.', dmg: 8, range: 2.5, arc: 1.0, glow: 0x9fe8ff, key: 'blades', kind: 'melee', charge: [0.12, 0.3], bot: { sp: 'single', hold: 0.15, cd: 2.6 },
      variants: [{ name: 'Standard issue', text: 'The blades as they were built.' }, { name: 'Bleeders', text: 'Every second cut adds a stack of toxin.', key: 'blades1' }, { name: 'Cold steel', text: '+35% damage while your heat is under 30.', key: 'blades2' }] },
    spear: { name: 'Rail spear', model: 'spear', text: 'Long thrusts that pierce a line of enemies. Special: charge and throw a rail bolt through everything.', dmg: 16, range: 5.0, arc: 0.3, glow: 0xb8a0ff, key: 'spear', kind: 'melee', thrust: true, charge: [0.3, 0.75], bot: { sp: 'far', hold: 0.6, cd: 3.4 },
      variants: [{ name: 'Standard issue', text: 'The spear as it was built.' }, { name: 'Hook spear', text: 'Thrusts drag enemies toward you.', key: 'spear1' }, { name: 'Lightning rod', text: 'Every second thrust throws a shock arc.', key: 'spear2' }] },
    rivet: { name: 'Rivet launcher', model: 'rivet', text: 'Slow shells that burst on impact. Special: charge a heavy shell with a wide blast.', dmg: 20, range: 14, glow: 0xffb347, key: 'rivet', kind: 'ranged', charge: [0.3, 0.8], bot: { sp: 'far', hold: 0.6, cd: 3.8 },
      variants: [{ name: 'Standard issue', text: 'The launcher as it was built.' }, { name: 'Flak load', text: 'Three small shells in a fan.', key: 'rivet1' }, { name: 'Magnet rivets', text: 'Every blast drags enemies into its centre.', key: 'rivet2' }] },
    pistols: { name: 'Twin pistols', model: 'pistol', dual: true, text: 'Fast alternating shots. You keep full speed while firing. Special: fan the hammers in a wide burst.', dmg: 7, range: 12, glow: 0xffd070, kind: 'ranged', char: 'vesper', charge: [0.1, 0.3], bot: { sp: 'far', hold: 0.15, cd: 3 },
      variants: [{ name: 'Standard issue', text: "Quill's own pair." }] },
    fists: { name: 'Piston gauntlets', model: 'fist', dual: true, text: 'Three heavy punches with huge knockback. Special: a ground slam that stuns all around you.', dmg: 20, range: 2.6, arc: 1.1, glow: 0xff7a3a, kind: 'melee', heavy: true, char: 'bram', charge: [0.2, 0.5], bot: { sp: 'crowd', hold: 0.35, cd: 3.4 },
      variants: [{ name: 'Standard issue', text: "Tolliver's own pair." }] }
  };
  D.WEAPON_ORDER = ['baton', 'carbine', 'hammer', 'whip', 'blades', 'spear', 'rivet', 'pistols', 'fists'];
  D.MODS = [
    { id: 'weighted', name: 'Weighted head', text: '+20% weapon damage.' },
    { id: 'honed', name: 'Honed edge', text: '+15% critical chance.' },
    { id: 'quick', name: 'Quick grip', text: '+18% attack speed.' },
    { id: 'reach', name: 'Long reach', text: '+20% reach.' },
    { id: 'sink', name: 'Sink fins', text: 'Your special adds half the heat.' },
    { id: 'hotshoe', name: 'Hot shoe', text: 'Your special hits 40% harder and adds 5 heat.' },
    { id: 'magnet', name: 'Scrap magnet', text: '+1 scrip from every kill.' },
    { id: 'shover', name: 'Shover', text: '+35% knockback.' },
    { id: 'counter', name: 'Counterweight', text: 'The last hit of each chain deals +35%. Ranged: every fifth shot.' },
    { id: 'tracer', name: 'Tracer tips', text: 'Every fifth hit marks the enemy.' },
    { id: 'livegrip', name: 'Live grip', text: 'In redline: +25% attack speed.' },
    { id: 'sprung', name: 'Sprung haft', text: 'Each kill cuts 0.4 seconds off your dash.' }
  ];
  D.GEAR = {
    skip: { slot: 'rig', name: 'Skip rig', text: 'Dash goes 35% further.' },
    shock: { slot: 'rig', name: 'Shock rig', text: 'Dashing through an enemy hurts and stuns it.' },
    cold: { slot: 'rig', name: 'Cold rig', text: 'Each dash sheds 12 heat.' },
    twin: { slot: 'rig', name: 'Twin rig', text: 'One more dash charge.' },
    bleed: { slot: 'deck', name: 'Bleed deck', text: 'A tagged enemy takes 30% more damage.' },
    tether: { slot: 'deck', name: 'Tether deck', text: 'The tag drone roots its target for 2 seconds.' },
    echo: { slot: 'deck', name: 'Echo deck', text: 'The tag jumps to a second enemy.' },
    siphon: { slot: 'deck', name: 'Siphon deck', text: 'When a tagged enemy dies: shed 25 heat, gain 4 scrip.' },
    ghost: { slot: 'rig', name: 'Ghost rig', text: 'Dash protects you 50% longer. A perfect dodge sheds 8 heat.' },
    blast: { slot: 'rig', name: 'Blast rig', text: 'Starting a dash throws back every enemy near you.' },
    swarm: { slot: 'deck', name: 'Swarm deck', text: 'Your Q skill recharges twice as fast.' },
    burn: { slot: 'deck', name: 'Overload deck', text: 'A tagged enemy explodes when it dies: 18 damage around it.' }
  };

  // ---------- shrine pacts: a gift and its price, kept for the run ----------
  D.BOONS = {
    glass: { name: 'Glass pact', text: '+35% weapon damage.', price: 'You take 25% more damage.', mod: { dmgMul: 0.35, dmgTaken: 0.25 }, bot: -9 },
    ember: { name: 'Ember pact', text: 'Redline no longer drains your health.', price: 'Every room starts at 40 heat.', mod: { noDrain: 1, startHeat: 40 }, bot: 3 },
    tithe: { name: 'Tithe pact', text: 'Kills pay double scrip.', price: '20 less max health.', mod: { scripMul: 1, maxHp: -20 }, bot: 1 },
    hunger: { name: 'Hunger pact', text: 'Every kill mends 1 health.', price: 'All other healing is halved.', mod: { lifesteal: 1, healMul: -0.5 }, bot: 4 },
    rush: { name: 'Rush pact', text: '+15% move speed and one more dash charge.', price: 'Your vent ring is 30% weaker.', mod: { speed: 0.15, extraDash: 1, ventPow: -0.3 }, bot: 5 },
    hunted: { name: 'Hunted pact', text: 'Elite kills pay 10 more Memory and 10 more scrip.', price: 'An elite joins every fight.', mod: { eliteMore: 1 }, bot: -9 }
  };

  // ---------- playable couriers ----------
  // dash: blink (short, sharp), roll (long cover, loads hot shots), ram (hits what it touches). q: tag | fan | grapple
  D.CHARS = {
    kestrel: { name: 'Kestrel', role: 'Courier', model: 'kestrel', portrait: 'kestrel', weapon: 'baton', hp: 100, speed: 7.4, dash: 'blink', dashLen: 6.2, dashDur: 0.17, dashCd: 0.62, iframe: 0.24, dashes: 1, q: 'tag', qCd: 7, qRange: 13, qName: 'Tag drone', qShort: 'tag',
      text: 'Fast, exact, at home in a crowd. Her dash slips through anything.', moves: ['Dash: a short blink through enemies and shots', 'Q: tag drone. Tagged enemies take more damage', 'Signature: the arc baton'], blurb: 'Kestrel, courier. Rebuilt by Mother Ruen.' },
    vesper: { name: 'Vesper Quill', role: 'Gunhand', model: 'vesper', portrait: 'vesper', weapon: 'pistols', hp: 85, speed: 7.9, dash: 'roll', dashLen: 5.0, dashDur: 0.26, dashCd: 0.55, iframe: 0.36, dashes: 2, q: 'fan', qCd: 6, qRange: 9, qName: 'Fan fire', qShort: 'fan fire', farDmg: 0.25,
      text: 'A duelist who fights on the move. Thin skin, long reach, two rolls.', moves: ['Dash: a roll. Your next 5 hits after it deal +50%', 'Q: fan fire. Seven shots in a cone; the first one tags', 'Passive: +25% damage to enemies more than 7 steps away', 'Signature: twin pistols, full speed while firing'], blurb: 'Vesper Quill, gunhand. Owes Mother Ruen for two hands and a lung.' },
    bram: { name: 'Bram Tolliver', role: 'Breaker', model: 'bram', portrait: 'bram', weapon: 'fists', hp: 130, speed: 6.5, dash: 'ram', dashLen: 4.8, dashDur: 0.22, dashCd: 0.95, iframe: 0.3, dashes: 1, q: 'grapple', qCd: 5, qRange: 4, qName: 'Grapple', qShort: 'grapple', dmgTaken: -0.15, hurtHeat: 12, drain: 1.5, redDmg: 0.15,
      text: 'A dock breaker who runs hot. Slow feet, heavy hands, and he likes the redline.', moves: ['Dash: a shoulder ram that hits and throws what it touches', 'Q: grapple. Grab the nearest enemy and hurl it where you aim', 'Passive: takes 15% less. Being hit adds heat. Redline drains half as fast and hits harder', 'Signature: piston gauntlets'], blurb: 'Bram Tolliver, breaker. Mother Ruen rebuilt him out of dock crane parts.' }
  };
  D.CHAR_ORDER = ['kestrel', 'vesper', 'bram'];

  // ---------- meta ----------
  D.BOARD = [
    { key: 'cells', name: 'Graft sites', text: 'More open cells in the body grid.', costs: [30, 60, 100, 150] },
    { key: 'hp', name: 'Thicker blood', text: '+20 health.', costs: [25, 50, 90] },
    { key: 'dash', name: 'Second wind', text: 'A second dash charge.', costs: [60] },
    { key: 'defy', name: 'Dead switch', text: 'Once per run, death leaves you standing at 40% health.', costs: [80] },
    { key: 'doors', name: 'Wide ear', text: 'One more offer on doors and implants.', costs: [70] },
    { key: 'reroll', name: 'Second opinion', text: 'One reroll of offers per run.', costs: [30, 60] }
  ];
  D.UNLOCKS = [
    { key: 'carbine', name: 'Needle carbine', text: 'A new weapon frame on the rack.', cost: 1 },
    { key: 'hammer', name: 'Breach hammer', text: 'A new weapon frame on the rack.', cost: 2 },
    { key: 'baton1', name: 'Baton: Livewire', text: D.WEAPONS.baton.variants[1].text, cost: 1 },
    { key: 'baton2', name: 'Baton: Riot stick', text: D.WEAPONS.baton.variants[2].text, cost: 1 },
    { key: 'carbine1', name: 'Carbine: Scatter choke', text: D.WEAPONS.carbine.variants[1].text, cost: 1, need: 'carbine' },
    { key: 'carbine2', name: 'Carbine: Long rifle', text: D.WEAPONS.carbine.variants[2].text, cost: 1, need: 'carbine' },
    { key: 'hammer1', name: 'Hammer: Pile driver', text: D.WEAPONS.hammer.variants[1].text, cost: 1, need: 'hammer' },
    { key: 'hammer2', name: 'Hammer: Furnace maul', text: D.WEAPONS.hammer.variants[2].text, cost: 1, need: 'hammer' },
    { key: 'whip', name: 'Chain whip', text: 'A new weapon frame on the rack.', cost: 1 },
    { key: 'blades', name: 'Twin shock blades', text: 'A new weapon frame on the rack.', cost: 1 },
    { key: 'spear', name: 'Rail spear', text: 'A new weapon frame on the rack.', cost: 1 },
    { key: 'rivet', name: 'Rivet launcher', text: 'A new weapon frame on the rack.', cost: 2 },
    { key: 'whip1', name: 'Whip: Barbed chain', text: '', cost: 1, need: 'whip' }, { key: 'whip2', name: 'Whip: Live chain', text: '', cost: 1, need: 'whip' },
    { key: 'blades1', name: 'Blades: Bleeders', text: '', cost: 1, need: 'blades' }, { key: 'blades2', name: 'Blades: Cold steel', text: '', cost: 1, need: 'blades' },
    { key: 'spear1', name: 'Spear: Hook spear', text: '', cost: 1, need: 'spear' }, { key: 'spear2', name: 'Spear: Lightning rod', text: '', cost: 1, need: 'spear' },
    { key: 'rivet1', name: 'Rivet: Flak load', text: '', cost: 1, need: 'rivet' }, { key: 'rivet2', name: 'Rivet: Magnet rivets', text: '', cost: 1, need: 'rivet' },
    { key: 'pool', name: 'Black-market stock', text: 'A new implant enters the pool (4 in all).', cost: 1, max: 4 }
  ];
  D.BOUNTY = [
    { key: 'elites', name: 'Hunted', text: 'Elites appear in every area room. +30% Memory.' },
    { key: 'fast', name: 'Overtime', text: 'Bosses act 25% faster. +1 Core per boss.' },
    { key: 'heal', name: 'Thin air', text: 'Healing is halved. +30% Memory.' },
    { key: 'crowd', name: 'Crowded decks', text: 'One more enemy in every wave. +30% Memory.' },
    { key: 'frail', name: 'Thin skin', text: 'You start with 30 less health. +1 Core for reaching the roof.' },
    { key: 'fever', name: 'Fever', text: 'Heat does not fade while enemies live. +30% Memory.' }
  ];

  // ---------- lines ----------
  D.LINES = {
    ruen: {
      first: ['Hold still. You died in the pump hall and I had to dig you out of a drain.', 'There is a chip behind your eye. I cannot read it. Yet.', 'Bring me Memory from up there and I will make you harder to kill.'],
      death: [
        ['Back on my table. The Stack is not fond of you.', 'Spend your Memory. Grow the grid. Go again.'],
        ['Your heart stopped for forty seconds. I counted.', 'Vent before the redline eats you, girl.'],
        ['The Package hummed while you were dead. It does that now.', 'I would like to know why.'],
        ['I have rebuilt you so often I could do it blind.', 'Do not test me on that.'],
        ['Water cools you. Walls hurt them. Use the room.']
      ],
      boss1: ['You broke the Dredge. The Sumps will be quiet for a week.', 'The Market Decks are next. They watch couriers there.'],
      boss2: ['Marrow carried a grid like yours. Same hand built it.', 'Someone up there is making couriers. Ask the buyer who.'],
      win: ['You reached the roof. And you still came back here.', 'Good. I am not done with that chip.']
    },
    pike: {
      first: ['I run your comms. Four syndicates are already bidding for a line to you.', 'Bring me Cores from the big ones. I will stock the rack.'],
      idle: [
        ['Orrin sells force. Ninefold sells tricks. Quietwater sells patience. Halcyon sells one clean shot.'],
        ['Two implants that touch will link. Two of one house make a set.', 'Two rival houses, linked, can fuse. I have seen six fusions.'],
        ['The carbine keeps you far away. The hammer does not.'],
        ['They get sour when you pick a rival. Listen to how they talk after.'],
        ['Hask sells at the end of each area. Keep some scrip for him.']
      ],
      boss1: ['A Core from the Dredge. That buys something real.'],
      boss2: ['You took one of Marrow\'s implants. The channel went very quiet.']
    },
    brine: {
      first: ['I carried for thirty years. The Stack took my eye and paid me for it.', 'Dash through them, not away from them.'],
      idle: [
        ['A warden cannot turn fast. Get behind the shield.'],
        ['Kill the rigger before the turrets, or take the turrets for yourself.'],
        ['Patch drones run. Chase them first or the fight never ends.'],
        ['A bruiser shrugs until the armour breaks. Then it falls like anyone.'],
        ['Ghost runners shimmer just before they cut. Watch the air behind you.'],
        ['Hot is strong. Hot is also dying. Know which one you are doing.']
      ],
      boss1: ['The Dredge sweeps wide. Stand close and move with the arm.'],
      boss2: ['When Marrow vents, she is slow. That is your window.']
    },
    vesper: { pick: ['Quill. You still owe me for the left hand.', 'Shoot from far off. You were never built to be hit.'] },
    bram: { pick: ['Tolliver. Mind the table, it is older than you.', 'Run hot if you must. I put a bigger heart in you for it.'] },
    kestrel: { pick: ['Back to the little bird, then.', 'She is quick. Use it.'] },
    shrine: ['A drowned saint of the old pump line. People still leave it offerings.', 'It gives. It also takes.'],
    hask: {
      shop: ['Scrip first. Then we talk.', 'Everything works. Mostly.', 'You again. Still breathing. Buy something.', 'No refunds. No credit. No questions.'],
      poor: ['Come back when your pockets are heavier.']
    },
    orrin: { offer: ['Orrin Mechanica. We build things that push back.', 'Take the hardware, courier. Force is honest.', 'A soldier needs a frame. Here is yours.'], snub: ['You went elsewhere. Noted in your file.', 'We saw what you installed. Disappointing.'], thanks: ['Good. Now go and hit something.'] },
    ninefold: { offer: ['Nine blessings, little bird. Pick one.', 'We are already in your comms. Take a gift.', 'The saints of the wire see you. Plug in.'], snub: ['You let someone else in your head. Rude.', 'We will remember that choice. We remember everything.'], thanks: ['It is in. We are closer now.'] },
    quiet: { offer: ['Quietwater. We prefer outcomes that take a while.', 'A measured dose, on the house.', 'Patience is a product. Try ours.'], snub: ['Our competitors make such loud things.', 'That was an unwise prescription.'], thanks: ['Take with water. You have plenty.'] },
    halcyon: { offer: ['Halcyon Optics. See clearly, strike once.', 'A sharper eye, courier. No charge. Today.', 'We like how you move. We could like it more.'], snub: ['We watched you choose them. In high resolution.', 'A blurry decision.'], thanks: ['Lovely. Hold that focus.'] },
    marrow: ['Kestrel. They told me you would be taller.', 'Hand me the eye and you can walk home.'],
    marrow3: ['Enough. I am taking it out of you.'],
    dredge: ['Scav crew on the comm: grind the courier into the silt.'],
    buyer: ['You are late. And you have been opened. More than once.', 'The Package is not for me. I only carry it higher.', 'There is another lift. It goes up past the roof.']
  };
})();
