# Critic: third consistency pass (0.34 growth bible, ruling F)

Read on 21 Nov 2026 in `E:/phc-wt/rel030` (branch `release/0.34-final`). `python tools/balance/check.py` printed **147 PASS, 0 FAIL, 0 WAITING**, and `--tables` ran clean. This pass tries to break that result. All numbers below were computed from the bible JSON and `data/` (read only), mostly through the checker's own functions with one extra term added, so each one can be repeated.

**VERDICT: NOT READY: 18 findings in kinds 1, 3, 4 and 6 (16 distinct, since 3.1/6.1 and 3.2/6.2 are the same items seen twice).** Kinds 2, 5 and 7 hold 8 more (kind 2: none).

| kind | count | blocking |
| --- | --- | --- |
| 1 the checker against ruling F and 29 to 39 | 9 (+1 note) | yes |
| 2 prose numbers against the JSON (40 sampled) | 0 | yes |
| 3 rulings A to F not applied | 3 | yes |
| 4 flat numbers still on the old scale | 2 | yes |
| 5 08-primitives | 3 | no |
| 6 migration | 4 | yes |
| 7 09-build-order | 5 | no |

---

## 1. The checker (`tools/balance/check.py`)

### Three doors' largest legal level-20 turns, by hand

These were worked from the JSON and data by hand, then re-run through the checker's functions. All three agree with check (a):

- **Momentum, the Coup.** Plain: the ork wreck saw. 18 (30 × 0.6) × melee Stat at 10/10 (k 1.1483 × 1.9 × 1.5 = 3.2727) × deal(20) 40 × Celestial 1.75 = **6,414**. Units: Reach 7 + Overswing 1 = 8, so cash(8) = (1.2^8 − 1)/0.2 = 16.50. C = 1 + 0.35 × 16.50 = 6.775. To-hit: +9 (skill) +3 (grade) +5 (level gap) +7 (terms) = +24. Against Defense 8: (44 − 8)//4 + 2 = 11 Margins × 0.35 = 3.85. SUM: the mark 0.2 + Spill 0.1 = 0.3. Total: 6,414 × 10.625 × 1.3 = **88,596** (check: 88,596).
- **Sigils, the Evoke.** Plain: STONE, **4,565**. Units: 5 + 1 = 6, so cash(6) = 9.930; Bite 0.85 gives 8.440. To-hit +22: (42 − 8)//4 + 2 = 10 Margins = 3.5. SUM 0.8 (the mark 0.2, Overflux 0.1, Written in Advance 0.1, Hold the Stroke II 0.3, the STONE inflection 0.1). Total: 4,565 × 11.940 × 1.8 = **98,111** (check: 98,125; the gap is rounding in the plain hit).
- **Guard, the Slam ring.** Plain: the ram plate, 18 × 3.2727 × 40 × 1.75 = **4,124**. Plate: soak 3.6 (6 × 0.6) × guard Stat 1.827 × 40 × 1.75 = 460.4. Units: 6 + 1 = 7, cash(7) = 12.916. Total: (8 × 4,124 + 460.4 × 2.0 × 12.916) × 1.8 = **80,788** (check: 80,786).

So the arithmetic is right. What is wrong is **which sources the checker counts**. All of the following are legal at level 20 and none is counted:

1.1 **Feelings given through a Bond are missing from the bible** (CONFIRMED). The Mender's rank II Inspire (`classes.json:5393`, bible `soul.json` insight class rank 5) gives an ally a felt feeling. Several of those feelings multiply the ally's next hit, the Coup or the Line included, with no door limit (`conditions.json`): `given_rage` ×1.2, `given_joy` ×1.15 (and +1 to hit), `given_shame` ×1.3, `given_despair` ×1.3 below half HP, `given_abandon` ×1.4. The word "given" appears nowhere in `tools/balance/bible/*.json`. Ruling 30 lets a cash-out count only its own door and one mark, but the bible never restates these feelings as plain-only, and the data reaches every hit. With `given_abandon` read as +0.4 in the sum:

| door | as checked | with `given_abandon` |
| --- | --- | --- |
| Momentum | 88,596 | **115,856** |
| Sigils | 98,124 | **119,930** |
| Outbursts | 97,407 | **115,118** |
| Figments | 92,578 | **114,362** |
| Shadow | 94,049 | **112,859** |

Five doors go to six digits. Read as a ×1.4 multiplier the result is the same or worse.

1.2 **To-hit gifts from allies are missing** (CONFIRMED): Inspire's `given_edge` +2 (`classes.json:5516`), Benediction's `blessed_aim` +1 (`forks.json:767`), the canticles' +1. Neither name appears in the bible. +2 to hit gives Sigils one more Margin, **101,001**, and Outbursts **100,796**.

