import Phaser from 'phaser';
import { getInsets, UI_MARGIN } from './uiLayout';

const SIZE = 64; // a touch smaller than the primary Attack button
const ATTACK_SIZE = 78; // must match AttackButton's SIZE (we stack above it)
const STACK_GAP = 12;
const ICON_KEY = 'dash-icon';

/**
 * The on-screen DASH button (UI camera, fixed across zoom). It sits in the
 * bottom-right action cluster, directly ABOVE the Attack button — clear of the
 * Attack button, the mid-right zoom buttons, the bottom-centre Talk button, and
 * the bottom-left joystick. It shows a clear disabled/recharging state when the
 * dash is on cooldown or the player lacks the energy to use it.
 */
export class DashButton {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly cooldownOverlay: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, onTap: () => void) {
    this.scene = scene;
    DashButton.ensureIcon(scene);
    const depth = 1350;

    this.bg = scene.add
      .rectangle(0, 0, SIZE, SIZE, 0x123445, 0.95)
      .setStrokeStyle(3, 0x49d6ff, 1)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    this.icon = scene.add.image(0, 0, ICON_KEY).setScrollFactor(0).setDepth(depth + 2);
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

  /**
   * Reflect the dash's availability. cooldownRatio: 0 ready → 1 just used.
   * lowEnergy: true when the player can't afford the dash. Either condition dims
   * the button and shows the recharging overlay.
   */
  setState(cooldownRatio: number, lowEnergy: boolean): void {
    const r = Phaser.Math.Clamp(cooldownRatio, 0, 1);
    const ready = r <= 0 && !lowEnergy;
    this.bg.setFillStyle(ready ? 0x13506b : 0x12222b, ready ? 0.95 : 0.9);
    this.bg.setStrokeStyle(3, ready ? 0x49d6ff : lowEnergy ? 0x5a6a72 : 0x2c6a82, 1);
    this.icon.setAlpha(ready ? 1 : 0.45);
    // On cooldown: overlay shrinks as it recharges. Low energy with no cooldown:
    // show a full dim overlay so it reads as unavailable.
    const fillRatio = r > 0 ? r : lowEnergy ? 1 : 0;
    const bottom = this.bg.y + SIZE / 2;
    this.cooldownOverlay.setPosition(this.bg.x, bottom).setSize(SIZE, SIZE * fillRatio);
    this.cooldownOverlay.setVisible(fillRatio > 0);
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    // Horizontally centered on the Attack button; stacked one slot above it.
    const cx = w - insets.right - UI_MARGIN - ATTACK_SIZE / 2;
    const cy = h - insets.bottom - UI_MARGIN - ATTACK_SIZE - STACK_GAP - SIZE / 2;
    this.bg.setPosition(cx, cy);
    this.icon.setPosition(cx, cy);
    this.cooldownOverlay.setPosition(cx, cy + SIZE / 2);
  }

  private static ensureIcon(scene: Phaser.Scene): void {
    if (scene.textures.exists(ICON_KEY)) return;
    const s = 40;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A double chevron pointing right — reads as "lunge / dash".
    g.lineStyle(5, 0xd6f5ff, 1);
    const chevron = (ox: number): void => {
      g.beginPath();
      g.moveTo(ox, 8);
      g.lineTo(ox + 12, s / 2);
      g.lineTo(ox, s - 8);
      g.strokePath();
    };
    chevron(10);
    chevron(20);
    g.generateTexture(ICON_KEY, s, s);
    g.destroy();
  }
}
