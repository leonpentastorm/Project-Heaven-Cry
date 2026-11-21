# Critic: second consistency pass over the growth bible (0.34 rebalance, design phase, 21 Nov 2026)

For the lead. I read `00-rulings.md`, the seven second drafts (01 to 07) and ran both read-only scripts (`PYTHONUTF8=1 python tools/balance/scale.py`, `python tools/balance/pacing.py`). I changed no file but this one. Numbers I computed are marked "computed" with their working, from the files' own numbers. Facts about today carry file:line, checked in `E:/phc-wt/rel030`.

**VERDICT: NOT READY: 37 blocking findings (kind 1: 18, kind 2: 6, kind 3: 2, kind 4: 6, kind 7: 5); also 6 of kind 5 and 5 of kind 6, which do not block.**

Most serious first within each kind. Each finding: where, what, and a one-line fix.

---

## 1. Two files, two numbers or formulas for the same thing

**1.1 The top-of-scale check that 01 owns is stale, and 07 builds on it.** 01 T11 and 10.3 read the first drafts: Guard Bite 1.40 at 9, Shadow 1.05, Sigils 1.05, Bonds x1.4, and 07's old squad sum +220% (01 lines 970-998). The script hard-codes them (`tools/balance/scale.py:569-589`, `brain_bite` at `:640`, `squad_sum` at `:66-67`). The door files now say Guard 3.5 (02 1(b)), Shadow 0.55 (03 1(b)), Sigils 0.95 (03 2(b)), Bonds x1.6 (04 1(b)). 07 6.3's column "01 T11 largest, 9 Margins" then reads 72,420 for the Break, 61,983 for the Line, 8,325 for the Slam and 12,736 for Snap All. By the door files' own numbers those are about 47,800, 57,500, 20,812 and 14,600. 01 T12's Sigilist row also uses Bite 1.05. 01 10.3 items 1 to 5 tell 02, 03 and 04 to do things they have already done in other ways. **Fix:** put the door files' Reach, Bite and Push in scale.py's `PROPOSAL`, drop `squad_sum`, re-run T11 and T12, and rewrite 01 10.3. Then 07 6.3 reads the new T11.

**1.2 05 and 06 run on two clocks.** 06 3.2 gives map 1 as hours 0 to 3.0 with the squad leaving at level 4.3, map 5 as 12.6 to 16.0, "2.4 hours a level from level 6", the Elites at 20 on map 14 "hour 35.2 to 37.6" and "level 20 at hour 40 (05's XP table)". 06 1.3 places the squad at level 4 at map 1's Boss and at 5 / 7 / 8 / 10 at the later Bosses, and says map 1's Boss is "at or under its level: the full-HP guard is off". 05 1.3 and 2.2, and `pacing.py` section 1b, say map 1 runs 0 to 2.6 and the squad leaves at 3, map 5 runs 10.8 to 13.7, endless maps take 3.0 to 3.45 hours each, and level 20 lands at hour 42.4. Under 05, map 1's Boss (level 3) meets a level-3 squad and the guard holds. 06's own "Critics' findings" says the hours are 05's. **Fix:** 06 3.2 and 1.3 quote 05 1.3's table (hours, arrive/leave levels). 06 1.3's second table and its item 2 are re-derived at 05's levels.

**1.3 04's hours for each level are 05's first draft.** 04 0.2 says "level 2 at hour 0.5, 3 at 1.25, 4 at 2.5, 5 at 4, 6 at 6.4, then 2.4 hours a level: 10 at 16, 15 at 28, 20 at 40". Its six spend tables' hour column uses the same figures. 05 2.2 says 1.0 / 2.6 / 3.6 / 5.2 / 6.3, then 10 at 11.9, 15 at 25.9 and 20 at 42.4. **Fix:** 04 0.2 and the hour columns quote 05 2.2.

