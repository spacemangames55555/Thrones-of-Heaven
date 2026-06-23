import Phaser from 'phaser';
import { SpiritEntity } from './SpiritEntity';
import { SPIRIT_ENTITIES } from './spiritData';

const TINT_DEPTH = 500; // over the world, under the on-screen controls
const TINT_COLOR = 0x6a3db0;
const TINT_ALPHA = 0.12; // light — never obscures gameplay

/**
 * Spirit Vision: a hidden spiritual layer over the real world.
 *
 * Owns the single boolean state, the data-driven spirit entities (world-space,
 * drawn by the main camera), and a light full-screen "spirit world" tint (UI-
 * space, drawn by the UI camera so it ignores zoom). The real-world skin is
 * never touched. There is no player-facing toggle any more — Spirit Vision is
 * earned via the Angel's Choice, which calls {@link setSpiritVision}.
 */
export class SpiritVision {
  private readonly scene: Phaser.Scene;
  private active = false;
  private readonly entities_: SpiritEntity[];
  private tint?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Spawn one runtime entity per DATA entry — add spirits by editing the list.
    this.entities_ = SPIRIT_ENTITIES.map((d) => new SpiritEntity(scene, d));
  }

  get entities(): readonly SpiritEntity[] {
    return this.entities_;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Create the full-screen tint. Call this in the UI-creation phase so it lands
   * in the UI camera partition.
   */
  createTint(): void {
    const scene = this.scene;
    this.tint = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, TINT_COLOR, TINT_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(TINT_DEPTH)
      .setVisible(false);

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  /**
   * Reveal or hide the spiritual layer. Driven by the player's path (see
   * MainScene.setPlayerPath) — the corrupted choice turns this on permanently.
   */
  setSpiritVision(on: boolean): void {
    this.active = on;
    for (const e of this.entities_) e.setRevealed(on);
    if (this.tint) this.tint.setVisible(on).setAlpha(TINT_ALPHA);
  }

  /** Reveal with a soft tint fade-in (the "sight opens" moment). */
  fadeTintIn(durationMs: number): void {
    if (!this.tint) return;
    this.tint.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.tint, alpha: TINT_ALPHA, duration: durationMs, ease: 'Sine.out' });
  }

  private layout(): void {
    this.tint?.setPosition(0, 0).setSize(this.scene.scale.width, this.scene.scale.height);
  }
}
