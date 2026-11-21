# Critic: the player's walk (0.34 rebalance, design phase, 21 Nov 2026)

For the lead. **Nothing here is built and nothing here is a redesign.** Four characters are walked from level 1 to 20, every point spent, on the seven drafts in this folder (`01-scale.md` to `07-gear-perks.md`), then the findings are listed, most serious first, each with its file and section and a one-line fix. Every number I propose is marked PROVISIONAL; most fixes name which draft's number should win, not a new number.

**Facts about today I checked myself (data and code at `release/0.34-final`):**

- Creation: 10 Skill points (`data/rules.json:186-189`, `start_each` 0), 10 Attribute points with every attribute starting at 1 (`:190-192`), ceiling 7 (`:193`); today's ceilings `{1: 7, 3: 8, 6: 9, 9: 10}` (`:194-199`).
- Levelling: Skill points 2 on odd levels, 1 on even levels (`rules.json:227-230`); 1 Attribute point every 2 levels (`:231-234`). So **38 Skill points and 20 Attribute points in a career** (10 + 9 x 2 + 10 x 1; 10 + 10). Not 48.
- Ranks today: II at attribute 5 and level 6, III at attribute 8 and level 12 (`data/classes.json:12-22`).
- Momentum's wear divides by the Guts feed and carries the fraction (`packages/engine/src/physical/core.ts:226-229`, `feedCarry`): a Guts point is never rounded away.
- Focuses must be held in a hand to work; changing what a hand holds in a fight costs 1 AP a hand (`docs/rules/PHC-Core-Rules-v1.0.md:689`). Survival gives each character **one** free focus (`data/survival.json:41`); the Recommended row gives a caster the revolver so the focus sits in the off hand (`:52`); prayer needs no focus (`:52` `focus_by_door` has no Faith entry).

**Gates used in the walk** (the charter, section 18; `05-pacing.md` section 3): ceiling 7 at levels 1 to 4, 8 from 5, 9 from 10, 10 from 15; class at 3; rank II at 5 (its attribute 5); rank III at 15 (its attribute 8). An Attribute point the ceiling blocks may be held (`05-pacing.md:198`).

**Columns used** (`01-scale.md` T2): `deal` x1.214 a level (x2.17 at 5, x5.74 at 10, x15.2 at 15, x40 at 20) on every hit, every HP bar and every plate. HP = deal(L) x (60 + 10 x (End - 1) + (L - 1) x (1 + 0.5 x PT)). **Every level-up therefore moves every hit and every bar by a fifth on the sheet.** Against a same-level foe it moves nothing (their HP column is x1.267 a level, `01-scale.md` 2.4), so below I judge a level by what its **purchase** adds, as the brief asks.

---

## 1. The four walks

### (A) The Bulwark who only wants to be a wall

Creation: Endurance 7, Agility 3, Strength 2, Perception 2 (6 + 2 + 1 + 1). Durability 7, Pain Threshold 3. No Faith (it is Faithful, but cannot pray without Faith 1).

