# Bestiary roster v1 — all nine families (Art Session 8, Step 2)

**Preview:** this branch's deployment runs the real game. All nine families
are live through Pass 10's activation funnel — six **marked** (baked rim) and
three **unmarked** (identity, no rim) coexisting in the same world, which is
the thing the amendment exists to judge.

## Road amendment (ledgered loudly)

**Batch 2 has dissolved into batch 1.** The published plan had the six
non-angelics first and the angelics second; the amendment brings all nine
now, because the unmarked ruling's real verification is rimmed and unmarked
standing in one brawl — and that should be judged before six masters lock the
look in isolation. Renumbering: **hostile-creature rows are batch 2**
(were 3), **bosses and hero enemies are batch 3** (were later).

**No escape hatch was needed.** Angelic recon found no blocker: contract
48×56 fits a master canvas comfortably, and staging goes through the same
funnel as everything else.

## Bands

**Marked (6):** the standing rim-compat band through the real `bakeRim` —
fringe share 0, ring gaps 0, min ring depth 4, no frame clipping — plus the
opacity band.

**Unmarked (3):** rim-compat is N/A, so the band is **purpose-derived and
stated**. Canon's reference is "the existing angel look", and the comparable
is the shipped `angel-divine.png` (luminance 117.3, opacity 0.423) alongside
`cherub-enemy.png` (opacity 0.290).

> **RADIANCE FLOOR: luminance ≥ 93.8** (0.8 × angel-divine). Radiance is what
> *replaces* the rim as the domain read, so an unmarked family that is not
> visibly brighter than the marked bestiary has no read at all. The marked
> lock sits at 56.8 for contrast.
> **OPACITY 0.23–0.52**, bracketing both angel comparables.

## Results — all nine pass

| family | marking | luminance | opacity | band |
|---|---|---|---|---|
| corrupted-wildlife *(the lock)* | marked | 56.8 | 0.339 | fringe 0 · gaps 0 · depth 4 ✅ |
| lesser-evil-scouts | marked | 57.9 | 0.315 | fringe 0 · gaps 0 · depth 4 ✅ |
| evil-raiders | marked | 62.6 | 0.447 | fringe 0 · gaps 0 · depth 4 ✅ |
| veil-ambushers | marked | 32.8 | 0.511 | fringe 0 · gaps 0 · depth 4 ✅ |
| hollowed-brutes | marked | 62.8 | 0.356 | fringe 0 · gaps 0 · depth 4 ✅ |
| dark-casters | marked | 30.2 | 0.399 | fringe 0 · gaps 0 · depth 4 ✅ |
| lesser-angels | **unmarked** | **171.3** | 0.276 | radiance + opacity ✅ |
| radiant-guardians | **unmarked** | **151.4** | 0.252 | radiance + opacity ✅ |
| herald-angels | **unmarked** | **174.1** | 0.242 | radiance + opacity ✅ |

The unmarked three sit at 151–174 against a marked bestiary at 30–63. They
are two to five times brighter, which is the moral inversion showing up as a
number.

Pipeline verification on the real tool: `art:rims` derived **9 sprites, 3 as
identity**; `--check` re-derives all nine byte-identically with the registry
in sync; the three unmarked outputs are **byte-equal to their masters**
(zero rim), while corrupted-wildlife and dark-casters carry **2469** and
**2049** rim pixels.

## The correction that mattered

**Four masters came back fully opaque.** Every 192×224 generation —
dark-casters and all three angelics — ignored `no_background` and returned a
solid rectangle (opacity 1.000). Attempt 2 at a 96×112 canvas with explicit
"single isolated figure cut out on empty transparent space" fixed all four.

**That also exposed a hole in my own band.** The unmarked check tested
radiance but not alpha, so all three opaque angelics initially reported PASS.
An opaque rectangle would have shipped. Opacity is now part of the unmarked
band, bracketed from the angel comparables — which is exactly the
calibrate-on-known-truth rule this session put into standing policy, applied
to the band I had just written.

Lesson for the next batch: **PixelLab drops `no_background` on large
canvases.** Generate enemy masters at ≤ ~152 px on the long edge.

## Spend

| item | generations |
|---|---|
| Step 1 style-lock candidates A and B | 2 |
| Step 2 firsts (8 — corrupted-wildlife reused the lock at 0) | 8 |
| Step 2 corrections (the four opaque masters) | 4 |
| **session total** | **14** of the 30 round cap |

## HOLD 2

Approve all / subset / reject. Unapproved families stay placeholder — the
activation registry is per-family, so dropping one is a one-line change with
no drama.
