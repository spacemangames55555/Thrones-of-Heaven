import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { TILE_SIZE } from '../render/tileAtlas';
import { DEMON } from '../game/settings';
import { FEEL } from '../ui/feel-config';

const TEXTURE_KEY = 'demon-enemy';
let NEXT_ID = 1;

type State = 'idle' | 'engage' | 'dead';

/**
 * The DEMON — Hell's basic melee grunt and first infernal enemy. Follows the
 * existing enemy pattern (Cherub/Townsfolk/Sasquatch): IDLE until the player
 * enters aggro range, then chases and strikes in contact range on a cooldown;
 * leashes (de-aggros) when the player flees far / is in another world (the offset
 * coordinate space). Modest HP, grants XP on death (no special loot). A NORMAL-
 * layer enemy; respects terrain collision (the caller adds the collider). Stable
 * id + serializable state.
 */
export class Demon {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly xpReward = DEMON.xpReward;

  /** Fired when a contact strike lands on the player. */
  onMelee?: (damage: number) => void;

  private readonly scene: Phaser.Scene;
  private readonly bar: HealthBar;
  private readonly speed = DEMON.moveTilesPerSec * TILE_SIZE;
  private state: State = 'idle';
  private nextMeleeAt = 0;
  private barShown = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.id = `demon-${NEXT_ID++}`;
    this.scene = scene;
    Demon.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(9);
    this.sprite.setScale(DEMON.scale).setTint(DEMON.color);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 24);
    // No collideWorldBounds — Hell lives in a coordinate offset; the terrain
    // collider (lava/void) contains it (same as the Cherubs/Michael).

    this.health = new Health(DEMON.maxHP);
    this.bar = new HealthBar(scene, 44, 6, 9);
    this.bar.setVisible(false);
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get isAlive(): boolean {
    return this.state !== 'dead';
  }
  get isAggro(): boolean {
    return this.state === 'engage';
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /** Every game object, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite, ...this.bar.objects()];
  }

  /** The tint the hit-flash RESTORES to (region spawns override the default
   *  demon red with their domain tint — game-feel: guaranteed restore). */
  private baseTint: number = DEMON.color;

  setBaseTint(tint: number): void {
    this.baseTint = tint;
    this.sprite.setTint(tint).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  takeHit(amount: number): number {
    if (this.state === 'dead') return 0;
    if (this.state === 'idle') this.state = 'engage';
    const dealt = this.health.damage(amount);
    this.revealBar();
    this.bar.setRatio(this.health.ratio);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(FEEL.flash.flashMs, () => {
      if (this.state !== 'dead') this.sprite.setTint(this.baseTint).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  update(playerX: number, playerY: number, time: number): void {
    if (this.state === 'dead') return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dist = this.distanceTo(playerX, playerY);

    if (this.state === 'idle') {
      if (dist <= DEMON.aggroRange) this.state = 'engage';
      else {
        body.velocity.set(0, 0);
        this.floatBar();
        return;
      }
    }

    // Leash: de-aggro if the player flees beyond aggro / is in another world.
    if (dist > DEMON.aggroRange) {
      this.state = 'idle';
      body.velocity.set(0, 0);
      this.floatBar();
      return;
    }

    this.revealBar();
    this.sprite.setFlipX(playerX < this.sprite.x);
    if (dist <= DEMON.meleeRange) {
      body.velocity.set(0, 0);
      if (time >= this.nextMeleeAt) {
        this.nextMeleeAt = time + DEMON.meleeCooldownMs;
        this.onMelee?.(DEMON.meleeDamage);
      }
    } else {
      const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
      body.velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
    }
    this.floatBar();
  }

  /** LEASH RELEASE (combat hotfix): the engagement funnel drops any
   *  entity beyond FEEL.combat.leashRadiusPx — the flag resets WITH it,
   *  so a frozen/paused aggro state can never outlive its engagement. */
  deaggro(): void {
    if (this.state === 'dead') return;
    this.state = 'idle';
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  halt(): void {
    if (this.state === 'dead') return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  destroy(): void {
    this.state = 'dead';
    for (const o of this.objects()) o.destroy();
  }

  // --- Serialization (enemy state for the future save system) ---------------

  toJSON(): { state: State; hp: number; x: number; y: number } {
    return { state: this.state, hp: this.health.current, x: this.sprite.x, y: this.sprite.y };
  }

  // --- internals ------------------------------------------------------------

  private revealBar(): void {
    if (this.barShown) return;
    this.barShown = true;
    this.bar.setRatio(this.health.ratio);
    this.bar.setVisible(true);
  }
  private floatBar(): void {
    this.bar.setPosition(this.sprite.x - 22, this.sprite.y - (this.sprite.height / 2) * DEMON.scale - 8);
  }

  private die(): void {
    this.state = 'dead';
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.bar.setVisible(false);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: DEMON.scale * 1.4,
      duration: 320,
      ease: 'Quad.out',
      onComplete: () => {
        for (const o of this.bar.objects()) o.destroy();
        this.sprite.destroy();
      },
    });
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 30;
    const h = 38;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const cx = w / 2;
    // A squat demonic grunt (drawn WHITE so the per-instance tint colors it red):
    // dark body, horns, glowing eyes, clawed stance.
    g.fillStyle(0x140805, 1); // dark outline body
    g.fillRoundedRect(5, 12, w - 10, h - 14, 5);
    g.fillStyle(0xffffff, 1); // body (tinted red by the sprite)
    g.fillRoundedRect(7, 14, w - 14, h - 18, 4);
    g.fillStyle(0x140805, 1); // head outline
    g.fillCircle(cx, 12, 8);
    g.fillStyle(0xffffff, 1); // head
    g.fillCircle(cx, 12, 6.5);
    // Horns.
    g.fillStyle(0x140805, 1);
    g.fillTriangle(cx - 7, 8, cx - 3, 8, cx - 7, 0);
    g.fillTriangle(cx + 7, 8, cx + 3, 8, cx + 7, 0);
    // Glowing eyes.
    g.fillStyle(0xfff14a, 1);
    g.fillCircle(cx - 2.5, 12, 1.6);
    g.fillCircle(cx + 2.5, 12, 1.6);
    // Clawed feet.
    g.fillStyle(0x140805, 1);
    g.fillRect(8, h - 4, 5, 4);
    g.fillRect(w - 13, h - 4, 5, 4);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}
