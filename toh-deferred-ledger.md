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
  per-tile elevation tint, set once at chunk build).
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
  TRINITY_ARENA carries a suspected shipped mistranslation (a hell-plane
  constant holding an earth-frame value; the spawn survives via the
  walkable-fallback) — flagged for a ruling, deliberately not changed.
