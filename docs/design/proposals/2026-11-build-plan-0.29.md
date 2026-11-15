# Build plan: release 0.29.0, "Balance 2.0 and weapon mods"

15 Nov 2026. Read-only planning pass on `main` (0.28.0, live, `1b14fdcb`). Nothing in the repo was changed. Sources:
`docs/design/proposals/2026-11-balance-2.0.md` (the draft and Leon's twelve answers of 15 Nov), the lead's rulings in
the brief (Q7 niches, Q11 caster camp, mods join the release, consolidation first, the 0.28 leftovers),
`plan029/mods-today.md` (mods report), `plan029/2026-11-consolidation-0.28.md` (consolidation report),
`docs/ENGINE-GUIDE.md`, `docs/ENGINE-HOOKS.md`, `docs/TESTING.md`, `data/CONVENTIONS.md`, and the code it names
(`run/loadout.ts`, `run/shop.ts`, `run/progress.ts`, `run/rewards.ts`, `credits.ts`, `data/survival.json`,
`data/recipes.json`, `data/items.json`, `packages/engine/test/balance/survival-run*.ts`).

Every number here is **PROVISIONAL** unless it is Leon's own. "Leon" = his words; "Lead" = a lead ruling in the brief;
"Report" = one of the two reports above; "Draft" = the Balance 2.0 draft.

Branch: `feature/0.29` off `develop`. Version 0.29.0 at merge (all four `package.json`, a `CHANGELOG.md` entry). Nothing
goes live without Leon's word for 0.29.0.

---

## 1. Scope (one line per change, each traced)

### 1.A Consolidation first (Lead: "the consolidation report's must-fix items are done FIRST")

| # | Change | Traced to |
| --- | --- | --- |
| A1 | The catalogue scans 0.28's primitives: `containers.ts`, `recipes.ts`, `run/shop.ts`, the pack/hold names of `character.ts` (report M1), **and also** the files this release builds on that it still misses: `gearpreview.ts` (`gearPreview`, `compareGear`), the gear names of `character.ts` (`fitMod`, `magazineSize`, `setGrade`), `run/power.ts` (`relicRow`, `worthOf`, `capRoom`), `run/progress.ts` (`forgeStock`, `lastingFor`, `forgeProblem`, `gradeCards`, `repairCards`), `run/loadout.ts`; `self_holds` line names `door: any` (N7) | Report M1 (the extra files: found in this pass, `grep` shows none of those names in `docs/ENGINE-HOOKS.md`) |
| A2 | One `grantGoods(c, pack, its)` in `containers.ts` (counts first, else `packAdd`); the camp, the shop, making and the Materials pick call it; the mod reward will be its fifth caller | Report M2 |
| A3 | One `rowKind(kind, table)` in `run/rewards.ts` fed by `survival.json rewards.reads` (gate and vault_guard read elite; cache and vault read fight); the five lookups go through it | Report M3 |
| A4 | Should-fix S1 to S9 (engine S1 to S5, client S6 to S9), then S10 (the always-on XP guard through the reducer or `PAY_KINDS`) | Report S1 to S10; S7 (`gearLockWhy`) is needed by B7 below |
| A5 | Notes N1 (`packCount`), N2 (`packTake` skips graded / prop / modded lines: the Forge fee and a mod's take must not eat a Relic copy), N5 (fight-level no-gear flag) | Report N1, N2, N5: each is touched by this release |

### 1.B Weapon mods (Leon: "if so, balance them and put them in too, weapon mod can be a reward just like raw weapon. maybe at the forge you pay some dough to get them attached")

| # | Change | Traced to |
| --- | --- | --- |
| B1 | Mods become data: every working mod's behaviour moves from `hasMod(..., 'mod_x')` in code to its row in `items.json` (item ops gated by `with_this`, plus number fields read by one helper). No mod id left in engine code (Old School's ban reads a mod field `kind: "optic_dot"` or the ban list in data) | Report 5.2; CLAUDE.md "No rebuild" rule 2 |
| B2 | The compensator reads "Recoil −1" in card, spec and engine | Leon Q2 "ok"; Report 5.3 |
| B3 | The extended magazine sizes every magazine of that gun (one `magazineSize` of the gun instance in every path: load, refill, a companion's reload, the pack row) | Report 5.4 (card says +50%; engine gives it to the first magazine only) |
| B4 | The scope's +1 is its own labelled to-hit term (no longer inside the weapon skill's term) | Report 5.6; dice are transparent (CLAUDE.md UI) |
| B5 | The suppressor's −2 applies only to attacks made with the gun it is on | Report 5.7 |
| B6 | Mods act on the gun they are fitted to in either hand (paired attacks keep the off hand's mods); the Forge's want-list reads every gun carried | Report 5.8, 5.9; **Leon question 5** (no answer: built) |
| B7 | In Survival a mod is fitted, swapped or taken off **only at a Forge, for a fee**; the sheet's Fit and the fight's Fit are refused in a run with the reducer's words (one gate, `gearLockWhy`); campaign and Proving Ground unchanged | Leon "at the forge you pay some dough to get them attached"; **Leon question 1** |
| B8 | A "take it off" path (today none): a Forge service card that puts the fitted mod back in the pack, same fee | Report 5.8, 7 item 6 |
| B9 | The four dead mods: foregrip rewritten into an op that exists ("+1 to hit on Bursts and full auto with it"), wrapped grip, underslung launcher and sigil-etched magazine shelved (`stock: false`, `built: false`; never stocked, never offered, never priced); anything `built: false` is filtered by the one stock/offer door | Report 5.1; **Leon question 3** |
| B10 | A mod can be a reward: the post-fight pick offers a mod (one that fits a free slot on a gun the character carries, inside the node's price band) as **Leon question 2** rules (recommended: a third card "One mod" at Elites, the gate, Bosses and the vault's guard) | Leon "weapon mod can be a reward just like raw weapon" |
| B11 | Mods balanced under the same ceiling: the best legal mod set on each gun is measured in that gun's niche; the hand cannon (red dot, Gun Nut + two optics: 161) and the auto-shotgun (red dot + extended: +54%) are the two to fit; mod prices refitted from their measured worth | Lead ruling "mods are balanced under the same ceiling"; Report section 6 |
| B12 | Gun Nut's measured +38% / +61% on the CCEC marksman rifle with no mods is traced and fixed | Report 5.11 |

### 1.C Balance 2.0 (the draft, as Leon answered it)

| # | Change | Traced to |
| --- | --- | --- |
| C1 | **Recoil 2.0**: `recoil` a field on every weapon (default 1, bows and the core rifle 0, the big-bore and heavy guns 2), read by the one recoil formula; `no_recoil` retires into it; recoil shown on the card, compare panel, loadout, pick, sheet and hover | Leon Q1 "ok display them rightly"; Draft 3.2 |
| C2 | The two dead data levers (Emplaced `stat_mult` on recoil, Both Hands `recoil_mult`) are read by the one formula or removed | Draft 3.2 defects |
| C3 | **Weapon niches** (replaces the single 85-115% band): each weapon class has one named niche where it is the best and reaches or passes the ceiling; outside it a weapon sits over or under by its price; direct upgrades exist only at a rarer grade and cost more | Leon Q7 (both quotes); Lead ruling Q7; **Leon question 4** (the niche table) and **question 6** (what "rarer" means) |
| C4 | The measuring rows each niche needs: close range (4 tiles), cluster credit for area guns, a free hand (pistol + focus, two pistols), a Hidden opener (silence), a low-Dexterity row (recoil), Raw Power / Brain Power / Faith hands for the longbow, Spellslinger's pistol, censer gun and the mana arms, a walking target for reach | Draft 2.2, 8 step 2 |
| C5 | Weapon refit, family by family, against the niche rows | Draft 5, 8 step 7; Leon Q7 |
| C6 | Breacher tube and thumper `damage` up to their niche (area on a cluster) | Leon Q8 "ok" |
| C7 | Skirmisher 159 left | Leon Q9 "ok" |
| C8 | The healer stall gets a line: under three Soldiers a dedicated healer holds a tank up at most 6 rounds; fitted to it | Leon Q10 "ok" |
| C9 | Repair at 25% of the price | Leon Q12 "ok" |
| C10 | **Variants** (named rows: a base plus one or two modifiers from the closed list of 12 kinds; a mode-neutral `data/variants.json`; worth cap 20% of a rifle-turn; price through `priceOf`); "2 more core per reload" = more charge from each core; ten gun and ten focus variants | Leon Q3 "yes", Q4 "morecharge", Q5 "ok"; Draft 4; **Leon question 7** (this release or the next) |
| C11 | One copy of the Flux limit and of a core's charge, in data (`FLUX_MAX` and `CORE_CHARGE` beside `rules.json`) | Draft 4.2 "a defect under the one copy rule even before variants" |

### 1.D Survival dials and the 0.28 leftovers

| # | Change | Traced to |
| --- | --- | --- |
| D1 | **The fit simulator plays like a player**: makes rounds and cores from materials (`gear/make`), buys the ammo maker when it pays, sells surplus materials, uses mods through the Forge (buy, pay the fee, fit) and picks a mod reward when it beats the weapon; the run report prints materials got / made / sold, cores pressed, mod fees | Lead ruling: "must make and sell materials and use mods before any number is refitted"; START-HERE (a) |
| D2 | **The caster policy and overkill count** before any caster number: area words (SPREAD, ARC, CHAIN) when two or more foes are in the shape, stay on the glyphs, the caster buys armour like the gunner, `sim.ts` keeps dealt beside removed, `run/tally.ts` adds uncapped damage, every caster report prints both and the overkill share | Draft 6 fixes 1 to 4; Leon 14 Nov "Do NOT fix Sigil damage on the bot's numbers" |
| D3 | **Special rounds priced and made by calibre**: an armour-piercing .700 round costs 3 × a .700 round (120), not 3 × a rifle round (6); recipes make a special round of a calibre from materials worth its price | 0.28 review leftover ("special rounds made at 2 gunpowder + 2 casings fit heavy guns") |
| D4 | **The camp gives a caster fight in hand**: the camp budget stays 300; a core-burning focus (Evoker, Visualizer) comes with a starting set of cores (`loadout.focus_with`), sized by the simulator so a caster leaves camp with as many fights in hand as a gunner | Leon Q11 "300 is not enough for caster even now, they get like 3 core and notthing else"; Lead ruling Q11 |
| D5 | **XP refit**: on the most-fights route level 3 comes as the party is about to take on the first Boss (today: before the Boss on only 42% of most-fights routes); the always-on guard reads the same target | Rules 1.54 item 9 (Leon: "only get to level 3 as you are about to take on the first boss, if your whole first run you focus on taking as many fight as possible"); START-HERE (a) |
| D6 | Small parties, the supply pack's rounds against making, and the trainings: re-measured once D1 to D5 are in; changed only where a cell fails | Draft 7.2 |
| D7 | Materials card's worth tied to `priceOf` (today 1.5 × the node's credits, a second value scale) | Report N11 (a balance call: the lead's) |

### 1.E Not in 0.29 (said so, so nobody builds it)

Figments door and Rigger lines (need the Rigger's policy first, Draft 7.1); the Hymn slope (waits for the Faith
ladder); new mods beyond the 13 (the closed shape must exist first); a 13th variant kind; the shelved four mods' systems.

---

## 2. Built from

Names as in `docs/ENGINE-HOOKS.md`; names marked (A1) are real exports the catalogue does not list yet and will list
after A1 (`fitMod`, `gearPreview`, `compareGear`, `magazineSize`, `forgeStock`, `lastingFor`, `registerShopService`,
`ShopService`, `ServiceCard`, `relicRow`, `worthOf`, `RECIPES`, `makeView`, `lineGoods`, `sellValue`).

### 2.1 Mods

| Rule | Carried by |
| --- | --- |
| A fitted mod's effect acts in the fight | item ops on the mod's row: `roll_mod` (trigger `to_hit`), `damage_mod` (`dealing`), `cost_mod` (`reload`), `condition` (`hit`); run by `runTriggered` |
| Only with that gun | predicate `with_this`, widened (see 3.1) to "the instance carrying this item as a fitted mod", exactly as it reads a Relic's `prop` today through `heldOfChar` |
| Scope: +1 aimed | `roll_mod` on `to_hit`, `if: {with_this: true, mode: ["aimed"]}`, `label` "Scope" (the term is named: B4) |
| Suppressor: −2, silent | `damage_mod` on `dealing`, `if: {with_this, damage: ["weapon"]}` (B5 falls out of `with_this`); the silence: the mod field `silent` (3.2) read where `press.ts` / `tactics.ts` test the id today |
| Weighted head +3 | `damage_mod` on `dealing`, `if: {with_this, damage: ["melee"]}` |
| Serrated edge: a melee crit Bleeds | `condition` on `hit`, `if: {with_this, crit: true, mode: ["melee"]}`, `skip_save` as today's code (pin first) |
| Quick-release: reload 1 AP | `cost_mod` on `reload`, `set: 1`, `if: {with_this}` (as `prop.quick`); the `ap_quick_release` cost site retires if `golden-costs` shows no move |
| Foregrip (rewritten) | `roll_mod` on `to_hit`, `if: {with_this, mode: ["burst", "auto"]}` |
| Bayonet: the gun's melee hits for 15 (Dex) | an `amounts` block on the mod row read by the gun-melee line that reads `modNum(..., 'damage')` today (the typed fallbacks 15, 3, −2 go: "a missing block throws") |
| Compensator, extended magazine, red dot / scope band | mod number fields (3.2) read by the one recoil formula, `magazineSize` (A1), the optic band line |
| Fit, swap, remove | `fitMod` (A1), unchanged in signature; called by a Forge service |
| The Forge's attach fee | `registerShopService` / `ShopService` / `ServiceCard` (A1, the seam the grade step and repair use), `cantPay`, `payCredits`; the fee rate in `survival.json forge.fit` |
| No free fit in a run | the one gear gate `gearLockWhy` (A4, report S7), its words from data |
| What the Forge offers | `forgeStock` / `lastingFor` (A1), reading every gun carried (B6) and filtering `built: false` |
| A mod as a reward | `weaponOffer` (its pool widened by data: categories, not a code list), `RunWeapon`, `pickedItem`, `priceBand`, `cappedRarity`, `rowKind` (A3), `grantGoods` (A2) into the pack |
| Its price | `priceOf` (already prices fitted mods), `sellValue` (A1) |
| Its card | `gearPreview` / `compareGear` (A1): one line per mod from its data text |
| Its measure | the gun loop (`guns-measure.ts`), mods fitted through `fitMod` in the build's tweak (the report's method) |

### 2.2 Recoil 2.0, niches, refit

| Rule | Carried by |
| --- | --- |
| The penalty, Dexterity relief, braced / Emplaced halving, none in volleys, reactions, full auto | the one recoil line in `combat.ts` (its literal 1 becomes the weapon's `recoil` less its mods'), `attack_preview` `noRecoil` |
| Bows 0 | the field at 0; `no_recoil` retired by the validator |
| Shown everywhere | `gearPreview` line (card, compare, loadout, pick draw whatever lines come); the to-hit terms list in the fight |
| A niche's measure | the gun and melee loops plus new rows (C4): test files only |
| The ceiling | `rules.json balance` ceilings, `balance-contract.test.ts` (`SYS` rows), `refit-measure.ts`; a new row per niche ("the best weapon of the class in its niche, all in") |
| A weapon's dial | its `damage` (number, falloff table or formula), `range_tiles`, `heat_limit`, `magazine`, `recoil`, `price_credits` |
| Direct upgrades at a rarer grade | the grade ladder (`rarity`, `cappedRarity`, `stageCeiling`) and `priceOf`; see 3.5 for the one field it may need |

### 2.3 Variants

As Draft 4.7, with the modifier carrier unified: **a variant's effect modifiers are modifier items of the same shape
as a mod and a Relic property** (an item row with `effects` gated by `with_this`, and number fields). Its field kinds
(deep magazine, long reach, runs cool, kicks less) are the same number fields as the mods' (3.2). So one reading
carries Relic properties, fitted mods and variants. `priceOf` for the price, `worthOf` / `boon_cap` untouched (a
variant is gear, not run power), `gearPreview` for the card, the loops for the measure.

### 2.4 Survival

| Rule | Carried by |
| --- | --- |
| The caster's camp cores | `survival.json loadout.focus_with` (already a list of `{id, qty}` per focus, read by `rebuild` in `run/loadout.ts`): data only |
| Special rounds by calibre | `priceOf` (its `price_mult` branch), `ROUND_PRICE`, `packAdd` / `sameRounds` (a rounds line already carries `calibre` and `ammoType`), `RECIPES` (A1), the validator's parity check |
| XP target | `survival.json xp`, `stage.xp`, `nodeXp`; the guard through the reducer (A4 S10) |
| Repair 25% | `survival.json repair.rate` |
| Healer stall line | `rules.json balance` (a named line), `defence-measure.ts` |
| Materials card worth | `survival.json rewards.materials.items[].per_credits` derived from `priceOf` (D7) |
| The simulator | `Rec` / `apply` through the reducer: `gear/make`, `run/sell`, `run/forge`, the new Forge fit service, `run/pick` |

---

## 3. Needs a new primitive (general only; for the lead to approve)

Kept as short as I honestly can. Six, of which three are widenings of an existing reading.

1. **Fitted mods held like a Relic property** (widening, `effects/hooks.ts` `heldOfChar` and predicate `with_this`).
   Today an instance carries one `prop` and `heldOfChar` holds it; mods sit on `weaponState.mods` (and a pack line's
   `mods`) and are read only by id. The change: an instance's modifier list (`prop`, its fitted `mods`, a variant's
   baked modifiers) is held through the same door, and `with_this` is true for an event made with the instance that
   carries it. **Why nothing does it:** `with_this` knows only `prop`; the draft's 4.8 item 1 (`props` list) and the
   mods report's item 1 are the same need, so this is one primitive for three uses. **Migration:** `prop` stays a
   valid saved field (read as a one-item list); no save rewrite.
