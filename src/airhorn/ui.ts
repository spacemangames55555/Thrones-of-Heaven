/**
 * The app shell: builds the DOM, wires the soundboard pads and the Hype Rush
 * game to the audio engine, and runs the render loop that draws the game on a
 * canvas. Deliberately framework-free — fast to boot and trivial to wrap in a
 * native webview.
 */
import './styles.css';
import { AirhornEngine } from './audio';
import { HypeRush, type HitJudgement, type HypeRushState } from './game';
import { HERO_PAD, PADS, hypeBlast, type Pad } from './presets';

type ViewName = 'board' | 'game';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

export class App {
  private engine = new AirhornEngine();
  private game: HypeRush;

  private flash!: HTMLDivElement;
  private hypeEl!: HTMLSpanElement;
  private bestEl!: HTMLDivElement;
  private viewBoard!: HTMLElement;
  private viewGame!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private hudScore!: HTMLElement;
  private hudCombo!: HTMLElement;
  private hudLives!: HTMLElement;
  private judgeEl!: HTMLElement;
  private overlay!: HTMLDivElement;

  private view: ViewName = 'board';
  private hype = 0;
  private hypeExpires = 0;
  private particles: Particle[] = [];
  private lastT = 0;
  private nowMs = 0;
  private unlocked = false;

  constructor(root: HTMLElement) {
    this.game = new HypeRush({
      onJudge: (j, s) => this.onJudge(j, s),
      onGameOver: (s) => this.onGameOver(s),
    });
    this.build(root);
    this.loop(0);
  }

  // ---- DOM construction ---------------------------------------------------

  private build(root: HTMLElement): void {
    root.innerHTML = '';

    this.flash = el('div', 'flash');
    root.appendChild(this.flash);

    const top = el('header', 'topbar');
    const brand = el('div', 'brand');
    brand.innerHTML = `AIRHORN<span>HERO</span>`;
    this.bestEl = el('div', 'best');
    this.bestEl.textContent = `BEST ${this.game.state.best}`;
    top.append(brand, this.bestEl);
    root.appendChild(top);

    // --- Soundboard view ---
    this.viewBoard = el('section', 'view board');

    const heroWrap = el('div', 'hero-wrap');
    const hero = el('button', 'hero-pad') as HTMLButtonElement;
    hero.style.setProperty('--accent', HERO_PAD.color);
    hero.innerHTML =
      `<span class="hero-emoji">${HERO_PAD.emoji}</span>` +
      `<span class="hero-label">${HERO_PAD.label}</span>`;
    this.hypeEl = el('span', 'hype') as HTMLSpanElement;
    hero.appendChild(this.hypeEl);
    this.bindHold(hero, HERO_PAD);
    heroWrap.appendChild(hero);

    const pads = el('div', 'pads');
    for (const pad of PADS) {
      const b = el('button', 'pad') as HTMLButtonElement;
      b.style.setProperty('--accent', pad.color);
      b.innerHTML =
        `<span class="pad-emoji">${pad.emoji}</span>` +
        `<span class="pad-label">${pad.label}</span>`;
      this.bindTap(b, pad);
      pads.appendChild(b);
    }

    const hint = el('div', 'hint');
    hint.textContent = 'Tap pads to blast • hold the big horn to sustain';

    const play = el('button', 'play-btn') as HTMLButtonElement;
    play.textContent = '▶  PLAY HYPE RUSH';
    play.addEventListener('click', () => this.startGame());

    this.viewBoard.append(heroWrap, pads, hint, play);

    // --- Game view ---
    this.viewGame = el('section', 'view game hidden');
    const hud = el('div', 'hud');
    const scoreBox = el('div', 'hud-box');
    scoreBox.innerHTML = `SCORE`;
    this.hudScore = el('b', '');
    this.hudScore.textContent = '0';
    scoreBox.appendChild(this.hudScore);
    this.hudCombo = el('div', 'hud-combo');
    this.hudLives = el('div', 'hud-lives');
    hud.append(scoreBox, this.hudCombo, this.hudLives);

    this.canvas = el('canvas', 'track') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    const tap = el('button', 'tap-zone') as HTMLButtonElement;
    tap.innerHTML =
      `<span class="tap-emoji">${HERO_PAD.emoji}</span>` +
      `<span class="tap-text">TAP ON TARGET</span>`;
    tap.style.setProperty('--accent', HERO_PAD.color);
    this.bindGameTap(tap);

    this.judgeEl = el('div', 'judge');

    const quit = el('button', 'quit') as HTMLButtonElement;
    quit.textContent = '✕';
    quit.addEventListener('click', () => this.showBoard());

    this.viewGame.append(hud, this.canvas, tap, this.judgeEl, quit);

    // --- Game over overlay ---
    this.overlay = el('div', 'overlay hidden') as HTMLDivElement;

    root.append(this.viewBoard, this.viewGame, this.overlay);

    // First touch anywhere unlocks audio (required by mobile browsers).
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      void this.engine.unlock();
    };
    root.addEventListener('pointerdown', unlock, { capture: true });

    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  // ---- Input bindings -----------------------------------------------------

