# World Play 1.7, part B hand-off (web)

Branch `feature/world-play`, 8 Nov 2026. Part A (engine, data, Narrator): `world-play-A-HANDOFF.md`. Spec: `docs/design/world-play-spec.md`.

Leon's brief: "when it's time to play, the player can't see shit on the map". Everything the story puts in the world is now drawn on the area map (and the combat grid where it applies) and works through buttons. The web computes no rule: odds, costs, reasons and effects come from part A's view helpers; the web words them and picks the looks.

## What changed, by file

### New
- **`apps/web/src/game/worldView.ts`**: pure view code on top of part A's helpers.
  - Kind badges (`kindBadge`: BOT, DRN, CRW, BST, MCH; people carry none, the face says it). `NOT_PERSON`: robots, drones, machines and beasts are never recast from the player-card pool.
  - Hazard looks per kind (`HAZARD_LOOK`): minefield red ✱, fire orange ♨, radiation gold ☢, gas teal ≋, collapse grey ▼. Tiles are hatched in the kind's ink, heavier for heavy. Safe-path tiles are green and dashed with ✓; spent mines show ◌. `hazardLegend` gives the legend words; `hazardHit` says what a tile does in words ("25 damage (a save halves it); it stops your move").
  - Markers (`markerCells`): white ◆ for an objective and ◇ for a hint, with an OBJ or HINT chip.
  - Caches (`cacheLook`): a white ▣ with ×N, LOCKED or EMPTY.
  - `approachRows`: one row per option (objects, hazards, people). Each row has skills in their attribute ink, "A or B" for best-of approaches, the TN word, "YOU ROLL d20 ±n", the odds %, "Success: …" and "Fail: …" in plain words, cost, tried state, and the engine's reason when the row is off. `failWords` uses the hurt table, conditions, items and hazard damage.
  - Panels: `talkVals` (Talk), `hazardVals` (ways through), `objectRows`, `hereVals` (the HERE card), `carriedRows` and `loadLine` (carried entries, overweight), `carryTargets`, `putDownTiles`, `nearItems` (the Near you buttons), and `worldLayer` (one map layer per tile).
- **`apps/web/src/game/sandboxWorld.ts`**: the WORLD tools' forms, each turned into one `sandbox/*` action (person, cache, hazard, trigger, objective).
- **`apps/web/src/game/fx/world.ts`**: effects and sound for the 14 new FX events. Each hazard kind has its own look (mine blast and screen shake, flames, radiation ring, gas cloud, collapse dust). The others:
  - spotted, placed and gone hazards pulse their tiles;
  - a safe path lights its lane in green;
  - a trigger or alarm shows a banner card (AMBUSH!, ALARM!), toasts a line, and spawned or revealed tokens make an entrance;
  - carry and put down lift marks between tiles;
  - a search puffs dust and shows "FOUND N THINGS";
  - an approach shows SUCCESS or FAILED;
  - talk shows a speech bubble;
  - a new marker pulses white.

  Damage numbers come from the engine's `hurt` events (play.ts). All points go through the kit's fog-aware `at()`. Reduced motion uses the dom helpers' fades and trims the particles.
- **`apps/web/src/game/worldView.test.ts`**: 12 tests on a real Proving Ground game built through the WORLD tools' actions and read through `viewFor`.
- **`apps/web/e2e/world-play.mjs`**: the e2e test (below).

