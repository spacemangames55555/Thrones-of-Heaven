import type { SkillDef } from './skillData';

/**
 * NECROMANCER — SUMMONS TREE (10 skills; linear with an EITHER/OR BRANCH at node 6).
 *
 * The Necromancer's pet/army tree, authored as DATA on the existing systems:
 *   - the SUMMON FOUNDATION (attacking skeletons, the Dark Matter Monster, the 3-tier aggro
 *     hierarchy, pet-targeted buffs), and
 *   - the two combat PRIMITIVES (the channeled beam + the stacking DoT).
 *
 * Node 1 (Summon Skeleton) is the ENTRY: it's a pure summon (no direct damage), but the
 * skeleton is the player's offense, so it counts as a valid no-kit FIRST skill (see
 * isStarterSkill) — the skeleton defeats the opening Sasquatch.
 *
 * The PASSIVE auras (Unyielding Beast, Necrotic Presence, the chosen branch passive,
 * Tentacles) carry empty `stats` and are applied by the scene keyed off the exported ids
 * below (per-summon-type modifiers via summons.passiveModsFor) — the same "keyed passive"
 * pattern as Marrow's Osteo Aura. The ACTIVE/summon/channel/DoT nodes wire to existing
 * actions / effect kinds. EVERY tunable lives in {@link SUMMONS_TUNING}.
 *
 * >>> EDIT NAMES / DESCRIPTIONS (placeholder prose) + NUMBERS HERE. <<<
 */

export const SUMMONS_TREE = 'summons';

// Branch group (node 6) — the two options are mutually exclusive; Reset frees the choice.
export const SKELETON_BRANCH = 'necro_skeleton_branch';

// Ids the scene keys PASSIVE summon auras off of (applied via summons.passiveModsFor).
export const UNYIELDING_BEAST_ID = 'necro_unyielding_beast'; // Monster: +HP +defense
export const NECROTIC_PRESENCE_ID = 'necro_necrotic_presence'; // all summons: +damage +HP
export const BLOOD_SKELETON_ID = 'necro_blood_skeleton'; // skeletons: +damage (branch A)
export const MARROW_SKELETON_ID = 'necro_marrow_skeleton'; // skeletons: +aggro +defense/HP (branch B)
export const TENTACLES_ID = 'necro_tentacles'; // Monster: bigger swing (cleave more targets)

// ─── TUNING (all STARTING values; tune freely in playtest) ────────────────────
export const SUMMONS_TUNING = {
  /** 1) SUMMON SKELETON — raise an attacking skeleton (foundation stats live in SKELETON_TUNING). */
  skeleton: { cooldownMs: 4000, energyCost: 12 },
  /** 2) UNLEASH THE MONSTER — summon the Dark Matter Monster (stats live in DARK_MATTER_TUNING). */
  monster: { cooldownMs: 22000, energyCost: 35 },
  /** 3) UNYIELDING BEAST — PASSIVE: the Monster (pet) gains life + defense while unlocked. */
  unyieldingBeast: { hpBonus: 0.5, drBonus: 0.3 },
  /** 4) NECROTIC PRESENCE — PASSIVE aura: ALL summons gain damage + health while unlocked. */
  necroticPresence: { damageBonus: 0.2, hpBonus: 0.2 },
  /** 5) DARK MATTER — ACTIVE burst: all summons deal more damage for a few seconds. */
  darkMatter: { damageBonus: 0.6, durationMs: 5000, cooldownMs: 14000, energyCost: 20 },
  /** 6a) BLOOD SKELETON — PASSIVE (branch A): skeletons deal more damage (DPS path). */
  bloodSkeleton: { damageBonus: 0.5 },
  /** 6b) MARROW SKELETON — PASSIVE (branch B): skeletons pull aggro from wider + tankier
   *      (aggroRadiusMult keeps them BELOW the Monster's tier, ABOVE the player — hierarchy intact). */
  marrowSkeleton: { aggroRadiusMult: 1.8, drBonus: 0.35, hpBonus: 0.3 },
  /** 7) TENTACLES OF DARK MATTER — PASSIVE: the Monster's swing reaches farther → cleaves more foes. */
  tentacles: { attackRangeMult: 2.0 },
  /** 8) DEATH CHANNEL — channeled beam (reuses the channel primitive). */
  deathChannel: { range: 360, durationMs: 10000, damagePerTick: 14, tickMs: 500, cooldownMs: 9000, energyCost: 12, resourcePerSec: 8, interruptCooldownFraction: 1 },
  /** 9) ENTROPY CASCADE — stacking DoT (reuses the stacking-DoT primitive). */
  entropyCascade: { dmgPerTick: 8, tickMs: 600, durationMs: 5000, maxStacks: 6, cooldownMs: 800, energyCost: 6, color: 0x9a6cff },
  /** 10) ARMY OF THE DEAD — capstone: raise a skeleton swarm + empower all summons for a window. */
  army: { skeletons: 6, swarmLifespanMs: 12000, empowerDamage: 0.4, empowerHP: 0.4, empowerDurationMs: 12000, cooldownMs: 60000, energyCost: 40 },
} as const;

