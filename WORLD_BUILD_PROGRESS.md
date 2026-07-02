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
- [x] **delphi-sanctuary** — done. The portal terminal chunk (portal-threshold placeholder, small footprint); gate pair to Thermopylae. The Priest spine is now walkable end to end (Rome→…→Delphi). NO portal machine built (structure only). TODOs: eu-11 (mask-drop) + eu-12 (threshold) prose.
- [x] **murmansk-bone-harbor** — done. Necromancer home city (frozen-coast placeholder, far-north chunk). The home-city guard proved out live: a REAL Necromancer fresh start stays on Earth with nothing auto-started; mur-01 waits for the class-start feature. Isolated until karelia-lakes builds. TODOs: mur-01, mur-03 prose.
- [x] **karelia-lakes** — done. Taiga corridor linking Murmansk south (gates both ways across ~17k px of void — the longest crossing yet); beats chained off mur-04. The Necromancer spine flows Murmansk→Karelia.
- [x] **smolensk-gate** — done. Mixed-forest corridor; gates to Karelia now, to Kyiv + Moscow when those build. smo-01's escort beat awaits combat wiring (marker only).
- [x] **moscow-crystal-court** — done. MAGE home city (per canon, Mage ≠ Wizard — this chain stays locked for Egypt's Wizard class and unlocks only for the future Mage). Gates to Smolensk; Bryansk link arrives next. TODOs: mos-01, mos-03 prose.
- [x] **bryansk-woodland** — done. Mixed-forest corridor; gates to Moscow — the Mage spine now flows Moscow→Bryansk. Kyiv link (and the smo/bry anyOf merge) arrives with kyiv-river-gate next batch. bry-02 is loop-authored story (no TODO).
- [x] **kyiv-river-gate** — done. Steppe-river city; the EASTERN MERGE is live — its entry anyOf(bry-02, smo-02) means either Russian road unlocks it, and it gates both ways to Bryansk AND Smolensk. kyi-01's region-champion (Mental) is a marker until combat wiring.
- [x] **carpathian-crossing** — done. Carpathian-pass corridor; gates to Kyiv (Belgrade link arrives with its zone). The eastern trunk now runs Murmansk/Moscow→Kyiv→Carpathians.
- [x] **munich-anvil-hold** — done. BLACKSMITH home city — the highest-stakes guard test (Blacksmith is the game's DEFAULT class): a real Blacksmith fresh start stays clean on Earth, mun-01 waits for class-start. Isolated until tyrol-forge-road (next). TODOs: mun-01, mun-03 prose.
- [x] **tyrol-forge-road** — done. Alpine corridor; Munich↔Tyrol gates open the Blacksmith spine. tyr-02's escort is a marker until combat wiring.
- [ ] **alps-high-pass** — pending
- [ ] **vienna-river-muster** — pending
- [ ] **belgrade-iron-river** — pending
- [ ] **vardar-corridor** — pending
- [ ] **london-grey-chorus** — pending
- [ ] **kent-passage** — pending
- [ ] **calais-landing** — pending
- [ ] **paris-veiled-lights** — pending
- [ ] **burgundy-vintners-road** — pending
