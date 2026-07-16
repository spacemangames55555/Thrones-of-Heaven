import type { SkillDef } from './skillData';

/**
 * SUNDIAN — REGALIA OF THE DEEP TREE (10 skills, linear; THE WORN CROWN).
 *
 * The sovereign half: SIGNET FLARE (the ring's stored light — the opener),
 * the three REGALIA (framework #3 — Pearl Diadem / Coral Signet / Abyssal
 * Bands, ONE worn aura at a time), JEWELER'S ATTUNEMENT (every jewel draws
 * deeper), the TIDAL TALISMAN (haste + cheaper casts), the VOTIVE IDOL
 * (a placed mending relic), the curse, the ward, and THE DROWNED CROWN
 * (every regalia at once, empowered). "Tide" is prose over standard energy.
 * Conventions as always: EVERY tunable in {@link SUN_REGALIA_TUNING} with
 * calibration anchors; placeholder prose. Tree id 'sun_regalia'. Tier-0 is
 * a DAMAGING ACTIVE (no-kit rule).
 */

export const SUN_REGALIA_TREE = 'sun_regalia';

// Id the scene keys behavior off (imported there — keep in sync): the
// attunement multiplier scales every donned regalia's stats at recompute.
export const ATTUNEMENT_ID = 'sun_rg_attune';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SUN_REGALIA_TUNING = {
  /** 1) SIGNET FLARE — ENTRY: the ring's stored light as a short searing bolt
   *  (vs Throwing Star-class openers; shorter, hotter). */
  flare: { damage: 19, speed: 540, range: 300, radius: 8, cooldownMs: 2200, energyCost: 8 },
  /** 2) PEARL DIADEM — regalia: the steady mending aura (vs regen passives). */
  pearl: { regenPerSec: 3, tint: 0xe8e2d8, energyCost: 10, cooldownMs: 1500 },
  /** 3) CORAL SIGNET — regalia: the bristling reflect aura (vs Quill Guard's
   *  0.3 timed — smaller, but WORN). */
  coralSignet: { reflectPct: 0.18, tint: 0xe89a8a, energyCost: 10, cooldownMs: 1500 },
  /** 4) ABYSSAL BANDS — regalia: the pressure-damage aura (vs flat damage
   *  passives — bigger, but exclusive with the other jewels). */
  bands: { damageMult: 0.12, tint: 0x2a4a8a, energyCost: 10, cooldownMs: 1500 },
  /** 5) JEWELER'S ATTUNEMENT — every regalia aura ×(1+bonus) when donned. */
  attunement: { bonus: 0.35 },
  /** 6) TIDAL TALISMAN — brief haste + CHEAPER skills (the Tide discount). */
  talisman: { attackSpeedMult: 0.25, energyCostMult: 0.6, durationMs: 7000, cooldownMs: 20000, energyCost: 15, tint: 0x35e0c8 },
  /** 7) VOTIVE IDOL — a placed relic: allies near it mend (the static
   *  friendzone machinery; summons included). */
  idol: { radius: 130, healPerTick: 4, tickMs: 700, durationMs: 7000, cooldownMs: 18000, energyCost: 20 },
  /** 8) DROWNED MAN'S CURSE — weaken + slow on everything near the mark
   *  (vs Terrifying Roar's control split, at range). */
  curse: { range: 300, radius: 140, slowFactor: 0.55, slowMs: 3000, weaken: 0.25, weakenMs: 4000, cooldownMs: 12000, energyCost: 18 },
  /** 9) MOONSTONE WARD — cleanse every affliction + a breath of immunity
   *  (the harm-immunity seam; vs Absolved + the ally-shield rider). */
  ward: { immuneMs: 2000, cooldownMs: 16000, energyCost: 16 },
  /** 10) THE DROWNED CROWN — ultimate: EVERY regalia at once, ×empowerMult,
   *  for the reign's duration. */
  crown: { durationMs: 12000, empowerMult: 1.5, cooldownMs: 60000, energyCost: 45, tint: 0x35e0c8 },
} as const;

const T = SUN_REGALIA_TUNING;

