import rimManifest from '../../art/enemy-rims.json';
import { hasOverrideArt } from './spriteOverrides';
import { isDomainMarked } from '../world/enemy-roster';

/**
 * ENEMY ART REGISTRY (Pass 10) — which enemy families render BAKED RIM ART
 * (Model C, Art Session 7) and which keep today's placeholder + runtime
 * multiply tint. Per-family activation, exactly like the terrain contract:
 * a family with art renders it, a family without is untouched, and the two
 * coexist in the same world.
 *
 * ── THE TRAP THIS EXISTS TO AVOID ────────────────────────────────────────
 * The obvious predicate — "is there a PNG at the contract path?" — CANNOT
 * work here, and the recon for this pass is what found it. `art:rims` writes
 * its output to `public/sprites/enemy-<family>.png`, which is the SAME path
 * the grayscale gen-sprites placeholder already occupies. All nine exist
 * today. File presence therefore says nothing about whether a family is
 * rim-backed; it would activate every family at once and strip the domain
 * tint off nine placeholder sprites.
 *
 * So activation keys off the CANONICAL MASTER, which is the thing Model C
 * says is authoritative. `art/enemy-rims.json` is written by `npm run
 * art:rims` and lists exactly the keys it baked from a master. A family is
 * rim-backed when BOTH hold:
 *   1. the rims manifest lists its key (a master exists and baked), and
 *   2. the drop-in loader actually applied real art for that key at boot
 *      (`hasOverrideArt`) — so a declared-but-unloadable PNG falls back
 *      rather than rendering a missing texture.
 *
 * ── WHAT ACTIVATION CHANGES ──────────────────────────────────────────────
 * Exactly one thing: a rim-backed family gets NO runtime domain tint. Its
 * domain is already in the pixels. Everything else — spawning, AI, stats,
 * plates, pooling — is untouched. A family that is not rim-backed follows
 * the Pass 6 path unchanged, down to the same multiply tint on the same
 * placeholder texture.
 */

const SHIPPED_KEYS: ReadonlySet<string> = new Set((rimManifest as { rimDerived: string[] }).rimDerived);

/** Live view of the declared keys. Only the gate seam below ever swaps it. */
let RIM_KEYS: ReadonlySet<string> = SHIPPED_KEYS;
/** Gate seam: keys whose art the loader should be TREATED as having applied. */
let LOADED_OVERRIDE: ReadonlySet<string> | null = null;

/**
 * RUNTIME VERIFICATION SEAM (tools/verify-runtime.mjs). The rims registry
 * ships EMPTY — no masters are painted yet — so the activation half of the
 * gate has nothing real to assert against. Rather than let that check start
 * asserting only once the bestiary happens to land (the exact way Art Session
 * 4 lost three checks), the gate DECLARES a synthetic family here, proves
 * activation and mixed coexistence, then restores the shipped state.
 * Passing (null, null) restores. Invisible to players; no UI, no behavior.
 */
export function __gateDeclare(keys: string[] | null, loaded: string[] | null): boolean {
  RIM_KEYS = keys === null ? SHIPPED_KEYS : new Set(keys);
  LOADED_OVERRIDE = loaded === null ? null : new Set(loaded);
  return keys !== null;
}

/** The texture key a family's art lands under (the art:rims naming — read, never re-declared). */
export function enemyArtKey(family: string): string {
  return `enemy-${family}`;
}

/** Does this family render baked rim art (and therefore take NO runtime tint)? */
export function isRimBacked(family: string): boolean {
  const key = enemyArtKey(family);
  const loaded = LOADED_OVERRIDE ? LOADED_OVERRIDE.has(key) : hasOverrideArt(key);
  return RIM_KEYS.has(key) && loaded;
}

/** Keys the rims manifest declares — the gate reads this to prove sync. */
export function declaredRimKeys(): string[] {
  return [...RIM_KEYS].sort();
}

/**
 * The MULTIPLY tint a spawned enemy of this family should carry.
 * Rim-backed families get pure white: multiply by white is the identity, so
 * the art renders exactly as baked AND the hit-flash still has a correct
 * colour to restore to. Everything else gets its domain tint as before.
 */
export function enemyBaseTint(family: string, domainTint: number): number {
  // UNMARKED families (Casey ruling, Art Session 8) are never painted with
  // their domain — not as a runtime tint on a placeholder, and not as a rim
  // once their master lands. They take white either way, so the ruling holds
  // as DATA read from the canon table rather than as a per-call-site
  // exception someone has to remember to write.
  if (!isDomainMarked(family)) return 0xffffff;
  return isRimBacked(family) ? 0xffffff : domainTint;
}

/** Canon: is this family painted with its domain at all? (re-exported so the
 *  gate and the funnel read ONE table, never a second copy). */
export { isDomainMarked };
