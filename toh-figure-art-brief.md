# Thrones of Heaven — Class Figure Art Brief

This is the complete recipe for dropping in player-character art. Follow it
exactly and the art appears in the game with **zero code written by you** —
the pipeline fits, sizes, and wires everything at boot. Three classes already
shipped this way (Necromancer, Bard, Hunter); this brief is written from how
those sets behave in the engine.

## The one rule that matters most

**File names come from the table below — never from the class name.**
Three classes have historical texture keys that don't match their class id
(Blacksmith, Necromancer, Sundian). Guessing a folder name will silently miss.

## Per-class folders and filenames

Each class gets ONE folder under `public/sprites/`, named with its **texture
key**, containing EXACTLY these 8 files:

```
south.png   south-east.png   east.png   north-east.png
north.png   north-west.png   west.png   south-west.png
```

| Class (as shown in game) | Folder to create | Status |
|---|---|---|
| Blacksmith | `public/sprites/player-figure/` | needs art |
| Wizard | `public/sprites/wizard-figure/` | needs art |
| Necromancer | `public/sprites/necro-figure/` | ✅ shipped |
| Druid | `public/sprites/druid-figure/` | needs art |
| Mage | `public/sprites/mage-figure/` | needs art |
| Bard | `public/sprites/bard-figure/` | ✅ shipped |
| Witch Doctor | `public/sprites/witchdoctor-figure/` | needs art |
| Samurai | `public/sprites/samurai-figure/` | needs art |
| Monk | `public/sprites/monk-figure/` | needs art |
| Assassin | `public/sprites/assassin-figure/` | needs art |
| Priest | `public/sprites/priest-figure/` | needs art |
| Savage | `public/sprites/savage-figure/` | needs art |
| Hunter | `public/sprites/hunter-figure/` | ✅ shipped |
| Sundian | `public/sprites/sundian-figure/` | needs art |

(These names come from `textureForClass` in `src/entities/Player.ts` — the
single source of truth. Note the three that differ from their class name:
Blacksmith → `player-figure`, Necromancer → `necro-figure`, Sundian →
`sundian-figure`.)

## What each frame must look like

- **One single figure, centered, on a fully transparent background.** Nothing
  else in the frame — no ground shadow, no glow, no border. The game draws
  shadows and effects itself.
- **Square masters, 128–256 px.** The shipped sets use 244×244. Any size
  works — the engine crops to the figure and fits it into its 32×48 in-game
  frame automatically — but bigger than ~256 buys nothing.
- **The 8 files are the same character seen from 8 compass directions**,
  high top-down view (like the shipped sets). `south.png` faces the camera —
  it's the frame players see most, and it becomes the standing pose.
- **Pixel-art style with a dark outline**, matching the three shipped sets:
  crisp 1px-ish dark edges, readable at thumbnail size, mid-saturation colors.
  No baked-in lighting from a hard angle — soft, front-lit, like the Bard.

## The consistent-bounds rule (why a set can fail)

The engine sizes all 8 frames **together**: it finds the box that contains the
figure in every frame, and scales that shared box into the game. If one frame
is drawn much bigger than the rest (a huge weapon sweep, a wing flare), every
OTHER frame shrinks to make room for it — the character visibly pulses small.

The build enforces this: every frame's figure must be at least **half the
width** and **85% of the height** of the largest frame in its set. The three
shipped sets pass with room to spare (their heights never differ by more than
5%). Practically: keep the character the same height in all 8 frames, and
don't let any one pose sprawl.

## What makes the build reject a drop

The automated gate (which runs before every release) fails loudly if:

- any of the 8 files is missing or misnamed (the **art census** — a declared
  set with a missing file can never ship silently);
- a frame is fully transparent (empty);
- a frame breaks the consistent-bounds rule above;
- the files exist but the wiring lines (below) weren't added — or vice versa.

## Wiring (2 lines, lands in the SAME commit as the files)

Whoever lands the drop adds, in the same commit:

1. One row in `SPRITE_OVERRIDES` (`src/render/spriteOverrides.ts`):
   `{ key: '<texture-key>', w: 32, h: 48, rotations: true },`
2. One entry in `ROTATED_FIGURES` (`tools/verify-runtime.mjs`):
   `<classId>: '<texture-key>',`

That's the entire integration. The avatar then turns with movement
automatically, and the gate's figure checks cover the new set from the next
run onward.

## Also fine: a single still

A class can ship ONE image instead of eight: put it at
`public/sprites/<texture-key>.png` (no folder) and use the same
`SPRITE_OVERRIDES` row **without** `rotations: true`. The figure won't turn,
but the art shows. Upgrading to 8-way later is just adding the folder and
flipping the row.

## Not supported (yet)

Walk/run animation frames. The engine shows one static image per direction.
Animation sets (like the Bard's "Running" frames) are safely ignored until a
walk-cycle framework is built — it's on the deferred ledger.
