# Art Pipeline — PixelLab MCP + Staged Batches (Pass 8)

Agent-driven art coverage with **human style locks**. One-shot-everything is
out of scope; work lands in review-sized batches (≤12) approved on-device.
**Generation is never part of the gate** — generative calls are
human-triggered tool steps; the gate owns inventory sync, lint, staging
discipline, and hygiene.

## Setup (once per machine)

1. Sign up at pixellab.ai and copy your API token.
2. Export it — the key lives in the environment ONLY, never in a file:
   `export PIXELLAB_SECRET=...`
3. The repo's `.mcp.json` wires PixelLab's REMOTE MCP
   (`https://api.pixellab.ai/mcp`, Bearer auth via `${PIXELLAB_SECRET}`
   env expansion) into Claude Code — tools `create_character` (4/8-way),
   `animate_character`, `create_tileset` become available in-session for
   interactive candidate generation. Per PixelLab's setup guide
   (pixellab.ai/vibe-coding); re-check their docs if the endpoint moves.
4. Batch runs (`npm run art:batch`) call PixelLab's REST API with the same
   env key through `scripts/art-batch/generator-pixellab.mjs` — the single
   point of change if endpoints drift (verify on the first live run; the
   docs were proxy-blocked from the build environment when this shipped).

## The loop

1. `npm run art:coverage` — what's missing, what each batch would cost
   (call estimate BEFORE credits are spent), what's blocked and by which
   ruling. Blocked categories cannot be batched — the fences are ledger
   rulings (enemy-tint-ruling, walk-framework, {biome}-base-approved).
2. **Style lock first** (per category, human): generate candidates
   (interactively via the MCP tools, or a 1-item batch), Casey approves ONE
   on-device — record it in `art/style-locks.json`:
   `{ "locks": { "<category>": { "reference": "path/to/approved.png",
   "prompt": "shared style words", "palette": "constraints from the brief" } } }`
   No lock ⇒ `art:batch` REFUSES the category.
   **TECHNIQUE IS PART OF THE LOCK** (Casey ruling, Art Session 2): the
   lock's `technique` field records HOW the approved asset was made
   (e.g. `prompt-only`), and every batch call uses exactly that technique.
   Any technique change — conditioning/style images, a model or mode swap —
   is a **lock amendment**: its own bake-off, Casey's on-device approval,
   the same ceremony as a new lock. The lock's `reference` is a
   **verification-target** — candidates are judged against it, never
   generated from it (the first PNW set leaked the grass palette into a
   green "snow" by feeding it as a style image; rejected).
3. `npm run art:batch -- --category X --limit N` (N ≤ 12): generates each
   unblocked missing/fallback item with the locked reference attached,
   converts (existing converter where applicable), lints, and stages under
   `art-review/<batch-id>/` with `report.md` (per-asset palette-size +
   luminance advisory columns; lint failures EXCLUDED with reasons). The
   batch tool cannot write contract paths — gate-proven.
4. **Review**: push the `art-review/<batch-id>/` folder on a review branch;
   the Vercel preview is the phone review surface.
5. **Approve**: `npm run art:approve -- --batch <id>` moves staged files to
   their contract paths. Then `npm run art:manifest` (statuses flip by
   regeneration), full `npm run verify`, and land as a normal gated commit:
   `art: {category} batch {id}`.
6. Log the credit spend per batch in the ledger's spend log.

## What the gate owns (never generation)

`manifest-sync` · `manifest-fences` · `batch-stages-only` (the tool cannot
reach contract paths — traversal fixtures) · `style-lock-required` ·
`fence-respected` (a blocked id never generates) · `lint-wired` (bad staged
asset excluded + reported) · `secret-hygiene` (repo scan, pattern set stated
in the check) · `manifest-sync` re-run at the suite tail.

## Prop recipe (addendum, Art Session 3 — a new SHAPE, not a new technique)

Props run **prompt-only under the terrain lock** (`terrain-prop` in
`art/style-locks.json` shares the terrain-sheet lock — an alias, not a
separate approval). Generation: `create_map_object`, basic mode, exact
contract canvas from PROP_TABLE, high top-down, selective outline, medium
shading; single object, bottom-center anchored, transparent background,
"no shadow on the ground" in every prompt.

Acceptance bands (checked BEFORE staging): opaque-mean color in the
assigned hue family · opacity ratio (trees 25–60% of canvas, boulders
35–75%) · top/left/right 1px borders fully transparent, bottom contact
only in the center third (the anchor must read) · VARIANT INVERSION for
a/b pairs — same species and tonal family (opaque-mean spread ≤ 48) but
different silhouettes (IoU ≤ 0.85). Tiles want interchangeable; props
want recognizably varied.

