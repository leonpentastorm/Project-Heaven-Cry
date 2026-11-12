# Faith, round 2: the Whisper every turn, the Hymn on a cooldown (rules 1.22)

12 Nov 2026. For Leon and whoever picks the balance pass up next. The rules are in
`docs/rules/PHC-Core-Rules-v1.0.md` ("Rules revision 1.22", section 14 items 1280 to 1296). **Nothing here is committed
by this session; nothing was built with `npm run build`, deployed or run in a browser.** Rules 1.23 (the medic's kit,
Boss HP, the healing round limit withdrawn, enemies that target healers) ran in the same tree at the same time and is
not this pass's.

It replaces the shape of rules 1.21 (`faith-fit.md`) and the prayer numbers of rules 1.20 (`heal-shield-pass.md`),
which were both fitted to a Hymn prayed every turn.

## 1. Leon's rulings, in the order they came

1. "wasn't faith supposed to lower prayer cooldown, how does that work? Whisper is the every turn action, and we need a
   damage whisper"
2. "Fine but tune it to be fun with the cooldowns. Also add a 1 turn hymn cooldown reduction when you fulfil an oath
   that can be fulfilled in combat. Balance around that."
3. "whisper is weaker than all combat system because anyone can use it and also use other system. We will add faith
   boosting item later, a hymn is always better than a standard spell or outburst because their cooldown are balanced
   to be long if your faith is low. And have no faith boosting item."
4. On Witnessed and Old Overcast (item 1273): "fix to kill".
5. On Hold the Gate: "if it's a whisper remove it, if it's a hymn, make the cooldown long."
6. On the healing round limit: "No round limit, just balance AP for healing accordingly" (rules 1.23 removes it; this
   pass does not lean on it).
7. The target, which replaces the 120 to 125% average of this pass's first brief: **"faith range 80% for whisper only
   turn and about 125% for hymn, goes up with faith items later".**

## 2. Where it stands

| Asked | Built | Met? |
|---|---|---|
| The Whisper is the every-turn prayer; a damage Whisper | Rebuke stays, at 20 (15) | Yes |
| A turn with only a Whisper about 80% of the plain rifle | 64 to 79% from level 6 (74% on average); 91 to 102% at levels 1 and 3 | **Short by about 6 points from level 6** (section 8) |
| A turn with a Hymn about 125% | 116 to 134% from Devotion 5 (125% on average) | Yes |
| Faith lowers the Hymn cooldown; long at low Faith; no every-turn Hymn without items | 9 − 0.75 × Faith − 0.25 × Virtue, never under 3; no wait under 2 rounds | Yes |
| A vow fulfilled in a fight: 1 round off the Hymn cooldown | Six engine-detected moments, a log line, an fx event, the patron's line | Yes |
| The Whisper is weaker than every combat system | The Whisper-only turn is the weakest steady turn of the four. One Rebuke is about one rifle shot's damage for half the AP | **Yes by the turn, no by the AP** (question 1) |
| A Hymn is always better than a standard spell or an Outburst | At 125% for the turn it cannot be: level with them for its AP, smaller as one cast | **No** (question 2) |
| Support patrons by the same idea: a Whisper-only turn well under the Outburst healer, a Hymn turn at about its steady turn | Warm Hands 13, Saint's Shield 16, Absolution 9: a healing Hymn turn is 109 to 132% of a Soldier-turn, a Whisper-only turn 30 to 37% | Yes |
| Hold the Gate: a long cooldown | Not again for 6 rounds | Yes |
| Witnessed: "fix to kill" | The +2 is earned by a kill and spent by the next attack roll | Yes |
| Re-measure with the new cooldowns | Section 6 | Yes |
| The client shows the cooldown, the vows and the fulfilment | Section 9 | Yes, by unit tests; no browser run |

## 3. What changed, rule by rule

1. **The Hymn cooldown** is 9 rounds − 0.75 × Faith − 0.25 × Virtue, rounded up, never under 3 (item 1280). It was
   4 − 0.5 × (Virtue − 1) − 0.5 × Faith, minimum 1, which is 1 round for any character with Virtue 4.
2. **No wait is under 2 rounds** (item 1282). A vow fulfilled and the True Believer trait each take 1 round off; both
   together still wait 2. This is the room left for Faith items: they are what will lower the floor of 3 and the limit
   of 2.
