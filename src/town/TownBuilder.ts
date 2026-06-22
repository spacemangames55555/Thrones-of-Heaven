import type { GameMap } from '../map/GameMap';
import { SEATTLE_TOWN, TOWN_LEGEND, type TownDef } from './townData';

export interface DoorFeature {
  /** Door tile center, in world pixels. */
  x: number;
  y: number;
  /** Where the player is placed when they come back out (just outside). */
  returnX: number;
  returnY: number;
  /** Which interior this door leads to. */
  interiorId: string;
}

export interface TownFeatures {
  spawn: { x: number; y: number };
  doors: DoorFeature[];
  npc: { x: number; y: number };
  rift: { x: number; y: number };
  /** Top-center of the town, for a name label. */
  label: { x: number; y: number; text: string };
}

/**
 * Stamps an authored town onto the overworld GameMap (replacing whatever
 * terrain was there) and returns the world positions of its interactive
 * features. Adding another town later is pure data: a new {@link TownDef}.
 */
export function buildTown(map: GameMap, town: TownDef = SEATTLE_TOWN): TownFeatures {
  const { origin, rows } = town;
  const width = rows[0].length;

  const doors: DoorFeature[] = [];
  let spawn = map.tileToWorldCenter(origin.tx, origin.ty);
  let npc = spawn;
  let rift = spawn;

  for (let row = 0; row < rows.length; row++) {
    const line = rows[row];
    if (line.length !== width) {
      throw new Error(`Town row ${row} is ${line.length} wide, expected ${width}`);
    }
    for (let col = 0; col < width; col++) {
      const ch = line[col];
      const tileId = TOWN_LEGEND[ch];
      if (tileId === undefined) throw new Error(`Unknown town cell '${ch}' at ${col},${row}`);

      const tx = origin.tx + col;
      const ty = origin.ty + row;
      map.setTileId(tx, ty, tileId);

      const world = map.tileToWorldCenter(tx, ty);
      switch (ch) {
        case 's':
          spawn = world;
          break;
        case 'n':
          npc = world;
          break;
        case 'R':
          rift = world;
          break;
        case 'D': {
          const outside = map.tileToWorldCenter(tx, ty + 1); // one tile into town
          doors.push({
            x: world.x,
            y: world.y,
            returnX: outside.x,
            returnY: outside.y,
            interiorId: 'inn',
          });
          break;
        }
      }
    }
  }

  // Push the tile edits to the GPU and re-mark collision for buildings/rift.
  map.commitEdits();

  const labelTile = map.tileToWorldCenter(origin.tx + Math.floor(width / 2), origin.ty);
  return {
    spawn,
    doors,
    npc,
    rift,
    label: { x: labelTile.x, y: labelTile.y - map.tileSize, text: 'Seattle' },
  };
}
