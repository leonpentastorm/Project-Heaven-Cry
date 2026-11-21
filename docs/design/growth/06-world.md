# 06. The world's side: enemies, their levels, Survival's shape, the budget and campaign tiers (third draft, pass 3, 21 Nov 2026)

**For the lead. Nothing here is built.** Pass 3 (ruling F): every number of this file lives once, in `tools/balance/bible/world.json`, and `tools/balance/check.py` computes every table from it. **This file explains and carries no number the JSON does not**; a number is quoted by its key:

    export PYTHONUTF8=1
    python tools/balance/check.py                        # 06's are (b) HITS and the levels (e) CLOCK reads
    python tools/balance/check.py --tables hits budget   # the stated attacker and defenders against same-level foes; the rooms
    python tools/balance/check.py --tables pacing        # the maps with their foe levels by row, beside 05's clock

**Shared numbers are referenced, never copied:** the factor and the enemy columns are `scale.json`'s (`scale.factor.value`, `scale.columns.enemy_hp`, `enemy_damage`, `enemy_armour`, `defense_plus`, `attack_plus`); **the hours and the squad's level by map are `pacing.json`'s (ruling 36: one clock)**, and this file types no hour; the grade a map finds and sells is `pacing.grades_by_map` (ruling 25); the migration is `pacing.migration` (ruling 39). It applies the lead's rulings A1 to A3, A8, B15, C19, D24, D25, D28, F36 and F38; above them, Leon's rulings and the charter. Every number is **PROVISIONAL**.

## 0. What this file decides

1. **The tier rows** (`world.tiers`): today's rows read from `enemies.json`, moved by `world.tiers_rule`; Defense fixed by tier (ruling A3); the Pressure offset (ruling 19); the lag; the cost in Soldier-equivalents.
2. **Whom the columns are written for** (`world.stated_attacker`, `world.stated_defender`): check (b) reads the columns back against them at the levels `stated_attacker.levels`.
3. **A foe's level comes from the map and the row** (ruling 24: `world.levels`, `world.maps`, `world.endless`), never from the party.
4. **Five maps, the final boss, endless** (`world.maps`, `world.final_boss`, `world.endless`).
5. **The budget by level difference for squads of 1 to 4** (`world.budget`), with ruling 38's lone Boss.
6. **Enemy doors read the characters' ladders** (`world.enemy_doors`).
7. **A campaign states its tier** (`world.campaign`, ruling 28).

## 1. The tier rows and the roll

**Today (checked).** The tier rows are the level-1 numbers (`data/enemies.json`: vermin `:7`, minion `:39`, Soldier `:70`, Elite `:105`, Boss `:146`), each with `hp`, `defense`, `attack_bonus`, `armour`, a `damage` factor and a `lag`. `levelled()` (`packages/engine/src/data.ts:117`) applies the level table (`enemies.json:214`); `unitFromEnemy` (`combat.ts:636`) puts them on the unit. The level-gap rules are `enemies.json:199-212` (`one_hit_levels_below`, `to_hit_per_level` up to `max_levels`, `full_hp_guard`, `narrator_shift`); they stay unchanged.

