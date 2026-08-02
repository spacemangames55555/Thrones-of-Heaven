# Thrones of Heaven — Gate Flake Log

Confirmed flakes of SHIPPED gate checks: a failure that passed on a clean
re-run with zero code change (or was root-caused to harness timing and
hardened without touching assertions). STANDING RULE (also in the ledger):
a SECOND confirmed flake on the same check ⇒ a dedicated stabilization
commit for that check — no third rerun.

MECHANISM FAMILIES (Casey ruling, Art Session 5): where rows share a root
cause, the STRIKE IS COUNTED PER FAMILY, not per check. Otherwise a single
flaky mechanism can blink through five different checks and never earn its
fix. Families in use: **perf-measurement variance** — any assertion that
compares two singly-sampled timing/throughput numbers under swiftshader.

| Check | First flaked | Confirmed clean | Status |
|---|---|---|---|
| tile-LOD zoom timing (Pass 3 family: world-zoom frame stalls under swiftshader load; also ground-FPS once) | Pass 3–5 gates, multiple sessions (e.g. Pass 5 Commit 1 first run) | Clean re-runs, no code change | KNOWN-TIMING: waits already widened in Pass 4 (fadeMs + 1200 settle). Next flake ⇒ stabilization commit |
| dot-on-evicted (combat hotfix suite) | Pass 6A Commit 1 gate, run `b78x3x2l4` (`dotLive:false` — funnel recompute needs frames; swiftshader stall) | Root-caused analytically; precondition wait hardened to a poll (assertions unchanged) in the Pass 6A bake commit; green ever since | STABILIZED |
| skill tree ux: hold-to-read | Pass 6A-addendum audit gate, run `btkfgwl0u` | Clean re-run `bbwg9okt2` (265/265), zero code change | ONE CONFIRMED FLAKE — next one ⇒ stabilization commit |
| samurai ext — dash-and-fire (mid-dash movement distance under frame stalls) | Pass 6B Commit 1 gate, run `b65enlx8c` (moved 113.99 vs 189.99 clean; the bolt landed identically) | Clean re-run `bioq1r7bb` (269/269), zero code change | ONE CONFIRMED FLAKE — next one ⇒ stabilization commit |
| death respawn (egypt-in-globe) (`alive:false` — the 1500 ms scene-time death banner overran the check's 2300 ms wall-clock wait under a swiftshader frame stall; position untouched, same fixture coords as the passing runs) | Pass 6C Commit 1 gate, run `bc23r8h83` (283/284) | Clean re-run `bb1l814rd` (284/284), zero code change | ONE CONFIRMED FLAKE — next one ⇒ stabilization commit |
| orientation FPS parity (Rome ground zoom) | Art Session 4 final gate, run `bekyybceg` (322/323; landscape 29.7 vs portrait 35.3 = 84.1% against an 85% floor) | RULED OUT BY MEASUREMENT, not by re-running: a focused probe at the same spot showed the new understory tier renders **zero** instances there (scatter/understory/fringe all 0 — that spot sits below the prop zoom thresholds), and three back-to-back orientation samples gave landscape/portrait ratios of 1.036 / 1.030 / 1.018. Both absolute numbers also beat the check's own 2026-07 baseline (25.6/26.1). Then a clean gate re-run, zero code change | ONE CONFIRMED FLAKE — next one ⇒ stabilization commit (candidate fix: sample both orientations twice and take the better ratio, or lengthen the post-resize settle). **MECHANISM FAMILY: perf-measurement variance** (Casey ruling, Art Session 5) — a timing/throughput number sampled once under swiftshader, where the assertion is a RATIO of two such samples. The family, not just this check, carries the strike: the SECOND failure anywhere in **perf-measurement variance** triggers the double-sample stabilization across the family, not a third re-run of whichever check happened to blink. Current family members: this check; the tile-LOD/ground-FPS timing row above is the same mechanism and is hereby counted in it. |
