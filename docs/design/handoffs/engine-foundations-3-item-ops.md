# Engine foundations 3: item ops (per-item code into data)

12 Nov 2026. Engine review 1, finding F5 (`docs/design/proposals/2026-11-engine-review/1-duplication.md`). Spec items
1660 and 1661, and the "Item ops" note under **Effect ops** in the spec's data section.

## 0. The result in eight lines

1. **An item whose behaviour is "when X happens, if Y, do Z, at most N per scope" is now written in data only** and run
   by one generic runner, `packages/engine/src/effects/triggers.ts`. No TypeScript per item.
2. The vocabulary is **closed and typed**: 30 triggers, 54 predicates, 18 ops, and the `limit` scopes of
   `effects/uses.ts`. `data/effect_ops.json` `item_ops` holds the lists (written from the code; a test holds them equal);
   `tools/validate.py` refuses anything outside them.
3. **Pinned first:** a new golden table, `itemops-perks` / `itemops-traits-classes` (every live item in 65 situations,
   what changed on every unit, exact, and the words), recorded on the unmodified engine and committed before any item
   moved. Every golden table (damage, rules, costs, conditions, moves, item ops) gives the same state lines after the
   moves; the replays play the same stream.
4. **Moved: 20 items.** 11 are data only (handler deleted), 8 keep a handler for their story half only, 1 halved
   (Bleed the Flux keeps its Flux credit). 2 more bespoke handlers read their numbers from their data now.
5. **Guards:** `test/lint-item-ops.test.ts` is a ratchet: a new lane handler fails (and says "write it in data" when it
   only listens on hooks the item ops cover), the handler list only shrinks, and numeric literals inside handlers only
   go down (809 today). `num(h, key)` (`effects/num.ts`) reads a bespoke handler's number from its item's `numbers`.
6. **The proof:** a brand-new perk and a relic written in a test fixture's JSON only
   (`packages/engine/test/fixtures/item-ops-items.json`), loaded with `addItems`, work in a fight
   (`test/item-ops.test.ts`). A **relic** is a new item kind: what the roguelike's relics will be.
7. **No rule and no number moved.** The behaviour notes in section 5 are labels, internal marks and one ordering
   subtlety that no table holds.
8. **Left:** about 280 handlers. Most are not "one small shape": section 6 says, file by file, what each group waits for.
   The F5 estimate of 170 to 190 convertible was too high: with an exact pin on every line, a handler that writes its
   own log line, keeps a private clock or touches the story is several shapes at once.

## 1. The data shape

```jsonc
{ "op": "<an op>",                 // what to do (section 3)
  "when": "<a trigger>",           // the event (section 2): ONE WORD from the closed list
  "if": { "<predicate>": value },  // every key must hold (section 2.2)
  "limit": { "per": "per_turn", "n": 1 },   // or { "cooldown": 3 }; optional key, each: "target", peek: true
  "...": "the op's own fields",    // value, value_pct, condition, rounds, amount, res, min, set, at_least, flag…
  "target": "self",                // self (default) | actor | target: whom a state op acts on
  "and": [ { "op": "…" } ],        // more ops under the same trigger, test and limit (the limit is taken once)
  "say": "{self} refuses to fall (Last Wall): {=.value} HP.",  // the log line (only when it ran, never in a preview)
  "label": "Pain Eater (Bloodied)",// the label of a term or multiplier (default: the item's name)
  "why": "{self} is there (Nothing Left to Fear)", // a cancel's reason
  "priority": 100,                 // hook order among items (default 100, a handler's; lower runs first)
  "fx": { "k": "shield", "amount": 0 } }       // an fx event at the holder (the client's animation)
```

- **Whose event.** Each trigger has a default role for the holder (`self`): the holder is the *actor* of `hit`, `miss`,
  `dealing`, `kill`, `attack`, `turn_*`, `moved`, `cost`; the *target* of `taking`, `would_drop`, `damaged`, `downed`,
  `cond_*`, `save`, `forced_move`, `heal`, `shield`, `injury`. Unless `if` names that role, the holder must be it. So
  `taking` with `if: { actor: "foe" }` is damage the holder takes from an enemy; `downed` with `if: { target: "ally" }`
  is an ally going down. To mean "anyone attacking the holder": `when: "attack", if: { actor: "any", target: "self" }`.
