import Phaser from 'phaser';
import { getInsets, UI_MARGIN } from './uiLayout';

const SIZE = 78; // large, right-thumb reachable
const ICON_KEY = 'attack-icon';

/**
 * The prominent bottom-right melee Attack button (UI camera, fixed across zoom).
 * Shows a clear recharging state: while on cooldown it dims and a dark overlay
 * covers it, shrinking as the swing recharges.
 */
export class AttackButton {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly cooldownOverlay: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, onTap: () => void) {
    this.scene = scene;
    AttackButton.ensureIcon(scene);
    const depth = 1350;

    this.bg = scene.add
      .rectangle(0, 0, SIZE, SIZE, 0x4a1d1d, 0.95)
      .setStrokeStyle(3, 0xff7a5a, 1)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    this.icon = scene.add
      .image(0, 0, ICON_KEY)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.cooldownOverlay = scene.add
      .rectangle(0, 0, SIZE, 0, 0x05060a, 0.55)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
    this.layout();
  }

  /** ratio 0 = ready, 1 = just used (fully recharging). */
  setCooldownRatio(ratio: number): void {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    const ready = r <= 0;
    this.bg.setFillStyle(ready ? 0x6e2424 : 0x3a1717, ready ? 0.95 : 0.9);
    this.bg.setStrokeStyle(3, ready ? 0xff8a5a : 0x7a4a3a, 1);
    this.icon.setAlpha(ready ? 1 : 0.5);
    // Overlay anchored to the button's bottom, height shrinks as it recharges.
    const bottom = this.bg.y + SIZE / 2;
    this.cooldownOverlay.setPosition(this.bg.x, bottom).setSize(SIZE, SIZE * r);
    this.cooldownOverlay.setVisible(!ready);
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    const cx = w - insets.right - UI_MARGIN - SIZE / 2;
    const cy = h - insets.bottom - UI_MARGIN - SIZE / 2;
    this.bg.setPosition(cx, cy);
    this.icon.setPosition(cx, cy);
    this.cooldownOverlay.setPosition(cx, cy + SIZE / 2);
  }

  private static ensureIcon(scene: Phaser.Scene): void {
    if (scene.textures.exists(ICON_KEY)) return;
    const s = 44;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A simple gold sword pointing up-right.
    g.lineStyle(5, 0xffe9a8, 1);
    g.beginPath();
    g.moveTo(10, s - 8);
    g.lineTo(s - 8, 10);
    g.strokePath();
    g.lineStyle(4, 0xb98a3a, 1); // crossguard
    g.beginPath();
    g.moveTo(8, s - 18);
    g.lineTo(20, s - 6);
    g.strokePath();
    g.fillStyle(0xb98a3a, 1); // pommel
    g.fillCircle(9, s - 7, 3.5);
    g.generateTexture(ICON_KEY, s, s);
    g.destroy();
  }
}
