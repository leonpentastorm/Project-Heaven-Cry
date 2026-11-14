# Survival: the repair service (rules 1.50; hand-off, 14 Nov 2026)

Rules: `docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.50**, items **3700 to 3710** (every number PROVISIONAL); spec
`docs/design/survival-spec.md` rules 37a and 44a, 11.5 (0) and 11.7. Branch: this worktree's, from
`claude/charming-gauss-hbq4n0` at a567ed6c. Version 0.27.0 (not bumped); nothing deployed.

The finding it answers (`survival-steps-9-10.md` section 5, rules 1.49 item 3609): guns wore out in stages 3 to 4 and
Survival had no repair but a grade step.

## 1. What was built

| Piece | Where |
| --- | --- |
| `run/repair {charId, where, place}` through the one reducer; `repairPrice`, `repairProblem`, `REPAIR`; the repair options in `runOptions` (group `repair`, with `wear`); `repairCards` registered on the shop's services (`registerShopService` id `repair`) | `packages/engine/src/run/progress.ts`, `game.ts` (the dispatch line) |
| `wearAt(c, where)` (a hand or pack line: id, name, grade, now, full, state), `repairAt(c, where)` (to full; one of a stack split off, as `setGrade`), `wearState(now, max)`, `WORN_SHARE` | `packages/engine/src/character.ts` |
| Durability rule 2's 25% moved to data; the fight's two worn tests and the web fight row read `wearState` (no number changed) | `data/rules.json weapons_rules.worn`, `combat.ts`, `apps/web/src/game/resources.ts` |
| The numbers: `repair.rate` 0.1, `floor` 10, `places` shop 1 / Forge 0.8; validator rules for both blocks | `data/survival.json repair`, `tools/validate.py` |
| `ServiceCard.service` and `.wear`; `MeV.handWear`, `offWear`, pack lines' `wear`; `wearView`; the Forge's Upgrade tab holds the `repair` group | `run/shop.ts`, `run/shopview.ts`, `run/placeview.ts` |
| The gear preview's "Durability (full)" line for weapons and shields (a grade step's card now shows durability rise) | `gearpreview.ts` |
| `WearBar` (bar now / full or now → full, ⚠ WORN / ✕ BROKEN in the complication red, an aria label); the repair card is `UpgradeCard` with `wear` (button "Repair"); the shop's third tab "Repair and upgrade" (Repair shelf above Upgrade); the Forge's Repair group; wear bars on both "you" panels (hands, pack lines); the path map's squad panel (main hand always, any other Worn or Broken thing) | `apps/web/src/game/WearBar.tsx` (new), `UpgradeCard.tsx`, `ShopScreen.tsx`, `PlaceScreen.tsx`, `RunScreen.tsx`, `runView.ts` |
| The simulator repairs; the tables gain "wear before a fight" and "repairs, credits" | `test/balance/survival-run.ts`, `survival-run-report.ts`, `survival-run.test.ts` (`SIM_REPAIR=0` measures without) |

## 2. Built from

| Rule | Primitive |
| --- | --- |
| What wears and its full | `maxDurOf(id, rarity)` (weapons.json / items.json `durability` × `RARITY.dur`), `GearState.dur` / `PackItem.dur` (missing = full) |
| Worn / Broken | Durability rules 2 and 3, now `wearState` on `weapons_rules.worn.share` |
| Where a thing is | `GearWhere` (`gearAt`'s hands and pack lines), `packOf` |
| The price | `priceOf(id, rarity)` (the one price door), the gunsmith's 10% (Durability rule 4) |
| Paying | `cantPay` (its words are the short-purse refusal), `payCredits` |
| The place and the visit | `progress.ts here()`, `notHere`, `GradePlace`, `runOptions`, `registerShopService`, `placeView` TABS |
| The log | the reducer's `say` → story entry and the visit's log (`visitNote`) |

**New primitives** (each general): `wearAt` / `repairAt` / `wearState` (a campaign's smith, the backpack screen, a
future armour durability), `ServiceCard.wear`. There was no repair-to-full primitive: Requisition Approved
(`faith.ts`) and Overhaul's bench repair (`perks/c.ts`) each set `dur` themselves and were left untouched (no rule
changes; folding them onto `repairAt` is a later tidy, it would not move a number).

## 3. How it sits with the Core Rules' own repairs

- **Field Repair** (Improvisation 3, a spare-parts charge, 2 AP, in a fight: 10% + 5% a point above 3), the
  Operative's **Field Fix**, **Factory Made**'s self-repair: unchanged, in a fight. They keep a gun firing in the
  fight it would break in; the service is the way back to full between fights.
- **Overhaul's bench repair** (out of a fight, a spare-parts charge, to full) and **Requisition Approved**: unchanged.
  A character with Overhaul repairs for a 16-credit charge what the shop repairs for a tenth of the price: the perk
  keeps its worth.
- **Spare-parts charges** were already always stocked (`shop.always`, Field supplies, 16 a charge); the field kit too.

## 4. Measured (the steps 9-10 cells and seeds: SIM-1 to 4, stages capped at 5, all eleven cells)

Full tables: `survival-fit/repair-before.md` (`SIM_REPAIR=0`: it reproduces `survival-fit/after.md` line for line)
and `survival-fit/repair-after.md`.

| Cell | Ends before → after (mean) | Cleared 1/2/3/4 before → after | Fights with a gun Broken (stage: before → after) | Repairs, credits a character a stage |
| --- | --- | --- | --- | --- |
| four · gear | 3.4 → 3.4 | same | none | 0 |
| four · training | 4.4 → 4.3 | 100/75/50/50 → 100/75/50/25 | s3 1 → 1, **s4 5 → 1**, **s5 2 → 0** | s4: 0.1, 3 |
| four · safest | 4.4 → 4.4 | same | **s4 5 → 0** | s4: 0.1, 3 |
| four casters · gear | 2.0 → 2.3 | 50/0/0/0 → 50/25/0/0 | **s2 4 → 1** | s2, s3: 0.3, 6 |
| duo (3 routes), solo gunner (3), solo Sigil | unchanged | unchanged | none before | 0 |

1. **Do guns still break in stages 3 to 4?** Mostly not: the squads' broken-gun fights in stages 4 and 5 fell from 12
   to 1. One stage-4 gun still broke between shops: the policy repairs only what is Worn (25% or less), and a gun just
   above it at one shop can wear out before the next. A player sees the bar; a policy that repairs at 50% would close it.
2. **What does repair cost a stage?** 3 to 6 credits a character on average where any are bought (0.1 to 0.3 repairs; a
   Broken Masterwork rifle is the dearest at 720, a Standard rifle at 15% 77): under 0.2% of spec 11.1's 3,861 to 6,864.
3. **Does the end point or the ladder move?** No: squads of four still end in stage 3 or 4 (3.4, 4.3, 4.4); one
   training-route run that cleared stage 4 before fell in it after (the dice of a gun that fires instead of breaking
   change the fight's stream); four casters 2.0 → 2.3; grades at each Boss and steps a stage are the same in every cell.
   **No dial was moved.** The guard (three solo runs) is unchanged and green; its bands were not touched.

## 5. Proof

- Engine: `test/survival-repair.test.ts` (12: the worn share from data and the states; wearAt / repairAt on a hand and a
  split stack; a focus and a tool do not wear; the shop's price and log; the Forge's factor; a Broken gun at the whole
  rate, a scratch at the floor, a Masterwork at its grade; a pack line; every refusal in words, nothing changed; the
  shop's Repair cards (wear, price, the Forge's price, the short purse); the Forge's group; the preview's durability).
- The guard `test/balance/survival-run.test.ts` green, bands unchanged; golden tables and `replays.json` unmoved;
  lints' baselines not grown; validator 0 errors (mutation-checked: a worn share of 1.25 is refused).
- Browser (own server, port 9011): `survival` 101 checks green (new: the Repair card's bar 60 → 400 marked WORN, its
  price from data 77, "Kade is short 74 credits (has 3, needs 77).", the "you" panel's WORN mark, nothing clipped at
  1920, Repair clicked: the purse −77 and the rifle at 400, the card gone; the path map's squad panel WORN mark).
- Screenshots: the session scratchpad `shots-repair/survival-repair-1280.png`, `survival-repair-1920.png` (DSF 2).

## 6. Calls made for Leon

`PLAYTEST-CHECKLIST.md` section S, calls 76 to 79: the price is the gunsmith's tenth by the wear (floor 10, Forge
80%, mods not counted); no limit a visit; the WORN mark is the Core Rules' 25% (no second number); shields repair too.

## 7. Open

- A gun just above 25% at a shop can still break before the next shop (see 4.1).
- Requisition Approved and Overhaul could call `repairAt` (a tidy; no rule change).
- Armour has no durability today (Equipment 2.0); `wearAt` reads any item's `durability`, so it will repair the day
  armour has one.
