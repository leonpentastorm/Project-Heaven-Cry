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
| All | review fixes (below) | | `phys-melee-review.test.ts` (25) |

The lead's references (Lunge, Cut, Coup, Riposte) are unchanged. The six slices merged without conflicts. Merging the base caused import conflicts in `openers.ts` and `answers.ts`; I kept both sides.

### Changes after merging the base (359bf96: "the core services the other 48 techniques need")

The base now provides several things the slices had worked around. I moved the slices onto the core versions:

1. **Draw Cut.** The core now draws (`needs.stowed`, `args.item`, the reducer's gear service). It checks and previews the technique as if the weapon were held, then draws it for free. I removed the slice's own draw (`melee/draw.ts` is deleted). The handler only checks "stowed since the start of the turn" (a `turn_start` listener records the hands) and runs the Edge and Light lines. A character holding a gun can now Draw Cut a stowed blade, and the gun goes into the pack. The tests pass `item` (a pack index), and the pad test reads Draw Cut from `packPad`.
2. **Run Through.** The Pin is now the core's nail: `stop(t, tgt, 'pinned', { untilAp: pull_free_ap, weapon })`. It holds until the unit, or an ally next to it, spends 2 AP (`combat/pull-free`; the enemy AI frees itself, and physView shows it). The slice's own pullFree and its automatic payment at turn start are gone. With the Reach line and opt `leave`, the weapon stays in the target (`loseWeapon(t, null)`, recorded on the nail) and drops into the pile on the target's tile when it is pulled free. This answers the slice's request about linking the pile to the Pin.
3. **Throw and Flurry's Thrown line.** Both now use the core's thrown strike (`strike({ thrown: true })`): a ranged attack at throwing range with line of sight and cover, aimed with Dexterity, which gives Pressure on a hit and Momentum to a melee technique. They also use `loseWeapon(t, tile)` (the reducer's own drop). I removed the slices' hand-rebuilding code (`letGo`, `leaveInPile`) and Throw's own Dexterity term. One consequence: the card no longer lists "Dexterity, not the weapon's skill" as a separate term, because the core swaps the attack bonus itself. The test now compares the to-hit at Dexterity 8 and at Dexterity 2.
4. **Sidestep and Drag.** `stepUser` now takes options in place of a label. The step is the engine's own move: free, with no opportunity attacks, and traps and held shots still fire.
5. **Bash's Bare line.** The data now carries `ap: -1`, so the slice's `lineDiscount` does nothing and the core charges the right cost. The pad shows it too.

### Review fixes (the confirmed findings of the lane review)

Each has a regression test in `test/phys-melee-review.test.ts` unless noted.

1. **Riders follow the unit really struck (`r.target`).** Charge (Prone), Bash (save, Daze, push), Sunder (armour, once-per-target key), Hamstring (Slowed, Prone, lame mark), Sweep (Edge bleed), Flurry (Bare mark), Break (boss check, save, Stun/Daze, armour, Disarm), Run Through (pin, weapon left in, the unit behind) and Keep Back (halt; the walk stops only if the mover itself was stopped) now read `r.target || tgt`. Tested with an `attack_target` redirect for Bash, Sunder, Hamstring, Break, Run Through and Charge.
2. **Charge.** Naming the user's own tile strikes from there after the run already walked (no run on, the technique's AP alone); with no run of 3 behind it the refusal says so. The run is recorded for every unit whatever it holds, so a run walked with a rifle counts once a sabre is drawn.
3. **Feint** reads the user's Brain debuff strength with `unitDebuff` (a foe's tier or caster block; players unchanged).
4. **Flurry (Bare).** The +1 a hit now lands where Bind and Throw Down roll: Bind's Bare grapple save and Hook Brain save are that much harder (Bind then spends the mark itself, since it never strikes), and a Bare Throw Down makes the occupant's Prone save harder. (A non-Bare Throw Down still gets it as +1 to hit.) Helpers `setUpBonus` and `spendSetUp` are in `melee/shared.ts`.
5. **Bind.** A Bound unit's walk with nothing left to walk after the cut is refused, not paid for (the price is put out of reach, as Hamstring's; request 4), so a Sprint keeps its 2 AP and its once a turn. A failed move-away save stands for the rest of that unit's turn, so a free refusal can't be retried for a fresh roll. A walk that keeps some tiles still goes as far as it can.
6. **Throw** refuses only weapons that are part of the body (fists, beast_bite). Knuckledusters, gauntlets and the servo fist can be thrown (−2, ×0.7) and land in the pile.
7. **Shove** is today's Shove again: d20 + Strength + Raw Power against 10 + the target's better of Raw Power and Athletics (as `combat.ts` `shove`), then the push or Prone through `stop()` with no second save. The preview rolls nothing and lists that number as the target's save. Momentum only when the target really moved or went Prone: a push an item cancels (Siege Engine) gives none and logs "holds its ground". (Reading 15 is replaced.)
8. **Guard.** +2 Defense against melee from anyone, an ally's swing included. With Reach, a mover put back on its tile no longer draws an opportunity attack for leaving a reach it never left (a `reaction_window` listener cancels it). The put-back is skipped for Drag's swap step and onto any tile someone now holds, so a swap next to a Reach Guard never leaves two units on one tile.
9. **Drag.** A swap is refused for a user who can't step (Prone, Grappled, Pinned, nailed), as the carry already was. The swap now runs each tile's Sigil zone and hazard for both units, as a walk does.
10. **Run Through.** A weapon left in a target (Reach, `leave`) falls into the pile on its tile when the target is Downed or killed (an `on_downed` listener in `finishers.ts`).
11. **Throw Down.** The occupant is struck at half of the slam, Momentum included (as Run Through's behind-strike); `phys-melee-finishers.test.ts` updated.
12. **Break (Blunt) and Sunder.** While a Break holds the armour at 0, Sunder works on the armour the target will have back (the break's saved cut), so the mend restores the sundered value; Edge's "no armour left" reads that armour too.

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
7. **Flurry.** With Light, every strike after the first is at −1. Thrown (when the player picks that line) aims at up to 2 targets. One weapon is held, so it lands on the tile of the last target thrown at. Bare leaves a set-up mark (`only: ['bind', 'throw_down']`) on the last unit really struck. "+1 to the next Bind or Throw Down" is read as +1 to the save each forces (Bind: the grapple or Brain save; Bare Throw Down: the occupant's Prone save), because Bind rolls nothing and Bare Throw Down always hits.
8. **Bash, Heavy.** With no opt the target is Dazed; opt `push` pushes it 2 tiles instead.
9. **Sunder.** Once per target per attacker. With Edge, a target with no armour left starts Bleeding instead.
10. **Hamstring, Hook.** The Body save stands and Prone replaces Slowed. Point blocks Sprint and Disengage by pricing them above the unit's AP (see request 4).
11. **Bind.** No attack roll, and it always lands next to you. "No Reach while binding" covers both Bind itself and the binder's strikes while the bind lasts. The move-away save is one Body save per walk. A failed save cuts the walk before the first tile out of reach. Bare becomes today's Grapple only.
12. **Throw.** "Without Thrown" reads the weapon, not the chosen line.
13. **Sidestep.** "Counts as flanking" means `ignoreCover` on the next Strike. "Ignores a carried shield" adds back the shield's `defense_bonus`. The mark is separate from the core's set-up slot.
14. **Guard.** Heavy's "front" is fixed when Guard is taken (toward `args.tile`, else the nearest enemy, ±67.5°), because units have no facing. Reach makes an enemy stepping next to the guard save or be put back on its last tile. A second Guard in one turn is refused. Pressure comes off the Guard resource first (the Defender's filter).
15. **Shove.** Today's opposed roll (see review fix 7), then `stop()` with no save. "Prone if blocked" applies only when the first tile is blocked. Momentum only when it really moved the target or put it Prone.
16. **Drag.** The pull is coded as 2 tiles with Hook and stops when the target reaches you, so a target 2 tiles away moves only 1: the Hook line's "2 tiles" is inert (request 16). Next to you, Drag defaults to a swap.
17. **Cleave.** Extra targets are enemies next to you (within 2 with Heavy), not allies.
18. **Break.** The Blunt and Hook riders come with the failed save. Blunt's armour 0 lasts until the breaker's next turn.
19. **Run Through.** The behind-strike (Point) happens only when the first strike hits, at half damage, and also ignores armour. The −2 applies to the Reach line with no Point. With Reach and `leave`, "until someone pulls it out" is read as the core nail rule (the target, or an ally next to it): the wielder can't pull its own weapon back (request 17). The weapon drops into the pile when the target is pulled free, Downed or killed.
20. **Throw Down.** The tile is next to you (within 2 with Heavy); with no tile named, it is the target's own. An occupied tile: the target is slammed into whoever stands there and stays on its own tile; the occupant is struck at half of the slam, Momentum included. Bare means the slam always hits. A miss without Bare spends the Momentum and keeps the hold.
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
3. **Lowered and Disarmed against melee weapons:** `previewAttack` refuses only ranged or non-melee swings. So Feint's Hook (lowered), Break's Hook (Disarmed) and Bind's Hook (Disarmed) take a melee enemy's weapon in name only; Bind is range 1, so its targets are almost always melee. The data's Disarmed is `forbid weapon_attack`: while Disarmed (or lowered), a melee-mode attack with anything but fists should be refused or fall back to fists. This belongs in `combat.ts` for every source of the condition, not in melee/.
4. **`move_cost` refusal:** add a `ctx.fail` (or similar) that `moveUnit` returns before anything is paid. Hamstring Point would then refuse Sprint and Disengage in words, and Bind's refused walk would say "Bound by X: you can't move away", both in place of "Needs N AP". Bind's failed move-away save cuts `ctx.route` in place; a supported `ctx.stopBefore` would be cleaner. Passing an rng on `move_cost` would remove Bind's `boundGame().rng`.
5. **`move_step` undo:** Guard's Reach puts the mover back with `ctx.u.pos = ctx.from` and `ctx.stop`. The wrong opportunity attack is now cancelled from melee/ (a `reaction_window` listener), but `moveUnit` still pushes the undone tile into `seg` and `tileSight`, so the walk animation, Overwatch and heart Overwatch still see it. A `ctx.back` flag on `move_step` (moveUnit restores the position, pops the tile, skips the opportunity, Overwatch and heart-Overwatch checks for that step) would fix it in one place.
6. **Parry:** should the shield's +2 apply with any weapon, or only with the Heavy line (as built, following the data)? `damage_in` carries no attack roll and no rng: Parry keeps a WeakMap of the `attack_roll` context and uses `boundGame()`. Adding `die`, `toHit` and `rng` to the damage context would remove both.
7. **Reactions can't pick a line:** the glaive (Reach and Hook) always gets Reach for Keep Back. A stored choice per character (for example on `phys.answers`), passed as `args.line`, would fix it.
8. **`canStrike` takes no options:** Keep Back previews a strike on a copy of the Tech to test its reach. An `opts` parameter (reach) would be cleaner.
9. **`setUp` with `only`:** `useTechnique` deletes `u.setUp` whenever any strike hits the marked target (`st.usedSetUp`), even when the mark's `only` list leaves that technique out. A Cut between Flurry (Bare) and Throw Down wastes the mark. `usedSetUp` should respect `only`.
10. **Push previews:** `stop()`'s preview path doesn't record `pv.moves` for a push. Bash calls `forceMove` in preview as a workaround (only when no move is recorded yet). Recording the move in `stop()` would let every push show where it ends.
11. **Old weapon grants still fire next to techniques:** the war axe's armour break stacks with Sunder; the maul's Prone and the servo fist's push fire on Bash, Flurry, Sweep and Charge hits (so Charge's Blunt/Heavy save can't be seen on a maul). This goes away when the old grants are rewired.
12. **The test helper** `physFight({ off })` puts the off hand on the unit only, not on the character. The gear service then has nothing to drop. My Throw off-hand test sets `c.offHand` itself. Consider setting both in the helper. I didn't change it, because the rule for this stage is add, don't change.
13. **Throw Down and Bind** each keep their own reading of a bind: `heldBy` in `finishers.ts` and `isBoundBy` in `strikes-b.ts`. They agree, but folding them into one is a small cleanup.
14. **An ambush made by a technique isn't the engine's ambush.** Draw Cut's Light line ("counts as an ambush") and Ambush when the Hidden entry's ambush is already spent fake it with `strike({ mult: ambushMult, critMin: 19 })`. The target's Ambush damage taken (`ambushTaken`, from Reaction Speed, up to 60%), Always Up, Ghost Soldier and the sneak-attack penalty all read `rc.ambush` / `src.ambush`, which only `resolveAttack`'s own `ambushReady` sets, so they are skipped. Please add `ambush?: boolean` to `StrikeOpts`, pass it to `resolveAttack` (`const ambush = (ambushReady(att) || !!opts.ambush) && tgt.side !== att.side`; only a Hidden ambush sets `att.ambushUsed`), and show it in `previewAttack`. melee/ would then call `strike(t, { ambush: true })` in both places and drop the manual multiplier and critMin. Known gap until then.
15. **Shove through `stop()`:** core `stop()` logs "X is pushed" and returns true even when `forceMove` moved 0 tiles (a `forced_move` cancel). Shove now checks the position itself, but every other push through `stop()` (Lunge Heavy, Bash Heavy, Keep Back) has the same false "pushed" line. `stop()` could use `forceMove`'s return for 'push'.
16. **Drag Hook "2 tiles" is inert.** The farthest reach is 2 and a pull stops beside you, so a pull never moves more than 1 tile with or without Hook. Pick one: (a) Hook gives Drag 2-tile reach without Reach (Hook pulls from 2 away, Hook + Reach from 3 away); (b) reword the line to "from 2 tiles away" and drop `hook_tiles`; (c) the 2-tile pull may carry the target past you onto the tile behind. (a) is a one-line change in `links.ts` once chosen.
17. **Run Through (Reach) "until someone pulls it out":** `pullFree` lets only the target or its allies pull. Please let any unit next to a target whose nail carries a weapon pay the 2 AP (a non-ally takes the weapon into a free hand, else it goes to the pile), and add the exception to spec rule 13. Also: a nailed weapon is now dropped on a Down or death from melee/, but a surrender, or a fight that ends with the unit still nailed, doesn't drop it; that belongs with `pullFree` in `combat.ts`.
18. **Effective armour under a Break:** the war axe's `armour_break` grant (`combat.ts`, `t.baseArmour ??= t.armour`) and a gear armour change (`game.ts`) during Break's window work from the broken 0, which is then mended over. An exported `effectiveArmour(u) = u.armour + (u.tech?.break?.cut ?? 0)` (and a setter) used there would close it; Sunder already does this inside melee/.
19. **Drag's swap as a walk:** the swap writes both positions and runs the tiles' zones and hazards by hand. A lead-owned two-unit move in `combat.ts` would keep the order identical to a walk.

## What is not tested

- The enemy AI choosing any of the 23 in a real enemy turn. The `ai()` scores exist; only Sweep's is called directly.
- `npm test -w @phc/web` passes, but the client's rendering of the new cards (Bind's penalty, the nail, Draw Cut on the pack pad) is lane C's work and wasn't checked here.
- Charge across jumps or difficult terrain, and Charge's Reach cancelling Keep Back specifically (only the cancelled Overwatch and held shots are tested).
- Draw Cut of a two-handed weapon with the off hand full, of an Evoker blade, and what is written back at the fight's end.
- Ambush (Bare) against a target that is already Grappled, or one immune to Grappled or Silenced.
- Feint's no-Answer mark against Parry and Keep Back (tested only against Riposte).
- Flurry Thrown from the off hand, and a thrown weapon picked up again from the pile.
- The Flurry (Bare) mark adding to an actual Throw Down roll.
- Throw by a companion, and Throw of a two-handed weapon while the off hand is held. Throw of the emanator gauntlet or the servo fist (only knuckledusters are tested).
- A Bind whose binder is killed or Downed mid-round. A Bound unit's Disengage (only Sprint is tested), and a partial walk that keeps some tiles.
- Drag's swap onto a hazard or a Sigil zone (the code runs them; no test builds one). Keep Back's redirect path (`r.target` differs from the mover).
- Run Through's weapon dropping on a Down that is not a death (only a kill is tested).
- Guard Heavy at exactly the 67.5° edge, and Guard Reach against a technique's step.
- Drag's swap or carry cancelled by an item, and a carry that ends somewhere other than beside the user.
- Run Through: a weapon left in from the off hand, and pull-free by an ally (the core's `pullFree` path is tested by the lead).
- Break's armour returning when the breaker is dead or Downed.
- Cleave with a Heavy extra target out of sight.
- Parry with the off hand, by an enemy or companion, or against an opportunity attack or a Riposte. Keep Back against a Hidden mover, against a technique's step, or with a held Overwatch on the same step.

## Checks

After merging the base at its latest (`29a06d6`, the core services' "thirteen fixes from the second review"):

- `npm test -w @phc/engine`: 90 files, 2100 passed, 1 skipped, 1 failed: the lead's `phys-core.test.ts` expects Sidestep to be `NOT_BUILT` (request 1).
- `npm test -w @phc/web`: 647 passed, 2 skipped.
- `npx tsc --noEmit`: clean in `packages/engine` and in `apps/web`.
- `python3 tools/validate.py data`: 0 errors, 0 warnings.

**With that base merge:** Run Through's own `on_downed` hook is gone. The base's `dropNailed` (in the reducer's death sweep and at the fight's end) now drops a weapon left in a target, keeping the item itself (rarity, name, durability). My test for it now kills the target through the reducer, not `useTechnique` directly, so the sweep runs.
