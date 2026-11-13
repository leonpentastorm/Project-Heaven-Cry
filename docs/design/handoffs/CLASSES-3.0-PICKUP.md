# Classes 3.0: the mission, and how to carry it on with Opus alone

Written 13 Nov 2026 by the lead. **If the lead session is gone, an Opus session reads this file top to bottom and
continues from section 4.** Keep it current: tick a step in the same commit that finishes it.

## 1. What Classes 3.0 is

Leon's name (13 Nov) for the patch that builds **Class Roster Revision 4**: nine mechanics, one per attribute, open to
everyone through its alpha skill (the door), used better by the base class; the nine base classes respecced and
renamed (Bulwark, Breaker, Skirmisher, Operative, Sigilist, Rigger, Mender, Channeler, Chaplain); three new systems
(Shadow, Bonds and Tending, Figments and the Visualizer); the reaction rule made real; the Chaplain's prayers.
**Leon's ruling: design everything, then build it as one big patch.** The design is done. Nothing of it is live.

## 2. The documents, in the order to read them

| Read | For |
| --- | --- |
| `CLAUDE.md` | the project and the working agreements; note "Use the engine, don't build beside it" |
| `docs/ENGINE-GUIDE.md` ("Stop: before you build") and `docs/ENGINE-HOOKS.md` | every hook, trigger, predicate, op, profile, cost site and scope the engine has. **Look a thing up before you build it** |
| `docs/design/class-roster-rev4-proposal.md` | the frame: the four tiers, the nine classes, section 8: every ruling of Leon's and every call made for him |
| `docs/design/rev4-primitives.md` | the 12 general primitives and 13 closed-list rows the patch adds, their order, what each replaces |
| `docs/design/reactions-spec.md`, `chaplain-spec.md`, `shadow-spec.md`, `bonds-spec.md`, `figments-spec.md` | one spec a system: rules, the list, the ladder, the class's six moves, "Built from", balance, the other side, the screen, data |
| `docs/design/rev4-moves-and-rename.md` | the moves that change hands, the rename, the build order with the test that closes each step |
| `docs/design/balance-contract.md` | the ceilings. Reading for Classes 3.0 (Leon): the base class all in sits ON the ceiling, a door user about 13% under, a squared class about 13% over in its own column |
| `docs/TESTING.md`, `docs/design/handoffs/PICKUP.md` section 3 | which tool proves which change; how to take in a branch and read a golden-table or replay-hash failure |

## 3. The rules of this mission

1. **Nothing goes live without Leon's explicit word.** Classes 3.0 ships as one patch when all of section 4 is ticked
   and he has played it.
2. **Where the work lives.** Everything is built on branch `claude/charming-gauss-hbq4n0` (or, in a new session, on
   the branch that session is given, started from it). **From the first Classes 3.0 code commit that branch is NOT
   pushed to `develop`**: `develop` stays equal to live so a hotfix can be made from it. Docs-only commits may go to
   both. At the end: merge to `develop`, then `main`, backup branch, deploy (CLAUDE.md, Versioning and Live backups).
3. **Use the engine.** Every piece starts from its spec's "Built from" table. No per-item or per-system handler
   where a primitive exists; a missing primitive is added once, generally, to a closed list. Run
   `npm run built-from -- <range>` on your diff before you call a piece done. The lints' baselines may only shrink.
4. **Pin, then move.** Before changing a rule that exists (reactions, Guard, Momentum, Faith, heals), the golden
   tables on unmodified code are the reference; a changed line is either the ruling you meant (re-record on purpose,
   say so in the commit) or a mistake.
5. **Spec first, then data, then the validator** (`python3 tools/validate.py data`: 0 errors). Each system's rules
   go into `docs/rules/PHC-Core-Rules-v1.0.md` as one revision (1.28 onward, one per step below) with section 14
   items for every number, all PROVISIONAL.
6. **One piece at a time, each in its own git worktree** started from the working branch (`git merge --ff-only
   <branch>` first), removed as soon as it is merged; at least 8 GB free before starting one; long lists handed
   over as files. Two builders at most at once; they must not touch the same system.
7. **Measure before the next piece is laid on it.** Each system closes on the balance contract's guard with its new
   line in `data/rules.json` `balance`. Leon: use the budget as written; playtests find the real targets later.
8. **If you are Opus working alone:** you are builder and reviewer. After each piece, before merging, run a second
   pass as a reviewer with a fresh agent that gets only the spec and the diff (not your reasoning) and is told to
   find where the diff departs from the spec, builds beside the engine, or leaves a number out of data. Do not skip
   it for the three new systems or the reaction rule. If a spec is wrong or silent, do not invent: take the
   conservative reading, write it under "Calls made for Leon" in section 6, and go on.

## 4. The build, in order (tick as you go)

Each step: a builder agent with the brief of section 5; then the checks; then merge.

- [x] **0. The tools** (merged 13 Nov; the self-check still fails `rev4-moves-and-rename.md` for having no Built-from table: give it one before step 2): `docs/ENGINE-HOOKS.md` generated and checked by `npm run check`; `npm run built-from`.
- [ ] **1. The primitives** of `rev4-primitives.md`, in its order, with NO system built on them yet: each with its
      test, its lint baseline, the catalogue regenerated, and the bespoke handlers it replaces deleted. Golden
      tables and replay hashes unchanged (a primitive that moves a golden line is wrong).
