# The foundation: one plan from the four reviews

Leon, 12 Nov 2026: "do everything possible to optimize and get the engine to prim, proper, professional shape for later
weaker model like Opus 5.5 to continue expanding on. Do everything without ask... without it the game will devolve
into a sloppy mess when more things are added." A roguelike mode is on the roadmap.

**The shape being removed everywhere:** one concept implemented many times; rules and numbers living outside data;
custom code per item where a data-driven primitive should exist; a second copy of a rule in the client, a test, a card
text or the Narrator prompt.

**The method, every time:** pin, then move. Record what the engine does today as an exact golden table
(`packages/engine/test/golden/`), commit it on unmodified code, refactor until every site goes through the one
primitive and the table is identical. Where the old copies disagreed with each other, the primitive takes the
recommended behaviour, the lines are re-recorded on purpose, and each changed line is listed in the hand-off. Each
piece of work runs in its own git worktree and is merged by the lead with `npm run check` green before and after.

**Each piece ends with a "How to add things" note** in its hand-off, and a lint test that fails when someone goes
round the primitive. Those notes are collected into `docs/ENGINE-GUIDE.md` at the end: that file, not this plan, is
what a later contributor reads.

The reviews: [`1-duplication.md`](1-duplication.md), [`2-performance.md`](2-performance.md) (pending),
[`3-data-text-tests.md`](3-data-text-tests.md) (pending), [`4-client-boundary.md`](4-client-boundary.md).

## Waves

Status words: **running**, **merged**, **next**, **later**.

### Wave 1 (merged, 12 Nov)

| Piece | From | What | Hand-off |
| --- | --- | --- | --- |
| Damage formula a4 to a7 | unified-damage proposal | Sigil, the Outburst, prayers, heals, shields and the ~40 literals through `effects/output.ts`; generic `deal` and `mend` ops; the four leaks | `unified-damage-stage-a.md` |
| Engine foundations 1 | review 1: F14, F6, F1, F2 | Typed stat ids; `kit.ts` (geometry, selectors); `rolls.ts` (every save and roll, "a save is a save"); `displace()` (every forced move, one trigger table); the bugs found by reading | `engine-foundations-1.md` |
| Client boundary 1 | review 4: 1, 2, 6, 9 | Costs and legality from the engine (six live disagreements); one engine preview that owns the copy and the fog; card texts that can't go stale; the Perks tab asks the engine | `client-boundary-1.md` |

### Wave 2 (running, 12 Nov: costs and counters, conditions, fog in the engine; also running: performance 1, the text-number sweep, the browser suites)

| Piece | From | What |
| --- | --- | --- |
| Costs and counters | review 1: F3, F8 | `cost` on every action definition, `price()` / `pay()` and one cost hook; every limit through `uses()` with a cooldown scope |
| Conditions | review 1: F4 | The condition table read from `data/conditions.json`; everything through `applyCond`; one injury roll |
| Performance 1 | review 2 | The reaction dispatch (about 40% of an action), and whatever review 2 ranks first |
| Tests and data 1 | review 3 | Tests read numbers from data; the validator's gaps; texts generated from fields |
| Fog in the engine | review 4: 4 | `viewFor` sends a guest only what its side sees |

### Wave 3 (later)

| Piece | From | What |
| --- | --- | --- |
| Item ops | review 1: F5 | `when` / `if` / `limit` and about nine generic ops; most of the 310 per-item handlers become data |
| Preview is a dry run | review 1: F7 | One preview on the item runtime; the enemy's intent is its turn in dry run |
| Character, unit and story state | review 1: F9, F10 | One declared state table; one action for story and fight |
| Action descriptors | review 4: 3 | `actionsFor(game, unit)`; one generic flow in the client; then the combat screen split (review 4: 8) |
| Effects with a schema | review 4: 5 | Typed events, one handler table, engine-declared timing |
| Rooms and the Narrator prompt | review 4: 7, 10 | State sent once by hash; the prompt cut to what the Narrator judges |

### Then the balance pass resumes on the new foundation (balance-pass section 17)

The re-fit (an all-in build on each ceiling, a normal share at ceiling ÷ 1.25, no damage slope on rolled attacks),
many targets, the yardstick for control, what was left out, the balance contract and its guard, closing the patch.

## What ships together (Leon, 12 Nov 2026)

"Roll the balance pass in and wave 3 too before asking me to push to live, include hand off for agents then, and a
list of what I should test on my own. Do conserve token as much as possible."

So nothing is offered for live until ALL of this is merged and one clean `npm run check` and `npm run e2e -- all` have
run on a quiet machine:

1. Wave 2 and the three pieces running beside it.
2. Wave 3 (item ops, preview as a dry run, state sync, action descriptors, effects with a schema, rooms and the
   Narrator prompt), then the spec's revisions folded into its body.
3. The balance pass on that foundation (balance-pass section 17: the re-fit to all-in ceilings at ratio 1.25, many
   targets, the yardstick for control, what was left out, the balance contract and its guard).
4. `docs/ENGINE-GUIDE.md` (the "How to add things" notes of every piece, collected: what an agent reads before it
   extends the engine), the session hand-off, the patch tally checked against live, the version and changelog.
5. `docs/PLAYTEST-CHECKLIST.md`: what Leon should try by hand, by system, with what "right" looks like.

**Token rule for the rest (one usage reset left):** no new piece starts while more than two are running; builders are
the cheapest tier that can do the piece (CLAUDE.md, "Who does what"); an adversarial reviewer only where a mistake
would be silent (determinism, saves, a primitive every item goes through), never for mechanical conversions, which the
golden tables and the lints already check; measurement runs use the smallest sample that separates the answer from
noise; the lead merges and reads reports, it does not re-derive them.

## Rulings taken without asking (Leon: "do everything without ask")

Each is the reviewing agent's recommendation, built and pinned by a test; the hand-off of its piece lists what moved.

1. **A save is a save:** an item that changes saves applies to every save, whatever asked for it.
2. **Forced movement:** landing on a trap, field or hazard always applies; held Watches, Overwatch and opportunity
   attacks do not fire; Nailed and "can't be pushed" stop every push, pull and throw; one list of what blocks a
   landing tile.
3. **One order of multiplication** for every source of damage (the spell's: base × own, then × target); armour never
   goes under 0.
