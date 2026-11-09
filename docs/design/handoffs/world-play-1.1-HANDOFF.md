# World Play 1.1 hand-off (rules revision 1.9: piles, reload choices, gear in a fight, drop tables)

Branch `feature/world-play-1.1`, 9 Nov 2026, built in five parts (A1–A5). Design: `docs/design/world-play-1.1-spec.md`
(Leon's accepted direction). Rules: `docs/rules/PHC-Core-Rules-v1.0.md`, "Rules revision 1.9: World Play 1.1" in World
Play, the AP table, Hands 2, Swapping weapons, Reloading, "Magazines and rounds are inventory", and section 14 items
**671–700** (every number provisional). Decision **106**. Not merged, not deployed: the CHANGELOG entry and the version
bump belong to the merge into `develop`.

Why: in the playtest rangers ran out of ammo. Dropped magazines were a 10 px "▪" nobody saw, the fight's floor vanished at
the end of every fight, an area-map reload deleted the magazine, the fight write-back lost and double-counted magazines,
and enemies dropped nothing. Leon's direction: make the ground visible and shared by every map, give the ranger a choice
when reloading, let gear change in a fight from a backpack, and let fights drop loot the engine rolls.

## What was built

| Part | Commit | What |
| --- | --- | --- |
| A1 engine, spec, data | `8660e73` | Piles (one `pile` map object a tile, exact pack items, merged, capped at 24), `cb.floor` retired (old saves convert), Pick up a selection on any map (1 AP), speed and tactical reloads, piles persisting across fights, zones and saves, pile fog, hidden piles, the Narrator's `ground[]`, `mag:`/`rounds:` in `loot[]`, click-paths around revealed hazards, the write-back bugs |
| A2 engine, spec, data | `9d43fbf` | Gear in a fight at 1 AP a hand (`gear.ts`; `combat/equip`, `combat/stow`, `combat/drop`, `combat/swap`), light armour 1 AP, heavy armour refused, the rebuild, `offHand.loaded`, Disarmed |
| A3 engine, spec, data | `c2de0d5` | Drop tables (`loot.ts`, `data/loot_tables.json`): rolled once per death into the death tile's pile; three layers; caps; boss notable; campaign `loot_tables`/`drops` |
| A4 web | `4611e26` | Piles drawn on the grid, the area map and the minimap; the Pick up checklist; both reloads in the panels; the path preview's hazard marks; the pick-up float |
| A5 web, Narrator, Proving Ground, docs | this part | The combat backpack; Hold the Evoker removed; the Narrator's `ground[]`, `drops`, pickup, compact piles and wiki; the Proving Ground's pile tool; the docs |

## Contracts

**Data.**
- `data/objects.json` kind `pile`: open, never blocking, and `spot { detect_tn 12, detect_range 2 }`.
- `data/world_play.json`:
  - `ap.pickup` 1;
  - `pile { max_entries 24, narrator_entries_per_turn 6, narrator_items_per_pile 12, rounds_max 120, route_slack_tiles 2, tactical_reload_extra_ap 1 }`;
  - `gear { hand_ap 1, two_handed_draw_ap 2, swap_hands_ap 1, put_away_ap_per_hand 1, drop_ap 0, light_armour_ap 1, light_armour_max_kg 1.2 }` (provisional).
- `data/loot_tables.json`: the caps, the worn range, the rolls by tier, kind→table, five tables and 20 personal effects.
- `data/rules.json` actions:
  - `reload_tactical`, `pickup`;
  - `draw`, `draw_two_handed`, `swap_hands`, `put_away`, `drop_held`, `light_armour`, `fit_mod`.
- `tools/validate.py` checks all of it.

**Engine actions.**
- In a fight:
  - `combat/pickup {unitId, tile, take?}`: `take` is entry keys or indices; none means everything;
  - `combat/reload {unitId, tactical?}`;
  - `combat/equip {unitId, item, to: main|off|worn}`: `item` is a pack index or an id;
  - `combat/stow {unitId, slot}`;
  - `combat/drop {unitId, slot: main|off}`;
  - `combat/swap {unitId, from?, mod?, to?}`.
- On the area map: `world/act` with `act: 'pickup' {tile | objId, take?}` and `act: 'reload' {tactical?, hand?}`.
- Proving Ground: `sandbox/pile {at, items, hidden?}`, only while gearing up, the same path as `ground[]`.
- `gear/equip`, `gear/unequip` and `gear/mod` in a fight forward to the combat actions.

**Engine helpers the UI uses.**
- `containers.ts`:
  - `isPile`, `pileAt`;
  - `pileEntries(o)`, the checklist's entries;
  - `itemLabel` ("Rifle magazine 7/24", "38 × .32 Decrkm");
  - `PILE`, `PICKUP_AP`.
- `gear.ts`:
  - `gearPlan(c, op)`, the cost before Hot-Swap and the refusal;
  - `gearCost(cb, u, c, op)`, the price the reducer will charge (Hot-Swap and the AP check included; it changes nothing);
  - `hotSwapLeft`, `isLightArmour`, `HEAVY_WHY`, `DOWN_WHY`.
- `combat.ts`:
  - `weaponActions(u).reload.tactical {ap, why}`;
  - `reloadBothAp`;
  - `routeHazards(cb, u, to) → {route, tiles, crosses}`.
- `loot.ts`: `cleanDrops`, `rollDeathDrops`, `LOOT`, `LOOT_TABLES`.

**Views.**
- A player sees a pile only on a tile the party can see now. Hidden piles are never sent.
- Caches still show a count only.
- `drops` on NPCs and units, and the fight's `lootTables`, are stripped from every player view. `combat.lootLog` (what the cap held back) goes to the host only.

**The AI Narrator** (`apps/web/src/narrator/context.ts`).
- Turn fields, all optional and enum-free, so the tool never changes during a session:
  - `ground[] {at, items[] (the loot shape plus mag:/rounds:), hidden}`: at most 6 a turn, 12 items each;
  - `drops` on `combat.enemies[]` and on `npcs[]`: `{table}` or `{items}`, at most 4. A plot item written the `loot[]` way (item `""`, a name) is kept.
- `pickup` is among the `actions[]` acts.
- `pile` isn't one of its `objects[]` kinds. An `objects[]` place of kind `pile` is still read as a ground entry.
- The rules text says the engine rolls what the dead drop.
- The turn prompt lists piles under OBJECTS ON THE MAP as one ON THE GROUND line: at most 6 piles, 3 entries each, "+N more".
- The wiki has `loot:rules` and `loot:<table>`.
- The combat_end report already carries "X drops: …" lines.
- Prompt budget: the faith-context stable estimate is about 24376 of its 24400 ceiling. Anything more in the stable blocks needs a trim elsewhere.

**The web.**
- `game/worldView.ts`: the pile look, rows, checklist and Near you.
- `game/backpack.ts`: the combat backpack.
- `game/commands.ts`:
  - `reloadItems` and `reloadBothItems`;
  - Hold the Evoker / `FOCUS_ACTS` is gone.
- `game/fx/world.ts`: the pile and pick-up effects.
- `game/sandboxWorld.ts`: `pileAction`, `pileChoices`.
- The combat screen:
  - a BACKPACK button beside the action points, plus a small one in the You card; key B opens and closes it, Escape closes it;
  - the panel is `[data-bp-panel]`; its rows are `[data-bp-row]` and its buttons `[data-bp-act]`.
- The story sheet's gear tab in a fight says "In a fight: use the backpack on the combat screen (1 AP a hand)."

## Tests

- **Engine:**
  - `test/world-play-11.test.ts` (A1);
  - `test/gear-fight.test.ts` (A2, plus A5's `gearCost` matching the reducer);
  - `test/loot.test.ts` (A3, plus A5's plot-item drop).
- **Web:**
  - `src/game/ground.test.ts` (A4);
  - `src/game/backpack.test.ts`: rows, costs, greying, the unit's ammo, the actions through `apply`, Hot-Swap, a player's view, no Hold the Evoker;
  - `src/game/sandboxPile.test.ts`: the pile tool;
  - `src/narrator/world-play-11-context.test.ts`: the schema, the rules text, the wiki, the compact piles, drops through a provider turn.
- **e2e:**
  - `e2e/ground.mjs` (A4);
  - `e2e/sandbox.mjs`: step 05b opens the backpack, reads the Evoker row ("In the pack: counts only in a hand.", "Draw · 1 AP · off hand"), draws it for 1 AP and closes the panel with Escape;
  - `e2e/world-play.mjs`: places a pile with the WORLD tool, checks it is open in the view, and checks the minimap draws it.
  - Screenshots: `sandbox-05b-backpack`, `sandbox-05c-backpack-drawn`, `world-play-01b-tools-pile`, `ground-01…07`.
- **Running the e2e here:** with the local dev server on 127.0.0.1:8787, run the e2e scripts **without** a `BASE=` prefix (lib.mjs defaults to it). In this container, setting `BASE` on the command line sent the browser through the agent proxy, which answered with its relay error page.

## Known gaps

1. **Enemy paths don't avoid hazards** (ROADMAP). Neither does the Narrator's `walkStory`. Only a player's click-path goes around a revealed hazard, and only when the detour is at most 2 tiles and the unit can pay for it (review fix).
2. **An enemy killed on the area map drops nothing** (item 697). Drops come only from real fights, because the story's throwaway fight isn't persisted and would roll again on every action. The one exception is a Shade's silent takedown, which runs the sweep (review fix, item 699).
3. **Enemy weapons carry no rarity yet**, so a worn drop is always standard.
4. ~~The host-only `combat.lootLog` isn't shown~~ Fixed in review: the host sees its latest line in the combat log and in the end-of-fight summary.
5. **Companions on the area map** don't add to the party's sight of piles.
6. **Gear changes on the area map** stay free (unchanged by this branch).
7. ~~**The 1 kg light-armour line** (item 685) makes every helmet heavy~~ Decided: the line is now **1.2 kg** (provisional), so the field helmet (1.2 kg) and the field boots (1.2 kg) change in a fight and the ballistic helmet (2 kg) stays out. Leon to confirm in playtest.
8. **No built-in campaign uses `loot_tables` or `drops` yet.** M813's encounters could get some when Leon wants them.
9. **The canvas** (`design/canvas/`) is paused until v1.0 and doesn't show any of this.

## Review fixes (9 Nov 2026)

A review of parts A1–A5 found one blocker (the `pile` fx's `n` overwrote the fx sequence number, so the client replayed the last 24 effects after every reload or pick-up), and a set of majors and minors, fixed in one commit: see decisions.md entry 106, "Review fixes", and the "Review fix" sentences in section 14 items 674, 676, 679–681, 683, 689, 692, 699 and 700. Tests: `packages/engine/test/world-play-11-review.test.ts`, the silent-takedown pile in `completeness-d.test.ts`, and new cases in the web's `backpack.test.ts`, `ground.test.ts`, `sandboxPile.test.ts` and `narrator/world-play-context.test.ts`.
