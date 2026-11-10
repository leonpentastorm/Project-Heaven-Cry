# Physical 2.0, implementer A: the melee techniques

For a Claude Code session on its own branch. Written 10 Nov 2026. Suggested settings: Opus 5.5, effort **high**, ultracode **on**.

You are building the 23 melee technique handlers of **Physical 2.0** in Project Heaven Cry (`leonpentastorm/Project-Heaven-Cry`). Two other sessions build the ranged techniques and the screen at the same time, and a lead session owns the engine core, the data and the merge.

## Read first

1. `CLAUDE.md`.
2. **[`physical-2.0-PLAN.md`](physical-2.0-PLAN.md)**: the rules for all implementers (section 2), the readings already settled (section 4) and the contract you code against (section 5). It wins over everything below it.
3. **[`../proposals/2026-11-melee-techniques.md`](../proposals/2026-11-melee-techniques.md)**: the design. Section 3 is your work list. Section 10 (Leon's answers) wins over the body.
4. [`physical-2.0-code-map.md`](physical-2.0-code-map.md): the attack pipeline and the item registry as they are today, with line numbers and traps.
5. `data/techniques.json`: every technique's text, property lines and placeholder numbers. This is what you implement, word for word.
6. `packages/engine/src/physical/`: the core, and the reference techniques the lead wrote (`melee/openers.ts` has Lunge, `melee/finishers.ts` has Coup, `melee/answers.ts` has Riposte). Copy their shape.

## Your branch

Start from `origin/claude/charming-gauss-hbq4n0` once `physical-2.0-PLAN.md` says the foundation has landed. Push only to your own session branch.

## What you own

| You may edit | For |
|---|---|
| `packages/engine/src/physical/melee/openers.ts`, `strikes.ts`, `links.ts`, `finishers.ts`, `answers.ts`, `index.ts` | the handlers |
| new files under `packages/engine/src/physical/melee/` | helpers only melee needs |
| `packages/engine/test/phys-melee-*.test.ts` (new) and `packages/engine/test/helpers/physfight.ts` if the lead's helper lacks something (add, don't change) | tests |
| `docs/design/handoffs/physical-2.0-A-RESULT.md` (new) | your result note |

Everything else is someone else's: `combat.ts`, `game.ts`, `character.ts`, `physical/*.ts` outside `melee/`, every `data/` file, the spec, `apps/web/`. If you need something there, put it under "Requests for the lead" and work around it.

## The work list

Cut, Lunge, Coup and Riposte are done by the lead as references. You build the other 23. The numbers in brackets are the proposal's.

| File | Techniques |
|---|---|
| `openers.ts` | Charge (2), Feint (3), Draw Cut (4), Ambush (5) |
| `strikes.ts` | Sweep (7), Bash (8), Sunder (9), Flurry (10), Hamstring (11), Bind (12), Half-Sword (13), Throw (14) |
| `links.ts` | Sidestep (15), Guard (16), Shove (17), Trip (18), Drag (19) |
| `finishers.ts` | Cleave (21), Break (22), Run Through (23), Throw Down (24) |
| `answers.ts` | Parry (25), Keep Back (27) |

For each one:

1. **The base effect works with any melee weapon.** Then each property line in `data/techniques.json` changes it exactly as written. When a weapon has two matching properties, `t.line(...)` returns the one the player chose (or the first), and only that one applies.
2. **Attacks go through `strike(t, …)`.** Do not call `previewAttack` or `resolveAttack` yourself and do not add Momentum yourself: `strike` does both, including the bonus for a technique different from your last one.
3. **Pushes, pulls and throws go through `forceMove`,** so a gunner's held shot fires when you move an enemy. Pinned, Prone, pushes and halts go through `stop` (it carries the Stopped once rule and the save). Conditions go through `cond`. Saves go through `save`.
4. **Preview and run are one code path.** `run(t)` is called with `t.preview` true for the card and false for the action. The helpers do nothing and roll nothing when it is true. Never roll a die or change state yourself without checking it.
5. **Numbers come from `t.num('key')`.** If a number you need is missing from the data, use a fallback in the call (`t.num('push', 1)`) and list the key in your result note. No bare literals for anything a balance pass would touch.
6. **Refusals are plain words** a player reads on a greyed chip: "not available with a blunt weapon", "needs a target you have Bound or Grappled".

## The kinds, and what the core already enforces

You don't re-check these; the core refuses before your handler runs.

| Kind | Enforced by the core |
|---|---|
| Opener | only as the first melee technique of the turn |
| Strike | AP is the weapon's attack AP plus `ap.add` |
| Link | 1 AP, never deals damage, never ends the chain |
| Finisher | Momentum 2 or more; it is your last melee technique this turn. You call `spendMomentum(t)` and use what it returns |
| Answer | your reaction; not on your own turn |

## Points that need care

1. **Feint (3)** deals no damage but counts as a hit for Momentum when the target fails its save. It marks the target so your next technique against it this turn has +3 and it can't use an Answer: keep that mark on the unit's technique state (`t.u.ps`), not in a module variable. Module variables are not saved and break replays.
2. **Draw Cut (4)** needs the weapon stowed at the start of the turn (`needs.stowed`). Use the existing gear functions to draw; the code map lists them.
3. **Ambush (5)** needs Hidden. With Bare it does no damage and applies Grappled and Silenced: reuse today's Grapple.
4. **Sweep (7) and Cleave (21)** hit several targets: wrap the strikes the way `fireBurst` does (`chained()` and a `volley_end`), which the reference Coup shows for one target. Allies in the arc are hit (friendly fire, as Sigil bursts do).
5. **Bind (12)** lasts until your next turn and ends if either of you is moved away. With Bare it becomes today's Grapple. Throw Down (24) needs a target you have Bound or Grappled.
6. **Throw (14)** always hits with Dexterity, whatever the weapon says, and leaves the weapon in the pile on the target's tile. Use the existing pile functions.
7. **Guard (16)** keeps Momentum over the end of the turn. The core reads a flag for that; set it through the helper the reference shows, don't touch `closeTurn`.
8. **Run Through (23)** with Reach lets the player leave the weapon in: the user is then unarmed (the weapon goes to the target's tile as a pile entry tied to the Pinned state). If that is not reachable from your files, build the rest and put this line in your requests.
9. **Parry (25)** is a protective reaction: it works while the user is Suppressed. Riposte and Keep Back are not. The core's `canAnswer(u, id)` knows; call it.
10. **Keep Back (27)** fires on an enemy stepping into reach: hook `move_step` through `react`, as the lead's Deny does for ranged.
11. **Name clashes.** The Fighter already has class moves called Lunge, Riposte and Finisher, and there is a base Shove action and a Fighter Shove. The lead rewires those. Your handler ids are the technique ids in the data (`shove` the Link is the technique); don't register anything under a `class:` key.

## Tests

One file per kind: `phys-melee-openers.test.ts` and so on. For every technique:

1. the base effect with a plain weapon;
2. each property line, with a weapon that has that property and one that doesn't;
3. each refusal;
4. AP spent, Momentum before and after (including the variety bonus and a repeat), and for Finishers that the chain has ended;
5. that the preview's numbers equal what the action then does with the same seed, and that a preview changes nothing (compare the fight before and after as JSON);
6. for anything that moves an enemy: that a held Watch fires, and that Stopped once blocks a second stop.

Use the lead's `packages/engine/test/helpers/physfight.ts` to build fights with a named weapon in hand.

## Done means

- All 23 handlers registered; `techniquePad` shows none of them as "not built yet".
- The checks in the plan (section 2, point 11) pass.
- Your result note is pushed, and you have told Leon your branch name.
