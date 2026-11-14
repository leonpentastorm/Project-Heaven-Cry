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

## 3. Measured before the fit (rules 1.48's numbers; 6 seeds a cell, stages capped at 5)

The full tables (per stage: Boss won, rounds by kind, HP before a fight, rounds carried, dry / broken / capped, credits
earned with "instead" and sales, spent, XP and level at the Boss, grades, steps, rests, shops, Forges, the vault) are in
`survival-fit/before.md`. A run that cleared stage 5 reads 6 ("capped"); a run whose fight was still on at round 20 with
the squad not far ahead reads where it stopped ("stalled", nearly always a stage 5 Boss).

| Cell | Ends (median, mean ± sd) | Cleared stage 1 / 2 / 3 / 4 | Lost / stalled / capped |
| --- | --- | --- | --- |
| four · gear | 5.7, 5.5 ± 0.6 | 100 / 100 / 100 / 67% | 0 / 6 / 0 |
| four · training | 6, 5.9 ± 0.3 | 100 / 100 / 100 / 100% | 0 / 3 / 3 |
| four · safest | 6, 6 ± 0 | 100 / 100 / 100 / 100% | 0 / 1 / 5 |
| duo · gear | 5.5, 5.1 ± 1.3 | 100 / 83 / 83 / 83% | 1 / 5 / 0 |
| duo · training | 6, 5.7 ± 0.4 | 100 / 100 / 100 / 83% | 0 / 2 / 4 |
| duo · safest | 6, 6 ± 0.1 | 100 / 100 / 100 / 100% | 0 / 1 / 5 |
| solo gunner · gear | 5.4, 5.1 ± 1.4 | 100 / 83 / 83 / 67% | 3 / 0 / 3 |
| solo gunner · training | 6, 6.3 ± 0.9 | 100 / 100 / 100 / 100% | 1 / 1 / 4 |
| solo gunner · safest | 6, 6 ± 0 | 100 / 100 / 100 / 100% | 0 / 0 / 6 |
| solo Sigil · gear | 1.2, 1.3 ± 0.2 | 0% | 6 / 0 / 0 |
| four casters · gear | 2.4, 2.7 ± 1.7 | 67 / 17 / 17 / 17% | 3 / 3 / 0 |

What it showed:
1. **No danger past stage 1.** A squad started almost every fight past stage 1 at 97 to 100% HP and lost under 5% to a
   Boss. Ordinary foes lag the party (Vermin and Minions 3 levels, Soldiers 1 to 2) and a lagging hit is mostly lost to
   level-scaled armour ("hit, 1 damage"), so the budget's ×0.83 a level of lag overprices their pressure; and the
   pressure cap seldom binds anyway (the swarm template reaches 10 foes on 2.2 SE of pressure and takes its bulk as HP
   ×3 to ×6). Only Elites and Bosses threaten, and they stood only min(s − 1, 3) levels up.
2. **Income about twice the plan.** Stage 1: 3,300 to 5,300 a character against spec 11.1's 3,010; stage 2: 9,500 to
   10,000 against 3,861. "Credits instead" of a pick (0.5 of an offer on a price band that rises 1,000 a stage) was
   1,800 of stage 1 and 6,000 of stage 2. The Relic step landed in stage 3.
3. **Levels:** 6 / 9 / 11 / 14 / 17 at the Bosses of stages 1 to 5 on the training and safest routes (spec 5.4: 6 to 7,
   10, 13, 16, 19); the gear route about on plan.
4. **Ammunition:** no gunner ever ran dry (the fewest rounds carried before a fight: 12 in stage 1, 72 or more later,
   the counter keeping five magazines). **Durability:** a weapon broke in stage 4 in several squads and stayed broken
   (section 5).
5. **Casters:** a Sigil caster alone fell in stage 1 every time; four casters in stage 1 or 2, fights of 9 to 13 rounds.

## 4. The fit (every dial, before → after; rules 1.49, items 3600 to 3612)

Candidates were measured on the quick cells (four · gear, four · safest, solo gunner · gear, duo · gear; 3 seeds), then
the chosen one on every cell (4 seeds). Their headline (the candidate tables are not kept):

| Candidate | Four ends | Solo / duo | Kept? |
| --- | --- | --- | --- |
| A: `stage.pressure` 0.35, `instead_rate` 0.1 | 5, 5 | | no: the cap was not what bound (finding 1) |
| B: A + `elite_up` per 2, max 5 | 3.9, 3.10, 4.8; 3.15, 3.8, 3.15 | solo 2.6 to 5.8, duo 3.15 to 5.15 | shape kept; a solo Boss of stage 3 to 4 passed its bulk band |
| C1: per 2, max 3, solo cap 1.5, duo 1.4, `stage.xp` raised | 3, 4, 5, 5 | | no: too easy from stage 4 |
| C2: per 2, max 5, `stage.bulk` 0.45 | 2, 2, 3 | | no: too hard |
| D: per 2, max 4, `stage.bulk` 0.4 | 3.10, 3.15 | | kept, with `stage.bulk` 0.42 for the solo Boss's band |
| D + solo cap 2.0, solo Elite share 0.75 / 0.75 | | solo 2.6 to 3.1 | kept |
| D + duo cap 1.7, duo Elite share 1 / 1, duo Boss damage 0.8 | | duo 3.6 to 4.1 | kept |

