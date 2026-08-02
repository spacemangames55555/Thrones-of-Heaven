# Water technique bake-off — OCEAN (Art Session 5, Step 1)

**Preview (the judge):** `/water-bakeoff.html` on this branch's Vercel
deployment. Contact sheets cannot show motion, so the page runs the
candidates through the real cycler: three frames (anim-2 → anim-3 → anim-4),
450 ms each, ONE global phase shared by every tile, loop wrapping
anim-4 → anim-2, against a real beach coastline whose fringe is static —
because in the shipped renderer it is. Buttons solo each candidate, change
zoom, and fire the "stream-in flash" that shows what a newly streamed chunk
paints before the first water tick catches it.

## Recon — what the shipped renderer actually does

Read before speccing anything (`src/world/terrain-visuals.ts:190-202`,
`src/world/chunk-streamer.ts:535`):

1. **Three frames, not four.** `waterPhase = (waterPhase + 1) % 3` and
   `t.index = biome*8 + 4 + waterPhase` — the loop is anim-2 → anim-3 →
   anim-4 → anim-2 at 450 ms. The contract doc's `base → A2 → A3 → A4`
   four-frame cycle is not what ships.
2. **One global phase.** Every water tile in every live chunk is written the
   same phase on the same tick. No per-tile offset, no stagger.
3. **B0–B3 are a stream-in flash only.** A chunk paints
   `biome*8 + (moisture & 3)` at build; the next global tick overwrites every
   water tile within 450 ms and never returns to a base variant.
4. **Fringes never animate.** The 17 fringe cells are tile indices the cycler
   never touches, and the assembler cuts them from base-0 — so every coastline
   is a *static* ring around moving water.
5. Stamped tiles (`flags & 0x80`) paint index −1 and are excluded from the
   water list; authored stamps own their own water.

Consequences the sheet must serve, and which the bands below encode: A2–A4
carry the entire look; they must not "pop" against B0–B3 on stream-in; and
they must not drift from base-0, or every shoreline reads as a different
material from the water it borders.

## API surface — what is actually possible

Checked before dispatch. **No PixelLab tool generates animated,
seamlessly-tiling tiles.** `create_tiles_pro` is static-only;
`animate_image` / `animate-with-text-v3` enforces neither wrap continuity nor
loop closure. That absence is the technique question, not a detour around it.

## Bands — derived from the ten shipped sheets, not invented

`D` = mean per-pixel euclidean RGB distance. `D_var` = 13.24, the mean
pairwise distance between the four base variants of a shipped sheet: the
game's own accepted "two independent draws of one biome" difference.

| band | rule | value |
|---|---|---|
| coherence | every step ≤ 0.50 · D_var — at most half as different as two accepted variants | ≤ 6.62 |
| liveness | every step ≥ 0.10 · D_var — below this the motion is lost in the tile's own texture | ≥ 1.32 |
| loop | wrap step inside the band **and** ≤ 1.5 × largest forward step | — |
| seam | seamIndex = wrap boundary ÷ *largest* interior boundary, per frame, both axes | ≤ 8.693 (worst shipped), advisory > 1.347 (typical shipped) |
| fringe | D(base-0, A_k) ≤ D_var — the static coastline vs the moving water | ≤ 13.24 |
| spatial | mean luminance within ±20 % of OCEAN `#274b6d`, blue hue family, base spread ≤ 48 | 55.8–83.8 |

The seam metric divides by the *largest* interior boundary, not the mean: a
mean-normalised ratio is ill-conditioned on low-texture tiles (the first draft
returned NaN on grass and 31 on tundra with nothing wrong with the art).

## Candidates

| | A2–A4 made by | bases |
|---|---|---|
| **C1** | mechanical derivation (control): torus-periodic phase-shifted displacement of base-0, phases 0, 2π/3, 4π/3 | shared corrected run, seed 74003 |
| **C2** | generated phase tiles: one `create_tiles_pro` run prompting a travelling ripple cycle, best loop-triple selected | same run, seed 74002 |
| **C3** | `animate-with-text-v3` on base-0, loop pinned (`last_frame = first_frame`), 6 frames, evenly sampled | shared corrected run |

C1 and C3 share the same bases, so they differ **only** in how A2–A4 are made.

### Selection rules, fixed before the numbers existed

- **C1** — crest sharpness is solved by bisection so the *largest* of the
  three cyclic steps lands at the band centre. Amplitude is not the knob:
  nearest-neighbour sampling quantises displacement to whole pixels, so
  below ~0.5 nothing moves and just above it a block jumps together
  (bisecting amplitude gave 5.15 / 7.79 against a 6.62 ceiling). Raising
  sin to a power narrows the crest and varies how much of the tile crosses
  the rounding threshold — a continuous handle that leaves torus periodicity
  and the exact 2π/3 phase step untouched.
