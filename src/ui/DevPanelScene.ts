import Phaser from 'phaser';
import { getInsets } from './uiLayout';
import type { DevAction } from './DevPanel';

/**
 * DEV PANEL overlay (DEV_MODE only) — a paused, vertically-scrollable list of every
 * dev action. It is its OWN scene, launched on top of MainScene which is paused
 * underneath (the same launch+pause pattern as the pause menu / building interiors),
 * so opening it FREEZES all gameplay (enemies, projectiles, timers, movement,
 * cooldowns, summons) and closing it resumes exactly where it left off. Dev actions
 * fired while paused mutate MainScene directly and take effect on resume.
 *
 * The buttons live in a masked container that drag-scrolls vertically within a bounded
 * panel, so ALL of them are reachable on a phone no matter how many there are — new
 * dev buttons added later automatically appear in the same scroll list. Its own camera
 * is unzoomed, so the panel is fixed across the world zoom (like the other UI scenes).
 *
 * >>> This is DEV TOOLING ONLY. It must never affect gameplay/balance/content. <<<
 */
const COLS = 3; // fixed 3-column grid
const COL_GAP = 6; // gutter between columns
const ROW_GAP = 8; // gutter between rows
const BTN_MIN_H = 44; // legible, tappable floor; rows grow taller to fit wrapped labels
const TEXT_VPAD = 12; // vertical padding added around the (possibly multi-line) label
const TEXT_HPAD = 10; // horizontal padding the label wraps within (label width = col width − this)
const FONT_PX = 13; // legible at 3 columns on a 428px phone
const PAD = 12;
const HEADER_H = 46; // title + close row
const DRAG_THRESHOLD = 8; // px of finger travel that turns a tap into a scroll

export class DevPanelScene extends Phaser.Scene {
  private actions: DevAction[] = [];
  private list!: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private vp = { x: 0, y: 0, w: 0, h: 0 }; // the scroll viewport (panel interior)
  private scrollMin = 0; // most-negative container.y (content bottom reached)
  private dragging = false;
  private dragStartPointerY = 0;
  private dragStartContainerY = 0;
  private dragMoved = false;

  constructor() {
    super('DevPanelScene');
  }