| Dial (`data/survival.json`) | Before | After | Why |
| --- | --- | --- | --- |
| `stage.elite_up` | per 1, max 3 | **per 2, max 4** | the only foes that threaten a levelled squad are the ones that keep pace |
| `stage.bulk` | 0.35 | **0.42** | with that lead a solo Boss's required anchor stays inside its bulk band (0.35 passed it in stage 3) |
| `stage.pressure` | 0.15 | **0.35** | the cap rises with the lead, so an Elite further up keeps its escort |
| `pressure_per_char` | [1.2, 1.25, 1.3, 1.3] | **[2.0, 1.7, 1.3, 1.3]** | a small party's Elite was scaled down to the old cap (item 2814) |
| `share.elite`, solo (HP / damage) | 0.7 / 0.55 | **0.75 / 0.75** | solo gunners cleared four stages |
| `share.elite`, duo | 0.9 / 0.8 | **1 / 1** | duos cleared four or five |
| `share.boss` damage, duo | 0.6 | **0.8** | the same; the solo Boss (Leon's 28% / 40%) untouched |
| `rewards.instead_rate` | 0.5 | **0.1** | income back near spec 11.1 |
| `stage.xp` | [1, 0.8, 0.9, 1, 1] | **[1, 1, 1.1, 1.25, 1.25]** | level 20 in stage 6 on the slowest route |

Not moved: `bulk_per_char_round`, `rounds`, `max_foes`, `tiers`, `lag_factor` (a test holds it to the level table),
`stage.credits`, the ladder's prices, the vault's factor, node weights and lane themes.

## 5. Measured after the fit (4 seeds a cell; solo and duo re-run on the final dials)

Full tables: `survival-fit/after.md`.

| Cell | Ends (median, mean ± sd) | Cleared stage 1 / 2 / 3 / 4 | Lost / stalled / capped | Rounds: plain, Elite, Boss |
| --- | --- | --- | --- | --- |
| four · gear | 3.5, 3.4 ± 0.6 | 100 / 75 / 0 / 0% | 4 / 0 / 0 | 4.9, 8.4, 10.6 |
| four · training | 3.5, 4.4 ± 1.6 | 100 / 75 / 50 / 50% | 3 / 0 / 1 | 5, 9.5, 12.6 |
| four · safest | 4, 4.4 ± 0.7 | 100 / 100 / 50 / 0% | 4 / 0 / 0 | 5.3, 9.3, 12.5 |
| duo · gear | 2.5, 3.6 ± 1.4 | 100 / 50 / 50 / 0% | 3 / 1 / 0 | 5.9, 9, 12.9 |
| duo · training | 4, 4 ± 1.1 | 100 / 75 / 50 / 0% | 3 / 1 / 0 | 5.8, 10.6, 10.7 |
| duo · safest | 3.5, 4.1 ± 0.9 | 100 / 75 / 50 / 0% | 2 / 2 / 0 | 6.4, 12.6, 12.6 |
| solo gunner · gear | 1.7, 2.6 ± 1.4 | 50 / 25 / 25 / 0% | 4 / 0 / 0 | 3.7, 5.4, 7.8 |
| solo gunner · training | 3.5, 3.1 ± 0.9 | 75 / 75 / 0 / 0% | 4 / 0 / 0 | 3.2, 6.2, 7.3 |
| solo gunner · safest | 2.5, 3 ± 0.6 | 100 / 50 / 0 / 0% | 4 / 0 / 0 | 3.5, 7.1, 5.2 |
| solo Sigil · gear | 1.1, 1.2 ± 0.2 | 0% | 4 / 0 / 0 | 4, 3, - |
| four casters · gear | 1.5, 2 ± 0.5 | 50 / 0 / 0 / 0% | 2 / 2 / 0 | 8.1, 10.6, 9 |

Against Leon's targets:
- **A squad of four ends in stage 3 or 4:** yes (means 3.4 to 4.4; the gear route, which fights most, ends earliest).
- **Solo viable through stage 1 and into 2:** yes (stage 1 cleared in 9 of 12; ends 2.6 to 3.1); the spread is wide (a
  bad gate ends a solo run).
- **Stage 1 clearable by a careful party most of the time:** every squad and duo cleared it.
- **Level 20 early in stage 6:** level 6 to 7.5 at stage 1's Boss, 9 to 11 at stage 2's, 11.5 to 13.5 at stage 3's, 15
  and 17 at stages 4 and 5 on the training route: level 20 in stage 6 (mid-stage on the slowest route, earlier on the
  gear route). Few runs reach stage 6 now, by design.
- **One grade step a stage with a real choice:** Fine in stage 1 comes mostly by picks and the vault, Masterwork in
  stage 2 by a step (0.4 to 0.9 a character), the Relic in stage 3 on the richer routes and stage 4 otherwise; purses
  end each stage with 1,000 to 3,000 left for kit, trainings and the counter.
- **Nobody runs dry:** no gunner ran dry; the healer's MP and the caster's cores carry the mixed squads.

**Off target, not fixable by a dial** (rules 1.49 item 3609):
1. **Casters alone.** A Sigil caster alone falls in stage 1 (4 of 4) and four casters in stage 1 or 2. Their fights run 8
   to 13 rounds against R 5 to 9: a Line takes turns to draw and its cores run out; an Outburst caster syphons MP in the
   fight. The policies are part of it (single-target damage Lines only, no core rationing: `policies.ts NOT_PLAYED`), and
   so is the doors' sustain over a fight longer than the contract's. Missing: a caster-party measure with better
   policies, or a sustain term for the doors (cores or MP back with the ammunition pack, as rounds are), for the lead.
2. **Durability.** A Standard gun holds 400; in stages 3 to 4 a squad's gun breaks and stays broken: Survival has no
   repair but a grade step (which restores it; after the Relic there is none), and Field Repair needs Proficiency 3 and
   works only in a fight. Missing: **a repair line** (a carried weapon's durability back for credits) at the counter or
   the Forge, one more service through `registerShopService`.
3. **Late slogs.** A fight not finished in 20 rounds and not clearly won (a stage 4 or 5 Boss at its full HP scale)
   ends the simulated run as stalled; Elites run 8 to 13 rounds and Bosses 10 to 13 late (R 6.5 and 9).
- **The vault:** the gear route takes it when it lies on the lane (2 of 4 stage 1s); its prize is mostly a different
  gun the pick policy does not switch to, so it is taken as credits; it adds about 380 XP and 900 credits.

## 6. The guard and the tests

- `test/balance/survival-run.test.ts`, the guard: three seeded solo gunner runs (GUARD-1 to 3, gear route, at most 4
  stages; about 15 seconds): stage 1 cleared on at least two; none clears stage 4; a cleared stage 1 leaves level 5 to 8;
  no gunner starts a fight with no rounds. On the old numbers it failed (a solo gunner cleared four stages).
- Tests that pinned a number of the old curve now read data: `survival-encounter.test.ts` (the lead in `foeLevel`; the
  duo's cap in the worked example) and `survival-stage.test.ts` (the stage-2 lead). The stage-3 band test's second half
  asked that some solo Elite of stage 3 be scaled down to the cap (item 2814): with the solo cap at 2.0 none passes the
  band, so it now asks that stage 3's solo cases exist and stay in band; the scale-down itself is pinned by the
  `anchorDamage` test. Every band check is as before.
- The golden tables and `replays.json` did not move (`Pc.policy` is absent in every recorded replay).

## 7. The close (step 10)

- **The path map fits its frame** (`PathMap.tsx`): the frame is a size container and the 16:9 box is
  `min(100cqw, 100cqh × 16/9)` wide; the vault's spur stays 48 map units inside the box. The suite checks every marker,
  word and the camp inside the frame at 1280 × 720, 1280 × 800 and 1920 × 1080 on stage 1's and stage 2's maps.
- **The `survival` suite** (group `rules`) gained C2 (two browsers walk to a fork; the host's mark shows on the guest's
  map live; one mark each is a tie and goes to the host's) and D (solo: the boon clicked at stage 1's Boss is felt on the
  rifle's card; stages 2 and 3 reached; at a stage 3 Forge the Relic step's three properties offered, one clicked: a
  Relic with it, 6,500 paid). The rifle is made Masterwork and the purse topped up by a test hand-off, as section C's.
- **Docs:** `PLAYTEST-CHECKLIST.md` section S (seven blocks, 75 numbered calls), `CHANGELOG.md` 0.27.0, `ROADMAP.md`,
  `SESSION-HANDOFF.md`, `LOCAL-SESSION-START.md`, `CLAUDE.md` (a Survival paragraph, the repo map), `handoffs/README.md`,
  `SURVIVAL-PICKUP.md` (new); the four `package.json` files and the lockfile at 0.27.0. The balance contract's run-power
  exemption was already in its section 1 rule 6; it now names a test that exists.

## 8. Calls made for Leon

`PLAYTEST-CHECKLIST.md` section S, calls 68 to 75. The one to look at first: **71**, the small parties' shares (a duo's
Elite at full strength, a solo's at three quarters; the solo Boss as you settled it).
