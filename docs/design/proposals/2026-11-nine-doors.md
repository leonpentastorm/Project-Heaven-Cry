# The nine doors: alpha, beta and gamma across the skill web

A proposal. Written 10 Nov 2026 by the lead session, from a design talk with Leon while Physical 2.0 was being built. Nothing here is built except section 2. Every name marked *(Suggested)* is mine and is Leon's to change.

## 1. The rule

Leon, 10 Nov 2026 ("rules are rules"):

1. **Alpha** is the skill that opens a combat playstyle. Every attribute has one, so every attribute has a way to fight.
2. **Beta** carries defence.
3. **Gamma** is for world play and speech, and weighs more in skill checks.
4. **Gear follows the same rule.** What you put on to deal damage is gated by an alpha. Armour is gated by a beta.
5. **Tri-scale gear:** hybrid armour that asks for two or three beta skills and has a mechanic built for it.
6. An attribute with no way to fight gets one: a new system, or existing pieces pulled together.

## 2. What is already done

Rules 1.12, spec item 953, on the Physical 2.0 base:

- **Dexterity is Agility's alpha; Athletics is its beta.** They were the other way round.
- Light blades hit with Dexterity. Bare hands scale with Raw Power and Dexterity.
- The Critical multiplier reads Dexterity.
- Athletics keeps Dodge, its unlocks, and the saves against being pushed, pinned or stopped.

## 3. The audit: 27 skills against the rule

What a point gives today, and whether that is the right kind of thing for the slot.

| Attribute | Slot | Skill | A point gives today | Fits? |
|---|---|---|---|---|
| Endurance | α | Durability | +2 HP a level; −5% critical damage taken | **No.** Defence on an alpha, and no playstyle |
| | β | Pain Threshold | −10% elemental damage taken | Yes |
| | γ | Sensory | +10% healing and shields received | **No.** Defence on a gamma |
| Strength | α | Raw Power | +5% physical damage; Counter bonus; heavy melee and bare attacks | Yes |
| | β | Guts | Body save | Yes |
| | γ | Intimidation | Body debuff strength | See section 7, question 4 |
| Agility | α | Dexterity | throwing range; less Recoil; Critical multiplier; guns and light blades | Yes (item 953) |
| | β | Athletics | Dodge | Yes |
| | γ | Reaction Speed | −10% ambush damage taken; Initiative | **Half.** The ambush part is defence |
| Perception | α | Ingenuity | +0.5 Stealth; +5% Ambush damage | Yes, but the door is a few buttons |
| | β | Proficiency | cheaper Sigils | **No.** Feeds another attribute's system |
| | γ | Vigilant | +1 Detection range | Yes |
| Intelligence | α | Brain Power | +10% Sigil damage; Sigil duration | Yes |
| | β | Rumination | +0.5 tile Sigil range | **No.** Offence on a beta |
| | γ | Eloquence | Brain debuff strength | See question 4 |
| Expression | α | Visualization | +10% elemental damage | **No.** Feeds Sigils; no playstyle |
| | β | Analysis | +1 tile Analyze range | **No.** Not defence |
| | γ | Charisma | Brain save | **No.** A save on a gamma |
| Insight | α | Empathy | cheaper Outbursts; ready Soul designs | **No.** Feeds Outbursts; no playstyle |
| | β | Camaraderie | +10% healing and shields given | **No.** That is the support playstyle's power: an alpha's job |
| | γ | Implication | Heart debuff strength | See question 4 |
| Determination | α | Will Power | +15% Soul damage; Strain limit; module slots | Yes |
| | β | Lore Master | +0.5 tile Soul range | **No.** Offence on a beta |
| | γ | Composure | Heart save | **No.** A save on a gamma |
| Virtue | α | Faith | +10% Blessing power; prayer cooldown | Yes |
| | β | Conscience | +1 Karma on every award | **No.** World play on a beta |
| | γ | Authority | +1 Reputation on every award | Yes |

**Count:** 11 of 27 fit as they are, 12 don't, 1 half fits (Reaction Speed), and 3 depend on question 4.

Two patterns stand out:

1. **The three saves sit on three different slots.** Body save is Guts (a beta, right). Brain save is Charisma and Heart save is Composure (both gammas, wrong). By the rule all three saves belong to betas.
2. **Mind and Soul betas extend their caster's reach** (Rumination, Lore Master, Proficiency). They are the cheapest fix: the number stays and moves to the alpha, and the beta gets a defence in its place.

## 4. The nine doors

