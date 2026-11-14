# Survival: starting boons, caster boons and the supply pack (hand-off, 14 Nov 2026)

Leon, 14 Nov 2026: *"if caster keep getting wreck, we should give them some boons"*. Design: `docs/design/survival-spec.md`
section 13 (draft 5, rules 48 to 54). Rules: `docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.51**, items **3800 onward**
(every number PROVISIONAL, in `data/survival.json`). Branch: this worktree's, from `claude/charming-gauss-hbq4n0` at
92f51dbb. Version 0.27.0 (no bump: nothing merged; Survival waits for Leon's word).

## 1. What was built

| Piece | Where |
| --- | --- |
| The camp: `run/start` opens the run's state `camp`; each character's starting offer of three; `run/boon` takes one there (its player, or the host for an away player); the host's `run/go` sends the squad on, each character who has not picked taking the first card | `game.ts` (`openCamp`, `takeStartBoon`, `leaveCamp`, `campMags`), `run/state.ts` (`RunPhase` `camp`, the move's refusal) |
| The offer by line: `lineOf` (a focus in hand with its door skill, else the best alpha skill, else the weapon; the second line the weapon if different, else the next alpha skill, else the other weapon line), `startOffer` (2 + 1, never a row twice, filled so there are always three), `startBoonProblem`, `isStartBoon`, `START_BOON`, `CAMP` | `run/stage.ts` |
| The 24 starting boons and six caster boons as `relic` items; the run cap counts them | `data/survival.json` (`start_boon`, `start_boons`, `boons`), `run/power.ts` (`START_BOONS`) |
| The camp's issue: armour fitted to `camp.issue_armour` 3 free at the camp (`fitOf` and `runOptions` at the camp); the gun in hand topped up to `camp.spare_mags` 3 spare magazines | `run/progress.ts`, `game.ts campMags` |
| The supply pack: the cores burnt back (`chargeHeld` before and after the fight, `coresBurnt`, clamped to `cores` x n and `cores_max` x n, x `run_ammo`), the MP share (`supplyMp`), Flux 0 after a run's fight, the loaded core full at a Rest | `run/rewards.ts` (`ammoPack`, `supplyMp`, `chargeHeld`, `coresBurnt`), `game.ts` (`runFight` records the charge, `runFightOver`, `runAmmo`, `runEnter` at a rest), `RunFight.charge` |
| The `rigger` and `mender` kits | `character.ts KITS` |
| The validator: every starting boon a relic on the closed lists, on known lines, worth at most `max_worth`, two rows a line at least, no id in both pools; the offer's counts; the supply pack's and the camp's fields | `tools/validate.py` |
| The screen: the camp, full screen (`CampScreen`, `campView`): three large cards a character (glyph, name, sentence with its number, the line's word in its attribute's ink, worth on the cap), the camp's issue row, the party's marks ("Chosen"), the host's "Go on"; held boons on the path map's squad panel ("Camp" on the starting one, the cap "N of 50"); line glyphs for the starting boons and glyphs for the caster boons | `apps/web/src/game/CampScreen.tsx`, `campView.ts`, `RunScreen.tsx`, `runView.ts`, `boonIcons.ts` |
| The simulator's run policies (the balance pass's policies untouched): `sigilRun`, `outburstRun`, `healerRun`, `rigger`; the camp (free armour, a starting boon by line: +1 to hit, else damage, else the first card); the levers `SIM_LEVERS`; parties `solo_outburst`, `solo_healer`, `solo_rigger`, `mixed`; Figments counted a fight | `test/balance/run-policies.ts`, `survival-run.ts`, `test/helpers/replay.ts` (a policy's own `after`) |

## 2. Built from (and what is new)

| Rule | Primitive |
| --- | --- |
| Starting and caster boons as run power | the `relic` kind (`addItems('relic')`), `c.relics`, the item-op runner; ops `roll_mod`, `damage_mult`, `cost_mod`, `use`, `resource`, `mend`, `mend_mult`, `grant_ap`; triggers `attack`, `to_hit`, `dealing`, `taking`, `cost`, `glyph_cost`, `reload`, `acted`, `combat_start`, `round_start`, `damaged`, `kill`, `heal`, `shield`, `heal_given`; predicates `damage`, `melee`, `actor`, `target`, `actor_within`, `self_has`, `self_skill`, `action`, `how`; number blocks `skill:` and `event:`; limits `per_combat`, `per_turn` with `key` and `peek` |
| The cap | `worthOf`, `capRoom`, `runWorth`, `BOON_CAP` |
| The pick at the camp | `run/boon` and the `r.boons` offer state; the host's `run/go`; `rngFor` |
| The offer by line | `holds`, `FOCUS_DOOR`, `SKILL[...].attribute`, `isGunId`, `WEAPON` |
| Caster boons in the Boss's pool | `boons` rows with `doors` and `pools` (`boonOffer`, `boonServes` unchanged) |
| The supply pack | `ammoPack`, `packCount`, `ammoMult`; `coresCarried`, `evoChargeNow`, `carriesVisualizer`, `maxMp`, `mpNow`; `CORE_CHARGE`, `VIS_CHARGE` |
| The camp's issue | `fitOf` / `run/fit` (price 0 at the camp), `armourGateWhy`, `armourCap`, `magazineWorth`, `packAdd` |

**New primitives: none.** `npm run built-from -- 92f51dbb..HEAD`: two advisory smells, no lint fails: `runAmmo`'s MP
written on the character (out of a fight there is no unit to `pay` or `refund` through; `applyRest` and `beginSession`
write it the same way) and none other. Lint baselines unchanged. `docs/ENGINE-HOOKS.md` regenerated.

**Two fixes found on the way** (rules 1.51 item 3):
1. A `heal` or `shield` trigger's holder is the healed unit unless `if` names the target; Deep Well (a Boss boon) and the
   Gentle property named only `actor: self`, so they strengthened only the heals a character gave itself. They now name
   `target: any`, as Gentle Hands and Shelter do.
2. A run's fight tally missed the opening turn (its `turn` effect is emitted as the fight begins, before the tape
   exists), so a blow with no source on that turn (a Sigil's) was credited to nobody. The tape now starts with it.

## 3. Proof

(filled at the close; see section 7)

## 4. The measure (before and after)

`packages/engine/test/balance/survival-run.ts`, stages capped at 5, the steps 9-10 cells (3 routes x seeds SIM-1 to 4)
and the caster cells. **Before** is this branch with `SIM_LEVERS=none` (rules 1.50's run: the balance pass's caster
policies, no supply share, no camp armour, the starting boon taken off; it reproduces survival-steps-9-10.md's solo
gunner exactly: 2.6, 3.1, 3.0). **After** is every lever on. Stage-1 clears are of 12 runs (4 a route) unless named.

| Cell | Before | After | Target (spec 13.7) |
| --- | --- | --- | --- |
| Solo gunner: stage 1 cleared; mean end (gear, training, safest) | 9 of 12; 2.6, 3.1, 3.0 | 11 of 12; 2.8, 3.0, 3.4 | within ±1 of 9; means ±0.3: **over by one** (see below) |
| Solo gunner, 12 seeds a route (SIM-1 to 12) | 28 of 36; 2.4, 3.6, 3.1 | 32 of 36; 2.9, 3.6, 3.5 | +1.3 a 12 |
| Solo Sigilist | 0 of 12; 1.2, 1.4, 1.2 | **3 of 12**; 1.3, 1.7, 1.8 | 7 of 12: **missed** (13.9.3) |
| Solo Channeler (Outburst) | 2 of 12; 1.5, 1.6, 1.7 | **9 of 12**; 2.7, 3.1, 2.8 | 7 of 12: met |
| Solo healer (the Mender's policy) | gear 0 of 4, 2 stalled | 8 of 12; 3.7, 3.1, 2.8; **5 of 12 stalled** | stalls at most 2 of 12: missed |
| Solo Rigger | gear 0 of 4 (no Figment ever) | 4 of 12; a Picture in **89 of 89** fights | pictures in 80%: met |
| Four casters, gear: stage 1 / reach stage 3; median end | 2 of 4 / 1 of 4; 1.7 | 3 of 4 / **2 of 4**; 2.7 (mean 4.1, two capped at stage 5) | half reach stage 3: met; median 3.0: just under |
| Mixed (gunner, Sigil, Outburst, healer), gear | not measured | 4 of 4 clear stage 5 | stage 1 in 10 of 12: met (4 of 4) |
| Squad of four (gunner, Faith rifle, Sigil, healer): mean end | 3.4, 4.3, 4.4 (rules 1.50) | 3.7, 4.2, 3.9 | stage 3 or 4: met |
| Duo (gunner, healer): mean end | 3.6, 4.0, 4.1 (rules 1.49) | 4.5, 4.0, 3.6 | stage 3 to 4 |

**One lever at a time** (solo, gear route, SIM-1 to 8; stage 1 cleared of 8, mean end):

| Levers on | Sigilist | Channeler |
| --- | --- | --- |
| none (rules 1.50) | 0, 1.2 | 0, 1.4 |
| + the run's policies | 0, 1.2 | 0, 1.4 |
| + the supply pack | 0, 1.2 | 0, 1.4 |
| + the camp's armour (class 3) | 0, 1.4 | **5**, 2.8 |
| + the starting boon | 0, 1.5 | 5, 2.8 |
| + the caster boons | 0, 1.5 | 5, 2.8 |

The armour is the lever (as the diagnosis found: casters took 14 to 19 damage a round in class 1). The supply pack and
the policies move nothing at stage 1 on their own (the policies' worth shows in the squads: the duo's gear route 3.6 →
4.5); the caster boons come after a Boss, so a stage-1 measure cannot see them.

**The forced cell** (spec 13.7: each starting boon forced on its line's build, gear, SIM-1 to 8; stage 1 cleared of 8):
gunner Zeroed 7, Hot Loads 7, Quick Magazine 7 (5 with none); Sigilist Steady Line 0, Bright Script 0, Quick Chalk 1;
Channeler Clear Pulse 5, Hot Blood 5, Second Breath 4. No row dominates its line by more than a run in eight.

**The fit: no dial moved.** Two targets are missed and one is over, and none of them has a dial the rules allow:
1. **The gunner (+2 of 12 on the spec's cells, +1.3 a 12 over 36 runs).** The forced cell shows why it is not the
   boons' size: Quick Magazine (a first reload at 0 AP, about nothing in a 3-round fight) lifts the gear route from 5
   to 7 of 8 exactly as Zeroed does. Any change to a turn moves the seeded dice that follow it, so a different boon,
   or none, deals the run a different hand; at 4 seeds a route that is two runs. The rule says shrink every row
   together if it moves past noise; a +1 to hit cannot shrink, and the change is the dice's, so nothing was shrunk.
   Call 93 for Leon.
2. **The Sigilist (3 of 12).** As the design foresaw (13.9.3): no resource fix moves it (it never ran short of cores),
   and its own rows forced give 0 to 1 of 8. Growing the Sigil rows alone is forbidden by the rule; the gap is the
   Line at Brain Power 1 to 3. Recommended: a Sigil fix at levels 1 to 5 against the balance contract, in its own
   revision (call 82).
3. **The healer stalls (5 of 12).** A healer alone deals a third of a gunner's damage (rules), so a long fight past its
   heals runs to round 20; the run's policy no longer heals at 75% HP (it fell from 80% of turns to the low-HP ones).
   No dial: the Mender's damage is the class's, measured in Classes 3.0.

The guard (`survival-run.test.ts`, in `npm run check`) is unchanged: its bands (a solo gunner clears stage 1 on two
seeds of three, never stage 4, levels 5 to 8 after stage 1, never dry) hold on the new numbers.

## 5. Calls made for Leon

`docs/PLAYTEST-CHECKLIST.md` section S, calls 80 to 93 (the spec's section 13.9 built as recommended, and the
builder's: Vigil spent by the first prayer of any kind; the gun and melee to-hit rows on the attack; heals given to
anyone for Deep Well and Gentle; the simulator's run policies; 93, the gunner's +1.3 a 12 left as the dice's).

## 6. Open

- The design's Sigil policy points not built: area words against three or more foes in a lane (a level 1 Sigilist knows
  FIRE and SEEK only; the area words come later), and "draws close" (the Line is still walked from where the caster
  stands, as the balance pass's policy does).
- The Outburst policy's Steady at one under the Strain limit and its Syphon rule are the balance pass's.
- The camp's backdrop is the rest's (pending art, so the plain gradient shows); ART-REQUESTS S10.
- The creation screen's kit step does not yet list the `rigger` and `mender` kits (the canvas-built screen data; paused
  until v1.0): they exist in the engine for the simulator and for a sheet that names them.
- The camp shows no Movement cost for the class it fits (the number is the armour's own rule; the gear card shows it).
