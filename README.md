# Thrones of Heaven — Washington State Map Prototype

The first playable build of **Thrones of Heaven**: a walkable, pixel-art,
top-down map of Washington State. This is the terrain foundation — later layers
(towns, quests, a hidden "Spirit Vision" layer, corruption zones) will overlay
this same map.

Built with **Phaser 4 + TypeScript + Vite**.

---

## Controls

| Action | Desktop | Touch (phone) |
| --- | --- | --- |
| Move | **WASD** or **Arrow keys** | **Virtual joystick** — touch anywhere and drag; a stick springs up under your finger. A faint ring in the lower-left shows where it lives. |
| Talk to an NPC | Walk into them, **or** tap the **Talk** button (lower-right) when it appears | Same |
| Advance / close dialogue | **Tap anywhere** | **Tap anywhere** |
| Enter a building | Walk onto its glowing **doorway** tile | Same |
| Leave a building | Walk onto the **door** inside the room | Same |

- Movement is free and smooth (analog 8-directional), not grid-snapped.
- You can't walk into water (ocean, Puget Sound, lakes, rivers), high mountain
  peaks, buildings, trees, or the corruption rift. The Cascades have two walkable
  passes so you can cross east↔west.
- You now spawn in the **town of Seattle**, in the town square.
- A readout in the top-left shows your world X/Y, the terrain under you (including
  town tiles like Road, Town Square, Corrupted Ground), and the nearest city.

## The town of Seattle

The Seattle area is now a small walkable town stamped seamlessly onto the
overworld — roads, a town square, buildings you walk around, and a few trees.
There are no walls or loading screens; you wander in and out freely.

- **The Wayfarer Inn** has a glowing doorway. Step onto it to enter a separate
  interior room (placeholder furniture + an exit door); walk back out the door to
  return to exactly where you were standing. The door/interior system is reusable:
  new buildings are just data (a door tile + an interior definition).
- A **quest-giver** stands in the square. Approach (or tap **Talk**) to read a few
  lines of placeholder dialogue. The dialogue system takes any array of lines, so
  future NPCs plug straight in.
- At the **eastern gate** sits a **Corruption Rift** — a cluster of dark/violet
  corrupted tiles with a pulsing marker. It's a visual story hook only (no
  gameplay yet); the NPC's dialogue points you to it.

---

## What's in the map

An authored, data-driven model of Washington (256 × 160 tiles, 16px each):

- Pacific Ocean and the Strait of Juan de Fuca
- The Olympic Peninsula with its impassable Olympic Mountains
- Puget Sound (with islands) separating the peninsula from the mainland
- The Cascade Range down the middle — Mt. Baker, Rainier, St. Helens, Adams —
  splitting the green wet west from the dry eastern steppe
- The Columbia River entering from the north and sweeping west to the ocean
- Labeled markers for Seattle, Tacoma, Olympia, Everett, Bellingham, Spokane,
  Yakima, Tri-Cities, Vancouver WA, Wenatchee, and Walla Walla

The map is stored as editable JSON in `src/map/washington.map.json`, organised
into a grid of **zone chunks** so streaming can be added later. It is produced
by the authored region model in `tools/generateMap.mjs`.

---

## Run locally (when you have your laptop)

Requires Node.js 18+.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
```

Then open the printed URL (e.g. `http://localhost:5173`) in a browser.

### Other scripts

```bash
npm run build    # type-check + produce a static build in ./dist
npm run preview  # serve the production build locally
```

### Regenerating the map

The map JSON is committed, so you don't need to regenerate it to run the game.
If you edit the geography in `tools/generateMap.mjs`:

```bash
node tools/generateMap.mjs
```

This rewrites `src/map/washington.map.json` and prints an ASCII preview plus a
terrain histogram so you can eyeball the shape.

---

## Deploy to Vercel (from the GitHub repo)

The project builds to static files and needs **zero extra configuration** — a
`vercel.json` is included that pins the Vite framework preset.

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. Go to <https://vercel.com> and sign in with GitHub.
3. Click **Add New… → Project**.
4. **Import** the `Thrones-of-Heaven` repository.
5. Vercel auto-detects the settings (Framework: **Vite**, Build Command:
   `npm run build`, Output Directory: `dist`). Leave them as-is.
6. Click **Deploy**.
7. When it finishes, open the generated URL (e.g.
   `https://thrones-of-heaven.vercel.app`) on your phone and play.

Every push to the default branch redeploys automatically. Pull requests get
their own preview URLs.

---

## Project structure

```
index.html                     # mounts the game canvas
src/
  main.ts                      # entry point — boots Phaser
  game/
    config.ts                  # Phaser game config (renderer, scale, physics)
    MainScene.ts               # overworld: map + town + player + NPC + portals
  map/
    washington.map.json        # authored map data (zone-chunked)
    mapTypes.ts                # TypeScript types for the map data
    GameMap.ts                 # stitches zones, paints tileset, builds GPU layer,
                               #   plus runtime tile edits (used to stamp the town)
  town/
    townTiles.ts               # extra town tile types (road, building, rift, …)
    townData.ts                # authored Seattle town layout (data-driven)
    TownBuilder.ts             # stamps the town onto the overworld + features
  interior/
    interiors.ts               # data-driven building interior definitions
    InteriorScene.ts           # reusable interior scene (enter/exit a building)
  entities/
    Player.ts                  # the player sprite + arcade movement
    Npc.ts                     # quest-giver NPC + dialogue lines
  input/
    Controls.ts                # keyboard + virtual joystick
  ui/
    CityMarkers.ts             # labeled city markers
    DebugReadout.ts            # X/Y + terrain + nearest-city HUD
    DialogueBox.ts             # reusable bottom-screen dialogue system
    TouchButton.ts             # reusable on-screen button (Talk)
tools/
  generateMap.mjs              # authored Washington region model -> JSON
```

The terrain renders through Phaser 4's GPU tilemap layer (with a CPU fallback on
the rare device without WebGL). The whole state renders at once; the source data
is chunked so streaming can be added later without a rewrite.
