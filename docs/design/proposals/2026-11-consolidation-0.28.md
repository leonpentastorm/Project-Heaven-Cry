# Consolidation pass: release 0.28.0 (CLAUDE.md "No rebuild, ever again", rule 4)

15 Nov 2026. Range `4836bd51..f1bc51f8` (the 0.28 merge; `main` at `1b14fdcb` has no code change after it, so the line numbers below hold on `main`). I read the diff of `docs/ENGINE-HOOKS.md`, all of `packages/engine/src`, the new and changed data (`data/recipes.json`, `data/modes.json`, `data/survival.json`, `data/items.json`, `data/loot_tables.json`, `data/rules.json`), the new and changed tests, and the client's run screens, panels and sheet (`apps/web/src/game/*`, `apps/web/src/screens/main.js`, `shared.js`). I checked each finding against the code around it, and dropped anything I could not confirm. Nothing in the repo was changed.

**Verdict: 3 must-fix, 10 should-fix, 12 notes.** No lint baseline grew, and no closed list (trigger, predicate, op, hook, resource, stat, cost site) gained an entry. The main risk is the catalogue: it cannot see the pack and making primitives 0.28 added. The next update (weapon mods as rewards, fitting at the Forge) will touch exactly those primitives: grants into the pack, reward tables keyed by node kind, priced goods.

Severity: **must-fix** = fix before building on it (the next update builds on it directly); **should-fix** = a defect under rules 2 and 3, fix in the consolidation commit; **note** = record it, or fix when the code is next touched.

## Must-fix before building on it

### M1. The catalogue can't see 0.28's primitives (a)(g)
`tools/engine_catalog.py:393-423` (`PRIMITIVE_FILES`) does not scan `containers.ts`, `recipes.ts`, the pack and hold section of `character.ts`, or `run/shop.ts`. So `docs/ENGINE-HOOKS.md` lists none of `packTake`, `packAdd`, `lootToPack`, `LOOT_QTY_MAX`, `packKindOf`, `holds` / `HoldSpec` (and its new `door: 'any'`), `isFocusId`, `RECIPES` / `makeNow` / `makeProblem` / `makeView`, `lineGoods`, `sellValue` or `materialsView`. Grep shows none of these names in the catalogue. Its count went from 489 to 490 primitive exports: only `runFoeDrops` was added. The catalogue is the page a builder must read "before you build". As it stands, the next builder can't find the one take, the one line kind or the one converter, and would write a second copy of each.
**Fix:** add rows to `PRIMITIVE_FILES`: `containers.ts` (all), `recipes.ts` (all), `character.ts` with a name list (`packKindOf, holds, HoldSpec, isFocusId, FOCUS_DOORS, inHands, packOf, magsOf, roundsOf`), and `run/shop.ts` with `['lineGoods', 'sellValue', 'linePrice', 'counterLines']`. Then regenerate. In the same edit, update the `self_holds` predicate's line (`effects/triggers.ts:198`), which does not mention `door: any` (see N7).

### M2. Four ways of putting goods into a character, and the Materials pick skips counts (a)
The same loop appears three times: `for (const it of its) if (!intoCounts(c, it)) packAdd(pack, it)` at `run/loadout.ts:83`, `run/shop.ts:212`, and the new `recipes.ts:73`. A fourth path, the new `run/pick` `'materials'` branch at `game.ts:3198-3199`, uses only `packAdd`. It never asks `intoCounts`. So if `rewards.materials.items` ever names a counted item (a stim, an Essence), the pick puts it in the pack as a line, while the shop, the camp and making put the same thing on `c.stims` / `c.essence`. Weapon mods as a reward will be a fifth grant site.
**Fix:** one `grantGoods(c: Character, pack: PackItem[], its: PackItem[])` in `containers.ts` (counts first, else `packAdd`). The four sites, and the coming mod reward, call it.