| Attribute | Alpha | Playstyle | Status |
|---|---|---|---|
| Strength | Raw Power | heavy and bare melee techniques | built (Physical 2.0) |
| Agility | Dexterity | ranged techniques, light blades | built (Physical 2.0, item 953) |
| Intelligence | Brain Power | Sigils | built |
| Determination | Will Power | Outbursts | built |
| Virtue | Faith | Blessings | built |
| Perception | Ingenuity | stealth | **new**, on pieces that exist (section 5.1) |
| Expression | Visualization | Figments *(Suggested)* | **new** (section 5.2) |
| Endurance | Durability | the shield and the wall | **pull together** (section 5.3) |
| Insight | Empathy | tending and song | **pull together** (section 5.4) |

## 5. The four missing doors

### 5.1 Perception: stealth, through Ingenuity

**What exists, as loose buttons:** Hidden and the Hide action, the Ambush multiplier, Silent weapons, Lift (Ingenuity 3), Vanish (Ingenuity 5), the Infiltrator's Sabotage, traps, Detection ranges, and the melee Opener called Ambush.

**What is missing** is a meter and a list, so that a turn spent unseen is a choice with a payoff, as a chain or a Press is.

1. **The meter: Shadow *(Suggested)*, 0 to 3, on you.** It rises while nobody on the other side sees you: a turn ended unseen, a move from cover to cover unseen, a kill that nobody saw. It falls when you are seen.
2. **Being Hidden stays the gate, as today.** Shadow is what you have built up behind it.
3. **The list, in four kinds** (about 20 entries; none duplicate a weapon technique):
   - **Slip:** moving. Pass an enemy's Detection, cross open ground, climb, leave a decoy noise.
   - **Mark:** preparing a target you can see and who can't see you. Your squad's next attack on it gains something; you learn what it carries; you learn its next action.
   - **Work:** hands. Lift, plant, rig a tile, jam a gun, cut a strap, open a lock mid-fight.
   - **Break:** spending Shadow as you are revealed. The strike that reveals you is stronger for each point; or you vanish again without Vanish's cover.
4. **It rides on weapon techniques, never replaces them.** A Break is a rider on whatever technique you attack with, so a knife thief and a silenced gunner both use it.
5. **The ladder on Ingenuity:** the list opens at 3, Shadow reaches 2 at 5 and 3 at 7.

### 5.2 Expression: Figments, through Visualization

Leon: Visualization is weak and has no base; maybe an in-world system with its own weapon; look at which class archetype we don't have.

**The gap in the roster.** We have the warrior, tank, gunner, rogue, wizard, sorcerer, priest, bard and monk. We don't have a **summoner**. (The Drone Handler is shelved.) The other gaps fit worse: an engineer overlaps Sigil turrets and walls; a psychic is what makes Crawlers special in the lore; a hacker belongs to Perception or Intelligence.

**Why it belongs to Visualization.** The skill's text is "shapes thought into images". Mana is nanobots. So: you picture a thing, and the bots build it. And the 2020 skill web already expected gear for this: Visualization's gear gates in `skills.json` are `gear:projector` and `gear:illusion`, which nothing uses yet.