**New.**
- **`tiers_rule`**: HP and armour take the one factor (`scale.factor.value`, ruling A1); the damage factor takes `damage_x` so a same-level Soldier's service-rifle hit (`world.enemy_weapon`) lands the frail character in the hits the charter asks. `scale.json` points to `damage_x`.
- **`tiers.<tier>.defense`**: fixed by tier and never grown (ruling A3). *A point of skill is always a Margin you can see, and "against an Elite the same roll just lands" holds at every level.* The level gap is the only way a level touches the roll.
- **`tiers.<tier>.pressure_off`** (ruling 19): the levels under the best Reach laid on a target that its Pressure cap stands at; `pressureCap` (`physical/pressure.ts:15-17`) reads the field in place of tier names.
- **`tiers.<tier>.lag`**: the levels a tier stands under its row's level (*a swarm is a level under its masters, so more of them fit the room*).
- **`tiers.<tier>.bulk`** is re-read for the new Defense (*an Elite and a Boss are harder to hit, so each takes more of a squad's turns than its HP alone says, and the generator must know it*); **`pressure`** is today's, read from `survival.json` (every tier's damage moves by the same factor, so a tier's hurt per round against a Soldier's is what it was).

## 2. The columns read back: check (b)

`stated_attacker` is a one-door specialist at the gated attribute and alpha (`pacing.gates.ceiling_by_level`), one grade under the finds grade of the map where the squad stands at that level (`pacing.grades_by_map`), carrying `ordinary_sum_per_level`; its builds are the two-handed Strength blow and the plain rifle. `stated_defender` is the frail character in Light armour and the hardy one in Medium. Check (b) fails an attacker row under `stated_attacker.min_exchanges` and a defender row under `stated_defender.min_exchanges`.

- **The attacker's floor** is one plain blow plus one Margin (`1 + @scale.margins.per`): *a same-level foe survives the hardest plain blow on the sheet even with a Margin on it, so every foe takes a second blow.* The scale drafter's reading stood until this file landed: the maul specialist drops a same-level Soldier in under two blows; with this floor that is read as "on its second blow", which the tier rows keep (ruling A1: only a change this bible names moves a count). **For the lead** (question 2).
- **The defender's floor** is two: *the frail character always has one turn to answer, a Boss's blows included.*

`--tables hits` prints the grid. What a player reads off it: a Soldier is a few solid hits at every level, an Elite more, a Boss a squad's fight; the frail character goes down to a few hits of the top foes, which is where the wall earns its place.

## 3. A foe's level comes from the place (ruling 24)

**Today (checked):** Survival's generator sets the fight level from the party (`composeEncounter`, `run/encounter.ts:164-166`; `fightLevelOf`, `data.ts:124`); `foeLevel` (`encounter.ts:74-75`) puts ordinary tiers under it and Elites and Bosses over it by `eliteUp` (`survival.json stage.elite_up`); story fights take the party's average plus the Narrator's shift (`fightLevel`, `combat.ts:1785-1789`).

**New:** `foeLevel`'s body reads `world.levels` (the rows: early, the gate, late, the Boss) and the map's levels by row (`world.maps.<m>` for the five maps; `world.endless.levels`, formulas of the map, after them), each capped at `world.levels.cap` (read from `enemies.json`). The gate Elite, every Elite node and the vault's guard take the map's top; a tier then stands its `lag` under its row. `eliteUp` and `stage.elite_up` are deleted. **The party's level is used for one thing: the budget** (section 6). *Taking the long road makes you stronger than the map; rushing to the Boss makes you weaker than it. A level means something because the world does not follow you.*

The map card and each fight node show the foes' level beside the squad's (client text; critic-player 16), so a level gained reads as "this map's Soldiers now fall faster" and a level rushed as "this Boss is a level over you".

## 4. Five maps, the final boss, endless

**Survival's maps** (`world.maps.1` to `.5`): two levels a map, the Boss at the map's top, early rows at the map's opening level and late rows one up. Each map adds what it asks of the squad (`templates`, a `from_stage` beside today's `from_depth`; `tags` by tier; `kit` says it in words): the first map meets Guard once at the gate; the second asks for spotting; the third brings the casters and the Bonds; the fourth plates the line itself; the fifth is all of it at once. *The five maps teach the doors on the other side one at a time, and the final boss asks for all of them.* The hours of each map and the squad's level on arrival and leaving are 05's (`pacing.clock.maps`); `--tables pacing` prints the maps beside them.

**The final boss** (`world.final_boss`): the template `last_reckoning` on map 5's Boss node, at `world.maps.5.boss` (the final boss at 11, one level over a squad that reaches it at the level map 5's gate gave), with its own `rounds` and `pressure_kind`. Its slots are rows that exist (`heart_sovereign`, `sigil_warden`, `heartfire_elite`, a bonded minion line). After it: the boon of three, the Survival cleared panel with the run's score, then retire (`how: 'retired'`, as today) or walk on into endless. The account's permanent upgrade is a slot that ships empty (`account_reward`).

**Endless** (`world.endless`): one level a map until foes stop at the cap (`levels`); from `past_cap.from_map` each map adds a little bulk and pressure with no end (*each map past the cap puts a little more in the room*); before it the foes' levels are the growth, so the map term (`survival.json stage.bulk`, `stage.pressure`) counts from there only. **A kit a map** (`kits`): plated Soldiers, casters in plain fights, Witnessed Elites and Bosses, skulking minions, Bonded Elites, an Elite in plain fights, twin Elites at the gate, the final boss again; then the list repeats a tag step stronger (`kits_repeat`). Kinds and kits by setting stay as they are (`survival.json settings`). **The boon cap stays** (ruling A10): a boon past it is worth nothing and its card says so; 05's calendar stops counting it (`pacing.calendar.map_events`).

## 5. Enemy doors read the same ladders

