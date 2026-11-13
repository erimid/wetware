// Wetware — models: geometry builder and every character, enemy, boss and weapon, made in code
'use strict';
(function () {
  var M = W.models = {};
  var _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n3 = new THREE.Matrix3();
  var _c = new THREE.Color(), _c2 = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3();
  var idSeq = 0;

  function Bld() { this.pos = []; this.nor = []; this.col = []; this.mat = []; this.idx = []; this.uv = []; }
  M.Bld = Bld;
  // tr: {p,r,s}; ex: {grad, wet, emis, id}
  Bld.prototype.add = function (geo, tr, col, type, ex) {
    tr = tr || {}; ex = ex || {};
    _p.fromArray(tr.p || [0, 0, 0]); var r = tr.r || [0, 0, 0]; _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e);
    var s = tr.s; if (s === undefined) _s.set(1, 1, 1); else if (typeof s === 'number') _s.set(s, s, s); else _s.fromArray(s);
    _m4.compose(_p, _q, _s); _n3.getNormalMatrix(_m4);
    var pa = geo.attributes.position, na = geo.attributes.normal, base = this.pos.length / 3, n = pa.count;
    var lo = 1e9, hi = -1e9, i;
    if (ex.grad !== undefined) { for (i = 0; i < n; i++) { var y = pa.getY(i); if (y < lo) lo = y; if (y > hi) hi = y; } _c2.set(ex.grad); }
    _c.set(col);
    var id = ex.id !== undefined ? ex.id : ((idSeq = (idSeq + 0.137) % 1), 0.08 + idSeq * 0.9);
    for (i = 0; i < n; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m4); this.pos.push(_v.x, _v.y, _v.z);
      _n.fromBufferAttribute(na, i).applyMatrix3(_n3).normalize(); this.nor.push(_n.x, _n.y, _n.z);
      if (ex.grad !== undefined) { var t = (pa.getY(i) - lo) / (hi - lo || 1); this.col.push(_c.r + (_c2.r - _c.r) * t, _c.g + (_c2.g - _c.g) * t, _c.b + (_c2.b - _c.b) * t); }
      else this.col.push(_c.r, _c.g, _c.b);
      this.mat.push(type || 0, ex.wet || 0, ex.emis || 0, id);
    }
    if (geo.index) { var ia = geo.index; for (i = 0; i < ia.count; i++) this.idx.push(ia.getX(i) + base); }
    else for (i = 0; i < n; i++) this.idx.push(base + i);
    return this;
  };
  Bld.prototype.build = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 4));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  };

  // ---------- primitives ----------
  var gc = {};
  function memo(k, f) { return gc[k] || (gc[k] = f()); }
  var rbox = M.rbox = function (w, h, d, r) {
    r = r === undefined ? Math.min(w, h, d) * 0.18 : r;
    return memo('b' + w + '_' + h + '_' + d + '_' + r, function () {
      var g = new THREE.BoxGeometry(w, h, d, 3, 3, 3), pa = g.attributes.position, na = g.attributes.normal;
      var hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
      for (var i = 0; i < pa.count; i++) {
        var x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
        if (Math.abs(x) < w / 2 - 1e-4) x = Math.sign(x) * hx; if (Math.abs(y) < h / 2 - 1e-4) y = Math.sign(y) * hy; if (Math.abs(z) < d / 2 - 1e-4) z = Math.sign(z) * hz;
        var qx = W.clamp(x, -hx, hx), qy = W.clamp(y, -hy, hy), qz = W.clamp(z, -hz, hz);
        var dx = x - qx, dy = y - qy, dz = z - qz, l = Math.hypot(dx, dy, dz) || 1;
        pa.setXYZ(i, qx + dx / l * r, qy + dy / l * r, qz + dz / l * r); na.setXYZ(i, dx / l, dy / l, dz / l);
      }
      return g;
    });
  };
  var lathe = M.lathe = function (pts, seg, ps, pl) {
    if (pts[0][1] > pts[pts.length - 1][1]) pts = pts.slice().reverse(); // three's lathe faces outward only when the profile climbs
    var v = []; for (var i = 0; i < pts.length; i++) v.push(new THREE.Vector2(Math.max(pts[i][0], 0.0001), pts[i][1]));
    return new THREE.LatheGeometry(v, seg || 18, ps || 0, pl === undefined ? Math.PI * 2 : pl);
  };
  var cyl = M.cyl = function (r, h, seg, rt) {
    rt = rt === undefined ? r : rt; var b = Math.min(r, rt, h) * 0.18;
    return memo('c' + r + '_' + h + '_' + seg + '_' + rt, function () { return lathe([[0, h / 2], [rt - b, h / 2], [rt, h / 2 - b], [r, -h / 2 + b], [r - b, -h / 2], [0, -h / 2]], seg || 16); });
  };
  var sph = M.sph = function (r, a, b) { return memo('s' + r + '_' + a + '_' + b, function () { return new THREE.SphereGeometry(r, a || 16, b || 12); }); };
  var cap = M.cap = function (r, len) { return memo('k' + r + '_' + len, function () { return new THREE.CapsuleGeometry(r, len, 5, 14); }); };
  var tube = M.tube = function (pts, r, seg, rs) {
    var v = pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), seg || pts.length * 5, r, rs || 7, false);
  };
  var tor = M.tor = function (R, r, arc) { return new THREE.TorusGeometry(R, r, 8, 20, arc || Math.PI * 2); };
  var cone = M.cone = function (r, h, seg) { return lathe([[0, h], [r * 0.5, h * 0.5], [r, 0.04], [r * 0.9, 0], [0, 0]], seg || 14); };

  // ---------- rig plumbing ----------
  // template: { parts: [{name, parent, geo, pos:[x,y,z], cape, dbl}], height, radius }
  function Tpl() { this.parts = []; }
  Tpl.prototype.part = function (name, parent, b, pos, opt) { var p = { name: name, parent: parent, geo: b ? b.build() : null, pos: pos || [0, 0, 0] }; if (opt) for (var k in opt) p[k] = opt[k]; this.parts.push(p); return this; };
  var tcache = {};
  M.instantiate = function (key, makeFn, opts) {
    var tpl = tcache[key] || (tcache[key] = makeFn());
    var mats = W.gfx.charMats(opts);
    var capeBody = null, capeHull = null;
    var root = new THREE.Group(), parts = { root: root };
    tpl.parts.forEach(function (p) {
      var obj;
      if (p.geo) {
        var mb = mats.body, mh = mats.hull;
        if (p.cape) {
          if (!capeBody) {
            capeBody = W.gfx.paintMat({ sway: p.cape, double: true }); capeHull = W.gfx.paintMat({ hull: true, sway: p.cape, thick: 0.05 });
            ['uFlash', 'uCloak', 'uFade', 'uGlow'].forEach(function (u) { capeBody.uniforms[u] = mats.body.uniforms[u]; capeHull.uniforms[u] = mats.body.uniforms[u]; });
            capeHull.uniforms.uLag = capeBody.uniforms.uLag; mats.cape = capeBody; mats.capeHull = capeHull;
          }
          mb = capeBody; mh = capeHull;
        }
        obj = new THREE.Mesh(p.geo, mb); obj.layers.enable(1);
        var hull = new THREE.Mesh(p.geo, mh); obj.add(hull); obj.userData.hull = hull;
        if (p.cape) { obj.frustumCulled = false; hull.frustumCulled = false; }
        if (p.noHull) hull.visible = false;
      } else obj = new THREE.Group();
      obj.position.fromArray(p.pos);
      (parts[p.parent] || root).add(obj); parts[p.name] = obj;
    });
    return { root: root, parts: parts, mats: mats, tpl: tpl };
  };

  // ---------- weapons (built along -Y from the grip so they extend the arm) ----------
  function weaponGeo(b, kind, o) {
    o = o || {};
    if (kind === 'baton') {
      b.add(cyl(0.045, 1.25, 10), { p: [0, -0.5, 0] }, 0x2a2e34, 1);
      b.add(cyl(0.075, 0.3, 10), { p: [0, 0.02, 0] }, 0x8a5a2a, 0);
      for (var i = 0; i < 4; i++) b.add(tor(0.085, 0.028), { p: [0, -0.78 - i * 0.09, 0], r: [Math.PI / 2, 0, 0] }, 0x9aa4a8, 1);
      b.add(sph(0.11, 12, 8), { p: [0, -1.16, 0] }, o.glow || 0x9ff4ff, 2, { emis: 1 });
    } else if (kind === 'carbine') {
      b.add(rbox(0.13, 0.75, 0.2, 0.04), { p: [0, -0.2, 0.02] }, 0x39424a, 1);
      b.add(rbox(0.1, 0.34, 0.16, 0.04), { p: [0, 0.28, 0.06], r: [0.25, 0, 0] }, 0x8a5a2a, 0);
      b.add(cyl(0.035, 1.05, 8), { p: [0, -1.05, 0] }, 0x1c2026, 1);
      b.add(cyl(0.012, 0.5, 6), { p: [0, -1.8, 0] }, 0xd8e0e0, 1);
      b.add(rbox(0.09, 0.3, 0.12, 0.03), { p: [0, -0.3, 0.18] }, 0xc8862a, 0);
      b.add(sph(0.06, 8, 6), { p: [0, -0.62, -0.1] }, o.glow || 0x9ff4ff, 2, { emis: 1 });
    } else if (kind === 'hammer') {
      b.add(cyl(0.055, 1.7, 10), { p: [0, -0.62, 0] }, 0x4a3a2c, 0);
      b.add(rbox(0.5, 0.42, 0.78, 0.07), { p: [0, -1.5, 0] }, 0x4a5258, 1, { grad: 0x7a858a });
      b.add(rbox(0.54, 0.12, 0.3, 0.03), { p: [0, -1.5, 0] }, 0xd9a520, 0);
      b.add(cyl(0.2, 0.1, 12), { p: [0, -1.5, 0.42], r: [Math.PI / 2, 0, 0] }, o.glow || 0xffb347, 2, { emis: 0.8 });
      b.add(cyl(0.2, 0.1, 12), { p: [0, -1.5, -0.42], r: [Math.PI / 2, 0, 0] }, 0x22262a, 1);
    } else if (kind === 'pipe') {
      b.add(cyl(0.06, 1.9, 10), { p: [0, -0.75, 0] }, 0x6a4a3a, 1, { grad: 0x8a6a4a });
      b.add(cyl(0.11, 0.16, 10), { p: [0, -1.6, 0] }, 0x4a5a5a, 1);
      b.add(tube([[0, -1.7, 0], [0.12, -1.8, 0], [0.2, -1.72, 0]], 0.06, 8), {}, 0x6a4a3a, 1);
    } else if (kind === 'blade') {
      b.add(lathe([[0.0, -1.25], [0.05, -0.9], [0.08, -0.2], [0.03, -0.1], [0, -0.1]], 4), { s: [1, 1, 0.3] }, 0xd8e4e8, 1);
      b.add(cyl(0.05, 0.2, 8), { p: [0, 0, 0] }, 0x22262a, 0);
    } else if (kind === 'shield') {
      b.add(rbox(1.25, 1.75, 0.12, 0.05), { p: [0, -0.5, 0.42] }, 0x3a4650, 1, { grad: 0x56666e });
      b.add(rbox(1.0, 0.2, 0.14, 0.03), { p: [0, 0.05, 0.43] }, 0xe6e0d0, 0);
      b.add(rbox(0.9, 0.12, 0.14, 0.03), { p: [0, -0.95, 0.43] }, 0xd9a520, 0);
      b.add(rbox(0.5, 0.16, 0.14, 0.02), { p: [0, 0.05, 0.445] }, 0x9ff4ff, 2, { emis: 0.5 });
    } else if (kind === 'welder') {
      b.add(rbox(0.12, 0.5, 0.14, 0.03), { p: [0, -0.2, 0] }, 0x5a5048, 1);
      b.add(cone(0.08, 0.25, 8), { p: [0, -0.7, 0] }, 0xffb347, 2, { emis: 0.7 });
    }
  }
  M.weaponTpl = function (kind, glow) {
    return function () { var t = new Tpl(), b = new Bld(); weaponGeo(b, kind, { glow: glow }); t.part('weapon', null, b, [0, 0, 0]); return t; };
  };

  // ---------- humanoid ----------
  // o: colours + head style + extras. Built facing +Z.
  function humanoid(o) {
    var t = new Tpl(), k = o.bulk || 1, b, c = o;
    // legs
    ['legL', 'legR'].forEach(function (n, i) {
      var sx = i ? 1 : -1; b = new Bld();
      if (o.detail) {
        var gd = c.guard || 0x59636a, gd2 = c.guard2 || 0x8a949a;
        b.add(lathe([[0, 0.04], [0.15 * k, 0], [0.168 * k, -0.18], [0.135 * k, -0.4], [0.118 * k, -0.47], [0.138 * k, -0.57], [0.11 * k, -0.8], [0.12 * k, -0.86], [0, -0.9]], 14), {}, c.leg, 0, { grad: c.leg2 || c.leg });
        b.add(rbox(0.21 * k, 0.2, 0.13, 0.05), { p: [0, -0.45, 0.1 * k] }, gd, 1, { grad: gd2 });
        b.add(rbox(0.17 * k, 0.26, 0.1, 0.04), { p: [0, -0.69, 0.095 * k] }, gd, 1, { grad: gd2 });
        b.add(lathe([[0.125 * k, -0.7], [0.155 * k, -0.74], [0.125 * k, -0.79]], 12), {}, c.boot2 || 0x2c3238, 0);
        b.add(rbox(0.24 * k, 0.19, 0.44, 0.08), { p: [0, -0.84, 0.08] }, c.boot, 3);
        b.add(rbox(0.26 * k, 0.065, 0.48, 0.03), { p: [0, -0.925, 0.08] }, c.sole || 0x6a7074, 1);
        b.add(rbox(0.25 * k, 0.07, 0.1, 0.03), { p: [0, -0.82, 0.2] }, c.cuff || gd2, 1);
        if (i === 1 && c.holster) b.add(rbox(0.12, 0.3, 0.2, 0.04), { p: [0.15 * k, -0.2, 0.0] }, c.holster, 0);
      } else {
      b.add(lathe([[0, 0.04], [0.14 * k, 0], [0.15 * k, -0.3], [0.1 * k, -0.62], [0.11 * k, -0.86], [0, -0.9]], 12), {}, c.leg, 0, { grad: c.leg2 || c.leg });
      b.add(rbox(0.22 * k, 0.17, 0.4, 0.07), { p: [0, -0.87, 0.07] }, c.boot, 3);
      }
      t.part(n, null, b, [sx * 0.14 * k, 0.95, 0]);
    });
    t.part('body', null, null, [0, 0.95, 0]);
    // torso
    b = new Bld();
    b.add(lathe([[0, -0.1], [0.2 * k, -0.08], [0.23 * k, 0.1], [0.2 * k, 0.3], [0.3 * k, 0.56], [0.26 * k, 0.68], [0.1, 0.74], [0, 0.74]], 16), { s: [1, 1, 0.74] }, c.coat, c.coatType || 0, { grad: c.coat2 || c.coat });
    b.add(lathe([[0.215 * k, 0.02], [0.245 * k, 0.07], [0.215 * k, 0.12]], 16), { s: [1, 1, 0.78] }, c.belt || 0x1c1e22, 0);
    if (c.belt2) b.add(rbox(0.12, 0.1, 0.06, 0.02), { p: [0, 0.07, 0.19 * k] }, c.belt2, 1);
    if (o.pads) { b.add(sph(0.2 * k, 12, 8), { p: [-0.34 * k, 0.6, 0], s: [1, 0.7, 1] }, c.pad, 1); b.add(sph(0.2 * k, 12, 8), { p: [0.34 * k, 0.6, 0], s: [1, 0.7, 1] }, c.pad, 1); }
    if (o.pack === 'tank') { b.add(cap(0.14, 0.4), { p: [-0.1, 0.36, -0.28] }, c.packCol || 0x8a6a2a, 1); b.add(cap(0.14, 0.4), { p: [0.14, 0.36, -0.28] }, c.packCol || 0x8a6a2a, 1); }
    if (o.pack === 'antenna') { b.add(rbox(0.5, 0.6, 0.3, 0.06), { p: [0, 0.36, -0.3] }, c.packCol || 0x4a5258, 1); b.add(cyl(0.015, 1.3, 5), { p: [0.18, 1.2, -0.34] }, 0x14161a, 1); b.add(sph(0.05, 8, 6), { p: [0.18, 1.86, -0.34] }, c.eye, 2, { emis: 1 }); b.add(cyl(0.015, 0.8, 5), { p: [-0.16, 0.95, -0.34], r: [0, 0, 0.2] }, 0x14161a, 1); }
    if (o.pack === 'frame') { b.add(rbox(0.9 * k, 0.7, 0.4, 0.08), { p: [0, 0.46, -0.3] }, c.pad, 1, { grad: c.coat2 }); b.add(cyl(0.09, 0.6, 8), { p: [-0.3 * k, 0.95, -0.36] }, 0x2a2e34, 1); b.add(cyl(0.09, 0.6, 8), { p: [0.3 * k, 0.95, -0.36] }, 0x2a2e34, 1); }
    if (o.detail) {
      b.add(cyl(0.1, 0.16, 10), { p: [0, 0.77, 0] }, c.neck || 0x14181c, 0);
      b.add(lathe([[0.2 * k, 0.6], [0.275 * k, 0.69], [0.23 * k, 0.8], [0.17 * k, 0.8]], 16), { s: [1, 1, 0.9] }, c.collar || c.coat2, 3);
      b.add(tube([[-0.25 * k, 0.62, 0.1], [-0.08 * k, 0.42, 0.21 * k], [0.14 * k, 0.2, 0.2 * k], [0.24 * k, 0.08, 0.08]], 0.05, 12, 6), {}, c.strap || c.belt || 0x8a5a2a, 0);
      b.add(rbox(0.15, 0.17, 0.1, 0.035), { p: [-0.11 * k, 0.26, 0.19 * k], r: [0, 0, 0.5] }, c.pouch || 0x6a4a26, 0);
      b.add(rbox(0.17, 0.22, 0.13, 0.04), { p: [0.26 * k, -0.02, 0.04] }, c.pouch || 0x6a4a26, 0);
      b.add(rbox(0.15, 0.19, 0.13, 0.04), { p: [-0.26 * k, -0.01, -0.02] }, c.pouch2 || 0x39444c, 1);
      b.add(rbox(0.1, 0.05, 0.03, 0.012), { p: [0.26 * k, 0.03, 0.11] }, c.belt2 || 0xd9a520, 1);
    }
    if (o.core) b.add(sph(0.11, 10, 8), { p: [0, 0.4, 0.2 * k] }, c.eye, 2, { emis: 1 });
    t.part('torso', 'body', b, [0, 0, 0]);
    // head
    b = new Bld(); var hs = o.headScale || 1;
    if (o.head === 'hood') {
      b.add(sph(0.25, 16, 12), { p: [0, 0.04, -0.1], s: [1.04, 1.08, 1.0] }, c.hood, 3, { grad: c.hood2 || c.hood });
      b.add(cone(0.14, 0.28, 10), { p: [0, 0.1, -0.2], r: [-1.9, 0, 0] }, c.hood, 3);
      b.add(sph(0.185, 14, 10), { p: [0, 0, 0.07] }, 0x14181c, 0);
      if (o.detail) {
        b.add(tor(0.245, 0.04, Math.PI), { p: [0, 0.0, 0.1], s: [1, 1.12, 1] }, c.hood2 || c.hood, 3);
        b.add(lathe([[0.19, -0.02], [0.215, 0.045], [0.19, 0.11]], 16), { p: [0, 0, 0.05] }, c.band || 0x8a5a2a, 0);
        [-1, 1].forEach(function (sx) {
          b.add(cyl(0.105, 0.09, 12), { p: [sx * 0.1, 0.045, 0.235], r: [Math.PI / 2, 0, 0] }, 0x22262c, 1);
          b.add(cyl(0.078, 0.05, 12), { p: [sx * 0.1, 0.045, 0.275], r: [Math.PI / 2, 0, 0] }, c.eye, 2, { emis: 1 });
          b.add(sph(0.028, 6, 5), { p: [sx * 0.1 - 0.03, 0.075, 0.3] }, 0xfff4d8, 2, { emis: 1 });
          b.add(cyl(0.078, 0.13, 10), { p: [sx * 0.155, -0.135, 0.18], r: [Math.PI / 2, 0, sx * -0.5] }, 0x59636a, 1, { grad: 0x8a949a });
        });
        b.add(rbox(0.22, 0.17, 0.18, 0.06), { p: [0, -0.11, 0.22] }, 0x39444c, 1);
        b.add(cyl(0.065, 0.08, 10), { p: [0, -0.12, 0.32], r: [Math.PI / 2, 0, 0] }, c.cuff || 0xd9a520, 1);
        b.add(tube([[0.1, -0.18, 0.18], [0.2, -0.24, 0.06], [0.2, -0.3, -0.08]], 0.042, 10, 6), {}, 0x22262c, 0);
      } else {
      b.add(rbox(0.38, 0.12, 0.1, 0.03), { p: [0, 0.04, 0.22] }, 0x1c2026, 1);
      b.add(sph(0.085, 10, 8), { p: [-0.095, 0.045, 0.265], s: [1, 1, 0.6] }, c.eye, 2, { emis: 1 });
      b.add(sph(0.085, 10, 8), { p: [0.095, 0.045, 0.265], s: [1, 1, 0.6] }, c.eye, 2, { emis: 1 });
      b.add(rbox(0.2, 0.15, 0.16, 0.05), { p: [0, -0.1, 0.22] }, 0x39444c, 1);
      b.add(cyl(0.06, 0.1, 8), { p: [-0.13, -0.12, 0.17], r: [0, 0, 1.2] }, 0x59636a, 1); b.add(cyl(0.06, 0.1, 8), { p: [0.13, -0.12, 0.17], r: [0, 0, -1.2] }, 0x59636a, 1);
      }
    } else if (o.head === 'dive') {
      b.add(sph(0.3, 16, 12), { p: [0, 0.06, 0] }, c.helm, 1, { grad: c.helm2 || c.helm });
      b.add(cyl(0.15, 0.08, 14), { p: [0, 0.06, 0.27], r: [Math.PI / 2, 0, 0] }, 0x2a2018, 1);
      b.add(cyl(0.11, 0.05, 14), { p: [0, 0.06, 0.305], r: [Math.PI / 2, 0, 0] }, c.eye, 2, { emis: 0.9 });
      b.add(cyl(0.08, 0.07, 10), { p: [-0.27, 0.06, 0.08], r: [0, 0, Math.PI / 2] }, 0x2a2018, 1); b.add(cyl(0.08, 0.07, 10), { p: [0.27, 0.06, 0.08], r: [0, 0, Math.PI / 2] }, 0x2a2018, 1);
      b.add(lathe([[0.2, -0.2], [0.33, -0.16], [0.3, -0.08]], 14), {}, c.helm2 || c.helm, 1);
    } else if (o.head === 'flathelm') {
      b.add(sph(0.2, 14, 10), { p: [0, 0, 0] }, 0x14181c, 0);
      b.add(cyl(0.25, 0.2, 14, 0.2), { p: [0, 0.1, 0] }, c.helm, 1);
      b.add(rbox(0.46, 0.14, 0.2, 0.03), { p: [0, 0.0, 0.14] }, c.eye, 2, { emis: 0.8 });
      b.add(rbox(0.3, 0.16, 0.2, 0.05), { p: [0, -0.14, 0.1] }, c.helm, 1);
    } else if (o.head === 'weld') {
      b.add(sph(0.2, 14, 10), {}, 0x2a2420, 0);
      b.add(rbox(0.36, 0.44, 0.14, 0.05), { p: [0, -0.02, 0.16], r: [-0.12, 0, 0] }, c.helm, 1, { grad: c.helm2 || c.helm });
      b.add(rbox(0.22, 0.08, 0.05, 0.02), { p: [0, 0.04, 0.24] }, c.eye, 2, { emis: 1 });
    } else if (o.head === 'slit') {
      b.add(sph(0.2, 14, 10), { s: [0.92, 1.12, 1] }, c.helm, 3);
      b.add(rbox(0.3, 0.05, 0.1, 0.02), { p: [0, 0.03, 0.17], r: [0, 0, 0.18] }, c.eye, 2, { emis: 1 });
      b.add(tube([[0, 0.1, -0.16], [0.1, 0.0, -0.4], [0.05, -0.3, -0.6], [0.2, -0.5, -0.8]], 0.05, 10), {}, c.accent, 3);
      b.add(tube([[0, 0.1, -0.16], [-0.14, -0.05, -0.38], [-0.1, -0.36, -0.5]], 0.045, 8), {}, c.accent, 3);
    } else if (o.head === 'pilot') {
      b.add(sph(0.17, 12, 10), {}, 0x2a2420, 0); b.add(rbox(0.3, 0.1, 0.12, 0.03), { p: [0, 0.02, 0.12] }, c.eye, 2, { emis: 1 });
      b.add(lathe([[0.3, -0.2], [0.34, 0.0], [0.3, 0.2], [0.16, 0.28]], 12, -1.2, 2.4 + Math.PI), { r: [0, Math.PI, 0] }, c.pad, 1);
    } else if (o.head === 'cap' || o.head === 'brim' || o.head === 'phones' || o.head === 'bald') {
      b.add(sph(0.19, 14, 10), { s: [1, 1.1, 1] }, c.skin, 0);
      if (o.head === 'cap') b.add(sph(0.2, 14, 8), { p: [0, 0.07, 0], s: [1.02, 0.7, 1.02] }, c.helm, 0);
      if (o.head === 'brim') { b.add(lathe([[0.02, 0.26], [0.17, 0.22], [0.2, 0.1], [0.42, 0.06], [0.42, 0.03], [0.02, 0.05]], 16), {}, c.helm, 3); }
      if (o.head === 'phones') { b.add(tor(0.2, 0.035, Math.PI), { p: [0, 0.03, 0] }, c.helm, 1); b.add(cyl(0.09, 0.08, 10), { p: [-0.2, 0, 0], r: [0, 0, Math.PI / 2] }, c.helm, 1); b.add(cyl(0.09, 0.08, 10), { p: [0.2, 0, 0], r: [0, 0, Math.PI / 2] }, c.helm, 1); b.add(sph(0.19, 12, 8), { p: [0, 0.06, -0.02], s: [1, 0.8, 1] }, 0x1a1620, 0); }
      b.add(rbox(0.26, 0.06, 0.08, 0.02), { p: [0, 0.03, 0.16] }, c.eye, 2, { emis: 0.6 });
      b.add(rbox(0.18, 0.12, 0.12, 0.04), { p: [0, -0.1, 0.14] }, c.mask || 0x9fd0c0, 0);
    }
    t.part('head', 'body', b, [0, 0.82, 0], { scale: hs });
    // arms
    ['armL', 'armR'].forEach(function (n, i) {
      var sx = i ? 1 : -1, as = o.arm || 1; b = new Bld();
      b.add(lathe([[0, 0.1], [0.12 * k * as, 0.06], [0.125 * k * as, -0.2], [0.09 * k * as, -0.5], [0.1 * k * as, -0.62], [0, -0.64]], 12), {}, c.sleeve || c.coat, 0, { grad: c.coat2 || c.coat });
      if (o.detail) {
        var hk2 = o.hand || 1;
        b.add(rbox(0.2 * hk2, 0.22 * hk2, 0.23 * hk2, 0.07), { p: [0, -0.72, 0.02] }, c.glove, 0);
        b.add(cap(0.05 * hk2, 0.07), { p: [-sx * 0.11 * hk2, -0.7, 0.07], r: [0.5, 0, sx * 0.5] }, c.glove, 0);
        b.add(sph(0.15 * k * as, 10, 8), { p: [sx * 0.02, 0.04, 0], s: [1, 0.8, 1] }, c.shoulder || c.coat2 || c.coat, 0);
        if (i === (o.bracerArm === undefined ? 0 : o.bracerArm) || o.bracerArm === 2) { b.add(rbox(0.23 * k, 0.26, 0.23 * k, 0.06), { p: [0, -0.4, 0] }, c.guard || 0x59636a, 1, { grad: c.guard2 || 0x8a949a }); b.add(rbox(0.08, 0.1, 0.04, 0.015), { p: [sx * 0.0, -0.4, 0.12 * k] }, c.eye, 2, { emis: 0.8 }); }
      } else
      b.add(sph(0.155 * (o.hand || 1), 12, 10), { p: [0, -0.7, 0.02], s: [1, 1.15, 1.05] }, c.glove, 0);
      if (o.cuff) b.add(lathe([[0.11 * k, -0.5], [0.15 * k, -0.56], [0.11 * k, -0.62]], 12), {}, o.cuff, 1);
      if (o.fist) { b.add(rbox(0.5, 0.7, 0.5, 0.12), { p: [0, -0.86, 0] }, c.pad, 1, { grad: c.coat2 }); b.add(rbox(0.54, 0.12, 0.54, 0.04), { p: [0, -0.62, 0] }, 0xd9a520, 0); }
      if (i === 1 && o.weapon && o.weapon !== 'shield') { var wb = new Bld(); weaponGeo(wb, o.weapon, {}); b.add(wb.build(), { p: [0, -0.7, 0.04], r: [-1.1, 0, 0] }, 0xffffff, 0); remapLast(b, wb); }
      if (i === 0 && o.weapon === 'shield') { var sb = new Bld(); weaponGeo(sb, 'shield', {}); b.add(sb.build(), { p: [0.3, -0.25, 0.1] }, 0xffffff, 0); remapLast(b, sb); }
      if (i === 0 && o.blade2) { var bb = new Bld(); weaponGeo(bb, 'blade', {}); b.add(bb.build(), { p: [0, -0.7, 0.04], r: [-1.1, 0, 0] }, 0xffffff, 0); remapLast(b, bb); }
      t.part(n, 'body', b, [sx * (0.33 * k), 0.58, 0]);
    });
    // cape
    if (o.cape) {
      b = new Bld(); var cl = o.cape.len || 1.15, cw = o.cape.w || 0.66;
      var pts = [[0.2, 0.1], [0.34 * k, 0.0], [0.4 * k, -0.25], [cw * 0.8, -cl * 0.6], [cw, -cl], [cw * 1.04, -cl - 0.06]];
      var cg = o.cape.gap || 1.1, mg = o.cape.mgap || 0.7;
      var c0 = o.cape.front ? 0 : Math.PI * 0.5; var g = lathe(pts, 22, c0 + cg / 2, Math.PI * 2 - cg);
      var pa = g.attributes.position; for (var i = 0; i < pa.count; i++) { var y = pa.getY(i), w = W.sat(-y / cl); var a = Math.atan2(pa.getZ(i), pa.getX(i)); var rr = 1 + Math.sin(a * 5 + 1) * 0.07 * w + Math.sin(a * 9) * 0.03 * w; var back = Math.max(0, -Math.sin(a)); pa.setX(i, pa.getX(i) * rr * (1 - 0.12 * w)); pa.setZ(i, pa.getZ(i) * rr * (1 + 0.5 * back * w) - 0.14 * w); pa.setY(i, y - Math.sin(a * 3) * 0.05 * w - back * back * 0.22 * w); }
      g.computeVertexNormals();
      b.add(g, {}, o.cape.col, 3, { grad: o.cape.col2 || o.cape.col });
      if (o.cape.mantle) {
        var ms = o.cape.msize || 1;
        var gm = lathe([[0.16, 0.16], [0.36 * k, 0.06], [(0.36 + 0.16 * ms) * k, 0.06 - 0.26 * ms], [(0.36 + 0.2 * ms) * k, 0.06 - 0.36 * ms]], 18, c0 + mg / 2, Math.PI * 2 - mg); b.add(gm, {}, o.cape.mantle, 3, { grad: o.cape.mantle2 || o.cape.mantle });
        [-0.16, 0.16].forEach(function (sx, ti) { var tg = new THREE.BoxGeometry(0.16, 1.5 + ti * 0.3, 0.035, 1, 8, 1); b.add(tg, { p: [sx, -0.7 - ti * 0.15, -0.52 - ti * 0.06], r: [0.34, sx * 0.5, sx * 0.3] }, o.cape.mantle, 3); });
      }
      if (o.cape.clasp) { b.add(cyl(0.075, 0.06, 10), { p: [0, 0.02, 0.3 * k], r: [Math.PI / 2, 0, 0] }, o.cape.clasp, 1); }
      if (o.cape.trim) { var g2 = lathe([[cw * 1.0, -cl + 0.06], [cw * 1.06, -cl - 0.02], [cw * 1.02, -cl - 0.1]], 22, c0 + cg / 2, Math.PI * 2 - cg); b.add(g2, { p: [0, 0, -0.1] }, o.cape.trim, 0); }
      t.part('cape', 'body', b, [0, 0.7, 0], { cape: 1 / cl });
    }
    t.h = 2.0 * (o.scale || 1);
    return t;
  }
  // after adding a pre-built coloured geometry with white, restore its own colours/materials
  function remapLast(b, src) {
    var n = src.pos.length / 3, start = b.col.length / 3 - n;
    for (var i = 0; i < n; i++) { b.col[(start + i) * 3] = src.col[i * 3]; b.col[(start + i) * 3 + 1] = src.col[i * 3 + 1]; b.col[(start + i) * 3 + 2] = src.col[i * 3 + 2]; for (var j = 0; j < 4; j++) b.mat[(start + i) * 4 + j] = src.mat[i * 4 + j]; }
  }

  var H = {
    kestrel: function () { return humanoid({ head: 'hood', hood: 0x2c3a46, hood2: 0x44586a, eye: 0xffb347, coat: 0x2a343c, coat2: 0x3c4a54, leg: 0x1e252c, leg2: 0x2c363e, boot: 0x14181c, glove: 0xc8963c, belt: 0x8a5a2a, belt2: 0xd9a520, hand: 1.1, cuff: 0xd9a520, detail: true, collar: 0xb8741a, band: 0x8a5a2a, pouch: 0x7a5228, strap: 0x9a6a2e, cape: { col: 0x16262e, col2: 0x2c4a56, trim: 0xe09a2a, len: 1.15, w: 0.56, front: true, gap: 3.3, mgap: 1.9, msize: 0.62, mantle: 0xb8741a, mantle2: 0xdc9a2c, clasp: 0xd9a520 } }); },
    marrow: function () { return humanoid({ head: 'hood', hood: 0xe8e2d2, hood2: 0xfaf6ea, eye: 0xff3028, coat: 0x8a2a22, coat2: 0xb8402e, leg: 0x2a2224, leg2: 0x3a2e30, boot: 0x14181c, glove: 0x1c1c22, belt: 0x14161a, belt2: 0xff3028, hand: 1.2, cuff: 0xff3028, cape: { col: 0xc8c0ae, col2: 0xf0ead8, trim: 0x8a2a22, len: 1.2, w: 0.66, mantle: 0x9a2018, mantle2: 0xc83a28 } }); },
    scav: function () { return humanoid({ bulk: 1.18, head: 'dive', helm: 0x9a7a3a, helm2: 0xd8b25a, eye: 0xff5a2a, coat: 0x4a5a44, coat2: 0x6a7a5a, leg: 0x2c3430, boot: 0x1a1c1c, glove: 0x8a4a2a, belt: 0x8a2a1a, hand: 1.25, weapon: 'pipe', pack: 'tank' }); },
    warden: function () { return humanoid({ bulk: 1.25, scale: 1.12, head: 'flathelm', helm: 0xe6e0d0, eye: 0x9ff4ff, coat: 0x2a3a52, coat2: 0x3e5270, leg: 0x1c2430, boot: 0x101418, glove: 0xe6e0d0, pads: true, pad: 0xe6e0d0, belt: 0xd9a520, weapon: 'shield', hand: 1.2 }); },
    ghost: function () { return humanoid({ bulk: 0.8, scale: 1.06, head: 'slit', helm: 0x1c2630, eye: 0xff3a3a, accent: 0x8a2030, coat: 0x1c2630, coat2: 0x2e3e4c, coatType: 3, leg: 0x161c24, boot: 0x0e1014, glove: 0x8a2030, weapon: 'blade', blade2: true, hand: 0.9 }); },
    rigger: function () { return humanoid({ bulk: 1.0, scale: 0.95, head: 'weld', helm: 0xb8502a, helm2: 0xd8703a, eye: 0x9ff4ff, coat: 0x5a5048, coat2: 0x7a6a5a, leg: 0x2a2a2c, boot: 0x141414, glove: 0xd9a520, pack: 'antenna', weapon: 'welder', hand: 1.1 }); },
    bruiser: function () { return humanoid({ bulk: 1.9, scale: 1.55, head: 'pilot', eye: 0xff5a2a, coat: 0x8a6a1a, coat2: 0xd9a520, pad: 0xc89418, leg: 0x3a3e44, leg2: 0x5a6068, boot: 0x1c1e22, glove: 0x2a2e34, pads: true, fist: true, pack: 'frame', core: true, arm: 1.25, hand: 1.1, belt: 0x14161a }); },
    ruen: function () { return humanoid({ bulk: 1.05, scale: 0.92, head: 'cap', helm: 0x7fb6a0, skin: 0xb98a6a, eye: 0x8fffb0, mask: 0x9fd0c0, coat: 0xc8c4b0, coat2: 0xe8e4d0, leg: 0x3a4a44, boot: 0x1a1c1c, glove: 0x7fb6a0, hand: 1.1, belt: 0x5a3a2a }); },
    pike: function () { return humanoid({ bulk: 0.85, scale: 0.86, head: 'phones', helm: 0xe8d24a, skin: 0x8a5a44, eye: 0x49d3ff, mask: 0x8a5a44, coat: 0xc8502a, coat2: 0xe8703a, leg: 0x2a2440, boot: 0x1a1c1c, glove: 0x2a2440, pack: 'antenna', hand: 1.0 }); },
    brine: function () { return humanoid({ bulk: 1.1, head: 'brim', helm: 0x2a2e22, skin: 0xa07a5a, eye: 0xe8e0c8, mask: 0x8a8a80, coat: 0x4a5a3a, coat2: 0x5e6e4a, leg: 0x2a2e22, boot: 0x141414, glove: 0x6a4a2a, hand: 1.1, cape: { col: 0x3a4630, col2: 0x4e5c40, len: 0.9, w: 0.55 } }); },
    hask: function () { return humanoid({ bulk: 1.35, scale: 0.98, head: 'cap', helm: 0x3a2c22, skin: 0xc08a66, eye: 0x141414, mask: 0x5a4a3a, coat: 0x5a4636, coat2: 0x7a6248, leg: 0x2a2620, boot: 0x141414, glove: 0xc08a66, hand: 1.3, belt: 0xd9a520 }); },
    buyer: function () { return humanoid({ bulk: 1.0, scale: 1.1, head: 'brim', helm: 0x0c0e12, skin: 0x16181e, eye: 0xffd070, mask: 0x16181e, coat: 0x16181e, coat2: 0x262a34, leg: 0x0e1014, boot: 0x08090c, glove: 0x16181e, cape: { col: 0x14161c, col2: 0x2a2e3a, len: 1.25, w: 0.6 } }); }
  };

  // ---------- machines ----------
  function leech() {
    var t = new Tpl(), b = new Bld();
    b.add(sph(0.3, 14, 10), { s: [1, 0.8, 1.25] }, 0x3a4a40, 3, { grad: 0x6a8a5a });
    b.add(sph(0.2, 10, 8), { p: [0, -0.02, -0.34], s: [1, 0.7, 1.2] }, 0x2e3a34, 3);
    b.add(cyl(0.14, 0.12, 12), { p: [0, -0.08, 0.34], r: [1.3, 0, 0] }, 0x8a2a1a, 0);
    b.add(sph(0.085, 8, 6), { p: [0, 0.14, 0.24] }, 0xff3a20, 2, { emis: 1 });
    for (var i = 0; i < 4; i++) { var a = (i - 1.5) * 0.7; b.add(tube([[Math.sin(a) * 0.2, -0.1, Math.cos(a) * 0.2], [Math.sin(a) * 0.45, -0.12, Math.cos(a) * 0.4], [Math.sin(a) * 0.42, -0.42, Math.cos(a) * 0.5]], 0.03, 8, 5), {}, 0x14181c, 1); }
    t.part('body', null, b, [0, 1.1, 0]);
    b = new Bld(); b.add(rbox(0.9, 0.02, 0.16, 0.008), {}, 0xc8d8d8, 1); b.add(rbox(0.16, 0.02, 0.9, 0.008), {}, 0xc8d8d8, 1); b.add(cyl(0.04, 0.12, 6), { p: [0, -0.05, 0] }, 0x14181c, 1);
    t.part('rotor', 'body', b, [0, 0.3, -0.05], { noHull: true });
    t.h = 1.5; return t;
  }
  function hound() {
    var t = new Tpl(), b = new Bld();
    b.add(lathe([[0, 0.75], [0.2, 0.7], [0.3, 0.3], [0.26, -0.3], [0.16, -0.7], [0, -0.75]], 14), { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.85] }, 0x39424a, 1, { grad: 0x5e6c74 });
    b.add(rbox(0.3, 0.1, 0.9, 0.04), { p: [0, 0.27, 0] }, 0xb8502a, 0);
    b.add(tube([[0, 0.1, -0.7], [0, 0.4, -1.0], [0, 0.75, -1.05]], 0.03, 8, 5), {}, 0x14181c, 1); b.add(sph(0.06, 8, 6), { p: [0, 0.78, -1.05] }, 0xff3a20, 2, { emis: 1 });
    t.part('body', null, b, [0, 0.85, 0]);
    b = new Bld();
    b.add(rbox(0.36, 0.3, 0.5, 0.1), { p: [0, 0, 0.2] }, 0x4a565e, 1, { grad: 0x6e7c84 });
    b.add(rbox(0.3, 0.1, 0.46, 0.04), { p: [0, -0.17, 0.3], r: [0.25, 0, 0] }, 0x22282e, 1);
    b.add(rbox(0.38, 0.07, 0.12, 0.02), { p: [0, 0.04, 0.44] }, 0xff3a20, 2, { emis: 1 });
    for (var i = 0; i < 4; i++) b.add(cone(0.035, 0.12, 5), { p: [-0.1 + i * 0.066, -0.12, 0.5], r: [Math.PI, 0, 0] }, 0xe8e8e0, 1);
    t.part('head', 'body', b, [0, 0.06, 0.72]);
    [['legFL', -0.3, 0.45], ['legFR', 0.3, 0.45], ['legBL', -0.3, -0.5], ['legBR', 0.3, -0.5]].forEach(function (d) {
      b = new Bld(); b.add(lathe([[0, 0.06], [0.11, 0.02], [0.09, -0.36], [0.06, -0.42], [0.05, -0.8], [0, -0.84]], 10), {}, 0x2a3238, 1); b.add(sph(0.09, 8, 6), { p: [0, -0.4, 0.04] }, 0xb8502a, 0); b.add(rbox(0.14, 0.08, 0.22, 0.03), { p: [0, -0.82, 0.04] }, 0x14181c, 1);
      t.part(d[0], 'body', b, [d[1], 0.0, d[2]]);
    });
    t.h = 1.3; return t;
  }
  function spitter() {
    var t = new Tpl(), b = new Bld();
    for (var i = 0; i < 3; i++) { var a = i * 2.094 + 0.5; b.add(tube([[0, 0.7, 0], [Math.sin(a) * 0.5, 0.5, Math.cos(a) * 0.5], [Math.sin(a) * 0.85, 0.0, Math.cos(a) * 0.85]], 0.06, 8, 6), {}, 0x2a2e34, 1); b.add(cyl(0.14, 0.06, 8), { p: [Math.sin(a) * 0.85, 0.03, Math.cos(a) * 0.85] }, 0x14181c, 1); }
    b.add(lathe([[0, 0.5], [0.42, 0.56], [0.56, 0.9], [0.5, 1.3], [0.3, 1.5], [0, 1.52]], 16), {}, 0x5a6a2a, 3, { grad: 0x9ab83a });
    b.add(sph(0.2, 10, 8), { p: [0.4, 1.0, 0.25] }, 0xb8e04a, 2, { emis: 0.5 }); b.add(sph(0.16, 10, 8), { p: [-0.42, 0.85, 0.2] }, 0xb8e04a, 2, { emis: 0.5 }); b.add(sph(0.14, 10, 8), { p: [0.1, 0.8, -0.48] }, 0xb8e04a, 2, { emis: 0.5 });
    t.part('body', null, b, [0, 0, 0]);
    b = new Bld(); b.add(lathe([[0.16, 0], [0.2, 0.1], [0.17, 0.75], [0.24, 0.85], [0.2, 0.9], [0.13, 0.9], [0.13, 0.0]], 12), {}, 0x39424a, 1, { grad: 0x66747c }); b.add(tor(0.2, 0.04), { p: [0, 0.45, 0], r: [Math.PI / 2, 0, 0] }, 0xb8502a, 0);
    t.part('tube', 'body', b, [0, 1.4, 0]);
    t.h = 2.2; return t;
  }
  function turret() {
    var t = new Tpl(), b = new Bld();
    for (var i = 0; i < 3; i++) { var a = i * 2.094; b.add(tube([[0, 0.55, 0], [Math.sin(a) * 0.5, 0.0, Math.cos(a) * 0.5]], 0.04, 4, 6), {}, 0x2a2e34, 1); }
    b.add(cyl(0.12, 0.3, 10), { p: [0, 0.6, 0] }, 0x39424a, 1);
    t.part('base', null, b, [0, 0, 0]);
    b = new Bld(); b.add(rbox(0.4, 0.3, 0.5, 0.08), {}, 0xb8502a, 1, { grad: 0xd8703a }); b.add(cyl(0.05, 0.7, 8), { p: [0.09, 0, 0.5], r: [Math.PI / 2, 0, 0] }, 0x1c2026, 1); b.add(cyl(0.05, 0.7, 8), { p: [-0.09, 0, 0.5], r: [Math.PI / 2, 0, 0] }, 0x1c2026, 1);
    b.add(sph(0.08, 8, 6), { p: [0, 0.18, 0.1] }, 0xff3a20, 2, { emis: 1 });
    t.part('head', 'base', b, [0, 0.9, 0]);
    t.h = 1.3; return t;
  }
  function patch() {
    var t = new Tpl(), b = new Bld();
    b.add(tor(0.36, 0.09), { r: [Math.PI / 2, 0, 0] }, 0xe6e0d0, 3);
    b.add(sph(0.2, 12, 10), {}, 0xe6e0d0, 3, { grad: 0xffffff });
    b.add(rbox(0.3, 0.09, 0.05, 0.02), { p: [0, 0, 0.2] }, 0x40e08a, 2, { emis: 1 }); b.add(rbox(0.09, 0.3, 0.05, 0.02), { p: [0, 0, 0.2] }, 0x40e08a, 2, { emis: 1 });
    b.add(tube([[0, -0.15, 0], [0.05, -0.4, 0.1], [0, -0.6, 0.25]], 0.035, 8, 5), {}, 0x39424a, 1); b.add(sph(0.07, 8, 6), { p: [0, -0.62, 0.27] }, 0x40e08a, 2, { emis: 1 });
    t.part('body', null, b, [0, 1.9, 0]);
    t.h = 2.4; return t;
  }
  // the Dredge: hull + rotating turret arm with a bucket
  function dredge() {
    var t = new Tpl(), b = new Bld();
    b.add(lathe([[0, 0], [3.3, 0], [3.4, 0.5], [3.0, 1.3], [2.5, 1.5], [0, 1.5]], 28), {}, 0x5a4a1a, 1, { grad: 0xb8902a });
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; b.add(rbox(0.9, 1.1, 0.5, 0.1), { p: [Math.sin(a) * 3.1, 0.75, Math.cos(a) * 3.1], r: [0, a, 0] }, i % 2 ? 0x14181c : 0xd9a520, 1); }
    for (i = 0; i < 6; i++) { a = i * Math.PI / 3 + 0.5; b.add(cyl(0.3, 1.6, 10), { p: [Math.sin(a) * 2.2, 1.9, Math.cos(a) * 2.2] }, 0x39424a, 1, { grad: 0x5e6c74 }); b.add(cyl(0.36, 0.14, 10), { p: [Math.sin(a) * 2.2, 2.7, Math.cos(a) * 2.2] }, 0x8a3a1a, 0); }
    t.part('hull', null, b, [0, 0, 0]);
    // plates that blow off in phase 3
    b = new Bld(); b.add(lathe([[1.9, 1.5], [1.95, 2.9], [1.3, 3.3], [0, 3.35]], 20), {}, 0x6a5a22, 1, { grad: 0xc89a2a }); b.add(rbox(1.6, 1.0, 1.0, 0.15), { p: [0, 2.4, 1.7] }, 0x39424a, 1, { grad: 0x66747c }); b.add(rbox(1.3, 0.4, 0.1, 0.03), { p: [0, 2.5, 2.22] }, 0xffb347, 2, { emis: 0.9 });
    t.part('shell', 'hull', b, [0, 0, 0]);
    b = new Bld(); b.add(sph(1.05, 18, 14), { p: [0, 2.3, 0] }, 0xff6a2a, 2, { emis: 1 }); b.add(tor(1.2, 0.12), { p: [0, 2.3, 0], r: [Math.PI / 2, 0, 0] }, 0x22262a, 1); b.add(tor(1.2, 0.12), { p: [0, 2.3, 0], r: [0, 0, 0] }, 0x22262a, 1); b.add(cyl(0.9, 1.5, 14), { p: [0, 0.9, 0] }, 0x2a2e34, 1);
    t.part('core', 'hull', b, [0, 0, 0]);
    // arm: pivots at centre, built along +Z
    t.part('arm', 'hull', null, [0, 3.0, 0]);
    b = new Bld(); b.add(cyl(1.0, 0.7, 16), { p: [0, 0.3, 0] }, 0x39424a, 1, { grad: 0x66747c });
    b.add(rbox(0.8, 0.8, 7.2, 0.15), { p: [0, 0.9, 3.4], r: [-0.22, 0, 0] }, 0xb8902a, 1, { grad: 0xe8b83a });
    for (i = 0; i < 6; i++) b.add(rbox(0.86, 0.2, 0.36, 0.04), { p: [0, 0.45 + i * 0.25, 1.0 + i * 1.1], r: [-0.22, 0, 0] }, 0x14181c, 0);
    b.add(cyl(0.12, 6.4, 8), { p: [0.55, 1.2, 3.4], r: [Math.PI / 2 - 0.22, 0, 0] }, 0xc8d0d0, 1);
    t.part('boom', 'arm', b, [0, 0, 0]);
    b = new Bld(); b.add(rbox(0.6, 3.0, 0.6, 0.12), { p: [0, -1.2, 0] }, 0xb8902a, 1, { grad: 0x8a6a1a });
    b.add(lathe([[0.2, 0], [1.5, -0.2], [1.7, -1.1], [1.2, -1.7], [0, -1.8]], 16, 0, Math.PI * 1.25), { p: [0, -2.4, 0], r: [0, -0.6, 0] }, 0x4a565e, 1, { grad: 0x7a8890 });
    for (i = 0; i < 5; i++) b.add(cone(0.16, 0.6, 6), { p: [-1.0 + i * 0.5, -3.5, 1.25], r: [2.6, 0, 0] }, 0xe8e8e0, 1);
    t.part('bucket', 'arm', b, [0, 1.6, 6.9]);
    t.h = 4; return t;
  }
  function aircraft() {
    var t = new Tpl(), b = new Bld();
    b.add(lathe([[0, 4.2], [0.7, 3.6], [1.3, 1.5], [1.4, -1.5], [0.9, -3.4], [0, -4.0]], 18), { r: [Math.PI / 2, 0, 0], s: [1.25, 1, 0.8] }, 0x16181e, 1, { grad: 0x3a3e4a });
    b.add(sph(0.9, 14, 10), { p: [0, 0.5, 2.3], s: [1, 0.7, 1.5] }, 0xffd070, 2, { emis: 0.5 });
    [[-1, 0.6], [1, 0.6]].forEach(function (d) { b.add(rbox(4.2, 0.24, 1.7, 0.08), { p: [d[0] * 3.2, 0.6, -0.3], r: [0, 0, d[0] * 0.12] }, 0x1c1e26, 1, { grad: 0x343846 }); b.add(cyl(0.95, 0.6, 16), { p: [d[0] * 4.9, 0.75, -0.3] }, 0x2a2e3a, 1); b.add(cyl(0.7, 0.1, 16), { p: [d[0] * 4.9, 0.4, -0.3] }, 0x9ff4ff, 2, { emis: 1 }); });
    b.add(rbox(0.2, 1.6, 1.6, 0.05), { p: [0, 1.2, -3.2], r: [0.3, 0, 0] }, 0x1c1e26, 1);
    b.add(rbox(1.0, 0.2, 0.4, 0.04), { p: [0, -0.5, 3.0] }, 0xff4a2a, 2, { emis: 1 });
    for (var i = 0; i < 3; i++) b.add(cyl(0.08, 1.4, 6), { p: [i === 2 ? 0 : (i ? 1.0 : -1.0), -1.3, i === 2 ? 2.4 : -1.2] }, 0x14161a, 1);
    t.part('body', null, b, [0, 2.0, 0]);
    t.h = 4; return t;
  }
  function tagDrone() {
    var t = new Tpl(), b = new Bld();
    b.add(sph(0.16, 10, 8), { s: [1, 0.6, 1] }, 0xc8963c, 1); b.add(sph(0.07, 8, 6), { p: [0, -0.06, 0.1] }, 0xffb347, 2, { emis: 1 });
    b.add(rbox(0.6, 0.02, 0.1, 0.008), { p: [0, 0.1, 0] }, 0xd8e0e0, 1); b.add(rbox(0.1, 0.02, 0.6, 0.008), { p: [0, 0.1, 0] }, 0xd8e0e0, 1);
    t.part('body', null, b, [0, 0, 0]); return t;
  }

  var MAKERS = { leech: leech, hound: hound, spitter: spitter, turret: turret, patch: patch, dredge: dredge, aircraft: aircraft, tagdrone: tagDrone };
  // returns { root, parts, mats, kind, human }
  M.make = function (kind, opts) {
    var r;
    if (H[kind]) { r = M.instantiate(kind, H[kind], opts); r.human = true; }
    else r = M.instantiate(kind, MAKERS[kind], opts);
    r.kind = kind;
    r.tpl.parts.forEach(function (p) { if (p.scale) r.parts[p.name].scale.setScalar(p.scale); });
    return r;
  };
  M.makeWeapon = function (kind, glow, mats) {
    var key = 'w_' + kind + '_' + glow;
    var tpl = tcache[key] || (tcache[key] = M.weaponTpl(kind, glow)());
    var m = new THREE.Mesh(tpl.parts[0].geo, mats.body); m.layers.enable(1);
    var hull = new THREE.Mesh(tpl.parts[0].geo, mats.hull); m.add(hull);
    return m;
  };
  M.setFlash = function (rig, v) { rig.mats.body.uniforms.uFlash.value = v; };
  M.setGlow = function (rig, r, g, b) { rig.mats.body.uniforms.uGlow.value.set(r, g, b); };

  // ---------- procedural animation ----------
  // st: {speed, t (global), act, k (0..1 through act), kind, sub}
  function damp(o, ax, v, k, dt) { o.rotation[ax] = W.damp(o.rotation[ax], v, k, dt); }
  M.poseHuman = function (rig, st, dt) {
    var p = rig.parts, t = st.t, sp = W.sat((st.speed || 0) / 6), K = st.snap ? 400 : 22;
    var cyc = (st.phase || 0);
    var legA = Math.sin(cyc) * 0.85 * sp, bob = Math.abs(Math.cos(cyc)) * 0.07 * sp;
    var tgt = { lx: legA, rx: -legA, alx: -legA * 0.7, arx: legA * 0.5 - 0.35, alz: 0.12, arz: -0.12, bx: 0.14 * sp, by: 0, bz: 0, hy: 0, hx: -0.32, y: -bob + Math.sin(t * 2.2) * 0.012, wx: -1.1, wz: 0, roll: 0 };
    var a = st.act, k = st.k || 0, e;
    if (a === 'dash') { tgt.bx = 0.75; tgt.lx = -0.9; tgt.rx = 0.5; tgt.alx = 1.0; tgt.arx = 0.9; tgt.y = -0.28; tgt.hx = -0.3; }
    else if (a === 'windup') {
      var s = st.sub || 0, w = W.easeOut(k);
      if (s === 0) { tgt.by = 1.0 * w; tgt.arx = -1.3; tgt.arz = -1.3 * w; tgt.wx = -0.5; tgt.bx = 0.1; }
      else if (s === 1) { tgt.by = -1.0 * w; tgt.arx = -1.4; tgt.arz = 1.0 * w; tgt.wx = -0.4; tgt.bx = 0.1; }
      else if (s === 2) { tgt.arx = -3.0 * w; tgt.alx = -2.6 * w; tgt.bx = -0.3 * w; tgt.wx = 0.1; tgt.y = 0.08 * w; }
      else if (s === 3) { tgt.arx = -1.5; tgt.alx = -1.2; tgt.alz = 0.5; tgt.wx = 0; tgt.bx = 0.12; tgt.by = -0.25; }   // aim
      else if (s === 4) { tgt.arx = 0.9 * w; tgt.by = 0.5 * w; tgt.bx = -0.15; tgt.wx = -0.3; }                         // thrust wind
      else if (s === 5) { tgt.arx = -2.7 * w; tgt.arz = -0.5; tgt.by = 0.6 * w; tgt.bx = -0.2 * w; tgt.wx = 0.3; tgt.alx = -2.2 * w; } // heavy overhead
    } else if (a === 'strike' || a === 'hold') {
      s = st.sub || 0; e = a === 'hold' ? 1 : W.easeOut(k); K = a === 'hold' ? (st.snap ? 400 : 30) : 300;
      if (s === 0) { tgt.by = 1.0 - 2.1 * e; tgt.arx = -1.45; tgt.arz = -1.3 + 2.0 * e; tgt.wx = 0; tgt.bx = 0.3; tgt.lx = -0.5; tgt.rx = 0.4; }
      else if (s === 1) { tgt.by = -1.0 + 2.1 * e; tgt.arx = -1.45; tgt.arz = 1.0 - 2.0 * e; tgt.wx = 0; tgt.bx = 0.3; tgt.lx = 0.4; tgt.rx = -0.5; }
      else if (s === 2) { tgt.arx = -3.0 + 2.2 * e; tgt.alx = -2.6 + 2.0 * e; tgt.bx = -0.3 + 0.95 * e; tgt.wx = 0.2; tgt.y = -0.22 * e; tgt.lx = -0.7; tgt.rx = 0.6; }
      else if (s === 3) { tgt.arx = -1.5; tgt.alx = -1.2; tgt.alz = 0.5; tgt.wx = 0; tgt.bx = -0.06; tgt.by = -0.25; }
      else if (s === 4) { tgt.arx = -1.55; tgt.by = -0.5 * e; tgt.bx = 0.5 * e; tgt.wx = 0; tgt.lx = -0.8; tgt.rx = 0.5; }
      else if (s === 5) { tgt.arx = -2.7 + 2.3 * e; tgt.arz = -0.5 + 0.5 * e; tgt.by = 0.6 - 1.2 * e; tgt.bx = 0.75 * e; tgt.wx = 0.1; tgt.alx = -2.2 + 1.8 * e; tgt.y = -0.25 * e; tgt.lx = -0.8; tgt.rx = 0.5; }
    } else if (a === 'stun' || a === 'hurt') { tgt.bx = -0.4; tgt.alx = -0.5; tgt.arx = -0.5; tgt.alz = 0.8; tgt.arz = -0.8; tgt.hx = -0.4; tgt.roll = Math.sin(t * 30) * 0.05; }
    else if (a === 'dead') { tgt.bx = -1.45; tgt.y = -0.75; tgt.alz = 1.3; tgt.arz = -1.3; tgt.lx = 0.3; tgt.rx = -0.2; K = 9; }
    else if (a === 'vent') { tgt.bx = -0.25; tgt.alz = 1.2; tgt.arz = -1.2; tgt.alx = -0.3; tgt.arx = -0.3; tgt.y = -0.12; tgt.hx = -0.35; }
    else if (a === 'charge') { tgt.arx = -2.5 - Math.sin(t * 40) * 0.04; tgt.alx = -2.2; tgt.bx = -0.2; tgt.wx = 0.3; tgt.y = -0.1; }
    else if (a === 'talk') { tgt.alx = -0.6 + Math.sin(t * 3) * 0.15; tgt.alz = 0.3; tgt.hy = Math.sin(t * 1.3) * 0.2; }
    else if (a === 'kneel') { tgt.y = -0.4; tgt.bx = 0.6; tgt.lx = -1.0; tgt.rx = 0.6; tgt.arx = -1.0; tgt.alx = -1.0; }
    else if (a === 'guard') { tgt.alx = -1.35; tgt.alz = -0.35; tgt.arx = -0.2; tgt.bx = 0.12; }
    else if (a === 'bash') { tgt.alx = -1.5; tgt.alz = -0.3; tgt.bx = 0.5; tgt.lx = -0.8; tgt.rx = 0.6; K = 200; }
    else if (a === 'grab') { tgt.alx = -1.6; tgt.arx = -1.6; tgt.alz = 0.5; tgt.arz = -0.5; tgt.bx = 0.5; K = 60; }
    if (st.shield && a !== 'bash' && a !== 'dead' && a !== 'stun') { tgt.alx = -1.35; tgt.alz = -0.35; }
    damp(p.legL, 'x', tgt.lx, K, dt); damp(p.legR, 'x', tgt.rx, K, dt);
    damp(p.armL, 'x', tgt.alx, K, dt); damp(p.armR, 'x', tgt.arx, K, dt); damp(p.armL, 'z', tgt.alz, K, dt); damp(p.armR, 'z', tgt.arz, K, dt);
    damp(p.body, 'x', tgt.bx, K, dt); damp(p.body, 'y', tgt.by, K, dt); p.body.rotation.z = tgt.roll;
    damp(p.head, 'y', tgt.hy - p.body.rotation.y * 0.6, K, dt); damp(p.head, 'x', tgt.hx, K, dt);
    p.body.position.y = W.damp(p.body.position.y, 0.95 + tgt.y, K, dt);
    if (p.weapon) damp(p.weapon, 'x', tgt.wx, K, dt);
  };
})();
