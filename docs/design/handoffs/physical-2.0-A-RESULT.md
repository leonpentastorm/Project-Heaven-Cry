# Physical 2.0, implementer A (melee): result

Branch: `claude/awesome-babbage-8gngk8`. It holds the foundation (c02d983), the six melee slice branches merged in with `--no-ff`, the base `origin/claude/charming-gauss-hbq4n0` up to 359bf96 merged in, and one commit that fits the slices to the base's new core services and writes this note.

## What is done

All 23 melee techniques have handlers, are registered, and have tests. `techniquePad` and `packPad` show none of them as "Not built yet". `test/phys-melee-pad.test.ts` checks this with six weapons, and checks that the pads list all 27 melee techniques across eleven weapons.

| Group | Techniques | File | Tests |
| --- | --- | --- | --- |
| Openers | Charge (2), Feint (3), Draw Cut (4), Ambush (5) | `melee/openers.ts` | `phys-melee-openers.test.ts` (22) |
| Strikes | Sweep (7), Bash (8), Sunder (9), Flurry (10) | `melee/strikes.ts` | `phys-melee-strikes-a.test.ts` (34) |
| Strikes | Hamstring (11), Bind (12), Half-Sword (13), Throw (14) | `melee/strikes-b.ts` (new, imported by `melee/index.ts`) | `phys-melee-strikes-b.test.ts` (30) |
| Links | Sidestep (15), Guard (16), Shove (17), Trip (18), Drag (19) | `melee/links.ts` | `phys-melee-links.test.ts` (35) |
| Finishers | Cleave (21), Break (22), Run Through (23), Throw Down (24) | `melee/finishers.ts` | `phys-melee-finishers.test.ts` (33) |
| Answers | Parry (25), Keep Back (27) | `melee/answers.ts` | `phys-melee-answers.test.ts` (21) |
| All | the pad | | `phys-melee-pad.test.ts` (8) |

The lead's references (Lunge, Cut, Coup, Riposte) are unchanged. The six slices merged without conflicts. Merging the base caused import conflicts in `openers.ts` and `answers.ts`; I kept both sides.

### Changes after merging the base (359bf96: "the core services the other 48 techniques need")

The base now provides several things the slices had worked around. I moved the slices onto the core versions:

