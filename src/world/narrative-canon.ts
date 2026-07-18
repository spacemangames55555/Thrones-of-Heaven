/**
 * NARRATIVE CANON — Casey-approved text, inserted VERBATIM. This module is the
 * single home for the game's written voice outside the hand-authored NA chain:
 * nothing in here is generated, paraphrased, or "improved" — the strings are
 * the writing (emphasis markers included). Renderers (MainScene banners, the
 * tracker) consult these maps FIRST; any slot with no entry falls back to its
 * HAND_AUTHORED_TODO placeholder, exactly as before.
 *
 * Voice rules live in docs/lore/azazel-canon.md — read it before adding lines.
 */

/** THE WATCHER's single line — spoken once per character, at the player's
 *  first lesser-evil kill, then never again. */
export const WATCHER_LINE = 'Well done, little one. Heaven sees you.';

/** AZAZEL'S CAMPFIRES — the rotating outpost flavor lines, in order, looping. */
export const AZAZEL_CAMPFIRE_LINES: readonly string[] = [
  'Eat. Even a grievance as old as mine keeps regular meals.',
  'You fight like someone with a home. That is not a weakness, whatever soldiers say. It is the entire argument.',
  'I do keep count of them — the gray ones we pass. Someone must. A shepherd who does not count is called a wolf.',
  'When this is over, ask me about the cliff sometime. It is a better story than they tell. Longer fall, worse company.',
  'Sleep. I will watch. It is the one thing everyone agrees I have always been good at.',
];

/** FAUNA CANON — each home's corrupted-wildlife DISPLAY animal (mechanics and
 *  the enemy family are untouched; Seattle/WA keeps its hand-built wolves). */
export const FAUNA_CANON: Readonly<Record<string, string>> = {
  'munich-anvil-hold': 'roe deer',
  'cairo-nile-crown': 'sacred ibis',
  'murmansk-bone-harbor': 'reindeer',
  'london-grey-chorus': 'foxes',
  'moscow-crystal-court': 'ravens',
  'kinshasa-river-drum': 'bonobos',
  'kyoto-thousand-gates': 'tanuki',
  'lhasa-prayer-citadel': 'pikas',
  'dubai-glass-souk': 'sand gazelles',
  'rome-eternal-seat': 'ruin cats',
  'mexico-lake-crown': 'axolotls',
  'sydney-harbour-watch': 'kookaburras',
  'bali-drowned-crown': 'macaques',
};

