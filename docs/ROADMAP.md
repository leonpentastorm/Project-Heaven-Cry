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

### Gaps (player-facing faults and small things no lane owned; `wip/0.32-gaps` merged at `e52c9d90c`; report `docs/design/handoffs/BEFORE-ITEMS-2.0.md`)

- **Forks at camp not shown in MAGIC (TRIAGE row 10), the fork half.** The "1 spare cores" half is fixed (below); forks picked at camp not showing on the MAGIC tab was not reproduced. [M] [open; from documents only] [TRIAGE row 10]
- **"Needs Lore Master 1 (you have 1)".** The refusal text contradicts itself; not touched by the gaps lane. [S] [open; from documents only] [TRIAGE row 13]
- **Small test faults.** `fx-sweep`'s nine real-speed cases are refused with "no place to stand"; `tending.json` Bond card numbers are copies with no validator tie; live-site suites time out at 30 s on page load. [S] [open; from documents only] [SESSION-HANDOFF 6.4-6.5]
- **Tests that call inner functions** (rule 5): `survival-field-actions` calls `fieldRefusal`. (`helpers/perkfight` sends forms and picks through door/pick: `ea20d6173`.) [S] [partly; from documents only] [wave2-rulings 4]
- **The 0.30 review document for Leon's rulings** is not in the tree. Write it. [M] [open; from documents only] [SESSION-TODO D]
- **The gaps lane's group F leftovers** (wave 3 SHOULD-FIX still open: 1 forced moves on a Boss typed per item, 7 Run and Gun's text, 8 `fx/guard.ts` `within` fallback, 11 `open-hand-2` `usable` and `shadow-2` `hideBlock` called directly, 14 `enemySearchTile` AI in code, 18 Launch's two copies of its AP; not checked 2, 10, 12, 17). [M] [open; checked by the gaps lane 19 Nov 2026] [BEFORE-ITEMS-2.0 group F]

