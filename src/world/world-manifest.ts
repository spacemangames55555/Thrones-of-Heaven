// ─────────────────────────────────────────────────────────────────────────────
// THRONES OF HEAVEN — WORLD MANIFEST
// Source of truth for the world graph + questline. Lives at: src/world/world-manifest.ts
//
// HOW THIS WORKS
//   • The whole playable Earth = the WORLD array below. One entry = one Zone.
//   • A Zone is anchored to a REAL place (lat/lng). WorldBuilder converts lat/lng
//     to in-world pixels at the 50:1 scale — zones are never hand-placed in pixels here.
//   • connectsTo defines which zones are walkable/portal-linked to which. That
//     adjacency IS the world map graph. Every zone must connect to (and be
//     connected FROM) at least one other zone, or it’s unreachable.
//   • Each Zone carries its own ordered questChain. That’s how the main quest
//     line threads through the map.
//
// TO ADD A CITY: copy any zone block, change the fields, add it to WORLD, and add
//   its id to the connectsTo of at least one neighbor. That’s it — the build loop
//   and the verification gate do the rest. No engine code changes to add content.
//
// GUARDRAIL: anything flagged handAuthored: true (a zone OR an individual quest
//   beat) is a signature moment. The build loop scaffolds the structure and leaves
//   the prose/dialogue as a TODO. Breadth by loop, depth by hand.
// ─────────────────────────────────────────────────────────────────────────────

// ── Controlled vocabularies (typos here fail the build — that’s the point) ──────
export type ZoneKind =
  | 'city' // major settlement, quest hub
  | 'outpost' // small holy/evil forward base, 1–3 NPCs
  | 'corridor' // travel/combat stretch between anchors
  | 'dungeon' // instanced or gated combat zone
  | 'portal'; // Heaven portal site (terminal of the campaign spine)

// Campaign spine acts (1–50 story). Endgame faction layer (60+) is a separate system.
export type Act = 'ACT_I' | 'ACT_II' | 'ACT_III' | 'ACT_IV';

export type Tier = 1 | 2 | 3 | 4 | 5; // difficulty band; roughly maps to level range

export type QuestArchetype =
  | 'story' // scripted narrative beat (often handAuthored)
  | 'clear' // kill N / clear an area
  | 'fetch' // gather / retrieve
  | 'escort' // protect an NPC or convoy
  | 'boss' // single elite/boss encounter
  | 'portal_approach'; // the ritual/assault beats leading into a Heaven portal

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface QuestBeat {
  id: string; // globally unique, kebab-case
  archetype: QuestArchetype;
  title: string;
  summary: string; // 1 line of intent; enough for QuestFactory to wire objectives
  enemyFamily?: string; // which enemy family this beat pulls from (defaults to zone list)
  handAuthored?: boolean; // true = loop scaffolds structure, leaves prose to the designer
}

export interface Zone {
  id: string; // globally unique, kebab-case
  displayName: string;
  kind: ZoneKind;
  anchor: LatLng; // real Earth coordinates; WorldBuilder → pixels @ 50:1
  region: string; // e.g. 'Pacific Northwest'
  continent: string;
  pantheon: string; // mythology governing the region
  homeClass: string | null; // class native to this region (null if none)
  tier: Tier;
  act: Act;
  levelRange: [number, number];
  biome: string; // drives which PLACEHOLDER tileset the loop uses (not final art)
  enemyFamilies: string[]; // enemy families that spawn here
  connectsTo: string[]; // zone ids this connects to (defines the map graph)
  seaGates?: string[]; // subset of connectsTo rendered as boat-door/dock transitions (sea crossings)
  onHeavenApproach: boolean; // is this zone part of the march to a Heaven portal?
  heavenApproachOrder: number | null; // position in that march, else null
  portalSite: boolean; // does this zone HOST a Heaven portal?
  handAuthored: boolean; // reserve signature zones from the generator
  questChain: QuestBeat[]; // ordered main-line beats for this zone
}

// ── THE WORLD ─────────────────────────────────────────────────────────────────
// 5 seeded zones showing the full range: an Act I home city (hand-authored spine),
// a mid-game corridor (loop-authored), and the Idaho→Heaven vertical slice corridor
// (outpost → corridor → portal) with locked signature beats flagged.

