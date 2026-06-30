import Phaser from 'phaser';
import { getInsets, UI_MARGIN, DEPTH_HUD_TEXTBOX } from './uiLayout';

// TEXTBOX band: the choice prompt renders in FRONT of the buttons + data readout.
const D = DEPTH_HUD_TEXTBOX;

export interface ChoiceOption {
  label: string;
  onSelect: () => void;
}

/**
 * Reusable decision prompt: a prompt string + one large button per option.
 * Tapping an option fires its callback and closes the prompt. Distinct from the
 * linear DialogueBox (which only advances) — this is a branching choice.
 *
 * Rendered entirely through the UI camera (fixed 1:1, unaffected by zoom): its
 * objects are created on demand, so the main (zoomable) camera is told to
 * ignore each one, exactly mirroring the static UI-camera partition.
 */
export class ChoicePrompt {
  private readonly scene: Phaser.Scene;
  private readonly mainCamera: Phaser.Cameras.Scene2D.Camera;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private open_ = false;
  private acceptTapAt = 0;

  constructor(scene: Phaser.Scene, mainCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
    this.mainCamera = mainCamera;
  }

  isOpen(): boolean {
    return this.open_;
  }

  open(prompt: string, options: ChoiceOption[]): void {
    this.close();
    this.open_ = true;
    this.acceptTapAt = this.scene.time.now + 150; // ignore the tap that opened it

    const scene = this.scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const insets = getInsets(scene);
    const sideMargin = UI_MARGIN + Math.max(insets.left, insets.right);
    const panelW = Math.min(w - sideMargin * 2, 360);
    const cx = w / 2;
    const pad = 16;
    const btnH = 50;
    const btnGap = 12;
    const promptGap = 14;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objects.push(o);
      return o;
    };

    // Dim modal backdrop (taps outside the buttons do nothing — controls are
    // frozen by the caller during a choice).
    add(scene.add.rectangle(0, 0, w, h, 0x05060a, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(D));

    // Prompt text first so we can measure its height for the panel.
    const promptText = add(
      scene.add
        .text(0, 0, prompt, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#f3ecd8',
          align: 'center',
          wordWrap: { width: panelW - pad * 2 },
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(D + 3),
    );

    const panelH = pad + promptText.height + promptGap + options.length * btnH + (options.length - 1) * btnGap + pad;
    // Upper-middle, clear of the bottom-left joystick and bottom-right zoom.
    const top = Phaser.Math.Clamp(h * 0.42 - panelH / 2, insets.top + UI_MARGIN, h - panelH - UI_MARGIN);

    add(scene.add.rectangle(cx, top + panelH / 2, panelW + 4, panelH + 4, 0xffd24a, 0.9).setScrollFactor(0).setDepth(D + 1));
    add(scene.add.rectangle(cx, top + panelH / 2, panelW, panelH, 0x0c1626, 0.98).setScrollFactor(0).setDepth(D + 2));
    promptText.setPosition(cx, top + pad);

    let by = top + pad + promptText.height + promptGap;
    for (const opt of options) {
      const bg = add(
        scene.add
          .rectangle(cx, by + btnH / 2, panelW - pad * 2, btnH, 0x1d2b40, 1)
          .setStrokeStyle(2, 0xffd24a, 0.95)
          .setScrollFactor(0)
          .setDepth(D + 3)
          .setInteractive({ useHandCursor: true }),
      );
      add(
        scene.add
          .text(cx, by + btnH / 2, opt.label, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '16px',
            color: '#ffe9a8',
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(D + 4),
      );
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        if (this.scene.time.now < this.acceptTapAt) return;
        const cb = opt.onSelect;
        this.close();
        cb();
      });
      by += btnH + btnGap;
    }

    // Route every object through the UI camera: the zoomable main camera ignores
    // them so they never scale or scroll with the world.
    this.mainCamera.ignore(this.objects);
  }

  close(): void {
    this.open_ = false;
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }
}
