// Wetware — gfx: renderer, painterly shaders, ink post chain
// Rules of the medium (held everywhere):
//  line   : blue-black ink. Silhouettes = inverted hull, heavier on the shadow side; interior = 1px screen edges that break in full light.
//  tones  : matte takes 3 tones (shade / mid / lit), metal takes 4 (adds a hard specular block). Shade leans to the area shade colour, lit leans to the key.
//  brush  : paint mottle and dry-brush hatch sit on the surface (object or world space); a faint paper grain sits in screen space.
//  rim    : one hard-edged saturated band per area, on the side away from the key.
//  wet    : hard vertical lamp dashes in standing water, rain rings, a gloss block on wet cloth.
//  motion : handled in combat/fx (anticipation, smear, impact frame, held pose).
'use strict';
(function () {
  var G = W.gfx = {};
  var NL = 10;
  G.NL = NL;
  THREE.ColorManagement.enabled = false;

  G.init = function (canvas) {
    var r = G.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: false });
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.autoClear = false;
    r.setPixelRatio(1);
    G.scene = new THREE.Scene();
    G.fxScene = new THREE.Scene();
    G.camera = new THREE.PerspectiveCamera(19, 16 / 9, 12, 140);
    G.camera.layers.enable(0);
    G.lightCam = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 120);
    G.lightCam.layers.set(1);
    G.shadowRT = new THREE.WebGLRenderTarget(2048, 2048, { depthBuffer: true, depthTexture: new THREE.DepthTexture(2048, 2048) });
    G.shadowRT.texture.minFilter = G.shadowRT.texture.magFilter = THREE.NearestFilter;
    G.shadowRT.depthTexture.minFilter = G.shadowRT.depthTexture.magFilter = THREE.NearestFilter;
    G.shadowMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
    G.scale = W.params.res || 1; G.frameEMA = 14; G.lastScaleChange = 0;

    var lp = [], lc = [];
    for (var i = 0; i < NL; i++) { lp.push(new THREE.Vector4(0, 0, 0, 0)); lc.push(new THREE.Vector3(0, 0, 0)); }
    G.uni = {
      uTime: { value: 0 },
      uKeyDir: { value: new THREE.Vector3(0.45, -1, -0.38).normalize() },
      uKeyCol: { value: new THREE.Vector3(1.0, 0.98, 0.92) },
      uAmbCol: { value: new THREE.Vector3(0.62, 0.72, 0.74) },
      uShadeCol: { value: new THREE.Vector3(0.26, 0.36, 0.44) },
      uRimCol: { value: new THREE.Vector3(0.3, 0.9, 0.85) },
      uRimDir: { value: new THREE.Vector3(-0.45, 0.45, -0.75).normalize() },
      uCamPos: { value: new THREE.Vector3() },
      uWaterCol: { value: new THREE.Vector3(0.05, 0.13, 0.15) },
      uLightPos: { value: lp }, uLightCol: { value: lc },
      uShadowMap: { value: G.shadowRT.depthTexture },
      uShadowMat: { value: new THREE.Matrix4() },
      uBrush: { value: null },
      uPuddle: { value: 0.0 },
      uInk: { value: new THREE.Vector3(0.045, 0.05, 0.075) },
      uDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
      uAtlas: { value: null },
      uSurge: { value: 0 }
    };
    G.buildPost();
    G.resize();
    window.addEventListener('resize', G.resize);
  };

  // ---------- shared GLSL ----------
  var VERT = [
    'attribute vec3 aCol; attribute vec4 aMat;',
    'uniform float uTime, uSway, uThick; uniform vec3 uLag, uKeyDir; uniform mat4 uShadowMat;',
    'varying vec3 vW, vN, vCol, vL, vVN; varying vec4 vMat, vSh;',
    'void main(){',
    '  vec3 p = position; mat4 M = modelMatrix;',
    '#ifdef USE_INSTANCING',
    '  M = modelMatrix * instanceMatrix;',
    '#endif',
    '  if (uSway > 0.0) { float w = clamp(-p.y * uSway, 0.0, 1.0); w *= w;',
    '    p.x += sin(uTime*2.6 + p.y*3.0 + p.z*2.0) * 0.06 * w; p.z += cos(uTime*2.1 + p.x*3.0) * 0.05 * w; p += uLag * w; }',
    '  vec4 wp = M * vec4(p, 1.0);',
    '  vec3 wn = normalize(mat3(M) * normal);',
    '#ifdef HULL',
    '  wp.xyz += wn * uThick + uKeyDir * uThick * 0.5;',
    '#endif',
    '  vW = wp.xyz; vN = wn; vCol = aCol; vMat = aMat; vL = position;',
    '  vSh = uShadowMat * vec4(wp.xyz + wn * 0.07, 1.0);',
    '  vVN = normalize(mat3(viewMatrix) * wn);',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'
  ].join('\n');

  var FRAG_HEAD = [
    'precision highp float;',
    'layout(location = 1) out highp vec4 gAux;',
    '#define NL ' + NL,
    'uniform vec3 uKeyDir, uKeyCol, uShadeCol, uAmbCol, uRimCol, uRimDir, uCamPos, uWaterCol, uInk, uGlow;',
    'uniform vec4 uLightPos[NL]; uniform vec3 uLightCol[NL];',
    'uniform sampler2D uShadowMap, uBrush;',
    'uniform float uTime, uFlash, uCloak, uFade, uPuddle, uRimAmt, uSurge;',
    'varying vec3 vW, vN, vCol, vL, vVN; varying vec4 vMat, vSh;',
    'float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'float shadowAt(){',
    '  vec3 s = vSh.xyz / vSh.w * 0.5 + 0.5;',
    '  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;',
    '  float b = 0.0009; vec2 px = vec2(0.6/2048.0); float r = 0.0;',
    '  r += step(s.z - b, texture2D(uShadowMap, s.xy + px*vec2(-1.0,-1.0)).r);',
    '  r += step(s.z - b, texture2D(uShadowMap, s.xy + px*vec2( 1.0,-1.0)).r);',
    '  r += step(s.z - b, texture2D(uShadowMap, s.xy + px*vec2(-1.0, 1.0)).r);',
    '  r += step(s.z - b, texture2D(uShadowMap, s.xy + px*vec2( 1.0, 1.0)).r);',
    '  return smoothstep(0.3, 0.7, r*0.25);',
    '}',
    'float rainRing(vec2 p){',
    '  vec2 g = floor(p/1.3); vec2 f = p/1.3 - g; float h = hash21(g); float h2 = hash21(g+7.7);',
    '  vec2 c = vec2(0.35 + 0.3*h, 0.35 + 0.3*h2); float ph = fract(uTime*(0.55+0.5*h2) + h*9.0);',
    '  float d = length(f - c); float r = ph*0.33;',
    '  return smoothstep(0.035, 0.012, abs(d - r)) * (1.0 - ph) * step(0.25, h);',
    '}',
    'vec3 lampMirror(vec3 P, vec3 V, vec2 rip){',
    '  vec3 Nw = normalize(vec3(rip.x*0.05, 1.0, rip.y*0.05)); vec3 R = reflect(-V, Nw);',
    '  vec3 side = normalize(cross(R, vec3(0.0,1.0,0.0))); vec3 upv = cross(side, R); vec3 acc = vec3(0.0);',
    '  for (int i = 0; i < NL; i++){ float rad = uLightPos[i].w; if (rad <= 0.0) continue;',
    '    vec3 toL = uLightPos[i].xyz - P; float t = dot(toL, R); if (t < 0.0) continue;',
    '    vec3 c = toL - R*t; float ds = dot(c, side) + rip.x*0.35; float du = dot(c, upv);',
    '    float d = length(vec2(ds, du*0.16));',
    '    float g = 1.0 - smoothstep(0.34, 0.42, d); g *= step(0.3, rip.y*0.5+0.5 + (0.42-d)*1.2);',
    '    acc += uLightCol[i] * g * 0.75; }',
    '  return acc;',
    '}'
  ].join('\n');

  var FRAG_MAIN = [
    'void main(){',
    '  vec3 N = normalize(vN); vec3 V = normalize(uCamPos - vW);',
    '#ifdef DSIDE',
    '  if (!gl_FrontFacing) N = -N;',
    '#endif',
    '  float type = vMat.x; vec3 alb = vCol;',
    '#ifdef HULL',
    '  if (uFade > 0.0 && texture2D(uBrush, vL.xy*0.35 + vL.z*0.2).r < uFade) discard;',
    '  if (uCloak > 0.0 && texture2D(uBrush, gl_FragCoord.xy/380.0 + vec2(uTime*0.13, uTime*0.31)).g < 0.38 + uCloak*0.3) discard;',
    '  gl_FragColor = vec4(mix(uInk, vec3(1.0), uFlash*0.0), 1.0); gAux = vec4(0.5, 0.5, 0.0, 0.0); return;',
    '#endif',
    '#ifdef ENV',
    '  vec3 an = abs(N); vec2 buv = an.y > 0.6 ? vW.xz : (an.x > an.z ? vW.zy : vW.xy);',
    '  vec4 br = texture2D(uBrush, buv*0.11); vec4 br2 = texture2D(uBrush, buv*0.031 + 0.37);',
    '#else',
    '  vec2 buv = vL.xy*0.9 + vL.z*0.55; vec4 br = texture2D(uBrush, buv*0.45); vec4 br2 = br;',
    '  if (uFade > 0.0 && texture2D(uBrush, vL.xy*0.35 + vL.z*0.2).r < uFade) discard;',
    '  if (uCloak > 0.0 && texture2D(uBrush, gl_FragCoord.xy/380.0 + vec2(uTime*0.13, uTime*0.31)).g < 0.52 + uCloak*0.3) discard;',
    '#endif',
    '  float b = br.r - 0.5;',
    '  float sh = shadowAt();',
    '  float ndl = dot(N, -uKeyDir);',
    '  float k = ndl*0.5 + 0.5; k = min(k, mix(0.22, 1.0, sh)); k += b*0.2;',
    '  float tMid = smoothstep(0.37, 0.41, k); float tLit = smoothstep(0.69, 0.73, k);',
    '#ifdef ENV',
    '  alb *= 0.86 + 0.3*br2.r;',                                   // large paint mottle
    '  if (an.y < 0.5) { alb *= mix(0.55, 1.0, smoothstep(0.0, 2.6, vW.y + b*1.2));',  // grime climbs from the base of walls
    '    float drip = smoothstep(0.62, 0.7, texture2D(uBrush, vec2(buv.x*0.23, buv.y*0.02 + 0.5)).g); alb *= 1.0 - 0.28*drip; }',
    '  else { alb *= 0.92 + 0.16*smoothstep(0.45, 0.55, br2.r); }',
    '#else',
    '  alb *= mix(0.8, 1.04, smoothstep(0.0, 1.5, vW.y));',
    '#endif',
    '  vec3 c = mix(alb*uShadeCol, alb*uAmbCol, tMid); c = mix(c, alb*uKeyCol, tLit);',
    '  c *= mix(1.0, 0.7 + 0.55*br.g, (1.0 - tMid)*0.7);',           // dry-brush hatch lives in the shade tone
    '  vec3 lampAcc = vec3(0.0);',
    '  for (int i = 0; i < NL; i++){ float rad = uLightPos[i].w; if (rad <= 0.0) continue;',
    '    vec3 d = uLightPos[i].xyz - vW; float dist = length(d); float a = 1.0 - dist/rad; if (a <= 0.0) continue;',
    '    float nl = dot(N, d/dist)*0.5 + 0.5; float v = a*nl*1.25 + b*0.07;',
    '    float band = smoothstep(0.10, 0.13, v)*0.42 + smoothstep(0.40, 0.44, v)*0.58;',
    '    lampAcc += uLightCol[i]*band; }',
    '#ifdef ENV',
    '  c += (alb*0.55 + 0.2)*lampAcc;',
    '#else',
    '  c += (alb*0.7 + 0.05)*lampAcc;',
    '#endif',
    '  float bloom = 0.0;',
    '  if (type > 0.5 && type < 1.5) {',                              // metal: fourth tone, a hard specular block
    '    vec3 H = normalize(-uKeyDir + V); float sp = step(0.9, dot(N, H) + b*0.1) * sh;',
    '    c = mix(c, uKeyCol*0.95 + lampAcc*0.3, sp*0.75); c += lampAcc*alb*0.35*step(0.55, dot(N, V)+b*0.3); }',
    '  if (type > 2.5 && type < 3.5) {',                              // wet cloth: gloss block
    '    float gl = step(0.84, dot(N, normalize(V + vec3(0.0,1.0,0.0))) + b*0.22) * (0.3 + 0.7*sh);',
    '    c = mix(c, c*1.5 + uAmbCol*0.16 + lampAcc*0.25, gl*0.8); }',
    '#ifdef ENV',
    '  float wet = vMat.y;',
    '  if (an.y > 0.9) {',
    '    vec2 rip = texture2D(uBrush, vW.xz*0.07 + vec2(uTime*0.012, uTime*0.02)).rg*2.0 - 1.0;',
    '    float ring = rainRing(vW.xz);',
    '    if (wet > 0.5) {',
    '      vec3 wc = uWaterCol * (0.75 + 0.5*br2.r);',
    '      float streak = step(0.8, texture2D(uBrush, vW.xz*vec2(0.035, 0.2) + vec2(uTime*0.008, 0.0)).g);',
    '      wc += vec3(0.03, 0.07, 0.07)*streak;',
    '      wc *= mix(0.55, 1.0, sh);',
    '      wc += lampAcc*uWaterCol*1.6;',
    '      wc += lampMirror(vW, V, rip);',
    '      wc += ring*vec3(0.22, 0.34, 0.34);',
    '      if (uSurge > 0.0) { float z = step(0.86, texture2D(uBrush, vW.xz*0.09 + vec2(uTime*0.9, -uTime*0.7)).b + 0.1*sin(uTime*40.0)); wc = mix(wc, vec3(1.0, 0.95, 0.55), z*uSurge); wc += vec3(0.25,0.22,0.05)*uSurge; }',
    '      c = wc;',
    '    } else if (uPuddle > 0.0) {',
    '      float th = mix(0.74, 0.44, uPuddle); float pm = smoothstep(th, th + 0.012, texture2D(uBrush, vW.xz*0.023 + 0.13).r + br.r*0.05);',
    '      vec3 pc = mix(c*0.42, uWaterCol*1.9, 0.55) * mix(0.6, 1.0, sh) + lampAcc*uWaterCol*1.2 + lampMirror(vW, V, rip)*0.9 + ring*vec3(0.16, 0.22, 0.22);',
    '      float pe = smoothstep(th, th + 0.012, texture2D(uBrush, vW.xz*0.023 + 0.13 + vec2(0.0014, -0.0014)).r + br.r*0.05); pc += vec3(0.1, 0.14, 0.14)*(pm - pe);',
    '      c = mix(c, pc, pm);',
    '    }',
    '  }',
    '#else',
    '  float fr = 1.0 - max(dot(N, V), 0.0);',
    '  float rim = smoothstep(0.70, 0.73, fr + b*0.1) * smoothstep(0.1, 0.35, dot(N, uRimDir));',
    '  c = mix(c, uRimCol, rim*uRimAmt);',
    '  c += uGlow * (0.35*rim + 0.12);',
    '#endif',
    '  if (type > 1.5 && type < 2.5) { c = vCol*(1.0 + 0.35*vMat.z); bloom = vMat.z; }',
    '  c = mix(c, vec3(1.0, 1.0, 0.96), uFlash);',
    '  gl_FragColor = vec4(c, 1.0);',
    '  gAux = vec4(vVN.xy*0.5 + 0.5, vMat.w, bloom);',
    '}'
  ].join('\n');

  // opts: env, hull, sway, rim
  G.paintMat = function (opts) {
    opts = opts || {};
    var u = {};
    for (var k in G.uni) u[k] = G.uni[k];
    u.uSway = { value: opts.sway || 0 }; u.uLag = { value: new THREE.Vector3() };
    u.uThick = { value: opts.thick || 0.05 };
    u.uFlash = { value: 0 }; u.uCloak = { value: 0 }; u.uFade = { value: 0 };
    u.uRimAmt = { value: opts.rim === undefined ? 1 : opts.rim };
    u.uGlow = { value: new THREE.Vector3(0, 0, 0) };
    var defs = {};
    if (opts.env) defs.ENV = 1;
    if (opts.hull) defs.HULL = 1;
    if (opts.double) defs.DSIDE = 1;
    var m = new THREE.ShaderMaterial({
      uniforms: u, defines: defs, vertexShader: VERT, fragmentShader: FRAG_HEAD + '\n' + FRAG_MAIN,
      side: opts.hull ? THREE.BackSide : (opts.double ? THREE.DoubleSide : THREE.FrontSide)
    });
    return m;
  };
  // A character material set that shares per-character uniforms between body and hull.
  G.charMats = function (opts) {
    opts = opts || {};
    var body = G.paintMat({ sway: 0, rim: opts.rim });
    var hull = G.paintMat({ hull: true, thick: opts.thick || 0.055 });
    hull.uniforms.uFlash = body.uniforms.uFlash; hull.uniforms.uCloak = body.uniforms.uCloak; hull.uniforms.uFade = body.uniforms.uFade;
    return { body: body, hull: hull };
  };

  // Decals: painted quads from the atlas (posters, signs, stencils)
  G.decalMat = function () {
    var u = {};
    for (var k in G.uni) u[k] = G.uni[k];
    return new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: [
        'attribute vec4 aMat; uniform mat4 uShadowMat;',
        'varying vec2 vUv; varying vec3 vW, vVN, vN; varying vec4 vMat, vSh;',
        'void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vUv = uv; vMat = aMat; vN = normalize(mat3(modelMatrix)*normal);',
        '  vSh = uShadowMat * vec4(wp.xyz + vN*0.07, 1.0); vVN = normalize(mat3(viewMatrix)*vN); gl_Position = projectionMatrix * viewMatrix * wp; }'
      ].join('\n'),
      fragmentShader: [
        'precision highp float; layout(location = 1) out highp vec4 gAux;',
        '#define NL ' + NL,
        'uniform sampler2D uAtlas, uShadowMap, uBrush; uniform float uTime; uniform vec3 uShadeCol, uAmbCol, uKeyCol;',
        'uniform vec4 uLightPos[NL]; uniform vec3 uLightCol[NL];',
        'varying vec2 vUv; varying vec3 vW, vVN, vN; varying vec4 vMat, vSh;',
        'void main(){ vec4 t = texture2D(uAtlas, vUv); if (t.a < 0.5) discard;',
        '  vec3 s = vSh.xyz / vSh.w * 0.5 + 0.5; float sh = 1.0;',
        '  if (s.x > 0.0 && s.x < 1.0 && s.y > 0.0 && s.y < 1.0 && s.z < 1.0) sh = step(s.z - 0.0009, texture2D(uShadowMap, s.xy).r);',
        '  float emis = vMat.z; vec3 c;',
        '  if (emis > 0.0) { float fl = 0.86 + 0.14*step(0.12, fract(sin(floor(uTime*9.0 + vMat.w*40.0)*12.99)*43758.5)); c = t.rgb*(0.8 + 0.5*emis)*fl; }',
        '  else { c = t.rgb * mix(uShadeCol*1.15, uAmbCol, sh);',
        '    for (int i = 0; i < NL; i++){ float rad = uLightPos[i].w; if (rad <= 0.0) continue; vec3 d = uLightPos[i].xyz - vW; float dist = length(d); float a = 1.0 - dist/rad; if (a <= 0.0) continue;',
        '      float v = a*(dot(vN, d/dist)*0.5+0.5)*1.25; c += t.rgb*uLightCol[i]*(smoothstep(0.10,0.13,v)*0.42 + smoothstep(0.40,0.44,v)*0.58); } }',
        '  gl_FragColor = vec4(c, 1.0); gAux = vec4(vVN.xy*0.5+0.5, 0.31 + vMat.w*0.3, emis*dot(t.rgb, vec3(0.4))*0.9); }'
      ].join('\n'),
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });
  };

  // ---------- post chain ----------
  var FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  G.buildPost = function () {
    G.postScene = new THREE.Scene();
    G.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    G.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    G.quad.frustumCulled = false;
    G.postScene.add(G.quad);
    G.compMat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tAux: { value: null }, tDepth: { value: null }, uBrush: G.uni.uBrush, uRes: G.uni.uRes, uNear: { value: 12 }, uFar: { value: 140 }, uInk: G.uni.uInk, uTime: G.uni.uTime },
      vertexShader: FS_VERT, depthTest: false, depthWrite: false,
      fragmentShader: [
        'precision highp float; uniform sampler2D tColor, tAux, tDepth, uBrush; uniform vec2 uRes; uniform float uNear, uFar, uTime; uniform vec3 uInk; varying vec2 vUv;',
        'float lin(vec2 uv){ float z = texture2D(tDepth, uv).r*2.0 - 1.0; return 2.0*uNear*uFar/(uFar + uNear - z*(uFar - uNear)); }',
        'void main(){',
        '  vec2 px = 1.0/uRes; float s = max(1.0, uRes.y/1080.0);',
        '  vec4 c = texture2D(tColor, vUv); float d = lin(vUv);',
        '  vec2 o = px*s; vec2 ox = vec2(o.x, 0.0), oy = vec2(0.0, o.y);',
        '  float dl = lin(vUv - ox), dr = lin(vUv + ox), du = lin(vUv + oy), dd = lin(vUv - oy);',
        '  float e1 = max(abs(dl + dr - 2.0*d), abs(du + dd - 2.0*d));',
        '  float thin = smoothstep(0.05, 0.12, e1);',
        '  vec2 o2 = o*2.4; float dl2 = lin(vUv - vec2(o2.x,0.0)), dr2 = lin(vUv + vec2(o2.x,0.0)), du2 = lin(vUv + vec2(0.0,o2.y)), dd2 = lin(vUv - vec2(0.0,o2.y));',
        '  float e2 = max(abs(dl2 + dr2 - 2.0*d), abs(du2 + dd2 - 2.0*d));',
        '  float heavy = smoothstep(0.7, 1.3, e2);',
        '  vec4 al = texture2D(tAux, vUv - ox), ar = texture2D(tAux, vUv + ox), au = texture2D(tAux, vUv + oy), ad = texture2D(tAux, vUv - oy);',
        '  float ne = length(al.xy - ar.xy) + length(au.xy - ad.xy);',
        '  float ie = abs(al.z - ar.z) + abs(au.z - ad.z);',
        '  thin = max(thin, max(smoothstep(0.3, 0.55, ne), smoothstep(0.012, 0.04, ie)));',
        '  float lum = dot(c.rgb, vec3(0.3, 0.6, 0.1));',
        '  float wob = texture2D(uBrush, vUv*uRes/460.0).b;',
        '  thin *= mix(1.0, 0.25, smoothstep(0.5, 0.8, lum)) * (0.62 + 0.6*wob);',
        '  float ink = clamp(max(thin*0.9, heavy), 0.0, 1.0);',
        '  vec3 col = mix(c.rgb, uInk, ink);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    G.bloomExtract = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tAux: { value: null }, uPx: { value: new THREE.Vector2() } },
      vertexShader: FS_VERT, depthTest: false, depthWrite: false,
      fragmentShader: 'precision highp float; uniform sampler2D tColor, tAux; uniform vec2 uPx; varying vec2 vUv; void main(){ vec3 a = vec3(0.0); for (int i = 0; i < 4; i++){ vec2 o = vec2(float(i - (i/2)*2)*2.0 - 1.0, float(i/2)*2.0 - 1.0)*uPx; a += texture2D(tColor, vUv + o).rgb * texture2D(tAux, vUv + o).a; } gl_FragColor = vec4(a*0.25, 1.0); }'
    });
    G.blurMat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: FS_VERT, depthTest: false, depthWrite: false,
      fragmentShader: 'precision highp float; uniform sampler2D tColor; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 a = texture2D(tColor, vUv).rgb*0.2; a += (texture2D(tColor, vUv + uDir*1.4).rgb + texture2D(tColor, vUv - uDir*1.4).rgb)*0.17; a += (texture2D(tColor, vUv + uDir*3.3).rgb + texture2D(tColor, vUv - uDir*3.3).rgb)*0.13; a += (texture2D(tColor, vUv + uDir*5.2).rgb + texture2D(tColor, vUv - uDir*5.2).rgb)*0.07; a += (texture2D(tColor, vUv + uDir*7.1).rgb + texture2D(tColor, vUv - uDir*7.1).rgb)*0.03; gl_FragColor = vec4(a, 1.0); }'
    });
    G.finalMat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tBloom: { value: null }, uTime: G.uni.uTime, uRes: G.uni.uRes, uBrush: G.uni.uBrush, uFade: { value: 0 }, uFadeCol: { value: new THREE.Vector3(0.04, 0.05, 0.07) }, uPulse: { value: 0 }, uPulseCol: { value: new THREE.Vector3(1, 0.3, 0.1) }, uDesat: { value: 0 } },
      vertexShader: FS_VERT, depthTest: false, depthWrite: false,
      fragmentShader: [
        'precision highp float; uniform sampler2D tColor, tBloom, uBrush; uniform float uTime, uFade, uPulse, uDesat; uniform vec2 uRes; uniform vec3 uFadeCol, uPulseCol; varying vec2 vUv;',
        'float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }',
        'void main(){',
        '  vec3 c = texture2D(tColor, vUv).rgb; vec3 bl = texture2D(tBloom, vUv).rgb;',
        '  c += bl*0.9;',
        '  vec4 pap = texture2D(uBrush, vUv*uRes/900.0);',
        '  c *= 0.93 + 0.14*pap.r;',                                    // screen-space paper tooth
        '  float l = dot(c, vec3(0.3, 0.6, 0.1)); c = mix(c, vec3(l)*vec3(0.85, 1.0, 1.1), uDesat);',
        '  c = c*c*(3.0 - 2.0*c)*0.35 + c*0.68;',                        // gentle contrast curve
        '  vec2 q = vUv - 0.5; float v = dot(q, q);',
        '  c *= 1.0 - 0.55*smoothstep(0.16, 0.62, v);',
        '  c = mix(c, uPulseCol, uPulse*smoothstep(0.1, 0.55, v)*(0.6 + 0.4*pap.g));',
        '  c += (h(vUv*uRes + fract(uTime)*91.0) - 0.5)*0.03;',          // fine grain
        '  float fd = smoothstep(0.0, 1.0, uFade*1.6 - pap.g*0.6);',     // ink-wash transition
        '  c = mix(c, uFadeCol, fd);',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n')
    });
  };

  G.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(320, Math.floor(window.innerWidth * dpr)), h = Math.max(200, Math.floor(window.innerHeight * dpr));
    G.renderer.setSize(w, h, false);
    G.fullW = w; G.fullH = h;
    G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
    G.makeTargets();
  };
  G.makeTargets = function () {
    var w = Math.max(320, Math.floor(G.fullW * G.scale)), h = Math.max(180, Math.floor(G.fullH * G.scale));
    ['rtScene', 'rtComp', 'rtB0', 'rtB1'].forEach(function (k) { if (G[k]) { G[k].dispose(); } });
    var dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
    G.rtScene = new THREE.WebGLRenderTarget(w, h, { count: 2, depthBuffer: true, depthTexture: dt, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    G.rtScene.textures[1].minFilter = G.rtScene.textures[1].magFilter = THREE.NearestFilter;
    G.rtComp = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    var bw = Math.floor(w / 4), bh = Math.floor(h / 4);
    G.rtB0 = new THREE.WebGLRenderTarget(bw, bh, { depthBuffer: false });
    G.rtB1 = new THREE.WebGLRenderTarget(bw, bh, { depthBuffer: false });
    G.uni.uRes.value.set(w, h);
    G.uni.uDepth.value = G.rtScene.depthTexture;
    G.rw = w; G.rh = h;
  };

  // Fit the shadow camera to room bounds
  G.fitShadow = function (cx, cz, half) {
    var d = G.uni.uKeyDir.value;
    var lc = G.lightCam;
    lc.left = -half; lc.right = half; lc.top = half; lc.bottom = -half; lc.near = 1; lc.far = 140;
    lc.position.set(cx - d.x * 70, -d.y * 70, cz - d.z * 70);
    lc.lookAt(cx, 0, cz);
    lc.updateProjectionMatrix(); lc.updateMatrixWorld(true);
    G.uni.uShadowMat.value.multiplyMatrices(lc.projectionMatrix, lc.matrixWorldInverse);
  };

  // lights: array of {x,y,z,r,col:[r,g,b],k} — picks the NL most relevant near the focus
  G.setLights = function (list, fx, fz) {
    var arr = list;
    if (list.length > NL) {
      arr = list.slice().sort(function (a, b) {
        var da = (a.prio || 0) * -1000 + (a.x - fx) * (a.x - fx) + (a.z - fz) * (a.z - fz);
        var db = (b.prio || 0) * -1000 + (b.x - fx) * (b.x - fx) + (b.z - fz) * (b.z - fz);
        return da - db;
      });
    }
    var lp = G.uni.uLightPos.value, lc = G.uni.uLightCol.value;
    for (var i = 0; i < NL; i++) {
      var L = arr[i];
      if (L) { lp[i].set(L.x, L.y, L.z, L.r); var k = L.k === undefined ? 1 : L.k; lc[i].set(L.col[0] * k, L.col[1] * k, L.col[2] * k); }
      else lp[i].set(0, 0, 0, 0);
    }
  };

  G.render = function (dtMs) {
    var r = G.renderer;
    G.uni.uCamPos.value.copy(G.camera.position);
    // shadow depth
    r.setRenderTarget(G.shadowRT);
    r.clear(true, true, false);
    G.scene.overrideMaterial = G.shadowMat;
    r.render(G.scene, G.lightCam);
    G.scene.overrideMaterial = null;
    // scene → MRT
    r.setRenderTarget(G.rtScene);
    r.setClearColor(G.clearCol || 0x06090c, 1);
    r.clear(true, true, false);
    r.render(G.scene, G.camera);
    // ink composite
    G.compMat.uniforms.tColor.value = G.rtScene.textures[0];
    G.compMat.uniforms.tAux.value = G.rtScene.textures[1];
    G.compMat.uniforms.tDepth.value = G.rtScene.depthTexture;
    G.compMat.uniforms.uNear.value = G.camera.near; G.compMat.uniforms.uFar.value = G.camera.far;
    G.quad.material = G.compMat;
    r.setRenderTarget(G.rtComp);
    r.render(G.postScene, G.postCam);
    // ink & paint effects over the inked frame (manual depth test)
    r.render(G.fxScene, G.camera);
    // bloom on lamps only
    G.bloomExtract.uniforms.tColor.value = G.rtScene.textures[0];
    G.bloomExtract.uniforms.tAux.value = G.rtScene.textures[1];
    G.bloomExtract.uniforms.uPx.value.set(1 / G.rw, 1 / G.rh);
    G.quad.material = G.bloomExtract; r.setRenderTarget(G.rtB0); r.render(G.postScene, G.postCam);
    G.quad.material = G.blurMat;
    for (var i = 0; i < 2; i++) {
      var sp = i === 0 ? 1 : 2.2;
      G.blurMat.uniforms.tColor.value = G.rtB0.texture; G.blurMat.uniforms.uDir.value.set(sp / G.rtB0.width, 0);
      r.setRenderTarget(G.rtB1); r.render(G.postScene, G.postCam);
      G.blurMat.uniforms.tColor.value = G.rtB1.texture; G.blurMat.uniforms.uDir.value.set(0, sp / G.rtB0.height);
      r.setRenderTarget(G.rtB0); r.render(G.postScene, G.postCam);
    }
    G.finalMat.uniforms.tColor.value = G.rtComp.texture;
    G.finalMat.uniforms.tBloom.value = G.rtB0.texture;
    G.quad.material = G.finalMat;
    r.setRenderTarget(null);
    r.render(G.postScene, G.postCam);

    // adaptive internal resolution
    if (dtMs && !W.params.res) {
      G.frameEMA = G.frameEMA * 0.94 + Math.min(dtMs, 60) * 0.06;
      var now = performance.now();
      if (now - G.lastScaleChange > 1500) {
        if (G.frameEMA > 19.5 && G.scale > 0.5) { G.scale = Math.max(0.5, G.scale - 0.1); G.makeTargets(); G.lastScaleChange = now; G.frameEMA = 15; }
        else if (G.frameEMA < 12 && G.scale < 1 && now - G.lastScaleChange > 6000) { G.scale = Math.min(1, G.scale + 0.1); G.makeTargets(); G.lastScaleChange = now; }
      }
    }
  };

  // world → screen (css px)
  var _v = new THREE.Vector3();
  G.project = function (x, y, z) {
    _v.set(x, y, z).project(G.camera);
    return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight };
  };
  // mouse → ground plane (y = 0)
  var _ray = new THREE.Raycaster(), _m = new THREE.Vector2();
  G.groundPoint = function (mx, my) {
    _m.set(mx / window.innerWidth * 2 - 1, -(my / window.innerHeight) * 2 + 1);
    _ray.setFromCamera(_m, G.camera);
    var o = _ray.ray.origin, d = _ray.ray.direction;
    var t = (0.9 - o.y) / d.y; // aim plane at chest height keeps the aim honest at this pitch
    return { x: o.x + d.x * t, z: o.z + d.z * t };
  };
})();
