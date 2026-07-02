# World Build Progress

Tracker for the data-driven world pipeline (`src/world/world-manifest.ts` is the
source of truth; `world-builder.ts` stamps zones into region worlds;
`quest-factory.ts` wires beats into the existing quest system).

## Definition of Done (per zone)

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Adjacency resolves in **both** directions (`npm run smoke` graph check)
- [ ] Every quest beat passes the smoke check (instantiates + chains via QuestFactory)
- [ ] **`npm run verify:runtime` passes** — the built game BOOTS headlessly at 428×926 with
      zero page errors, every class gets a clean fresh start (no auto-started quests), the
      Europe world renders its chunks, and a real gate crossing lands. Any change touching
      live code paths is gated on this, not just tsc/build/smoke. (`npm run verify` chains
      build + smoke + runtime.)
- [ ] Hand-authored beats carry `HAND_AUTHORED_TODO` markers — **never invented prose**
- [ ] One atomic commit per zone

## Zones (manifest order)

- [x] **seattle-emerald-reach** — done (pre-existing, hand-built — do not regenerate or modify). Act I opening lives on the existing Washington world: the Enumclaw home town + the Seattle Druid tree-house city, with Act I quests 1–4 already in `QUEST_REGISTRY`.
- [x] **cascade-corridor** — done (pre-existing, hand-built — do not regenerate or modify). The Washington map's eastern travel corridor (Snoqualmie Pass, the Cascades investigation locations) with its Act II–III quests already in `QUEST_REGISTRY`.
- [x] **idaho-holy-outpost** — done (pre-existing, hand-built — do not regenerate or modify). The Idaho Holy Outpost exists at `HOLY_OUTPOST_POSITION` on the widened map, with the Azazel-patron Act IV quests (`act4-*`) already in `QUEST_REGISTRY`.
- [x] **ascension-march** — done (pre-existing, hand-built — do not regenerate or modify). The Act IV march is the existing assault chain (`act4-draw-them-down` → `act4-the-door-home`) with its layered angel encounters on the Idaho approach.
- [x] **heaven-portal-sawtooth** — done (pre-existing, hand-built — do not regenerate or modify). The corrupted Holy-Outpost portal machine + the `act4-heaven` mask-drop beat and the Enter Heaven crossing already exist.

### Europe — the Delphi march (sparse `europe` world; stamp in manifest order, one atomic commit per zone)

> VIA EGNATIA REROUTE: Epirus now connects to Thessaloniki (not Thermopylae), so
> EVERY spine passes Azazel's muster at the outpost before the Hot Gates. The
> Priest spine is now 7 zones (Rome → Campania → Apulia → Epirus → Thessaloniki
> → Thermopylae → Delphi). Thessaloniki's entry = anyOf(var-02, epi-02);
> Thermopylae's = eu-02 only.

- [x] **rome-eternal-seat** — done. First zone through the runtime bridge (sparse europe world registered in-game, chunk layers, gates, quest composition). Chain class-gated to Priest (playtest via DEV Class Override). TODOs: rom-01, rom-03 prose. Also fixed a create()-crash from the class-announcement wiring (announced before the quest UI existed).
- [x] **campania-shadow** — done. Corridor chunk (mediterranean-coast placeholder); Rome↔Campania gate pair verified with a real crossing; 3 beats chained off rom-04. Note: cam-02's region-champion (Spiritual) spawns via the boss beat when combat wiring ships — marker only today.
- [x] **apulia-eastern-dock** — done. Corridor chunk with the Adriatic dock pad (bridge tiles); Campania↔Apulia gates verified. Its sea gate to Epirus arrives with epirus-landing's commit (both endpoints must be built).
- [x] **epirus-landing** — done. First Greek chunk; the Adriatic SEA CROSSING is live — "Sail to…" dock gates both directions between Apulia and Epirus (fade-travel boat placeholder). Beats chained off apu-02.
- [x] **thessaloniki-outpost** — done. Act IV outpost chunk (holy-highland, walled footprint). Isolated until thermopylae-pass (next) and vardar-corridor (later batch) build — its gates arrive with those commits. TODO: eu-01 (Azazel patron voice) prose. Entry gated on var-02 (unbuilt → reads UNMET, correct).
- [x] **thermopylae-pass** — done. The Act IV march chunk: 8 beats, entry = anyOf(eu-02, epi-02) (the two tributaries merge here); gates BOTH ways to Thessaloniki and Epirus. TODOs: eu-03 / eu-07 / eu-09 prose + eu-06's FIVE class-variant scripts (bard/priest/blacksmith/mage/necromancer). The Delphi gate arrives with delphi-sanctuary (next batch).
- [ ] **delphi-sanctuary** — pending
- [ ] **murmansk-bone-harbor** — pending
- [ ] **karelia-lakes** — pending
- [ ] **smolensk-gate** — pending
- [ ] **moscow-crystal-court** — pending
- [ ] **bryansk-woodland** — pending
- [ ] **kyiv-river-gate** — pending
- [ ] **carpathian-crossing** — pending
- [ ] **munich-anvil-hold** — pending
- [ ] **tyrol-forge-road** — pending
- [ ] **alps-high-pass** — pending
- [ ] **vienna-river-muster** — pending
- [ ] **belgrade-iron-river** — pending
- [ ] **vardar-corridor** — pending
- [ ] **london-grey-chorus** — pending
- [ ] **kent-passage** — pending
- [ ] **calais-landing** — pending
- [ ] **paris-veiled-lights** — pending
- [ ] **burgundy-vintners-road** — pending
