# Critic: the third player's walk (0.34 rebalance, pass 3, 21 Nov 2026)

Read from the single source only: `python tools/balance/check.py` (147 PASS, 0 FAIL, 0 WAITING), its `--tables spend`, `calendar`, `doors`, `hits`, `hp`, `mp`, `plate`, `budget`, and the JSON in `tools/balance/bible/`. The numbers below were computed with check.py's own functions (`walk`, `Door.reach`, `Door.cash_amount`, `S.hp`, `S.mp_pool`, the world tiers), not typed. Data facts are cited file:line. Everything is PROVISIONAL; nothing here is fitted.

Foes by level, from `world.json` tiers on the enemy columns (HP / armour / hit):

| level | Soldier | Elite | Boss |
| --- | --- | --- | --- |
| 1 | 84 / 3 / 18 | 144 / 6 / 24 | 492 / 6 / 28 |
| 5 | 238 / 7 / 42 | 408 / 13 / 56 | 1,392 / 13 / 64 |
| 10 | 873 / 17 / 119 | 1,496 / 34 / 160 | 5,112 / 34 / 183 |
| 15 | 3,204 / 45 / 340 | 5,492 / 91 / 457 | 18,764 / 91 / 523 |
| 20 | 11,760 / 120 / 970 | 20,160 / 240 / 1,306 | 68,880 / 240 / 1,493 |

A solo standard room is 1.25 Soldier-equivalents, a squad of four's deadly room 9 (`--tables budget`).

## 1. The four walks

### (A) The wall (`pacing.spend_plans.wall`; Bulwark from level 3)

| level | sheet | press | cost | gets |
| --- | --- | --- | --- | --- |
| 1 | End 7, Dur 7, PT 3; HP 142; Reach 3 | Guard twice with the ram plate (2 plates an AP, capped at 3), then Slam | 2 AP + 2 AP, all plates | Slam 76 landed (plain 45); a plate soaks about 5.8 against an 18 hit |
| 5 | End 8, Dur 8, PT 7; HP 414; Reach 4 (+1 Overbrace) | Brace (2 AP, full), hold through their turn, Slam the rest; Overbrace | 2 + 2 AP; Bleeding on yourself | Slam 219, ring 968; the extra plate soaks about 16, the Bleeding costs about 6.5 a round |
| 10 | End 9, Dur 9, PT 8; HP 1,266 | the same loop; Retort on their turn | a plate a Retort | Slam 885, ring 3,703 |
| 15 | End 10, Dur 10, PT 9; HP 3,827; Reach 6 | Reforge refills 3 at turn start, Brace, Slam | 2 + 2 AP | Slam 3,733, ring 11,855 |
| 20 | Relic; HP 10,816 | as 15; PT 10 keeps a plate | 2 + 2 AP | Slam 11,371, ring 36,113 |

Solo: Warn, Interpose, Cover Them and Stand Behind Me all have their self half; the wall is fully usable alone. Next turn after a full Slam it stands on 0 to 1 plate: that is the real choice, and it holds at every level. In a squad of four the wall is the best thing in the room, too good: see finding 1. Levels 14 to 20 buy Raw Power 1 to 3 and Ingenuity 1 to 4: see finding 3.

### (B) The Breaker who prays (`spend_plans.breaker_who_prays`; Breaker from 3)

| level | sheet | press | cost | gets |
| --- | --- | --- | --- | --- |
| 1 | Str 7, Raw 7, Guts 3; HP 60; Reach 4; no Faith | maul blows to build, Coup | every tile walked and hit taken wears a step | Coup 181 at x4 (plain 69): a Soldier in one blow, the Elite (144) in one Coup |
| 5 | Raw 8, Faith 3; HP 139 | Charge (Charge Carries +2), Coup; Overswing; one Hymn | Off Balance a round; Hymn waits 8 rounds | Coup 538; Hymn 146 |
| 10 | Raw 9; Faith 3; HP 453 | as 5 | | Coup 2,257, Cleave 5,009; Hymn 534 once a fight |
| 15 | Raw 10, Guts 10 later; Faith 7; Reach 7 | x7 Coup or Cleave; Witnessed | | Coup 9,964; Hymn 2,150 |
| 20 | Relic; HP 4,673 (three Boss blows) | x7 Coup; the Miracle once (standing 10 at hour 31) | five Devotion levels | Coup 30,352; Hymn 7,858 |