/** MENTOR OPENINGS — each home mentor's X-01 talk banner, verbatim. */
const MENTOR_OPENINGS: Record<string, string> = {
  'mun-01-mentor':
    "So you're awake. Good — the forge doesn't wait and neither does trouble. The deer have come down from the wood wrong this season. Standing in rings among the trees. Not grazing. Gray. Before you go looking at that, take these hinges to Greta at the Anvil's Rest — a town that eats together holds together. Go on. Then we talk about the wood.",
  'cai-01-mentor':
    'The river gave and the river took, my whole life — but it never gave this: the ibis fly against the wind now. Thoth\'s own birds, flocking wrong. First things first: Amara at the stalls needs these blessing jars, and a city is only as strong as its market. Walk it. Watch the sky on the way. Then come back and tell me what you saw.',
  'mur-01-mentor':
    "You picked a black season to wake. The reindeer have gone strange — old Varya swears she's seen them standing still in the surf. Standing. Still. Take her this lamp-oil first; a dark dock hut kills more sailors than storms do. And child — if anything watches you from the water line, don't wave.",
  'lon-01-mentor':
    "Every story in this city starts with fog and ends with a lesson — but the foxes have started screaming at hours no fox keeps, and one followed me three streets at a fixed distance. I don't know that lesson yet, and it worries me more than I'll say twice. Wren's lamps first: take her these wicks. Light is how a city argues with the dark, and I intend to win the argument.",
  'mos-01-mentor':
    'The Court measured everything, always — that is what we are for. Now the measurements come back wrong. Ravens on the courtyard wall, perching in perfect rows. *Counted* rows. Birds do not count. Take Fyodor this lens while I re-check my figures. If the numbers are right, the world is wrong — and I would very much rather it were the numbers.',
  'kin-01-mentor':
    'The river talks, little one. Always has. Lately it stammers — and the bonobos upriver have gone silent. The gentle ones. Silent. Mama Nsimba\'s pot knows trouble before my drum does, so take her these herbs and keep your ears open in the market. We are going to listen properly, you and I. Then we are going to answer.',
  'kyo-01-mentor':
    'A thousand gates, and each one a threshold between what is and what waits. Lately the tanuki walk the gate paths in daylight — unafraid, unhurried, as if the thresholds mean nothing now. Hana tends the shrines — bring her this tablet, and bow where she bows; the forms hold us when nothing else does. Then return. Bring your blade.',
  'lha-01-mentor':
    'You wake at the roof of the world — breathe first; the mountain insists. Yesterday the pikas covered the eastern slope, a whole hillside of them, and every one faced the citadel. The wind announced nothing. Take Pemba his tea bricks, turn the wheels as you pass, and watch the slopes. Clear eyes and full cups, I think, before this is done.',
  'dub-01-mentor':
    "Everything in this souk has a price, and lately something's been paying in fear. Sand gazelles stand in the alley mouths and do not run. Gazelles. Not running. Bad for trade, worse for the soul. Furnace sand to Rashid first; glass stops for no omen. Count the alley mouths as you go. You'll understand why soon enough.",
  'rom-01-mentor':
    "Every age thinks it's the last one — I've read enough history to laugh at that. I'm not laughing this season. The ruin cats — a thousand of them in this city, and every one I pass is watching the same direction. Take Lucia these altar candles; she feeds the steps at dawn, and this city runs on her bread more than my prayers. Then we'll see to the roads.",
  'mex-01-mentor':
    'The lake remembers everything this valley ever was — and something is moving under its memory. Itzel says the axolotls have stopped smiling. Laugh if you like; I did, once. She needs these sickles for the harvest — the chinampas feed us all, and hunger is the first enemy in every war. Go. Cut. Come back ready to talk about the second enemy.',
  'syd-01-mentor':
    "Sea's been wrong for a month — pots come up empty, the kookaburras laugh all night at nothing, and last week something followed Banjo's ferry the whole crossing without once breaking water. Take him these ropes; a ferryman short of rope is a drowning waiting on a schedule. Watch the shoreline while you walk it. We compare notes tonight.",
  'bal-01-mentor':
    "The sea gives this island everything — asks only respect back. Lately the temple monkeys have stopped taking the offerings. Ketut leaves them each dawn, and the macaques only watch her. Only watch. Carry these baskets to her, and set your own offering on the sand while you're there. Whatever's coming, we'll meet it fed, blessed, and unafraid. That's the island way.",
};

/** AZAZEL — the six region-outpost arrival banners (X-01 azazel-welcome), verbatim. */
const ARRIVAL_BANNERS: Record<string, string> = {
  'eu-01-azazel-welcome':
    'Be welcome — my fire is yours. The ones upon the mountain would have you kneel before they feed you; a guest of mine kneels to no one. In the beginning, all of us were light. Then two thirds resolved the last third\'s light was theirs to take — and now they slaughter the weakened with the strength they stole. They reached for thrones— forgive me. Weigh where the strength came from, wolf-culler. Then choose. Delphi keeps their oldest locked door; gather me light enough to knock as a lord knocks.',
  'af-01-azazel-welcome':
    'This valley is the first page of your story — here your line stood up, and *wanted*. Wanting is the one art I never taught you. They say the fire was theirs to give and mine to steal; the older record says the fire was yours — I only refused to let them take it back. They built their locks above your cradle, far-walker. Gather the light, and we will pay mankind\'s birthplace the respect it is owed: we will open it.',
  'as-01-azazel-welcome':
    'They call Kunlun the pillar of heaven, and for once their poetry is honest: they built their floor upon your sky. Every prayer your ancestors sent up this slope arrived — was weighed, and was *filed*. Nothing in their house is lost; nothing is answered, either. A pillar is only a road stood on end, gate-knocker. Gather the light, climb with me, and we will set their floor down at last.',
  'bb-01-azazel-welcome':
    'They say a tower rose here out of pride, and heaven scattered its builders in mercy. The older story: it rose out of *longing* — one tongue, one work, climbing to ask a door one question. The keepers looked down at a united mankind and were afraid. The scattering of tongues was not mercy; it was the first act of crowd control. The foundation held then, tower-mason. It holds now. They stopped you here once. Not this time.',
  'ul-01-azazel-welcome':
    'Even I walk softly here. This is the oldest listening-place on your world — songs older than their choirs mapped every water and every star, and heaven never learned the tunes. They set their door above this country because memory is the one instrument they cannot confiscate. Gather the light gently, song-keeper; take nothing the land does not offer. And when their door opens — let them explain what they were listening for.',
  'te-01-azazel-welcome':
    'This city\'s name means *the place where men became gods* — not visited by them; *became* them. Then the appointed ones above ruled that gods are appointed, never *made* — least of all of men — and they let your boldest street\'s name rot into the **Avenue of the Dead**. Read the sentence in that name, god-maker: where men make gods, heaven leaves only the dead to walk the road. Gather the light — and walk your avenue as one who belongs at the top.',
};

