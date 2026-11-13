// Wetware — main: boot, run flow, rooms, doors, rewards, hub, meta, end, camera, debug params
'use strict';
(function () {
  var G = W.game = { state: 'boot', time: 0, enemies: [], shots: [], tells: [], zones: [], npcs: [], hinted: {}, hitstop: 0, slowmo: 0, room: null, player: null, run: null, B: null, boss: null, inCombat: false, cinematic: 0, fadeK: 0, fadeDir: 0, camX: 0, camZ: 0, camD: 45.6, whereText: '' };
  var C = W.combat, E = W.enemies, Bs = W.boss, Wd = W.world, F = W.fx, K = F.K, M = W.models, D = W.data, U = W.ui, Pt = W.paint, Gf = W.gfx, P_ = W.params;
  var PITCH = 50 * Math.PI / 180;

  var PLAN = {
    sumps: ['fight', 'fight', 'fight', 'fight', 'elite', 'shop'],
    market: ['fight', 'fight', 'fight', 'event', 'fight', 'shop']
  };
  var WAVES = {
    sumps: [
      [['scav', 'scav', 'scav']],
      [['hound', 'hound'], ['rat*6'], ['hound', 'scav', 'scav', 'rat*4']],
      [['leech*4'], ['bomber', 'bomber'], ['leech*3', 'bomber', 'scav', 'scav']],
      [['crab'], ['spitter', 'scav', 'rat*3'], ['crab', 'hound', 'hound', 'spitter']],
      [['welder'], ['E:scav', 'leech', 'leech', 'bomber'], ['E:hound', 'welder', 'rat*4']]
    ],
    market: [
      [['warden'], ['hopper', 'hopper'], ['warden', 'hopper', 'scav', 'scav']],
      [['ghost', 'ghost'], ['sniper', 'hound'], ['ghost', 'sniper', 'hound', 'hound']],
      [['rigger'], ['netter', 'scav', 'scav'], ['rigger', 'netter', 'warden', 'leech', 'leech']],
      [['bruiser'], ['shepherd', 'scav', 'scav', 'ghost'], ['warden', 'rigger', 'patch', 'sniper'], ['bruiser', 'shepherd', 'hopper']]
    ]
  };
  // a harder room behind a risk door: the strongest of the area, led by elites
  var RISK = {
    sumps: [['E:crab', 'rat*5'], ['E:welder', 'bomber', 'bomber'], ['E:scav', 'E:hound', 'leech*3']],
    market: [['E:warden', 'hopper', 'hopper'], ['E:ghost', 'sniper', 'shepherd'], ['E:bruiser', 'netter', 'patch']]
  };
  function expandWave(list) { var out = []; list.forEach(function (t) { var m = /^(.*)\*(\d+)$/.exec(t); if (m) { for (var i = 0; i < +m[2]; i++) out.push(m[1]); } else out.push(t); }); return out; }
  G.setBounty = function () { var b = G.run.bounty; G.bossSpeed = b.fast ? 1.25 : 1; G.memMul = 1 + (b.elites ? 0.3 : 0) + (b.heal ? 0.3 : 0) + (b.crowd ? 0.3 : 0) + (b.fever ? 0.3 : 0); };
  var AREA_NAME = { sumps: 'The Sumps', market: 'The Market Decks' };

  // ---------------- boot ----------------
  G.init = function () {
    W.loadSave();
    if (P_.seed != null || P_.t != null) Math.random = W.makeRng((P_.seed || 7) * 7919 + 13);
    Gf.init(document.getElementById('c'));
    Gf.uni.uBrush.value = Pt.makeBrush(); Gf.uni.uAtlas.value = Pt.makeAtlas();
    F.init(); C.bind(G); E.bind(G); Bs.bind(G); U.bind(G); W.bot.bind(G); U.init();
    G.rng = W.makeRng(P_.seed || (Date.now() & 0xffff) + 1);
    var st = P_.state, v = P_.view;
    if (!st && v) st = v === 'boss1' ? 'boss1' : (v === 'boss2' ? 'boss2' : 'area1');
    G.botOn = P_.auto || !!P_.bot;
    if (st) G.debugState(st);
    else if (P_.auto) { G.enterHub(true); }
    else if (P_.noattract) G.enterHub(true);
    else G.startAttract();
    if (v === 'wide' || v === 'kestrel' || (P_.t != null && !P_.auto && !P_.bot && st !== 'grid' && st !== 'hub' && st !== 'end')) G.botOn = true;
    if (P_.t != null) { var n = Math.round(P_.t * 60); for (var i = 0; i < n; i++) G.step(1 / 60); G.frozen = true; }
    var lastT = performance.now(), acc = 0, fpsT = 0, fpsN = 0, worst = 0;
    function frame(now) {
      var dtMs = Math.min(100, now - lastT); lastT = now;
      W.input.pollPad();
      if (!G.frozen) { if (P_.speed > 1) { for (var q = 0; q < P_.speed; q++) G.step(1 / 60); } else { acc += dtMs / 1000; var n2 = 0; while (acc >= 1 / 60 && n2 < 4) { G.step(1 / 60); acc -= 1 / 60; n2++; } if (n2 === 4) acc = 0; } }
      else G.frozenInput();
      G.draw(dtMs);
      fpsT += dtMs; fpsN++; worst = Math.max(worst, dtMs);
      if (fpsT > 500) { G.fps = fpsN / fpsT * 1000; if (P_.fps) U.fps(G.fps.toFixed(0) + ' fps · worst ' + worst.toFixed(0) + ' ms · res ' + Gf.rw + 'x' + Gf.rh + ' · foes ' + G.enemies.length); fpsT = 0; fpsN = 0; worst = 0; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
  G.frozenInput = function () { W.input.endFrame(); };
  G.log = function (m) { if (P_.auto || P_.bot || P_.speed > 1) console.log('#' + G.time.toFixed(0) + 's hp=' + (G.run ? Math.round(G.run.hp) : 0) + ' ' + m); };

  // ---------------- runs ----------------
  G.newRun = function (seed) {
    var s = W.save, wk = s.weapon, vk = s.variant ? wk + s.variant : null;
    var ck = D.CHARS[P_.char] ? P_.char : (D.CHARS[s.char] ? s.char : 'kestrel'), CH = D.CHARS[ck];
    if (!D.WEAPONS[wk] || (D.WEAPONS[wk].char && D.WEAPONS[wk].char !== ck) || (P_.char && !P_.weapon && P_.char !== s.char)) { wk = CH.weapon; vk = null; }
    if (P_.weapon && D.WEAPONS[P_.weapon]) { wk = P_.weapon; vk = P_.variant ? wk + P_.variant : null; }
    var bnt = s.wins > 0 ? s.bounty : {}, hp0 = CH.hp + s.board.hp * 20 - (bnt.frail ? 30 : 0);
    var run = G.run = {
      char: ck, boons: [],
      seed: seed, rng: W.makeRng(seed), areaIdx: 0, area: 'sumps', roomIdx: -1, fightIdx: 0, hp: hp0, maxHp: hp0, baseMaxHp: hp0, scrip: 0, implants: [], cellTier: s.board.cells,
      weapon: wk, variantKey: vk, wtier: 0, mods: [], modCrit: 0, modKb: 1, rig: null, deck: null, heat: 0,
      stats: { kills: 0, time: 0, dmgTaken: 0, rooms: 0, vents: 0, fusions: 0, redlines: 0, dodges: 0, memory: 0 },
      used: {}, defy: s.board.defy ? 1 : 0, rerolls: s.board.reroll, offers: 2 + (s.board.doors ? 1 : 0), lastFaction: null, snub: {},
      bag: { sumps: [1, 2, 3, 4, 5], market: [0, 1, 2, 3, 4, 5] }, nextReward: null, bounty: s.wins > 0 ? s.bounty : {}
    };
    run.rng.shuffle(run.bag.sumps); run.rng.shuffle(run.bag.market);
    G.rng = run.rng;
    G.hpScale = 1; G.dmgScale = 1; G.setBounty();
    G.rebuild();
    return run;
  };
  G.rebuild = function () {
    var run = G.run; G.B = D.computeBuild(run);
    var mh = run.baseMaxHp + G.B.maxHp; if (mh !== run.maxHp) { run.hp = Math.min(mh, run.hp + Math.max(0, mh - run.maxHp)); run.maxHp = mh; }
    run.modCrit = run.mods.indexOf('honed') >= 0 ? 0.15 : 0; run.modKb = run.mods.indexOf('shover') >= 0 ? 1.35 : 1;
    if (G.player) { C.refreshGlow(G.player); G.player.maxDashes = C.maxDashes(); }
  };
  G.gainMemory = function (n) { var v = n * (G.memMul || 1); G.memAcc = (G.memAcc || 0) + v; var w = Math.floor(G.memAcc); if (w > 0) { G.memAcc -= w; W.save.memory += w; if (G.run) G.run.stats.memory += w; } };
  G.heal = function (n, quiet) { var run = G.run, P = G.player; if (run.bounty.heal) n = Math.ceil(n / 2); if (G.B && G.B.healMul) n = Math.ceil(n * (1 + G.B.healMul)); var b = run.hp; run.hp = Math.min(run.maxHp, run.hp + n); if (run.hp > b && P) { F.text(P.x, 2.8, P.z, '+' + Math.round(run.hp - b), 'heal', 0.8); if (!quiet) W.audio.sfx('heal', 1); } };

  // ---------------- rooms ----------------
  function clearWorld() {
    E.clearAll(); G.tells.forEach(function (t) { if (t.fx) F.kill(t.fx); }); G.tells.length = 0;
    G.zones.forEach(function (z) { F.kill(z.fx); }); G.zones.length = 0; G.shots.forEach(function (s) { F.kill(s.fx); }); G.shots.length = 0;
    G.npcs.forEach(function (n) { Gf.scene.remove(n.rig.root); }); G.npcs.length = 0;
    F.clear(); G.boss = null; G.surgeInfo = null; Gf.uni.uSurge.value = 0;
    if (G.player) { Gf.scene.remove(G.player.rig.root); }
    if (G.extra) { G.extra.forEach(function (o) { Gf.scene.remove(o); }); } G.extra = [];
    Wd.dispose(G.room); G.room = null; U.hidePrompt();
  }
  G.loadRoom = function (def, areaKey, seed) {
    clearWorld();
    var room = G.room = Wd.build(def, areaKey, seed), A = room.A, u = Gf.uni;
    u.uKeyCol.value.fromArray(A.key); u.uAmbCol.value.fromArray(A.amb); u.uShadeCol.value.fromArray(A.shade); u.uRimCol.value.fromArray(A.rim); u.uWaterCol.value.fromArray(A.water); u.uPuddle.value = A.puddle; Gf.clearCol = A.clear;
    if (def.roof) u.uKeyDir.value.set(-0.7, -0.55, -0.3).normalize(); else u.uKeyDir.value.set(0.45, -1, -0.38).normalize();
    Gf.fitShadow(0, 0, Math.max(room.halfW, room.halfH) + 7);
    var P = G.player = C.makePlayer(room.spawn.x, room.spawn.z);
    P.heat = Math.max(G.run.heat || 0, areaKey === 'hub' ? 0 : G.B.startHeat);
    G.camX = P.x; G.camZ = P.z - 2; G.inCombat = false; G.waves = null; G.waveIdx = 0; G.cleared = false; G.rewardT = -1; G.doorT = -1; G.waveHold = false; G.roomT = 0;
    return room;
  };
  function npc(kind, x, z, face, key) { var rig = M.make(kind); rig.root.position.set(x, 0, z); rig.root.rotation.y = face || 0; Gf.scene.add(rig.root); var n = { rig: rig, x: x, z: z, key: key || kind, face: face || 0 }; G.npcs.push(n); return n; }

  // ---- the hub ----
  G.enterHub = function (first, after) {
    G.state = 'hub'; G.attract = false; U.attract(false);
    if (!G.run || after) G.newRun((Date.now() & 0xfffff) + 1);
    if (P_.seed != null) { G.run.seed = P_.seed; G.run.rng = W.makeRng(P_.seed); G.rng = G.run.rng; G.run.bag = { sumps: [1, 2, 3, 4, 5], market: [0, 1, 2, 3, 4, 5] }; G.rng.shuffle(G.run.bag.sumps); G.rng.shuffle(G.run.bag.market); }
    var room = G.loadRoom(Wd.ROOMS.hub, 'hub', 11), pr = room.props;
    G.whereText = "Mother Ruen's clinic, the Sumps";
    G.npcRuen = npc('ruen', pr.T.x + 1.6, pr.T.z + 0.6, -0.9, 'ruen'); G.npcPike = npc('pike', pr.R.x - 1.5, pr.R.z + 0.8, 0.7, 'pike'); G.npcBrine = npc('brine', pr.M.x, pr.M.z, 1.2, 'brine');
    var d = room.doors[0]; d.active = true; d.open = true; d.reward = { kind: 'boss', icon: 'boss', label: 'The Corwen Stack', sub: 'Start the climb' };
    G.spots = [
      { x: pr.T.x + 1.2, z: pr.T.z + 1.2, r: 2.6, label: '<b>E</b> Surgery board', fn: G.openBoard, who: 'ruen' },
      { x: pr.R.x - 1.0, z: pr.R.z + 1.0, r: 2.4, label: '<b>E</b> Weapon rack', fn: G.openRack, who: 'pike' },
      { x: pr.M.x, z: pr.M.z, r: 2.0, label: '<b>E</b> Talk to Brine', fn: function () { G.talk('brine'); } }
    ];
    if (W.save.wins > 0) G.spots.push({ x: pr.b.x, z: pr.b.z + 1.2, r: 2.2, label: '<b>E</b> Bounty board', fn: G.openBounty });
    // the other couriers wait by the lockers: talk to one to play as them
    var others = D.CHAR_ORDER.filter(function (k) { return k !== G.run.char; }), lx = [room.cx(8), room.cx(4)], lz = [room.cz(4), room.cz(4)];
    others.forEach(function (k, i) { var c = D.CHARS[k], n = npc(c.model, lx[i], lz[i], i ? 0.5 : -0.5, k); var wd = D.WEAPONS[c.weapon], w = M.makeWeapon(wd.model, wd.glow, n.rig.mats); w.position.set(0, -0.7, 0.04); n.rig.parts.armR.add(w); G.spots.push({ x: lx[i], z: lz[i] + 1.1, r: 1.9, label: '<b>E</b> ' + c.name + ', ' + c.role.toLowerCase(), fn: G.openChars }); });
    W.audio.setTrack('hub'); W.audio.target = 0.3;
    // greeting
    var s = W.save, L = D.LINES.ruen, lines;
    if (G.charPicked) { lines = D.LINES[G.charPicked].pick; G.charPicked = null; } else if (G.lastEnd === 'win') lines = L.win; else if (G.lastEnd === 'boss2') lines = L.boss2; else if (G.newBoss1) { lines = L.boss1; G.newBoss1 = false; } else if (s.deaths === 0) lines = L.first; else lines = L.death[(s.deaths - 1) % L.death.length];
    G.lastEnd = null;
    if (!P_.state || P_.state === 'hub') G.sayQueue('ruen', lines);
    if (G.botOn && P_.auto) G.autoSpend();
  };
  G.sayQueue = function (key, lines) { G.sq = { key: key, lines: lines.slice(), t: 0 }; nextSay(); };
  function nextSay() { var q = G.sq; if (!q) return; if (!q.lines.length) { G.sq = null; U.hideSay(); return; } U.say(q.key, q.lines.shift(), 5.5, q.lines.length ? 'E for more' : ''); q.t = 0; }
  G.talk = function (key) {
    var s = W.save, L = D.LINES[key], i = s.talk[key] || 0, lines;
    if (i === 0 && L.first) lines = L.first; else if (key !== 'ruen' && s.boss1 && !s.talk[key + 'b1'] && L.boss1) { lines = L.boss1; s.talk[key + 'b1'] = 1; } else if (s.boss2 && !s.talk[key + 'b2'] && L.boss2) { lines = L.boss2; s.talk[key + 'b2'] = 1; } else { var pool = L.idle || L.death; lines = pool[(i + s.runs) % pool.length]; }
    s.talk[key] = i + 1; W.writeSave(); G.sayQueue(key, lines);
  };
  G.openBoard = function () {
    var s = W.save;
    function items() { return D.BOARD.map(function (b) { var lv = s.board[b.key], max = b.costs.length, cost = lv < max ? b.costs[lv] : null; return { tag: 'Level ' + lv + ' of ' + max, title: b.name, text: b.text, cost: cost === null ? 'Done' : cost + ' Memory', dis: cost === null || s.memory < cost, b: b, c: cost }; }); }
    var its = items();
    U.menu({ kicker: 'Mother Ruen · surgery', title: 'The board', portrait: 'ruen', who: 'Mother Ruen', line: 'You have ' + s.memory + ' Memory. Tell me where to cut.', items: its, close: 'Step away', onPick: function (i) { var it = its[i]; s.memory -= it.c; s.board[it.b.key]++; W.writeSave(); W.audio.sfx('install'); G.applyBoard(); G.openBoard(); return true; } });
  };
  G.openChars = function () {
    var s = W.save, cur = G.run.char;
    var its = D.CHAR_ORDER.map(function (k) { var c = D.CHARS[k]; return { tag: k === cur ? 'Playing' : c.role, tagCol: k === cur ? '#ffb347' : null, title: c.name, text: c.text + ' ' + c.moves.join('. ') + '. ' + c.hp + ' health.', k: k, dis: k === cur }; });
    U.menu({ kicker: 'The lockers', title: 'Who carries the Package', portrait: 'ruen', who: 'Mother Ruen', line: 'I have rebuilt three of you. Pick who climbs tonight.', items: its, close: 'Step away', onPick: function (i) {
      var k = its[i].k; s.char = k; s.weapon = D.CHARS[k].weapon; s.variant = 0; W.writeSave(); W.audio.sfx('install'); G.charPicked = k;
      G.fade(function () { G.enterHub(false, true); });
    } });
  };
  G.applyBoard = function () { var s = W.save, run = G.run; run.cellTier = s.board.cells; run.baseMaxHp = C.char().hp + s.board.hp * 20 - (run.bounty.frail ? 30 : 0); run.hp = run.baseMaxHp; run.maxHp = run.baseMaxHp; run.defy = s.board.defy ? 1 : 0; run.rerolls = s.board.reroll; run.offers = 2 + (s.board.doors ? 1 : 0); G.rebuild(); };
  G.autoSpend = function () { var s = W.save, did = true; while (did) { did = false; D.BOARD.forEach(function (b) { var lv = s.board[b.key]; if (lv < b.costs.length && s.memory >= b.costs[lv]) { s.memory -= b.costs[lv]; s.board[b.key]++; did = true; } }); } G.applyBoard(); W.writeSave(); };
  // the rack lists weapon frames; a frame you own opens its builds
  G.openRack = function (frame) {
    var s = W.save, u = s.unlocks, its = [];
    function cost(key) { return D.UNLOCKS.filter(function (x) { return x.key === key; })[0].cost; }
    function equip(k, vi) { s.weapon = k; s.variant = vi; G.run.weapon = k; G.run.variantKey = vi ? k + vi : null; var P = G.player; Gf.scene.remove(P.rig.root); G.player = C.makePlayer(P.x, P.z); W.audio.sfx('install'); }
    var line = 'You have ' + s.cores + ' Core' + (s.cores === 1 ? '' : 's') + '. Bosses carry them.';
    if (typeof frame !== 'string') {
      D.WEAPON_ORDER.filter(function (k) { var ch = D.WEAPONS[k].char; return !ch || ch === G.run.char; }).forEach(function (k) {
        var w = D.WEAPONS[k], have = k === 'baton' || !!w.char || !!u[k], cur = s.weapon === k;
        its.push({ tag: have ? (cur ? 'In hand' : (w.variants.length > 1 ? w.variants.length + ' builds' : 'Take')) : 'Locked', tagCol: cur ? '#ffb347' : null, title: w.name, text: w.text + (cur && s.variant ? ' Fitted: ' + w.variants[s.variant].name + '.' : ''), cost: have ? '' : cost(k) + ' Core', dis: !have && s.cores < cost(k), k: k, have: have });
      });
      if (u.pool < 4) its.push({ tag: 'Stock', title: 'Black-market stock', text: 'A new implant enters the pool. ' + u.pool + ' of 4 found.', cost: '1 Core', pool: true, dis: s.cores < 1 });
      U.menu({ kicker: 'Pike · the rack', title: 'Weapon frames', portrait: 'pike', who: 'Pike', line: line, items: its, close: 'Step away', onPick: function (i) {
        var it = its[i];
        if (it.pool) { s.cores--; u.pool++; W.audio.sfx('buy'); }
        else if (!it.have) { s.cores -= cost(it.k); u[it.k] = true; W.audio.sfx('buy'); }
        else if (D.WEAPONS[it.k].variants.length > 1) { W.writeSave(); G.openRack(it.k); return true; }
        else equip(it.k, 0);
        W.writeSave(); G.openRack(); return true;
      } });
    } else {
      var w = D.WEAPONS[frame];
      w.variants.forEach(function (v, vi) { var hv = vi === 0 || !!u[v.key], cur = s.weapon === frame && s.variant === vi; its.push({ tag: hv ? (cur ? 'In hand' : 'Take') : 'Locked', tagCol: cur ? '#ffb347' : null, title: vi === 0 ? w.name : v.name, text: vi === 0 ? w.text : v.text, cost: hv ? '' : cost(v.key) + ' Core', dis: !hv && s.cores < cost(v.key), vi: vi, hv: hv, key: v.key }); });
      its.push({ tag: 'Rack', title: 'Other frames', text: 'Back to the full rack.', back: true });
      U.menu({ kicker: 'Pike · the rack', title: w.name, portrait: 'pike', who: 'Pike', line: line, items: its, close: 'Step away', onPick: function (i) {
        var it = its[i];
        if (it.back) { G.openRack(); return true; }
        if (!it.hv) { s.cores -= cost(it.key); u[it.key] = true; W.audio.sfx('buy'); } else equip(frame, it.vi);
        W.writeSave(); G.openRack(frame); return true;
      } });
    }
  };
  G.openBounty = function () {
    var s = W.save, its = D.BOUNTY.map(function (b) { return { tag: s.bounty[b.key] ? 'Active' : 'Off', tagCol: s.bounty[b.key] ? '#ff4a26' : null, title: b.name, text: b.text, b: b }; });
    U.menu({ kicker: 'Bounty board', title: 'Raise the price on your head', line: 'Chosen modifiers make the next climb harder and pay more.', items: its, close: 'Step away', onPick: function (i) { s.bounty[its[i].b.key] = !s.bounty[its[i].b.key]; W.writeSave(); G.run.bounty = s.bounty; G.setBounty(); G.applyBoard(); G.openBounty(); return true; } });
  };

  // ---- run rooms ----
  G.startRun = function () { var run = G.run; run.areaIdx = 0; run.area = 'sumps'; run.roomIdx = -1; run.fightIdx = 0; W.save.runs++; W.writeSave(); G.state = 'run'; G.nextRoom({ kind: 'none' }); };
  G.nextRoom = function (reward) {
    var run = G.run; run.roomIdx++; run.heat = G.player ? G.player.heat : 0; run.nextReward = reward;
    var plan = PLAN[run.area], kind = run.roomIdx < plan.length ? plan[run.roomIdx] : 'boss';
    G.roomKind = kind; G.state = 'run';
    var def, seed = run.seed * 31 + run.areaIdx * 100 + run.roomIdx * 7;
    if (kind === 'boss') def = Wd.ROOMS[run.area === 'sumps' ? 'boss1' : 'boss2'];
    else if (kind === 'shop') def = Wd.ROOMS.shop;
    else if (run.area === 'sumps' && run.roomIdx === 0) def = Wd.ROOMS.sumps[0];
    else { var bag = run.bag[run.area]; def = Wd.ROOMS[run.area][bag[(run.roomIdx) % bag.length]]; }
    var room = G.loadRoom(def, run.area, seed);
    G.hpScale = run.area === 'market' ? 1.25 : 1;
    G.whereText = AREA_NAME[run.area] + ' · ' + def.name + (kind === 'boss' ? '' : ' · ' + (run.roomIdx + 1) + ' of ' + plan.length);
    W.audio.setTrack(kind === 'boss' ? (run.area === 'sumps' ? 'boss1' : 'boss2') : run.area);
    if (kind === 'fight' || kind === 'elite') {
      var w = WAVES[run.area][Math.min(run.fightIdx, WAVES[run.area].length - 1)]; if (kind === 'elite') w = WAVES.sumps[4];
      G.risk = !!(reward && reward.kind === 'risk'); if (G.risk) { w = RISK[run.area]; G.hpScale *= 1.1; }
      G.waves = JSON.parse(JSON.stringify(w)).map(expandWave); run.fightIdx += kind === 'fight' ? 1 : 0;
      if (run.bounty.crowd && !(run.area === 'sumps' && run.roomIdx === 0)) G.waves.forEach(function (wv) { wv.push(run.rng.pick(run.area === 'sumps' ? ['scav', 'hound', 'leech'] : ['scav', 'hound', 'hopper'])); });
      if (G.B.eliteMore && !(run.area === 'sumps' && run.roomIdx === 0)) { var lw = G.waves[G.waves.length - 1]; lw[0] = 'E:' + lw[0].replace('E:', ''); }
      if (run.bounty.elites && kind === 'fight' && !(run.area === 'sumps' && run.roomIdx === 0)) G.waves[G.waves.length - 1][0] = 'E:' + G.waves[G.waves.length - 1][0].replace('E:', '');
      // seeded variation: one extra from the area pool after the first rooms
      if (run.roomIdx > 1 && kind === 'fight') { var pool = run.area === 'sumps' ? ['leech', 'hound', 'scav', 'rat', 'bomber'] : ['leech', 'hound', 'scav', 'ghost', 'hopper']; G.waves[G.waves.length - 1].push(run.rng.pick(pool)); if (run.areaIdx === 1) G.waves[0].push(run.rng.pick(['leech', 'scav'])); }
      G.waveIdx = 0; G.waveT = 0.9; G.inCombat = true; var rk = reward && reward.kind; G.waveHold = rk === 'implant' || rk === 'chop' || rk === 'gear' || rk === 'scrip' || rk === 'health' || rk === 'memory' || rk === 'shrine';
      if (G.risk) U.banner('Hunting ground', 'Elites hold this room. The spoils are yours if you clear it.', 2.4); if (G.waveHold) G.rewardT = 0.7; G.tutorial = run.area === 'sumps' && run.roomIdx === 0;
      if (G.tutorial) U.toast('Three pipe scavs. Left click to hit. Knock them into the water.', 7);
    } else if (kind === 'shop') {
      var pr = room.props.H; G.npcHask = npc('hask', pr.x, pr.z - 0.2, 0, 'hask'); G.shopStock = null;
      G.spots = [{ x: pr.x, z: pr.z + 1.4, r: 2.6, label: '<b>E</b> Trade with Hask', fn: G.openShop }];
      G.cleared = true; G.rewardT = -1; G.doorT = 0.5; U.say('hask', run.rng.pick(D.LINES.hask.shop), 4);
    } else if (kind === 'event') { G.cleared = false; G.eventT = 1.0; }
    else if (kind === 'boss') {
      var b = run.area === 'sumps' ? Bs.spawnDredge(room) : Bs.spawnMarrow(room);
      if (P_.phase && P_.phase > 1) { b.hp = Math.round(b.maxHp * (P_.phase === 2 ? 0.65 : 0.32)); }
      G.inCombat = true; G.cinematic = 2.6; G.cineX = b.x; G.cineZ = b.z; W.audio.sfx('bossIntro');
      U.banner(b.name, run.area === 'sumps' ? 'A dredging machine with a scav crew at the levers' : 'A rival courier, hired to take the Package', 2.6);
      U.say(run.area === 'sumps' ? 'dredge' : 'marrow', run.area === 'sumps' ? D.LINES.dredge[0] : D.LINES.marrow[0], 2.6);
    }
    run.stats.rooms++; G.log('room ' + run.area + ' ' + run.roomIdx + ' ' + kind + ' ' + def.name + ' implants=' + run.implants.length);
    if (kind !== 'shop' && kind !== 'boss' || true) G.spots = G.spots && kind === 'shop' ? G.spots : [];
    if (kind === 'shop') G.spots = [{ x: room.props.H.x, z: room.props.H.z + 1.4, r: 2.6, label: '<b>E</b> Trade with Hask', fn: G.openShop }];
  };
  function spawnWave(list) {
    var P = G.player, room = G.room;
    list.forEach(function (t, i) {
      var elite = t.indexOf('E:') === 0; if (elite) t = t.slice(2);
      var sp = Wd.freeSpot(room, G.rng, P.x, P.z, t === 'spitter' || t === 'rigger' || t === 'sniper' || t === 'netter' || t === 'shepherd' ? 9 : 5.5, G.tutorial ? 9 : 15);
      var e = E.spawn(t, sp.x, sp.z, { elite: elite, slow: G.tutorial, hp: G.tutorial ? 22 : 0 });
      e.spawnT += i * 0.12; if (G.tutorial) { e.speed = 2.4; e.cd = 2; }
    });
  }
  function rollDoors() {
    var run = G.run, room = G.room, plan = PLAN[run.area], nextKind = run.roomIdx + 1 < plan.length ? plan[run.roomIdx + 1] : 'boss';
    var doors = room.doors.slice(), n, rewards = [];
    if (nextKind === 'boss') rewards = [{ kind: 'boss', icon: 'boss', label: run.area === 'sumps' ? 'The Dredge' : 'Marrow', sub: 'Boss', col: '#ff7a4a' }];
    else if (nextKind === 'shop') rewards = [{ kind: 'shop', icon: 'shop', label: "Hask's stall", sub: 'Spend scrip' }];
    else if (nextKind === 'event') rewards = [{ kind: 'event', icon: 'event', label: 'A deal', sub: 'A syndicate wants to talk' }];
    else {
      n = Math.min(doors.length, 2 + (W.save.board.doors || (run.area === 'sumps' && run.roomIdx === 0) ? 1 : 0));
      var fk = run.rng.shuffle(Pt.FKEYS.slice());
      if (run.area === 'sumps' && run.roomIdx === 0) { for (var i = 0; i < n; i++) rewards.push(impReward(fk[i])); }
      else {
        var kinds = run.rng.shuffle(['implant', 'implant', 'implant', 'chop', 'gear', 'scrip', 'health', 'memory', 'shrine', 'risk']).slice(0, n); if (kinds.indexOf('implant') < 0) kinds[0] = 'implant';
        if (nextKind === 'elite' || run.boons.length >= 3) kinds = kinds.map(function (k) { return k === 'risk' || (k === 'shrine' && run.boons.length >= 3) ? 'scrip' : k; });
        if (P_.door) kinds[kinds.length - 1] = P_.door;
        if (run.wtier >= 3) kinds = kinds.map(function (k) { return k === 'chop' ? 'scrip' : k; });
        kinds.forEach(function (k, j) {
          if (k === 'implant') rewards.push(impReward(fk[j % 4]));
          else if (k === 'chop') rewards.push({ kind: 'chop', label: 'Chop shop', sub: 'Weapon tier ' + (run.wtier + 1) });
          else if (k === 'gear') rewards.push({ kind: 'gear', label: 'Gear', sub: 'A rig or a deck' });
          else if (k === 'scrip') rewards.push({ kind: 'scrip', label: 'Scrip', sub: '35 to spend', col: '#ffd070' });
          else if (k === 'health') rewards.push({ kind: 'health', label: 'Patch kit', sub: 'Mend 35 health', col: '#ff6a4a' });
          else if (k === 'shrine') rewards.push({ kind: 'shrine', label: 'Drowned shrine', sub: 'A pact: a gift and its price', col: '#c8b8ff' });
          else if (k === 'risk') rewards.push({ kind: 'risk', label: 'Hunting ground', sub: 'Elites · implant, 40 scrip, 10 Memory', col: '#ff4a26' });
          else rewards.push({ kind: 'memory', label: 'Memory', sub: '12 for the board', col: '#9fe8e0' });
        });
      }
      if (nextKind === 'elite') rewards.forEach(function (r) { r.sub = 'Elite guard · ' + r.sub; });
    }
    // spread over the doors, centre first when there is one
    var order = rewards.length === 1 ? [Math.floor(doors.length / 2)] : (rewards.length === 2 ? [0, doors.length - 1] : [0, 1, 2]);
    rewards.forEach(function (r, i) { var d = doors[order[i]]; if (d) { d.reward = r; d.active = true; } });
  }
  function impReward(f) { var fa = Pt.FACTION[f]; return { kind: 'implant', f: f, label: fa.short + ' implant', sub: fa.name, col: fa.col, bg: '' }; }
  function openDoors() { rollDoors(); if (G.run.roomIdx === 0 && G.run.area === 'sumps' && !G.attract) U.toast('The doors to the north are open. Each one shows what waits behind it.', 8); G.room.doors.forEach(function (d) { if (d.active) { d.open = true; d.lampOn.visible = true; d.lampOff.visible = false; d.light.base = 0.9; } }); W.audio.sfx('door'); }
  G.onRoomClear = function () {
    G.cleared = true; G.inCombat = false; W.audio.sfx('clear'); W.audio.target = 0; G.log('clear');
    G.tells.forEach(function (t) { t.cancel = true; });
    G.zones.forEach(function (z) { z.life = Math.min(z.life, 0.3); });
    G.slowmo = Math.max(G.slowmo, 0.5);
    U.banner('Room clear', '', 1.3);
    G.doorT = 0.9;
  };

  // ---------------- rewards ----------------
  G.poolFor = function (f, n) {
    var run = G.run, have = {}; run.implants.forEach(function (it) { have[it.id] = 1; });
    var all = Object.keys(D.IMPLANTS).map(function (k) { return D.IMPLANTS[k]; }).filter(function (m) { return (!f || m.f === f) && !have[m.id] && (!m.unlock || W.save.unlocks.pool >= m.unlock) && D.fitsEmpty(m, run.cellTier); });
    run.rng.shuffle(all);
    if (run.implants.length === 0 && run.area === 'sumps' && run.roomIdx <= 1) all.sort(function (a, b) { return (a.zone === 'arm' ? 0 : 1) - (b.zone === 'arm' ? 0 : 1); }); // the first offer is an obvious one
    return all.slice(0, n);
  };
  G.offerImplants = function (f, done, opts) {
    opts = opts || {}; var run = G.run, list = opts.list || G.poolFor(f, run.offers), fa = f ? Pt.FACTION[f] : null, L = f ? D.LINES[f] : null;
    if (!list.length) { run.scrip += 25; U.toast('Nothing new on offer. 25 scrip instead.'); done(); return; }
    var snub = f && run.lastFaction && run.lastFaction !== f && !run.snub[f] && run.implants.length > 0;
    var line = opts.line || (snub ? L.snub[run.rng.int(0, L.snub.length - 1)] + ' ' + L.offer[0] : L.offer[run.rng.int(0, L.offer.length - 1)]);
    if (snub) run.snub[f] = 1;
    var its = list.map(function (m) { var mf = Pt.FACTION[m.f]; return { tag: mf.short + ' · ' + (m.zone === 'arm' ? 'arm' : D.ZONE_NAME[m.zone].toLowerCase()), tagCol: mf.col, title: m.name, text: m.text, heat: m.heat, imp: m }; });
    var extra = [];
    if (run.rerolls > 0 && !opts.list) extra.push({ label: 'Reroll (' + run.rerolls + ')', fn: function () { run.rerolls--; U.closeMenu(); G.offerImplants(f, done, opts); } });
    U.menu({ kicker: opts.kicker || (fa.name + ' on comms'), title: opts.title || 'Choose an implant', portrait: opts.portrait || f, who: opts.who || fa.contact, line: line, items: its, extra: extra, close: 'Leave it (+10 scrip)', onClose: function () { run.scrip += 10; done(); },
      onPick: function (i) {
        var m = list[i]; run.used[m.f] = (run.used[m.f] || 0) + 1; run.lastFaction = m.f; W.save.lastChoice = m.f;
        U.closeMenu();
        U.grid.open({ newId: m.id, note: 'Place the ' + m.name + '. It fits ' + (m.zone === 'arm' ? 'either arm' : 'the ' + D.ZONE_NAME[m.zone].toLowerCase()) + '.', onDone: function () { if (D.LINES[m.f]) U.say(m.f, D.LINES[m.f].thanks[0], 3); if (!G.hinted.heat) { G.hinted.heat = true; U.toast('Implants make heat when they fire. E vents it in a ring of steam. Water cools you.', 7); } done(); } });
        return true;
      } });
  };
  G.giveReward = function (r, done) {
    var run = G.run;
    if (!r || r.kind === 'none' || r.kind === 'boss' || r.kind === 'shop' || r.kind === 'event') { done(); return; }
    if (r.kind === 'implant') G.offerImplants(r.f, done);
    else if (r.kind === 'chop') {
      var mods = run.rng.shuffle(D.MODS.filter(function (m) { return run.mods.indexOf(m.id) < 0; })).slice(0, 2);
      U.menu({ kicker: 'Chop shop bench', title: D.WEAPONS[run.weapon].name + ' · tier ' + (run.wtier + 1), line: 'Every tier adds 10% damage. Pick one mod to bolt on.', items: mods.map(function (m) { return { tag: 'Mod', title: m.name, text: m.text }; }), onPick: function (i) { run.wtier++; run.mods.push(mods[i].id); G.rebuild(); W.audio.sfx('install'); done(); } });
    } else if (r.kind === 'gear') {
      var gs = run.rng.shuffle(Object.keys(D.GEAR).filter(function (k) { return run.rig !== k && run.deck !== k; })).slice(0, run.offers);
      U.menu({ kicker: 'Gear cache', title: 'Take one', line: 'A rig changes your dash. A deck changes your tag drone.', items: gs.map(function (k) { var g = D.GEAR[k]; return { tag: g.slot === 'rig' ? 'Rig · dash' : 'Deck · tag drone', title: g.name, text: g.text }; }), onPick: function (i) { var g = D.GEAR[gs[i]]; run[g.slot] = gs[i]; G.rebuild(); G.player.dashes = G.player.maxDashes; W.audio.sfx('install'); done(); } });
    } else if (r.kind === 'scrip') { run.scrip += 35; F.text(G.player.x, 2.8, G.player.z, '+35 scrip', 'scrip', 1.2); W.audio.sfx('buy'); done(); }
    else if (r.kind === 'health') { G.heal(35); done(); }
    else if (r.kind === 'shrine') {
      var bs = run.rng.shuffle(Object.keys(D.BOONS).filter(function (k) { return run.boons.indexOf(k) < 0; })).slice(0, 3);
      U.menu({ kicker: 'Drowned shrine', title: 'Make a pact', line: D.LINES.shrine[0] + ' ' + D.LINES.shrine[1], items: bs.map(function (k) { var bn = D.BOONS[k]; return { tag: 'Pact', tagCol: '#c8b8ff', title: bn.name, text: bn.text, heat: 'Price: ' + bn.price, boon: bn }; }), close: 'Leave it be', onClose: done, onPick: function (i) { run.boons.push(bs[i]); G.rebuild(); G.player.dashes = G.player.maxDashes; W.audio.sfx('install'); F.text(G.player.x, 3.0, G.player.z, D.BOONS[bs[i]].name, 'call fusion', 1.3); done(); } });
    }
    else if (r.kind === 'memory') { G.gainMemory(12 / (G.memMul || 1) * (G.memMul || 1)); F.text(G.player.x, 2.8, G.player.z, '+12 Memory', 'heal', 1.2); W.audio.sfx('buy'); done(); }
    else done();
  };
  G.openShop = function () {
    var run = G.run;
    if (!G.shopStock) {
      var gk = run.rng.shuffle(Object.keys(D.GEAR).filter(function (k) { return run.rig !== k && run.deck !== k; }))[0], md = run.rng.shuffle(D.MODS.filter(function (m) { return run.mods.indexOf(m.id) < 0; }))[0], im = G.poolFor(null, 1)[0];
      G.shopStock = [{ id: 'heal', title: 'Patch kit', text: 'Mend 40 health.', cost: 30, tag: 'Health' }, { id: 'gear', k: gk, title: D.GEAR[gk].name, text: D.GEAR[gk].text, cost: 45, tag: D.GEAR[gk].slot === 'rig' ? 'Rig · dash' : 'Deck · tag drone' }];
      if (md && run.wtier < 3) G.shopStock.push({ id: 'mod', m: md, title: md.name, text: md.text + ' Weapon tier +1.', cost: 50, tag: 'Weapon mod' });
      if (im) G.shopStock.push({ id: 'imp', m: im, title: im.name, text: im.text, cost: 55, tag: Pt.FACTION[im.f].short + ' implant', tagCol: Pt.FACTION[im.f].col, imp: im, heat: im.heat });
      G.shopStock.push({ id: 'reroll', title: 'Second opinion', text: 'One reroll of implant offers.', cost: 20, tag: 'Reroll' });
    }
    var its = G.shopStock.map(function (s) { return { tag: s.sold ? 'Sold' : s.tag, tagCol: s.tagCol, title: s.title, text: s.text, heat: s.heat, imp: s.imp, cost: s.cost + ' scrip', dis: s.sold || run.scrip < s.cost, s: s }; });
    var poor = !its.some(function (i) { return !i.dis; });
    U.menu({ kicker: "Hask's stall", title: 'Vending', portrait: 'hask', who: 'Hask', line: poor ? D.LINES.hask.poor[0] : 'You have ' + run.scrip + ' scrip. ' + run.rng.pick(D.LINES.hask.shop), items: its, close: 'Leave', onPick: function (i) {
      var s = its[i].s; run.scrip -= s.cost; s.sold = true; W.audio.sfx('buy');
      if (s.id === 'heal') { G.heal(40); s.sold = false; s.cost += 15; }
      else if (s.id === 'gear') { run[D.GEAR[s.k].slot] = s.k; G.rebuild(); }
      else if (s.id === 'mod') { run.wtier++; run.mods.push(s.m.id); G.rebuild(); }
      else if (s.id === 'reroll') { run.rerolls++; }
      else if (s.id === 'imp') { run.used[s.m.f] = (run.used[s.m.f] || 0) + 1; U.closeMenu(); U.grid.open({ newId: s.m.id, onDone: function () { } }); return true; }
      G.openShop(); return true;
    } });
  };
  G.openEvent = function () {
    var run = G.run, f = run.rng.pick(Pt.FKEYS), fa = Pt.FACTION[f], big = G.poolFor(f, 6).sort(function (a, b) { return D.SHAPES[b.shape].length - D.SHAPES[a.shape].length; })[0];
    var its = [{ tag: 'Price: 15 max health', tagCol: fa.col, title: big ? big.name : 'Nothing', text: big ? big.text : 'No stock.', heat: big ? big.heat : '', imp: big, dis: !big }, { tag: 'Price: your next room starts at 70 heat', title: 'Sell a scan', text: 'Let them scan the Package through your eye. 60 scrip.' }, { tag: 'Free', title: 'Walk away', text: 'Owe nothing. Gain nothing.' }];
    U.menu({ kicker: fa.name + ' · a deal', title: 'An offer, at a price', portrait: f, who: fa.contact, line: 'We know what you carry. Lean our way and we will be generous.', items: its, onPick: function (i) {
      if (i === 0) { run.baseMaxHp -= 15; run.maxHp -= 15; run.hp = Math.min(run.hp, run.maxHp); run.used[f] = (run.used[f] || 0) + 1; run.lastFaction = f; U.closeMenu(); U.grid.open({ newId: big.id, onDone: function () { openDoors(); } }); return true; }
      if (i === 1) { run.scrip += 60; G.player.heat = 70; W.audio.sfx('buy'); }
      openDoors();
    } });
  };

  // ---------------- bosses, death, end ----------------
  G.onBossDead = function (e) {
    var run = G.run, s = W.save; G.log('BOSS DEAD ' + e.type);
    G.tells.forEach(function (t) { t.cancel = true; }); if (e.jets) e.jets.forEach(function (j) { F.kill(j.fx); });
    G.enemies.forEach(function (o) { if (o !== e && !o.dead) { o.summon = true; C.kill(o, {}); } });
    Gf.uni.uSurge.value = 0; G.surgeInfo = null; G.slowmo = 1.6; F.addShake(0.7); W.audio.sfx('boom'); W.audio.sfx('win'); W.audio.target = 0;
    F.steamBurst(e.x, e.z, 18, 8); for (var i = 0; i < 12; i++) { var a = Math.random() * 6.28; F.spawn(K.SPARK, { x: e.x + Math.cos(a) * 2, y: 1 + Math.random() * 2, z: e.z + Math.sin(a) * 2, s: 2 + Math.random() * 2, bill: true, col: i % 2 ? 0xffb347 : 0xffffff, dur: 0.4, delay: i * 0.08 }); }
    var cores = 1 + (run.bounty.fast ? 1 : 0) + (run.bounty.frail && e.type !== 'dredge' ? 1 : 0); s.cores += cores; G.inCombat = false; G.cleared = true;
    if (e.type === 'dredge') { if (!s.boss1) G.newBoss1 = true; s.boss1++; U.banner('The Dredge is scrap', '+' + cores + ' Core', 3); }
    else { s.boss2++; U.banner('Marrow is down', '+' + cores + ' Core', 3); run.implants.forEach(function (it) { it.torn = false; }); G.rebuild(); }
    W.writeSave(); G.bossRewardT = 2.4; G.bossDeadType = e.type; G.bossFaction = e.faction;
  };
  function bossReward() {
    var run = G.run;
    if (G.bossDeadType === 'dredge') {
      G.heal(30);
      G.offerImplants(null, function () { var d = G.room.doors[0]; d.reward = { kind: 'boss', icon: 'boss', label: 'The Market Decks', sub: 'Into the Stack' }; d.active = true; d.open = true; d.lampOn.visible = true; d.lampOff.visible = false; d.light.base = 0.9; W.audio.sfx('door'); }, { list: Pt.FKEYS.map(function (f) { return G.poolFor(f, 1)[0]; }).filter(Boolean).slice(0, 3), kicker: 'Pulled from the wreck', title: 'Salvage', portrait: 'ruen', who: 'Mother Ruen, on comms', line: 'That machine was full of stolen grafts. Take one before the tide does.' });
    } else {
      G.offerImplants(G.bossFaction, function () { var d = G.room.doors[0]; d.reward = { kind: 'boss', icon: 'boss', label: 'The lift', sub: 'To the roof' }; d.active = true; d.open = true; d.lampOn.visible = true; d.lampOff.visible = false; d.light.base = 0.9; W.audio.sfx('door'); }, { kicker: "Marrow's grid", title: 'Take one of hers', portrait: 'marrow', who: 'Marrow', line: 'You got yours back. Fine. Take another. You will need it up there.' });
    }
  }
  G.onDeath = function () {
    var P = G.player; if (!P.alive) return; G.log('DEATH in ' + G.whereText + (G.boss ? ' bossHp=' + Math.round(G.boss.hp) + ' phase=' + G.boss.phase : ''));
    P.alive = false; P.st = 0; G.slowmo = 1.2; G.deathT = 1.5; W.audio.sfx('death'); W.audio.target = 0; F.addShake(0.5);
    F.spawn(K.SPARK, { x: P.x, y: 0.08, z: P.z, s: 3, col: 0x0c0e14, dur: 0.8 });
    G.tells.forEach(function (t) { t.cancel = true; });
  };
  function afterDeath() {
    var s = W.save; s.deaths++; s.bestRoom = Math.max(s.bestRoom, G.run.areaIdx * 7 + G.run.roomIdx); W.writeSave();
    if (G.attract) { G.fade(function () { G.startAttract(); }); return; }
    U.veil('The Package hums in the dark', 'You wake on Mother Ruen\'s table.');
    G.fade(function () { G.enterHub(false, true); }, 1.0);
  }
  G.enterEnd = function () {
    G.log('END reached'); G.state = 'end'; var room = G.loadRoom(Wd.ROOMS.roof, 'roof', 5), pr = room.props.A;
    G.whereText = 'The landing pad, roof of the Corwen Stack';
    var ac = M.make('aircraft'); ac.root.position.set(pr.x, 0, pr.z - 1.5); ac.root.rotation.y = 0.35; Gf.scene.add(ac.root); G.extra.push(ac.root);
    G.buyer = npc('buyer', pr.x + 2.2, pr.z + 3.2, 0.2, 'buyer');
    room.lights.push({ x: pr.x, y: 2.5, z: pr.z + 2, r: 9, col: [1.0, 0.8, 0.5], k: 0.8, base: 0.8, flick: 0 });
    W.audio.setTrack('roof'); W.audio.target = 0.4; W.save.wins++; W.writeSave(); G.endT = 0; G.endStage = 0; G.lastEnd = 'win';
    U.banner('Dawn over Saltreach', 'The buyer is waiting by the aircraft', 3.5);
  };
  function endCard() {
    var run = G.run, st = run.stats, mm = Math.floor(st.time / 60), ss = Math.floor(st.time % 60);
    var rows = [['Courier', C.char().name], ['Weapon', D.WEAPONS[run.weapon].name], ['Pacts', run.boons.length ? run.boons.map(function (k) { return D.BOONS[k].name.replace(' pact', ''); }).join(', ') : 'None'], ['Time', mm + ':' + (ss < 10 ? '0' : '') + ss], ['Kills', st.kills], ['Rooms', st.rooms], ['Damage taken', st.dmgTaken], ['Vents', st.vents], ['Redlines', st.redlines], ['Fusions fired', st.fusions], ['Implants', run.implants.length], ['Memory carried out', st.memory]];
    U.menu({ kicker: 'End of the slice', title: 'The Package goes higher', portrait: 'buyer', who: 'The buyer', line: D.LINES.buyer[2] + ' Next: the Spire, above the roof. Not built yet.', html: '<div id="endcard"><table>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table></div>', items: [{ tag: 'Mother Ruen is waiting', title: 'Back to the clinic', text: 'A bounty board is now open in the hub. Raise the difficulty for more reward.' }], onPick: function () { G.fade(function () { G.enterHub(false, true); }); } });
  }

  // ---------------- attract & first click ----------------
  G.startAttract = function () {
    G.attract = true; G.botOn = true; G.state = 'run';
    var run = G.newRun(P_.seed || 4242);
    run.cellTier = 2; run.hp = run.maxHp = run.baseMaxHp = 140;
    [['ram_servo', 'armR'], ['arc_coil', 'armL'], ['toxin_gland', null], ['marking_eye', 'head'], ['plate_lattice', 'spine'], ['slow_bloom', 'legs']].forEach(function (d) { var b = D.autoPlace(run, d[0]); if (b) run.implants.push({ id: d[0], cells: b.cells, rot: b.rot }); });
    G.rebuild(); run.roomIdx = 0; run.fightIdx = 1;
    G.nextRoom({ kind: 'none' });
    G.whereText = 'Saltreach · attract run'; U.attract(true); G.waveT = 0.05; G.player.x = 0; G.player.z = 1; G.camX = 0; G.camZ = -1;
    for (var q = 0; q < 50; q++) G.step(1 / 60);
  };
  G.beginPlay = function () {
    if (!G.attract) return; G.attract = false; G.botOn = false; U.attract(false);
    G.fade(function () { G.newRun(P_.seed || (Date.now() & 0xfffff) + 1); if (W.save.runs === 0 && W.save.deaths === 0) G.startRun(); else G.enterHub(true); }, 0.15);
  };
  G.fade = function (cb, hold) { G.fadeCb = cb; G.fadeDir = 1; G.fadeHold = hold || 0; };

  // ---------------- debug states ----------------
  G.debugState = function (st) {
    var run = G.newRun(P_.seed || 99), s = W.save;
    function kit(list) { list.forEach(function (id) { var b = D.autoPlace(run, id); if (b) run.implants.push({ id: id, cells: b.cells, rot: b.rot }); }); G.rebuild(); }
    if (st === 'hub') { G.enterHub(true); return; }
    if (st === 'end') { kit(['ram_servo', 'arc_coil']); G.enterEnd(); return; }
    run.cellTier = Math.max(run.cellTier, 2);
    if (st === 'area1') { kit(P_.meta === 'full' ? ['ram_servo', 'arc_coil', 'toxin_gland', 'plate_lattice', 'marking_eye', 'slow_bloom', 'hairline_optic'] : ['ram_servo', 'arc_coil', 'toxin_gland']); run.roomIdx = P_.room != null ? P_.room - 1 : 1; run.fightIdx = Math.max(0, Math.min(3, run.roomIdx + 1)); G.nextRoom({ kind: 'none' }); }
    else if (st === 'boss1') { kit(['ram_servo', 'arc_coil', 'toxin_gland', 'plate_lattice']); run.wtier = 1; run.roomIdx = 5; G.nextRoom({ kind: 'none' }); }
    else if (st === 'area2') { kit(['ram_servo', 'arc_coil', 'toxin_gland', 'plate_lattice', 'marking_eye']); run.wtier = 1; run.areaIdx = 1; run.area = 'market'; run.roomIdx = P_.room != null ? P_.room - 1 : 0; run.fightIdx = Math.max(0, Math.min(3, run.roomIdx + 1 - (run.roomIdx >= 3 ? 1 : 0))); G.nextRoom({ kind: 'none' }); }
    else if (st === 'boss2') { kit(['ram_servo', 'arc_coil', 'toxin_gland', 'plate_lattice', 'marking_eye', 'slow_bloom']); run.wtier = 2; run.mods = ['weighted', 'quick']; run.areaIdx = 1; run.area = 'market'; run.roomIdx = 5; run.used = { orrin: 2, ninefold: 1, quiet: 2 }; G.rebuild(); G.nextRoom({ kind: 'none' }); }
    else if (st === 'grid') { kit(['ram_servo', 'arc_coil', 'toxin_gland', 'plate_lattice', 'marking_eye', 'slow_bloom', 'hairline_optic']); run.roomIdx = 0; run.fightIdx = 1; G.nextRoom({ kind: 'none' }); G.waves = null; G.inCombat = false; G.cleared = true; U.grid.open({ newId: P_.bot ? null : 'overclock' }); }
    if (P_.bot === 'dodge' && G.boss) { G.dodgeTest = { t: 0, hits: 0 }; }
  };

  // ---------------- simulation step ----------------
  G.step = function (dt) {
    var I = W.input;
    // first input ends the attract run
    if (G.attract && I.any && !P_.auto) { I.any = false; G.beginPlay(); }
    I.any = false;
    // fades
    if (G.fadeDir) {
      G.fadeK += G.fadeDir * dt / 0.28;
      if (G.fadeDir > 0 && G.fadeK >= 1) { G.fadeK = 1; if (G.fadeHold > 0) G.fadeHold -= dt; else { G.fadeDir = -1; var cb = G.fadeCb; G.fadeCb = null; U.hideVeil(); if (cb) cb(); } }
      else if (G.fadeDir < 0 && G.fadeK <= 0) { G.fadeK = 0; G.fadeDir = 0; }
      Gf.finalMat.uniforms.uFade.value = G.fadeK;
    }
    if (U.modal) { U.updateModal(dt); if (G.botOn) W.bot.menu(dt); I.endFrame(); return; }
    if (!G.player || !G.room) { I.endFrame(); return; }
    // hit-stop: the world holds its pose
    if (G.hitstop > 0) { G.hitstop -= dt; F.update(dt * 0.25); I.endFrame2 && 0; keepInput(); return; }
    var sdt = dt; if (G.slowmo > 0) { G.slowmo -= dt; sdt = dt * 0.35; }
    G.time += sdt; if (G.state === 'run' && G.inCombat) G.run.stats.time += dt;
    Gf.uni.uTime.value = G.time;
    var P = G.player, room = G.room, run = G.run;
    // input → actions
    var act;
    if (G.cinematic > 0) { G.cinematic -= dt; act = { mx: 0, mz: 0 }; }
    else if (G.botOn) act = W.bot.act(sdt);
    else { act = W.readActions(); if (!act.aimDir) act.aimAt = Gf.groundPoint(I.mouseX, I.mouseY); }
    if (G.fadeDir > 0) act = { mx: 0, mz: 0 };
    // stillframe: the player keeps full speed while the world crawls
    var pdt = G.slowmo > 0 && G.B.stillframe ? dt * 0.85 : sdt;
    C.updatePlayer(pdt, act);
    E.update(sdt); C.updateTells(sdt); C.updateShots(sdt); C.updateZones(sdt); E.updateHazards(sdt);
    F.update(sdt);
    room.time += sdt;
    // waves
    if (G.waves) {
      var alive = 0; G.enemies.forEach(function (e) { if (!e.dead && e.team === 1 && !e.summon) alive++; });
      if (G.waveHold) { /* the syndicates are on comms */ } else if (G.waveIdx < G.waves.length) { if (alive <= (G.waveIdx === 0 ? 0 : 1)) { G.waveT -= sdt; if (G.waveT <= 0) { spawnWave(G.waves[G.waveIdx++]); G.waveT = 0.7; } } }
      else if (alive === 0 && !G.cleared) { G.enemies.forEach(function (e) { if (!e.dead) C.kill(e, {}); }); G.onRoomClear(); }
      W.audio.target = G.cleared ? 0 : W.clamp(0.35 + alive * 0.13, 0.35, 1);
    } else if (G.boss && !G.boss.dead) W.audio.target = 0.75 + G.boss.phase * 0.08;
    if (G.rewardT > 0) { G.rewardT -= dt; if (G.rewardT <= 0) { G.rewardT = -1; G.giveReward(run.nextReward, function () { G.waveHold = false; }); } }
    if (G.doorT > 0) { G.doorT -= dt; if (G.doorT <= 0) { if (G.risk) { G.risk = false; run.scrip += 40; G.gainMemory(10); F.text(P.x, 2.8, P.z, '+40 scrip', 'scrip', 1.2); W.audio.sfx('buy'); G.offerImplants(null, openDoors, { list: Pt.FKEYS.map(function (f) { return G.poolFor(f, 1)[0]; }).filter(Boolean).slice(0, 3), kicker: 'Hunting ground', title: 'Spoils', portrait: 'pike', who: 'Pike, on comms', line: 'They were carrying. Strip one and move.' }); } else openDoors(); } }
    if (G.bossRewardT > 0) { G.bossRewardT -= dt; if (G.bossRewardT <= 0) bossReward(); }
    if (G.eventT > 0) { G.eventT -= dt; if (G.eventT <= 0) G.openEvent(); }
    if (G.deathT > 0) { G.deathT -= dt; if (G.deathT <= 0) afterDeath(); }
    // doors
    room.doors.forEach(function (d) {
      d.openK = W.damp(d.openK, d.open ? 1 : 0, 5, dt); d.leaf.position.y = d.openK * 4.1; d.light.k = d.light.base;
      room.solid[d.r][d.c] = !(d.open && d.openK > 0.6);
      if (d.open && d.openK > 0.6 && P.alive && !G.fadeDir && Math.abs(P.x - d.x) < 0.95 && P.z < d.z - 0.55) {
        var rw = d.reward;
        G.fade(function () {
          if (G.state === 'hub') { G.sq = null; U.hideSay(); G.startRun(); }
          else if (rw.kind === 'boss' && G.roomKind === 'boss') { if (run.area === 'sumps') { run.areaIdx = 1; run.area = 'market'; run.roomIdx = -1; run.fightIdx = 0; G.nextRoom({ kind: 'none' }); U.banner('The Market Decks', 'A night market inside the Stack', 3); } else G.enterEnd(); }
          else G.nextRoom(rw);
        });
      }
    });
    // interaction spots
    var near = null;
    if (!G.inCombat && G.spots) G.spots.forEach(function (s) { if (W.dist(P.x, P.z, s.x, s.z) < s.r) near = s; });
    if (near) { U.prompt(near.x, 3.2, near.z, near.label); if (act.interact && !G.sq) near.fn(); else if (act.interact && G.sq) nextSay(); }
    else { U.hidePrompt(); if (act.interact && G.sq) nextSay(); }
    if (G.sq) { G.sq.t += dt; if (G.sq.t > 5.4) nextSay(); }
    // NPC idle
    G.npcs.forEach(function (n) { var d = W.dist(P.x, P.z, n.x, n.z); n.rig.root.rotation.y = W.angDamp(n.rig.root.rotation.y, d < 6 ? Math.atan2(P.x - n.x, P.z - n.z) : n.face, 4, dt); M.poseHuman(n.rig, { t: G.time + n.x, speed: 0, phase: 0, act: G.sq && G.sq.key === n.key ? 'talk' : null }, dt); });
    // end scene
    if (G.state === 'end') {
      G.endT += dt;
      if (G.endStage === 0 && (W.dist(P.x, P.z, G.buyer.x, G.buyer.z) < 4 || G.endT > 14)) { G.endStage = 1; G.endT = 0; G.sayQueue('buyer', D.LINES.buyer.slice(0, 2)); }
      if (G.endStage === 1 && (!G.sq || G.endT > 9)) { G.endStage = 2; G.sq = null; U.hideSay(); endCard(); }
    }
    // grid
    if (act.grid && !(G.cinematic > 0) && P.alive && G.state !== 'end') U.grid.open({});
    // dodge-only test log
    if (G.dodgeTest && G.boss) { var dtst = G.dodgeTest; dtst.t += dt; var wantPh = P_.phase || 1; G.boss.hp = Math.max(G.boss.hp, G.boss.maxHp * (wantPh === 1 ? 0.99 : (wantPh === 2 ? 0.6 : 0.3))); run.hp = Math.max(run.hp, 1); if (!P.alive) { P.alive = true; } if (Math.floor(dtst.t) !== Math.floor(dtst.t - dt) && Math.floor(dtst.t) % 5 === 0) console.log('#dodge t=' + Math.floor(dtst.t) + ' phase=' + G.boss.phase + ' dmgTaken=' + run.stats.dmgTaken); }
    W.audio.setHeat(P.heat, P.redline); W.audio.update(dt);
    I.endFrame();
  };
  function keepInput() { var I = W.input; if (I.mpressed[0] && G.player) G.player.buffer = 0.28; I.endFrame(); }

  // ---------------- draw ----------------
  var _lights = [];
  G.draw = function (dtMs) {
    var P = G.player, room = G.room, dt = Math.min(0.05, dtMs / 1000);
    if (P && room) {
      var ZOOM = 1.2, tx = P.x, tz = P.z - 1.2, D0 = 38 * ZOOM; if (G.state === 'end') { tz -= 3.5; D0 = 42 * ZOOM; }
      if (G.cinematic > 0) { tx = G.cineX; tz = G.cineZ; }
      else if (W.input.everMoved && !U.modal && !G.frozen) { var gp = Gf.groundPoint(W.input.mouseX, W.input.mouseY); tx += W.clamp((gp.x - P.x) * 0.12, -2, 2); tz += W.clamp((gp.z - P.z) * 0.12, -1.5, 1.5); }
      if (G.cleared && G.state === 'run' && !G.boss) tz -= 2.6;
      if (G.boss && !G.boss.dead && G.boss.type === 'dredge') { tx = W.lerp(tx, G.boss.x, 0.35); tz = W.lerp(tz, G.boss.z, 0.35); D0 = 40 * ZOOM; }
      var v = P_.view;
      if (v === 'wide') { D0 = 46 * ZOOM; tx = W.lerp(tx, 0, 0.7); tz = W.lerp(tz, -1, 0.7); } else if (v === 'kestrel') { D0 = 13; tx = P.x; tz = P.z; } else if (v === 'boss1' || v === 'boss2') { if (G.boss) { tx = W.lerp(P.x, G.boss.x, 0.5); tz = W.lerp(P.z, G.boss.z, 0.5) - 1; D0 = (v === 'boss1' ? 44 : 30) * ZOOM; } }
      var hw = Math.max(0, room.halfW - 12), hh = Math.max(0, room.halfH - 8);
      if (v !== 'kestrel') { tx = W.clamp(tx, -hw, hw); tz = W.clamp(tz, -hh - 3, hh - 1); }
      var k = G.frozen || G.camSnap ? 1 : 1 - Math.exp(-5 * dt);
      G.camX += (tx - G.camX) * k; G.camZ += (tz - G.camZ) * k; G.camD += (D0 - G.camD) * k;
      var cam = Gf.camera, pitch = v === 'kestrel' ? 38 * Math.PI / 180 : PITCH;
      cam.position.set(G.camX + F.shakeX, Math.sin(pitch) * G.camD + F.shakeY, G.camZ + Math.cos(pitch) * G.camD);
      var nr = Math.max(2, G.camD - 22); if (Math.abs(cam.near - nr) > 0.5) { cam.near = nr; cam.updateProjectionMatrix(); }
      cam.lookAt(G.camX + F.shakeX, 0.9, G.camZ); cam.updateMatrixWorld();
      // lights: lamps with a slow flicker, effect flashes, the weapon glow
      _lights.length = 0;
      for (var i = 0; i < room.lights.length; i++) { var L = room.lights[i]; if (L.base !== undefined) L.k = L.base * (0.93 + 0.07 * Math.sin(G.time * 7 + L.flick * 40) * (L.flick > 0.7 ? 3 : 1)); if (L.k > 0.01) _lights.push(L); }
      for (i = 0; i < F.lights.length; i++) _lights.push(F.lights[i]);
      Gf.setLights(_lights, G.camX, G.camZ);
      F.setRain(G.camX, G.camZ, room.A.rainK, room.def.roof);
      var fm = Gf.finalMat.uniforms; fm.uPulse.value = Math.max(P.redline ? 0.22 + 0.1 * Math.sin(G.time * 12) : 0, fm.uPulse.value - dt * 1.6); if (P.redline) fm.uPulseCol.value.set(1.0, 0.3, 0.08);
      fm.uDesat.value = W.damp(fm.uDesat.value, G.slowmo > 0 && G.B.stillframe ? 0.7 : (P.alive ? 0 : 0.8), 8, dt);
    }
    Gf.render(dtMs);
    if (G.run) { U.hud(dt); U.doorLabels(); U.bars(); }
  };

  window.addEventListener('load', function () { try { G.init(); } catch (e) { console.error(e && e.stack || e); } });
})();
