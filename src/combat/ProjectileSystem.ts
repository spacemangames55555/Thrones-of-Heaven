import Phaser from 'phaser';
import type { GameMap } from '../map/GameMap';

const TEXTURE_KEY = 'holy-bolt';

/** Who a projectile belongs to / can hit. Only 'enemy' is used now; 'player' is
 *  reserved so player-fired projectiles can reuse the same system later. */
export type Faction = 'enemy' | 'player';

export interface ProjectileSpawn {
  x: number;
  y: number;
  /** Direction (need not be normalized). */
  dirX: number;
  dirY: number;
  speed: number; // px/sec
  damage: number;
  maxRange: number; // px before it despawns
  faction: Faction;
  color?: number;
  radius?: number; // collision radius (px)
  /** Optional SPLASH on impact (player bolts): an AoE burst where the bolt lands.
   *  Reusable for spells like Combust + storm-empowered bolts. */
  splashRadius?: number;
  splashDamage?: number;
}

/** One pooled bolt: a glowing sprite plus its flight state. */
class Bolt {
  readonly sprite: Phaser.GameObjects.Image;
  active = false;
  dirX = 0;
  dirY = 0;
  speed = 0;
  damage = 0;
  maxRange = 0;
  traveled = 0;
  faction: Faction = 'enemy';
  radius = 7;
  color = 0xffe9a8;
  splashRadius = 0;
  splashDamage = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.sprite = scene.add.image(0, 0, TEXTURE_KEY).setDepth(13).setVisible(false);
    layer.add(this.sprite); // world-FX layer → drawn by the main camera, ignored by the UI camera
  }

  launch(s: ProjectileSpawn): void {
    const len = Math.hypot(s.dirX, s.dirY) || 1;
    this.dirX = s.dirX / len;
    this.dirY = s.dirY / len;
    this.speed = s.speed;
    this.damage = s.damage;
    this.maxRange = s.maxRange;
    this.traveled = 0;
    this.faction = s.faction;
    this.radius = s.radius ?? 7;
    this.color = s.color ?? 0xffe9a8;
    this.splashRadius = s.splashRadius ?? 0;
    this.splashDamage = s.splashDamage ?? 0;
    this.sprite
      .setPosition(s.x, s.y)
      .setTint(this.color)
      .setRotation(Math.atan2(this.dirY, this.dirX))
      .setScale(1)
      .setVisible(true);
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
    this.sprite.setVisible(false);
  }
}

/**
 * A reusable, pooled projectile system — the first in the game. Bolts travel,
 * deal damage to their target on contact, and are removed on hit, on hitting
 * BLOCKING terrain (so the player can break line of sight), or at max range.
 * Bolts are recycled from a pool so nothing leaks. Faction-driven so it is
 * generic: enemy bolts hit the player today; player bolts could reuse it later.
 */
export class ProjectileSystem {
  private readonly scene: Phaser.Scene;
  private readonly map: GameMap;
  private readonly layer: Phaser.GameObjects.Layer;
  private readonly pool: Bolt[] = [];

  /** Called when an ENEMY bolt strikes the player. */
  onPlayerHit?: (damage: number) => void;
  /** Called for an ENEMY bolt each step: damage a player-ALLIED SUMMON within (x,y,radius);
   *  return true if one was hit so the bolt impacts/despawns. Lets a summoned tank (Ice
   *  Golem) intercept enemy fire aimed at it (the mirror of onEnemyHit for player bolts). */
  onSummonHit?: (x: number, y: number, radius: number, damage: number) => boolean;
  /** Called for a PLAYER bolt each step: damage an enemy within (x,y,radius);
   *  return true if one was hit so the bolt impacts/despawns (like an enemy bolt
   *  hitting the player). The scene owns the enemy lists, so it resolves the hit. */
  onEnemyHit?: (x: number, y: number, radius: number, damage: number) => boolean;
  /** Optional impact FX hook (e.g. a small poof). */
  onImpact?: (x: number, y: number, color: number) => void;
  /** Called when a SPLASH player bolt despawns (hit/terrain/range) so the scene can apply
   *  an AoE burst at the impact point. Only fired for bolts spawned with splash. */
  onSplash?: (x: number, y: number, radius: number, damage: number) => void;

  constructor(scene: Phaser.Scene, map: GameMap, layer: Phaser.GameObjects.Layer) {
    this.scene = scene;
    this.map = map;
    this.layer = layer;
    ProjectileSystem.ensureTexture(scene);
  }

  /** Number of bolts currently in flight. */
  get count(): number {
    let n = 0;
    for (const b of this.pool) if (b.active) n++;
    return n;
  }

  spawn(s: ProjectileSpawn): void {
    let bolt = this.pool.find((b) => !b.active);
    if (!bolt) {
      bolt = new Bolt(this.scene, this.layer);
      this.pool.push(bolt);
    }
    bolt.launch(s);
  }

  /** Advance every active bolt; resolve terrain / target / range; cull. */
  update(deltaMs: number, playerX: number, playerY: number, playerRadius: number): void {
    const dt = deltaMs / 1000;
    for (const b of this.pool) {
      if (!b.active) continue;
      const step = b.speed * dt;
      b.sprite.x += b.dirX * step;
      b.sprite.y += b.dirY * step;
      b.traveled += step;

      if (b.traveled >= b.maxRange) {
        this.impact(b);
        continue;
      }
      const terr = this.map.terrainAtWorld(b.sprite.x, b.sprite.y);
      if (terr?.blocks) {
        this.impact(b);
        continue;
      }
      // ENEMY bolt: a player-allied summon (Ice Golem) it was aimed at intercepts it first.
      if (b.faction === 'enemy' && this.onSummonHit?.(b.sprite.x, b.sprite.y, b.radius, b.damage)) {
        this.impact(b);
        continue;
      }
      if (
        b.faction === 'enemy' &&
        Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, playerX, playerY) <= b.radius + playerRadius
      ) {
        this.onPlayerHit?.(b.damage);
        this.impact(b);
        continue;
      }
      // PLAYER bolt: ask the scene to resolve an enemy hit; despawn if it landed.
      if (b.faction === 'player' && this.onEnemyHit?.(b.sprite.x, b.sprite.y, b.radius, b.damage)) {
        this.impact(b);
      }
    }
  }

  /** Deactivate every bolt (dev reset). */
  clear(): void {
    for (const b of this.pool) b.deactivate();
  }

  private impact(b: Bolt): void {
    this.onImpact?.(b.sprite.x, b.sprite.y, b.color);
    // Splash bolts burst into an AoE where they land (Combust / storm-empowered bolts).
    if (b.faction === 'player' && b.splashRadius > 0 && b.splashDamage > 0) {
      this.onSplash?.(b.sprite.x, b.sprite.y, b.splashRadius, b.splashDamage);
    }
    b.deactivate();
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const s = 16;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A bright holy bolt: soft halo, a white-hot core, drawn white so the
    // per-bolt tint colors it. A small leading streak reads as motion.
    g.fillStyle(0xffffff, 0.28);
    g.fillCircle(s / 2, s / 2, 8);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(s / 2, s / 2, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s / 2, s / 2, 2.6);
    g.generateTexture(TEXTURE_KEY, s, s);
    g.destroy();
  }
}
