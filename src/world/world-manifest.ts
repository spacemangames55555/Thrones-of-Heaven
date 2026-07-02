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

  // ═══════════ EUROPE — THE DELPHI MARCH (25 zones) ═══════════
  // ── Batch slice 1: the Rome spine + Act IV core ──
  {
    id: 'rome-eternal-seat', displayName: 'Rome (The Eternal Seat)', kind: 'city',
    anchor: { lat: 41.9, lng: 12.5 }, region: 'Italy', continent: 'Europe',
    pantheon: 'Roman', homeClass: 'Priest', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'urban-temperate', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['campania-shadow'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'rom-01-mentor', archetype: 'story', title: 'The Keeper of the Old Rites',
        summary: 'Meet your mentor, an aged keeper; learn class basics.', handAuthored: true },
      { id: 'rom-02-catacomb-vermin', archetype: 'clear', title: 'Below the Streets',
        summary: 'Cull corrupted vermin in the catacombs.', enemyFamily: 'corrupted-wildlife' },
      { id: 'rom-03-reliquary-rot', archetype: 'story', title: 'Rot in the Reliquaries',
        summary: 'Discover corruption seeping through the holy relics.', handAuthored: true },
      { id: 'rom-04-appian-gate', archetype: 'boss', title: 'The Appian Gate',
        summary: 'Battle the first true evil enemy at the southern gate.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'campania-shadow', displayName: 'Campania (Shadow of the Mountain)', kind: 'corridor',
    anchor: { lat: 40.85, lng: 14.27 }, region: 'Italy', continent: 'Europe',
    pantheon: 'Roman', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 22],
    biome: 'mediterranean-coast',
    enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts', 'dark-casters'],
    connectsTo: ['rome-eternal-seat', 'apulia-eastern-dock'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'cam-01-mountain-shadow', archetype: 'clear', title: 'Shadow of the Mountain',
        summary: 'Clear the corrupted coast roads beneath the volcano.' },
      { id: 'cam-02-vesuvian-herald', archetype: 'boss', title: 'The Vesuvian Herald',
        summary: 'Defeat the region-champion of the buried towns (Spiritual domain).',
        enemyFamily: 'region-champion' },
      { id: 'cam-03-buried-relics', archetype: 'fetch', title: 'Relics of the Buried Towns',
        summary: 'Recover relics from the ash-fields for the road east.' },
    ],
  },
  {
    id: 'apulia-eastern-dock', displayName: 'Apulia (The Eastern Dock)', kind: 'corridor',
    anchor: { lat: 41.12, lng: 16.87 }, region: 'Italy', continent: 'Europe',
    pantheon: 'Roman', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [22, 30],
    biome: 'mediterranean-coast', enemyFamilies: ['evil-raiders', 'veil-ambushers'],
    connectsTo: ['campania-shadow', 'epirus-landing'], seaGates: ['epirus-landing'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'apu-01-pilgrim-escort', archetype: 'escort', title: 'Pilgrims to the Water',
        summary: 'Escort pilgrims through ambush country to the eastern dock.' },
      { id: 'apu-02-harbor-corsairs', archetype: 'clear', title: 'The Held Harbor',
        summary: 'Break the corsairs holding the crossing.', enemyFamily: 'evil-raiders' },
    ],
  },
  {
    id: 'epirus-landing', displayName: 'Epirus Landing', kind: 'corridor',
    anchor: { lat: 39.5, lng: 20.27 }, region: 'Greece', continent: 'Europe',
    pantheon: 'Greek', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [30, 36],
    biome: 'mediterranean-coast', enemyFamilies: ['evil-raiders', 'hollowed-brutes'],
    connectsTo: ['apulia-eastern-dock', 'thermopylae-pass'], seaGates: ['apulia-eastern-dock'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'epi-01-contested-landing', archetype: 'clear', title: 'The Contested Shore',
        summary: 'The landing is held against you — take the beachhead.' },
      { id: 'epi-02-march-inland', archetype: 'story', title: 'The Road to the Hot Gates',
        summary: 'First sight of the great march converging inland.' },
    ],
  },
  {
    id: 'thessaloniki-outpost', displayName: 'Thessaloniki Outpost', kind: 'outpost',
    anchor: { lat: 40.64, lng: 22.94 }, region: 'Greece', continent: 'Europe',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 4, act: 'ACT_IV', levelRange: [36, 40],
    biome: 'holy-highland', enemyFamilies: ['herald-angels', 'radiant-guardians'],
    connectsTo: ['vardar-corridor', 'thermopylae-pass'],
    onHeavenApproach: true, heavenApproachOrder: 1, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'eu-01-azazel-welcome', archetype: 'story', title: 'A Warm Hand at the Muster',
        summary: 'Azazel arrives as patron; frames the march to the Oracle.', handAuthored: true },
      { id: 'eu-02-first-harvest', archetype: 'clear', title: 'Gathering Light',
        summary: 'Harvest light-energy from radiant guardians for the ritual.',
        enemyFamily: 'radiant-guardians' },
    ],
  },
  {
    id: 'thermopylae-pass', displayName: 'Thermopylae (The Hot Gates)', kind: 'corridor',
    anchor: { lat: 38.8, lng: 22.53 }, region: 'Greece', continent: 'Europe',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 5, act: 'ACT_IV', levelRange: [40, 44],
    biome: 'holy-highland',
    enemyFamilies: ['herald-angels', 'radiant-guardians', 'lesser-angels'],
    connectsTo: ['thessaloniki-outpost', 'epirus-landing', 'delphi-sanctuary'],
    onHeavenApproach: true, heavenApproachOrder: 2, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'eu-03-herald-truth-1', archetype: 'story', title: 'The Herald at the Gates',
        summary: 'A herald angel speaks a TRUTH; Azazel inverts it in real time.',
        handAuthored: true },
      { id: 'eu-04-hold-the-hot-gates', archetype: 'clear', title: 'Break the Hot Gates',
        summary: 'Break the angelic line holding the pass of Thermopylae.' },
      { id: 'eu-05-light-convoy', archetype: 'escort', title: 'The Light Convoy',
        summary: 'Move harvested light through the pass under attack.' },
      { id: 'eu-06-regional-callback', archetype: 'story', title: 'What You Left Behind',
        summary: 'EUROPE CALLBACK — five class-variant scripts (Bard/Priest/Blacksmith/Mage/Necromancer), dialogue layer selects by class. HAND_AUTHORED_TODO x5.',
        handAuthored: true },
      { id: 'eu-07-herald-truth-2', archetype: 'story', title: 'Second Doubt',
        summary: 'A second herald truth cracks the patron facade further.', handAuthored: true },
      { id: 'eu-08-kneeling-angel', archetype: 'boss', title: 'The Kneeling Angel',
        summary: 'Defeat a lesser angel guarding the final approach.',
        enemyFamily: 'lesser-angels' },
      { id: 'eu-09-player-breaks', archetype: 'story', title: 'The Line You Cross',
        summary: "The player's rare breaking line — Europe instance.", handAuthored: true },
      { id: 'eu-10-final-harvest', archetype: 'portal_approach', title: 'Enough Light',
        summary: 'Complete the ritual harvest needed to force the Oracle open.' },
    ],
  },
  {
    id: 'delphi-sanctuary', displayName: 'Delphi Sanctuary (The Omphalos)', kind: 'portal',
    anchor: { lat: 38.48, lng: 22.5 }, region: 'Greece', continent: 'Europe',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 5, act: 'ACT_IV', levelRange: [44, 46],
    biome: 'portal-threshold', enemyFamilies: ['radiant-guardians', 'lesser-angels'],
    connectsTo: ['thermopylae-pass'],
    onHeavenApproach: true, heavenApproachOrder: 3, portalSite: true, handAuthored: true,
    questChain: [
      { id: 'eu-11-mask-drops', archetype: 'story', title: 'The Oracle Answers',
        summary: "Azazel's mask drops at the navel of the world. The broadcast station becomes a door.",
        handAuthored: true },
      { id: 'eu-12-cross-threshold', archetype: 'portal_approach', title: 'Into the Light',
        summary: 'Step through — hands control to the Heaven arc (built later).',
        handAuthored: true },
    ],
  },
  // ── Batch slice 2: the Necromancer spine + Mage start ──
  {
    id: 'murmansk-bone-harbor', displayName: 'Murmansk (Bone Harbor)', kind: 'city',
    anchor: { lat: 68.97, lng: 33.07 }, region: 'Kola', continent: 'Europe',
    pantheon: 'Slavic / Norse fringe', homeClass: 'Necromancer', tier: 1, act: 'ACT_I',
    levelRange: [1, 12], biome: 'frozen-coast',
    enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['karelia-lakes'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'mur-01-mentor', archetype: 'story', title: 'The Keeper of the Frozen Dead',
        summary: 'Meet your mentor; learn class basics.', handAuthored: true },
      { id: 'mur-02-ice-roads', archetype: 'clear', title: 'The Ice Roads',
        summary: 'Cull corrupted wildlife on the harbor roads.', enemyFamily: 'corrupted-wildlife' },
      { id: 'mur-03-permafrost-stirring', archetype: 'story', title: 'Beneath the Permafrost',
        summary: 'Something stirs under the frozen ground — trace it.', handAuthored: true },
      { id: 'mur-04-harbor-evil', archetype: 'boss', title: 'Evil at the Harbor',
        summary: 'Battle the first true evil enemy on the docks.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'karelia-lakes', displayName: 'Karelia (The Thousand Lakes)', kind: 'corridor',
    anchor: { lat: 61.79, lng: 34.36 }, region: 'Karelia', continent: 'Europe',
    pantheon: 'Slavic / Norse fringe', homeClass: null, tier: 2, act: 'ACT_II',
    levelRange: [12, 16], biome: 'taiga',
    enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['murmansk-bone-harbor', 'smolensk-gate'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'kar-01-lake-packs', archetype: 'clear', title: 'Between the Lakes',
        summary: 'Clear corrupted packs off the lake roads.', enemyFamily: 'corrupted-wildlife' },
      { id: 'kar-02-dead-wagons', archetype: 'fetch', title: 'The Dead-Wagons',
        summary: 'Recover the bone-keeper wagons lost on the ice road.' },
    ],
  },
  {
    id: 'smolensk-gate', displayName: 'Smolensk Gate', kind: 'corridor',
    anchor: { lat: 54.78, lng: 32.05 }, region: 'Western Russia', continent: 'Europe',
    pantheon: 'Slavic', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [16, 20],
    biome: 'mixed-forest', enemyFamilies: ['lesser-evil-scouts', 'evil-raiders'],
    connectsTo: ['karelia-lakes', 'kyiv-river-gate', 'moscow-crystal-court'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'smo-01-caravan-south', archetype: 'escort', title: 'The Long Caravan South',
        summary: "Escort the bone-keeper's caravan toward the river gate." },
      { id: 'smo-02-river-ford', archetype: 'clear', title: 'The River Ford',
        summary: 'Break the raiders holding the ford.', enemyFamily: 'evil-raiders' },
    ],
  },
  {
    id: 'moscow-crystal-court', displayName: 'Moscow (The Crystal Court)', kind: 'city',
    anchor: { lat: 55.76, lng: 37.62 }, region: 'Western Russia', continent: 'Europe',
    pantheon: 'Slavic', homeClass: 'Mage', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'urban-temperate', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['bryansk-woodland', 'smolensk-gate'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'mos-01-mentor', archetype: 'story', title: 'The Elder of the Academies',
        summary: 'Meet your mentor; learn class basics.', handAuthored: true },
      { id: 'mos-02-outer-ring', archetype: 'clear', title: 'The Outer Ring',
        summary: 'Cull corrupted strays beyond the walls.', enemyFamily: 'corrupted-wildlife' },
      { id: 'mos-03-lattice-fracture', archetype: 'story', title: 'A Fracture in the Lattice',
        summary: 'Discover corruption in the crystalline leylines.', handAuthored: true },
      { id: 'mos-04-beneath-walls', archetype: 'boss', title: 'Beneath the Walls',
        summary: 'Battle the first true evil enemy under the city.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'bryansk-woodland', displayName: 'Bryansk Woodland', kind: 'corridor',
    anchor: { lat: 53.24, lng: 34.36 }, region: 'Western Russia', continent: 'Europe',
    pantheon: 'Slavic', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 20],
    biome: 'mixed-forest', enemyFamilies: ['corrupted-wildlife', 'veil-ambushers'],
    connectsTo: ['moscow-crystal-court', 'kyiv-river-gate'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'bry-01-forest-roads', archetype: 'clear', title: 'The Old Forest Roads',
        summary: 'Clear the woodland route south.' },
      { id: 'bry-02-familiar-colors', archetype: 'story', title: 'Familiar Colors',
        summary: 'The ambushers wear colors you recognize — investigate.' },
    ],
  },
  // ── Batch slice 3: eastern merge + Blacksmith spine ──
  {
    id: 'kyiv-river-gate', displayName: 'Kyiv (The River Gate)', kind: 'city',
    anchor: { lat: 50.45, lng: 30.52 }, region: 'Dnieper', continent: 'Europe',
    pantheon: 'Slavic', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [20, 25],
    biome: 'steppe-river', enemyFamilies: ['evil-raiders', 'dark-casters'],
    connectsTo: ['bryansk-woodland', 'smolensk-gate', 'carpathian-crossing'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'kyi-01-river-gate-tyrant', archetype: 'boss', title: 'The River Gate Tyrant',
        summary: 'Defeat the region-champion holding the gate (Mental domain).',
        enemyFamily: 'region-champion' },
      { id: 'kyi-02-combined-caravan', archetype: 'escort', title: 'The Combined Caravan',
        summary: 'The two Russian roads become one — escort it out of the city.' },
    ],
  },
  {
    id: 'carpathian-crossing', displayName: 'The Carpathian Crossing', kind: 'corridor',
    anchor: { lat: 45.65, lng: 25.61 }, region: 'Carpathians', continent: 'Europe',
    pantheon: 'Dacian / Slavic', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [25, 30],
    biome: 'carpathian-pass', enemyFamilies: ['veil-ambushers', 'hollowed-brutes'],
    connectsTo: ['kyiv-river-gate', 'belgrade-iron-river'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'car-01-haunted-pass', archetype: 'clear', title: 'The Haunted Pass',
        summary: 'Clear the defiles of the high crossing.', enemyFamily: 'veil-ambushers' },
      { id: 'car-02-defile-convoy', archetype: 'escort', title: 'Through the Defiles',
        summary: 'Bring the caravan through the pass intact.' },
    ],
  },
  {
    id: 'munich-anvil-hold', displayName: 'Munich (The Anvil Hold)', kind: 'city',
    anchor: { lat: 48.14, lng: 11.58 }, region: 'Bavaria', continent: 'Europe',
    pantheon: 'Germanic', homeClass: 'Blacksmith', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'urban-temperate', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['tyrol-forge-road'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'mun-01-mentor', archetype: 'story', title: 'The Forge-Master',
        summary: 'Meet your mentor; the ore itself is turning.', handAuthored: true },
      { id: 'mun-02-foothill-wolves', archetype: 'clear', title: 'Wolves off the Roads',
        summary: 'Cull corrupted wolves on the foothill roads.', enemyFamily: 'corrupted-wildlife' },
      { id: 'mun-03-black-veins', archetype: 'story', title: 'Black Veins in the Mine',
        summary: 'Discover the corruption in the ore.', handAuthored: true },
      { id: 'mun-04-forge-raid', archetype: 'boss', title: 'Raid on the Forge Quarter',
        summary: 'Battle the first true evil enemy at the forges.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'tyrol-forge-road', displayName: 'Tyrol (The Forge Road)', kind: 'corridor',
    anchor: { lat: 47.49, lng: 11.1 }, region: 'Alps', continent: 'Europe',
    pantheon: 'Germanic', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 24],
    biome: 'alpine',
    enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts', 'veil-ambushers'],
    connectsTo: ['munich-anvil-hold', 'alps-high-pass'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'tyr-01-mountain-road', archetype: 'clear', title: 'The Mountain Road',
        summary: 'Clear the route to the high pass.' },
      { id: 'tyr-02-ore-convoy', archetype: 'escort', title: 'The Ore Convoy',
        summary: 'Escort the ore wagons up the switchbacks.' },
      { id: 'tyr-03-pass-supplies', archetype: 'fetch', title: 'Stores for the Stations',
        summary: 'Provision the pass stations before the crossing.' },
    ],
  },
  {
    id: 'alps-high-pass', displayName: 'The High Pass (Brenner)', kind: 'corridor',
    anchor: { lat: 47.0, lng: 11.5 }, region: 'Alps', continent: 'Europe',
    pantheon: 'Germanic', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [24, 28],
    biome: 'alpine', enemyFamilies: ['veil-ambushers', 'hollowed-brutes'],
    connectsTo: ['burgundy-vintners-road', 'tyrol-forge-road', 'vienna-river-muster'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'alp-01-pass-warden', archetype: 'boss', title: 'The Pass Warden',
        summary: 'Defeat the region-champion of the summit road (Physical domain).',
        enemyFamily: 'region-champion' },
      { id: 'alp-02-ambush-ring', archetype: 'clear', title: 'The Ambush Ring',
        summary: 'Break the ambusher ring on the summit road.', enemyFamily: 'veil-ambushers' },
    ],
  },
  {
    id: 'vienna-river-muster', displayName: 'Vienna (The River Muster)', kind: 'city',
    anchor: { lat: 48.21, lng: 16.37 }, region: 'Danube', continent: 'Europe',
    pantheon: 'Germanic', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [28, 31],
    biome: 'danube-river', enemyFamilies: ['evil-raiders', 'dark-casters'],
    connectsTo: ['alps-high-pass', 'belgrade-iron-river'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'vie-01-river-muster', archetype: 'story', title: 'The River Muster',
        summary: 'The tributaries become an army on the Danube.' },
      { id: 'vie-02-dock-saboteurs', archetype: 'clear', title: 'Saboteurs on the Docks',
        summary: 'Clear the casters sabotaging the river fleet.', enemyFamily: 'dark-casters' },
    ],
  },
  // ── Batch slice 4: Balkan trunk + Bard spine start ──
  {
    id: 'belgrade-iron-river', displayName: 'Belgrade (The Iron River)', kind: 'city',
    anchor: { lat: 44.79, lng: 20.45 }, region: 'Balkans', continent: 'Europe',
    pantheon: 'South Slavic', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [30, 34],
    biome: 'danube-river', enemyFamilies: ['evil-raiders', 'hollowed-brutes'],
    connectsTo: ['vienna-river-muster', 'carpathian-crossing', 'vardar-corridor'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'bel-01-river-convoy', archetype: 'escort', title: 'Through the Narrows',
        summary: 'Escort the river convoy through the confluence narrows.' },
      { id: 'bel-02-confluence-warlord', archetype: 'boss', title: 'The Confluence Warlord',
        summary: 'Defeat the region-champion at the meeting of rivers (Physical domain).',
        enemyFamily: 'region-champion' },
    ],
  },
  {
    id: 'vardar-corridor', displayName: 'The Vardar Corridor', kind: 'corridor',
    anchor: { lat: 41.99, lng: 21.43 }, region: 'Balkans', continent: 'Europe',
    pantheon: 'South Slavic', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [34, 36],
    biome: 'balkan-highland',
    enemyFamilies: ['dark-casters', 'veil-ambushers', 'hollowed-brutes'],
    connectsTo: ['belgrade-iron-river', 'thessaloniki-outpost'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'var-01-last-road', archetype: 'clear', title: 'The Last Free Road',
        summary: 'Clear the final route south to the muster.' },
      { id: 'var-02-march-provisions', archetype: 'fetch', title: 'Provisions for the March',
        summary: 'The army strips the valley — gather what the march demands.' },
    ],
  },
  {
    id: 'london-grey-chorus', displayName: 'London (The Grey Chorus)', kind: 'city',
    anchor: { lat: 51.51, lng: -0.13 }, region: 'Britain', continent: 'Europe',
    pantheon: 'Celtic / Arthurian', homeClass: 'Bard', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'urban-temperate', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['kent-passage'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'lon-01-mentor', archetype: 'story', title: 'The Loremaster of the Grey Chorus',
        summary: "Meet your mentor; the city's song has gone flat.", handAuthored: true },
      { id: 'lon-02-first-blood', archetype: 'clear', title: 'Strays in the Boroughs',
        summary: 'Cull corrupted strays in the outer boroughs.', enemyFamily: 'corrupted-wildlife' },
      { id: 'lon-03-wrong-note', archetype: 'story', title: 'A Wrong Note Beneath the City',
        summary: 'Trace the corruption sounding under the streets.', handAuthored: true },
      { id: 'lon-04-first-evil', archetype: 'boss', title: 'The River Gate',
        summary: 'Battle the first true evil enemy at the river gate.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'kent-passage', displayName: 'Kent (The Passage)', kind: 'corridor',
    anchor: { lat: 51.13, lng: 1.31 }, region: 'Britain', continent: 'Europe',
    pantheon: 'Celtic / Arthurian', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 15],
    biome: 'chalk-coast', enemyFamilies: ['lesser-evil-scouts', 'corrupted-wildlife'],
    connectsTo: ['london-grey-chorus', 'calais-landing'], seaGates: ['calais-landing'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'ken-01-coast-road', archetype: 'clear', title: 'Hold the Coast Road',
        summary: 'Clear the road to the white cliffs.', enemyFamily: 'lesser-evil-scouts' },
      { id: 'ken-02-passage-papers', archetype: 'fetch', title: 'Passage for the Crossing',
        summary: 'Secure supplies and passage for the Channel crossing.' },
    ],
  },
  {
    id: 'calais-landing', displayName: 'Calais Landing', kind: 'corridor',
    anchor: { lat: 50.95, lng: 1.86 }, region: 'Northern France', continent: 'Europe',
    pantheon: 'Gallic / Frankish', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [15, 18],
    biome: 'lowland-farmland', enemyFamilies: ['lesser-evil-scouts', 'evil-raiders'],
    connectsTo: ['kent-passage', 'paris-veiled-lights'], seaGates: ['kent-passage'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'cal-01-refugees', archetype: 'escort', title: 'Off the Landing',
        summary: 'Escort refugees inland from the contested beach.' },
      { id: 'cal-02-beach-raiders', archetype: 'clear', title: 'The Beach Roads',
        summary: 'Clear the raiders working the coastal roads.', enemyFamily: 'evil-raiders' },
    ],
  },
  {
    id: 'paris-veiled-lights', displayName: 'Paris (The Veiled Lights)', kind: 'city',
    anchor: { lat: 48.86, lng: 2.35 }, region: 'Northern France', continent: 'Europe',
    pantheon: 'Gallic / Frankish', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [18, 21],
    biome: 'urban-river', enemyFamilies: ['lesser-evil-scouts', 'dark-casters'],
    connectsTo: ['calais-landing', 'burgundy-vintners-road'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'par-01-harvested-lights', archetype: 'story', title: 'The Veiled Lights',
        summary: "The city's lights are being harvested by something — find out what." },
      { id: 'par-02-catacomb-casters', archetype: 'clear', title: 'Below the Lights',
        summary: 'Clear the casters working the catacombs.', enemyFamily: 'dark-casters' },
    ],
  },
  {
    id: 'burgundy-vintners-road', displayName: "Burgundy (The Vintner's Road)", kind: 'corridor',
    anchor: { lat: 47.32, lng: 5.04 }, region: 'Burgundy', continent: 'Europe',
    pantheon: 'Gallic / Frankish', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [21, 24],
    biome: 'vineyard-hills', enemyFamilies: ['dark-casters', 'veil-ambushers'],
    connectsTo: ['paris-veiled-lights', 'alps-high-pass'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'bur-01-poisoned-vintage', archetype: 'fetch', title: 'The Poisoned Vintage',
        summary: 'Recover a corruption sample from the blighted vineyards.' },
      { id: 'bur-02-road-ambushers', archetype: 'clear', title: 'The Long Road East',
        summary: 'Break the ambushers along the road to the Alps.',
        enemyFamily: 'veil-ambushers' },
    ],
  },
];

// ── Convenience selectors (WorldBuilder / QuestFactory can import these) ──────
export const getZone = (id: string): Zone | undefined => WORLD.find((z) => z.id === id);

export const heavenApproachZones = (): Zone[] =>
  WORLD.filter((z) => z.onHeavenApproach).sort((a, b) => (a.heavenApproachOrder ?? 0) - (b.heavenApproachOrder ?? 0));

export const portalSites = (): Zone[] => WORLD.filter((z) => z.portalSite);
