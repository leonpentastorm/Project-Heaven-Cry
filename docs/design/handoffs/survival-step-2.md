# Survival, build step 2: the path map (hand-off, 13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4) rules 7 to 12, section 3.1, section 7 (`map`), section 10 step 2.
Rules: `docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.40**, items **2700 to 2715** (every number PROVISIONAL).
Branch: this worktree's branch, on `claude/charming-gauss-hbq4n0` at 7cd6b8a0. No version bump.

## 1. What was built

| Piece | Where |
| --- | --- |
| `rngFor(seed, key)`: a named seeded stream (spec 4.2 item 3), on `seedFrom` and the existing mulberry32 | `packages/engine/src/rng.ts` |
| `pathMap(seed, stage, data?, setting?)`: a stage's map, pure and deterministic, from `rngFor(seed, 'map#' + stage)` only | `packages/engine/src/run/map.ts` |
| `mapProblems(map)`: every rule of 1.40 the map breaks, in words (empty: none) | same |
| `referenceRoute(map)`: the route that holds a shop in each half, a Forge, a rest, shops never more than six apart (spec 5.4 and 5.6: the simulated party walks it) | same |
| `stranded`, `shopGapsOver`: the two "no dead end" checks; `mapNodes`, `mapPaths`, `choiceSteps`, `crossings`, `nodeId` | same |
| `renderPathMap(map)`: the map as text, Boss on top | same |
| `data/survival.json` `map` (every number), with `provisional: true` | `data/survival.json` |
| Validator block for `survival.json` (it checks the keys present; later steps add theirs) | `tools/validate.py` ("Survival") |
| `data/CONVENTIONS.md` "Survival"; spec section 13's data-files row | |
| `rng.ts` in the hooks catalogue (`tools/engine_catalog.py` PRIMITIVE_FILES), doc comments on its exports; `rollTable` exported from `loot.ts` | `docs/ENGINE-HOOKS.md` regenerated |
| The proof: `packages/engine/test/survival-map.test.ts` (1,000 seeds × stages 1 to 5) | 9 tests, about 17 s; `SURVIVAL_MAP_REPORT=1` adds the report (about 2 minutes: it walks 64 million paths) |

`pathMap` does not read `g.run` or anything else in the game: the run reducer (step 1's builder, `run/state.ts`) calls
it with the run's seed and the stage and stores the result (`g.run.nodes`, spec rule 36). A node is
`{id, depth, col, kind, gate?, links, setting, room: null}` (spec section 9's "must not block" shape; `col` in
half-columns 0 to 6 so every row sits centred; `id` `s<stage>.d<depth>.<i>`).

## 2. Built from

| Rule | Primitive |
| --- | --- |
| Seeded, never a fight's dice (rule 12) | `rng.ts` `seedFrom`, `next`; new `rngFor` (the spec's item 3) |
| The kinds drawn by weight (rule 9) | the loot roller's weighted pick, `rollTable` (`loot.ts`; exported, unchanged) |
| Every number (rows, widths, weights, placement, windows, gap, words) | `data/survival.json` `map`, read once as `MAP_DATA`; the function takes the data as an argument (tests pass variants) |
| Shape, links, placement, guarantees, repair | system code in `run/map.ts` (the spec's `pathmap.ts`; the task named `run/map.ts`): it places nodes and deals no damage, prices nothing, rolls no check |

Needs a new primitive: none beyond `rngFor`. `npm run built-from -- 7cd6b8a0..HEAD`: no smells.

## 3. Where the spec could not be built as written (the lead to rule; rules 1.40 item 2709)

1. **Guarantees (c) and (d) as "every path holds" contradict guarantee (a).** Proof: suppose every path meets a shop
   at depths 3 to 7. Take the deepest node that is not a shop and from which every path ahead meets one. Each of its
   two links leads to a node from which every path meets one; if a link is not a shop it is a deeper such node,
   against the choice; so both links are shops, and a node linking to two shops breaks (a). The same holds for the
   second shop, the Forge and the rest. This is true of every graph where each node has two or more links of
   different kinds, so no weight change helps. Leon's ruling 7 (second batch, binding) is (a)'s "a choice of kinds at
   12 of 14 steps", so (a) stays whole and (c) and (d) give way. **The smallest change, built and flagged
   PROVISIONAL** (rules 1.40 item 7):
   - **the reference route:** at least one route holds all four in their windows with never more than 6 nodes between
     its shops (start and depth 14 counting), which is what the spec's sections 5.4, 5.6 and 11.4 lean on;
   - **no dead end:** from every node before a window opens (`until`), one of its kind inside it lies ahead;
   - **the shop chain:** from the stage's start and from every shop, the next shop is at most 6 nodes ahead on
     some route ("a gunner is never more than six nodes from one" for a gunner who heads for them).
   I first tried the strongest reachable reading ("until the window's last row, one is still ahead"): it is the
   same as "every path", by the proof. `until` is data per window; (3, 9, 6, 8) also holds on every seed (more
   shops and rests: 5.0 and 3.6 a map); (4, 10, 9, 10) fails 3% of maps.
2. **"Links never cross" with two links a node:** between rows of w and w′ nodes, links that never cross number at
   most w + w′ − 1, so two links from each of w nodes need w′ > w: no row could be as wide as the one before. Built:
   a crossing only where a row keeps its width, and then one (an X between two neighbours); the test holds it.
3. **"1 link where the next row's shape leaves only one"** would leave a node without a choice, against (a). Built: a
   half never narrows (rules 1.40 item 2), so every open node has two links within the column rule.
4. **Depth 2's "at most one cache or training"** is exactly one: depth 1's nodes need a second kind under them (a).
5. **The per-path ranges** in section 3.1 ("[5 to 8] fights", "[2 to 3] shops" ...) assumed every path holds the
   guarantees; they are reported, not tested (item 2710).
6. The spec's "its plain fight with the fewest paths through it" alone left some maps unrepaired; a node of a kind no
   guarantee asks for (training, shrine, cache, Crossroads, Elite) may change when no fight can (item 2712).

The spec's rule 9 text and section 3.1's per-path ranges are the lead's to bring in line; this step did not edit the
spec.

## 4. The measured distribution (1,000 seeds × stages 1 to 5 = 5,000 maps; 64,487,424 paths)

`SURVIVAL_MAP_REPORT=1 npx vitest run --root packages/engine test/survival-map.test.ts --silent=false`.
Every map holds every rule of 1.40 (0 of 5,000 fail). "The most one path takes" is the route that seeks that kind.

| Kind | Spec: map (about) | Measured map: mean (5%–95%) | Spec: path | Measured path: mean (5%–95%) | Paths in the spec's range | The most one path takes: mean (5%–95%) |
| --- | --- | --- | --- | --- | --- | --- |
| fight | 15 | 13.84 (9–18) | 5–8 | 4.61 (2–7) | 50.7% | 8.79 (7–11) |
| elite | 4 | 3.42 (2–5) | 1–3 | 1.76 (1–3) | 98.1% | 2.97 (2–4) |
| boss | 1 | 1.00 (1–1) | 1–1 | 1.00 (1–1) | 100.0% | 1.00 (1–1) |
| shop | 4 | 4.52 (3–6) | 2–3 | 1.61 (0–3) | 49.3% | 3.88 (3–5) |
| forge | 3 | 2.90 (1–5) | 1–2 | 0.93 (0–2) | 61.6% | 2.42 (1–4) |
| training | 2 | 3.21 (1–6) | 0–2 | 1.13 (0–3) | 92.4% | 2.72 (1–4) |
| shrine | 2 | 2.22 (0–4) | 0–1 | 0.72 (0–2) | 84.8% | 1.91 (0–4) |
| rest | 3 | 3.18 (2–5) | 1–2 | 1.19 (0–3) | 70.2% | 2.86 (2–4) |
| cache | 2.5 | 3.24 (1–6) | 0–2 | 1.13 (0–3) | 92.3% | 2.73 (1–4) |
| event | 2 | 2.82 (1–5) | 0–2 | 0.91 (0–2) | 95.9% | 2.35 (1–4) |
| nodes | 40 | 40.36 (32–47) |  |  |  |  |

Against the spec: every map count is inside the test's band (about ± 1.5; fights ± 2; nodes ± 3). Training grounds
(3.2 against about 2), caches (3.2 against 2 to 3) and Crossroads (2.8 against 2) run about one high, fights a
little low (13.8 against 15): (a) never lets a node link to two fights, which moves weight off the fights. No
guarantee depends on it; lowering those three weights is the dial if Leon wants the spec's figures (item 2711).

## 5. Three maps (`renderPathMap`, stage 1)

A stroke sits halfway along each link: `/` up and right, `\` up and left, `|` straight up, `X` where two cross. Into
depth 14 every node links to both, so its strokes overlap into a row of `X`. A two-wide stretch is two nodes each
linking to both (the one X a row of the same width needs).

**PHC-0001, stage 1**

```
15                           Boss
                            /     \
