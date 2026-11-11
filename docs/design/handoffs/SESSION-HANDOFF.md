# Pick-up note (written 11 Nov 2026, 13:40, with the session's usage nearly spent)

For whoever continues: a person, or a fresh AI session. Read `CLAUDE.md` first, then `docs/TESTING.md` (which tool
proves which change), then this.

## 0. First thing to do

**`docs/design/handoffs/BUGLIST-0.22.md`**: fourteen bugs and asks from Leon's playtest of 0.22.0, in order, starting with merging `origin/main` (0.22.0, a music expansion from another session) into this branch. Do that list before anything in section 4.

## 1. What is live

**0.22.0** at https://project-heaven-cry.leonpentastorm.workers.dev (`main` at `651ad63`: 0.21.0 plus a music
expansion merged by another session; this branch is 9 commits behind it). Leon decides every deploy; say what is ready and wait for his word. The release steps are at
the end of `docs/TESTING.md`. Releases were made from a clean copy (a `git worktree` of the release commit) while
agents worked in the main folder.

## 2. What is on the branch and not live

Branch `claude/charming-gauss-hbq4n0`. Committed and pushed, in order:

1. **Balance pass, stage A** (measures only): the fight simulator and reference builds
   (`packages/engine/test/balance/`), the baseline (`docs/design/handoffs/balance-sim-baseline.md`), the action price
   list, the engine and Narrator split, and the nine combo-perk deeds the engine now grants itself.
2. **Balance pass, step 1 = rules 1.15:** enemies by tier and level, a Vermin tier, criticals ×1.5 to ×2.0, 65% to hit
   at equal level, the 3-turn cooldown on conditional AP perks, 19 items relabelled engine-run, an Elite or Boss never
   one-hit by the level gap. Before and after: `docs/design/handoffs/balance-sim-step1.md`. All unit checks green;
   28 browser suites pass (two only at real speed, now listed as such in `tools/e2e.py`).
3. Design notes: `docs/design/proposals/2026-11-combat-roles.md` (who is wanted in which phase and encounter),
   `docs/design/proposals/2026-11-balance-pass.md` (the whole pass: targets, rulings, the peak rule, the 90/10 rule),
   `docs/design/handoffs/balance-questions.md` (every question put to Leon, his answers on top).

## 3. What was in flight when this was written: maps and camera

A three-agent workflow (`wf_330a0dc7-9eb`) on roadmap items 2b and 2c (`docs/ROADMAP.md`):

1. **Maps up to 26 × 26** (rules 1.16): done.
2. **The camera** (today's tile size, follows the play, drag and keys, edge arrows, small map, overview on M): done.
3. **An adversarial review in a real browser:** still running at 13:40.

**Their work was saved as a checkpoint commit, `2762b0a` ("CHECKPOINT, not verified"), while the review was still editing.** Anything the review changed after that is either in a later commit or still uncommitted in the working tree. To finish it:

1. `git status --short` to see it. Do not throw it away: it is two finished builds and a partial review.
2. `npm run check`. If it is green, the builds are sound at the unit level.
3. `npm run e2e -- camera mapzoom turn-order physical tabs right-panels`, then `npm run e2e -- all`. Suites that fail
   because they assumed a 16 × 11 map or the old zoom: fix the suite if the game is right.
4. `python3 tools/validate_art.py` (slow): the five map paintings were moved to `art/_archive/maps/` and taken out of
   the catalog; it must report no failures. `python3 tools/rehash_art_checksums.py` if checksums are stale.
5. Look at it in a browser at 1280 × 720, 1440 × 900 and 1920 × 1080 (the Proving Ground): tokens, HP bars and casings
   must be as readable as before; the camera must not fight the player.
6. Commit (explicit paths or `git add -A data docs packages apps tools art`), push. The agents' own reports are in
   `/root/.claude/projects/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/subagents/workflows/wf_330a0dc7-9eb/journal.jsonl`
   (one result line per finished agent) if that folder still exists.
7. If `npm run check` is red and cannot be made green in reasonable time, `git stash` the lot with a clear message
   and tell Leon; step 1 underneath it is good.

## 4. What comes next, in order

1. Finish and commit maps and camera (above). Leon plays it (three fights suggested in `balance-sim-step1.md`).
2. **The damage step of the balance pass**, framed by `2026-11-combat-roles.md`:
   - teach the simulator the six encounter types and three missing builds (Infiltrator, Trickster, Bard), and area and
     control play for the casters;
   - Defender, Bard, Trickster first (wanted nowhere today), then the Marksman (wanted everywhere), then the Mage's
     set-up turns (cheaper drawing at low level; a glyph that stays after an Evoke), then the Fighter's Momentum
     (a hit costs Momentum at most once a round: Leon's ruling);
   - weapon base damage by family (ordinary guns top out a bit under 150%; only launcher-class weapons with very
     expensive ammunition get 150%); a ranged technique beats the plain shot by 10 to 25% when its condition is met;
     Burst deals more than Shot and is worse to hit; spell criticals ×1.5 to ×2.0; bring the Blackpoint 700 and the
     breacher tube down.
3. The rest of "the engine takes everything it can": groups B, C, D of `docs/design/handoffs/adjudication-split.md`.
4. Later, already designed: effects and icons for the nine Calls; Weapon Arts; tri-scale armour; the M813 rewrite.

## 5. Things Leon has not ruled on (they take the recommendation until he does)

All in `docs/design/handoffs/balance-questions.md`. Also waiting: the 118 card-versus-game disagreements in
`docs/design/handoffs/text-pass-mismatches.md`; the roles grid in `2026-11-combat-roles.md` (which phase each class
owns); the choices in `docs/design/handoffs/rules-1.14-as-built.md`.

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
