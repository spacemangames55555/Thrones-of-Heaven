import { TownTileId } from './townTiles';

/**
 * Authored layout for the Seattle town. It is stamped onto the overworld at
 * {@link SEATTLE_TOWN.origin} (tile coords on the Washington map), so the town
 * is a seamless part of the open world — no walls, no loading screen.
 *
 * Each row is a string of single-character cells (all rows must be `width`
 * long). Characters map to tiles via {@link TOWN_LEGEND}; a few also mark
 * feature points (door, npc, rift, spawn) that the TownBuilder turns into world
 * positions.
 *
 *   . ground   = road    o plaza   s spawn (plaza)
 *   B building H inn      D door    t tree
 *   x corrupted ground    R rift core   n npc
 */
export interface TownDef {
  /** Top-left tile of the town on the Washington map. */
  origin: { tx: number; ty: number };
  rows: string[];
}

export const SEATTLE_TOWN: TownDef = {
  origin: { tx: 96, ty: 41 },
  rows: [
    '.....BBB..==..BBB..t..',
    '.....BBB..==..BBB.....',
    '....t.....==.....t....',
    '.HHHH.....==..BBB.....',
    '.HHHH.....==..BBB.....',
    '.HHHH.....==..BBB.....',
    '.HDHH.....==..........',
    '..=.......==.....xxxx.',
    '========ooooo====xxRx.',
    '========oosoo====xxxx.',
    '........oooon....xxxx.',
    '..........==......xxx.',
    '...BBBB...==..BBBB....',
    '...BBBB...==..BBBB....',
    '...BBBB...==..BBBB....',
    '..t.......==......t...',
    '..........==..........',
    '..........==..........',
  ],
};

/** Map a layout character to the tile id painted underneath it. */
export const TOWN_LEGEND: Record<string, number> = {
  '.': TownTileId.ground,
  '=': TownTileId.road,
  o: TownTileId.plaza,
  s: TownTileId.plaza,
  n: TownTileId.ground,
  B: TownTileId.building,
  H: TownTileId.inn,
  D: TownTileId.door,
  t: TownTileId.tree,
  x: TownTileId.corrupted,
  R: TownTileId.rift,
};
