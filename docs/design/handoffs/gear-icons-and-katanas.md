# Hand-off: the painted gear icons in the game, and the katanas (13 Nov 2026)

Branch: `worktree-agent-af081395aa53f00e8` (from `claude/charming-gauss-hbq4n0`). No version bump; not pushed.

## 1. The pipeline

- `python3 tools/validate_gear_art.py` and `python3 tools/validate_art.py` both passed on the merged delivery as it
  was: the hand-merged catalog and checksums needed no fix.
- `tools/build_web_assets.py` (`npm run assets`) reads the catalog's `gear` map and builds each icon **by item id**:
  `gear-<item id>` from the 64 px export (rows up to 32 css px, sharp at 2x) and `gear-<item id>-lg` from the 256 px
  export (hand cards, hover cards). The stem's `ammo_` / `mod_` is put back when that is the data's id. Derived gear
  keeps its kind: `gear-rounds-<calibre>`, `gear-mag-<family>`, `gear-armour-torso_class<N>_<name>`,
  `gear-loot-personal_effects`. A file whose item is not in data yet is built under `gear-<id>` (the Visualizer, the
  Attuner, the toxin vial, the Emanator katana), so the item picks it up the day it is added. The 1024 masters never
  ship. The builder asserts no two files build to one key.
- **Size added to the site: 1,810 KB** (302 WebP files: the small ones 258 KB, the `-lg` ones 1,552 KB; the largest
  `-lg` 17 KB). **Lazy loading:** the title's preload no longer waits for them: `main.tsx` loads the small ones after
  everything else, and the `-lg` ones only when a screen shows one (an `<img>` fetches its own).
- `docs/ASSET-DIRECTORY.md` is not generated (no tool writes it): a short gear section was added by hand, and a row in
  `docs/ART-INTEGRATION.md`.

## 2. The game shows them

ONE resolver, `gearIconUri(id, ink?, { large?, line? })` in `apps/web/src/game/gearIcons.ts`: the painted icon's URL
when the item has one, else the monoline data URI in the ink, else ''. Painted icons are never tinted or masked (the
ink does not reach them). `gearLineUri` is the same call with `line: true`, for effects and small tinted marks: Sunder's
weapon strike and the melee technique cards (`fx/techniqueParts.ts`, `fx/melee-techniques.ts`) and the reload card
(`fx/reload.ts`) keep the line art. Derived ids: `roundsGearId(calibre)`, `magGearId(weaponId)` (`MAG_ART`, the art
brief's "drawn for" lists; a new magazine painting needs a line there), `torsoGearId(armourClass)`.

Where it now draws painted icons (same boxes as before, no layout moved): the sheet's GEAR tab (hand cards and their
hover card at the large size, body slots including the outer torso's Armour Class, backpack rows including magazines
and loose rounds), the backpack in a fight (hands, armour including body armour, pack, ammo rows: magazines, rounds,
spare parts, cores, stims), a pile's hover and the pick-up checklist (magazines and rounds too), the Proving Ground's
Equipped / Pack / Give lists, the creation Kit step, the ARMS tab's drill and ammo cards, and the Attack tab's weapon
header (through `techView.ts`, untouched: the resolver changed under it). A faint light lift sits behind painted icons
(CSS in `main.tsx`, background only) so charcoal metal stays off the dark panel.

Not wired: personal effects (loot `personal` becomes a plot item with no item id: nothing to key the icon on).

### The match table

| | Count |
| --- | --- |
| Files delivered | 151 |
| Matched an item id in data | **121** (every one of the 61 weapons and 60 items, the katana included) |
| Derived gear, wired by calibre / gun / Armour Class | 26 (12 rounds, 8 magazines, 5 torso classes, personal effects; personal effects not shown, see above) |
| Matched nothing in data | 4: `focus-visualizer`, `focus-attuner`, `consumable-toxin_vial` (all Classes 3.0, planned), `weapon-emanator_katana` (held back, section 3) |
| Items in data with no painted icon | **0** |
| Guns with magazines but no painted magazine | 3: Magistrate heavy pistol, Brigade auto-shotgun, repeating crossbow (added to `ART-REQUESTS.md` as E2b) |

### Read at 32 px (looked at: the backpack, the Proving Ground, a contact sheet of all 151)

Most read well. Do not read: the pistol, SMG and rifle magazines and the extended-mag mod (four near-identical
slivers); the katana and the Emanator katana (twins: the violet lens vanishes); the long rifle, the marksman rifle and
the .700 (thin near-twins); the service pistol (charcoal on the panel; better with the lift, still the weakest). All in
`ART-REQUESTS.md` E2b. Screenshots (DSF 2) in the scratchpad `shots-gear/` folder.

Tests: `apps/web/src/game/gearIcons.test.ts` (assets.json by item id, the resolver: painted, untinted, large, the
monoline fallback, the line-only call, derived ids), `gearIconRender.test.tsx` (jsdom: a painted item renders its
WebP in the old 32 px box with no filter or mask; without one the monoline fallback; neither, nothing),
`gearIconViews.test.ts` (piles and the fight backpack carry magazines and rounds now). E2E `gear-icons.mjs` checks
painted icons on every screen above.

