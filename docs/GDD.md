# THRONES OF HEAVEN — MASTER DESIGN DOCUMENT

**Consolidated from 15 source documents | Structure: Part I = unified design (all valued information merged) · Part II = redundancy log & raw reference material (so nothing is lost)**

-----

# PART I — THE UNIFIED DESIGN

## 1. Vision & Design Philosophy

**Elevator pitch:** Thrones of Heaven is an epic open-world MMORPG set across a reimagined real Earth where mythology, ancient magic, and cosmic war tear through reality. Players are thrust into an ancient conflict between the forces of Heaven, the depths of Hell, and the primal energies of Earth — choosing their path through temptation, betrayal, humility, redemption, and free will. It’s your soul, not just your sword, that shapes the world.

**The founding philosophy (in the creator’s words):** Keep everything as real as possible — bring fantasy as close to reality as it can get, and stretch reality as close to a dream as it can get.

- The game uses as much **real-world mythology** as possible to give real-world context to its fiction and magic.
- The game map **is the real Earth’s map**. When people travel to real landmarks the game uses, they’ll be reminded of their character and who they fought there. When they see places and cultures on social media, they’ll think of traveling there in the game.
- Magic is explained through **quantum physics, physics (including dark matter and dark energy), and alternate universes (string theory)** wherever possible.
- Every character class is anchored to a **real ancient culture/civilization** to explain its existence and history.

**Origin of the idea:** Playing Diablo 2, the Sorceress looked like she could be Egyptian — which sparked the vision of ancient Egypt in its prime, Pharaoh led by Egyptian gods, and the biblical battle of Moses versus Pharaoh’s magi (staffs into snakes, the Nile turned to blood, the plagues). That single image grew into a WoW-style main city of ancient Egypt whose character class is the Wizard, and from there into the whole world.

**Inspirations:** Diablo 2, World of Warcraft, EverQuest, and the Holy Bible.

**Unique selling points:**

1. **A reimagined Earth as the playground** — scaled-down real continents infused with myth; mythological creatures from every culture (Aztec gods, Norse titans, African spirits, Sasquatch, Loch Ness, Pacific Northwest legends).
1. **A true journey of the soul** — players are deceived, rebel, are humbled by the Creator, and earn redemption or choose damnation. Emotional arc: Innocence → Doubt → Betrayal → Humility → Redemption → Freedom.
1. **Quantum-physics-inspired magic & DNA-driven evolution** — Arcane/Ethereal Liquid, crystallized magic, and classes (like the Druid) that evolve by bonding with nature.
1. **Cross-platform 3D + 2D play** — full 3D for PC/console, smooth 2D pixel-art for handhelds, synchronized on the same servers.
1. **Dynamic factional endgame** — after conquering Heaven and Hell, players battle for Earth’s cities, continents, and mythological strongholds.

**Target audience:** Fans of deep MMORPGs (WoW, FFXIV, ESO); players who crave narrative consequence; explorers who love lore, myth, and history twisted into fantasy; gamers who want meaningful cross-platform progression. Broad age range, teens to adults.

-----

## 2. Game Overview & Technical Specs

- **Genre:** Open-world MMORPG (with single-player offline capability noted in the GDD draft).
- **Game elements:** Exploration, Questing, Combat, Crafting, Player Interaction, Guilds, Raids, Dungeons, PvP, Real-World Crossover.
- **Technical form:** Hybrid — 3D graphics for PC and console; 2D top-down graphics for handheld/mobile.
- **View:** Third-person (3D platforms); top-down 2D (handheld/mobile).
- **Platforms:** PC, console, portable (Switch, mobile). Code language: undecided.
- **2D/3D coexistence:** Both versions live on the **same servers** — the difference is purely graphic rendering, so a Switch player and a PC player play side by side. The 2D version looks like original Pokémon Red/Blue (8-bit pixel art) but with motion, controls, and mechanics smoothed out at high resolution. 2D gameplay is throttled back (fewer usable abilities, fewer cinematics) but lets players progress on the go. Large platforms can switch between 2D and 3D; small platforms are 2D only.
- **Development sequencing plan:** Build the 2D version solo first; as the project grows, recruit the people and resources to bring the 3D version to life.
- **Cross-platform implications (from design discussion):** gameplay parity across versions, robust server infrastructure for cross-platform interaction, adapted UI/controls per platform, and 2D art clarity preserved when translating 3D designs.

-----

## 3. Narrative & Story Arc

### 3.1 The full story

Sightings of demonic/undead forces appear around the player’s starting city. The ruler commands the player to fight them back; townsfolk and holy angels guide the fight (an angel may clear a path or kill a boss early on, just to introduce these beings). After defeating the first major undead boss, a cinematic plays: **on his dying breath, the boss claims the beings of light are the real villains** — that all beings were once equal, that the “angels” are merely beings of high energy who stole the undead’s power and vitality, leaving them looking dead and scary, scourging out the weakened survivors who only want a home. A being of light appears (“May you be cast out and be vanquished”) and counters that the dying one is full of lies — “You are free to make your own choices.” The undead retorts: “What kind of being of good tries to kill other things?” A greater undead asks for the decency to tend to their dead, then offers the player what power they have left to join them.

**Phase 2 — the player joins the forces of darkness.** Pulled to the evil city (now home), the player quests against angels and beings of light: stealing/harvesting energy and life force from angels, nature, or by sacrificing/consuming undead — until the dark side has enough energy to open a **portal to Heaven**.

**Phase 3 — storming Heaven.** The player fights through ever-higher beings of light — angels, cherubim, seraphim, archangels — to God’s Throne, intending to overthrow Him. **God instantly disables all weapons and armor and humbles the player**, smiting down the arrogance. God condemns the dark leaders (once angels) to Hell for good, calls the player foolish — evil gave great power used for destruction — but instead of binding the player in chains in the abysmal void, God grants **even more power** as a test: redeem yourself by conquering evil in Hell once and for all.

**Phase 4 — conquering Hell.** Through a portal, the player battles increasingly powerful evils down to Lucifer. After Lucifer falls, God (or a high angel) declares: “You undid what you did and showed true character. You are forgiven but unglorified — your slate is wiped clean. What you do now is up to you.” (Someone points out the catch: killing everyone in Hell isn’t how Hell works — the killed are just sent back to Hell.)

**Phase 5 — free will on Earth.** God removes the power buff and sends the player back to the natural world to **choose a faction — good or evil** — and fight Earth’s mythological creatures, gods, and legends (dragons, Sasquatch, Loch Ness, etc.) reimagined on their native lands.

### 3.2 Power-up structure tied to the story

- **Demonic power-up** (granted when joining evil after the first boss): significant stat boost.
- **Holy power-up** (granted by God before entering Hell): an even bigger stat boost.
- Both power-ups apply **only inside the specific quest-line map areas**; in the open world the player doesn’t have them. After killing Satan and choosing a side, both are lost — endgame is played at natural power.

### 3.3 Level-band structure

Two recorded versions (decision open):

**Version A (early notes, max level ~60):**

- **1–20:** Home city battling evil — led by human leaders and angelic guidance; start in a nearby small town and quest to a main city.
- **20–40:** Fighting for evil, battling angels — granted **Spirit Vision**, a graphic overlay on the world revealing unseen forces and characters, which enables the next set of quests and leveling.
- **40–50:** Battling through Heaven (via portal).
- **50–60:** Battling through Hell (via portal).
- **60+:** Battling on Earth — needs a narrative that makes this the biggest deal; avoid Hell feeling like the climax.

**Version B (handwritten notes, max ~80):**

- Closed world until end game (open question).
- **1–20** surrounded by high-level zones · **20–40** Spirit World zones & Heaven portal · **40–60** Hell portal · **60–80** open Earth map · **80+** bosses & culture dungeons. (Margin note suggests a level-80 boost mechanic.)

### 3.4 Quest beat list (levels 1 through endgame, raw beats preserved)

Welcome to city, young class — go meet your trainer → practice skill on dummy → try skill on fake opponent → kill five wild animals → discover corruption → follow where it comes from → battle first evil enemy → outrun horde of evil back home → search region for more corruption → protect NPC civilian → bring evil loot back for inspection → protect city from evil raid → meet the Angel who just showed up (puts light bubble over city) → take commands from angel to seek out evil’s hideout → find resources to heal town after raid → ambush evil army as it prepares for battle against main city (could be preparing a portal) → signal for backup from city → angel directs you toward the evil leader → maybe first dungeon here → battle through unique environmental feature → shut down portal from Hell → fight Boss → **choose evil over good** → battle town guards with evil power → commit to evil; attack starter city → go to evil hideout → attack NPC farmers → pillage shipment to town → harvest light power → hide container of light power (if killed, angel resurrects you — go retrieve the light) → invert light to darkness → battle a lesser angel → call to a lesser angel (spirit realm, angel hideout) → travel to recruit more dark forces → return to defend evil hideout from angel team → go to evil main city → battle three angels outside the spirit angel base → battle into angel base, kill everyone (site becomes future Heaven portal) → three big quests attacking cities to lure angels and harvest light → summon Heaven portal (battle, flaming swords?) → **step into Heaven**: desecrate the pastures, destroy the trees, burn the rivers → fight a boss or two → charge the stairs → fight cherubim → stealth past the all-seeing eye, then battle them → archangels → **God’s Throne** → **Hell portal** → battle at the gates of Hell → obstacle course → rescue fallen angels by beating them → ignite pyres of light to illuminate Hell → battle outcoming horde → kill fallen warriors and kings → conquer principalities, thrones, and dominions → battle demons off the cliff edge into deep fires → save repentant angels → into the castle → fight the seven legions (seven deadly sins) → fight greater evils: Moloch, Baal → fight fallen cherubim and other evil renditions of good angels → **fight Lucifer** → portal to Earth → **Epilogue:** “The territories of Earth have been claimed by the gods” — conquer all of Earth in the name of good or in the name of evil.

### 3.5 Endgame narrative & content