Solo: everything works; the chain is worn by every hit on you, and alone every foe hits you (finding 8). In a squad it is the clean x7 Breaker; prayer is a once-a-fight Hymn and Whispers (finding 9). It is different from a pure Breaker (heals, shields, Witnessed, a Miracle), not simply worse, at the price of a frail bar.

### (C) The Sigilist (`spend_plans.sigilist`)

| level | sheet | press | cost | gets |
| --- | --- | --- | --- | --- |
| 1 | Int 7, BP 7, Rum 3; HP 100; Line of 3 | draw, step, draw, step, draw, Evoke | most of a turn, charge, 3 Flux | Evoke 148 (plain 49) |
| 5 | BP 8, Rum 7; Line of 4 (+1 Overclock) | Line of 4, Stored Spell for 1 AP | overload share of HP on Overclock | Evoke 521 |
| 10 | BP 9 | | | Evoke 2,033 |
| 15 | BP 10, Elo 9 or 10; Line of 5 | Line of 5, Payload on a crowd | Flux equal to glyphs | Evoke 8,126 |
| 20 | Relic | | | Evoke 24,753; a Break 6,165 from Ingenuity 4 |

Solo: Brief on yourself, nothing in the class needs an ally. In a squad Brief is the support verb. The specialist is clearly ahead (Line of 5, Stored Spell, Backdraft). The core cost after level 15 could not be read to an end from the bible (open question 2).

### (D) The Mender with a gun (`spend_plans.mender_with_a_gun`; Mender from 3)

| level | sheet | press | cost | gets |
| --- | --- | --- | --- | --- |
| 1 | Ins 7, Emp 7, Cam 3; HP 60; MP 88; Reach 2; no gun skill | Bond, Bond, Snap All; Mend Yourself | 1 AP a Bond (the foe saves), 12 MP a Mend | Snap 19, Snap All of 2: 41 split; 7 Mends a pool |
| 5 | Ins 8, Emp 8, Dex 4; MP 119 | free Bond, Triage, Take on the rifle | 10 MP Triage; Overbind 10% max HP | Snap All 162, Dead Centre 168 |
| 10 | Emp 9 (Mends a quarter cheaper) | | | Snap All 782; Take 616 |
| 15 | Emp 10 (fourth Bond), Dex 7 | Snap All of 4 | | Snap All 3,324; Take 2,139 |
| 20 | Relic; HP 4,673; MP 317 | | | Snap All 10,125 split; Take 8,079; 16 Mends a pool |

MP does not come back between fights (`data/survival.json:128`, `ammo_pack.mp` all 0; "you rely purely on syphon"), so 7 Mends at level 1 and 16 at level 20 are a choice across a map at both ends: holds. Solo, ruling 32's self halves cover Shield, Triage, Share a Hit, Both Ways and Take the Weight; Implication 1 does not (finding 4). In a squad of four the web of two foes and two friends pays 2,531 a Bond at level 20 for 1 AP: the Mender's best moment.

## 2. Findings, most serious first

### Serious

**1. A Slam on every foe beside you pays each of them a landed plain blow at any Reach, from Durability 1.** `body.json` `attributes.endurance.door.cashouts.slam_ring.formula` is `most_foes + plate x bite x cash(n) / plain`: the foe count is the constant 8, not the plates spent, `min` 1 plate, `rolls: false`. Momentum's Cleave (`strength.door.cashouts.cleave.targets`) reaches every foe beside you only at x5 (Raw Power 7 and Guts 4). In a squad of four's deadly room the wall among four foes lands four plain blows plus the weight for 2 AP every turn from level 3 (Brace); at level 5 that is about 540 landed against Soldiers of 238. A one-point Durability dip and a shield gives any melee character the same sweep for one plate: a strong action with no consequence, and the Breaker is not ahead in its own door's sweep. *Fix: `slam_ring` gets Cleave's `targets: min(most_foes, 1 + floor(cash(n)))`; the other foes beside you take the shove only.*