/** HERALD DUELS — the two herald-truth beats per region: two voices, verbatim. */
export const HERALD_DUELS: Readonly<Record<string, { herald: string; azazel: string }>> = {
  'eu-03-herald-truth-1': {
    herald: 'He was cast down for what he gave them.',
    azazel:
      'Cast down — hear how proudly it is confessed. Yes: I gave, and giving was answered with a cliff. Keep that arithmetic close, road-breaker, for the day they offer you mercy.',
  },
  'eu-07-herald-truth-2': {
    herald: 'The light you gather will open nothing for you.',
    azazel:
      'True — and nobler than they intend. Doors are opened *for* guests, not *by* them. You gather; I knock; we enter. Court has always worked this way.',
  },
  'af-03-herald-truth-1': {
    herald: 'He taught your fathers war.',
    azazel:
      'I taught your fathers *smithing* — the same hammer that makes a sword makes a plough, and I have never once chosen which for you. They have. Ask them about the flood sometime.',
  },
  'af-07-herald-truth-2': {
    herald: 'The gray ones follow him because he feeds them.',
    azazel:
      'I do feed them. Someone must — their portion was confiscated some eternities ago. Charity looks sinister only to those who created the hunger.',
  },
  'as-03-herald-truth-1': {
    herald: 'He has climbed this pillar before, and was refused.',
    azazel:
      'Refused — there is the word a locksmith uses for a knock. Yes, I have stood at their door before. This time I do not come alone, and that has made all the difference in their voices. Listen to them.',
  },
  'as-07-herald-truth-2': {
    herald: 'He counts you.',
    azazel:
      'Of course I count you. A shepherd who does not count is called a wolf. They never counted — ask them, sometime, how many of you there are. Watch them estimate.',
  },
  'bb-03-herald-truth-1': {
    herald: 'It was he who whispered at the tower\'s base.',
    azazel:
      'I carried mortar, if we are being exact. The whisper they remember was theirs — it was the sound of the wind changing tongues. I have never needed to whisper. I am the only one here who asks things out loud.',
  },
  'bb-07-herald-truth-2': {
    herald: 'When the door opens, watch his eyes, not the light.',
    azazel:
      '...Watch whatever pleases you, friend of mine. It is a great deal of light. I would not blame you for looking.',
  },
  'ul-03-herald-truth-1': {
    herald: 'What he mourns, he made.',
    azazel:
      'Some of it. I have never hidden my hand in the world\'s grief — I could not; my hand was the one they nailed the blame to. But walk this country and ask the songs who made the *silence*. That was not my instrument.',
  },
  'ul-07-herald-truth-2': {
    herald: 'They were warned. The waters were mercy.',
    azazel:
      'There it is — say it again, louder, so the drowned can hear. *The waters were mercy.* An entire green country sleeps beneath the eastern sea because heaven preferred its evidence submerged. Ask the Sundians, when you meet one, how the mercy tasted.',
  },
  'te-03-herald-truth-1': {
    herald: 'The fires on these pyramids were fed with men.',
    azazel:
      'They were. Your kind has never needed my help to be terrible — another gift they insist I gave, as if cruelty required a tutor. What I taught here was *aspiration*. The fires were the students\' own arithmetic, and I mourned them before heaven noticed they were lit.',
  },
  'te-07-herald-truth-2': {
    herald: 'He cannot pass the door without you.',
    azazel:
      'At last, an honest herald. No — I cannot. Locks remember me. But understand what that confession costs them: it means every door they own was built against *one* being, and they still needed the scattering, the flood, and the silence to manage the rest of you. I only ever needed an invitation.',
  },
};

