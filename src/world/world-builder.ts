import type { Zone } from './world-manifest';
import { getZone } from './world-manifest';
import type { WorldCalibration } from './world-calibration';
import { latLngToPixels } from './world-calibration';
import type { WashingtonMap, TerrainType } from '../map/mapTypes';

/**
 * WORLD BUILDER (Phase 0 — machinery only; no zones are stamped in this phase).
 *
 * ARCHITECTURE: the game's pattern is ONE seamless tilemap per march REGION
 * (the existing Washington map IS the North America region world), with
 * separate worlds connected by fade-travel. So this module does NOT create a
 * world per manifest zone. Instead:
 *
 *   • createWorld(regionId, calibration) — opens a region-world build handle.
 *   • stampZone(world, zone, stamper?)   — plans (and, when a tile stamper is
 *     supplied, paints) that zone's area INTO its region world's tilemap:
 *     a placeholder terrain patch keyed by biome, a settlement/outpost
 *     footprint, enemy-family spawn markers, and its transitions.
 *
 * TRANSITIONS (from connectsTo):
 *   • both zones in the SAME region world → walkable adjacency (no door).
 *   • zones in DIFFERENT worlds          → a fade-travel door.
 *   • any connection also listed in seaGates → a fade-travel door PRESENTED
 *     as a dock/boat (visually identical placeholder for now).
 *
 * PURITY: everything here is plain TypeScript — coordinate conversion,
 * adjacency validation, stamp planning — so it runs headlessly (npm run
 * smoke). Phaser never appears in this module; painting goes through the
 * minimal {@link TileStamper} interface, which the game's existing GameMap
 * already satisfies structurally. Rendering-side glue lives in the scene,
 * not here.
 */

// ── Region-world assignment ───────────────────────────────────────────────────

/**
 * Which REGION WORLD a manifest zone's content lives in, keyed by continent.
 * (All five seed zones are North America → the existing 'earth' world. Egypt
 * zones would map Africa → 'egypt', etc.)
 */
export const CONTINENT_WORLD: Record<string, string> = {
  'North America': 'earth',
  // AFRICA is its own sparse region world (the Rift march). The hand-built
  // EGYPT world remains a separate dense map — the manifest's Cairo zone is
  // PRE-EXISTING there (never stamped) and linked by a cross-world gate.
  Africa: 'africa',
  Europe: 'europe',
};

/** The region world id a zone stamps into (throws on an unmapped continent). */
export function worldIdForZone(zone: Zone): string {
  const w = CONTINENT_WORLD[zone.continent];
  if (!w) throw new Error(`Zone '${zone.id}': no region world mapped for continent '${zone.continent}'`);
  return w;
}

// ── Placeholder tiles by biome (NO final art, ever, in this pipeline) ─────────

/**
 * biome → the placeholder terrain KEY painted for that zone's ground patch.
 * Every key already exists in the shared tile atlas; these are gray-box
 * stand-ins, never final art. Unknown biomes fail loudly (controlled vocab).
 */
export const BIOME_PLACEHOLDER_TILE: Record<string, string> = {
  'temperate-rainforest': 'rainforest',
  'alpine-forest': 'montane',
  'holy-highland': 'foothills',
  'portal-threshold': 'holy_ground',
  desert: 'dune_sand',
  'river-valley': 'irrigated_field',
  // Europe (all existing walkable atlas keys — gray-box stand-ins):
  'urban-temperate': 'urban',
  'mediterranean-coast': 'beach',
  'frozen-coast': 'beach',
  taiga: 'montane',
  'mixed-forest': 'forest',
  'steppe-river': 'steppe',
  'carpathian-pass': 'pass',
  alpine: 'scabland',
  'danube-river': 'grassland',
  'balkan-highland': 'foothills',
  'chalk-coast': 'beach',
  'lowland-farmland': 'farmland',
  'urban-river': 'urban',
  'vineyard-hills': 'farmland',
  // Africa (existing walkable atlas keys — gray-box stand-ins):
  'nile-delta': 'irrigated_field',
  'nile-valley': 'irrigated_field',
  'nile-cataract': 'pass',
  'desert-highland': 'dune_sand',
  marsh: 'grassland',
  'lake-shore': 'beach',
  savanna: 'steppe',
  'rainforest-river': 'rainforest',
  'deep-rainforest': 'rainforest',
  'volcanic-highland': 'scabland',
};

