import Phaser from 'phaser';
import type { WashingtonMap, TerrainType, CityMarker, TileCoord } from './mapTypes';
import { TILE_SIZE, atlasFrameForKey, generatePlaceholderAtlas } from '../render/tileAtlas';

const ATLAS_KEY = 'terrain-atlas';

/**
 * Builds the renderable Washington map from the authored JSON:
 *
 *  1. Stitches the zone chunks back into one full tile grid.
 *  2. Renders from a 32x32 TILE ATLAS (see src/render/tileAtlas.ts) via a
 *     terrain → atlas-frame mapping, instead of a flat color per type.
 *  3. Creates a single GPU tilemap layer (Phaser 4 TilemapGPULayer) for the
 *     whole state, and marks blocking terrain for Arcade Physics collision.
 *
 * Tile data stores the atlas frame per cell (frame 0 is the reserved empty
 * tile); the terrain → frame mapping lives in tileAtlas.ts.
 */
export class GameMap {
  readonly data: WashingtonMap;
  readonly tileSize: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  /** World-space origin of this map's top-left corner (lets separate worlds live
   *  in disjoint coordinate regions; defaults to 0,0 — the Earth map). */
  readonly originX: number;
  readonly originY: number;
  /** Force the CPU TilemapLayer (instead of the GPU layer) for this map. */
  private readonly forceCpuLayer: boolean;
  readonly layer: Phaser.Tilemaps.TilemapLayerBase;
  /** Atlas frames that block movement, for re-marking collision after edits. */
  readonly blockingFrames: number[];

  private readonly terrainById: Map<number, TerrainType>;
  /** Every tile type, base terrain plus any extra (town) tiles. */
  private readonly allTiles: TerrainType[];
  /** terrain id -> atlas frame (tile index in the atlas). */
  private readonly idToFrame: Map<number, number>;
  /** Full grid of raw terrain ids, indexed [y][x], for terrain queries. */
  private readonly grid: number[][];

  /**
   * @param extraTiles Additional tile types (e.g. town tiles) whose terrain
   *   keys also have atlas tiles, so features can be stamped onto the same GPU
   *   layer later via {@link setTileId}.
   * @param origin World-space offset for this map (default 0,0). A second world
   *   (Heaven) is built at a large offset so the two never overlap.
   */
  constructor(
    scene: Phaser.Scene,
    data: WashingtonMap,
    extraTiles: TerrainType[] = [],
    origin: { x: number; y: number } = { x: 0, y: 0 },
    opts: { forceCpuLayer?: boolean } = {},
  ) {
    if (data.tileSize !== TILE_SIZE) {
      throw new Error(`Map tileSize ${data.tileSize} != atlas TILE_SIZE ${TILE_SIZE}`);
    }
    this.data = data;
    this.tileSize = data.tileSize;
    this.pixelWidth = data.width * data.tileSize;
    this.pixelHeight = data.height * data.tileSize;
    this.originX = origin.x;
    this.originY = origin.y;
    this.forceCpuLayer = opts.forceCpuLayer ?? false;
    this.allTiles = [...data.terrain, ...extraTiles];
    this.terrainById = new Map(this.allTiles.map((t) => [t.id, t]));
    this.idToFrame = new Map(this.allTiles.map((t) => [t.id, atlasFrameForKey(t.key)]));
    this.blockingFrames = this.allTiles.filter((t) => t.blocks).map((t) => this.idToFrame.get(t.id)!);

    this.grid = GameMap.stitchZones(data);
    // Generate the shared atlas ONCE: a second world (Heaven) reuses the same
    // atlas (it holds every terrain key), and regenerating would remove the
    // texture the first map's layer already references. (Swap for a real PNG to ship art.)
    if (!scene.textures.exists(ATLAS_KEY)) generatePlaceholderAtlas(scene, ATLAS_KEY);
    this.layer = this.buildLayer(scene, data);
  }

