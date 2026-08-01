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
