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
- [x] **alps-high-pass** — done. The Brenner summit corridor; gates to Tyrol (Burgundy + Vienna links arrive with theirs). Entry anyOf(bur-02, tyr-03) — the tyr arm is live now, the Bard-road arm activates when Burgundy builds. alp-01's region-champion (Physical) is a marker.
- [x] **vienna-river-muster** — done. Danube city; Alps↔Vienna gates — the Blacksmith spine now runs Munich→Tyrol→Alps→Vienna. Belgrade link (and the vie/car anyOf merge) arrives with belgrade-iron-river next batch.
- [x] **belgrade-iron-river** — done. Balkan city at the confluence; the DANUBE MERGE is live — entry anyOf(vie-02, car-02), gates both ways to Vienna AND the Carpathians. The German and Russian roads now meet here. bel-02's region-champion (Physical) is a marker.
- [x] **vardar-corridor** — done. Balkan-highland corridor; Belgrade↔Vardar↔Thessaloniki gates close the LAST link of the march trunk — var-02 (Thessaloniki's primary anyOf arm) is now earnable in-world. The eastern/central spines reach Azazel's muster on foot.
- [x] **london-grey-chorus** — done. BARD home city (class unbuilt — chain locked until Bard ships or the dev override). Isolated until kent-passage. TODOs: lon-01, lon-03 prose.
- [x] **kent-passage** — done. Chalk-coast corridor; London↔Kent gates. Its Channel dock activates with calais-landing (next).
- [x] **calais-landing** — done. The CHANNEL CROSSING is live — "Sail to…" dock gates both directions between Kent and Calais (the region's second sea gate).
- [x] **paris-veiled-lights** — done. Urban-river city; Calais↔Paris gates. par-01 is loop-authored story (no TODO — its summary is the intent line).
- [x] **burgundy-vintners-road** — done. Vineyard-hills corridor; Paris↔Burgundy and Burgundy↔Alps gates close the Bard road into the Alps — and with it the WHOLE REGION: all 25 zones built, 50 gates (all 25 manifest connections, both directions), every spine converging on Thessaloniki → Thermopylae → Delphi.

**EUROPE REGION COMPLETE** — 25/25 zones stamped and quest-registered. Remaining for later phases: hand-authored prose (all HAND_AUTHORED_TODOs), the class-start feature (home-city openers are manual-start), and the Delphi portal machine.

**COMBAT ACTIVATION (mapped families):** corrupted-wildlife/evil-raiders (wolf/raider townsfolk), lesser-evil-scouts (demons), herald/warden/lesser angels now spawn LIVE per-chunk (activate ≈700px from the chunk edge, despawn at ≈1400px, cap 48 — observed peak 11 on a 3-chunk crossing). Clear beats count family kills in-zone (5) and eu-10's harvest counts guardian/lesser-angel kills (8), both with live tracker suffixes mirroring the NA arc counters. NEW families (dark-casters, veil-ambushers, hollowed-brutes, corrupted-spirits) and region-champions stay markers until their AI run. Escort/fetch/story beats remain structural.

### Africa — the Rift march (sparse `africa` world; stamp in manifest order, one atomic commit per zone)

> SETUP RUN (no zones stamped): the `africa` sparse world is registered in the
> next X-band east (origin 32.0°N 13.0°E, same px/degree as earth/europe, span
> 25°×38°). The Europe pipeline was generalized to be world-keyed (region live
> registry, spawn activation, gates, champions, escorts) — Africa reuses it
> as-is. The first CROSS-WORLD gate pair is live: the Egypt map's south-edge
> Nile-exit pad ↔ the future Luxor chunk anchor ("Cross to…" both ways).
> EGYPT FINDINGS (cai-01..04): the hand-built Egypt world has NO existing
> quests/NPCs, so path (b) was taken — cai-01..cai-04 register as NEW factory
> beats, class-gated (Wizard), manual-start. Their objectives complete via
> their factory triggers today; binding them to live Egypt spawns/locations is
> the Cairo integration build run's job.

- [x] **cairo-nile-crown** — done (pre-existing, hand-built — never stamp). Corresponds to the existing Egypt world + Faiyum, exactly as Seattle corresponds to the Washington map. Chain registered (Wizard-gated, manual-start): cai-01 mentor / cai-02 clear / cai-03 discovery / cai-04 first-evil. TODOs: cai-01, cai-03 prose.
- [x] **luxor-valley-of-kings** — done. FIRST Africa chunk (nile-valley placeholder) through the shared region pipeline (stampRegionZoneChunk, factored out of Europe's builder — Europe re-verified green on the same code). The Egypt↔Africa cross-world gate now lands ON the chunk (snapped walkable, d=0 both ways); lux-01 clear + lux-02 fetch chained off cai-04. Live spawns: corrupted-wildlife + lesser-evil-scouts.
- [x] **aswan-first-cataract** — done. Nile-cataract corridor; Luxor↔Aswan gates both ways. asw-01 escort + asw-02 clear chained off lux-02 — the Wizard's Nile road now walks Luxor→Aswan. (Harness note: the cross-world gate check now selects the Egypt↔Africa pair by POSITION — internal Africa gates share destWorld and had fooled its find().)
- [x] **nubia-black-pyramids** — done. Desert-highland corridor; Aswan↔Nubia gates. nub-01 THE KUSHITE SENTINEL (Spiritual, aoe-slam) is LIVE at the boss anchor via the champion engine; nub-02 clears dark-casters. First Africa zone with the new families (casters + ambushers) spawning per-chunk.
- [x] **sudd-drowned-road** — done. Marsh corridor; Nubia↔Sudd gates (the longest Nile-road crossing). sud-01 clears the reed ambushers; sud-02 escort runs the caravan through the marsh — its arm of Victoria's anyOf entry is now earnable.
- [x] **victoria-source** — done. Lake-shore city — THE NILE/CONGO MERGE: entry anyOf(sud-02, vir-02); the sud arm is earnable now, the Congo arm activates when Virunga builds. Sudd↔Victoria gates (Virunga + Serengeti links arrive with theirs). vic-01 loop-authored story; vic-02 escort out of the lake city.
- [x] **serengeti-long-grass** — done. Savanna corridor; Victoria↔Serengeti gates. ser-01 clear; ser-02 THE RIFT WARDEN (Physical, charge) live at the boss anchor — Ngorongoro's entry prerequisite.
- [x] **ngorongoro-outpost** — done. Act IV holy-highland outpost (walled footprint); Serengeti↔Ngorongoro gates. af-01 (Azazel's patron arrival) is structural with HAND_AUTHORED_TODO prose; af-02 harvests radiant-guardian light (angel packs live). The Rift march is open to the crater rim.
- [x] **rift-descent** — done. The 8-beat Act IV march down the Rift wall (holy-highland); Ngorongoro↔Rift gates; angel packs + af-08's Kneeling Angel boss beat live; af-10 harvest counts guardian/lesser-angel kills. af-06 scaffolds TWO class-variant TODOs (wizard / witchdoctor) — the factory's callback classes are now PER CONTINENT (Europe keeps its five; smoke asserts the per-continent count). TODOs: af-03, af-06 ×2, af-07, af-09 prose.
- [x] **olduvai-cradle** — done. The portal terminal chunk (portal-threshold, small footprint); Rift↔Olduvai gates. NO portal machine built (structure only) — af-11 (mask drop) + af-12 (threshold) are HAND_AUTHORED_TODO structural beats. The Rift march is walkable end to end: Cairo/Egypt → Luxor → … → Olduvai.
- [x] **kinshasa-river-drum** — done. WITCH DOCTOR home city (rainforest-river; class kit unbuilt — the chain is class-gated + manual-start and unlocks via the dev override until the kit ships). Fresh starts verified clean (the home-city guard). Isolated until Ituri (next). TODOs: kin-01, kin-03 prose.
- [x] **ituri-green-cathedral** — done. Deep-rainforest corridor; Kinshasa↔Ituri gates open the Witch Doctor spine. itu-02 THE CANOPY KING (Mental, summon-adds — calls in the zone's own wildlife/ambushers) live at the boss anchor; itu-03 fetch chains toward the lakes.
- [x] **virunga-smoke-mountains** — done. Volcanic-highland corridor; Ituri↔Virunga AND Virunga↔Victoria gates close the Congo road — vir-02's escort makes Victoria's second anyOf arm earnable, and with it the WHOLE REGION: all 12 stampable zones built (13 with pre-existing Cairo), every spine converging on Ngorongoro → the Rift → Olduvai.

**AFRICA REGION COMPLETE** — 13/13 zones (Cairo pre-existing/hand-built, 12 stamped + quest-registered, all PLAYABLE in one pass: live spawns, champions, escorts, kill objectives). Remaining for later phases: hand-authored prose (all HAND_AUTHORED_TODOs), the Wizard/Witch-Doctor class-start feature, and the Olduvai portal machine.

**GROUND LAYER (sparse worlds):** Europe + Africa now draw REAL continents
beneath their chunks — a bundled 720×360 land/water + coarse-biome raster
(17.5KB RLE) sampled through each world's lat/lng calibration, rendered as a
camera-windowed pooled layer (cell cap 9000 at any zoom, hysteresis like the
enemy chunks). Land is walkable; WATER BLOCKS the void (gates remain the
travel). Dense hand-built worlds (Earth/Heaven/Hell/Egypt/Faiyum) get none.
DATA SOURCE + LICENSE: derived from Natural Earth 110m land polygons
(naturalearthdata.com) — Natural Earth is PUBLIC DOMAIN (free for any use, no
attribution required). Regenerate with `node tools/generateEarthRaster.mjs`.

**GLOBE CONSOLIDATION:** the 'europe' and 'africa' region worlds are MERGED
into ONE whole-planet sparse world — id 'globe', origin 85°N 180°W, span
360°×170°, same pixels-per-degree — with all 37 generated zones re-stamped at
their TRUE manifest lat/lng through the one shared calibration. The continents
share walkable ground (Levant/Anatolia land bridge verified; no Europe↔Africa
gate). NA seeds + Cairo remain pre-existing / never stamped. The Egypt↔Luxor
cross-world gate lands at Luxor's true position. Saves referencing the removed
worlds migrate at v12 (re-pointed to the globe arrival). Future continents
stamp into 'globe' — no new world plumbing needed.

## ASIA — The Kunlun March (17 zones, manifest registered, NOTHING stamped yet)

Stamps into the EXISTING 'globe' world at true positions (no new world, no new
calibration, no new residency band). Three home cities: Lhasa (Monk), Kyoto
(Samurai), Bali (Atlantean) — class kits unbuilt; chains class-gated +
manual-start. as-06 scaffolds THREE class-variant TODOs (monk / samurai /
atlantean). Build order = manifest order:

- [x] lhasa-prayer-citadel — done. Monk home city stamped on the plateau (class-gated manual-start chain; gates arrive with the Changtang). TODOs: lha-01, lha-03 prose.
- [x] changtang-empty-crossing — done. High-plateau corridor; Lhasa↔Changtang gates open the Monk spine; The Plateau Stormer (Physical, charge) live at the boss anchor.
- [x] hoh-xil-roof-of-world — done. High-desert corridor; Changtang↔Hoh Xil gates; hox-01 caster clear live; hox-02 pilgrim escort live (one Jade Gate anyOf arm earnable).
- [x] kunlun-jade-gate — done. Act IV holy-highland outpost (walled footprint); Hoh Xil↔Jade Gate gates; angel packs live; as-02 light-harvest live. as-01 (Azazel patron arrival) structural TODO.
- [x] kunlun-ascent — done. The 8-beat Act IV pillar march; Jade Gate↔Ascent gates; as-04 clear + as-05 light convoy escort + as-10 final harvest live; as-06 scaffolds THREE class-variant TODOs (monk/samurai/atlantean). TODOs: as-03, as-06 ×3, as-07, as-09 prose.
- [x] kunlun-jade-court — done. Portal terminal chunk (portal-threshold, small footprint); Ascent↔Jade Court gates. NO portal machine built — as-11 (mask drop) + as-12 (threshold) are HAND_AUTHORED_TODO structural beats. The Monk road is walkable Lhasa → Jade Court.
- [x] kyoto-thousand-gates — done. Samurai home city stamped in Japan (class-gated manual-start chain; fresh starts verified clean). Isolated until the Inland Sea (next). TODOs: kyo-01, kyo-03 prose.
- [x] setouchi-inland-sea — done. Coastal corridor; Kyoto↔Inland Sea gates open the Samurai spine; set-01 raider clear live; the Shanghai sea-dock (boat-door) arrives when Shanghai builds.
- [x] shanghai-eastern-dock — done. Mainland dock city; the Inland Sea↔Shanghai SEA-DOCK pair (boat-doors) materializes — Japan connects to the mainland; sha-01 dock escort + sha-02 caster clear live.
- [x] three-gorges-river-teeth — done. Yangtze gorge corridor; Shanghai↔Gorges gates; The Gorge Witch (Mental, channel-beam) live at the boss anchor; gor-02 river convoy escort live.
- [x] sichuan-red-basin — done. Terraced-basin corridor; Gorges↔Sichuan gates; sic-01 raider clear live; sic-02 fetch (one Kham anyOf arm) structural.
- [x] bali-drowned-crown — done. Atlantean home city; the coarse raster reads its anchor as WATER, so the chunk IS the island (stamps its own walkable footprint; the surrounding water-void blocks — exits are the Java boat-doors, arriving with Java). Class-gated manual-start chain; fresh starts clean. TODOs: bal-01, bal-03 prose.
- [x] java-temple-shore — done. Island corridor; the Bali↔Java BOAT-DOOR pair materializes (the Atlantean road opens); jav-01 clear live; the Bangkok sea-dock arrives with Bangkok.
- [x] bangkok-delta-gate — done. Delta city; the Java↔Bangkok BOAT-DOOR pair lands the island road on the mainland; ban-01 delta escort live; ban-02 raider clear live.
- [x] angkor-stone-map — done. Jungle-temple corridor; Bangkok↔Angkor gates; The Temple Warden (Spiritual, summon-adds — calls the zone·s own ambushers/casters) live at the boss anchor; ang-01 story structural.
- [ ] yunnan-cloud-steps — corridor; escort up to the plateau
- [ ] kham-eastern-plateau — corridor; the sea road and island road merge → Jade Gate
