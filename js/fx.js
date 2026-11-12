// Wetware — fx: ink-and-paint effects (hard shapes, a few frames each), rain, ground tells, lettering
'use strict';
(function () {
  var F = W.fx = {};
  var K = F.K = { SLASH: 0, RING: 1, SPARK: 2, STEAM: 3, TCIRCLE: 4, TSECTOR: 5, TLINE: 6, POOL: 7, FLASH: 8, BEAM: 9, BOLT: 10, TRAIL: 11, MARK: 13, ZAP: 14, JET: 15, DISC: 16, SHARD: 17 };
  var pool = [], active = [], flatGeo, billGeo, baseMat;
  F.lights = []; F.shake = 0; F.shakeX = 0; F.shakeY = 0; F._active = active;

  var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var FRAG = [
    'precision highp float;',
    'uniform sampler2D uDepth, uBrush; uniform vec2 uRes; uniform float uTime;',
    'uniform int uKind; uniform float uT, uSeed, uFlat, uAlpha; uniform vec3 uCol, uCol2; uniform vec4 uP;',
    'varying vec2 vUv;',
    'float n1(float x){ return texture2D(uBrush, vec2(x*0.071 + uSeed*0.37, uSeed*0.61)).r; }',
    'float n2(vec2 p){ return texture2D(uBrush, p*0.13 + uSeed*vec2(0.31, 0.73)).g; }',
    'float eo(float t){ t = clamp(t, 0.0, 1.0); return 1.0 - (1.0-t)*(1.0-t)*(1.0-t); }',
    'void main(){',
    '  float dz = texture2D(uDepth, gl_FragCoord.xy / uRes).r; if (gl_FragCoord.z > dz + 0.00002) discard;',
    '  vec2 p = uFlat > 0.5 ? vec2(vUv.x*2.0 - 1.0, 1.0 - vUv.y*2.0) : vUv*2.0 - 1.0;',
    '  float r = length(p); float a = atan(p.x, p.y); vec3 c = uCol; float al = 0.0; float t = uT;',
    '  if (uKind == 0) {', // slash crescent: a smear that sweeps, thick at the leading edge
    '    float hw = uP.x, dir = uP.y; float lead = mix(-hw, hw, eo(t*2.6)); float trail = mix(-hw, hw, eo(t*1.25 - 0.4));',
    '    float aa = a*dir; float w = clamp((aa - trail)/max(lead - trail, 0.001), 0.0, 1.0);',
    '    float inwin = step(trail, aa)*step(aa, lead);',
    '    float jr = r + (n2(p*2.0) - 0.5)*0.07; float th = pow(w, 0.6)*uP.z;',
    '    float band = step(0.97 - th, jr)*step(jr, 0.97);',
    '    al = band*inwin*step(t*0.9, n2(p*3.0 + 2.0) + 0.25);',
    '    c = mix(uCol, vec3(1.0, 1.0, 0.95), step(0.45, w)*step(jr, 0.93)); c = mix(c, uCol2, step(0.955, jr)*0.0);',
    '  } else if (uKind == 1) {', // shock ring
    '    float rad = mix(uP.x, 0.92, eo(t)); float th = uP.y*(1.0 - t*0.8)*(0.55 + 0.9*n1(a*9.0));',
    '    float d = abs(r - rad); al = step(d, th); c = mix(uCol, vec3(1.0), step(d, th*0.4)*step(r, rad));',
    '    al *= step(t*1.05 - 0.35, n2(p*2.5));',
    '  } else if (uKind == 2) {', // paint spark / splat
    '    float sp = pow(n1(a*7.0 + 3.0), 2.4); float rad = (0.2 + 0.8*sp)*eo(t*3.5);',
    '    al = step(r, rad)*step(t*1.25 - 0.2, n2(p*2.2)*0.9 + r*0.25);',
    '    c = mix(vec3(1.0, 1.0, 0.94), uCol, step(rad*0.42, r));',
    '  } else if (uKind == 3) {', // steam puff: two tones, hard edge
    '    float b = 0.0; for (int i = 0; i < 5; i++){ float fi = float(i); vec2 o = vec2(sin(fi*2.4 + uSeed*9.0), cos(fi*1.7 + uSeed*5.0))*0.38; b = max(b, 1.0 - length(p - o)/(0.36 + 0.2*fract(uSeed*3.1 + fi*0.37))); }',
    '    float edge = b - t*0.75 - (n2(p*1.6) - 0.5)*0.35; al = step(0.12, edge)*uAlpha;',
    '    c = mix(uCol2, uCol, step(0.0, p.y + (n2(p*2.0) - 0.5)*0.8 + 0.1));',
    '  } else if (uKind == 4 || uKind == 5 || uKind == 6) {', // ground tells: dashed ink outline + a hatch fill that grows to the strike
    '    float inside, edge, prog;',
    '    if (uKind == 4) { inside = step(r, 1.0); edge = step(0.93, r)*inside; prog = step(r, t); edge *= step(0.3, fract(a*3.82 + uTime*0.6)); }',
    '    else if (uKind == 5) { float hw = uP.x; float rin = uP.z; inside = step(abs(a), hw)*step(r, 1.0)*step(rin, r); edge = inside*max(max(step(0.955, r), step(r, rin + 0.03)), step(hw - 0.035/max(r, 0.2), abs(a))); prog = step((r - rin)/(1.0 - rin), t); }',
    '    else { inside = step(abs(p.x), 1.0)*step(abs(p.y), 1.0); float w = uP.x; edge = inside*max(step(1.0 - w, abs(p.x)), step(0.985, abs(p.y))); prog = step(p.y*0.5 + 0.5, t); }',
    '    float hatch = step(0.5, fract((p.x + p.y)*uP.y + uTime*0.5));',
    '    float fill = inside*prog;',
    '    al = max(edge*0.95, fill*(0.2 + 0.36*hatch));',
    '    c = mix(uCol, vec3(1.0, 1.0, 0.92), uP.w*0.6);',
    '    al = max(al, inside*uP.w*0.5);',
    '  } else if (uKind == 7) {', // acid / toxin pool
    '    float rad = (0.72 + 0.26*n1(a*5.0))*min(1.0, uP.x); float ins = step(r, rad);',
    '    vec2 g = fract(p*3.0 + uSeed) - 0.5; float bub = step(abs(length(g) - 0.25*fract(uTime*0.7 + floor(p.x*3.0 + uSeed)*0.37)), 0.035);',
    '    c = mix(uCol, uCol2, max(step(rad - 0.09, r), bub)); al = ins*0.88;',
    '  } else if (uKind == 8) {', // muzzle / impact star
    '    float s = (1.0 - t); float star = step(abs(p.x*p.y), 0.035*s)*step(r, 0.98*s + 0.1); float core = step(r, 0.34*s);',
    '    al = max(star, core); c = mix(uCol, vec3(1.0), core);',
    '  } else if (uKind == 9) {', // beam
    '    float w = uP.x*(1.0 - t*t) + (n2(vec2(p.y*4.0, uSeed)) - 0.5)*0.12; float ax = abs(p.x);',
    '    al = step(ax, w)*step(abs(p.y), 0.995); c = mix(uCol, vec3(1.0), step(ax, w*0.45));',
    '  } else if (uKind == 10) {', // lightning bolt
    '    float x0 = (n1(p.y*5.0 + floor(uTime*18.0)*3.3) - 0.5)*1.5*(1.0 - p.y*p.y);',
    '    float d = abs(p.x - x0); al = step(d, 0.2*(1.0 - t))*step(abs(p.y), 0.99); c = mix(uCol, vec3(1.0), step(d, 0.08*(1.0 - t)));',
    '  } else if (uKind == 11) {', // dash smear
    '    float l = p.y*0.5 + 0.5; float w = pow(l, 0.7)*0.9; al = step(abs(p.x), w*(0.55 + 0.45*n1(p.x*6.0)))*step(t*1.2 - 0.1, l*0.7 + n2(p*3.0)*0.5);',
    '    c = mix(uCol2, uCol, step(0.5, n2(p*vec2(6.0, 1.0))));',
    '  } else if (uKind == 13) {', // reticle mark
    '    float ring = step(abs(r - 0.7), 0.07); float aa = a + uTime*1.4; float tick = step(abs(fract(aa/1.5708) - 0.5), 0.07)*step(0.45, r)*step(r, 0.98);',
    '    al = max(ring*step(0.25, fract(aa/1.5708 + 0.25)), tick);',
    '  } else if (uKind == 14) {', // live current zigzags
    '    float z = abs(fract(p.x*uP.x + n2(vec2(p.y*2.0, floor(uTime*14.0)))*0.9) - 0.5); float ins = step(r, 1.0);',
    '    al = ins*max(step(z, 0.06), 0.25*uP.w); c = mix(uCol, vec3(1.0), step(z, 0.03));',
    '  } else if (uKind == 15) {', // steam jet
    '    float l = p.y*0.5 + 0.5; float w = (0.35 + 0.5*l)*(0.75 + 0.45*n2(vec2(p.x*1.5, l*3.0 - uTime*2.4)));',
    '    al = step(abs(p.x), w)*step(l, min(1.0, uP.x))*step(0.02, l)*uAlpha; c = mix(uCol2, uCol, step(abs(p.x), w*0.5 + (n2(vec2(l*5.0 - uTime*3.0, p.x)) - 0.5)*0.5));',
    '    c = mix(c, vec3(1.0, 0.29, 0.15), step(w*0.86, abs(p.x)));',
    '  } else if (uKind == 16) {', // plain inked disc
    '    al = step(r, 1.0)*uAlpha; c = mix(uCol, uCol2, step(0.86, r));',
    '  } else if (uKind == 17) {', // shard (debris / rain of paint)
    '    al = step(abs(p.x) + abs(p.y)*0.5, 0.7*(1.0 - t)); c = uCol;',
    '  }',
    '  if (al < 0.02) discard;',
    '  gl_FragColor = vec4(c, al);',
    '}'
  ].join('\n');

  F.init = function () {
    var G = W.gfx;
    flatGeo = new THREE.PlaneGeometry(2, 2); flatGeo.rotateX(-Math.PI / 2);
    billGeo = new THREE.PlaneGeometry(2, 2);
    baseMat = function () {
      return new THREE.ShaderMaterial({
        uniforms: { uDepth: G.uni.uDepth, uBrush: G.uni.uBrush, uRes: G.uni.uRes, uTime: G.uni.uTime, uKind: { value: 0 }, uT: { value: 0 }, uSeed: { value: 0 }, uFlat: { value: 1 }, uAlpha: { value: 1 }, uCol: { value: new THREE.Color(1, 1, 1) }, uCol2: { value: new THREE.Color(0.05, 0.05, 0.08) }, uP: { value: new THREE.Vector4() } },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide
      });
    };
    F.initRain();
    F.initText();
  };

  function get() {
    var h = pool.pop();
    if (!h) {
      if (active.length > 220) { for (var i = 0; i < active.length; i++) if (!active[i].manual) { h = active.splice(i, 1)[0]; break; } }
      if (!h) { var m = new THREE.Mesh(flatGeo, baseMat()); m.frustumCulled = false; h = { mesh: m, u: m.material.uniforms }; W.gfx.fxScene.add(m); }
    }
    h.mesh.visible = true; return h;
  }
  // o: x,y,z, sx,sz (half extents) or s, rot, col, col2, dur, p:[4], bill, manual, vx,vy,vz, grow, order
  F.spawn = function (kind, o) {
    var h = get(), m = h.mesh, u = h.u;
    h.kind = kind; h.t = 0; h.dur = o.dur || 0.2; h.manual = !!o.manual; h.vx = o.vx || 0; h.vy = o.vy || 0; h.vz = o.vz || 0; h.grow = o.grow || 0; h.dead = false; h.follow = o.follow || null; h.delay = o.delay || 0;
    m.geometry = o.bill ? billGeo : flatGeo;
    m.position.set(o.x, o.y === undefined ? 0.06 : o.y, o.z);
    var sx = o.sx || o.s || 1, sz = o.sz || o.s || 1;
    m.rotation.set(0, 0, 0);
    if (o.bill) { m.quaternion.copy(W.gfx.camera.quaternion); m.scale.set(sx, sz, 1); if (o.rot) m.rotateZ(o.rot); }
    else { m.rotation.y = o.rot || 0; m.scale.set(sx, 1, sz); }
    h.sx = sx; h.sz = sz; h.bill = !!o.bill;
    m.renderOrder = o.order || (kind >= 4 && kind <= 7 ? 1 : 5);
    u.uKind.value = kind; u.uT.value = 0; u.uSeed.value = W.fxr(); u.uFlat.value = o.bill ? 0 : 1; u.uAlpha.value = o.alpha === undefined ? 1 : o.alpha;
    u.uCol.value.set(o.col === undefined ? 0xffffff : o.col); u.uCol2.value.set(o.col2 === undefined ? 0x0c0e14 : o.col2);
    var p = o.p || [0, 0, 0, 0]; u.uP.value.set(p[0] || 0, p[1] || 0, p[2] || 0, p[3] || 0);
    if (h.delay > 0) m.visible = false;
    active.push(h); return h;
  };
  F.kill = function (h) { if (h) h.dead = true; };
  F.update = function (dt) {
    for (var i = active.length - 1; i >= 0; i--) {
      var h = active[i], m = h.mesh;
      if (h.delay > 0) { h.delay -= dt; if (h.delay <= 0) m.visible = true; else continue; }
      if (!h.manual) { h.t += dt / h.dur; h.u.uT.value = h.t; if (h.t >= 1) h.dead = true; }
      if (h.follow) { m.position.x = h.follow.x; m.position.z = h.follow.z; }
      m.position.x += h.vx * dt; m.position.y += h.vy * dt; m.position.z += h.vz * dt;
      if (h.grow) { var g = 1 + h.grow * h.t; if (h.bill) m.scale.set(h.sx * g, h.sz * g, 1); else m.scale.set(h.sx * g, 1, h.sz * g); }
      if (h.dead) { m.visible = false; active.splice(i, 1); pool.push(h); }
    }
    for (i = F.lights.length - 1; i >= 0; i--) { var L = F.lights[i]; L.t += dt; L.k = L.k0 * Math.max(0, 1 - L.t / L.dur); if (L.t >= L.dur) F.lights.splice(i, 1); }
    F.shake = Math.max(0, F.shake - dt * 2.2);
    var s = F.shake * F.shake; F.shakeX = (W.fxr() - 0.5) * s * 0.9; F.shakeY = (W.fxr() - 0.5) * s * 0.9;
    F.updateText(dt);
  };
  F.clear = function () { active.forEach(function (h) { h.dead = true; h.manual = false; h.t = 2; }); F.lights.length = 0; };
  F.flashLight = function (x, y, z, col, k, dur, r) { F.lights.push({ x: x, y: y, z: z, r: r || 7, col: col, k: k, k0: k, t: 0, dur: dur || 0.12, prio: 1 }); };
  F.addShake = function (a) { F.shake = Math.min(0.75, Math.max(F.shake, a)); };

  // ----- composite helpers -----
  var _c = new THREE.Color();
  function rgb(hex) { _c.set(hex); return [_c.r, _c.g, _c.b]; }
  F.hitSpark = function (x, y, z, col, big) {
    var s = big ? 1.5 : 0.95;
    F.spawn(K.SPARK, { x: x, y: y, z: z, s: s, bill: true, col: col, dur: 0.16, rot: W.fxr() * 6.28 });
    F.spawn(K.FLASH, { x: x, y: y, z: z, s: s * 1.2, bill: true, col: col, dur: 0.07, rot: W.fxr() * 1.5 });
    for (var i = 0; i < (big ? 6 : 3); i++) { var a = W.fxr() * 6.28, sp = 5 + W.fxr() * 7; F.spawn(K.SHARD, { x: x, y: y, z: z, sx: 0.07 + W.fxr() * 0.08, sz: 0.2 + W.fxr() * 0.2, bill: true, rot: a, col: i % 2 ? col : 0xfff8e0, dur: 0.22 + W.fxr() * 0.12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 2, vz: Math.sin(a) * sp * 0.4 }); }
    F.flashLight(x, y + 0.5, z, rgb(col), big ? 1.6 : 0.9, 0.1, big ? 8 : 5);
  };
  F.steamBurst = function (x, z, n, rad, col) {
    for (var i = 0; i < n; i++) { var a = i / n * 6.28 + W.fxr() * 0.5, d = rad * (0.4 + W.fxr() * 0.6); F.spawn(K.STEAM, { x: x + Math.cos(a) * d * 0.4, y: 0.6 + W.fxr() * 0.6, z: z + Math.sin(a) * d * 0.4, s: 0.55 + W.fxr() * 0.6, bill: true, alpha: 0.9, col: col || 0xe8f0ec, col2: 0x8aa0a4, dur: 0.5 + W.fxr() * 0.5, vx: Math.cos(a) * d * 1.6, vz: Math.sin(a) * d * 1.6, vy: 0.8 + W.fxr(), grow: 0.8, rot: W.fxr() * 6 }); }
  };
  F.splash = function (x, z, s) {
    F.spawn(K.RING, { x: x, y: -0.1, z: z, s: s || 1.1, col: 0xbfe8e4, dur: 0.4, p: [0.2, 0.09] });
    for (var i = 0; i < 4; i++) { var a = W.fxr() * 6.28; F.spawn(K.SHARD, { x: x, y: 0.1, z: z, sx: 0.06, sz: 0.22, bill: true, col: 0xcfeeea, dur: 0.3, vx: Math.cos(a) * 2.5, vy: 4 + W.fxr() * 3, vz: Math.sin(a) * 2.5 }); }
  };

  // ----- rain: two layers of painted streaks + ground ticks -----
  F.initRain = function () {
    var G = W.gfx;
    function layer(n, len, wid, speed, alpha, box) {
      var g = new THREE.InstancedBufferGeometry(), base = new THREE.PlaneGeometry(1, 1);
      g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
      var off = new Float32Array(n * 4);
      for (var i = 0; i < n; i++) { off[i * 4] = W.fxr() * box[0]; off[i * 4 + 1] = W.fxr() * box[1]; off[i * 4 + 2] = W.fxr() * box[2]; off[i * 4 + 3] = W.fxr(); }
      g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4)); g.instanceCount = n;
      var m = new THREE.ShaderMaterial({
        uniforms: { uDepth: G.uni.uDepth, uRes: G.uni.uRes, uTime: G.uni.uTime, uLightPos: G.uni.uLightPos, uLightCol: G.uni.uLightCol, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(box[0], box[1], box[2]) }, uLen: { value: len }, uWid: { value: wid }, uSpeed: { value: speed }, uAlpha: { value: alpha }, uCol: { value: new THREE.Vector3(0.62, 0.78, 0.8) }, uK: { value: 1 } },
        vertexShader: [
          '#define NL ' + G.NL, 'attribute vec4 aOff; uniform float uTime, uLen, uWid, uSpeed, uK; uniform vec3 uCenter, uBox; uniform vec4 uLightPos[NL]; uniform vec3 uLightCol[NL];',
          'varying vec2 vUv; varying vec3 vTint; varying float vK;',
          'void main(){ vUv = uv; vec3 fall = normalize(vec3(0.22, -1.0, 0.1));',
          '  vec3 q = aOff.xyz + fall*uTime*uSpeed*(0.75 + 0.5*aOff.w); q = mod(q, uBox) - uBox*0.5; vec3 wp = uCenter + q; wp.y += uBox.y*0.5;',
          '  vec3 right = normalize(cross(fall, normalize(cameraPosition - wp)));',
          '  wp += fall*position.y*uLen*(0.6 + 0.8*aOff.w) + right*position.x*uWid;',
          '  vec3 tint = vec3(0.0); for (int i = 0; i < NL; i++){ float rad = uLightPos[i].w; if (rad <= 0.0) continue; float a = max(0.0, 1.0 - distance(wp, uLightPos[i].xyz)/(rad*0.8)); tint += uLightCol[i]*a; }',
          '  vTint = tint; vK = step(aOff.w, uK);',
          '  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }'
        ].join('\n'),
        fragmentShader: [
          'precision highp float; uniform sampler2D uDepth; uniform vec2 uRes; uniform float uAlpha; uniform vec3 uCol; varying vec2 vUv; varying vec3 vTint; varying float vK;',
          'void main(){ float dz = texture2D(uDepth, gl_FragCoord.xy/uRes).r; if (gl_FragCoord.z > dz) discard;',
          '  float tp = 1.0 - abs(vUv.y*2.0 - 1.0); float a = step(abs(vUv.x*2.0 - 1.0), tp*1.4)*vK; if (a < 0.5) discard;',
          '  vec3 c = uCol*0.75 + vTint*0.9; gl_FragColor = vec4(c, uAlpha*(0.55 + min(1.0, dot(vTint, vec3(0.5))))); }'
        ].join('\n'), transparent: true, depthTest: false, depthWrite: false
      });
      var mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 8; G.fxScene.add(mesh); return mesh;
    }
    F.rainFar = layer(900, 1.5, 0.028, 26, 0.5, [48, 18, 36]);
    F.rainNear = layer(110, 3.6, 0.07, 36, 0.62, [44, 16, 30]);
    // ground ticks
    var n = 260, g = new THREE.InstancedBufferGeometry(), base = new THREE.PlaneGeometry(1, 1); base.rotateX(-Math.PI / 2);
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    var off = new Float32Array(n * 4); for (var i = 0; i < n; i++) { off[i * 4] = W.fxr() * 44; off[i * 4 + 1] = W.fxr(); off[i * 4 + 2] = W.fxr() * 30; off[i * 4 + 3] = W.fxr(); }
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4)); g.instanceCount = n;
    var tm = new THREE.ShaderMaterial({
      uniforms: { uDepth: G.uni.uDepth, uRes: G.uni.uRes, uTime: G.uni.uTime, uCenter: { value: new THREE.Vector3() }, uK: { value: 1 } },
      vertexShader: 'attribute vec4 aOff; uniform float uTime, uK; uniform vec3 uCenter; varying vec2 vUv; varying float vPh; void main(){ vUv = uv; float cyc = uTime*(1.6 + aOff.w) + aOff.y*7.0; vPh = fract(cyc); float id = floor(cyc); vec2 jit = fract(sin(vec2(id*12.9 + aOff.w*90.0, id*78.2 + aOff.y*40.0))*43758.5)*vec2(44.0, 30.0); vec3 q = vec3(mod(aOff.x + jit.x - uCenter.x, 44.0) - 22.0, 0.0, mod(aOff.z + jit.y - uCenter.z, 30.0) - 15.0); vec3 wp = vec3(uCenter.x + q.x, 0.03, uCenter.z + q.z) + position*(0.25 + 0.5*vPh); if (aOff.w > uK) wp.y = -50.0; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }',
      fragmentShader: 'precision highp float; uniform sampler2D uDepth; uniform vec2 uRes; varying vec2 vUv; varying float vPh; void main(){ float dz = texture2D(uDepth, gl_FragCoord.xy/uRes).r; if (gl_FragCoord.z > dz + 0.00003) discard; vec2 p = vUv*2.0 - 1.0; float r = length(p); float a = step(abs(r - 0.8), 0.14)*step(vPh, 0.55)*step(0.2, abs(p.x)); if (a < 0.5) discard; gl_FragColor = vec4(0.72, 0.86, 0.86, 0.55*(1.0 - vPh)); }',
      transparent: true, depthTest: false, depthWrite: false
    });
    F.rainTicks = new THREE.Mesh(g, tm); F.rainTicks.frustumCulled = false; F.rainTicks.renderOrder = 2; G.fxScene.add(F.rainTicks);
  };
  F.setRain = function (cx, cz, k, warm) {
    [F.rainFar, F.rainNear, F.rainTicks].forEach(function (m) { m.material.uniforms.uCenter.value.set(cx, 0, cz); m.material.uniforms.uK.value = k; });
    if (warm) { F.rainFar.material.uniforms.uCol.value.set(1.0, 0.8, 0.7); F.rainNear.material.uniforms.uCol.value.set(1.0, 0.8, 0.7); }
    else { F.rainFar.material.uniforms.uCol.value.set(0.62, 0.78, 0.8); F.rainNear.material.uniforms.uCol.value.set(0.7, 0.86, 0.88); }
  };

  // ----- lettering (DOM, pooled) -----
  var texts = [], tpool = [], layer;
  F.initText = function () { layer = document.getElementById('floaters'); };
  F.text = function (x, y, z, str, cls, dur) {
    if (!layer) return;
    var el = tpool.pop(); if (!el) { el = document.createElement('div'); layer.appendChild(el); }
    el.className = 'floater ' + (cls || ''); el.textContent = str; el.style.display = 'block';
    texts.push({ el: el, x: x + (W.fxr() - 0.5) * 0.5, y: y, z: z, t: 0, dur: dur || 0.7, rise: cls && cls.indexOf('call') >= 0 ? 0.6 : 1.6 });
    if (texts.length > 28) { var o = texts.shift(); o.el.style.display = 'none'; tpool.push(o.el); }
  };
  F.updateText = function (dt) {
    for (var i = texts.length - 1; i >= 0; i--) {
      var t = texts[i]; t.t += dt; var k = t.t / t.dur;
      if (k >= 1) { t.el.style.display = 'none'; tpool.push(t.el); texts.splice(i, 1); continue; }
      var p = W.gfx.project(t.x, t.y + W.easeOut(k) * t.rise, t.z);
      var pop = k < 0.12 ? 0.6 + k / 0.12 * 0.6 : 1.2 - Math.min(0.2, (k - 0.12) * 1.2);
      t.el.style.transform = 'translate(' + (p.x | 0) + 'px,' + (p.y | 0) + 'px) translate(-50%,-50%) scale(' + pop.toFixed(2) + ') rotate(-4deg)';
      t.el.style.opacity = k > 0.75 ? (1 - (k - 0.75) * 4).toFixed(2) : '1';
    }
  };
})();
