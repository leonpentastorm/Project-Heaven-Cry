# Engine review 2: performance

12 Nov 2026. Read-only review of `packages/engine` (and, briefly, the combat screen and the test suite), measured on
`develop` at `10656a2`. Nothing in the repo was changed except this file. Six of the fixes below were prototyped on a
copy of the engine in the scratchpad and measured there; the copy passes the whole engine suite.

## 0. The short version

1. **The engine is about 3.7 times slower than it needs to be, and one line is half of it.** `apply()` ends every
   fight action by calling `noteSighted`, which calls `visibility()`: 676 tiles × every pair of eyes × a line of
   sight, and every line of sight rebuilds the set of walls first. It only wants to know which hostiles are seen,
   which `seenIds` already answers without walking the map. That one call is **53% of a player's shot, 42% of a move
   and 38% of an enemy phase.**
2. **The known lead (Answers asked on every hook) is real but second:** `dispatch` is 10 to 13% of an action today,
   22% once the sight scan is gone.
3. Six small changes (about 90 lines in all) were prototyped. Together, measured:

   | Workload (26 × 26 ground with cover, level 9 squad of 4) | Now | With the six | Gain |
   | --- | --- | --- | --- |
   | One player shot (4 v 6) | 6.4 ms | 1.7 ms | 3.7× |
   | One player move (4 v 6) | 6.7 ms | 1.8 ms | 3.7× |
   | One End turn that runs 7 enemy turns (4 v 10) | 74 to 80 ms | 28 to 34 ms | 2.5× |
   | Six simulator fights end to end (policies included) | 6.6 to 7.1 s | 2.7 to 2.8 s | 2.5× |
   | 50 fights in one room (2,156 actions) | 23 to 25 s in `apply` | 7.7 to 9.8 s | 2.5 to 3× |
   | A trivial action on a long-campaign state (3.1 MB with a 6,000-line archive) | 8.4 ms | 2.0 ms | 4.2× |
   | Engine test suite, sum of file times (shared machine, see 1.3) | 325 to 389 s | 91 to 163 s | 2 to 4× |

   The prototype produces **byte-identical final states for 12 whole seeded fights** (every log line, effect, HP,
   position and the RNG state) and **passes all 3,385 engine tests** (3,361 passed, 24 skipped, 0 failed: the same
   as the untouched engine).
4. **The golden tables do not protect any of this.** They hold damage numbers with the enemy AI switched off and
   never walk a path or ask who sees whom. A whole-fight replay hash is needed before the first change lands
   (section 7).
5. **"The event log is the save" is not what is built.** The save is the whole state, written whole on every action.
   That is the right call (replaying 50 fights costs 23 s today), but it means state size is the thing a long run
   pays for on every click, and the state grows (section 8).
6. After the six fixes the **JSON deep copy is the largest single cost of a player action** (about 0.75 ms of 1.7).
   That is the next decision, and it is the only one here with real risk (fix 12).

## 1. How this was measured

1. **Machine:** 4 cores, Node 22.23, Linux. The machine was shared with other agents' test runs (load average 6 to 12
   for part of the session), so every figure was taken at least twice; where a range is given it is the range seen.
   Treat single figures as ±15%.
2. **Scripts** (not in the repo): everything is in
   `/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/prof/`:
   `lib.ts` (a room, a squad, a driver that plays a fight with the simulator's own policies through `apply`),
   `main.ts` (the workloads), `summ.mjs` (reads a `.cpuprofile`, prints self and inclusive time by function),
   `run.sh`, `cmp.sh`. They are bundled with esbuild and run under `node --cpu-prof` (200 µs sampling). The client
   benchmark is `…/scratchpad/web/bench.test.ts` (vitest + jsdom, the harness of `combat-screen.test.ts`). The
   prototype engine is `…/scratchpad/perfproto/`.
3. **Test-suite times** are the vitest JSON reporter's per-file durations. They are wall time inside the workers, so
   they stretch under load: the untouched engine summed to 389 s and 325 s in two runs, the prototype to 91 s and
   163 s. CPU time for the whole run: 232 s against 164 s.
4. **Workloads.** The squad is the simulator's four reference builds at level 9 (optimised gun, optimised blade,
   plain gun, plain blade) on `sim_cover` (the real open ground, 26 × 26, 20 solid tiles, 44 objects), played by the
   simulator's policies; enemies by the engine's AI.
   - (a) one action, repeated from the same state (the reducer is pure, so this is exact): an Aimed Shot and a
     7-tile move in round 2 or later of a 4 v 6 fight.
   - (b) one `combat/end-turn` that runs 7 enemy turns in a 4 v 10 fight. A story fight takes at most 7 listed
     enemies (`startStoryFight`: `enemies.slice(0, 7)`), so 3 more were added to the open fight with
     `unitFromEnemy`.
   - (c) six whole simulator fights (4 v 6 and 4 v 10 alternating).
   - (d) `player/online` (does nothing) on the state left by 50 fights, and on the same state with a 400-line story
     log and a 6,000-line archive.
   - (e) 50 fights in one room, the squad healed and rearmed between fights by the script (a stand-in for rests and
     shops); everything else accumulates as the engine leaves it.

