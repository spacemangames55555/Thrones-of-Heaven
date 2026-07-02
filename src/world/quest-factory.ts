import type { QuestDef, ObjectiveDef, ObjectiveTrigger } from '../quest/questData';
import { QUEST_XP_REWARD } from '../game/settings';
import type { Zone, QuestBeat, QuestArchetype } from './world-manifest';

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

/** Build ONE beat as a real QuestDef, chained to `prerequisite`. */
export function questForBeat(zone: Zone, beat: QuestBeat, prerequisite: string | null): QuestDef {
  const handAuthored = beat.handAuthored === true || zone.handAuthored === true;
  const line = handAuthored
    ? placeholderProse(beat.id) // HAND_AUTHORED_TODO: prose written by the designer later
    : `${zone.displayName}: ${beat.summary}`;
  return {
    id: beat.id,
    title: beat.title,
    prerequisites: prerequisite ? [prerequisite] : [],
    // Generated zones have no NPC givers yet; like the existing climax quests,
    // beats auto-activate when their prerequisite completes (forward march).
    autoActivate: true,
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
export function buildZoneQuests(zone: Zone, entryPrerequisite: string | null): { defs: QuestDef[]; exitQuestId: string | null } {
  const defs: QuestDef[] = [];
  let prev = entryPrerequisite;
  for (const beat of zone.questChain) {
    const def = questForBeat(zone, beat, prev);
    defs.push(def);
    prev = def.id;
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