2. **Modifier number fields, read through one helper** (new small export, e.g. `gearNum(instance, field)` in
   `character.ts`): the weapon row's own field plus the sum of its modifiers' deltas, for a short closed list of fields
   in data: `recoil`, `magazine_pct`, `range_tiles`, `heat_limit`, `bands` (with optional `modes`), `silent`. Every
   reader (the recoil formula, `magazineSize`, the optic band line, range, heat, the silence tests) asks it. **Why
   nothing does it:** these are weapon numbers, not unit stats; `statQuery` answers for a unit from everything it
   holds, including the pack, so it cannot say "this gun's magazine"; the `attack_preview` hook's `bandsLess` is set
   only from code. This one helper retires every `hasMod(..., 'mod_x')` and carries the variant field kinds 6 to 9
   (so a variant row need not be copied at load; it can be base + baked modifiers).
3. **`recoil` a weapon field** (Leon Q1, approved) and its `gearPreview` line. Part of 2's field list; listed apart
   because it is a rules revision.
4. **Two stat ids, `flux_max` and `core_charge`, and stat answers honouring `with_this`** (one line each in `STATS`;
   `statQuery` skips an item's `stat_mod` whose `if` has `with_this` unless the instance is in a hand). **Why:** the
   Flux limit and a core's charge are typed twice (`FLUX_MAX` 6 / `rules.json sigil.flux.safe_max`, `CORE_CHARGE` 10 /
   `rules.json cores.standard.charge`); the focus variants (Deep Well, Long Fuse, Calm Wrist with `strain_limit`) need
   "while you hold it". **Only if variants ship in 0.29** (Leon question 7); the one-copy fix (C11) moves the numbers
   to data either way, with no new stat, if variants wait.
