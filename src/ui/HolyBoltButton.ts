import Phaser from 'phaser';
import { getInsets, UI_MARGIN } from './uiLayout';

const SIZE = 64; // matches the Dash button
const ATTACK_SIZE = 78; // AttackButton's SIZE (bottom of the cluster)
const DASH_SIZE = 64; // DashButton's SIZE (stacked above Attack)
const STACK_GAP = 12;
const ICON_KEY = 'holybolt-icon';

/**
 * The on-screen HOLY BOLT button (UI camera, fixed across zoom). It is the third
 * member of the bottom-right action cluster, stacked directly ABOVE the Dash
 * button (which itself sits above Attack) — clear of the joystick (bottom-left),
 * the Talk button (bottom-centre), and the mid-right zoom buttons.
 *
 * It only EXISTS for the player once they are HOLY (post-swap): the scene shows
 * it on the swap and hides it on revert. Like the Dash button it shows a clear
 * disabled/recharging state when on cooldown or the player lacks the energy.
 */
export class HolyBoltButton {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly cooldownOverlay: Phaser.GameObjects.Rectangle;
  private shown = false;

  constructor(scene: Phaser.Scene, onTap: () => void) {
    this.scene = scene;
    HolyBoltButton.ensureIcon(scene);
    const depth = 1350;

    this.bg = scene.add
      .rectangle(0, 0, SIZE, SIZE, 0x4a3a12, 0.95)
      .setStrokeStyle(3, 0xffd24a, 1)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
    this.icon = scene.add.image(0, 0, ICON_KEY).setScrollFactor(0).setDepth(depth + 2).setVisible(false);
    this.cooldownOverlay = scene.add
      .rectangle(0, 0, SIZE, 0, 0x05060a, 0.55)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false);

    this.bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
    this.layout();
  }

  /** Show/hide the whole button (gated on the holy power-state). */
  setVisible(visible: boolean): void {
    this.shown = visible;
    this.bg.setVisible(visible);
    this.icon.setVisible(visible);
    if (visible) this.bg.setInteractive({ useHandCursor: true });
    else {
      this.bg.disableInteractive(); // hidden button must not catch taps
      this.cooldownOverlay.setVisible(false);
    }
  }

  /**
   * Reflect availability. cooldownRatio: 0 ready → 1 just used. lowEnergy: true
   * when the player can't afford a bolt. Either condition dims it + shows the
   * recharging overlay. No-ops while hidden.
   */
  setState(cooldownRatio: number, lowEnergy: boolean): void {
    if (!this.shown) return;
    const r = Phaser.Math.Clamp(cooldownRatio, 0, 1);
    const ready = r <= 0 && !lowEnergy;
    this.bg.setFillStyle(ready ? 0x6b531a : 0x2b2410, ready ? 0.95 : 0.9);
    this.bg.setStrokeStyle(3, ready ? 0xffe066 : lowEnergy ? 0x6a5e3a : 0x82702c, 1);
    this.icon.setAlpha(ready ? 1 : 0.45);
    const fillRatio = r > 0 ? r : lowEnergy ? 1 : 0;
    const bottom = this.bg.y + SIZE / 2;
    this.cooldownOverlay.setPosition(this.bg.x, bottom).setSize(SIZE, SIZE * fillRatio);
    this.cooldownOverlay.setVisible(fillRatio > 0);
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    // Centered on the Attack button's column; stacked one slot above Dash.
    const cx = w - insets.right - UI_MARGIN - ATTACK_SIZE / 2;
    const cy =
      h - insets.bottom - UI_MARGIN - ATTACK_SIZE - STACK_GAP - DASH_SIZE - STACK_GAP - SIZE / 2;
    this.bg.setPosition(cx, cy);
    this.icon.setPosition(cx, cy);
    this.cooldownOverlay.setPosition(cx, cy + SIZE / 2);
  }

  private static ensureIcon(scene: Phaser.Scene): void {
    if (scene.textures.exists(ICON_KEY)) return;
    const s = 40;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A radiant holy bolt: a four-point starburst with a bright core.
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(s / 2, s / 2, 5);
    g.lineStyle(4, 0xffe066, 1);
    const ray = (ang: number, len: number): void => {
      const cx = s / 2;
      const cy = s / 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      g.strokePath();
    };
    ray(-Math.PI / 2, 15); // up
    ray(Math.PI / 2, 15); // down
    ray(0, 15); // right
    ray(Math.PI, 15); // left
    g.lineStyle(3, 0xfff3c4, 0.9);
    ray(-Math.PI / 4, 9);
    ray(Math.PI / 4, 9);
    ray((-3 * Math.PI) / 4, 9);
    ray((3 * Math.PI) / 4, 9);
    g.generateTexture(ICON_KEY, s, s);
    g.destroy();
  }
}