**2. Overbrace's price is no choice at level 5 or at level 20.** Price: Bleeding on yourself (`body.json` `attributes.endurance.door.push`). Bleeding does not stack (`data/conditions.json:39`), lasts 3 rounds (`:33`) and a stim ends it (`:37`); its tick (base 5, `:11`) x 0.6 on the deal column is about 6.5 a round at level 5 (bar 414) and 120 at level 20 (bar 10,816), refreshed, never doubled, when pressed every turn. The plate it buys soaks about 16 and about 450. It also breaks `scale.json` `costs.rules.share` ("HP you pay yourself is a share of your own max HP"). *Fix: `push.price_kind: share`, `numbers.hp_share: 0.1`, paid at the start of your next turn when the extra plate was spent, nothing soaks it (Overbind's shape, `soul.json` `attributes.insight.door.push`).*

**3. The wall's reference plan ends on seven trap points, and check (d) cannot see them.** `pacing.spend_plans.wall` spends levels 14 to 20 on `raw_power 3` and `ingenuity 4`. Shadow builds only Hidden and wears "your turn starts while a foe sees you" (`mind.json` `attributes.perception.door.wears`); the Bulwark's Challenge, Called Out and Hold Their Eyes exist to make every foe see it, so Ingenuity 1's felt line ("you were never targeted while you built it") is the opposite of this character. The wall's Coup reads Strength 4 x Raw Power 3 (ruling 31): plain 2,884 at level 20, under its own shield blow (3,534); a x3 Coup (5,509) after three blows of set-up is half a Slam (11,371). Sensory 9 and 10 and Athletics 4 and 5 stay unbought. The checker passes it because "felt" is a non-empty text (`tools/balance/check.py:638-639`). *Fix: the plan's last two rows become `["sensory", 10], ["athletics", 5], ["guts", 3]`; and `walk` refuses a point whose door's `wears` the plan's first door triggers by its own verbs (a `conflicts_with` list on the Shadow door naming Taunt-type builds).*

**4. Implication 1 is dead solo, and it is a point the Mender must buy for its top.** Taunted only forces the target and gives -2 to hit anyone else (`data/conditions.json:887-897`); alone you are the only target. The Mender buys Implication 1 at level 8 and gets Implication 2's Bond save penalty only at level 9; Implication 4 is Bonds' Reach-4 gate (`soul.json` `attributes.insight.ladders.empathy.points.10.needs`). Ruling 32: no point bought for a door's top is dead solo. *Fix: `soul.json` `attributes.insight.ladders.implication.points.1` gets a `solo`: "a foe you Taunt saves against your Bond at -1" (point 2's line, a step smaller).*

### Important

**5. The Miracle takes the Breaker's best Hymn back for about ten hours.** Standing 10 at hour 31 (calendar); the price is five levels (`soul.json` `attributes.virtue.door.miracle.price_levels`), so standing 5 at 100 XP (`pacing.tracks.devotion.thresholds`); Hymn III's standing 7 (185) returns about hour 41 at the calendar's pace (185 to 300 took hours 18 to 31, about 9 XP an hour); the next Miracle is near hour 54, past the calendar. Ruling 33 kept the grade, but the Hymn tiers still read the current standing. *Fix: `miracle.floor_standing: 7` (the price stops at the Hymn III gate), so the Miracle costs the next Miracle, never your best Hymn. Leon's call (it touches ruling 33).*

**6. Five door felt lines promise a Reach their family has not opened.** Raw Power 7 "x5" is bought at level 1 with Guts 3 (x5 at 2); Empathy 7 "a web of three" at 1 with Camaraderie 3; Faith 7 "four Grace" at 13, real at 16 (Conscience 4); Dexterity 7 "you Break a foe alone" at 13, real at 16 (Athletics 4), where Athletics 4 promises it again. Guard, Sigils, Shadow and Figments already say "if" or "once". *Fix: the 7-point `felt` of `strength.ladders.raw_power`, `agility.ladders.dexterity`, `insight.ladders.empathy`, `virtue.ladders.faith` and `determination.ladders.will_power` say "once your <beta> is 4"; `walk` fails a felt line that names a Reach whose `needs` are not met.*

