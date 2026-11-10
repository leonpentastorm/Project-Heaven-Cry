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
3. **Saves:** Body save Guts (as now); Brain save **Rumination** (Leon: analysing something well has nothing to do with keeping your mind); Heart save **Lore Master**.
4. **Debuff strength** is the modifier of the skill that delivered the condition: the playstyle's alpha for a blow, shot, spell, song or prayer; the gamma that spoke, for words.
5. **Calls:** nine spoken actions, one per gamma, on the shared ten-level ladder (10.5).
6. **Gear gates:** weapons and foci by an alpha, armour by a beta.

### 13.2 What a point gives, all 27

| Attribute | α | β | γ |
|---|---|---|---|
| Endurance | **Durability:** Guard gained on Brace (1 + modifier) | **Pain Threshold:** −10% elemental damage taken; +2 HP a level | **Sensory:** sensing the unseen (kept); Warn |
| Strength | **Raw Power:** +5% physical damage; Counter bonus; strength of your melee conditions | **Guts:** Body save | **Intimidation:** Threaten |
| Agility | **Dexterity:** throwing range; less Recoil; Critical multiplier; strength of your shots' conditions | **Athletics:** Dodge | **Reaction Speed:** Initiative (kept: section 15); Cue |
| Perception | **Ingenuity:** Stealth; Ambush damage; strength of your traps | **Proficiency:** **−5% critical damage taken** | **Vigilant:** Detection and Vision range, spotting the Hidden (kept: section 15); Spot |
| Intelligence | **Brain Power:** Sigil damage; duration; **Sigil range**; **cheaper Sigils**; strength of your Sigils' conditions | **Rumination:** **Brain save** | **Eloquence:** Brief |
| Expression | **Visualization:** +10% elemental damage | **Analysis:** **−10% ambush damage taken**; Analyze range | **Charisma:** Rally |
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

## 14. The perks in Skeleton 2.0, and the art

Leon's answers, 10 Nov 2026: the Brain save sits on Rumination (Analysis takes critical damage resistance); Rally at 7 points is fine, seven points is a big commitment; Skeleton 2.0 is a big patch with the same set-up as Physical 2.0 (three implementers and the lead), so draft freely.

### 14.1 What exists

| | Count | Has its own icon |
|---|---|---|
| Acquired perks (2 a skill) | 54 | yes |
| Mastered perks (1 a skill) | 27 | yes |
| Achieved perks (two or three skills each) | 19 | yes |
| Ultimate perks | 6 | yes |
| Mastery unlocks (at 3 and 5 points, 2 a skill) | 54 | **no** |

### 14.2 The method

Every perk gets one of four verdicts. The first three need no new art.

| Verdict | Meaning | Art |
|---|---|---|
| **Keep** | fits its slot, or is harmless | none |
| **Reword** | same name, same skill, same picture; the effect changes to fit the slot | none |
| **Move** | goes to another skill, swapping places with a perk there | none |
| **Replace** | no honest rewording keeps the name true; a new perk takes its place | **one new icon** |

Rules I hold to:

1. A perk keeps its name and its skill unless that is impossible. The names and icons are the game's memory.
2. **AP perks on gammas stay.** Many gamma perks already move AP on a condition (Grim Reaper, Overruled, Talks Broke Down, Sweet Talker, Outclassed, You Get Used to It, Got You in My Sight, Rounding Up). That is the same idea as the Calls, from 2020. They are the model, not the problem.
3. **Durability's perks stay.** Bulwark, Shrug It Off, Last Wall and Take the Hit protect, but protecting others is Durability's playstyle.
4. Only three things make a perk wrong: straight damage on a beta or gamma; a defence on a gamma; an AP gift on a beta that a Call now does.
5. Achieved perks need two or three skills, so they have no slot. They are checked only for reading a number that moved.
6. Ultimates are not touched.

### 14.3 First pass over all 81 skill perks

**Keep: 72.** **For a ruling: 9.**

