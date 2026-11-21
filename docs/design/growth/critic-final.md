NOT READY: 3 blocking (2 uncounted sources reach six digits, 1 migration loss), 1 plausible six-digit source, 9 non-blocking, 7 for Leon or the lead.

# Critic: the last pass before the build (0.34 growth bible, after section G)

Read on 21 Nov 2026 in `E:/phc-wt/rel030` (branch `release/0.34-final`, with the closer's uncommitted section-G edits to 01 to 09 and README in the tree). Read only: nothing in `data/`, the engine, the client, the spec or the tests was changed. Every number below was computed from the bible JSON and `data/` by hand and again through `check.py`'s own functions (`Door.cash_hit`, `terms`, `plain_terms`, `squad_items`, `best_with_squad`, `margins_at`), with one term changed at a time, so each one can be repeated. Everything is PROVISIONAL.

## 1. The checker

`python tools/balance/check.py`: **189 PASS, 0 FAIL, 0 WAITING** (README still says 147; the count grew with section G's checks). Clean. The closest lines: Outbursts' largest legal hit 99,622 (378 under the cap), Shadow 98,752, Sigils 98,125, Figments 98,025, Momentum's largest plain hit 97,374.

## 2. Three doors' largest legal level-20 hit, by hand

The common sheet (check (a)): level 20, attribute and alpha at 10, Celestial (x1.75), Perception 10 (a Margin is 0.25 + 0.01 x 10 = 0.35 of the plain hit), the lowest Defense 8 (world tiers), level gap +5, the best mark and gift (`scale.stack.squad`: 0.15 damage or +2 to hit each), `cash(n) = (1.2^n - 1) / 0.2`.

### Outbursts, the Release with four feelings (`soul.attributes.determination.door.cashouts.release_felt`)

- Plain: Damage base 40 x 0.6 = 24, soul profile at 10/10, deal(20), Celestial: **4,401**.
- Units: Reach 5 + Overdraw past the top 1 = 6; cash(6) = 9.930. Bite at Will Power 10 = 0.35.
- C = 0.8 + 0.35 x 9.930 + (0.5 - 0.35) x 1.2^2 + (0.6 - 0.35) x 1.2^3 + (0.6 - 0.35) x 1.2^4 + (0.8 - 0.35) x 1.2^5 = 0.8 + 3.475 + 0.216 + 0.432 + 0.518 + 1.120 = **6.562** (felt_top: rage 0.5, despair at its max 0.6, pride 0.6, abandon 0.8, strongest last).
- To hit +21 (9 skill, 3 grade, 5 gap, 4 from terms): (20 + 21 - 8) // 4 + 2 = 10 Margins = 3.5.
- Sum +125%: Finish 0.15, Ride the Edge 0.05, Blood Price 0.05, Heart Overload II 0.3, Resonance II 0.3, Verse of War 0.1, the mark (Closed) 0.15, the gift (given Abandon) 0.15.
- 4,401 x (6.562 + 3.5) x 2.25 = **99,633** (check: 99,622; the gap is rounding in the plain hit). Agrees.

**Not counted: the chosen feeling.** `soul.attributes.determination.door.feelings.chosen` says "a feeling at its Mark III may be poured a second time in one Outburst, within the four". `felt_top` is four different feelings, so the checker never pours one twice. Pride's Mark III is 12 Elite or Boss kills (`pacing.tracks.feelings.marks.common`; pride's trigger is `big_kill`), reached long before level 20 (every map has a gate Elite and a Boss).
- Pride twice ([despair, pride, pride, abandon]): C = 6.706, **101,047**.
- Abandon twice (12 indulged Overreaches; [pride, despair, abandon, abandon]): C = 7.120, **105,154**.
Six digits a hit. Lowering the Bite does not cure it (at Bite 0.32 the Abandon pair is still 104,500): the feelings replace the Bite on the last Pumps.

### Shadow, the Break (`mind.attributes.perception.door.cashouts.break`)

- Plain: the long rifle, 47 x 0.6 = 28, gun profile (K 0.889) at Perception 10, Ingenuity 10 (bracket 1.9 x 1.5 = 2.85), deal(20) 40, Celestial: **4,968**.
- Units 5 + Last Shade 1 = 6; C = 1 + 0.5 x 9.930 = 5.965. To hit +22: 10 Margins = 3.5.
- Sum +110%: the ambush 0.5 (`rules.json shadow.ambush_bonus`), Sleight of Hand II 0.3, the mark 0.15, the gift 0.15.
- 4,968 x 9.465 x 2.1 = **98,747** (check: 98,752). Agrees.

**Not counted: the Break's weapon.** The door names one weapon (`door.plain.weapon: long_rifle`), but a Break is "one weapon attack from Hidden" with any weapon (`skills.json` ingenuity unlocks.1; the Break's AP site prices melee and shots alike, `combat.ts:2866`), and ruling 31 makes it read Perception and Ingenuity whatever the weapon. The checker's own weapon table (`Scale.weapons`, own-factor rule applied) holds heavier legal ones, none with a requirement a level-20 Operative cannot buy:

