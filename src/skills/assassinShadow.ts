import type { SkillDef } from './skillData';

/**
 * ASSASSIN — SHADOW ARTS TREE (10 skills, linear; STEALTH).
 *
 * The stealth loop: enter the dark (Cloak / Vanish — extension #4), strike out
 * of it harder (the STEALTH-BONUS rider — extension #2; Ambush is the payoff
 * and RIDES THE ALLY-RULE REFUND when cast unhidden), and finish with SHADOW
 * DANCE (extension #3 — striking no longer breaks stealth). Shadow Step is the
 * shipped Blink + a strike; Smoke Bomb the confusion + aggro-drop reuse.
 * Conventions as always: EVERY tunable in {@link ASN_SHADOW_TUNING} with
 * calibration anchors; placeholder prose. Tree id 'asn_shadow'. Tier-0 is a
 * DAMAGING ACTIVE (no-kit rule).
 */

export const ASN_SHADOW_TREE = 'asn_shadow';

// Id the scene keys the venom passive off (the strike-DoT hook, the Razor's
// Edge precedent — armed while owned).
export const POISONED_EDGE_ID = 'asn_sh_poisoned';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const ASN_SHADOW_TUNING = {
  /** 1) SILENT BLADE — ENTRY quick strike, ×bonus FROM STEALTH (extension #2;
   *  base vs First Cut's 20, lighter — the bonus is the identity). */
  silent: { range: 70, damage: 16, stealthBonus: 1.8, cooldownMs: 2000, energyCost: 8 },
  /** 2) CLOAK OF SHADOWS — true stealth until you act (vs Spirit Walk's 5s,
   *  much longer — the Assassin LIVES here). */
  cloak: { durationMs: 20000, cooldownMs: 16000, energyCost: 16 },
  /** 3) AMBUSH — the loop's payoff: a devastating strike that REQUIRES stealth
   *  (cast unhidden it whiffs and refunds — the ally-rule machinery; damage vs
   *  Heaven's Arc's 55, melee-close). */
  ambush: { range: 75, damage: 48, cooldownMs: 9000, energyCost: 20 },
  /** 4) EVASIVE MANEUVERS — evasion + speed (evasion mapped to block, the
   *  Flowing Movement precedent). */
  evasive: { moveSpeedMult: 0.08, blockChance: 0.12, blockReduction: 0.6 },
  /** 5) SHADOW STEP — the Blink reuse aimed AT a target: reappear behind it,
   *  blade first (vs Dragonfly's 190/26 dash-through; whiffs refunded). */
  step: { seekRange: 260, behindGap: 34, damage: 22, strikeRange: 70, cooldownMs: 8000, energyCost: 16 },
  /** 6) SMOKE BOMB — the confusion + aggro-drop reuse: they falter and LOSE you
   *  (confusion vs Sonic Distortion's 0.8; the drop a short stealth breath). */
  smoke: { range: 200, chance: 0.85, confuseMs: 3200, chipDamage: 8, chipMs: 700, dropMs: 1500, cooldownMs: 12000, energyCost: 18 },
  /** 7) SILENT TAKEDOWN — the conditional finisher: the WEAKENED (stunned/
   *  slowed) take ×bonus (vs Coup de Grâce / Falling Petal's ×2). */
  takedown: { reach: 60, radius: 70, damage: 20, bonusMult: 2, cooldownMs: 8000, energyCost: 16 },
  /** 8) VANISH — extension #4: the instant mid-combat re-stealth + a breath of
   *  untargetability. */
  vanish: { stealthMs: 5000, graceMs: 700, cooldownMs: 20000, energyCost: 20 },
  /** 9) POISONED EDGE — strikes leave venom (the strike-DoT hook; vs Razor's
   *  Edge's bleed: 4/500/2500). */
  poisoned: { dmgPerTick: 4, tickMs: 500, durationMs: 3000 },
  /** 10) SHADOW DANCE — ultimate (extension #3): striking does NOT break stealth
   *  and every silent blade keeps its bonus for the window. */
  dance: { durationMs: 7000, cooldownMs: 50000, energyCost: 40 },
} as const;

const T = ASN_SHADOW_TUNING;

