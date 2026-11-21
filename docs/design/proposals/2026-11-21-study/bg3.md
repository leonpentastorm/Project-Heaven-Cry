# Baldur's Gate 3: how a video game made 5e's curve felt

Primary reference is bg3.wiki, the community wiki that reads its tables from the game's data. Larian's own reasons come from interviews that I only found reported second-hand. Anything I could not confirm is marked "not verified". (Fact-check pass: 12 key claims checked against bg3.wiki and press reports; corrections are made in place.)

## 1. What Larian changed from 5e, and why

| Change | BG3 rule | Why (stated or apparent) |
|---|---|---|
| Level cap 12 | XP is 5e's up to level 5 (6,500), then gentler: 13,000 / 21,000 / 30,000 / 42,000 / 56,000 / 76,000 / 100,000 for levels 6 to 12 (bg3.wiki/wiki/Experience; verified) | Vincke, as reported (PC Gamer, GamesRadar, Dexerto): levels 12 to 20 would be very hard to build an adventure around because they grant "godlike" powers (including spells that reach other planes). Reported second-hand; the GamesRadar page fetched only showed its headline. |
| No attunement | Every equipment slot is live (helm, cloak, gloves, boots, amulet, two rings, armour, two weapon sets) | (reading) Gear becomes the main build axis, 10 or more items each pulling on your build. |
| Shove and Jump as bonus actions | Shove is a bonus action with 1.5 m reach; it pushes 1 to 6 m, set by Strength against the target's weight; it is Athletics against the target's passive 10 + Athletics or Acrobatics (the higher). Since Patch 6, shoving an ally always works (bg3.wiki/wiki/Shove; verified) | (reading) Turns position and terrain (ledges, chasms, surfaces) into damage that every class can use. |
| Weapon actions | Each weapon family gives proficient wielders 2 to 3 named moves, most once per short rest (per character, not per weapon): Cleave, Lacerate, Piercing Strike, Topple, Pommel Strike, Flourish, Brace, Tenacity. Save DC = 8 + proficiency + Str or Dex (the higher) + the action's own bonus, most often +2. Before Patch 5 the DC was a flat 10 with no proficiency, which fell behind after level 5 (bg3.wiki/wiki/Weapon_actions; verified) | (reading) Gives martial characters choices from level 1 and makes the weapon type matter, not just its die. |
| Magic items with riders | A few hundred magic items; most change a behaviour rather than add a flat plus (section 2) | (reading) The build-enabler loop. |
| Elixirs | Last until a long rest. For example, Hill Giant Strength sets Strength to 21. One elixir active at a time (not verified) | (reading) Consumables that last a whole adventuring day, so finding one is a decision that matters. |
| Tadpole (illithid) powers | A second skill tree bought with tadpoles found in the story; an Act 3 tier on top. Examples: Cull the Weak, Psionic Backlash, Favourable Beginnings | (reading) Story-gated power with a moral cost. |
| Feats | Tavern Brawler adds Strength to the attack and damage of unarmed, improvised and thrown attacks a second time. In Honour mode improvised weapons get the attack bonus but no extra damage (bg3.wiki/wiki/Tavern_Brawler; not re-checked) | (reading) Simpler, punchier versions of the feats. Several became the throwing meta. |
| Rests | Up to 2 short rests per long rest. A long rest costs 40 camp supplies (80 on Tactician; verified), and camp is where story scenes play | (reading) The rest economy doubles as a story clock. |
| Proficiency on Explorer | +2 for everyone, enemies included (verified) | (reading) Difficulty set by a flat modifier, not by more content. |

## 2. Items that build a loop

The pattern is a state counted on its duration. Doing X adds turns. Each remaining turn gives +1 to something. The state decays 1 a turn, or faster when the counter-condition happens. Some states cash out at a threshold. Reapplying adds duration instead of stacking a second copy, and most cap at 5 to 10. So one cheap trigger, repeated, builds a number the player can see and play toward. (Verified for Arcane Acuity, Radiating Orb, Lightning Charges and Reverberation; the others in the table were not re-checked.)