**1.4 Devotion's pace is stated twice.** 04 3(e), quoting "05 section 4", says standing 3 at about hour 5.0, 5 at 11.8, 7 at 21.9 and 10 at 35.5, at "about 8.5 XP an hour". 04 3(d)'s Push price and 3(j)'s Chaplain table read those hours. 05 4.1 and `pacing.py` section 4 say 3.9 / 9.6 / 18.6 / 31.6, which is about 9.5 XP an hour to standing 10. That is also against ruling D22. **Fix:** 04 quotes 05 4.1's hours and drops its own rate.

**1.5 The door Mark thresholds disagree.** 05 4.2, which owns them (D22), gives:

| Door | 05 4.2 | Door file |
| --- | --- | --- |
| Shadow | 66 / 350 / 523 / 690 | 58 / 319 / 493 / 667 (03 1(e)) |
| Sigils | 78 / 408 / 610 / 805 | 68 / 374 / 578 / 782 (03 2(e)) |
| Figments | 66 / 350 / 523 / 690 | 60 / 330 / 510 / 690 (03 3(e)) |
| Bonds | 33 / 175 / 262 / 345 | 28 / 154 / 238 / 322 (04 1(e)) |
| Outbursts | 52 / 272 / 407 / 537 | 44 / 242 / 374 / 506 (04 2(e)) |
| Prayer | 44 / 233 / 349 / 460 | 38 / 209 / 323 / 437 (04 3(e)) |

05 4.2's own note ("these replace 02's and 03's 60 / 380 / 600 / 820") is also stale. **Fix:** 03 and 04 name the unit only and quote 05 4.2's row (as 02 does). If a door file's units per fight differ from 05's, 05 takes that count and re-runs.

**1.6 Figment form Marks: each file cites the other.** 03 3(e) uses "05's `form_marks` [3, 7, 13]" and lists consistency minor 3 as NOT FIXED. 05 4.1 uses "[6, 20, 50] fights (03's)" and lists it as FIXED. 05 4.3's 80% for forms reads [6, 20, 50]. **Fix:** 03 quotes 05's [6, 20, 50], which 05 owns by D22, and re-reads its "Mark I in about an hour".

**1.7 Shadow's Bite at 9: 0.55 in 03, 0.52 asked by 07.** 03 sizes 0.55 against 9 Margins and a +109% sum. 07 6.3 counts 10 Margins and +108% (the door's own sources plus the mark) and asks for "about 0.52". At 0.55 the Break is six digits (finding 4.1). **Fix:** 03 sets Bite at 9 to 0.5. That gives about 97,800 on 07's sum at 10 Margins, computed: 4,968 x (1 + 0.5 x 9.93 + 3.5) x 2.08.

**1.8 The vault's grade is stated twice, differently.** 05 5.2 says `vault.grade_up` 0 and `grade_max` celestial: "the vault's three are at the map's finds grade". 07 1.3 says a new list, `vault.grades` = `[masterwork, masterwork, relic, relic, relic, relic, relic, relic, relic, celestial]`, in place of `grade_up` and `grade_max`. 05's calendar (section 7, "Celestial (vault)" at hour 27, map 10) and 07's agree only from map 5 on. **Fix:** one list, 07's key `vault.grades`, holding 05's values (finds' grade). This also settles finding 2.1.

**1.9 The B15 migration has two copies, with different shapes.** 06 7 says "05 quotes this section; it is the one copy": a `CAP_REV`, with `c.capGrace` stored as "a count". 05 8 writes its own table: a `GROWTH_REV`, with `c.capGrace` stored "by attribute", `c.rankHeld`, `c.pointsOwed`, the XP, study and practice rebase, Devotion and feelings. Ruling B15 asks both files to write it and test it on the real load path. Two revisions for one move is a second copy of a rule. **Fix:** one revision, `GROWTH_REV`, written once in 05 8; 06 7 points to it. `capGrace` is stored by attribute, so a later ceiling rise absorbs the right attribute's points; `legendRoom` reads its sum.

