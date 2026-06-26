import type { SkillDef } from './skillData';
import { ICE_GOLEM_SKILL_ID, ICE_GOLEM_TUNING } from '../summon/summonData';

/**
 * WIZARD — ICE/POISON CONTROL TREE (10 skills, linear → Pestilence ultimate capstone).
 *
 * The Wizard's SECOND tree: utility/control built on Ice (slow/chill) + Poison (DoT/
 * contagion). Reuses the projectile pool (Icicle pierce, Toxic Bolt), the persistent
 * ground-hazard pattern (Black Ice / Freezing Rain / Biohazard / Pestilence zones), the
 * slow + knockback + cone primitives, the per-target DoT + contagion primitive (Toxic
 * Bolt / Plague), and the allied-summon system (the Ice Golem, now relocated here as the
 * pre-capstone node 9). EVERY tunable lives in {@link ICEPOISON_TUNING}; names/descriptions
 * are PLACEHOLDER prose — edit the `name`/`description` fields below. Tree id 'wiz_icepoison'.
 *
 * The capstone Pestilence is an ULTIMATE SPELL (not a transformation): a field-wide plague
 * outbreak (heavy DoT + slow + weaken) on a long cooldown.
 */

export const WIZ_ICEPOISON_TREE = 'wiz_icepoison';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
// Slow factors are VELOCITY MULTIPLIERS (0.5 = enemies move at half speed). Weaken is
// the fraction of enemy damage removed while the effect is up.
export const ICEPOISON_TUNING = {
  /** 1) ICICLE — ENTRY piercing ice shard (must defeat the Sasquatch). */
  icicle: { damage: 24, pierce: 3, speed: 560, range: 380, radius: 10, cooldownMs: 1500, energyCost: 10 },
  /** 2) TOXIC BOLT — bolt + poison DoT on impact. */
  toxicBolt: { impactDamage: 16, dotDamage: 7, dotTickMs: 600, dotDurationMs: 4000, dotRadius: 36, speed: 460, range: 340, radius: 11, cooldownMs: 4000, energyCost: 14 },
  /** 3) BLACK ICE — slick ground patch that SLOWS enemies in it (no damage). */
  blackIce: { slowFactor: 0.45, radius: 95, durationMs: 5000, tickMs: 250, placeAhead: 70, cooldownMs: 8000, energyCost: 16 },
  /** 4) FROSTBITE — chill a target ahead: slow + weaken + small damage. */
  frostbite: { damage: 14, slowFactor: 0.5, weaken: 0.3, durationMs: 4000, range: 80, cooldownMs: 7000, energyCost: 14 },
  /** 5) SLUDGE — toxic cone: low damage + KNOCKBACK. */
  sludge: { damage: 16, knockback: 150, coneHalfAngleDeg: 38, range: 140, cooldownMs: 8000, energyCost: 16 },
  /** 6) FREEZING RAIN — zone that SLOWS + DAMAGES enemies inside over time. */
  freezingRain: { tickDamage: 9, slowFactor: 0.55, radius: 160, durationMs: 5000, tickMs: 500, cooldownMs: 11000, energyCost: 22 },
  /** 7) BIOHAZARD — lobbed poison cloud at range: lingering DoT zone. */
  biohazard: { tickDamage: 11, radius: 110, durationMs: 5000, tickMs: 500, throwRange: 220, cooldownMs: 10000, energyCost: 20 },
  /** 8) PLAGUE — spreading poison DoT (contagion) that jumps to nearby enemies. */
  plague: { dotDamage: 10, dotTickMs: 600, dotDurationMs: 5000, spreadRadius: 110, maxSpread: 5, applyRange: 90, applyRadius: 60, cooldownMs: 12000, energyCost: 22 },
  /** 9) ICE GOLEM — the tank/blocker allied summon (relocated into this tree; see summonData.ts). */
  // (tuning lives in ICE_GOLEM_TUNING)
  /** 10) PESTILENCE — ULTIMATE: field-wide plague — heavy DoT + slow + weaken over a large area. */
  pestilence: { tickDamage: 16, slowFactor: 0.5, weaken: 0.35, radius: 240, durationMs: 8000, tickMs: 500, cooldownMs: 60000, energyCost: 45 },
} as const;

const T = ICEPOISON_TUNING;
const pct = (mult: number): number => Math.round((1 - mult) * 100); // slow factor → "−N% speed"

