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
| Before a release | `npm run e2e -- all` then deploy | about 15 min | Every browser suite, three at a time |
| After a deploy | `npm run e2e -- smoke --base https://project-heaven-cry.leonpentastorm.workers.dev` | 3 min | The live site |

## Rules that save the most time

1. **Do not open a browser for a rules question.** `npm run try` answers "what happens if I do X with perk Y" in
   seconds. A browser suite is for what is drawn and clicked.
2. **Unit tests first, always.** Every rule has tests in `packages/engine/test/` written from the spec's sentences; a
   screen's logic is tested in `apps/web/src/**/**.test.ts` without a browser (the screens are functions that return
   values). Add your test there. A browser suite is the last check, not the first.
3. **Never run browser suites at real speed unless they test animation.** `npm run e2e` does this for you: every suite
   that doesn't look at animation plays fights about 25 times faster (`FAST=1`, the hidden `test` combat speed in
   `apps/web/src/game/combatSpeed.ts`). The animation suites are listed as `ANIM` in `tools/e2e.py`.
4. **Read one line per suite.** The tools print a summary and only the failing lines. The full log is in `.check/`
   when you need it; don't print it.
5. **One server, one build.** `npm run e2e` owns `apps/web/dist` and port 8787 while it runs. Don't run two at once,
   and don't run it while another agent is half-way through an edit (the build would pick their half up).
6. **A browser script must wait for what a player waits for,** not for a number of milliseconds: `pickAction` in
   `apps/web/e2e/lib.mjs` waits until the action panel is really yours. In a fight the screen shows the turn that is
   playing; the state can say "your turn" several seconds earlier. Read `window.__phc.getState()` for facts and the
   page for what is shown, and don't mix them up.
7. **In a one-line script, never put a `//` comment in the middle of the line.** It comments out the rest of the
   line. (This cost two debugging rounds on 11 Nov 2026.)

## The tools

- `tools/check.py` (`npm run check`): the no-browser gate. Logs of failures in `.check/`.
- `tools/try_fight.py` + `packages/engine/test/try.test.ts` (`npm run try`): a scenario in JSON, played by the engine.
- `tools/e2e.py` (`npm run e2e`): the browser suites; groups `smoke`, `rules`, `anim`, `all`; `--jobs`, `--no-build`,
  `--slow`, `--base`.
- `packages/engine/test/helpers/perkfight.ts`: `fightWith`, `storyWith`, `sheetOf`, `withGame`: a fight or a story
  with the characters, perks, skills and enemies you name, through the real reducer. Every rules test starts here.
- `packages/engine/test/perk-audit.test.ts`: every perk and trait through a fight (`PERK_AUDIT_OUT=<file>` writes the
  report).
- `packages/engine/test/balance-baseline.test.ts`: the plain attack of sample weapons against each enemy tier
  (`BALANCE_OUT=<file>`).
- `window.__phc` in the browser: `getState()`, `act(action)`, `setNarrator({ scripted: true })` (a Narrator that
  answers at once, for tests), `net()`; `window.__phcFxDebug()`: where the effects queue stands.
- The Proving Ground's `sandbox/*` actions set a fight up from a script: `sandbox/perk`, `sandbox/trait`,
  `sandbox/skill`, `sandbox/level`, `sandbox/class`, `sandbox/give`, `sandbox/kit`, `sandbox/spawn`, `sandbox/clear`,
  `sandbox/ai`, `sandbox/meter` (Momentum, Pressure, Guard, a shield), `sandbox/mana`.

## Releasing

`docs/HANDOFF.md` has the steps. In short: `npm run check`, `npm run e2e -- all`, bump the version in the four
`package.json` files and `package-lock.json`, a `CHANGELOG.md` entry, merge to `develop` then `main`, `npm run assets`,
`python3 design/canvas-build/build.py --web`, `npm run build`, `python3 tools/deploy_site.py`, `npx wrangler deploy`
in `apps/server`, a `backup/live-<version>` branch, then the smoke suites against the live site. Leon decides when.
