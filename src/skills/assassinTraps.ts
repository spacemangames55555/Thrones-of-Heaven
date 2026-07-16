import type { SkillDef } from './skillData';

/**
 * ASSASSIN — TRAPPER'S ARSENAL TREE (10 skills, linear; DEVICES).
 *
 * The kit's centerpiece: every device rides the TRAP SYSTEM (framework
 * extension #1 — place → arm → spring on the first enemy inside → payload →
 * consumed), with each PAYLOAD declared as data composing shipped effects.
 * TRAP MASTERY / REMOTE DETONATION / MINEFIELD are the three system hooks
 * (extension #1c). Conventions as always: EVERY tunable in
 * {@link ASN_TRAP_TUNING} with calibration anchors; placeholder prose. Tree id
 * 'asn_traps'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const ASN_TRAP_TREE = 'asn_traps';

// Id the scene keys the mastery hook off (faster arming, stronger payloads,
// +1 armed cap — folded in when a device is placed / at recompute).
export const TRAP_MASTERY_ID = 'asn_tr_mastery';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const ASN_TRAP_TUNING = {
  /** Devices armed at once before the oldest is recycled (Mastery adds +1). */
  baseCap: 3,
  /** 3) TRAP MASTERY — the system hook: arming ×armFactor, payloads ×damageMult,
   *  +1 to the armed cap (vs Steady Hand-class 15% passives, traded wider). */
  mastery: { armFactor: 0.6, damageMult: 1.25, capBonus: 1 },
  /** 1) BLADE TRAP — ENTRY spring-blade: quick arm, a heavy snap on first
   *  contact (burst vs First Cut's 20, paid for by the setup). */
  blade: { placeAhead: 70, armDelayMs: 700, lifetimeMs: 20000, triggerRadius: 70, burstDamage: 26, burstRadius: 80, cooldownMs: 3200, energyCost: 10 },
  /** 2) SNARE TRAP — pure control: roots whoever springs it (vs Pinning Shot's
   *  2.2s hold, longer — the enemy walked into it). */
  snare: { placeAhead: 70, armDelayMs: 700, lifetimeMs: 20000, triggerRadius: 70, rootMs: 2800, cooldownMs: 7000, energyCost: 14 },
  /** 4) TOXIC TRAP — bursts into a lingering poison cloud (zone vs Biohazard's
   *  ticking pool). */
  toxic: { placeAhead: 70, armDelayMs: 800, lifetimeMs: 20000, triggerRadius: 70, zone: { radius: 110, tickDamage: 6, tickMs: 600, durationMs: 4000 }, cooldownMs: 8000, energyCost: 16 },
  /** 5) FLASH TRAP — a blinding burst: the sprung enemy turns on its own
   *  (confusion vs Sonic Distortion's 0.8/4000). */
  flash: { placeAhead: 70, armDelayMs: 700, lifetimeMs: 20000, triggerRadius: 80, confuse: { chance: 0.85, durationMs: 3500 }, cooldownMs: 10000, energyCost: 16 },
  /** 6) EXPLOSIVE TRAP — the heavy charge: area damage on trigger (vs Forge
   *  Strike-class novas, paid for by the setup). */
  explosive: { placeAhead: 70, armDelayMs: 1000, lifetimeMs: 20000, triggerRadius: 80, burstDamage: 34, burstRadius: 130, cooldownMs: 9000, energyCost: 18 },
  /** 7) FROST TRAP — erupts into a slowing frost field (vs Black Ice's
   *  slow-only zone: 0.55). */
  frost: { placeAhead: 70, armDelayMs: 800, lifetimeMs: 20000, triggerRadius: 70, zone: { radius: 120, tickDamage: 0, tickMs: 700, durationMs: 4500, slowFactor: 0.55, fill: 0x3a4a6a, stroke: 0xb8d8ff }, cooldownMs: 9000, energyCost: 16 },
  /** 8) REMOTE DETONATION — the trigger-now hook (extension #1c): every armed
   *  device fires where it stands; with nothing armed the charge returns unspent. */
  remote: { cooldownMs: 6000, energyCost: 8 },
  /** 9) CALTROPS — scattered steel: a field that SLOWS and BLEEDS (the shipped
   *  ground hazard; vs Pestilence's damage+slow zone, lighter + longer). */
  caltrops: { placeAhead: 90, radius: 110, tickDamage: 4, tickMs: 500, durationMs: 6000, slowFactor: 0.6, cooldownMs: 10000, energyCost: 16 },
  /** 10) MINEFIELD — ultimate: seed a whole area with explosive devices
   *  (extension #1c; each mine a lighter Explosive Trap, six of them). */
  minefield: { placeAhead: 200, count: 6, spreadRadius: 150, armDelayMs: 900, lifetimeMs: 25000, triggerRadius: 70, burstDamage: 22, burstRadius: 110, cooldownMs: 45000, energyCost: 40 },
} as const;

const T = ASN_TRAP_TUNING;

