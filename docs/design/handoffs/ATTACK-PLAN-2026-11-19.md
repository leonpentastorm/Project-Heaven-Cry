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

## Added 18 Nov (Leon): no walking the fog before VICTORY (lane 2, with the approach banner)

"That coupled with a fix for whatever makes you have to walk all the fog before victory shows up even if you kill
all foes too." Two things, both in lane 2, built and tested together with the approach banner and music:
1. **Reproduce first:** a Survival fight with two foe groups; kill every foe the squad has seen. Find which is
   true: (a) foes are still alive in the fog and nothing sends them at the squad (then it is the alarm below), or
   (b) every foe is dead and VICTORY still waits (a bug in the end-of-fight check or in the banner's wait on fog /
   effects: fix it so the fight ends the moment the last foe falls, wherever the squad stands).
2. **The alarm** (already owed): when a fight is joined, every foe group on the map is alerted and comes; ambushers
   keep their rule; the log says it once. Measure stage-1 clears before and after with `simRun`.
Test through the reducer: the last foe falls and the fight is over in the same action, with unexplored fog on the map.

## Added 18 Nov (Leon): menu text is tiny, and hover boxes repeat the card (lane 1)

"All text in our menus is TINY and sometimes they have a hover box but the text in the hover box is the same text
at the same size, really really useless." (Seen on the level-up screen's Dexterity fork cards: the tooltip of
"Converging Fire" prints the card's own paragraph again, same size.) Lane 1, with the screens redesign:
1. **One type scale for menus**, set in one place (CSS variables), checked at 1280x720 and 1600x900: body text of
   cards, rows and tooltips at least 15 px, secondary lines at least 13 px, nothing a player must read under 13 px.
   Sweep every menu screen (level-up, the "?" pages, creation, camp, shop, Forge, sheet tabs, the fight's panels).
2. **A hover box never repeats what is already on screen.** If the card shows the full text, it has no tooltip. A
   tooltip exists only to add what the face does not hold (the full text of a name shown short, a number's parts),
   and its text is larger or equal, never smaller. Remove every tooltip that duplicates its own card; add a test
   that a tooltip's text differs from its anchor's visible text.
3. The lead checks both in the screenshot pass before 0.31.11 ships.

## Leon's rulings of 18 Nov evening (they override lane 3's and lane 4's wording above)

1. **Rite in the Field** (replaces the tone-change proposal): every 5 kills in a fight (every 3 at tier II), the
   next Crystallise costs 0 AP and gives a mana core without taking mana out of the air.
2. **The Call's ladder** (replaces "reaches everyone in range"): each gamma's Call can be used once a turn. It costs
   3 AP; from 5 points 2 AP; from 9 points 1 AP. At 10: a Call may be paid with your reaction instead, and you may
   make one more Call that turn for 1 AP. (Steps of reach and strength that the ladder has today: the lead fits
   them around these costs in lane 3.)
3. **Every alpha has this shape:** 1 the door (grants the mechanic); 2 a small verb; 3 a perk step; 4 fork one;
   5 a big verb; 6 a perk step; 7 a perk step; 8 fork two; 9 a perk step; 10 Mastered. This MOVES the alpha's
   perk steps from 3 / 5 / 7 / 9 to 3 / 6 / 7 / 9 and its second fork from 6 to 8: a save that holds a step or a
   fork keeps it (lane 4 writes the migration and a test with an old save). Everything else an alpha gives today
   is surplus: it goes to the beta or gamma whose promise it serves, or it goes.
4. **Every beta and gamma has this shape:** four perks of two tiers each, and four perk steps at 3 / 5 / 7 / 9, so
   the player chooses which to keep (eight tiers on offer, four steps). Consolidate perks here: defence and combat
   support go to the beta; talk, role-play and quality of life go to the gamma. 10 is Mastered. Confirmed by Leon
   (18 Nov): levels 1, 2, 4, 6, 8 keep their per-point gain shown on the level (and the gamma its Call
   steps); the named passives at 3 and 5 become two of the four perks.
5. **The Strain limit:** 3 at Composure 0, +1 at Composure 1, 2, 4, 6 and 8, so 8 at Composure 10. Will Power gives
   none. (This replaces "+2 a step" above.)
6. Still the lead's pick unless Leon says otherwise: the names "APPROACH" and "Stalk", "Fight unsworn" in the vow
   pop-up, the 2020 "Bad for" lines off the page.

## Leon, 19 Nov: the "Good for / Bad for" lines stay, all of them, as written

"Nothing crude about them, your vision is one without humour and personality. Our players are not toddlers, they
are respectable adults." This voids every earlier line in this plan, the takeover note and the skill-pages read that
calls those lines crude, takes them off the page or leaves them for Leon to cut (lane 3 scope item 6, the open
question on "Bad for"). They are lore, they are on the face of the "?" page, and nobody edits them for tone. The
same holds for all 2020 text and the game's humour: the wording pass shortens rules text, never the voice.

## After 0.32: hosting and the code review (Leon, 19 Nov 2026)

Leon: "we have the paid 5$ plan for cloudfare now so upgrade to whatever method is best in that plan. After 0.32 is done."

Not before 0.32 ships. Then, in this order, each measured first:
1. Move the site's files off Workers KV to the best method the paid Workers plan gives (the lead's pick: Workers Static Assets; confirm limits and pricing in Cloudflare's docs first). Deploy becomes `wrangler deploy`; the KV namespace is kept one release as a fallback. Rooms stay on Durable Objects.
2. The preloader (wait for load, only the next screen's art), the connection fixes (close code 4000, the ping timer, the old socket on host/join), the server fixes (guest token, host token length, coalesced view writes, a room purge alarm).
3. The rest of the outside code review of 19 Nov (fight-screen render costs, bundle split, engine clone and migration gate with the replays as the test, file splits, types): the review file is Leon's upload "PHC-Code-Review-and-Optimization-Brief.md"; seven of its claims were checked true by the lead.
Code-only worktrees without `art/` and `audio/` (sparse checkout) may be used from 0.32 on, once the gate is shown to pass in one.
