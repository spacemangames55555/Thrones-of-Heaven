import Phaser from 'phaser';
import { SpiritEntity } from './SpiritEntity';
import { SPIRIT_ENTITIES } from './spiritData';
import { getInsets, UI_MARGIN } from '../ui/uiLayout';

const BTN_H = 44;
const TINT_DEPTH = 500; // over the world, under the on-screen controls

/**
 * Spirit Vision: a hidden spiritual layer over the real world.
 *
 * Owns the single boolean state, the data-driven spirit entities (world-space,
 * drawn by the main camera), a light full-screen "spirit world" tint and the
 * toggle button (both UI-space, drawn by the UI camera so they ignore zoom),
 * and the desktop "V" key. The real-world skin is never touched.
 */
export class SpiritVision {
  private readonly scene: Phaser.Scene;
  private active = false;
  private readonly entities_: SpiritEntity[];

  private tint?: Phaser.GameObjects.Rectangle;
  private btnBg?: Phaser.GameObjects.Rectangle;
  private btnLabel?: Phaser.GameObjects.Text;
  private onChange?: (on: boolean) => void;

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
   * Create the on-screen controls (tint + toggle button) and bind the "V" key.
   * Call this during the UI-creation phase so these objects land in the UI
   * camera partition.
   */
  createUI(onChange: (on: boolean) => void): void {
    this.onChange = onChange;
    const scene = this.scene;

    this.tint = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x6a3db0, 0.12)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(TINT_DEPTH)
      .setVisible(false);

    const depth = 1300;
    this.btnBg = scene.add
      .rectangle(0, 0, 104, BTN_H, 0x14223a, 0.94)
      .setStrokeStyle(2, 0x8a7ab0, 1)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    this.btnLabel = scene.add
      .text(0, 0, '◉ Spirit', { fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: '#cfc0e8' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.btnBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.toggle());
    scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.V).on('down', () => this.toggle());

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.applyButtonStyle();
  }

  toggle(): void {
    this.setSpiritVision(!this.active);
  }

  /**
   * THE swappable trigger. Everything Spirit Vision does flows through here, so
   * the test toggle button/key can be replaced without touching the rest.
   *
   * FUTURE STORY HOOK: when the evil questline is entered via a story choice,
   * call setSpiritVision(true) from that event to make the spirit world a
   * permanent state for that player — the button simply stops being the driver.
   */
  setSpiritVision(on: boolean): void {
    this.active = on;
    for (const e of this.entities_) e.setRevealed(on);
    this.tint?.setVisible(on);
    this.applyButtonStyle();
    this.onChange?.(on);
  }

  private applyButtonStyle(): void {
    if (!this.btnBg || !this.btnLabel) return;
    if (this.active) {
      this.btnBg.setFillStyle(0x4a2d7a, 0.96).setStrokeStyle(2, 0xd9c6ff, 1);
      this.btnLabel.setColor('#ffffff');
    } else {
      this.btnBg.setFillStyle(0x14223a, 0.94).setStrokeStyle(2, 0x8a7ab0, 1);
      this.btnLabel.setColor('#cfc0e8');
    }
  }

  private layout(): void {
    const scene = this.scene;
    const w = scene.scale.width;
    const insets = getInsets(scene);
    this.tint?.setPosition(0, 0).setSize(w, scene.scale.height);
    const bw = this.btnBg?.width ?? 104;
    const cx = w - insets.right - UI_MARGIN - bw / 2;
    const cy = insets.top + UI_MARGIN + BTN_H / 2;
    this.btnBg?.setPosition(cx, cy);
    this.btnLabel?.setPosition(cx, cy);
  }
}
