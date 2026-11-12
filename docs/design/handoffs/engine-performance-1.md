# Engine performance 1

12 Nov 2026. The work of [engine review 2](../proposals/2026-11-engine-review/2-performance.md), done by the method of
[the foundation plan](../proposals/2026-11-engine-review/PLAN.md): pin, then move. Branch
`worktree-wf_15b947ef-09f-1`, on top of `cb40e92`. Not merged, not pushed, no version bump.

## 0. The short version

1. **The engine is about 3 times faster and plays exactly as before.** One shot 7.0 ms to 2.1 ms, one move 7.3 to
   2.0, an enemy phase of 7 turns 82 to 26, fifty fights in one room 26.7 s to 8.6 s, a click on a long campaign
   9.2 ms to 1.75 ms (section 2).
2. **Nothing in play moved.** A new guard plays 20 whole seeded games with the enemy AI on and compares hashes; it
   was recorded on the untouched engine and is identical after every commit. The 50-fight run of the profiling
   scripts (2,156 actions) ends in a byte-identical state on the old engine and the new (section 3).
3. **No saved shape changed**, so there is no migration. Two saves written by 0.22.0 are now in the suite and must keep
   loading (section 3.4).
4. **Three things from the brief were not done, on purpose** (section 4): dropping the finished fight and its
   duplicate objects from the state (the fight screen draws all of it, and I may not touch or run that screen), and
   the two the brief excluded (fix 8, fix 10).
5. **`npm run check` no longer runs the balance simulator's folder**, only a 10-test smoke line of it. The balance
   targets run with `npm run balance` (section 5). Run that before merging engine work.

## 1. What changed, commit by commit

| Commit | Fix | What |
| --- | --- | --- |
| `21b0574` | step 0 | The replay guard and the old-save fixtures, recorded on the unmodified engine |
| `0dc4869` | 1 | `noteSighted` asks `seenIds` instead of `visibility` (one line, `combat.ts`) |
| `dc59b02` | 2 | `apply` shares `campaign` and the lines of `archive` (`workingCopy`, `game.ts`); `placeBoardNpc` (`missions.ts`) and the drill objective in `sbWorldPlay` (`game.ts`) replace the campaign instead of writing into it; the suite freezes what is shared; twelve tests change a copy |
| `c037782` | 3 | `paths()` on number arrays with an indexed heap, same visiting order, same key order (`combat.ts`); the plain search kept as the oracle in `test/paths-order.test.ts` |
| `00abb67` | 4 | `dispatch`: the Answers of a hook listed once (`answersOn`), what a unit has usable worked out once and again after each of its reactions (`physical/core.ts`) |
| `54dea6f` | 5 | The sight walls built once per sight query (`visibility`, `sideSeesUnit`, `sideSees` pass them to `unitSees`); `xy` without `split`; `heldKey` by concatenation (`effects/collect.ts`) |
| `bff47f9` | 7 | Duck and Roll looks at the 8 tiles round it (`stepsFrom`, `combat.ts`) instead of searching the whole map; `coverTileFor` walks the objects once (the dead `coverKeys` helper is gone) |
| `d56d049` | 9, in part | The host's `localStorage` save is written right after an action, not inside the click (`apps/web/src/game/store.ts`, `persistSoon`) |
| `c7e08c9` | 6 | `test/balance/` leaves the engine's default run; `npm run balance`; a smoke line in `tools/check.py` |

New engine exports: `stepsFrom(cb, from, self)` (the tiles `paths()` puts 1 away, sorted) and `_freezeShared(on)`
(tests). `unitSees` takes an optional fourth argument (the walls). Nothing was renamed or moved between files.

## 2. Measured

1. **How.** The review's own scripts (`lib.ts`, `main.ts`, `summ.mjs`), copied to
   `/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/perf1/`, bundled twice
   with esbuild: `before.mjs` from the engine at `21b0574` (unmodified), `after.mjs` from this branch. Same inputs for
   both (the recorded mid-fight states `out/wl-mid.json`, `out/wl-big.json`).
2. **The clock is CPU time, not wall time.** The machine was shared with other agents' browser suites all session
   (load average 12 to 25 on 4 cores), and wall time stretched 2 to 3 times with it. The scripts' clock was switched
   to `process.cpuUsage()` (`CLOCK=cpu`), which gave the same figure run after run and lands on the review's own
   idle-machine baseline. Runs alternated before, after, before, after. The ranges are the ranges seen.

