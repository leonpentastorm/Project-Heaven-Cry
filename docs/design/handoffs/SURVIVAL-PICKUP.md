# Survival: the pick-up (14 Nov 2026, at the close of build steps 9 and 10)

**Start here for Survival.** Survival is built (rules 1.39 to 1.50; version 0.27.0 on the branch) and **waits for
Leon's word to go live**: nothing of it is deployed. 0.26.0 (Classes 3.0) is live. Read `CLAUDE.md`, then this file,
then the spec `docs/design/survival-spec.md` (draft 4 and its three "Settled by Leon" blocks; where the built revisions
differ from its text, the revisions in `docs/rules/PHC-Core-Rules-v1.0.md` rule). What to try by hand:
`docs/PLAYTEST-CHECKLIST.md` section S (it ends with every call made for Leon, numbered).

## 1. What is built, step by step

| Step | Rules | What | Hand-off |
| --- | --- | --- | --- |
| 1 | 1.39 | The lobby's mode picker (three cards; Survival open, Roguelike and Campaign locked: `data/modes.json`), `settings.play`, `g.run`, `run/start`, `run/retire`, the refusals of story and Narrator actions in a run | `survival-step-1.md` |
| 2 | 1.40 | The path map generator on named seed streams (`rngFor`); replaced by 1.48 | `survival-step-2.md` |
| 3 | 1.41 | The encounter generator (the budget in Soldier-equivalents: bulk and pressure; the lag; the stage term; the share for small parties; templates; weapons), credits on a character, rewards (XP, credits, the ammunition pack, the weapon pick), rests, the death return, the loss, ONE stage playable | `survival-step-3.md` |
| 4 | 1.42 | Prices for everything (`priceOf`, round prices), the full-screen shop (counter, rolled stock, selling, restock), the faces, the gear preview | `survival-step-4.md` |
| 4a | 1.43 | In-run progression: the grade ladder (`setGrade`), a focus's grade on its door, the named Relic property on an instance, the Forge, rests' and training grounds' trainings (`addPractice`), the shrine, the Crossroads trades, lasting picks, the armourer's chit | `survival-step-4a.md` |
| 5 | 1.44 | Endless stages: the stage term, Elites and Bosses a level up a stage, the thirteen boons (relic items), the boon cap, the next tile, retire, renown, the kept draft | `survival-step-5.md` |
| 4b | 1.46 | Gives (`give.ts`), the shop's grade step, every safe node full screen (`placeView`) | `survival-step-4b.md` |
| 6 | 1.47 | The fight tally (`run/tally.ts`) and Report a run | `survival-step-6.md` |
| 7, 8 | 1.45 | The fight map's layout generator (stamps, cover, hazards) and kit drawing with fallbacks (`kit-<setting>-<piece>`) | `survival-steps-7-8.md` |
| lanes | 1.48 | The path map as lanes, junctions and one guarded vault; the themed overland map (`PathMap.tsx`) | `survival-lanes.md` |
| 9, 10 | 1.49 | The run simulator and the fit; the map fitted to its frame; the browser suite completed; the docs; 0.27.0 | `survival-steps-9-10.md` |
| repair | 1.50 | The repair service (`run/repair` at a shop and a Forge; the Repair shelf; wear bars and the WORN mark on the places and the path map); the simulator repairs | `survival-repair.md` |
| text | none | Every Survival string written to the player (Leon, 14 Nov: "write to the PLAYER"): keepers' lines by tab, the shrine's votaries, boon room, stops and forks, refusals by name; the rules in `ui-screens.md` "Writing for the player" | `survival-text-pass.md` |

Code: `packages/engine/src/run/` (`map.ts`, `state.ts`, `encounter.ts`, `rewards.ts`, `shop.ts`, `shopview.ts`,
`progress.ts`, `placeview.ts`, `power.ts`, `stage.ts`, `tally.ts`), the run reducer in `game.ts` (`runAction`,
`runEnter`, `runFight`, `runFightOver`), `credits.ts`, `give.ts`, `gearpreview.ts`; the client's `apps/web/src/game/`
`RunScreen.tsx`, `PathMap.tsx`, `ShopScreen.tsx`, `PlaceScreen.tsx`, `FullScreenFrame.tsx`, `StageScreen`; data
`data/survival.json`, `data/modes.json`; art `art/sprites/kit/<setting>/`, `art/illustrations/survival/`.

Tests: `packages/engine/test/survival-*.test.ts` (map, encounter, run, shop, progress, give, stage, tally, layout,
vault), `test/balance/survival-run.test.ts` (the run guard; the measure, opt-in), the browser suites `room`,
`survival`, `kit-map`.

## 2. What is open, by step

Each hand-off's own "open" section has the detail; the calls made for Leon are numbered in
`docs/PLAYTEST-CHECKLIST.md` section S.

- **Steps 1 and 3:** `char/add` mid-run is not refused (a late joiner brings an unrun character); a levelled character
  kept as a draft cannot be brought into a campaign room at its level (a new door: `char/add` builds level 1); rule
  21 (d)'s "swap a Soldier for two Minions" is not built (the HP scale covers it).
- **Step 4:** throwing knives are a light melee weapon (no thrown-category knife in data); the face's line is a CSS
  reveal, not skippable by a key.
- **Step 4a:** a door with no growth counter (Bonds, Figments, Shadow) trains drill or Devotion; the graft rolls from
  this tile's pool (the next tile's does not exist before the Boss).
- **Step 4b:** a give's toast primes on the first run screen after a page load (gives made while a page was closed are
  not toasted); the cache is not a place.