1. **Draw Cut.** The core now draws (`needs.stowed`, `args.item`, the reducer's gear service). It checks and previews the technique as if the weapon were held, then draws it for free. I removed the slice's own draw (`melee/draw.ts` is deleted). The handler only checks "stowed since the start of the turn" (a `turn_start` listener records the hands) and runs the Edge and Light lines. A character holding a gun can now Draw Cut a stowed blade, and the gun goes into the pack. The tests pass `item` (a pack index), and the pad test reads Draw Cut from `packPad`.
2. **Run Through.** The Pin is now the core's nail: `stop(t, tgt, 'pinned', { untilAp: pull_free_ap, weapon })`. It holds until the unit, or an ally next to it, spends 2 AP (`combat/pull-free`; the enemy AI frees itself, and physView shows it). The slice's own pullFree and its automatic payment at turn start are gone. With the Reach line and opt `leave`, the weapon stays in the target (`loseWeapon(t, null)`, recorded on the nail) and drops into the pile on the target's tile when it is pulled free. This answers the slice's request about linking the pile to the Pin.
3. **Throw and Flurry's Thrown line.** Both now use the core's thrown strike (`strike({ thrown: true })`): a ranged attack at throwing range with line of sight and cover, aimed with Dexterity, which gives Pressure on a hit and Momentum to a melee technique. They also use `loseWeapon(t, tile)` (the reducer's own drop). I removed the slices' hand-rebuilding code (`letGo`, `leaveInPile`) and Throw's own Dexterity term. One consequence: the card no longer lists "Dexterity, not the weapon's skill" as a separate term, because the core swaps the attack bonus itself. The test now compares the to-hit at Dexterity 8 and at Dexterity 2.
4. **Sidestep and Drag.** `stepUser` now takes options in place of a label. The step is the engine's own move: free, with no opportunity attacks, and traps and held shots still fire.
5. **Bash's Bare line.** The data now carries `ap: -1`, so the slice's `lineDiscount` does nothing and the core charges the right cost. The pad shows it too.

## What is not done

- No numbers were written into `data/techniques.json`, because this stage's ownership excludes `data/`. Every number is read with `t.num(key, fallback)`. The keys are listed below.
- `test/phys-core.test.ts` (the lead's file) has one failure: it still expects Sidestep's pad entry to be `NOT_BUILT`. It is the only failing test in the engine suite. See request 1.
- Enemies don't use any of the 23 in practice yet. Each has an `ai()` score, but no enemy tier lists them in a test.
- Not pushed. This stage says to commit, and the push is the lead's.

## Readings that differ from the brief

1. **Stopped once** applies to ranged techniques only (the core's `stop()`, per Leon). The brief's test "Stopped once blocks a second stop" doesn't apply to melee. Each slice instead tests that a melee stop still lands on a unit that is already Stopped, and doesn't set Stopped.
2. **Charge.** The run can be part of Charge (a straight walk at its own AP, which draws opportunity attacks and sets off held shots), or a straight walk earlier in the same turn; both count. With the Reach line, the target's Overwatch, held shot and Keep Back against the runner are cancelled during the run. With no `args.tile`, Charge picks the run with the biggest bonus. The Prone save is a plain Body save at the stop TN.
3. **Feint.** The save TN is the stop TN plus the user's Brain debuff strength. Light adds 2 to that TN. Hook puts on `lowered`.
4. **Draw Cut.** "Hasn't acted this fight" means round 1 and the target comes later in the order than the current turn. "Stowed since the start of the turn" means the weapon was in neither hand when the turn began.
5. **Ambush, Bare.** No roll and no save: within reach, the target is Grappled and Silenced for 1 round. The user gains 2 Momentum and is revealed.
6. **Sweep.** Friendly fire covers every swept tile: all eight adjacent tiles with Heavy. The Reach arc keeps its shape, moved one tile out. Sweep is refused when only allies are in the arc.
7. **Flurry.** With Light, every strike after the first is at −1. Thrown (when the player picks that line) aims at up to 2 targets. One weapon is held, so it lands on the tile of the last target thrown at. Bare leaves a set-up mark (`only: ['bind', 'throw_down']`). Bind makes no attack roll, so only Throw Down's strike actually reads the mark.
8. **Bash, Heavy.** With no opt the target is Dazed; opt `push` pushes it 2 tiles instead.
9. **Sunder.** Once per target per attacker. With Edge, a target with no armour left starts Bleeding instead.
10. **Hamstring, Hook.** The Body save stands and Prone replaces Slowed. Point blocks Sprint and Disengage by pricing them above the unit's AP (see request 4).
11. **Bind.** No attack roll, and it always lands next to you. "No Reach while binding" covers both Bind itself and the binder's strikes while the bind lasts. The move-away save is one Body save per walk. A failed save cuts the walk before the first tile out of reach. Bare becomes today's Grapple only.
12. **Throw.** "Without Thrown" reads the weapon, not the chosen line.
13. **Sidestep.** "Counts as flanking" means `ignoreCover` on the next Strike. "Ignores a carried shield" adds back the shield's `defense_bonus`. The mark is separate from the core's set-up slot.
14. **Guard.** Heavy's "front" is fixed when Guard is taken (toward `args.tile`, else the nearest enemy, ±67.5°), because units have no facing. Reach makes an enemy stepping next to the guard save or be put back on its last tile. A second Guard in one turn is refused. Pressure comes off the Guard resource first (the Defender's filter).
15. **Shove.** It uses `stop()`'s default save, not the old opposed roll. "Prone if blocked" applies only when the first tile is blocked.
16. **Drag.** The pull is coded as 2 tiles with Hook and stops when the target reaches you, so a target 2 tiles away moves only 1. Next to you, Drag defaults to a swap.
17. **Cleave.** Extra targets are enemies next to you (within 2 with Heavy), not allies.
18. **Break.** The Blunt and Hook riders come with the failed save. Blunt's armour 0 lasts until the breaker's next turn.
19. **Run Through.** The behind-strike (Point) happens only when the first strike hits, at half damage, and also ignores armour. The −2 applies to the Reach line with no Point.
20. **Throw Down.** The tile is next to you (within 2 with Heavy); with no tile named, it is the target's own. An occupied tile: the target is slammed into whoever stands there and stays on its own tile. Bare means the slam always hits. A miss without Bare spends the Momentum and keeps the hold.
21. **Parry.** It runs on `damage_in` (phase `reduce`): the damage after armour is halved. A tie goes to the attacker. The shield's +2 applies only with the Heavy line, where the data puts it (see request 6). With Heavy, an ally parries for itself first, and a hit is halved at most once.
22. **Keep Back.** It fires on an enemy's own step from outside your reach to inside it. Forced moves and walks with `skipOW` don't trigger it. It checks the strike is possible before it spends the reaction.

## Missing data keys (fallbacks used)

All of these techniques have `"numbers": {}` in the data today. The code uses the values in brackets:

- charge: min_run (3), per_tile_pct (10), max_pct (50), point_armour (5)
- feint: hit (3), light_save (2)
- ambush: momentum (2), point_crit_min (18), bare_rounds (1)
- sweep: mult (0.7), reach_out (2)
- bash: mult (0.5), heavy_push (2) (bare_ap_less is no longer needed: the line's `ap: -1` is in the data)
- sunder: mult (0.7), lower (5), blunt_hook_lower (10)
- flurry: mult (0.6), strikes (2), light_strikes (3), later_hit (−1), bare_bonus (1), thrown_targets (2)
- hamstring: damage_mult (0.7), slow_rounds (2)
- bind: range (1), penalty (2), heavy_penalty (4)
- half_sword: damage_mult (0.8), armour_ignore (10)
- throw: unthrown_hit (2), unthrown_mult (0.7)
- sidestep: tiles (1), light_tiles (2)
- guard: defense (2)
- shove: range (1), reach_range (2), tiles (1), heavy_tiles (2)
- trip: save_penalty (2)
- drag: tiles (1), hook_tiles (2)
- cleave: adjacent (1), heavy_apart (2)
- break: save_per_momentum (1), stun_rounds (1), armour_rounds (1)
- run_through: per_momentum_pct (20), point_behind_pct (50), reach_no_point_hit (2), pull_free_ap (2)
- throw_down: per_momentum_pct (25), tiles (1), heavy_tiles (2), occupant_pct (50)
- parry: ally_reach (1), shield_bonus (2), halve (0.5), light_momentum (1)
- keep_back: reach_base (1), reach_tiles (2)

## Requests for the lead

1. **`test/phys-core.test.ts`**, "a new character knows the defaults…": the test expects Sidestep to be `NOT_BUILT`. Point it at a technique that isn't built (a ranged one, until B lands), or check `built === true`.
2. **Data:** write the numbers above into `data/techniques.json`, and spec item 932 onward if they are listed there.
3. **Lowered and Disarmed against melee weapons:** `previewAttack` refuses only ranged or non-melee swings. So Feint's Hook (lowered) and Break's Hook (Disarmed) take a melee enemy's weapon in name only. Please confirm, or extend the conditions.
4. **`move_cost` refusal:** add a `ctx.fail` (or similar) that `moveUnit` returns before anything is paid. Hamstring Point would then refuse Sprint and Disengage in words, in place of "Needs N AP". Bind's failed move-away save cuts `ctx.route` in place; a supported `ctx.stopBefore` would be cleaner. Passing an rng on `move_cost` would remove Bind's `boundGame().rng`.
5. **`move_step` undo:** Guard's Reach puts the mover back with `ctx.u.pos = ctx.from` and `ctx.stop`. `moveUnit`'s walk animation and its opportunity-attack check after `move_step` still see the tile it was undone from. A small `ctx.back` flag in `moveUnit` would fix both.
6. **Parry:** should the shield's +2 apply with any weapon, or only with the Heavy line (as built, following the data)? `damage_in` carries no attack roll and no rng: Parry keeps a WeakMap of the `attack_roll` context and uses `boundGame()`. Adding `die`, `toHit` and `rng` to the damage context would remove both.
7. **Reactions can't pick a line:** the glaive (Reach and Hook) always gets Reach for Keep Back. A stored choice per character (for example on `phys.answers`), passed as `args.line`, would fix it.
8. **`canStrike` takes no options:** Keep Back previews a strike on a copy of the Tech to test its reach. An `opts` parameter (reach) would be cleaner.
9. **`setUp` with `only`:** `useTechnique` deletes `u.setUp` whenever any strike hits the marked target (`st.usedSetUp`), even when the mark's `only` list leaves that technique out. A Cut between Flurry (Bare) and Throw Down wastes the mark. `usedSetUp` should respect `only`.
10. **Push previews:** `stop()`'s preview path doesn't record `pv.moves` for a push. Bash calls `forceMove` in preview as a workaround (only when no move is recorded yet). Recording the move in `stop()` would let every push show where it ends.
11. **Old weapon grants still fire next to techniques:** the war axe's armour break stacks with Sunder; the maul's Prone and the servo fist's push fire on Bash, Flurry, Sweep and Charge hits (so Charge's Blunt/Heavy save can't be seen on a maul). This goes away when the old grants are rewired.
12. **The test helper** `physFight({ off })` puts the off hand on the unit only, not on the character. The gear service then has nothing to drop. My Throw off-hand test sets `c.offHand` itself. Consider setting both in the helper. I didn't change it, because the rule for this stage is add, don't change.
13. **Throw Down and Bind** each keep their own reading of a bind: `heldBy` in `finishers.ts` and `isBoundBy` in `strikes-b.ts`. They agree, but folding them into one is a small cleanup.

## What is not tested

- The enemy AI choosing any of the 23 in a real enemy turn. The `ai()` scores exist; only Sweep's is called directly.
- `npm test -w @phc/web` passes, but the client's rendering of the new cards (Bind's penalty, the nail, Draw Cut on the pack pad) is lane C's work and wasn't checked here.
- Charge across jumps or difficult terrain, and Charge's Reach cancelling Keep Back specifically (only the cancelled Overwatch and held shots are tested).
- Draw Cut of a two-handed weapon with the off hand full, of an Evoker blade, and what is written back at the fight's end.
- Ambush (Bare) against a target that is already Grappled, or one immune to Grappled or Silenced.
- Feint's no-Answer mark against Parry and Keep Back (tested only against Riposte).
- Flurry Thrown from the off hand, and a thrown weapon picked up again from the pile.
- The Flurry (Bare) mark adding to an actual Throw Down roll.
- Throw by a companion, and Throw of a two-handed weapon while the off hand is held.
- A Bind whose binder is killed or Downed mid-round.
- Guard Heavy at exactly the 67.5° edge, and Guard Reach against a technique's step.
- Drag's swap or carry cancelled by an item, and a carry that ends somewhere other than beside the user.
- Run Through: a weapon left in from the off hand, and pull-free by an ally (the core's `pullFree` path is tested by the lead).
- Break's armour returning when the breaker is dead or Downed.
- Cleave with a Heavy extra target out of sight.
- Parry with the off hand, by an enemy or companion, or against an opportunity attack or a Riposte. Keep Back against a Hidden mover, against a technique's step, or with a held Overwatch on the same step.

## Checks

- `npm test -w @phc/engine`: 89 files, 2066 passed, 1 skipped, 1 failed (request 1).
- `npm test -w @phc/web`: 641 passed, 2 skipped.
- `npx tsc --noEmit`: clean in `packages/engine` and in `apps/web`.
- `python3 tools/validate.py data`: 0 errors, 0 warnings.
