// game.js — "Airhorn Frenzy": a fast reaction/whack game on a 3x3 grid.
//
// Horns pop up; tap one before it retreats to score and blast the airhorn.
// Consecutive hits build a combo that raises the horn's pitch and the score
// multiplier. Missed (expired) horns drain the rep meter; lose at 0 rep, or
// ride the 30-second clock for the highest score. High score persists locally.

const ROUND_MS = 30000;
const START_REP = 100;
const MISS_PENALTY = 18;
const HIT_REP = 4;

export class FrenzyGame {
  constructor({ synth, style = 'classic', onState }) {
    this.synth = synth;
    this.style = style;
    this.onState = onState;
    this.reset();
  }

  reset() {
    this.running = false;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.rep = START_REP;
    this.timeLeft = ROUND_MS;
    this.cells = Array.from({ length: 9 }, () => ({ active: false, ttl: 0, flash: 0 }));
    this._spawnGap = 900;
    this._sinceSpawn = 0;
    this._last = 0;
    this._raf = null;
  }

  get highScore() {
    return Number(localStorage.getItem('airhorn.highscore') || 0);
  }
  set highScore(v) {
    localStorage.setItem('airhorn.highscore', String(v));
  }

  setStyle(style) { this.style = style; }

  start() {
    this.reset();
    this.running = true;
    this._last = performance.now();
    this._loop(this._last);
    this._emit();
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _emit(extra = {}) {
    this.onState && this.onState({
      running: this.running,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      rep: Math.max(0, this.rep),
      maxRep: START_REP,
      timeLeft: Math.max(0, this.timeLeft),
      cells: this.cells,
      highScore: this.highScore,
      ...extra,
    });
  }

  // Player tapped grid cell i.
  tap(i) {
    if (!this.running) return;
    const cell = this.cells[i];
    if (cell.active) {
      cell.active = false;
      cell.flash = 220;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const mult = 1 + Math.floor(this.combo / 3);
      this.score += 10 * mult;
      this.rep = Math.min(START_REP, this.rep + HIT_REP);
      this.synth.blast(this.style, { combo: this.combo });
    } else {
      // mis-tap on an empty cell breaks the combo (small skill cost)
      this.combo = 0;
    }
    this._emit();
  }

  _spawn() {
    const empty = [];
    this.cells.forEach((c, i) => { if (!c.active) empty.push(i); });
    if (!empty.length) return;
    const i = empty[Math.floor(Math.random() * empty.length)];
    // horns get faster as the round progresses
    const progress = 1 - this.timeLeft / ROUND_MS;
    const ttl = 1100 - progress * 600 + Math.random() * 300;
    this.cells[i].active = true;
    this.cells[i].ttl = ttl;
  }

  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(50, now - this._last);
    this._last = now;
    this.timeLeft -= dt;

    // decay flashes; expire active horns -> miss
    for (const cell of this.cells) {
      if (cell.flash > 0) cell.flash = Math.max(0, cell.flash - dt);
      if (cell.active) {
        cell.ttl -= dt;
        if (cell.ttl <= 0) {
          cell.active = false;
          this.combo = 0;
          this.rep -= MISS_PENALTY;
        }
      }
    }

    // spawn cadence ramps up over the round
    this._sinceSpawn += dt;
    const progress = 1 - this.timeLeft / ROUND_MS;
    const gap = 820 - progress * 420;
    if (this._sinceSpawn >= gap) {
      this._sinceSpawn = 0;
      this._spawn();
    }

    if (this.rep <= 0 || this.timeLeft <= 0) {
      this.running = false;
      const won = this.timeLeft <= 0;
      let isHigh = false;
      if (this.score > this.highScore) { this.highScore = this.score; isHigh = true; }
      this._emit({ over: true, won, isHigh });
      return;
    }

    this._emit();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }
}
