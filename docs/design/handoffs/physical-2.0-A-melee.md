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

## What the foundation settled (read before the rest; it wins where the two differ)

1. **The code is the contract:** `physical/types.ts`, then `core.ts`, then the reference handlers. `melee/shared.ts` re-exports everything a handler imports.
2. **Shared engine files take small additive edits from you** (the plan's rule 5): a field on a hook's context, an optional field on `Unit`, a new hook, a helper option that defaults to today's behaviour. Never a change to what existing code does. List each one in your result note. **Fill in the `numbers` of your own techniques in `data/techniques.json`** as you build them; change nothing else there.
3. **`t.c` is null for an enemy or a companion.** Every handler must work with it null (skills come from the unit: `t.u.attack`, `t.u.strength`).
4. **Give every handler an `ai(t)`** where an enemy could want it: a number (a plain attack is 5; 0: never), pure, no dice, no state.
5. **Moving the user** inside a technique (Charge, Sidestep, Draw Cut's step): `approach(t, target, maxTiles)` finds the step, `stepUser(t, route)` takes it (held shots see each tile), `standingAt(t, tile, fn)` previews a strike from where the user will stand. Lunge shows all three. **Charge's run-up:** the core doesn't track a walk before the technique; make the run part of Charge (it moves the user itself, up to its tiles, in a straight line), or add a small counter on `Unit` in `moved` (an additive edit).
6. **Technique state lives in `t.state()`** (`u.tech[id]`, saved with the fight; a copy in a preview), not `t.u.ps`. A set-up mark for "your next technique against this target" is `setUp(t, target, { hit, noAnswer })`: the core applies and spends it (Feint, Sidestep).
7. **A technique that works without a damaging strike** (Feint when the save fails, a Link) calls `landed(t)` for its Momentum.
8. **Several targets (Sweep, Cleave, Flurry):** call `strike(t, { target })` once per target. There is no volley wrapper to call; the core gives the variety bonus once per technique whatever the count.
9. **Answers:** `react: { hookName(ctx, t) { … answer(t, attacker, () => { … }) } }`. `answer` checks `canAnswer` (Parry is protective and works while Suppressed; the others don't), spends the reaction and emits the event. Parry needs a hook before the damage of a melee hit lands: `attack_roll` (set `ctx.hit = false` to turn a hit into a miss) or `damage_in`; pick the one that fits its text and say which in your note.
10. **Guard and Pressure:** "the Defender takes Pressure on Guard" is a `pressureFilter` you register from `links.ts` (it returns what still lands on the target).
11. **New conditions** a technique needs (Bound, Guarding): keep them as technique state on the unit and listen on the hooks with `onHook`, as `ranged/press.ts` does for Suppress's held lane. Don't add to `magic.ts`'s condition table (ask the lead if a real condition is needed).
12. **Tests:** import `physFight` and `rig` from `test/helpers/physfight.ts` (the lead's; don't edit it) and put your own helpers in `test/helpers/physfight-melee.ts`.


13. **Since the foundation (merge the base in):** `strike` returns the unit really struck as `r.target` (an attack can be redirected: Confused, a captive held as a shield): put a technique's riders on `r.target`, never on `t.tgt`. A technique's step now goes through the engine's own move (`stepUser`): a Pinned, Grappled or Prone user doesn't step (`stepBlock(t)` gives the reason for a refusal), and traps, hazards and held shots on the way fire. A line's AP change is its `ap` field in the data (Bash's Bare line has `-1`): if a technique of yours changes its cost with a property, ask the lead to set it, don't refund AP in the handler. Drill is paid for every weapon that damaged the victim. A Press's extra Heat lands after its roll.

14. **New in the core for you (merge the base in):** `strike(t, { thrown: true })` throws the held weapon (Throw, Flurry's Thrown line): a ranged attack at throwing range with line of sight and cover, aimed with Dexterity, Pressure to the target and Momentum to you; then `loseWeapon(t, r.target.pos)` puts it in the pile there (`loseWeapon(t, null)` for a weapon left in a target). **Draw Cut** needs nothing from you but its strike: the core draws the weapon named by `args.item` and runs your handler with it in hand (`t.wield === 'drawn'`). **Run Through**'s "Pinned until it spends 2 AP" is `stop(t, target, 'pinned', { save: false, untilAp: 2 })` (add `weapon: t.weaponId` and `loseWeapon(t, null)` for the Reach line). The stand-in handlers in `test/phys-core-gaps.test.ts` show each in a few lines.

15. **After the second review (merge the base in):** when `strike` returns `r.cancelled` (a held shot answered the attack and it never came), return null at once with no riders: it is not a miss. A card with several rolls now also stops at a jam the earlier rolls bring. A weapon left in a target (`loseWeapon(t, null)` after `stop(..., { untilAp, weapon: t.weaponId })`, in that order) keeps its own entry and comes back as the weapon it was. The card's Pressure for a hit is the rules' own number (past cover, unseen and Silent, a thrown weapon).

## Your branch

The foundation has landed (the plan's section 3 names the commit). Your session already has its own branch: bring the base in with `git fetch origin claude/charming-gauss-hbq4n0 && git merge origin/claude/charming-gauss-hbq4n0`, and merge it again whenever the lead says the base moved. Push only to your own session branch.

## What you own

| You may edit | For |
|---|---|
| `packages/engine/src/physical/melee/openers.ts`, `strikes.ts`, `links.ts`, `finishers.ts`, `answers.ts`, `index.ts` | the handlers |
| new files under `packages/engine/src/physical/melee/` | helpers only melee needs |
| `packages/engine/test/phys-melee-*.test.ts` and `packages/engine/test/helpers/physfight-melee.ts` (new) | tests |
| the `numbers` of your 23 techniques in `data/techniques.json` | placeholder numbers |
| `docs/design/handoffs/physical-2.0-A-RESULT.md` (new) | your result note |

Everything else is shared or someone else's. Shared engine files take small additive edits (the plan's rule 5, and point 2 below); the spec, the rest of `data/`, `physical/ranged/` and `apps/web/` you don't touch. Anything bigger goes under "Requests for the lead".

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

1. **Feint (3)** deals no damage but counts as a hit for Momentum when the target fails its save (`landed(t)`). It marks the target so your next technique against it this turn has +3 and it can't use an Answer: that is `setUp(t, target, { hit: 3, noAnswer: true })`. Never keep state in a module variable: it is not saved and breaks replays.
2. **Draw Cut (4)** needs the weapon stowed at the start of the turn (`needs.stowed`). Use the existing gear functions to draw; the code map lists them.
3. **Ambush (5)** needs Hidden. With Bare it does no damage and applies Grappled and Silenced: reuse today's Grapple.
4. **Sweep (7) and Cleave (21)** hit several targets: one `strike(t, { target })` each. Allies in the arc are hit (friendly fire, as Sigil bursts do).
5. **Bind (12)** lasts until your next turn and ends if either of you is moved away. With Bare it becomes today's Grapple. Throw Down (24) needs a target you have Bound or Grappled.
6. **Throw (14)** always hits with Dexterity, whatever the weapon says, and leaves the weapon in the pile on the target's tile. Use the existing pile functions.
7. **Guard (16)** keeps Momentum over the end of the turn: `holdMomentum(t)`. Don't touch `closeTurn`.
8. **Run Through (23)** with Reach lets the player leave the weapon in: the user is then unarmed (the weapon goes to the target's tile as a pile entry tied to the Pinned state). If that is not reachable from your files, build the rest and put this line in your requests.
9. **Parry (25)** is a protective reaction: it works while the user is Suppressed. Riposte and Keep Back are not. `answer()` asks the core's `canAnswer` for you.
10. **Keep Back (27)** fires on an enemy stepping into reach: hook `move_step` through `react` (`ctx.u` is the mover, `ctx.at` the tile, `ctx.stop` halts the walk), as the lead's Deny does for ranged.
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