## 2. What reading the code found

### 2.1 `apply` and the state

1. `apply` (`game.ts:455`) is `JSON.parse(JSON.stringify(state))`, then seven `migrateCharacter*` calls per
   character, `reduce`, `worldAfter`, `masterySync` per character, `noteSighted`, `sightFx`. The migrations and
   `masterySync` cost nothing measurable (under 0.2% of an action).
2. **A fight state is about 95 KB of JSON** (4 v 10, round 3): `combat` 40 KB (units 18 KB: a PC unit is 2.1 to
   2.4 KB, an enemy 1.0 to 1.3 KB; log 6 KB; fx 7 KB; objects 6 KB), **`campaign` 38 KB** (zones 22 KB, missions
   6 KB), `story` 9 KB (objects 8 KB), `characters` 7 KB.
3. **The copy costs 0.7 to 0.9 ms at that size** (`structuredClone` is no faster: 0.66 ms). It is 12% of a shot
   today and about 45% of one after the other fixes.
4. **40% of what is copied is the campaign file, which a fight never writes.** Worse, `mapFor` keeps its zone maps
   in a `WeakMap` keyed on the campaign object (`game.ts:2032`), and because every action makes a new campaign
   object, **that cache never survives an action.**
5. `g.archive` (every story line past the 400th, kept for good) is part of the state and is copied on every action.
6. A finished fight stays in `g.combat` (`finishCombat`: `g.combat = { ...cb }`), log, units, objects and all, and
   is copied by every story action until the next fight.
7. There are 40 other `JSON.parse(JSON.stringify(…))` sites in `src`. None is in a per-action path except
   `worldAct`'s dry run (`game.ts:2599`, a whole `Combat` copied to test an area-map action) and
   `g.story.objects = clone(cb.objects)` at the end of each fight. `perks/f.ts:514` copies the whole game for one
   perk's preview.

### 2.2 The hook bus

1. `emit` (`effects/hooks.ts`) walks every unit, builds a string key for what the unit holds
   (`heldKey` = `JSON.stringify` of perks, traits, class, rank, skills) and looks the handlers up in a cache by that
   key. The cache is right; the key is rebuilt on every emit for every unit (2 to 5% of an action).
2. `dispatch` (`physical/core.ts:33`) runs once for each hook name any technique listens on. For every living unit
   it loops over **every registered technique handler**, and for each one with a `react` on this hook calls
   `hasUsable` twice (main hand, off hand). `hasUsable` is `usable(…).some(…)`, and `usable` walks all techniques
   and makes a `statQuery` for each perk-gated one. So one hook costs units × Answers × 2 full technique scans.
3. `statQuery` and `checkQuery` walk every held item and call `ownerOf` for every effect on every query. Measured:
   1 to 4% of an action. Not worth touching yet.
4. One attack fires about a dozen hooks (`attack_preview`, `attack_roll`, `damage_out`, `damage_in` in phases,
   `on_hit`, …). `emit` as a whole is 14% of a shot and 34% of an enemy phase.

### 2.3 Sight, paths, cover

1. `lineOfSight` without a `blockers` argument calls `sightBlockers(cb)`, which builds a new `Set` from
   `map.solid`, every sight-blocking object and the veil tiles. Measured on the test ground: **2.0 µs to build the
   set, 0.5 µs to walk the line**. Only the enemy's `enemyCloseTile` and `enemyHuntTile` pass the set in.
2. `visibility()` calls that for every tile and every pair of eyes: 4.0 ms a call. `apply` calls it after every
   fight action (`noteSighted`), and `runEnemies` calls it after every enemy turn.
3. `xy()` is `k.split(',').map(Number)`. It is **11% of self time** across the fight workloads (two arrays and two
   `Number` calls per tile key).
4. `paths()` is Dijkstra over string keys with a linear scan of the open list at each step and a `splice`:
   **1.7 to 1.8 ms a call** on 26 × 26. A player move calls it once (`movePaths`), an enemy that moves once or
   twice, the Marksman's Duck and Roll once per incoming shot, the combat screen once per render.
5. `coverTileFor` (inside every `previewAttack`) builds `coverOf(cb)`, a dictionary of every cover object, then
   `Object.entries(…).filter(…).map(…)`, to look at the tiles next to one target: 5 to 10% of an enemy phase.
6. `standable` and several world functions use `map.solid.includes(k)` (an array scan). Not in any profile's top 30.

### 2.4 The enemy AI

1. `enemyTurn` loops up to 6 steps; each step may call `aiSigilStep`, `aiSoulStep`, the Physical 2.0 planner
   (`aiTechnique`: `usable` for both hands, then `aiScore` and `previewTechnique` for each technique × each target),
   `enemyRank` (`previewAttack` per target), `enemyHuntTile` and `enemyCloseTile` (`paths`, then a score per
   reachable tile; this one is already careful: walls once, no preview per tile).
2. `previewAttack` itself is cheap (6 to 16 µs). The cost is how often it is asked and what each one drags along
   (an `attack_preview` emit, `sideSees`, `coverTileFor`): 13% of an enemy phase today, 30% after the fixes.
