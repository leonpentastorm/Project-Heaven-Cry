# 05. Pacing: what a character gains, and when (0.34 rebalance, design phase; third draft, pass 3, 21 Nov 2026)

**For the lead. Nothing here is built.** Pass 3 (ruling F): every number of this file lives once, in `tools/balance/bible/pacing.json`, and `tools/balance/check.py` computes every table from it and fails on a contradiction. **This file explains and carries no number the JSON does not**; a number is quoted by its key, and every table is printed by the checker:

    export PYTHONUTF8=1
    python tools/balance/check.py                          # every check; 05's are (d) SPEND, (e) HOURS, (e) CLOCK, (g) MIGRATION
    python tools/balance/check.py --tables pacing          # the clock, the XP table, door Marks, Devotion, credits, the step price, co-op
    python tools/balance/check.py --tables calendar spend  # every character's hours 0 to 49; the spend plans level by level

`tools/balance/pacing.py` is retired into the checker (its time model and route are `pacing.clock.time_model` and `pacing.clock.route`; check (e) CLOCK recomputes the hours and the XP table from them) and only forwards there. This draft applies the lead's rulings (`00-rulings.md` B11, B12, B15, C18, C19, D22 to D27, F33, F35 to F37, F39); above them stand Leon's rulings and the charter (`../proposals/2026-11-21-the-curve.md` sections 10 to 18). Every number is **PROVISIONAL**, chosen for what a player feels; nothing is fitted to a percentage, a line or a ceiling. The time model is ASSUMED: if play is faster, every hour moves earlier by the same share and every level still lands at the same Boss.

## 0. What this file decides

1. **One clock (ruling 36):** `clock.maps.<m>` holds each map's start and end hour and the level a squad that walks it arrives and leaves at. `world.json` and the door files read it; nobody else types an hour.
2. **A level comes from the map, not the minutes (ruling 24):** `levels.lands` puts level 2m on map m's gate and 2m + 1 on its Boss for maps 1 to 5 (the final boss at 11), then one level at each endless Boss, level 20 as map 14's Boss falls (`clock.maps.14.end_h`, inside `calendar.level_20_between`). `levels.xp_total` is the route's XP between those places, each level's own XP to two figures, summed; check (e) CLOCK recomputes it.
3. **A fight's XP** is `xp.fight_xp` at the fight's level, times the node's kind (`xp.kind_mult`, today's), times its worth to you (`xp.worth.by_gap`).
4. **Points and gates (rulings 11, 12):** `levels.career`, `levels.gains` (with the `by_level` swap), `gates.ceiling_by_level`, `gates.rank_levels`. Six spend plans under the family rule (ruling 13) are walked by check (d).
5. **Every practice rate** is a row of `tracks`, and **the door Marks are one formula** (`door_marks`), which the nine doors' `marks.rate` reference.
6. **Credits, the one grade-step price (ruling 26), grades by map (ruling 25) and the vault (ruling 35)**: `credits`, `grades_by_map`.
7. **Co-op (ruling 37):** `xp.party_pace` multiplies practice and Devotion, never XP.
8. **The calendar** (`calendar`): no hour from the first to the last of `calendar.hours` is empty for any of seven characters; **the collection** (`collection`, ruling 23).
9. **Migration (ruling 39): the one copy**, `pacing.migration`, one revision stamp, written with the free re-spend as the plan and the grandfathering as the fallback.

## 1. The clock

**Facts about today (checked).** A fight's target rounds are `survival.json:64` `rounds`; a map has 15 rows, the gate Elite at row 8 and the Boss at row 15 (`survival.json` `map.expect.path`). Today a node's XP is `(xp.base + xp.per_depth x (d - 1))` x its kind x the stage's `stage.xp` (`survival.json:126`, `:60`; `run/rewards.ts:63-66` `nodeXp`): it reads no foe's level and no character's. Foe levels copy the party today (`run/encounter.ts:70-75` `foeLevel`, `eliteUp`; `data.ts:124` `fightLevelOf`).

