# Thrones of Heaven — Deferred Decisions Ledger

Open questions and machinery shipped ahead of its ruling. Append-only; when a
ruling lands, strike the entry with a pointer to the commit that resolved it.

- Crit system: FEEL.critScale machinery shipped, no crit rules yet.
- Enemy color identity: whole-body domain tint over grayscale sprites (current)
  vs full-color sprites + domain aura (Style Bible ruling pending).
- Walk-cycle framework: frame animation unsupported; Bard 'Running' frames
  shipped but unusable until built. Deferred.
- ~~World naming debt: 'earth' meant only the PNW map while the planet grew
  under 'globe'.~~ CLOSED by the world unification — the PNW and the Nile are
  chunks of the one planet, and that world is named 'earth'.
- Far-view ground truth for hand-built maps: Egypt/PNW stylized coastlines
  disagree with the Natural-Earth raster (36/40 seam samples). Bake option (b)
  parked pending Casey ruling after a trailer-quality capture.
- Tiles-vs-labels device cost apportionment: superseded if this pass lifts
  far-zoom FPS; dev overlay now exposes both counts live.
- ~~World scale v2 (Pass 1 shipped flag-gated behind ?scale=v2): Pass 2 flips
  the default to v2 and replaces the TEMP render window (the ~200-tile
  zoom-out clamp) with real chunk streaming; mounts + the waypoint network
  ship in a later pass.~~ Pass 2 SHIPPED chunk streaming (TEMP window gone);
  the remaining items moved to the entry below.
- World scale v2 Pass 2 (chunk streaming + procedural placeholder terrain,
  still flag-gated): the DEFAULT FLIP to v2 moves to Pass 3 (real Earth
  geography through the same TerrainSource interface); autotile transitions
  between biomes go to the art pass; the world-map overview render is
  deferred (v2 zoom-out is ring-bounded by design); prop SCATTER on
  forest/taiga was skipped — no tree/rock prop texture exists in the game
  yet (the scatter-allowed flag already ships in the tile records); mounts +
  the waypoint network still ship in a later pass. Hillshade DID ship (subtle
  per-tile elevation tint, set once at chunk build). (Pass 5 amendment: the
  autotile-transitions and prop-scatter deferrals are CLOSED — both shipped
  in 'terrain: autotile + scatter + drop contract + art brief',
  procedural-first.)
- World scale v2 Pass 3 (real-Earth bake + earth TerrainSource, still
  flag-gated): the DEFAULT FLIP to v2 is now gated on PASS 4 (mounts +
  waypoints), NOT this pass. Additional region packs (Egypt next) bake via
  the same script per-bbox. Pack files are committed build artifacts
  (~42 MB) — consider git-lfs if regeneration churn bloats history. DERIVED
  BIOMES shipped (fallback 3 — real land/ocean/lakes/rivers/elevation, but
  biome classes from the Pass 2 latitude+moisture model): upgrade to WWF
  ecoregions or Koppen-Geiger when a reachable mirror exists (their hosts
  are blocked from the build environment).
