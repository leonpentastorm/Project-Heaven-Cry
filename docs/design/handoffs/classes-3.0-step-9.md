# Classes 3.0, step 9: the enemy side of the new systems

13 Nov 2026. Built on the worktree branch `worktree-agent-a8f97c68ea21de99a`, fast-forwarded from
`claude/charming-gauss-hbq4n0` (all four systems merged). Not pushed, no version bump. Spec: **rules 1.37** in
`docs/rules/PHC-Core-Rules-v1.0.md` (section 14 items 2400 to 2412). Data: `data/enemies.json` `ai` (a new top-level
block at the end of the file: behaviour only; no tier row, no level table, no HP or damage number was touched, so it
does not collide with step 7b).

## 1. The inventory (what each spec's section 8 asks of enemies)

| System | Section 8 asks | Before this step | Now |
| --- | --- | --- | --- |
| All | act only on what its side perceives (BUGLIST-0.22 limit) | missing: `perceivedFoes` read every non-Hidden unit | **built** (part 1) |
| Shadow 8.1 | `skulk`: Hide when out of view with no shot, ambush | built (rules 1.32) | kept; **flanking through cover built** |
| Shadow 8.1 | a Boss is never Hidden after round 1 | missing | **built** |
| Shadow 8.2 | with nobody perceived, walk to the last-seen tile and end there | built for Hidden only | **built for anyone unseen** |
| Shadow 8.2 | a Decoy moves the tile | built (op `last_seen`) | read by `knownTile` (unchanged) |
| Shadow 8.2 | hit by an unseen attacker: search toward it | missing | **built** (its side learns the tile) |
| Shadow 8.3 | never one-shot from Shadow | built (rules 1.32, `test/balance/shadow-measure.test.ts`) | unchanged |
| Shadow 8.4 | healer hunt skips the Hidden; a Traced Mender can't hide | built | unchanged (Traced is `always_seen`) |
| Bonds 8 | a Bonded enemy counts its Bonder as the healer; Elite/Boss hunt it; Soldier leans | missing | **built** (`ai.healer_tie`) |
| Bonds 8 | Traced counts as seen | built (P7) | confirmed in the hunt |
| Bonds 8 | enemies do not Bond or Tend | true | **confirmed through data** (test) |
| Figments 2 | the Double's tier table (save, found out) | built (rules 1.34) | **tested through the AI's own choice** |
| Figments 8 | Minions take the nearest thing; Soldiers shoot Figments only with no character in reach; Elites/Bosses ignore them unless Loud or fooled | partial (`owned_weight` only) | **built** (`ai.figments_last`) |
| Figments 8 | a Wall is cover it can break or walk round | missing (only RAISE walls) | **built** (Wall joins `aiClearBlock`) |
| Figments 8 | a Blade's tiles in the route risk | missing | **built** (`ai.held_risk`) |
| Figments 8 | Volatile counts its burst against standing next to it | missing | **built** (same weight, the end tile) |
| Figments 8 | NULL on a Figment weighed at charge × 4 | missing | **not built**: NULL does not unmake Figments (figments-spec rule 12 is not in `sigils.json null.dispel`; weighing a spell that does nothing would be a lie) |
| Figments 8 | a Visualist enemy caster | listed for the enemy casters pass | not built (later) |
| Figments perf | prune the targets an enemy previews | missing | **built** (part 4, section 3) |
| Chaplain 8 | shoot outside a Sanctuary | missing | **built** (`ai.shelter`) |
| Chaplain 8 | wait for the Sanctuary's end | missing | not built (an enemy with only sheltered targets still shoots) |
| Chaplain 8 | a Warded ally is a worse target | missing | **built** (shield layers count as HP) |
| Chaplain 8 | the healer hunt counts Ward as tending | built (Ward goes through `grantShield`) | **tested** |
| Chaplain 8 | the presence is no target | built (not a unit) | unchanged |
| Reactions 8 | don't walk into a held attack it can see | partial (Anchor's opportunity attack only) | **built** for Overwatch / Killzone / a Blade |
| Reactions 8 | no reaction off a reaction; Suppressed: protective only | built (rules 1.28, `react()`) | **tested for an enemy** |
| Reactions 8 | bait the first reaction with the cheapest unit; a Killzone wants two movers | missing | not built (a squad plan; the AI plans one unit at a time) |

## 2. Each behaviour and its test

Tests: `packages/engine/test/ai-perceives.test.ts` (5) and `packages/engine/test/ai-new-systems.test.ts` (22). Every
test is a small scripted fight that asserts the AI's choice (`enemyIntent`, `enemyTurn`, `aiRouteRisk`, `healerMark`)
with numbers read from data; no HP or damage above level 1 is pinned.

