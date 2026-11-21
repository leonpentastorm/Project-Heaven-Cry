# 07. Gear and perks: grades, mods, the maker signatures, every perk, Margins, the top of the scale, and traits

Drafter's file for the 0.34 rebalance, **second draft** (21 Nov 2026). Written to the charter (`docs/design/proposals/2026-11-21-the-curve.md` sections 10 to 18, its laws in sections 2 and 3, the Momentum pattern in 16) and to **the lead's rulings in `00-rulings.md`** (A7 to A10, C21, D25, D26 bind this file). **Nothing here is built.** Every proposed number is PROVISIONAL, with one line of reason a player would recognise; nothing is fitted to a percentage, a line or a ceiling. Facts about today were read in data and code at `release/0.34-final` and carry file:line.

**Every shared number is 01's** (`01-scale.md`, final for this pass; its tables are printed by `tools/balance/scale.py`): the factor x0.6 (01 section 2, T2 and T2b), the level columns (T4), the cards (T5), HP (T6), MP and its cost rule (T7a, T7b), a plate and armour (T8, T8b), **the grade ladder (T9)**, **Margins (section 9, T10)**, **the stack rule (section 10.1)**, the enemy columns and tier rows (T12) and **each door's top (T11)**. This file quotes them by table name and types none of its own.

## 0. What changed from the first draft

1. **The stack rule is 01's (A8):** level, attribute, skill, grade and the cash-out multiply; everything else adds into one sum Σ. The first draft's thirteen multiplying kinds are withdrawn, and so is its primitive "stack kinds" (01's S12 in two kinds replaces it).
2. **The top of the scale (section 6) is redone on 01's T11.** Two rules hold it under 100,000 with every perk still felt: **a cash-out carries its own door's sum and the foe's mark** (the rest of the sheet makes the plain hits harder), and **a foe carries one mark at a time**. The marks are +20% each. One question to the lead.
3. **Every feeder of the old critical is restated on Margins (A7, section 5):** `crit_damage` becomes the stat `margins`, `crit_taken` becomes `margins_taken`; One Shot is +1 Margin; Acuity takes one Margin off a hit on you at 5 and at 10.
4. **Grades, properties and the mod slot quote 01's T9 (A9); the grade by map is D25:** finds, shelf and vault as three lists; Relic is found from map 5, sold only in endless; Celestial is found only, from map 10 (the vault, and a Boss pick one time in four); `relic_from_stage` goes.
5. **Every flat number is on 01's scale:** the bayonet 9, Field Repair 9, the traits' HP prices as 01's shares (Crawler-Blooded 7%, Oil in My Mind and Soul -6% max HP), the companions read 01's rows, MP prices x0.5 on 01's pool. Earthbreaker becomes a Finisher row (critic M9).

---

## 1. Grades

### 1.1 Today (checked)

| Grade (`data/rules.json`) | acc | dmg | dur | price | marks | arm | sold |
| --- | --- | --- | --- | --- | --- | --- | --- |
| standard (:1605) | 0 | 1 | 1 | x1 | 0 | 1 | yes |
| fine (:1616) | +1 | 1 | x1.25 | x3 | 1 | 1 | yes |
| masterwork (:1627) | +2 | 1 | x1.5 | x8 | 2 | 1 | yes |
| relic (:1638) | +2 | 1 | x1.5 | x25 | 3 | 1 | yes |
| celestial (:1649) | +2 | 1 | x1.5 | x50 | 4 | 1 | no |

Every reader of the rows:
- `character.ts:191` builds `RARITY` from them. `:195` `maxDurOf` reads `dur`. `:224` `armOf` reads `arm` for a worn graded piece. `credits.ts:68` reads `price`.
- `combat.ts:580` adds `acc` to the unit's attack. `combat.ts:585` puts `dmg` on the unit as `dmgMult`. `combat.ts:1536` applies it only when the striking weapon is the main-hand weapon: **an off-hand weapon's grade does nothing to its damage.**
- Nothing in `sigil.ts`, `magic.ts` or `classes/soul.ts` reads a grade. **A graded Evoker, Emanator, Attuner or Visualizer gets durability, price and marks only.**
- **The mod slot is not built.** The spec's rarity table (`PHC-Core-Rules-v1.0.md:680-682`) and `rules.json:1603` promise "+1 mod slot" at Fine and Masterwork; nothing reads it (`character.ts:1721` reads only the row's `mod_slots`).
- **Relic property:** one string, `GearState.prop` (`character.ts:1124`), from `survival.json relic_props` (:224, seven rows), counted against boon room (`run/power.ts:47` `runWorth` adds `gearProps`). Armour takes none ("Armour takes no Relic property yet", `run/progress.ts:143`).
- **Celestial is a Relic:** `cappedRarity` turns a Celestial roll into a Relic (`run/rewards.ts:160-164`); the validator refuses Celestial as a ceiling (`tools/validate.py:2960`).
- **The ceiling:** `rewards.ceiling` is fine / masterwork / relic for stages 1 / 2 / 3+ (`survival.json:147`; `run/rewards.ts:156`); the Forge's Relic step opens from stage 3 (`survival.json:195` `relic_from_stage`); the vault gives one grade over the ceiling, at most Relic (`survival.json:580`); the Boss's pick row is masterwork 70, relic 25, celestial 5 (`survival.json:141-145`), so its Celestial is always capped away today.

### 1.2 The ladder: 01's T9, and what this file adds to it

The numbers are **01's T9** (ruling A9): Fine +1 to hit and x1.15, Masterwork +2 and x1.3, Relic +3 and x1.5, Celestial +3 and x1.75, on weapon damage, armour value (and a plate's soak), the four foci's doors, and Devotion for prayer. Durability, price and marks stay as today (the economy is 05's; one price for a step, D26). This file owns the slots and the properties:

| Grade | Extra mod slots (`extra_slots`) | Properties | Why a player would feel it |
| --- | --- | --- | --- |
| Standard | 0 | 0 | the row as listed |
| Fine | 0 | 0 | *the first upgrade hits a sixth harder: you see it on the next hit* |
| Masterwork | **1** | 0 | *room for the mod you have been carrying* |
| Relic | 1 | **1** | *a name of its own* |
| Celestial | 1 | **2** | *the best thing on the field, and two names* |

The spec's "+1 mod slot" on Fine is dropped: it was never built, so nothing is taken back.

