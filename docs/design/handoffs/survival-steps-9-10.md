# Survival, build steps 9 and 10: simulated runs and the fit; the close (hand-off, 14 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4 and the three "Settled by Leon" blocks) sections 5.5, 5.6, 10 rows 9 and
10, 11.1, 11.4 to 11.6. Rules: `docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.49**, items **3600 onward** (every number
PROVISIONAL). Branch: this worktree's, from `claude/charming-gauss-hbq4n0` at b55eb416. Version 0.27.0 (bumped here,
nothing deployed; Survival waits for Leon's word).

## 1. What was built

| Piece | Where |
| --- | --- |
| The run simulator: a party plays a whole run through the one reducer (`run/start` … `run/tile`, `levelup/*`, `gear/*`), fights by the balance simulator's policies (`Rec.fight`), and the run is measured | `packages/engine/test/balance/survival-run.ts` (new) |
| The tables (a headline line a cell, then per stage) | `packages/engine/test/balance/survival-run-report.ts` (new) |
| The guard (in `npm run check`: three seeded solo runs, generous bands) and the measure and tables (opt-in) | `packages/engine/test/balance/survival-run.test.ts` (new) |
| The reference builds' levelling as one exported function (`spendLevel`, `takePerks`), used by `buildCharacter` unchanged and by the run simulator | `packages/engine/test/balance/builds.ts` |
| A recorder's character may be played by another policy than its build's (`Pc.policy`; absent in every recorded replay, so no hash moved) | `packages/engine/test/helpers/replay.ts` |
| The healer policy (`healer`: a held Outburst played out by the policy that began it; Mend on a wounded ally, else the Heart Bolt; a Mend held with no ally in sight goes on the healer) | `survival-run.ts` (registered in `POLICIES`) |
| The fit: rules revision 1.49, items 3600 onward; `data/survival.json` dials (section 4) | `docs/rules/PHC-Core-Rules-v1.0.md`, `data/survival.json`, `docs/design/survival-spec.md` (5.4, 5.6, 11.1, 11.6) |
| The path map fits its frame: the 16:9 map sized to the frame both ways (a size container), the vault's spur kept inside the map's box | `apps/web/src/game/PathMap.tsx` |
| The `survival` suite: the map's fit at three sizes on two maps; C2 a lean and a tie at a fork (two browsers); D a boon felt, stages 2 and 3, the Relic step at a stage 3 Forge with its property pick | `apps/web/e2e/survival.mjs`, `apps/web/e2e/README.md` |
| The docs, the checklist's section S, CHANGELOG 0.27.0, the version | see section 7 |

## 2. The simulator: what its players do, and how to run it

Every choice is a player's; every rule, price and number is the engine's. In order, for each node:

- **Points:** every level's Skill and Attribute points by the build's plan, the class the rules give at level 3, perk
  steps by the build's preference: `builds.ts spendLevel`, the same code that makes the reference builds.
- **Fights:** the build's fight policy (`policies.ts`; the gunner `gunner`: Bursts, Bead, Brace; the Sigil caster
  `sigil`; the Faith rifle `faith`; the healer above), through `Rec.fight`, 20 rounds at most. A fight still on at
  round 20 whose standing squad holds more than twice the standing foes' HP is counted won (the simulator's room is a
  test room, so `run/skip` ends it) and marked **capped** (it is nearly always one hidden foe the policies never hunt);
  any other fight still on at round 20 ends the run as **stalled**.
- **Lanes:** where the way forks, the stretch ahead of each choice (to its next junction) is scored by the route
  policy: **gear** (Elites, Forges, caches; takes the vault), **training** (training grounds, shrines, rests; passes the
  vault), **safest** (rests and shops, fewest fights; passes the vault); a squad under 55% HP takes the stretch with the
  nearest rest.
- **Spending** (spec 11.5), at each shop and Forge: upkeep first (magazines or rounds to five magazines' worth and at
  least 120 rounds for the gun in hand; four cores for a Sigil or Figment user; class restocks), selling the weapon a
  better pick replaced; one grade step on the door's item (the gun in hand, else the focus) when affordable, at a Forge
  if one is still ahead this stage, else at the shop; the next armour class at a Forge in stages 1 and 2; a mod for a
  free slot and a worn piece for an empty slot (cheapest first, fitted at once); from stage 3, nothing but upkeep until
  the Relic step is paid. Loose rounds are loaded into magazines after every fight (free out of a fight).
- **Elsewhere:** a rest's small training for the door (study for the Sigil caster, practice for the Outburst, Devotion
  for the Faith rifle, drill on the gun in hand); a training ground's big one, and the second when the purse holds a
  grade step besides; a shrine's token when it fits the cap, else the rite, else the piece; a Crossroads' off-books step
  when no step was afforded this stage, else walk on.
- **Picks:** a weapon that is the door's item graded higher (the same id, or the same category and calibre at no lower
  price with a magazine no smaller) is taken and equipped (the old one sold at the next shop); else the credits. An
  Elite's or a cache's kit: a mod for a free slot or a better worn piece, fitted; else nothing. Boons: the most worth
  that fits. The next tile: the first offered.

Parties: `solo_gunner` (the plain gun build), `solo_sigil`, `duo` (gunner and healer), `four` (gunner, Faith rifle,
Sigil caster, healer), `four_casters` (Sigil, Outburst, Rigger, healer). All start at level 1 from the reference builds'
creation sheets and their kits.

```
cd packages/engine
# the measure: cells "party:route", seeds SIM-1 … SIM-n, at most SIM_MAX_STAGES stages (a run that clears it is "capped")
SURVIVAL_SIM=1 SIM_CELLS=four:gear,solo_gunner:gear SIM_SEEDS=6 SIM_MAX_STAGES=5 SIM_OUT=/tmp/runs.json \
  npx vitest run test/balance/survival-run.test.ts -t measure
# the tables of one or more files
SIM_REPORT=/tmp/runs.json npx vitest run test/balance/survival-run.test.ts -t tables
```

A squad of four to stage 5 takes about a minute alone, two to three on a busy machine; split the cells over four
processes (the fit's measures did: about 15 minutes for 90 runs).

MEASURED
