# Weapon mods today (main, 0.28.0): read from code and data

Read-only pass. Every claim has a file:line; the numbers come from a scratch test that fits mods with the engine's own
`fitMod` (the function the `gear/mod` action calls) and plays the balance simulator's range fights through the
reducer (`runFight`, `test/balance/sim.ts`). Scratch files: `mods.test.ts`, `mods2.test.ts` (the one used),
`vitest.config.ts`, `cases.json`, outputs `run-crn-allin.txt`, `run-crn-normal.txt` in this folder.

**Short answer: yes, a mod can be attached today, in every mode, by anyone holding one in the pack: "Fit" on the
pack row of the character sheet (free out of a fight, 1 AP in one). In Survival the only source is the Forge, which
sells the mod into the pack at full price; the fit itself is free and done by the player afterwards. Mods are not a
reward pick and not a shop item. Nine of the thirteen weapon mods do something in the engine; four are sold and do
nothing. Every working mod is an id typed into engine code (`hasMod(..., 'mod_x')`), not data.**

---

## 1. The mods that exist

`data/items.json`, category `mod`: **19 items** = 13 weapon mods + 6 quiver enchantments. All `provisional: true`.
Every weapon mod's only effect op is `{ "op": "mod", "slot": ... }` (`data/effect_ops.json:3307`, tier `item`,
"its effect is in its text and run by the engine"): the op is a label; what each mod does is hand code.

