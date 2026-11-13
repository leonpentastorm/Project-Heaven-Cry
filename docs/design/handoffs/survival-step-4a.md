# Survival, build step 4a: in-run progression (hand-off, 13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4) section 11, rules 25a, 26, 31, 37 to 46, section 4.2 items 9 to 12, section
10 row 4a. Rules: `docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.43**, items **3000 to 3031** (every number
PROVISIONAL). Branch: this worktree's (`worktree-agent-abf0548a01fa1a7da`), from `claude/charming-gauss-hbq4n0` at
3a7cb76d. No version bump; nothing deployed. Build step 4 (the shop, `priceOf`'s calibre prices, buying and selling,
the full-screen frame, the gear preview, the path map's layout) is another builder's; nothing of it is touched here.

## 1. What was built

| Piece | Where |
| --- | --- |
| **Item 9**, a focus's rarity on its door: `focusRarity(c, door)` (the focus of that door in a hand), `focusAccTerm(u, door)` (THE reading of `rarity.acc`), read by the one to-hit hook (`toHitTerms`, types sigil and soul) and by `rollSave` (a save forced `via` a door skill) | `character.ts`, `rolls.ts` |
| **Item 10**, `setGrade(c, where, rarity, prop?, {durShare?})`, `gearAt(c, where)`, `GearWhere` | `character.ts` |
| **Item 11**, a named property on an instance: `GearState.prop`, `PackItem.prop` (kept by `equip`, `gearEntry`, the in-fight swap, piles); `handProps`, `gearProps`; `heldOfChar` holds every carried instance's property as a relic item; the predicate **`with_this`** | `character.ts`, `effects/hooks.ts`, `effects/triggers.ts`, `game.ts` (the swap), `data/effect_ops.json` (regenerated) |
| **Item 12**, `addPractice(c, n, why)` (and `gainPractice` now goes through it) | `magic.ts` |
| The run's cap (rule 31): `runWorth`, `capRoom`, `capProblem`, `worthOf`; the relic items loaded at run time (`relic_props`, `boons`, a graft of each boon); `propFits`, `rollProps`, `boonsFor` | `run/power.ts` (new) |
| The safe nodes: `openVisit` (the Forge's stock, the Crossroads' trades, the shrine's patron rolled on entry), `progressAction` (the reducer's door for `run/upgrade`, `run/forge`, `run/fit`, `run/train`, `run/shrine`, `run/trade`, `run/take`), one problem function per action (`upgradeProblem`, `forgeProblem`, `fitOf`, `trainProblem`, `shrineProblem`, `tradeProblem`), `runOptions` / `lastingOptions` (what the screen draws: label, price, the engine's reason, the action), `lastingOffer`, `relicChoices`, `gradePrice`, `nextGrade` | `run/progress.ts` (new) |
| The run's state: `RunVisit`, `RunStock`, `RunLasting`; `g.run.visit`, `g.run.lasting`, `g.run.marks`; `RunWeapon.prop` | `run/state.ts` |
| Reward weapons: `stageCeiling(stage)`; `cappedRarity` keeps a Relic; `weaponOffer` rolls a Relic's property onto the cap (none fits: Masterwork) and takes a rarity table and ammo count for the sealed crate; `pickedItem` carries the property | `run/rewards.ts` |
| The reducer: the seven actions; `runPicksDone` (weapon picks and kit picks both done); a visit opened on every safe node; a cache's and an Elite's (and the gate's) pick of kit | `game.ts` |
| A relic answers stats (the graft's max HP): `fx` no longer skips a character whose only items are relics | `character.ts` |
| `survival.json` is filled by `datatext.ts` (its texts' placeholders) | `datatext.ts` |
| Data: `grade_up`, `forge`, `armour_fit`, `boon_cap`, `relic_props` (7), `boons` (7 of 13), `graft`, `train`, `training`, `shrine`, `lasting`, `trades` (6); the node texts and tips of the Forge, training ground, shrine, Crossroads, cache and rest; `items.json armourer_chit` | `data/survival.json`, `data/items.json` |
| Validator: every new key, every relic's ops checked as item ops, every property's effect `with_this`, `fits` and `pools` words, the chit `stock: false`, the trades' `do`, the fill ids | `tools/validate.py` |
| The screen: each safe node lists every character's choices from `runOptions` (grouped: grade step, Relic step, the armourer's stock, fitting, training, the shrine, trades), price or "free", the engine's reason on a refused one (shown and in the hover card); the pick of kit beside the weapon pick | `apps/web/src/game/runView.ts`, `RunScreen.tsx` |
| The try tool: a character spec's `grade` (`{"main": "fine", "off": "fine"}`) and a `tohit` step (the one hook's terms) | `test/helpers/perkfight.ts`, `test/try.test.ts`, `tools/try_fight.py` |
| Tests: `test/survival-progress.test.ts` (24); `test/helpers/survival.ts` takes the kit picks; browser suite `survival` extended (its own section, 26 checks) | |

## 2. Built from

| Rule | Primitive |
| --- | --- |
| A focus's rarity on its door (25a) | `rules.json rarity.<r>.acc` (`RARITY`), `kindOfDoor` / `FOCUS_IDS` / `inHands` (the hand), the one to-hit hook `toHitTerms`, `rollSave`'s TN; **new** reading `focusAccTerm` (item 9) |
| The grade step (37) | **new** `setGrade` (item 10), `maxDurOf`, `payCredits` / `cantPay` (credits.ts), the picks' ceiling (`rewards.ceiling`, now `stageCeiling`) |
| The Relic step and its property (38) | `setGrade` with a property; the `relic` item kind (`addItems('relic')`, effects/collect.ts) and the item-op runner; ops `damage_mult`, `roll_mod`, `cost_mod`, `mend_mult` on `dealing`, `attack`, `to_hit`, `save`, `reload`, `swap`, `heal`, `shield`; `limit`; **new** `GearState.prop` and predicate `with_this` (item 11) |
| The run's cap (31) | `worth` on each relic row; `c.relics`; `gearProps` |
| The chit (43) | an `items.json` item (`stock: false`, so `priceOf` gives none), the pack |
| The Forge's stock and fitting (44) | `priceOf`, `lootToPack` / `packAdd`, `armourCap`, `armourGateWhy`, `c.armourClass` |
| Trainings (39, 45) | `addDrill`, `addStudy`, **new** `addPractice` (item 12), `shiftDevotion`, `payCredits` |
| The shrine (46) | `shiftDevotion` by `DEVOTION_XP.rite` (`patrons.json gain.rite_kept`), `grantPiece`, `beliefOf`, `FAITH_PATRONS`; a boon row into `c.relics` |
| The trades (42) | `setGrade` (`durShare`), `addDrill`, `weaponOffer` (the loot roller), `addStudy` / `addPractice` / `shiftDevotion`, a graft relic (`stat_mult` on `hp` and the boon's ops), `priceOf` / `earnCredits` |
| Picks of kit (41) | the run's named stream (`rngFor`), `lootToPack` / `packAdd` |
| Reward weapons (26) | `rollTable`, `cappedRarity`, `rollProps`, the cap |
| Seeded nodes (12) | `rngFor(seed, node + '#forge' / '#trades' / '#shrine' / '#token#' / '#graft#' / '#relic#' / '#lasting#')` |
| The screen | `runOptions` and `lastingOptions` (the engine's prices, reasons and actions), the one hover card |

**New primitives** (each general, in the closed lists where they belong): `focusAccTerm` (rolls.ts) and `focusRarity`;
`setGrade` / `gearAt`; `GearState.prop` / `PackItem.prop`, `handProps` / `gearProps`, the predicate `with_this`
(`PREDICATES`, written to `data/effect_ops.json` by `ITEM_OPS_WRITE=1`); `addPractice`. No new trigger, op, stat, hook
or cost site. The lints' baselines did not grow.

**`npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: the smells, and why they stay** (none a lint fails on):
1. `run/progress.ts` "HP written by hand" (the hard sparring's cost, a quarter of the HP now, out of a fight; the
   graft's HP held under the new max): out of a fight a character has no damage door (`applyDamage` needs a unit in a
   fight); step 3's return at 1 HP sets `c.hp` the same way. It deals no damage and heals nothing.
