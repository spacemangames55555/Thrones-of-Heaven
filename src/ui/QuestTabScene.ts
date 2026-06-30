import Phaser from 'phaser';
import { getInsets } from './uiLayout';

/**
 * One quest row for the DEV QUEST TAB. The scene groups consecutive rows that
 * share a `group` under a single act header, shows a completion checkmark for any
 * quest in the chain's completed set, and lets a tap warp the game to that quest.
 */
export interface QuestTabRow {
  id: string;
  group: string; // act / arc header (consecutive rows with the same group are grouped)
  code: string; // short chain code, e.g. '4.6'
  title: string;
  completed: boolean;
  active: boolean;
}

export interface QuestTabData {
  rows: QuestTabRow[];
  /** Perform the state-warp to this quest (mutates the paused MainScene; takes effect on resume). */
  onJump: (id: string) => void;
}

/**
 * DEV QUEST TAB (DEV_MODE only) — a paused, vertically-scrollable list of the FULL
 * quest chain in order, grouped by act, each row marked complete (✓) / active (●).
 * Tapping a row asks to CONFIRM, then STATE-WARPS the game to that quest's start
 * (corruption / world / position / power all set up by MainScene.devJumpToQuest).
 *
 * It is its OWN scene launched on top of MainScene which is PAUSED underneath (the
 * same launch+pause pattern as {@link DevPanelScene}), so opening it freezes all
 * gameplay and closing it resumes. The jump runs while paused and takes effect on
 * resume, exactly like the dev-panel actions.
 *
 * >>> DEV TOOLING ONLY — additive + DEV_MODE-gated; never affects normal play. <<<
 */
const PAD = 12;
const HEADER_H = 46; // title + close row
const ROW_H = 40; // a quest row
const GROUP_H = 26; // an act-header row
const ROW_GAP = 4;
const FONT_PX = 13;
const GROUP_FONT_PX = 12;
const DRAG_THRESHOLD = 8; // px of finger travel that turns a tap into a scroll

export class QuestTabScene extends Phaser.Scene {
  private tabData: QuestTabData = { rows: [], onJump: () => {} };
  private list!: Phaser.GameObjects.Container;
  private rowBgs: { bg: Phaser.GameObjects.Rectangle; id: string }[] = [];
  private rowLabels: Phaser.GameObjects.Text[] = [];
  private vp = { x: 0, y: 0, w: 0, h: 0 };
  private scrollMin = 0;
  private dragging = false;
  private dragStartPointerY = 0;
  private dragStartContainerY = 0;
  private dragMoved = false;
  private confirm?: Phaser.GameObjects.Container;

  constructor() {
    super('QuestTabScene');
  }