14                     Shop        Rest
                   /     X     X     X     \
13         Fight    Crossroads     Fight       Forge
                \     /     \     /     \     /
12               Elite       Fight    Crossroads
                   |     /     |     X     |
11             Training      Fight      Shrine
                   |     X     |     \     |
10               Rest        Cache       Fight
                   |     X     |     \     |
 9               Shop        Fight       Fight
                         \     |     /
 8                           GATE
                            /     \
 7                     Forge       Fight
                         |     X     |
 6                     Fight       Cache
                         |     X     |
 5                     Fight       Shop
                         |     X     |
 4                     Fight       Rest
                         |     X     |
 3                     Fight       Cache
                         |     X     |
 2                   Training      Fight
                         |     X     |
 1                     Fight       Fight
```

**PHC-0002, stage 1**

```
15                           Boss
                            /     \
14                     Shop        Rest
                   /     X     X     X     \
13       Training      Cache    Crossroads     Fight
             |     /     |     X     |     \     |
12        Shrine       Fight       Rest        Forge
             |     /     |     /     |     X     |
11         Fight       Shop        Cache    Crossroads
                \     /     \     /     \     /
10               Cache     Training     Shrine
                   |     X     |     \     |
 9               Fight       Forge       Fight
                         \     |     /
 8                           GATE
                         /     |     \
 7               Shop        Fight       Shop
                   |     X     |     \     |
 6               Cache       Fight     Training
                      \     /     \     /
 5                     Rest        Fight
                         |     X     |
 4                     Elite       Shop
                         |     X     |
 3                     Rest        Fight
                         |     X     |
 2                     Fight     Training
                         |     X     |
 1                     Fight       Fight
