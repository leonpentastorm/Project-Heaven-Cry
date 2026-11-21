# Critic: consistency and engine fit across the seven growth drafts (0.34 rebalance, design phase)

Critic's file for the lead, 21 Nov 2026. **Nothing here is built, and this file changes no draft.** I read the seven drafts in `docs/design/growth/` (01-scale to 07-gear-perks), the charter and the debate rounds (`docs/design/proposals/2026-11-21-the-curve.md` sections 10 to 18), the three checked maps and `2026-11-21-caps-the-engine-reads.md`, `docs/ENGINE-GUIDE.md` and `docs/ENGINE-HOOKS.md`. I ran `tools/balance/scale.py` (sections `check`, `hp`, `columns`) and `tools/balance/pacing.py` (sections `xp`, `points`, `practice`); both only read data and printed what their drafts quote. Facts about today below were checked by me in data or code at the worktree `E:/phc-wt/rel030` (`release/0.34-final`).

A finding names the files and sections that disagree and gives one fix. Where I must pick, I pick and give the player's reason. Every number I propose is **PROVISIONAL**.

**Counts:** 14 serious (two drafts give different numbers or formulas for the same thing, or a rule of Leon's is broken), 12 moderate, 9 minor. 31 primitives asked for under 29 names; 16 general pieces remain after the merge (section 4). 9 save and character migrations (section 6).

---

## 1. Serious: two files, two answers for the same thing

**S1. The scale factor: 01 uses x0.6; 02, 03, 04, 06 and 07 use the charter's x0.45.**
- 01 section 3.1 picked x0.6 for every flat number, with its working shown, as the charter allows (rifle 18, maul 27, a specialist's plain maul blow 63 at level 1 and 5,417 at level 20).
- The other five do their arithmetic in the charter's units:
  - 02 section 0: "a plain two-handed blow about 40 ... about 4,000 at level 20"; 02 section 2(h): a maul of 20, Strength 7 and Raw Power 7, times 1.35;
  - 03 section 2(c): "about 1,400 a hit";
  - 04 section 0: P = 18 / 140 / 1,400;
  - 06 section 1.2: D(L) = 18 x 1.21^(L-1) and "the rifle at the charter's base of 14";
  - 07 header and section 5.4: a maul 20, a rifle 14.
- Their multiples (x P, x H, hits) carry over. Their absolute numbers do not, and some are numbers typed for data: 02's plate soak 6, 07's bayonet 7 (`07` section 2, the bayonet row), 06's whole enemy table.
- **Fix:** adopt 01's x0.6 (the lead's Question 1 in 01), then re-derive every absolute number in 02, 03, 04, 06 and 07 from 01's columns in one pass (02's soak becomes 3.6, 07's bayonet 9, 06's D(L) starts at 28 for the rifle specialist). Do not mix the two units in data.

**S2. The enemy level table: 01 section 2.3-2.5 against 06 section 1.3. Two different tables.**

| At level 20 | 01 (T2) | 06 (1.3) |
| --- | --- | --- |
| hp_mult | 90, smooth (90^t) | 90.86, jumps of x1.5 at levels 5, 12 and 17 |
| armour_mult | 40 (= deal) | 79.5 |
| damage_mult | 60 | 43.75 |
| defense_plus | 0 at every level | 0 to 6 (= A(L) - A(1)) |
| attack_plus | 0 at every level | today's column, kept |

**Fix:** one table: 01's smooth columns and 01's level-free Defense and to-hit. My reasons are in M1 and in Question 2.

**S3. The enemy tier rows (level 1): 01 section 3.3 (T4) against 06 section 1.4.**

| Tier | 01: HP / armour / damage | 06: HP / armour / damage / Defense |
| --- | --- | --- |
| soldier | 84 / 3 / 1.0 | 56 / 2 / 1.35 / 11 |
| elite | 144 / 6 / 1.34 | 98 / 4 / 1.85 / **14** (today 12) |
| boss | 492 / 6 / 1.54 | 338 / 5 / 2.1 / **15** (today 13) |
| vermin | (x0.6 of today) | Defense 8 |
| minion | (x0.6 of today) | Defense 9 |

- Both drafts aim at "three to four hits".
- 01's survive and kill check (T7) is computed at Elite Defense 12 and Boss 13. 07 section 5.4 computes against 06's Soldier Defense 17 at level 20.
- **Fix:** 01's HP, armour and damage rows (they sit on 01's units), with 06's tier Defense (8 / 9 / 11 / 14 / 15). The player's reason is 06's: *a master beats a weak foe by 8 and hits half again as hard; against an Elite the same roll just lands* (curve, Law 2). Then re-run 01's T7.

**S4. The cards: five drafts, five slope rules for the same profiles.**

| Profile | 01 (section 4.1, T5) | Other drafts |
| --- | --- | --- |
| gun | Agility none; Dexterity +4% | 02 section 3(h): **Agility +5%**, Dexterity no damage (keeps +2% critical, Q3) |
| thrown | Dexterity +4% | 02 section 2(h): **Strength +10%** |
| sigil | Intelligence +10%, Brain Power **+10%** | 03 section 2(h): Brain Power **+5%** |
| elemental | Expression +10%, Visualization removed | 03 section 3(h): Visualization **+5%** kept |
| figment | no slope, k 1.35 | 03 section 3(h): **Expression +10%** on blows and HP |
| soul | Determination **+5%**, Will Power **+10%** | 04 section 2(h): Determination **+10%**, Will Power **+5%** |
| blessing | Virtue **+5%**, Faith **+10%** | 04 section 3(h): Virtue **+10%**, Faith **+5%** |
| healing, mend, tend | Insight +6%, Empathy +6% (kept) | 04 section 1(h): Insight **+10%**, Empathy **+5%** |

- 01 makes "the cards true as written". 03 (Question 5) and 04 (Question 1) make one rule: the attribute +10%, the alpha +5%, the Momentum pattern of curve section 16. Both readings are defensible, so this goes to the lead: Question 1.
- Each choice re-sets `k` in 01's T5.
- Whichever rule wins, Dexterity's "+2% critical" line must go (S9).