| L | Bought | What changed on the sheet and in the hands | Felt? |
| --- | --- | --- | --- |
| 1 | creation | 4 plates (Reach at Durability 7), Bite 120% (at 6), Challenge (2), Slam (5), fork Provoke or Cover Them (4), perk steps at 3, 6, 7; HP 120. A plate: **4 HP by 01** (3.6 x deal x the feed 1.21) or **11.6 HP by 02** (6 x 1.6 Endurance x 1.21). A Soldier's shot is 18 (01 T7). Slam on one foe: 4.4 x 1.2 x S(4) 5.37 = **28 by 01's plate, 62 by 02's**; a maul blow is 63 (01 T3b) | yes, but which wall it is depends on the file (finding 1) |
| 2 | Sensory 1; Attribute point **held** (Endurance is at the ceiling 7) | Warn (3 AP, reach 5: an ally steps a tile out of a blow). HP 149 | Warn yes; the Attribute point buys nothing this level |
| 3 | Pain Threshold 4, 5; **the Bulwark** | Brace (fill to Reach, +2 Defense, a plate at the start), Called Out, Hold Their Eyes; a perk step at PT 5 (Still Standing). PT 4 and 5 add **1 HP each at level 3 by 01** (0.5 x 2 levels x 1.47); +7% plate soak each through the feed. HP 187 | yes (class, perk) |
| 4 | Pain Threshold 6; Attribute point held (2 held) | PT 6: +2.7 HP (+1.1%) by 01, plates +5.6%. Nothing else in the door is open (Durability is capped by Endurance 7) | **no** in the door (finding 4) |
| 5 | Durability 8, Pain Threshold 7; held point: Endurance 8; **rank II** | Overbrace (the Push), fork Stand Fast or Drive; Retort, Shrug It Off; perk step at PT 7; Endurance +10 base HP and +10% plates (02). HP 322 | yes, the best level of the walk |
| 6 | Pain Threshold 8; second held point to Agility 4 (Endurance is at the ceiling 8) | PT 8: +6.6 HP (+1.6%), plates +5.6%; Agility: +0.5 tile an AP | **no** in the door; the only felt thing is off the door |
| 7 | Sensory 2, 3 | Warn reach 6; a perk step at Sensory 3 | yes (perk); Sensory 2 alone is a tile |
| 8 | Sensory 4; Strength 3 | Warn step 2 (two tiles); +10% on shield blows | yes |
| 9 | Sensory 5, 6 | Warn at 2 AP, a perk step; at 6 a wasted attack gives a plate (02 1(g)) | yes |
| 10 | Endurance 9; Durability 9 | Bite 140%, a perk step; +10% plates; HP 1,062 | yes |
| 11 | Pain Threshold 9, Sensory 7 | two perk steps | yes |
| 12 | Sensory 8; Perception 3 | Warn step 3 (-2 to hit) | yes |
| 13 | Sensory 9; the second point has no home in the door (all three skills are at Endurance 9): Raw Power 1 | Warn at 1 AP, a perk; Raw Power 1 opens Momentum (x3) | yes, but the door is full until 15 |
| 14 | Athletics 1; Attribute point held | +1 Defense (02's fix); the held point waits for 15 | **no** in the door; the Attribute point buys nothing |
| 15 | Durability 10, Pain Threshold 10; held point: Endurance 10; **rank III** | Reach 6, Last Wall, Walking Wounded, Reforge, Anchor, Stand Behind Me. HP 3,546 | yes |
| 16 | Sensory 10; Agility 5 | Skin Map; movement | yes; **the door is complete at level 16, hour 31** |
| 17 to 20 | 6 Skill points and 2 Attribute points, all off the door (Raw Power 2 to 4, Athletics 2 to 3; Strength, Endurance has none left to take) | Grapple, a chain of x4; Defense; HP 10,560 at 20 | felt, but none of it is the wall |

The wall's three skills reach 30 at level 16. **7 of its 10 levelling Attribute points cannot go to Endurance** (only levels 5, 10 and 15 open a step), so a one-door character is mixed by force: that is fine, but its in-door levels 4, 6 and 14 are not felt.

### (B) The Breaker who also prays (two doors)

Creation: Strength 7, Virtue 4, Endurance 2 (6 + 3 + 1). Raw Power 6, Faith 4. (`04-soul.md` 3(j) walks the same character; its level-2 buy, Conscience 1, is a point that moves 4% of prayer shields the Breaker never casts, so I spent it better.)

| L | Bought | What changed | Felt? |
| --- | --- | --- | --- |
| 1 | creation | The chain x4 (Raw Power 4 to 6), Bite 30% (at 6); a maul blow 61 (01: 27 x 1.194 x 1.9), **a x4 Coup 160**; Grapple, Throw Down, fork Rolling Start or Grindstone, perk steps at 3 and 6. Faith 4: Whispers, Name the Sinner, Grace 3, Bite +15%, fork Steadfast or Round of Blessings; Hymns open at Faith 3 but **Devotion starts at 0** (04 3(e)), so none until about hour 5. HP 70 | yes |
| 2 | Raw Power 7; Virtue 5 | **x5**, a perk step: the Coup is 247 (x5 at Bite 30%: 3.23 blows of 76). Blessing +10% by 04, +5% by 01 (finding 1) | yes |
| 3 | Faith 5, Intimidation 1; **the Breaker** | Witnessed; Threaten (3 AP); Launch, Wrecker, Breach, Into the Wall, Hurl, Four Ways, Charge Carries; Barrel In, Wind-up (a fight starts at 3 of x5) | yes |
| 4 | Authority 1; Virtue 6 | Order (a Call); Blessing +10% | yes |
| 5 | Faith 6, Guts 1; **rank II** (no held point: Strength 8 waits for 6) | Grace Bite +20%, a perk step; +1 Body and Fear saves, wear divided by 1.07; Riposte, Read the Swing. About now Devotion 3: **Hymn I** (by deeds) | yes |
| 6 | Strength 8; Raw Power 8 | **Overswing** (the Push), fork Spill or Headlong; blow 179, Coup 578 (x6 with Overswing: 712) | yes |
| 7 | Guts 2, 3 | a perk step | yes (perk) |
| 8 | Virtue 7; Faith 7 | Grace 4, a perk step; the Miracle's Faith gate | yes |
| 9 | Guts 4, 5 | a perk step | yes |
| 10 | Strength 9; Raw Power 9 | Bite 35%, a perk step: Coup 1,500 at x5 | yes |
| 11 | Intimidation 2, 3 (Faith 8 waits for Virtue 8) | Threaten reach, a perk step | yes (perk) |
| 12 | Virtue 8; Faith 8 | **pray above your standing** (the Push), fork Swift Psalm or Benediction | yes |
| 13 | Guts 6, 7 | a perk step | yes |
| 14 | Virtue 9; Faith 9 | Grace Bite +25%, a perk step (this spends the point a pure Breaker would hold for Strength 10 at 15) | yes |
| 15 | Guts 8, Intimidation 4; **rank III** | Measured Blow (keeps half the chain on a kill), Unstoppable; Threaten step 2 | yes |
| 16 | Strength 10; Raw Power 10 | **x7**, Earthbreaker: blow 1,424, Coup 7,860 (Masterwork x1.3: 10,200) | yes |
| 17 | Guts 9, Intimidation 5 | a perk step; Threaten at 2 AP | yes |
| 18 | Virtue 10; Faith 10 | Grace 5, Judgement Day, the Hymn's wait 3. Devotion 10 about hour 35: **the Miracle** | yes |
| 19 | Guts 10, Intimidation 6 | Nothing Left to Fear; a landed Threaten gives a step | yes |
| 20 | Intimidation 7; Endurance 3 | a perk step; HP 3,960 | yes |

Every level of B is felt. **B ends level 18 with both alpha skills at 10.** At no level is its Raw Power below a pure Breaker's except level 15 (the Breaker holds its level-14 point for Strength 10 at 15; B spent it on Virtue). That is finding 2.

### (C) The Sigilist

Creation (as `03-mind.md` 2(j)): Intelligence 7, Expression 3, Agility 2, Endurance 2. Brain Power 7, Rumination 3.

| L | Bought | What changed | Felt? |
| --- | --- | --- | --- |
| 1 | creation | Lines of 4 (Reach at 7), Bite 0.95: **x5.10**; a FIRE Line on one target 179 by 03's slopes, 211 by 01's (finding 1); 25 words to hold (2 known); Flux limit 9; Twin Draw, fork Overflux or Clean Vent, perk steps at 3, 6, 7. **The Line of 4 costs 6.2 AP** (4 glyphs x 0.8 at Expression 3, 3 tiles at 1.5 tiles an AP for Agility 2, Evoke 1): it never fits one turn at level 1 (03 2(c) says "about 6") | yes, over two turns |
| 2 | Rumination 4; Expression 4 | Flux 10; glyphs 0.7 AP: the Line of 4 is 5.8 AP and fits a turn | yes |
| 3 | Eloquence 1, 2; **the Sigilist** | Stored Spell (moved to rank I), Barrage (five Subjects 1 charge less); Brief (a Call). Eloquence 2 is a tile of Brief | yes (class, Brief) |
| 4 | Rumination 5; Agility 3 | a perk step, +5 study; walking the Line a third cheaper | yes |
| 5 | Eloquence 3, 4; **rank II** (Brain Power 8 waits for Intelligence 8 at 6) | Bleed the Flux (Vent 0 AP), Core Change; a perk step; Brief step 2 | yes, but nothing in the door |
| 6 | Intelligence 8; Brain Power 8 | **Overclock** (moved to 8): a Line of 5 at a price, fork Written in Advance or Running Script; +10% Sigil power | yes |
| 7 | Rumination 6, 7 | Flux 12, a perk step | yes |
| 8 | Eloquence 5; Expression 5 | a perk step, Brief at 2 AP; glyphs 0.6 AP | yes |
| 9 | Rumination 8, Eloquence 6 | Flux 13 (+8%); a tile of Brief and +1 on Eloquence checks Survival never makes | **no** (finding 4) |
| 10 | Intelligence 9; Brain Power 9 | Bite 1.05, a perk step, core saving 3 | yes |
| 11 | Rumination 9, Eloquence 7 | two perk steps | yes |
| 12 | Eloquence 8; Expression 6 | Brief step 3; glyphs 0.5 AP | yes |
| 13 | Eloquence 9, Visualization 1 | a perk step; the Figments door, **if a Visualizer is in a hand** (the Evoker is in one and the revolver in the other: rules `:689`) | partly |
| 14 | Visualization 2; Endurance 3 | Cash in, Curtain; HP | partly (same hand question) |
| 15 | Visualization 3, 4; **rank III** (Brain Power 10 waits for 16) | Payload, Backdraft; a perk step; two held Figments | yes, but nothing in the door |
| 16 | Intelligence 10; Brain Power 10 | Lines of 5: **x7.81**, the Junction, Clean Draw | yes |
| 17 | Rumination 10, Eloquence 10 | two Mastered perks, two free words | yes |
| 18 to 20 | Visualization 5, 6, Proficiency 1, 2; Agility 4, Endurance 4 | +1 charge in every core a Proficiency point (03 3(g)) | yes |

The Sigilist's door is full at level 17. Its in-door purchase is blocked at 5 and 15 by the gate rhythm, and level 9 buys two numbers under a tenth.

### (D) The wide character: four doors at 4 to 5

Creation: Agility 4, Intelligence 4, Insight 3, Virtue 3 (3 + 3 + 2 + 2); Endurance 1. Dexterity 4, Brain Power 3, Empathy 2, Faith 1. HP 60.

| L | Bought | What changed | Felt? |
| --- | --- | --- | --- |
| 1 | creation | Pressure Reach 3 (Dexterity 4), Bite 20%, Slide, fork; Lines of 2 (Brain Power 1 to 3), x1.87; one Bond, Mend, Snap; Whispers, Grace 2. **One free focus** (`survival.json:41`): an Evoker or an Attuner, not both. With a revolver in the main hand, the other focus waits in the pack (1 AP a draw) | yes, but two of four doors share one hand |
| 2 | Dexterity 5; Agility 5 | Flush Out; movement; (02: +5% gun damage; 01: none, finding 1) | yes |
| 3 | Brain Power 4, Empathy 3; **the Skirmisher** (Agility 5 is highest) | Lines of 3 (x3.09); a perk step; Reflex, Fire and Move, Relocated, Break Them, Hold the Lane, Fire Discipline | yes |
| 4 | Brain Power 5; Intelligence 5 | Twin Draw, core saving 2 | yes |
| 5 | Faith 2, 3; **rank II** | Name the Sinner, Hymns open (Devotion 3 about now), a perk step; Duck and Roll, Hot Loads | yes |
| 6 | Empathy 4; Insight 4 | two Bonds, fork | yes |
| 7 | Athletics 1, Rumination 1 (every alpha is capped by its attribute: Dexterity 5, Brain Power 5, Empathy 4, Faith 3) | +1 Defense (02's fix); +1 Flux limit (03) | borderline: two small numbers |
| 8 | Faith 4; Virtue 4 | Grace 3, fork | yes |
| 9 | Camaraderie 1, Conscience 1 (alphas capped again) | Share a Hit (a verb); Conscience 1 moves 4% of prayer shields | yes (Share a Hit); Conscience 1 no |
| 10 | Empathy 5; Insight 5 | Shield | yes |
| 11 | Athletics 2, Reaction Speed 1 | +1 Defense; Cue | yes (Cue) |
| 12 | Faith 5; Virtue 5 | Witnessed | yes |
| 13 | Eloquence 1, Insinuation 1 | Brief, Taunt | yes (two Calls) |
| 14 | Athletics 3; Endurance 2 | a perk step; +10 base HP (+14%) | yes |
| 15 | Rumination 2, 3 (**no rank III: Agility is 5, rank III needs 8**) | +1 Flux, a perk step | yes, but the class stops at rank II for good |
| 16 | Camaraderie 2; Endurance 3 | share +5%; HP | borderline |
| 17 | Reaction Speed 2, 3 | Initiative, a perk step | yes |
| 18 | Conscience 2; Endurance 4 | Clear Conscience (04) | yes |
| 19 | Authority 1, 2 | Order; an Order lays Grace (04) | yes |
| 20 | Dexterity 6; Agility 6 | Pressure Bite 25% | yes |

D never reaches 7 or 8 in any door: **no Push anywhere, no rank III, Reach at the 4-point step everywhere**, two of its four doors in one hand, and from level 7 every odd level's two points go to betas and gammas because all four alphas are capped by their attributes.

---

## 2. Findings, most serious first

### Serious (they break a law or make the walk wrong)

**1. The seven files are not on one scale; a builder cannot build them together.** `01-scale.md` set one factor x0.6 (a rifle 28, a maul blow 63); `02-body.md`, `04-soul.md`, `06-world.md` and `07-gear-perks.md` were written to the charter's x0.45 (a rifle 14 to 18, a blow 40) and say so (`04-soul.md` section 0, `06-world.md` 1.2, `07-gear-perks.md` header). The clashes a player would feel:
   - **A plate:** 3.6 x deal and no Endurance slope (`01-scale.md` T4, section 7) against 6 x deal x (1 + 0.1 x (End - 1)) (`02-body.md` 1(b)). The wall's level-1 plate is 4 HP or 11.6 HP; its Slam 28 or 62; its Retort at level 10 about 29 or 134. By 01's number the Bulwark's whole door soaks one Soldier shot and its Slam fails the pressing test.
   - **Pain Threshold:** +0.5 HP a level (`01-scale.md` 5) against +6% max HP (`02-body.md` 1(g)). By 01 a PT point is +1 to +7 HP until level 15: never felt.
   - **Max MP:** unchanged 100 + 75 + 25 (`01-scale.md` 7) against (40 + 12 x (Det - 1) + 8 x (Ins - 1)) x `mp` (`04-soul.md` 2(c)); Tending costs halve in 04 on the second pool only.
   - **The enemy table:** Soldier 84 HP, Defense 11 at every level, hp x90, damage x60 (`01-scale.md` 2.3 to 2.5) against Soldier 56 HP, Defense 11 rising to 17, Elite Defense 14, hp x90.9, damage x43.75 (`06-world.md` 1.3, 1.4).
   - **The slopes are reversed in the Soul:** soul Determination +0.05 and Will Power +0.10, blessing Virtue +0.05 and Faith +0.10 (`01-scale.md` T5) against Determination and Virtue +0.10, Will Power and Faith +0.05 (`04-soul.md` 2(h), 3(h)); Brain Power +0.10 (`01-scale.md`) against +0.05 (`03-mind.md` 2(h)); guns read Dexterity only (`01-scale.md` 4.1) against Agility +5% (`02-body.md` 3(h)).
   - **Perception and the critical:** an extra Margin at Perception 4, 7, 10 (`01-scale.md` 8), +0.02 on each Margin a point (`03-mind.md` 1(h)), a wider critical range at 5 and 9 (`07-gear-perks.md` 5.2); Dexterity's critical becomes +4% damage (01), stays +2% with `CRIT_MAX` lifted (`02-body.md` Q3), goes (07).
   - **Drill:** per kill x4 and marks 600 / 1,200 / 1,800 (`02-body.md` 4) against 20 / 35 / 70 / 180 / 360 and marks 300 / 900 / 1,800 (`05-pacing.md` 4).
   - **Grade by map** has three versions (`05-pacing.md` 5, `06-world.md` 3.5, `07-gear-perks.md` 1.3), and the Relic step's gate is removed (05) or set to stage 6 (07).
   - **Map hours:** map 1 ends at hour 3.0 and level 4.3 (`05-pacing.md` 1) against hour 2 and level 3 (`06-world.md` 3.2), so 06's map-2 foes (level 3 to 4) meet a level-4 to 5 squad.
   
   *Fix: one consolidation pass makes `01-scale.md` the only source of every flat number, slope and column, and re-derives 02's plate, 04's P and H, 06's enemy rows and 07's worked stack from it before any number is built.*

**2. A specialist is never ahead of a two-door character in its own door's Reach.** The alpha skill is capped by its attribute, the attribute by the ceiling, and a door's alpha costs only 3 of a character's 10 levelling Attribute points (one at each gate). B's Raw Power is 6, 7, 8, 9, 10 at levels 1, 2, 6, 10, 16: exactly a pure Breaker's, one level late only at 15. B holds x7 and Bite 35% at level 16 and a second door at 10 at level 18 (`05-pacing.md` 3 shows the same: "both doors at 10 by level 18"). The specialist's only lead is its beta and gamma, and those carry small numbers (Guts +1 save and the feed; Intimidation a tile). The charter's "a specialist gets Reach nobody else has" (section 18) does not hold in any draft. *Fix: put part of each door's Reach or Bite on the beta skill too (for example Reach 7 needs alpha 7 and beta 4, Reach 10 needs alpha 10 and beta 7, PROVISIONAL), so the specialist's other 20 points buy its door's top, which a two-door character cannot afford twice.*

**3. The wide character loses rank III and every Push, and has nothing of its own in 0.34.** Rank III needs the class attribute at 8 (`classes.json:12-16`); D stays at 5 to 6, so its class stops at rank II forever. Every Push is at skill 8 (charter, Leon round 3 item 3), so D never has one: Law 5's "nobody is ever stuck with nothing left" fails for it. Crossings are out of 0.34 beyond the base tags (charter section 18), so "a mixed character has a Crossing no specialist gets" is not there either. And D's enemies are written for the specialist (`01-scale.md` Q2: "a character who skipped its points takes about twice as many hits"). Leon: mixed is not weak. *Fix: give rank III by the class attribute or by the character's two highest attributes' sum (for example 8, or 10 across two, PROVISIONAL), and let the base tags carry one small cash-out bonus per door held beyond the first (a Crossing stub), so the wide character has its own reward in 0.34.*

**4. The gate levels 5 and 15 and the even-level Attribute point never line up; four drafts answer it three ways.** Attribute points come on even levels (`rules.json:231-234`); ceilings open at 5, 10, 15. Either level 4 and 14's Attribute point buys nothing (held, `05-pacing.md:198`) or the in-door purchase at 5 and 15 is blocked (`03-mind.md` 1(j), 2(j), 3(j) flag it at both; `04-soul.md` flags 14 and 15). For A the in-door dead levels are 4, 6 and 14; for C, 5 and 15. The charter's "ceiling 10 at 15: the Mastered perk" is never true at 15 for anyone who did not hold the level-14 point. `02-body.md` Q2 and `03-mind.md` Q3 propose swapping the gains; `05-pacing.md` holds the point. *Fix: one ruling, the swap (levels 5 and 15 give 1 Skill and 1 Attribute point, levels 4 and 14 give 2 Skill points; totals unchanged), so the gate and its point land together.*

**5. Two focuses, one hand.** Bonds need an Attuner in a hand, Sigils an Evoker in a hand, Figments a Visualizer in a hand (rules `PHC-Core-Rules-v1.0.md:689`; `04-soul.md` 1(a); `03-mind.md` 3(c)); Survival gives one free focus (`survival.json:41`) and drawing costs 1 AP a hand. D and C's level-13 Figments door, and every Sigils-Bonds or Sigils-Figments mixed character in 03 and 04 (`03-mind.md` 2(j) "Line and Outburst", 3(j) "the illusionist writer"), pay 1 to 2 AP a turn none of their cash-out tables count. "More often and weaker" becomes "less often and weaker" for the two-glove mixed character. *Fix: every two-door table in 03 and 04 counts the hand swap, and the items drafter rules on a two-glove focus row (one focus that counts for two doors at a lower grade, PROVISIONAL) in data.*

**6. The Bulwark's own play earns its door nothing.** Guard's Marks count plates spent on Slam, Challenge, Interpose and Retort, never soaks (`02-body.md` 1(e)); the Bulwark's class loop (Hold Their Eyes: be hit, gain a plate, soak) is soaks. A player who "only wants to be a wall" fills its door bar only when it stops walling. And Guard is the **only door with no cash-out below 5 points**: Slam opens at Durability 5 (`02-body.md` 1(a)), so a mixed Guard at 4 has Reach and Bite rows with nothing to spend them on. *Fix: count a plate that soaks a Taunted foe's blow as a unit (the Bulwark's Mark source), and move Slam to Durability 1 with Bite read from its points, as every other door's cash-out is at 1 or 2.*

### Important (a level, a point or a class move not felt)

**7. Levels whose best in-door purchase is not felt** (the column alone is +21%, but it cancels against same-level foes):
   - A level 4 and 6 (Pain Threshold 6 and 8: +1.1% and +1.6% HP by 01, plates +5.6%); A level 14 (the held point) (`02-body.md` 5 shows the same flag under 48 points; with 38 there are more). *Fix: settle finding 1 for Pain Threshold (02's +6% max HP makes these felt).*
   - C level 9 (Rumination 8: Flux 13 to 14; Eloquence 6: a tile) (`03-mind.md` 2(j) leaves the cell empty). *Fix: Eloquence 6 gets a door effect as 02 gave Sensory, Intimidation and Reaction Speed at 6.*
   - The Operative's levels 9 and 14 and the Rigger's 2, 9, 12 and 14 in `03-mind.md` 1(j) and 3(j) are written with nothing in the "gets" column. *Fix: the drafter states what each buys, or flags it.*
   - D levels 7 and 16 (two small beta numbers; Camaraderie 2's +5% share). *Fix: finding 2's beta Reach would make these felt.*

**8. Dead or trap points on the 27 ladders** (Survival is the only open mode, `data/modes.json`; a gamma's "full points on checks and passives" has no Narrator to read it):
   - Gamma points that are only a tile of a Call's reach: **Eloquence 2 and 6, Charisma 2 and 6, Vigilant 2 and 6** (`03-mind.md` 1(g), 2(g), 3(g) keep them "as is"); **Sensory 2, Intimidation 2, Reaction Speed 2** (`02-body.md` gave 6 a door effect, not 2). *Fix: each gets the 6-point treatment 02 used (a counter laid by the Call), or the Call's price step moves onto 2.*
   - **Pain Threshold 1 to 5 by 01** (0 HP at level 1, under +2% at any level before 10) and **Conscience 1** (+1% x Faith of shields a non-Chaplain rarely casts; `04-soul.md` 3(g) fills 2, 4, 6, 8 only). *Fix: 02's +6% HP; Conscience 1 gets 04's level-4 line (Grace does not wear) and 4 gets something new.*
   - **Brain Power's words-known cap at 2 to 6** (+3 words a point) does nothing for the first ~8 hours: a character learns a word every 1.6 hours from 2 (`05-pacing.md` 4), so BP 1's cap of 7 binds only at about hour 8. BP 2 is then a tile and a round. *Fix: none needed for BP 2 if the every-2 row is called felt; say so on the card.*
   - **Will Power 1 to 3** is a trap for damage (x1.35 Release, "par at best", `04-soul.md` 2(c)). It is honest; the card should say "a taste".
   - **Intelligence for a non-caster (+5% practice, `03-mind.md` 2(h)) and Virtue's +5% Devotion XP** (`04-soul.md` 3(h)) are under a tenth: the "never dead" claims are not felt. *Fix: drop the claim or raise them to +10% (PROVISIONAL).*

**9. Class things duplicated by everyone's door Mark I.** The Bulwark's Brace keeps "a plate at the fight's start" (`02-body.md` 1(i)) and Guard's Mark I gives everyone "each fight starts with 1 plate" (1(e)); the Channeler's Afterglow and Outburst Mark I both start a Begin at stage 1 (`04-soul.md` 2(e), 2(i)). Only 03 says the Operative's start stacks with Mark I (`03-mind.md` 1(e)). If they do not stack, the class's own thing is erased at hour 2. *Fix: write "stacks" on each, or give Mark I a different gift on the doors whose class already has it.*

**10. Class moves not worth pressing on 01's numbers.** Retort (a plate's soak x Bite: 29 at level 10 against a 541 maul blow by 01, `02-body.md` 1(i) computes 134 on its own plate), Slam at 4 plates (28 against 63), Rig's flat (`03-mind.md` 1(i) leaves it to the scale drafter). *Fix: follows finding 1.*

### Pacing, rewards and consequences

**11. Empty hours for the wall (hours 31 to 50).** `05-pacing.md` 6 checked a Breaker drilling two weapons a fight. A is a shield wall: its door is complete at level 16 (hour 31), its Guard Marks end at 23 (if it Slams, finding 6), it has Faith 0 so Devotion buys it nothing, and drill comes only from kills with the weapon (`02-body.md` 4), which a wall makes few of. From hour 31 to 40 it gains HP from levels only; from 40 to 50 gear alone. *Fix: run `tools/balance/pacing.py` for a tank profile (kills per fight a third of the Breaker's, PROVISIONAL) and list its empty hours.*

**12. Rewards taken back from saved characters** (the motto: "a reward is never taken back"):
   - Will Power 1 to 6 can no longer reach stage 4 (`04-soul.md` Q4).
   - A Dexterity 1 shooter can no longer drive a foe to Broken (`02-body.md` 3(b)).
   - A Breaker at Raw Power 4 to 6 holds x4, not 5 (`02-body.md` 2(b)); a Bulwark at Durability 3 to 6 holds 3 plates, not 4 to 7 (1(b), 1(i)); the Rigger's +1 held is gone (`03-mind.md` 3(b)).
   - The frail character's Soldier hits go from four-five to three-four (`01-scale.md` 2.3, deliberate).
   - Devotion starts at 0, not 3 (`04-soul.md` Q2): new characters lose Hymn I for five hours.
   
   Each is argued, but a save carries no warning. *Fix: a one-time "your sheet changed" panel on load listing each loss, and the old-save migration keeps Reach at the old number until the character's next level-up (PROVISIONAL).*

**13. Effort on the to-hit roll is cancelled by 06.** `06-world.md` 1.3 raises Defense with the expected attacker's to-hit (0 to +6 by level 20; Elite 14 at level 1), so a skill point buys no hit chance against a same-level foe; `01-scale.md` 2.5 sets Defense level-free so every point is a Margin. For D (Dexterity 5, +4) the Soldier hit chance at level 20 is 55% by 06 and 85% by 01. *Fix: 01's level-free Defense; 06's Elite Defense 14 kept only if the lead wants Elites to resist Margins.*

**14. Actions with too little consequence.** A Bond costs 0 MP and Tending ties a friend for free (`04-soul.md` 1(b), 1(c)): a Mender's web on friends has no price but being Traced. Conscience 4 removes Grace's wear entirely (`04-soul.md` 3(g)), so idling costs nothing. Curtain both deals damage and refunds half the charge (`03-mind.md` 3(c)). *Fix: none is wrong alone; the lead should rule whether a free cash-out refund (Curtain) and a wear-free counter (Conscience 4) stay.*

**15. The boon cap turns late boons into nothing.** `05-pacing.md` 6 notes the cap of 50 is full near hour 35, after which a Boss's boon is a worth-0 utility, while `01-scale.md` 9 keeps the cap. *Fix: the Survival drafter turns the cap into slots (01's own suggestion) before endless ships.*

### What a first-time player will not understand

**16. "I levelled up, the Soldier didn't get easier."** Every level the sheet's hits grow a fifth, and the next map's foes grow a quarter (01: x1.267 HP a level; 06: x1.5 jumps at levels 5, 12 and 17 at map boundaries). The number is felt; the fight is not shorter. *Fix: the level-up screen shows "against a foe of your level" next to the raw number, and the map card shows the foes' level against the squad's.*

**17. Damage that swings by a factor of ten.** Margins (x1 to x2.25 a roll) times the stacking kinds (`07-gear-perks.md` 5.4: a level-20 blow 3,857 plain, 150,844 with everything) times the non-linear cash-out S(n) (x4 is 5.37 units, x7 is 12.92). A player cannot read why one hit was 1,800 and the next 9,000. *Fix: the damage line names its Margins and its cash-out ("x5 chain, 2 Margins") and the door card shows the payoff at each count as a number, never the formula.*

**18. Two counters for prayer, and pips that are everyone's.** The Faithful has Devotion (the run's standing, which opens tiers) and Grace (the fight's counter, `04-soul.md` 3(b)); a Take spends **all** Pressure on a target, laid by anyone (`02-body.md` 3(c)), so a squad-mate's Take spends the specialist's five pips. And the held Attribute point at level 4 (finding 4) looks like a lost point. *Fix: one tooltip each; the Take's button shows "spends 5 pips (3 yours)".*

---

## Questions for the lead

1. **Which file's scale is the one?** Recommended: `01-scale.md` (x0.6 on every flat number), and every other draft re-derived from it in one pass before building (finding 1).
2. **Gate rhythm: swap the gains at 4/5 and 14/15, or hold the point?** Recommended: swap (finding 4); holding leaves a dead level at 4 and 14 for every specialist.
3. **Does the specialist's Reach need the beta too?** Recommended: yes, Reach at 7 and 10 needs the beta at 4 and 7 (PROVISIONAL), so a second door at 10 costs what a specialist's top costs (finding 2).
4. **Rank III for the wide character?** Recommended: rank III by the class attribute 8 **or** two attributes summing to 10 (PROVISIONAL), so four doors at 5 is not a class capped at rank II forever (finding 3).
5. **Two gloves for a two-door caster?** Recommended: the items drafter adds a two-door focus row (data) and the 03 and 04 two-door tables count the hand swap (finding 5).

## Built from

| Rule or number (a fix above) | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| One scale (1) | `rules.json output.profiles`, `output.level`, `enemies.json levels.table`, `techniques.json rules.guard.soak`, `character.ts maxHp`, `maxMp` (as `01-scale.md` Built from names them) | numbers only; 02, 04, 06 and 07's tables re-derived |
| The swap at the gates (4) | `rules.json character.levels.gains` (`:223-235`) | a `by_level` exception row for 4, 5, 14, 15 (data); if `gains` reads only odd/even, its reader takes the exception list |
| Beta in a door's Reach (2) | the door ladder (`02-body.md` "Needs" row 1) | its rows gain a second `points` key for the beta (the same reader) |
| Rank III by two attributes (3) | `classes.json rank_thresholds` (`:12-16`), `character.ts:1361-1363` | a threshold row may name a sum; read where `RANK_AT` is read |
| Two-door focus (5) | `survival.json focuses`, the focus check of rules `:689` (`with_this`, the focus slot) | a focus row with two door kinds (data) |
| Guard Marks from Taunted soaks; Slam at 1 (6) | the keyed practice track (02 "Needs" row 3); `skills.json` durability unlock rows | the unit list on Guard's `marks`; Slam's `requires` 5 to 1 |
| Door effects on gamma 2 and 6 (8) | `calls.json` steps, op `resource` on `acted` (as `02-body.md` 1(g)) | data rows |
| Mark I versus class starts (9) | `momentum_start`, `addGuard` at fight start, stat `begin_stage` (04) | a `stacks: true` word on the rows, or a different Mark I gift |
| The sheet-change panel (12) | `old-save` migration (`HP_REV`, `MP_REV`), the level-up screen | text and a list built from the migration's diff |
| Level-free Defense (13) | `enemies.json levels.table defense_plus` | 0 at every level (01) |
| Boon cap to slots (15) | `survival.json:219 boon_cap`, `run/power.ts:25` | the Survival drafter's |
| Readable damage (17), Take button (18) | the damage event's parts (`ctx.vs`, the stacking kinds of `07-gear-perks.md` 5.3), the action descriptor | client text only |

## Needs a new primitive

None asked for here. Each fix above rides a piece the drafts already list (the door ladder, the keyed practice track, the migration) or existing data rows. Two need a reader to take one more shape, both for the lead to decide: `levels.gains` taking a per-level exception (fix 4), and `rank_thresholds` taking a sum of two attributes (fix 3); if the lead rules either in, it is one line in an existing reader, not a new list.

## What re-records

| What | Why |
| --- | --- |
| Nothing from this file alone | it changes no data; every re-record is the drafts' own |
| If fix 4 (the swap) is taken: `level-gains.test.ts`, `levelup-revert.test.ts`, the golden builds (`test/golden/builds-*.json`) | the points a character holds at levels 4, 5, 14, 15 move |
| If fix 3 (rank III by two attributes): the class-rank tests and `classView.ts` | a rank can open on a new condition |
| If fix 6 (Slam at 1): `golden-costs*`, `golden-rules`, `golden-itemops` | Slam's gate and its payoff at low points |
| If fix 13 (Defense level-free): `enemy-levels.test.ts` and every damage table built on enemy Defense | 06's column replaced by 01's |
