# Balance pass, step 1: the enemy table, fitted with the simulator (11 Nov 2026)

For Leon. Rules revision 1.15 gave every enemy a level and a first table of numbers worked out by arithmetic. This step played whole fights against that table and moved its numbers until your targets held as well as one table can make them. Only the enemy table moved: HP, armour, Defense, attack bonus and damage, by tier and by level. Nothing about characters, weapons, AP or the level gap changed.

**How it was measured.** The simulator plays whole fights through the real rules. The squad is the baseline's four (optimised gun, tank, Sigil caster, Calls leader), played in a fixed simple way; the enemies are played by the game's own AI and are the squad's level. "The yardstick" is the plain rifleman: a service rifle and a normal share of points. The final numbers are from 60 fights a cell on open ground and 60 on ground with cover, at levels 1, 3, 6, 9, 12 and 20. Tuning rounds used 30 fights a cell. With 60 fights, a percentage is good to about 6 points either way and a round count to about 0.2.

## 1. The page: every target, before and after

"The game before" is the baseline you read (`balance-sim-baseline.md`: no enemy levels, measured at levels 1, 6, 12 and 20). "First table" is rules 1.15 as it stood this morning. "Fitted" is the table now in the game. Where a cell has two numbers they are the lowest and highest of the six levels.

| # | Target | The game before | First table | Fitted | Verdict |
|---|---|---|---|---|---|
| 1 | Vermin dies to 1 yardstick hit | no such tier | 1 | 1 | Met |
| 2 | Minion: 2 hits | 1 | 2 | 2 | Met |
| 3 | Soldier: 3 to 4 hits | 2 at level 1, 1 at level 20 | 4 (3.5 worked out) | 4 (3.50 to 3.95 worked out) | Met |
| 4 | Elite: 6 to 8 hits | 3 at level 1, 2 at level 20 | 7 (6.9) | 7 at level 1, 8 after (6.9 to 7.8) | Met, at the top |
| 5 | Boss: enough for 8 to 10 rounds | 6 at level 1, 4 at level 20 | 26 | 28 to 32 (27.4 to 31.0 worked out) | See row 9 |
| 6 | The yardstick hits an equal Soldier about 65% of the time | 60% at level 1, 90% at level 20 | 65% at every level | 65% at every level | Met |
| 7 | Standard fight (3 soldiers, 1 elite): 4 to 6 rounds | 1.5 to 2.4 open, 2.0 to 3.4 cover | 3.7 to 5.3 open, 4.6 to 6.0 cover | 4.2 to 5.1 open, 4.8 to 5.7 cover | Met |
| 8 | Elite fight (2 elites, 2 soldiers): 6 to 8 rounds | not measured | 3.9 to 6.1 open, 4.9 to 6.7 cover | 4.6 to 5.5 open, 5.6 to 6.7 cover | Not met on open ground: about 1 round short |
| 9 | Boss fight (1 boss, 2 soldiers): 8 to 10 rounds | 1.4 to 3.2 open, 1.7 to 3.3 cover | 5.3 to 9.6 open, 7.0 to 9.8 cover | 6.5 to 9.0 open, 8.6 to 9.9 cover | Met with cover and at level 1; up to 1.5 rounds short on open ground from level 3 |
| 10 | A character lasts 3 rounds under fire from 2 soldiers | measured another way: 4 soldiers dropped the yardstick in round 1.6 at level 1 and never at level 12 | 2.4 to 2.7 rounds | 3.0 to 3.3 rounds | Met |
| 11 | The same under 1 elite and 1 soldier | not measured | 2.4 to 2.9 rounds | 3.2 to 3.6 rounds | Met |
| 12 | The tank lasts noticeably longer | not measured this way | 4.8 rounds at level 1, 7.5 to 9.8 after | 6.1 rounds at level 1, 8.1 to 9.9 after | Met, and by a lot: 2 to 3 times the rifleman |
| 13 | Someone is Downed in about 1 standard fight in 3 | level 1 only (1 character Downed in 10 fights open, 6 in 10 fights with cover); nobody from level 6 | 21% of fights (10% to 34% by level) | 16% of fights (8% to 28% by level) | Not met: 1 fight in 6 |
| 14 | The squad wins about 9 standard fights in 10 | 99% | 98% to 100% | 99% to 100% | Not met: too safe |
| 15 | An enemy 5 levels below dies to one hit | no levels | 1 hit, every enemy, every fight | 1 hit, every enemy, every fight | Met |
| 16 | A standard fight against enemies 3 levels above is lost more often than won | no levels | won 40% to 80% open, 30% to 70% cover | won 58% to 78% open, 30% to 62% cover | Not met on open ground; about even with cover |

