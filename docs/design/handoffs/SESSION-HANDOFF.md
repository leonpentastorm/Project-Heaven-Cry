> **Note (14 Nov 2026): `START-HERE.md` in this folder is the current entry point; where it disagrees with this file, it is newer.**

# Session hand-off (brought up to date 14 Nov 2026, at the close of Survival)

For whoever continues: a person, or a fresh AI session. Read `CLAUDE.md` first, then
`docs/design/handoffs/LOCAL-SESSION-START.md` (the whole picture, for a session on Leon's PC), then `docs/TESTING.md`.
The mission just closed is Survival (`SURVIVAL-PICKUP.md`); the one before it is `CLASSES-3.0-PICKUP.md`; the older
notes are in the hand-offs listed in `README.md`.

## 1. What is live

**0.26.0** (Classes 3.0, `backup/live-0.26.0`): Class Roster Revision 4, rules 1.28 to 1.38. Before it 0.25.0 and
0.24.0 (`backup/live-0.25.0`, `backup/live-0.24.0`); `backup/live-0.22.0` and `backup/live-0.23.0` are kept for good.

## 2. What is on the branch and not live

Branch `claude/charming-gauss-hbq4n0`: **Survival mode, 0.27.0** (rules 1.39 to 1.49): the mode picker, the path map
as lanes with one guarded vault, generated fights and maps from the settings' kits, rewards, the full-screen shop, the
Forge, trainings, shrines, the Crossroads, gives, endless stages with boons and tiles, the tally and Report a run, and
the curve fitted by simulated runs (`survival-steps-9-10.md`). `CHANGELOG.md` has the 0.27.0 entry and the four
`package.json` files say 0.27.0. **Survival is not deployed without Leon's word for it** (the spec's rule: "not
deployed without a new word"). `docs/PLAYTEST-CHECKLIST.md` section S says what to try and lists the calls made for him.

## 3. In flight

Nothing once steps 9 and 10 are merged. Any `worktree-agent-*` branch not in `claude/charming-gauss-hbq4n0` is on the
remote as `wip/<branch>`; judge it by `PICKUP.md` section 3 before merging.

## 4. What comes next, in order

1. **Leon's word on Survival** and his playtest with `docs/PLAYTEST-CHECKLIST.md` section S; he names the calls to
   reverse. On his word: merge to `develop`, then `main`, deploy, `backup/live-0.27.0`.
2. **What the fit could not reach with data dials** (`survival-steps-9-10.md` section 5): the general additions it names,
   for the lead to rule on.
3. **The art Survival waits for** (`art/briefs/ART-REQUESTS.md` S1 to S9: node icons, boon icons, shopkeepers, the
   map backdrops and marker sheet, the place scenes, Boss portraits).
4. **The Forge art run** on Leon's GPU (`art/briefs/FORGE-PHC.md`), when he starts a local session.
5. The open items of each Classes 3.0 step (`LOCAL-SESSION-START.md` section 6 item 4) and of each Survival step
   (`SURVIVAL-PICKUP.md` section 2).

## 5. Things Leon has not ruled on (they take the recommendation until he does)

The calls in `docs/PLAYTEST-CHECKLIST.md` section S (Survival) and section 0 (Classes 3.0, 53), and the 0.23.0 calls in
its section 14; `survival-spec.md` section 12; `CLASSES-3.0-PICKUP.md` section 6; `class-roster-rev4-proposal.md`
section 8; the open questions in `balance-questions.md`; Bug 12 of `BUGLIST-0.22.md`.

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
6. **Survival's measured gaps** (`survival-steps-9-10.md` section 5): a Sigil caster alone and a party of four casters fall in stage 1 or 2; guns wear out by stage 3 to 4 with no repair in Survival but a grade step. Both need a general addition, not a dial.