  init(data: QuestTabData): void {
    this.tabData = { rows: data.rows ?? [], onJump: data.onJump ?? (() => {}) };
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const insets = getInsets(this);
    const cx = w / 2;

    // Dim + eat taps behind the panel.
    this.add.rectangle(cx, h / 2, w, h, 0x05060a, 0.6).setInteractive();

    const panelW = Math.min(380, w - 24);
    const panelTop = insets.top + 16;
    const panelBottom = h - insets.bottom - 16;
    const panelH = Math.max(160, panelBottom - panelTop);
    this.add
      .rectangle(cx, panelTop + panelH / 2, panelW, panelH, 0x121417, 0.98)
      .setStrokeStyle(2, 0xffd24a, 0.9);

    const panelLeft = cx - panelW / 2;
    const panelRight = cx + panelW / 2;

    // Header: title + close (×). Closing always resumes MainScene.
    this.add
      .text(panelLeft + PAD, panelTop + HEADER_H / 2, 'QUESTS — paused', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '15px',
        color: '#ffe9a8',
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

    // Scroll viewport.
    this.vp = {
      x: panelLeft + PAD,
      y: panelTop + HEADER_H,
      w: panelW - PAD * 2,
      h: panelBottom - (panelTop + HEADER_H) - PAD,
    };

    this.list = this.add.container(0, 0);
    const maskG = this.add.graphics().setVisible(false);
    maskG.fillStyle(0xffffff);
    maskG.fillRect(this.vp.x, this.vp.y, this.vp.w, this.vp.h);
    this.list.setMask(maskG.createGeometryMask());

    // Build rows: insert an act header whenever the group changes.
    let y = this.vp.y;
    let lastGroup: string | null = null;
    for (const row of this.tabData.rows) {
      if (row.group !== lastGroup) {
        lastGroup = row.group;
        const gh = this.add
          .text(this.vp.x + 2, y + GROUP_H / 2, row.group, {
            fontFamily: 'ui-monospace, monospace',
            fontSize: `${GROUP_FONT_PX}px`,
            color: '#9fb4d8',
            fontStyle: 'bold',
          })
          .setOrigin(0, 0.5);
        this.list.add(gh);
        y += GROUP_H;
      }
      const mark = row.completed ? '✓ ' : row.active ? '● ' : '   ';
      const color = row.completed ? '#7fd98a' : row.active ? '#ffe06a' : '#dfe7f4';
      const bg = this.add
        .rectangle(this.vp.x + this.vp.w / 2, y + ROW_H / 2, this.vp.w, ROW_H, 0x1d2330, 0.96)
        .setStrokeStyle(1, 0x3a4660, 0.9)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(this.vp.x + 10, y + ROW_H / 2, `${mark}${row.code} · ${row.title}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: `${FONT_PX}px`,
          color,
          wordWrap: { width: this.vp.w - 20 },
        })
        .setOrigin(0, 0.5);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        if (!this.dragMoved && !this.confirm) this.askConfirm(row);
      });
      this.list.add(bg);
      this.list.add(label);
      this.rowBgs.push({ bg, id: row.id });
      this.rowLabels.push(label);
      y += ROW_H + ROW_GAP;
    }

    const contentH = y - this.vp.y;
    this.scrollMin = Math.min(0, this.vp.h - contentH);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.scrollBy(-dy));

    this.updateRowInput();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  private onResize(): void {
    this.scene.restart(this.tabData);
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.confirm) return;
    this.dragMoved = false;
    if (this.scrollMin >= 0) return;
    this.dragging = true;
    this.dragStartPointerY = p.y;
    this.dragStartContainerY = this.list.y;
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (!this.dragging || !p.isDown) return;
    const dy = p.y - this.dragStartPointerY;
    if (Math.abs(dy) > DRAG_THRESHOLD) this.dragMoved = true;
    this.list.y = Phaser.Math.Clamp(this.dragStartContainerY + dy, this.scrollMin, 0);
    this.updateRowInput();
  }

  private onPointerUp(): void {
    this.dragging = false;
  }

  private scrollBy(delta: number): void {
    if (this.scrollMin >= 0 || this.confirm) return;
    this.list.y = Phaser.Math.Clamp(this.list.y + delta, this.scrollMin, 0);
    this.updateRowInput();
  }

  /** Hide rows scrolled out of the viewport; disable taps on rows whose centre is out of view. */
  private updateRowInput(): void {
    const top = this.vp.y;
    const bottom = this.vp.y + this.vp.h;
    for (let i = 0; i < this.rowBgs.length; i++) {
      const bg = this.rowBgs[i].bg;
      const effY = bg.y + this.list.y;
      const half = bg.height / 2;
      const overlaps = effY + half >= top && effY - half <= bottom;
      const centreInView = effY >= top && effY <= bottom;
      bg.setVisible(overlaps);
      this.rowLabels[i]?.setVisible(overlaps);
      if (bg.input) bg.input.enabled = centreInView && !this.confirm;
    }
  }

  /** A modal confirm over the list: "Jump to <code>? ..." with Jump / Cancel. */
  private askConfirm(row: QuestTabRow): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const boxW = Math.min(340, w - 40);
    const boxH = 200;

    const c = this.add.container(0, 0).setDepth(10);
    const shade = this.add.rectangle(cx, cy, w, h, 0x05060a, 0.55).setInteractive();
    const box = this.add.rectangle(cx, cy, boxW, boxH, 0x161a22, 0.99).setStrokeStyle(2, 0xffd24a, 0.95);
    const q = this.add
      .text(cx, cy - boxH / 2 + 18, `Jump to ${row.code} · ${row.title}?`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: boxW - 28 },
      })
      .setOrigin(0.5, 0);
    const note = this.add
      .text(cx, cy - 6, 'This marks all prior quests complete and sets up this quest (corruption, world, position).', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#c4cee0',
        align: 'center',
        wordWrap: { width: boxW - 28 },
      })
      .setOrigin(0.5, 0);

    const btnW = (boxW - 28 - 12) / 2;
    const btnY = cy + boxH / 2 - 30;
    const jumpBg = this.add
      .rectangle(cx - btnW / 2 - 6, btnY, btnW, 40, 0x214a24, 0.98)
      .setStrokeStyle(2, 0x7fd98a, 1)
      .setInteractive({ useHandCursor: true });
    const jumpLabel = this.add
      .text(cx - btnW / 2 - 6, btnY, 'Jump', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#eaffea', fontStyle: 'bold' })
      .setOrigin(0.5);
    const cancelBg = this.add
      .rectangle(cx + btnW / 2 + 6, btnY, btnW, 40, 0x2a2f3a, 0.98)
      .setStrokeStyle(2, 0x7f8aa0, 1)
      .setInteractive({ useHandCursor: true });
    const cancelLabel = this.add
      .text(cx + btnW / 2 + 6, btnY, 'Cancel', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#dfe7f4', fontStyle: 'bold' })
      .setOrigin(0.5);

    // Pull everything into the container (added bg-before-label) so it tears down together.
    c.add([shade, box, q, note, jumpBg, jumpLabel, cancelBg, cancelLabel]);

    shade.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.closeConfirm());
    cancelBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.closeConfirm());
    jumpBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      const id = row.id;
      this.closeConfirm();
      this.tabData.onJump(id); // mutate the paused MainScene
      this.close(); // resume — the warp takes effect
    });

    this.confirm = c;
    this.updateRowInput();
  }

  private closeConfirm(): void {
    this.confirm?.destroy(true);
    this.confirm = undefined;
    this.updateRowInput();
  }

  private close(): void {
    this.scene.resume('MainScene');
    this.scene.stop();
  }
}
