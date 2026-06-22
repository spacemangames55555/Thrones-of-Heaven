import Phaser from 'phaser';

const TEXTURE_KEY = 'npc-quest';

/**
 * A simple quest-giver NPC: a colored static sprite the player can bump into,
 * carrying an array of dialogue lines. The dialogue itself is handled by the
 * reusable DialogueBox — this just holds the lines and the marker.
 */
export class Npc {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly lines: string[];

  constructor(scene: Phaser.Scene, x: number, y: number, lines: string[]) {
    this.lines = lines;
    Npc.ensureTexture(scene);

    this.sprite = scene.physics.add.staticSprite(x, y, TEXTURE_KEY);
    this.sprite.setDepth(9);

    // Pulsing "!" so the quest-giver reads as interactive.
    const mark = scene.add
      .text(x, y - 16, '!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffd24a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1)
      .setStroke('#1a1410', 4)
      .setDepth(9);
    scene.tweens.add({
      targets: mark,
      y: y - 20,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 16;
    const h = 18;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x101418, 1);
    g.fillRoundedRect(2, 4, 12, 13, 3); // dark outline body
    g.fillStyle(0x2aa9a0, 1);
    g.fillRoundedRect(3, 5, 10, 11, 3); // teal robe
    g.fillStyle(0xf0d2a8, 1);
    g.fillCircle(8, 5, 3.2); // head
    g.fillStyle(0x101418, 1);
    g.fillCircle(8, 5, 3.8);
    g.fillStyle(0xf0d2a8, 1);
    g.fillCircle(8, 5, 3.0);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}
