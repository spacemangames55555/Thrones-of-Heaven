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
   rulings (walk-framework, {biome}-base-approved, unscattered-prop).
   `enemy-tint-ruling` was resolved in Art Session 7; see below.
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
4. **Review — HOLDS ARE VISUAL**: `npm run art:contact -- --batch <id>`
   renders the staged art at true boot-fitter size and **post those images
   directly into the chat surface**. The Vercel preview is a supplement, not
   the hold. See the standing rules below.
5. **Approve**: write `art-review/<id>/VERDICT.json` with the verbatim human
   verdict, then `npm run art:approve -- --batch <id>` moves staged files to
   their contract paths — **it refuses without that receipt**. Then
   `npm run art:manifest` (statuses flip by regeneration), full
   `npm run verify` read from the complete log, and land as a normal gated
   commit `art: {category} batch {id}` **quoting the verdict verbatim**.
6. Log the credit spend per batch in the ledger's spend log.

## What the gate owns (never generation)

`manifest-sync` · `manifest-fences` · `batch-stages-only` (the tool cannot
reach contract paths — traversal fixtures) · `style-lock-required` ·
`fence-respected` (a blocked id never generates) · `lint-wired` (bad staged
asset excluded + reported) · `fixture-row-inert` (the permanent synthetic
harness rows never render, count or approve) · `rims-derived` (enemy rims are
baked from master + domain table, never hand-landed) · `anchor-source` (biome
anchors are imported, never retyped) · `secret-hygiene` (repo scan, pattern
set stated in the check) · `manifest-sync` re-run at the suite tail.

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

## Enemy domain treatment — MODEL C (Casey verdict, Art Session 7)

The `enemy-tint-ruling` fence is **RESOLVED**. It blocked the largest fenced
category in the manifest — every enemy row plus the hostile creatures — and
the bestiary is now unblocked.

**The model: MASTERS ARE CANONICAL, RIMS ARE DERIVED.** An enemy sprite is
never authored with its domain in it. It is baked from

> (full-colour master) + (the domain table in `src/world/enemy-roster.ts`)

by `npm run art:rims`, and from nothing else. The master keeps its full
painterly colour; domain is carried by an **outer rim of pure, unmultiplied
`DOMAIN_TINT`**. No runtime tint, no new pools, the hit-flash untouched.

Three rules, each enforced by the `rims-derived` gate check:

1. **A canon fix stays a data edit.** Re-domaining a family is a one-line
   change to `EXISTING_FAMILY_DOMAIN` plus a **zero-credit re-bake**. The
   receipt for why this matters is already in the roster:
   `'lesser-evil-scouts': 'physical', // CANON FIX: was mis-mapped 'mental'`
   — fifteen zones use that family.
2. **Hand-landing a rimmed sprite is FORBIDDEN.** `art:rims --check`
   re-derives every rim-derived sprite and compares byte for byte; a
   hand-edited rim is red.
3. **4 px is the DERIVED MINIMUM, and the treatment is frozen.** Masters fit
   to their contract size by nearest-neighbour downscale, so a thinner rim
   can fall between samples and vanish on some edges. **Any treatment change
   — thickness, an inner rim, a gradient — is AMENDMENT TERRITORY**: its own
   bake-off and Casey's approval, the same ceremony as a lock amendment.

Masters live at `public/sprites/masters/<key>.png`. A key with no master is
simply not rim-derived and keeps the runtime domain tint. Art Session 8
painted masters for all nine roster families under the `enemy` style lock;
the creature batch and the boss batch land later and take that fallback in
the meantime.

`scripts/gen-sprites.mjs` drew the grayscale placeholders that held those
paths before the bestiary. It still owns any family with no master, and it
now **refuses to overwrite a rim-derived key in the live tree** — a stale
`npm run gen:sprites` clobbering derived art is the same accident as
hand-landing a rim. Sandbox out-dirs (`GEN_SPRITES_OUT`) still generate the
full set, which is what keeps its determinism checkable.

### Why not the alternatives

