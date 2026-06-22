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
| Zoom out / in | **−/_** and **+/=** keys, or the **mouse wheel** | The **−** and **+** buttons stacked on the right edge |
| Talk to an NPC | Walk into them, **or** tap the **Talk** button (lower-right) when it appears | Same |
| Advance / close dialogue | **Tap anywhere** | **Tap anywhere** |
| Enter a building | Walk onto its glowing **doorway** tile | Same |
| Leave a building | Walk onto the **door** inside the room | Same |

**Zooming:** the two right-side buttons (and the keys/wheel) smoothly scale the
camera between a tight view on your character and the **entire Washington map**.
A quick **tap** zooms one step; **press and hold** keeps zooming until you let go
or hit a limit. The camera always stays following the player and never shows
empty space past the map edge; at full zoom-out the whole state is framed.

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

An authored, data-driven model of Washington — **800 × 500 tiles, 16px each**
(12,800 × 8,000 px, ≈10× the original prototype's area). Crossing it on foot is
a real trek.

West → east, it includes:

- Pacific coast: ocean with beaches; the Strait of Juan de Fuca
- Olympic Peninsula: temperate **coastal rainforest** around the impassable
  Olympic Mountains, with Lake Crescent
- Puget Sound + Hood Canal (with walkable islands) and **wetland/marsh**
  estuaries; the urban lowland corridor (Seattle, Tacoma, Everett, Olympia,
  Bellingham)
- Western Cascade slope: **montane evergreen forest** and foothills
- Cascade crest: alpine snow peaks (Baker, Glacier Peak, Rainier, Adams, St.
  Helens) with **three walkable passes**, and Lake Chelan
- Eastern Washington: shrub-steppe across the Columbia Basin, rocky
  **scabland/coulees**, the **Palouse** wheat farmland in the SE, the forested
  **Okanogan highlands** in the N, and Spokane
- Rivers (crossed only at bridges): the Columbia, the Snake, and tributaries

The 18 terrain types: ocean, sound, lake, river *(all block)*; bridge, beach,
coastal rainforest, lowland forest, montane forest, meadow/grassland, foothills,
mountain pass, shrub-steppe, scabland, farmland, wetland, urban *(all walk)*; and
alpine peak *(block)*. Each has a distinct placeholder color — no downloaded art.

The map is stored as editable JSON in `src/map/washington.map.json`, organised
into a grid of **zone chunks** (so streaming can be added later) and produced by
the authored, code-based region model in `tools/generateMap.mjs`. The whole state
renders as a single Phaser GPU tilemap layer. The JSON is ~0.9 MB raw but gzips
to ~26 KB, so it downloads fast on a phone.

## Tuning the feel

Two constants in **`src/game/settings.ts`** control the journey:

| Constant | Default | Effect |
| --- | --- | --- |
| `PLAYER_SPEED` | `130` | Walking speed in px/sec. Higher = faster travel. |
| `CAMERA_ZOOM` | `1.6` | Camera zoom at startup. Lower = pulled back; higher = zoomed in. |
| `ZOOM_STEP` | `1.5` | How much one tap of the +/− buttons changes the zoom. |
| `ZOOM_TWEEN_MS` | `200` | Settle time of the smooth zoom tween after a tap (ms). |
| `ZOOM_HOLD_RATE` | `3.0` | Continuous zoom rate while a button/key is held (×/sec). |
| `ZOOM_IN_LIMIT` | `2.2` | Tightest (most zoomed-in) the camera may go. |
| `ZOOM_OUT_MARGIN` | `1.08` | Margin at full zoom-out. The OUT limit (whole map fits) is computed live from the map + screen size — never hardcoded. |

Map size lives in `tools/generateMap.mjs` (`WIDTH` / `HEIGHT`); change them and
re-run `node tools/generateMap.mjs` — cities, rivers, bridges, and the town
re-derive automatically because everything is anchored to geographic features.

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
    settings.ts                # tunable constants: PLAYER_SPEED, CAMERA_ZOOM
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
    ZoomControls.ts            # +/− zoom buttons, keys, wheel (full map ↔ character)
tools/
  generateMap.mjs              # authored Washington region model -> JSON
```

The terrain renders through Phaser 4's GPU tilemap layer (with a CPU fallback on
the rare device without WebGL). The whole state renders at once; the source data
is chunked so streaming can be added later without a rewrite.
