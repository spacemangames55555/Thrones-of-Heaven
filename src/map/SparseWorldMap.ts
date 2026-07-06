import Phaser from 'phaser';
import type { GameMap } from './GameMap';
import type { TerrainType, CityMarker } from './mapTypes';
import type { WorldMapLike } from '../world/worlds';

/**
 * A SPARSE region world's map: a huge logical plane (Europe ≈ 121,300 ×
 * 83,400 px) where only STAMPED ZONE CHUNKS materialize — each chunk is its
 * own small GameMap layer at its offset (the technique the nested city
 * sub-maps proved). The empty span between chunks is cheap walkable void
 * (just the camera background; no tiles, no colliders, no allocation).
 *
 * Implements {@link WorldMapLike}, so the world registry / world swap /
 * readout / spawn sites treat it exactly like a dense GameMap:
 *   • terrain queries delegate to the chunk containing the point (void = open
 *     ground, walkable),
 *   • `layer` (what fresh spawns collide with) resolves to the chunk under —
 *     or nearest to — the follow point (the player),
 *   • nearestCity searches every chunk's markers, so the readout names the
 *     zone you're in or approaching.
 */
export class SparseWorldMap implements WorldMapLike {
  readonly tileSize: number;
  private readonly origin: { x: number; y: number };
  private readonly sizePx: { w: number; h: number };
  private readonly chunks: GameMap[];
  private readonly focus: () => { x: number; y: number };

  /** Optional VOID-ground blocker (the ground layer's water): consulted for
   *  points on no chunk. Absent = the whole void is walkable (legacy). */
  private readonly isVoidBlocked?: (worldX: number, worldY: number) => boolean;

  constructor(
    origin: { x: number; y: number },
    sizePx: { w: number; h: number },
    chunks: GameMap[],
    focus: () => { x: number; y: number },
    isVoidBlocked?: (worldX: number, worldY: number) => boolean,
  ) {
    this.isVoidBlocked = isVoidBlocked;
    // ZERO chunks is legal: a region world can register before any zone is
    // stamped (Africa pre-build) — its whole span is walkable void until then.
    this.origin = origin;
    this.sizePx = sizePx;
    this.chunks = chunks;
    this.focus = focus;
    this.tileSize = chunks[0]?.tileSize ?? 32;
  }

  get bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.origin.x, y: this.origin.y, width: this.sizePx.w, height: this.sizePx.h };
  }

  /** The chunk whose bounds contain the point, if any. */
  private chunkAt(worldX: number, worldY: number): GameMap | null {
    for (const c of this.chunks) {
      const b = c.bounds;
      if (worldX >= b.x && worldX < b.x + b.width && worldY >= b.y && worldY < b.y + b.height) return c;
    }
    return null;
  }

  /** The chunk under the follow point, else the nearest one (for spawn colliders). */
  get layer(): Phaser.Tilemaps.TilemapLayerBase {
    if (this.chunks.length === 0) throw new Error('SparseWorldMap.layer: no chunks stamped yet (nothing spawns in an empty region world)');
    const p = this.focus();
    const here = this.chunkAt(p.x, p.y);
    if (here) return here.layer;
    let best = this.chunks[0];
    let bestD = Infinity;
    for (const c of this.chunks) {
      const b = c.bounds;
      const d = Phaser.Math.Distance.Between(p.x, p.y, b.x + b.width / 2, b.y + b.height / 2);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best.layer;
  }

  terrainAtWorld(worldX: number, worldY: number): TerrainType | null {
    return this.chunkAt(worldX, worldY)?.terrainAtWorld(worldX, worldY) ?? null;
  }

  /** Void between chunks is WALKABLE ground — except where the ground layer
   *  says WATER (out of the whole span always blocks). */
  isBlockedAtWorld(worldX: number, worldY: number): boolean {
    const b = this.bounds;
    if (worldX < b.x || worldY < b.y || worldX > b.x + b.width || worldY > b.y + b.height) return true;
    const chunk = this.chunkAt(worldX, worldY);
    return chunk ? chunk.isBlockedAtWorld(worldX, worldY) : this.isVoidBlocked?.(worldX, worldY) ?? false;
  }

  nearestWalkableWorld(worldX: number, worldY: number, maxTiles = 10): { x: number; y: number } {
    const chunk = this.chunkAt(worldX, worldY);
    if (chunk) return chunk.nearestWalkableWorld(worldX, worldY, maxTiles);
    return { x: worldX, y: worldY }; // void is walkable
  }

  /** Union of every chunk's markers, in WORLD-tile coordinates (readout use). */
  get cities(): CityMarker[] {
    const all: CityMarker[] = [];
    for (const c of this.chunks) {
      for (const m of c.cities) {
        const p = c.tileToWorldCenter(m.tx, m.ty);
        all.push({ name: m.name, tx: Math.round(p.x / this.tileSize), ty: Math.round(p.y / this.tileSize) });
      }
    }
    return all;
  }

  nearestCity(worldX: number, worldY: number): { city: CityMarker; distanceTiles: number } {
    const tx = worldX / this.tileSize;
    const ty = worldY / this.tileSize;
    const cities = this.cities;
    let best = cities[0];
    let bestDist = Infinity;
    for (const city of cities) {
      const d = Math.hypot(city.tx - tx, city.ty - ty);
      if (d < bestDist) {
        bestDist = d;
        best = city;
      }
    }
    return { city: best, distanceTiles: bestDist };
  }
}
