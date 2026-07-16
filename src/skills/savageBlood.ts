import type { SkillDef } from './skillData';

/**
 * SAVAGE — BLOOD RITES TREE (10 skills, linear; SACRIFICE).
 *
 * The altar half: the old rites pay in BLOOD (framework extension #3 — the
 * willing cut that refuses gracefully when you'd bleed out), contagion and
 * stacking wounds on shipped machinery, the drain, the reflect ward, and the
 * hungering nova ultimate. Conventions as always: EVERY tunable in
 * {@link SAV_BLOOD_TUNING} with calibration anchors; placeholder prose. Tree
 * id 'sav_blood'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const SAV_BLOOD_TREE = 'sav_blood';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SAV_BLOOD_TUNING = {
  /** 1) BLOOD SPIKE — ENTRY hardened shard (vs Blow Dart's 14/520/340,
   *  shorter + harder). */
  spike: { damage: 17, speed: 540, range: 320, radius: 8, cooldownMs: 2200, energyCost: 8 },
  /** 2) OPEN VEINS — the CONTAGIOUS wound (the plague machinery; vs Crimson
   *  Plague's spread budget). */
  veins: { applyRange: 300, applyRadius: 60, dotDamage: 5, dotTickMs: 500, dotDurationMs: 3500, spreadRadius: 120, maxSpread: 4, cooldownMs: 9000, energyCost: 18 },
  /** 3) CRIMSON NOVA — extension #3: a nova PAID IN BLOOD (cost vs Life
   *  Infusion's 15; damage vs Forge Strike-class novas, cheap in Faith
   *  because the blood is the price). */
  crimson: { bloodCost: 15, radius: 140, damage: 30, cooldownMs: 9000, energyCost: 6 },
  /** 4) RED HARVEST — +damage (vs Steady Hand's 15%). */
  harvest: { damageMult: 0.12 },
  /** 5) TRANSFUSION — the drain: their blood becomes yours (vs Life Drain's
   *  damage→heal split). */
  transfusion: { range: 300, damage: 16, healPct: 0.6, cooldownMs: 8000, energyCost: 16 },
  /** 6) BLOOD WARD — the reflect buff (vs Mirror Barrier's 0.5/6s, lighter). */
  ward: { reflectPct: 0.35, durationMs: 7000, cooldownMs: 16000, energyCost: 20, tint: 0xd04a3a },
  /** 7) SACRIFICIAL MIGHT — extension #3: a great fury PAID IN BLOOD (the
   *  damage surge vs Divine Wrath's 0.25, bought dearer + bigger). */
  sacrifice: { bloodCost: 20, damageMult: 0.35, durationMs: 8000, cooldownMs: 20000, energyCost: 6, tint: 0xd04a3a },
  /** 8) HEMORRHAGE — the STACKING wound (the stacking-DoT machinery; vs
   *  Entropy Cascade's stack shape). */
  hemorrhage: { range: 300, dmgPerTick: 4, tickMs: 500, durationMs: 3000, maxStacks: 4, cooldownMs: 3000, energyCost: 10, color: 0xd04a3a },
  /** 9) BLOOD MIRE — the spilled blood mires them: a pool that SLOWS and saps
   *  (vs Pestilence's damage+slow zone, lighter). */
  mire: { placeAhead: 90, radius: 120, tickDamage: 4, tickMs: 600, durationMs: 5000, slowFactor: 0.6, cooldownMs: 11000, energyCost: 18 },
  /** 10) BLOOD GOD'S HUNGER — ultimate: the great rite PAID IN BLOOD — a
   *  devouring nova that returns life PER ENEMY it bites (healPerHit vs Soul
   *  Siphon's per-hit mend). */
  hunger: { bloodCost: 25, radius: 180, damage: 40, healPerHit: 12, maxHeals: 5, cooldownMs: 55000, energyCost: 10 },
} as const;

const T = SAV_BLOOD_TUNING;

