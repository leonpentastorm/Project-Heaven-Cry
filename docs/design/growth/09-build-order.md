# The growth bible: the build order (0.34 rebalance, closing pass)

The bible is applied in the seven steps of `README.md`, **one after another, with the gate between each**. A step starts only when the step before it is green and reviewed. Inside a step, the lanes marked "after" run one after another as well, because they share files; no two lanes run at the same time on the same file. The lead writes the rules revision in `docs/rules/PHC-Core-Rules-v1.0.md` at the start of each step (the spec first, then the data, then `python tools/validate.py data`), before any lane begins; no lane edits the spec.

Rules every brief carries (CLAUDE.md): use the engine, never build beside it; the no-rebuild rules 1 to 6 (a new piece only from `08-primitives.md`, approved by the lead; content is data; one copy of every rule and price; a consolidation pass; tests through the real path, the reducer and a real action; lint baselines only shrink); every mode keeps its side panels. Every number is the bible JSON's: a builder copies it from `tools/balance/bible/*.json` (or its `@` reference) into `data/`, never from a prose file. **The gate of every step** is `npm run check`, `python tools/balance/check.py` (still `0 FAIL, 0 WAITING`), and the step's own proving test; golden tables re-record **on purpose**, with the diff read against `TABLES.md` before it is accepted.

## Step 1. The scale: the factor, the columns, the cards, HP, the grade ladder, the enemy table

