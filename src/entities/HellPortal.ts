import Phaser from 'phaser';

const TEXTURE_KEY = 'hell-portal';

/**
 * The HELL PORTAL — spawned at the throne after God's judgment as the (future)
 * gateway down. Distinct INFERNAL placeholder art (dark red / black / fire),
 * clearly different from the holy Heaven / corrupted return portals. This build
 * is a PLACEHOLDER: entering it shows a "coming soon" beat (the Hell map is the
 * NEXT build). Drawn in WORLD space; its existence is the serializable state.
 */
export class HellPortal {
  readonly x: number;
  readonly y: number;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    HellPortal.ensureTexture(scene);

    this.ring = scene.add.circle(x, y, 34, 0xff3b1f, 0.18).setDepth(6);
    this.sprite = scene.add.image(x, y, TEXTURE_KEY).setDepth(7);
    this.label = scene.add
      .text(x, y - 52, 'Hell Portal', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ff8a5a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1)
      .setStroke('#1a0604', 4)
      .setDepth(8);

    scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.9, to: 1.1 },
      alpha: { from: 0.85, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.ring,
      scale: 1.8,
      alpha: 0.04,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /** Every game object, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.ring, this.sprite, this.label];
  }

  destroy(): void {
    for (const o of this.objects()) o.destroy();
  }

  // --- Serialization (portal state for the future save system) --------------

  toJSON(): { kind: 'hell-portal'; x: number; y: number } {
    return { kind: 'hell-portal', x: this.x, y: this.y };
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const s = 60;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A standing infernal rift: black void core, blood-red swirling edge, ember flecks.
    g.fillStyle(0x0a0202, 1);
    g.fillEllipse(s / 2, s / 2, s - 6, s);
    g.fillStyle(0x6e0c06, 0.95);
    g.fillEllipse(s / 2, s / 2, s - 18, s - 14);
    g.fillStyle(0x1a0402, 1);
    g.fillEllipse(s / 2, s / 2, s - 30, s - 26);
    g.lineStyle(3, 0xff4a1f, 0.95); // fiery edge
    g.strokeEllipse(s / 2, s / 2, s - 6, s);
    // Ember flecks.
    g.fillStyle(0xff8a3a, 1);
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7;
      g.fillCircle(s / 2 + Math.cos(a) * (s / 2 - 8), s / 2 + Math.sin(a) * (s / 2 - 6), 1.6);
    }
    g.generateTexture(TEXTURE_KEY, s, s + 8);
    g.destroy();
  }
}
