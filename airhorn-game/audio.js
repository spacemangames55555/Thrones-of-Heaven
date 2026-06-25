// audio.js — procedural airhorn synthesis with the Web Audio API.
//
// No sample files: every honk is generated live from oscillators, a soft-clip
// distortion stage, a low-pass and a master limiter. That keeps the whole app a
// few KB, works offline, and dodges sound-license headaches. The classic
// airhorn timbre comes from two detuned sawtooth "horn" tones stacked a musical
// interval apart, a quick pitch bend up at the onset (the "waaah"), light
// vibrato, and grit from the waveshaper.

const STYLES = {
  classic: {
    label: 'Classic',
    emoji: '📢',
    base: 392,            // G4
    partials: [1, 1.5, 2],// root, fifth, octave (musical horn stack)
    drive: 18,
    vibratoHz: 5,
    vibratoCents: 14,
    cutoff: 5200,
    bendCents: -120,      // start a bit flat, sweep up to pitch
    bendMs: 90,
    pattern: 'sustain',
  },
  mlg: {
    label: 'MLG',
    emoji: '🕶️',
    base: 523,            // C5, brighter
    partials: [1, 1.5, 2, 3],
    drive: 34,            // extra grit
    vibratoHz: 7,
    vibratoCents: 22,
    cutoff: 6800,
    bendCents: -180,
    bendMs: 70,
    pattern: 'sustain',
  },
  deep: {
    label: 'Deep',
    emoji: '🚢',
    base: 174,            // F3, big ship horn
    partials: [1, 1.5, 2],
    drive: 14,
    vibratoHz: 3.5,
    vibratoCents: 8,
    cutoff: 3200,
    bendCents: -90,
    bendMs: 140,
    pattern: 'sustain',
  },
  reggae: {
    label: 'Rave',
    emoji: '🔊',
    base: 440,
    partials: [1, 1.5, 2],
    drive: 22,
    vibratoHz: 6,
    vibratoCents: 16,
    cutoff: 5600,
    bendCents: -120,
    bendMs: 60,
    pattern: 'triple',    // the "bo-bo-bom" rave stab
  },
  vuvuzela: {
    label: 'Vuvu',
    emoji: '🎺',
    base: 233,            // Bb3 drone
    partials: [1, 2, 3, 4],
    drive: 26,
    vibratoHz: 4,
    vibratoCents: 6,
    cutoff: 4200,
    bendCents: -40,
    bendMs: 120,
    pattern: 'sustain',
  },
  siren: {
    label: 'Siren',
    emoji: '🚨',
    base: 520,
    partials: [1, 1.5],
    drive: 20,
    vibratoHz: 5,
    vibratoCents: 10,
    cutoff: 6000,
    bendCents: 0,
    bendMs: 10,
    pattern: 'siren',     // sweeps up & down
  },
};

