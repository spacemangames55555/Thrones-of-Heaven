import Phaser from 'phaser';
import { getInsets, UI_MARGIN } from './uiLayout';

const SIZE = 58;
const GAP = 8;
const COLS = 3; // 3 columns × 2 rows = 6 slots, in the freed bottom-right corner
const DEPTH = 1350;

/**
 * THE LOADOUT BAR — the player's entire active kit (the 6 equipped skills), as
 * on-screen buttons in the bottom-right (where the old Attack/Dash buttons were).
 * UI camera, fixed across zoom. Slot 0 is the bottom-right (primary thumb spot);
 * slots fill leftward then up. Empty slots render dim. A small "SKILLS" button sits
 * above the grid to open the skill tree / loadout screen.
 *
 * All 6 buttons are created up front (UI partition), then relabelled / shown as the
 * loadout changes — no UI is created after the camera partition is set.
 */
export class LoadoutBar {
  private readonly scene: Phaser.Scene;
  private readonly slots: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; cd: Phaser.GameObjects.Rectangle }[] = [];
  private readonly openBg: Phaser.GameObjects.Rectangle;
  private readonly openLabel: Phaser.GameObjects.Text;
  private equipped: (string | null)[] = new Array(6).fill(null);

  constructor(scene: Phaser.Scene, handlers: { onOpen: () => void; onActivate: (slot: number) => void }) {
    this.scene = scene;

    for (let i = 0; i < 6; i++) {
      const bg = scene.add
        .rectangle(0, 0, SIZE, SIZE, 0x1d2b40, 0.92)
        .setStrokeStyle(2, 0x44506a, 0.95)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setInteractive({ useHandCursor: true });
      const cd = scene.add.rectangle(0, 0, SIZE, 0, 0x05060a, 0.55).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 1);
      const label = scene.add
        .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffe9a8', fontStyle: 'bold', align: 'center', wordWrap: { width: SIZE - 6 } })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => handlers.onActivate(i));
      this.slots.push({ bg, label, cd });
    }

    this.openBg = scene.add
      .rectangle(0, 0, SIZE, 28, 0x241433, 0.92)
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

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.layout();
  }

  /** Set the equipped skills (6 entries; null = empty) + their button labels. */
  setLoadout(equipped: (string | null)[], labels: (string | null)[]): void {
    this.equipped = equipped.slice(0, 6);
    while (this.equipped.length < 6) this.equipped.push(null);
    for (let i = 0; i < 6; i++) {
      const filled = !!this.equipped[i];
      const s = this.slots[i];
      s.label.setText(filled ? labels[i] ?? '' : '');
      s.bg.setStrokeStyle(2, filled ? 0xffd24a : 0x36405a, 0.95);
      s.bg.setFillStyle(filled ? 0x1d2b40 : 0x12161e, filled ? 0.92 : 0.7);
      if (!filled) s.cd.setVisible(false);
    }
  }

  /** Update one slot's cooldown shade + disabled (low-energy) look. ratio 1 = full cd. */
  setSlotState(slot: number, cooldownRatio: number, disabled: boolean): void {
    const s = this.slots[slot];
    if (!s || !this.equipped[slot]) return;
    const r = Phaser.Math.Clamp(cooldownRatio, 0, 1);
    s.cd.setVisible(r > 0).setSize(SIZE, SIZE * r).setPosition(s.bg.x, s.bg.y + SIZE / 2);
    s.bg.setFillStyle(disabled ? 0x33282a : 0x1d2b40, 0.92);
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    const rightX = w - insets.right - UI_MARGIN - SIZE / 2;
    const bottomY = h - insets.bottom - UI_MARGIN - SIZE / 2;

    for (let i = 0; i < 6; i++) {
      const col = i % COLS; // 0 = rightmost column
      const row = Math.floor(i / COLS); // 0 = bottom row
      const x = rightX - col * (SIZE + GAP);
      const y = bottomY - row * (SIZE + GAP);
      const s = this.slots[i];
      s.bg.setPosition(x, y);
      s.label.setPosition(x, y);
      s.cd.setPosition(x, y + SIZE / 2);
    }
    // SKILLS open button: above the grid, leftmost column (clear of the Holy Bolt
    // button that sits above the rightmost column).
    const ox = rightX - (COLS - 1) * (SIZE + GAP);
    const oy = bottomY - 2 * (SIZE + GAP) - 6;
    this.openBg.setPosition(ox, oy);
    this.openLabel.setPosition(ox, oy);
  }
}