#### Built in 0.32 (not yet live)

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
- **Alphas give too much.** One table for Leon of what moved to beta and gamma (the lanes moved the rows; no table). [M] [partly; from the hand-offs] [SESSION-TODO T]
- **Mastered perks that are Narrator-only.** Established Fact and Closing Argument have engine halves (Mind); the others are listed for the next pass: Poker Face I, Old Tales, Between the Lines I, Foresight I, Rank Has Privileges. [M] [partly; from the hand-offs] [proposals 2.8]
- **Per-sheet open items.** Agility: measure the solo Skirmisher. Endurance: the Guard cap of 4 makes "+1 plate" dead for non-Bulwarks; the solo Bulwark's rank II Second Wind fallback is not built. Insight: the solo Mender measure. Perception: free Hide may push the Operative over Shadow's 125 window (Vanish's free Hide is unused by the policy). Strength: Charge Carries +2 or +1 (Breaker 206% at level 20). [M] [open; from the hand-offs] [attribute drafts section 8]
- **Parting Cut** (Ingenuity 9), listed but not built. [M] [open; from documents only] [perception.md; 0.31.5 notes]
- **Playtest balance notes for the tables.** Rolling Start; Razor Beast hits 47-50 at level 2; Channeler deals 152 damage for 32 MP; the Mender's to-hit and its unexplained enemy Bond. [M] [open; from documents only] [TRIAGE balance]
- **Field Repair stays a free unlock** (Improvisation has three perks). The engine-pieces lane did not build it (rules 1.77 item 6517 b): a new perk of two tiers, the unlock at 3 a perk step, Overhaul's added grant, old saves at Improvisation 3+ re-offered the step, and the gate (an action gated by a held item) with it as its first user. Parley's tier I talk-down is Narrator-only (a dead button under the handler). [M] [open; checked in code 19 Nov 2026] [rules 1.74, 1.77]
- **Visualization: re-measure the level-1 Beast; measure Sharp Light and Wake of the Kill together** (the measure picked no forks; no Beast-at-1 tool). [S] [open; from the Mind hand-off] [proposals 5, 5b]
- **Warding Word "against a supernatural effect"** read as the next Brain or Heart save (PROVISIONAL). [S] [partly; from the Soul hand-off] [rules 1.75]

#### Built in 0.32 (not yet live)

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

- **Detect view, the hover faults.** The sightline is built (below); the wisps' hover tip, hover lifting the whole tile stack, the hover card on focus-visible and tile verbs sending no choices were not checked. [M] [not verified; from the hand-off] [scout 14f]
- **Silent property.** The lead ruled Leon's later word (acting from Hidden gives your tile away while you stay Hidden; a Silent attack does not); not built: it contradicts rules still standing (the body's "any attack reveals you", the Break's reveal, Vanish II's roll, Parting Cut's re-hide, the Silent module): Leon to rule each (Waiting on Leon). The `silent` property is read from data already. [M] [open; checked in code 19 Nov 2026] [rules 1.77 item 6517 a]
- **Sight checks still asked without the looked-at unit:** an ally's eyes on an ally (combat ~1361 and ~2868, faith, tactics 129, perks/d 115, perks/e 136, 726 and 845, physical/rules 80, classes/k 1336) and tile-only checks. The lead's call whether `seen_range` applies there. [S] [open; from the hand-off] [rules 1.70 item 5545]

#### Built in 0.32 (not yet live)

- **Dark maps** for shrine, works and rim (works and rim 1 to 2 lamps), Douse on a dark map, Prone's `seen_range`, one sight range (`eyeReach`), enemy notice and vision as tier data. `e45418996`, `9e6ebe053`, spec 6400-6408.
- **The shadow sightline** on the map (who sees each tile, eye lines, the SIGHTLINE switch). `72e99c3e6`.
- **Stalk** (2 AP, once a turn, from Hidden, +1 Shadow) as data. `e45418996`.

#### The review of the shared step: fixes built in the merge (not yet live)

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

### Leftovers (`wip/0.32-leftovers`; hand-off `docs/design/handoffs/0.32-LEFTOVERS.md`; spec rules 1.78, items 6600-6611)

- **Hurl** (the Breaker; momentum-2.0 item 16): needs P14 (see "needs a primitive"). [M] [not built; checked in code 19 Nov 2026] [spec 6606]
- **Pray from holy ground** (prayer-2.0 item 17): needs the seat (P3) on a `hallowed` zone. [M] [not built] [spec 6607]
- **NULL on a Figment, the enemy's weighing** (figments-spec section 8: charge x 4); the unmaking is built. [S] [not built] [spec 6602]
- **Breaching Strike onto Into the Wall's row** (its per-perk code retired; moves the golden tables, so a re-record on purpose). [S] [open] [spec 6605]
- **Stand Behind Me:** two written designs disagree (Guard 2.0 item 9 against the three-layers Bulwark III ceiling); the lead rules first. [S] [needs a ruling] [spec 6611]
- **Hallow and Into the Wall icons** (ART-REQUESTS 0g) and the hallowed ground's own look on the map (drawn as any data zone today). [S] [open] [spec 6605, 6607]

#### Built in 0.32 (not yet live)

- **Two zones of one kind on a tile do not stack** (two Sanctuaries halve once). `5ff4ae85e`, spec 6601.
- **NULL unmakes a Figment** on the tiles it covers (`sigils.json null.dispel`). `b71439891`, spec 6602.
- **The fight joined is an fx event** (the alarm's, `joined`; CONTACT! on the map). `6048d2b07`, spec 6603.
- **Aim marks on a Bonded ally** (Threads Reads them at the Bonder's turn start; one crosshair with the count). `9730b403f`, spec 6604.
- **Into the Wall** (the Breaker: a foe driven into a wall, the edge or a body takes a slam, the body too). `0ab9fbc1c`, spec 6605.
- **Hallow** (the Chaplain's hallowed ground; zone kinds are data). `7f20b1261`, spec 6607.
- **What rides on a hit on the attack card** ("On a hit: Smite, Judged"). `6f6f796d8`, spec 6608.
- **A door's passive steps on the skill page** (the Tending pictures placed). `5a1f6b50d`, spec 6609.
- **The Open Hand's stance picture on the token card's standing line** (each to-hit term names its item; the picture by catalog `data_ids`). Integration, spec 6613.

### 0.32: needs a primitive (ruled by the lead 19 Nov 2026; built by the engine-pieces lane, `docs/design/handoffs/0.32-ENGINE-PIECES.md`, rules 1.77)

What is left of the list (the built ones are under "Built in 0.32" below):

- **A per-unit surprise in the approach** (Tremor I, Shoot First I/II stay Narrator-only). The per-unit sit-out exists (`Unit.waitRound`); no rule makes a character Surprised when ambushed: a balance rule, designed in the report, not built. [M] [open; checked in code 19 Nov 2026] [rules 1.77 item 6517 c]
- **An action gated by a held item** (Field Repair as Improvisation's fourth perk): see the Mind owed item above. [M] [open] [rules 1.77 item 6517 b]
- **A class-only multiplier** (the Figments door 119 and the Rigger 123 against 130 and 150). Not in the lead's ruling list. [gaps report; Balance 2.0]
- **Not approved, left as they are:** a story `acted` (Index II across story and fight), bare fists in the glove family and a thrown Relic property (Items 2.0). [rules 1.77 item 6516]
- **P14, the object op's `hurl`** (lift a loose object or a held small foe next to you and throw it at a second tile: an action with two tile picks; the objects' `loose` field), for Hurl; Grenadier's Arm's per-perk throw would move onto it. [M] [open] [leftovers, spec 6606]
- **The seat (P3) on a zone** (praying from holy ground, Hallow). [M] [open] [leftovers, spec 6607]

#### Built in 0.32 (not yet live; the engine-pieces lane, rules 1.77 items 6500-6515)

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

- **Enemies breaking under Pressure.** Suppressed/Broken take AP, Pressed drops a held shot, Rout runs on a failed save. Owed: the AI acting on Broken ("must reach cover or drop Prone"); no flee or cower. [M] [partly; checked in code 19 Nov 2026] [verification]
- **Bare fists in the glove family (P11).** Overlaps Items 2.0. [M] [not built; checked in code 19 Nov 2026] [CHANGELOG 0.29.0]
- **Enemy squad plan against reactions.** Enemies avoid held lanes (`held_risk`). Owed: bait / two-mover plan. [L] [partly; checked in code 19 Nov 2026] [verification]
- **Enemy versions of the doors.** Sigil and Outburst casters, physical techniques per tier, Momentum and Pressure for all exist. Owed: enemy Guard, Shadow, Bonds, Figments, prayers. [L] [partly; checked in code 19 Nov 2026] [verification]
- **Enemy focus memory past the round.** This-round memory is built; carry it further. [M] [partly; checked in code 19 Nov 2026] [spec 4969(a)]
- **Enemies moving for an angle on an unattacked character.** [M] [not built; checked in code 19 Nov 2026] [spec 4969(b)]
- **Cover arc: a pillar outside the 45 degree arc counts nothing.** The arc is built (`rules.json arc_deg`); this is a design call, to rule before building. [S] [partly; checked in code 19 Nov 2026] [spec 4969(c)]
- **Engine pieces not built:** a thrown Relic property (the fight-joined fx is built, spec 6603; no data row needs a `per_stage` scope, spec 6610). Needs the lead's approval first (CLAUDE.md, no rebuild). [M] [not built; checked in code 19 Nov 2026] [spec 5010; verification]
- **"I'll narrate" in a room.** Human-mode code exists but picking it only shows "coming soon". Owed: the selection and the Narrator screen end to end, with the ruling buttons tested. [L] [partly; checked in code 19 Nov 2026] [SESSION-HANDOFF 6.2-6.3]
- **Co-op stall.** One two-player fight in five stalled on the guest's turn (0.21.0), never reproduced. [M] [open; from documents only] [coop-stall.md]
- **Delivered art with no place in the game** (wiring, not new art; `move-breath` is wired). Owed (the Tending passive pictures are placed: spec 6609): `icon-resource-credits/xp/devotion` and the 7 `icon-tone-*` (`uiMarkOf('resource'/'tone')` never called); `move-sway`, `move-counter` (the Open Hand's stance, `move-open-guard`, is placed on the token card: spec 6613); `camp-step-ready` (checklist has no `ready` key); the `move-draw-fire` placeholder is not in assets.json. [M] [partly; checked in code 19 Nov 2026] [SESSION-TODO O; verification]

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
15. **Shadow numbers** (the Shadow lane's three, built as stated): Prone makes enemies see you 4 tiles less far (12 to 8 lit, 6 to 2 dark)? The works and the rim get 1 to 2 lamps (were 0 to 1: a pitch-black works ran GUARD-36 dry)? Widen Douse from lamps to fires and terminals (one data word, `shadow.douse`)? [0.32-LANE-SHADOW.md]
16. **Outburst 4.0.** The 25 feeling colours and the readings in spec items 801-818. [old ROADMAP]
17. **The open calls listed for you** in the playtest checklist (Survival about 132, Classes 3.0 53, 0.23.0 29) and spec section 14. [PLAYTEST-CHECKLIST; HANDOFF Open 8]
18. **Leftover branches and folders.** May I delete `phc-figments2` (`design/figments-2`) and the ~25 non-git leftover folders? [TAKEOVER State]
19. **Athletics "Defense from 1".** Not built: it moves the enemy yardstick (`test/balance/step1-fit`). Build it and refit the yardstick, or drop it? [0.32-LANE-BODY.md]
20. **The quad Bulwark.** Its stage-1 clears fell 10 to 4 of 40 (Reactive Plate and Last Plate gone; the solo Bulwark 22 to 24). Accept, or give the Bulwark something back? [0.32-LANE-BODY.md]
21. **Silent and the reveal on attack** (rules 1.77 item 6517 a): your later word (acting from Hidden gives your tile away while you stay Hidden; a Silent attack does not) against the rules still standing: the body's "any attack reveals you unless the weapon is silent", the Break's reveal at the action's end (item 1953), Vanish II's roll when an attack reveals you, Parting Cut's re-hide, the Silent module. Which of them change? [open; from the engine-pieces lane 19 Nov 2026]

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
