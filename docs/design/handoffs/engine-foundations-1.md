# Engine foundations 1: stat ids, the kit, the rolls, forced movement (12 Nov 2026)

Wave 1 of [the foundation plan](../proposals/2026-11-engine-review/PLAN.md), from
[engine review 1](../proposals/2026-11-engine-review/1-duplication.md): its findings **F14, F6, F1, F2** and the bugs it
found by reading. Each finding is now **one primitive**, a **lint test** that fails when someone goes round it, and a
**pin** (a golden table or a roll digest) recorded before the code moved.

If you only read one part, read [How to add things](#how-to-add-things).

## What was built

| Finding | The primitive | Sites it replaced | Behaviour changed? |
| --- | --- | --- | --- |
| The bugs (review section 3) | fixes | 8 | Yes: they were bugs (list below) |
| **F14** typed stat ids | `effects/stats.ts`: `StatId`, `CostSite`, `STATS`, `COST_SITE_IDS` | every `statQuery` / `actionAp` / `stat:` (43 plain ids, 7 families, 25 cost sites) | Three dead answers removed, two now asked, `COST_SITES` corrected |
| **F6** the kit | `src/kit.ts` | about 90 private helpers and inline fallbacks in 24 files | Four edge cases (below); no test, golden line or die moved |
| **F1** the rolls | `src/rolls.ts`, and `saveAgainst` / `saveTn` in `magic.ts` | 67 `d20(` sites, 45 hand-written pass/fail lines, 8 private save helpers, 7 tier tables | Yes, one ruling: **a save is a save** |
| **F2** forced movement | `displace` and `swapUnits` in `combat.ts`; table in `data/rules.json` `forced_movement` | 15 implementations and 3 own-item moves | Yes, one ruling: **the forced-movement rule** (115 golden lines) |

Branch: the worktree's (see the report). Every commit is one step, in the order above.

## The pins (how to know nothing else moved)

1. **`test/golden/rules-<section>.json`** (in `npm run check`, `test/golden-rules.test.ts`): the 2,900 actions of the
   damage tables read a second way: how many dice were rolled, and what changed on each unit that is not an amount
   (tile, conditions, Prone, Bleeding, Dazed, Stunned, Hidden, Braced, Nailed, injuries). Every action that rolls is
   played from five seeds (its own, and a natural 1 and a natural 20 on the first and on the second die). **These
   state lines did not move through F6, F1 or F2.** `rules-<section>.log.json` holds the words (log lines, roll and
   move events): re-record them when wording changes with `GOLDEN_RECORD=log npm test -w @phc/engine -- golden-rules`.
2. **`test/golden/moves.json`**: 14 forced movers × 29 cases (each blocking object, a broken crate, a unit, the edge,
   a trap, a Sigil trap, a Sigil field, a fire, a mine, a held Overwatch, an enemy in reach, a Nailed target, each of
   the two "can't be pushed" doors, a Braced target). Recorded on the old code (commit `dc19629`), re-recorded once
   with the rule: the 115 lines that moved are listed below.
3. **The roll digest** (`test/helpers/roll-digest.ts`, opt-in, not in `npm run check`): every die of every test of
   the suite, counted and hashed per test. Record before a refactor, compare after:
   `cd packages/engine && ROLL_DIGEST=record npx vitest run --config vitest.digest.config.ts`, then `ROLL_DIGEST=compare`.
   Across F6 and F1 **one** test rolled different dice (an error path: with `STRICT_VIA` on, the error is now thrown
   before the die is drawn instead of after). Across F2, six more, all of them tests that pinned "a held Watch fires
   at a pushed enemy" (the ruling below).
4. The damage golden tables (5,327 actions): identical throughout.

**Honest limits.** The golden tables exercise 16 of the 67 roll sites; the roll digest of the suite covers 59; five
are reached by no test at all and were migrated by reading only: an Atheist's story prayer by dice
(`faith.ts` `storyPray`), the fresh save of Name It (`magic.ts` `freshSave`), the shelved Shell Priest's overreach
(`classes/k.ts`), Shadow Step under watching eyes (`perks/b.ts`), Stolen Fire (`perks/d.ts`). The machine was shared
with other agents' browser suites while this ran (load 20 to 35 on 4 cores), so full runs used a long test timeout;
the timed balance tests time out under that load and pass alone.

## The bugs (review section 3)

Each has a test in `test/foundations-bugs.test.ts` that failed on the old code.

| # | Bug | Fix |
| --- | --- | --- |
| 1 | Field Medic did not make Triage cheaper | Triage asks `ap_cost:triage` (`classes/i.ts`). The Warden's Ward asks `ap_cost:ward` the same way |
| 2 | The Injured condition had its own injury table (no Injury Resist, no `injury` hook, no bleed immunity) | `applyCond(…, 'injured')` calls `rollInjury`; `injureUnit` is gone |
| 7 | Rewrite's story half rolls with no modifier | **Not a bug:** the target is free text, there is no sheet. The die is rolled by `rollVs` and the ruling tells the Narrator to add the target's Rumination. Puppet's story half is the same |
| 8 | Switcheroo emitted no effect event | The two `shove` events an Outburst swap emits |
| 9 | `data/classes.json` Rewrite `"uses": "at_will"` | `"per_turn"` |
| 10 | An enemy's intent named actions it could not pay for | It reads the AP of its next turn (Stunned 1, Dazed 2 off) and the turn's own AP gates |
| 11 | Two lists of story conditions carried into a fight | One `STORY_CARRY` (`magic.ts`); the area map's had lost `augment_offline` |
| 12 | Eight `rngOf` helpers rolled on `{ state: 1 }` | `kit.ts` `rngOf` throws when no rng is in reach |

Bugs 3, 4, 5, 6 and 13 are F2 and F1 themselves.

## F14: stat ids

- **File:** `packages/engine/src/effects/stats.ts`. `STATS` (plain ids with what they are), `STAT_FAMILIES`
  (`ap_cost:`, `skill:`, `immune:`, `save_`, `passive:`, `technique:`, `momentum_needed:`), `COST_SITE_IDS`,
  `type StatId`, `type CostSite`, `isStatId()`.
- `statQuery(x, stat: StatId, ctx)`, `onStat(stat: StatId, …)`, `ItemHandler.stat(h, stat: StatId, ctx)`,
  `actionAp(x, action: CostSite, base)`. Comparing `stat` with an undeclared id is a type error.
- **Lint** (`test/lint-foundations.test.ts`, "F14"): every answered id is declared and asked; every asked id is
  declared; every declared plain stat is asked; `COST_SITES` is exactly the sites `actionAp` is called with (plus the
  alias `heal`).
- **Changed:** `ap_cost:heal` (Field Medic) and `size` (Heavyworlder) were answered and never asked: removed.
  `COST_SITES` lost `move`, `load`, `brace`, `overwatch`, `swap` (never priced through `actionAp`, so a data effect
  naming them was claimed and did nothing) and gained `break`, `crystallise`, `escape`, `extinguish`, `hide`,
  `parley`, `pray`, `recover`, `reload_both`, `swap_core`, `triage`, `vent`, `ward`, `whisper`. A data `action_cost`
  effect's own `min` is honoured. The hook name `action_cost`, which nothing emitted, is gone.

## F6: the kit (`packages/engine/src/kit.ts`)

```ts
overworld(cb)  inFight(h)  say(cb, line)  unitById(cb, id)  tileOf(cb, text)  rngOf(h?, ctx?)        // the lane prelude
inBounds(cb, k)  tilesAround(k, r, cb?)  tilesLine(a, b, { end? })                                   // the grid
landBlockers(cb)  canStand(cb, k, mover?, blocked?)  standBlocker(cb, k, mover?, blocked?)           // ONE blocker list
foesOf(cb, u, who?)  alliesOf(cb, u, who?)                                                           // who counts
interface Who { downed?, surrendered?, hidden?: false, companions?: false, images?: false, within?, from?, seenBy?, self? }
```

- **Replaced:** `overworld` ×18, `say` ×13, `unitById` ×6, `tileOf` ×7, `rngOf` ×10 and 12 inline `|| { state: 1 }`
  fallbacks; "tiles around" ×6 (`around`, `tilesWithin`, `areaOf`); a line of tiles ×3; "can a unit stand here" ×8
  with five different lists; `foesOf` / `alliesOf` ×10 with four meanings; `onMap` ×2.
- **One meaning each.** `foesOf(cb, u)` is the other side's units still in the fight (not dead, Downed or
  surrendered); Hidden units, companions and False Images count unless the call says `{ hidden: false }`,
  `{ companions: false }`, `{ images: false }`. The files that left companions out (`perks/b.ts`, `perks/d.ts`) say so
  at each call now; the casters' AI says `{ hidden: false }`. No call's meaning changed.
