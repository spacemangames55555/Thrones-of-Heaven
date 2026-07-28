import { PX_PER_DEG_LAT, PX_PER_DEG_LNG, TILE_PX, isScaleV2 } from './world-scale';

/**
 * PASS 6C — PNW RE-PLANTING (the Luxor treatment, at home). The legacy
 * mega-stamp (washington.map.json, 1100×800 tiles) preserved 50:1-era
 * internal distances; under v2 it DISSOLVES and every POI re-plants at its
 * TRUE Earth coordinate on real terrain. The framework is a piecewise
 * re-projection: every authored constant flows through legacyEarthPx with a
 * DECLARED poi; its true position = the poi's true anchor + the exact legacy
 * local offset (anchors move, layouts do not). POIs with a terrain footprint
 * additionally stamp their legacy tile rect at the true anchor through the
 * existing GameMap machinery, byte-preserved.
 *
 * Under ?scale=v1 nothing here runs — the legacy world stays byte-identical.
 *
 * FICTION placements (no real-world referent) are marked `fiction` and
 * TODO-review: the Holy Outpost sits ~40 km ESE of Kamiah on the
 * Clearwater/Selway high bench (spec constraint 25–60 km — 2–4 mounted
 * minutes of staging by construction); the Heaven Portal sits ~10 km further
 * east on a high-elevation-band summit (spec: within 15 km, prominent
 * terrain). In the legacy frame the portal COINCIDED with the outpost; the
 * spec separates them onto distinct real terrain.
 */
export interface ReplantPoi {
  id: string;
  /** True Earth anchor (ε gate tolerance = 0.02°). */
  lat: number;
  lng: number;
  /** Legacy anchor: EITHER raw settings-constant px (the pre-unification
   *  authored frame every legacyEarthPx constant uses) OR a city-marker tile
   *  of washington.map.json (map-local). Exactly one is set. */
  legacyRaw?: { x: number; y: number };
  cityTile?: { tx: number; ty: number };
  /** Terrain footprint stamped at the true anchor: a legacy tile rect
   *  RELATIVE to the anchor tile (dx/dy usually negative = up-left). */
  footprint?: { dx: number; dy: number; w: number; h: number };
  fiction?: true;
}

/** THE POI TABLE (recon: every POI the legacy stamp hosts). Anything
 *  referencable by id is referenced by id — coordinates never re-entered. */