// ─── THE 10 SHADOW SKILLS (linear; tree 'asn_shadow') ─────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const ASN_SHADOW_SKILLS: SkillDef[] = [
  {
    id: 'asn_sh_silent',
    tree: ASN_SHADOW_TREE,
    name: 'Silent Blade',
    description: `Activate: one quiet cut — from STEALTH it lands ×${T.silent.stealthBonus} harder. Your reliable opener.`,
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'asn_silent_blade',
      cooldownMs: T.silent.cooldownMs,
      energyCost: T.silent.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.silent.range, damage: T.silent.damage, stealthBonus: T.silent.stealthBonus, tint: 0x9a9ab8 }],
    },
  },
  {
    id: 'asn_sh_cloak',
    tree: ASN_SHADOW_TREE,
    name: 'Cloak of Shadows',
    description: `Activate: step out of every eye — TRUE STEALTH for up to ${(T.cloak.durationMs / 1000).toFixed(0)}s, until you act.`,
    cost: 1,
    prereq: 'asn_sh_silent',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'asn_cloak',
      cooldownMs: T.cloak.cooldownMs,
      energyCost: T.cloak.energyCost,
      compose: [{ p: 'stealth', durationMs: T.cloak.durationMs, banner: 'The shadows take you' }],
    },
  },
  {
    id: 'asn_sh_ambush',
    tree: ASN_SHADOW_TREE,
    name: 'Ambush',
    description: 'Activate: the strike the whole hunt was for — devastating, and only possible FROM STEALTH. Unhidden, the moment passes unspent.',
    cost: 1,
    prereq: 'asn_sh_cloak',
    tier: 2,
    effect: { kind: 'active', action: 'asn_ambush', cooldownMs: T.ambush.cooldownMs, energyCost: T.ambush.energyCost },
  },
  {
    id: 'asn_sh_evasive',
    tree: ASN_SHADOW_TREE,
    name: 'Evasive Maneuvers',
    description: `Passive: never quite where the blow lands — +${Math.round(T.evasive.moveSpeedMult * 100)}% speed and slipping evasion.`,
    cost: 1,
    prereq: 'asn_sh_ambush',
    tier: 3,
    effect: { kind: 'passive', stats: { moveSpeedMult: T.evasive.moveSpeedMult, blockChance: T.evasive.blockChance, blockReduction: T.evasive.blockReduction } },
  },
  {
    id: 'asn_sh_step',
    tree: ASN_SHADOW_TREE,
    name: 'Shadow Step',
    description: 'Activate: vanish and reappear BEHIND the nearest enemy, blade already moving. With no one near, the step goes nowhere unspent.',
    cost: 1,
    prereq: 'asn_sh_evasive',
    tier: 4,
    effect: { kind: 'active', action: 'asn_shadow_step', cooldownMs: T.step.cooldownMs, energyCost: T.step.energyCost },
  },
  {
    id: 'asn_sh_smoke',
    tree: ASN_SHADOW_TREE,
    name: 'Smoke Bomb',
    description: 'Activate: glass breaks, smoke blooms — an enemy inside swings at its own kind, and every eye loses you for a breath.',
    cost: 1,
    prereq: 'asn_sh_step',
    tier: 5,
    effect: { kind: 'active', action: 'asn_smoke_bomb', cooldownMs: T.smoke.cooldownMs, energyCost: T.smoke.energyCost },
  },
  {
    id: 'asn_sh_takedown',
    tree: ASN_SHADOW_TREE,
    name: 'Silent Takedown',
    description: `Activate: execute the faltering — STUNNED or SLOWED enemies take ×${T.takedown.bonusMult}. The rest take the ordinary blade.`,
    cost: 1,
    prereq: 'asn_sh_smoke',
    tier: 6,
    effect: { kind: 'active', action: 'asn_takedown', cooldownMs: T.takedown.cooldownMs, energyCost: T.takedown.energyCost },
  },
  {
    id: 'asn_sh_vanish',
    tree: ASN_SHADOW_TREE,
    name: 'Vanish',
    description: 'Activate: mid-swing, mid-chase — you are simply GONE. For a breath nothing can touch what it cannot find.',
    cost: 1,
    prereq: 'asn_sh_takedown',
    tier: 7,
    effect: { kind: 'active', action: 'asn_vanish', cooldownMs: T.vanish.cooldownMs, energyCost: T.vanish.energyCost },
  },
  {
    id: POISONED_EDGE_ID,
    tree: ASN_SHADOW_TREE,
    name: 'Poisoned Edge',
    description: 'Passive: the blades carry venom — every strike leaves a festering wound.',
    cost: 1,
    prereq: 'asn_sh_vanish',
    tier: 8,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'asn_sh_dance',
    tree: ASN_SHADOW_TREE,
    name: 'Shadow Dance',
    description: `Ultimate — Activate: for ${(T.dance.durationMs / 1000).toFixed(0)}s the shadows keep you even as you kill — striking does not break stealth, and every blow lands like an ambush. Long cooldown.`,
    cost: 1,
    prereq: POISONED_EDGE_ID,
    tier: 9,
    effect: { kind: 'active', action: 'asn_shadow_dance', cooldownMs: T.dance.cooldownMs, energyCost: T.dance.energyCost },
  },
];
