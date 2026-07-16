/**
 * SKILL TREE — DATA-DRIVEN DEFINITIONS (the framework's content layer).
 *
 * Every skill in the game is one {@link SkillDef} entry here; the engine
 * (SkillState) + the scene's generic effect handlers read this data, so authoring
 * the real trees is PURELY adding entries — no new code per skill. Each class owns
 * THREE trees building toward a capstone Crystal Form.
 *
 * NO BASE KIT: there is no free default attack/dodge. A new character starts with ZERO
 * playable abilities; the first skill point must be spent on a tree's FIRST node (always
 * a DAMAGING ACTIVE — see {@link isDamagingActive}), which becomes the starting ability.
 * The Blacksmith ships all 30 skills across its three trees (data in blacksmith{Tank,
 * Dps,Control}.ts); the Wizard/Necromancer trees are later data-only batches.
 *
 * ─── TO ADD A REAL SKILL (the whole step) ─────────────────────────────────────
 *  Append a SkillDef to the class's `skills` array with the right `tree`, `tier`,
 *  optional `prereq` (a skill id in the SAME tree), `cost`, and an `effect` of one
 *  of the supported kinds below. Nothing else changes.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { TANK_TREE_SKILLS } from './blacksmithTank';
import { DPS_TREE_SKILLS } from './blacksmithDps';
import { CONTROL_TREE_SKILLS } from './blacksmithControl';
import { WIZARD_FIREWIND_SKILLS, WIZ_FIREWIND_TREE } from './wizardFireWind';
import { WIZARD_ICEPOISON_SKILLS, WIZ_ICEPOISON_TREE } from './wizardIcePoison';
import { WIZARD_ETHEREAL_SKILLS, WIZ_ETHEREAL_TREE } from './wizardEthereal';
import { MARROW_TREE_SKILLS, MARROW_TREE } from './necromancerMarrow';
import { SUMMONS_TREE_SKILLS, SUMMONS_TREE } from './necromancerSummons';
import { DARK_MATTER_TREE_SKILLS, DARK_MATTER_TREE } from './necromancerDarkMatter';
import { DRUID_TAPESTRY_SKILLS, DRUID_TAPESTRY_TREE } from './druidTapestry';
import { DRUID_RESTORATION_SKILLS, DRUID_RESTORATION_TREE } from './druidRestoration';
import { DRUID_WILDKIN_SKILLS, DRUID_WILDKIN_TREE } from './druidWildKin';
import { MAGE_SPACETIME_SKILLS, MAGE_SPACETIME_TREE } from './mageSpacetime';
import { MAGE_ARCANE_SKILLS, MAGE_ARCANE_TREE } from './mageArcane';
import { MAGE_CRYSTAL_SKILLS, MAGE_CRYSTAL_TREE } from './mageCrystalblade';
import { BARD_SONGS_SKILLS, BARD_SONGS_TREE } from './bardSongs';
import { BARD_BATTLE_SKILLS, BARD_BATTLE_TREE } from './bardBattle';
import { BARD_SONIC_SKILLS, BARD_SONIC_TREE } from './bardSonic';
import { WD_VOODOO_SKILLS, WD_VOODOO_TREE } from './witchdoctorVoodoo';
import { WD_DECAY_SKILLS, WD_DECAY_TREE } from './witchdoctorDecay';
import { WD_SPIRIT_SKILLS, WD_SPIRIT_TREE } from './witchdoctorSpirit';
import { SAM_BLADE_SKILLS, SAM_BLADE_TREE } from './samuraiBlade';
import { SAM_STANCE_SKILLS, SAM_STANCE_TREE } from './samuraiStances';
import { SAM_BOW_SKILLS, SAM_BOW_TREE } from './samuraiBow';
import { MONK_PALM_SKILLS, MONK_PALM_TREE } from './monkIronPalm';
import { MONK_CHI_SKILLS, MONK_CHI_TREE } from './monkChi';
import { MONK_SPIRIT_SKILLS, MONK_SPIRIT_TREE } from './monkSpiritual';
import { ASN_TRAP_SKILLS, ASN_TRAP_TREE } from './assassinTraps';
import { ASN_SHADOW_SKILLS, ASN_SHADOW_TREE } from './assassinShadow';
import { ASN_MARKS_SKILLS, ASN_MARKS_TREE } from './assassinMarksman';
import { PRS_LIGHT_SKILLS, PRS_LIGHT_TREE } from './priestLight';
import { PRS_REBUKE_SKILLS, PRS_REBUKE_TREE } from './priestRebuke';
import { PRS_GRACE_SKILLS, PRS_GRACE_TREE } from './priestGrace';
import { SAV_EDGE_SKILLS, SAV_EDGE_TREE } from './savageObsidian';
import { SAV_BLOOD_SKILLS, SAV_BLOOD_TREE } from './savageBlood';
import { SAV_JAGUAR_SKILLS, SAV_JAGUAR_TREE } from './savageJaguar';
import { HUN_BEAST_SKILLS, HUN_BEAST_TREE } from './hunterBeast';
import { HUN_MARKS_SKILLS, HUN_MARKS_TREE } from './hunterMarksman';
import { HUN_WILD_SKILLS, HUN_WILD_TREE } from './hunterFrenzy';
import { SUN_TIDE_SKILLS, SUN_TIDE_TREE } from './sundianTidecaller';
import { SUN_BLADE_SKILLS, SUN_BLADE_TREE } from './sundianBlade';
import { SUN_REGALIA_SKILLS, SUN_REGALIA_TREE } from './sundianRegalia';

/** How many active skills the player can equip to on-screen slots. */
export const LOADOUT_SLOTS = 6;

/** The playable classes. Only the Blacksmith has trees this batch; others slot in later. */
/** NOTE: 'atlantean' is the SAVE-SAFE internal id for Bali's class — its canon
 *  display name is 'Sundian' (Casey's rename; see world/class-canon.ts). */
export type ClassId = 'blacksmith' | 'necromancer' | 'wizard' | 'druid' | 'mage' | 'bard' | 'witchdoctor' | 'samurai' | 'monk' | 'assassin' | 'priest' | 'savage' | 'hunter' | 'atlantean';

/** Stat modifiers a skill contributes — used by PASSIVE (permanent) and by timed
 *  BUFF / TRANSFORMATION effects (while active). All optional; absent = no change. */
export interface SkillStatMods {
  /** +N flat maximum HP. */
  flatMaxHP?: number;
  /** +fraction of base max HP (0.15 = +15%). */
  maxHPMult?: number;
  /** +fraction of melee damage (0.15 = +15%). */
  damageMult?: number;
  /** +fraction of move speed (0.10 = +10%). */
  moveSpeedMult?: number;
  /** Fraction of incoming damage prevented (0.10 = take 10% less); aggregated then capped. */
  damageReduction?: number;
  /** Chance [0..1] to BLOCK an incoming hit (rolled per hit; aggregated then capped). */
  blockChance?: number;
  /** Fraction of a blocked hit's damage negated (0.8 = block removes 80%); max across sources. */
  blockReduction?: number;
  /** HP regenerated per second while this mod is active (buffs). */
  regenPerSec?: number;
  /** +fraction of ATTACK SPEED (0.5 = +50%, i.e. active cooldowns ÷ 1.5). Summed. */
  attackSpeedMult?: number;
  /** Number of times the BASIC strike hits (multi-hit). MAX across sources; base 1. */
  basicHitCount?: number;
  /** LIFESTEAL: heal this fraction of damage the player deals. Summed. */
  lifestealPct?: number;
  /** REFLECT: fraction of incoming damage bounced back to nearby attackers (Reflect buff). Summed. */
  reflectPct?: number;
}