**The time model** (`clock.time_model`, ASSUMED): a player's turn grows a little each level (more to choose: techniques, longer Lines, feelings), a foe's turn is animated, a fight runs its target rounds times `rounds_vs_target` (the measured overrun, `docs/design/handoffs/0.33-MEASURES.md:127`), and the rounds do not grow with the level (the turns to drop a same-level foe are held by `world.json` and check (b)). Other nodes, choosing the next node, the camp and the boon have their own minutes. **The route** (`clock.route`) is one map in two halves: half a ends on the gate Elite, half b on the Boss; the vault is taken on every second map. Every fight on the route is worthy (within two levels of the squad).

*What a player reads off it:* a map is an evening's session, a little longer each map as turns hold more choices; the first map holds the class.

`--tables pacing` prints the maps with their foe levels by row (from `world.json`), the hours typed and the model's beside them, and the grades found and sold on each.

## 2. XP

- **`xp.fight_xp`**: `at_1` times `per_level` to the power of the level less one. *The number on the reward panel grows as you go deeper, so a deeper map pays more by itself.* `survival.json` `xp.base`, `xp.per_depth` and `stage.xp` retire: the fight's level does their work.
- **`xp.kind_mult`**: today's kinds, read from data (the gate reads the Elite's row, as `rewards.reads` does today).
- **The fight's level** is the node's level from the map and the row (`world.levels`, `world.maps`, `world.endless`); a mixed fight takes the level of its highest tier in `world.levels.fight_level_from` if one stands (a data list, so no tier word is typed in code: critic-consistency-2 6.5).
- **`xp.worth.by_gap`**, the gap held to five either way: *within two levels a fight pays in full; five levels down pays nothing (those foes already die to one hit, `enemies.json:200`); a fight above you pays more, so a character who rushed catches up by fighting.* The worth applies to every gain earned in a fight through one reader (S7 `growthWorth`), never out of a fight.
- **The XP table** is `levels.xp_total`; `--tables pacing` prints it beside today's and the hour each level lands. On the five maps a level is a gate's or a Boss's share of a map; in endless a level is a whole map (*more at the beginning*: Leon, round 2 item 2). Past 20, XP counts to the run's renown only (`levels.past_20`).
- **Campaigns** (ruling 28): `xp.campaign_sources` restates `rules.json:282` `xp_sources` as multiples of `fight_xp` at the level the campaign states; `data.ts:129-132` `XP_SOURCES`, `COMBAT_XP` and `combat.ts:3490`'s fallback leave code in the same change (no-rebuild rules 2 and 3). `xp.campaign_tiers` holds the four tiers that `world.campaign` reads; `rules.json:274-280` `pacing_target` is replaced by them.

## 3. Points, gates and the spend plans

