/**
 * Hype Rush — the game layer on top of the soundboard.
 *
 * A playhead ping-pongs across a track that speeds up over time. Tap the
 * airhorn while the playhead is inside the glowing target zone to score; the
 * tighter your timing, the bigger the combo (and the higher-pitched the horn).
 * Miss three times and it's over. All timing/scoring lives here; the UI just
 * reads the public state each frame and draws it.
 */

export type HitJudgement = 'perfect' | 'good' | 'miss';

export interface HypeRushState {
  running: boolean;
  /** Playhead position along the track, 0..1. */
  playhead: number;
  /** Centre of the current target zone, 0..1. */
  target: number;
  /** Half-width of the "good" band, 0..1. */
  band: number;
  /** Half-width of the inner "perfect" band, 0..1. */
  perfectBand: number;
  lives: number;
  score: number;
  combo: number;
  bestCombo: number;
  best: number;
}

export interface HypeRushHooks {
  onJudge: (j: HitJudgement, state: HypeRushState) => void;
  onGameOver: (state: HypeRushState) => void;
}

const BEST_KEY = 'airhorn-hero:best';
const MAX_LIVES = 3;

export class HypeRush {
  readonly state: HypeRushState = {
    running: false,
    playhead: 0,
    target: 0.5,
    band: 0.12,
    perfectBand: 0.045,
    lives: MAX_LIVES,
    score: 0,
    combo: 0,
    bestCombo: 0,
    best: loadBest(),
  };

  private dir = 1;
  private speed = 0.55; // track-widths per second
  private hooks: HypeRushHooks;
  // A seeded-ish sequence so target placement feels varied without Math.random
  // calls scattered through update; reseeded per game from performance time.
  private seed = 1;

  constructor(hooks: HypeRushHooks) {
    this.hooks = hooks;
  }

  start(seed: number): void {
    const s = this.state;
    s.running = true;
    s.lives = MAX_LIVES;
    s.score = 0;
    s.combo = 0;
    s.bestCombo = 0;
    s.playhead = 0;
    s.band = 0.12;
    s.perfectBand = 0.045;
    this.dir = 1;
    this.speed = 0.55;
    this.seed = (Math.floor(seed) % 2147483646) + 1;
    this.placeTarget();
  }

  stop(): void {
    this.state.running = false;
  }

  /** Advance the simulation by `dt` seconds. */
  update(dt: number): void {
    const s = this.state;
    if (!s.running) return;
    s.playhead += this.dir * this.speed * dt;
    if (s.playhead >= 1) {
      s.playhead = 1;
      this.dir = -1;
    } else if (s.playhead <= 0) {
      s.playhead = 0;
      this.dir = 1;
    }
  }

  /** Player tapped the airhorn. Returns the judgement so the UI can react. */
  tap(): HitJudgement {
    const s = this.state;
    if (!s.running) return 'miss';
    const dist = Math.abs(s.playhead - s.target);
    let j: HitJudgement;
    if (dist <= s.perfectBand) j = 'perfect';
    else if (dist <= s.band) j = 'good';
    else j = 'miss';

    if (j === 'miss') {
      s.combo = 0;
      s.lives -= 1;
    } else {
      s.combo += 1;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      const base = j === 'perfect' ? 100 : 45;
      const mult = 1 + Math.floor(s.combo / 5) * 0.5;
      s.score += Math.round(base * mult);
      // Ramp difficulty: faster sweep, tighter zones.
      this.speed = Math.min(2.6, this.speed + 0.06);
      s.band = Math.max(0.05, s.band - 0.004);
      s.perfectBand = Math.max(0.02, s.perfectBand - 0.0015);
      this.placeTarget();
    }

    this.hooks.onJudge(j, s);

    if (s.lives <= 0) {
      s.running = false;
      if (s.score > s.best) {
        s.best = s.score;
        saveBest(s.best);
      }
      this.hooks.onGameOver(s);
    }
    return j;
  }

  /** Pick a fresh target spot, biased away from the current playhead. */
  private placeTarget(): void {
    const s = this.state;
    const margin = s.band + 0.04;
    let pick = margin + this.rand() * (1 - 2 * margin);
    // Nudge it away from where the playhead is so it isn't a gimme.
    if (Math.abs(pick - s.playhead) < 0.25) {
      pick = pick > 0.5 ? pick - 0.25 : pick + 0.25;
      pick = Math.min(1 - margin, Math.max(margin, pick));
    }
    s.target = pick;
  }

  /** Small deterministic LCG so the sim doesn't depend on Math.random timing. */
  private rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* storage may be unavailable (private mode); scores just won't persist */
  }
}