| id (items.json line) | name | slot | price | adjudication | what the text says | where the engine runs it |
| --- | --- | --- | --- | --- | --- | --- |
| mod_red_dot (344) | Red dot sight | optic | 200 | engine | no −2 in the first band past effective range | `combat.ts:1204` opticBands (+1 band, every shot) |
| mod_scope (364) | Scope | optic | 450 | engine | Aimed: +1 to hit, one more band | `combat.ts:1204` (band, aimed only), `combat.ts:1249` (+1, aimed, inside skillBonus) |
| mod_suppressor (381) | Suppressor | muzzle | 400 | engine | shots don't reveal you while Hidden; `damage_add` −2 | `press.ts:105`, `tactics.ts:54` (silent), `combat.ts:1287` (−2 base, any non-melee) |
| mod_compensator (399) | Compensator | muzzle | 250 | engine | Recoil −1 per shot | `combat.ts:1254` (multiplies shots by 0: all recoil gone) |
| mod_extended_mag (416) | Extended magazine | magazine | 300 | engine | +50% capacity | `character.ts:1434` magazineSize (only the magazine in the gun, see 5.4) |
| mod_quick_release (433) | Quick-release magazine | magazine | 350 | engine | reload 1 AP | `combat.ts:2980` reloadAp (`costOf('reload','ap_quick_release')`) |
| mod_foregrip (450) | Foregrip | underbarrel | 150 | **narrator**, `built: false` | first burst a turn ignores Recoil | **nothing** (no code reads it) |
| mod_bayonet (468) | Bayonet | underbarrel | 120 | engine | gun melee deals `damage` 15 (Dex) | `combat.ts:1283,1287` |
| mod_underslung (486) | Underslung launcher | underbarrel | 900 | **hybrid** | holds one 40 mm round | **nothing** (no code reads it) |
| mod_serrated (503) | Serrated edge | edge | 250 | engine | melee crits cause Bleeding | `combat.ts:1439` |
| mod_weighted (520) | Weighted head | edge | 200 | engine | `damage_add` +3 | `combat.ts:1287` (melee, base) |
| mod_wrapped_grip (538) | Wrapped grip | grip | 80 | **narrator**, `built: false` | can't be Disarmed | **nothing** |
| mod_sigil_magazine (556) | Sigil-etched magazine | inscription | 600 | **hybrid** | holds one stored Sigil spell | **nothing** (the only `inscription` code is the Scribe's, `classes/i.ts:902`, unrelated) |
| ench_fire/storm/frost/stone/gale/acid (573–673) | enchantments | enchantment (quiver) | 400 each | engine | arrow riders at a stage, ×0.9 | `physical/ranged/quiver.ts:72` enchantmentOf: **data-driven** (reads `tone`, `stage`, `damage_mult`) |

The enchantments are the one family built the right way (fields read by general code). The 13 weapon mods are not.

## 2. Mod slots

- Field: `mod_slots` (string list of slot names) on each weapon row, `data/weapons.json` (e.g. `:36` service pistol
  `optic, muzzle, magazine`). A mod's own field `mod_slot` names its slot. Quiver: `items.json:335` `["enchantment"]`.
- One mod per slot name (`fitMod`, `character.ts:1329-1339`). No limit by class or grade; grade does nothing to slots.
- Slots by weapon (selection): service rifle, Decrkm SMG, battle rifle: optic/muzzle/magazine/underbarrel; bullpup,
  marksman rifle, magistrate, autopistol, PDW: optic/muzzle/magazine; long rifle, lever carbine: optic/muzzle;
  every revolver, heavy (LMG, rotary, Blackpoint, thumper, breacher), bow, crossbow, core rifle, censer gun: optic only;
  auto-shotgun: optic/magazine/underbarrel; scattergun: optic/underbarrel; coach gun, sawn-off, parlour pistol,
  flamer, knuckledusters, servo fist, thrown: none; blades: edge/grip; fists: grip; spellslinger pistol:
  optic/magazine/inscription; the mana melee foci: edge and/or grip.
- Extra slots: a second slot of a type the weapon already has, from Gun Nut (trait, every gun), Blade Recluse, Overhaul
  (`perks/c.ts:350-356` extraSlots). Fitted through a separate action `extra_mod` (`perks/c.ts:384-390`, out of a fight,
  0 AP), not through `gear/mod`. The same mod twice is refused (`perks/c.ts:373`); two different mods of one slot
  (red dot + scope, extended + quick-release) are allowed.

## 3. How a mod gets into a weapon

**The engine.** One function, `fitMod(c, idx)` (`character.ts:1329`): the pack entry must be category `mod`, the
main-hand weapon must have its slot, the equip ban (Old School: no red dot) is asked; a mod already in that slot comes
off **into the pack**; the new one goes on `c.weaponState.mods`. Main hand only (an off-hand gun cannot be modded).
Callers:
- `gear/mod` action (`game.ts:362` type, `game.ts:1039-1047`): out of a fight, free, any phase including a Survival run.
  In a fight it is forwarded (`gearForward`, `game.ts:1907-1911`) to `combat/swap` with `mod` (`game.ts:1900`) →
  `gearInFight` op `mod` (`game.ts:1960`) at the gear-change price, `rules.json:593` `fit_mod` 1 AP.
- Proving Ground: `sandbox/equip` to `'mod'` (`game.ts:3103, 3600-3606, 4011, 4031, 4208`).
- Quivers: `gear/mod` with `quiver` → `fitQuiverMod` (`character.ts:1422`), out of a fight only (`game.ts:1043`).

**The client.** Character sheet pack row "Fit" → `gear/mod` (`apps/web/src/screens/main.js:523`); the fight's backpack
"Fit" → `combat/swap { mod }` (`apps/web/src/game/backpack.ts:83`); the Proving Ground's "Fit to weapon"
(`apps/web/src/game/sandbox.tsx:620`); the action pickers (`apps/web/src/game/actionPickers.ts:78`).

**Removal / moving.** There is no "take a mod off" action. The only way out is to fit another mod of the same slot
(the old one drops into the pack). A mod cannot be moved to another weapon except by that swap. It travels with the
weapon instance (stow, pack, drop, give keep `mods`: `character.ts:147-149, 883`).

**Survival.**
- The Forge rolls 4 lines (`survival.json` `forge.slots` 4, `run/progress.ts:193-201` forgeStock): first from what the
  party could use (`lastingFor`, `progress.ts:181-191`: a mod for a slot the **main-hand** weapon has free, an
  enchantment if someone has an empty quiver, better worn armour), then any mod or armour piece. Shared stock, first
  buyer takes it (`forgeProblem`, `progress.ts:203-208`).
- Buying (`run/forge`, `progress.ts:371-377`): pays `priceOf(id)` (the full `price_credits`; the Forge's 0.8 factor
  is for the grade step only, `survival.json` `grade_up.places`), and puts the mod **into the pack**. It does not
  attach it. The player then presses Fit on the sheet: free, and to whatever is in the main hand at that moment.
- No reward source: the weapon pick pool is weapons and foci only (`run/rewards.ts:100` PICKABLE); Survival foes drop
  materials only (`rewards.ts:140-143` runFoeDrops, `gear: false`); the shop's rolled items are
  `consumable, tool, light, shield, food` (`survival.json` shop.stock.item_categories), never `mod`.
- Selling: a pack mod sells at 25% (`survival.json:565` sell_rate; `run/shop.ts:136-143` sellValue); a weapon sells
  with its fitted mods priced in (`credits.ts:41-53` priceOf with `mods`).

**Campaign / story fights.** Loot: a Boss's notable table (`data/loot_tables.json` items[4] `notable`) can drop
mod_scope, mod_suppressor, mod_extended_mag, mod_quick_release (`loot.ts:171-173`). No shop sells mods outside the
Forge. **Creation:** no kit (rules 1.52); the mode loadouts (`run/loadout.ts`, `loadout.ts`) give no mods.
**Proving Ground:** any mod can be given and fitted.

## 4. Are the effects applied in a fight?

Deterministic preview trace, same fight, the unit built through `fitMod` (`mods2.test.ts`, `MODS_PREVIEW=1`), service
rifle at level 6:

| case | result |
| --- | --- |
| no mod, 4 tiles, shot | 65%, damage 76.5 |
| suppressor, 4 tiles | 65%, damage **71.4** (−2 base × the multipliers: −5.1) |
| no mod, 4th shot of the turn | toHit 4, "recoil −1" |
| compensator, 4th shot | toHit 5, no recoil term |
| extended magazine | unit.ammo **36** (24 base) |
| scope, aimed | toHit 9 vs 8; the +1 is **listed under "Suppressing Fire"** (the rifle's weapon-skill name, see 5.6) |
| red dot, Decrkm SMG at 12 tiles | 65% vs 55% (the −2 range term is gone) |
| red dot, hand cannon at 12 tiles | 65% vs 55% |
| red dot / scope, service rifle at 20 or 40 tiles | refused, "You can't see it." (sight 12 < range 16) |
| bayonet, rifle melee | damage 51.6 vs 34.4 (fists) |
| weighted head, war axe | damage 148.0 vs 137.6 |
| foregrip, SMG 4th shot | identical to no mod (recoil −1): **no effect** |
| underslung launcher | identical to no mod: **no effect** |

So the nine engine mods work; the four `narrator`/`hybrid` ones do nothing.

## 5. Broken or exploitable

1. **Four mods are sold and do nothing** (foregrip, wrapped grip, underslung launcher, sigil-etched magazine). The
   Forge stocks them (forgeStock filters only on `priceOf != null`, `progress.ts:197`; `built: false` is not read)
   and lists them for a free slot (`progress.ts:187`). In Survival there is no Narrator, so 80 to 900 credits buy
   nothing. Their op `mod` is not "unrecognised" (it is a known item op), so the fallback-to-Narrator rule never fires
   either: it is a silent no-op. The underslung launcher (900) is the dearest mod in the game.
2. **Content typed into code** (the No-rebuild rule 2): `mod_red_dot`, `mod_scope`, `mod_compensator`,
   `mod_extended_mag`, `mod_quick_release`, `mod_bayonet`, `mod_weighted`, `mod_suppressor`, `mod_serrated` are named
   in `combat.ts:1204, 1249, 1254, 1283, 1287, 1439, 2980`, `character.ts:1434`, `press.ts:105`, `tactics.ts:54`,
   and Old School in `character.ts:1246`, `perks/c.ts:523`. The numbers that are data (`damage`, `damage_add`) are
   read through `modNum` with typed fallbacks (`combat.ts:1270, 1287`: 15, 3, −2). A 14th mod needs code.
3. **The compensator removes all recoil**, not 1 a shot (`combat.ts:1254`: shots × 0). In the measured builds it is
   worth exactly 0 (Dexterity relief floor(Dex/2) already covers the 2 to 3 shots of a turn); see section 6.
4. **The extended magazine extends only the magazine in the gun.** Spare magazines stay at the base size: filling one
   caps at `w.magazine` (`combat.ts:2465` loadMagazine), the rest's refill sizes them by `magazineSize(it.weapon)` with
   no mods (`faith.ts:1605`, `game.ts:3553`), a companion's reload sets `w.magazine` (`combat.ts:2322`), and the pack
   row shows `wd.magazine` (`backpack.ts:89`). So "+50% capacity" is +50% of the first magazine of a fight.
5. **Red dot and scope do nothing on most rifles** in practice: their effective range (14 to 30) is past the unit's
   sight (12), so the second band is rarely reachable without shared sight. They work on 8-range guns (pistols,
   revolvers, SMGs, shotguns), which are exactly the ones that gain (section 6).
6. **The scope's +1 is mislabelled**: it is added inside `skillBonus` (`combat.ts:1248-1249`), whose term carries the
   weapon skill's name ("Suppressing Fire"), so the transparent-dice breakdown names the wrong source. It also needs
   `useW === w`.
7. **The suppressor's −2 applies to every non-melee attack** of the unit (`combat.ts:1287`: `!melee`), whatever the
   attack's weapon is. Not proven for a thrown grenade (the trace's "thrown" mode with a rifle in hand is not a real
   throw); worth one real-path check.
8. **No removal action**; a mod can only be swapped out. An off-hand gun can't be modded, and a paired attack runs
   with "no mods" (`combat.ts` withOffHand: `mods` swapped out), so mods on a gun moved to the off hand are inert.
9. **The Forge's want-list reads the main hand only** (`progress.ts:182`): a mod for a carried second gun is never
   "wanted", though Fit would accept it after a swap.
10. Not found: no buy/sell loop (buy 100%, sell 25%; mods priced into a weapon's sale at 25% too); no stacking of the
    same mod (one per slot; `perks/c.ts:373` refuses a duplicate in the extra slot); no mod on a wrong slot type
    (`fitMod` checks `mod_slots`); a mod does not survive selling the weapon (it is sold with it); repair ignores mods
    (`survival.json` repair: "no mods"). Two different mods of one slot (Gun Nut) add their effects (red dot + scope,
    extended + quick-release), each as written; none stacks numerically with itself.
11. Side observation, not a mod bug: giving the build the Gun Nut trait **with no mods** moved the measured damage by
    −10% (service rifle, bullpup) to **+38% / +61%** (CCEC marksman rifle, L6 / L12). Something in Gun Nut (0 AP
    jam clearing, Collector) is worth far more than its mod slot on that rifle. Worth a look in the balance pass.

## 6. Measurement (rules 1.18: the best gun ~145% of the plain rifle; band ±12% on the mean = 162)

Method: `opt_gun` build (Marksman, Masterwork, the gun techniques), mods fitted by `fitMod` in the build's `tweak`;
32 range fights a cell, 8 rounds, the optimised policy; the same seeds for every case (common random numbers, so a
mod that changes nothing gives the identical number). 100% = the plain rifle (`plain_gun`, normal share, same level,
same seeds). The extended magazine's gun starts with the long magazine loaded; spares are base size (as in play).
Gun Nut rows have the trait added to the build; compare them with the Gun Nut bare row. Level 6 / level 12, all in.

Best legal combination per gun (all in; % of the plain rifle; in brackets the change against the same gun bare):

| gun | bare | best combo | with it |
| --- | --- | --- | --- |
| core rifle | 165 / 145 | red dot (or scope) | 165 / 148 (0 / +2%) |
| service rifle | 151 / 146 | red dot + comp + extended | 154 / 142 (+2 / −3%) |
| bullpup | 147 / 137 | optic + comp + extended | 155 / 140 (+5 / +2%) |
| battle rifle | 152 / 126 | any | 152 / 126 (0, extended −3 to −4%) |
| long rifle | 147 / 136 | scope + comp | 147 / 136 (0) |
| Blackpoint 700 | 147 / 135 | any optic | 147 / 135 (0) |
| **Frontier hand cannon** | 136 / 137 | **red dot** | **151 / 156 (+11 / +14%)** |
| hand cannon, Gun Nut | 150 / 140 (trait alone) | red dot + scope | **161 / 160** |
| **Brigade auto-shotgun** | 97 / 86 | **red dot + extended** | **150 / 111 (+54 / +29%)** |
| CCEC marksman rifle | 100 / 74 | optic + comp + extended | 113 / 86 (+14 / +16%) |
| Decrkm SMG | 82 / 75 | red dot + comp + extended | 97 / 90 (+18 / +19%) |
| Legion PDW | 88 / 80 | red dot + comp + extended or QR | 100 / 94 (+15 / +18%) |
| Magistrate pistol | 64 / 112 | red dot + comp + extended / QR | 87 / 128 (+36 / +15%) |
| crossbow | 125 / 124 | any optic | 125 / 125 (0 / +1%) |
| LMG | 111 / 102 | any optic | 111 / 102 (0) |
| lever carbine | 127 / 114 | any | 127 / 114 (0) |

Normal share (L6 / L12): hand cannon + red dot 118 / 145 (+15 / +12%); auto-shotgun + red dot + extended 96 / 120
(+18 / +35%); SMG full set 78 / 80 (+20 / +22%); service rifle and long rifle: +0 to +1%.

Which pass the ceiling:
- **Over 145 because of a mod:** the hand cannon with a red dot (151 L6, 156 L12: +4% and +8% over the line, inside
  the 162 band); with Gun Nut and both optics **161 / 160** (the worst: +11% over 145, at the band's edge); the
  auto-shotgun with red dot + extended magazine at L6 **150** (+3% over; from 97, the biggest jump any mod gives).
- **Over 145 without any mod** (not a mod problem): core rifle 165 at L6, service rifle 151, battle rifle 152, long
  rifle 147, Blackpoint 147, bullpup 147 in this sample (the doc's all-in figures, 2026-11-balance-2.0.md section 2.1,
  give 147 to 159 for the same guns on its four rotations).
- Nothing passes 162 on these seeds. Rifles gain 0 to 5% (the mods mostly do nothing for them); the gains go to the
  8-range guns (red dot) and the low-capacity magazine guns (extended).
Caveat: the range target never moves and the policy shoots from where it stands, so the red dot's worth on the short
guns is the sim's distance; a player who closes in gets less.

## 7. What the engine already has, and what would be new

Already there (names from `docs/ENGINE-HOOKS.md` and the run code):
- **The data shape for a mod's effect:** the Relic property machinery. A gear instance's `prop` is held as a relic item
  (`effects/hooks.ts:174-180` heldOfChar) and acts through item ops filtered by the predicate **`with_this`**
  (`effects/triggers.ts:223`; ENGINE-HOOKS line 125), e.g. `prop.keen` `damage_mult` on `dealing`, `prop.true`
  `roll_mod` on `attack`, `prop.quick` `cost_mod` on `reload` (`survival.json` relic_props). Most mods map onto those
  ops: scope `roll_mod` on `to_hit` (aimed), quick-release `cost_mod` on `reload` (set 1), suppressor/weighted
  `damage_mod` on `dealing`, serrated a `condition` op on a crit hit, compensator a recoil number (the balance-2.0 doc
  section 3 already asks for a `recoil` field and "the compensator read as a number instead of `hasMod`").
- **A mod as a reward pick:** `weaponOffer` / `RunWeapon` (`run/rewards.ts:143-160`; ENGINE-HOOKS line 1096) builds a
  pick from a pool list `PICKABLE` (`rewards.ts:100`) by `priceOf` within `priceBand`; the quiver is already slipped in
  as a non-weapon pick (`rewards.ts:151-152`). Adding mods is a pool/data change plus `lootToPack` (already used by
  `run/forge`). Survival's foe drop door (`runFoeDrops`, `survival.json drops`) could also carry a mod line as data.
- **A paid attach at the Forge:** `registerShopService` / `ShopService` / `ServiceCard` (`run/shop.ts:146-159`), the
  seam the grade step and repair use; `payCredits` / `cantPay` (`progress.ts`); `priceOf` for the one price;
  `fitMod` for the fit itself; `forgeStock` / `lastingFor` for what is offered. A "fit for N credits" card is a
  service registered on that seam calling `fitMod`.

Would be new primitives (for the lead to approve, none built):
1. Item ops on a fitted mod: the mod's `effects` held like a Relic `prop` and gated by `with_this` (today only one
   `prop` per instance is held; `mods` would need the same reading in `heldOfChar`). This is a widening of an
   existing reading, not a new op, but it touches `heldOfChar` and the predicate.
2. Range bands an item adds (the red dot / scope band): there is `bandsLess` on the attack_preview hook context
   (`combat.ts:1214, 1240`), set by items and techniques today in code; an op or field to set it from data would be
   new.
3. Magazine size from data (an op or a `magazine_mult` field read by `magazineSize`, and the spare-magazine paths
   using it).
4. Recoil as a number (`recoil` weapon field and a reduction on the mod), already listed in balance-2.0 section 3.
5. A credit price on fitting (if fitting is to cost dough): a new ShopService registration plus a refusal of the
   free `gear/mod` fit in a run (or of a fit outside a Forge), which is a rule change, not only data.
6. A "remove mod" action (none exists).
