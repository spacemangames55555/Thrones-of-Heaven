import type { SkillDef } from './skillData';

/**
 * WIZARD — ETHEREAL / SURVIVAL TREE (10 skills, linear → Ankh ultimate capstone).
 *
 * The Wizard's THIRD and final tree: sustain, shields, healing and self-sufficiency.
 * Reuses the projectile pool (Ethereal Bolt), self-heal (Mend / Soul Siphon), the buff
 * effect kind for timed sustain (Regeneration / Ethereal Form / Sanctuary — pure data,
 * no new code), a damage-absorb SHIELD pool, a damage-REFLECT stat, a BLINK teleport
 * (the dash/blink mechanic), and the death funnel for the Ankh "cheat death" revive.
 * EVERY tunable lives in {@link ETHEREAL_TUNING}; names/descriptions are PLACEHOLDER
 * prose — edit the `name`/`description` fields below. Tree id 'wiz_ethereal'.
 *
 * Per the no-kit invariant the opener (Ethereal Bolt) is a DAMAGING active so it can be
 * a valid starting skill. The capstone Ankh is an ULTIMATE (not a transformation).
 *
 * NOTE: the original spec message was truncated before its explicit skill list; these 10
 * skills are designed from the stated theme + reuse hints (projectiles, self-heal, shield,
 * damage-reflect, blink/teleport, buff-zone, revive). All values/names are data — tune freely.
 */

export const WIZ_ETHEREAL_TREE = 'wiz_ethereal';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const ETHEREAL_TUNING = {
  /** 1) ETHEREAL BOLT — ENTRY ghostly projectile (must defeat the Sasquatch). */
  etherealBolt: { damage: 26, speed: 500, range: 360, radius: 11, cooldownMs: 1300, energyCost: 9 },
  /** 2) MEND — instant self-heal. */
  mend: { healAmount: 35, cooldownMs: 9000, energyCost: 22 },
  /** 3) REGENERATION — timed HP regen buff (pure buff; reuses War Chant's regen). */
  regeneration: { regenPerSec: 8, durationMs: 8000, cooldownMs: 16000, energyCost: 20, tint: 0xa8ffd0 },
  /** 4) MANA SHIELD — a damage-absorbing shield pool for a duration. */
  manaShield: { amount: 60, durationMs: 8000, cooldownMs: 14000, energyCost: 22 },
  /** 5) BLINK — instant teleport in the facing direction (the survival escape). */
  blink: { distance: 240, cooldownMs: 6000, energyCost: 14 },
  /** 6) REFLECT — timed buff: reflect a fraction of incoming damage to nearby attackers. */
  reflect: { reflectPct: 0.5, radius: 130, durationMs: 6000, cooldownMs: 14000, energyCost: 20, tint: 0xff9ad0 },
  /** 7) ETHEREAL FORM — timed buff: become wraith-like (heavy damage reduction). */
  etherealForm: { damageReduction: 0.6, durationMs: 6000, cooldownMs: 18000, energyCost: 24, tint: 0xbfa8ff },
  /** 8) SOUL SIPHON — frontal drain: damages foes ahead + HEALS you per enemy hit. */
  soulSiphon: { damage: 24, healPerHit: 10, maxHeals: 4, range: 115, cooldownMs: 7000, energyCost: 18 },
  /** 9) SANCTUARY — strong timed buff: regen + damage reduction (a hallowed ward). */
  sanctuary: { regenPerSec: 12, damageReduction: 0.3, durationMs: 8000, cooldownMs: 22000, energyCost: 26, tint: 0xcfe8ff },
  /** 10) ANKH — ULTIMATE: arm a cheat-death ward; the next lethal blow revives you instead. */
  ankh: { reviveHpPct: 0.5, armedMs: 10000, cooldownMs: 90000, energyCost: 40 },
} as const;

const T = ETHEREAL_TUNING;

