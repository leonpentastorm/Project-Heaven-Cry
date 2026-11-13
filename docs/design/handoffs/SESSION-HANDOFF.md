# Session hand-off (brought up to date 12 Nov 2026, at the close of the balance pass and the engine foundation)

For whoever continues: a person, or a fresh AI session. Read `CLAUDE.md` first, then `docs/TESTING.md` (which tool
proves which change), then `docs/design/handoffs/PICKUP.md` (what is merged, how to take a branch in, what is left in
order). The older notes that used to fill this file (the 11 Nov checkpoints, maps and camera in flight, the damage step
brief) are done and live in the hand-offs listed in `README.md`.

## 1. What is live

**0.24.0, deployed 12 Nov 2026 on Leon's word** ("push all to live when done"; Worker version 9056a26f; `backup/live-0.24.0`). Before it: **0.23.0, deployed 12 Nov 2026 on Leon's word** (Worker version 7a7fe53c; `backup/live-0.23.0` and `backup/live-0.22.0` on the remote). Anything below that still says 0.22.0 is live, or that 0.23.0 waits for his word, was written before the deploy.

**0.22.0** at https://project-heaven-cry.leonpentastorm.workers.dev (`main` at `651ad63`: 0.21.0 plus a music
expansion). Leon decides every deploy; say what is ready and wait for his word. The release steps are at the end of
`docs/TESTING.md`. Releases are made from a clean copy (a `git worktree` of the release commit). Keep the
`backup/live-<version>` branches of the two latest live versions.

## 2. What is on the branch and not live

Branch `claude/charming-gauss-hbq4n0`, version **0.23.0** (bump and `CHANGELOG.md` entry done):

1. **The balance pass, rules 1.15 to 1.26:** enemies by tier and level, maps up to 26 x 26 with a camera, the guns'
   ceiling, Sigil, the Outburst round 2, healing and shields, Faith round 2, the defence step, MP off Determination and
   Insight, the fire doctrine, and the re-fit (every ceiling is what an all-in build reaches; the balance contract and
   its guard in `npm run check`). Every changed system against live: `PATCH-TALLY.md` (its live column was checked
   against `origin/main` on 12 Nov).
2. **The engine foundation:** one damage formula, saves, forced movement, costs and counters, conditions from data,
   fog of war in the engine including the fight log, action descriptors, item ops first pass (20 of 310 handlers
   moved), text numbers from data, performance about 3 times faster.
3. **Bugs from Leon's 0.22.0 playtest fixed** (`BUGLIST-0.22.md`), the artist's 77 icons shown, the browser suites
   grouped (61) and the eight failing ones repaired.
4. **Docs:** `docs/ENGINE-GUIDE.md` (how to add things), `docs/PLAYTEST-CHECKLIST.md` (what to try by hand, and the
   numbered calls made for Leon).

## 3. In flight

Nothing. All pieces are merged; no worktree agent is running.

## 4. What comes next, in order

1. On a quiet machine: one `npm run check` and `npm run e2e -- all` on the merged branch, both green (`PICKUP.md`
   section 4, "Close").
2. **Leon's playtest** with `docs/PLAYTEST-CHECKLIST.md`; he names which of the calls (section 14 there) to reverse.
3. **His word to deploy 0.23.0**; then the live backup branch.
4. **After live:** the item ops second pass (289 handlers are still code; `engine-foundations-3-item-ops.md` lists the
   order), the unmeasured systems (class moves, perks, Mastered perks, special rounds, Calls, reactions, armour; the
   list is `PATCH-TALLY.md` section 10), and the rest of wave 3 (Preview as a dry run, one state table, effects with a
   schema, rooms and the Narrator prompt, folding the spec's revisions into its body).
5. Later, already designed: effects and icons for the nine Calls; Weapon Arts (may break the ceiling as a charged
   ultimate); tri-scale armour; the M813 rewrite; the roguelike mode.

## 5. Things Leon has not ruled on (they take the recommendation until he does)

The numbered calls in `docs/PLAYTEST-CHECKLIST.md` section 14 and `PICKUP.md` section 6; the open questions in
`balance-questions.md`; the 118 card-versus-game disagreements in `text-pass-mismatches.md`; the roles grid in
`../proposals/2026-11-combat-roles.md`; the choices in `rules-1.14-as-built.md`; Bug 12 of `BUGLIST-0.22.md`.

## 6. Known problems

1. **Co-op stall, persistent** (`docs/design/handoffs/coop-stall.md`): one live two-player fight in five stalled on
   the guest's turn on 0.21.0. One real cause was fixed (the room relay); the stall itself was never reproduced with
   diagnostics on. If it happens: Report a problem on the stuck screen.
2. "I'll narrate" (a human Narrator) cannot be selected in a room, so the human Narrator's fight-ruling buttons are
   built but untested end to end.
3. The live site's title screen takes longer than 8 seconds to show its buttons to a test browser; suites that start
   from it time out against live (they pass locally). Raise the wait in `apps/web/e2e/lib.mjs` `click` for live runs.

## 7. Working habits that saved time here

- `npm run check` before saying done; `npm run try` for any rules question; `npm run e2e` for screens. Never a
  browser for a rules question.
- Agents: one file-ownership list each, no commits, no builds unless named as the one that builds; a second agent to
  review every build against the spec; the lead commits. Each run's script is in
  `/root/.claude/projects/…/workflows/scripts/`.
- Leon reads plain language: numbered, numbers with units, a recommendation on every question. Push notifications
  only for real questions and for "ready to deploy".
