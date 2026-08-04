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

/**
 * Canonical output sizes per SHARED-KEY CLASS — the drop-in fitter's frames.
 *
 * ── HOW THE FITTER ACTUALLY USES THESE (measured, Pass 11) ────────────────
 * `mintFitted` in src/render/spriteOverrides.ts CONTAIN-FITS the master's
 * OPAQUE BOUNDING BOX into the frame:
 *     scale = Math.min(frameW / bboxW, frameH / bboxH)
 * Empty master margins are discarded, so the master CANVAS size is almost
 * irrelevant — only the subject's box and ASPECT matter. Whichever axis is
 * tighter wins, and the other is letterboxed. A subject whose aspect fights
 * its frame is therefore rendered SMALL, however large its canvas.
 *
 * ── CREATURE (Pass 11, Commit 1) — the derivation, not a guess ────────────
 * A quadruped in the 24x34 townsfolk portrait frame is WIDTH-limited and
 * collapses. Measured on the three Session 9 re-lock candidates:
 *     wolf   bbox 80x51  -> renders 24.0 x 15.3, visual mass  198
 *     hyena  bbox 86x68  -> renders 24.0 x 19.0, visual mass  259
 * against `dark-casters` at visual mass 1584 — the roster's most massive
 * enemy and Casey's stated floor ("a wolf should not read smaller than a
 * robed caster"). That is an 8x deficit, so the frame is the defect.
 *
 * ASPECT, from the two clean quadruped reads: 80/51 = 1.569 and 86/68 =
 * 1.265, mean 1.417. (The third candidate's 0.704 is excluded as an outlier:
 * its box is inflated by a raised tail and thin legs — box fill 0.290 against
 * 0.538 and 0.569 for the other two. Excluding it is the PURPOSE rule from
 * the standing band: the frame must hold a quadruped BODY.)
 *
 * SIZE, from visual mass, against the REAL candidate aspects. A first draft
 * of this derivation assumed the frame aspect would match the subject aspect,
 * making rendered area simply w*h — and it was WRONG BY 6%: the actual
 * candidates do not sit at the mean aspect, so each letterboxes against the
 * frame and loses area. Measured at 66x46 they came out at mass 1494 and
 * 1522, both UNDER the 1584 floor the frame was supposed to clear. Deriving
 * from an idealised subject instead of the ones on disk is the same mistake
 * this whole band exists to catch, so the derivation is redone closed-form
 * against each candidate's own aspect `a` and box-fill `f`:
 *     width-limited  (a > w/h):  rendered area = w^2 / a
 *     height-limited (a < w/h):  rendered area = a * h^2
 *     mass = f * area >= 1584
 * The wolf (a = 1.569, f = 0.538) is width-limited and needs w >= 67.96.
 * The hyena (a = 1.265, f = 0.569) is height-limited and needs h >= 46.93.
 * Both bind, so both are honoured:  68 x 48  (aspect 1.4167 — which is also
 * the mean aspect exactly). Verified: wolf 1586, hyena 1657, floor 1584.
 *
 * MASTERS for this class author at 2x = 136x96, which keeps the long edge
 * under the ~152px ceiling where PixelLab starts ignoring `no_background`
 * (Art Session 8 finding). At 2x the derived 4px rim renders 2px — the same
 * thickness the angel class already gets, so this introduces no new
 * inconsistency (see the rim note in docs/art-pipeline.md).
 */
export const SIZE_CLASS = {
  townsfolk: { w: 24, h: 34 },
  demon: { w: 30, h: 38 },
  angel: { w: 48, h: 56 },
  /** LANDSCAPE. Quadrupeds and other long-bodied creatures. */
  creature: { w: 68, h: 48 },
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
  { id: 'corrupted-wildlife', sizeClass: 'creature', theme: 'hunched quadruped beast, low head, raised haunch' },
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