3. `duckTile` (`classes/rev3.ts:245`, Duck and Roll): for **every ranged attack at a Marksman** it calls `paths()`
   for the whole map to find the 8 tiles next to it, then `previewAttack` for each. 14% of the enemy phase measured.
   Three of the simulator's four reference builds are Marksmen, so this share is higher here than in a mixed squad.

### 2.5 Data lookups, regexes, logs

1. Data is indexed where it matters (`WEAPON`, `PERK`, `ITEM`, `ENEMY`, `SIGIL`, `TECHNIQUE` are maps). The
   exceptions (`TRAITS.find` in `isMusicTrait` and `migrateCharacterItems`, `ENEMY_LEVELS.table.find`, `classMove`'s
   triple loop behind a cache) do not show in any profile.
2. There are 549 `.find(` / `.findIndex(` calls in `src`, most of them `cb.units.find((x) => x.id === id)`. With 11
   to 46 units this is not measurable. It would be at several hundred units; nothing else in the engine would
   survive that count either.
3. No regex is built in a hot path (`memory.ts` has the only `new RegExp`). `isMelee` tests a literal regex per
   call; it is not in any top 30.
4. `cb.fx` is trimmed to 40 between actions (`trimFx`). `cb.log` is never trimmed during a fight (299 lines, 9 to
   13 KB, after a 10-round 4 v 10). `story.entries` is capped at 400 and overflows into `g.archive`, which is
   never trimmed (by design: it is the Narrator's recall).

### 2.6 Saves and replay

1. `docs/design/tech-plan.md` says the event log is the save. **It is not.** The host keeps one `GameState`. After
   every action `store.ts` runs `apply`, `viewFor`, then `persist()` (the whole state, minus the archive,
   `JSON.stringify`'d into `localStorage`, synchronously), then `broadcast()` (a `viewFor` and a stringify per
   guest, and the whole state to the room server at most every 1.5 s). IndexedDB gets the full state 400 ms after
   the last action.
2. So there is no replay to grow. What grows is the state, and every action pays for it three or four times: the
   copy in `apply`, the `localStorage` write, one view per guest.
3. For the record, what an event log would cost: the 50-fight run is 2,156 actions and 194 KB of actions; replaying
   it takes 23 to 25 s (7.7 to 9.8 s with the fixes). Snapshots are the right choice; keep them.

## 3. The profiles

Self time is time in the function's own code; total includes what it calls. `apply`'s self time is the JSON copy
(V8 charges `JSON.parse` and `JSON.stringify` to the caller). Wrappers (`reduce`, `combatAction`, `withVia`,
anonymous closures) are left out of the total lists.

### 3.1 (a) One player shot, 4 v 6: 6.4 ms

| Self | | Total | |
| --- | --- | --- | --- |
| `sightBlockers` | 18.0% | `noteSighted` | 53.4% |
| `apply` (the copy) | 13.2% | `visibility` | 52.5% |
| `xy` | 11.6% | `unitSees` | 50.9% |
| `lineOfSight` | 8.8% | `lineOfSight` | 42.0% |
| garbage collector | 7.2% | `sightBlockers` | 25.8% |
| `blocksSight` | 5.5% | `useTechnique` (the shot itself) | 20.7% |
| `dispatch` | 4.5% | `resolveAttackInner` | 14.4% |
| `unitSees` | 2.8% | `emit` | 14.0% |
| `visibility` | 2.2% | `xy` | 11.6% |
| `hasUsable` | 2.2% | `dispatch` | 10.0% |
| `key` | 2.1% | `applyDamage` | 9.7% |
| `kindOf` | 2.0% | `dist` | 6.1% |
| `usable` | 2.0% | `hasUsable` | 6.0% |
| `heldKey` | 1.5% | `previewAttack` | 4.4% |
| `emit` | 0.9% | `usable` | 3.8% |

The rule being resolved (`useTechnique` and everything under it) is a fifth of the action.

### 3.2 (a) One player move, 4 v 6: 6.7 ms

| Self | | Total | |
| --- | --- | --- | --- |
| `sightBlockers` | 13.9% | `noteSighted` | 42.1% |
| `paths` | 13.0% | `visibility` | 41.2% |
| `apply` (the copy) | 13.0% | `unitSees` | 40.4% |
| `xy` | 10.9% | `moveUnit` | 36.6% |
| `lineOfSight` | 7.6% | `lineOfSight` | 33.7% |
| `movePaths` | 6.9% | `movePaths` | 26.1% |
| `blocksSight` | 4.1% | `sightBlockers` | 20.0% |
| garbage collector | 3.7% | `paths` | 19.2% |
| `stand` (in `paths`) | 3.3% | `xy` | 10.9% |
| `dispatch` | 3.0% | `emit` | 7.3% |
| `unitSees` | 2.2% | `dispatch` | 5.6% |
| `key` | 2.0% | `dist` | 4.4% |
| `visibility` | 1.8% | `sideSeesUnit` | 2.6% |
| `kindOf` | 1.7% | `hasUsable` | 2.6% |
| `heldKey` | 1.3% | `seenIds` | 2.1% |

### 3.3 (b) One enemy phase, 7 enemy turns, 4 v 10: 74 to 80 ms (about 11 ms an enemy turn)

| Self | | Total | |
| --- | --- | --- | --- |
| `sightBlockers` | 13.4% | `runEnemies` | 86.4% |
| `xy` | 11.0% | `enemyTurn` | 50.9% |
| `paths` | 7.5% | `noteSighted` (once per enemy turn) | 37.9% |
| `dispatch` | 6.7% | `visibility` | 37.1% |
| `lineOfSight` | 6.5% | `emit` | 34.0% |
| `blocksSight` | 4.2% | `resolveAttackInner` | 31.7% |
| garbage collector | 3.6% | `lineOfSight` | 31.2% |
| `duckTile` | 3.5% | `sightBlockers` | 19.5% |
| `heldKey` | 3.2% | `duckTile` | 14.4% |
| `hasUsable` | 2.7% | `previewAttack` | 13.3% |
| `usable` | 2.4% | `dispatch` | 12.9% |
| `unitSees` | 2.2% | `paths` | 10.7% |
| `coverKeys` | 1.9% | `aiTechnique` | 10.6% |
| `stand` (in `paths`) | 1.9% | `applyDamage` | 8.1% |
| `kindOf` | 1.7% | `hasUsable` | 6.4% |

Scaling with the number of enemies (first 3 rounds, warm): 7 enemies 14.9 ms an enemy turn, 14: 15.7, 21: 15.3,
28: 16.7, 42: 18.9. It is flat because the cost is the map, not the units: 676 tiles are scanned whoever is on them.
With the fixes: 4.7, 4.7, 5.6, 5.5, 6.6 ms.

### 3.4 (c) Six simulator fights end to end: 6.6 to 7.1 s (423 actions, 13 to 14 ms each, cold code included)

| Self | | Total | |
| --- | --- | --- | --- |
| `sightBlockers` | 15.2% | `apply` | 78.6% |
| `xy` | 11.2% | `noteSighted` | 35.3% |
| `paths` | 8.5% | `visibility` | 34.6% |
| `apply` (the copy) | 8.3% | `runEnemies` | 33.5% |
| `lineOfSight` | 5.8% | `lineOfSight` | 30.7% |
| garbage collector | 5.0% | `enemyTurn` | 22.2% |
| `blocksSight` | 3.3% | `sightBlockers` | 19.9% |
| `dispatch` | 3.2% | `emit` | 18.7% |
| `heldKey` | 2.1% | `resolveAttackInner` | 15.0% |
| `stand` (in `paths`) | 2.0% | `paths` | 12.4% |
| `unitSees` | 1.6% | the policies (`optimised` + `plain`) | 13.7% |
| `hasUsable` | 1.5% | `previewAttack` | 9.3% |
| `key` | 1.5% | `previewTechnique` | 8.5% |
| `duckTile` | 1.4% | `dispatch` | 6.5% |
| `usable` | 1.4% | story set-up (`narratorTurn`) | 3.3% |

The simulator's own policies are 14% (1.0 s of 7); the engine is the rest. A measurement run that takes 35 minutes
is about 30 minutes of the costs in this table.

### 3.5 (d) A trivial action on a late state

| State | Bytes | `apply` | JSON copy alone |
| --- | --- | --- | --- |
| A fresh fight | 95 KB | 0.9 ms | 0.8 ms |
| After 50 fights | 291 KB | 2.0 ms | 1.9 ms |
| The same with a 400-line log and a 6,000-line archive | 3.1 MB | 8.4 ms | 8.6 ms |

The profile is one line: `apply` self 81.5% (the copy), garbage collector 4.4%, everything else under 1%. **A
trivial action costs exactly what the copy costs.** `JSON.stringify` alone (what `persist` and each guest's view
pay again) is 0.3 ms, 0.95 ms and 5.1 ms on the three states.

### 3.6 (e) 50 fights in one room

| After fight | State | `combat` | `story` | `memory` | Trivial `apply` |
| --- | --- | --- | --- | --- | --- |
| 1 | 114 KB | 46 KB | 20 KB | 1 KB | 0.9 ms |
| 10 | 199 KB | 80 KB | 68 KB | 4 KB | 1.6 ms |
| 25 | 244 KB | 91 KB | 97 KB | 8 KB | 1.6 ms |
| 50 | 291 KB | 96 KB | 131 KB | 15 KB | 2.0 ms |

Where the 291 KB is: `story.objects` 62 KB **and the same 62 KB again in `combat.objects`** (52 objects: the piles
on the one map grew to about 1.2 KB each with dropped magazines and loot, and the fight copies the story's objects
in and back out); `story.entries` 61 KB (the 400-line cap, reached at fight 50); `campaign` 38 KB; the finished
fight's units and log 25 KB; `memory` 15 KB (about 275 bytes a fight, never trimmed); `zoneObjects` 8 KB.

## 4. The client's hot path

`CombatLogic.renderVals()` on the 26 × 26 with 11 units (the story cap): **19 to 23 ms a call**, whatever the
action or hover. Each call returns 729 tile objects. A full React re-render of the screen in jsdom is 129 ms for
1,586 DOM nodes (jsdom is not a browser; read it as "the template pass costs several times `renderVals`").

Where a `renderVals` goes (200 calls profiled):

| | Share of `renderVals` |
| --- | --- |
| Its own code (the tile loop and the value objects) | 39% |
| `visibility(cb, 'pc')` (4.0 to 4.8 ms) | 22% |
| `weaponBlocks` (`techView.ts`): the technique pad. `packPad` → `stowedWield` → `asDrawn` → `unitFromCharacter`: **a whole Unit is rebuilt from the character for each stowed weapon, every render** | 20% |
| `actionGroups` (`commands.ts`: skill roll modifiers through `statQuery`) | 14% |
| `paths()` | 5% |

Every hover, every effect tick and every state change re-runs all of it. `viewFor` is not a cost (0.05 to 0.1 ms).

## 5. The test suite

3,385 tests in 160 files. Sum of file times 325 to 389 s on the shared machine; half the files take under 1 s.

| File | Time | Why |
| --- | --- | --- |
| `balance/balance-sim.test.ts` | 36 to 50 s | "quick run: every table builds" plays whole simulator fights (28 s); "plays every way to fight" 10 s |
| `balance/step1-fit.test.ts` | 24 to 36 s | "quick run: every measurement of the fit builds", one fight each (34 s) |
| `balance/defence-measure.test.ts` | 20 to 24 s | whole fights, 4 to 10 a cell |
| `balance/faith-measure.test.ts` | 18 to 23 s | whole fights |
| `balance/magic-measure.test.ts` | 13 to 16 s | whole fights |
| `perk-audit.test.ts` | 11 to 16 s | one test: every perk and trait through a fight |
| `engine.test.ts` | 10 to 14 s | two whole-game tests (6 s and 4 s) |
| the six `golden-damage*` files | 38 to 49 s together | 5,327 fixed actions, each a fresh fight through `apply` |
| `phys-ranged-ai.test.ts` | 6 to 10 s | whole enemy turns per weapon |

1. **The seven `balance/*.test.ts` files are 127 to 164 s, about 40% of the suite**, and they are the simulator
   run as a smoke test inside the unit suite. They are slow for the reasons in section 3.4, not for reasons of
   their own.
2. Per-file set-up is negligible (3 s over 160 files). The time is in test bodies, which is engine time.
3. With the prototype the same files: `balance-sim` 9.4 s, `step1-fit` 5.4 s, `defence-measure` 6.4 s,
   `faith-measure` 3.9 s, `magic-measure` 2.3 s, `perk-audit` 4.7 s, golden 13 s together.
4. Unrelated, seen in `.check/engine-tests.log` from 02:36: `defence-measure` "the healer takes more fire…" failed
   an inequality on 4 fights a cell (52.7 against 56). It passed in all five of my runs; a statistical assertion on
   4 fights will flip when anything upstream moves a die. Worth a look by whoever owns it.

## 6. What was prototyped, and what each change bought

All on a copy; each step was checked against the 12 whole-fight hashes before the next. Figures are single runs in
sequence on the shared machine, so read the steps as approximate; the first and last columns were re-measured three
times each, alternating.

| Step | Shot | Move | Enemy phase |
| --- | --- | --- | --- |
| Now | 6.4 ms | 6.7 ms | 74 to 80 ms |
| 1. `noteSighted` asks `seenIds`, not `visibility` (1 line) | 3.2 | 4.6 | 54 |
| 2. walls built once per sight query; `xy` without `split` (6 lines) | 3.1 to 3.5 | 4.1 to 4.3 | 54 |
| 3. Answers listed per hook; `usable` once per unit (12 lines) | 3.0 | 4.0 | 43 |
| 4 + 5. `heldKey` by concatenation (6 lines); `paths` on number arrays with a heap, same order (40 lines) | 2.1 | 1.7 to 2.0 | 28 to 33 |
| 6. `apply` shares the campaign and the archive (5 lines) | **1.7** | **1.8** | **28 to 34** |

Single queries, before and after: `paths()` 1.7 to 1.8 ms → 0.31 to 0.44 ms; `visibility()` 3.8 to 4.2 ms → 0.8 to
1.0 ms; a line of sight with the walls given 0.5 µs against 2.5 µs without.

After the six, a shot is: the JSON copy 36%, `emit` 22% (of which `dispatch` 12%), `previewAttack` 11%, garbage
collection 9%. An enemy phase is: `emit` 39%, `previewAttack` 30%, `aiTechnique` 25%, `duckTile` 13%,
`buildIndex` 10%, `coverKeys` 9%, `paths` 9% (these overlap).

## 7. Recommendations, ranked

Ranked by (speed-up × how often it is hit) ÷ (size × risk). "Measured" means measured on the prototype;
"estimate" means read off a profile.

### The table

| # | Fix | Size | Gain | Risk |
| --- | --- | --- | --- | --- |
| 1 | `noteSighted` uses `seenIds` | 1 line | **Measured: shot −50%, move −33%, enemy phase −30%** | None |
| 2 | `apply` shares `campaign` and `archive` instead of copying them | 5 lines + 2 copy-on-write sites | Measured: shot −19% (0.4 ms); trivial action on a long campaign 8.4 → 2.0 ms; the zone-map cache starts working | Low (aliasing; a freeze test catches it) |
| 3 | `paths()` on number arrays with an indexed heap, same visiting order | 40 lines | Measured: 1.8 → 0.3 to 0.4 ms a call; move −45% after fix 1 | Low to medium (tie order; proved below) |
| 4 | `dispatch`: Answers indexed by hook, `usable` once per unit | 12 lines | Measured: enemy phase −20%, shot −5% | Low |
| 5 | Walls once per sight query; `xy` without `split`; `heldKey` without `JSON.stringify` | 12 lines | Measured: `visibility` 4× (worth about −17% of a client render, computed from that); 3 to 5% of an enemy phase each | None |
| 6 | Move the simulator smoke fights out of the default unit run | test config | Measured: 127 to 164 s of 325 to 389 s (about 40%) | None |
| 7 | `duckTile` looks at the 8 neighbours, not the whole map; `coverTileFor` without building `coverOf` | 25 lines | Estimate: enemy phase −10 to −15% (measured share after the six: 13% + 9%) | Low |
| 8 | Combat screen: memoise `visibility`, `paths` and the weapon pad per state version | client, 30 lines | Estimate: render values 20 → about 9 ms (measured shares: 22% + 5% + 20% + part of 14%) | Low |
| 9 | State diet: piles, the finished fight, `persist` debounced | 30 lines | Measured sizes: −62 KB duplicate objects and −25 KB dead fight of 291 KB after 50 fights; one stringify less per action | Low to medium (save shape) |
| 10 | Branch-level sharing in `apply` (copy only what the action's family can write) | 60 to 100 lines | Estimate: story and trivial actions about 5× (2 to 8 ms → under 0.5 ms); fight actions about −5% | **High** (aliasing across the whole reducer) |

### 1. `noteSighted` uses `seenIds`

1. **Change.** `combat.ts:901`: `const seen = seenIds(cb, 'pc')` and `seen.filter(…)` in place of
   `visibility(cb, 'pc').seen` and `[...seen].filter(…)`.
2. **Why it is the same answer.** `sideSeesUnit` documents itself as "the same answer as
   `visibility(cb, side).seen.has(t.id)`": both take `!t.hidden`, any living eye with `unitSees(t.pos)`, then the
   `sees` hook with the same arguments. Both walk `cb.units` in order, so `cb.sighted` keeps its order.
3. **Determinism and saves.** No dice, no state shape. `cb.sighted` is identical.
4. **Proof.** The whole-fight hashes; `fight-music` and `sight` tests. Do this one today.

### 2. `apply` shares the campaign and the archive

1. **Change.** Copy the state without `campaign` and `archive`; set `g.campaign = state.campaign` and
   `g.archive = state.archive.slice()` (a new list of the same lines: the engine only pushes to it and slices it).
2. **What must change with it.** Two places write into the campaign in place and must copy first:
   `placeBoardNpc` (`missions.ts:239`, at session start) and `sbWorldPlay` (`game.ts:4052`, the Proving Ground's
   drill mission). Found by freezing the shared campaign and running the suite: 14 failures, these 2 in the engine,
   the other 12 are tests that poke `g.campaign` directly between actions (they need a one-line copy).
   `campaign/load`, `campaign/refresh` and the sandbox's entry replace the object, which is fine.
3. **Gain.** Measured above. It also makes `mapFor`'s `WeakMap` hit across actions, and it means a roguelike's run
   definition (which will be bigger than 38 KB) costs nothing per action.
4. **Determinism and saves.** None: the saved JSON is the same. Key order in the object is kept.
5. **Proof.** Keep the freeze as a test-only switch: in the engine suite `apply` deep-freezes the campaign it
   shares, so any in-place write throws at the line that does it. Plus the hashes.

### 3. `paths()` with a heap

1. **Change.** The search runs on `Uint8Array` flags (solid, occupied, difficult, avoid), a `Float64Array` of
   distances and an indexed binary heap; the result is converted back to the same `{dist, prev}` records.
2. **What could break.** Tie order. Callers iterate `Object.entries(P.dist)` and take the first best
   (`enemyCloseTile`), and equal-cost routes differ in which tiles they cross (hazards, Overwatch, opportunity
   attacks). The current loop takes "the smallest distance, the earliest found among equals", reading each tile's
   distance at the moment of choosing. The prototype reproduces that exactly: the heap orders by (distance now, the
   tile's first push), a lowered distance moves the tile up without changing its push number, and `dist` and `prev`
   are written out in first-found order so key order is the same. Later duplicates in the old open list were
   no-ops (a re-expansion can improve nothing), so dropping them changes nothing.
3. **Proof.** The hashes (several hundred moves and enemy walks in them); the full suite; and one new property
   test: for a few hundred random grids, units and `avoid` sets, the new `paths` equals the old one **including
   `Object.keys` order** (keep the old function in the test file as the oracle).
4. **Then** give `duckTile` and the client the same benefit for free.

### 4. `dispatch`

1. **Change.** `answersOn(hook)`: the Answers with a `react` for this hook, in `HANDLERS` order, cached and
   cleared when `technique()` registers. Per unit, the two usable sets (main, off) are built once, and again only
   after a reaction's handler has run (it may have changed what the unit holds). A dead unit stops its loop.
2. **What could break.** Order of reactions (kept: same unit order, same handler order) and a reaction that makes
   a later Answer usable or unusable for the same unit on the same hook (kept: the sets are rebuilt after every
   handler call).
3. **Further, not prototyped.** Skip a unit outright when it has no Watch and none of its usable techniques is an
   Answer; cache the usable sets on the unit for the length of one action with an invalidation on weapon swap,
   condition change and `phys/*` actions. Estimate: `dispatch` from 12% to under 3% of an action. Do it only with
   the replay hash in place.
4. **Proof.** Hashes; `phys-*` and `answers` tests; the golden `techniques` table (it does cover Answers that fire).

### 5. Three safe micro-fixes

1. `unitSees`, `sideSeesUnit`, `sideSees` and `visibility` build `sightBlockers(cb)` once and pass it down
   (`lineOfSight` already takes it). No cache, so nothing to invalidate.
2. `xy`: `const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]`.
3. `heldKey`: build the string by concatenation. It is only ever a cache key.
4. **Proof.** Hashes and the suite. No behaviour to change.

### 6. The simulator smoke fights

1. **Change.** Give `test/balance/*.test.ts` their own vitest project (or an `include` that leaves them out of
   `npm test -w @phc/engine`), run by `npm run check -- balance` and before a merge. Keep one 5-second smoke test
   in the default run that plays one fight per policy so a refusal still fails fast.
2. **Gain.** About 40% of the unit suite's time today; less after fixes 1 to 5 (they fall from about 150 s to
   about 30 s summed), so decide after those land.
3. **Risk.** A balance regression is seen one step later. That is what the step is for.

### 7. `duckTile` and `coverTileFor`

1. `duckTile`: replace `paths(cb, me.pos, me.id)` filtered to distance 1 with a one-step neighbour function that
   applies the same rules (blocked, occupied, the diagonal squeeze, difficult ground costing 2 so not a 1-tile
   step, `path_opts`), in the same sorted key order.
2. `coverTileFor`: walk `objectsOf(cb)` once, keep half cover next to the target and nearer the attacker; no
   dictionary. The dictionary's order is first-insertion by tile, so the walk must return the first object on the
   first such tile to match.
3. **Proof.** Hashes; `classes-rev3-moves` (Duck and Roll); the golden tables do cover the cover term.

### 8. The combat screen

1. Memoise on `(game.v, cur.id)`: `visibility`, `paths`, the `weaponBlocks` pad and `actionGroups`. Hover and
   effect ticks then reuse them. A hover should not rebuild 729 tiles either: keep the tile list per state version
   and patch the hovered route.
2. `asDrawn` builds a full `Unit` per stowed weapon to price a technique card; cache it per `(character, weapon)`
   and state version.
3. **Proof.** `combat-screen.test.ts` and the browser suites; add an assertion that two renders with the same
   state and a different hover call `visibility` once.

### 9. State diet

1. **Piles.** `cb.objects` is a deep copy of `story.objects` for the length of the fight, and after the fight
   both are kept. Drop `combat.objects` from the finished fight (the story holds them), and cap what one pile
   keeps of spent magazines (a rule for the spec: say so there first).
2. **The finished fight.** After `finishCombat`, keep `summary`, `over`, `name`, `round` and what the screens show
   on the "back to the story" card; drop units' technique state, `fx`, `sightSeen`, `objects`.
3. **`persist()`.** `localStorage` gets the whole state synchronously on every action; debounce it (the IndexedDB
   write already is) or write on idle. Measured stringify: 0.3 ms at 95 KB, 0.95 ms at 291 KB.
4. **Saves.** Old saves load unchanged (the fields are simply present); new saves are smaller. A screen that reads
   a dropped field of a finished fight would break: check `combat.js`'s end-of-fight card first.

### 10. Sharing more of the state in `apply`

1. **Where it stands.** After 1 to 5 the copy is the top cost of a player action and the whole cost of a story
   action. `structuredClone` does not help.
2. **Do not** reach for a proxy-based draft (Immer): every read in the reducer would go through a proxy and the
   hot loops above would get slower.
3. **Do** branch-level sharing, decided by the action's family: a `combat/*` action copies `combat`, `characters`,
   `rng`, `story.ps`/`magic` and the scalar fields, and shares `story.entries` as a new array of the same entries
   and everything else by reference; a story action shares a finished `combat`. Each shared branch needs the rule
   "replace, never write in place", enforced by the freeze test of fix 2 extended to every shared branch.
4. **Gain (estimate).** The fight copy falls from about 57 KB to about 48 KB only (units, log, fx and objects are
   the bulk and they are written), so a shot gains perhaps 0.1 ms; **the real gain is story actions and long
   states** (2 to 8 ms → under 0.5 ms). To cut the fight copy itself the units would have to be copied on write
   one by one, which touches every handler. Not now.
5. **Risk.** High: one handler that writes into a shared branch corrupts the previous state, which the store
   keeps for rerolls and React keeps for rendering. Only with the freeze test on in the whole suite, and after
   everything above.

### Not worth doing now

1. Replacing `cb.units.find` with a map: not measurable under 50 units.
2. Caching derived stats (`maxHp`, `defense`, `fx(c, …)`) on the unit: they are read when a unit is built, not per
   hook; `statQuery` is 1 to 4%.
3. A spatial index for visibility: after fixes 1 and 5 `visibility` is called by the client only, and costs 0.8 ms.
4. Capping `cb.log`: 13 KB after ten rounds. Leave it.

## 8. The test that proves nothing changed

1. **The golden tables are not enough.** By their own header: attack dice are forced, "the enemy AI never acts",
   every action is a fixed attacker on a fixed target. They do not exercise `paths`, `visibility`, `sightFx`,
   `noteSighted`, `enemyTurn`, target choice, reaction order across units, or the order of effects and log lines.
   Fixes 1, 3, 4 and 7 could all be wrong with every golden line green.
2. **Add a whole-fight replay hash** (`test/replay-hash.test.ts` and `test/golden/replays.json`, recorded on purpose
   like the tables): 12 to 20 seeded fights played by the simulator's policies through `apply`, mixed sizes (3, 6,
   7, 10, 14 enemies), both grounds, a Sigil and a Soul caster on each side, a Marksman (Duck and Roll), a fight
   with hazards and a door. Pin, per fight, a SHA-256 of the final state's JSON, and of the state every 25 actions
   so a diff points at the action that moved. The scratchpad's `hash` mode is this test without the pin (12
   fights, 737 actions, 3 to 9 s).
