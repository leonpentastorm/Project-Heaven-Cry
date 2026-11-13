# Classes 3.0, step 8: Figments, the Visualizer and the Rigger (hand-off)

13 Nov 2026. Built from `docs/design/figments-spec.md` (binding; its "Settled" notes override its body) and the Settled
blocks of `class-roster-rev4-proposal.md` section 8. Rules revision **1.34** in `docs/rules/PHC-Core-Rules-v1.0.md`,
section 14 items **2100 to 2140** (all PROVISIONAL). Branch: this worktree's branch (`worktree-agent-ab68f95a6fcdfab8e`),
not pushed, version not bumped. One commit a part (parts 1 to 14).

## 1. What was built

**Data.** `data/figments.json` (new: `visualizer`, `level`, `limits`, `upkeep`, `let_go`, `ladder`, `lure`,
`unit_effects`, `forms` (5), `turret`, `verbs` (5), `traits` (10), `trait_charge`, `items`: the door verbs `picture` and
`visualizer_core`); `items.json visualizer` (focus, off hand, `door: visualizer`); `weapons.json figment_claws` (30),
`figment_edge` (25), `companion_only`; `actions.json` resource `vcharge` (`mg.vcharge`, max `mg.vchargeMax`, needs
`mg.vcarry`) and costs `picture` 2, `let_go` 0, `figment_strike` 2, `figment_pounce` 3, `figment_cut` 2, `figment_stare`
1; `conditions.json watched` (stat `always_seen`, 1 round); `rules.json` profiles `figment` (k 1.5, deal) and `repair`
(k 1.392, Expression and Improvisation, mend, floor 0.5), pair `repair`, `factors.figment` 0.9, `balance.ceilings.figments`
(150 / door 130 / door normal 104 / class normal 120); `enemies.json` tiers `owned_weight` (0, 0, 0.5, 0.5, 1.0) and
`double_save` (null, null, 0, 2, 3); `skills.json` Visualization (per point, unlocks 1, 3, 5, 7, 9; the EPCCG effect line)
and Field Repair's `amounts.repair` 15; `classes.json` the `trickster` block (Rigger: `gain` The Rigger's Hands, six
moves), the Operative's rank II (see 5.1), the move pool (Field Fix, Read, Silver Tongue).

**Engine** (`figments.ts`, the system; everything else a primitive or one general row):

