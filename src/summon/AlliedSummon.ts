import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { TILE_SIZE } from '../render/tileAtlas';
import { hasOverrideArt } from '../render/spriteOverrides';
import type { AlliedSummonConfig } from './summonData';

/**
 * What an ATTACKER summon needs from the scene each frame to fight: find the nearest enemy
 * (for movement + targeting) and deal damage (routed through the scene's shared AoE/death
 * handling so XP/quests/boss logic all fire). Kept narrow so the summon stays decoupled.
 */
export interface SummonCombatCtx {
  /** Nearest live enemy to (x,y) within maxRange, or null. */
  nearestEnemy(x: number, y: number, maxRange: number): { x: number; y: number; dist: number } | null;
  /** Deal `damage` to enemies within `range` of (x,y) (reuses the scene's AoE/death path). */
  attack(x: number, y: number, range: number, damage: number): void;
  /**
   * RANGED-attacker: spawn a pooled PLAYER-faction projectile from (fromX,fromY) toward
   * (targetX,targetY). Reuses the EXISTING friendly-projectile pipeline (ProjectileSystem,
   * pooled) — no new projectile system, no per-shot allocation churn.
   */
  fireProjectile(fromX: number, fromY: number, targetX: number, targetY: number, damage: number, speed: number, range: number, radius: number, color: number): void;
  /** Apply a DoT to enemies within `radius` of (x,y) — the `attackDot` rider (Viper poison /
   *  Wolverine bleed) routed through the scene's shared DoT system. Optional (older ctxs). */
  applyDot?(x: number, y: number, radius: number, dmgPerTick: number, tickMs: number, durationMs: number, color: number): void;
}

/**
 * A PLAYER-ALLIED SUMMON — the mirror of an enemy/boss add, allegiance flipped.
 *
 * Generic across summon types via its {@link AlliedSummonConfig}: it has a stable id,
 * its own HP pool + floating bar, a lifespan (expires after a duration OR at 0 HP), and
 * a data-driven behavior. The only behavior implemented now is 'tank' (follow the player
 * + draw aggro + soak; no attack — the Ice Golem). The 'attacker' branch is left open so
 * a future Necromancer minion is a pure data addition (give it attackDamage/cadence and
 * fill the marked branch in {@link update}).
 *
 * Drawn by the world camera; the scene routes {@link objects} past the UI camera and adds
 * the terrain collider, exactly like the enemy entities.
 */
export class AlliedSummon {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly config: AlliedSummonConfig;

  private readonly bar: HealthBar;
  private readonly speed: number;
  private readonly expireAt: number;
  private dead = false;

