# Engine foundations 2: paying a cost, and counting a limit (12 Nov 2026)

Wave 2 of [the foundation plan](../proposals/2026-11-engine-review/PLAN.md), from
[engine review 1](../proposals/2026-11-engine-review/1-duplication.md): its findings **F3 (paying a cost)** and
**F8 (limits and counters)**, and what [client boundary 1](client-boundary-1.md) left ("the engine's action functions
still hold their own base-cost literals"). Each finding is now **one primitive**, a **lint test** that fails when
someone goes round it, and a **pin** recorded before the code moved.

If you only read one part, read [How to add things](#how-to-add-things). A reviewer then attacked the work; what it
found and what was done about it is [the last section](#problems-found-in-review-and-what-was-done), and the
sections before it were corrected where they said something that was not true.

## What was built

| Finding | The primitive | Sites it replaced | Behaviour changed? |
| --- | --- | --- | --- |
| **F3** paying a cost | `effects/cost.ts`: `price`, `whyNot` / `canPay`, `pay`, `refund`, `spend`, `grantAp`, `loseAp`, `setAp`, `freely`, `withAp`, the credit (`lend` / `settleCredit`), the one `cost` hook | 60 `u.ap <` checks and about 30 more written the other way round (`u.ap >= n`, `n > u.ap`); 193 direct writes to `.ap`; 41 `actionAp` calls; the AP refusal sentence written out 60 times; the loan (three copies) | No number moved. Six edge cases (below) |
| **F3** costs in data | `data/actions.json` `costs` (15 verbs with no row) and `resources` (10); `ap: 'data'` on an item's action | the literal base costs of the built-in verbs; 95 lane actions that typed their item's own `ap_cost` again | No |
| **F8** limits and counters | `effects/uses.ts`: `uses(h)` with pure reads, `first`, `on(target)`, the `cooldown` scope (`cool` / `coolLeft` / `ready`), the `SCOPES` table | The AP perks' cooldown store (`perks/cooldown.ts`), the prayer limits (five fields in two places), the speaker's Call counters, QUICKEN's round, two "took an order this round" marks, Under the Eye's note | Where they are kept (the marks tables). Not what they allow |
| Wall-clock tests | `kit.ts` `work` / `counted` | 3 millisecond assertions | No |

Branch: the worktree's (see the report). Commits: the pin first, on unmodified code; then the work.

## The pin: the costs tables

`packages/engine/test/golden/costs.ts`, compared by the five `test/golden-costs*.test.ts` files (in `npm run check`).
**6,230 lines in 14 tables**, recorded on unmodified code (commit `e390920`).

1. **What a line holds:** AP, banked AP, the magazine, spare magazines and loose rounds, Heat, charge, cores, Flux, MP,
   Strain, the held Outburst's stage, Momentum, Guard, Supplies, toxins, throwables, spare parts, stims, Echo and the
   mana in the air, **before and after**, for every unit the action touched: `P1 ap9>7 mg.mp200>180`.
2. **For an action through the reducer, four more readings:** `short` (the same action with 0 AP: the refusal sentence,
   or `free`), `again` (a second time in the same turn, AP refilled: a use limit shows here), `next` (on the unit's next
   turn: a once-a-turn limit is back), `later` (three rounds on: a cooldown is back).
3. **The sections.** `pad`: every basic action, every Call, every Sigil and Outburst action and every technique through
   the reducer at a turn's 9 AP, for sixteen sheets (a soldier with each kind of weapon, two guns, a shield, a Sigil
   caster, a heart), plus what a turn start, a Stunned turn start, a kill and a turn end give. `askers-perks`,
   `askers-traits`, `askers-classes`: the same pad for every holder of an item that listens on a cost hook or grants AP
   (only the lines that differ from the same sheet without the item). And the damage tables' own actions read a third
   way: `techniques`, `sigil`, `outburst`, `faith`, `items-perks`, `items-traits-classes`, `items-shelved`, `special`,
   `flat`, `weapons`.
4. **Two files a section.** `costs-<section>.json` is the **state**: it must never move without a ruling.
   `costs-<section>.marks.json` is **where a counter is kept** (use cells, per-item state, technique state, "this turn"
   flags): it is re-recorded when a counter moves to `uses()` (`GOLDEN_RECORD=marks`), and a reviewer reads the diff.
   What a limit *allows* is in the state line (`again` / `next` / `later`).

**Result: across F3 and F8 no state line moved** (0 of 6,230). The marks moved in four files: the AP perks' cooldown
(`ps.<item>.cd.gain` became `uses.<item>#ap-gain|cooldown`, 4 lines), a Whisper and a Hymn (`faith.whisperTurn`,
`prayedRound`, `faith.ownHymn` became `uses.faith#whisper|per_turn`, `uses.faith#hymn|cooldown`,
`uses.faith#own:<id>|cooldown`, 216 lines), QUICKEN (`quickRound` became `uses.sigil:quicken|per_round`, 11 lines),
and a speaker's Calls (`call.turn`, `call.react` became `uses.calls#turn|per_turn`, `uses.calls#react|reaction`).
The damage tables (5,327 actions) and the rules tables are identical too.

**Honest limits.** (1) These fourteen tables never let an enemy act (the harness skips every enemy action, as the
damage tables do). (2) Encore and a Brief are not in them. (3) `later` is a fixed three rounds, so a cooldown one round
shorter moves no line. The review showed what that cost (two regressions under a credit moved nothing), and added
**three tables that close the three gaps** (`test/golden-costs-review.test.ts`, **3,023 lines**, recorded on the main
line's engine, before this work, and then played on this one):

| Table | Lines | What a line holds |
| --- | --- | --- |
| `costs-credit` | 2,155 | every action of the pad (seven sheets) and every item action of a level-12 Fighter, Mage and Guardian, made with no credit, a Brief of 1, a Brief of 2, an Encore of 2 for that very action, and both, each with 0, 1, 2, 3 and 6 AP of the unit's own: what it took, what is left of the Brief and the Encore, the AP counted as gained and the turn's total, and what the log said of the credit |
| `costs-foes` | 594 | an enemy's whole turn (the AI acting) with each of the 33 guns, as a Soldier and an Elite, empty, with one round and full, at 2, 3 and 6 AP: what it spent, where it ended, how often it reloaded, what the squad lost |
| `costs-cooldowns` | 274 | for each patron at Devotion 3, 5, 7 and 10, after each Hymn: the first round the same Hymn and each other one is accepted again; and for every perk and trait that listens for a kill or a turn, the AP of a kill on each of the five rounds after a kill |

(4) The area map's actions are still in no table.

## F3: paying a cost (`packages/engine/src/effects/cost.ts`)

```ts
interface Cost { ap?: number; res?: Record<string, number> }
interface Priced { action: string; ap: number; res: Record<string, number>; labels: string[]; free: boolean }

price(x: { cb?, u?, c? }, action: string, base?: number | Cost | null, ctx?: Record<string, unknown>): Priced
priced(x, action, ap, res?, ctx?): Priced               // a number its own pipeline worked out, through the same hook
bill(action, ap, res?): Priced                          // a final cost (no hook asked again), for pay()
costOf(action, field = 'ap'): number                    // the data's number (throws on an action the data lacks)
whyNot(cb, u, p: Priced | number, o?: { as?, c? }): string | null     // THE refusal sentence, or null
canPay(cb, u, p, o?): boolean
pay(cb, u, p, o?: { c? }): number                       // returns the AP taken from the unit itself
refund(cb, u, p, o?): void
spend(u, resourceId, n, c?): boolean                    // a resource taken outside an action's declared cost (a hook)
needs(n, what = 'AP', left?): string;  poolWhyNot(have, n, { left? }): string | null   // the area map's round pool
grantAp(cb, u, n, { max? }): number;  loseAp(u, n): number;  setAp(u, n): void
freely(u, fn, { bank? }): T;  withAp(u, n, fn): T
apFor(cb, u, as?): number;  creditFor(u, a, cb?): number;  lend(cb, u, a): Credit | null;  settleCredit(cb, loan);  unlend(cb)
RESOURCES;  resLeft(u, id, c?)
```

- **`price`** is the cost after everything: the base (`data/actions.json` when none is given), then the items (the
  generic `action_cost` op and the `ap_cost:<site>` stat, for a cost site), then the **one `cost` hook**
  (`{ u, c, cb, action, base, ap, res, min, free, labels, …ctx }`: a handler changes `ap` or `res`, raises `min`, sets
  `free`), then the floor, rounded to tenths. The hook costs nothing while nobody listens (`hooks.ts` `hookUsed`).
  A pipeline that works out its own AP (an attack, a move, a glyph, an Outburst, a technique, a Call) ends in
  `priced(x, '<action>', ap)`: the same hook. `bill(action, ap, res)` is a cost that is already final, for `pay()`.
  **Pass the fight.** `price({ cb, u }, …)` asks every unit's items and every engine listener (`onHook('cost', …)`).
  With `cb` null or left out (a card outside a fight) only the unit's own items answer. Every price the engine asks in
  a fight passes it now (a lint rule holds that); a helper that prices takes the fight as its last argument
  (`reloadAp(u, cb)`, `analyzeCost(u, cb)`, `stimAp(u, t, medic, cb)`, `ventAp(u, cb)`, `coreAp(u, cb)`,
  `reloadBothAp(u, cb)`, `weaponActions(u, cb)`).
  **One name.** `ctx.action` is the verb's **cost site** (`COST_SITE_IDS`), never the id of the row that shows it:
  `price()` turns `pullfree` into `pull_free`, `reload2` into `reload_both`, `cover` into `break` (`actionName`), with
  the same floor either way. `ctx.row` is the name that was asked. A stim is `stim`, or `stabilise` when the target is
  Downed: two sites with two prices, the same from the row and from the action.
- **`whyNot`** is the one sentence: `Needs 2 AP.`, `Needs 3 charge.`, `Needs 1 Guard.` (the word is the resource's
  `name` in the data). What an action declares (`res`) is asked before its AP, as the items' own checks were.
- **`pay`** is the only thing that subtracts AP. It draws on the action's **credit** first, rounds to tenths, then
  takes each resource from where the data says it lives. **`refund`** gives AP back where `pay` took it: to the credit
  while that action still runs (so a refunded action has not used its Brief up), to the unit afterwards.
- **A credit pays first, so the unit's AP is not the whole story.** Two helpers replace the two things code used to do
  with `u.ap`: **`apFor(cb, u)`** is the AP the unit can put toward the action now (its own and the credit; what Load
  divides by its price per five rounds), and **`apMeter(cb, u)`** measures what an action took in all
  (`const taken = apMeter(cb, u); …; taken()`), where `ap0 - u.ap` leaves out what the credit paid.
- **The 193 writes to `.ap`, classified:**

  | What the write was | Now | Call sites |
  | --- | --- | --- |
  | A payment | `pay(cb, u, n)` | 70 |
  | A refund (a refused inner action, a ruling, a rebate) | `refund(cb, u, n)` | 13 |
  | AP given that is not perk AP (Quicken, Spark, Feed the Fire, the area map's Grim Reaper) | `grantAp` (never past 9 unless `max`) | 9 |
  | A penalty (War Footing, Soft Hands, a fooled enemy) | `loseAp` (never under 0) | 3 |
  | A set: the turn's refill, a lost turn (0), a surrender, a window's pool and its return, a unit just built, the rounding to tenths | `setAp` | 26 |
  | "Do this inside another action at no AP" (`u.ap = 99` … put back; eight private `freeAp` helpers) | `freely(u, fn)` | 21 |
  | A dry run at another AP (an enemy's intent, a planner's hypothetical Line) | `withAp(u, n, fn)` | 5 |
  | Perk AP (`grantPerkAp`, `bankAp`, `turnAp`: the +3 cap and the turn's 9) | unchanged, `effects/ap.ts` | |

  What still writes `.ap` is not a unit: a hook's context (`ctx.ap`), a preview (`t.pv.ap`, `out.ap`), a cost being
  built (`c.ap`), the area map's round pool (`g.story.ap`), a fight ruling's record (`fr.ap`).
- **The loan is gone.** Encore's repeat and a Brief's cut were AP *lent* into `u.ap` before a reducer action and taken
  back after it (`encoreBefore` / `encoreAfter`, `briefBefore` / `briefAfter`, and a third copy inlined in the item
  runtime so that a greyed card agreed). They are a **credit** now: `lend(cb, u, action)` opens `cb.credit`, `pay()`
  draws on it first (a Brief's part, then Encore's), `whyNot` counts it, `settleCredit` closes it and says what was
  used. The unit's AP is never inflated. Outside an action, a preview passes `{ as: <the reducer action> }` and gets the
  same answer the action will (`creditFor`).
- **Every priced verb is a cost site.** Door, Prone, Brace, Load, Pick up, Scuff, Syphon, Steady, Feed, the song,
  Search, Pull free, Overwatch and an attempt priced a literal, so no item could ever change them (review F3,
  disagreement 1). They go through `price()` and are in `COST_SITE_IDS`: a data effect
  `{"op":"action_cost","action":"prone","value":-1,"min":1}` works with no code.
- **An item's action declares what it costs.** `ActionDef` has `res` beside `ap`
  (`res: { charge: 2 }`, or a function of the arguments). The runtime refuses (`Needs 2 charge.`) and pays; `run()`
  subtracts nothing. Nine class moves were moved (Raise Cover, Ward, Seal, Quicken ×2, Rewrite: charge; Stim Throw:
  Supplies; Toxin: toxins; Draw Fire: Guard). `ap: 'data'` means "this item's own `ap_cost` in `data/*.json`" (or the
  `ap` of its `grant_action`): 95 lane actions say it instead of repeating the number.
- **Base costs are data.** `data/actions.json`: its 17 rows (`ap`, `ap_downed`, `ap_lowered`, `ap_quick`…), and
  `costs` for the verbs with no row: `brace`, `load`, `clear_jam`, `field_repair`, `reload`, `parley`, `throw`,
  `attempt`, `interact`, `evoke`, `scuff`, `vent`, `swap_core`, `syphon`, `crystallise`. `magic.ts` `SPELL_AP`,
  `music.ts` `SONG_AP` and `fighttalk.ts` `ATTEMPT_AP` read them. `resources` lists what an action can cost besides AP
  (`mp`, `charge`, `cores`, `momentum`, `guard`, `supplies`, `toxins`, `parts`, `stims`, `echo`): where it lives and
  the word a refusal uses. The validator checks `costs` (whole numbers, agreement with `rules.json` where `rule` names
  an action, no verb priced twice) and `resources`.

### Behaviour changes of F3 (none is in a golden line; each has a test in `test/costs-foundations.test.ts` or is read)

| # | What | Was | Now | Why |
| --- | --- | --- | --- | --- |
| 1 | AP gained **inside** an action Encore repeats (a kill's perk AP) | Taken back by the settle (`u.ap = before − spent + …`) | Kept | The credit pays; nothing is recomputed from the AP afterwards. Spec item 1522 |
| 2 | A Brief on an action that also gave its unit at least as much AP as it cost | The Brief was not used up (the "net" spend was 0) | It is used: it paid | The same |
| 3 | A perk or class action's card while the unit is **Briefed** and 1 AP short | `Needs N AP.` on the card; the action itself went through | The card agrees with the action | The third copy of the loan (the item runtime's) knew Encore and not the Brief |
| 4 | Load with AP in tenths (3.4 AP left after glyphs) | Loaded 17 rounds for 4 AP: AP went to −0.6 | Loads for the whole AP it has (15 rounds, 3 AP) | A bug found by reading (`rounds = ap × 5` on a fraction) |
| 5 | An enemy's reload | Asked `u.ap >= 2` | Asks the weapon's own price: a 1 AP reload (a quick-release magazine) is made with 1 AP left | The first wording here ("an enemy with a breacher tube and 2 AP tried to reload six times") was wrong: no shipped enemy gets there (see the review, problem 6). `costs-foes` shows no enemy turn moved |
| 7 | AP given back **inside** the action that paid it (the Quartermaster's free reload; a class move that refunds and lets an inner action pay) | (first version of this work) went to the unit, and the Brief stayed used | Goes back to the credit first | As before the credit: the old settle saw the action as free. Review, problem 2 |
| 8 | The turn's AP total (`apTurnTotal`, what keeps a turn at 9) after an action paid by **both** a Brief and an Encore | Included Encore's lent AP (only in this combination: the loan sat in `u.ap` when the Brief was counted) | The unit's AP plus what the Brief paid | 280 lines of `costs-credit` re-recorded on purpose; a Brief alone and an Encore alone are as they were |
| 9 | A story action that declares `res` | Ran and took nothing | Refused (`Needs 1 Echo.`) and paid from the character; a resource only a unit holds is refused (`Only in a fight (it costs 2 charge).`) | Review, problem 5. No shipped story action declares one |
| 6 | An item action that is short of **both** a declared resource and something else | `Needs 2 charge.` came before `Used this turn.` (it was in `available`) | `Used this turn.` first, then the resource, then the AP | The runtime asks in one order for every action |

Not changed on purpose: the refusal sentences with more words (`Needs 20 MP (5): Syphon first.`, `Needs 3 charge (1 in
the core).`, `No Supplies left. They are restocked when you rest.`) stay with their actions; an action keeps them in
`available` and declares the payment in `res`.

## F8: limits and counters (`packages/engine/src/effects/uses.ts`)

```ts
uses(h: { key, u?, c?, cb?, g? }): Uses
  .used(scope, key?)  .left(scope, n = 1, key?)                  // READS: they never write
  .take(scope, n = 1, key?, k = 1): boolean  .refund(scope, key?)
  .first(what, scope = 'per_combat'): boolean  .had(what, scope?)  // "the first kill of the fight"
  .on(target): Uses                                              // the same counters per target
  .cool(turns, key?, atRound?): boolean  .coolLeft(turns, key?, atRound?)  .ready(turns, key?, atRound?)  .cooledAt(key?)  .uncool(key?)
SCOPES: Record<UseScope, { fresh, fight, map, label }>            // THE RESET POINTS, one row a scope
roundNow({ cb?, g? }): number
```

- **Reads are pure.** `left` and `used` used to create the unit's empty `uses` bag (`u.uses ||= {}`), which is what
  client boundary 1's deep-equal tests found. A read makes nothing now; only `take`, `refund` and `cool` write. Pinned
  by a test that reads every scope on a unit, a character and the story and compares them byte for byte.
- **The `cooldown` scope.** "At most once every N rounds": the cell holds the round it was stamped with; `coolLeft`
  is `stamped + N − now`. `atRound` is for something that *lands* later (AP banked for the next turn).
  `perks/cooldown.ts` (the AP perks' "once every three turns") is three thin lines over it.
- **`SCOPES` is the table of reset points**: for each scope, when it is fresh again and where its cells live (in a
  fight the unit; on the area map `g.story.ps[charId].uses`; a scene's, session's, rest's and campaign's on the
  character). `stampOf` and the storage follow it. There is no reset code: a cell carries a stamp, and a stale stamp
  reads as 0.
- **Moved onto it:** the AP perks' cooldown (`stateOf(h).cd`); the prayer limits in a fight (`u.faith.whisperTurn`,
  `u.prayedRound`, `u.faith.ownHymn`) and in the story (`c.state.faith.whisperRound`, `hymnRound`, `own`): one set of
  three cells (`faith#whisper`, `faith#hymn`, `faith#own:<id>`) for both; a speaker's Calls this turn and its one Call
  as a reaction a round (`u.call.turn`, `u.call.react`); QUICKEN's `quickRound`; "this ally already
  took an order this round" (On My Mark, Born Officer); Under the Eye's one note a round.
  `clearPrayerLimits(u, g?, c?)` (`faith.ts`) is the Proving Ground's "reset the limits".

### Behaviour changes of F8

1. **A fight saved mid-way by an earlier build forgets the limits that moved, once,** when this build loads it: the
   old fields are not read and no migration was written. That is (corrected in review; the first version said "a Hymn
   or a Whisper, nothing else"): a Hymn's cooldown and Hold the Gate's own (`prayedRound`, `faith.ownHymn`,
   `c.state.faith.hymnRound`), a Whisper this turn (`faith.whisperTurn`), the AP perks' 3-turn cooldown
   (`ps.<item>.cd`), a speaker's Calls this turn (so the free first Call at 10 points comes again) and its one Call as
   a reaction this round (`u.call.turn`, `u.call.react`), QUICKEN's once a round (`quickRound`), and "this ally already
   took an order this round" (`ps.<item>.round`: On My Mark, Born Officer). Each is right again from the next round or
   the next use. Spec item 1527.
2. **The story's prayer limits** live in `g.story.ps[charId].uses` (with every other area-map counter), not on the
   character.

## The wall-clock tests

`kit.ts` has `work(name)` (a counter raised at the top of `planEvoke`, `previewOutburstPlan` and `paths`) and
`counted(fn)`. Three tests asserted milliseconds and timed out on a loaded machine; they assert work now, with a
quarter of slack over what was measured: three Sigil casters' turn (2,811 `planEvoke` calls, bound 3,500), ten rounds
of three hearts (2,933 Outburst plans, bound 3,700), twelve enemy turns on the yard (61 path searches, bound 80).

## The lint (`packages/engine/test/lint-costs.test.ts`)

It reads the source and fails, with a sentence saying what to call, on:

1. an AP check written by hand (`u.ap < n`, `u.ap >= n`, `n > u.ap`); `u.ap < AP_MAX` ("is there room for a grant") is
   the one form allowed. **And, since the review, every READ of a unit's `.ap`** outside `effects/cost.ts` and
   `effects/ap.ts` is counted per file (a ratchet, 61 left: the AI's "is it nearly out", a turn's loop, a preview's
   measure, log lines), so `u.ap <= 1`, `!(u.ap > 2)` and `const left = u.ap - 2` fail as new reads whatever the
   operator;
2. a write to a unit's `.ap` outside `effects/cost.ts` and `effects/ap.ts`, however it is spelled (`=`, `+=`, `-=`,
   `*=`, `u.ap--`, `--u.ap`, `Object.assign(u, { ap: … })`);
   - a price asked without the fight (`price({ u }, …)`), and `whyNot(null, …)` / `canPay(null, …)` (one left, a
     planner's sum in `ai-sigil.ts`);
   - a cost measured as `ap0 - u.ap` instead of `apMeter` (5 left, counted: the area map, a dry run on a copy, Encore's
     own mark);
3. `'Needs ' + n + ' AP.'` built outside `cost.ts`;
4. `actionAp(` outside `price()`;
5. the loan coming back (`encoreBefore`…, `u.ap = 99`);
6. a `price(x, '<action>')` whose action has no AP in `data/actions.json`; a `costs` entry that is not a whole number,
   repeats a row or names an undeclared site;
7. a **new** resource paid by hand: **every** resource of `data/actions.json` (MP, charge, cores, Momentum, Guard,
   Supplies, toxins, parts, stims, Echo), spelled `x.mp -= n`, `x.cores--`, `x.mp = x.mp - n`,
   `x.charge = Math.max(0, x.charge - n)` or `x.parts = (x.parts || 0) - 1`. The 36 left are counted per file (a
   ratchet: the numbers only go down; it was 28 when only `-=` on three of them was seen);
8. an action that says `ap: 'data'` with no number in its data; and the count of lane actions that still type a number
   the data also holds (28, written by helpers);
9. the moved stores coming back (`prayedRound`, `whisperTurn`, `hymnRound`, `ownHymn`, `quickRound`, `stateOf(h).cd`);
10. a `uses` bag created outside `uses.ts`;
11. a **new** round number kept by hand and compared with `cb.round` (54 left, counted per file: a ratchet);
12. a **new** cooldown or per-turn stamp kept by hand in the spellings the first ratchet did not see: a subtraction
    (`cb.round - st.last < 3`, the exact shape of the old `prayedRound` check), an addition (`st.last + 3 > cb.round`),
    a stamp of the turn (`=== cb.round + ':' + cb.turn`, `=== turnKey(cb)`). 5 left, counted per file.

The review injected thirteen ways round the primitives into `tactics.ts`; the first lint caught one. All thirteen fail
now (the list is in the last section).

`test/lint-foundations.test.ts` (F14) reads `price()` call sites now, where it read `actionAp()`.

## How to add things

Short rules. Each has a lint or a test that fails with a sentence telling you what to call.

1. **To make an action cost AP,** price it and pay it. Never compare or subtract AP yourself.
   ```ts
   const p = price({ cb, u }, 'my_verb');            // base from data/actions.json `costs.my_verb.ap`
   { const no = whyNot(cb, u, p); if (no) return no; }
   pay(cb, u, p);
   ```
   Add `"my_verb": { "ap": 2 }` to `data/actions.json` `costs` and `'my_verb'` to `COST_SITE_IDS`
   (`effects/stats.ts`). **Never type the number in TypeScript.**
2. **To make an action cost a resource too** (charge, MP, Supplies…), put it in the price:
   `price({ cb, u }, 'my_verb', { ap: 2, res: { charge: 3 } })`. For an **item's action**, declare it:
   `{ id: 'burn', ap: 'data', res: { charge: 3 }, run: … }`. The runtime says `Needs 3 charge.` and takes it.
   **Never write `u.mg.charge -= 3` in `run()`.** In a **story** action there is no unit: only what the character
   holds can be declared (`res: { echo: 1 }`, `res: { stims: 1 }`); it is refused and taken the same way. A story
   action that declares a unit's resource is refused with `Only in a fight (it costs 2 charge).`
3. **A new resource** (a relic's charges): one row in `data/actions.json` `resources`
   (`"relic": { "name": "relic charges", "on": "unit", "path": "res.relic" }`). Then `res: { relic: 1 }` works
   everywhere, with its refusal sentence.
4. **To let an item make something cheaper,** in data: `{"op":"action_cost","action":"<site>","value":-1,"min":1}`.
   In code: the item's `stat:` answers `'ap_cost:<site>'`, or it listens on the `cost` hook
   (`cost: (ctx, h) => { if (ctx.u === h.u && ctx.action === 'prone') ctx.ap -= 1; }`). The `cost` hook sees **every**
   priced action; set `ctx.min` for "never below 1", `ctx.free = true` for free. **`ctx.action` is the cost site**
   (the names in `COST_SITE_IDS`: `pull_free`, `reload_both`, `break`), never a row's id (`pullfree`, `reload2`,
   `cover`); an item's action is `<item key>#<action id>`. To change **another unit's** price (an aura), test
   `ctx.u` against `h.u` yourself: the hook is fired for every unit's items whenever the price was asked with the
   fight, which every price in a fight is.
   - **When you write a function that prices,** give it the fight and pass it on: `price({ cb, u }, 'my_verb')`. A
     price with no `cb` asks the unit's own items only; the lint refuses `price({ u }, …)`.
   - **Never read `u.ap` to decide or to measure.** "Can it pay n": `canPay(cb, u, n)`. "How much can it put toward
     this" (an action that takes as much as you can pay, like Load): `apFor(cb, u)`. "What did that take":
     `const taken = apMeter(cb, u); …; taken()`. A Brief or an Encore pays before the unit does, so `u.ap` alone is
     wrong in all three (that is how Load and Reload both broke in the first version of this work).
5. **"Your next action costs N less" is a credit, not AP.** Do not add AP before an action and take it back. Look at
   `lend` in `cost.ts`: a new kind of credit is one more term there.
6. **To do an action inside another at no AP,** `freely(u, () => reload(cb, u))`. **Never write `u.ap = 99`.**
7. **To give AP:** perk AP is `grantPerkAp(cb, u, n, 'why')` (the +3 cap) or `bankAp` (next turn). AP that is not perk
   AP (a spell's Quicken): `grantAp(cb, u, n)`. To take AP as a penalty: `loseAp(u, n)`.
8. **To give AP back** (the action was refused after it was paid): `refund(cb, u, n)`. Inside the action that paid, it
   goes back to the credit first; you do not need to know whether there was one.
9. **A limit ("once a turn", "twice a fight"):** `if (!uses(h).take('per_turn')) return 'Used this turn.';`. To read
   it for a card: `uses(h).left('per_turn')`. A second counter on the same item: pass a key, `h.key + '#burst'`.
   **Never keep a round number in `stateOf(h)` and compare it with `cb.round`.**
10. **"The first X of the fight":** `if (uses(h).first('kill')) { … }`.
11. **A limit per target ("each enemy once a round"):** `uses(h).on(target).take('per_round')`. A mark that belongs to
    the target whoever acts ("this ally already took an order this round"): `uses({ key: h.key, u: target, cb })`.
12. **A cooldown ("once every three rounds"):** `if (!uses(h).cool(3)) return;`. For a card: `uses(h).coolLeft(3)`.
13. **A new scope** (a limit that resets at a new kind of moment) is one row in `SCOPES` and one line in `stampOf`.
    Nothing ever resets a counter by hand.
14. **A test about speed counts work:** `const { work } = counted(() => …); expect(work.planEvoke).toBeLessThan(n)`.
    Never assert milliseconds.
15. **When you touch how anything is paid,** run `npm test -w @phc/engine -- golden-costs` (all eight files). The
    `costs-credit` table is the one that catches a mistake under a Brief or an Encore, `costs-foes` an enemy that
    stops affording something, `costs-cooldowns` a cooldown that changed length.
16. **When a counter moves to `uses()`,** the marks tables move: `GOLDEN_RECORD=marks npm test -w @phc/engine --
    golden-costs`, and read the diff. A **state** line that moves is a behaviour change: say so, and record with
    `GOLDEN_RECORD=1` only on purpose.

## What is left

1. **The specialised pipelines keep their own hooks, and end in the one.** An attack (`attack_preview`), a move
   (`move_cost`), a glyph and an Evoke (`glyph_cost`, `evoke_cost`), an Outburst's Begin, Pump and Release
   (`outburst_cost`, `outburst_pump`, `release_cost`), a technique (`apFor`) and a Call (`call_cost`) work out their AP
   as before, then pass the number through `priced(x, '<action>', ap)`, so the `cost` hook sees them as `attack`,
   `move`, `draw`, `evoke`, `begin`, `pump`, `release`, `technique:<id>` and `call`. Not yet: a gear change (the `swap`
   hook; `gear.ts` and `game.ts` price it twice already), a thrown item after its `throw` hook, and the planned Pumps of
   an Outburst preview (`pumpsAp`). Moving the 60-odd handlers of the old hook names onto `cost` is the rest of review
   F3's "ten channels become one"; the old names are the adapters until then.
2. **36 resource payments are still made by hand** (the lint's ratchet lists them by file; 28 by the first count, which saw only `-=` on MP, charge and cores): prices worked out inside the
   action (a script's Evoke charge, `soulPrice`), spare parts and stims in the built-in verbs, Echo's reroll in the
   story. Each wants `res` or `spend()`.
3. **Techniques** pay AP through `pay()` and Momentum and Guard through `spend()` (by way of `resSpend`), but rounds,
   Heat and the Momentum refund on a refused handler are still the technique runtime's own (`physical/core.ts`).
4. **The area map's round pool** (`g.story.ap`) has one door of its own (`game.ts` `apLeft` / `spendAp`, the sentence
   from `poolWhyNot`). It is not a unit's AP and was left.
5. **Lane action AP literals:** three item actions price a typed 2 through `price()` (Triage, Ward, Set explosive: their
   AP is a function); 28 that equal their data are written by a helper (a map over toxins, on / off pairs);
   about 115 have no number in the data to read (story variants at 0 AP, second actions of an item). Review F5 (`num(h,
   key)`, numbers in data) is where they go.
6. **F8 is half done.** `uses()` now does everything the seven stores did, but only stores 5 and 6, the Call counters and five state
   fields were moved. Still by hand: 54 `=== cb.round` compares (the ratchet), among them the reactions
   (`tactics.ts` `useReaction`, one door), a Call's helped / hindered mark on its target, `fighttalk.ts` `attempted`, zone
   "hit this round" maps; technique state (`u.tech[id]` with `turnStamp`, 41 uses); the unit flags (`shotsThisTurn`,
   `firstShotTurn`, `sprinted`, `openerUsed`, `moved`, `stopped`); `c.miracleSession`; the story's `noticed`. Review 1
   says F8 "rides on F5's `limit`": the data's `limit` should be the only way an item states one.
7. **The client asks four prices without the fight** (`apps/web/src/game/commands.ts` `weaponActions(u)`, `ventAp(u)`,
   `coreAp(u)`; `resources.ts` `reloadAp(u)`): those rows hear the unit's own items only. Nothing shipped changes
   another unit's price, so nothing shows; each call wants its fight passed (`weaponActions(u, cb)`). `apps/` was left
   untouched by this work.
8. **An enemy with a gun loaded round by round never reloads** (the scattergun, the bow, the breacher tube): it has
   loose rounds and no spare magazine, the AI's "dry" test looks at magazines only, and it closes to melee. Found by
   `costs-foes`, older than this work, left for the balance pass (it changes how those enemies fight).
9. **For Leon** (rulings taken without asking): spec items 1522 (with its review edges c and d), 1523's story rule and
   1527.

## Problems found in review and what was done

A reviewer attacked the branch (12 Nov 2026) and reported nine problems. Each was reproduced with a failing test before
it was fixed. The pin for the fixes was made first, as the plan asks: the three tables above were written against the
test harness only, **recorded on the main line's engine** (the one before this work), committed, and only then played
on this branch. 303 of the 2,155 credit lines differed. After the fixes, 284 differ, all for the two reasons of rows 8
below and nothing else; `costs-foes` and `costs-cooldowns` never differed.

| # | The problem | Verdict | What was done | Held by |
| --- | --- | --- | --- | --- |
| 1 | A Briefed or Encore'd **Reload both** drove AP below 0 and gave no discount (AP 2 became −1) | Right, a regression | `reloadHands` ran its inner main-gun reload under `withAp(u, 99, …)`, which is not `freely`: the inner `pay()` drew the action's credit, and the real payment found it empty. It is `freely(…)` now. Resupply's off-hand reload (new on the main line) uses `freely` too | `costs-credit` (`credit/two-guns/reload-both/*`: 12 parts moved, all back); `costs-foundations` "problem 1" (two tests) and "freely(): the inner action draws on no credit" |
| 2 | A Briefed or Encore'd **Load** loaded fewer rounds, and 0 rounds at 0 AP; the same blind spot in three other places | Right, a regression; the other three read correctly too | Load divides `apFor(cb, u)` (the unit's AP and the credit). The route a move takes round a hazard is chosen with the credit (`canAffordTiles(…, cb)`). Rounding Up rounds what is left of `apFor`. A perk ruling's refundable AP and the Quartermaster's "AP back" are measured with `apMeter` (the credit's part too), and `refund` gives AP back to the credit while the action runs, so a reload the Quartermaster makes free leaves the Brief unused, as before | `costs-credit` (`credit/*/load/*`: 17 parts moved, all back); `costs-foundations` "problem 2" (two tests); lint: the AP-read ratchet and the `ap0 - u.ap` ratchet |
| 3 | "The one `cost` hook every priced action passes" was not true: Reload, Analyze, a stim, Vent, a core change, a throw and every weapon row were priced without the fight, so another unit's item and every `onHook('cost')` listener were skipped | Right | Every one takes the fight and passes it (`reloadAp(u, cb)` and the six others; `weaponActions(u, cb)`); the reducer's own calls all pass it. With no fight (a card outside one) the unit's own items are still all that is asked: that is stated at the top of `cost.ts` and in rule 4. **Left:** the client's four calls (What is left, 7) | `costs-foundations` "problem 3" (an ally's item makes Prone and Reload free through `apply()`; the helper prices and the weapon rows); lint "a price is asked WITH the fight" |
| 4 | The same verb reached the hook under two names: the Pull free row showed 2 AP, the action took 3 | Right for `pullfree` / `pull_free`, `reload2` / `reload_both`, `cover` / `break`. **Not for the stim:** `stim` and `stabilise` are two sites with two prices, and the row and the action both ask the one that fits the target | `price()` turns a row's id into its site (`actionName`) before anything is asked, and finds the floor (`min`) and the base under either name. `ctx.action` is the site, `ctx.row` what was asked. `reloadBothAp` asks `reload_both` | `costs-foundations` "problem 4" (every row whose id is not its site, by both names; Pull free and Reload both through `apply()` against their rows) |
| 5 | A declared `res` was neither checked nor paid in story scope | Right | `resWhyNot` / `resPay` (`cost.ts`) ask and take resources with or without a unit; the item runtime calls them where no unit pays. A character's resource (Echo, stims) is refused and taken; a unit's resource in a story is refused outright | `costs-foundations` "problem 5" (two tests) |
| 6 | The pin and the tests missed two of six mutations; the test of listed bug fix 5 was vacuous | Right, and more: **the listed bug fix 5 described something that cannot happen.** An enemy with a breacher tube never asks for a reload (see What is left, 8), so "tried six times" was never true of a shipped enemy; even given a spare magazine by hand, the enemy stands still either way (six refused shots instead of six refused reloads). What the change does is the 1 AP reload | The three tables. The enemy test now asserts what the fix makes true (a quick-release reload with 1 AP left; a tube with a spare: not at 2 AP, done at 3). Row 5 of the F3 table and spec item 1524 were corrected | The mutation run below |
| 7 | The lint missed most ways round the primitives (12 of 13 injected) | Right | Reads of a unit's `.ap` are a ratchet (any operator); writes cover `--`, `++`, `*=`, `Object.assign`; the resource ratchet covers every resource and a subtraction written as an assignment; a second F8 ratchet covers a cooldown by subtraction or addition and a turn stamp | All 13 injected lines fail: `u.ap <= 1`, `u.ap--`, `!(u.ap > 2)`, `Object.assign(u, { ap: … })`, `const left = u.ap - 2`, `res.supplies -= 1`, `mg.mp = mg.mp - 5`, `mg.charge = Math.max(0, mg.charge - 2)`, `cb.round - st.last < 3`, `st.t === cb.round + ':' + cb.turn`, `v.ap = left`, `--u.ap`, and the price without a fight |
| 8 | The save note was incomplete; the counts were off | Right | "Behaviour changes of F8" 1 and spec item 1527 list every limit an old mid-fight save forgets. `costs` has 15 entries (the table said 17) | Read |
| 9 | The web suite could not be verified in the reviewer's sparse checkout | An environment limit, not a defect | `npm run check` was run whole on this full checkout (below) | The run |

**Two more things the new tables showed, neither asked for:**

- **The turn's AP total under a Brief and an Encore together** (F3 table, row 8): 280 lines re-recorded on purpose, and
  4 more that only lose float noise (`total1.5999999999999999` is `total1.6`).
- **Loose-loaded enemy guns are never reloaded** (What is left, 8): pinned as it is, not changed.

**The mutation run.** Each mutation alone, against `golden-costs-review` and `costs-foundations`:

MUTATION_TABLE

**How the merge went.** The main line had moved (performance 1, the text-number truth sweep). Five files conflicted
(`combat.ts`, `faith.ts`, `classes/i.ts`, `classes/k.ts`, the spec); both sides were kept: the main line's numbers read
from data (Field Repair's 10% and 5%, Inspire's MP) inside this work's `price` / `whyNot` / `pay`. Two things followed
from the main line's changes, each its own commit: Sanctuary's story action is 0 AP as typed (its data AP became "your
Soul cast AP", so `ap: 'data'` had nothing to read), and 13 pad lines re-recorded for a refusal sentence the main line
reworded (`Needs Proficiency 3.` is `Needs Improvisation 3.`).