**1.10 Devotion XP above the new top: clamped in 04, kept in 05.** 04 3(e) and its findings (M-6) say "XP above the new top of 300 is held at 300". 05 8 says "its Devotion XP is kept". **Fix:** keep it, as 05 says. The standing is 10 either way, and nothing is taken (B15).

**1.11 Drill hours, and the 80% for techniques.** 02 section 4 quotes 05 as "Mark III in about 2.6 hours, 1.8 for a martial class" and "about 17 weapons drilled for 80% ... at about hour 42". 05 4.1 says III at 2.2 hours, or 1.6 for a martial class. 05 4.3 says 16 and 19 weapons to Mark III: 48 techniques (72%) at level 20, 56 (84%) at hour 50. **Fix:** 02 quotes 05 4.1 and 4.3.

**1.12 One data key, two names.** 02 0.6 and its Built from (and 03 0.7's formula) name the beta's flat term `per_point.numbers.own`. 04 0.3, 1(g), 3(g) and E1 name it `feed_flat`, writing the same formula as `1 + (feed_flat + feed x alpha) x beta`. **Fix:** one name, `feed_flat`, in all three files.

**1.13 Class dials get two treatments.** 03 2(i) and 3(i) delete the Sigilist's and the Rigger's dial rows (`classes.json:1941`, `:2282`). 04 2(i) leaves the Channeler's dial at 1 (`:2821`), and nothing is said about the Chaplain's (`:4001`). `classes.json:8904` `dials_note`: "a dial at 1 is no item at all". **Fix:** one rule for the four dials (recommended: delete all four, as 03 does), stated once in 01 or 07.

**1.14 01 T2b and the door files give different bases.**

| Item | 01 T2b | Door file |
| --- | --- | --- |
| Triage heal | 2.58 | 3.4 (04 1(i)) |
| Inspire's Love | 1.14 | 1.69 (04 1(i)) |
| Launch `base` 13 and `per` 3.3 | listed | retired (02 2(c), "a note for 01") |

01 owns the factor; a door file owns its move's design. **Fix:** 01 T2b marks these four rows "restated by 02 / 04" (as it marks the trait rows "restated by 07"), so the builder has one value per key.

**1.15 Word and module counts by hour.** 03 2(e) says "a word every 1.6 hours, 33 of 40 by hour 48". `pacing.py` section 4 says 30 by hour 48 from study alone, and 05 4.3 says 37 at level 20. Word Mark III's count: 05 4.1 says "03's Word Marks: 10 / 30 / 80 uses", but 03 2(e) says "05 to set". 04 2(e) says modules "23 of the 28 by hour 45"; `pacing.py` says 22 by hour 45 from practice alone. **Fix:** 03 and 04 quote 05 4.1 and 4.3. 05 owns Word Mark III's 80 and says so; 03 quotes it.

**1.16 A skill name that does not exist.** 06 1.5's `bonded_iii` row needs "Implication 4". Insight's gamma is Insinuation (04 1(g); `skills.json:4458`). **Fix:** read Insinuation 4.

**1.17 01 contradicts itself on Expression's elemental line.** 01 4.2 and T5 (the `elemental` profile) keep "+10% elemental damage" on Expression's card and +5% on Visualization's. 01 4.3 says a hit reads one pair, the pair of the door that cashes it out, so no Line, Outburst tone or Figment blow reads the elemental pair. The card promises a number that nothing pays (03 question 1). **Fix:** 01 takes 03's recommendation: drop the elemental line from both cards and delete the `elemental` profile row, so the cards say what they pay.

**1.18 What a Sigil's "plain hit" is (minor).** 03 2(c) says "a Line of 2 is the plain Sigil hit". Yet 03 2(c) and 01 T11 put the Margins on one glyph's hit (about 4,570 at level 20, Celestial), which is half a Line of two. 01 section 9 defines a Margin as a quarter of "the weapon's or spell's damage before the cash-out's multiplier". **Fix:** 01 section 9 says it in one line: for a Line, the plain hit is its Subject glyph's damage, before `Bite x S(n)`.

## 2. Rulings not applied

**2.1 D25: Relic is found from map 5.** 07 1.3's vault gives Masterwork on maps 1 and 2 and **Relic on maps 3 and 4**. The ruling: "Fine on maps 1 and 2, Masterwork on 3 and 4; Relic is found on map 5". 01 3.2's stated attacker reads the same ruling. **Fix:** as 1.8 (the vault gives the map's finds grade).

**2.2 C21: no perk dead in Survival.** 07 4.3 keeps Cultured (`perks.json:12602`) as story only ("an achieved perk may be story"). **Fix:** give it a fight half from existing pieces, as the 14 others got (for example, Read on the first art-bearing foe or object, or +2 on one Brain save a fight).

**2.3 A2: the heal column.** The ruling says heals ride "01's x65". 01 3.1 sets `mend` at x48.4 at level 20, and argues that x65 was the first draft's HP reading and that the ruling's reason (a heal stays the same share of a bar) is what x48.4 keeps. The reasoning is sound, but it departs from the ruling's number. **Fix:** the lead confirms x48.4 in one line of 00-rulings.

**2.4 A8: the remedy was "trim the sources in 07".** 07 6.1 and 6.2 replace trimming with two new rules: a cash-out carries only its door's own sum and the mark, and a foe carries one mark at a time, which cuts Judgement Day and True Name from +50% to +20%. 07 puts this as question 1. Until the lead answers, the ruling is not applied. **Fix:** the lead rules on 07 question 1. Even with a yes, findings 4.1 to 4.4 stand: the door's own sum alone reaches six digits.

**2.5 D27: `xp.party_pace`.** The ruling names an `xp.` row. 05 6 applies it to practice and Devotion, not to XP (05 question 1). **Fix:** the lead rules on 05 question 1. If the answer is yes, rename the key `survival.json growth.party_pace` so its name does not say XP.

**2.6 A7: "25% to 35%".** 01 reads it as 0.25 + 0.01 x Perception, which is 26% to 35%; ten points cannot span 25 to 35 in whole points. **Fix:** the lead picks one: `0.25 + 0.01 x (Perception - 1)` (25% to 34%) or 01's reading. One line in 00-rulings.

(D22 is also broken by findings 1.4, 1.5 and 1.15; they are counted there.)

## 3. Flat numbers still on the old scale

**3.1 Mother Ember's intervention per point of Devotion.** `patrons.json` `mother_ember.intervention` `per_devotion` 2.1 is not in 01 T2b; 04 3(k) uses 1.26 (x0.6) and reports the gap. `faith.ts:149` `interventionHeal` types fallbacks 10 and 3 that match neither the row (7 and 2.1) nor the text "10 + 3 x your Devotion" (04's defect). **Fix:** 01 T2b gains the row (2.1 becomes 1.26). The fallbacks leave code in the same change, and the text reads its fields.

**3.2 Storm Front's 10 MP is kept on the new pool.** 04 2(i) moves it into `numbers` x `mp` but keeps 10. Every other MP price was restated on the smaller pool (Tending about x0.5, 01 T7b; the perks x0.5, 07 4.2). 01 6 rule 4 says each MP price is "restated on the new pool". **Fix:** 04 restates it (5 x `mp` by the Tending ratio) with one line of reason.

## 4. Leon's digits rule at level 20, from the files' own numbers

Plain hits (01 T11 and T3b; Celestial, 10 / 10): Guard 4,124, Momentum 6,414, Pressure 4,968, Shadow 4,968, a Sigil glyph 4,566 (a Line of two 9,543 at 03's Bite 0.95), Figments 3,108, a lone Snap 1,223, Outbursts 4,401, Judgement 5,833. All are four digits. Full cash-outs: Guard 16,000 (13,715 Relic), Coup 35,411, Dead Centre 16,060, a Break of 5 about 25,300, a Line of 5 about 32,300, Curtain about 15,000, Snap All 10,500, Release 14,982, Hymn 16,685. All are five digits at Celestial. The findings:

**4.1 Six digits: the Break.** Computed: Last Shade (6 Shadow) at 03's Bite 0.55 gives C = 1 + 0.55 x 9.93 = 6.46. Ten Margins at 0.35 (07 6.3's count) add 3.5. So 4,968 x 9.96 = 49,490 before the sum, and with 07's sum for the Break (+88% own, +20% mark) it is **102,900**. **Fix:** 03 sets Bite at 9 to 0.5 (finding 1.7).

**4.2 Six digits: the Coup with the Breaker's own class term.** 02 2(i) puts Four Ways to Finish's "x1.2 under 50% HP" into the one sum as +20%. It is the door's own class move, so by 07 6.1 it counts on the cash-out. 07 6.3 leaves the Coup "+2%" for class terms. Computed: 65,906 x (1 + 0.30 + 0.20 + 0.20) = **112,000**. **Fix:** 02 makes Four Ways a thing only the class can use (for example, the Finisher's save harder by 2 under 50% HP) rather than a percentage, as C16 asks of a class.

