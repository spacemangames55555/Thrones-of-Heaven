/**
 * AirhornEngine — a self-contained airhorn synthesizer built on the Web Audio
 * API. No samples, no network, no copyright: every blast is generated live, so
 * the app works fully offline and ships nothing but math.
 *
 * The sound is a classic two-tone air horn: a stack of detuned sawtooth voices
 * (a root plus a fifth and octave) pushed through a distortion waveshaper and a
 * resonant low-pass, with a fast upward pitch "honk" at the attack and a gentle
 * vibrato so it wavers like the real thing. A short generated reverb tail gives
 * it room.
 *
 * Mobile browsers (iOS Safari especially) start the AudioContext "suspended"
 * and only let it run inside a user gesture — call unlock() from the first
 * touch/click, which we do in the UI layer.
 */

export interface BlastOptions {
  /** Root frequency in Hz. Default 233 (~Bb3), the meaty classic-horn pitch. */
  freq?: number;
  /** Length of the sustained body, in seconds (before the release tail). */
  duration?: number;
  /** Distortion amount, 0..1. Higher = more rasp/MLG. Default 0.55. */
  drive?: number;
  /** Peak loudness, 0..1. Default 0.9. */
  gain?: number;
  /** Extra detune spread in cents for thickness. Default 14. */
  spread?: number;
  /** Portamento: start this many semitones below freq and glide up. Default 5. */
  glide?: number;
}

const A = AudioContext as typeof AudioContext | undefined;

export class AirhornEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private shaperCurves = new Map<number, Float32Array<ArrayBuffer>>();
  /** Active hold voice, if the user is pressing-and-holding a pad. */
  private holdStop: ((release?: number) => void) | null = null;

  /** Whether audio is usable at all (some embedded webviews block it). */
  get available(): boolean {
    return !!A;
  }

  /** Must be called from inside a user gesture before the first sound. */
  async unlock(): Promise<void> {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore — will retry on next gesture */
      }
    }
  }

  private ensure(): void {
    if (this.ctx || !A) return;
    const ctx = new A();
    const master = ctx.createGain();
    master.gain.value = 0.9;

    // A small algorithmic reverb so blasts have a bit of space without a sample.
    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(ctx, 0.6, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.18;

    master.connect(ctx.destination);
    master.connect(reverb);
    reverb.connect(wet);
    wet.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
  }

  /** Fire a one-shot blast. Returns roughly how long it will ring, in ms. */
  blast(opts: BlastOptions = {}): number {
    this.ensure();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return 0;
    if (ctx.state === 'suspended') void ctx.resume();

    const duration = opts.duration ?? 0.6;
    const release = 0.18;
    const stop = this.voice(opts, master, ctx.currentTime);
    stop(duration);
    return (duration + release) * 1000;
  }

  /** Begin a sustained blast that rings until endHold() (for press-and-hold). */
  startHold(opts: BlastOptions = {}): void {
    this.ensure();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.holdStop?.(0.05);
    this.holdStop = this.voice({ ...opts, duration: Infinity }, master, ctx.currentTime);
  }

  endHold(): void {
    this.holdStop?.();
    this.holdStop = null;
  }

  /**
   * Build one airhorn voice and return a function that schedules its stop. If
   * called with a finite duration the body holds for that long; otherwise it
   * sustains until the returned stop() is invoked.
   */
  private voice(
    opts: BlastOptions,
    out: GainNode,
    t0: number,
  ): (hold?: number) => void {
    const ctx = this.ctx!;
    const freq = opts.freq ?? 233;
    const drive = opts.drive ?? 0.55;
    const peak = opts.gain ?? 0.9;
    const spread = opts.spread ?? 14;
    const glide = opts.glide ?? 5;

    // Signal path: voices -> envelope gain -> distortion -> low-pass -> out.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.curve(drive);
    shaper.oversample = '4x';

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3600;
    lp.Q.value = 0.9;

    env.connect(shaper);
    shaper.connect(lp);
    lp.connect(out);

    // Vibrato LFO -> detune of every oscillator, for the wavering honk.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 9; // cents
    lfo.connect(lfoGain);

    // Two-tone stack: root, fifth, octave — each doubled and detuned.
    const partials = [
      { mult: 1, level: 1.0 },
      { mult: 1.5, level: 0.7 },
      { mult: 2.0, level: 0.45 },
    ];
    const startFreqRatio = Math.pow(2, -glide / 12);
    const oscs: OscillatorNode[] = [];

    for (const p of partials) {
      for (const d of [-spread, spread]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        const target = freq * p.mult;
        // Fast upward pitch "honk" into the target note.
        osc.frequency.setValueAtTime(target * startFreqRatio, t0);
        osc.frequency.exponentialRampToValueAtTime(target, t0 + 0.07);
        osc.detune.setValueAtTime(d, t0);
        lfoGain.connect(osc.detune);

        const g = ctx.createGain();
        g.gain.value = (p.level * 0.5) / partials.length;
        osc.connect(g);
        g.connect(env);
        oscs.push(osc);
      }
    }

    // A tiny noise chiff at the very start for the "air" of the horn.
    const noise = this.noiseBurst(ctx, t0, peak * 0.25);
    if (noise) noise.connect(env);

    // Amplitude attack — punchy but not clicky.
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);

    for (const o of oscs) o.start(t0);
    lfo.start(t0);

    let stopped = false;
    // stop(hold): release the voice. A finite `hold` holds the body for that
    // many seconds from the note's start, then releases; `undefined` releases
    // immediately (used by press-and-hold release).
    const stop = (hold?: number) => {
      if (stopped) return;
      stopped = true;
      const now = Math.max(ctx.currentTime, t0);
      const releaseStart =
        hold === undefined ? now : Math.max(now, t0 + hold);
      const end = releaseStart + 0.18;
      env.gain.cancelScheduledValues(now);
      env.gain.setValueAtTime(Math.max(env.gain.value, 0.0001), now);
      env.gain.setValueAtTime(peak, releaseStart);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      const hardStop = end + 0.05;
      for (const o of oscs) o.stop(hardStop);
      lfo.stop(hardStop);
    };
    return stop;
  }

  /** tanh-style distortion curve; `amount` 0..1 scales the drive. */
  private curve(amount: number): Float32Array<ArrayBuffer> {
    const key = Math.round(amount * 100);
    const cached = this.shaperCurves.get(key);
    if (cached) return cached;
    const n = 1024;
    const curve = new Float32Array(n);
    const k = 1 + amount * 40;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    this.shaperCurves.set(key, curve);
    return curve;
  }

  private noiseBurst(ctx: AudioContext, t0: number, level: number): AudioNode | null {
    const len = Math.floor(ctx.sampleRate * 0.05);
    if (len <= 0) return null;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const fade = 1 - i / len;
      data[i] = (Math.random() * 2 - 1) * fade * fade;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = level;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    src.connect(hp);
    hp.connect(g);
    src.start(t0);
    src.stop(t0 + 0.06);
    return g;
  }

  /** Generate a short, smooth impulse response for the reverb tail. */
  private makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(seconds * rate));
    const impulse = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return impulse;
  }
}