- **C2** — a 3-cycle visits all three pairs whatever order you play it in, so
  choosing the loop is choosing a 3-*subset*, not an ordering. Of 560 subsets,
  keep those whose three pairwise deltas all sit in band and take the smallest
  spread between them. base-0 is then the remaining tile nearest that triple's
  centroid, because base-0 is both the fringe source and the stream-in frame.
- **C3** — frames 0, 2, 4 of the pinned six-frame cycle: even sampling of a
  closed cycle, so the wrap step equals the forward steps by construction.
- **Base variants** — see "corrections" below; chosen by band, texture and
  interchangeability, not by file order.

## Results

### Temporal (the new bands)

| step | C1 | C2 | C3 | band |
|---|---|---|---|---|
| A2 → A3 | 3.21 ✅ | 3.45 ✅ | 22.79 ❌ | 1.32 – 6.62 |
| A3 → A4 | 3.12 ✅ | 3.38 ✅ | 25.32 ❌ | 1.32 – 6.62 |
| A4 → A2 (wrap) | 3.37 ✅ | 3.35 ✅ | 18.98 ❌ | 1.32 – 6.62 |
| loop closure | ✅ | ✅ | ❌ | wrap ≤ 1.5 × max forward |
| fringe coherence A2/A3/A4 | 1.82 / 1.49 / 1.63 ✅ | 2.23 / 2.46 / 1.99 ✅ | 0 / 22.79 / 18.98 ❌ | ≤ 13.24 |

### Spatial (standing policy, per frame)

| | C1 | C2 | C3 |
|---|---|---|---|
| mean luminance, 7 cells | 64.2 – 66.0 ✅ | 65.1 – 66.2 ✅ | 64.2 – 67.5 ✅ |
| dominant hue | 210 (blue) ✅ | 210 (blue) ✅ | 210 (blue) ✅ |
| inter-variant spread | 3.0 ✅ | 1.0 ✅ | 3.0 ✅ |
| seam index, worst cell | 1.48 (adv) | 1.18 | 2.17 (adv) |
| terrain lint | 0 hard, 0 advisory | 0 hard, 0 advisory | 0 hard, 0 advisory |

### C3 — why it fails, diagnosed rather than assumed

The loop pin is *perfect*: f6 vs f0 = **0.00**. The problem is the motion
itself. Consecutive generated deltas are 0.12, 22.76, 15.80, 24.60, 11.40,
13.20 — the model emits near-copies punctuated by redraws, not incremental
motion. **No 3-subset of the six generated frames fits the coherence band**,
so this is structural, not an artefact of sampling every second frame. At
~1.7–1.9 × D_var per step it would read as a cut to different water three
times a second, and its fringe coherence fails too, so every coastline would
sit against water it does not match.

## Corrections (discipline: max 2 attempts, then best-of with honest numbers)

**Attempt 1** (seed 74001) came back 4–14 % over the luminance ceiling —
*every one of its 16 tiles* was out of band, so this was a real miss, not a
selection artefact. **Attempt 2** (seed 74003) pushed darker while naming the
axes that had passed. It landed, but revealed something worth keeping:

> The run came back **bimodal**. Its first four tiles are texture-dead
> (luminance sd ≈ 1) while later tiles in the *same run* carry real ripple
> texture at the right luminance. Sessions 1–4 took "the first four tiles" —
> never doctrine, just what the scratchpad script sliced. Taking them here
> would have reported a false failure (spread 0, identical variants, and a
> flat field that mechanical derivation cannot animate at all, since
> displacing a flat field returns the same field).

Base variants are now chosen by a stated rule — in band, texture at or above
the run's median, then the four with the smallest pairwise spread — which
yields tiles 4–7: luminance 64.2 – 65.9, texture 11.7 – 15.0, spread 2.4.

Also corrected: the OCEAN anchor was first passed as `2574189` (`#27476d`)
rather than `2575213` (`#274b6d`). Every number above uses the correct anchor.

## Spend

| item | generations |
|---|---|
| base run attempt 1 (seed 74001, out of band) | 20 |
| phase run for C2 (seed 74002) | 20 |
| base run attempt 2 (seed 74003, corrected) | 20 |
| C3 `animate-with-text-v3`, 6 frames at 32×32 | 1 |
| **session total** | **61** of the 120 ceiling |

Three tile runs, at the cap; two of them are the same asset's two attempts
under correction discipline, not three separate candidates.
