/**
 * THE BIOME ANCHORS — the single source of truth for every biome's colour,
 * indexed by Biome enum value (0..11).
 *
 * This module exists so anchors can be READ FROM SOURCE, NEVER RETYPED
 * (Casey ruling, Art Session 5 standing batch policy). Anchors define the
 * acceptance bands art is judged against, so a hand-copied literal silently
 * moves the band it defines — Art Session 5 typed #27476d for OCEAN's
 * #274b6d and shifted a whole luminance band by three units before the
 * miscopy surfaced. The `anchor-source` gate check enforces it: no tracked
 * .ts/.mjs under src/, scripts/ or tools/ may carry one of these as a
 * literal. Consumers import this array and index it by Biome.
 *
 * It is a LEAF: it imports nothing. The values used to live inside
 * terrain-placeholder.ts, which imports flora-config, so having flora-config
 * read them back from there would have closed an initialisation cycle —
 * FLORA_PROPS evaluates its anchors at module-init time and would have hit
 * the temporal dead zone. Keeping the data in a leaf makes the cycle
 * impossible rather than merely unlikely.
 *
 * The VALUES are unchanged from Pass 2; this is a move, not a re-colour.
 */
export const BIOME_COLORS = [
  0x274b6d, // OCEAN
  0x3a6d99, // FRESHWATER
  0xdcc98f, // BEACH
  0x5f9e46, // GRASS
  0xb8a24f, // SAVANNA
  0xd8b56a, // DESERT
  0x2f6d3a, // FOREST
  0x3a5f4a, // TAIGA
  0x8fa08a, // TUNDRA
  0xe8edf2, // SNOW
  0x7d7a74, // ROCK
  0x4a5f3f, // SWAMP
];