**4.3 Six digits: the Line with its own door's forks.** `forks.json:1264` Overflux (`damage_mult` 1.25 at the Flux limit) and `:1373` Written in Advance (1.2) belong to Brain Power's forks at 4 and 8, so they are the door's own and both can be held. 07 6.3's Sigil list leaves them out; 03 2(c) names them as sources 07 trims. Computed at 03's Bite 0.95 and 10 Margins: 4,566 x (0.95 x 9.93 + 3.5) = 59,050. With Σ = +35% + 25% + 20% + the mark's 20% = +100%, that is **118,100**. **Fix:** 07 6.3 counts every door's forks (each `damage_mult` row in `forks.json`) and its class terms. Then 07 restates the forks so each door's largest legal turn is under 100,000 (on the Line: about +65% in all).

**4.4 Six digits: the Release with its own door's forks.** `forks.json:1510` Ride the Edge (1.15) and `:1612` Blood Price (1.25), Will Power's forks at 4 and 8, are not in 07's +85%. Computed: 45,637 x (1 + 1.05 + 0.40) = **111,800**. **Fix:** as 4.3 (the Release has +14% of room, so the two forks come to about +10% together, or leave the cash-out).

**4.5 Snap All is five digits only at Celestial.** 04 1(b): 10,500 at Celestial, "9,000 at Relic". Relic is 01 3.2's stated grade at level 20, and Celestial is found only, from endless map 10 (D25). 02 held Guard to five digits in both. Computed: a lone Snap at Relic is 1,048; five digits for four Bonds needs Bite 10,000 / (1,048 x 5.37) = **1.78 at Empathy 9**. **Fix:** 04 sets Bite at 9 to x1.8 (about 11,800 Celestial, 10,100 Relic), or the lead states that the five-digit test is at Celestial for every door. Then 02's Guard Bite can fall to its Celestial need (2.2).