5. **Special rounds bound to a calibre** (widening of `priceOf` and the recipes rows): a special round in the pack is
   a rounds line of a calibre with an `ammoType` (the shape `sameRounds` already keys on), priced `price_mult` × that
   calibre's round; a recipe row may say `each_calibre: true` and is expanded at load into one row per calibre with
   needs worth V/2 + V/2 (`RECIPES`, the validator's parity). **Why:** today the special item is one id for every gun
   at the rifle's price, which is the 0.28 leftover. **Migration:** an old `ammo_armor_piercing` line reads as rounds
   of the reference calibre (`weapons_rules.special_round_price.calibre`); an old-save fixture beside the three.
6. **A Forge fit / unfit reducer action** (`run/fit_mod {charId, where, idx}` and `run/unfit_mod {charId, where,
   slot}`; the type list in `game.ts`), offered as a `ShopService` card. **Why:** there is no removal at all today
   (report 5.8), and a paid fit needs a reducer step that pays and fits in one action; `run/forge` only buys into the
   pack. Not a cost site (out of a fight, credits, not AP).

Considered and **not needed**: a new op for any mod (all map to `roll_mod`, `damage_mod`, `cost_mod`, `condition`);
a new trigger (`to_hit`, `dealing`, `reload`, `hit` exist); a new predicate (`mode`, `crit`, `damage`, `with_this`
exist); a new cost site; a separate reward system for mods (the offer's pool is data); a new shop seam (the service
seam exists); a `min_grade` field (see 3.5 below: only if Leon question 6 asks for it).

**3.5 (conditional, Leon question 6):** if "rarer" means a weapon that dominates another never appears at Standard,
one weapon-row field `min_grade` read by `weaponOffer`, `rollStock` and the rack. If it means "at a higher price and
the grade step", nothing new.

---

## 4. Order and lanes

### 4.1 What must be sequential

```
P0 consolidation (A1-A5)  ->  P1 pins on old code  ->  P2 simulator + measure rows (D1, D2, C4)
   ->  lanes in parallel (L1..L5)  ->  P3 numbers (fit)  ->  P4 consolidation pass (rule 4)  ->  merge
```

- **P0 before everything** (Lead). One commit for M1 to M3, one for S1 to S9, one for S10 (report's order). Model:
  **opus** (M2/M3 change reward paths; must not move a replay). Proof: `npm run check` green; golden tables and
  `REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash` unchanged; `npm run built-from -- develop..HEAD` clean;
  `docs/ENGINE-HOOKS.md` lists `packTake`, `grantGoods`, `rowKind`, `fitMod`, `gearPreview`, `registerShopService`,
  `forgeStock` (grep).
- **P1 pins** (before any mod or recoil code moves; ENGINE-GUIDE rule 3 "Pin, then move"): situations in
  `test/golden/itemops.ts` for the nine working mods (each mod's preview and one real attack through the reducer:
  the trace of mods-today section 4 as a table), recorded on the old code with `GOLDEN_RECORD=1`, committed alone.
  Model: **sonnet** (mechanical, from the report's table). Proof: the new golden file exists and passes on old code.
- **P2 simulator and measuring rows** (the Lead's rule: no number refitted before the simulator makes and sells
  materials and uses mods). Model: **opus**. Two lanes in parallel, no shared file:
  - **P2a** `test/balance/survival-run.ts`, `survival-run-report.ts`, `sim.ts`, `run-policies.ts`, `policies.ts`
    (D1, D2). Note: D1's "use mods at the Forge" uses today's `run/forge` + `gear/mod` until L3 lands, then the fit
    service; the policy reads offers through `runOptions`, so the switch is one line. Proof: the guard
    (`survival-run.test.ts`) green; `SURVIVAL_SIM=1 SIM_CELLS=solo_gunner:gear,solo_sigil:gear SIM_SEEDS=6` prints
    materials made / sold, cores pressed, dealt / removed / overkill; `npm run balance` smoke green.
  - **P2b** `test/balance/guns-measure.ts`, `guns-measure.test.ts`, `melee-measure.test.ts`, `builds.ts` (C4's rows,
    env-gated). Proof: `GUNS_MEASURE=1 GUNS_MEASURE_WEAPONS=all ...` prints every weapon (the longbow, Spellslinger's
    pistol, censer gun included) in each niche row; `MELEE_MEASURE=1` prints the mana arms and a walking target row;
    the Balance 2.0 baseline JSON committed under `docs/design/handoffs/` (Draft 8 step 1).

### 4.2 Parallel lanes (worktrees off the P1 commit; files do not overlap)

| Lane | What | Files | Model | Proof it is done |
| --- | --- | --- | --- | --- |
| **L1 Modifier carrier + Recoil 2.0 + mods to data** (B1 to B6, B9 data, C1, C2, primitives 1 to 3) | the widening of `heldOfChar` / `with_this`; `gearNum`; `recoil` field; every `hasMod` site moved; the four dead mods' rows | `effects/hooks.ts`, `effects/triggers.ts` (with_this), `character.ts` (gear section, `magazineSize`), `combat.ts` (recoil line, optic bands, gun melee, damage_add, serrated), `press.ts`, `tactics.ts`, `perks/c.ts` (Old School, extra slots), `faith.ts:1605`, `game.ts:3553` (refills), `gearpreview.ts`, `data/items.json` (mods), `data/weapons.json` (`recoil`), `data/effect_ops.json`, `tools/validate.py` (mod fields, `no_recoil` retired) | **opus** (the lead approves primitives 1 to 3 before it starts) | P1's pins pass unchanged for every mod except the four named moves (compensator −1, extended spares, scope label, suppressor scope) which are re-recorded on purpose and named in the commit; `grep -rn "mod_[a-z_]*'" packages/engine/src` returns nothing; `lint-item-ops`, `lint-costs`, `lint-foundations` baselines not raised (the literal count falls); `golden-damage*` move only on the recoil lines and the four mods; a reducer test: a mod with a never-seen id, written as one data line, shows on the card and acts in a fight (the "hundredth item" test) |
| **L2 Special rounds by calibre** (D3, primitive 5) | priced and made by calibre; migration | `credits.ts` (`priceOf` special branch), `containers.ts` (special rounds line), `recipes.ts` (expansion), `data/recipes.json`, `data/items.json` (special rounds rows only), `data/rules.json` (if needed), `tools/validate.py` (`_rprice` parity, N3: changed together), `test/fixtures/save-*.json` (one new fixture) | **opus** | `survival-materials.test.ts` parity holds for every expanded row; a reducer test: AP rounds for the .700 cost 120 at the shop and need materials worth 120 to make; `old-save.test.ts` loads a 0.28 save holding `ammo_armor_piercing`; validator 0 errors. Conflict note: `items.json` is also L1's: L2 touches only the three special-round rows, L1 only `category: mod` rows: merge by hunk |
| **L3 Mods in Survival** (B7, B8, B10, primitive 6) | the Forge fit/unfit service and fee; the gate; the mod reward; `built: false` filter | `run/progress.ts` (forge stock, want-list across guns, the service cards), `run/shop.ts` (service registration only), `run/rewards.ts` (offer pool, the mod card), `run/state.ts` (`RunOffer` field), `game.ts` (two action types, the gate via `gearLockWhy`), `data/survival.json` (`forge.fit`, `rewards.mods`), `apps/web` run screens (the pick's third card if Leon says so; the Forge card renders `ServiceCard` already) | **opus** | reducer tests: in a run `gear/mod` is refused with the gate's words; at a Forge the fit charges the fee and fits; unfit returns the mod to the pack and charges; a pick offers a mod only for a free slot and only inside the band; a `built: false` mod is never stocked or offered; `boundary.test.ts` green; `npm run e2e -- survival` |
| **L4 Variants** (C10, primitive 4 if approved) | `data/variants.json`, its loader, ten gun and ten focus lines | new `variants.ts` (or in `character.ts`'s loader), `data/variants.json`, `tools/validate.py` (kinds, fits, cap), `magic.ts` (`FLUX_MAX`, `CORE_CHARGE` to data: C11), `effects/stats.ts` (two ids) | **opus** for the loader and C11; **sonnet** for the twenty data lines once the loader passes | starts **after L1 merges** (it reads L1's carrier and `gearNum`); a variant written as one data line shows on the card, prices in the shop, acts in a fight through the reducer and is measured by the loop (Draft 8 step 5's test); validator refuses a third modifier, an unknown kind, a misfit, a duplicate, worth over 20 |
| **L5 Client display** (C1's sheet line, B4's term name, mod lines) | the sheet's weapon line shows recoil and fitted mods; nothing computed client-side | `apps/web/src/screens/main.js` (GEAR tab), `apps/web/src/game/backpack.ts` (pack row magazine from the engine view, report 5.4) | **sonnet** | `boundary.test.ts` green; `npm run e2e -- smoke`, `-- survival`; a screenshot pass by the lead |

L4 is the only lane that waits on another lane. L5 waits for L1's views but touches no engine file.

### 4.3 P3 numbers (sequential, the lead fits; one family or dial a commit)

Only after P2 and L1 to L3 are merged on the branch. Order: (1) mods' worth and price (B11, B12), (2) weapon refit by
family against the niche rows (C5, C6), (3) variants' worth (C10), (4) camp caster cores (D4), (5) XP (D5), (6)
repair, Materials card worth, small parties, supply pack (C9, D6, D7), (7) the healer stall (C8). Each with
`balance-contract.test.ts`, `python3 tools/golden_diff.py --rev <base>` and the commit naming what moved. Model:
**opus** runs the measures and proposes; the lead rules each number.

### 4.4 P4 before merge

The rule-4 consolidation pass (a reviewer reads the diff of `docs/ENGINE-HOOKS.md` and `packages/engine/src`), report
in `docs/design/proposals/`; `npm run check`; `npm run balance`; `REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash`;
`npm run e2e -- survival` and `-- smoke`; spec 1.55 and section 14 items; `art/briefs/ART-REQUESTS.md` (variants use
the base's icon; a mod reward card needs mod icons: the 13 mods have none in `art/icons/weapons/` today, to check);
CHANGELOG; versions.

---

## 5. Every number proposed (all PROVISIONAL) and the measurement that fits it

| Number | Proposed | Fitted by |
| --- | --- | --- |
| `recoil` by family | pistols, SMGs, rifles, carbines 1; long rifle, hand cannon, shotguns, battle rifle, heavies unbraced 2; bows, core rifle 0 (Draft 3.2) | P2b's low-Dexterity row (Dex 3, normal share): every family inside its niche reading after the change |
| Compensator | Recoil −1 (Leon) | the low-Dex row: worth stays under its price's share |
| Forge fit fee | 20% of the mod's `priceOf`, at least 25 credits; unfitting the same | P2a runs: the share of a stage's credits spent on fees (target: under 10% of a gunner's stage-2 spend), and fit counts per run |
| Mod reward | a "One mod" card at Elite, gate, Boss, vault guard; band = `priceBand` × 0.5 | P2a: mods held per character by the end of stage 2 (target 1 to 2), none unusable |
| Mod prices | from worth: price ∝ the measured gain in the gun's niche (the report's table: red dot +11 to +54%, extended magazine +0 to +29%, comp ~0); today's 80 to 900 | the gun loop with mods fitted by `fitMod`, 32 fights a cell, common seeds (report method), at L6 and L12 |
| Mod ceiling | the best gun of a class + its best legal mod set ≤ its niche line + 12% on the mean, + 25% a level | same; the hand cannon (161) and the auto-shotgun (+54%) are the first two cells |
| Niche lines | the best weapon of a class in its niche reaches 145 (guns) / 165 (melee) all in; outside its niche no line, but its price per worth must not beat a cheaper class's in that class's niche | P2b's niche rows |
| Breacher, thumper `damage` | breacher about ×2.6 and thumper about ×1.2 on today's (estimates: 32% and 70% with the cluster credit, Draft 2.2, raised to about 85%) | the cluster row (2.4 bodies at radius 1, 2.8 at radius 2) |
| Maul | `damage` about −10% (116%) | melee loop |
| Sabre, katana | watch; −5% `damage` if over the melee line + 12% in their niche | melee loop with the Dexterity twin |
| SMGs, pistols, shotguns | `damage` up to their niche line (SMG: full auto at 4 to 8 tiles; shotgun: within 4; pistol: with a free hand); the sawn-off and parlour pistol priced as hold-outs | P2b's rows |
| Variant worth cap | 20% of a rifle-turn (Leon); price = base × (1 + worth ÷ 100) via `priceOf` | the gun and melee loops on each variant id |
| Camp cores (Evoker, Visualizer) | 4 standard cores with the focus (today 1); range 3 to 6 | P2a: solo_sigil and solo_rigger against solo_gunner on the same seeds: fights fought before the first resupply or shop, and stage-1 clear rate within 10 points of the gunner's (cores burnt a fight from `coresBurnt`) |
| Camp, MP casters (Emanator, Attuner) | nothing added (MP refills by `supplyMp`); re-check with the same measure | P2a, solo_outburst and solo_healer |
| XP | `xp.base` / `xp.per_depth` refitted so level 3 is reached at the last node before the first Boss on at least 80% of most-fights routes and not before the Elite gate on any; today 10 / 2, Boss × 5 | P2a, `gear` and `training` routes at SIM_SEEDS 12 (and the always-on guard updated to read it) |
| Repair rate | 0.25 (Leon) | none to fit; P2a reports repair spend |
| Materials card | `per_credits` derived so the card is worth C at `priceOf` (today 1.5 × C) | the validator holds parity; P2a reports stage income |
| Healer stall line | at most 6 rounds (Leon) | `DEFENCE_MEASURE=1 DEFENCE_PARTS=fire DEFENCE_N=8 DEFENCE_ROWS='^(tank|mender|idle)'`; the dial: enemy fire doctrine or heal level scale (Draft 7.1) |
| Special rounds | `price_mult` × the gun's calibre round (AP 3, HP 2, incendiary 3, unchanged mults); recipes at V/2 + V/2 | the validator's parity; P2a: no run's ammo budget falls by more than the old exploit gave |
| Gun Nut | none until traced (B12) | the gun loop with and without the trait on the CCEC rifle, then the cause |

---

## 6. Spec text to add: rules revision 1.55 (outline)

"Rules revision 1.55: Balance 2.0, recoil, weapon niches, weapon mods and variants (Leon, 15 Nov 2026)". Leon's twelve
answers and the 15 Nov mod quote verbatim first; then:

1. **Recoil 2.0.** The rule in words (Draft 3.2 item 1); the field; bows 0; the compensator Recoil −1; what shows
   where. Overrides spec item 88 (line 589), lines 707 and 2327.
2. **Weapon niches.** Each weapon class's niche (the table Leon confirms in question 4); "the best in its niche reaches
   the ceiling"; outside it, price decides; direct upgrades only at a rarer grade and a higher price (question 6's
   reading). Replaces the draft's single band.
3. **Mods are data.** A mod is an item row: its effects (item ops, with this gun only) and its number fields (recoil,
   magazine, bands, silence); the closed field list; fits by slot as now; acts in either hand (question 5); the
   extended magazine sizes every magazine of its gun; the scope's term is named.
4. **Mods in Survival.** Fitted, swapped and taken off only at a Forge, for the fee (question 1); never on the sheet
   or in a fight in a run; the Forge's stock reads every gun carried; the reward card (question 2); `built: false`
   items never sold or offered; the four mods' fate (question 3).
5. **Mods' ceiling.** A gun with its best legal mods stays within its niche line's band.
6. **Variants** (if question 7 says this release): Draft 4.1 to 4.4, the 12 kinds, worth cap 20%, price through the
   base, the validator's refusals.
7. **One copy:** the Flux limit and a core's charge in data.
8. **Special rounds by calibre**: price and recipes; old lines read as the reference calibre.
9. **Survival dials:** the camp's caster cores (overrides 1.52's `focus_with` of one core); repair 25% (overrides
   1.50); XP refit (overrides 1.54 item 9's numbers, keeps its words); the Materials card at `priceOf` (overrides 1.54
   item 4's ⌈C/2⌉, ⌈C/2⌉, ⌈C/20⌉); the healer stall line.
10. Section 14 items (one per provisional number of section 5), and the Superseded notes on the body lines it
    overrides (item 88, the compensator lines, 1.50 repair, 1.52 camp, 1.54 items 4 and 9).

---

## 7. Risks to saves, golden tables and replay hashes

| Change | Saves | Golden tables | Replays |
| --- | --- | --- | --- |
| P0 (M2, M3, S1 to S10) | none | must not move | must not move (the report's own condition) |
| L1 carrier widening | `prop` stays readable; `mods` already saved as ids; no migration | `golden-itemops` new pins; `golden-damage*` move only for the compensator, extended magazine spares, suppressor scope, scope label (log), recoil lines (heavies at 2, bows unchanged); `golden-costs` unchanged unless the quick-release cost site retires | re-record if any replay holds a modded gun or fires a recoil-2 gun with more than one shot a turn (likely: the guard's Survival replays have the rack's guns): `REPLAY_DUMP` first, name the first mark |
| L1 `recoil` field | none | the shot tables' recoil lines (Draft 8 step 4: re-recorded on purpose) | likely moves (to-hit changes dice outcomes) |
| L2 special rounds | **old lines** `ammo_armor_piercing` / hollow / incendiary in a 0.28 pack: migration to rounds of the reference calibre; a fourth fixture beside the three (never regenerate the three) | `price-list.test.ts`, the shop's tables | Survival replays with a special-round buy move |
| L3 Forge-only fit | a 0.28 save mid-run with a mod in the pack: still fittable at the next Forge; nothing lost | none | Survival replays that call `gear/mod` in a run now get a refusal: re-record, name it |
| L3 reward card | an offer saved before has no mod field: reads as none (as 0.28 did for `materials`) | none | moves where a pick is replayed by index (the simulator picks by name: check) |
| L4 variants | new ids only; nothing saved changes | new rows; none move | none |
| C5, C6 refit | none | `golden-damage*` for each weapon touched only, named in each commit | moves |
| D4 camp cores, D5 XP, C9 repair | a run saved at camp under 0.28 rebuilds with the new `focus_with` on its next change (the camp rebuilds from picks): acceptable; a run saved mid-stage keeps its XP | none | Survival replays move: re-record once, after P3, not per number |
| Catalogue (A1) | none | none | none; `npm run check`'s "engine hooks" line must be fresh after every primitive |

General risk: the lints. L1 must lower `lint-item-ops` literals (the typed fallbacks 15, 3, −2 go) and never raise a
baseline; a builder who needs to raise one stops and hands back (CLAUDE.md rule 6).

---

## 8. Candidate questions for Leon (checked: each is his call, not the repo's)

1. **Fitting only at a Forge.** In Survival, is a mod fitted, swapped or taken off only at a Forge for a fee (no free
   Fit on the sheet, none mid-fight)? *Recommend yes*, fee 20% of the mod's price (at least 25 credits), taking one
   off the same. *If silent:* built so. *Why his:* it removes a free action players have today and decides what the
   Forge is for.
2. **How a mod comes as a reward.** A third card "One mod" (beside Materials and One weapon) at Elites, the gate,
   Bosses and the vault's guard only, offering a mod that fits a free slot on a gun you carry? Or mods mixed into the
   One weapon card? *Recommend the third card, big fights only*: ordinary fights keep the two cards he asked for on 14
   Nov, and a mod is never offered for a slot you don't have. *If silent:* the third card. *Why his:* he cut the loot
   menu to two cards on 14 Nov; a third card changes that.
3. **The four mods that do nothing.** Rewrite the foregrip as "+1 to hit on Bursts and full auto with this gun", and
   shelve the wrapped grip, the underslung launcher and the sigil-etched magazine (not sold or offered) until their
   systems exist? *Recommend yes.* *If silent:* built so. *Why his:* it changes what a named item does and takes three
   off sale.
4. **The niche table.** Each class's niche: rifles at 9 to 16 tiles; the long rifle past 16; pistols with the free
   hand used (a focus, a shield or a second pistol); revolvers the single big hit (crit); SMGs full auto at 4 to 8
   tiles; shotguns within 4 tiles; LMG and rotary braced or Emplaced, sustained; breacher, thumper, flamer area on a
   cluster; bows and crossbows silent (from Hidden, no Heat); light blades Dexterity melee, heavy melee Raw Power,
   unarmed with both hands free. *Recommend this table.* *If silent:* this table is measured and fitted. *Why his:*
   "every weapon should have a place or a niche": which place is a feel decision.
5. **Mods on an off-hand gun.** Today mods on a gun in the off hand do nothing, and a paired attack drops them. Should
   mods work in either hand? *Recommend yes* (two modded hand cannons then stay under the ceiling by the fit). *If
   silent:* built so. *Why his:* no rule in the repo says either; it decides whether dual-wielders mod both guns.
6. **"Direct upgrade at rarer rarity."** Does a weapon that beats another everywhere (a) never appear at Standard
   grade in picks and shops, only Fine or better, and cost more; or (b) simply cost more, with the grade step as the
   rarer path? *Recommend (a)* for picks and shops, the camp rack keeping its "next one up" at Standard as he ruled
   on 14 Nov. *If silent:* (a). *Why his:* his sentence reads both ways, and (a) changes what a stage-1 player can be
   offered.
7. **Variants in this release or the next.** Ship the twenty named variants in 0.29 with the mods (they share the one
   new carrier), or ship mods and the refit first and variants in 0.30? *Recommend 0.29* (one primitive, measured once).
   *If silent:* 0.29, and they are the last lane, dropped to 0.30 only if they would hold the release. *Why his:* it is
   the release's size and what players get first.

Checked and dropped as not his: the fee number and the cores number (fits; he delegated with "think accordingly");
the extended magazine's spares (a bug against its own card); Gun Nut's anomaly (a defect); the XP reading (his words
in 1.54 item 9 say "as you are about to take on the first boss": level 3 before the Boss fight, so the guard that
asserts level 3 after the Boss is what changes); the Materials card's worth (report N11 names it the lead's); whether
mods count against the run-power cap (they are gear, like weapons; the lead's).

---

## 9. Lead's rulings (15 Nov 2026; these override anything above that disagrees)

1. **Primitives approved:** 1 (fitted mods and variant modifiers held through `heldOfChar` / `with_this`), 2 (`gearNum`, one helper, a closed field list in data), 3 (`recoil` weapon field), 5 (special rounds bound to a calibre), 6 (a Forge fit / unfit action). 4 (stat ids `flux_max`, `core_charge`, `with_this` in stat answers) is approved for lane L4 only, and only when L4 starts. Nothing else is added to a closed list without coming back to the lead.
2. **Section 8's questions were checked against the repo** and six of seven are not Leon's: the four inert mods come off sale by a data flag and one general filter (the foregrip is redesigned with Recoil 2.0); the niche table is built, measured and reported as a result; off-hand guns carry mods, grade and wear if the paired hand cannon stays under the ceiling; a better-everywhere weapon is gated by price (no `min_grade` unless a measurement shows one landing too early); variants ship in 0.29 as the last lane and drop to 0.30 if they hold the release; a mod may appear inside the Boss's and the vault guard's pick (no third card).
3. **Open with Leon:** whether fitting a mod costs a fee at the Forge or stays free. Until he answers, lane L3 builds the unfit path, the mod-in-pick and the inert filter, and NOT the Forge-only gate or the fee.
4. **A disagreement to settle in code before L3:** the mods report says a mod is never a reward pick in Survival; the question check reads survival-spec rules 40, 41, 44 as Elite and cache lasting picks holding mods. L3's first step is to establish which is true through the reducer.
5. **Order stands:** P0 (consolidation M1 to M3, then S1 to S10) -> P1 (pins) -> P2 (simulator) -> lanes -> P3 (numbers, the lead) -> P4 (consolidation pass) -> gate -> Leon's word -> live.