Measured on the bake-off master, in `art-review/tint-decision/report.md`:
whole-body multiply tint (the shipped model) costs **59 % of luminance** and
collapses **mental vs spiritual to 33.3** apart — under this project's own 48
"reads as the same thing" threshold. The baked rim carries the raw tint
distance instead, worst pair **102.2**. The full-colour + aura model needed a
persistent pooled under-glow that does not exist (`CircleFxPool` is a
transient flash pool).

## Enemy masters — the rim-compat band (Art Session 8)

`art:rims` treats **any nonzero alpha as body**. A master with a soft or
anti-aliased edge therefore pushes the rim outward from its faintest fringe
pixel, wrapping a halo instead of the creature. Every enemy master is measured
through the real `bakeRim` before staging:

| measure | rule |
|---|---|
| fringe share | opaque pixels with alpha < 250, as a fraction — hard-edged pixel art is 0 |
| ring gaps | boundary samples whose outward ring is thinner than `RIM_PX` |
| min ring depth | must equal `RIM_PX` (4) |
| frame clipping | body pixels on the frame edge, where the ring cannot fit |

**THE CREVICE RULE** (corrected, Art Session 8): walking outward from a body
boundary pixel, two things legitimately stop the ring short and are **not**
gaps — the frame edge, and the creature's **own body** across a narrow
crevice. Only genuinely EMPTY pixels before the wanted depth count as a gap.
Without this rule the band fails intricate silhouettes (fur, limbs, spikes)
for having exactly the shape they are supposed to have.

## Standing rules — verdicts, gate readout, visual holds

**Casey standing rules, Session 8 reconciliation.** Art Session 8 landed the
nine-family bestiary with **no verdict at all**: a hold was declared, no
image was ever posted, and a reply that had nothing to judge was read as
approval. The same commit was reported green off a `tail -80` pipe that had
in fact hidden two real failures and replaced npm's exit status with tail's.
Two independent controls failed in one landing. These three rules exist so
neither can fail quietly again.

### VERDICT RECEIPTS

Any hold-gated commit must **quote the human verdict verbatim in the commit
body**, and that verdict must be a human message sent **after** the hold was
staged. **No quotable verdict, no landing.**

Enforced in `art:approve`, which refuses to move a single file without
`art-review/<batch>/VERDICT.json`:

```json
{ "batch": "<id>", "stagedAt": "<ISO>", "images": ["<posted image>", ...],
  "receivedAt": "<ISO>", "verdict": "<the human message, verbatim>" }
```

It refuses on: no receipt, a receipt for another batch, an empty verdict, no
images listed, an image that is not on disk, and a `receivedAt` that does not
postdate `stagedAt`. On success it echoes the verdict so the commit body
quotes it rather than paraphrasing. The `verdict-receipt` gate check proves
all six refusals and the approving case.

**Honest limit, on record:** no local tool can prove a human wrote the text.
What this removes is the failure that actually happened — approval as a
belief in an agent's head with nothing on disk to contradict it.

### GATE READOUT

Read gate results from the **complete log** and the **gate process's own exit
code**. Never through a truncating pipe. `npm run verify | tail -80` is the
named precedent: it discarded the log head *and* substituted tail's exit
status for npm's, turning 331/333 with two real failures into a reported
pass. Redirect to a file and read that file.

### HOLDS ARE VISUAL

Every hold must deliver **images Casey can see in the chat surface itself** —
posted directly, not only as a branch URL. Numbers and prose supplement the
images; they never replace them. **A hold with no visible image is not a
hold.**

`npm run art:contact -- --batch <id>` exists for this. It reduces the shipped
art to the boot-fitter frame by true nearest-neighbour — the same sampling
Phaser applies at boot — so the 1:1 views are what the phone actually
receives, and magnifies *those reduced pixels* rather than the master, since
magnifying the master shows detail the player never gets. It renders each
family on neutral and on shipped terrain, because the enemy lock's own
criterion is "readable at thumbnail size" and readability is against ground.
It **refuses to emit a sheet too tall to post** — an image that cannot be
delivered is precisely the failure it exists to prevent.