```

**PHC-0003, stage 1**

```
15                           Boss
                            /     \
14                     Rest        Shop
                      /     X     X     \
13            Crossroads     Fight       Cache
                   |     /     |     X     |
12               Cache      Shrine       Shop
                   |     X     |     \     |
11               Fight       Elite       Fight
                   |     /     |     X     |
10               Rest        Fight       Rest
                      \     /     \     /
 9                     Fight       Shop
                            \     /
 8                           GATE
                      /     /     \     \
 7       Training      Fight    Crossroads     Fight
             |     /     |     X     |     \     |
 6      Crossroads     Forge       Fight       Elite
                \     /     \     /     \     /
 5             Training      Fight       Cache
                   |     X     |     \     |
 4               Fight       Shop        Fight
                   |     /     |     X     |
 3               Fight       Cache    Crossroads
                   |     /     |     X     |
 2               Fight     Training      Fight
                   |     /     |     X     |
 1               Fight       Fight       Fight
```

## 6. How to add a node kind

1. Its id in `NODE_KINDS` and the `NodeKind` type (`run/map.ts`) and in the validator's `_SV_KINDS` (`tools/validate.py`).
2. In `data/survival.json` `map`: a weight in `kind_weights`, a word in `words`, and any placement (`from_depth`,
   `not_rows`), or a window in `guarantees` if every stage must offer it. Guarantee (b) (never linked to its own
   kind) applies to every kind but `fight` by itself.
3. `npx vitest run --root packages/engine test/survival-map.test.ts` (all seeds must hold) and the report for the new
   counts; add its `about` to `map.expect` from the spec. `python3 tools/validate.py data`.
4. What the node does is not the map's: the run reducer (`run/*` actions) gives it its gain.

## 7. What is open

- The lead's ruling on section 3 (item 2709), and the spec's rule 9 and section 3.1 brought in line.
- `stage.length` (spec section 7, `run`'s key) is the same number as `map.rows`: when step 1 or 3 writes `stage`,
  one should read the other, never a second 15.
- The setting (rule 10) is passed through, not used: every setting draws the same map. The tile's art and faces are
  later steps.
- The path-map screen (section 8.2) reads the nodes' `col` (half-columns, 0 to 2 × (width.max − 1)) and `links`.
- Step 1's builder wires `pathMap(g.run.seed, stage)` into `run/start` and the next tile; `rngFor(seed, nodeId +
  purpose)` is ready for step 3's encounters, offers and stock.
