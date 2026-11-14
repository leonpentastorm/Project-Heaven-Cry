# Survival: the path map as lanes, junctions and one vault (rules 1.48; 13 Nov 2026)

**Why:** Leon saw the first path map (rules 1.40's rows, every node linking to two) and ruled (third batch, binding):
*"when you pick a path usually you need to go straight for several turn before a crossroad or something let you choose
another, not all nodes can go up down another path. Only the first node is the one that can choose every path to go,
this lead to a choice. Also let the engine generate deadends that have strong fight and guard extra treasure chest, 1
per map. Also theme it. Ask the artist."* Spec: `docs/design/survival-spec.md` (third "Settled by Leon" block; rules 7
to 9, 11, 13; sections 3.1, 4.1, 4.3, 8.2, 11.1, 11.4, 11.6). Rules: revision 1.48, items 3500 to 3514. Not live, no
version bump.

## What is built

- **`packages/engine/src/run/map.ts`, rewritten.** 3 or 4 lanes; the camp (before depth 1) opens every lane; a lane node
  has one way forward; junctions merge 2 or 3 neighbouring lanes into one node and split them again; the gate (row 8)
  and the final junction (row 13) meet every lane; row 14 shop and rest; row 15 Boss. Segments (a lane between two
  meeting nodes) are 2 to 4 nodes and take a theme, distinct among siblings and never offering the same set of kinds.
  The guarantees are repaired in a fixed order (every route a shop and a rest before row 14; a shop within 6 of the
  camp and of every junction; the reference route; siblings differ); a draw that fails is drawn again from
  `map#<stage>#<n>` (at most `MAP_DRAWS` 8; more than 95% are first draws, the test holds it). Then the vault's spur:
  `PathMap.spur` holds `vault_guard` and `vault`, off an edge lane node of depths 6 to 10; the guard links to the
  chest, the chest links back to the lane node's next node. New exports: `drawMap`, `MAP_DRAWS`, `segmentsOf`,
  `choicePoints`, `shopAhead`; `PathNode` gains `lane`, `junction`, `seg`, `theme`, `spur`, `from`. Gone (they read
  rows): `stranded`, `shopGapsOver`, `choiceSteps`.
