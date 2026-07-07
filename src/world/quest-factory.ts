import type { QuestDef, QuestPrerequisite, ObjectiveDef, ObjectiveTrigger } from '../quest/questData';
import { QUEST_XP_REWARD } from '../game/settings';
import type { Zone, QuestBeat, QuestArchetype } from './world-manifest';

/** What a caller may pass as a zone's entry gate: nothing, one quest id, or a
 *  full prerequisite list (spine-chains.ts entries — may contain anyOf groups). */
export type ZoneEntryPrerequisite = string | readonly QuestPrerequisite[] | null;

const normalizeEntry = (entry: ZoneEntryPrerequisite): readonly QuestPrerequisite[] =>
  entry === null ? [] : typeof entry === 'string' ? [entry] : entry;

/** Regional-callback variant classes PER CONTINENT (the eu-06 / af-06 pattern):
 *  each region's callback beat scripts one variant per class whose road
 *  converges there. Unknown continents scaffold no variants (loudly nothing). */
export const CALLBACK_CLASSES_BY_CONTINENT: Record<string, readonly string[]> = {
  Europe: ['bard', 'priest', 'blacksmith', 'mage', 'necromancer'],
  Africa: ['wizard', 'witchdoctor'],
  Asia: ['monk', 'samurai', 'atlantean'],
  'Near East': ['assassin'],
  Oceania: ['hunter'],
  Mesoamerica: ['savage'],
};

/**
 * QUEST FACTORY (Phase 0). Turns a manifest Zone's questChain into REAL
 * {@link QuestDef} objects for the game's ONE existing quest system (the
 * QUEST_REGISTRY / QuestChain pipeline in src/quest). It builds new entries
 * only — existing quests are never modified.
 *
 * CHAINING: beats chain IN questChain ORDER via `prerequisites`. The FIRST
 * beat's prerequisite is the `entryPrerequisite` the CALLER passes in —
 * cross-zone spine order is always explicit at the call site, never inferred
 * from the map graph.
 *
 * REGISTRATION: this module never touches QUEST_REGISTRY itself. The game
 * composes at startup with {@link appendToRegistry} (a pure combine), keeping
 * "generated" strictly additive after the hand-authored chain.
 *
 * TRIGGERS & MARKERS (the one seam with the existing system): ObjectiveTrigger
 * and TargetKind are closed unions in questData.ts — on purpose, typos fail
 * the build. Generated beats mint one new trigger id each via
 * {@link triggerForBeat}; wiring those ids into the unions (and their marker
 * targets into TargetKind/TARGET_WORLD/resolveTarget) is the Phase-1 step
 * that happens when a zone is actually stamped into the game. Until then the
 * cast below is the single, documented crossing point, and generated
 * objectives carry `target: null` (no marker) rather than inventing targets.
 *
 * GUARDRAIL: for any beat (or zone) flagged handAuthored, the structure is
 * wired but ALL prose is a neutral placeholder carrying a HAND_AUTHORED_TODO
 * marker. This factory NEVER invents signature dialogue, boss reveals, patron
 * voice lines, or story twists.
 */

/** The trigger id a generated beat's objective completes on (unique per beat). */
export function triggerForBeat(beat: QuestBeat): string {
  const suffix: Record<QuestArchetype, string> = {
    story: 'story-complete',
    clear: 'cleared',
    fetch: 'retrieved',
    escort: 'escorted',
    boss: 'boss-defeated',
    portal_approach: 'ritual-complete',
  };
  return `${beat.id}-${suffix[beat.archetype]}`;
}

// The single documented union-crossing point (see the module header).
const asTrigger = (id: string): ObjectiveTrigger => id as ObjectiveTrigger;

/** Neutral placeholder for hand-authored prose — never invented content. */
// HAND_AUTHORED_TODO markers are emitted per beat; see placeholderProse().
function placeholderProse(beatId: string): string {
  return `HAND_AUTHORED_TODO: ${beatId} — designer prose goes here.`;
}