/** Ids dispatched by the scene's ACTIVE-ability handler. New actives add an id + a case. */
export type ActiveActionId =
  | 'forge_strike'
  | 'shield_bash'
  | 'shove'
  | 'shield_swing'
  | 'plow'
  | 'basic_strike'
  | 'dodge'
  | 'bash'
  | 'overswing'
  | 'windmill'
  | 'hammer_throw'
  | 'control_charge'
  | 'disarm'
  | 'intimidate'
  | 'cripple'
  | 'execute'
  // Wizard — Fire/Wind DPS tree.
  | 'wiz_fireball'
  | 'wiz_flicker'
  | 'wiz_combust'
  | 'wiz_dust_devil'
  | 'wiz_gust'
  | 'wiz_lava'
  | 'wiz_immolation'
  | 'wiz_jet_stream'
  | 'wiz_tornado'
  // Wizard — Ice/Poison control tree.
  | 'wiz_icicle'
  | 'wiz_toxic_bolt'
  | 'wiz_black_ice'
  | 'wiz_frostbite'
  | 'wiz_sludge'
  | 'wiz_freezing_rain'
  | 'wiz_biohazard'
  | 'wiz_plague'
  | 'wiz_pestilence'
  // Wizard — Ethereal/Survival tree.
  | 'eth_bolt'
  | 'eth_mend'
  | 'eth_mana_shield'
  | 'eth_blink'
  | 'eth_soul_siphon'
  | 'eth_ankh'
  // Necromancer — Marrow (tank/solo) tree.
  | 'necro_bone_dart'
  | 'necro_spiked_punch'
  | 'necro_bone_nova'
  | 'necro_stake'
  | 'necro_wrecking_ball'
  | 'necro_grasp'
  // Allied summons (player-side).
  | 'summon_ice_golem'
  // Necromancer SUMMONS tree (+ foundation): summon/empower actives.
  | 'summon_skeleton'
  | 'summon_dark_matter'
  | 'buff_summons'
  | 'necro_dark_matter_burst' // timed +summon-damage burst (Dark Matter, node 5)
  | 'necro_army' // capstone: raise a skeleton swarm + empower all summons (Army of the Dead)
  // Necromancer DARK MATTER tree (ranged DPS + debuffs → Singularity).
  | 'necro_dm_blip'
  | 'necro_dm_bomb'
  | 'necro_dm_tainted'
  | 'necro_dm_hex'
  | 'necro_dm_abyssal'
  | 'necro_dm_rift'
  | 'necro_dm_singularity'
  // Druid — Tapestry of Beasts.
  | 'dru_mantis'
  | 'dru_bear_might'
  | 'dru_falcon'
  | 'dru_stealth'
  | 'dru_bee_swarm'
  | 'dru_elk'
  | 'dru_elephant'
  // Druid — Nature's Restoration.
  | 'dru_lye'
  | 'dru_mushroom'
  | 'dru_aloe'
  | 'dru_clay'
  | 'dru_sage_burn'
  | 'dru_spores'
  | 'dru_oil_immunity'
  | 'dru_oil_vitality'
  // Druid — Wild Kin & Earth's Wrath.
  | 'dru_chill'
  | 'dru_viper'
  | 'dru_lightning'
  | 'dru_wolverine'
  | 'dru_earthquake'
  | 'dru_chimp_pair'
  | 'dru_lava_pocket'
  | 'dru_scavengers'
  | 'dru_polar_bear'
  | 'dru_hail'
  // Mage — Spacetime Manipulations. (CANON: Mage ≠ Wizard — no shared ids.)
  | 'mage_quantum_blast'
  | 'mage_contraction'
  | 'mage_time_dilation'
  | 'mage_graviton'
  | 'mage_antimatter'
  | 'mage_wormhole'
  | 'mage_singularity'
  // Mage — Arcane Specialization.
  | 'mage_arcane_orb'
  | 'mage_arcane_blast'
  | 'mage_quantum_shield'
  | 'mage_missiles'
  | 'mage_leech'
  | 'mage_mana_surge'
  | 'mage_black_hole'
  | 'mage_entangle'
  // Mage — Crystalblade Mastery.
  | 'mage_crystal_shard'
  | 'mage_crystal_strike'
  | 'mage_crystal_flurry'
  | 'mage_facet_cleave'
  | 'mage_crystal_pulse'
  | 'mage_shatter'
  | 'mage_crystal_nova'
  // Bard — Songs of the Ancestors (ranged/support).
  | 'bard_dissonant'
  | 'bard_hum'
  | 'bard_harmonics'
  | 'bard_rally'
  // Bard — Battle Resonance (melee only, per the range doctrine).
  | 'bard_mosh'
  | 'bard_cascade'
  | 'bard_whistle'
  | 'bard_heavy_swing'
  | 'bard_stage_dive'
  | 'bard_amplify'
  | 'bard_freq_shield'
  | 'bard_coda'
  | 'bard_war_song'
  // Bard — Sonic Chaos (ranged).
  | 'bard_sonic_blast'
  | 'bard_pulse'
  | 'bard_surge'
  | 'bard_power_chord'
  | 'bard_distortion'
  | 'bard_wall'
  | 'bard_pentatonic'
  | 'bard_riff'
  // Witch Doctor actives (bespoke ids; composed skills share the executor).
  | 'wd_doll'
  | 'wd_decoy'
  | 'wd_cursed_vision'
  | 'wd_shackles'
  | 'wd_echoes'
  | 'wd_spirit_split'
  | 'wd_dart'
  | 'wd_cloud'
  | 'wd_life_drain'
  | 'wd_brew'
  | 'wd_flask'
  | 'wd_eruption'
  | 'wd_nova'
  | 'wd_swarm'
  | 'wd_totem'
  | 'wd_hex_ritual'
  | 'wd_ritual'
  | 'wd_blood_pact'
  | 'wd_spirit_walk'
  | 'wd_soul_bind'
  | 'wd_effigy'
  | 'wd_revenant'
  // Samurai actives (bespoke ids; composed skills share the executor).
  | 'sam_first_cut'
  | 'sam_twin_fangs'
  | 'sam_iaijutsu'
  | 'sam_crescent'
  | 'sam_dragonfly'
  | 'sam_challenge'
  | 'sam_petal'
  | 'sam_thousand_cuts'
  | 'sam_guard_break'
  | 'sam_parry'
  | 'sam_breath'
  | 'sam_kiai'
  | 'sam_perfect_form'
  | 'sam_yumi'
  | 'sam_piercing'
  | 'sam_hamstring'
  | 'sam_whistling'
  | 'sam_running_draw'
  | 'sam_flaming'
  | 'sam_rain'
  | 'sam_pinning'
  | 'sam_heavens_arc'
  // Monk actives (bespoke ids; composed skills share the executor).
  | 'monk_palm'
  | 'monk_flurry'
  | 'monk_sweep'
  | 'monk_deflect'
  | 'monk_pressure'
  | 'monk_rising'
  | 'monk_empower'
  | 'monk_silent'
  | 'monk_hundred'
  | 'monk_chi_wave'
  | 'monk_soothe'
  | 'monk_tranquil'
  | 'monk_aura'
  | 'monk_acupuncture'
  | 'monk_infusion'
  | 'monk_barrier'
  | 'monk_explosion'
  | 'monk_force_palm'
  | 'monk_enigma'
  | 'monk_divine'
  | 'monk_astral'
  | 'monk_wheel'
  | 'monk_mantra'
  // Assassin actives (bespoke ids; composed skills share the executor).
  | 'asn_blade_trap'
  | 'asn_snare_trap'
  | 'asn_toxic_trap'
  | 'asn_flash_trap'
  | 'asn_explosive_trap'
  | 'asn_frost_trap'
  | 'asn_remote_det'
  | 'asn_caltrops'
  | 'asn_minefield'
  | 'asn_silent_blade'
  | 'asn_cloak'
  | 'asn_ambush'
  | 'asn_shadow_step'
  | 'asn_smoke_bomb'
  | 'asn_takedown'
  | 'asn_vanish'
  | 'asn_shadow_dance'
  | 'asn_star'
  | 'asn_rapid'
  | 'asn_ensnare'
  | 'asn_piercing'
  | 'asn_poison_stars'
  | 'asn_trick'
  | 'asn_fan'
  | 'asn_cripple'
  | 'asn_rain_steel'
  // Priest actives (bespoke ids; composed skills share the executor; Judgment
  // Ray is a channel-kind skill and needs no action id).
  | 'prs_ray'
  | 'prs_shield_faith'
  | 'prs_embrace'
  | 'prs_radiant'
  | 'prs_barrier'
  | 'prs_blessing'
  | 'prs_intervene'
  | 'prs_aegis'
  | 'prs_smite'
  | 'prs_rebuke'
  | 'prs_word'
  | 'prs_ground'
  | 'prs_zeal'
  | 'prs_vanquish'
  | 'prs_judgment'
  | 'prs_burst'
  | 'prs_forgive'
  | 'prs_beacon'
  | 'prs_renewal'
  | 'prs_hymn'
  | 'prs_ascend'
  | 'prs_grace_field'
  // Savage actives (bespoke ids; composed skills share the executor; Hemorrhage
  // is a stacking-DoT-kind skill and needs no action id).
  | 'sav_slash'
  | 'sav_jagged'
  | 'sav_leap'
  | 'sav_cleave'
  | 'sav_skull'
  | 'sav_roar'
  | 'sav_headtaker'
  | 'sav_slaughter'
  | 'sav_spike'
  | 'sav_veins'
  | 'sav_crimson'
  | 'sav_transfusion'
  | 'sav_sacrifice'
  | 'sav_mire'
  | 'sav_hunger'
  | 'sav_lunge'
  | 'sav_snarl'
  | 'sav_lick'
  | 'sav_totem'
  // Hunter actives (bespoke ids; composed skills share the executor).
  | 'hun_tame'
  | 'hun_focus'
  | 'hun_scatter'
  | 'hun_great'
  | 'hun_horde'
  | 'hun_mend'
  | 'hun_rage'
  | 'hun_mastery'
  | 'hun_steady'
  | 'hun_multi'
  | 'hun_cripple'
  | 'hun_net'
  | 'hun_boomerang'
  | 'hun_eagle'
  | 'hun_swipe'
  | 'hun_twin'
  | 'hun_hamstring'
  | 'hun_call'
  | 'hun_hunt'
  | 'hun_bloodlet'
  // Sundian actives (bespoke ids; composed skills share the executor).
  | 'sun_lash'
  | 'sun_undertow'
  | 'sun_riptide'
  | 'sun_spout'
  | 'sun_crush'
  | 'sun_whirlpool'
  | 'sun_tsunami'
  | 'sun_trident'
  | 'sun_crashing'
  | 'sun_tidestep'
  | 'sun_coralguard'
  | 'sun_breaker'
  | 'sun_weight'
  | 'sun_twin'
  | 'sun_grasp'
  | 'sun_flare'
  | 'sun_pearl'
  | 'sun_coral'
  | 'sun_bands'
  | 'sun_talisman'
  | 'sun_idol'
  | 'sun_curse'
  | 'sun_ward'
  | 'sun_crown';