**4.6 The weakest weapon's plain hit is three digits (minor).** Throwing darts (base 5, 01 T3) at level 20, 10 / 10, on the melee profile (Stat 3.273), Relic: computed 5 x 3.273 x 40 x 1.5 = **982**; it is 1,145 at Celestial. **Fix:** none needed if the rule is read per specialist's main weapon. If it is "any plain hit", 01 says the darts' row is a support item, or raises its base to 6.

No landed door reaches six digits. Guard's largest is 37,500 on 07's sum, Snap All's 21,900 and the Hymn's 31,700.

## 5. The new primitives, merged (one name each, the smallest form, the piece each generalises)

| # | Piece | Smallest form | Existing piece it generalises (`docs/ENGINE-HOOKS.md`) | Asked by |
| --- | --- | --- | --- | --- |
| S1 | Margins | the roll judge returns `margins`; its term adds to the cash-out factor; `rules.json rolls.margins`; the stats `crit_damage` / `crit_taken` renamed `margins` / `margins_taken` | the critical term sites (`critMin`, `combat.ts:1644`; `critMult`) | 01, 07 |
| S2 | Door ladder | rows `{points, reach}` / `{points, bite}` with `needs` (B13) | `ladderAt` (`figments.ts:45`) and `holderNumber`'s door-ladder reading (ENGINE-HOOKS:878) | 02, 03, 04, 06 |
| S3 | Cash-out source | `cash:<res>` = S(n) of the units spent, `cash_share:<res>` = S(n) / n; the step in data | `sourceOf` / `SOURCE_SPACES` (ENGINE-HOOKS:642) | 02, 03, 04, 07 |
| S4 | Keyed Marks | the drill bar keyed `weapon:`, `door:`, `form:`, `feeling:` | `drillMarks`, `addDrill` (`physical/data.ts`) | 02 to 05 |
| S5 | `res_max:<res>` | one stat family that is a pool's top, written by Reach and +1 by a Push condition; also readable as a number source (this covers 02's "a pool's max as a source") | `ties_max:<kind>` (`tieCap`, ENGINE-HOOKS:617, :990) **and** `setResMax` (`physical/pressure.ts:98`), the registered max that `self_res {at: "max"}` already reads (ENGINE-HOOKS:151) | 02, 03, 04 |
| S6 | `wear:<res>` | one stat family read at the wear sites, answered by `stat_mod` with `context` | `stat_mod`'s `context` | 02, 03, 04 |
| S7 | `growthWorth` | `growthHeld` as a factor: worth by the gap, `party_pace`, `practice_rate` | `growthHeld` (ENGINE-HOOKS:818) | 02, 05 |
| S9 | Firsts | a keyed set on the character with a load default | the felt list (`m.feelings`) | 03, 05 |
| S10 | Resource `grace` | one row in `actions.json resources` | the resource list | 04 |
| S11 | Stat `begin_stage` | one line in `STATS` | the twin of `momentum_start` | 04 |
| S13 | `crit_range` | a gear field with `_modes` | the weapon op `aimed_crit_min` | 07 |
| S14 | `targets.past` | a bool on a `line` set | `targets` | 07 |
| S15 | `GearState.props` | a list in place of `prop`, migrated | `GearState.prop` | 07 |
| S16 | The `injure` op | one line in `OPS` calling `rollInjury` | `rollInjury` (combat.ts export) | 02 |
| S17 | `self_devotion` (a standing predicate) | `{self_devotion: n}`: standing at least n | none reads standing; the stat `devotion_xp` exists (ENGINE-HOOKS:542). The critic's first list called this "S16" by mistake: S16 is the `injure` op | 01 |
| S18 | A condition `slot` | `slot: "mark"`: a condition put into a filled slot replaces the one there | `stacks: false` (same condition only) | 07 |

