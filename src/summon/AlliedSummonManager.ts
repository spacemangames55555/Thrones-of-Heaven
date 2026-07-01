import Phaser from 'phaser';
import { AlliedSummon, type SummonCombatCtx } from './AlliedSummon';
import type { AlliedSummonConfig, SummonBuff } from './summonData';

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

  // PET-TARGETED BUFFS: active summon buffs (each refreshes its own id rather than stacking).
  // The AGGREGATE multipliers are pushed onto every summon each frame, so a buff covers both
  // currently-summoned AND newly-summoned units for its window.
  private buffs: { id: string; damageBonus: number; hpBonus: number; drBonus: number; endsAt: number }[] = [];

  /** Fired when a summon is spawned (the scene routes it past the UI camera + adds colliders). */
  onSpawn?: (summon: AlliedSummon) => void;
  /** Fired when a summon expires/dies/is cleared (for any extra cleanup the scene wants). */
  onExpire?: (summon: AlliedSummon) => void;
  /**
   * PASSIVE summon auras (per-summon-type), supplied by the scene from the Necromancer's
   * unlocked passive skills (Necrotic Presence, Unyielding Beast, the chosen branch passive,
   * Tentacles). Combined with the timed buffs each frame. Returns additive bonuses + radius/
   * reach multipliers for the given summon.
   */
  passiveModsFor?: (summon: AlliedSummon) => { damageBonus?: number; hpBonus?: number; drBonus?: number; aggroRadiusMult?: number; attackRangeMult?: number };

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
  summon(config: AlliedSummonConfig, x: number, y: number, maxConcurrent: number, durationMsOverride?: number): AlliedSummon {
    const sameType = this.summons.filter((s) => s.config.key === config.key);
    while (sameType.length >= Math.max(1, maxConcurrent)) {
      const oldest = sameType.shift()!;
      this.remove(oldest);
    }
    const s = new AlliedSummon(this.scene, x, y, config, `summon_${config.key}_${this.nextId++}`, durationMsOverride);
    this.summons.push(s);
    this.applyBuffsTo(s); // a unit summoned WHILE a buff is active gets it immediately
    this.onSpawn?.(s);
    return s;
  }

  // --- PET-TARGETED BUFFS --------------------------------------------------------

  /** Apply a summon buff (boosts damage / max HP / defense of the player's summons) for its
   *  duration. Re-applying the same buff id refreshes rather than stacks. Hits current units
   *  now; the per-frame push covers any summoned later while it's active. */
  addBuff(buff: SummonBuff, time: number): void {
    this.buffs = this.buffs.filter((b) => b.id !== buff.id);
    this.buffs.push({ id: buff.id, damageBonus: buff.damageBonus ?? 0, hpBonus: buff.hpBonus ?? 0, drBonus: buff.drBonus ?? 0, endsAt: time + buff.durationMs });
    this.applyBuffsToAll();
  }

  /** The aggregate live multipliers from all active buffs (additive bonuses, dr capped). */
  private aggregateBuffs(): { damageBonus: number; drBonus: number; hpMult: number } {
    let dmg = 0;
    let dr = 0;
    let hp = 0;
    for (const b of this.buffs) {
      dmg += b.damageBonus;
      dr += b.drBonus;
      hp += b.hpBonus;
    }
    return { damageBonus: dmg, drBonus: Math.min(0.9, dr), hpMult: 1 + hp };
  }

  private applyBuffsTo(s: AlliedSummon): void {
    const a = this.aggregateBuffs(); // timed buffs (uniform across summons)
    const p = this.passiveModsFor?.(s) ?? {}; // per-type passive auras from unlocked skills
    const damageBonus = a.damageBonus + (p.damageBonus ?? 0);
    const drBonus = Math.min(0.9, a.drBonus + (p.drBonus ?? 0));
    const hpMult = a.hpMult + (p.hpBonus ?? 0); // a.hpMult = 1 + Σtimed; add passive hpBonus
    s.applyBuffs(damageBonus, drBonus, hpMult, p.aggroRadiusMult ?? 1, p.attackRangeMult ?? 1);
  }
  private applyBuffsToAll(): void {
    for (const s of this.summons) if (s.isAlive) this.applyBuffsTo(s);
  }

  /**
   * Per-frame: expire lapsed buffs (re-scaling HP back), advance each summon (attackers use
   * `ctx` to find + hit enemies), then prune expired/dead ones (no leaks).
   */
  update(playerX: number, playerY: number, time: number, ctx?: SummonCombatCtx): void {
    if (this.buffs.length && this.buffs.some((b) => time >= b.endsAt)) {
      this.buffs = this.buffs.filter((b) => time < b.endsAt);
    }
    this.applyBuffsToAll(); // keep live damage/defense/HP multipliers current on every unit
    for (const s of this.summons) {
      if (s.isAlive && !s.isExpired(time)) s.update(playerX, playerY, time, ctx);
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
   * THE AGGRO-HIERARCHY RESOLVER. Among the aggro-drawing summons whose aggro radius the
   * point (ex,ey) is inside, return the HIGHEST-priority one (tie → nearest); null if none
   * is in range (the caller then falls through to the player). Because the Dark Matter
   * Monster + Ice Golem are MAGNET tier and skeletons are MINION tier, this yields exactly
   * Monster/golem > skeleton > player — "never above the Monster, never below the player".
   */
  aggroSummonNear(ex: number, ey: number): AlliedSummon | null {
    let best: AlliedSummon | null = null;
    let bestPriority = -Infinity;
    let bestD = Infinity;
    for (const s of this.summons) {
      if (!s.drawsAggro) continue;
      const d = s.distanceTo(ex, ey);
      if (d > s.aggroRadius) continue; // out of this summon's pull → not a candidate
      if (s.aggroPriority > bestPriority || (s.aggroPriority === bestPriority && d < bestD)) {
        best = s;
        bestPriority = s.aggroPriority;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * The summon whose body the point (x,y) lands in (for enemy-bolt interception), or null.
   * ONLY aggro-drawing summons intercept bolts — a non-aggro ally (e.g. the ranged backline
   * attacker) sits OUTSIDE the hierarchy, so enemy bolts pass THROUGH it and it is never a
   * target: enemies fully ignore it (this pairs with aggroSummonNear, which already skips it).
   */
  summonAt(x: number, y: number, radius: number): AlliedSummon | null {
    let best: AlliedSummon | null = null;
    let bestD = Infinity;
    for (const s of this.summons) {
      if (!s.isAlive) continue;
      if (!s.drawsAggro) continue; // non-aggro allies don't intercept bolts (fully ignored)
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
