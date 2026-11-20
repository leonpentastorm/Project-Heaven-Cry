# Owed before Items 2.0: the verified list (19 Nov 2026)

Checked against the tree `E:/phc-wt/a0312` (live 0.31.11, `c22cc8f7b`), `CHANGELOG.md`, spec items 5501–5534, `git log -400`, and the `release/0.32` and `wip/0.32-effects` branches. Items marked done in the documents were checked in code or data where possible. Sizes: **S** is under an hour, **M** is a few hours, **L** is about a day.

## A. Already in a 0.32 lane (running or queued)

**Lane 1, shared pieces** (`release/0.32`; built so far: `d59d42b73`, `c7338ec99`, `585d58d29`)
- **Call price table.** 3 AP, 2 AP from 5 points, 1 AP from 9, once a turn; at 10 the reaction may pay. This also settles "Call steps 9 and 10 overlap". [attribute-proposals 2.2–2.3; SESSION-TODO R]
- **Call strength steps.** Move from 1/3/7 to 1/4/8 for all nine Calls; Rally and Brief re-stepped stronger; measure the other seven. [proposals 2.1, 2.4]
- **Perk-step schedule as data.** Alpha steps 3/6/7/9, forks at 4/8; beta and gamma steps 3/5/7/9; Mastered at 10. This is "spread the unlocks out". [proposals 4.1; SESSION-TODO T]
- **Old-save migration.** A free re-pick for betas and gammas with 3+ points; the 11 removed perks mapped; an old-save test. [proposals 2.5, 3.9]
- **Strain limit.** 3 at Composure 0, +1 at Composure 1/2/4/6/8; Will Power gives none.
  - Every text and test that states the old limit is updated.
  - The Will Power 4/6 forks must not give the limit back.
  - Report the nerf before it ships. [SESSION-TODO R; proposals 3.10]
