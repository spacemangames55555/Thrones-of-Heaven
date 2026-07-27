import { WORLD_CALIBRATION } from './world-calibration';
import { earthUnificationDelta } from './world-unification';
import { V1_ORIGIN, V1_PX_PER_DEG_LAT, V1_PX_PER_DEG_LNG } from './world-scale';

/**
 * LEGACY EARTH FRAME (WORLD SCALE V2, Pass 4): every hand-authored world-frame
 * position constant (quest sites, spawn anchors, town markers on the PNW/
 * Idaho map) was written in the v1 scene frame — PNW-map content translated
 * by the ONE-EARTH unification delta under the v1 projection. Under v2 the
 * PNW stamp sits at a different scene position, so those literals must ride
 * WITH the stamp: this shim rebases a v1-frame point into the ACTIVE frame by
 * swapping the pinned v1 unification delta for the active one (the globe
 * scene origin is projection-independent and cancels).
 *
 * Under v1 this is an EXACT identity — shipped behavior byte-equal.
 * Heaven/Hell/city-interior constants are plane-local and NEVER pass through
 * here.
 */
const v1Delta = (() => {
  const e = WORLD_CALIBRATION['pnw-legacy'];
  return {
    dx: Math.round((e.origin.lng - V1_ORIGIN.lng) * V1_PX_PER_DEG_LNG),
    dy: Math.round((V1_ORIGIN.lat - e.origin.lat) * V1_PX_PER_DEG_LAT),
  };
})();

/**
 * SHIPPED-FRAME CORRECTION (found by the Pass 4 anchor-safety rule): the
 * one-earth unification translated these constants by the v1 delta ALONE
 * (+128,675 / +85,561), but the live map is placed at globeSceneOriginX() +
 * delta — so every constant has sat exactly globeSceneOriginX() px west of
 * its authored map spot since that pass (self-consistent among themselves,
 * which is why every check stayed green). The correction below restores the
 * missing origin term for BOTH projections, so each constant lands at its
 * exact authored stamp-local position. Disclosed in the commit body.
 */
/** The globe scene-chain origin as PURE LITERAL ARITHMETIC (this module must
 *  stay importable under Node — the smoke bundle reaches it through
 *  settings.ts, so the JSON-map/Phaser-touching scene-origin module cannot be
 *  imported here). The widths are stable data facts; MainScene HARD-ASSERTS
 *  this number against its live chain at boot, so any drift fails the gate
 *  instead of shifting content. Chain: WA map + gap + Heaven + gap + Hell +
 *  gap + reserved Egypt slot + gap + the Faiyum city sub-map + gap. */
const TS = 32;
const GAP = 4096;
export const LEGACY_GLOBE_ORIGIN_X = 1100 * TS + GAP + 720 * TS + GAP + 720 * TS + GAP + 600 * TS + GAP + 60 * TS + GAP; // 122,880

export function legacyEarthPx(p: { x: number; y: number }): { x: number; y: number } {
  const active = earthUnificationDelta();
  return {
    x: p.x - v1Delta.dx + LEGACY_GLOBE_ORIGIN_X + Math.round(active.dx),
    y: p.y - v1Delta.dy + Math.round(active.dy),
  };
}
