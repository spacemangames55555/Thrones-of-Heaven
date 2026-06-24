import Phaser from 'phaser';

const TEXTURE_KEY = 'earth-portal';

/**
 * THE EARTH PORTAL — opened in the lair by the redemption angel after Satan falls:
 * the radiant, earthly gateway HOME. Deliberately the tonal opposite of the
 * infernal Hell portal — warm gold + sky-blue + green, peaceful. Stepping into it
 * returns the (intact) player to the Seattle start spawn on Earth. Drawn in WORLD
 * space; its existence is the serializable end-state hook.
 */
export class EarthPortal {
  readonly x: number;
  readonly y: number;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    EarthPortal.ensureTexture(scene);

    this.ring = scene.add.circle(x, y, 38, 0xffe9a8, 0.22).setDepth(6);
    this.sprite = scene.add.image(x, y, TEXTURE_KEY).setDepth(7);
    this.label = scene.add
      .text(x, y - 56, 'Return to Earth', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#fff3c4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1)
      .setStroke('#1a2008', 4)
      .setDepth(8);

    scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.92, to: 1.12 },
      alpha: { from: 0.9, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.ring,
      scale: 2,
      alpha: 0.04,
      duration: 1200,
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

  toJSON(): { kind: 'earth-portal'; x: number; y: number } {
    return { kind: 'earth-portal', x: this.x, y: this.y };
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const s = 60;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A radiant earthly gateway: sky-blue core, green earth ring, glowing gold edge.
    g.fillStyle(0x9fd4ff, 1); // sky core
    g.fillEllipse(s / 2, s / 2, s - 6, s);
    g.fillStyle(0x4a9a52, 0.95); // verdant earth band
    g.fillEllipse(s / 2, s / 2, s - 18, s - 14);
    g.fillStyle(0xdff3ff, 1); // bright inner light
    g.fillEllipse(s / 2, s / 2, s - 32, s - 28);
    g.lineStyle(3, 0xffe06a, 1); // radiant gold edge
    g.strokeEllipse(s / 2, s / 2, s - 6, s);
    // Soft motes of light.
    g.fillStyle(0xfff3c4, 1);
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7;
      g.fillCircle(s / 2 + Math.cos(a) * (s / 2 - 8), s / 2 + Math.sin(a) * (s / 2 - 6), 1.8);
    }
    g.generateTexture(TEXTURE_KEY, s, s + 8);
    g.destroy();
  }
}