**S5. Max MP and the price of MP: 01 section 7 against 04 section 2(c).**
- 01: Max MP "unchanged, into data", `100 + 75 x (Det - 1) + 25 x (Ins - 1)`, never by level.
- 04: `(40 + 12 x (Det - 1) + 8 x (Ins - 1)) x mp`, with a new level column `mp = 1 + 0.06 x (L - 1)`. Tending costs halve and ride `mp`. Syphon's bands fall from 30-120 to 10-40.
- 04's working is the only one that makes MP a choice ("about four full Releases a pool at every level"). 01's own reason ("six full cash-outs at Determination 7") is the "never felt" that 04 measured.
- **Fix:** adopt 04's pool, costs and Syphon, and put `mp` in `rules.json output.level` beside `deal` and `mend`, read by `levelFactor`. 01's row in T8 changes.

**S6. Strain's burn: 01 section 7 (T8) gives 4.8 a point over, times `deal`; 04 section 2(c) gives 6% of max HP a point (4% at Composure 10).**
- **Fix:** 04's share of max HP. *Strain must hurt the same share of your bar at every level*: 01 states that very reason for HP prices, and then rides the column instead. 01's T4 row `soul_modules.json .strain.burn_per_point` 8 to 4.8 is dropped.

**S7. Character HP: Pain Threshold and Endurance. 01 section 5 against 02 sections 1(g) and 1(h).**
- 01: `deal(L) x (60 + 10 x (End - 1) + (L - 1) x (1 + 0.5 x PT))`. Pain Threshold gives 0 at level 1.
- 02: Pain Threshold **+6% max HP a point** ("a mixed character's point is never dead: HP from the first point"). Endurance +1/6 of the base a point.
- 01's own table shows the dead point: Pain Threshold "+0 (0.0%)" at level 1.
- **Fix:** 01's bracket with Pain Threshold as a percentage: `deal(L) x (60 + 10 x (End - 1) + (L - 1)) x (1 + 0.06 x PT)`, PROVISIONAL. *Every Pain Threshold point is felt from the first, the same share at every level.* The per-level HP numbers in 01's T4 (Oil in My Mind and Oil in My Soul, -0.5 a level) then take 07 section 6's form (max HP x0.95). Re-run 01's T6.

**S8. A plate's worth: 01 sections 3.3 and 7 against 02 section 1(b).**
- 01: soak 3.6 x `deal` (the reader rounds: 4 at level 1), no Endurance term.
- 02: 6 x `deal` x (1 + 0.1 x (End - 1)) x Pain Threshold's feed. Its whole Slam table (1(c): 8.4, 9.6, 466, 6,340) is built on the 6.
- **Fix:** 02's formula with 01's base: `3.6 x deal x (1 + 0.1 x (End - 1)) x feed`. Endurance's card gains "+10% a plate soaks" (02) beside 01's "+10% shield blows". Re-run 02's 1(c) and 1(h) numbers.

**S9. The critical's feeders under Margins: three to four answers each.**
- Perception's line:
  - 01 section 8: a critical adds one more Margin at Perception 4, 7 and 10;
  - 03 section 1(h): +0.02 on each Margin, a point above 1, with `CRIT_MAX` lifted;
  - 07 section 5.2: the critical range widens (19 from Perception 5, 18 from 9).
- Dexterity's line: 01: becomes +4% damage; 02 section 3(b) and Question 3: keep +2% critical and lift `CRIT_MAX`; 07: goes.
- Critical damage taken:
  - 01: cuts what the critical's Margins add by the share;
  - 03 section 1(g): -6% a Perception point and Margins against you 5% less a point of Analysis;
  - 07: at Acuity 5 a critical on you adds one Margin, not two.