`world.enemy_doors`: an enemy's door does what a character's does, at its door points and its level. A tag at a Reach step carries the family that step needs (ruling 13): `plated` (Durability), `skulk` (Ingenuity), `faithful` (Faith and Devotion), `bonded` (Empathy, with an Attuner in hand), each with `_ii` and `_iii`. Insight's gamma is `implication` (`data/skills.json`), whose display name is Insinuation (`skills.json:4459`; critic-consistency-3 2). **Guard by the same reader:** `armGuard` (`combat.ts:700`) reads Durability from every door block and the plates from the ladder; the row's typed `guard` block goes. **Faith by the highest** (`enemy_doors.faith_reads`). **Casters** (`enemy_doors.casters`): Line length from Brain Power and top stage from Will Power on the ladders, so `sigils.json enemy_ai.max_words`, its code copy (`sigil.ts:1444`) and `soul_casters[].reach_bonus` go; a soul caster's pool is its row's `mp` on `scale.columns.mp` (`enemy_doors.mp`). **What an enemy deals through a door** reads `enemy_damage`; **what it soaks** reads `enemy_armour`, as its armour does: *a plate is a plate on either side of the board.*

## 6. The budget by level difference (ruling 38)

`world.budget`: a room's bulk is `bulk_per_char_round` times the squad times the kind's `rounds`; its pressure is `pressure_per_char` for the squad times the squad times the kind's `pressure_kind` (all four read from `survival.json` but the new `pressure_kind`). A foe costs its tier's `bulk` and `pressure` times `lag_factor` to the power of the squad's level less the foe's (*a foe one level over takes about two fifths longer to drop and hits about a third harder: it fills the room like more than one foe of your level*), an Elite and a Boss times their `share` by squad. `pressure_kind`: *the first fights of a map are a warm-up; an Elite's room hurts more each round, so you feel it in the first exchange, not the sixth; a Boss's more; the final boss's most* (ruling 24). Today the pressure cap does not read the kind at all (`budgetFor`, `encounter.ts:95`).

**A Boss may come alone** (ruling 38): `--tables budget` prints the cost factor by level difference, every room for squads of 1 to 4, and each lone Elite and Boss against its room. At these rows a same-level Boss fills its deadly room alone at every squad size, and a lone Elite fills a solo's hard room; the final room leaves space for its lieutenants from a squad of two. Kept as it falls; the run simulator reads it after the build, and `survival.json share` is the lever if a fight reads empty.

## 7. A campaign states its tier (ruling 28)

**Today:** a campaign file has no tier and no level (`docs/design/campaign-format.md`); M813's encounters give none (`data/campaigns/m813.json:73`, `:93`, `:132`), so every M813 fight takes the party's level.

