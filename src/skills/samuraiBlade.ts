import type { SkillDef } from './skillData';

/**
 * SAMURAI — WAY OF THE BLADE TREE (10 skills, linear; MELEE DPS).
 *
 * RULING (Casey): pure DPS — defense through timing, not armor. This tree is
 * the sword itself: fast strikes, the IAIJUTSU sheathe (count-1 consume-buff,
 * framework extension #3), the dash-through cut, and the THOUSAND CUTS combo
 * ultimate. "Resolve" is prose over standard energy. Conventions as always:
 * EVERY tunable in {@link SAM_BLADE_TUNING} with calibration anchors;
 * placeholder prose. Tree id 'sam_blade'. Tier-0 is a DAMAGING ACTIVE.
 */

export const SAM_BLADE_TREE = 'sam_blade';

// Ids the scene keys the blade passives off of (bleed rider / tempo).
export const RAZORS_EDGE_ID = 'sam_bl_razor';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SAM_BLADE_TUNING = {
  /** 1) FIRST CUT — ENTRY fast precise strike (vs Bash's 26, faster + lighter). */
  firstCut: { range: 70, damage: 20, cooldownMs: 2000, energyCost: 8 },
  /** 2) TWIN FANGS — two rapid cuts (the Mantis/Mosh multi-pulse pattern: 2×13). */
  twinFangs: { hits: 2, damageEach: 13, hitMs: 140, range: 70, cooldownMs: 3200, energyCost: 12 },
  /** 3) RAZOR'S EDGE — keyed passive: strikes leave a BLEED (vs the Wolverine's
   *  5/500ms/2.5s bite DoT). */
  razor: { dmgPerTick: 4, tickMs: 500, durationMs: 2500 },
  /** 4) IAIJUTSU — the sheathe: next strike ×mult + a brief stun (extension #3;
   *  window vs Amplification's arming pattern). */
  iaijutsu: { windowMs: 3000, mult: 2.5, stunMs: 700, cooldownMs: 12000, energyCost: 18 },
  /** 5) CRESCENT SWEEP — a wide arcing cut (vs Shield Swing's arc + Whistle's 40°,
   *  wider and meaner: the blade wants crowds). */
  crescent: { range: 100, coneHalfAngleDeg: 70, damage: 24, cooldownMs: 6000, energyCost: 16 },
  /** 6) DRAGONFLY CUT — dash THROUGH the target, cutting as you pass, ending
   *  behind it (the Charge machinery; distance carries past a melee foe). */
  dragonfly: { distance: 190, damage: 26, knockdownMs: 0, cooldownMs: 8000, energyCost: 18 },
  /** 7) RELENTLESS TEMPO — +attack speed (consecutive-hit stacking EV-mAPPED to a
   *  flat bonus until per-target hit tracking exists; vs Crazed's +30% windows). */
  tempo: { attackSpeedMult: 0.15 },
  /** 8) DUELIST'S CHALLENGE — mark one foe: TAUNT focus + a damage window against
   *  it (the mark's bonus rides the shipped Tainted damage-up window). */
  challenge: { range: 300, tauntMs: 4000, damageMult: 0.25, windowMs: 4000, cooldownMs: 14000, energyCost: 18 },
  /** 9) FALLING PETAL — heavy wind-up overhead that EXECUTES weakened targets
   *  (the conditional-finisher machinery; vs Overswing's 70/600ms + Coda's ×2.5). */
  petal: { radius: 110, damage: 34, bonusMult: 2.2, windUpMs: 600, cooldownMs: 10000, energyCost: 22 },
  /** 10) THOUSAND CUTS — ultimate: the combo-ultimate machinery at a faster beat
   *  than War Song (6000/450/14 → 5000/300/12; pure DPS cadence). */
  thousand: { durationMs: 5000, intervalMs: 300, range: 120, damage: 12, jumps: 1, jumpRange: 130, falloff: 0.6, damageMult: 0.15, cooldownMs: 55000, energyCost: 40, tint: 0xffe9a8 },
} as const;

const T = SAM_BLADE_TUNING;

