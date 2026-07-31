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
