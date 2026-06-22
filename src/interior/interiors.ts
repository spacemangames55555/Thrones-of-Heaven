/**
 * Data-driven building interiors. Each door in town references an interior by
 * id; adding a new enterable building is just another entry here plus a door
 * tile in the town layout — no new code.
 *
 *   # wall (solid)   . floor    B bar (solid)
 *   T table (solid)  D exit door  s player spawn
 */
export interface InteriorDef {
  id: string;
  name: string;
  rows: string[];
}

export const INTERIOR_TILE = 16;

export const INTERIORS: Record<string, InteriorDef> = {
  inn: {
    id: 'inn',
    name: 'The Wayfarer Inn',
    rows: [
      '##############',
      '#............#',
      '#.BBBB.......#',
      '#............#',
      '#....TT..TT..#',
      '#....TT..TT..#',
      '#............#',
      '#.....s......#',
      '#............#',
      '#####DD#######',
    ],
  },
};