// ─── THE 10 TRAPPER SKILLS (linear; tree 'asn_traps') ─────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const ASN_TRAP_SKILLS: SkillDef[] = [
  {
    id: 'asn_tr_blade',
    tree: ASN_TRAP_TREE,
    name: 'Blade Trap',
    description: 'Activate: set a spring-blade where you aim — it arms in a breath and SNAPS shut on the first enemy to touch it. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'asn_blade_trap', cooldownMs: T.blade.cooldownMs, energyCost: T.blade.energyCost },
  },
  {
    id: 'asn_tr_snare',
    tree: ASN_TRAP_TREE,
    name: 'Snare Trap',
    description: `Activate: a hidden loop of wire — whoever steps in is ROOTED for ${(T.snare.rootMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'asn_tr_blade',
    tier: 1,
    effect: { kind: 'active', action: 'asn_snare_trap', cooldownMs: T.snare.cooldownMs, energyCost: T.snare.energyCost },
  },
  {
    id: TRAP_MASTERY_ID,
    tree: ASN_TRAP_TREE,
    name: 'Trap Mastery',
    description: `Passive: practiced hands — devices arm ${Math.round((1 - T.mastery.armFactor) * 100)}% faster, hit ${Math.round((T.mastery.damageMult - 1) * 100)}% harder, and ${T.mastery.capBonus} more can wait armed at once.`,
    cost: 1,
    prereq: 'asn_tr_snare',
    tier: 2,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'asn_tr_toxic',
    tree: ASN_TRAP_TREE,
    name: 'Toxic Trap',
    description: `Activate: a sealed vial under a pressure plate — it bursts into a poison cloud that lingers ${(T.toxic.zone.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: TRAP_MASTERY_ID,
    tier: 3,
    effect: { kind: 'active', action: 'asn_toxic_trap', cooldownMs: T.toxic.cooldownMs, energyCost: T.toxic.energyCost },
  },
  {
    id: 'asn_tr_flash',
    tree: ASN_TRAP_TREE,
    name: 'Flash Trap',
    description: 'Activate: packed phosphor — the burst leaves whoever sprang it blinded, swinging at its own kind.',
    cost: 1,
    prereq: 'asn_tr_toxic',
    tier: 4,
    effect: { kind: 'active', action: 'asn_flash_trap', cooldownMs: T.flash.cooldownMs, energyCost: T.flash.energyCost },
  },
  {
    id: 'asn_tr_explosive',
    tree: ASN_TRAP_TREE,
    name: 'Explosive Trap',
    description: 'Activate: a heavy charge on a trip-plate — everything near the trigger is caught in the blast.',
    cost: 1,
    prereq: 'asn_tr_flash',
    tier: 5,
    effect: { kind: 'active', action: 'asn_explosive_trap', cooldownMs: T.explosive.cooldownMs, energyCost: T.explosive.energyCost },
  },
  {
    id: 'asn_tr_frost',
    tree: ASN_TRAP_TREE,
    name: 'Frost Trap',
    description: `Activate: bottled winter — it erupts into a frost field; enemies inside crawl at ${Math.round((T.frost.zone.slowFactor ?? 1) * 100)}% speed.`,
    cost: 1,
    prereq: 'asn_tr_explosive',
    tier: 6,
    effect: { kind: 'active', action: 'asn_frost_trap', cooldownMs: T.frost.cooldownMs, energyCost: T.frost.energyCost },
  },
  {
    id: 'asn_tr_remote',
    tree: ASN_TRAP_TREE,
    name: 'Remote Detonation',
    description: 'Activate: the thumb comes down — EVERY armed device fires NOW, enemy or no enemy. With nothing armed the charge returns unspent.',
    cost: 1,
    prereq: 'asn_tr_frost',
    tier: 7,
    effect: { kind: 'active', action: 'asn_remote_det', cooldownMs: T.remote.cooldownMs, energyCost: T.remote.energyCost },
  },
  {
    id: 'asn_tr_caltrops',
    tree: ASN_TRAP_TREE,
    name: 'Caltrops',
    description: `Activate: scatter steel across the ground — for ${(T.caltrops.durationMs / 1000).toFixed(0)}s everything crossing it is slowed and bleeding.`,
    cost: 1,
    prereq: 'asn_tr_remote',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'asn_caltrops',
      cooldownMs: T.caltrops.cooldownMs,
      energyCost: T.caltrops.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.caltrops.placeAhead, radius: T.caltrops.radius, tickDamage: T.caltrops.tickDamage, tickMs: T.caltrops.tickMs, durationMs: T.caltrops.durationMs, slowFactor: T.caltrops.slowFactor, fill: 0x4a4038, stroke: 0xc8b8a0 }],
    },
  },
  {
    id: 'asn_tr_minefield',
    tree: ASN_TRAP_TREE,
    name: 'Minefield',
    description: `Ultimate — Activate: seed the ground ahead with ${T.minefield.count} charges. Nothing walks through what they hold. Long cooldown.`,
    cost: 1,
    prereq: 'asn_tr_caltrops',
    tier: 9,
    effect: { kind: 'active', action: 'asn_minefield', cooldownMs: T.minefield.cooldownMs, energyCost: T.minefield.energyCost },
  },
];
