# 07. Gear and perks: grades, mods, the maker signatures, every perk, the caps that go, and traits

Drafter's file for the 0.34 rebalance (21 Nov 2026). Written to the charter (`docs/design/proposals/2026-11-21-the-curve.md` section 18) and Leon's rulings in sections 10, 11, 13, 15 and 17 of that file. **Nothing here is built.** Every proposed number is PROVISIONAL. Facts about today were read in data and code at `release/0.34-final` and carry file:line.

**What this file leans on from the others.** `01-scale.md` was not written when I drafted this, so where a number rides the new level column I say so and give the level-1 figure from the charter (a maul 20, a rifle 14, level column ×40 at level 20). **Margins** (curve section 2, Law 2) are the rolls drafter's piece; I assume this shape: on a hit, every full 4 the total beats the Defense or TN by is a Margin, a critical adds two, each Margin adds a quarter to what the roll does. **A critical stays a word**: a natural 20, or a roll in the weapon's critical range (the `critMin` the attack roll already carries, `combat.ts:1644`). Only the critical's multiplier goes.

---

## 1. Grades

### 1.1 Today (checked)

| Grade (`data/rules.json`) | acc | dmg | dur | price | marks | arm | sold |
| --- | --- | --- | --- | --- | --- | --- | --- |
| standard (:1605) | 0 | 1 | 1 | ×1 | 0 | 1 | yes |
| fine (:1616) | +1 | 1 | ×1.25 | ×3 | 1 | 1 | yes |
| masterwork (:1627) | +2 | 1 | ×1.5 | ×8 | 2 | 1 | yes |
| relic (:1638) | +2 | 1 | ×1.5 | ×25 | 3 | 1 | yes |
| celestial (:1649) | +2 | 1 | ×1.5 | ×50 | 4 | 1 | no |

Every reader of the rows:
- `character.ts:191` builds `RARITY` from them. `:195` `maxDurOf` reads `dur`. `:224` `armOf` reads `arm` for a worn graded piece. `credits.ts:68` reads `price`.
- `combat.ts:580` adds `acc` to the unit's attack. `combat.ts:585` puts `dmg` on the unit as `dmgMult`. `combat.ts:1536` applies it only when the striking weapon is the main-hand weapon: **an off-hand weapon's grade does nothing to its damage.**
- Nothing in `sigil.ts`, `magic.ts` or `classes/soul.ts` reads a grade. **A graded Evoker, Emanator, Attuner or Visualizer gets durability, price and marks only.** Its only power is a Relic property.
- **The mod slot is not built.** The spec's rarity table (`PHC-Core-Rules-v1.0.md:680-682`) promises "+1 mod slot" at Fine and Masterwork. `rules.json:1603` says the same. Nothing reads it: `character.ts:1721` reads only the row's `mod_slots`.
- **Relic property.** One string, `GearState.prop` (`character.ts:1124`). It comes from `survival.json relic_props` (:224, seven rows) and counts against boon room (`run/power.ts:47` `runWorth` adds `gearProps`). **Armour takes none**: "Armour takes no Relic property yet" (`run/progress.ts:143`).
- **Celestial is a Relic.** `cappedRarity` turns a Celestial roll into a Relic (`run/rewards.ts:160-164`). The validator refuses Celestial as a ceiling (`tools/validate.py:2960`).
- **The ceiling.** `rewards.ceiling` is fine / masterwork / relic for stages 1 / 2 / 3+ (`survival.json:147`; `run/rewards.ts:156`). The Relic step opens at the Forge from stage 3 (`survival.json:195` `relic_from_stage`). The vault gives one grade over the ceiling, at most Relic (`survival.json:580`).

### 1.2 The new ladder (the charter's numbers; PROVISIONAL)

| Grade | To hit | Damage, heal and shield | Armour value | Extra mod slots | Properties | Why a player would feel it |
| --- | --- | --- | --- | --- | --- | --- |
| Standard | +0 | ×1 | ×1 | 0 | 0 | the row as listed |
| Fine | +1 | ×1.15 | ×1.15 | 0 | 0 | *the first upgrade hits a sixth harder: you see it on the next hit* |
| Masterwork | +2 | ×1.3 | ×1.3 | **1** | 0 | *a third harder, and room for the mod you have been carrying* |
| Relic | +3 | ×1.5 | ×1.5 | 1 | **1** | *half again, and a name of its own* |
| Celestial | +3 | ×1.75 | ×1.75 | 1 | **2** | *the best thing on the field, and two names* |