export const WORLD: Zone[] = [
  // ── ZONE 1 — Act I home city. Hand-authored spine (the opening hours). ──────
  {
    id: 'seattle-emerald-reach',
    displayName: 'Seattle (Emerald Reach)',
    kind: 'city',
    anchor: { lat: 47.6062, lng: -122.3321 },
    region: 'Pacific Northwest',
    continent: 'North America',
    pantheon: 'Indigenous / Nature',
    homeClass: 'Druid',
    tier: 1,
    act: 'ACT_I',
    levelRange: [1, 12],
    biome: 'temperate-rainforest',
    enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['cascade-corridor'],
    onHeavenApproach: false,
    heavenApproachOrder: null,
    portalSite: false,
    handAuthored: true, // opening hours set tone — designer-written
    questChain: [
      {
        id: 's1-meet-mentor',
        archetype: 'story',
        title: 'The Warden of the Reach',
        summary: 'Meet your mentor; learn class basics on a training dummy.',
        handAuthored: true,
      },
      {
        id: 's1-first-blood',
        archetype: 'clear',
        title: 'Thinning the Wilds',
        summary: 'Cull 5 corrupted animals in the outskirts.',
      },
      {
        id: 's1-discover-corruption',
        archetype: 'story',
        title: 'Rot Beneath the Roots',
        summary: 'Discover the corruption and trace its source.',
        handAuthored: true,
      },
      {
        id: 's1-first-evil',
        archetype: 'boss',
        title: 'The First to Fall',
        summary: 'Battle the first true evil enemy; barely escape a horde home.',
        enemyFamily: 'lesser-evil-scouts',
      },
    ],
  },

  // ── ZONE 2 — Travel/combat corridor out of Act I. Loop can author fully. ─────
  {
    id: 'cascade-corridor',
    displayName: 'Cascade Corridor',
    kind: 'corridor',
    anchor: { lat: 47.2, lng: -121.4 },
    region: 'Cascade Range',
    continent: 'North America',
    pantheon: 'Indigenous / Nature',
    homeClass: null,
    tier: 2,
    act: 'ACT_II',
    levelRange: [12, 20],
    biome: 'alpine-forest',
    enemyFamilies: ['lesser-evil-scouts', 'evil-raiders'],
    connectsTo: ['seattle-emerald-reach', 'idaho-holy-outpost'],
    onHeavenApproach: false,
    heavenApproachOrder: null,
    portalSite: false,
    handAuthored: false,
    questChain: [
      {
        id: 'c1-clear-pass',
        archetype: 'clear',
        title: 'Hold the Pass',
        summary: 'Clear evil raiders blocking the eastern pass.',
      },
      {
        id: 'c1-escort-refugees',
        archetype: 'escort',
        title: 'The Long Walk East',
        summary: 'Escort refugees toward the Idaho outpost.',
      },
      {
        id: 'c1-supply-cache',
        archetype: 'fetch',
        title: 'Salvage',
        summary: 'Recover a supply cache to heal the outpost after the last raid.',
      },
    ],
  },

  // ── ZONE 3 — VERTICAL SLICE ANCHOR. Start of the Act IV march. Hand-authored. ─
  {
    id: 'idaho-holy-outpost',
    displayName: 'Idaho Holy Outpost',
    kind: 'outpost',
    anchor: { lat: 44.0682, lng: -114.742 }, // Sawtooth region
    region: 'Sawtooth Highlands',
    continent: 'North America',
    pantheon: 'Angelic (contested)',
    homeClass: null,
    tier: 4,
    act: 'ACT_IV',
    levelRange: [36, 40],
    biome: 'holy-highland',
    enemyFamilies: ['herald-angels', 'radiant-guardians'],
    connectsTo: ['cascade-corridor', 'ascension-march'],
    onHeavenApproach: true,
    heavenApproachOrder: 1,
    portalSite: false,
    handAuthored: true, // Azazel-as-patron voice lives here — never auto-write
    questChain: [
      {
        id: 'a4-01-azazel-welcome',
        archetype: 'story',
        title: 'A Warm Hand',
        summary: 'Azazel greets you as patron/ally; frames the march to the portal.',
        handAuthored: true,
      },
      {
        id: 'a4-02-first-harvest',
        archetype: 'clear',
        title: 'Gathering Light',
        summary: 'Harvest light-energy from radiant guardians for the ritual.',
        enemyFamily: 'radiant-guardians',
      },
    ],
  },

  // ── ZONE 4 — The march itself: corridor to the portal. Mixed authorship. ────
  {
    id: 'ascension-march',
    displayName: 'The Ascension March',
    kind: 'corridor',
    anchor: { lat: 44.5, lng: -115.0 },
    region: 'Sawtooth Highlands',
    continent: 'North America',
    pantheon: 'Angelic (contested)',
    homeClass: null,
    tier: 5,
    act: 'ACT_IV',
    levelRange: [40, 44],
    biome: 'holy-highland',
    enemyFamilies: ['herald-angels', 'radiant-guardians', 'lesser-angels'],
    connectsTo: ['idaho-holy-outpost', 'heaven-portal-sawtooth'],
    onHeavenApproach: true,
    heavenApproachOrder: 2,
    portalSite: false,
    handAuthored: false, // structure loop-authored; signature BEATS flagged below
    questChain: [
      {
        id: 'a4-03-herald-truth-1',
        archetype: 'story',
        title: 'The Herald Who Spoke',
        summary: 'A herald angel speaks a TRUTH; Azazel inverts it in real time.',
        handAuthored: true,
      },
      {
        id: 'a4-04-push-ridge',
        archetype: 'clear',
        title: 'Break the Ridge Line',
        summary: 'Push through radiant guardians holding the ridge.',
      },
      {
        id: 'a4-05-olympia-callback',
        archetype: 'story',
        title: 'What You Left in Olympia',
        summary: 'The Olympia gut-punch callback to Act I lands here.',
        handAuthored: true,
      },
      {
        id: 'a4-06-harvest-convoy',
        archetype: 'escort',
        title: 'The Light Convoy',
        summary: 'Move harvested light toward the portal site under attack.',
      },
      {
        id: 'a4-07-herald-truth-2',
        archetype: 'story',
        title: 'Second Doubt',
        summary: 'A second herald truth cracks the patron facade further.',
        handAuthored: true,
      },
      {
        id: 'a4-08-lesser-angel-boss',
        archetype: 'boss',
        title: 'The Kneeling Angel',
        summary: 'Defeat a lesser angel guarding the final approach.',
        enemyFamily: 'lesser-angels',
      },
      {
        id: 'a4-09-player-breaks',
        archetype: 'story',
        title: 'The Line You Cross',
        summary: "The player's rare breaking line — their one moment of protest.",
        handAuthored: true,
      },
      {
        id: 'a4-10-final-harvest',
        archetype: 'portal_approach',
        title: 'Enough Light',
        summary: 'Complete the ritual harvest needed to force the portal open.',
      },
    ],
  },

  // ── ZONE 5 — THE PORTAL. Terminal of the campaign spine. Hand-authored. ──────
  {
    id: 'heaven-portal-sawtooth',
    displayName: 'The Sawtooth Heaven Portal',
    kind: 'portal',
    anchor: { lat: 45.0, lng: -115.2 },
    region: 'Sawtooth Highlands',
    continent: 'North America',
    pantheon: 'Angelic (contested)',
    homeClass: null,
    tier: 5,
    act: 'ACT_IV',
    levelRange: [44, 46],
    biome: 'portal-threshold',
    enemyFamilies: ['radiant-guardians', 'lesser-angels'],
    connectsTo: ['ascension-march'], // Heaven zones link off this once built
    onHeavenApproach: true,
    heavenApproachOrder: 3,
    portalSite: true,
    handAuthored: true, // the mask drops here — designer-written
    questChain: [
      {
        id: 'a4-11-mask-drops',
        archetype: 'story',
        title: 'The Menace',
        summary: "Azazel's mask drops; the patron warmth was manipulation all along. Portal opens.",
        handAuthored: true,
      },
      {
        id: 'a4-12-cross-threshold',
        archetype: 'portal_approach',
        title: 'Into the Light',
        summary: 'Step through the portal — hands control to the Heaven arc (built later).',
        handAuthored: true,
      },
    ],
  },
];

// ── Convenience selectors (WorldBuilder / QuestFactory can import these) ──────
export const getZone = (id: string): Zone | undefined => WORLD.find((z) => z.id === id);

export const heavenApproachZones = (): Zone[] =>
  WORLD.filter((z) => z.onHeavenApproach).sort((a, b) => (a.heavenApproachOrder ?? 0) - (b.heavenApproachOrder ?? 0));

export const portalSites = (): Zone[] => WORLD.filter((z) => z.portalSite);
