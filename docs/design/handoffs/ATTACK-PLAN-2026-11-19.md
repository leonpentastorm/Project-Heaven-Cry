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

## Added 18 Nov: read the 27 skill pages as a player (before lanes 1 and 3)

`.check/capture/skills/` holds one screenshot per skill's "?" page with the ladder open. Leon: "look at them and
from a POV of a player imagine how lost it is to put points into alphas and see 10000% mechanic while getting
NOTHING from the betas and gammas sometimes." The lead reads all 27 first and writes, per skill, two numbers into
lane 3's file: how many of its ten levels give something a player can feel, and how many things its busiest level
gives. Targets for lane 3's tables: no skill under 8 felt levels of 10; no level with more than two things; an
attribute's three skills within 2 felt levels of each other. The alpha's surplus goes to its beta and gamma.

## Leon's ruling on lane 3's scope (18 Nov, after the skill pages were read)

"Those good for / bad for lines are what the skill needs to actually deliver. Remove them if you want but the
design structure of alpha-beta-gamma needs to be there; add more perks, change perks and removing perks is on the
table; the whole class and skill system needs to be coherent and with all the forks in 0.32 before more complex
stuff like Items 2.0 and Arts can be fitted."

So lane 3 designs the WHOLE system, per attribute, as one coherent sheet, and lanes 4 and 5 build it as 0.32:
1. **Each skill's promise comes first.** For each of the 27, write one line from its EPCCG text and its "Good for /
   Bad for" lines (data/skills.json, docs/lore/EPCCG-Player-Character-Creation-Guide.md): who this skill is for and
   what it must let them do. Every level, perk, fork and Call of that skill is then judged against that line: it
   serves the promise, or it moves to the skill whose promise it serves, or it goes.
2. **The structure stays:** alpha = the door (how you fight), beta = how you survive in that door (it feeds the
   door and keeps you alive), gamma = how you talk, notice and command (its Call, and it removes its door's tax).
   One attribute's three skills read as one kit: a player who buys all three gets a whole playstyle.
3. **Perks are on the table:** the two perks of a skill, the Mastered perk and the combo perks may be changed,
   replaced, added to or removed (ids kept where a save holds them; a removed perk a save holds becomes its
   replacement). A perk must do something a ladder level does not.
4. **All forks:** every alpha's four options built or replaced with ones that can be built; none left sealed.
5. **Classes:** each base class's six moves give what the ladder cannot (the best user of the door).
6. The "Good for / Bad for" lines themselves come off the page face (they are design intent, and the page shows
   whether the skill delivers); the crude ones are not shown.
Nothing of Items 2.0 or Weapon Arts starts before this is live.

## Added 18 Nov: the outside playtest of 0.31.10 changes lane 2's order

`docs/design/proposals/2026-11-18-outside-playtest/TRIAGE.md` (the reviewer's nine files beside it). **Lane 2 does
that file's rows 1 to 16 FIRST** (self stim in a fight, unclaimed perk steps and fork at the start, the Evoke
self-hit, Second Wind missing, Parry without Durability, wrong prices and previews, Figment credit and log, and the
rest), each reproduced before it is fixed, then the owed fixes. Lane 3 takes its balance notes (Rolling Start, the
Beast, solo sustain). Lane 1 takes its text rows.

## Added 18 Nov (Leon): the approach gets its own banner and the roam's music (lane 2)

The approach before contact exists since 0.31.2 (rules 1.64: free movement until a foe sees you). Leon: "add a
phase when you enter the combat node but have not found any enemy yet, with its own popup banner too, the first one
every fight if the enemy do not see you at all, and make the songs the same as roam mode."
- When a fight opens in the approach, the FIRST big banner is the approach's own (lead's word: "APPROACH", sub-line
  "Unseen · moving is free"; words in `rules.json combat.cards`, PROVISIONAL), same component and hold as the others.
  BATTLE START then shows at contact, as today. A fight that opens with the foes already seeing the squad shows
  BATTLE START only.
- Music: the approach plays the same calm track as FREE ROAM (one data field for "quiet phases"); the fight song
  starts at contact with BATTLE START; after VICTORY the calm track returns for FREE ROAM.
- The turn strip says the phase in one word while it lasts ("APPROACH" in place of "YOUR TURN" is NOT wanted: keep
  YOUR TURN; the sub-line reads "Approach · unseen").