- World scale v2 Pass 4 (mounts + waystones + THE DEFAULT FLIP): v2 (the
  real Earth) is now the default; ?scale=v1 keeps the legacy world fully
  functional as a gate-checked escape hatch — its REMOVAL is ledgered here,
  not scheduled. Mount acquisition/content + real mount art (PixelLab) +
  class mounts are future passes (Summon Mount is unlocked-by-default until
  then). Waystone art + lore naming pend a Casey ruling (the display text
  Waystone is a marked placeholder). Waypoint travel cost hooks into the
  crystal/arcane-liquid economy when that ships (travel is free this pass).
  A spawn-coverage/density audit at v2 scale is owed (zone spawns were tuned
  for v1 distances). En-route encounter content for the long overland
  corridors is owed (open terrain between stamps is currently empty land).
  ~~TRINITY_ARENA carries a suspected shipped mistranslation (a hell-plane
  constant holding an earth-frame value; the spawn survives via the
  walkable-fallback) — flagged for a ruling, deliberately not changed.~~
  CLOSED by Pass 5 ('planes: restore TRINITY_ARENA, projection-invariance +
  loud-fallback gates'): the pre-one-earth hell-local value {11520, 9000} is
  restored, the plane-anchor-invariance gate pins every plane anchor across
  flag permutations, and any walkable-fallback engagement is now a loud,
  enumerated gate failure.
- World scale v2 Pass 5 (terrain art pipeline): autotile fringes + scatter +
  water shimmer shipped PROCEDURAL-FIRST — all 12 biome sheets and all 11
  prop drops are open art debt (the drop contract lives in
  toh-terrain-art-brief.md; lint:terrain-art + convert:terrain enforce it).
  Water anim frames upgrade from procedural shimmer to real art per water
  sheet when dropped. The waystone prop slot ships reserved (no scatter rule
  spawns it yet — waystone pillar art + placement pend the Pass 4 lore
  ruling). Scatter densities are the locked launch values; a density/readability
  tuning pass under real art is expected. LUXOR ABSORPTION IS NOW GEOMETRIC:
  under v1 Luxor still re-hosts on the egypt map (unchanged), under the v2
  default it builds its own stamped chunk at real Luxor — the declared-host
  shortcut had left every Luxor placement ~760 km off the stamp, surviving
  only through the silent walkable-ground fallback the Pass 5 gate now
  forbids. Fringe rendering across chunk borders resolves neighbors through
  the pure per-tile reference at the current source version (deterministic;
  noted here because a future multi-version blend would need a repaint hook).
- World map overview (Pass 6A): the MAP ART RESTYLE is open — worldmap.png
  ships as MAP_PALETTE cartographic classes + hillshade straight from the
  bake; a parchment/atlas treatment (and richer biome classes when the
  ledgered ecoregion upgrade lands) replaces it via the same
  npm run bake:worldmap. REGION-DETAIL INSETS are deferred (the map renders
  the planet pack only — the pnw region pack's 320 m detail does not inset
  yet). FOG-OF-DISCOVERY is deferred (the whole map is visible from minute
  one; discovery-gated reveal pends a Casey ruling). CORRIDOR-BEAT MARKERS
  are deferred to the Egypt pass (only the tracked-quest target renders as
  a beat marker today).
- SCALE-HEURISTIC AUDIT (Pass 6A addendum — REPORT ONLY, nothing changed):
  sweep for regional-era predicates that became planet-scoped at unification
  (the combat bug's class). Findings, each awaiting its own gated fix after
  triage:
  1. Entity tick gates are residency-only (MainScene updateAngels ~7365,
     updateCherubs ~7550, boss loop ~7726, updateTownsfolk ~8886,
     updateDemons ~11180): isActiveWorldResident is an X-band test, so every
     live terrestrial enemy anywhere on Earth ticks + raycasts every frame.
     Blast radius: perf ceiling scales with global population (bounded today
     by zone hysteresis + the enemy cap); no-self-leash walkers (portal-target
     townsfolk) advance planet-wide. The combat funnel already contains the
     combat/mount consequences.
  2. applyResidentPause (~12126): physics bodies stay enabled planet-wide on
     earth (the disable keys off world bands). Perf only.
  3. refreshBossBar (~7910) reads RAW b.isAggro + residency, not the
     engagement funnel — and Boss has no deaggro(), so the leash release is a
     no-op on bosses: an aggroed boss outrun beyond leash keeps the boss bar
     on screen until its lifecycle despawn. Visible-UI bug candidate; fix =
     Boss.deaggro() + bar reads the funnel.
  4. PortalDefense.update runs whenever the active world is earth (~2076):
     pre-unification, leaving the Washington MAP paused the encounter; now
     riding away leaves waves spawning and the portal losing HP in absentia
     (possible off-screen loss). Needs a proximity/participation pause.
  5. Guardian encounter (~9024): activation is distance-gated, but once
     'fighting' the phase machine never resets — and the hotfix leash now
     RE-DORMANTS the FlamingSword entities beyond 2048 px while guardianPhase
     stays 'fighting', whose activation check only runs from 'dormant'.
     Possible encounter soft-lock on leave-and-return; needs triage first.
  6. updateSwarmers (~7293) has no residency or distance gate at all inside
     the terrestrial branch. Small population; perf-noise only.
  7. updateRegionSpawns zone scan (~10330): correct distance logic, stale
     "25 distance checks" comment now covers ~81 planet-wide. Informational.
  8. EUROPE_ENEMY_CAP (settings ~1764) is now a PLANETARY live-enemy cap
     (regionLiveCount counts every zone on Earth). Effectively local today
     via hysteresis; will bite multi-hotspot content. Informational.
  9. Verified CLEAN (real proximity/zoom scoping): Uriel/Seattle/rift
     triggers, city gates, hearth radius, mentor/neighbor buttons,
     respawn-nearest + waypoint lists (planetary min-distance is CORRECT
     there), LoD bands, nameplate pool.
- Simulation locality (Pass 6B): audit findings 1/2/3 (boss bar, portal
  defense, guardian phase) are FIXED — encounters derive suspend/resume from
  player distance (src/systems/encounters.ts), bosses take the standard
  leash reset beyond FEEL.sim.bossLeashRadiusPx, and spawned transients
  expire beyond FEEL.sim.transientDespawnRadiusPx. REMAINING PERF DEBT
  (bounded, deferred): the world-band physics-body pause still enables every
  terrestrial body planet-wide, and tick gating beyond the one-line
  Chebyshev early-outs (added at the expiry radius in the five dense enemy
  loops) is still residency-only. ABANDON⇒FAIL for the portal defense is a
  pending ruling — suspension currently preserves the encounter
  indefinitely; failing it on abandon is a design call, not shipped.
  PER-REGION LIVE_ENEMY_CAP tuning is open (48 is the global local-density
  value; Egypt content may want its own). BOSS PHASE-PERSISTENCE exceptions:
  NONE found — every boss's phases are HP-gated and reset cleanly; no design
  contradicted by the standard leash reset. FLAKE STANDING RULE: confirmed
  flakes are logged in toh-flake-log.md; a SECOND confirmed flake on the
  same check gets a dedicated stabilization commit — no third rerun.
- Combat hotfix (derived in-combat): DoT ticks the player's own effects land
  still AUTO-DISMOUNT per the Pass 4 spec (dealing damage dismounts — a
  poison applied before mounting will knock the rider down on its next
  tick). Deliberately unchanged in the hotfix; feel ruling owed if
  playtesting hates it. The old FEEL.mount.combatLockoutMs knob is retired
  in favor of FEEL.combat.lingerMs (the grace after the engagement set
  empties); leash is FEEL.combat.leashRadiusPx = 2048 px.
- PASS 6C (PNW re-planting): CORRIDOR SPAWN-DENSITY AUDIT at true scale is
  owed — the gate prints ADVISORY per-leg mounted minutes (Enumclaw to
  Olympia 5.0m; the long legs run 11-30m and the full Acts corridor is
  roughly 7 hours mounted) and the encounter spacing that felt right at
  50:1 has not been re-felt at 1:1. MIGRATION-ARRIVAL TOAST (TODO-lore): a
  save re-grounded by v19 rule (b) lands at the nearest re-planted
  settlement SILENTLY; a one-line arrival toast telling the player what
  happened wants lore-approved wording. CROSSING ART SLOTS: the 11 causeway
  stamps render as plain road tiles; each real site (Bridge of the Gods,
  Perrine, Beebe, ...) is an obvious art drop-in slot when bridge art
  exists. OUTPOST/PORTAL PLACEMENT: the Holy Outpost (46.05,-115.55) and
  Heaven Portal (46.03,-115.42) are FICTION placements inside spec bands -
  pending Casey's on-device review before any lore hardening. LEGACY STAMP
  RETIREMENT: washington.map.json stays byte-preserved as the sub-stamp
  slice source and the ?scale=v1 world; it retires only when the v1 hatch
  itself does. LABEL-ONLY CITIES: under v2 the mega-stamp's label-only city
  markers (Spokane and the other non-POI names) have no host chunk and do
  not render; restoring them as map-layer labels at true coordinates is a
  small follow-up when wanted.
- PASS 6D (map + chrome UX): EGYPT REGION MAP - the regionmap bake emits one
  image per manifest region automatically, so egypt-map.png folds into the
  Egypt pass the moment its region pack lands (zero new tooling).
  FOG-OF-DISCOVERY on the map tiers stays open, as does the
  PARCHMENT/ATLAS RESTYLE (MAP_PALETTE is the single swap point). A
  LANDSCAPE-ORIENTATION ON-DEVICE SWEEP of all registered chrome is owed:
  the gate proves the two injected inset profiles geometrically, but a real
  rotated device (keyboard, URL bar, visualViewport quirks) has not been
  walked. The regional tier ships at a 2048 long edge (native 3441x2783
  render broke the 6 MB budget at 6.86 MB); if map-mode zoom ever wants the
  native crispness, the budget conversation reopens.
- PASS 7 (Egypt: gzip packs + region bake + Faiyum + Sinai corridor):
  PER-REGION PROP PALETTES are owed — the scatter/prop vocabulary is still
  the PNW set everywhere; Egypt wants desert scrub BEFORE cactus (explicit
  Casey ruling) and a palette hook per region pack. TODO-LORE INVENTORY for
  this pass: the five egypt-corridor beat titles/objective lines/banners
  (questData.ts, all marked), the sealed-portal refusal line
  (MainScene.enterSinaiPortal), the Faiyum NPC names + every line (Sefu the
  fisherman, Naila the potter - TODO-lore-approve), the Faiyum/Sinai-camp
  waystone display names, and the Sinai Foot Camp display name.
  SECOND-PORTAL NARRATIVE RECONCILIATION: the game now has TWO Heaven
  portals (the Sawtooth gate crossed corrupted at the Act IV climax; the
  Sinai gate unsealed by rite) - how the two gates relate, why the Sinai
  seal answers the mountain rites, and whether crossing state is shared is
  a lore question Casey owns before hardening. EGYPT SPAWN-DENSITY AUDIT
  at true scale is owed (same debt as the PNW corridor): the gate prints
  ADVISORY per-leg mounted minutes for the egypt corridor; nothing spawns
  along it outside the Suez beat today. SETTLEMENT/HOME-CITY UNIFICATION:
  village-tier settlements (settlements/*.ts) and the 14 home cities run on
  parallel machinery (registry stamps vs zone chunks); folding homes onto
  the settlement contract is deliberate future work, done only as a
  sanctioned migration. FAIYUM + CAMP ART UPGRADES: both render from the
  existing town legend (mudbrick/tents are flavor text only) - obvious art
  drop-in slots. SUEZ CANAL FIDELITY: NO gap to record - the canal is
  PRESENT in the NE 10m source (scalerank 6) and baked; the Ahmed Hamdi
  causeway crosses the baked channel at the real tunnel site.
  FOG-OF-DISCOVERY now spans TWO mapped regions (pnw + egypt) when it
  lands - the map-tier fog design must handle multi-region reveal from the
  start. PNW RIVER RECLASSIFICATION: the pnw pack keeps its FROZEN
  strokeweig classifier (every NE river there classed 1 via the null
  fallback - shipped decode truth); reclassifying onto scalerank happens
  only at the next sanctioned pnw re-bake (also noted in bake.mjs).
  HARNESS (scheduled for the next harness housekeeping commit): drive
  fixtures may PRE-SEED the pack cache from committed files - only
  offline-cache, lazy-fetch, and decompression-unavailable own the real
  network path (every other fresh-session boot re-downloads packs today,
  e.g. the isolated egypt-corridor fixture). Pairs with the timing-flake
  clock rule: long setup waits under frame pressure are exactly where
  wall-clock assertions die.
- PASS 8 (art autonomy: asset manifest + MCP batch machine): the ENEMY-TINT
  ruling is PROMOTED TO DECISION - whole-body domain tint over grayscale
  (current) vs full-color + domain aura now BLOCKS the largest fenced
  category in toh-asset-manifest.json (every enemy/hostile-creature row
  carries enemy-tint-ruling); nothing in those categories can batch until
  Casey rules. STYLE-LOCK APPROVALS are tracked per category in
  art/style-locks.json - the file ships EMPTY (locks are human-approved
  on-device only); every category needs its lock before its first batch.
  CREDIT SPEND LOG: record the per-batch spend here as batches run
  (none yet - no key has ever touched this repo or environment).
  SPRITECOOK stands as the A/B generator if PixelLab misses the painterly
  bar on the grass bake-off (the DO-NOT on a second generator holds until
  that bake-off says otherwise). PIXELLAB ENDPOINT VERIFICATION: the
  remote MCP URL (.mcp.json) and the REST shapes in
  scripts/art-batch/generator-pixellab.mjs follow the published v1 docs,
  which were PROXY-BLOCKED from this build environment - verify both on
  the first live run; any drift is a one-line fix in the adapter.
  DROP-CONTRACT GAPS made visible by the manifest: spell-fx (421 rows) and
  town tiles have NO drop-in contract - fenced drop-contract-missing;
  adding either contract is its own sanctioned pass, never implied by a
  batch run.
- ART SESSION 1 (grass bake-off, 2026-08-01): TERRAIN STYLE LOCK LANDED -
  Casey verdict D (tufted vivid, seed 71004) of four candidates; the lock
  (art/style-locks.json terrain-sheet) records the PixelLab tile id, seed,
  prompt, and palette constraints; the reference strip lives at
  art/references/terrain-grass-d.png. CREDIT SPEND LOG: 80 of 2000
  subscription generations (4 tiles-pro runs at 20 each; one policy
  false-positive on the word "blade" was refused UNCHARGED and reworded -
  note the filter for future prompts). $0.00 credits used. ADAPTER
  VERIFICATION (owed from Pass 8): both REST endpoint names exist on the
  live API (401 unauthenticated, not 404); body shapes still get final
  confirmation on the first authenticated REST batch (this session
  generated through the MCP tools). backblaze.pixellab.ai (tile storage)
  is proxy-blocked but unneeded - the api.pixellab.ai download route
  serves the same files. FRINGE DERIVATION NOTE: candidate sheets carry
  fringe masks derived mechanically from each candidate's own base art
  under the brief's geometry rules (12 px dissolve, deterministic dither);
  hand-authored fringe art remains an upgrade slot per biome.
  FOREST/ROCK/SNOW/TAIGA batch against this lock next session.
- ART SESSION 2 (pnw terrain batch, 2026-08-01): FOREST/ROCK/SNOW/TAIGA.
  ADAPTER VERIFICATION CLOSED on the first authenticated REST call - two
  named drifts fixed in generator-pixellab.mjs: (1) node fetch bypasses
  the egress proxy (invocation env NODE_USE_ENV_PROXY=1 + CA bundle, per
  the proxy README - documented in the adapter and pipeline doc); (2)
  bitforge requires style_image sized EXACTLY to the output - the adapter
  crops the lock reference to its leading square and nearest-neighbor
  resamples per call. LOCK SEMANTICS AMENDMENT (Casey ruling): technique
  is PART of the lock - the terrain lock is prompt-only by mechanical
  definition; conditioning images were an unvalidated technique change.
  FIRST SET REJECTED (all four): style-image conditioning leaked the
  grass palette (snow rendered GREEN, sat evidence in the rows) and
  crushed brightness. Rejected advisory rows for the record: forest
  palette 29 lum 58 - rock palette 5 lum 64 - snow palette 4 lum 83
  (green) - taiga palette 26 lum 28. RERUN (authorized round, prompt-only)
  passed the NEW ACCEPTANCE BANDS (lum within 20 percent of anchor, hue
  family, snow near-neutral, inter-variant spread <= 48) on attempt one
  for all four: forest lum 75.7 spread 12.6 - rock lum 122.0 spread 39.5
  - snow lum 240 sat 0.04 spread 7.7 - taiga lum 96.6 spread 1.8.
  PROMPT-VOCABULARY UPDATE: "needle" JOINS the false-positive list
  (charged nothing, but "needle litter" was policy-refused like session
  1's "blade") - safe words now tuft/stalk/strand/facet/sprig.
  CREDIT SPEND: attempt-1 reruns 80 generations + first (rejected) set 80
  + REST verification probe 1 = session total 161; running total 241 of
  2000 ($0.00 credits). Two policy refusals uncharged.
  VERDICT: APPROVE ALL FOUR (Casey). Fences RELEASED by ground truth
  (manifest builder + fence gate both derive release from live sheets):
  boulder-a/b, tree-broad-a/b, tree-fir-a/b now batchable; desert and
  swamp props stay fenced on their bases; next terrain sessions are the
  released props and the remaining biome bases (desert, swamp, savanna,
  beach, tundra + the animated water pair).
- ART SESSION 3 (pnw props, 2026-08-01): SIX PROPS LANDED on Casey
  approve-all - tree-fir-a/b, tree-broad-a/b (48x64), boulder-a/b
  (32x32), prompt-only under the terrain lock via create_map_object
  (props are a new asset SHAPE, not a technique change - the
  terrain-prop locks entry is a shares-lock ALIAS of the approved
  terrain lock, and the prop recipe is a docs ADDENDUM, not a lock
  amendment). PROP ACCEPTANCE BANDS shipped (hue family, opacity ratio,
  edge/anchor rules, variant INVERSION: tonal spread <= 48 with
  silhouette IoU <= 0.85 - tiles interchangeable, props varied; pair
  IoUs 0.62-0.77). fir-a and boulder-a are best-of-two staged with
  honest numbers and RECLASSIFIED BY VERDICT as intentional variety
  assets - NO regeneration debt, deliberately absent from any polish
  ledger. VOCABULARY: "moss flecks" browned a gray boulder (hue drift
  from color modifiers - plain material words first); prior list
  (blade, needle/litter) stands. SPEND: 8 generations (6 + 2 retries);
  running total 249 of 2000, $0.00 credits. REMAINING TERRAIN ART:
  desert/swamp/savanna/beach/tundra bases, the animated water pair
  (ocean/freshwater - anim-cell shimmer recipe), fenced desert/swamp
  props, and the waystone prop (HERO OBJECT - reserved for its own
  mini bake-off by explicit ruling).
- PASS 9 (flora framework): PROPS DO NOT COLLIDE - the pass brief carried
  boulders as collides:true "per current behavior"; VERIFICATION SAYS
  OTHERWISE. Scatter props are pooled Phaser images with no physics body
  anywhere in the renderer, so nothing scattered has ever blocked movement.
  FLORA_PROPS ships collides:false on every row (the true behavior) with the
  field declared for a future sanctioned pass; FLIPPING A ROW TO TRUE IS A
  BEHAVIOR CHANGE and needs its own ruling plus footprint wiring (the
  collision-invariance gate proves footprints derive from contract size and
  never from render scale, so the machinery is ready).
  VALUE JITTER IS DARKEN-ONLY - a platform fact, not a preference: a Phaser
  tint MULTIPLIES, so it can darken but never brighten. The value band runs
  [1-valuePct, 1], leaving every approved anchor as the BRIGHTEST instance of
  itself. Brightening would need pre-baked lighter textures per prop -
  PARKED here as its own (art-budget) decision.
  NEAR-NEUTRAL ANCHORS TAKE VALUE-ONLY JITTER: hue and saturation are
  numerically ill-conditioned near gray (measured 2.4 deg of hue swing on the
  boulder anchor vs 0.4 deg on the greens), so anchors below
  NEUTRAL_ANCHOR_SAT skip saturation jitter entirely - exact hue and
  saturation preservation, and geology varies least by construction.
  CLUSTER-NOISE DENSITY MODULATION parked (polish): density is uniform per
  biome/tier today; clumping (groves, boulder fields) wants a low-frequency
  noise term multiplying the tier density - additive to the current hash
  discipline, no migration needed.
  PER-REGION PALETTE DIVERGENCE owed: BIOME_FLORA is keyed by BIOME, so PNW
  and Egypt forest would share a palette. Regional divergence (PNW ferns vs
  an Egyptian understory) needs a region dimension on the palette key -
  design it when the second region's understory art is queued.
  ART QUEUE (canopy additions): dead-snag and cedar for the PNW forest/taiga
  palettes - both are palette rows the day their art passes the bands.
  DENSITY FEEL TUNING pending Casey's dressed-forest ride: the numbers are
  the Pass 5 values chosen at 50:1 scale and never re-felt at 1:1 with real
  art in the frame.
- ART SESSION 4 (world dress v1, 2026-08-02): FIVE BASES (desert, savanna,
  swamp, tundra, beach) + SIX PNW UNDERSTORY PROPS + TWO CANOPY ADDS (cedar,
  snag) approved on three independent verdicts; PNW understory palettes and
  the cedar/snag canopy entries populated. Ten of twelve biomes now wear real
  art (ocean + freshwater are Session 5's animated-water bake-off).
  PALETTE ENTRIES RE-PLANT: adding a weighted entry re-rolls which species
  each tile holds, so forest and taiga canopy re-planted by design. The
  refactor-invariance check (migration-silence) was RE-SCOPED to the
  mechanism (equal-weight palettes reduce to the Pass 5 uniform pick) and a
  new PALETTE-PIN check now owns content: ids, order, weights and density are
  pinned, so a silent re-plant is red.
  MANIFEST DERIVATION FIX (found by the pre-generation verification, before
  any credit was spent): the prop->biome map was CANOPY-ONLY, so populated
  understory props reported `missing` and skipped their base fences.
  Placement truth is BIOME_FLORA across every tier - corrected identically in
  the builder and the gate.
  LOG-A is a SLENDER VARIETY ASSET by verdict (fir-a/boulder-a precedent):
  0.229 opacity against a self-derived 0.25 floor, clean ends, no
  regeneration debt. LOG-B (fuller) is SCHEDULED for the swamp-props session
  to complete the pair.
  CORRECTION DISCIPLINE ADDENDUM (docs/art-pipeline.md): a correction must
  re-assert the bands the first attempt already held - frame containment
  above all. log-a attempt 2 traded clean edges for opacity ("across the full
  width of the frame") and was rejected as best-of. Prompt sizing by OBJECT
  ("large lush fern", "thick heavy log"), never by canvas.
  SPEND RECONCILIATION (session 170 generations; running 419 of 2000, $0.00
  credits). Itemized: 7 tiles_pro base runs x 20 = 140; 10 map_object prop
  calls x 1 = 10; total accounted 150. The 20-generation delta is a
  RESTART DOUBLE-DISPATCH, verified against the service job list rather than
  inferred: a duplicate SWAMP tiles_pro job (e31bfc0d, completed, never
  returned a response to the session) plus a duplicate TUNDRA job (43e70847,
  FAILED, uncharged) both exist server-side from the container restart
  window. Lesson: an interrupted generate call may still have reached the
  service - reconcile against list_tiles_pro / list_objects before reporting
  spend, and prefer checking for an existing job over re-dispatching after a
  restart.
  SWAMP DARKNESS + TUNDRA SPREAD both needed attempt 2 (swamp lum 56 -> 99
  against a 71 floor; tundra variant spread 76 -> 9.9 against 48). Tundra's
  0.093 saturation correctly triggers the Pass 9 near-neutral rule.
- ART SESSION 5 (water pair v1 + technique amendment, 2026-08-02): OCEAN and
  FRESHWATER approved on a three-candidate bake-off and its freshwater
  follow-up. TWELVE OF TWELVE BIOMES now wear real art; the terrain-sheet
  category is complete.
  RECON BEFORE SPEC, and the renderer disagreed with the contract doc: the
  shipped cycler is a THREE-frame loop (anim-2, anim-3, anim-4, wrapping
  anim-4 back to anim-2) at 450 ms with ONE GLOBAL PHASE written to every
  water tile on the same tick - not the four-frame base-to-anim cycle the
  brief described and had never shipped. Three consequences now written into
  the brief: base-0..3 are a STREAM-IN FLASH only (painted at chunk build,
  overwritten within 450 ms, never seen again); the loop has no rest frame;
  and the 17 fringe cells NEVER animate, so every coastline is a static ring
  around moving water. That last one produced a new derived band -
  FRINGE COHERENCE, D(base-0, anim_k) <= D_var - because the shoreline is cut
  from base-0 and must read as the same material as the water it borders.
  A four-frame cycle and animated fringes are both renderer changes: parked
  as amendment territory, not assumable by an art drop.
  TECHNIQUE AMENDMENT (Casey verdict C2): animated water is a technique
  EXTENSION of the terrain lock, recorded as `terrain-water` in
  art/style-locks.json. One create_tiles_pro run per water biome, prompted as
  a numbered travelling-ripple CYCLE; the three anim cells are the 3-SUBSET of
  that run whose pairwise deltas all sit in the temporal band with the
  smallest spread (a 3-cycle visits all three pairs whatever order it plays,
  so the choice is a subset, not an ordering); base-0 is the remaining tile
  nearest that triple's centroid, since base-0 is both the fringe source and
  the stream-in frame. Bands derived from the ten shipped sheets, never
  invented: D_var 13.24 is the game's own accepted difference between two
  draws of one biome, coherence 0.5*D_var, liveness 0.1*D_var, loop closure on
  the real wrap, fringe coherence, and a seam index normalised by the LARGEST
  interior boundary (the first draft divided by the mean and was
  ill-conditioned on flat tiles - NaN on grass, 31 on tundra, with nothing
  wrong with the art).
  ANIMATE-WITH-TEXT-V3 REDRAWS, IT DOES NOT EVOLVE - the bake-off's most
  reusable finding. Candidate C3 pinned its loop EXACTLY (last frame vs first
  = 0.00) but its consecutive deltas ran 0.12, 22.76, 15.80, 24.60, 11.40,
  13.20: near-copies punctuated by full redraws, and NO three-frame subset of
  the generated cycle fit the coherence band at all. TILE LOOPS: NO - the
  surface cannot hold a texture stable across frames, which is exactly what a
  tiling ground needs. FUTURE CHARACTER ANIMATION: MAYBE - a walk cycle wants
  the silhouette to change every frame, which is the same behaviour read as a
  feature rather than a defect. Worth a bake-off of its own when the walk
  framework thaws; do not assume either way from this result.
  MECHANICAL DERIVATION (C1) passed every band and stays documented in the
  amendment as the fallback control: seamlessness, exact palette preservation
  and loop closure hold BY CONSTRUCTION there, so a water biome that cannot be
  generated cleanly can still be dressed. Its own lesson: amplitude is not the
  knob, because nearest-neighbour sampling quantises displacement to whole
  pixels (bisecting amplitude converged on the jump point and overshot the
  ceiling, 5.15/7.79 against 6.62); crest SHARPNESS is the continuous handle.
  STANDING BATCH POLICY, two rules now in docs/art-pipeline.md and applying to
  every category. (1) TILE SELECTION IS BY BAND, NEVER BY FILE ORDER. Sessions
  1-4 took the first four tiles of a 16-tile run; that was never a ruling,
  just what the scratchpad script sliced, and it is disclosed rather than
  quietly changed. The corrected OCEAN run came back BIMODAL - first four
  tiles texture-dead (luminance sd ~1) while later tiles in the SAME run
  carried real texture in band - so file order would have reported a false
  failure and, worse, handed mechanical derivation a flat field it cannot
  animate at all. APPROVED ART STAYS APPROVED: no regeneration debt for
  anything already shipped. (2) ANCHORS ARE READ FROM SOURCE, NEVER RETYPED.
  This session typed OCEAN's anchor with one hex digit wrong and shifted a
  whole luminance band by three units. Anchors moved to a new LEAF module
  src/world/biome-anchors.ts (a leaf because terrain-placeholder imports
  flora-config, so keeping them in the former would have closed an
  initialisation cycle through FLORA_PROPS); the six prop anchors in
  flora-config now reference BIOME_COLORS by Biome instead of duplicating
  literals; and a new `anchor-source` gate check fails on any retyped anchor
  in tracked src/scripts/tools code. It caught a literal in its own comment on
  the first run.
  SYNTHETIC HARNESS ROWS (landed as their own commit before any generation
  call): fixture-harness-a and -b are permanently synthetic FLORA_PROPS rows
  that never render, never count as art debt and are REFUSED by art:approve,
  enforced by the new `fixture-row-inert` check. They end the treadmill where
  the three batch-machine checks were repointed at whichever real asset was
  undressed that month and silently retired when it shipped (Art Session 4
  lost three that way, and this session dressed the last two biomes - there
  was nothing left to borrow). Two checks had to change and were STRENGTHENED:
  priority-lock now counts real and fixture rows separately, and lint-wired's
  bad-asset half had been pointed at prop-waystone, a portal-waystone row the
  terrain-prop batch never targeted, so that half was already dead.
  FRESHWATER SITS CLOSE TO ITS CEILING, stated rather than buried: it clears
  coherence at 6.55-6.58 against 6.62, with only 5 of 560 subsets qualifying,
  where ocean sits at 3.35-3.45. Approved on the in-game preview knowing that;
  expect freshwater to read as the livelier surface. Its first attempt failed
  differently and instructively - every spatial band passed but ZERO of 560
  subsets qualified (deltas 16.75-43.53), because the phase prompt is not
  reliably read as one surface over time. Ask for "almost the same image four
  times" with the crest step named in pixels.
  SPEND: 101 generations of the 120 session ceiling (running 520 of 2000,
  $0.00 credits). Itemized: ocean base attempt 1 (seed 74001, every tile out
  of band) 20; ocean phase run for C2 (74002) 20; ocean base attempt 2 (74003,
  corrected) 20; C3 animate-with-text-v3 6 frames at 32x32, 1; freshwater
  attempt 1 (74005, no qualifying subset) 20; freshwater attempt 2 (74006,
  approved) 20. Three ocean tile runs at the bake-off cap, two of them the
  same asset's two attempts under correction discipline; freshwater used both
  of its permitted runs.
  STILL QUEUED: swamp/desert props (with log-b to complete the log pair),
  the waystone hero-object mini bake-off, per-region palette divergence, and
  the dressed-forest density ride.
- ART SESSION 6 (flora closeout, 2026-08-03): SWAMP TREES a/b, LOG-B and
  SCRUB-A approved; the flora batch queue is empty. The swamp gains a DEBRIS
  understory (log-a, log-b, stump-a at density 0.2 - deliberately below the
  PNW fern carpets at 0.35-0.45, because logs and stumps are occasional
  debris and a swamp floor at fern density reads as a lumberyard).
  CACTUS-A EXITS THE GLOBAL DESERT PALETTE (Casey verdict, overriding the
  staged 10:1 reweight). Recon found cactus-a had been in the live global
  DESERT palette since Pass 5 - the fence everyone remembered was only ever
  on the ART, never on the palette, so Egypt has been rolling cacti all
  along, drawn as placeholder silhouettes where nobody looked. A weight of 1
  is still a cactus in Egypt, so the row leaves the palette entirely. It is
  now in NO palette, which fences it as `unscattered-prop`: FENCED BY PALETTE
  ABSENCE, so no cactus art can be batched until somewhere exists that should
  grow one. CACTUS RETURNS VIA PER-REGION PALETTE DIVERGENCE, MEXICO CITY
  FIRST - as a REGIONAL entry, never a global one. This is now the concrete
  first consumer of the regional-divergence work that has been owed since
  Pass 7, and the reason to build it.
  SPECIES NOTE (ledgered per verdict): neither swamp tree reads unmistakably
  as BALD CYPRESS at 48x64 - no legible knees or moss drape survives at that
  size; they read as full broad-crowned swamp trees. Approved on FAMILY OVER
  SPECIES: at prop sizes the silhouette family is what carries, and asking a
  48x64 sprite to name its species is asking for detail the render size
  cannot hold. No regeneration debt. Carry the principle into future prop
  briefs - name the family and the silhouette, treat the species as flavour.
  BAND POLICY GAINS A PURPOSE RULE (docs/art-pipeline.md), ratified from
  log-b: when an asset's brief says it must DIFFER from its comparable, the
  comparable is a FLOOR or ceiling, never a centre. The session's band script
  carried a log-a plus-or-minus-15-percent class band AND a rule that log-b
  be fuller than log-a; both cannot hold, and the contradiction was visible
  in the code before either attempt ran. Corrected band ran log-a mass to
  stump-a mass; log-b landed at 0.402, 1.76x log-a, inverting at IoU 0.428.
  SCRUB-A IS A RECLASSIFIED BAND-MISDERIVATION, NO DEBT (Casey verdict): its
  luminance band came from salal-a, a lush dark rainforest evergreen, which
  is the wrong tonal reference for a sun-bleached desert shrub. Reported
  rather than quietly re-derived. Corollary now in the docs: check the
  comparable belongs to the same world before deriving from it.
  APPROVED CANOPY PROPS GAIN THEIR BAND-CHECKED ANCHORS (the Session 3/4
  pattern): swamp-tree-a/b at the SWAMP anchor, scrub-a at the SAVANNA anchor
  it was generated against, all read from src/world/biome-anchors.ts.
  SPEND: 7 generations of the 24 round cap (4 first attempts + 3 corrections
  for swamp-tree-a, log-b and scrub-a); running 528 of 2000, $0.00 credits.
- ART SESSION 7 (enemy-tint DECISION, 2026-08-03): THE ENEMY-TINT RULING IS
  RESOLVED - MODEL C, BAKED DOMAIN RIM (Casey verdict, after a three-candidate
  bake-off and one authorized follow-up stage). This unfences the largest
  blocked category in the manifest: every enemy row plus the hostile
  creatures. THE BESTIARY IS UNBLOCKED.
  THE MODEL: masters are canonical, rims are DERIVED. An enemy sprite is never
  authored with its domain in it - it is baked from (full-colour master) plus
  (the domain table in enemy-roster.ts) by npm run art:rims and nothing else.
  The body keeps its full painterly colour; domain rides an outer rim of pure
  UNMULTIPLIED DOMAIN_TINT. No runtime tint, no new pools, hit-flash
  untouched.
  WHY, IN NUMBERS: whole-body multiply costs 59 percent of luminance whatever
  the master, and lands all three domains at luminance about 34, so domain is
  carried by hue where hue reads worst. Pairwise separation came out 77.4
  physical-mental, 58.7 physical-spiritual and 33.3 MENTAL-SPIRITUAL - under
  this project own 48 threshold for "reads as the same thing", which is to say
  the shipped model cannot reliably distinguish two of its three domains. The
  baked rim carries the RAW tint distance instead: 237.4 / 180.2 / 102.2, its
  weakest pair three times the old best. A painterly master multiplied
  directly goes to (21,20,32) under the mental tint - effectively black - so
  Model A also forbids painterly enemy art entirely.
  THE COST, STATED: at shipped size the rim is 36 percent of the visible
  sprite, and on forest and swamp it separates by HUE at near-equal value
  (gaps of 12.6 and 16.5) rather than by value. Judged on the preview knowing
  that.
  THREE RULES, EACH GATE-ENFORCED by the new rims-derived check: (1) a canon
  fix stays a DATA edit plus a ZERO-CREDIT re-bake - the receipt is already in
  the roster, the lesser-evil-scouts canon fix touched fifteen zones worth of
  sprites as a one-character edit; (2) HAND-LANDING a rimmed sprite is
  FORBIDDEN, and art:rims --check re-derives byte-for-byte to prove it; (3)
  4 px is the DERIVED MINIMUM (masters fit by nearest-neighbour downscale, so
  a thinner rim can fall between samples and vanish) and the treatment is
  FROZEN - thickness, inner rims, gradients are all AMENDMENT TERRITORY with
  their own bake-off and approval.
  THE CHECK IS NOT ALLOWED TO BE VACUOUS. No masters exist yet, so the real
  --check has nothing to compare today. A PERMANENT SYNTHETIC MASTER drives
  the whole path in the gate instead - bake, pure-tint rim at exactly 4 px
  around an untouched body, clean re-derivation, hand-edit caught, unmapped
  domain refused. Same lesson as the Session 5 harness rows: a check that only
  asserts when real content happens to exist stops asserting the moment that
  content ships.
  MANIFEST-FENCES INVERTED RATHER THAN DELETED: the check used to assert every
  enemy row CARRIES enemy-tint-ruling and now asserts NO row carries it
  anywhere. A resolved ruling that leaves no check behind is how a fence
  quietly comes back.
  NO ENEMY STYLE LOCK WAS CREATED - that is the bestiary session opening
  bake-off, run under Model C. The nine live enemy sprites remain the
  grayscale gen-sprites placeholders until masters are painted.
  SPEND: 1 generation for the whole session (one bake-off master). Model C was
  derived in-repo at zero credits, which is the model arguing for itself.
  Bake-off assets archived under art-review/tint-decision/; nothing on live
  paths.
- ART SESSION 8 (bestiary opening, 2026-08-03): THE ENEMY STYLE LOCK IS
  CANDIDATE 0 (Casey verdict) - the master generated in Art Session 7 for the
  tint bake-off, re-judged against two fresh candidates and adopted at ZERO
  additional spend. Full provenance (tool, seed 76001, canvas, params, prompt,
  measured opacity/luminance/saturation/palette and rim-compat numbers) is in
  art/style-locks.json under `enemy`. Rejected: candidate A (dense paint,
  heavy outline, compressed values) and candidate B (sparse paint, selective
  outline, wide values). All three passed rim-compat; the lock was a look
  call, not a band call.
  THE ANGELIC RULING - UNMARKED STANDS, PROMOTED FROM CODE COMMENT TO CANON
  DATA. For four passes MainScene carried the line "canon says no domain tint
  on them", which is a promise nothing can check, and art:rims would have
  baked spiritual rims onto all three angelic families the day their masters
  landed. It is data now: UNMARKED_FAMILIES in src/world/enemy-roster.ts.
  The DOMAIN TABLE IS UNTOUCHED - angels are still spiritual as data, still
  gating spawns and marker colour; what changed is that the domain is never
  PAINTED. art:rims derives an unmarked family as IDENTITY, so the master
  ships byte-for-byte and rims-derived still enforces that identity: an
  unmarked master is as canonical and as un-hand-landable as a rimmed one.
  The dressing funnel reads the same table, so undeclared unmarked families
  keep their untinted look as DATA rather than a per-site exception.
  RATIONALE ON RECORD: the angelic silhouette IS the domain read - a winged
  radiant figure needs no ring to say what it is - and leaving them unmarked
  serves the moral inversion the bestiary is built around. A rimmed angel
  would read as one more colour-coded monster. BATCH 2 UNBLOCKS as unmarked
  masters.
  TOMBSTONE, so the ruling cannot erode: unmarked-families-tombstone asserts
  the canon table names all three angelics, that their domain DATA is intact,
  and - on a permanent synthetic pair - that an unmarked master derives as
  byte identity with ZERO rim while a marked family in the same run gets its
  rim. Permanent fixtures, so it cannot go hollow when real masters land.
  METRIC CALIBRATION IS NOW STANDING POLICY (docs/art-pipeline.md): calibrate
  a new metric on an input whose answer you already know BEFORE pointing it at
  art. The rim-compat band is the precedent - its first draft reported 176
  ring gaps on a master whose ring is continuous, because it counted crevices
  blocked by the creature own body as holes. A hard-edged synthetic master
  exposed it. The corrected CREVICE RULE (frame and own-body stop the walk
  without scoring a gap) is documented with the band. The failure this
  prevents is not a wrong number but regenerating good assets to satisfy a
  lying instrument.
  BESPOKE-SPAWN REACH UNDERCOUNT, ledgered: the roster rank uses zones times
  pack, where zones counts `enemyFamily:` markers in the world manifest.
  herald-angels and hollowed-brutes score ZERO there because they spawn
  through bespoke paths (spawnEuropeBrute and the herald spawner), NOT because
  players never meet them. Any future ranking that reads marker counts must
  add the bespoke spawners by hand or it will rank those two last for the
  wrong reason.
  BATCH PLAN PUBLISHED (art-review/enemy-lock/report.md): batch 1 is the six
  non-angelic families, batch 2 the three angelics as unmarked masters, batch
  3 the hostile creature rows (their own size and spawn recon needed), bosses
  and hero enemies later as 128px set-pieces.
  SPEND: 2 generations (candidate 0 was free); running 530 of 2000, $0.00.
  STEP 2 - THE FIRST BATCH - IS NOT DONE. The 30-generation round cap is
  untouched and the lock is now in place for it.
- ART SESSION 8 STEP 2 (bestiary roster v1, 2026-08-03): ALL NINE ENEMY
  FAMILIES APPROVED AND LIVE. Six MARKED families wear baked domain rims;
  three UNMARKED angelics ship as identity. The bestiary has real art.
  ROAD AMENDMENT (Casey, full-roster amendment): BATCH 2 DISSOLVED INTO
  BATCH 1. The published plan had the six non-angelics first and the angelics
  second; the amendment brought all nine at once, because the unmarked
  ruling's real verification is rimmed and unmarked standing in ONE brawl,
  and that had to be judged before six masters locked the look in isolation.
  RENUMBERED: hostile-creature rows are now BATCH 2 (were 3), bosses and hero
  enemies are BATCH 3 (were later). Angelic recon found no blocker, so the
  escape hatch went unused.
  UNMARKED BANDS ARE PURPOSE-DERIVED, and the comparable is named: canon says
  the reference is "the existing angel look", so the band comes from the
  shipped angel-divine.png (luminance 117.3, opacity 0.423) and
  cherub-enemy.png (opacity 0.290). RADIANCE FLOOR = 0.8 x angel-divine =
  93.8, because radiance is what REPLACES the rim as the domain read - an
  unmarked family that is not visibly brighter than the marked bestiary has
  no read at all. Opacity band 0.23-0.52 brackets both comparables. The three
  angelics land at 151.4 to 174.1 against a marked bestiary at 30.2 to 62.8.
  PIPELINE VERIFIED ON THE REAL TOOL, not asserted: art:rims derived 9
  sprites, 3 as identity; --check re-derives all nine byte-identically with
  the registry in sync; the three unmarked outputs are BYTE-EQUAL to their
  masters (zero rim) while corrupted-wildlife and dark-casters carry 2469 and
  2049 rim pixels. The registry is emitted by a real bake and never
  hand-landed - art:approve moves masters and rims, and the drift guard
  caught the registry as NOT among them, which is the rule working.
  PIXELLAB DROPS no_background ON LARGE CANVASES - the session's most
  reusable finding. All four 192x224 generations (dark-casters and the three
  angelics) came back FULLY OPAQUE at opacity 1.000, ignoring the flag and
  returning solid rectangles; the 96x136 and 120x152 ones were fine. Attempt
  2 at 96x112 with "single isolated figure cut out on empty transparent
  space" fixed all four. KEEP ENEMY MASTERS AT OR UNDER ~152 PX ON THE LONG
  EDGE.
  AND THAT EXPOSED A HOLE IN THIS SESSION'S OWN BAND: the unmarked check
  tested radiance but NOT alpha, so all three opaque angelics reported PASS
  and an opaque rectangle would have shipped into the preview. Opacity joined
  the unmarked band, bracketed from the angel comparables. This is the
  calibrate-a-metric-on-known-truth rule (made standing policy earlier in the
  SAME session) failing to be applied to the band written minutes later - the
  rule is only worth anything when it is run against the new band too.
  SPEND: 14 generations of the 30 round cap - 2 style-lock candidates, 8
  firsts (corrupted-wildlife reused the lock master at zero) and 4
  corrections. Running 544 of 2000, $0.00 credits.
  STILL QUEUED: batch 2 (hostile creature rows - their own size and spawn
  recon needed), batch 3 (bosses and hero enemies as 128px set-pieces), the
  waystone hero object, per-region palette divergence (cactus/Mexico City is
  its first concrete consumer), and the dressed-forest density ride.
