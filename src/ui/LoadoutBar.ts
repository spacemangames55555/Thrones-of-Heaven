import Phaser from 'phaser';
import { getInsets, UI_MARGIN, LEFT_TAB_W, LEFT_TAB_H, leftTabPos } from './uiLayout';
import { DRAG_AIM_THRESHOLD } from '../game/settings';
import { FEEL } from './feel-config';

/** Callbacks the scene wires to the loadout buttons (Piece 4: tap = quick fire, drag = aim). */
export interface LoadoutHandlers {
  onOpen: () => void;
  /** Fire the slot's skill NOW (a tap / quick fire, or a non-aimable activation). */
  onActivate: (slot: number) => void;
  /** Is the slot's skill DIRECTIONAL (gets drag-to-aim)? Non-aimable fire on tap only. */
  isAimable: (slot: number) => boolean;
  /** Drag passed the threshold → aim mode: update the indicator toward (dirX,dirY) (unit). */
  onAimMove: (slot: number, dirX: number, dirY: number) => void;
  /** Released after aiming → fire the slot's skill in the aimed direction. */
  onAimRelease: (slot: number, dirX: number, dirY: number) => void;
}

// HOTBAR CHROME (game-feel pass): every chrome tunable sources from FEEL —
// same shipped values, one home. Bottom-right per Casey's thumb ruling.
const SIZE = FEEL.hotbar.slotPx;
const GAP = FEEL.hotbar.gapPx;
const COLS = FEEL.hotbar.cols;
const SLOTS = FEEL.hotbar.hotbarSlots;
const DEPTH = FEEL.depths.screenUi;
const LABEL_FONT_MAX = 12; // auto-fit label font range (px); shrinks to fit the full name
const LABEL_FONT_MIN = 7;

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
  /** THE CASCADE pip (Savage): a small rank readout above the grid — hidden at
   *  rank 0, which is every other class always (created up front like all bar
   *  UI so the camera partition stays intact). */
  private readonly cascadeLabel: Phaser.GameObjects.Text;
  private equipped: (string | null)[] = new Array(SLOTS).fill(null);
  private readonly handlers: LoadoutHandlers;
  /** The in-progress press on a slot button (tap vs drag is resolved on release). */
  private activeDrag: { slot: number; pointerId: number; downX: number; downY: number; aiming: boolean; dirX: number; dirY: number } | null = null;

  constructor(scene: Phaser.Scene, handlers: LoadoutHandlers) {
    this.scene = scene;
    this.handlers = handlers;

    for (let i = 0; i < SLOTS; i++) {
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
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.onButtonDown(i, p));
      this.slots.push({ bg, label, cd });
    }

    // PIECE 4: a press on an AIMABLE slot starts drag tracking; the global move/up resolve
    // tap (quick fire) vs drag (aim → release). Filtered by pointer id so the joystick (a
    // different finger) keeps driving movement WHILE the skill button aims.
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
      scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    });

    // SKILLS opens the skill-tree screen. It lives on the LEFT edge as the third
    // stacked tab (DEV → QUESTS → SKILLS), sized to match those tabs; DEV/QUESTS are
    // DEV_MODE-only, but SKILLS is always present (a player function).
    this.openBg = scene.add
      .rectangle(0, 0, LEFT_TAB_W, LEFT_TAB_H, 0x241433, 0.92)
      .setStrokeStyle(2, 0xb98aff, 0.95)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });
    this.openLabel = scene.add
      .text(0, 0, 'SKILLS', { fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#e9d6ff', fontStyle: 'bold', align: 'center', wordWrap: { width: LEFT_TAB_W - 6 } })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.openBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, handlers.onOpen);

    this.cascadeLabel = scene.add
      .text(0, 0, '', { fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#ff8a5a', fontStyle: 'bold', align: 'right' })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setVisible(false);

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.layout();
  }

  /** A slot button was pressed. Non-aimable → fire immediately (instant feel). Aimable →
   *  begin tracking this finger; tap vs drag is decided on release. */
  private onButtonDown(slot: number, pointer: Phaser.Input.Pointer): void {
    if (this.activeDrag) return; // one aim at a time
    if (!this.equipped[slot]) return; // empty slot
    if (!this.handlers.isAimable(slot)) {
      this.handlers.onActivate(slot);
      return;
    }
    this.activeDrag = { slot, pointerId: pointer.id, downX: pointer.x, downY: pointer.y, aiming: false, dirX: 0, dirY: 0 };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const d = this.activeDrag;
    if (!d || pointer.id !== d.pointerId) return;
    const dx = pointer.x - d.downX;
    const dy = pointer.y - d.downY;
    const dist = Math.hypot(dx, dy);
    if (dist >= DRAG_AIM_THRESHOLD) {
      d.aiming = true;
      d.dirX = dx / dist;
      d.dirY = dy / dist;
      this.handlers.onAimMove(d.slot, d.dirX, d.dirY); // screen-space drag = world direction (no camera rotation)
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const d = this.activeDrag;
    if (!d || pointer.id !== d.pointerId) return;
    this.activeDrag = null;
    if (d.aiming) this.handlers.onAimRelease(d.slot, d.dirX, d.dirY); // drag → fire aimed
    else this.handlers.onActivate(d.slot); // tap → quick fire (facing/move dir + aim-assist)
  }

  /** Set the equipped skills (6 entries; null = empty) + their button labels. */
  setLoadout(equipped: (string | null)[], labels: (string | null)[]): void {
    this.equipped = equipped.slice(0, SLOTS);
    while (this.equipped.length < SLOTS) this.equipped.push(null);
    for (let i = 0; i < SLOTS; i++) {
      const filled = !!this.equipped[i];
      const s = this.slots[i];
      if (filled) this.fitLabel(s.label, labels[i] ?? '');
      else s.label.setText('');
      // Empty slots read as FRAMED PLACEHOLDERS (FEEL chrome), filled as live keys.
      s.bg.setStrokeStyle(2, filled ? 0xffd24a : FEEL.hotbar.emptyStroke, filled ? 0.95 : FEEL.hotbar.emptyStrokeAlpha);
      s.bg.setFillStyle(filled ? 0x1d2b40 : 0x12161e, filled ? 0.92 : FEEL.hotbar.emptyFillAlpha);
      if (!filled) s.cd.setVisible(false);
    }
  }

  /** Auto-fit the FULL skill name inside the button: word-wrap to the button width and
   *  shrink the font until every line fits without truncation (so "Army of the Dead",
   *  "Unleash the Monster", etc. are fully readable). */
  private fitLabel(label: Phaser.GameObjects.Text, str: string): void {
    const maxW = SIZE - 6;
    const maxH = SIZE - 8;
    let chosen = LABEL_FONT_MIN;
    for (let fs = LABEL_FONT_MAX; fs >= LABEL_FONT_MIN; fs--) {
      label.setFontSize(fs);
      label.setText(str); // re-wraps at the new size (wordWrap width is fixed in the style)
      if (label.width <= maxW && label.height <= maxH) {
        chosen = fs;
        break;
      }
      chosen = fs; // keep the smallest tried if none fully fit (still better than truncating)
    }
    label.setFontSize(chosen);
    label.setText(str);
  }

  /** Update one slot's cooldown shade + disabled (low-energy) look. ratio 1 = full cd. */
  setSlotState(slot: number, cooldownRatio: number, disabled: boolean): void {
    const s = this.slots[slot];
    if (!s || !this.equipped[slot]) return;
    const r = Phaser.Math.Clamp(cooldownRatio, 0, 1);
    s.cd.setVisible(r > 0).setSize(SIZE, SIZE * r).setPosition(s.bg.x, s.bg.y + SIZE / 2);
    s.bg.setFillStyle(disabled ? 0x33282a : 0x1d2b40, 0.92);
  }

  /** THE CASCADE pip: show/refresh the rank readout (rank 0 hides it). */
  setCascadeRank(rank: number): void {
    this.cascadeLabel.setVisible(rank > 0);
    if (rank > 0) this.cascadeLabel.setText(`CASCADE ${'◆'.repeat(rank)}`);
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    const rightX = w - insets.right - UI_MARGIN - SIZE / 2;
    const bottomY = h - insets.bottom - UI_MARGIN - SIZE / 2;
    // The cascade pip sits just above the 3×2 grid, right-aligned with it.
    this.cascadeLabel.setPosition(rightX + SIZE / 2, bottomY - (SIZE + GAP) - SIZE / 2 - 4);

    for (let i = 0; i < SLOTS; i++) {
      const col = i % COLS; // 0 = rightmost column
      const row = Math.floor(i / COLS); // 0 = bottom row
      const x = rightX - col * (SIZE + GAP);
      const y = bottomY - row * (SIZE + GAP);
      const s = this.slots[i];
      s.bg.setPosition(x, y);
      s.label.setPosition(x, y);
      s.cd.setPosition(x, y + SIZE / 2);
    }
    // SKILLS button: LEFT edge, third stacked tab under DEV + QUESTS (index 2).
    const skills = leftTabPos(this.scene, 2);
    this.openBg.setPosition(skills.x, skills.y);
    this.openLabel.setPosition(skills.x, skills.y);
  }
}