// ─── THE 10 ICE/POISON SKILLS (linear; tree 'wiz_icepoison') ──────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const WIZARD_ICEPOISON_SKILLS: SkillDef[] = [
  {
    id: 'wiz_icicle',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Icicle',
    description: `Activate: hurl an ice shard that PIERCES through up to ${T.icicle.pierce} enemies in a line. Your reliable ranged attack.`,
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'wiz_icicle', cooldownMs: T.icicle.cooldownMs, energyCost: T.icicle.energyCost },
  },
  {
    id: 'wiz_toxic_bolt',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Toxic Bolt',
    description: `Activate: a venom bolt that hits then POISONS the target for ${(T.toxicBolt.dotDurationMs / 1000).toFixed(0)}s (damage over time).`,
    cost: 1,
    prereq: 'wiz_icicle',
    tier: 1,
    effect: { kind: 'active', action: 'wiz_toxic_bolt', cooldownMs: T.toxicBolt.cooldownMs, energyCost: T.toxicBolt.energyCost },
  },
  {
    id: 'wiz_black_ice',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Black Ice',
    description: `Activate: freeze a slick patch on the ground ahead — enemies in it are SLOWED (−${pct(T.blackIce.slowFactor)}% speed) for ${(T.blackIce.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wiz_toxic_bolt',
    tier: 2,
    effect: { kind: 'active', action: 'wiz_black_ice', cooldownMs: T.blackIce.cooldownMs, energyCost: T.blackIce.energyCost },
  },
  {
    id: 'wiz_frostbite',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Frostbite',
    description: `Activate: chill a foe ahead — SLOWS it (−${pct(T.frostbite.slowFactor)}% speed) and WEAKENS its damage (−${Math.round(T.frostbite.weaken * 100)}%) for ${(T.frostbite.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wiz_black_ice',
    tier: 3,
    effect: { kind: 'active', action: 'wiz_frostbite', cooldownMs: T.frostbite.cooldownMs, energyCost: T.frostbite.energyCost },
  },
  {
    id: 'wiz_sludge',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Sludge',
    description: 'Activate: spray a cone of toxic muck that damages and KNOCKS BACK enemies in front of you.',
    cost: 1,
    prereq: 'wiz_frostbite',
    tier: 4,
    effect: { kind: 'active', action: 'wiz_sludge', cooldownMs: T.sludge.cooldownMs, energyCost: T.sludge.energyCost },
  },
  {
    id: 'wiz_freezing_rain',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Freezing Rain',
    description: `Activate: call down freezing rain around you — a zone that SLOWS and DAMAGES all enemies inside for ${(T.freezingRain.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wiz_sludge',
    tier: 5,
    effect: { kind: 'active', action: 'wiz_freezing_rain', cooldownMs: T.freezingRain.cooldownMs, energyCost: T.freezingRain.energyCost },
  },
  {
    id: 'wiz_biohazard',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Biohazard',
    description: `Activate: lob a toxin flask ahead, leaving a lingering poison CLOUD that damages enemies in it for ${(T.biohazard.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wiz_freezing_rain',
    tier: 6,
    effect: { kind: 'active', action: 'wiz_biohazard', cooldownMs: T.biohazard.cooldownMs, energyCost: T.biohazard.energyCost },
  },
  {
    id: 'wiz_plague',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Plague',
    description: `Activate: infect foes ahead with a virulent poison that SPREADS to nearby enemies (up to ${T.plague.maxSpread}) as a contagious damage-over-time.`,
    cost: 1,
    prereq: 'wiz_biohazard',
    tier: 7,
    effect: { kind: 'active', action: 'wiz_plague', cooldownMs: T.plague.cooldownMs, energyCost: T.plague.energyCost },
  },
  {
    // ICE GOLEM — relocated here from its standalone slot. Same id (ICE_GOLEM_SKILL_ID) so
    // existing characters who unlocked/equipped it keep it; same summon behavior. Node 9.
    id: ICE_GOLEM_SKILL_ID,
    tree: WIZ_ICEPOISON_TREE,
    name: 'Summon Ice Golem',
    description: `Activate: summon an Ice Golem ally (${ICE_GOLEM_TUNING.maxHP} HP, ${(ICE_GOLEM_TUNING.durationMs / 1000).toFixed(0)}s) that draws enemy aggro and soaks damage — your meat-shield. It does not attack.`,
    cost: 1,
    prereq: 'wiz_plague',
    tier: 8,
    effect: { kind: 'active', action: 'summon_ice_golem', cooldownMs: ICE_GOLEM_TUNING.summonCooldownMs, energyCost: ICE_GOLEM_TUNING.summonEnergyCost },
  },
  {
    id: 'wiz_pestilence',
    tree: WIZ_ICEPOISON_TREE,
    name: 'Pestilence',
    description: `Capstone ULTIMATE — Activate: unleash a field-wide plague over a huge area for ${(T.pestilence.durationMs / 1000).toFixed(0)}s: heavy poison DoT, −${pct(T.pestilence.slowFactor)}% enemy speed, and −${Math.round(
      T.pestilence.weaken * 100,
    )}% enemy damage to everything caught in it. Long cooldown.`,
    cost: 1,
    prereq: ICE_GOLEM_SKILL_ID,
    tier: 9,
    effect: { kind: 'active', action: 'wiz_pestilence', cooldownMs: T.pestilence.cooldownMs, energyCost: T.pestilence.energyCost },
  },
];