- **Step 5:** Primed's other doors (Pressure, a free Bond, Flux −2, Strain −1) need a trigger after `magicIn` (an order
  change in an existing hook: the lead's call); Boss portraits for field and shrine and five settings' own foes are
  stand-ins by name (`awaiting`).
- **Step 6:** damage by system and shields given are not tallied (the events lack `by` and `system`; one engine change).
- **Steps 7 and 8:** closed doors never start a fight (the enemy AI does not open doors); breaches draw only where rubble
  lies; the backdrop behind a fight map is not drawn (the combat screen has no layer for it).
- **Lanes:** no small junction after the gate (segments 2 to 4 leave none; widen `junction.segment` to 1 to 4 for one);
  the marker sheet and the six map backdrops are wanted (`ART-REQUESTS.md` S9).
- **Steps 9 and 10:** what the fit could not reach with data dials, and why: `survival-steps-9-10.md` section 5 (its
  durability finding is answered by rules 1.50's repair service).
- **Repair:** a gun above the worn share at one shop can wear out before the next (one fight in 44 runs); the policy
  repairs only Worn or Broken. The casters' sustain (rules 1.49 item 3609) is still open.

## 3. How to tune it (every dial is a field of `data/survival.json`, PROVISIONAL)

| Want | Dial | What it does |
| --- | --- | --- |
| Fights longer or shorter | `bulk_per_char_round` (0.25), `rounds` (R by node kind) | The bulk target: Soldier-equivalents of HP a fight brings, per character per round |
| Fights more or less dangerous | `pressure_per_char` (by party size), `max_foes` (by party size) | The pressure cap: Soldier-turns of damage a round the foes may bring |
| Small parties easier or harder | `share.boss`, `share.elite` (HP and damage by party size) | How much of a full Elite or Boss a solo or duo meets |
| How fast stages get harder | `stage.bulk` (length a stage), `stage.pressure` (danger a stage), `stage.elite_up` (Elites' and Bosses' lead in levels a stage, and its most) | The endless curve: where runs end |
| How fast characters level | `xp` (f(d)), `stage.xp` (by stage) | Level 3 at about depth 3, level 20 early in stage 6 |
| How rich a party is | `credits` (c(d)), `stage.credits` (by stage), `rewards.instead_rate` (credits instead of a weapon), `run.start_credits`, `sell_rate` | Income against the grade ladder |
| How fast gear grows | `grade_up.price`, `grade_up.places.forge`, `grade_up.relic_from_stage`, `rewards.ceiling` (picks capped by stage), `rewards.rarity` | One grade step a stage, the Relic in stage 4 |
| The vault | `vault.guard_factor`, `vault.grade_up`, `map.vault` | Its fight and its prize |
| Repairs dearer or cheaper | `repair.rate`, `repair.floor`, `repair.places` | The gunsmith's share of the price, the least a repair costs, the Forge's factor |
| What lanes hold | `map.themes`, `map.junction_kinds`, `map.every_route`, `map.shop_gap` | The node mix on a route (rests and shops a route) |
| Run power | `boon_cap`, `boons[].worth`, `shrine.token_max_worth` | How far boons and Relic properties go past the balance ceilings |
| Trainings | `train`, `training` | The rest's small and the training ground's big trainings |

The fit of rules 1.49 moved the dials in `survival-steps-9-10.md` section 4; read its before-and-after tables before
moving one again. Spec first (a rules revision), then the data, then `python3 tools/validate.py data`, then the guard.

**How to measure a change:** `packages/engine/test/balance/survival-run.ts` plays whole runs through the reducer
(section 2 of `survival-steps-9-10.md` says exactly what its players do). Run the cells you care about:

```
cd packages/engine
SURVIVAL_SIM=1 SIM_CELLS=four:gear,solo_gunner:gear SIM_SEEDS=6 SIM_MAX_STAGES=5 SIM_OUT=/tmp/runs.json \
  npx vitest run test/balance/survival-run.test.ts -t measure
SIM_REPORT=/tmp/runs.json npx vitest run test/balance/survival-run.test.ts -t tables   # prints the tables
```

Parties: `solo_gunner`, `solo_sigil`, `duo` (gunner and healer), `four` (gunner, Faith rifle, Sigil caster, healer),
`four_casters` (Sigil, Outburst, Rigger, healer). Routes: `gear`, `training`, `safest`. A four-character run to stage 5
takes about a minute; split the cells over four processes. The guard (`npm run check`) plays three solo runs and holds
generous bands; widen them only with the measured reason.

## 4. What the roguelike reuses

- **The node map as a dungeon:** a node is `{id, depth, col, kind, setting, links, room: null}`; a designed room goes
  in `room`, and the encounter generator takes a room's slots in place of a template's.
- **The encounter generator** (`composeEncounter`, the budget in SE, the lag and the stage term, templates, the share).
- **The world as tiles:** `g.run.world` is a row of tiles (a setting and a boon pool each), the first shape of the
  roguelike's world map; points of interest and dungeons attach to tiles.
- **Boons are relic items** (`c.relics`, `addItems('relic', …)`), the same thing meta-progression unlocks will be; the
  stats `run_ammo` and `run_credits` answer any economy unlock.
- **The faces** (`faces` data: name, role, portrait, fallback, backdrop, bias, prices, lines) are the first NPCs.
- **Credits, prices, the shop, the Forge, gives** (`credits.ts`, `priceOf`, `run/shop.ts`, `run/progress.ts`,
  `give.ts`: a two-sided trade later is a confirm behind `giveProblem`).
- **The fight tally and Report a run**, the layout generator's stamps (the designed rooms' legend), the kits.
- **The run simulator** (`test/balance/survival-run.ts`) measures any run-shaped mode: give it the mode's actions.