- Players choose Holy vs Demonic faction and fight Earth’s mythological bosses on their native lands.
- **Conversion bosses idea:** instead of fighting end-game bosses to the death, fight to win over territory — the boss gets converted to good or evil. A form of live, continual PvP.
- **Cultural embodiment bosses:** at some point each starting location gets a boss that embodies its Earth culture — you essentially fight your own people.
- Endgame activities: boss fights for better gear, quest lines for unique skins/looks, building houses and fortresses in the open world, exploration, high-level challenges.
- Content cadence: regular expansions adding another culture’s quest line and bosses, plus events both in-game and real-world.
- Dungeons & micro-bosses: real-world geographical features house open-world bosses and dungeon locations; ancient lore, cultural mythology, and even children’s stories are used as in-game content.
- Reference pantheon survey for boss/quest material (Egyptian: Ra, Osiris, Isis, Horus · Greek: Zeus, Hera, Athena, Poseidon, Apollo · Roman: Jupiter, Juno, Mars, Venus · Norse: Odin, Thor, Freyja · Hindu: Brahma, Vishnu, Shiva, Lakshmi, Saraswati · Mesopotamian: Anu, Enlil, Inanna · Mayan: Kukulkan, Ix Chel, Chaac · Aztec: Huitzilopochtli, Quetzalcoatl, Tlaloc).

-----

## 4. World & Map Design

### 4.1 The Earth map

- The map is a slightly scaled-down **topographical map of the real Earth**. Estimated scale: somewhere between **60:1 and 25:1** — full scale is too big for entertaining play, but unmodified shrinking leaves too many insignificant details.
- Three scaling approaches on the table: (a) scale down exactly with no modifications; (b) scale down but preserve preferred areas/terrain and minimize flat, dull, unwanted terrain; (c) completely subjectively decide what stays and what doesn’t.
- **Continental drift:** over the life span of the game, the continents move — back and forth between supercontinents and separated continents. Factions can move continents, reshape maps, and rewrite history in the endgame.
- 2D UI elevation: to get visual elevation out of the 2D map, add a toggle making lower/higher elevation ground translucent, darker, or less vivid.

### 4.2 Real locations, fictionalized

- Names, locations, and basic landscapes of cities use real-world data; **appearance is artistically redone** to match the chosen era/theme. Cities are fictionalized **based on their climate**, keeping enough psychological association to the real place that players never lose the sense of being on Earth — but enough fiction to spark curiosity.
- Examples: **Seattle** — Druid capital of giant tree houses in a rainforest, with a giant tree shaped like the Space Needle in its real location. **Cairo** — the Pyramids in their prime, capital of wizards/sorcery; players who want magic items or magic leveling must travel there. **London** — medieval castles. **New York** — tree houses rather than concrete, but the most NPC vendors in the game, to echo its real-world identity as a business hub.
- Handwritten principles: cities are *simplified versions of real cities, maintaining resemblance and association while conforming to the fantasy narrative*; *bring in as many real-world characteristics as possible while maintaining the completeness of the fantasy*. (Idea noted: an “Apple Farm city” — a fantasy fruit city based on a major local crop.) Cities within macro regions offer similar items.
- Cultural representation: honor each culture by using its artwork, traditions, and mythology; mythology feeds boss fights and quest chains; cultural looks and resources feed items, weapons, and armor.

### 4.3 City hierarchy & construction

- **Capital city:** one per continent / per character class (main cities tie to the supercontinent).
- **Large cities:** per climate or region.
- **Small cities:** 1–3 per region; single-story, simplistic construction using environmental methods.
- **Outposts:** (1–3 merchants and a wagon, or a single building) per special quest or landmark.
- **Indigenous building methods per region.** Cities exist where real cities exist.

### 4.4 City NPCs & merchants

- Gear merchants are **character-class/energy-class specific** (mana, dark energy, rage) and general-class-type specific (magic, melee, DPS).
- Each continent offers generalized gear for any character plus gear for its native class.
- Players can only buy/sell gear to the corresponding merchant type (magic to magic, plate to plate; the blacksmith only buys/sells plate gear).
- Outside cities and in rural areas, NPC farmers and tradesmen work the land and connect to quests.

### 4.5 Starting locations (Phase 1 candidate list)

Egypt, Congo, London, Rome, NW Russia, Dubai, Bangkok, New Guinea, Sydney, Shanghai, Moscow, Yukon, Seattle, Nashville, Mexico City, SW South America, NE South America, and possibly a South Pacific island. Each starting city becomes that continent’s endgame “light city,” with a separate geographic continental pair hosting the evil city.

### 4.6 Player settlements, disasters & taxes

Because the world is massive and open, players can build settlements/camps/forts in the wilderness, with perks like treasure storage and wilderness bonuses. To stop people squatting in the best spots forever, **natural disasters** periodically destroy forts. If the player paid tax to the nearby major city, the city does **FEMA-style cleanup** and gathers their items so nothing is lost. Other functions could be roped into the tax as well. Guild members can collectively build a giant fortress in the open world.

### 4.7 Faction zones & regional progression

- Faction-controlled area zones (open questions: what happens when a faction controls a zone? does it revert to neutral? do level-cap players get a faction main city? do they take over cities?).
- **Regional reputation system:** rather than each region simply granting cultural-boss XP toward a higher level cap, set each region as a place to earn reputation — leveling up within regions grants skills, gear, perks, and skins. Possibly **one skill point per region**. (Open question: what happens when someone skips the quest line?)
- Heaven portal placement: one on the whole map? One per continent? One per main city? (Undecided.)
- “Where/what are the dungeons?” remains an open mapping task.

-----

## 5. Combat & Battle Design

### 5.1 Combat identity

- **Real-time action combat.** The game should play **faster than WoW but slower than Diablo 2** — tight and tactical without feeling brainless or sluggish.
- The **majority of skills are instant cast**; high-powered skills have cast times. Skills have cooldowns.
- Classes split across melee, pure ranged, and hybrid playstyles.

### 5.2 Battling types (handwritten master list)

Open World vs NPCs · Open World vs Players · Dungeon vs NPCs · PvP Dungeon · Micro PvP · Micro Dungeon · Dungeon obstacle courses. (PvP Arenas appeared on the list but was struck out. Margin note: “is there? what features?”)

### 5.3 Design role definitions (team-facing)

- **Combat designer:** “Combat” is a broad term covering combat, controls, and camera — an encounter designer. Deals on the **micro** level of frames per second.
- **System designer:** balances and maintains numbers to promote certain behavior, and designs what those systems are — durability, damage, defense, attack power, shield systems in balance. Deals with the **macro**.

### 5.4 Damage & defense model (handwritten systems diagram)

- **Outgoing damage** factors: base, skill, speed (frequency, cooldown, cast speed), delivery (range), amount, crit, resource.
- **Health:** life.
- **Incoming damage** factors: block, immune, reduce, silence, defense (reduction).

### 5.5 Group play

Dungeons and raids are core multiplayer content, with **XP boosts for players grouped in a party** through the quest line. PvP exists alongside PvE. Some quest-line milestone mini-bosses in levels 1–20 require joining a group for a dungeon; the final low-level boss sits outside the continent’s evil main city.

-----

## 6. Magic, Resources & the Crystal System

### 6.1 Energy types & resources

- Resources are **class-specific energies**: e.g., mana, dark energy, rage; Living Essence (Druid), Endurance + Infusion Charge (Blacksmith), Rhythm Meter (Bard), Dark Energy (Necromancer), Quantum Essence (Mage, placeholder name), Essence of Dominion (Wizard), Chi (Monk).
- **Mana rename concept:** “Arcane Liquid” / “Ethereal Liquid” — possibly both, depending on the character. **Crystals are formed from solidified arcane or ethereal liquid.**
- Damage/effect elements catalog: poison (damage + weakens target defense), fire (recurring damage), ice (damage + slows), lightning (damage + weakens target’s damage), dark energy (necromancer), void, celestial, ethereal, quantum energy (mage), holy light (priest), crystal (mage — damage + crystal attribute), rune.
- Visual rule: spell graphics increasingly make characters **radiate colors and light as they progress, so they look like gods**.

### 6.2 Why the crystal/arcane-liquid system matters (design analysis)

In most games mana is just a blue bar. Here, Arcane and Ethereal Liquid are **physical substances**; crystals form when they solidify; crystals enhance weapons, armor, summons, and spells; the liquid can be harvested from special creatures, locations, or bosses (maybe even drained off enemies directly). This enables: crafting/alchemy systems (players forming their own crystals), in-combat visual escalation (players glow more as they accumulate and use crystals), specialization paths (crystal mage/warrior builds), and prestige systems (late-game players sparkling like constellations). It turns mana into a living resource players can touch, collect, craft, and fight over — a candidate for the game’s “One Unique Thing.” Open design questions: common vs legendary crystal tiers? random drops vs quest-crafted? swappable mid-fight or only out of combat? Optional “crystal sickness” mechanic (overuse temporarily weakens you).

### 6.3 Gemstone socketing (player-wide system)

Items can be socketed with gems and runes; **specific gem and rune combinations give bonuses**. The nine player gemstones:

1. **Ruby** — adds fire damage to attacks
1. **Sapphire** — enhances ice abilities, grants frost resistance
1. **Emerald** — chance to poison on attack, toxin resistance
1. **Amethyst** — increases magical damage and spell power
1. **Topaz** — boosts lightning damage, electrical resistance
1. **Citrine** — critical hit chance, increased physical damage
1. **Diamond** — physical defense and damage reduction
1. **Garnet** — chance to stun, improved physical accuracy
1. **Opal** — magical defense, resistance against curses

-----

## 7. Items & Gear

- **Sockets:** gems and runes (combinations give bonuses).
- **Class-tier gear over class-specific gear:** very few class-specific items; instead gear tiers by armor class (plate, leather, cloth tier characters).
- **Loot risk choice:** upon looting, choose a guaranteed lower-average item level **or** risk a higher item level with less guarantee.
- **Multiplicative itemization:** items don’t add flat skill points (+1); they add multipliers (×0.5 effect). This keeps gear-finding a never-ending priority for increasing skill damage/effect while letting skill levels have a cap — a possible solution to limiting how many points go into a single skill. Goal: maximum skill-tree freedom without loopholes and skill spamming.
- **Gear quality ladder (handwritten):** Plain gear → Enhanced gear (perks) → Legendary (unique). **Set gear** grants perks — Pinnacle Sets come from Region Bosses. Runes go in sockets.
- **Equipment slots:** chest, helm, gloves, boots, pants, shoulders, necklace (with socket positions noted on several slots).
- **More items than players can keep track of** — deliberate abundance.
- **Regional attribute affinity:** characters have attributes; each world region’s items run high in a particular attribute.
- **Top-tier choice:** top-of-tier players choose among Set Gear, Runes, or Pinnacle Gear. Endgame looks: Sets = cohesive/matched (“copacetic”); Pinnacle & Runes = a hodgepodge of all cultures. Top endgame players will look multicultural, wearing diverse items from around the globe.
- **Purpose-built gear:** Quest gear runs higher in defense and damage; PvP gear runs higher in life and dodge (solo play and misses factored in).
- **Item attributes:** Agility, Intellect, Spirit, Strength, Attack Power, Stamina, Critical chance, Haste, Mastery, Versatility (matching the character attribute sheet: Life, Resource, Defense, Damage + the above).

