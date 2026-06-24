import Phaser from 'phaser';
import { getInsets } from './uiLayout';

/** One labeled dev button: its caption and the action it fires. */
export interface DevAction {
  label: string;
  onPress: () => void;
}

const TAB_W = 46;
const TAB_H = 66;
const BTN_W = 170; // single-column button width
const BTN_W2 = 138; // two-column button width (narrower so two fit left of the zoom buttons)
const COL_GAP = 8; // gap between the two columns
const BTN_GAP = 6;
const BTN_H_MAX = 40;
const BTN_H_MIN = 20;
const TAB_GAP = 8; // space between the tab and the button column
// Above this many buttons, lay them out in TWO columns so they stay tappable on a
// phone (and clear of the right-edge zoom buttons) instead of shrinking to slivers.
const TWO_COL_THRESHOLD = 14;
// The vertical band the expanded column lives in: below the quest tracker, above
// the bottom controls. Button height shrinks to fit however many buttons there are
// (the expanded buttons capture their own taps, so the joystick never spawns under
// them; the bottom action buttons are on the right, clear of this left column).
const BAND_TOP = 186; // clears the top-left cluster + top-centre quest tracker
const BAND_BOTTOM_GAP = 64; // clearance kept above the very bottom controls
const DEPTH = 1550; // above the static HUD/tracker, below the choice/dialogue modals

/**
 * A collapsible, on-screen developer panel routed through the UI camera (fixed,
 * unaffected by zoom). A small "DEV" tab on the mid-LEFT edge toggles a vertical
 * stack of large, labeled buttons — one per dev action — that expands to the
 * right of the tab, vertically centered. It is placed deliberately in the free
 * mid-left band so it clears the HP/XP cluster (top-left), the quest tracker
 * (top-centre), the joystick (bottom-left), and the attack/zoom/talk buttons
 * (right/bottom).
 *
 * Starts COLLAPSED. All objects are created up front (in the scene's UI phase)
 * so they fall in the UI-camera partition; collapsing just hides them and drops
 * their hit areas so they never swallow taps meant for gameplay.
 */
export class DevPanel {
  private readonly scene: Phaser.Scene;
  private readonly tabBg: Phaser.GameObjects.Rectangle;
  private readonly tabLabel: Phaser.GameObjects.Text;
  private readonly buttons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private expanded = false;

  constructor(scene: Phaser.Scene, actions: DevAction[]) {
    this.scene = scene;

    this.tabBg = scene.add
      .rectangle(0, 0, TAB_W, TAB_H, 0x241433, 0.92)
      .setStrokeStyle(2, 0xb98aff, 0.95)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });
    this.tabLabel = scene.add
      .text(0, 0, 'DEV', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '13px',
        color: '#e6ccff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.tabBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.toggle());

    for (const action of actions) {
      const bg = scene.add
        .rectangle(0, 0, BTN_W, BTN_H_MAX, 0x1d2b40, 0.96)
        .setStrokeStyle(2, 0xffd24a, 0.9)
        .setScrollFactor(0)
        .setDepth(DEPTH);
      const label = scene.add
        .text(0, 0, action.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#ffe9a8',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => action.onPress());
      this.buttons.push({ bg, label });
    }

    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.setExpanded(false);
    this.layout();
  }

  private toggle(): void {
    this.setExpanded(!this.expanded);
  }

  private setExpanded(v: boolean): void {
    this.expanded = v;
    this.tabLabel.setText(v ? '×' : 'DEV');
    for (const b of this.buttons) {
      b.bg.setVisible(v);
      b.label.setVisible(v);
      if (v) b.bg.setInteractive({ useHandCursor: true });
      else b.bg.disableInteractive(); // hidden buttons must not catch taps
    }
  }

  private layout(): void {
    const insets = getInsets(this.scene);
    const h = this.scene.scale.height;
    const leftX = insets.left + 6;

    // Tab pinned to the mid-left edge.
    const tabCx = leftX + TAB_W / 2;
    const tabCy = h / 2;
    this.tabBg.setPosition(tabCx, tabCy);
    this.tabLabel.setPosition(tabCx, tabCy);

    // Fit the buttons into the safe band (below the tracker, above the bottom
    // controls). Many buttons → TWO columns (kept left of the right-edge zoom
    // buttons) so each stays a comfortable height instead of a sliver.
    const n = this.buttons.length;
    const cols = n > TWO_COL_THRESHOLD ? 2 : 1;
    const btnW = cols === 2 ? BTN_W2 : BTN_W;
    const rows = Math.ceil(n / cols);
    const fontSize = cols === 2 ? '13px' : '15px';

    const bandTop = insets.top + BAND_TOP;
    const bandBottom = h - insets.bottom - BAND_BOTTOM_GAP;
    const band = Math.max(60, bandBottom - bandTop);
    const btnH = Phaser.Math.Clamp((band - (rows - 1) * BTN_GAP) / rows, BTN_H_MIN, BTN_H_MAX);
    const colH = rows * btnH + (rows - 1) * BTN_GAP;

    const startX = leftX + TAB_W + TAB_GAP;
    const colX = (c: number): number => startX + c * (btnW + COL_GAP) + btnW / 2;
    const top = bandTop + (band - colH) / 2 + btnH / 2;

    this.buttons.forEach((b, i) => {
      const c = i % cols; // row-major: 0,1 / 2,3 / ...
      const r = Math.floor(i / cols);
      const x = colX(c);
      const y = top + r * (btnH + BTN_GAP);
      b.bg.setSize(btnW, btnH);
      b.bg.setPosition(x, y);
      b.label.setPosition(x, y).setFontSize(fontSize);
    });
  }
}
