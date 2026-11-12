# Engine review 1: one concept, many implementations (12 Nov 2026)

Read-only review of `packages/engine/src/**` (38,032 lines) at commit `2f66b2c`, through one lens: **a concept the
engine implements more than once**. The damage formula was the calibration case (one sink, three ways in, armour in
seven places, about 40 numbers in TypeScript, every damaging move bespoke). This report lists the other places with the
same shape, ranked.

**How this was done, and its limit.** Reading and grepping only. A browser test run held the machine for the whole
review, so **nothing in here was run**: every bug below is "read, not run" and carries the test that would confirm it.
Counts are grep counts over `src/` (they are exact for the pattern named, and the pattern is given). Where I am
guessing, the line says "guess".

Sizes: **S** = one sitting, under about 300 changed lines; **M** = 300 to 1,500 lines over 5 to 15 files; **L** = more,
or every lane file. Risk is the risk of moving a number or a dice order without noticing.

---

## 0. The verdict

1. **The damage problem was not special. It is the house style.** The engine has good primitives in a few places
   (`effects/output.ts` `deal`, `effects/uses.ts`, `effects/ap.ts`, the Physical 2.0 `Tech` helpers) and around each
   one a ring of code that does the same job by hand because it was written before the primitive, or in another lane.
2. **The single worst fact: item data is documentation.** 223 of about 320 item handlers register `claims: 'all'`
   (they take over every effect of their item), and across all of `perks/*.ts` and `classes/*.ts` exactly **one**
   handler reads a number from its own data (`classes/i.ts:1327`, Will Shield, with a `?? 12` fallback). Every other
   AP cost, use limit, range, TN, duration and amount of a perk, trait or class move is a TypeScript literal that
   repeats `data/*.json`. "The spec wins and the data is the bug" cannot hold when the engine never reads the data.
3. **A save is written out by hand 45 times.** 64 `d20(` call sites; the line
   `r === 20 || (r !== 1 && r + m >= tn)` is written out 45 times in 22 files; the base TN `12` is a literal in 42 expressions; there
   are six private save helpers. They do not agree on which modifiers count (section F1).
4. **Moving a unit against its will has 14 implementations and no two trigger the same things.** Only one of them
   respects Nailed, only one fires traps and fields, three ask the immunity, eight fire the `forced_move` hook
   (section F2). The spec itself says both "nobody reacts to forced movement" and "held Watches fire on a push".
5. **An action pays its AP by itself.** 60 hand-written `u.ap < cost` checks and 173 direct writes to `.ap`; cost
   changes reach them through **ten** different channels; an action can declare only AP and a use count, so charge,
   MP, Supplies, stims, credits and Flux are checked in `available()` and paid in `run()` by hand (section F3).
6. **Five live or latent bugs fell out of the reading** (section 3). The clearest: Field Medic says it makes the
   Bard's Triage 1 AP cheaper; nothing ever asks the question it answers, so it does not.
7. **What is good, and should be the model:** Physical 2.0's `Tech` (one handler serves the preview and the action
   through `t.preview`; `save`, `cond`, `stop`, `forceMove`, `strike` are shared helpers), `uses()` with lazy stamps,
   `turnAp`/`grantPerkAp`, the reducer's clone-then-throw (a refused action costs nothing, so no refund code is needed
   outside Narrator rulings), and the fact that enemies act through the same `resolveAttack`, techniques, Sigil and
   Outburst code as characters. The unification below is mostly "make the rest of the engine work the way
   `physical/` already does".

### The top ten

Ranked by (pain prevented for what comes next, a roguelike mode with many new items, enemies and relics) ÷ (size ×
risk).

| # | Finding | Today | The primitive | Size | Risk | Pin first |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **F1 Saves and d20 rolls** | 64 `d20(` sites, 45 hand-written pass/fail lines, 6 private helpers, TN 12 literal ×42; they disagree on `saveAdd`/`tnAdd`, on the fx event and on the log line | `rollSave()` and `rollVs()` in one `rolls.ts`, returning a result object | M | Low | Golden: seeded rng, every save site, die + total + TN + outcome |
| 2 | **F2 Forced movement** | 14 implementations; Nailed, immunity, hooks, traps, Overwatch each honoured by a different subset | `displace(cb, unit, to \| dir, opts)` in `combat.ts`, one trigger table | M | Medium (needs one ruling from Leon) | Golden: each mover onto a trap, a field, a hazard, past a Watch, on a Nailed, an immune and an Anchored unit |
| 3 | **F14 A typed registry of stat ids and cost sites** | Stringly-typed `statQuery`; 5 ids answered that nothing asks; `COST_SITES` allowlist out of step with the 21 sites that ask | `StatId` union + a test "every answered id is asked" | S | None | Nothing: it only adds a check |
| 4 | **F3 Paying a cost** | 60 `u.ap <` checks, 173 `.ap` writes, 10 channels for a cost change, the "loan" hack ×3 | `cost` on every action def + `price()` / `pay()` | M | Medium | Golden: AP and resource before and after every action on the pad, with each cost item held |
| 5 | **F4 Conditions** | The table is a TS literal that repeats `data/conditions.json`; 5 flag conditions outside it; Bleeding set directly in 6 places; two injury tables | `CONDS` loaded from data; every condition through `applyCond`; one `rollInjury` | M | Medium | Golden: apply, tick, cleanse and end each of the 40 on each tier, with and without immunity |
| 6 | **F6 Geometry and the lane prelude** | "square around a tile" ×6, "can stand here" ×8 with **five different lists** of blocking objects, `foesOf` ×8 with four meanings, `overworld` ×17, `rngOf` ×10 with a fixed-seed fallback | `engine/kit.ts` (grid, selectors, lane helpers) | S | Low | Unit tests of the kit; the golden damage tables already cover areas |
| 7 | **F5 Item numbers in data, effects by trigger** | 310 handlers, 7,681 lines; 1 reads its data; core ops refuse any effect that has a `when` | A `when` vocabulary + 9 generic ops (table in F5); `num(h, key)` for what stays bespoke | L, in stages | Medium | Per item: its `perks-a..h` test, plus one golden line per literal moved (as a6 of the damage work) |
| 8 | **F7 Preview is the action in dry-run** | 229 `run` functions with 136 separate hand-written `preview` twins; about 93 with none | `h.preview` on the item action runtime, as `Tech` has | M to L (rides on F5) | Low | The golden tables' preview lines |
| 9 | **F9 Character, Unit and `story.magic` are three copies of one state** | Hand-written copy lists in 5 functions; `res` persists by a hard-coded whitelist of two names | A declared list of persisting unit state, one `syncOut`/`syncIn` | M | High | A round-trip golden: story → fight → story → fight for every resource |
| 10 | **F8 Counters** | 7 stores, 113 free-form state fields, 74 hand-written `=== cb.round` compares | Everything through `uses()`; add a `cooldown` scope | M | Low | The existing per-item tests |

The rest (F10 story and combat twins, F11 log and fx, F12 the enemy-intent twin, F13 unit kinds read from names, F15
constants) are in section 2 and ranked in section 5.

---

## 1. The twelve lenses, answered in one line each

| # | Concept | One path? | Where |
| --- | --- | --- | --- |
| 1 | Paying a cost | **No.** Each action does its own arithmetic and its own "Needs N AP." | F3 |
| 2 | Limits and counters | **No.** One good primitive (`uses`), six other stores beside it | F8 |
| 3 | Targets and areas | **Half.** `dist`/`xy`/`key`/`lineOfSight` are shared; shapes, free tiles and unit filters are per file | F6 |
| 4 | Rolls, saves, checks | **No.** One attack roll (good), one story check (good), saves and everything else by hand | F1 |
| 5 | Conditions | **Mostly one door, with holes.** `applyCond` is real; 5 conditions and several writers go round it | F4 |
| 6 | Movement and forced movement | Walking: **yes** (`moveUnit`). Forced: **no**, 14 ways | F2 |
| 7 | Preview vs execution | Attack, technique, Evoke, Call, prayer: **shared.** Item actions, enemy intent: **twins** | F7, F12 |
| 8 | Enemy vs character | **Shared action code** (good). The stat lookups branch by hand | F1, F13 |
| 9 | Story vs combat | Magic: **shared** through a scratch fight. Prayer, 31 item actions, conditions: **twins** | F9, F10 |
| 10 | Log, fx, refusals | **No.** 693 log lines and 351 fx events built at the call site; rules read log text back in 8 places | F11 |
| 11 | Bespoke code | 310 handlers; about two thirds are one of nine small shapes | F5 |
| 12 | Anything else | Unit kinds by regex on the name; AP base 6 defined three times; a string bus for stats | F13 to F15 |

---

## 2. The findings

