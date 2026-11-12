# Engine foundations 2: paying a cost, and counting a limit (12 Nov 2026)

Wave 2 of [the foundation plan](../proposals/2026-11-engine-review/PLAN.md), from
[engine review 1](../proposals/2026-11-engine-review/1-duplication.md): its findings **F3 (paying a cost)** and
**F8 (limits and counters)**, and what [client boundary 1](client-boundary-1.md) left ("the engine's action functions
still hold their own base-cost literals"). Each finding is now **one primitive**, a **lint test** that fails when
someone goes round it, and a **pin** recorded before the code moved.

If you only read one part, read [How to add things](#how-to-add-things).

## What was built

| Finding | The primitive | Sites it replaced | Behaviour changed? |
| --- | --- | --- | --- |
| **F3** paying a cost | `effects/cost.ts`: `price`, `whyNot` / `canPay`, `pay`, `refund`, `spend`, `grantAp`, `loseAp`, `setAp`, `freely`, `withAp`, the credit (`lend` / `settleCredit`), the one `cost` hook | 60 `u.ap <` checks and about 30 more written the other way round (`u.ap >= n`, `n > u.ap`); 193 direct writes to `.ap`; 41 `actionAp` calls; the AP refusal sentence written out 60 times; the loan (three copies) | No number moved. Six edge cases (below) |
| **F3** costs in data | `data/actions.json` `costs` (17 verbs with no row) and `resources` (10); `ap: 'data'` on an item's action | the literal base costs of the built-in verbs; 95 lane actions that typed their item's own `ap_cost` again | No |
| **F8** limits and counters | `effects/uses.ts`: `uses(h)` with pure reads, `first`, `on(target)`, the `cooldown` scope (`cool` / `coolLeft` / `ready`), the `SCOPES` table | The AP perks' cooldown store (`perks/cooldown.ts`), the prayer limits (five fields in two places), QUICKEN's round, two "took an order this round" marks, Under the Eye's note | Where they are kept (the marks tables). Not what they allow |
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
`uses.faith#own:<id>|cooldown`, 216 lines), QUICKEN (`quickRound` became `uses.sigil:quicken|per_round`, 11 lines).
The damage tables (5,327 actions) and the rules tables are identical too.

**Honest limits.** (1) The tables never let an enemy act (the harness skips every enemy action, as the damage tables
do), so the enemy AI's affordability checks that were converted (`combat.ts` `enemyTurn` and `enemyIntent`,
`ai-sigil.ts`, `ai-soul.ts`, `physical/ai.ts`, `calls/ai.ts`) are held by the suite's own AI tests, not by a table.
(2) Encore and a Brief are not in the tables: the credit is held by the Faith and Calls suites (which passed unchanged)
and by `test/costs-foundations.test.ts`. (3) The area map's actions are not in the tables.

## F3: paying a cost (`packages/engine/src/effects/cost.ts`)

```ts
interface Cost { ap?: number; res?: Record<string, number> }
interface Priced { action: string; ap: number; res: Record<string, number>; labels: string[]; free: boolean }

price(x: { cb?, u?, c? }, action: string, base?: number | Cost | null, ctx?: Record<string, unknown>): Priced
priced(x, action, ap, res?, ctx?): Priced               // a number its own pipeline worked out, through the same hook
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
  With no fight in reach (`price({ u }, …)`, a row made before a fight is known) only the unit's own items answer.
- **`whyNot`** is the one sentence: `Needs 2 AP.`, `Needs 3 charge.`, `Needs 1 Guard.` (the word is the resource's
  `name` in the data). What an action declares (`res`) is asked before its AP, as the items' own checks were.
- **`pay`** is the only thing that subtracts AP. It draws on the action's **credit** first, rounds to tenths, then
  takes each resource from where the data says it lives.
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
| 5 | An enemy with exactly 2 AP whose weapon reloads for 3 (the breacher tube) | Tried `reload` six times, refused each time, and did nothing else that turn | Knows it can't pay and goes on to its next choice | The AI asked `u.ap >= 2`, not the weapon's price |
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
  three cells (`faith#whisper`, `faith#hymn`, `faith#own:<id>`) for both; QUICKEN's `quickRound`; "this ally already
  took an order this round" (On My Mark, Born Officer); Under the Eye's one note a round.
  `clearPrayerLimits(u, g?, c?)` (`faith.ts`) is the Proving Ground's "reset the limits".

### Behaviour changes of F8

1. **A save made in the middle of a Hymn's cooldown** (or after a Whisper this round) forgets that one limit when it
   is loaded by this build: the old fields (`prayedRound`, `c.state.faith.hymnRound`…) are not read. Nothing else.
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
   the one form allowed;
2. a write to a unit's `.ap` outside `effects/cost.ts` and `effects/ap.ts`;
3. `'Needs ' + n + ' AP.'` built outside `cost.ts`;
4. `actionAp(` outside `price()`;
5. the loan coming back (`encoreBefore`…, `u.ap = 99`);
6. a `price(x, '<action>')` whose action has no AP in `data/actions.json`; a `costs` entry that is not a whole number,
   repeats a row or names an undeclared site;