// ─── THE 10 REGALIA SKILLS (linear; tree 'sun_regalia') ───────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SUN_REGALIA_SKILLS: SkillDef[] = [
  {
    id: 'sun_rg_flare',
    tree: SUN_REGALIA_TREE,
    name: 'Signet Flare',
    description: "Activate: the drowned kings' ring gives back a little of the light it swallowed — a short, searing bolt. Your reliable opener.",
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'sun_flare',
      cooldownMs: T.flare.cooldownMs,
      energyCost: T.flare.energyCost,
      compose: [{ p: 'bolt', via: 'aimed', damage: T.flare.damage, speed: T.flare.speed, range: T.flare.range, radius: T.flare.radius, tint: 0x35e0c8 }],
    },
  },
  {
    id: 'sun_rg_pearl',
    tree: SUN_REGALIA_TREE,
    name: 'Pearl Diadem',
    description: `REGALIA — Activate to WEAR it: a steady mending aura (${T.pearl.regenPerSec} health a second). Cast again to take it off. One jewel worn at a time.`,
    cost: 1,
    prereq: 'sun_rg_flare',
    tier: 1,
    effect: { kind: 'active', action: 'sun_pearl', cooldownMs: T.pearl.cooldownMs, energyCost: T.pearl.energyCost },
  },
  {
    id: 'sun_rg_coral',
    tree: SUN_REGALIA_TREE,
    name: 'Coral Signet',
    description: `REGALIA — Activate to WEAR it: a bristling aura that drives ${Math.round(T.coralSignet.reflectPct * 100)}% of the harm done to you back into whoever dealt it. One jewel worn at a time.`,
    cost: 1,
    prereq: 'sun_rg_pearl',
    tier: 2,
    effect: { kind: 'active', action: 'sun_coral', cooldownMs: T.coralSignet.cooldownMs, energyCost: T.coralSignet.energyCost },
  },
  {
    id: 'sun_rg_bands',
    tree: SUN_REGALIA_TREE,
    name: 'Abyssal Bands',
    description: `REGALIA — Activate to WEAR them: the trench's pressure rides your blows (+${Math.round(T.bands.damageMult * 100)}% damage). One jewel worn at a time.`,
    cost: 1,
    prereq: 'sun_rg_coral',
    tier: 3,
    effect: { kind: 'active', action: 'sun_bands', cooldownMs: T.bands.cooldownMs, energyCost: T.bands.energyCost },
  },
  {
    id: ATTUNEMENT_ID,
    tree: SUN_REGALIA_TREE,
    name: "Jeweler's Attunement",
    description: `Passive: you learn what the drowned jewelers knew — every regalia you don draws ${Math.round(T.attunement.bonus * 100)}% deeper.`,
    cost: 1,
    prereq: 'sun_rg_bands',
    tier: 4,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'sun_rg_talisman',
    tree: SUN_REGALIA_TREE,
    name: 'Tidal Talisman',
    description: `Activate: the talisman turns with the tide — for ${(T.talisman.durationMs / 1000).toFixed(0)}s you act ${Math.round(T.talisman.attackSpeedMult * 100)}% faster and every skill costs only ${Math.round(T.talisman.energyCostMult * 100)}% of its Tide.`,
    cost: 1,
    prereq: ATTUNEMENT_ID,
    tier: 5,
    effect: { kind: 'active', action: 'sun_talisman', cooldownMs: T.talisman.cooldownMs, energyCost: T.talisman.energyCost },
  },
  {
    id: 'sun_rg_idol',
    tree: SUN_REGALIA_TREE,
    name: 'Votive Idol',
    description: `Activate: plant the little drowned god where you stand — for ${(T.idol.durationMs / 1000).toFixed(0)}s you and yours MEND in its presence.`,
    cost: 1,
    prereq: 'sun_rg_talisman',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'sun_idol',
      cooldownMs: T.idol.cooldownMs,
      energyCost: T.idol.energyCost,
      compose: [{ p: 'friendzone', radius: T.idol.radius, healPerTick: T.idol.healPerTick, tickMs: T.idol.tickMs, durationMs: T.idol.durationMs, tint: 0x35e0c8, banner: 'The idol keeps its own' }],
    },
  },
  {
    id: 'sun_rg_curse',
    tree: SUN_REGALIA_TREE,
    name: "Drowned Man's Curse",
    description: `Activate: the grudge of everyone the sea kept — enemies around the mark move at ${Math.round(T.curse.slowFactor * 100)}% speed and strike ${Math.round(T.curse.weaken * 100)}% softer.`,
    cost: 1,
    prereq: 'sun_rg_idol',
    tier: 7,
    effect: { kind: 'active', action: 'sun_curse', cooldownMs: T.curse.cooldownMs, energyCost: T.curse.energyCost },
  },
  {
    id: 'sun_rg_ward',
    tree: SUN_REGALIA_TREE,
    name: 'Moonstone Ward',
    description: `Activate: the pale stone takes it all — every affliction on you washes away, and for ${(T.ward.immuneMs / 1000).toFixed(1)}s nothing hostile clings.`,
    cost: 1,
    prereq: 'sun_rg_curse',
    tier: 8,
    effect: { kind: 'active', action: 'sun_ward', cooldownMs: T.ward.cooldownMs, energyCost: T.ward.energyCost },
  },
  {
    id: 'sun_rg_crown',
    tree: SUN_REGALIA_TREE,
    name: 'The Drowned Crown',
    description: `Ultimate — Activate: wear what the sea kept for you. For ${(T.crown.durationMs / 1000).toFixed(0)}s EVERY regalia is worn at once, each ×${T.crown.empowerMult} — the diadem mends, the signet bites back, the bands press down. Long cooldown.`,
    cost: 1,
    prereq: 'sun_rg_ward',
    tier: 9,
    effect: { kind: 'active', action: 'sun_crown', cooldownMs: T.crown.cooldownMs, energyCost: T.crown.energyCost },
  },
];
