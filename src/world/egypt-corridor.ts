import { latLngGlobePx, crossingEnds, type ReplantCrossing } from './replant';

/**
 * EGYPT CORRIDOR (Pass 7 Commit 3): the five-beat Faiyum → Sinai journey over
 * the TRUE-COORDINATE world, authored with the 6C corridor discipline — the
 * polyline derives from the quest beats, and authored crossing stamps bridge
 * baked water wider than a ford at REAL crossing sites only.
 *
 * GROUND-TRUTH (probed against the composed source, gate re-proves):
 * - Every beat anchor stands on walkable baked ground (Faiyum savanna, Suez
 *   desert, camp/foot-of-mountain savanna at 53/66 m).
 * - The baked Nile at Cairo is ~100 tiles wide — far beyond any causeway.
 *   The corridor crosses it THROUGH the hand-built Cairo map (the authored
 *   stamp covers the whole channel, lat 29.96..30.08 x lng 31.17..31.33):
 *   the real referent is the Cairo bridge cluster, and the authored city IS
 *   the crossing, exactly as the 6C cover rule defines it.
 * - The baked Gulf of Suez head ends at ~29.96°N; the canal channel narrows
 *   to 32 tiles of OCEAN at 30.006°N (lng 32.5676..32.5761) — the Ahmed
 *   Hamdi Tunnel site. One 48-tile east-west causeway spans it with banks.
 * - Every other leg rides water-free (probed end to end).
 */

/** Beat anchors (true coordinates). Beat 2 (Cairo) is deliberately ABSENT:
 *  the corridor references the EXISTING Cairo anchors BY ID — the mentor at
 *  the cairo-nile-crown zone — and never re-enters those coordinates. */
export const EGYPT_BEATS = {
  /** Beat 1 — the Faiyum settlement (registry id 'faiyum'; anchor matches). */
  faiyum: { lat: 29.31, lng: 30.84 },
  /** Beat 3 — the road at Suez, on land just north of the baked gulf head. */
  suez: { lat: 29.97, lng: 32.55 },
  /** Beat 4 — the foot camp near St. Catherine's (a camp STAMP, not a settlement). */
  sinaiCamp: { lat: 28.556, lng: 33.976 },
  /** Beat 5 — the Jebel Musa summit: the second Heaven-portal instance. */
  summit: { lat: 28.539, lng: 33.975 },
} as const;

/** The corridor's authored water crossings (6C contract, REUSED type). The
 *  lat/lng is snapped onto the BAKED channel nearest the real site — the bake
 *  is the world truth the causeway must span. */
export const EGYPT_CROSSINGS: readonly ReplantCrossing[] = [
  { id: 'canal-ahmed-hamdi', lat: 30.006, lng: 32.5719, referent: 'Ahmed Hamdi Tunnel, Suez (surface causeway over the baked canal channel)', dir: 'ew', tiles: 48 },
];

/**
 * THE POLYLINE: beat ids, `x:` crossing ids, `b:cairo` (resolved live BY ID
 * through the Cairo mentor anchor), and plain lat/lng via-points where the
 * geography demands a land route (the corridor never swims).
 */
export type EgyptCorridorNode = string | { lat: number; lng: number };
export const EGYPT_CORRIDOR: readonly EgyptCorridorNode[] = [
  'faiyum',
  'b:cairo',
  'suez',
  { lat: 30.006, lng: 32.55 }, // due west of the causeway, north of the gulf head
  'x:canal-ahmed-hamdi',
  { lat: 29.9, lng: 32.72 }, // east-bank descent, clear of the gulf shore
  'sinaiCamp',
  'summit',
];

/**
 * The corridor as GLOBE-LOCAL px points (the caller adds the scene origin) —
 * the 6C expansion rule reused verbatim: beats + vias as-is, each crossing as
 * its TWO causeway ends ordered nearest-first from the previous point, and
 * `b:cairo` through the injected live resolver (BY ID — never a coordinate).
 */
export function egyptCorridorPoints(resolveCairoGlobePx: () => { x: number; y: number }): { x: number; y: number; label: string }[] {
  const out: { x: number; y: number; label: string }[] = [];
  for (const n of EGYPT_CORRIDOR) {
    if (typeof n === 'object') {
      const p = latLngGlobePx(n.lat, n.lng);
      out.push({ x: p.x, y: p.y, label: `via(${n.lat},${n.lng})` });
    } else if (n === 'b:cairo') {
      const p = resolveCairoGlobePx();
      out.push({ x: p.x, y: p.y, label: 'b:cairo' });
    } else if (n.startsWith('x:')) {
      const c = EGYPT_CROSSINGS.find((k) => k.id === n.slice(2));
      if (!c) throw new Error(`egypt-corridor: unknown crossing '${n}'`);
      const ends = crossingEnds(c);
      const prev = out[out.length - 1];
      const d0 = prev ? Math.hypot(ends[0].x - prev.x, ends[0].y - prev.y) : 0;
      const d1 = prev ? Math.hypot(ends[1].x - prev.x, ends[1].y - prev.y) : 1;
      const [a, b] = d0 <= d1 ? ends : [ends[1], ends[0]];
      out.push({ x: a.x, y: a.y, label: `${n}:in` }, { x: b.x, y: b.y, label: `${n}:out` });
    } else {
      const b = EGYPT_BEATS[n as keyof typeof EGYPT_BEATS];
      if (!b) throw new Error(`egypt-corridor: unknown beat '${n}'`);
      const p = latLngGlobePx(b.lat, b.lng);
      out.push({ x: p.x, y: p.y, label: n });
    }
  }
  return out;
}

/** THE SINAI FOOT CAMP — a camp STAMP (existing town legend, NOT a settlement:
 *  no registry entry, no NPCs, no hearth). The waystone node `sinai-camp`
 *  stands at its spawn cell, discovery-based like every non-home node.
 *  TODO-lore: the camp's name and any dressing beyond the placeholder tiles. */
export const SINAI_CAMP_STAMP = {
  id: 'sinai-camp',
  displayName: 'Sinai Foot Camp',
  lat: EGYPT_BEATS.sinaiCamp.lat,
  lng: EGYPT_BEATS.sinaiCamp.lng,
  rows: [
    '.B..=..B.',
    '....=....',
    'B...=...B',
    '=========',
    'B...s...B',
    '....=....',
    '.B..=..B.',
  ],
} as const;

/** THE SUEZ ROAD PACK (beat 3): EXISTING live-spawnable families only — the
 *  two Egypt zone families plus the raider family, spawned through their
 *  existing spawners with their canon domain tints. The gate asserts every
 *  id resolves in EXISTING_FAMILY_DOMAIN (no new family ships here). */
export const SUEZ_SPAWN_SET: readonly { family: string; count: number }[] = [
  { family: 'evil-raiders', count: 4 },
  { family: 'corrupted-wildlife', count: 3 },
  { family: 'lesser-evil-scouts', count: 3 },
];