**New** (`world.campaign`): `tier` (one of `pacing.xp.campaign_tiers`), `levels` (start and end, checked against the tier's row), a level on each zone (the place's level, then the Narrator's shift), a band on each act. **The order a fight takes its level** is `campaign.order`; the party's level is only the last fallback, for a file with no level anywhere, with a validator warning. *A campaign's world, like Survival's, does not follow the party: a hard place is hard.* M813 declares `campaign.m813`. The Proving Ground (`proving.json`) keeps its waves' own levels.

## 8. Migration

`world.migration` is `@pacing.migration` (ruling 39: one owner, one stamp). What concerns the world: a run saved between nodes loads unchanged (the run's `stage` keeps its meaning, the map); a 0.33 squad over-levelled for its map loses nothing; a room saved in the middle of a fight is ruling E's.

## Questions for the lead

1. **A Boss comes alone at every squad size** (section 6, ruling 38). Recommended: keep it and let the run simulator read it; `share.boss.hp` is the lever if a Boss fight reads empty.
2. **Check (b)'s attacker floor** is one blow plus one Margin, not two blows (section 2): the maul specialist's same-level Soldier falls to its second blow. Recommended: keep the tier rows on the one factor (ruling A1) and this floor; the alternative is a Soldier tier row over the factor, which would also lengthen every rifle fight.

## Critics' findings

| Finding | Status | How |
| --- | --- | --- |
| consistency-2 1.2, player-2 8 (06 on an old clock) | FIXED | this file types no hour and no squad level; it reads `pacing.clock.maps` |
| consistency-2 1.9, 7.1 (two migrations) | FIXED | `world.migration` is `@pacing.migration` |
| consistency-2 1.16 (`bonded_iii`'s gamma) | FIXED | the id is `implication` (`skills.json`), the name Insinuation; the tag names the id |
| consistency-2 2.1 (the vault) | FIXED for 06 | the vault is `pacing.grades_by_map.vault` (ruling 35) |
| consistency-2 6.5 (tier words for a fight's level) | FIXED | `world.levels.fight_level_from` |
| player-2 11 (boons past the cap) | FIXED for 06 | the cap stays (ruling A10); 05's calendar stops counting a boon past it |
| scale's reading (the maul's Soldier under two blows) | ANSWERED | section 2 and question 2 |

## Built from

| Rule or number | The existing piece and data key that carries it | What must change |
| --- | --- | --- |
| Tier rows, columns | `levelled()` (`data.ts:117`), `enemies.json items[]`, `levels.table` | the rows by `tiers_rule`; the columns are `scale.json`'s |
| The Pressure offset | `pressureCap` (`physical/pressure.ts:15-17`) | reads `pressure_off` |
| Gap rules, guard, shift | `enemies.json levels.gap`, `narrator_shift`; `levelGap` (`combat.ts:732`), `BOSS_GUARD` (`:752`), `fightLevel` (`:1785`) | none |
| A foe's level from the place | `foeLevel` (`run/encounter.ts:74`), `tierLag` (`:65`) | the body reads `survival.json levels` (from `world.levels`, `maps`, `endless`); `eliteUp` and `stage.elite_up` go |
| A fight's level for XP and drill | `fightLevelOf` (`data.ts:124`) | reads `levels.fight_level_from` |
| Foe cost, budget | `foeCost` (`encounter.ts:83`), `budgetFor` (`:92`), `survival.json` `lag_factor`, `tiers`, `rounds`, `share` | `lag_factor`, tier bulk, `pressure_kind`, the map term's `from` |
| Templates and tags by map, endless kits | `templatesFor` (`encounter.ts:116-118`), slots' `from_depth` (`:140`), `armed` (`:197`), `ai.tag_doors` (`enemies.json:729`), `armDoors` (`combat.ts:668`) | `from_stage`; the map's tags and kits added in `armed`; new tag rows (data); faith by the highest |
| Guard on enemies, casters | `armGuard` (`combat.ts:700`), `sigils.json enemy_ai.max_words`, `ENEMY_MAX_WORDS` (`sigil.ts:1444`), `soul_casters[]` | door blocks read on the ladders; the typed copies go |
| The final boss, endless | `templates`, setting `boss`, `heart_sovereign`, `sigil_warden`, `heartfire_elite`; `endRun` and the boon and tile states (`run/state.ts:252-257`) | a template `last_reckoning` (data); the cleared panel; retire as today |
| Campaign tier and levels | `validateCampaign` (`campaign.ts:122`), `encounterLevels` (`game.ts:1664`), `fightLevel` (`combat.ts:1785`), the drill spawn (`game.ts:4331`) | the fields of `world.campaign`; the zone's level before the party's; the validator warning |

## Needs a new primitive

None. Every extension is one key or parameter of a piece that exists, under critic-consistency-2's names (section 5): `foeLevel`'s body and `fightLevel`'s place level; `from_stage`, `pressure_kind` and the map term's `from` in `budgetFor`; `armGuard` reading door blocks; `armDoors` faith by the highest; `pressure_off`; `levels.fight_level_from`.

## What re-records

| What | Why it moves |
| --- | --- |
| `test/golden/enemies.json`, `rules-enemies.json` and its log, `costs-foes.json` | every enemy stat block, level row, tier bulk and `lag_factor` |
| `golden/replays.json`, `test/replay-hash.test.ts`, `test/helpers/replay.ts` | seeded fights: foe HP, armour, Defense, levels and the generator's picks |
| `enemy-levels.test.ts`, `rules115-review.test.ts`, `rules123-defence.test.ts`, `bugsweep-1112.test.ts` | the level table and the gap at today's numbers |
| `survival-encounter`, `-stage`, `-vault`, `-layout`, `-faces`, `-run-levels` | levels from the map; `eliteUp` gone; the budget's rows; the final template |
| `enemy-doors-183.test.ts`, `enemy-bonds-186.test.ts`, `enemy-ai-179.test.ts`, the Sigil and Soul caster suites; the Pressure suites | new tag rows; Guard from door blocks; Line length and top stage from the ladders; faith by the highest; `pressure_off` |
| `test/balance/survival-run*`, `party-fit`, `step1-fit`, `defence-measure`, `balance-sim`, `magic-measure`, `shadow-measure` | the run's curve and Elite and Boss HP: read again as readings |
| `tools/validate.py` | the `levels` block, `pressure_off`, the campaign fields and the fallback warning |
| `apps/web` suites and e2e that read a foe's HP or a map's level; `npm run try` scenarios naming enemy numbers | displayed numbers; the map card's levels |
| `docs/rules/PHC-Core-Rules-v1.0.md`, `docs/design/survival-spec.md`, `docs/design/campaign-format.md` | the spec first, then the data |
