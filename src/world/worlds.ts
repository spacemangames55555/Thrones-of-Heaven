import type { TerrainType, CityMarker } from '../map/mapTypes';

/**
 * Multi-world support. A WORLD is a separate map with its own tile data and
 * coordinate region; only ONE is active/rendered at a time. The set is a registry
 * (not hardcoded to two) so a new map is added by building its GameMap at a fresh
 * origin and registering a WorldRuntime — see MainScene.setupHeaven for the
 * Heaven example and travelToWorld for the transition.
 */
export type WorldId = string;

/** THE ONE EARTH — the whole terrestrial planet as a single sparse world:
 *  every generated zone AND the hand-built PNW + Nile maps (dense chunks) at
 *  their true positions. The old 'earth'(PNW-only)/'egypt'/'globe' keys are
 *  RETIRED; saves carrying them migrate (v14-v16). Heaven/Hell stay separate
 *  planes forever. */
export const WORLD_EARTH: WorldId = 'earth';
export const WORLD_HEAVEN: WorldId = 'heaven';
export const WORLD_HELL: WorldId = 'hell';

/**
 * The map surface a registered world must provide — everything world-agnostic
 * code (world swap, readout, spawns, gates) actually calls. GameMap satisfies
 * this structurally; SPARSE worlds (Europe) satisfy it with a chunked wrapper
 * (SparseWorldMap) instead of one dense tilemap.
 */
export interface WorldMapLike {
  readonly bounds: { x: number; y: number; width: number; height: number };
  readonly tileSize: number;
  /** The tile layer new spawns collide with (sparse worlds: the chunk under/nearest the player). */
  readonly layer: Phaser.Tilemaps.TilemapLayerBase;
  readonly cities: CityMarker[];
  nearestCity(worldX: number, worldY: number): { city: CityMarker; distanceTiles: number };
  terrainAtWorld(worldX: number, worldY: number): TerrainType | null;
  isBlockedAtWorld(worldX: number, worldY: number): boolean;
  nearestWalkableWorld(worldX: number, worldY: number, maxTiles?: number): { x: number; y: number };
}

/** A built, registered world: its map plus where to drop the player by default. */
export interface WorldRuntime {
  readonly id: WorldId;
  readonly map: WorldMapLike;
  /** Player-vs-terrain collider (toggled active with the world). OPTIONAL: a
   *  sparse region world with no stamped chunks yet (Africa pre-build) has none
   *  — its whole span is walkable void until zones are stamped. */
  readonly collider?: Phaser.Physics.Arcade.Collider;
  /** Fallback arrival point (world coords) when no remembered position exists. */
  readonly defaultArrival: { x: number; y: number };
}
