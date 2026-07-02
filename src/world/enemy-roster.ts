import type { Tier } from './world-manifest';

/**
 * ENEMY ROSTER (gray-box registration — Europe setup). Data only in this run:
 * every family REUSES existing engine systems (the ranged-bolt AI, the pooled
 * projectiles, the slow/weaken debuffs, the stacking-DoT primitive, the beam
 * channel, the melee chase AI). No new AI code, no spawner wiring, no final
 * art — placeholder sprites are the existing gray-box bodies tinted by combat
 * domain. Phase-1 zone stamping consumes these defs to spawn.
 */

export type CombatDomain = 'physical' | 'mental' | 'spiritual';

/** Placeholder sprite tint per combat domain (red / blue / violet). */
export const DOMAIN_TINT: Record<CombatDomain, number> = {
  physical: 0xe04a3a, // red
  mental: 0x3a6de0, // blue
  spiritual: 0x9a4ae0, // violet
};

export interface EnemyFamilyDef {
  id: string;
  domain: CombatDomain;
  /** Existing engine systems this family reuses (gray-box; nothing new built). */
  reuses: readonly string[];
  /** Base stats at tier 1 (scaled by zone tier when spawned). */
  base: { hp: number; damage: number; speed: number };
  /** Family-specific behavior tunables, mapped onto the existing AI systems. */
  behavior: Readonly<Record<string, number | boolean | string>>;
  /** Marked spirit-layer: FALLBACK MODE for now — always visible, a normal
   *  enemy. Visibility gating activates when Spirit Vision ships. */
  spiritLayer?: boolean;
}

export const ENEMY_ROSTER: Record<string, EnemyFamilyDef> = {
  'dark-casters': {
    id: 'dark-casters',
    domain: 'mental',
    reuses: ['ranged-bolt AI (angel/guardian ranged role)', 'slow/weaken debuffs (control effects)', 'stacking-DoT primitive', 'pooled projectiles'],
    base: { hp: 55, damage: 9, speed: 95 },
    behavior: {
      keepDistancePx: 260, // holds range; repositions when the player closes
      repositionAtPx: 170,
      boltAppliesSlow: true,
      boltAppliesWeaken: true,
      stackingDotOnHit: true,
    },
  },
  'veil-ambushers': {
    id: 'veil-ambushers',
    domain: 'mental',
    reuses: ['melee chase AI', 'swarm-pack spawner pattern (hidden until trigger)', 'aggro hierarchy (bypassed pre-reveal)'],
    base: { hp: 80, damage: 14, speed: 175 },
    behavior: {
      spawnHiddenNearRoads: true,
      triggerRadiusPx: 140, // burst on proximity — or on escort proximity
      triggersOnEscort: true,
      ignoresTauntsPreReveal: true,
      burstDurationMs: 6000, // disengage (leash away) after the burst window
    },
  },
  'hollowed-brutes': {
    id: 'hollowed-brutes',
    domain: 'spiritual',
    reuses: ['melee chase AI (slow profile)', 'telegraphed heavy strike (boss wind-up pattern)'],
    base: { hp: 420, damage: 34, speed: 55 },
    behavior: {
      telegraphMs: 1200, // heavily telegraphed heavy hits
      maxPerPack: 2, // 1–2 per pack, never more
      neverFlees: true,
    },
  },
  'corrupted-spirits': {
    id: 'corrupted-spirits',
    domain: 'spiritual',
    reuses: ['melee chase AI', 'spirit-swarmer visual language'],
    base: { hp: 70, damage: 11, speed: 120 },
    behavior: {
      // FALLBACK MODE: always visible, fights as a normal enemy. The
      // spiritLayer flag is carried so Spirit Vision can gate visibility
      // later — no vision system is built in this run.
      fallbackAlwaysVisible: true,
    },
    spiritLayer: true,
  },
};

// ── The REGION-CHAMPION template (instantiated by boss-archetype beats) ──────

export type SignatureMove = 'charge' | 'summon-adds' | 'channel-beam' | 'ground-slam';

export interface RegionChampion {
  name: string;
  domain: CombatDomain;
  tint: number;
  tier: Tier;
  stats: { hp: number; damage: number; speed: number };
  /** ONE signature move, mapped onto an existing primitive (the beam reuses
   *  the existing channel-beam system; adds reuse the summon spawners; charge
   *  and slam reuse the dash + ground-AoE primitives). */
  signature: SignatureMove;
}

/** Elite stat curve by zone tier (tunable; gray-box numbers). */
function championStats(tier: Tier): { hp: number; damage: number; speed: number } {
  return { hp: 600 * tier * tier, damage: 18 + 10 * tier, speed: 90 + 6 * tier };
}

/** Instantiate a region champion for a boss beat (template, not a spawn table). */
export function makeRegionChampion(name: string, domain: CombatDomain, tier: Tier, signature: SignatureMove): RegionChampion {
  return { name, domain, tint: DOMAIN_TINT[domain], tier, stats: championStats(tier), signature };
}

// ── Pre-existing manifest families → the game systems that already spawn them ─

export const EXISTING_FAMILY_SPAWNERS: Record<string, string> = {
  'corrupted-wildlife': 'Act I wildlife spawners (wolves / sea-lion pattern)',
  'lesser-evil-scouts': 'demon + swarm-pack spawners',
  'evil-raiders': 'raider townsfolk-variant spawners',
  'herald-angels': "spawnAngelVariant('herald')",
  'radiant-guardians': 'guardian (FlamingSword) spawners',
  'lesser-angels': "spawnAngelVariant('lesser')",
};

/** Does a manifest enemyFamily id resolve to SOMETHING spawnable? */
export function familyResolves(id: string): boolean {
  return id === 'region-champion' || id in ENEMY_ROSTER || id in EXISTING_FAMILY_SPAWNERS;
}