Extensions, each one key or parameter of an existing piece: an action's pair (`statOf(profile, c, pair)`, 01), the feed's flat term (`doorFeed`, one key `feed_flat`, 02 and 04: finding 1.12), a Σ term's `cash` flag (`stackDamage`, 07), `from_stage`, `pressure_kind`, `stage.from` (`budgetFor`, 06), `foeLevel`'s body and `fightLevel`'s place level (06), `armGuard` reading door blocks, `armDoors` faith by the highest (06), `pressure_off` (06), `capGrace` and `rankHeld` (05, 06), `stageCeiling(stage, purpose)`, `tallyOf`'s stage scope, `levels.gains.by_level`, the grade step to the same grade (05), `forge_fit_rate`, `with_this` on worn armour, `FITS` armour, `extraSlots` reads the grade, `gearNum` reads the carried list, `families.json signature` (07).

**Proposed pieces that an existing one already does (kind 5, non-blocking):**

- **5.1 `res_start:<res>` (03 1(e) and its Needs list): drop it.** 02 1(e) and 04 3(e) build the same Mark I ("the fight starts with 1 plate / 1 Grace") from the op `resource` on `combat_start`, which exists. 03's Shadow Mark I and Tradecraft's start can use the same op.
- **5.2 S12 "stack kinds, in two" (01 Needs): no `Term.kind` field is needed.** Today's two buckets are what A8 asks for: `ctx.mults` multiplies and `ctx.vs` adds (01 1, `output.ts:131-134`). A8 is done by pushing Pain Eater, the ambush, Weakened, technique and ammunition into `ctx.vs`, and moving the rest out of `ctx.mults`. 07's `cash` flag is the only new field on a term.
- **5.3 02's "a pool's max as a source": it is S5.** Read `res_max:` as a number source. `self_res {at: "max"}` (ENGINE-HOOKS:151) shows the engine already knows a pool's top.
- **5.4 S5 should generalise `setResMax` as well as `ties_max:`.** Pressure's cap is already registered that way (02 3(a), `physical/pressure.ts:98`). Two maxima for one meaning would be a second copy.
- **5.5 S2 should start from `holderNumber`'s door-ladder reading** (ENGINE-HOOKS:878: "a door's ladder, as Bond's reach 6, 9 from Empathy 6"), not only from `ladderAt`.
- **5.6 The critic's numbering slip:** the standing predicate is S17, not S16 (above).