- **The blocker list** is `moveBlockers`: the map's solid tiles and standing objects whose kind says `blocks_move` in
  `data/objects.json`. Walking and every forced move share it.
- **Where the copies disagreed (behaviour that can differ; nothing in the suite or the goldens moved):**
  1. A tile whose crate is **broken**: Sigil's STEP and the walk of a Line used to refuse it (they read the map's
     cover list as well as the objects); they follow the walking rule now.
  2. The **shelved classes'** pulls and placements (`classes/k.ts`) stopped at seven object kinds; they now stop at
     every blocking kind (a door, a hole, a terminal and a Sigil wall added).
  3. **Mirage's** "tiles between two tiles" used a different line algorithm than the rest of the engine; on some
     slopes it differed by one tile. It is `tilesLine` now.
  4. `tileOf` in three files accepted a negative tile (`-1,2`); it is refused everywhere.
- **Left:** cones and blasts are still per file (review F6 items 3 and 4); `classes/i.ts` `freeTile` (an EMPTY tile to
  place an object on, a different question) and Grenadier's Arm's object landing keep their own rule.
- **Lint** ("F6"): no private copy of a kit helper; no `{ state: 1 }` outside five counted preview lines.

## F1: the rolls (`packages/engine/src/rolls.ts`)

```ts
rollD20(rng, { adv? }) → { die, dice }                       // THE die: the only d20() call in the engine
judge(kind, { die }, mod | parts, tn, { nat?, over?, fam?, lead? }) → RollResult      // a die already rolled, judged
rollVs(cb | null, rng, { by?, mod, tn, why?, nat?, over?, adv?, lead?, fx? }) → RollResult
rollSave(cb, rng, { by, target, fam, id, tn, mod, via?, adv?, ca?, tnAdd?, lead?, fx? }) → RollResult
contest(cb | null, rng, { by?, mod }, { by?, mod }, why?) → { a, b, won, text }
rerollAttack(rc, rng, bonus?)  attackHits(rc)  passFaces(mod, tn)  rollText(result, lead?)  rollFx(cb, result, who, { by?, why? })
SAVE_TN  TN.{easy,standard,hard,heroic}  CONTEST_BASE  DEATH_SAVE_TN  tierSave(tier)  tierStrength(tier)
interface RollResult { kind, die, dice?, mod, parts, total, tn, ok, nat, skipped?: 'immune' | 'no_save' | 'auto', why?, fam?, text }

// magic.ts: the usual save
saveTn(by, via?, str?)                                        // 12 + the strength of the skill that delivered it
saveAgainst(cb, rng, by, target, fam, id, { via?, str?, tn?, tnAdd?, adv?, fx? }) → RollResult
```