/**
 * The five supported EFFECT KINDS. The scene applies them generically:
 *  - passive: stats applied while the skill is unlocked.
 *  - active: registers a usable ability button (dispatched by `action`).
 *  - buff: an activatable timed SELF-buff (temporary stats, optional tint).
 *  - debuff: an activatable timed effect on nearby ENEMIES (hooks + a stub action).
 *  - transformation: a capstone — timed stats + an appearance change (tint), reverts,
 *    with an optional damaging aura.
 */
/**
 * COMPOSED ACTIONS — the class-kit framework's declarative active layer.
 * An ACTIVE skill may carry `compose`: a list of steps, each one SHARED
 * PRIMITIVE plus tunable numbers. The scene executes composed actions
 * generically (runComposedSteps) — no dispatcher case, so a standard new
 * class is pure data. Bespoke dispatcher cases remain legal for genuinely
 * unique mechanics (Crystal Forms, the bone-suit, Singularity, summons…).
 *
 * PRIMITIVES (each maps 1:1 onto a proven scene helper):
 *  strike — ring/arc AoE at self / in front / at a point ahead / on the
 *           nearest enemy, with optional riders: stun, taunt, root,
 *           knockback, slow, weaken (poison- or intimidate-channel),
 *           heal-per-hit, wind-up telegraph, multi-pulse.
 *  bolt   — player projectile (plain, wizard-path, or aim-assisted) with
 *           optional pierce / splash / impact-DoT / defense-down window.
 *  cone   — true wedge hit in the facing direction (optional knockback).
 *  line   — wall/segment hit along the facing direction.
 *  hazard — persistent ground zone (damage ticks, slow, weaken).
 *  heal / shield / ward — self heal, absorb pool, cheat-death arm.
 *  drain  — hit the nearest foe in front and heal a fraction dealt.
 *  plague — contagious DoT that spreads between enemies.
 *  chain  — bolt that arcs to up to N more enemies, damage falloff per jump.
 *  dualbolt — smart-target: damages an enemy in range, else heals an ally/self.
 *  friendzone — heal-over-time ground area for the player + summons
 *               (static, or mobile with follow: true).
 *  stealth — the player leaves all enemy targeting for a window; attacking breaks it.
 *  teleport — short blink in the facing direction (tunable distance); with a
 *             hazard step first it forms the Wormhole composite.
 * Damage fields: `damage` is skill-scaled (skillDamage); `damageRaw` is
 * unscaled (legacy Tank numbers); `damageMult` multiplies playerDamage().
 */
export type ComposedStep =
  | {
      p: 'strike';
      at: 'self' | 'front' | 'ahead' | 'nearest';
      /** front: tuning range (offset = range × reach, hit radius = range).
       *  ahead/nearest: the placement/search distance. self: unused. */
      range?: number;
      /** front offset factor (default 0.6; Shield Swing uses its arcReach). */
      reach?: number;
      /** hit radius when it differs from `range` (self / ahead / nearest). */
      radius?: number;
      damage?: number;
      damageRaw?: number;
      damageMult?: number;
      tint?: number;
      noRing?: boolean;
      windUpMs?: number;
      pulses?: number;
      pulseMs?: number;
      stunMs?: number;
      tauntMs?: number;
      rootMs?: number;
      knockback?: number;
      knockbackStunMs?: number;
      slowFactor?: number;
      slowMs?: number;
      weaken?: number;
      weakenMs?: number;
      weakenChannel?: 'poison' | 'intimidate';
      weakenOnlyIfHit?: boolean;
      healPerHit?: number;
      maxHeals?: number;
      missBanner?: string;
      /** CRYSTALLIZE rider (Mage framework): enemies hit gain this many crystallize
       *  stacks (capped at crystallizeMax; default cap 6). A consume skill (Shatter)
       *  detonates ALL stacks on enemies in its radius for damage per stack. */
      crystallize?: number;
      crystallizeMax?: number;
      /** STEALTH-BONUS rider (Assassin framework): a strike cast FROM stealth (or
       *  during Shadow Dance) deals damage × this. The cast still breaks stealth
       *  per the normal rule — the bonus is captured before the break. */
      stealthBonus?: number;
    }
  | {
      p: 'bolt';
      via?: 'plain' | 'wizard' | 'aimed';
      damage: number;
      speed: number;
      range: number;
      radius: number;
      tint: number;
      pierce?: number;
      splash?: { radius: number; damage: number };
      dot?: { dmgPerTick: number; tickMs: number; durationMs: number; radius: number; color: number };
      vuln?: { mult: number; durationMs: number; banner?: string };
      /** SEEKING rider (Mage framework): the bolt HOMES toward the nearest enemy in
       *  flight (turn rate rad/sec, default 6) — the missile-barrage primitive. */
      seek?: boolean;
      seekTurnRate?: number;
      /** IMPACT rider (Bard framework, plain bolts): control applied where the bolt
       *  lands. ROTATING RIDERS = several bolt steps, each with a different onHit. */
      onHit?: { stunMs?: number; slowFactor?: number; slowMs?: number; weaken?: number; weakenMs?: number; knockback?: number; rootMs?: number };
      /** RETURNING rider (Hunter framework, plain bolts): the boomerang — at max
       *  range the bolt turns and flies home, hitting on the way out AND back. */
      returning?: boolean;
    }
  | { p: 'cone'; range: number; halfAngleDeg: number; damage: number; tint: number; knockback?: number; knockbackStunMs?: number; slowFactor?: number; slowMs?: number; stunMs?: number }
  | { p: 'line'; length: number; width: number; damage: number; tint: number }
  | {
      p: 'hazard';
      at: 'self' | 'ahead';
      placeAhead?: number;
      radius: number;
      tickDamage: number;
      tickMs: number;
      durationMs: number;
      slowFactor?: number;
      weaken?: number;
      fill?: number;
      stroke?: number;
      ring?: number;
      banner?: string;
    }
  | {
      /** HEAL. Default: the caster only. MONK dual extension: with `radius`, also
       *  mends every allied summon (decoy included) within radius of the caster —
       *  the damage half of a dual ring/cone is a separate strike/cone step. */
      p: 'heal';
      amount: number;
      ring?: number;
      radius?: number;
    }
  | { p: 'shield'; amount: number; durationMs: number; banner?: string }
  | { p: 'ward'; armedMs: number; banner?: string }
  | { p: 'drain'; range: number; reach?: number; damage: number; healPct: number; tint: number }
  | { p: 'plague'; applyRange: number; applyRadius: number; dotDamage: number; dotTickMs: number; dotDurationMs: number; spreadRadius: number; maxSpread: number; tint: number }
  // ── DRUID FRAMEWORK EXTENSIONS (additive; class-agnostic like every primitive) ──
  | {
      /** CHAIN-BOUNCE: strike the nearest enemy within `range`, then arc to up to
       *  `jumps` MORE enemies — each within `jumpRange` of the last one hit, never
       *  the same enemy twice — dealing damage × `falloff` per jump. */
      p: 'chain';
      range: number;
      jumps: number;
      jumpRange: number;
      damage: number;
      falloff: number;
      tint: number;
      /** STRIKE-CHAIN (Bard framework): draw the melee swing crescent per hop
       *  instead of only the arc lines — the chain machinery as a melee combo. */
      swingFx?: boolean;
    }
  | {
      /** DUAL-USE bolt (smart-target): with an enemy within `range` it fires a
       *  damaging bolt at it; with NO enemy in range it MENDS instead — the
       *  most-injured allied summon within `healRange`, else the caster. */
      p: 'dualbolt';
      range: number;
      damage: number;
      speed: number;
      radius: number;
      heal: number;
      healRange: number;
      tint: number;
      healTint?: number;
    }
  | {
      /** FRIENDLY ZONE: the ally-facing twin of `hazard` — a ground area that
       *  HEALS the player + allied summons inside it every tick. STATIC (placed
       *  where cast) by default; `follow: true` makes it MOBILE (tracks the caster). */
      p: 'friendzone';
      radius: number;
      healPerTick: number;
      tickMs: number;
      durationMs: number;
      follow?: boolean;
      tint?: number;
      banner?: string;
    }
  | {
      /** PLAYER STEALTH: for `durationMs` the player leaves ALL enemy targeting
       *  (current aggro wiped on entry; enemies hold position unless a summon
       *  draws them). Ends early the moment the player attacks. */
      p: 'stealth';
      durationMs: number;
      banner?: string;
    }
  // ── MAGE FRAMEWORK EXTENSION (additive; class-agnostic like every primitive) ──
  | {
      /** TELEPORT: a short blink in the facing direction (the Blink machinery with
       *  a tunable distance). Composes with `hazard at:'self'` placed FIRST for the
       *  Wormhole pattern: the origin keeps a damaging portal while you exit through it. */
      p: 'teleport';
      distance: number;
    };