- `CRIT_MAX` is deleted in 01 and 07 and "lifted" in 02 and 03: a lifted cap is still a cap, and caps that hold a reward down were withdrawn (rules 1.94).
- **Fix:**
  - delete `CRIT_BASE`, `CRIT_MAX`, `CRIT_PER_PERCEPTION` and `CRIT_PER_DEXTERITY` (`character.ts:853-855`) as 01 says;
  - Perception's line: 01's "one more Margin at Perception 4, 7 and 10". It is the only one of the three a player sees as a step (*a quarter harder on a critical, three times in the climb*);
  - Dexterity's damage comes from S4's rule;
  - critical damage taken becomes "your Margins against you are one fewer" at Analysis 5 and at Perception 7 (07's shape, a whole step);
  - 03's per-point 0.02 and -6% go.

**S10. Weapon drill: 02 section 4 against 05 section 4.**
- 02: per worthy kill minion 20, Soldier 40, Elite 100, Boss 200; marks **600 / 1,200 / 1,800**; Mark II +1 to hit and Mark III +10% damage with the weapon.
- 05: `per_kill` vermin 20, minion 35, Soldier 70, Elite 180, Boss 360; marks **unchanged, 300 / 900 / 1,800**; no mark effects.
- Both say Mark III in about 2.5 hours and martial x1.5.
- **Fix:** 05's rates and thresholds, so no saved mark moves (M4), plus 02's Mark II and Mark III gifts. *A weapon you have carried sits right in your hand.* 05 owns the rate, 02 owns what a mark gives.

**S11. The grade by map: three lists.**
- 05 section 5: finds Fine; Masterwork for stages 2 to 5; Relic for 6 to 9; Celestial from 10. The vault gives the next stage's ceiling.
- 06 section 3.5: Fine, Fine, Masterwork, Masterwork, Masterwork; Relic for maps 6 to 9; Celestial from 10.
- 07 section 1.3: finds Fine, Fine, Masterwork, Masterwork, **Relic on map 5**; a separate shelf.
- **07 is also wrong against its own rule:** its table gives the vault **Celestial on endless maps 6 to 9** (hour 16 on), while its text and the charter say Celestial at about hour 33. Its map-5 vault is "Relic", where "one over finds" would also be Celestial.
- **Fix:**
  - finds `[fine, fine, masterwork, masterwork, relic, relic, relic, relic, relic, celestial]`, the last repeating (07);
  - shelf `[fine, fine, masterwork, masterwork, masterwork, relic]` (07);
  - **the vault gives the next map's finds**, capped at Celestial (05's rule). That puts the first Celestial in map 9's vault, at about hour 29 to 31: *the dead-end fight is a taste of the next map, never four maps early.*
  - `relic_from_stage` goes (05: the ceiling is the one gate; 07's "6" is a second copy).

**S12. Endless pace: 05 section 1 against 06 sections 3.2 and 3.4.**
- 05 (and `pacing.py`): endless maps take 3.5 to 4.5 hours; the squad gains about 1.5 levels a map; level 20 at map 12 (endless 7), hour 40.
- 06: one level a map, about 2.4 hours a map; ordinary foes reach 20 on map 14, everything by map 15.
- With 06's foe levels and 05's squad:
  - map 9: squad level 16.3, early foes level 14;
  - map 11: squad level 19.8, early foes level 16, a gap of -4.
  - 05's own worth table then pays 0.33 for those fights: the squad starves at the peak.
- **Fix:** foe levels in endless follow 05's level-at-map-end column. Early foes are the squad's arrival level rounded down, late foes that plus 1, Elites and Bosses plus 2, capped at 20. That is 06's rule applied to 05's clock, and 06's `levels.endless.per_map` becomes a list, not 1. 06's hours per map (2 / 2.5 / 3.5 / 4.5 / 3.5 for maps 1 to 5) also differ from 05's (3.0 / 3.1 / 3.2 / 3.3 / 3.4): use 05's, since 05 owns the clock; 07 section 1.3 quotes 06's hours and moves with them.

**S13. Stat terms add or multiply: 01's `statTerm` against 07 section 5.3.**
- 01 keeps one Stat term, `k x (1 + a x (A - 1) + s x S)`: the attribute and the skill add.
- 07 makes them two kinds that multiply, `(1 + 0.1 x 9) x (1 + 0.05 x 9)`. Its 07 section 5.4 Raw Power reads +45% at 10, where the card's +5% a point is +50% at 10.
- At 10 / 10: 01 gives 2.4 x k; 07 gives 2.76. The 07 section 5.4 stack builds on the larger one.
- **Fix:** keep 01's single Stat term. Attribute and skill are one kind (`stat`), which also keeps 01's `k` re-pin true.

**S14. Seven drafts, two pictures of the top hit: 07's stack breaks the digits rule (Leon, section 17.2: "something super gets 5 digits").**
- 07 section 5.4 multiplies a level-20 Breaker's sheet onto the charter's x7 Coup:
  - about 59,000 on an ordinary big turn;
  - **150,844** on its best turn alone;
  - **271,519** with the squad's set-up.
- On 01's x0.6 base (maul 27, not 20) every figure is about x1.35 larger: about 204,000 alone.
- 07's Question 2 recommends accepting six digits. That contradicts a ruling: it is not the critic's to accept.
- The biggest single factor is Margins on a natural 20 (x2.25), applied on top of the whole cash-out.
- **Fix:**
  - (a) the sheet (perk, trait, class, gear, run) is one kind whose bonuses add (07's own alternative);
  - (b) Margins multiply the plain hit and not the door's cash-out factor: a Finisher's Margins are the roll's, and the chain's steps are not "what the roll does". This needs one line in the Margins piece (`margin` applies before `door`, a term on the base);
  - (c) the lead checks the worked top against 99,999 after both.
  - With (a) and (b) on 01's base, the best lone turn is about 29,905 x 1.25 (one Margin) x 2.4 (sheet) ≈ 90,000: five digits. Question 3.

---

## 2. Moderate: off the new scale, or against the digits rule

**M1. 06's enemy columns cancel the player's growth, which the curve forbids.**
- 06 section 1.3 sets `defense_plus(L) = A(L) - A(1)` so "the specialist with the expected grade hits a foe of its own level as often at level 20 as at level 1".
- It also sets `hp_mult` with **jumps at 5, 12 and 17 where the expected grade steps up**: "a squad that upgraded on time feels nothing" (06, under the table in section 1.3).
- That is today's cancelling (curve Law 6, last point: "the growth cancels") moved from the party's level to the grade.
- It contradicts curve section 6 ("a player's reward is never taken back") and 01 section 2.4 ("a grade found is a jump in your damage, never cancelled by a jump in theirs").
- **Fix:** as S2: 01's smooth `hp_mult`; Defense level-free. The gap (+1 a level to 5) is the only place a level touches the roll.

**M2. Four doors' full cash-outs stay four digits at level 20** (the charter: "a full cash-out five"). On 01's rifle (a specialist's plain shot 2,110 at level 20):

| Door | Full cash-out at 10 points, level 20 | Source |
| --- | --- | --- |
| Pressure, Dead Centre at 5 pips | 3.23 shots ≈ 6,800 | 02 section 3(c); 01 T7 flags it D |
| Guard, Slam at 6 plates | 6,340 a foe | 02 section 1(c), on today's soak 6 |
| Bonds, Snap All of 4 | ≈ 6,300 split four ways | 04 section 1(k) |
| Outbursts, plain Release at stage 5 | x3.40 x D (1.4 P) ≈ 10,000 on 01's P, ≈ 6,700 on the charter's | 04 section 2(c) |
| Prayer, a Hymn with 5 Grace | 7.2 PA ≈ 10,000, just | 04 section 3(c) |

**Fix:** each of these doors' Bite at 9 is raised until its Reach-10 cash-out is at least about x5 a plain action (Momentum's is x5.5). For Pressure that is Bite 20 / 30 / 55% at 1 / 6 / 9 (1 + 0.55 x 7.44 = 5.1), PROVISIONAL, with the same reason as Momentum: *the specialist who waits at five pips is paid like the one who waits at seven steps.* For Guard and Bonds count it per foe hit and in total. Alternatively the lead rules that five digits belongs to the single-target doors only (Question 4).

**M3. Level-1 hits over two digits: 01 section 3.2 keeps the three rocket tubes at three digits.** The siege tube is 108 to 119 for a normal share at level 1 (01 T3b). That breaks "1 to 2 digits at level 1". **Fix:** 01's own alternative, x0.5 on the three tube rows (siege 65, breacher 55, throwaway 45 before the Stat term; the siege tube at a normal share ≈ 90). *A rocket is still the biggest thing in a level-1 fight.*

**M4. Numbers still on today's magnitude.**
- 02 section 1(b): `rules.guard.soak` 6 kept.
- 02 section 2(h): the maul worked with `factors.melee 1.35`, which 01 and 02 both delete.
- 03 section 1(i): Rig's 25 flat ("the scale drafter sets the base"; 01's T4 gives 15).
- 06 section 1.3: `attack_plus` kept at today's column.
- 07 section 6: `factory_made` at 5 a point on the `repair` profile, where 01 T4 gives 6.0 on `flat`; `crawler_blooded`, 10% of max HP in 07 against 6.0 flat in 01; the drone and beast HP, 07: `levelled()` companions at the owner's level, 01: typed 18 and 36.
- `rules.json:1486`, the text "8 true damage per point over the limit": a digit in a data text that will lie after S6.
- **Fix:**
  - 01's x0.6 values everywhere a number stays flat;
  - 07's forms for the four traits (a share of max HP; companions through the enemy table, one copy);
  - the `rules.json:1486` text reads its row.

**M5. The heal column: 01 section 2.2 (`mend` = deal x (90 + 3(L - 1))/90, x65 at 20) against 04 section 0 (`mend` = hp_ref(L)/hp_ref(1), hp_ref of an Endurance-4 character: 90 / 600 / 5,000, about x55.6).** **Fix:** 01's formula, rebuilt on S7's HP so it tracks the same normal bar (Endurance 4, Pain Threshold 4) the gate counts to (`mending.gate.hp` 90). One column, defined from the HP formula, not two descriptions of it.

**M6. Devotion: 01 T8 says the curve is unchanged (45 / 102 / 200 / 450); 04 section 3(e) and 05 section 4 adopt `[0, 10, 25, 42, 68, 100, 140, 185, 225, 260, 300]`, cap 3 a fight, 30 a stage; 04 alone makes the start 0, not 3.** 01's Devotion-as-grade hours (5 / 12 / 22 / 35) are 05's curve, not today's. **Fix:** 05's curve and caps, 04's start 0 for new characters. 01's T8 row is corrected.

**M7. The prayer intervention: 01 T4 sets base and per Devotion to 12 and 2.4; 04 section 3(k) sets `(0.6 + 0.12 x Devotion) x P`.** **Fix:** 04's multiple on 01's units. It reads the blessing profile on `deal` and has no typed 12.

**M8. The Push has two shapes.**
- 02 section 0.3: a Push counts one unit you do not hold (`S(n + 1)`, a toggle).
- 03 section 1(d), 03 section 3(d), 04 section 1(d) and 04 section 2(d): a Push lets you hold one past your Reach (the meter, the Figments, a Bond, a stage).
- The second is the only shape that works for counters that are things on the map (glyphs, Figments, Bonds).
- **Fix:** one shape: the Push raises the door's Reach by 1 for the use (S5 in section 4). Overswing, Overbrace and Overpress read as "your chain, wall or pips may stand one higher for this cash-out", with the same prices. For Pressure that means one pip above the foe's cap, which 02 already says.

**M9. Mastered and changed perks under the new combination rule.** 07 section 4.4 re-keys Earthbreaker to the Finisher's cash-out, read by its handler (`perks/a.ts`). That is per-item code reading another system's sum. **Fix:** Earthbreaker becomes a Finisher row (`techniques.json`, the Finisher family, `once a fight`, a 3x3 `targets`) paid by the shared cash-out source, and its handler goes. That is one copy of the Finisher rule, as 02's "five copies become one" asks.

**M10. Spare Skill points: 02 Question 1 recommends 48 by level 20; 03 section 0.5, 04 section 0 and 05 section 3 use the data's 38.** `rules.json:227-233` and CLAUDE.md (rules 1.11: 38 Skill and 20 Attribute points in a career) say 38. **Fix:** 38. 02's spend tables are redrawn on it; 02 already marks the levels that lose a point.

**M11. The gate levels and the Attribute point: three answers to one problem.**
- 02 Question 2: swap the gains of levels 4 and 5, and of 14 and 15.
- 03 Question 3: levels 5 and 15 give 1 Skill and 1 Attribute point, levels 6 and 16 give 2 Skill points.
- 05 section 3: the point waits a level (`c.unspent.attr` already allows it).
- **Fix:** 02's swap. A specialist's main attribute can move only at a gate, and 02's is the only scheme in which neither the gate level nor the level before it buys a blocked point: level 4 gets two Skill points, level 5 the Attribute point that opens 8; the same at 14 and 15. Totals unchanged.

**M12. Prayer's Reach: the curve's Law 1 table says "Prayer: by Devotion, as now"; 04 section 3(b) adds an in-fight counter, Grace, with Reach 2 / 3 / 4 / 5.** Section 17.1 (later, so it wins) makes the Momentum pattern the pattern for all nine doors, which needs a fight counter, so 04 is in order. But Grace is a new resource (section 4, S10) and 04's Push is "once a fight" where Law 5 says once a turn. **Fix:** keep Grace, list it for the lead (it is in section 4), and make the prayer Push once a turn like the eight others, at its Devotion-XP price.

---

## 3. Minor

1. **The cash-out's outer formula differs by door.** The forms are `1 + Bite x S(n)` (02), `Bite x S(n)` (03's Line, Figments, Bonds), `1 + 0.5 + Bite x S(n)` (Shadow) and `0.8 + sum(step x 1.2^i)` (04's Release). One shared sum works if the row carries its own constant: the cash-out source returns `S(n)` and each door's number block adds its `base`. 04's weighted Pumps read only the ratio (1.2) from the same data key. Write it so in the merged primitive (section 4, S3).
2. **Door Marks' thresholds:** 02 and 03 give one set (60 / 380 / 600 / 820); 04 gives each door its own; 05 gives the formula `[2, 11, 17, 23] hours x the door's units an hour`. **Fix:** 05's formula, written as numbers on each door row, so the three sets are three readings of one rule.
3. **Figment form marks:** 03 section 3(e) gives [6, 20, 50] fights, 05 section 4 gives [3, 7, 13]. 03's checks the 80% (24 of 30 by hour 50); 05's makes Mark III in 4.1 hours. **Fix:** 03's, since the form's whole bar is the collection, and 05 should not fill it in an afternoon.
4. **Enemy door amounts:** 06 section 1.6 says an enemy's plate or Snap rides the character's level column (`deal`, x40), while its weapon rides `damage_mult` (x60 in 01). **Fix:** an enemy's door amounts read `damage_mult`, the enemy's own column, so a plate and a shot of one foe grow together.
5. **01's primitive 3 (a level column that names another) is not needed:** `scaleOf` (`output.ts:120`) is one line; point it at `deal` and delete the `scale` array.
6. **The boon cap fills at about hour 35** (05 section 6). 01 keeps it and 07 takes properties out of it (Question 3 in 07). Keep the cap with 07's change. The Survival drafter should know a Boss's boon past the cap is worth nothing, a reward a cap takes: say so on the card.
7. **03 section 2(b)'s Overclock move** gives the rung a new id in code (`perks/skills.ts:47`, `id: 'skill:brain_power.2'`). See section 5.
8. **06 section 3.3's final boss HP** (about 4,770 at four players) is on the charter's units, and moves with S1 and S3.
9. **02 section 3(b)** reads Pressure's offsets by tier name (`elite_off`, `boss_off` in the Pressure function). See section 5.

---

## 4. The primitives, merged

Asked for: 01 three, 02 five, 03 eight (four of them 02's), 04 three, 05 four, 06 two, 07 four. That is 29 names; with two half-named extensions it comes to 31 asks.

### Merges (same piece, two names)

| Same piece | Names in the drafts | One form |
| --- | --- | --- |
| The door ladder | 02 "door ladder"; 03 primitive 1; 04 section 0.1 | **generalise `ladderAt` (`figments.ts:45`, exists)** to any door row's `ladder`; Shadow's `cap_by_points` and Figments' own ladder become rows of it |
| The cash-out sum | 02 "cash-out sum"; 03 primitive 2; 04 "cash_share" | one source namespace `cash:<resource>` (in `SOURCE_SPACES`, `effects/triggers.ts:373`) returning S(n) of the units spent, with `cash_share:` = S(n)/n; ratio `rules.json output.cash_out.step` 1.2 |
| Marks on anything | 02 "keyed practice track"; 03 primitive 6; 05 P2 | **generalise the drill bar** (`addDrill`, `drillMarks`, `physical/data.ts:118-147`) keyed `weapon:`, `door:`, `form:`, `feeling:` |
| The worth of a gain, and the learner's rate | 05 P1 `growthWorth`; 03 primitive 5 `practice_rate` | **extend `growthHeld` (`effects/hooks.ts`, exists) into `growthWorth`**, read once in the Marks adder above, which also multiplies by a `practice_rate` stat line |
| "Keeps the chain" | 02 "wear guard" (stat family `wear:<res>`); 03 primitive 8 (`keeps` list on action rows); 04 "keeps Grace" | the stat family `wear:<res>`, answered by `stat_mod` with `context: {action: [...]}` (stat_mod already has `context`). It carries the tags and the Marks that ease wear (02's Guard and Momentum Mark II) with one reader |
| The found book | 03 primitive 7; 05 P4 | **generalise the felt list** (`magic.ts` `m.feelings`, a first-time list) to a keyed set of firsts on the character |
| The Push's extra unit, and a door's cap | 02 (S(n + 1) by a toggle); 03 primitive 4 `res_max:<resource>`; 04 Overbind (`ties_max:bond`, exists) | **generalise the `ties_max:<kind>` stat family (exists) to `res_max:<resource>`**, the cap every door ladder's Reach writes; the Push is a one-use condition adding 1 (M8) |

### Pieces that already exist or nearly do (dropped as new)

| Asked | Already there |
| --- | --- |
| 01 primitive 2, a profile's grade source | 07's form: each `rules.json rarity` row carries `effects` (`roll_mod`, `damage_mult`, `mend_mult`) under `with_this`, which ENGINE-HOOKS line 136 already defines as "a door's event with that door's focus"; collected by `effects/collect.ts:220`. Only 01's **Devotion as the faithful's grade** is left over: a `damage_mult` and `mend_mult` row on the prayer door keyed by standing 3 / 5 / 7 / 10. Check whether a Devotion-level predicate exists; if not, it is one predicate (S16 below) |
| 01 primitive 3, a column naming a column | delete `scale`; repoint `scaleOf` (minor 5) |
| 05 P3, a per-stage faith tally | an extension of `tallyOf`'s scope (`faith.ts:506`), reusing the run's stage key; not a new list |
| 06 primitive 1, `worldLevel` | it replaces `foeLevel` and `eliteUp` (`run/encounter.ts:70-75`): a body rewritten, not a piece added |
| 06 primitive 2, the zone's level in `fightLevel` | a parameter of an existing function (`combat.ts:1785`) |
| 07 primitive 2, `crit_range` | generalises the weapon op `aimed_crit_min` (exists, ENGINE-HOOKS line 287) to a gear field with `_modes` |
| 04 the `mp` column | data: `levelFactor` reads any array in `output.level` (`output.ts:106`); `maxMp` reads it |

### The final list (16), smallest form each

| # | Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- | --- |
| S1 | **Margins** | `rolls.ts:78` judge returns `margins`; one own-multiplier term `1 + per x margins` where the critical term is pushed (`combat.ts:1542`, `sigil.ts:336`, `classes/soul.ts:39`); `rules.json rolls.margins` | nothing counts how far a roll beat its target (01) |
| S2 | **Door ladder** | `ladderAt` generalised (above) | only Figments read a by-points table |
| S3 | **Cash-out source** | `cash:` and `cash_share:` in `SOURCE_SPACES`; the step in data | no source reads units spent in this action (five copies in `finishers.ts`) |
| S4 | **Keyed Marks** | the drill bar keyed by string, thresholds and gifts from each track's row | the bar is weapon-only and kill-only |
| S5 | **`res_max:<resource>`** | `ties_max:` family generalised | caps are typed per door (`shadowCap`, `guardPool`, `MAX_STAGE`, `maxSigilWords`) |
| S6 | **`wear:<resource>`** | one stat family read at the wear sites (`physical/rules.ts:64`, `:74`, `:116`; `links.ts:181`; Shadow's turn-start loss; Grace's) | the exceptions are typed in each site |
| S7 | **`growthWorth` and `practice_rate`** | `growthHeld` extended to a factor; one stat line | `growthHeld` is yes or no |
| S8 | **`attr:` source** | one namespace in `SOURCE_SPACES` | `self:` reads unit fields (`triggers.ts:343-349`), and a unit carries no Perception, Intelligence or Virtue |
| S9 | **Firsts** | the felt list generalised to a keyed set, saved with a load default | nothing records which spells were cast |
| S10 | **Resource `grace`** | one row in `data/actions.json resources` | prayer has no in-fight counter (04) |
| S11 | **Stat `begin_stage`** | one line in `STATS` | `momentum_start`'s twin for the heart; `free_pumps` and `rider_stage` do not start a heart higher (04) |
| S12 | **Stack kinds** (only if the lead keeps 07's rule, Question 3) | `Term.kind` and `stackDamage` grouping (`output.ts:131`); replaces `VS_CAP` | two buckets today (07) |
| S13 | **`crit_range`** | `aimed_crit_min` generalised to a gear field | no data row widens the critical for every shot (07) |
| S14 | **`targets.past`** | a bool on a line set | one signature needs it (07 H5); the lead may defer the row instead |
| S15 | **`GearState.props`** | the list replaces `prop`, with a migration | Celestial holds two properties (07) |
| S16 | **An `injure` op** | one line in `OPS` calling the existing `rollInjury` (combat.ts export) | the `injured` row is a Narrator op (02); fallback: Bleeding on yourself, which exists |

Plus these extensions, each of a piece that nearly does it:
- `from_stage` beside `from_depth`;
- `pressure_kind` in `budgetFor`;
- `armGuard` reading tag blocks and the Reach row;
- `stageCeiling(stage, purpose)`;
- `forge_fit_rate`;
- `with_this` on worn armour;
- `FITS` learns `armour`;
- `extraSlots` reads the grade;
- `gearNum` reads the carried list;
- `families.json` gains `signature`;
- `tallyOf` gains a stage scope.

A **res_start:<resource>** family (generalising `momentum_start`) would carry every door's Mark I "the fight starts primed with 1" (Guard, Shadow, Grace), the Breaker's Wind-up and the Operative's Tradecraft start. Nobody asked for it; I list it as the merge of four "conditions on a mark held" that 02, 03 and 04 leave to the builder.

---

## 5. Numbers and ids that would be typed into code

1. **`perks/skills.ts:47`** keys Overclock's handler by `skill:brain_power.2` and types its +2 charge as `OC_CHARGE`. Moving the rung to 8 (03 Question 1) is a code edit of an id. **Fix:** Overclock becomes data on the new `res_max:` family (03 says the lint count can fall); the rung is read from the ladder row.
2. **Pressure's tier offsets** (02 section 3(b): `elite_off`, `boss_off` inside `pressureCap`). **Fix:** a `pressure_off` field on each `enemies.json` tier row.
3. **Earthbreaker** (07 section 4.4, `perks/a.ts`): M9.
4. **Shape** (04 section 2(i)) retires its bespoke handler (`classes/i.ts:1147`). Storm Front's 10 MP, 2 foes and 2 tiles are typed in `classes/i.ts:1173-1199`; 04 already moves them to `numbers`. Heart Surge's "never past 4" must read Reach, not a 4.
5. **Literals the drafts already list to move to data:**
   - max HP's 100, 15 and 5, and Pain Threshold's 2 (`character.ts:798`, `:801`);
   - Max MP (`:860`), `syphonMult` (`:903`), `soulCostSaving`, `healReceivedMult` (`:1247`), `shieldReceivedMult` (`:1249`);
   - the critical's constants (`:853-855`);
   - `MELEE_FACTOR` (`combat.ts:46`);
   - `HYMN_COOLDOWN` (`character.ts:1266`);
   - `maxSigilWords` (`:881`), `wordsKnownCap` (`:890`);
   - `XP_SOURCES` and `COMBAT_XP` (`data.ts:129-132`), and `combat.ts:3490`'s `|| 50`;
   - the fallbacks in `character.ts:1321` and `:1361-1363`;
   - `guardPool`'s `min()`, `fighter_max`, `armGuard`'s per-row plates;
   - the drone's and the beast's HP in the trait op.

   Every one is a defect today, and every one must move in the same change that alters its number. Otherwise the rebalance edits code.
6. **Existing item ids in code** that the rescale touches: `tactics.ts:420-428` (`smoke_grenade`, `flashbang`, `bot_scrambler`), on the thrown path that 01 moves to `deal()`. **Fix:** a thrown row's `effects` in data; the switch goes.
7. **No draft types a new item id into code**, but two drafts name a template or a row in prose ("`last_reckoning`", 06; "Hold Their Eyes", 02). Both are already proposed as data, read through `levels.final.template` and a `classes.json` row. Keep them so.

---

## 6. What re-records, and what a live 0.33 save does

### Saves and characters (checked in code)

**Is any live character above its new ceiling? Yes, typically every specialist past level 3.**
- Today the ceiling is 8 from level 3, 9 from 6 and 10 from 9 (`rules.json:194`, `cap_by_level`). Attribute points come on even levels, so a 0.33 specialist holds 8 from level 4, 9 from 6 and 10 from 10.
- Under `{1: 7, 5: 8, 10: 9, 15: 10}` that character is one over at levels 4, 6 to 9 and 10 to 14.
- Nothing refuses it at load: `validateSheet` (`character.ts:340`) checks only the creation sheet (cap 7, unchanged). But `legendRoom` (`character.ts:1327`) goes negative and silently eats a later Legendary Deed's room.
- Lowering the attribute would also break "skill <= attribute" and take back perk steps and Mastered perks earned at levels 9 to 14.
- **Migration (M-1):** a `CAP_REV`. Points standing above the new ceiling at migration are recorded as grandfathered (`c.capGrace`, counted beside `legends` in `legendRoom`). Nothing is refunded, nothing is lost, and a later ceiling rise absorbs them.

| # | What moves | Who it touches | Migration |
| --- | --- | --- | --- |
| M-2 | **Rank III at level 15**, not 12 (`classes.json:17`); `classRank` reads the level every call (`character.ts:1385`) | a level 12-14 character loses its rank-III moves on load | a held-rank floor at migration (`c.rankHeld`), so nobody loses a rank they hold |
| M-3 | **Moved rungs and retired class features:** Overclock 2 to 8; Will Power 1-6 lose stages 3-4; Dexterity 1-3 lose Broken; Durability 4-6 hold 3 plates; the Bulwark's 5 / 6 / 7 pool, the Breaker's chain of 5, the Operative's +1 Shadow, the Rigger's +1 held, One More Bond; Core Change I to II and Backdraft II to III; Shape retired; praying above standing behind Faith 8 | every class and many skill levels | no load failure (all derived). The lead's ruling decides the losses. Held counters in a saved fight are clamped (02, 03 and 04 already say so) |
| M-4 | **Perks whose meaning changed** (07 sections 4.2-4.4: 12 Mastered changed, 14 story perks given fight halves, 19 re-steps) | anyone who chose them under the old text | re-steps are upgrades and need nothing. For the changed meanings use the existing re-pick (`pendingRepicks`, `answerRepick`, `migrateCharacterPerks`) so a chosen step can be chosen again |
| M-5 | **Drill thresholds:** 02's 600 / 1,200 / 1,800 would drop Mark I from weapons at 300-599 (marks are derived from the total) | every drilled weapon | none if S10's fix is taken (05's thresholds kept); otherwise scale saved totals x2 |
| M-6 | **HP and MP revisions** (01: `HP_REV`; 04: an MP revision); Devotion XP above the new top of 300 | every character | the existing `migrateCharacterHp` and `migrateCharacterMp` by share of the bar; Devotion XP clamped to 300 (standing 10, no loss); start 0 only for new characters |
| M-7 | **Saved shapes:** `GearState.prop` to `props` (07); `sigilGrowth` gains the firsts set (03); Overclock's state key | saved characters | a load default for each; `prop` becomes `props: [prop]` |
| M-8 | **A room's saved snapshot mid-fight or mid-run** (`apps/server/src/index.ts:99-100`: the host's `save` is a state snapshot) | rooms saved in a fight | `migrateCombatHp` moves characters only; enemy units would keep old-scale HP, armour and levels. Restart a fight in progress from its node on load (a run between nodes is safe: `stage` keeps its meaning, 06 section 3.5) |
| M-9 | **Advanced gates 7 to 10** (05) | none: advanced classes are shelved and a held one gives nothing (`classes.json advanced.held_rule`) | none |

### The re-record union

Every table below is moved on purpose, re-recorded once, after the spec and the data land. No guard is loosened to pass.

| Guard | Moved by |
| --- | --- |
| all 14 `golden-damage*` tables and `test/golden/builds-allin.json`, `builds-normal.json` | 01 (base, Stat terms, columns, grades, Margins), 02 to 04 (every cash-out), 07 (grades, perks, stack kinds), 05 (builds legal at the new ceilings) |
| `golden-costs*` and `costs-*.json` (including `costs-cooldowns`, `costs-foes`) | Takes at 2 AP, Slam "all", Tending and Pump MP, Syphon, the Hymn's wait, Verdict, Called Shot, Overclock, upkeep, mods and signatures |
| `golden-rules*`, `rules-enemies.json` and `.log.json`, `golden/enemies.json` | Reach, the Pushes, Grace, Bonds, the stage cap, the enemy table and tiers |
| `golden-itemops`, `golden-mods`, `golden-conditions` | class and perk rows, the grade as a carried row, signatures, `toxin`, the Push conditions |
| `test/replay-hash.test.ts`, `golden/replays.json`, `test/helpers/replay.ts` | every seeded game |
| `test/old-save.test.ts` and fixtures | M-1 to M-8 (a new fixture per revision) |
| the suites that read today's numbers: `enemy-levels`, `level-gains`, `levelup-revert`, `fx-hp-stamp`, `heal-pct`, `rules120-heal-shield`, `bond-heal-shown`, `figments*`, `outburst20*`, `outburst40*`, `rules119-outburst`, `sigil14*`, `sigil15*`, `sigil-word-cap`, `legendary-deed`, `skeleton-strength-checks`, `rules115-review`, `rules123-defence`, `bugsweep-1112`, `enemy-doors-183`, `enemy-bonds-186`, `enemy-ai-179`, `items-b0`, `follow-strike`, the class-rank and faith suites, `descriptors`, `actions` | each names its mover in 01 to 07 |
| `sigil-balance.test.ts:23-38` | delete with `SIGIL_CAP` (a withdrawn line) |
| `test/balance/*` (`magic-measure` castsToKill, `shadow-measure`, `survival-run*`, `party-fit`, `balance-sim`, the rest) | read again as readings (rules 1.94); `survival-run`'s bars re-set to measured shares |
| `survival-*` suites (`encounter`, `stage`, `vault`, `progress`, `layout`, `faces`, `loot`, `materials`, `field*`, `map`, `run-levels`) | world levels, the budget, the final template, the ceilings by map, XP by the fight's level |
| `tools/validate.py`, `tools/check_spec_tables.py`, `tools/text_numbers.py` and `test/datatext.test.ts` | new blocks and fields, Celestial as a find, the spec's tables, every rewritten text |
| the lint baselines (`lint-item-ops`, `amount-literals`, `lint-costs`) | **shrink only**: section 5's literals and handlers leave code |
| web: `combat-actions.test.ts`, `levelup.js`, `classView.ts`, `runView.ts`, `narrator/context.ts`, `faith-context.test.ts`, `protodata.json`, the e2e suites that read a number | displayed numbers, ranks, ceilings, XP |

---

## Questions for the lead (each with my recommendation)

1. **The cards: "true as written" (01) or one rule, the attribute +10% a point and the alpha +5% (03 Question 5, 04 Question 1)?** Recommended: **the one rule**, with Agility +5% on Dexterity weapons (02 section 3(h): each Agility point also moves every step) and Dexterity +5% as the alpha. *Every attribute makes its door bigger by the same step, and three false cards (Determination, Will Power, Faith) become true in one stroke.* 01's T5 `k` values are re-pinned on it.
2. **Enemy Defense: level-free with the gap as the only level on the roll (01), or rising with the expected attacker (06)?** Recommended: **level-free**, with 06's tier Defense (Elite 14, Boss 15). *A point of skill is always a Margin you can see, and "against an Elite the same roll just lands" holds at every level.*
3. **The top of the scale: is 07's six-digit turn "something super", or over the five you asked for?** Recommended: **hold five**, by S14's two changes: the sheet adds as one kind, and Margins multiply the plain hit, not the door's cash-out. Then drop stack kinds (S12) unless you want them for another reason.
4. **Five digits for every door's full cash-out at level 20, or only the single-target doors (Momentum, Sigils, Shadow)?** Recommended: **every door**, by raising Bite at 9 for Pressure, Guard, Bonds and Outbursts (M2). *The specialist who waits is paid the same in every door.*
5. **Live characters above the new ceilings and with rank III before level 15:** grandfather, or recompute? Recommended: **grandfather both** (M-1 and M-2). *The charter's rule "a reward is never taken back" applies to a player's sheet first.*

---

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| One factor x0.6 everywhere (S1) | each file's own keys (01 T3, T4) | 02 to 07's absolute numbers re-derived on 01's units |
| One enemy table (S2, M1) | `levelled()` (`data.ts:116-120`); `enemies.json levels.table` | 01's columns; 06's jump rule dropped |
| Tier rows with 06's Defense (S3) | `enemies.json items[]` | one set of five rows |
| The cards (S4, Q1) | `rules.json output.profiles`, `output.pairs` | one slope rule; `k` re-pinned |
| MP, Syphon, Strain (S5, S6) | `maxMp`, `syphonMult`, `soul_modules.json strain` | 04's numbers; an `mp` array in `output.level` |
| HP (S7) and the plate (S8) | `maxHp`, `guardSoak` | the merged formulas |
| Criticals become Margins (S9) | `critMult`, `crit_damage`, `crit_taken`, `critMin` | constants deleted; one line per card |
| Drill (S10) | `techniques.json rules.drill` | 05's rates and thresholds; 02's gifts |
| Grade by map (S11) | `survival.json rewards.ceiling`, `vault`, `stageCeiling` | 07's finds and shelf; 05's vault rule |
| Endless levels (S12) | `worldLevel` (06), `pacing.py`'s map-end levels | levels by 05's clock |
| One Stat term (S13) | `statTerm` (`output.ts:87-92`) | unchanged in shape |
| Five digits at the top (S14, M2, M3) | the Margins term; the door rows' Bite | Margins on the plain hit; Bite at 9; the tube rows x0.5 |
| The Push (M8) | `res_max:` (from `ties_max:`), one-use conditions | the Body Pushes reworded |
| Earthbreaker (M9) | the Finisher rows (`techniques.json`) | the handler goes |
| Migrations M-1 to M-8 | `legendRoom`, `classRank`, `pendingRepicks`, `migrateCharacterHp`, `migrateCharacterMp`, `migrateCombatHp` | `CAP_REV`, `rankHeld`, a mid-fight restart |

## Needs a new primitive

The final list of section 4, sixteen general pieces: **S1** Margins, **S2** the door ladder (generalised `ladderAt`), **S3** the `cash:` and `cash_share:` source, **S4** keyed Marks (the generalised drill bar), **S5** `res_max:<resource>` (generalised `ties_max:`), **S6** `wear:<resource>`, **S7** `growthWorth` with `practice_rate` (extended `growthHeld`), **S8** the `attr:` source, **S9** firsts (the generalised felt list), **S10** the resource `grace`, **S11** the stat `begin_stage`, **S12** stack kinds (only if Question 3 keeps them), **S13** `crit_range` (generalised `aimed_crit_min`), **S14** `targets.past`, **S15** `GearState.props`, **S16** the `injure` op. Seven of the sixteen generalise a piece that exists. Dropped as new: 01's primitives 2 and 3, 05's P3 and 06's two (extensions or rewrites), and the duplicates under other names.

## What re-records

As section 6: the 14 golden damage tables and the golden builds; the costs, rules, item-ops, mods and conditions tables; the enemy goldens; the replay guard; `old-save` with a fixture per revision (M-1 to M-8); the suites that read today's numbers; `sigil-balance` deleted; every balance measure read again; the Survival suites; the validator, the spec-table check and the text-number guard; the lint baselines, which only shrink; and the web screens and e2e suites that show a number. The spec is changed first, then the data, and every golden table is re-recorded once.