| weapon (profile) | new base x K | L20 Celestial plain | largest Break | largest plain hit |
| --- | --- | --- | --- | --- |
| long_rifle (gun), the checker's | 24.9 | 4,968 | 98,752 | 77,831 |
| ork_wreck_saw (melee), Momentum's own plain weapon | 32.2 | 6,414 | **127,496** | **119,151** |
| blackpoint_700 (gun, heavy, precise; no requirement) | 35.6 | 7,098 | **141,075** | **111,187** |
| arbalest (bow, precise, silent; Raw Power 3) | 38.5 | 7,673 | **152,513** | **120,203** |

Six digits on the cash-out and on the plain hit. The same reading for **Pressure** (its Takes are "a Dexterity weapon" verb, `pressure.json`; bows are Dexterity weapons by ruling A4): with the Blackpoint, Dead Centre 95,673 and the plain hit 99,139 (at the line); with the arbalest **103,430** and **107,178**. PLAUSIBLE, since the bible does not say whether a bow carries Pressure.

### Figments, the Curtain (`mind.attributes.expression.door.cashouts.curtain`)

- Plain: a Beast's claws, 30 x 0.6 on the figment profile at 10/10, Celestial: **3,108** (the claws are the strongest form weapon in `figments.json`).
- Units: Reach 4 + Overhold 1 + Many Hands 1 + the bigger Curtain 2 = 8 (the bible's `limits.bodies` 8 holds them); cash(8) = 16.499; C = 0.85 x 16.499 = 14.024. To hit +20: 10 Margins = 3.5.
- Sum +80%: Sharp Light 0.2, Mirage II 0.3, the mark 0.15, the gift 0.15.
- 3,108 x 17.524 x 1.8 = **98,036** (check: 98,025). Agrees.

Nothing uncounted reaches six digits. Keen (+2 to hit, a figment trait) crosses no Margin step (+20 and +22 both give 8 + 2). The checker counts **both** fork-8 picks (Many Hands' `reach_plus` and Masterwork's `to_hit` share the group `fork:figments:8`, but `terms()` keeps a best per group per kind), so it overstates; it hides nothing.

### Sources the checker still does not count

1. The heaviest legal weapon of a door whose cash-out is any weapon attack (Shadow, and Pressure if bows count): reaches 152,513.
2. The chosen feeling's second pour: reaches 105,154.
3. Syphon in check (h) (section 5): not a damage source, but the cost check reads a fight without it.

## 3. The third critics' findings

### critic-consistency-3.md (18 blocking; kinds 5 and 7 and the kind-2 note after them)

- 1.1 Feelings given through a Bond: **CLOSED** (`scale.stack.squad.gifts`: the five given feelings, each the gift's 0.15; ruling 41).
- 1.2 To-hit gifts: **CLOSED** (`gifts.given_edge`, `blessed_aim`, `canticle_verse`, `canticle_crescendo`).
- 1.3 Defense-lowering conditions: **CLOSED** (`squad.marks`: Exposed, Corroded, a foe's Rage and Abandon as the `defense` mark, read as to-hit).
- 1.4 Spotter: **CLOSED** (`mind ... forks.8 fork.shadow.spotter.mark`: a mark, not an ambush on top).
- 1.5 The plain hit's Margins: **CLOSED** (`door.plain.rolls` on every door; Guard's plain hit now 10 Margins, 70,142).
- 1.6 Many-foe hits: **CLOSED** (ruling 40; Earthbreaker, `evoke_area`, Burst, Wave, Storm Front, the Miracle capped a hit with totals printed).
- 1.7 `{data}` references: **CLOSED** (refs: 228 into data, 0 unresolved; `pacing.gates.rank_thresholds` now `assignment.rank_thresholds`).
- 1.8 Typed numbers in the checker: **CLOSED** (`check.py:756` uses `and`; the gap reads `enemies.json levels.gap.max_levels`, `:953`; `SKILL_TOP` read, `:359`; the gate share reads `clock.gate_share_tolerance`, `:988`).
- 1.9 Iron Grip against `own_door`: **CLOSED** (ruling 44; `plain_by_ruling`, and the refs check OWN DOOR fails any other).
- 3.1 The alpha perk step at 5 or 6: **CLOSED** (ruling 42; check (c) holds every ladder to `data/skills.json ladder`).
- 3.2 Retired moves: **CLOSED** (ruling 43; `pacing.migration` row "retired moves", five pairs).
- 3.3 A2 and A7 as ruled: **CLOSED** (ruling 48; `scale.margins` 0.25 + 0.01 x P; `scale.columns.mend` derived from HP).
- 4.1 The tick's two copies: **CLOSED** (`scale.factor.walk.tick_text`, step 1).
- 4.2 Typed old-scale numbers with no step: **CLOSED** (`scale.factor.walk.typed_old_scale`, each row with its step: 1, 2d, 2d).
- 6.1 The alpha perk step's migration: **CLOSED** (ruling 42; the row "kind: none").
- 6.2 Shape and the fourth Bond: **CLOSED** (the pairs; `reachHeld` names Bonds).
- 6.3 Devotion's clamping readers: **CLOSED** (the Devotion row names `devotionXpOf` and `setDevotionXp`; step 6 engine list).
- 6.4 The peak standing: **CLOSED** (`devotionPeak`, a saved field with a load default; S17 reads it).
- Non-blocking: 5.1 **CLOSED** (S18 becomes `cleanse` by the families `mark` and `gift`, 08 section 2); 5.2 **CLOSED** (S11 dropped for the `resource` op at `outburst_begin`); 5.3 **CLOSED** (S17 reads `devotionPeak`; the prayer Push is the overreach piece, not S5); 7.1 to 7.5 **CLOSED** (ruling 50; 09 steps 1, 2, 2a, 3, step 1's one copy of the grade). Kind 2's prose slip (06 "Insinuation does not exist"): **CLOSED** (no longer in 06).

### critic-player-3.md (11)

1. Slam on every foe from Durability 1: **CLOSED** (`body ... endurance.door.cashouts.slam_ring.formula` and `struck`: `min(most_foes, 1 + floor(cash(n)))`).
2. Overbrace's price: **CLOSED** (`endurance.door.push`: `price_kind: share`, `hp_share: 0.1`). Measured: at level 5 it pays 41 HP for +50 on the Slam, at 10 127 for +186, at 20 1,082 for +2,357: a choice at every level.
3. The wall's trap points: **CLOSED** (`pacing.spend_plans.wall` ends on Sensory 10, Athletics 5, Guts 3; check (d) fails a door the plan cannot use).
4. Implication 1 dead solo: **CLOSED** (`soul ... insight.ladders.implication.points.1.solo`, `solo_save: -1`).
5. The Miracle takes the best Hymn back: **OPEN, Leon's** (ruling 47 keeps the price; not a builder's blocker).
6. Felt lines that promise an unopened Reach: **CLOSED** (check (c): "the felt line of every gated Reach step says its gate", nine doors).
7. A visit counted without the credits: **CLOSED** (`pacing.credits.gear_share`, `visit_price`; check (e) counts a visit only when it pays).
8. The Guts feed with no reading: **CLOSED** (`strength.ladders.guts.feed.wear_rules`: first hit free from 4, a step every two tiles from 7).
9. The believer's Hymn once a fight: **OPEN, minor** (`virtue.door.hymn_wait.base` is 9 as asked, but `per_faith` stayed 0.5: at Faith 3 and Virtue 6 the wait is ceil(9 - 1.5 - 1.25) = 7 rounds against a 5-round standard room; today's rule gives 6). Not blocking.
10. Cleave rolls: **CLOSED** (`cleave.rolls: true`, `margins: false`).
11. The lone Snap: **CLOSED** (`insight.door.plain.x: 1.5`: 20 / 23 at level 1).

## 4. Section G, rulings 40 to 50

- **40** (a hit is capped, totals printed; floor per hit or in total for spread cash-outs): **applied** (`check_digits`, `spread`, the "many-foe hits" lines).
- **41** (one mark, one gift): **applied** in the checker and `scale.stack.squad`, sizes set by its result at **0.15** (the ruling's first numbers were 0.20; allowed by the ruling, flagged PROVISIONAL for the lead). **Not applied in the texts:** `mind.json:94` (Spotter "+20%"), `mind.json:191-192` (the Operative's Mark "+20%"), `gear_perks.json:2766` (Closed "+20%") still say 20%.
- **42** (the ladder schedule stays): **applied** (check (c), the migration row "kind: none").
- **43** (a retired move becomes its successor): **applied** (`pacing.migration` pairs).
- **44** (Iron Grip II a plain-hit term): **applied**.
- **45** (Slam's ring by plates; Overbrace a tenth of max HP): **applied**.
- **46** (Implication 1's solo half; the wall's plan): **applied**.
- **47** (the Miracle's price stays; flagged for Leon): **applied** (unchanged; `virtue.door.miracle.reads`).
- **48** (Margins 26% to 35%; the heal column derived): **applied**.
- **49** (the checker checks data refs, costs over a fight, mark and gift, the per-hit cap): **applied**, with two gaps: the mark-and-gift count is right, but the largest legal hit still reads one named weapon per door (section 2), and check (h) does not count Syphon (section 5).
- **50** (proofs use only built steps): **applied** (09 steps 1, 2, 3, 5).

## 5. Four fights in the head

### The wall (`spend_plans.wall`; Bulwark from level 3)

- **Level 1, solo** (End 7, Dur 7, PT 3, HP 142, Reach 3; a standard room, 1.25 Soldiers of 84 HP hitting 18). Press: Guard 1 AP (two plates), Slam 2 AP, Guard 1 AP again. Gets: a Slam of about 76 on the faced Soldier and a plain blow (about 45) on up to three beside it (`1 + floor(cash(3))` = 4 struck). Next turn: two plates held, no chain to keep. Fine. Felt problem kept from the last pass: a plate soaks about 5 to 6 of an 18 hit, so Guard at level 1 is Slam fuel, not defence; the wall stands on its 142 HP.
- **Level 1, four players** (deadly room, 9 Soldier-equivalents). Challenge pulls the room: up to 9 x 18 = 162 incoming against 142 HP and about 17 of plates. Strong act, real consequence (the wall can drop in one enemy round). Good.
- **Level 20, solo** (End 10, Dur 10, PT 10, HP 10,816, Reach 6, Relic; plates about 395). Press: Brace, Slam: 11,371 on the faced foe, 3,534 on each of the rest beside you (every foe at six plates). Against a same-level Soldier (11,760) the full Slam leaves it on 389; with Overbrace (1,082 HP at your next turn) it is 13,728 and drops it. That makes Overbrace the press on every Slam that must kill: a choice, not a tax. Next turn: bare, 0 to 1 plate.
- **Level 20, four players**: the ring's 36,113 total on eight is the room's best spread blow from a defender; Retort and Hold Their Eyes keep it the target. Nothing unpaid.

### The Channeler (`spend_plans.channeler`)

- **Level 1, solo** (MP 144; a full heart 28 MP; 5.1 hearts a pool; MP does not come back between fights, `survival.json ammo_pack.mp`). Press: Begin 2 AP, Pump 1, the free Pump, Release 1: stage 3, a Bolt of about 60 to 70 or a Burst of about 45 on each of nine tiles. Cost next turn: Strain and the MP. **Syphon** (`soul ... determination.door.syphon`): 20 x 1.3 x mp(1) = **26 MP for 1 AP in Normal air, 93% of a full heart**. The only brake is the air: a Syphon takes 6 from the meter (`rules.json mana.meter.events`), so the first drops Normal (start 15) to Thin and the next pays 13; a death gives 5 back. So the cost is a choice only through the air, and check (h) ("a cost must still be a choice", ruling 49) prints the pressed fight without any Syphon. Unproven, not wrong.
- **Level 1, four players**: the same, with kills feeding the air: four players killing raise the meter about 5 a kill, so the Channeler can Syphon a heart back roughly every kill. Watch it in the first co-op playtest.
- **Level 20, solo** (MP 385, a full heart 86 MP, 4.5 a pool; Syphon 62 in Normal). A full heart is one turn: Begin 2, the free Pump, Overdraw 1 (two stages), Pump, Pump, Release 1, with Mark I's start stage: 6 AP for stage 6. Release with four feelings 20,027 (plain ladder, Relic) against a Boss of 68,880: three or four turns. Cost: 22% of the pool, the Push's Strain that does not fall. A choice.
- **Level 20, four players** (deadly room): a Burst of the same heart lands **14,019 on each of nine tiles, no roll** (`release_burst`, 126,173 in total at Relic with nothing but the ladder), against Soldiers of 11,760. One Channeler turn can end a four-player deadly room's Soldiers if they stand within one tile of a point, for 86 MP. Ruling 40 accepted totals, so this is not a builder's defect; it is the strongest act in the bible for its price, and Leon should see it (section 8).

## 6. Migration

- **Fitted mods are lost without a successor (CONFIRMED, blocking).** Today a weapon's mods fit the slots its weapons.json row lists, at any grade (`character.ts:1721`, `run/progress.ts:242`, `run/rewards.ts:211` read only `WEAPON[id].mod_slots`; mods are 0.28.1 rewards and Forge fits). The bible gives Standard and Fine **0** mod slots and Masterwork to Celestial **1** (`scale.grades.*.mod_slots`; `gear_perks.grade_rows.mod_slots`; each mod's `grade_from: masterwork`). A live 0.33 Standard or Fine gun with a red dot, or a Masterwork gun with an optic and a muzzle, loses mods on load. `pacing.migration` has no row for it, and step 6 does not list it.
- **A room saved mid-fight** (`pacing.migration` rows "a room saved in the middle of a fight" and "the squad's mark and gift", kind open): owned by ruling E (the builder proposes, the lead approves before step 6). Not a design gap; it blocks step 6, not the start of the build.
- Checked and holding: HP and MP by share; points by the re-spend or `capGrace`; rank III by `rankHeld`; moves by `movesHeld`; Reach by `reachHeld` (Bonds, Shadow, Figments named); points at levels 4, 5, 14, 15 by `pointsOwed`; Devotion XP whole and `devotionPeak`; feelings at Mark I; stored spells kept; fork picks cleared and offered again; `prop` to `props`; words held (today `4 + Brain Power`, new `4 + 3 x Brain Power`: never fewer); a run saved between nodes loads as its map.

## 7. What remains, most serious first

1. **Shadow's Break with a heavier legal weapon reaches 141,075 (Blackpoint 700) and 152,513 (arbalest); its largest plain hit 111,187 to 120,203.** `mind.attributes.perception.door.plain`. Fix: the door states the weapons its cash-out accepts (`"weapons": "any"`), check (a) takes the largest `base x K` over those `weapons.json` rows (the own-factor rule applied), and the Shadow trim follows from the result (Bite at 10 and the ambush sum term, or the heavy and bow categories' own factor).
2. **The chosen feeling's second pour reaches 101,047 (Pride) and 105,154 (Abandon).** `soul.attributes.determination.door.feelings.chosen`. Fix: a feeling poured a second time does its behaviour twice and steps the plain Pump's 0.2 (its number once); or `felt_top` counts the double and the Outburst terms are trimmed until the Abandon pair is under 99,999.
3. **Fitted mods lost on load.** `pacing.migration.rows`. Fix: a row "mods fitted beyond the new grade's slots stay fitted (`c.modsHeld` on the instance) until taken off; the Forge refuses a new fit past the grade's slots", in step 6's saved fields, with an `old-save.test.ts` fixture.
4. **Pressure with a bow (PLAUSIBLE): Dead Centre 103,430, the plain hit 107,178 with the arbalest; 95,673 and 99,139 with the Blackpoint.** `body.attributes.agility.door.plain`. Fix: the same `weapons` field and maximum as item 1; say in the door whether a bow carries Pressure.
5. **Stale mark texts say +20% where the mark is 0.15.** `mind.json:94` (`fork.shadow.spotter.text`), `mind.json:191-192`, `gear_perks.json:2766`. Fix: read `@scale.stack.squad.mark.damage` or say "the squad's mark".
6. **Check (h) reads a pressed fight without Syphon.** `soul.attributes.determination.door.resource_use` (and `insight.door.resource_use`). Fix: the pressed fight adds one Syphon a turn at the air the room's deaths and Syphons leave (`rules.json mana.meter.events`), and the check fails if that still covers every turn.
7. **Exclusive fork picks counted together.** `check.py terms()`: Many Hands and Masterwork (`fork:figments:8`) both count. Fix: a fork group keeps one pick across every kind (the best pick, not the best of each kind).
8. **The believer's Hymn is still once a fight from Faith 3 to 6.** `soul.attributes.virtue.door.hymn_wait.per_faith` 0.5. Fix: 0.75 as today (6 rounds at Faith 3 and Virtue 6), or leave it as the second door's price and say so.
9. **Finish's base is ambiguous.** `soul ... door.ways.finish`: the checker reads 1.0 + 0.15, the text says "the way's 0.8 elsewhere stays". Fix: say the low-HP Finish is the Strike's x1.0 with +0.15 in the sum.
10. **Overbrace's "spent".** `endurance.door.push.price`: say whether a plate that soaks a blow counts as spent (a defensive Overbrace that is never Slammed is free otherwise).
11. **Level-1 plates soak 5 to 6 of an 18 hit** (`scale.plate`): Guard at level 1 is Slam fuel only. Feel, not a defect; the first playtest decides.
12. README: "sections A to F" and "147 PASS" are stale (`docs/design/growth/README.md:3`, `:8`).

Items 1 to 3 block the build; 4 blocks it if bows carry Pressure; 5 to 12 do not.

## 8. For Leon (or the lead) to rule, not a builder

1. **The Miracle's price** (ruling 47; critic-player-3 5): five levels of Devotion take Hymn III back for about ten hours.
2. **Re-spend or keep the old Reach** for live characters (ruling 39; the bible writes the re-spend as the plan).
3. **A room saved mid-fight** (ruling E): the builder's proposal, the lead's approval, before step 6.
4. **Area Releases at level 20:** a Burst at the plain ladder lands 14,019 on each of nine tiles with no roll (126,173 in all) against Soldiers of 11,760, for 86 MP: one turn can clear a four-player deadly room. Ruling 40 allows it; whether the Burst's x0.7 and nine tiles stand is Leon's.
5. **The mark and the gift at 0.15**, not ruling 41's first 0.20 (set by the checker, PROVISIONAL for the lead).
6. **The Break's weapon** (item 1): whether a Break takes any weapon (and the trim falls on Shadow) or the heavy guns and bows sit at the rifle's base for a Break.
7. **The wide character** (ruling 14): no rank III and no Push in 0.34.