export function placeholderTileForBiome(biome: string): string {
  const key = BIOME_PLACEHOLDER_TILE[biome];
  if (!key) throw new Error(`No placeholder tile mapped for biome '${biome}' — add it to BIOME_PLACEHOLDER_TILE`);
  return key;
}

// ── Stamp plans (pure data — what stampZone paints) ──────────────────────────

export type TransitionKind =
  | 'walkable' // same region world: plain map adjacency, no door
  | 'fade-door' // different worlds: fade-travel transition
  | 'sea-dock'; // seaGates entry: fade-travel presented as a dock/boat

export interface ZoneTransition {
  fromZoneId: string;
  toZoneId: string;
  kind: TransitionKind;
}

export interface SpawnMarker {
  enemyFamily: string;
  /** LOCAL pixels on the region world's map (runtime world offset NOT included). */
  x: number;
  y: number;
}

/** Everything stampZone would paint for one zone — pure data, headless-checkable. */
export interface ZoneStampPlan {
  zoneId: string;
  worldId: string;
  /** Zone anchor in LOCAL pixels on its region world's map. */
  centerPx: { x: number; y: number };
  /** The placeholder ground patch: center tile + radius (tiles). */
  patch: { tx: number; ty: number; radiusTiles: number; tileKey: string };
  /** Settlement/outpost footprint size (tiles), by zone kind. */
  footprintTiles: { w: number; h: number };
  spawnMarkers: SpawnMarker[];
  transitions: ZoneTransition[];
}

const TILE_SIZE = 32;

/** Ground-patch radius by zone kind (tiles) — tunable gray-box sizing. */
const PATCH_RADIUS: Record<Zone['kind'], number> = {
  city: 24,
  outpost: 12,
  corridor: 18,
  dungeon: 10,
  portal: 10,
};

/** Settlement footprint by zone kind (tiles) — the walled/structure stamp area. */
const FOOTPRINT: Record<Zone['kind'], { w: number; h: number }> = {
  city: { w: 14, h: 10 },
  outpost: { w: 8, h: 6 },
  corridor: { w: 0, h: 0 }, // corridors have no settlement footprint
  dungeon: { w: 6, h: 6 },
  portal: { w: 6, h: 6 },
};

/** Classify one connection (see the module header for the three kinds). */
export function classifyTransition(from: Zone, toZoneId: string): ZoneTransition {
  const to = getZone(toZoneId);
  if (!to) throw new Error(`Zone '${from.id}' connects to unknown zone '${toZoneId}'`);
  const kind: TransitionKind = from.seaGates?.includes(toZoneId)
    ? 'sea-dock'
    : worldIdForZone(from) === worldIdForZone(to)
      ? 'walkable'
      : 'fade-door';
  return { fromZoneId: from.id, toZoneId, kind };
}

/**
 * Build the full stamp plan for a zone (pure — no painting). Throws on any
 * data problem: unmapped continent/biome, unknown connection, bad coordinates.
 */
export function planZoneStamp(zone: Zone, calibration: WorldCalibration): ZoneStampPlan {
  const worldId = worldIdForZone(zone);
  const centerPx = latLngToPixels(calibration, zone.anchor);
  const tx = Math.round(centerPx.x / TILE_SIZE);
  const ty = Math.round(centerPx.y / TILE_SIZE);
  const radiusTiles = PATCH_RADIUS[zone.kind];
  const tileKey = placeholderTileForBiome(zone.biome);

  // Spawn markers: one per enemy family, spread on a ring inside the patch.
  const spawnMarkers: SpawnMarker[] = zone.enemyFamilies.map((fam, i) => {
    const ang = (Math.PI * 2 * i) / Math.max(1, zone.enemyFamilies.length);
    const r = radiusTiles * TILE_SIZE * 0.6;
    return { enemyFamily: fam, x: centerPx.x + Math.cos(ang) * r, y: centerPx.y + Math.sin(ang) * r };
  });

  const transitions = zone.connectsTo.map((toId) => classifyTransition(zone, toId));

  return {
    zoneId: zone.id,
    worldId,
    centerPx,
    patch: { tx, ty, radiusTiles, tileKey },
    footprintTiles: FOOTPRINT[zone.kind],
    spawnMarkers,
    transitions,
  };
}