-----

## 8. Economy & Monetization

- **Player-driven economy:** items and gold earned from quests, kills, and PvP; player-to-player trading and an auction house; player-made skins in the marketplace.
- Balance principle (flagged in design discussion): acquisition of currency/items shouldn’t overly favor certain players or cause inflation/imbalance.
- **Open ideas (handwritten features list):** real-world money for buying/selling items, cryptocurrency usage, **Crypto Assets**, and **NFT usage** — noted alongside the caution that real-money trading carries balance, fairness, and legal/ethical implications.
- Additional handwritten features: **Geographical XP Boost**, **Mobile & Switch micro-gameplay**, **Real-world events in game**.
- **Monetization strategy (GDD draft):** revenue from base game sales, expansions, and optional in-game purchases for cosmetics, convenience features, and expansion packs — with emphasis on fair, balanced monetization to maintain player trust and long-term engagement.
- Open merchant questions: a merchant selling temporary buffs? No health potions (or long-cooldown potions if they exist)? City NPCs offering more than weapon sales — shelter, politics, trades, businesses? Guild-run open-game businesses, restaurants, food, buffs?

-----

## 9. Character Classes

### 9.1 Class design framework

**Domain taxonomy — the rock-paper-scissors foundation:**

- **Spiritual (scissors):** Angelic Order — Light (heals), Order (DPS), Love (heals/less damage) · Chaos Elemental — Wrath (DPS), Discipline (DPS), Sacrifice (dark heals) · Summoner — Spirits (heals/DPS), The Dead (corpse summons, DPS), Other Dimensions (off-tank/DPS)
- **Mental (paper):** Ninja — Shadow (illusions, solo DPS), Poison (DoT/AoE DPS), Metal (knives/range DPS) · Mage — Spells (range DPS), Crystal (melee DPS), Empathy (heals) · Monk — Meditation (heal/buffs), Focus (DPS), Numb (tank)
- **Physical (rock):** Blacksmith (barbarian type) — Armor (tank), Weapons (DPS), Runes (heal/tank) · Arrow/Range — Spirit Archer (magic DPS), Demolition (grenades/mines, AoE DPS), Engineered (mechanic CC) · Samurai — Speed (tank), Resurrection (tank/leech), Blood Thirsty (cascading DPS)

**Fundamental playstyle taxonomy** (for ensuring no two classes feel alike):

- Summoner — multiple summons; one powerful summon; instant-cast; undead/revive; mercenary
- Casters — elemental, magic, quantum, astro/galactic, throwing, shooting
- Shapeshifters — multiple forms with own attributes; a single customizable form; bonus attributes to current character
- Melee fighters — DPS, AoE, shielded/defensive, enchanted, fast-attack/low-damage, slow-attack/high-damage, charge-up bonuses
- Curses/Auras — buffs, debuffs, damaging, mechanic (e.g., run speed), crowd control
- Plus (from design discussion): healers/support, tanks, stealth/assassins, elemental controllers, bard/supportive buffers, traps & gadgets, archers/ranged DPS, elemental conjurers, blood mages/life stealers, time manipulators, hybrid classes, weapon specialists.

**Class blueprint template** (what every class page must contain): 1) Class archetype · 2) Lore summary · 3) Resource mechanic · 4) Combat role (primary/secondary) · 5) Unique mechanics · 6) Skill trees (2–3 specializations, 6–8+ skills each) · 7) Ultimate abilities (one per tree) · 8) Visual theme and evolution (early → mid → late game) · 9) Audio/personality flavor · 10) Strengths and weaknesses.

**Developer handoff checklist** (what a coder needs per character): character concept; class & role; abilities/skills with effects, cooldowns, resource costs, mechanics; skill trees & progression; weapons & equipment; lore & story; visual design/concept art; audio design; interactions & gameplay mechanics; balancing & tuning guidelines.

**Character attributes:** Life, Resource, Defense, Damage, Agility, Intellect, Spirit, Strength, Attack Power, Stamina, Critical chance, Haste, Mastery, Versatility.

**Anti-overlap doctrine:** each archetype owns a dominant flavor of control, burst, sustain, or movement (e.g., Witch Doctor: hexes + DoT + control; Druid: summons + buffs + area control; Blacksmith: raw defense + counterattacks + self-buff brawling; Atlantean: high-agility DPS + water manipulation + quantum slowing). Differentiation notes were written for the melee trio (Barbarian = brute strength/rage/durability; Samurai = precision/stances/Bushido timing rewards; Savage = primal ferocity/bleeds/beast traits/AoE rage), the caster trio (Priest = divine support; Mage = elemental mastery + spell combos; Wizard = reality/time/space + spell customization), the summoner trio (Druid = shapeshifting + nature; Necromancer = undead hordes + life force; Hunter = beasts + precision archery + traps), and the yin-yang pair (Assassin = stealth/burst/traps/evasion vs Monk = agility/sustain/counters/melee heals).

### 9.2 Full class roster & world placement

Fourteen classes total; **six chosen for launch: Druid, Bard, Necromancer, Mage, Blacksmith, Wizard** (about 9 planned as selectable at release per early notes). Each continent is home to a class with a unique home city.

|Class           |Home (latest decision)                                          |Earlier placement ideas                                              |
|----------------|----------------------------------------------------------------|---------------------------------------------------------------------|
|Druid           |Pacific Northwest, N. America (Seattle tree cities)             |Stonehenge, England                                                  |
|Wizard          |Ancient Egypt in its prime (Cairo/Luxor)                        |—                                                                    |
|Bard            |Celtic lands (Edinburgh, Scotland)                              |Renaissance Italy; medieval troubadour France                        |
|Necromancer     |Frozen north — Russia                                           |Prague; also discussed: Egypt (taken), Central America, Tibet, Greece|
|Mage            |Western Russia (high-elf-like enclaves)                         |Avalon/Glastonbury; Novgorod                                         |
|Blacksmith      |Mountains (forging culture)                                     |Solingen, Germany                                                    |
|Samurai         |Kyoto, Japan                                                    |—                                                                    |
|Savage (Xibalba)|Tikal, Guatemala — Mayan/Central America; best South America fit|—                                                                    |
|Witch Doctor    |Kinshasa, DR Congo / Congo Basin                                |Amazon also floated                                                  |
|Hunter          |Anchorage, Alaska                                               |Sydney, Australia (best Australia fit)                               |
|Assassin        |Istanbul, Turkey (Assassins of Alamut lineage)                  |—                                                                    |
|Monk            |Lhasa, Tibet                                                    |—                                                                    |
|Atlantean       |Bali, Indonesia (creator’s original intent)                     |mythical Atlantis; Mount Kailash listed for “Wizard” in one pass     |
|Priest          |Luxor, Egypt (sacred temples)                                   |—                                                                    |

### 9.3 The six launch classes — full blueprints

#### DRUID — “a walking ecosystem of fury and life”

- **Archetype:** Hybrid — Morphing DPS/Tank, Summoner, Spellcaster, Healer. **Resource:** Living Essence (the core energy in all living things; regenerates slowly, replenished faster by absorbing surrounding life; Morph Form drains it).
- **Lore:** The Druid people of the Pacific Northwest live in giant tree-house cities, so tightly in tune with nature that their genes have entrained to it. They are nature.
- **Roles:** Primary DPS/Tank (tanking through bear-morph specialization); secondary summoner support; tertiary healing and crowd control.
- **Signature mechanic — DNA Morph Form (Animorphs-inspired):** the Druid doesn’t shapeshift into one animal; he **mutates** based on skills invested. Each animal skill adds mechanical effects AND physical changes to the Morph Form; the more points in an animal family, the more dominant that animal’s features (polar bear points → more bear-like; add crab swipe → claw arm; add octopus → tentacles alongside the fur and shell). Morphs are a living record of skill choices — no two Morph Druids look alike. Morph rules: manually triggered (limited time or toggle), drains Living Essence, grants base stat boosts by hybrid state, locks some normal skills and unlocks Morph-only skills. Heavy single-branch investment unlocks **Legendary Animal Traits / Chimera Form** fusions (e.g., Polar Bear + Octopus = “Kraken Bear”).
- **Skill trees:**
  - **Tapestry of Beasts (Morph):** Polar Bear Endurance (HP/defense; white fur, mass) · Crab Swipe (AoE cleave; shell/claw) · Octopus Arms (grapples/offhand strikes; tentacles) · Praying Mantis Strike (high crit slashes; blade arms) · Bat Wings (flight dashes/evasion) · Elephant Stomp (knockdown shockwave; legs/trunk) · **Ultimate: Morph Mastery** (extends Morph, strengthens hybrids, unlocks Chimera Form).
  - **Wild Kin (Summoning):** Summon Polar Bear (HP tank, taunt) · Summon Bees (stacking poison swarms) · Summon Chimpanzees (mid-damage, throwing/debuffs) · Summon Ocelot (agile bleed DPS) · Summon Eagle (dive attacks, vision) · **Ultimate: Evolved Kin** (all summons gain mystical enhancements — glowing eyes, size, lightning claws, stone skin, frost wings). Summons visually evolve with Druid level. Extended summon roster from notes — Tanks: gorilla, panda, moose, rhino, yak, bull, elephant, hippo, grizzly, polar bear; DPS: crab, ram, elk, boar, warthog, tortoise, wolf, dingoes, hyenas, chimpanzees; also foxes, wolverine, ocelot, scavengers, anaconda, crocodile.
  - **Earth’s Wrath (Elemental):** Earthquake (AoE stun) · Hailstorm (ice AoE + slow) · Uproot (root eruption pull) · Tornado (AoE pull/toss) · Lava Flow (fire line DoT) · also Gale-force winds, Swamp, Lightning Strike from notes · **Ultimate: Cataclysm** (chain-casts Earthquake/Hailstorm/Tornado/Lava Flow for 10 seconds of devastation).
  - **Nature’s Restoration (Healing):** Mend Flesh (single heal) · Flourish (AoE burst heal) · Regrowth (HoT) · Purify (cleanse) · Seed of Life (healing totem) · **Ultimate: Nature’s Blessing** (full-radius heal + damage reduction). Flavor-forward healing concepts from notes: Mushroom Paste (smear healing paste on an ally), Healing Spores (fumigate the air), Revitalizing Mud Bath (cleanse negatives), Essential Oil of Vitality / of Immunity (aerated buffs), Lye (burn enemies or heal an ally), Charcoal Cleanse, Healing Rain, Sage Burn (lingering healing smoke); plant-magic kit: Aloe (melee heal), Clay (armor buff/AoE heal), Waterfall (nova heal off target), Pollen (wide AoE heal or debuff), Sap (damage buff), Honey (life boost), Thorns (damage reflect), Bark (armor buff).
