import type { SkillDef } from './skillData';

/**
 * PRIEST — LIGHT TREE (10 skills, linear; PROTECTION).
 *
 * The shield-bearer's half of the Light: the TARGETED ALLY-SHIELD (framework
 * extension #1 — nearest friendly, self always valid, absorb + a breath of
 * harm immunity), its AoE and ultimate forms, the HP-cost mend, the following
 * aura, and DIVINE INTERVENTION on the party-dormant revive hook (extension
 * #3 — today every cast is a graceful refunded whiff). DIVINE FORTRESS is the
 * keyed passive folding into every Priest shield. "Faith" is prose over
 * standard energy. Conventions as always: EVERY tunable in
 * {@link PRS_LIGHT_TUNING} with calibration anchors; placeholder prose. Tree
 * id 'prs_light'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const PRS_LIGHT_TREE = 'prs_light';

// Id the scene keys the shield passive off (stronger + longer Priest shields,
// folded in wherever a Priest shield is granted).
export const PRS_FORTRESS_ID = 'prs_li_fortress';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const PRS_LIGHT_TUNING = {
  /** 1) RAY OF LIGHT — ENTRY searing lance (vs Yumi Shot's 16/560/380; the
   *  Priest hits a touch harder per bolt, slower). */
  ray: { damage: 20, speed: 560, range: 380, radius: 9, cooldownMs: 2400, energyCost: 9 },
  /** 2) SHIELD OF FAITH — extension #1: the targeted ally-shield (absorb vs
   *  Frequency Shield's 50/5s, split lighter for being castable on a friend). */
  shieldFaith: { range: 300, amount: 40, durationMs: 6000, immunityMs: 1500, cooldownMs: 10000, energyCost: 16 },
  /** 3) RETRIBUTION AURA — the reflect buff (vs Mirror Barrier's 0.5/6s,
   *  lighter + longer). */
  retribution: { reflectPct: 0.35, durationMs: 8000, cooldownMs: 16000, energyCost: 20, tint: 0xffd0a0 },
  /** 4) GUARDIAN'S EMBRACE — the HP-COST AoE mend: pay your own health, heal
   *  every companion near you (the ALLY RULE: none near = a refunded whiff;
   *  cost/heal vs Life Infusion's 15→30). */
  embrace: { radius: 180, cost: 20, heal: 30, cooldownMs: 12000, energyCost: 10 },
  /** 5) RADIANT AURA — a FOLLOWING mend + a little armor while it walks with
   *  you (zone vs Hum of the Ancients' 3/1000/20s; the armor half soft). */
  radiant: { radius: 120, healPerTick: 3, tickMs: 1000, durationMs: 12000, damageReduction: 0.1, cooldownMs: 20000, energyCost: 22 },
  /** 6) CELESTIAL BARRIER — the AoE shield: every friendly inside the light
   *  when it falls is wrapped (amount vs Shield of Faith, lighter each). */
  barrier: { radius: 160, amount: 30, durationMs: 6000, cooldownMs: 16000, energyCost: 22 },
  /** 7) DIVINE FORTRESS — the keyed shield passive: every Priest shield holds
   *  ×strength and lasts ×duration. */
  fortress: { strengthMult: 1.3, durationMult: 1.4 },
  /** 8) GUARDIAN'S BLESSING — AoE ward: armor + affliction immunity for you,
   *  toughness for your companions (vs War Chant's 0.2 reduction). */
  blessing: { damageReduction: 0.15, durationMs: 8000, immunityMs: 4000, summonDrBonus: 0.3, cooldownMs: 20000, energyCost: 24, tint: 0xffe9a8 },
  /** 9) DIVINE INTERVENTION — extension #3: the revive on the PARTY-DORMANT
   *  hook — the price is only ever paid when someone is actually raised. */
  intervention: { hpCost: 30, cooldownMs: 30000, energyCost: 20 },
  /** 10) AEGIS OF DAWN — ultimate: shields over you AND every companion, and
   *  the light REFLECTS while it holds (vs Retribution + Barrier together). */
  aegis: { amount: 50, durationMs: 8000, reflectPct: 0.3, cooldownMs: 60000, energyCost: 45, tint: 0xffe9a8 },
} as const;

const T = PRS_LIGHT_TUNING;