- **Elemental resistance.** Pain Threshold gives 6% a point, the cap is 80%. List every other source, and say plainly that no gear gives resistance today (that is Items 2.0's armour work). [proposals 6]
- **`figment_forms` door** with its save migration. [proposals 5]
- **Approved primitives, built on the branch and not live:**
  - Flux as a resource row
  - the `at: limit` predicate
  - the target-aware price (N20)
  - `seen_range`
  - `reactRefusal` (answers spec 5530's "a won Parry rolled and dropped unsaid")
  - the `tech_rule:` data reference
- **Serial group for flaky browser suites.** Current list: fx-room, magic, title, resources, capture-skills, picking. **Not in the list:** voice, shadow, tending, slate, slate-title, slate-music, turn-card-side, sigil15-growth. [START-HERE 15 Nov; SESSION-TODO K]

**Lane 2, effects** (`wip/0.32-effects`: audit `293c414b0`, "no silent HP change" `1497f7d46`, prayer effects `8b24fe818` in progress)
- **Prayer effects R1–R8.** Includes:
  - typed numbers moved to data
  - Covering Fire 3×3 and the "99 rounds" text
  - Love Conquers' surrender
  - elements on prayer damage plus a thunder asset
  - per-patron sounds [scout-owed-fixes 15a; SESSION-TODO C4, Q2a]
- **Bond and Tending verb effects.** [lead's lane list]
- **Figment effects** (live trace first):
  - Husk Burst is silent
  - Redraw shown as a blink, Interpose as a walk
  - the order link from the owner
  - a destroyed Figment unravels
  - say/fx on order rows
  - `fieldRepair` bypasses `mend()` [scout 15b; C5]
- **Vow pop-up** when entering a mode, changed at rests; needs `c.vow` carried into the fight. [scout 11; F; Q2d]
- **Sounds** (CC0 / CC BY, credited): victory fanfare, defeat, lightning, thunderclap, heal shimmer, divine impact, level-up sting. LEVEL UP currently reuses the `feel_unlock` chime (spec 5524). [C8; O; Q2e]
- **Small UI:**
  - fork, action-row and trap icons still small
  - the legend's "Your trap" line
  - camera jump after an illegal far click (needs a browser repro)
  - fight-panel tabs wrap to a second row with every door open
  - status strip not drawn on the token face [K known 7; O; Q2f]

**Lane 3, the attribute lanes Body / Mind / Soul** (queued; ruling layer `2026-11-19-attribute-proposals.md`)
- **All nine attribute sheets, data first,** in the order Determination, Strength, Endurance, Agility, Perception, Intelligence, Expression, Insight, Virtue. [proposals 4.2]
- **All 36 fork options.** The 18 sealed ones:
  - Momentum 6: Spill, Headlong
  - Bonds 6: Long Thread
  - Shadow 4/6: Light Fingers, Lend the Dark, Lightkiller
  - Sigils 4/6, Outbursts 4/6, Prayer 4/6
  - Clean Break, now unblocked by N3b [SESSION-TODO R; spec 4652–4660]
- **Class audit.** Channeler first; 54 moves, 10 replaced or merged; the table goes to Leon. [SESSION-TODO T; ATTACK-PLAN scope 5]
- **Alphas give too much:** move the surplus to beta and gamma; one table for Leon. [SESSION-TODO T]
- **Leon-judged rulings 1–4 and 6–9:**
  - Camaraderie takes the healing verbs; Touch is cut
  - machine sabotage becomes the Operative's only
  - Second Wind becomes a Pain Threshold perk and Last Plate is cut (measure the solo Bulwark)
  - Rolling Start loses its free Charge
  - Speed Load and Quick Draw move to Reaction Speed; Flush Out becomes one 2 AP verb at Dexterity 5
  - Name the Sinner at Faith 2; Answered Prayer is cut
  - Empathy's Mastered becomes Threads That Hold; Mercy and Open Hand move to Insinuation [proposals 3]
- **Rite in the Field as Leon worded it:** every 5 of your own kills (3 at tier II), the next Crystallise is free. The builder first checks Crystallise's air draw goes through the price. [proposals 2.6]
- **Visualization redesign:**
  - forks Hard Light / Sharp Light and Many Hands / Masterwork
  - re-measure the level-1 Beast
  - `held_most` 5 and `bodies` 7
  - measure Sharp Light and Wake of the Kill together
  - Masterwork's order through N20 [proposals 5, 5b; expression.md 8]
- **`owned.ts unmakeOwned` leaves ties dangling.** Verified: it unties only `OWNED_TIE` (owned.ts:134), so masterwork and encore ties stay. Due when Masterwork is built (Mind lane). [expression.md] S
- **One owner per effect:**
  - Analyze 0 AP is Quick Read II only
  - Rumination's Index II becomes +2 on the next Brain save
  - Vault belongs to Athletics; Shadow's Vault is cut
  - Ward shown as "Warding Word" [proposals 2.7]
- **Mastered perks that are Narrator-only:** engine halves for the two the Intelligence sheet wrote. [proposals 2.8]
- **Passives that never ran:**
  - rebuild or cut: Answered Prayer, Righteous, Five Stars, Mercy, Veiled Insult, Feel Their Pain, Nobody Left Behind's carry half, Opening Argument
  - grep every unlock for an effect with no reader [proposals 2.9]
- **Per-sheet open items:**
  - Agility: Flush Out numbers; measure the solo Skirmisher
  - Endurance: the Guard cap of 4 makes "+1 plate" dead for non-Bulwarks
  - Insight: the solo Mender measure; an old-save Empathy test
  - Perception: free Hide may push the Operative over Shadow's 125 window; Brain Power charge cut and Clean Vent
  - Strength: Charge Carries +2 or +1 (Breaker 206% at level 20) [drafts section 8]
- **Parting Cut** (Ingenuity 9), listed but not built. [perception.md; 0.31.5 notes]
- **Playtest balance notes for the tables:**
  - Rolling Start
  - Razor Beast hits 47–50 at level 2
  - Channeler deals 152 damage for 32 MP
  - the Mender's to-hit and its unexplained enemy Bond [TRIAGE balance]

**Lane 4, Shadow** (queued)
- **Dark maps** for shrine, works and rim; measure clears; then Douse works. [scout 14a/b; C6]
- **Prone lowers seen range** (`seen_range`). Enemy vision is still a typed 12 and the tier notice is typed in three places. [scout 14c]
- **Detect view.** Also answers spec 5107 (a sight view per enemy). Fix alongside it:
  - the wisps' hover tip never opens
  - hover lifts the whole tile stack
  - the hover card stays on focus-visible
  - tile verbs send no choices [scout 14f]
- **Stalk:** 2 AP, +1 Shadow, from Hidden. [scout 14d]
- **Silent property.** Needs a design pass before a builder. [scout 14e]

**Lane 5, end of 0.32**
- **Measures against the baseline:**
  - the nine doors' stage-1 clears, solo and in four
  - Outburst steady and peak
  - the Figment ceiling
  - the Breaker blade line (182% against ~145)
  - Shadow's window [proposals 2.10]
- **Consolidation pass** over everything added since 0.29 (rule 4). Leftovers still in code from waves 2 and 3 include `COUNTED_ORDER` (containers.ts) and `_OWNER_USE_TYPES` (validate.py). [wave2-rulings; wave3 SHOULD-FIX]
- **One full browser run.** This would also run the Throw row's check, which is written and has never been run. [spec 5534]
- **Spec section 14** receives every new PROVISIONAL number. [proposals 2.10]

## B. Gaps: not in any 0.32 lane and not in the after-0.32 block

**Player-facing faults**
- **TRIAGE row 10: state fault to reproduce.** Forks picked at camp do not show in the MAGIC tab (Visualization), and the tab shows "1 spare core" with 5 held. [TRIAGE row 10] M
- **"Called Out" says "no save" but the target still rolls one.** The data has `skip_save: true` (classes.json `draw_fire`); the cause is not found. [TRIAGE row 13] S
- **"Needs Lore Master 1 (you have 1)".** [TRIAGE row 13] S
- **The Momentum preview shows "0 → 0"** on a Charge that goes to 5. Hit-time ops (Rolling Start, the Breaker's +2, Charge's run) are skipped by the preview, and fixing it needs a new primitive. [TRIAGE row 7; spec 5503] M
- **Stale multiplier texts:**
  - `feelings.json` still has 5 texts with "to the multiplier"
  - the Damage school text says "× your Soul multiplier × the stage multiplier" (soul_modules.json:184, also :835) [lead's review list] S
- **Pick-overlay tile notes use inconsistent wording.** [lead's review list] S
- **"Raise <Attribute>" has no structured refusal reason;** `fog.ts` Initiative regex. [lead's review list] S
- **The Primed boon fix is a workaround:** a data `turn_start` instead of `combat_start`. [spec 5506; lead's review list] S
- **Barrel In shares the Lunge technique's action id** and needs its own `group_actions` row. [spec 5531] S
- **Open guard's −2 shows only on the glove card,** not in the fight; no general display of carried defensive modifiers exists. [0cf490a26; START-HERE 16 Nov (c)] M
- **The field refuses minor actions on doubt.** `fieldRefusal` is still a heuristic (game.ts:3994–4005, "the lead rules on it"); no per-action data flag exists. [START-HERE 15 Nov] M
- **Healing brake per giver.** The data row is still `deferred` (rules.json `brake`). Its piece, the target-aware price, is now built on `release/0.32`, but no lane builds the brake itself. [SESSION-TODO D; spec 4640] M
- **Co-op stall:** one two-player fight in five stalled on the guest's turn (0.21.0), never reproduced. Separately, "I'll narrate" cannot be selected in a room and its ruling buttons are untested end to end. [SESSION-HANDOFF 6.2–6.3; coop-stall.md] L
- **Keeper portraits mismatch their names.** `survival-keeper-works` is Ivo Smetanin and `-rim` is Corra Vell (survival.json:648, 678). The recommendation to swap the names has stood since 15 Nov, so under "no answer means yes" it should be built. [START-HERE 8] S
- **Delivered art with no place in the game** (wiring, not new art):
  - 5 Tending passives
  - 3 resource marks
  - 7 tone marks
  - the Open Hand forms and stance
  - the camp's Ready sign
  - Stand Behind Me has no move in data
  - the Draw Fire placeholder [SESSION-TODO O; CHANGELOG 0.31.5, 0.31.7] M
- **Classes 3.0 leftovers:**
  - Case (Shadow)
  - Smite's chip on the attack card
  - aim marks on a Bonded ally
  - two Sanctuaries on one tile still stack
  - NULL on a Figment
  - the enemy squad plan against reactions
  - enemy versions of the doors
  - Reflex unmeasured
  - katana `FOCUS_IDS` [ROADMAP Now 4; CLASSES-3.0-PICKUP 6] L
- **Designed in 0.29, never built:**
  - the shield's second swing
  - the Breaker's wall slams and hurling
  - enemies breaking under Pressure (the AI does not read the states)
  - Hallow (consecrated ground)
  - bare fists counting as the glove family (overlaps Items 2.0) [CHANGELOG 0.29.0] L
- **Engine pieces listed as not built:**
  - a `per_stage` uses scope
  - a thrown Relic property
  - an fx event for "fight joined"
  - focus memory past the round
  - enemies moving for an angle on an unattacked character
  - the 45° cover arc [spec 5010, 4969] L
- **Magic oddities:**
  - a focus taken out of the off hand goes to the pack as kind `tool`
  - the two-glyph hook (item 586)
  - Sigil 1.5 not confirmed built [ROADMAP Magic] M
- **Narrator-only Mastered perks beyond Intelligence's two:** listed "for the next pass", with no slot. [proposals 2.8] M

**Balance**
- **Solo sustain and the tank's camp kit:**
  - the tank's camp kit clears 7 of 20 (Hand wraps, buckler)
  - the mixed squad clears 8 of 20 in the simulator
  - gunner, tank and Mender starve solo
  - the knife-and-pistol build is not in the simulator [SESSION-TODO D, Q2g; 0.31.2 K7; TRIAGE] M
- **Operative and Sigilist all-in builds clear stage 1 on 0 of 40 seeds** (bot or class, unknown). [lead's review list] M
- **Ceilings with mods fitted.** Guns reach 162–195% against the 145% line. [SESSION-TODO D; 0.29.0 known] M
- **Class lines:**
  - Figments door 119 and Rigger 123, against 130 and 150 (needs a class-only multiplier primitive)
  - Skirmisher 159 against 145
  - Hymn 138 against 150
  - the healer stall at level 20 [START-HERE Balance 2.0 4] M
- **The Dexterity melee line as a whole:** sabre and katana are over 165% all-in at level 10. [spec 5527] S–M
- **Shape's free Pump** stays at +0.12 until the Outburst peak band is refitted. [SESSION-TODO V] S–M
- **0.30's PROVISIONAL numbers never fitted:**
  - two shields' doubled Guard
  - the Bulwark's pool by rank
  - the follow strike's −2
  - Afterword
  - the feeds' 0.01
  - Drive's −2 and plate-back [CHANGELOG 0.30.0] M
- **Balance 2.0 leftovers:**
  - only 3 weapons are on the contract against the plain rifle
  - the repair rate of 10% is nearly free
  - the XP and stage fit is PROVISIONAL because the simulator never makes or sells materials
  - level 3 before the first Boss on only 42% of routes [START-HERE; SURVIVAL-PICKUP] L
- **A sparing Chaplain is not in the simulator** (A3). [CHANGELOG 0.31.6] S

**Tests and tooling**
- **No whole-game screenshot pass exists.** The `capture-all` draft was removed (`13cfaad7e`); `capture-skills` covers only the skill pages, so camp, path map, node kinds, rewards, fight tabs, victory, field, summary and settings were never read at 1600×900. [SESSION-TODO U] M
- **Never looked at in a browser by anyone:**
  - the field kit's Treat buttons
  - plate chips
  - shop icons
  - banners in motion
  - the field's three rounds
  - the status strip's group marks
  - the place card with its picture
  - the approach line in real play
  - the vault-chest reward
  - the mana forecast over the map [SESSION-TODO K, O, V] M
- **Small test faults:**
  - `fx-sweep`'s nine real-speed cases are refused with "no place to stand"
  - `tending.json` Bond card numbers are copies with no validator tie
  - live-site suites time out at 30 s on page load [START-HERE; SESSION-HANDOFF 6.4–6.5] S
- **Tests that call inner functions** (rule 5): `helpers/perkfight` writes `doorPicks` directly; `survival-field-actions` calls `fieldRefusal`. [wave2-rulings 4] S
- **The 0.30 review document for Leon's rulings** is not in the tree. [SESSION-TODO D] M

## C. After 0.32, before Items 2.0 (already recorded)

- **Hosting:** move site files off KV to Workers Static Assets; keep the KV namespace one release as a fallback. [ATTACK-PLAN After 0.32 1]
- **Preloader; connection fixes; server fixes.**
  - Connection: close code 4000, ping timer, old socket.
  - Server: guest token, host token length, coalesced view writes, purge alarm. [After 0.32 2]
- **The outside code review's performance work:** fight-screen render, bundle split, engine clone and migration gate, file splits, types; code-only sparse worktrees. [After 0.32 3]
- **Multiplayer input delay:** measure first, then optimistic feedback; a referee in the room server is the big option. [lead's facts]
- **Items 2.0 preconditions:**
  - Ask Leon before starting.
  - The first deliverable is a design document with the family tables and a Built-from table.
  - One consolidated primitives list approved.
  - Leon rules the staging (A engine and screens, B content, C Weapon Arts).
  - Armour slot audit; the lead has not verified the slot list.
  - Audit items that have an icon and no engine use: ration pack, chalk and wax, prayer beads, cigarettes (no reader); flare and torch unverified.
  - Draft the gun family forms.
  - Shield families: Heavy's movement number is PROVISIONAL.
  - The melee family table and in-world names; each gun variant's second skill; the unique concepts.
  - The Forge realign check: can per-weapon state override `scales_with`? [SESSION-TODO M, P, Q, X; ATTACK-PLAN scope]

## D. Waiting on a ruling from Leon

1. **Rest MP.** Since 0.31.10 no Survival node gives MP back except a Rest. Is that what you meant, or only the Boss? *Recommended: keep as built.* [SESSION-TODO V; CHANGELOG 0.31.10]
2. **Vow pop-up.** Is "Fight unsworn" a choice, and do Atheists get no pop-up? *Lead's pick: yes to both; under "no answer means yes" it gets built.* [F; ATTACK-PLAN rulings 6]
3. **Names.** Keep "APPROACH" and "Stalk"? *Lead's pick: yes.* [TAKEOVER Open with Leon]
4. **Bot names.** Rename Bot-scrambler, Bot Sense and Bot-thread, since they jam robots? Still in data (`data/*.json`: 3 Bot-scrambler, 1 Bot Sense). [SESSION-TODO E5]
5. **Head Down.** It sits under "Throw · Smoke grenade" because the grenade teaches it. Keep it there or move it? [ad919b3b5; TRIAGE 15]
6. **Share a Hit.** Should it get a per-point ladder row? Should it be a toggle rather than automatic? [spec 5452; CLASSES-3.0-PICKUP]
7. **Prayer range.** A prayer with no data range reaches every tile its caster sees. Is that intended? [spec 5525]
8. **Last Rites.** What does a heal on a Downed ally do when it must not stand them up? [spec 4636]
9. **Outburst "What it does" ways.** These can't be earned beyond the starting spell. *Lead: Strike free with the Damage school; Finish, Brand and Drain learned like modules; the other schools' ways checked the same.* [SESSION-TODO T]
10. **Hand's Hand stim.** It spends a stim on a full-HP ally for +0. [START-HERE 16 Nov (c)]
11. **0.29 rulings:**
    - Does a held Outburst swell on a turn you gained Guard? *Lead: no.*
    - Make bare-handed Outbursts harmful (+2 Strain a stage)?
    - One row-order rule for fight tabs? [START-HERE 16 Nov (b)]
12. **Tank kit and guns:**
    - The tank's free Buckler against the budget, and 3× healing cost.
    - Guns reach 195% with both perks: refit the perks or raise the line? [morning-report-0.29.0 §10]
13. **Camp budget.** 300 (survival.json:41) against your "like 200". [Balance 2.0 notes]
14. **All-in 7/1/1 builds** sit over every ceiling. Is the ceiling meant for a normal share only? [PLAYTEST-CHECKLIST item 29]
15. **Virtue sheet open items:**
    - Hymns at Faith 3 put two things on level 3. *Recommended: keep.*
    - Foresight's combat tier II.
    - Real Power merged into Rank Has Privileges II. [virtue.md 8]
16. **Strength sheet open items:**
    - Charge Carries: +2 or +1? *Measure first.*
    - Throw Down as the big verb at 5? *Recommended: yes.*
    - Raw Power 1 gating Momentum? *Recommended: no.* [strength.md 8]
17. **Shadow numbers.** The number of tiles Prone gives through `seen_range` is yours to set. Should Douse widen from lamps to any light? [scout 14b/c]
18. **Outburst 4.0:** the 25 feeling colours and the readings in spec items 801–818. [ROADMAP]
19. **Carry weight.** A 40 kg robot overloads a starting character. Change the weights or the overweight rule? This likely matters before Items 2.0. [ROADMAP; HANDOFF Open 2]
20. **The open calls listed for you** in the playtest checklist (Survival about 132, Classes 3.0 53, 0.23.0 29) and spec section 14. [PLAYTEST-CHECKLIST; HANDOFF Open 8]
21. **Leftover branches and folders.** May I delete `phc-figments2` (`design/figments-2`) and the ~25 non-git folders? [TAKEOVER State]

## E. Housekeeping

- **Live-version lines are stale.** CLAUDE.md:89 still says 0.29.0 is live; ROADMAP's header says 0.31.10. Update CLAUDE, ROADMAP, HANDOFF, START-HERE, SESSION-HANDOFF and the PICKUP files to 0.31.11. S
- **`MORNING-2026-11-19.md` was never written** (no MORNING file in the handoffs). Write it, or mark it moot in ATTACK-PLAN. S
- **Saint's Shield notes are stale:** `patrons.json` notes say 12 then 16, the data uses 34 × Blessing power, other docs say 40. S
- **At the 0.32 release, delete:**
  - the merged WIP branches: `wip/0.31.11-words`, `wip/0.31.12-fixes`, `wip/release-0.31`, `wip/lane-0.31-art`, `wip/lane-0.31-skilltab`, `wip/lane-0.31.2-known`, `wip/lane-0.31.5-picking`
  - `backup/live-0.31.10` (keep 0.31.11 and the new one, and 0.22.0 and 0.23.0 for good)
- **Unmerged branches to list for Leon:**
  - `design/*` (13 plus `figments-2`)
  - `lane/0.29-l1-recoil2`
  - `local/0.29-merge-with-alpha`
  - `review/0.29-*` (3)
  - `wip/worktree-agent-a4c26f7ceb4409c36`
  - `origin/feature/title-front-v6`
  - `origin/review/fable-first-read`
- **Worktrees and folders:** merged worktrees on E: (int030, field030, dex031, fit030, ui031, icons030, known0312, pick0315, skill031, art031, phc-029-pressure) and ~25 leftover folders await Leon's word; drive C: was 94% full; try sparse (no art/audio) worktrees.
- **Prune `art/_archive`** (310 MiB) once Leon has looked (1.0).

## F. Unknown (could not be verified either way)

- **TRIAGE row 9 (Figment trait descriptions):** `35c6b8a42` puts each trait's line on the designer's face, but the lead's review list still has rows 9 and 10 open. Confirm in the browser.
- **The Operative opens its first turn on ATTACK** while seen (Hide refused). `firstTurnTab` (doorView.ts:58) falls back by design; unclear whether APPROACH removes the case.
- **The SHADOW meter row clipped at 1600×900; a Chaplain getting two door tips in one fight** (0.29 faults). No commit addresses them; not checked on screen.
- **0.31.0 fight-panel leftovers:** "Cut 2 AP" against "Cut · 0 AP" (never reproduced), and "EMPT / Y" wrapping. 0.31.6's "the preview's AP is the price" may cover the first.
- **Strain folded at the fight's start** (the outside reviewer). It is pinned only while holding an Outburst; whether that is a fault needs a look.
- **The mana forecast above the small map** (0.31.10 z-index): never seen on screen.
- **Wave 3 SHOULD-FIX items 1, 2, 5–18:** partly cleared (`GUARD_DOOR_LINE`, `DOOR_HEADS`, `DOOR_TOKENS`, `TECH_ROW` are gone); the rest were not checked one by one.

## Found done (appendix)

- **0.30.1 hotfix content; F1–F7; the cover and firing-foe reveal:** live in 0.31.0.
- **0.31.2 known faults:**
  - F3 "not yet joined" (K1)
  - Patch and Triage between nodes (K5)
  - Relic properties for gloves, every category walked (K6)
  - a Pressed Boss checked (K3)
  - Strain's "NEAR THE LIMIT" at 0
- **The picking UI for every aimed action:** 0.31.5, rules 1.65.
- **Folds and the survival suite:** fold rules live 0.31.0; survival suite green after the 0.31.0 merge.
- **The skill ladder and wording:**
  - the 27 skills' rows in card style: `ce3740f18`
  - the Empathy enemy-Bond line: skills.json:4127
  - the wording passes: `2ecf426bd`, `720bd9603`, `333f818f4`, `f960d3385`
  - the Survival cards
  - the Outburst Damage ways said once: `1d7ba142f`
- **Perks and player text:**
  - old perks in the PERKS menu ("FROM YOUR SKILLS", 0.31.9)
  - "(a later step)": 0 left in data; the validator bans rule and item numbers (0.31.9)
- **Type and tips:** one type scale and the tip-anchor test (`38dcaecd1`).
- **Capped per-point gains:** `d33b5ff39`.
- **Magic and Survival fixes:**
  - Iron Heart as ruled: `fcd0426a2`
  - Strain shown while holding (0.31.9)
  - Syphon ×3 and no MP from nodes (0.31.9/0.31.10)
- **TRIAGE rows fixed:**
  - rows 1–8, 11, 12, 14
  - row 15: Run Through's option and Begin/Snap (`ad919b3b5`); the Finisher lock (`8db96c1b8`)
  - row 16: Mercy, Sigil Savant, Ingenuity's fork section, the Empathy creation line
  - the Guard soak and one Flux limit (`424cf0b95`, `f50f7ad8d`)
- **The fight's edges:**
  - no walking the fog before VICTORY, the alarm, APPROACH, the calm track, LEVEL UP for the room (spec 5520–5524)
  - the reach drawn by its boundary (5525)
  - token-card signs enlarge (5526, 5533)
- **Weapons:** the Kemizuchi blade and strikers on the line (`47cfb74d0`).
- **Tooling:**
  - `e2e.py` per-lane port: `733174816`
  - the level-up prompt from the lobby: `547542b0b`
- **Consolidation:**
  - wave 3 MUST-FIX 1: skeleton.ts:54 uses `techGroupOf`
  - wave 3 MUST-FIX 2: one Boss rule on `taunted` in conditions.json
- **Branches:** `lane/0.29-tabs` is merged.
- **Retired:** the Expression sheet's two primitives (declined); the old Iron Heart burn-skip hook (spec 5401–5402, void).

## Counts and the five gaps most likely to bite a player

- **Per group:** A: 45 · B: 37 · C: 5 · D: 21 · E: 6 · F: 7 · found done: 29.
- **Top five gaps in B:**
  1. **Solo sustain and the tank's camp kit.** Solo characters starve; the tank kit clears 7 of 20 and the mixed squad 8 of 20. Lane 5 measures it, but no lane fixes it.
  2. **TRIAGE row 10.** Forks picked at camp do not show in the MAGIC tab, and the spare-core count is wrong (1 shown with 5 held).
  3. **The Momentum preview's "0 → 0"** on the Breaker's Charge, the door players rate most.
  4. **Operative and Sigilist all-in builds clear 0 of 40.** If it is the class and not the simulator's bot, those players lose at once.
  5. **The co-op stall.** It was never reproduced, and it hits exactly the four-player rooms the game is built for.

## Leon's rulings, 19 Nov 2026 (evening)

- **(a) The 0-of-40 Operative and Sigilist result is the simulator's bot, not the class.** Leon and a friend tested the Sigilist and it is about Outburst level. The bot's policy is to be fixed; no class number changes because of it.
- **(b) Carry weight: nothing changes.** "You carry them to go somewhere else, not as an item."
- **(c) The camp budget stays 300** for now.
- **(d) Ceilings are a relative measure** of the effort a class puts in and the fun it gets back, not a hard line; all-in builds over a ceiling are not a fault by themselves.
- **(e) Everything goes into this patch.** "Add everything into this patch and work continuously until everything is achieved before we can go into Items 2.0 and art; the game has to be decent fun at 0.32." So every group-B item is 0.32 work.

## The gaps lane's findings on group F (19 Nov 2026, `wip/0.32-gaps`; pictures in the lane's `.check/gaps-shots/`)

1. **TRIAGE row 9 (Figment trait descriptions): fixed.** "+ New design" lists every trait with its line (`r10-new-design.png`).
2. **The Operative's first tab: not a fault.** A Proving Ground fight opens an Ingenuity 6 pistol user on SHADOW with Hide
   offered (`f-operative-shadow-1600.png`). `firstTurnTab` falls back to ATTACK only when the door's first row is refused
   (seen at the start), by design.
3. **The SHADOW meter row clipped at 1600 x 900: not reproduced** (no meter line is cut, `f-operative-shadow-1600.png`; the
   Shadow row is folded under "+2" at 0). **A Chaplain's two door tips: not reproduced** in one fight with tips on.
4. **"Cut 2 AP" against "Cut · 0 AP": not reproduced** (the rows read "Shot 2 AP", "Strike (weapon's butt) 2 AP",
   `f-empty-gun-attack-rows.png`). **"EMPT / Y": not checked** (the screenshot's empty gun did not take).
5. **Strain folded at the fight's start: not a fault.** The Strain row is open at the start (`f-chaplain-strain-start.png`).
   Seen beside it: **"STRAIN 0 / 4 · NEAR THE LIMIT" with the Emanator stowed** is the rule's own warning (a Begin without an
   Emanator in hand adds the air's Strain and would go over), but the word reads wrong at 0: a wording ruling for the lead
   ("BEGIN GOES OVER"?), not changed here.
6. **The mana forecast above the small map: not a fault.** The forecast sits above the grid and the small map inside the
   grid's corner, neither covering the other (`r10-fight.png`).
7. **Wave 3 SHOULD-FIX, item by item** (`docs/design/proposals/2026-11-consolidation-0.29-wave3.md`): **gone** 5 (the typed
   Guard soak and clamp), 6 (`fade ?? 0`), 8's why-texts (now placeholders), 13 (`_OWNER_USE_TYPES` reads `owned.ts`), 15
   (Called Out is `engine`), 16 (no sort on reason text in `fx/faith.ts`); **still open** 1 (forced moves on a Boss typed per
   item), 7 (Run and Gun's text and rule numbers), 8's `fx/guard.ts` `within` fallback, 9 (fx keyed on ids: the effects
   lane), 11 (`open-hand-2` `usable`, `shadow-2` `hideBlock` called directly), 14 (`enemySearchTile`: AI in code), 18
   (Launch's two copies of its AP); **not checked** 2, 10, 12, 17.
