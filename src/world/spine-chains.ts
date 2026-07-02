// Cross-zone spine chaining for the Europe march. QuestFactory uses this as each
// zone's entryPrerequisite. Home cities have none (their chains are class-gated
// via classRequirement = the zone's homeClass). Groups mean "any one satisfies."
export type EntryPrereq = (string | { anyOf: string[] })[];

export const ENTRY_PREREQUISITES: Record<string, EntryPrereq> = {
  'campania-shadow': ['rom-04-appian-gate'],
  'apulia-eastern-dock': ['cam-03-buried-relics'],
  'epirus-landing': ['apu-02-harbor-corsairs'],
  'thessaloniki-outpost': ['var-02-march-provisions'],
  'thermopylae-pass': [{ anyOf: ['eu-02-first-harvest', 'epi-02-march-inland'] }],
  'delphi-sanctuary': ['eu-10-final-harvest'],
  'karelia-lakes': ['mur-04-harbor-evil'],
  'smolensk-gate': ['kar-02-dead-wagons'],
  'bryansk-woodland': ['mos-04-beneath-walls'],
  'kyiv-river-gate': [{ anyOf: ['bry-02-familiar-colors', 'smo-02-river-ford'] }],
  'carpathian-crossing': ['kyi-02-combined-caravan'],
  'tyrol-forge-road': ['mun-04-forge-raid'],
  'alps-high-pass': [{ anyOf: ['bur-02-road-ambushers', 'tyr-03-pass-supplies'] }],
  'vienna-river-muster': ['alp-02-ambush-ring'],
  'belgrade-iron-river': [{ anyOf: ['vie-02-dock-saboteurs', 'car-02-defile-convoy'] }],
  'vardar-corridor': ['bel-02-confluence-warlord'],
  'kent-passage': ['lon-04-first-evil'],
  'calais-landing': ['ken-02-passage-papers'],
  'paris-veiled-lights': ['cal-02-beach-raiders'],
  'burgundy-vintners-road': ['par-02-catacomb-casters'],
};