- **Morph species stat sketches:** Kangaroo (high agility/strength, low health/defense — heavy kick) · Scorpion (poison, high def, low health — poison strike) · Polar Bear (high health/strength, low speed — heavy swipe) · Leopard (high damage/agility, low health — multi-strike) · Wolf (high damage/health, low defense) · Porcupine (high defense + damage reflect, low damage) · Armadillo (high defense, low strength) · Octopus (passive AoE + defense debuff, low defense) · Eagle (high agility/damage, low defense) · Crocodile (high defense/strength, low speed). Additional species skills cataloged: Peregrine Falcon’s Speed, Snow Leopard’s Stealth, Tiger’s Roar (stun/courage), Lion’s Mane (physical resilience), Wolf Pack Tactics (spectral wolves), Scorpion’s Venom, Spider’s Webbing (immobilize), Queen Bee’s Swarm, Gecko’s Wallcrawling, Bear’s Might, Praying Mantis Precision, Owl’s Wisdom (magic boost, mental resistance), Viper’s Strike, Elephant’s Resilience, Chameleon’s Adaptability (elemental resistance + a “pull” skill drawing enemies to the Druid). Constraint: **no flying or swimming in the game**, so no flight/swim skills (Bat Wings = short dashes only).
- **Visual evolution:** simple robed tribal figure → partial animal features → full hybrid monstrosities with glowing crystalline traits. **Strengths:** versatility, solo power, mass-AoE control. **Weaknesses:** Morph resource drain, squishy outside Morph/summons, interruptible cast times on earth magic.

#### BLACKSMITH — “he is not forged in flames; he is the forge”

- **Archetype:** Tank/Bruiser hybrid with crystal-infusion paths. **Resources:** Endurance (physical) + Infusion Charge (crystal/magic).
- **Lore:** Mountain-born warriors who fused flesh with crystal lattices, metal veins, and raw ore — the Earth’s unbreakable champions. Design intent: fix the “stagnant and plain” feel of warrior classes in other games by weaving magic into the warrior through living mineral forms.
- **Unique mechanics:** (1) **Dual Shield Combat** — late unlock to wield a shield in each hand; shields are weaponized (slice, bash, whirlwind) with spiked/sharpened shield items. Strong tanking that deliberately **lacks innate aggro** — holding aggro comes from player skill and positioning. (2) **Crystal & Stone Infusions** — fuse the body with minerals, visually transforming mid-battle: **Iron Pyrite Form** (armor boost, spike/thorns counterattack), **Prism Quartz Form** (damage reflection, minor magic resistance), **Celestial Calcite Form** (regeneration, cosmic resistance). (3) **Battle Shouts** — party buffs (armor, regen, attack speed) and enemy debuffs (weaken armor, stagger, fear).
- **Skill trees:**
  - **Anvil of War (tank/shields):** Shield Bash (stun) · Shield Slice (bleed) · Shield Whirlwind (spin AoE) · Fortified Stance (reduced damage while stationary) · Bastion Form (bonus defense dual-wielding shields) · **Ultimate: Twin Shields Mastery**. Raw skill cards from the mind map: Shove, Plow, Shield Swing, Double Block, Windmill.
  - **Hammerborn Fury (berserker):** Crushing Blow (armor shatter) · Bull Rush (charge knockaside) · Earth Stomp (slam/slow) · Berserker’s Cry (attack speed/damage buff) · Wrought Iron Blood (rage at low health) · **Ultimate: Overload Strike** (shockwave stun). Raw cards: Double Swing, Triple Swing, Charge, Disarm, Counter Attack (block next hit, instantly strike back), Crazed (run-speed boost on killing blow), Hammer Throw (thrown stun/interrupt), Overswing (big swing hits nearby enemies), Grit (ignore half of next incoming attack).
  - **Stoneheart Ascension (crystal/buffs):** Iron Pyrite Form · Prism Quartz Form · Celestial Calcite Form · Stone Shout (party physical defense) · Crystal Roar (party magic resistance) · **Ultimate: Living Monument** (fuse into a towering crystalline titan — massive defense, slow unstoppable movement, CC-immune). War Chant cards: health increase, defense increase, damage increase, taunt. Crystal cards: Crystal of Prism Quartz (energetic damage ignoring enemy defense), Crystal of Iron Pyrite, Crystal of Celestial Calcite.
- *Earlier crystal concept (superseded but preserved):* Crystal of Obsidian Rage (fire/strength/ignite), Crystal of Diamond Shield (defense/reflect), Crystal of Quartz Precision (crit/accuracy + amplifies socketed gemstones).
- **Visual evolution:** heavy leathers and crude iron → metal plates and crystal fragments fusing into arms/shoulders → semi-translucent titan with glowing stone veins and crystal spikes. **Strengths:** supreme frontline durability, party buffing, infusion-shifting playstyle. **Weaknesses:** low natural aggro generation, infusion cooldown timing, only decent mobility.

#### BARD — “a Celtic war-bard who weaponizes music itself”

- **Archetype:** Support/DPS hybrid. **Resource:** Rhythm Meter (builds with performance, spends on amplified attacks and ultimate solos).
- **Lore:** Celtic soul-weavers and memory-keepers whose songs reshape history, taught by spirits of the old world.
- **Unique mechanics:** (1) **Dual-nature instrument-weapons** — flutes that are daggers (stab and play), guitars with a metal blade down the body swung like axes (swing and strum), crossbows that double as harps (shoot and pluck). Melee speed/damage scales with instrument size (big = slow/heavy, small = fast/light). (2) **Rhythm Meter.** (3) **Solo vs Ensemble modes** — some skills strengthen when alone/self-focused, others when near allies. (4) Built on the real-world concept of **resonant frequencies**.
- **Skill trees:**
  - **Songs of the Ancestors (support — singing, humming, whistling, background music, buffs, AoE heals):** Dissonant Symphony (AoE minor heal + magic resist) · Hum of the Ancients (steady healing aura) · Song of Lore (XP & reputation gain boost) · Chant of the Ancestors (fear/CC resistance) · Echo of Passion (stamina/energy regen) · Song of Blood (berserker buff: crit + speed) · Foot Stamp Rally (AoE burst that re-energizes downed allies — minor revive) · **Ultimate: Choir of Divinity** (battlefield-wide attack/speed/defense buff).
  - **Battle Resonance (melee):** Resonance Cascade (chain strikes) · Harmonic Amplification (next 3 attacks splash) · Frequency Shield (absorb field) · Mosh (rapid multi-swing) · Throat Chant (attack speed/strength self-buff) · Piercing Whistle (cone stun/deafen) · Sharpen (weapon damage buff, self + allies) · Heavy Swing · **Ultimate: War Song** (chained strikes + buffs for unstoppable momentum).
  - **Sonic Chaos (solo chords, strums, riffs):** Sonic Blast (directional AoE knockback) · Resonance Pulse (omnidirectional burst; disrupts spellcasting) · Sonic Distortion (distorts incoming attack frequency, reducing damage; chance enemies attack allies) · Sonic Echoes (echo damage after attacks / spectral mimics that confuse) · Sonic Surge (dash leaving a vibrating damage trail) · Pentatonic Overload (5 quick blasts up a pentatonic scale, each a different element) · Power Chord (massive single-target spike) · Chaotic Riff → **Ultimate: Chaotic Riff** (uncontrollable area-wide sonic explosion chaining randomly between enemies). Additional concept skills: Resonant Melody, Disruptive Harmonics, Resonant Harmony, Melodic Empowerment, Rhythmic Resonance, Enchanted Chorus (spectral echo bards fight alongside you).
- **Visual evolution:** worn leathers and handmade instruments → Celtic runes, glowing strings → visible shockwave distortions; layered musical chaos on ultimates. **Strengths:** flexible buffs/heals/DPS, scales with party size yet dangerous solo, hard to lock down. **Weaknesses:** not top tank or top direct DPS; demands Rhythm management and battlefield awareness.

#### NECROMANCER — “a master of decay, entropy, and the dark forces that shaped the cosmos”

