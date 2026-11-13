# Survival, build steps 7 and 8: generated fight maps, drawn from the setting's kit (hand-off, 13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4) rule 22, sections 4.2 item 6 and 4.3, section 10 rows 7 and 8. Rules:
`docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.45**, items **3200 to 3216** (every number PROVISIONAL). Revision 1.44 is
left to the step built beside this one. Branch: this worktree's, from `claude/charming-gauss-hbq4n0` at 71750004, with
`origin/art/survival-ahoc-review-2026-11-13` merged in. No version bump; nothing deployed.

## 1. What was built

| Piece | Where |
| --- | --- |
| The art branch merged: six kits of 36 pieces (216), 24 backdrops, portraits, node scenes, gear follow-ups. Two conflicts (the prompts file's "Read this first" note, both sides kept; `art/checksums.sha256`, both sides kept then regenerated) | merge commit 3eb0300e |
| The layout generator: `generateLayout(recipe, rng, setting)` (stamps turned and mirrored, loose cover near the starts, through the middle and up to the share, in runs; barrels, props, difficult patches, a hazard patch; a loose blocker that seals a pocket taken away; a skin), `layoutProblems(rows, recipe, starts?)` (the checks, in words), `zonesOf`, `squadStartTiles`, `turnStamp`; types `LayoutRecipe`, `LayoutStamp`, `MapSkin`, `GeneratedLayout` | `packages/engine/src/maplayout.ts` |
| The encounter uses it: `layoutRecipe(size, setting, template, rng)`, `encounterMap(…, rng, {setting, template})` on the node's own stream `node + '#map'`; `layout.use` the switch, the cropped open ground kept as the switch's other side and the fallback; starts never on a blocker, hazard, trap or hole | `packages/engine/src/run/encounter.ts` |
| `MapDef.skin` (spec item 6); `layoutMap` keeps the legend's other objects (low walls, barricades, doors, terminals…); a map object may say `open` (a door) | `packages/engine/src/combat.ts` |
| Data: `layout` (the numbers, the legend's extra characters, fifteen stamps), each setting's `layout` (stamps, cover kinds, hazard and chance, props, kit), each template's `hazard` | `data/survival.json` |
| Validator: the layout block, the stamps' shape and characters, every setting's stamps, cover, hazard, props and kit folder, the templates' `hazard` | `tools/validate.py` |
| The kit catalog: section `kit` of `art/catalog.json`, one entry a piece (`kit-<setting>-<piece>`: setting, piece, kind, the object it draws, size, the delivery's id, status, `use` and why), written by `tools/art/kit_catalog.py` (four pieces held back, its `HOLD`) | `tools/art/kit_catalog.py`, `art/catalog.json` |
| The art checks: `validate_map_kits` (ids, paths, sizes by kind, kinds, the use flag, every PNG catalogued); the ground seam check | `tools/validate_art.py`, `tools/art/kit_seams.py` |
| Web assets: `kit-<setting>-<piece>` (pieces at 128 px, the container 192 × 128; grounds at 512 px in four quarter turns `-r0..-r3`); a held piece is not built | `tools/build_web_assets.py` |
| The renderer: `kitLayout(map)` (once per map: per tile its ground, wall layers by neighbours, doorway or breach, decals, dressing, the door's turn), `wallLayers`, `kitSprite`, `kitGround`, `kitTileBg`, `kitArt`, `setKitAssets` (tests) | `apps/web/src/game/kitMap.ts` |
| Wiring: the ground through the tile's background (the same door as a campaign's painted map, `paint`), the kit layers first in the tile (under every highlight, token and effect), dimmed with the fog; `spriteOf` falls back to the kit's sprite by kind; a broken kit piece is drawn whole; a door turns with its doorway; "ROUGH" is not written over a rubble decal | `apps/web/src/screens/combat.js`, `screens/shared.js`, `templates/combat.template.html` (one `sc-if` line) |
| Tests: `test/survival-layout.test.ts` (engine), `src/game/kitMap.test.ts` (web), browser suite `kit-map` (group rules) | |
| Docs: rules 1.45, the spec's rows 7 and 8 and item 6 marked built, ART-REQUESTS S7 (S4 on the branch; renumbered at the merge), the prompts file's note, `docs/ASSET-DIRECTORY.md` (a kit section, by hand: the file has no generator), `docs/ART-INTEGRATION.md`, `docs/ENGINE-HOOKS.md` regenerated, `apps/web/e2e/README.md` | |

## 2. Built from

| Rule | Primitive |
| --- | --- |
| A seeded map, the fight's dice untouched (1.45 item 1) | `rngFor(seed, node + '#map')`, `next` (`rng.ts`) |
| Start zones, the enemy line (item 2) | `deployEnemy`, `startGap`, `MAP_LIMITS`, `map_size.squad_cols`; `squadStartTiles` (the encounter's old sort, moved so both read one list) |
| Stamps, cover, props, hazards (items 3 to 5) | the maps legend (`readLayout`, `maps.json legend`), `objects.json` kinds (`blocks_move`, `cover`, `hazard`, `trap`, `door`), `layoutMap`, `defaultObjects` |
| The checks (item 6) | `readLayout`'s errors, `startGap`, `MAP_LIMITS`; a breadth-first walk (4 neighbours) |
| Starts never on a blocker or hazard (item 8) | `standable`, `keyOf`, `OBJ`, `nearestFree` |
| The skin (item 9) | **new** `MapDef.skin` (spec 4.2 item 6) |
| Drawing (items 10, 11) | the tile's background (`paint`, beside `tileBg`), `spriteOf` / `spriteStyle`, the memoised tiles (`<sc-for memo>`), `vis.tiles` and `litAt` for the dim, `art/catalog.json` + `npm run assets` (`ART`) |

**New primitives:** `MapDef.skin` (the spec's item 6), the generator and its checks (the spec's "new code that is the
system itself"), a map object's `open` (a general field: any map may now open a door at the start). Nothing deals damage,
heals, prices an AP or rolls a check.

**`npm run built-from -- 71750004..HEAD`:** one smell, `apps/web/src/game/protodata.json` "a rule's number typed in a
client file": the screen data built from `data/*.json` by `design/canvas-build/build.py --web` (it now carries the
layout block); generated, not typed.

## 3. The measured numbers (`SURVIVAL_LAYOUT_REPORT=1`, 1,000 seeds × 11 templates × 3 sizes, settings turning)

| Size | Maps | Fell back | Tries (mean, max) | Stamps | Cover share (min–max) | Walls | With a hazard |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 16 | 11,000 | 0 | 1.04 (3) | 1.16 | 8.7% (8.2–12.1) | 3.6% | 706 |
| 20 | 11,000 | 0 | 1.04 (3) | 1.93 | 8.4% (8.0–10.5) | 3.7% | 658 |
| 26 | 11,000 | 0 | 1.06 (4) | 3.22 | 8.3% (8.1–11.2) | 3.6% | 670 |

Every one of the 33,000 maps passes every check; hazards appear only on the templates that allow them. The encounter's
own starts (200 seeds × 11 templates × 3 sizes with every slot's spawn) are never on a blocker, hazard, trap or hole and
every foe is 10 or more tiles off. Step 3's budget test is green unchanged (`test/survival-encounter.test.ts`).

**The ground seam check** (`python3 tools/art/kit_seams.py`; the join a repeat makes against the texture's own grain;
above 2.0 reads as a seam): 16 of 18 clean. **AHOC `ground-2`**: left-right band step **2.81** (top-bottom 0.83);
**shrine `ground-2`**: top-bottom band step **3.32** (its octagon rows lose their step: seen in the 4 × 4 sheet). The AHOC
grounds' one-pixel join is 1.6 to 1.9 times the grain (painted to match); the other five settings' first and last
columns are identical (a doubled column: invisible). Both seamed grounds are held back; a map rolled onto one draws the
kit's first ground that has art.

## 4. How to add things

- **A template:** its row in `templates` as step 3's hand-off says, plus `"hazard": true` if its maps may hold a hazard
  patch. Then `npx vitest run --root packages/engine test/survival-layout.test.ts` (1,000 seeds; ~1 minute).
- **A stamp:** one entry in `layout.stamps` (rows 3 to 7 a side, one length; `#` wall, `~` difficult, `.` kept clear,
  a space left as it is, any legend character an object; `d` an open door), and its id in a setting's `layout.stamps`.
  A wall line's gap must have open tiles on both sides (the doorway check). `python3 tools/validate.py data`, then the
  layout test.
- **A setting's kit:** the 36 pieces under `art/sprites/kit/<setting>/` by the brief's names; the setting's
  `layout.kit` names the folder (or `"pending"`); `python3 tools/art/kit_seams.py --sheet <dir>` (every ground clean),
  `python3 tools/art/kit_catalog.py`, `python3 tools/rehash_art_checksums.py`, `python3 tools/validate_art.py`,
  `npm run assets`. A missing piece needs nothing: the fallback draws there.
- **A piece kind:** its name in `kit_catalog.py kind_of` and `validate_art.py KIT_KINDS`; where it draws, one branch in
  `kitMap.ts kitLayout` (a layer for the tile) or `kitSprite` (an object's sprite). Hold a bad piece back with a line in
  `HOLD` (its reason), not by deleting it.

## 5. Proof

- Engine: `test/survival-layout.test.ts` (5 tests and the report), `test/survival-encounter.test.ts` (the budget, green
  unchanged), `test/survival-run.test.ts`, `test/run-state.test.ts`, `test/old-save.test.ts`.
- Web: `src/game/kitMap.test.ts` (4 tests: walls by neighbours, doorway and breach, decals, dressing, the ground, the
  fallback per piece).
- Browser (port 8991, `python3 tools/e2e.py --base http://127.0.0.1:8991`): `kit-map` 20 of 20 ( three AHOC fights; the ground, wall and doorway pieces, kit sprites, tokens
  above, a hover leaves the kit alone; **the fallback pixel compare**: the map with a kit that has no art is byte for byte
  the map with no skin, the pictures taken once the grid is still), `survival` 26 of 26. **`survival.mjs` changed:** its hand-fought node 1 lost (33 and 90 rounds) because the Shot's first target stood behind a wall of the generated map and the loop only ended turns; it now aims at each standing hostile by clicking its tile until Confirm is enabled, as a player does (no check weakened).
- `tools/validate_art.py` clean (map kits: 216 pieces, 6 settings, 4 held back); validator 0 errors.
- Screenshots (1280 × 720, deviceScaleFactor 2, the grid alone):
  `/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/kit/kit-map-1.png`,
  `…/kit/kit-map-2.png`, `…/kit/kit-map-3.png`; the fallback pair `…/kit/kit-map-kit-without-art.png` and
  `…/kit/kit-map-no-skin.png`.

## 6. What the screenshots showed (looked at, 13 Nov)

Walls join across tiles (the pieces reach over the 2 px grid gap and the tile borders), corners turn the right way, the
room stamps read as rooms with clear gaps, cover and objects sit on the ground, the fog dims the kit with the tile. Still
rough: (1) the 2 px grid lines cut the ground into squares (the spec's "darkened under the grid"; a gap of 0 would need
the camera's tile pitch changed); (2) cover tiles keep their brown tint and the "HALF 30" line over the sprite (kept: the
HP is information); (3) the container is drawn shrunk into one tile (the engine's container is one tile; S7 asks for a
one-tile piece); (4) the solid tile shows darkened ground beside the half-tile wall band, which reads as the wall's
shadow (Leon's "half a tile is ok").

## 7. Open items

- The **foe spawns** of step 3 are kept; on a 20 or 26 map a `back` spawn can stand 16 tiles off (the check is on the
  zones' gap, 10 to 14, and the foes' minimum, 10).
- **Closed doors** never start a fight (item 3204): the enemy's AI does not open doors yet.
- **Breaches** (`wall-broken`) draw only where rubble lies in a gap; no stamp puts rubble there yet.
- The **backdrop** behind the map (spec 4.3's table, last row) is not drawn: the combat screen has no layer for it.
- `npm run check` now runs the 33,000-map test (~40 s of its engine suite) and step 3's encounter test generates maps
  for its 96,000 fights (~1 minute together).

## 8. Calls made for Leon (each reversible)

1. Doors a stamp places stand open (item 3204).
2. Hazards on seven templates, not on a swarm, a rush, an ambush or two Elites (item 3207).
3. Half cover in straight runs of 1 to 3 (item 3205): single crates over 8% of a 26-tile map read as noise.
4. Two small rooms in five settings' stamp lists, so every kit's corner and T are used (item 3203).
5. Four kit pieces held back (item 3215); a seamed ground falls back to the kit's first good ground, not to flat tiles.
6. The browser suite is `kit-map`, not the spec's `layout` (that name is the combat panels' suite).