## 6. Anything that would need an item id or a number typed into code (non-blocking, fix in the brief)

- **6.1 07 6.1's `cash` flag "defaults from the row's file and condition"** ("Cheap Shot names Hidden", "Bright Script names Sigils"). Reading a door from a row's condition needs a table of conditions to doors, or per-item code. **Fix:** each Σ row states `door: <id>` (or `cash: true`) in data. The validator refuses a damage-bonus row with neither.
- **6.2 "A door's least use"** (07 6.1: a Line of two, a lone Snap, an un-Pumped Release) must be a key on each door row (`least`), read by the cash scope, never a per-door branch.
- **6.3 07 1.2's grip slot for slotless rows at Masterwork** must be a data default (`rules.json rarity.masterwork.default_slot: "grip"`), not the slot word in code.
- **6.4 `tactics.ts:420-428`** switches on `smoke_grenade`, `flashbang` and `bot_scrambler`, on the thrown path that 01 moves to `deal()` (01 defect 4). Under no-rebuild rule 2 it moves to the rows' `effects` in the same change; 01's Built from should say so, not leave it as "not the scale's".
- **6.5 05 2.1's "the highest Elite's or Boss's level"** for a mixed fight names two tier words in code. **Fix:** a data list (`levels.fight_level_from: ["elite", "boss"]`).

## 7. Migration: a live 0.33 character, run or room

