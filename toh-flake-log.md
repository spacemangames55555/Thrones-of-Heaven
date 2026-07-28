# Thrones of Heaven — Gate Flake Log

Confirmed flakes of SHIPPED gate checks: a failure that passed on a clean
re-run with zero code change (or was root-caused to harness timing and
hardened without touching assertions). STANDING RULE (also in the ledger):
a SECOND confirmed flake on the same check ⇒ a dedicated stabilization
commit for that check — no third rerun.

| Check | First flaked | Confirmed clean | Status |
|---|---|---|---|
| tile-LOD zoom timing (Pass 3 family: world-zoom frame stalls under swiftshader load; also ground-FPS once) | Pass 3–5 gates, multiple sessions (e.g. Pass 5 Commit 1 first run) | Clean re-runs, no code change | KNOWN-TIMING: waits already widened in Pass 4 (fadeMs + 1200 settle). Next flake ⇒ stabilization commit |
| dot-on-evicted (combat hotfix suite) | Pass 6A Commit 1 gate, run `b78x3x2l4` (`dotLive:false` — funnel recompute needs frames; swiftshader stall) | Root-caused analytically; precondition wait hardened to a poll (assertions unchanged) in the Pass 6A bake commit; green ever since | STABILIZED |
| skill tree ux: hold-to-read | Pass 6A-addendum audit gate, run `btkfgwl0u` | Clean re-run `bbwg9okt2` (265/265), zero code change | ONE CONFIRMED FLAKE — next one ⇒ stabilization commit |
| samurai ext — dash-and-fire (mid-dash movement distance under frame stalls) | Pass 6B Commit 1 gate, run `b65enlx8c` (moved 113.99 vs 189.99 clean; the bolt landed identically) | Clean re-run `bioq1r7bb` (269/269), zero code change | ONE CONFIRMED FLAKE — next one ⇒ stabilization commit |