### M3. "The gate reads the Elite's row" is written five times in `run/rewards.ts` (b)(a)
`rewards.ts:29` (`mult`), `:38` (`packCount`), `:128` (`offerSize`, new), `:133` (`materialsCard`, new), and `:159` (the rarity table: gate or vault_guard reads elite, cache or vault reads fight). Each one types node kinds and decides which data row a kind reads. 0.28 added two of them. A reward table by node kind is exactly what mods as rewards will add next.
**Fix:** one `rowKind(k, table)` in `rewards.ts`, fed by a data alias in `survival.json` (for example `rewards.reads: {"gate": "elite", "vault_guard": "elite", "cache": "fight", "vault": "fight"}`). Every table lookup goes through it, and no kind is named in the lookups.

## Should-fix

### S1. `holds` door `any` has its own copy of `carries` / `inHands` (a)
`character.ts:837` builds its own list (`[c.weapon, c.offHand?.id, ...packOf(c)...]`, filtered by `qty > 0`). That is the body of `carries` (`character.ts:824`), and the hand branch repeats `:841`.
**Fix:** `const ids = o.door === 'any' ? ALL_FOCUS_IDS : …`, where `ALL_FOCUS_IDS = Object.values(FOCUS_IDS).flat()`, then fall through to the existing two lines. `isFocusId` can then be `ALL_FOCUS_IDS.includes(id)`.

### S2. `runMusic` works out "a place is open" by itself (a)(b)
`music.ts:69`: `open = r.state === 'shop' || (r.state === 'map' && r.visit?.node === r.at && r.visit.kind !== 'shop')`. This is `placeOpen` (`run/placeview.ts:47`) written again without `PLACE_KINDS`, and it types the node kind `'shop'`.
**Fix:** `open = r.state === 'shop' || placeOpen(g)`.

