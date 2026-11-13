# Survival, build step 3: one stage playable (hand-off, 13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4), rules 2, 4, 5, 8, 11, 13 to 24, 26, sections 3 and 5, section 10 step
3. Rules: `docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.41**, items **2800 to 2832** (every number PROVISIONAL).
Branch: this worktree's (`worktree-agent-a882ae8da6e53a575`), from `claude/charming-gauss-hbq4n0` at 5c8c0694. No
version bump; nothing deployed.

**PART A GREEN** (13 Nov): steps 1 and 2 merged (`worktree-agent-aac60994cdd4d1f97`, `worktree-agent-a620bcbe84dc17ce1`),
step 2 wired into step 1; validator 0 errors, both `tsc --noEmit` clean, `engine_catalog.py --check` clean,
`npm run built-from` (smells answered below), the pins (`test/golden test/replay-hash test/lint test/balance-contract`
and the oracles `paths-order sight-order shared-state old-save`: 27 files, 149 tests) green, browser suite `room` 25
of 25 on port 8951.

## 1. Part A: the merge, and what it needed

- **Conflicts:** `old-save.test.ts` (both sides' cases kept: rules 1.36's and 1.39's), the Core Rules (1.38, 1.39,
  1.40 in number order; items 2500s, 2600s, 2700s, none twice), `tools/validate.py` (the modes block, then the
  survival block), `docs/ENGINE-HOOKS.md` regenerated. Golden tables and `replays.json` did not conflict and no pin
  moved: nothing was re-recorded.
- **One real fault found by the pins:** the replay guard's "a save and a load in the middle changes nothing" was red
  on the merged tree (it was never run on step 1's branch): `migrateLoaded` wrote `settings.play = 'campaign'` into
  every loaded save, so a reloaded game's state hash differed. A load now writes nothing: `playOf` already reads a
  missing `play` as the old-save mode. Item 2602 and `old-save.test.ts` say so (the fixtures now assert
  `settings.play` absent and `playOf` campaign).
- **Wiring:** `run/start` draws stage 1's map (`pathMap(seed, 1)`) on stage 1's tile and puts it in `g.run.nodes`;
  `RunNode` is now `PathNode` (one type); `g.run.at` is where the squad stands; `run/move` and `run/go` (rule 11's
  leans and the host's tie); the path map screen replaces the placeholder panel; after a retire (and a loss) the room
  is back in its lobby, the last run's score shown above the mode cards.
- **The spec brought in line:** rule 8 (one crossing where a row keeps its width), rule 9 (c) and (d) "on at least one
  route" (the lead's ruling of item 2709, recorded as item 2802), the open rows' fight weight, section 3.1's measured
  per-path counts, section 4.2's built items, section 10 step 3 marked built.
- **The fight weight:** 36 → **60** (item 2801). Re-run of the 1,000-seed test (`SURVIVAL_MAP_REPORT=1`, 5,000 maps,
  64,487,424 paths, every map holds every rule):

| Kind | Map: mean (5%–95%) | Path: mean (5%–95%) | Paths in the spec's range | Most one path takes |
| --- | --- | --- | --- | --- |
| fight | 15.73 (11–20) | **5.14 (3–8)** | 63.1% (5 to 8; was 50.7%, mean 4.61) | 9.74 |
| elite | 3.17 (1–5) | 1.70 (1–3) | 98.6% | 2.83 |
| shop | 4.34 (3–6) | 1.56 (0–3) | 47.8% | 3.79 |
| forge | 2.65 (1–5) | 0.86 (0–2) | 59.3% | 2.23 |
| training | 2.94 (1–5) | 1.04 (0–3) | 93.9% | 2.52 |
| shrine | 1.99 (0–4) | 0.66 (0–2) | 87.0% | 1.76 |
| rest | 3.03 (2–5) | 1.14 (0–3) | 70.0% | 2.76 |
| cache | 2.95 (1–5) | 1.05 (0–3) | 93.7% | 2.54 |
| event | 2.56 (1–5) | 0.84 (0–2) | 96.7% | 2.17 |
| nodes | 40.36 (32–47) | | | |

  Weight 50 gave 4.97, 70 5.27, 100 5.53 a path: guarantee (a) (two kinds at every step) caps how many fights a path
  can hold. 60 keeps the map near the spec's "about 15" and puts the median path at 5.

## 2. Part B: what was built (step 3)

| Piece | Where |
| --- | --- |
| The purse and the price door: `creditsOf`, `earnCredits`, `payCredits` (refusal in words), `cantPay`, `priceOf(id, rarity)`; `Character.credits` | `packages/engine/src/credits.ts` (new) |
| The encounter generator: budget, lag, lead, share, templates, composition, weapons, names, the cropped map with spawns | `packages/engine/src/run/encounter.ts` (new) |
| What a node pays: XP, credits, the ammunition pack, the weapon pick, the panels' and hover cards' words | `packages/engine/src/run/rewards.ts` (new) |
| `FoeSpec.scale` and `foeScale` (spec 4.2 item 2), `layoutMap` (the yard and the crop share it) | `combat.ts` |
| The run reducer: `run/start` (map, purses), `run/move`, `run/go`, `run/pick`, `run/skip` (tests only), `run/retire` (to the lobby); `runEnter`, `runFight`, `runFightOver` (the fight-end branch beside `sandboxOver` / `finishCombat`), `fightBack` (the part every fight end shares, extracted from `finishCombat`), `newScene` (extracted from the Narrator's turn) | `game.ts` |
| The run's state: `RunPhase` + `fight` and `reward`; `RunOffer`, `RunNote`, `RunFight`; `reachable`, `runMoveProblem`, `leanWinner`, `runNode`, `runSetting`, `survivalRun`; a fallen character refused at `run/start` | `run/state.ts` |
| `levelUpDue(c)` (the level-up screen's "something waits", moved from `main.js` into the engine) | `character.ts` |
| Data: `run`, `stage`, `rounds`, the budget numbers, `tiers`, `lag_factor`, `share`, `map_size`, `xp`, `credits`, `ammo_pack`, `rewards`, `nodes`, `tips`, `pools`, `names`, `templates` (the eleven of spec 3.2), `settings` (the six of 3.3); `enemies.json items[].lag`; the fight weight 60 | `data/survival.json`, `data/enemies.json` |
| Validator: every new key (tiers, casters, kinds never celestial, weapons, rarities, ceilings, spawns, the lag rows, provisional) | `tools/validate.py` |
| The path map screen: rows of nodes left to right, each its line icon and word, links (walked solid, lit to the reachable, else dashed), where the squad stands, the marks; hover cards from the engine; the squad strip (level, HP, credits, ★ Level up); the node's panel; the weapon pick (three cards and credits instead; the host may pick for an away player); STAGE CLEARED and Retire | `apps/web/src/game/RunScreen.tsx`, `runView.ts`, `runIcons.ts` (new) |
| Routing: screen `run`, `homeScreen(g)` (where "back" goes: the fight, the run's map, the lobby, the story), the combat card's "Back to the map ›" / "Back to the room ›", the level-up screen's way back, the room's "Back to the run ›" and its last-run score | `store.ts`, `App.tsx`, `combat.js`, `levelup.js`, `room.js`, `room.template.html`, `combat.template.html` |
| Test hooks: `phc.testRoom` (a room with `settings.test`: the only one where `run/skip` works), `phc.testSeed` (Start sends the seed) | `modes.ts`, `store.ts`, `room.js` |
| Browser suite `survival` (18 checks), registered in `groups.json` (rules) | `apps/web/e2e/survival.mjs` |
| `faith-pg`: the FAITH tab waits on state (the combat screen up, the dock drawn and unlocked, the tab selected) | `apps/web/e2e/faith-pg.mjs` |
| Rec: `byOf(u)` sends a unit's actions as its owner (a room of one player a character) | `test/helpers/replay.ts` (no recorded hash moves: default host) |

## 3. Built from

| Rule | Primitive |
| --- | --- |
| The map on the run's start (rules 10, 12) | `pathMap` (`run/map.ts`), `rngFor` |
| Choosing the next node, the leans and the host's tie (8, 11) | the run reducer (`run/*` through `reduce`), `isHost`, the Proving Ground's READY pattern (marks by player id) |
| A node is a new scene (29) | `newScene` (the Narrator turn's scene change, extracted: one door) |
| The fight (13, 15) | `startCombat(name, map, pcs, foes, difficulty, g.rng)`, `magicIn`, `runEnemies`, `syncSong`, `musicOf` (sbBegin's pattern); `cb.noXp` |
| Tiers, levels, the lag, the lead (16 to 19) | `enemies.json` tier rows, `levels.table` (through `unitFromEnemy` / `enemyStats`), `fightLevelOf`, `clampEnemyLevel`; new `lag` field (spec item 7) |
| The spawn share (20) | **new** `FoeSpec.scale` (spec item 2) |
| Composition (21) | the loot roller's weighted pick (`rollTable`) for the template, the kind and the rarity; `CASTER`, `HEART_CASTER` (`armFoe`, `armHeart` arm them); `FOE_TAGS` `skulk` and `hidden` (`applyFoeTraits`, `startHidden`) |
| The map (22) | `MAP_LAYOUTS.open_ground`, `readLayout` (through `layoutMap`), `deployEnemy`, `startGap`, `nearestFree`, `standable`, `MAP_LIMITS`; `defaultObjects` (startCombat) |
| The fight's end, win and loss (4, 5) | `checkOver`; `fightBack` (faith, `unitToCharacter`, dropped weapons, companions, `noteDeaths`, `magicOut`, `combat_end`: extracted from `finishCombat`, one door); `endRun` |
| XP and levels, the class at level 3 (14) | `giveXp` (items' `xp_mod`, `xp_grant`, `applyLevels`, `rankReached`); the level-up screen and `levelup/*` |
| Credits (2, 14) | **new** `credits.ts` (spec item 1) |
| The ammunition pack (23) | `lootToPack` (`mag:<weapon>`), `roundsOf`, `packAdd`, `holds({slot: 'person', door})` |
| The weapon pick (26) | `rollTable`, **new** `priceOf` (spec item 4), `RARITY` (`rules.json rarity`), `FOCUS_IDS`, `FOCUS_DOOR`, `kindOfDoor`, `lootToPack` |
| Rest (24) | `applyRest(g, 'long')`, `beginSession` |
| The node's words, the hover card | data (`nodes`, `tips`); the one hover card (`tipProps`, `openTipOn`) |
| The client's view | `runView` reads `reachable`, `runMoveProblem`, `runRetireProblem`, `nodeXp`, `nodeCredits`, `levelUpDue`, `maxHp`, `creditsOf`: the client builds no cost, legality or number |

**New primitives** (each general): `credits.ts` (the purse, `payCredits`' refusal, `priceOf`), `FoeSpec.scale` /
`foeScale`, the tiers' `lag`; and three extractions that make one door of what was two: `fightBack`, `newScene`,
`layoutMap`; `levelUpDue` moved from the client to the engine.

**`npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`**, the smells left and why they stay:
1. `combat.ts` `foeScale`: "HP written by hand": a foe's spawn HP at its construction (as `unitFromEnemy` writes it
   and the `fixed` pin beside it); no damage or heal.
2. `game.ts` rule 5's `c.hp = dead_return_hp`: setting a returned character's HP, as `unitToCharacter` sets a Downed
   character's 1 HP; no damage or heal.
3. `game.ts` "a round number kept by hand" (the FAIL line): `rounds: cb.round` records the fight's length in the
   run's stats (rule 35); it is no limit or cooldown, and `lint-costs` (the lint it names) passes.
4. `game.ts` `a.patch.test` and `encounter.ts` `case 'split'`: "an item tested by its id": a settings key and a spawn
   kind, not items.
5. `runView.ts` "a rule's number typed in a client file": the line reads `survivalRun.dead_return_hp` from data; the
   number in it is the engine's.

## 4. The measured budget (stage 1; `SURVIVAL_ENC_REPORT=1`, 150 seeds × levels 1, 3, 6, 9 × every fight node)

| Party, node | Fights | Bulk spent / target | Pressure spent / cap | Foes (mean) | HP-scaled | Maps (16 / 20 / 26) |
| --- | --- | --- | --- | --- | --- | --- |
| N1 fight | 2400 | 0.987 | 0.885 | 2.27 | 69.7% | 2400 / 0 / 0 |
| N1 elite, gate | 1600 | 0.905 | 1.008 | 1.00 | 0% | all 16 |
| N1 boss | 200 | 0.983 | 1.000 | 1.00 | 0% | all 16 |
| N2 fight | 2400 | 0.987 | 0.901 | 3.94 | 32.8% | 1789 / 611 / 0 |
| N2 elite, gate | 1600 | 1.000 | 1.028 | 2.00 | 100% | all 16 |
| N2 boss | 200 | 1.047 | 1.044 | 2.00 | 0% | all 16 |
| N3 fight | 2400 | 1.009 | 0.897 | 5.86 | 21.4% | 42 / 1894 / 464 |
| N3 elite, gate | 1600 | 1.000 | 1.067 | 3.50 | 100% | 800 / 800 / 0 |
| N3 boss | 200 | 1.007 | 0.839 | 2.00 | 0% | all 16 |
| N4 fight | 2400 | 0.962 | 0.887 | 7.75 | 20.0% | 0 / 610 / 1790 |
| N4 elite, gate | 1600 | 1.000 | 1.046 | 4.75 | 100% | 0 / 1600 / 0 |
| N4 boss | 200 | 1.003 | 0.811 | 2.75 | 0% | 50 / 150 / 0 |

Every fight of stages 1 and 2 is inside both bands (the test). "HP-scaled": the pressure cap or `max_foes` stopped
another foe while the bulk was short, so every foe took the rest as HP (rule 19). Lagging Minions bring more pressure
than bulk (0.43 to 0.31 at a lag of 3), which is why a solo fight scales most often, and why every Elite fight from two
up is scaled: an Elite's guard can't be added under the cap. Templates over the 50,400: elite_pack 15,328, firing_line
9,634, swarm 6,964, warden 3,744, rush 3,422, caster_guards 3,139, machines 2,408, champion 2,400, ambush 1,632,
healer_line 1,601, twin_elites 128.

**Stages played by the simulator's policies** (`SURVIVAL_STAGE_REPORT=1 npx vitest run --root packages/engine
test/survival-run.test.ts -t report --silent=false`: build step 3's "npm run try" equivalent; the walker takes fights
first and spends no level-up points): the solo plain gun cleared the stage on all six seeds (level 7 or 8; fights 2 to
4 rounds against R 4 to 5, the Boss 11 against 9); a squad of four (plain gun, tank, Sigil, Outburst) fell on all six,
at nodes 7 to 12 (level 4 or 5; several fights 7 to 14 rounds against R 5). Not a fit: this is build step 9's
measurement (the policies spend no points, take no rest, and the four builds were never tuned to play together). It
says the squad side is the one to look at first: fights run long (bulk reached, damage spread over many bodies).

## 5. How to add an encounter template

1. One row in `data/survival.json` `templates`: `id`, `name`, `nodes` (fight, elite, gate, boss), `from_depth`,
   `weight`, optional `min_party` and `kinds` (it runs only where the setting has one of them), `slots` in order (each
   `tier` or `caster` (a list; the caster's own tier and weapon) or `boss: true` (the setting's Boss); `req` or `max`;
   optional `range` ranged / melee / close, `kind`, `tags`, `hidden`, `from_depth`, `spawn` far / near / between /
   back / central / flanks / split), `text`, `provisional: true`. At least one slot is required (the anchor).
2. `python3 tools/validate.py data` (tiers, casters, kinds, spawns), then
   `npx vitest run --root packages/engine test/survival-encounter.test.ts` (every fight inside its bands for every
   party size; a template that can't be filled within them is skipped for the next, so look at the report's template
   counts with `SURVIVAL_ENC_REPORT=1` to see it is chosen).
3. A new spawn kind is one `case` in `encounterMap` (`run/encounter.ts`) and the validator's list.

## 6. What is open

- **Item 2814 (for step 5):** a solo party's Elite, gate or Boss two levels up (stage 3) passes the pressure band by
  itself; recommendation: mirror the HP rule with a `scale.damage` down to the cap for a required anchor. Pinned by a
  test.
- **Rule 21 (d)'s "swap a Soldier for two Minions"** is not built (item 2812): the HP scale and the next template
  cover every case measured.
- **Start kits** (rule 28: three spare magazines, the `rigger` and `mender` kits) are step 4's; the creation kits are
  as today. The calibre round prices (spec 4.2 item 4's second half) are step 4's.
- **Characters after a run:** a retired or lost run leaves its characters in the room at the level they reached
  (fallen ones fallen); a new run needs level 1 characters ("kept as a draft" for other rooms, rule 4, is not built:
  the room's characters stay as they are).
- **`char/add` mid-run** is still not refused (step 1's open item 6).
- **Report a run** (rule 35) has its start in `g.run.stats.fights` (budget, foes, result); the damage tally is step 6.
- The **map art** (`survival-map-display` / `-aerial`) behind the nodes, the node-card paintings and the boon icons are
  not drawn yet; the node icons are line stand-ins (ART-REQUESTS S3).
- The co-op lean is built and unit-tested; the browser suite is solo (two browsers are build step 10's).

## 7. Calls made for Leon (each reversible)

1. A load writes no `settings.play` (the replay guard's fault; reading is unchanged).
2. Fight weight 60 (item 2801).
3. After a retire or a loss the room returns straight to its lobby, where the last run's score is shown; the
   combat card says "Back to the room ›" after a loss (item 2820).
4. A character who fell in a lost run is refused at the next `run/start` (item 2820); the alternative is to raise it.
5. After the Boss the run waits at `boon` with no boon until step 5; retire is the way out (item 2831).
6. A Relic roll is offered as Masterwork until Relic properties exist (item 2825); a picked gun takes its share of the
   ammunition pack (item 2828); one core a fight whatever the node (item 2823).
7. The pick's band is on the standard price (item 2824); its first offer is the door's focus or the hand weapon's
   category (item 2826).
8. The path map runs left to right (depth across, the map's columns down): it fits a wide screen with no scrolling.

## 8. Proof

- Engine: `test/survival-encounter.test.ts` (11 tests and the opt-in report: the lag field and factor against the level table within 3%,
  the budget, the worked example, 150 seeds × N 1 to 4 × 4 levels × every fight node of stages 1 to 3 inside the bands
  (stage 3's one gap pinned), every foe whole, the maps, determinism with no `Math.random`, the data);
  `test/survival-run.test.ts` (12 tests and the opt-in report: start, refusals in words, co-op leans and the host's tie, a fight node,
  `run/skip` test-only, the pay, the pick, rule 5, rule 4's loss, rest / cache / panels, the Boss and retire, a whole
  stage by `run/skip` to STAGE 1 CLEARED, and **the replay guard**: a seeded stage played by the policies gives the
  same hash twice and a save and load in the middle changes nothing); `test/run-state.test.ts` updated (15),
  `test/survival-map.test.ts` (10), `test/old-save.test.ts`.
- Browser: `survival` 18 of 18, `room` 25 of 25 (port 8951, `FAST=1`).
- Screenshots (1280 × 720, deviceScaleFactor 2):
  `/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/shots/survival-path-map.png`,
  `/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/shots/survival-reward-pick.png`,
  `/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/shots/survival-stage-cleared.png`.