**Part 1, perception** (`illusion.ts perceivedFoes`, `combat.ts noteSeenAt / knownTile / enemySearchTile`, the
`on_hit` hook; `kit.ts Who.seenBySide` for the Sigil and Soul planners; `aiClearBlock` reads the known tile):
- the opening: before the first note a side knows every non-Hidden hostile's tile; the first note keeps it
  (`ai-perceives` 1). A call made for Leon (item 2401): every shipped full-size map starts the sides out of sight
  (rules 1.16), so without it no enemy would ever find the squad.
- an unseen character is no target; the enemy walks to the last tile its side saw it on (2); standing on that tile
  with nothing in sight it holds (3).
- hit by an unseen attacker: its side learns the tile and searches toward it (4).
- the spot-back: a spotted Hidden character is a target at once for the whole side (5).
- Sigil and Soul planners count only seen hostiles in an area; `ai-soul.test.ts` three fixtures now give the caster
  vision 40 (their case is "seen, out of reach").

**Part 2, Shadow:** a skulker closes through tiles the character can't see, a plain Soldier walks into the open
(`ai.skulk_open`); a Boss can't hide from round 2 and one placed Hidden is revealed at round 2's start (`tactics.ts`
`hide`, `hideBlock`, `magic.ts applyCond hidden`, a `round_start` hook; `combat.ts bossInTheOpen`); a Hidden character
is not a target.

**Part 3, Bonds:** an Elite and a Boss Bonded to a character take it for the healer (`healerMark`) and turn on it
over a far more hurt one, with the `healer` reason; unbonded the same Elite takes the most hurt; a Minion does not
look; no enemies.json entry carries an Attuner, a Visualizer, a Shadow resource or a door skill, an enemy unit holds
none, and an enemy turn makes no tie.

**Part 4, Figments:** a Minion is fooled by a Double and its attack finds it out (through `enemyTurn`); a Boss is
fooled through one of its turns at most; for each of Soldier, Elite, Boss a character in reach is shot over a nearer
Beast; a Soldier with no character in reach shoots an Eye; a Minion takes the nearest thing (a Beast); a Wall plugging
the only way is attacked; a Blade's reach prices a walk into it (`ai.held_risk`) and not one round it.

**Part 5, the Chaplain:** a Warded target is passed over for an equally hurt one; a target in its side's Sanctuary
the same; a Sanctuary tile is no risk to walk on; a shield given to an ally marks the giver as the healer.

**Part 6, reactions:** an Overwatch holder the enemy sees prices the walk (`ai.held_risk`), none when the hold is off,
none when the holder is Hidden; an enemy can't react inside a reaction; Suppressed leaves `protect` only.

