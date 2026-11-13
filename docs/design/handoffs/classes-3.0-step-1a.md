# Classes 3.0, step 1a: the first half of the engine primitives (hand-off)

Built 13 Nov 2026 on the worktree branch `worktree-agent-a933e3a39076f430b`, started from `claude/charming-gauss-hbq4n0`
(live 0.25.0 plus docs). Not pushed; no version bump. Rows 1 to 6 of `docs/design/rev4-primitives.md` section 5: the
batch rows and **P2** `acted`, **P3** number blocks, **P1** `react()`, **P4** conditions are items, **P5** `targets`,
**P7** sight words. Spec: rules 1.28 in `docs/rules/PHC-Core-Rules-v1.0.md`, items 1750 to 1756.

One commit a row (plus the pin commit before row 1 and the spec commit). Checks at the close: `python3 tools/validate.py
data` 0 errors; `npm run check` ALL GREEN; `npm run e2e -- smoke physical physical-pack reload turn-order two-players
faith-pg` green (two-players failed once beside the others on its fog check and passed alone, twice: a suite that does not
share a loaded machine, see section 6).

Fixtures for every primitive: `packages/engine/test/fixtures/classes-3.0-primitives.json` (perks, relics, condition rows;
test only). Tests: `test/prim-acted.test.ts`, `prim-numbers`, `prim-react`, `prim-conditions`, `prim-targets`,
`prim-sight`, and `prim-validator` (the validator accepts every new word and refuses each misuse, on a copy of data/).

## 1. The primitives as built

### Row 1: the trigger `acted` (P2) and the closed-list rows