3. **What it catches that nothing else does:** a path tie broken differently, a reaction fired in another order,
   an effect emitted earlier or later (the stream is in the state), one extra RNG draw.
4. **What it will not catch:** area-map (story) actions, the Proving Ground, co-op views. Add one scripted story
   scene and one `viewFor` hash per side to the same file.
5. **Old saves.** None of fixes 1 to 8 changes a field. Fix 9 removes fields from new saves only. Keep one saved
   state from today in `test/fixtures/` and assert it loads and plays a turn (the `old-save` browser suite does
   this for the client; the engine has no such test).

## 9. What a roguelike run needs that the engine cannot do cheaply today

Facts, not design.

1. **Enemy counts are capped in code.** A story fight takes 7 listed enemies (8 with people already on the map);
   `startCombat` takes `max(foeStart.length, 8)`, which is 12 on the open ground. More than that needs those two
   lines changed and somewhere to stand.
2. **An enemy turn costs 11 to 19 ms today** (4.7 to 6.6 ms with the fixes), nearly flat from 7 to 42 enemies
   because the cost is the 676 tiles. A phase of 30 enemies is 0.5 s of blocked main thread on the host today,
   about 0.17 s with the fixes. It runs inside one `apply`, so the host's tab freezes for that long and guests see
   nothing until it ends.
