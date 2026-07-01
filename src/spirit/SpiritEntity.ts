import Phaser from 'phaser';
import type { Interactable } from '../entities/Interactable';
import type { SpiritEntityData } from './spiritData';
import type { PlayerPath } from '../story/playerPath';

const TEXTURE_KEY = 'spirit-ghost';

/**
 * A runtime spirit entity: a translucent, eerily-tinted placeholder sprite that
 * lives at a real world position (drawn by the main/zoomable camera) but is only
 * shown when Spirit Vision is revealed. Implements {@link Interactable} so it
 * plugs straight into the existing dialogue/proximity flow, and serves
 * different dialogue depending on the player's path.
 */
export class SpiritEntity implements Interactable {
  readonly id: string;
  readonly name: string;

  private readonly defaultLines: string[];
  private readonly corruptedLines?: string[];
  private path: PlayerPath = 'neutral';

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text;
  private homeX: number;
  private homeY: number;

  constructor(scene: Phaser.Scene, data: SpiritEntityData) {
    this.scene = scene;
    this.id = data.id;
    this.name = data.name;
    this.defaultLines = data.lines;
    this.corruptedLines = data.corruptedLines;
    this.homeX = data.x;
    this.homeY = data.y;
    SpiritEntity.ensureTexture(scene);

    this.sprite = scene.add
      .sprite(data.x, data.y, TEXTURE_KEY)
      .setTint(data.color)
      .setDepth(8); // above terrain, around NPC depth

    this.label = scene.add
      .text(data.x, data.y - 28, data.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#e6d8ff',
      })
      .setOrigin(0.5, 1)
      .setStroke('#1a1030', 4)
      .setDepth(8);

    this.startBob();
    this.setRevealed(false);
  }

  /** The gentle, ghostly bob + flicker (anchored to the current home position). */
  private startBob(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.homeY - 4,
      alpha: { from: 0.55, to: 0.92 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /**
   * RELOCATE the spirit to a new world position (Azazel's progress-gated hub:
   * Oregon → the Kamiah outpost → Heaven). Re-anchors the bob tween so it keeps
   * hovering at the NEW spot. Idempotent (no-op when already there).
   */
  moveTo(x: number, y: number): void {
    if (this.homeX === x && this.homeY === y) return;
    this.homeX = x;
    this.homeY = y;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(x, y).setAlpha(0.85);
    this.label.setPosition(x, y - 28);
    this.startBob();
  }

  /** Conditional dialogue: corrupted set once the player has taken the dark path. */
  get lines(): string[] {
    return this.path === 'corrupted' && this.corruptedLines ? this.corruptedLines : this.defaultLines;
  }

  /** Update which dialogue set this entity serves, based on the player's path. */
  setPath(path: PlayerPath): void {
    this.path = path;
  }

  /** Show/hide the spirit. When hidden it is fully imperceptible. */
  setRevealed(revealed: boolean): void {
    this.sprite.setVisible(revealed);
    this.label.setVisible(revealed);
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /** World position (used by the quest objective marker to point at this spirit). */
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 30; // ~0.95 tile wide
    const h = 40; // ~1.25 tiles tall
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A pale ghost figure (white so per-entity tint shows): rounded head/body
    // with a wavy hem. Drawn white; SpiritEntity tints + the tween fades it.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2, 12, 10); // head/body top
    g.fillRect(w / 2 - 10, 12, 20, 18); // body
    g.fillCircle(w / 2 - 6.5, 31, 4); // wavy hem
    g.fillCircle(w / 2, 31, 4);
    g.fillCircle(w / 2 + 6.5, 31, 4);
    g.fillStyle(0x2a1a44, 1);
    g.fillCircle(w / 2 - 4, 10, 2); // hollow eyes
    g.fillCircle(w / 2 + 4, 10, 2);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}