| Perk | Skill | What is wrong | My proposal |
|---|---|---|---|
| Eyes in the Back (acquired) | Vigilant γ | a defence (can't be flanked) | **Move** to Proficiency, swapping with Hot Swap, which is a gear-handling AP perk and suits a gamma less... or **Reword** as a Spot rider: allies you Spot for can't be flanked this round |
| Nothing Gets Past (mastered) | Vigilant γ | offence (every mover draws an Overwatch shot) | **Reword:** every enemy that moves in your sight is Spotted for free. The name still fits |
| Still Water (mastered) | Composure γ | a defence (immune to Brain debuffs) | **Reword:** keep "nothing reads you"; the immunity becomes "your Steady also ends one Brain condition" |
| Case Closed (mastered) | Analysis β | offence (+2 to hit for allies) | **Reword:** keep "Analyze reveals everything"; the +2 becomes a defence against that enemy |
| True Name (mastered) | Lore Master β | offence (+50% damage to a named being) | **Reword:** the named being's effects are resisted (+ to saves against it); the damage half goes |
| Rally Cry (acquired) | Camaraderie β | an AP gift, now Charisma's Rally | **Reword:** when an ally drops, the others gain a defence until their next turn |
| Many Hands (mastered) | Camaraderie β | an AP gift without limit | **Reword:** keep the shared reaction; the AP half goes to the Calls |
| On My Mark (mastered) | Authority γ | orders an ally to act out of turn, **attacks included** | Leon ruled Order never attacks. Either this is the one exception, earned at 10 points, or it becomes "your Order costs 0 AP" |
| Roll With It, tier II | Athletics β | a small critical damage rider | **Reword** the rider to a second free tile |

**Mastery unlocks for a ruling: 7 of 54** (no art either way): Tuned (+10% damage on Proficiency), Weak Point (+15% squad damage on Analysis), Proven Formula (Sigil discount on Rumination), Hand-Off (AP gift on Camaraderie), Stand Still (defence on Composure), Second Wind (self-heal on Durability), Paint the Field (a Sigil rider on Visualization).

### 14.4 New art

| For | Icons | When |
|---|---|---|
| The nine Calls | 9 | Skeleton 2.0, if Calls get icons as prayers do |
| Perks that end up **Replaced** | 0 by my proposals; at most 9 if Leon replaces every one above | Skeleton 2.0 |
| **Skeleton 2.0 total** | **9, at most 18** | |
| The Visualizer (a focus icon, beside the Evoker and Emanator) | 1 | with Figments |
| The five Figment forms | 5 | with Figments |
| The stealth list (about 20 entries) | about 20, if each gets one | with stealth |
| Techniques (58) | none today: the pad uses words | Leon's call |

All in the white-ink Wick style of the perk and prayer icons (`art/icons/STYLE-LOCK.md`).

### 14.5 Who does what (the same set-up as Physical 2.0)

1. **Lead:** the spec, the data, the derived numbers, the check rule, the check tool, every merge.
2. **Implementer A:** the Calls in the engine (nine handlers on one frame) and the enemy AI's use of Threaten and Taunt.
3. **Implementer B:** the perk pass: every Reword and Move Leon rules on, the seven unlocks, and the achieved perks that read a moved number, each with its test.
4. **Implementer C:** the screen: the Calls pad, the sheet, the skill cards' new lines, creation.

## 15. The perks again, judged by the build that buys them

Leon, 10 Nov 2026: On My Mark stays as it is (earned at 10 points, on the one skill it suits). Calls get no icons in Skeleton 2.0. Art can be replaced: judge each perk by whether it makes sense for the builds and classes that will hold it, not by what saves a picture. **This section replaces 14.3.**

For each skill I asked: who puts points here after Skeleton 2.0, and does each unlock and perk help that character do their job?

### 15.1 Two of my own moves were wrong

Judged by build, two of section 11's moves make no sense, and I take them back:

1. **Initiative stays on Reaction Speed.** Its name, its unlocks (Shoot First, Cut In) and its Mastered perk (Before the Blink) are all about acting first. Going first is tempo, not damage: exactly the combat quality of life a gamma may give.
2. **Detection, Vision and sensing the unseen stay on Vigilant and Sensory.** Every Vigilant perk is about seeing. Moving the numbers to Proficiency, the mechanic, would have made a lookout buy a repair skill.

So a gamma keeps **information and tempo**; it gives up **damage, saves and damage reduction**. Proficiency takes critical damage resistance, and Analysis takes ambush resistance (you read the set-up).

### 15.2 What Physical 2.0 makes redundant

Four Raw Power entries are now techniques that everyone can learn:

| Today | Is now |
|---|---|
| Shove (unlock at 3) | the Shove Link |
| Break (unlock at 5) | the Break Finisher |
| Breaching Strike (perk) | what Bash and a Heavy weapon's push already do |
| Grapple (perk) | Bind with bare hands |

A Fighter who puts 5 points in Raw Power would unlock two things they already have. **All four are replaced** with things that bend the chain, which is what a Raw Power build now does every turn:

| Slot | Proposal *(names Suggested)* |
|---|---|
| Unlock at 3 | **Heavy Hands:** a melee technique that pushes moves its target 1 tile further |
| Unlock at 5 | **Follow Through:** a Finisher that takes its target out leaves you 1 Momentum |
| Perk | **Breaching Strike** (name kept): a target you push into a wall or another enemy takes the hit again at half |
| Perk | **Iron Grip** (replaces Grapple). **I:** a target you Bind or Grapple can't use Answers or reactions; attacks aimed at you have a 50% chance to hit it (the old Grapple's tier II); when you move, it comes with you. **II:** every melee technique against a target you hold earns the variety bonus, and Throw Down on it needs no Momentum |

