import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { PORTAL_MAX_HP } from '../game/settings';

const TEXTURE_KEY = 'dark-portal';

/**
 * The destructible Dark Portal objective for the wave-defense encounter. A
 * sizable, ominous violet landmark with its own HP. Townsfolk reduce its HP; the
 * player loses the encounter if it reaches 0. Its HP bar + label are drawn in
 * WORLD space (main camera) right above it — legible because the player fights
 * here. State is centralized in this object and serializable via toJSON/load.
 */
export class DarkPortal {
  readonly x: number;
  readonly y: number;
  readonly health: Health;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly bar: HealthBar;
  private readonly label: Phaser.GameObjects.Text;
  private waveSuffix = '';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    DarkPortal.ensureTexture(scene);

    this.ring = scene.add.circle(x, y, 30, 0x8a2be2, 0.18).setDepth(6);
    this.sprite = scene.add.image(x, y, TEXTURE_KEY).setDepth(7);
    scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.92, to: 1.08 },
      alpha: { from: 0.82, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.ring,
      scale: 1.7,
      alpha: 0.04,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.health = new Health(PORTAL_MAX_HP);
    this.bar = new HealthBar(scene, 120, 11, 8);
    this.bar.setPosition(x - 60, y - 56);
    this.label = scene.add
      .text(x, y - 64, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#e6c8ff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setStroke('#160b22', 4)
      .setDepth(8);

    this.refresh();
  }

  get isDestroyed(): boolean {
    return this.health.isDead;
  }

  takeDamage(amount: number): number {
    const dealt = this.health.damage(amount);
    this.refresh();
    this.sprite.setTint(0xff5a5a).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(80, () => this.sprite.clearTint());
    return dealt;
  }

  /** Restore to full (encounter reset). */
  reset(): void {
    this.health.full();
    this.refresh();
  }

  /** Append a wave indicator to the world label (e.g. " — Wave 2/3"); '' clears it. */
  setWaveLabel(suffix: string): void {
    this.waveSuffix = suffix;
    this.refresh();
  }

  /** Every game object, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.ring, this.sprite, ...this.bar.objects(), this.label];
  }

  // --- Serialization (objective state for the future save system) -----------

  toJSON(): { hp: number } {
    return { hp: this.health.current };
  }
  load(state: { hp?: number }): void {
    this.health.current = Phaser.Math.Clamp(state.hp ?? this.health.max, 0, this.health.max);
    this.refresh();
  }

  private refresh(): void {
    this.bar.setRatio(this.health.ratio);
    this.label.setText(`Dark Portal  ${Math.ceil(this.health.current)}/${this.health.max}${this.waveSuffix}`);
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const s = 56;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A standing oval rift: dark violet core, brighter swirling edge.
    g.fillStyle(0x1a0a2e, 1);
    g.fillEllipse(s / 2, s / 2, s - 6, s);
    g.fillStyle(0x6a1fb0, 0.9);
    g.fillEllipse(s / 2, s / 2, s - 18, s - 14);
    g.fillStyle(0x2a0f44, 1);
    g.fillEllipse(s / 2, s / 2, s - 30, s - 26);
    g.lineStyle(3, 0xc06cff, 0.95);
    g.strokeEllipse(s / 2, s / 2, s - 6, s);
    g.generateTexture(TEXTURE_KEY, s, s);
    g.destroy();
  }
}