- **7.1 Two revisions for one move** (finding 1.9). A builder following 06 writes `CAP_REV` with a count; one following 05 writes `GROWTH_REV` by attribute. The two would run twice, or disagree on the save's shape. **Fix:** as 1.9: one revision, one fixture per row of 05 8, loaded through `apply` (`game.ts:650-660`).
- **7.2 Devotion XP clamped at 300** (04) would take XP from a live Faithful holding up to 450 (today's top, `patrons.json:17`). **Fix:** keep it (finding 1.10).
- **7.3 Live Sigilists lose moves they hold.** 03 2(i) moves Core Change from rank I to II and Backdraft from rank II to III. A 0.33 Sigilist at levels 3 to 4 loses Core Change until level 5, and every rank-II Sigilist below level 15 loses Backdraft. `rankHeld` keeps the rank, not a move that left it. C16 and C17 rule Reach and the Pushes, not class moves. **Fix:** either the two moves stay at their old ranks, or `rankHeld` grows into "moves held at migration stay until the rank that now carries them" (one field, every class).
- **7.4 Four scoped perks are narrowed with no re-pick.** 07 4.1 scopes Bulwark, Shrug It Off, Pressure Point and Taut Thread to their own door's damage. A live Breaker who took Bulwark for its weapon damage loses that use. 07 4.4 offers the re-pick (`pendingRepicks`, `answerRepick`) only for the changed Mastered perks. **Fix:** the re-pick also offers every perk whose scope narrowed (the four) and the two marks' holders (Judgement Day, True Name), whatever the lead rules on 07 question 1.
- **7.5 Stored spells written before 0.34.** A stored spell is saved on the holder with its words (`classes/i.ts:982-986`). Its trigger re-checks the grammar and, on failure, the spell "crumbles" with its charge already paid (`:952-956`, `:1004`). 03 2(i) adds "never past your Reach", and Line Reach now rides Brain Power. So a 4-glyph spell stored by an Intelligence-7 character with Brain Power 3 would crumble on load. **Fix:** a spell stored before the revision goes off at its stored length, or its charge comes back. It fades at the next rest anyway (`:972`).

Ruled, not counted (for the "your sheet changed" panel, 05 8): Overclock below Brain Power 8 (C17); stages 3 and 4 below Will Power 7 and Broken below Dexterity 7 (C16); the Bulwark's 5 / 6 / 7 pool, the Breaker's chain of 5, the Operative's +1 Shadow, the Rigger's +1 held and One More Bond (C16); Lines of 4 for Intelligence-7 characters without Brain Power (C19); a room saved mid-fight (ruling E, 01 13's two options).

## A note outside the five kinds

Ruling A1 says "a hit at level 1 is still one or two digits". Several level-1 cash-outs show three: a Coup about 214 (02 2(c)), a Break about 150 (03 1(c)), a Slam on 4 plates 98 at level 2. If the rule covers cash-outs, the Bites at point 1 to 6 are too high. If it covers plain hits only, 00-rulings should say so. No new question: the lead's wording decides it.

## Critics' findings

No finding of `critic-consistency.md` or `critic-player.md` names this file. What this pass found of theirs still open:

| Finding | Status | Why |
| --- | --- | --- |
| consistency S14 (six digits at the top) | NOT FIXED | findings 4.1 to 4.4: four doors still reach six digits on the door's own sum |
| consistency minor 2 (door Mark thresholds) | NOT FIXED | finding 1.5: 03 and 04 keep their own numbers |
| consistency minor 3 (form Marks) | NOT FIXED | finding 1.6: each file cites the other's numbers |
| consistency S11 (grade by map) | NOT FIXED | findings 1.8 and 2.1: the vault list breaks D25 |
| consistency S12 (endless pace) | NOT FIXED | finding 1.2: 06 keeps 05's first-draft clock |
| consistency M-1, M-2 (migration) | NOT FIXED | finding 1.9: two copies |
| consistency M-4 (perks re-picked) | NOT FIXED in full | finding 7.4: the four scoped perks |
| player 8 (dead points) | partly open | gamma 2 is a tile on all nine gammas (03's findings), a ruling the files leave |

## Built from

| Check | What it read |
| --- | --- |
| Shared numbers | 01 T4, T5, T6, T7a, T8, T9, T10, T11, T12; `scale.py` output |
| Rates and clock | 05 1.3, 2.2, 4.1 to 4.3, 5.2, 8; `pacing.py` output |
| Door numbers | 02 1(b) to 3(i), 5; 03 1(b) to 3(j); 04 1(b) to 3(k) |
| World and gear | 06 1.2 to 7; 07 1.2 to 7 |
| Facts | `forks.json:1264, :1373, :1510, :1612` (fork `damage_mult` values); `classes.json:1941, :2282, :2821, :4001, :8904` (dials); `classes/i.ts:952-1004` (stored spells); `tools/balance/scale.py:66-67, :569-589, :640` (hard-coded Bites and sum); `docs/ENGINE-HOOKS.md` lines 151, 542, 617, 642, 818, 878, 990 |

## Needs a new primitive

None from this file. The merged list is section 5: 16 pieces (S1 to S7, S9 to S11, S13 to S18), with S8 (`attr:`) and S12 (stack kinds) dropped and `res_start:` dropped.

## What re-records

Nothing from this file. Once the fixes above land, re-run `scale.py` (T11, T12) and `pacing.py` (sections 1b, 4). Their printed tables are the readings 01 and 05 quote.