// ── Graph validation (the verification gate's core) ──────────────────────────

/**
 * Validate the whole manifest graph. Returns a list of plain-English errors
 * (empty = healthy): unknown connectsTo ids, one-way links (adjacency must
 * resolve in BOTH directions), seaGates not present in connectsTo, zones with
 * no connections, duplicate zone/beat ids.
 */
export function validateWorldGraph(zones: Zone[]): string[] {
  const errors: string[] = [];
  const byId = new Map(zones.map((z) => [z.id, z]));
  if (byId.size !== zones.length) errors.push('Duplicate zone ids in the manifest');

  const beatIds = new Set<string>();
  for (const z of zones) {
    if (z.connectsTo.length === 0) errors.push(`Zone '${z.id}' connects to nothing (unreachable)`);
    for (const to of z.connectsTo) {
      const t = byId.get(to);
      if (!t) errors.push(`Zone '${z.id}' connects to unknown zone '${to}'`);
      else if (!t.connectsTo.includes(z.id)) errors.push(`One-way link: '${z.id}' → '${to}' has no return connection`);
    }
    for (const gate of z.seaGates ?? []) {
      if (!z.connectsTo.includes(gate)) errors.push(`Zone '${z.id}' seaGate '${gate}' is not in its connectsTo`);
    }
    for (const beat of z.questChain) {
      if (beatIds.has(beat.id)) errors.push(`Duplicate quest beat id '${beat.id}'`);
      beatIds.add(beat.id);
    }
  }
  return errors;
}

// ── The region-world build handle + stamping ──────────────────────────────────

/**
 * The minimal tile-painting surface stampZone needs. The game's GameMap
 * already satisfies this structurally — no Phaser types leak in here.
 */
export interface TileStamper {
  setTileId(tx: number, ty: number, id: number): void;
  commitEdits(): void;
  /** terrain KEY → this map's terrain id (adapter over the map's terrain table). */
  terrainIdForKey(key: string): number;
}

/**
 * One materialized chunk of a SPARSE world: a small standalone tile rect that
 * renders as its OWN layer at its offset (exactly how the nested city sub-maps
 * already render), so the huge logical plane is never allocated densely.
 */
export interface ZoneChunkPlan {
  zoneId: string;
  /** Chunk rect in LOCAL pixels on the sparse world's logical plane. */
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  tileKey: string;
}

export interface RegionWorld {
  regionId: string;
  calibration: WorldCalibration;
  /** Plans for every zone stamped into this world so far (Phase 0: stays empty). */
  stamped: ZoneStampPlan[];
  /**
   * Present on SPARSE worlds — region worlds whose logical span is far too
   * large for one dense tilemap (Europe ≈ 3,800 × 2,600 tiles ≈ 10M cells;
   * the dense stitcher + a single TilemapLayer cannot carry that). Stamped
   * zones materialize as independent chunk layers; the empty span between
   * them renders as a cheap flat void/terrain fill (camera background).
   */
  sparse?: { boundsPx: { w: number; h: number }; chunks: ZoneChunkPlan[] };
}

/** Open a DENSE region-world build handle (one seamless tilemap, like the
 *  existing Washington world — fine up to roughly the WA map's ~900k tiles). */
export function createWorld(regionId: string, calibration: WorldCalibration): RegionWorld {
  return { regionId, calibration, stamped: [] };
}

/** Open a SPARSE region-world build handle (chunked stamping; see RegionWorld.sparse). */
export function createSparseWorld(
  regionId: string,
  calibration: WorldCalibration,
  spanDegrees: { lng: number; lat: number },
): RegionWorld {
  const boundsPx = {
    w: spanDegrees.lng * calibration.pixelsPerDegree.x,
    h: spanDegrees.lat * calibration.pixelsPerDegree.y,
  };
  return { regionId, calibration, stamped: [], sparse: { boundsPx, chunks: [] } };
}