  // PET-TARGETED BUFFS (live multipliers pushed in each frame by the manager). damageBonus
  // scales attack damage; defense is applied via the health pool's incomingMultiplier;
  // appliedHpMult tracks the max-HP scaling currently baked in so it can be re-scaled/reverted.
  private damageBonus = 0;
  private appliedHpMult = 1;
  /** +fraction of attack speed from timed buffs (Bestial Rage / Trueshot Aura):
   *  the swing cooldown divides by (1 + this). 0 = unmodified. */
  private attackSpeedBonus = 0;
  /** Aggro-pull radius multiplier (Marrow Skeleton widens it) + melee reach multiplier
   *  (Tentacles makes the Monster cleave farther). 1 = unmodified. */
  private aggroRadiusMult = 1;
  private attackRangeMult = 1;
  /** Next time (ms) this attacker may swing again. */
  private attackReadyAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: AlliedSummonConfig, id: string, durationMsOverride?: number) {
    this.id = id;
    this.config = config;
    AlliedSummon.ensureTexture(scene, config);

    this.sprite = scene.physics.add.sprite(x, y, AlliedSummon.textureKey(config)).setDepth(9);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(config.bodyRadius, this.sprite.width / 2 - config.bodyRadius, this.sprite.height / 2 - config.bodyRadius);
    this.sprite.setCollideWorldBounds(true);

    this.speed = config.moveTilesPerSec * TILE_SIZE;
    this.health = new Health(config.maxHP);
    this.bar = new HealthBar(scene, 56, 7, 9, 0x6fd0ff); // fixed icy-blue fill (it's an ally)
    this.bar.setRatio(1);
    this.bar.setVisible(true);
    this.expireAt = scene.time.now + (durationMsOverride ?? config.durationMs);
    this.floatBar();
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get isAlive(): boolean {
    return !this.dead;
  }
  get aggroRadius(): number {
    return this.config.aggroRadius * this.aggroRadiusMult;
  }
  get drawsAggro(): boolean {
    return this.config.drawsAggro && !this.dead;
  }
  /** Aggro priority weight (3-tier hierarchy): higher = enemies prefer this target. */
  get aggroPriority(): number {
    return this.config.aggroPriority;
  }
  get bodyRadius(): number {
    return this.config.bodyRadius;
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /** Every game object, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite, ...this.bar.objects()];
  }

  /** Has the summon outlived its duration? (HP-death is handled in takeHit.) */
  isExpired(time: number): boolean {
    return time >= this.expireAt;
  }

  /** Heal the summon (friendly zones / the dual-use mending bolt). Clamped to max HP. */
  heal(amount: number): void {
    if (this.dead) return;
    this.health.heal(amount);
    this.bar.setRatio(this.health.ratio);
  }

  /** Apply enemy damage to the summon; returns damage dealt. Dies/shatters at 0 HP. */
  takeHit(amount: number): number {
    if (this.dead) return 0;
    const dealt = this.health.damage(amount);
    this.bar.setRatio(this.health.ratio);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(70, () => {
      if (this.dead) return;
      // Full-color drop-in art is shown as-is; the stylizing tint belongs to
      // the code-drawn placeholders only.
      if (hasOverrideArt(AlliedSummon.textureKey(this.config))) this.sprite.clearTint();
      else this.sprite.setTint(this.config.tint).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /**
   * Per-frame behavior.
   *  - tank: re-approach the player when too far, else hold + soak (no attack).
   *  - attacker: hunt the nearest enemy within seekRange (while not leashed too far from the
   *    player), move into attackRange, then swing on cadence; with no enemy near, idle-follow
   *    the player (so it stays with you instead of wandering). Both reuse simple velocity
   *    steering, matching the enemy entities' movement.
   */
  update(playerX: number, playerY: number, time: number, ctx?: SummonCombatCtx): void {
    if (this.dead) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.config.behavior === 'ranged') {
      this.updateRanged(body, playerX, playerY, time, ctx);
    } else if (this.config.behavior === 'attacker') {
      this.updateAttacker(body, playerX, playerY, time, ctx);
    } else {
      // 'tank' (Ice Golem): hold ground as a meat-shield; re-approach when the player strays.
      const dist = this.distanceTo(playerX, playerY);
      if (dist > this.config.followRange) {
        this.steerToward(body, playerX, playerY);
      } else {
        body.velocity.set(0, 0);
      }
    }
    this.floatBar();
  }

  /** ATTACKER steering + melee cadence. */
  private updateAttacker(body: Phaser.Physics.Arcade.Body, playerX: number, playerY: number, time: number, ctx?: SummonCombatCtx): void {
    const seek = this.config.seekRange ?? this.config.aggroRadius;
    const leash = this.config.leashRange ?? 600;
    const enemy = ctx?.nearestEnemy(this.sprite.x, this.sprite.y, seek) ?? null;
    // Hunt the enemy only while we haven't strayed too far from the player; otherwise return.
    if (enemy && this.distanceTo(playerX, playerY) <= leash) {
      const reach = (this.config.attackRange ?? 48) * this.attackRangeMult; // Tentacles widens the cleave
      if (enemy.dist <= reach) {
        body.velocity.set(0, 0); // in range: plant + swing
        this.sprite.setFlipX(enemy.x < this.sprite.x);
        if (time >= this.attackReadyAt) {
          const dmg = Math.round((this.config.attackDamage ?? 0) * (1 + this.damageBonus));
          ctx?.attack(enemy.x, enemy.y, reach, dmg);
          // attackDot rider: the hit also POISONS/BLEEDS what it struck (Viper/Wolverine).
          const dot = this.config.attackDot;
          if (dot) ctx?.applyDot?.(enemy.x, enemy.y, reach, dot.dmgPerTick, dot.tickMs, dot.durationMs, dot.color);
          this.attackReadyAt = time + (this.config.attackCooldownMs ?? 1000) / (1 + Math.max(0, this.attackSpeedBonus));
          this.swingFx();
        }
      } else {
        this.steerToward(body, enemy.x, enemy.y); // close the distance
      }
      return;
    }
    // No enemy in range (or leashed) → idle-follow the player.
    if (this.distanceTo(playerX, playerY) > this.config.followRange) this.steerToward(body, playerX, playerY);
    else body.velocity.set(0, 0);
  }

  /**
   * RANGED-attacker (backline): hold position near the player and FIRE a pooled player-faction
   * projectile at any enemy inside the fire range, on cadence, for low damage. It NEVER charges
   * into melee — if an enemy is in fire range it plants + shoots; otherwise it idle-follows the
   * player (staying behind you). No aggro (drawsAggro=false), so enemies ignore it entirely.
   */
  private updateRanged(body: Phaser.Physics.Arcade.Body, playerX: number, playerY: number, time: number, ctx?: SummonCombatCtx): void {
    const fireRange = this.config.attackRange ?? 320; // 'ranged' reuses attackRange as the FIRE range
    const enemy = ctx?.nearestEnemy(this.sprite.x, this.sprite.y, fireRange) ?? null;
    if (enemy) {
      body.velocity.set(0, 0); // plant + fire (backline: does not close the distance)
      this.sprite.setFlipX(enemy.x < this.sprite.x);
      if (time >= this.attackReadyAt && ctx?.fireProjectile) {
        const dmg = Math.round((this.config.attackDamage ?? 0) * (1 + this.damageBonus));
        ctx.fireProjectile(
          this.sprite.x,
          this.sprite.y,
          enemy.x,
          enemy.y,
          dmg,
          this.config.projectileSpeed ?? 440,
          fireRange + 120, // bolt travels a bit past the fire range before despawning
          this.config.projectileRadius ?? 7,
          this.config.projectileColor ?? 0xff6a4a,
        );
        this.attackReadyAt = time + (this.config.attackCooldownMs ?? 900) / (1 + Math.max(0, this.attackSpeedBonus));
        this.swingFx();
      }
      return;
    }
    // No enemy in fire range → idle-follow the player so it stays behind you.
    if (this.distanceTo(playerX, playerY) > this.config.followRange) this.steerToward(body, playerX, playerY);
    else body.velocity.set(0, 0);
  }

  /** Point the body at (tx,ty) at full move speed + face that way. */
  private steerToward(body: Phaser.Physics.Arcade.Body, tx: number, ty: number): void {
    const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
    body.velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
    this.sprite.setFlipX(tx < this.sprite.x);
  }

  /** A quick scale-punch when the summon swings (cheap attack feedback). */
  private swingFx(): void {
    if (this.dead) return;
    this.sprite.scene.tweens.add({ targets: this.sprite, scale: 1.18, duration: 90, yoyo: true, ease: 'Quad.out' });
  }

  /**
   * PET BUFF application (called every frame by the manager with the AGGREGATE multipliers).
   * Damage is read live at swing time; defense routes through the health pool's incoming
   * multiplier; max-HP scaling is re-applied only when the multiplier actually changes (and
   * reverted, current clamped, when a buff lapses) so it works for current + new summons.
   */
  applyBuffs(damageBonus: number, drBonus: number, hpMult: number, aggroRadiusMult = 1, attackRangeMult = 1, attackSpeedBonus = 0): void {
    if (this.dead) return;
    this.damageBonus = damageBonus;
    this.aggroRadiusMult = aggroRadiusMult;
    this.attackRangeMult = attackRangeMult;
    this.attackSpeedBonus = attackSpeedBonus;
    this.health.incomingMultiplier = Math.max(0.1, 1 - drBonus); // take (1-dr)x damage
    if (Math.abs(hpMult - this.appliedHpMult) > 1e-4) {
      const factor = hpMult / this.appliedHpMult;
      this.health.max = Math.max(1, Math.round(this.config.maxHP * hpMult));
      this.health.current = Math.min(this.health.max, Math.max(1, Math.round(this.health.current * factor)));
      this.appliedHpMult = hpMult;
      this.bar.setRatio(this.health.ratio);
    }
  }

  /** Stop moving (player frozen in dialogue / death). */
  halt(): void {
    if (this.dead) return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** Remove entirely (expiry / dev clear / teardown). */
  destroy(): void {
    this.dead = true;
    for (const o of this.objects()) o.destroy();
  }

  private floatBar(): void {
    this.bar.setPosition(this.sprite.x - 28, this.sprite.y - this.sprite.height / 2 - 8);
  }

  /** Death: shatter, then clean up the sprite + bar. */
  private die(): void {
    this.dead = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.bar.setVisible(false);
    for (const o of this.bar.objects()) o.destroy();
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 1.3,
      duration: 320,
      ease: 'Quad.out',
      onComplete: () => this.sprite.destroy(),
    });
  }

  private static textureKey(config: AlliedSummonConfig): string {
    return `summon-${config.key}`;
  }

  /** Build the summon's placeholder texture once (per type). Ice Golem = a chunky icy figure. */
  private static ensureTexture(scene: Phaser.Scene, config: AlliedSummonConfig): void {
    const key = AlliedSummon.textureKey(config);
    if (scene.textures.exists(key)) return;
    const w = 46;
    const h = 56;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    if (config.key === 'ice_golem') {
      // A blocky ice golem: dark outline, pale-blue crystalline body, frost facets, glowing eyes.
      g.fillStyle(0x123040, 1);
      g.fillRoundedRect(4, 10, w - 8, h - 12, 7); // outline
      g.fillStyle(0x7fc9ef, 1);
      g.fillRoundedRect(7, 13, w - 14, h - 18, 6); // icy body
      g.fillStyle(0xbfeaff, 1);
      g.fillRect(w / 2 - 10, 18, 7, h - 28); // frost facet
      g.fillRect(w / 2 + 3, 22, 6, h - 34);
      g.fillStyle(0xe8f8ff, 0.9);
      g.fillCircle(w / 2, 16, 8); // head
      g.fillStyle(0x123040, 1);
      g.fillCircle(w / 2, 16, 9);
      g.fillStyle(0x9fe0ff, 1);
      g.fillCircle(w / 2, 16, 7);
      g.fillStyle(0x2bd6ff, 1); // glowing eyes
      g.fillCircle(w / 2 - 3, 15, 1.8);
      g.fillCircle(w / 2 + 3, 15, 1.8);
      // Blocky arms.
      g.fillStyle(0x6bbfe6, 1);
      g.fillRoundedRect(2, 22, 8, 20, 3);
      g.fillRoundedRect(w - 10, 22, 8, 20, 3);
    } else if (config.key === 'skeleton') {
      // A lean bone-white skeleton: dark outline, pale ribs/limbs, a skull with sockets.
      g.fillStyle(0x2a2a22, 1);
      g.fillRoundedRect(13, 12, w - 26, h - 14, 5); // torso outline
      g.fillStyle(0xe6e3d6, 1);
      g.fillRoundedRect(15, 14, w - 30, h - 18, 4); // bone torso
      g.fillStyle(0x8f8c7e, 1); // rib shadows
      g.fillRect(17, 22, w - 34, 2);
      g.fillRect(17, 28, w - 34, 2);
      g.fillRect(17, 34, w - 34, 2);
      g.fillStyle(0xe6e3d6, 1); // arms
      g.fillRoundedRect(8, 18, 5, 22, 2);
      g.fillRoundedRect(w - 13, 18, 5, 22, 2);
      g.fillStyle(0x2a2a22, 1); // skull outline
      g.fillCircle(w / 2, 12, 9);
      g.fillStyle(0xf2efe2, 1); // skull
      g.fillCircle(w / 2, 12, 7.5);
      g.fillStyle(0x1a1a14, 1); // eye sockets
      g.fillCircle(w / 2 - 3, 11, 2);
      g.fillCircle(w / 2 + 3, 11, 2);
      g.fillRect(w / 2 - 0.8, 14, 1.6, 3); // nasal
    } else if (config.key === 'dark_matter_monster') {
      // A large roiling dark-matter horror: black-violet bulk, an inner glow, baleful eyes,
      // jagged limbs. Bigger silhouette than the others (it's the tank-pet).
      g.fillStyle(0x140a26, 1);
      g.fillRoundedRect(2, 6, w - 4, h - 8, 12); // dark outline
      g.fillStyle(0x3a2068, 1);
      g.fillRoundedRect(5, 9, w - 10, h - 12, 11); // violet bulk
      g.fillStyle(0x6a3fb0, 1); // inner glow
      g.fillRoundedRect(11, 16, w - 22, h - 26, 9);
      g.fillStyle(0xb78bff, 0.9);
      g.fillCircle(w / 2, h / 2, 8); // core
      g.fillStyle(0x05030a, 1); // jagged limbs
      g.fillTriangle(2, 20, 12, 26, 2, 40);
      g.fillTriangle(w - 2, 20, w - 12, 26, w - 2, 40);
      g.fillStyle(0xe6d2ff, 1); // baleful eyes
      g.fillCircle(w / 2 - 7, 18, 2.6);
      g.fillCircle(w / 2 + 7, 18, 2.6);
      g.fillStyle(0xff5cc8, 1);
      g.fillCircle(w / 2 - 7, 18, 1.1);
      g.fillCircle(w / 2 + 7, 18, 1.1);
    } else if (config.key === 'ranged_ally' || config.key === 'demon_ally') {
      // A demon imp caster: dark-red hooded body, ember core, horns, glowing eyes — reads as a
      // demonic ally flinging bolts from the backline (the Act IV "demons at your back" style).
      g.fillStyle(0x2a0d0a, 1);
      g.fillRoundedRect(6, 12, w - 12, h - 14, 8); // dark outline
      g.fillStyle(0x7a1f16, 1);
      g.fillRoundedRect(9, 15, w - 18, h - 20, 7); // deep-red robe
      g.fillStyle(0xc23a22, 1); // inner robe highlight
      g.fillRoundedRect(13, 20, w - 26, h - 30, 5);
      g.fillStyle(0xff8a3a, 0.95); // ember core (the gathered bolt)
      g.fillCircle(w / 2, h / 2 + 4, 6);
      g.fillStyle(0x2a0d0a, 1); // head outline
      g.fillCircle(w / 2, 15, 9);
      g.fillStyle(0x8f271b, 1); // head
      g.fillCircle(w / 2, 15, 7.5);
      g.fillStyle(0x1a0705, 1); // horns
      g.fillTriangle(w / 2 - 8, 10, w / 2 - 4, 12, w / 2 - 10, 2);
      g.fillTriangle(w / 2 + 8, 10, w / 2 + 4, 12, w / 2 + 10, 2);
      g.fillStyle(0xffd24a, 1); // glowing eyes
      g.fillCircle(w / 2 - 3, 15, 1.9);
      g.fillCircle(w / 2 + 3, 15, 1.9);
    } else {
      // Generic fallback summon: a simple pale capsule (future types add their own art).
      g.fillStyle(0x101418, 1);
      g.fillRoundedRect(6, 10, w - 12, h - 14, 8);
      g.fillStyle(0xcfe6ff, 1);
      g.fillRoundedRect(9, 13, w - 18, h - 20, 6);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
