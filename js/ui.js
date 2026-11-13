// Wetware — ui: quiet HUD, caption-box cards, the body grid overlay
'use strict';
(function () {
  var U = W.ui = {};
  var D = W.data, Pt = W.paint;
  var G; U.bind = function (g) { G = g; };
  var $ = function (id) { return document.getElementById(id); };
  var el = {}, INK = '#0c0e14';
  U.modal = null; // {type:'menu'|'grid', ...}

  U.init = function () {
    ['hint', 'where', 'hpnum', 'heatnum', 'hpbar', 'heatbar', 'pips', 'slotTag', 'slotAct', 'scrip', 'memory', 'cores', 'bossbar', 'bossheat', 'doorlabs', 'prompt', 'say', 'banner', 'overlay', 'panel', 'gridwrap', 'gridcv', 'veil', 'attract', 'sound', 'fps', 'bars', 'bl', 'br'].forEach(function (k) { el[k] = $(k); });
    function put(cv, kind, col) { var x = cv.getContext('2d'); x.clearRect(0, 0, 64, 64); x.drawImage(Pt.icon(kind, col), 0, 0); }
    put($('icScrip'), 'scrip', '#ffd070'); put($('icMem'), 'memory', '#9fe8e0'); put($('icCore'), 'core', '#ff7a4a');
    var tc = el.slotTag.querySelector('canvas').getContext('2d');
    tc.fillStyle = '#c8963c'; tc.strokeStyle = INK; tc.lineWidth = 4; tc.beginPath(); tc.ellipse(32, 36, 15, 10, 0, 0, 7); tc.fill(); tc.stroke(); tc.fillStyle = '#ffb347'; tc.beginPath(); tc.arc(32, 40, 5, 0, 7); tc.fill(); tc.stroke(); tc.strokeStyle = '#e8e8e0'; tc.lineWidth = 4; tc.beginPath(); tc.moveTo(10, 22); tc.lineTo(54, 22); tc.stroke(); tc.strokeStyle = INK; tc.lineWidth = 3; tc.beginPath(); tc.moveTo(32, 22); tc.lineTo(32, 28); tc.stroke();
    el.sound.addEventListener('click', function () { W.audio.enable(); el.sound.textContent = W.audio.on ? 'Sound on' : 'Enable sound'; el.sound.classList.toggle('on', W.audio.on); });
    if (W.params.fps) el.fps.style.display = 'block';
    U.defaultHint = '<b>WASD</b> move · <b>Mouse</b> aim · <b>Left</b> attack · <b>Right</b> special · <b>Space</b> dash · <b>Q</b> tag · <b>E</b> vent heat · <b>F</b> implant · <b>Tab</b> grid';
    el.hint.innerHTML = U.defaultHint;
    U.grid.init();
    window.addEventListener('resize', sizeBars); sizeBars();
  };
  function sizeBars() { el.bars.width = window.innerWidth; el.bars.height = window.innerHeight; }

  // ---------- hint / toast / say / banner ----------
  var toastT = 0, sayT = 0, bannerT = 0, sayQueue = [];
  U.toast = function (text, dur) { el.hint.textContent = text; el.hint.classList.add('alert'); toastT = dur || 5; };
  U.say = function (key, text, dur, more) {
    var d = Pt.portraitDefs[key] || {}, cv = el.say.querySelector('canvas'), x = cv.getContext('2d');
    x.drawImage(Pt.portrait(key), 0, 0);
    el.say.querySelector('.who').textContent = d.name || key; el.say.querySelector('.txt').textContent = text; el.say.querySelector('.more').textContent = more || '';
    el.say.style.display = 'block'; sayT = dur || 4; W.audio.sfx('comm');
  };
  U.hideSay = function () { el.say.style.display = 'none'; sayT = 0; };
  U.banner = function (title, sub, dur) { el.banner.querySelector('h2').textContent = title; el.banner.querySelector('p').textContent = sub || ''; el.banner.style.display = 'block'; bannerT = dur || 2.6; };
  U.veil = function (small, text) { el.veil.style.display = 'flex'; el.veil.firstElementChild.innerHTML = (small ? '<small>' + small + '</small>' : '') + text; };
  U.hideVeil = function () { el.veil.style.display = 'none'; };
  U.attract = function (on) { el.attract.style.display = on ? 'block' : 'none'; };
  U.prompt = function (x, y, z, html) { var p = W.gfx.project(x, y, z); el.prompt.innerHTML = html; el.prompt.style.display = 'block'; el.prompt.style.transform = 'translate(' + (p.x | 0) + 'px,' + (p.y | 0) + 'px) translate(-50%,-100%)'; };
  U.hidePrompt = function () { el.prompt.style.display = 'none'; };

  // ---------- HUD ----------
  var last = {}, hpLag = 1;
  function set(k, v, fn) { if (last[k] !== v) { last[k] = v; fn(v); } }
  U.hud = function (dt) {
    var run = G.run, P = G.player;
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) { el.hint.innerHTML = U.defaultHint; el.hint.classList.remove('alert'); } }
    if (sayT > 0) { sayT -= dt; if (sayT <= 0) el.say.style.display = 'none'; }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) el.banner.style.display = 'none'; }
    var show = !!(run && P) && G.state !== 'end';
    set('show', show, function (v) { el.bl.style.display = v ? 'flex' : 'none'; el.br.style.display = v ? 'block' : 'none'; });
    set('where', G.whereText || '', function (v) { el.where.textContent = v; });
    if (!show) { set('mem2', W.save.memory, function (v) { el.memory.textContent = v; }); return; }
    var hpf = W.sat(run.hp / run.maxHp); hpLag = hpLag < hpf ? hpf : Math.max(hpf, hpLag - dt * 0.35);
    set('hp', Math.round(hpf * 300), function (v) { el.hpbar.querySelector('i').style.width = (v / 3) + '%'; });
    set('hpl', Math.round(hpLag * 300), function (v) { el.hpbar.querySelector('em').style.width = (v / 3) + '%'; });
    set('hpn', Math.ceil(run.hp) + ' / ' + run.maxHp, function (v) { el.hpnum.textContent = v; });
    set('heat', Math.round(P.heat * 3), function (v) { el.heatbar.querySelector('i').style.width = (v / 3) + '%'; });
    set('heatn', P.redline ? 'Redline' : (P.inWater && P.heat > 1 ? 'Cooling' : Math.round(P.heat) + ''), function (v) { el.heatnum.textContent = v; });
    set('red', P.redline, function (v) { el.heatbar.classList.toggle('red', v); });
    set('pips', P.maxDashes + ':' + P.dashes, function () { var h = ''; for (var i = 0; i < P.maxDashes; i++) h += '<span class="' + (i < P.dashes ? 'on' : '') + '"></span>'; el.pips.innerHTML = h; });
    set('qname', G.run.char, function () { var c = W.combat.char(); U.defaultHint = U.defaultHint.replace(/<b>Q<\/b> [^·]*·/, '<b>Q</b> ' + c.qShort + ' ·'); if (!el.hint.classList.contains('alert')) el.hint.innerHTML = U.defaultHint; });
    set('tagcd', Math.round(P.tagCd / (P.tagMax || 7) * 20), function (v) { el.slotTag.querySelector('u').style.height = (v * 5) + '%'; });
    var act = G.B.active;
    set('act', act, function (v) { el.slotAct.classList.toggle('off', !v); var x = el.slotAct.querySelector('canvas').getContext('2d'); x.clearRect(0, 0, 64, 64); if (v) { x.drawImage(Pt.icon('implant', v === 'emp' ? '#49d3ff' : '#ff4058'), 0, 0); } });
    set('actcd', act ? Math.round(P.activeCd / (act === 'emp' ? 12 : 8) * 20) : 0, function (v) { el.slotAct.querySelector('u').style.height = (v * 5) + '%'; });
    set('scrip', run.scrip, function (v) { el.scrip.textContent = v; });
    set('mem', W.save.memory, function (v) { el.memory.textContent = v; });
    set('cores', W.save.cores, function (v) { el.cores.textContent = v; });
    // boss bar
    var b = G.boss && !G.boss.dead ? G.boss : null;
    set('boss', !!b, function (v) { el.bossbar.style.display = v ? 'block' : 'none'; });
    if (b) {
      set('bname', b.name, function (v) { el.bossbar.querySelector('.nm').textContent = v; el.bossheat.style.display = b.type === 'marrow' ? 'block' : 'none'; });
      set('bhp', Math.round(b.hp / b.maxHp * 400), function (v) { el.bossbar.querySelector('.bar i').style.width = (v / 4) + '%'; });
      if (b.type === 'marrow') set('bheat', Math.round(b.heat), function (v) { el.bossheat.querySelector('i').style.width = v + '%'; });
    }
  };
  U.fps = function (t) { el.fps.textContent = t; };

  // ---------- enemy bars ----------
  U.bars = function () {
    var cv = el.bars, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    if (!G.enemies || U.modal) return;
    for (var i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i]; if (e.dead || e.spawnT > 0 || e.boss) continue;
      var dmg = e.hp < e.maxHp || e.armor > 0 || e.elite || e.tox > 0 || e.team === 2; if (!dmg) continue;
      var p = W.gfx.project(e.x, (e.fly ? e.y + 0.9 : (e.type === 'bruiser' ? 3.6 : 2.6)), e.z), w = e.elite || e.type === 'bruiser' ? 62 : 44, px = Math.round(p.x - w / 2), py = Math.round(p.y);
      x.fillStyle = INK; x.fillRect(px - 2, py - 2, w + 4, 9);
      x.fillStyle = e.team === 2 ? '#49d3ff' : '#ff4a26'; x.fillRect(px, py, w * W.sat(e.hp / e.maxHp), 5);
      if (e.maxArmor && e.armor > 0) { x.fillStyle = INK; x.fillRect(px - 2, py - 9, w + 4, 8); x.fillStyle = '#ffd070'; x.fillRect(px, py - 7, w * e.armor / e.maxArmor, 4); }
      if (e.tox > 0) { for (var t = 0; t < e.tox; t++) { x.fillStyle = INK; x.fillRect(px + t * 6 - 1, py + 8, 6, 6); x.fillStyle = '#8fe04a'; x.fillRect(px + t * 6, py + 9, 4, 4); } }
    }
  };

  // ---------- door labels ----------
  var labs = [];
  U.doorLabels = function () {
    var room = G.room, n = room ? room.doors.length : 0;
    while (labs.length < n) { var d = document.createElement('div'); d.className = 'doorlab'; d.innerHTML = '<canvas width="64" height="64"></canvas><span></span>'; el.doorlabs.appendChild(d); labs.push({ el: d, key: '' }); }
    for (var i = 0; i < labs.length; i++) {
      var L = labs[i], dr = i < n ? room.doors[i] : null;
      if (!dr || !dr.active || !dr.reward || U.modal) { if (L.on) { L.el.style.display = 'none'; L.on = false; } continue; }
      var rw = dr.reward, key = rw.kind + rw.label + (rw.sub || '');
      if (L.key !== key) { L.key = key; var x = L.el.querySelector('canvas').getContext('2d'); x.clearRect(0, 0, 64, 64); x.drawImage(Pt.icon(rw.icon || rw.kind, rw.col), 0, 0); L.el.querySelector('span').innerHTML = rw.label + (rw.sub ? '<small>' + rw.sub + '</small>' : ''); L.el.style.borderColor = INK; L.el.style.background = rw.bg || ''; }
      if (!L.on) { L.el.style.display = 'flex'; L.on = true; }
      var p = W.gfx.project(dr.x, 5.9, dr.z - 1);
      L.el.style.transform = 'translate(' + (p.x | 0) + 'px,' + (p.y | 0) + 'px) translate(-50%,-50%)';
    }
  };

  // ---------- menus (caption-box cards) ----------
  function shapeCanvas(imp) {
    var sh = D.SHAPES[imp.shape], c = Pt.canvas(74, 52), x = c.getContext('2d'), s = 22, f = Pt.FACTION[imp.f];
    var mw = 0, mh = 0; sh.forEach(function (p) { mw = Math.max(mw, p[0] + 1); mh = Math.max(mh, p[1] + 1); });
    var ox = (74 - mw * s) / 2, oy = (52 - mh * s) / 2;
    sh.forEach(function (p) { x.fillStyle = f.col; x.fillRect(ox + p[0] * s, oy + p[1] * s, s, s); x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(ox + p[0] * s + 1.5, oy + p[1] * s + 1.5, s - 3, s - 3); });
    c.className = 'shape'; return c;
  }
  // o: kicker, title, portrait, who, line, items[{tag, tagCol, title, text, heat, cost, dis, imp}], onPick(i), close (label), onClose, foot, extra [{label, fn}]
  U.menu = function (o) {
    var p = el.panel; p.innerHTML = ''; el.gridwrap.style.display = 'none'; p.style.display = 'block';
    var h = '';
    if (o.kicker) h += '<div class="kicker">' + o.kicker + '</div>';
    h += '<h1>' + o.title + '</h1>';
    p.innerHTML = h;
    if (o.line) {
      var lead = document.createElement('div'); lead.className = 'lead';
      if (o.portrait) { var pc = Pt.canvas(220, 220); pc.getContext('2d').drawImage(Pt.portrait(o.portrait), 0, 0); lead.appendChild(pc); }
      var ld = document.createElement('div'); ld.innerHTML = (o.who ? '<b>' + o.who + '</b>' : '') + o.line; lead.appendChild(ld); p.appendChild(lead);
    }
    if (o.html) { var hd = document.createElement('div'); hd.innerHTML = o.html; p.appendChild(hd); }
    var cards = document.createElement('div'); cards.className = 'cards'; p.appendChild(cards);
    var nodes = [];
    (o.items || []).forEach(function (it, i) {
      var c = document.createElement('div'); c.className = 'card ui-click' + (it.dis ? ' dis' : '');
      var inner = '<div class="num">' + (i + 1) + '</div>';
      if (it.cost !== undefined) inner += '<div class="cost">' + it.cost + '</div>';
      if (it.tag) inner += '<div class="tag" style="' + (it.tagCol ? 'background:' + it.tagCol + ';color:#0c0e14' : '') + '">' + it.tag + '</div>';
      inner += '<h3>' + it.title + '</h3><p>' + it.text + '</p>';
      if (it.heat) inner += '<div class="heat">' + it.heat + '</div>';
      c.innerHTML = inner;
      if (it.imp) c.insertBefore(shapeCanvas(it.imp), c.querySelector('h3'));
      c.addEventListener('click', function () { if (!it.dis) pick(i); });
      c.addEventListener('mouseenter', function () { sel(i); });
      cards.appendChild(c); nodes.push(c);
    });
    var foot = document.createElement('div'); foot.className = 'foot';
    (o.extra || []).forEach(function (ex) { var b = document.createElement('div'); b.className = 'btn ui-click'; b.textContent = ex.label; b.addEventListener('click', function () { ex.fn(); }); foot.appendChild(b); });
    if (o.close) { var b2 = document.createElement('div'); b2.className = 'btn ui-click'; b2.textContent = o.close; b2.addEventListener('click', function () { close(); }); foot.appendChild(b2); }
    if (o.foot) { var s = document.createElement('span'); s.innerHTML = o.foot; foot.appendChild(s); }
    p.appendChild(foot);
    el.overlay.classList.add('show');
    var m = { type: 'menu', o: o, nodes: nodes, sel: -1, t: 0 };
    function sel(i) { m.sel = i; nodes.forEach(function (n, j) { n.classList.toggle('sel', j === i); }); }
    function pick(i) { W.audio.sfx('pick'); var keep = o.onPick(i, m); if (keep !== true && U.modal === m) U.closeMenu(); }
    function close() { if (U.modal === m) U.closeMenu(); if (o.onClose) o.onClose(); }
    m.pick = pick; m.close = close; m.select = sel;
    U.modal = m; W.audio.sfx('open');
    return m;
  };
  U.closeMenu = function () { el.overlay.classList.remove('show'); U.modal = null; };
  U.updateModal = function (dt) {
    var m = U.modal, I = W.input; if (!m) return;
    m.t += dt;
    if (m.type === 'menu') {
      var n = m.nodes.length;
      for (var i = 0; i < n && i < 9; i++) if (I.hit('Digit' + (i + 1)) && !m.o.items[i].dis) { m.pick(i); return; }
      if (I.hit('ArrowRight') || I.hit('KeyD') || I.padHit('right')) m.select((m.sel + 1) % Math.max(n, 1));
      if (I.hit('ArrowLeft') || I.hit('KeyA') || I.padHit('left')) m.select((m.sel + n - 1) % Math.max(n, 1));
      if ((I.hit('Enter') || I.hit('Space') || I.padHit('a')) && m.sel >= 0 && n && !m.o.items[m.sel].dis && m.t > 0.25) { m.pick(m.sel); return; }
      if ((I.hit('Escape') || I.hit('Tab') || I.padHit('b')) && m.o.close && m.t > 0.2) m.close();
    } else if (m.type === 'grid') U.grid.update(dt);
  };

  // ---------- the body grid ----------
  var GR = U.grid = { hold: null, tray: [], hover: null, cs: 58, gx: 96, gy: 100 };
  GR.init = function () {
    var cv = el.gridcv; cv.classList.add('ui-click');
    function pos(ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * cv.width / r.width, y: (ev.clientY - r.top) * cv.height / r.height }; }
    cv.addEventListener('mousemove', function (ev) { var p = pos(ev); GR.mx = p.x; GR.my = p.y; GR.hover = GR.cellAt(p.x, p.y); });
    cv.addEventListener('mousedown', function (ev) { var p = pos(ev); GR.mx = p.x; GR.my = p.y; GR.hover = GR.cellAt(p.x, p.y); if (ev.button === 2) GR.rotate(); else GR.click(p.x, p.y); ev.preventDefault(); });
    cv.addEventListener('wheel', function () { GR.rotate(); }, { passive: true });
  };
  GR.cellAt = function (x, y) { var c = Math.floor((x - GR.gx) / GR.cs), r = Math.floor((y - GR.gy) / GR.cs); return (c >= 0 && c < 7 && r >= 0 && r < 8) ? { c: c, r: r } : null; };
  GR.open = function (o) {
    o = o || {}; el.panel.style.display = 'none'; el.gridwrap.style.display = 'block'; el.overlay.classList.add('show');
    GR.hold = o.newId ? { id: o.newId, rot: 0 } : null; GR.tray = []; GR.onDone = o.onDone || null; GR.newId = o.newId || null; GR.t = 0; GR.note = o.note || '';
    GR.hover = GR.hover || { c: 3, r: 2 };
    U.modal = { type: 'grid', t: 0, close: GR.close }; W.audio.sfx('open'); GR.draw();
  };
  GR.close = function () {
    var run = G.run, sold = 0;
    if (GR.hold) { var ap = D.autoPlace(run, GR.hold.id); if (ap) { run.implants.push({ id: GR.hold.id, cells: ap.cells, rot: ap.rot }); W.audio.sfx('install'); U.toast(D.IMPLANTS[GR.hold.id].name + ' installed where it fits best.'); } else GR.tray.push(GR.hold.id); GR.hold = null; }
    GR.tray.forEach(function () { sold++; run.scrip += 5; });
    el.overlay.classList.remove('show'); el.gridwrap.style.display = 'none'; U.modal = null;
    G.rebuild();
    if (sold) U.toast(sold + ' unplaced implant' + (sold > 1 ? 's' : '') + ' sold for ' + sold * 5 + ' scrip.');
    var f = GR.onDone; GR.onDone = null; if (f) f();
  };
  GR.cellsFor = function (hold, at) { var sh = D.rotate(D.SHAPES[D.IMPLANTS[hold.id].shape], hold.rot); return sh.map(function (p) { return [p[0] + at.c, p[1] + at.r]; }); };
  // forgiving fit: the hovered cell may be any cell of the piece, and the piece turns itself if only another turn fits
  GR.fit = function (hold, at) {
    var imp = D.IMPLANTS[hold.id], run = G.run;
    for (var q = 0; q < 4; q++) {
      var rot = (hold.rot + q) % 4, sh = D.rotate(D.SHAPES[imp.shape], rot);
      for (var k = 0; k < sh.length; k++) { var cells = sh.map(function (p) { return [p[0] - sh[k][0] + at.c, p[1] - sh[k][1] + at.r]; }); if (D.canPlace(run, imp, cells, -1)) return { cells: cells, rot: rot }; }
    }
    return null;
  };
  GR.rotate = function () { if (GR.hold) { GR.hold.rot = (GR.hold.rot + 1) % 4; W.audio.sfx('click'); } };
  GR.implantAt = function (c, r) { var im = G.run.implants; for (var i = 0; i < im.length; i++) for (var k = 0; k < im[i].cells.length; k++) if (im[i].cells[k][0] === c && im[i].cells[k][1] === r) return i; return -1; };
  GR.click = function (x, y) {
    var run = G.run, h = GR.cellAt(x, y);
    // tray tiles
    for (var i = 0; i < GR.tray.length; i++) { var tx = 610 + i * 84, ty = 560; if (x > tx && x < tx + 76 && y > ty && y < ty + 56) { if (GR.hold) GR.tray.push(GR.hold.id); GR.hold = { id: GR.tray.splice(i, 1)[0], rot: 0 }; W.audio.sfx('click'); return; } }
    if (x > 960 && x < 1090 && y > 606 && y < 644) { GR.close(); return; }
    if (!h) { if (GR.hold) { GR.tray.push(GR.hold.id); GR.hold = null; } return; }
    var idx = GR.implantAt(h.c, h.r);
    if (GR.hold) {
      var fit = GR.fit(GR.hold, h);
      if (fit) { run.implants.push({ id: GR.hold.id, cells: fit.cells, rot: fit.rot }); GR.hold = null; W.audio.sfx('install'); G.rebuild(); GR.flash = 0.4; }
      else if (idx >= 0) { var out = run.implants.splice(idx, 1)[0]; GR.tray.push(out.id); W.audio.sfx('lift'); G.rebuild(); }
      else W.audio.sfx('deny');
    } else if (idx >= 0) { var o2 = run.implants.splice(idx, 1)[0]; if (o2.torn) { run.implants.splice(idx, 0, o2); return; } GR.hold = { id: o2.id, rot: o2.rot }; W.audio.sfx('lift'); G.rebuild(); }
  };
  // bot / auto placement: returns true when the held implant is placed or given up
  GR.auto = function () {
    var run = G.run; if (!GR.hold) return true;
    var id = GR.hold.id, best = D.autoPlace(run, id);
    if (!best) {
      var order = run.implants.map(function (it, i) { return { i: i, n: it.cells.length }; }).sort(function (a, b) { return a.n - b.n; });
      for (var k = 0; k < order.length && !best; k++) {
        var it = run.implants[order[k].i]; if (it.torn || it.cells.length > D.SHAPES[D.IMPLANTS[id].shape].length) continue;
        var saved = run.implants.splice(order[k].i, 1)[0]; best = D.autoPlace(run, id);
        if (best) GR.tray.push(saved.id); else run.implants.splice(order[k].i, 0, saved);
      }
    }
    if (best) { run.implants.push({ id: id, cells: best.cells, rot: best.rot }); GR.hold = null; W.audio.sfx('install'); G.rebuild(); GR.flash = 0.4; }
    else { GR.tray.push(id); GR.hold = null; }
    return true;
  };
  GR.update = function (dt) {
    var I = W.input; GR.t += dt; GR.flash = Math.max(0, (GR.flash || 0) - dt);
    if (I.hit('KeyR')) GR.rotate();
    if (I.pad) {
      var h = GR.hover || { c: 3, r: 2 };
      if (I.padHit('left')) h.c = Math.max(0, h.c - 1); if (I.padHit('right')) h.c = Math.min(6, h.c + 1); if (I.padHit('up')) h.r = Math.max(0, h.r - 1); if (I.padHit('down')) h.r = Math.min(7, h.r + 1);
      GR.hover = h;
      if (I.padHit('x')) GR.rotate(); if (I.padHit('a')) GR.click(GR.gx + h.c * GR.cs + 10, GR.gy + h.r * GR.cs + 10);
    }
    if ((I.hit('Tab') || I.hit('Escape') || I.hit('Enter') || I.padHit('b') || I.padHit('back')) && GR.t > 0.25) { GR.close(); return; }
    GR.draw();
  };
  function rr(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.lineTo(px + w - r, py); x.quadraticCurveTo(px + w, py, px + w, py + r); x.lineTo(px + w, py + h - r); x.quadraticCurveTo(px + w, py + h, px + w - r, py + h); x.lineTo(px + r, py + h); x.quadraticCurveTo(px, py + h, px, py + h - r); x.lineTo(px, py + r); x.quadraticCurveTo(px, py, px + r, py); x.closePath(); }
  var bodyCache = null;
  function bodyLayer(cs, gx, gy) {
    if (bodyCache) return bodyCache;
    var c = Pt.canvas(1120, 660), x = c.getContext('2d'), rng = W.makeRng(77);
    x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 1120, 660);
    for (var i = 0; i < 160; i++) { x.globalAlpha = 0.04 + rng() * 0.05; x.fillStyle = rng() < 0.5 ? '#8a7a5a' : '#fff'; x.save(); x.translate(rng() * 1120, rng() * 660); x.rotate(-0.5); x.fillRect(0, 0, 40 + rng() * 120, 3 + rng() * 9); x.restore(); }
    x.globalAlpha = 1;
    function C(c0, r0) { return [gx + c0 * cs, gy + r0 * cs]; }
    // anatomical wash behind the cells
    x.fillStyle = '#b9cfc8'; x.strokeStyle = INK; x.lineWidth = 5; x.lineJoin = 'round';
    var p;
    p = C(3.5, 0.95); x.beginPath(); x.ellipse(p[0], p[1], cs * 1.75, cs * 1.25, 0, 0, 7); x.fill(); x.stroke();          // head
    p = C(1.8, 1.85); rr(x, p[0], p[1], cs * 3.4, cs * 3.4, 46); x.fill(); x.stroke();                                    // torso
    p = C(-0.15, 1.9); rr(x, p[0], p[1], cs * 2.2, cs * 3.3, 40); x.fill(); x.stroke();                                   // left arm
    p = C(4.95, 1.9); rr(x, p[0], p[1], cs * 2.2, cs * 3.3, 40); x.fill(); x.stroke();                                    // right arm
    p = C(1.85, 4.9); rr(x, p[0], p[1], cs * 3.3, cs * 1.2, 30); x.fill(); x.stroke();                                    // pelvis
    p = C(1.85, 5.8); rr(x, p[0], p[1], cs * 1.25, cs * 2.35, 30); x.fill(); x.stroke();
    p = C(3.9, 5.8); rr(x, p[0], p[1], cs * 1.25, cs * 2.35, 30); x.fill(); x.stroke();
    // dry-brush shade on the left of each mass
    x.globalAlpha = 0.25; x.fillStyle = '#3a5a5a';
    for (i = 0; i < 70; i++) { x.save(); x.translate(gx + rng() * cs * 7, gy + rng() * cs * 8); x.rotate(-0.6); x.fillRect(0, 0, 30 + rng() * 50, 2 + rng() * 4); x.restore(); }
    x.globalAlpha = 1;
    // labels with leader lines
    x.font = '700 15px "Barlow Condensed", sans-serif'; x.fillStyle = INK; x.textBaseline = 'middle'; x.lineWidth = 2;
    [['Head and eyes', 5.2, 0.3, 5.6, 0.05], ['Left arm', 0.5, 5.25, 0.3, 5.9], ['Right arm', 6.5, 5.25, 6.7, 5.9], ['Heart', 2.2, 1.85, 0.4, 1.4], ['Spine', 4.8, 1.85, 5.6, 1.4], ['Legs', 5.3, 7.2, 5.6, 7.6]].forEach(function (L) {
      var a = C(L[1], L[2]), b = C(L[3], L[4]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); var lf = L[3] < L[1] && L[0] !== 'Left arm'; x.textAlign = L[0].indexOf('arm') > 0 ? 'center' : (lf ? 'right' : 'left'); x.fillText(L[0].toUpperCase(), b[0] + (L[0].indexOf('arm') > 0 ? 0 : (lf ? -5 : 5)), b[1] + (L[0].indexOf('arm') > 0 ? 10 : 0));
    });
    bodyCache = c; return c;
  }
  GR.draw = function () {
    var cv = el.gridcv, x = cv.getContext('2d'), run = G.run, cs = GR.cs, gx = GR.gx, gy = GR.gy, map = D.cellMap(run.cellTier), t = performance.now() / 1000;
    x.drawImage(bodyLayer(cs, gx, gy), 0, 0);
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.fillStyle = INK; x.font = '900 34px "Big Shoulders Display", Impact, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('BODY GRID', 30, 52);
    x.font = '500 16px "Barlow Condensed", sans-serif'; x.fillText(W.combat.char().blurb + ' ' + D.CELLS.filter(function (c) { return c[3] <= run.cellTier; }).length + ' graft sites open.', 32, 76);
    // cells
    D.CELLS.forEach(function (c) {
      var px = gx + c[0] * cs + 3, py = gy + c[1] * cs + 3, w = cs - 6, open = c[3] <= run.cellTier;
      if (open) { x.fillStyle = '#fbf6e6'; x.fillRect(px, py, w, w); x.strokeStyle = INK; x.lineWidth = 2.5; x.strokeRect(px, py, w, w); }
      else { x.fillStyle = 'rgba(12,14,20,0.16)'; x.fillRect(px, py, w, w); x.strokeStyle = 'rgba(12,14,20,0.45)'; x.lineWidth = 1.5; x.setLineDash([5, 5]); x.strokeRect(px, py, w, w); x.setLineDash([]); x.beginPath(); x.moveTo(px + 6, py + w - 6); x.lineTo(px + w - 6, py + 6); x.stroke(); }
    });
    // installed implants
    var links = D.links(run);
    run.implants.forEach(function (it, n) {
      var imp = D.IMPLANTS[it.id], f = Pt.FACTION[imp.f], inSet = {};
      it.cells.forEach(function (p) { inSet[p[0] + ',' + p[1]] = 1; });
      it.cells.forEach(function (p) { x.fillStyle = it.torn ? '#7a7468' : f.col; x.fillRect(gx + p[0] * cs + 3, gy + p[1] * cs + 3, cs - 6 + (inSet[(p[0] + 1) + ',' + p[1]] ? 6 : 0), cs - 6 + (inSet[p[0] + ',' + (p[1] + 1)] ? 6 : 0)); });
      // brush shade + union outline
      x.strokeStyle = INK; x.lineWidth = 5;
      it.cells.forEach(function (p) {
        var px = gx + p[0] * cs + 3, py = gy + p[1] * cs + 3, w = cs - 6;
        x.fillStyle = 'rgba(12,14,20,0.2)'; x.fillRect(px, py + w * 0.62, w, w * 0.38);
        x.beginPath();
        if (!inSet[p[0] + ',' + (p[1] - 1)]) { x.moveTo(px, py); x.lineTo(px + w, py); }
        if (!inSet[p[0] + ',' + (p[1] + 1)]) { x.moveTo(px, py + w); x.lineTo(px + w, py + w); }
        if (!inSet[(p[0] - 1) + ',' + p[1]]) { x.moveTo(px, py); x.lineTo(px, py + w); }
        if (!inSet[(p[0] + 1) + ',' + p[1]]) { x.moveTo(px + w, py); x.lineTo(px + w, py + w); }
        x.stroke();
      });
      var p0 = it.cells[0]; Pt.emblem(x, imp.f, gx + p0[0] * cs + cs / 2, gy + p0[1] * cs + cs / 2, 15, it.torn ? '#3a362e' : f.dark);
      if (it.cells.length > 1) { var p1 = it.cells[it.cells.length - 1]; x.fillStyle = INK; x.font = '900 22px "Big Shoulders Display", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n + 1), gx + p1[0] * cs + cs / 2, gy + p1[1] * cs + cs / 2 + 1); }
      if (it.torn) { x.strokeStyle = '#b8200e'; x.lineWidth = 6; it.cells.forEach(function (p) { var px = gx + p[0] * cs, py = gy + p[1] * cs; x.beginPath(); x.moveTo(px + 10, py + 10); x.lineTo(px + cs - 10, py + cs - 10); x.moveTo(px + cs - 10, py + 10); x.lineTo(px + 10, py + cs - 10); x.stroke(); }); }
    });
    // links: glowing lines between touching implants
    links.forEach(function (l) {
      var ax = gx + l.ca[0] * cs + cs / 2, ay = gy + l.ca[1] * cs + cs / 2, bx = gx + l.cb[0] * cs + cs / 2, by = gy + l.cb[1] * cs + cs / 2;
      var ca = Pt.FACTION[l.fa].col, cb = Pt.FACTION[l.fb].col, pulse = 0.6 + 0.4 * Math.sin(t * 6);
      var g = x.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, ca); g.addColorStop(1, cb);
      x.strokeStyle = INK; x.lineWidth = 15; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      x.strokeStyle = g; x.lineWidth = 9; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * pulse).toFixed(2) + ')'; x.lineWidth = 3; x.stroke();
      var mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (l.fusion) { x.fillStyle = INK; x.beginPath(); x.moveTo(mx, my - 13); x.lineTo(mx + 13, my); x.lineTo(mx, my + 13); x.lineTo(mx - 13, my); x.closePath(); x.fill(); x.fillStyle = '#fff2c8'; x.beginPath(); x.moveTo(mx, my - 7); x.lineTo(mx + 7, my); x.lineTo(mx, my + 7); x.lineTo(mx - 7, my); x.closePath(); x.fill(); }
      else if (l.same) { x.fillStyle = INK; x.beginPath(); x.arc(mx, my, 9, 0, 7); x.fill(); x.fillStyle = ca; x.beginPath(); x.arc(mx, my, 5, 0, 7); x.fill(); }
    });
    // held implant preview
    var info = null;
    if (GR.hold && GR.hover) {
      var imp = D.IMPLANTS[GR.hold.id], fit0 = GR.fit(GR.hold, GR.hover), cells = fit0 ? fit0.cells : GR.cellsFor(GR.hold, GR.hover), ok = !!fit0, f = Pt.FACTION[imp.f];
      cells.forEach(function (p) { var px = gx + p[0] * cs + 3, py = gy + p[1] * cs + 3, w = cs - 6; x.globalAlpha = ok ? 0.85 : 0.5; x.fillStyle = ok ? f.col : '#c84a3a'; x.fillRect(px, py, w, w); x.globalAlpha = 1; x.strokeStyle = ok ? INK : '#8a1a0e'; x.lineWidth = 4; x.setLineDash(ok ? [] : [8, 6]); x.strokeRect(px, py, w, w); x.setLineDash([]); });
      info = imp;
    } else if (GR.hold) info = D.IMPLANTS[GR.hold.id];
    else if (GR.hover) { var idx = GR.implantAt(GR.hover.c, GR.hover.r); if (idx >= 0) info = D.IMPLANTS[run.implants[idx].id]; }
    // highlight zones the held implant accepts
    if (GR.hold) { var hi = D.IMPLANTS[GR.hold.id]; D.CELLS.forEach(function (c) { if (c[3] <= run.cellTier && D.zoneOk(hi, c[2]) && GR.implantAt(c[0], c[1]) < 0) { x.strokeStyle = Pt.FACTION[hi.f].col; x.lineWidth = 3; x.setLineDash([4, 5]); x.lineDashOffset = -t * 20; x.strokeRect(gx + c[0] * cs + 7, gy + c[1] * cs + 7, cs - 14, cs - 14); x.setLineDash([]); } }); }
    // right panel
    var rx = 600, y = 46; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    function line(txt, font, col, dy) { x.font = font; x.fillStyle = col || INK; wrap(x, txt, rx, y, 480, dy || 20); }
    function wrap(ctx, txt, px, py, mw, lh) { var words = txt.split(' '), ln = ''; for (var i = 0; i < words.length; i++) { var tst = ln + words[i] + ' '; if (ctx.measureText(tst).width > mw && ln) { ctx.fillText(ln, px, y); y += lh; ln = words[i] + ' '; } else ln = tst; } ctx.fillText(ln, px, y); y += lh; }
    if (info) {
      var fi = Pt.FACTION[info.f];
      x.fillStyle = fi.col; x.fillRect(rx - 6, y - 26, 492, 6);
      line(info.name.toUpperCase(), '900 30px "Big Shoulders Display", Impact, sans-serif', INK, 24);
      line(fi.name + '  ·  fits: ' + (info.zone === 'arm' ? 'either arm' : D.ZONE_NAME[info.zone].toLowerCase()), '700 14px "Barlow Condensed", sans-serif', '#5a5040', 22);
      line(info.text, '500 18px "Barlow Condensed", sans-serif', INK, 21);
      line(info.heat, '700 15px "Barlow Condensed", sans-serif', '#b8300e', 26);
      if (GR.hold) { x.fillStyle = INK; x.fillRect(rx - 6, y - 14, 492, 30); x.font = '700 17px "Barlow Condensed", sans-serif'; x.fillStyle = '#fff2c8'; x.fillText('Click a lit cell to install it. R turns the piece.', rx + 4, y + 7); y += 34; }
    } else { line(GR.note || 'Hover an implant to read it.', '500 18px "Barlow Condensed", sans-serif', '#5a5040', 28); y += 60; }
    y = Math.max(y, 200);
    line('INSTALLED', '900 18px "Big Shoulders Display", Impact, sans-serif', INK, 22);
    if (!run.implants.length) line('Nothing yet. The syndicates will call.', '500 16px "Barlow Condensed", sans-serif', '#5a5040', 20);
    run.implants.forEach(function (it, n) { var im = D.IMPLANTS[it.id]; x.fillStyle = Pt.FACTION[im.f].col; x.fillRect(rx, y - 13, 14, 14); x.strokeStyle = INK; x.lineWidth = 2; x.strokeRect(rx, y - 13, 14, 14); x.font = '600 16px "Barlow Condensed", sans-serif'; x.fillStyle = it.torn ? '#b8200e' : INK; x.fillText((n + 1) + '  ' + im.name + (it.torn ? '  (torn out)' : ''), rx + 22, y); y += 19; });
    y += 12;
    var B = G.B, any = false;
    line('LINKS', '900 18px "Big Shoulders Display", Impact, sans-serif', INK, 22);
    for (var k in B.sets) { any = true; var s = D.SETS[k]; x.fillStyle = Pt.FACTION[k].col; x.beginPath(); x.arc(rx + 7, y - 6, 7, 0, 7); x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke(); x.font = '700 16px "Barlow Condensed", sans-serif'; x.fillStyle = INK; var w0 = rx; rx += 22; line('Set: ' + s.name + '. ' + s.text, '600 16px "Barlow Condensed", sans-serif', INK, 19); rx = w0; }
    for (k in B.fusions) { any = true; var fu = B.fusions[k]; x.fillStyle = INK; x.beginPath(); x.moveTo(rx + 7, y - 14); x.lineTo(rx + 15, y - 6); x.lineTo(rx + 7, y + 2); x.lineTo(rx - 1, y - 6); x.closePath(); x.fill(); var w1 = rx; rx += 22; line('Fusion: ' + fu.name + '. ' + fu.text, '600 16px "Barlow Condensed", sans-serif', '#8a1a0e', 19); rx = w1; }
    if (!any) line('Implants that touch will link. Two of one house make a set. Two rival houses can fuse.', '500 16px "Barlow Condensed", sans-serif', '#5a5040', 19);
    // tray
    if (GR.tray.length) { x.font = '900 16px "Big Shoulders Display", Impact, sans-serif'; x.fillStyle = INK; x.fillText('UNPLACED (sold on close)', 610, 550); GR.tray.forEach(function (id, i) { var sc = shapeCanvas(D.IMPLANTS[id]); x.fillStyle = '#fbf6e6'; x.fillRect(610 + i * 84, 560, 76, 56); x.strokeStyle = INK; x.lineWidth = 2; x.strokeRect(610 + i * 84, 560, 76, 56); x.drawImage(sc, 611 + i * 84, 562); }); }
    // footer
    x.font = '600 16px "Barlow Condensed", sans-serif'; x.fillStyle = '#5a5040'; x.textAlign = 'left';
    x.fillText(GR.hold ? 'Click a lit cell to install. R, wheel or right-click turns the piece. Click an installed implant to pull it.' : 'Click an installed implant to lift it. Tab closes.', 30, 636);
    x.fillStyle = INK; x.fillRect(960, 606, 130, 38); x.fillStyle = '#efe6cf'; x.font = '700 18px "Barlow Condensed", sans-serif'; x.textAlign = 'center'; x.fillText('CLOSE  (TAB)', 1025, 631);
    if (GR.flash > 0) { x.fillStyle = 'rgba(255,255,255,' + (GR.flash * 1.2).toFixed(2) + ')'; x.fillRect(0, 0, 1120, 660); }
  };
})();