/**
 * Stamp one zone into its region world. Always computes + records the plan
 * (pure); when a {@link TileStamper} is supplied it also paints the placeholder
 * ground patch and settlement footprint. Phase 0 never supplies a stamper —
 * all five seed zones exist hand-built, so nothing is painted in this run.
 */
export function stampZone(world: RegionWorld, zone: Zone, stamper?: TileStamper): ZoneStampPlan {
  if (worldIdForZone(zone) !== world.regionId) {
    throw new Error(`Zone '${zone.id}' belongs to world '${worldIdForZone(zone)}', not '${world.regionId}'`);
  }
  const plan = planZoneStamp(zone, world.calibration);

  // SPARSE world: the zone materializes as its own CHUNK (small standalone
  // rect rendered as an independent layer at its offset) instead of painting
  // into one huge shared tilemap. Bounds-check against the logical span.
  if (world.sparse) {
    const margin = 8; // tiles of fringe around the ground patch
    const half = (plan.patch.radiusTiles + margin) * TILE_SIZE;
    const b = world.sparse.boundsPx;
    if (plan.centerPx.x < 0 || plan.centerPx.y < 0 || plan.centerPx.x > b.w || plan.centerPx.y > b.h) {
      throw new Error(`Zone '${zone.id}' anchor falls outside sparse world '${world.regionId}' bounds`);
    }
    world.sparse.chunks.push({
      zoneId: zone.id,
      x: plan.centerPx.x - half,
      y: plan.centerPx.y - half,
      widthPx: half * 2,
      heightPx: half * 2,
      tileKey: plan.patch.tileKey,
    });
  }

  if (stamper) {
    // Placeholder ground patch (gray-box biome tile).
    const groundId = stamper.terrainIdForKey(plan.patch.tileKey);
    const r = plan.patch.radiusTiles;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        stamper.setTileId(plan.patch.tx + dx, plan.patch.ty + dy, groundId);
      }
    }
    // Settlement/outpost footprint: a simple blocked rectangle placeholder
    // (city interiors become nested city sub-maps in later phases).
    const f = plan.footprintTiles;
    if (f.w > 0 && f.h > 0) {
      const wallId = stamper.terrainIdForKey('town_building');
      const x0 = plan.patch.tx - Math.floor(f.w / 2);
      const y0 = plan.patch.ty - Math.floor(f.h / 2);
      for (let y = y0; y < y0 + f.h; y++) {
        for (let x = x0; x < x0 + f.w; x++) {
          const edge = x === x0 || y === y0 || x === x0 + f.w - 1 || y === y0 + f.h - 1;
          if (edge) stamper.setTileId(x, y, wallId);
        }
      }
    }
    stamper.commitEdits();
  }

  world.stamped.push(plan);
  return plan;
}

// ── Chunk MAP DATA for sparse worlds (pure — the scene renders it) ────────────

/** A built chunk: its standalone map data + where things sit (LOCAL px on the
 *  sparse world's logical plane, i.e. the same space as ZoneStampPlan.centerPx). */
export interface BuiltChunk {
  zoneId: string;
  /** Top-left of the chunk on the sparse plane (px). */
  originLocalPx: { x: number; y: number };
  /** The zone anchor / settlement center (px). */
  centerLocalPx: { x: number; y: number };
  /** Standalone map data for this chunk (rendered as its own layer). */
  data: WashingtonMap;
  /** One gate PAD per connectsTo neighbor, on the chunk edge facing it. */
  gates: { toZoneId: string; kind: TransitionKind; localPx: { x: number; y: number } }[];
  /** Where arrivals land (south of the settlement footprint; px). */
  arrivalLocalPx: { x: number; y: number };
}

/**
 * Build ONE zone's chunk map data for a SPARSE world: a small square map filled
 * with the zone's placeholder biome tile, a walled settlement/outpost footprint
 * per kind (with a south doorway), and a gate PAD on the edge toward each
 * connected neighbor ('bridge' tiles for sea-dock crossings — the boat-door
 * placeholder — 'pass' tiles for land routes). Pure data; no Phaser.
 */