### F1. Saves and d20 rolls (lens 4)

**What exists.** Three real roll functions and a crowd:

1. The attack roll: `combat.ts:979` `previewAttack` → `combat.ts:1113` `resolveAttack` (die at `:1154`). One path,
   hooks `attack_preview` / `attack_roll`, used by players, enemies, Overwatch, bursts and techniques. **Good.**
2. The story check: `game.ts:1006` `rollCheck` (die at `:1024`), with Echo, `check_build` / `check_mod` /
   `check_post`. **Good.**
3. The condition save inside `magic.ts:292` `applyCond` (die at `:308`) and its copy in `flagCond` (`:343`).
4. Then, each with its own die, modifier, TN and sentence:
   - private helpers: `physical/core.ts:464` `save`, `classes/rev3.ts:51` `famSave`, `faith.ts:938` `rollSaveVs`,
     `sigil.ts:1106` `teleportSave`, `magic.ts:214` `freshSave`, `tactics.ts:159` (the Heart save of a parley);
   - inline saves: `hazards.ts:71`, `magic.ts:398` (Corroded's turn-end save), `magic.ts:1210` (swap), `magic.ts:1418`,
     `physical/melee/links.ts:59`, `physical/melee/strikes-b.ts:117`, `classes/i.ts:626`, `:1147`, `:1170`, `:1573`,
     `:1584`, `classes/k.ts:209`, `:872`, `perks/a.ts:614`, `perks/b.ts:248`, `:867`, `perks/c.ts:858`,
     `perks/d.ts:880`, `:946`, `:1100`, `:1137`, `perks/e.ts:116`, `:641`, `:905`, `perks/f.ts:151`, `:506`, `:633`,
     `:942`, `perks/g.ts:465`, `:737`, `perks/h.ts:367`, `faith.ts:869`, `:1284`, `:1394`, `game.ts:670`, `:1649`,
     `:2460`;
   - other to-hit rolls outside `resolveAttack`: `sigil.ts:1004` (a spell's roll), `sigil.ts:1248` (striking a
     turret), `magic.ts:1184` (an Outburst's roll, with its own advantage), `classes/soul.ts:30`, `classes/j.ts:815`
     (a turret's shot: `r + 4 - cover`, the 4 and the cover's 5 are literals);
   - contests: `combat.ts:1668` (Shove), `tactics.ts:296`, `physical/melee/links.ts:224`,
     `physical/melee/answers.ts:73`.

**Do they agree? No.**

1. **Who may change the roll.** `applyCond` reads `saveAdd`, `tnAdd`, `skipSave` and `cancel` from the `cond_apply`
   hook (28 item handlers listen on it). `famSave`, `teleportSave` and the swap at `magic.ts:1210` read them too. The
   technique `save` (`physical/core.ts:464`), `rollSaveVs` (faith), the hazard save, the parley save and every inline
   save in `perks/` and `classes/` do **not**. An item that says "+2 to saves against X" or "the first save each round
   passes" works against an Outburst and silently does nothing against a technique's Stop, a hazard, a Hymn or a
   class move.
2. **The modifier.** A character's save bonus is `unitSave` (`magic.ts:205`) in most places; `classes/i.ts:1170`
   rolls the story half of Rewrite as a **bare d20** against the TN (`r >= tn`, no modifier at all) while its combat
   half at `:1147` adds `unitSave(t, 'brain')`; `perks/d.ts:1100`, `perks/f.ts:633`, `perks/g.ts:465` and
   `perks/e.ts:641` each carry their own tier table (`TIER_SAVE`, `NPC_SAVE`, defaults of `'minion'` in three and
   `'soldier'` with a default of 1 in the fourth).
3. **Natural 20 and 1.** Applied by hand each time. `game.ts:670` (asking a voice) uses `total >= hook.tn` with
   neither. Contests use `>` in two places.
4. **What the screen gets.** Only `physical/core.ts:473` emits a `save` fx event. The others write a sentence, in at
   least 12 formats (`' (body save 14 vs 15)'`, `' (Heart save d20 '`, `': d20 '`, `' · d20 '`, `'Shove: d20 '`…).
   "Dice are transparent" is a product rule; today it is true for attacks and story checks and a matter of prose for
   everything else.
5. **Re-rolls.** Echo exists only in `rollCheck`. Lucky Break (`faith.ts:782`) and `perks/f.ts:832` re-roll an attack
   by rewriting `rc.die` and re-deriving `rc.hit` by hand.

**What it has cost.** Every item that touches a save has to be tested against each delivery system, and was: this is a
large part of why there are `outburst20-review`, `rules114-will-power-review`, `skeleton-strength-checks` and
`rules123-defence` test files. Rules 1.13 ("the strength of the skill that delivered it") had to be threaded through
`withVia`, an ambient global (`magic.ts:232`), because there was no call that took it as an argument.

**The unification.** One file, `packages/engine/src/rolls.ts`:

```ts
interface SaveSpec { by: Unit | null; target: Unit; fam: 'body' | 'brain' | 'heart'; via?: string; str?: number;
  tnAdd?: number; adv?: boolean; why: string; cond?: string; skills?: string[] }
interface RollResult { die: number; mod: number; total: number; tn: number; ok: boolean; nat: 1 | 20 | null;
  skipped?: 'immune' | 'no_save' | 'auto'; labels: { add: number; label: string }[] }
function rollSave(cb: Combat, rng: Rng, s: SaveSpec): RollResult   // emits 'save' hook + 'save' fx, writes the log line
function rollVs(cb, rng, { by, mod, tn, why, crit?: boolean }): RollResult     // a plain d20 + mod vs TN
function contest(cb, rng, a, b, why): { a: RollResult; b: RollResult; won: boolean }
```

`rollSave` owns the TN (`rules.json` `saves.base_tn`, today's 12, + strength), the tier table, natural 20 and 1, the
one hook every item listens on (rename `cond_apply`'s save fields into a `save` hook that fires for **every** save),
the one fx event and the one sentence. `applyCond` calls it. So does everything in the list above.

**Size M** (about 45 call sites, each a 1 to 3 line replacement). **Risk low** if the rng draw order is kept: each
site draws one d20 today and will draw one after. **Pin first:** a golden table in the damage tables' style, seeded,
one line per save site: die, modifier, TN, outcome. The sites that today ignore `saveAdd`/`tnAdd` are a **behaviour
change** when unified: list them for Leon as one ruling ("a save is a save, whatever asked for it"), do not slip it in.

---

### F2. Forced movement (lens 6)

**What exists.** Walking is one function (`combat.ts` `moveUnit`, the step loop at `:1519` to `:1541`): each tile runs
the `move_step` hook, `zoneEnter` (fields, traps, Outburst residue), `hazardStep`, sight, and Overwatch. Everything
else that changes a unit's tile writes `.pos` itself:

| # | Where | What | Immunity asked | `forced_move` hook | Nailed | Clears Braced | Traps / fields / residue | Hazards | Watches (`move_step`) | Overwatch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `physical/core.ts:526` `forceMove` | every technique's push or pull | no | yes, per tile | **yes** | yes | no | no | yes | yes |
| 2 | `physical/melee/links.ts:295` `swap` | Drag | no | yes | no | yes | **yes** | **yes** | yes | yes |
| 3 | `effects/core.ts:234` `pushAway` | the generic `knockback` op | `knockback` | **no** | no | no | no | no | no | no |
| 4 | `combat.ts:1661` `shove` | the old Shove action | (earlier in the function) | yes | no | yes | no | no | no | no |
| 5 | `combat.ts:1719` | a weapon skill's push | `knockback` | yes, once, no tile | no | no | no | no | no | no |
| 6 | `magic.ts:460` `magicShove` | Sigil PUSH and PULL, Outburst pushes | `knockback` | yes (may change the distance) | no | no | no | no | no | no |
| 7 | `classes/k.ts:65` `nudge` | advanced-class pulls | no | no | no | no | no | no | no | no |
| 8 | `classes/rev3.ts:160` | the Defender's shove | `shove`, `knockback` | yes | no | yes | no | no | no | no |
| 9 | `perks/c.ts:695` | Grenadier's Arm (throw a unit) | no | yes | no | yes | no | no | no | no |
| 10 | `sigil.ts:1095` | STEP (teleport) | own save | no | no | no | **yes** | no | no | no |
| 11 | `magic.ts:1213` | an Outburst swap | own save | no | no | no | no | no | no | no |
| 12 | `faith.ts:1061` | Switcheroo | own save | no | no | no | no | no | no | no (and **no fx event at all**) |
| 13 | `classes/rev3.ts:548`, `:566` | Sleight (swap with an ally or an image) | no | no | no | yes | no | no | no | no |
| 14 | `perks/e.ts:750`, `physical/ranged/takes.ts:138`, `classes/j.ts:557` | a unit moved by its own item out of turn | no | no | no | partly | no | no | no | no |

**Disagreements that are bugs today (read, not run).**

1. **Nailed.** Rules 1.12: a nailed unit is held "until it is pulled free" (`physical/core.ts:528` enforces it). Rows
   3 to 13 ignore `u.nailed`. A unit nailed by a thrown weapon can be thrown clear by Sigil PUSH, the old Shove, a
   weapon skill's knockback, Grenadier's Arm, or swapped away by Sleight or Switcheroo; the weapon stays "in" it at the
   new tile.
2. **Anchor and Siege Engine.** Items that say "can't be pushed" answer either the `immune('knockback')` query or the
   `forced_move` hook. No row asks both except 6 and 8. So Siege Engine (`perks/a.ts:348`, the hook) does not stop the
   generic `knockback` op (row 3), and an `immunity: knockback` effect does not stop a technique's push (row 1) or
   Grenadier's Arm (row 9).
3. **Traps and fields.** Sigil STEP onto a trap springs it. A push by a technique, Sigil PUSH or a throw onto the
   same trap does nothing, and neither does a push into a fire field or onto a mine.
4. **The object blocker.** Rows 1, 3, 4, 5, 8, 9 stop at `moveBlockers(cb)` (the objects' own `blocks_move` data).
   Row 6 stops at a regex of four kinds, `/barricade|pillar|door|crate/` (`magic.ts:471`); row 7 at a different regex
   of seven (`classes/k.ts:51`); row 10 at a list of eleven (`sigil.ts:486`). Sigil PUSH can put a unit on a tile with
   a barrel, a container, a terminal, a turret, a low wall or a hole that walking and STEP refuse.

**And the spec disagrees with itself.** Rules 1.19 (the feelings table, Fear): "forced movement, so nobody reacts to
it". `physical/core.ts:524`: "Move a unit against its will, tile by tile, so held Watches and Overwatch fire". Both
are implemented. There is no one paragraph in `docs/rules/PHC-Core-Rules-v1.0.md` that says what forced movement
triggers (I searched for it); the rule lives in fragments at lines 1046, 2418, 3251, 4643, 5934.

**What it has cost.** Breaching Strike needed a callback bound across files (`physical/core.ts:561` `setSlam`) and
its own blocker function (`perks/skeleton.ts:78`) because there was no shared "what stopped the push". Heart Surge's
"doubles push distance" works only on row 6. Every "can't be moved" item has to guess which of two doors to guard.

**The unification.** In `combat.ts`, beside `moveUnit`:

```ts
function displace(cb: Combat, rng: Rng, u: Unit, to: { away: string; tiles: number } | { toward: string; tiles: number }
  | { tile: string }, o: { by: Unit | null; how: 'push' | 'pull' | 'throw' | 'teleport' | 'swap'; source: string;
  willing?: boolean; preview?: boolean }): { moved: number; path: string[]; stoppedBy: 'wall' | 'object' | Unit | 'held' | 'immune' | null }
```

It asks Nailed, the immunity **and** the hook (one question, both doors), walks tile by tile through one blocker
function, clears Braced, and runs one trigger table, `rules.json` `forced_movement`:
`{ traps, fields, hazards, watches, overwatch, opportunity, momentum }` per `how`. A swap is two `displace` calls.
Breaching Strike reads `stoppedBy`.

**Size M** (14 sites become calls; about 250 lines go). **Risk medium**, because rows that trigger nothing today will
trigger something. **It needs Leon's ruling first** (one table: what does a push, a pull, a throw, a teleport and a
swap trigger). **My recommendation:** a unit that lands on a trap, a field or a hazard suffers it however it got
there (pushing an enemy into your own fire is the play that makes fields worth laying); held Watches and Overwatch do
not fire on forced movement (the mover did not choose it, and it is what Fear already says); teleports and swaps
skip the tiles between. **Pin first:** a golden table with every row above against a trap, a field, a hazard, a
Watch, a Nailed target, an immune target and Siege Engine, recorded **before** (it will show the disagreements as
they are) and re-recorded once with Leon's table.

---

### F3. Paying a cost (lens 1)

**What exists.**

1. **Six action runtimes**, each with its own way to price, check and pay:
   - the built-in verbs in `combat.ts`, `tactics.ts`, `magic.ts`, `sigil.ts`, `gear.ts`, `fighttalk.ts`: a function
     that returns a refusal string, with `if (u.ap < cost) return 'Needs ' + cost + ' AP.'` near the top and
     `u.ap -= cost` further down. **60 such checks** (`grep "\.ap\s*<\s"`): `combat.ts` 18, `magic.ts` 12, `sigil.ts`
     6, `tactics.ts` 6, `game.ts` 6, and one or two in ten more files;
   - item actions: `effects/actions.ts:194` `runPerkAction` (pays `ActionDef.ap` and takes the use; the one runtime
     that pays for you);
   - techniques: `physical/core.ts:854` `useTechnique` with `gate` (`:260`), `apFor` (`:213`), `spendRounds` (`:570`),
     `spendMomentum` (`:111`), `spendGuard` (`:93`);
   - Calls: `calls/core.ts:118` `useCall`;
   - prayers: `faith.ts:853` `combatPray` (`u.ap -= pv.ap` at `:861`) and `faith.ts:1373` `storyPray`
     (`B!.spendAp` at `:1385`);
   - the area map: `game.ts:2470` `worldAct`, which spends from `g.story.ap[charId]` through `game.ts:2180` `spendAp`
     (a third AP pool, beside `u.ap` and a window's pool).
2. **173 direct writes to `.ap`** in 36 files (`combat.ts` 36, `game.ts` 24, `perks/e.ts` 12, `magic.ts` 11…).
3. **Ten channels for "this costs less":**
   - the stat query `ap_cost:<site>` through `effects/core.ts:151` `actionAp`, called 34 times with 21 different
     ids (and two more built at run time, `whisper` and `pray`);
   - the generic op `action_cost`, gated by an allowlist `COST_SITES` (`effects/core.ts:147`);
   - the hook `attack_preview` (field `ap`), which also carries to-hit, reach and cover (40 handlers);
   - the hooks `glyph_cost` (13 handlers), `evoke_cost` (9), `outburst_cost` (16), `release_cost` (4), `move_cost`
     (15), `world_move_cost` (2), `call_cost` (emitted, **0 handlers**), `overreach_cost` (1);
   - a function in the action def (`ap: (h) => actionAp(...)`, `perks/e.ts:953`);
   - and `'action_cost'` is declared as a hook name (`effects/types.ts:59`) that nothing emits or handles.
4. **The other resources have no path at all.** `ActionDef` (`effects/types.ts:104`) can declare `ap` and `uses`.
   Charge, MP, Supplies, toxins, stims, spare parts, credits, Flux and HP costs are each checked in `available()` with
   their own sentence and subtracted in `run()`: `.charge -=` 19 sites in 6 files, `.mp -=` 9 in 4,
   `'Needs N charge.'` ×7, `'Needs N MP.'` ×7, `'Needs an Evoker in hand.'` ×12. Only Guard, Momentum, Supplies and
   toxins go through the small generic helper that already exists (`tactics.ts:341` `resOf` / `resGain` /
   `resSpend`, 58 calls).
5. **The "loan".** "Your next action costs N less" (Brief, Encore) cannot be a price change, because the action
   checks `u.ap < cost` itself. So the reducer lends AP before the action and takes back what was not used after:
   `calls/rules.ts:116` `briefBefore`, `faith.ts:990` `encoreBefore`, settled at `game.ts:1543`, and a third copy
   "inlined" in `effects/actions.ts:135` so that the card's greyed-out state matches.

**Disagreements.**

1. **Which actions an item can discount is an accident of who wrote the action.** Door, Prone, Brace, Load, Pick up,
   Scuff, Syphon, Steady, Feed, Song, Search, Pull free and Overwatch price a literal (`combat.ts:662`, `:1682`,
   `:1703`, `:1991`, `:1972`, `:1608`; `magic.ts:1057`, `:1072`, `:1717`; `sigil.ts:891`; `game.ts:1535`;
   `world.ts:348`); they never call `actionAp`, so no item can ever change them. `COST_SITES` nevertheless lists
   `load`, `brace`, `overwatch`, `move` and `swap`: a data effect `action_cost` on one of those would be **claimed by
   the generic op, counted as engine-run by the coverage report, and do nothing**. (Latent: no plain data effect uses
   one today. `glass_runner`'s `move` discount carries a `context`, so it falls to its own handler.)
2. **The other way round:** `vent`, `swap_core`, `reload_both`, `hide`, `parley`, `extinguish`, `escape`, `recover`,
   `crystallise`, `break`, `whisper` and `pray` do ask `actionAp`, but are not in `COST_SITES`, so the data effects written for them
   (`classes.json` Core Change: `{"op":"action_cost","action":"swap_core","value":-1,"min":1}`; Bleed the Flux:
   `"action":"vent"`) are not claimed, and each got a hand-written `stat:` function repeating the number
   (`classes/rev3.ts:418`, `:428`).
3. **Bug (read, not run): Field Medic and Triage.** `perks/e.ts:937` says "the Medic's class Triage move reads
   `ap_cost:triage` / `heal`" and answers that id at `:950`. Triage is `ap: 2`, a constant (`classes/i.ts:487`);
   nothing asks `ap_cost:triage`. A Bard with Field Medic pays 2 AP for Triage, not 1. To confirm: a unit with the
   trait and the class, `previewPerkAction(..., 'class:medic.triage')`, expect `ap` 1.
4. **Same shape, latent:** `perks/d.ts:286` answers `ap_cost:ward` for the Warden's Ward move, which is `ap: 2`
   constant (`classes/i.ts:860`). Shelved class, so nothing breaks today.
5. **The "never below 1" floor is restated per item** (`1 - (ctx.base ?? 2)`, `-Math.min(1, Math.max(0, base - 1))`,
   `base > 1 ? -1 : 0`: `classes/j.ts:278`, `classes/rev3.ts:418`, `perks/a.ts:347`, `perks/c.ts:342`,
   `perks/e.ts:951`), and the engine special-cases two techniques by name for one perk
   (`physical/core.ts:208` `AP_BY_NAME = new Set(['shove', 'break'])`).

**What it has cost.** `perk-card-ap.test.ts`, most of `hooks-gap.test.ts`, the Encore and Brief sections of the Faith
and Calls tests, and a card that can disagree with the action whenever one of the ten channels is missed. A new
resource (a roguelike relic's charges) means touching every runtime.

**The unification.** One declaration, one function.

```ts
interface Cost { ap?: number; reaction?: boolean; res?: Record<string, number>;  // 'charge' | 'mp' | 'supplies' | 'stims' | 'rounds' | 'momentum' | 'guard' | 'hp' | …
  uses?: { per: UseScope; n: number; key?: string } }
function price(cb, u, action: string, base: Cost, ctx?): { cost: Cost; labels: string[]; why: string | null }
function pay(cb, u, priced): void
```

`price` runs **one** hook, `cost` (`{u, action, tags, cost, labels}`), which replaces the ten channels (the old hook
names stay as thin adapters until their handlers are moved), applies floors from the data (`min`), applies a pending
"next action" credit (so the loan and its three copies go), and builds the one refusal sentence. Every resource is a
row in `rules.json` `resources` (where it lives on the unit, its name, whether it persists after a fight: see F9).
Every built-in verb gets a line in a new `data/actions.json` (`{ id, ap, tags }`), which is also where today's
literal 1s and 2s go. `ActionDef`, `TechDef` and the Call and prayer defs carry a `cost` and stop checking for
themselves.

**Size M** (the function is small; the 60 sites are mechanical). **Risk medium**: AP is the most-tested number in the
game, and windows, the +3 cap and tenths (Glyph AP) all pass through. **Pin first:** a golden table of "AP and every
resource before and after" for every action a pad offers, bare and with each cost-changing item held (the 64
handlers that the classification in F5 marks `cost_change`).

---

### F4. Conditions (lens 5)

**What exists.** `magic.ts:292` `applyCond` is a real single door: immunity through `cond_apply`, the save, "no
stacking, the longer duration stands", source and delivering skill kept, `cond_landed`, ticking at the bearer's turn
end (`magic.ts:389` `condTurnEnd`), sources checked (`:411`). 116 calls go through it. The holes:

1. **The table is TypeScript.** `magic.ts:84` `CONDS` is a literal of names, families, rounds and texts. It repeats
   `data/conditions.json` (40 conditions), which the engine loads only for the glossary (`glossary.ts:7`). The
   mechanical numbers are literals around it: Guarded and Withdrawing `def += 2` (`magic.ts:326`), Corroded
   `def -= 2`, Slowed half Movement, Blinded vision 1, Shaken −2 on Heart saves (`:205`), the two brain debuffs −2
   (`:222`), Burning 10, Bleeding 5 and 3 rounds. `conditions.json` has `effects` for all of these
   (`{"op":"stat_mod","stat":"hp","value":-5,"when":"turn_start"}` on Bleeding). Nothing reads them. The data also
   writes durations three ways (`rounds`, `turns`, `until: "<prose>"`).
2. **Five conditions are not in the table at all** (`magic.ts:124` `FLAG_CONDS`: Dazed, Prone, Bleeding, Hidden,
   Injured). They are unit fields (`u.dazedNext`, `u.prone`, `u.bleed`, `u.hidden`, `u.injuries`) with their own
   apply function (`flagCond`, `:336`), their own end (`endCond`'s first four lines), and they are **written directly**
   in 20 places outside it (`grep "\.(bleed|dazedNext|stunnedNext) = [1-9t]|\.prone = true"`: `combat.ts` 10,
   `magic.ts` 4, and one each in six more files). Direct writes skip `cond_apply` (so an immunity written as a hook
   is not asked), `cond_landed`, the fx event and the newest-first order CLEANSE uses. Some remember to ask
   `immune(…, 'bleed')` by hand (`combat.ts:1193`, `:1262`, `:1715`); `classes/i.ts:1157` (`t.dazedNext = 1`) and
   `physical/core.ts:511` (Prone from a Stop) ask nothing.
3. **The generic `cleanse` op cannot see them.** `effects/core.ts:198` (the `cleanse` op) filters `Object.keys(t.conds)`. Sigil's own
   cleanse (`sigil.ts:453`) builds the list by hand so that it can. A data `cleanse` that names Bleeding or Prone
   through the generic op reports "nothing to shake off". (Latent: the two data items that name them are claimed by
   their own handlers.)
4. **Two injury tables. Bug (read, not run).** `combat.ts:1254` `rollInjury` rolls Injury Resist (d100), fires the
   `injury` hook (cancel, no Daze, no halving) and asks the bleed immunity. `magic.ts:355` `injureUnit` ("the same
   d6 table as a critical's") does none of the three. An Injured condition (`applyCond(…, 'injured')`) on a
   character with Injury Resist, or with a perk that turns injuries aside, ignores both. To confirm: a unit with
   `injResist: 100`, `applyCond(cb, rng, null, u, 'injured')`, expect no injury.
5. **Statuses that are conditions in everything but name** live in other fields with other clocks: `u.nailed`,
   `u.stopped` (`physical/core.ts:517`, ticked in `physical/rules.ts`), `u.braced`, `u.jammed`, Pressure,
   `u.maskLeft`, plus per-item `stateOf(h)` debuffs with their own `until: cb.round + n` (`classes/i.ts:1155` to
   `:1158`: Rewrite's "−2 Defense for N rounds" is three private lists).
6. **Story conditions are a second system.** `game.ts:1050` `storyConds` / `:1075` `setStoryCond` (scope scene,
   session, arc) against `u.conds` (rounds), bridged by two allowlists that differ by one entry
   (`game.ts:1048` `STORY_CARRY` has `augment_offline`; `world.ts:561` `CARRY` does not).

**The unification.** (a) `CONDS` is built from `data/conditions.json` at load (family, save, boon, duration as
`{ rounds }` or `{ until: <one of an enum> }`, and the mechanical `mods` the engine applies generically: Defense,
to-hit, Movement, vision, AP, save, damage dealt, tick damage). (b) The five flag conditions become rows; their unit
fields become getters over `u.conds` (or stay as storage, written only by `applyCond`/`endCond`). (c) One
`rollInjury`. (d) A lint in `tools/check.py`: no write to `.bleed`, `.prone`, `.dazedNext`, `.stunnedNext`,
`.hidden` or `.conds[` outside `magic.ts`'s condition block. (e) A timed modifier any item can put on a unit
(`applyMod(target, { stat, value, rounds, source })`) so Rewrite and its like stop keeping private clocks.

**Size M. Risk medium** (the `def ± 2` bookkeeping and "fresh on its own turn" are subtle). **Pin first:** golden:
apply, tick to the end, cleanse and end each of the 40 on each tier, with and without each immunity item; plus the
existing `subsystems` and `rules120` tests.

---

### F5. Item code: numbers in TypeScript, one handler per item (lens 11)

**What exists.** `data/effect_ops.json` lists 50 core ops (963 uses in perks, traits and classes) and 113 bespoke ones
(142 uses). That split flatters the engine:

1. Of the 50 "core" ops, **25 have a generic handler** (`effects/core.ts`: `stat_mod`, `stat_mult`, `skill_mod`,
   `skill_mod_tag`, `roll_mod_all`, `save_mod`, `attack_mod`, `immunity`, `damage_mod`, `damage_mult`,
   `damage_taken_mod`, `damage_reduction`, `heal_received_mult`, `action_cost`, `forbid`, `xp_mod`, `unlock_word`,
   `word_cost`, and inside an action `cleanse`, `shield`, `heal`, `condition`, `knockback`, `resource`). The other
   25 are core in name only: `grant_action` (93 uses), `perk_choice` (81), `state` (17), `cost_mod` (16),
   `gate_check` (11), `reveal`, `aura`, `free_move`, `reaction`, `tn_mod`, `extra_use`, `free_action`, `roll_bonus`,
   `reroll`, `interrupt`, `free_attack`, `disadvantage`, `auto_success`…
2. A generic handler claims an effect **only if it has no `when`, `duration`, `limit`, `uses`, `requires_state`,
   `per`, `trigger`, `count` or `area`** (`effects/core.ts:21` `GATES`). Almost every interesting perk has one. So
   the generic ops run the always-on +1s and nothing else.
3. Everything else is a lane handler: **310 `register()` blocks, 7,681 lines inside them, 13,044 lines in
   `perks/` + `classes/`** (a third of the engine). 223 say `claims: 'all'`. **One reads its data.**
4. Each lane file opens with its own copy of the same helpers (F6).

**Proof that the data is not read.** Rewrite: `data/classes.json` says `"uses": "at_will"`; its own text and
`classes/i.ts:1140` say once a turn. The engine is right and the data is wrong, and nothing can notice. A static
cross-check of the 103 items with a single combat action finds 17 whose `uses` differ between data and code. Most
are the data model being too small (one `uses` and one `ap_cost` per item, where Footnote is "once a scene, and in a
fight once a fight"), not errors; the point is that there is no check, and cannot be one while the handler restates
the number.

**What the 310 handlers do** (a regex classification of each `register` body; a handler can be in several rows):

| What the code does | Handlers | A generic op would absorb |
| --- | --- | --- |
| Count uses or keep a private clock (`uses()`, `stateOf`) | 155 | the trigger's own `limit` (see below) |
| Hand a ruling to the Narrator (`note`, `pendRuling`) | 102 | stays; it is the Narrator's 10% |
| Change a roll: to-hit, TN, save, crit range | 68 | `roll_mod` with `when` |
| Change a cost | 64 | F3's `cost` hook as data: `cost_mod` with `when` |
| Change damage dealt or taken | 57 | `damage_mod` / `damage_taken_mod` with `when` (and `deal`'s terms) |
| Answer a stat query | 44 | `stat_mod` with `when` |
| Apply or end a condition | 39 | `condition` / `cleanse` with `when` and a target selector |
| Spend or give a class resource | 38 | `resource` for every resource in the F3 table |
| Give or take AP | 22 | `grant_ap` (through `grantPerkAp`, with the cooldown from `perks/cooldown.ts`) |
| Hide, reveal, spot | 21 | `reveal`, `hide` |
| A free or extra attack | 20 | `free_attack` (a strike spec, the `Tech.strike` options) |
| Roll its own d20 | 20 | F1 `save:` on the effect |
| Move someone | 17 | `displace` (F2) |
| Open a reaction or a window | 13 | `reaction` with `when` |
| Deal damage | 11 | `deal` (the damage migration adds it) |
| Heal | 9 | `mend` (the damage migration adds it) |
| Shield | 5 | `shield` |

42 handlers match none of the patterns (their bodies are a `brief` or a `claims` list), 64 are 12 lines or shorter,
36 are longer than 40.

**The small set of new things that absorbs most of it.** Not 113 new ops. Three pieces:

1. **A trigger vocabulary** (`when`): the hook names the lanes already use most, as data. From the handler bodies:
   `turn_start` (52 handlers), `attack_preview` (40), `combat_start` (38), `on_hit` (37), `damage_in` (32),
   `cond_apply` (28), `attack_roll` (28), `turn_end` (25), `on_miss` (24), `damage_out` (23), `moved` (22),
   `on_downed`, `on_damaged`, `on_kill`, `round_start`. About 15 triggers cover the large majority.
2. **A filter and a limit on the trigger**: `if` (a closed list of predicates: `target.has_condition`, `self.hp_below`,
   `weapon.has_prop`, `attack.mode`, `first_in: turn|round|combat`, `ally_within`, `enemy_adjacent`…) and
   `limit: { per, n }` (which is `uses()`; this alone removes most of the 155 hand-kept counters).
3. **Nine effect ops that take a target selector and read numbers from the effect**: `deal`, `mend` (both coming),
   `condition` / `cleanse` (exist; lift the gate), `roll_mod`, `cost_mod`, `grant_ap`, `resource`, `displace`,
   `free_attack`. Plus the existing `stat_mod`, `damage_mod`, `shield`, `reveal` with the gate lifted.

**How much it absorbs (estimate, labelled as one).** Of 310 handlers: the ones whose whole body is one or two rows of
the table plus a counter, with no Narrator part, are about 110 by the single-feature count (20 cost only, 19 roll
only, 11 damage only, 7 condition only, 7 stat only, 6 AP only, 6 resource only, and their pairs). Add the action
items that are "pay, pick a target in range, do one or two listed things" (I read about 20 and roughly half are;
guess: 60 to 80 of the 163 handlers with actions). **So about 170 to 190 of 310 become data only, and most of the
rest shrink to their unique half.** This is an estimate from pattern counts and a sample, not a per-item audit; the
audit is step 1 of doing it.

**Truly unique (keep as code, and that is fine):** the advanced-class engines (`grand_sigilist.enlarge` 191 lines,
`twinbound.call` 106, `vessel.inner_charge`, `scribe.stored_spell`, `circuit_mage.fusion`, Heartbinder's link,
Heartfed's gauges), the companions and drones (`drone_handler`, `silent_partner`), the illusion family (`mirage`,
`ghost_soldier`, False Image), `wall_run`, `infiltrator.sabotage`, Rewrite's flip table, and everything whose point
is a Narrator ruling. About 40 items. **The 21 shelved advanced classes are most of the longest handlers:** do not
migrate them; when they return as attribute pairs they are rewritten against the new ops anyway.

**For what stays bespoke: `num(h, key)`.** A handler reads its numbers from its own data item
(`num(h, 'range')`, `num(h, 'tn')`), and the validator checks that every `num` key a handler asks for exists in the
item. Then the data is the source again, and a balance change is a JSON edit.

**Size L, in stages; each stage is S or M.** (a) `num()` and the validator rule, and move literals lane by lane (as
step a6 of the damage work does for damage literals). (b) `when` + `if` + `limit` on the existing generic ops. (c)
The new ops, one at a time, each deleting the handlers it absorbs. **Risk medium**: hook order (items run in a fixed
order; `priority` exists and must be expressible in data). **Pin first:** each item's own test in `perks-a` to
`perks-h` and `classes-*` (they exist and pass), plus one golden line per literal moved.

---

### F6. Geometry, selectors and the lane prelude (lens 3)

**What is shared (good):** `combat.ts:346` `key`, `:347` `xy`, `:410` `dist`, `:765` `lineOfSight`, `:798`
`unitSees`, `:905` `sideSees`, `:567` `alive`, `moveBlockers`, `standable` (`:408`), `refOf`.

**What is not:**

1. **"Every tile within r of a tile"**, six copies: `sigil.ts:251` `around`, `classes/i.ts:136` `around`,
   `classes/k.ts:50` `around`, `tactics.ts:216` `tilesWithin`, `physical/ranged/thrown.ts:31` `tilesWithin`,
   `faith.ts:928` `areaOf`.
2. **A straight run of tiles**, four: `world.ts:681` `lineTiles`, `perks/d.ts:1077` `lineTiles`,
   `classes/k.ts:969` `segTiles`, `ai-sigil.ts:345`.
3. **A cone**, at least four, two with the identical dot-product expression: `combat.ts:1232` `coneUnits`,
   `combat.ts:1647` (the full-auto cone), `physical/ranged/press.ts:137` `coneTargets` (`:140` is `combat.ts:1647`
   again), `perks/c.ts:743` `shapeTiles`, `physical/melee/strikes.ts:41` `sweepTiles`; then Sigil's `areaTiles`
   (`sigil.ts:242`) and `burstTiles` (`:294`) and the Outburst shapes in `magic.ts`.
4. **A blast**, two: `tactics.ts:218` `blast` and `physical/ranged/thrown.ts:96` `lobBlast` with its own
   `previewBlast` (`:50`) and `caught` (`:33`).
5. **"Can a unit stand here"**, eight predicates, **five different lists of what blocks** (F2, disagreement 4):
   `sigil.ts:485` `freeTile` (11 object kinds), `magic.ts:471` (4, a regex), `classes/k.ts:51` `free` (7, a regex),
   `classes/i.ts:805` `freeTile` (everything but 4 kinds), and the `moveBlockers` family (`physical/melee/links.ts:42`,
   `physical/core.ts:568` `bad`, `classes/rev3.ts:39`, `perks/c.ts:669`, `perks/skeleton.ts:78`,
   `effects/core.ts:239`, `combat.ts:1672`, `:1724`). `data/objects` already says what blocks movement.
6. **"The enemies of this unit"**, eight definitions with four meanings: plain (`physical/ranged/sets.ts:25`,
   `physical/rules.ts:21`, `physical/pressure.ts:72`, `classes/k.ts:49`, `classes/j.ts:43`); without companions
   (`perks/b.ts:28`, `perks/d.ts:42`); without the Hidden and without those fooled by an image (`ai-soul.ts:69`,
   `ai-sigil.ts:76`); in sight and not Hidden (`faith.ts:943`). Whether a companion, a False Image, a surrendered or
   a Hidden unit counts as "an enemy within N" is decided per file.
7. **The lane prelude**, copied into every lane file: `overworld` 17 times (`effects/uses.ts:23`,
   `effects/actions.ts:89`, `effects/narrator.ts:13`, `classes/i.ts:40`, `classes/rev3.ts:31`, `classes/k.ts:37`,
   `classes/j.ts:28`, `perks/a.ts:22`, `b.ts:22`, `c.ts:28`, `d.ts:35`, `e.ts:30`, `f.ts:24`, `g.ts:27`, `h.ts:21`,
   `perks/skeleton.ts:28`, `perks/cooldown.ts:17`); `say` 12; `rngOf` 10; `tileOf` 7 (two different regexes: three
   accept negative coordinates, four do not); `unitById` 7; `isBoss` 3 (and `tier === 'boss'` 21 times).
8. **A hazard in the prelude:** eight of the ten `rngOf` fall back to `{ state: 1 }` when there is no rng
   (`classes/i.ts:43`, `classes/rev3.ts:34`, `classes/k.ts:40`, `classes/j.ts:30`, `perks/c.ts:31`, `perks/d.ts:37`,
   `perks/e.ts:34`, `faith.ts:505`; and inline at `perks/f.ts:832` and `:942`); the other two return `null`. A fixed seed means the same die every time and no
   error. It should throw.

**The unification.** `packages/engine/src/kit.ts` (or `grid.ts` + `select.ts`): `tilesAround`, `tilesLine`,
`tilesCone`, `tilesBlast`, one `canStand(cb, tile, mover?)`, and one selector
`units(cb, { of: u, side: 'enemy' | 'ally' | 'any', within?: n, from?: tile, sees?: true, include?: ['downed',
'hidden', 'companion', 'image', 'surrendered'] })` whose defaults are the rule and whose `include` makes every
exception visible at the call. The lane prelude is exported from one place. `rngOf` throws without an rng.

**Size S** (new file about 150 lines; the deletions are mechanical). **Risk low**, except the blocker lists: unifying
them changes where Sigil PUSH and some class moves can put a unit; do that part with F2. **Pin first:** unit tests of
the kit against today's outputs for each copy; the golden damage tables already hold the areas of Sigil, Outburst and
blasts.

---

### F7. Preview against execution (lens 7)

| Family | Preview | Execution | Twin? |
| --- | --- | --- | --- |
| Weapon attack | `combat.ts:979` `previewAttack` | `combat.ts:1113` `resolveAttack` calls it | Shared |
| Techniques | `physical/core.ts:811` `previewTechnique` | `:854` `useTechnique`, same handler, `t.preview` | **Shared, the model** |
| Evoke | `sigil.ts:579` `planEvoke` | the Evoke itself starts from the same plan (`sigil.ts:951`) | Shared |
| Draw a glyph | `sigil.ts:814` `previewDraw` | `drawGlyph` (the AP check is repeated at `:861`) | Mostly shared |
| Outburst | `magic.ts:878` `previewOutburst`, `:1598` `planInner`, `:1704` `planStrike` | `beginOutburst` calls the preview; the release resolves strikes in its own loop (`:1184` on) | **Partly a twin** (guess: I did not trace every rider through both) |
| Calls | `calls/core.ts:108` `previewCall` | `:118` `useCall` calls it | Shared |
| Prayer | `faith.ts:224` `previewPrayer` | `faith.ts:853` `combatPray` and `:1373` `storyPray` call it; effects in two resolvers | Preview shared; execution is a story/combat twin (F10) |
| **Item actions** | `ActionDef.preview`, hand-written per item: **136** | `ActionDef.run`: **229** | **Twins, 136 of them; about 93 actions have no preview at all** and show their rules text |
| **Enemy turn** | `combat.ts:2290` `enemyIntent` | `combat.ts:2082` `enemyTurn` | **Twin** (F12) |
| Tests and the simulator | re-derive `max(1, floor(total) − armour)`: `test/balance/sim.ts:337`, `:339`, `:359`, `policies.ts:54`, six `phys-*` tests | | Known; `effects/output.ts:168` `landed` now exists. Two engine sites still do it by hand: `classes/i.ts:390`, `perks/a.ts:216` |

**The item-action twins repeat literals.** Grenadier's Arm: the preview computes
`Math.floor((10 + kg / 4) * physicalMult)` at `perks/c.ts:691` and the action computes it again at `:698`.

**The unification.** Give the item-action runtime what `Tech` has: `h.preview` is true, the same `run` is called,
and the shared helpers (`deal`, `mend`, `rollSave`, `displace`, `applyCond`, `pay`) record into the preview instead of
acting. With F5's ops a data-only item needs no preview code at all. **Size:** the runtime change is S; converting
the 136 twins rides on F5. **Risk low** (previews change nothing). **Pin first:** the golden tables already record a
preview line beside each hit.

---

### F8. Limits and counters (lens 2)

**Seven stores:**

1. `effects/uses.ts` `uses(h).take/left/refund`: lazily stamped cells, every scope from turn to campaign, the right
   home per scope (unit, `story.ps`, character). **60 calls. The good one.**
2. `stateOf(h)` (`effects/index.ts:44`): free-form per-item state, **452 references, 113 distinct field names**,
   among them hand-kept counters and clocks (`disUsed`, `juryUsed`, `cd`, `r`, `kr`, `round`, `found`, `noted`,
   `vowRound`), each compared to `cb.round` by hand (74 such compares in `src/`).
3. Technique state `u.tech[id]` with `turnStamp(cb)` (`physical/core.ts:54`, 41 uses; `:62`).
4. Unit fields: `reactUsed`, `reactedRound`, `shotsThisTurn`, `firstShotTurn`, `openerUsed`, `prayedRound`,
   `stopped`, `moved`.
5. `perks/cooldown.ts`: the AP perks' "once every three turns", stored as a round number in `stateOf(h).cd`.
6. Faith's own: `fs(u).whisperTurn`, `u.prayedRound`, `st.ownHymn[id]` in a fight (`faith.ts:862`);
   `storyFaith(g, c).whisperRound`, `hymnRound`, `own[id]` in the story (`faith.ts:1387`); `c.miracleSession`.
7. The story's: `g.story.ps[charId]`, `g.story.noticed[key] === g.story.round` (`game.ts:2449`), `c.uses`.

**Reset points:** none for store 1 (stamps). Stores 2 to 5 die with the unit at the fight's end, **except on the
area map**, where units are rebuilt on every action, which is why `stateOf` and `uses` each carry an `overworld`
branch and why `cooldown.ts` says "the area map is not covered".

**Disagreement:** "once a turn" means the stamp `round.turn` in store 1, `turnStamp` in store 3, "a flag cleared in
`turn_start`" in stores 2 and 4. Inside an off-turn window (On My Mark, Supreme Command) the turn index does not
move, so a stamp-based "once a turn" is **not** refreshed by a window while a `turn_start`-cleared flag is not
either, but a `turn_end`-cleared one may be (guess: I did not trace which items clear where; it is the kind of
difference that only a per-item test finds).

**The unification.** Everything through `uses()`. Add two things it lacks: a `cooldown` scope
(`take('cooldown', turns)`, which is `perks/cooldown.ts` generalised) and a "first X of the fight" helper
(`first(h, 'kill', 'per_combat')`). The data's `limit` (F5) is the only way an item states a limit.
**Size M** (it mostly rides on F5). **Risk low.** **Pin first:** the per-item tests.

---

### F9. Character, Unit and `story.magic`: one state in three shapes (lens 9)

**What exists.** A character's live state is held on the `Character` (the sheet: `hp`, `mp`, `evoCharge`, `stims`,
`pack`, `loaded`, `res`), on its `Unit` in a fight (231 typed fields and **53 more that exist only as
`(u as any).field`**), and in `g.story.magic[charId]` between the two (flux, Strain, the held Outburst, conditions,
shield). On the area map a scratch fight is built for every action (`game.ts:2418` `storyCb`) and thrown away.
Moving state between them is hand-written field lists:

- `combat.ts:420` (build a unit from a character) and `:480` (from an NPC);
- `game.ts:2294` `magicIn`, `:2329` `magicOut`;
- `game.ts:2132` `unitToCharacter` (ammo, magazines, loose rounds, off-hand, throwables, parts, durability);
- `game.ts:1772` `refitUnit`, `game.ts:3056` `sbRebuild`, `game.ts:500` `refreshClassUnits`.

**What it has cost: the comments say it.** `game.ts:2158`: "rules 1.9 fix: they used to overwrite magazines u.extra
had just added". `:2165`: "written back once (rules 1.9 fix: a mid-fight swap wrote them twice)". `:2160`: "review
fix: picked-up types were lost". `apply()` (`game.ts:461`) carries two more patches that re-derive unit fields from
the sheet for old saves.

**The line that will bite the roguelike:** `game.ts:2170`:
`if (u.res && u.resMax) for (const r of Object.keys(u.res)) if (r === 'supplies' || r === 'toxins') (c.res ||= {})[r] = u.res[r];`
A class resource persists after a fight only if its name is one of two literals. A relic with charges, a run-long
meter, a curse counter: each silently resets after every fight until someone finds this line.

**Item actions pay the price too:** 31 actions exist twice, as `x` (scope combat, reads `u.mg.charge`) and
`x_story` (scope story, reads `evoChargeNow(c)`), because the resource has a different accessor on each side
(`classes/i.ts:1140` and `:1166` for Rewrite; `:1573` and `:1584`).

**The unification.** One declared table of unit state (F3's `resources` rows plus the rest): for each field, where it
lives on the unit, where on the character, and whether it persists `after_fight`, `after_scene`, `after_rest` or
never. One `syncIn(character → unit)` and one `syncOut(unit → character)` walk the table. An accessor
`res(holder, 'charge')` that works on either side, so `x` and `x_story` can be one action. The 53 untyped fields get
types (a typed `Unit` is what makes "who writes this" answerable).

**Size M** for the table and the two functions; the 31 action twins fold as F5 reaches them. **Risk high**: this is
saves, ammunition and inventory; a mistake loses a player's magazines. **Pin first:** a round-trip golden: for every
resource and every inventory shape (magazines by type, loose rounds, off-hand gun, throwables, parts, Strain, a held
Outburst, conditions), story → fight → end → story → fight, recorded exactly.

---

### F10. Story-mode and combat-mode versions of the same thing (lens 9)

1. **Prayer.** `faith.ts:853` `combatPray` and `:1373` `storyPray`: the same sequence twice (cooldown stamp, mana
   +, the roll at `:869` and `:1394` word for word, the fx, the Miracle's fx and price, the patron's line, Witnessed),
   then two resolvers of what a Blessing does (`runEntry` from `:1013`, a switch of a few hundred lines, and
   `storyEffect` at `:1426`). They differ: combat reads `u.blessPower || blessingPower(c)`, story `blessingPower(c)`; the
   cooldowns are stores 6a and 6b of F8.
2. **Checks.** `game.ts:1006` `rollCheck` (story), `game.ts:1649` (a fight ruling's check: its own die and total),
   `game.ts:2460` (staying hidden on the area map), `game.ts:670` (asking a voice), `world.ts:440` `previewOdds`.
   Four dice paths for "d20 + skill vs TN" with three ways to gather the modifier: `checkMod + songMod +
   skillRollMod` (`game.ts:670`, `world.ts:437`), `sideRollMod + condSkillMod` (`game.ts:1649`), and
   `mod(c.skills.x || 0)` written out 27 times in 10 files (which skips items, songs and conditions).
3. **Magic and items: shared** (the scratch fight). This works, at the cost in F9.
4. **Conditions:** two systems (F4, point 6).

**The unification.** Prayer: one `pray(ctx)` where `ctx` is "a fight" or "the story" and supplies `pay`, `log`, `fx`
and `targets`; one resolver per Blessing with the effects as F5 ops (the eight patrons' Hymns are mostly `mend`,
`shield`, `condition`, `deal`, `displace`). Checks: `rollVs` from F1 with one `skillMod(holder, skill, ctx)` that
always includes items, songs and conditions; delete the 27 inline ones. **Size M. Risk medium** (Faith was just
rebalanced; its golden table pins amounts but only one intervention is fired). **Pin first:** extend the `faith`
golden table with a story line for each Whisper, Hymn and Miracle.

---

### F11. Log lines, fx events and refusals (lens 10)

**Counts.** 693 log lines built at their call sites (`cb.log.push(` 278, the lanes' `say(` 415). 351 `emitFx` calls
of 125 kinds; `shove` is emitted from 21 places, `stance` 17, `heal` 11, `volley` 11. Sign formatting
(`x >= 0 ? '+' : '−'`) is written out 29 times, the plural `=== 1 ? '' : 's'` 24 times. Refusals: 177
`'Needs …'` strings, each built where it is returned.

**The real problem is not the repetition; it is that functions return prose, and rules then read the prose back:**

1. `physical/core.ts:483`: a technique learns whether its condition landed by
   `!/resists|untouched|shrugs/.test(s)` on the sentence `applyCond` returned. `faith.ts:743` does the same for a
   grudge.
2. `perks/a.ts:430` and `:476`: two perks learn which limb was injured by running
   `/INJURY \(d6 \d\): (left|right) (arm|leg)/` over the **last line of the fight log**.
3. `perks/f.ts:521`: a perk counts hits by `l.startsWith(name + ' fires at') || l.startsWith(name + ' strikes')`.
4. `effects/actions.ts:202`, `perks/c.ts:56`, `combat.ts:2369`: "is this refusal only about AP?" is
   `/^Needs/.test(why)`.
5. `game.ts:1941` `combatReport`: the Narrator's summary of a fight is a regex of about 25 words over the log
   (`CRITICAL|INJURY|Downed|…`).
6. `world.ts:374` reads `cb.log[cb.log.length - 1]`.

Change the wording of one sentence and a rule stops working, with no type error and no failing test unless that exact
perk is covered.

**The unification.** Mutators return results (`CondResult { landed, resisted, immune, save?: RollResult }`,
`InjuryResult { loc, side }`, `Refusal { code: 'ap' | 'range' | 'sight' | 'resource' | …, text }`). The sentence is
made from the result by one formatter per kind (`fmt.save`, `fmt.cond`, `fmt.moved`, `fmt.needs`), and the fx event
by the same call. F1, F2, F3 and F4 each deliver their kind; this finding is the rule that ties them: **nothing reads
a log line**. Add to `tools/check.py`: no `.test(` on a returned line, no `log[log.length - 1]`.
**Size:** S for the six read-backs above once F1 and F4 return results; L to route all 693 lines through formatters,
and not worth doing as its own project. **Risk low.**

---

### F12. The enemy's intent is a second copy of the enemy's turn (lens 7, 8)

`combat.ts:2082` `enemyTurn` is a ladder of about 20 decisions. `combat.ts:2290` `enemyIntent` / `:2302`
`intentInner` (the Trickster's Read, and the intent markers) is the same ladder written again to return text, and
`EnemyStep` carries an `act` and a `plan` for the same reason (`combat.ts:2079`). They already differ: the turn
breaks a grapple only with 2 AP, clears a jam only with 2 AP, stands only if not ordered to kneel; the intent says
"break the grapple" regardless. The intent assumes "a fresh turn's AP" as a constant 6 (`combat.ts:2297`, a private
`AP_BASE`), not what `turnAp` would give a Dazed, Stunned or Suppressed unit. Every new enemy behaviour for the
roguelike has to be written twice or the Read lies.

**The unification.** One `enemyPlan(cb, u): Step[]` that decides and returns steps with their text; `enemyTurn`
executes the first step and re-plans; `enemyIntent` returns the first step's text, with `turnAp` for the AP.
**Size S to M. Risk medium** (rules 1.23 and 1.25 target choice was just tuned, and the golden damage tables
deliberately switch the AI off). **Pin first:** a golden of "intent text, then what the enemy actually did" for each
tier and weapon over a set of seeded positions.

---

### F13. What a unit *is* is read from its name (lens 12)

"Is this a machine" is `['robot', 'machine', 'drone', 'turret'].includes(u.kind) || /drone|robot|automaton|\bbot\b|
turret/i.test(u.name)` in four places (`tactics.ts:365`, `classes/k.ts:60`, `perks/c.ts:42`, and when a foe is built,
`combat.ts:1305`), with small differences (one leaves `turret` out of the name test). "Is a boss" is
`t.tier === 'boss' || t.kind === 'celestial'` in three lane files and `tier === 'boss'` 21 times. A human enemy named
"Turret Gunner" is a machine. A roguelike adds enemies by the dozen.

**The unification.** `tags: string[]` on the enemy data and the unit (`machine`, `living`, `celestial`, `boss`,
`summon`, `image`…), set once when the unit is built; `is(u, 'machine')`. **Size S. Risk low** (the name regex stays
as the fallback when data gives no tags, for Narrator-made foes, in one place). **Pin first:** nothing beyond the
existing tests.

---

### F14. The stat-query string bus (lens 12)

`statQuery(x, '<id>')` is how the engine asks items a number and `stat: (h, stat, ctx) => stat === '<id>' ? … : 0`
is how an item answers. The ids are bare strings on both sides, about 80 of them, and nothing connects asker and
answerer. Found by diffing the two sets:

- `ap_cost:triage`, `ap_cost:heal` answered (`perks/e.ts:950`), never asked: **the Field Medic bug** (F3).
- `ap_cost:ward` answered (`perks/d.ts:286`), never asked.
- `'action_cost'` declared as a hook, never emitted; `call_cost` emitted, never handled.
- `COST_SITES` (what the data op may name) and the ids `actionAp` is called with are two hand-kept lists: 12 ids are
  asked but not in the allowlist, 5 are in the allowlist and never asked (F3).

**The unification.** `type StatId = 'ap_cost:reload' | … ` generated from one `STATS` table (id, what it means, who
asks). `statQuery` and `ItemHandler.stat` take `StatId`. A test asserts that every id any handler answers is asked
somewhere and that `COST_SITES` equals the set `actionAp` is called with. **Size S. Risk none** (it adds a check and
changes no behaviour). **It would have caught the Triage bug the day it was written. Do it first.**

---

### F15. Small constants with more than one home (lens 12)

1. A turn's base AP of 6: `effects/ap.ts:10` `AP_BASE`, `combat.ts:2297` `AP_BASE` (private), `game.ts:2178`
   `ROUND_AP`, and `perks/f.ts:519` `f.ap = 6`.
2. Half cover's 5: 16 literal uses in cover contexts (`classes/soul.ts:30`, `classes/j.ts:815` among them).
3. The save TN's 12: 42 (F1).
4. Movement helpers: `combat.ts:762` `apForTiles`, `:736` `canAffordTiles`, and
   `calls/handlers.ts:26` `orderMoveTiles` (`Math.floor(u.movement)`, its own rounding).

All S, all fall out of F1 and F3. Listed so they are not forgotten.

---

## 3. Bugs and disagreements found on the way (read, not run)

| # | What | Where | Confirm with |
| --- | --- | --- | --- |
| 1 | Field Medic does not make Triage cheaper (the id it answers is never asked) | `perks/e.ts:950`, `classes/i.ts:487` | Preview Triage on a Bard with the trait: expect 1 AP, will read 2 |
| 2 | The Injured condition ignores Injury Resist, the `injury` hook and bleed immunity (second injury table) | `magic.ts:355` against `combat.ts:1254` | `applyCond(…, 'injured')` on a unit with `injResist: 100` |
| 3 | A Nailed unit can be moved by 11 of the 14 forced moves | F2 table | Nail a target, then Sigil PUSH it |
| 4 | "Can't be pushed" items guard one of two doors, so each stops only some pushes | `perks/a.ts:348`, `effects/core.ts:234`, `physical/core.ts:526` | Siege Engine against a class move's generic `knockback`; an `immunity: knockback` trait against a technique's push |
| 5 | Sigil PUSH can land a unit on a barrel, container, terminal, turret, low wall or hole | `magic.ts:471` | PUSH a unit toward a barrel tile |
| 6 | Saves from techniques, hazards, Hymns and class moves ignore items that change saves through `cond_apply` | F1, point 1 | A unit with a `saveAdd` item against a technique's Stop |
| 7 | Rewrite's story half rolls the target's save with no modifier | `classes/i.ts:1170` | Read: `r >= tn` |
| 8 | Switcheroo emits no fx event (the swap is invisible to the client's animation) | `faith.ts:1061` | Fire it and read `cb.fx` |
| 9 | `data/classes.json` Rewrite: `"uses": "at_will"`; the rule is once a turn | `classes/i.ts:1140` | Read |
| 10 | Enemy intent can name an action the enemy cannot afford (grapple, jam with under 2 AP; a Dazed turn) | `combat.ts:2302` on | F12's golden |
| 11 | Two allowlists for story conditions carried into a fight differ (`augment_offline`) | `game.ts:1048`, `world.ts:561` | Read |
| 12 | Eight `rngOf` helpers roll with a fixed seed when no rng is in reach | F6, point 8 | Make `rngOf` throw and run the suites |
| 13 | The spec contradicts itself on whether anyone reacts to forced movement | rules 1.19 Fear; `physical/core.ts:524` | Leon's ruling |

None of these is fixed here (read-only). 1, 2 and 7 to 9 are one-line fixes that should not wait for the refactors.

---

## 4. The full ranking

Value is how much future work the change removes (new items, enemies, relics and a roguelike mode in particular);
size × risk is the denominator. Higher score first.

| Rank | Finding | Value | Size | Risk | Why here |
| --- | --- | --- | --- | --- | --- |
| 1 | F1 Saves and rolls | Very high | M | Low | Every relic and enemy touches a save; mechanical; transparent dice for free |
| 2 | F2 Forced movement | High | M | Medium | Real bugs today; every knockback relic and hazard room needs it |
| 3 | F14 Typed stat ids | Medium | S | None | An afternoon; catches a live bug; guards F3 |
| 4 | F3 Costs | Very high | M | Medium | New resources and "costs less" relics are the roguelike's bread; removes the loan hack |
| 5 | F4 Conditions | High | M | Medium | New conditions become data; closes the direct-write holes |
| 6 | F6 Kit (geometry, selectors, prelude) | Medium | S | Low | Cheap; ends "which enemies count" being a per-file opinion |
| 7 | F5 Item ops and data numbers | Highest | L (staged) | Medium | The big one; depends on 1 to 6 existing so the ops have something to call |
| 8 | F7 Preview = dry-run | Medium | M to L | Low | Rides on F5; removes 136 twins |
| 9 | F9 One unit state table | High | M | High | The `supplies`/`toxins` whitelist will break run-long resources; do before the roguelike, after the golden exists |
| 10 | F8 Counters | Medium | M | Low | Rides on F5's `limit` |
| 11 | F13 Unit tags | Medium | S | Low | Before the roguelike's enemy roster |
| 12 | F12 Enemy plan | Medium | S to M | Medium | Before new enemy behaviours |
| 13 | F10 Prayer and check twins | Medium | M | Medium | After F1 and F5 |
| 14 | F11 No rule reads a log line | Medium | S (the six read-backs) | Low | Falls out of F1 and F4 |
| 15 | F15 Constants | Low | S | None | With F1 and F3 |

## 5. Order of work

1. **Now, beside the damage migration (they do not touch the same code):** F14, then the one-line bugs of section 3
   (1, 2, 7, 8, 9), then F6's kit and prelude without the blocker lists.
2. **Record the goldens before anything moves:** saves (F1), forced movement (F2), costs (F3), conditions (F4), the
   story/fight round trip (F9). The damage work proved the method: 5,327 actions, twelve tables, and the re-expression
   moved no line. The forced-movement and saves tables will record today's disagreements as they are; that is the
   point, they become the list of rulings.
3. **Leon's rulings** (two): what forced movement triggers (my recommendation is in F2), and "a save is a save"
   (items that change saves apply to every save; F1).
4. **F1, F2, F3, F4** in that order, each as its own branch with its table green before and after.
5. **F5 in stages** once `deal` and `mend` are in from the damage work: `num()` and the validator rule first (the
   data becomes the source for what stays bespoke), then `when` / `if` / `limit`, then the ops, lane by lane. Skip the
   21 shelved classes. F7 and F8 ride along.
6. **F9, F12, F13 before the roguelike's first content**, F10 after F5.

What I would **not** do: route all 693 log lines through formatters as a project (F11), rewrite the advanced-class
engines, or merge the six action runtimes into one. The runtimes can stay six as long as all six call the same
`price`/`pay`, `rollSave`, `displace`, `applyCond`, `deal` and `mend`. The engine's problem is not that it has
several front doors; it is that each door built its own plumbing.
