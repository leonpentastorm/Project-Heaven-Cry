# Pick-up: if the lead session died mid-mission, start here

Written 12 Nov 2026 by the lead, for whoever continues (Leon has said it may be an Opus session). Read this, then
`docs/design/proposals/2026-11-engine-review/PLAN.md`. Everything else is linked from those two. Keep this file
current: when you finish a step below, tick it here in the same commit.

## 1. The mission, in one paragraph

Leon wants the engine in "prim, proper, professional shape" before any new system (a roguelike mode is coming), then
the balance pass finished on that foundation. **Nothing is offered for live until all of section 4 is done.** He
decides the deploy; never deploy without his explicit word for that release. If he doesn't answer a recommendation,
build it and list it as a call made for him (CLAUDE.md, "No answer means yes"). Conserve tokens: cheapest model tier
that can do a piece; no more than two pieces running at once; a reviewer only where a mistake would be silent.

## 2. Where the work is

- **Branch:** `claude/charming-gauss-hbq4n0` (pushed). Everything merged is there. Live is still **0.22.0** on `main`.
- **Merged so far (12 Nov):** rules 1.15 to 1.25 (the balance pass's first half), the one damage formula stage a,
  client boundary 1, engine foundations 1, the text-number truth sweep, performance 1. Each has a hand-off in this
  folder with a "How to add things" section.
- **In flight work is also on the remote as `wip/<branch name>`** (Leon, 12 Nov: "push it"): `git fetch origin 'refs/heads/wip/*:refs/remotes/origin/wip/*'`, then `git branch --list -r 'origin/wip/*'`. A loop pushed them every ten minutes while the lead was alive; a `wip/` branch is the agent's last commit, finished or not: judge it by section 3 before merging, and delete the `wip/` branch once its piece is merged.
- **In flight, each on a local branch in a git worktree** (`git worktree list`,
  `git branch --list 'worktree-*'`). In a fresh container use the `wip/` copies; only if a piece has none, redo it from the brief in section 5.

| Piece | Branch | State when this was written |
| --- | --- | --- |
| Balance pass stage b (the re-fit) | a `worktree-agent-*` branch (remote `wip/…`), started 12 Nov | building |

Every other `worktree-…` branch is **already merged** (wave 1, wave 2, the sweep, performance); leave them.

## 3. How to take in a branch (the lead's routine)

1. Is it worth merging? `git log --oneline claude/charming-gauss-hbq4n0..<branch>` shows its commits; read its hand-off
   (`git show <branch>:docs/design/handoffs/<name>.md`). A branch whose agent died is still good work up to its last
   commit if the checks below pass on it.
2. `git merge --no-ff <branch>`. Conflicts are normal (several pieces touch the same engine files). **Rule: keep both
   sides' intent**: the main line's primitive call (`rollSave`, `displace`, `itemAmount`, `amountOf`, the `kit.ts`
   helpers, `actions.ts` rows) together with the branch's own change. Never drop a refactor to keep an older shape.
3. Then, in this order: `npx tsc -p packages/engine --noEmit`, `npx tsc -p apps/web --noEmit`,
   `python3 tools/validate.py data`, and the pins:
   `npx vitest run --root packages/engine --testTimeout 600000 test/golden test/replay-hash test/lint-foundations test/paths-order test/sight-order test/shared-state test/old-save`.
4. Reading a pin failure:
   - **Damage or rules golden table:** new lines only (`NEW`), or lines the branch's hand-off lists as a ruling:
     re-record on purpose (`GOLDEN_RECORD=1 …`, see `docs/TESTING.md`) and say so in the commit. Anything else changed
     is a merge mistake: fix the code, not the table.
   - **Replay hash:** differs whenever a rule changed on either side, which is usual. Check the oracles pass
     (`paths-order`, `sight-order`, `shared-state`), then `REPLAY_RECORD=1 REPLAY_FULL=1 npx vitest run --root packages/engine test/replay-hash`.
   - **A lint:** it names what to call instead; do that.
5. On a busy machine tests **time out**; that is not a failure. Re-run the file alone with `--testTimeout 300000`.
   Never weaken a test to get past a timeout.
6. Commit the merge, push the branch. Full `npm run check` and `npm run e2e -- all` wait for a quiet machine (section 4).

**Disk (this nearly killed the mission on 12 Nov).** A worktree is a full checkout plus `node_modules`: about 2.5 GB.
Ten of them filled the disk, and then every new agent failed at launch with hundreds of "unable to write file" lines
and no other sign: the workflow just showed "Failed". So: (1) **before starting any worktree agent run `df -h .`** and
want at least 8 GB free; (2) **remove a worktree as soon as its branch is merged**:
`git worktree unlock .claude/worktrees/<name>; git worktree remove --force .claude/worktrees/<name>; git worktree prune`
(only when `git merge-base --is-ancestor worktree-<name> claude/charming-gauss-hbq4n0` says it is merged, or its work is
on the remote as `wip/…`); (3) reviewers' temporary worktrees under the scratchpad are deleted when the review is read;
(4) an agent that fails at once, with no transcript, is a launch failure: look at disk and usage before anything else,
and never relaunch in a loop.

Agents: give each its own worktree (`isolation: "worktree"`). **A new worktree starts from stale `main`:** the brief
must tell the agent to `git merge --ff-only claude/charming-gauss-hbq4n0` first, to commit to its worktree branch and
not push, and to report the branch name. Hand long lists to an agent as a **file path**, never pasted in the prompt
(a pasted list of 309 findings was cut off at 167).

## 4. What is left, in order (tick as you go)

- [x] **Wave 2** merged (12 Nov): costs and counters, conditions, fog in the engine. Left over from it, for wave 3: the fight log still reaches every player whole (spec item 1600 a: do it with the effects schema); about half the counters and 28 resource payments are still by hand (ratcheted by `lint-costs`; they ride on item ops).
- [x] **Browser suites** clean-up merged (12 Nov; stopped by the lead after 8 hours of full runs on a loaded machine: 61 suites in `apps/web/e2e/groups.json`, runner retries once alone). Not yet run against the merged tree: action descriptors changed the client after it, so expect stale suites on the first `npm run e2e -- all`.
- [ ] **Wave 3** (PLAN.md has the table; the reviews have the detail). Cheapest order:
  1. [x] Item ops, first pass (merged 12 Nov; `engine-foundations-3-item-ops.md`): the runner, closed lists of
     30 triggers / 54 predicates / 18 ops, a ratchet lint, a `relic` item kind loaded at run time. **Only 20 of 310
     handlers moved** (11 data-only); the review's estimate was too high. What is left is listed in that hand-off in
     order (cost triggers, a turn-counted cooldown, "next X after Y", area targets); the lint stops it growing.
     Lead's call: the second pass waits until after the balance pass, it does not block live.
  2. Preview is a dry run (F7), then character / unit / story state in one table (F9, F10).
  3. [x] Action descriptors (merged 12 Nov; `client-boundary-3-actions.md`): `actionsFor`, `previewDescriptor`,
     `sendDescriptor`, `registerActions`; all seven systems on `apps/web/src/game/actionFlow.ts`. Not done: the combat
     screen split (review 4: 8), the story map, `smartCommands` costs. Browser suites it names still to run:
     `npm run e2e -- playscreen physical physical-pack perks classes-moves rules114 ground reload world-play tabs resources combat-fixes turn-order faith faith-pg skeleton-screens heart soul feelings40 magic sigil14 sigil15 sigil15-strokes sandbox two-players`.
  4. Effects with a schema (review 4: 5).
  5. Rooms and the Narrator prompt (review 4: 7, 10). **First to cut if tokens run short.**
  6. Fold the spec's revision sections 1.14 to 1.25 into its body (review 3: row 7); section 14 as a ledger.
- [x] **The balance pass: the re-fit merged 12 Nov** (rules 1.26; `balance-refit.md`, `docs/design/balance-contract.md`; still unmeasured: class moves, perks, special rounds, Calls, reactions, armour). The brief it was built from: (`docs/design/proposals/2026-11-balance-pass.md` section 17;
  `2026-11-unified-damage.md` stage b: steps b1 to b8). Rulings already given by Leon: the ceilings are what an
  **all-in** build reaches and a normal share sits at ceiling ÷ **1.25**; **no damage slope on rolled attacks** (skill
  buys accuracy, level buys damage); melee's all-in ceiling 165% with the Defender lower; flat things grow with
  level; every system's identity is a named multiplier in data. Ceilings (percent of the normal-share plain rifle):
  best gun steady 145; Outburst steady 135, biggest Release 165; a full Sigil Line 150 to 200 after two turns; Faith a
  Whisper turn 80, a Hymn turn 150; a healer's turn 1.25 Soldier-turns; Weapon Arts may break the ceiling as a
  charged ultimate counted in the average; Miracles exempt. Then: many targets, a yardstick for control, the systems
  never measured (`PATCH-TALLY.md` section 10), the balance contract (`docs/design/balance-contract.md`) and its
  guard test. Known to re-check in the re-fit: Bleeding now lasts 3 rounds; the breacher tube's splash is 60.
- [x] **`docs/ENGINE-GUIDE.md`** (written 12 Nov, by reading the hand-offs; correct it when a hand-off changes): collect every hand-off's "How to add things" into one guide for agents.
- [x] **`docs/PLAYTEST-CHECKLIST.md`** (written 12 Nov; its "right" values are from the hand-offs, not from play): what Leon should try by hand, by system, with what "right" looks like. Seed it
  from `PATCH-TALLY.md` (every changed system), `BUGLIST-0.22.md` (bugs to confirm by eye) and each hand-off's
  behaviour changes.
- [ ] **Close:** `PATCH-TALLY.md` live column checked against `origin/main`; version bump in the four `package.json`
  and `package-lock.json`, `CHANGELOG.md`; on a **quiet machine** one `npm run check` ALL GREEN and
  `npm run e2e -- all` green. Then tell Leon it is ready and wait.

## 5. Briefs for the in-flight pieces, if they have to be redone

They are in the workflow scripts' text; the short form:

- **Costs and counters:** review `1-duplication.md` F3 and F8. Pin AP and every resource before and after every pad
  action (with each cost-changing item) as a golden table on unmodified code; then one `price` / `canPay` / `pay` /
  `refund` and one cost hook, `cost` declared on every action (data where the action is data: `data/actions.json`
  holds the basic ones), every limit and cooldown through `effects/uses.ts`; reads of a use counter must not write.
- **Conditions:** review `1-duplication.md` F4. Pin apply / tick / cleanse / end for all 40 conditions; the table is
  read from `data/conditions.json` (the engine's own copy goes); everything through `applyCond` / `endCond`; cones and
  blasts into `kit.ts`.
- **Fog in the engine:** review `4-client-boundary.md` finding 4. `viewFor(game, player)` sends a guest only what its
  side sees (units, glyphs, traps, fx and log lines that would reveal them); the client stops filtering by sight.
- **Browser suites:** review `3-data-text-tests.md` section 5. Every `apps/web/e2e/*.mjs` in a group of
  `tools/e2e.py` or deleted; the five stale suites repaired or retired with their checks moved to unit tests; waits on
  state, not sleeps; a wall-clock assertion only where the time is the thing tested.

## 6. Calls already made for Leon (he can reverse any)

A save is a save (every save takes save-changing items). Forced movement: traps, fields and hazards act on every push,
pull, throw and teleport; nobody reacts to one (this removed "shove an enemy into a held Watch"; one switch in
`data/rules.json` `forced_movement` brings it back). One order of multiplication for all damage. The fire doctrine by
tier, the idle-pair target retired, a Boss's escorts spread off its target. Enemies keep the three-roll Burst until
their table is refitted. A grenade is not "your attack" for Judgement Day, Moon Hunter and Ghost Soldier. The sixteen
rulings in `text-number-truth.md` section 10, each at the lead's recommendation (listed in the lead's last message to
Leon and in spec section 14 items 1500 to 1513 and 1640 to 1646).

## 7. Waiting on Leon

Bug 12 (was "1 of 3 now" on a Techniques row the missing AP cost?). Confirm by eye once on a staging or live build:
effects scrolling with the map, the enemy acting under the your-turn card, the next-wave drop, Suppress timing, the
glyph that vanished. Everything in section 6 he wants reversed.
