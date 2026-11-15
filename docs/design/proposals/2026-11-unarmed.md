# The Open Hand: bare hands and gloves as one weapon family (proposal, full size)

15 Nov 2026, first draft. Status: **design, nothing built**. Every number below is PROVISIONAL and a data field
(`data/weapons.json`, `data/items.json`, `data/survival.json` as named); if accepted, the spec changes first, as a new
revision after 1.56, with its numbers as spec items 2250 to 2299. Every item is `adjudication: engine`. Sister drafts:
`2026-11-figments-2.0.md` (origin/wip/design-figments-2) and `2026-11-bonds-2.0.md` (origin/wip/design-bonds-2); this
one adds no door, reuses none of their P1 to P8 by need, and asks for as few pieces as it can (section 10).

Leon, 15 Nov 2026, verbatim: "currently playing monk is mega pain. You have no weapon, you want to play unarm so you
need both alpha skill in stregth and agi, but now you have no point in durability and you die in 2 hit, your dmg is
also supar at best, it's fucked." His rulings after: "code the monk class into the gloves and unarmed, maybe unarmed
and gloves gets it's own several exclusive technique that fits the monk achetype ... all 3 door system for agi str and
dur have notthing to do with monk", and "use the newly added modifier system to add a special condition in gloves and
unarm that give you more dodge when using these with light armor only."

So **the monk lives in the weapon type**: bare hands and gloves are one family (`mastery_family: unarmed`), and the
family carries its own techniques and its own defence as a **modifier item** on every row of it (`variant_mods`, held
only while the instance is in a hand: `effects/collect.ts instanceMods`, `hooks.ts heldOfChar`). No class code, no
door, no Momentum chain door, no Raw Power, Dexterity or Durability requirement.

## 1. The honest diagnosis (three lines)

1. **One fist, three skills.** Fists hit with Raw Power and scale on Strength only (`weapons.json fists.phys`); Dexterity
   (`also_scales`) is dead because the melee profile's skill slope is 0 (`rules.json output.profiles.melee.skill`), and
   Defense reads a third skill, Athletics (`character.ts defense`). The `monk` preset (Agility 4, Strength 3, Raw Power 3,
   Athletics 3) pays for all three and is good at none.
2. **A tenth of a weapon.** Fists deal 10 and read 42 to 57, knuckledusters 16 and 79 to 106, against the melee line 165
   and the maul's 203 to 235 (`2026-11-baseline-0.29.md` A.3). The only fist-only technique is Throw Down; Rabbit Punch
   and the fists' Grapple are `op: narrator` (nothing happens without a person).
3. **Nothing between you and a rifle.** Level 1 monk: HP 130, Defense 12, armour 0. A stage-1 Soldier (+3, service rifle
   30 × 0.78 = 23 a hit) lands 60% of its rolls: two Bursts a turn (six rolls) take 83, so two Soldier turns kill. The
   camp's unarmed archetype skips `fists`, gives the knuckledusters (60c) and offers no reason to wear armour.

## 2. The family (what a player holds)

The family is every `category: unarmed` row a character may carry (not `companion_only`). Rule a player reads: **"Open
Hand: with only fists or gloves in your hands, you fight as a monk."** The hands rule: both hands empty; a glove in the
main hand and the off hand empty; or a glove in each hand (the second glove asks the usual second-weapon gate,
`character.ts secondWeaponWhy`, and gives the paired attack). Another weapon, a shield or a focus in either hand turns the
family off (the gate is **P10**; slice 1 lives with the modifier held only while a glove is in a hand, section 11).

