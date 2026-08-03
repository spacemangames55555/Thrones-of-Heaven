# Bestiary opening — enemy style lock (Art Session 8, Step 0 + 1)

**Preview:** `/enemy-lock.html` on this branch. Static row (3 candidates × 3
domains over live biomes, 1×–4×) and a combat pocket (nine mixed-domain
enemies in motion at phone width). **Every sprite was rimmed by the real
`art:rims` baker** with tints read from the real domain table — the shipping
pipeline, not a mock.

## Step 0 — roster rank by encounter reach

Reach = zones referencing the family × its pack size. Sizes are the manifest
rows, read not re-declared.

| # | family | size | domain | zones | pack | reach |
|---|---|---|---|---|---|---|
| 1 | corrupted-wildlife | 24×34 | physical | 21 | 6 | **126** |
| 2 | lesser-evil-scouts | 30×38 | physical | 15 | 5 | **75** |
| 3 | evil-raiders | 24×34 | physical | 7 | 5 | 35 |
| 4 | lesser-angels | 48×56 | spiritual | 7 | 5 | 35 |
| 5 | radiant-guardians | 48×56 | spiritual | 7 | 5 | 35 |
| 6 | veil-ambushers | 24×34 | mental | 7 | 5 | 35 |
| 7 | dark-casters | 48×56 | mental | 6 | 5 | 30 |
| 8 | herald-angels | 48×56 | spiritual | 0* | 3 | 0* |
| 9 | hollowed-brutes | 24×34 | spiritual | 0* | 2 | 0* |

\* **Reach 0 does not mean never met.** These two spawn through bespoke paths
(`spawnEuropeBrute`, the herald spawner) rather than `enemyFamily:` zone
markers, so the marker count undercounts them. They are late in the plan
because their pack sizes are the smallest, not because players never see them.

### A finding that changes the batch plan — the angelic families

`spawnRegionEnemy` gives the three angelic families (`lesser-angels`,
`radiant-guardians`, `herald-angels`) their texture but **no `setBaseTint`**:

> `// ANGELIC families keep their existing angel look — canon says no domain`
> `// tint on them (their EXISTING_FAMILY_DOMAIN entry gates spawning only).`

But `art:rims` bakes a rim from `EXISTING_FAMILY_DOMAIN`, and all three DO
have entries there (`spiritual`). So painting masters for them would bake a
spiritual rim onto families from which canon has **deliberately withheld
domain marking** — a canon change smuggled in as an art drop.

**I have not decided this.** Batch 1 is the six non-angelic families, and the
angelic question is raised for a ruling rather than answered. The options as I
see them: mark them like everything else (simplest, but overrides the existing
canon note), keep them unrimmed with masters only (needs a per-family opt-out
in the baker), or leave them on placeholders until the ruling.

### The full road to a complete bestiary

| session | families | why |
|---|---|---|
| **batch 1 (this one)** | corrupted-wildlife, lesser-evil-scouts, evil-raiders, veil-ambushers, dark-casters, hollowed-brutes | every non-angelic family — 266 of the ranked reach, and the whole ground bestiary in one pass |
| batch 2 | the 3 angelic families | blocked on the domain-marking ruling above |
| batch 3 | hostile creature rows (townsfolk, demon-enemy, spirit-swarmer, flaming-sword, sasquatch, cairo-keeper, angel-enemy) | same brief, unfenced since Session 7, but not `enemyFamily` rows — they need their own size/spawn recon |
| later | bosses and hero enemies | 128px set-piece sessions, explicitly out of scope here |

Six families in batch 1 is well inside the ≤12 cap and needs no split.

## The RIM-COMPAT band, calibrated on the synthetic path first

`art:rims` treats **any nonzero alpha as body**. So a master with a soft or
anti-aliased edge pushes the rim outward from its faintest fringe pixel — the
ring ends up wrapping a halo instead of the creature. Three measures, all
taken through the real `bakeRim`:

| measure | rule |
|---|---|
| **fringe share** | opaque pixels with alpha < 250, as a fraction. Hard-edged pixel art is 0 |
| **ring gaps** | boundary samples where the ring is thinner than 4 px *and not blocked by the creature's own body* |
| **min ring depth** | must be 4 |
| **frame clipping** | body pixels on the frame edge, where the ring cannot fit |

Calibration on a hard-edged synthetic master: `fringe 0, gaps 0, depth 4` —
that is the workable target.

**The metric was wrong before the art was.** Its first draft counted crevices
blocked by the creature's *own body* (between legs, between fur spikes) as
ring gaps, and reported 176 of them on a master whose ring is in fact
continuous. Walking outward now stops at body and at the frame without
scoring a gap; only genuinely empty pixels count.

## Results — all three candidates pass rim-compat

| | fringe | ring gaps | min depth | frame clip |
|---|---|---|---|---|
| candidate 0 | 0 | 0 | 4 ✅ | 0 |
| candidate A | 0 | 0 | 4 ✅ | 0 |
| candidate B | 0 | 0 | 4 ✅ | 0 |

### The three candidates, varied on stated axes

| | paint density (opacity) | value | saturation | palette | outline |
|---|---|---|---|---|---|
| **0** — Session 7 archive, **0 spend** | 0.339 | lum 56.8 | 0.602 | 32 | black, medium detail |
| **A** — dense paint, heavy outline, compressed values | **0.472** | lum **38.5** | **0.790** | **21** | heavy black, highly detailed |
| **B** — sparse paint, selective outline, wide values | 0.422 | lum 42.2 | **0.354** | 30 | selective, basic shading |

A is the darkest, most saturated and most economical in palette; B is the most
desaturated and flattest; 0 sits between them and is the lightest.

Worth weighing against Session 7's own measurements: the rim is **36 % of the
sprite at render size**, and on forest and swamp it separates by hue at
near-equal value. A darker, denser body (A) gives the rim more to sit against;
a lighter body (0) competes with it less on busy ground.

## Spend

**2 generations** — candidate 0 is the archived Session 7 master at zero cost.
Session cap for Step 1 was ≤ 2 fresh; the ≤ 30 round cap for Step 2 is untouched.

## HOLD 1

Name the winning candidate, or rerun with notes. The lock lands with full
provenance (seed, prompt, axes, rim-compat numbers). **Also needs a ruling:
the angelic domain-marking question above**, which gates batch 2.