- **Archetype:** Summoner / Debuff master / Control caster / Tanky dark mage. **Resource:** Dark Energy (the deliberate choice over “void” — dark energy/dark matter carry the scientific grounding the game wants).
- **Lore:** In the frozen wastes of the north (Russia), necromancers learned to touch the void between atoms — twisting dark energy into armor, weapons, monstrosities, and illusions.
- **Build flexibility goal (creator’s spec):** the three trees must allow — tank surrounded by DPS skeletons; tank alongside a monster; full ranged DPS; or ranged DPS with a monster tank/DPS.
- **Unique mechanics:** (1) **Marrownaut Form** — summon a thick layer of bone around the body to become a colossal skeletal juggernaut (conceptually like Juggernaut from comics): defense, melee range, passive aggro, damage reflection, curses, physical momentum; summons gain buffs while active. (2) **Summoning flexibility** — a horde of weaker skeletons OR one massive Dark Matter monster, customizable point-by-point (Tank/DPS/Life-leech variants) like a build-your-own pet. (3) **Dark energy/matter mastery** — gravity wells, AoE bombs, rifts, energy armor, and detonating your own summon.
- **Skill trees (creator’s skill lists merged with the blueprint):**
  - **Marrownaut Discipline (tank/summons):** Marrownaut Form · Spiked Punch/Spike Fist (jagged bone fist) · Bone Dart (ranged shard) · Bone Nova (bone shockwave AoE — damage, knockback, aggro) · Quill (damage reflect) · Calcify (armor + HP buff) · Bone Spur (grow bone thorns damaging attackers/colliders) · Stake (pin an enemy to the ground, 7s immobilize) · Necrotic Presence/Aura (adds damage and health to summons) · Summon Skeleton Warrior (+ Blood Skeleton: skelly damage; Marrow Skeleton: skelly aggro/defense) · Juggernaut’s Might (defense in Marrownaut form + bone-thorn damage) · Banshee’s Wail (damage + silence) · Grave Bind (spectral chains immobilize).
  - **Curse Weaver (debuffs/control):** Cognitive Reset (silence/interrupt) · PH Sap (damage) · Necrosis (weakening disease) · Dark Matter Fog (AoE ticking damage + blind) · Weaken (reduce attack power) · Receptive (lower resistances) · Dilution/Delusion Aura (debuff-resistance-lowering aura) · Expose (raise incoming crit chance) · Ghost Decay (decoy illusion for escape; taunts/distracts then expires) · Hex of Entropy (slow + damage reduction, 2s).
  - **Dark Energy Dominion (ranged DPS/control):** Summon Dark Matter Monster (tank/DPS/leech; Unleash Void spawns it) · Dark Energy Spear (piercing nuke) · Dark Gravity (gravity well pull + damage) · Life Leech (monster heals as it damages) · Dark Energy Burn / Dark Energy Radiation (channelled DoT beam) · Energy Rift (delayed AoE bomb) · Dark Energy Armor (magic resist + armor for ranged play) · Blight (chilling AoE aura that damages and slows) · Dark Energy Prism (crystal-cage immobilize) · Detonate (sacrifice the monster for a massive AoE explosion) · Dark Matter (adds physical damage to the void monster’s next attack) · Dark Invocation (damage + weaken) · Summon Skeletons (lost souls from the void) · Internal Collapse (void inside the target, 3s internal DoT, stacks) · Tainted Dark Matter (big hit + defense debuff) · Dark Energy Blip (fast single hit) · Dark Energy Rift (hits target + 2 nearby) · Dark Energy Beam (channel) · Dark Energy Burr (delayed sticky explosive) · Dark Matter Bomb (large single-target damage with splash) · Grasp of Death (spectral hands steal life) · Osteo Aura (lowers nearby enemies’ defense) · pet upgrades: Unyielding Beast (pet life/defense), Tentacles of the Void (pet hits more targets per swing), Frenzied Beast (pet attack/run speed).
- *Earlier exploratory trees preserved:* Bone Morph (Bone Shield, Skeletal Fortitude, Bone Spike, Reflective Carapace, Bone Armor, Mortal Bond, Skeletal Retaliation, Bone Prison, Living Fortress, **Ultimate: Eternal Resilience**) · Summoner (Raise Skeletons, Commanding Presence, Summon Void Beast, Death Pact, Soul Bond, Spectral Horde, Undying Army, Summoner’s Resolve, **Ultimate: Dread Lich**) · Hex (Weakening Curse, Corrosive Miasma, Hex of Frailty, Crippling Chains, Dark Pact, Doomshroud, Vampiric Touch, Ethereal Veil, Soul Siphon, **Ultimate: Curse of Annihilation**) · a “Shadowbound/Necrotic Minions/Dark Mastery” void-pet pass · a “Summoning Mastery/Cursed Arts/Bone Shaper” blend.
- **Visual evolution:** cloaked figure → bones and dark matter seeping through armor → spectral reanimation with orbiting skeletal remains and gravity distortions. **Strengths:** tank/DPS/control flexibility, strong solo, sieges. **Weaknesses:** vulnerable when summons die on cooldown; resource pacing; curse builds need team synergy.

#### MAGE — “the surgeon of reality”

- **Archetype:** Mid-range tactical DPS / high-mobility caster / tactical melee hybrid. **Resource:** Mana — placeholder; rename candidates: Quantum Energy / Essence Flow (“arcane” feels too WoW).
- **Lore & personality:** Western-Russia enclaves of intellectual elites — the high-elf equivalent: smart, detached, full of themselves, pristine, self-styled pure. They study magic as mathematics, philosophy, and physics. Voice flavor: “I am inevitable.” Deliberate contrast with the Wizard: the Mage is **clean and pure** (spacetime, pure energy, crystal); the Wizard is **earthy and biblical** (fire, plague, blood).
- **Unique mechanics:** spacetime control (slows, teleports, gravity wells); arcane/pure-energy channeling (beams, orbs, energy drains); **Crystalblade Transformation** — solidify arcane power into crystal armor and a crystal melee weapon, switching mid-range nuker → up-close bruiser with tanking option.
- **Skill trees:**
  - **Spacetime Manipulations** (built to spec: 6 damaging, 2 passive, 2 CC): Contraction (condense spacetime around the target, crushing damage) · Photon Beam (piercing line damage) · Antimatter Burst (AoE explosion) · Quantum Blast (single-target nuke) · Wormhole Rift (short teleport leaving a damaging portal) · Graviton Surge (gravity pull + stun) · Time Dilation (local slow field) · Quantum Shielding (passive resistance) · Time Warp (slow enemies/haste allies; also “speed up your relative time to get ahead of the world”) · **Ultimate: Singularity Collapse** (miniature black hole — pull, DoT, slow; stronger the closer the target).
  - **Arcane Specialization:** Arcane Orb (lobbed concentrated orb) · Arcane Blast (burst) · Arcane Leech Shot (pull arcane energy out of all neighboring enemies and fire it at one target) · Black Hole (stronger pull/damage field) · Arcane Infusion (spell damage buff) · Arcane Absorption (regen mana from ambient magic) · **Ultimate: Entangled Chains** (bind enemies so damage and control are shared).
  - **Crystalblade Mastery (melee/tank hybrid):** Encapsulation (surround wand/staff in crystal, turning it into a melee weapon) · Crystal Armor · Crystal Shard (ranged spikes + slow) · Crystal Strike · Crystal Surge (empowered strikes) · Shrapnel (swing so crystal pieces break off into the enemy, increasing their damage taken) · Crystal Reflection (melee reflect) · Crystal Veil (dodge) · **Ultimate: Crystal Fortification** (massive health + damage reduction — a moving crystalline fortress).
- *Alternative tree concepts preserved:* Illusionary Arts (Mirror Image, Mind Blast, Invisibility, Hallucination, Phantasmal Blades, Mind Control, Reality Distortion, Illusory Veil, Teleportation Mastery) and the earlier elemental pass — kept distinct from the Wizard by design choice.
- **Visual evolution:** robed scholars with crystalline wands → glowing embedded energy → warp distortions, crystalline wings, light-bending effects. **Strengths:** tactical control, switchable range/melee, mobility. **Weaknesses:** glass cannon outside Crystalblade; spacing-dependent; vulnerable to chain CC.

#### WIZARD — “the heir to ancient battles between gods and men”

- **Archetype:** Mid-to-long-range caster — burst DPS / battlefield manipulator / off-healer. **Resource:** Essence of Dominion.
- **Lore:** Modeled directly on the **magi of Exodus and the miracles of Moses** — staffs into snakes, the Nile to blood, the plagues. Wizards stood beside pharaohs as living weapons. Visual identity: elite Egyptian royalty clothing and armor inlaid with gold and lapis. Their magic models the biblical stories: blood, fire, plagues, electricity, divine heals, with some ice and wind.
- **Skill trees (7 skills each, per spec):**
  - **Divine Incantations (heals/support):** Healing Light · Divine Shield · Wrathful Flame (column of divine fire) · Resurrection · Holy Radiance (burst heal + cleanse + damage) · Divine Intervention (sacrifice own health to mass-heal and cleanse allies) · **Pillar of Judgment** (towering pillar of light — damage + stun, ultimate).
  - **Elemental Mastery:** Flame Burst (ignite DoT) · Frost Nova (freeze/slow radius) · Earthquake (AoE stun) · Gale Force (knockback + interrupt) · Lightning Strike (single-target nuke) · Elemental Ward (resistances + damage reflect) · **Cyclone** (elemental vortex pull + heavy DoT, ultimate).
  - **Plague Summoner:** Locust Swarm (DoT + defense weaken) · Curse of Darkness (vision/accuracy debuff) · Blood Boil (converts water environments or enemy blood into corrosives — damage + resistance reduction) · Mind Control (turn an enemy on its allies) · Plaguebearer’s Touch (contagious disease spreading on death) · Aura of Desolation (life-force drain field) · **Cataclysmic Deluge** (battlefield flood — heavy AoE + drowning debuffs, ultimate).
- **Visual evolution:** ornate Egyptian gold-and-lapis robes → internal glow with swirling plagues/storms → torn between blinding holy light and festering dark storms. Battle shouts echo with human and godlike voices simultaneously. **Strengths:** massive AoE/disruption; shifts between benevolent (healer) and cataclysmic (plague/elements) modes. **Weaknesses:** long cooldowns; healing costs personal health/energy (can’t main-heal); must hold range.

### 9.4 The remaining eight classes (design state preserved)