// ─── THE 10 SUMMONS SKILLS (tree 'summons'; node 6 = branch) ──────────────────
export const SUMMONS_TREE_SKILLS: SkillDef[] = [
  {
    id: 'necro_summon_skeleton',
    tree: SUMMONS_TREE,
    name: 'Summon Skeleton',
    description: 'Activate: raise an attacking skeleton that hunts and strikes nearby enemies. Several can stand at once. Your starting offense.',
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'summon_skeleton', cooldownMs: SUMMONS_TUNING.skeleton.cooldownMs, energyCost: SUMMONS_TUNING.skeleton.energyCost },
  },
  {
    id: 'necro_unleash_monster',
    tree: SUMMONS_TREE,
    name: 'Unleash the Monster',
    description: 'Activate: manifest the Dark Matter Monster — a high-HP pet that BOTH draws enemy aggro and attacks.',
    cost: 1,
    prereq: 'necro_summon_skeleton',
    tier: 1,
    effect: { kind: 'active', action: 'summon_dark_matter', cooldownMs: SUMMONS_TUNING.monster.cooldownMs, energyCost: SUMMONS_TUNING.monster.energyCost },
  },
  {
    id: UNYIELDING_BEAST_ID,
    tree: SUMMONS_TREE,
    name: 'Unyielding Beast',
    description: `Passive: your Monster (pet) is far hardier — +${Math.round(SUMMONS_TUNING.unyieldingBeast.hpBonus * 100)}% life and −${Math.round(SUMMONS_TUNING.unyieldingBeast.drBonus * 100)}% damage taken.`,
    cost: 1,
    prereq: 'necro_unleash_monster',
    tier: 2,
    effect: { kind: 'passive', stats: {} }, // applied by the scene (Monster-only aura)
  },
  {
    id: NECROTIC_PRESENCE_ID,
    tree: SUMMONS_TREE,
    name: 'Necrotic Presence',
    description: `Passive aura: ALL your summons gain +${Math.round(SUMMONS_TUNING.necroticPresence.damageBonus * 100)}% damage and +${Math.round(SUMMONS_TUNING.necroticPresence.hpBonus * 100)}% health while unlocked.`,
    cost: 1,
    prereq: UNYIELDING_BEAST_ID,
    tier: 3,
    effect: { kind: 'passive', stats: {} }, // applied by the scene (all-summon aura)
  },
  {
    id: 'necro_dark_matter',
    tree: SUMMONS_TREE,
    name: 'Dark Matter',
    description: `Activate: charge your summons with dark matter — +${Math.round(SUMMONS_TUNING.darkMatter.damageBonus * 100)}% summon damage for ${(SUMMONS_TUNING.darkMatter.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: NECROTIC_PRESENCE_ID,
    tier: 4,
    effect: { kind: 'active', action: 'necro_dark_matter_burst', cooldownMs: SUMMONS_TUNING.darkMatter.cooldownMs, energyCost: SUMMONS_TUNING.darkMatter.energyCost },
  },
  // ── NODE 6 — EITHER/OR BRANCH (split button): choose ONE (locks the other) ──
  {
    id: BLOOD_SKELETON_ID,
    tree: SUMMONS_TREE,
    name: 'Blood Skeleton',
    description: `Passive (choose one): your skeletons deal +${Math.round(SUMMONS_TUNING.bloodSkeleton.damageBonus * 100)}% damage — the DPS path (you tank in Marrownaut).`,
    cost: 1,
    prereq: 'necro_dark_matter',
    tier: 5,
    branch: { group: SKELETON_BRANCH },
    effect: { kind: 'passive', stats: {} }, // applied by the scene (skeleton-only aura)
  },
  {
    id: MARROW_SKELETON_ID,
    tree: SUMMONS_TREE,
    name: 'Marrow Skeleton',
    description: `Passive (choose one): your skeletons pull aggro from wider and grow tankier (+defense/HP) — the support path. Their aggro stays below the Monster's, above yours.`,
    cost: 1,
    prereq: 'necro_dark_matter',
    tier: 5,
    branch: { group: SKELETON_BRANCH },
    effect: { kind: 'passive', stats: {} }, // applied by the scene (skeleton-only aura)
  },
  // ── NODE 7+ — require a branch choice (prereqGroup) ──
  {
    id: TENTACLES_ID,
    tree: SUMMONS_TREE,
    name: 'Tentacles of Dark Matter',
    description: 'Passive: the Monster lashes out with dark tendrils — its swing reaches farther, striking MORE enemies at once (cleave).',
    cost: 1,
    prereqGroup: SKELETON_BRANCH,
    tier: 6,
    effect: { kind: 'passive', stats: {} }, // applied by the scene (Monster cleave)
  },
  {
    id: 'necro_death_channel',
    tree: SUMMONS_TREE,
    name: 'Death Channel',
    description: 'Activate channel: tap to lock the nearest enemy and drain it for up to 10s (ticks damage, trickles energy back). MOVING or any other skill cancels it.',
    cost: 1,
    prereq: TENTACLES_ID,
    tier: 7,
    effect: {
      kind: 'channel',
      cooldownMs: SUMMONS_TUNING.deathChannel.cooldownMs,
      range: SUMMONS_TUNING.deathChannel.range,
      durationMs: SUMMONS_TUNING.deathChannel.durationMs,
      damagePerTick: SUMMONS_TUNING.deathChannel.damagePerTick,
      tickMs: SUMMONS_TUNING.deathChannel.tickMs,
      energyCost: SUMMONS_TUNING.deathChannel.energyCost,
      resourcePerSec: SUMMONS_TUNING.deathChannel.resourcePerSec,
      interruptCooldownFraction: SUMMONS_TUNING.deathChannel.interruptCooldownFraction,
    },
  },
  {
    id: 'necro_entropy_cascade',
    tree: SUMMONS_TREE,
    name: 'Entropy Cascade',
    description: `Activate: seed a decaying life-drain on the nearest enemy. Re-cast to STACK it (up to ${SUMMONS_TUNING.entropyCascade.maxStacks}); stacks sum, each with its own timer.`,
    cost: 1,
    prereq: 'necro_death_channel',
    tier: 8,
    effect: {
      kind: 'stacking_dot',
      cooldownMs: SUMMONS_TUNING.entropyCascade.cooldownMs,
      range: SUMMONS_TUNING.deathChannel.range,
      dmgPerTick: SUMMONS_TUNING.entropyCascade.dmgPerTick,
      tickMs: SUMMONS_TUNING.entropyCascade.tickMs,
      durationMs: SUMMONS_TUNING.entropyCascade.durationMs,
      maxStacks: SUMMONS_TUNING.entropyCascade.maxStacks,
      energyCost: SUMMONS_TUNING.entropyCascade.energyCost,
      color: SUMMONS_TUNING.entropyCascade.color,
    },
  },
  {
    id: 'necro_army_of_the_dead',
    tree: SUMMONS_TREE,
    name: 'Army of the Dead',
    description: `Capstone — Activate: instantly raise a swarm of ${SUMMONS_TUNING.army.skeletons} skeletons AND empower ALL your summons (+${Math.round(SUMMONS_TUNING.army.empowerDamage * 100)}% damage / +${Math.round(SUMMONS_TUNING.army.empowerHP * 100)}% HP) for ${(SUMMONS_TUNING.army.empowerDurationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'necro_entropy_cascade',
    tier: 9,
    effect: { kind: 'active', action: 'necro_army', cooldownMs: SUMMONS_TUNING.army.cooldownMs, energyCost: SUMMONS_TUNING.army.energyCost },
  },
];
