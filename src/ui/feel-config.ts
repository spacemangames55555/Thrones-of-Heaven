import { DOMAIN_TINT } from '../world/enemy-roster';
import { MAX_FLOATING_TEXTS } from '../game/settings';

/**
 * GAME-FEEL CONFIG (the presentation pass) — the single home for EVERY tunable
 * this layer uses: durations, sizes, offsets, pool sizes, shake, visibility
 * rules, slot count. No magic numbers live outside this file. Domain colors
 * are imported BY REFERENCE from the existing tint source (enemy-roster.ts) —
 * never redefined here.
 *
 * Presentation only: nothing in this file changes combat math, quest logic,
 * world data, or pause behavior.
 */
export const FEEL = {
  /** The existing domain palette, by reference (Physical/Mental/Spiritual). */
  domainTint: DOMAIN_TINT,

  /** FLOATING COMBAT TEXT (the shipped FxPools pool; frozen whenever update()
   *  pauses). Values here drive the NEW feel layer (hook-rendered numbers,
   *  XP, crits); shipped skill-site calls keep their own opts untouched. */
  text: {
    poolSize: MAX_FLOATING_TEXTS, // by reference — the shipped pool cap is the single source
    fontPx: 13,
    risePx: 34, // world-px the number climbs over its life
    riseMs: 750,
    critScale: 1.6, // render scale for crit-flagged hits (no crit system ships yet — callers flag when it does)
    xpFontPx: 12,
    /** Colors for sources with no modeled damage domain (the tints above cover
     *  every domain-attributed hit). */
    colors: {
      playerDealt: 0xffd868, // gold — the player's own hits (classes carry no damage domain yet)
      heal: 0x3ad06a, // green
      xp: 0xf0e2b6, // pale parchment, above the player
      fallback: 0xffffff, // damage with no attributable source
    },
  },

  /** HIT FEEDBACK. */
  flash: {
    flashMs: 90, // white tint-fill on the victim, then guaranteed base-tint restore
  },
  shake: {
    shakeThreshold: 12, // player hits >= this HP shake the camera
    shakeMs: 110,
    shakeIntensity: 0.004, // keep small — phone screens amplify shake
  },

  /** NAMEPLATES + HEALTH BARS (pooled; recycled across chunk boundaries). */
  nameplate: {
    mode: 'onAggroOrDamage' as 'always' | 'onAggroOrDamage',
    poolSize: 40,
    fontPx: 10,
    barW: 36,
    barH: 3,
    offsetY: -34, // above the head, below any beat label
    /** 'onAggroOrDamage' visibility: show while within this range of the
     *  player, or for showMs after taking damage. */
    aggroRadiusPx: 260,
    showMs: 4000,
    /** Below this camera zoom (the continent view) plates are unreadable —
     *  hide them all and skip the per-frame work entirely. */
    minZoom: 0.8,
  },

  /** HOTBAR CHROME (the shipped LoadoutBar — bottom-right per Casey's
   *  thumb-ergonomics ruling; this pass drives its chrome, never its logic). */
  hotbar: {
    hotbarSlots: 6,
    slotPx: 58, // thumb-sized tap target
    gapPx: 8,
    cols: 3, // 3 × 2 in the thumb corner
    emptyStroke: 0x44506a, // framed placeholder look for empty slots
    emptyStrokeAlpha: 0.55,
    emptyFillAlpha: 0.45,
  },

  /** DEPTH BANDS: screen UI > nameplates/floating text > world layers. */
  depths: {
    nameplates: 900,
    floatText: 950,
    screenUi: 1350, // the existing UI band (LoadoutBar et al.) — reference, not a redefinition
  },
  /** MOUNT (WORLD SCALE V2 travel framework — durable tuning; no creature art
   *  ships yet, so the mounted read is the player figure + dust + bob). */
  mount: {
    castMs: 1500, // summon cast — interrupted by damage
    bobAmpPx: 2, // mounted sprite bob (visual only)
    bobHz: 5,
    dustIntervalMs: 90, // dust puff cadence while moving mounted
    dustRadiusPx: 7,
    dustColor: 0xcfc2a6,
    combatLockoutMs: 2500, // recent combat blocks summoning this long
  },

  /** WAYPOINT travel (the "Waystone" network — display name is TODO-lore). */
  waypoint: {
    castMs: 3000, // travel cast — interrupted by damage
  },

  /** FAR-ZOOM LOD (render visibility only — never data): below tileFadeOutZoom
   *  every stamped chunk tile layer fades out and skips render, leaving the
   *  pre-baked planet raster as the sole ground; at/above tileFadeInZoom the
   *  full tile detail restores. The gap is MANDATORY hysteresis — a camera
   *  sitting on one threshold can never flap the whole tile stack. */
  lod: {
    tileFadeOutZoom: 0.15,
    tileFadeInZoom: 0.18,
    fadeMs: 260,
    /** Chunk-edge feather: per-tile alpha ramp this many px wide at every
     *  stamped chunk border, dissolving hand-built maps into the planet
     *  raster instead of ending on a hard rectangle. Cosmetic only. */
    featherPx: 96,
    /** LABEL TIERS, by category at each label's creation funnel (never
     *  hand-tagged): near = road signs / spawn / boss markers (unreadable
     *  once 12px text shrinks past ~4px on screen), mid = settlement names,
     *  far = zone/region names (never hidden — they ARE the far view's
     *  wayfinding). The DEV zone-name overlay is exempt: it keeps its own
     *  low-zoom rule and counter-scaling. */
    labels: {
      nearMinZoom: 0.35, // near-tier labels hide below this camera zoom
      midMinZoom: 0.05, // mid-tier labels hide below this camera zoom
      farBudget: 120, // gate ceiling: visible world labels at planet zoom (DEV overlay excluded)
    },
  },
} as const;

export type FeelConfig = typeof FEEL;
