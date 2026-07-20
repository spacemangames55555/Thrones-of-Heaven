import { WORLD_CALIBRATION } from './world-calibration';

/**
 * WORLD UNIFICATION TRANSFORMS — the coordinate mappings that carry the two
 * hand-built terrestrial worlds ('earth' = PNW/WA corridor, 'egypt' = the Nile
 * Crown) into the GLOBE world at their TRUE planet positions. COORDINATES
 * ONLY: these are pure translations (scale locked at 1) so every internal
 * distance, tile, and piece of content is preserved byte-for-byte; only the
 * origin moves. Heaven/Hell are separate PLANES and never pass through here.
 *
 * ── EARTH (PNW) ──────────────────────────────────────────────────────────────
 * The earth calibration (world-calibration.ts) was least-squares fit from
 * three hand-placed landmarks (Seattle/Portland/Boise) at the SAME pixels-per-
 * degree the globe uses (2426 x / 2453 y). Same scale on both sides ⇒ the
 * lat/lng round-trip reduces to ONE fixed translation — internal distances are
 * preserved EXACTLY (scale delta 0). Residual vs true geography is the fit's
 * own (~1,100 px mean, the map is stylized), unchanged by the move.
 *
 * ── EGYPT (Nile Crown) ───────────────────────────────────────────────────────
 * The egypt map is STYLIZED LARGE: measured from its landmark pairs it draws
 * ~1.3–1.7x too many pixels per degree of longitude and ~1.6–2.8x per degree
 * of latitude vs the globe scale. An affine with scale would rescale tiles
 * (destroying content), so the affine is fit with SCALE LOCKED AT 1 and the
 * translation anchored at CAIRO (the class-start city): Cairo lands exactly at
 * its true position; secondary landmarks keep their exact pixel distances and
 * therefore drift geographically (Mount Sinai lands ~2.4° SSE of true — the
 * dry-run report tabulates every landmark). This is the "as closely as the
 * globe scale allows" trade the migration spec calls for.
 */

/** True-geography anchors (WGS84-ish, minutes precision is plenty at 45 m/px). */
export const UNIFICATION_ANCHORS = {
  /** Cairo (the egypt map's class-start city): true position + its local map px. */
  cairo: { lat: 30.044, lng: 31.236, localPx: { x: 8064, y: 6240 } },
} as const;

/** A pure translation (px) from a hand-built world's LOCAL map pixels to the
 *  GLOBE world's LOCAL pixels (add the globe's runtime origin separately —
 *  exactly like every other lat/lng consumer). */
export interface UnificationDelta {
  dx: number;
  dy: number;
}

/** lat/lng → GLOBE-LOCAL px through the one shared globe calibration. */
export function globeLocalFromLatLng(lat: number, lng: number): { x: number; y: number } {
  const cal = WORLD_CALIBRATION.globe;
  return {
    x: (lng - cal.origin.lng) * cal.pixelsPerDegree.x,
    y: (cal.origin.lat - lat) * cal.pixelsPerDegree.y,
  };
}

/** GLOBE-LOCAL px → lat/lng (the inverse, for reports and dev readouts). */
export function latLngFromGlobeLocal(x: number, y: number): { lat: number; lng: number } {
  const cal = WORLD_CALIBRATION.globe;
  return {
    lat: cal.origin.lat - y / cal.pixelsPerDegree.y,
    lng: cal.origin.lng + x / cal.pixelsPerDegree.x,
  };
}

/** EARTH → GLOBE: same px/deg on both calibrations ⇒ exact translation. */
export function earthUnificationDelta(): UnificationDelta {
  const e = WORLD_CALIBRATION.earth;
  const g = WORLD_CALIBRATION.globe;
  // (lng shift, lat shift) of earth's local (0,0) inside the globe frame.
  return {
    dx: (e.origin.lng - g.origin.lng) * g.pixelsPerDegree.x,
    dy: (g.origin.lat - e.origin.lat) * g.pixelsPerDegree.y,
  };
}

/** EGYPT → GLOBE: translation anchored so Cairo lands at its true position. */
export function egyptUnificationDelta(): UnificationDelta {
  const cairo = UNIFICATION_ANCHORS.cairo;
  const target = globeLocalFromLatLng(cairo.lat, cairo.lng);
  return { dx: target.x - cairo.localPx.x, dy: target.y - cairo.localPx.y };
}

/** earth LOCAL map px → globe LOCAL px. */
export function earthLocalToGlobeLocal(x: number, y: number): { x: number; y: number } {
  const d = earthUnificationDelta();
  return { x: x + d.dx, y: y + d.dy };
}

/** egypt LOCAL map px → globe LOCAL px. */
export function egyptLocalToGlobeLocal(x: number, y: number): { x: number; y: number } {
  const d = egyptUnificationDelta();
  return { x: x + d.dx, y: y + d.dy };
}

/**
 * ABSORBED ZONES (the dry run's one real collision): generated globe zones
 * whose TRUE position now lies under a migrated hand-built map. Their zone id,
 * quests, spawns, arrival, and champion are untouched — only their GENERATED
 * terrain chunk is retired; the content re-hosts on the hand-built tiles
 * (hand-built is authoritative). Value names the host map for readability.
 */
export const ABSORBED_ZONE_HOSTS: Record<string, 'egypt-map'> = {
  'luxor-valley-of-kings': 'egypt-map',
};
