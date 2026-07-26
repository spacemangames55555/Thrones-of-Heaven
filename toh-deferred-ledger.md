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
- World scale v2 (Pass 1 shipped flag-gated behind ?scale=v2): Pass 2 flips
  the default to v2 and replaces the TEMP render window (the ~200-tile
  zoom-out clamp) with real chunk streaming; mounts + the waypoint network
  ship in a later pass.