| Workload (26 × 26 ground with cover, level 9 squad of 4) | Before | After | Gain | The review's prototype |
| --- | --- | --- | --- | --- |
| One player shot (Aimed Shot, 4 v 6) | 7.0 to 7.2 ms | 2.1 to 2.3 ms | 3.3× | 6.4 → 1.7 |
| One player move (7 tiles, 4 v 6) | 7.3 to 7.4 ms | 2.0 ms | 3.6× | 6.7 → 1.8 |
| One End turn that runs 7 enemy turns (4 v 10) | 81 to 83 ms | 25 to 28 ms | 3.1× | 74 to 80 → 28 to 34 |
| Six simulator fights, time in `apply` (423 actions) | 6.0 to 6.2 s | 2.0 to 2.2 s | 2.9× | (6.6 to 7.1 s → 2.7 to 2.8 s whole) |
| Six simulator fights, whole (policies included) | 7.3 to 7.4 s | 3.0 to 3.1 s | 2.4× | 2.5× |
| 50 fights in one room, time in `apply` (2,156 actions) | 26.7 s | 8.6 s | 3.1× | 23 to 25 → 7.7 to 9.8 |
| A trivial action after 50 fights (291 KB) | 2.1 ms | 1.9 ms | 1.1× | |
| A trivial action on a long campaign (3.1 MB: a 400-line log, a 6,000-line archive) | 9.2 ms | 1.75 ms | 5.3× | 8.4 → 2.0 |
| The balance simulator's folder, alone (`npm run balance`) | 201 s summed file time | 30 s wall, 122 s summed | | |
| The engine suite, whole, CPU seconds (user + sys) | 275 s | 205 s with the folder, 173 s as `npm test` now runs it | 1.6× | 232 → 164 |

3. **The engine suite in wall time cannot be measured on this machine today.** Two runs of the same code gave 147 s
   and 277 s as the load moved from 15 to 22. The CPU figures above are the honest ones. They fall less than the
   workloads because a third of the suite is loading 153 test files (vitest reports "import 34%"), which this work
   does not touch.
4. **Where the time goes now** (profiles of the new engine). A shot: the state copy 27% (a third of `apply`), the
   rule itself 42%, garbage collection 11%. An enemy phase: `emit` 27%, the technique planner (`aiTechnique`) 26%,
   `previewAttack` 22%, garbage collection 13%, `buildIndex` 7%. So the next two leads are the review's: the copy
   (fix 10), and how often the enemy asks for a preview.
5. **State sizes did not change** (fight 1: 114 KB; fight 50: 291 KB). See section 4.

## 3. The replay guard

### 3.1 What it is

`packages/engine/test/replay-hash.test.ts` drives `packages/engine/test/helpers/replay.ts`: whole seeded games
through the public reducer (`apply`), the player side played by the balance simulator's policies and reference builds,
the enemies by the engine's own AI. The golden damage tables run with the AI off and never walk a path or ask who
sees whom; this is the test that does.

Each game is reduced to (fixture `packages/engine/test/golden/replays.json`):

1. `state`: SHA-256 of the final `GameState` as JSON.
2. `stream`: SHA-256 of the ordered stream: every action sent, its refusal message if it was refused, and what it
   added (the fight's effects and log lines, the story's entries and effects, the round and turn).
3. `marks`: both hashes, short, every 25 actions. A failure names the first mark that differs, so you know in which
   25 actions the change began.

### 3.2 What it covers

| Set | Games | What |
| --- | --- | --- |
| Default (in `npm run check`) | 6 | Guns and blades 4 v 6 on the ground with cover; tank, Sigil, Outburst and Faith 4 v 7 with a Boss on the open ground; Calls leader (medic kit), Sigil, Outburst and gun against enemy Sigil and Heart casters; the Proving Ground at 4 v 10 with a Boss, Elites and casters (doors, the mine, fire and toxic ground are on that map); the Proving Ground across two changes of wave; story, a fight where the party stands, the story (walking, a pile, a rest), a second fight on another ground, the story |
| Larger (`REPLAY_FULL=1`) | 14 more | The same on the other ground, level 3 and level 20 all-in squads, 4 v 12 in the Proving Ground, six waves, two more round trips |

1. All nine reference builds play. Tiers: Vermin to Boss. Every game sends refused actions too (they are in the stream).
2. Two more tests in the file: **a save and a load in the middle** (the state is serialised, parsed, passed through
   `migrateLoaded` and continued, at three points of two games: same hashes), and **the default set plays what it
   says** (it fails if a policy stops moving, casting, praying or calling, so the hashes cannot go quietly "stable").
