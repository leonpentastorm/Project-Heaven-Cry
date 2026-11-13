# Shared brief for the Classes 3.0 system builders (13 Nov 2026)

You are building ONE system of Classes 3.0 in Project Heaven Cry. Work in your worktree; FIRST
`git merge --ff-only claude/charming-gauss-hbq4n0`, then `npm install` if node_modules is missing and `npm run assets`.
Commit to your worktree branch after EACH part (the machine has restarted without warning before; a watchdog pushes
your commits to the remote every five minutes and reports a worktree that shows no commit or changed file for 40
minutes). Do not push; do not bump the version; report the branch name.

**Three builders run at once on this machine, each on a different system.** So: run single test files while you
work (`npx vitest run --root packages/engine --testTimeout 300000 <file>`); the full `npm run check` only at the end
(a timeout on a loaded machine is not a failure: re-run that file alone); browser suites ONLY on your own port with
`--base` (read `tools/e2e.py`: the default runner kills other sessions' servers), and only the suites named for you.

**Stay in your lane, so three branches merge:** in `data/classes.json` edit only YOUR class's block; your verbs,
forms or prayers go in YOUR OWN new data file; in `packages/engine/src/classes/*.ts`, `faith.ts`, `magic.ts`,
`combat.ts` make the smallest edits your spec needs and do not reformat; add to the closed lists
(`effects/triggers.ts`, `data/effect_ops.json` `item_ops`) only when the hand-offs of step 1 say a row you need is
missing, appended at the END of the list with a comment naming your system; never hand-edit
`docs/ENGINE-HOOKS.md` (regenerate it with `python3 tools/engine_catalog.py`). The lead merges the three branches
and has the golden tables and replays re-recorded on the merged code: you re-record them on YOUR branch for YOUR
changes, and list in your hand-off exactly which golden lines moved and why, so the merge can be checked.

**Read, in this order:** `docs/design/handoffs/CLASSES-3.0-PICKUP.md` (sections 2, 3, 6); `docs/ENGINE-GUIDE.md`
("Stop: before you build") and `docs/ENGINE-HOOKS.md`; the step 1 hand-offs
`docs/design/handoffs/classes-3.0-step-1a.md`, `-1a-review.md`, `-1b.md` (its section 7: what was built, how each
primitive is used with a data example, what a system builder must add); `docs/design/rev4-primitives.md`;
`docs/design/class-roster-rev4-proposal.md` (your class's page AND every "Settled by Leon" block at the end: they
override the page); YOUR spec (named in your task), whose every rule, number and data field is binding, and whose
"Settled" notes at its end override its body; `docs/design/rev4-weapon-neutral-audit.md` (your class's rows: base
classes are weapon-neutral); `docs/design/heal-shield-percent-spec.md` only to know it exists: heal and shield
SIZES are re-fitted by a later step (7b) across the whole game: build your heals and shields with your spec's
numbers through the output profiles and named dials, so that step can move them by data alone.

**Build exactly the spec, from its "Built from" table.** No handler, counter, formula or second copy where a
primitive exists: verbs are `verb` items (P6) in data with `requires`, `grant_action`, `reach`; effects are item ops
with `when` / `if` / `limit`; amounts through the output profiles and number blocks; costs through `effects/cost.ts`;
limits through `effects/uses.ts`; reactions through `react()` with a kind; conditions through the condition table
(a condition may run item ops: P4); ties, zones, shield layers, owned units, toggles and `delay` as step 1 built
them; every roll to hit through the one hook. Texts carry `{=placeholders}`, never a typed number. If the spec
needs something no primitive carries, add ONE general row or field (as above), never a per-item handler, and say
so. Old bespoke code your spec replaces is deleted; lint baselines shrink or stay.

**Spec first, then data, then the validator:** a rules revision of your own in
`docs/rules/PHC-Core-Rules-v1.0.md` (number and section 14 item range are in your task; every number PROVISIONAL);
`python3 tools/validate.py data` 0 errors, with the validator rules your spec's section 10 lists. **Tests:** one
per rule of the spec's section 2 and per verb or move, numbers read from data; the class's old-save test (an old
character of this class loads; its move keys still resolve). **Pins:** golden tables change only on lines your
system means to change; replays: oracles (`paths-order`, `sight-order`, `shared-state`, `old-save`) first, then
`REPLAY_RECORD=1 REPLAY_FULL=1`; never edit a scripted test game to keep a coverage count: report a count that
falls. **The screen** (your spec's section 9): the meter in its one place, the tab's groups, hover cards through
the one card, every action through the descriptors (`actionsFor`; the client builds no action, cost or legality:
`boundary.test.ts`); icons by catalog id with today's fallback when the art is not in the repo yet. One new browser
suite for your system in `apps/web/e2e/`, added to a group in `groups.json`, playing the worked example of your
spec's section 1 in the Proving Ground. **The other side** (section 8): build what makes your system safe against
enemies now (guards, tier rules, what the AI must not be fooled or fooled by); list the rest for the enemy step.
**Balance:** measure your system's line with the tools in `packages/engine/test/balance/` (smallest sample) at
levels 1, 5, 10, 20, door user and class, and put the table in your hand-off; add your line to `data/rules.json`
`balance` and the guard test as your spec's section 7 says; do not refit numbers to hit it: report.

**Close:** `python3 tools/engine_catalog.py` regenerated and `--check` clean; `npm run built-from --
claude/charming-gauss-hbq4n0..HEAD` clean or each smell justified; `class-weapon-neutral.test.ts` passes with your
class's moves removed from its PENDING list; `npm run check` ALL GREEN; your suites green on your port. Write
`docs/design/handoffs/classes-3.0-step-<N>.md`: what was built, every number, the golden lines that moved, the
measurement, every place the spec was wrong or silent and what you did (conservative reading; add calls for Leon to
the pick-up guide's section 6), what is left for the enemy step and the screen step, "How to add" one more thing of
this kind. If a part cannot be built as written, stop that part, say exactly why, and go on. Final report under 220
words: branch; what is built and what is not; the measured line; the calls made; what the lead must rule on.