- **One result** is the log sentence (`text`: `heart save d20 12 +2 = 14 vs 15`, a natural 1 or 20 said), the `roll`
  effect event (`{ k: 'roll', roll: 'save' | 'roll' | 'contest', unit, by?, fam?, why?, die, dice?, mod, total, tn, ok,
  nat?, skipped? }`) and the numbers a screen shows. `ok` on a save means it **resists**.
- **Numbers from data:** the save base 12 (`rules.json` `conditions_rules.save_base_tn`), the check ladder
  (`resolution.tn_ladder`), and the new `rolls` block (`contest_base`, `death_save_tn`, `npc_save_by_tier`,
  `npc_strength_by_tier`).
- **Kept as thin adapters over the primitive** (they shape its answer for their callers): the technique's `save`
  and the new `saveOutside` (`physical/core.ts`), `famSave` (`classes/rev3.ts`), `teleportSave` (`sigil.ts`),
  `hymnSave` (`faith.ts`), `bodySave` (`classes/k.ts`), `freshSave` (`magic.ts`).
- **`rollD20` (the bare die) is used in 14 counted places** that are not "d20 + modifier against a number" or whose
  hook must see the die before the modifier: initiative ×2, the weapon attack, the death save, the story check, asking
  a voice, staying hidden, spotting, a spell's to-hit ×2, the Stitch ×2, story Puppet, a night's Vigilance. The weapon
  attack (`resolveAttack`) and the story check (`rollCheck`, with Echo) keep their own pipelines and hooks: they were
  already one path each. Attack rerolls (Lucky Break, Lucky Foot) go through `rerollAttack`.