  init(data: { actions?: DevAction[] }): void {
    this.actions = data.actions ?? [];
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const insets = getInsets(this);
    const cx = w / 2;

    // Dim + eat taps behind the panel.
    this.add.rectangle(cx, h / 2, w, h, 0x05060a, 0.6).setInteractive();

    // Bounded panel that fits the phone screen (within the safe area).
    const panelW = Math.min(380, w - 24);
    const panelTop = insets.top + 16;
    const panelBottom = h - insets.bottom - 16;
    const panelH = Math.max(160, panelBottom - panelTop);
    this.add
      .rectangle(cx, panelTop + panelH / 2, panelW, panelH, 0x161018, 0.98)
      .setStrokeStyle(2, 0xffd24a, 0.9);

    const panelLeft = cx - panelW / 2;
    const panelRight = cx + panelW / 2;

    // Header: title + a big close (×) button (the ONLY way to close → always resumes).
    this.add
      .text(panelLeft + PAD, panelTop + HEADER_H / 2, 'DEV — paused', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '15px',
        color: '#e6ccff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const closeSize = 36;
    const closeCx = panelRight - PAD - closeSize / 2;
    const closeCy = panelTop + HEADER_H / 2;
    const closeBg = this.add
      .rectangle(closeCx, closeCy, closeSize, closeSize, 0x4a1d1d, 0.96)
      .setStrokeStyle(2, 0xff7a5a, 1)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(closeCx, closeCy - 1, '×', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    closeBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.close());

    // The scroll viewport (panel interior below the header).
    this.vp = {
      x: panelLeft + PAD,
      y: panelTop + HEADER_H,
      w: panelW - PAD * 2,
      h: panelBottom - (panelTop + HEADER_H) - PAD,
    };

    // Buttons live in a container clipped to the viewport by a geometry mask. The mask
    // graphics must be IN the display list (added, just hidden) for its geometry to be
    // uploaded — a detached make.graphics() mask does not reliably clip here.
    this.list = this.add.container(0, 0);
    const maskG = this.add.graphics().setVisible(false);
    maskG.fillStyle(0xffffff);
    maskG.fillRect(this.vp.x, this.vp.y, this.vp.w, this.vp.h);
    this.list.setMask(maskG.createGeometryMask());

    // 3-column grid: fixed column width (the content width split evenly with gutters);
    // buttons never grow WIDER — a long label word-wraps and the button grows TALLER.
    const btnW = (this.vp.w - (COLS - 1) * COL_GAP) / COLS;
    const wrapW = btnW - TEXT_HPAD;
    const colX = (c: number): number => this.vp.x + c * (btnW + COL_GAP) + btnW / 2;

    // First pass: build each label (word-wrapped to the fixed width) and its button bg,
    // and measure the wrapped label height so the row can size to its tallest button.
    const cells = this.actions.map((action) => {
      const label = this.add
        .text(0, 0, action.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: `${FONT_PX}px`,
          color: '#ffe9a8',
          align: 'center',
          wordWrap: { width: wrapW, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      const bg = this.add
        .rectangle(0, 0, btnW, BTN_MIN_H, 0x1d2b40, 0.96)
        .setStrokeStyle(2, 0xffd24a, 0.9)
        .setInteractive({ useHandCursor: true });
      // Fire on RELEASE, and only if the finger didn't travel (a tap, not a scroll).
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        if (!this.dragMoved) action.onPress();
      });
      // bg under label: add bg first, then label, for every cell.
      this.list.add(bg);
      this.list.add(label);
      this.buttons.push(bg);
      this.labels.push(label);
      return { bg, label, h: label.height + TEXT_VPAD };
    });

    // Second pass: place row by row. Each row's height fits its TALLEST button, and all
    // three buttons in the row take that height (uniform per row → tidy, no overlap).
    let rowTop = this.vp.y;
    for (let i = 0; i < cells.length; i += COLS) {
      const row = cells.slice(i, i + COLS);
      const rowH = Math.max(BTN_MIN_H, ...row.map((cell) => cell.h));
      const cy = rowTop + rowH / 2;
      row.forEach((cell, c) => {
        const cx = colX(c);
        cell.bg.setSize(btnW, rowH).setPosition(cx, cy);
        cell.label.setPosition(cx, cy);
      });
      rowTop += rowH + ROW_GAP;
    }

    const contentH = rowTop - this.vp.y - ROW_GAP; // total stacked grid height
    this.scrollMin = Math.min(0, this.vp.h - contentH); // negative if the grid overflows

    // Drag-to-scroll (touch) + wheel (desktop). Scene-level so a drag that begins
    // on a button still scrolls the list.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.GAMEOBJECT_WHEEL, () => {});
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.scrollBy(-dy));

    this.updateButtonInput();

    // A resize (orientation/keyboard) cleanly rebuilds the panel.
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  private onResize(): void {
    this.scene.restart({ actions: this.actions });
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    this.dragMoved = false;
    if (this.scrollMin >= 0) return; // nothing to scroll
    this.dragging = true;
    this.dragStartPointerY = p.y;
    this.dragStartContainerY = this.list.y;
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (!this.dragging || !p.isDown) return;
    const dy = p.y - this.dragStartPointerY;
    if (Math.abs(dy) > DRAG_THRESHOLD) this.dragMoved = true;
    this.list.y = Phaser.Math.Clamp(this.dragStartContainerY + dy, this.scrollMin, 0);
    this.updateButtonInput();
  }

  private onPointerUp(): void {
    this.dragging = false;
  }

  private scrollBy(delta: number): void {
    if (this.scrollMin >= 0) return;
    this.list.y = Phaser.Math.Clamp(this.list.y + delta, this.scrollMin, 0);
    this.updateButtonInput();
  }

  /** Keep the scroll tidy: a row fully outside the viewport is HIDDEN (so it can never
   *  bleed over the header/panel chrome — belt-and-suspenders alongside the mask, which
   *  crops the partial edge rows). Taps are disabled on any button whose CENTRE is out of
   *  view, so a tap on the dimmed area never hits an unseen button. */
  private updateButtonInput(): void {
    const top = this.vp.y;
    const bottom = this.vp.y + this.vp.h;
    for (let i = 0; i < this.buttons.length; i++) {
      const bg = this.buttons[i];
      const effY = bg.y + this.list.y;
      const half = bg.height / 2;
      const overlaps = effY + half >= top && effY - half <= bottom; // any part in view
      const centreInView = effY >= top && effY <= bottom;
      bg.setVisible(overlaps);
      this.labels[i]?.setVisible(overlaps);
      if (bg.input) bg.input.enabled = centreInView;
    }
  }

  private close(): void {
    this.scene.resume('MainScene');
    this.scene.stop();
  }
}
