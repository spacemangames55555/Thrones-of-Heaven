import { TownTileId } from './townTiles';

/**
 * Authored layout for the Seattle town. It is stamped onto the overworld next
 * to the Seattle city marker (see {@link TownDef.anchorCity} + offset), so the
 * town re-derives at its correct spot at any map scale — no hard-coded tile
 * coordinates — and stays a seamless part of the open world (no walls, no
 * loading screen).
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
  /** Name of the city marker the town is anchored to. */
  anchorCity: string;
  /** Tile offset of the town's top-left corner from that city marker. */
  offset: { tx: number; ty: number };
  rows: string[];
}

export const SEATTLE_TOWN: TownDef = {
  anchorCity: 'Seattle',
  offset: { tx: 2, ty: -9 },
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
export const TOWN_LEGEND: Record<string, number> = {  '.': TownTileId.ground,
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

/**
 * PORTLAND — the one real Oregon town. Built from the SAME town system as
 * Seattle (no new tech): solid buildings, one enterable inn (the 'D' door reuses
 * the existing 'inn' interior), a plaza, a spawn point, and one quest-giver-style
 * NPC ('n'). No corruption rift here — this is flavor + presence, not a quest.
 * Anchored to the Portland city marker so it lands in the Willamette Valley just
 * south of the Columbia.
 */
export const PORTLAND_TOWN: TownDef = {
  anchorCity: 'Portland',
  offset: { tx: -8, ty: -6 },
  rows: [
    '....BBB...BBB...',
    '....BBB...BBB...',
    '..t..........t..',
    '.HHHH....BBBB...',
    '.HHHH....BBBB...',
    '.HDHH....BBBB...',
    '..=.............',
    '==ooooo====.....',
    '==oosoo====.....',
    '..oooon.........',
    '...BBBB...BBB...',
    '...BBBB...BBB...',
  ],
};

/**
 * >>> EDIT THE PORTLAND NPC'S DIALOGUE HERE. <<<
 * Placeholder flavor: the Oregon townsfolk hint that the rift's corruption has
 * begun seeping south — foreshadowing the descent corridor. No quest is wired to
 * this NPC; it is presence + foreshadowing only.
 */
export const PORTLAND_NPC_LINES = [
  'Portlander: You came down the river road? Then you have seen the gates at Seattle.',
  'Portlander: It does not stay put, that sickness. The water carries it. The birds will not nest by the Willamette anymore.',
  'Portlander: Folk who can... see things... say the dark runs deeper here than up north. Like the ground itself is thinning.',
  'Portlander: If you mean to follow it down, walk south of town and keep your eyes open. Some doors only open for those already marked.',
];
