import Phaser from 'phaser';
import { getInsets } from './uiLayout';
import type { QuestTabRow } from './QuestTabScene';

/** One labeled dev button: its caption and the action it fires. */
export interface DevAction {
  label: string;
  onPress: () => void;
}

/** The DEV QUEST TAB hook: a fresh snapshot of the chain + the state-warp callback. */
export interface QuestTabHook {
  /** Snapshot the full quest chain (called fresh on each open, so checkmarks are current). */
  rows: () => QuestTabRow[];
  /** State-warp the game to this quest's start (runs while paused; effective on resume). */
  onJump: (id: string) => void;
}

const TAB_W = 46;
const TAB_H = 66;
const TAB_GAP = 10; // gap between the stacked DEV + QUESTS tabs
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
  private readonly questTab?: QuestTabHook;
  private readonly tabBg: Phaser.GameObjects.Rectangle;
  private readonly tabLabel: Phaser.GameObjects.Text;
  private readonly questBg?: Phaser.GameObjects.Rectangle;
  private readonly questLabel?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, actions: DevAction[], questTab?: QuestTabHook) {
    this.scene = scene;
    this.actions = actions;
    this.questTab = questTab;

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

    // The QUESTS tab sits DIRECTLY UNDER the DEV tab (same left edge), opening the
    // scrollable quest-list / state-warp overlay. Only present when a hook is given.
    if (questTab) {
      this.questBg = scene.add
        .rectangle(0, 0, TAB_W, TAB_H, 0x33240f, 0.92)
        .setStrokeStyle(2, 0xffd24a, 0.95)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setInteractive({ useHandCursor: true });
      this.questLabel = scene.add
        .text(0, 0, 'QUESTS', {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '10px',
          color: '#ffe9a8',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: TAB_W - 6 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
      this.questBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.openQuests());
    }

    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.layout();
  }

  /** Launch the paused, scrollable dev-panel overlay (don't re-open if already up). */
  private open(): void {
    if (this.scene.scene.isActive('DevPanelScene')) return;
    if (this.scene.scene.isActive('QuestTabScene')) return;
    this.scene.scene.launch('DevPanelScene', { actions: this.actions });
    this.scene.scene.pause(); // freeze gameplay underneath; the overlay resumes us on close
  }

  /** Launch the paused, scrollable QUEST TAB overlay (don't re-open if already up). */
  private openQuests(): void {
    if (!this.questTab) return;
    if (this.scene.scene.isActive('QuestTabScene')) return;
    if (this.scene.scene.isActive('DevPanelScene')) return;
    this.scene.scene.launch('QuestTabScene', { rows: this.questTab.rows(), onJump: this.questTab.onJump });
    this.scene.scene.pause();
  }

  private layout(): void {
    const insets = getInsets(this.scene);
    const h = this.scene.scale.height;
    const leftX = insets.left + 6;
    const tabCx = leftX + TAB_W / 2;
    const tabCy = h / 2;
    this.tabBg.setPosition(tabCx, tabCy);
    this.tabLabel.setPosition(tabCx, tabCy);
    // QUESTS tab directly under DEV.
    const questCy = tabCy + TAB_H / 2 + TAB_GAP + TAB_H / 2;
    this.questBg?.setPosition(tabCx, questCy);
    this.questLabel?.setPosition(tabCx, questCy);
  }
}
