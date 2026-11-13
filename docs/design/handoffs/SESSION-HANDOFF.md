# Session hand-off (brought up to date 13 Nov 2026, at the close of Classes 3.0)

For whoever continues: a person, or a fresh AI session. Read `CLAUDE.md` first, then
`docs/design/handoffs/LOCAL-SESSION-START.md` (the whole picture, for a session on Leon's PC), then `docs/TESTING.md`.
The mission just closed is `CLASSES-3.0-PICKUP.md`; the older notes are in the hand-offs listed in `README.md`.

## 1. What is live

**0.25.0** (13 Nov 2026, `backup/live-0.25.0`): one hover card everywhere, two guns' Clear jam, the live bugs, the
engine hooks catalogue. Before it 0.24.0 and 0.23.0 (`backup/live-0.24.0`, `backup/live-0.23.0`; `backup/live-0.22.0`
and `backup/live-0.23.0` are kept for good).

**Leon's word for 0.26.0** (13 Nov, before sleeping): when Classes 3.0 is finished and `npm run check` and
`npm run e2e -- all` are green with nothing failing alone, deploy it as 0.26.0 (merge to `develop`, then `main`,
`backup/live-0.26.0`) without waiting for him; if anything is red, do not deploy: leave it on the branch with a report
here. Check `git log -1 origin/main` to see which happened.

## 2. What is on the branch and not live

Branch `claude/charming-gauss-hbq4n0`: **Classes 3.0** (Class Roster Revision 4, rules 1.28 to 1.38), steps 0 to 12 of
`CLASSES-3.0-PICKUP.md` section 4: the primitives, the rename, reactions and the Skirmisher, the moves that changed
hands, the Chaplain, Shadow and the Operative, Tending and Bonds and the Mender, the level scale ×7.5 with heals and
shields in percent of HP (7b), Figments and the Rigger, the enemy side (9), the screens and M813 unlisted (10, 10b),
balance and Mag Dump (11), the close (12). `CHANGELOG.md` has the 0.26.0 entry (the version number is bumped at the
merge); `docs/PLAYTEST-CHECKLIST.md` section 0 says what to try and lists the 53 calls made for Leon.

The close's client fixes (13 Nov): the backpack suite's stale icon check; the Bond line between adjacent tokens is a
link mark; six combat tabs fit on one row; a Figment's group header shows its face; a feeling's unlock card no longer
sits between a gun's sound and its flash (a real bug the fx-sweep suite caught); the chaplain suite waits on state.

## 3. In flight

Nothing once step 12 is merged. Any `worktree-agent-*` branch not in `claude/charming-gauss-hbq4n0` is on the remote as
`wip/<branch>`; judge it by `PICKUP.md` section 3 before merging.

## 4. What comes next, in order

1. If 0.26.0 is not live: make `npm run check` and `npm run e2e -- all` green (nothing failing alone), then deploy on
   the 13 Nov word.
2. **Leon's playtest of 0.26.0** with `docs/PLAYTEST-CHECKLIST.md` section 0; he names the calls to reverse.
3. **Survival mode,** `docs/design/survival-spec.md`, stage 1 first (section 10's build plan), open questions on their
   recommendations; not deployed without a new word.
4. **The Forge art run** on Leon's GPU (`art/briefs/FORGE-PHC.md`), when he starts a local session.
5. The open items of each Classes 3.0 step (`LOCAL-SESSION-START.md` section 6 item 4 gathers them).

## 5. Things Leon has not ruled on (they take the recommendation until he does)

The 53 calls in `docs/PLAYTEST-CHECKLIST.md` section 0 (Classes 3.0) and the 0.23.0 calls in its section 14;
`CLASSES-3.0-PICKUP.md` section 6; `class-roster-rev4-proposal.md` section 8; the open questions in
`balance-questions.md`; Bug 12 of `BUGLIST-0.22.md`.

## 6. Known problems

1. **Figments sit under their balance line** (the Rigger 123 against 150, the door 119 against 130) with no gap
   between them: it needs a class-only multiplier (rules 1.38 point 5), a new primitive for the lead.
2. **Co-op stall** (`coop-stall.md`): one live two-player fight in five stalled on the guest's turn on 0.21.0; never
   reproduced with diagnostics on. If it happens: Report a problem on the stuck screen.
3. "I'll narrate" (a human Narrator) cannot be selected in a room; its fight-ruling buttons are built but untested end
   to end.
4. Against the live site, suites that start from the title can time out (the title is slow to a test browser); raise
   the wait in `apps/web/e2e/lib.mjs` `click` for live runs.
5. Nine of fx-sweep's nineteen real-speed cases are refused "no place to stand" in the Proving Ground (launchers, the
   flamer, grenades, the thumper): the suite counts them as refused, not failed, so those weapons go unchecked at real
   speed. Worth a look when someone is in the sweep.
