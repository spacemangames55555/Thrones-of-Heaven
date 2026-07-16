import type { SkillDef } from './skillData';

/**
 * SAVAGE — JAGUAR SPIRIT TREE (10 skills, linear; THE HUNT).
 *
 * The spirit half (Casey's revision): the pouncing dash opener, the JAGUAR
 * SPIRIT fury FORM (a timed transformation — speed rises and every strike
 * rakes the jaguar's bleed; the old Companion summon is gone), the confusion
 * snarl, BLOOD SCENT (bonus damage to BLEEDING targets — it feeds the kit's
 * four bleeds and the form), the standing SUN TOTEM, and the apex ultimate.
 * Conventions as always: EVERY tunable in {@link SAV_JAGUAR_TUNING} with
 * calibration anchors; placeholder prose. Tree id 'sav_jaguar'. Tier-0 is a
 * DAMAGING ACTIVE (no-kit rule).
 */

export const SAV_JAGUAR_TREE = 'sav_jaguar';

// Ids the scene keys behavior off (imported there — keep in sync): the FORM's
// bleed-on-strike reads the live timed state; BLOOD SCENT arms the
// bleeding-target damage bonus at recompute. Both keep their ORIGINAL skill
// ids (sav_jg_jaguar / sav_jg_pack) so saves with points spent stay valid.
export const JAGUAR_FORM_ID = 'sav_jg_jaguar';
export const BLOOD_SCENT_ID = 'sav_jg_pack';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SAV_JAGUAR_TUNING = {
  /** 1) FERAL LUNGE — ENTRY pouncing dash: damage + knockdown along the path
   *  (the Charge machinery; vs Falcon Dive's 190/26). */
  lunge: { distance: 190, damage: 20, knockdownMs: 350, cooldownMs: 2600, energyCost: 10 },
  /** 2) PREDATOR'S SNARL — the confusion reuse: prey flees into its own kind
   *  (vs Sonic Distortion's 0.8/4000). */
  snarl: { range: 300, chance: 0.8, durationMs: 3500, chipDamage: 8, chipMs: 600, cooldownMs: 12000, energyCost: 18 },
  /** 3) JAGUAR SPIRIT — the fury FORM (Casey's swap): a timed transformation —
   *  tempo + speed while it holds, and EVERY strike rakes the jaguar's bleed
   *  (speeds vs Spirit of the Hunt's 0.15/0.2 halves; the bleed is the old
   *  companion's 5/500/2500 rake; duration vs Iron Pyrite-class timed forms). */
  jaguar: { attackSpeedMult: 0.25, moveSpeedMult: 0.15, bleed: { dmgPerTick: 5, tickMs: 500, durationMs: 2500 }, durationMs: 10000, cooldownMs: 30000, energyCost: 30, tint: 0xe8a03a },
  /** 4) THICK HIDE — flat toughness (vs Elephant-lineage damage reduction). */
  hide: { damageReduction: 0.12 },
  /** 5) SPIRIT OF THE HUNT — the chase-state: speed + tempo (vs Frenzied
   *  Rhythm-class tempo buffs). */
  hunt: { moveSpeedMult: 0.15, attackSpeedMult: 0.2, durationMs: 8000, cooldownMs: 18000, energyCost: 20, tint: 0xe8a03a },
  /** 6) BLOOD SCENT — Casey's re-spec (the pack lost its pack): BLEEDING
   *  targets take ×(1+bonus) from you — conditional and bigger than Red
   *  Harvest's flat 12%; it feeds the kit's four bleeds and the form. */
  scent: { bonusVsBleeding: 0.2 },
  /** 7) LICK THE WOUNDS — the animal's mend (vs Mend's 35, cruder + cheaper). */
  lick: { heal: 28, cooldownMs: 10000, energyCost: 16 },
  /** 8) SUN TOTEM — a STANDING sun planted ahead: it sears what lingers under
   *  it (the placed-hazard machinery; vs Rain of Arrows' 8/350/3000). */
  totem: { placeAhead: 130, radius: 120, tickDamage: 7, tickMs: 500, durationMs: 4500, cooldownMs: 13000, energyCost: 20 },
  /** 9) APEX INSTINCT — evasion (block-mapped, the Flowing Movement precedent). */
  apex: { blockChance: 0.12, blockReduction: 0.6 },
  /** 10) AVATAR OF THE JAGUAR — ultimate: briefly the animal itself — harder,
   *  faster, hungrier (each half vs the single-stat buffs it echoes). */
  avatar: { damageMult: 0.25, attackSpeedMult: 0.2, moveSpeedMult: 0.15, lifestealPct: 0.1, durationMs: 10000, cooldownMs: 60000, energyCost: 45, tint: 0xe8a03a },
} as const;

const T = SAV_JAGUAR_TUNING;