- **`levels.career`** (ruling 11): creation's points included. **`levels.gains`** (ruling 12): odd and even levels as today, and the `by_level` swap so the Attribute point arrives on the level its ceiling opens; the totals are unchanged.
- **`gates.ceiling_by_level`**, **`gates.rank_levels`**, **`gates.rank_thresholds`** (read from `classes.json`), **`gates.advanced_level_min`** (the advanced classes, shelved in 0.34, open at the level-10 gate so no later pass touches it). *The ceiling moves at the tier gates, so crossing one is felt.* The fallbacks typed in code (`character.ts:1321`, `:1361-1363`) go: they are second copies.
- **The spend plans** (`spend_plans`): the wall, a Breaker who prays, a Sigilist and a Mender with a gun (SCHEMA's four), and a Channeler and a Rigger for the collections their doors open. Check (d) walks each one level by level (each point legal and felt on its ladder, nothing unspent at 20, two doors never both at the top Reach). `--tables spend` prints them. *What they show:* the specialist alone reaches its door's top, the gate and the point that uses it landing together; a second door stops a step under (ruling 13's edge).

## 4. Every practice rate (`tracks`)

Every amount earned in a fight is times its worth and times `xp.party_pace`. Each row says what earns it (`earned_by`), what today does (`today`, with file:line), its numbers and why.

| Track | The keys | What a player feels |
| --- | --- | --- |
| Weapon drill (ruling 22) | `tracks.drill`: `per_kill`, `martial_mult`, `martial_classes`, `thresholds` (today's, so no saved Mark moves), `rest`, `training` | the weapon taken at the camp gives its signature in the first fights and its second pick before the gate |
| A shield's drill by soaks | `tracks.shield_soak`: `per_soak`, `soaks_a_fight` (ASSUMED), `per_fight` | a shield learns by taking blows, as the wall's own door does (ruling 18) |
| Sigil study | `tracks.study`: `first`, `step`, `copy`, `mastery_study`, `found`, `rest`, `training`; words held are `mind.json`'s card | a word is an event you look forward to; Brain Power is how many you hold, not how fast you learn |
| Word Marks | `tracks.word_marks` (05 owns Mark III: critic-consistency-2 1.15) | a word used in half your Evokes earns its variant within a few hours |
| Found spells | `tracks.found_spells` (study and practice, by reference) | finding a new sentence is itself growth |
| Outburst modules | `tracks.modules`: `thresholds`, `then_every`, `mastery_bonus`, `found`, `rest`, `training`, `start` | a module about every two hours for a specialist; learned is not slotted (module slots are Will Power's Reach, `soul.json`) |
| Feelings | `tracks.feelings`: `marks` (common and rare), `start`; `reading` until the run simulator counts each trigger | Law 3's three steps on each feeling |
| Figment form Marks | `tracks.form_marks` (the one row: critic-consistency-2 1.6; `mind.json` reads it) | a form held through fights grows hardier |
| Devotion | `tracks.devotion`: `start` (ruling 19), `thresholds` (each at or under today's), `tag_caps` with the new `stage` scope, `tags_a_fight` (ASSUMED), `rest`, `rest_share`, `shrine`, `per_fight` | standing is the faithful's grade (`scale.grades.prayer`, ruling 33), arriving a few hours after the same grade of gear |

The practice texts that type their numbers today (`sigils.json` study `text`, `soul_modules.json` practice `text`) read their fields (`{=placeholder}`) in the same change.

**Door Marks: one formula** (`door_marks`). Each threshold is the door's `units_per_fight` times the worthy fights a specialist has walked by each of `door_marks_hours` (Mark I, II, the middle one, III: the charter's hours). The checker computes the nine readings (`door_mark_thresholds`; `--tables pacing` prints them); each door file's `marks.rate` is `@pacing.door_marks.<door>` and types no threshold. A door that measures its unit differently changes its `units_per_fight`; the hours stay.

**Devotion's hours** are printed by `--tables pacing` from `tracks.devotion.per_fight`; the door files and the calendar read the same row.

## 5. Credits, the grade step and grades by map

- **Income** (`credits.income`): today's formula and numbers, read from `survival.json` (unchanged: the income already climbs with the map). `--tables pacing` prints credits a map and an hour.
- **The one grade-step price** (`credits.grade_step`, ruling 26): the step's floor or the difference of the item's two graded prices, whichever is more, times the place (shop or Forge, read from data); the Relic step stays at a Forge. *One formula for the shop and the Forge, and the same total whether you buy a Fine piece or step a plain one up.* `grade_up.relic_from_stage` and the offer line's own Relic price (`run/progress.ts:534`) go: the shelf is the one gate.
- **The re-forge** (`credits.reforge`): a Relic or Celestial piece's property offered again, at the Relic floor at a Forge. *The peak's credit sink: once every piece is a Relic, credits buy a better property, not nothing.*
- **Grades by map** (`grades_by_map`, ruling 25): `finds_from_map` and `shelf_from_map` (Relic sold only in endless; Celestial never sold). **The vault** (`grades_by_map.vault`, ruling 35) gives the map's own finds grade, never the next map's, so no Celestial before it is found. The Boss's pick (`boss_pick`) and the gate's pick (`gate_pick`) are rarity rows capped by the finds and by the shelf. `scale.grades.where_found` points here; check (e) reads it against ruling 25.

## 6. Co-op (ruling 37)

`xp.party_pace.by_squad` multiplies every practice gain and Devotion (with its caps), never XP: a level is tied to a map whose foes do not follow the party, so XP times the squad would lift a squad several levels over its maps. A co-op run reaches level 20 at the same Boss as a solo one, in more hours (the price of more players' turns; `--tables pacing` prints the hours by squad from the time model). The key is named `survival.json growth.party_pace` so it does not say XP (critic-consistency-2 2.5). PROVISIONAL until a co-op playtest.

## 7. The calendar and the collection

`calendar.characters` are seven readings, solo, on the reference route: the **wall** (Guard; a shield and a second hand that rotates), the **one-shield wall** (critic-player-2 11's worst case: one shield and one weapon, stepped at the Forge), a **Breaker who prays** (a collector: both hands move to a new weapon at Mark III), a **Sigilist**, a **Mender with a gun**, a **Channeler** and a **Rigger**. Each draws its streams from `calendar.streams`, whose thresholds are `tracks` rows or `door_marks` by reference; a stream's `units_per_fight` is a reading of how the character plays (its `why` says how it is made) or a track's `per_fight`.

The map's own beats are `calendar.map_events`: a shop in each half, the gate's pick, the Forge, the Boss's pick and **a boon of three only while the boon cap has room** (its `maps`; the cap is kept by ruling A10, so a boon past it is not counted as a gain: critic-player-2 11). Levels land from `levels.lands`; each grade is "found" as its first map opens.

Check (e) fails an empty hour, level 20 outside `calendar.level_20_between`, and a collection under `collection.target` by `collection.by_hour`. `--tables calendar` prints the grid. **Where the rows are thin**, and that is what one door plays like: the two walls live on levels, their door's Marks, their shield and their gear once their door's Mark III is in; the one-shield wall's late hours are its picks and its Forge (a step or a re-forge), nothing else. **The collection** (ruling 23) counts each system a character's doors open: techniques against all of `techniques.json`, words (held at most by `mind.json`'s card), modules (the unlocked ones), feelings, form Marks. A wall's door opens no collection, so the walls list none.

## 8. Migration: the one copy (ruling 39)

`pacing.migration` is the only migration in the bible: one revision, `GROWTH_REV`, owned here; every other bible file says `"migration": "@pacing.migration"` (check (g)). It runs where every character migration runs today, at the start of each action in `apply` (`packages/engine/src/game.ts:650-660`), whose notes go to the story (the "your sheet changed" lines). **Each row is tested through that real load path** (`test/old-save.test.ts`, a 0.33 fixture a row, loaded and played one action).

- **The plan: one free re-spend** (`migration.plan`). A live 0.33 character keeps its level, its XP's share of the way into the level, its rank, every move it holds, its Devotion XP and its gear, and is offered once to place all its points again under 0.34's gates and ladders.
- **The fallback: grandfathering** (`migration.fallback`). Until it re-spends, or for good if Leon rules so, the rows marked `fallback` keep the 0.33 sheet: `c.capGrace` by attribute (points above a new ceiling, counted beside `legends` in `legendRoom`), and `c.reachHeld` by door (a Bulwark's pool, a Breaker's chain, stage 4 under Will Power 7, Broken under Dexterity 7, Lines without Brain Power: critic-player-2 10).
- **Always:** HP and MP by share (the scale's two rows), `c.rankHeld` (rank III before level 15), `c.movesHeld` (a move whose rank moved stays until the rank that now carries it: critic-consistency-2 7.3), the XP and the study and practice counters rebased by share, `c.pointsOwed` for the swapped levels, feelings at their Mark I, **Devotion XP kept whole, never clamped** (critic-consistency-2 1.10, 7.2), the perk re-pick for every perk whose meaning changed or narrowed and the foe marks' holders (the existing `perkRev` piece: 7.4), stored spells castable as stored until edited (7.5), drill untouched, a run between nodes loads unchanged.
- **Open:** a room saved in the middle of a fight is ruling E's (the builder proposes, the lead approves).
- **Leon's call** (`migration.leon_call`, asked 21 Nov): keep the old Reach, or one free re-spend.

## Questions for the lead

1. **The calendar's map beats.** The shops and the Forge count as a gain for every character on every map (a step, a piece, a mod, a re-forge), which is what keeps the one-shield wall's late hours from being empty. Recommended: keep it as written; if the run simulator shows a character with nothing to buy, the re-forge's price is the lever, not a new reward.

## Critics' findings

| Finding | Status | How |
| --- | --- | --- |
| consistency-2 1.2, player-2 8 (two clocks) | FIXED | `clock.maps` is the one clock; `world.json` reads it and types no hour; check (e) CLOCK recomputes it from the time model |
| consistency-2 1.3, 1.4 (04's hours and Devotion pace) | FIXED for 05 | Devotion's hours come from `tracks.devotion.per_fight`; 04 reads them by name (04's to apply) |
| consistency-2 1.5, player-2 8 (door Mark thresholds) | FIXED | `door_marks`: one formula, computed; the door files reference `@pacing.door_marks.<door>` and type none |
| consistency-2 1.6 (form Marks) | FIXED | `tracks.form_marks`, the one row |
| consistency-2 1.8, 2.1 (the vault) | FIXED | `grades_by_map.vault`: the map's finds grade (ruling 35), read from the one list `finds_from_map` |
| consistency-2 1.9, 7.1 (two migrations) | FIXED | `pacing.migration`, one stamp `GROWTH_REV`; `capGrace` by attribute |
| consistency-2 1.10, 7.2 (Devotion clamped) | FIXED | kept whole |
| consistency-2 1.11 (drill hours in 02) | FIXED for 05 | `tracks.drill`; 02 reads it |
| consistency-2 1.15 (word Mark III) | FIXED | `tracks.word_marks`, owned here |
| consistency-2 2.5 (`party_pace`'s name) | FIXED | `xp.party_pace.key`: `survival.json growth.party_pace` |
| consistency-2 6.5 (tier words in the fight level) | FIXED | `world.levels.fight_level_from`, data |
| consistency-2 7.3 (class moves that changed rank) | FIXED | `c.movesHeld` |
| consistency-2 7.4 (narrowed perks) | FIXED | the re-pick row covers every changed or narrowed perk and the marks' holders |
| consistency-2 7.5 (stored spells) | FIXED | castable as stored until edited |
| player-2 10 (live Reach) | FIXED as ruling 39 asks | the free re-spend is the plan; `c.reachHeld` the fallback |
| player-2 11 (boons past the cap; the one-shield wall) | FIXED | the boon beat stops when the cap fills; the one-shield wall is a calendar column with no empty hour |

## Built from

| Rule or number | The existing piece and data key that carries it | What must change |
| --- | --- | --- |
| The XP table | `rules.json:252-273` `xp_total`; `character.ts:1282` `xpForLevel` | the values (`levels.xp_total`) |
| A fight's XP by its level | `run/rewards.ts:63-66` `nodeXp`; a new key `rules.json character.levels.fight_xp` | `nodeXp` reads `fight_xp` at the node's level (`foeLevel`'s new body, 06) x the kind x S7; `xp.base`, `xp.per_depth`, `stage.xp` go |
| Worth by the gap | `combat.ts` `levelGap`; `effects/hooks.ts:37` `growthHeld` | `enemies.json levels.gap.worth`; S7 |
| Co-op pace | `rewards.ts:65` | `survival.json growth.party_pace`, read by S7 on practice and Devotion |
| Campaign XP and tiers | `rules.json:282` `xp_sources`, `:274-280` `pacing_target`; `combat.ts:3490` `combatXp` | multiples of `fight_xp`; the four tiers; delete `data.ts:129-132` and the fallback |
| Gates and gains | `rules.json:194-199` `cap_by_level`, `:223-245` `levels.gains`; `classes.json:17-22`, `:32`, `:37`; `character.ts:1313`, `:1321`, `:1361-1363`, `:1385` | values; a `by_level` row; the fallbacks go |
| Drill, a shield's soaks | `techniques.json:99-118` `rules.drill`; `physical/data.ts:138-147` `drillMult`, `addDrill`; `physical/core.ts:121` `guardSoak` | `per_kill`, `martial_mult`; `per_soak` (the soak site calls the drill adder for a held shield) |
| Study, practice, rests | `sigils.json:193`, `:209-231`; `soul_modules.json:1327-1349`; `survival.json` `train`, `training`; `sigilgrowth.ts:40`, `:48`; `magic.ts:1728`; `character.ts:890` | the numbers; words held a number block; the typed 4 goes |
| Feelings, forms, door Marks | the felt list (`magic.ts:1154`); `figments.json` `forms`; the door rows | `marks` on each feeling row, `form_marks`, each door's `marks` through S4 |
| Found spells | the felt list's shape | S9 |
| Devotion | `patrons.json:8`, `:17`, `:48`; `faith.ts:95` `TAG_CAPS`, `:506` `tallyOf` | start, curve, `tag_caps.fight`, `tag_caps.stage` |
| Finds, shelf, vault, picks | `survival.json:147` `rewards.ceiling`, `:141-146` `rewards.rarity`, `:580` `vault`; `rewards.ts:80`, `:156`, `:159`; `progress.ts:145`; `validate.py:2791-2792`, `:2959-2960` | the finds and shelf lists; `stageCeiling(stage, purpose)`; the vault's `grade_up`; the validator |
| One grade-step price, the re-forge | `run/progress.ts:125` `gradePrice`, `:534`; `credits.ts:51` `priceOf` | one formula; the offer line reads `gradePrice`; a step to the same grade |
| Migration | `apply` (`game.ts:650-660`), `migrateCharacterHp` and `migrateCharacterMp`, `legendRoom` (`character.ts:1327`), `classRank` (`:1385`), `perkRev` | `GROWTH_REV`; the saved fields of `migration.rows` |
| The tables | `tools/balance/check.py` (read-only) | none: it reads the bible and data |

## Needs a new primitive

Names from critic-consistency-2's merged list (its section 5). Each for the lead to approve.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S7 `growthWorth`** | `growthHeld` (`effects/hooks.ts:37`) as a factor: none on the field and in a dry run, whole out of a fight, else the worth by the gap x `party_pace` (practice only; no `practice_rate` stat: no bible entry sets one, so it is dropped, 08-primitives); read once by every growth site in a fight | `growthHeld` is yes or no |
| **S4 keyed Marks** | the drill bar keyed `weapon:`, `door:`, `form:`, `feeling:`, thresholds from the track's row | the bar is weapon-only and kill-only |
| **S9 firsts** | a keyed set on the character with a load default | nothing records which spells were cast |
| Extensions (one key or parameter each) | `tallyOf`'s stage scope; `stageCeiling(stage, purpose)`; `levels.gains.by_level`; the grade step to the same grade (the re-forge); `capGrace`, `rankHeld`, `reachHeld`, `movesHeld`, `pointsOwed`, `respend` (saved fields with a load default) | on critic-consistency-2's extension list; `reachHeld`, `movesHeld` and `respend` are ruling 39's |

## What re-records

| What | Why |
| --- | --- |
| `level-gains.test.ts`, `levelup-revert.test.ts`, `legendary-deed.test.ts`, `skeleton-strength-checks.test.ts` | ceilings on fives, the swapped gains, `capGrace` in `legendRoom` |
| `test/balance/builds.ts`, `test/golden/builds-allin.json`, `builds-normal.json` and the golden tables built on them | the reference builds are legal at each level by the new gates |
| The class-rank tests; `classView.ts` | ranks at their new levels; `rankHeld`, `movesHeld` |
| `sigil-word-cap.test.ts`, the study and practice tests, the faith suites | the study, practice and Devotion numbers; the stage scope |
| The Survival suites (`survival-progress`, `-stage`, `-run`, `-run-levels`, `-vault`, `-loot`, `-materials`, `-field*`, `-map`) | XP by the fight's level and worth, finds and shelf, the vault, the gate's pick, the step price, the re-forge |
| `test/balance/survival-run.ts`, `party-fit.ts` | characters level by the map: a new baseline, read, not fitted |
| `test/old-save.test.ts` and its fixtures | `GROWTH_REV`: a fixture for each row of `pacing.migration` |
| `text-number-truth.test.ts`, `tools/text_numbers.py`, `test/datatext.test.ts` | the texts that read their fields |
| `tools/validate.py` | the vault, the finds and shelf lists, `fight_xp`, `levels.gap.worth`, `growth.party_pace`, the `by_level` gains |
| Web: `screens/levelup.js`, `game/classView.ts`, `game/runView.ts`, `narrator/context.ts`; the two-browser e2e that levels in Survival | the next ceiling, the rank's level, the XP bar, the XP sources told to the AI Narrator |
| The spec `docs/rules/PHC-Core-Rules-v1.0.md` | a rules revision first: every key of `pacing.json`; section 14's provisional list |
