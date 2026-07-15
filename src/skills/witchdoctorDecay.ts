import type { SkillDef } from './skillData';
import { DOMAIN_TINT } from '../world/enemy-roster';

/**
 * WITCH DOCTOR — ALCHEMY OF DECAY TREE (10 skills, linear).
 *
 * DECAY DOMAINS (Casey's ruling — COSMETIC ONLY): every skill here carries a
 * `decayDomain` field — physical / mental / spiritual / all — that tints its FX
 * with the SHIPPED domain colors ({@link DOMAIN_TINT}: red / blue / violet) and
 * flavors its prose. NO combat-triangle mechanics — data and visuals only; the
 * Nova ('all') tri-tints all three. Conventions as always: EVERY tunable in
 * {@link WD_DECAY_TUNING} with calibration anchors; placeholder prose. Tree id
 * 'wd_decay'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const WD_DECAY_TREE = 'wd_decay';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const WD_DECAY_TUNING = {
  /** 1) BLOW DART — ENTRY bolt + rot DoT (vs Toxic Bolt's dart + poison field,
   *  single-target flavored). PHYSICAL. */
  dart: { damage: 14, speed: 520, range: 340, radius: 8, dot: { dmgPerTick: 4, tickMs: 600, durationMs: 3000, radius: 30 }, cooldownMs: 2600, energyCost: 10 },
  /** 2) VENOMOUS INFUSION — weapon buff (vs Berserker/Sharpen's +20%). PHYSICAL. */
  infusion: { damageMult: 0.2, durationMs: 10000, cooldownMs: 16000, energyCost: 20 },
  /** 3) POISON MASTERY — +decay damage, EV-mapped to the global damage multiplier
   *  until per-school damage exists (the Perfect Pitch precedent). ALL. */
  mastery: { damageMult: 0.12 },
  /** 4) PLAGUE CLOUD — miasma zone: DoT + weaken (Pestilence-lite with damage). MENTAL. */
  cloud: { placeAhead: 200, radius: 130, tickDamage: 6, tickMs: 500, durationMs: 5000, weaken: 0.2, cooldownMs: 12000, energyCost: 22 },
  /** 5) LIFE DRAIN — the drain primitive (vs Leech: damage with heal-back). SPIRITUAL. */
  drain: { range: 300, damage: 20, healPct: 0.7, cooldownMs: 8000, energyCost: 16 },
  /** 6) HALLUCINOGENIC BREW — the confusion reuse (vs Cursed Vision's numbers,
   *  cheaper + shorter: the brew is crude). MENTAL. */
  brew: { range: 300, chance: 0.8, durationMs: 3200, chipDamage: 8, chipMs: 600, cooldownMs: 10000, energyCost: 16 },
  /** 7) MIASMA ARMOR — dark shroud: damage resist + a withering aura (the
   *  transformation-aura machinery; vs Bone Armor-class resists). SPIRITUAL. */
  miasma: { damageReduction: 0.2, auraDamage: 6, auraRadius: 110, durationMs: 9000, cooldownMs: 18000, energyCost: 24 },
  /** 8) VENOM FLASK — lobbed bolt + corroding splash + DoT (vs Combust's splash
   *  18/r90 + Toxic Bolt's field). PHYSICAL. */
  flask: { damage: 16, speed: 460, range: 320, radius: 10, splash: { radius: 100, damage: 12 }, dot: { dmgPerTick: 5, tickMs: 500, durationMs: 2500, radius: 90 }, cooldownMs: 9000, energyCost: 22 },
  /** 9) CORROSIVE ERUPTION — placed burst + heavy WEAKEN (defense-down mapped to
   *  the shipped weaken channel; vs Earthquake-class placed bursts). PHYSICAL. */
  eruption: { placeAhead: 180, radius: 120, damage: 30, weaken: 0.35, weakenMs: 5000, cooldownMs: 14000, energyCost: 26 },
  /** 10) PESTILENCE NOVA — ultimate: contagious total decay (vs Pestilence's
   *  plague: bigger seed radius + spread on an ultimate cooldown). ALL (tri-tint). */
  nova: { applyRadius: 180, dotDamage: 7, dotTickMs: 500, dotDurationMs: 5000, spreadRadius: 200, maxSpread: 10, cooldownMs: 50000, energyCost: 40 },
  /** The Nova's tri-tint rings — MUST stay the three shipped domain colors. */
  novaTints: [DOMAIN_TINT.physical, DOMAIN_TINT.mental, DOMAIN_TINT.spiritual],
} as const;

