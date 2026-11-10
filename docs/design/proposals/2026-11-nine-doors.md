# Skeleton 2.0 and the nine doors: alpha, beta and gamma across the skill web

> **Skeleton 2.0** (Leon's name, 10 Nov 2026) is the skill change pass: section 13 is its full change list and wins over the earlier sections where they differ. The four new combat playstyles (section 5) come after it.

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
| Expression | Visualization | Figments *(Suggested)*, through the Visualizer | **new** (section 5.2) |
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

1. **The instrument: the Visualizer** (Leon: it is already in the lore, an Evoker for artists). The 2020 EPCCG's Visualization entry names "Projector Gear®" users and says the skill decides whether you can use gear that calls up images. A third focus beside the Evoker and the Emanator, gated by Visualization. What it looks like and where it is worn is Leon's to say.
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

## 8. Leon's answers (10 Nov 2026)

1. **Gamma in checks: yes.** A gamma skill adds its full points to a check, not points − 1. Gamma skills are also the ones called most when talking to sentient beings.
2. **Figments: yes.** The instrument is the **Visualizer**, already in the lore: an Evoker for artists.
3. **Saves go to betas: yes.**
4. **The debuff strengths and what gammas give in a fight:** to be drafted (section 9). They were a 2020 hot-fix: a friend's character with six gamma skills did nothing in a fight during a test, so debuff strength was put on three gammas. A gamma giving combat quality of life, not straight damage, is fine. Skill bonuses may move around.
5. **Old characters: don't worry about them.** A new save is started every update.

## 9. The draft: what a point gives, all 27 skills

Made from three independent drafts (move existing numbers only; what a player feels at the table; what the engine can already run) and two judges (rule-breaking; whether a six-gamma and an all-beta character are worth playing). **Every number below exists today and has only changed skill, unless it is marked NEW.**

### 9.1 Three rulings the table rests on

1. **The saves:** Body save is Guts (as now). **Brain save is Rumination. Heart save is Lore Master.** All three drafts chose the same two: each skill has just lost its caster-reach number and needs a defence, and each is the "knows better" skill of its Core.
2. **Debuff strength stops being three skills.** A condition is as strong as the modifier of the skill that delivered it. A blow, shot, spell, song or prayer reads its door's **alpha**. Words spoken in a fight read the **gamma** that spoke them: that is speech, it costs AP, and it deals no damage.
3. **A gamma adds its full points to a check.** Readings to confirm: 0 points is still −2; this is for skill checks and voice hooks only; Initiative and spoken strengths keep points − 1, so no fight number moves by accident.

### 9.2 The table

| Attribute | Slot | Skill | A point gives | Where it came from |
|---|---|---|---|---|
| Endurance | α | Durability | Opens the shield-and-guard list. Brace gives 1 + Durability modifier Guard (meter tops out at 5) | the Defender's Brace, for everyone with a shield |
| | β | Pain Threshold | −10% elemental damage taken; +2 HP a level; gates heavy armour | HP and the armour gate from Durability |
| | γ | Sensory | You sense unseen enemies within 1 + Sensory ÷ 3 tiles; may roll to find a safe path through a hazard | both already in the spec, never on the skill |
| Strength | α | Raw Power | +5% physical damage; Counter bonus; strength of what your heavy and bare techniques inflict | strength from Intimidation |
| | β | Guts | Body save | kept |
| | γ | Intimidation | Strength of your Threaten (2 AP) | kept, narrowed to speech |
| Agility | α | Dexterity | throwing range; less Recoil; +5% Critical multiplier; strength of what your shots and light blades inflict | item 953 |
| | β | Athletics | Dodge; with Guts, resists being pushed or stopped | kept |
| | γ | Reaction Speed | adds its modifier to Initiative | kept |
| Perception | α | Ingenuity | +0.5 Stealth; +5% Ambush damage; strength of what you do unseen (traps, Sabotage) | kept |
| | β | Proficiency | −5% critical damage taken | from Durability |
| | γ | Vigilant | +1 Detection range; +1 Vision range; your roll to spot the Hidden | kept |
| Intelligence | α | Brain Power | +10% Sigil damage; duration; **+0.5 tile Sigil range**; **cheaper Sigils**; strength of what your Sigils inflict | range from Rumination, saving from Proficiency |
| | β | Rumination | **Brain save** | from Charisma |
| | γ | Eloquence | Strength of your Persuade (2 AP) | kept, narrowed to speech |
| Expression | α | Visualization | +10% elemental damage, which becomes your Figments' damage; gates the Visualizer | kept |
| | β | Analysis | **−10% ambush damage taken**; +1 tile Analyze range | ambush from Reaction Speed |
| | γ | Charisma | Strength of your offer of terms (Parley, 2 AP: a beaten enemy surrenders) | from Implication |
| Insight | α | Empathy | **+10% healing and shields given**; opens the tending-and-song list | from Camaraderie |
| | β | Camaraderie | **+10% healing and shields received** | from Sensory |
| | γ | Implication | Strength of your Taunt (2 AP: it must attack you) | Taunt is a new way to talk; its numbers all exist |
| Determination | α | Will Power | Soul damage; Strain limit; module slots; **+0.5 tile Soul range**; **ready designs** | range from Lore Master, designs from Empathy |
| | β | Lore Master | **Heart save** | from Composure |
| | γ | Composure | *see 9.3* | |
| Virtue | α | Faith | +10% Blessing power; prayer cooldown; strength of what your Blessings inflict | kept |
| | β | Conscience | *see 9.3* | |
| | γ | Authority | +1 Reputation **and +1 Karma** on every award; Leadership | Karma from Conscience |

### 9.3 Where something new is needed

Two skills are left with nothing once their old point moves, and the talker still has no turn against things that can't be talked to. These are the candidates, all **NEW** and provisional. Leon picks.

| Skill | Candidate | Risk |
|---|---|---|
| Conscience (β) | +1 on your death saves for every 2 points | weak: only felt when you are already down |
| Conscience (β), other | a shield of 5 × Conscience at the start of every fight | a new number with a thin reason |
| Composure (γ) | keep unspent AP for your next turn: up to half your Composure rounded down, most 2 | AP is the strongest currency in the game; rounded up or with a cap of 3 it becomes the point everyone buys |
| Authority (γ) | Order (2 AP): an ally who hears you moves up to 1 tile a point, on their reaction | free movement for another player |
| Eloquence (γ) | Talk Sense (2 AP): an ally rolls again against one Brain condition, adding your points | a judge called this defence on a gamma |
| Charisma (γ) | Hearten (2 AP): the same for one Heart condition | the same |

The last three are what give a six-gamma character a turn against a machine or a boss: they act on allies. Without them, that character's fight is going first, seeing further, and four ways to talk at an enemy.

### 9.4 What the drafts found wrong in today's data

1. **Will Power's Soul multiplier** is +15% a point in `skills.json` and 10% in the spec and the engine.
2. **The elemental multiplier** disagrees between the spec, the engine and the data.
3. **Empathy's data line** ("−0.5 AP Soul cast") is stale: the spec and engine have a flat cost with free Pumps.
4. **Threaten** sets Shaken, a Heart condition, against a Body save.

### 9.5 Mastery unlocks that break the rule (left for the next pass)

Tuned (Proficiency: weapon damage on a beta), Weak Point (Analysis: squad damage on a beta), Proven Formula (Rumination: Sigil discount), Paint the Field (Visualization: a Sigil rider), Hand-Off (Camaraderie), Second Wind (Durability: a self-heal on an alpha), Stand Still (Composure), and the Soul module gates that sit on Lore Master, Implication and Composure.

## 10. Gamma in a fight: Calls *(Suggested name)*

Leon, 10 Nov 2026: the fight-start shield and the banked AP of 9.3 would dwarf what the other gammas give; drop them. Maybe every gamma has a social action in a fight that works on AP: give AP, order a reload that costs the other player none, support.

**Why the two were broken.** Banked AP cost nothing and paid its owner up to 2 AP every turn it was used; every other gamma line costs 2 AP to use. The shield gave raw protection from level 1, where the other betas give a percentage or a save.

### 10.1 One frame for all nine

Every gamma gets exactly one Call. All nine obey the same limits, so none can outgrow the others:

1. A Call is spoken: 2 AP, to someone who can hear you (8 tiles, as Talk is today).
2. As many Calls a turn as your AP pays for (Leon).
3. A unit can be helped by one Call a round, and hindered by one.
4. A Call never deals damage, and never hands out more AP than it cost.
5. A Call on an enemy is saved against 12 + the skill's modifier. A Call on an ally just works.
6. Every Call grows over all 10 points of its skill, on one shared ladder (10.5).

### 10.2 The nine Calls

All NEW and provisional. Names are suggestions.

| Skill | Call | On | What it does | At 7 |
|---|---|---|---|---|
| Authority | **Order** | ally | They do one thing now, on their reaction and for none of their AP: reload, stand up, pick up, or move their Movement | two things |
| Charisma | **Rally** | ally | They gain 1 AP now | and shed 1 Pressure |
| Eloquence | **Brief** | ally | Their next action this round costs 1 AP less | their next two |
| Composure | **Steady** | ally or self | Cancels 1 AP they would lose next turn (Dazed, Suppressed, an AP debt) | cancels 2 |
| Reaction Speed | **Cue** | ally | They get a second reaction this round | and act straight after you in the order |
| Vigilant | **Spot** | enemy (no save) | Points it out: the next ally to attack it this round ignores its cover, and it is no longer Hidden to them | the next two allies |
| Sensory | **Warn** | ally | The next attack on them this round, they may step 1 tile first, free | 2 tiles |
| Intimidation | **Threaten** | enemy (Body save) | Today's Shaken, and it loses 1 AP next turn | 2 AP |
| Implication | **Taunt** | enemy (Heart save) | It must attack you; its first attack on you costs it 1 AP more | 2 AP more |

**What the six-gamma character does now:** two Calls of AP's worth each turn, on allies when the enemy can't be talked to. It never adds AP to the squad in total (2 spent, at most 1 given), but it moves AP to where it matters: the gunner who needed one more shot, the downed medic who needed to stand.

**Persuade and the offer of terms** stay as ways to talk an enemy down (Eloquence and Charisma); they are not Calls and don't use the one-a-turn limit.

### 10.3 Conscience (a beta) without a new number

Split the line that is moving anyway: **Camaraderie gives +10% healing received; Conscience gives +10% shields received.** Shields come mostly from Blessings, which is Virtue's own door, so the defence sits where its attribute plays.

### 10.4 Questions

1. Is "2 spent, at most 1 given" the right ceiling, or should a Call be allowed to break even?
2. One Call a turn, or as many as your AP pays for?
3. Should Order be able to make an ally **attack**? I left it out: it would be a second attack a round for the squad's best gun.

### 10.5 Leon's answers, and the ten levels (10 Nov 2026)

1. **Every Call has 10 levels and grows with its skill.**
2. **As many Calls as you have AP for.**
3. **Order never makes an ally attack.**

**The shared ladder** (the same for all nine, so they stay comparable). All NEW and provisional.

| Points | What every Call gains |
|---|---|
| 1 | usable: 2 AP, heard within 5 tiles |
| each point | +1 tile of voice (5 at 1 point, 14 at 10); against an enemy, the save is 12 + your modifier |
| 3 | effect step 2 |
| 5 | costs 1 AP |
| 7 | effect step 3 |
| 9 | may be made as a reaction, once a round |
| 10 | your first Call each turn costs 0 AP |

**The effect steps of each Call:**

| Call | Step 1 (1 point) | Step 2 (3 points) | Step 3 (7 points) |
|---|---|---|---|
| Order (Authority) | reload, stand up or pick up | or move their Movement | two of those |
| Rally (Charisma) | 1 AP | 1 AP, and they shed 1 Pressure | 2 AP, and they shed 1 Pressure |
| Brief (Eloquence) | next action −1 AP | next two actions −1 AP each | next action −2 AP, the one after −1 |
| Steady (Composure) | cancels 1 AP of loss next turn | cancels 2 | cancels all of it, and ends Shaken or Fear |
| Cue (Reaction Speed) | a second reaction this round | and it may be a move of 1 tile | and they act straight after you in the order |
| Spot (Vigilant) | the next ally ignores its cover | and it isn't Hidden to them | the next two allies, and +1 to hit |
| Warn (Sensory) | step 1 tile before the next attack on them | 2 tiles | and that attack is at −2 |
| Threaten (Intimidation) | Shaken, −1 AP next turn | −1 AP, and it can't move toward you | −2 AP |
| Taunt (Implication) | it must attack you | and that attack costs it +1 AP | +2 AP |

**The limits that stay:** one helping Call and one hindering Call on a unit each round; no damage; the AP ceiling of 9 on any turn.

**Where it can run hot.** From 7 points Rally gives 2 AP for 1: a specialist with three allies turns 3 AP into 6 each round. That is the reward for seven points in a gamma, and the one-per-unit limit and the ceiling of 9 hold it, but it is the first number to watch in play.

## 11. The gammas' old fight numbers, moved out (Leon, 10 Nov 2026)

Leon: the Calls are the talker's tree; spread every old combat bonus the gammas had to alphas and betas, where it makes sense for a build. This replaces the gamma and beta rows of 9.2 and the saves of 9.1.

**The rule used:** a number goes to the alpha or beta of its **own attribute** first, so points in one attribute build one fighter. It crosses to another attribute only to fill a beta that would be left empty.

| Gamma | Old fight number | Goes to | Why |
|---|---|---|---|
| Reaction Speed | Initiative | **Dexterity** (α, same attribute) | acting first is tempo: offence |
| Reaction Speed | −10% ambush damage taken | **Athletics** (β, same attribute) | defence |
| Vigilant | Detection range; the roll to spot the Hidden; sensing the unseen | **Proficiency** (β, same attribute) | counter-stealth is defence |
| Vigilant | +1 Vision range | **Ingenuity** (α, same attribute) | the scout sees first |
| Charisma | Brain save | **Analysis** (β, same attribute) | |
| Composure | Heart save | **Lore Master** (β, same attribute) | |
| Intimidation | Body debuff strength | **Raw Power**, and each playstyle's own alpha | 9.1, ruling 2 |
| Eloquence | Brain debuff strength | **Brain Power**, and each playstyle's own alpha | the same |
| Implication | Heart debuff strength | **Empathy**, and each playstyle's own alpha | the same |
| Sensory | +10% healing received | **Camaraderie** (β) | crosses: Camaraderie's own line went to Empathy |
| Sensory | +10% shields received | **Conscience** (β) | crosses: Conscience's own line went to Authority |
| Sensory | sensing the unseen (1 + Sensory ÷ 3 tiles) | **Proficiency** (β) | with Detection |
| Authority | none | | |

**The nine betas after it:**

| Beta | A point gives |
|---|---|
| Pain Threshold | −10% elemental damage taken; +2 HP a level |
| Guts | Body save |
| Athletics | Dodge; −10% ambush damage taken |
| Proficiency | Detection range; the roll to spot the Hidden |
| Rumination | −5% critical damage taken (from Durability; it was going to Proficiency) |
| Analysis | Brain save; Analyze range |
| Camaraderie | +10% healing received |
| Lore Master | Heart save |
| Conscience | +10% shields received |

**The nine gammas after it:** full points on skill checks, called most when talking to someone, and one Call each (section 10). Nothing else in a fight.

**Open:** Rumination's line (critical damage taken) is the weakest fit by name. The Brain save could sit there and Analysis keep only Analyze range; I chose the same-attribute rule.

## 12. Will this pass break the skills and the perks?

Leon's worry, 10 Nov 2026. Measured against today's data:

| | Total | Read a number that moves | Tied to a gamma skill |
|---|---|---|---|
| Perks | 106 | 3 | 36 |
| Traits | 74 | 1 | 0 |
| Engine files that read the saves, debuff strengths or Initiative | | 5 | |
| Engine lines that name a gamma skill directly | | about 40 | |

So moving the numbers is small. The risk is the **36 perks that hang on gamma skills**: some give fight bonuses that, by the rule, no longer belong on a gamma. And the Mastery unlocks in 9.5.

**How to do it without breaking things:**

1. **Not inside Physical 2.0.** Its own version, after that one is live.
2. **Stage 1: numbers only change which skill they read.** No new mechanic. Before and after, print every derived number for all 46 archetype builds and read the differences; nothing should change that the table above doesn't say.
3. **Stage 2: the Calls**, as a new list like the techniques, with their own tests.
4. **Stage 3: the perks, one skill at a time.** A perk stays on its skill. Only a perk whose effect is the wrong kind for the slot is listed, and Leon decides for each: move it to the attribute's alpha or beta, or reword it as a Call rider.
5. **The engine's tests are the guard:** 1,893 today. A stage is done when they pass with only the changes the table names.
6. **A new save every update** (Leon), so no character has to survive the change.

## 13. Skeleton 2.0: every change

Rules revision 1.13, the version after Physical 2.0. Sections 9 to 12 are the reasoning; this is the list.

### 13.1 Rules

1. **The slot rule is written into the spec:** alpha opens the combat playstyle and carries offence; beta carries defence; gamma is for world play and speech.
2. **A gamma skill adds its full points to a skill check** (0 points is still −2). The Narrator is told to call gamma skills first when a character talks to a sentient being.
3. **Saves:** Body save Guts (as now); Brain save **Analysis**; Heart save **Lore Master**.
4. **Debuff strength** is the modifier of the skill that delivered the condition: the playstyle's alpha for a blow, shot, spell, song or prayer; the gamma that spoke, for words.
5. **Calls:** nine spoken actions, one per gamma, on the shared ten-level ladder (10.5).
6. **Gear gates:** weapons and foci by an alpha, armour by a beta.

### 13.2 What a point gives, all 27

| Attribute | α | β | γ |
|---|---|---|---|
| Endurance | **Durability:** Guard gained on Brace (1 + modifier) | **Pain Threshold:** −10% elemental damage taken; +2 HP a level | **Sensory:** Warn |
| Strength | **Raw Power:** +5% physical damage; Counter bonus; strength of your melee conditions | **Guts:** Body save | **Intimidation:** Threaten |
| Agility | **Dexterity:** throwing range; less Recoil; Critical multiplier; **Initiative**; strength of your shots' conditions | **Athletics:** Dodge; **−10% ambush damage taken** | **Reaction Speed:** Cue |
| Perception | **Ingenuity:** Stealth; Ambush damage; **+1 Vision**; strength of your traps | **Proficiency:** **Detection range; spotting the Hidden; sensing the unseen** | **Vigilant:** Spot |
| Intelligence | **Brain Power:** Sigil damage; duration; **Sigil range**; **cheaper Sigils**; strength of your Sigils' conditions | **Rumination:** **−5% critical damage taken** | **Eloquence:** Brief |
| Expression | **Visualization:** +10% elemental damage | **Analysis:** **Brain save**; Analyze range | **Charisma:** Rally |
| Insight | **Empathy:** **+10% healing and shields given**; strength of your songs' conditions | **Camaraderie:** **+10% healing received** | **Implication:** Taunt |
| Determination | **Will Power:** Soul damage; Syphon; Strain limit; module slots; **Soul range**; **ready designs**; strength of your Outbursts' conditions | **Lore Master:** **Heart save** | **Composure:** Steady |
| Virtue | **Faith:** Blessing power; prayer cooldown; strength of your Blessings' conditions | **Conscience:** **+10% shields received** | **Authority:** Reputation and **Karma** awards; Leadership; Order |

Bold marks a number that moved in. Every gamma also gets full points on checks. Persuade and the offer of terms stay as ways to talk an enemy down, read from Eloquence and Charisma.

### 13.3 Gear gates that change

| Gear | From | To |
|---|---|---|
| Hellraiser servo-fist | Proficiency 3 | Raw Power 3 |
| Core rifle | Proficiency 3 | Dexterity 3 |
| Bot-thread banner | Camaraderie 3 | Empathy 3 |
| Heavy armour | Durability | Pain Threshold |
| Light blades (new gate) | none | Dexterity, as guns are |

### 13.4 Data fixes that ride along (known issues 1 to 4)

Will Power's Soul damage set to the spec's 10%; one elemental multiplier everywhere; Empathy's stale line removed; Threaten saved with the save its condition belongs to.

### 13.5 What is built

1. **Spec:** the rule, the 27 lines, the saves, the debuff rule, the Calls, the gates; section 14 items for every moved and new number.
2. **Data:** `skills.json` (27 per-point lines, slots, gates), `attributes.json` and `rules.json` formulas, `weapons.json` requirements, a new `calls.json`.
3. **Engine:** the derived-stat functions read their new skills; the check roll adds full points for a gamma; one function for debuff strength by source; the Calls as a list with a preview and a use, like techniques; the enemy AI may use Threaten and Taunt.
4. **Client:** skill cards read from the data, so they follow. New: a Calls pad in the fight panel, and the Calls on the sheet. (Client lane.)
5. **Narrator:** the gamma rule in its prompt, and the Calls in its wiki.
6. **A check tool:** every derived number for all 46 archetype builds, before and after, so only what this list names may differ.

### 13.6 What it does not do

1. The four new playstyles: the stealth list, Figments, the shield-and-guard list, the tending list. Their alphas hold the lines above until those exist.
2. Tri-scale armour.
3. Perks and Mastery unlocks: none is moved or reworded. It produces the list of the ones that sit on the wrong slot (the eight in 9.5 and whichever of the 36 gamma perks), for Leon to rule on.
4. Balance. Every number is the old number in a new place, or new and provisional.

### 13.7 Order

1. Stage 1: the moves (13.2 without the Calls, 13.3, 13.4), with the check tool.
2. Stage 2: the Calls.
3. Stage 3: the perk and unlock list, then Leon's rulings.
4. Review, version, live.

### 13.8 Still open

1. Rumination's line (critical damage taken), or the Brain save there and Analysis left with Analyze range.
2. Rally at 7 points: 2 AP for 1.
3. Whether the Calls ship in the same version as the moves or the one after.