// ─── THE 10 JAGUAR SKILLS (linear; tree 'sav_jaguar') ─────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SAV_JAGUAR_SKILLS: SkillDef[] = [
  {
    id: 'sav_jg_lunge',
    tree: SAV_JAGUAR_TREE,
    name: 'Feral Lunge',
    description: 'Activate: the pounce — a low driving rush that knocks down everything along its path. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'sav_lunge', cooldownMs: T.lunge.cooldownMs, energyCost: T.lunge.energyCost },
  },
  {
    id: 'sav_jg_snarl',
    tree: SAV_JAGUAR_TREE,
    name: "Predator's Snarl",
    description: `Activate: something old in the sound — an enemy panics and turns on its own kind for ${(T.snarl.durationMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'sav_jg_lunge',
    tier: 1,
    effect: { kind: 'active', action: 'sav_snarl', cooldownMs: T.snarl.cooldownMs, energyCost: T.snarl.energyCost },
  },
  {
    id: JAGUAR_FORM_ID,
    tree: SAV_JAGUAR_TREE,
    name: 'Jaguar Spirit',
    description: `Activate: the spotted shadow does not walk BESIDE you — for ${(T.jaguar.durationMs / 1000).toFixed(0)}s it IS you. +${Math.round(T.jaguar.attackSpeedMult * 100)}% attack speed, +${Math.round(T.jaguar.moveSpeedMult * 100)}% speed, and every strike rakes a bleeding wound.`,
    cost: 1,
    prereq: 'sav_jg_snarl',
    tier: 2,
    effect: {
      kind: 'transformation',
      cooldownMs: T.jaguar.cooldownMs,
      durationMs: T.jaguar.durationMs,
      energyCost: T.jaguar.energyCost,
      tint: T.jaguar.tint,
      stats: { attackSpeedMult: T.jaguar.attackSpeedMult, moveSpeedMult: T.jaguar.moveSpeedMult },
    },
  },
  {
    id: 'sav_jg_hide',
    tree: SAV_JAGUAR_TREE,
    name: 'Thick Hide',
    description: `Passive: scar over scar — take ${Math.round(T.hide.damageReduction * 100)}% less damage.`,
    cost: 1,
    prereq: 'sav_jg_jaguar',
    tier: 3,
    effect: { kind: 'passive', stats: { damageReduction: T.hide.damageReduction } },
  },
  {
    id: 'sav_jg_hunt',
    tree: SAV_JAGUAR_TREE,
    name: 'Spirit of the Hunt',
    description: `Activate: the chase takes you — +${Math.round(T.hunt.moveSpeedMult * 100)}% speed and +${Math.round(T.hunt.attackSpeedMult * 100)}% attack speed for ${(T.hunt.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'sav_jg_hide',
    tier: 4,
    effect: { kind: 'buff', cooldownMs: T.hunt.cooldownMs, durationMs: T.hunt.durationMs, energyCost: T.hunt.energyCost, tint: T.hunt.tint, stats: { moveSpeedMult: T.hunt.moveSpeedMult, attackSpeedMult: T.hunt.attackSpeedMult } },
  },
  {
    id: BLOOD_SCENT_ID,
    tree: SAV_JAGUAR_TREE,
    name: 'Blood Scent',
    description: `Passive: you smell what's already open — BLEEDING enemies take ${Math.round(T.scent.bonusVsBleeding * 100)}% more from you.`,
    cost: 1,
    prereq: 'sav_jg_hunt',
    tier: 5,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'sav_jg_lick',
    tree: SAV_JAGUAR_TREE,
    name: 'Lick the Wounds',
    description: `Activate: the animal's way — crude, quick, effective. Restore ${T.lick.heal} health.`,
    cost: 1,
    prereq: 'sav_jg_pack',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'sav_lick',
      cooldownMs: T.lick.cooldownMs,
      energyCost: T.lick.energyCost,
      compose: [{ p: 'heal', amount: T.lick.heal }],
    },
  },
  {
    id: 'sav_jg_totem',
    tree: SAV_JAGUAR_TREE,
    name: 'Sun Totem',
    description: `Activate: plant the sun-carved post ahead — for ${(T.totem.durationMs / 1000).toFixed(1)}s everything lingering under its glare SEARS.`,
    cost: 1,
    prereq: 'sav_jg_lick',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'sav_totem',
      cooldownMs: T.totem.cooldownMs,
      energyCost: T.totem.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.totem.placeAhead, radius: T.totem.radius, tickDamage: T.totem.tickDamage, tickMs: T.totem.tickMs, durationMs: T.totem.durationMs, fill: 0x8a5a1a, stroke: 0xe8a03a }],
    },
  },
  {
    id: 'sav_jg_apex',
    tree: SAV_JAGUAR_TREE,
    name: 'Apex Instinct',
    description: 'Passive: the body moves before the mind is asked — slipping evasion.',
    cost: 1,
    prereq: 'sav_jg_totem',
    tier: 8,
    effect: { kind: 'passive', stats: { blockChance: T.apex.blockChance, blockReduction: T.apex.blockReduction } },
  },
  {
    id: 'sav_jg_avatar',
    tree: SAV_JAGUAR_TREE,
    name: 'Avatar of the Jaguar',
    description: `Ultimate — Activate: for ${(T.avatar.durationMs / 1000).toFixed(0)}s you are the animal the old carvings meant — harder, faster, and every wound you give feeds you. Long cooldown.`,
    cost: 1,
    prereq: 'sav_jg_apex',
    tier: 9,
    effect: {
      kind: 'buff',
      cooldownMs: T.avatar.cooldownMs,
      durationMs: T.avatar.durationMs,
      energyCost: T.avatar.energyCost,
      tint: T.avatar.tint,
      stats: { damageMult: T.avatar.damageMult, attackSpeedMult: T.avatar.attackSpeedMult, moveSpeedMult: T.avatar.moveSpeedMult, lifestealPct: T.avatar.lifestealPct },
    },
  },
];