| Rule | Where |
| --- | --- |
| The Visualizer, its charge, the core swap | `character.ts FOCUS_IDS.visualizer`, `hasVisualizer`, `carriesVisualizer`; `magic.ts magicOf` (`visualizer`, `vcarry`, `vcharge`, `vchargeMax`, `vis`), `magicToCharacter` (`visCharge`); the verb `visualizer_core` (lane: `swap_core` site, `res {cores: 1}`, `resGive`) |
| Picture | the verb `picture` (lane in `figments.ts`: `pick: 'forms'` through the new pick-list registry `effects/actions.ts registerPickList`; the tile, range, sight, held cap; `res {vcharge}`), `makeFigment` → `owned.ts spawnOwned` with the block worked out (`o.block`) |
| A Figment's numbers | `figmentBlock` (HP × traits × `damage_mult`, levelled by `levelCompanion`), `setUp` (Defense, accuracy = Visualization modifier + Keen, `lvlDmg` = figment k × deal × factor, held items `fig_<form>` and `figtrait_<trait>`, sight, `figWeight`) |
| What every Figment is | `figments.json unit_effects` (immunities) and each form's / trait's `effects`, held as verb items (`collect.ts` DATA_VERBS line; their `requires: [{owned: figment}]` no sheet meets) |
| Its verbs | `owned.ts OWNED_DATA_VERBS` (figments.json `verbs`) and `runDataVerb` (site priced on the owner, `dash`, `attack`, `on_hit`, `effects`, `unmake` with `refund_share`); `descriptors.ts` OWNED rows read `ownedVerbInfo` |
| Acting through: the gate | `owned.ts addOwnedGate` (one general list); figments.ts: the Visualizer in hand, not Silenced, in projection range (Let go always) |
| Upkeep, the third's AP, Snap | the owned record's `upkeep` (P9); `turn_start_pre` penalties (holding 3+, a Snap); `on_downed` (Snap, found out, taken off the board after the blow) |
| Attention breaks, range, the fight's end | `on_downed` / `cond_landed stunned` (all unravel), `turn_end` (range), `combat_end` |
| Lifetimes (the Rigger's Double, the Scrap Turret) | the owned record's `left` (turn starts left), counted down at the owner's turn start |
| The Double's lure | `illusion.ts FalseImage.body` (perceivedFoes, strikeImage: the blow lands on the body and finds it out); `figments.ts lure`, `doubleSave` (`enemies.json double_save`, `lure.found_out_add`), Elite / Boss at their turn start |
| owned_weight | `combat.ts enemyRank` one term (`ownedWeight`) |
| The Blade's Hold | `move_step` → `react(cb, blade, {kind: attack, payer: owner})`, once a round (`uses(...).take('per_round')`) |
| The Wall's full cover | the owned block's `cover: "full"` (`combat.ts unitCover`) |
| A Figment's fall is no death | `tactics.ts deathMana` 0; no kill-spill Pressure (`physical/rules.ts`) |
| Field Repair | `combat.ts fieldRepair(cb, u, {target, way, parts, reach, gate, item, label})`: one action, three ways (`REPAIR_WAYS`), the repair on the `repair` profile; `combat/repair` takes `targetId`, `way`; `repairAlly` deleted |
| Designs | `Character.figments`, `figments.ts setFigmentDesign / dropFigmentDesign / readyFigments / pictureOptions`; the reducer action `figments/design {charId, design | drop}` (out of a fight) |
| The meter | `figments.ts figmentMeter`; the web's resource panel (`apps/web/src/game/resources.ts`: FIGMENTS pips, VISUALIZER bar, STOWED / EMPTY), Expression ink |

**The Rigger** (`classes/rev3.ts`): Double (`trickster.false_image`, the Figment Double, `free`, `left` 2), Field Fix
(`infiltrator.field_fix`: `fieldRepair` with no part, no gate, reach 2, its own amount), Salvage (wreck / reclaim /
repair through `fieldRepair`), Overclock (`runDataVerb` with `free`, or the machine's plain attack; strain), Sleight
(a Figment or an ally), Scrap Turret (`spawnOwned` the turret block, `auto` verb by weapon, `setUpTurret`, `left` 3).
Deleted: the Evoker False Image handler, the image swap, the old Field Fix handler, Paint the Field's handler
(`perks/skills.ts`) and its client chips.

**General rows added** (each for the next system): `registerPickList` (a system's pick list); `addOwnedGate`;
`OWNED_DATA_VERBS` / `runDataVerb` / `ownedVerbInfo`; `spawnOwned` `o.block`; `unmakeOwned` `share`, `quiet`; owned
record `free`, `left`, `cover: "full"`; `kit.ts Who.dead` (wrecks); a verb item with no grant_action is a standing item
(`collect.ts`); `FalseImage.body`; stat `figment_designs`; cost site `picture`; `REPAIR_WAYS`, `repairable`,
`repairWays` in `combat.ts`.

## 2. Every number (data field: value)

Visualizer charge 10; range 4 + 1 a point, 6 without the door; Picture 2 AP; trait +1 charge; held 1 / 2 / 3 at 1 / 5
/ 7, at most 4, Rigger +1; designs 2 / 3 / 4 / 5 at 3 / 5 / 8 / 10, Rigger +1; traits 1 / 2 at 3 / 7; upkeep 1 charge,
3+ held 1 AP; Let go 0 AP, refund 0.5; Snap 1 AP, none from 9; factor 0.9; profile figment k 1.5; forms as section 14
item 2109; verbs 2 / 3 / 2 / 1 / 0 AP; Pounce dash 3; traits as item 2111; found-out +5; double_save 0 / 2 / 3;
owned_weight 0 / 0 / 0.5 / 0.5 / 1; Field Repair repair 15 (profile repair); Rigger: Double 2 AP 1 charge 2 rounds,
Field Fix 2 AP reach 2 repair 15, Salvage 1 AP 2 charge reach 1 repair 15, Overclock 1 AP range 8 max 2 AP strain 5,
Sleight 1 AP range 6, Scrap Turret 3 AP 3 rounds, 40 / 10 / 5.

## 3. Golden lines and replays

**Golden tables** (re-recorded on purpose, part 10; no existing number changed): NEW lines for the condition `watched`
(36 in `conditions.json` and its log), the two Figment weapons (10 each in `weapons`, `rules-weapons`, `costs-weapons`
and logs/marks), the two door verbs on every class in `costs-credit` (30), the Rigger's stats rows in `itemops-traits-
classes` (3) and Read's rows under the Operative (4), `costs-items-shelved` Silver Tongue (1). GONE lines: the old
Trickster moves and the Infiltrator's Field Fix in `costs-items-traits-classes`, `rules-items-traits-classes` (8 each,
and their marks / logs), `itemops-traits-classes` (8). CHANGED lines: the price list rows (`prices2` of
`perk/overhaul@mastered`, `trait/grenadiers_arm`, `trait/gun_nut`) gain `picture2`; the two `#coverage` counts (110 →
112 items). The Rigger's new moves have no golden line (the item tables did not pick them up: a later step may add them).

**Replays** (part 11, `REPLAY_RECORD=1 REPLAY_FULL=1`, the four oracles green first): 10 games moved, every one with the
Sigil build (Visualization points): `open-4v7-magic-boss`, `cover-4v7-casters`, `cover-4v7-magic-boss`,
`open-4v7-casters`, `cover-4v7-level20-allin`, `open-4v7-level20-allin`, `proving-4v12-magic`, `proving-waves-long`,
`story-fight-story-magic`, `story-fight-story-high`. Cause, proved: every character with Visualization 1+ now holds the
door verbs Picture and Load the Visualizer; with the verbs' `requires` set out of reach the two default games keep their
old hashes.

## 4. The measurement (figments-measure.ts; 4 fights a cell, 2 Soldiers, open ground, 5 rounds)

Worth a turn as % of the normal-share plain rifle-turn: D (damage through the owner's AP: the Figments and the pistol)
+ S (damage enemies spent on Figments, in Soldier-turns, capped at 0.6 of their output).

| Row | L1 | L5 | L10 | L20 | Mean | Line | Off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Door, normal | 166 (21 + 145) | 153 (7 + 146) | 135 (40 + 95) | 165 (44 + 121) | 155 | 104 | +49% |
| Door, all in | 202 (20 + 183) | 130 (42 + 88) | 135 (39 + 96) | 165 (41 + 124) | 158 | 130 | +22% |
| Rigger, normal | 158 (15 + 143) | 164 (3 + 160) | 166 (40 + 126) | 145 (55 + 89) | 158 | 120 | +32% |
| Rigger, all in | 186 (22 + 164) | 145 (31 + 114) | 154 (45 + 108) | 150 (47 + 104) | 159 | 150 | +6% |

Read: the Rigger all in sits on its line; the soak (S) is nearly all of the worth and is the same for every row, so the
door rows are far over and the class's edge (one more held, Overclock) does not show with two Soldiers (they cannot
use a third body). The spec's dial for a hot S is `figments.json level.hp` (then the factor). **Not refitted** (the brief).
The guard row in `balance-contract.test.ts SYS` is NOT added (it would fail on the door rows); step 11's to decide.
Caveats of the tool: the policy holds two bodies for everyone; D is low because a Figment acts only on what the side
sees (rule 9) and the owner must walk up to see.

**Performance** (CPU time, 4 v 7 Soldiers, 5 samples): with no owned unit a shot 2.6 ms and an End turn 7.4 ms; with
**twelve Figments** (four owners, three each) a shot 5.8 ms and an End turn 64.7 ms (the seven enemy turns rank and
preview 16 targets instead of 4). Acceptable for play; the enemy step may want to prune targets.

## 5. Where the spec was wrong or silent, and what was done (calls for Leon, also in the pick-up guide)

1. **Field Fix's move and the Operative's rank II**: the validator wants two moves a rank and a ref used once. On this
   branch Field Fix is a move-pool move (key kept) referenced by the Rigger, and **Read stands in the Operative's rank II**
   in its place (Read goes to the Operative in Rev 4). The Shadow step's merge sets the Operative's ranks (take theirs).
2. **The held count** is `ladder.held + statQuery(ties_max:owned)`, counted over Figments made by Picture only (the
   tie kind `owned` has no max: a drone does not count, the Rigger's Double and the turret do not count).
3. **A Figment acts only on what its side sees** (rule 9, literal): a Beast next to an enemy no unit of the side sees
   can't strike it ("It can't see them").
4. **A Figment's fall is no death**: no mana, no Pressure spill (the spec is silent).
5. **Overclock** makes the unit's ATTACK only (the nearest enemy it can reach), not "one of its actions"; Stare and moves
   are not overclocked. **Salvage** takes the first fitting unit next to you (no grid pick).
6. **The Double from Picture** (the door's) has upkeep and no lifetime; the Rigger's Double is free and lasts 2 rounds.
7. **A Boss** is fooled for one of its turns at most (the round counter would be a hand-kept round compare: a mark).
8. **Field Repair's repair** writes HP directly (a repair is not a heal: no Healing received), as the old Field Fix did.
9. **Paint the Field** is deleted (handler and chips); Afterimage was never built.
10. **The Visualizer's charge** persists on the character (`visCharge`), as the Evoker's.

## 6. Not built (and why)

- The Call spoken through the Double (rule 15): Calls have no "speak from another unit" field (a Calls change).
- NULL unmaking Figments (`sigils.json null.dispel`: the Sigil system's file; a later step).
- Mirror's pick of whose look (Mirror lures as the owner).
- Tethered's "+4 range" counts for acting through and the end-of-turn check; Swift's "no opportunity attacks" is not
  built (no item op makes a unit's move draw none).
- Volatile's and Barbed's data effects are held but not tested in a fight.
- Scrap Turret from a barricade object: matched by the object kind containing "barricade".
- Overclock on a WATCH turret (a zone, not a unit).
- The Visualizer out of a fight (rule 17): the Narrator's.
- The screen beyond the meter: a "Figments" action tab, the design editor on the Magic tab, the hover cards for forms and
  traits, "believes the Double is [you]", the bots-stream VFX (step 10). Picture is a row of the Perks tab today; the
  Figments' verbs are rows of the Utility tab. Tokens show the form's glyph until the portraits come (ART-REQUESTS C6).

## 7. For the enemy step (9)

A Wall in the AI's clearing list (`aiClearBlock`); the Blade's tiles in `aiRouteRisk`; Volatile's burst in standing
next to it; NULL on a Figment weighed at its charge × 4; the Visualist caster; Soldiers firing on Figments only with no
character in reach (today: `owned_weight` only); pruning targets for speed (section 4).

## 8. How to add one more form (or trait)

1. A row in `figments.json forms` (`opens`, `charge`, `hp`, `defense`, `armour`, `movement`, `weapon`, `verbs`, `glyph`,
   `effects` for anything it is always) and its ladder entry (`ladder[].forms`). A trait: a row in `traits` with its one
   field (`hp_mult`, `tiles`, `weight`, `range`, `upkeep`, `roll`, `charge`, `vision`) or `effects` (item ops).
2. A new verb: a row in `figments.json verbs` (`site`, `attack`, `dash`, `reach`, `on_hit`, `effects`, `unmake`) and its
   cost site in `actions.json costs`. Nothing in code: `runDataVerb` runs it, the descriptors list it.
3. A section 14 item, the validator, a test in `figments.test.ts`.

## 9. Checks at the close

`python3 tools/validate.py data` 0 errors; `tools/engine_catalog.py --check` clean; `npm run built-from`: 7 smells in 3
places: `protodata.json` (generated), the three new Rigger lane handlers in `classes/rev3.ts` (the lint baseline recorded
on purpose: what they would need is a `spawn` with a weapon taken from a wreck / pile / barricade, an "act now" op on an
owned unit, and a wreck as a target), `combat.ts` Field Repair's HP write (5.8). `class-weapon-neutral`: the Scrap
Turret's one family read is in DOOR. Browser: `figments` (new, group `rules`) green on its own port.