- **Preview.** A hook's preview (an attack's card, a glyph's price) runs the ops that only shape a number
  (`damage_*`, `roll_mod`, `cost_mod`, `cond_rounds`, `cancel`, `floor`, `skip_save`); ops that change state
  (`grant_ap`, `resource`, `condition`, `mark`…) never run in a preview, the limit is read and not taken, nothing is
  logged.
- **Fight only.** The runner runs in a fight (not on the area map, not in the story). A story half stays in the item's
  handler (Iron Stomach's checks, Nothing Left to Fear's story fear).
- **Limits** go through `effects/uses.ts` under the item's own key: the same counter a handler kept with `uses(h)`
  (so a save's counters still match). `key` makes a second counter (`<item key>#<key>`); `each: "target"` one per unit;
  `peek: true` reads a limit another effect spends with the op `use` (Speed Loader: the price reads, the reload spends).
- **Flags** (`mark` op, `flag` / `no_flag` predicates) are the item's own marks on its unit (`u.ps[key].flags`), for a
  later trigger: "the next hit after X" is a `mark` on X and a `flag` test on the next.
- **`say` tokens:** `{self}` `{actor}` `{target}` (names), `{gain}` (what the last `resource` op really gave),
  `{res:guard}` `{resmax:guard}`, `{then}` (the sentence an op returns: a condition's "… is Burning"), and the data's
  own numbers as `{=.field}` (filled when the data loads, like every text: `datatext.ts`).

## 2. The closed lists

### 2.1 Triggers (30), derived from the hooks the 310 handlers use

| Trigger | Hook (phase) | Handlers that listened (of 310) |
| --- | --- | --- |
| `turn_start` | `turn_start` | 54 |
| `attack` | `attack_preview` | 40 |
| `combat_start` | `combat_start` | 40 |
| `hit` | `on_hit` | 37 |
| `taking`, `would_drop` | `damage_in` (`reduce`, `would_drop_to_0`) | 32 |
| `attack_roll` | `attack_roll` | 27 |
| `turn_end` | `turn_end` | 27 |
| `miss` | `on_miss` | 26 |
| `cond_incoming` | `cond_apply` | 26 |
| `dealing` | `damage_out` | 25 |
| `moved` | `moved` | 24 |
| `turn_ap` | `turn_start_pre` (the turn's AP being counted) | 24 |
| `glyph_cost` | `glyph_cost` | 17 |
| `downed` | `on_downed` | 13 |
| `damaged` | `on_damaged` | 12 |
| `cond_landed` | `cond_landed` | 10 |
| `round_start`, `combat_end` | the same | 10 each |
| `forced_move` | `forced_move` | 8 |
| `heal` | `heal_in` | 7 |
| `kill` | `on_kill` | 5 |
| `heal_given`, `shield` | `heal_given`, `shield_grant` | 5 each |
| `injury`, `reload`, `swap`, `save`, `cond_ended`, `cost` | the same (`cost`: every priced action, engine foundations 2) | fewer |

Not triggers yet (the next to add, by count): `outburst_cost` 17, `move_cost` 16, `attack_target` 13,
`outburst_release` 13, `outburst_begin` 11, `action_done` 11, `evoke_cost` 9, `move_step` 8, `spot` / `hide` 7 each,
`strain` 7, `enemy_action_start` 6, `reaction_window`. The story hooks (`check_mod` 19, `check_post` 14,
`session_start` 14, `check_result` 13, `scene_change` 11, `check_build` 10, `ruling_answered` 9, `rest` 8) need a
story runner (section 6).

### 2.2 Predicates (54)

- **Who:** `actor`, `target`: `self` | `ally` (same side, not the holder) | `side` (same side, the holder too) | `foe` |
  `other` | `none` | `any`, or a list (any of them).
- **Per unit** (`<who>` is `self`, `actor` or `target`): `<who>_hp_below`, `<who>_hp_above`, `<who>_hp_at_most` (a share
  of max HP), `<who>_has`, `<who>_lacks` (condition ids), `<who>_tier`, `<who>_not_tier`, `<who>_kind`,
  `<who>_not_kind`; for actor and target also `<who>_within` (tiles from the holder) and `<who>_sees_self`.
- **The event:** `melee`, `crit`, `mode` (shot, aimed, burst, auto, melee, thrown, paired), `damage` (melee, ranged,
  explosive, outburst, weapon, physical, sigil, soul, elemental, fire, lightning, emp, true), `by_hit` (someone's blow,
  not a hazard, trap, Bleeding or Burning), `self_harm`, `hostile`, `cond`, `cond_family`, `action` (the cost site),
  `word` (a Sigil word), `hand` (main, off, both), `how` (move kinds; push, pull, throw, teleport), `ap_above`,
  `amount_above`, `amount_share_below` (the amount as a share of the holder's max HP), `open` (not cancelled, not
  floored yet), `own_turn`, `self_alive`, `flag`, `no_flag`.

### 2.3 Ops (18)

| Op | Triggers | Fields | Does |
| --- | --- | --- | --- |
| `damage_mult` | dealing, taking | value | × the amount (dealing: an own multiplier) |
| `damage_mod` | dealing, taking | value or value_pct | + the amount, or × (1 + pct / 100) |
| `damage_vs` | dealing | value | a target bonus (added with the others) |
| `roll_mod` | attack, cond_incoming, save | value, roll | a to-hit term; on a save the save (default) or its TN (`roll: "tn"`) |
| `cost_mod` | cost, swap, reload, attack, glyph_cost | value, set, min, at_least, res | an action's AP (or a resource: charge, flux): add, set, a floor a cut stops at, a floor it is raised to |
| `grant_ap` | any (turn_ap: this turn) | value, bank | at `turn_ap` a grant or a penalty; elsewhere perk AP now, next turn with `bank`, or AP lost |
| `resource` | any | resource, value | a class resource (guard, momentum…) or Echo |
| `condition` | any | condition, rounds, skip_save, target | `applyCond` (its save unless `skip_save`) |
| `cleanse` | any | condition, family, count, target | `endCond` |
| `cond_rounds` | cond_incoming | max, add | the rounds of the condition being put on |
| `skip_save` | cond_incoming | | no save |
| `cancel` | cond_incoming, forced_move, injury, attack | why | it does not happen (an attack is refused) |
| `floor` | would_drop | value | the blow leaves the unit at this HP |
| `deal`, `mend` | any | amount, target | an amount block on the one formula (`effects/output.ts`) |
| `displace` | any | tiles, how, target | push away from the holder or pull toward it (`displace`) |
| `mark` | any | flag, clear | the item's own flag |
| `use` | any | | nothing but its limit (spends what a `peek` reads) |

Every op and trigger also stands in `data/effect_ops.json` `items` as a `core` op, so the old registry still knows them.

## 3. What was built (files)

| File | What |
| --- | --- |
| `packages/engine/src/effects/triggers.ts` (new) | TRIGGERS, PREDICATES, OPS, the limit, `runTriggered`, `triggerProblem`; it registers itself with the hooks |
| `packages/engine/src/effects/hooks.ts` | `ownerOf`: a well-formed triggered effect is `generic` (a malformed one a `gap`); `buildIndex` puts it on its trigger's hook at its priority; `hookUsed` knows the hooks the data listens on (the `cost` hook fires for a data item); `addItems` / `clearAddedItems` |
| `packages/engine/src/effects/collect.ts` | items added at run time (perks, traits, relics); the `relic` kind; `Held.relics` |
| `packages/engine/src/effects/num.ts` (new) | `num(h, key)` |
| `packages/engine/src/effects/narrator.ts` | `briefOf` reads a data `brief` when the item has no handler |
| `packages/engine/src/effects/core.ts` | `stat_mod` takes shove_guard, one_hand_heavy, throw_range; `stat_mult` field_repair_amount |
| `packages/engine/src/character.ts`, `combat.ts` | `c.relics`; the save's item check knows added items |
| `data/effect_ops.json` | `item_ops` (the closed lists) and the 11 new op rows |
| `tools/validate.py` | the item-op checks; `LEGACY_WHEN` (old single-word scopes, may only shrink); `numbers` are numbers |
| `tools/fix_pack.py` | keeps `item_ops` when it rewrites the registry |
| `packages/engine/test/golden/itemops.ts`, `golden-itemops.test.ts` | the pin (65 situations) |
| `packages/engine/test/item-ops.test.ts` | the lists = the data block; every triggered effect well formed; the proof |
| `packages/engine/test/lint-item-ops.test.ts` (+ `.baseline.json`) | the ratchet |
| `packages/engine/test/golden/record.ts` | `hooksOf` (which items the damage, rules and costs sweeps select) knows triggers |

## 4. Counts

| File | Handlers before | Deleted (data only) | Cut to their story half | Numbers from data | Untouched | Literals in handlers now |
| --- | --- | --- | --- | --- | --- | --- |
| `classes/i.ts` | 40 | 2 | 0 | 0 | 38 | 98 |
| `classes/j.ts` (shelved) | 30 | 1 | 0 | 0 | 29 | 105 |
| `classes/k.ts` (shelved) | 33 | 0 | 0 | 0 | 33 | 113 |
| `classes/rev3.ts` | 20 | 2 | 1 | 0 | 17 | 27 |
| `perks/a.ts` | 23 | 5 | 4 | 1 | 13 | 52 |
| `perks/b.ts` | 24 | 0 | 0 | 0 | 24 | 49 |
| `perks/c.ts` | 19 | 1 | 2 | 0 | 16 | 62 |
| `perks/d.ts` | 22 | 0 | 0 | 0 | 22 | 68 |
| `perks/e.ts` | 23 | 0 | 0 | 1 | 22 | 54 |
| `perks/f.ts` | 21 | 0 | 0 | 0 | 21 | 101 |
| `perks/g.ts` | 24 | 0 | 0 | 0 | 24 | 50 |
| `perks/h.ts` | 16 | 0 | 1 | 0 | 15 | 22 |
| `perks/skeleton.ts` | 9 | 0 | 0 | 0 | 9 | 5 |
| `perks/skills.ts` | 6 | 0 | 0 | 0 | 6 | 3 |
| **All** | **310** | **11** | **8** | **2** | **289** | **809** |

- **Data only (11):** Pain Eater, Right of Way (traits); Siege Engine, Hot-Swap, Last Wall, Used to the Pain (perks);
  Unbroken (the Defender's rank II, an Adamantile Knight move), Core Change and Speed Loader (rank I), Barrage (the
  Mage's rank I), Blind and Slow (the Trickster's rank II).
- **Fight rules in data, the handler kept for the rest (8):** Heavyworlder (carry, one hand, Movement, +2 to hit it;
  hiding stays), Central City Kid (Soft Hands; Plugged In's check stays), Nothing Left to Fear (the aura; the story's
  fear stays), Iron Stomach (Tier I; the story's checks stay), Walking Wounded (20% less while Bloodied; injuries stay),
  Overhaul (Field Repair's AP and amount; the bench and the slot stay), Grenadier's Arm (+2 throw range; the throw of
  a body stays), Bleed the Flux (the Vent's AP; the Flux credit stays).
- **Bespoke, numbers from data (2):** Scar Tissue (its stack and its cap from its effects), Rally Cry (its share from
  its effect).

## 5. Behaviour changes, line by line

No state line of any golden table moved; the replays play the same stream. What did change:

1. **Internal marks** (re-recorded on purpose, read): `costs-items-perks.marks`, `costs-items-traits-classes.marks`
   (Last Wall, Used to the Pain and Central City Kid keep their marks as `flags` and `uses` cells now);
   `replays.json` (the same internal bookkeeping in the final state; the stream is identical in all 29 games).
2. **Selection, not behaviour:** `costs-cooldowns` gained 6 NEW lines (Siege Engine, Right of Way, Heavyworlder: they
   now hold a generic `stat_mod`, whose listener list the cooldown sweep selects on; their lines equal the plain
   sheet's).
3. **Labels (display only):** a cost cut that is a generic `action_cost` now names the item on the price's label
   ("Siege Engine (−1)", "Overhaul (1 AP)", "Core Change (−1)", "Bleed the Flux (−1)") where the handler's said "perks".
4. **Order, for two items at once (spec item 1660 c):** Speed Loader's cut is a `cost_mod` on the price, so it comes
   after the items' `action_cost` changes, not among them. Alone it prices the same (the pins); with a second item that
   cuts a reload with another floor it could price one AP apart. None exists today.
5. **Fight only (spec item 1660 b):** the moved rules run in a fight; on the area map the old handlers would also have
   heard `damage_in` or `forced_move` there. No table holds a difference (nothing deals damage or pushes on the area map
   through these items), but it is a narrowing, so it is listed.
6. **Data words:** the old free-text `when` of Wind on the Skin (3), Grim Reaper and The Name They Whisper said
   `combat_start` / `kill`, which are trigger names now; their handlers claim them, and they read "when the fight
   starts", "on a kill" (prose: nothing reads them). Text placeholders rebound to the new fields (no rendered text
   changed): Used to the Pain (`|abs`), Unbroken, Iron Stomach, Nothing Left to Fear, Central City Kid.
7. **Heavyworlder's** narrator note "heavy weapons usable one-handed" is the data's `stat_mod one_hand_heavy` now (the
   handler answered that stat; the note was never shown to the Narrator: the handler claimed it).

## 6. What is left, and in what order

The ratchet holds the rest where it is. Order of work, cheapest first; each group names what it waits for.

1. **Cost cuts with a private clock** (about 15: Glass Runner's first move, Live to Fight Another Day, Rounding Up,
   Rite in the Field, Hold the Stroke, Clean Draw, Parallel Thought, Charge, the Evoker and Emanator class passives):
   add the triggers `move_cost`, `evoke_cost`, `outburst_cost`, `release_cost` (the hooks exist) and use `cost_mod` with
   `limit` / `flag`. Pin: add a move and an Outburst price to `itemops`'s `prices` first.
2. **AP on a cooldown** (Grim Reaper, Overruled, Outclassed, Got You in My Sight, Forlorn Hope, Rounding Up II): they use
   `perks/cooldown.ts` (`cdFire` / `cdTick`: "once every 3 of your turns, the AP lands next turn"). Express that as a
   `limit: { cooldown }` counted in the holder's turns (a new scope row in `uses.ts`), then `grant_ap` with `bank`.
3. **"The next X after Y" with a log line** (Both Hands, One Shot, Never There, Pattern Lock, Dance of Iron, Squad
   Anchor's break): `mark` / `flag` cover them; each needs its log line as `say` and, for some, the trigger
   `attack_target` or `action_done`.
4. **Area effects** (Lingering Dread, The Name They Whisper, Grim Reaper II, Rally Cry, Bulwark): an op target that is a
   set of units ("each foe within 3 of the target that can see it"): a `targets` selector through `kit.ts` `unitsIn`.
   This is the one structural addition left for passives.
5. **Weapon tests** (Southern Fist, Fire Discipline, Spray and Pray, Gun Nut): predicates on the holder's and the
   attacker's weapon (category, property, unarmed) and the volley (`burst`, its first round).
6. **Item actions** (178 handlers have one): the default data action (`effects/actions.ts` `defaultActions`) has no
   preview, no range or target check and logs "X uses Y". Moving an action into data is F7 (preview as a dry run) plus
   an action descriptor with `target`, `range`, `needs` and the same ops as `run`. Do F7 first.
7. **The story half** (check_mod, check_post, session_start, rest, ruling_answered…): a story runner with story triggers
   and the same predicates on the check. Its own piece.
8. **Shelved classes** (`classes/j.ts`, `classes/k.ts`, 62 handlers): do not move them; they return as attribute pairs
   and are rewritten against the ops then (review 1, F5).
9. **Literals:** 809 numeric literals stand in handlers; most are a handler's own rule number with no field. Move them
   with `num(h, key)` lane by lane (as step a6 moved amounts), lowest-hanging first: `perks/f.ts` (101) and
   `classes/i.ts` (98). The ratchet makes each step permanent.

## 7. How to add things

Written for whoever comes next. Each rule has a test that fails with a sentence telling you what to do.

1. **A new perk, trait or class move whose effect is "when X, if Y, do Z"** is data only: add its effects with `when`,
   `if`, `limit` and an op (sections 1 and 2), then run `python3 tools/validate.py data` (0 errors) and
   `npx vitest run --root packages/engine test/item-ops test/lint-item-ops`. **Do not write a `register({ … })`**: the
   ratchet fails on a new handler.
2. **If no trigger, predicate or op fits:** add it to `effects/triggers.ts` (one line in TRIGGERS, PREDICATES or OPS:
   what it reads from the hook's payload, `about` in plain words), then
   `ITEM_OPS_WRITE=1 npx vitest run --root packages/engine test/item-ops` (writes the data block) and add the op to
   `data/effect_ops.json` `items` as a `core` row (the validator warns about an unknown op). Never test an item's id
   inside the runner.
3. **To move an existing handler into data:** first make sure a golden line shows what it does (the `itemops`
   situations in `test/golden/itemops.ts`; add a situation and record it ON THE OLD CODE with `GOLDEN_RECORD=1`,
   commit), then write the data, delete the handler (or the hooks you moved, and the `claims` of those effects), run the
   pins (`npx vitest run --root packages/engine --testTimeout 600000 test/golden test/replay-hash test/lint`). A state
   line that moves is a mistake in the data; marks and replays that move with the same stream are bookkeeping (re-record
   on purpose: PICKUP.md section 3). Then `LINT_RECORD=1 … test/lint-item-ops` (the list shrinks) and add the id to
   `DATA_ONLY` in that test if no handler is left.
4. **A handler that stays** reads its numbers from its data: an effect's own field (`h.info.effects[i].value`) or a
   `numbers` entry through `num(h, 'key')`. Never a literal (the ratchet counts them).
5. **A relic** (or a mode's own perk): plain data, loaded with `addItems('relic', [...])` (`effects/hooks.ts`); a
   character carries it in `c.relics` (a unit built from it holds it; an enemy can carry it in `held.relics`).

### Worked examples

**A perk.** "Second Wind: once a fight, when a blow would drop you, you stay at 1 HP and gain 2 Momentum."

```json
{ "id": "second_wind", "name": "Second Wind", "tier": "mastered", "text": "Once a fight, when a blow would drop you, you stay at {=effects.0.value} HP and gain {=effects.0.and.0.value} Momentum.",
  "effects": [
    { "op": "floor", "value": 1, "when": "would_drop", "if": { "open": true, "self_harm": false, "self_hp_above": 0 },
      "limit": { "per": "per_combat", "n": 1 }, "and": [{ "op": "resource", "resource": "momentum", "value": 2 }],
      "say": "{self} gets a second wind: {=.value} HP, +{gain} Momentum." } ] }
```

**A trait.** "Thin-Skinned: while above half your max HP you take 20% more damage; your first wound each fight costs
you 1 AP on your next turn." (Pain Eater and Central City Kid are the real ones.)

```json
"effects": [
  { "op": "damage_mod", "value_pct": 20, "when": "taking", "if": { "self_hp_above": 0.5 } },
  { "op": "mark", "flag": "hurt", "when": "damaged", "if": { "amount_above": 0, "no_flag": "seen" }, "and": [{ "op": "mark", "flag": "seen" }] },
  { "op": "grant_ap", "value": -1, "when": "turn_ap", "if": { "flag": "hurt" }, "and": [{ "op": "mark", "flag": "hurt", "clear": true }], "label": "Thin-Skinned" } ]
```

**A class move.** "Steady Aim (passive): your aimed shots cost 1 AP less, never below 1, once a turn." (Speed Loader is
the real one: the price reads the limit, the shot spends it.)

```json
"effects": [
  { "op": "cost_mod", "value": -1, "min": 1, "when": "attack", "if": { "mode": ["aimed"] }, "limit": { "per": "per_turn", "n": 1, "peek": true } },
  { "op": "use", "when": "attack_roll", "if": { "mode": ["aimed"] }, "limit": { "per": "per_turn", "n": 1 } } ]
```

**A relic.** The Ember Charm (`test/fixtures/item-ops-items.json`): a melee hit sets an enemy Burning once a turn; heal
at each turn start; a reload costs 1 AP less.

```json
{ "id": "ember_charm", "name": "Ember Charm", "text": "…", "effects": [
  { "op": "condition", "condition": "burning", "skip_save": true, "target": "target", "when": "hit",
    "if": { "melee": true, "hostile": true, "target_lacks": ["burning"] }, "limit": { "per": "per_turn", "n": 1 }, "say": "The Ember Charm flares{then}." },
  { "op": "mend", "amount": { "kind": "heal", "base": 5, "profile": "flat" }, "when": "turn_start" },
  { "op": "cost_mod", "value": -1, "min": 1, "when": "cost", "if": { "action": ["reload"] } } ] }
```

Then `addItems('relic', [thatJson])` and give a character `relics: ["ember_charm"]`. The relic is played in a fight by
`test/item-ops.test.ts` (with the perk Blood for Blood); the perk, trait and class-move examples above are well formed
(the runner's `triggerProblem` passes them) but are not game content.

## 8. Checks run

`python3 tools/validate.py data`: 0 errors. The pins
(`npx vitest run --root packages/engine --testTimeout 600000 test/golden test/replay-hash test/lint`, with
`paths-order`, `sight-order`, `shared-state`, `old-save`, `item-ops`, `coverage`): all pass. `npm run check`: see the
last commit of the branch.