  /** This map's world-space bounds rectangle (origin + pixel size). */
  get bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.originX, y: this.originY, width: this.pixelWidth, height: this.pixelHeight };
  }

  /** Reassemble the zone chunks into a single [y][x] grid of terrain ids. */
  private static stitchZones(data: WashingtonMap): number[][] {
    const grid: number[][] = Array.from({ length: data.height }, () =>
      new Array<number>(data.width).fill(0),
    );
    for (const zone of data.zones) {
      for (let y = 0; y < zone.height; y++) {
        const row = zone.tiles[y];
        for (let x = 0; x < zone.width; x++) {
          grid[zone.y + y][zone.x + x] = row[x];
        }
      }
    }
    return grid;
  }

  private buildLayer(scene: Phaser.Scene, data: WashingtonMap): Phaser.Tilemaps.TilemapLayerBase {
    // Each cell stores its atlas frame (terrain key -> frame via the mapping).
    const layerData = this.grid.map((row) => row.map((id) => this.idToFrame.get(id)!));

    const map = scene.make.tilemap({
      data: layerData,
      tileWidth: data.tileSize,
      tileHeight: data.tileSize,
    });

    const tileset = map.addTilesetImage('terrain', ATLAS_KEY, data.tileSize, data.tileSize);
    if (!tileset) throw new Error('Failed to add terrain tileset');

    // Use the GPU layer when WebGL is available (the whole state in one quad);
    // fall back to the CPU layer on the rare Canvas-only device.
    //
    // EXCEPTION: a map at a non-zero world ORIGIN (e.g. the Heaven world, built at
    // an offset so it never overlaps Earth) MUST use the CPU layer. Phaser 4.2's
    // GPU tilemap submitter double-applies the layer's x/y offset (it passes the
    // world-space quad corners AND multiplies by a matrix already translated by
    // x/y), so a GPU layer at offset X renders at 2X — off-screen, leaving the
    // camera background showing through. The CPU TilemapLayer positions correctly.
    const useGpu = !this.forceCpuLayer && scene.game.renderer.type === Phaser.WEBGL;
    const layer = map.createLayer(0, tileset, this.originX, this.originY, useGpu);
    if (!layer) throw new Error('Failed to create tilemap layer');

    // Mark blocking terrain (their atlas frames) as collidable.
    layer.setCollision(this.blockingFrames);

    return layer;
  }

  // --- Runtime edits (used to stamp the town onto the overworld) -------------

  /** Overwrite one tile's terrain id, in both the query grid and the layer. */
  setTileId(tx: number, ty: number, id: number): void {
    if (tx < 0 || ty < 0 || tx >= this.data.width || ty >= this.data.height) return;
    this.grid[ty][tx] = id;
    this.layer.putTileAt(this.idToFrame.get(id)!, tx, ty);
  }

  /**
   * Push pending tile edits to the GPU and re-mark collision so newly stamped
   * blocking tiles (buildings, rift) actually stop the player. Call once after
   * a batch of {@link setTileId} edits.
   */
  commitEdits(): void {
    const gpuLayer = this.layer as Phaser.Tilemaps.TilemapLayerBase & {
      generateLayerDataTexture?: () => void;
    };
    gpuLayer.generateLayerDataTexture?.();
    this.layer.setCollision(this.blockingFrames);
  }

  // --- Queries --------------------------------------------------------------

  worldToTile(worldX: number, worldY: number): TileCoord {
    return {
      x: Math.floor((worldX - this.originX) / this.tileSize),
      y: Math.floor((worldY - this.originY) / this.tileSize),
    };
  }

  tileToWorldCenter(tx: number, ty: number): { x: number; y: number } {
    return {
      x: tx * this.tileSize + this.tileSize / 2 + this.originX,
      y: ty * this.tileSize + this.tileSize / 2 + this.originY,
    };
  }

  terrainAtTile(tx: number, ty: number): TerrainType | null {
    if (tx < 0 || ty < 0 || tx >= this.data.width || ty >= this.data.height) return null;
    return this.terrainById.get(this.grid[ty][tx]) ?? null;
  }

  terrainAtWorld(worldX: number, worldY: number): TerrainType | null {
    const { x, y } = this.worldToTile(worldX, worldY);
    return this.terrainAtTile(x, y);
  }

  /** True if the tile at this world point blocks movement (out-of-bounds counts as blocked). */
  isBlockedAtWorld(worldX: number, worldY: number): boolean {
    const terrain = this.terrainAtWorld(worldX, worldY);
    return terrain === null || terrain.blocks;
  }

  /**
   * Snap a world point to the nearest WALKABLE tile so dropped items / spawns
   * never land where the player physically can't reach them. If the point is
   * already walkable it is returned unchanged (keeps the natural drop spread);
   * otherwise a spiral search returns the nearest non-blocking tile's center
   * (falling back to the original point if none is found within `maxTiles`).
   */
  nearestWalkableWorld(worldX: number, worldY: number, maxTiles = 10): { x: number; y: number } {
    if (!this.isBlockedAtWorld(worldX, worldY)) return { x: worldX, y: worldY };
    const { x: cx, y: cy } = this.worldToTile(worldX, worldY);
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let r = 1; r <= maxTiles; r++) {
      for (let ty = cy - r; ty <= cy + r; ty++) {
        for (let tx = cx - r; tx <= cx + r; tx++) {
          // Only the ring at Chebyshev distance r (interior already scanned).
          if (Math.max(Math.abs(tx - cx), Math.abs(ty - cy)) !== r) continue;
          const terrain = this.terrainAtTile(tx, ty);
          if (!terrain || terrain.blocks) continue;
          const c = this.tileToWorldCenter(tx, ty);
          const d = Phaser.Math.Distance.Between(worldX, worldY, c.x, c.y);
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
      }
      if (best) return best; // nearest walkable in this ring wins
    }
    return { x: worldX, y: worldY };
  }

  get spawnWorld(): { x: number; y: number } {
    return this.tileToWorldCenter(this.data.spawn.x, this.data.spawn.y);
  }

  get cities(): CityMarker[] {
    return this.data.cities;
  }

  /** Nearest city to a world position (for the debug readout). */
  nearestCity(worldX: number, worldY: number): { city: CityMarker; distanceTiles: number } {
    const { x: tx, y: ty } = this.worldToTile(worldX, worldY);
    let best = this.data.cities[0];
    let bestDist = Infinity;
    for (const city of this.data.cities) {
      const d = Math.hypot(city.tx - tx, city.ty - ty);
      if (d < bestDist) {
        bestDist = d;
        best = city;
      }
    }
    return { city: best, distanceTiles: bestDist };
  }
}
