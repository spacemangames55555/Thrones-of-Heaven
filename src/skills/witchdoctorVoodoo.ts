import type { SkillDef } from './skillData';
import { VOODOO_DOLL_TUNING, SPIRIT_DECOY_TUNING } from '../summon/summonData';

/**
 * WITCH DOCTOR — VOODOO MASTERY TREE (10 skills, linear).
 *
 * The kit's centerpiece: the VOODOO DOLL bind (strike the doll here, wound the
 * bound spirit anywhere) plus the decoy/illusion half of the spirit trade. The
 * three doll UPGRADES (Soulbound Hex / Shadow Stitch / Spirit Assault) are KEYED
 * passives — the scene arms their hooks only while owned. Conventions as always:
 * EVERY tunable in {@link WD_VOODOO_TUNING} (the doll's own numbers live with its
 * summon config in summonData's {@link VOODOO_DOLL_TUNING}) with calibration
 * anchors; placeholder prose. Tree id 'wd_voodoo'. Tier-0 is a DAMAGING ACTIVE
 * (no-kit rule): the doll cast itself deals its initial spirit damage.
 */

export const WD_VOODOO_TREE = 'wd_voodoo';

// Ids the scene keys the doll UPGRADE hooks + the on-kill harvest off of.
export const SOULBOUND_HEX_ID = 'wd_vd_hex';
export const SHADOW_STITCH_ID = 'wd_vd_stitch';
export const SPIRIT_ASSAULT_ID = 'wd_vd_assault';
export const SOUL_HARVEST_ID = 'wd_vd_harvest';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const WD_VOODOO_TUNING = {
  /** 1) VOODOO DOLL — ENTRY: the bind + doll (numbers in VOODOO_DOLL_TUNING; the
   *  initial hit calibrates vs Bone Dart's ~20 single-target). */
  doll: { cooldownMs: VOODOO_DOLL_TUNING.summonCooldownMs, energyCost: VOODOO_DOLL_TUNING.summonEnergyCost },
  /** 2) SPIRIT PROJECTION — the decoy duplicate (numbers in SPIRIT_DECOY_TUNING;
   *  magnet tier vs the Polar Bear's taunt). */
  decoy: { cooldownMs: SPIRIT_DECOY_TUNING.summonCooldownMs, energyCost: SPIRIT_DECOY_TUNING.summonEnergyCost },
  /** 3) CURSED VISION — the confusion reuse (vs Sonic Distortion's 320/0.8/4s). */
  vision: { range: 320, chance: 0.8, durationMs: 4000, chipDamage: 8, chipMs: 600, cooldownMs: 12000, energyCost: 20 },
  /** 4) SPIRIT SHACKLES — root + life drain (root vs Bone Grasp's hold; drain vs
   *  the Leech pattern: damage with a heal-back fraction). */
  shackles: { range: 300, rootMs: 2200, damage: 18, healPct: 0.6, cooldownMs: 10000, energyCost: 20 },
  /** 5/6/9) The doll UPGRADES — numbers live in VOODOO_DOLL_TUNING (reflect 12,
   *  stitch 130/0.5, assault 6 per 1000ms), armed only while owned. */
  /** 7) SPECTRAL ECHOES — brief mini-decoy illusions (three small magnets for 4s;
   *  the crowd-confusion half of Spirit Projection). */
  echoes: { count: 3, durationMs: 4000, cooldownMs: 16000, energyCost: 22 },
  /** 8) SOUL HARVEST — on-kill essence: HP + energy per credited kill (vs War
   *  Chant-class sustain, event-driven instead of per-second). */
  harvest: { healPerKill: 8, energyPerKill: 6 },
  /** 10) SPIRIT SPLIT — ultimate composite: decoy walks + the doll auto-mirrors
   *  (pulse vs the doll's own mirror numbers; duration/cd vs the 45–60s ultimates). */
  split: { durationMs: 8000, intervalMs: 700, pulseDamage: 12, cooldownMs: 50000, energyCost: 40 },
} as const;

const T = WD_VOODOO_TUNING;

