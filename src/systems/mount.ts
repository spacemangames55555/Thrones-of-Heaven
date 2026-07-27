import Phaser from 'phaser';
import { FEEL } from '../ui/feel-config';
import { MOUNT_SPEED_PX } from '../world/world-scale';

/**
 * MOUNT FRAMEWORK (WORLD SCALE V2, Pass 4) — framework, not content: no mount
 * creature art exists yet (ledgered to the art passes), so the mounted read
 * is the player figure + pooled dust puffs + a slight sprite bob.
 *
 * Rules (gate-enforced):
 *  • Summon: FEEL.mount.castMs cast, interrupted by taking damage. Unlocked
 *    by default this pass (acquisition flag-gated later — ledgered).
 *  • Mounted speed is EXACTLY MOUNT_SPEED_PX (the Pass 1 constant).
 *  • Dismount is instant; AUTO-dismount on taking damage, dealing damage, or
 *    entering any plane (city interiors, Heaven/Hell).
 *  • Mounting is blocked while in combat and inside planes.
 */
export type MountState = 'off' | 'casting' | 'mounted';

export interface MountHost {
  playerSprite(): Phaser.Physics.Arcade.Sprite;
  setMountedSpeed(px: number | null): void;
  inCombat(): boolean;
  /** ?debug=1 observability: names the blocking entity ids (else empty). */
  combatNote(): string;
  onPlane(): boolean;
  dust(x: number, y: number): void;
  banner(text: string): void;
}

export class MountSystem {
  state: MountState = 'off';
  private castStart = 0;
  private baseOriginY?: number;
  private lastDust = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: MountHost,
  ) {}

  get isMounted(): boolean {
    return this.state === 'mounted';
  }

  /** The menu action: toggles off when mounted/casting, else starts the cast. */
  trySummon(): boolean {
    if (this.state !== 'off') {
      this.dismount();
      return false;
    }
    if (this.host.onPlane()) {
      this.host.banner('You cannot summon a mount here.');
      return false;
    }
    if (this.host.inCombat()) {
      this.host.banner('You cannot summon a mount in combat.' + this.host.combatNote());
      return false;
    }
    this.state = 'casting';
    this.castStart = this.scene.time.now;
    this.host.banner('Summoning mount…');
    return true;
  }

  /** Taking damage interrupts the cast and dismounts a rider. */
  onPlayerDamaged(): void {
    if (this.state === 'casting') {
      this.state = 'off';
      this.host.banner('Mount summon interrupted!');
    } else if (this.state === 'mounted') {
      this.dismount('You take a hit — dismounted!');
    }
  }

  /** Dealing damage dismounts (and cancels a cast — combat means no mount). */
  onPlayerDealtDamage(): void {
    if (this.state === 'mounted') this.dismount('Combat — dismounted!');
    else if (this.state === 'casting') this.state = 'off';
  }

  /** Entering any plane (interiors, Heaven/Hell) always dismounts. */
  onEnteredPlane(): void {
    if (this.state !== 'off') this.dismount();
  }

  update(): void {
    const now = this.scene.time.now;
    if (this.state === 'casting' && now - this.castStart >= FEEL.mount.castMs) {
      this.state = 'mounted';
      this.host.setMountedSpeed(MOUNT_SPEED_PX);
      this.baseOriginY = this.host.playerSprite().displayOriginY;
      this.host.banner('Mounted.');
    }
    if (this.state === 'mounted') {
      const s = this.host.playerSprite();
      const body = s.body as Phaser.Physics.Arcade.Body;
      const moving = body.velocity.x !== 0 || body.velocity.y !== 0;
      if (this.baseOriginY !== undefined) {
        s.displayOriginY = this.baseOriginY + (moving ? Math.sin((now / 1000) * Math.PI * 2 * FEEL.mount.bobHz) * FEEL.mount.bobAmpPx : 0);
      }
      if (moving && now - this.lastDust >= FEEL.mount.dustIntervalMs) {
        this.lastDust = now;
        this.host.dust(s.x, s.y + 14);
      }
    }
  }

  dismount(reason?: string): void {
    if (this.state === 'off') return;
    const wasMounted = this.state === 'mounted';
    this.state = 'off';
    this.host.setMountedSpeed(null);
    if (this.baseOriginY !== undefined) {
      this.host.playerSprite().displayOriginY = this.baseOriginY;
      this.baseOriginY = undefined;
    }
    if (wasMounted) this.host.banner(reason ?? 'Dismounted.');
  }
}
