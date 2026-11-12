# Testing: which tool for which change

Written so that anyone (a person, or an AI model with less room to think than the one that wrote it) can check a
change with the cheapest tool that proves it. **Start at the top of this table and stop at the first row that fits.**

| You changed… | Run | Takes | It tells you |
| --- | --- | --- | --- |
| Anything, before you say "done" | `npm run check` | 1 to 2 min | The data validator, both type checks and both unit suites: one line each, only failures printed |
| Only the engine or the data | `npm run check -- engine` | under 1 min | Validator, engine types, engine tests |
| Only the client | `npm run check -- web` | about 1.5 min | Web types, web tests |
| One rule, and you want only its tests | `npm run check -- -t "Heart Overload"` | seconds | Both suites, only tests whose name matches |
| A number or a rule, and you want to SEE what the game does | `npm run try -- '<scenario>'` | 3 s | A fight played through the real rules: the log lines and every unit's HP, AP, meters and conditions after each step. No browser, no new test file. `npm run try -- --help` has the fields and examples |
| A screen, a button, anything a player clicks | `npm run e2e -- <suite>` | 1 to 3 min a suite | The suite's checks in a real browser. It builds, starts and stops the server itself |
| Before a merge to `develop` that touches the client | `npm run e2e -- rules` | @@RULES@@ | Every suite that checks rules and screens (fights at the test pace) |
| You changed `game/fx/`, the camera, the combat speed, a cut-in | `npm run e2e -- anim` | @@ANIM@@ | Every suite that looks at animation or time, at real speed |
| Before a release | `npm run e2e -- all` then deploy | @@ALL@@ | Every browser suite (`rules` + `anim`), three at a time. It must end `ALL GREEN` |
| You changed a weapon, a technique or an effect's timing | `npm run e2e -- sweep` | about 17 min | `fx-sweep`'s whole table: every weapon × every technique, judged from the effects layer's own trace |
| After a deploy | `npm run e2e -- smoke --base https://project-heaven-cry.leonpentastorm.workers.dev` | 3 min | The live site |

## Rules that save the most time

1. **Do not open a browser for a rules question.** `npm run try` answers "what happens if I do X with perk Y" in
   seconds. A browser suite is for what is drawn and clicked.
2. **Unit tests first, always.** Every rule has tests in `packages/engine/test/` written from the spec's sentences; a
   screen's logic is tested in `apps/web/src/**/**.test.ts` without a browser (the screens are functions that return
   values). Add your test there. A browser suite is the last check, not the first.
3. **Never run browser suites at real speed unless they test animation.** `npm run e2e` does this for you: every suite
   in the group `rules` plays fights about 25 times faster (`FAST=1`, the hidden `test` combat speed in
   `apps/web/src/game/combatSpeed.ts`). The suites that look at animation or time are the group `anim`
   (`apps/web/e2e/groups.json`).
4. **Read one line per suite.** The tools print a summary and only the failing lines. The full log is in `.check/`
   when you need it; don't print it.
5. **One server, one build.** `npm run e2e` owns `apps/web/dist` and port 8787 while it runs. Don't run two at once,
   and don't run it while another agent is half-way through an edit (the build would pick their half up).
6. **A browser script must wait for what a player waits for,** not for a number of milliseconds: `pickAction` in
   `apps/web/e2e/lib.mjs` waits until the action panel is really yours. In a fight the screen shows the turn that is
   playing; the state can say "your turn" several seconds earlier. Read `window.__phc.getState()` for facts and the
   page for what is shown, and don't mix them up. `page.waitForTimeout` is not used in any suite (a test keeps the
   count at 0): `until`, `settle`, `fxIdle`, `pause` and `watch` in `lib.mjs` take its place, and the twelve-point
   checklist in `apps/web/e2e/README.md` ("A suite that does not flake") says which to use when.
7. **In a one-line script, never put a `//` comment in the middle of the line.** It comments out the rest of the
   line. (This cost two debugging rounds on 11 Nov 2026.)
8. **A red browser run means a real bug.** Every suite is in a group and green, or it is deleted; nothing is left
   "known to fail". So a red line is never ignored and never "probably the machine": see the next section.

## The browser suites: groups, and what a line means

- **The groups** are in `apps/web/e2e/groups.json`: `rules` (rules and screens, test pace), `anim` (animation and
  time, real speed), `smoke` (five of them), `all` = `rules` + `anim` = every `.mjs` in the folder, and `sweep`
  (`fx-sweep` with its whole table). `npm run e2e -- --list` prints them.
- **A suite in no group cannot exist.** `tools/e2e.py` stops with an error, and `npm run check` fails
  (`apps/web/src/e2e-groups.test.ts`), when a `.mjs` in `apps/web/e2e/` is in neither `rules` nor `anim`. A new suite:
  write it, add its name to one of the two lists, add its entry to `apps/web/e2e/README.md`.
