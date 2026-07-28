import { WORLD_CALIBRATION } from './world-calibration';
import { earthUnificationDelta } from './world-unification';
import { PX_PER_DEG_LAT, PX_PER_DEG_LNG, TILE_PX, V1_ORIGIN, V1_PX_PER_DEG_LAT, V1_PX_PER_DEG_LNG } from './world-scale';
import { corridorLerp, isReplantActive, poiGlobePx, poiLegacyAnchor, replantPoi, REPLANT_POIS, REPLANT_SETTLEMENTS } from './replant';

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

/** Raw authored-constant frame → washington.map.json LOCAL px. */
export function legacyRawToLocal(q: { x: number; y: number }): { x: number; y: number } {
  return { x: q.x - v1Delta.dx, y: q.y - v1Delta.dy };
}

/**
 * PASS 6C: every authored constant DECLARES its POI. Under v1 the poi is
 * ignored and this stays the exact Pass 4 identity (legacy world
 * byte-identical). Under v2 the mega-stamp is DISSOLVED: the constant lands
 * at its POI's TRUE Earth anchor plus the exact legacy local offset — the
 * Luxor geometric-absorption pattern, generalized (anchors move, layouts
 * do not; see src/world/replant.ts for the recon table).
 */
export function legacyEarthPx(p: { x: number; y: number }, poiId: string): { x: number; y: number } {
  if (isReplantActive()) {
    const poi = replantPoi(poiId);
    const local = legacyRawToLocal(p);
    const anchor = poiLegacyAnchor(poi, legacyRawToLocal);
    const truePx = poiGlobePx(poiId);
    return {
      x: LEGACY_GLOBE_ORIGIN_X + Math.round(truePx.x) + (local.x - anchor.x),
      y: Math.round(truePx.y) + (local.y - anchor.y),
    };
  }
  const active = earthUnificationDelta();
  return {
    x: p.x - v1Delta.dx + LEGACY_GLOBE_ORIGIN_X + Math.round(active.dx),
    y: p.y - v1Delta.dy + Math.round(active.dy),
  };
}

/**
 * PASS 6C COMMIT 2 — corridor-interpolated anchors: under v1 the exact
 * Pass 4 identity (the poi is ignored); under v2 the anchor re-grounds at
 * the same ARC-LENGTH PROPORTION along the true corridor route between its
 * two POIs that the legacy point held on the legacy straight line between
 * their legacy anchors. Nudge-to-walkable happens at the USE site
 * (MainScene.corridorAnchorWalkable) where terrain exists.
 */
export function legacyCorridorPx(p: { x: number; y: number }, fromPoi: string, toPoi: string): { x: number; y: number } {
  if (!isReplantActive()) return legacyEarthPx(p, fromPoi);
  const a = poiLegacyAnchor(replantPoi(fromPoi), legacyRawToLocal);
  const b = poiLegacyAnchor(replantPoi(toPoi), legacyRawToLocal);
  const q = legacyRawToLocal(p);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = ((q.x - a.x) * abx + (q.y - a.y) * aby) / (abx * abx + aby * aby);
  const g = corridorLerp(fromPoi, toPoi, t);
  return { x: LEGACY_GLOBE_ORIGIN_X + Math.round(g.x), y: Math.round(g.y) };
}

/**
 * PASS 6C COMMIT 2 — the save-position remap (migration v19). A stored
 * 'earth' latLng inside the DISSOLVED mega-stamp re-plants exactly like the
 * content did: (a) inside a POI terrain footprint → the same local offset in
 * the re-planted stamp; (b) elsewhere in the stamp → the nearest re-planted
 * settlement anchor (silently — the arrival toast is a ledger TODO); (c)
 * anywhere else → untouched. Pure v2-frame arithmetic: the v1 world still
 * hosts the stamp, but its v2 GEOGRAPHIC rect is a ~0.29 × 0.14 deg sliver
 * off Vancouver Island whose v1-frame occupants are the stamp's border-ocean
 * rows — no legitimate v1 position lives there. Where two legacy footprints
 * overlap (Enumclaw/Seattle authored side by side) the FIRST table entry
 * wins, matching the sub-stamp slicer.
 */
export function replantRemapLatLng(ll: { lat: number; lng: number }): { lat: number; lng: number } {
  const o = WORLD_CALIBRATION['pnw-legacy'].origin;
  const lx = (ll.lng - o.lng) * PX_PER_DEG_LNG;
  const ly = (o.lat - ll.lat) * PX_PER_DEG_LAT;
  if (lx < 0 || ly < 0 || lx >= 1100 * TILE_PX || ly >= 800 * TILE_PX) return ll; // (c)
  const toLatLng = (g: { x: number; y: number }) => ({ lat: 85 - g.y / PX_PER_DEG_LAT, lng: g.x / PX_PER_DEG_LNG - 180 });
  for (const p of REPLANT_POIS) {
    if (!p.footprint) continue;
    const a = poiLegacyAnchor(p, legacyRawToLocal);
    const tx0 = Math.max(0, Math.floor(a.x / TILE_PX) + p.footprint.dx) * TILE_PX;
    const ty0 = Math.max(0, Math.floor(a.y / TILE_PX) + p.footprint.dy) * TILE_PX;
    if (lx >= tx0 && lx < tx0 + p.footprint.w * TILE_PX && ly >= ty0 && ly < ty0 + p.footprint.h * TILE_PX) {
      const g = poiGlobePx(p.id); // (a): same local offset from the anchor
      return toLatLng({ x: g.x + (lx - a.x), y: g.y + (ly - a.y) });
    }
  }
  let best = REPLANT_SETTLEMENTS[0];
  let bestD = Infinity;
  for (const id of REPLANT_SETTLEMENTS) {
    const a = poiLegacyAnchor(replantPoi(id), legacyRawToLocal);
    const d = Math.hypot(a.x - lx, a.y - ly);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return toLatLng(poiGlobePx(best)); // (b)
}