export function buildChunkMapData(zone: Zone, plan: ZoneStampPlan, calibration: WorldCalibration): BuiltChunk {
  const margin = 8; // tiles of fringe beyond the ground patch
  const half = plan.patch.radiusTiles + margin;
  const size = half * 2; // chunk is square, `size` tiles on a side
  const originLocalPx = { x: plan.centerPx.x - half * TILE_SIZE, y: plan.centerPx.y - half * TILE_SIZE };

  // Local terrain table: ground + footprint + gate pads (ids local to this map).
  const GROUND = 1;
  const WALL = 2;
  const DOOR = 3;
  const PAD_LAND = 4;
  const PAD_SEA = 5;
  const terrain: TerrainType[] = [
    { id: GROUND, key: plan.patch.tileKey, name: `${zone.region} (${zone.biome})`, color: '#888888', blocks: false },
    { id: WALL, key: 'town_building', name: 'Structure', color: '#5b3b26', blocks: true },
    { id: DOOR, key: 'town_door', name: 'Doorway', color: '#ffcf57', blocks: false },
    { id: PAD_LAND, key: 'pass', name: 'Route Marker', color: '#b7ad86', blocks: false },
    { id: PAD_SEA, key: 'bridge', name: 'Dock', color: '#a9742f', blocks: false },
  ];

  const tiles: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(GROUND));
  const put = (x: number, y: number, id: number): void => {
    if (x >= 1 && y >= 1 && x < size - 1 && y < size - 1) tiles[y][x] = id;
  };

  // Settlement/outpost footprint (walls + south doorway) at the chunk center.
  const f = plan.footprintTiles;
  const c = half; // center tile
  if (f.w > 0 && f.h > 0) {
    const x0 = c - Math.floor(f.w / 2);
    const y0 = c - Math.floor(f.h / 2);
    for (let y = y0; y < y0 + f.h; y++) {
      for (let x = x0; x < x0 + f.w; x++) {
        const edge = x === x0 || y === y0 || x === x0 + f.w - 1 || y === y0 + f.h - 1;
        if (edge) put(x, y, WALL);
      }
    }
    put(x0 + Math.floor(f.w / 2), y0 + f.h - 1, DOOR); // south doorway
  }

  // Gate pads: a 3x3 pad on the chunk edge toward each neighbor.
  const gates: BuiltChunk['gates'] = [];
  for (const t of plan.transitions) {
    const to = getZone(t.toZoneId);
    if (!to) continue;
    const toC = latLngToPixels(calibration, to.anchor);
    const ang = Math.atan2(toC.y - plan.centerPx.y, toC.x - plan.centerPx.x);
    const edge = half - 3; // pad center sits just inside the chunk edge
    const gx = Math.round(c + Math.cos(ang) * edge);
    const gy = Math.round(c + Math.sin(ang) * edge);
    const padId = t.kind === 'sea-dock' ? PAD_SEA : PAD_LAND;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(gx + dx, gy + dy, padId);
    gates.push({
      toZoneId: t.toZoneId,
      kind: t.kind,
      localPx: { x: originLocalPx.x + (gx + 0.5) * TILE_SIZE, y: originLocalPx.y + (gy + 0.5) * TILE_SIZE },
    });
  }

  const arrivalLocalPx = {
    x: plan.centerPx.x,
    y: plan.centerPx.y + (Math.max(1, Math.floor(f.h / 2)) + 2) * TILE_SIZE,
  };

  const data: WashingtonMap = {
    name: `${zone.displayName} (chunk)`,
    generated: 'runtime',
    tileSize: TILE_SIZE,
    width: size,
    height: size,
    zoneSize: size,
    zonesX: 1,
    zonesY: 1,
    terrain,
    spawn: { x: c, y: Math.min(size - 2, c + Math.max(1, Math.floor(f.h / 2)) + 2) },
    cities: [{ name: zone.displayName, tx: c, ty: c }],
    zones: [{ id: `${zone.id}-chunk`, zx: 0, zy: 0, x: 0, y: 0, width: size, height: size, tiles }],
  };

  return { zoneId: zone.id, originLocalPx, centerLocalPx: { ...plan.centerPx }, data, gates, arrivalLocalPx };
}