### S3. `LOOT_QTY_MAX` moved to data, but three literal 20s remain (c)
The data note says `qty_max` is "the pack's quantity cap, a literal in lootToPack before". The same cap is still typed in three places: `game.ts:1099` (`giveLoot`, the Narrator's loot: for ammo it then also goes through `lootToPack`), `world.ts:333` (`cleanItems`, a cache's loot entries) and `game.ts:3582` (`sbGive`, the Proving Ground's give).
**Fix:** `LOOT_QTY_MAX` in all three.

### S4. The standard core is still a hand-built pack line in five places (b)(a)
0.28 touched each of these to add `packKindOf('standard_core')`, but kept the hand-built literal: `classes/k.ts:589`, `faith.ts:1124`, `faith.ts:1607`, `magic.ts:191` and `game.ts:3557`. `k.ts` and `magic.ts` also type the name (`'Standard mana core'`) instead of reading `ITEM[...].name`. The id itself is also typed at `rewards.ts:73` and `shop.ts:72`. Cores are a resource, so naming the core item is defensible as a neutral fallback. Building its line five times is not.
**Fix:** one exported `CORE_ITEM` (`magic.ts`, beside `CORE_CHARGE`). Every site becomes `packAdd(pack, ...lootToPack({ item: CORE_ITEM, qty: n }))`, or `grantGoods` from M2.

### S5. Three "is it a gun" tests, and the new drops use the loosest one (a)
`run/rewards.ts:47` `isGun` (magazine, ammo, not thrown) counts bows and crossbows. `character.ts:507` `isGunId` excludes bows and melee. `perks/c.ts:43` has a third version. The new `runFoeDrops` (`rewards.ts:141`) uses `rewards.ts`'s, so a foe with a recurve bow, longbow, crossbow or repeating crossbow would drop gunpowder and casings. No foe wields a bow in today's data (checked `data/*.json`), so this is latent. The test copies the rule a fourth time (`survival-materials.test.ts:81`).
**Fix:** `runFoeDrops` and `rewards.ts`'s ammo pack read `isGunId`. If the pack must count bows, that is its own named rule (`firesAmmo`). The test reads the engine's test, not its own.

### S6. The client reads `data/modes.json` beside the engine's `MODES` (d)(a)
`apps/web/src/game/panels.ts:7, 15` import the raw JSON for `panel_names`, `proving_ground.panels` and each item's `hides`, while `panels` comes from the engine's `ModeDef`. So the file has two readers, and `ModeDef` (`run/state.ts`) lacks `hides`. `panels.ts:26` also types `'campaign'` as the fallback mode.
**Fix:** add `hides: string[]` to `ModeDef`, and export `PANEL_NAMES`, `PROVING_GROUND_PANELS` and a `storyMode` (`OLD_SAVE_PLAY` is already "the campaign") from `run/state.ts`. `panels.ts` then imports only from `@engine`.

### S7. The sheet decides the camp's gear lock in its own words (d)
`screens/main.js:509-510` (new in 0.28): `atCamp = g.run.state === 'loadout'`, with its own refusal text: "At the camp, your gear comes from the loadout." The reducer's rule is `campGearProblem` (`game.ts:3141`, not exported), and its words differ: "At the camp, change X's gear in the loadout." `makeView` (`recipes.ts:435`) checks `run.state === 'loadout'` a third time.
**Fix:** export the gate as a view (`gearLockWhy(g, charId): string | null`, the reducer's words, covering the fight too). Have `main.js` and `makeView` read it, and extend `boundary.test.ts` to `screens/main.js` for this string.

### S8. The sheet names the Essence's item id and builds a pack line to price it (b)(d)
`screens/main.js:24` (new) calls `sellValue({ id: 'eoe', item: 'essence_of_experience', qty: 1 }, 1)`. `:502` (older) builds the Essence pack row with the same id. 0.28 also set the Essence to `stock: false` (`items.json`), so `priceOf` is null and the note always reads "Can't be sold". If that is intended, the row should say so from the engine, not from a fake line.
**Fix:** the engine's pack view (`meBlock`, or a sheet view) gives the counted lines (Essence, stims) with their sell note. The client names no item.

### S9. Texts that copy the recipes and the Materials card (c)
`RunScreen.tsx:52`'s hover text names the ammo maker, gunpowder, casings, mana residue and what each makes. `survival.json tips.fight` lists "gunpowder, casings, mana residue". Both copy `recipes.json` and `rewards.materials.items`, so they go stale the day a material changes.
**Fix:** the tip is built from `RECIPES` (the tool names and `does`) and `materialsView`'s line names. The node tip says "the materials", and the engine fills in the names, as it already does for XP and credits.

### S10. An always-on balance guard walks the pay by hand (e)
`test/balance/survival-run-levels.test.ts:16-17, 27, 30`: "THE GUARD (always on)" calls `nodeXp` directly, with its own list of which kinds pay (`PAID = ['fight','elite','gate','cache']`), its own gate mapping and its own Boss addition. It does not go through `runFightOver`, which is what grants XP (the `xp_grant` hook and any modifiers). It is a guard the suite enforces, not just an opt-in measure.
**Fix:** keep the table opt-in, and make the guard either replay routes through the reducer (`Rec` / `apply`, as `survival-run.test.ts` does), or read the paid kinds from the engine (export `PAY_KINDS` from `rewards.ts`) so the list is not typed twice.

## Notes

- **N1** `packTake` doubles as a counter (`n = 0`), and `recipes.ts:38` (`hasOf`) copies the whole pack only to count. Add `packCount(pack, id)` next to `packTake`, using the same `ofId`.
- **N2** `packTake`'s `ofId` (`containers.ts:92`) excludes magazines, special-typed rounds and plot items. It does not exclude lines with a `rarity` or a `prop`. That is safe for materials, but it would be a trap if a recipe or the coming mod-fitting cost ever takes graded gear: it would eat a Relic copy first.
- **N3** `tools/validate.py` writes `priceOf` again in Python (`_rprice`) and types `_PACK_KINDS`. The engine test (`survival-materials.test.ts:118`) holds the same parity through the real `priceOf`, so the two copies are guarded against drift, but they must be changed together.
- **N4** `trainBar` (`run/progress.ts:241`) has `ROMAN = ['I'…'V']`, so a weapon with a sixth drill mark would read "Mark undefined". Its words are code (an acceptable view, but a list of 5 in code).
- **N5** The no-gear flag is set per unit once, at `game.ts:3383` (`runFight`). A foe-side unit added later in a run's fight would not carry `gear: false` (for example `poiToNpc`, `game.ts:2891`, or a foe's owned spawn, `owned.ts:111`, if `dropsLoot` admits it). I did not confirm a live case. A fight-level flag (as `cb.noXp`) read by `rollDeathDrops` would cover every unit.
- **N6** Survival's 12 tracks went into code: the `OstId` union and `OST` table in `music.ts`, and the loop table in `apps/web/src/game/ost.ts`. That makes 3 code edits per track. This follows the older pattern, but it is content in code (rule 2), and a new setting's map track needs code.
- **N7** `self_holds` (`effects/triggers.ts:198`) checks its value against `FOCUS_DOORS`, which does not include `'any'`. So data can use `door: any` only through recipes. That is consistent, but undocumented; covered by M1.
- **N8** The client derives two legalities that the engine already knows: `runView.ts` `canPick: owner || isHost` (older; it copies the reducer's `run/pick` rule), and `runPanels.tsx:503` works out `solo` for the shop, while `loadoutView` exports `solo`. Fix: `shopView.solo`, and a `canPick` on the offer view.
- **N9** `sellValue` (`run/shop.ts:139-141`) recomputes the magazine and round prices that `priceOf` (`credits.ts:42-46`) already computes (older).
- **N10** The road map's `at` grammar (`each`, `every N`, `from N`, `each from N`) is interpreted only in the client (`screens/shared.js:38-65`). `glossary.ts:29` prints the same rows another way. Display only, but an engine `roadMap` view would be the one reader.
- **N11** The Materials card's worth is not tied to `priceOf`. `per_credits` is a second value scale: at today's prices the card is worth 1.5 × the node's credits (C/2 gunpowder at 1, C/2 casings at 1, C/20 residue at 10), and the validator holds no parity for it (unlike recipes). That is a balance call for the lead. If it is meant to be worth C, derive the counts from `priceOf`.
- **N12** Lint baselines (f): none grew. `lint-item-ops.baseline.json`, `lint-costs` (`≤ 28`), `lint-conditions`, `lint-foundations` and `test-lint` are unchanged in the range, and all five suites pass (65 tests, run on `main`). `boundary.test.ts` gained one guard (run screens write no refusal of their own). The text-number guard's ceiling went down from 1357 to 1289.

## (g) Exports beyond the approved eight

Approved: `packTake`; the recipes module and `gear/make`; the any-focus hold form; the offer's `materials` field and its pick value; the foe-drops flag; `pack_kind`; the pack quantity cap in data; `panels` in `modes.json`. `runFoeDrops` was already ruled acceptable. Also added, none of them a closed-list entry, for the lead to rule on:

| Added | Where | Kind | Recommendation |
| --- | --- | --- | --- |
| `isFocusId` (now exported) | `character.ts:852` | helper of the any form | accept; derive from `ALL_FOCUS_IDS` (S1) |
| `RUN_MUSIC`, `runMusic` | `music.ts` | new export plus a data key (`survival.json music`) | accept after S2 |
| `TrainBar`, `RunOption.bar`, `PlaceCardV.bar` | `run/progress.ts`, `run/placeview.ts` | view | accept (N4) |
| foe faces: `EncounterFoe.portrait`, `survival.json foe_faces`, `SettingDef.vault_guard.portrait` | `run/encounter.ts` | data plus a view field | accept |
| `survivalRun.after_fight` | `run/state.ts` | data text | accept |
| `LoadoutViewV.readyWhy`, `.solo` (and the internal `boonFirst`) | `run/loadout.ts` | view (one gate, good) | accept |
| `RunNote.picks` | `run/state.ts` | view field | accept |
| `shopSays` and `visitNote` accept `kind: null` | `run/shop.ts`, `game.ts` | signature widened | accept |
| `SHRINE.rite` | `run/progress.ts` | data key (was `DEVOTION_XP.rite`) | accept |
| `makeProblem`, `makeView`, `MakeRowV`, `MakeViewV`; `materialsView`, `MaterialsCardV` | `recipes.ts`, `run/shopview.ts` | views of the approved pieces | accept |
| `LOOT_QTY_MAX` | `containers.ts` | the approved cap | accept after S3 |
| `campGearProblem` (internal) | `game.ts:3141` | a new reducer gate | export as a view (S7) |

## Order of work

M1, M2 and M3 first, in one commit: catalogue, `grantGoods`, `rowKind`. Then S1 to S5 (engine) and S6 to S9 (client) as a second commit, then S10. Prove it with `npm run check` and the golden tables; M2 and M3 must not change any recorded replay.