- [ ] **2. The rename** (`rev4-moves-and-rename.md`): display names only, ids stay; the level-up picker, card
      texts, the spec, CLAUDE.md, the checklist; emblems listed in `art/briefs/ART-REQUESTS.md`.
- [ ] **3. Reactions and the Skirmisher** (`reactions-spec.md`): one door for every reaction, a reaction never
      triggers a reaction, Suppressed never blocks a protective one, Reflex (two), Killzone on both, Run and Gun.
- [ ] **4. The moves that change hands** and the small changes to Bulwark, Breaker, Sigilist.
- [ ] **5. The Chaplain** (`chaplain-spec.md`): Ward, Sanctuary, Smite, Verdict, the patron's presence.
- [ ] **6. Shadow and the Operative** (`shadow-spec.md`).
- [ ] **7. Tending, Bonds and the Mender** (`bonds-spec.md`); the Outburst re-measured after Empathy's free Pump
      moves to Will Power.
- [ ] **8. Figments, the Visualizer and the Rigger** (`figments-spec.md`): the owned-unit primitive first, with the
      drone, the beast and the twin moved onto it and their golden lines unchanged; then the forms.
- [ ] **9. The enemy side:** what each spec's section 8 asks of the AI, in one piece, after all systems exist.
- [ ] **10. The screen:** meters, tabs and hover cards of each spec's section 9; every new action through the
      descriptors (no client-built action); the browser suites extended (one new suite a system, in a group).
- [ ] **11. Balance:** every new line measured at levels 1, 5, 10, 20; `docs/design/balance-contract.md` and its
      guard updated; `PATCH-TALLY.md` (live against Classes 3.0, by system).
- [ ] **12. Close:** `docs/PLAYTEST-CHECKLIST.md` for Classes 3.0 (what to try, what right looks like, the calls
      made for Leon); `CHANGELOG.md`, the version; `npm run check` ALL GREEN and `npm run e2e -- all` green with
      nothing failing alone; then tell Leon it is ready and wait for his word.

## 5. The brief every builder gets (fill in the step)

> Project Heaven Cry, Classes 3.0, step N: <name>. Work in your worktree; first `git merge --ff-only <working
> branch>`; commit to your worktree branch, do not push, do not bump the version; report the branch. Read
> `docs/design/handoffs/CLASSES-3.0-PICKUP.md` sections 2 and 3, then <the spec>, whose every rule, number and data
> field is binding; `docs/design/rev4-primitives.md` for the primitives you may use. Build exactly the spec, from
> its "Built from" table: no handler where a primitive exists. Spec revision 1.NN in the Core Rules with section 14
> items; data; validator 0 errors. Tests: one per rule of the spec's section 2, read from data, not typed numbers;
> the golden tables may change only on <the lines this step is meant to change>: re-record on purpose and name
> them. Run `npm run built-from -- <range>` on your diff and fix every smell or justify it. `npm run check` ALL
> GREEN (a timeout on a loaded machine is not a failure: re-run that file alone with --testTimeout 300000); the
> browser suites that touch what you changed (`npm run e2e -- <names>`, on your own port with `--base`). Write
> `docs/design/handoffs/classes-3.0-step-N.md`: what was built, every number, every place the spec was silent and
> what you did, "How to add" for the next thing of this kind. If the spec cannot be built as written, stop that
> part, say exactly why, and go on. Final report under 200 words.

## 6. Calls made for Leon during the build (he can reverse any)

*(the design's own calls are in `class-roster-rev4-proposal.md` section 8)*

Step 1a (`docs/design/handoffs/classes-3.0-step-1a.md` section 3, rules 1.28 items 1750 to 1756):
1. Reactions not on Revision 4's kind list: a Call made as a reaction, Drink It In, Catch, Dance of Iron and Heart
   Overwatch are `attack`; Order and the Strike Call's dive `move`; Adamantile Plate and Share `protect`. So Suppressed
   still stops the Call, Drink It In, Catch and Order (item 1751).
2. An item op that is a reaction names its kind: `limit: {reaction: 1 or 2, kind}`.
3. `acted` for an attack names `attack` (mode in ctx); Analyze fires its own `acted`; only a nested `when: "acted"`
   effect is lifted onto the item.
4. A number block may carry `min` and `max` (the Finisher's cap).
5. `always_seen` is read by the sight words only; the fog and the AI honour it with its first user.
6. Riposte is not folded, and reactions that never opened a window still open none (step 3).

## 7. State when this was last touched

13 Nov 2026, later: **0.25.0 is live** (hover cards everywhere, one Clear jam for two guns, the live bugs, the hooks
catalogue; `backup/live-0.25.0`; `develop` = `main`). The design is complete and nothing of it is open (Leon's last
two answers: the Visualizer is a glove with a projector in the palm; prayer opens at Faith 1). Step 0 is done.
**Step 1 (the primitives) is the next thing to build**; from its first code commit the working branch is no longer
pushed to `develop`. In flight: see `git branch --list 'worktree-*'` and the `wip/` branches on the remote (a loop
pushes them while the lead is alive); a `wip/` branch whose step is not ticked above is unfinished work: judge it by
`PICKUP.md` section 3 before merging, or redo the step from section 5's brief.