const T = WD_DECAY_TUNING;

// ─── THE 10 DECAY SKILLS (linear; tree 'wd_decay') ────────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const WD_DECAY_SKILLS: SkillDef[] = [
  {
    id: 'wd_dc_dart',
    tree: WD_DECAY_TREE,
    name: 'Blow Dart',
    description: 'Activate: a dart tipped in rot — it strikes the BODY, and the decay keeps working after it lands. Your reliable opener. (Physical decay.)',
    cost: 1,
    tier: 0,
    decayDomain: 'physical',
    ensemble: { damagePerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_dart',
      cooldownMs: T.dart.cooldownMs,
      energyCost: T.dart.energyCost,
      compose: [{ p: 'bolt', damage: T.dart.damage, speed: T.dart.speed, range: T.dart.range, radius: T.dart.radius, tint: DOMAIN_TINT.physical, dot: { ...T.dart.dot, color: DOMAIN_TINT.physical } }],
    },
  },
  {
    id: 'wd_dc_infusion',
    tree: WD_DECAY_TREE,
    name: 'Venomous Infusion',
    description: `Activate: anoint your weapons in decay-brew — for ${(T.infusion.durationMs / 1000).toFixed(0)}s every blow corrodes body and defense (+${Math.round(T.infusion.damageMult * 100)}% damage). (Physical decay.)`,
    cost: 1,
    prereq: 'wd_dc_dart',
    tier: 1,
    decayDomain: 'physical',
    ensemble: { damagePerAllyPct: 0.05 },
    effect: { kind: 'buff', cooldownMs: T.infusion.cooldownMs, durationMs: T.infusion.durationMs, energyCost: T.infusion.energyCost, tint: DOMAIN_TINT.physical, stats: { damageMult: T.infusion.damageMult } },
  },
  {
    id: 'wd_dc_mastery',
    tree: WD_DECAY_TREE,
    name: 'Poison Mastery',
    description: `Passive: every decay you inflict — of body, mind, or spirit — runs ${Math.round(T.mastery.damageMult * 100)}% deeper. (All domains.)`,
    cost: 1,
    prereq: 'wd_dc_infusion',
    tier: 2,
    decayDomain: 'all',
    ensemble: { damagePerAllyPct: 0.03 },
    effect: { kind: 'passive', stats: { damageMult: T.mastery.damageMult } },
  },
  {
    id: 'wd_dc_cloud',
    tree: WD_DECAY_TREE,
    name: 'Plague Cloud',
    description: `Activate: loose a miasma that fogs the MIND — enemies inside decay and swing ${Math.round(T.cloud.weaken * 100)}% weaker for ${(T.cloud.durationMs / 1000).toFixed(0)}s. (Mental decay.)`,
    cost: 1,
    prereq: 'wd_dc_mastery',
    tier: 3,
    decayDomain: 'mental',
    ensemble: { radiusPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_cloud',
      cooldownMs: T.cloud.cooldownMs,
      energyCost: T.cloud.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.cloud.placeAhead, radius: T.cloud.radius, tickDamage: T.cloud.tickDamage, tickMs: T.cloud.tickMs, durationMs: T.cloud.durationMs, weaken: T.cloud.weaken, fill: 0x24356a, stroke: DOMAIN_TINT.mental }],
    },
  },
  {
    id: 'wd_dc_drain',
    tree: WD_DECAY_TREE,
    name: 'Life Drain',
    description: `Activate: sap the SPIRIT's vitality down the cord and into your own — the nearest enemy withers and you mend. (Spiritual decay.)`,
    cost: 1,
    prereq: 'wd_dc_cloud',
    tier: 4,
    decayDomain: 'spiritual',
    ensemble: { drainPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_life_drain',
      cooldownMs: T.drain.cooldownMs,
      energyCost: T.drain.energyCost,
      compose: [{ p: 'drain', range: T.drain.range, damage: T.drain.damage, healPct: T.drain.healPct, tint: DOMAIN_TINT.spiritual }],
    },
  },
  {
    id: 'wd_dc_brew',
    tree: WD_DECAY_TREE,
    name: 'Hallucinogenic Brew',
    description: `Activate: the MIND decays first — an enemy drinks the fumes and turns on its own kind for ${(T.brew.durationMs / 1000).toFixed(1)}s. (Mental decay.)`,
    cost: 1,
    prereq: 'wd_dc_drain',
    tier: 5,
    decayDomain: 'mental',
    ensemble: { durationPerAllyMs: 0 },
    effect: { kind: 'active', action: 'wd_brew', cooldownMs: T.brew.cooldownMs, energyCost: T.brew.energyCost },
  },
  {
    id: 'wd_dc_miasma',
    tree: WD_DECAY_TREE,
    name: 'Miasma Armor',
    description: `Activate: wrap yourself in a shroud of dark energy for ${(T.miasma.durationMs / 1000).toFixed(0)}s — nearby souls WITHER while yours resists (−${Math.round(T.miasma.damageReduction * 100)}% damage taken). (Spiritual decay.)`,
    cost: 1,
    prereq: 'wd_dc_brew',
    tier: 6,
    decayDomain: 'spiritual',
    ensemble: { auraPerAllyPct: 0.05 },
    effect: {
      kind: 'transformation',
      cooldownMs: T.miasma.cooldownMs,
      durationMs: T.miasma.durationMs,
      energyCost: T.miasma.energyCost,
      tint: DOMAIN_TINT.spiritual,
      stats: { damageReduction: T.miasma.damageReduction },
      auraDamage: T.miasma.auraDamage,
      auraRadius: T.miasma.auraRadius,
    },
  },
  {
    id: 'wd_dc_flask',
    tree: WD_DECAY_TREE,
    name: 'Venom Flask',
    description: 'Activate: lob a flask of concentrated rot — it bursts on the first BODY it meets, corroding everything in the splash. (Physical decay.)',
    cost: 1,
    prereq: 'wd_dc_miasma',
    tier: 7,
    decayDomain: 'physical',
    ensemble: { splashPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_flask',
      cooldownMs: T.flask.cooldownMs,
      energyCost: T.flask.energyCost,
      compose: [
        { p: 'bolt', damage: T.flask.damage, speed: T.flask.speed, range: T.flask.range, radius: T.flask.radius, tint: DOMAIN_TINT.physical, splash: { radius: T.flask.splash.radius, damage: T.flask.splash.damage }, dot: { ...T.flask.dot, color: DOMAIN_TINT.physical } },
      ],
    },
  },
  {
    id: 'wd_dc_eruption',
    tree: WD_DECAY_TREE,
    name: 'Corrosive Eruption',
    description: `Activate: the ground erupts in caustic decay — armor and flesh MELT TOGETHER (heavy damage; survivors swing ${Math.round(T.eruption.weaken * 100)}% weaker for ${(T.eruption.weakenMs / 1000).toFixed(0)}s). (Physical decay.)`,
    cost: 1,
    prereq: 'wd_dc_flask',
    tier: 8,
    decayDomain: 'physical',
    ensemble: { damagePerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_eruption',
      cooldownMs: T.eruption.cooldownMs,
      energyCost: T.eruption.energyCost,
      compose: [{ p: 'strike', at: 'ahead', range: T.eruption.placeAhead, radius: T.eruption.radius, damage: T.eruption.damage, tint: DOMAIN_TINT.physical, weaken: T.eruption.weaken, weakenMs: T.eruption.weakenMs, weakenOnlyIfHit: true }],
    },
  },
  {
    id: 'wd_dc_nova',
    tree: WD_DECAY_TREE,
    name: 'Pestilence Nova',
    description: 'Ultimate — Activate: TOTAL DECAY. A contagious wave rolls out of you, unmaking body, mind, and spirit at once — and it SPREADS. Long cooldown. (All domains — the wave burns red, blue, and violet.)',
    cost: 1,
    prereq: 'wd_dc_eruption',
    tier: 9,
    decayDomain: 'all',
    ensemble: { spreadPerAlly: 0 },
    effect: { kind: 'active', action: 'wd_nova', cooldownMs: T.nova.cooldownMs, energyCost: T.nova.energyCost },
  },
];
