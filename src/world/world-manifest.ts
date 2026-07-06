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
    connectsTo: ['apulia-eastern-dock', 'thessaloniki-outpost'], seaGates: ['apulia-eastern-dock'],
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
    connectsTo: ['vardar-corridor', 'thermopylae-pass', 'epirus-landing'],
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
    connectsTo: ['thessaloniki-outpost', 'delphi-sanctuary'],
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

  // ═══════════ AFRICA — THE RIFT MARCH (13 zones) ═══════════
  // ── Batch slice 1: the Wizard's Nile road + shared trunk ──
  {
    id: 'cairo-nile-crown', displayName: 'Cairo (The Nile Crown)', kind: 'city',
    anchor: { lat: 30.04, lng: 31.24 }, region: 'Lower Egypt', continent: 'Africa',
    pantheon: 'Egyptian', homeClass: 'Wizard', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'nile-delta', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['luxor-valley-of-kings'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    // PRE-EXISTING: maps to the hand-built Egypt world + Faiyum. Never stamped.
    questChain: [
      { id: 'cai-01-mentor', archetype: 'story', title: 'The Keeper of the Old Kingdom',
        summary: 'Meet your mentor; learn class basics.', handAuthored: true },
      { id: 'cai-02-first-blood', archetype: 'clear', title: 'Jackals at the Delta',
        summary: 'Cull corrupted wildlife on the delta roads.', enemyFamily: 'corrupted-wildlife' },
      { id: 'cai-03-discovery', archetype: 'story', title: 'Rot in the River',
        summary: 'Discover the corruption moving up the Nile.', handAuthored: true },
      { id: 'cai-04-first-evil', archetype: 'boss', title: 'Evil at the Crown',
        summary: 'Battle the first true evil enemy at the city gates.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'luxor-valley-of-kings', displayName: 'Luxor (Valley of the Kings)', kind: 'corridor',
    anchor: { lat: 25.69, lng: 32.64 }, region: 'Upper Egypt', continent: 'Africa',
    pantheon: 'Egyptian', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 17],
    biome: 'nile-valley', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['cairo-nile-crown', 'aswan-first-cataract'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'lux-01-tomb-roads', archetype: 'clear', title: 'The Tomb Roads',
        summary: 'Clear the corrupted roads among the tombs.' },
      { id: 'lux-02-relic-south', archetype: 'fetch', title: 'A Relic for the Road South',
        summary: 'Recover a relic to open the way upriver.' },
    ],
  },
  {
    id: 'aswan-first-cataract', displayName: 'Aswan (The First Cataract)', kind: 'corridor',
    anchor: { lat: 24.09, lng: 32.90 }, region: 'Upper Egypt', continent: 'Africa',
    pantheon: 'Egyptian', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [17, 22],
    biome: 'nile-cataract', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['luxor-valley-of-kings', 'nubia-black-pyramids'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'asw-01-cataract-convoy', archetype: 'escort', title: 'Through the Cataract',
        summary: 'Escort the river convoy past the white water.' },
      { id: 'asw-02-gate-of-nubia', archetype: 'clear', title: 'The Gate of Nubia',
        summary: 'Break the corrupted line holding the southern gate.' },
    ],
  },
  {
    id: 'nubia-black-pyramids', displayName: 'Nubia (The Black Pyramids)', kind: 'corridor',
    anchor: { lat: 16.94, lng: 33.75 }, region: 'Nubia', continent: 'Africa',
    pantheon: 'Nubian / Kushite', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [22, 27],
    biome: 'desert-highland', enemyFamilies: ['dark-casters', 'veil-ambushers'],
    connectsTo: ['aswan-first-cataract', 'sudd-drowned-road'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'nub-01-kushite-sentinel', archetype: 'boss', title: 'The Kushite Sentinel',
        summary: 'Defeat the region-champion of the pyramid fields (Spiritual domain).',
        enemyFamily: 'region-champion' },
      { id: 'nub-02-pyramid-fields', archetype: 'clear', title: 'The Pyramid Fields',
        summary: 'Clear the casters working among the black pyramids.',
        enemyFamily: 'dark-casters' },
    ],
  },
  {
    id: 'sudd-drowned-road', displayName: 'The Sudd (The Drowned Road)', kind: 'corridor',
    anchor: { lat: 8.50, lng: 31.00 }, region: 'White Nile', continent: 'Africa',
    pantheon: 'Nilotic', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [27, 31],
    biome: 'marsh', enemyFamilies: ['veil-ambushers', 'hollowed-brutes'],
    connectsTo: ['nubia-black-pyramids', 'victoria-source'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'sud-01-drowned-road', archetype: 'clear', title: 'The Drowned Road',
        summary: 'Clear the ambushers hiding in the endless reeds.',
        enemyFamily: 'veil-ambushers' },
      { id: 'sud-02-through-the-reeds', archetype: 'escort', title: 'Through the Reeds',
        summary: 'Bring the caravan through the marsh intact.' },
    ],
  },
  {
    id: 'victoria-source', displayName: 'Lake Victoria (The Source)', kind: 'city',
    anchor: { lat: -1.00, lng: 33.00 }, region: 'Great Lakes', continent: 'Africa',
    pantheon: 'East African', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [31, 34],
    biome: 'lake-shore', enemyFamilies: ['evil-raiders', 'dark-casters'],
    connectsTo: ['sudd-drowned-road', 'virunga-smoke-mountains', 'serengeti-long-grass'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'vic-01-two-roads-meet', archetype: 'story', title: 'The Source of the River',
        summary: 'The two roads meet — the Wizard stands where the Nile is born.' },
      { id: 'vic-02-caravan-south', archetype: 'escort', title: 'The Caravan South',
        summary: 'Escort the combined caravan out of the lake city.' },
    ],
  },
  {
    id: 'serengeti-long-grass', displayName: 'Serengeti (The Long Grass)', kind: 'corridor',
    anchor: { lat: -2.33, lng: 34.83 }, region: 'East Africa', continent: 'Africa',
    pantheon: 'East African', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [34, 36],
    biome: 'savanna', enemyFamilies: ['evil-raiders', 'veil-ambushers', 'hollowed-brutes'],
    connectsTo: ['victoria-source', 'ngorongoro-outpost'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'ser-01-last-free-road', archetype: 'clear', title: 'The Last Free Road',
        summary: 'Clear the final route south to the crater.' },
      { id: 'ser-02-rift-warden', archetype: 'boss', title: 'The Rift Warden',
        summary: 'Defeat the region-champion of the long grass (Physical domain).',
        enemyFamily: 'region-champion' },
    ],
  },
  // ── Batch slice 2: Act IV + the Witch Doctor's rainforest road ──
  {
    id: 'ngorongoro-outpost', displayName: 'Ngorongoro Outpost', kind: 'outpost',
    anchor: { lat: -3.24, lng: 35.49 }, region: 'The Rift', continent: 'Africa',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 4, act: 'ACT_IV', levelRange: [36, 40],
    biome: 'holy-highland', enemyFamilies: ['herald-angels', 'radiant-guardians'],
    connectsTo: ['serengeti-long-grass', 'rift-descent'],
    onHeavenApproach: true, heavenApproachOrder: 1, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'af-01-azazel-welcome', archetype: 'story', title: 'A Warm Hand at the Crater',
        summary: 'Azazel arrives as patron; frames the march down the Rift.', handAuthored: true },
      { id: 'af-02-first-harvest', archetype: 'clear', title: 'Gathering Light',
        summary: 'Harvest light-energy from radiant guardians for the ritual.',
        enemyFamily: 'radiant-guardians' },
    ],
  },
  {
    id: 'rift-descent', displayName: 'The Rift Descent', kind: 'corridor',
    anchor: { lat: -3.00, lng: 35.20 }, region: 'The Rift', continent: 'Africa',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 5, act: 'ACT_IV', levelRange: [40, 44],
    biome: 'holy-highland',
    enemyFamilies: ['herald-angels', 'radiant-guardians', 'lesser-angels'],
    connectsTo: ['ngorongoro-outpost', 'olduvai-cradle'],
    onHeavenApproach: true, heavenApproachOrder: 2, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'af-03-herald-truth-1', archetype: 'story', title: 'The Herald at the Rim',
        summary: 'A herald angel speaks a TRUTH; Azazel inverts it in real time.',
        handAuthored: true },
      { id: 'af-04-break-the-descent', archetype: 'clear', title: 'Break the Descent',
        summary: 'Break the angelic line holding the Rift wall.' },
      { id: 'af-05-light-convoy', archetype: 'escort', title: 'The Light Convoy',
        summary: 'Move harvested light down the Rift under attack.' },
      { id: 'af-06-regional-callback', archetype: 'story', title: 'What You Left Behind',
        summary: 'AFRICA CALLBACK — two class-variant scripts (Wizard / Witch Doctor), dialogue layer selects by class. HAND_AUTHORED_TODO x2.',
        handAuthored: true },
      { id: 'af-07-herald-truth-2', archetype: 'story', title: 'Second Doubt',
        summary: 'A second herald truth cracks the patron facade further.', handAuthored: true },
      { id: 'af-08-kneeling-angel', archetype: 'boss', title: 'The Kneeling Angel',
        summary: 'Defeat a lesser angel guarding the final approach.',
        enemyFamily: 'lesser-angels' },
      { id: 'af-09-player-breaks', archetype: 'story', title: 'The Line You Cross',
        summary: "The player's rare breaking line — Africa instance.", handAuthored: true },
      { id: 'af-10-final-harvest', archetype: 'portal_approach', title: 'Enough Light',
        summary: 'Complete the ritual harvest needed to force the Cradle open.' },
    ],
  },
  {
    id: 'olduvai-cradle', displayName: 'Olduvai Gorge (The Cradle)', kind: 'portal',
    anchor: { lat: -2.99, lng: 35.35 }, region: 'The Rift', continent: 'Africa',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 5, act: 'ACT_IV', levelRange: [44, 46],
    biome: 'portal-threshold', enemyFamilies: ['radiant-guardians', 'lesser-angels'],
    connectsTo: ['rift-descent'],
    onHeavenApproach: true, heavenApproachOrder: 3, portalSite: true, handAuthored: true,
    questChain: [
      { id: 'af-11-mask-drops', archetype: 'story', title: 'The Cradle Opens',
        summary: "Azazel's mask drops at the birthplace of humanity. The watchers' door opens.",
        handAuthored: true },
      { id: 'af-12-cross-threshold', archetype: 'portal_approach', title: 'Into the Light',
        summary: 'Step through — hands control to the Heaven arc (built later).',
        handAuthored: true },
    ],
  },
  {
    id: 'kinshasa-river-drum', displayName: 'Kinshasa (The River Drum)', kind: 'city',
    anchor: { lat: -4.32, lng: 15.31 }, region: 'Congo Basin', continent: 'Africa',
    pantheon: 'Congo', homeClass: 'Witch Doctor', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'rainforest-river', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['ituri-green-cathedral'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'kin-01-mentor', archetype: 'story', title: 'The Keeper of the Drum',
        summary: 'Meet your mentor; learn class basics.', handAuthored: true },
      { id: 'kin-02-first-blood', archetype: 'clear', title: 'The River Roads',
        summary: 'Cull corrupted wildlife along the great river.', enemyFamily: 'corrupted-wildlife' },
      { id: 'kin-03-discovery', archetype: 'story', title: 'A Wrong Beat',
        summary: 'Discover the corruption moving through the forest.', handAuthored: true },
      { id: 'kin-04-first-evil', archetype: 'boss', title: 'Evil at the Drum',
        summary: 'Battle the first true evil enemy at the river gate.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'ituri-green-cathedral', displayName: 'Ituri (The Green Cathedral)', kind: 'corridor',
    anchor: { lat: 1.50, lng: 28.50 }, region: 'Congo Basin', continent: 'Africa',
    pantheon: 'Congo', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 22],
    biome: 'deep-rainforest', enemyFamilies: ['corrupted-wildlife', 'veil-ambushers'],
    connectsTo: ['kinshasa-river-drum', 'virunga-smoke-mountains'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'itu-01-under-the-canopy', archetype: 'clear', title: 'Under the Canopy',
        summary: 'Clear the forest road east.' },
      { id: 'itu-02-canopy-king', archetype: 'boss', title: 'The Canopy King',
        summary: 'Defeat the region-champion of the deep forest (Mental domain).',
        enemyFamily: 'region-champion' },
      { id: 'itu-03-lakes-medicine', archetype: 'fetch', title: 'Medicine for the Lakes Road',
        summary: 'Gather what the road to the lakes demands.' },
    ],
  },
  {
    id: 'virunga-smoke-mountains', displayName: 'Virunga (The Smoke Mountains)', kind: 'corridor',
    anchor: { lat: -1.50, lng: 29.50 }, region: 'Great Lakes', continent: 'Africa',
    pantheon: 'Congo / Central African', homeClass: null, tier: 3, act: 'ACT_III',
    levelRange: [22, 31], biome: 'volcanic-highland',
    enemyFamilies: ['dark-casters', 'hollowed-brutes'],
    connectsTo: ['ituri-green-cathedral', 'victoria-source'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'vir-01-smoking-pass', archetype: 'clear', title: 'The Smoking Pass',
        summary: 'Clear the volcanic pass to the lakes.' },
      { id: 'vir-02-refugees-to-the-lake', archetype: 'escort', title: 'Refugees to the Lake',
        summary: 'Escort refugees down to the lake shore.' },
    ],
  },

  // ═══════════ ASIA — THE KUNLUN MARCH (17 zones) ═══════════
  // ── Batch slice 1: the Monk's road + Act IV core + Samurai start ──
  {
    id: 'lhasa-prayer-citadel', displayName: 'Lhasa (The Prayer Citadel)', kind: 'city',
    anchor: { lat: 29.65, lng: 91.14 }, region: 'Tibet', continent: 'Asia',
    pantheon: 'Tibetan', homeClass: 'Monk', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'himalayan-plateau', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['changtang-empty-crossing'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'lha-01-mentor', archetype: 'story', title: 'The Abbot of the High Citadel',
        summary: 'Meet your mentor; learn class basics.', handAuthored: true },
      { id: 'lha-02-first-blood', archetype: 'clear', title: 'Wolves on the Kora',
        summary: 'Cull corrupted wildlife on the pilgrim paths.', enemyFamily: 'corrupted-wildlife' },
      { id: 'lha-03-discovery', archetype: 'story', title: 'A Crack in the Mantra',
        summary: 'Discover the corruption moving on the plateau.', handAuthored: true },
      { id: 'lha-04-first-evil', archetype: 'boss', title: 'Evil at the Citadel',
        summary: 'Battle the first true evil enemy at the gates.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'changtang-empty-crossing', displayName: 'The Changtang (Empty Crossing)', kind: 'corridor',
    anchor: { lat: 31.80, lng: 90.50 }, region: 'Tibet', continent: 'Asia',
    pantheon: 'Tibetan', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 24],
    biome: 'himalayan-plateau', enemyFamilies: ['corrupted-wildlife', 'veil-ambushers'],
    connectsTo: ['lhasa-prayer-citadel', 'hoh-xil-roof-of-world'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'cht-01-empty-crossing', archetype: 'clear', title: 'The Empty Crossing',
        summary: 'Clear the corrupted packs on the high emptiness.' },
      { id: 'cht-02-plateau-stormer', archetype: 'boss', title: 'The Plateau Stormer',
        summary: 'Defeat the region-champion of the Changtang (Physical domain).',
        enemyFamily: 'region-champion' },
      { id: 'cht-03-high-road-supplies', archetype: 'fetch', title: 'Stores for the High Road',
        summary: 'Gather supplies for the road to the roof of the world.' },
    ],
  },
  {
    id: 'hoh-xil-roof-of-world', displayName: 'Hoh Xil (The Roof of the World)', kind: 'corridor',
    anchor: { lat: 34.50, lng: 92.50 }, region: 'Tibet', continent: 'Asia',
    pantheon: 'Tibetan', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [24, 36],
    biome: 'high-desert-plateau', enemyFamilies: ['dark-casters', 'hollowed-brutes'],
    connectsTo: ['changtang-empty-crossing', 'kunlun-jade-gate'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'hox-01-roof-of-world', archetype: 'clear', title: 'The Roof of the World',
        summary: 'Clear the casters working the high desert.', enemyFamily: 'dark-casters' },
      { id: 'hox-02-pilgrims-to-the-gate', archetype: 'escort', title: 'Pilgrims to the Jade Gate',
        summary: 'Escort the pilgrims to the mountain outpost.' },
    ],
  },
  {
    id: 'kunlun-jade-gate', displayName: 'The Jade Gate Outpost', kind: 'outpost',
    anchor: { lat: 35.00, lng: 93.00 }, region: 'Kunlun', continent: 'Asia',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 4, act: 'ACT_IV', levelRange: [36, 40],
    biome: 'holy-highland', enemyFamilies: ['herald-angels', 'radiant-guardians'],
    connectsTo: ['hoh-xil-roof-of-world', 'kham-eastern-plateau', 'kunlun-ascent'],
    onHeavenApproach: true, heavenApproachOrder: 1, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'as-01-azazel-welcome', archetype: 'story', title: 'A Warm Hand at the Gate',
        summary: 'Azazel arrives as patron; frames the ascent of the pillar.', handAuthored: true },
      { id: 'as-02-first-harvest', archetype: 'clear', title: 'Gathering Light',
        summary: 'Harvest light-energy from radiant guardians for the ritual.',
        enemyFamily: 'radiant-guardians' },
    ],
  },
  {
    id: 'kunlun-ascent', displayName: 'The Ascent of the Pillar', kind: 'corridor',
    anchor: { lat: 35.60, lng: 92.50 }, region: 'Kunlun', continent: 'Asia',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 5, act: 'ACT_IV', levelRange: [40, 44],
    biome: 'holy-highland',
    enemyFamilies: ['herald-angels', 'radiant-guardians', 'lesser-angels'],
    connectsTo: ['kunlun-jade-gate', 'kunlun-jade-court'],
    onHeavenApproach: true, heavenApproachOrder: 2, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'as-03-herald-truth-1', archetype: 'story', title: 'The Herald on the Pillar',
        summary: 'A herald angel speaks a TRUTH; Azazel inverts it in real time.',
        handAuthored: true },
      { id: 'as-04-break-the-ascent', archetype: 'clear', title: 'Break the Ascent',
        summary: 'Break the angelic line holding the pillar road.' },
      { id: 'as-05-light-convoy', archetype: 'escort', title: 'The Light Convoy',
        summary: 'Move harvested light up the pillar under attack.' },
      { id: 'as-06-regional-callback', archetype: 'story', title: 'What You Left Behind',
        summary: 'ASIA CALLBACK — three class-variant scripts (Monk / Samurai / Atlantean), dialogue layer selects by class. HAND_AUTHORED_TODO x3.',
        handAuthored: true },
      { id: 'as-07-herald-truth-2', archetype: 'story', title: 'Second Doubt',
        summary: 'A second herald truth cracks the patron facade further.', handAuthored: true },
      { id: 'as-08-kneeling-angel', archetype: 'boss', title: 'The Kneeling Angel',
        summary: 'Defeat a lesser angel guarding the final approach.',
        enemyFamily: 'lesser-angels' },
      { id: 'as-09-player-breaks', archetype: 'story', title: 'The Line You Cross',
        summary: "The player's rare breaking line — Asia instance.", handAuthored: true },
      { id: 'as-10-final-harvest', archetype: 'portal_approach', title: 'Enough Light',
        summary: 'Complete the ritual harvest needed to force the Jade Court open.' },
    ],
  },
  {
    id: 'kunlun-jade-court', displayName: 'Kunlun (The Jade Court)', kind: 'portal',
    anchor: { lat: 36.00, lng: 92.00 }, region: 'Kunlun', continent: 'Asia',
    pantheon: 'Angelic (contested)', homeClass: null, tier: 5, act: 'ACT_IV', levelRange: [44, 46],
    biome: 'portal-threshold', enemyFamilies: ['radiant-guardians', 'lesser-angels'],
    connectsTo: ['kunlun-ascent'],
    onHeavenApproach: true, heavenApproachOrder: 3, portalSite: true, handAuthored: true,
    questChain: [
      { id: 'as-11-mask-drops', archetype: 'story', title: 'The Pillar Opens',
        summary: "Azazel's mask drops at the pillar between earth and heaven.",
        handAuthored: true },
      { id: 'as-12-cross-threshold', archetype: 'portal_approach', title: 'Into the Light',
        summary: 'Step through — hands control to the Heaven arc (built later).',
        handAuthored: true },
    ],
  },
  {
    id: 'kyoto-thousand-gates', displayName: 'Kyoto (The Thousand Gates)', kind: 'city',
    anchor: { lat: 35.01, lng: 135.77 }, region: 'Japan', continent: 'Asia',
    pantheon: 'Shinto', homeClass: 'Samurai', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'urban-temperate', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['setouchi-inland-sea'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'kyo-01-mentor', archetype: 'story', title: 'The Master of the Thousand Gates',
        summary: 'Meet your mentor; learn class basics.', handAuthored: true },
      { id: 'kyo-02-first-blood', archetype: 'clear', title: 'Strays Below the Shrines',
        summary: 'Cull corrupted wildlife on the shrine paths.', enemyFamily: 'corrupted-wildlife' },
      { id: 'kyo-03-discovery', archetype: 'story', title: 'A Torn Banner',
        summary: 'Discover the corruption moving through the old capital.', handAuthored: true },
      { id: 'kyo-04-first-evil', archetype: 'boss', title: 'Evil at the Gates',
        summary: 'Battle the first true evil enemy beneath the gates.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'setouchi-inland-sea', displayName: 'The Inland Sea', kind: 'corridor',
    anchor: { lat: 34.40, lng: 133.20 }, region: 'Japan', continent: 'Asia',
    pantheon: 'Shinto', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 18],
    biome: 'inland-sea-coast', enemyFamilies: ['lesser-evil-scouts', 'evil-raiders'],
    connectsTo: ['kyoto-thousand-gates', 'shanghai-eastern-dock'],
    seaGates: ['shanghai-eastern-dock'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'set-01-coast-road-west', archetype: 'clear', title: 'The Coast Road West',
        summary: 'Clear the raiders working the inland sea coast.', enemyFamily: 'evil-raiders' },
      { id: 'set-02-passage-west', archetype: 'fetch', title: 'Passage West',
        summary: 'Secure passage for the crossing to the mainland.' },
    ],
  },
  {
    id: 'shanghai-eastern-dock', displayName: 'Shanghai (The Eastern Dock)', kind: 'city',
    anchor: { lat: 31.23, lng: 121.47 }, region: 'East China', continent: 'Asia',
    pantheon: 'Chinese', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [18, 22],
    biome: 'urban-temperate', enemyFamilies: ['lesser-evil-scouts', 'dark-casters'],
    connectsTo: ['setouchi-inland-sea', 'three-gorges-river-teeth'],
    seaGates: ['setouchi-inland-sea'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'sha-01-off-the-docks', archetype: 'escort', title: 'Off the Docks',
        summary: 'Escort the landed travelers off the contested docks.' },
      { id: 'sha-02-river-mouth', archetype: 'clear', title: 'The River Mouth',
        summary: 'Clear the casters holding the mouth of the great river.',
        enemyFamily: 'dark-casters' },
    ],
  },
  // ── Batch slice 2: the Yangtze climb + the island road + the merge ──
  {
    id: 'three-gorges-river-teeth', displayName: 'The Three Gorges (River Teeth)', kind: 'corridor',
    anchor: { lat: 30.80, lng: 111.00 }, region: 'Yangtze', continent: 'Asia',
    pantheon: 'Chinese', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [22, 27],
    biome: 'river-gorge', enemyFamilies: ['dark-casters', 'veil-ambushers'],
    connectsTo: ['shanghai-eastern-dock', 'sichuan-red-basin'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'gor-01-gorge-witch', archetype: 'boss', title: 'The Gorge Witch',
        summary: 'Defeat the region-champion of the river teeth (Mental domain).',
        enemyFamily: 'region-champion' },
      { id: 'gor-02-river-teeth-convoy', archetype: 'escort', title: 'Through the Teeth',
        summary: 'Bring the river convoy through the gorges intact.' },
    ],
  },
  {
    id: 'sichuan-red-basin', displayName: 'Sichuan (The Red Basin)', kind: 'corridor',
    anchor: { lat: 30.60, lng: 104.10 }, region: 'Sichuan', continent: 'Asia',
    pantheon: 'Chinese', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [27, 31],
    biome: 'terraced-basin', enemyFamilies: ['evil-raiders', 'hollowed-brutes'],
    connectsTo: ['three-gorges-river-teeth', 'kham-eastern-plateau'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'sic-01-the-terraces', archetype: 'clear', title: 'The Terraces',
        summary: 'Clear the raiders stripping the red basin.' },
      { id: 'sic-02-climb-provisions', archetype: 'fetch', title: 'Provisions for the Climb',
        summary: 'Gather what the plateau climb demands.' },
    ],
  },
  {
    id: 'bali-drowned-crown', displayName: 'Bali (The Drowned Crown)', kind: 'city',
    anchor: { lat: -8.65, lng: 115.22 }, region: 'Sunda Islands', continent: 'Asia',
    pantheon: 'Balinese', homeClass: 'Atlantean', tier: 1, act: 'ACT_I', levelRange: [1, 12],
    biome: 'island-tropics', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['java-temple-shore'], seaGates: ['java-temple-shore'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: true,
    questChain: [
      { id: 'bal-01-mentor', archetype: 'story', title: 'The Keeper of the Drowned Crown',
        summary: 'Meet your mentor; learn class basics.', handAuthored: true },
      { id: 'bal-02-first-blood', archetype: 'clear', title: 'The Reef Roads',
        summary: 'Cull corrupted wildlife along the shore.', enemyFamily: 'corrupted-wildlife' },
      { id: 'bal-03-discovery', archetype: 'story', title: 'Salt in the Spring',
        summary: 'Discover the corruption rising from the water.', handAuthored: true },
      { id: 'bal-04-first-evil', archetype: 'boss', title: 'Evil at the Crown',
        summary: 'Battle the first true evil enemy at the temple steps.',
        enemyFamily: 'lesser-evil-scouts' },
    ],
  },
  {
    id: 'java-temple-shore', displayName: 'Java (The Temple Shore)', kind: 'corridor',
    anchor: { lat: -7.25, lng: 112.75 }, region: 'Sunda Islands', continent: 'Asia',
    pantheon: 'Balinese', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [12, 16],
    biome: 'island-tropics', enemyFamilies: ['corrupted-wildlife', 'lesser-evil-scouts'],
    connectsTo: ['bali-drowned-crown', 'bangkok-delta-gate'],
    seaGates: ['bali-drowned-crown', 'bangkok-delta-gate'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'jav-01-temple-shore', archetype: 'clear', title: 'The Temple Shore',
        summary: 'Clear the corrupted shore between the old temples.' },
      { id: 'jav-02-crossing-offering', archetype: 'fetch', title: 'An Offering for the Crossing',
        summary: 'Gather the offering the northern crossing demands.' },
    ],
  },
  {
    id: 'bangkok-delta-gate', displayName: 'Bangkok (The Delta Gate)', kind: 'city',
    anchor: { lat: 13.76, lng: 100.50 }, region: 'Siam', continent: 'Asia',
    pantheon: 'Thai', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [16, 20],
    biome: 'delta-city', enemyFamilies: ['lesser-evil-scouts', 'evil-raiders'],
    connectsTo: ['java-temple-shore', 'angkor-stone-map'], seaGates: ['java-temple-shore'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'ban-01-through-the-delta', archetype: 'escort', title: 'Through the Delta',
        summary: 'Escort the landed travelers through the canal city.' },
      { id: 'ban-02-north-road', archetype: 'clear', title: 'The North Road',
        summary: 'Clear the raiders on the road to the temple country.',
        enemyFamily: 'evil-raiders' },
    ],
  },
  {
    id: 'angkor-stone-map', displayName: 'Angkor (The Stone Map)', kind: 'corridor',
    anchor: { lat: 13.41, lng: 103.87 }, region: 'Khmer', continent: 'Asia',
    pantheon: 'Khmer', homeClass: null, tier: 2, act: 'ACT_II', levelRange: [20, 25],
    biome: 'jungle-temple', enemyFamilies: ['veil-ambushers', 'dark-casters'],
    connectsTo: ['bangkok-delta-gate', 'yunnan-cloud-steps'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'ang-01-stone-map', archetype: 'story', title: 'The Stone Map',
        summary: "The temple is a map of heaven's mountain, carved a thousand years ago — it points the road to Kunlun." },
      { id: 'ang-02-temple-warden', archetype: 'boss', title: 'The Temple Warden',
        summary: 'Defeat the region-champion of the stone map (Spiritual domain).',
        enemyFamily: 'region-champion' },
    ],
  },
  {
    id: 'yunnan-cloud-steps', displayName: 'Yunnan (The Cloud Steps)', kind: 'corridor',
    anchor: { lat: 25.00, lng: 101.50 }, region: 'Yunnan', continent: 'Asia',
    pantheon: 'Chinese / Tibetan', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [25, 31],
    biome: 'highland-jungle', enemyFamilies: ['dark-casters', 'hollowed-brutes'],
    connectsTo: ['angkor-stone-map', 'kham-eastern-plateau'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'yun-01-cloud-steps', archetype: 'clear', title: 'The Cloud Steps',
        summary: 'Clear the terraced climb toward the plateau.' },
      { id: 'yun-02-up-to-plateau', archetype: 'escort', title: 'Up to the Plateau',
        summary: 'Escort the caravan up the cloud steps.' },
    ],
  },
  {
    id: 'kham-eastern-plateau', displayName: 'Kham (The Eastern Plateau)', kind: 'corridor',
    anchor: { lat: 31.50, lng: 97.00 }, region: 'Kham', continent: 'Asia',
    pantheon: 'Tibetan', homeClass: null, tier: 3, act: 'ACT_III', levelRange: [31, 36],
    biome: 'high-desert-plateau',
    enemyFamilies: ['evil-raiders', 'veil-ambushers', 'hollowed-brutes'],
    connectsTo: ['sichuan-red-basin', 'yunnan-cloud-steps', 'kunlun-jade-gate'],
    onHeavenApproach: false, heavenApproachOrder: null, portalSite: false, handAuthored: false,
    questChain: [
      { id: 'kha-01-eastern-climb', archetype: 'clear', title: 'The Eastern Climb',
        summary: 'Clear the last free road up the plateau.' },
      { id: 'kha-02-caravan-to-the-gate', archetype: 'escort', title: 'The Caravan to the Gate',
        summary: 'The sea road and the island road become one — escort the caravan to the Jade Gate.' },
    ],
  },
];

// ── Convenience selectors (WorldBuilder / QuestFactory can import these) ──────
export const getZone = (id: string): Zone | undefined => WORLD.find((z) => z.id === id);

export const heavenApproachZones = (): Zone[] =>
  WORLD.filter((z) => z.onHeavenApproach).sort((a, b) => (a.heavenApproachOrder ?? 0) - (b.heavenApproachOrder ?? 0));

export const portalSites = (): Zone[] => WORLD.filter((z) => z.portalSite);