Durability, price and marks stay as they are (the economy drafter's). The spec's "+1 mod slot" on Fine is dropped (it was never built, so nothing is taken back).

**One copy of the grade.** A grade becomes a modifier row the instance carries, the way a Relic property already is:
- Each `rules.json rarity` row gains `effects`:
  - `{op: roll_mod, when: to_hit, if: {with_this: true}, value: <acc>}`
  - `{op: damage_mult, when: dealing, if: {with_this: true}, value: <dmg>}`
  - `{op: mend_mult, when: heal|shield, if: {actor: self, with_this: true}, value: <dmg>}`
- The carried-modifier collector (`effects/collect.ts:220`, which reads `prop`, `mods` and the row's `variant_mods`) adds the instance's grade row.
- The `with_this` predicate already means "a weapon's event made with that hand's weapon, a door's event with that door's focus" (`effects/triggers.ts`, ENGINE-HOOKS predicates). So:
  - the off hand's weapon gets its grade;
  - every door's focus gets its grade on that door's output: a Masterwork Evoker's Lines hit a third harder, a Fine Attuner's Tending heals a sixth more.
- `combat.ts:580`, `:585` and `:1536` stop reading `acc` and `dmg` (the second copy goes). `arm` keeps its one reader (`armOf`, `character.ts:224`).

**The mod slot at Masterwork.** The rarity row gains `extra_slots` (0 / 0 / 1 / 1 / 1). It joins the one counter of extra slots, `extraSlots` (`perks/c.ts:211`), which today counts Gun Nut, Blade Recluse and Overhaul. An extra slot is a second mod in a slot kind the row already has, as those three give.

A row with no `mod_slots` (the coach gun, the sawn-off, the flamer, knuckledusters, the servo fist, thrown weapons) gains one `grip` slot at Masterwork. *Every hand-held thing has a grip, so the reward is never empty.* The grip has one mod today (the wrapped grip, section 2): a second one is content for the items drafter.

**Properties.**
- **Celestial carries two.** `GearState.prop` becomes `props` (a list): a saved-shape change, with a migration from `prop` (section "What re-records").
- `cappedRarity` stops turning Celestial into Relic where the find's ceiling allows Celestial.
- **Armour gets properties**, three new rows in `relic_props` with `fits: ["armour"]`:
  - `prop.padded`: melee blows on you ×0.85;
  - `prop.sealed`: elemental damage on you ×0.85 (inside `elemental_taken_cap`, `rules.json:857`);
  - `prop.lightened`: this piece's Heavy word costs no Movement (`rules.json weapons_rules.heavy`).
  This needs two small extensions (section "Needs a new primitive"): `with_this` reads a worn instance, and `FITS` (`run/power.ts`) learns the word `armour`. *A Relic plate should feel like a Relic gun.*
- **A property no longer costs boon room** (Question 3). *The grade paid for it; the boon cap was priced in rifle-turn percent, a withdrawn unit.*

### 1.3 The grade by map (Survival as five maps, then endless; PROVISIONAL)

The ceiling splits into two lists. **Finds** cover reward rolls, the vault and a Boss's pick. **The shelf** is what a shop sells and the Forge steps to. With one ceiling for both, either the shop sells Relic at hour 13 (too early on the calendar) or Relic cannot be found before endless (too late).

| Map | Finds (`rewards.ceiling`) | Vault (one over finds) | Shelf (`rewards.shelf`, new) | Hours (06-world) | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | Fine | Masterwork | Fine | 0 to 2 | *the first upgrade is in reach in the first hour* |
| 2 | Fine | Masterwork | Fine | 2 to 4.5 | *the dead-end fight pays a Masterwork early* |
| 3 | Masterwork | Relic | Masterwork | 4.5 to 8 | *Masterwork and its slot by hour 8, as the calendar asks* |
| 4 | Masterwork | Relic | Masterwork | 8 to 12.5 | |
| 5 | **Relic** | Relic | Masterwork | 12.5 to 16 | *the final map's Boss and vault can give a Relic; the shop cannot* |
| endless 6 to 9 | Relic | Celestial | Relic (Forge Relic step) | 16 to 26 | *Relic everywhere once Survival is cleared* |
| endless 10+ | **Celestial** | Celestial | Relic | 28 on | *Celestial is only ever found, deep in endless, about hour 33 as the calendar asks* |

Data changes:
- `rewards.ceiling` becomes `[fine, fine, masterwork, masterwork, relic, relic, relic, relic, relic, celestial]`; the last entry repeats.
- New `rewards.shelf`: `[fine, fine, masterwork, masterwork, masterwork, relic]`, with the same reader shape (`stageCeiling(stage, 'shelf')`).
- `vault.grade_max` becomes `celestial`.
- `grade_up.relic_from_stage` becomes 6.
- The validator allows Celestial in `ceiling` and refuses it in `shelf` (`tools/validate.py:2960`).

This differs from `06-world.md` section 3.2 on map 5 only: that file has Masterwork finds there. I follow the brief (Relic on 5) and keep the shop at Masterwork, which holds 06's reason.

---

## 2. Mods: one visible trade each

Today: 13 weapon mods and 6 quiver enchantments (`data/items.json:283-686`). Most change one to-hit term or a flat number. On the new scale a flat −2 or +3 is nothing: a level-20 hit is about 1,400. Each mod below gives one thing a player sees and pays one thing a player sees. The fit price at the Forge (`survival.json:211` `fit.rate` 0.2) is unchanged.

| Mod (items.json line) | Today | New: what it gives | New: what it costs | Data form (existing ops and gear fields only) |
| --- | --- | --- | --- | --- |
| Red dot `mod_red_dot` (283) | no −2 in the first band past effective range (`bands` 1) | Shots, Snap Shots and Bursts +1 to hit; no penalty in the first band past effective range | Aimed Shots −1 (it is not a scope) | `bands: 1, bands_modes: [shot, burst, auto]`; `roll_mod` to_hit `{with_this, mode: [shot, burst, auto]}` +1; `roll_mod` `{mode: [aimed]}` −1 |
| Scope `mod_scope` (304) | Aimed +1, one more band | Aimed Shots +2 to hit and two more bands | Shots and Bursts −1 (tunnel) | `bands: 2, bands_modes: [aimed]`; `roll_mod` aimed +2; `roll_mod` `[shot, burst, auto]` −1 |
| Suppressor `mod_suppressor` (336) | silent; −2 damage (flat) | silent; **a kill with it while you are Hidden gives 1 Shadow** | its shots ×0.85 | `silent: 1`; `damage_mult` dealing `{with_this, melee: false}` 0.85; `resource` shadow +1 on `kill` `{with_this, self_has: [hidden]}` |
| Compensator `mod_compensator` (363) | Recoil −1 a shot (all recoil gone) | no Recoil from earlier shots this turn | the first shot of each turn −1 to hit (heavy muzzle) | `recoil: -1`; `roll_mod` to_hit `{with_this}` −1, `limit {per: per_turn, n: 1}` |
| Extended magazine `mod_extended_mag` (381) | +50% capacity | +50% rounds | reloading it costs 1 AP more | `magazine_pct: 50`; `cost_mod` cost `{action: [reload], with_this}` +1 |
| Quick-release `mod_quick_release` (399) | reload costs 1 AP | reload costs 1 AP | 25% fewer rounds | `cost_mod` set 1 (as today); `magazine_pct: -25` |
| Foregrip `mod_foregrip` (428) | Bursts and auto +1 | Bursts and full auto +2 to hit | drawing or swapping to this gun costs 1 AP more | `roll_mod` `[burst, auto]` +2; `cost_mod` on `swap` `{with_this}` +1 |
| Bayonet `mod_bayonet` (457) | the gun's blow deals 15 (Dexterity) | the gun's blow deals a combat knife's damage and builds Momentum as any melee hit | Aimed Shots −1 | `melee_damage`: the combat knife's base on the new scale (7, the scale drafter's ×0.45); `roll_mod` aimed −1 |
| Underslung launcher `mod_underslung` (475) | holds a 40 mm round; **not built** (`built: false`) | **once a fight, 2 AP: a grenade at a tile within 8**: a launcher round's blast, radius 1 | 1.5 kg, the underbarrel slot, and once a fight | `grant_action` (an item's action, `effects/actions.ts`): `ap: 2`, `uses {per: per_combat, n: 1}`, `reach {tile: true, tiles: 8, sight: true}`, effects `deal` (an `amounts` block of the launcher's blast) with `targets {of: tile, shape: burst, within: 1, side: any}`. No new op |
| Serrated edge `mod_serrated` (493) | a critical blow causes Bleeding | as today: a critical blow causes Bleeding (Body save skipped) | blows ×0.9 (teeth bite less deep) | today's `condition` on hit `{crit: true}`; `damage_mult` dealing `{with_this, melee: true}` 0.9 |
| Weighted head `mod_weighted` (524) | +3 damage (flat) | blows ×1.2 | blows −1 to hit | `damage_mult` `{with_this, melee: true}` 1.2; `roll_mod` to_hit `{with_this, melee: true}` −1 |
| Wrapped grip `mod_wrapped_grip` (550) | can't be Disarmed; **not built** (narrator) | you can't be Disarmed while you hold it | swapping away from it costs 1 AP more | `cancel` on `cond_incoming` `{target: self, cond: [disarmed], with_this}`; `cost_mod` on `swap` `{with_this}` +1. `adjudication: engine` |
| Sigil-etched magazine `mod_sigil_magazine` (568) | holds a stored spell; **not built** | the first glyph you draw each turn costs 0.5 AP less (the spellslinger's pistol is an Evoker) | 25% fewer rounds | `cost_mod` on `glyph_cost` `{with_this}` −0.5, `limit {per: per_turn, n: 1}`; `magazine_pct: -25` |
| The six enchantments (586-686) | a tone's rider at stage 2; arrows ×0.9 | KEEP: already a trade | KEEP | unchanged |

*So a mod is a choice you can read on the card before you pay for it: the scope makes you a better sniper and a worse brawler.*

Every flat damage number on a mod is gone (two rows: the suppressor and the weighted head). Three dead mods are built from existing pieces: the underslung launcher, the wrapped grip and the Sigil magazine. No mod needs a new op. The `<field>_modes` limit already exists (`character.ts:1738` `gearNum`).

---

## 3. The maker signatures

### 3.1 The one general piece: the family's signature row

**Today.** A maker's signature is a modifier row in `items.json` (`mod_line_arsenal` :1815, `mod_line_smetanita` :1835), named row by row in each weapon's `variant_mods`. It is held while that gun is in a hand. The readers:
- `effects/collect.ts:217-220` (`baked`), `effects/hooks.ts:201` and `effects/triggers.ts:277` read `variant_mods` for the item ops;
- `gearpreview.ts:156`, `:340` read them for the card;
- **`gearNum` does not** (`character.ts:1738-1742`: only the fitted `mods` it is given). So a signature cannot move a gear number (Recoil, bands, magazine). That is why Chezknov shipped plain (rules 1.92 item 8021, G14).

**The piece (PROVISIONAL).**
1. A family row in `data/families.json` names its signature **once**: `"signature": "<items.json modifier row>"`.
2. Every weapon row of that family carries it while in a hand, through the one carried-modifier list (`collect.ts:220`), beside `variant_mods`, the fitted mods and the grade row (section 1.2). The per-row `variant_mods` entries for Arsenal and Smetanita move up to their families (one copy).
3. `gearNum` reads the same carried list, not only the fitted mods. So a signature row may carry gear fields with their `<field>_modes`, exactly as a mod does.

A signature then **feeds a door's counter** with the `resource` op (Pressure, Momentum, Guard, Shadow, `vcharge`: `data/actions.json resources`), **reads one** with `self_res` / `target_res` / `self_has_res`, and uses `mark` / `flag`, `cost_mod`, `zone`, `displace` and `cancel` like any item. *A maker's gun plays like its maker on every row, and a new row of the family gets it for free.*

### 3.2 The thirteen that ship plain, and their data form

Sources: rules 1.92 items 8021, 8024, 8030 to 8035 (`PHC-Core-Rules-v1.0.md:14560-14636`) and rules 1.93 item 8104 (`:14699`).

| # | Signature (family) | Door it feeds or reads | Carried by the piece as it is? | Signature row (data form) |
| --- | --- | --- | --- | --- |
| 1 | G2 revolvers' best critical (`revolvers`) | Pressure | **needs more**: a critical range a gear field can widen (`crit_range`, see "Needs a new primitive") | `sig_revolver`: `crit_range: 1` (19 and 20 are criticals, so two Margins); `resource` pressure +1 on `hit` `{with_this, crit: true, hostile: true}`, target. *A revolver's lucky shot also pins them.* |
| 2 | G4 Legion, shoot then move (`legion_automatics`) | Pressure (Fire and Move's pattern) | **yes** | `sig_legion`: `mark` `fired` on `attack_roll` `{with_this, own_turn: true}`; `cost_mod` on `cost` `{action: [move], flag: fired, path_tiles_at_most: 2}` value −1, min 0, `limit {per: per_turn, n: 1}`; `mark` clear `fired` on `turn_end` (the `fire_and_move` row's shape, classes.json) |
| 3 | G11 Brigade's split burst (`brigade_auto_shotguns`) | Pressure | **yes, as a door feed**: the damage split itself would be new; the signature is carried as "the burst's spray presses its neighbours" | `sig_brigade`: `resource` pressure +1 on `hit` `{with_this, mode: [burst, auto]}` with `targets {of: target, side: foe, within: 1, shape: aura}`, `limit {per: per_turn, n: 1, each: target}` |
| 4 | G13 ADCorp, the Forge fits its mods for less (`adcorp`) | none: an economy signature | **needs more**: one reader line. The Forge's fit fee (`survival.json:211`, `fit.rate`) multiplies by a `forge_fit_rate` on the gun's carried signature row | `sig_adcorp`: `forge_fit_rate: 0.5` (no effects). *Half the fee to fit, swap or take off a mod.* |
| 5 | G14 Chezknov, less Recoil on Bursts (`chezknov_works`) | none; it feeds the Burst | **yes**, once `gearNum` reads the carried list (part of the piece) | `sig_chezknov`: `recoil: -1, recoil_modes: [burst, auto]`. *The Burst's second roll keeps its aim.* |
| 6 | H3 flamers' burning ground (`flamers`) | none; a consequence on the map | **yes**, with one new data row: zone kind `burning_ground` in `rules.json zones.kinds` | `sig_flamer`: `zone` on `hit` `{with_this}` kind `burning_ground`, at target, within 0, rounds 2; `condition` burning on `turn_start` `{actor: foe, actor_in_zone: {kind: burning_ground, owner: self}}`, target actor (the Hallow pattern, classes.json `hallow`) |
| 7 | H4 rotary's Spin Up (`rotary_and_belt_fed`) | none; AP | **yes** | `sig_spin`: `mark` `fired` on `acted` `{with_this}`; on `turn_end`: `mark` `spun` `{flag: fired}`, then `mark` clear `spun` `{no_flag: fired}`, then `mark` clear `fired`; `cost_mod` on `cost` `{action: [attack], with_this, mode: [auto, burst], flag: spun}` −1. *Keep it spinning and it costs less; stop and it spools down.* |
| 8 | H5 anti-materiel, the line hit (`anti_materiel`) | none | **needs more**: a unit set "on the line past the event's target" (`targets.past`) | `sig_through`: `deal` on `hit` `{with_this, target_alive: any}` an `amounts` block `{kind: damage, per: [{of: "event:amount", value: 0.5}], armour: full}` with `targets {of: self, shape: line, past: true, within: 3, side: any}` |
| 9 | H8 thrown, two targets (`thrown`) | none; AP | **yes, as a tempo**: "throw one, the second is cheaper" | `sig_thrown`: `mark` `threw` on `hit` `{with_this, mode: [thrown]}`; `cost_mod` on `cost` `{action: [throw], flag: threw}` −1, min 1, `limit {per: per_turn, n: 1}`; clear on `turn_end` |
| 10 | the door knocker's ×3 to cover (`power_gauntlets`) | Momentum | **yes, by a data move**: its push 3 leaves the grant for its own modifier row, which frees the grant for Door Key | the row's `variant_mods` gains `mod_knocker`: `displace` on `hit` `{with_this, hostile: true}` tiles 3 (today's number); the row's `grants` becomes `cover_damage_mult` 3 |
| 11 | the throwaway tube's single use (`rocket_tubes` row `legion_throwaway_tube`) | none; consequence | **yes** (once a fight; it is back after the fight) | `mod_throwaway`: `mark` `spent` on `acted` `{with_this}`; `cancel` on `attack` `{with_this, flag: spent}` why "The tube is spent." Its text says "once a fight". |
| 12 | the wall gun, Prone only (`blackpoint_wall_gun`, held) | none | **yes** (the row can ship) | `mod_wall_gun`: `cancel` on `attack` `{with_this, self_lacks: [prone]}` why "It fires only from Prone." (`conditions.json:295` prone) |
| 13 | the darts' Toxin (second skill, Ingenuity 3) | none | **yes**, with one new data row: condition `toxin` in `conditions.json` (a Body debuff: Weakened's row shape) | `mod_darts`: `condition` toxin on `hit` `{with_this, self_skill: {ingenuity: 3}, target_alive: true}` |

Carried as they are by the piece and existing ops: **10** (2, 3, 5, 6, 7, 9, 10, 11, 12, 13). Need more: **3** (1 `crit_range`, 4 the Forge fee reader, 8 `targets.past`).

Two of the "as is" rows add a data row the engine already reads generically: a zone kind (6) and a condition row (13). G16 Smetanita and G15 Arsenal are carried today; they move from `variant_mods` to their families' `signature` (one copy).

---

## 4. Perks

### 4.1 The rules I applied

- **KEEP**: a verb, or already felt (a tenth of a number the player sees, an AP of six, +2 on a d20 or more, a whole turn).
- **RE-STEP**: a conditional damage or defence number. Tier I is +15% and tier II +30% while the condition holds. Per-stack perks are scaled so the top is the same; the stack that reaches it is named. A d20 term under +2 goes to +2 (I) and +3 or +4 (II): on a d20 with Margins a +1 is a twentieth, under the "felt" bar.
- **BECOMES A VERB**: a small unconditional number with nothing to do. It becomes something to do, built from existing pieces.
- **DEAD TODAY**: it gives nothing. That is chiefly the pure story perks: Survival is the only open mode (`data/modes.json`: Campaign `available: false`), and it has no Narrator scene to read them. Each keeps its story half for campaigns and gets **a fight half from existing pieces**.
- **No perk above the step is cut** (Righteous stays at +20 / +40%): *a reward is never taken back.*

### 4.2 Acquired perks (90; `data/perks.json`, line of the row)

| id (line) | Skill | Today, with numbers | Verdict | New (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| bulwark (23) | Durability | +2% weapon damage per Guard held, to +10%; II +3% to +15% | RE-STEP | I +5% a plate held, to +15% (3 plates, Durability 4's Reach); II +6% a plate, to +30% (5 plates). *A full wall hits back a third harder.* |
| shrug_it_off (151) | Durability | after a blow hurts you, +8% weapon damage to your next turn's end; II +12% and +1 Guard (once a round) | RE-STEP | I +15%; II +30% and +1 Guard |
| numb (318) | Pain Threshold | an injured limb no penalty; II with Guard, a critical on you lands as an ordinary hit, no injury | KEEP | II now reads: a critical on you adds no Margins and leaves no injury |
| still_standing (462) | Pain Threshold | a last turn at 3 / 5 AP, once a fight | KEEP | |
| second_wind (566) | Pain Threshold | 2 AP once a fight, heal 25% of max HP; II +2 Guard | KEEP | a share of HP rides the scale by itself |
| close_guard (699) | Pain Threshold | Answer: 25% / 50% of a blow on an adjacent ally comes to you, plates soak | KEEP | a verb |
| wind_on_the_skin (828) | Sensory | learn the nearest / every unseen foe's tile in Vision at fight start | KEEP | |
| bedside_manner (907) | Sensory | story: learn whether the next words are a lie | DEAD TODAY | fight: I a foe next to you that you touch (0 AP, once a fight) is Read (`conditions.json:551` `read`, Read Intent's mark); II once a turn |
| read_the_air (977) | Sensory | story: +2 / +4 on the next social roll | DEAD TODAY | fight: the save of a foe next to you against your next Call is +2 / +4 TN (`roll_mod` on `save`, `roll: tn`, `target_within: 1`, once a turn) |
| tremor (1057) | Sensory | +1 / +2 to the squad's ambush roll; never caught; II starts with 2 Guard | RE-STEP (roll) | I +2; II +4, the rest kept |
| breaching_strike (1167) | Raw Power | after a Finisher drops a foe, the next Strike or Opener costs no Momentum; II a Finisher on an Elite or Boss gives 1 Momentum | KEEP | a verb on the chain |
| iron_grip (1354) | Raw Power | Grappled / Bound can't Answer; +6% melee vs Grappled or Prone; II +12% (also Shaken, Afraid), push +1 | RE-STEP | I +15%; II +30%, the rest kept |
| into_the_dark (1480) | Guts | no Ambush bonus on you after first stepping into unseen ground | KEEP | |
| steady (1561) | Guts | Fear can't stop you; II Fear and Nausea at most 1 round | KEEP | |
| point_man (1650) | Guts | allies within 3 roll Fear with your Guts; II +2 Heart saves | KEEP | |
| unflinching (1770) | Guts | at 3+ Momentum, melee attacks on you −1; II shots too | RE-STEP (roll) | I −2 melee; II −2 every weapon attack |
| grim_reaper (1884) | Intimidation | a hit from a Shaken or Afraid foe costs no Momentum; II a kill frightens within 8 | KEEP | |
| marrow_talk (2108) | Intimidation | story: a failed threat Shakes (−2); II in a fight a saved Threaten still Shakes 1 round | DEAD TODAY (I) | I takes II's fight half (Shaken 1 round); II Shaken 2 rounds |
| stare_down (2240) | Intimidation | the nearest foe saves or is Stunned; II Shaken 3 rounds | KEEP | |
| bone_talk (2359) | Intimidation | story: a truthful answer or Shaken | DEAD TODAY | fight: I 0 AP, once a fight, a foe next to you makes a Heart save or is Shaken 2 rounds and Read; II every foe within 3 (`grant_action`, `condition` with `targets`) |
| wall_run (2449) | Athletics | vault 2 / 4 tiles at no extra movement | KEEP | |
| roll_with_it (2524) | Athletics | a miss on you, 1 / 2 free tiles | KEEP | |
| untouchable (2598) | Athletics | no torso armour (II light): attacks on you roll twice, worse | KEEP | |
| catch (3400) | Athletics | catch a grenade; throw back 1 / 0 AP | KEEP | |
| both_hands, Pressure Point (2706) | Dexterity | +1 Pressure on a Pressed foe; +5% vs Pressed; II +1 more on Suppressed, +5% more vs Suppressed | RE-STEP | the pips kept; I +15% vs Pressed; II +15% vs Pressed, +30% vs Suppressed |
| running_reload, Keep Their Heads Down (2923) | Dexterity | a hit on a Pressed foe puts it Off Balance (save; II none) | KEEP | |
| rounding_up (3057) | Reaction Speed | a fraction of an AP rounds up; II 1 AP carries once a fight | KEEP | |
| shoot_first (3135) | Reaction Speed | act in a failed ambush's free turn at 3 / 4 AP | KEEP | |
| cut_in (3219) | Reaction Speed | story: interrupt once / twice a scene | DEAD TODAY | fight: I once a fight, when a foe you see starts an action, 1 free AP first: a move, a swap or a reload; II 2 AP (Between Heartbeats' piece, the data op `interrupt`) |
| speed_load (3291) | Reaction Speed | reload 1 AP less; II a draw-attack free once a fight | KEEP | |
| sleight_of_hand, Long Dark (3496) | Ingenuity | +8% / +14% while Hidden | RE-STEP | I +15%; II +30% |
| shadow_step (3588) | Ingenuity | a Hidden attack with Shadow 1 AP less; II Shadow Run | KEEP | |
| jury_rig (3789) | Improvisation | a Figment destroyed, +1 AP; II +1 charge | KEEP | |
| field_repair (3949) | Improvisation | 2 AP: clear a jam, restore durability, repair 15 (profile `repair`, the mend column) | KEEP | its 15 rides the heal column (the scale drafter's) |
| hot_swap (4047) | Improvisation | one / two free swaps a turn | KEEP | |
| tuned (4145) | Improvisation | the main hand never jams or breaks; II a core 1 AP less | KEEP | |
| got_you_in_my_sight (4232) | Vigilance | +2 AP when a seen foe hides (every 3 turns) | KEEP | |
| eyes_in_the_back (4330) | Vigilance | can't be flanked | KEEP | |
| read_intent (4404) | Vigilance | your Spot Reads its target; II +1 Shadow | KEEP | |
| detectives_eye, The Tell (6034) | Vigilance | a trap or a weak point spotted at fight start (one / two) | KEEP | it has its fight half |
| hold_the_stroke, Second Clause (4541) | Brain Power | Sigils +6% / +12% vs a conditioned foe | RE-STEP | I +15%; II +30% |
| parallel_thought, Running Hand (4660) | Brain Power | the first glyph a turn −0.5 AP; II no Flux | KEEP | |
| footnote (4809) | Rumination | once a fight, allies +1 / +2 to hit one foe for the round | RE-STEP (roll) | I +2; II +3, and your own Sigils |
| lab_coat (4905) | Rumination | +3 saves vs known chemicals; II neutralise | KEEP | |
| index (4988) | Rumination | story: one true answer; II +2 next Brain save | DEAD TODAY (I) | I in a fight, once, 0 AP: one foe's resistances and saves are shown (the reveal Analyze makes, no AP) |
| proven_formula (5108) | Rumination | +3 / +5 saves vs what already hit you | KEEP | |
| overruled (5170) | Eloquence | +2 AP while a foe carries your Brain debuff | KEEP | |
| objection (5265) | Eloquence | story: expose a contradiction | DEAD TODAY | fight: I 0 AP, once a fight, a foe you see makes a Brain save or is Shaken 2 rounds; II and it loses 1 AP next turn (Off Balance) |
| opening_argument (5337) | Eloquence | story debate before a fight: foes −1 AP in round 1 | DEAD TODAY | fight: I at `combat_start`, the foes' leader (their Elite or Boss, else the nearest) makes a Brain save against your Eloquence or every foe has 1 AP less in round 1; II as today, and the first Call each fight is 0 AP |
| thinking_aloud (5464) | Eloquence | after a Call, the next Evoke 0 AP | KEEP | |
| mirage, Many-Eyed Dream (5742) | Visualization | Figment blows +4% a Figment, to +12%; II +6% to +18% | RE-STEP | I +5% a Figment, to +15% (3); II +7.5%, to +30% (4, Reach at 10) |
| blueprint, Wake of the Kill (5876) | Visualization | a Figment kill, +1 AP; II and a charge | KEEP | |
| pattern_lock (6105) | Acuity | +2 / +4 Defense vs a seen attack | KEEP | |
| quick_read (6187) | Acuity | Analyze 1 AP less | KEEP | |
| read_them (6293) | Acuity | an Analyzed foe deals 15% / 25% less to your side | RE-STEP | I 15% (kept); II 30% |
| still_breath (6415) | Acuity | spot rolls on you −2 by cover | KEEP | |
| talks_broke_down, Parley (6514) | Charisma | talk them down; II +2 AP | KEEP | |
| crowd_pleaser (6593) | Charisma | one roll for a crowd, save 2 harder | KEEP | |
| smooth (6674) | Charisma | story: a failed lie only raises suspicion | DEAD TODAY | fight: I a foe that saves against your Persuade is at −2 to hit you on its next turn; II and your first Persuade each fight is +2 TN |
| showman (6745) | Charisma | Picture 1 charge less; II a free order | KEEP | |
| shared_breath, Taut Thread (6875) | Empathy | +6% / +12% on a Bonded foe | RE-STEP | I +15%; II +30% |
| lay_down_arms, Bitter Balm (6992) | Empathy | heals you give turn 10% / 20% of the HP into Soul damage on Bonded foes | RE-STEP | I 15%; II 30% |
| hand_off (7199) | Camaraderie | a friend within 1 / 3 uses your Defense | KEEP | |
| nobody_left_behind (7265) | Camaraderie | Stabilise 1 AP less; Downed friends take 50% less | KEEP | |
| steady_hands (7480) | Camaraderie | Settle; II Soothe | KEEP | MP: the Bonds door drafter's |
| pull_together (7822) | Camaraderie | Tug; II Guide | KEEP | MP: the Bonds door drafter's |
| between_the_lines (8227) | Insinuation | story; II your Bond +2 TN | DEAD TODAY (I) | I your Bond is +2 TN; II +3 TN, and a foe Bonded to you is Read |
| veiled_insult (8313) | Insinuation | Taunt once / twice a fight | KEEP | |
| quiet_thread (8478) | Insinuation | never Traced | KEEP | |
| open_hand (8595) | Insinuation | surrender at half HP | KEEP | |
| heart_overload, Clenched Heart (8680) | Will Power | +5% at stage 3+; II +5% at 2 and +5% more at 3+ | RE-STEP | I +15% at stage 3+; II +15% at stage 2, +30% at 3+ |
| resonance (8816) | Will Power | +4% a Release, to +8%; II to +12% | RE-STEP | I +5% a Release, to +15%; II +10%, to +30% |
| rite_in_the_field (8896) | Lore Master | every 5th / 3rd kill, a free Crystallise | KEEP | |
| old_tales (9292) | Lore Master | story; II upper-realm parley | DEAD TODAY (I) | I upper-realm foes, Crawlers and cursed things (`target_kind`) are Read when the fight starts |
| recitation (9382) | Lore Master | a Call calms 1 / 2 Strain | KEEP | |
| lore_ward (9493) | Lore Master | Warding Word; II the first free | KEEP | |
| flat_line (9689) | Composure | the most dangerous foe −1 / −2 to hit while it sees you | RE-STEP (roll) | I −2; II −3 |
| poker_face (9768) | Composure | story −3 to lie-readers; II +2 Brain saves | DEAD TODAY (I) | I +2 Brain saves; II +3, and the story half |
| stand_still (9854) | Composure | −2 to hit you until you act | KEEP | |
| pure_heart (9953) | Composure | refuse one / two Mana Shorts | KEEP | |
| litany (10040) | Faith | the first / two Hymns 1 AP less | KEEP | |
| holy_ordnance, Sinner's Due (10193) | Faith | prayers +8% / +12% vs a foe at half HP | RE-STEP | I +15%; II +30% (II's Marked or Judged kept) |
| red_line (10304) | Conscience | +1 / +2 Heart saves; II allies +1 | RE-STEP (roll) | I +2; II +3, allies +2 |
| clean_hands (10400) | Conscience | a shield of 15% / 25% of max HP for sparing | RE-STEP | I 15%; II 30% |
| righteous (10494) | Conscience | prayer heals on an ally at half HP +20% / +40% | KEEP | over the step; never cut |
| foresight (10638) | Conscience | story; II once a fight, a blow that would drop an ally within 4 leaves 1 HP | DEAD TODAY (I) | I the same for yourself once a fight; II you or an ally within 4 |
| outclassed (10726) | Authority | +3 AP after the first kill | KEEP | |
| rank_has_privileges (10827) | Authority | story: orders obeyed | DEAD TODAY | fight: I rank-and-file foes (`actor_not_tier: [elite, boss]`) are −2 to hit you while you stand; II and their saves against your Calls are 2 harder |
| five_stars (10903) | Authority | friends bank +1 AP; II rank-and-file Shaken | KEEP | |
| commanding_voice (11017) | Authority | +3 saves vs Silenced, Shaken, Fear; II immune to Silenced | KEEP | |

Tally (90): KEEP 57; RE-STEP 19 (bulwark, shrug_it_off, tremor, iron_grip, unflinching, both_hands, sleight_of_hand, hold_the_stroke, footnote, mirage, read_them, shared_breath, lay_down_arms, heart_overload, resonance, flat_line, holy_ordnance, red_line, clean_hands); DEAD TODAY, given a fight half: 14. None BECOMES A VERB: every small unconditional number in the acquired list is already a whole AP or a verb.

### 4.3 Achieved (19) and ultimate (6)

| id (line) | Today | Verdict | New |
| --- | --- | --- | --- |
| charge (12412) | a straight move of 3+ ending by a foe: up to 3 AP free | KEEP | |
| make_way (12456) | no opportunity attacks from foes you pass | KEEP | |
| just_the_repairman (12504) | with a toolbox, 50% to stay Hidden when spotted | KEEP | |
| spoon_feed (12547) | 2 AP: allies +2 to hit one foe | KEEP | |
| cultured (12602) | +1 on two checks about art | RE-STEP (roll) | +2 (story; an achieved perk may be story) |
| field_surgeon (12649) | Field Repair heals a living ally, 3 HP a point of Improvisation, on the heal column | KEEP | rides the heal column |
| dance_of_iron (12714) | a miss on you, a free shot back | KEEP | |
| cold_read (12758) | story: what an Analyzed foe wants | DEAD TODAY | fight: a foe you Analyze is also Read |
| fire_sermon (12798) | 2 AP: your Blessings Shake foes within 4 | KEEP | |
| silent_partner (12848) | an adjacent ally hides with you | KEEP | |
| verse_of_war (12890) | In verse: +1 tile and +10% to an Outburst | RE-STEP | +15% |
| between_heartbeats (12937) | once a fight, 2 free AP before a foe's action | KEEP | |
| siege_engine (12980) | Shove and Break 1 AP less; Guard from a Shove; unpushable | KEEP | |
| dead_signal (13050) | 1 AP, disable a device while unseen | KEEP | |
| twin_souls (13096) | a third school at half strength, +20 MP | KEEP | MP: the Outburst drafter's |
| the_voice (13143) | once a session, rank-and-file obey an order | KEEP | |
| bite_the_bullet (13193) | once a fight, borrowed time at 0 HP | KEEP | |
| sixth_sense (13245) | Hidden foes within 3 revealed | KEEP | |
| what_could_be (13288) | story: a vision of the best outcome | DEAD TODAY | fight: once a fight, 0 AP: every foe you see is Read until your next turn |
| war_footing (13329) | a foe ending next to you loses 2 AP (every 3 turns) | KEEP | |
| last_charge (13373) | a 5+ tile charge: melee ×1.5 that turn; a shield of armour value ×3 (at least 15) | KEEP | the shield rides the armour scale (01's) and the grade's `arm` |
| angel_of_the_trenches (13436) | once a fight, run to a falling ally and stabilise | KEEP | |
| every_lie_is_a_door (13472) | story: walk into a guarded place | DEAD TODAY | fight: you start every fight Hidden (`condition` hidden at `combat_start`, `same_entry`) |
| twin_discipline (13505) | a fused Sigil and Outburst cast | KEEP | |
| supreme_command (13540) | once a fight, the squad takes a 2-AP action each | KEEP | |

### 4.4 The Mastered perks: worth a tier's wait? (27; skill 10, level 15 at the earliest)

The test: at level 15, a Mastered perk must change how the character plays its door or its job at least as much as a tier II perk. A once-a-fight trick that a tier II perk out-plays is not worth five levels.

| id (line) | Skill | Today | Worth the wait? | What it becomes, if not |
| --- | --- | --- | --- | --- |
| last_wall (11120) | Durability | once a fight, a killing hit leaves 1 HP and you take nothing until your next turn | yes | add: your plates refill to your Reach when it fires (`resource` guard at max) |
| walking_wounded (11204) | Pain Threshold | injuries cost no AP or Movement; below half HP, 20% less damage | no (the number is tier I's) | below half HP, **30% less**; injuries as today |
| skin_map (11248) | Sensory | no foe within 6 stays Hidden from you | yes | (endless skulk kits make it a job) |
| earthbreaker (11288) | Raw Power | once a fight, 4 AP: your melee damage on a 3×3, Prone, cover gone | no (a fixed blow at the chain's own cap) | **a Finisher**: it spends the whole chain and every unit in the 3×3 takes the Coup's cash-out for the steps spent (Law 2); once a fight; allies still hit |
| nothing_left_to_fear (11343) | Guts | immune to Fear; allies within 3 can't be Afraid | yes | |
| the_name_they_whisper (11409) | Intimidation | every foe Afraid 2 rounds; surrender at half | yes | |
| never_there (11450) | Athletics | first move draws nothing; later moves −4 to shots at you | yes | |
| trick_shot (11490) | Dexterity | once a turn, a Ricochet: half the damage to the nearest foe within 2 | yes | add: the Ricochet lays 1 Pressure on the second foe (it reads the door) |
| before_the_blink (11541) | Reaction Speed | always first in round 1; two reactions | yes | |
| vanishing_act (11582) | Ingenuity | once a fight, 2 AP, Hidden where you stand | no (once a fight against a door of Reach 5) | **2 AP and 3 Shadow, at will**: you vanish when you have built for it (`cost_mod` res shadow) |
| overhaul (11627) | Improvisation | Field Repair 1 AP, doubled; a permanent extra slot once a weapon | yes | its slot adds to Masterwork's |
| nothing_gets_past (11681) | Vigilance | every foe that moves in sight is Spotted | yes | |
| clean_draw (11716) | Brain Power | once a fight, the next spell (up to 4 glyphs) costs no charge and no Flux | no | up to **your Reach**, its Evoke 0 AP, and it **counts one glyph longer** for the cash-out |
| established_fact (11757) | Rumination | story fact; once, your own Overload deals you nothing | no (in a fight) | fight: once a fight, a Brain or Heart save you fail becomes a success (`auto_success`) |
| closing_argument (11811) | Eloquence | story; once, your Persuade gets no save | yes | |
| solid_image (11864) | Visualization | once a fight, the Glimmer becomes a real Double | no | **once a round**, 0 AP: a Glimmer you make is a real Double until your next turn, outside your held count |
| case_closed (11902) | Acuity | full reveal; squad +2 Defense and +20% damage vs the Analyzed | no (+20% is under tier II's) | **+30%** for the squad, the rest kept |
| everyones_friend (11959) | Charisma | story: a trusted friend for a scene | DEAD TODAY | fight: once a fight, a rank-and-file foe that sees you makes a Heart save or surrenders (Open Hand's piece) |
| threads_that_hold (11997) | Empathy | Tending to the Bonded +50%; Bonds hold while you are Downed | yes | |
| many_hands (12066) | Camaraderie | Share a Hit within 3; lend your reaction | yes | |
| their_own_idea (12127) | Insinuation | story: a planted suggestion | DEAD TODAY | fight: once a fight, 0 AP, a foe makes a Heart save or is Confused (`conditions.json:399`) |
| the_twin_pays (12161) | Will Power | once a fight, a free Begin and no Strain to hold it | no | add: it Begins at **stage 2**, and its first Push (Overdraw) costs no Strain |
| true_name (12202) | Lore Master | once a session, the squad +50% vs a named foe | no in Survival (a run is one session) | **once a fight**, the rest kept |
| still_water (12245) | Composure | immune to Brain debuffs; unreadable | yes | |
| judgement_day (12284) | Faith | once a fight, 3 AP: its next attack fails, your attacks +50% | yes | |
| foreseen (12335) | Conscience | once a session, a table rewind | DEAD TODAY (Survival) | fight: once a fight, a foe's attack on you or an ally within 4 is undone: it deals nothing and puts nothing on (Foresight II's piece, `would_drop` / `taking`, plus `cancel` on `cond_incoming`) |
| on_my_mark (12369) | Authority | once a round, 1 AP: an ally acts now with up to 4 AP | yes | |

Worth it as they are: 15. Changed so that they are: 12 (8 not worth the wait, 4 dead in Survival).

---

## 5. The caps go: what fed them, what each does now, and how bonuses combine

### 5.1 The pooled +100% cap on target bonuses (`VS_CAP`, `effects/output.ts:129`, `:131-134`; label at `combat.ts:1558`)

Every source that pushes into `ctx.vs`:

| Source | Where | Value | What it does now |
| --- | --- | --- | --- |
| Judgement Day (perk, Faith Mastered) | `perks/f.ts:270` | +50% vs the Judged | +50%, kind `target` |
| True Name (perk, Lore Master Mastered) | `perks/f.ts:338` | +50% for the squad | +50%, kind `target`, once a fight (4.4) |
| For Humanity (trait `humanity_first`) | `perks/f.ts:739` | +15% vs non-humans | +15%, kind `trait` |
| Tracker (trait `moon_hunter`) | `perks/f.ts:787` | +30% first attack on the tracked | +30%, kind `trait` |
| Faith's unlock vs Judged or Marked | `skills.json:5277` (`damage_vs` 0.4) | +40% prayers | +40%, kind `target` |
| The op `damage_vs` | `effects/triggers.ts:417` | any | becomes `damage_mult` with `stack: target` (one op) |

Case Closed pushes into `mults`, not `vs` (`perks/f.ts:370`); it is kind `target` too. With the cap gone, no bonus is ever wasted, which was the dead-reward finding of `check-cuts.md` Table 2.

### 5.2 The ×2.0 critical cap (`CRIT_BASE` 1.5, `CRIT_MAX` 2.0, `character.ts:853-855`; `combat.ts:1542`; `sigil.ts:336`; `classes/soul.ts:39`; `sigils.json` `critical` :118)

**Margins replace the multiplier.** A critical is two Margins (+50%), plus the Margins it beat the Defense by. Every feeder:

| Feeder | Today | Now |
| --- | --- | --- |
| Perception +3% a point (`critMult`, `character.ts:855`) | the critical's size | **for the attribute drafter:** I recommend Perception widens the critical range (19 counts from Perception 5, 18 from 9): *a sharp eye finds the gap more often*; the multiplier slope goes |
| Dexterity +2% a point (`character.ts:855`) | the critical's size | goes; Dexterity's reward is its door (Pressure), the skills drafter's |
| `crit_damage` stat (`effects/stats.ts:42`), answered by One Shot's `crit_damage_mod` (`traits.json:2178`) | +25% critical damage | One Shot's Breath Held: **+1 Margin** on that first shot if it hits (+25%, the same number, now never wasted) |
| `ctx.critBonus` (One Shot's handler, `perks/c.ts:441`) | +25% inside the ×2 | the same +1 Margin (one copy, not two) |
| `crit_taken` (Perception −10% a point, Acuity −5% a point, `character.ts:1237`; `skills.json:2509`) | cuts the critical's extra | **for the skills drafter:** I recommend "a critical on you adds one Margin, not two" at Acuity 5; the % slopes go |
| Sigil critical ×1.5 to 2.0 (`sigils.json:118-122`; `spellCritMult`, `sigil.ts:336`, `:1066`) | the spell's critical | two Margins, as a weapon's |
| Outburst critical (`classes/soul.ts:39`) | ×1.5 to 2.0 | two Margins |
| Crit ranges: the technique numbers `point_crit_min` 18 (`techniques.json:404`), `precise_crit_min` 18 (:1581, :2819), `suppressed_crit_min` 18 (:2602); the weapon op `aimed_crit_min`; Joy's 18 (`magic.ts:1414`) | when a roll is a critical | KEEP: they set the critical range, which now means two Margins. `aimed_crit_min` becomes the gear field `crit_range` with `_modes` (one copy, section 3.2 row 1) |
| Gambler's Double or Nothing (`perks/g.ts:534-537`) | a success becomes a critical | KEEP (two Margins) |
| Glass Runner (+50%), Crawler-Blooded (−30%): a critical that injures a limb | damage taken | KEEP (they read "critical", not the multiplier) |
| Numb II; the serrated edge; Joy; Calm ("no critical") | read `crit` | KEEP |

### 5.3 How bonuses combine (the lead's rule, written as data)

**Bonuses from different kinds of source multiply; two of the same kind add.**

Every term the damage formula holds gets a `kind`, and `stackDamage` (`effects/output.ts:131`) does this: within a kind, add the bonuses (1 + Σ(v − 1)); then multiply the kinds. A penalty is a bonus below 1 and adds the same way. The kinds:

| Kind | Holds | Default from |
| --- | --- | --- |
| `level` | the level column | the profile's Level term |
| `attribute` | the attribute's card (the engine's size) | the Stat term |
| `skill` | the skill's Bite | the Stat term |
| `grade` | the instance's grade | the rarity row |
| `door` | the cash-out of a door's counter (the chain, the pips, the stage, the Line) | the door rows |
| `margin` | Margins | the roll |
| `target` | a mark on the target by anyone (Judged, True Name, Marked, Case Closed, Read Them, Weak Point) | `stack: target` |
| `state` | the attacker's situation: the ambush or the Break from Hidden, Weakened, Sharpened, special rounds | conditions and ammo |
| `perk` | every perk (acquired, Mastered, achieved, ultimate) | perks.json |
| `trait` | every trait | traits.json |
| `class` | class moves and features | classes.json |
| `gear` | fitted mods, the maker's signature, Relic and Celestial properties | items.json and relic_props |
| `run` | boons, start boons, shrine tokens, grafts | survival.json boons |

The default is the file the item comes from. An op may name another kind (`stack: target`). The Ambush multiplier and Shadow's Break already replace each other (`damage_mult replaces`); they stay one term.

### 5.4 The largest stack a level-20 specialist can reach (worked)

A Breaker: Strength 10, Raw Power 10, a Celestial maul, at level 20. The charter's numbers: maul 20, level ×40, Strength +10% a point, Raw Power +5% a point, a Coup at ×7 worth 5.5 hits (curve section 16).

| Step | Kind | × | Running total |
| --- | --- | --- | --- |
| Maul base 20, level 20 | level | ×40 | 800 |
| Strength 10 (+90%) | attribute | ×1.9 | 1,520 |
| Raw Power 10 (+45%) | skill | ×1.45 | 2,204 |
| Celestial | grade | ×1.75 | **3,857** (the plain blow, about the charter's 4,000) |
| a ×7 Coup | door | ×5.5 | **21,214** (the charter's "above 20,000") |
| Margins: a natural 20 at +12 to hit vs a level-20 Soldier's Defense 17 (06-world): 15 over is 3, plus 2 | margin | ×2.25 | 47,731 |
| Iron Grip II, the target Grappled or Prone | perk | ×1.3 | 62,050 |
| Raised by Orks +20% and Pain Eater +50% (below half HP) | trait | ×1.7 | 105,485 |
| Biting (+10%) and the weighted head (+20%) | gear | ×1.3 | 137,131 |
| Honed | run | ×1.1 | **150,844**, alone |
| an ally's True Name (+50%) and Case Closed (+30%) | target | ×1.8 | **271,519**, with the squad's set-up |

Two other readings:
- **The ordinary big turn**: one Margin (an average roll), Orks only, the rest as above. It is **about 59,000**.
- The class's own multiplier (the Breaker's Finishers) sits on top as `class`. It is not counted here.

Last Charge is not stacked: walking costs the chain a step a tile, so a 5-tile charge and a ×7 Coup do not meet.

**What the lead should see.** The charter's reference turn is five digits (21,214). A specialist's whole sheet multiplies on top of it:
- ×2.2 to ×3.3 on an ordinary turn;
- ×7 on its best turn;
- ×13 with a squad's set-up.

That is six digits, against a four-player Boss of 30,711 HP at level 20 (06-world section 1.5). The full-HP guard (`enemies.json:203`) leaves an Elite or Boss on 1 HP, so the big blow is the turning point, not the whole fight. But the enemy table in 06 was written against the plain hit with no sheet. Question 1 is about this.

---

## 6. Traits (`data/traits.json`, 74)

**The budget note.** `traits.json:11-12` `budget_sp_net` 3 and `budget_note` ("+1 on a roll about 2 SP": the 2020 rule of thumb) are a note, not a price. No row has a cost (`cost` null), and nothing reads it. I recommend keeping the note and striking its "+1 on a roll" clause: with Margins, a +1 is worth more than it was. **No trait was priced by the withdrawn budget rule** (`rules.json balance` tiers, removed by rules 1.94): no trait row cites it.

Numbers that sat on the old scale:

| Trait | Number today | Why it is on the old scale | Re-stated (PROVISIONAL) |
| --- | --- | --- | --- |
| factory_made | Field Repair heals you 10 HP a point of Improvisation (`amounts.repair`, profile `flat`) | `flat` reads the `deal` column, not the heal column every other heal rides | profile `repair` (the mend column), 5 a point at level 1: *a point is about a twelfth of a frail character's HP at any level* |
| drone_handler | the drone 30 HP, repair 10 a mastery point (flat), typed in the trait op | the companion row (`enemies.json:379`, HP 30 settled by Leon, spec item 370) is not levelled; the trait types the number a second time | the drone reads `enemies.json companions.drone` through the enemy level table at its owner's level (`levelled()`, `data.ts:117`): 30 is its level-1 HP. The trait's typed `hp` goes (one copy); the repair moves to the mend column |
| beast_handler | the beast 60 HP, typed | as the drone | the same: `companions.beast` at the owner's level |
| oil_in_my_mind, oil_in_my_soul | 2 less HP for each level | an HP-per-level term that the new HP curve may not have; at level 20 it is −38 of about 3,000 | max HP ×0.95: *the paper body is always a little thinner* |
| crawler_blooded | a Lumeri Blessing burns you for 10 (`amounts.blessing_burn`, no profile) | a fixed 10 against HP of 60 to 8,000 | 10% of your max HP, true damage (`per: [{of: self:max_hp, value: 0.1}]`) |
| one_shot | Breath Held +25% critical damage, "never more than double" | the ×2 cap | **+1 Margin** if that shot hits (5.2) |
| the_brightest_light, pain_eater, southern_fist, ghost_soldier, raised_by_orks, augmented, demolitionist, moon_hunter, humanity_first, hollow_heart | +10% a kill (to +50%), ±50%, +20%, +50%, +20%, +20%, +30%, +30%, +15%, +10% | none: percentages ride any scale | KEEP the numbers; they are kind `trait` (5.3), so they multiply with perks and gear instead of pooling. Humanity First's and Moon Hunter's leave the +100% pool (5.1) |
| gun_nut, blade_recluse | one extra mod slot | none | KEEP; it adds to Masterwork's (1.2) |

---

## Questions for the lead

1. **The sheet on top of the charter's turn.** Under your rule (kinds multiply), a level-20 specialist's ordinary big turn is about 59,000, its best about 151,000 alone, and 272,000 with a squad's set-up (5.4). The charter's reference is 21,000, and a four-player Boss has 30,711 HP. **Recommended:** keep the rule. Have the world drafter write the enemy HP columns against an attacker carrying its expected sheet: about ×1.5 at level 10 and ×2.2 at level 20, read from this table. Then the guard makes the top turn a Boss's turning point, not a delete. The alternative would be to make perk, trait, class, gear and run one kind that adds; that lowers the top by about a quarter and breaks your rule's plain reading.
2. **Six digits.** You asked for five for "something super". The only six-digit hits are a natural 20 on a full ×7 cash-out with every sheet bonus held, plus an ally's marks. **Recommended:** accept them as the "super" end. They need the whole squad, a chain held four turns and a 1-in-20 roll, and the guard catches them on any Elite or Boss.
3. **Relic and Celestial properties stop costing boon room** (`run/power.ts:47` counts them today). **Recommended:** yes. The grade paid for them, and the boon cap is in rifle-turn percent, a withdrawn unit. The cap itself stays the Survival drafter's.
4. **Finds and shelf split** (1.3): Relic can be found on map 5 but not bought until endless; Celestial is found from endless map 10 and never sold. **Recommended:** yes. This replaces 06-world's Question 3 with one rule.
5. **The fourteen story perks and the four story Mastered perks get fight halves now** (4.2 to 4.4), so no perk is dead in Survival. **Recommended:** yes. This is the last pass on skills content, and each half is built from existing pieces (Read, Shaken, Confused, saves, `interrupt`).

---

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| Grade to hit and damage ×1 / 1.15 / 1.3 / 1.5 / 1.75 | `rules.json rarity` rows (:1605-1659); `with_this` (`effects/triggers.ts`); `roll_mod`, `damage_mult`, `mend_mult` ops; the carried-modifier list (`effects/collect.ts:220`) | each row gains `effects`; the collector adds the instance's grade row; `combat.ts:580`, `:585`, `:1536` stop reading `acc` / `dmg` (one copy) |
| Grade on armour | `armOf` (`character.ts:224`), the rows' `arm` | numbers only |
| The Masterwork mod slot | `extraSlots` (`perks/c.ts:211`), the extra-slot fit (`:220-235`) | rows gain `extra_slots`; `extraSlots` reads the instance's grade; a slotless row gains `grip` at Masterwork |
| Relic and Celestial properties | `survival.json relic_props` (:224); `rollProps`, `propFits` (`run/power.ts:66-73`); `upgradeProblem` (`run/progress.ts:134-165`) | `GearState.prop` becomes `props`; `cappedRarity` keeps Celestial; `runWorth` stops counting props (Question 3); three armour props with `fits: armour` |
| The grade by map | `rewards.ceiling` (`survival.json:147`), `stageCeiling` / `cappedRarity` (`run/rewards.ts:156-164`), `vault` (:580), `grade_up.relic_from_stage` (:195) | ceiling list by map; new `rewards.shelf`; `stageCeiling(stage, purpose)`; vault `grade_max` celestial; relic_from_stage 6; validator `:2960` |
| Mods' new effects | items.json mod rows (:283-686); ops `roll_mod`, `damage_mult`, `cost_mod`, `resource`, `cancel`, `grant_action`, `deal`; gear fields with `_modes` (`rules.json:957`, `gearNum` `character.ts:1738`) | data only; the three unbuilt mods get `adjudication: engine` |
| The maker signature | modifier rows (`mod_line_arsenal`, `mod_line_smetanita`), `variant_mods` readers (`collect.ts:217-220`, `hooks.ts:201`, `triggers.ts:277`, `gearpreview.ts:156`, `:340`) | `families.json` rows gain `signature`; the carried list reads it; `gearNum` reads the carried list; Arsenal's and Smetanita's `variant_mods` move to their families |
| The 13 signatures | `resource`, `mark` / `flag`, `cost_mod` (`action: move` as `fire_and_move`), `zone` (Hallow's pattern), `displace`, `cancel`, `condition`, `targets` | 13 signature rows (data); zone kind `burning_ground` (rules.json zones.kinds); condition `toxin` (conditions.json); the door knocker's push moved from its grant to its row |
| Perk re-steps | each perk's `effects` / `tiers` values (perks.json, lines in 4.2) | numbers and texts (`{=...}` placeholders already bound) |
| Dead perks' fight halves | `condition` (`read`, `shaken`, `confused`, `hidden`), `roll_mod` (to_hit, save tn), `grant_action`, `targets`, `interrupt`, `auto_success`, `cancel`, `floor` | data on each row; `adjudication` to `engine` or `hybrid` |
| Mastered perks' changes | `resource` (guard max), `cost_mod` with `res: shadow`, the Finisher's cash-out (Momentum door rows), Glimmer's order site (`figment_order`), Outburst stage | data, plus Earthbreaker's handler (`perks/a.ts`) reading the Finisher's cash-out instead of its own blow |
| Bonuses combine by kind | `stackDamage` (`effects/output.ts:131`), `Term`, ops `damage_mult` / `damage_vs` | `Term.kind`; group by kind; `VS_CAP` and the "capped at ×2" label go; `damage_vs` becomes `damage_mult` with `stack: target` |
| The critical becomes Margins | `critMin` on `attack_roll` (`combat.ts:1644`), the `crit` predicate | `critMult`, `CRIT_*`, `critBonus`, `spellCritMult`, `sigils.json critical` go to the Margins piece (rolls drafter); One Shot becomes +1 Margin |
| Traits re-stated | amounts blocks (profiles `repair`, `per self:max_hp`), `levelled()` for companions (`data.ts:117`), `stat_mult hp_max` | data; the drone's and beast's typed HP leave the trait op |

## Needs a new primitive

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| 1. **Stack kinds** | `Term.kind` (a word from a closed list in `rules.json output.stack_kinds`) and an op field `stack`; `stackDamage` adds within a kind and multiplies across kinds | today there are two buckets, `mults` (all multiply) and `vs` (add, capped). The lead's rule needs N buckets, and no piece groups terms |
| 2. **`crit_range`, a gear field** | one row in `rules.json weapons_rules.gear_fields` (`combine: max`, `default: 0`) and its one reader at the attack roll (`critMin = 20 − crit_range` before the items speak); the weapon op `aimed_crit_min` becomes `crit_range` with `crit_range_modes: [aimed]` | `critMin` is set only by hook code, the technique numbers and the one weapon op limited to Aimed Shots. No data row can widen the critical for every shot |
| 3. **`targets.past`** | a bool on a `line` set: the units on the line beyond the event's target | a line set runs from its centre and includes everything on it. Nothing selects "past the struck unit" (the anti-materiel's Through and Through) |
| 4. **`GearState.props`** (a list) | replaces `prop`; a migration from `prop`; `gearProps` reads the list | a Celestial needs two properties; the saved shape holds one |

Extensions of pieces that nearly do it (each listed for the lead's check):
- the carried-modifier list adds the instance's grade row and the family's `signature`, and `gearNum` reads that list (one reader joined to another);
- `extraSlots` reads the grade's `extra_slots`;
- `stageCeiling` takes a purpose (finds or shelf);
- the Forge's fit fee multiplies by a carried `forge_fit_rate`;
- `with_this` counts a worn graded piece as "the instance" (armour properties);
- `FITS` (`run/power.ts`) learns `armour`.

## What re-records

| What | Why it moves |
| --- | --- |
| `test/golden/` damage tables (all 14 `golden-damage*`: builds, magic, perks, techniques, traits, classes) | the grade multiplies damage and heals; perks re-stepped; the critical becomes Margins; the target cap goes; stacking by kind; the suppressor's and the weighted head's flat numbers become multipliers |
| `golden-costs*` and `costs-*.json` | mod costs (extended magazine reload +1, foregrip and wrapped grip swap +1, the Sigil magazine's glyph, the compensator), the signatures' AP cuts (Legion, rotary, thrown), Vanishing Act's Shadow cost |
| `golden-itemops` | the grade as a carried row; signatures moved from `variant_mods` to families; new modifier rows |
| `golden-conditions` | a new `toxin` row; Read, Shaken and Confused put on by perks' new fight halves |
| `golden-rules` | Margins on criticals; `crit_range`; the door knocker's push from its row |
| `test/golden/replays.json` (replay guard) | every seeded fight with a graded weapon, a mod or a perk on a re-stepped number |
| `test/old-save.test.ts` and fixtures | `prop` to `props` needs a migration and a new fixture beside the three |
| `survival-*.test.ts` (rewards, vault, shop, Forge, stage), `run/power` tests | the ceiling by map, the shelf, Celestial finds, relic_from_stage 6, properties out of boon room, the ADCorp fee |
| `items-b0.test.ts`, `follow-strike.test.ts` | the signatures' new home (family rows) |
| `test/balance/*` measures | read again, never fitted (rules 1.94) |
| `tools/validate.py` | Celestial in `ceiling` and not in `shelf`; rarity rows' `effects`; `families.json signature`; the new gear field and `stack` word |
| `tools/check_spec_tables.py` and the spec's rarity table (`PHC-Core-Rules-v1.0.md:676-682`), perk texts in the spec | the spec first, then data |
| text-number guard (`tools/text_numbers.json`) | new and changed texts bind their numbers; no new bare digits |
| `apps/web/src/narrator/faith-context.test.ts` cost cap | longer perk and mod texts in the Narrator's prompt |
| `apps/web/e2e` suites that read a grade's card, a mod's line or a perk's number | displayed numbers change |