// ─── THE 10 BLADE SKILLS (linear; tree 'sam_blade') ───────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SAM_BLADE_SKILLS: SkillDef[] = [
  {
    id: 'sam_bl_first',
    tree: SAM_BLADE_TREE,
    name: 'First Cut',
    description: 'Activate: one fast, precise cut. Costs little Resolve, asks perfect placement. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'sam_first_cut',
      cooldownMs: T.firstCut.cooldownMs,
      energyCost: T.firstCut.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.firstCut.range, damage: T.firstCut.damage, tint: 0xffe9a8 }],
    },
  },
  {
    id: 'sam_bl_twin',
    tree: SAM_BLADE_TREE,
    name: 'Twin Fangs',
    description: `Activate: two cuts faster than one breath — ${T.twinFangs.hits} rapid strikes in front of you.`,
    cost: 1,
    prereq: 'sam_bl_first',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'sam_twin_fangs',
      cooldownMs: T.twinFangs.cooldownMs,
      energyCost: T.twinFangs.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.twinFangs.range, damage: T.twinFangs.damageEach, tint: 0xffe9a8, pulses: T.twinFangs.hits, pulseMs: T.twinFangs.hitMs }],
    },
  },
  {
    id: RAZORS_EDGE_ID,
    tree: SAM_BLADE_TREE,
    name: "Razor's Edge",
    description: 'Passive: your edge is honed past mercy — every strike leaves a wound that keeps BLEEDING.',
    cost: 1,
    prereq: 'sam_bl_twin',
    tier: 2,
    effect: { kind: 'passive', stats: {} }, // keyed — the scene arms the strike bleed while owned
  },
  {
    id: 'sam_bl_iaijutsu',
    tree: SAM_BLADE_TREE,
    name: 'Iaijutsu',
    description: `Activate: sheathe the blade and breathe. Your NEXT strike within ${(T.iaijutsu.windowMs / 1000).toFixed(0)}s cuts ×${T.iaijutsu.mult} and STUNS what it meets. One breath. One cut.`,
    cost: 1,
    prereq: RAZORS_EDGE_ID,
    tier: 3,
    effect: { kind: 'active', action: 'sam_iaijutsu', cooldownMs: T.iaijutsu.cooldownMs, energyCost: T.iaijutsu.energyCost },
  },
  {
    id: 'sam_bl_crescent',
    tree: SAM_BLADE_TREE,
    name: 'Crescent Sweep',
    description: 'Activate: one wide arcing cut — the crescent moon drawn in steel across everything in front of you.',
    cost: 1,
    prereq: 'sam_bl_iaijutsu',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'sam_crescent',
      cooldownMs: T.crescent.cooldownMs,
      energyCost: T.crescent.energyCost,
      compose: [{ p: 'cone', range: T.crescent.range, halfAngleDeg: T.crescent.coneHalfAngleDeg, damage: T.crescent.damage, tint: 0xffe9a8 }],
    },
  },
  {
    id: 'sam_bl_dragonfly',
    tree: SAM_BLADE_TREE,
    name: 'Dragonfly Cut',
    description: 'Activate: dash THROUGH your enemy, cutting as you pass — you end behind it before the wound knows it exists.',
    cost: 1,
    prereq: 'sam_bl_crescent',
    tier: 5,
    effect: { kind: 'active', action: 'sam_dragonfly', cooldownMs: T.dragonfly.cooldownMs, energyCost: T.dragonfly.energyCost },
  },
  {
    id: 'sam_bl_tempo',
    tree: SAM_BLADE_TREE,
    name: 'Relentless Tempo',
    description: `Passive: the rhythm of consecutive cuts builds on itself — +${Math.round(T.tempo.attackSpeedMult * 100)}% attack speed.`,
    cost: 1,
    prereq: 'sam_bl_dragonfly',
    tier: 6,
    effect: { kind: 'passive', stats: { attackSpeedMult: T.tempo.attackSpeedMult } },
  },
  {
    id: 'sam_bl_challenge',
    tree: SAM_BLADE_TREE,
    name: "Duelist's Challenge",
    description: `Activate: mark one foe — for ${(T.challenge.tauntMs / 1000).toFixed(0)}s it cannot look away from you, and for ${(T.challenge.windowMs / 1000).toFixed(0)}s your blade finds it ${Math.round(T.challenge.damageMult * 100)}% harder.`,
    cost: 1,
    prereq: 'sam_bl_tempo',
    tier: 7,
    effect: { kind: 'active', action: 'sam_challenge', cooldownMs: T.challenge.cooldownMs, energyCost: T.challenge.energyCost },
  },
  {
    id: 'sam_bl_petal',
    tree: SAM_BLADE_TREE,
    name: 'Falling Petal',
    description: `Activate: raise the blade high and let it FALL — a heavy overhead after a breath's telegraph; STUNNED or SLOWED targets take ×${T.petal.bonusMult} of it.`,
    cost: 1,
    prereq: 'sam_bl_challenge',
    tier: 8,
    effect: { kind: 'active', action: 'sam_petal', cooldownMs: T.petal.cooldownMs, energyCost: T.petal.energyCost },
  },
  {
    id: 'sam_bl_thousand',
    tree: SAM_BLADE_TREE,
    name: 'Thousand Cuts',
    description: `Ultimate — Activate: the sword takes over. For ${(T.thousand.durationMs / 1000).toFixed(0)}s a storm of slashes chains itself through everything in reach on a relentless beat. Long cooldown.`,
    cost: 1,
    prereq: 'sam_bl_petal',
    tier: 9,
    effect: { kind: 'active', action: 'sam_thousand_cuts', cooldownMs: T.thousand.cooldownMs, energyCost: T.thousand.energyCost },
  },
];