// ─── THE 10 BLOOD SKILLS (linear; tree 'sav_blood') ───────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SAV_BLOOD_SKILLS: SkillDef[] = [
  {
    id: 'sav_br_spike',
    tree: SAV_BLOOD_TREE,
    name: 'Blood Spike',
    description: 'Activate: a shard of hardened blood, thrown flat. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'sav_spike',
      cooldownMs: T.spike.cooldownMs,
      energyCost: T.spike.energyCost,
      compose: [{ p: 'bolt', damage: T.spike.damage, speed: T.spike.speed, range: T.spike.range, radius: T.spike.radius, tint: 0xd04a3a }],
    },
  },
  {
    id: 'sav_br_veins',
    tree: SAV_BLOOD_TREE,
    name: 'Open Veins',
    description: 'Activate: open them where they stand — the bleeding SPREADS to whoever fights beside them.',
    cost: 1,
    prereq: 'sav_br_spike',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'sav_veins',
      cooldownMs: T.veins.cooldownMs,
      energyCost: T.veins.energyCost,
      compose: [{ p: 'plague', applyRange: T.veins.applyRange, applyRadius: T.veins.applyRadius, dotDamage: T.veins.dotDamage, dotTickMs: T.veins.dotTickMs, dotDurationMs: T.veins.dotDurationMs, spreadRadius: T.veins.spreadRadius, maxSpread: T.veins.maxSpread, tint: 0xd04a3a }],
    },
  },
  {
    id: 'sav_br_crimson',
    tree: SAV_BLOOD_TREE,
    name: 'Crimson Nova',
    description: `Activate: cut your own arm and throw the pain outward — pay ${T.crimson.bloodCost} health for a nova of it. Too little blood and the rite refuses.`,
    cost: 1,
    prereq: 'sav_br_veins',
    tier: 2,
    effect: { kind: 'active', action: 'sav_crimson', cooldownMs: T.crimson.cooldownMs, energyCost: T.crimson.energyCost },
  },
  {
    id: 'sav_br_harvest',
    tree: SAV_BLOOD_TREE,
    name: 'Red Harvest',
    description: `Passive: the rites sharpen every edge — +${Math.round(T.harvest.damageMult * 100)}% damage.`,
    cost: 1,
    prereq: 'sav_br_crimson',
    tier: 3,
    effect: { kind: 'passive', stats: { damageMult: T.harvest.damageMult } },
  },
  {
    id: 'sav_br_transfusion',
    tree: SAV_BLOOD_TREE,
    name: 'Transfusion',
    description: `Activate: pull the blood OUT of the nearest enemy — ${Math.round(T.transfusion.healPct * 100)}% of the harm returns to you as life.`,
    cost: 1,
    prereq: 'sav_br_harvest',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'sav_transfusion',
      cooldownMs: T.transfusion.cooldownMs,
      energyCost: T.transfusion.energyCost,
      compose: [{ p: 'drain', range: T.transfusion.range, damage: T.transfusion.damage, healPct: T.transfusion.healPct, tint: 0xd04a3a }],
    },
  },
  {
    id: 'sav_br_ward',
    tree: SAV_BLOOD_TREE,
    name: 'Blood Ward',
    description: `Activate: painted sigils that answer harm with harm — REFLECT ${Math.round(T.ward.reflectPct * 100)}% of incoming damage for ${(T.ward.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'sav_br_transfusion',
    tier: 5,
    effect: { kind: 'buff', cooldownMs: T.ward.cooldownMs, durationMs: T.ward.durationMs, energyCost: T.ward.energyCost, tint: T.ward.tint, stats: { reflectPct: T.ward.reflectPct } },
  },
  {
    id: 'sav_br_sacrifice',
    tree: SAV_BLOOD_TREE,
    name: 'Sacrificial Might',
    description: `Activate: give the altar what it asks — pay ${T.sacrifice.bloodCost} health for +${Math.round(T.sacrifice.damageMult * 100)}% damage over ${(T.sacrifice.durationMs / 1000).toFixed(0)}s. Too little blood and the rite refuses.`,
    cost: 1,
    prereq: 'sav_br_ward',
    tier: 6,
    effect: { kind: 'active', action: 'sav_sacrifice', cooldownMs: T.sacrifice.cooldownMs, energyCost: T.sacrifice.energyCost },
  },
  {
    id: 'sav_br_hemorrhage',
    tree: SAV_BLOOD_TREE,
    name: 'Hemorrhage',
    description: `Activate: the same wound, opened again — each cast STACKS the bleeding (up to ${T.hemorrhage.maxStacks}) on the nearest enemy.`,
    cost: 1,
    prereq: 'sav_br_sacrifice',
    tier: 7,
    effect: {
      kind: 'stacking_dot',
      cooldownMs: T.hemorrhage.cooldownMs,
      range: T.hemorrhage.range,
      dmgPerTick: T.hemorrhage.dmgPerTick,
      tickMs: T.hemorrhage.tickMs,
      durationMs: T.hemorrhage.durationMs,
      maxStacks: T.hemorrhage.maxStacks,
      energyCost: T.hemorrhage.energyCost,
      color: T.hemorrhage.color,
    },
  },
  {
    id: 'sav_br_mire',
    tree: SAV_BLOOD_TREE,
    name: 'Blood Mire',
    description: `Activate: spill it across the ground ahead — for ${(T.mire.durationMs / 1000).toFixed(0)}s everything wading through is slowed and sapped.`,
    cost: 1,
    prereq: 'sav_br_hemorrhage',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'sav_mire',
      cooldownMs: T.mire.cooldownMs,
      energyCost: T.mire.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.mire.placeAhead, radius: T.mire.radius, tickDamage: T.mire.tickDamage, tickMs: T.mire.tickMs, durationMs: T.mire.durationMs, slowFactor: T.mire.slowFactor, fill: 0x5a1a14, stroke: 0xd04a3a }],
    },
  },
  {
    id: 'sav_br_hunger',
    tree: SAV_BLOOD_TREE,
    name: "Blood God's Hunger",
    description: `Ultimate — Activate: the great rite — pay ${T.hunger.bloodCost} health and the hunger goes OUT: a devouring nova that returns ${T.hunger.healPerHit} life for every enemy it bites. Long cooldown.`,
    cost: 1,
    prereq: 'sav_br_mire',
    tier: 9,
    effect: { kind: 'active', action: 'sav_hunger', cooldownMs: T.hunger.cooldownMs, energyCost: T.hunger.energyCost },
  },
];