**One copy of the grade.** A grade becomes a modifier row the instance carries, the way a Relic property already is (01's Built from names the same form):
- Each `rules.json rarity` row gains `effects`: `{op: roll_mod, when: to_hit, if: {with_this: true}, value: <acc>}`; `{op: damage_mult, when: dealing, if: {with_this: true}, value: <dmg>}`; `{op: mend_mult, when: heal|shield, if: {actor: self, with_this: true}, value: <dmg>}`. The grade multiplies (A8: grade is one of the five multiplying terms), so these rows are the grade term, not Σ.
- The carried-modifier collector (`effects/collect.ts:220`, which reads `prop`, `mods` and the row's `variant_mods`) adds the instance's grade row.
- `with_this` already means "a weapon's event made with that hand's weapon, a door's event with that door's focus" (ENGINE-HOOKS, predicates). So **the off hand's weapon gets its grade**, and **every door's focus gets its grade on that door's output** (a Masterwork Evoker's Lines, a Fine Attuner's Tending).
- `combat.ts:580`, `:585` and `:1536` stop reading `acc` and `dmg` (the second copy goes). `arm` keeps its one reader (`armOf`, `character.ts:224`).

**The mod slot at Masterwork.** The rarity row gains `extra_slots` (0 / 0 / 1 / 1 / 1). It joins the one counter of extra slots, `extraSlots` (`perks/c.ts:211`), which today counts Gun Nut, Blade Recluse and Overhaul: an extra slot is a second mod in a slot kind the row already has. A row with no `mod_slots` (the coach gun, the sawn-off, the flamer, knuckledusters, the servo fist, thrown weapons) gains one `grip` slot at Masterwork. *Every hand-held thing has a grip, so the reward is never empty.* The grip has one mod today (the wrapped grip, section 2); a second is content for later.

**Properties.**
- **Celestial carries two.** `GearState.prop` becomes `props` (a list): a saved-shape change with a migration (`prop` becomes `props: [prop]`; critic M-7).
- `cappedRarity` stops turning Celestial into Relic where the find's list allows Celestial (section 1.3).
- **A property costs no boon room** (ruling A9): `runWorth` (`run/power.ts:47`) stops counting `gearProps`. The boon cap itself is the Survival drafter's.
- **Armour gets properties**, three new rows in `relic_props` with `fits: ["armour"]` (armour takes A9's steps on its value, 01 T8b):
  - `prop.padded`: melee blows on you -15% (a `damage_mult` taking 0.85, a part of the defender's sum);
  - `prop.sealed`: elemental damage on you -15% (inside `elemental_taken_cap`, `rules.json:857`, a cap 01 keeps);
  - `prop.lightened`: this piece's Heavy word costs no Movement (`rules.json weapons_rules.heavy`).
  *A Relic plate should feel like a Relic gun.* Two small extensions: `with_this` reads a worn instance, and `FITS` (`run/power.ts`) learns `armour`.

### 1.3 The grade by map (ruling D25; the clock is 05's)

Three lists, one reader shape (`stageCeiling(stage, purpose)`, purposes `finds`, `shelf`, `vault`; the last entry repeats). **Finds** are what a pick after a fight can roll (each node kind's rarity row, capped by the list); **the shelf** is what a shop sells and the Forge steps to; **the vault** is the dead-end chest's grade.

| Map | Finds (`rewards.ceiling`) | Vault (`vault.grades`, new) | Shelf (`rewards.shelf`, new) | Why |
| --- | --- | --- | --- | --- |
| 1 | Fine | Masterwork | Fine | *the first upgrade is in reach in the first hour; the dead-end fight pays a Masterwork* |
| 2 | Fine | Masterwork | Fine | |
| 3 | Masterwork | Relic | Masterwork | *Masterwork and its slot from map 3; a Relic for the squad that takes the dead end* |
| 4 | Masterwork | Relic | Masterwork | |
| 5 | **Relic** | Relic | Masterwork | *the final map's Boss and finds can give a Relic; the shop cannot* |
| endless 6 to 9 | Relic | Relic | **Relic** (and the Forge's Relic step) | *Relic on the shelf once Survival is cleared* |
| endless 10 on | **Celestial**, reached only by the Boss's pick | **Celestial** | Relic | *Celestial is only ever found, deep in endless: the vault, and a Boss's pick one time in four* |

Data changes:
- `rewards.ceiling` becomes `[fine, fine, masterwork, masterwork, relic, relic, relic, relic, relic, celestial]`. Only a rarity row with a Celestial weight can reach the last entry, and only the Boss's has one (05's row: masterwork 40, relic 35, celestial 25), so **a Celestial is never an ordinary fight's pick**.
- New `rewards.shelf`: `[fine, fine, masterwork, masterwork, masterwork, relic]`.
- New `vault.grades`: `[masterwork, masterwork, relic, relic, relic, relic, relic, relic, relic, celestial]`, in place of `grade_up` and `grade_max`. *No Celestial before map 10* (the first draft's vault gave one on maps 6 to 9; critic S11).
- `grade_up.relic_from_stage` **goes**: the Forge's Relic step reads the shelf (one gate, not two; critic S11).
- The validator allows Celestial in `ceiling` and `vault.grades` and refuses it in `shelf` (`tools/validate.py:2960`).
- The hours each map takes are 05's clock (critic S12); this file quotes no hours.

---

## 2. Mods: one visible trade each

Today: 13 weapon mods and 6 quiver enchantments (`data/items.json:283-686`). Most change one to-hit term or a flat number. On 01's scale a flat -2 or +3 is nothing (a level-20 plain hit is four digits, 01 T3b). Each mod below gives one thing a player sees and pays one thing a player sees. A mod's damage is a part of Σ (A8); **on a door's cash-out it does not count** (section 6.1): *the mod makes the blows and shots that build the counter harder.* The Forge's fit fee (`survival.json:211` `fit.rate` 0.2) is unchanged.

| Mod (items.json line) | Today | New: what it gives | New: what it costs | Data form (existing ops and gear fields only) |
| --- | --- | --- | --- | --- |
| Red dot `mod_red_dot` (283) | no -2 in the first band past effective range (`bands` 1) | Shots, Snap Shots and Bursts +1 to hit; no penalty in the first band past effective range | Aimed Shots -1 (it is not a scope) | `bands: 1, bands_modes: [shot, burst, auto]`; `roll_mod` to_hit `{with_this, mode: [shot, burst, auto]}` +1; `roll_mod` `{mode: [aimed]}` -1 |
| Scope `mod_scope` (304) | Aimed +1, one more band | Aimed Shots +2 to hit and two more bands | Shots and Bursts -1 (tunnel) | `bands: 2, bands_modes: [aimed]`; `roll_mod` aimed +2; `roll_mod` `[shot, burst, auto]` -1 |
| Suppressor `mod_suppressor` (336) | silent; -2 damage (flat) | silent; **a kill with it while you are Hidden gives 1 Shadow** | its shots -15% | `silent: 1`; `damage_mult` dealing `{with_this, melee: false}` 0.85; `resource` shadow +1 on `kill` `{with_this, self_has: [hidden]}` |
| Compensator `mod_compensator` (363) | Recoil -1 a shot (all recoil gone) | no Recoil from earlier shots this turn | the first shot of each turn -1 to hit (heavy muzzle) | `recoil: -1`; `roll_mod` to_hit `{with_this}` -1, `limit {per: per_turn, n: 1}` |
| Extended magazine `mod_extended_mag` (381) | +50% capacity | +50% rounds | reloading it costs 1 AP more | `magazine_pct: 50`; `cost_mod` cost `{action: [reload], with_this}` +1 |
| Quick-release `mod_quick_release` (399) | reload costs 1 AP | reload costs 1 AP | 25% fewer rounds | `cost_mod` set 1 (as today); `magazine_pct: -25` |
| Foregrip `mod_foregrip` (428) | Bursts and auto +1 | Bursts and full auto +2 to hit | drawing or swapping to this gun costs 1 AP more | `roll_mod` `[burst, auto]` +2; `cost_mod` on `swap` `{with_this}` +1 |
| Bayonet `mod_bayonet` (457) | the gun's blow deals 15 (Dexterity) | the gun's blow deals **9** (01 T2b) and builds Momentum as any melee hit | Aimed Shots -1 | `melee_damage` 9; `roll_mod` aimed -1 |
| Underslung launcher `mod_underslung` (475) | holds a 40 mm round; **not built** (`built: false`) | **once a fight, 2 AP: a grenade at a tile within 8**: a launcher round's blast, radius 1 | 1.5 kg, the underbarrel slot, and once a fight | `grant_action` (an item's action, `effects/actions.ts`): `ap: 2`, `uses {per: per_combat, n: 1}`, `reach {tile: true, tiles: 8, sight: true}`, effects `deal` (an `amounts` block of the launcher's blast, 01's x0.6 row) with `targets {of: tile, shape: burst, within: 1, side: any}`. No new op |
| Serrated edge `mod_serrated` (493) | a critical blow causes Bleeding | a critical blow (a natural 20 or the weapon's critical range) causes Bleeding, Body save skipped | blows -10% (teeth bite less deep) | today's `condition` on hit `{crit: true}`; `damage_mult` dealing `{with_this, melee: true}` 0.9 |
| Weighted head `mod_weighted` (524) | +3 damage (flat) | blows +20% | blows -1 to hit | `damage_mult` `{with_this, melee: true}` 1.2; `roll_mod` to_hit `{with_this, melee: true}` -1 |
| Wrapped grip `mod_wrapped_grip` (550) | can't be Disarmed; **not built** (narrator) | you can't be Disarmed while you hold it | swapping away from it costs 1 AP more | `cancel` on `cond_incoming` `{target: self, cond: [disarmed], with_this}`; `cost_mod` on `swap` `{with_this}` +1. `adjudication: engine` |
| Sigil-etched magazine `mod_sigil_magazine` (568) | holds a stored spell; **not built** | the first glyph you draw each turn costs 0.5 AP less (the spellslinger's pistol is an Evoker) | 25% fewer rounds | `cost_mod` on `glyph_cost` `{with_this}` -0.5, `limit {per: per_turn, n: 1}`; `magazine_pct: -25` |
| The six enchantments (586-686) | a tone's rider at stage 2; arrows x0.9 | KEEP: already a trade | KEEP | unchanged |

*So a mod is a choice you can read on the card before you pay for it: the scope makes you a better sniper and a worse brawler.*

Every flat damage number on a mod is gone (the suppressor's and the weighted head's become shares of the sum); the bayonet's blow is 01's x0.6 row. Three dead mods are built from existing pieces (the underslung launcher, the wrapped grip, the Sigil magazine). No mod needs a new op. The `<field>_modes` limit already exists (`character.ts:1738` `gearNum`).

---

## 3. The maker signatures

### 3.1 The one general piece: the family's signature row

**Today.** A maker's signature is a modifier row in `items.json` (`mod_line_arsenal` :1815, `mod_line_smetanita` :1835), named row by row in each weapon's `variant_mods`, held while that gun is in a hand. The readers:
- `effects/collect.ts:217-220` (`baked`), `effects/hooks.ts:201` and `effects/triggers.ts:277` read `variant_mods` for the item ops;
- `gearpreview.ts:156`, `:340` read them for the card;
- **`gearNum` does not** (`character.ts:1738-1742`: only the fitted `mods` it is given). So a signature cannot move a gear number (Recoil, bands, magazine). That is why Chezknov shipped plain (rules 1.92 item 8021, G14).

**The piece (PROVISIONAL).**
1. A family row in `data/families.json` names its signature **once**: `"signature": "<items.json modifier row>"`.
2. Every weapon row of that family carries it while in a hand, through the one carried-modifier list (`collect.ts:220`), beside `variant_mods`, the fitted mods and the grade row (section 1.2). The per-row `variant_mods` entries for Arsenal and Smetanita move up to their families (one copy).
3. `gearNum` reads the same carried list, not only the fitted mods, so a signature row may carry gear fields with their `<field>_modes`, as a mod does.

A signature then **feeds a door's counter** with the `resource` op (Pressure, Momentum, Guard, Shadow, `vcharge`: `data/actions.json resources`), **reads one** with `self_res` / `target_res` / `self_has_res`, and uses `mark` / `flag`, `cost_mod`, `zone`, `displace` and `cancel` like any item. A signature's damage is gear: a part of Σ on a plain hit, nothing on a cash-out (section 6.1). *A maker's gun plays like its maker on every row, and a new row of the family gets it for free.*

### 3.2 The thirteen that ship plain, and their data form

Sources: rules 1.92 items 8021, 8024, 8030 to 8035 (`PHC-Core-Rules-v1.0.md:14560-14636`) and rules 1.93 item 8104 (`:14699`).

| # | Signature (family) | Door it feeds or reads | Carried by the piece as it is? | Signature row (data form) |
| --- | --- | --- | --- | --- |
| 1 | G2 revolvers' best critical (`revolvers`) | Pressure | **needs more**: S13 `crit_range` | `sig_revolver`: `crit_range: 1` (a 19 is a critical too: two Margins, A7); `resource` pressure +1 on `hit` `{with_this, crit: true, hostile: true}`, target. *A revolver's lucky shot also pins them.* |
| 2 | G4 Legion, shoot then move (`legion_automatics`) | Pressure (Fire and Move's pattern) | **yes** | `sig_legion`: `mark` `fired` on `attack_roll` `{with_this, own_turn: true}`; `cost_mod` on `cost` `{action: [move], flag: fired, path_tiles_at_most: 2}` -1, min 0, `limit {per: per_turn, n: 1}`; `mark` clear `fired` on `turn_end` (the `fire_and_move` row's shape, classes.json) |
| 3 | G11 Brigade's split burst (`brigade_auto_shotguns`) | Pressure | **yes, as a door feed** ("the burst's spray presses its neighbours"; the damage split itself would be new) | `sig_brigade`: `resource` pressure +1 on `hit` `{with_this, mode: [burst, auto]}` with `targets {of: target, side: foe, within: 1, shape: aura}`, `limit {per: per_turn, n: 1, each: target}` |
| 4 | G13 ADCorp, the Forge fits its mods for less (`adcorp`) | none: an economy signature | **needs more**: one reader line (the extension `forge_fit_rate`) | `sig_adcorp`: `forge_fit_rate: 0.5` (no effects). *Half the fee to fit, swap or take off a mod.* |
| 5 | G14 Chezknov, less Recoil on Bursts (`chezknov_works`) | none; it feeds the Burst | **yes**, once `gearNum` reads the carried list (part of the piece) | `sig_chezknov`: `recoil: -1, recoil_modes: [burst, auto]`. *The Burst's second roll keeps its aim.* |
| 6 | H3 flamers' burning ground (`flamers`) | none; a consequence on the map | **yes**, with one data row: zone kind `burning_ground` in `rules.json zones.kinds` | `sig_flamer`: `zone` on `hit` `{with_this}` kind `burning_ground`, at target, within 0, rounds 2; `condition` burning on `turn_start` `{actor: foe, actor_in_zone: {kind: burning_ground, owner: self}}` (the Hallow pattern, classes.json `hallow`); Burning's tick is 01's x0.6 row on the dealer's column |
| 7 | H4 rotary's Spin Up (`rotary_and_belt_fed`) | none; AP | **yes** | `sig_spin`: `mark` `fired` on `acted` `{with_this}`; on `turn_end`: `mark` `spun` `{flag: fired}`, then `mark` clear `spun` `{no_flag: fired}`, then `mark` clear `fired`; `cost_mod` on `cost` `{action: [attack], with_this, mode: [auto, burst], flag: spun}` -1. *Keep it spinning and it costs less; stop and it spools down.* |
| 8 | H5 anti-materiel, the line hit (`anti_materiel`) | none | **needs more**: S14 `targets.past` | `sig_through`: `deal` on `hit` `{with_this, target_alive: any}` an `amounts` block `{kind: damage, per: [{of: "event:amount", value: 0.5}], armour: full}` with `targets {of: self, shape: line, past: true, within: 3, side: any}` (a share of the hit: no flat number) |
| 9 | H8 thrown, two targets (`thrown`) | none; AP | **yes, as a tempo** ("throw one, the second is cheaper") | `sig_thrown`: `mark` `threw` on `hit` `{with_this, mode: [thrown]}`; `cost_mod` on `cost` `{action: [throw], flag: threw}` -1, min 1, `limit {per: per_turn, n: 1}`; clear on `turn_end` |
| 10 | the door knocker's x3 to cover (`power_gauntlets`) | Momentum | **yes, by a data move**: its push 3 leaves the grant for its own modifier row, which frees the grant for Door Key | the row's `variant_mods` gains `mod_knocker`: `displace` on `hit` `{with_this, hostile: true}` tiles 3 (today's count); the row's `grants` becomes `cover_damage_mult` 3 (a share) |
| 11 | the throwaway tube's single use (`rocket_tubes` row `legion_throwaway_tube`) | none; consequence | **yes** (once a fight; it is back after the fight) | `mod_throwaway`: `mark` `spent` on `acted` `{with_this}`; `cancel` on `attack` `{with_this, flag: spent}` why "The tube is spent." Its text says "once a fight". |
| 12 | the wall gun, Prone only (`blackpoint_wall_gun`, held) | none | **yes** (the row can ship) | `mod_wall_gun`: `cancel` on `attack` `{with_this, self_lacks: [prone]}` why "It fires only from Prone." (`conditions.json:295` prone) |
| 13 | the darts' Toxin (second skill, Ingenuity 3) | none | **yes**, with one data row: condition `toxin` in `conditions.json` (a Body debuff: Weakened's row shape) | `mod_darts`: `condition` toxin on `hit` `{with_this, self_skill: {ingenuity: 3}, target_alive: true}` |

Carried by the piece and existing ops: **10** (2, 3, 5, 6, 7, 9, 10, 11, 12, 13). Need more: **3** (1 S13 `crit_range`, 4 the extension `forge_fit_rate`, 8 S14 `targets.past`). Two of the "as is" rows add a data row the engine already reads generically (a zone kind, a condition row). G16 Smetanita and G15 Arsenal are carried today; they move from `variant_mods` to their families' `signature` (one copy).

---

## 4. Perks

### 4.1 The rules I applied

- **KEEP**: a verb, or already felt (a tenth of a number the player sees, an AP of six, +2 on a d20 or more, a whole turn).
- **RE-STEP**: a conditional damage or defence number. **Tier I is +15% and tier II +30% while the condition holds** (a part of Σ, A8). Per-stack perks are scaled so the top is the same; the stack that reaches it is named. A d20 term under +2 goes to +2 (I) and +3 or +4 (II): on a d20 with Margins a +1 is a twentieth, under the felt bar.
- **A perk speaks for its own door.** A damage perk of a door's skill counts on that door's actions; on another door's cash-out it does not count (section 6.1). Four perks whose text said "weapon damage" or "any damage" are scoped to their door: Bulwark and Shrug It Off to the Guard door's blows (Slam, Retort, shield blows), Pressure Point to the Dexterity weapons, Taut Thread to the Bonds door's damage. *The wall's perks make the wall hit back; a Breaker who dabbles in Durability gets plates, not a second Iron Grip.*
- **DEAD TODAY**: it gives nothing. That is chiefly the pure story perks: Survival is the only open mode (`data/modes.json`: Campaign `available: false`), and it has no Narrator scene to read them. **Each keeps its story half for campaigns and gets a fight half now** (ruling C21), from existing pieces.
- **Marks** (section 6.2): a perk that makes the squad better against one foe puts **a mark** on it; a foe carries one mark at a time, and a mark is +20% (or its to-hit). Footnote, Spoon Feed, True Name, Case Closed and Judgement Day are marks.
- **No perk above the step is cut** (Righteous stays at +20 / +40%): *a reward is never taken back.* The marks are the exception, and a question (section 6.4).
- **Every flat number is 01's** (T2b x0.6; MP prices on 01's pool, T7b row "perks that cost MP": x0.5, x `mp`).

### 4.2 Acquired perks (90; `data/perks.json`, line of the row)

| id (line) | Skill | Today, with numbers | Verdict | New (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| bulwark (23) | Durability | +2% weapon damage per Guard held, to +10%; II +3% to +15% | RE-STEP, scoped | the Guard door's blows: I +5% a plate held, to +15% (3 plates); II +6% a plate, to +30% (5 plates). *A full wall hits back a third harder.* |
| shrug_it_off (151) | Durability | after a blow hurts you, +8% weapon damage to your next turn's end; II +12% and +1 Guard (once a round) | RE-STEP, scoped | the Guard door's blows: I +15%; II +30% and +1 Guard |
| numb (318) | Pain Threshold | an injured limb no penalty; II with Guard, a critical on you lands as an ordinary hit, no injury | KEEP | II now reads: with Guard up, a hit on you counts no Margins and leaves no injury (`margins_taken`, all) |
| still_standing (462) | Pain Threshold | a last turn at 3 / 5 AP, once a fight | KEEP | |
| second_wind (566) | Pain Threshold | 2 AP once a fight, heal 25% of max HP; II +2 Guard | KEEP | a share of HP rides the scale by itself |
| close_guard (699) | Pain Threshold | Answer: 25% / 50% of a blow on an adjacent ally comes to you, plates soak | KEEP | a verb |
| wind_on_the_skin (828) | Sensory | learn the nearest / every unseen foe's tile in Vision at fight start | KEEP | |
| bedside_manner (907) | Sensory | story: learn whether the next words are a lie | DEAD TODAY | fight: I a foe next to you that you touch (0 AP, once a fight) is Read (`conditions.json:551` `read`, Read Intent's mark); II once a turn |
| read_the_air (977) | Sensory | story: +2 / +4 on the next social roll | DEAD TODAY | fight: the save of a foe next to you against your next Call is +2 / +4 TN (`roll_mod` on `save`, `roll: tn`, `target_within: 1`, once a turn) |
| tremor (1057) | Sensory | +1 / +2 to the squad's ambush roll; never caught; II starts with 2 Guard | RE-STEP (roll) | I +2; II +4, the rest kept |
| breaching_strike (1167) | Raw Power | after a Finisher drops a foe, the next Strike or Opener costs no Momentum; II a Finisher on an Elite or Boss gives 1 Momentum | KEEP | a verb on the chain |
| iron_grip (1354) | Raw Power | Grappled / Bound can't Answer; +6% melee vs Grappled or Prone; II +12% (also Shaken, Afraid), push +1 | RE-STEP | I +15%; II +30%, the rest kept (the Momentum door's: it reaches a Coup) |
| into_the_dark (1480) | Guts | no Ambush bonus on you after first stepping into unseen ground | KEEP | |
| steady (1561) | Guts | Fear can't stop you; II Fear and Nausea at most 1 round | KEEP | |
| point_man (1650) | Guts | allies within 3 roll Fear with your Guts; II +2 Heart saves | KEEP | |
| unflinching (1770) | Guts | at 3+ Momentum, melee attacks on you -1; II shots too | RE-STEP (roll) | I -2 melee; II -2 every weapon attack |
| grim_reaper (1884) | Intimidation | a hit from a Shaken or Afraid foe costs no Momentum; II a kill frightens within 8 | KEEP | |
| marrow_talk (2108) | Intimidation | story: a failed threat Shakes (-2); II in a fight a saved Threaten still Shakes 1 round | DEAD TODAY (I) | I takes II's fight half (Shaken 1 round); II Shaken 2 rounds |
| stare_down (2240) | Intimidation | the nearest foe saves or is Stunned; II Shaken 3 rounds | KEEP | |
| bone_talk (2359) | Intimidation | story: a truthful answer or Shaken | DEAD TODAY | fight: I 0 AP, once a fight, a foe next to you makes a Heart save or is Shaken 2 rounds and Read; II every foe within 3 (`grant_action`, `condition` with `targets`) |
| wall_run (2449) | Athletics | vault 2 / 4 tiles at no extra movement | KEEP | |
| roll_with_it (2524) | Athletics | a miss on you, 1 / 2 free tiles | KEEP | |
| untouchable (2598) | Athletics | no torso armour (II light): attacks on you roll twice, worse | KEEP | |
| catch (3400) | Athletics | catch a grenade; throw back 1 / 0 AP | KEEP | |
| both_hands, Pressure Point (2706) | Dexterity | +1 Pressure on a Pressed foe; +5% vs Pressed; II +1 more on Suppressed, +5% more vs Suppressed | RE-STEP, scoped | the pips kept; with Dexterity weapons: I +15% vs Pressed; II +15% vs Pressed, +30% vs Suppressed |
| running_reload, Keep Their Heads Down (2923) | Dexterity | a hit on a Pressed foe puts it Off Balance (save; II none) | KEEP | |
| rounding_up (3057) | Reaction Speed | a fraction of an AP rounds up; II 1 AP carries once a fight | KEEP | |
| shoot_first (3135) | Reaction Speed | act in a failed ambush's free turn at 3 / 4 AP | KEEP | |
| cut_in (3219) | Reaction Speed | story: interrupt once / twice a scene | DEAD TODAY | fight: I once a fight, when a foe you see starts an action, 1 free AP first: a move, a swap or a reload; II 2 AP (Between Heartbeats' piece, the op `interrupt`) |
| speed_load (3291) | Reaction Speed | reload 1 AP less; II a draw-attack free once a fight | KEEP | |
| sleight_of_hand, Long Dark (3496) | Ingenuity | +8% / +14% while Hidden | RE-STEP | I +15%; II +30% (Hidden is the Shadow door's: it reaches a Break) |
| shadow_step (3588) | Ingenuity | a Hidden attack with Shadow 1 AP less; II Shadow Run | KEEP | |
| jury_rig (3789) | Improvisation | a Figment destroyed, +1 AP; II +1 charge | KEEP | |
| field_repair (3949) | Improvisation | 2 AP: clear a jam, restore durability, repair 15 (profile `repair`) | KEEP, rescaled | repair **9** (01 T2b x0.6), on the heal column (01 3.1) |
| hot_swap (4047) | Improvisation | one / two free swaps a turn | KEEP | |
| tuned (4145) | Improvisation | the main hand never jams or breaks; II a core 1 AP less | KEEP | |
| got_you_in_my_sight (4232) | Vigilance | +2 AP when a seen foe hides (every 3 turns) | KEEP | |
| eyes_in_the_back (4330) | Vigilance | can't be flanked | KEEP | |
| read_intent (4404) | Vigilance | your Spot Reads its target; II +1 Shadow | KEEP | (Read is information, not a mark: it does not take the mark's place) |
| detectives_eye, The Tell (6034) | Vigilance | a trap or a weak point spotted at fight start (one / two) | KEEP | it has its fight half |
| hold_the_stroke, Second Clause (4541) | Brain Power | Sigils +6% / +12% vs a conditioned foe | RE-STEP | I +15%; II +30% |
| parallel_thought, Running Hand (4660) | Brain Power | the first glyph a turn -0.5 AP; II no Flux | KEEP | |
| footnote (4809) | Rumination | once a fight, allies +1 / +2 to hit one foe for the round | RE-STEP (roll), a mark | the foe carries your **Footnote** mark for the round: I the squad +2 to hit it; II +3, and your own Sigils too |
| lab_coat (4905) | Rumination | +3 saves vs known chemicals; II neutralise | KEEP | |
| index (4988) | Rumination | story: one true answer; II +2 next Brain save | DEAD TODAY (I) | I in a fight, once, 0 AP: one foe's resistances and saves are shown (the reveal Analyze makes, no AP) |
| proven_formula (5108) | Rumination | +3 / +5 saves vs what already hit you | KEEP | |
| overruled (5170) | Eloquence | +2 AP while a foe carries your Brain debuff | KEEP | |
| objection (5265) | Eloquence | story: expose a contradiction | DEAD TODAY | fight: I 0 AP, once a fight, a foe you see makes a Brain save or is Shaken 2 rounds; II and it loses 1 AP next turn (Off Balance) |
| opening_argument (5337) | Eloquence | story debate before a fight: foes -1 AP in round 1 | DEAD TODAY | fight: I at `combat_start`, the foes' leader (their Elite or Boss, else the nearest) makes a Brain save against your Eloquence or every foe has 1 AP less in round 1; II as today, and the first Call each fight is 0 AP |
| thinking_aloud (5464) | Eloquence | after a Call, the next Evoke 0 AP | KEEP | |
| mirage, Many-Eyed Dream (5742) | Visualization | Figment blows +4% a Figment, to +12%; II +6% to +18% | RE-STEP | I +5% a Figment, to +15% (3); II +7.5%, to +30% (4) |
| blueprint, Wake of the Kill (5876) | Visualization | a Figment kill, +1 AP; II and a charge | KEEP | |
| pattern_lock (6105) | Acuity | +2 / +4 Defense vs a seen attack | KEEP | |
| quick_read (6187) | Acuity | Analyze 1 AP less | KEEP | |
| read_them (6293) | Acuity | an Analyzed foe deals 15% / 25% less to your side | RE-STEP | I 15% (kept); II 30% (the Analyzed foe's own sum, as a penalty) |
| still_breath (6415) | Acuity | spot rolls on you -2 by cover | KEEP | |
| talks_broke_down, Parley (6514) | Charisma | talk them down; II +2 AP | KEEP | |
| crowd_pleaser (6593) | Charisma | one roll for a crowd, save 2 harder | KEEP | |
| smooth (6674) | Charisma | story: a failed lie only raises suspicion | DEAD TODAY | fight: I a foe that saves against your Persuade is at -2 to hit you on its next turn; II and your first Persuade each fight is +2 TN |
| showman (6745) | Charisma | Picture 1 charge less; II a free order | KEEP | |
| shared_breath, Taut Thread (6875) | Empathy | +6% / +12% on a Bonded foe | RE-STEP, scoped | the Bonds door's damage on a Bonded foe: I +15%; II +30% |
| lay_down_arms, Bitter Balm (6992) | Empathy | heals you give turn 10% / 20% of the HP into Soul damage on Bonded foes | RE-STEP | I 15%; II 30% (a share of the heal) |
| hand_off (7199) | Camaraderie | a friend within 1 / 3 uses your Defense | KEEP | |
| nobody_left_behind (7265) | Camaraderie | Stabilise 1 AP less; Downed friends take 50% less | KEEP, MP rescaled | its MP 36 becomes 18 x `mp` (01 T7b) |
| steady_hands (7480) | Camaraderie | Settle; II Soothe | KEEP, MP rescaled | 15 and 18 MP become 8 and 9 x `mp` (01 T7b) |
| pull_together (7822) | Camaraderie | Tug; II Guide | KEEP, MP rescaled | 12 and 15 MP become 6 and 8 x `mp` (01 T7b) |
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
| flat_line (9689) | Composure | the most dangerous foe -1 / -2 to hit while it sees you | RE-STEP (roll) | I -2; II -3 |
| poker_face (9768) | Composure | story -3 to lie-readers; II +2 Brain saves | DEAD TODAY (I) | I +2 Brain saves; II +3, and the story half |
| stand_still (9854) | Composure | -2 to hit you until you act | KEEP | |
| pure_heart (9953) | Composure | refuse one / two Mana Shorts | KEEP | |
| litany (10040) | Faith | the first / two Hymns 1 AP less | KEEP | |
| holy_ordnance, Sinner's Due (10193) | Faith | prayers +8% / +12% vs a foe at half HP | RE-STEP | I +15%; II +30% (II's Marked or Judged kept) |
| red_line (10304) | Conscience | +1 / +2 Heart saves; II allies +1 | RE-STEP (roll) | I +2; II +3, allies +2 |
| clean_hands (10400) | Conscience | a shield of 15% / 25% of max HP for sparing | RE-STEP | I 15%; II 30% (a share) |
| righteous (10494) | Conscience | prayer heals on an ally at half HP +20% / +40% | KEEP | over the step; never cut |
| foresight (10638) | Conscience | story; II once a fight, a blow that would drop an ally within 4 leaves 1 HP | DEAD TODAY (I) | I the same for yourself once a fight; II you or an ally within 4 |
| outclassed (10726) | Authority | +3 AP after the first kill | KEEP | |
| rank_has_privileges (10827) | Authority | story: orders obeyed | DEAD TODAY | fight: I rank-and-file foes (`actor_not_tier: [elite, boss]`) are -2 to hit you while you stand; II and their saves against your Calls are 2 harder |
| five_stars (10903) | Authority | friends bank +1 AP; II rank-and-file Shaken | KEEP | |
| commanding_voice (11017) | Authority | +3 saves vs Silenced, Shaken, Fear; II immune to Silenced | KEEP | |

Tally (90): KEEP 57 (three with MP rescaled, one with its repair rescaled); RE-STEP 19 (bulwark, shrug_it_off, tremor, iron_grip, unflinching, both_hands, sleight_of_hand, hold_the_stroke, footnote, mirage, read_them, shared_breath, lay_down_arms, heart_overload, resonance, flat_line, holy_ordnance, red_line, clean_hands), four of them scoped to their door; DEAD TODAY, given a fight half: 14. None becomes a verb: every small unconditional number in the acquired list is already a whole AP or a verb.

### 4.3 Achieved (19) and ultimate (6)

| id (line) | Today | Verdict | New |
| --- | --- | --- | --- |
| charge (12412) | a straight move of 3+ ending by a foe: up to 3 AP free | KEEP | |
| make_way (12456) | no opportunity attacks from foes you pass | KEEP | |
| just_the_repairman (12504) | with a toolbox, 50% to stay Hidden when spotted | KEEP | |
| spoon_feed (12547) | 2 AP: allies +2 to hit one foe | KEEP, a mark | the foe carries your **Fed** mark until your next turn (the squad +2 to hit it) |
| cultured (12602) | +1 on two checks about art | RE-STEP (roll) | +2 (story; an achieved perk may be story) |
| field_surgeon (12649) | Field Repair heals a living ally, 3 HP a point of Improvisation | KEEP, rescaled | **1.8** a point (01 T2b x0.6), on the heal column |
| dance_of_iron (12714) | a miss on you, a free shot back | KEEP | |
| cold_read (12758) | story: what an Analyzed foe wants | DEAD TODAY | fight: a foe you Analyze is also Read |
| fire_sermon (12798) | 2 AP: your Blessings Shake foes within 4 | KEEP | |
| silent_partner (12848) | an adjacent ally hides with you | KEEP | |
| verse_of_war (12890) | In verse: +1 tile and +10% to an Outburst | KEEP | +10% in Σ, the Outburst door's (it reaches a Release) |
| between_heartbeats (12937) | once a fight, 2 free AP before a foe's action | KEEP | |
| siege_engine (12980) | Shove and Break 1 AP less; Guard from a Shove; unpushable | KEEP | |
| dead_signal (13050) | 1 AP, disable a device while unseen | KEEP | |
| twin_souls (13096) | a third school at half strength, +20 MP | KEEP, MP rescaled | **+12 x `mp`** (one Determination point's worth on 01's pool, T7a) |
| the_voice (13143) | once a session, rank-and-file obey an order | KEEP | |
| bite_the_bullet (13193) | once a fight, borrowed time at 0 HP | KEEP | |
| sixth_sense (13245) | Hidden foes within 3 revealed | KEEP | |
| what_could_be (13288) | story: a vision of the best outcome | DEAD TODAY | fight: once a fight, 0 AP: every foe you see is Read until your next turn |
| war_footing (13329) | a foe ending next to you loses 2 AP (every 3 turns) | KEEP | |
| last_charge (13373) | a 5+ tile charge: melee x1.5 that turn; a shield of armour value x3 (at least 15) | RE-STEP | **+30%** in Σ on that turn's blows (a tier II's worth: *the charge is the turn's set-up*); the shield armour value x3, at least **9** (01 T2b x0.6), riding 01's armour (T8b) and the grade's `arm`. Not a door's own: it does not reach a Finisher |
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
| earthbreaker (11288) | Raw Power | once a fight, 4 AP: your melee damage on a 3x3, Prone, cover gone | no (a fixed blow at the chain's own cap) | **a Finisher row** (`techniques.json`, the Finisher family; critic M9): once a fight, it spends the whole chain and every unit in the 3x3 (`targets`) takes the Finisher's cash-out for the steps spent (S3, the one copy of the Finisher rule), Prone, cover gone; allies still hit. Its handler in `perks/a.ts` goes |
| nothing_left_to_fear (11343) | Guts | immune to Fear; allies within 3 can't be Afraid | yes | |
| the_name_they_whisper (11409) | Intimidation | every foe Afraid 2 rounds; surrender at half | yes | |
| never_there (11450) | Athletics | first move draws nothing; later moves -4 to shots at you | yes | |
| trick_shot (11490) | Dexterity | once a turn, a Ricochet: half the damage to the nearest foe within 2 | yes | add: the Ricochet lays 1 Pressure on the second foe (it reads the door) |
| before_the_blink (11541) | Reaction Speed | always first in round 1; two reactions | yes | |
| vanishing_act (11582) | Ingenuity | once a fight, 2 AP, Hidden where you stand | no (once a fight against a door built for it) | **2 AP and 3 Shadow, at will**: you vanish when you have built for it (`cost_mod` res shadow) |
| overhaul (11627) | Improvisation | Field Repair 1 AP, doubled; a permanent extra slot once a weapon | yes | its slot adds to Masterwork's (`extraSlots`) |
| nothing_gets_past (11681) | Vigilance | every foe that moves in sight is Spotted | yes | |
| clean_draw (11716) | Brain Power | once a fight, the next spell (up to 4 glyphs) costs no charge and no Flux | no | up to **your Reach** (not 4), and its Evoke 0 AP; once a fight. (The first draft's "counts one glyph longer" is dropped: one past your Reach is the Push, Overclock, ruling C17) |
| established_fact (11757) | Rumination | story fact; once, your own Overload deals you nothing | no (in a fight) | fight: once a fight, a Brain or Heart save you fail becomes a success (`auto_success`) |
| closing_argument (11811) | Eloquence | story; once, your Persuade gets no save | yes | |
| solid_image (11864) | Visualization | once a fight, the Glimmer becomes a real Double | no | **once a round**, 0 AP: a Glimmer you make is a real Double until your next turn, outside your held count |
| case_closed (11902) | Acuity | full reveal; squad +2 Defense and +20% damage vs the Analyzed | yes, as a mark | the Analyzed foe carries your **Closed** mark: the squad +20% against it (a mark: it reaches a cash-out) and +2 Defense against it. *A whole squad's +20% outweighs one character's +30%* |
| everyones_friend (11959) | Charisma | story: a trusted friend for a scene | DEAD TODAY | fight: once a fight, a rank-and-file foe that sees you makes a Heart save or surrenders (Open Hand's piece) |
| threads_that_hold (11997) | Empathy | Tending to the Bonded +50%; Bonds hold while you are Downed | yes | |
| many_hands (12066) | Camaraderie | Share a Hit within 3; lend your reaction | yes | |
| their_own_idea (12127) | Insinuation | story: a planted suggestion | DEAD TODAY | fight: once a fight, 0 AP, a foe makes a Heart save or is Confused (`conditions.json:399`) |
| the_twin_pays (12161) | Will Power | once a fight, a free Begin and no Strain to hold it | no | add: it Begins at **stage 2**, and its first Push (Overdraw, Will Power's Push by C17) costs no Strain |
| true_name (12202) | Lore Master | once a session, the squad +50% vs a named foe | no in Survival (a run is one session) | **once a fight**, 0 AP: a foe you see carries your **Named** mark (the squad +20% against it) and its resistances and saves are shown |
| still_water (12245) | Composure | immune to Brain debuffs; unreadable | yes | |
| judgement_day (12284) | Faith | once a fight, 3 AP: its next attack fails, your attacks +50% | changed (one mark) | its next attack fails (kept), and it carries your **Judgement** mark: **the squad** +20% against it, where it was you +50%. *The miracle is the failed blow; the squad shares the verdict* |
| foreseen (12335) | Conscience | once a session, a table rewind | DEAD TODAY (Survival) | fight: once a fight, a foe's attack on you or an ally within 4 is undone: it deals nothing and puts nothing on (Foresight II's piece, `would_drop` / `taking`, plus `cancel` on `cond_incoming`) |
| on_my_mark (12369) | Authority | once a round, 1 AP: an ally acts now with up to 4 AP | yes | |

Worth it as they are: 15. Changed so that they are: 12 (8 not worth the wait, 4 dead in Survival). Judgement Day and True Name lose damage for the holder (+50% to +20%) and give it to the squad: that is the marks' question (section 6.4). Every changed meaning is offered again through the existing re-pick (`pendingRepicks`, `answerRepick`, `migrateCharacterPerks`; critic M-4), so a step chosen under the old text can be chosen again.

---

## 5. Margins replace the critical: every feeder (ruling A7)

01 section 9 owns the rule (a Margin a full 4 over the Defense or TN; a natural 20 adds two; each adds a quarter of the plain hit plus a point of Perception, T10) and deletes `CRIT_BASE`, `CRIT_MAX`, `CRIT_PER_PERCEPTION`, `CRIT_PER_DEXTERITY` (`character.ts:853-855`), `critMult`, `sigils.json critical` (:118-122) and the Outburst critical (`classes/soul.ts:39`). **A critical stays a word**: a natural 20, or a roll in the weapon's or the technique's critical range (`critMin`, `combat.ts:1644`, which an ambush already widens to 19); a critical lands and adds two Margins. Every feeder:

| Feeder | Today | Now |
| --- | --- | --- |
| Perception +3% a point, Dexterity +2% a point (`critMult`, `character.ts:855`) | the critical's size | **01's** (4.2, 9): Perception makes a Margin a point bigger; Dexterity's line is +5% damage |
| The stat `crit_damage` (`effects/stats.ts:42`) | the critical multiplier | **renamed `margins`**: Margins added to a hit that lands (the same readers, one stat; S1's stat line) |
| One Shot's Breath Held `crit_damage_mod` +25% (`traits.json:2178`) and its handler's `ctx.critBonus` +0.25 (`perks/c.ts:441`) | +25% critical damage, inside the x2 | **+1 Margin** on that first shot if it hits (`stat_mod margins` +1 in its context); the handler's second copy goes |
| The stat `crit_taken`: Perception -10% a point and Acuity -5% a point (`character.ts:1237` `critTakenPct`; `skills.json:2509`, the skill id `analysis`) | cuts a critical's extra on you | **renamed `margins_taken`**. Perception's line is gone (01 4.2). **Acuity: a hit on you counts one Margin fewer at Acuity 5, and two fewer at Acuity 10** (two rows on `skills.json analysis`, `stat_mod margins_taken` -1 each; the 0.05 slope goes). *A whole step you see on the dice line, twice in the climb* |
| Numb II (`perks.json:318`) | a critical on you lands as an ordinary hit | with Guard up, a hit on you counts **no** Margins (`margins_taken`, all) and leaves no injury |
| Sigil critical x1.5 to 2.0 (`sigils.json:118-122`; `spellCritMult`, `sigil.ts:336`, `:1066`); Outburst critical (`classes/soul.ts:39`) | the spell's critical | two Margins, as a weapon's (01 9) |
| Critical ranges: `point_crit_min` 18 (`techniques.json:404`), `precise_crit_min` 18 (:1581, :2819), `suppressed_crit_min` 18 (:2602), Joy's 18 (`magic.ts:1414`), the weapon op `aimed_crit_min` | when a roll is a critical | KEEP: they set the critical range, which now means two Margins. `aimed_crit_min` becomes the gear field `crit_range` with `crit_range_modes: [aimed]` (S13, one copy; the revolver's signature uses it, 3.2 row 1) |
| Gambler's Double or Nothing (`perks/g.ts:534-537`) | a success becomes a critical | KEEP (two Margins) |
| Glass Runner (+50%), Crawler-Blooded (-30%): a critical that injures a limb | damage taken | KEEP (they read "critical", the word, not the multiplier) |
| The serrated edge; Joy; Calm ("no critical") | read `crit` | KEEP |

---

## 6. The sum and the top of the scale (ruling A8)

### 6.1 What adds, and where (01's stack rule, scoped)

01's formula (section 10.1): **dealt = max(1, floor(B x Lv x Stat x Gr x (C + per x m) x (1 + Σ)) - armour)**. Level, the two cards, the grade and the cash-out multiply; Margins add to C; **everything else is one sum Σ**, held at -90% at least, with no top (A10: `VS_CAP` goes). This file owns most of Σ's sources, and sets **where** each counts. One scoping rule (PROVISIONAL):

**On a door's cash-out, Σ counts the door's own sources and the foe's mark. Every other source on the sheet counts on plain hits.**
- **A cash-out** is an action that spends more of a door's counter than the door's least use (a Finisher, a Take, a Break, a Slam, a Line of 3 or more, a Pumped Release, a Hymn with Grace, Snap All, Curtain): S3's `cash:<resource>` count, over the door row's least. A door's least use (a Strike or a shot, a Line of two, an un-Pumped Release, a lone Snap, a Hymn with no Grace) is a plain hit and carries everything.
- **A door's own sources:** the perks of the door's three skills (acquired and Mastered), the door's class moves and passives (02, 03, 04), and a source whose condition names the door's own damage or state (Bright Script and Sure Script name Sigils; Hot Blood, Steady Heart, Hollow Heart and Verse of War name Outbursts; Cheap Shot names Hidden).
- **The foe's mark** (6.2) counts everywhere.
- **Everything else** (mods and signatures, properties, run boons that name no door, traits, achieved and ultimate perks of no door, another door's perks) counts on plain hits: *your gear, your run and your nature make the blows and shots that build the counter harder; the counter's cash-out is your door's own.*

In data: a Σ term gains `cash: true` when it is a door's own or a mark (the reader defaults it from the row's file and condition, as 01's stack rule reads a term's kind); on a cash-out, `stackDamage` (`effects/output.ts:131`) keeps only the terms with `cash: true`. One field on 01's S12, read with S3 (Needs a new primitive).

### 6.2 A foe carries one mark

A **mark** is a condition on a foe that makes the squad's attacks on it better: today's `marked` (`conditions.json:521`, +1 to hit the marker's squad) and the five perks of section 4 (Footnote, Fed from Spoon Feed, Named from True Name, Closed from Case Closed, Judgement from Judgement Day). **A foe carries one at a time: a new mark replaces the old** (condition rows gain `slot: "mark"`; a condition of a filled slot replaces the one there). A damage mark is **+20%** for the marker's squad, and counts on cash-outs (6.1). *A foe singled out once is singled out; the squad chooses whose verdict stands.* Read (information) and the Chaplain's `judged` (`conditions.json:712`, where interventions land) are not marks. Faith's unlock against the Judged or Marked (`skills.json:5277`, `damage_vs` 0.4) is the prayer door's own term that reads a mark; it stays +40% on prayers.

*Why +20%:* it is more than a tier I and less than a tier II, because four players share it; and on the tightest cash-out (the Coup, 6.3) it is what the budget holds beside one tier II perk.

### 6.3 The largest legal turn of each door at level 20 (01's T11, with this file's sources)

The doors' numbers are **01's T11** (level 20, door attribute and alpha 10, Perception 10 where the door rolls, Celestial, the door's Push, a natural 20 on a foe four levels under). 01 counts 9 Margins at +16 to hit; this file's sources add to-hit (a Celestial's True property +2 on the first attack a turn, `survival.json` `prop.true`; True Aim +1, `boon.true_aim`; Sure Script or Steady Heart +2 for the casters; a Deep focus +1; a drill Mark II +1, 02's), which reach **10 Margins** at most (+20 to +23 to hit against Defense 8). The table counts 10. Margins are each 0.35 of the plain hit (01 T10, Perception 10).

**Cash-outs** (Σ = the door's own + one mark):

| door | the door's own sources (this file's; a class move's are its door file's) | own | with the mark | 01 T11 largest, 9 Margins | at 10 Margins | with the sum | room left for the door's class terms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Guard: Slam (per foe) | Bulwark II, 5 plates +30% + Shrug It Off II +30% | +60% | +80% | 8,325 | 8,325 (no roll) | 14,985 | +1021% |
| Momentum: Coup | Iron Grip II (Grappled or Prone) +30% | +30% | +50% | 63,661 | 65,906 | **98,859** | **+2%** |
| Pressure: Dead Centre | Pressure Point II (Suppressed) +30% | +30% | +50% | 35,419 | 37,158 | 55,737 | +119% |
| Shadow: the Break | Long Dark II (Hidden) +30% + Cheap Shot +8% + the fresh ambush (03's) +50% | +88% | +108% | 72,420 | 74,159 | **154,250** | **-73%** |
| Sigils: one Subject | Second Clause II (a conditioned foe) +30% + Bright Script +5% | +35% | +55% | 61,983 | 63,581 | **98,550** | **+2%** |
| Figments: Curtain | Many-Eyed Dream II (4 Figments) +30% | +30% | +50% | 30,602 | 31,690 | 47,535 | +166% |
| Bonds: Snap All (total) | Taut Thread II (Bonded) +30% | +30% | +50% | 12,736 | 12,736 (no roll) | 19,104 | +635% |
| Outbursts: the Release | Clenched Heart II +30% + Resonance II +30% + Verse of War +10% + Hot Blood +5% + Hollow Heart +10% | +85% | +105% | 44,097 | 45,637 | 93,557 | +14% |
| Prayer: a Hymn | Sinner's Due II (half HP) +30% + Faith's unlock vs the Judged or Marked +40% | +70% | +90% | 16,685 | 16,685 (no roll) | 31,702 | +409% |

**Plain hits** (Σ = everything legal on one hit; the largest plain hit of the three weapon doors, 10 Margins, 11 with One Shot):

| plain hit | plain (01 T11) | Margins | Σ: its sources | Σ | the hit |
| --- | --- | --- | --- | --- | --- |
| Momentum: a wreck saw Strike | 6,414 | 10 | Iron Grip II 30, Biting 10, Edge 10, Whetted 5, the weighted head 20, Last Charge 30, Pain Eater 50, The Brightest Light at 5 kills 50, the mark 20 | +225% | 93,805 (room for 02's class terms on plain blows: +21%) |
| Pressure: a long rifle shot | 4,968 | 11 | Pressure Point II 30, Keen 10, Edge 10, Hot Loads 5, Pain Eater 50, The Brightest Light 50, the mark 20 | +175% | 66,261 |
| Shadow: a long rifle shot from Hidden (no Shadow spent) | 4,968 | 11 | Long Dark II 30, Cheap Shot 8, Keen 10, Edge 10, Hot Loads 5, the fresh ambush (03's) 50, Ghost Soldier 50, Pain Eater 50, the mark 20 | +233% | 80,236 |

**The ordinary big turn**, for scale: a level-20 Breaker in Relic (01's stated attacker's grade at 20), a x7 Coup without the Push, one Margin, Iron Grip II and no mark: 5,498 x (5.52 + 0.35) x 1.3, **about 42,000**. Five digits, as the charter asks of a full cash-out.

**What the table says** (each item for the file named):
1. **Nothing reaches six digits** except the Break, which is 03's: with its own fresh ambush (+50%, 03's term) and this file's +38% and the mark, **03 holds Shadow's Bite at 9 at about 0.52** (01 10.3 item 4 said 0.56 for a +57% sum; the mark and the tenth Margin take the rest), or moves the fresh ambush out of the Break's own sum.
2. **The Coup and the Line have about +2% left for their class terms** (02, 03): a full Coup and a full Line carry no class percentage. By ruling C16 the class's edge is something only it can use (its counter, its moves), not a bigger number on the same cash-out.
3. **The Outburst has +14% left** (04's class terms on a full Release), Pressure +119%, the others far more.
4. **Without 6.1 and 6.2** the Coup would carry today's squad set-up (01's +220%) at 10 Margins: about 210,900. Trimming the numbers instead, with every source reaching every hit, would leave the Coup's +57% for an own-door tier II (+30%) and everything else together: every trait, mod, property, boon and mark would sit at a point or two, under the felt bar. That is why this file scopes rather than trims (section 6.4).

### 6.4 The two rules, for the lead

The scoping rule (6.1) and the one-mark rule (6.2) are this file's answer to A8's "trim in 07 until none does", read with the lead's "every perk is still felt". They are rules a player sees (the damage line says "cash-out: your door's sum"), not caps on a number: no source is wasted on the hit its card names. The marks' +20% is the one number that falls (Judgement Day and True Name from +50%): Question 1.

---

## 7. Traits (`data/traits.json`, 74)

**The budget note.** `traits.json:11-12` `budget_sp_net` 3 and `budget_note` ("+1 on a roll about 2 SP": the 2020 rule of thumb) are a note, not a price: no row has a cost (`cost` null), and nothing reads it. I recommend keeping the note and striking its "+1 on a roll" clause: with Margins, a +1 is worth more than it was. **No trait was priced by the withdrawn budget rule** (`rules.json balance` tiers, removed by rules 1.94).

Numbers that sat on the old scale (every one restated on 01's):

| Trait (line) | Number today | Why it is on the old scale | Restated (PROVISIONAL) |
| --- | --- | --- | --- |
| factory_made (1696) | Field Repair heals you 10 HP a point of Improvisation (`hp_per_point`) | a flat HP number | **6 a point** (01 T2b x0.6), on the heal column by 01's rule that a heal reads `mend` whatever its profile (01 3.1): *a point mends the same share of a bar at any level* |
| drone_handler (3409) | the drone 30 HP and repair 10 a mastery point, typed in the trait op | the companion row (`enemies.json:379`, HP 30, settled by Leon, spec item 370) is typed a second time in the trait, and not levelled | the trait's typed `hp` goes (one copy); the drone reads `enemies.json companions.drone` (**18 HP, 3 armour**, 01 T2b), its HP on the column of what hits it (`damage_mult`, as a Figment's HP, 01 Built from) at its owner's level; the repair **6** a mastery point (x0.6), on the heal column |
| beast_handler (3910) | the beast 60 HP, typed | as the drone | the same: `companions.beast` (**36 HP**, 01 T2b) at its owner's level on `damage_mult` |
| oil_in_my_mind (852), oil_in_my_soul (946) | 2 less HP for each level (`hp_per_level` -2) | A5 removes the per-level HP term (01 5; T2b: "07 restates") | **max HP -6%**: *a Pain Threshold point thinner* (01 A5's card), at every level |
| crawler_blooded (3683) | a Lumeri Blessing burns you for 10 (`amounts.blessing_burn`, no profile) | a self-paid HP price, flat (01 T2: "a share of max HP") | **7% of your max HP**, true damage (`per: [{of: self:max_hp, value: 0.07}]`): 01 section 6 rule 5, today's 10 over the old reference bar 145 |
| one_shot (2153) | Breath Held +25% critical damage, "never more than double" | the x2 cap (A10) | **+1 Margin** if that shot hits (section 5) |
| the_brightest_light (154), pain_eater (428), southern_fist (197), ghost_soldier (1344), raised_by_orks (1950), augmented (3453), demolitionist (3359), moon_hunter (3856), humanity_first (2643), hollow_heart (2244) | +10% a kill (to +50%), +50% bloodied (and +50% taken when fresh), +20%, +50%, +20%, +20%, +30%, +30%, +15%, +10% | none: percentages ride any scale | KEEP the numbers; each is a part of Σ (A8), counted on plain hits (6.1). Hollow Heart names Outbursts and counts on a Release. Pain Eater's +50% taken is the defender's sum. Humanity First's and Moon Hunter's leave the +100% pool, which goes (A10) |
| gun_nut (2001), blade_recluse (372) | one extra mod slot | none | KEEP; it adds to Masterwork's (1.2) |

---

## Questions for the lead

1. **The two rules that hold the top (section 6):** a door's cash-out carries only its door's own sum and the foe's mark, and a foe carries one mark at a time (+20% for the squad, so Judgement Day and True Name go from +50% for one to +20% for the squad)? **Recommended: yes.** Under A8 alone, a level-20 Coup has room for +57% (01 T11); every perk stays felt, every trait, mod, property and boon keeps its number on the plain hits that build the counter, and the squad still sets up the big hit with its mark. The alternative (every source reaches every hit) puts every source but one perk at a point or two on the Coup, under the felt bar.

---

## Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency S1 (x0.45 against x0.6; the bayonet 7) | FIXED | every number is quoted from 01 (T2b, T9, T11): the bayonet 9, Field Repair 9, Field Surgeon 1.8, Last Charge's shield at least 9; the top is on 01's T11 |
| consistency S3 (07 5.4 against a Soldier's Defense 17) | FIXED | the top is 01's T11 (Defense 8 for the largest, 01's tier Defense); 07's own Defense is gone |
| consistency S9 (the critical's feeders) | FIXED | section 5: `crit_damage` and `crit_taken` renamed `margins` and `margins_taken`; One Shot +1 Margin, one copy; Acuity one Margin fewer at 5 and 10; ranges kept as "a critical"; Perception's line is 01's by A7 (not the critic's "one more Margin at 4, 7, 10"), and the first draft's wider-range proposal is withdrawn |
| consistency S11 (grade by map; 07's vault Celestial on 6 to 9) | FIXED | D25's split: Celestial only from map 10 (the vault, and the Boss's pick one in four); a vault list of its own; `relic_from_stage` goes. NOT taken: the critic's "the vault gives the next map's finds", because D25 rules 07's split (one over the finds, which on map 1 pays a Masterwork where the next map's finds would pay a Fine) |
| consistency S12 (07 quotes 06's hours) | FIXED | the hours column is dropped; the clock is 05's |
| consistency S13 (attribute and skill add or multiply) | NOT FIXED | ruling A4 multiplies them; 07 follows 01 |
| consistency S14 (six digits at the top) | FIXED | A8's one sum; the table redone on 01's T11 (6.3); nothing but the Break (03's Bite) reaches six digits; the first draft's Question 2 (accept six digits) is withdrawn |
| consistency M4 (old-magnitude numbers in 07's traits) | FIXED | section 7: Factory Made 6 a point on the heal column; Crawler-Blooded 7% of max HP (01's share rule); the companions read 01's rows (18, 36), one copy; Oil -6% max HP |
| consistency M9 and section 5 item 3 (Earthbreaker's handler) | FIXED | a Finisher row in `techniques.json`, paid by S3; the handler goes |
| consistency minor 6 (the boon cap) | NOT FIXED here | properties leave boon room (A9); turning the cap into slots is the Survival drafter's |
| consistency section 4 (07's primitives) | FIXED | named by the merged list: S13 `crit_range`, S14 `targets.past`, S15 `GearState.props`; the first draft's "stack kinds" is withdrawn (A8; 01's S12 in two); the extensions keep the critic's names |
| consistency M-4 (perks whose meaning changed) | FIXED | the existing re-pick, section 4.4 |
| consistency M-7 (`prop` to `props`) | FIXED | `props: [prop]` on load (1.2, What re-records) |
| player 1 (07 written to x0.45) | FIXED for 07 | as S1 |
| player 5 (two foci, one hand) | NOT FIXED | ruling E leaves it open for 0.34 (Survival gives one free focus, the camp sells a second) |
| player 15 (the boon cap) | NOT FIXED here | as consistency minor 6 |
| player 17 (damage that swings by ten) | FIXED for 07's part | one sum, no kinds (A8); a cash-out carries only its door's sum (6.1), which narrows the swing; naming the Margins and the cash-out on the damage line is the client's |

---

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| The grade (01 T9) on hit, damage, heal, shield | `rules.json rarity` rows (:1605-1659); `with_this` (`effects/triggers.ts`); `roll_mod`, `damage_mult`, `mend_mult`; the carried-modifier list (`effects/collect.ts:220`) | each row gains `effects`; the collector adds the instance's grade row; `combat.ts:580`, `:585`, `:1536` stop reading `acc` / `dmg` (one copy) |
| Grade on armour | `armOf` (`character.ts:224`), the rows' `arm` | 01's numbers only |
| The Masterwork mod slot | `extraSlots` (`perks/c.ts:211`), the extra-slot fit (`:220-235`) | rows gain `extra_slots`; `extraSlots` reads the grade; a slotless row gains `grip` at Masterwork |
| Relic and Celestial properties | `survival.json relic_props` (:224); `rollProps`, `propFits` (`run/power.ts:66-73`); `upgradeProblem` (`run/progress.ts:134-165`) | `prop` becomes `props` (S15); `cappedRarity` keeps Celestial; `runWorth` stops counting props (A9); three armour props |
| The grade by map (D25) | `rewards.ceiling` (`survival.json:147`), `stageCeiling` / `cappedRarity` (`run/rewards.ts:156-164`), `vault` (:580), `grade_up.relic_from_stage` (:195), `rewards.rarity.boss` (:144, 05's row) | the ceiling by map; new `rewards.shelf` and `vault.grades`; `stageCeiling(stage, purpose)`; `relic_from_stage` goes; validator `:2960` |
| Mods' new effects | items.json mod rows (:283-686); ops `roll_mod`, `damage_mult`, `cost_mod`, `resource`, `cancel`, `grant_action`, `deal`; gear fields with `_modes` (`rules.json:957`, `gearNum` `character.ts:1738`) | data only; the three unbuilt mods get `adjudication: engine` |
| The maker signature | modifier rows (`mod_line_arsenal`, `mod_line_smetanita`), the `variant_mods` readers (`collect.ts:217-220`, `hooks.ts:201`, `triggers.ts:277`, `gearpreview.ts:156`, `:340`) | `families.json` gains `signature`; the carried list reads it; `gearNum` reads the carried list; Arsenal's and Smetanita's `variant_mods` move to their families |
| The 13 signatures | `resource`, `mark` / `flag`, `cost_mod` (`action: move` as `fire_and_move`), `zone` (Hallow's pattern), `displace`, `cancel`, `condition`, `targets` | 13 signature rows (data); zone kind `burning_ground`; condition `toxin`; the door knocker's push moved from its grant to its row |
| Perk re-steps, scopes and MP | each perk's `effects` / `tiers` values (perks.json, lines in 4.2); the door predicates the rows already use (`damage`, `self_has`, `melee`) | numbers, scopes and texts (`{=...}` placeholders already bound) |
| Dead perks' fight halves | `condition` (`read`, `shaken`, `confused`, `hidden`), `roll_mod` (to_hit, save tn), `grant_action`, `targets`, `interrupt`, `auto_success`, `cancel`, `floor` | data on each row; `adjudication` to `engine` or `hybrid` |
| Mastered perks' changes | `resource` (guard at max), `cost_mod` with `res: shadow`, the Finisher rows (`techniques.json`) with S3's cash-out, Glimmer's order site (`figment_order`), Outburst stage | data; Earthbreaker's handler (`perks/a.ts`) goes for a Finisher row |
| Margins feeders | the stats `crit_damage`, `crit_taken` (`effects/stats.ts:42`); `critMin` on `attack_roll` (`combat.ts:1644`); the `crit` predicate; `stat_mod` with `context` | renamed `margins`, `margins_taken` (same readers, read by S1); One Shot's handler's `critBonus` goes; Acuity's two rows |
| The sum (A8) and its scope | `stackDamage` (`effects/output.ts:131`), 01's S12 (two kinds); `damage_mult` (`effects/triggers.ts:404`) | a term's `cash` field read on a cash-out (with S3); `VS_CAP` (`output.ts:129`) goes (01); `damage_vs` becomes a `damage_mult` term |
| The marks | `conditions.json` rows (`marked` :521); `condition` op; `damage_mult` / `roll_mod` with `target_has` | rows gain `slot: "mark"`; five new mark rows (Footnote, Fed, Named, Closed, Judgement) |
| Traits restated | amounts blocks (`per self:max_hp`), `levelled()` for companions (`data.ts:117`), `stat_mult hp_max`, 01's heal-column rule | data; the drone's and beast's typed HP leave the trait op |

## Needs a new primitive

Names from critic-consistency's merged list (its section 4) where one exists. General pieces only.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S13. `crit_range`** | one row in `rules.json weapons_rules.gear_fields` (`combine: max`, `default: 0`), read once at the attack roll (`critMin = 20 - crit_range` before the items speak); the weapon op `aimed_crit_min` becomes `crit_range` with `crit_range_modes: [aimed]` (a generalisation) | `critMin` is set only by hook code, the technique numbers and one weapon op limited to Aimed Shots |
| **S14. `targets.past`** | a bool on a `line` set: the units on the line beyond the event's target | a line set runs from its centre and includes everything on it; nothing selects "past the struck unit" |
| **S15. `GearState.props`** | the list replaces `prop`, with a load migration; `gearProps` reads the list | a Celestial holds two properties; the saved shape holds one |
| **A condition `slot`** | a word on condition rows (`slot: "mark"`): a condition of a filled slot replaces the one there, in the one place a condition is put on (the `condition` op's apply) | `stacks: false` refuses a second copy of the same condition only; nothing makes two different conditions exclusive |
| Extension of 01's **S12** and **S3**: a term's `cash` | a Σ term carries `cash` (default from its source: a door's own or a mark); `stackDamage` keeps only `cash` terms when the event's S3 count is over its door row's least | 01's S12 adds every term; nothing tells a cash-out from a plain hit outside the Body's technique groups |
| Extension of **S1**: two stat lines | `crit_damage` renamed `margins` (Margins added to a hit that lands) and `crit_taken` renamed `margins_taken` (Margins removed from a hit on you); read by S1's judge | renames of two existing stats, so the closed list does not grow |

Extensions of pieces that nearly do it (the critic's names): `stageCeiling(stage, purpose)` (finds, shelf, vault); `forge_fit_rate`; `with_this` on worn armour; `FITS` learns `armour`; `extraSlots` reads the grade; `gearNum` reads the carried list; `families.json` gains `signature`.

## What re-records

| What | Why it moves |
| --- | --- |
| `test/golden/` damage tables (all 14 `golden-damage*`: builds, magic, perks, techniques, traits, classes) | the grade multiplies damage and heals; perks re-stepped and scoped; Margins in place of the critical; the target cap goes; the sum and its cash-out scope; the marks; the suppressor's and the weighted head's flat numbers become shares |
| `golden-costs*` and `costs-*.json` | mod costs (extended magazine reload +1, foregrip and wrapped grip swap +1, the Sigil magazine's glyph, the compensator), the signatures' AP cuts (Legion, rotary, thrown), Vanishing Act's Shadow cost, the perks' MP on 01's pool |
| `golden-itemops`, `golden-mods` | the grade as a carried row; signatures moved from `variant_mods` to families; new modifier rows; mods' new effects |
| `golden-conditions` | the new `toxin` row; the five mark rows and the mark slot; Read, Shaken and Confused put on by the perks' fight halves |
| `golden-rules` | Margins on criticals; `crit_range`; Acuity's `margins_taken`; Earthbreaker as a Finisher row; the door knocker's push from its row |
| `test/golden/replays.json` (replay guard) | every seeded fight with a graded weapon, a mod, a mark or a perk on a re-stepped number |
| `test/old-save.test.ts` and fixtures | `prop` to `props` (a new fixture beside the three); the perks' re-pick for changed meanings |
| `survival-*.test.ts` (rewards, vault, shop, Forge, stage), `run/power` tests | the ceiling by map, the shelf, the vault list, Celestial finds from map 10, `relic_from_stage` gone, properties out of boon room, the ADCorp fee |
| `items-b0.test.ts`, `follow-strike.test.ts` | the signatures' new home (family rows) |
| `test/balance/*` measures | read again, never fitted (rules 1.94) |
| `tools/validate.py` | Celestial in `ceiling` and `vault.grades`, not in `shelf`; rarity rows' `effects`; `families.json signature`; the new gear field; condition `slot`; a term's `cash` |
| `tools/check_spec_tables.py` and the spec's rarity table (`PHC-Core-Rules-v1.0.md:676-682`), perk and trait texts in the spec | the spec first, then data |
| text-number guard (`tools/text_numbers.json`) | new and changed texts bind their numbers; no new bare digits |
| `apps/web/src/narrator/faith-context.test.ts` cost cap | longer perk and mod texts in the Narrator's prompt |
| `apps/web` and `e2e` suites that read a grade's card, a mod's line, a perk's number or the damage line | displayed numbers change; the critical's label becomes Margins |
