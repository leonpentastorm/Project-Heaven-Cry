# Survival, build step 1: the mode picker and the run's state (13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4), section 10 step 1; rules 1, 2, 3, 4, 36; section 8.1 (Leon's sketch).
Rules revision **1.39** in `docs/rules/PHC-Core-Rules-v1.0.md`, items **2600 to 2612** (all PROVISIONAL). Branch: this
worktree's (`worktree-agent-aac60994cdd4d1f97`), from `claude/charming-gauss-hbq4n0` at 7cd6b8a0. No version bump.

## 1. What was built

**Data.** `data/modes.json` (kind `modes`): `default` `survival`, `old_save` `campaign`, three items in the picker's
order, each `name`, `line`, `art` (+ `art_pending`), `available` (the lock), `coming` (a locked card's words),
`narrator` (`optional` / `required`), `start` (`run` / `session`). Validator block in `tools/validate.py` (ids and order
equal the engine's `PlayMode`, the default is open, every locked mode says why, every `art` is a web asset or
`art_pending`); `data/CONVENTIONS.md` "Modes" and a row in `data/README.md`.

**Engine** (`packages/engine/src/run/state.ts`, new; glue in `game.ts`):
- `settings.play?: PlayMode`; `playOf(g)` reads a missing one as `OLD_SAVE_PLAY` (campaign). `migrateLoaded` writes it.
  `newGame` is unchanged (no `play`): engine tests and the replays keep their states; the client sets the room's mode.
- The `settings` action refuses a `play` that is locked (`modeLocked`: "Campaign is not open yet. Coming when…"), not
  a mode, or changed outside the lobby; a room's own mode is never a pick.
- `g.run: RunState` (rule 36's fields: `seed, stage, world, nodes, at, path, state, leans, ready, offers, shop, stats,
  out, renown`, + `end`). `RunPhase` is `map | boon | tile | over` for now; `RunNode` is section 9's node shape
  (`{id, depth, col, kind, setting, links, room: null}`), `RunTile` rule 32's.
- `run/start` (`runStartProblem`: host, lobby, Survival, a character, one a player, every online player has one, all
  level 1; each refusal names who) → `newRun(seed)`, phase `story`, `beginSession`, a SURVIVAL line. Seed: the host's,
  else `runSeed(code, seq)` (no die).
- `run/retire` (`runRetireProblem`: a run, the host, not over, at `boon` or `tile`) → `endRun` (`state: over`, `end`).
- `RUN_REFUSED`: during a run the Narrator's, story's, sessions', rests' and campaign's actions are refused in words.
- `session/start` is refused in a Survival room.

**Client.** `apps/web/src/game/modes.ts` (the picker's view model, `modeCards`, `radioKey`, `narratorOptional`,
`startsRun`, the test hook `testPlay` / `newRoomPlay`); `screens/room.js` + `templates/room.template.html`: three cards
(a `radiogroup`, roving tab stop, arrows move, Enter/Space pick), "Selected" with a white check, locked cards dimmed
with a line lock and "Coming", the reason through the one hover card (`actionTip.ts openTipOn`, new: opens an
element's own card on click), the chips row and start panel only in a Campaign room, Proving Ground as a text button
under the cards left of Start, Start "Start the run" (`run/start`, no key needed), the Narrator panel collapsed in
Survival ("Survival needs no Narrator." + "Add a Narrator for flavour (optional)"; host only; "Hide…" folds it).
`store.ts`: a new room opens on `newRoomPlay()`; a run between fights routes to the room (`screenFor`), which shows a
run panel (seed, stage; Retire after a Boss) in place of the cards until step 2's path map. `shell.js`: no "Back to the
session" during a run. CSS in `main.tsx` (`.phc-modes`: one column under 900 px with the thumbnail left; 4 : 3
paintings from 1700 px).

**Art.** Survival's card painting (`survival-card-title`) is not in the repo: the card draws the plain panel with the
AHOC seal. `art/briefs/ART-REQUESTS.md` row S2 (Survival's card now needed; Roguelike's later).

## 2. Built from

| Rule | Primitive |
| --- | --- |
| The mode, host-only, relayed live | the `settings` action (host check, as before) and the room's state broadcast; `settings.play` |
| A locked mode refused in words | `RuleError` via `fail` with the data's `coming` text (`modeLocked`) |
| The run beside the campaign, refusing story actions | the Proving Ground's pattern: `g.sandbox` → `g.run`, `SANDBOX_REFUSED` → `RUN_REFUSED`, one reducer (`reduce` → `runAction`) |
| Session 1 at the run's start | `beginSession` (game.ts) |
| A seed with no dice | `seedFrom` (`rng.ts`) |
| Old saves | `migrateLoaded`; fixture `save-pre-modes-lobby.json` written by the engine at 7cd6b8a0 (script beside it) |
| The views carry the run | `viewFor` copies `g.run` as every field (nothing secret in it yet) |
| Hover reasons | the one hover card (`tip=` → `data-tip-text`; `openTipOn` for a click) |
| Art by id with a fallback | `ART` / `IMG` (assets built from `art/catalog.json`) and the seal |

**Needs a new primitive:** none in the engine. One small general client addition: `openTipOn(el)` in `actionTip.ts`
(any control whose click is refused can show its own card).

## 3. Proof

- `npx vitest run --root packages/engine test/run-state.test.ts test/old-save.test.ts`: 28 tests (modes data, the
  settings refusals, `run/start` and every refusal, the seed, views, session/start refused, refused story actions,
  `run/retire` and every refusal, a save round trip; every old fixture loads as `campaign`, the pre-modes lobby
  starts its story and can switch to Survival).
- Engine suite without `replay-hash` (stale on this branch, not run): 248 files, 4,071 tests green, golden tables
  unmoved. Lints (`test/lint*`, `engine-hooks`, `test-lint`): green, baselines untouched.
- Web: `src/screens/room-modes.test.ts` (13 tests); the whole web suite green (store-fight's room now opens on
  Campaign by the hook; combat-actions timed out once under load and passes alone).
- `npm run e2e -- room --base http://127.0.0.1:8893`: 25 checks, ALL GREEN (a locked card can't be picked by click or
  key and says why; a guest can't pick; a guest sees the host's pick change live; the engine refuses a locked mode;
  both lock in and the run starts on both screens).
- `python3 tools/validate.py data` 0 errors; `build.py --web --check` fresh; `tools/engine_catalog.py --check` clean
  (it now lists `run/state.ts` as a primitive file); `npm run built-from -- 7cd6b8a0..HEAD`: no smells; `tsc` clean
  in both packages.

## 4. How to add a mode (or open one)

1. Open a locked one: set its `available: true` and `coming: null` in `data/modes.json`. If it starts a story
   (`start: session`), nothing else; the cards, Start and the engine follow the data.
2. A new mode: its id in `PlayMode` (`run/state.ts`) and in the validator's id list, a row in `modes.json`, and its
   start in the reducer if it is neither `run` nor `session`. Its card art: a catalog id, `art_pending` until it lands.

## 5. Open, and calls made

1. **An old lobby save reads as Campaign** (item 2602), not Survival: the spec named only "a campaign under way". One
   line in `migrateLoaded` to change.
2. **Every online player must have a character** to start a run (item 2606; "every seat locked in").
3. **The browser suites' hook** (item 2611): `apps/web/e2e/lib.mjs` sets `phc.testPlay = campaign` on every page unless
   a suite passes `{ play: 'survival' }`; so the 60-odd story suites run as before. A hooked page shows Campaign open,
   but the engine still refuses picking it back after leaving it (tests only; the room suite checks this).
4. **A run with no path map** shows a placeholder panel in the room ("The path map … arrives with the next update").
   Step 2/3 replace it with the path map screen and route `g.run` there (`store.ts screenFor`, `room.js runV`).
5. **After a retire** the run is `over` and the room stays out of the lobby; the summary and "Back to the room" are step
   3's. `run/start` after an `over` run is refused ("The room has already started.") until then.
6. **`char/add` mid-run** is not refused (a late joiner would bring an unrun character). Step 3 should decide.
7. **Not built here:** credits and start kits (rule 2, 28: step 4), the death return (step 4a), leans/go (step 2/3).
8. **For step 2's builder:** `RunNode` in `run/state.ts` is section 9's node shape; write the generator's nodes into
   `g.run.nodes` with it (or replace the type in one place). `g.run.seed` is the stream's seed for `rngFor`.
9. **Merging:** the rules revision sits before "## Maps (rules 1.16)", where 1.38 may also land; the items are at the
   file's end after 2412.

Screenshots (1280 and 1920 at deviceScaleFactor 2, and 1440, 860, a locked card's hover, the Narrator opened):
`/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/surv1-shots/`.