3. A story fight takes at most 7 listed enemies; 4 v 10 goes through the Proving Ground, which is the public way to
   field that many. The open ground is covered to 4 v 7.
4. Run time: 6 to 10 s alone on this machine for the default set before the fixes, about 3 s after; under load 20
   it took up to 37 s inside a full suite run. The larger set: 35 to 45 s alone.
5. Not covered: `viewFor` per player (review 4's fog work should add a hash per side), the human Narrator's tools,
   co-op speaking order.

### 3.3 How to re-record, and when

```
REPLAY_RECORD=1 REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash
```

Only when a rule, a number, a simulator policy, the enemy AI or the saved shape was changed **on purpose**. Say what
moved and why in the commit. A change that is meant to move nothing and moves a hash is a bug in the change: fix the
change. To see what moved, dump the last states on the old code and on the new and diff the files:
`REPLAY_DUMP=<folder> npm test -w @phc/engine -- replay-hash`.

It was never re-recorded in this work. The hashes in the fixture are the unmodified engine's.

### 3.4 Other proofs added

1. `test/paths-order.test.ts`: the plain path search (strings, a scan of the open list) is kept there as the oracle.
   On both real grounds and 300 random ones (walls, rough ground, traps, a sabotaged barricade, crowds, jumps, ways
   through people, tiles to avoid, starts off the map) the heap search gives the same distances, the same `prev` and
   **the same `Object.keys` order**. The same test holds `stepsFrom` to `paths()` and `coverTileFor` to the plain
   version. Checked by mutation: reversing the tie order fails this test and 5 of the 6 default replays.
2. `test/old-save.test.ts` with `test/fixtures/save-0.22-mid-fight.json` and `save-0.22-after-fight.json`: whole
   states written by the unmodified engine. Loaded, played on to the end of the fight, back to the story, into a new
   fight. Never regenerate these files; add a new one beside them when the shape changes.
3. The freeze (section 6, rule 4): in the engine suite the shared campaign, the archive's lines and every cached zone
   map are frozen deep. It found the two engine sites and the twelve tests the review predicted, and nothing else.
4. `apps/web/src/game/store-persist.test.ts`: the save is written right after an action, once per step, at once
   when the page is left with a write waiting, and never over a save changed from outside.

## 4. What was not done, and why

1. **Fix 9, the finished fight and its duplicate objects: not done.** The review said to check the fight screen's
   end card first. I did. `combat.js` draws the whole finished fight (grid, units, objects, log, initiative, the
   effects of the last blow) for as long as a player stays on it (`store.ts` `followPhase` keeps them there), and
   the story screen can open it again at any time (`main.js` `toCombat`, enabled while `g.combat` exists). The
   Proving Ground's wave-end card sits over it too. So `units`, `objects`, `log` and `fx` of a finished fight are
   all read by a screen. That screen belongs to another agent in this wave and I was told to run no browser suites,
   so a drop could not be checked where it would break. What it would take:
   1. Decide the rule with Leon: is "look at the last fight again" a feature? If not, the story screen's button goes,
      and `finishCombat` can keep `{ name, over, round, summary }` once every player has left the fight screen.
   2. If it stays: `viewFor` can rebuild `combat.objects` of a finished fight from the story's objects (they are the
      same list at that moment: 62 KB of 291 KB after 50 fights), so the saved state holds them once. The last-fight
      view would then show the map as it is now, not as the fight left it. That is a visible change: it needs the
      fight screen's owner and the `old-save` browser suite.
   3. Either way, a migration in `apply` for saves that hold the old shape, and a third fixture in `test/fixtures/`.
   4. The bulk is the piles themselves: about 1.2 KB each after a few fights, up to 6 KB, one entry per dropped
      magazine. A rule in the spec for what a pile keeps of spent magazines would cut more than any of the above.
2. **Fix 9, `persist()`: done as a write right after the action, not as a long debounce.** The write (0.3 to 1 ms)
   leaves the click and is made once per step. A 300 ms debounce was not used: the browser suites `resources` and
   `old-save` rewrite `phc.game.<code>` in `localStorage` and reload, and a delayed write (or a write on leaving the
   page) would put the old state back over their change. If Leon wants the longer debounce, change the `0` in
   `persistSoon` and run those two suites.