### 15.3 Dexterity has nothing for a blade

Light blades now hit with Dexterity, but its unlocks and perks are all about guns (Speed Load, Quick Draw, Running Reload, Trick Shot), plus Origami Hands, which builds traps.

1. **Quick Draw** (unlock at 5) becomes: your first attack in each fight with a weapon you draw for it costs 0 AP. It then serves the knife as well as the pistol, and fits Draw Cut and Snap Shot.
2. **Origami Hands is replaced.** Traps belong with stealth; its idea goes to Ingenuity's list when that is built. In its place, a perk for the character the swap created, blade in one hand and gun in the other: **Both Hands** *(Suggested)*: after a melee technique of yours hits, your next Shot that turn has no Recoil; after a Shot hits, your next melee technique that turn counts as different for Momentum.

### 15.4 The analyst

Weak Point (+15% squad damage on analysed enemies) and Case Closed (+2 to hit them) are the reason anyone buys Analysis today. By the rule they are offence on a beta.

**My proposal: mirror them.** Analysis becomes the skill of not being hit by what you have read:

- **Weak Point** becomes **Read** *(Suggested)*: enemies you have analysed deal 15% less damage to your squad.
- **Case Closed** keeps the full reveal; allies get +2 Defense against an analysed enemy.
- Pattern Lock (+Dodge against attacks you have seen) already says the same thing.

The squad still has ways to mark a target for damage on the right slots: Faith's Deliver the Sinner, and Vigilant's Spot.

### 15.5 The rest of the rulings

| Perk | Skill | Verdict, by build |
|---|---|---|
| On My Mark | Authority | **Keep** (Leon) |
| Eyes in the Back | Vigilant | **Keep.** It is exactly what a lookout is for; it is information that happens to protect |
| Nothing Gets Past | Vigilant | **Reword:** every enemy that moves in your sight is Spotted for free. The Marksman's Killzone already covers several held shots |
| Still Water | Composure | **Reword:** nothing reads you (kept); your Steady also ends one Brain or Heart condition. The old immunity made no sense once the saves left Composure |
| Stand Still (unlock) | Composure | **Reword:** until you first act in a fight, your Calls cost 1 AP less |
| True Name | Lore Master | **Keep.** Once a session, the Narrator's call, and the lore-hunter's one big moment |
| Proven Formula (unlock) | Rumination | **Reword:** +3 on saves against a spell or condition that has already hit you this fight. Its AP discount is what Brain Power's Parallel Thought already gives |
| Tuned (unlock) | Proficiency | **Reword:** the weapon you maintain never jams and never breaks. The +10% damage goes |
| Hand-Off, Many Hands, Rally Cry | Camaraderie | **Keep.** They pass your own AP on; they don't make any. They count as the ally's one helping Call that round, so they can't stack with Rally |
| Roll With It, tier II | Athletics | **Reword** the damage rider to a second free tile |
| Second Wind (unlock) | Durability | **Keep.** A tank's own recovery is part of standing in the way |
| Paint the Field (unlock) | Visualization | **Keep for now; replace when Figments are built** |

Everything not named in 15.2 to 15.5 fits the build that buys it and stays as it is: 67 of the 81 skill perks, and 46 of the 54 unlocks.

### 15.6 New art, recounted

