import Phaser from 'phaser';

const HINT_MARGIN = 92;
const BASE_RADIUS = 56;
const THUMB_RADIUS = 28;
const DEADZONE = 0.18;

export interface Direction {
  x: number;
  y: number;
}

/**
 * Unified movement input: WASD / arrow keys for desktop AND an on-screen
 * virtual joystick for touch. The joystick is dynamic — it springs up wherever
 * the player first touches — with a faint persistent hint ring in the corner so
 * it stays discoverable. Both input methods are always live; keyboard wins when
 * a key is held, otherwise the joystick vector is used.
 */
export class Controls {
  private readonly scene: Phaser.Scene;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  private readonly hint: Phaser.GameObjects.Arc;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;

  private activePointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private joyX = 0;
  private joyY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard input not available');
    this.keys = kb.addKeys(
      'W,A,S,D,UP,DOWN,LEFT,RIGHT',
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    // Faint hint ring in the lower-left so the joystick is discoverable.
    this.hint = scene.add
      .circle(0, 0, BASE_RADIUS, 0xffffff, 0.06)
      .setStrokeStyle(2, 0xffffff, 0.18)
      .setScrollFactor(0)
      .setDepth(1000);

    this.base = scene.add
      .circle(0, 0, BASE_RADIUS, 0xffffff, 0.1)
      .setStrokeStyle(3, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    this.thumb = scene.add
      .circle(0, 0, THUMB_RADIUS, 0xffd24a, 0.85)
      .setScrollFactor(0)
      .setDepth(1002)
      .setVisible(false);

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    scene.input.addPointer(1); // allow a second touch for future on-screen buttons
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
  }

  /** Current movement vector, components in [-1, 1]. */
  getDirection(): Direction {
    let kx = 0;
    let ky = 0;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) kx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) kx += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) ky -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) ky += 1;

    if (kx !== 0 || ky !== 0) return { x: kx, y: ky };
    return { x: this.joyX, y: this.joyY };
  }

  private layout(): void {
    const h = this.scene.scale.height;
    this.hint.setPosition(HINT_MARGIN, h - HINT_MARGIN);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) return;
    this.activePointerId = pointer.id;
    this.originX = pointer.x;
    this.originY = pointer.y;
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    let dx = pointer.x - this.originX;
    let dy = pointer.y - this.originY;
    const dist = Math.hypot(dx, dy);
    if (dist > BASE_RADIUS) {
      dx = (dx / dist) * BASE_RADIUS;
      dy = (dy / dist) * BASE_RADIUS;
    }
    this.thumb.setPosition(this.originX + dx, this.originY + dy);

    let nx = dx / BASE_RADIUS;
    let ny = dy / BASE_RADIUS;
    if (Math.hypot(nx, ny) < DEADZONE) {
      nx = 0;
      ny = 0;
    }
    this.joyX = nx;
    this.joyY = ny;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this.joyX = 0;
    this.joyY = 0;
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }
}