export const REPLANT_POIS: readonly ReplantPoi[] = [
  // Pinned real places (spec).
  { id: 'enumclaw', lat: 47.204, lng: -121.991, cityTile: { tx: 316, ty: 196 }, footprint: { dx: -20, dy: -24, w: 48, h: 48 } },
  { id: 'seattle', lat: 47.606, lng: -122.332, cityTile: { tx: 296, ty: 165 }, footprint: { dx: -16, dy: -14, w: 36, h: 30 } },
  { id: 'olympia', lat: 47.038, lng: -122.9, legacyRaw: { x: 136915, y: 94569 }, footprint: { dx: -12, dy: -12, w: 26, h: 26 } },
  { id: 'boise', lat: 43.615, lng: -116.202, legacyRaw: { x: 154875, y: 100561 }, footprint: { dx: -30, dy: -30, w: 62, h: 56 } },
  { id: 'kamiah', lat: 46.227, lng: -116.029, legacyRaw: { x: 156675, y: 89461 }, footprint: { dx: -12, dy: -12, w: 26, h: 26 } },
  { id: 'portland', lat: 45.515, lng: -122.678, cityTile: { tx: 376, ty: 409 }, footprint: { dx: -14, dy: -12, w: 32, h: 28 } },
  // Real-place anchors (referents documented in the authored comments).
  { id: 'tree-line', lat: 47.15, lng: -121.75, legacyRaw: { x: 139891, y: 91849 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'tacoma-beach', lat: 47.29, lng: -122.51, legacyRaw: { x: 137683, y: 92489 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'snoqualmie-pass', lat: 47.392, lng: -121.4, legacyRaw: { x: 141491, y: 91177 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'pells-farm', lat: 47.25, lng: -122.1, legacyRaw: { x: 138547, y: 92041 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  { id: 'corrupted-grove', lat: 47.2, lng: -121.9, legacyRaw: { x: 139763, y: 92137 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  { id: 'whitepass-farm', lat: 46.64, lng: -121.39, legacyRaw: { x: 141491, y: 93897 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'yakima', lat: 46.602, lng: -120.505, legacyRaw: { x: 144019, y: 95465 }, footprint: { dx: -10, dy: -10, w: 22, h: 22 } },
  { id: 'lake-chelan', lat: 47.841, lng: -120.016, legacyRaw: { x: 145267, y: 91241 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'bellingham-farms', lat: 48.7, lng: -122.42, legacyRaw: { x: 138355, y: 87209 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'cascades', lat: 47.47, lng: -121.23, legacyRaw: { x: 142451, y: 92297 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'longview', lat: 46.138, lng: -122.938, legacyRaw: { x: 138931, y: 97097 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'oregon-city', lat: 45.357, lng: -122.607, legacyRaw: { x: 143675, y: 99261 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'bend', lat: 44.058, lng: -121.315, legacyRaw: { x: 144275, y: 100861 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'la-grande', lat: 45.325, lng: -118.088, legacyRaw: { x: 148675, y: 99161 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'caravan-route', lat: 45.1, lng: -122.75, legacyRaw: { x: 141175, y: 99361 }, fiction: true },
  { id: 'florence', lat: 43.983, lng: -124.104, legacyRaw: { x: 130975, y: 101061 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'roseburg', lat: 43.216, lng: -123.342, legacyRaw: { x: 140075, y: 102261 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  // The rift cluster (fiction, east of Mt. Hood — TODO-review) and the
  // Willamette descent sites (real referents).
  { id: 'oregon-rift', lat: 45.4, lng: -121.48, legacyRaw: { x: 143875, y: 98911 }, footprint: { dx: -10, dy: -10, w: 22, h: 22 }, fiction: true },
  { id: 'portal', lat: 45.38, lng: -121.44, legacyRaw: { x: 144075, y: 99111 }, footprint: { dx: -10, dy: -10, w: 22, h: 22 }, fiction: true },
  { id: 'dark-outpost', lat: 45.42, lng: -121.42, legacyRaw: { x: 144275, y: 98661 }, footprint: { dx: -10, dy: -10, w: 22, h: 22 }, fiction: true },
  { id: 'farm-field', lat: 45.3, lng: -122.65, legacyRaw: { x: 143375, y: 99461 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  { id: 'descent-a', lat: 45.34, lng: -121.3, legacyRaw: { x: 144575, y: 99461 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  { id: 'descent-b', lat: 45.28, lng: -122.55, legacyRaw: { x: 143475, y: 99711 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  // Idaho (rivers are fiction in the Clearwater/Salmon uplands; cities real).
  { id: 'river-1', lat: 46.05, lng: -115.6, legacyRaw: { x: 158275, y: 91161 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  { id: 'river-2', lat: 45.4, lng: -116.3, legacyRaw: { x: 156675, y: 93961 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  { id: 'river-3', lat: 45.0, lng: -115.7, legacyRaw: { x: 158675, y: 95161 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 }, fiction: true },
  { id: 'city-1', lat: 43.66, lng: -116.28, legacyRaw: { x: 155675, y: 100161 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  { id: 'city-2', lat: 42.556, lng: -114.47, legacyRaw: { x: 159975, y: 101161 }, footprint: { dx: -8, dy: -8, w: 18, h: 18 } },
  // city-3 (Idaho Falls) sits ON the baked Snake channel: its footprint is
  // sized to span the channel, so the authored layout IS the crossing.
  { id: 'city-3', lat: 43.492, lng: -112.034, legacyRaw: { x: 161475, y: 99161 }, footprint: { dx: -19, dy: -19, w: 38, h: 38 } },
  // The assault fiction (spec-constrained; see the header note).
  { id: 'holy-outpost', lat: 46.05, lng: -115.55, legacyRaw: { x: 158675, y: 88761 }, footprint: { dx: -20, dy: -20, w: 42, h: 42 }, fiction: true },
  { id: 'heaven-portal', lat: 46.03, lng: -115.42, legacyRaw: { x: 158675, y: 88761 }, footprint: { dx: -10, dy: -10, w: 22, h: 22 }, fiction: true },
];

export type ReplantPoiId = (typeof REPLANT_POIS)[number]['id'];
const POI_BY_ID = new Map(REPLANT_POIS.map((p) => [p.id, p]));

export function replantPoi(id: string): ReplantPoi {
  const p = POI_BY_ID.get(id);
  if (!p) throw new Error(`replant: unknown poi '${id}'`);
  return p;
}

/** A lat/lng in GLOBE-LOCAL px (the caller adds the scene origin —
 *  legacy-frame owns that constant; this module stays frame-pure). */
export function latLngGlobePx(lat: number, lng: number): { x: number; y: number } {
  return { x: (lng + 180) * PX_PER_DEG_LNG, y: (85 - lat) * PX_PER_DEG_LAT };
}

/** True Earth anchor in GLOBE-LOCAL px. */
export function poiGlobePx(id: string): { x: number; y: number } {
  const p = replantPoi(id);
  return latLngGlobePx(p.lat, p.lng);
}

/** A poi's legacy anchor in MAP-LOCAL px of washington.map.json. The raw
 *  constant frame differs from map-local by the v1 delta — the CALLER
 *  (legacy-frame) normalizes, keeping this module free of that constant. */
export function poiLegacyAnchor(p: ReplantPoi, rawToLocal: (q: { x: number; y: number }) => { x: number; y: number }): { x: number; y: number } {
  if (p.cityTile) return { x: p.cityTile.tx * TILE_PX + TILE_PX / 2, y: p.cityTile.ty * TILE_PX + TILE_PX / 2 };
  return rawToLocal(p.legacyRaw!);
}

/** WATER CROSSINGS (Pass 6C): where the corridor polyline crosses baked
 *  FRESHWATER wider than a ford (threshold: 3 tiles ≈ 90 m), an authored
 *  crossing stamp bridges it at a REAL crossing site — road tiles from the
 *  EXISTING vocabulary only. dir 'ew' = the road runs east-west. */
export interface ReplantCrossing {
  id: string;
  lat: number;
  lng: number;
  /** Real-world referent (enumerated in the commit body). */
  referent: string;
  dir: 'ew' | 'ns';
  /** Road length in tiles (spans the river + banks). */
  tiles: number;
}
export const REPLANT_CROSSINGS: readonly ReplantCrossing[] = [
  // Discovered by riding the corridor against the baked water (the gate's
  // sampler): every site is a REAL crossing on the corridor's route, with the
  // lat/lng snapped onto the BAKED channel nearest the real bridge (the bake
  // shifts rivers slightly off their surveyed positions; the bake is the
  // world truth the causeway must span).
  { id: 'columbia-beebe', lat: 47.795, lng: -119.99, referent: 'Beebe Bridge, Chelan Falls WA (Yakima to Chelan leg)', dir: 'ew', tiles: 32 },
  { id: 'columbia-vantage', lat: 46.948, lng: -119.9458, referent: 'Vantage Bridge WA (both eastern Columbia crossings)', dir: 'ew', tiles: 48 },
  { id: 'columbia-bridge-of-gods', lat: 45.6794, lng: -121.901, referent: 'Bridge of the Gods, Cascade Locks (Longview to the rift)', dir: 'ns', tiles: 48 },
  { id: 'snake-lewiston', lat: 46.42, lng: -117.0273, referent: 'Southway Bridge, Lewiston ID (Snake below Hells Canyon)', dir: 'ew', tiles: 48 },
  { id: 'snake-central-ferry', lat: 46.7029, lng: -117.719, referent: 'Central Ferry Bridge SR-127, lower Snake WA', dir: 'ns', tiles: 48 },
  { id: 'snake-farewell-bend', lat: 44.3, lng: -117.196, referent: 'Farewell Bend OR/ID (the Oregon Trail Snake crossing)', dir: 'ew', tiles: 32 },
  { id: 'snake-glenns-ferry', lat: 42.956, lng: -115.31, referent: 'Three Island Crossing, Glenns Ferry ID', dir: 'ns', tiles: 32 },
  { id: 'snake-perrine', lat: 42.6132, lng: -114.454, referent: 'Perrine Bridge, Twin Falls ID', dir: 'ns', tiles: 40 },
  { id: 'john-day-kimberly', lat: 44.75, lng: -119.6323, referent: 'Kimberly OR John Day bridge (Blue Mountains legs)', dir: 'ew', tiles: 32 },
  { id: 'willamette-independence', lat: 44.83, lng: -123.0798, referent: 'Independence OR Willamette crossing (Buena Vista reach)', dir: 'ew', tiles: 64 },
  { id: 'salmon-riggins', lat: 45.45, lng: -116.2981, referent: 'Riggins ID Salmon River crossing', dir: 'ew', tiles: 40 },
];

/** A crossing's two causeway END points in globe-local px (inset 1.5 tiles
 *  from the stamp edge, so both ends stand on the banks). The corridor ride
 *  enters one end and exits the other — the ride runs ALONG the causeway. */
export function crossingEnds(c: ReplantCrossing): [{ x: number; y: number }, { x: number; y: number }] {
  const center = latLngGlobePx(c.lat, c.lng);
  const half = (c.tiles * TILE_PX) / 2 - TILE_PX * 1.5;
  if (c.dir === 'ew') return [{ x: center.x - half, y: center.y }, { x: center.x + half, y: center.y }];
  return [{ x: center.x, y: center.y - half }, { x: center.x, y: center.y + half }];
}

/**
 * THE CORRIDOR POLYLINE (Pass 6C): the authored Acts I–IV journey as a node
 * sequence over the TRUE-COORDINATE world. Nodes are POI ids, `x:` crossing
 * ids (the route goes OVER that causeway), or plain lat/lng via-points where
 * real geography demands a land route (around salt water and canyons — the
 * corridor never swims). The corridor-traversable gate rides every segment;
 * Commit 2 re-grounds corridor-interpolated anchors by arc length along it.
 */
export type ReplantCorridorNode = string | { lat: number; lng: number };
export const REPLANT_CORRIDOR: readonly ReplantCorridorNode[] = [
  'enumclaw',
  'olympia',
  'tree-line',
  { lat: 47.235, lng: -122.465 }, // Tacoma inland — around Commencement Bay
  'tacoma-beach',
  { lat: 47.235, lng: -122.465 },
  'snoqualmie-pass',
  'pells-farm',
  'corrupted-grove',
  'whitepass-farm',
  'yakima',
  'x:columbia-vantage',
  { lat: 47.23, lng: -119.87 }, // Quincy basin — east of the Columbia
  { lat: 47.66, lng: -119.9 }, // Waterville plateau
  'x:columbia-beebe',
  'lake-chelan',
  { lat: 47.78, lng: -120.2 }, // around the lake foot, south rim
  { lat: 47.95, lng: -121.0 }, // upper Wenatchee high country
  { lat: 48.45, lng: -121.6 }, // Sauk prairie
  'bellingham-farms',
  'cascades',
  'seattle',
  { lat: 47.48, lng: -122.2 }, // Renton — inland of the Duwamish
  { lat: 46.85, lng: -122.55 }, // Nisqually uplands
  'longview',
  'x:columbia-bridge-of-gods',
  'oregon-rift',
  'oregon-city',
  'farm-field',
  'descent-a',
  'descent-b',
  'dark-outpost',
  'bend',
  'x:john-day-kimberly',
  'la-grande',
  'x:john-day-kimberly',
  { lat: 44.6, lng: -120.4 }, // south of the lower John Day arc
  { lat: 44.86, lng: -121.05 }, // Warm Springs plateau
  'caravan-route',
  'x:willamette-independence',
  'florence',
  'roseburg',
  { lat: 43.3, lng: -122.0 }, // Diamond Lake highlands — east of the reservoirs
  { lat: 44.4, lng: -120.2 }, // Ochoco foothills
  'x:john-day-kimberly',
  { lat: 44.8, lng: -118.2 }, // Baker valley
  'x:snake-farewell-bend',
  { lat: 44.9, lng: -116.4 }, // Council uplands
  { lat: 45.2, lng: -116.45 }, // Little Salmon rim
  'x:salmon-riggins',
  { lat: 45.9, lng: -116.15 }, // Camas Prairie rim
  'kamiah',
  { lat: 46.33, lng: -116.5 }, // Clearwater south bank
  'x:snake-lewiston',
  { lat: 46.42, lng: -117.3 }, // south of the confluence pool
  { lat: 46.68, lng: -117.719 }, // due south of the Central Ferry causeway
  'x:snake-central-ferry',
  { lat: 46.9, lng: -118.2 }, // Palouse
  { lat: 47.28, lng: -119.3 }, // channeled scablands rim
  { lat: 47.23, lng: -119.87 }, // Quincy basin
  'x:columbia-vantage',
  { lat: 46.85, lng: -120.4 }, // Kittitas valley
  { lat: 46.66, lng: -121.5 }, // White Pass approach
  'olympia',
  { lat: 46.66, lng: -121.5 },
  { lat: 46.85, lng: -120.4 },
  'x:columbia-vantage',
  { lat: 47.23, lng: -119.87 },
  { lat: 47.28, lng: -119.3 },
  { lat: 46.9, lng: -118.2 },
  'x:snake-central-ferry',
  { lat: 46.68, lng: -117.719 },
  { lat: 46.42, lng: -117.3 },
  'x:snake-lewiston',
  { lat: 46.33, lng: -116.5 },
  'river-1',
  'x:salmon-riggins',
  'river-2',
  'river-3',
  'city-1',
  'x:snake-glenns-ferry',
  { lat: 42.62, lng: -114.9 }, // south-bank Snake plain
  'city-2',
  'x:snake-perrine',
  'city-3',
  'boise',
  { lat: 44.75, lng: -116.05 }, // Long Valley east side
  { lat: 45.2, lng: -116.45 },
  'x:salmon-riggins',
  { lat: 45.9, lng: -116.15 },
  'holy-outpost',
  'heaven-portal',
];

/**
 * The corridor as GLOBE-LOCAL px points (the caller adds the scene origin):
 * POI anchors + via points as-is; each `x:` crossing expands to its TWO
 * causeway ends ordered nearest-first from the previous point, so the path
 * runs the causeway lengthwise over the water. Shared by the ride gate and
 * the Pass 6C Commit 2 arc-length re-grounding.
 */
export function corridorPoints(): { x: number; y: number; label: string }[] {
  const out: { x: number; y: number; label: string }[] = [];
  for (const n of REPLANT_CORRIDOR) {
    if (typeof n === 'object') {
      const p = latLngGlobePx(n.lat, n.lng);
      out.push({ x: p.x, y: p.y, label: `via(${n.lat},${n.lng})` });
    } else if (n.startsWith('x:')) {
      const c = REPLANT_CROSSINGS.find((k) => k.id === n.slice(2));
      if (!c) throw new Error(`corridor: unknown crossing '${n}'`);
      const ends = crossingEnds(c);
      const prev = out[out.length - 1];
      const d0 = prev ? Math.hypot(ends[0].x - prev.x, ends[0].y - prev.y) : 0;
      const d1 = prev ? Math.hypot(ends[1].x - prev.x, ends[1].y - prev.y) : 1;
      const [a, b] = d0 <= d1 ? ends : [ends[1], ends[0]];
      out.push({ x: a.x, y: a.y, label: `${n}:in` }, { x: b.x, y: b.y, label: `${n}:out` });
    } else {
      const p = poiGlobePx(n);
      out.push({ x: p.x, y: p.y, label: n });
    }
  }
  return out;
}

/** The settlements a dissolved-space save position falls back to (Commit 2
 *  save rule b): the towns + the corridor cities with terrain footprints.
 *  Arrival = the settlement anchor (gate-proven walkable where it stands). */
export const REPLANT_SETTLEMENTS: readonly string[] = ['enumclaw', 'seattle', 'portland', 'olympia', 'yakima', 'kamiah', 'boise'];

/**
 * Arc-length interpolation along the corridor SUB-PATH between two POI nodes
 * (the first occurrence of `fromPoi` to the next occurrence of `toPoi`), in
 * globe-local px. Pass 6C Commit 2: corridor-interpolated quest anchors
 * (escort ambushes authored BETWEEN settlements) re-ground at the same
 * PROPORTION of the true route they held on the legacy straight line.
 */
export function corridorLerp(fromPoi: string, toPoi: string, t: number): { x: number; y: number } {
  const pts = corridorPoints();
  const i0 = pts.findIndex((p) => p.label === fromPoi);
  if (i0 < 0) throw new Error(`corridorLerp: '${fromPoi}' is not on the corridor`);
  let i1 = -1;
  for (let i = i0 + 1; i < pts.length; i++) {
    if (pts[i].label === toPoi) {
      i1 = i;
      break;
    }
  }
  if (i1 < 0) throw new Error(`corridorLerp: '${toPoi}' does not follow '${fromPoi}' on the corridor`);
  const seg = pts.slice(i0, i1 + 1);
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i + 1 < seg.length; i++) {
    const l = Math.hypot(seg[i + 1].x - seg[i].x, seg[i + 1].y - seg[i].y);
    lens.push(l);
    total += l;
  }
  let want = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (want <= lens[i] || i === lens.length - 1) {
      const f = lens[i] === 0 ? 0 : Math.min(1, want / lens[i]);
      return { x: seg[i].x + (seg[i + 1].x - seg[i].x) * f, y: seg[i].y + (seg[i + 1].y - seg[i].y) * f };
    }
    want -= lens[i];
  }
  return { x: seg[seg.length - 1].x, y: seg[seg.length - 1].y };
}

/** Whether the v2 world re-plants (the whole pass is v2-only). */
export function isReplantActive(): boolean {
  return isScaleV2();
}