- **The retry rule.** A suite that fails while others run beside it is run once more, alone, at the end.
  - `FLAKY <suite> … passed alone`: it failed beside the others and passed alone. The run still ends green, but says
    `GREEN, BUT n PASSED ONLY ALONE`. That is a fault in the SUITE (it measures the machine, not the game): fix it with
    the checklist in `apps/web/e2e/README.md`. It is never silently green: the line and the summary name it.
  - `FAIL <suite> … alone too`: red. A real bug in the game, or a suite gone stale after a rules change; either way it
    is fixed before the merge. A suite gets one retry, never two.
  - A suite that prints no `ok` line fails ("nothing was checked").
- **Timing.** A suite judges ORDER and PRESENCE from the effects layer's own plan (`window.__phcFxTrace`: each thing
  drawn or heard, with `t`, when it was due, the same on any machine) or from a watcher inside the page; a wall-clock
  length is asserted only where the length is the thing under test, measured in the page, with the plan as the lower
  bound and room for a busy machine above, and a comment that starts `WALL CLOCK, on purpose`.

## The tools

- `tools/check.py` (`npm run check`): the no-browser gate. Logs of failures in `.check/`.
- `tools/try_fight.py` + `packages/engine/test/try.test.ts` (`npm run try`): a scenario in JSON, played by the engine.
- `fx-sweep`: every weapon × technique in the Effect testing room, judged from the effects layer's own trace (`window.__phcFxTrace`, `fx/dom.ts`). In `anim` and `all` it plays its real-speed, fog and glyph parts (19 named cases at the player's speed, about 2 min); the whole table (about 17 min) is its own group, `npm run e2e -- sweep`. `ONLY='<regex>'` narrows it. Report in `.check/e2e/fx-sweep.json`.
- `tools/e2e.py` (`npm run e2e`): the browser suites; groups `smoke`, `rules`, `anim`, `all`, `sweep`; `--list`, `--jobs`, `--no-build`, `--no-retry`,
  `--slow`, `--base`.
- **The ground a test fights on.** `fightWith` (and so `npm run try`) fights on the **practice square**, a fixed 16 × 11
  map kept for tests (`packages/engine/test/helpers/yard16.ts`, map id `yard16`): a rule's test names tiles on it and
  must not move when a real map is redrawn. The real maps (26 × 26 open ground is map id `yard`; rules 1.16) are walked
  by `packages/engine/test/maps.test.ts` and fought on by the simulator; pass `map: 'yard'` (in a scenario,
  `"map": "yard"`) to try something on the real ground. A test file that names `yard16` itself imports the helper.
- `packages/engine/test/helpers/perkfight.ts`: `fightWith`, `storyWith`, `sheetOf`, `withGame`: a fight or a story
  with the characters, perks, skills and enemies you name, through the real reducer. Every rules test starts here.
- `packages/engine/test/perk-audit.test.ts`: every perk and trait through a fight (`PERK_AUDIT_OUT=<file>` writes the
  report).
- **The golden tables** (`packages/engine/test/golden-damage*.test.ts`, inside `npm run check`): what about 5,300 fixed
  actions produce and land, exact, against `packages/engine/test/golden/*.json` (every weapon, technique, reference
  build, a Line for every Subject word, the Outburst by school, stage and feeling, every prayer, blasts, traps, hazards,
  ticks; `record.ts` lists them, each file's `#coverage` line says what gave no number). They fail when ANY number of
  the damage engine moves, and print the action, what it was and what it is. A change that is meant to leave numbers
  alone (a refactor, a re-expression of the formula) must leave them green. When a number was meant to move, record
  on purpose and say so in the commit: `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage`. No enemy AI runs in
  them (every action is a fixed attacker on a fixed target), so a change to whom an enemy picks does not touch them.
- `packages/engine/test/balance-baseline.test.ts`: the plain attack of sample weapons against each enemy tier
  (`BALANCE_OUT=<file>`).
- `window.__phc` in the browser: `getState()`, `act(action)`, `setNarrator({ scripted: true })` (a Narrator that
  answers at once, for tests), `net()`; `window.__phcFxDebug()`: where the effects queue stands.
  `window.__phcCamera()`: the camera of the map on screen (its frame, the first and last column and row showing, whether
  it is gliding or in the overview, the edge arrows up); the `camera` suite reads it.
- The Proving Ground's `sandbox/*` actions set a fight up from a script: `sandbox/perk`, `sandbox/trait`,
  `sandbox/skill`, `sandbox/level`, `sandbox/class`, `sandbox/give`, `sandbox/kit`, `sandbox/spawn`, `sandbox/clear`,
  `sandbox/ai`, `sandbox/meter` (Momentum, Pressure, Guard, a shield), `sandbox/mana`.

## Releasing

`docs/HANDOFF.md` has the steps. In short: `npm run check`, `npm run e2e -- all`, bump the version in the four
`package.json` files and `package-lock.json`, a `CHANGELOG.md` entry, merge to `develop` then `main`, `npm run assets`,
`python3 design/canvas-build/build.py --web`, `npm run build`, `python3 tools/deploy_site.py`, `npx wrangler deploy`
in `apps/server`, a `backup/live-<version>` branch, then the smoke suites against the live site. Leon decides when.
