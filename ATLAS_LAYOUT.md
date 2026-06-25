# Terrain Tile Atlas — Layout (art handoff)

- **Tile size:** 32 x 32 px
- **Atlas grid:** 8 columns x 4 rows = **256 x 128 px**
- **Frame 0** (col 0, row 0) is RESERVED EMPTY (leave transparent).
- Terrain tiles start at **frame 1**, filling left-to-right, top-to-bottom.
- A tile`s frame = its row index in `ATLAS_TILES` (src/render/tileAtlas.ts) + 1.

| Frame | Col | Row | Terrain key | Placeholder color |
|---:|---:|---:|---|---|
| 0 | 0 | 0 | _(empty)_ | _(transparent)_ |
| 1 | 1 | 0 | `ocean` | #16335f |
| 2 | 2 | 0 | `sound` | #2f6fae |
| 3 | 3 | 0 | `river` | #3f8fcf |
| 4 | 4 | 0 | `lake` | #2b5c86 |
| 5 | 5 | 0 | `beach` | #ddca97 |
| 6 | 6 | 0 | `grassland` | #76b14e |
| 7 | 7 | 0 | `forest` | #3f7d3f |
| 8 | 0 | 1 | `rainforest` | #1f7a55 |
| 9 | 1 | 1 | `montane` | #245f37 |
| 10 | 2 | 1 | `foothills` | #8a8a52 |
| 11 | 3 | 1 | `mountain` | #e0e7ee |
| 12 | 4 | 1 | `pass` | #b7ad86 |
| 13 | 5 | 1 | `steppe` | #cdb37a |
| 14 | 6 | 1 | `scabland` | #9c8a63 |
| 15 | 7 | 1 | `farmland` | #d7c24f |
| 16 | 0 | 2 | `wetland` | #5f8d6a |
| 17 | 1 | 2 | `urban` | #9a9aa2 |
| 18 | 2 | 2 | `bridge` | #a9742f |
| 19 | 3 | 2 | `town_ground` | #7a6647 |
| 20 | 4 | 2 | `town_road` | #a8946a |
| 21 | 5 | 2 | `town_plaza` | #b8b0a0 |
| 22 | 6 | 2 | `town_building` | #5b3b26 |
| 23 | 7 | 2 | `town_inn` | #a05a2c |
| 24 | 0 | 3 | `town_door` | #ffcf57 |
| 25 | 1 | 3 | `town_tree` | #1e5233 |
| 26 | 2 | 3 | `corrupted_ground` | #2b1640 |
| 27 | 3 | 3 | `corruption_rift` | #8a2be2 |

## Swapping in real art — per-tile drop-in (the easy path, used now)

You do **not** have to author a whole atlas to ship one real tile. A real PNG can
replace a single terrain's placeholder cell, one terrain at a time (partial passes
are fine — terrains without a real tile keep their placeholder color).

**To add one real terrain tile (the entire step):**

1. **Drop the PNG** in `public/tiles/terrain/<Name>.png` (Vercel serves it at
   `/tiles/terrain/<Name>.png`). Any square pixel-art size works — it's downscaled
   into the 32px atlas cell and rendered pixel-crisp (nearest-neighbor).
2. **Add ONE line** to `TERRAIN_TILE_IMAGES` in `src/render/tileAtlas.ts`:
   ```ts
   { key: '<terrainKey>', file: 'tiles/terrain/<Name>.png' },
   ```
   where `<terrainKey>` is a terrain key from the `ATLAS_TILES` table above.

That's it — no other code changes. `preloadTerrainTiles()` (called from
`MainScene.preload()`) loads each PNG, and `generatePlaceholderAtlas()` draws it
over that terrain's cell. Collision/walkability is unaffected (it derives from the
terrain's `blocks` flag, not the visual tile).

Currently mapped real tiles:

| File (`public/tiles/terrain/`) | Terrain key | Terrain name |
|---|---|---|
| `Beachcoast.png` | `beach` | Beach / Coast |
| `Coastal_rainforest.png` | `rainforest` | Coastal Rainforest |
| `Soundinlet.png` | `sound` | Puget Sound |
| `Ocean.png` | `ocean` | Pacific Ocean |
| `River.png` | `river` | River |
| `Lake.png` | `lake` | Lake |
| `Lowland_forest.png` | `forest` | Lowland Forest |
| `Wetlandmarsh.png` | `wetland` | Wetland / Marsh |
| `Meadowgrassland.png` | `grassland` | Meadow / Grassland |
| `Shrubsteppe.png` | `steppe` | Shrub-Steppe |
| `Scabland.png` | `scabland` | Scabland / Coulee |
| `Farmlandwheat.png` | `farmland` | Palouse Farmland |
| `Evergreenmontane_forest.png` | `montane` | Montane Forest |
| `Foothills.png` | `foothills` | Foothills |
| `Alpinesnow_peak.png` | `mountain` | Alpine Peak |
| `Mountain_pass.png` | `pass` | Mountain Pass |
| `Urbantown_ground.png` | `urban` | Urban / Town |
| `Bridge.png` | `bridge` | Bridge |
| `Corruptionrift.png` | `corruption_rift` | Corruption Rift |
| `Holy_ground.png` | `holy_ground` | Heaven — Holy Ground |
| `Heaven_cloud.png` | `heaven_cloud` | Heaven — Cloud |
| `Gold_field.png` | `gold_field` | Heaven — Gold Field |
| `Heaven_path.png` | `heaven_path` | Heaven — Radiant Path |
| `Heaven_void.png` | `heaven_void` | Heaven — Cloud Edge (blocks) |
| `Charred_rock.png` | `charred_rock` | Hell — Charred Rock |
| `Ash_ground.png` | `ash_ground` | Hell — Ash |
| `Ember_rock.png` | `ember_rock` | Hell — Ember Rock |
| `Lava.png` | `lava` | Hell — Lava (blocks) |
| `Hell_void.png` | `hell_void` | Hell — Chasm (blocks) |

## Swapping the WHOLE atlas at once (alternative)

1. Paint a PNG matching this grid/order exactly: `public/tiles/terrain-atlas.png`.
2. In `src/map/GameMap.ts`, replace the `generatePlaceholderAtlas(scene, ATLAS_KEY)` call with loading that PNG as the `ATLAS_KEY` texture (e.g. preload `this.load.image(ATLAS_KEY, ...)`).
3. To re-order/add tiles, edit the `ATLAS_TILES` array in `src/render/tileAtlas.ts` only — the terrain->frame mapping derives from it.
