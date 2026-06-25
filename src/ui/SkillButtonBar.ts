import Phaser from 'phaser';
import { getInsets } from './uiLayout';

/** One activatable skill the bar can show a button for. */
export interface SkillBarDef {
  id: string;
  /** Short label shown on the square button. */
  label: string;
}

const SIZE = 46;
const GAP = 6;
const HEADER_H = 32;
const DEPTH = 1420;

/**
 * The right-edge SKILL COLUMN (UI camera, fixed). A always-visible header button
 * opens the skill-tree screen; below it sit one square button per UNLOCKED
 * activatable skill (active / buff / debuff / transformation), each showing a
 * cooldown shade. All buttons are pre-created up front (so they fall in the UI
 * partition like the DevPanel) and just shown/hidden + re-laid-out as skills
 * unlock — no UI is created after the camera partition is set.
 */
export class SkillButtonBar {
  private readonly scene: Phaser.Scene;
  private readonly openBg: Phaser.GameObjects.Rectangle;
  private readonly openLabel: Phaser.GameObjects.Text;
  private readonly buttons = new Map<string, { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; cd: Phaser.GameObjects.Rectangle }>();
  private readonly order: string[];
  private visibleIds: string[] = [];

  constructor(scene: Phaser.Scene, defs: SkillBarDef[], handlers: { onOpen: () => void; onActivate: (id: string) => void }) {
    this.scene = scene;
    this.order = defs.map((d) => d.id);

    // Header "open skills" button (always visible).
    this.openBg = scene.add
      .rectangle(0, 0, SIZE, HEADER_H, 0x241433, 0.92)
      .setStrokeStyle(2, 0xb98aff, 0.95)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });
    this.openLabel = scene.add
      .text(0, 0, 'SKILLS', { fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#e9d6ff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.openBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, handlers.onOpen);

    // One button per activatable skill (hidden until unlocked).
    for (const d of defs) {
      const bg = scene.add
        .rectangle(0, 0, SIZE, SIZE, 0x1d2b40, 0.92)
        .setStrokeStyle(2, 0xffd24a, 0.95)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setInteractive({ useHandCursor: true });
      // Cooldown shade: a dark rectangle that shrinks from full (on cooldown) to none (ready).
      const cd = scene.add
        .rectangle(0, 0, SIZE, 0, 0x000000, 0.55)
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
      const label = scene.add
        .text(0, 0, d.label, { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffe9a8', fontStyle: 'bold', align: 'center', wordWrap: { width: SIZE - 6 } })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => handlers.onActivate(d.id));
      bg.setVisible(false).disableInteractive();
      cd.setVisible(false);
      label.setVisible(false);
      this.buttons.set(d.id, { bg, label, cd });
    }

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.layout();
  }

  /** Show buttons only for these (unlocked, activatable) skill ids, in their fixed order. */
  refresh(visibleIds: string[]): void {
    const set = new Set(visibleIds);
    this.visibleIds = this.order.filter((id) => set.has(id));
    for (const [id, b] of this.buttons) {
      const show = set.has(id);
      b.bg.setVisible(show);
      b.label.setVisible(show);
      if (show) b.bg.setInteractive();
      else {
        b.bg.disableInteractive();
        b.cd.setVisible(false);
      }
    }
    this.layout();
  }

  /** Update one skill button's cooldown shade + disabled look. ratio: 1 = full cooldown, 0 = ready. */
  setState(id: string, cooldownRatio: number, disabled: boolean): void {
    const b = this.buttons.get(id);
    if (!b || !b.bg.visible) return;
    const r = Phaser.Math.Clamp(cooldownRatio, 0, 1);
    b.cd.setVisible(r > 0).setSize(SIZE, SIZE * r);
    b.cd.setPosition(b.bg.x, b.bg.y + SIZE / 2); // grow down from the bottom edge
    b.bg.setFillStyle(disabled ? 0x33282a : 0x1d2b40, 0.92);
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    const x = w - insets.right - SIZE / 2 - 10;

    // The whole column (header + one button per shown skill) is vertically CENTERED
    // in the free mid-right band, clamped clear of the top HUD and bottom controls.
    const n = this.visibleIds.length;
    const total = HEADER_H + (n > 0 ? GAP + n * SIZE + (n - 1) * GAP : 0);
    const minTop = insets.top + h * 0.16;
    const maxBottom = h - insets.bottom - h * 0.18; // keep clear of the bottom action cluster
    let y = Phaser.Math.Clamp(h * 0.5 - total / 2, minTop, Math.max(minTop, maxBottom - total)) + HEADER_H / 2;

    this.openBg.setPosition(x, y);
    this.openLabel.setPosition(x, y);
    y += HEADER_H / 2 + GAP + SIZE / 2;
    for (const id of this.visibleIds) {
      const b = this.buttons.get(id);
      if (!b) continue;
      b.bg.setPosition(x, y);
      b.label.setPosition(x, y);
      b.cd.setPosition(x, y + SIZE / 2);
      y += SIZE + GAP;
    }
  }
}
