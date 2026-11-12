// Wetware — audio: everything synthesised in WebAudio. Silent until "Enable sound" is clicked.
'use strict';
(function () {
  var A = W.audio = { on: false, ctx: null, intensity: 0, target: 0, track: 'none' };
  var ctx, master, sfxBus, musBus, noiseBuf, whine, whineGain, whineFilt;

  A.enable = function () {
    if (A.on) { A.on = false; if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); return; }
    if (!ctx) {
      try { ctx = A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      master = ctx.createGain(); master.gain.value = 0;
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
      master.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = 0.55; musBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      bed(); heatVoice();
      nextStep = ctx.currentTime + 0.1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    A.on = true; master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.1);
  };

  function env(g, t, a, d, v) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(f, dur, type, vol, f2, o) {
    o = o || {}; var t = ctx.currentTime + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type || 'sine'; osc.frequency.setValueAtTime(f, t); if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    env(g, t, o.a || 0.004, dur, vol);
    var out = g; if (o.lp) { var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; g.connect(fl); out = fl; }
    osc.connect(g); out.connect(o.bus || sfxBus); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, vol, type, f1, f2, o) {
    o = o || {}; var t = ctx.currentTime + (o.at || 0), src = ctx.createBufferSource(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    src.buffer = noiseBuf; src.loop = true; fl.type = type || 'bandpass'; fl.Q.value = o.q || 1; fl.frequency.setValueAtTime(f1, t); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    env(g, t, o.a || 0.003, dur, vol);
    src.connect(fl); fl.connect(g); g.connect(o.bus || sfxBus); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  var S = {
    swing: function (v) { noise(0.12, 0.25 * v, 'bandpass', 900, 2600, { q: 1.2 }); },
    swingHeavy: function (v) { noise(0.24, 0.3 * v, 'bandpass', 300, 1100, { q: 0.9 }); tone(90, 0.2, 'sine', 0.15 * v, 50); },
    hit: function (v) { noise(0.07, 0.5 * v, 'highpass', 1800); tone(190, 0.1, 'square', 0.22 * v, 70, { lp: 1400 }); tone(1300, 0.05, 'triangle', 0.12 * v, 500); },
    slam: function () { tone(110, 0.4, 'sine', 0.7, 32); noise(0.3, 0.5, 'lowpass', 900, 120); noise(0.1, 0.3, 'highpass', 3000); },
    rail: function () { tone(1800, 0.3, 'sawtooth', 0.25, 90, { lp: 5000 }); noise(0.25, 0.4, 'bandpass', 4000, 500, { q: 2 }); tone(70, 0.25, 'sine', 0.5, 35); },
    needle: function () { tone(1500 + Math.random() * 300, 0.05, 'square', 0.09, 500, { lp: 5000 }); noise(0.03, 0.14, 'highpass', 4000); },
    dash: function () { noise(0.2, 0.3, 'bandpass', 500, 3200, { q: 0.8 }); },
    vent: function (v) { v = v || 0.5; noise(0.9, 0.5 + v * 0.4, 'bandpass', 5200, 700, { q: 0.6 }); noise(0.35, 0.4, 'lowpass', 500, 90); tone(160, 0.3, 'sine', 0.35, 45); },
    steam: function () { noise(1.1, 0.35, 'bandpass', 4200, 1500, { q: 0.7 }); },
    hiss: function (v) { noise(0.7, 0.18 * (v || 1), 'highpass', 5000); },
    hurt: function () { tone(240, 0.22, 'sawtooth', 0.4, 60, { lp: 1200 }); noise(0.12, 0.4, 'bandpass', 700, 300); },
    kill: function () { noise(0.22, 0.4, 'bandpass', 1400, 200, { q: 0.8 }); tone(140, 0.2, 'triangle', 0.3, 45); },
    shock: function () { for (var i = 0; i < 4; i++) tone(900 + Math.random() * 2400, 0.04, 'square', 0.11, 300, { at: i * 0.028, lp: 6000 }); noise(0.14, 0.2, 'highpass', 5000); },
    clang: function () { tone(820, 0.16, 'square', 0.15, 760, { lp: 3000 }); tone(1340, 0.2, 'triangle', 0.14); noise(0.04, 0.3, 'highpass', 3000); },
    armor: function () { tone(520, 0.4, 'square', 0.2, 180, { lp: 2500 }); noise(0.3, 0.5, 'bandpass', 2400, 400); tone(80, 0.3, 'sine', 0.5, 36); },
    thud: function () { tone(100, 0.2, 'sine', 0.5, 40); noise(0.1, 0.3, 'lowpass', 600); },
    land: function (v) { tone(90, 0.12, 'sine', 0.3 * (v || 1), 45); },
    splash: function () { noise(0.4, 0.4, 'bandpass', 1800, 500, { q: 0.6 }); noise(0.2, 0.2, 'highpass', 4000, 6000, { at: 0.05 }); },
    splat: function () { noise(0.25, 0.35, 'bandpass', 700, 250, { q: 1.5 }); tone(200, 0.15, 'sine', 0.2, 90); },
    lob: function () { tone(260, 0.3, 'sine', 0.2, 620); noise(0.1, 0.2, 'bandpass', 500); },
    turret: function () { tone(420, 0.06, 'square', 0.14, 160, { lp: 2500 }); noise(0.04, 0.2, 'highpass', 3000); },
    heal: function (v) { tone(880, 0.12, 'sine', 0.1 * (v || 1), 1320); },
    tag: function () { tone(660, 0.08, 'square', 0.14, 990, { lp: 4000 }); tone(1320, 0.12, 'sine', 0.12, 0, { at: 0.07 }); },
    tagThrow: function () { noise(0.14, 0.2, 'bandpass', 1400, 3000); tone(500, 0.1, 'triangle', 0.1, 900); },
    hijack: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.09, 'square', 0.1, 0, { at: i * 0.05, lp: 4000 }); }); },
    redline: function () { tone(300, 0.5, 'sawtooth', 0.28, 1400, { lp: 3500 }); noise(0.4, 0.25, 'bandpass', 2000, 5000); },
    still: function () { tone(1200, 0.7, 'sine', 0.18, 300); tone(1800, 0.7, 'sine', 0.1, 450); },
    defy: function () { tone(110, 0.9, 'sawtooth', 0.4, 440, { lp: 2400 }); noise(0.6, 0.4, 'bandpass', 800, 3000); },
    emp: function () { tone(1600, 0.4, 'square', 0.16, 80, { lp: 5000 }); noise(0.35, 0.35, 'bandpass', 3000, 300); },
    charge: function () { tone(200, 0.5, 'sawtooth', 0.1, 700, { lp: 2400, a: 0.2 }); },
    lunge: function () { noise(0.22, 0.35, 'bandpass', 400, 1800, { q: 0.8 }); },
    blink: function () { tone(1900, 0.1, 'sine', 0.18, 500); noise(0.1, 0.2, 'highpass', 6000); },
    crash: function () { noise(0.5, 0.6, 'lowpass', 1600, 150); tone(70, 0.4, 'sine', 0.6, 30); noise(0.2, 0.3, 'highpass', 2500, 5000, { at: 0.03 }); },
    boom: function () { noise(0.9, 0.7, 'lowpass', 1200, 80); tone(60, 0.8, 'sine', 0.7, 25); },
    sweep: function () { noise(0.45, 0.5, 'bandpass', 200, 1400, { q: 0.7 }); tone(70, 0.4, 'sawtooth', 0.3, 40, { lp: 500 }); },
    tear: function () { noise(0.35, 0.6, 'bandpass', 2600, 400, { q: 2 }); tone(700, 0.3, 'sawtooth', 0.3, 90, { lp: 3000 }); },
    bossPhase: function () { tone(55, 1.2, 'sawtooth', 0.45, 110, { lp: 900 }); tone(82, 1.2, 'sawtooth', 0.3, 164, { lp: 900 }); noise(0.9, 0.3, 'bandpass', 300, 2400); },
    bossIntro: function () { [0, 0.28, 0.56].forEach(function (at, i) { tone([73, 73, 110][i], 0.5, 'sawtooth', 0.4, 0, { at: at, lp: 1200 }); tone([146, 146, 220][i], 0.5, 'square', 0.14, 0, { at: at, lp: 2000 }); }); noise(1.0, 0.25, 'lowpass', 400); },
    // tells: each enemy speaks before it strikes
    tellGrunt: function () { tone(150, 0.2, 'sawtooth', 0.16, 105, { lp: 900 }); },
    tellGrowl: function () { tone(95, 0.3, 'sawtooth', 0.2, 180, { lp: 700 }); tone(101, 0.3, 'sawtooth', 0.14, 190, { lp: 700 }); },
    tellWhine: function () { tone(900, 0.35, 'triangle', 0.1, 2000); },
    tellGulp: function () { tone(120, 0.3, 'sine', 0.3, 320); },
    tellClank: function () { tone(300, 0.07, 'square', 0.16, 0, { lp: 2000 }); tone(300, 0.07, 'square', 0.16, 0, { at: 0.14, lp: 2000 }); },
    tellShimmer: function () { tone(2400, 0.45, 'sine', 0.06, 3600); tone(3100, 0.45, 'sine', 0.05, 2000); },
    tellRatchet: function () { for (var i = 0; i < 6; i++) noise(0.03, 0.2, 'bandpass', 2200, 0, { at: i * 0.11, q: 4 }); },
    tellBeep: function () { tone(1400, 0.08, 'square', 0.1, 0, { lp: 5000 }); tone(1400, 0.08, 'square', 0.1, 0, { at: 0.2, lp: 5000 }); tone(1900, 0.14, 'square', 0.1, 0, { at: 0.4, lp: 5000 }); },
    tellServo: function () { tone(70, 0.7, 'sawtooth', 0.26, 190, { lp: 600, a: 0.1 }); noise(0.6, 0.12, 'bandpass', 900, 2000); },
    tellBuzz: function (v) { tone(60, 0.9, 'sawtooth', 0.2 * (v || 1), 62, { lp: 1800 }); tone(120, 0.9, 'square', 0.08 * (v || 1), 0, { lp: 2400 }); },
    tellMarrow: function () { tone(660, 0.12, 'triangle', 0.16, 440); noise(0.1, 0.12, 'highpass', 5000); },
    tellGrab: function () { tone(220, 0.6, 'sawtooth', 0.24, 660, { lp: 2200 }); tone(233, 0.6, 'sawtooth', 0.2, 700, { lp: 2200 }); },
    tellCast: function () { tone(330, 0.5, 'square', 0.1, 880, { lp: 2600, a: 0.15 }); },
    // interface and surgery
    comm: function () { tone(1040, 0.05, 'square', 0.07, 0, { lp: 3000 }); tone(1560, 0.07, 'square', 0.07, 0, { at: 0.06, lp: 3000 }); },
    pick: function () { tone(520, 0.07, 'triangle', 0.18, 780); },
    open: function () { noise(0.12, 0.12, 'bandpass', 1200, 2400); tone(330, 0.1, 'triangle', 0.1, 440); },
    click: function () { noise(0.02, 0.3, 'highpass', 3500); tone(1800, 0.02, 'square', 0.08); },
    deny: function () { tone(160, 0.14, 'square', 0.14, 120, { lp: 800 }); },
    lift: function () { noise(0.03, 0.3, 'highpass', 2500); tone(600, 0.08, 'triangle', 0.12, 300, { at: 0.02 }); noise(0.15, 0.1, 'highpass', 6000, 0, { at: 0.05 }); },
    install: function () { for (var i = 0; i < 4; i++) { noise(0.02, 0.35, 'highpass', 3000 + i * 400, 0, { at: i * 0.07 }); tone(1200 + i * 240, 0.03, 'square', 0.09, 0, { at: i * 0.07, lp: 5000 }); } noise(0.45, 0.28, 'highpass', 5500, 2500, { at: 0.3 }); tone(220, 0.3, 'sine', 0.2, 440, { at: 0.3 }); },
    buy: function () { tone(880, 0.06, 'square', 0.1, 0, { lp: 4000 }); tone(1320, 0.12, 'square', 0.1, 0, { at: 0.06, lp: 4000 }); },
    clear: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.5, 'triangle', 0.2, 0, { at: i * 0.09 }); }); noise(0.5, 0.12, 'highpass', 6000, 0, { at: 0.3 }); },
    door: function () { noise(0.5, 0.3, 'lowpass', 500, 180); tone(80, 0.45, 'sawtooth', 0.2, 55, { lp: 500 }); tone(880, 0.3, 'sine', 0.1, 0, { at: 0.35 }); },
    death: function () { tone(220, 1.4, 'sawtooth', 0.35, 40, { lp: 1200 }); noise(1.2, 0.3, 'lowpass', 800, 100); },
    win: function () { [262, 330, 392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.9, 'triangle', 0.2, 0, { at: i * 0.14 }); }); }
  };
  var lastAt = {};
  A.sfx = function (name, v) {
    if (!A.on || !ctx) return; var f = S[name]; if (!f) return;
    var now = ctx.currentTime; if (lastAt[name] && now - lastAt[name] < 0.035) return; lastAt[name] = now;
    try { f(v === undefined ? 1 : v); } catch (e) { /* audio must never break the game */ }
  };

  // ----- bed: rain and far city, never stops -----
  function bed() {
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400; var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7500;
    var g = ctx.createGain(); g.gain.value = 0.085; src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master); src.start();
    var src2 = ctx.createBufferSource(); src2.buffer = noiseBuf; src2.loop = true; src2.playbackRate.value = 0.5;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.5; var g2 = ctx.createGain(); g2.gain.value = 0.07; src2.connect(bp); bp.connect(g2); g2.connect(master); src2.start(0, 0.7);
    var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g2.gain); lfo.start();
    [55, 55.6, 82.2].forEach(function (f) { var o = ctx.createOscillator(), og = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 140; og.gain.value = 0.045; o.connect(fl); fl.connect(og); og.connect(master); o.start(); });
    A.rainGain = g;
  }
  function heatVoice() {
    whine = ctx.createOscillator(); whine.type = 'sawtooth'; whine.frequency.value = 300;
    whineFilt = ctx.createBiquadFilter(); whineFilt.type = 'bandpass'; whineFilt.Q.value = 6; whineFilt.frequency.value = 600;
    whineGain = ctx.createGain(); whineGain.gain.value = 0; whine.connect(whineFilt); whineFilt.connect(whineGain); whineGain.connect(master); whine.start();
  }
  A.setHeat = function (h, red) {
    if (!A.on || !ctx) return; var k = W.smooth(55, 100, h), t = ctx.currentTime;
    whine.frequency.setTargetAtTime(280 + k * 1300 + (red ? Math.sin(t * 30) * 60 : 0), t, 0.05); whineFilt.frequency.setTargetAtTime(500 + k * 2200, t, 0.05);
    whineGain.gain.setTargetAtTime(k * (red ? 0.085 : 0.05), t, 0.08);
  };

  // ----- dynamic score: a pulse per area that gains layers as the fight grows -----
  var TR = {
    sumps: { bpm: 98, root: 38, scale: [0, 1, 3, 5, 7, 8, 10], bass: [0, 0, 0, 0, 3, 0, 0, 1, 0, 0, 0, 0, 5, 0, 3, 1], arp: [0, 2, 4, 2, 5, 4, 2, 1], wave: 'sawtooth' },
    market: { bpm: 116, root: 45, scale: [0, 3, 5, 7, 10], bass: [0, 0, 2, 0, 0, 3, 0, 2, 0, 0, 2, 0, 4, 3, 2, 0], arp: [0, 2, 3, 4, 3, 2, 4, 1], wave: 'square' },
    boss1: { bpm: 124, root: 36, scale: [0, 1, 3, 6, 7, 8, 10], bass: [0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 4, 3, 1, 0], arp: [0, 3, 1, 4, 0, 3, 5, 4], wave: 'sawtooth', lead: [7, 0, 0, 6, 0, 0, 4, 0, 3, 0, 0, 4, 0, 0, 1, 0] },
    boss2: { bpm: 138, root: 40, scale: [0, 2, 3, 5, 7, 8, 11], bass: [0, 0, 0, 2, 0, 0, 4, 0, 0, 0, 0, 2, 0, 5, 4, 2], arp: [0, 2, 4, 6, 4, 2, 5, 3], wave: 'square', lead: [4, 0, 6, 0, 7, 0, 6, 4, 0, 0, 2, 0, 4, 0, 0, 0] },
    hub: { bpm: 66, root: 41, scale: [0, 2, 3, 7, 9], bass: [0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0], arp: [0, 2, 3, 4, 3, 2, 1, 2], wave: 'triangle', calm: true },
    roof: { bpm: 60, root: 43, scale: [0, 2, 4, 7, 9], bass: [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0], arp: [0, 2, 3, 4, 3, 4, 2, 1], wave: 'triangle', calm: true }
  };
  var step = 0, nextStep = 0;
  function mf(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function deg(tr, d, oct) { var s = tr.scale; return mf(tr.root + s[((d % s.length) + s.length) % s.length] + 12 * (Math.floor(d / s.length) + (oct || 0))); }
  A.setTrack = function (name) { if (A.track !== name) { A.track = name; step = 0; } };
  A.update = function (dt) {
    if (!A.on || !ctx) return;
    A.intensity = W.damp(A.intensity, A.target, A.target > A.intensity ? 1.2 : 0.7, dt);
    var tr = TR[A.track]; if (!tr) return;
    var spb = 60 / tr.bpm / 4, I = A.intensity;
    while (nextStep < ctx.currentTime + 0.12) {
      var at = Math.max(0, nextStep - ctx.currentTime), s = step % 16, bar = Math.floor(step / 16);
      var o = { at: at, bus: musBus };
      if (tr.calm) {
        if (s % 4 === 0) tone(deg(tr, tr.arp[(step / 4) % 8], 1), spb * 7, tr.wave, 0.06, 0, { at: at, bus: musBus, a: 0.05 });
        if (s === 0) { tone(deg(tr, 0, 0), spb * 15, 'sine', 0.12, 0, { at: at, bus: musBus, a: 0.3 }); tone(deg(tr, 2 + (bar % 2), 1), spb * 15, 'sine', 0.05, 0, { at: at, bus: musBus, a: 0.4 }); }
      } else {
        if (s === 0) tone(deg(tr, (bar % 4 === 3) ? 4 : 0, 1), spb * 15, 'triangle', 0.035 + I * 0.03, 0, { at: at, bus: musBus, a: 0.4, lp: 900 }); // pad: stays when the room is clear
        if (I > 0.08) {
          if (s % 2 === 0 || I > 0.6) { var b = tr.bass[s]; tone(deg(tr, b, 0), spb * 1.6, tr.wave, 0.16 * Math.min(1, I * 1.6), 0, { at: at, bus: musBus, lp: 300 + I * 900 }); }
          if (I > 0.25 && s % 4 === 0) { tone(120, 0.16, 'sine', 0.5 * I, 38, o); noise(0.02, 0.1 * I, 'highpass', 2000, 0, o); }
          if (I > 0.45 && s % 2 === 1) noise(0.03, 0.07 * I, 'highpass', 7000, 0, o);
          if (I > 0.55 && (s === 4 || s === 12)) noise(0.11, 0.2 * I, 'bandpass', 1800, 900, { at: at, bus: musBus, q: 0.8 });
          if (I > 0.7) tone(deg(tr, tr.arp[step % 8] + (bar % 2 ? 2 : 0), 2), spb * 0.9, 'square', 0.045 * I, 0, { at: at, bus: musBus, lp: 2600 });
          if (tr.lead && I > 0.5 && tr.lead[s]) tone(deg(tr, tr.lead[s], 2), spb * 2.6, 'sawtooth', 0.075, 0, { at: at, bus: musBus, lp: 2200, a: 0.02 });
        }
      }
      nextStep += spb; step++;
    }
  };
})();