  /** One-shot blast on press (variant pads + replays a pattern if present). */
  private bindTap(node: HTMLElement, pad: Pad): void {
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      void this.engine.unlock();
      this.firePad(pad);
      this.bump(node);
    });
  }

  /** Press-and-hold to sustain the horn; quick taps still stab. */
  private bindHold(node: HTMLElement, pad: Pad): void {
    let holding = false;
    const down = (e: PointerEvent) => {
      e.preventDefault();
      void this.engine.unlock();
      holding = true;
      this.addHype();
      const opts = hypeBlast(pad.blast, this.hype);
      this.engine.startHold(opts);
      this.shockwave(node, pad.color);
      this.doFlash(pad.color);
      this.haptic(20);
      node.classList.add('active');
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        /* not all elements support capture */
      }
    };
    const up = () => {
      if (!holding) return;
      holding = false;
      this.engine.endHold();
      node.classList.remove('active');
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('lostpointercapture', up);
  }

  private bindGameTap(node: HTMLElement): void {
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      void this.engine.unlock();
      if (!this.game.state.running) return;
      const j = this.game.tap();
      this.bump(node);
      this.spawnBurst(j);
    });
  }

  private firePad(pad: Pad): void {
    this.doFlash(pad.color);
    this.haptic(25);
    const fire = (opts = pad.blast) => this.engine.blast(opts);
    if (pad.pattern && pad.pattern.length) {
      for (const offset of pad.pattern) {
        window.setTimeout(() => fire(), Math.round(offset * 1000));
      }
    } else {
      fire();
    }
  }

  // ---- Hype (rapid-tap combo on the soundboard) ---------------------------

  private addHype(): void {
    if (this.nowMs > this.hypeExpires) this.hype = 0;
    this.hype = Math.min(12, this.hype + 1);
    this.hypeExpires = this.nowMs + 900;
    this.hypeEl.textContent = this.hype > 1 ? `HYPE x${this.hype}` : '';
    this.hypeEl.classList.toggle('show', this.hype > 1);
  }

  // ---- Game flow ----------------------------------------------------------

  private startGame(): void {
    void this.engine.unlock();
    this.hideOverlay();
    this.showView('game');
    this.resizeCanvas();
    this.game.start(this.nowMs + 1);
    this.updateHud();
  }

  private showBoard(): void {
    this.game.stop();
    this.hideOverlay();
    this.showView('board');
  }

  private onJudge(j: HitJudgement, s: HypeRushState): void {
    this.updateHud();
    if (j === 'miss') {
      this.judge('MISS', '#ff453a');
      this.haptic([30, 40, 30]);
      this.doFlash('#ff453a', 0.25);
      return;
    }
    const hype = Math.min(12, s.combo);
    this.engine.blast(hypeBlast(HERO_PAD.blast, hype));
    this.haptic(j === 'perfect' ? 35 : 20);
    if (j === 'perfect') {
      this.judge('PERFECT!', '#30d158');
      this.doFlash('#30d158', 0.3);
    } else {
      this.judge('GOOD', '#ffd60a');
    }
  }

  private onGameOver(s: HypeRushState): void {
    this.doFlash('#ff453a', 0.4);
    this.haptic([60, 60, 120]);
    const isRecord = s.score >= s.best && s.score > 0;
    this.overlay.innerHTML = '';
    const card = el('div', 'card');
    const title = el('h2', '');
    title.textContent = isRecord ? '🏆 NEW BEST!' : 'GAME OVER';
    const score = el('div', 'big-score');
    score.textContent = String(s.score);
    const sub = el('div', 'sub');
    sub.textContent = `Best combo x${s.bestCombo} • Best score ${s.best}`;
    const again = el('button', 'play-btn') as HTMLButtonElement;
    again.textContent = '↻  PLAY AGAIN';
    again.addEventListener('click', () => this.startGame());
    const back = el('button', 'ghost-btn') as HTMLButtonElement;
    back.textContent = 'SOUNDBOARD';
    back.addEventListener('click', () => this.showBoard());
    card.append(title, score, sub, again, back);
    this.overlay.appendChild(card);
    this.overlay.classList.remove('hidden');
    this.bestEl.textContent = `BEST ${s.best}`;
  }

  private updateHud(): void {
    const s = this.game.state;
    this.hudScore.textContent = String(s.score);
    const mult = 1 + Math.floor(s.combo / 5) * 0.5;
    this.hudCombo.textContent = s.combo > 0 ? `x${s.combo}  ·  ${mult.toFixed(1)}×` : '';
    this.hudLives.textContent = '❤️'.repeat(Math.max(0, s.lives));
  }

  // ---- View switching -----------------------------------------------------

  private showView(v: ViewName): void {
    this.view = v;
    this.viewBoard.classList.toggle('hidden', v !== 'board');
    this.viewGame.classList.toggle('hidden', v !== 'game');
    // The game view has its own ✕ in the top-right; hide the best label there
    // so the two don't overlap.
    this.bestEl.style.visibility = v === 'game' ? 'hidden' : 'visible';
  }

  private hideOverlay(): void {
    this.overlay.classList.add('hidden');
  }

  // ---- Render loop --------------------------------------------------------

  private loop(t: number): void {
    requestAnimationFrame((n) => this.loop(n));
    this.nowMs = t;
    const dt = this.lastT ? Math.min(0.05, (t - this.lastT) / 1000) : 0;
    this.lastT = t;

    // Decay hype display on the soundboard.
    if (this.hype > 1 && t > this.hypeExpires) {
      this.hype = 0;
      this.hypeEl.classList.remove('show');
      this.hypeEl.textContent = '';
    }

    if (this.view === 'game') {
      this.game.update(dt);
      this.drawGame(dt);
    }
  }

  private resizeCanvas(): void {
    const c = this.canvas;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(rect.width * dpr));
    c.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private drawGame(dt: number): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const s = this.game.state;
    const padX = 22;
    const trackW = W - padX * 2;
    const midY = H * 0.5;
    const trackH = Math.min(54, H * 0.34);
    const toX = (p: number) => padX + p * trackW;

    // Track base.
    roundRect(ctx, padX, midY - trackH / 2, trackW, trackH, trackH / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Target zone (good band + inner perfect band).
    const gx = toX(s.target - s.band);
    const gw = s.band * 2 * trackW;
    roundRect(ctx, gx, midY - trackH / 2, gw, trackH, trackH / 2);
    ctx.fillStyle = 'rgba(48,209,88,0.22)';
    ctx.fill();
    const px = toX(s.target - s.perfectBand);
    const pw = s.perfectBand * 2 * trackW;
    roundRect(ctx, px, midY - trackH / 2, pw, trackH, Math.min(trackH / 2, pw / 2));
    ctx.fillStyle = 'rgba(48,209,88,0.55)';
    ctx.fill();

    // Centre line of the target.
    ctx.strokeStyle = 'rgba(48,209,88,0.9)';
    ctx.lineWidth = 2;
    line(ctx, toX(s.target), midY - trackH / 2 - 8, toX(s.target), midY + trackH / 2 + 8);

    // Playhead.
    const phx = toX(s.playhead);
    ctx.save();
    ctx.shadowColor = HERO_PAD.color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    line(ctx, phx, midY - trackH / 2 - 14, phx, midY + trackH / 2 + 14);
    ctx.fillStyle = HERO_PAD.color;
    ctx.beginPath();
    ctx.arc(phx, midY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawParticles(ctx, dt);
  }

  private spawnBurst(j: HitJudgement): void {
    const rect = this.canvas.getBoundingClientRect();
    const s = this.game.state;
    const x = 22 + s.playhead * (rect.width - 44);
    const y = rect.height * 0.5;
    const color = j === 'perfect' ? '#30d158' : j === 'good' ? '#ffd60a' : '#ff453a';
    const count = j === 'miss' ? 8 : j === 'perfect' ? 26 : 16;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 60 + Math.random() * 180;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        max: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy += 220 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      next.push(p);
    }
    ctx.globalAlpha = 1;
    this.particles = next;
  }

  // ---- Visual / haptic feedback -------------------------------------------

  private judge(text: string, color: string): void {
    this.judgeEl.textContent = text;
    this.judgeEl.style.color = color;
    this.judgeEl.animate(
      [
        { transform: 'scale(0.6)', opacity: 0 },
        { transform: 'scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      { duration: 650, easing: 'ease-out' },
    );
  }

  private bump(node: HTMLElement): void {
    node.animate(
      [{ transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
      { duration: 140, easing: 'ease-out' },
    );
  }

  private doFlash(color: string, alpha = 0.18): void {
    this.flash.style.background = color;
    this.flash.animate(
      [{ opacity: alpha }, { opacity: 0 }],
      { duration: 280, easing: 'ease-out' },
    );
  }

  private shockwave(node: HTMLElement, color: string): void {
    const r = node.getBoundingClientRect();
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.style.left = `${r.left + r.width / 2}px`;
    ring.style.top = `${r.top + r.height / 2}px`;
    ring.style.borderColor = color;
    document.body.appendChild(ring);
    const size = Math.max(r.width, r.height);
    ring
      .animate(
        [
          { width: `${size}px`, height: `${size}px`, opacity: 0.6 },
          { width: `${size * 2.6}px`, height: `${size * 2.6}px`, opacity: 0 },
        ],
        { duration: 520, easing: 'ease-out' },
      )
      .addEventListener('finish', () => ring.remove());
  }

  private haptic(pattern: number | number[]): void {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* unsupported */
    }
  }
}

// ---- tiny DOM/canvas helpers ----------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