3. **A vow fulfilled** takes 1 round off the wait of the Hymn being waited for (item 1283). Once for each Hymn; at most
   one moment a round; with no Hymn waiting it is kept for the next Hymn (one kept at most). The vow stays sworn and is
   still kept (+3 Devotion XP) or broken (−5) as before.
4. **Rebuke 20** (15) (item 1281).
5. **Judgement 42** (50), still ×1.3 against one that harmed the helpless. **Lightning Rod 42 and 17** (50 and 20)
   (item 1285). Thunderclap stays at 20.
6. **Warm Hands 13** (10), **Saint's Shield 16** (12), **Absolution 9** (7) (item 1286). Health 5, Protection 6,
   Hearthlight 4, Coin for the Ferry 5 and Everyone Home's shield stand.
7. **Hold the Gate** can't be prayed again for 6 rounds after it is prayed (item 1287). The character's other Hymns
   wait as usual. A vow does not shorten the 6.
8. **Witnessed** (item 1288): a kill made while Witnessed, by a devoted of a patron that likes kills (Old Overcast),
   earns +2 on the next attack roll at an enemy. That roll spends it, hit or miss. Not for finishing a surrendered or
   Downed enemy, not for the patron's own kill. It is kept when the kill's own intervention ends Witnessed, because
   Old Overcast's intervention answers the first kill: without that he would never get it. Being Witnessed no longer
   gives him +2 on every attack. Judge, burn and storm are as they were.
9. **True Believer**: the wait is 1 round shorter, within the limit of 2 (item 1292). It used to move the mark of the
   last Hymn back a round at the start of a turn.

Not changed: the Miracles, the interventions, Lucky Break and Foreknowing (2 each), Feed the Fire (+2 AP), Cut Short
and every Hymn with no number.

## 4. The cooldown table

Rounds between Hymns. Faith is a Virtue skill, so Virtue is never below Faith.

| Faith | Virtue 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|
| **3** | 6 | 6 | 6 | 6 | 5 | 5 | 5 | 5 |
| **4** | – | 5 | 5 | 5 | 5 | 4 | 4 | 4 |
| **5** | – | – | 4 | 4 | 4 | 4 | 3 | 3 |
| **6** | – | – | – | 3 | 3 | 3 | 3 | 3 |
| **7** | – | – | – | – | 3 | 3 | 3 | 3 |
| **8** | – | – | – | – | – | 3 | 3 | 3 |
| **9** | – | – | – | – | – | – | 3 | 3 |
| **10** | – | – | – | – | – | – | – | 3 |

With a vow fulfilled: 1 less, never under 2. So the best a character without items can do is a Hymn every second
round, and only in the rounds the vow is played.

The measured build (the Faith build of `builds.ts`, normal share): Faith 3 and Virtue 4 at level 1 (6 rounds), Faith 5
and Virtue 5 at level 3 (4 rounds), Faith 6 or more from level 6 (3 rounds). All in: Faith 7 at level 1 (3 rounds).

In a session of three fights of 5 rounds: 3 Hymns at level 1, 6 at level 3, 6 from level 6 (9 if every wait is
shortened by the vow). Under rules 1.21 it was 15.

## 5. The vow moments

| Vow | Fulfilled when | How the engine sees it | Rounds in 10 it comes (assumed) |
|---|---|---|---|
| Stand | an enemy has attacked you since your last turn, and you end your turn no further from the nearest enemy | an enemy's attack roll at you, then your turn's end with the vow unbroken | 6, under fire |
| Shield | an enemy attacks the ally you named, and when that enemy's turn ends the ally still stands | an enemy's attack roll at the ally; settled at that enemy's turn end | 5 |
| Mercy | an enemy yields to you, or you spare one with a blow that would have killed it | a surrender credited to you, or your sparing blow subduing it | 1 or less |
| Bare Hands | an enemy falls to your melee attack | kill credit from a melee weapon attack of yours | 2 or 3 |
| No Magic but Theirs | an enemy falls to your prayer, or to your patron acting for you | kill credit from your Whisper, Hymn, Miracle or intervention | 2 or 3 |
| Nobody Left Behind | a Downed ally stands up again because of you | a heal, stim or prayer of yours that gets a Downed ally up | 1 or less |

1. **The rates are assumptions, not measurements.** The simulator's target never acts and has 5,000 HP, so no real
   moment can come on the range. The `prayer` policy swears Stand and, once a round at a set chance, calls the engine's
   own `fulfilVow`. The tables use 4 rounds in 10, which shortens about two waits in three (Hymns on 49% of turns
   against 38% with no vow).