// ─── THE 10 VOODOO SKILLS (linear; tree 'wd_voodoo') ──────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const WD_VOODOO_SKILLS: SkillDef[] = [
  {
    id: 'wd_vd_doll',
    tree: WD_VOODOO_TREE,
    name: 'Voodoo Doll',
    description: 'Activate: bind the nearest enemy to a stitched doll at your side. The binding itself wounds the spirit — and while it holds, strikes that land on the DOLL land on THEM, however far they run. Your reliable opener.',
    cost: 1,
    tier: 0,
    ensemble: { mirrorPerAllyPct: 0.05 },
    effect: { kind: 'active', action: 'wd_doll', cooldownMs: T.doll.cooldownMs, energyCost: T.doll.energyCost },
  },
  {
    id: 'wd_vd_decoy',
    tree: WD_VOODOO_TREE,
    name: 'Spirit Projection',
    description: 'Activate: step your spirit out of your body — a spectral duplicate that enemies cannot resist attacking. It fights nothing; it simply IS, and they hate it.',
    cost: 1,
    prereq: 'wd_vd_doll',
    tier: 1,
    ensemble: { durationPerAllyMs: 0 },
    effect: { kind: 'active', action: 'wd_decoy', cooldownMs: T.decoy.cooldownMs, energyCost: T.decoy.energyCost },
  },
  {
    id: 'wd_vd_vision',
    tree: WD_VOODOO_TREE,
    name: 'Cursed Vision',
    description: `Activate: pour distorted visions into an enemy's eyes — it turns on its NEAREST FELLOW for ${(T.vision.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wd_vd_decoy',
    tier: 2,
    ensemble: { durationPerAllyMs: 0 },
    effect: { kind: 'active', action: 'wd_cursed_vision', cooldownMs: T.vision.cooldownMs, energyCost: T.vision.energyCost },
  },
  {
    id: 'wd_vd_shackles',
    tree: WD_VOODOO_TREE,
    name: 'Spirit Shackles',
    description: 'Activate: spectral chains erupt from the earth — the nearest enemy is ROOTED while its life is drawn down the links into you.',
    cost: 1,
    prereq: 'wd_vd_vision',
    tier: 3,
    ensemble: { drainPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_shackles',
      cooldownMs: T.shackles.cooldownMs,
      energyCost: T.shackles.energyCost,
      compose: [
        { p: 'strike', at: 'nearest', range: T.shackles.range, radius: 40, rootMs: T.shackles.rootMs, tint: 0x9a4ae0, noRing: true, missBanner: 'No spirit in reach' },
        { p: 'drain', range: T.shackles.range, damage: T.shackles.damage, healPct: T.shackles.healPct, tint: 0x9a4ae0 },
      ],
    },
  },
  {
    id: SOULBOUND_HEX_ID,
    tree: WD_VOODOO_TREE,
    name: 'Soulbound Hex',
    description: `Passive doll upgrade: the hex bites back — enemies that strike your doll take ${VOODOO_DOLL_TUNING.reflectDamage} damage in return.`,
    cost: 1,
    prereq: 'wd_vd_shackles',
    tier: 4,
    ensemble: { reflectPerAllyPct: 0.05 },
    effect: { kind: 'passive', stats: {} }, // keyed — the scene arms the doll's reflect while owned
  },
  {
    id: SHADOW_STITCH_ID,
    tree: WD_VOODOO_TREE,
    name: 'Shadow Stitch',
    description: `Passive doll upgrade: the threads spread — mirrored damage also tears into enemies near the bound target (${Math.round(VOODOO_DOLL_TUNING.stitchPct * 100)}% in a ${VOODOO_DOLL_TUNING.stitchRadius}px weave).`,
    cost: 1,
    prereq: SOULBOUND_HEX_ID,
    tier: 5,
    ensemble: { stitchPerAllyPct: 0.05 },
    effect: { kind: 'passive', stats: {} }, // keyed — the scene arms the stitch splash while owned
  },
  {
    id: 'wd_vd_echoes',
    tree: WD_VOODOO_TREE,
    name: 'Spectral Echoes',
    description: `Activate: scatter ${T.echoes.count} brief spirit illusions — for ${(T.echoes.durationMs / 1000).toFixed(0)}s the enemy cannot tell which of you is real.`,
    cost: 1,
    prereq: SHADOW_STITCH_ID,
    tier: 6,
    ensemble: { echoesPerAlly: 0 },
    effect: { kind: 'active', action: 'wd_echoes', cooldownMs: T.echoes.cooldownMs, energyCost: T.echoes.energyCost },
  },
  {
    id: SOUL_HARVEST_ID,
    tree: WD_VOODOO_TREE,
    name: 'Soul Harvest',
    description: `Passive: fallen enemies' essence flows to you — ${T.harvest.healPerKill} HP and ${T.harvest.energyPerKill} energy with every kill.`,
    cost: 1,
    prereq: 'wd_vd_echoes',
    tier: 7,
    ensemble: { harvestPerAllyPct: 0.05 },
    effect: { kind: 'passive', stats: {} }, // keyed — the scene harvests on each credited kill
  },
  {
    id: SPIRIT_ASSAULT_ID,
    tree: WD_VOODOO_TREE,
    name: 'Spirit Assault',
    description: `Passive doll upgrade: your spirit worries at the binding — the bound target takes ${VOODOO_DOLL_TUNING.assault.damage} damage every ${(VOODOO_DOLL_TUNING.assault.tickMs / 1000).toFixed(0)}s, BYPASSING all defenses, while the doll holds.`,
    cost: 1,
    prereq: SOUL_HARVEST_ID,
    tier: 8,
    ensemble: { assaultPerAllyPct: 0.05 },
    effect: { kind: 'passive', stats: {} }, // keyed — the scene runs the assault ticks while owned + bound
  },
  {
    id: 'wd_vd_split',
    tree: WD_VOODOO_TREE,
    name: 'Spirit Split',
    description: `Ultimate — Activate: spirit and body divide. For ${(T.split.durationMs / 1000).toFixed(0)}s your spectral half walks the field drawing every eye while the doll strikes ITSELF on the beat — the bound target suffers with no hand raised. Long cooldown.`,
    cost: 1,
    prereq: SPIRIT_ASSAULT_ID,
    tier: 9,
    ensemble: { pulsePerAllyPct: 0.05 },
    effect: { kind: 'active', action: 'wd_spirit_split', cooldownMs: T.split.cooldownMs, energyCost: T.split.energyCost },
  },
];