| # | Kind | Item | Rule a player reads | Data | Built from | Builds |
|---|---|---|---|---|---|---|
| 1 | gear | **Hand wraps** (new, 30c) | The camp's free fist weapon: 14 damage, 2 AP, light; carries the Open Hand. | `weapons.json hand_wraps`: `category unarmed`, `damage 14`, `ap_cost.attack 2`, `price_credits 30`, `hands 1H`, `mastery_family unarmed`, `phys {system melee, profile melee, props [light, bare], hits_with raw_power, scales_with [strength]}`, `variant_mods [open_hand]` | the row shape; `priceOf`; `run/loadout.ts archetypeWeapons` (the cheapest unarmed row is the free one: it becomes the wraps with no code) | yes |
| 2 | gear | **Force line** | Heavy-handed gloves: Strength, blunt, Throw Down. Knuckledusters 20 (was 16), Iron mitts 26. | `knuckledusters` damage 20, price 120; new `iron_mitts` (26, 500c, `props [light, bare, blunt]`, `teaches throw_down`); both `hits_with raw_power`, `scales_with [strength]`, `variant_mods [open_hand]`; the knuckledusters' `grants` (Rabbit Punch, `op: narrator`) retired for Jab (#9) | rows; `priceOf`; the existing Throw Down (`home [bare]`) through `teaches` | yes |
| 3 | gear | **Finesse line** | Quick gloves: Agility, light, point. Striking gloves 18, Kemizuchi strikers 24 (shops stock them at Fine grade). | new `striking_gloves` (18, 120c) and `kemizuchi_strikers` (24, 500c, `props [light, bare, point]`), `skill dexterity`, `hits_with dexterity`, `scales_with [agility]`, `variant_mods [open_hand, finesse_guard]` | rows (the hatchet already hits with one skill and scales on another); `priceOf` at the grade; `survival.json shop` stock by id | yes |
| 4 | gear | **The servo-fist stays** | A heavy fist in the family: its techniques, never its guard (#6 reads the light prop). | `hellraiser_servo_fist` gains `variant_mods [open_hand]` | the row | yes |
| 5 | rule | **One attribute is enough** | Bare hands and wraps hit with, and scale on, the higher of Strength or Agility. | `fists` and `hand_wraps`: `phys.hits_with {best: [raw_power, dexterity]}`, `scales_with {best: [strength, agility]}` | **P13** (until then: the lines of #2 and #3 are the choice, bought, not computed) | P13 |

The force and finesse rows are the "best of" without a primitive: a Strength monk buys the force line, an Agility monk
the finesse line, and neither needs the other alpha. P13 only makes the two rows that everyone holds (bare hands, the
camp's wraps) read the better attribute by themselves.

## 3. The defence (Leon's modifier, and the Slip)

| # | Kind | Item | Rule a player reads | Data | Built from | Builds |
|---|---|---|---|---|---|---|
| 6 | defence | **Open guard** | In light armour or none, blows aimed at you are at −2 to hit (−3 with finesse gloves). | `items.json open_hand` (category `mod`, no `mod_slot`, no price: never stocked, `run/progress.ts:193` and `run/rewards.ts:209` skip it) effect `{op: roll_mod, when: to_hit, if: {actor: foe, target: self, <P10>, <P12: 1>}, value: -2, label: "Open guard"}`; `finesse_guard` adds `value: -1` the same way | trigger `to_hit` (the holder as the target: `if` names `target`, `runTriggered`'s "whose event" rule), op `roll_mod`, predicates `actor`, `target`; the attacker's preview lists the term by its label | P10, P12 |
| 7 | reaction | **Slip** | Once a round, the first blow that lands on you is halved: SLIP. An Answer you can switch off. | `open_hand`: `{op: damage_mult, when: taking, if: {target: self, actor: foe, by_hit: true, answer_on: slip}, value: 0.5, limit: {reaction: 1, kind: protect}, fx: {k: slip}, say: "{self} slips the blow."}` | trigger `taking`, op `damage_mult`, predicates `by_hit`, `answer_on`, the reaction `limit` (Share a Hit's exact shape, `skills.json camaraderie`), an effect's `fx` | yes |
| 8 | reaction | **Counter** | A melee blow that misses you leaves its maker Exposed (−2 Defense) for a round. Once a round. | `open_hand`: `{op: condition, when: miss, if: {actor: foe, target: self, melee: true}, target: actor, condition: exposed, skip_save: true, limit: {per: per_round, n: 1}, fx: {k: counter}}` | trigger `miss`, op `condition` (`target: actor`), `conditions.json exposed` | yes |

Slip shares the one reaction a round with Riposte, Parry and the Skirmisher's Duck and Roll: that is a decision (the
Answer switch, `phys.answers`), not a stack.

**Hits to die, level 1, stage-1 foes** (hand-worked from `enemies.json` and `weapons.json`; to be measured, section 8):

| Fighter | Defense / armour | Soldier, service rifle (+3, 23 a hit) | Minion, service pistol (+1, 20) | A Soldier turn (two Bursts) |
|---|---|---|---|---|
| Monk today (no armour) | 12 / 0 | 6 hits, lands 60% | 7 hits, 50% | 83 (dead in 2 turns) |
| Light armour, buckler, gladius (the comparator) | 14 / 5 | 8 hits, 50% | 9 hits, 40% | 54, less its Guard |
| Monk, light armour, Open guard, Slip | 14 eff. / 5 | 8 hits, 50%, plus one halved a round | 9 hits, 40% | about 45 |
| Monk, no armour, Open guard, Slip | 14 eff. / 0 | 6 hits, 50%, plus one halved | 7 hits, 40% | about 58 |

So light armour with the Open Hand matches the shield fighter (about three Soldier turns), and going bare is a real
cost, not a death sentence. The camp sells Light armour (Class 1, 150c, `loadout.stock`) inside the 300 budget.

## 4. Things to do on a turn (the family's own techniques)

Every one is DATA on `open_hand` (or a line modifier), so the hundredth glove needs no code. Attack forms are **data
toggles on `combat/attack`** (Classes 3.0 P12: `toggles: [{id, name, on, if, effects}]`, shown as chips by
`togglesFor`, their effects lifted with `if: {toggle: [id]}`; the Shadow's Break is the worked example). One form an
attack.

| # | Kind | Item | Rule a player reads | Data (sketch) | Built from | Builds |
|---|---|---|---|---|---|---|
| 9 | form | **Jab** | 1 AP less, half damage. | toggle `jab`: `cost_mod {when: attack, value: -1, min: 1}`, `damage_mult {when: dealing, value: 0.5}` | toggles, `cost_mod` on `attack`, `damage_mult`; retires Rabbit Punch's `op: narrator` | yes |
| 10 | form | **Palm** | ×0.6; on a hit it saves (Body) or is pushed 1 tile and Off-balance (−1 AP). | toggle `palm`: `damage_mult 0.6`; on `hit`: `condition off_balance {target: target}` (no `via`: the blow's own skill), then `displace {how: push, tiles: 1, if: {target_has: [off_balance]}}` | `condition`, `displace` (the Bonds draft's save-then-act pattern), `forced_movement` | yes |
| 11 | form | **Sweep** | +1 AP, ×0.4; a hit puts it Prone (never a Boss). | toggle `sweep`: `cost_mod +1`; `damage_mult 0.4`; on `hit`: `condition prone {target: target, if: {target_not_tier: [boss]}}` | `condition`, `target_not_tier`, `conditions.json prone` | yes |
| 12 | form | **Snatch** | ×0.5; a hit makes it save (Heart) or drop its weapon (never a Boss). | toggle `snatch`: `damage_mult 0.5`; on `hit`: `condition disarmed {target: target, if: {target_not_tier: [boss]}}` | `condition`, `conditions.json disarmed` (the weapon lands in the pile) | yes |
| 13 | strike | **Flurry and the pair** | Flurry comes with every glove (three strikes, light); two gloves also strike as a pair. | `open_hand`: `{op: stat_mod, stat: "technique:flurry", value: 1}` and `technique:grapple`, `technique:trip` the same way | stat family `technique:<id>` (the Breaker's `technique:riposte`); the existing Flurry handler and its bare line; the paired volley (`mode: paired`, `asVolley`) | yes |
| 14 | meter | **Flow** | Each family hit gives 1 Flow (3 at most a turn); it is gone when your turn ends. | `actions.json resources.flow {name Flow, on unit, path res.flow}`; `open_hand`: `resource {when: hit, if: {melee: true, <P10>}, resource: flow, value: 1, limit: {per: per_turn, n: 3}}`, `resource {when: turn_end, resource: flow, value: zero}` | ops `resource`, `limit`; triggers `hit`, `turn_end` | **P9** |
| 15 | finisher | **Closing Strike** | Spend all Flow: ×(1 + 0.3 a Flow), and a hit makes it save (Body) or be Dazed. | toggle `closing`, `if: {self_has_res: [flow]}`: `damage_mult {when: dealing, value: {base: 1, per: [{of: "res:flow", value: 0.3}]}}`; on `hit`: `condition dazed {target: target}`; `resource {when: acted, resource: flow, value: all}` | number block `res:flow`, `damage_mult`, `self_has_res`, `condition`, `resource` (`all`) | **P9** |
| 16 | action | **Breath** | 1 AP, once a turn: end your newest Body harm and be Guarded (+2 Defense) this round. | `open_hand`: `grant_action {action: open_breath, ap: 1, uses: per_turn, if: {<P10>}, effects: [{op: cleanse, family: body, count: 1, newest: true}, {op: condition, condition: guarded, rounds: 1, skip_save: true}]}` (it prices itself by its `ap`, as the Bonds orders do) | `grant_action`, ops `cleanse`, `condition`, `conditions.json guarded` | yes |
| 17 | rule | **Bare hands are in it** | With both hands empty you are the Open Hand too, at the fists' damage. | `fists.variant_mods [open_hand]` | **P11** (an empty pair of hands is the `fists` instance for the modifier reader) | P11 |

What a monk's turn looks like (6 AP, Iron mitts): Palm the rifleman off the ledge (2), Jab (1), Jab (1), Closing Strike
at 3 Flow (2): ×1.9 and a Daze save. Or, wounded: Breath (1), Sweep (3), Jab (1), and Slip waits for the reply.

## 5. Effects (pure SVG and CSS, `apps/web/src/game/fx/`)

The acting token moves first (its lunge or sway leads, `melee-techniques.ts leadMoves`), the target answers on the
beat, everything is paced by the combat speed, nothing plays under Reduce motion (the word still shows), and every
colour has its word. Inks are `MFX_INK` (force `#F68A38`, foot `#E3BF51`, guard `#F2A54A`, cut white). A new file
`fx/openhand.ts` beside `figments.ts`, its handlers registered as `melee-techniques.ts meleeTechHandlers` are; the kind
of each moment is the data's `fx.k` or the technique event's toggle id (the engine names it; the client chooses no rule).

| Moment | Acting token | What travels | Target | Word |
|---|---|---|---|---|
| Any family hit | 4 px jab toward the target, 90 ms | nothing | two concentric rings at the contact edge (r 6 to 14 px, 1.5 px stroke, force ink, 220 ms fade) | the damage number |
| Jab | 3 px jab, half the ring | — | one ring | JAB |
| Palm | 6 px shove, a flat 10 px bar at the hand | a 1 px arc pushed ahead 1 tile | slides with `displace`, a short chevron behind it | PALM, then OFF-BALANCE |
| Sweep | drops 3 px, a 90° arc (foot ink) along the floor | — | tips 12° and falls (the existing `fall` beat) | SWEEP, PRONE |
| Snatch | quick hook | a small weapon-glyph flicks to the pile tile (the existing pile draw) | — | DISARMED |
| Flurry | three jabs; two ghost copies of the token at 40% and 20% opacity offset 3 px along the line (afterimages), gone in 160 ms | — | a ring per hit | FLURRY ×3 |
| Flow | — | — | up to three white ticks over the acting token (Echo white: still to do), cleared at turn end | FLOW 1 / 2 / 3 |
| Closing Strike | holds 120 ms (the ticks pull into the fist), then lunges | a straight 2 px shock line from fist through the target, extending 1 tile past it, white, 140 ms; one more px of width a Flow spent | three rings, a 4-spoke star when Dazed | CLOSING, then DAZED |
| Slip | sways 6 px off the line and back (ease-in-out, 260 ms) | the blow's tracer bends by the sway | — | SLIP and the halved number |
| Counter | a small step back | — | a broken ring (stroke-dasharray 3 3) on the attacker | EXPOSED |
| Breath | still; a ring contracts from 1 tile to the token (guard ink), 500 ms | — | — | BREATH, GUARDED |
| Open guard | a faint half-ring before the token, facing the nearest foe, while it holds | — | — | the attacker's preview term "Open guard −2" |

## 6. Growth (a real choice)

| # | Item | Rule | Data | Built from |
|---|---|---|---|---|
| 18 | **Force or finesse** | At every shop the next glove is a fork: the force line (Strength, blunt, Throw Down, more damage) or the finesse line (Agility, point, a deeper guard). Switching costs the glove you leave. | the rows of #2 and #3; `survival.json shop` stock and the Forge's grade step (`priceOf`, `grade_up`) | rows; `priceOf`; the grade step |
| 19 | **Forms by grade** | Wraps know Jab, Palm and Breath; a line glove adds Sweep (force) or Snatch (finesse); Closing Strike comes with any line glove. | a second modifier per line (`force_forms`, `finesse_forms`) holding those toggles; `open_hand` holds the shared ones | `variant_mods` (two per row), toggles |
| 20 | **Mastery and level** | The family's damage grows with level (the Level term `deal`) and the glove's grade; Weapon Mastery Unarmed (Hard Hands, Clinch, Bell Ringer) sits on top, as perks sit on a class line. | `weapon_mastery.json unarmed`, `rules.json output.level` | existing |

## 7. Classes and the camp

It is a way to play a Body character, not a tenth class. **Breaker** (Strength): Lunge, Shove, Riposte, Finisher and
Unstoppable all work with fists; Riposte competes with Slip for the reaction. **Skirmisher** (Agility): rank I is
gun-shaped (Fire Discipline, Speed Loader: only its pick-up cut helps), rank II's Duck and Roll is the ranged twin of
Slip and shares its reaction. Neither class is changed (they are weapon-neutral; a gun-shaped rank I is the class
draft's business). **The camp:** the unarmed archetype's free weapon becomes the Hand wraps by price (no code); taking
no weapon stays legal and gives nothing back (rules 1.52), and with P11 bare hands are the Open Hand at fists' damage.
A monk spends 150 of the 300 on Light armour. No extra budget: the wraps are the free weapon.

## 8. Balance

The line: all in, the family's best glove at its grade reads **at the melee line**, `balance.ceilings.melee.allin` 165,
and under the maul's 203 to 235 next to the target; perks on top. The dials are the rows' `damage` (14 / 20 / 26 / 18 /
24 / 30), the forms' multipliers (Jab 0.5, Palm 0.6, Sweep 0.4, Snatch 0.5), Closing Strike's 0.3 a Flow, Open guard −2
and −1, Slip 0.5. Measure: `REFIT_MEASURE=1 REFIT_SYSTEMS=melee npx vitest run --root packages/engine
test/balance/refit-measure.test.ts --silent=false` with the new rows; a `solo_monk` row in
`test/balance/survival-run.ts` (the `monk` preset, wraps and Light armour; then finesse and force) beside `solo_melee`
(67% / 17% stage 1); the hits-to-die table of section 3 as `npm run try` scenarios (a monk in Light against two
Soldiers, then a shield fighter). Goldens that move on purpose: the knuckledusters' damage, and with P13 every fists
row (`golden-damage*`, re-record with the reason).

## 9. Saves

Nothing new is saved. Weapon ids stay (`fists`, `knuckledusters`, `hellraiser_servo_fist`); their modifiers are read
from the rows each time (`instanceMods` reads `variant_mods`), so an old character holding knuckledusters is an Open
Hand at once. Flow lives on the unit for a turn. An Answer switch list without `slip` reads as on (`answer_on`). Proof:
`test/old-save.test.ts` loads the three fixtures, one with knuckledusters in hand, and its attack shows the forms.

## 10a. Built from (every rule against its primitive, by name)

| Rule | Primitive | Where |
|---|---|---|
| The family's rules ride its rows | `variant_mods`, `instanceMods`, `heldOfChar`, `handInstances` | `effects/collect.ts`, `effects/hooks.ts`, `character.ts` |
| Rows, prices, the camp's free weapon | `priceOf`, `archetypeWeapons` | `credits.ts`, `run/loadout.ts` |
| Open guard | trigger `to_hit`, op `roll_mod`, predicates `actor`, `target` | `effects/triggers.ts` |
| Slip | trigger `taking`, op `damage_mult`, predicates `by_hit`, `answer_on`, limit `reaction` | `effects/triggers.ts`, `tactics.ts react` |
| Counter | trigger `miss`, op `condition`, predicate `melee`, condition `exposed`, limit `per_round` | `data/conditions.json` |
| Jab, Palm, Sweep, Snatch, Closing Strike | data toggles (`togglesFor`, predicate `toggle`), ops `cost_mod`, `damage_mult`, `condition`, `displace`, `resource`; predicates `target_has`, `target_not_tier`, `self_has_res`; triggers `attack`, `dealing`, `hit`, `acted` | `effects/actions.ts`, `data/conditions.json` (`off_balance`, `prone`, `disarmed`, `dazed`) |
| Flurry, Grapple, Trip come with the gloves | data `stat_mod` of the stat family `technique:<…>` | `physical/core.ts` |
| Flow | op `resource` (`zero`, `all`), triggers `hit`, `turn_end`, limit `per_turn`, number block `res:flow` (the resource is **P9**) | `effects/triggers.ts sourceOf` |
| Breath | data `grant_action`, ops `cleanse`, `condition`, condition `guarded` | `effects/actions.ts` |
| Effects | an effect's `fx` field, `emitFx`, `meleeTechHandlers`, `leadMoves` | `combat.ts`, `apps/web/src/game/fx/` |
| Damage | the melee profile (`output.profiles.melee`), `weaponMult`, Level term `deal` | `data/rules.json`, `character.ts` |
| Balance | `refit-measure`, `survival-run.ts`, `balance.ceilings.melee` | `packages/engine/test/balance/` |

## 10. Needs a new primitive (general pieces only; each the lead's to approve)

None of P1 to P8 is needed (no found list, no practice ledger, no seat, no shared door cost site, no shape, no
exclusion, no `onto`, no fork). New:

9. **P9, a resource row `flow`** (`actions.json resources`, `res.flow` on the unit), as the Shadow got `shadow` and the
   Mender `ledger`. A per-turn meter any system may earn and spend. `rev4-primitives.md` counts resource rows among the
   closed-list rows that need no mechanism: it is one data line for the lead to approve.
10. **P10, predicate `self_hands`** `{props: [..], empty: true}`: every hand is empty or holds a weapon whose
    `phys.props` include all named (a focus or a shield fails). Any "with only X in your hands" rule.
11. **P11, the empty pair of hands is the `fists` instance** for the modifier reader (`character.ts handInstances`
    lists `fists` when both hands are empty; `gearAt` and `with_this` unchanged). Any rule carried by bare hands.
12. **P12, predicate `self_armour_at_most`** (number): the holder's armour Class (`c.armourClass`; a unit's from its
    build) is at most this. Any light-armour rule. No existing piece says it: `wearing:` names an item and Classes are not
    items; `isLightArmour` (`gear.ts`) is about weight for the in-fight swap. Fallback with no approval: Open guard holds
    in any armour (Leon's "light armour only" waits).
13. **P13, `best` on a weapon's `phys.hits_with` and `scales_with`**: the higher-scoring of the named skills or
    Attributes (one reader in `physical/data.ts hitsWith` / `scalesWith`, read by `weaponMult` and the to-hit term).
    Any force-or-finesse weapon.

No new trigger, op, stat, cost site or hook: the forms are data toggles, Breath a `grant_action` that prices itself.

## 11. Build order (each slice ships alone)

| Slice | A player gets | Proof (the reducer, real actions) |
|---|---|---|
| **1 (tonight, about four hours, no new primitive)** | The rows (#1 to #4, the knuckledusters at 20, `variant_mods`); `open_hand` with Slip, Counter, Jab, Palm, Sweep, Snatch and Breath, and Flurry, Grapple and Trip that come with it; Rabbit Punch's and the fists' Grapple's narrator ops retired; the effects of section 5 for those moments and for what exists (impact rings, Flurry afterimages, SLIP, EXPOSED); `art/briefs/ART-REQUESTS.md` updated. Held while a glove is in a hand. | each form through `sendDescriptor` with its toggle on; Slip on a real blow (`npm run try` "monk in wraps against a Soldier"); the camp's free weapon is `hand_wraps` (`archetypeWeapons`); `npm run check`; golden-damage re-recorded for the knuckledusters only |
| 2 | Open guard (P10, P12), and the family off with another weapon in the other hand | the to-hit term through an enemy's attack; off in Medium armour |
| 3 | Flow and Closing Strike (P9) | three hits then Closing Strike, Flow 0 after; the shock line |
| 4 | Bare hands in it (P11) and one attribute is enough (P13) | a disarmed gunner punches with Dexterity; fists goldens re-recorded on purpose |
| 5 | The finesse and force forms split (#19), shop stock, the `solo_monk` measure and the fit | `survival-run.ts solo_monk`; refit-measure melee |

Every slice keeps the left panel (the sheet, its tabs, Level up) and the mode's right panel; the fight screen is
excepted as today.

## 12. Art

**Weapon icons** (monoline mode, `art/style-guide/weapon-icons.md`, 64 grid, one silhouette and a few inner lines):
Hand wraps (a wrapped fist, the wrap's end trailing), Striking gloves (a slim open glove, two seam lines), Kemizuchi
strikers (the same with a short point at the knuckle), Iron mitts (a blocky mitt, three plate lines). **Wick white-ink
icons** (`art/briefs/ART-REQUESTS.md`), one per form: Open Hand (Wick standing side-on, one palm raised flat), Slip
(Wick leaning out of a line, the line bending past), Counter (Wick stepping back as a fist sails short), Jab (Wick's
short straight punch), Palm (Wick's two-hand push, a small figure tipping away), Sweep (Wick low, one leg arcing along
the floor), Snatch (Wick's hand closing on a falling blade), Breath (Wick still, eyes closed, a ring around him),
Closing Strike (Wick mid-lunge, three ticks gathered at the fist), Flow (three ticks above Wick's head). Monoline
placeholders until delivered.

## 13. Questions for Leon

1. **Bare fists' own damage** stays 10 (everyone's fallback: a disarmed gunner, the bayonet's rule), with the wraps
   free at the camp as the monk's real start? Recommended: yes; raising `fists` raises every disarmed character.
2. **The servo-fist** is bare and heavy: in the family for its forms but without Open guard (the guard reads the light
   prop)? Recommended: yes.
3. **Slip shares the one reaction** with Riposte and Duck and Roll (a choice through the Answer switch)? Recommended:
   yes; a free extra reaction would put the monk over the shield fighter.
4. **Sweep's Prone has no save** (the Prone row has none; it costs +1 AP and ×0.4 instead)? Recommended: yes for now;
   a saved Prone would need the Trip technique's handler, which is code.

## Slice 1, built (15 Nov 2026, wip/lane-0.29-monk-1)

Spec: "Rules 1.56 (Balance 2.0), the unarmed fighter (slice 1)", items 4360 to 4364. Changed from the draft by the lead's
plan: the Open Hand's Slip is **Sway** (Shadow has a Slip), and Sway, Counter, Open guard and Breath wait for P14 (a
carried modifier is a whole item and may answer its holder's own defence) and P15 (`self_holds` hands `{props, only}`
and body `{armour_at_most}`). Built:

| # | Item | Built | Where |
|---|---|---|---|
| 1-4 | Hand wraps 14/30c, Knuckledusters 20/120c, Iron mitts 25/500c, Striking gloves 17/120c, Kemizuchi strikers 21/500c; every glove and the servo-fist carry `variant_mods: [open_hand]` | yes | `data/weapons.json` |
| 9-12 | Jab, Palm, Sweep, Snatch as data toggles on `combat/attack`, every effect `with_this`; one hold a turn (`limit {per_turn, n 1, key form}`); each names itself (`fx {k: stance, what, word}`) | yes | `data/items.json open_hand` |
| 13 | Flurry, Trip, Grapple come with Bare (`comes_with`); a perk's technique (Grapple) honours its row's `comes_with` | yes | `data/techniques.json`, `physical/core.ts usable` |
| — | Rabbit Punch's and the fists' Grapple's narrator ops retired | yes | `data/weapons.json` |
| — | The camp's free fist weapon is the Hand wraps (cheapest by price, no code) | yes | `run/loadout.ts archetypeWeapons` |
| 6-8, 16 | Open guard (Leon's light-armour dodge), Sway, Counter, Breath | no: P14, P15 | slice 2 |
| 14-15 | Flow, Closing Strike | no: P18 | slice 3 |
| 5, 17 | One attribute on bare hands, bare hands in the family | no: P10, P19 | slice 4 |

Effects (`apps/web/src/game/fx/openhand.ts`, wired in `play.ts` before the Figments' wrapper): two impact rings on a
glove's hit (Strength ink), afterimages of the striker on a Flurry's strikes, each form's shape (Palm's bar and pushed
arc, Sweep's floor arc in Agility ink, Snatch's hook, Jab's small ring) and its word on the target, PRONE when Sweep's
Prone lands, OFF BALANCE / DISARMED / RESISTED from the existing `cond` events. Off under Reduce motion (words stay).
**Events with no effect of their own:** Sweep's Prone draws no `cond` event (a flag condition), so the data's
`fx {what: swept}` names it and the client finds its target as the striker's last blow (P13, `fx.on: target`, makes it
direct).

## Slice 1, measured

**The melee measure** (`MELEE_MEASURE=1`, all in, Masterwork, the optimised blade build; N 8 to 12; percent of the plain
rifle at levels 1 / 5 / 10 / 20). Before: Knuckledusters 76 / 78 / 104 / 97, Servo-fist 128 / 128 / 156 / 178; the
Legion gladius (light melee comparator) 179 / 172 / 208 / 153.

| Glove (after) | Hits with | L1 | L5 | L10 | L20 |
|---|---|---|---|---|---|
| Hand wraps (14) | Raw Power | 63 | 71 | 71 | 65 |
| Knuckledusters (20, was 16) | Raw Power | 95 | 91 | 110 | 102 |
| Striking gloves (17) | Dexterity | 90 | 115 | 136 | 110 |
| Iron mitts (25) | Raw Power | 116 | 104 | 133 | 126 |
| Kemizuchi strikers (21; 24 read 139 / 173 / 194 / 168) | Dexterity | 122 | 148 | 168 | 140 |
| Hellraiser servo-fist (30, unchanged) | Raw Power | 128 | 128 | 156 | 178 |

The best glove of each line sits at the melee line (125 percent, the ceiling 165) and under the maul's 203 to 235. The
measure's policy does not use the forms (they trade damage for AP or control). The refit-measure contract's melee
system does not read these rows (`npm run check` balance contract green).

**The Survival simulator** (new cell `solo_monk`: the melee build with the camp's free Hand wraps; gear route, 6 seeds,
3 stages at most): solo_monk clears stage 1 on 0 of 6 (lost at depth 4 to 11, mean 7.8); solo_melee (the heavy blade)
clears it on 2 of 6 (mean depth 9.3). Slice 1 gives the fist fighter its weapons and its choices, not its survival:
an unarmoured monk is still a Soldier's two turns (HP 130, Defense 12; section 3's table is unchanged). The defence is
slice 2 (P14, P15), and it is the slice that decides whether the monk lives.

**Hand-back (the brief's stop rule):** a bare-handed enemy of a tier with a technique list (Soldier and up) now takes
Flurry, Trip and Grapple (they come with Bare): `npm run try` with an Elite holding `fists` opens with Lunge then
Flurry. No enemy in data carries fists (only a companion row, which makes plain attacks), a Disarmed enemy picks no
technique, and the replay guard is unchanged; the lead rules whether `comes_with` should reach an enemy's own list.
