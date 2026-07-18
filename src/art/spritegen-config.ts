/**
 * SPRITE-GEN CONFIG (art pass 1) — every color, seed, size, and threshold the
 * generator uses, as named constants. The Style Bible palette is NOT locked:
 * when it lands, rebind THESE constants and re-run `npm run gen:sprites`
 * (deterministic — same config, byte-identical PNGs).
 *
 * TINT-COMPAT RULE: all art values are GRAYSCALE (near-neutral channels) so
 * the existing multiplicative domain tint colorizes sprites unchanged, and
 * highlights stay ≤ GRAY.highlight so the white hit-flash still reads.
 */

/** One fixed seed for the whole set — determinism is a gate check. */
export const SPRITE_SEED = 0x7407;

/** The grayscale value ladder (8-bit, applied to R=G=B). */
export const GRAY = {
  outline: 0x20, // 1px dark outline everywhere
  shadow: 0x18, // the shared base shadow (with SHADOW_ALPHA)
  dark: 0x50, // deep body band
  mid: 0x78, // main body band
  light: 0xa8, // raised band
  bright: 0xd0, // top band
  highlight: 0xf0, // hard cap — the white hit-flash must still read
} as const;

/** Base-shadow geometry (identical across all 9, so they sit alike). */
export const SHADOW_ALPHA = 110; // 0-255
export const SHADOW_HEIGHT_PX = 4;

/** Canonical output sizes per SHARED-KEY CLASS (the drop-in fitter's frames —
 *  on-screen footprint is unchanged this pass). */
export const SIZE_CLASS = {
  townsfolk: { w: 24, h: 34 },
  demon: { w: 30, h: 38 },
  angel: { w: 48, h: 56 },
} as const;

export type SizeClassId = keyof typeof SIZE_CLASS;

/** MACHINE-CHECKED thresholds (gate): channel neutrality + coverage band. */
export const TINT_NEUTRALITY_MAX_SPREAD = 6; // max |R-G|,|G-B|,|R-B| per pixel
export const COVERAGE_MIN = 0.18; // opaque-pixel ratio floor (no near-empty sprite)
export const COVERAGE_MAX = 0.72; // ceiling (no blob-filling sprite)

/** The 9 roster families → output file/key + size class + silhouette theme.
 *  Keys follow the sanctioned convention: texture key `enemy-<family-id>`,
 *  file `public/sprites/enemy-<family-id>.png`. Themes anchor each shape to
 *  its family fantasy from the roster source of truth. */
export const SPRITE_FAMILIES: readonly { id: string; sizeClass: SizeClassId; theme: string }[] = [
  { id: 'corrupted-wildlife', sizeClass: 'townsfolk', theme: 'hunched quadruped beast, low head, raised haunch' },
  { id: 'evil-raiders', sizeClass: 'townsfolk', theme: 'humanoid marauder, jagged blade arm, horned helm' },
  { id: 'veil-ambushers', sizeClass: 'townsfolk', theme: 'low crouched cloak, two forward reaching claws' },
  { id: 'hollowed-brutes', sizeClass: 'townsfolk', theme: 'massive top-heavy torso, tiny head, dragging fists' },
  { id: 'lesser-evil-scouts', sizeClass: 'demon', theme: 'wiry imp, swept-back horns, long tail whip' },
  { id: 'herald-angels', sizeClass: 'angel', theme: 'tall herald, raised trumpet arm, narrow high wings' },
  { id: 'radiant-guardians', sizeClass: 'angel', theme: 'broad warden, tower shield front, wide low wings' },
  { id: 'lesser-angels', sizeClass: 'angel', theme: 'slight winged figure, empty hands, drooping wingtips' },
  { id: 'dark-casters', sizeClass: 'angel', theme: 'hooded robe, orb held high, no wings' },
] as const;

/** File/key naming (the sanctioned convention — single source). */
export function spriteKeyFor(familyId: string): string {
  return `enemy-${familyId}`;
}
export function spriteFileFor(familyId: string): string {
  return `public/sprites/${spriteKeyFor(familyId)}.png`;
}
