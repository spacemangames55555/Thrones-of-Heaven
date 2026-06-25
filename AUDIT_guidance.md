# Thrones of Heaven — Guidance Audit (critical path → ending)

**Read-only audit. No code or gameplay changed.** This document maps every
progression beat from game start to the ending and records, for each, whether
the player is given (a) an active **quest**, (b) a **tracker objective**, and/or
(c) a **world marker / waypoint** — and flags the **guidance gaps** where a new
player could get lost.

> Generated as a static report for planning. Nothing here implies a code change.

---

## How the guidance systems actually work (so the table reads correctly)

There are **two separate "marker" systems**, and only one of them is a true
find-it-anywhere waypoint:

1. **Quest objective marker + edge arrow** — `ObjectiveMarker` driven by
   `MainScene.currentMarkerTarget()` → `QuestTracker.updateArrow`. A gold diamond
   beacon **plus an off-screen edge arrow** that points across the map. It is
   **Earth-only and quest-only**: `currentMarkerTarget()` returns `null` if
   `activeWorld !== WORLD_EARTH` *or* there is no active/offerable quest. This is
   the only system that guides you to something off-screen.
2. **`sinMarker`** (a second `ObjectiveMarker` instance, Hell-only) and the
   **static landmark labels** ("Holy Outpost", "Michael's Sanctum", "Satan's
   Lair", "Return Gate"). These are **world-space beacons / labels with NO edge
   arrow** — you only see them when you are already looking at that spot.

So: **quests drive a real compass; everything else is "a glow you'll see when
you're close."**

The **quest registry ends at `descent-4`** (`QUEST_REGISTRY` = the opening quest
+ 4 descent quests). Its own completion text says *"the climax is not yet
built."* **Every beat after the descent arc has no quest, no tracker objective,
and no edge arrow** — it is a chain of proximity-triggered encounters with static
landmarks.

---

## Critical-path table

| # | Step | Active quest? | Tracker objective? | World marker / waypoint? | How the player knows (or **GAP**) |
|---|------|---------------|--------------------|--------------------------|-----------------------------------|
| 1 | **Opening: Seattle NPC → Sasquatch → rift → angel's choice → corrupted** | ✅ `corruption-at-the-gates` | ✅ 3 objectives (beast → rift → face it) | ✅ Pre-accept arrow to NPC; objective marker+arrow to sasquatch/rift | **Fully guided.** Angel choice auto-fires on rift proximity; refusing auto-sets `corrupted` and **auto-enables Spirit Vision**. |
| 2 | **Descent 1–4** (guardsmen, farmers/shipment, OC angels, two reliquaries) | ✅ `descent-1..4` | ✅ every objective | ✅ marker+arrow to outpost / oregon-city / farm / reliquaries | **Fully guided** — *once you reach the patron.* Patron is a **spirit** at the Dark Outpost, visible only with Spirit Vision (auto-on at corruption). Pre-accept arrow points to the outpost. Minor gap: nothing teaches that Spirit Vision reveals the patron (it just happens to already be on). |
| 3 | **Reach + corrupt the Heaven Portal** (Holy Outpost, flaming-sword guardians, corrupt interaction) | ❌ none | ❌ none | ⚠️ **static "Holy Outpost" landmark only** (pulsing ring+label at a fixed spot, no arrow) | **GAP (severe).** `descent-4` ends with a banner *"The way to the holy outpost lies ahead…"* but **no marker points there**. Player must wander to `HOLY_OUTPOST_POSITION` to see the landmark. Once there it is self-driving (proximity wakes guardians → defeat → "Corrupt the Portal" button → enter). |
| 4 | **Enter Heaven → fight to Archangel Michael** | ❌ none | ❌ none | ⚠️ static "Michael's Sanctum" label+ring; "✦ Heaven ✦" / "Return Gate" labels | **GAP.** No objective/arrow. Heaven has no waypoint system (the quest marker is Earth-only). Michael is found by exploring toward the labeled sanctum; he activates on proximity. |
| 5 | **Throne / God's judgment / power-swap → Hell portal opens** | ❌ none | ❌ none | ❌ no marker to the throne; Hell portal spawns at throne with no arrow | **GAP (severe).** After Michael falls, the judgment only fires if the player **walks within 220px of the throne** — but nothing points to the throne. A player who beats Michael and walks back to the Return Gate leaves Heaven with the finale un-triggered. |
| 6 | **Enter Hell → 7 Sins in order → lair unlocks** | ❌ none | ❌ none | ✅ **`sinMarker` beacon** on the next Sin, then on Satan's Lair (world-space, **no edge arrow**) | **Partly guided.** Best-covered post-descent beat: a beacon marks the current Sin and banners say "another Sin stirs deeper in Hell." But no tracker text and no off-screen arrow, so a Sin across the map is found by heading toward the glow. |
| 7 | **Unholy Trinity (Dragon→Beast→Satan) → ending → return to Seattle** | ❌ none | ❌ none | ✅ beacon on Satan's Lair (until the fight); ending is scripted | **Mostly guided into, then scripted.** Lair beacon + "Satan's Lair stands open" banner lead you in; proximity starts the Trinity; staged automatically through the redemption ending and the one-way Earth portal back to Seattle. |

---

## Beats implemented as triggerable encounters NOT wrapped in a quest/arrow

All of these are proximity/phase encounters with **no quest, no tracker
objective, and no edge arrow**:

- **Heaven-Portal guardian fight + corruption** — `guardianPhase` state machine;
  proximity `GUARDIAN_ACTIVATION_RANGE` → defeat → `Corrupt the Portal` button.
- **Archangel Michael** — boss proximity-activation.
- **God's Judgment / power-swap** — `updateGodJudgment`, fires within 220px of the
  throne, gated on `michaelDefeated`.
- **Hell portal traversal** — spawns at the throne post-judgment; entered by
  proximity.
- **The 7 Sins gauntlet** — `SinGauntlet`; covered by the `sinMarker` beacon, the
  closest thing to guidance in the back half.
- **Satan's Lair / Trinity** — `updateLairEntry` proximity → staged
  `TrinitySequence`.
- **PortalDefense** wave encounter — exists, not on the main critical path.

---

## Reusable systems for adding guidance (and how a new quest+marker is pure DATA)

- **Quest chain / registry** — `src/quest/questData.ts` (`QUEST_REGISTRY`) +
  `src/quest/QuestChain.ts` engine. Quests unlock by `prerequisites` (and optional
  `requiresCorruption`). **Adding a quest = append one `QuestDef`**; a template is
  in the file. No engine change needed *unless* you need a brand-new completion
  condition or marker location.
- **Objective tracker** — `src/ui/QuestTracker.ts`. Renders the active objective
  text **and the off-screen edge arrow** (`updateArrow`). Driven from
  `MainScene.updateObjectiveMarker()`.
- **World marker** — `src/quest/ObjectiveMarker.ts` (the gold beacon). Already
  instantiated twice (`marker`, `sinMarker`) — reusable for more.
- **To add a new quest + waypoint as data:**
  1. Append a `QuestDef` to `QUEST_REGISTRY` (id, prerequisites, objectives, NPC
     lines, `preAcceptHint`, reward).
  2. For each objective set `trigger` + `target`. **If reusing an existing
     trigger/target, that is the whole change.**
  3. Only if the beat needs a *new* completion event or a *new* marker location:
     add one `ObjectiveTrigger` + one `TargetKind` (in `questData.ts`), fire the
     trigger where the event happens in `MainScene`, and add one `case` to
     `resolveTarget()` returning the world position. Position constants such as
     `HOLY_OUTPOST_POSITION`, `THRONE_POSITION`, and `SATAN_LAIR` **already exist**.
- **Key structural limitation to design around:** `currentMarkerTarget()`
  hard-returns `null` outside `WORLD_EARTH`. **Heaven and Hell have no quest-arrow
  guidance at all today** — the throne and Michael have positions ready
  (`thronePos`, `MICHAEL_DEF.placement`) but the marker/arrow is suppressed
  off-Earth. Enabling guidance there needs that world gate widened (or the
  per-world beacon pattern `sinMarker` uses, extended with an edge arrow).

---

## Guidance gaps, ranked by how likely they are to strand a new player

1. **🔴 Throne / God's Judgment never pointed to (Step 5).** Highest stranding
   risk: the finale **silently fails to trigger** unless the player happens to
   walk near the throne after Michael. Beating the game's mid-boss and seeing
   nothing happen is the worst failure mode here. No marker, no arrow, no
   "approach the throne" objective.
2. **🔴 Holy Outpost / Heaven Portal not pointed to (Step 3).** The descent arc
   ends and the gold quest arrow **disappears entirely**. The only cue is one
   transient banner; the Holy Outpost is a fixed landmark you must stumble onto.
   Clean break in the guidance chain right at the Act 1 → Act 2 hand-off.
3. **🟠 Michael / Heaven navigation (Step 4).** Heaven has no waypoint system;
   only static labels. Survivable because Heaven is small and the sanctum is
   labeled, but a player can wander.
4. **🟠 Hell → next Sin across the map (Step 6).** Beacon exists but **no edge
   arrow** and no tracker text, so an off-screen Sin is found by guesswork +
   flavor banners. Mitigated by Hell's size and "deeper in Hell" prompts.
5. **🟡 Spirit Vision → patron is implicit (Step 2).** Vision auto-enables on
   corruption and the arrow points to the outpost, so it works — but nothing
   explains *why* a spirit patron is now visible. Low risk; cosmetic clarity
   issue.
6. **🟡 No tracker objective anywhere after `descent-4`.** Even where world
   beacons exist (Sins, Lair), the on-screen **objective tracker goes blank** for
   the entire back half of the game, so players lose the "current goal" text they
   were trained on in Acts 1–2.

---

## One-line summary

Guidance is solid and complete through the **opening + 4 descent quests** (quest
+ tracker + edge arrow), then **stops dead** — the entire climax (Heaven portal,
Michael, throne/judgment, Hell, Sins, Trinity) runs on proximity triggers with
only static landmarks and one Hell beacon. The two beats most likely to strand a
player are the **un-marked throne finale trigger** and the **un-marked Holy
Outpost** at the descent → climax hand-off.
