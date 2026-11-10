# Physical 2.0, implementer B: the ranged techniques

For a Claude Code session on its own branch. Written 10 Nov 2026. Suggested settings: Opus 5.5, effort **xhigh**, ultracode **on**.

You are building the 25 ranged technique handlers of **Physical 2.0** in Project Heaven Cry (`leonpentastorm/Project-Heaven-Cry`), plus the quiver and thrown weapons. Two other sessions build the melee techniques and the screen at the same time, and a lead session owns the engine core, the data and the merge.

## Read first

1. `CLAUDE.md`.
2. **[`physical-2.0-PLAN.md`](physical-2.0-PLAN.md)**: the rules for all implementers (section 2), the readings already settled (section 4) and the contract you code against (section 5). It wins over everything below it.
3. **[`../proposals/2026-11-ranged-techniques.md`](../proposals/2026-11-ranged-techniques.md)**: the design. Sections 5 and 7 are your work list. Section 11 (Leon's answers) wins over the body.
4. [`physical-2.0-code-map.md`](physical-2.0-code-map.md): the attack pipeline (Heat, Recoil, bursts, reloads, Overwatch) and the item registry as they are today, with line numbers and traps.
5. `data/techniques.json`: every technique's text, property lines, rounds and placeholder numbers. This is what you implement, word for word.
6. `packages/engine/src/physical/`: the core, and the lead's reference techniques (`ranged/press.ts` has Suppress, `ranged/takes.ts` has Dead Centre, `ranged/watches.ts` has Deny and Overwatch). Copy their shape.

## Your branch

Start from `origin/claude/charming-gauss-hbq4n0` once `physical-2.0-PLAN.md` says the foundation has landed. Push only to your own session branch.

## What you own

| You may edit | For |
|---|---|
| `packages/engine/src/physical/ranged/fire.ts`, `press.ts`, `sets.ts`, `takes.ts`, `watches.ts`, `quiver.ts`, `thrown.ts`, `index.ts` | the handlers, the quiver, thrown weapons |
| new files under `packages/engine/src/physical/ranged/` | helpers only ranged needs |
| `packages/engine/test/phys-ranged-*.test.ts` (new) and `packages/engine/test/helpers/physfight.ts` (add, don't change) | tests |
| `docs/design/handoffs/physical-2.0-B-RESULT.md` (new) | your result note |

Everything else is someone else's: `combat.ts`, `game.ts`, `character.ts`, `physical/*.ts` outside `ranged/`, every `data/` file, the spec, `apps/web/`. If you need something there, put it under "Requests for the lead" and work around it.

## The work list

Shot, Aimed Shot, Suppress, Dead Centre, Deny and Overwatch are done by the lead as references. You build the other 25. The numbers in brackets are the proposal's.

| File | Techniques |
|---|---|
| `fire.ts` | Snap Shot (1), Burst (2), Called Shot (4), Walking Fire (5), Punch Through (6), Lob (7) |
| `press.ts` | Rake (9), Warning Shot (10), Flush (11), Mag Dump (12), Crossfire (13) |
| `sets.ts` | Bead (14), Spot (15), Brace (16), Load Special (17), Shift (18), Vent (19), Head Down (20) |
| `takes.ts` | Pin Down (22), Rout (23), Stopping Shot (24), Storm (25), Last Round (26) |
| `watches.ts` | Cover Me (29), Dead to Rights (30) |
| `quiver.ts` | the quiver (below) |
| `thrown.ts` | grenades and thrown weapons (below) |

For each technique:

1. **The base effect works with any ranged weapon.** Then each property line in `data/techniques.json` changes it exactly as written. When a weapon has two matching properties, `t.line(...)` returns the one the player chose (or the first), and only that one applies.
2. **Shots go through `strike(t, …)`.** It spends the rounds, adds Heat and Recoil by today's rules, and adds the Pressure a hit gives. Do not call `previewAttack` or `resolveAttack` yourself, and do not add the ordinary +1 Pressure yourself.
3. **Extra Pressure goes through `addPressure(t, target, n, why, opts)`,** including Pressure on a miss. It carries every cap and exception (tiers, players stopping at 3, Guard, the Defender, hidden pips for Silent weapons).
4. **Pinned, pushes, Prone and halts go through `stop`** (it carries Stopped once and the Guts-or-Athletics save). Forced movement goes through `forceMove`. Conditions go through `cond`, saves through `save`.
5. **Preview and run are one code path.** `run(t)` is called with `t.preview` true for the card and false for the action. Never roll a die or change state yourself without checking it.
6. **Numbers come from `t.num('key')`.** No bare literals for anything a balance pass would touch; list any key you had to add a fallback for.
7. **Rounds.** Every technique's `rounds` is in the data. `strike` spends one per roll; for techniques that burn more than they roll (Suppress, Rake, Mag Dump) use `spendRounds(t, n)`. A technique the magazine can't pay for is refused with the count ("needs 6 rounds, 4 loaded").

## The kinds, and what the core already enforces

| Kind | Enforced by the core |
|---|---|
| Fire | AP and rounds; Recoil after the first technique that fires this turn |
| Press | +1 Heat on top of what it fires |
| Set | 1 AP, never fires, no Heat |
| Take | the target must be Pressed; one Take a turn; the target loses 2 Pressure after the effect. Your handler reads `wasSuppressed(t)` for the stronger line |
| Watch | AP paid now; refused while the user is Pressed; the core stores it and calls your `react` hook when its trigger happens, with no prompt to anyone |

## Points that need care

1. **Fire modes are gone as a switch.** Burst (2), Rake (9) and Mag Dump (12) are the modes now. Burst and Rake are offered by every Auto weapon whether known or not (the core does that). With Auto, Burst is today's `fireBurst` and Rake is today's `fireAuto`: call them through the wrappers the core exports so Heat, rounds and the Spray and Pray trait keep working. Without Auto they are the weaker versions in the data. Read trap 7 in the code map: Spray and Pray reads the effects queue, so don't change the volley events.
2. **Suppress with a Braced Heavy weapon** holds until the user's next turn. The reference shows the held version; Rake does not hold.
3. **Flush (11)** hits cover with no roll and gives +2 Pressure. The target is **not** asked to choose anything: there are no prompts on another player's turn anywhere in this system.
4. **Crossfire (13)** needs a target an ally has already hit this round. The core records hits on the unit (`hitWith`); read it through `hitByAlly(t, target)`.
5. **Bead (14) and Spot (15)** are marks kept on units (`u.bead`, `u.spot`), ended by the rules in the data. Bead stops the target's Pressure from falling while the user sees it: the core's decay asks `beadHolds(target)`; you write that function in `sets.ts` and export it from `ranged/index.ts`.
6. **Load Special (17)** chambers one carried special round for the next Fire without touching the magazine. The ammo types and their riders already exist (the code map points at them). With a Drawn weapon it is not offered: the quiver does that job.
7. **Vent (19)** lowers Heat; Head Down (20) lowers the user's own Pressure and blocks their Watches this round.
8. **Storm (25)** moves only the user. The proposal's "an ally you call" was cut: no prompts.
9. **Last Round (26)** needs exactly one round loaded. On a kill it makes the user's next speed reload free: set the flag the core's reload reads (`u.freeReload`).
10. **Rout (23)** makes the target run its full move away, which draws opportunity attacks and Watches: use `forceMove` with the option that marks it as the target's own movement.
11. **Watches.** Cover Me (29) fires when an enemy attacks a named ally; Dead to Rights (30) when a named Pressed enemy attacks, stands up, reloads or leaves cover. The core raises those moments as hooks (`attack_target`, `reload`, `stood_up`, `move_step`); your `react` decides and calls `strike`. Check `t.preview` is never true there. A Watch fires once and uses the reaction.
12. **Enemies use these too.** Give each handler an `ai(t)` score where it makes sense (how much an enemy wants it now; 0 for never). Keep it cheap and pure: it runs inside the enemy's planning, which must not change the fight or roll dice.

## The quiver (`quiver.ts`)

Leon's ruling: a quiver gets its own loading menu, and a bow can't be reloaded in a fight.

1. A Drawn weapon has a quiver, not a magazine. Its contents are `c.phys.quiver[weaponId]`: a count for each arrow type, up to the weapon's capacity in all.
2. **Out of a fight,** the action `phys/quiver` sets the load from arrows the character carries. Write the function that checks and applies it (`loadQuiver(c, weaponId, load): string | null`); the lead wires the action to it. Unloading returns arrows to the pack.
3. **In a fight,** each shot names its arrow type (`args.choice`, default: the type with the most left). The count falls by one. The type's rider applies to that shot.
4. **No reload in a fight** for a Drawn weapon: the reload action is refused with "a quiver is filled before the fight". At zero arrows the bow can't fire.
5. An enemy archer's quiver is all standard arrows at capacity.
6. Crossbows are not Drawn: they keep today's reload.
7. The code map notes that enemies with loose-loaded weapons never reload today. Don't fix that in `combat.ts`; describe it in your requests if the quiver makes it worse.

## Thrown weapons (`thrown.ts`)

1. **Explosive grenades are ammunition for Blast.** A grenade is thrown through Lob (7) at a tile within the user's throwing range: no roll against Defense, today's blast damage and radius, and +2 Pressure to everyone in the radius.
2. **Smoke, flashbangs and the bot-scrambler act on other people's fire.** Landing one on a unit ends that unit's held Watch and its Bead. Smoke lets Pressure fall by 2 at end of turn for anyone standing in it (export `inSmoke(cb, u)` for the core's decay).
3. Keep every existing grenade effect (Blinded, the scrambler's Stun on machines, burning tiles). You are adding to them, not replacing them. Today's Throw action stays for a character who knows no techniques.
4. Thrown knives and hatchets belong to the melee list (Throw, Flurry); a thrown hit gives Pressure like any ranged hit, which `strike` already does.

## Tests

One file per kind (`phys-ranged-fire.test.ts` and so on), plus `phys-ranged-quiver.test.ts` and `phys-ranged-thrown.test.ts`. For every technique:

1. the base effect with a plain weapon;
2. each property line, with a weapon that has that property and one that doesn't;
3. each refusal (not enough rounds, target not Pressed, user Pressed for a Watch, a Drawn weapon for Mag Dump);
4. AP, rounds, Heat and Recoil spent; Pressure on every unit before and after, including the caps (an elite at 3, a boss at 2, a player at 3) and Pressure on a miss;
5. that the preview's numbers equal what the action then does with the same seed, and that a preview changes nothing;
6. for the Takes: the base line against a Pressed target and the stronger line against a Suppressed one, and that the target lost 2 Pressure;
7. for the Watches: that the trigger fires it on the enemy's turn with no input, once, and that it is refused while the user is Pressed;
8. for anything that stops a target: that Stopped once blocks a second stop until the end of the target's next turn.

Use the lead's `packages/engine/test/helpers/physfight.ts`.

## Done means

- All 25 handlers, the quiver and the thrown rules are in; `techniquePad` shows none of them as "not built yet".
- The checks in the plan (section 2, point 11) pass.
- Your result note is pushed, and you have told Leon your branch name.
