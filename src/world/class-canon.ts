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

/** internal ClassId → manifest homeClass name (extend as classes ship). */
export const MANIFEST_CLASS_FOR: Record<string, string> = {
  blacksmith: 'Blacksmith',
  necromancer: 'Necromancer',
  wizard: 'Wizard', // Egypt's class — NOT Moscow's 'Mage' (see the canon rule)
  witchdoctor: 'Witch Doctor', // Kinshasa (Africa) — class kit not built yet
};

/**
 * Every class name the world manifest knows or reserves — the DEV class
 * override cycles through these. Seven are canon today (five Europe home
 * cities + Seattle's Druid + Egypt's Wizard); the remaining roster slots (14
 * planned) are added here as their regions are authored — names are never
 * invented ahead of their design.
 */
export const KNOWN_CLASS_NAMES: readonly string[] = [
  'Blacksmith', // Munich (built as a playable class today)
  'Necromancer', // Murmansk (built as a playable class today)
  'Wizard', // Egypt (built as a playable class today)
  'Druid', // Seattle
  'Priest', // Rome
  'Mage', // Moscow — distinct from Wizard, permanently
  'Bard', // London
  'Witch Doctor', // Kinshasa (Africa)
];
