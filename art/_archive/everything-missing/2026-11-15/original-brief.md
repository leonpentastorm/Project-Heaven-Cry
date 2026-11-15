# GPT prompts, 15 Nov 2026: everything the game still has no picture for

For the artist. Leon, 14 Nov 2026: "every art assets needed and items in the menu that do not have icons, list it out in
prompt so GPT can make art for you, previous agent have identyfied a list on enemies and stuff that lacks art."

This file is the rest of that list. It was found **by machine**, not by eye: a script read `art/catalog.json`, the built
asset map (`apps/web/src/game/assets.json`) and every data file, and asked, for each thing a player sees, what the game
would draw today. What comes back empty or on a stand-in is in the tables below, one image a row, numbered **1 to 66**.
Section H lists what is **already requested** in three other files (so it is not painted twice), section I what has art
and only needs wiring (nothing to paint), and the end has the counts, the total and the order of need.

**The foes of Survival (71) and the character portraits (145) are not repeated here:**
[`GPT-PROMPTS-2026-11-14-survival-foes.md`](GPT-PROMPTS-2026-11-14-survival-foes.md) (71 portraits; the artist's delivery
is on the branch `art/survival-foes-2026-11-14`, not yet merged to `develop`) and
[`GPT-PROMPTS-2026-11-14-portraits.md`](GPT-PROMPTS-2026-11-14-portraits.md) (145 repaints). Counted in the total as
"already requested".

## Read this first

- **One image a prompt.** For each row, paste **the base prompt of its section, then the row's "Paint" text**, and attach
  the references the section names. Every delivery is a **review candidate** until Leon approves it; send the files to
  Leon, Claude adds the catalog entries and runs `python3 tools/validate_art.py` and `npm run assets`.
- **Three art modes, by group** (`art/style-guide/PHC-Style-Guide.md`; rule files named in each section):
  1. **Painted gear icon** (sections A and B: items): Heavenprint gouache and ink, one object, three-quarter view,
     1024 x 1024 PNG with alpha. This is the item art since 13 Nov (`art/style-guide/gear-icons.md`): the game draws the
     painted icon first and the monoline icon only where no painting exists. The monoline set (a 64 grid, 2-unit round
     stroke in `currentColor`, readable at 32 px; `art/style-guide/weapon-icons.md`) is Claude's, for weapons, armour and
     foci, and none of the items below needs a new one.
  2. **White flat ink** (sections C, D and F: boon icons, map markers, panel icons and the three flash marks): pure
     white `#FFFFFF` on transparency, 1024 x 1024, in the house style of the trait and perk icons (master
     `art/icons/traits/mind-without-fog.png`, rule `art/icons/STYLE-LOCK.md`). These are objects and signs, not
     Wick figures. The game draws them as a mask in the screen's own colour, so **no colour, no grey, no glow**.
  3. **Heavenprint paintings** (sections E and G: portraits and backdrops): painted gouache and ink, opaque. Portraits
     800 x 1000 (4:5, eye line about 22% from the top); backdrops 16:9, 2560 x 1440 (never under 1920 x 1080).
