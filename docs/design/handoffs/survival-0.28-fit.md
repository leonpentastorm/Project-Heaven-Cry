# Survival 0.28: XP, trainings and the fit, measured (rules 1.54 items 9 and 10; 14 Nov 2026)

Branch `feature/0.28-numbers` (Lane C). Spec: `survival-spec.md` 14.4, 14.5; Core Rules items 4112 to 4116.

## 1. What changed

| `data/survival.json` | Before | After |
| --- | --- | --- |
| `xp.base`, `xp.per_depth`, `xp.boss` | 100, 22, 2 | **10, 2, 5** |
| `stage.xp` | [1, 1, 1.1, 1.25, 1.25] | **[1, 2.6, 4, 4, 4.5]** |
| `train` drill, study, practice, devotion | 100, 3, 5, 2 | **200, 5, 8, 4** |
| `training` drill, study, practice | 300, 8, 10 | **400, 10, 15** |
| `shrine.rite` (new key; was `patrons.json gain.rite_kept` 4, the campaigns keep it) | 4 | **10** |
| `pressure_per_char` (the fit) | [1.3, 1.7, 1.3, 1.3] | **[1.3, 1.7, 1.3, 0.9]** |
| `share.elite` HP / damage (the fit) | [0.75, 1, 1, 1] / [0.6, 1, 1, 1] | **[0.75, 1, 1, 0.8] / [0.6, 1, 1, 0.8]** |

All PROVISIONAL. The shared `xp_total` is untouched.

**The training bar:** each `run/train` option (`runOptions`) carries `bar: {from, now, add, to, reaches, mark}`, and
the place card (`placeView` cards) lifts it as `bar` (null on other cards). It is read from `drillMarks` and
`drillOf`, `sigilGrowthView`, `practiceOf` with `picksAt` and `nextPickAt`, and `devotionXpOf` with `devotionThreshold`
and `GATE`. `mark` is the next step in words ("Mark I at 300: the <weapon>'s signature move, <technique>"; "A new Sigil
word at 6"; "Devotion 4 at 70 XP"). The screen draws it; no screen is changed on this branch.

## 2. Levels by route (stage 1; `SIM_LEVELS=1 npx vitest run test/balance/survival-run-levels.test.ts`, 400 maps)

| Route | Fights (mean) | XP at the Boss's door | Level at the door | Level 3 reached at | Level after the Boss |
| --- | --- | --- | --- | --- | --- |
| most fights | 9.4 | 241 (148-300) | 2: 58%, 3: 42% | depth 12: 10%, 13: 32%, the Boss: 58% | 3 |
| typical | 7.3 | 180 (98-235) | 2 | the Boss | 3 |
| fewest fights | 5.3 | 131 (46-204) | 1: 13%, 2: 87% | the Boss (99%) | 3 (99%) |

Over all 23,510 routes: level 3 before the Boss on 4.5% (never before depth 12); still level 2 after the Boss on
0.03%. The run simulator agrees: every cleared stage 1 ends at level 3 (139 of 139), then 4 to 5, 6 to 7, 8 to 9, 9 to
11. Parties now arrive at stage 1's Boss at level 2, against 4.5 to 6.3 before.

## 3. How far parties get (6 seeds a cell, stages capped at 5; ends = stage + depth / 15, mean)

| Cell | Before 1.54 (old XP) | 1.54, unfitted | 1.54, fitted |
| --- | --- | --- | --- |
| four · gear | 3.7 | **1.6** | **3.4** (12 seeds; 3.0 and 3.9) |
| four · training | 3.6 | **3.1** | **3.8** (12 seeds; 3.8 and 3.8) |
| duo · gear | 2.8 | 2.1 | 2.1 (no move) |
| duo · training | 4.4 | 4.0 | 4.0 (no move) |
| solo gunner · gear | 2.5 | 2.2 | 2.2 (no move) |
| solo gunner · training | 3.6 | 3.0 | 3.0 (no move) |
| solo Sigilist · gear / training | 1.5 / 1.8 | 1.3 / 1.7 | the same (no move) |
| solo Channeler · gear / training | 1.5 / 1.9 | 1.9 / 1.6 | the same (no move) |

The targets: a squad of four ends in stage 3 or 4 (fitted: yes); solo in stage 2 or 3 (the gunner: yes, unfitted).
The solo casters were short of it before 1.54 too (Balance 2.0). The fit touches only a party of four's entries, so
the solo and duo runs are the same runs (the simulator is seeded). A party of three is not measured; its entries are
unmoved.

**The candidates** (four only unless named; 6 seeds): pressure [1, 1.3, 1, 1]: four 2.0 / 4.3, solo gunner 3.3 / 4.2
(too strong alone: not kept); four's pressure 1.0: 2.0 / 4.3; with four's Elite share 0.8: 2.9 / 3.9; 0.65: 2.6 / 4.4;
pressure 0.8 and Elite 0.8: 4.5 / 5.3 (too easy); **pressure 0.9 and Elite 0.8: 3.0 / 3.8, seeds 7 to 12: 3.9 / 3.8
(kept)**. A duo at pressure 1.5 went 2.7 / 4.0; reverted, the duo is not a target.

Where the unfitted four fell (gear): stage 1's plain fights and Elites at levels 1 and 2 (4 Soldiers at depth 5 from
71% HP; the Elite at depth 6 or 10), and the vault's guard. This answers spec 14.6 (3): stage 1's fights had to ease, for
the squad of four.

## 4. Tests

- `survival-progress.test.ts`: the shrine reads `SHRINE.rite`; a new test reads each training card's bar through
  `placeView` and moves it with `run/train`.
- `survival-encounter.test.ts`: an Elite's cost reads the four's Elite share from data.
- `balance/survival-run.test.ts` (the guard), with the measured reason: a cleared stage 1 leaves level 3 (was 5 to 8);
  at most one of GUARD-1 to 3 clears stage 4 (GUARD-1 now does; the solo spread is wide: 1.1 to 4.x on 6 seeds).
- `balance/survival-run-levels.test.ts` (new): level 3 never before depth 12; from the Boss on 99% of routes.
- `balance/survival-run.ts` records each fight's levels; the report prints the level arriving at each Boss.

## 5. Open

- Level 3 before the Boss comes on 42% of most-fights routes, not all (spec 14.4 says "depth 12 or 13" for that route).
- The solo Sigilist and Channeler stay in stage 1 to 2 (as before 1.54; Balance 2.0).
- The trades (`ev.drill_yard` 300 drill, the wayside's 4 / 5 / 5) were not moved with the trainings.