function makeDistortionCurve(amount) {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    // soft-clip; tanh-like brashness without harsh aliasing
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

export class AirhornSynth {
  // opts.context lets tests inject an OfflineAudioContext; in the app it's
  // omitted and a live AudioContext is created lazily on first gesture.
  constructor(opts = {}) {
    this.ctx = null;
    this.master = null;
    this.curves = {};
    this.active = new Map(); // voiceId -> teardown fn
    this._id = 0;
    this._injected = opts.context || null;
  }

  // Must be called from inside a user gesture (pointerdown). iOS/Safari will
  // not start audio otherwise.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = this._injected || new AC();
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 8;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.18;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    if (this._injected) return true; // offline render context for tests
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx.state === 'running';
  }

  _curve(drive) {
    if (!this.curves[drive]) this.curves[drive] = makeDistortionCurve(drive);
    return this.curves[drive];
  }

  // Build one sustained horn voice. Returns { stop } where stop releases it.
  _voice(style, { freqScale = 1, gain = 0.5 } = {}) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const s = STYLES[style] || STYLES.classic;
    const base = s.base * freqScale;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gain, now + 0.018); // fast attack

    const shaper = ctx.createWaveShaper();
    shaper.curve = this._curve(s.drive);
    shaper.oversample = '4x';

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = s.cutoff;
    lp.Q.value = 0.7;

    env.connect(shaper);
    shaper.connect(lp);
    lp.connect(this.master);

    // Vibrato LFO feeding every oscillator's detune.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = s.vibratoHz;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = s.vibratoCents;
    lfo.connect(lfoGain);

    const oscs = [];
    s.partials.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : (mult % 1 === 0 ? 'sawtooth' : 'square');
      const f = base * mult;
      osc.frequency.value = f;
      // onset pitch bend up to pitch
      if (s.bendCents) {
        osc.detune.setValueAtTime(s.bendCents, now);
        osc.detune.linearRampToValueAtTime(0, now + s.bendMs / 1000);
      }
      lfoGain.connect(osc.detune);
      const og = ctx.createGain();
      og.gain.value = 1 / (i + 1.3); // higher partials quieter
      osc.connect(og);
      og.connect(env);
      osc.start(now);
      oscs.push(osc);
    });
    lfo.start(now);

    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      env.gain.cancelScheduledValues(t);
      env.gain.setValueAtTime(env.gain.value, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); // release
      const end = t + 0.16;
      oscs.forEach((o) => o.stop(end));
      lfo.stop(end);
    };

    return { stop, lp };
  }

  // One-shot or pattern blast. Returns a voiceId so callers can release a held
  // sustain early; pattern styles auto-stop.
  start(style) {
    if (!this.unlock()) return null;
    const s = STYLES[style] || STYLES.classic;
    const id = ++this._id;

    if (s.pattern === 'triple') {
      const ctx = this.ctx;
      const stops = [];
      [0, 0.16, 0.32].forEach((delay, i) => {
        setTimeout(() => {
          const v = this._voice(style, { gain: 0.5 });
          stops.push(v);
          setTimeout(() => v.stop(), i === 2 ? 360 : 120);
        }, delay * 1000);
      });
      this.active.set(id, () => stops.forEach((v) => v.stop()));
      setTimeout(() => this.active.delete(id), 900);
      return id;
    }

    if (s.pattern === 'siren') {
      const v = this._voice(style, { gain: 0.45 });
      // sweep the low-pass + pitch via detune over time on the fly
      const ctx = this.ctx;
      const osc = v; // we sweep cutoff for a wailing feel
      let dir = 1, base = STYLES.siren.cutoff;
      const iv = setInterval(() => {
        const t = ctx.currentTime;
        v.lp.frequency.cancelScheduledValues(t);
        v.lp.frequency.setValueAtTime(v.lp.frequency.value, t);
        v.lp.frequency.linearRampToValueAtTime(dir > 0 ? base * 1.6 : base * 0.6, t + 0.45);
        dir *= -1;
      }, 450);
      this.active.set(id, () => { clearInterval(iv); v.stop(); });
      return id;
    }

    // sustain (default): held until stop(id)
    const v = this._voice(style, { gain: 0.5 });
    this.active.set(id, () => v.stop());
    return id;
  }

  stop(id) {
    const teardown = this.active.get(id);
    if (teardown) {
      teardown();
      this.active.delete(id);
    }
  }

  // Convenience for the game: a quick scored honk whose pitch rises with combo.
  blast(style, { combo = 0 } = {}) {
    if (!this.unlock()) return;
    const freqScale = Math.pow(2, Math.min(combo, 12) / 12); // up to +1 octave
    const v = this._voice(style, { freqScale, gain: 0.5 });
    setTimeout(() => v.stop(), 260);
  }

  stopAll() {
    for (const teardown of this.active.values()) teardown();
    this.active.clear();
  }
}

export const STYLE_LIST = Object.keys(STYLES).map((id) => ({ id, ...STYLES[id] }));
export { STYLES };