| | New icons |
|---|---|
| Iron Grip (replaces Grapple) | 1 |
| Both Hands (replaces Origami Hands) | 1 |
| Read (if Weak Point's unlock gets one: unlocks have none today) | 0 |
| **Skeleton 2.0 total** | **2** |

Origami Hands' icon is kept for the stealth list.

### 15.7 Anything that changes AP is gamma (Leon, 10 Nov 2026)

This overrides 15.5's verdict on the Camaraderie perks. Counted against today's alphas and betas, 20 unlocks and perks touch AP, in two kinds.

**Kind 1: AP gained, given or taken (9).** These leave. Each keeps its name and gets an effect of its own slot; the AP idea lives on in the Calls and the gamma perks.

| Entry | Skill | Today | Proposal |
|---|---|---|---|
| Hand-Off (unlock) | Camaraderie β | give 1 AP to an adjacent ally | once a round, an adjacent ally uses your Defense against one attack |
| Rally Cry | Camaraderie β | +1 or +2 AP to all when an ally drops | when an ally drops, the others take less damage until their next turn |
| Many Hands (mastered) | Camaraderie β | give any AP to allies; share your reaction | the shared reaction stays; the AP gift goes |
| Used to the Pain | Pain Threshold β | ±AP after the first hit of a fight | a light first hit hardens you against the next; a heavy one doesn't |
| Walking Wounded (mastered) | Pain Threshold β | +1 AP a turn below half HP | injuries cost nothing (kept); below half HP you take less damage |
| Into the Dark | Guts β | a free first move into the unknown; +1 AP in a place of Fear | you can't be ambushed on your first move into the unknown; no Fear on your first turn there |
| Clean Hands | Conscience β | +2 or +3 AP after sparing someone | a shield after sparing someone |
| Blueprint, tier II | Visualization α | +1 AP to allies who saw the sketch | +1 more Movement |
| Still Standing (unlock) | Pain Threshold β | one more turn with 3 AP at 0 HP | **keep?** It is a last stand, not an AP bonus. Leon to say |

**Kind 2: a cheaper cost on the skill's own action (11).** Speed Load and Quick Draw (Dexterity), Hot-Swap and Overhaul (Proficiency), Twin Draw and Parallel Thought (Brain Power), Proven Formula (Rumination), Quick Read (Analysis), Rite in the Field (Lore Master), Righteous (Conscience), Shrug It Off's tier II.

**The question:** does "anything that changes AP" include Kind 2? A gunner reloading faster reads to me as the gunner's own craft, not the talker's. If Kind 2 also goes, Dexterity, Proficiency and Brain Power each lose two of their five entries and need new ones. My lean: Kind 1 is gamma only; Kind 2 stays where the action lives.

### 15.8 Leon's answers (10 Nov 2026)

1. **"Changes AP" means AP given or taken in the turn.** Making your own skill's action cheaper or dearer does not count: the eleven cost discounts stay where they are.
2. **Still Standing stays.**
3. **The Raw Power replacements and the mirrored analyst: yes.** Iron Grip was too weak for a perk and is strengthened above: tier I takes the old Grapple's best part and adds dragging the held target; tier II makes a held target the centre of a chain.

## 16. Who builds Skeleton 2.0, and the screen (Leon, 10 Nov 2026)

1. **One session builds all of it** (this lead session, after Physical 2.0 is merged and live), the screen included. Section 14.5's split into three implementers is withdrawn.
2. **The tab rows wrap.** With ARMS joining the character panel's tabs (SKILLS, STATUS, PERKS, GEAR, ARMS, MAGIC, FAITH) and CALLS joining the fight panel's (Move, Attack, Utility, Perks, Class, Sigils, Outbursts, Faith, Calls: nine, from `TAB_NAME` in `apps/web/src/game/commands.ts`), each row has too many to click on one line. Both rows must wrap onto a second line when the tabs don't fit, with nothing cut off and nothing to scroll sideways. To check: the number keys that switch tabs still work across both lines; the fight panel's height rule still holds (the grid and Confirm on screen with no page scroll at 1440 × 900 and 1280 × 720, `e2e/tabs.mjs`); a character with every tab showing at both sizes: in the fight panel that is someone with perk actions, class moves, an Evoker, an Emanator and a patron, so all nine tabs are up.

## 17. The ladder and the names (Leon, 10 Nov 2026)

Asked before the build: do the names make sense, and is the attribute system right. Decided so far; open points are marked.

### 17.1 Cores stop being points

1. **Body, Mind and Soul stay as group names** (the three families, their colours, the three saves, which magic a family runs on). **Nobody spends Core points any more**: not at creation (the 6 go), not from levelling (the Core point every 3rd level goes). The cap is one gate: Skill ≤ Attribute ≤ 10.
2. Reason (Leon): the Core, Attribute, Skill ladder is two layers of gates and the hardest thing to explain to a new player.
3. What it changes in play: a Core no longer holds an attribute down, so a build can be high in attributes from two families from the start (Strength and Intelligence together). Today 6 Core points allow 7/1/1 at most.
4. **Creation budget (Leon: yes to the draft):** Attribute points stay at 10, each attribute starts at 1, and **no attribute is above 7 at creation** (the ceiling the Core budget gave). Provisional number, spec section 14.
5. Touches: `rules.json` (creation, levels, caps), `character.ts` (caps, auto-spend), creation and level-up screens, all 46 archetypes (the All-in 7/1/1 family is defined by its Cores and needs a new definition), `tools/archetype_fill.py`, the spec's creation and levelling sections, `CLAUDE.md`.

### 17.2 What an attribute point gives is shown

Correction to what the lead said in the talk: it is not true that only Endurance and Agility give something. Every attribute already gives two numbers a point, and no screen says so:

| Attribute | A point gives (engine today) |
|---|---|
| Endurance | +15 max HP; +10% chance to ignore an injury |
| Strength | +10% physical damage; +5 kg carried |
| Agility | +0.5 tile of movement an AP; +1 Initiative |
| Perception | +2 tiles of vision; +10% critical damage; −10% critical damage taken |
| Intelligence | +10% Sigil power; a longer Line every 2 points |
| Expression | +10% elemental damage; glyphs 0.1 AP cheaper |
| Insight | +10% healing given; Soul magic costs 5% less MP |
| Determination | +5% Soul power; +10% mana syphoned |
| Virtue | +100 max MP; prayers come back half a turn sooner |

1. **The rule:** every attribute's numbers are printed on the creation screen and on the level-up stepper, beside the `‹ 3 ›`, and the preview shows the change before the point is placed. Nobody learns about 50 HP after the fact.
2. **Audit in Stage 1:** each line above is checked against the slot rule (an attribute may give offence, defence and a world number; that is its job as the whole kit) and against the data strings, which disagree with the engine in four places (elemental, Soul power, healing, critical damage taken).

### 17.3 Names and slots

1. **Composure and Lore Master swap slots** (as Dexterity and Athletics did). Composure is Determination's beta and the Heart save. Lore Master is its gamma: lore checks with full points, and a Call. This replaces "Heart save: Lore Master" in 13 to 15 and plan ruling 16's wording (the Heart save is still a Soul skill, so the Brain Debuff result stands).
2. **The Steady Call moves or changes.** Open: the lead drafts Lore Master's Call (working name **Name It**: you call out what the thing is; the ally you call to is steadied against it). Steady as written may simply be that Call.
3. **Analyse is an action of the Mind group and reads an attribute, not a skill** (Leon; the lead's swap of Analysis and Proficiency across attributes is withdrawn). The action stays as it is in a fight (today: range 4 + points, 1 AP in place of 2 at 3 points, the weak point at 5); those three read **Perception** from now on (the lead's pick of the Mind attribute whose name fits; Intelligence is the other candidate). Open: the thresholds on an attribute scale.
4. **That leaves Expression's beta without a name or a job.** The skill called Analysis (8 perks, a voice, a portrait, ambush damage taken) can't keep a name that now belongs to an attribute's action. The lead's draft: it becomes **Misdirection**, the defence of someone who makes people look at the wrong thing: ambush damage taken stays on it, the perk Read and Case Closed are re-read against it, and it sets up Visualization's Figments. Open until Leon confirms the name and that the skill is re-themed and not cut.
5. **Proficiency is renamed** to something that reads as a quality of the mind, not a trade you learn (Leon: Tinkering and Handiwork are out). Leon's meaning: the person who solves a puzzle cube at speed or assembles a clock's insides. Suggested: **Acuity** (sharpness of eye and mind; it sits under Perception); others: **Aptitude**, **Knack**. Open until Leon picks.
6. **Implication becomes Insinuation.**
7. **Grammar:** Vigilant becomes **Vigilance**; Sensory becomes **Senses**. Suggested as well: Lore Master becomes **Lore** (a skill, not a person), open.
8. Ingenuity keeps its name until its stealth and trap list exists.
9. **Ids do not change** (`vigilant`, `sensory`, `implication`, `proficiency`, `lore_master` stay as ids in data, saves in code and art file names); only the `name` shown changes. Text that names a skill (perks, traits, voices, the spec, the Narrator's prompt, the wiki) is swept in Stage 3.

### 17.4 The archetypes

Leon: scorched earth. The 46 archetypes are built on Core budgets and on the old skill jobs; they are deleted with this patch, not converted. The lead's reading: a new, smaller set is written once the numbers have settled (at least one per attribute, so each of the nine kits has a door), and the 46 card paintings stay in the art library for reuse. The Stage 0 check tool compares generated builds (each attribute's kit at levels 1, 6, 12, 20, and the common pairs) in place of the old 46.