1.3 **Defense-lowering conditions are not counted.** check.py:457 takes the lowest tier Defense, 8, but `exposed` −2 (laid by the Breaker's Break, `classes.json:663`, and by Breach, `:890`), `corroded` −2 and `foe_abandon` −3 lower it further. The bible never says whether these are marks (one slot) or extra set-ups. With Exposed, Sigils gets one more Margin, about 101,000.

1.4 **Spotter is missing from the plain-hit check.** `fork.shadow.spotter` turns an ally's first plain weapon hit on a Marked foe into an ambush, +50% (`forks.json`; `mind.json:92` says "plain hits only"). check.py:486 adds only plain terms of the hit's own profile and the mark. Momentum's largest plain hit, 98,930, on a foe whose slot holds the to-hit mark that Spotter needs: 98,930 × (3.18 − 0.2 + 0.5)/3.18 = **108,263**.

1.5 **The plain-hit check gives a door's plain hit Margins only when one of its cash-outs rolls** (check.py:487). Guard's plain shield blow rolls to hit, but it is counted with 0 Margins: 15,175. With +22 to hit it earns 10 Margins, about 68,300. This one fails nothing today, but the check reads the wrong thing.

1.6 **Hits that strike many foes are counted inconsistently.** The Slam ring (8 foes) and Cleave (`targets`) are summed across their foes. Earthbreaker (`gear_perks.json:2649`: the Finisher's cash-out on every unit in a 3×3), area Lines, Outburst Wave and Burst, and the Miracle (`patrons.json` old_overcast: 150 × Blessing power in a 5×5) are not modelled at all. Two ways to fix it: a rule (each hit counted alone, totals only for named moves), or a `targets` field on each of them. As it stands, "largest legal turn" has two meanings.

1.7 **`{"data": ...}` references are never checked** (CONFIRMED). `Bible.audit` (check.py:119-133) checks only `@` references. 2 of the 182 data references do not resolve: `pacing.gates.rank_thresholds.II` and `.III` point to `classes.json:rank_thresholds`, but the real path is `assignment.rank_thresholds` (`classes.json:12`). So ruling 12's "rank III needs the attribute at 8" is never checked.

1.8 **Numbers typed into the checker:**
- check.py:652: `totals == [38, 20] or (career read from pacing) == totals`. Because of the `or`, a wrong career passes whenever pacing agrees with it. Ruling 11 needs both conditions, so this should be `and`.
- check.py:809 clamps the level gap at ±5 instead of reading `enemies.json levels.gap.max_levels`.
- `min(20, L)` (:788), `nxt <= 10` (:636) and the 0.02 gate-share tolerance (:844) are also typed.

1.9 **Iron Grip breaks the bible's own rule, and the checker does not notice.** `gear_perks.rules.own_door` says a perk of the door's own skills counts on its cash-out. Iron Grip (`gear_perks.json`, skills `raw_power`, `own_door: momentum`) was given `scope: plain` so that the Coup would pass (README: 109,042). The entry contradicts the rule, and nothing checks the `own_door` field against the term's scope. It is flagged PROVISIONAL, but it is still a contradiction.

1.10 (note) The checker counts both the to-hit mark (`mind` `foe_mark`, any door) and the +20% damage mark, although a foe holds one mark at a time. This overstates the total, so it hides nothing, but it is not the rule.

## 2. Prose numbers against the JSON: 40 sampled, 0 differ

The sample:
- **02:** Reach 1/4/7/10 and Bite 1/6/9; Pain Threshold gates 4/7; Warn plates at 2 and 6; senses at 3/6/9; Slam 2 AP; the Push +1; "half again" (6 against 4); the one-foe Slam five digits at Relic (hand: 11,371).
- **03:** the Analysis, Vigilant, Rumination, Eloquence, Proficiency and Charisma gates.
- **04:** Empathy Reach and Bite; Mend 12, Shield 15, Down 8; Triage 2 AP, 10 MP, 3.4; Inspire 1 AP, 12 MP, 1.69; Rally 2 AP, 35; Field Surgery 30; Will Power Reach; Faith Bite 0.15/0.20/0.25; the Grace gates; the Hymn's wait 10 / 0.5 / 0.25; the prayer Push 10 / 20 XP; Overbind's 0.1.
- **07:** the restep 0.15 / 0.3 / 2 / 3 / 4; Bulwark 0.05 / 0.06 to 0.3; Mirage 0.075 × 4; Iron Grip; Edge 0.1; Bright Script 0.05.

One small prose error, not a number: 06:60 and 06:89 say "Insinuation does not exist". It is the display name of `implication` (`skills.json:4459`).

## 3. Rulings A to F

Checked and applied: A1, A3, A4 (the cards), A5, A6 (the Strain share 0.06), A8 (as far as the checker counts), A9, A10, B11, B12 (ceilings, swapped gains, rank levels), B13, C16 to C20, D22 (drill 20/35/70/180/360, ×1.5), D24 (maps 2m + 1, the final boss at 11, endless m + 4 to m + 6, level 20 at hour 42.4), D25, D27, F29 to F38 (except the gaps in section 1).

Not applied:

3.1 **The alpha ladders move a perk step from 5 to 6, and no ruling says so.** Every alpha ladder has perk steps at 3, 6, 7 and 9: point 5 now opens Slam's shove, Throw Down, Flush Out and so on. Every beta and gamma ladder keeps 3, 5, 7, 9. `skills.json mastery_at` is one table for all skills, `{1: 3, 2: 5, 3: 7, 4: 9}`, and the spec says Mastery 2 is at 5. No ruling covers the change, no `data/` line, no build step and no migration row (see 6.1).

3.2 **Ruling 39 ("keeps every move it already holds") is broken by the retired moves:** the Mender's One More Bond (`soul.json:485`), the Channeler's Shape (`:1138`), the Operative's +1 Shadow (`mind.json:175`), the Rigger's +1 held (`:581`) and the class dials. `movesHeld` covers only moves that changed rank. `reachHeld` covers Reach, but not Shape, which is a move.

3.3 **A2 and A7 do not match what was ruled.** A2 ruled heals on a ×65 column; `scale.columns.mend` is a different column. A7 ruled 25% to 35%; `per + per_perception × P` gives 26% to 35%. Both are open questions to the lead (01, "Questions"). Until the lead answers, they are not applied as ruled.

## 4. Flat numbers still on the old scale

4.1 **Condition texts will show a flat number** (PLAUSIBLE). Bleeding, Burning and Corroded each carry their tick twice in data:
- `amounts.tick`: the engine deals this one, on the level column (`magic.ts:518`, `:622`, `sigil.ts:1330`).
- `effects[0].value`: the text reads this one (`{=effects.0.value|abs}`).

The factor table moves both (TABLES.md:53-58), but the text copy stays flat: "3 damage" on screen against about 120 dealt at level 20. One copy has to go, or the text has to read the amount.

4.2 **Typed numbers with no build step.** `character.ts:775` injuryText "Bleeding: 5 damage a turn", `rules.json:1486` "8 true damage per point over the limit" (the overload is now a share, 0.07) and the glossary's Strain line are listed in 01 §14. None of the steps in 09 assigns them.

## 5. 08-primitives

5.1 **S18 (a condition `slot`) is mostly built already.** Inspire already makes feelings exclusive in data: it cleanses the whole list before it gives one, and it uses `target_lacks [given_mark]` (`classes.json:5425-5480`). `damage_mult replaces` (ENGINE-HOOKS:167) takes a named term out. Either show why a slot is still needed, or build exclusive marks from these.

5.2 **S11 (`begin_stage`) goes against the reasoning used to drop `res_start`.** Section 3 drops `res_start` because "the resource op on combat_start" does that job. By the same logic, a Begin's first stage is the `resource` op on the Begin action (`when: acted` with an action filter), not a new stat.

5.3 **S17 has nothing to read.** S17 and `scale.grades.prayer` read "the highest standing reached", but no saved field holds a peak, and §2's list of fields with load defaults (`capGrace`…`respend`) does not add one. Also, the prayer Push's "the tier ladder's Reach +1 through S5": S5 is the top of a pool, and a Hymn tier is not a resource.

## 6. Migration (`pacing.migration`)

6.1 **The perk step at alpha 5** (3.1). A 0.33 character with an alpha at 5 or 6 holds two perk steps, and the new ladder gives the second only at 6. Without a row it either loses a perk it chose or keeps one it has not earned.

6.2 **Retired moves** (3.2). A live Channeler loses Shape; a Mender at Empathy 8 to 9 loses its fourth Bond unless `reachHeld` is applied to Bonds (the examples in the row's `who` do not name Bonds).

6.3 **Devotion "kept whole, never clamped"** (PLAUSIBLE). The current readers do clamp, and step 6 does not name them:
- `devotionXpOf` (`character.ts:276-280`) returns the stored level's threshold when the XP and the level disagree. A 0.33 character with 270 XP at standing 8 reads as standing 9 on the new curve, so the reader returns 225.
- `setDevotionXp` (`:283`) clamps to the curve's top: 300 on the new curve, 450 today.

6.4 **The prayer grade's peak standing** has no saved field and no load default (5.3). After a Miracle, the old save's history is gone.

## 7. 09-build-order

7.1 **Step 1 cannot pass its own proof.** Its proof asks that every door's level-20 plain hit at Relic and Celestial equal check (a). But the magic, focus and prayer grades (A9; the foci's `with_this` rows; S17) arrive in step 5.

7.2 **Step 2 cannot pass its own proof.** "The largest legal turn equals check (a)" needs:
- the tier-II perks, the properties (`prop.true` and `prop.deep`; S15 for Celestial's two), the mods' to-hit and the boons, all in step 5;
- the drill Mark II to-hit (S4), in step 3.

7.3 **`critMin` (`combat.ts:1644`) is rewritten twice:** in step 2a (S1) and again in step 5 (S13). Between the two, `aimed_crit_min` and the critical's feeders, which "land with 2a", feed nothing.

7.4 **Step 3's hour test cannot be run through the reducer.** The hours come from the time model (minutes a turn), which the reducer does not produce; only the XP at each landing node can be tested that way.

7.5 **The "one copy of the grade" move has no step.** 07 §1 moves the grade onto the instance's effects and has `combat.ts:580`, `:585` and `:1536` stop reading it. No step owns that move, while `rules.json rarity` is edited in both step 1 and step 5.