1. **The instrument: the Envisor *(Suggested)*.** A third focus beside the Evoker and the Emanator. The two gloves are worn on the hand; this one is worn over the eye. Gated by Visualization.
2. **What it makes: Figments *(Suggested)*.** Solid constructs of bots, each a unit on the grid.
3. **The forms** (five to start):
   - **Double:** a copy of you that draws attacks. (Today's Afterimage, made a body.)
   - **Beast:** a fast striker.
   - **Wall:** cover you can move.
   - **Blade:** a floating weapon that holds a tile and strikes what passes.
   - **Eye:** it sees for you, and for the squad.
4. **How it plays, and why it is unlike the others:** it puts bodies on the board. A Figment has no turn of its own: you spend your AP to act through it. The summoner trades their own actions for position.
5. **The limit is attention.** You hold as many Figments as Visualization allows. Each one held costs you something each turn.
6. **Where the bots come from.** Mind magic burns mana cores, so a Figment is paid for in core charge when made, and gives part of it back if you unmake it yourself.
7. **What kills one:** damage (it has HP), your attention breaking (Stunned, Downed), or walking out of your range.
8. **A design, as Outbursts have:** a form plus one or two traits, built out of a fight and kept ready.
9. **The base in the engine:** companions that act on their owner's orders, False Image (an enemy attacks the image), Afterimage, and units with fixed action lists.
10. **The ladder on Visualization:** one Figment at 3, two at 5, three at 7.

### 5.3 Endurance: the shield and the wall, through Durability

Nothing new to invent. The pieces are scattered across three places and get pulled into one list with one meter:

- the Defender's Guard meter, Brace and Interpose (class moves);
- the shields in the off hand (buckler, riot shield, pavise);
- from the melee list being built now: Guard, Parry, Keep Back, Shove;
- from the ranged list: Head Down, Cover Me.

1. **Guard becomes everyone's meter who holds a shield**, as Momentum became everyone's who holds a blade. The Defender gets the higher cap.
2. **The list is opened by Durability.** It is the playstyle of standing in the way: taking the hit meant for someone else, holding a tile, pushing back.
3. **Durability's HP and critical resistance move to Pain Threshold** (the beta), where defence belongs.
4. **Cost:** this moves four or five techniques out of the two Physical 2.0 lists after they ship. I would not touch them before.

### 5.4 Insight: tending and song, through Empathy

Again the pieces exist: songs, the Bard's Triage, stims, shields given, Camaraderie's healing multiplier, Hand-Off.

1. **One support list opened by Empathy**: mending, shielding, lifting conditions, moving an ally, and the songs.
2. **The healing multiplier moves from Camaraderie to Empathy.** It is the power of this playstyle, so it is the alpha's.
3. **Camaraderie becomes the defence it sounds like:** what you do for the ally next to you when they are hit.
4. **Empathy stops cheapening Outbursts.** That discount moves to Will Power or goes.

## 6. Gear gates

**Today** (weapons with a requirement, and each skill's `gates`):

| Gear | Gated by | Slot | By the rule |
|---|---|---|---|
| Longbow | Raw Power 3 | α | fine |
| Spellslinger pistol, Evoker blade, grand staff | Brain Power 3 | α | fine |
| Emanator gauntlet | Will Power 3 | α | fine |
| Lumeri censer gun | Faith 3 | α | fine |
| Hellraiser servo-fist, core rifle | Proficiency 3 | β | **moves to an alpha** (Raw Power; Dexterity) |
| Bot-thread banner | Camaraderie 3 | β | **moves to Empathy** |
| Heavy armour | Durability | α | **moves to a beta** (Pain Threshold) |
| Light armour, agile gear | Athletics | β | fine since item 953 |

**The rule going forward:**

1. A weapon or a focus is gated by the alpha of the attribute it fights with.
2. Armour is gated by a beta. Ordinary armour by one.
3. **Tri-scale armour** is gated by two or three betas and has its own mechanic.

**On tri-scale: I could not find it in the 2020 files in the repo** (the EPCCG, the trait book, the two spreadsheets). I am working from Leon's one-line description. Three sketches of the shape, to be replaced by the real ones:

| Sketch *(Suggested)* | Betas | Its own mechanic |
|---|---|---|
| A breacher's plate | Pain Threshold, Guts | soaks the first hit of each round whole, then is spent until you Brace |
| A runner's weave | Athletics, Proficiency | your Dodge counts against shots from behind cover too, while you moved this turn |
| A witness's mantle | Lore Master, Conscience, Camaraderie | a condition that lands on an ally next to you may land on you |

## 7. Decisions for Leon

1. **Gamma "weighs more in skill checks": how?** Today a check is d20 + (points − 1) for any skill. Options: (a) a gamma skill adds its points, not points − 1; (b) a gamma skill rolls twice and keeps the better at Mastery 2 and up; (c) no number, and the Narrator is told to call gamma skills first. I lean to (a): one point, always on, easy to read on the dice card.
2. **Figments for Visualization: yes, or another archetype?**
3. **Shadow for Ingenuity: is a meter on you right,** or should the meter sit on each enemy (how alert it is)?
4. **The three debuff-strength skills** (Intimidation, Eloquence, Implication) are gammas whose point gives a combat number. Are they speech used in a fight (fine as they are), or offence that belongs to an alpha?
5. **The saves:** move Brain save and Heart save to betas (Analysis and Lore Master are the candidates)? Charisma and Composure then need a world-play point each.
6. **Order.** My suggestion: ship Physical 2.0; then the cheap moves in section 3 (numbers that only change skill); then stealth; then Figments; then the two pull-togethers. The balance pass comes after the ninth door, as you said it would after every Body system.
7. **Old characters and item 953:** a blade build made on Athletics now attacks with Dexterity. One-time swap of the two skills on load, or leave them?
8. **Tri-scale:** send me the 2020 notes, or tell me the real pieces, and I will replace the sketches.