/** The objective a beat's archetype implies (tracker text from its summary). */
function objectiveForBeat(beat: QuestBeat, handAuthored: boolean): ObjectiveDef {
  const text = handAuthored ? placeholderProse(beat.id) : beat.summary;
  return {
    text,
    trigger: asTrigger(triggerForBeat(beat)),
    // No marker target: TargetKind entries are wired in Phase 1 when the zone
    // is stamped (see the module header). The arrow simply stays quiet.
    target: null,
  };
}

/** Build ONE beat as a real QuestDef, chained to the given prerequisite slots.
 *  `isFirstBeat` matters for HOME CITIES: their opening beat must NOT
 *  auto-activate — a real class match (e.g. Necromancer + Murmansk) would
 *  otherwise hijack the fresh-start Earth opening the moment the zone builds.
 *  The class-start feature (later) accepts it explicitly; the rest of the
 *  chain stays auto so completed beats flow forward. */
export function questForBeat(zone: Zone, beat: QuestBeat, prerequisites: readonly QuestPrerequisite[], isFirstBeat = false): QuestDef {
  const handAuthored = beat.handAuthored === true || zone.handAuthored === true;
  const line = handAuthored
    ? placeholderProse(beat.id) // HAND_AUTHORED_TODO: prose written by the designer later
    : `${zone.displayName}: ${beat.summary}`;
  // CLASS-VARIANT CALLBACK beats (eu-06 pattern — the manifest summary flags
  // them): scaffold one HAND_AUTHORED_TODO placeholder per class; the dialogue
  // layer (questLinesFor) selects by class and falls back to the shared line.
  const wantsClassVariants = handAuthored && beat.summary.includes('class-variant');
  const callbackClasses = CALLBACK_CLASSES_BY_CONTINENT[zone.continent] ?? [];
  const classVariants = wantsClassVariants && callbackClasses.length > 0
    ? Object.fromEntries(callbackClasses.map((c) => [c, [`HAND_AUTHORED_TODO: ${beat.id} (${c}) — designer prose goes here.`]]))
    : undefined;
  return {
    id: beat.id,
    title: beat.title,
    prerequisites,
    // Home-city Act I chains only ever activate for their native class.
    ...(zone.homeClass ? { classRequirement: zone.homeClass.toLowerCase() } : {}),
    ...(classVariants ? { classVariants } : {}),
    // Generated zones have no NPC givers yet; like the existing climax quests,
    // beats auto-activate when their prerequisite completes (forward march) —
    // EXCEPT a home city's opening beat (see the doc comment above).
    autoActivate: !(isFirstBeat && zone.homeClass),
    objectives: [objectiveForBeat(beat, handAuthored)],
    npcInactiveLines: [line],
    npcActiveLines: [line],
    npcCompleteLines: [line],
    preAcceptHint: beat.title,
    reward: {
      healToFull: false,
      xp: QUEST_XP_REWARD,
      banner: `${beat.title} — complete.`,
    },
  };
}

/**
 * Wire a zone's WHOLE questChain, in order, into real quest objects.
 * @param entryPrerequisite quest id that gates the FIRST beat (explicit spine
 *   order from the caller; null = available from the start).
 * @returns the defs plus the LAST beat's id — the caller passes that as the
 *   next zone's entryPrerequisite to continue the spine.
 */
export function buildZoneQuests(zone: Zone, entryPrerequisite: ZoneEntryPrerequisite): { defs: QuestDef[]; exitQuestId: string | null } {
  const defs: QuestDef[] = [];
  let prev: readonly QuestPrerequisite[] = normalizeEntry(entryPrerequisite);
  for (let i = 0; i < zone.questChain.length; i++) {
    const def = questForBeat(zone, zone.questChain[i], prev, i === 0);
    defs.push(def);
    prev = [def.id];
  }
  return { defs, exitQuestId: defs.length ? defs[defs.length - 1].id : null };
}

/**
 * Pure composition: the base registry (untouched) followed by generated defs.
 * Throws on id collisions so a generated beat can never shadow a real quest.
 */
export function appendToRegistry(base: readonly QuestDef[], generated: readonly QuestDef[]): QuestDef[] {
  const seen = new Set(base.map((q) => q.id));
  for (const g of generated) {
    if (seen.has(g.id)) throw new Error(`Generated quest id '${g.id}' collides with an existing quest`);
    seen.add(g.id);
  }
  return [...base, ...generated];
}
