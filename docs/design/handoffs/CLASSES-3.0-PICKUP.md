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

**The watchdog (Leon, 13 Nov: "set up checkers to make sure they push their WIP branch and don't time out without us knowing").** While builders run, keep `tools/agent_watch.sh` running in the background: every five minutes it pushes each unmerged worktree branch to `wip/<branch>` on the remote, and it EXITS with a line (which wakes the session) when a worktree has shown no commit, no changed file and no test log for 40 minutes, or disk falls under 7 GB. On a STALL line: look at that worktree (`git -C <path> status`, its last commit, `ps` for its tests); if its agent is dead, its work is on `wip/`: start a new builder that fast-forwards to that branch and finishes the step (as was done for the hover-card work on 13 Nov). It runs just under two hours: re-arm it. Leon's instruction for the build: about three builders in parallel, the whole patch ready before he tests, target six hours from 13 Nov afternoon.

## 4. The build, in order (tick as you go)

Each step: a builder agent with the brief of section 5; then the checks; then merge.

- [x] **0. The tools** (merged 13 Nov; the self-check still fails `rev4-moves-and-rename.md` for having no Built-from table: give it one before step 2): `docs/ENGINE-HOOKS.md` generated and checked by `npm run check`; `npm run built-from`.
- [ ] **1. The primitives** (1a merged 13 Nov, reviewed: `classes-3.0-step-1a.md` and `-review.md`; **1b built 13 Nov, to review and merge**: `classes-3.0-step-1b.md` (P6, P10, P11, P12, P8, P9 without its `owned` action system, the addendum, the one hook for every roll to hit, the review's list); left for a step 1c or the systems' own steps: the batch rows `mend_mult`, `condition: "incoming"`, `intervention_keeps_witnessed`, `read`) of `rev4-primitives.md`, in its order, with NO system built on them yet: each with its
      test, its lint baseline, the catalogue regenerated, and the bespoke handlers it replaces deleted. Golden
      tables and replay hashes unchanged (a primitive that moves a golden line is wrong).
- [x] **2. The rename** (merged 13 Nov) (`rev4-moves-and-rename.md`): display names only, ids stay; the level-up picker, card
      texts, the spec, CLAUDE.md, the checklist; emblems listed in `art/briefs/ART-REQUESTS.md`.
- [x] **3. Reactions and the Skirmisher** (merged 13 Nov; all in 161 against 145, inside the band near its top; Reflex unmeasured: step 11) (`reactions-spec.md`): one door for every reaction, a reaction never
      triggers a reaction, Suppressed never blocks a protective one, Reflex (two), Killzone on both, Run and Gun.
- [ ] **4. The moves that change hands** and the small changes to Bulwark, Breaker, Sigilist.
- [ ] **5. The Chaplain** (`chaplain-spec.md`): Ward, Sanctuary, Smite, Verdict, the patron's presence.
- [ ] **6. Shadow and the Operative** (`shadow-spec.md`).
- [ ] **7. Tending, Bonds and the Mender** (`bonds-spec.md`); **the healing order** (Leon: Tending out-heals every other door: the Outburst's, the Sigil's and a Whisper's heal drop from 2.0 to 1.4 Soldier-turns in this step: `class-roster-rev4-proposal.md`, "The healing order"); the Outburst re-measured after Empathy's free Pump
      moves to Will Power.
- [ ] **7b. Healing and shields in percent of HP** (`docs/design/heal-shield-percent-spec.md`; Leon, 13 Nov: the top heal is 65% of HP a turn, the strongest shield soaks about two turns of a full assault, balanced by cost, a percent gate on every heal and shield). **Leon: built inside Classes 3.0, not as a hotfix before it** ("just implement it to Classes 3.0"). It sets the numbers of step 7 and re-fits every existing heal and shield; do it right after step 7's systems exist, before step 8.
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

**Standing instruction (Leon, 13 Nov): the lead's top-tier usage is at 50%. Everything that can go to Opus goes to Opus; the lead only merges, rules where a spec is wrong, and asks Leon what it needs in short numbered questions.** Design on Revision 4 is closed unless he reopens it.

*(none yet; the design's own calls are in `class-roster-rev4-proposal.md` section 8)*
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

Step 3 (`docs/design/handoffs/classes-3.0-step-3.md` sections 0 and 5, rules 1.30 items 1800 to 1813; built on
`worktree-agent-a87f47094562526ef`, finished on `worktree-agent-a5b91e20e7254055a` with the main line merged in; not
merged back):
1. Reflex lives in a base class's new `gain` list (moves held from class gain, beside the six); the Bulwark's 1 Guard and
   the Operative's Read can use it.
2. The Breaker does not Riposte with no Momentum, even with a weapon that lends the technique; the class gives the
   Answer with any melee weapon. An item can give an Answer (stat `technique:<id>`), not any other technique.
3. Fire Discipline's "first attack" is the first attack roll of your own turn, a free one included; its Aimed +1 also
   applies to a held aimed shot. **Measured: the Skirmisher all in is 173% against 145 (+19%; level 5 +30%) from the
   new first-attack cut alone (the long rifle); `npm run check`'s balance-contract guard fails on it (176%), and the
   Faith dabbler guard too (the saved AP buys a Whisper); the dial is the lead's to choose (not refitted).**
   **Ruled by the lead (item 1813): once a turn a weapon technique of 3 AP or more costs 1 AP less; a plain attack never.
   The finishing builder's reading: the free techniques (Shot, Aimed Shot, Cut) are never cut, so the Aimed Shot stays
   3 AP; with it cut the gun measured 170 (outside). As built: 164 / 168 / 166 / 145, mean 161 (inside 145 ± 12%); both
   guards pass.**
4. Keep one for a held shot refuses everything but the held fire and a Call made as a reaction; on by default, no screen
   switch until step 10.
5. Run and Gun: a move over 2 tiles leaves it waiting; its Pressure ends with the turn.
6. Special Ammo: a story load arms a no-magazine weapon for the next fight; flamers and launchers now take loads (only
   a consumable is refused). Speed Loader at 1 AP saves nothing and spends the turn's use.
7. Killzone's second attack in the next round spends that round's one reaction.
8. A move an item makes free keeps the move bank, for every item (Glass Runner's golden line moved: a negative bank).
9. Called Shot is `status: shelved` with a `future_home` until step 4.
10. **The replay coverage guard failed "actions with a door open" (19, needs more than 20)**: after the ruling the door
    line holds on its own (57) but "a player's unit Hidden" fell to 13; under the lead's leave to add (never remove), the
    sight game's blade also goes to ground on its third turn (hiddenPc 33, doors 62).
12. **The perk Bulwark is renamed Stonewall** (item 1812; Leon asked for a new name; Rampart was the lead's first choice,
    but the RAISE Grand form is "Ramparts"): display name only; the validator refuses a perk named as a class.
11. Reflex measured in whole fights: the second reaction is never used by the simulator's enemies (+0); unconfirmed:
    to measure in step 11 (the step 3 hand-off says what the simulator needs).

Step 1b (`docs/design/handoffs/classes-3.0-step-1b.md` section 4, rules 1.28 items 1762 to 1767):
7. The lead's "a Call that harms an enemy is not a reaction at all" is read conservatively: a hindering Call may still be
   made as a reaction (kind `attack`), as before; a helping one is `protect` (item 1764).
8. The tie kind `owned` (the drone, the beast, the twin) ends only with the fight and unmakes nothing, so a drone stays
   when its owner falls (as today). Figments want `on_end: unmake` and their owner's fall to end them: one kind for both
   (the drone unmade too) or a second kind for Figments? Built: one kind, the companions' behaviour kept.
9. `self_holds` takes rev4's object `{slot, door | item}`; Bonds' `["focus:empathy"]` is rewritten in that shape when a
   focus names its door in data (the Attuner).
10. P9's action system `owned` (a `turn: owner` unit's verbs, a `turn: auto` unit's driver) is not built: rev4 does not say
    how the reducer takes an action of a unit with no turn; it is Figments' to design (step 8).

## 7. State when this was last touched

13 Nov 2026, later: **0.25.0 is live** (hover cards everywhere, one Clear jam for two guns, the live bugs, the hooks
catalogue; `backup/live-0.25.0`; `develop` = `main`). The design is complete and nothing of it is open (Leon's last
two answers: the Visualizer is a glove with a projector in the palm; prayer opens at Faith 1). Step 0 is done.
**Step 1 (the primitives) is the next thing to build**; from its first code commit the working branch is no longer
pushed to `develop`. In flight: see `git branch --list 'worktree-*'` and the `wip/` branches on the remote (a loop
pushes them while the lead is alive); a `wip/` branch whose step is not ticked above is unfinished work: judge it by
`PICKUP.md` section 3 before merging, or redo the step from section 5's brief.

**The lead's rulings on step 1a's review (13 Nov; Leon can reverse):** (1) **Order** (Authority's Call): what the
ordered ally does is that ally's reaction, kind `move` or as the act requires; being a reaction it provokes nothing
(a reaction never triggers a reaction). (2) **Anchor's strike is kind `attack`**, not `protect`: Suppressed stops it.
(3) **Drink It In and the helping Calls are kind `protect`** (they help an ally and move or hurt nobody); a Call that
harms an enemy is not a reaction at all. (4) The standing-aura form of P5 is the reviewer's recommended shape.
