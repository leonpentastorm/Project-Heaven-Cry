# Roadmap: what's next, and everything planned but not built (started at v0.0.1, 9 Nov 2026; kept current)

**Live: 0.31.11 (19 Nov 2026).** **This file is the only list of owed work.** Hand-offs describe a session's state and link here; they do not list work. An item leaves this file only with evidence (a commit or a test). Every item says when its state was last checked against the code.

Item format: `**Short name.** What is owed. [size S/M/L] [state: open | partly | not verified; checked in code 19 Nov 2026 | from documents only] [source]`. Sizes: S under an hour, M a few hours, L about a day.

How this list was made: the merged list of 19 Nov (`BEFORE-ITEMS-2.0`) was checked against the code, and `docs/design/handoffs/2026-11-19-code-verification.md` WINS where they differ (it also holds Leon's rulings of 19 Nov evening). Rulings that shape everything: **everything owed goes into 0.32, worked continuously, before Items 2.0 and art; 30% of the weekly usage is a target, not a cutting line; nothing is cut.** Hosting off KV and the outside code review come after 0.32, before Items 2.0.

Order: 0.32 (in progress) -> after 0.32 (hosting, code review) -> Items 2.0 (ask Leon) -> Later.

## 0.32 (in progress)

The 0.32 rulings layer is `docs/design/proposals/2026-11-19-attribute-proposals.md` (link, not copied; "proposals N" below means its numbered sections). Release branch `release/0.32`; effects on `wip/0.32-effects`.

### Shared pieces (`release/0.32`; checked against the branch 19 Nov 2026)

- **Call strength steps, the rest.** The steps moved to 1/4/8 (`514e66e23`); still owed: Rally and Brief re-stepped stronger, and the other seven Calls measured. [M] [partly; checked in code 19 Nov 2026] [proposals 2.1, 2.4]
- **Strain limit: the nerf report.** The limit is built (`514e66e23` D); report the nerf to Leon before it ships, and check the Will Power 4/6 forks do not give the limit back. [S] [partly; checked in code 19 Nov 2026] [proposals 3.10]
- **Elemental resistance: the source list.** Pain Threshold 6% a point under the 80% cap is built (`514e66e23` E, `dd62cf571`); still owed: list every other source and say plainly that no gear gives resistance today. [S] [partly; from documents only] [proposals 6]
- **Serial group for flaky browser suites, the rest.** The serial list exists (`585d58d29`: fx-room, magic, title, resources, capture-skills, picking); add voice, shadow, tending, slate, slate-title, slate-music, turn-card-side, sigil15-growth. [S] [open; checked in groups.json 19 Nov 2026] [START-HERE 15 Nov]

#### Built in 0.32 (not yet live)

- **Call price table.** 3 AP, 2 AP from 5 points, 1 AP from 9, once a turn; at 10 twice, and the reaction may pay. `514e66e23` A, `508402cdc` (skeleton-screens). [proposals 2.2-2.3]
- **Perk-step schedule as data.** `skills.json ladder` (alpha 3/6/7/9, forks 4/8; beta and gamma 3/5/7/9). `514e66e23` B. [proposals 4.1]
- **Old-save migration.** The free re-pick (`perk_remap`, `perkRev`, `migrateCharacterPerks`), the removed perks mapped, tests on the repo's old saves. `c58d03ff0`. [proposals 2.5, 3.9]
- **Strain limit** 3, +1 at Composure 1/2/4/6/8. `514e66e23` D. [proposals 3.10]
- **Elemental resistance** 6% a point of Pain Threshold, cap 80% in data. `514e66e23` E, `dd62cf571`. [proposals 6]
- **`figment_forms` door** with its save migration (figRev 2). `514e66e23` F. [proposals 5]
- **Approved primitives:** Flux as a resource row and `at: limit` (`d59d42b73`); the target-aware price, `seen_range`, `reactRefusal`, the `tech_rule:` reference (`c7338ec99`); each with its reducer test. [attribute-proposals; spec 5530]
- **Golden tables and replays re-recorded for rules 1.70.** `fe47c3744`.

### Effects (`wip/0.32-effects` merged into `release/0.32` at `b290bc3a5`; report `docs/design/handoffs/0.32-EFFECTS-AUDIT.md`)

- **Prayer effects, the rest of R1-R8.** Built: the wind-up and landing (`8b24fe818`), elements on prayer damage from the engine (`11a345ff6`), the storm's thunder (`6b18699c4`). Still owed: typed numbers moved to data; Covering Fire 3x3 and the "99 rounds" text; per-patron sounds. [M] [partly; checked in code 19 Nov 2026] [scout-owed-fixes 15a]
- **Everyone Home: the allies' tokens.** Its heals and shields are numbered now; the touched allies' tokens do not answer (the Miracle's landing skips `landOn`; audit re-run 19 Nov: "target token still (2)"). [S] [open; checked in code 19 Nov 2026] [0.32 effects audit]
- **Soothe has no log line.** The cleanse is drawn and named (CLEANSED, `11a345ff6`), but `tending.json tend.soothe`'s cleanse row has no `say`. [S] [open; checked in code 19 Nov 2026] [0.32 effects audit]
- **Tug on an ally already beside you draws nothing.** It now says so in the log (`a82b2ece3`); nothing is drawn on the map. [S] [open; checked in code 19 Nov 2026] [0.32 effects audit]
- **A Bond ending any other way has no event.** Let go is the engine's event now (`11a345ff6`); a Down, the Attuner leaving and sight still read the parting from two views (`bonds.ts noteTies`). Each needs `untie` callers in `kit.ts` to say it (a lead's call: one event in `untie` itself). [S] [open; checked in code 19 Nov 2026] [rules 1.72 item 5701]
- **The out-of-run vow change.** Out of a Survival run the standing vow changes any time out of a fight (rules 1.72 item 5705, PROVISIONAL): Leon to confirm. [S] [open] [rules 1.72]
- **Figment effects, the rest.** Built: the orders shown, Redraw a blink, Interpose a walk, a destroyed Figment BROKEN at once (`c8fda7784`), Husk Burst's number (`1497f7d46`). Still owed: `fieldRepair` bypasses `mend()`. [S] [partly; from documents only] [scout-owed-fixes 15b]
- **Sounds, the rest.** Built: victory fanfare, defeat sting, level-up sting, heal shimmer, the storm's thunder (`6b18699c4`). Still owed: a divine impact; a lightning sound apart from the thunder. [S] [partly; checked in code 19 Nov 2026] [SESSION-TODO C8]
- **Small UI.** Fork, action-row and trap icons still small; the legend's "Your trap" line; camera jump after an illegal far click (needs a browser repro); fight-panel tabs wrap to a second row with every door open. [M] [open; from documents only] [scout-owed-fixes]

#### Built in 0.32 (not yet live)

- **Bond and Tending verb effects.** The tend down a Bond, "Bonded to" on the token card (`875a5452c`); Soothe's cleanse shown (`11a345ff6`, rules 1.72 item 5700); Let go's parting from the engine's event (`11a345ff6`, item 5701); Tug's ally line (`a82b2ece3`, item 5706). Tests: `test/rules172-fx.test.ts`, `fx/bonds.test.ts`.
- **No silent HP change.** `fx/silent.ts` (`1497f7d46`); Everyone Home's shields through the one mend (`11a345ff6`, item 5703).
- **A state-only prayer says its name** from the engine's event (`11a345ff6`, item 5704).
- **Vow pop-up** at the camp, changed at a rest (`5640182a1`); the standing vow carried on the character by the engine, sworn as each fight starts; the device store and the auto-swear removed (`11a345ff6`, item 5705).
- **Status strip on the token face.** `4732369fe`.
- **The NOW PLAYING credit never covers a panel** (a chip at the top edge, opened on hover). `a82b2ece3`, item 5707.
- **PlaceScreen no longer imports `data/survival.json`** (the vow button asks the engine's `faithView` `vowChange`). `11a345ff6`.

### Gaps (player-facing faults and small things no lane owned)

- **Forks at camp not shown in MAGIC (TRIAGE row 10).** Forks picked at camp do not show in the MAGIC tab (Visualization), and the tab shows "1 spare core" with 5 held. Reproduce first. [M] [open; from documents only] [TRIAGE row 10]
- **"Called Out" says "no save" but the target still rolls one.** Data has `skip_save: true` (classes.json `draw_fire`); the cause is not found. [S] [open; from documents only] [TRIAGE row 13]
- **"Needs Lore Master 1 (you have 1)".** The refusal text contradicts itself. [S] [open; from documents only] [TRIAGE row 13]
- **Momentum preview shows "0 -> 0"** on a Charge that goes to 5. Hit-time ops (Rolling Start, the Breaker's +2, Charge's run) are skipped by the preview; fixing it needs a new primitive (lead approves first). [M] [open; from documents only] [TRIAGE row 7; spec 5503]
- **Stale multiplier texts.** `feelings.json` has 5 texts with "to the multiplier"; the Damage school text says "x your Soul multiplier x the stage multiplier" (soul_modules.json:184, also :835). [S] [open; from documents only] [lead's review list]
- **Pick-overlay tile notes use inconsistent wording.** [S] [open; from documents only] [lead's review list]
- **"Raise <Attribute>" has no structured refusal reason;** `fog.ts` Initiative regex. [S] [open; from documents only] [lead's review list]
- **The Primed boon fix is a workaround:** a data `turn_start` instead of `combat_start`. [S] [open; from documents only] [spec 5506]
- **Barrel In shares the Lunge technique's action id** and needs its own `group_actions` row. [S] [open; from documents only] [spec 5531]
- **Open guard's -2 shown in the fight.** It shows only on the glove card; the fight has no general display of carried defensive modifiers. [M] [open; checked in code 19 Nov 2026] [0cf490a26; verification]
- **The field refuses minor actions on doubt.** `fieldRefusal` is a heuristic (game.ts:3994-4005, "the lead rules on it"); no per-action data flag. [M] [open; checked in code 19 Nov 2026] [START-HERE 15 Nov]
- **Healing brake per giver.** `rules.json` brake is still `deferred`; its piece, the target-aware price, is on `release/0.32`, but nothing builds the brake. [M] [open; checked in code 19 Nov 2026] [spec 4640; verification]
- **Small test faults.** `fx-sweep`'s nine real-speed cases are refused with "no place to stand"; `tending.json` Bond card numbers are copies with no validator tie; live-site suites time out at 30 s on page load. [S] [open; from documents only] [SESSION-HANDOFF 6.4-6.5]
- **Tests that call inner functions** (rule 5): `helpers/perkfight` writes `doorPicks` directly; `survival-field-actions` calls `fieldRefusal`. Convert to real actions. [S] [open; from documents only] [wave2-rulings 4]
- **The 0.30 review document for Leon's rulings** is not in the tree. Write it. [M] [open; from documents only] [SESSION-TODO D]

### Body / Mind / Soul attribute lanes (ruling layer: the proposals file)

- **All nine attribute sheets, data first,** in the order Determination, Strength, Endurance, Agility, Perception, Intelligence, Expression, Insight, Virtue. [L] [open; from documents only] [proposals 4.2]
- **All 36 fork options.** The 18 sealed ones: Momentum 6 (Spill, Headlong); Bonds 6 (Long Thread); Shadow 4/6 (Light Fingers, Lend the Dark, Lightkiller); Sigils 4/6, Outbursts 4/6, Prayer 4/6; Clean Break (unblocked by N3b). Each: data row, picking UI (rules 1.65), one card line, a reducer test, a measure where it changes damage. [L] [open; from documents only] [spec 4652-4660]
- **Class audit.** Channeler first; 54 moves, 10 replaced or merged; the table goes to Leon. [L] [open; from documents only] [SESSION-TODO T]
- **Alphas give too much.** Move the surplus to beta and gamma; one table for Leon. [M] [open; from documents only] [SESSION-TODO T]
- **Leon-judged rulings 1-4 and 6-9** (proposals 3): Camaraderie takes the healing verbs and Touch is cut; machine sabotage becomes the Operative's only; Second Wind becomes a Pain Threshold perk and Last Plate is cut (measure the solo Bulwark); Rolling Start loses its free Charge; Speed Load and Quick Draw move to Reaction Speed and Flush Out becomes one 2 AP verb at Dexterity 5; Name the Sinner at Faith 2 and Answered Prayer is cut; Empathy's Mastered becomes Threads That Hold; Mercy and Open Hand move to Insinuation. [L] [open; from documents only] [proposals 3]
- **Rite in the Field as Leon worded it.** Every 5 of your own kills (3 at tier II), the next Crystallise is free. The builder first checks Crystallise's air draw goes through the price. [M] [open; from documents only] [proposals 2.6]
- **Visualization redesign.** Forks Hard Light / Sharp Light and Many Hands / Masterwork; re-measure the level-1 Beast; `held_most` 5 and `bodies` 7; measure Sharp Light and Wake of the Kill together; Masterwork's order through N20. [L] [open; from documents only] [proposals 5, 5b; expression.md 8]
- **`unmakeOwned` leaves ties dangling.** It unties only `OWNED_TIE` (owned.ts:134), so masterwork and encore ties stay. Due when Masterwork is built. [S] [open; checked in code 19 Nov 2026] [expression.md]
- **One owner per effect.** Analyze 0 AP is Quick Read II only; Rumination's Index II becomes +2 on the next Brain save; Vault belongs to Athletics and Shadow's Vault is cut; Ward shown as "Warding Word". [M] [open; from documents only] [proposals 2.7]
- **Mastered perks that are Narrator-only.** Engine halves for the two the Intelligence sheet wrote, and the other Narrator-only Mastered perks (listed "for the next pass", no slot yet). [M] [open; from documents only] [proposals 2.8]
- **Passives that never ran.** Rebuild or cut: Answered Prayer, Righteous, Five Stars, Mercy, Veiled Insult, Feel Their Pain, Nobody Left Behind's carry half, Opening Argument; grep every unlock for an effect with no reader. [M] [open; from documents only] [proposals 2.9]
- **Per-sheet open items.** Agility: Flush Out numbers, measure the solo Skirmisher. Endurance: the Guard cap of 4 makes "+1 plate" dead for non-Bulwarks. Insight: the solo Mender measure, an old-save Empathy test. Perception: free Hide may push the Operative over Shadow's 125 window; Brain Power charge cut and Clean Vent. Strength: Charge Carries +2 or +1 (Breaker 206% at level 20). [M] [open; from documents only] [attribute drafts section 8]
- **Parting Cut** (Ingenuity 9), listed but not built. [M] [open; from documents only] [perception.md; 0.31.5 notes]
- **Playtest balance notes for the tables.** Rolling Start; Razor Beast hits 47-50 at level 2; Channeler deals 152 damage for 32 MP; the Mender's to-hit and its unexplained enemy Bond. [M] [open; from documents only] [TRIAGE balance]

### Shadow

- **Dark maps** for shrine, works and rim; measure clears; then Douse works. [L] [open; from documents only] [scout-owed-fixes 14a/b]
- **Prone lowers seen range** (`seen_range`). Enemy vision is still a typed 12 and the tier notice is typed in three places. [M] [open; from documents only] [scout 14c]
- **Detect view.** Also answers spec 5107 (a sight view per enemy). Fix alongside: the wisps' hover tip never opens; hover lifts the whole tile stack; the hover card stays on focus-visible; tile verbs send no choices. [M] [open; from documents only] [scout 14f]
- **Stalk.** 2 AP, +1 Shadow, from Hidden. [M] [open; from documents only] [scout 14d]
- **Silent property.** Needs a design pass before a builder. [M] [open; from documents only] [scout 14e]
- **Case (Shadow).** Not built; it sits in `shadow.json` under `pending`. [M] [not built; checked in code 19 Nov 2026] [verification]

### Big leftovers (designed, partly or not built; each shrunk to the owed part)

- **Breaker's Into the Wall (P13) and Hurl (P14).** The `displaced` hook, Throw Down into an occupant and Grenadier's Arm exist; these two moves do not. [M] [partly; checked in code 19 Nov 2026] [CHANGELOG 0.29.0; verification]
- **Enemies breaking under Pressure.** Suppressed/Broken take AP, Pressed drops a held shot, Rout runs on a failed save. Owed: the AI acting on Broken ("must reach cover or drop Prone"); no flee or cower. [M] [partly; checked in code 19 Nov 2026] [verification]
- **Hallow (consecrated ground).** Nothing in engine or data. [L] [not built; checked in code 19 Nov 2026] [CHANGELOG 0.29.0]
- **Bare fists in the glove family (P11).** Overlaps Items 2.0. [M] [not built; checked in code 19 Nov 2026] [CHANGELOG 0.29.0]
- **Aim marks on a Bonded ally.** The engine read `aims_at: tied:<kind>` exists. Owed: a data row that uses it, and the display. [S] [partly; checked in code 19 Nov 2026] [verification]
- **Smite's chip on the attack card.** Needs riders in the attack preview. [M] [not built; checked in code 19 Nov 2026] [verification]
- **Two Sanctuaries on one tile still stack** (each halves). [S] [not built; checked in code 19 Nov 2026] [spec 1908]
- **NULL on a Figment.** `nullCatch` takes glyphs, zones and sigil walls only. [M] [not built; checked in code 19 Nov 2026] [verification]
- **Enemy squad plan against reactions.** Enemies avoid held lanes (`held_risk`). Owed: bait / two-mover plan. [L] [partly; checked in code 19 Nov 2026] [verification]
- **Enemy versions of the doors.** Sigil and Outburst casters, physical techniques per tier, Momentum and Pressure for all exist. Owed: enemy Guard, Shadow, Bonds, Figments, prayers. [L] [partly; checked in code 19 Nov 2026] [verification]
- **Enemy focus memory past the round.** This-round memory is built; carry it further. [M] [partly; checked in code 19 Nov 2026] [spec 4969(a)]
- **Enemies moving for an angle on an unattacked character.** [M] [not built; checked in code 19 Nov 2026] [spec 4969(b)]
- **Cover arc: a pillar outside the 45 degree arc counts nothing.** The arc is built (`rules.json arc_deg`); this is a design call, to rule before building. [S] [partly; checked in code 19 Nov 2026] [spec 4969(c)]
- **Engine pieces not built:** a `per_stage` uses scope; a thrown Relic property; an fx event for "fight joined". Each needs the lead's approval first (CLAUDE.md, no rebuild). [M] [not built; checked in code 19 Nov 2026] [spec 5010; verification]
- **"I'll narrate" in a room.** Human-mode code exists but picking it only shows "coming soon". Owed: the selection and the Narrator screen end to end, with the ruling buttons tested. [L] [partly; checked in code 19 Nov 2026] [SESSION-HANDOFF 6.2-6.3]
- **Co-op stall.** One two-player fight in five stalled on the guest's turn (0.21.0), never reproduced. [M] [open; from documents only] [coop-stall.md]
- **Delivered art with no place in the game** (wiring, not new art; `move-breath` is wired). Owed: the 7 Tending passive pictures (no `tend-verb` alias); `icon-resource-credits/xp/devotion` and the 7 `icon-tone-*` (`uiMarkOf('resource'/'tone')` never called); `move-open-guard`, `move-sway`, `move-counter`; `camp-step-ready` (checklist has no `ready` key); the `move-draw-fire` placeholder is not in assets.json. [M] [partly; checked in code 19 Nov 2026] [SESSION-TODO O; verification]
- **Stand Behind Me.** An icon exists, no move in data. [S] [not built; checked in code 19 Nov 2026] [verification]

### Fun and balance pass

- **Solo sustain and the tank's camp kit.** The tank kit clears 7 of 20 (Hand wraps, buckler), the mixed squad 8 of 20 in the simulator; gunner, tank and Mender starve solo. Fit it (camp budget stays 300, ruled 19 Nov). [M] [open; from documents only] [SESSION-TODO D, Q2g; TRIAGE]
- **Simulator bot policy for the Operative and Sigilist.** Their all-in builds clear stage 1 on 0 of 40 seeds. Leon ruled 19 Nov: this is the bot's policy, not the class (Leon and a friend tested the Sigilist: about Outburst level). Fix the bot; change no class number because of it. [M] [open; checked in code 19 Nov 2026] [verification: Leon's rulings]
- **Simulator builds missing.** The knife-and-pistol build and a sparing Chaplain (A3). [S] [not built; checked in code 19 Nov 2026] [CHANGELOG 0.31.6; verification]
- **Ceilings with mods fitted.** Guns reach 162-195% against the 145% line. Leon ruled 19 Nov: ceilings are a relative measure of the effort a class puts in and the fun it gives back, not a hard line; fit with that in mind. [M] [open; from documents only] [SESSION-TODO D; 0.29.0 known]
- **Class lines.** Figments door 119 and Rigger 123 against 130 and 150 (needs a class-only multiplier primitive); Skirmisher 159 against 145; Hymn 138 against 150; the healer stall at level 20. [M] [open; from documents only] [START-HERE Balance 2.0 4]
- **Reflex.** A measure tool exists (`defence-measure.ts reflexRow`); no fitted result. [S] [partly; checked in code 19 Nov 2026] [verification]
- **The Dexterity melee line as a whole.** Sabre and katana are over 165% all-in at level 10. [S-M] [open; from documents only] [spec 5527]
- **Shape's free Pump** stays at +0.12 until the Outburst peak band is refitted. [S-M] [open; from documents only] [SESSION-TODO V]
- **0.30's PROVISIONAL numbers never fitted.** Two shields' doubled Guard (measured at rank I only); the Bulwark's pool by rank (II and III); the follow strike's -2; Afterword; the feeds' 0.01; Drive's -2 and plate-back. [M] [open; checked in code 19 Nov 2026] [CHANGELOG 0.30.0; verification]
- **Balance 2.0 leftovers.** The rifle contract holds 4 guns plus greatsword and sabre (guns-measure covers all guns separately); the repair rate of 10% is nearly free; the XP and stage fit is PROVISIONAL because the simulator never makes or sells materials; level 3 before the first Boss on only 42% of routes. [L] [open; checked in code 19 Nov 2026] [START-HERE; SURVIVAL-PICKUP; verification]

### End of release

- **Measures against the baseline.** The nine doors' stage-1 clears, solo and in four; Outburst steady and peak; the Figment ceiling; the Breaker blade line (182% against about 145); Shadow's window. [L] [open; from documents only] [proposals 2.10]
- **Consolidation pass** over everything added since 0.29 (rule 4); leftovers still in code from waves 2 and 3 include `COUNTED_ORDER` (containers.ts) and `_OWNER_USE_TYPES` (validate.py); wave 3 SHOULD-FIX items not yet checked one by one. Report in `docs/design/proposals/`. [L] [open; from documents only] [wave2-rulings; wave3]
- **Whole-game screenshot pass.** `capture-skills` covers only the skill pages; camp, path map, node kinds, rewards, fight tabs, victory, field, summary and settings were never read at 1600x900 (the `capture-all` draft was removed, `13cfaad7e`). Covers what nobody has seen in a browser: the field kit's Treat buttons, plate chips, shop icons, banners in motion, the field's three rounds, the status strip's group marks, the place card with its picture, the approach line in real play, the vault-chest reward, the mana forecast over the map. [M] [open; from documents only] [SESSION-TODO K, O, U, V]
- **One full browser run.** Includes the Throw row's check, written and never run. [M] [open; from documents only] [spec 5534]
- **Spec section 14** receives every new PROVISIONAL number. [S] [open; from documents only] [proposals 2.10]

## After 0.32, before Items 2.0

Leon, 19 Nov: "we have the paid 5$ plan for cloudfare now so upgrade to whatever method is best in that plan. After 0.32 is done." Each measured first.

- **Hosting off KV.** Move site files to the best method of the paid Workers plan (the lead's pick: Workers Static Assets; confirm limits and pricing in Cloudflare's docs first). Deploy becomes `wrangler deploy`; keep the KV namespace one release as a fallback; rooms stay on Durable Objects. [M] [open; from documents only] [ATTACK-PLAN After 0.32 (archived)]
- **Preloader.** Wait for load, only the next screen's art. [M] [open; from documents only] [same]
- **Connection fixes.** Close code 4000, the ping timer, the old socket on host/join. [M] [open; from documents only] [same]
- **Server fixes.** Guest token, host token length, coalesced view writes, a room purge alarm. [M] [open; from documents only] [same]
- **The outside code review's performance work.** Fight-screen render costs, bundle split, engine clone and migration gate (the replays are the test), file splits, types; code-only sparse worktrees (no art/audio) once the gate is shown to pass in one. The review is Leon's upload "PHC-Code-Review-and-Optimization-Brief.md"; seven claims were checked true. [L] [open; from documents only] [same]
- **Multiplayer input delay.** Measure first; then show the click at once (optimistic feedback); a referee in the room server is the big option. [L] [open; from documents only] [lead's facts]

## Items 2.0 (ask Leon before building)

Nothing starts until Leon says so and 0.32 is live. Preconditions only; the contents live in the design files: `docs/design/proposals/2026-11-18-scout-items-2.0.md`, `docs/design/proposals/2026-11-19-items-2.0-families/`, `art/briefs/ART-REQUESTS-2026-11-19.md` and `art/briefs/prompts-2026-11-19/`.

- **Ask Leon before starting.** [S] [open; from documents only] [SESSION-TODO M, N]
- **First deliverable:** a design document with the family tables and a "Built from" table; one consolidated primitives list approved by the lead. [L] [open; from documents only] [SESSION-TODO N, X]
- **Leon rules the staging** (A engine and screens, B content, C Weapon Arts). [S] [open; from documents only] [SESSION-TODO Q]
- **Audits before design.** The armour slot audit (the lead has not verified the slot list); items with an icon and no engine use (ration pack, chalk and wax, prayer beads, cigarettes have no reader; flare and torch unverified); the Forge realign check (can per-weapon state override `scales_with`?). [M] [open; from documents only] [SESSION-TODO P, Q]
- **Still open design inputs.** The gun family forms; shield families (Heavy's movement number is PROVISIONAL); the melee family table and in-world names for borrowed weapon words; each gun variant's second skill; the unique concepts; armour grade pictures under S1. [L] [open; from documents only] [SESSION-TODO X]

## Later

- **Faith artifact and chapel.** The Faith design as an artifact and the chapel screen. [L] [open; from documents only] [old roadmap "After"]
- **Advanced classes as attribute pairs.** Three-tier weapons; batch 1 the 9 squared classes, batch 2 the ring of 9 hybrids, batch 3 the other 18; each faction's own Evoker or Emanator; shelved moves in `docs/design/move-pool.md`. [L] [open; from documents only] [class-roster-rev3-proposal section 7]
- **Class-changing system; "nutso butso" any-with-any classes.** [L] [open; from documents only] [Classes notes]
- **Roguelike mode and Campaign mode.** Stage 1 (five dungeons, 200-300 designed rooms, shop NPCs, encounter generator, world map, meta progression) and stage 2 (companions, dialogue trees, cosmetics); needs a player identity that outlives a room. Decision 115. [L] [open; from documents only]
- **M813 rewritten for World Play,** hidden until then. [L] [open; from documents only] [world-play-spec.md]
- **Weapon Arts, tri-scale armour, the open playstyles.** Belong with Items 2.0 stage C. [L] [open; from documents only] [proposals/2026-11-weapon-arts.md]
- **Dialogue trees with skill checks; voices per skill, companion and patron.** [L] [open; from documents only] [roadmap notes above, now in decision 115]
- **Sigil 1.5 follow-ups, Outburst 4.0 follow-ups.** Class-gated modules' behaviours, a flee rule (Contempt), per-unit sight (Dread), COMING SOON art slots; Grand forms with the Grand Sigilist. [M] [open; from documents only] [outburst-4.0-HANDOFF]
- **World Play gaps.** Enemy paths avoiding hazards; an enemy killed on the area map drops nothing; enemy weapon rarity; allies and companions fighting beside the party; talk and hazard panels in fights. [M] [open; from documents only] [world-play-A/B-HANDOFF, 1.1]
- **The Narrator.** Long turns, recaps, name detection, other providers untested with real keys, a live M813 playtest; Kokoro in R2 and a paid text-to-speech option. [M] [open; from documents only] [narrator-craft-HANDOFF]
- **More patrons and Faith leftovers.** The rival Thunder-Father, the "many masks" pantheon, Witnessed in the story, vow and Witnessed icons. [M] [open; from documents only] [blessing-2.0-spec 11]
- **Races, Sectors beyond Earth, accounts and cosmetics, selling campaigns.** [L] [open; from documents only] [decision 115]
- **Art that needs an artist.** Weapon and gear paintings, beast avatars, the Narrator's 3D Wick, Forge LoRA run (`art/briefs/ART-REQUESTS.md`). Prune `art/_archive` (310 MiB) once Leon has looked (1.0). [L] [open; from documents only]
- **The design canvas** brought back in line with the game at 1.0. [M] [open; from documents only] [CLAUDE.md]

## Waiting on Leon

Direct questions. Where the lead gave a recommendation, it is built as stated unless Leon says otherwise ("no answer means yes").

1. **Rest MP.** Since 0.31.10 no Survival node gives MP back except a Rest. Is that what you meant, or only the Boss? Recommended: keep as built (built as recommended unless Leon says otherwise). [SESSION-TODO V; CHANGELOG 0.31.10]
2. **Vow pop-up.** Is "Fight unsworn" a choice, and do Atheists get no pop-up? Lead's pick: yes to both (built as recommended unless Leon says otherwise). [SESSION-TODO F]
3. **Names.** Keep "APPROACH" and "Stalk"? Lead's pick: yes (built as recommended unless Leon says otherwise). [TAKEOVER]
4. **Bot names.** Rename Bot-scrambler, Bot Sense and Bot-thread, since they jam robots? Still in data (3 Bot-scrambler, 1 Bot Sense). [SESSION-TODO E5]
5. **Head Down.** It sits under "Throw - Smoke grenade" because the grenade teaches it. Keep it there or move it? [ad919b3b5; TRIAGE 15]
6. **Share a Hit.** A per-point ladder row? A toggle rather than automatic? [spec 5452; CLASSES-3.0-PICKUP]
7. **Prayer range.** A prayer with no data range reaches every tile its caster sees. Intended? [spec 5525]
8. **Last Rites.** What does a heal on a Downed ally do when it must not stand them up? [spec 4636]
9. **Outburst "What it does" ways.** They cannot be earned beyond the starting spell. Lead: Strike free with the Damage school; Finish, Brand and Drain learned like modules; the other schools' ways checked the same (built as recommended unless Leon says otherwise). [SESSION-TODO T]
10. **Hand's Hand stim.** It spends a stim on a full-HP ally for +0. Fix how? [START-HERE 16 Nov (c)]
11. **0.29 rulings.** Does a held Outburst swell on a turn you gained Guard? Lead: no (built as recommended unless Leon says otherwise). Make bare-handed Outbursts harmful (+2 Strain a stage)? One row-order rule for fight tabs? [START-HERE 16 Nov (b)]
12. **Tank kit and guns.** The tank's free Buckler against the budget (the budget stays 300, ruled 19 Nov), and 3x healing cost. Guns reach 195% with both perks: refit the perks, or accept it under your "ceilings are relative" ruling? [morning-report-0.29.0 s10]
13. **Virtue sheet.** Hymns at Faith 3 put two things on level 3 (recommended: keep, built as recommended unless Leon says otherwise); Foresight's combat tier II; Real Power merged into Rank Has Privileges II. [virtue.md 8]
14. **Strength sheet.** Charge Carries +2 or +1 (measure first)? Throw Down as the big verb at 5 (recommended: yes)? Raw Power 1 gating Momentum (recommended: no)? Recommendations built unless Leon says otherwise. [strength.md 8]
15. **Shadow numbers.** The number of tiles Prone gives through `seen_range` is yours to set. Should Douse widen from lamps to any light? [scout 14b/c]
16. **Outburst 4.0.** The 25 feeling colours and the readings in spec items 801-818. [old ROADMAP]
17. **The open calls listed for you** in the playtest checklist (Survival about 132, Classes 3.0 53, 0.23.0 29) and spec section 14. [PLAYTEST-CHECKLIST; HANDOFF Open 8]
18. **Leftover branches and folders.** May I delete `phc-figments2` (`design/figments-2`) and the ~25 non-git leftover folders? [TAKEOVER State]

Answered on 19 Nov (verification file): carry weight (nothing changes); camp budget (stays 300); ceilings (a relative measure, not a hard line, so "all-in 7/1/1 builds sit over every ceiling" is not a fault by itself); Operative and Sigilist 0 of 40 (the bot's policy).

## Housekeeping

- **Live-version lines** brought to 0.31.11 in CLAUDE, ROADMAP, HANDOFF, START-HERE, SESSION-HANDOFF and the PICKUP files (done 19 Nov in the commit that wrote this file; keep it current at each release). [S] [partly; checked 19 Nov 2026] [BEFORE-ITEMS E]
- **`MORNING-2026-11-19.md` was never written.** Write it, or mark it moot (the archived attack plan names it). [S] [open] [ATTACK-PLAN]
- **Saint's Shield notes are stale.** `patrons.json` notes say 12 then 16, the data uses 34 x Blessing power, other docs say 40. [S] [open; from documents only]
- **At the 0.32 release, delete** the merged WIP branches `wip/0.31.11-words`, `wip/0.31.12-fixes`, `wip/release-0.31`, `wip/lane-0.31-art`, `wip/lane-0.31-skilltab`, `wip/lane-0.31.2-known`, `wip/lane-0.31.5-picking`, and `backup/live-0.31.10` (keep 0.31.11 and the new one, and 0.22.0 and 0.23.0 for good). [S] [open] [CLAUDE.md WIP and backup rules]
- **Unmerged branches to list for Leon:** `design/*` (13 plus `figments-2`), `lane/0.29-l1-recoil2`, `local/0.29-merge-with-alpha`, `review/0.29-*` (3), `wip/worktree-agent-a4c26f7ceb4409c36`, `origin/feature/title-front-v6`, `origin/review/fable-first-read`. [S] [open]
- **Worktrees and folders.** Merged worktrees on E: (int030, field030, dex031, fit030, ui031, icons030, known0312, pick0315, skill031, art031, phc-029-pressure) and ~25 leftover folders await Leon's word; drive C: was 94% full; try sparse (no art/audio) worktrees. [S] [open]
- **Prune `art/_archive`** (310 MiB) once Leon has looked (1.0). [S] [open]

## Not verified

- **TRIAGE row 9 (Figment trait descriptions).** `35c6b8a42` puts each trait's line on the designer's face, but the review list still has rows 9 and 10 open. Confirm in the browser. [from documents only]
- **SHADOW meter row clipped at 1600x900; a Chaplain getting two door tips in one fight** (0.29 faults). No commit addresses them; not checked on screen. [from documents only]
- **0.31.0 fight-panel leftovers.** "Cut 2 AP" against "Cut - 0 AP" (never reproduced; 0.31.6's "the preview's AP is the price" may cover it), and "EMPT / Y" wrapping. [from documents only]
- **Strain folded at the fight's start** (the outside reviewer). Pinned only while holding an Outburst; whether that is a fault needs a look. [from documents only]
- **The mana forecast above the small map** (0.31.10 z-index): never seen on screen. [from documents only]
- **Wave 3 SHOULD-FIX items 1, 2, 5-18.** Partly cleared (`GUARD_DOOR_LINE`, `DOOR_HEADS`, `DOOR_TOKENS`, `TECH_ROW` are gone); the rest not checked one by one. [from documents only]
- **Keeper portraits against names.** Ids and names are mapped one to one in `survival.json` (the earlier claim of a mismatch is not confirmed); whether each face fits its name needs eyes (all are review-candidate art). [checked in code 19 Nov 2026 for the mapping; faces not verified]

## Removed on 19 Nov because the code shows it built

- **Shield's second swing.** `physical/core.ts` `follow()`; shield props `follows` and `mod_follow_guard`; `two_shield_mult`; test `follow-strike.test.ts`; Leon confirmed by play. (The old list called it unbuilt.)
- **Katana `FOCUS_IDS`.** Built from data (`character.ts`, `focus.door`).
- **The 45 degree cover arc.** `rules.json arc_deg`. (The pillar-outside-the-arc call stays above.)
- **A focus taken out of the off hand goes to the pack as `tool`.** Fixed (`packKindOf`).
- **The two-glyph hook (item 586).** `glyphs_per_tile`; its one holder is the shelved Stroke Gambler.
- **Sigil 1.5** (rules 1.10: strokes, study, word mastery, inflections, marks, Junctions). Built, tests `sigil15-*`.
- **The Operative opening its first turn on ATTACK while seen.** Not a fault: `firstTurnTab` (doorView.ts:58) falls back by design, since Shadow's verbs need Hidden.
- **Carry weight, camp budget, "ceilings are hard lines", the Operative/Sigilist class fault.** Answered by Leon's rulings of 19 Nov (see Waiting on Leon); the bot-policy fix stays in the balance pass.
- **Shrunk, not removed** (the built part is dropped, the owed part kept above): Breaker slams and hurling; enemies breaking under Pressure; aim marks on a Bonded ally; enemy squad plan; enemy versions of the doors; enemy focus memory; "I'll narrate"; delivered art with no place; the rifle contract's count (4 guns plus greatsword and sabre, not 3 weapons).