- **Lint** ("F1"): no `d20(` outside `rolls.ts`; `rollD20(` only in the counted places; no hand-written
  `=== 20 || (… !== 1 &&` or its miss twin; no `TIER_SAVE` / `NPC_SAVE` / `TIER_DEBUFF`; no `12 + unitStrength(`.

### The ruling built: a save is a save

`rollSave` fires `cond_apply` for every save (unless the caller is `applyCond`, which already fired it and hands its
context over as `ca`), then the new `save` hook (`{ by, t, id, fam, via, saveAdd, tnAdd, pass, fail, why }`). `id` is
the condition, or a word for a save that is not a condition (`stop`, `shoved`, `teleport`, `hazard`, `hymn`,
`surrender`, `rewrite`, `grand_form`). So the 28 item handlers on `cond_apply` (a bonus to a family's saves, a harder
TN, an immunity, "no save", "your next save +N") now reach every save. **Behaviour changes** (each is "an item that
changes saves now applies here too"; none moves a number when no such item is in play, which is why no golden state
line moved):

| Save | Asked items before | Now |
| --- | --- | --- |
| A condition's own save (`applyCond`), the Defender's Shove, Sigil STEP, an Outburst's push / pull / swap | yes | yes |
| A technique's Stop and every other technique save (`physical/core.ts` `save`) | no | yes |
| Guard with Reach on a mover's step; a Bound unit walking away (`saveOutside`) | no | yes |
| A hazard (minefield, gas) | no | yes |
| The offer of terms and every talk-down (`trySurrender`), Mercy's surrender, a perk's offered mercy (`perks/f.ts`) | no | yes |
| A Hymn's save (Switcheroo, Pratfall) | no | yes |
| Rewrite, Puppet, the Assassin's toxin, a Grand form's save | no | yes |
| The fresh save of Name It; Corroded's end-of-turn save | no | yes |
| A Dazed / Prone flag condition's save | yes, but not Defiance's "next save passes" | yes, all |

Three consequences worth knowing: (1) an **immunity** to a family or a condition now cancels those saves' effects
too; (2) "your **next** save" items (Defiance, Proven Formula, You Get Used to It, the Masterpiece, Encouragement,
Grudge Bearer's "no save") are spent by the next save of any kind; (3) every save's log line shows the die and the
modifier, where most showed only the total. Seventeen test regexes on the old wording were updated (words only).

Not changed on purpose: asking a voice still has no natural 1 or 20 (spec item 1473); Lay Down Arms still treats a
tierless story NPC as a Soldier (item 1475).

## F2: forced movement (`combat.ts`, beside `moveUnit`)

```ts
displace(cb, rng, unit, { away: tile, tiles } | { toward: tile, tiles } | { tile }, {
  by, how: 'push' | 'pull' | 'throw' | 'teleport' | 'swap', source, willing?, preview?, fx?: false | {…}, drawn? })
  → { moved, from, to, path, stoppedBy: 'edge' | 'object' | Unit | 'nailed' | 'immune' | 'held' | 'trap' | <hazard> | null, blockedAt?, why?, text }
swapUnits(cb, rng, a, b, { by, source, willing?: Unit[], drawn? }) → { ok, stoppedBy, who?, why?, text }
forcedRule(how)          // data/rules.json forced_movement
enterTile(…)             // private: what a tile does to whoever enters it; moveUnit and displace share it
```

**The rule** (spec: "Forced movement", in the movement section; `data/rules.json` `forced_movement`):

1. Nailed, the knockback immunity (`immune(u, 'knockback')`) and an item that cancels the `forced_move` hook stop
   **every** kind of forced move. A move the unit chose itself (`willing`) is not forced: none of them is asked.
2. A unit lands where it could walk: `canStand`. A push or a pull stops in front of the first tile it can't enter.
3. A trap, a Sigil trap or field, Outburst residue and a hazard act on every tile of a push or a pull (a trap ends
   it) and on the landing tile of a throw, a teleport or a swap.
4. Nobody reacts: no held Watch, no Overwatch, no opportunity attack.
5. It ends Braced.

`forced_move` (`{ u, by, tiles, to?, how: source, kind, pull, cancel }`) fires once per forced move, before it (an
item may cancel it or change `tiles`: Heart Surge). A new `displaced` hook fires after it
(`{ u, by, from, to, path, how, kind, stoppedBy, blockedAt }`): Breaching Strike reads it. One `shove` effect event is
drawn per move, with its `path`.

**Replaced:** the technique `forceMove` (now a thin wrapper), Drag's swap, the `knockback` op (`pushAway`), the old
Shove, a weapon's knockback, `magicShove` (Sigil PUSH / PULL, Outburst push / pull, Longing, Lure), Sigil's push
preview (`shoveEnd`), Sigil STEP, an Outburst swap, Switcheroo, the Defender's Shove, Sleight ×2, Grenadier's Arm, the
shelved classes' `nudge`, Iron Grip, and three own-item moves (Angel of the Trenches, the strike-call dive, the twin
following).

