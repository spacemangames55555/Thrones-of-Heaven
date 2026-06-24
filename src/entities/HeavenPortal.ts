import Phaser from 'phaser';

const TEXTURE_KEY = 'heaven-portal';

/** The portal's tracked, serializable state. */
export type PortalState = 'holy' | 'corrupted';

// Holy (default) vs corrupted tints. The texture is drawn white so the tint
// fully colors it; corrupting tweens between these two.
const HOLY_TINT = 0xfff2c0; // warm gold/white, radiant
const HOLY_RING = 0xffe9a8;
const CORRUPT_TINT = 0x6a1fb0; // black/purple
const CORRUPT_RING = 0x8a2be2;

/**
 * The Heaven Portal at the holy outpost — the descent climax's objective. A
 * radiant gold/white gateway in its UNCORRUPTED state with a centralized,
 * serializable `state` (holy | corrupted, default holy). The defeat-gated
 * corruption interaction calls {@link corrupt}, which visibly transitions the
 * sprite + ring gold/white → black/purple over ~1s and flips the state. Drawn in
 * WORLD space (main camera) with its own label. Reset restores it to holy.
 */
export class HeavenPortal {
  readonly x: number;
  readonly y: number;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private state: PortalState = 'holy';
  private transitioning = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.scene = scene;
    HeavenPortal.ensureTexture(scene);

    this.ring = scene.add.circle(x, y, 34, HOLY_RING, 0.16).setDepth(6);
    this.sprite = scene.add.image(x, y, TEXTURE_KEY).setTint(HOLY_TINT).setDepth(7);
    this.label = scene.add
      .text(x, y - 52, 'Heaven Portal', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#fff3c4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1)
      .setStroke('#2a2410', 4)
      .setDepth(8);

    scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.92, to: 1.08 },
      alpha: { from: 0.85, to: 1 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.ring,
      scale: 1.7,
      alpha: 0.03,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  get portalState(): PortalState {
    return this.state;
  }
  get isCorrupted(): boolean {
    return this.state === 'corrupted';
  }
  /** True only while the gold→purple tween is mid-flight. */
  get isTransitioning(): boolean {
    return this.transitioning;
  }

  /**
   * Play the gold/white → black/purple corruption transition over `durationMs`,
   * then set state = corrupted. No-ops if already corrupted or mid-transition.
   */
  corrupt(durationMs: number, onComplete?: () => void): void {
    if (this.state === 'corrupted' || this.transitioning) return;
    this.transitioning = true;

    const from = Phaser.Display.Color.IntegerToColor(HOLY_TINT);
    const to = Phaser.Display.Color.IntegerToColor(CORRUPT_TINT);
    const ringFrom = Phaser.Display.Color.IntegerToColor(HOLY_RING);
    const ringTo = Phaser.Display.Color.IntegerToColor(CORRUPT_RING);
    const proxy = { t: 0 };
    this.scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: durationMs,
      ease: 'Sine.inOut',
      onUpdate: () => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, proxy.t * 100);
        this.sprite.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        const rc = Phaser.Display.Color.Interpolate.ColorWithColor(ringFrom, ringTo, 100, proxy.t * 100);
        this.ring.setFillStyle(Phaser.Display.Color.GetColor(rc.r, rc.g, rc.b), 0.18);
      },
      onComplete: () => {
        this.state = 'corrupted';
        this.transitioning = false;
        this.sprite.setTint(CORRUPT_TINT);
        this.ring.setFillStyle(CORRUPT_RING, 0.18);
        this.label.setText('Defiled Gate').setColor('#d6a8ff');
        onComplete?.();
      },
    });

    // A clear one-shot burst at the moment of defilement.
    const burst = this.scene.add.circle(this.x, this.y, 24, CORRUPT_RING, 0.5).setDepth(8);
    this.scene.tweens.add({
      targets: burst,
      scale: 3.2,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.out',
      onComplete: () => burst.destroy(),
    });
  }

  /** Restore to the uncorrupted holy state (encounter reset). */
  reset(): void {
    this.state = 'holy';
    this.transitioning = false;
    this.sprite.setTint(HOLY_TINT);
    this.ring.setFillStyle(HOLY_RING, 0.16);
    this.label.setText('Heaven Portal').setColor('#fff3c4');
  }

  /** Every game object, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.ring, this.sprite, this.label];
  }

  // --- Serialization (objective state for the future save system) -----------

  toJSON(): { state: PortalState } {
    return { state: this.state };
  }
  load(s: { state?: PortalState }): void {
    if (s.state === 'corrupted') {
      this.state = 'corrupted';
      this.sprite.setTint(CORRUPT_TINT);
      this.ring.setFillStyle(CORRUPT_RING, 0.18);
      this.label.setText('Defiled Gate').setColor('#d6a8ff');
    } else {
      this.reset();
    }
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const s = 60;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A radiant standing gate, drawn WHITE so the per-state tint colors it whole
    // (gold/white when holy, black/purple when corrupted): bright halo, a glowing
    // arch ring, a luminous core.
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(s / 2, s / 2, s, s + 6);
    g.fillStyle(0xffffff, 0.55);
    g.fillEllipse(s / 2, s / 2, s - 16, s - 10);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(s / 2, s / 2, s - 30, s - 24);
    g.lineStyle(3, 0xffffff, 0.95);
    g.strokeEllipse(s / 2, s / 2, s - 6, s);
    g.generateTexture(TEXTURE_KEY, s, s + 8);
    g.destroy();
  }
}