| Name | Shape | Lives in |
| --- | --- | --- |
| trigger `acted` | hook `acted`, ctx `{u, t, action, tile, toggles, mode, ap?}`; actor `u`, target `t`, self actor | `effects/triggers.ts`; door `combat.ts acted(cb, u, o)` |
| trigger `spot` | the spot roll's hook `{by, u, die, mod, tn, cancel}`; the holder is the Hidden one (self target) | `effects/triggers.ts`; `roll_mod` (mod, or `roll: "tn"`) and `cancel` take it |
| predicate `by_cover` | words `from`, `to` (every end named must be next to standing cover) | `combat.ts nextToCover` |
| predicate `patron` | words: patrons.json ids (the holder is Faithful to one) | `effects/triggers.ts patronIdOf` (reads the belief without importing faith.ts: see section 4) |
| `deal` fields `via`, `nonlethal` | `via`: the source skill the blow counts as (`withVia`); `nonlethal`: `applyDamage`'s flag (the last HP subdues) | `effects/triggers.ts` |
| amount block `heal_kind` | the heal's kind for `heal_in` (`tending`, `prayer`…), passed by `mend` | `effects/amounts.ts AmountBlock`, validator |
| resource rows | `resource` reaches every `data/actions.json resources` row through `effects/cost.ts resGive`: `max` (a path: MP's `mg.mpMax`), `needs` (a path that must be set: MP's `mg.emanator`), `setter` (Pressure's `addPressureTo`, registered by `physical/pressure.ts` with `setResSetter`) | `effects/cost.ts`, `data/actions.json` |

`acted` is fired **once by the reducer** (`game.ts combatAction`) after the unit's own action succeeds, named by
`actedName`: a perk or class action's own id (`effects/actions.ts perkActionId`), a technique's id, a move's kind,
`attack` for an attack (its mode in `ctx.mode`), else the verb's cost site (`cost.ts actionName`). Not fired for ending
the turn, declining, speaking, attempting. **Analyze fires its own** (`analyze()` calls `acted`): it runs inside other
actions (Case File) and on the area map, where its listeners were. **A grant_action's nested `when: "acted"` effects** are
lifted onto the item with `if.action` = that action's id (`effects/collect.ts liftActed`); the default action does not run
them a second time. Example: `{ "op": "grant_action", "action": "ward", "ap": 1, "effects": [ { "op": "mend", "when":
"acted", "amount": "ward", "target": "target" } ] }`.

**Replaced and deleted:** the private `analyze` hook (HookName and HOOK_ABOUT); its five listeners (`classes/j.ts` Case
File, `classes/rev3.ts` Read, `perks/f.ts` True Name's studied list and Case Closed, `perks/g.ts` Cold Read) moved onto
`acted` with `ctx.action === 'analyze'`. Pinned first: the item-ops table got three situations (`analyze`, `brace`,
`vanish`) recorded on the unmodified engine (commit `937933d`); they never moved after.

### Row 2: number blocks and amount sources (P3)

`{ "base": 1, "per": [ { "of": "res:shadow", "value": 0.15 }, { "of": "event:ambush", "value": 0.5 } ], "min": 0, "max": 2 }`
may stand for any numeric field of an item op (`value`, `value_pct`, `max`, `add`, `set`, `min`, `at_least`, `tiles`,
`rounds`). `effects/amounts.ts numberOf(block, src)` and `isNumberBlock`; the item-op runner reads each `of` through
`effects/triggers.ts sourceOf`: `res:<id>` (the holder's resource now: a class resource, else an actions.json row),
`event:<field>` (`amount` is the damage or heal; any other payload field, true as 1), `self:` / `actor:` / `target:<field>`
(a unit field in snake case, `max_hp`; a condition id: 1 while it has it). An **amount block's** per-point parts read the
same sources (`countsOf`). Op `resource` takes `value: "all"` (spend all) and `"zero"` (lose all). A handler reads its own
effect's number (a plain number or a block) with `effects/num.ts effNum(h, op, field, counts)`.

**Moved onto it:** Finisher's multiplier (`classes.json` move pool `finisher`: `damage_mult` value `{base 1, per
momentum_spent 0.2, max 2}`; the handler's `1 + 0.2 × n` and its `Math.min(5, …)` are gone) and Reactive Plate's cut, shed
and count (read from its effects; the meter effect gained `every: 3`; both texts read their numbers through placeholders).
`lint-item-ops` literals: `classes/i.ts` **98 → 90**. `tools/text_numbers.json` shrank by the Finisher's "100%".

### Row 3: `react()`, the one door of every reaction (P1)

`react(cb, u, { kind, event?, spend = 1, payer?, window? }, fn?) → boolean` in `tactics.ts`. `kind` is `attack`, `move` or
`protect`. In order: refuses an answered `event` (one reaction a unit an event: an attack is `combat.ts attackEvent()`,
a walk's step `step:<mover>:<from>><to>`); asks `canReact(cb, u, kind, n)` (no reaction inside a reaction, the kind not
forbidden, a reaction left: the unit's own, then a Cue's, then a Many Hands donor's); opens the reaction window when the
site gives one (`window: {kind, mover, id, at, rng}`, the same `reaction_window` payload as before: Killzone, the openers,
links and Storm still read it); takes `spend` from the `uses` cell (key `reaction`, scope `reaction`) of `payer ?? u`; fires
the trigger `reaction` (ctx `{u, kind, event, payer}`); runs `fn` with `cb.reacting = {unit, kind}`. Data: an item op whose
`limit` is `{ "reaction": 1, "kind": "protect" }` IS a reaction (the runner wraps its ops in `react()`); the trigger
`reaction` with predicate `how` (now also the reaction's kind). Burning reactions that are not reactions (Dread, Rewrite,
Order) is `loseReactions(cb, u, n | 'all')`; a refused Call gives it back with `refundReaction`. An Answer's kind is its
data: `techniques.json` `reaction` on the five Answers (`physical/core.ts answerKind`).

The rulings (rules 1.28 section 1): `canReact` is false for everyone while `cb.reacting` is set; Suppressed is a row's
`forbid` `reaction` with `kinds` (`condtable.ts CondMods.noReact`, read by `tactics.ts reactBlocked`), and Pressure's
Suppressed state registers the same rule (`addReactBlock` in `physical/pressure.ts`). `maxReactions` no longer returns 0
under Suppressed. `canAnswer`'s protective list is gone (the kind decides).

**Replaced and deleted:** `useReaction` (every call site now `react()` or `loseReactions`), `u.reactUsed` and
`u.reactedRound` (read once from an old save by `oldReactions`; the type keeps them for that), the hand-built reaction
windows (the only `emit(…, 'reaction_window')` left is in `react()`). Sites moved: the opportunity attack, Overwatch,
`fireWatch`, `answer`, Heart Overwatch, Dread, a Call as a reaction (its resolution is now `calls/core.ts speak`, run as
the reaction), Order, the Fighter's Riposte, Brace's Interpose, Drink It In, Rewrite, Shrug It Off, Anchor, Duck and Roll,
the Strike Call's dive, Adamantile Plate (Interpose and plate), Share, Catch, Dance of Iron. New lint in
`lint-costs.test.ts`: no `useReaction(`, no window emitted outside `tactics.ts`, `reactUsed` / `reactedRound` only in
`tactics.ts`, `combat.ts` (the type) and `game.ts` (the sandbox keep list).

### Row 4: conditions are items (P4)

A `data/conditions.json` row is an item its bearer holds (key `condition:<id>`, kind `condition`): its effects whose
`when` is a trigger and whose op is an item op run through `runTriggered` with the bearer as holder and the giver
(`u.condBy`) as `h.source` (`{source}` in a `say`); its `stat_mod` (no `when`) of a declared stat answers `statQuery`,
except the ten stats `condtable.ts` already reads from the row (`COND_TABLE_STATS`: Defense, Movement, Vision, AP…, so
nothing is counted twice). Lives in `effects/triggers.ts` (the index `condIndex`, rebuilt when rows change) and
`effects/hooks.ts emit` (a unit's conditions run after its items) and `statQuery`. Rows can be added at run time:
`hooks.ts addConditions(rows)` / `clearAddedConditionRows()` over `condtable.ts addConditionRows`. The validator checks a
row's item ops. Example (Traced): `{ "op": "stat_mod", "stat": "always_seen", "value": 1 }` on the row.

**Not moved:** `classes/i.ts assassin.toxin` (see section 3).

### Row 5: the unit set `targets` (P5)

`targets: { of: self | actor | target | tile, side: foe | ally | side | any, within: n, shape: burst | aura | cone | line,
seen: bool, alive: bool, downed: bool, max: n }` on any op: the op runs once for each unit of the set, as its target, in
the fight's order (`kit.ts unitsIn`). `within` alone is a burst; `aura` leaves the centre's tile out; a cone or a line runs
from the centre toward the event's target (else its actor) and needs `within` as its length; `seen` is the holder's side's
sight (`sideSees`); `alive: false` is the Downed only; `downed: true` adds them. No `within` and no shape: the whole
field. An empty set runs nothing and says nothing. Lives in `effects/triggers.ts` (`TargetSet`, `TARGET_FIELDS`,
`targetsProblem`, `selectUnits`); the closed list is `data/effect_ops.json item_ops.targets`. Example: `{ "op":
"condition", "when": "kill", "condition": "shaken", "targets": { "of": "target", "side": "foe", "within": 3 } }`.

**Not moved:** every handler the list names (section 3). New ratchet in `lint-foundations.test.ts`: lanes that walk
`cb.units` by hand, counted per file (perks and classes; 131 in all), only ever lower.

### Row 6: sight words (P7)

`tactics.ts sightOf(cb, u, by?) → [seen | unseen, in_view | out_of_view]`: to the other side, `seen` is
`sideSeesUnit` and `in_view` is `seenByFoes`; to one unit `by`, `in_view` is `unitSees(by, u.pos)` and `seen` that and not
Hidden. Stat `always_seen` (>0): seen and in view wherever it is. Predicates `self_sight`, `actor_sight`, `target_sight`
(words; any named holds). A unit's `eyes: false` (`combat.ts unitSees` returns false: it sees nothing, its side sees
nothing through it). Example: `"if": { "self_sight": ["out_of_view"] }`.

**Replaced:** Vanish's `requires_state: "unseen_by_enemies"` is its grant_action's `"if": { "self_sight":
["out_of_view"], "self_lacks": ["marked", "hidden"] }` (the validator now checks a grant_action's `if`); its handler
still enforces it until P6 runs a grant_action's `if`.

## 2. The golden lines that moved, and the replays

**For the two rulings: no golden-table line moved** (no situation of the damage, rules, item-ops, conditions or moves
tables nests a reaction in a reaction or tests a protective reaction under Suppressed). Proven by the rulings' own tests
(`prim-react.test.ts`) and by the replays.

**Re-recorded on purpose (the counter's new home, nothing else):** `costs-special.json` (9 lines:
`special/interpose/{soldier,elite,boss}/armour-class-{0,3,5}`) and the marks of `costs-pad`, `costs-outburst`,
`costs-special`, `costs-askers-{perks,traits,classes}`, `costs-items-{traits-classes,shelved}`: every changed line
differs only by `reactUsed.n0>1 reactUsed.r0>1 reactedRound0>1` becoming `uses.reaction|reaction.n0>1
uses.reaction|reaction.s0>r1` (checked token by token: 0 other differences).

**Replays re-recorded on purpose** (`REPLAY_RECORD=1 REPLAY_FULL=1`): the saved shape moved in every game with a reaction
(the cell). The stream moved in five, each traced to a ruling: `cover-4v7-casters`, `proving-4v12-guns` (Duck and Roll's
step no longer draws an opportunity attack or Heart Overwatch), `proving-doors-hiding-watches`, `open-4v6-blades-walk-away`
(an opportunity attack's blow, or an Overwatch shot, is no longer Answered), `proving-waves-long` (also: Pressure's
Suppressed state now stops Duck and Roll). The coverage guard then fell short (Hidden actions 16 of 20, Answers 8 of 9):
two scripted games changed so they play it again (`test/helpers/replay.ts`: the hiding game runs 8 rounds, not 7; the
walk-away game has a sabre soldier for its second minion). Oracles `paths-order`, `sight-order`, `shared-state`,
`old-save` green throughout.

Unit tests that asserted the old count changed with it: `subsystems` (Suppressed: attack and move forbidden, protect
allowed), `calls` and `perks-c` (the count is the round's: a reading after the round turned is 0), the rest read
`reactionsUsed(cb, u)` for `u.reactUsed.n`.

## 3. Where `rev4-primitives.md` was wrong or silent, and what was done (conservative readings)

1. **P1 deletes `fighter.riposte`.** Folding it into the technique Riposte (the Breaker's Momentum cost as item ops) is
   a rule change ("the two Ripostes become one", `reactions-spec.md` 11.4) that moves golden lines; step 3's. Moved onto
   `react()` instead, kept.
2. **P1 "opens reaction_window".** Sites that never opened one (Riposte, Interpose, Shrug It Off, Duck and Roll, Catch,
   Dance of Iron, Drink It In, the plate, Share, the dive) still open none: a window there would let Storm's listener
   (`physical/ranged/takes.ts`, which cancels every reaction of its target) cancel them, a behaviour change. `window` is
   optional; making it always open is step 3's call.
3. **P1's kinds for reactions not on Revision 4's list:** a Call made as a reaction, Drink It In, Catch, Dance of Iron and
   Heart Overwatch are `attack`, Order and the dive `move`, Adamantile Plate and Share `protect` (item 1751: calls made for
   Leon, so Suppressed still stops the Call, Drink It In, Catch and Order as it did).
4. **P1's `limit.of: "owner"`** (the batch row) needs the owner, which is P8/P9's: not built. `payer` is there in code.
5. **P1's `limit: {reaction: n}`** names no kind in rev4; the reactions spec's validator wants every reaction to have one:
   the limit is `{reaction, kind}` and the validator refuses a missing kind and a spend other than 1 or 2.
6. **P2 "fired once by the reducer":** Analyze fires its own (it runs nested and on the area map, where its listeners
   were); the reducer skips `combat/analyze`. A nested `effects` entry is lifted only when it says `when: "acted"` (a nested
   effect with no `when` keeps meaning "run by the default action").
7. **P2's ctx `action`** for an attack is `attack` (mode in `ctx.mode`); for a move its kind; else the cost site. The
   `action` predicate's text says "the priced action (its cost site)": the Called Shot (`if: {action: ["called_shot"]}`)
   works as a technique id.
8. **P3 `max` / `min` on a number block** are not in rev4's shape; the Finisher's cap needs one (`max`). Added both.
9. **P3 `event:over`** (Brimming) reads a payload field `over`; no heal payload carries it yet (Bonds' to add).
10. **P4 deletes `assassin.toxin`.** Not moved: a coat row would need `via` on op `condition` (the save is against
    Ingenuity's strength, while the ambient source in a hit is the weapon's skill) and a weapon predicate (no coat on a
    gun), neither on the lists; and contradiction 7 (toxins become gear) rewrites Toxin in the patch anyway.
11. **P4 and `always_seen`:** the stat is read by `sightOf` (the data's words) only. Making the fog and the AI's sight
    honour it (Traced: "the enemies know where you are") goes through the `sees` hook with its own gate: for its first user
    (Bonds or Figments), not done here (it would put a stat query on every sight test).
12. **P5's `tied` and `aims_at`** wait for ties (P8) and the aim row; the validator refuses them as unknown until then.
13. **P5's deletions are all deferred** (the ratchet counts them):
    - `classes/rev3.ts bard.rally`: an action with a preview, a refusal ("No squadmate within 4 tiles"), its own heal kind
      and the tending hook when nothing was restored: needs P6 (`reach`, `if`); and Bonds re-sizes Rally (6 → 3.5).
    - `perks/e.ts rally_cry`: "the best counts, several don't stack" and an end at each ally's own next turn: per-unit state,
      not a one-shot op.
    - `perks/e.ts grim_reaper` (II): its kill is only on the holder's own turn, a subdued kill counts, the witnesses are
      those who see the body's tile (`unitSees`), Fear's save is Intimidation's (`via` on `condition` needed).
    - `perks/f.ts the_name_they_whisper`: "strangers" from the character's story state; a surrender roll at each enemy's
      turn end.
    - `perks/a.ts bulwark`: a line-of-fire geometry test and the preview's multiplier: not a set of units.
    - `classes/k.ts shade.lingering_dread` (the Fighter's rank II): witnesses are "not Blinded and in line of sight" of the
      body (not `unitSees`: no range or light), and the save is Will Power's (`via` on `condition`).
    - the six `aura` items (War Footing, Born Officer, Live to Fight Another Day, Squad Anchor, Trench Poet, Nothing Left to
      Fear): standing auras (a stat or a save for every ally in reach, all the time), not triggered ops: they need a
      "stat aura" (a stat answered for the units in reach), which rev4 does not list.
    Two small rows would let Lingering Dread and Grim Reaper move: `via` on op `condition` (like `deal`'s), and a
    `targets` filter "sees the centre's tile". Listed, not invented.
14. **P7 "deletes `requires_state`"**: only Vanish's (the other three `requires_state`, `can_hear`, `leadership_squad`,
    `stealth`, are other things). The handler stays until P6.
15. **Load order is part of the rules.** Importing `faith.ts` into `effects/triggers.ts` moved its global `combat_start`
    listener ahead of `deeds.ts`'s and changed the order of two fields in every saved fight (the replays caught it): the
    `patron` predicate reads the belief itself (`patronIdOf`). A list a predicate's `values` read from a module loaded
    inside `triggers.ts` (`SIGHT_WORDS`) is given as a function (`P(…, () => SIGHT_WORDS)`).

## 4. `npm run built-from` (claude/charming-gauss-hbq4n0..HEAD): 9 smells, 0 a lint fails on, each justified

All nine are existing lines this step only re-wrapped (moved into a `react()` closure or onto data reads): `classes/i.ts`
339 (the Finisher preview's `× 100`: a share shown as a percentage; the line's `20 × n` literal is gone), 1154 (Rewrite's
`case 'overwatch'`, now `loseReactions`), `classes/k.ts` 1416 (Share's halving, unchanged), `classes/rev3.ts` 126
(Anchor's preview puts the mover back on its tile for the check, as before), 264 (Duck and Roll's −2 words), `combat.ts`
1705 and 1752 (the opportunity attack's walk replay and `opportunityStrike`'s tile swap, unchanged), `tactics.ts` 80 (the
old save's round, read once).

## 5. Lint baselines, before and after

| Lint | Before | After |
| --- | --- | --- |
| `lint-item-ops` handlers | the list | unchanged (no handler added or removed) |
| `lint-item-ops` literals | `classes/i.ts` 98 | **90** |
| `lint-costs` resources spent by hand | as recorded | unchanged (a row with a `setter`, Pressure, is a meter, not a resource spent) |
| `lint-costs` round compares | as recorded | unchanged (`tactics.ts` 2 are now the old-save read) |
| `lint-costs` reactions | (none) | **new**: `useReaction` 0, windows only in `react()`, the old fields only where listed |
| `lint-foundations` lanes walking `cb.units` | (none) | **new** ratchet, 131 in 13 files |
| `lint-conditions` | as recorded | unchanged |
| `tools/text_numbers.json` | as recorded | one fewer (Finisher) |

## 6. Open, for the lead

1. `two-players` failed once beside the other suites (its fog check: "unseen foe-0 named") and passed alone twice: a
   timing suite on a loaded machine; nothing in this step touches the fog (`eyes` is unset on every unit).
2. The calls of section 3 (items 3, 5, 6, 7, 8, 11) are listed in `CLASSES-3.0-PICKUP.md` section 6.

## 7. What step 1b needs to know (P6 door verbs, P10 zones, P11 shield layers, P12 data toggles, P8 ties, P9 owned units)

- **P6** runs a grant_action's `if` (holder predicates; Vanish's is already written in data) and `reach`; then Vanish,
  Rally and the actions of section 3 can lose their handlers. Nested `when: "acted"` effects are already lifted
  (`collect.ts liftActed`); the reducer already fires `acted` with a perk action's own id. `prayer` routes through
  `faith.ts combatPray`.
- **P10, P11**: `deal` already takes `via` and `nonlethal`; Sanctuary's halving can be `damage_mult` on `taking` with a
  zone predicate; Ward's `mend` with `layer`, `holders` on top of the base shield.
- **P12** toggles: `acted`'s ctx carries `toggles` (the action's mods) for a predicate `toggle`.
- **P8 ties** complete P5: add `tied` (and the aim row's `aims_at`) to `TARGET_FIELDS` and `selectUnits`; `react()`'s
  `payer` is ready for `limit.of: "owner"`.
- **P9**: owned units' `eyes: false` already blinds a unit (`unitSees`); `payer` on a price is P9's own.
- Any new predicate whose `values` come from a module that imports the triggers file must pass them as a function (section
  3, item 15); any new import into `effects/triggers.ts` must not load a module with global hooks earlier than before (run
  the replays).