| State | Per turn of duration | Decay and cap | Payoff |
|---|---|---|---|
| Arcane Acuity | +1 to spell attack rolls and spell save DC | −1 a turn (at the start of the creature's turn), −2 each time you take damage; cap 10 (verified) | Up to +10 DC: the main caster engine |
| Radiating Orb | −1 to the enemy's attack rolls | −2 for each attack it makes; cap 10, so at most −10 (verified) | A defensive debuff |
| Reverberation | −1 to the target's Str, Dex and Con saves | −1 a turn; cap 5 turns on the wiki's real-time note (verified) | At 5: 1d4 thunder and a DC 10 Con save (15 in effect, after the −5) or Prone; the condition is then removed |
| Lightning Charges | +1 to attack rolls and +1 lightning damage. The wiki does not say this scales with the number of charges, so read it as a flat +1 while you hold any (corrected) | −1 a turn; the wiki does not state a cap | At 5: the next hit deals +1d8 and consumes them (verified) |
| Heat | 1d4 fire to yourself each turn | cap 7 | Heat Convergence: +1 fire damage for each turn left (not re-checked) |
| Wrath | +1 melee damage | ends at the end of turn; cap 7 (Hotfix 15) (not re-checked) | Damage taken becomes damage dealt |
| Momentum | +1.5 m of movement | −1 a turn; cap 5 (not re-checked) | Kiting and reaching the enemy |

**Ten examples across the acts** (rarity and effect from bg3.wiki; act assigned from the location; none of these ten were re-checked in this pass except Helldusk Armour, whose AC 21, -3 to all damage, fire resistance, Fly as a bonus action per long rest and Legendary rarity are verified. The wiki also says the armour's passive stops the wearer being Burned; the brief's "succeeding a save sets the caster Burning" was not found and is not verified.)

| # | Item | Act, rarity | What it does |
|---|---|---|---|
| 1 | Spellsparkler (quarterstaff) | Act 1, Waukeen's Rest; Rare | Spell or cantrip damage gives 2 Lightning Charges; multi-hit spells give one per hit |
| 2 | The Joltshooter (longbow) | Act 1 (not verified) | Weapon damage gives 2 Lightning Charges |
| 3 | Gloves of Belligerent Skies | Act 1, Crèche Y'llek; Uncommon | Thunder, lightning or radiant damage inflicts 2 turns of Reverberation |
| 4 | Blood of Lathander (mace +3) | Act 1, Crèche Y'llek; Legendary | Sunbeam once per long rest; once per long rest at 0 HP, heal 2d6 and allies within 9 m 1d6; fiends and undead in its light save (DC 14 Con) or are Blinded |
| 5 | Ring of Spiteful Thunder | not verified | Damaging a creature that has Reverberation Dazes it unless it passes a Con save: the loop's second half |
| 6 | Thunderskin Cloak | not verified | A Reverberating creature that hits you saves (DC 13 Con) or is Dazed |
| 7 | Coruscation Ring and Luminous Gloves | Act 2 (not verified) | Give Radiating Orb on radiant damage, often paired with Radiant Strike and The Sacred Star |
| 8 | Helmet of Arcane Acuity | Act 3, Mason's Guild; Uncommon | +1 to Dex saves; weapon damage gives 2 turns of Arcane Acuity (the gish and Eldritch Knight engine) |
| 9 | Helldusk Armour | Act 3, House of Hope (taken from Raphael); Legendary | AC 21, heavy armour with proficiency built in, −3 to all damage, fire resistance, Fly as a bonus action once per long rest (verified); Burning rider not verified |
| 10 | Markoheshkir (staff) | Act 3; Legendary | +1 to spell DC and spell attacks; switch between elemental attunements (the lightning one gives 2 charges per instance of spell damage, plus proficiency to lightning damage); one free spell slot; Chain Lightning |

The items come in sets: a generator, an amplifier and a converter. (reading) The Sparkstruck set has seven items that make Lightning Charges and seven that read them: temporary HP when you gain charges (Lifebringer), +1 AC and saves while you hold charges (Sparkswall Armour), spending 3 charges for an aura (Real Sparky Sparkswall shield). The Reverberation set has generators (Belligerent Skies, Stormy Clamour boots, Spineshudder Amulet) and payoffs (Spiteful Thunder, Thunderskin). A build grows across the acts by collecting a set's pieces. (Set counts not verified.)

**Rarity in practice** (colours and patterns are my reading, not from the wiki):

| Tier | What sets it apart |
|---|---|
| Uncommon (green) | One rider: a trigger and a small state (Helmet of Arcane Acuity, Belligerent Skies). The workhorse. Many build pieces are uncommon. |
| Rare (blue) | One rider plus a spell or an action once per rest (Spellsparkler), or a +1 or +2 weapon with a rider |
| Very rare (purple) | A signature effect or two riders. +2 weapons are common here. |
| Legendary (gold) | Three or more effects, often a once-per-rest spell, a +3 weapon and a passive that changes the fight (Blood of Lathander, Nyrulna, Helldusk). Not limited to Act 3: Blood of Lathander is Act 1, quest-gated. |

Enhancement: +1 weapons are sold by merchants from Act 1. +2 shows up in late Act 1 and Act 2. +3 belongs to legendaries, mostly Act 3. The plus is never the reason to use an item (precise counts by act: not verified). (reading) Rarity measures how many riders an item has, not how big its number is.

## 3. Level by level

| Level | What the party gets |
|---|---|
| 3 | Subclasses for most classes (Battle Master, Assassin, Hunter and others); 2nd-level spells (Misty Step, Spiritual Weapon, Hold Person) |
| 4 | First feat or ability score increase: GWM, Sharpshooter or +2 to the main ability |
| **5** | **The spike, in four parts at once:** proficiency +2 to +3; Extra Attack for every martial (twice the weapon damage); 3rd-level spells (Fireball, Haste, Spirit Guardians, Hypnotic Pattern, Counterspell); cantrips gain a second die. Usually reached around the end of Act 1 (not verified). |
| 6 | Strong subclass features (Paladin aura, Warlock and Druid features); multiclass dips become attractive |
| 8 | Second feat |
| 11 | Fighter's third attack, 6th-level spells, Warlock's Mystic Arcanum; cantrips scale again (BG3 at 10, 5e at 11: not verified) |
| 12 | Third feat; the cap. Most parties reach it late in Act 3 (not verified). |

(reading) Players call level 5 the big spike because doubling the attacks and getting Fireball and Haste multiply output; they are not +1s. In 5e, the felt beats are level-gated jumps in kind (a new action, a new spell level), with a feat every 4 levels between them. (Level table is 5e SRD knowledge, not re-fetched; note that 5e proficiency goes +2 to +3 at level 5, and that a 5e fighter's feats come at 4, 6, 8 and so on for fighters, so "third feat at 12" is a general-class reading.)

## 4. Encounters

(reading) Difficulty comes from what each fight is made of more than from inflated stats. Common elements: high ground (+2 to hit with ranged attacks; not re-checked), surfaces (grease, water plus lightning, fire), explosive barrels, chasms to shove into, mixed rosters (casters behind melee), enemies with their own spells and items, scripted mid-fight reinforcements, and timers (Grymforge's lava, Raphael's soul pillars).

| Mode | What changes |
|---|---|
| Explorer | Enemy max HP 30% lower; proficiency bonus +2 for everyone, enemies included; merchants give a 20% discount (all verified); enemies use basic loadouts and a softer AI (not verified) |
| Balanced | Baseline; 40 supplies per long rest (verified) |
| Tactician | Most NPCs gain 20 to 30% HP, many bosses more (roughly 1.9 times Explorer HP); enemies get +2 to attack rolls and +2 to spell and ability DCs; higher prices (trade modifier 3x against 2.5x on Balanced) and lower sale value; 80 supplies per long rest (all verified). Advanced spells and items, extra attacks or abilities, and harsher AI (goes for casters, finishes downed characters) are not verified. Example, a named 4th-level Act 1 enemy: 46 / 67 / 87 HP on Explorer / Balanced / Tactician (verified, bg3.wiki/wiki/Difficulty); its proficiency is +4 / +2 / +2 on the three. |
| Honour (Patch 5) | One save for the whole campaign (verified). The wiki lists "30 tweaks to boss fights" that give bosses Legendary Actions, so the brief's "about 30 bosses" is not what the wiki states; read it as about 30 boss-fight tweaks, number of bosses not verified (corrected). Legendary Actions let a boss act at the end of other creatures' turns. The wiki says only "stricter action economy and damage bonuses as the game progresses" with no specifics; the Haste/Extra Attack detail is reported, not verified. Tavern Brawler improvised-damage removal and the Gloves of Belligerent Skies change are not re-checked. Tactician-like base: not verified. |

Typical numbers against a party of four (my estimate, not verified):

| Act | Enemies in a typical fight | Length |
|---|---|---|
| Act 1 | 3 to 10 (goblin patrols, the camp's leaders with 6 to 10 goblins) | 3 to 5 rounds |
| Act 2 | 5 to 12, more casters and undead | 4 to 6 rounds |
| Act 3 | 8 to 20+ in set pieces (Gortash with his Steel Watchers, Orin, Raphael) | Bosses 5 to 10 rounds |

## 5. What the community found broken or flat, and what changed

(All of this section is reported community opinion; none of it was re-verified.)

- **Broken:** stacking Arcane Acuity (two items gave +10 DC, so almost no saves); throwing with Tavern Brawler; Elixir of Hill Giant Strength on throwers; Haste with Extra Attack; Gloomstalker Assassin dips for burst in the first round; Radiating Orb setups (−10 to enemy hits; the cap of 10 is verified); the 1-level Warlock or Fighter dip; Sorcerer and Warlock spell-slot conversion; hirelings and companions as bodies to throw.
- **Flat:** unarmed Monk before items; weapon actions after level 5 (the DC change in Patch 5 is verified); many rare items in Act 2. Patch 6 made ally shoves automatic (verified).
- **Patched:** Patch 5 changed the weapon action DCs (verified) and added Honour mode's rule changes; Hotfix 15 capped Wrath at 7 (not re-checked). A number of riders now decay on duration rather than stack (Acuity loses 2 a hit, Radiating Orb 2 an attack; verified as current rules); when each changed: not verified. Larian usually fixed things inside Honour mode and left the lower difficulties loose (reading).

## What BG3 teaches PHC (my reading)

All five points below are the researcher's design opinion, not Larian's stated intent and not something a source establishes.

1. **Gear: sell behaviour, not percentages.** BG3's +1 / +2 / +3 is tiny on a d20, as PHC's grades are, and nobody minds, because the item that matters adds a verb or a counter. PHC's grades (Standard, Fine, Masterwork, Relic, Celestial) should count riders (Standard 0, Fine 1, Masterwork 1 plus a small plus, Relic 2 plus a once-per-rest action, Celestial 3 plus one that changes the fight), not multipliers of the reference rifle. Build sets from one universal shape (a state that adds duration, +1 a stack, a decay rule, an optional cash-out at N) with generators, amplifiers and converters. PHC already has the parts: the Momentum counter, Pressure pips, Heat-like Strain, conditions with durations. It needs one "stacking state" primitive in data, and items that feed and read it.
2. **A capped range with spikes in kind.** Twelve levels feel big because of four or five jumps in kind (subclass at 3, the level-5 package, feats at 4/8/12, a third attack and 6th-level spells at 11). PHC's 20 levels paced to percentages have no level 5. Choose 3 or 4 PHC levels (say 3, 5, 9, 13) where a second attack, a new spell tier or a rank arrives as a new action, and keep the levels between them small. Do not spread one jump evenly across 20 levels.
3. **The difficulty knob is enemy HP, to-hit, DC and AI, not party nerfs.** Tactician's +2 / +2 and +20 to 30% HP (verified numbers) is the whole difficulty system, and that is tiny compared with PHC's per-system fitting. Survival's budget should vary what a fight is made of (position, surfaces, casters, reinforcements) and leave numbers alone. (Note: the wiki shows other levers too, such as prices and supplies, and Explorer's +2 proficiency applies to everyone.)
4. **Rest economy as a clock.** Short-rest weapon actions and once-per-long-rest item spells make every fight a spending decision. Supplies make a long rest a cost. PHC's camp should recharge item and class actions per stage and charge for long rests in supplies, so that "once per rest" riders are the power curve.
5. **Expect stacking to break, and cap it in data.** Every BG3 exploit was two uncapped riders on the same stat. Give every state a cap and a decay in its data row, and measure combinations, not single items.
