import Phaser from 'phaser';
import { getInsets } from './uiLayout';

/** One labeled dev button: its caption and the action it fires. */
export interface DevAction {
  label: string;
  onPress: () => void;
}

const TAB_W = 46;
const TAB_H = 66;
const DEPTH = 1550; // above the static HUD/tracker, below the choice/dialogue modals

/**
 * The on-screen DEV tab (DEV_MODE only), routed through the UI camera (fixed,
 * unaffected by zoom). A small "DEV" tab on the mid-LEFT edge OPENS the dev panel:
 * it launches {@link DevPanelScene} on top and PAUSES the game underneath, then the
 * overlay shows every dev action as a scrollable, paused button list and resumes the
 * game when closed. The tab sits in the free mid-left band so it clears the HP/XP
 * cluster (top-left), the quest tracker (top-centre), the joystick (bottom-left), and
 * the attack/zoom/talk buttons (right/bottom).
 *
 * (Previously the buttons expanded in-scene in multi-column form; they overflowed a
 * phone screen and couldn't be paused. The list + pause now live in DevPanelScene.)
 */
export class DevPanel {
  private readonly scene: Phaser.Scene;
  private readonly actions: DevAction[];
  private readonly tabBg: Phaser.GameObjects.Rectangle;
  private readonly tabLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, actions: DevAction[]) {
    this.scene = scene;
    this.actions = actions;

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
    this.tabBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.open());

    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.layout();
  }

  /** Launch the paused, scrollable dev-panel overlay (don't re-open if already up). */
  private open(): void {
    if (this.scene.scene.isActive('DevPanelScene')) return;
    this.scene.scene.launch('DevPanelScene', { actions: this.actions });
    this.scene.scene.pause(); // freeze gameplay underneath; the overlay resumes us on close
  }

  private layout(): void {
    const insets = getInsets(this.scene);
    const h = this.scene.scale.height;
    const leftX = insets.left + 6;
    const tabCx = leftX + TAB_W / 2;
    const tabCy = h / 2;
    this.tabBg.setPosition(tabCx, tabCy);
    this.tabLabel.setPosition(tabCx, tabCy);
  }
}