### Every line of `moves.json` that moved (115 of 406)

T is the target, pushed from 6,5 (a pull: from 8,5 or 7,5). "was → now".

| Case | Movers | Was | Now | Why |
| --- | --- | --- | --- | --- |
| A **trap object** on the tile (14) | every mover | passes or lands, nothing happens | the trap springs (−19 HP), is gone, and ends a push or pull there | Rule 3 |
| A **Sigil trap** (12) | all but Drag's swap and STEP (they did already) | nothing | it springs and ends a push or pull there | Rule 3 |
| A **Sigil field** (12) | the same twelve | nothing | it bites (−48 HP here), and a push goes on | Rule 3 |
| A **fire hazard** (13) | all but Drag's swap | nothing | Burning and −10 HP; a push goes on through it | Rule 3 |
| A **minefield** (13) | all but Drag's swap | nothing | the mine goes off (−39 HP), is spent, and ends a push or pull there | Rule 3 |
| **Nailed** target (11) | the Defender's Shove, Grenadier's Arm, the old Shove, the knockback op, a weapon's knockback, Sigil PUSH and PULL, STEP, an Outburst swap, Switcheroo, Drag's swap | it moved, the weapon still in it | it does not move | Rule 1 |
| Immune by the **query** (9) | techniques' Shove (both), Drag's pull and swap, the old Shove, Grenadier's Arm, STEP, an Outburst swap, Switcheroo | it moved | it does not move | Rule 1: both doors |
| Cancels the **hook** (4) | the knockback op, STEP, an Outburst swap, Switcheroo | it moved | it does not move | Rule 1: both doors |
| A held **Overwatch** (4) | techniques' Shove (both), Drag's pull and swap | the watcher fired at the moved target | nobody fires | Rule 4 |
| **Braced** target (7) | the knockback op, a weapon's knockback, Sigil PUSH and PULL, STEP, an Outburst swap, Switcheroo | it stayed Braced on its new tile | it is no longer Braced | Rule 5 |
| A barrel, a container, a hole, a low wall, a Sigil wall, a terminal, a turret on the tile (14) | Sigil PUSH and PULL | the unit went through or onto it | it stops in front | Rule 2: one list |
| A **broken crate** (2) | Sigil PUSH and PULL | it stopped (the kind was matched by name, alive or not) | it goes through | Rule 2 |

Unchanged: the plain case, the edge, another unit in the way, an enemy within reach (no opportunity attack before or
after), and every case for a mover that already did the right thing.

### Other behaviour changes of F2, not in the table

1. **The Shove-into-a-held-shot play is gone.** Five tests pinned "a moved enemy sets off a held Watch" and "a Deny
   lane halts a push" (Shove, Drag, Throw Down, Bash's Heavy push); they now pin the opposite. See spec item 1477: if
   Leon wants it back, it is one flag in `data/rules.json` (`forced_movement.push.reactions`), and a test pins that
   the flag works.
2. **The old Shove against a wall on a unit that can't be pushed:** it used to fall Prone; it holds firm (the
   immunity is asked before the wall).
3. **Sigil STEP** onto an object trap or a hazard now sets it off (it ran only Sigil zones), and a Nailed or immune
   enemy that fails its save still does not move.
4. **Angel of the Trenches, the strike-call dive, the twin following** go through `displace` with `willing: true`:
   nothing can refuse them, and the tile they land on now acts on them.