export type SkillEffect =
  | { kind: 'passive'; stats: SkillStatMods }
  | {
      kind: 'active';
      cooldownMs: number;
      action: ActiveActionId;
      energyCost?: number;
      compose?: ComposedStep[];
      /** THE CASCADE (Savage framework): flags this strike as sequence step
       *  1/2/3. Cast IN ORDER, each within the cascade window, completing the
       *  trio builds RANK — every rank cuts the flagged casts' cooldowns and
       *  raises their damage; a wrong order or an expired window resets rank
       *  to zero. Only Savage skills carry the flag — inert everywhere else. */
      cascadeStep?: 1 | 2 | 3;
    }
  | { kind: 'buff'; cooldownMs: number; durationMs: number; stats: SkillStatMods; energyCost?: number; tint?: number }
  | { kind: 'debuff'; cooldownMs: number; durationMs: number; radius: number; energyCost?: number }
  | {
      kind: 'transformation';
      cooldownMs: number;
      durationMs: number;
      stats: SkillStatMods;
      tint: number;
      energyCost?: number;
      /** Optional radiant aura while transformed: damage per pulse + its radius. */
      auraDamage?: number;
      auraRadius?: number;
      /** TOGGLE mode (Encapsulation): NO timer — cast to enter, cast again to exit
       *  (the exit cast is never cooldown-gated; the entry cooldown keeps running,
       *  so no flicker re-entry). `durationMs` is ignored while toggled. */
      toggle?: boolean;
      /** STANCE EXCLUSIVITY (Samurai framework): toggled forms sharing a group are
       *  mutually exclusive — entering one exits any other in the same group. */
      stanceGroup?: string;
    }
  /**
   * CHANNELED BEAM (tap-to-channel, auto-lock NEAREST enemy, interrupt-on-act). On a single
   * tap it locks the nearest enemy within `range`, beams for `durationMs` (or until that
   * enemy dies), dealing `damagePerTick` every `tickMs`. MOVING or activating ANY skill
   * interrupts it; the cooldown then runs (× `interruptCooldownFraction` for an interrupt,
   * default 1 = full). Optional `resourcePerSec` trickles energy back while channeling.
   * (Reused later by Death Channel / Dark Energy Beam.)
   */
  | {
      kind: 'channel';
      cooldownMs: number;
      range: number;
      durationMs: number;
      damagePerTick: number;
      tickMs: number;
      energyCost?: number;
      resourcePerSec?: number;
      interruptCooldownFraction?: number;
    }
  /**
   * STACKING DoT. On activation, applies one DoT STACK to the nearest enemy within `range`;
   * re-casting ADDS another stack (each with its own `durationMs`), up to `maxStacks` (at the
   * cap the oldest stack's duration refreshes). Total damage = the SUM of active stacks
   * (every stack ticks `dmgPerTick` every `tickMs`). Built on — and additive to — the existing
   * non-stacking DoT system. (Reused later by Entropy Cascade / Internal Collapse.)
   */
  | {
      kind: 'stacking_dot';
      cooldownMs: number;
      range: number;
      dmgPerTick: number;
      tickMs: number;
      durationMs: number;
      maxStacks: number;
      energyCost?: number;
      color?: number;
    };

/** True for the activatable kinds (they get an on-screen skill button). */
export function isActivatable(e: SkillEffect): boolean {
  return (
    e.kind === 'active' ||
    e.kind === 'buff' ||
    e.kind === 'debuff' ||
    e.kind === 'transformation' ||
    e.kind === 'channel' ||
    e.kind === 'stacking_dot'
  );
}

export interface SkillDef {
  /** Unique id (also the save key + the unlock id). */
  readonly id: string;
  /** Which of the class's three trees this lives in. */
  readonly tree: string;
  readonly name: string;
  readonly description: string;
  /** Skill-point cost to unlock (default 1). */
  readonly cost: number;
  /** Optional prerequisite skill id IN THE SAME TREE (must be unlocked first). */
  readonly prereq?: string;
  /** Row/tier in the tree (0 = top); the UI orders nodes by this. */
  readonly tier: number;
  readonly effect: SkillEffect;
  /** Marks scaffolding TEST skills (proving effect types), not final content. */
  readonly test?: boolean;
  /** Always unlocked + free (no point cost) — e.g. the basic attack/dodge. */
  readonly freeUnlock?: boolean;
  /** A default "basic" skill (the folded-in basic attack / dodge). */
  readonly basic?: boolean;
  /**
   * EITHER/OR BRANCH (generic). When set, this skill is ONE mutually-exclusive option of a
   * branch group: unlocking it LOCKS every other option sharing the same `branch.group`
   * (the player can own only one of the group). Reset Skill Trees frees the choice. Options
   * in a group share the same `tier` (the UI draws them as one split node).
   */
  readonly branch?: { group: string };
  /** Requires that ANY option of this branch group is already unlocked (a post-branch
   *  waypoint, e.g. node 7 after the node-6 branch). Complements the single `prereq`. */
  readonly prereqGroup?: string;
  /** DATA-ONLY animal tag (Druid Tapestry skills): feeds the future visual-trait
   *  system — no rendering reads it today. */
  readonly trait?: string;
  /** DATA-ONLY ensemble scaling (Bard): DORMANT per-ally multipliers for the party
   *  era ("allies" = self + any future party). SOLO values are the live numbers in
   *  the effect/TUNING; nothing reads these until parties exist. */
  readonly ensemble?: Readonly<Record<string, number>>;
  /** DECAY DOMAIN (Witch Doctor Alchemy tree; Casey's ruling — COSMETIC ONLY):
   *  tints the skill's FX with the shipped domain colors (red/blue/violet;
   *  'all' = tri-tint) and flavors its prose. NO combat-triangle mechanics. */
  readonly decayDomain?: 'physical' | 'mental' | 'spiritual' | 'all';
}

/** EQUIPPABLE = goes into a loadout slot + gets an on-screen button (everything that
 *  isn't a passive). PASSIVE skills auto-apply when unlocked and are never equipped. */
export function isEquippableSkill(def: SkillDef): boolean {
  return def.effect.kind !== 'passive';
}

/** ACTIVE ability ids that deal NO direct damage (pure utility / summons) — excluded from
 *  the "damaging active" classification below. Keep this list tiny + explicit. */
const NON_DAMAGING_ACTIVE_ACTIONS: ReadonlySet<ActiveActionId> = new Set([
  'intimidate', 'summon_ice_golem', 'summon_skeleton', 'summon_dark_matter', 'buff_summons', 'necro_dark_matter_burst', 'necro_army', 'necro_dm_hex', 'wiz_black_ice', 'eth_mend', 'eth_mana_shield', 'eth_blink', 'eth_ankh',
  // Druid utility/heal/summon actives (Lye DOES damage — it stays a damaging active).
  'dru_stealth', 'dru_mushroom', 'dru_aloe', 'dru_clay', 'dru_sage_burn', 'dru_spores', 'dru_oil_immunity', 'dru_oil_vitality',
  'dru_viper', 'dru_wolverine', 'dru_chimp_pair', 'dru_scavengers', 'dru_polar_bear',
  // Mage utility actives (the slow field, shield, essence restore, and the pure-control binding).
  'mage_time_dilation', 'mage_quantum_shield', 'mage_mana_surge', 'mage_entangle',
  // Bard utility actives (heal aura/burst, the no-damage control zone, shield, splash charges, confusion).
  'bard_hum', 'bard_rally', 'bard_harmonics', 'bard_freq_shield', 'bard_amplify', 'bard_distortion',
  // Witch Doctor utility actives (decoys/effigy/revenant, confusions, totem, the
  // no-damage hex zone, blood pact, stealth, the ally-bond).
  'wd_decoy', 'wd_cursed_vision', 'wd_echoes', 'wd_brew', 'wd_totem', 'wd_hex_ritual', 'wd_blood_pact', 'wd_spirit_walk', 'wd_soul_bind', 'wd_effigy', 'wd_revenant',
  // Samurai utility actives (the reactive parry window + the Resolve/health breath).
  'sam_parry', 'sam_breath',
  // Monk utility actives (the deflect window, the consume-buff arm, heals/Chi
  // restores/cleanse/the HP-cost infusion, shield, stealth, the confusion, the
  // ally-bond, the decoy, and the no-damage stillness field).
  'monk_deflect', 'monk_empower', 'monk_silent', 'monk_soothe', 'monk_tranquil', 'monk_aura', 'monk_acupuncture', 'monk_infusion', 'monk_barrier', 'monk_enigma', 'monk_divine', 'monk_astral', 'monk_mantra',
  // Assassin utility actives (pure-control devices, the stealth entries, the
  // confusion bomb, and the no-damage Shadow Dance state).
  'asn_snare_trap', 'asn_flash_trap', 'asn_frost_trap', 'asn_cloak', 'asn_smoke_bomb', 'asn_vanish', 'asn_shadow_dance',
  // Priest utility actives (shields/wards/heals/cleanses, the pure-control
  // word, the dormant revive, and the mending zones — Beacon/Burst/Ground/
  // Grace Incarnate DO damage and stay damaging actives).
  'prs_shield_faith', 'prs_embrace', 'prs_radiant', 'prs_barrier', 'prs_blessing', 'prs_intervene', 'prs_aegis', 'prs_word', 'prs_forgive', 'prs_renewal', 'prs_hymn', 'prs_ascend',
  // Savage utility actives (the pure-fear roar, the confusion snarl, and the
  // animal's mend).
  'sav_roar', 'sav_snarl', 'sav_lick',
  // Hunter utility actives (the pet commands, the two modes, the pet mend, the
  // pet frenzy, and the temporary pack — Tame stays a DAMAGING active via its
  // whittle, Casey's ruling; its offense is the beast it wins).
  'hun_focus', 'hun_scatter', 'hun_great', 'hun_horde', 'hun_mend', 'hun_rage', 'hun_call',
  // Sundian utility actives (the shell, the three worn regalia + the Crown,
  // the talisman, the idol, the pure-control curse, and the cleanse-ward —
  // Depth Crush and the zones DO damage and stay damaging actives).
  'sun_coralguard', 'sun_pearl', 'sun_coral', 'sun_bands', 'sun_talisman', 'sun_idol', 'sun_curse', 'sun_ward', 'sun_crown',
]);

