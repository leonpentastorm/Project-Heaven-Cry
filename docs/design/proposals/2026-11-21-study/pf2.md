# Pathfinder 2e (2019, Remaster 2023): the tight, level-based curve, and what it means for PHC

*Fact-check pass: every checkable number in the brief matched the primary source. No numbers were changed. Edits are (a) "(reading)" tags on design-intent statements that were presented as fact, (b) "not verified" notes where I could not reach a primary source, and (c) two wording clarifications marked [fixed].*

## 1. Proficiency, level on everything, and the four degrees of success

**Proficiency bonus = rank + level.** The ranks are Untrained +0 (and no level added), Trained +2, Expert +4, Master +6, Legendary +8. (Verified: AoN Player Core, https://2e.aonprd.com/Rules.aspx?ID=2103 and the proficiency rules; Untrained = +0.) The bonus goes on attacks, AC, saves, Perception, skills, and spell DCs and attacks. Characters gain it on a class schedule. A typical martial is Expert in its weapons by about level 5, Master at 13 and Legendary at 19 or 20 (Fighters run about one rank ahead). (Class schedules not verified this pass.) Skill increases come at levels 3, 5, 7 and so on to 19; Rogues get one every level from 2. Over levels 1 to 20 a PC's main attack gains about +27: +19 from level, +6 from proficiency, +3 from runes and +2 to +3 from attributes. (That total is the researcher's arithmetic; not verified. A Fighter reaching Legendary gains more from proficiency than +6.)

**Four degrees of success.** You critically succeed if you beat the DC by 10 or more, succeed if you meet it, fail if you miss it, and critically fail if you miss by 10 or more. A natural 20 moves the result one step up and a natural 1 one step down. (Verified: AoN Step 4: Degree of Success https://2e.aonprd.com/Rules.aspx?ID=2286 and Natural 1 and Natural 20 https://2e.aonprd.com/Rules.aspx?ID=2287.) Most effects have all four outcomes written out: a critical Strike does double damage, and saves have critical-failure effects. Because of the +-10 band, **each +1 moves both the hit line and the crit line by 5%**. So +1 is worth about 10% more expected damage near the middle of the range, and more at the edges (my estimate). This is why a -2 off-guard, frightened 1 or a +1 status bonus decide fights (reading).

**Worked example (my arithmetic, using GM Core numbers; re-checked and correct).** A level 5 martial has 5 (level) + 4 (Expert) + 4 (Str +4) + 1 (potency) = **+14**. (This assumes Expert at level 5, true of Fighters and some classes, not all.) Combat creatures usually have High AC (reading: the book says most combat creatures do).

| Target (High AC) | Hit on | Hit % | Crit % | Feel |
|---|---|---|---|---|
| Level 1 (AC 16) | 2+ | 95% | 45% | mowing down |
| Level 5 (AC 22) | 8+ | 65% | 15% | a fair fight |
| Level 9 (AC 28) | 14+ | 35% | 5% (nat 20 only) | a wall |

The same thing happens in reverse. Take a level 5 PC with AC about 22 (approximate):
- A level 1 High attacker (+9) hits 40% of the time and crits only on a natural 20.
- A level 9 High attacker (+21) hits 95% of the time and crits 50% of the time.

**Four levels of difference roughly decide a fight.** That steepness is the curve (reading; consistent with the XP table below).

## 2. Attributes and the separate feat lists

**Attributes.** A starting key attribute is at most +4. Boosts come at levels 5, 10, 15 and 20, four different attributes each time (verified, Player Core classes chapter, https://2e.aonprd.com/Rules.aspx?ID=2098). Each boost adds +1, but at +4 or higher a boost is a "partial boost": it takes two to gain +1 (verified, AoN Character Creation, https://2e.aonprd.com/Rules.aspx?ID=2027). [fixed] The legacy rule worked on scores: +2 per boost below 18, +1 per boost at 18 or higher. Key attribute by level is +4 at 1, +5 at 10, +6 at 20 (derived from the partial-boost rule), and **+7 at level 20 if you take the apex item at 17** (the apex adds +1 or raises to +4, whichever is higher; verified in the ABP entry). Under ABP the apex is automatic at 17. Attributes add only about +3 over the whole career, so they are deliberately the smallest lever (reading: the intent is the researcher's inference).

**Feats by level (separate lists)** (from knowledge; level lists match the Player Core, not re-fetched):

| List | Levels |
|---|---|
| Class feats | 1 (some classes) and 2, 4, 6 ... 20 |
| Skill feats | 2, 4, 6 ... 20 (Rogues and Investigators get more) |
| General feats | 3, 7, 11, 15, 19 |
| Ancestry feats | 1, 5, 9, 13, 17 |
| Class features (proficiency raises, weapon specialisation) | fixed by class, no choice |

**What this structure does (reading).** The combat floor (proficiency, specialisation damage, runes) is automatic and cannot be traded away. A skill feat cannot be spent on combat, and a class feat cannot be lost to a social pick. Choices add options (new actions and reactions); they do not raise the core numbers. A badly built character is still on the curve, and a well-optimised one is only about +1 or +2 ahead. (The structure is fact; "what it does" and the +1/+2 figure are interpretation.)

## 3. Gear in the maths

**Fundamental runes** (weapon levels verified on AoN: +1 potency level 2, https://2e.aonprd.com/Equipment.aspx?ID=2830; +2 potency 10, +3 potency 16, striking 4, greater striking 12, major striking 19, GM Core weapon upgrade table, https://2e.aonprd.com/Rules.aspx?ID=3161; armour: resilient 8, +2 potency 11, greater resilient 14, +3 potency 18, major resilient 20 verified by search results; **+1 armour potency at level 5 not re-verified this pass**):

| Weapon | Item level | Armour | Item level |
|---|---|---|---|
| +1 potency (+1 to hit) | 2 | +1 armour potency (+1 AC) | 5 (not verified) |
| Striking (2 weapon dice) | 4 | Resilient (+1 saves) | 8 |
| +2 potency | 10 | +2 potency | 11 |
| Greater striking (3 dice) | 12 | Greater resilient (+2) | 14 |
| +3 potency | 16 | +3 potency | 18 |
| Major striking (4 dice) | 19 | Major resilient (+3) | 20 |

- **Property runes** (flaming and so on) take slots equal to the potency value, so the effects you can add are capped by the fundamentals. (Consistent with AoN: striking and resilient do not count against the limit.)
- **Striking is the felt spike (reading).** At level 4 weapon dice double: a 1d8 sword becomes 2d8.
- **Item levels:** the treasure tables assume each level the party gets permanent items around its level and level + 1, plus consumables and coin (GM Core treasure-by-level table; exact counts not verified).

**ABP is the proof (reading).** The Automatic Bonus Progression variant deletes fundamental runes and grants the same numbers by level (verified against https://2e.aonprd.com/Rules.aspx?ID=1357, GM Core pg. 83):

| Level | ABP grant |
|---|---|
| 2 | Attack potency +1 |
| 3 | Skill potency, one skill +1 |
| 4 | Devastating attacks: 2 dice |
| 5 | Defence potency +1 |
| 7 | Perception +1 |
| 8 | Save potency +1 |
| 10 | Attack +2 |
| 11 | Defence +2 |
| 12 | 3 dice |
| 13 | Perception +2 |
| 14 | Saves +2 |
| 16 | Attack +3 |
| 17 | Attribute apex |
| 18 | Defence +3 |
| 19 | 4 dice, Perception +3 |
| 20 | Saves +3 |

(The table omits the skill-potency grants at levels 6, 9, 13, 15, 17 and 20, which exist; it is a combat-relevant subset, correct as far as it goes.) Because ABP is a close one-for-one swap for the fundamental runes, gear can be read as **assumed maths, not optional power** (reading). In PF2 gear is a schedule, not a reward (reading).

## 4. The monster side (GM Core creature-building tables, AoN Rules ID 2874)

All AC, HP and Strike attack and damage figures below were checked against https://2e.aonprd.com/Rules.aspx?ID=2874 and are correct. **Spell DC column: not verified** (not fetched this pass).

| Level | AC (Ext / High / Mod / Low) | HP (High / Mod / Low) | Strike attack (E/H/M/L) | Strike damage (High, avg) | Spell DC (E/H/M), not verified |
|---|---|---|---|---|---|
| 1 | 19 / 16 / 15 / 13 | 24-26 / 19-21 / 14-16 | +11 / +9 / +7 / +5 | 1d6+3 (6) | 20 / 17 / 14 |
| 5 | 25 / 22 / 21 / 19 | 91-97 / 72-78 / 53-59 | +17 / +15 / +13 / +11 | 2d8+7 (16) | 26 / 22 / 19 |
| 10 | 33 / 30 / 29 / 27 | 215-223 / 171-179 / 127-135 | +25 / +23 / +21 / +17 | 2d12+13 (26) | 33 / 29 / 26 |
| 15 | 40 / 37 / 36 / 34 | 340-348 / 271-279 / 202-210 | +32 / +30 / +28 / +24 | 3d12+17 (36) | 40 / 36 / 33 |
| 20 | 48 / 45 / 44 / 42 | 465-473 / 371-379 / 277-285 | +40 / +38 / +36 / +31 | 4d10+22 (44) | 47 / 42 / 39 |

(Level 9, if useful: AC 31/28/27/25, High HP 190-198, Strike +23/+21/+19/+16. Level 9 High AC 28 matches the worked example.)

**How the columns are used** (the book's guidance; from knowledge, the wording was not re-read this pass):
- **Extreme** is world-class: most creatures have no extreme statistic, or only one.
- **High:** most combat creatures have High AC and either a high attack with high damage or a moderate attack with extreme damage.
- **Moderate** is the default.
- **Low:** most creatures have at least one low statistic, a deliberate weak point.

So a creature is a **profile of strengths and weaknesses around its level**, not a uniform scaling. AC and attack rise by about +1.4 to +1.5 a level (arithmetic from the table: High AC 16 to 45 over 19 levels). HP grows about x18 to x19 from level 1 to 20 (Moderate 20 to 375). A PC's damage grows by roughly x4 to x5 plus more hits and crits, so fights stay about 3 to 4 rounds long (my estimate, not verified).

**Encounter budget** (AoN Rules ID 2716, verified). Each threat level has an XP budget for 4 PCs, plus an adjustment per character above or below four:

| Threat | Budget for 4 | Per extra PC |
|---|---|---|
| Trivial | 40 or less | 10 or less |
| Low | 60 | 20 |
| Moderate | 80 | 20 |
| Severe | 120 | 30 |
| Extreme | 160 | 40 |

| Creature level vs party | -4 | -3 | -2 | -1 | 0 | +1 | +2 | +3 | +4 |
|---|---|---|---|---|---|---|---|---|---|
| XP | 10 | 15 | 20 | 30 | 40 | 60 | 80 | 120 | 160 |

**Why it works (reading; these four points are the researcher's analysis, not the designers' stated intent):**
1. **Cost doubles about every two levels** (fact: 40 to 80 over +2, 160 over +4), which matches the real power of a two-level gap, because every statistic sits on the same per-level grid. The price is the power.
2. **It is a sum, not a lookup.** Moderate can be two on-level foes, four at -2, one at +2, or a mix.
3. **Party size is linear and explicit.**
4. **The +-4 window** stops creatures that cannot be hit or are trivial.

Also, XP is fixed at 1,000 per level, and the same budget awards it (from knowledge; not re-fetched).

## 5. Inside the turn: three actions and the multiple attack penalty

- Each turn has 3 actions and 1 reaction. Most things cost 1 action; spells usually cost 2. (From knowledge.)
- The multiple attack penalty is **-5 on the second attack and -10 on the third or later** (verified, https://2e.aonprd.com/Rules.aspx?ID=2188; agile weapons reduce it, to -4 / -8 from knowledge). The third Strike is nearly worthless, so actions go to moving, Raise a Shield, Demoralize, flanking or Step (reading).
- This is a **diminishing curve inside a turn** (fact): the first action is worth the most, which makes the "other" actions real choices (reading).
- Bosses face the same rule, so the multiple attack penalty also caps a solo boss's output (reading; bosses often have extra actions and reactions that offset it).

## 6. Reception (all of this section is the researcher's summary of community opinion, not rules fact; no source was checked)

**Praised (reading):**
1. The encounter budget works out of the box. It is the system's most-cited strength.
2. Every +1 is felt because of the crit band, so buffs, debuffs, flanking and Aid are true teamwork.
3. Bad builds are not traps.
4. The silos protect combat power.
5. Fighting lower-level foes feels heroic, and higher-level foes feel terrifying.

**Criticised (reading):**
1. **The treadmill.** On-level numbers rise in step on both sides, so a level 10 fight against a level 10 foe is the same as a level 1 against a level 1. Paizo itself published the "Proficiency without Level" variant for this (fact: the variant exists on AoN; trained +2 / expert +4 / master +6 / legendary +8 flat, untrained -2).
2. **Little raw-power variance between builds.** Optimisers feel capped at about +1 or +2.
3. **Casters.** Saves are set so on-level and higher-level foes often succeed, which feels bad against the bosses that matter.
4. **Mandatory gear.** ABP is the admission.
5. **Swingy bosses.** A single +3 or +4 boss crits often and can kill a PC fast.

## What PF2 teaches PHC (my reading; this whole section is opinion and design recommendation, not fact)

**The diagnosis (reading).** PHC's present problem is PF2's treadmill with the felt parts removed:
- A level multiplier on damage and HP that cancels against scaled enemies.
- Systems fitted as a percentage of a reference rifle.

Both sides rise together, so nothing is felt. PF2 is only felt where **the level gap is not zero**, and at the **thresholds** (striking at level 4, a proficiency rank, a new action).

**Pieces that would fix PHC:**
1. **Creatures with fixed levels and a per-level grid.** Every enemy gets a level, and each level is about +1 to hit, +1 defence and about +15 to 20% HP, on a published table with Low / Moderate / High / Extreme columns. Do not re-scale enemies to the party.
2. **A relative-level budget.** Replace flat Soldier-equivalents with costs by level difference that roughly double every two levels (10/15/20/30/40/60/80/120/160 is a ready template), plus a per-character adjustment for 1 to 4 players. Survival already wants "ordinary foes lag, Elites keep pace and pull ahead". This makes that rule do the work, and a party revisiting a stage-1 Soldier at level 8 feels its growth.
3. **Four degrees of success, +-10.** On a d20 + (-2 to +9) roll, this makes each skill point and each grade step worth hit and crit. It is the cheapest single change that makes "+1" felt.
4. **Threshold spikes, not smooth percentages.** Weapon grades should add dice in steps, PF2's striking (Standard, Fine, Masterwork, Relic, Celestial), not +x%.
5. **Silos.** The combat floor (level, class rank, grade) should be automatic, and skill and perk points should buy options, so no player can build a dud.
6. **A falling multiple-attack penalty inside the 6 AP turn**, so later AP go to movement, support and the doors' mechanics.

**Pieces that would repeat PHC's mistake:**
- **"+level on everything, on both sides."** That is exactly the cancelling multiplier PHC has now. If PHC adopts level to hit and defence, it must also stop scaling enemies to the party, or it rebuilds the treadmill.
- **Gear as a mandatory schedule (ABP-style).** It keeps the maths tidy but makes grades "for show". PHC should make a grade change a threshold, or a choice between profiles.
- **A +1 to +2 optimisation ceiling.** That is right for fairness, but PHC's complaint is the opposite. Let rank and grade thresholds give bigger jumps, and keep fairness in the silos rather than in tiny numbers.
- **Save DCs that on-level foes routinely pass.** Do not copy that for Sigils and Outbursts.

## Sources

- Creature-building tables: Archives of Nethys, GM Core (https://2e.aonprd.com/Rules.aspx?ID=2874), verified this pass
- Encounter budget and creature XP: https://2e.aonprd.com/Rules.aspx?ID=2716, verified
- Automatic Bonus Progression: https://2e.aonprd.com/Rules.aspx?ID=1357, verified
- Weapon upgrade table (runes): https://2e.aonprd.com/Rules.aspx?ID=3161; Weapon Potency: https://2e.aonprd.com/Equipment.aspx?ID=2830
- Multiple Attack Penalty: https://2e.aonprd.com/Rules.aspx?ID=2188; Degree of Success: https://2e.aonprd.com/Rules.aspx?ID=2286; Natural 1 and 20: https://2e.aonprd.com/Rules.aspx?ID=2287; Initial proficiencies: https://2e.aonprd.com/Rules.aspx?ID=2103; Character Creation (partial boosts): https://2e.aonprd.com/Rules.aspx?ID=2027
- Not re-fetched: class proficiency schedules, feat-level lists, +1 armour potency level, spell DC column, XP 1,000 per level, agile -4/-8, 3 actions and 1 reaction.