- **SAVAGE — “Xibalba”** (ancient Central American/Mayan; the best South America fit). Three trees built to spec — 2H high-damage/low-speed + counter-defense; fast attacks/charge-ups/cascading DPS; tank with life leech + damage reflection — labeled in notes as **Brute / Deity / Blood Dance** skill trees:
  - **Primal Fury:** Two-Handed Mastery (the macuahuitl — razor-sharp obsidian-bladed two-hander) · Jaguar’s Roar (bleed-over-time ferocity) · Shield of Kukulkan (spectral shield + counterblast stun) · Wrathful Quetzalcoatl (lightning attacks, chance to paralyze) · Tzolk’in’s Legacy (sacred-calendar foresight: crit/dodge) · Blood Rite (ritual combat dance: attack speed + crit damage, drains own health) · Solar Flare (blinding burst, accuracy debuff) · Obsidian Shroud (dark vortex: damage reduction + melee reflect) · Feathered Fury (feathered-armor form: speed, evasion, CC resistance) · Apocalypto’s Might (cataclysmic AoE stagger).
  - **Swift Reckoning:** Blade Dance · Stormstrike (electrified stun hit) · Serpent’s Swiftness · Windrunner (wind-spirit mobility) · **Cascading Torrent** (attacks grow in strength and speed over time, ending in a devastating finisher — the signature *cascading DPS* mechanic, also tied to the keystroke-pattern idea below) · Spirit Surge · Cyclone Kick · Shadowstep · Evasive Maneuvers · Bladestorm (bleeding flurry).
  - **Bloodbound Guardian (tank):** Vitality Aura · Life Leech · Impenetrable Ward (reduce + reflect) · Ancient Resilience · Sacrificial Pact (sacrifice health to give allies damage reduction + life steal) · Shield of Shadows (absorb converts to damage buff) · Spirit Bond (share regen/reduction with allies) · Vengeance Strike (counterattack scaling off damage taken) · Bloodthirsty Rampage (frenzy: attack speed/damage/leech, lower defense) · Guardian’s Embrace (immovable wall: reduction, melee reflect, threat generation).
  - **Signature mechanic idea:** assign a melee character a skill tree based on the keystrokes of a successful pattern — the more the player executes it correctly, the faster they may repeat it, resulting in more damage: a cascading DPS build. (Note: explore the same idea for a caster DPS and heals.)
- **WITCH DOCTOR** (Congo Basin; shaman archetype explicitly inspired by combining a “good Rafiki” and an “evil Rafiki”). Trees: **Voodoo Mastery** — Voodoo Doll (create a doll of the target; melee damage dealt to the doll is mirrored on the target at range), Spirit Projection (spirit leaves the body to distract enemies while the body attacks the doll), Soulbound Hex (damage on the doll reflects to attackers), Shadow Stitch (link the doll to nearby enemies; doll damage hits all linked), Spirit Assault (the spirit attacks the doll’s target, bypassing defenses), plus Hexing Ritual, Soul Bind, Spirit Swarm, Blood Pact, Cursed Effigy. **Spirit Whisperer** — Ancestral Guidance, Soul/Spirit Projection, Spirit Shackles (spectral chains immobilize + life drain), Spectral Echoes, Soul Revenant (summon a mighty revenant). **Pestilence (Toxic Alchemy)** — Venomous Infusion, Plague Cloud, Pestilence Nova, Miasma Armor, Corrosive Eruption, Unhealable Boils (prevents healing of the target). Role summary: AoE-range damage auras, voodoo “melee at a distance,” curses/CC/life drain.
- **MONK** (Lhasa, Tibet; the yin to the Assassin’s yang — same general role, opposite temperament). Small one-handed weapons or weaponized gloves; some form of invisibility; **melee heals** (massage/acupuncture-like: Restorative Touch, Revitalizing Aura, Pressure Points, Soothing Palm, Life Infusion) and **Chi manipulation** (Inner Focus, Chi Wave, Flowing Movement, Tranquil State, Empowered Strikes), plus a **Spiritual Harmony** tree (Divine Connection, Enigmatic Presence, Astral Projection, Enlightened Mind, Karma’s Embrace). Original sketch: Gauntlets (melee DPS), Traps (wind/earth/water), third tree TBD. Cultural note logged: Chi is Chinese/East Asian rather than strictly samurai/Japanese — fits the Monk.
- **ASSASSIN** (Istanbul; mechanical-engineer flavor). **Trapper’s Arsenal** (Trap Mastery, Explosive Devices, Snare Tactics, Toxic Brew, Disorienting Gadgets) · **Shadow Arts** (Cloak of Shadows, Ambush Tactics, Vanish, Evasive Maneuvers, Silent Takedown) · **Marksman’s Precision** (Throwing Mastery — throwing stars, Rapid Shot, Piercing Strikes, Ensnaring Arrows, Trick Shot ricochets). Original sketch: Traps (elemental/CC/high damage), Stealth (CC, ambush, burst), Range (throwing stars, bow, CC, poison).
- **HUNTER** (Anchorage or Sydney). Revised trees: **Beast Mastery** split between **taming one large pet** (tank that draws aggro) and **a horde of smaller pets** (DPS/CC/support), plus Pack Tactics, Beast Training, Beast Mastery ultimate; **Marksmanship** with added crowd control (Precise Aim, Steady Shot, Hawk’s Eye, Trueshot Aura with snares/blinds/disorients, Eagle’s Gaze ultimate); **Wild Frenzy** melee “wolf-pack” tree fighting alongside pets, including **two pet-command skills — all pets attack the hunter’s target, or all pets spread across different targets** (Pack Leader, Savage Strikes, Pack Tactics, Call of the Wild, Alpha’s Fury ultimate). Design constraint: players must be able to dump all points into range or melee with none in pets (pets may not suit PvP styles). Original sketch: Melee (daggers, short swords, poison, damage reflection), Range (slows, multishot, rapid shot), Beast Control.
- **SAMURAI** (Kyoto). Status: not yet dialed in — “having a hard time making him stand out.” Original sketch: Armor (melee, blocks, AoE), Tactics (melee, crit, DoT), Agility (melee AoE, group combos, DoT). Brainstormed trees: **Bushido Techniques** (Sword Mastery, Honor Code, Counterstrike, Inner Focus, Whirlwind Slash, Battle Meditation, Samurai Spirit), **Tactical Strategies** (Tactical Precision, Battle Tactics, Swift Maneuvers, Feint Techniques, Battle Formation, Enrage, Tactical Retreat), **Zen Mastery** (Zen Meditation, Elemental Harmony, Ki Energy Flow, Tranquil Mind, Serene Defense, Inner Balance, Zen Enlightenment). Differentiators vs Barbarian/Savage: precision, speed, stance-switching, Bushido timing rewards. Domain-taxonomy roles: Speed (tank), Resurrection (tank/leech), Blood Thirsty (cascading DPS).
- **PRIEST** (Luxor). Creator’s spec: one tree of **shields, damage reflection, light heals**; one of **damage — rebukes, vanquishing, punishment**; one of **heals with light damage using words of grace and forgiveness**. Resulting trees: **Shieldbearer** (Shield of Faith, Retribution Aura, Guardian’s Embrace, Divine Intervention self-sacrifice resurrect, Divine Fortress) · **Divine Punisher** (Smite, Divine Wrath, Rebuke of the Heretic, Vanquisher’s Zeal, Divine Judgment) · **Healer of Souls** (Words of Grace, Divine Benediction, Forgiveness’s Embrace, Divine Renewal, Sanctified Burst). Original sketch: Light (heals, shields), Rebuke (damage spells), Vanquish (shields, buffs, life steal).
- **ATLANTEAN — “Atlantia”** (Bali/Indonesia, the creator’s original placement; Atlantis-inspired). Spec: magical two-handed melee (high swing damage), coral-summoning crowd control, and a magic jewelry/trinket/medallion tree. Trees: **Trident Mastery** (Oceanic Strikes, Tidal Surge shockwaves, Riptide Dash, Poseidon’s Wrath) · **Coral Manipulation** (Coral Barrier, Entangling Vines, Coral Spike Trap, Siren’s Call confusion) · **Enchanted Relics** (Amulet of Arcana, Ring of Preservation, Trinket of Serenity, Medallion of Power). Original sketch: Melee Magic (magic-imbued melee), Jewelry (buffs/debuffs/gameplay mechanics), third tree TBD. Domain taxonomy: high-agility DPS + water manipulation + quantum slowing. (An earlier “Oceanus” concept with hydrokinesis, aquatic familiars, and whirlpools is preserved in Part II — superseded because the game has no swimming.)
- **BARBARIAN** (early roster, largely folded into the Blacksmith): Shield (2 shields, blocks, shoves, taunts), Combat (disarms, charge, shield-sword combos), Attack (speed, bleeds, weapon buffs); plus berserker/War Cry differentiation notes.

### 9.5 Launch-class capability matrix

|Class      |Tank          |DPS        |Support        |Control    |Summons|Melee           |Range|Heal       |
|-----------|--------------|-----------|---------------|-----------|-------|----------------|-----|-----------|
|Druid      |✓ (Morph)     |✓          |✓ (Restoration)|✓ (roots)  |✓      |✓ (Morph)       |✓    |✓          |
|Blacksmith |✓             |✓ (bruiser)|✓ (shouts)     |✓ (crystal)|✗      |✓ (dual shields)|✗    |✗          |
|Bard       |✗             |✓          |✓              |✓          |✗      |✓               |✓    |✓          |
|Necromancer|✓ (w/ monster)|✓          |✗              |✓          |✓      |✗               |✓    |✗          |
|Mage       |✗             |✓          |✗              |✓          |✗      |✓ (Crystalblade)|✓    |✗          |
|Wizard     |✗             |✓          |✓              |✓          |✗      |✗               |✓    |✓ (limited)|

-----

## 10. Progression, UI & Player Definition

### 10.1 Leveling & skill points

- Level 1 to max (60 in early notes; the handwritten 80+ banding is the alternative — see §3.3). XP from killing enemies, completing quests, and achievements. **One skill point per level** placed in the skill tree; possibly one extra skill point per region via regional reputation (§4.7).
- Player properties (GDD): Health · Mana/Stamina · Experience Points · Attributes (Strength, Dexterity, Intelligence, etc.) · Inventory · Quest Log · Currency · Skills.
- Winning: completing the main questline, defeating the final boss (Lucifer, after storming Heaven), achieving personal goals; endgame = battling Earth’s cultural lore and gods. Losing: defeat in combat, failing critical objectives, negative consequences from choices — every setback an opportunity.

### 10.2 Social systems

- In-game chat window (general, party, guild, private channels). Guilds grant perks — including collectively building a giant open-world fortress. Two factions: **Holy vs Demonic**.

### 10.3 UI (from the GDD)

1. **HUD:** health, mana/stamina, level, XP, minimap, quest objectives. 2. **Action bar:** customizable ability slots at screen bottom. 3. **Menu system:** inventory, customization, quest tracking, settings. 4. **Context-sensitive interaction prompts.** 5. **Full-screen map overlay.** 6. **Tooltip system.** 7. **Chat system.** UI must stay responsive and accessible across PC and Switch.

### 10.4 Game flowchart (GDD)