**Correction discipline** (Casey ruling): max 2 attempts per asset per
round under the round's spend cap; still out of band ⇒ stage BEST-OF with
honest numbers and let the verdict decide — never burn spend chasing a
band. A verdict may reclassify a best-of as an intentional variety asset
(fir-a and boulder-a are the precedent: approved as-is, no regeneration
debt, no polish-ledger entry). Prompt-vocabulary lessons carry in the
ledger: weapon homonyms (blade) and "needle"/"litter" trip the policy
filter uncharged; color modifiers can drift hue ("moss flecks" browned a
gray boulder — prefer plain material words, add accents only after the
base reads right).

### Correction discipline, addendum (Art Session 4)

A correction must re-assert **every** band the first attempt already held —
most easily forgotten: **frame containment**. Art Session 4's `log-a` is the
precedent: attempt 1 sat 0.021 under its (self-derived) opacity floor with a
clean silhouette; the correction prompt asked for a log "across the full
width of the frame", which hit the opacity band but ran off both side edges,
reading as a trunk clipped mid-length. Attempt 1 was staged as best-of and
approved as a slender variety asset. So: when you push on the axis that
missed, name the axes that passed as constraints in the same prompt
("filling more of the frame **while staying clear of the left and right
edges**"). A correction that trades one band for another is not a
correction.

Sizing vocabulary that works: ask for the OBJECT to be bigger ("large
lush fern", "thick heavy log"), not for it to fill the canvas — canvas
language invites edge contact, object language does not.

## Standing batch policy (Casey ruling, Art Session 5)

Rules that apply to **every** category from here on, not just water.

### 1. Tile selection is by band, never by file order

A `create_tiles_pro` run returns 16 tiles. Art Sessions 1–4 took **the first
four** — that was never a ruling, just what the scratchpad band script
happened to slice, and it is now disclosed as such. Art Session 5's corrected
OCEAN run proved the cost: it came back **bimodal**, its first four tiles
texture-dead (luminance sd ≈ 1) while later tiles in the *same run* carried
real texture at the right luminance. File order carries no quality signal.

The rule, which is only the lock's own words ("interchangeable subtle
variants of ONE ground") made mechanical:

1. keep tiles inside the biome's luminance band;
2. of those, keep tiles whose texture (luminance sd) is at or above the run's
   **median** — a flat tile cannot read as ground, and cannot be animated by
   displacement at all, since displacing a flat field returns the same field;
3. take the four with the smallest maximum pairwise mean-colour distance —
   interchangeability (≤ 48) is the band that matters for base variants;
4. tie-break toward texture, so sameness is never bought with lifelessness.

If fewer than four tiles survive 1–2, say so and fall back to the most
textured in-band tiles, labelled honestly.

**Approved art stays approved.** Every sheet Casey has already approved keeps
its verdict — this rule changes how future runs are read, and creates no
regeneration debt for anything already shipped.

### 2. A band must serve the asset's PURPOSE, not just its class

Class bands are derived from shipped comparables (rule 1's sibling). That
breaks down when the class has **one** member and the new asset is *defined
by differing from it*. Art Session 6's `log-b` is the precedent: the band
script carried a log-a ±15 % class band `[0.194, 0.263]` **and** a purpose
rule that log-b be *fuller* than log-a (0.229). Both cannot hold — the window
they leave is `(0.229, 0.263]`, which sets the asset up to fail for the exact
reason it exists. The contradiction was visible in the code before either
attempt ran.

So: **when an asset's brief says it must DIFFER from its comparable, the
comparable is a FLOOR (or ceiling), never a centre.** Derive the other end
from the nearest class member in the direction of the difference. log-b's
corrected band ran from log-a's mass (0.229, must be fuller) to stump-a's
(0.505, the densest shipped understory solid — past that it stops being a log
and becomes a mound).

Ratified as standing policy by Casey verdict, Art Session 6.

Corollary, same session (`scrub-a`): **check that the comparable belongs to
the same world before deriving from it.** scrub-a's luminance band came from
salal-a, a lush dark rainforest evergreen, which is the wrong tonal reference
for a sun-bleached desert shrub. The rule is to notice this *before*
generating; when it is noticed after, report the mis-derivation rather than
quietly re-deriving a band that happens to pass.

### 3. Anchors are read from source, never retyped

Biome anchors live in `src/world/terrain-placeholder.ts` and are the single
source of truth. Band tooling must **import** them; a hand-typed hex in a
prompt, a script argument or a report is a defect. Art Session 5 typed
`#27476d` for OCEAN's `#274b6d` and shifted the whole luminance band by three
units before the miscopy was caught. Retyping an anchor into prose is fine
only when the number is quoted *from* the file in the same breath.
