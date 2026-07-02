# World Build Progress

Tracker for the data-driven world pipeline (`src/world/world-manifest.ts` is the
source of truth; `world-builder.ts` stamps zones into region worlds;
`quest-factory.ts` wires beats into the existing quest system).

## Definition of Done (per zone)

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Adjacency resolves in **both** directions (`npm run smoke` graph check)
- [ ] Every quest beat passes the smoke check (instantiates + chains via QuestFactory)
- [ ] Hand-authored beats carry `HAND_AUTHORED_TODO` markers — **never invented prose**
- [ ] One atomic commit per zone

## Zones (manifest order)

- [x] **seattle-emerald-reach** — done (pre-existing, hand-built — do not regenerate or modify). Act I opening lives on the existing Washington world: the Enumclaw home town + the Seattle Druid tree-house city, with Act I quests 1–4 already in `QUEST_REGISTRY`.
- [x] **cascade-corridor** — done (pre-existing, hand-built — do not regenerate or modify). The Washington map's eastern travel corridor (Snoqualmie Pass, the Cascades investigation locations) with its Act II–III quests already in `QUEST_REGISTRY`.
- [x] **idaho-holy-outpost** — done (pre-existing, hand-built — do not regenerate or modify). The Idaho Holy Outpost exists at `HOLY_OUTPOST_POSITION` on the widened map, with the Azazel-patron Act IV quests (`act4-*`) already in `QUEST_REGISTRY`.
- [x] **ascension-march** — done (pre-existing, hand-built — do not regenerate or modify). The Act IV march is the existing assault chain (`act4-draw-them-down` → `act4-the-door-home`) with its layered angel encounters on the Idaho approach.
- [x] **heaven-portal-sawtooth** — done (pre-existing, hand-built — do not regenerate or modify). The corrupted Holy-Outpost portal machine + the `act4-heaven` mask-drop beat and the Enter Heaven crossing already exist.