// ─── THE 10 LIGHT SKILLS (linear; tree 'prs_light') ───────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const PRS_LIGHT_SKILLS: SkillDef[] = [
  {
    id: 'prs_li_ray',
    tree: PRS_LIGHT_TREE,
    name: 'Ray of Light',
    description: 'Activate: a searing lance of light, straight and unbending. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'prs_ray',
      cooldownMs: T.ray.cooldownMs,
      energyCost: T.ray.energyCost,
      compose: [{ p: 'bolt', damage: T.ray.damage, speed: T.ray.speed, range: T.ray.range, radius: T.ray.radius, tint: 0xffe9a8 }],
    },
  },
  {
    id: 'prs_li_shield',
    tree: PRS_LIGHT_TREE,
    name: 'Shield of Faith',
    description: `Activate: wrap the nearest companion — or yourself, alone — in absorbing light (${T.shieldFaith.amount} damage), with a breath in which no affliction can land.`,
    cost: 1,
    prereq: 'prs_li_ray',
    tier: 1,
    effect: { kind: 'active', action: 'prs_shield_faith', cooldownMs: T.shieldFaith.cooldownMs, energyCost: T.shieldFaith.energyCost },
  },
  {
    id: 'prs_li_retribution',
    tree: PRS_LIGHT_TREE,
    name: 'Retribution Aura',
    description: `Activate: for ${(T.retribution.durationMs / 1000).toFixed(0)}s the Light answers — REFLECT ${Math.round(T.retribution.reflectPct * 100)}% of incoming harm back at nearby attackers.`,
    cost: 1,
    prereq: 'prs_li_shield',
    tier: 2,
    effect: { kind: 'buff', cooldownMs: T.retribution.cooldownMs, durationMs: T.retribution.durationMs, energyCost: T.retribution.energyCost, tint: T.retribution.tint, stats: { reflectPct: T.retribution.reflectPct } },
  },
  {
    id: 'prs_li_embrace',
    tree: PRS_LIGHT_TREE,
    name: "Guardian's Embrace",
    description: `Activate: give of yourself — pay ${T.embrace.cost} health; every companion near you mends ${T.embrace.heal}. With no one near, the gift returns unspent.`,
    cost: 1,
    prereq: 'prs_li_retribution',
    tier: 3,
    effect: { kind: 'active', action: 'prs_embrace', cooldownMs: T.embrace.cooldownMs, energyCost: T.embrace.energyCost },
  },
  {
    id: 'prs_li_radiant',
    tree: PRS_LIGHT_TREE,
    name: 'Radiant Aura',
    description: `Activate: a soft radiance walks with you for ${(T.radiant.durationMs / 1000).toFixed(0)}s — mending those beside you while you stand ${Math.round(T.radiant.damageReduction * 100)}% harder to hurt.`,
    cost: 1,
    prereq: 'prs_li_embrace',
    tier: 4,
    effect: { kind: 'active', action: 'prs_radiant', cooldownMs: T.radiant.cooldownMs, energyCost: T.radiant.energyCost },
  },
  {
    id: 'prs_li_barrier',
    tree: PRS_LIGHT_TREE,
    name: 'Celestial Barrier',
    description: `Activate: light falls over the ground you hold — every friendly inside it is wrapped in ${T.barrier.amount} absorbing light.`,
    cost: 1,
    prereq: 'prs_li_radiant',
    tier: 5,
    effect: { kind: 'active', action: 'prs_barrier', cooldownMs: T.barrier.cooldownMs, energyCost: T.barrier.energyCost },
  },
  {
    id: PRS_FORTRESS_ID,
    tree: PRS_LIGHT_TREE,
    name: 'Divine Fortress',
    description: `Passive: your shields are architecture — they hold ${Math.round((T.fortress.strengthMult - 1) * 100)}% more and last ${Math.round((T.fortress.durationMult - 1) * 100)}% longer.`,
    cost: 1,
    prereq: 'prs_li_barrier',
    tier: 6,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'prs_li_blessing',
    tree: PRS_LIGHT_TREE,
    name: "Guardian's Blessing",
    description: `Activate: a spoken ward over everyone with you — ${Math.round(T.blessing.damageReduction * 100)}% less harm for ${(T.blessing.durationMs / 1000).toFixed(0)}s, and for a breath no affliction can cling to you.`,
    cost: 1,
    prereq: PRS_FORTRESS_ID,
    tier: 7,
    effect: { kind: 'active', action: 'prs_blessing', cooldownMs: T.blessing.cooldownMs, energyCost: T.blessing.energyCost },
  },
  {
    id: 'prs_li_intervention',
    tree: PRS_LIGHT_TREE,
    name: 'Divine Intervention',
    description: 'Activate: give of your own life to raise a fallen companion. No one lies fallen today — the Light waits, and the price stays unpaid.',
    cost: 1,
    prereq: 'prs_li_blessing',
    tier: 8,
    effect: { kind: 'active', action: 'prs_intervene', cooldownMs: T.intervention.cooldownMs, energyCost: T.intervention.energyCost },
  },
  {
    id: 'prs_li_aegis',
    tree: PRS_LIGHT_TREE,
    name: 'Aegis of Dawn',
    description: `Ultimate — Activate: dawn breaks over you and every companion — absorbing light on all of you, REFLECTING ${Math.round(T.aegis.reflectPct * 100)}% of what strikes you while it holds. Long cooldown.`,
    cost: 1,
    prereq: 'prs_li_intervention',
    tier: 9,
    effect: { kind: 'active', action: 'prs_aegis', cooldownMs: T.aegis.cooldownMs, energyCost: T.aegis.energyCost },
  },
];