Menu (Main Menu → New Character / Characters / Options / Credits / Exit) → Synopsis (intro cutscene; lore introduction — overview of the character’s heritage and culture; character selection) → Gameplay (open-world exploration, questing, combat, crafting, trading, social interaction, PvP, dungeons & raids) → Player control (movement; combat actions: attack/defend/special; NPC & object interaction; inventory; menus) → Game over (winning and losing conditions as above).

### 10.5 Design guidelines (GDD)

Balance challenge and accessibility for all skill levels · emphasize player agency — actions and decisions shape the world · foster a positive, inclusive community free from toxicity and harassment.

-----

## 11. Production Plan

### 11.1 Scope philosophy

**Scalable design — need, want, nice-to-have.** (Racing-game example: you *need* a car and a track; a *want* would be a weird boost mechanic; a *nice-to-have* would be sponsored paint jobs.) Apply the same triage to every ToH feature. Strategic advice on record: the full vision is WoW-scale (a 5+ year project); ship a focused “Phase 1” first slice — ~6 classes representing the core spirit, 20–40 hours of gameplay from the starting city to the Heaven portal (a vertical slice of the dream).

### 11.2 Playable demo spec (handwritten)

- **3–5 characters:** Necro, Mage, Blacksmith, Savage, Bard. *(Note: differs slightly from the six-class launch list, which swaps Savage for Druid + Wizard — reconcile.)*
- **1 PvP arena** · **1–2 maps** · **Accelerated quest line up to level 20** at **Seattle and Egypt**.
- **Marketing visuals:** photos of Heaven from the portal (“Heaven Pantheon”), Seattle, Tokyo, the Himalayas, Stonehenge, a scene of Hell · **a video trailer**.
- Elevator-pitch asset checklist: basic elevator speech; highlights and unique aspects; why it will be engaging; monetizability; validity of direction and story; concept pics — Heaven, Hell, Greek gods, African gods, Sasquatch, joining the evil side, portal to Heaven, two major fantasy cities, a historic landmark in fantasy.

### 11.3 Design-content checklist (handwritten)

Map · Quest · Characters · Battling Types · Features · Chat · Items · Bosses/Enemies · Factions (mid-game/end-game).

### 11.4 Phase 1 question list (the working to-do)

Get a map of the world → pick starting locations → blueprint the first 20 levels (mentor figure asks for help protecting the city; basic intro quest; mentor teaches the region’s earthly magic/class skills; milestone mini-bosses requiring group dungeons; final low-level boss outside the continent’s evil main city) → storyboard levels 20–40 fighting for evil (power-up on accepting evil energy; Spirit Vision overlay unlocks; stealing/gathering energy to open the Heaven portal) → ballpark map estimates of where that takes place → a couple of lore milestones → several versions of Heaven and its storyline → a couple of Heaven sub-bosses → connect the end of Heaven to the start of Hell (how do you get to Hell?) → a couple of Hell map versions → a few Hell bosses → what beating Hell is like → what happens afterwards → what fighting on Earth is like → what the holy/evil factions are like → the endgame faction map → how bosses integrate on the endgame map.

### 11.5 Development process (the canonical 10 steps — recorded three times verbatim, kept once)

1. **Conceptualize & design** — core mechanics; detailed GDD (features, mechanics, story, characters, art style); milestone roadmap.
1. **Gather a development team** — programmers, artists, designers, sound engineers; recruit or partner for missing expertise; clear communication and collaborative workflow.
1. **Create a prototype** — small-scale validation of core mechanics; iterate on feedback.
1. **Art & asset creation** — concept art, characters, environments; cohesive style; asset library (models, animations, textures, SFX).
1. **Programming & gameplay implementation** — foundations first (movement, combat, AI); progression/skill trees/abilities; the open world with fictionalized real locations.
1. **Content creation** — quests, dungeons, raids; enemy variety, bosses, puzzles; difficulty/progression balancing.
1. **Multiplayer functionality** — networking (parties, guilds, chat); server infrastructure; stability/scalability testing.
1. **Playtesting & iteration** — diverse playtests; analyze and adjust; fix bugs, refine mechanics.
1. **Marketing & release** — strategy; trailers/screenshots/website/social; self-publish or partner with a publisher.
1. **Post-release support** — monitor feedback; patches; regular updates and content expansions.

### 11.6 Pitch deck contents (15 elements)

1. Introduction (the standing intro: an immersive MMORPG blending real-world mythology with cutting-edge science; open-world fantasy RPG; audience = gamers who love deep online experiences, exploration, progression, storytelling, historical/mythical blends, and magic rooted in quantum physics and alternate realities). 2. Unique selling proposition. 3. Storyline & lore. 4. Game mechanics. 5. Character classes & abilities. 6. World design. 7. Multiplayer features. 8. Endgame content. 9. Monetization strategy. 10. Development team. 11. Market analysis. 12. Competitive analysis. 13. Marketing & distribution. 14. Financial projections. 15. Next steps.

### 11.7 Working roadmap (from the design sessions)

1. World Pitch document (done — see §1) → 2. Class blueprints for the six (done — see §9.3) → 3. Combat system page (movement, attacks, cooldown pacing, defense — translate “faster than WoW, slower than D2” into mechanical targets) → 4. Resource/Crystal system one-pager → 5. Lore & quest starter package (starting zone, first story beats, evil-route option) → then world map zones (main city hubs, early zones, travel paths, PvP/faction tensions, future class expansions). Open creative-direction questions on record: first platform priority? open world like WoW zones or seamless like Diablo 4? Dark-Souls-cryptic or direct cinematic storytelling?

-----

## 12. Consolidated Open Questions & Decisions Needed

1. **Max level & band structure:** 60 (v.A) vs 80+ (v.B) — §3.3.
1. **Closed world until endgame?** (handwritten question).
1. **Heaven portal count:** one global / per continent / per main city.
1. **Demo roster (Savage in?) vs launch six (Druid/Wizard in?)** — §11.2.
1. **Map scaling approach** (exact / curated / subjective) and dungeon placements.
1. **Faction zone control rules** (reversion, faction main cities, city takeover).
1. **Regional reputation:** skill point per region? What happens if a player skips a region’s quests?
1. **Health potions:** none, or long cooldown? Temporary-buff merchants? Non-combat NPC offerings (shelter, politics, trades, businesses)? Guild businesses/restaurants/food buffs?
1. **Mana naming:** Arcane Liquid vs Ethereal Liquid vs both per class; Mage resource rename (Quantum Energy / Essence Flow).
1. **Crystal system rules:** tiers, acquisition, swappability, crystal sickness.
1. **Real-money / crypto / NFT economy** — flagged for balance, fairness, legal/ethical review.
1. **Skill-point caps per skill** (the ×0.5 multiplier approach is the leading solution).
1. **PvP arenas** — struck from the battling-types list; confirm cut.
1. **Samurai, Monk/Aqua third trees** — incomplete.
1. **Class home conflicts:** Necromancer (Russia vs Prague), Mage (W. Russia vs Avalon vs Novgorod), Druid (PNW vs Stonehenge), Hunter (Anchorage vs Sydney).
1. **Code language / engine** (Unity vs Unreal noted as the question to answer).
1. **WoW skill-tree meta-analysis** (what % damage vs passive vs utility per tree) — research task; no data yet.

-----

-----

# PART II — REDUNDANCY LOG & RAW REFERENCE MATERIAL

*Everything below is preserved so no information from the 15 source documents is lost. It is either (a) duplicated across files, (b) generic AI-generated reference text rather than ToH-specific design, or (c) superseded drafts already merged into Part I.*

## A. Exact and near-exact file duplicates

1. **`ChatGPT_thread.rtf` ≡ `ToH_ChatGPT.rtf`** — byte-identical files (the six-class blueprint design session). Content consolidated into §1, §6.2, §9.
1. **`Gd.pdf` ≡ `Thrones_of_heaven_pdf.pdf`** — identical content (idea parking lot, story audio-clip, formal GDD, Phase 1 list, notes from work). Consolidated into §1–§5, §9.1, §10, §11.
1. **`ToH_creation_and_sales.pdf`** contains the 10-step development process **three times verbatim** (twice with identical wording, once renumbered). Kept once at §11.5.

## B. Content repeated across multiple documents (merged once in Part I)

- The **3-class taxonomy + rock-paper-scissors domain structure** appears in both Gd (p.1–2) and ToH_Characters. → §9.1.
- The **Phase 1 question list** appears in Gd (p.6) and ToH_Maps. → §11.4.
- The **cities/NPC/merchant notes** appear in Gd (p.12, “Notes from work”) and ToH_Maps (with transcription variants: “Byron mental construction” = “environmental construction”; “Malay” = “melee”; “temporary baths” = “temporary buffs”; “Emergent/merc” = “a merc[hant]”; “her food” = “buy food”; “Barses” = “bosses”; “Ringtones back” = “bring tones/loot back”; “Citi” = “city”; “in PC” = “NPC”; “Call Lo” = “call to”; “buyers/pyres of a light”; “Fisher” = “Fissure”; “Weekend” = “Weaken”; “Mall” = “Maul”; “where bear/wolf” = “werebear/werewolf”; “Gollum” = “golem”; “Theory” = “Fury”; “Quil” = “Quill”; “dillusion” = “delusion/dilution”; “copastetic” = “copacetic”). → §4.3–§4.4, §3.4.
- The **level-band quest summary (1–20 / 20–40 / 40–50 / 50–60 / 60+)** appears in ToH_Quests_and_Lore and is restated in the .rtf design session and system-design handwriting. → §3.3.
- The **Witch Doctor, Xibalba/Savage, Monk, Druid-heal, Wizard, Mage-crystal, Mage-spacetime, Necromancer, and Bard skill text** in ToH_Characters duplicates the skill lists generated in ChatGPT_thread__3 and the .rtf blueprints (the mind-map cards were built from those threads). → §9.3–§9.4, merged with the creator’s own lists.
- The **“blueprints for characters” 10-item list** appears in both ToH_Characters and ChatGPT_thread__3. → §9.1.
- The **story synopsis** appears in four variants: the Gd “audio clip,” the Gd formal GDD synopsis, the CHATGPT_conversation__1 retelling, and the .rtf World Pitch. All beats merged in §3.1 (no beat dropped: angels intervening early, the dying boss’s spin, the “tend to our own dead” moment, God’s chains-and-abyss threat, the “Hell respawn” lampshade, and the neutral “forgiven but unglorified” state are all retained).
- The **ancient-pantheon survey** (Egyptian→Aztec) appears in ToH_Quests_and_Lore in full prose; condensed to the god list in §3.5.
- **Spacetime mage skills** were generated in thread 3 to spec (6 damage/2 passive/2 CC) and re-listed in ToH_Characters; merged into §9.3 Mage.