**Part 7, enemies using the doors:** impossible through the data (the test above). What an enemy version would need
(item 2411): a door skill and a focus on the tier row (Attuner, Visualizer), the verbs in the enemy's held items
(they are characters' items today: `tending.json`, `figments.json`, `shadow.json`), a resource row for an enemy
(Shadow), and a planner step in `ai-*.ts` that weighs a Tend, a Bond or a Picture against the weapon (the shape of
`ai-soul.ts`). The `spawn` op is side-blind already.

## 3. The preview cost (part 4): timing before and after

The step 8 probe was not committed; a new throwaway probe (`process.cpuUsage`, 4 characters at Visualization 7 v 7
Soldiers on yard16, the End turn that runs all seven enemy turns, 9 samples each, a fresh fight a sample; the machine
under a load average of 11 to 15; medians):

| Code | no owned unit | twelve Figments | cost of the twelve |
| --- | --- | --- | --- |
| before (`claude/charming-gauss-hbq4n0`) | 69 ms | 100 ms | +31 ms, **2.6 ms an owned unit** |
| after (this branch), run 1 | 77 ms | 83 ms | +5 ms, 0.5 ms an owned unit |
| after, run 2 | 64 ms | 72 ms | +8 ms, **0.7 ms an owned unit** |

Inside the target (about 2 ms an owned unit). The prune: a tier in `ai.figments_last` (Soldier, Elite, Boss) previews
no Figment while a character is in reach (`enemyRank`); behaviour is identical where no Figment is in reach. The probe
is easy to rebuild: a `figFight` with four `{ visualization: 7, visualizer: 'hand' }` characters, three Pictures each
(double, eye, wall), the PCs first in `cb.order`, then time the last PC's `combat/end-turn` (acted by its owner).

## 4. Golden tables and replays

- **Damage, rules, moves, costs, conditions, item-ops tables: no line moved** (`npm run check` green on them). They
  drive single actions, not enemy turns.
- **Replays: all 24 re-recorded on purpose** (`test/golden/replays.json`) after the oracles (`paths-order`,
  `sight-order`, `shared-state`, `phys-dispatch-answers`) passed: every one moves because the opening enemy turns now
  walk toward the squad's known tiles instead of acting on positions they cannot see. Step 7b re-records the same file
  for the scale: do not hand-merge it, re-record on the merged code.
- Test fixtures moved (not rules): `calls.test.ts` seed `CALLS4` (the opening enemy turn rolls differently, and the old
  seed now gave a natural 20 on a save the test needs failed); `sigil14-classes-k.test.ts` reads a critical
  opportunity attack too; `rigger.test.ts` the Blade's Hold test asks for a foe that crossed the Blade's reach (a foe
  that sees the Blade now walks round it when it can).

## 5. Calls made for Leon (also items 2401, 2405, 2410)

1. **The opening** (rules 1.37 rule 2): each side knows every non-Hidden hostile's tile once, after the set-up.
2. **Figments last** reads "Elites and Bosses ignore Figments (weight 0.5 / 1.0)" as "only when no character is in
   reach", the same as the Soldier's rule.
3. **An Elite fooled by a Double** keeps saving at each turn start (the spec table, as built in step 8): it may stay
   fooled more than a turn. The brief's "fooled for a turn at most" holds for the Boss only.
4. **Heard, not seen**: a hit (not a miss) by an unseen attacker tells the side its tile (shadow-spec 8.2 says "hit").
5. **A searcher on the last-seen tile with nothing in sight holds**; it does not sweep further.

## 6. What is left

- NULL on a Figment: first make NULL unmake Figments (`sigils.json null.dispel` gains `figment`, figments-spec rule 12),
  then add its weight to `ai-sigil.ts nullValue` (made charge × 4).
- Reactions-spec 8's squad plan (bait the first reaction with the cheapest unit, two movers into a Killzone) and
  waiting out a Sanctuary: the AI plans one unit at a time; both need a side-level plan.
- A Visualist enemy caster (the enemy casters pass).
- `npm run balance` (the simulator smoke) and `REPLAY_FULL` before the merge: the simulator's fights open out of sight
  on the full-size maps, so its whole-fight numbers move with this step (the lead's to read in step 11).

## 7. Checks at the close

`python3 tools/validate.py data` 0 errors; `tools/engine_catalog.py --check` clean (regenerated); spec tables 0
errors; `npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: **no smells**. `npm run check`: validator, spec
tables, screen data, hooks, both type checks and **the engine tests green (4057)**; the web tests had 20 failures under
a load average of 21 to 29, all timeouts or their cascade: run alone with `--testTimeout 300000` every file passes but
`combat-screen.test.ts`'s first test ("a Shot (Physical 2.0)"), which carries its own 60 s limit and **times out the
same on the base branch's engine** at that load (checked); the other 14 tests of that file pass when it is left out.
Browser suites on port 8891 (`--base`, own server, two at a time): shadow, tending, figments, two-players, coop-stall,
turn-order, combat-fixes, sandbox ALL GREEN; chaplain timed out beside the others (30 minutes, the machine at load 22)
and passed alone (11 checks): a suite that waits too long under load (step 5 noted its waits), not this step's change.
Not run: `npm run balance` (the simulator smoke) and `REPLAY_FULL=1` beyond the record run: before the merge.

## 8. How to add the AI's reading of one more system

1. Find what the AI already weighs: the doctrine (`combat.ts enemyRank`: taunt, standing, Figments last, the most hurt
   with `hurtShare` and `shelterOf`, the healer weight, the likeliest hit), the route (`ai-sigil.ts aiRouteRisk`:
   fields, traps, held attacks), the hunt (`healerMark`), the planners (`ai-sigil.ts`, `ai-soul.ts`), the clearing list
   (`aiClearBlock`).
2. Put its number or list in `data/enemies.json` `ai` (and the type in `data.ts ENEMY_AI`), with a section 14 item.
3. Read only what the enemy's side perceives: `perceivedFoes`, `foesOf(cb, u, { seenBySide: u.side })`, `knownTile`.
4. A test in `ai-new-systems.test.ts` that asserts the choice (`enemyIntent` / `enemyTurn`), numbers from data.
5. Re-record the replays on purpose after the oracles pass, and say which moved and why.