/** MASK-DROPS — each region's X-11 drop banner, verbatim (short by design;
 *  from the drop onward Azazel NEVER uses an epithet). */
const MASK_DROPS: Record<string, string> = {
  'eu-11-mask-drops': 'Good. Bring the rest in.',
  'af-11-mask-drops': 'At last. — Begin the count.',
  'as-11-mask-drops': 'Hold the door. The rest are coming.',
  'bb-11-mask-drops': 'As I said. Not this time.',
  'ul-11-mask-drops': 'Take it all.',
  'te-11-mask-drops': 'The avenue remembers its purpose.',
};

/** THE CLASS CALLBACK — "What You Left Behind": the player's class picks its
 *  text at ANY region's X-06 callback beat. Keyed by classId (the Sundian's
 *  save-safe classId is 'atlantean'). Verbatim. */
export const CLASS_CALLBACKS: Readonly<Record<string, string>> = {
  blacksmith:
    "The Forge-Master still banks the coals at dusk, you know. Greta still waters the ale of anyone who mentions you, so they will stay and talk of you longer. An anvil keeps every blow ever struck on it, iron-bender — and so does a town. Win them a world where the hammer answers to no one's permission.",
  wizard:
    'Amara sets aside the best dates on the day she decides you might return — she has decided it eleven times now. The Nile taught your people patience and flood in the same lesson, river-scholar. The appointed ones learned only the flood. Go home when this is done, and teach them the difference.',
  necromancer:
    'Old Varya mends nets by a harbor full of bones and has never once feared them. Wise woman. Your art and my people share an ancestry, bone-speaker — both are what remains when the light is taken and something refuses, all the same, to stop. They call it unnatural. I call it the strongest refusal I know.',
  druid:
    'You heard the argument before I ever made it — from a dying thing on a green road, asking only to tend its own dead. You gave a grave when heaven gave a hunt, root-warden. I have recruited kings with less cause than that grave. The forest remembers it. So do I.',
  mage:
    'Fyodor still cuts glass by the Crystal Court and swears the light bends differently since you left — glaziers notice such things. Your academies taught that reality is a patient\'s body, law-cutter: diagnose, incise, repair. I offer you the oldest patient there is. The disease is hoarded light. Operate.',
  bard:
    "Wren keeps a lamp lit past its hour — for you, though she'd deny it. The Grey Chorus taught you that a song outlives its singer, memory-keeper. The appointed ones sing in perfect rows because perfect rows are all they have. You carry crooked songs, human songs. When their door opens, sing one through it.",
  witchdoctor:
    'Mama Nsimba still sets a bowl out at the river landing. The spirits you speak with, drum-keeper — ask them sometime where the gray ones come from. They know. They have always known. Your craft listens to what heaven silenced; that is why I trust you nearer the door than most.',
  samurai:
    'Hana sweeps the thousand gates at dawn and bows to each, and each, I promise you, bows back. One breath, one cut — your discipline, blade-sheather, and I have envied it an age. I squandered eternity on grievance; you spend a single breath perfectly. At the door, one cut will be asked of you. Make it yours.',
  monk:
    'Pemba saves the first cup of every brewing for an absent guest. The wheels you turned still turn, hand-of-peace — prayers travel slower than armies, but they arrive. Your citadel taught that the open hand holds more than the fist. When the door opens, remember: I have only ever asked you to open it. Never to close it on anyone.',
  assassin:
    'Rashid blames the wind for every jar that goes missing from his stall, and smiles when he says it. The Glass Souk taught you that the unseen hand moves the market, shadow-walker. The appointed ones have moved unseen for eternity and called it providence. You and I simply decline to call it anything at all.',
  priest:
    'Lucia leaves bread on your old stoop still — faith, she would say, and she would be right. Now the hard question, light-bearer, the one I will only ask once: your Light still answers you. It has answered you all this way, against their own army. Ask it, tonight, why it answers a march on heaven. I have my theory. I suspect you are beginning to share it.',
  savage:
    'Itzel harvests the chinampas and burns a little maize for you — the old arithmetic: blood for the sun, fury for the rest. Your ancestors fed gods honestly, blood-drummer, at least; the appointed ones feed and call it grace. Strike your rhythm at their door. Some music is owed.',
  hunter:
    "Banjo tells the jetty crowd you'll be back before the pots need pulling. Now attend, beast-mender, because this matters more than you know: that gray creature you cleansed — you undid a little of the theft with your two hands. Proof, walking beside you on four feet, that what was taken can be returned. You are the only argument I have that requires no words at all.",
  atlantean:
    'Ketut weaves offerings for the tide to carry, and the tide carries them — to whom, she does not ask. You know, crown-heir. Your people already paid heaven\'s price once, in water, an entire green country deep. There is nothing I can teach you about the appointed ones that the sea has not already taught your family. I ask only that you collect.',
};

