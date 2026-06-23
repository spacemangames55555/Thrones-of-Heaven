import Phaser from 'phaser';
import { getInsets, UI_MARGIN } from './uiLayout';

// Sits TOP-CENTER, dropped below the top HUD row so it never overlaps the
// top-left health bar + debug readout or the top-right dev button.
const TOP_OFFSET = 92;
const PANEL_W = 320;
const PAD = 10;
const TITLE_GAP = 4;

// Screen-edge arrow geometry.
const ARROW_MARGIN = 44; // how far in from the edge the arrow rides
const EDGE_TEST_MARGIN = 36; // target this close to an edge counts as off-screen

/**
 * Fixed objective tracker (UI camera, unaffected by zoom): the active quest's
 * title and the current objective's text, in a small top-center panel. Hidden
 * whenever no quest is active. Also drives an optional screen-edge arrow that
 * points toward the current world target when it is off-screen.
 *
 * Created in the scene's UI-creation phase so it lands in the UI-camera
 * partition (the main camera ignores it).
 */
export class QuestTracker {
  private readonly scene: Phaser.Scene;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly objText: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Triangle;
  private shown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const depth = 1500;

    this.border = scene.add
      .rectangle(0, 0, PANEL_W + 4, 10, 0xffd24a, 0.92)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth);
    this.bg = scene.add
      .rectangle(0, 0, PANEL_W, 10, 0x0c1626, 0.94)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.titleText = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffd24a',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: PANEL_W - PAD * 2 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.objText = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#eaf2ff',
        align: 'center',
        wordWrap: { width: PANEL_W - PAD * 2 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth + 2);

    // A gold pointer that lives at the screen edge toward an off-screen target.
    this.arrow = scene.add
      .triangle(0, 0, 0, -11, 9, 8, -9, 8, 0xffd24a, 0.95)
      .setStrokeStyle(2, 0x5a4410, 1)
      .setScrollFactor(0)
      .setDepth(depth + 3)
      .setVisible(false);

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.setShown(false);
    this.layout();
  }

  /** Show the panel for the active quest's current objective. */
  show(title: string, objective: string): void {
    this.titleText.setText(title);
    this.objText.setText(objective);
    this.setShown(true);
    this.layout();
  }

  /** Hide the whole tracker (no active quest). */
  hide(): void {
    this.setShown(false);
    this.arrow.setVisible(false);
  }

  /**
   * Point the edge arrow at a world target when it is off-screen, or hide it.
   * Pass null (no target) to hide. Uses the MAIN camera's visible world rect to
   * project the world point into screen space the UI camera shares.
   */
  updateArrow(mainCamera: Phaser.Cameras.Scene2D.Camera, target: { x: number; y: number } | null): void {
    if (!target) {
      this.arrow.setVisible(false);
      return;
    }
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const view = mainCamera.worldView;
    const sx = ((target.x - view.x) / view.width) * w;
    const sy = ((target.y - view.y) / view.height) * h;

    const onScreen =
      sx >= EDGE_TEST_MARGIN &&
      sx <= w - EDGE_TEST_MARGIN &&
      sy >= EDGE_TEST_MARGIN &&
      sy <= h - EDGE_TEST_MARGIN;
    if (onScreen) {
      this.arrow.setVisible(false);
      return;
    }

    const insets = getInsets(this.scene);
    const cx = w / 2;
    const cy = h / 2;
    const minX = insets.left + ARROW_MARGIN;
    const maxX = w - insets.right - ARROW_MARGIN;
    const minY = insets.top + ARROW_MARGIN;
    const maxY = h - insets.bottom - ARROW_MARGIN;
    const px = Phaser.Math.Clamp(sx, minX, maxX);
    const py = Phaser.Math.Clamp(sy, minY, maxY);
    const ang = Math.atan2(sy - cy, sx - cx);
    // The triangle is modeled pointing up (toward -Y), so add a quarter turn.
    this.arrow.setPosition(px, py).setRotation(ang + Math.PI / 2).setVisible(true);
  }

  private setShown(v: boolean): void {
    this.shown = v;
    this.border.setVisible(v);
    this.bg.setVisible(v);
    this.titleText.setVisible(v);
    this.objText.setVisible(v);
  }

  private layout(): void {
    const insets = getInsets(this.scene);
    const cx = this.scene.scale.width / 2;
    const top = insets.top + UI_MARGIN + TOP_OFFSET;

    // Stack the texts, then size the panel to fit them.
    const titleY = top + PAD;
    this.titleText.setPosition(cx, titleY);
    const objY = titleY + (this.shown ? this.titleText.height : 0) + TITLE_GAP;
    this.objText.setPosition(cx, objY);
    const panelH = PAD + this.titleText.height + TITLE_GAP + this.objText.height + PAD;

    this.bg.setPosition(cx, top).setSize(PANEL_W, panelH);
    this.border.setPosition(cx, top - 2).setSize(PANEL_W + 4, panelH + 4);
  }
}