**In short:** 11 of the 16 rows hold. The 5 that do not (8, 9 on open ground, 13, 14, 16) cannot be closed by the enemy table without breaking a row that holds. Section 6 says why for each and which step closes it.

## 2. The enemy table now

An enemy's numbers are its tier's row at level 1, raised by its level's row. Changed cells are in bold, with the first table's number after them.

| Tier | HP | Armour | Defense | Attack bonus | Damage factor |
|---|---|---|---|---|---|
| Vermin | 15 | 0 | 10 | +0 | ×0.5 |
| Minion | 70 | 0 | 10 | +1 | ×1 |
| Soldier | 140 | 5 | 11 | +3 | **×0.78** (was ×0.85) |
| Elite | 240 | 10 | 12 | +5 | **×1.05** (was ×1.15) |
| Boss | **960** (was 900) | 10 | 13 | +6 | **×1.2** (was ×1.4) |

| Level | HP | Armour | Defense | Attack bonus | Damage |
|---|---|---|---|---|---|
| 1 | ×1.00 | ×1.00 | +0 | +0 | ×1.00 |
| 2 | **×1.07** (was ×1.04) | ×1.04 | +0 | +0 | ×1.02 |
| 3 | **×1.16** (was ×1.09) | ×1.09 | +1 | +0 | ×1.05 |
| 4 | **×1.23** (was ×1.16) | ×1.16 | +1 | +0 | ×1.07 |
| 5 | **×1.30** (was ×1.20) | ×1.20 | +2 | +0 | ×1.10 |
| 6 | **×1.38** (was ×1.27) | ×1.27 | +2 | +1 | ×1.13 |
| 7 | **×1.43** (was ×1.29) | ×1.29 | +3 | +1 | ×1.17 |
| 8 | **×1.49** (was ×1.36) | ×1.36 | +3 | +1 | ×1.20 |
| 9 | **×1.54** (was ×1.40) | ×1.40 | +4 | +1 | ×1.24 |
| 10 | **×1.61** (was ×1.47) | ×1.47 | +4 | +2 | ×1.28 |
| 11 | **×1.67** (was ×1.49) | ×1.49 | +5 | +2 | ×1.33 |
| 12 | **×1.74** (was ×1.56) | ×1.56 | +5 | +2 | ×1.38 |
| 13 | **×1.78** (was ×1.60) | ×1.60 | +6 | +3 | ×1.43 |
| 14 | **×1.78** (was ×1.60) | ×1.60 | +6 | +3 | ×1.48 |
| 15 | **×1.79** (was ×1.60) | ×1.60 | +6 | +4 | ×1.53 |
| 16 | **×1.79** (was ×1.60) | ×1.60 | +6 | +4 | ×1.58 |
| 17 | **×1.80** (was ×1.60) | ×1.60 | +6 | +5 | ×1.64 |
| 18 | **×1.80** (was ×1.60) | ×1.60 | +6 | +5 | ×1.70 |
| 19 | **×1.81** (was ×1.60) | ×1.60 | +6 | +6 | ×1.76 |
| 20 | **×1.81** (was ×1.60) | ×1.60 | +6 | +6 | ×1.82 |

An enemy deals its weapon's damage × its tier's damage factor × its level's damage factor. HP and armour are rounded to whole numbers.

## 3. What each tier is, in plain numbers

"You hit it" is the yardstick's chance with its first shot at 4 tiles on open ground. "It hits you" is the enemy's chance against the yardstick. "Damage a hit" is with the weapon the tier carries in the simulator (Vermin: bite and claws 18; Minion: service pistol 20; Soldier: service rifle 30; Elite: Legion bullpup 28; Boss: Hellraiser machine gun 25), before armour and after the yardstick's Class 3 armour (15). "Hits to kill" are the yardstick's hits that land.