- **Bible:** `scale.json` (`factor`, `columns`, `cards`, `hp`, `mp_pool`, `costs`, `plate`, `armour`, `grades` (the dmg / acc / arm ladder only), `stack` (the two buckets, A8), `caps`); `world.json` `tiers` (Defense, fixed), `levels` (the enemy HP and damage columns), `stated_attacker`, `stated_defender`.
- **Data:** `weapons.json` (every damage row x the factor, the profiles); `rules.json` (`output`: columns, profiles' `k`, the stack; `rarity` dmg / acc; `combat` caps that go); `attributes.json` (the nine cards' `derived`); `skills.json` (the alpha cards' slopes only); `enemies.json` (`levels`, tiers' Defense, HP and damage rows); the 188 flat rows TABLES.md lists under the factor (`classes.json`, `perks.json`, `items.json`, `conditions.json`, `soul_modules.json`, `sigils.json`, `traits.json`, `tending.json`), each by its `path`.
- **Engine:** `effects/output.ts` (`statOf`, `deal`, `stackDamage`'s buckets), `effects/damage.ts`, `effects/mending.ts` (the heal column, the half-bar cap removed), `character.ts` (HP, the MP pool, the cards' numbers out of code at `:770`, `:798`, `:801`, `:817`, `:821`), `tactics.ts:420-428` (the thrown path onto `deal()`, its three ids into the rows' `effects`), `sigil.ts` (the dead Sigil cap).
- **Web:** HP and MP bars and the damage line (`apps/web/src/game`, the sheet's cards).
- **Re-records:** every `golden-damage*` table and `test/golden/builds-*.json`; `golden-conditions`; `golden-costs*` (MP prices); `rules-enemies`, `costs-foes`, `golden/enemies.json`; `heal-pct`, `rules120-heal-shield`, `bond-heal-shown`; `enemy-levels`, `level-gains`, `fx-hp-stamp`; `sigil-balance.test.ts` is deleted with the cap; `replays.json`.
- **Proves it:** a new engine test through the reducer: a level-1 and a level-20 specialist's plain hit for each door equal check (a)'s `DIGITS ... plain hit` lines, and character HP at Endurance 1 and 7 equal TABLES.md's HP table; check (b)'s hits-to-drop for the stated attacker and defenders, played through `npm run try`.

## Step 2. The ladders, the cash-out, Margins and the Push

Primitives first (lane 2a), then one lane a core (2b, 2c, 2d), **each after the one before**: they share `skills.json`, `classes.json`, `forks.json`, `conditions.json` and `calls.json`.

- **2a, the pieces.** `08-primitives.md` S1, S2, S3, S5, S6, S10, S11, S18 and the extensions an action's pair, `feed_flat`, a sum term's scope. Engine: `rolls.ts`, `combat.ts` (`critMin` at `:1644` becomes S1's judge), `character.ts:853-855` (the critical goes), `effects/triggers.ts` (`SOURCE_SPACES`: `cash:`, `cash_share:`), `effects/stats.ts` (`res_max:`, `wear:`, `begin_stage`; `crit_damage` and `crit_taken` renamed), `effects/cost.ts` (`setResMax` behind `res_max:`), `effects/feed.ts`, `effects/output.ts` (scope), `kit.ts` (`tieCap`), `figments.ts` (`ladderAt` generalised), `effects/actions.ts` (`holderNumber`). Data: `rules.json` (`rolls.margins`, `output.cash_out.step`), `actions.json` (`grace`), `conditions.json` (`slot`). Regenerate `docs/ENGINE-HOOKS.md`. Proves it: one test a piece, each through a real action.
- **2b, Body** (after 2a). Bible: `body.json` (the three doors, ladders, cash-outs, Pushes, keeps tags, classes), `scale.margins`, `scale.cash_out`, `scale.stack.scope`. Data: `skills.json` (Body rows), `techniques.json` (`rules.guard`, `rules.momentum`, the Finisher and Take rows, `take_cost`), `pressure.json`, `classes.json` (`defender`, `fighter`, `marksman`), `forks.json` (Body forks), `conditions.json` (Overpressed; Bleeding and Off Balance on self), `calls.json` (Warn and Cue on yourself), `enemies.json` (tiers' `pressure_off`). Engine: `physical/core.ts`, `physical/guard.ts`, `physical/rules.ts`, `physical/pressure.ts`, `physical/melee/finishers.ts`, `calls/core.ts`, `ladder.ts`.
- **2c, Mind** (after 2b). Bible: `mind.json`. Data: `skills.json` (Mind rows), `shadow.json`, `sigils.json`, `figments.json`, `classes.json` (`infiltrator`, `mage`, `trickster`), `forks.json` (Mind forks). Engine: `character.ts` (`shadowCap`), `sigil.ts`, `sigilwords.ts`, `figments.ts`, `classes/i.ts` (stored spells keep their length, ruling 39).
- **2d, Soul** (after 2c). Bible: `soul.json`. Data: `skills.json` (Soul rows), `soul_modules.json`, `tending.json`, `patrons.json` (Grace, the Hymn tiers), `classes.json` (`bard`, `channeler`, `guardian`), `forks.json` (Soul forks). Engine: `magic.ts` (`MAX_STAGE` onto `res_max:stage`), `feelings.ts`, `faith.ts`, `classes/soul.ts`.
- **Gear-perk feeders of the critical** (`gear_perks.margins_feeders`) land with 2a's rename, in `traits.json`, `perks.json`, `techniques.json` rows named there; their perks' new texts wait for step 5.
- **Web:** the critical's label becomes Margins; the ladder screens and the door tabs (`apps/web/src/screens`, `protodata.json` via `python design/canvas-build/build.py --web`).
- **Re-records:** `golden-damage*`, `golden-costs*`, `golden-rules*`, `golden-itemops*`, `golden-conditions`, `replays.json`; the door suites (`body-*-032`, `doors3-*`, `figments*`, `sigil14*`, `sigil15*`, `sigil-word-cap`, `bonds-slice1`, `bond-reach`, `chaplain`, `faith*`, `ai-soul`, `enemy-doors-183`, `enemy-bonds-186`).
- **Proves it:** each door's full cash-out at level 20 and its largest legal turn, played through the reducer with the sheet check (a) names, equal check (a)'s lines; every ladder point's `felt` visible on the sheet (check (c)); check (f)'s solo moves on a squad of one, through a real action.

## Step 3. Pacing: XP, gates, Marks, rates, credits

- **Bible:** `pacing.json` (`clock`, `xp`, `levels`, `gates`, `tracks`, `door_marks`, `credits`, `collection`); each door's `marks` gifts (body, mind, soul).
- **Pieces:** S4 keyed Marks, S7 `growthWorth`, S9 firsts; the extensions `levels.gains.by_level`, `tallyOf`'s stage scope.
- **Data:** `rules.json` (the XP table, attribute ceilings at 5 / 10 / 15, the class ranks' levels, the swapped gains at 4, 5, 14, 15), `survival.json` (`growth`, `party_pace`, the XP sources, `train`, credits), `techniques.json` (`rules.drill`), `sigils.json` (study, word Marks), `soul_modules.json` (modules learned), `feelings.json`, `figments.json` (form Marks), `patrons.json` (the Devotion curve from 0), `classes.json` (rank II at 5, rank III at 15 with the attribute at 8).
- **Engine:** `effects/hooks.ts` (`growthHeld` becomes `growthWorth`), `physical/data.ts` (`drillMarks`, `addDrill` keyed), `physical/rules.ts:90` (the drill event's site), `sigilgrowth.ts`, `feelings.ts`, `faith.ts` (Devotion XP), `character.ts` (level gains, ceilings), `run/progress.ts`, `run/tally.ts`.
- **Web:** `screens/levelup.js`, `game/classView.ts`, `game/runView.ts`, `narrator/context.ts`.
- **Re-records:** `level-gains`, `levelup-revert`, `legendary-deed`, `skeleton-strength-checks`, `test/balance/builds.ts` and `golden/builds-*.json`, the class-rank tests, `faith-xp`, `faith-pace`, `sigil-word-cap`, `survival-progress`, `survival-field-growth`.
- **Proves it:** a test that plays a character from level 1 to 20 through the reducer's XP awards and checks each level's hour against `pacing.clock` (check (e) CLOCK) and each spend plan's points against check (d); the two-browser e2e that levels in Survival.

## Step 4. Survival: five maps, the final boss, endless

- **Bible:** `world.json` (`levels`, `maps`, `final_boss`, `endless`, `budget`, `enemy_doors`, `campaign`); `pacing.clock.maps` read, never retyped.
- **Pieces:** the extensions `foeLevel`'s body and `fightLevel`'s place level, `levels.fight_level_from`, `from_stage`, `pressure_kind`, the map term's `from` in `budgetFor`, `armGuard` reading door blocks, `armDoors` faith by the highest.
- **Data:** `survival.json` (the map, stages, endless, budget, kits), `enemies.json` (templates: `last_reckoning`; the level rows by map and row), `loot_tables.json`, `maps.json`, the campaign files' tier field (`data/campaigns/`).
- **Engine:** `run/map.ts`, `run/encounter.ts`, `run/stage.ts`, `run/state.ts`, `campaign.ts` (the fallback with a validator warning); `tools/validate.py` (the `levels` block, the campaign tier warning).
- **Re-records:** `survival-encounter`, `-stage`, `-map`, `-layout`, `-faces`, `-run`, `-run-levels`, `-vault`; `rules-enemies`, `costs-foes`, `replays.json`.
- **Proves it:** a test that walks maps 1 to 5 and two endless maps through the reducer and checks every foe's level by map and row and the final boss at 11; `test/balance/survival-run.ts` read (not fitted) after the build.

## Step 5. Perks, grades, mods, signatures

- **Bible:** `gear_perks.json` (`rules`, `grade_rows`, `grades_by_map`, `boon_room`, `properties`, `mods`, `fit_fee`, `signatures`, `perks`, `mastered`, `boons`, `traits`, `repick`); `scale.grades` (`prayer`, `where_found`, magic and prayer grades, A9); `pacing.grades_by_map`, `pacing.credits` (the one step price).
- **Pieces:** S13 `crit_range` (with drill Mark III), S14 `targets.past`, S15 `GearState.props`, S17 `self_devotion`; the extensions `stageCeiling(stage, purpose)`, the re-forge step, `forge_fit_rate`, `with_this` on worn armour, `FITS` armour, `extraSlots` by grade, `gearNum` reading the carried list, `families.json signature`, `rarity.masterwork.default_slot`.
- **Data:** `perks.json`, `traits.json`, `items.json` (mods), `families.json`, `rules.json` (`rarity`: properties, slots, the magic and prayer grades), `survival.json` (`relic_props`, the shelf, the Forge fee, boons), `perk_cards.json`.
- **Engine:** `perks/*.ts`, `gear.ts`, `gearpreview.ts`, `credits.ts` (`priceOf`: the one grade-step price), `run/rewards.ts` (`cappedRarity` keeps Celestial), `run/shop.ts`, `run/power.ts`, `effects/collect.ts`, `effects/hooks.ts` (the baked signatures leave `:201`).
- **Re-records:** `golden-damage-perks`, `-traits-classes`, `golden-mods`, `golden-itemops`, `costs-items-*`, `items-b0`, `follow-strike`, `forge-mods`, `survival-shop`, `-loot`, `-vault`, `text-number-truth`, `datatext`; the spec's rarity table (`tools/check_spec_tables.py`).
- **Proves it:** the largest plain hit and the largest legal turn of each door played through the reducer with check (a)'s sheet (now including every perk and property) stay under `scale.digits.largest_turn_l20.max`; a run that finds and buys by `grades_by_map` (no Celestial before endless map 10; the vault at the map's own grade).

## Step 6. Migration

- **Bible:** `pacing.migration` (the one owner, one stamp `GROWTH_REV`, ruling 39), read by `scale.migration`, `world.migration`, `gear_perks.migration` and `repick`.
- **Pieces:** the saved fields with a load default: `capGrace`, `rankHeld`, `reachHeld`, `movesHeld`, `pointsOwed`, `respend`; S15's `prop` to `props`.
- **Data:** none beyond the stamp's home in `rules.json`.
- **Engine:** `game.ts` (`migrateLoaded`, `:527`), `character.ts` (`migrateCharacterHp`, `-Mp`, `-Class`, `-Perks`, `-Items`), `faith.ts` (`migrateCharacterFaith`: Devotion XP kept whole), `figments.ts`, `sigil.ts` and `classes/i.ts` (stored spells), `character.ts` (the re-pick through the existing `perkRev` piece).
- **Leon's call first:** whether a live character keeps its old Reach or gets one free re-spend (ruling 39; the plan is the re-spend, the fallback the grandfathering). The room saved mid-fight (ruling E): the builder proposes, the lead approves, before it is built.
- **Re-records:** `old-save.test.ts` and its fixtures.
- **Proves it:** `old-save.test.ts`, one fixture a row of `pacing.migration`, loaded through the real load path (`migrateLoaded` and `apply`), checking the character keeps its points, rank, moves and Devotion XP and is offered the re-pick and the re-spend.

## Step 7. The whole gate

- `npm run check`; every golden table and `replays.json` re-recorded on purpose, each diff read; `npm test -w @phc/engine`, `npm test -w @phc/web`; the full browser run (`npm run e2e`, every suite, and `node apps/web/e2e/two-players.mjs`); `test/balance/survival-run.ts` and the measures read, never fitted.
- **The consolidation pass** (no-rebuild rule 4): one reviewer reads the diff of `docs/ENGINE-HOOKS.md` and `packages/engine/src` since `release/0.34-final` began; its report goes in `docs/design/proposals/`; near-duplicates and typed numbers are merged or moved to data before anything is built on top.
- The lint baselines are lower than at the start (`lint-item-ops.baseline.json` and the others).
- Version bump, `CHANGELOG.md` and the live backup by whoever merges. **Nothing goes live without Leon's word.**