// ─── THE 10 ETHEREAL/SURVIVAL SKILLS (linear; tree 'wiz_ethereal') ────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const WIZARD_ETHEREAL_SKILLS: SkillDef[] = [
  {
    id: 'eth_bolt',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Ethereal Bolt',
    description: 'Activate: hurl a bolt of raw spirit at the first enemy it hits. Your reliable ranged attack.',
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'eth_bolt', cooldownMs: T.etherealBolt.cooldownMs, energyCost: T.etherealBolt.energyCost },
  },
  {
    id: 'eth_mend',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Mend',
    description: `Activate: knit your wounds, instantly restoring ${T.mend.healAmount} HP.`,
    cost: 1,
    prereq: 'eth_bolt',
    tier: 1,
    effect: { kind: 'active', action: 'eth_mend', cooldownMs: T.mend.cooldownMs, energyCost: T.mend.energyCost },
  },
  {
    id: 'eth_regeneration',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Regeneration',
    description: `Activate: regenerate ${T.regeneration.regenPerSec} HP/sec for ${(T.regeneration.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'eth_mend',
    tier: 2,
    effect: { kind: 'buff', cooldownMs: T.regeneration.cooldownMs, durationMs: T.regeneration.durationMs, energyCost: T.regeneration.energyCost, tint: T.regeneration.tint, stats: { regenPerSec: T.regeneration.regenPerSec } },
  },
  {
    id: 'eth_mana_shield',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Mana Shield',
    description: `Activate: raise a shield that ABSORBS the next ${T.manaShield.amount} damage (lasts up to ${(T.manaShield.durationMs / 1000).toFixed(0)}s).`,
    cost: 1,
    prereq: 'eth_regeneration',
    tier: 3,
    effect: { kind: 'active', action: 'eth_mana_shield', cooldownMs: T.manaShield.cooldownMs, energyCost: T.manaShield.energyCost },
  },
  {
    id: 'eth_blink',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Blink',
    description: 'Activate: phase instantly forward, teleporting a short distance to escape danger.',
    cost: 1,
    prereq: 'eth_mana_shield',
    tier: 4,
    effect: { kind: 'active', action: 'eth_blink', cooldownMs: T.blink.cooldownMs, energyCost: T.blink.energyCost },
  },
  {
    id: 'eth_reflect',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Reflect',
    description: `Activate: for ${(T.reflect.durationMs / 1000).toFixed(0)}s, REFLECT ${Math.round(T.reflect.reflectPct * 100)}% of incoming damage back at nearby attackers.`,
    cost: 1,
    prereq: 'eth_blink',
    tier: 5,
    effect: { kind: 'buff', cooldownMs: T.reflect.cooldownMs, durationMs: T.reflect.durationMs, energyCost: T.reflect.energyCost, tint: T.reflect.tint, stats: { reflectPct: T.reflect.reflectPct } },
  },
  {
    id: 'eth_form',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Ethereal Form',
    description: `Activate: turn wraith-like for ${(T.etherealForm.durationMs / 1000).toFixed(0)}s — take ${Math.round(T.etherealForm.damageReduction * 100)}% less damage.`,
    cost: 1,
    prereq: 'eth_reflect',
    tier: 6,
    effect: { kind: 'buff', cooldownMs: T.etherealForm.cooldownMs, durationMs: T.etherealForm.durationMs, energyCost: T.etherealForm.energyCost, tint: T.etherealForm.tint, stats: { damageReduction: T.etherealForm.damageReduction } },
  },
  {
    id: 'eth_soul_siphon',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Soul Siphon',
    description: `Activate: drain the life from foes in front of you — damage them and HEAL ${T.soulSiphon.healPerHit} HP per enemy struck.`,
    cost: 1,
    prereq: 'eth_form',
    tier: 7,
    effect: { kind: 'active', action: 'eth_soul_siphon', cooldownMs: T.soulSiphon.cooldownMs, energyCost: T.soulSiphon.energyCost },
  },
  {
    id: 'eth_sanctuary',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Sanctuary',
    description: `Activate: a hallowed ward for ${(T.sanctuary.durationMs / 1000).toFixed(0)}s — ${T.sanctuary.regenPerSec} HP/sec regen AND ${Math.round(T.sanctuary.damageReduction * 100)}% damage reduction.`,
    cost: 1,
    prereq: 'eth_soul_siphon',
    tier: 8,
    effect: { kind: 'buff', cooldownMs: T.sanctuary.cooldownMs, durationMs: T.sanctuary.durationMs, energyCost: T.sanctuary.energyCost, tint: T.sanctuary.tint, stats: { regenPerSec: T.sanctuary.regenPerSec, damageReduction: T.sanctuary.damageReduction } },
  },
  {
    id: 'eth_ankh',
    tree: WIZ_ETHEREAL_TREE,
    name: 'Ankh',
    description: `Capstone ULTIMATE — Activate: arm the Ankh of life for ${(T.ankh.armedMs / 1000).toFixed(0)}s. If a lethal blow would fell you while it holds, you CHEAT DEATH instead, reviving at ${Math.round(
      T.ankh.reviveHpPct * 100,
    )}% HP. Long cooldown.`,
    cost: 1,
    prereq: 'eth_sanctuary',
    tier: 9,
    effect: { kind: 'active', action: 'eth_ankh', cooldownMs: T.ankh.cooldownMs, energyCost: T.ankh.energyCost },
  },
];