3. **Fix 8 (the combat screen's memoising) and fix 10 (branch-level sharing in `apply`): excluded by the brief.** Fix
   10 is now the largest single cost of a player action (the copy is a third of a shot). The freeze switch and the
   replay guard are the tools it needs; extend `workingCopy` and `test/helpers/setup.ts` one branch at a time.
4. **Fix 4's further step** (skip a unit with no Watch and no usable Answer; cache the usable sets for the length of
   an action): not prototyped by the review, not done. `dispatch` is 3% of an action now.

## 5. What runs where

| Command | Runs | Time on this (loaded) machine |
| --- | --- | --- |
| `npm run check` | The validator, both type checks, the engine suite **without** `test/balance/` (153 files, 3,339 tests: the replay guard's default set, the golden tables, the old saves and the path oracle are in it), the web suite, and the **balance smoke** line | engine 147 to 277 s by load, web 114 s, smoke 5 to 8 s |
| The balance smoke line (`npm run balance:smoke -w @phc/engine`) | 10 tests of `balance-sim.test.ts`: every reference build at every level is legal, earns its class, is not overburdened; the simulator is deterministic, its plain attacks deal what `previewAttack` says, it measures both sides; one fight for every way to fight plays without a refusal | 5 to 8 s |
| `npm run balance` (or `npm run check -- balance`) | All of `packages/engine/test/balance/`: 60 tests, the targets of rules 1.17 to 1.24 and the fit of the enemy table | 30 s |
| `REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash` | The 20 replays | 35 to 45 s |

1. **What `npm run check` no longer catches:** a balance target that moves (a Line at 150 to 200% of the rifle, a
   Hymn turn, the medic's kit, the Boss's HP in hits). Run `npm run balance` after any change to a number, a policy
   or the enemy AI, and before a merge. The lead should add it to the merge routine.
2. The hand-offs' own commands (`HEAL_MEASURE=1 npx vitest run --root packages/engine test/balance/heal-measure.test.ts`)
   still work: the folder is left out by a flag on the `test` script, not by the config.
3. The balance files' cheap targets were 127 to 164 s of the suite when the review measured; they are 30 s now, so
   putting them back into `npm run check` is affordable if Leon prefers one gate. It is a one-word change in
   `packages/engine/package.json`.

## 6. How to keep the engine deterministic and fast

Read this before changing anything under `packages/engine/src`. Each rule has a test that fails when it is broken.

### Deterministic

1. **Same state + same action = same next state, byte for byte.** No `Math.random`, no `Date.now`, no reading of
   anything outside the state and the data pack. Every die comes from `g.rng` through `rng.ts`.
2. **The number of dice rolled and their order are part of the rules.** Do not roll "just in case", do not roll
   inside a preview, do not reorder two rolls. One more die shifts every later result of the fight.
3. **Iteration order is part of the rules.** Units are walked in `cb.units` order, handlers in registration order,
   objects in `cb.objects` order, a path's tiles in the order they were first found. If you replace a loop with a
   faster one, it must visit in the same order and break ties the same way. `Object.keys` order counts: callers take
   "the first best" from it.
4. **Never iterate a `Set` or `Map` whose insertion order depends on something you changed**, and never sort with a
   comparator that returns 0 for things that differ unless the order before the sort is itself fixed.
5. **A cache may only be keyed on what its value is computed from, and may never change an answer.** Key it on the
   data (like `heldKey`) or hang it on an object that is replaced when the data changes (like the zone maps on the
   campaign object). If you are not sure a cache is invalidated in every case, do not add it.
6. **Presentation is in the hash too.** Effects (`cb.fx`) and log lines are part of the state. Emitting an effect
   earlier, later or twice is a change.
7. **Prove it:** `npm run check` runs the replay guard. If it fails and you meant to change nothing, the change is
   wrong. Do not re-record to make it pass.

### Shared, not copied (the rule that came with fix 2)

1. `apply` copies the state it is given **except `campaign` and the lines of `archive`**: the new state holds the
   same campaign object and a new list of the same archive lines.
2. So: **replace, never write in place.** `g.campaign = { ...g.campaign, zones }`, never `g.campaign.zones.push(x)`
   or `zone.npcs = …`. A write in place would change the previous state as well (the store keeps it for a reroll,
   React is drawing it).
3. The same goes for a map returned by `mapFor` or `zoneMap`: it is cached on the campaign object and shared by
   every state that holds that campaign. Read it; copy it before changing it.
4. The engine suite freezes all three (`test/helpers/setup.ts`), so a write in place throws `Cannot assign to read
   only property` at its own line. In a test, change a copy: `g.campaign = JSON.parse(JSON.stringify(g.campaign))`,
   then edit.
5. `test/helpers/setup.ts` must not import the engine (a test that mocks an engine module has to load it first). It
   sets a global the engine reads.

### Fast

1. **Never walk the whole map to answer a question about one tile or one unit.** `visibility()` is for drawing the
   fog; for "does this side see that unit" use `sideSeesUnit`, for "who is seen" `seenIds`. For one step use
   `stepsFrom`, not `paths()`.
2. **Build a set once per query and pass it down.** `sightBlockers(cb)` costs four times a line of sight; `unitSees`
   and `lineOfSight` take it as an argument. The same for `moveBlockers` and `difficultOf`.
3. **Nothing per unit × per handler on a hook.** A hook fires a dozen times per attack and visits every unit. Index
   by hook once (like `answersOn`), work a unit's answer out once per unit.
4. **No `JSON.stringify`, `split`, `map` or `Object.entries` in a function called per tile or per hook.** `xy`,
   `key`, `dist`, `heldKey` and `emit` are called tens of thousands of times an action.
5. **No `JSON.parse(JSON.stringify(…))` of a fight or a game inside an action.** `apply` already made the one copy.
6. **State size is paid on every click** (the copy, the save, a view per guest). Do not add a field that grows
   without a cap; do not keep a second copy of something the state already holds.
7. **A relic, a perk or a trait is an item** (indexed by what a unit holds), never a global hook (`onHook`), which
   runs for every unit of every fight.
8. **Measure before and after.** The scripts are in the scratchpad folder named in section 2 (`lib.ts`, `main.ts`,
   `summ.mjs`); `CLOCK=cpu` when the machine is busy. Do not trust a wall-clock figure taken while other suites run.

## 7. Files

| File | What |
| --- | --- |
| `packages/engine/src/combat.ts` | `noteSighted`, `paths`, `stepsFrom` (new), `coverTileFor`, `unitSees`, `visibility`, `sideSeesUnit`, `sideSees`, `xy` |
| `packages/engine/src/game.ts` | `workingCopy`, `_freezeShared`, `mapFor`'s cache comment and freeze, the drill objective |
| `packages/engine/src/missions.ts` | `placeBoardNpc` |
| `packages/engine/src/physical/core.ts` | `answersOn`, `dispatch` |
| `packages/engine/src/effects/collect.ts` | `heldKey` |
| `packages/engine/src/classes/rev3.ts` | `duckTile` |
| `apps/web/src/game/store.ts`, `store-persist.test.ts` (new) | `persistSoon` |
| `packages/engine/vitest.config.ts`, `test/helpers/setup.ts` (new) | The freeze, on for the suite |
| `packages/engine/test/replay-hash.test.ts`, `test/helpers/replay.ts`, `test/golden/replays.json` (new) | The replay guard |
| `packages/engine/test/old-save.test.ts`, `test/fixtures/save-0.22-*.json` (new) | Old saves |
| `packages/engine/test/paths-order.test.ts` (new) | The path oracle |
| Twelve tests in `completeness-c`, `completeness-e2`, `engine`, `missions`, `music-ost`, `perks-h`, `rules115-review` | Change a copy of the campaign |
| `packages/engine/package.json`, `package.json`, `tools/check.py`, `docs/TESTING.md` | `npm run balance`, the smoke line |

## 8. For whoever merges

1. Other worktrees are changing `combat.ts`, `game.ts` and `physical/core.ts`. The hunks here are small and local,
   but `paths()` and `coverTileFor` were rewritten whole: if the geometry kit moved them, take this body and run
   `paths-order` and the replays.
2. After the merge: `npm run check`, `npm run balance`, `REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash`. If
   another piece changed a rule on purpose (the foundation plan's rulings 1 to 3 do), the replays will move with it:
   record once, on purpose, after all of wave 1 is in, and list it in that piece's hand-off.
3. Browser suites were not run here. `store.ts` changed; `resources`, `old-save` and `two-players` are the ones that
   touch the save.
4. On a loaded machine a few timed tests time out at vitest's default 5 s (`ai-soul` "stays quick", `balance-sim`
   "measures both sides"). They pass alone. That was so before this work as well.
