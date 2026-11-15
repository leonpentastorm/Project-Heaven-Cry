# Consolidation review 0.29 (rule 4), 15 Nov 2026

Read from the code, not from the builders' reports: `git diff origin/develop...origin/wip/feature-0.29` (head `97720d23`,
the merges of P0, P1, P2, L1 to L6 and the XP fit) over `packages/engine/src`, `docs/ENGINE-HOOKS.md`, `data` and
`tools`, with the tests read where (e) asks. Line numbers are at `97720d23`. Approvals are taken from the build plan's
sections 9 and 10.

## Must-fix (before the next system is built on 0.29)

**M1. The catalogue does not list 15 of the new exports (rule 4; plan P0's "ENGINE-HOOKS lists ...").**
`tools/engine_catalog.py:423` gives `character.ts` a name list that leaves out the L2 and C11 names, and `magic.ts`,
`variants.ts`, `data.ts` and `run/shopview.ts` are not scanned. Missing from `docs/ENGINE-HOOKS.md`: `roundsIdOf`,
`plainRounds`, `specialRoundsFor`, `takeSpecialRounds`, `legacySpecialId`, `SPECIAL_ROUND_ITEM`, `SPECIAL_CALIBRES`,
`SPECIAL_REF_CALIBRE`, `CORE_CHARGE`, `coreChargeOf` (character.ts); `fluxMaxOf`, `CORE_ITEM` (magic.ts);
`expandVariants` (variants.ts); `VARIANT_MOD` (data.ts); `sheetPack` (run/shopview.ts). The next builder cannot
find them and will write a second one.

**M2. A second copy of the magazine size, and it is wrong for an off-hand gun with mods (a).** `combat.ts:520`
`unitFromCharacter` caps `offAmmo` at `WEAPON[...].magazine`, not `magazineSize(id, c.offHand.mods)`. L3 now lets a
mod be fitted to the off-hand gun, and `sbRefill` / the camp fill it to `magazineSize`: an extended magazine in the off
hand is cut back to the base magazine when the fight starts (B3: "one magazineSize in every path").

**M3. An instance's modifier list (its property, fitted mods, a variant's `variant_mods`) is read in three places
(a, rule 3).** `character.ts:924` (`handProps`, `carried`), `effects/hooks.ts:183-184` (`heldOfChar`, `baked` and
`props`), `effects/triggers.ts:229` (`madeWithUnit`). They already disagree: `handProps` drops the off hand when a
two-handed weapon fills both hands, `heldOfChar` does not, so an off-hand focus variant's `flux_max` / `core_charge`
stat item (stat answers do not pass through `with_this`) answers while `with_this` says the instance is not in a hand.
One helper (an instance's modifier ids, with the hand rule) that all three read.

**M4. The "which gun, and write its mods" rule is written twice and the carried guns are listed three ways (a,
rule 3).** `run/progress.ts:256` `setModsAt` repeats `fitMod`'s stack split and per-hand write (`character.ts:1421`);
`run/progress.ts:222` `gunAt` is a second `gearAt` (`character.ts:941`) with mods added; `run/rewards.ts:203`
`lastingFor` and `run/progress.ts:228` `modWheres` each walk main / off / pack guns themselves. Put the read and the
write beside `fitMod` in `character.ts` and have the Forge, the reward and `lastingFor` call them.

**M5. A game saved mid-fight under 0.28 loses its mods' item-op effects for that fight, with no migration (g).**
A unit's `held` is a snapshot made at fight start (`combat.ts:524`); a 0.28 unit's snapshot has no mod relics, and
the `hasMod` paths it used are gone. After the deploy the scope's +1, the suppressor's −2, the weighted head's +3, the
serrated edge's Bleed and the quick-release's 1 AP reload stop working until a gear change rebuilds `held`
(`GEAR_FRESH`, `game.ts:1918`). Fix: rebuild `held` for PC units when a combat is loaded (the `refreshClassUnits`
step, `game.ts:596`), with an old-save fixture of a fight in progress holding a modded gun.

## Should-fix (12)

1. `credits.ts:65`: a variant's `variant_grade` raises only its price; the instance keeps the grade it was given
   (Standard from loot), so it plays at Standard and sells at the higher grade's price (one decision, two answers).
2. No data names any of the 20 variants (`PICKABLE` and `GEAR_POOL` exclude them on purpose): in 0.29 they cannot be
   found in play. A call for the lead (loot rows, a shop shelf, or 0.30).
3. `recipes.ts:30` `EACH_CALIBRE_MOST = 100`, typed again at `tools/validate.py:2925` (c): one field in
   `recipes.json`.
4. `containers.ts:167` `COUNTED` names `stim_injector` and `essence_of_experience` in code (b; P0's S8): an items.json
   field (`counts_into`).
5. `run/progress.ts:235` `EXTRA_MOD = 'extra_mod'`: run code names a perk action id (b).
6. `effects/triggers.ts:210` `WEAPON_SITES = new Set(['reload'])`: which cost sites are a weapon's own is typed in the
   predicate (c); it belongs on the cost site's row.
7. A special round's name is built three times: `recipes.ts:61` (`roundsWords`), `run/loadout.ts:80` (`nameOf`),
   `gearpreview.ts:180` (a).
8. `effects/collect.ts:28` defines a private `relicRow` beside the exported `run/power.ts:43` `relicRow`, with a
   different meaning (a).
9. `character.ts:1441` `modsOn` is a new export not approved in section 9 (d); fold it into M3's helper.
10. `test/forge-mods.test.ts:152`: the mod reward is made by calling `weaponOffer` and planting `run.offers`, not by a
    won fight through the reducer (e).
11. `test/variants.test.ts:21`: the "hundredth item" is expanded by hand and written into `WEAPON` / `VARIANT_MOD`,
    not loaded from a data line (e).
12. `test/output.test.ts:73`: the melee profile is checked by calling `weaponMult`, not through an attack (e).

## (d) Additions to the closed lists, each against section 9 / 10

| Addition | Where | Approved |
| --- | --- | --- |
| `with_this` widened to fitted mods, variant modifiers, enemies (`madeWithUnit`) and the `cost` hook | effects/triggers.ts | yes (primitive 1) |
| `gearNum` and `weapons_rules.gear_fields` (recoil, magazine_pct, bands, silent, melee_damage) | character.ts, rules.json | yes (primitive 2); `melee_damage` replaces the plan's `amounts` block for the bayonet; `range_tiles` and `heat_limit` were not added |
| `recoil` weapon field, `weapons_rules.recoil` | weapons.json, rules.json | yes (primitive 3); `no_recoil` and the Emplaced `stat_mult` retired |
| Special rounds by calibre: 8 exports, `each_calibre` recipe rows, migration | character.ts, recipes.ts, credits.ts | yes (primitive 5) |
| `run/fit_mod` `where` / `extra`, `run/unfit_mod` `where` | run/progress.ts | yes (primitive 6, section 10.B5) |
| Stats `flux_max`, `core_charge`; `fluxMaxOf`, `coreChargeOf` | effects/stats.ts, magic.ts, character.ts | yes (primitive 4, L4 only) |
| Variants loader `expandVariants`, `VARIANT_MOD` | variants.ts, data.ts | yes (lane L4) |
| `TechDef.needs.stuck` (Pull Out) | physical/types.ts | yes (10.B2) |
| Output profile `melee`, shape `struck`, weapon `phys.profile` | rules.json, character.ts | yes (10.B1); `struck` is read only by a test |
| `Unit.offMods` | combat.ts | yes (10.B5) |
| P0: `grantGoods`, `rowKind`, `PAY_KINDS`, `gearLockWhy`, `countedLines`, `sheetPack`, `recipesWords`, `CORE_ITEM`, `forgeStock`, `lastingFor` (moved), `run/places.ts` | | yes (1.A, A1 to A4) |
| `modsOn` | character.ts | **no** (should-fix 9) |
| View fields `RunOption.verb`, `ServiceCard.verb`, `MaterialsCardV.tip`, `ModeDef.hides` | | view fields, not a closed list |

No new trigger, op, hook, resource or cost site; one cost site retired (`reload.ap_quick_release`).

## (f) Lint baselines

None grew. `lint-item-ops.baseline.json`, `lint-patterns.json` and the other lints are unchanged; the text-number
ceiling fell from 1289 to 1285 (`tools/text_numbers.json`: the compensator, extended magazine, quick-release and scope
texts now read their fields).

## Checked and clean

`priceOf` stays the one price door (special rounds, variants, `sellValue`); `grantGoods` has every caller the plan
named plus the Forge's unfit, the core lines and the reward pick; no `mod_<id>` is left in engine code (Old School reads
the `electronic` tag); the five `rewards.reads` lookups go through `rowKind`; `FLUX_MAX` and `CORE_CHARGE` read
`rules.json`; the 0.28 special-round migration runs in `migrateCharacterItems` with its own fixture.