/**
 * DAMAGING ACTIVE = an `active`-kind skill whose ability deals damage. This is the
 * load-bearing classification for the NO-BASE-KIT model: every tree's FIRST node is one
 * of these (so any first pick can win the first fight), the New-Game forced-first pick
 * must land on one, and the anti-soft-lock floor guarantees the player always has at
 * least one EQUIPPED once they own one (there is no free fallback attack anymore).
 */
export function isDamagingActive(def: SkillDef): boolean {
  return def.effect.kind === 'active' && !NON_DAMAGING_ACTIVE_ACTIONS.has(def.effect.action);
}

/** Active summon abilities that produce an ATTACKING summon — these are how a no-direct-
 *  damage build still kills things, so they count as a valid STARTER offense (below). */
const ATTACKING_SUMMON_ACTIONS: ReadonlySet<ActiveActionId> = new Set<ActiveActionId>(['summon_skeleton', 'necro_army', 'dru_viper', 'dru_wolverine', 'dru_chimp_pair', 'dru_polar_bear', 'wd_revenant']);

/**
 * STARTER skill = a valid "first ability" under the no-kit model and what the anti-soft-lock
 * floor keeps equipped: a DAMAGING ACTIVE, OR an attacking-summon active (the summoned unit
 * is the player's offense). This lets the Necromancer's Summons tree open on Summon Skeleton
 * (the skeleton defeats the Sasquatch) without a direct-damage attack.
 */
export function isStarterSkill(def: SkillDef): boolean {
  if (isDamagingActive(def)) return true;
  return def.effect.kind === 'active' && ATTACKING_SUMMON_ACTIONS.has(def.effect.action);
}

/** ACTIVE ability ids that fire AT / AROUND the player (no direction to aim) — self-AoE,
 *  self-buffs, heals, wards, and summons. Everything else active is DIRECTIONAL. */
const NON_AIMABLE_ACTIONS: ReadonlySet<ActiveActionId> = new Set<ActiveActionId>([
  'forge_strike', 'windmill', 'wiz_immolation', 'wiz_tornado', 'shove', 'intimidate',
  'wiz_freezing_rain', 'wiz_pestilence', 'summon_ice_golem',
  'summon_skeleton', 'summon_dark_matter', 'buff_summons', 'necro_dark_matter_burst', 'necro_army', // summons: tap-to-fire
  'necro_dm_hex', // Dark Matter: targets nearest (tap); Blip/Bomb/Tainted/Abyssal/Rift/Singularity are directional
  'eth_mend', 'eth_mana_shield', 'eth_ankh',
  'necro_bone_nova', // self-centered shockwave (Bone Dart/Punch/Stake/Wrecking/Grasp are directional)
  // Druid: self-AoE / self-buffs / heals / zones / summons + the auto-targeting casts
  // (Lye smart-targets, Lightning chains from the nearest foe). Mantis/Falcon/Chill/
  // Earthquake/Lava Pocket/Hail are directional and stay aimable.
  'dru_bear_might', 'dru_stealth', 'dru_bee_swarm', 'dru_elk', 'dru_elephant',
  'dru_lye', 'dru_mushroom', 'dru_aloe', 'dru_clay', 'dru_sage_burn', 'dru_spores', 'dru_oil_immunity', 'dru_oil_vitality',
  'dru_lightning', 'dru_viper', 'dru_wolverine', 'dru_chimp_pair', 'dru_scavengers', 'dru_polar_bear',
  // Mage: self-AoE / self-buffs / auto-targeting casts. Quantum Blast / Arcane Orb /
  // Arcane Blast / Antimatter / Graviton / Wormhole / Black Hole / Singularity are directional.
  'mage_contraction', 'mage_time_dilation', 'mage_quantum_shield', 'mage_missiles', 'mage_leech', 'mage_mana_surge', 'mage_entangle',
  'mage_crystal_shard', 'mage_crystal_pulse', 'mage_shatter', 'mage_crystal_nova',
  // Bard: self-zones / self-bursts / auto-targeting casts. Dissonant/Harmonics/Wall
  // (placed), Mosh/Whistle/Heavy/Dive/Blast/Surge/Chord/Pentatonic are directional.
  'bard_hum', 'bard_rally', 'bard_freq_shield', 'bard_amplify', 'bard_coda', 'bard_war_song',
  'bard_pulse', 'bard_distortion', 'bard_cascade', 'bard_riff',
  // Witch Doctor: auto-targeting binds/confusions/drains, self-zones, summons and
  // self-states. Dart/Cloud/Flask/Eruption/Swarm/Hexing Ritual stay directional.
  'wd_doll', 'wd_decoy', 'wd_cursed_vision', 'wd_shackles', 'wd_echoes', 'wd_spirit_split',
  'wd_life_drain', 'wd_brew', 'wd_nova', 'wd_totem', 'wd_blood_pact', 'wd_spirit_walk',
  'wd_soul_bind', 'wd_effigy', 'wd_ritual', 'wd_revenant',
  // Samurai: self-arming states, the nearest-target mark, and the restores.
  // First Cut/Twin Fangs/Crescent/Dragonfly/Petal/Guard Break/Kiai and every
  // arrow stay directional (drag-to-aim).
  'sam_iaijutsu', 'sam_challenge', 'sam_thousand_cuts', 'sam_parry', 'sam_breath', 'sam_perfect_form',
  // Monk: self-states, heals, the self-centered duals/zones, the auto-targeting
  // spirit casts, and the decoy. Palm/Flurry/Sweep/Pressure/Rising Dragon/
  // Chi Wave/Force Palm stay directional (drag-to-aim).
  'monk_deflect', 'monk_empower', 'monk_silent', 'monk_hundred', 'monk_soothe', 'monk_tranquil', 'monk_aura', 'monk_acupuncture', 'monk_infusion', 'monk_barrier', 'monk_explosion', 'monk_enigma', 'monk_divine', 'monk_astral', 'monk_wheel', 'monk_mantra',
  // Assassin: self-states, the everything-now trigger, and the auto-targeting
  // step/ricochet. Every placed device, Caltrops/Minefield/Rain (placed ahead),
  // the strikes, and every star stay directional (drag-to-aim).
  'asn_remote_det', 'asn_cloak', 'asn_shadow_step', 'asn_smoke_bomb', 'asn_vanish', 'asn_shadow_dance', 'asn_trick',
  // Priest: self-states, auto-targeting casts (shield/renewal/drain/judgment
  // find their own target), self zones/fields, and the dormant revive. Ray of
  // Light / Smite / Rebuke / the Beacon's beam stay directional (drag-to-aim).
  'prs_shield_faith', 'prs_embrace', 'prs_radiant', 'prs_barrier', 'prs_blessing', 'prs_intervene', 'prs_aegis', 'prs_word', 'prs_ground', 'prs_vanquish', 'prs_judgment', 'prs_burst', 'prs_forgive', 'prs_renewal', 'prs_hymn', 'prs_ascend', 'prs_grace_field',
  // Savage: self-states, self-AoEs, the auto-targeting casts (snarl/veins/
  // transfusion find their own target), and the mend. Slash/Jagged/Leap/
  // Cleave/Skull/Headtaker/Spike/Mire/Lunge/Totem stay directional.
  'sav_roar', 'sav_slaughter', 'sav_crimson', 'sav_sacrifice', 'sav_hunger', 'sav_snarl', 'sav_lick', 'sav_veins', 'sav_transfusion',
  // Hunter: the auto-targeting casts (Tame/Focus/Mastery/Hunt find their own
  // target), the commands, the modes, the pet mend/frenzy, and the pack call.
  // Steady/Multishot/Crippling/Net/Boomerang/Eagle/Swipe/Twin/Hamstring/
  // Bloodletter stay directional (drag-to-aim).
  'hun_tame', 'hun_focus', 'hun_scatter', 'hun_great', 'hun_horde', 'hun_mend', 'hun_rage', 'hun_mastery', 'hun_call', 'hun_hunt',
  // Sundian: the auto-targeting casts (Lash/Crashing/Crush/Grasp/Curse find
  // their own target), the shell, the regalia + Crown, the talisman, the
  // placed idol, and the ward. Undertow/Riptide/Spout/Whirlpool/Tsunami/
  // Tide Step/Breaker/Weight/Twin Currents/Flare stay directional.
  'sun_lash', 'sun_crashing', 'sun_crush', 'sun_grasp', 'sun_curse', 'sun_coralguard', 'sun_pearl', 'sun_coral', 'sun_bands', 'sun_talisman', 'sun_idol', 'sun_ward', 'sun_crown',
]);