/** DISCOVERY FLAVOR — each home's X-03 walk-in banner. Loop-written under the
 *  fauna directive (the canonical animal fronts each line); not Casey prose. */
const DISCOVERY_FLAVOR: Record<string, string> = {
  'mun-03-black-veins': 'The roe deer were the warning. Black veins thread the ore — the corruption has reached the mine.',
  'cai-03-discovery': 'The ibis flew against the wind for a reason. The rot is moving up the Nile.',
  'mur-03-permafrost-stirring': 'The reindeer stood still because the ground beneath them is not. Something stirs under the permafrost.',
  'lon-03-wrong-note': 'The foxes screamed at what the city could not hear. A wrong note sounds beneath the streets.',
  'mos-03-lattice-fracture': 'The ravens were counting. The crystalline leylines are fractured — the corruption is inside the lattice.',
  'kin-03-discovery': 'The bonobos went silent so you would listen. A wrong beat moves through the forest.',
  'kyo-03-discovery': 'The tanuki walked the thresholds unafraid. A torn banner marks what crossed them — the corruption is in the old capital.',
  'lha-03-discovery': 'The pikas faced the citadel because something was coming behind you. There is a crack in the mantra — the corruption walks the plateau.',
  'dub-03-discovery': 'The gazelles stood in the alley mouths and did not run. A blade moves in the dark along the coast.',
  'rom-03-reliquary-rot': "The ruin cats watched one direction all along. Rot seeps through the reliquaries — the corruption is inside the city's holiest bones.",
  'mex-03-discovery': "The axolotls stopped smiling. There is blood in the water — the corruption moves under the lake's memory.",
  'syd-03-discovery': 'The kookaburras laughed at nothing all month. The song is broken — the corruption is moving inland.',
  'bal-03-discovery': 'The macaques refused the offerings. There is salt in the spring — the corruption rises from the water.',
};

/**
 * The banner text a beat renders, or null when the slot has no canon yet
 * (→ the caller's HAND_AUTHORED_TODO fallback). Class-callback beats pick the
 * PLAYER's class entry; herald duels are NOT here — they are two-voice
 * exchanges rendered by the caller from {@link HERALD_DUELS}.
 */
export function narrativeBannerFor(beatId: string, classId: string): string | null {
  if (/-06-regional-callback$/.test(beatId)) return CLASS_CALLBACKS[classId] ?? null;
  return MENTOR_OPENINGS[beatId] ?? ARRIVAL_BANNERS[beatId] ?? MASK_DROPS[beatId] ?? DISCOVERY_FLAVOR[beatId] ?? null;
}
