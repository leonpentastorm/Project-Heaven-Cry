# Roadmap: what's next, and everything planned but not built (started at v0.0.1, 9 Nov 2026; kept current)

**Live: 0.33.0 (20 Nov 2026; rules 1.82 to 1.90; account `docs/design/handoffs/0.33.0-LIVE.md`). Next: Items 2.0 (`docs/design/proposals/2026-11-20-items-2.0-plan.md`): 0.34.0 stages A and B (B1 included; the rules 1.93 integration) are BUILT on `wip/release-0.34`, NOT LIVE without Leon's word (section "0.34" below).** **This file is the only list of owed work.** Hand-offs describe a session's state and link here; they do not list work. An item leaves this file only with evidence (a commit or a test). Every item says when its state was last checked against the code.

Item format: `**Short name.** What is owed. [size S/M/L] [state: open | partly | not verified; checked in code 19 Nov 2026 | from documents only] [source]`. Sizes: S under an hour, M a few hours, L about a day.

How this list was made: the merged list of 19 Nov (`BEFORE-ITEMS-2.0`) was checked against the code, and `docs/design/handoffs/2026-11-19-code-verification.md` WINS where they differ (it also holds Leon's rulings of 19 Nov evening). Rulings that shape everything: **everything owed goes into 0.32, worked continuously, before Items 2.0 and art; 30% of the weekly usage is a target, not a cutting line; nothing is cut.** Hosting off KV and the outside code review come after 0.32, before Items 2.0.

Order: 0.32 (LIVE 20 Nov 2026; what is listed under it as owed is still owed) -> after 0.32 (hosting, code review) -> Items 2.0 (ask Leon) -> Later.

## 0.32 (live 20 Nov 2026; the owed items below carry on)

The 0.32 rulings layer is `docs/design/proposals/2026-11-19-attribute-proposals.md` (link, not copied; "proposals N" below means its numbered sections). Release branch `release/0.32`; effects on `wip/0.32-effects`.

### Shared pieces (`release/0.32`; checked against the branch 19 Nov 2026)

- **Strain limit: the nerf report.** The limit is built (`514e66e23` D); report the nerf to Leon before it ships, and check the Will Power 4/6 forks do not give the limit back. [S] [partly; checked in code 19 Nov 2026] [proposals 3.10]
- **Elemental resistance: the source list.** Pain Threshold 6% a point under the 80% cap is built (`514e66e23` E, `dd62cf571`); still owed: list every other source and say plainly that no gear gives resistance today. [S] [partly; from documents only] [proposals 6]

#### Built in 0.32 (live in 0.32.0)

- **Call price table.** 3 AP, 2 AP from 5 points, 1 AP from 9, once a turn; at 10 twice, and the reaction may pay. `514e66e23` A, `508402cdc` (skeleton-screens). [proposals 2.2-2.3]
- **Perk-step schedule as data.** `skills.json ladder` (alpha 3/6/7/9, forks 4/8; beta and gamma 3/5/7/9). `514e66e23` B. [proposals 4.1]
- **Old-save migration.** The free re-pick (`perk_remap`, `perkRev`, `migrateCharacterPerks`), the removed perks mapped, tests on the repo's old saves. `c58d03ff0`. [proposals 2.5, 3.9]
- **Strain limit** 3, +1 at Composure 1/2/4/6/8. `514e66e23` D. [proposals 3.10]
- **Elemental resistance** 6% a point of Pain Threshold, cap 80% in data. `514e66e23` E, `dd62cf571`. [proposals 6]
- **`figment_forms` door** with its save migration (figRev 2). `514e66e23` F. [proposals 5]
- **Approved primitives:** Flux as a resource row and `at: limit` (`d59d42b73`); the target-aware price, `seen_range`, `reactRefusal`, the `tech_rule:` reference (`c7338ec99`); each with its reducer test. [attribute-proposals; spec 5530]
- **Golden tables and replays re-recorded for rules 1.70.** `fe47c3744`.

### Effects (`wip/0.32-effects` merged into `release/0.32` at `b290bc3a5`; report `docs/design/handoffs/0.32-EFFECTS-AUDIT.md`)

- **The out-of-run vow change.** Out of a Survival run the standing vow changes any time out of a fight (rules 1.72 item 5705, PROVISIONAL): Leon to confirm. [S] [open] [rules 1.72]
- **Small UI.** Action-row and trap badges still small (the fork chooser's icons are 56 px, `dbff25674`; the trap legend says whose trap); fight-panel tabs wrap to a second row with every door open; the MAGIC tab says "Known words 5 / 4" after the Proving Ground's Magic kit (the kit grants more words than the level-1 cap: a tools question); path-map stop labels crowd where two lanes run close at 1280. (The camera jump after an illegal far click was not reproduced in a browser, `camera.mjs` 2b, 0 px, `dd9ff23c9`: closed unless seen again.) [M] [open; 20 Nov 2026] [scout-owed-fixes; 0.33-LANE-SOUND.md]

#### Built in 0.32 (live in 0.32.0)

- **Bond and Tending verb effects.** The tend down a Bond, "Bonded to" on the token card (`875a5452c`); Soothe's cleanse shown (`11a345ff6`, rules 1.72 item 5700); Let go's parting from the engine's event (`11a345ff6`, item 5701); Tug's ally line (`a82b2ece3`, item 5706). Tests: `test/rules172-fx.test.ts`, `fx/bonds.test.ts`.
- **No silent HP change.** `fx/silent.ts` (`1497f7d46`); Everyone Home's shields through the one mend (`11a345ff6`, item 5703).
- **A state-only prayer says its name** from the engine's event (`11a345ff6`, item 5704).
- **Vow pop-up** at the camp, changed at a rest (`5640182a1`); the standing vow carried on the character by the engine, sworn as each fight starts; the device store and the auto-swear removed (`11a345ff6`, item 5705).
- **Status strip on the token face.** `4732369fe`.
- **The NOW PLAYING credit never covers a panel** (a chip at the top edge, opened on hover). `a82b2ece3`, item 5707.
- **PlaceScreen no longer imports `data/survival.json`** (the vow button asks the engine's `faithView` `vowChange`). `11a345ff6`.

### Gaps (player-facing faults and small things no lane owned; `wip/0.32-gaps` merged at `e52c9d90c`; report `docs/design/handoffs/BEFORE-ITEMS-2.0.md`)

- **Small test faults.** Live-site suites time out at 30 s on page load. (The effects-audit harness's Mender holds the Bond perks now and every Bond row acts: `62aff24af`, `3d53752d0`.) [S] [open; 20 Nov 2026] [SESSION-HANDOFF 6.4-6.5]
- **Tests that call inner functions** (rule 5): `open-hand-2` `usable` (the real path, a foe's melee miss answered by Riposte through `combat/end-turn`, did not run in the `fightWith` harness: the foe took its turn with no action) and `prayer2`'s `applyDamage`. (`shadow-2`'s `hideBlock` goes through `combat/hide`, `62aff24af`.) [S] [partly; 20 Nov 2026] [wave2-rulings 4; 0.33-LANE-ENGINE.md]
- **The 0.30 review document for Leon's rulings** is not in the tree. Write it. [M] [open; from documents only] [SESSION-TODO D]
- **The gaps lane's group F leftovers.** Owed: 8 `fx/guard.ts` `within` fallback (client); 11 the `open-hand-2` half (above); 12 the Outburst preview (`magic.ts previewOutburstPlan`) runs no `dealing`/`damage_out` hook, so Hot Blood and other dealing modifiers are missing from the damage chip (a real fault; the live Release is right); 14 `enemySearchTile` AI in code. Built: 1 a Boss and forced moves one rule (a displace row's `boss_tiles`), 2, 10, 17, and 11's `shadow-2` half (`dc6ee7467`, `62aff24af`, rules 1.86 items 7405-7407); 7 and 18 (`5eec84049`). [M] [partly; 20 Nov 2026] [BEFORE-ITEMS-2.0 group F; 0.33-LANE-ENGINE.md]

#### Built in 0.32 (live in 0.32.0)

- **A resource price of 1 names one** ("Load the Visualizer · 1 core"). `4e010c1e4`, spec 5601.
- **Called Out's card says what happens** ("Taunted even if its save holds"). `6bd9ca3e1`, spec 5602.
- **The Momentum preview runs the technique as a hit** (G1). `a04d01adb`, spec 5600; test `gaps-032` (after the Body merge it reads 1 to 1: the free Charge is gone, `a046c8bfb`).
- **Stale multiplier texts** (five feelings, the Damage school and Inverse). `62ede06b7`, spec 5603.
- **Pick-overlay tile notes in one wording.** `1ccc52467`, spec 5604.
- **The initiative line built per side; `fog.ts` parses no prose.** `683d87f50`, spec 5605.
- **"Raise <Attribute>" from structure:** `raiseNeed` (`c04435ae3`, spec 5606); the level-up screen reads it and says the reason once (`8c5e68e39`, `f41f1ef01`).
- **Barrel In has its own action id** (`barrel_in`, the old `lunge` an alias). `47bc77b9c`, spec 5608.
- **The field reads a flag per action** (`actions.json field`, G3). `f11bdd754`, spec 5609; the merge added the new lanes' rows and a test that no row outlives its action (`5d3e35949`).
- **The healing brake per giver.** Spec and data `a00837a90`; built at the one cost site with the price's target `d88e18704` (spec 5610; test `merge-032-review`).
- **Keeper names match their faces.** `efb42f4fe`, spec 5611.
- **Delivered art wired** (tone marks, XP / Devotion / credits marks, the camp's Ready sign, the Open Hand form chips). `00c51296e`, spec 5612.
- **A focus taken out of the off hand is a focus in the pack** (reducer test for the four foci). `bc76d2f50`.

### Body / Mind / Soul attribute lanes (ruling layer: the proposals file; merged into `release/0.32`: Body `a4a65ac53`, Mind `37cb8195c`, Soul `5d3e35949`; hand-offs `docs/design/handoffs/0.32-LANE-BODY.md`, `-MIND.md`, `-SOUL.md`)

- **Class audit.** Channeler first; 54 moves, 10 replaced or merged; the table goes to Leon. (The lanes changed moves one by one: Measured Blow, Retort, Reforge, Vanish, Sabotage, Backdraft, Quick Sketch, Occult Library; the audit table itself was not written.) [L] [partly; from the hand-offs 19 Nov 2026] [SESSION-TODO T]
- **Per-sheet open items.** Agility: measure the solo Skirmisher. Endurance: the Guard cap of 4 makes "+1 plate" dead for non-Bulwarks (a balance number); the solo Bulwark's rank II Second Wind fallback is not built and has no written design in the repo. Insight: the solo Mender measure. Perception: free Hide may push the Operative over Shadow's 125 window (Vanish's free Hide is unused by the policy). Strength: Charge Carries +2 or +1 (Breaker 206% at level 20). [M] [open; 20 Nov 2026] [attribute drafts section 8]
- **Playtest balance notes for the tables.** Rolling Start; Razor Beast hits 47-50 at level 2; Channeler deals 152 damage for 32 MP; the Mender's to-hit and its unexplained enemy Bond. [M] [open; from documents only] [TRIAGE balance]
- **Visualization: re-measure the level-1 Beast; measure Sharp Light and Wake of the Kill together** (the measure picked no forks; no Beast-at-1 tool). [S] [open; from the Mind hand-off] [proposals 5, 5b]
- **Warding Word "against a supernatural effect"** read as the next Brain or Heart save (PROVISIONAL). [S] [partly; from the Soul hand-off] [rules 1.75]

#### Built in 0.32 (live in 0.32.0)

- **Strength** (rules 1.73 items 5800-5819): Raw Power's ladder (Grapple 2, Throw Down 5), Spill and Headlong, Rolling Start without its free Charge, Guts and Intimidation four perks each, Measured Blow merged. `dce438554`, re-record `2053d31cc`.
- **Endurance** (5820-5837): Durability's ladder, Pain Threshold and Senses four perks each, Second Wind a perk, Last Plate cut, Retort and Reforge on the Bulwark. `8101214be`, re-record `747fc2ab1`.
- **Agility** (5840-5856): Slide at 2, Flush Out one 2 AP verb at 5, Athletics (Wall Run with Vault) and Reaction Speed (Speed Load with Quick Draw) four perks each. `b6d18b890`, re-record `7d42b57cd`.
- **Perception** (6000-6011): Ingenuity's ladder, Light Fingers, Lend the Dark, Lightkiller, Acuity and Vigilance four perks each, Vanish and Sabotage replaced, the Plant / Foul / Vault / Read Intent verbs cut. `e69aca52f`, re-record `c2737e3e3`.
- **Intelligence** (6020-6025): Overclock at 2, the charge cut 3/5/9, four forks, Rumination and Eloquence four perks each, Backdraft. `7e550c0db`, re-record `feece135b`.
- **Expression** (6040-6045): Cash in at 2, Hard Light / Sharp Light / Many Hands / Masterwork (tie kind `masterwork`), Improvisation and Charisma perks, Quick Sketch. `3a56c3ede`, re-record `5b318afe5`.
- **Determination** (6200-6208): Will Power's ladder (Overdraw at 2), four forks, Composure and Lore Master four perks each, ready designs to Lore Master, the Strain-free swell to Composure 6, Rite in the Field's 0 AP half. `66bf26c65`, re-record `7bf7bb226`.
- **Insight** (6210-6217): Empathy's ladder (Snap 2, Shield 5, Touch cut), Threads That Hold, Short and Long Thread, Camaraderie and Insinuation four perks each (the healing verbs moved into Camaraderie). `448b88a6d`, re-record `e1d0f3dd2`.
- **Virtue** (6220-6225): Name the Sinner at 2 (Answered Prayer cut), four forks, Conscience and Authority four perks each. `a53523d02`, re-record `be2df6982`.
- **All 36 fork options** built and offered (the Body, Mind and Soul lanes above; Spotter and the older ones were built before).
- **Passives that never ran:** rebuilt or cut (Answered Prayer and Feel Their Pain cut; Righteous, Five Stars, Mercy, Veiled Insult rebuilt; Nobody Left Behind's carry cut; Opening Argument built). Mind and Soul lanes above.
- **One owner per effect:** Quick Read II has Analyze at 0 AP, Index II +2 on the next Brain save, Shadow's Vault cut, Warding Word. Mind and Soul lanes above.
- **One fix for the removed perks on old saves** (the three lanes each found `migrateCharacterItems` dropping a removed perk before `perk_remap`): `character.ts remapRow`. `37cb8195c`.
- **The biggest all-in Release band set to what is measured** (spec 6226, PROVISIONAL). `5d3e35949`.

### Shadow (`wip/0.32-shadow` merged at `43d49feae`; hand-off `docs/design/handoffs/0.32-LANE-SHADOW.md`)

- **Sight checks still asked without the looked-at unit:** an ally's eyes on an ally (combat ~1361 and ~2868, faith, tactics 129, perks/d 115, perks/e 136, 726 and 845, physical/rules 80, classes/k 1336) and tile-only checks. The rules lane's call (rules 1.82): `seen_range` counts only for a hostile's eyes, so no code is owed unless Leon reverses it. [S] [a call made for Leon; 20 Nov 2026] [rules 1.70 item 5545]

#### Built in 0.32 (live in 0.32.0)

- **Dark maps** for shrine, works and rim (works and rim 1 to 2 lamps), Douse on a dark map, Prone's `seen_range`, one sight range (`eyeReach`), enemy notice and vision as tier data. `e45418996`, `9e6ebe053`, spec 6400-6408.
- **The shadow sightline** on the map (who sees each tile, eye lines, the SIGHTLINE switch). `72e99c3e6`.
- **Stalk** (2 AP, once a turn, from Hidden, +1 Shadow) as data. `e45418996`.

#### The review of the shared step: fixes built in the merge (live in 0.32.0)

- **M1** forms a legacy save kept outside the count are charged against the grant. `83ea69741`.
- **M2** the looked-at unit named everywhere eyes are asked; Chain Smoker and Lowland Born on the one sight range. `90575110d`.
- **m1** the once-a-turn Call cap for every Call paid in AP. `36f387321`.
- **m2** `reactRefusal`'s probe: Killzone and Iron Grip change nothing on it. `b35b12ba8`.
- **m4** (part) `formsKnown` through the one resolver. `b0e2a6ef2`.
- **m5** the door's own name on its pending pick. `d7282ae13`.
- **m6** no `perk_remap` on an alpha. `70df1bd54`.
- **m7** forks.json rows carry no `step`. `6d983e010`.
- **m8** the Parry probe test through the reducer. `0b1870444`.
- **m10** dead code and module-private helpers. `0f4e9523a`.
- **The Emanator stowed** says so on the Strain row (Step 3e). `079f78e2f`.

### Simulator (`wip/0.32-sim`; results and commands `docs/design/handoffs/0.32-MEASURES.md`)

Tests only (`packages/engine/test/balance/`): no engine source, no data, no game number changed.

#### Built in 0.32 (live in 0.32.0)

- **The Sigilist's run policy** (`run-policies.ts sigilRun`): no step beside a blade (the pistol, Clean Vent first); small game shot, not drawn for; the Line as long as the target needs and the turn pays; the core swapped before a Line; Overclock when Max Sigil words is under four; the opt-in `noCover` Line placement in `policies.ts sigil` (off for the contract). [fa8b00eb3]
- **The Operative's policy** (`door-policies.ts operative`): Shadow built to two before a Break (a Break that drops a foe at once), Tag, Stalk, Fade, a better unseen angle, the gun when it can't hide. [fa8b00eb3]
- **The doors' 0.32 picks as data** (`door-builds.ts DOOR_PICKS`: forks at 4 and 8, the four-perk betas and gammas; the Mender buys Pull Together for Tug); Grapple and Throw Down (Breaker), Flush Out (Skirmisher), Shield (Mender), Name the Sinner and the sparing Chaplain. [fa8b00eb3]
- **New builds and measures:** the Operative with the rack's rifle, revolver, and knife and pistol; the sparing Chaplain; the two-shield wall at ranks I to III, Drive, the follow strike and Afterword, the beta feeds, guns with mods fitted (`measures-032.ts`); the Reflex rush (`defence-measure.ts`); the Beast at level 1 and the Figment forks (`figments-measure.test.ts FIG_032`); the Shadow window in turns and HP removed a character-turn (`party-fit.ts`); `PF_TRACE=1` turn logs. [fa8b00eb3]

### Co-op (`wip/0.32-coop`; hand-off `docs/design/handoffs/0.32-COOP.md`; spec rules 1.80 items 6800-6802)

- **Input delay from far away.** Read on live with 0.33's ping line and report bundle from two places (Vietnam and the US); then diff views (bytes) or the room referee (`docs/design/proposals/2026-11-room-referee.md`) as the reading says. [M] [open; the measuring tool built in 0.33, `e012502f3`] [0.32-COOP.md; 0.33-LANE-ONLINE.md]
- **Co-op stall (0.21.0).** Not reproduced in 0.32's loop either (see the hand-off); `coop-loop.mjs` stays as the opt-in hunt. [S] [open; watch] [coop-stall.md]

#### Built in 0.32 (live in 0.32.0)

- **2a-2c, the room link:** a replaced link (4000) stops and says "Opened in another tab" with Take over here; ping and retry timers cleared on close; hosting or joining again closes the old link. `d2a5a6636`.
- **"I'll narrate":** selectable; the Narrator's desk (narration, checks with a TN, rulings Yes/No, a prepared fight); the fight screen's Narrator buttons tested end to end (`narrate.mjs`). `cc18b7e79`.
- **The co-op loop** (`coop-loop.mjs`, hop stamps) and the fight screen's way out counting only a real wait. `d2a5a6636`, `89abfaf66`.

### Enemy AI (`wip/0.32-ai`; hand-off `docs/design/handoffs/0.32-ENEMY-AI.md`; spec rules 1.79, items 6700 to 6714)

- **The side's memory past the round (spec 4969 a).** Built and OFF (`rules.json combat.focus_memory.carry` 0): any carry from 0.25 moves the defence-measure guard (the idle pair's first Down 4.2 rounds at most; measured 5). Waiting on Leon 24 (lead's pick: off). [S] [built, off; 19 Nov 2026] [rules 1.79 item 6703]
- **Enemy door verbs, the rest.** Built: the general door step, Challenge, Tag, Ghost Kill, Whispers (rules 1.83, `b78b40b5b`); Tug, Bond and Snap on the Heart adept through what a unit with no character holds (`unitGrip`, `gripHolds`), Slam on the Heartfire elite at Durability 5 (rules 1.86 items 7400-7402, `dc6ee7467`, `2982cc410`). Owed: a Figment order (no enemy Pictures yet). [M] [partly; 20 Nov 2026] [rules 1.79 item 6711; rules 1.83; rules 1.86]

#### Built in 0.32 (live in 0.32.0)

- **Enemies act on Pressure:** a Broken enemy reaches cover or drops Prone and stays down; a Suppressed one slides into cover and walks short; log lines from data. `591270294`, spec 6700-6702.
- **Focus memory per enemy:** keeps its target for 2 rounds, turns on whoever hurt it since. `591270294`, spec 6705-6706.
- **The angle (spec 4969 b):** a gunner whose every target is under fire walks up to 4 tiles for a shot at one nobody attacks, cover first. `591270294`, spec 6707.
- **The bait:** a Vermin or Minion walks into a seen held lane to draw the shot while a stronger ally holds out of it until the bait has acted. `591270294`, spec 6708.
- **Enemy Guard:** a row's `guard` gives Durability's door (plates, soak, Pressure on Guard, the Guard technique); the Heartfire elite has 3 plates. `591270294`, spec 6710.
- **Gating and the re-record:** no state written for a switched-off block (`a10729f25`); costs-outburst and 24 of 29 replays re-recorded on purpose, each named with the block that moved it (`cc5e74fae`, spec 6714). Survival stage 1 at 40 seeds: solo_gunner 31 to 30, four 38 to 38, mixed 30 to 31 (spec 6713).

### Leftovers (`wip/0.32-leftovers`; hand-off `docs/design/handoffs/0.32-LEFTOVERS.md`; spec rules 1.78, items 6600-6611)

- **Hallow and Into the Wall icons** (ART-REQUESTS 0g) and the hallowed ground's own look on the map (drawn as any data zone today). [S] [open] [spec 6605, 6607]

#### Built in 0.32 (live in 0.32.0)

- **Two zones of one kind on a tile do not stack** (two Sanctuaries halve once). `5ff4ae85e`, spec 6601.
- **NULL unmakes a Figment** on the tiles it covers (`sigils.json null.dispel`). `b71439891`, spec 6602.
- **The fight joined is an fx event** (the alarm's, `joined`; CONTACT! on the map). `6048d2b07`, spec 6603.
- **Aim marks on a Bonded ally** (Threads Reads them at the Bonder's turn start; one crosshair with the count). `9730b403f`, spec 6604.
- **Into the Wall** (the Breaker: a foe driven into a wall, the edge or a body takes a slam, the body too). `0ab9fbc1c`, spec 6605.
- **Hallow** (the Chaplain's hallowed ground; zone kinds are data). `7f20b1261`, spec 6607.
- **What rides on a hit on the attack card** ("On a hit: Smite, Judged"). `6f6f796d8`, spec 6608.
- **A door's passive steps on the skill page** (the Tending pictures placed). `5a1f6b50d`, spec 6609.
- **The Open Hand's stance picture on the token card's standing line** (each to-hit term names its item; the picture by catalog `data_ids`). `dac6f60a6`, spec 6613.

### 0.32: needs a primitive (ruled by the lead 19 Nov 2026; built by the engine-pieces lane, `docs/design/handoffs/0.32-ENGINE-PIECES.md`, rules 1.77)

What is left of the list (the built ones are under "Built in 0.32" below):

- **Not approved, left as they are:** a story `acted` (Index II across story and fight), bare fists in the glove family and a thrown Relic property (Items 2.0). [rules 1.77 item 6516]

#### Built in 0.32 (live in 0.32.0; the engine-pieces lane, rules 1.77 items 6500-6515)

- **`targets.if`** (predicates on each unit of an op's set): Five Stars II reaches the rank-and-file only. `9cfecf56e`, item 6500.
- **grant_action `tab`**: the Tending verbs on Camaraderie's perks show on the TEND tab. `851dcdbd9`, item 6501.
- **`acted` carries a Call's id**: Read Intent reads the Spot on `acted`, its marks on the price gone. `07a149588`, re-record `4b416f1b8`, item 6502.
- **`cond_apply` carries the action and its aimed unit** (`target_aimed`): Called Out skips the Challenge's roll for the named foe, its card says no save. `648ba50cb`, item 6503.
- **`limit.shared` and the negated resource bound** (`self_not_res`): Stalk under the door's two gains a turn, refused at a full meter. `ae59a52dd`, item 6504.
- **Fear's refusals read a stat** (`fear_unbound`): Steady I. `b795a85ec`, item 6505.
- **`roll_with` on a save**: Point Man I/II. `7d2c36f1a`, re-record `056bc8a59`, item 6506.
- **Item op `two_dice`** (a roll kept from two): Untouchable I/II. `69de9af0e`, item 6507.
- **Item op `last_turn`** (Bite the Bullet's handler retired into it): Still Standing I/II. `80d7c5895`, re-record `e815f947e`, item 6508.
- **The sheet's one resolver** (`setSheetSource`): strainLimit and readyDesigns. `3b214dfe2`, item 6509.
- **`onFightStart`**: Primed's Momentum at `combat_start` again; `made_after_start` and its warning gone. `7cfd70600`, item 6510.
- **Standing to-hit terms shown** (`standingTerms`, `standingModsFor`): Open guard on the token card. `a92ef6609`, item 6511.
- **A resource held by the fight** (`on: fight`, the air's `mana`): Crystallise's draw on the price; Rite in the Field takes nothing from the air. `0c6456f8b`, item 6512.
- **`numb_limbs`** read by the three limb-penalty readers: Numb I/II. `f06612883`, item 6513.
- **`reveal what: kit`** (`kitOf`, `kitSeenFor`): Shadow's Case built. `7612cdf30`, item 6514.
- **Check fixes, golden tables and replays re-recorded.** `51675087b`, `c94b97c82`, `70f4687f7`.
- **Approved by the lead (the leftovers lane's additions under its brief):** the trigger `displaced` (on the existing hook, also raised when a forced move is refused at its first tile) and the predicate `stopped_by`; zone kinds as data (`rules.json zones.kinds`) with the predicate `actor_in_zone`; `Combat.riders` on dry-run copies. Rules 1.78 item 6612.

### Big leftovers (designed, partly or not built; each shrunk to the owed part)

- **Bare fists in the glove family (P11).** Overlaps Items 2.0. [M] [not built; checked in code 19 Nov 2026] [CHANGELOG 0.29.0]
- **Enemy versions of the doors.** Guard is built (0.32, rules 1.79); the door step, Challenge, Tag, Ghost Kill and Whispers in 0.33 (rules 1.83); Tug, Bond, Snap and Slam in 0.33 (rules 1.86). Owed: a Figment order (above). [M] [partly; 20 Nov 2026] [rules 1.79 item 6711]
- **Engine pieces not built:** a thrown Relic property (the fight-joined fx is built, spec 6603; no data row needs a `per_stage` scope, spec 6610). Needs the lead's approval first (CLAUDE.md, no rebuild). [M] [not built; checked in code 19 Nov 2026] [spec 5010; verification]
- **Delivered art with no place in the game.** Owed: the `move-draw-fire` placeholder is not in assets.json. (The resource and tone marks and `camp-step-ready` were already wired, checked by the polish lane; `move-sway` and `move-counter` wired as the Open Hand's fx signs, `dbff25674`.) [S] [partly; 20 Nov 2026] [SESSION-TODO O; verification]

### Fun and balance pass

#### Built in 0.32 (live in 0.32.0)

- **The Operative clears.** Unseen Hand (an attack from Hidden rolls with Ingenuity when higher) and the Recommended rifle: solo 0 → 13, four 0 → 22. `bcfa7cf6a`, rules 1.81 items 6900-6901.
- **The Outburst peak measured as one Release** (the 0.32 rise was a second, Mana Short Release in the window); the contract band set to what is measured; **the map 16 tiles up to 10 units** (four Breakers 6 → 14, four Bulwarks 11 → 17). `cf981b944`, items 6903-6904.
- **The guard's bar** to the measured share (25 of 40, bar 55%). Item 6905, `88c73cff1`; the account `docs/design/handoffs/0.32-FIT.md`.

- **The Sigilist bot's clear rate.** The bot holds cover, stands up when Prone and pre-draws on its own tile (rules 1.87 item 7500, `62e4c891a`): 14 to 16 of 160 solo. It still reaches 6 of 40 solo against the Channeler's 18 (48 HP a turn against 83): the limit is the Line's shape (it starts on the target's exact row, column or diagonal and takes a step a glyph), a rules question for Leon, or the bot aiming a Line at a target one lane off its axis, reading the lane geometry from the engine. [M] [open; measured 20 Nov 2026] [0.33-LANE-BALANCE.md]
- **Class lines, the rest.** Skirmisher 159 against 145; Hymn 138 against 150; the healer stall at level 20. (The Figments door and Rigger dials moved to Items 2.0, below.) [M] [open; 20 Nov 2026] [START-HERE Balance 2.0 4]
- **Shape's free Pump** stays at +0.12; the Outburst peak band is refitted (rules 1.81 item 6903: one Release, 90): to rule whether it moves. [S-M] [open; 20 Nov 2026] [SESSION-TODO V]
- **0.30's PROVISIONAL numbers never fitted.** Now measured (`0.32-MEASURES.md`, `measures-032.ts`): two shields at ranks I to III, Drive's −2 and plate-back, the follow strike's −2, Afterword, the feeds' 0.01. Owed: the fit. [M] [measured, not fitted; 19 Nov 2026] [CHANGELOG 0.30.0]
- **Balance 2.0 leftovers.** The rifle contract holds 4 guns plus greatsword and sabre (guns-measure covers all guns separately); the repair rate of 10% is nearly free; the XP and stage fit is PROVISIONAL because the simulator never makes or sells materials; level 3 before the first Boss on only 42% of routes. [L] [open; checked in code 19 Nov 2026] [START-HERE; SURVIVAL-PICKUP; verification]
- **Athletics' Defense from the first point: waiting on Leon.** Measured and OFF (`skills.json defense_from` 2): on the defence guard's idle pair, 40 fights, the first Down after 4.9 rounds at 2 and 5.3 at 1 (rules 1.87 item 7504, `412ad7698`). Turning it on is one data word and the guard's bound. (Silent is ON since rules 1.87 item 7503: every door within 3 clears.) [S] [built, OFF; 20 Nov 2026] [0.33-LANE-BALANCE.md]
- **Survival cells that fell in 0.33.** `four_casters` 20 to 13 clears (not the surprise rule, not Rally and Brief: the cell uses the old run rigger; cause not found); the old run policy's `solo_rigger` 18 to 12 (the surprise in the approach, now OFF: re-measure). The door classes held. [S] [open; measured 20 Nov 2026] [0.33-MEASURES.md]
- **The Shade's Silent Kill log line under Silent ON.** A loud kill from Hidden says "stays in the dark (Silent Kill)" because the Shade is still Hidden; the class is shelved. Also: with Silent ON a seen kill from Hidden keeps the killer Hidden, so Ghost Kill only matters for a kill made from out of view but not Hidden (a design note for Leon). [S] [open; 20 Nov 2026] [0.33-LANE-BALANCE.md; 0.33 integration]
- **The Outburst peak row counts a two-turn Release as two turns** in 0.33's measuring tool (obPeak halved on paper, the Release's damage is 0.32's): read the contract's obPeak band with that. [S] [open; 20 Nov 2026] [0.33-MEASURES.md]

### End of release

- **Measures against the baseline.** Done on `wip/0.32-sim` before the fit (`docs/design/handoffs/0.32-MEASURES.md`); re-run after the fit: the party fit (nine doors, solo and four) and the Outburst rows re-run (`0.32-FIT.md`); owed: the Survival cells, guns with mods, Figments and the tank table. [L] [partly; 20 Nov 2026] [proposals 2.10]
- **Consolidation pass** (rule 4) over everything 0.33 added to the engine (the diff of `docs/ENGINE-HOOKS.md` and `packages/engine/src` against 0.32.0). The release review's consolidation findings are fixed (the Release's reveal through `attackFromHidden`, `8e34c4007`; one copy of a granted action's price, `acd3560f0`); `COUNTED_ORDER` and `_OWNER_USE_TYPES` are data (`62aff24af`). Rules 1.90's pieces join the list: the stats `ambush_immune`, `ambush_ap`, `ambush_roll`, `ambush_scout` (the `surprise_*` stats removed), `startCombat` `extra.freeTurn`, the run phase `engage` and `run/engage`, `Combat.opening`, `Unit.caught` and `Unit.firstAp`, the damage type `fumble`, the module `run/ambush.ts`, `magic.ts visChargeNow`. Owed: the written report in `docs/design/proposals/`. [M] [partly; 20 Nov 2026] [CLAUDE.md rule 4]
- **Spec section 14** receives every new PROVISIONAL number. [S] [open; from documents only] [proposals 2.10]

### 0.32.x polish (the screenshot pass's small faults, left on purpose; pictures in `.check/capture/all/` after `python tools/e2e.py capture-all`; list from its FAULTS.md, 20 Nov 2026)


- **Path map:** the legend's second row clipped at the bottom (1280-021): the polish lane found it fine; recheck on the next capture (the node card now covers the fewest stops, `670ffae55`). [S] [not verified; 20 Nov 2026]
- **Run board:** the player card cut by SQUAD at the bottom is sticky by design; Give is left out in a solo game (`670ffae55`, rules 1.85 item 7304); recheck on the next capture. [S] [not verified; 20 Nov 2026]
- **Sheet and Proving Ground:** the bottom hint box covers the EQUIPPED section of the tools panel (the middle column's scroll edge; the box has its own close button). [S] [open; 20 Nov 2026]

## Built in 0.33 (on `wip/release-0.33`, not live; rules 1.82 to 1.90; hand-offs `docs/design/handoffs/0.33-LANE-*.md`)

- **Rules lane (rules 1.82, items 7000-7013):** Borrowed time on an old save takes the right perk (`c378928b3`); a pillar outside the cover arc counts nothing, the follow strike's -2 kept (`cbebaefde`); class-only multiplier dials, every one 1 (`46d546376`); surprise in the approach for both sides, Tremor and Shoot First in the engine (`acb130f1a`; the approach and Surprise removed by rules 1.90); a Whisper from holy ground (`ec5e54823`); Stand Behind Me (`303007aaa`); Parting Cut (`b34a800bb`); Field Repair as Improvisation's fourth perk, the held-item gate, old saves re-offered the step (`69f947b72`, `15b1b4c27`); P14 hurl, the Breaker's Hurl, Grenadier's Arm moved onto it, Breaching Strike written up (`32fe24e45`); Athletics from 1 and Silent built behind switches, OFF (`4f7269af5`, `f499484b6`, `2bacf0936`); group F items 7 and 18 (`5eec84049`).
- **Enemy lane (rules 1.83, items 7100-7112):** the general enemy door step (Challenge, Tag, Ghost Kill, Whispers from an enemy faith block), the Read foresees Pressure, the bait reads Answers, NULL weighs a Figment, Interpose checked (`b78b40b5b`, `95eec0b68`, `0feeb076b`, `f20358a9b`, `908e33d71`; test `enemy-doors-183`).
- **I'll narrate (rules 1.84, items 7200-7206):** the whole turn from the desk (the AI's `submit_turn` read as a form), the Narrator's notes and map, the seat's view; a lurker out of the players' view data (`100d2a091`, `995029461`, `c21f1c121`; `narrate.mjs` 28 checks).
- **Polish (rules 1.85, items 7300-7305):** the your-turn card clamped under 1000 px, Everyone Home's tokens, Soothe's log line, Tug's pulse, one event for every Bond end, the trap legend, and the creation, camp, rewards, level-up, run summary and fight-header faults of the 0.32.x list (`670ffae55`, `e6cf41e3c`, `dbff25674`, `259d1f3c8`).
- **Speed:** the bundle split by screen (entry chunk 6.7 MB to about 1 MB), Preloader 2.0, fight-screen render costs about halved (`c510b0138`, `e3384a255`, `5da08deaa`, `ec0e0d0b4`, `c41e0a11b`).
- **Engine speed:** the sight test asks once per question, not once per eye; walls once per area; the map's tile lists as sets; a JSON-exact structural copy (`jsonCopy`) for `apply()`. No behaviour change (29 replays unmoved). apply() per fight action 18.4 to 10.3 ms, a hostile phase 101 to 34 ms, previewAction 32.9 to 9.6 ms (`0426aba32`; bench `test/balance/engine-speed.bench.test.ts`, opt-in).
- **Playtest fixes (ten):** VICTORY no longer waits 20 s after the last kill (`ecbffd1bd`, `320cc323a`); a Figment's Move draws its route arrows (`03f2bc166`); a fork option without Wick art shows its mark, the four Visualization forks (MD14-MD17) in ART-REQUESTS (`780545ebc`); ONE perk-tier card on the skill page, the Perk step chooser and the sheet, the skill page's one dark box, the ladder's perk hover one perk a line, the PERKS tab's FROM BOONS fold (`1b02bd7bf`); the level-up screen's draggable separator, the class column 380 px (`a5918918d`); Space presses the fight's Confirm, with a SPACE hint (`76675ba69`, `f5c1221a6`).
- **Online:** hosting on Workers Static Assets (deploy is `python tools/deploy_site.py --build`), the guest seat token, the host token length, coalesced view writes, the purge alarm, the auto-answered ping, the input-delay line, the placement hint and the SENDING mark (`e012502f3`, `4679ac8f8`). The connection fixes were already in 0.32 (`d2a5a6636`).
- **Browser suites in the serial group:** voice, shadow, tending, slate, slate-title, slate-music, turn-card-side, sigil15-growth (`apps/web/e2e/groups.json`).
- **Engine lane (rules 1.86, items 7400-7411):** what a unit with no character holds (`unitGrip`, `gripHolds`), the Heart adept's Bond, Tug and Snap, the Heartfire elite's Slam (`dc6ee7467`, `2982cc410`); a repair through the one mend path, prayer numbers from `patrons.json`, a Boss and forced moves one rule, group F 2, 10, 11 (half), 17, the effects audit's Bond perks, owner uses as data (`62aff24af`); replays re-recorded (`c35855b8d`).
- **Balance lane (rules 1.87, items 7500-7504):** the Sigilist's run bot holds cover (`62e4c891a`); Rally and Brief re-stepped, Name the Sinner +40%, Silent ON, Athletics from 1 measured and OFF; the 0.33 baseline `docs/design/handoffs/0.33-MEASURES.md` (`412ad7698`).
- **Sound lane (rules 1.88, items 7600-7605):** a storm bolt's lightning crack, the divine impact, each patron's own layer over the Hymn (`3d53752d0`, `582a8e9a3`); the Narrator's desk draws ground items, spawns and drops as rows, the FIGMENTS section keeps forms and forks in sight, the SPACE hint on one line (`dd9ff23c9`, `3d2ef63ed`).
- **Client load:** the engine and the room's overlays out of the boot chunk (boot 5,267 KB to 895 KB; `53ae6c2c3`); map items compared without key arrays, guard pips and dimmed kit layers kept as the same objects (`e8e300e6b`).
- **The outside playtest of live 0.32.0, rules side (rules 1.89, items 7700-7715):** SOAKED counts Guard plates, the follow strike after a hit or a miss but not a natural 1, Challenge and Slam logs, Glass Runner and the bank, special rounds named and loaded, armour in a technique preview, Sigil Savant's Rigid, the Line and ground numbers, the Evoke and Draw previews, the field's round, Essence of Experience consumed at a shrine's altar by anyone (outside a run only a focus cracks it), the next point's fork line (`fef2eecab`). A gun emptied in one fight starts the next empty, on purpose (Leon, 20 Nov; item 7714).
- **The outside playtest, screen side:** a page that draws no frames shows every animation's end state (`93090bfea`); the reward bar and Stop 1 pick on screen under 1000 px; each action's own card, a refusal said once, a new turn starts with nothing chosen, the log oldest first, the You card at 1280x900, the SHADOW header's live word, Whole map clicks, Disengage and Lift prices, the Techniques badge (`d28748088`); creation step 6's doors, STATUS and GEAR wrapping, the camp's comparisons, an armour piece's own part (`a7501aa03`); the SPACE hint's empty alt text (`d792eeee7`).
- **The ambush (rules 1.90, items 7800-7816; Leon, 20 Nov: the approach phase is out entirely):** every Survival fight node asks Walk in or Try an ambush (`run.state` engage, `run/engage`, the host chooses); one squad roll (the average of each character's best of Ingenuity, Athletics, Senses; TN 12 / 16 / 20 by node); won, the squad's free turn; lost, the hostiles'; a lone character's fumble takes 15% of max HP; SQUAD ADVANTAGE / ENEMY ADVANTAGE banners; scouting (Ingenuity 5's Scout, the Eye form) shows the line-up and adds +2; Tremor and Shoot First rebuilt on it; the approach, contact, the alarm at contact, CONTACT! and the Surprise rule removed; old saves load joined (`8d4b8ee02`, `377444344`, `f7a9e2479`, `ab40e37ce`; hand-off `docs/design/handoffs/0.33-LANE-AMBUSH.md`).
- **Tables for Leon:** the alphas table (before 0.32, now, where the rest went) and the class moves sheet for Weapon Arts (`90eaf3b43`; `docs/design/proposals/2026-11-20-alphas-table.md`, `-class-moves-sheet.md`).
- **The release review's fixes:** the Release's reveal through the one rule (`8e34c4007`); one copy of a granted action's price, the `cost:` data reference (`acd3560f0`); a guest's seat token that survives a full storage (`09f6dc6fd`); every screen chunk warmed once a page and a Reload dialog when one fails (CHANGELOG 0.33.0).
- **0.32's end-of-release runs:** the full browser run (the 0.32.0 proof run, `docs/design/handoffs/0.32.0-LIVE.md`; the Throw row's check is in `picking.mjs`, serial) and the whole-game screenshot pass (`capture-all`, `afd3a525f`; its faults are the 0.32.x polish list).

## 0.34: Items 2.0 (built, NOT LIVE: waits for Leon's word)

On `wip/release-0.34` (rules 1.91 to 1.93; hand-offs `docs/design/handoffs/0.34-LANE-*.md`; the class measure `docs/design/handoffs/0.34-MEASURES.md`). Nothing of it is live; it goes live only on Leon's word for this release.

Built (merged from `wip/0.34-b0`, which holds lanes A1 to A5 and B0, and `wip/0.34-b2`):

- **A1, the item model (rules 1.91 items 7900-7921):** tags, families and forms, the hit skill as one key, grades as a rule (`GRADES`, `gradeWord`), the slot table, N2 (`self_holds.hands.tags`), the unique-ready variants line, `rolledGear` the one rolled-gear rule; one-handedness from the row's hands (INTENDED, `770bca4ef`: seven rows no longer take the off-arm -2) and one reach reader (INTENDED, `c32c5b9ad`: Earthbreaker and the Breaker Lunge read the grand staff and the bot-thread banner at reach 2); no golden table or replay moved by either (`5f6a2560b`, `7a6663f3c`, `9fab13366`, `a358fe6a1`, `0cb6d9d15`).
- **A2, armour (items 7950-7959):** the body armour class rows the one copy, class 6 (the breacher plate, provisional), `wornState` (N3), the arm column, the Forge's armour grade step and Juggernaut fitting, worn rows' effects held (N4), the class variant seam, the `inner_torso` key with old saves mapped; a 0.33.0 save fixture (`9c5824e8b`, `49dc266ba`, `6e779a1a6`, `755f21760`).
- **A4, the tags typed on the existing rows:** 41 family rows, family/form/line on 53 weapon and 14 worn rows, second skills, `weapon_art: null`, `skill` derived from `phys.hits_with`; the R5 sweep (`phys.also_scales` off 9 rows, INTENDED, a label-only golden change recorded in the lane) (`afc84e3a9`, `e719cb119`).
- **A3, the item card on every screen** (`itemCard`, `ItemCard.tsx`; the slot rows from the table; the GEAR tab's body armour level-scaled; STATUS shows Armour) and the stage A integration (`bf1803dd6`, `7e0b702fc`, `dcbc699f7`, `5cd6118ad`, `765b31b60`).
- **A5, the simulator reads tags** (`218c161be`; party-fit and SURVIVAL_SIM identical before and after).
- **B0, rules 1.92 (items 8000-8046) and the seams:** the stage B spec (12 melee, 3 shield, 11 armour-by-slot, 17 gun, 2 bow, 8 heavy families; 72 new weapon rows and 12 new pieces), the Heavy word, Strike/Ward, Arsenal, the siege reload, the typing sheet `docs/design/proposals/2026-11-20-items-2.0-rows.json` (`2a7694a67`, `50b88a2e1`, `e0c4def98`).
- **B2/B3/X:** the 12 new worn pieces typed (data only), ART-REQUESTS lists the 84 new ids on a placeholder, the 41 Figment order and trait pictures built and read by `figmentPng` (`5cf7904d8`, `587a0572c`, `bb7bbb34d`).

- **The integration (rules 1.93, items 8100-8112), on `release/0.34-final` pushed to `wip/release-0.34`:**
  - step 1, the camp is the issue rack: role tag `issue` on exactly the 18 rows the camp offered on 0.33.0 (computed by
    running the camp's own `RACK` on `origin/main`), read by `archetypeWeapons` through `survival.json
    loadout.archetypes.tag`; no camp list moved (`camp-issue.test.ts`) (`ab3d383d3`);
  - step 2, **B1 merged** (the 72 new weapon rows and the pavise) with the guard ruled: `adamantile_heavy_rifle`,
    `arsenal_heavy_rifle`, `chezknov_precision_rifle` take the bolt cycle at their damage, `adcorp_designated_rifle` 33;
    one truth in data, the numbers file, section 7 and the typing sheet (`5ed540b26`);
  - step 3, the rulings: Smetanita's hit lays 1 Pressure once a turn for each target (`mod_line_smetanita`); the
    `vests` (issue line) and `plate` (Adamantile Brigade) family rows, each class row with its line; Last Charge's shield
    3 x the class row's armour value (the breacher plate 54); Albert Town's grant "Settled Shot"; no grade colour
    (`5c2cc30aa`);
  - step 4, what B1 moved: the golden tables' NEW lines recorded on purpose (0 GONE, 0 CHANGED); `mods` and the
    survival-loadout tests unmoved; `brass.test` by family; the icon guards' placeholder covers the new magazines; the
    Narrator names weapon families (wiki `family:<id>`), caps unchanged (`022f025a1`);
  - step 5, consolidation: one explosive-charge helper; `graded: false` on a weapon row refused by the grade step
    (`ungradedWhy`); `itemCard` and `form_words` approved; CONVENTIONS.md describes tags and families; `phys.teaches`
    moved onto 46 family forms (goldens unmoved); class VI on the sheet, the Proving Ground's buttons from the class
    rows, body armour's family line, `figmentPng` on the Figment order rows and trait chips (`55ee7a78f`);
  - step 6, the measure: `docs/design/handoffs/0.34-MEASURES.md` column "0.34 final" (measured, not fitted).
  - step 7, the review's findings fixed (rules 1.93 items 8113-8119, `e36e94020`): one reader of a body armour id
    (`armourClassNumOf`, any digits); an ungraded row handed out at Standard (`gradeFor`; saved grades kept,
    `heldGrade`); a weapon family id resolves to its Standard row for enemies, npcs and loot (`weaponIdOf`; an unknown
    word logged); the card lists carried modifier rows (`ItemCardV.carries`); no bare hands or natural weapon in rolled
    gear; the demolitionist sets the strongest carried charge; one grade ladder in the simulator, validator and sheet;
  - step 8, the weapon measure merged (`wip/0.34-measure`, `746f6be59`: `docs/design/handoffs/0.34-WEAPON-MEASURES.md` and
    the opt-in `items2-measure.test.ts`) and the lead's first fit (rules 1.93 item 8120, `2afed3dd6`): 34 new rows'
    damage, two magazines; golden lines of the changed new rows recorded on purpose (0 old lines); re-measured in
    `0.34-MEASURES.md` "After the lead's first fit".

Owed:

- **Signatures that ship plain (no carrier yet; their texts promise nothing):** G2 revolvers' best critical, G4 Legion, G11 split burst, G13 ADCorp cheaper Forge mods, G14 Chezknov recoil on Bursts, H3 burning ground, H5 line hit, H8 two targets, the door knocker's x3 to cover, the throwaway tube's single use (ships reloadable, reload 3). Not in this pass by the lead's ruling (rules 1.93 item 8104). [M] [open; 20 Nov 2026] [0.34-LANE-B0.md]
- **Second-skill effects owed** (rules 1.93 item 8104): the drum launcher's Lob AP, the cathedral burner's wall tiles, the waived restrictions on the twin rotary and the Blackpoint carbine, skill-scaled numbers (throwaway tube, snarl knife, piston knuckles, javelins), the darts' Toxin, every gun and bow second-skill effect and its size; only the siege tube's Raw Power 5 reload is carried. [L] [open; 20 Nov 2026] [0.34-LANE-B0.md]
- **Owed primitives (design item 10; the lead approves each):** a `crit_min` gear field; a mod-fitting price factor; mode-limited recoil on a weapon row (or row modifiers in `gearNum`); a split burst; burning ground; a line hit; two grants a row; single use; prone only; a skill waiving a restriction; weapon numbers from skill points; a Toxin condition; a technique's AP as a cost site (Lob). [L] [open; 20 Nov 2026] [0.34-LANE-B0.md]
- **Held rows (not shipped):** `breather` (no carrier for "immune to smoke") and `blackpoint_wall_gun` (no piece makes a weapon prone-only). [S] [open; 20 Nov 2026] [rules 1.93 item 8104]
- **No new row joins the camp** until the lead gives it `issue` (rules 1.93 item 8100). [S] [open; 20 Nov 2026] [rules 1.93]
- **The line words** (A4 wrote `frontier`/`issue`/`mixed`; the card shows them through a generic formatter, e.g. "Decrkm"): a `line_words` map is the lead's ruling. [S] [open; 20 Nov 2026] [0.34-LANE-A3.md]
- **Client leftovers:** the second skill and the Weapon Art line are in the view-model, not drawn; the sheet's 28 px pack rows draw no grade frame. [S] [open; 20 Nov 2026] [0.34-LANE-A3.md]
- **Survival placement:** where the breacher plate (class 6) is found; re-run the hood's `seen_range` with `npm run try`. [S] [open; 20 Nov 2026] [0.34-LANE-A2.md]
- **Debt:** the shop faces' bias words as tag queries in data (a data ruling); `power.ts` FITS stays row fields unless a gun tag is ruled; party-fit's `sur` lever and survival-run's `SIM_SUR` are no-ops since 0.33; `tools/items2_sheet.py --check` is not in `check.py` (the sheet is a record now); `tools/technique_fx_inventory.py` reads `phys.teaches` only (not the family forms); the written consolidation report in `docs/design/proposals/`. [M] [open; 20 Nov 2026] [0.34 hand-offs]
- **The Narrator's weapon list is families now** (rules 1.93 item 8108): it looks a family up before it names an enemy's weapon in it; watch the AI's first fights for a wrong id. [S] [open; 20 Nov 2026] [rules 1.93]
- **Stage C, what the first fit left flagged** (`0.34-MEASURES.md`, "After the lead's first fit"): 53 cells on 23 changed rows still more than 15% from their family's existing form (the snarl knife and piston knuckles now under their family at L1 and L10 normal; the war pick, sword-breaker, rank and leaf swords, spinner, darts, votive torch and Blackpoint carbine still under at some columns; the javelins, drum launcher, fowling gun, plate needle, cathedral burner over). Not fitted further: the lead's call. The party-fit walk-in table after the fit: one flag, solo_rigger +4 (the 0.34 release's own, unchanged); every other cell within 3 clears of 0.33. [L] [open; 21 Nov 2026] [rules 1.93 item 8120]
- **The review's other minor findings (0.34 integration review, 21 Nov 2026; not fixed in 0.34):** the body armour's name written four ways (the sheet reads a field that does not exist); `ARMOUR_SLOT` read in three engine files plus a typed `torso_outer` in the validator; `families.json` has a second reader (gearpreview's form words) and the wiki filters family membership by hand; a unique's fixed grade applied at five write sites rather than at the one instance read; the role-tag list typed into the validator; the slot table kept twice in rules.json (`slots` and `table`, `key` forced equal to `id`); the camp rack's pool rule copied in the validator and the survival browser suite with a different price test; reach marked two ways in weapon data (`properties` `reach_2` and `phys.props` `reach`). [M] [open; 21 Nov 2026] [the review's journal]

## After 0.32, before Items 2.0

Leon, 19 Nov: "we have the paid 5$ plan for cloudfare now so upgrade to whatever method is best in that plan. After 0.32 is done." Each measured first. What 0.33 did of this list is under "Built in 0.33"; what is below is still owed, each with why it was not done.

- **The outside code review's performance work, the rest.** Owed: file splits and types; building each fight tile only when its own inputs change (hovering changes many tiles at once: route arrows, hazard crossings, the sightline, the stroke layer and the Evoke preview all read the hover, so a safe per-tile cache needs the 150-field tile builder split out of `combat.js` first, and a partial cache leaves stale tiles; the client load lane stopped there); the fight's render time measured after the boot split (not measured: the lane stopped after its incident); the enemy AI's planners (about 37% of a hostile phase) and `perks/b.ts` `noteExplored` (about 5%); code-only sparse worktrees once the gate passes in one. [L] [partly; 20 Nov 2026] [ATTACK-PLAN; 0.33-LANE-BOOT.md]
- **Multiplayer input delay.** Read on live with 0.33's ping line and report bundle from two places; then diff views (bytes) or the referee (`docs/design/proposals/2026-11-room-referee.md`) as the reading says. Not done: it needs 0.33 live. [L] [open; 20 Nov 2026] [0.33-LANE-ONLINE.md]
- **A host can free a guest's seat.** 0.33's seat token no longer loses a seat to a full storage (`09f6dc6fd`), but a guest on a new browser or with cleared storage is still refused its seat until the room's 30-day purge. A host control that frees a seat (a room message deleting `seat:<pid>` and a button on the room screen) was left out: the room screen's template is generated and the canvas is paused. [S] [open; 20 Nov 2026] [0.33 release review]
- **After 0.34 is live: delete the old KV namespace** `03c97e375a064e49a506ee40c0717de3` (kept so a rollback to 0.32 can serve the site from it). Not done: 0.34 is not live. [S] [open; 20 Nov 2026] [0.33-LANE-ONLINE.md]
- **`deploy_site.py` ignores unknown arguments.** `--help` ran a real `npx wrangler deploy` on 20 Nov (the client load lane's incident: its boot split went live by mistake). The script must refuse an argument it does not know and print its options for `--help`. Not done in 0.33: the integrator does not touch the deploy path. [S] [open; 20 Nov 2026] [0.33-LANE-BOOT.md]
- **Echo in a fight.** The spec leaves it undefined: which d20s count, when the choice is offered (the reducer cannot hold a roll), what a reroll undoes (a jam, Heat), how a Survival run with no sessions refills Echo. Waiting on Leon (rules 1.89 item 7715). [M] [open; 20 Nov 2026] [0.33-LANE-BUGS-ENGINE.md]
- **The outside playtest's screen leftovers.** Brace's Confirm (if the screen sends something other than `combat/brace`), the barrel click's tile for Attack an object, the field's "N piles left" and Take all, the transient ROUND 7 flash, where a run shows Sigil Savant's Muscle Memory and Practise (the engine offers both with scope `run`). Not done: the screen lane could not reproduce them with frames drawn, and the engine lane proved the rules side through the reducer. [M] [open; 20 Nov 2026] [0.33-LANE-BUGS-ENGINE.md; 0.33-LANE-BUGS-UI.md]
- **A bound item's passive ops in its actions' run.** Challenge and Slam log "uses Guard" and post a Narrator note: the Durability door item is bound, so `defaultActions` passes the door's passive `roll_with` into every move's run, and `defaultRun` cannot run it. The fix (leave passive `when` ops out of `own`) changes engine behaviour; not done in the screen lane, and no engine lane was left in 0.33. [S] [open; 20 Nov 2026] [0.33-LANE-BUGS-UI.md]
- **For Leon, from the outside playtest (numbers, nothing changed):** Slam against Shield Bash; the 0 Guard accuracy cliff (80% to 40%); Guard and Brace overlapping; a plain hit locking out Charge; Stage 1 finisher starvation and Momentum lost per hit (0.88 at Guts 2); XP pace to level 3 (35 XP a fight, 105 of 250 after Stop 5); early ammunition and Forge prices (the 1,200 cr Fine step against 120 cr). [M] [open; 20 Nov 2026] [0.33-LANE-BUGS-ENGINE.md]

## Items 2.0 (ask Leon before building)

Nothing starts until Leon says so and 0.32 is live. Preconditions only; the contents live in the design files: `docs/design/proposals/2026-11-18-scout-items-2.0.md`, `docs/design/proposals/2026-11-19-items-2.0-families/`, `art/briefs/ART-REQUESTS-2026-11-19.md` and `art/briefs/prompts-2026-11-19/`.

- **First step of Items 2.0: a light audit of unused artwork** (Leon, 20 Nov 2026: "a lot of artwork is replaced and just abandoned somewhere... see if anything can be used/reused"). List every file under `art/` (and `art/_archive/`) that no UI calls (no `art/catalog.json` id resolved by code or data), with a thumbnail sheet; propose reuse for the icon gaps first (0.32 left about 47 perks and 36 fork options on the initials placeholder; 11 removed perks' icons are orphaned). Leon picks; nothing is deleted. [M] [open; counted by filename 20 Nov 2026] [Leon 20 Nov]
- **"Arts" in "items and arts" is Weapon Arts** (the rules system), not artwork (Leon, 20 Nov 2026). Weapon-side balance fits are done with Items 2.0 and Weapon Arts, not before.
- **Ask Leon before starting.** [S] [open; from documents only] [SESSION-TODO M, N]
- **First deliverable:** a design document with the family tables and a "Built from" table; one consolidated primitives list approved by the lead. [L] [open; from documents only] [SESSION-TODO N, X]
- **Leon rules the staging** (A engine and screens, B content, C Weapon Arts). [S] [open; from documents only] [SESSION-TODO Q]
- **Audits before design.** The armour slot audit (the lead has not verified the slot list); items with an icon and no engine use (ration pack, chalk and wax, prayer beads, cigarettes have no reader; flare and torch unverified); the Forge realign check (can per-weapon state override `scales_with`?). [M] [open; from documents only] [SESSION-TODO P, Q]
- **Still open design inputs.** The gun family forms; shield families (Heavy's movement number is PROVISIONAL); the melee family table and in-world names for borrowed weapon words; each gun variant's second skill; the unique concepts; armour grade pictures under S1. [L] [open; from documents only] [SESSION-TODO X]
- **Fit with Items 2.0 and Weapon Arts** (the weapon-side fits the 0.33 balance lane left on purpose, Leon's word; the baseline is `docs/design/handoffs/0.33-MEASURES.md`):
  - **The Dexterity melee line as a whole.** Sabre and katana are over 165% all-in at level 10. [S-M] [open] [spec 5527]
  - **Gun ceilings with mods fitted.** Guns reach 162-195% against the 145% line; Leon ruled 19 Nov that ceilings are a relative measure of the effort a class puts in and the fun it gives back, not a hard line. [M] [open] [SESSION-TODO D; 0.29.0 known]
  - **The Figments door and Rigger class lines.** The dials exist (`classes.json` base `dials`, rules 1.82 item 7003, `46d546376`), every one 1: fit them (Figments door 119 and Rigger 123 against 130 and 150). [M] [open] [START-HERE Balance 2.0 4]
  - **The Mender's solo kit.** 8 of 40 in 0.33 with 21 stalled: its revolver runs dry and it still melees an Elite with an empty gun on the Empathy sheet's fists (rules 1.81 item 6907; the empty gun stays as it is, Leon 20 Nov). [M] [open; measured 20 Nov 2026] [0.33-MEASURES.md]

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
- **The approach, redesigned** (Leon, 20 Nov: the approach phase was removed; what a class that can only walk in gets before a fight): the lead's proposal is one readied opening per class from its own door. [M] [open; 20 Nov 2026] [0.33-LANE-AMBUSH.md]
- **The design canvas** brought back in line with the game at 1.0. [M] [open; from documents only] [CLAUDE.md]

## Waiting on Leon

Direct questions. Where the lead gave a recommendation, it is built as stated unless Leon says otherwise ("no answer means yes").

1. **Rest MP.** Since 0.31.10 no Survival node gives MP back except a Rest. Is that what you meant, or only the Boss? Recommended: keep as built (built as recommended unless Leon says otherwise). [SESSION-TODO V; CHANGELOG 0.31.10]
2. **Vow pop-up.** Is "Fight unsworn" a choice, and do Atheists get no pop-up? Lead's pick: yes to both (built as recommended unless Leon says otherwise). [SESSION-TODO F]
3. **Names.** Keep "Stalk"? (APPROACH is gone with the approach, rules 1.90.) Lead's pick: yes (built as recommended unless Leon says otherwise). [TAKEOVER]
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
15. **Shadow numbers** (the Shadow lane's three, built as stated): Prone makes enemies see you 4 tiles less far (12 to 8 lit, 6 to 2 dark)? The works and the rim get 1 to 2 lamps (were 0 to 1: a pitch-black works ran GUARD-36 dry)? Widen Douse from lamps to fires and terminals (one data word, `shadow.douse`)? [0.32-LANE-SHADOW.md]
16. **Outburst 4.0.** The 25 feeling colours and the readings in spec items 801-818. [old ROADMAP]
17. **The open calls listed for you** in the playtest checklist (Survival about 132, Classes 3.0 53, 0.23.0 29) and spec section 14. [PLAYTEST-CHECKLIST; HANDOFF Open 8]
18. **Leftover branches and folders.** May I delete `phc-figments2` (`design/figments-2`) and the ~25 non-git leftover folders? [TAKEOVER State]
19. **Athletics "Defense from 1".** Built behind a switch, shipped OFF until the balance lane measures it (rules 1.82 item 7011; `skills.json athletics defense_from`, at 2). [0.32-LANE-BODY.md; 0.33-LANE-RULES.md]
20. **The quad Bulwark.** Its stage-1 clears fell 10 to 4 of 40 (Reactive Plate and Last Plate gone; the solo Bulwark 22 to 24). Accept, or give the Bulwark something back? [0.32-LANE-BODY.md]
21. **Silent against the standing rules.** Built per your later word behind a switch, shipped OFF until the balance lane measures it (rules 1.82 item 7012; `rules.json combat.hidden_attack.gives`, at reveal); each standing rule it touches is resolved in the spec (the Break keeps its reveal, Vanish II has nothing left to change, Parting Cut and Ghost Kill stand, the Silent module gives nothing away). Turn it on? [0.33-LANE-RULES.md]
22. **Ambush numbers from play:** TN 12/16/20, the solo fumble 15% of max HP, the scout's +2, Tremor +1/+2; measured: always ambushing loses about 70% of rolls for a squad with no Operative. (Surprise, rules 1.82 item 7004, is closed: superseded by the ambush, rules 1.90.) [0.33-LANE-AMBUSH.md]
23. **Stand Behind Me.** Built as the lead's pick, a call made for Leon (rules 1.82 item 7006): the Bulwark's rank III ceiling move (a ranged attack on the ally behind you lands on your plates). [0.33-LANE-RULES.md]
24. **Enemy fire memory carried into the next round** (rules 1.79 item 6703; `rules.json combat.focus_memory.carry`, built and off): any carry from 0.25 fails the idle-pair bound in `test/balance/defence-measure` (first Down at round 5 against 4.2). Keep it off? Lead's pick: off.
25. **The old weapon rows over their lines on the new measure** (`0.34-WEAPON-MEASURES.md`): guns 19 of 74 over 145% all in, melee 42 of 51 over 125%. The lines were set on older tools. Lead's proposal: re-draw the lines when Weapon Arts are designed, not nerf 40 weapons now. [0.34 weapon measure]
26. **Strike shields earn as much Guard as the Guard family in pairs** (the two-shield measure in `0.34-WEAPON-MEASURES.md`): the Strike family is meant to trade Guard for its follow strike. A ruling on whether that is wanted. [0.34 weapon measure]
27. **The shotgun pistols read as weak sidearms** (the Brigade shot pistol, the Lumeri hand scatter: 26 to 44% of the rifle, 54 to 71% under their family's base form): kept as sidearms, or lifted? [0.34 weapon measure]

Answered on 19 Nov (verification file): carry weight (nothing changes); camp budget (stays 300); ceilings (a relative measure, not a hard line, so "all-in 7/1/1 builds sit over every ceiling" is not a fault by itself); Operative and Sigilist 0 of 40 (the bot's policy).

- **`fight-panel` failed at 1280x720 (the mini meters overlapping, the charge row covering the "+N" chip):** the cause was the resource panel's `.phc-res-urgent>.phc-res-mini{display:grid; grid-template-columns:subgrid; min-width:0}` winning over the compact card's flex row, so every mini was 0 px wide; the compact card's rule now holds (`combat.js YOU_URGENT`, !important on display, flex, min-width, grid-column). Red alone twice in the 0.34 full run, green after the fix (55 checks; fight-cards and ui-shell green). [S] [done; 21 Nov 2026]
- **Settings' Fight tabs page is the only React.lazy with no error boundary:** a failed chunk blanks the page. [S] [open; 0.33.0 ship review]
- **Builders report anything that touches live at once** (the 20 Nov accidental deploy was seen three hours late); `tools/deploy_site.py` deploys only with `--deploy`. [done, `9b09ff463`; keep the rule in every brief]

## Housekeeping

- **Live-version lines** brought to 0.31.11 in CLAUDE, ROADMAP, HANDOFF, START-HERE, SESSION-HANDOFF and the PICKUP files (done 19 Nov in the commit that wrote this file; keep it current at each release). [S] [partly; checked 19 Nov 2026] [BEFORE-ITEMS E]
- **`MORNING-2026-11-19.md` was never written.** Write it, or mark it moot (the archived attack plan names it). [S] [open] [ATTACK-PLAN]
- **Saint's Shield notes are stale.** `patrons.json` notes say 12 then 16, the data uses 34 x Blessing power, other docs say 40. [S] [open; from documents only]
- **At the 0.32 release, delete** the merged WIP branches `wip/0.31.11-words`, `wip/0.31.12-fixes`, `wip/release-0.31`, `wip/lane-0.31-art`, `wip/lane-0.31-skilltab`, `wip/lane-0.31.2-known`, `wip/lane-0.31.5-picking`, and `backup/live-0.31.10` (keep 0.31.11 and the new one, and 0.22.0 and 0.23.0 for good). [S] [open] [CLAUDE.md WIP and backup rules]
- **Unmerged branches to list for Leon:** `design/*` (13 plus `figments-2`), `lane/0.29-l1-recoil2`, `local/0.29-merge-with-alpha`, `review/0.29-*` (3), `wip/worktree-agent-a4c26f7ceb4409c36`, `origin/feature/title-front-v6`, `origin/review/fable-first-read`. [S] [open]
- **Worktrees and folders.** Merged worktrees on E: (int030, field030, dex031, fit030, ui031, icons030, known0312, pick0315, skill031, art031, phc-029-pressure) and ~25 leftover folders await Leon's word; drive C: was 94% full; try sparse (no art/audio) worktrees. [S] [open]
- **Prune `art/_archive`** (310 MiB) once Leon has looked (1.0). [S] [open]
- **At the 0.34 release, delete the 0.33 WIP branches** (merged green into 0.33): `wip/0.33-enemy`, `-narrator`, `-online`, `-playtest`, `-polish`, `-rules`, `-speed`, `wip/0.33c-engine`, `-balance`, `-sound`, `-boot`, `-bugs-engine`, `-bugs-ui`, `-tables`, `-ambush`. [S] [open; 20 Nov 2026] [CLAUDE.md WIP branches]
- **0.33 lanes' leftover worktrees:** `E:/phc-wt/a0312-base` (detached; its `node_modules` is a junction to `a0312`'s: `rmdir` the junction alone before `git worktree remove`, or the shared folder goes with it) and the empty `E:/phc-wt/mind032-*` folders. [S] [open; 20 Nov 2026] [0.33-LANE-BOOT.md; 0.33-LANE-ENGINE.md]

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