**Level 1** (the yardstick: 145 HP, 45 damage a hit before the enemy's armour)

| Tier | HP | Armour | Defense | You hit it | Hits to kill | Attack bonus | It hits you | Damage a hit, before armour | After Class 3 armour |
|---|---|---|---|---|---|---|---|---|---|
| Vermin | 15 | 0 | 10 | 70% | 1 | +0 | 50% | 9 | 1 |
| Minion | 70 | 0 | 10 | 70% | 2 | +1 | 55% | 20 | 5 |
| Soldier | 140 | 5 | 11 | 65% | 4 | +3 | 65% | 23 | 8 |
| Elite | 240 | 10 | 12 | 60% | 7 | +5 | 75% | 29 | 14 |
| Boss | 960 | 10 | 13 | 55% | 28 | +6 | 70% | 30 | 15 |

**Level 6** (the yardstick: 190 HP, 57 damage a hit before the enemy's armour)

| Tier | HP | Armour | Defense | You hit it | Hits to kill | Attack bonus | It hits you | Damage a hit, before armour | After Class 3 armour |
|---|---|---|---|---|---|---|---|---|---|
| Vermin | 21 | 0 | 12 | 70% | 1 | +1 | 50% | 10 | 1 |
| Minion | 97 | 0 | 12 | 70% | 2 | +2 | 55% | 22 | 7 |
| Soldier | 193 | 6 | 13 | 65% | 4 | +4 | 65% | 26 | 11 |
| Elite | 331 | 13 | 14 | 60% | 8 | +6 | 75% | 33 | 18 |
| Boss | 1325 | 13 | 15 | 55% | 31 | +7 | 70% | 33 | 18 |

**Level 12** (the yardstick: 288 HP, 70 damage a hit before the enemy's armour)

| Tier | HP | Armour | Defense | You hit it | Hits to kill | Attack bonus | It hits you | Damage a hit, before armour | After Class 3 armour |
|---|---|---|---|---|---|---|---|---|---|
| Vermin | 26 | 0 | 15 | 70% | 1 | +2 | 50% | 12 | 1 |
| Minion | 122 | 0 | 15 | 70% | 2 | +3 | 55% | 27 | 12 |
| Soldier | 244 | 8 | 16 | 65% | 4 | +5 | 65% | 32 | 17 |
| Elite | 418 | 16 | 17 | 60% | 8 | +7 | 75% | 40 | 25 |
| Boss | 1670 | 16 | 18 | 55% | 31 | +8 | 70% | 41 | 26 |

**Level 20** (the yardstick: 445 HP, 72 damage a hit before the enemy's armour)

| Tier | HP | Armour | Defense | You hit it | Hits to kill | Attack bonus | It hits you | Damage a hit, before armour | After Class 3 armour |
|---|---|---|---|---|---|---|---|---|---|
| Vermin | 27 | 0 | 16 | 70% | 1 | +6 | 50% | 16 | 1 |
| Minion | 127 | 0 | 16 | 70% | 2 | +7 | 55% | 36 | 21 |
| Soldier | 253 | 8 | 17 | 65% | 4 | +9 | 65% | 42 | 27 |
| Elite | 434 | 16 | 18 | 60% | 8 | +11 | 75% | 53 | 38 |
| Boss | 1738 | 16 | 19 | 55% | 32 | +12 | 70% | 54 | 39 |

## 4. Every level, measured with the fitted table

Squad of four against enemies of its level. Each fight cell: open ground · ground with cover.

| Measure | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Target |
|---|---|---|---|---|---|---|---|
| Standard fight: rounds to win | 4.8 · 5.7 | 4.2 · 5.0 | 4.3 · 5.5 | 4.3 · 5.3 | 5.1 · 5.4 | 4.4 · 4.8 | 4 to 6 |
| Standard fight: won | 100% · 98% | 100% · 100% | 100% · 100% | 100% · 100% | 100% · 100% | 100% · 100% | about 90% |
| Standard fight: fights with someone Downed | 20% · 35% | 2% · 15% | 12% · 22% | 3% · 12% | 15% · 42% | 3% · 13% | about 33% |
| Elite fight: rounds to win | 5.5 · 6.3 | 4.8 · 6.0 | 5.1 · 6.2 | 5.0 · 6.2 | 5.2 · 6.7 | 4.6 · 5.6 | 6 to 8 |
| Elite fight: won | 97% · 97% | 100% · 100% | 100% · 98% | 100% · 100% | 100% · 100% | 100% · 100% | – |
| Elite fight: characters Downed a fight | 0.8 · 0.9 | 0.2 · 0.5 | 0.4 · 0.8 | 0.2 · 0.6 | 0.6 · 0.8 | 0.1 · 0.3 | – |
| Boss fight: rounds to win | 9.0 · 9.6 | 7.7 · 8.6 | 7.2 · 8.8 | 7.1 · 8.9 | 7.9 · 9.9 | 6.5 · 9.2 | 8 to 10 |
| Boss fight: won | 97% · 97% | 98% · 98% | 98% · 98% | 98% · 100% | 100% · 95% | 100% · 100% | – |
| Boss fight: characters Downed a fight | 1.3 · 1.5 | 0.9 · 1.0 | 0.8 · 1.1 | 0.4 · 0.7 | 0.7 · 1.1 | 0.2 · 0.8 | – |

One character alone on open ground, under fire from enemies with a Soldier's (or an Elite's) numbers that never go down, for 10 rounds. "Lasts" is the rounds before the one it went Down in (never Down counts as 10). Each cell: rounds it lasts · fights in which it was Down by the end of round 3.

| Measure | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Target |
|---|---|---|---|---|---|---|---|
| Yardstick under 2 soldiers | 3.3 · 27% | 3.1 · 25% | 3.2 · 18% | 3.0 · 27% | 3.1 · 22% | 3.0 · 25% | 3 rounds |
| Yardstick under 1 elite and 1 soldier | 3.2 · 30% | 3.2 · 25% | 3.4 · 25% | 3.4 · 22% | 3.5 · 23% | 3.6 · 17% | 3 rounds |
| Tank under 2 soldiers | 6.1 · 2% | 9.8 · 0% | 9.9 · 0% | 9.8 · 0% | 9.1 · 0% | 8.1 · 0% | noticeably longer |
| Tank under 1 elite and 1 soldier | 5.8 · 8% | 8.6 · 0% | 9.5 · 0% | 9.5 · 0% | 9.3 · 0% | 9.2 · 0% | noticeably longer |

The level gap: the standard fight against enemies above and below the squad.

| Measure | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Target |
|---|---|---|---|---|---|---|---|
| Enemies 3 levels above: won, open · cover | 67% · 30% | 58% · 47% | 68% · 50% | 78% · 62% | 75% · 57% | (20 is the top) | under 50% |
| Enemies 2 levels above (the Narrator's hardest shift): won, open | 90% | 87% | 93% | 90% | 90% | – | – |
| Enemies 3 levels below: rounds to win, open | – | – | 3.2 | 3.3 | 3.4 | 3.6 | – |
| Enemies 5 levels below: most hits any enemy took | – | – | 1 | 1 | 1 | 1 | 1 |

## 5. The tuning, round by round

Each round moved as little as possible, and was measured with 30 fights a cell at all six levels.

| Round | What was off | What moved | What it did | Kept? |
|---|---|---|---|---|
| 0 | The first table, measured. Standard fights got shorter with level (5.3 rounds at level 1, 3.7 at level 20, open ground). Elite fights 3.9 to 6.1, boss fights 5.3 to 9.6. The yardstick lasted 2.4 to 2.7 rounds under 2 soldiers. A level 1 squad lost 1 boss fight in 4. | Nothing | | |
| 1 | Fights too short from level 3 up: a squad grows faster than the yardstick the table was built on. | HP by level only. It now runs ahead of armour: ×1.16 at level 3 (was ×1.09), ×1.38 at 6 (×1.27), ×1.54 at 9 (×1.40), ×1.74 at 12 (×1.56), ×1.81 at 20 (×1.60). | A Soldier takes 3.68 to 3.95 yardstick hits from level 3 (was 3.5), an Elite 7.3 to 7.8 (was 6.9): the top of your ranges. Standard fight at level 20: 3.7 to 4.3 rounds open. Elite fights about half a round longer, boss fights 0.4 to 1.8 longer from level 3. | Yes |
| 2 | The yardstick lasted 2.4 to 2.7 rounds, not 3, and was Down by the end of round 3 in half the fights. | Trial: Soldier damage ×0.75 (was ×0.85), Elite ×1.0 (was ×1.15). | The yardstick lasted 3.2 to 3.8 rounds: more than asked. Someone Downed in a standard fight: 13% of fights. | No: too far |
| 3 | The opposite question: what would it take to put someone Down in 1 standard fight in 3? | Trial: Soldier ×0.95, Elite ×1.3. | Someone Downed in 42% of standard fights, 98% won, elite fights 6.0 to 7.5 rounds with cover, enemies 3 levels up beaten only 26% of the time. But the yardstick lasted 1.7 to 2.0 rounds and was Down by the end of round 3 in 83% of fights. | No: breaks the 3 rounds |
| 4 | Enemies 3 levels above still beaten 54% of the time on open ground. | Trial outside the table: the level gap at 2 to hit a level instead of 1. | Enemies 3 levels up: won 18% open, 13% cover. Enemies 2 levels up (the Narrator's hardest shift): won 36%, where it was 73%. | Not mine to keep: see question 2 |
| 5 | Settle the damage between rounds 2 and 3. | Soldier ×0.78, Elite ×1.05 (8% under the first table). | The yardstick lasts 3.0 to 3.4 rounds under 2 soldiers and 3.0 to 3.5 under an elite and a soldier, at every level; Down by the end of round 3 in 1 fight in 4. | Yes |
| 6 | Boss fight at level 1: 2.1 to 2.5 of 4 characters Downed a fight, 13 to 30% of fights lost. | Boss damage ×1.2 (was ×1.4). | Level 1: 1.1 to 1.5 Downed, 0 to 3% lost. But the fights got about half a round shorter at every level (7.9 on average, was 8.3). | Yes, with round 7 |
| 7 | Boss fights now a little short. | Boss HP 960 (was 900). | Boss fights back to 8.4 rounds on average: 9.1 and 9.6 at level 1, 6.1 and 9.1 at level 20 (open and cover). | Yes |
| Final | | The table of rounds 1, 5, 6 and 7, measured again with 60 fights a cell. | Section 1 and section 4. | |

In all, the fit changed one column (HP by level) and four cells (Soldier, Elite and Boss damage; Boss HP).

## 6. What is still off, and why the table cannot close it

1. **Elite fights are about a round short on open ground** (4.6 to 5.5 rounds; target 6 to 8). With cover they are 5.6 to 6.7.
   - Why not more HP: an Elite already takes 7.3 to 7.8 yardstick hits and a Soldier 3.68 to 3.95. One more step and a Soldier takes 5 hits, an Elite 9.
   - The cause is the squad. Alone against one Elite, the plain rifleman needs 4.4 to 4.7 rounds; the optimised gun needs 2.3 to 2.6. Its long rifle deals 170 to 224% of the yardstick's damage, where your answer A2 puts an optimised gun a bit under 150%.
   - **Closed by:** the weapon step (base damage by weapon family). After it, run the fit again.
2. **Boss fights are short on open ground from level 3** (7.1 to 7.9 at levels 3 to 12, 6.5 at level 20; target 8 to 10). With cover they are 8.6 to 9.9, and at level 1 they are 9.0 and 9.6.
   - Same cause, same step. I did not raise Boss HP further: it would push the fights with cover past 10 rounds, and the level 1 fight with them.
3. **A standard fight is too safe:** won 99 to 100% of the time (target about 90%), someone Downed in 16% of fights (target 33%).
   - This target and "a character lasts 3 rounds under fire" pull against each other. The trials in section 5 give the trade (30 fights a cell, all six levels together):

   | Soldier · Elite damage | The yardstick lasts, under 2 soldiers | Down by the end of round 3 | Someone Downed in a standard fight | Standard fights won | Enemies 3 levels up beaten (open) |
   |---|---|---|---|---|---|
   | ×0.95 · ×1.3 | 1.7 to 2.0 rounds | 83% of fights | 42% | 98% | 26% |
   | ×0.85 · ×1.15 (the first table's) | 2.4 to 2.7 rounds | 50% | 24% | 100% | 54% |
   | **×0.78 · ×1.05 (fitted)** | **3.0 to 3.4 rounds** | **24%** | **16%** | **100%** | **73%** |
   | ×0.75 · ×1.0 | 3.2 to 3.8 rounds | 12% | 13% | 100% | 77% |

   - I held the 3 rounds. It is the target you defined most exactly (your answer A1), and it depends on the table alone: one plain rifleman, enemies that never fall. The other two depend on what a squad of four can do, and the weapon, defence and Calls steps all move that.
   - Why a squad is safer than one rifleman: four enemies spread their fire over four characters, the tank draws part of it and barely feels it (it lasts 8 to 10 rounds where the rifleman lasts 3), and every round one enemy fewer is shooting.
   - **Closed by:** your call in question 1, or by the weapon step (longer fights put more people down) and the defence step (the tank).
4. **Enemies 3 levels above are still beaten** 58 to 78% of the time on open ground and 30 to 62% with cover (target: lost more often than won).
   - Three levels of the table are worth little by design: the table is built so that an equal enemy feels the same at every level, so a level adds 3 to 7% HP below level 13, almost none above it, and about 3% damage. Almost all of the gap is the ±1 to hit a level.
   - **Closed by:** the level gap rule, which is not part of the table (question 2).
5. **Fights get safer as the squad levels, though the table is flat for the yardstick.** Characters Downed in a boss fight: 1.4 a fight at level 1, 0.5 at level 20.
   - A Soldier's hit through the rifleman's Class 3 armour is 8 at level 1 and 27 at level 20, and his HP goes from 145 to 445: the same share. Through a caster's Class 1 armour the same hit is 18 and 38, while the caster's HP triples. Armour is a fixed number and gear has no levels yet, so light armour is worth less at level 1 than it looks and the casters are the ones who go down early.
   - Measured alone against one Elite at level 1: the Sigil caster wins 15% of the time, the Outburst caster 10%, the plain rifleman 100%.
   - **Closed by:** Equipment 2.0 (armour by level), or the defence step. Not the enemy table: any level column that is fair to the casters is unfair to the rifleman.
6. **An enemy attack is worth about 5 HP, not the 24 of recommendation B7.** A Soldier's shot does 8 through Class 3 armour at 65%. The 3 rounds target fixes what 2 soldiers may do in a round (about a third of 145 HP), and a soldier shoots two or three times a turn. Both cannot hold while an enemy has 6 AP of rifle fire.
   - **Closed by:** the AP step, if enemies are to make fewer, heavier attacks. Until then, "an enemy attack prevented" on the action price list is worth about a fifth of what is listed.
7. **The tank may be too hard to kill:** 6 rounds under 2 soldiers at level 1 and 8 to 10 from level 3 (the measure stops at 10), against the rifleman's 3. That is your item 14 and the defence step.

## 7. Three fights to play in the Proving Ground

Each one is solo, with the test fighter, and takes a few minutes. Set the fighter up with the tools (level, skills, gear), then spawn the enemies. An enemy spawned with the level left empty is your level.

1. **Three rounds under fire (level 1).**
   - You: level 1, Dexterity 4 and Endurance 4 (145 HP), a Hellraiser service rifle, Class 3 armour.
   - Enemies: 2 Soldiers with service rifles, level left empty. Stand in the open about 4 to 6 tiles from them and trade shots. Do not use cover.
   - You should see: your shots at 65%. Each hit does 40 to a Soldier (140 HP), so the fourth hit drops him. Their hits do 8 through your armour (23 before it), about 65% of the time, two or three shots each a turn. You lose roughly 45 HP a round. If you killed nobody you would go down in round 4; killing one of them by round 3 should let you win with little left.
   - Tell me: did 3 rounds feel like enough time to do something, and did 4 hits on a Soldier feel right or like a slog?
2. **The level gap, both ways (level 6).**
   - You: level 6, Dexterity 6, the same rifle and armour (the simulator's rifleman has 190 HP at this level).
   - First spawn a Soldier and set its level to 1. Any hit that hurts it should take it out at once.
   - Then spawn a Soldier at level 6. Four hits at 65%, and it hits you for 11 through your armour.
   - Then spawn a Soldier at level 9. You should hit it about 4 times in 10 and need 5 hits (216 HP); it hits you about 8 times in 10 for 14. One of them is a hard duel; two should feel like a fight to leave.
   - Tell me: does 3 levels up feel like "run", or only like "harder"? (The simulator says a full squad still beats it more often than not: question 2.)
3. **One Elite, alone (level 6).**
   - You: the same level 6 rifleman.
   - Enemy: 1 Elite with a Legion bullpup, level left empty: 331 HP, armour 13, Defense 14.
   - You should see: your shots at 60%, 44 a hit, the eighth hit drops it. It hits you 75% of the time for 18 through your armour. The simulator's rifleman wins this every time, in 4 to 5 rounds.
   - Then swap the service rifle for a long rifle and fight it again. The simulator's optimised gun wins the same fight in 2 to 3 rounds. That difference, not the Elite, is why the elite and boss fights come out short.
   - Tell me: is the service-rifle fight the right length for an Elite, and does the long rifle feel like the same game?

If you have three friends or a room with four characters, the fourth fight is the one the targets are written for: a standard fight (3 Soldiers and 1 Elite at your level). It should take 4 to 6 rounds, and somebody should be in trouble by the end of it about one time in three. Today the simulator says one time in six.

## 8. Questions for Leon

1. **Three rounds under fire, or someone Downed in one fight in three?** The table can give one or the other today (the trade is the table in section 6, item 3). I built the 3 rounds. If you would rather have the danger now, the change is two numbers: Soldier ×0.95 and Elite ×1.3 gives 42% of fights with someone Downed and a rifleman who lasts 2 rounds. My recommendation: keep the 3 rounds, and look at this row again after the weapon step.
2. **Should a level be worth 2 to hit instead of 1 across the level gap?** With 1 (built), enemies 3 levels up are beaten 58 to 78% of the time on open ground, and enemies 2 levels up, the hardest fight the AI Narrator can ask for, 87 to 93%. With 2 (tried in the simulator before the damage was lowered, not built) those were 18% and 36%. My recommendation: yes, 2 a level, and then the Narrator's hardest shift may need to come down from +2 to +1.
3. **Is a boss fight at level 1 meant to cost someone?** It now puts 1.3 to 1.5 of four characters Down and is lost 3% of the time (it was 2.2 to 2.5 Down and 17 to 27% lost). By level 20 it is 0.2 to 0.8 Down. My recommendation: this is right for level 1; the high levels are too safe and that is item 5 of section 6.
4. **Companions grew with the table:** at their owner's level 20 the drone has 54 HP and the beast 109 (48 and 96 this morning; 30 and 60 at level 1, which you settled). Still to confirm, as before.

## 9. Where things are, and how to run it again

1. The table: `data/enemies.json` (`items` for the tiers, `levels.table` for the levels). Every number is flagged provisional.
2. The rules text and the working: `docs/rules/PHC-Core-Rules-v1.0.md`, "Rules revision 1.15", parts "The table", "The working" and "The fit"; section 14, items 1016 to 1018 and 1023 (updated) and 1025 to 1030 (new).
3. Every number behind this report: `balance-sim-step1.json`, beside this file (the fitted table at 60 fights a cell, the first table and each trial at 30).
4. The whole baseline run again on the fitted table (every build, every angle; 17 minutes): `balance-sim-step1-full.md` and `.json`, beside this file. This is the "before" for the next step of the pass. Its headline numbers: optimised gun 170 to 224% of the yardstick on the range, optimised blade 111 to 140%, Sigil 64 to 149%, Outburst 67 to 117%; a critical is ×1.6 at level 1 and ×1.8 at level 20; the biggest hit in any fight was 482 (a critical Sigil Line at level 20).
5. To measure the table again after any change (about 20 minutes for 60 fights a cell, 10 for 30; `BALANCE_FIT_LEVELS=1,20` runs only those levels, so three commands side by side take a third of the time):
   `BALANCE_FIT_OUT=<folder> BALANCE_FIT_N=60 npx vitest run --root packages/engine test/balance/step1-fit.test.ts`
   To try a table without touching the data file, add `BALANCE_FIT_TABLE=<file>`; `packages/engine/test/balance/fit.ts` says how.
6. Tests: `packages/engine/test/enemy-levels.test.ts` pins the table's numbers; `packages/engine/test/balance/step1-fit.test.ts` checks at every reference level that the yardstick still needs 1, 2, 4 and at most 8 hits and still hits a Soldier 65% of the time, so a later change that breaks a target fails `npm run check`.

## 10. The review (11 Nov 2026, after the build and the fit)

A second pass read "Rules revision 1.15" sentence by sentence against the code and the tests, tried to break it, and worked the numbers again by hand. The table's numbers did not change. `python3 tools/validate.py data` prints 0 errors and `npm run check` is green.

**1. The numbers hold.** Worked again from the data file and read from the game's own attack card, for the plain rifleman against an enemy of his level:

| Level | Rifleman: damage a hit · HP | Hits to kill: Vermin · Minion · Soldier · Elite · Boss | He hits them | Soldier: HP · armour · Defense | Soldier's hit before · after Class 3 armour (15) |
|---|---|---|---|---|---|
| 1 | 45 · 145 | 1 · 2 · 4 (3.50) · 7 (6.86) · 28 | 70 · 70 · 65 · 60 · 55% | 140 · 5 · 11 | 23 · 8 |
| 6 | 57 · 190 | 1 · 2 · 4 (3.78) · 8 (7.52) · 31 | 70 · 70 · 65 · 60 · 55% | 193 · 6 · 13 | 26 · 11 |
| 12 | 70 · 288 | 1 · 2 · 4 (3.94) · 8 (7.74) · 31 | 70 · 70 · 65 · 60 · 55% | 244 · 8 · 16 | 32 · 17 |
| 20 | 72 · 445 | 1 · 2 · 4 (3.95) · 8 (7.75) · 32 | 70 · 70 · 65 · 60 · 55% | 253 · 8 · 17 | 42 · 27 |

Every cell matches the "fitted" column of section 1 and the spec's working table. The fit was run again at level 6 (60 fights a cell, 4 minutes) after the fixes below and gave the same numbers to the decimal: standard fight 4.3 and 5.5 rounds, elite 5.1 and 6.2, boss 7.2 and 8.8, the rifleman 3.2 and 3.4 rounds under fire, enemies 3 levels up beaten 68% and 50%.

**2. Nothing is absurd at equal level with the weapon each tier was fitted with.** No tier is out of reach (the rifleman hits a level 20 Boss 55% of the time), every tier can hit back (a Minion 55%), and the hardest fitted hit, a Boss's critical at level 20, is 66 through Class 3 armour against 445 HP. Two weapons break this when a Narrator hands them to an enemy (item 6 of the list below).

**3. What was broken, and is fixed**

| # | What | How it showed | The fix |
|---|---|---|---|
| 1 | A level that was not a number became level 1 | A fight started with an empty level field, `true` or an empty list fought at level 1 instead of the squad's level 6 | Only a number (or text that is a number) is a level; anything else is no level |
| 2 | A level set by hand still took the shift | Level 9 with a shift of +2 made a level 11 fight | A level given outright is the fight's level |
| 3 | A fight could carry pinned numbers for an enemy | A test tool (`fixed`) was open to any fight a Narrator starts; an empty one left an enemy with no HP at all | The game ignores it; only the tests can turn it on, and numbers that are not numbers pin nothing |
| 4 | A campaign file could not give a level | The rule says it may; nothing read one | `level` on an encounter, on an encounter's enemy and on a zone's person is read |
| 5 | The spawn tool used the fight's opening level | A fighter levelled from 4 to 15 in the middle of a Proving Ground fight still spawned level 4 units, while the rule says "the squad's level" | Empty is the squad's level at that moment |
| 6 | A twin called in the middle of a fight was level 1 | At its owner's level 18 it took −5 to hit and enemies +5 to hit it; a twin called on the map instead dealt ×1.70 damage | A twin stands at its owner's level and deals its own damage, however it was called |
| 7 | The one-hit rule gave no warning and no reason | The card showed "damage 64" on a 1,546 HP Boss that the shot then killed | The card says "far below your level: any hit takes it out"; the log says why |
| 8 | The one-hit rule ran before other reductions | A reduction applied after it could have left the enemy alive | It is read after every reduction, and for damage that goes past shields too |
| 9 | The rule's name was a perk's name | "Outclassed" is the Authority perk | The rule is "far below" in the game and the spec |
| 10 | The critical had a ceiling and no floor | Nothing takes it under ×1.5 today, and nothing stopped it | A floor at ×1.5 |
| 11 | A whole-fight test ran out of time | Fights are longer now: 3 s alone, over 5 s when the suite is busy | Its limit is 20 s |

**4. Tried and found sound:** characters of levels 1 and 20 in one fight (level 10; each reads its own gap); an empty squad (level 1); a fight started with a level of 0, 99, a word or none; one enemy with its own level; an unknown tier (a Minion); a save from before the change, in the middle of a fight (its units keep their numbers and stand outside the gap) and after it (the next fight uses the table); enemy Sigil and Soul casters; the drone and the beast; Vermin in the drop tables, the Narrator's two tier lists and the spawn tool; every perk and every trait on one sheet with Perception 10, Dexterity 10 and a Masterwork weapon, with every weapon in the game (the critical stays between ×1.5 and ×2.0); an enemy's critical (×1.5; the card and the hit agree at levels 1, 12 and 20); the same seed twice (the same fight).

**5. Found and not fixed** (each is in a file this pass did not own; spec section 14, items 1031 to 1038)

1. **A spell's critical is still ×2**, for characters and enemy casters. The spec's Sigil rule says "× the Critical multiplier"; the game doubles.
2. **Spells do not read the level gap.** The ±1 to hit a level is on weapon attacks and techniques only. The simulator's squad has a Sigil caster, so some of "3 levels up is still beaten" is this.
3. **The area map shows an enemy's level 1 HP** (a Soldier reads 140 HP on the map and has 244 in the fight at level 12). One line in the map screen.
4. **Breath Held is not on the card:** the card shows the critical without One Shot's +25%; the hit has it.
5. **Vermin are missing from three lists that name tiers one by one:** the "rank-and-file" order perk, the turret difficulty table, the Proving Ground's waves.
6. **Two weapons end a soft character in one hit** when an enemy carries them: at level 1 a Boss deals 108 with a Blackpoint 700 and 132 with a breacher tube, before armour, against 100 HP.
7. **A Sigil caster's heals and shields grow with its damage factor**, so a Soldier-tier adept heals ×0.78 of what a Minion-tier novice would.
8. **`npm run try` sets a level without spending its points**, so a level 20 fighter there hits a level 20 Soldier 35% of the time. The table above is read from the simulator's built characters.
9. **The campaign format page** does not list the new `level` fields yet.
10. **The game cannot tell an AI Narrator from a human one**, so a level given outright is accepted from either. The AI is never offered the field.

**6. For Leon** (beside the four questions of section 8)

5. **Is a Boss spared the one-hit rule?** Today a level 20 character beside a level 1 one (the fight is level 10) takes a level 10 Boss out with one hit. Recommendation: spare the Boss and the Elite; they fall to the damage instead.
6. **Are spell criticals ×1.5 too?** Recommendation: yes, the same ×1.5 to ×2.0, in the magic step.
7. **Do spells read the level gap?** Recommendation: yes, at once; it is one line and it is part of why 3 levels up is not yet "run".
8. **Which weapons may an enemy carry?** Recommendation: leave the list, and bring the Blackpoint 700 and the breacher tube down in the weapon step.
9. **The optimised gun kills a Minion in one hit at equal level** (long rifle 75 a hit, Minion 70 HP), which your ruling "two attacks at least" forbids. The table holds the ruling for the yardstick only. Recommendation: the weapon step, not more Minion HP.