/**
 * AIMABLE = a directional ACTIVE skill (projectiles, cones, lines, dashes, front strikes,
 * placed-ahead zones) — these get drag-to-aim on their loadout button (tap = quick fire in
 * the facing/move direction; drag = aim indicator → release fires in the aimed direction).
 * Non-aimable skills (self-AoE / buffs / heals / summons, and all non-`active` kinds) just
 * activate on tap. (Piece 4)
 */
export function isAimableSkill(def: SkillDef): boolean {
  return def.effect.kind === 'active' && !NON_AIMABLE_ACTIONS.has(def.effect.action);
}

export interface SkillTree {
  readonly id: string;
  readonly name: string;
}

export interface ClassSkills {
  readonly classId: ClassId;
  /** Exactly three trees. */
  readonly trees: readonly SkillTree[];
  /** Every skill across the three trees. */
  readonly skills: readonly SkillDef[];
}

// ─── BLACKSMITH (three full skill trees → a Crystal Form capstone each) ────────
//
// NO BASE KIT: the class no longer ships with a free default attack/dodge. A new
// character starts with ZERO playable abilities; the FIRST skill point must be spent
// on a tree's first node (a DAMAGING ACTIVE), which becomes the starting ability. The
// player's entire active kit is the unlocked + equipped skills (plus Holy Bolt, the
// throne-granted universal ability). Every tree's tier-0 node is a damaging active.

const BLACKSMITH: ClassSkills = {
  classId: 'blacksmith',
  trees: [
    { id: 'defense', name: 'Tank' }, // 10 Tank skills → Celestial Calcite (opens on Shield Bash)
    { id: 'offense', name: 'Offense' }, // 10 DPS skills → Prism Quartz (opens on Bash)
    { id: 'control', name: 'Control' }, // 10 Control skills → Iron Pyrite (opens on Charge)
  ],
  skills: [
    // --- TANK TREE (10 real skills, linear → Celestial Calcite). Data in blacksmithTank.ts. ---
    ...TANK_TREE_SKILLS,
    // --- OFFENSE / DPS TREE (10 real skills, linear → Prism Quartz). Data in blacksmithDps.ts. ---
    ...DPS_TREE_SKILLS,
    // --- CONTROL TREE (10 real skills, linear → Iron Pyrite). Data in blacksmithControl.ts. ---
    ...CONTROL_TREE_SKILLS,
  ],
};

// ─── WIZARD (fragile glass-cannon caster) ─────────────────────────────────────
//
// All THREE Wizard trees authored: FIRE/WIND DPS (→ Elemental Storm), ICE/POISON CONTROL
// (→ Pestilence; the Ice Golem lives here as node 9), and ETHEREAL/SURVIVAL (→ the Ankh
// cheat-death ultimate). Same no-kit rules as the Blacksmith: the first skill point buys a
// tree's tier-0 damaging active (Fireball / Icicle / Ethereal Bolt).
const WIZARD: ClassSkills = {
  classId: 'wizard',
  trees: [
    { id: WIZ_FIREWIND_TREE, name: 'Fire/Wind' }, // 10 DPS skills → Elemental Storm (opens on Fireball)
    { id: WIZ_ICEPOISON_TREE, name: 'Ice/Poison' }, // 10 control skills → Pestilence (opens on Icicle)
    { id: WIZ_ETHEREAL_TREE, name: 'Ethereal' }, // 10 survival skills → Ankh (opens on Ethereal Bolt)
  ],
  skills: [
    // --- FIRE/WIND DPS TREE (10 damage skills, linear → Elemental Storm). Data in wizardFireWind.ts. ---
    ...WIZARD_FIREWIND_SKILLS,
    // --- ICE/POISON CONTROL TREE (10 skills, linear → Pestilence; Ice Golem = node 9). Data in wizardIcePoison.ts. ---
    ...WIZARD_ICEPOISON_SKILLS,
    // --- ETHEREAL/SURVIVAL TREE (10 skills, linear → Ankh ultimate). Data in wizardEthereal.ts. ---
    ...WIZARD_ETHEREAL_SKILLS,
  ],
};

// ─── NECROMANCER (Slavic death-sorcerer; in-between durability) ────────────────
//
// Kit-free like the others: the first skill point buys the Marrow tree's tier-0
// damaging active (Bone Dart). Only the MARROW (tank/solo) tree ships now; the
// Summons + Dark Matter trees are LATER data-only builds.
const NECROMANCER: ClassSkills = {
  classId: 'necromancer',
  trees: [
    { id: MARROW_TREE, name: 'Marrow' }, // 10 tank/solo skills → Grasp of Death (opens on Bone Dart)
    { id: SUMMONS_TREE, name: 'Summons' }, // 10 summon/pet skills (node-6 branch) → Army of the Dead
    { id: DARK_MATTER_TREE, name: 'Dark Matter' }, // 10 ranged DPS + debuff skills → Singularity (opens on Dark Energy Blip)
  ],
  skills: [
    // --- MARROW TREE (10 skills, linear → Grasp of Death). Data in necromancerMarrow.ts. ---
    ...MARROW_TREE_SKILLS,
    // --- SUMMONS TREE (10 skills, linear with a node-6 either/or branch → Army of the Dead).
    //     Data in necromancerSummons.ts. Opens on Summon Skeleton (a valid no-kit first skill). ---
    ...SUMMONS_TREE_SKILLS,
    // --- DARK MATTER TREE (10 ranged DPS + debuff skills, linear → Singularity). Data in
    //     necromancerDarkMatter.ts. Opens on Dark Energy Blip (a fast damaging projectile). ---
    ...DARK_MATTER_TREE_SKILLS,
  ],
};

// ─── DRUID (Seattle's walking ecosystem; near-Blacksmith durability) ───────────
//
// Kit-free like the others; the forced first pick is PER-CLASS (needsFirstSkill
// counts starters across ALL trees), and every Druid tree's tier-0 is a damaging
// active anyway: Mantis (melee flurry), Lye (the dual-use bolt — it burns when an
// enemy is in range), Freezing Wind Chill (cone). Tapestry skills carry data-only
// `trait` animal tags for the future visual-trait system.
const DRUID: ClassSkills = {
  classId: 'druid',
  trees: [
    { id: DRUID_TAPESTRY_TREE, name: 'Tapestry of Beasts' }, // 10 beast skills (opens on Mantis)
    { id: DRUID_RESTORATION_TREE, name: "Nature's Restoration" }, // 10 healer skills (opens on Lye)
    { id: DRUID_WILDKIN_TREE, name: 'Wild Kin' }, // 10 wrath + summon skills (opens on Chill)
  ],
  skills: [
    // --- TAPESTRY OF BEASTS (10 skills, linear; every node trait-tagged). Data in druidTapestry.ts. ---
    ...DRUID_TAPESTRY_SKILLS,
    // --- NATURE'S RESTORATION (10 skills, linear; heals + zones + oils). Data in druidRestoration.ts. ---
    ...DRUID_RESTORATION_SKILLS,
    // --- WILD KIN & EARTH'S WRATH (10 skills, linear; wrath + 5 summons). Data in druidWildKin.ts. ---
    ...DRUID_WILDKIN_SKILLS,
  ],
};

