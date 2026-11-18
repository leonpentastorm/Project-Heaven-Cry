# Attack plan for the night of 19 Nov 2026 (starts 02:04, after the usage reset; Leon asleep)

Leon, 18 Nov: "make attack plan and set an auto implement plan with all the fork, and auto start as much stuff as
possible at 2:01 AM... 0.32 must be done before any item work." Live at the start: **0.31.10**. Release tree:
`E:/phc-wt/rel030` (branch `release/0.31`). Rules: CLAUDE.md (all of it), and "no answer means yes": the lead's
proposals below are built and listed in the morning report so Leon can reverse them.

## Read first (15 minutes, no agents)

1. `docs/design/handoffs/SESSION-TODO-2026-11-16.md` sections Q to V (rulings, the roadmap).
2. `docs/design/handoffs/2026-11-18-wording-replacements.md` and `-2.md` (paste-ready text).
3. `docs/design/proposals/2026-11-18-scout-attribute-tables.md`, `-scout-outburst-and-strain.md`,
   `docs/design/handoffs/2026-11-18-scout-owed-fixes.md` (where every change goes; no re-scouting).

## Budget and stop rules

- At most **five** build workflows in the night, one after another in the order below; lanes that do not touch the
  same files may overlap (W with A; never two lanes on `combat.js`, `shared.js`, `skills.json` or the goldens at once).
- Builders: `opus` for engine and rules, `sonnet` for text and data from these documents, reviewers `sonnet` unless
  the lane changes rules (then `opus`). Every brief names the scout document section it builds from.
- Each lane: WIP rule (commit and push per item to `wip/…`), `python tools/check.py`, `REPLAY_FULL` replays, the
  browser suites it touches (`NODE_PATH` to the main checkout's node_modules; one lane on port 8787 at a time).
- **Deploy a slice only when** its check and suites are green AND the lead has looked at screenshots of the changed
  screens (KEEP_SHOTS=1) and done the wording pass. Then: push `develop` and `main`, deploy (the routine of 18 Nov:
  `.claude/deploy-diff.py` in the main checkout, wrangler kv bulk put, `wrangler deploy`, verify the live bundle's
  version), `backup/live-<version>`, delete the third-oldest unprotected backup.
- A lane whose gate fails twice is left on its `wip/` branch, written up, and the next lane starts. Nothing is
  forced, nothing is deleted, no baseline is raised.
- Stop after lane 5 or at 08:00 local, whichever is first; write the morning report (below).

## Lane 1, "W": the words (0.31.11) — sonnet builder, lead's pass

1. Apply both wording replacement documents as written (text in data stays `{=placeholders}`).
2. The ladder layout: every level lists the per-point gains, then its own lines; no EVERY POINT block
   (owed-fixes note 4).
3. The 27 skills' rows and unlock lines in card style (82 rows, 64 lines), numbers with their unit.
4. The Outburst workshop shows the Damage school's four ways row for the first school (scout: `main.js:221` computes
   it and nothing renders it). Each way one line.
5. Iron Heart as Leon ruled: once a fight, on reaching Mana Shock, relieve 2 Strain. Approved primitive: an event at
   the Mana Shock entry (`magic.ts` near 997) that a data row can listen to.
5b. Rebuild the skill "?" page, the level-up screen and creation's Skills step to
   `docs/design/handoffs/2026-11-18-skill-screens-redesign.md` (a ladder table, spend-first level-up, one-line rows).
6. Then the lead reads the changed screens and the screens "still not read" in pass 2, fixes words directly, deploys.

## Lane 2, "A": owed fixes (0.31.12) — opus builder

From `2026-11-18-scout-owed-fixes.md`, in this order: the alarm (every group engages when a fight is joined; measure
stage-1 clears before and after on `simRun`), the calm track in FREE ROAM and before contact, the LEVEL UP banner
(whole room), the prayer reach boundary, the Throw row's browser check, `tools/e2e.py` on a per-worktree port, the
token-card chips opening the lightbox, duelling blade and strikers to the melee line.

## Lane 3, "D": the tables, written by the lead (no build)

From the attribute-tables scout, one proposal file `docs/design/proposals/2026-11-19-attribute-proposals.md`: for
each of the nine attributes the new ladders (Leon's rulings: beta and gamma passives at 2 and 4, perks at 3 / 5 / 7 /
9, Mastered at 10; one thing a level; the alpha's surplus moved into its beta and gamma), the class's six moves
(each must give what the ladder does not: replace duplicates), the alpha's four fork options (each on the door's own
resource; for a shelved one the piece it needs), the gamma's Call with a new step 10 ("the Call reaches everyone in
range"). Plus: the Strain limit (Composure only: 3, +2 at Composure 1, 2, 4, 6, 8), Rite in the Field (once a fight
change a held Outburst's tone for 0 AP; tier II twice). Lead's picks are final for the night (no answer means yes).

## Lane 4, "L": ladders, Strain, classes (0.32.0) — opus builder, opus review

Build lane 3's file: move the unlocks (data; saves keep what they hold), the Strain formula and every text and test
that states it, the class moves replaced, the Call ladder's step 10, Rite in the Field. Measure: the balance contract,
Outburst steady and peak, the nine door builds' stage-1 clears before and after.

## Lane 5, "F": the 18 shelved forks (0.32.1) — opus builder, opus review

Approved primitives for this lane (general pieces; check ENGINE-HOOKS first): Strain and Flux as resource rows
(N3b), the resource-amount predicate's `at: limit` (N10), a target-aware price (N20), `seen_range` (a stat on the
seen unit, one sight-range function). Build every option those unblock; an option that needs anything else stays
sealed and is listed with the piece it waits on. Each option: data row, picking UI (rules 1.65), one card line,
a reducer test, a measure where it changes damage.

## Not tonight

Shadow's dark maps, Stalk and Silent; prayer and Figment effects; the vow pop-up; sounds; Items 2.0 (ask-first).

## Morning report (write to `docs/design/handoffs/MORNING-2026-11-19.md` and say it in chat)

Live version; per lane: shipped / on a wip branch / not started, with the reason; every call made for Leon (each
reversible, one line); measures (clears, ceilings) before and after; what nobody has seen on screen; usage spent if
known; the next three things.