- **The reducer** (`game.ts`): `run/move` enters at once when only one node is reachable (the lean matters only at the
  camp, a junction, the vault's fork); `vault_guard` is a fight (`runFight`, pays as an Elite); `vault` pays credits
  and a pick at `vaultGrade(stage)` through `weaponOffer`'s new `grade` option, then the squad is on the map with the
  lane's next node reachable. The chest is a pick on the map (as the cache), not a place.
- **Encounters** (`run/encounter.ts`): `FightKind` `vault_guard`; `budgetFor` × `VAULT.guard_factor`; a template slot
  `guard: true` takes the setting's `vault_guard` (name, kind, weapon), as `boss: true` takes its Boss. Template
  `vault_watch`.
- **Rewards** (`run/rewards.ts`): `mult` reads any kind a table names (so `vault_guard` and `vault` are data);
  `vaultGrade`; `weaponOffer(…, { grade })`.
- **Data** (`data/survival.json`): `map` rewritten (lanes, junction, junction_kinds, themes, every_route, guarantees,
  shop_gap, vault, words for twelve kinds, expect); `vault`; `rounds/xp/credits/ammo_pack/price_band` rows for the two
  kinds; `settings[].vault_guard`; `nodes.vault`, `tips.vault_guard`, `tips.vault`. Validator block rewritten.
- **The screen:** `apps/web/src/game/PathMap.tsx` (new; RunScreen only mounts it): a 16:9 overland map, the setting's
  backdrop `survival-map-<setting>` or a field chart drawn in code; dashed curved trails, the walked trail solid, the
  open ones lit (animated dash); inked markers (junctions diamonds, the vault's spur outward, the Boss the largest, the
  camp a tent); labels alternate above and below; the legend under the map; the hover card avoids reachable and here
  nodes (`data-tip-avoid`, kept from the merged step 4b). `runView.ts` gives lanes, junction, spur, the theme in the
  hover card. `runIcons.ts` gains `vault_guard`, `vault`, `start`.
- **Art:** the contract in spec 4.3 and `art/README.md`; `tools/build_web_assets.py` emits catalog illustrations
  `survival-map-*`; the artist's batch 7 (prompts 61 to 67: six backdrops and a 13-marker sheet) in
  `art/briefs/GPT-PROMPTS-2026-11-13-survival.md` (its "Read this first" note says it is next and replaces batch 2);
  `ART-REQUESTS.md` S9.

## Built from

| Rule | Primitive |
| --- | --- |
| Lanes, junctions, themes, guarantees, the spur (7 to 9) | system code (`run/map.ts`) on `rngFor` and the loot roller's `rollTable`; no rule primitive (it places nodes) |
| The lean only where the way forks (11) | `reachable` (run/state.ts), `leanWinner` as before |
| The guard's fight | `budgetFor`, `composeEncounter` (a `guard` slot beside `boss`), `startCombat`, the fight-end branch (`nodeXp`, `nodeCredits`, `packCount`, `weaponOffer`) |
| The chest | `weaponOffer` with a fixed grade, `stageCeiling`, `rollProps` (a Relic's property on the cap), `earnCredits`, `RunState.offers` and `run/pick` |
| Back onto the lane | the chest's `links` (no new state) |
| The map's drawing | `runView` (engine data only), `tipProps` / `data-tip-avoid`, the asset map |

**Needs a new primitive:** none. `npm run built-from`: no smells.

## The distribution (1,000 seeds × 5 stages; `SURVIVAL_MAP_REPORT=1 npx vitest run test/survival-map.test.ts`)

| Kind | Map: mean (5%–95%) | Route: mean (5%–95%) | Routes in the spec's range |
| --- | --- | --- | --- |
| fight | 18.34 (13–24) | 5.75 (4–8) | 84.7% in 5–8 |
| elite (and the gate) | 2.88 (2–4) | 1.54 (1–3) | 99.6% |
| shop | 6.14 (4–8) | 2.16 (1–4) | |
| rest | 5.81 (3–7) | 2.04 (1–3) | |
| forge | 2.22 (1–3) | 0.68 (0–2) | |
| training | 2.06 (0–4) | 0.69 (0–2) | |
| shrine | 1.03 (0–3) | 0.39 (0–2) | |
| cache | 1.13 (0–3) | 0.41 (0–2) | |
| event | 0.88 (0–2) | 0.34 (0–1) | |
| vault_guard, vault | 1, 1 | off every route | |
| nodes | 43.5 (38–49) | 15 | |

Shape: lanes 3 or 4 (50/50; 54 or 64 routes); junction rows (with the final, not the gate) 2 in 67%, 3 in 33%;
first-half junctions at depth 3, 4, 5 a third each; segments 2 / 3 / 4 nodes 22 / 22 / 56%; the vault at depth 6, 7,
9, 10 a quarter each. **Income, stage 1:** the reference route about 2,560 credits and 2,500 XP; an average route about
2,720 and 2,750 (level 6); the vault, optional, about +845 credits and +380 XP and a Masterwork. Three example maps
(PHC-0001 to -0003, stage 1) print with the report; the renderer reads left to right (`CMP` the camp, `[...]` a
junction, `GRD>VLT` the spur).

## How to tune it (all `data/survival.json`, PROVISIONAL)

- **Lanes:** `map.lanes` weights. **Junctions:** `map.junction.sizes` (how many lanes merge) and `segment` (a lane's
  run between meetings); the validator refuses a segment band no junction row can split the stretch before the gate
  into. Junction rows are where the band allows (depth 3 to 5 today).
- **What lanes hold:** `map.themes` (each `holds` its kinds in order where placement allows; `fill` weights for the
  rest) and `map.junction_kinds`. Fights per route move most with `junction_kinds.fight` and the fills.
- **Guarantees:** `every_route`, `guarantees` (the reference route's windows), `shop_gap`.
- **The vault:** `map.vault.depths` and `edge` (where); `vault.guard_factor` (its fight), `vault.grade_up` /
  `grade_max` (its weapon); `xp/credits/ammo_pack/price_band.vault_guard` and `.vault` (its pay); the six
  `settings[].vault_guard` (who guards it).
- The 1,000-seed test's bands: `map.expect` (`about`, `tolerance`, `typical_share` 0.75).

## Proof

- `test/survival-map.test.ts` rewritten (13 tests): mapProblems empty on 5,000 maps; same seed same map; first draws over
  95%; fixed rows; one way forward on every lane node, none crossing; every lane from the camp, junction sizes, segment
  lengths, siblings differ; exactly one vault in the middle third on an edge lane, back onto it; every route a shop and
  a rest, a shop within 6 of every choice point, the reference route; reachability; the 'about' bands and 85% of
  routes in 5 to 8 fights.
- `test/survival-vault.test.ts` (new, 5): the camp's leans, one click on a lane, a junction's and the fork's leans; the
  guard's budget and named Elite; the guard pays as an Elite, the chest pays and offers Masterwork in stage 1, back onto
  the lane.
- Step 3's budget test, the seeded-stage and two-stage replay tests: green. They compare two plays to each other and pin
  no hash, so nothing was re-recorded; the maps (and so every seeded run) changed on purpose. The golden tables and
  `replays.json` did not move.
- The tests' `take` helpers (run, stage, progress, shop, give) and `playStage` take a one-way node with one click.
- Browser: `survival` walks stage 2 by clicking the map through a lane, a junction, the vault's fork, its guard, its
  chest and back (seed PHC-0007: its stage 1 has a lane route through a training ground, a shrine, a Forge, a
  crossroads and a rest, and its node 1 is a swarm the pinned shots can reach; a firing line starts unseen and the hand
  fight never got a shot); `room` green.

## Open items and calls for Leon

1. **The gate stays one node every lane passes** (as "fixed as before"), so the stage has three all-lane meetings (the
   camp, the gate, the final junction) besides the small junctions. Leon's "only the first node can choose every path"
   is read as: no ordinary node does. Call made: keep it; the gate is the stage's midpoint.
2. **Row 14 stays a shop and a rest** behind a final junction (row 13), not one camp node that is both: the choice
   stays a choice and both are existing node kinds (spec rule 9e says why).
3. **Every route passes a shop and a rest** costs about 2 more shops and 3 more rests a map than rules 1.40, and the
   reference route's income falls about 10% (average route about 5%). Not compensated in credits; the simulated runs
   (spec 5.6) should measure it.
4. **The stage after the gate has no small junction** (4 rows straight to the final junction): with segments 2 to 4, a
   junction there would leave a 1-node segment. Widening the band to 1 to 4 would allow one.
5. **The vault is a pick on the map**, like the cache, not a full-screen place (the coordinator's "if cheap"): a place
   needs a face and a tab of its own.
6. Names *(Suggested)*: the five roads, the six vault guards, the batch 7 marker motifs.
7. The marker sheet and the six backdrops are wanted (S9); the field chart and line icons stand in.