// ─── MAGE (Moscow's surgeon of reality; the blueprint glass cannon) ────────────
//
// CANON, permanent: the MAGE (Moscow) and the WIZARD (Egypt) are DIFFERENT
// classes — never aliased, shared, or renamed between them. Kit-free like the
// others; the forced first pick is PER-CLASS and every Mage tree's tier-0 is a
// damaging active: Quantum Blast (bolt), Arcane Orb (bolt), Crystal Shard
// (ranged slow spikes).
const MAGE: ClassSkills = {
  classId: 'mage',
  trees: [
    { id: MAGE_SPACETIME_TREE, name: 'Spacetime' }, // 10 space/time skills (opens on Quantum Blast)
    { id: MAGE_ARCANE_TREE, name: 'Arcane' }, // 10 arcana/essence skills (opens on Arcane Orb)
    { id: MAGE_CRYSTAL_TREE, name: 'Crystalblade' }, // 10 blade skills (opens on Crystal Shard)
  ],
  skills: [
    // --- SPACETIME MANIPULATIONS (10 skills, linear). Data in mageSpacetime.ts. ---
    ...MAGE_SPACETIME_SKILLS,
    // --- ARCANE SPECIALIZATION (10 skills, linear). Data in mageArcane.ts. ---
    ...MAGE_ARCANE_SKILLS,
    // --- CRYSTALBLADE MASTERY (10 skills, linear; crystallize/shatter). Data in mageCrystalblade.ts. ---
    ...MAGE_CRYSTAL_SKILLS,
  ],
};

// ─── BARD (London's memory-keeper and war-drum) ────────────────────────────────
//
// RANGE DOCTRINE (Casey's ruling): Battle Resonance's offense is MELEE ONLY;
// Songs + Sonic Chaos offense is RANGED (buffs/auras rangeless). Sanctioned
// exceptions: Piercing Whistle (short melee-range cone utility) and Resonance
// Pulse (self-centered peel). Kit-free like the others; every tree's tier-0 is
// a damaging active: Dissonant Symphony / Mosh / Sonic Blast. Every skill
// carries a dormant `ensemble` block for the party era ("Rhythm" is prose over
// standard energy).
const BARD: ClassSkills = {
  classId: 'bard',
  trees: [
    { id: BARD_SONGS_TREE, name: 'Songs' }, // 10 ranged/support skills (opens on Dissonant Symphony)
    { id: BARD_BATTLE_TREE, name: 'Battle' }, // 10 MELEE skills (opens on Mosh)
    { id: BARD_SONIC_TREE, name: 'Sonic Chaos' }, // 10 ranged skills (opens on Sonic Blast)
  ],
  skills: [
    // --- SONGS OF THE ANCESTORS (10 skills, linear; ranged/support). Data in bardSongs.ts. ---
    ...BARD_SONGS_SKILLS,
    // --- BATTLE RESONANCE (10 skills, linear; MELEE ONLY). Data in bardBattle.ts. ---
    ...BARD_BATTLE_SKILLS,
    // --- SONIC CHAOS (10 skills, linear; ranged). Data in bardSonic.ts. ---
    ...BARD_SONIC_SKILLS,
  ],
};

/** Per-class trees + skills. The scene reads the ACTIVE class's entry. */
// ─── WITCH DOCTOR (Kinshasa's spirit-speaker: the voodoo doll kit) ────────────
//
// Three trees on the same no-kit rules: VOODOO MASTERY (the doll bind + decoys),
// ALCHEMY OF DECAY (poisons carrying the cosmetic decayDomain tints), and SPIRIT
// WHISPERER (totems, ally support, the revenant). Tier-0s: Voodoo Doll (the
// bind's initial hit), Blow Dart, Spirit Swarm.
const WITCHDOCTOR: ClassSkills = {
  classId: 'witchdoctor',
  trees: [
    { id: WD_VOODOO_TREE, name: 'Voodoo' }, // 10 doll/illusion skills (opens on Voodoo Doll)
    { id: WD_DECAY_TREE, name: 'Decay' }, // 10 poison skills, domain-tinted (opens on Blow Dart)
    { id: WD_SPIRIT_TREE, name: 'Spirits' }, // 10 support/summon skills (opens on Spirit Swarm)
  ],
  skills: [
    // --- VOODOO MASTERY (10 skills, linear; the doll system). Data in witchdoctorVoodoo.ts. ---
    ...WD_VOODOO_SKILLS,
    // --- ALCHEMY OF DECAY (10 skills, linear; decayDomain tints). Data in witchdoctorDecay.ts. ---
    ...WD_DECAY_SKILLS,
    // --- SPIRIT WHISPERER (10 skills, linear; support/summons). Data in witchdoctorSpirit.ts. ---
    ...WD_SPIRIT_SKILLS,
  ],
};

// ─── SAMURAI (Kyoto's blade — Casey's ruling: pure DPS, defense through timing) ─
//
// Three trees on the same no-kit rules: WAY OF THE BLADE (melee: Iaijutsu, the
// dash-through cut, Thousand Cuts), WAY OF THE STANCES (the three mutually-
// exclusive toggles + Parry/Counterstrike/Perfect Form), and WAY OF THE BOW
// (arrows on the shipped bolt riders + Running Draw). "Resolve" is prose over
// standard energy. Tier-0s: First Cut, Guard Break, Yumi Shot.
const SAMURAI: ClassSkills = {
  classId: 'samurai',
  trees: [
    { id: SAM_BLADE_TREE, name: 'Blade' }, // 10 melee skills (opens on First Cut)
    { id: SAM_STANCE_TREE, name: 'Stances' }, // 10 stance/timing skills (opens on Guard Break)
    { id: SAM_BOW_TREE, name: 'Bow' }, // 10 ranged skills (opens on Yumi Shot)
  ],
  skills: [
    // --- WAY OF THE BLADE (10 skills, linear; melee). Data in samuraiBlade.ts. ---
    ...SAM_BLADE_SKILLS,
    // --- WAY OF THE STANCES (10 skills, linear; toggles + parry). Data in samuraiStances.ts. ---
    ...SAM_STANCE_SKILLS,
    // --- WAY OF THE BOW (10 skills, linear; ranged). Data in samuraiBow.ts. ---
    ...SAM_BOW_SKILLS,
  ],
};

// ─── SAVAGE (Mesoamerica's native; Mexico City) ────────────────────────────────
// Blood for the sun — three trees of 10: OBSIDIAN EDGE (glass-edged fury:
// Warrior's Momentum frenzy stacks, the leap-slam, the Headtaker execute, the
// combo ultimate), BLOOD RITES (the willing cut: blood-priced casts, contagion
// + stacking wounds, the drain, the hungering nova), and JAGUAR SPIRIT (the
// pounce, the bleeding companion, the pack bond, the standing sun, the apex
// state). Tier-0s: Obsidian Slash, Blood Spike, Feral Lunge.
const SAVAGE: ClassSkills = {
  classId: 'savage',
  trees: [
    { id: SAV_EDGE_TREE, name: 'Obsidian' }, // 10 melee-fury skills (opens on Obsidian Slash)
    { id: SAV_BLOOD_TREE, name: 'Blood' }, // 10 sacrifice skills (opens on Blood Spike)
    { id: SAV_JAGUAR_TREE, name: 'Jaguar' }, // 10 hunt skills (opens on Feral Lunge)
  ],
  skills: [
    // --- OBSIDIAN EDGE (10 skills, linear; melee fury). Data in savageObsidian.ts. ---
    ...SAV_EDGE_SKILLS,
    // --- BLOOD RITES (10 skills, linear; sacrifice). Data in savageBlood.ts. ---
    ...SAV_BLOOD_SKILLS,
    // --- JAGUAR SPIRIT (10 skills, linear; the hunt). Data in savageJaguar.ts. ---
    ...SAV_JAGUAR_SKILLS,
  ],
};

// ─── PRIEST (Europe's fourth native; Rome) ─────────────────────────────────────
// Heaven lied, the Light didn't — three trees of 10: LIGHT (the targeted
// ally-shield + its AoE/ultimate forms, the HP-cost mend, Divine Intervention
// on the party-dormant revive hook), REBUKE (weakening holy force, the
// channel-beam, the consecrated dual zone, the drain, the verdict), and WORDS
// OF GRACE (the dual-ring opener, HoT/cleanse/blessings, the DUAL-CHANNEL
// Beacon of Light, Ascendance, the wide dual field). "Faith" is prose over
// standard energy. Tier-0s: Ray of Light, Smite, Sanctified Burst.
const PRIEST: ClassSkills = {
  classId: 'priest',
  trees: [
    { id: PRS_LIGHT_TREE, name: 'Light' }, // 10 protection skills (opens on Ray of Light)
    { id: PRS_REBUKE_TREE, name: 'Rebuke' }, // 10 judgment skills (opens on Smite)
    { id: PRS_GRACE_TREE, name: 'Grace' }, // 10 mending skills (opens on Sanctified Burst)
  ],
  skills: [
    // --- LIGHT (10 skills, linear; protection). Data in priestLight.ts. ---
    ...PRS_LIGHT_SKILLS,
    // --- REBUKE (10 skills, linear; judgment). Data in priestRebuke.ts. ---
    ...PRS_REBUKE_SKILLS,
    // --- WORDS OF GRACE (10 skills, linear; mending). Data in priestGrace.ts. ---
    ...PRS_GRACE_SKILLS,
  ],
};