## C. Generic reference material (AI-generated explainers — condensed; originals add no ToH-specific design)

1. **WoW gameplay overview** (ToH_Game_References): combat (PvE/PvP, class abilities), exploration, quest types, level-up/talent progression, social systems (parties, guilds, chat, events). Takeaways already embodied in ToH’s design pillars.
1. **Diablo 2 gameplay overview**: fast real-time combat vs hordes, exploration with randomized dungeons/replayability, quest-driven progression, skill trees with synergies, limited social/co-op focus.
1. **WoW perspective & controls:** third-person; WASD + mouse camera/interaction; rebindable keys; gamepad support secondary.
1. **D2 perspective & controls:** isometric; mouse-driven targeting/attacks; hotkeys; no native gamepad.
1. **D2 combat mechanics:** melee/ranged/spells; class skill trees & synergies; resource management; crowd control; positioning/kiting; gear-driven power; potion management.
1. **WoW combat mechanics:** class/spec attack types; offensive/defensive/utility abilities with cooldowns and resources (mana/energy/rage/combo points); CC; positioning/line-of-sight; tank/healer/DPS teamwork; interrupts and dispels.
1. **D2R skill-shape taxonomies** (abstracted skill-type lists used as design reference): **Barbarian** — AoE flee/buff/debuff/life-buff/skill-buff/damage; item & potion loot buffs; flee turret; six specific-weapon buffs; run/walk buffs; defense buffs; knockback; double-damage melee/throwing; jump & jump-attack; stun+buff; uninterruptible damage+armor buff; melee AoE beam path; double-damage melee speed buff; heavy damage buff w/ armor debuff. **Paladin** — offensive auras (damage, fire, ice+slow, lightning, reflect, attack, +hit chance, attack-speed, anti-specific-enemy, enemy-defense debuff) and defensive auras (lightning/fire/ice/all-magic defense, healing, defense, anti-debuff, mana, movement, specific healing). **Necromancer** — multi melee/caster summons + boosters; four tank summons + booster; summon defensive buff; revive slain enemy; AoE cone/splash/beam; poison melee/splash/nova; defensive objects/buffs; homing spell; damage up; flee; enemy damage down; reflect; vision debuff; confusion ×2; enemy reflect; damage-to-life heal; attack & movement debuff; lower magic defense. **Sorceress** — single spells (plain, splash, slow, splash+freeze); AoE cone/strip/pathway/pulse/beam/nova(+slow variants); heavy delayed AoE; mana up; damage buffs; turret; chain damage; proximity % damage; movement buff; utility grabber; health-mechanism shield; melee/caster shields with slow ± damage. **Druid** — AoE cones/beams/auras; turret w/ random splash; magic shield; morphs (fast low-damage DPS / slow high-health tank); multi-strike, charge-up, poison, shared-fire strikes; AoE cone stun; morph buff; pet suite (damage aura, slow, high damage, high health, life/damage/reflect buffs, poison splash, health/mana regen). **Assassin** — fire/lightning range & turret variety (pulse cones, beams, multi-function); fast single-target; AoE turret; damage shield; damage/speed/defense/poison/weapon buffs; two fighter summons; damage debuff; stun+damage; stun+possession; charge-up.
1. **WoW Mage skill-shape tally** (ToH_Characters): self shield ll · self passive damage buff lllll · invisibility l · specific spell boost lll · steal target’s buff l · spell-boost shield lll · spell-boost utility llll · cleanse l · self passive shield buff ll · utility lll · enemy de-utility · damage spell llll.
1. **Generic curse/hex taxonomy** (ToH_Characters): curses of Weakness, Misfortune, Silence, Binding, Vulnerability, Decay, Agony, Despair; hexes of Confusion, Transformation, Fear, Weakness (reduced healing/resists/defenses).
1. **Crystal reference list** (ToH_Characters; raw material for the crystal system): Agate, Amazonite, Amber, Amethyst, Ametrine, Angelite, Apatite, Aquamarine, Aragonite, Aventurine, Azurite, Beryl, Black Tourmaline, Bloodstone, Blue Lace Agate, Calcite, Carnelian, Celestite, Chalcedony, Charoite, Chrysocolla, Chrysoprase, Citrine, Coral, Danburite, Dioptase, Emerald, Fluorite, Garnet, Hematite, Howlite, Iolite, Jade, Jasper, Kyanite, Labradorite, Lapis Lazuli, Larimar, Lepidolite, Malachite, Moonstone, Morganite, Obsidian, Onyx, Opal, Peridot, Prehnite, Pyrite, Quartz (Clear/Rose/Smoky etc.), Rhodonite, Ruby, Selenite, Serpentine, Sodalite, Sunstone, Tiger’s Eye, Topaz, Tourmaline, Turquoise, Unakite.
1. **Generic pitch/GDD how-to prose** (ToH_creation_and_sales): the “Define the Core Gameplay Mechanics / Craft the GDD / Refine and Iterate” walkthrough — fully absorbed into §11; the original is procedural boilerplate.
1. **Conversational filler** across all four ChatGPT transcripts (acknowledgments, encouragement, repeated summaries of prior turns, “would you like me to…” prompts) — no design content; omitted by design.

## D. Superseded drafts (kept for the record, replaced in Part I)

1. **Blacksmith crystals v1:** Fury/Fortitude/Precision → v2: Obsidian Rage / Diamond Shield / Quartz Precision → **final: Iron Pyrite / Prism Quartz / Celestial Calcite** (§9.3).
1. **Necromancer trees v1** (Bone Morph / Summoner / Hex with Eternal Resilience, Dread Lich, Curse of Annihilation ultimates) and the void-pet and 3-tree-blend passes → final Marrownaut / Curse Weaver / Dark Energy Dominion (§9.3). “Void” naming → **Dark Energy** (scientific grounding).
1. **Mage trees v1** (Elemental / Arcane Manipulation / Illusionary Arts) and the Arcane Warrior + Shadowmeld pass and the all-crystal three-tree pass → final Spacetime / Arcane Specialization / Crystalblade (§9.3).
1. **Druid morph list v1** (generic: Feline Agility, Avian Wings, Serpent’s Coils, Ursine Strength, Canine Loyalty, Insect Exoskeleton, Arachnid Webs, Elephantine Might, Chameleon Camouflage, Rhino’s Charge, Primate Dexterity, Scorpion’s Sting, Spider’s Climbing, Dolphin’s Grace, Butterfly Wings) → v2 species-specific list with revisions (no flying/swimming; Panther→Snow Leopard; Honeybee→Queen Bee; Eagle’s Vision→Gecko’s Wallcrawling; Chameleon gains the pull) (§9.3).
1. **Atlantean “Oceanus” v1** (Aqua Mastery / Marine Conjuring / Mystical Seafarer) → “Atlantia” final spec (§9.4).
1. **Priest trees v1** (Lightbringer / Divine Arbiter / Seraphic Oracle) → creator-spec’d Shieldbearer / Divine Punisher / Healer of Souls (§9.4).
1. **Class-geography list v1** (the 14-city spread) partially superseded by the blueprint sessions (Druid→PNW, Necromancer→Russia, Mage→W. Russia); conflicts logged in §9.2 and §12.
1. **Rafiki exercise** (good-Rafiki and evil-Rafiki skill lists) — a creative stepping stone fully absorbed into the Witch Doctor (§9.4); raw skills: Wisdom Aura, Spirit Guide, Enigmatic Vision, Healing Touch, Nature’s Harmony, Staff Mastery, Ancestral Blessing / Dark Corruption, Shadowy Summoning, Cursed Vision, Life Drain, Shadow Step, Staff of Despair, Forbidden Ritual.
1. **GPT-alternative phrasings inside the Gd GDD** (lines marked “GPT wrote —” for Winning and the open-world feature) — the creator’s own phrasings were preferred in Part I; GPT variants: “Success is measured by completing quests, defeating powerful enemies, acquiring rare loot, and shaping the destiny of the game world” / “Explore a vast and detailed game world filled with diverse landscapes, ancient ruins, bustling cities, and hidden secrets.”

## E. Source-file index

|# |File                      |Disposition                                                           |
|--|--------------------------|----------------------------------------------------------------------|
|1 |Gd.pdf                    |Core GDD + parking lot → Part I throughout                            |
|2 |Thrones_of_heaven_pdf.pdf |Duplicate of #1 (includes cover art page)                             |
|3 |Combat_Designer.pdf       |§5.1–5.3 (incl. handwritten battling types)                           |
|4 |ToH_system_design.pdf     |§5.3–5.4, §8, §11.2–11.3, §3.3-B (handwriting recovered from scans)   |
|5 |ToH_Items.pdf             |§7 (handwriting recovered from scans)                                 |
|6 |ToH_Maps.pdf              |§4 (incl. handwritten city principles + class-city world map)         |
|7 |ToH_Quests_and_Lore.pdf   |§3.3–3.5                                                              |
|8 |ToH_Characters.pdf        |§9, Part II C.8–C.10 (mind-map of all class skill cards)              |
|9 |ToH_Game_References.pdf   |Part II C.1–C.7                                                       |
|10|ToH_creation_and_sales.pdf|§11 (dev process kept once of three)                                  |
|11|CHATGPT_conversation__1   |§1–§4, §8, §10 (Q&A on vision, cities, power-ups, economy, 2D/3D)     |
|12|***ChatGPT_thread__2***_  |§6.3, §9.3 Blacksmith crystals (v2 logged in D.1)                     |
|13|ChatGPT_thread.rtf        |§1, §6.2, §9.3 (six blueprints, World Pitch, crystal-economy analysis)|
|14|ToH_ChatGPT.rtf           |Duplicate of #13                                                      |
|15|ChatGPT_thread__3         |§9.1, §9.3–9.4, §12 (class system R&D, all 14 classes, geography)     |

*End of master document.*