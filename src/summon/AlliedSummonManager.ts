import Phaser from 'phaser';
import { AlliedSummon } from './AlliedSummon';
import type { AlliedSummonConfig } from './summonData';

/**
 * THE ALLIED-SUMMON MANAGER — owns every player-side summon: spawns them (capped per
 * type, oldest recycled past the cap), advances + prunes them (no leaks), and answers
 * the aggro/collision queries the scene's enemy + projectile code uses to retarget onto
 * summons. Transient by design — summons are NOT serialized, so a fresh manager after a
 * load simply has none (no dangling references).
 *
 * Reusable for any future summon type (Necromancer minions, etc.) — they differ only by
 * {@link AlliedSummonConfig} + the entity's behavior branch.
 */
export class AlliedSummonManager {
  private readonly scene: Phaser.Scene;
  private summons: AlliedSummon[] = [];
  private nextId = 1;

  /** Fired when a summon is spawned (the scene routes it past the UI camera + adds colliders). */
  onSpawn?: (summon: AlliedSummon) => void;
  /** Fired when a summon expires/dies/is cleared (for any extra cleanup the scene wants). */
  onExpire?: (summon: AlliedSummon) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get count(): number {
    return this.summons.length;
  }
  /** Live summons (read-only view). */
  get list(): readonly AlliedSummon[] {
    return this.summons;
  }

  /**
   * Spawn a summon of `config` at (x,y). Enforces a per-type cap: at the cap, the OLDEST
   * summon of that type is recycled (re-casting refreshes rather than stacking). Returns
   * the new summon.
   */
  summon(config: AlliedSummonConfig, x: number, y: number, maxConcurrent: number): AlliedSummon {
    const sameType = this.summons.filter((s) => s.config.key === config.key);
    while (sameType.length >= Math.max(1, maxConcurrent)) {
      const oldest = sameType.shift()!;
      this.remove(oldest);
    }
    const s = new AlliedSummon(this.scene, x, y, config, `summon_${config.key}_${this.nextId++}`);
    this.summons.push(s);
    this.onSpawn?.(s);
    return s;
  }

  /** Per-frame: advance each summon (tank-follow), then prune expired/dead ones (no leaks). */
  update(playerX: number, playerY: number, time: number): void {
    for (const s of this.summons) {
      if (s.isAlive && !s.isExpired(time)) s.update(playerX, playerY, time);
    }
    if (this.summons.some((s) => !s.isAlive || s.isExpired(time))) {
      for (const s of this.summons) {
        if (!s.isAlive || s.isExpired(time)) {
          this.onExpire?.(s);
          s.destroy();
        }
      }
      this.summons = this.summons.filter((s) => s.isAlive && !s.isExpired(time));
    }
  }

  /** Freeze every summon (player frozen in dialogue / death). */
  halt(): void {
    for (const s of this.summons) s.halt();
  }

  /**
   * The aggro-drawing summon nearest to (ex,ey) within ITS aggro radius, or null. Enemies
   * use this to retarget: if it returns a summon, the enemy chases/attacks the summon.
   */
  aggroSummonNear(ex: number, ey: number): AlliedSummon | null {
    let best: AlliedSummon | null = null;
    let bestD = Infinity;
    for (const s of this.summons) {
      if (!s.drawsAggro) continue;
      const d = s.distanceTo(ex, ey);
      if (d <= s.aggroRadius && d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  /** The summon whose body the point (x,y) lands in (for enemy-bolt collision), or null. */
  summonAt(x: number, y: number, radius: number): AlliedSummon | null {
    let best: AlliedSummon | null = null;
    let bestD = Infinity;
    for (const s of this.summons) {
      if (!s.isAlive) continue;
      const d = s.distanceTo(x, y);
      if (d <= radius + s.bodyRadius && d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  /** Remove every summon immediately (dev clear / save load / world reset). No leaks. */
  clear(): void {
    for (const s of this.summons) {
      this.onExpire?.(s);
      s.destroy();
    }
    this.summons = [];
  }

  private remove(s: AlliedSummon): void {
    this.onExpire?.(s);
    s.destroy();
    this.summons = this.summons.filter((x) => x !== s);
  }
}
