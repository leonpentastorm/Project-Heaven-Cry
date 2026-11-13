# Classes 3.0, step 1b: the second half of the engine primitives (hand-off)

Built 13 Nov 2026 on the worktree branch `worktree-agent-aec2e65b4ba394b21`, started from `claude/charming-gauss-hbq4n0`
(step 1a merged). Not pushed; no version bump. Rows 7 to 11 of `docs/design/rev4-primitives.md` section 5, its section 6
(the addendum), the one hook for every roll to hit, and the step 1a review's "step 1b must add". Spec: rules 1.28
sections 3 and 4 in `docs/rules/PHC-Core-Rules-v1.0.md`, items 1762 to 1767. One commit a sub-step (0 to 8, and 6b).

Fixtures: `packages/engine/test/fixtures/classes-3.0-primitives-1b.json` (relics, verbs, tie kinds, an owned block) and
`classes-3.0-specs-1b.json` (one row of each system spec). Tests: `test/prim-1b-review`, `prim-tohit`, `prim-verbs`,
`prim-zones-shields`, `prim-toggles`, `prim-ties`, `prim-owned`, `prim-addendum`, `prim-mend-gate`, `prim-specs-1b`; the
client: `apps/web/src/screens/combat-actions.test.ts` ("a door verb written in data only works on the screen with no
client change"); `old-save.test.ts` gained a fight with a drone and a beast saved before P9.

**The pin.** After every sub-step the golden tables were identical but for two marks lines (sub-step 3, below), and no
replay hash moved at all (no recorded game has a companion, a tie, a zone of data, a layer or a delayed op; the rulings
touch nothing a recorded game does). The oracles `paths-order`, `sight-order`, `shared-state`, `old-save` were green
after every sub-step; nothing was re-recorded with `REPLAY_RECORD`.

## 1. The primitives as built

### Sub-step 0: the review's list and the lead's rulings

| What | Shape, where | Replaced / deleted |
| --- | --- | --- |
| One step key | `combat.ts stepEvent(u)` = `step:<mover>:<serial>:<arrival tile>`, `newStep(u)` at each step of a walk, a forced tile entered with reactions on, a drag | the four spellings (`step:<m>:<from>><to>`, `step:<m>:<at>`) in `combat.ts`, `magic.ts`, `physical/core.ts`, `classes/rev3.ts` |
| Every `react()` resolves in its callback | Shrug It Off, Catch, Drink It In, the Knight's plate, the Strike Call's dive now pass their resolution as `fn` | test-lint in `prim-1b-review` (no `react(cb…` without a callback) |
| `always_seen` in the fog and the AI | `combat.ts alwaysSeen(cb, t)`, read in `seesHook` (so `visibility`, `sideSeesUnit`, `sideSees`) and `illusion.ts perceivedFoes`; gated by `effects/hooks.ts statHeard(cb, stat)` (anything in the fight that can answer the stat: a condition row, an item's stat_mod, an engine system) so a fight with none pays nothing | — |
| `acted` from the enemy AI | `combat.ts enemyTurn`: `did(action, {t, tile, mode})` after each successful step, named as the reducer names them (`attack`, `move`, a cost site); the magic, technique and clearing steps by their system (`sigil`, `outburst`, `technique`, `clear_block`, `scuff`) | — |
| One copy each | `belief.ts` (`beliefOf`, `patronById`, `patronIdOf`; no global hooks) read by `faith.ts` and the predicate `patron`; `condtable.ts COND_TABLE_STATS` beside `modsOf` (which now reads its table) | `triggers.ts patronIdOf`, `triggers.ts COND_TABLE_STATS` |
| `via` on op `condition` | the save is against that skill's strength (`applyCond` `via`) | — |
| Witness filter | `targets.sees`: `line` (a line of sight to the centre's tile, not Blinded) or `eyes` (`unitSees`: range, light) | — |
| Standing aura | an effect `{op: stat_mod, stat, value, targets}` with no `when`: `statQuery` answers `value` to each unit of the set (centred on the holder) while the holder stands; `effects/hooks.ts auraStat` (gated by `AURA_ANY`: no item in the data carries one, so nothing pays) | — |
| P3 `event:amount` on `dealing`, `event:over` on heals | `sourceOf`: amount falls back to the payload's `base`; `heal_given` carries `over` (the heal that didn't fit) | — |
| The rulings | Order: `calls/handlers.ts` runs the ordered act inside `react(cb, ally, {kind: 'move'})` (an Order made as a reaction spends with `loseReactions`, already inside one); Anchor: `kind: 'attack'`; Drink It In: `protect`; a Call made as a reaction: `calls/core.ts callReactKind` (helping `protect`, hindering `attack`) | — |

Moved onto P5: **Lingering Dread** (`classes.json` move pool `shade.lingering_dread`): `{op: condition, when: kill,
condition: shaken, via: will_power, targets: {of: target, side: foe, within: 3, sees: line}, say}`; its handler
(`classes/k.ts`) deleted. Not moved, with reason: **Grim Reaper II** (its fear also follows a subdued KO, which is not the
`kill` trigger, and it logs a line per witness; moving it changes its log), **the six `aura` items** (each is more than
a standing stat: Squad Anchor's reach changes with its movement and does not stack, and its +1 Dodge is a to-hit term;
War Footing is a `moved` trigger with the AP cooldown; Live to Fight Another Day's Yellow is a Fear-only save term with a
`why` label; Born Officer's fires on its holder going down or out of sight; Trench Poet's is the Narrator's; Nothing
Left to Fear is already data). The form exists for the next item that is only a stat. **Toxin** stays (a coat's choice
and its story action; contradiction 7 rewrites it as gear).

### Sub-step 1: one hook for every roll to hit

`rolls.ts toHitTerms(cb, att, tgt, type, {mode, preview})` / `toHitAdd`: the hook `to_hit` {att, tgt, type (`weapon`,
`sigil`, `soul`), mode, terms}, asked by `combat.ts previewAttack` (a weapon attack's terms), `sigil.ts` (the hit bonus),
`magic.ts rollFor` and `classes/soul.ts soulStrike` (the Outburst's two rolls). Trigger `to_hit`; `roll_mod` adds a term;
the predicate `damage` tells the kinds apart (`damage: ["sigil"]`). Example: `{ "op": "roll_mod", "when": "to_hit",
"if": { "target_tied": "bond" }, "value": 2 }`.

### Sub-step 2: P6 door verbs

An item of kind **`verb`** (`effects/collect.ts`): held by every sheet that meets its `requires` (`[{skill, min}]` or
`[{class, rank}]`: `meetsRequires`, `verbsOf`; `Held.verbs`); data verbs come from each system's file (one line in
`collect.ts DATA_VERBS` as each file comes) or `addItems('verb', …)`. Its one `grant_action` is the action shape
(`effects/actions.ts defaultActions`): `ap`, `uses`, `res` (resources of `actions.json`), `if` (holder predicates: the
action greys "Not now (…)"), `reach` `{tiles, sight, side: foe | ally | side | any, self, if, tied}` (the pick list,
`PerkActionEntry.choices`, which the descriptors read and the fog trims; the refusal in `previewPerkAction`), `pick`,
`pick_label`, `limit` `{per, n}`, `prayer` `whisper | hymn` (`faith.ts verbPrayerWhy` / `verbPray`: Faith, Silenced, your
turn, the Whisper slot or the Hymn's wait, the Atheist's or an overreach's dice, the mana, Witnessed; `tier` for a
Hymn's gate) and nested `effects`: a verb's nested item ops are the action's own, run once it succeeds (and not when the
prayer goes unanswered). `SKILL_ITEMS` is derived from `skills.json` (unlocks marked `"item": true`). A lane's action
keeps its own words but its data `if` is read as a backstop (Vanish's, finding 17). Example:

```json
{ "id": "paint", "name": "Paint Them", "kind": "verb", "requires": [{ "skill": "dexterity", "min": 1 }],
  "effects": [{ "op": "grant_action", "action": "paint", "ap": 1, "uses": "at_will", "limit": { "per": "per_turn", "n": 1 },
    "reach": { "tiles": 3, "side": "foe", "sight": true, "if": { "target_lacks": ["marked"] } },
    "effects": [{ "op": "condition", "condition": "marked", "target": "target", "skip_save": true, "rounds": 2 }] }] }
```

Not moved, with reason: the handlers rev4 lists under P6 (`infiltrator.sabotage`, `field_fix`, `medic.triage`,
`stim_throw`, `field_surgery`, `bard.inspire`, `guardian.will_shield`, `guardian.sanctuary`'s action, `guardian.command`,
`trickster.silver_tongue`) are class moves whose rewrite is a rule change of a later step (their specs re-size or retire
each); moving them now would move golden lines. Vanish's own words and hide stay (no op hides a unit). Finding 16 (the
default action's nested effects as `acted`) is done for verbs only: an old item's nested effects keep running inside its
default action (moving them would move log order in the golden tables).

### Sub-step 3: P10 zones from data, P11 shield layers

**P10** (`magic.ts`): `DATA_ZONE_KINDS` (`sanctuary`), `makeZone(cb, by, {kind, tiles, rounds, mult, pool})`, `zonesAt`,
`endZones`; `Zone.pool`. Op **`zone`** `{kind, at: self | target | tile, within, rounds, pool}` or `{kind, clear: true}`;
predicates **`self_in_zone` / `target_in_zone`** (a kind or `{kind, owner: self | side | any}`); `damage_mult` on
`taking` gains `round: "up"` and `pool: "<kind>"` (the holder's zone of that kind gives what is prevented and ends when
spent); predicate `not_damage`; an op that returns `false` did nothing (no `say`). **Sanctuary moved onto them**: its
action lays the zone through `makeZone`; its halving, item 525's exception (your own burn) and its end are three item
ops in `classes.json`; the handler's `damage_in` and `turn_start` are deleted.

**P11** (`effects/damage.ts`): `grantShield(cb, t, n, by, {layer, holders, stack})` (a boolean is the old `stack`);
`u.shields` (`ShieldLayer {layer, n, by, s}`), spent before the base shield, the newest first; one giver's layer on a unit
is one entry (the larger stands); `holders` keeps a giver's layer on at most n units (a new one ends the oldest);
`shieldTotal(t)`. Op `mend` gains `layer`, `holders`. Example: `{ "op": "mend", "amount": "ward", "layer": "ward",
"holders": 2, "target": "target" }`. Not moved: `guardian.will_shield`'s `shieldBy(h)` write (dead state, but deleting it
moves a golden marks line; the Chaplain step removes Will Shield).

**Golden lines re-recorded on purpose:** `costs-items-traits-classes.marks.json` and `costs-items-shelved.marks.json`,
one line each (`guardian.sanctuary/sanctuary`): the deleted handler's own `ps.class:guardian.sanctuary.zone0>z1` is gone;
every other mark of the line is the same.

### Sub-step 4: P12 data toggles

An item's `toggles: [{id, name, on: [action types], if, default_on, effects}]`: `effects/actions.ts togglesOf` (a lane's,
then the data's) behind `togglesFor` and `modOn`; `if` greys it; `collect.ts liftToggles` makes its effects the item's own
with `if: {toggle: [id]}`; predicate **`toggle`** (on for the action being resolved: `cb.mods`, or `acted`'s
`ctx.toggles`). Not moved: `channeler.heart_surge`'s lane toggle (rev4: "when moved"; its effect is a stage, not an op).

### Sub-step 5: P8 ties

`kit.ts`: `Tie {kind, from, to, lost?}`, `cb.ties` (absent while there are none); `tie(cb, from, to, kind)` (refused for an
unknown kind, a tie that stands, a holder at its cap), `untie(cb, pick)` (fires the hook `tie_end`), `tiesOf`, `tiedTo`,
`tieCap` = the kind's `max` + stat **`ties_max:<kind>`** (a stat family; a data `stat_mod` answers it). Kinds:
`rules.json ties.kinds` (`id, max, ends_on, on_end`) or `addTieKinds`; `ends_on`: `from_down`, `to_down`, `to_dead`,
`unseen_round` (out of the near end's sight at two round starts in a row), `combat_end`; `on_end`: `none` or `unmake`.
Op **`tie`** `{kind}` or `{kind, clear: target | all}`; predicates **`actor_tied` / `target_tied`** (a kind or `{kind,
as: from | to}`); `targets.tied`, `targets.aims_at` (`self` or `tied:<kind>`: the unit's `enemyIntent` goes at the holder
or a unit tied to it); a verb's `reach.tied`. `fog.ts`: a side keeps its own ties (the near end is one of its units); a
far end it can't see is `?`.

### Sub-step 6: P9 owned units

`owned.ts`: the record is the tie **`owned`** (`rules.json ties.kinds`: ends with the fight, `on_end: none`) and the unit's
block `owned: {turn: own | owner | auto, eyes, upkeep {res, n}, cover, lure, spent}`. `spawnOwned(cb, owner, blockId, at,
rng, {spent})` (a unit from a data block: `enemies.json companions` or `addOwnedBlocks`; at the owner's level through
`levelCompanion`; tied; turn own: after its owner in the order), `unmakeOwned(cb, u, {refund})`, `ownerOf` (the tie; for a
fight saved before it, `twinOf` or `ctrl`), `ownedBy`, `ownedRecord`, `tieCompanions`. Upkeep: at its owner's turn
start, paid or unmade. `cover`: `combat.ts coverOf`, `coverTileFor`, `sightBlockers`. Ops **`spawn`** `{block, at}` and
**`unmake`** `{refund}`; `limit.of: "owner"` (an owned unit's reaction is its owner's: P1's `payer`); `payer` on
`whyNot` / `pay` / `refund`. **The drone and the beast** carry their record (`tactics.ts companionUnits`) and are tied
to their owner as the fight starts (`startCombat`); their turn (`init` owner − 0.5) is unchanged. **The twin** is read
through `ownerOf`'s fallback (`twinOf`; shelved, built in-fight by its own handler). `old-save` loads
`save-1b-pre-owned-companion-mid-fight.json` (written at d52d37c, before P9) and plays it on.

**Stopped, and why (the shape is silent):** `turn: owner` and `turn: auto` are recorded and kept out of the order, but
**the action system `owned`** is not built. rev4 says "one action system `owned` (registerActions)" and nothing of how
the reducer takes an action of a unit that has no turn (`game.ts` refuses any unit but the active one) nor what drives an
`auto` unit (the enemy AI only runs the foe side). Both are a reducer action and an AI driver for a PC-side unit, a
system's design (Figments' verbs priced on the owner: `figment_move`, `figment_strike`), not a primitive's field. The
Figments step builds them on `spawnOwned`, `payer` and the descriptors. `lure` is stored, read by nothing yet (the
Double's illusion). `companion` and `twinOf` are not folded away (111 readers of `u.companion`; each is a unit-kind test
the golden tables pin): the record stands beside them.

### Sub-step 7: the addendum

**`delay`** on any item op `{until: target_turn_start | holder_turn_start | rounds, n}`: `triggers.ts queueDelayed` puts it
on `cb.delayed` (plain data, saved) with its number blocks read and a `deal`'s or `mend`'s amount fixed (`fixed: {kind,
n, type…}`: delivered with no profile and no `damage_out` hook); `runDelayed` at a turn's or round's start; dropped on a
dead holder or target. **`ties:<kind>`**: a number source (the ties of that kind the unit holds, either end). **`self_holds`
/ `self_lacks_gear`**: `{slot: hand | person, door: evoker | emanator}` or `{slot, item: <id>}`, over `character.ts holds`,
which `hasEvoker` and `hasEmanator` now are (the six "Needs an Evoker / Emanator in hand" checks of the class moves read
it through them). **`redirect`** on `taking` `{share, split}`: a share to the holder, or with `targets` and `split` divided
among the set; a moved share (`src.redirected`) is not moved again.

### Sub-step 8: the percent gate and the cap (inert)

`effects/output.ts mend`: `mendGate(spec, target)` = `ceil(min_pct × min(target max HP, gate_hp ?? mending.gate.hp))`
with `min_pct` the amount block's, else its profile's (`output.profiles[].min_pct`); applied after the Stat × Level
product, before the own multipliers (`gatedRaw`); the cap `mending.cap_pct × max HP` is passed to `healUnit` and held
after the received bonuses (`uncapped` for a Miracle). `MEND_GATE`. None of the numbers is set (no profile has
`min_pct`, `mending` has no `gate` and no `cap_pct`); step 7b sets them (20%, 145, 50%).

## 2. Lint baselines, before and after

| Lint | Before | After |
| --- | --- | --- |
| `lint-item-ops` handlers | the list | `shade.lingering_dread` gone |
| `lint-item-ops` literals | `classes/i.ts` 90, `classes/k.ts` 113 | **89**, **112** |
| `lint-costs` round compares, cooldowns by hand | as recorded | unchanged (ties count rounds out of sight with a counter, not a compare) |
| `lint-foundations` lanes walking `cb.units` | 131 | 131 |
| `lint-conditions` | as recorded | unchanged |
| `tools/text_numbers.json` | 1404 | 1404 |

## 3. `npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: 12 smells in 7 places, 0 a lint fails on

`apps/web/src/game/protodata.json` (the generated screen data, rebuilt from the data); `classes/i.ts` 442, 1366, 1388 and
`classes/j.ts` 1163-1166 (Drink It In's MP and the Knight's plate: unchanged lines moved into a `react()` callback);
`classes/soul.ts` 34 (the Outburst roll's line: only `toHitAdd` added); `combat.ts` 1713 (the opportunity attack's walk
replay, unchanged beside `newStep`); `effects/triggers.ts` 342 (`redirect`'s share of a number already made: the op
itself, as `damage_mult`).

## 4. Where `rev4-primitives.md` or a spec was wrong or silent, and what was done

1. **The lead's ruling 3 says "a Call that harms an enemy is not a reaction at all."** Read conservatively: a hindering
   Call may still be made as a reaction (kind `attack`), as it always could. Leon to confirm (item 1764).
2. **P6 `prayer`**: a verb has no tier; a Hymn verb's gate and the Atheist's TN read `tier` (1 to 3, default 1) on the
   grant_action. Its speech lines: `answered` and `witnessed` for a Hymn, none for a Whisper (as a Whisper).
3. **P6 nested effects as `acted`** (finding 16): for verbs, run by the action once it succeeds (so a prayer with no
   answer runs none); the old items' default actions are unchanged.
4. **P6 `reach.sight`** reads the predicate `target_sight: seen` (the holder's side sees it); an ally always passes.
5. **P10's end**: rev4 gives `rounds` only; Sanctuary ends at its owner's next turn: an item op `zone` with `clear: true`
   on `turn_start`. A zone also runs down with the others (`left`).
6. **P10 `pool`**: rev4 says "spent by the op that reads it"; built as `damage_mult`'s `pool: "<kind>"`.
7. **P11 "the larger stands"** within one giver's layer on a unit (stack adds).
8. **P8 caps**: a tie past the cap is refused (rev4 is silent on refusing or replacing the oldest); `to_down` is for any
   kind (Bonds' "enemy Bonds only, through a side qualifier" is not built: a kind that wants it lists `to_down`).
9. **P8 `ties:any`** (Bonds 6.2 item 2) is not built: the source names one kind.
10. **P9's `owned` kind ends with the fight and unmakes nothing**: the drone and the beast stay when their owner goes
    Down (as today). Figments' `owned` (rev4: `on_end: unmake`) would unmake a drone too: **call for Leon / the lead**:
    one kind with Figments' ends (a drone unmade when its owner falls) or a second kind for figments.
11. **P9's action system `owned` and `turn: owner | auto`**: stopped (section 1, sub-step 6).
12. **`self_holds`'s shape**: rev4's object `{slot, door | item}` binds; Bonds' `["focus:empathy"]` must be rewritten
    `{slot: "hand", door: "empathy"}` once a focus names its door in data (the Attuner and `focus.door` are Bonds' own).
13. **`delay`**: rev4 `{until, n}` binds over Bonds' `{until: "turn_start", of: "target"}`; a delayed op is not dropped at
    `combat_end` (the finished fight never runs it).
14. **The standing aura**: built as the reviewer's shape (a `stat_mod` with `targets`, centred on the holder, while it
    stands). No data item uses it: none of the six `aura` items is only a stat (section 1).
15. **The one hook for every roll to hit**: an item adds terms (a sum); a reroll or an advantage on a spell's d20 is not
    part of it (the weapon's `attack_roll` hook stays the weapon's).
16. **`acted` from the AI**: an enemy's magic and technique steps are named by their system (the AI does not report the
    verb it used).

## 5. The six system specs: can every "Built from" row be written in data now?

One row of each is written and run in `test/fixtures/classes-3.0-specs-1b.json` (`prim-specs-1b.test.ts`).

| Spec | Row proved | Rows that still can't be written, and why |
| --- | --- | --- |
| `bonds-spec.md` | the echo (13): `deal` on `heal_given`, `targets {tied}`, `event:amount`, `delay` | the batch row `mend_mult` (Bonded heals ×1.2) and `condition: "incoming"` (Take the Weight) are not built; the `read` row (the aim shown to a side) needs the intent made visible, a system's; `self_holds` waits for a focus to name its door (the Attuner); `ties:any`; resource rows `ledger`, `mp` with the Attuner's `needs` are the system's data |
| `figments-spec.md` | Volatile (`deal` on `downed`, `targets` aura) and Picture (a verb with `spawn`) | the Figments' own verbs on a `turn: owner` unit and the Scrap Turret's `turn: auto` need the `owned` action system (stopped); `lure` is read by nothing; `owned_weight` in `enemyRank` is step 9's; resource rows `vcharge`, `durability` are the system's data |
| `chaplain-spec.md` | Ward: a Whisper verb with `reach` and `mend` on a `layer` with `holders` | rule 11's stat `intervention_keeps_witnessed` (a batch row) is not built; Smite, Verdict and the presence rows stand on what exists |
| `shadow-spec.md` | the Break as a data toggle (`damage_mult`, one term from `event:ambush` and `target:marked`) | the `shadow` resource row and the `read` condition row are the system's (the meter is Shadow's data; `read` needs the intent made visible) |
| `reactions-spec.md` | Run and Gun (`resource: pressure` on `hit`) | none of its table: `react()`'s `spend`, kinds and the one step key are built; Reflex and Killzone's two shots are rule changes of step 3 |
| `heal-shield-percent-spec.md` | a heal gated at a share of the target's bar (`min_pct`, `gate_hp`) | none of the mechanism; the numbers (and every heal's re-fit, the Sigil and Outburst boons that are made before their target is known: section 4's gap) are step 7b's |

## 6. Open, for the lead

1. Calls for Leon (added to `CLASSES-3.0-PICKUP.md` section 6): section 4 items 1, 10, 12.
2. The batch rows not yet built: `mend_mult`, `condition: "incoming"`, `intervention_keeps_witnessed`, `read`; and the
   `owned` action system. Each is small but belongs to its first user's step (or a step 1c).
3. Checks at the close: `python3 tools/validate.py data` 0 errors; `npm run check` ALL GREEN (an earlier run timed out
   two `combat-actions` web tests at 5 s while another worktree's vitest shared the machine: alone they pass in 2.9 s and
   3.6 s, as on the base branch); `npm run e2e -- all`: 58 of 61 green beside each other, and `pg-art`,
   `combat-portraits`, `slate-title` failed only because this worktree had no web images (`apps/web/public/assets` is
   built, not committed): after `npm run assets` the three are green. Nothing in this step touches the client but one
   test and the descriptors' pick list.
4. The engine suite's time moved with the machine's load (168 s to 295 s across runs, 187 s at the close); one file
   timed against the base branch (`replay-hash` 16.6 s now, 17.5 s on the base) shows no slowdown. `statHeard` and the
   standing aura ask nothing while no data item can answer them.

## 7. Integration and review (13 Nov 2026, on the branch `worktree-agent-a3d1e2ce341d47880`)

The lead's integrator took the builder's branch in (fast-forward), merged the main line (`claude/charming-gauss-hbq4n0`:
steps 2, 3 and 4, rules 1.29 and 1.30), built what the builder left and the lead's rulings, and reviewed the diff
against `rev4-primitives.md`. Four commits: the merge, part 2, part 3, part 4.

**The merge.** The main line's rule changes run through this branch's primitives: Killzone's two-reaction spend is a
`react()` with the one step key (`stepEvent`); a data `stat_mod` answers every declared stat family through the main
line's `statOfMod` (the builder's `PASS_STAT` for `ties_max:` folded in). This branch's section 14 items were renumbered
**1757-1762 → 1762-1767** (1757-1761 are rules 1.29's). `data/effect_ops.json item_ops`, `docs/ENGINE-HOOKS.md` and the
`lint-item-ops` baseline were regenerated (every count ≤ both parents'). Golden tables and replays: the main line's,
re-recorded on the merged code after the four oracles passed: **2 lines differ from the main line** (the two
Sanctuary marks lines of sub-step 3) and **534 changed lines from this branch, exactly the 534 the main line changed
on purpose**. Part 2's `read` row adds 36 NEW lines to the conditions table (no line changed); nothing else moved.

**Built (part 2): the four batch rows.** `mend_mult` (on `heal` and `shield`, before the heal is floored and capped;
the kind read with `how`; `shield_grant` carries `kind` now. Not on `heal_given`: the heal has landed). Op
`condition`'s value `"incoming"` (on `cond_incoming`: the condition being put on, its rounds). Stat
`intervention_keeps_witnessed` (asked in `faith.ts intervene`). The condition row **`read`** (`conditions.json`, one
round: the bearer's turn end; effect `reveal` `what: intent`): `enemyIntent` is kept on the bearer as `readIntent` (the
Read move's own field and fx) for its source's side. `trickster.read` is not moved onto it (its log line and golden
marks; the Operative's step moves it). Tests: `prim-batch-1b`.

**Built (part 3): the lead's rulings.** (a) **The `owned` action system**: a `turn: owner` unit never enters
`cb.order`; its verbs (`owned.ts OWNED_VERBS`: move, shot, aimed, melee; the block's `actions` picks) are rows of the
owner's Utility tab (`descriptors.ts` system OWNED, ids `ow:<unit>:<verb>`), sent as `combat/owned {unitId: owner,
owned, verb, targetId?, tile?}` and run by `runOwned` with the owned unit as the actor on its owner's AP, priced on it
and paid by its owner (`pay` with `payer`). A `turn: auto` unit acts once at its owner's turn start through the same
door (block `auto {verb: shot | aimed | melee, target: nearest_foe | weakest_foe}`); an auto move is not built (no rule
names one). The jsdom harness shows a fixture puppet's rows in the owner's panel with no client change. (b) **One tie
kind `owned`**; the record's `kind` (block `owned_kind`, default companion) tells a Figment from a drone. (c) **A Call
that harms or hinders an enemy is never a reaction** (`calls/core.ts callReactWhy`; rules 1.28 section 3 and item 1764
amended; `calls.json` text). (d) Bonds' focus check in the `self_holds` shape: accepted. Rules 1.28 section 5, items
1768 and 1769.

**Fixed (part 4), each with a test that failed first.**
1. **`delay` changed the item's own data.** `queueDelayed` deleted `when`, `if`, `delay`, `targets`… from the object
   `withNumbers` hands back, which is the item's own effect when it has no number block: after an item's first delayed
   op its trigger never fired again in that process (the Bonds echo escaped only because a `targets` op is copied). It
   copies now. The builder's addendum test passed only because of it (its second queue never happened): corrected.
2. **An echo never echoes itself**: what a delayed op does queues nothing more of the same item (a delayed heal's own
   `heal_given` would queue the next, turn after turn). Queued ops whose holder or target is dead are dropped at the
   next turn start (a dead unit has no turn start of its own, so they stayed in the save).
3. **The fog**: another side's unit no longer shows its `owned` record (a Double's `lure` would give it away) nor a
   read its own side made; `cb.delayed` keeps a side's own ops only (it went out whole).
4. P6's predicates **`actor_alive` / `target_alive`** (listed in rev4, not built).

**Review, per primitive** (the binding shapes of `rev4-primitives.md` sections 1, 5, 6):
- **P6 door verbs**: matches (`requires`, `reach`, `prayer`, `limit`, nested effects). Not built: `pick`'s `felt` and
  `forms` (each system's own list: Bonds, Figments add them with their data).
- **P8 ties**: matches; the cap refuses (rev4 silent). `ties:any` not built (rev4's addendum names `ties:<kind>`).
- **P9 owned**: matches with part 3. `lure` is still read by nothing (the Double's system). The drone and beast keep
  `turn: own` and stay when their owner falls; a Figment that must be unmade with its owner reads the record's `kind`.
- **P10 zones**: matches but for **`shape`**: the op lays a square (`within`); a Sigil field's or the Seal's shape needs
  `shape` added when its first user comes.
- **P11 layers, P12 toggles**: match.
- **Addendum** (`delay`, `ties:`, `self_holds`, `redirect split`): match, with fixes 1 and 2.
- **The one roll hook** (`to_hit`): weapon, Sigil and Outburst rolls ask it; a sum of terms only (a reroll is not part).
- **The inert percent gate**: inert (no number in data); `mend` applies it once.
- **Building beside the engine**: `npm run built-from` on the branch: 10 smells in 6 places, none a lint fails on.
  All are lines that existed before, moved into a `react()` callback or beside a new call (Drink It In's MP and the
  Knight's plate in `classes/i.ts` and `j.ts`, the Outburst roll in `classes/soul.ts`, the opportunity attack's walk
  replay in `combat.ts`), and `redirect`'s share (the op itself, as `damage_mult`). Accepted: each goes with the step
  that rewrites its item.
- **Saves**: new fields (`cb.ties`, `cb.delayed`, `u.owned`, `u.shields`, `Zone.pool`, the sequence counters) are
  absent until used; `old-save` loads the pre-P9 fight and plays on. Iteration is in `cb.units` / list order throughout.
- **Lint baselines**: none grew, no allow-list widened (`lint-item-ops` shrank by `shade.lingering_dread`).

**The five system specs: can every "Built from" row be written in data now?** (One row each was written by the builder;
one harder row each is in `test/prim-specs-1b-harder.test.ts`.)

| Spec | Every row in data? | What is still not |
| --- | --- | --- |
| `bonds-spec.md` | **No, nearly** | the `pick` list `felt` (given feelings), `ties:any`, and the system's own data: `tending.json`, the Attuner naming its door (`self_holds {door}`), resources `ledger` and `mp` with the Attuner's `needs`. Every primitive row (share split, echo, ×1.2 through, Take the Weight, the aim read with `read`) can be written |
| `figments-spec.md` | **No, nearly** | the forms' own verbs beyond move and the plain attacks (Pounce, Stare, Hold, Overclock's `owned_act` site) need the system's verbs on `runOwned` (one case each, or a data verb run with the owned unit as actor); `pick` `forms`; `lure` read by nothing; `owned_weight` (step 9); resources `vcharge`, `durability` |
| `chaplain-spec.md` | **Yes** | (the class's own data: patron words, the numbers) |
| `shadow-spec.md` | **Yes, with its resource** | the `shadow` resource row is the system's data (a Break reads it through `res:shadow`, proved with a stand-in) |
| `reactions-spec.md` | **Yes** | (built in step 3) |

**The close.** `python3 tools/validate.py data` 0 errors; `tools/engine_catalog.py --check` clean; `npm run check` ALL
GREEN (engine 3912 passed, web 1119 passed); `npm run e2e -- all` green but for `clarity`, which failed once beside the
others ("no drill unit walked into the shot this time": the drill AI's path under load) and passed alone twice; it is
flagged as a suite that cannot share the machine, not a defect of this branch.