5. **Effects:** a technique's push drew one `shove` event per tile; it is one event with a `path`. The `knockback` op
   drew none; it draws one now. Iron Grip no longer emits a forced `move_step`.
6. **A push's preview** (a Sigil's and a technique's) now shows a Nailed or immune target staying put.

## How to add things

Short rules. Each has a lint test that fails with a sentence telling you what to call.

1. **To roll a save,** call `saveAgainst(cb, rng, by, target, 'body' | 'brain' | 'heart', id, { via })` (`magic.ts`).
   `id` is the condition id, or a word if it is not a condition. Use the result: `sv.ok` (it resists), `sv.text`
   (put it in your log line), `sv.skipped`. For a save with its own number, pass `{ tn }`; for someone with no unit,
   `rollVs(null, rng, { mod: tierSave(tier), tn, lead: 'Heart save' })`. **Never call `d20` yourself.**
2. **To apply a condition with a save,** call `applyCond(cb, rng, by, target, id, rounds?, fam?, { via })`. It rolls
   the save through the same function. Do not roll first and then apply with `skipSave`.
3. **To roll anything else** (a check, a to-hit that is not a weapon attack): `rollVs(cb, rng, { by, mod, tn, why })`.
   Two rollers against each other: `contest(cb, rng, a, b)`. A TN is `TN.standard` (12), `TN.easy` (8)…, a save's is
   `saveTn(by, via)`: never a literal 12.
4. **To make an item change saves,** listen on the `save` hook (every save) or `cond_apply` (a condition's, and every
   save too): add to `ctx.saveAdd` or `ctx.tnAdd`, set `ctx.pass` / `ctx.fail` (the `save` hook), `ctx.cancel` +
   `ctx.why` for an immunity, `ctx.skipSave` for "no save".
5. **To move a unit against its will,** call `displace(cb, rng, unit, { away: pusher.pos, tiles: 2 }, { by: pusher,
   how: 'push', source: '<your item>' })` (or `{ toward: … }` with `how: 'pull'`, or `{ tile }` with `'throw'` /
   `'teleport'`). Read `moved`, `to`, `stoppedBy`, `text`. Two units trading tiles: `swapUnits`. A move the unit chose
   itself: `willing: true`. For a card's preview: `preview: true`. **Never write `unit.pos = …`.**
6. **To make a unit impossible to push,** give it `{"op":"immunity","to":"knockback"}` in data, or cancel the
   `forced_move` hook. Either one holds against every forced move.
7. **To ask "which tiles", "can it stand there", "who are its enemies",** use `kit.ts`: `tilesAround`, `tilesLine`,
   `canStand`, `foesOf(cb, u, { within, hidden: false, … })`, `alliesOf`. Do not write a filter over `cb.units` for
   "the enemies" in a lane file.
8. **To get the rng in a hook,** `rngOf(h, ctx)` (`kit.ts`). It throws if there is none: never write `|| { state: 1 }`.
9. **To add a number the engine asks items for,** add its id to `STATS` in `effects/stats.ts`, ask it with
   `statQuery(x, '<id>')`, answer it in the item's `stat:`. **To let items change an action's AP,** add the action to
   `COST_SITE_IDS` and price it with `actionAp({ u }, '<action>', base).ap`; data can then say
   `{"op":"action_cost","action":"<action>","value":-1,"min":1}` with no code.
10. **When wording changes,** re-record the words: `GOLDEN_RECORD=log npm test -w @phc/engine -- golden-rules`. A
    state line that moves is a behaviour change: say so, and record with `GOLDEN_RECORD=1` only on purpose.

## What is left

1. Wave 2 builds on this: F3 (costs) should price through `actionAp` everywhere; F4 (conditions) can now make the
   five flag conditions rows, since their saves already go through `rollSave`.
2. The `roll` event is emitted and not drawn: the transparent-dice read-out for saves is a client job
   (`apps/web/src/game/fx/play.ts` gives it no beat, `camera.ts` no camera).
3. Five roll sites have no test (listed under "Honest limits").
4. Cones and blasts (review F6, items 3 and 4) are still per file.
5. `forced_movement.<kind>.reactions` is read by `displace` (false everywhere today; true brings back "a held shot
   answers a pushed unit" for every mover alike). When it is on, the pusher's own held shot is not held back, and
   `swapUnits` does not read it.
6. Rulings taken without asking, for Leon: spec items 1470, 1471, 1476, 1477, 1479.
