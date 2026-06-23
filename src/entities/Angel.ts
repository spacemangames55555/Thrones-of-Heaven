import Phaser from 'phaser';

const TEXTURE_KEY = 'angel-divine';

/**
 * A one-time scripted divine manifestation: a bright gold/white winged figure,
 * larger than NPCs, with a soft glow — clearly distinct from the purple spirit
 * entities. Lives in the world (drawn by the main camera), created hidden and
 * shown on the encounter. (Art pass: a cherubim/ophanim sprite slots in here.)
 */
export class Angel {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    Angel.ensureTexture(scene);

    this.glow = scene.add.circle(x, y, 22, 0xfff3c0, 0).setDepth(7); // soft halo, hidden
    this.sprite = scene.add.sprite(x, y, TEXTURE_KEY).setDepth(9).setVisible(false);

    scene.tweens.add({
      targets: this.glow,
      scale: { from: 1, to: 1.6 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.sprite,
      y: y - 5,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  manifest(): void {
    this.sprite.setVisible(true);
    this.glow.setAlpha(0.5);
  }

  dismiss(): void {
    this.sprite.setVisible(false);
    this.glow.setAlpha(0);
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 28;
    const h = 32;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Wings (pale gold), behind the body.
    g.fillStyle(0xfbe9a0, 0.95);
    g.fillTriangle(w / 2 - 3, 14, 1, 8, 4, 22);
    g.fillTriangle(w / 2 + 3, 14, w - 1, 8, w - 4, 22);
    // Robed body + head (bright white).
    g.fillStyle(0xfffdf2, 1);
    g.fillRect(w / 2 - 5, 12, 10, 16);
    g.fillTriangle(w / 2 - 5, 28, w / 2 + 5, 28, w / 2, 22);
    g.fillCircle(w / 2, 9, 4.5);
    // Golden halo above the head.
    g.lineStyle(2, 0xffd24a, 1);
    g.strokeCircle(w / 2, 4, 4);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}
