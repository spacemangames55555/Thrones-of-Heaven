import Phaser from 'phaser';
import { getInsets } from './uiLayout';

/** One labeled dev button: its caption and the action it fires. */
export interface DevAction {
  label: string;
  onPress: () => void;
}

const TAB_W = 46;
const TAB_H = 66;
const BTN_W = 170;
const BTN_H = 40;
const BTN_GAP = 8;
const TAB_GAP = 8; // space between the tab and the button column
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
        .rectangle(0, 0, BTN_W, BTN_H, 0x1d2b40, 0.96)
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

    // Button column, vertically centered, just right of the tab.
    const n = this.buttons.length;
    const colH = n * BTN_H + (n - 1) * BTN_GAP;
    const colX = leftX + TAB_W + TAB_GAP + BTN_W / 2;
    let y = h / 2 - colH / 2 + BTN_H / 2;
    for (const b of this.buttons) {
      b.bg.setPosition(colX, y);
      b.label.setPosition(colX, y);
      y += BTN_H + BTN_GAP;
    }
  }
}