**7. Check (e) counts a shop or Forge visit as a gain without asking whether the credits pay.** The wall's hours 8, 12, 18, 21, 26, 28, 34, 37 and 46 hold only a visit (hour 28: "the last shop before the Boss"). `pacing.credits` is printed (`check.py:1052-1064`) and never compared with `pacing.credits.grade_step`. *Fix: (e) counts a visit only when the credits earned to that hour x `credits.gear_share`, less what earlier visits spent, pay `grade_step` at the shelf's grade.*

**8. The Guts feed on the chain's wear has no reading.** `body.json` `attributes.strength.ladders.guts.feed` (`1 + 0.02 B + 0.01 A B`) "feeds the chain's wear", but wear is a whole step a tile and a hit (`strength.door.wears`). Alone every foe hits you, so before Wind-up (level 3) and Mark II (hour 11) a solo Breaker's chain is worn a step by every blow it takes. *Fix: a whole-number rule in its place: from Guts 4 the first hit each round wears nothing, from Guts 7 walking wears a step every two tiles.*

### Minor

**9. A two-door believer's Hymn is once a fight for thirteen levels.** `virtue.door.hymn_wait` is 8 rounds at Faith 3 and Virtue 6 (levels 4 to 12) and 6 at Faith 7; standard rooms are 5 rounds, hard 6.5. Today's rule (base 9, 0.75 a Faith) gives 6 and 4. Not wrong for a second door, but the prayer door's whole press is one Hymn a fight. *Fix: `hymn_wait.base: 9`.*

**10. Cleave says `rolls: false` and "the sweep rolls once".** `strength.door.cashouts.cleave`. *Fix: `rolls: true`, `margins: false`.*

**11. A lone Snap is 19 at level 1.** `soul.json` `attributes.insight.door.plain`: 13 to 19, against 45 to 69 for every other door; Bond and Snap is 2 AP. Check (a) passes it only because its band is 1 to 99. It is a healer's door, but the card should say so, or `plain.x` 1.5.

### What holds (checked)

- Every level of the four walks buys something with a felt line (check d), and every Attribute point lands with its ceiling at 5 and 15.
- Every class keeps something only it has, solo and in a squad (Brace and Hold Their Eyes; the room and Launch; the Stored Spell and Backdraft; the Ledger, Triage and the free Bond).
- MP is a choice at levels 1 and 20 (no refill between fights). Plates stay a choice at level 20 even with Brace and Reforge: a full Slam leaves you bare through their turn.
- Each specialist is ahead in its own door's Reach, and the two-door characters stop a step under on the second door.

## 3. The three numbers most likely to feel wrong in the first hour

1. **144**, the map-1 Elite's HP (`world.json` tiers on `enemy_hp`): a level-1 Line of three (148), a x4 Coup (181) or a ring Slam drops the gate Elite in one cash-out; the first beat of the game may be over before it is felt.
2. **19**, the Mender's lone Snap (finding 11): a quarter of the Breaker's blow, two AP with the Bond.
3. **5.8**, one plate's soak at level 1 (`scale.plate` with Pain Threshold 3's feed) against an 18 hit: two AP of Guard soak one Soldier blow.

## Open questions

1. Finding 5 is Leon's (ruling 33).
2. Sigils' core cost at level 15 to 20 (savings at Brain Power 2, 5 and 9, Barrage, word Mark I, burnt cores returned after every fight, `survival.json:128` `supply` and `cores_max`) is not computed anywhere in the bible; whether a core is still a choice at level 20 is unproven.

**VERDICT: NOT READY: 2 findings with dead or trap points (8 points: the wall 7 traps, the Mender 1 dead solo), 1 unusable solo, 0 unfelt levels; 11 findings (4 serious, 4 important, 3 minor).**