What this buys is not ceremony. The first contact sheet ever built found, in
minutes, that `corrupted-wildlife` is an upright biped whose family theme and
whose own lock prompt both describe a hunched quadruped — on the very asset
that *is* the enemy style lock reference. No metric in the session caught it,
because no metric was looking at the picture.

## Standing band — SUBJECT FIDELITY (Casey ruling, Session 8 verdict)

**The gap the bestiary exposed.** Every numeric band Art Session 8 ran —
rim-compat, opacity, radiance, luminance, palette size, ring depth — passed on
a master that does not depict its own subject. `corrupted-wildlife` shipped as
an upright biped while its family theme says *hunched quadruped beast* and the
lock's own recorded prompt says *low prowling wolf-like creature*. The bands
measured how the art was MADE. Not one of them asked WHAT IT WAS.

**1. Subject spec before generation.** Every master carries a one-line spec
drawn from its family theme — **posture, body plan, relative scale** — written
down *before* any call is made. The candidate is then judged against that text.
The themes already exist in `src/art/spritegen-config.ts`; the failure was
never consulting them.

**2. Silhouette diversity is a BATCH property.** Five of six marked families
converging on one humanoid outline is a **batch-level failure even when every
asset passes individually**. The rim carries domain; the silhouette must carry
identity. This is the whole reason Model C was chosen over a whole-body tint —
if every body is the same shape, the rim is doing identity work it was never
meant to do. Per-asset green cannot clear this.

**3. Relative scale is a BATCH property.** *Brutes must not be smaller than
casters.* The roster's intended size relationships are derived from family
names and themes and checked as a SET. The shipped roster violates this today:
`dark-casters` renders ~56px tall against `hollowed-brutes` at ~46px — a robed
caster standing **1.22×** the family named *brutes*.

**Measure the RENDERED size, not the frame.** The first draft of this band
quoted 1.6×, taken from frame sizes alone (48×56 vs 24×34). That was wrong:
`spawnEuropeBrute` applies `setScale(1.35)` at spawn, so the brute's frame is
not its size on screen. The inversion is real either way, but the number was
not — and a batch property checked against the wrong quantity is how the
original defect got through. Relative scale means **frame × runtime scale**.

**4. No numeric band substitutes for the contact sheet.** Subject fidelity is
**verdict-judged, image-first, always**. Machine checks under this band are
SUPPORTS that surface candidates for the eye. They are never the authority and
must never be cited as one. A green metric that never looked at the picture is
precisely what shipped a biped as the lock for a quadruped family.

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

### 3. Calibrate a metric on known truth before trusting it

A band is a measurement, and a measurement can be wrong in the same direction
twice. **Run every new metric against an input whose answer you already know
before you point it at art.** Art Session 8's rim-compat band is the
precedent: its first draft reported **176 ring gaps** on a master whose ring
is in fact continuous, because it counted crevices blocked by the creature's
*own body* — between legs, between fur spikes — as holes. A hard-edged
synthetic master was the known-truth input that exposed it (`fringe 0, gaps 0,
depth 4` is what "correct" has to look like), and the fix was to the metric,
not the art.

The failure mode this prevents is worse than a wrong number: a
badly-calibrated band sends you regenerating perfectly good assets, burning
spend to satisfy an instrument that is lying.

Ratified as standing policy by Casey verdict, Art Session 8. See also the
Session 6 purpose rule above — a band must serve the asset, and it must also
be *true*.

### 4. Anchors are read from source, never retyped

Biome anchors live in `src/world/terrain-placeholder.ts` and are the single
source of truth. Band tooling must **import** them; a hand-typed hex in a
prompt, a script argument or a report is a defect. Art Session 5 typed
`#27476d` for OCEAN's `#274b6d` and shifted the whole luminance band by three
units before the miscopy was caught. Retyping an anchor into prose is fine
only when the number is quoted *from* the file in the same breath.
