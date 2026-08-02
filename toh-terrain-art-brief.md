# Thrones of Heaven — Terrain Art Brief

This is the complete recipe for dropping in world-terrain art. Follow it
exactly and the art appears in the game with **zero code written by you** —
the pipeline probes the drop paths at boot, validates each file, and
activates whatever it finds. Everything you have NOT dropped yet stays on
the built-in procedural placeholder, per biome and per prop, so you can ship
one biome at a time.

## The one rule that matters most

**Sizes are exact and file names come from the tables below.** A sheet that
isn't exactly 256×128, or a prop that isn't its exact contract size, is
rejected at boot (with a console warning) and that biome/prop stays on the
placeholder. Run `npm run lint:terrain-art` after every drop — it tells you
precisely what's wrong before you ever boot the game.

## Biome sheets — `public/art/terrain/{biome}.png`

One PNG per biome, **exactly 256×128**: an 8×4 grid of 32×32 px cells.
The twelve file names (all lowercase, no other names work):

```
ocean.png  freshwater.png  beach.png  grass.png  savanna.png  desert.png
forest.png  taiga.png  tundra.png  snow.png  rock.png  swamp.png
```

### The 8×4 cell layout

| | col 0 | col 1 | col 2 | col 3 | col 4 | col 5 | col 6 | col 7 |
|---|---|---|---|---|---|---|---|---|
| **row 0** | base-0 | base-1 | base-2 | base-3 | anim-2 | anim-3 | anim-4 | *(reserved)* |
| **row 1** | edge-n | edge-e | edge-s | edge-w | corner-out-ne | corner-out-se | corner-out-sw | corner-out-nw |
| **row 2** | corner-in-ne | corner-in-se | corner-in-sw | corner-in-nw | cap-open-n | cap-open-e | cap-open-s | cap-open-w |
| **row 3** | island | *(unused)* | *(unused)* | *(unused)* | *(unused)* | *(unused)* | *(unused)* | *(unused)* |

- **base-0..3** — four fully-opaque ground variants. The engine picks one per
  tile deterministically; four subtle variants is what kills visible tiling.
  Keep them interchangeable (same palette, same lighting), not four different
  grounds.
- **anim-2..4** — three more fully-opaque frames. For **ocean and
  freshwater** these are the water animation. Make them the same water with
  the highlights displaced (a slow shimmer, not a current). For land biomes
  the cells are ignored — leave them empty or copy base-0.

  **The cycle is THREE frames, not four** (corrected against the shipped
  renderer, Art Session 5 — this doc previously described a four-frame
  `base-variant → anim-2 → anim-3 → anim-4` cycle that has never been what
  ships). `src/world/terrain-visuals.ts` runs
  `waterPhase = (waterPhase + 1) % 3` and writes
  `t.index = biome*ATLAS_STRIDE + 4 + waterPhase`, so the real cycle is:

  > **anim-2 → anim-3 → anim-4 → anim-2**, 450 ms per step
  > (`WATER_ANIM_MS`), with **one global phase** written to every water tile
  > in every live chunk on the same tick — no per-tile offset or stagger.

  Three things follow, and they are what the art has to serve:

  1. **base-0..3 are a stream-in flash on water.** A chunk paints
     `biome*ATLAS_STRIDE + (moisture & 3)` when it is built; the next global
     tick overwrites every water tile within 450 ms and never returns to a
     base variant. The base cells still matter — they are what a newly
     streamed chunk shows for that instant — but they carry none of the look.
  2. **The loop wraps anim-4 → anim-2.** There is no rest frame. Whatever
     closes the cycle has to close it between those two cells.
  3. **Fringe cells never animate.** The cycler only touches the water tiles'
     own indices, so the 17 transition pieces are static — every coastline is
     a still ring around moving water. This is why the water bands include
     **fringe coherence** (see docs/art-pipeline.md): the anim frames must
     stay within `D_var` of base-0, which is what the fringes are cut from.

  A four-frame cycle, or animated fringes, would both be real improvements —
  and both are **renderer changes**, so they are amendment territory with
  their own ceremony, not something an art drop may assume.
- **row 1–3 fringe cells** — the autotile transition pieces. Each is **this
  biome's ground spilling over a neighboring tile**, drawn as a partial mask:
  opaque where this biome overhangs, fully transparent elsewhere. The engine
  draws them on top of the neighbor's base tile. `edge-n` means "I am the
  tile to the NORTH, lapping downward onto you" — the opaque part hugs the
  cell's top edge and dissolves ~12 px in. Corners-out wrap two adjacent
  edges; corners-in are small nubs for diagonal-only contact; cap-open-X
  wraps three edges leaving X open; island wraps all four.
- A fringe cell that is fully opaque or fully empty is a **hard lint
  failure** — fringes are partial masks by definition.
- Which biome fringes over which is fixed priority, low → high:
  `OCEAN, FRESHWATER, BEACH, DESERT, SAVANNA, GRASS, SWAMP, TUNDRA, TAIGA,
  FOREST, SNOW, ROCK` — higher laps onto lower. Draw each biome's fringes to
  look right over its usual lower neighbors (beach fringes sit on ocean,
  forest fringes sit on grass, snow fringes sit on rock…).

## Scatter props — `public/art/terrain/props/{id}.png`

Free-standing doodads scattered over wild terrain, **exact sizes**, single
object centered at the bottom of the frame (the engine anchors the base of
the sprite to the ground point), transparent background, no baked shadow:

| File | Size (px) | Used on |
|---|---|---|
| `tree-fir-a.png`, `tree-fir-b.png` | 48×64 | taiga, forest |
| `tree-broad-a.png`, `tree-broad-b.png` | 48×64 | forest |
| `swamp-tree-a.png`, `swamp-tree-b.png` | 48×64 | swamp |
| `boulder-a.png`, `boulder-b.png` | 32×32 | rock |
| `cactus-a.png` | 32×48 | desert |
| `scrub-a.png` | 32×32 | desert |
| `waystone.png` | 32×64 | reserved (waystone pillars — future drop) |

Style matches the figure sets: pixel-art, crisp dark outline, mid-saturation,
soft front lighting, readable at half size.

## The magenta-key workflow (PixelLab)

If your tool exports on a solid background instead of transparency, export on
**exact magenta (255, 0, 255)** and run the converter — it keys every exact
magenta pixel to transparent and drops the result into the live art folder:

```
npm run convert:terrain -- path/to/raw-export
npm run lint:terrain-art
```

The converter only touches exact magenta, so don't anti-alias edges into the
background — keep them hard against the key color.

## What happens at boot

1. The engine probes all 12 sheet paths and all prop paths. 404s are normal —
   that's the "no art yet" state.
2. Each found file is validated (exact size). Valid sheets are composited
   into the terrain atlases **per biome**; valid props replace their
   placeholder texture **per file**. Everything else keeps the procedural
   look.
3. Already-streamed terrain repaints once. No cache to clear, no build step —
   drop the file, reload the page.

## Checklist per drop

- [ ] File name exactly from the tables, in `public/art/terrain/` (sheets) or
  `public/art/terrain/props/` (props)
- [ ] Sheet 256×128 / prop at its exact contract size
- [ ] Base + anim cells fully opaque; fringe cells partial masks
- [ ] No magenta left (use `npm run convert:terrain` for keyed exports)
- [ ] `npm run lint:terrain-art` exits clean
- [ ] Reload the game — the biome/prop is live; everything else unchanged