## 3. The two weapons: adding a weapon by data alone

**The katana: data alone. No line of TypeScript.** Rules 1.32, items 1950 to 1954 (after rules 1.31's block, 1900 to
1949). A light blade (7.7) compared with the **sabre**: 28 damage (the sabre's, the family's top), 1H, reach 1, 1.4 kg,
500 credits, Dexterity, scales with Agility, 2 AP, durability 250, mod slots edge and grip, properties light and edge,
no requirement; it lends **Draw Cut** (`phys.teaches`; an existing technique, unclaimed by any other weapon: draw it from
the pack and strike in one action). No `grants` (a `narrator` grant would put a dead "(Narrator)" action on the Attack
tab). No loot table (the sabre is in none). Rarity: none in data, as every weapon. `packages/engine/test/katana.test.ts`:
loads, inside the family's ranges, equips, Cut for its own damage and AP, Draw Cut lent from the pack; the golden tables
gained 25 NEW lines (5 each in `weapons`, `rules-weapons`, `rules-weapons.log`, `costs-weapons`,
`costs-weapons.marks`), none moved.

**The Emanator katana: STOPPED.** The engine lacks: **a weapon cannot be made a focus by data.** The focus gate
(`hasEmanator` / `holds` / `focusHand` / `carriesEmanator`) reads `FOCUS_IDS` in `packages/engine/src/character.ts`
(line 743), a list written in code (`emanator: ['emanator', 'emanator_gauntlet']`); the weapon's `counts_as_emanator`
property is not read by it (only `magic.ts` reads `counts_as_evoker`, for the Evoker blade's core). The data form today
is still `properties: ["counts_as_emanator"]` (no `focus: {door, hand, fuel}` block exists in data yet). The fix is
a primitive, not a weapon: build `FOCUS_IDS` from data (the `focus` items plus every weapon whose `properties` has
`counts_as_<door>`, or the Classes 3.0 `focus` block once the Bonds step lands), then the weapon is data alone. Its
numbers are in rules 1.32 section 2 and item 1955 (1H, 26, 1.8 kg, 2,400, Will Power 3, +1 mana a hit); the test is an
`it.todo` in `katana.test.ts`. Everything else it needs is data: mana arms already release bots on a hit by category.

### How to add a weapon (the checklist, as done for the katana)

1. **Spec first** (`docs/rules/PHC-Core-Rules-v1.0.md`): the family's table in 7.1 to 7.12 (a row, its count in the
   heading), its weapon-skill line under the table, a rules revision after the last one, section 14 items after the
   last used block (every number PROVISIONAL).
2. **Data** (`data/weapons.json`, next to its family): `id`, `name`, `category` (the family), `damage`, `damage_type`,
   `range_tiles`, `magazine`/`heat_limit`/`ammo` (null for a blade), `modes`, `ap_cost` (the family's), `skill`,
   `weight_kg`, `accuracy`, `price_credits`, `properties`, `text` (numbers as `{=placeholders}`), `mastery_family`,
   `hands`, `durability`, `mod_slots`, `lore`, `type`, `provisional`, `requires` (if any), and **`phys`** (`system`,
   `props`, `hits_with`, `scales_with`, `teaches`: an existing technique). `grants` only for a real engine op.
3. `python3 tools/validate.py data`: 0 errors (it checks the family, `teaches` against the techniques and their
   `not_with`, the text numbers). `python3 tools/check_spec_tables.py`.
4. **Loot**: `data/loot_tables.json` only if comparable weapons are there.
5. **Art**: the painted icon `art/icons/gear/weapon-<id>.png` with its catalog entry and exports (the artist's
   delivery, `tools/validate_gear_art.py`), `npm run assets`; and **a monoline icon** `art/icons/weapons/<id>.svg`
   (`gearIcons.test.ts` requires one for every weapon; it is the effects' and the fallback's icon: drawn here by hand).
   A new magazine painting also needs its gun in `MAG_ART` (`gearIcons.ts`).
6. **Tests**: an engine test read from data (loads, equips, plain attack and techniques); the golden tables
   (`golden-damage`, `golden-rules`, `golden-costs`) show the weapon as NEW lines: check that nothing else moved, then
   `GOLDEN_RECORD=1` those three.
7. `python3 design/canvas-build/build.py --web` (the screen data lists weapons), `npm run check`.

Where it took more than data: the monoline SVG (art, not code); nothing else for the katana. For the Emanator katana:
the focus list (code).

## 4. Calls made for Leon (reverse any)

1. The katana is a light blade (Dexterity), not heavy melee: its weight and one-handed use put it with the sabre.
2. It lends Draw Cut, not Riposte (the sabre's) or a new technique.
3. No weapon skill (`grants`) for it.
4. Painted icons get a faint light lift behind them (no tint).
5. The Emanator katana is not in data until the focus list is read from data.