2. **Why each cannot be farmed.** Stand and Shield need an enemy to choose to attack. Mercy needs a surrender. Bare
   Hands and No Magic but Theirs need a kill by the vow's own means. Nobody Left Behind needs an ally Downed. All are
   once a round and once for each Hymn.
3. **All six have a moment.** Nobody Left Behind does too (getting a Downed ally up), so none was left with only its
   end-of-fight reward.
4. Shield is fulfilled by what the enemy does and not by what the swearer does. It is the weakest design of the six
   (question 5).
5. The patron speaks from its vow-kept lines the first time a vow is fulfilled in a fight. No new lines were written.

## 6. Measured

The shooting range (a target with a Soldier's numbers and 5,000 HP that never acts), 12 fights of 8 turns a cell,
percent of the plain rifle's damage a turn at the same level (69.7 / 80.8 / 97.3 / 96.4 / 112.2 / 110.9). At 12 fights
a cell is good to about ±8 points.

### 6.1 The damage patrons, normal share

**After (rules 1.22).** A turn with a Hymn · a turn with only a Whisper · the average with no vow · the average with
the vow fulfilled 4 rounds in 10.

| Patron | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Old Overcast | 107 · 102 · 103 · 92% | 104 · 91 · 95 · 93% | **120 · 72** · 90 · 98% | **129 · 73** · 94 · 100% | **116 · 64** · 84 · 94% | **130 · 76** · 96 · 109% |
| Old Overcast, two enemies together | 136 · 96 · 106 · 111% | 135 · 90 · 101 · 103% | 139 · 72 · 97 · 103% | 157 · 73 · 105 · 119% | 146 · 73 · 101 · 105% | 155 · 81 · 109 · 124% |
| Holy Father Nerukhan | 68 · 101 · 93 · 91% | 52 · 91 · 81 · 77% | **122 · 78** · 95 · 101% | **134 · 76** · 98 · 105% | **121 · 69** · 89 · 92% | **127 · 79** · 97 · 111% |
| Hymns a turn, no vow · with the vow | 0.25 · 0.25 | 0.25 · 0.37 | 0.38 · 0.49 | 0.38 · 0.49 | 0.38 · 0.49 | 0.38 · 0.48 |

From Devotion 5 (levels 6 to 20): a turn with a Hymn 116 to 134%, **125% on average**; a turn with only a Whisper
64 to 79%, **74% on average**. Nerukhan has no Hymn that hurts at Devotion 3: his Hymn turn at levels 1 and 3 is Saint's
Shield, Rebuke and one shot.

**Before (rules 1.21, a Hymn every turn)**, the same build, from `faith-fit.md`:

| Patron | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Old Overcast | 89% | 91% | 127% | 140% | 130% | 143% |
| Old Overcast, two enemies together | 98% | 100% | 159% | 177% | 161% | 172% |
| Holy Father Nerukhan | 62% | 52% | 130% | 141% | 127% | 144% |
| The same character, rifle only | 74% | 68% | 50% | 47% | 42% | 67% |

So the average from Devotion 5 went from about 135% (every turn) to 84 to 98% with no vow and 92 to 111% with one.
The Hymn turn itself is about 10 points lower than it was (42 for 50, with Rebuke up by 5). Levels 1 and 3 went up
(91 to 103% for Old Overcast, from 89 to 91%) because Rebuke is bigger and the weapon gets more of the AP.

**All in** (Faith first, Dexterity 0 until level 20): a turn with a Hymn 111 to 145% from level 6, a turn with only a
Whisper 43 to 59% at levels 6 to 12 and 85 to 98% at level 20; the average 71 to 97% at levels 6 to 12 and 106 to 116%
at level 20. All in is worse than a normal share, as it was in rules 1.21: Blessing power stops at ×2.0 and the weapon
is worth nothing.

### 6.2 The six patrons with no damage Hymn, normal share, no vow

A turn with a Hymn (the support Hymn on the character itself, Rebuke, a shot) · a turn with only a Whisper · the
average. Their Hymn is not damage; what it is worth is in section 6.4 and in `faith-fit.md` section 5.

| Patron | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| The Quartermaster | 59 · 92 · 84% | 69 · 87 · 83% | 53 · 74 · 67% | 53 · 72 · 66% | 50 · 75 · 66% | 70 · 89 · 82% |
| The Laughing Mask | 83 · 114 · 107% | 76 · 108 · 101% | 69 · 93 · 84% | 44 · 66 · 58% | 44 · 57 · 52% | 52 · 73 · 66% |
| The Toll-Keeper | – · 95 · 96% | – · 96 · 97% | 59 · 70 · 67% | 53 · 69 · 63% | 50 · 68 · 61% | 58 · 83 · 74% |
| Mother Ember | 65 · 98 · 91% | 71 · 91 · 87% | 53 · 67 · 62% | 85 · 74 · 78% | 70 · 72 · 72% | 83 · 87 · 86% |
| The Matchmaker | – · 94 · 95% | – · 87 · 88% | 56 · 70 · 65% | 60 · 80 · 73% | 52 · 70 · 64% | 57 · 86 · 76% |
| The Counting Weaver | 68 · 90 · 85% | 61 · 92 · 84% | 51 · 77 · 68% | 56 · 80 · 72% | 53 · 70 · 64% | 55 · 87 · 75% |

(The Toll-Keeper's and the Matchmaker's Hymn I can't be prayed alone on the range.) Under rules 1.21 these rows read
41 to 93%: they are higher now because a support Hymn takes 3 AP from the weapon one turn in three, not every turn, and
Rebuke is bigger.

### 6.3 A Hymn against a spell and a Release, a cast

Levels 6 / 9 / 12 / 20, normal share, percent of a plain rifle's turn.

| One cast | Damage | Percent of a rifle's turn | AP | Percent an AP |
|---|---|---|---|---|
| Judgement or Lightning Rod (Hymn II) | 67 / 76 / 80 / 84 | 69 / 78 / 71 / 76% | 3 | 23 / 26 / 24 / 25% |
| Lightning Rod with a second enemy in the chain | 94 / 106 / 112 / 118 | 97 / 110 / 100 / 106% | 3 | 32 / 37 / 33 / 35% |
| Rebuke (Whisper) | 32 / 36 / 38 / 40 | 33 / 37 / 34 / 36% | 1 | the same |
| One plain rifle shot (lands about 65%) | 32 / 32 / 37 / 37 expected | 33% | 2 | 17% |
| A 2-glyph Line, cast every turn (rules 1.17, measured) | | 96 / 87 / 102 / 105% | about 4 | 23 / 21 / 25 / 30% |
| A steady Outburst turn (Leon's target; a new caster measured 119 / 113 / 150% at levels 6 / 9 / 12) | | about 135% | 6 | about 22% |
| The biggest Release (Leon's target; measured 148 / 161% at levels 6 / 9) | | about 165% | 6 | about 27% |

The Hymn rows are arithmetic (the base × Blessing power; a Hymn never misses; Soul ignores armour and lightning loses
half of a Soldier's 7 or 8). **A Hymn is level with a spell or a steady Release for its AP, and smaller than any of
them as one cast. A turn with a Hymn (125%) sits under a steady Outburst turn (135%) and well under the Outburst's
peak (165%).** Its edge is that it lands every time, costs no ammo, MP, Strain or cores, and leaves 3 AP.

### 6.4 Heals and shields

Arithmetic on the normal-share sheet (Blessing power ×1.3 / 1.5 / 1.6 / 1.8 / 1.9 / 2.0 × the level factor of rules
1.20), percent of one Soldier-turn (18.5 / 21.5 / 25.4 / 32.4 / 37.8 / 60.2 HP).

| | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Health, the Whisper-only turn (not changed) | 35% | 37% | 36% | 34% | 35% | 30% |
| Warm Hands, a cast: rules 1.20 → 1.22 | 70 → 91% | 73 → 95% | 71 → 93% | 69 → 90% | 69 → 90% | 60 → 79% |
| **A turn with Warm Hands and Health** | **126%** | **132%** | **129%** | **124%** | **125%** | **109%** |
| Saint's Shield, a cast: rules 1.20 → 1.22 | 84 → 112% | 88 → 117% | 85 → 114% | 83 → 110% | 83 → 111% | 73 → 97% |
| A turn with Saint's Shield and Protection | 154% | 161% | 157% | 151% | 153% | 133% |
| Absolution, a cast (Devotion 7; it also ends every harmful condition) | | | | 62% | 62% | 54% |
| The average a turn, Warm Hands and Health: no vow · every wait shortened | 50 · 53% | 61 · 69% | 67 · 82% | 64 · 79% | 65 · 80% | 56 · 70% |
| Rules 1.20, a Hymn every turn | 105% | 110% | 107% | 103% | 104% | 90% |

For comparison (rules 1.20): a 2-glyph MEND Line 88 to 102% for about 4 AP; the Outburst healer's steady turn 109 to
132% for 6 AP, its quick heal 43 to 53% for 3 AP, its biggest heal 139 to 170%. So a turn with a healing Hymn is the
Outburst healer's steady turn, with 2 AP left for the weapon, one turn in two or three; over a fight a Faith healer
heals about 50 to 65% of what the Outburst healer does (64 to 82 against 125 from level 6) and shoots with the rest.
**The pairs under fire of rules 1.20 were not re-run** (they are 35 minutes at 16 fights a cell and rules 1.23 is
changing the limit and the enemy's targeting under them).

### 6.5 The gunner who dabbles

The plain rifleman with Faith 3 and Virtue 3 given to him (the most he could gain, not what a legal sheet gains), sworn
to Old Overcast, cooldown 6 rounds. 12 fights a cell.

| Level | Rifle only | Rebuke with the AP the rifle left | Rebuke first, then the rifle | Thunderclap when it is back, Rebuke, rifle | Devotion 5: Lightning Rod when it is back, the vow, Rebuke, rifle |
|---|---|---|---|---|---|
| 1 | 106% | 104% | 112% | 113% | 121% |
| 3 | 101% | 92% | 101% | 101% | 105% |
| 6 | 90% | 103% | 95% | 98% | 99% |
| 9 | 100% | 108% | 111% | 107% | 110% |
| 12 | 113% | 105% | 99% | 98% | 98% |
| 20 | 110% | 105% | 100% | 90% | 97% |

1. **No gain the noise does not cover.** Over the six levels the columns average 103 / 103 / 103 / 101 / 105% against
   his own 103% with the rifle only. The first two columns are the same play at most levels (three shots use all 6 AP),
   and they differ by up to 13 points: that is the noise.
2. Trading a shot for Rebuke is about even at Faith 3 (26 damage with no roll for 1 AP, against a shot's 23 to 37
   expected for 2 AP), and leaves him 1 AP to move. From level 12 it costs him.
3. A Hymn once a fight adds nothing measurable. At Devotion 5 with the vow he is 2 points up on average (within the
   noise), and 15 up at level 1.
4. For that he has spent 3 Skill points and 2 Attribute points.

## 7. Estimates and assumptions, labelled

1. The vow rates (section 5): assumed.
2. Section 6.3's Hymn rows and all of section 6.4: arithmetic on real sheets, not simulated.
3. The Outburst's 135% and 165% in section 6.3 are Leon's targets; the measured cells are from spec item 1222.
4. What the support Hymns with no number are worth: `faith-fit.md` section 5, unchanged, and now once in two or three
   turns.
5. The first-round Hymn is in every 8-turn fight, so "Hymns a turn" reads 0.38 for a 3-round wait (3 of 8), above the
   long-run third. A real fight of 5 rounds has 2 of 5.

## 8. Not met

1. **A Whisper-only turn is 74% on average from level 6, not 80%.** It is mostly the weapon in weak hands: this build's
   rifle alone is 38 to 67% of the plain rifle at those levels, and a Whisper-only turn is two shots of that and
   Rebuke. At levels 6 to 12, 80% needs Rebuke at about 26 to 30, which is more than one rifle shot for half the AP
   and would start to pay a gunner to pray. Held at 20 (question 1).
2. **"A hymn is always better than a standard spell or outburst"** is not true at a 125% Hymn turn (section 6.3,
   question 2).
3. **Nerukhan at Devotion 3** has no Hymn that hurts.
4. **The support Hymns with no number and all eight Miracles were not refitted.** With a Hymn one turn in two or three,
   Foreknowing (2 attacks), Lucky Break (2 rerolls), Feed the Fire (+2 AP), Cut Short, Covering Fire, Sweet Nothings
   and the rest are worth a third to a half of what rules 1.21 priced them at over a fight. The Quartermaster, the
   Laughing Mask, the Matchmaker and the Counting Weaver are the patrons this leaves weakest (question 4).
5. **The Saints' Verdict** (130 an enemy) and **The Sky Answers** (150) are now about three Hymns' worth on every enemy
   they reach. Not changed.
6. **No browser suite was run**, and the screen data (`protodata.json`) was not regenerated: it carries the old card
   texts until `python3 design/canvas-build/build.py --web` is run.
7. The pairs under fire, interventions, Miracles and real vow moments were not run in the simulator.

## 9. What the client shows

1. The Hymns' heading on the FAITH tab reads "HYMNS · EVERY 3 ROUNDS · NEXT IN 2 ROUNDS" (or "· READY"), and
   "· YOUR VOW: 1 ROUND SOONER" when the vow has shortened this wait (`faithView.ts` `hymnHeadText`; the heading was the
   fixed word HYMNS in `main.template.html`).
2. A Hymn button that is waiting says why, as before, with the new wait; Hold the Gate says the round it comes back.
3. The vow prompt at the start of a fight says what fulfilling buys, and each vow's button title says "Fulfilled when:
   … Broken when: …". The vow's resource row says it too.
4. A vow fulfilled: the vow's seal glints over the character and the float reads "VOW FULFILLED · HYMN 1 ROUND SOONER"
   (the existing vow hook in `fx/faith.ts`; before this it would have read "VOW SWORN"). The log line and the patron's
   line card come from the engine.
5. Every card text is the data's. Virtue's line on the creation screen reads "Hymns come back a little sooner".
6. No new art. The vow seals are the existing six icons.

## 10. What I added that was not asked

1. **A moment kept for the next Hymn.** A vow fulfilled while no Hymn is waiting is not lost: the next Hymn's wait
   starts 1 round shorter. Without it the order "pray first, then fulfil" would be the only one that pays.
2. **Once for each Hymn**, not once a round without limit. With an uncapped cut a dabbler who plays Stand every round
   halves a 6-round wait.
3. **The limit of 2 rounds** also binds True Believer, which could otherwise stack with a vow to a Hymn every turn.
4. **Nobody Left Behind has a moment** (the brief thought it might not).
5. **The kill's +2 survives the intervention that the same kill sets off** (item 1288).
6. `own_cooldown` is a field any Hymn can carry, not a special case for Hold the Gate.
7. The simulator records which turns held a Hymn (`sim.ts`), so every row reports a Hymn turn and a quiet turn apart.

## 11. Questions for Leon

Each recommendation is what is built.

1. **Rebuke at 20: is the Whisper "weaker than every combat system" by the turn, or by the AP?** By the turn it is: a
   Whisper-only turn is 64 to 79%, the weakest steady turn there is. By the AP it is not: one Rebuke is about one rifle
   shot's damage for 1 AP. Your 80% needs it at least this size. The gunner who adds it gains nothing measurable,
   because three shots already use his 6 AP. Recommendation: keep 20, and let Faith items and the character's weapon
   skill close the last 6 points. The other way is Rebuke at about 12 (under a rifle's AP), which puts the Whisper-only
   turn at about 55 to 65%.
2. **A Hymn turn at 125% against "a hymn is always better than a standard spell or outburst".** At 125% the Hymn itself
   is 69 to 78% of a rifle's turn: level with a spell or a Release for its AP, smaller as one cast, and the turn is
   under a steady Outburst turn (135%). Recommendation: keep 125% for now, as you ruled last, and let the Faith items
   be what lifts a Hymn over a Release. If the Hymn should beat a steady Release as one cast today, Judgement and
   Lightning Rod go to about 85 (a Hymn turn of about 195%, an average of about 115 to 125% with the vow).
3. **Is 3 rounds reached too early?** A character who leads with Faith has it at level 6 (Faith 6), and Faith 7 to 10
   then only raise Blessing power. Recommendation: keep it. It holds the Hymn turn and the average flat from level 6,
   as the rifle's are, and it is simple to plan around. The other way is a slower curve (7.5 − 0.5 × Faith: 4 rounds at
   Faith 6 to 8, 3 at Faith 9), which makes levels 6 to 11 a Hymn every fourth round.
4. **The support Hymns with no number.** They were sized for every turn in rules 1.21. Recommendation: a pass of their
   own once squads can be measured; until then the Quartermaster, the Mask, the Matchmaker and the Weaver are the weak
   patrons. The cheap fix if wanted sooner is to double the counts (Foreknowing 4, Lucky Break 4, Feed the Fire +3 AP).
5. **Shield's moment** is the enemy attacking the ally you named. It rewards naming whoever the enemy will shoot.
   Recommendation: keep it for the playtest; the better moment is "you stop or take a hit meant for them" (Interpose,
   a shield or heal on them in the round they were attacked), which needs more hooks.
6. **Hold the Gate at 6 rounds.** Once in a normal fight, twice in a long one. Recommendation: 6. If it should be
   strictly once a fight, that is one line.
7. **The Miracles** now stand far above a Hymn. Recommendation: leave them; they cost five levels of Devotion.
8. **Should the vow's cut work in the story?** Vows are sworn in fights only, so nothing shortens a wait out of one.
   Recommendation: leave it.

## 12. Files

| File | What |
|---|---|
| `docs/rules/PHC-Core-Rules-v1.0.md` | "Rules revision 1.22"; the 1.22 note, the sizes table, the Whisper list, Witnessed, the vows table and seven cells of the patron table in "Patrons and prayer"; Derived stats; notes on items 595, 1231, 1239, 1246, 1260, 1262, 1263, 1268, 1270, 1271, 1273; items 1280 to 1296 |
| `data/patrons.json` | `prayer.hymn.cooldown_rule`; Rebuke, Judgement, Lightning Rod, Warm Hands, Saint's Shield, Absolution (numbers and card text); Hold the Gate's `own_cooldown` and text; `fulfilled_when` on every vow |
| `data/rules.json`, `data/attributes.json`, `data/skills.json` | the cooldown formula as text; Faith's and Virtue's per-point lines |
| `packages/engine/src/character.ts` | `prayerCooldown`, `HYMN_COOLDOWN` |
| `packages/engine/src/faith.ts` | `hymnWait`, `hymnLeft`, `ownCooldown`, `fulfilVow` and the six moments' hooks; the kill's +2 (`killEdge`); the Faith view's `cooldowns` and `vows[].fulfilledWhen` |
| `packages/engine/src/perks/d.ts` | True Believer as the `hymn_wait` stat |
| `packages/engine/src/game.ts` | the Proving Ground's reset clears the new marks (one line) |
| `packages/engine/test/rules122-faith.test.ts` | new: 24 tests |
| `packages/engine/test/rules121-faith.test.ts`, `faith.test.ts`, `perks-d.test.ts`, `rules120-heal-shield.test.ts`, `balance/heal-measure.test.ts` | the assertions that pinned a number or a rule this revision changes |
| `packages/engine/test/balance/faith-measure.ts`, `faith-measure.test.ts`, `policies.ts`, `sim.ts` | the `prayer` policy swears and plays a vow at a set rate; a Hymn turn and a quiet turn apart; the cheap targets are the new ones |
| `apps/web/src/game/faithView.ts`, `screens/faithTab.js`, `screens/faithCombat.js`, `screens/shared.js`, `templates/main.template.html`, `game/resources.ts`, `game/fx/faith.ts`, `narrator/context.ts` | section 9 |
| `apps/web/src/game/faithView.test.ts`, `game/fx/faith.test.ts`, `screens/create-points.test.ts` | their tests |

Browser suites: `apps/web/e2e/faith.mjs` and `faith-pg.mjs` pin none of the changed numbers and reset the limits before
each Hymn they pray; neither was edited, neither was run.

## 13. Commands

```
npm run check                                                      validator, types, both unit suites
npx vitest run --root packages/engine test/rules122-faith.test.ts  24 tests: the rules of this revision
FAITH_MEASURE=1 npx vitest run --root packages/engine test/balance/faith-measure.test.ts --silent=false
    FAITH_MEASURE_PARTS=sheets,rows,support,dabbler,limits   FAITH_MEASURE_N=12   FAITH_MEASURE_VOW=0.4
    FAITH_MEASURE_LEVELS=6,12   FAITH_MEASURE_VARIANTS=normal   FAITH_MEASURE_PATRONS=old_overcast,nerukhan
```

The run behind section 6 (sheets, rows, support, dabbler, limits; 12 fights a cell; both variants) took about half an
hour. The three cheap tests in `npm run check` are level 6, a normal share: a Hymn turn between 100 and 150% of the
rifle and a quiet turn between 45 and 95% for Old Overcast and Nerukhan, Hymns on 30 to 55% of turns with the vow and
exactly 3 of 8 without, two targets 115 to 185% on the Hymn turn, a patron with no damage Hymn between 40 and 100%,
the dabbler no more than 15% over his rifle.