2. `run/progress.ts` "damage worked out by hand": the same line (a share of HP as a price), not a damage amount.
3. `run/progress.ts` "an item tested by its id": `t.do === 'grade'` and the like name the KIND of a trade (a data
   field, the six `do` words the validator holds), not an item.

## 3. How to use the new primitives

- **A graded focus:** nothing to do. A focus of a door in a hand adds `rarity.acc` to that door's rolls to hit and to
  the TN of every save forced `via` that door's skill. To see it: `focusAccTerm(u, 'brain_power')`, or
  `npm run try -- '{"pcs":[{"kit":"sigil","grade":{"off":"fine"}}],"steps":[{"tohit":{"type":"sigil","target":"$foe"}}]}'`
  (`[{"v":1,"label":"fine focus"}]`; with `"grade":{"main":"fine"}` a shot's `toHit` is one up too).
- **`setGrade(c, where, rarity, prop?, { durShare? })`**: `where` is `'main'`, `'off'` or a pack index. Returns null or
  the refusal in words. `prop` names a property to put on (a Relic's), `null` clears one, omitted keeps it.
  `durShare` leaves the durability at that share of the new full (the off-books step's 0.5).
- **A property on an instance:** put its relic id in `prop` (`setGrade(..., 'relic', 'prop.keen')`, or a pick's
  `RunWeapon.prop`). Every effect of a property item carries `if: { with_this: true }` (the validator insists), so it
  works only while the instance is in a hand and for what is made with it. `gearProps(c)` lists every carried one (the
  cap counts them), `handProps(c)` those in hand.
- **`addPractice(c, n, why)`**: returns the log line (empty when nothing was added).

## 4. How to add

- **A Relic property:** one row in `survival.json relic_props`: `id` (`prop.<name>`), `kind: "relic"`, `name`, `fits`
  (guns, magazine_guns, melee, foci), `worth`, `effects` (item ops from the closed lists, each with
  `if.with_this: true`), `text` with `{=placeholders}`, `adjudication: "engine"`, `provisional: true`. Then
  `python3 tools/validate.py data`. A new `fits` word is one line in `run/power.ts FITS` and the validator's `_FITS`.
- **A trade:** one row in `survival.json trades.items` with a `do` that exists (grade, drill, crate, wayside, graft,
  salvage) and its numbers as fields. A new kind of trade (a new `do`) is one case in `tradeProblem`, one in
  `progressAction`'s `run/trade`, one in `runOptions`, and the validator's `_DO`; its gain must land through an engine
  door.
- **A training:** its amount is a field of `train` (the rest) or `training` (the training ground); a new kind (a door's
  own growth counter: Bonds, Figments, Shadow) is one branch in `trainKindProblem` (who may take it) and one in
  `trainDo` (the door it lands through), plus a row in `runOptions`.
- **A boon** (for a token or a graft): one row in `survival.json boons` (`pools` names a setting's `pool`); the graft
  of it is made by `run/power.ts` at load.

## 5. Proof

- Engine: `test/survival-progress.test.ts`, 24 tests: a Fine weapon's attack +1 and a Fine Evoker's Sigil roll and an
  Emanator's Outburst roll +1 (Masterwork +2; nothing from the pack, nothing on the weapon's own roll); a save forced
  through Brain Power or Empathy one harder; `setGrade` keeps mods, name and property, restores durability, refuses in
  words; Keen works in hand, not in the pack, not for the off-hand pistol's attack; Deep on its own door only;
  `addPractice`; the grade step at a shop at 1,500 and at a Forge at 1,200, refused past the stage's ceiling, twice in a
  visit, short of credits, at the wrong place; the Relic step (Forge only, stage 3, three properties that fit the cap,
  the pick checked, its price 6,500, its worth on the cap; a nearly full cap offers nothing past it); the chit; the
  Forge's stock (shared, "Sold to …") and fitting; the rest's and the training ground's trainings (free, the second
  300, no third, Devotion refused there); the shrine's rite (+4 Devotion XP), piece and token; every trade's gain and
  cost (the off-books step and its wear, the sparring's HP and drill, the crate's price and Elite pick, the wayside's
  practice once a stage, the graft's boon and max HP, the salvage's price); the rolled trades only; the gate's chit and
  the cache's pick of kit; Relic picks (capped, a property that fits, none past the cap, a Celestial roll a Relic, the
  property into the pack). `survival-run`, `run-state`, `survival-map`, `survival-encounter` still green.
- `npm run try`: a Sigilist with a Fine pistol and a Fine Evoker: the shot's `toHit` 3 → 4, the Sigil's terms
  `[{"v":1,"label":"fine focus"}]` (Standard: `[]`).
- **Golden tables: NO line moved.** The pins (`test/golden`, `replay-hash`, the lints, `item-ops`, `old-save`,
  `prim-tohit`, `balance-contract`, the oracles, `amount-literals`, `datatext`, `text-number-truth`: 32 files, 173
  tests) are green with nothing re-recorded: every focus in the tables and replays is Standard, so the focus reading
  adds nothing to any of them.
- Browser: `survival` 26 of 26 on port 8971 (`FAST=1`): the route through PHC-0001's map that passes a training ground,
  a shrine, a Forge, a crossroads and a rest; at each a choice clicked and checked in the state (drill +300 free; the
  shrine's piece; the Forge's Fine step for 1,200 and the second step shown refused; a trade; the rest's drill); a
  pick of kit taken after the gate.
- `npm run check`: see the final report (and section 7).

## 6. What is open

- **The Forge's full-screen frame** is the shop's (build step 4); the lead moves the Forge into it after the merge.
  The shop's grade step is `run/upgrade {place: 'shop'}`; `runOptions` already lists it at a shop node.
- **Boons:** seven of the thirteen are in data (what the token and the graft need); Primed, Quick Hands, Field
  Mending, Bandolier and Tithe (they need `run_ammo` / `run_credits`), Devout and the Boss's pick are step 5's. On
  stage 1's tile (AHOC, the discipline pool) the token is True Aim or Steady Breath; the streets and machine pools have
  no token yet.
- **The graft** rolls from the current tile's pool (the spec says the next tile's, which does not exist before the
  Boss; item 3026).
- **Gives** (rule 47, build step 4b): a property travels with its instance in a give already (the entry is copied
  whole); the receiver's cap check is 4b's.
- **Bonds' own save:** the Bond verbs (`tending.json`) force their saves `via: "empathy"`, so an Attuner's grade
  reaches them through the general reading (item 3002); a perk's save through Empathy does too.
- **A door with no growth counter** (Bonds, Figments, Shadow) takes drill or Devotion at a rest, drill at a training
  ground.
- **Measured**, not fitted: the ladder against income and the two paths are build step 9's simulated runs.

## 7. Calls made for Leon (each reversible)

1. The grade step is capped by the stage at a shop and a Forge as the picks are (stage 1 Fine, stage 2 Masterwork):
   the brief's "the stage's grade cap" (item 3008).
2. The focus reading counts every save forced through a door skill, a perk's too (item 3002).
3. A Visualizer's grade reaches the saves its Figments force, not a Figment's own attack (item 3001).
4. The shrine's piece is for an Atheist only; the Faithful keep the rite (item 3019).
5. "Better than what it wears" is "dearer than the piece worn there" (items 3013, 3028).
6. Balanced needs only its instance in hand (a swap has no weapon of its own; item 3012).
7. The graft rolls from this tile's pool (item 3026).
8. The kit picks block the map as the weapon pick does (the squad moves on when every pick is taken).
