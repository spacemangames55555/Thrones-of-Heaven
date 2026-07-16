/**
 * CLASS CANON — the single mapping between the game's internal class ids and
 * the manifest's homeClass names (what classRequirement-gated quests match on).
 *
 * ── PERMANENT CANON RULE ─────────────────────────────────────────────────────
 * 'Mage' and 'Wizard' are TWO DIFFERENT classes:
 *   • Wizard = the EGYPT class (built, playable today).
 *   • Mage   = the MOSCOW class (unbuilt).
 * Never alias, merge, or rename one to the other — in any run.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { WORLD, type Zone } from './world-manifest';
import { CONTINENT_WORLD } from './world-builder';

/** internal ClassId → manifest homeClass name (extend as classes ship). */
export const MANIFEST_CLASS_FOR: Record<string, string> = {
  blacksmith: 'Blacksmith',
  necromancer: 'Necromancer',
  wizard: 'Wizard', // Egypt's class — NOT Moscow's 'Mage' (see the canon rule)
  druid: 'Druid', // Seattle's class (built as a playable class today)
  mage: 'Mage', // Moscow's class — NOT Egypt's 'Wizard' (see the canon rule)
  bard: 'Bard', // London's class (built as a playable class today)
  priest: 'Priest', // Rome (Europe) — built as a playable class today
  witchdoctor: 'Witch Doctor', // Kinshasa (Africa) — class kit not built yet
  monk: 'Monk', // Lhasa (Asia) — built as a playable class today
  samurai: 'Samurai', // Kyoto (Asia) — class kit not built yet
  atlantean: 'Atlantean', // Bali (Asia) — class kit not built yet
  assassin: 'Assassin', // Dubai (Near East) — built as a playable class today
  hunter: 'Hunter', // Sydney (Oceania) — class kit not built yet
  savage: 'Savage', // Mexico City (Mesoamerica) — built as a playable class today
};

/**
 * Every class name the world manifest knows or reserves — the DEV class
 * override cycles through these. Seven are canon today (five Europe home
 * cities + Seattle's Druid + Egypt's Wizard); the remaining roster slots (14
 * planned) are added here as their regions are authored — names are never
 * invented ahead of their design.
 */
/**
 * CLASS-START (Casey's ruling): the manifest zone a class calls HOME — resolved
 * from DATA (classId → canon name → the zone whose homeClass matches), so all 14
 * classes inherit their home start automatically as they ship. Null when the
 * class has no canon name or no home zone in the manifest.
 */
export function homeZoneForClass(classId: string): Zone | null {
  const name = MANIFEST_CLASS_FOR[classId];
  if (!name) return null;
  return WORLD.find((z) => z.homeClass === name) ?? null;
}

/** Select-screen label for where a class starts. Earth-homed classes (the Druid:
 *  Seattle → North America → the 'earth' world) keep the SHIPPED WA start
 *  (Enumclaw) unchanged; every other class starts in its home city. */
export function homeStartLabelForClass(classId: string): string {
  const zone = homeZoneForClass(classId);
  if (!zone || CONTINENT_WORLD[zone.continent] === 'earth') return 'Enumclaw, Washington';
  return zone.displayName;
}

export const KNOWN_CLASS_NAMES: readonly string[] = [
  'Blacksmith', // Munich (built as a playable class today)
  'Necromancer', // Murmansk (built as a playable class today)
  'Wizard', // Egypt (built as a playable class today)
  'Druid', // Seattle
  'Priest', // Rome
  'Mage', // Moscow — distinct from Wizard, permanently
  'Bard', // London
  'Witch Doctor', // Kinshasa (Africa)
  'Monk', // Lhasa (Asia)
  'Samurai', // Kyoto (Asia)
  'Atlantean', // Bali (Asia)
  'Assassin', // Dubai (Near East)
  'Hunter', // Sydney (Oceania)
  'Savage', // Mexico City (Mesoamerica)
];
