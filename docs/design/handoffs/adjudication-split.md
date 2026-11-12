# The engine takes everything it can: all 80 Narrator-leaning perks and traits, read one by one (11 Nov 2026)

For Leon. This prepares section 11 of the balance pass (`docs/design/proposals/2026-11-balance-pass.md`). **Nothing in
the game was changed to write it: no rule, no number, no card, no code.** Every one of the 80 perks and traits whose
label is "hybrid" (64) or "narrator" (16) was read three ways: its card, the code that runs it, and what the perk audit
and the text pass found. Each sits in exactly one of six groups. Numbers and rules I propose are marked **(proposed)**
and listed again in section 9.

**Status, 11 Nov 2026: the first step is built** (spec, rules 1.14, "The engine takes everything it can, first
step"; items 1101 to 1116). What was done is ticked in section 13 at the end, and checked by a second reader in section 14; everything else in this document still
waits. The sentence above ("nothing in the game was changed") is true of this document as it was written, not of the
game now.

**Checked twice.** A second reader re-read all 80 cards and their code without relying on the first reading. Nine
items changed group, one finding was wrong and is corrected, and the deed section was brought in line with work done
at the same time. What changed is listed in section 12.

## 1. The short answer

1. **19 of the 80 are already run by the engine.** Only their label says otherwise. Relabelling them costs nothing and
   moves the engine's share from 56% to 66%.
2. **13 more need small or medium work** (11 with what the engine already sees, 2 that each need one missing piece).
   That reaches 73%.
3. **40 are real splits.** The engine already runs the rule half of almost all of them. What is left is one judgement
   or one piece of story that only the Narrator can supply, and it fits in one sentence on the card. Twelve of these
   could go fully to the engine if you accept a small rewrite of the card (section 5, marked). That reaches 80%.
4. **6 are judgement by nature** and stay with the Narrator whole.
5. **2 do nearly nothing as written** (Cultured, Ace Pilot) and need a rewrite in the balance pass. That reaches 81%.
6. **90% by item count is not reachable without cutting perks whose whole point is a true answer from the Narrator**
   (Twin Souls' question, Case File, Communion, a family favour). The honest ceiling is about 81%. But the rule you
   wrote, "the Narrator is asked for judgement only, never for a rule", **can be met at 100%**: after this work no
   perk or trait asks the Narrator to run a rule. See question 2 in section 8.
7. **The game has two answers to "who runs this?" and they disagree on 34 of the 180 items.** One is the label in the
   data; the other is the badge the character sheet shows ("Engine runs it / Both / Narrator rules it"), which the
   engine works out by itself. Section 7, finding 1.

## 2. The counts

### By group

| Group | What it means | Perks | Traits | Total |
|---|---|---|---|---|
| A | Already engine-run in practice: relabel | 8 | 11 | 19 |
| B | The engine can take it with what it already sees: small work | 3 | 8 | 11 |
| C | The engine can take it once one missing piece exists: medium work | 0 | 2 | 2 |
| D | Split: a rule for the engine, one judgement for the Narrator | 17 | 23 | 40 |
| E | Judgement by nature: stays with the Narrator | 5 | 1 | 6 |
| F | Does nothing or nearly nothing as written | 1 | 1 | 2 |
| | | 34 | 46 | 80 |

### The engine's share, before and after

| Stage | Engine-run | Leaning on the Narrator | Engine share of 180 |
|---|---|---|---|
| Today (the labels) | 100 | 80 | 56% |
| After relabelling group A | 119 | 61 | 66% |
| After the work in groups B and C | 132 | 48 | 73% |
| After the twelve card rewrites in group D, if you approve all of them | 144 | 36 | 80% |
| After Cultured and Ace Pilot are rewritten as plain rules | 146 | 34 | 81% |

The 34 left at the end are 28 splits and 6 whole-Narrator items. The "narrator" label drops from 16 items to 6.

If you answer "no" to question 1 (colour does not count as engine-run), group A is 8 instead of 19, and every row
above is 11 lower: 60%, 67%, 74%, 75%.

### A second measure: by line of effect

Each card is stored as a list of effect lines (552 lines across the 180 perks and traits). The engine reports who runs
each line. Today:

| | Effect lines | Run by the engine | Left to the Narrator | Engine share |
|---|---|---|---|---|
| Perks | 244 | 217 | 27 | 89% |
| Traits | 308 | 248 | 60 | 81% |
| Both | 552 | 465 | 87 | 84% |

So by the line the engine is already at 84%. The label count (56%) understates it because one Narrator line makes a
whole card "hybrid".

## 3. How I read "leans on the Narrator"

A card can leave three different things to the Narrator. I treated them differently, and question 1 in section 8 asks
you to confirm it.

1. **A ruling.** A number on the card cannot apply until the Narrator says yes or no, or marks something ("is this
   threat specific enough?", "did you cross your line?", "is this check for your sibling?"). The item is a split.
2. **The payoff itself.** The player uses the perk to get something only the Narrator can give: a true answer, or how
   a fooled or befriended person now behaves ("who really holds the power here?", "people accept your false name").
   If the Narrator said nothing, the player would get nothing. The item is a split, or whole-Narrator.
3. **Colour.** A standing fact about how the world treats you, with no number on it ("some humans won't talk to a
   machine", "people who met the mask don't know the face"); a story hook ("collectors turn up when the Narrator
   decides"); an optional lever ("the Narrator may knock your glasses off"); a roleplay line ("you tell them, at
   length"). Every rule on the card works with no Narrator at all. **I counted these as engine-run** (group A). The
   traits already keep a separate "narrator hook" line in the data for exactly this.

## 4. Group A: already engine-run in practice (19). Recommendation for all: relabel "engine"

**DONE (11 Nov 2026): all 19 are labelled "engine".** See section 13.

The last column says what, if anything, is still the Narrator's. "Nothing" means the card needs no Narrator at all.
"Colour" rows are the 11 that depend on question 1.

| Name | Kind | What it does | Why it is already the engine's | Left to the Narrator |
|---|---|---|---|---|
| Into the Dark | Perk | First step onto unseen ground: no ambush against you; Tier II no Fear in round 1 | The engine tracks the ground the squad has seen and cancels the ambush bonus and the Fear itself. | Nothing |
| Blueprint | Perk | Sketch the ground: +1 or +2 Movement on the first turn of the next fight | All of it runs by itself. | Nothing |
| Talks Broke Down | Perk | +2 AP a turn after a won talk, −2 after a lost one | The engine remembers the last talking check and counts the fight as "out of a talk" when it starts within one story round of it. The card's sentence "The Narrator decides whether the talk caused the fight" should become that timing rule; the Narrator can still overrule. Also one of the AP perks waiting for your 3-turn cooldown. | Nothing, once the card says so |
| Just the Repairman | Perk | With a toolbox, 50% to be taken for staff when spotted | The engine rolls it, in a fight and on the area map, and remembers who was fooled. | Nothing |
| Verse of War | Perk | "In verse" on an Outburst: +1 tile, +10% damage | The engine applies both. The Narrator's check "that your lines really were verse" has no consequence anywhere in the game. This row assumes you drop that sentence (question 9); if you want bad verse to cost something, it is a split. | Nothing, if the sentence goes |
| War Footing | Perk | A failed threat costs nothing; an enemy ending its move next to you loses 2 AP | Both run by themselves. The Narrator is only told not to narrate a backfire. Also an AP swing: see the cooldown ruling. | Nothing |
| Foreseen | Perk | Once a session: the table votes to rewind a decision | The engine runs the vote and the whole rewind. It is labelled "narrator", which is simply wrong. | Colour: retelling what was undone |
| Make Way | Perk | No opportunity attacks; bystanders do not block your path | Both halves run by themselves. | Colour: "crowds part" |
| Mind Without Fog | Trait | +2 Attribute points; Heart debuffs never take; Karma never moves | All engine. Two notes in section 7 (stale data line; the gear downside has nothing to cancel today). | Nothing |
| Sigil Savant | Trait | One word free to draw; only practised words mid-mission | All engine: it refuses an unpractised word itself. The data still lists that rule as the Narrator's. | Nothing |
| Grenadier's Arm | Trait | +2 throw range; throw a person or an object; throws cost 1 AP more | All engine, including damage by weight. | Colour: throws in the pure story |
| Blade Recluse | Trait | A named weapon: cannot be Disarmed, extra mod slot, faster mastery; −1 on three talk skills | All engine. | Colour: "you tell them at length" |
| Bottle Butts for Eyes | Trait | Glasses give +1, lose −4 without; a critical to the head knocks them off | All engine. | Colour: "the Narrator may knock them off in the story" |
| The Mask | Trait | +2 masked, −3 bare | All engine. The engine tells the Narrator which face you show now. | Colour, the heaviest in this group: who has met which face. The engine could keep that list for the Narrator (one small job, not counted above). |
| Factory Made | Trait | Immune to poison, Bleeding, suffocation; self-repair; heals at half; lightning double | All engine. | Colour: "some humans won't talk to a machine" |
| Upper-Touched | Trait | Outbursts 20% cheaper; senses upper-realm beings; a d6 on every Blessing | All engine, the d6 table included. | Colour: on a 6, "a voice from above" |
| Gambler | Trait | Double or Nothing once a scene | All engine. | Colour: the debt collectors |
| Crowded Head | Trait | 4 voice lines a beat; Ask twice; resisting Overreach costs 1 more Echo | All engine. | Colour: "once a session the Narrator may twist a line" |
| Drone Handler | Trait | A drone with 30 HP and 3 AP; Shaken if it dies | All engine. | Colour: what the drone sees beyond the map |

## 5. The other groups

### Group B: the engine can take it with what it already sees (11). Small work

Four of these share **one** piece of work, called "labels" below. Places already work: a check reads the labels of the
place it happens in (in the city, open ground, ruins) by itself. People do not: a person on the map carries labels
(military, official, underworld, prisoner, hunter), and a check knows who it is aimed at, but the engine does not put
the two together, so the Narrator has to repeat the label on every check. The engine should read it from the person.

| Name | Kind | What it does | What the engine would watch, and what it would do |
|---|---|---|---|
| Lab Coat | Perk | +3 on saves against chemicals you have identified; Tier II neutralise | Watch: a save against gas, a toxic spill or a drug condition. Do: record "identified" itself when you Analyze the source or find the hazard (today the Narrator records it), then add the +3 with no Narrator mark. The fight half already works this way for an enemy you Analyzed. |
| The Name They Whisper | Perk | Fight start: enemies who know you save or are Afraid; hurt enemies may surrender | Rule **(proposed)**: everyone knows your name unless the campaign or the Narrator gave them a "stranger" label. Do: skip the Fear for strangers. Today it borrows the "caught unaware" label, which also costs that enemy its first turn: a bug (section 7, finding 2). |
| Cold Read | Perk | Analyze also tells you what the person wants most | Watch: a person on the map can already carry a "wants" line, written when they were placed. Do: show that line privately on Analyze. Ask the Narrator only when the line is empty, and keep the answer. |
| Machine-Faced | Trait | Composure in a talk always succeeds; no Charisma or Insinuation in a talk | Watch: whether the check uses a talking skill (the engine already has this test for Talks Broke Down). Do: apply both halves without the Narrator's "dialogue" mark. Robots, children and animals reacting to you is colour. |
| Rabbit's Foot | Trait | Once a session an enemy hit on you is rerolled; +2 AP when an ally drops | The fight half is engine. Out of a fight the card asks the Narrator to reroll "a roll made against you", but in the story the rolls against you are your own saves, which the engine rolls. Do: reroll one failed save **(proposed wording)**. |
| Lowland Born | Trait | +1 Movement in ruins and city; "the Narrator tells you one way out" | Watch: the exits a campaign area already has on its map. Do: mark the nearest one for you when you enter ruins or city ground. (An area the Narrator makes up on the spot has no exits drawn; there the Narrator still says it.) |
| Central City Kid | Trait | +2 with officials and merchants; −2 AP on first wound; −2 Guts outside the city | Labels. ("Merchant" has to be added to the labels a person can carry. "Outside the city" already works by itself.) |
| Wanted | Trait | +2 Intimidation with the underworld; officials hostile | Labels. The bounty hunters are a story hook. |
| Beast Handler | Trait | A beast with 60 HP and 4 AP that obeys on an Empathy check | All but "it can't enter most buildings in Central City". Do: a "no beasts" label on a place; the beast waits outside. |
| Heretic | Trait | Pray to any patron on Will Power; allies' Blessings fail on 1–2; every faith-based faction is hostile | Everything runs except the last clause: the engine sets only the Lumeri Church hostile and leaves "which other faiths count" to the Narrator. Do: set every faith-based faction hostile at the start. Needs your list of which factions those are (question 13). |
| Born Officer | Trait | Command an ally for 1 AP; allies lose 1 AP when you are down or out of sight; Leadership one step higher; orders from others take a Composure check | Command and the AP loss run. Two clauses do not. (1) "Leadership counts one step higher": the game has Leadership ranks (Unfit, Squad, Platoon, Command, from Authority) and moves that require one, but nothing reads the trait. Do: count the rank one higher wherever a rank is asked for. (2) The Composure check fires only when another Born Officer commands you, at target 12; the card gives no target and says "anyone else". Do: fire it at target 12 whenever a squadmate's Command orders you (question 14). |

### Group C: one missing piece (2). Medium work

| Name | Kind | What it does | What is missing |
|---|---|---|---|
| Gun Nut | Trait | Extra mod slot, free jam clear, names any gun; the first 3 guns are a collection you can't part with | The upside runs. The downside (a Dexterity check, target 12, to sell, drop or give away a collection gun) is not enforced: the engine has no "you are parting with this item" event. Dropping exists, giving and selling do not. Half-price selling waits for shops. |
| Ghost Soldier | Trait | First ambush each fight +50% and silent; a prosthetic arm that takes mods; rest check; −2 AP when found | All of it runs except two things. (1) "Makes no sound": small; treat that one attack as made with a silent weapon, a rule the engine already has. (2) The arm's mods: you can fit two, and then the game tells the Narrator "rule what it does there". That is a rule nobody has written, not a judgement. It needs one from you (question 15). |

### Group D: split (40)

The rule half named here **already runs in the engine** unless the row says otherwise. The last column is the one
sentence the card would carry. Rows marked **(rewrite)** are the twelve that could go fully to the engine if you accept
the proposed change; question 3 asks you about them one by one.

**Perks (17)**

| Name | What it does | The engine's part | The one sentence for the Narrator |
|---|---|---|---|
| Bone Talk | A threat: Shaken in a fight; a true answer or Shaken in the story | The fight form whole (2 AP, Heart save). Shaken carries from the story into a fight. | "The Narrator decides whether your threat is specific enough, and plays the answer." |
| Sleight of Hand | Plant an item unseen | Grenades and trackers whole | "The Narrator decides what any other planted item leads to." |
| Footnote **(rewrite)** | Cite a fact: allies +1 or +2 | The fight form whole | "The Narrator decides which rolls act on the fact." Engine-only version **(proposed)**: "each ally's next roll this scene". |
| Mirage **(rewrite)** | 2 AP: a false wall, figure or sound that enemies may believe | In a fight, whole: the engine rolls every enemy and makes believers stop, shoot the figure or walk to the sound. Outside a fight it rolls who is fooled, and stops there. | "Outside a fight, the Narrator plays what the fooled people do." Engine-only version **(proposed)**: outside a fight, a watcher who believes it does not notice the squad until the round ends. |
| Detective's Eye **(rewrite)** | A detail out of place each scene; a trap or weak point at fight start | The fight-start half | "In every scene the Narrator tells you one detail that is out of place." Engine-only version **(proposed)**: on entering an area, one hidden trap, hazard, cache or lurking enemy is revealed to you; the Narrator adds a detail only when there is none. |
| Crowd Pleaser | One roll at +2 for a whole crowd; Tier II turn the crowd on one person | The fight half whole. Outside a fight the +2 runs once the check is marked "crowd"; the engine could mark it itself where there is a map: 3 or more listeners within 8 tiles **(proposed: the numbers the fight half already uses)**. | "The Narrator plays what the crowd does to the person you name." (Tier II's whole payoff.) |
| Double Meaning **(rewrite)** | A sentence with a hidden instruction: squad +2 | The fight form whole | "The Narrator decides which roll you hinted at." Engine-only version **(proposed)**: "the squad's next roll this round". |
| Old Tongue | Read any old script; Tier II a being parleys once | Reading always succeeds; the being holds its turn; once per being | "The Narrator tells you what the script says, and plays the parley." |
| Red Line | Name a line; +1 or +2 on Heart saves while it holds | Naming, the bonus, the wait until next session | "The Narrator decides when you cross your line." |
| Clean Hands **(rewrite)** | A shield when you spare or protect | In a fight whole (the Spare switch, surrenders, healing or shielding an innocent) | "Outside a fight, the Narrator decides what counts." Engine-only version **(proposed)**: outside a fight only acts the engine sees count (healing or carrying a wounded bystander, letting a prisoner go). |
| Closing Argument | Listeners accept your logic; an Eloquence check on it succeeds | The automatic success, the use | "The Narrator decides who is ruled by fear or faith, and what the rest do about it." |
| Everyone's Friend | One person treats you as a friend; first lie succeeds | The friend record, the automatic first lie, refusing someone hostile | "The Narrator plays them as a trusted friend." |
| Their Own Idea | A hidden suggestion the listener acts on | The use, the Heart save of an important listener, refusing a Celestial | "The Narrator decides whether it would harm them, and plays how they act on it." |
| True Name | Once a session: the named being takes +50% damage from your side and can't lie to you | The +50%. "Have you studied it?" can also go to the engine: you have Analyzed it **(proposed meaning; question 4)**. Today the Narrator confirms it in a note that is only read after the fight, when the damage is already dealt. | "The being cannot lie to you this scene; the Narrator plays it so." |
| Twin Souls | A third school on an Outburst; one true answer a session | The third school whole | "Once a session the Narrator answers one question truthfully." |
| The Voice **(rewrite)** | Once a session: rank-and-file enemies save or obey | The five set orders whole | "The Narrator decides what any other order does." Today an order in your own words is silently run as "halt". Engine-only version **(proposed)**: only the five set orders. |
| Every Lie Is a Door | Walk into a guarded place on a stated reason | Guards stop noticing you; it ends when a fight starts or the scene ends | "The Narrator decides how far the lie carries, and plays the people you meet." |

**Traits (23)**

| Name | What it does | The engine's part | The one sentence for the Narrator |
|---|---|---|---|
| Right of Way | +2 against anyone who blocks or interrupts you; can't be Shoved; slower | Everything but who counts as blocking | "The Narrator decides when someone is blocking or interrupting you." |
| Holo-Drama Addict | +3 once a scene; a Visualization check before anything unglamorous | The fight form; the check itself | "The Narrator decides whether the drama sells, and what is unglamorous." |
| Oil in My Mind | Read any artwork; +1 on three skills, −1 on three | All the numbers, Masterpiece | "The Narrator tells you who made it, how, and where it came from." |
| Oil in My Soul | Read any artwork's feeling; +1 on three skills, −1 on three | All the numbers | "The Narrator tells you what its maker felt and meant." |
| Heavyworlder **(rewrite)** | One size larger, can't be Shoved, double carry; easier to hit, can't hide in light | All of that | "The Narrator decides which small spaces can't take you." Engine-only version **(proposed)**: a "tight" label on doors, exits and approaches that refuses you. Double rations has no system. |
| Symbol of Order | Lawful Karma; once a scene an official answers truthfully | Karma; the use. With the labels work the engine can also refuse the use when no official is there. | "The Narrator plays the official's true answer." |
| Rogue Element **(rewrite)** | Chaotic Karma; 1 Echo once a scene for wrecking something | In a fight (breaking an object) | "In the story the Narrator decides whether it counts." Engine-only version **(proposed)**: only wrecks the engine sees count (an object broken, a device or trap sabotaged on the area map). |
| Daggerfall Veteran **(rewrite)** | Fear immunity; shake off a Heart debuff; see the enemy's next move; flashbacks | All of it in a fight | "Outside a fight the Narrator tells you truthfully how the enemy will move." Engine-only version **(proposed)**: the question works in a fight only. |
| Raised by Orks | +20% melee; Orks won't attack first; can't read | All but which checks need reading | "The Narrator decides which checks need reading, and who knows your history." |
| Sworn Sibling **(rewrite)** | Shared AP next to your sibling; −2 on rolls not for them while they are down | The fight half whole. In the story the −2 runs, and lifts when the Narrator marks a check "for your sibling". | "The Narrator decides which checks are for your sibling." Engine-only version **(proposed)**: a check counts when it is aimed at your sibling. (Narrower than the card: breaking down the door between you would not count.) |
| Company Man | RTC prices; once a campaign an extraction | The extraction in a fight (you leave, no XP) | "The Narrator decides where you land and what the Company wants for it." Labelled "narrator" today. |
| Cold Case | Analyze 1 AP cheaper; one true yes-or-no a session; −1 off the case | The discount, the −1 | "The Narrator opens and closes your cases, and answers the question." |
| Interrogator | +2 alone with a captive; a broken captive's true answer | The +2 (the "alone with a prisoner" part can come from labels) | "The Narrator plays the captive's answer, and decides who knows your trade." |
| Trench Poet | Verse: Confused, allies +1 Composure; plain answers are hard | Verse whole, in a fight and in the story | "The Narrator calls the Eloquence check when you must answer plainly." |
| Grudge Bearer **(rewrite)** | Longer debuffs; −2 on rolls not aimed at whoever wronged you | Spite whole; the −2 once someone is marked | "The Narrator marks whoever wrongs you, and says when you are even." Engine-only version **(proposed)**: the grudge opens on whoever Downs you and closes when they are dead or have surrendered. |
| Market Blood | Buy −20%, sell +20%; price any item; gifts are hard | Pricing what is in your pack | "The Narrator prices anything else, and calls the check when you give or take a gift." |
| Cover Story | A false identity that holds until you fail a roll in front of someone | Setting the name, and the count of burned identities to 3. The engine can also take the burning: a failed check while anyone on the map can see you (small work; today it asks the Narrator each time). | "People accept your false name; the Narrator plays them so." Labelled "narrator" today. |
| Inner Ring Heir | Triple funds; a family favour a session | The use of the favour. Triple funds does nothing today (see finding 16 on money). | "The Narrator decides what the family's favour gets you, and what it asks in return." Labelled "narrator" today. |
| True Believer | Shorter Blessing cooldowns; a small miracle a session; daily rites | The cooldown; the −1 to −3 once days are counted | "The Narrator grants the miracle." (Counting missed rites could go to the engine: it already counts days and knows when a rite is done.) |
| Heaven's Faithful | +2 Outburst range; a riddle answer each scene; a Faith check against upper-realm foes | The range, the check and its −2 AP | "The Narrator answers in riddles, truthfully." |
| Occultist | A grimoire: a creature's weakness; ward an area | The uses | "The Narrator names the weakness and says what the ward keeps out." Labelled "narrator" today. |
| Crawler-Blooded | Chitin; Crawlers won't attack first; Lumeri Blessings burn | All of that | "You climb walls where the Narrator allows it." (The game has no climbing.) |
| Moon Hunter **(rewrite)** | Follow a trail; +30% on your first attack on what you tracked | The +30% whole | "The Narrator tells you where the trail leads." Engine-only version **(proposed)**: Track points you to the nearest lurking enemy on the map. |

### Group E: judgement by nature (6). They stay with the Narrator whole

For each I looked for anything the engine could watch in its place, and found nothing honest.

| Name | Kind | What it does | Why no trigger can stand in for it |
|---|---|---|---|
| Bedside Manner | Perk | Touch someone: is their next line a lie? | Only the Narrator knows whether the person it is playing is lying. The engine stores no truth mark on what people say. |
| Burden of Proof | Perk | Demand evidence: without it they lose the argument | Whether the accuser has evidence is a fact of the story, not of the map. |
| Real Power | Perk | Who really runs this organisation? | The answer is world content the Narrator invents and must keep consistent. |
| Established Fact | Perk | Once a session a stated fact becomes true | Whether it contradicts what was shown is exactly a judgement. |
| What Could Be | Perk | Once a session a vision of the best outcome | A forecast of the story can only come from whoever runs it. |
| Worldline Fracture | Trait | Impossible events replace the normal ones, if the whole squad has it | It is a campaign mode. The engine only says whether it is on. (It could go to the engine only if every campaign area shipped a second set of events; that is content, not code.) |

### Group F: does nearly nothing as written (2). Rewrite in the balance pass

| Name | Kind | What it does | Why |
|---|---|---|---|
| Cultured | Perk | +1 on Ingenuity and Charisma when the talk turns to art | A combo perk (two skills at 5 plus a deed) that pays +1 on two skills, only when the Narrator decides the topic fits. The weakest reward for the highest price on the list. |
| Ace Pilot | Trait | Drive anything; vehicles +1 Movement; slower after a day on foot | The game has no vehicles. The only part that can happen is the penalty, and only when the Narrator switches it on. |

## 6. The 19 combo perks' deeds

Section 11 of the balance pass gave a first reading: 14 the engine can own, 5 the Narrator keeps. Checked against the
code: **14 stands, but of the other five 4 are the Narrator's and 1 is a split, and four of the first reading's
details were wrong** (marked "Correction" below).

**Where this stands.** In the game you play today every deed is recorded by the Narrator. While this document was
being written, the **nine deeds that happen in a fight were built** in the same stage of work (not yet merged, not yet
live): the engine watches them and grants the perk when the deed is done. Their exact conditions are written in the
spec ("Deeds the engine sees") and are all provisional (spec item 1014). The table below quotes those for the nine and
does not propose different ones. The five deeds that happen outside a fight are not built; their rows are proposals.

| Combo perk | The deed | State | What the engine watches |
|---|---|---|---|
| Charge! | Open a fight by charging the enemy line, and win it | Built | On your first turn, before anything but moving, you run 3 or more tiles in a straight line and end next to an enemy; and the fight is won. |
| Field Surgeon | Bring a squadmate back from below 10% HP | Built | Your healing gets a Downed ally up, or lifts a standing ally from under 10% of max HP to 10% or more. |
| Dance of Iron | Dodge three attacks in one round | Built | Three enemy attacks at you miss in one round, while you are on your feet. |
| Between Heartbeats | Come through an ambush without being hit | Built | The fight opened with an enemy Hidden and nobody of yours Hidden; nothing an enemy did hit or hurt you; you end it on your feet; the fight is won. |
| Siege Engine | Break through a wall to win a fight | Built | You destroy a door or a piece of full cover that blocks the way, and the fight is won. |
| Twin Souls | Survive a Mana Short | Built | You have a Mana Short in a fight and are alive when it ends. A Mana Short cannot kill by itself, so the deed is "have one"; but every character who can earn this perk refuses the first Short of each fight, so in practice it is the second. |
| Bite the Bullet | Fight a whole combat below a quarter of your max HP | Built | From the start of your first turn to the end of a won fight of 2 rounds or more you are never at 25% of max HP or above, and you end it standing. Starting the fight already hurt counts. |
| Fire Sermon | Convert an enemy mid-fight | Built | An enemy surrenders to your words in a fight. **Correction:** the first reading said "once speaking in a fight is built"; it is built (rules 1.14). The card says "convert" and the built reading is "surrenders", with no tie to faith: question 6. |
| The Voice | Stare down an enemy officer until they back off | Built | The same, and the enemy is an Elite or a Boss. A Boss never surrenders today, so in practice an Elite. |
| Silent Partner | Get the whole squad through a guarded area unseen | Not built; one counter | The squad enters and leaves an area that holds at least one hostile watcher, and nobody fails a stay-hidden roll there. |
| Dead Signal | Shut down a security system without anyone noticing | Not built; one counter | You disable a camera, an alarm or a turret and no alarm goes up in that area. **Correction:** these are devices on the map, not hazards. The hazards are minefield, fire, radiation, gas and collapse. |
| Just the Repairman | Talk your way past a guard who caught you | Not built; one new event | You fail a stay-hidden roll against a person, then win a talking check aimed at that same person, and no fight starts. Needs the check to name who it is aimed at every time (the same "labels" work as group B). |
| Sixth Sense | Catch someone tailing the squad before they strike | Not built; no new counting | You reveal a lurking hostile before it acts. **Correction:** the game has no "tail"; it has lurking enemies, which is the same thing on the map. |
| Make Way | Walk through a hostile crowd with no weapon drawn | Not built; one counter | **Correction:** the game has no crowd on the map. Proposed: you pass within 2 tiles of 3 or more hostile people in one scene, with empty hands, and no fight starts **(both numbers proposed)**. |
| Verse of War | End a fight with an Outburst, and say something worth remembering | **Split** | The engine sees the Outburst that ends the fight and that you spoke that turn. "The Narrator decides whether the line was worth remembering." |
| Spoon-Feed | Teach someone a Sigil | Narrator | The game has no "teach a word" action between characters. If one is ever added, this moves to the engine. |
| Cultured | Win someone over with a story, a song or a painting | Narrator | Whether art won them over is judgement. |
| Cold Read | Close a case with a confession | Narrator | What a confession is, and whether the case is closed, is judgement. |
| What Could Be | Talk someone out of a terrible choice | Narrator | What a terrible choice is, is judgement. |

**Result: 14 for the engine (9 built, 5 to build), 1 split, 4 for the Narrator.** The Narrator keeps the power to
grant any of them by hand.

## 7. Where a card and the game disagree

The text pass of 11 Nov found 118 (`docs/design/handoffs/text-pass-mismatches.md`); 19 of its numbered entries and 3 of
its closing notes touch these 80 items and are listed at the end of this section. These are **new**, found while
reading the code for this document.

1. **Two answers to "who runs this?".** The data's label and the sheet's badge disagree on 34 of 180 items (and on a
   35th, Crowd Pleaser, at Tier I only). 23 are labelled hybrid while the badge tells the player "Engine runs it"
   (among them Bone Talk, Sleight of Hand, Twin Souls and The Voice, where a Narrator part really exists, so the badge
   over-promises). 6 are labelled engine while the badge says "Both" (The Old Blood, Old School, Insomniac, Chain
   Smoker, Slicer, Demolitionist: outside these 80, not read here). 4 are labelled narrator while the badge says
   "Both" (Company Man, Cover Story, Inner Ring Heir, Occultist). 1 is labelled hybrid while the badge says "Narrator
   rules it" (Closing Argument). One of the two should be made from the other.
2. **The Name They Whisper uses the wrong label.** To exempt someone who "has never heard of you", the Narrator must
   mark them "unaware". The same mark means "caught unaware: no turn in round 1". So a stranger to your name also
   loses their first turn, and a guard you surprised is also immune to your name.
3. **True Name's judgement comes too late in a fight.** The +50% damage starts at once; the Narrator's "have you
   studied it?" is a note read after the fight.
4. **Verse of War's audit does nothing.** The card says the Narrator checks your lines after the fight; nothing
   happens whatever it finds.
5. **The Voice with your own words always means "halt".** The card says the Narrator decides what another order does.
   The engine holds the enemies in place and tells the Narrator afterwards.
6. **Double Meaning II: the button and the card use different words for the same thing.** Card: the nearest other
   enemy loses 2 AP on its next turn. Button: it "loses its first action". Game: it loses 2 AP and then acts with
   what is left, as the card says. Only the button's wording needs fixing. (The first reading of this document said
   the game was stronger than the card; it is not.)
7. **Old Tongue II is stronger than its card.** Card: the being holds its attacks on its next turn. Game: it loses the
   whole turn, movement included.
8. **Mirage's button still says "Acuity check".** The card was corrected in the text pass (enemies roll against your
   Visualization); the button and its preview line were not.
9. **Talks Broke Down.** Card: the Narrator decides whether the talk caused the fight. Game: when the Narrator says
   nothing, the engine decides by timing (a talk in this story round or the one before).
10. **Heretic.** Card: every faith-based faction is hostile. Game: only the Lumeri Church is set hostile; the rest is
    left to the Narrator (group B).
11. **Rogue Element.** Card: Lawful factions start hostile. Game: nothing is set; Wanted and Heretic do set theirs.
12. **Born Officer.** Card: taking an order from anyone else takes a Composure check (no target given). Game: only
    another Born Officer's Command triggers it, at target 12. "Your Leadership rating counts one step higher": the
    game has Leadership ranks, but nothing reads the trait (group B).
13. **Beast Handler.** The card gives no target for the Empathy check each turn. The game uses 8.
14. **Gun Nut's downside is not enforced** (group C).
15. **Cold Read fires more often than its card.** Card: when you Analyze someone. Game: also after every successful
    Acuity check in the story, each time asking the Narrator for a line.
16. **Card clauses with no system behind them** (they do nothing until the system exists): prices and funds (Market
    Blood, Company Man, Gun Nut's half price, Inner Ring Heir's triple funds: there are no shops, and the only money
    in the game is a provisional credits account that one class's Company moves spend; none of these traits touch
    it); vehicles (Ace Pilot); climbing (Crawler-Blooded); rations (Heavyworlder); gear that raises a skill (Mind
    Without Fog's downside has nothing to cancel today).
17. **Ghost Soldier's arm mods have no rule.** You can fit two mods into the prosthetic arm; what a fitted mod does is
    handed to the Narrator (group C).
18. **Stale lines in the data** (the card and the game agree; the stored effect line is behind): Heavyworlder's
    one-handed heavy weapons and Sigil Savant's practised words are listed as the Narrator's but the engine runs them;
    Bone Talk, Footnote and Double Meaning carry no AP cost or use limit for their fight forms.
19. **Leftover Narrator hints on engine-run items.** Into the Dark, Just the Repairman and Make Way still send the Narrator a line each turn about something the engine now handles or that is pure colour. They
    should go when the items are relabelled, so the Narrator's brief gets shorter.
20. **The perk audit's finding 1 looks out of date.** It says Established Fact, Closing Argument, Their Own Idea and
    Occultist "change nothing" in a fight. Since rules 1.14 they open an attempt that the Narrator answers at once,
    and a no gives the use back. The audit was not run again for this document. Its finding 3 (Company Man showing
    "free") is fixed in the code.

From the text pass, still open and touching these 80: numbers 36 (Mind Without Fog), 39 and 49 (Bone Talk), 50
(Footnote, Double Meaning, Crowd Pleaser, Detective's Eye, Old Tongue), 51 (Mirage), 52 (The Name They Whisper), 54
(Foreseen), 58 (Into the Dark), 63 (Crawler-Blooded), 64 (Company Man), 65 (Rabbit's Foot), 66 (Trench Poet), 67 (Oil
in My Soul), 68 (Lowland Born), 71 (Grudge Bearer), 74 (Sworn Sibling), 76 (True Believer), 77 (Upper-Touched), 78
(Symbol of Order, Rogue Element), and the three notes on Blueprint, Ace Pilot and the generic effects.

## 8. Questions only you can answer

Each is a yes or a no, with my recommendation, so a word is enough.

1. **Does "colour" count as engine-run?** (Section 3, kind 3: standing facts about how people treat you, story hooks,
   "the Narrator may…", roleplay lines.) *Recommendation: yes.* It decides 11 of the 19 in group A (the rows marked
   "Colour"). If no, group A is 8 and the 11 become splits.
2. **May the 90% target be restated as "no rule is ever left to the Narrator"?** By label the share tops out near 81%
   unless perks whose point is a true answer are cut. *Recommendation: yes. Keep the three labels, and report the
   label share and the effect-line share beside the new target.*
3. **The twelve rewrites in group D.** Each makes the card a little narrower and takes the Narrator out of it.
   *Recommendation: yes to six: Footnote, Double Meaning, The Voice, Daggerfall Veteran, Grudge Bearer, Rogue Element
   (each loses little). No to six: Detective's Eye, Clean Hands, Heavyworlder, Moon Hunter, Mirage, Sworn Sibling
   (the Narrator half is part of the charm, or the engine-only version is clearly narrower than the card).* If you
   follow this, the final share is 78% instead of 81%.
4. **True Name: does "studied" mean "you have Analyzed it"?** *Recommendation: yes.*
5. **Crowd Pleaser: is a crowd 3 or more listeners within 8 tiles outside a fight too?** *Recommendation: yes.*
6. **Fire Sermon's deed.** The card says "convert an enemy mid-fight"; the built reading is any enemy who surrenders to
   your words. Should it also require that you are Faithful? *Recommendation: yes, add "while you are Faithful"; a
   sermon from an Atheist is not a conversion.*
7. **The five deeds outside a fight** (Silent Partner, Dead Signal, Just the Repairman, Sixth Sense, Make Way, as
   worded in section 6, with Make Way's 3 hostile people within 2 tiles). *Recommendation: accept all five as the
   starting readings, provisional like the nine fight deeds.*
8. **The Name They Whisper's label bug** (finding 2). Fix it with its own "stranger" label as soon as the pass opens?
   *Recommendation: yes; it is a bug, not balance.*
9. **Verse of War's audit.** Drop the sentence "the Narrator checks that your lines really were verse"?
   *Recommendation: yes. A penalty for bad poetry is not fun to referee.*
10. **Clauses with no system** (finding 16). Keep them on the cards, marked "not in the game yet" on the sheet, and
    shelve Ace Pilot until vehicles exist? *Recommendation: yes.*
11. **Cultured.** Rewrite it in the pass as a plain rule worth a combo perk? *Recommendation: yes; I have not proposed
    numbers for it here.*
12. **Old Tongue II** (finding 7): the card says the being holds its attacks; the game takes its whole turn. Make the
    game match the card? *Recommendation: yes. It is a free action; taking a whole enemy turn for 0 AP is over the
    line you set for control.*
13. **Heretic: which factions are "faith-based"?** The engine needs a list to set them hostile. *Recommendation: every
    church in the Earth Sector faction draft (`docs/lore/Factions.md`); say yes and I will bring you the list to
    tick, or say "Lumeri Church only" and the card is changed to match the game.*
14. **Born Officer.** (a) Should "Leadership one step higher" mean the engine reads your rank one higher wherever a
    move asks for a rank? (b) Should the Composure check be target 12 (the number already in the game, provisional)
    and fire whenever a squadmate's Command orders you? *Recommendation: yes to both.*
15. **Ghost Soldier's arm mods.** What does a mod fitted into the arm do? *Recommendation **(proposed rule, no
    number)**: it works as if fitted to whatever weapon that hand holds. Yes or no; if no, tell me the rule you want.*

## 9. Everything proposed in this document

None is in the game. All wait for you.

**Numbers**

| # | Where | Proposed |
|---|---|---|
| 1 | Crowd Pleaser outside a fight | A crowd is 3 or more listeners within 8 tiles (the fight half's existing numbers) |
| 2 | Make Way's deed | Pass within 2 tiles of 3 or more hostile people, hands empty, no fight |
| 3 | Mirage outside a fight (only if you approve its rewrite) | A watcher who believes it does not notice the squad until the round ends |

**Rules and readings without a number:** everyone knows your name unless marked a stranger (The Name They Whisper);
"studied" means Analyzed (True Name); Rabbit's Foot rerolls one failed save in the story; the engine-only wordings of
the twelve rewrites in group D; the four other deeds outside a fight in section 6; "while you are Faithful" for Fire
Sermon's deed; the arm-mod rule for Ghost Soldier.

Numbers quoted from the game as it is (not proposed here): Just the Repairman's 50%, Beast Handler's target 8, Born
Officer's target 12, Gun Nut's target 12, Talks Broke Down's one story round, and every number in the nine built deeds
(3 tiles, 10%, three misses, 25%, 2 rounds), which are provisional under spec item 1014.

## 10. Proposed order of work

Cheapest first; within a step, what the most characters hold first (traits can be taken at creation; perks at 3
points in a skill come before Mastered, combo and Ultimate ones).

1. **Relabel group A (19 items) and make the label and the badge one thing.** No rules change. 56% to 66%. In the
   same step: fix finding 2 (The Name They Whisper), the stale data lines (finding 18) and the leftover Narrator hints
   (finding 19).
2. **Labels on people** (one shared piece of work): Central City Kid, Wanted, Machine-Faced, Beast Handler's "no
   beasts" place label, The Name They Whisper's "stranger". It also shrinks the Narrator's half of Crowd Pleaser,
   Symbol of Order, Interrogator, Sworn Sibling and Raised by Orks, and is what the Just the Repairman deed needs.
3. **The single-item small jobs:** Cold Read, Lab Coat, Lowland Born, Rabbit's Foot, Heretic (after question 13), Born
   Officer (after question 14); then the two medium ones, Gun Nut and Ghost Soldier (after question 15). 66% to 73%.
4. **Put the one Narrator sentence on each of the 40 split cards**, do the small engine jobs named in their rows
   (Cover Story's burning, True Name's "studied", True Believer's rites), and relabel the eight that are "narrator"
   today but are really splits (Detective's Eye, Old Tongue, Their Own Idea, Every Lie Is a Door, Company Man, Cover
   Story, Inner Ring Heir, Occultist).
5. **Deed detectors:** the nine fight deeds are built and wait for the merge; then Sixth Sense, the three counters
   (Silent Partner, Dead Signal, Make Way), then Just the Repairman.
6. **The rewrites you approve from question 3.** Up to 80%.
7. **In the balance pass proper:** Cultured, Ace Pilot, the AP perks' cooldown (Talks Broke Down, War Footing), and
   finding 7 (Old Tongue II).
8. **Print the counts again** (section 11 of the balance pass asks for it), with the effect-line share beside the
   label share.

## 11. What this document did not do

1. It changed nothing: no label, card, rule, number or code.
2. It read the 80 hybrid and narrator items only. The 100 items labelled "engine" were not re-read; finding 1 shows at
   least 6 of them have a Narrator part.
3. It did not play any of these in a fight or in the browser. Everything here is from reading the cards, the code and
   the two earlier reports. The badge and effect-line counts were recomputed from the engine and match.
4. It did not read the generic rules behind plain skill bonuses line by line (the text pass left the same gap).
5. It did not cost the work in hours, and did not measure how often each perk or trait is actually taken: there is no
   play data yet.
6. Class moves, Calls, Blessings and conditions also carry the same label. They are outside this job.
7. It did not test the nine built deed detectors; they belong to other work in the same stage.

## 12. What the second reading changed

| Item | Was | Now | Why |
|---|---|---|---|
| Mirage | A, already engine | D, split (rewrite offered) | Outside a fight the engine only rolls who is fooled; what they then do is the whole payoff and is left to the Narrator. |
| Heretic | A | B, small work | "Every faith-based faction is hostile" is a rule the engine runs for one faction only and hands the rest to the Narrator. |
| Born Officer | A | B, small work | Two clauses of the card are run by nobody: the Leadership step and the Composure check for orders from others. |
| True Name | B | D, split | "It can't lie to you" is a promise only the Narrator can keep. "Studied" can still go to the engine. |
| Crowd Pleaser | B | D, split | Tier II's whole payoff (turning the crowd on someone) is played by the Narrator. |
| Cover Story | B | D, split | People believing the false name is the payoff and is played by the Narrator. The burning can still go to the engine. |
| Sworn Sibling | B | D, split (rewrite offered) | "Is this check for your sibling?" is a ruling that gates the −2. "Aimed at your sibling" is narrower than the card. |
| Ghost Soldier | B | C, medium work | Besides the silent strike, the arm's mods have no rule at all: the game asks the Narrator to invent one. |
| Inner Ring Heir | E, whole Narrator | D, split | Triple funds is a rule (it only waits for money to exist); the favour is the judgement. |

Also changed: finding 6 (Double Meaning II is not stronger than its card; only the button's wording is off), so the
old question about it is gone; the money note in finding 16 (a provisional credits account exists); two new findings
(17 and 19); the deed section, which now quotes the nine deeds as built in the spec instead of proposing them (Twin
Souls' deed is in practice the second Mana Short of a fight, not "have one"); "labels" (places already work, only
people need the job); questions 13 to 15 are new; every question is now a yes or a no.

Confirmed as the first reading had them: the other 71 group placements; the 34 label-versus-badge disagreements; the
552 effect lines and the 84%; the "unaware" bug; Old Tongue II; The Voice's free-text order; the unused gift event.

## Appendix: notes for whoever builds it

- The 80 come from the `adjudication` field in `data/perks.json` and `data/traits.json`. The handlers are in
  `packages/engine/src/perks/a.ts` to `h.ts`; the Narrator's remainder of each item is its `brief()` and its `note()`
  and `pendRuling()` calls.
- The badge and the effect-line counts come from `packages/engine/src/effects/coverage.ts` (`verdictOf`,
  `coverageReport`). Items whose handler claims "all" read as engine there even when a `pendRuling` remains.
- Labels a person can carry: `FOE_TAGS` in `packages/engine/src/tactics.ts` (no "merchant" or "stranger" yet); an
  `Npc` has `tags`, `kind`, `prisoner` (`game.ts`). A check's tags are `ck.tags` plus `zoneTags(g)` (`game.ts`,
  `rollCheck`): the place is merged in, the target (`ck.target`, a name) is not. A person's "wants" line is the
  `wants` field on the NPC (`world.ts`, `talkAsk`). Exits are `exits` on a campaign zone (`campaign.ts`), turned into
  `exit` objects.
- `enemy_action_start` with `ctx.skip` makes the enemy lose one step of its turn loop, not its turn (`combat.ts`,
  the enemy turn). Double Meaning II sets skip and takes 2 AP (net: 2 AP). Old Tongue II sets skip and AP to 0 (net:
  the whole turn).
- Leadership ranks: spec "Social" (0 Unfit, 1–2 Squad, 3–4 Platoon, 5+ Command); a move that asks for one:
  `classes/rev3.ts` (Command). Born Officer's own Composure gate is in `perks/e.ts` (`command`).
- Ghost Soldier's arm: `fit_arm` in `perks/b.ts` (`arm_mods` on the character's state; nothing reads them).
- The `gift` hook is declared in `effects/types.ts` but nothing fires it (Market Blood, Gun Nut).
- Credits: `c.state.credits` in `classes/j.ts` (provisional; the Narrator sets it).
- Deeds: the nine fight detectors are in `packages/engine/src/deeds.ts` (spec "Deeds the engine sees", item 1014).
  Hooks the other five can use: `stay_hidden_result`, `notice`, and `raiseAlarm` in `world.ts`.

## 13. What has been built (first step, 11 Nov 2026)

Built from the recommendations to questions 1, 4, 5, 6, 8, 9 and 12 of section 8 (C1, C4, C5, C6, C8, C9 and C12 in
`balance-questions.md`), because no answer had come. Each is provisional and listed in the spec (section 14, items
1101 to 1111). If you answer differently, each is one small change back.

### Ticked off

| # | What | Where in this document | State |
|---|---|---|---|
| 1 | Group A relabelled "engine": all 19 (8 perks, 11 traits). Each handler was read once more; nothing in any of them waits for a ruling. | Section 4; order of work, step 1 | Done |
| 2 | Talks Broke Down's card gives the timing rule instead of "the Narrator decides" (the Narrator can still overrule). | Section 4; finding 9 | Done |
| 3 | The Name They Whisper no longer reads "unaware". A stranger is spared: the label "stranger", or a name on the holder's strangers list. | Finding 2; question 8 | Done, with one gap (below) |
| 4 | Verse of War: the audit sentence, its note and its Narrator line are gone. | Finding 4; question 9 | Done |
| 5 | True Name: "studied" means Analyzed. The engine refuses the name in a fight, and for a being on the area map, until then. | Finding 3; question 4 | Done |
| 6 | Crowd Pleaser: 3 or more listeners within 8 tiles is a crowd outside a fight too; the engine counts the people on the area map itself. | Group D row; question 5 | Done |
| 7 | Old Tongue II: the being holds its attacks and may still move; it no longer loses the whole turn. | Finding 7; question 12 | Done |
| 8 | Fire Sermon's deed needs a Faithful character. | Section 6; question 6 | Done |
| 9 | Leftover Narrator hints removed from Into the Dark and Just the Repairman (Make Way's "crowds part" is its colour and stays). | Finding 19 | Done |
| 10 | The AP perks' cooldown, 3 turns: Grim Reaper, Got You in My Sight, Overruled!, Talks Broke Down, Sweet Talker, War Footing, Forlorn Hope, Rabbit's Foot (Vengeful). | Order of work, step 7 | Done |

### The counts now (by label, of 180)

| | engine | hybrid | narrator | engine share |
|---|---|---|---|---|
| Before | 100 | 64 | 16 | 56% |
| After the first step | 119 | 46 | 15 | 66% |

By line of effect nothing moved: 465 of 552 lines are the engine's (84%), as in section 2. The relabel changed labels,
not the stored effect lines.

### Left open by this step

1. **The label and the badge still disagree** (finding 1). 13 of the 19 relabelled items still carry a stored effect
   line marked for the Narrator (the colour lines, plus three stale ones: Verse of War's audit, Sigil Savant's
   practised words, Foreseen's rewind), so the character sheet's badge still says "Both" for them (Foreseen:
   "Narrator rules it"). Making one from the other is the rest of step 1.
2. **The "stranger" label cannot be given to an enemy yet.** The perk reads it, but the list of labels an enemy may
   carry does not hold it (that list is the "labels on people" work, step 2). Until then the Narrator spares a
   stranger through the holder's strangers list.
3. **Stale data lines** (finding 18) are untouched, and the stored effect lines of the eight cooldown items still say
   "once a turn" or nothing; only their card text and the code changed.
4. Groups B, C and D, the five deeds outside a fight, the twelve rewrites, Cultured and Ace Pilot: not started. The
   order in section 10 stands, from step 2.

## 14. The first step, reviewed (11 Nov 2026)

A second reader tried to break the first step: every relabelled handler read again, each of the six fixes checked card
against game, and the cooldown attacked through real turns. Spec: rules 1.14, "After the review"; items 1112 to 1116.

### Ticked off

| # | Checked | Result |
|---|---|---|
| 1 | The 19 relabels: is anything left for a Narrator to rule (a standing line, a note, a pending ruling, a card sentence)? | Nothing but colour. No label went back. 119 engine, 46 hybrid, 15 narrator stands. |
| 2 | Just the Repairman | Fixed: its line to the Narrator said the cover holds "until they act unlike a repairman" (a judgement nobody has). It now says what the card says: unless the character attacks. |
| 3 | True Name | Fixed: a being Analyzed on the area map was refused in the fight the Narrator then started. The holder now remembers who the squad Analyzed there. The card and both buttons say "It must have been Analyzed first". |
| 4 | Grim Reaper II | Fixed (card only): the Fear comes with a kill or knock-out on your own turn, every time; the card said "a kill of yours". |
| 5 | The Name They Whisper | Fixed (card only): it is hybrid, so the card names the judgement: "the Narrator says who has never heard of you". |
| 6 | Verse of War, Crowd Pleaser, Old Tongue II, Fire Sermon's deed | Card and game agree. Old Tongue II was played through real turns: the being holds its attacks for one turn whichever of you acts first, then fights again. |
| 7 | The cooldown, 8 items | Held against every attempt: 8 real rounds, a save and reload, a second fight, two holders, triggers on an enemy's turn, the Proving Ground's tools, a fight saved before the cooldown existed, the penalty side. Nothing was missed against the AP sources of the action price list, and the Calls and QUICKEN are untouched. |

### Found and left, because the file is not this step's

1. **An Analyze made on the area map is lost when the Narrator starts the fight.** Only a fight a player opens by
   attacking carries the mark in. True Name now works around it; Analyze itself (the squad's read of HP, Defense and
   armour, Read Them) still has to be done again. One line where the fight is started.
2. **The "stranger" label still cannot be put on an enemy** (as section 13 says): the list of labels an enemy may
   carry does not hold it. The Narrator's list on the holder is the way that works.
3. **Three stored effect lines still tell the old story** for items this step fixed: The Name They Whisper ("The
   Narrator decides who knows who you are"), True Name ("The Narrator confirms the character has studied it") and
   Verse of War ("Judge whether the player is speaking in verse"). No player sees them and the AI Narrator is not sent
   them, but they belong to the stale-lines clean-up.

### For Leon (also in the spec, item 1115)

1. Should a **penalty** be on the cooldown at all? Talks Broke Down I after a lost talk was −2 AP every turn; it is
   now −2 on turns 1, 4 and 7.
2. Two **War Footing** holders next to each other each take 2 AP from the same enemy (4 in all). Keep, or once per
   enemy move?
3. The action price list counted **free attacks and free moves** (Dance of Iron, Roll With It, Heart Overload's free
   Begin) under the 3-turn ruling. The first step left them out. In or out?
4. **Got You in My Sight** also pays when the holder is the one who walks out of an enemy's sight. With the cooldown
   that is 2 AP every 3 turns for stepping behind a wall. Should only the enemy's own move or hide count?

