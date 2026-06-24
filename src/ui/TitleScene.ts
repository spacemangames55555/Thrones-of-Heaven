import Phaser from 'phaser';
import { SaveSystem } from '../save/SaveSystem';
import { getInsets } from './uiLayout';

/**
 * The minimal START / TITLE screen — the game's entry point and the gateway to
 * loading. Two options, mobile-sized, routed through this scene's own camera:
 *   • New Game  — fresh playthrough (warns + clears the slot first if a save exists)
 *   • Continue  — load the existing save (greyed/disabled when there is none)
 * Choosing launches MainScene with { mode } and this scene stops. Placeholder art.
 */
export class TitleScene extends Phaser.Scene {
  private confirmLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const hasSave = SaveSystem.hasSave();

    this.cameras.main.setBackgroundColor('#0a0610');

    // A simple infernal-to-holy gradient feel via two soft glows + a title.
    this.add.circle(cx, h * 0.26, Math.min(w, h) * 0.42, 0x3a1030, 0.5).setDepth(0);
    this.add.circle(cx, h * 0.26, Math.min(w, h) * 0.26, 0x5a2a10, 0.5).setDepth(0);

    this.add
      .text(cx, h * 0.2, 'THRONES\nOF HEAVEN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: `${Math.round(Math.min(w, h) * 0.1)}px`,
        color: '#ffe9a8',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setStroke('#1a0d04', 6)
      .setShadow(0, 3, '#000000', 8)
      .setDepth(2);
    this.add
      .text(cx, h * 0.34, 'A trial through Heaven and Hell', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#c9a9d6',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Two stacked menu buttons, centred in the lower half.
    const btnW = Math.min(280, w - 64);
    const btnH = 56;
    this.makeButton(cx, h * 0.56, btnW, btnH, 'New Game', 0x6e2424, 0xff8a5a, () => this.onNewGame(hasSave));
    this.makeButton(cx, h * 0.56 + btnH + 18, btnW, btnH, 'Continue', 0x13506b, 0x49d6ff, () => this.onContinue(), hasSave);

    if (!hasSave) {
      this.add
        .text(cx, h * 0.56 + 2 * (btnH + 18) + 4, 'No saved game yet', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#7a8a92',
        })
        .setOrigin(0.5)
        .setDepth(2);
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart());
  }

  private onNewGame(hasSave: boolean): void {
    if (hasSave) {
      this.showConfirm('Start a new game?\nThis OVERWRITES your existing save.', () => {
        SaveSystem.clear();
        this.launch('new');
      });
    } else {
      this.launch('new');
    }
  }

  private onContinue(): void {
    if (!SaveSystem.hasSave()) return; // disabled
    this.launch('continue');
  }

  private launch(mode: 'new' | 'continue'): void {
    this.scene.start('MainScene', { mode });
  }

  // --- helpers ---------------------------------------------------------------

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fill: number,
    stroke: number,
    onTap: () => void,
    enabled = true,
  ): void {
    const depth = 5;
    const bg = this.add
      .rectangle(x, y, w, h, enabled ? fill : 0x20242a, enabled ? 0.96 : 0.7)
      .setStrokeStyle(3, enabled ? stroke : 0x44494f, 1)
      .setDepth(depth);
    this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: enabled ? '#ffffff' : '#6a7077',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1);
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
    }
  }

  /** A small two-button confirm modal (for the New Game overwrite warning). */
  private showConfirm(message: string, onYes: () => void): void {
    this.confirmLayer?.destroy();
    const w = this.scale.width;
    const h = this.scale.height;
    const insets = getInsets(this);
    void insets;
    const c = this.add.container(0, 0).setDepth(50);

    const shade = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.66).setInteractive();
    const panelW = Math.min(320, w - 40);
    const panel = this.add.rectangle(w / 2, h / 2, panelW, 200, 0x161018, 0.98).setStrokeStyle(2, 0xffd24a, 0.9);
    const text = this.add
      .text(w / 2, h / 2 - 48, message, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#ffe9a8',
        align: 'center',
        wordWrap: { width: panelW - 32 },
      })
      .setOrigin(0.5);
    c.add([shade, panel, text]);

    const by = h / 2 + 50;
    const mk = (dx: number, label: string, fill: number, stroke: number, cb: () => void): void => {
      const bg = this.add.rectangle(w / 2 + dx, by, 120, 44, fill, 0.96).setStrokeStyle(2, stroke, 1).setInteractive({ useHandCursor: true });
      const t = this.add.text(w / 2 + dx, by, label, { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, cb);
      c.add([bg, t]);
    };
    mk(-66, 'Cancel', 0x33373d, 0x6a7077, () => c.destroy());
    mk(66, 'Overwrite', 0x6e2424, 0xff8a5a, () => {
      c.destroy();
      onYes();
    });
    this.confirmLayer = c;
  }
}