### Changed
- **`screens/main.js`** (story screen and area map):
  - **Tokens:** NPC tokens draw their avatar (`avatarOf`). People are cast only when a player holds that card; things keep their art and beasts show the badge only. Every NPC token has a kind badge, on the mini map and the area map.
  - **Map layers:** each tile can show a hazard layer and glyph, a marker, a cache glyph with its count chip, and the dashed Put down tiles. Tile labels add the hazard, marker and cache words (for hover and screen readers).
  - **Clicks:** clicking a person's token (Move selected) opens the **Talk panel**. Clicking a cache opens the object panel, which now has a "Holds N things" box and a **Search · 1 AP** button.
  - **Object panel:** approaches show odds %, "✓ Success: …", "✕ Fail: …" and the reason.
  - **Talk and hazard panel** (`wp`, one dialog for both): portrait with kind badge, kicker (kind, side, ref, distance), the want and the hint once told, rows with Try or Ask buttons, a pending "Roll it" button, and Carry · 1 AP with its reason.
  - **NEAR YOU** (story aside and the area map's action column): Talk to X, Carry X · 1 AP, Search Y · 1 AP, and each hazard's ways through, each with its reason when off.
  - **HERE card:** top of the story aside, plus a compact copy under the area map's log.
  - **Area map legend:** hazard kinds, safe path, spent mine and the marker words.
  - **Put down mode:** a status card with Cancel. Only dashed tiles accept the click.
  - **GEAR tab:** a CARRIED section with avatar, name, kind, kg, the load line (red when overweight), Put down · 1 AP (opens the area map to pick a tile) and Nearest tile.
  - The area log keeps the new lines (alarm, revealed, picks up, puts down, gets, sets off, safe path).
- **`templates/main.template.html`**: the markup for all of the above.
- **`screens/combat.js` + `templates/combat.template.html`**:
  - the fight's hazard tiles, legend words and caches;
  - kind badges on seen hostiles;
  - dropped carried people (`combat.dropped`), drawn as lying dashed tokens;
  - a **Search ▣ · 1 AP** button above the AP pips for each non-empty cache next to the acting unit (`combat/search`).
- **`game/cast.ts`**: `castFight` never recasts a robot, drone, machine or beast.
- **`game/fx/play.ts`**:
  - registers the world handlers and beats;
  - robots, drones and machines spark instead of bleeding (`MACHINE_KIND`).
- **`game/sandbox.tsx`**: a **World** tab in the Proving Ground tools (host, or "Everyone can spawn"; gearing up only). Each section places by clicking the map (the existing tile pick) or by typing a tile:
  - **A person:** name, kind, side, an avatar picker from the kind's pool (Auto, or Badge only for beasts), prisoner, hidden, wants, knows (objective, hint, tile), and 1–4 talk approaches (label, two skills, TN, success, fail, objective, condition, item).
  - **A cache:** name, items with quantities (any item or weapon), locked with its way in.
  - **A hazard:** kind, light or heavy, hidden. Place it by two corners or "C3:E5". Placed hazards are listed with Remove.
  - **A trigger:** on entering tiles (two corners) or when an object is dealt with. It can spawn a group (count, name, kind, tier), start an ambush fight, or reveal hidden things; it has a text line.
  - **An objective:** id and text, where (a person, object or hazard on the map, or a tile), Set objective, Mark it done.

No engine or data change.

## Screenshots (deviceScaleFactor 1, 1440×1000; copied to `docs/design/handoffs/world-play-B-shots/`, regenerated in `apps/web/e2e/shots/`)

| File | What |
|---|---|
| `world-play-01-tools-world.png` | The World tab in the Proving Ground tools |
| `world-play-02-talk-panel.png` | Talk panel: the robot's avatar and badge, asks, a talk approach with 35% odds and plain effects, Carry |
| `world-play-03-talk-told.png` | Its want and hint after asking; the marker pulses on the crate |
| `world-play-04-marker.png` | The hint marker on the area map |
| `world-play-05-here-card.png` | HERE card and Near you on the story screen |
| `world-play-06-carried.png` | GEAR tab: CARRIED, the robot at 40 kg, the load line in red when overweight |
| `world-play-07-put-down-pick.png` | Put down: the dashed free tiles next to you |
| `world-play-08-locked-cache.png` | A locked strongbox: holds 2, its way in at TN 20 with odds and "Fail: 50 damage" |
| `world-play-09-approach-hurt.png` | The failed way in: 35 damage after armour |
| `world-play-10-minefield.png` | A minefield on the area map with its legend |
| `world-play-11-mine-hit.png` | Sprinting into it: a mine goes off |
| `world-play-12-hazard-panel.png` | A heavy minefield's ways through ("Vigilant or Sensory", 70%) |
| `world-play-13-safe-path.png` | Safe path (✓ dashed green) when the roll succeeds |
| `world-play-14-ambush.png` | The trigger's ambush: two raiders spawn and the fight starts; hazards are drawn in the fight |
| `world-play-15-fight-search.png` | Search buttons in the fight; FOUND 2 THINGS |

## Tests

- `npx tsc --noEmit` in apps/web: clean.
- `npm test -w @phc/web`: 46 files passed (1 skipped), 347 tests passed (2 skipped). This includes `worldView.test.ts` (12 tests).
- `npm run build`: ok.
- **`node apps/web/e2e/world-play.mjs`**: 33 checks, exit 0, no page errors. It runs in the Proving Ground, real buttons only:
  1. place a robot with a picked avatar (avatar and BOT badge on the mini map), an objective and a cache (count, no items in the view);
  2. talk: odds and effects, Ask what they want, Ask about the objective (hint, marker, HERE card);
  3. Carry from Near you (40 kg in GEAR, token gone), then Put down on a dashed tile (token back with avatar and badge);
  4. Search the crate (pack +3, log lines);
  5. a locked strongbox's TN 20 way in fails and hurts (HP 145 → 110);
  6. sprint into a minefield (a mine goes off, `hazard` fx);
  7. a heavy minefield's safe path (odds 70%; ✓ tiles when it succeeds);
  8. an enter trigger fires an ambush (2 spawned, the fight starts);
  9. the fight draws the hazards and their legend, and Search in the fight empties the ammo box.
- Existing suites: see "e2e results" below.

## e2e results

All against the local dev server after `npm run build`:

| Suite | Result |
|---|---|
| world-play | exit 0 |
| two-players, missions, sandbox, playscreen, classes | exit 0 |
| faith | exit 0 when run alone. The full sweep timed out waiting for the title's NEW GAME button at start-up, before any World Play screen. |
| magic, tabs, perks, combat-fixes, slate, resources, heart, sigil14, classes-moves | exit 0 |

## Known gaps

1. **Story stream doubles the name** on world actions ("Recruit Recruit asks Hum…"): the engine posts a `player` line whose text starts with the name and also sets `head`. This is engine text (`talkAsk`, `tryApproach`); a fix is one line in `world.ts` (drop the name from the text or the head). Left alone (no engine changes in part B).
2. **In the Proving Ground the AP bar is back at 6/6 after asks and attempts.** They spend AP (`spendAp`), but they also set `needs` and close the round, and with no Narrator a new round starts with full AP. With a Narrator the costs on the buttons hold for the whole round.
3. **Paths don't steer round hazards** (part A gap): clicking a tile beyond a minefield walks straight through it. A planned path doesn't warn yet; the hover label on each tile names the hazard.
4. **Hazard ways through and talk are area-map only** (engine rule 637/658: "Deal with it after the fight"). In a fight, hazards are drawn and fire, but have no panel. Caches can be searched in a fight.
5. **Ask buttons stay after asking.** The want and the hint show as told lines; asking again costs AP again. The engine allows the repeat, so the button stays.
6. **The test Recruit's carry limit is 25 kg**, so carrying any robot makes them overweight. That's the archetype's number; the screen shows it in red.
7. **Hidden NPC tokens** are still filtered by the web (part A known gap); their wants and hints are stripped by the view.
8. The canvas (`design/canvas/`) is not updated (paused until v1.0, per CLAUDE.md).