7. a **new** resource paid by hand (`.mp -=`, `.charge -=`, `.cores--`, `.stims--`, `.parts = … − 1`, `.echo--`): the
   28 left are counted per file (a ratchet: the numbers only go down);
8. an action that says `ap: 'data'` with no number in its data; and the count of lane actions that still type a number
   the data also holds (28, written by helpers);
9. the moved stores coming back (`prayedRound`, `whisperTurn`, `hymnRound`, `ownHymn`, `quickRound`, `stateOf(h).cd`);
10. a `uses` bag created outside `uses.ts`;
11. a **new** round number kept by hand and compared with `cb.round` (56 left, counted per file: a ratchet).

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
   **Never write `u.mg.charge -= 3` in `run()`.**
3. **A new resource** (a relic's charges): one row in `data/actions.json` `resources`
   (`"relic": { "name": "relic charges", "on": "unit", "path": "res.relic" }`). Then `res: { relic: 1 }` works
   everywhere, with its refusal sentence.
4. **To let an item make something cheaper,** in data: `{"op":"action_cost","action":"<site>","value":-1,"min":1}`.
   In code: the item's `stat:` answers `'ap_cost:<site>'`, or it listens on the `cost` hook
   (`cost: (ctx, h) => { if (ctx.u === h.u && ctx.action === 'prone') ctx.ap -= 1; }`). The `cost` hook sees **every**
   priced action; set `ctx.min` for "never below 1", `ctx.free = true` for free.
5. **"Your next action costs N less" is a credit, not AP.** Do not add AP before an action and take it back. Look at
   `lend` in `cost.ts`: a new kind of credit is one more term there.
6. **To do an action inside another at no AP,** `freely(u, () => reload(cb, u))`. **Never write `u.ap = 99`.**
7. **To give AP:** perk AP is `grantPerkAp(cb, u, n, 'why')` (the +3 cap) or `bankAp` (next turn). AP that is not perk
   AP (a spell's Quicken): `grantAp(cb, u, n)`. To take AP as a penalty: `loseAp(u, n)`.
8. **To give AP back** (the action was refused after it was paid): `refund(cb, u, n)`.
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
15. **When a counter moves to `uses()`,** the marks tables move: `GOLDEN_RECORD=marks npm test -w @phc/engine --
    golden-costs`, and read the diff. A **state** line that moves is a behaviour change: say so, and record with
    `GOLDEN_RECORD=1` only on purpose.

## What is left

1. **The specialised pipelines keep their own hooks.** An attack (`attack_preview`), a move (`move_cost`), a glyph and
   an Evoke (`glyph_cost`, `evoke_cost`), an Outburst (`outburst_cost`, `outburst_pump`, `release_cost`), a technique
   (`apFor`), a Call (`call_cost`), a gear change (`swap`) and a throw work out their AP as before and then pay through
   `whyNot` / `pay`. Only Sigil's draw and Evoke also pass through the new `cost` hook (`priced`). Moving the old hook
   names onto `cost` as thin adapters is the rest of review F3's "ten channels become one"; the previews run thousands
   of times a turn, so do it with the performance piece.
2. **28 resource payments are still made by hand** (the lint's ratchet lists them by file): prices worked out inside the
   action (a script's Evoke charge, `soulPrice`), spare parts and stims in the built-in verbs, Echo's reroll in the
   story. Each wants `res` or `spend()`.
3. **Techniques** pay AP through `pay()` and Momentum and Guard through `spend()` (by way of `resSpend`), but rounds,
   Heat and the Momentum refund on a refused handler are still the technique runtime's own (`physical/core.ts`).
4. **The area map's round pool** (`g.story.ap`) has one door of its own (`game.ts` `apLeft` / `spendAp`, the sentence
   from `poolWhyNot`). It is not a unit's AP and was left.
5. **Lane action AP literals:** 28 that equal their data are written by a helper (a map over toxins, on / off pairs);
   about 115 have no number in the data to read (story variants at 0 AP, second actions of an item). Review F5 (`num(h,
   key)`, numbers in data) is where they go.
6. **F8 is half done.** `uses()` now does everything the seven stores did, but only stores 5 and 6 and five state
   fields were moved. Still by hand: 56 `=== cb.round` compares (the ratchet), among them the reactions
   (`tactics.ts` `useReaction`, one door), the Call counters (`calls/core.ts`), `fighttalk.ts` `attempted`, zone
   "hit this round" maps; technique state (`u.tech[id]` with `turnStamp`, 41 uses); the unit flags (`shotsThisTurn`,
   `firstShotTurn`, `sprinted`, `openerUsed`, `moved`, `stopped`); `c.miracleSession`; the story's `noticed`. Review 1
   says F8 "rides on F5's `limit`": the data's `limit` should be the only way an item states one.
7. **For Leon** (rulings taken without asking): spec items 1522 and 1527.