// ─── ASSASSIN (the Near East's native; Dubai) ──────────────────────────────────
// Hidden blades, empty shadows — three trees of 10: TRAPPER'S ARSENAL (the trap
// system: place → arm → spring → payload, with Mastery/Remote Detonation/
// Minefield as the hooks), SHADOW ARTS (the stealth loop: cloak, the stealth-
// bonus rider, Ambush behind the ally-rule refund, Vanish, Shadow Dance), and
// MARKSMAN'S PRECISION (thrown steel on the full bolt-rider set + the ricochet
// + the placed volley). Tier-0s: Blade Trap, Silent Blade, Throwing Star.
const ASSASSIN: ClassSkills = {
  classId: 'assassin',
  trees: [
    { id: ASN_TRAP_TREE, name: 'Traps' }, // 10 device skills (opens on Blade Trap)
    { id: ASN_SHADOW_TREE, name: 'Shadow' }, // 10 stealth skills (opens on Silent Blade)
    { id: ASN_MARKS_TREE, name: 'Marksman' }, // 10 thrown skills (opens on Throwing Star)
  ],
  skills: [
    // --- TRAPPER'S ARSENAL (10 skills, linear; devices). Data in assassinTraps.ts. ---
    ...ASN_TRAP_SKILLS,
    // --- SHADOW ARTS (10 skills, linear; stealth). Data in assassinShadow.ts. ---
    ...ASN_SHADOW_SKILLS,
    // --- MARKSMAN'S PRECISION (10 skills, linear; thrown). Data in assassinMarksman.ts. ---
    ...ASN_MARKS_SKILLS,
  ],
};

// ─── MONK (Asia's second native; Lhasa) ────────────────────────────────────────
// Empty hands, full spirit — three trees of 10: IRON PALM (fast open-hand melee,
// Deflect = the parry window's melee+projectile config, Hundred Hands combo
// ultimate), CHI MASTERY (sustain + the DUAL casts that wound enemies and mend
// friendlies in one motion; Life Infusion rides the ALLY RULE), and SPIRITUAL
// HARMONY (decoy/confusion/ally-bond reuses, the mobile Prayer Wheel, the timed-
// buff finishers). "Chi" is prose over standard energy. Tier-0s: Palm Strike,
// Chi Wave, Force Palm.
const MONK: ClassSkills = {
  classId: 'monk',
  trees: [
    { id: MONK_PALM_TREE, name: 'Iron Palm' }, // 10 melee skills (opens on Palm Strike)
    { id: MONK_CHI_TREE, name: 'Chi' }, // 10 sustain/dual skills (opens on Chi Wave)
    { id: MONK_SPIRIT_TREE, name: 'Spirit' }, // 10 spirit/control skills (opens on Force Palm)
  ],
  skills: [
    // --- IRON PALM (10 skills, linear; melee). Data in monkIronPalm.ts. ---
    ...MONK_PALM_SKILLS,
    // --- CHI MASTERY (10 skills, linear; sustain/duals). Data in monkChi.ts. ---
    ...MONK_CHI_SKILLS,
    // --- SPIRITUAL HARMONY (10 skills, linear; spirit/control). Data in monkSpiritual.ts. ---
    ...MONK_SPIRIT_SKILLS,
  ],
};

// ─── HUNTER (Oceania's native; Sydney — The Harbour Watch) ─────────────────────
// The pack is a choice, the hunt isn't — three trees of 10: BEAST CONTROL (the
// TAME whittle-and-capture bond, FOCUS/SCATTER commands, the GREAT BEAST and
// BEAST HORDE modes, the joint-kill ultimate), MARKSMANSHIP (fully standalone:
// clean arrows, riders, the BOOMERANG returning bolt, the impossible shot), and
// WILD FRENZY (fully standalone: raking knives, venom, the answering wild pack,
// the alpha form). "Focus" is prose over standard energy. Tier-0s: Tame
// Companion (damaging via its whittle — Casey's ruling), Steady Shot, Feral
// Swipe.
const HUNTER: ClassSkills = {
  classId: 'hunter',
  trees: [
    { id: HUN_BEAST_TREE, name: 'Beasts' }, // 10 bond/command skills (opens on Tame Companion)
    { id: HUN_MARKS_TREE, name: 'Marksman' }, // 10 ranged skills (opens on Steady Shot)
    { id: HUN_WILD_TREE, name: 'Frenzy' }, // 10 melee skills (opens on Feral Swipe)
  ],
  skills: [
    // --- BEAST CONTROL (10 skills, linear; the bond). Data in hunterBeast.ts. ---
    ...HUN_BEAST_SKILLS,
    // --- MARKSMANSHIP (10 skills, linear; standalone ranged). Data in hunterMarksman.ts. ---
    ...HUN_MARKS_SKILLS,
    // --- WILD FRENZY (10 skills, linear; standalone melee). Data in hunterFrenzy.ts. ---
    ...HUN_WILD_SKILLS,
  ],
};

// ─── SUNDIAN (Bali; classId 'atlantean' — the save-safe internal id) ───────────
// The sea remembers what heaven drowned — three trees of 10: TIDECALLER (the
// drenching jets, THE TIDE's Riptide, Depth Crush, the Tsunami), DROWNED BLADE
// (the trident melee: Waterlogged Edge's strike-drench, the conditional
// Crashing Blow, Wrath of the Deep), and REGALIA OF THE DEEP (the three worn
// auras — one at a time — attunement, and THE DROWNED CROWN wearing all three
// empowered). "Tide" is prose over standard energy. Tier-0s: Water Lash,
// Trident Strike, Signet Flare.
const SUNDIAN: ClassSkills = {
  classId: 'atlantean',
  trees: [
    { id: SUN_TIDE_TREE, name: 'Tidecaller' }, // 10 ranged water skills (opens on Water Lash)
    { id: SUN_BLADE_TREE, name: 'Blade' }, // 10 melee skills (opens on Trident Strike)
    { id: SUN_REGALIA_TREE, name: 'Regalia' }, // 10 worn-aura skills (opens on Signet Flare)
  ],
  skills: [
    // --- TIDECALLER (10 skills, linear; ranged water). Data in sundianTidecaller.ts. ---
    ...SUN_TIDE_SKILLS,
    // --- DROWNED BLADE (10 skills, linear; melee). Data in sundianBlade.ts. ---
    ...SUN_BLADE_SKILLS,
    // --- REGALIA OF THE DEEP (10 skills, linear; worn auras). Data in sundianRegalia.ts. ---
    ...SUN_REGALIA_SKILLS,
  ],
};

export const CLASS_SKILLS: Record<ClassId, ClassSkills> = {
  blacksmith: BLACKSMITH,
  wizard: WIZARD,
  necromancer: NECROMANCER,
  druid: DRUID,
  mage: MAGE,
  bard: BARD,
  witchdoctor: WITCHDOCTOR,
  samurai: SAMURAI,
  monk: MONK,
  assassin: ASSASSIN,
  priest: PRIEST,
  savage: SAVAGE,
  hunter: HUNTER,
  atlantean: SUNDIAN,
};

/** Look up a class's full skill set (trees + skills). */
export function classSkills(classId: ClassId): ClassSkills {
  return CLASS_SKILLS[classId] ?? CLASS_SKILLS.blacksmith;
}

/** Combine a list of stat-mod blocks into one aggregate (sums most; max for block). */
export function combineMods(mods: readonly SkillStatMods[]): SkillStatMods {
  const out: Required<SkillStatMods> = {
    flatMaxHP: 0,
    maxHPMult: 0,
    damageMult: 0,
    moveSpeedMult: 0,
    damageReduction: 0,
    blockChance: 0,
    blockReduction: 0,
    regenPerSec: 0,
    attackSpeedMult: 0,
    basicHitCount: 0, // 0 = none specified; consumers use max(1, value)
    lifestealPct: 0,
    reflectPct: 0,
  };
  for (const m of mods) {
    out.flatMaxHP += m.flatMaxHP ?? 0;
    out.maxHPMult += m.maxHPMult ?? 0;
    out.damageMult += m.damageMult ?? 0;
    out.moveSpeedMult += m.moveSpeedMult ?? 0;
    out.damageReduction += m.damageReduction ?? 0; // negative = takes MORE damage (Crazed)
    out.blockChance += m.blockChance ?? 0; // block chances stack (capped when applied)
    out.blockReduction = Math.max(out.blockReduction, m.blockReduction ?? 0); // best block strength wins
    out.regenPerSec += m.regenPerSec ?? 0;
    out.attackSpeedMult += m.attackSpeedMult ?? 0;
    out.basicHitCount = Math.max(out.basicHitCount, m.basicHitCount ?? 0); // highest multi-hit wins
    out.lifestealPct += m.lifestealPct ?? 0;
    out.reflectPct += m.reflectPct ?? 0;
  }
  return out;
}