3. **Every hook visits every unit.** `emit` is linear in units, and with `dispatch` every hook also asks every
   unit for its Answers. 30 relics as held items on 4 characters mean 120 more handler lookups per hook only if
   they are registered as items (indexed by what a unit holds: cheap). A relic written as a global hook (`onHook`)
   runs on every emit of that name for every fight: keep relics as items.
4. **State grows by about 3.6 KB a fight** on one map (114 KB → 291 KB over 50 fights), and each action pays for
   the whole state three times on the host (copy, `localStorage` write, a view per guest). At 291 KB that is about
   2 ms + 1 ms + 1 ms per guest on every click, before any rule runs. A run of several hundred rooms without a
   diet reaches megabytes: 8 ms per trivial action at 3.1 MB.
5. **`localStorage` has a quota (about 5 MB of UTF-16 in most browsers, so about 2.5 MB of JSON).** The slim save
   (state minus archive) is 290 KB after 50 fights. `write()` swallows the quota error, and the IndexedDB copy is
   the fallback, so a long run would silently stop saving to `localStorage`.
6. **There is no replay.** Nothing records actions. A run cannot be re-simulated, verified or shared as a seed
   plus inputs today; if a roguelike wants that (daily seeds, a ghost, a bug report that replays), the action log
   has to be added: 194 KB and 23 s of replay for 50 fights now, about 8 s with the fixes.
7. **The whole enemy phase is one action.** There is no way to run it in slices or off the main thread; the
   reducer is synchronous and the store calls it inline. With the fixes this stops mattering below about 40
   enemies.
8. **The simulator is the balance tool for a roguelike too** (hundreds of fights per relic). At 1.1 s a fight
   today a 2,000-fight sweep is 37 minutes; at 0.45 s it is 15. The remaining 14% in the policies and the cold
   start of each vitest worker are the next things in the way after that.

## 10. Order of work

1. Add the replay-hash test and the old-save fixture (section 8). Record it on the untouched engine.
2. Fixes 1 and 5 (one commit: they cannot change behaviour). Expect the suite to drop by about a third.
3. Fix 4, then fix 3 with its property test, then fix 7. One commit each; the hash must not move.
4. Fix 2 with the freeze switch on in the suite.
5. Fix 6 (decide with the new timings), fix 8, fix 9.
6. Re-profile. Decide on fix 10 with real numbers from a state diet in place.