- **Seen at:** item icons 72 px (the reward card), 64 px (shop grid), 40 px (shop card) and 32 px (the backpack row), on
  the panel `#10151F`; boon icons 24 px (the run board) and 56 px (the boon card's dark disc); map markers 32 to 48 px in
  a ring; panel icons 24 px; flash marks 64 px inside a round ring; keeper portraits as a band across the top of the middle
  column (about 640 px at 1280); backdrops behind a dark gradient, cropped to cover. Check each batch on one sheet at those
  sizes before sending.
- **Names, saving, catalog:** each row gives the **id the game looks up** (derived from how the code resolves that kind,
  see the section's note) and the **file name** to save. Do not rename; do not put text, letters, numbers or logos in any
  image. A new image goes in the production folder under its name; Claude adds the catalog entry (path, sha256, size,
  `status: review-candidate`, `production_approved: false`) and `tools/rehash_art_checksums.py`.
- **Deliver on a branch** `art/everything-missing-2026-11-15`, one contact sheet per section (sheets and prompts go to
  `art/_archive/` from the start, as in `art/AGENTS.md`).
- **In-world only.** Everything is invented. No real-world brands, flags, insignia or makes; a medical sign is a plain
  plus mark, never a red cross; the Unspoken Name applies. Lore: `docs/lore/` (the Earth Sector, AHOC, the Lumeri Church,
  the Smetanita Conjunction, the Thousand World Legion; nanobots are mana).
- **Version 0.28.0 is being built as this is written.** Its four new items, the Materials card and the right panel are in
  the rules (rules 1.54, on the branch `feature/0.28-spec`) but not yet in `data/`: their ids are marked **(0.28.0)** and
  must be checked against `data/items.json` and `data/modes.json` when 0.28.0 lands.

## What the machine found, per kind

| Kind | In data | With art | No art or a stand-in | Where it is asked |
| --- | --- | --- | --- | --- |
| Weapons (`weapons.json`) | 64 | 62 painted | 2 natural weapons (Figment claws, Figment edge) on the line icon: never carried, no painting needed | none |
| Items (`items.json`) | 70 | 61 painted | **8 no icon** (the quiver, six enchantments, the armourer's chit); 1 painted but never found (Contraband, section I) | A |
| Armour and shields | 19 | 19 | 0 | none |
| Loose rounds, torso armour classes | 12, 5 | 12, 5 | 0 | none |
| Magazines (guns whose reload is a magazine) | 19 | 16 wired | 3 painted but not wired (section I) | none |
| Shop shelves | 7 | 6 | the Restock lines (supplies, toxins) draw no icon (section I) | none |
| Survival boons, caster boons | 20 | 0 painted | **20**: line glyphs drawn in code | C |
| Starting boons (by line) | 26 (9 lines) | 0 painted | **9** line glyphs drawn in code | C |
| Path-map node kinds | 14 (13 and the camp) | 11 inked (10 files; the gate shares the Elite's) | **3** (the camp, the vault's guard, the vault) on a line icon | D |
| Keeper faces (`faces`) | 11 | 6 keepers painted | **3 portraits** and **11 backdrops** pending; the shrine's patron draws the rolled patron (by design) | E |
| Camp (the loadout screen) | 1 | 0 | **1 backdrop** (plain ground) | E |
| Settings (backdrop, Boss, kinds) | 6 | 6 backdrops | 2 Boss portraits null, 5 of 6 settings "awaiting" their own foes | H (foes file) |
| Foe portraits | 71 | 0 on `develop` (71 on the art branch) | all, until merged | H |
| Figment forms | 5 (+ the turret) | 0 | 6 portraits | H (Classes 3.0 file) |
| Trait, perk, prayer, feeling, module, Call, skill, patron icons | 74, 106, 39, 25, 38, 9, 27, 8 | all | 0 | none |
| Lobby mode cards | 3 | 1 wired (Campaign) | Survival's is painted, not wired; Roguelike has none | G, I |
| Map kit | 216 | 212 | 4 held back | H |
| 0.28.0 (not in data yet) | 4 items, 1 card, 2 panels, 3 flashes | 0 | all 10 | B, F |

## A. Items in the game with no icon (8)

**What they are for:** the pack, the shop's rolled gear, the ARMS tab and the loot piles. **Mode:** painted gear icon.
**Id the game looks up:** the item's id; `gearIconUri` (`apps/web/src/game/gearIcons.ts`) asks for the asset `gear-<id>`,
which `npm run assets` builds from the catalog `gear` entry whose file is `art/icons/gear/<kind>-<id>.png`, where the kind is
the item's `category` in `data/items.json` (`tools/build_web_assets.py`, `gear_key`). Catalog entry to add: a `gear` map
key equal to the file stem (`mod-ench_fire`), `path`, `sha256`, `width`, `height`, `background: transparent`,
`status: review-candidate`, `production_approved: false`, `exports` (256, 128, 64, 32 made by the pipeline).

**Base prompt (paste first; copied word for word from `GPT-PROMPTS-2026-11-13-gear.md` section 1):**

> Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush
> strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows,
> warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D
> render, no airbrushed gloss and no uniform digital sharpness. One single object, three-quarter view, lit from one
> side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene.
> Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha; the object fills about 80% of the canvas
> (keep it inside the central 80 to 85%, about 100 px of clear margin on every side). No text, no letters, no numbers,
> no logos, no maker marks, no borders, no frame, no hands and no figures. Everything is invented: never a recognisable
> real-world make, model or emblem. The silhouette must be bold and instantly readable first: the icon is shown at 64 px
> in a shop grid and at 32 px in a backpack row, so keep detail concentrated on one or two focal edges and make the
> shape unmistakable when shrunk. Colour: metal is painted in the palette's neutrals (charcoal, steel grey, warm ivory
> highlights); the faction's signature colour is the single accent (given in each prompt). Rarity is not shown by a
> coloured border (the UI adds that): standard finish only, with honest wear. Scale within a family stays consistent:
> every object in one family fills the frame by the same rule, given in its family paragraph.

**Attach:** `art/sprites/objects/fuel-drum.png`, `art/sprites/objects/tool-rack.png`, `art/sprites/objects/field-lamp.png`,
`art/portraits/world/new-faces/orren-vask.png` (brushwork), and two finished gear icons of the same family from
`art/icons/gear/` (named per row). Palette: `art/style-guide/palette.json`.

| # | Id | File | Name | Paint |
| --- | --- | --- | --- | --- |
| 1 | `quiver` | `quiver-quiver.png` | Quiver | An archer's quiver worn on the back: a stiff leather-and-canvas tube with a buckled shoulder strap and a spray of fletched arrows showing at the mouth, scuffed from the road. Its grade only changes how many arrows it holds, so it is plain: bare leather and walnut, no accent. Match `weapon-longbow.png` for the arrows. (Used by every archer.) |
| 2 | `ench_fire` | `mod-ench_fire.png` | Ember enchantment | A quiver enchantment: a short cuff of braided cord and fletching feathers with a small metal sigil plate set in it, the plate cut as a flame-lick shape. The one accent is the Ember tone, `#FF9A4A`, in the dyed cord and a scorched edge on the plate. No glow. |
| 3 | `ench_storm` | `mod-ench_storm.png` | Storm enchantment | The same cuff-and-plate object as the Ember one (same scale and angle), the plate cut as a zig-zag. Accent: the Storm tone, pale blue-white `#CFE3FF`, in the cord and the plate's bright edge. |
| 4 | `ench_frost` | `mod-ench_frost.png` | Frost enchantment | The same cuff-and-plate object, the plate cut as a many-pointed crystal. Accent: the Frost tone, ice blue `#BDF3FF`. Must differ from the Storm one at 32 px by the plate's shape alone. |
| 5 | `ench_stone` | `mod-ench_stone.png` | Stone enchantment | The same cuff-and-plate object, the plate a blunt square slab with one notched corner. Accent: the Stone tone, sand-ochre `#C9B79C`. |
| 6 | `ench_gale` | `mod-ench_gale.png` | Gale enchantment | The same cuff-and-plate object, the plate cut as a curling crescent with one trailing tail. Accent: the Gale tone, pale green-white `#DDF6FF`. |
| 7 | `ench_acid` | `mod-ench_acid.png` | Acid enchantment | The same cuff-and-plate object, the plate cut as a round-bellied drop. Accent: the Acid tone, sour green `#B6E35A`, as a stain bitten into the cord and the plate. |
| 8 | `armourer_chit` | `tool-armourer_chit.png` | Armourer's chit | A chapter armourer's stamped requisition: a small rectangular punched-tin tag with a notched corner and a cord through its hole, an abstract stamped seal on it (no letters) and one dot of rust-red wax, `#CC2435`. It is paper money for one grade step, worn from many pockets. |

(Six enchantments are one object family: paint all six in one sitting, same cuff, so the shape of the plate is the only
difference besides the accent.)

## B. What version 0.28.0 brings: three materials, the ammo maker, the Materials card (5)

**What they are for:** after a fight each character picks "Materials" (gunpowder, casings and mana residue together) or
"One weapon"; the materials sit in the pack, sell at the shop and feed the ammo maker (rules 1.54 items 3 to 7, on the
branch `feature/0.28-spec`; the ids are the rules' own). **Mode and size:** the same painted gear icon as section A, seen
at 72 px on the Materials card and 32 px in the pack. **Same base prompt and references as section A.**

**Naming trap, read before saving:** the three materials are category `loot` in the rules, but the build keeps a file whose
kind is `loot-` under its own stem (`gear-loot-<id>`) and the game asks for `gear-<id>`, so a file named `loot-gunpowder.png`
would never be found (this is why Contraband's painting is not drawn today, section I). **Save the three as
`material-<id>.png`**, which the build turns into `gear-<id>`; Claude renames on intake if the build is fixed first.

| # | Id | File | Name | Paint |
| --- | --- | --- | --- | --- |
| 9 | `gunpowder` (0.28.0) | `material-gunpowder.png` | Gunpowder | A small stout canvas pouch tied with cord, its mouth open on a heap of coarse black grains, a few grains resting on the cloth. Plain issue goods: ochre cord, no accent, no smoke, no spark. It is a pinch of propellant, worth one credit, so keep it humble and dark. |
| 10 | `casing` (0.28.0) | `material-casing.png` | Casing | Three empty bottle-necked brass cartridge cases, one standing open-mouthed and two leaning on it, dented and tarnished, no headstamp marks. It must read as hollow brass, not as loaded rounds: compare `rounds-rifle.png` and keep the open mouth clear at 32 px. |
| 11 | `mana_residue` (0.28.0) | `material-mana_residue.png` | Mana residue | A slim stoppered glass phial with a cork, half full of fine grit with a faint pale-teal sheen, what a spent spell or a dead machine leaves: dust of dead bots. Accent: Intelligence cyan `#8BDEEE`, only as the sheen inside the grit, no glow bloom. Tall and slender, so it cannot be mistaken for the standard core (`consumable-standard_core.png`). Its name is never "residue" alone (that word names a feeling's tiles). |
| 12 | `ammo_maker` (0.28.0) | `tool-ammo_maker.png` | Ammo maker | A hand tool that presses rounds: a squat cast-iron bench press you can carry, a long lever arm raised on the diagonal over a die block with a socket for a case, a small powder hopper on one side, a brass fitting. Plain, mass-produced Thousand World Legion shapes (anonymous olive-grey), worn grips. A tool, 2 kg: dense and heavy, bold silhouette. |
| 13 | `materials` (the card; 0.28.0) | `card-materials.png` | Materials card picture | The picture on the "Materials" loot card: one still life of the three materials together at one scale, the pouch of gunpowder behind, the three brass casings in front, the phial of residue leaning against them, the same objects as 9 to 11. Transparent, painted as the gear icons are; it sits beside the weapon icon of the "One weapon" card, so the same size and light. The build turns the file into `gear-materials` (kind `card`); the 0.28.0 builder may name it otherwise. |

## C. Boon icons (29): the twenty boons and the nine starting-boon lines

**What they are for:** the boon cards after each Boss (56 px on a dark disc), the camp's starting-boon cards, and the run
board's list of boons held (24 px). Today they are simple line glyphs drawn in code (`apps/web/src/game/boonIcons.ts`,
`BOON_ICON_PATHS` and `LINE_ICON_PATHS`), always beside the boon's name and sentence. **Mode:** white flat ink.
**Id:** a boon's id in `data/survival.json` `boons` (`boon.edge` is asked for as `icon-boon-edge`); a starting boon
draws the glyph of its **line** (`start_boons[].lines[0]`, the nine keys of `start_boon.names`), so the nine lines are
`icon-boon-<line>`; the 26 starting boons need no icon of their own. This is the catalogue id the standing requests
S5 and S10 in `ART-REQUESTS.md` give (nothing in the code looks the catalogue up yet; the builder wires `StageScreen.tsx`
and `LoadoutScreen.tsx` to it and keeps the line glyph as the fallback). **Save as** `art/icons/boons/<name>.png`, the
name being the id without `boon.` (and the line's own word for the lines). Catalog: a new `boons` map, key `icon-boon-<name>`.

**Base prompt (paste first; for every white-ink row in C, D and F):**

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached
> reference icons (the Wick trait and perk icons: bold flat white shapes, a confident inked silhouette with a few
> interior cuts, the same line weight). No outline in another colour, no shading, no gradient, no texture, no glow, no
> colour and no grey. This icon is an object or a sign, not a figure: do not draw Wick or any person unless the line below
> says so. One subject, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at
> 24 px in a row and look right at 56 px on a dark disc: silhouette first, two or three interior cuts at most. No text, no
> letters, no numbers, no border, no frame. Invented shapes only: nothing recognisable from real-world works, brands or
> insignia (a medical mark is a plain plus, never a red cross).

**Attach:** `art/icons/traits/mind-without-fog.png`, two or three of `art/icons/perks/*.png` (line weight), and
`art/icons/survival/markers/shop.png` (a delivered non-figure icon of this family).

| # | Id | File | Name | Paint |
| --- | --- | --- | --- | --- |
| 14 | `boon.edge` | `edge.png` | Honed | A short blade seen edge-on with a bright honed strip cut along its edge and a whetstone's slanting line beside it. (Everything you deal hits harder.) |
| 15 | `boon.second_wind` | `second_wind.png` | Second Wind | Three gusts of wind drawn as long bending strokes that curl at the ends, rushing past a small round breath-mark. (More AP every turn.) |
| 16 | `boon.true_aim` | `true_aim.png` | True Aim | A reticle: a ring, four ticks at the compass points, a centre dot with a tiny gap around it. (A bonus to every roll to hit.) |
| 17 | `boon.hardened` | `hardened.png` | Hardened | A heater shield with a plate seam down the middle, two rivets and one old scar across it that has not gone through. Different from section C's Guard shield (#36) by the scar and the straight top. |
| 18 | `boon.lifeline` | `lifeline.png` | Lifeline | A heartbeat line that runs flat, spikes once and is caught by a rope loop knotted round the spike so it cannot fall below the line. (The first blow each fight leaves you on 1 HP.) |
| 19 | `boon.echo` | `echo.png` | Steady Breath | Three concentric rings widening from a small centre, the outer one broken open on one side like a breath let out. (Echo at the start of each fight.) |
| 20 | `boon.deep_well` | `deep_well.png` | Deep Well | A round stone well seen from three-quarter above, a windlass post and a hanging bucket, two ripple rings in the water. (The heals and shields you give are stronger.) |
| 21 | `boon.primed` | `primed.png` | Primed | Three bars of rising height, the third topped with a small upward arrow, on a base line. (Your door's meter starts a step up.) |
| 22 | `boon.reflexes` | `reflexes.png` | Quick Hands | Two curved arrows chasing each other in a swap, each ending in a small open hand shape. (The first reload or weapon swap each turn costs less.) |
| 23 | `boon.mending` | `mending.png` | Field Mending | A plain plus mark with a bandage wound diagonally across it, two loose ends. Never a red-cross look: a plus, wrapped. (Heal at each fight's end.) |
| 24 | `boon.bandolier` | `bandolier.png` | Bandolier | A belt of rounds slung diagonally corner to corner, a row of five upright cartridges on it and a buckle at one end. (More magazines in the supply pack.) |
| 25 | `boon.deep_satchel` | `deep_satchel.png` | Deep Satchel | A bulging satchel with a flap, two buckled straps and a small round core's shape pressing at the flap. Fuller than a bag. (More cores and MP in the supply pack.) |
| 26 | `boon.tithe` | `tithe.png` | Tithe | A coin with a square hole and a second coin leaning on it, a small upward tick above them. (More credits from every stop that pays.) |
| 27 | `boon.devout` | `devout.png` | Devout | A votive candle on a short stand with one tall flame and a thin standing stone behind it. (Devotion XP after each fight.) |
| 28 | `boon.script_ward` | `script_ward.png` | Ward of Script | A heater shield with a drawn glyph on its face: an abstract stroke-built mark (not a letter) inside a thin ring. Different from #17 by the glyph and the rounded top. (A shield at a fight's first round.) |
| 29 | `boon.long_hand` | `long_hand.png` | Long Hand | One long calligraphic stroke leaving a stylus point and turning back on itself in a hook, an arrow's tip at the return. (Drawing a glyph gives back AP.) |
| 30 | `boon.sure_script` | `sure_script.png` | Sure Script | A glyph (an abstract crossed stroke mark, not a letter) set dead centre in a ring, with one small tick at the ring's top. (A bonus to hit with Sigils.) |
| 31 | `boon.steady_heart` | `steady_heart.png` | Steady Heart | A heart with a perfectly level line through its middle, and two short calm ripple strokes on each side. (A bonus to hit with Outbursts.) |
| 32 | `boon.deep_reserve` | `deep_reserve.png` | Deep Reserve | A tall corked jar, full, with three tick marks up its side and the liquid line above the top tick. (MP back at each round's start.) |
| 33 | `boon.mercy_return` | `mercy_return.png` | Mercy's Return | A plain plus mark with a looped arrow leaving its arm and curving back to its base. (Heals return MP.) |
| 34 | `guns` | `guns.png` | Guns (line) | A sidearm in profile, slab slide and a ported barrel, muzzle to the right, level. The line of Zeroed, Hot Loads and Quick Magazine. |
| 35 | `blades` | `blades.png` | Blades (line) | A single sword on a diagonal, simple crossguard, a tapered point. The line of Balanced Grip, Whetted and In Close. Different from Honed (#14) by being the whole sword with a guard. |
| 36 | `guard` | `guard.png` | Guard (line) | A round buckler held square-on, a raised central boss and two radiating ribs. The line of Set Feet, Thick Hide and Hold Fast. |
| 37 | `shadow` | `shadow.png` | Shadow (line) | A half-shut eye: an upper lid curve and a lower lid curve with a small pupil half hidden. The line of Patient Eye, Cheap Shot and Extra Doses. |
| 38 | `sigil` | `sigil.png` | Sigil (line) | A straight line of three abstract glyph marks joined by one thin stroke, the last mark brighter (larger). The line of Steady Line, Bright Script and Quick Chalk. |
| 39 | `outburst` | `outburst.png` | Outburst (line) | A heart with a swelling ring of four steps rising from it, each larger than the last. The line of Clear Pulse, Hot Blood and Second Breath. |
| 40 | `bonds` | `bonds.png` | Bonds and Tending (line) | Two open rings linked like chain links, a heart-shaped knot where they cross. The line of Gentle Hands, Kindled and Held Close. |
| 41 | `figments` | `figments.png` | Figments (line) | A picture frame with a small shape forming inside it out of scattered dots. The line of Quick Sketch and Spare Charge. |
| 42 | `faith` | `faith.png` | Faith (line) | A pair of cupped hands around one small flame. The line of Vigil, Shelter and Covering Prayer. |

(In rows 34 to 42 the `Id` column is the line key the code uses, a key of `start_boon.names` in `data/survival.json`; the
catalogue ids are `icon-boon-guns`, `-blades`, `-guard`, `-shadow`, `-sigil`, `-outburst`, `-bonds`, `-figments`, `-faith`.)

## D. Path-map markers (3): the camp, the vault's guard, the vault

**What they are for:** the survival path map draws an inked marker for each node kind, as a mask in the node's state
colour at 32 to 48 px inside a ring; ten kinds have one (`art/icons/survival/markers/`), these three still draw a line
icon from `runIcons.ts` (`PathMap.tsx`, `MARKER`: "kinds not here (start, vault_guard, vault)"). **Mode:** white flat ink.
**Id:** the node kind the code asks for: `survival-node-<kind>`, built from `art/icons/survival/markers/<kind>.png` (the
catalog `survival_art` sheet's `marker_exports`; Claude adds the three entries and the three `MARKER` keys). **Base prompt
and references:** section C's. These three are also numbers 3, 12 and 13 of the marker sheet of
`GPT-PROMPTS-2026-11-13-survival.md` prompt 67; asked here one by one because the sheet was returned with ten.

| # | Id | File | Name | Paint |
| --- | --- | --- | --- | --- |
| 43 | `start` | `start.png` | The camp | A small camp tent with a pennant on its peak, one flap tied back, a ground line under it. The party's starting place at the left edge of the map. |
| 44 | `vault_guard` | `vault_guard.png` | The vault's guard | A horned skull, front on, heavy brow, the horns swept up and out, two cuts for the eyes. Read it next to the Elite's horned mask (`elite.png`) and the Boss's door (`boss.png`): it must differ at 32 px (more bone, fewer plates, no mask rim). |
| 45 | `vault` | `vault.png` | The vault | A treasure chest with its lid shut, two iron bands and a front lock plate, one corner of the lid slightly raised. It is the guarded reward on the dead-end spur. |

## E. Survival's faces and places (15): three keepers and twelve backdrops

**What they are for:** every safe node of Survival opens a place with a keeper's face on it (rules 1.42 and 1.46; the faces
are `data/survival.json` `faces`): the shop (six, one per setting), the Forge, the training ground, the shrine, the rest
and the Crossroads, and the camp before node 1. Six keepers are painted and wired; the faces below are still on a
world-pool portrait and a plain panel (`portrait_pending`, `backdrop_pending` in the data). **Id:** the data's own
`portrait` and `backdrop` ids; `ShopScreen.tsx` and `PlaceScreen.tsx` ask the built asset of that name (`art(id)`), and the
validator refuses an id that is neither catalogued nor pending; Claude catalogues each under its id in `survival_art`, drops
the `*_pending` flag in `data/survival.json`, and adds the build line (the build today emits keeper portraits as
`survival-keeper-<setting>` only). **Save as** the id plus `.png`: portraits `art/portraits/survival/<id>.png`, backdrops
`art/illustrations/survival/nodes/<id>.png`.

### E1. Keeper portraits (3), Heavenprint portrait mode

**Base prompt (paste first; copied from `GPT-PROMPTS-2026-11-13-survival.md` batch 4):**

> Create an original Project Heaven Cry illustration in HEAVENPRINT. Use the attached approved Original 27 and New
> Faces images as the painting authority: expressive ink and opaque gouache, deliberate angular form, selective
> dry-brush scumbling, restrained hatching, charcoal lost edges and warm ivory accents. Faces have believable anatomy
> and restrained stylization (not enormous eyes, not interchangeable pointed chins, not flat cel shading) and specific
> emotional acting. Paint forms directly; avoid photographed skin with a texture overlay. Preserve local material
> colours and quiet dark areas. Match the references' finish without copying their characters, clothes, composition or
> incidental accessories. Follow the lore for tools and magic. Format: 4:5, 800 x 1000 PNG, one character, shown from
> the chest or waist up, one visible action, one specific emotion, one useful setting hint behind them. No
> unrequested text, frame, UI or watermark; no real-world person, brand or recognisable character.

**Attach:** `art/portraits/world/new-faces/orren-vask.png`, `.../ivara-drenn.png`, `art/portraits/survival/keeper-ahoc.png`
and `keeper-city.png` (the delivered keepers: same hand and finish), and one Original Heavenprint portrait. The eye line is
about 22% from the top; the speech card sits under the portrait. Each is a new person: not a copy of the stand-in the game
shows now. Names are Suggested (rules item 2914).

| # | Id | File | Name | Paint |
| --- | --- | --- | --- | --- |
| 46 | `forge-armourer` | `forge-armourer.png` | Hesk Varro, the armourer | The armourer of the Forge, standing at a bench: a broad, sun-creased man of about fifty with a scorched leather apron over mismatched plate, a hammer and a calliper in his belt, a half-fitted pauldron on the vise in front of him. Action: running a thumb along an edge to test it. Emotion: unhurried, proud of the work, hard to impress. His line: "Steel remembers how it was treated." (Stand-in today: `orren-vask`.) |
| 47 | `train-sergeant` | `train-sergeant.png` | Nara Dusk, the drill sergeant | A lean woman of about forty-five in a worn drill-yard coat with a sergeant's plain cloth stripes (abstract bars, no letters), a whistle on a cord, sandbags and a target dummy behind her. Action: pointing at the viewer with two fingers, "again". Emotion: flinty, bored by excuses, secretly invested. Her line: "On the line. Again. Until it's boring." (Stand-in: `captain-nara-dusk`; paint a new person, not that portrait.) |
| 48 | `event-broker` | `event-broker.png` | Teo Vant, the Crossroads broker | A road-worn dealer at a crossroads stall: a wiry man in his late thirties in a dusty travelling coat with many pockets, a canvas awning above, three small wrapped bundles on the board in front of him. Action: tapping the board once, as if to say "one deal each". Emotion: friendly and calculating, a man who has seen every kind of customer. His line: "Everyone who walks this road wants something. So do I." (Stand-in: `veyra-salt`.) |

(The medic `rest-medic` already has a painting, `art/portraits/survival/rest-medic.png`, delivered as the brief's number 38:
it needs only its catalog id, section I. The shrine's face draws the rolled patron's own portrait, by design: nothing to paint.)

### E2. Backdrops (12), Heavenprint scene mode

**What they are for:** under a dark gradient behind a keeper's place, cropped to cover the middle column; the keeper's
portrait stands on the left, so **the left third is the calmest and darkest part**, and the right third will be hidden
under a 90% dark gradient, so keep it mid-dark and plain.

**Base prompt (paste first; the scene block copied from `GPT-PROMPTS-2026-11-13-survival.md`, with its backdrop paragraph
replaced for a place with a keeper):**

> Paint one wide environment illustration for a game in Heavenprint: hand-painted opaque gouache and ink with broken,
> directional brush strokes, selective dry-brush scumbling, restrained hatching where a crease or an edge needs it,
> charcoal lost edges, warm ivory accents on the focal edges, deliberate angular architectural forms in layers
> (foreground, middle, far), and quiet low-detail areas. Not line art, not a photograph, not a 3D render, no airbrushed
> gloss, no uniform digital sharpness, no cinematic lens flare. Match the attached Heavenprint scene references for
> brushwork, finish and layering. **This is the backdrop of a place where a shopkeeper or a keeper stands in front of the
> picture:** no characters, no creatures, no figures of any kind, **the left third calm, dark and low-detail** (the keeper
> stands over it), the main props and the strongest values in the middle third, and the right third plain and mid-dark
> (it sits under a heavy dark gradient). Keep the overall value range mid-dark and the contrast gentle, so that the picture
> still reads when darkened to about 40%. Camera: a raised three-quarter view looking into the place; no strong vanishing
> lines converging on the centre. One clear light source; light is locally coloured by the scene, never tinted by a skill
> or attribute colour; no glowing bloom. 16:9, 2560 x 1440 PNG if you can, never smaller than 1920 x 1080. No text, no
> letters, no numbers, no signs with writing (blank or abstract marks only), no logos, no UI, no frame, no border, no
> watermark. Everything is invented: nothing recognisable from real-world works, brands, buildings or places.

**Attach (once per session):** `art/illustrations/m813/outpost813.png`, `art/illustrations/m813/shield-line.png`,
`art/illustrations/proving-ground/drill-yard.png`, the setting's own first backdrop from
`art/illustrations/survival/backdrops/` (so the shop is the same place: `ahoc-a-gate`, `city-a-archway`, `field-a-ridge`,
`works-a-dock`, `shrine-a-steps`, `rim-a-airlock`), and one portrait for the paint, `art/portraits/world/new-faces/orren-vask.png`.

| # | Id | File | Place | Paint |
| --- | --- | --- | --- | --- |
| 49 | `survival-camp` | `survival-camp.png` | The camp (before node 1) | A dusk camp at the edge of the chapter outpost's land: a banked fire with a kettle, the squad's packs, bedrolls and ammunition crates set in a loose ring, a lean-to of grey tarpaulin, long shadows. No figures at all. Calm centre (the loadout cards sit over it). Cool dusk blue, one warm fire, rust-red crate stencils (no letters). (No data row names it yet: the camp is the loadout screen; the id is S10's.) |
| 50 | `shop-ahoc` | `shop-ahoc.png` | Ledda Kroll's shop, AHOC chapter outpost | The chapter's quartermaster cage in a loading bay: a wire-mesh counter, ledgers on a shelf, crates and racked rifles behind, a hanging amber work lamp, ceramic-grey panels with ghosted hazard stripes. Cold strip light and amber glass. (Today: an M813 hangar painting behind a gradient. A 4:3 painting `shop-quartermaster.png` exists as a stop-gap.) |
| 51 | `shop-city` | `shop-city.png` | Sefa Mire's shop, Central City back streets | A back-alley stall under a shuttered arcade: a trestle of odd goods under a bare bulb, a rack of coats full of pockets, wet flagstones, crates that "fell off something", laundry lines overhead. Sodium amber and teal shadow. (Stop-gap: `shop-alley-dealer.png`, 4:3.) |
| 52 | `shop-field` | `shop-field.png` | Brann Okoye's shop, the old battlefield | A camp sutler's lean-to at the back of a trench: blades racked on the left, shells and grenades in crates on the right, a hanging storm lantern, churned mud and a sandbag wall, a cold ash sky. Mud-brown, ash-grey, one warm lamp. |
| 53 | `shop-works` | `shop-works.png` | Ivo Smetanin's shop, the machine works | A Smetanita trader's counter on a foundry gallery: lacquer-black shelving with brass fittings, focus gloves and mana cores in racked glass cases, a gantry and a casting floor glowing far below. Precise, expensive, clean in a dirty place. (Stop-gap: `shop-faction-trader.png`, 4:3.) |
| 54 | `shop-shrine` | `shop-shrine.png` | Sister Amaun's shop, the shrine and cathedral district | A reliquary keeper's stall in a cathedral side aisle: candle racks, small glass reliquary cases, a lancet window letting in pale light, incense haze kept painted and soft. Ivory stone, gold highlights, deep shadow. |
| 55 | `shop-rim` | `shop-rim.png` | Corra Vell's shop, the rim station | A rim chandler's stall in a cargo bay: tool crates, rope and cable coils, cores in a rack, container stacks, and through a viewport the black hole's thin ring of accretion gold. Gunmetal, ice blue, one gold line. |
| 56 | `forge` | `forge.png` | The Forge (Hesk Varro) | A workshop of armour: an anvil and a vise, racked plate and helmets half fitted, a grinding wheel, a banked furnace on the right, a dressmaker's frame of chain. Any setting: neutral soot and orange furnace light. No figures. |
| 57 | `training` | `training.png` | The training ground (Nara Dusk) | A drill yard: sandbag lanes, target dummies on posts, a rifle rack, a painted line across packed earth, a bell on a frame. Open sky, low sun. (Stop-gap: `proving-ground-drill-yard`; this one is Survival's own.) |
| 58 | `shrine` | `shrine.png` | The shrine (the patron's own face draws over it) | A roadside shrine: a lancet arch with an empty niche, a stone table with candles and small offerings, hanging prayer ribbons and a bowl of ash. No god's likeness and no figure; a plain votive place that any of the eight patrons can stand in front of. |
| 59 | `rest-safe-room` | `rest-safe-room.png` | The rest (Mallow's safe room) | A safe room for the night: cots with grey blankets, a stove, a medicine shelf with plain plus-mark tins (never a red cross), a lantern on a hook, a closed steel door, warm and quiet. (A 4:3 painting `rest-safe-room.png` exists as a stop-gap.) |
| 60 | `crossroads` | `crossroads.png` | The Crossroads (Teo Vant) | A wayside crossroads at dusk: a two-armed signpost (blank boards), a broker's covered cart with a small stall board, a lantern, tracks going off three ways across open ground. No figures. |

## F. Interface marks for 0.28.0 (5): two panel icons and three flash marks

**What they are for:** version 0.28.0 gives Survival's right-hand panel its own sections, **Run** and **Run board**
(`data/modes.json` `panels`: `mana`, `run`, `run_board`, `squad`; rules 1.54 item 11), each with a small mark in its header;
and the fight gets three flash cards. **Which kind of picture the flash cards are:** the turn banner
(`apps/web/src/game/turnIntro.tsx`, `TurnBanner`) is drawn entirely in code: a skewed dark slab with a white offset slab,
a text block (kicker, name, sub) and **one round 64 px picture** with a 3 px coloured ring; there is no painted strip in it.
The area-map round banner already puts a white ink mark in that circle (the AHOC seal). So the three flash cards ask for
**an ink mark each, not a painted strip**: white flat ink, readable inside a 64 px ring, with the words written by the game.
**Mode:** white flat ink, **base prompt and references of section C**. The ids are proposals (0.28.0 names none yet): panel
icons `icon-panel-<panel id>` (`run`, `run_board`), flash marks `banner-fight-start`, `-won`, `-lost`; save as
`art/icons/panels/<panel id>.png` and `art/icons/banners/fight-<start|won|lost>.png`; the 0.28.0 builder may rename, and
tells Claude.

| # | Id | File | Name | Paint |
| --- | --- | --- | --- | --- |
| 61 | `run` (0.28.0) | `panels/run.png` | Run (panel icon) | The stage's path as a sign: a winding trail of three dots joined by a dashed line, a small pennant at its far end. It must read as "where you are on the road". |
| 62 | `run_board` (0.28.0) | `panels/run_board.png` | Run board (panel icon) | A slate notice board on two legs with three short ruled lines and one small round tick on it, a bit of cord hanging from a corner. It must read as "the record of this stop". Different from #61 at 24 px: upright board, no trail. |
| 63 | `banner-fight-start` (0.28.0) | `banners/fight-start.png` | Fight start (flash mark) | A war horn blown: a curved horn with three short sound arcs leaving its bell. A call to arms; it must read in a 64 px ring. |
| 64 | `banner-fight-won` (0.28.0) | `banners/fight-won.png` | Fight won (flash mark) | A banner pole planted upright, its torn cloth flying out to one side in a steady wind, a short ground line under the pole. |
| 65 | `banner-fight-lost` (0.28.0) | `banners/fight-lost.png` | Fight lost (flash mark) | The same pole snapped in two and lying on the ground on a diagonal, the cloth trailing on the ground. It must differ from #64 by the fall: upright against slanted and broken. |

(The skill road map in 0.28.0 needs no new art: it uses the 27 skill portraits and the perk icons that exist.)

## G. The Roguelike lobby card (1)

**What it is for:** the lobby's mode card for the Roguelike mode ("Dungeons, a world map and companions."; locked, `art: null`
in `data/modes.json`; a plain panel with the AHOC seal stands in). The card crops the painting to about 16:7 at 1280 wide and
4:3 at 1920, so **the subject sits in the middle**. **Mode:** Heavenprint scene, no text. **Id:** the mode's `art` slot
follows Survival's (`survival-card-title`): `roguelike-card-title`, file `art/illustrations/survival/cards/title-roguelike.png`
(proposed; the card is for later, the mode is not open).

**Base prompt:** section E2's, with its "keeper stands in front" paragraph replaced by: *"This is a mode card: one calm
focal subject in the middle, dark quiet edges, a readable silhouette at card size, no characters, no creatures, no figures."*
Same references.

| # | Id | File | Name | Paint |
| --- | --- | --- | --- | --- |
| 66 | `roguelike-card-title` | `title-roguelike.png` | Roguelike | A stair going down into a torchlit stone vault, in front of it a stone table with an unrolled hand-drawn world map held flat by a lantern and a travel pack, three small bedrolls beside it (companions' places, no one in them). Dungeon, road and company in one picture. Warm lamp, cold stone. |

## H. Already requested elsewhere (not painted twice; counted in the total)

| Request | File | Count | State on 15 Nov 2026 |
| --- | --- | --- | --- |
| Faces for the enemies of Survival (every kind and tier, Bosses, vault guards, casters) | [`GPT-PROMPTS-2026-11-14-survival-foes.md`](GPT-PROMPTS-2026-11-14-survival-foes.md) | 71 | **Delivered** on `origin/art/survival-foes-2026-11-14` (71 files in `art/portraits/survival/foes/`), not merged to `develop`; the game has no foe-portrait lookup yet. The two missing Boss portraits (the Ork warlord, the upper-realm patch) are in it |
| Every character portrait repainted as a different person | [`GPT-PROMPTS-2026-11-14-portraits.md`](GPT-PROMPTS-2026-11-14-portraits.md) | 145 | Requested 14 Nov |
| Classes 3.0: 45 white-ink move, tending, Shadow and Figment icons and 6 Figment portraits (two more gear icons, the Attuner and the Toxin vial, are painted) | [`GPT-PROMPTS-2026-11-13-classes-3.0.md`](GPT-PROMPTS-2026-11-13-classes-3.0.md) | 51 | Requested 13 Nov; none delivered (no `art/icons/moves`, `shadow`, `tending`, `figments` folders). Its ids are not in `data/` as icon keys yet (the code does not exist: Classes 3.0 is being built), so they are not re-derived here |
| Map kit pieces held back: AHOC `ground-2` and `dress-2`, shrine `ground-2`, rim `wall-corner` (ART-REQUESTS S8) | [`GPT-PROMPTS-2026-11-13-survival.md`](GPT-PROMPTS-2026-11-13-survival.md) (header) | 4 | Requested 13 Nov. Optional and Leon's call, not counted: a one-tile container for each of six settings, and a lone wall post for each |
| The two fight maps whose layouts are set (M1 the Proving Ground, M6 Open ground) | [`GPT-PROMPTS-2026-11-12.md`](GPT-PROMPTS-2026-11-12.md) Job 3 | 2 | Waiting on Leon to play the layout first (ART-REQUESTS section 3) |

## I. Has art, needs wiring (nothing to paint)

Found by the same machine run; each is a code or data job for the builder or Claude, listed so nobody asks the artist for it.

| What | Why the game shows nothing |
| --- | --- |
| **Contraband** (`contraband`, category loot) | The painting exists (`gear-loot-contraband`), but `gearIconUri('contraband')` asks for `gear-contraband`: the build keeps a `loot-` file under its own stem, so it is never found. The same for the painted `loot-personal_effects`. One fix in `tools/build_web_assets.py` `gear_key` (or in the resolver) serves both, and section B's three materials |
| **Magazines** for `magistrate_pistol`, `brigade_auto_shotgun`, `repeating_crossbow` | `mag-magistrate`, `mag-brigade_shotgun`, `mag-repeating_crossbow` were delivered and are catalogued; `MAG_ART` in `gearIcons.ts` has no entry for those three guns (E2b is art-done) |
| **Restock lines** at the shop (`restock:supplies`, `restock:toxins`) | `iconOf` finds no gear icon for `restock:<resource>`; map them to the Field kit's and the Toxin vial's existing paintings (`gear-toxin_vial` exists with no item in `items.json` yet) |
| **Survival's lobby card** (`survival-card-title`) | `data/modes.json` has `art_pending: true`; the file `art/illustrations/survival/cards/title-survival.png` is catalogued as `survival-p058` and not under the id. Likewise `run-over.png` and `run-won.png` (no screen draws them yet) |
| **The medic** (`rest-medic`), **the Boss portraits** (`boss-robot-warframe`, `elite-crawler`) | Files exist (`rest-medic.png` as `survival-p038`; the Bosses on the foes branch); the data names the ids and the catalog has them under other keys or not yet on `develop` |
| **The shrine patron's face** (`shrine-patron`) | `portrait_pending` by design: the rolled patron's own portrait is drawn. Nothing to paint |

## Counts, total and order of need

| Group | Art mode | New in this file |
| --- | --- | --- |
| A. Items in the game with no icon (#1 to 8) | painted gear icon | **8** |
| B. 0.28.0 materials, ammo maker, Materials card (#9 to 13) | painted gear icon | **5** |
| C. Boon icons: 20 boons, 9 lines (#14 to 42) | white flat ink | **29** |
| D. Path-map markers (#43 to 45) | white flat ink | **3** |
| E1. Keeper portraits (#46 to 48) | Heavenprint portrait | **3** |
| E2. Backdrops: camp, six shops, forge, training, shrine, rest, crossroads (#49 to 60) | Heavenprint scene | **12** |
| F. Panel icons and flash marks, 0.28.0 (#61 to 65) | white flat ink | **5** |
| G. Roguelike lobby card (#66) | Heavenprint scene | **1** |
| **New in this file** | | **66** |
| H. Already requested: foes 71, portraits 145, Classes 3.0 51, map kit 4, two fight maps 2 | | **273** |
| **Total, with what is already requested** | | **339** |

(Of the 66: 10 are version 0.28.0's, marked above (gunpowder, casing, mana residue, the ammo maker, the Materials card, the Run
and Run board panel icons, the three flash marks); 2 (#43 and #49) name the camp, which no data row holds; the other 54 have
their id in `data/`. Of the 273 already requested, the 71 foes are painted and waiting to be merged.)

**Order of need** (what a player sees most, first):

1. **The first minutes of a run, before and in the first fight (15):** the camp backdrop (#49), the nine starting-boon lines
   (#34 to 42), the fight start, won and lost marks (#63 to 65), the Run and Run board icons (#61, 62). Alongside, from the
   foes file, the first setting's foes (human, robot and drone, its section A, plus the Chapter warframe and the AHOC vault
   guard): today every enemy is a token with a letter.
2. **After every fight (5):** the Materials card picture and the three materials, the ammo maker (#9 to 13).
3. **The first stage's shop, pack and safe places (17):** the AHOC shop backdrop (#50), the Forge, training ground, shrine,
   rest and Crossroads backdrops (#56 to 60), the armourer, the drill sergeant and the broker (#46 to 48), and the eight
   items with no icon (#1 to 8: the quiver first, every archer's).
4. **After each Boss (20):** the twenty boon icons (#14 to 33).
5. **The other five settings' shops (5):** #51 to 55.
6. **The path map's vault spur (3):** the camp, the vault's guard and the vault (#43 to 45).
7. **Later (1):** the Roguelike card (#66), when the mode opens.
Then the rest of the foes file (its own order), Classes 3.0 (its own order), the portraits repaint, the map kit's four pieces
and the two fight maps.

## For the builder (later; not the artist)

- `gear_key` in `tools/build_web_assets.py`: a file of kind `loot-` should build to `gear-<id>` when `<id>` is in the data
  (fixes Contraband and the 0.28.0 materials), after which `material-` files can be renamed `loot-`.
- Boon and starting-boon icons: look up `icon-boon-<id>` / `icon-boon-<line>` in the catalogue and keep the code glyph as
  the fallback; marker keys `start`, `vault_guard`, `vault` in `MARKER` (`PathMap.tsx`); the build line that emits
  `shop-<setting>`, `forge`, `training`, `shrine`, `rest-safe-room`, `crossroads` and the three keeper portraits under
  their ids (it emits `survival-keeper-<setting>` only today); drop each `*_pending` flag in `data/survival.json` as its
  file lands.
- 0.28.0: name the ids of the Materials card picture, the panel icons and the flash marks in `data/` and tell Claude, who
  renames the files and this table.
