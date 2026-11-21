# Critic: the second player's walk (0.34 rebalance, design phase, 21 Nov 2026)

For the lead. **Nothing here is built and nothing here is a redesign.** Four characters are walked from level 1 to 20 on the revised drafts (`01-scale.md` to `07-gear-perks.md`) under `00-rulings.md`, every point spent, and the findings are listed most serious first, each with its file, its section and a one-line fix. Every number in the walks is computed from 01's formulas by name (T4 `deal`, `mend`, `mp`, `damage_mult`; T5 profiles; T6 HP; T7a MP; section 7 plate; T9 grades) with a read-only calculator; none is typed on the old scale. Every number I propose is PROVISIONAL with its reason.

**Rules used for the walks** (00-rulings B11 to B13; 05 3.2): 38 Skill and 20 Attribute points, creation's 10 and 10 included; levels 4 and 14 give 2 Skill points, levels 5 and 15 give 1 Skill and 1 Attribute point, other odd levels 2 Skill, other even levels 1 and 1; ceiling 7 to level 4, 8 at 5, 9 at 10, 10 at 15; class at 3, rank II at 5, rank III at 15 with the class attribute at 8; a door's Reach step at 7 needs its beta at 4, the step at 10 the beta at 7 and the gamma at 4. Gear grade is 01 3.2's stated grade (Standard to level 5, Fine 6 to 9, Masterwork 10 to 15, Relic 16 to 20); the prayer grade is Devotion read on 05 4.1's hours against 05 2.2's level hours (standing 3 at hour 3.9, 5 at 9.6, 7 at 18.6, 10 at 31.6: Fine from level 5, Masterwork from 9, Relic from 13, Celestial from 17). A same-level Soldier's rifle hit is 18 x `damage_mult` (01 T12's tier table). "Solo" is 05's reference route (05 1.2, section 7: the clock and the calendar are solo).

**Facts about today I checked (data and code at `release/0.34-final`, worktree `E:/phc-wt/rel030`):**

- **A helping Call cannot be said to yourself.** `calls/core.ts:97`: `if (tgt === u && def.aim !== 'self-or-ally') return def.name + ' is for someone else.'` Aims in `data/calls.json`: Order `ally` (:55), Rally `ally` (:94), Brief `ally` (:134), Name It `self-or-ally` (:174), Cue `ally` (:216), Spot `enemy` but "you can't use it yourself" (:258), Warn `ally` (:300), Threaten `enemy` (:339), Taunt `enemy` (:379).
- **Survival puts no ally beside a solo character:** `data/survival.json` has no companion, hireling or ally row (searched). A solo character's only friendly unit is itself (and a Figment, for a Rigger).
- **Persuade is a fight action:** `tactics.ts:367` `PARLEY_VIA` (persuade: eloquence, threaten: intimidation, parley: charisma), `:383` Persuade puts the Brain debuff on a failed save. So Eloquence and Charisma act solo; Sensory, Reaction Speed and Authority have no fight verb but their ally Call.
- **Sensory's fight sense steps every 3 points:** `combat.ts:1212` senses an unseen foe within `1 + floor(sensory / 3)` tiles, while the card says "+1 to sense what you cannot see" a point (`skills.json` sensory `per_point.rows`).
- **Injury resistance:** `character.ts:770` `injuryResistPct` = 10 x (Endurance - 1); `combat.ts:1755` an injury is resisted on a d100 at or under it (90% at Endurance 10).
- **Ally-only Mender pieces:** Shield "an ally Bonded to you" (`tending.json:856`); Triage "a friend beside you or a Bonded friend" (`classes.json:4505`); Take the Weight "a Bonded ally" (`:2452`); Rally "not you" (`:2555`); Stand Behind Me "the ally directly behind you" (`:310`); Share a Hit "an ally next to you" (`skills.json` camaraderie unlock 1); Threads That Hold "Tending to the Bonded +50%; Bonds hold while you are Downed" (`perks.json:11997`).
- **The Miracle's price** is read at `faith.ts:69` (`MIRACLE_COST_LEVELS`, `patrons.json:98` `devotion_cost_levels` 5); Devotion is the prayer grade (01 T9, ruling A9).
- **The Evoker's overload lock** ends with the round (`sigil.ts:64`, `cb.round <= m.lockRound`): Overclock's price does not cost the next turn's Line (checked; not a finding).

---

## 1. The four walks

Columns: what was bought; what changed on the sheet and in the hands, with the files' numbers; felt solo / felt in a squad. "Blow" is the plain hit of the character's weapon; "cash-out" is the door's at its Reach.

### (A) A Bulwark who only wants to be a wall (Guard only, no Faith)

Creation: Endurance 7, Agility 4, Perception 2; Durability 6, Pain Threshold 4. Shield: the ram plate (18, 01 T3), Endurance x Durability on `melee` (01 4.1). Plate = 01 section 7 with 02 1(g)'s feed. Slam = plate (before the feed) x Bite x S(plates) per adjacent foe (02 1(c)).

| L | Bought | Sheet and hands | Solo | Squad |
| --- | --- | --- | --- | --- |
| 1 | creation | Reach 3, Bite 3.0; plate 5.8 against a Soldier hit of 18; Slam on 3 plates 52 a foe (1.2 shield blows of 43); Challenge, fork Provoke or Cover Them, perk steps at Durability 3, 6, Pain Threshold 3; HP 149 | yes | yes |
| 2 | Durability 7; Agility 5 | **Reach 4** (PT 4 met), a perk step; Slam 97 (1.8 blows of 54); HP 182 | yes | yes |
| 3 | Pain Threshold 5, Sensory 1; **the Bulwark** | Brace, Called Out, Hold Their Eyes; a PT perk, +6% HP; Sensory 1: Warn (ally only) and nothing in a fight solo | yes (class) | yes |
| 4 | Sensory 2, 3 | a perk step; sense +1 tile at 3 (`combat.ts:1212`); Sensory 2's new "a Warn that lands gives 1 plate" (02 1(g)) needs an ally | yes (perk) | yes |
| 5 | Endurance 8; Durability 8; **rank II** | Overbrace, fork; Retort (36 back for a plate and the reaction), Shrug It Off; plate 15.5, Slam 192, blow 107; HP 379 | yes | yes |
| 6 | Pain Threshold 6; Agility 6 | +6% HP and the feed; movement | yes | yes |
| 7 | Sensory 4, 5 | a perk; Reach 6's gamma gate met (opens at 15); Warn step 2 and 2 AP: ally only | yes (perk) | yes |
| 8 | Pain Threshold 7; Agility 7 | a perk (Second Wind); Reach 6's beta gate met | yes | yes |
| 9 | Sensory 6, 7 | a perk; sense +1 tile at 6 | yes | yes |
| 10 | Endurance 9; Durability 9 | Bite 3.5, a perk; plate 65, Slam 844 (2.1 blows of 403); HP 1,214 against a Soldier hit of 119 | yes | yes |
| 11 | Pain Threshold 8, 9 | a perk, +12% HP | yes | yes |
| 12 | Sensory 8; Agility 8 | Sensory 8: Warn step 3, ally only: **nothing solo**; the level is carried by the Attribute point (movement) | Attribute only | yes |
| 13 | Sensory 9, Athletics 1 | a perk; sense +1 tile; +1 Defense | yes | yes |
| 14 | Athletics 2, 3 | the door is full until 15 (all three at Endurance 9); +2 Defense, a perk | yes | yes |
| 15 | Endurance 10; Durability 10; **rank III** | **Reach 6**, Last Wall; Reforge, Anchor; Stand Behind Me (ally only); plate 211, Slam 4,502 (3.9 blows of 1,160); HP 3,827 against 340 | yes | yes |
| 16 | Pain Threshold 10; Perception 3 | Walking Wounded; HP 4,857 | yes | yes |
| 17 | Sensory 10, Athletics 4 | Skin Map | yes | yes |
| 18 | Athletics 5; Insight 2 | a perk; +10% on its stims | yes | yes |
| 19 | Athletics 6, 7 | a perk, +2 Defense | yes | yes |
| 20 | Athletics 8; Perception 4 | +1 Defense; plate 671 against a Soldier hit of 972; Slam 13,714 a foe (Relic; 02's 16,000 in Celestial); HP 10,816 | yes | yes |

Every level is felt, by pairing a dead point with a live one. **Solo, Sensory 1, 2, 4 and 8 do nothing in a fight** (Warn is ally only; the sense steps at 3, 6, 9), and B13 makes Sensory 4 the price of Reach 6: four points bought for a gate (finding 1). Stand Behind Me, Interpose, Cover Them and Close Guard are ally pieces too: the solo wall has a wall with nobody behind it, which still plays (Challenge and Hold Their Eyes turn every hit into plates), so the class keeps things only it can use.

### (B) A Breaker who also prays (Momentum to its top, prayer one step under)

Creation: Strength 7, Virtue 4, Endurance 2; Raw Power 6, Faith 4. The maul (27, 01 T3) on Strength x Raw Power; Rebuke (12, 01 T2b) on `blessing`, x the Devotion grade, x Grace's `1 + Bite x S(n)` (04 3(c)). No focus, no hand swap (04 3(j)).

| L | Bought | Sheet and hands | Solo | Squad |
| --- | --- | --- | --- | --- |
| 1 | creation | the chain x4, Bite 30%: blow 64, Coup 168 (2.6 blows); Grace 3, Bite +15%: a Rebuke with 3 Grace 25 for 1 AP; Faith 3's "Hymns open" waits on standing 3 (hour 3.9); HP 70 | yes | yes |
| 2 | Raw Power 7; Virtue 5 | a perk (x5 waits on Guts 4); +10% prayer | yes | yes |
| 3 | Guts 1, 2; **the Breaker** | Launch, Wrecker, Breach, Into the Wall, Hurl, Four Ways, Charge Carries, Barrel In, Wind-up; Guts: +1 Body and Fear save each, the feed | yes (class) | yes |
| 4 | Guts 3, 4 | **x5** (Coup 388, 3.2 blows of 120), a perk; standing 3 arrives in this level: Hymn I at Fine | yes | yes |
| 5 | Strength 8; Raw Power 8; **rank II** | Overswing, fork; Riposte, Read the Swing; Coup 519 | yes | yes |
| 6 | Faith 5; Virtue 6 | Witnessed | yes | yes |
| 7 | Guts 5, 6 | a perk | yes | yes |
| 8 | Faith 6; Virtue 7 | Grace's Bite +20%, a perk; Rebuke with Grace 168 | yes | yes |
| 9 | Guts 7, Intimidation 1 | a perk (x7's beta gate met); Threaten | yes | yes |
| 10 | Strength 9; Raw Power 9 | Bite 35%, a perk: blow 604, Coup 2,176 (3.6 blows); HP 453 | yes | yes |
| 11 | Intimidation 2, 3 | a landed Threaten gives a step (02 2(g)); a perk | yes | yes |
| 12 | Faith 7; Virtue 8 | a perk; the Miracle's Faith gate; Grace stays 3 (Conscience 0) | yes | yes |
| 13 | Intimidation 4, Conscience 1 | Threaten step 2; x7's gamma gate met; +10% shields received | yes | yes |
| 14 | Conscience 2, 3 | Clear Conscience, a perk | yes | yes |
| 15 | Strength 10; Raw Power 10; **rank III** | **x7**, Earthbreaker, Measured Blow, Unstoppable: blow 1,740, Coup 9,609 (5.5 blows); HP 1,273 | yes | yes |
| 16 | Conscience 4; Virtue 9 | **Grace 4** (Faith 7 met): Rebuke with Grace 1,452 | yes | yes |
| 17 | Faith 8, 9 | praying above your standing (the Push), fork; Bite +25%; standing 10 in this level (hour 31.6): the Miracle, prayers at Celestial: Rebuke with Grace 2,496 | yes | yes |
| 18 | Intimidation 5; Endurance 3 | Threaten at 2 AP, a perk; HP | yes | yes |
| 19 | Guts 8, 9 | a perk | yes | yes |
| 20 | Guts 10; Endurance 4 | Nothing Left to Fear: blow 5,302, Coup 29,268 (Relic); Rebuke with 4 Grace 4,468 for 1 AP; HP 4,360 | yes | yes |

Every level is felt; no point is dead (it never buys Authority, whose Order is ally only). **B's Momentum is the pure Breaker's, level for level**: x5 at 4, the Push at 5, Bite 35% at 10, x7 at 15, a Coup of 29,268 at 20. Its second door stops at Grace 4 (Grace 5 needs Conscience 7 and Authority 4: 7 more points than it has). It pays for prayer with HP (4,360 at 20 against 8,382 for a Breaker at Endurance 10 and Pain Threshold 4, 01 T6's formula): more cash-outs, the second weaker, not simply worse (finding 6 is about the specialist's side of that trade).

### (C) A Sigilist (Sigils only)

Creation (03 2(j)): Intelligence 7, Expression 3, Agility 2, Endurance 2; Brain Power 7, Rumination 3. FIRE (18, 01 T3) on `sigil`; Line = glyph x Bite x S(glyphs) (03 2(b)); the Line's AP is glyphs x the Glyph AP + the walk + 1 (03 2(c)).

| L | Bought | Sheet and hands | Solo | Squad |
| --- | --- | --- | --- | --- |
| 1 | creation | Lines of 3 at x3.28 (4 wait on Rumination 4): FIRE glyph 42, Line 139 in 4.7 AP; Flux 9; HP 70 | yes | yes |
| 2 | Rumination 4; Expression 4 | **Lines of 4** (x4.83): 249 in 5.8 AP | yes | yes |
| 3 | Rumination 5, 6; **the Sigilist** | Stored Spell, Barrage; a perk; Flux 12 | yes | yes |
| 4 | Rumination 7, Eloquence 1 | a perk (Lines of 5's beta gate met); Eloquence 1: +1 TN on a 2-AP Persuade, Brief ally only | yes (perk) | yes |
| 5 | Intelligence 8; Brain Power 8; **rank II** | Overclock (a Line of 5 at 7% of max HP), fork; Bleed the Flux, Core Change; Line 490 | yes | yes |
| 6 | Rumination 8; Expression 5 | +1 Flux (14); glyphs 0.6 AP: the Line of 4 in 5.4 AP | yes (Expression) | yes |
| 7 | Eloquence 2, 3 | a perk (Intelligence's other skills are at 8) | yes (perk) | yes |
| 8 | Eloquence 4; Expression 6 | Lines of 5's gamma gate met (opens at 15); glyphs 0.5 AP | yes (Expression) | yes |
| 9 | Eloquence 5, 6 | a perk; Eloquence 6's "a Brief vents 1 Flux" (03 2(g)) needs an ally | yes (perk) | yes |
| 10 | Intelligence 9; Brain Power 9 | Bite 0.95 (x5.10), core saving 3, a perk: Line 1,948; HP 453 | yes | yes |
| 11 | Rumination 9, Eloquence 7 | two perks | yes | yes |
| 12 | Pain Threshold 1; Agility 3 | +6% HP; the walk a third cheaper (Eloquence 8 would be Brief's step 3: ally only) | yes | yes |
| 13 | Eloquence 8, 9 | a perk | yes (perk) | yes |
| 14 | Pain Threshold 2, 3 | the door is full until 15; +12% HP | yes | yes |
| 15 | Intelligence 10; Brain Power 10; **rank III** | **Lines of 5** (x7.07), the Junction, Clean Draw, Payload, Backdraft: Line 7,784 in 5.5 AP; HP 1,502 | yes | yes |
| 16 | Rumination 10; Endurance 3 | Established Fact, a free word | yes | yes |
| 17 | Eloquence 10, Pain Threshold 4 | Closing Argument, a free word | yes | yes |
| 18 | Pain Threshold 5; Endurance 4 | HP | yes | yes |
| 19 | Athletics 1, 2 | +2 Defense | yes | yes |
| 20 | Athletics 3; Endurance 5 | a perk: Line 23,712 (Relic); HP 6,188 | yes | yes |

Every level is felt. **Solo, Eloquence 6 and 8 add nothing** (their only lines are Brief's), and Eloquence 1, 2 and 4 add +1 TN each on a 2-AP Persuade, under 07 4.1's felt bar; B13 asks for Eloquence 4 before Lines of 5 (finding 1). The specialist is clearly ahead in its own door: a Line of 5 at x7.07 against the two-door character's Line of 4 at most (05 3.3), which nobody else affords.

### (D) A Mender with a gun (Bonds to its top, Pressure one step under)

Creation: Insight 7, Agility 4, Endurance 2; Empathy 6, Dexterity 4. The drifter revolver (17, 01 T3) on Agility x Dexterity, the Attuner in the other hand (no swap, 04 1(j)). Snap All = 1.8 x `tend` x Bite x S(Bonds) in total (04 1(c)); Mend Yourself 2.25 x `tend` on `mend`; Dead Centre `1 + Bite x S(pips)` shots (02 3(c)); MP 01 T7a.

| L | Bought | Sheet and hands | Solo | Squad |
| --- | --- | --- | --- | --- |
| 1 | creation | 2 Bonds, Bite x1.3: Snap All 36 in total; revolver 24, Dead Centre on 3 pips 41; Mend Yourself 16 (12 MP of 88); Tending ties (Empathy 2) and Shield (5) need an ally; HP 70 | yes | yes |
| 2 | Empathy 7; Agility 5 | a perk (Bonds 3 waits on Camaraderie 4) | yes | yes |
| 3 | Camaraderie 1, 2; **the Mender** | the Ledger, the free Bond (Triage is ally only); +20% healing received; Share a Hit ally only | yes (class) | yes |
| 4 | Camaraderie 3, 4 | a perk; **Bonds 3**: Snap All 112 | yes | yes |
| 5 | Insight 8; Empathy 8; **rank II** | Overbind, fork; Inspire (a Bonded foe's face works solo); Take the Weight ally only | yes | yes |
| 6 | Dexterity 5; Agility 6 | Flush Out; revolver 86 | yes | yes |
| 7 | Dexterity 6, Athletics 1 | Bite 25%, a perk; +1 Defense | yes | yes |
| 8 | Dexterity 7; Agility 7 | a perk (Reach 4 waits on Athletics 4) | yes | yes |
| 9 | Athletics 2, 3 | a perk, +2 Defense | yes | yes |
| 10 | Insight 9; Empathy 9 | **Bite x1.6**, Mends a quarter cheaper: Snap All 695; Mend Yourself 164; HP 453 | yes | yes |
| 11 | Athletics 4, Camaraderie 5 | **Pressure Reach 4** (Broken): Dead Centre 693; a perk | yes | yes |
| 12 | Agility 8; Dexterity 8 | Overpress, fork | yes | yes |
| 13 | Camaraderie 6, 7 | a perk (Bonds 4's beta gate met); Hold Together (6) is ally only | yes (perk) | yes |
| 14 | Insinuation 1, Athletics 5 | a perk; Taunt at step 1 does nothing solo (you are already the only target) | yes (perk) | yes |
| 15 | Insight 10; Empathy 10; **rank III** | Brimming; Threads That Hold and Rally are ally pieces: **the Mastered perk and a rank III move dead solo**; Snap All 2,003 | yes (Brimming) | yes |
| 16 | Insinuation 2; Endurance 3 | Insinuation 2: modules for an Outburst it cannot cast; HP +12% | Attribute only | Attribute only |
| 17 | Insinuation 3, 4 | a perk; Taunt step 2; **Bonds 4**: Snap All 5,027 | yes | yes |
| 18 | Insinuation 5; Endurance 4 | a perk, Taunt 2 AP | yes | yes |
| 19 | Insinuation 6, Camaraderie 8 | a failed Taunt Bonds the foe free; Both Ways (8) ally only | yes | yes |
| 20 | Camaraderie 9; Endurance 5 | a perk: Snap All 9,000 (Relic), revolver 2,159, Dead Centre 5,057; Mend Yourself 1,586 (26 MP of 240); HP 4,760 | yes | yes |

Every level is felt, but **solo D spends seven points it cannot use** (Empathy 2 and 5, the Empathy 10 Mastered, Camaraderie 6 and 8, Insinuation 1 and 2), and three of the Mender's moves are ally only (finding 2). A solo Insight specialist is worse off still: its extra family points (Camaraderie 8 to 10 and Many Hands) are all ally pieces, so the two-door D is not behind it in its own door, it is ahead of it.

---

## 2. Findings, most serious first

### Serious

**1. Solo, five gammas' Calls are dead, and B13 makes four points of them the price of a door's top.** Warn, Cue, Order, Brief and Rally are `aim: ally` (`calls.json:300, :216, :55, :134, :94`) and a Call on yourself is refused (`calls/core.ts:97`); Survival gives a solo character no ally (`survival.json`), and 05's clock is solo. So for a solo player Sensory 1, 2, 4, 8, Reaction Speed 1, 2, 4, 8 and Authority 1, 2, 4, 8 do nothing in a fight, the door effects 02 and 04 put on them (a landed Warn gives a plate, a Cued shot lays a pip, an Order lays Grace: 02 1(g), 3(g); 04 3(g)) never fire, and B13's "gamma at 4" (02 0.1, 03 0.2, 04 0.3) makes them the toll for Guard's Reach 6, Pressure's Reach 5 and Grace 5; Eloquence 6 and 8 likewise (03 2(g)) for Lines of 5. Walk A buys four such points, C five. *Fix: the five helping Calls take `aim: self-or-ally` (the value exists: Name It, `calls.json:174`), on yourself at the step below your own (PROVISIONAL; reason: a soldier alone still reads the blow coming), so every gamma has a solo verb.*

**2. Solo, the Mender's door and class are built on a friend.** Tending ties (Empathy 2, 04 1(b)), Shield (5, `tending.json:856`), Threads That Hold (Empathy 10, `perks.json:11997`), Share a Hit and its heal-back, Hold Together (Camaraderie 6), Both Ways (8), Many Hands (10, 04 1(g)), and the class's Triage, Take the Weight and Rally (`classes.json:4505, :2452, :2555`) all need an ally. Solo the Mender keeps the Ledger, the free Bond, Inspire's enemy face and Brimming, so it still has things only it can use, but D spends seven points on nothing and an Insight specialist's last nine family points are all dead, so the specialist is behind the two-door character in its own door. *Fix (04 1(b), 1(g), 1(i)): Shield and Triage take "or yourself", Threads That Hold's +50% reads "Tending yourself while you hold a Bond", Hold Together and Both Ways gain a self half (a Share of a hit on you passes down a Bond to a Bonded foe; heals you take +25% while Bonded), PROVISIONAL; reason: the medic who works alone still mends through the thread.*

**3. The Miracle demotes every later prayer.** Devotion is the prayer grade (ruling A9, 01 T9: standing 10 is Celestial x1.75, 5 is Masterwork x1.3) and the Miracle costs 5 Devotion levels (04 3(c); `faith.ts:69`, `patrons.json:98`). At standing 10 one Miracle cuts every later prayer by about a quarter until the XP is earned back: 200 Devotion XP on 05's curve (`[..., 100 at 5, ..., 300 at 10]`, 05 4.1), about 21 hours at 05's pace of about 9.5 an hour (300 XP by hour 31.6); 04 3(c) says 13. B casts it at hour 32 and prays at Masterwork to the end of the calendar: a once-a-session reward that takes a grade back, so the right play is never to cast it. *Fix (04 3(c), 01 8): the Miracle's price stops at standing 7 (`devotion_cost_levels` read with a floor), so a Miracle costs the grade one step at most, PROVISIONAL; reason: the god's answer costs your standing, never your voice.*

**4. Overbrace has no consequence for the character it is built for.** Its price is an injury roll (02 1(d)); Endurance resists an injury 10% a point (`character.ts:770`, `combat.ts:1755`): 70% resisted at Endurance 8 when Overbrace opens (level 5), 90% at 10; Numb and Walking Wounded (Pain Threshold 3 and 10, 07 4.2, 4.4) take the cost out of the injuries that land, and Mark III makes it free once a fight. Walk A pays it about one Slam in ten. Law 5's Push price is gone for the wall. *Fix (02 1(d)): Overbrace's price is Bleeding on yourself (`conditions.json` bleeding, exists; S16's own fallback), which Endurance does not resist, PROVISIONAL; reason: the extra plate is your own body and it opens.*

### Important

**5. Slam at Durability 1 to 4 is not worth pressing.** 02 1(c)'s own table: 0.6 shield blows at Durability 1 and 1.0 at 4, for 2 AP and every plate you hold, while the Finisher (`1 + Bite x S(n)`, Coup 1.9 blows at Raw Power 1) and the Take (`1 +`, 1.44 shots at Dexterity 1) carry a plain hit inside them. C18's "a cash-out from point 1" exists for Guard but loses to the blow it replaces for any mixed wall. *Fix (02 0.2, 1(c)): Slam carries the `1 +` constant the other Body doors carry: one shield blow plus the plates' `Bite x S(n)` (walk A: 95 at level 1, 17,248 a foe at level 20 Relic, far under 100,000), PROVISIONAL; reason: the wall swings its shield as it throws its guard.*

**6. The specialist's lead in its own door is side perks, never the cash-out.** B13 lets B hold Momentum's top exactly when a pure Breaker does (x5 at 4, Overswing at 5, Bite 35% at 10, x7 at 15; Coup 29,268 at 20 in both): a door's top costs 21 points (alpha 10, beta 7, gamma 4) and a two-door character can afford one top and the second step-below. What the specialist's last nine family points buy (Guts 8 to 10, Intimidation 5 to 10) is perk steps, two Mastered perks and a faster Threaten. B13 does its job on the second door; on the first, "clearly ahead" holds only in HP. *Fix (02 2(g), 03 2(g), 04 1(g) and their siblings): each beta's 10 adds one door line that is not damage, "your cash-out keeps 1 unit" (read by S3), so the full family cashes out more often at the same top, PROVISIONAL; reason: the Coup has +2% of room under 100,000 (07 6.3), so a Bite step is not the answer.*

**7. 01 T11, and 07 6.3 which reads it, are on superseded Bites.** T11's sources read Guard Bite 1.40 at 9 and flag "cash-out 4 digits" (6,400 a foe), Bonds 1.4, Sigils 1.05 (01 10.2 "Sources used"); the drafts now say Guard 3.5 (02 1(b): 16,000 a foe Celestial), Bonds 1.6 (04 1(b)), Sigils 0.95 (03 2(b)). 07 6.3's "room left" (Guard +1021%, Sigils +2%, Bonds +635%) is therefore wrong in both directions. *Fix: re-run `tools/balance/scale.py` T11 on the current Bites; 07 6.3 re-reads its room from it.*

**8. 04 and 06 quote an old 05 clock and old Mark thresholds.** 04 0.2 and 3(e) give level 10 at hour 16, 20 at 40 and Devotion standings at 5.0 / 11.8 / 21.9 / 35.5; 05 2.2 and 4.1 give 11.9, 42.4 and 3.9 / 9.6 / 18.6 / 31.6. 06 3.2 gives map 1 to hour 3.0, endless at 2.4 hours a map and level-20 foes at hour 40; 05 1.3 gives 2.6, about 3 hours a map and 42.4. Door Mark thresholds: 03 2(e) 68 / 374 / 578 / 782, 04 1(e) 28 / 154 / 238 / 322 and 3(e) 38 / 209 / 323 / 437, against 05 4.2's 78 / 408 / 610 / 805, 33 / 175 / 262 / 345 and 44 / 233 / 349 / 460. Ruling D22 makes 05 the owner. *Fix: 03, 04 and 06 quote 05 2.2, 4.1 and 4.2 by name.*

**9. 07 6.1's scoping takes rewards off a live character's cash-outs.** Today every mod, boon, trait and property reaches a Finisher (01 10.1: today's `ctx.mults` multiply every hit); in 0.34 a cash-out counts only its door's own sources and the foe's mark, so a saved Relic property or boon that says "damage" stops reaching the Coup the player builds for, with no word on the card. *Fix (07 6.1, 6.4 Question): the lead rules scope or trim (07's own question); if scope, every mod, boon, trait and property card says "plain hits" and 05 8's migration notes name it.*

**10. A live character's Reach lost to C16 and B13 has no migration row.** 05 8 rebases points, ranks, XP, study and Devotion, but has no row for a 0.33 Bulwark's pool of 5 to 7 falling to its Durability's Reach, a Breaker's x5 falling to x4 at Guts under 4, One More Bond, stage 4 under Will Power 7 or Composure 4, or Broken at Dexterity 1 to 3. B15's headline says nothing is taken from a live character; C16 and B13 take these. *Fix (05 8): one row, its rule the lead's (new question 1 below).*

**11. Boons past the cap are counted as gains, and the one-shield wall has empty hours.** 05 7 and 06 3.4 say the boon cap is full near hour 29 and a Boss's boon past it is worth 0, yet 05 7's calendar lists "boon" as the hour's gain at 29, 32, 35, 39, 42, 45 and 49. 05's wall drills 21 weapons by hour 49 (ASSUMED play, 05 7 item 4); a wall that keeps one shield and one weapon and steps their grade at the Forge has **nothing at hours 8, 38 and 45**, and at 20, 30, 33, 40, 43 and 47 only a gate pick at a grade it already holds. *Fix (05 7, 06 3.4): the boon cap becomes slots before endless ships (critic-player 15), and the calendar adds a one-shield wall column.*

**12. Insinuation 1 and 2 are dead for a Mender.** Insinuation 2's modules (Anchor, Lure, Linger, 04 1(g) "kept") are Outburst modules, worthless without an Emanator; solo, Taunt at step 1 changes nothing (you are the only target). Walk D's levels 14 and 16 hold them. *Fix (04 1(g)): Insinuation 2 gains a Bonds line, "a Taunted foe saves against your Bond at -2", PROVISIONAL; reason: the barb opens the heart for the thread.*

### Minor

**13. Sensory's card does not match the fight.** "+1 to sense a point" (`skills.json` sensory `per_point`); the fight senses at `1 + floor(Sensory / 3)` tiles (`combat.ts:1212`), so points 1, 2, 4, 5, 7 and 8 add no sensing. *Fix (02 1(g)): the card reads "+1 tile sensed at 3, 6 and 9" from a number field, and the 3 leaves code.*

**14. 07's felt bar and 02's "felt" disagree on a +1 a point.** 07 4.1: "a +1 is a twentieth, under the felt bar"; 02 3(g) and 2(g) call Athletics' +1 Defense and Guts' +1 save a point felt. Walk A's levels 13 and 18 and D's 7 lean on them. *Fix (07 4.1): say that a per-point line is judged by its sum on the sheet (Athletics 3 is +3 Defense), not one point alone.*

**15. Faith 3's "Hymns open" waits on standing 3.** Devotion starts at 0 (ruling C19), so a character with Faith 3 at creation has no Hymn until hour 3.9 (05 4.1). *Fix (04 3(b)): the rung's text says "Hymns open with standing 3".*

**16. 02 section 5, level 6: "Strength 3: +10% shield blows" is false.** Shield rows read Endurance x Durability (01 4.1). *Fix: the cell reads "+5 kg carried".*

### What holds (checked, no finding)

- The gate swap (B12) lands the Attribute point and its ceiling together at 5 and 15 in all four walks; no Attribute point is ever held.
- B13 works as its own test on the second door: B stops at Grace 4, D at Pressure Reach 4, C's two-door sibling at a Line of 4 (05 3.3).
- No hour 0 to 50 is empty for B, C or D on 05 7's rows (words, found spells, Devotion standings, two doors' Marks); A is finding 11.
- Every class keeps something only it can use, solo or in a squad. No move I pressed is worse than the plain action of the same AP once its set-up is met (Retort 36 back for a plate at level 5, Overclock's lock ends with the round, `sigil.ts:64`).

**VERDICT: NOT READY: 0 unfelt levels across the four walks; 16 dead or trap points in the solo walks (A 4: Sensory 1, 2, 4, 8; B 0; C 5: Eloquence 1, 2, 4, 6, 8; D 7: Empathy 2, 5, 10's Mastered, Camaraderie 6, 8, Insinuation 1, 2), 1 in a squad (D's Insinuation 2); 16 findings (4 serious, 8 important, 4 minor).**

## Questions for the lead

1. **Does B15 ("nothing is taken from a live character") cover Reach a live sheet loses to C16 and B13** (finding 10)? Recommended: yes for one level: a 0.33 character keeps each door's Reach at its 0.33 number until its next level-up, and 05 8's notes say what it becomes then (PROVISIONAL; critic-player 12's proposal).

## Critics' findings

No finding in `critic-consistency.md` or `critic-player.md` names this file (it is new). Below: critic-player's 18, as this walk finds them in the revised drafts.

| Finding | Status in the drafts | Why |
| --- | --- | --- |
| player 1 (files on two scales) | FIXED, two leftovers | 02, 03, 04, 06 quote 01; 01 T11 reads old Bites (my 7) and 04, 06 an old clock (my 8) |
| player 2 (specialist never ahead) | FIXED for the second door | B13 (my walks B and D); on the first door the lead is side perks (my 6) |
| player 3 (the wide character) | NOT FIXED | ruling B14: flagged for Leon, not solved in 0.34 |
| player 4 (gates and the Attribute point) | FIXED | B12's swap, in 02 5, 03 2(j), 04 1(j) and 05 3.2 |
| player 5 (two focuses, one hand) | FIXED | 03 0.8 and 04's tables count the hands; ruling E: the camp sells a second |
| player 6 (the wall earns nothing; no cash-out below 5) | FIXED, one leftover | soaks fill Guard's Marks, Slam at 1 (02 1(c), 1(e)); Slam at 1 to 4 is under par (my 5) |
| player 7 (unfelt levels) | FIXED for these four | every level felt by pairing (section 1) |
| player 8 (dead points) | PARTLY | Body gammas' 2 and 6 got door effects that fire only on ally Calls (my 1); Insinuation 2 (my 12); Sensory's card (my 13) |
| player 9 (Mark I against class starts) | FIXED | "stacks" written in 02 1(e), 2(e), 04 1(e) |
| player 10 (class moves not worth pressing) | FIXED | Retort and Slam on 01's plate (02 1(c), 1(i)) |
| player 11 (the wall's empty hours) | PARTLY | a shield's drill by soaks (05 4.1); a one-shield wall still has hours 8, 38, 45 (my 11) |
| player 12 (rewards taken back) | NOT FIXED | ruled C16; no migration row (my 10), and two new: the Miracle (my 3), 07's scoping (my 9) |
| player 13 (Defense by level) | FIXED | A3; 01 3.3, 06 1.2 |
| player 14 (actions with too little consequence) | PARTLY | Conscience 4's wear fixed (04 3(g)); Overbrace is the new one (my 4) |
| player 15 (the boon cap) | NOT FIXED | 06 3.4 keeps it; 05 7 counts boons past it as gains (my 11) |
| player 16 (a level against the foes) | FIXED | 06 3.2: the map card shows the foes' level against the squad's |
| player 17 (damage that swings) | NOT FIXED | the client's text; no draft owns it |
| player 18 (two prayer counters, shared pips) | NOT FIXED | the client's text |

## Built from

| Fix (finding) | The existing piece and its data key | What must change |
| --- | --- | --- |
| Self Calls (1) | `calls.json items[].aim`, the value `self-or-ally` (`:174`), read at `calls/core.ts:97`, `:119`, `:186` | data: the aim of five rows and a self step row each |
| The solo Mender (2) | `tending.json` rows' target conditions; `classes.json` move rows' targets; `perks.json` threads_that_hold | data rows; ops that exist (`resource`, `mend`, `redirect`) |
| The Miracle's floor (3) | `patrons.json prayer.miracle.devotion_cost_levels` (`:98`), read at `faith.ts:69` | one number beside it (`devotion_floor` 7), read where the cost is paid |
| Overbrace's price (4) | `conditions.json` bleeding, put on yourself with `skip_save` (02 1(d)'s fallback) | data on the Push's condition row |
| Slam's `1 +` (5) | S3, the cash-out source; each door row's constant (02 0.2) | data: Guard's row constant 1 |
| The beta's 10 (6) | S2, the door ladder; S3 | a ladder row at the beta's 10 (data) read by the cash-out's spend |
| T11, the clock, the thresholds (7, 8) | `tools/balance/scale.py`, `pacing.py` | re-run and quote |
| Scope on the cards (9) | S12's `cash: true` field (07 6.1) | card text built from the field |
| The live Reach row (10) | 05 8's `GROWTH_REV` notes (`game.ts:650-660` `apply`) | one row |
| Boon slots (11) | `survival.json:219 boon_cap`, `run/power.ts:25` | 06's and 07's |
| Insinuation 2 (12) | `skills.json` implication unlock 2; `save_mod` (Between the Lines' piece, 07 4.2) | data |
| Sensory's card (13) | `skills.json` sensory `per_point.numbers`; `combat.ts:1212` | the typed 3 moves to a number field the card reads |
| Texts (14 to 16) | 07 4.1, `skills.json` faith unlock 3 text, 02 section 5 | text only |

## Needs a new primitive

None. Every fix is data on a piece that exists or on the merged list's S2, S3 and S12 (critic-consistency section 4); fix 3's floor is one key read by the reader that pays the cost today.

## What re-records

| What | Why |
| --- | --- |
| Nothing from this file alone | it changes no data |
| If fix 1: the Call tests and `golden-costs*` | five Calls may target their caller |
| If fix 2 or 12: the tending and class-move tests | targets and one Insinuation row change |
| If fix 3: the faith and Miracle tests | the price has a floor |
| If fix 4: the Overbrace tests (02's) | the price is Bleeding, not an injury roll |
| If fix 5: the Slam golden damage table (02's re-record) | Slam carries a shield blow |
| If fix 13: the sensing tests | the sense step reads data |
