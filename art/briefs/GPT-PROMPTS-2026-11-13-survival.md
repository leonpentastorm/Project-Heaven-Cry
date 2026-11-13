# Prompts for the artist (image generation): Survival mode art, 13 Nov 2026

> **Read this first (Leon and the lead, 13 Nov).** Make-order: (1) the 24 fight backdrops; (2) **the map kit for ONE
> setting only, the AHOC outpost, as a trial**: its starred core pieces first (ground, walls, the cover and object
> sprites): stop there and show them. Two things are being tested: do the ground textures repeat without a visible
> seam, and do the wall pieces butt together cleanly. If they do, make the other five settings' kits; if they do
> not, the game will draw walls itself and ground may be made another way, and only cover, objects and dressing are
> wanted for the other five. (3) The 18 painted maps (training material for the project's own style model; the
> game draws its maps from tiles and kit pieces). (4) Everything else. Do not paint all six kits before the trial
> has been looked at.
>
> **The trial passed (13 Nov; tested by repeating the ground 3 × 3 and butting the wall pieces together).** Keep
> that quality for the other five settings, with these corrections: (1) no dark outline on the ENDS of wall pieces
> that join (outline the outer long edges only: today a line shows at every joint); (2) the stripe or trim on door
> and broken pieces sits on exactly the same line as the straight piece's; (3) a third ground texture a setting with
> more character than a plain one (wear, stains, seams); (4) **walls half a tile thick are fine (Leon); what matters
> is that the part you move in reads as clear at a glance:** a doorway's opening is a clean, obviously walkable gap
> with the floor showing through, a broken section's gap likewise, and nothing of a wall piece spills onto the
> walkable tiles beside it.
>
> **The kits in the game's renderer (13 Nov, later: Survival steps 7 and 8, rules 1.45).** All six kits are in and the game
> draws its fight maps from them: the ground repeated under the tiles, walls chosen by their neighbours (straight,
> corner, end; the game makes a T and a cross from those, so **no T piece is wanted**), doorway gaps, cover and objects
> by kind, decals, dressing. Half-tile walls read well and the doorways read clear. **Redo four pieces** (held back
> until then; the game draws its plain fallback in their place): AHOC `ground-2` (a seam at the left-right join) and
> shrine `ground-2` (the octagon rows lose their step at the top-bottom join), both measured with
> `tools/art/kit_seams.py`, which every ground must pass ("clean") before delivery; AHOC `dress-2` (it has lettering:
> no text, ever); rim `wall-corner` (paint it as the rim's straight piece bent round: same panels, same shade). **Wanted
> besides:** a one-tile `container` per setting (the engine's container is one tile; the 1.5-tile one is drawn shrunk).
> The list is `ART-REQUESTS.md` S4.

Everything the Survival mode (`docs/ROADMAP.md`, "Survival mode" and "The roguelike: Leon's scope") needs that an image
generator can make **now**. Leon, 13 Nov 2026: "Artist is free, ask for more paintings, prepare for Survival mode
even." The artist is an image generator (GPT): **one image a prompt**. For each image paste **the style block of its
batch, then the numbered line**, and attach the references the batch names.

**Why a kit, and the new total.** The game draws maps from pieces (batch 1c, 216 of them), because a painted map fixes where cover can stand and a fight's walls, cover and objects are placed by data and by the Survival encounter generator. Kits, backdrops and painted maps of one setting must look like the same place. The painted maps (1b) stay as training material for Leon's style model. **Total now 294 images** (78 + 216).

**Every delivery is a review candidate until Leon approves it.** Send the files to Leon; Claude adds them to the catalog
and runs the checks (`python3 tools/validate_art.py`, `npm run assets`).

**Paths are a proposal** (Leon and Claude may rename them at integration): scenes and cards go in
`art/illustrations/survival/` (backdrops in `backdrops/`, the path map in `map/`, node cards in `nodes/`, run cards in
`cards/`), portraits in `art/portraits/survival/`, gear re-dos replace the files in `art/icons/gear/` (same names).

## Counts (294 images)

| Batch | What | Images | Style block |
| --- | --- | --- | --- |
| 1 | **Fight backdrops**: six settings, four each (also the scenes-model training set) | **24** | Scene block (below) |
| 1c | **The map kit** (what the game assembles maps from: ground tiles, decals, walls, one sprite per object kind, set dressing; 36 a setting) | **216** | Kit block (below) |
| 1b | **Painted battle maps** (top-down, three a setting; training material first) | **18** | Map block (below) |
| 2 | **The path map**: two directions for Leon to pick from | **2** | Scene block, map variant |
| 3 | **Node scenes**: shop (3), free rest (2), Elite's lair, Boss's arena door, reward cache | **8** | Scene block, card variant |
| 4 | **People**: shopkeepers (3), field medic, mission-giver, Elite and Boss faces (5) | **10** | Portrait block (copied from the 5 Nov style guide) |
| 5 | **Gear follow-ups**: three missing magazines and ten re-dos for 32 px | **13** | Gear block (copied from `GPT-PROMPTS-2026-11-13-gear.md` section 1) |
| 6 | **Survival cards** (optional, last): title, run over, run won | **3** | Scene block, card variant |

## The order to make them in

What the first playable Survival build needs first:

1. **Batch 1, settings 1 to 3 first** (12 backdrops: the AHOC outpost, the Central City back streets, the Daggerfall
   battlefield). A run needs one setting per fight to start; send **the first four (the AHOC outpost set) to Leon as the
   style check** for the whole scenes set, then carry on without waiting.
2. **Batch 2** (the path map): the first screen of the run; Leon picks one of the two.
3. **Batch 3** (node scenes) and **batch 4** (the shopkeepers, medic, mission-giver first; the five Elite and Boss faces
   later): the shop and the rest need them.
4. **Batch 1c, the map kit** (right after the backdrops and BEFORE the painted maps; settings 1 to 3 first, the AHOC kit to Leon as the kit style check; the core 21 pieces of a setting first).
4b. **Batch 1b, the 18 painted battle maps** (after the kit; settings 1 to 3 first, so each setting has its matched set of backdrops and maps early). Training material first (Leon, 13 Nov: "painted map too, let it chew on it so we have enough for the LoRA later"); whether the game goes back to showing painted maps is a later design decision, not this request's.
5. **Batch 1, settings 4 to 6** (the other 12 backdrops).
6. **Batch 5** (small, fixes the backpack and shop grid).
7. **Batch 6** last.

**Why consistency matters more than any single picture:** every backdrop in batch 1 and every map in batch 1b (and the cards and node scenes of
batches 2, 3 and 6) is also **training material for Leon's scenes model** (`FORGE-PHC.md`: it needs 20 to 40 consistent
backgrounds, and these 24 are that set, and the 18 maps are the second set Leon trains on). A slightly weaker picture in the same hand beats a brilliant one in another
style: same brushwork, same light logic, same calm centre, same camera height in every one. If a picture drifts (glossy,
cinematic, photographic, people in it), redo it, do not pass it.

---

## The scene style block (batches 1, 2, 3 and 6)

There is no separate scene brief in the repo. The M813 brief and the style guide's "Wider world illustrations" and
"World-scene addition" (`art/style-guide/PHC-Style-Guide.md`) are the authority; the block below is written from them and
is **the one scene block for all of this file**. Paste it at the start of every scene prompt.

> Paint one wide environment illustration for a game in Heavenprint: hand-painted opaque gouache and ink with broken,
> directional brush strokes, selective dry-brush scumbling, restrained hatching where a crease or an edge needs it,
> charcoal lost edges, warm ivory accents on the focal edges, deliberate angular architectural forms in layers
> (foreground, middle, far), and quiet low-detail areas. Not line art, not a photograph, not a 3D render, no airbrushed
> gloss, no uniform digital sharpness, no cinematic lens flare. Match the attached Heavenprint scene references for
> brushwork, finish and layering. **This is a backdrop that sits behind a tactical tile map and game UI:** no characters,
> no creatures, no figures of any kind (a distant empty vehicle or a parked machine is fine), a calm and open centre
> (the middle 50% of the frame is a plain, low-contrast, walkable-looking ground or floor plane with only soft
> texture), and the detail, props, architecture and the strongest values pushed to the edges and corners. Keep the
> overall value range mid-dark and the contrast gentle in the centre, so that the picture still reads when darkened to
> about 40% under a grid. Camera: a raised three-quarter view looking into the place (not a flat top-down map and not a
> ground-level wide shot); no strong vanishing lines converging on the centre. One clear light source; light is locally
> coloured by the scene, never tinted by a skill or attribute colour; no glowing bloom. 16:9, 2560 x 1440 PNG if you
> can, never smaller than 1920 x 1080. No text, no letters, no numbers, no signs with writing (blank or abstract marks
> only), no logos, no UI, no frame, no border, no watermark. Everything is invented: nothing recognisable from
> real-world works, brands, buildings or places.

**Attach as references (once per session):** `art/illustrations/m813/outpost813.png`, `art/illustrations/m813/shield-line.png`,
`art/illustrations/proving-ground/drill-yard.png` (the three Heavenprint scenes in the game; take brushwork, finish and
layering, not their composition), plus the title-screen back layer `art/ui/title-screen/title-back.png` for sky and
distance, and one portrait for the paint itself, e.g. `art/portraits/world/new-faces/orren-vask.png`. Palette:
[`palette.json`](../style-guide/palette.json) (ground `#0A0D13`, panels `#10151F`, ivory text `#E7EBF3`, muted
`#A3AEC2`: the backdrops sit in these neutrals with the setting's own local colour).

**The six settings** (each is a place the lore supports and the enemy table can populate; `data/enemies.json` has the
five tiers and `data/loot_tables.json` the kinds human, crawler, ork, upper_realm, cursed, celestial, robot, machine,
turret, drone and beast):

| # | Setting | Source | Who fights there |
| --- | --- | --- | --- |
| 1 | **An Anti-Heaven Operations Command chapter outpost**: corridors, a loading yard, a control room, a vault | `docs/lore/Factions.md` section 0 and the chapter template (bases on every human planet; a containment-foundation look, in decay) | human, robot, turret |
| 2 | **A Central City back street and rooftop district**: wet alleys, shuttered stalls, rooftops with laundry lines and signal masts | `docs/lore/Sector-Earth.md` (Central City, bank cards and gold coins, the inner ring) and `Factions.md` section 1 (Central Command, CCEC, Hellraiser Divisions) | human, crawler, drone |
| 3 | **A wrecked battlefield of Operation Daggerfall's kind**: trenches, craters, wrecked walkers, the nuked world's sky | `Sector-Earth.md` ("the dead world nuked in Operation Daggerfall", about 3800) and the title-screen brief's battlefield | ork, human, beast, cursed |
| 4 | **A machine works and drone foundry**: gantries, casting floors, assembly lines, a scrap yard | `Sector-Earth.md` (Robots: NPCs made by NPCs, the Factory's machines) and `docs/lore/MPAT-and-M813.md` (the Factory) | robot, machine, turret, drone |
| 5 | **A shrine and cathedral district under a patron's eye**: lancet arches, a nave, a courtyard of candles, a reliquary | `Factions.md` section 3 (the Lumeri Church, the Adamantile Brigade) and `data/patrons.json` (the eight patrons) | human, upper_realm, celestial, cursed |
| 6 | **A rim station on the edge of the dark**: a Thousand World Legion outpost under a black hole | `Factions.md` section 2 (Outposts 1, 813, 921) and `MPAT-and-M813.md` (B813, the accretion ring) | robot, drone, machine, human |

Every set of four varies the way a level does: **A entrance, B interior, C open ground, D the heart of the place.**

---

## Batch 1: fight backdrops (24; the priority, and the scenes-model set)

Save as `art/illustrations/survival/backdrops/<setting>-<a|b|c|d>-<name>.png` (proposal).

### Setting 1: AHOC chapter outpost (human, robot, turret)

Light: cold white strip lights and amber work lamps; stencilled faded marks (no letters) in rust-red and ivory.

**1. `ahoc-a-gate.png`** The outpost's entrance: a wide armoured gate set into a rock face, a sealed blast door half open, sandbags, a lowered barrier arm, floodlit gravel in front. A chapter hung on the edge of a frontier world, tired and well kept. Detail on the gate frame left and right; the gravel centre is open.

**2. `ahoc-b-corridor.png`** An interior junction: two crossing corridors of riveted ceramic-grey panels, pipe runs and cable trays along the walls, an overhead gantry, a dim amber lamp at each far end. The central floor is clear, scuffed and plain. Doors and stencilled marks at the edges.

**3. `ahoc-c-yard.png`** A loading yard under open sky: concrete apron, stacked sealed crates and drums along two sides, a parked empty cargo hauler at one edge, a watchtower at the corner, dust and low cold sun. The middle of the yard is clear.

**4. `ahoc-d-vault.png`** The heart: a circular records vault or control hall, banks of dark machines and filing cabinets in a ring around a bare floor, a single overhead light cone, a great sealed door on the far wall with a faint ivory seal-like shape (abstract, no lettering). Quiet, secret and slightly sinister.

### Setting 2: Central City back streets and rooftops (human, crawler, drone)

Light: dusk, a violet-blue sky, warm shop lamps and wet reflections; blue-grey `#5394AC` shadows, clean ivory walls.

**5. `city-a-archway.png`** The mouth of a back street: a tall archway between two terraced buildings, a hanging lamp, shuttered stalls and crates just inside, a thin wet gleam on the cobbles leading in. Edges: window shutters, drainpipes and cables. Open cobbled centre.

**6. `city-b-passage.png`** Inside an old arcade or covered market passage after hours: iron ribs overhead, closed stall counters along both sides, a few lit lanterns, scattered paper and crates. A clear central aisle of tiles.

**7. `city-c-rooftops.png`** A rooftop terrace joining several roofs of different heights: laundry lines, water tanks, signal masts, stair housings and chimney stacks at the edges, the lit city rising behind. Flat roof gravel in the centre.

**8. `city-d-square.png`** The heart: a small plaza with a dry fountain and a stopped clock tower on one side, shuttered cafe fronts, one lit window above, street lamps flickering. The paving in the middle is open and quiet.

### Setting 3: Daggerfall-type battlefield (ork, human, beast, cursed)

Light: low smoky orange sun through haze, mana motes drifting up from the dead (faint warm ivory specks at the edges only), ash and mud.

**9. `field-a-ridge.png`** The approach: a trench line and broken rampart on a ridge, sandbags, a fallen banner (blank cloth), a path winding down into a cratered plain, smoke on the horizon. Detail on the rampart left and right, open churned earth in the centre.

**10. `field-b-trench.png`** Inside a wide trench junction: duckboards, sandbag walls, an ammunition crate, a wrecked field gun at one end, cables. A clear central trench floor and spur.

**11. `field-c-craters.png`** Open no-man's-land: a plain of shell craters, a half-sunk wrecked walker and tank hulls at the edges, barbed wire, burnt stumps; the middle is flat cracked mud.

**12. `field-d-wreck.png`** The heart: the crashed hull of a huge dropship or fallen war machine lying across the far side, ribs of metal against a sulphurous sky, a ring of open ash ground in front of it. A suggestion of the nuked sky (a pale scar of light on the horizon), nothing explicit.

### Setting 4: machine works and drone foundry (robot, machine, turret, drone)

Light: furnace orange and white sparks from a far casting, cool blue work lamps; steel, soot and ceramic white.

**13. `works-a-dock.png`** The entrance: a loading dock where a conveyor tunnel meets the works, a roller door half raised, hooks and chains, stacked ceramic shell casings (blank), a warning stripe on the floor (abstract bars, no letters). Open dock floor.

**14. `works-b-assembly.png`** An assembly hall: two parallel conveyor lines with unfinished robot torsos and limbs (empty shells, faceless, no faces), robot arms folded overhead, lamps on cables. A clear walkway down the middle.

**15. `works-c-scrapyard.png`** An open scrap yard behind the works: heaps of broken robot parts, cranes, a magnet gantry, rain barrels, a high chain-link fence. Flat packed-earth centre.

**16. `works-d-furnace.png`** The heart: a casting hall with a great ladle and furnace mouth at the far wall, catwalks, glowing slag channels cut into the floor edges, heat haze; the central floor is dark iron plate, plain.

### Setting 5: shrine and cathedral district (human, upper_realm, celestial, cursed)

Light: candlelight, gold `#F2C46A` and ivory against deep violet shadow; stained-light in the lancet windows, no figures.

**17. `shrine-a-steps.png`** The approach: broad worn steps up to a pair of tall lancet doors, braziers either side, shuttered pilgrim stalls, a banner (blank) on a pole. Open stone landing in the centre.

**18. `shrine-b-nave.png`** The nave interior: a long hall of pointed arches and pillars, pews pushed back, fallen candles, shafts of light through high windows, a bare central aisle of flagstones.

**19. `shrine-c-cloister.png`** An open cloister courtyard: arcaded walkways around a dry garden and a covered well, a leaning statue-less plinth, ivy, a grey sky. The courtyard grass and stone is open.

**20. `shrine-d-altar.png`** The heart: an altar apse with a bare great dais, a ring of candles and a suspended censer, a huge round window behind it casting a pool of gold light on the floor, a hint of presence (a faint warm glow in the air, no figure, no face).

### Setting 6: rim station (robot, drone, machine, human)

Light: the cold glow of a black hole's accretion ring (a dark disc, a thin bright ring bending starlight) above, a few warm lamps below; steel blue-greys and ivory.

**21. `rim-a-airlock.png`** The arrival: an airlock vestibule with a heavy round pressure door open, a docked shuttle's boarding tube visible through a viewport, gantry and stencilled bars. Clear metal-grid floor.

**22. `rim-b-hangar.png`** The hangar bay: gantries, empty cradles, a gutted shuttle at the edge, hanging cables, big viewport slits with starlight. Open painted bay floor. (A calmer sibling to the existing `outpost-hangar.png`; do not copy it.)

**23. `rim-c-pad.png`** The open rear landing pad under the black hole: a scorch ring, loose crates, a mast with a cracked lamp, the dark disc and its bright ring filling the upper sky. Open pad in the middle.

**24. `rim-d-core.png`** The heart: the station's power core chamber, a ring of resonant conduits around a dim central well, catwalk rails at the edges, cold blue light rising from below. The central floor is plain deck plate.

---

## Batch 1c: the map kit (216 pieces; the game draws maps from these)

**Why a kit (Leon, 13 Nov 2026: "Can we do like one of those kits that you can assemble to make a map? A painted painting
means we only get to place cover where the detail is right?").** He is right: a finished painted map fixes where cover can
stand, but a fight is a 26 x 26 grid whose walls, cover and objects are placed by data (and, in Survival, by an encounter
generator). So the game **assembles** its maps from PIECES: a ground texture repeated across the map and darkened under a
grid, decals, walls repeated along a line of solid tiles, and one sprite for each object kind the engine places. The
painted maps of batch 1b stay in the file as training material for Leon's own style model, not as what the game shows.
**Kit, backdrops and painted maps of one setting must look like the same place** (same palette, materials, light): paint a
setting's kit with that setting's first backdrop attached.

**Make order: right after the backdrops, BEFORE the painted maps.** Settings 1 to 3 first (send the AHOC set to Leon as the
kit style check), then 4 to 6. Inside a setting the order is: ground, walls, then objects (the cover kinds first: crate,
low wall, pillar, barricade, container, barrel, door), then decals and dressing.

**What the engine places** (`data/objects.json`, 23 kinds, and `data/maps.json`): terrain `.` open ground, `#` solid wall,
`~` difficult ground; objects crate, low_wall, pillar, barricade, door, hole, trap, fire, toxic, barrel, rubble, container,
terminal, lamp, poi, exit, camera, alarm, turret, sigil_wall, cache, sigil_mark, pile. **Not in the kit:** `poi` (the
existing `obj-poi-marker` serves), and `sigil_wall`, `sigil_mark` and `pile`, which the engine draws as effects and item
piles. `rubble` and `toxic` are decals (K-decal 1 and 2 of each setting); `hole`, `trap`, `fire` are sprites; `door` has a
closed and an open sprite; crate, pillar and barricade, the three the engine can destroy, also get a "broken" sprite
(rubble of themselves). Everything else has one sprite. **Cover reading:** full cover must LOOK like it blocks a standing
person (taller bulk, strong dark edge); half cover must look waist-high (lower, lighter, a visible top face).

**The view, scale and size (matches what exists).** The 25 object sprites in `art/sprites/objects/` are `painted-topdown`
(catalog `art_mode`): **straight overhead with a little top face and a hint of side (no perspective tilt), RGBA, 256 x 256
px for one tile (larger only where noted), the object inside an 80% safe box (about 205 px), top-left
light.** The kit uses **exactly that view and size**, so kit sprites sit beside the existing ones. One difference: the
existing sprites bake in a short bottom-right shadow; **kit sprites carry no shadow at all** (the game adds its own; the
older sprites are re-done to match later). A tile is 1.5 m = 256 px in the master (the game shows it at about 46 to 64 px;
the catalog previews are 46, 64 and 128): **a crate is about a metre (about 170 px), a standing person's footprint is
about a third of a tile (about 85 px), a door is one tile wide, a container is one and a half tiles long.** Everything
must stay readable at 64 px: bold shapes, a clear dark edge, no fine detail that dies when shrunk.

**The kit style block (paste at the start of every kit prompt, after the setting's kit paragraph):**

> Paint one game-map kit piece in Heavenprint: hand-painted gouache and ink with broken, directional brush strokes,
> selective dry-brush scumbling, restrained hatching and warm ivory accents, the same hand as the attached backdrops and
> sprites, but **simplified and bold so it reads at 64 px**. **Straight overhead view, no perspective tilt, no horizon.**
> **Flat, even top light with one consistent soft highlight from the upper left on edges and tops across the whole kit;
> NO cast shadow, NO drop shadow, NO ground contact shadow, NO glow or bloom, NO lens effects.** Scale: **one tile = 1.5 m =
> 256 px**; a crate is about a metre, a standing person's footprint about a third of a tile. **No text, no letters, no
> numbers, no signs with writing (abstract marks only), no logos, no figures, no creatures, no UI, no frame, no border, no
> watermark.** Everything is invented: nothing recognisable from real-world works, brands, buildings or places.
> **For a SPRITE, overlay or wall piece:** a **transparent background (PNG with alpha)**, the object centred inside an 80%
> safe box in a **256 x 256 px** canvas (or the size stated), crisp clean edges, no halo, nothing touching the canvas edge.
> **For a GROUND texture, exactly this (it is how to ask an image generator for a seamless tile):** "a seamless tileable
> square texture, **1024 x 1024 px**, straight top-down, **tileable, the left and right edges match and the top and bottom
> edges match when the image is repeated**, flat even lighting with no directional light and no cast shadows, no vignette,
> no border, no frame, no large single feature or landmark that would show as a repeat, no objects on it, even mid-dark
> value with gentle low-contrast variation." The game repeats it across the map, can rotate it by 90 degrees, and darkens it
> under a grid, so keep it calm.

**Wall pieces (all five of a setting share these rules).** A wall is seen from above as a flat thick band with a dark outline
and a lighter cap face, **square to the grid**. Each piece is a **256 x 256 px** tile cell; the wall band is **half a tile
thick (128 px), centred** in the cell; ends are **flat-cut, exactly at the cell edge**, so pieces butt together with no gap
or overlap; no perspective, no side faces, no baked shadow. Pieces: `wall-straight` (runs left to right through the cell),
`wall-corner` (an L: joins the left edge and the bottom edge), `wall-end` (a flat cap on the right, runs out to the left
edge), `wall-door` (two short wall stubs with jambs, an empty 128 px gap between them: the game puts a door sprite in it),
`wall-broken` (a straight run whose middle is a ragged breach, rubble at the edges of the gap, still butts at both ends).
Saved facing east/right; the game rotates them.

At a connecting cell edge, carry the painted cap through the cut without a dark end outline. Keep the dark outline on
exposed edges. Align the painted stripe on the straight, corner, end, doorway and broken pieces to the same centreline
at every connection. Check straight runs and rotated corners at 256 px and 64 px.

**Where to save (a proposal; rename at integration):** `art/sprites/kit/<setting>/<piece>.png`, with `<setting>` one of
`ahoc`, `city`, `field`, `works`, `shrine`, `rim`; ground `ground-1.png` to `ground-3.png` (1024 x 1024, opaque); decals
`decal-rubble.png`, `decal-toxic.png`, `decal-scorch.png` (256 x 256, transparent, soft edges, sized to cover one tile and
to tile across several); walls `wall-*.png`; object sprites by the **engine kind id** (`crate.png`, `crate-broken.png`,
`low_wall.png`, `pillar.png`, `pillar-broken.png`, `barricade.png`, `barricade-broken.png`, `door.png`, `door-open.png`,
`hole.png`, `trap.png`, `fire.png`, `barrel.png`, `container.png` (384 x 256, one and a half tiles), `terminal.png`,
`lamp.png`, `turret.png`, `camera.png`, `alarm.png`, `cache.png`, `exit.png`); dressing `dress-1.png` to `dress-4.png`
(256 x 256, non-blocking, scattered on any free tile, meaning nothing in the rules).

**Per setting: 36 pieces** = 3 ground + 3 decals + 5 walls + 21 object sprites (19 kinds, three with a broken sprite and
the door with an open one) + 4 set dressing. **6 settings = 216 pieces** (the lead's guess was about 120; the engine's
kinds make it 36 a setting, so the first pass can stop at the core 21 of a setting marked **\***: ground-1, ground-2,
decal-rubble, decal-toxic, the five walls, crate, low_wall, pillar, barricade, door, door-open, container, barrel, hole,
fire, terminal, lamp).

### Kit ahoc: Setting 1: AHOC chapter outpost

Light: cold white strip light and amber work lamps. **Kit paragraph (paste after the kit style block):** Ceramic-grey panels, riveted plate, packed gravel, poured concrete, faded rust-red and ivory stencil bands (no letters). Accent: rust-red `#F65157` marks and amber lamp glass. Reads as a tired, well-kept containment base: grey ceramic, hazard stripes worn to ghosts, everything squared and bolted. Same place as the setting's backdrops and maps: reuse their materials and local colour.

**K1*. `art/sprites/kit/ahoc/ground-1.png`** GROUND, opaque 1024 x 1024 seamless tile. Packed grey gravel and concrete yard apron, fine pale aggregate, a few faint hairline cracks.

**K2*. `art/sprites/kit/ahoc/ground-2.png`** GROUND, opaque 1024 x 1024 seamless tile. Scuffed ceramic-grey floor plates with bolted seams every half tile and faint worn walking lanes.

**K3. `art/sprites/kit/ahoc/ground-3.png`** GROUND, opaque 1024 x 1024 seamless tile. Damaged floor: cracked concrete and plate with oil-dark patches, a peeled hazard stripe ghost, chipped edges.

**K4*. `art/sprites/kit/ahoc/decal-rubble.png`** DECAL (the engine's `rubble` kind), transparent 256 x 256. Rubble scatter: ceramic panel shards, grey chunks and dust. Soft ragged edge, centred, covers about one tile and overlaps well when repeated.

**K5*. `art/sprites/kit/ahoc/decal-toxic.png`** DECAL (the engine's `toxic` kind), transparent 256 x 256. Spilled coolant: a blue-green slick with a sheen, soft edges (the toxic spill).

**K6. `art/sprites/kit/ahoc/decal-scorch.png`** DECAL (hazard and burnt ground), transparent 256 x 256. Scorch: a soot-black blast patch fading to nothing at the rim.

**K7*. `art/sprites/kit/ahoc/wall-straight.png`** WALL piece, straight, 256 x 256 cell: ceramic-grey riveted panel wall with a darker cap band and a rust-red stripe along the top face, running left to right, half a tile thick, flat cut ends at the cell edges.

**K8*. `art/sprites/kit/ahoc/wall-corner.png`** WALL piece, corner, same wall and thickness: an L joining the left edge and the bottom edge, outer corner square.

**K9*. `art/sprites/kit/ahoc/wall-end.png`** WALL piece, end cap, same wall: it runs from the left edge to the middle of the cell and ends in a square finished cap, the right half empty.

**K10*. `art/sprites/kit/ahoc/wall-door.png`** WALL piece, doorway, same wall: two short wall stubs from each side with plain jambs, an empty 128 px gap in the middle (nothing in it), butting at both cell edges.

**K11*. `art/sprites/kit/ahoc/wall-broken.png`** WALL piece, broken section, same wall: a straight run with a ragged breach in the middle, brick-sized rubble at the gap, both ends flat cut at the cell edges.

**K12*. `art/sprites/kit/ahoc/crate.png`** CRATE (`crate`, half cover, destructible): a sealed grey ceramic supply crate with rust-red corner brackets; about a metre, waist-high look, centred.

**K13. `art/sprites/kit/ahoc/crate-broken.png`** CRATE broken: the same crate smashed to splinters and scraps, flat, low, same footprint, nothing standing.

**K14*. `art/sprites/kit/ahoc/low_wall.png`** LOW WALL (`low_wall`, half cover): a waist-high run of ceramic-grey panel, one tile long, with a worn rust-red cap stripe; fills the width of the tile, low and clearly waist-high with a visible light top face.

**K15*. `art/sprites/kit/ahoc/pillar.png`** PILLAR (`pillar`, full cover, destructible): a squat riveted ceramic-grey support column, square, with a hazard-stripe collar; strong dark edge, reads as taller than a person, fits one tile.

**K16. `art/sprites/kit/ahoc/pillar-broken.png`** PILLAR broken: the same pillar collapsed to a low heap of chunks, same footprint, lower and lighter than the standing one.

**K17*. `art/sprites/kit/ahoc/barricade.png`** BARRICADE (`barricade`, full cover, destructible): a full-height sandbag-and-plate barricade, tall tarped sandbags and a steel shield plate, one tile; fills the width of the tile.

**K18. `art/sprites/kit/ahoc/barricade-broken.png`** BARRICADE broken: the same barricade collapsed into a low scatter of parts, same footprint.

**K19*. `art/sprites/kit/ahoc/door.png`** DOOR closed (`door`): a plain grey ceramic door in a frame, closed; the door slab fills the gap; one tile wide, drawn to sit in a wall gap, flat-cut sides at the cell edges.

**K20*. `art/sprites/kit/ahoc/door-open.png`** DOOR open (`door`, open state): the same door slid open, slab pulled into the wall, jambs visible and the threshold clear; the same door seen open, same cell.

**K21*. `art/sprites/kit/ahoc/hole.png`** HOLE (`hole`): a round maintenance hole in the plate floor, open, black depth with a bent grating beside it; round or square, fits one tile, the depth reads as dark and void.

**K22. `art/sprites/kit/ahoc/trap.png`** TRAP (`trap`): a tripwire trap: two small stakes with a thin wire and a hidden charge, grey-brown; deliberately subtle but readable at 64 px.

**K23*. `art/sprites/kit/ahoc/fire.png`** FIRE (`fire`): a campfire-sized fire in a dented steel bin, flames from above, orange and ivory; fits one tile, bright core, no glow or bloom, flat painted flames.

**K24*. `art/sprites/kit/ahoc/barrel.png`** BARREL (`barrel`, half cover, explodes): a rust-red fuel drum with a hazard band and a bung; about 60 cm across, reads as dangerous.

**K25*. `art/sprites/kit/ahoc/container.png`** CONTAINER (`container`, half cover, holds loot), transparent 384 x 256: a long grey cargo container, a tile and a half long, with a latch bar and faded stencil bands, waist-high.

**K26*. `art/sprites/kit/ahoc/terminal.png`** TERMINAL (`terminal`): a wall-less standing field terminal, dark screen glass showing only abstract amber bars, no text; fits one tile.

**K27*. `art/sprites/kit/ahoc/lamp.png`** LAMP (`lamp`): a tall work lamp on a tripod, amber glass, seen from above as a lamp head and three feet; fits one tile.

**K28. `art/sprites/kit/ahoc/turret.png`** TURRET (`turret`, half cover): an emplaced automatic turret on a low ring mount, grey housing, twin barrels (waist-high cover); fits one tile, a single clear barrel direction (up).

**K29. `art/sprites/kit/ahoc/camera.png`** CAMERA (`camera`): a small pole-mounted camera dome as seen from above, grey, red status dot; small, about a third of a tile, centred.

**K30. `art/sprites/kit/ahoc/alarm.png`** ALARM (`alarm`): a wall alarm panel box, grey with a red lens, flat; small, about a third of a tile, centred.

**K31. `art/sprites/kit/ahoc/cache.png`** CACHE (`cache`, loot): a locked steel ration-and-ammo cache box, grey with a red seal strap; about a metre, waist-high look.

**K32. `art/sprites/kit/ahoc/exit.png`** EXIT (`exit`, the way out): a floor hatch with ivory chevrons painted toward it, "way out", no letters; fits one tile, reads as a place to leave by.

**K33. `art/sprites/kit/ahoc/dress-1.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Cables: a loose bundle of black and amber cables snaking across the floor. Low, flat, nothing taller than a few centimetres.

**K34. `art/sprites/kit/ahoc/dress-2.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Stencilled floor marking: a faded ivory arrow and boxed zone lines, no letters. Low, flat, nothing taller than a few centimetres.

**K35. `art/sprites/kit/ahoc/dress-3.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Pipe run: a short run of lagged pipe lying along the floor edge with brackets. Low, flat, nothing taller than a few centimetres.

**K36. `art/sprites/kit/ahoc/dress-4.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A dropped helmet-less ration tin and a scatter of bolts, nothing readable. Low, flat, nothing taller than a few centimetres.


### Kit city: Setting 2: Central City back streets

Light: dusk, violet-blue ambient with warm shop-lamp pools, wet surfaces. **Kit paragraph (paste after the kit style block):** Wet cobbles, ivory plaster, weathered brick, iron, canvas awnings, wood crates. Accent: the lamp-lit warm amber and the blue-grey `#5394AC` shadows. Reads as a lived-in old city: wet stone, shuttered stalls, laundry and iron. Same place as the setting's backdrops and maps: reuse their materials and local colour.

**K37*. `art/sprites/kit/city/ground-1.png`** GROUND, opaque 1024 x 1024 seamless tile. Wet dark cobblestones in an irregular pattern, a faint blue sheen.

**K38*. `art/sprites/kit/city/ground-2.png`** GROUND, opaque 1024 x 1024 seamless tile. Worn flagstone paving, pale and dry, mossy joints.

**K39. `art/sprites/kit/city/ground-3.png`** GROUND, opaque 1024 x 1024 seamless tile. Damaged street: broken cobbles, bare earth showing, puddle-dark patches, pavers missing.

**K40*. `art/sprites/kit/city/decal-rubble.png`** DECAL (the engine's `rubble` kind), transparent 256 x 256. Rubble scatter: brick fragments, plaster and tile shards. Soft ragged edge, centred, covers about one tile and overlaps well when repeated.

**K41*. `art/sprites/kit/city/decal-toxic.png`** DECAL (the engine's `toxic` kind), transparent 256 x 256. Toxic spill (the engine's `toxic` kind): standing water, a shallow dark puddle with a sheen and a floating leaf, soft edge, with a faint sour green-yellow tint so it reads as the toxic spill.

**K42. `art/sprites/kit/city/decal-scorch.png`** DECAL (hazard and burnt ground), transparent 256 x 256. Scorch: a smudged soot mark and ash from a thrown fire, soft edge.

**K43*. `art/sprites/kit/city/wall-straight.png`** WALL piece, straight, 256 x 256 cell: old brick and ivory plaster building wall with a slate cap and a darker mortar band, running left to right, half a tile thick, flat cut ends at the cell edges.

**K44*. `art/sprites/kit/city/wall-corner.png`** WALL piece, corner, same wall and thickness: an L joining the left edge and the bottom edge, outer corner square.

**K45*. `art/sprites/kit/city/wall-end.png`** WALL piece, end cap, same wall: it runs from the left edge to the middle of the cell and ends in a square finished cap, the right half empty.

**K46*. `art/sprites/kit/city/wall-door.png`** WALL piece, doorway, same wall: two short wall stubs from each side with plain jambs, an empty 128 px gap in the middle (nothing in it), butting at both cell edges.

**K47*. `art/sprites/kit/city/wall-broken.png`** WALL piece, broken section, same wall: a straight run with a ragged breach in the middle, brick-sized rubble at the gap, both ends flat cut at the cell edges.

**K48*. `art/sprites/kit/city/crate.png`** CRATE (`crate`, half cover, destructible): a wooden market crate with rope handles, slatted; about a metre, waist-high look, centred.

**K49. `art/sprites/kit/city/crate-broken.png`** CRATE broken: the same crate smashed to splinters and scraps, flat, low, same footprint, nothing standing.

**K50*. `art/sprites/kit/city/low_wall.png`** LOW WALL (`low_wall`, half cover): a waist-high brick garden or yard wall, one tile long, with a slate cap; fills the width of the tile, low and clearly waist-high with a visible light top face.

**K51*. `art/sprites/kit/city/pillar.png`** PILLAR (`pillar`, full cover, destructible): a squat round stone column with an iron collar, weathered; strong dark edge, reads as taller than a person, fits one tile.

**K52. `art/sprites/kit/city/pillar-broken.png`** PILLAR broken: the same pillar collapsed to a low heap of chunks, same footprint, lower and lighter than the standing one.

**K53*. `art/sprites/kit/city/barricade.png`** BARRICADE (`barricade`, full cover, destructible): a full-height barricade of stacked furniture, doors and barrels, lashed with rope, tall enough to hide behind; fills the width of the tile.

**K54. `art/sprites/kit/city/barricade-broken.png`** BARRICADE broken: the same barricade collapsed into a low scatter of parts, same footprint.

**K55*. `art/sprites/kit/city/door.png`** DOOR closed (`door`): a plain heavy wooden door with iron straps in a brick frame, closed; one tile wide, drawn to sit in a wall gap, flat-cut sides at the cell edges.

**K56*. `art/sprites/kit/city/door-open.png`** DOOR open (`door`, open state): the same door swung open against the wall, threshold clear; the same door seen open, same cell.

**K57*. `art/sprites/kit/city/hole.png`** HOLE (`hole`): an open drain or manhole shaft, iron cover pushed aside, black depth; round or square, fits one tile, the depth reads as dark and void.

**K58. `art/sprites/kit/city/trap.png`** TRAP (`trap`): a snare trap: a rope loop and weighted bag in the cobbles; deliberately subtle but readable at 64 px.

**K59*. `art/sprites/kit/city/fire.png`** FIRE (`fire`): a street fire in a barrel brazier, flames from above; fits one tile, bright core, no glow or bloom, flat painted flames.

**K60*. `art/sprites/kit/city/barrel.png`** BARREL (`barrel`, half cover, explodes): a wooden oil barrel with iron hoops and a faint red mark; about 60 cm across, reads as dangerous.

**K61*. `art/sprites/kit/city/container.png`** CONTAINER (`container`, half cover, holds loot), transparent 384 x 256: a covered market stall counter with a canvas awning folded back, a tile and a half long, waist-high.

**K62*. `art/sprites/kit/city/terminal.png`** TERMINAL (`terminal`): a street-side brass public terminal on a short post, dark glass, abstract glow only; fits one tile.

**K63*. `art/sprites/kit/city/lamp.png`** LAMP (`lamp`): a tall iron street lamp with a warm amber glass lantern, seen from above; fits one tile.

**K64. `art/sprites/kit/city/turret.png`** TURRET (`turret`, half cover): a wall-less stolen emplaced turret bolted to a cart, grey and mismatched, waist-high; fits one tile, a single clear barrel direction (up).

**K65. `art/sprites/kit/city/camera.png`** CAMERA (`camera`): a small iron-bracketed camera box on a bracket, as seen from above; small, about a third of a tile, centred.

**K66. `art/sprites/kit/city/alarm.png`** ALARM (`alarm`): a brass alarm bell box with a pull-chain, flat; small, about a third of a tile, centred.

**K67. `art/sprites/kit/city/cache.png`** CACHE (`cache`, loot): a locked iron-bound strongbox with a canvas wrap; about a metre, waist-high look.

**K68. `art/sprites/kit/city/exit.png`** EXIT (`exit`, the way out): a stair-head or cellar door lying open to the dark, with worn steps going down; fits one tile, reads as a place to leave by.

**K69. `art/sprites/kit/city/dress-1.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Laundry: a fallen line of cloth and a few dropped sheets, no patterns. Low, flat, nothing taller than a few centimetres.

**K70. `art/sprites/kit/city/dress-2.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Cables and bunting: a slack string of paper lanterns lying across the ground. Low, flat, nothing taller than a few centimetres.

**K71. `art/sprites/kit/city/dress-3.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A scatter of newspaper-sized blank paper sheets. Low, flat, nothing taller than a few centimetres.

**K72. `art/sprites/kit/city/dress-4.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A shuttered stall sign board, blank, leaning. Low, flat, nothing taller than a few centimetres.


### Kit field: Setting 3: Daggerfall battlefield

Light: low smoky orange sun through haze, ash and mud. **Kit paragraph (paste after the kit style block):** Cracked mud, ash, scorched steel plate, sandbag canvas, burnt wood, bone-white dust. Accent: smoky orange `#F68A38` and warm ivory mana specks (faint). Reads as a nuked dead world: ash grey, charred, trenches and wreck plate. Same place as the setting's backdrops and maps: reuse their materials and local colour.

**K73*. `art/sprites/kit/field/ground-1.png`** GROUND, opaque 1024 x 1024 seamless tile. Dry cracked grey-brown mud with fine ash and tiny stones.

**K74*. `art/sprites/kit/field/ground-2.png`** GROUND, opaque 1024 x 1024 seamless tile. Churned dark mud and ash with wheel and boot ruts, wet-dark.

**K75. `art/sprites/kit/field/ground-3.png`** GROUND, opaque 1024 x 1024 seamless tile. Damaged ground: cratered blasted earth, glassy fused patches, bone-pale dust.

**K76*. `art/sprites/kit/field/decal-rubble.png`** DECAL (the engine's `rubble` kind), transparent 256 x 256. Rubble scatter: broken plate, chunks of fused stone and bent wire. Soft ragged edge, centred, covers about one tile and overlaps well when repeated.

**K77*. `art/sprites/kit/field/decal-toxic.png`** DECAL (the engine's `toxic` kind), transparent 256 x 256. Toxic spill: an acid-green and rust slick pooled in cracks (the toxic spill), soft edge.

**K78. `art/sprites/kit/field/decal-scorch.png`** DECAL (hazard and burnt ground), transparent 256 x 256. Scorch: black ash ring with ember specks fading outward.

**K79*. `art/sprites/kit/field/wall-straight.png`** WALL piece, straight, 256 x 256 cell: a packed-earth and sandbag trench wall seen from above, dark cut band with a sandbag cap, running left to right, half a tile thick, flat cut ends at the cell edges.

**K80*. `art/sprites/kit/field/wall-corner.png`** WALL piece, corner, same wall and thickness: an L joining the left edge and the bottom edge, outer corner square.

**K81*. `art/sprites/kit/field/wall-end.png`** WALL piece, end cap, same wall: it runs from the left edge to the middle of the cell and ends in a square finished cap, the right half empty.

**K82*. `art/sprites/kit/field/wall-door.png`** WALL piece, doorway, same wall: two short wall stubs from each side with plain jambs, an empty 128 px gap in the middle (nothing in it), butting at both cell edges.

**K83*. `art/sprites/kit/field/wall-broken.png`** WALL piece, broken section, same wall: a straight run with a ragged breach in the middle, brick-sized rubble at the gap, both ends flat cut at the cell edges.

**K84*. `art/sprites/kit/field/crate.png`** CRATE (`crate`, half cover, destructible): a battered ammunition crate, scorched wood with a steel strap; about a metre, waist-high look, centred.

**K85. `art/sprites/kit/field/crate-broken.png`** CRATE broken: the same crate smashed to splinters and scraps, flat, low, same footprint, nothing standing.

**K86*. `art/sprites/kit/field/low_wall.png`** LOW WALL (`low_wall`, half cover): a waist-high line of sandbags, one tile long, with a worn canvas look; fills the width of the tile, low and clearly waist-high with a visible light top face.

**K87*. `art/sprites/kit/field/pillar.png`** PILLAR (`pillar`, full cover, destructible): a burnt stump or broken stone pylon, blackened, round; strong dark edge, reads as taller than a person, fits one tile.

**K88. `art/sprites/kit/field/pillar-broken.png`** PILLAR broken: the same pillar collapsed to a low heap of chunks, same footprint, lower and lighter than the standing one.

**K89*. `art/sprites/kit/field/barricade.png`** BARRICADE (`barricade`, full cover, destructible): a full-height barricade of welded plate and stakes, bent and hasty, tall enough to hide behind; fills the width of the tile.

**K90. `art/sprites/kit/field/barricade-broken.png`** BARRICADE broken: the same barricade collapsed into a low scatter of parts, same footprint.

**K91*. `art/sprites/kit/field/door.png`** DOOR closed (`door`): a field bunker hatch of heavy plate, closed, rivets and a wheel lock; one tile wide, drawn to sit in a wall gap, flat-cut sides at the cell edges.

**K92*. `art/sprites/kit/field/door-open.png`** DOOR open (`door`, open state): the same bunker hatch swung open, black stair below, threshold clear; the same door seen open, same cell.

**K93*. `art/sprites/kit/field/hole.png`** HOLE (`hole`): a deep round shell crater, dark depth, torn lip of earth; round or square, fits one tile, the depth reads as dark and void.

**K94. `art/sprites/kit/field/trap.png`** TRAP (`trap`): a half-buried mine: a round pressure plate and a scatter of disturbed earth; deliberately subtle but readable at 64 px.

**K95*. `art/sprites/kit/field/fire.png`** FIRE (`fire`): burning wreckage: flames and black smoke seen from above, orange; fits one tile, bright core, no glow or bloom, flat painted flames.

**K96*. `art/sprites/kit/field/barrel.png`** BARREL (`barrel`, half cover, explodes): a scorched fuel drum with a dented side and a red band; about 60 cm across, reads as dangerous.

**K97*. `art/sprites/kit/field/container.png`** CONTAINER (`container`, half cover, holds loot), transparent 384 x 256: a dented field supply container, a tile and a half long, scorched and half buried, waist-high.

**K98*. `art/sprites/kit/field/terminal.png`** TERMINAL (`terminal`): a salvaged field radio terminal on a battered case, cracked glass, faint amber glow, no text; fits one tile.

**K99*. `art/sprites/kit/field/lamp.png`** LAMP (`lamp`): a tall field flare stand with a hooded lamp, seen from above, dull orange glow; fits one tile.

**K100. `art/sprites/kit/field/turret.png`** TURRET (`turret`, half cover): an emplaced field gun on a two-wheel mount behind a shield (waist-high cover); fits one tile, a single clear barrel direction (up).

**K101. `art/sprites/kit/field/camera.png`** CAMERA (`camera`): a lashed pole with a cracked optics box (camera), seen from above; small, about a third of a tile, centred.

**K102. `art/sprites/kit/field/alarm.png`** ALARM (`alarm`): a hand-cranked siren post, flat as seen from above; small, about a third of a tile, centred.

**K103. `art/sprites/kit/field/cache.png`** CACHE (`cache`, loot): a buried supply cache under a torn tarp, lashed down; about a metre, waist-high look.

**K104. `art/sprites/kit/field/exit.png`** EXIT (`exit`, the way out): a rope-marked track out of the field: two stakes with a rag between them and a worn path, no letters; fits one tile, reads as a place to leave by.

**K105. `art/sprites/kit/field/dress-1.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A fallen unit banner with no emblem, a plain torn cloth. Low, flat, nothing taller than a few centimetres.

**K106. `art/sprites/kit/field/dress-2.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Barbed wire coil lying on the ground. Low, flat, nothing taller than a few centimetres.

**K107. `art/sprites/kit/field/dress-3.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Bone-pale rib or plate fragments half in the dust (no faces, no remains that read as bodies). Low, flat, nothing taller than a few centimetres.

**K108. `art/sprites/kit/field/dress-4.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A broken wooden stake line with rags. Low, flat, nothing taller than a few centimetres.


### Kit works: Setting 4: machine works and drone foundry

Light: furnace orange and sparks, cool blue work lamps. **Kit paragraph (paste after the kit style block):** Dark iron plate, soot, ceramic white, cast steel, orange slag. Accent: furnace orange `#F68A38` against cool blue lamp light. Reads as a heavy industrial floor: diamond plate, yellow-less safety lines (use ivory), hot orange seams. Same place as the setting's backdrops and maps: reuse their materials and local colour.

**K109*. `art/sprites/kit/works/ground-1.png`** GROUND, opaque 1024 x 1024 seamless tile. Dark diamond-pattern iron plate floor, evenly worn, tiny bolts.

**K110*. `art/sprites/kit/works/ground-2.png`** GROUND, opaque 1024 x 1024 seamless tile. Soot-grey concrete floor with faint ivory safety lane lines and drain seams.

**K111. `art/sprites/kit/works/ground-3.png`** GROUND, opaque 1024 x 1024 seamless tile. Damaged floor: warped plate, burn marks, cracked concrete and slag spatter.

**K112*. `art/sprites/kit/works/decal-rubble.png`** DECAL (the engine's `rubble` kind), transparent 256 x 256. Rubble scatter: scrap fragments, bolts, cut metal curls. Soft ragged edge, centred, covers about one tile and overlaps well when repeated.

**K113*. `art/sprites/kit/works/decal-toxic.png`** DECAL (the engine's `toxic` kind), transparent 256 x 256. Toxic spill: a pooled coolant or oil slick, blue-black with a rainbow sheen (the toxic spill), soft edge.

**K114. `art/sprites/kit/works/decal-scorch.png`** DECAL (hazard and burnt ground), transparent 256 x 256. Scorch: a heat-blackened patch with a faint orange edge glow, soft edge.

**K115*. `art/sprites/kit/works/wall-straight.png`** WALL piece, straight, 256 x 256 cell: a cast iron works wall with a ceramic-white cap band and bolted plates, running left to right, half a tile thick, flat cut ends at the cell edges.

**K116*. `art/sprites/kit/works/wall-corner.png`** WALL piece, corner, same wall and thickness: an L joining the left edge and the bottom edge, outer corner square.

**K117*. `art/sprites/kit/works/wall-end.png`** WALL piece, end cap, same wall: it runs from the left edge to the middle of the cell and ends in a square finished cap, the right half empty.

**K118*. `art/sprites/kit/works/wall-door.png`** WALL piece, doorway, same wall: two short wall stubs from each side with plain jambs, an empty 128 px gap in the middle (nothing in it), butting at both cell edges.

**K119*. `art/sprites/kit/works/wall-broken.png`** WALL piece, broken section, same wall: a straight run with a ragged breach in the middle, brick-sized rubble at the gap, both ends flat cut at the cell edges.

**K120*. `art/sprites/kit/works/crate.png`** CRATE (`crate`, half cover, destructible): a steel parts crate, welded, with a bolted lid and an orange stripe; about a metre, waist-high look, centred.

**K121. `art/sprites/kit/works/crate-broken.png`** CRATE broken: the same crate smashed to splinters and scraps, flat, low, same footprint, nothing standing.

**K122*. `art/sprites/kit/works/low_wall.png`** LOW WALL (`low_wall`, half cover): a waist-high machine casing or conveyor guard, one tile long, with an ivory safety stripe; fills the width of the tile, low and clearly waist-high with a visible light top face.

**K123*. `art/sprites/kit/works/pillar.png`** PILLAR (`pillar`, full cover, destructible): a square cast steel support pillar with bolts and a base flange; strong dark edge, reads as taller than a person, fits one tile.

**K124. `art/sprites/kit/works/pillar-broken.png`** PILLAR broken: the same pillar collapsed to a low heap of chunks, same footprint, lower and lighter than the standing one.

**K125*. `art/sprites/kit/works/barricade.png`** BARRICADE (`barricade`, full cover, destructible): a full-height wall of stacked steel plate and welded scrap, tall enough to hide behind; fills the width of the tile.

**K126. `art/sprites/kit/works/barricade-broken.png`** BARRICADE broken: the same barricade collapsed into a low scatter of parts, same footprint.

**K127*. `art/sprites/kit/works/door.png`** DOOR closed (`door`): a heavy iron sliding door in a plate frame, closed, with an orange status light; one tile wide, drawn to sit in a wall gap, flat-cut sides at the cell edges.

**K128*. `art/sprites/kit/works/door-open.png`** DOOR open (`door`, open state): the same sliding door retracted, jambs visible, threshold clear; the same door seen open, same cell.

**K129*. `art/sprites/kit/works/hole.png`** HOLE (`hole`): an open maintenance pit with a bent rail edge, black depth; round or square, fits one tile, the depth reads as dark and void.

**K130. `art/sprites/kit/works/trap.png`** TRAP (`trap`): a pressure plate trap with a small hidden spike, set in the plate floor; deliberately subtle but readable at 64 px.

**K131*. `art/sprites/kit/works/fire.png`** FIRE (`fire`): a burning oil pool with flames seen from above, orange; fits one tile, bright core, no glow or bloom, flat painted flames.

**K132*. `art/sprites/kit/works/barrel.png`** BARREL (`barrel`, half cover, explodes): a coolant or fuel drum, dark steel with a red band, explosive-looking; about 60 cm across, reads as dangerous.

**K133*. `art/sprites/kit/works/container.png`** CONTAINER (`container`, half cover, holds loot), transparent 384 x 256: a large steel parts bin on skids, a tile and a half long, waist-high.

**K134*. `art/sprites/kit/works/terminal.png`** TERMINAL (`terminal`): a factory control terminal on a stand, dark screen glass with abstract blue bars, no text; fits one tile.

**K135*. `art/sprites/kit/works/lamp.png`** LAMP (`lamp`): a tall work lamp on a gantry stand with cool blue glass, seen from above; fits one tile.

**K136. `art/sprites/kit/works/turret.png`** TURRET (`turret`, half cover): an emplaced auto-turret on a pedestal with a dark housing and a sensor eye (waist-high); fits one tile, a single clear barrel direction (up).

**K137. `art/sprites/kit/works/camera.png`** CAMERA (`camera`): a ceiling-style camera ball on a short arm, seen from above; small, about a third of a tile, centred.

**K138. `art/sprites/kit/works/alarm.png`** ALARM (`alarm`): a wall alarm panel with a red beacon, flat; small, about a third of a tile, centred.

**K139. `art/sprites/kit/works/cache.png`** CACHE (`cache`, loot): a locked steel cache locker, low, with an orange seal; about a metre, waist-high look.

**K140. `art/sprites/kit/works/exit.png`** EXIT (`exit`, the way out): a lift pad or door hatch with ivory chevrons toward it, no letters; fits one tile, reads as a place to leave by.

**K141. `art/sprites/kit/works/dress-1.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Cables: a heavy hose and cable bundle lying across the floor. Low, flat, nothing taller than a few centimetres.

**K142. `art/sprites/kit/works/dress-2.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A loose chain and a hook on the ground. Low, flat, nothing taller than a few centimetres.

**K143. `art/sprites/kit/works/dress-3.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A floor lane marking: ivory dashes and a corner mark, no letters. Low, flat, nothing taller than a few centimetres.

**K144. `art/sprites/kit/works/dress-4.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A scatter of metal shavings and sparks-cold slag nuggets. Low, flat, nothing taller than a few centimetres.


### Kit shrine: Setting 5: shrine and cathedral district

Light: candlelight, gold and ivory against deep violet shadow. **Kit paragraph (paste after the kit style block):** Pale flagstone, dark wood pews, gold leaf (abstract), ivory candle wax, violet cloth. Accent: gold `#F2C46A` candle glow. Reads as a hushed sacred place: pale stone, violet shadow, small flames, no figures, no lettering. Same place as the setting's backdrops and maps: reuse their materials and local colour.

**K145*. `art/sprites/kit/shrine/ground-1.png`** GROUND, opaque 1024 x 1024 seamless tile. Pale flagstone with fine dark joints and gentle wear.

**K146*. `art/sprites/kit/shrine/ground-2.png`** GROUND, opaque 1024 x 1024 seamless tile. Dark polished stone floor with a faint ivory inlay line pattern (abstract geometric, no symbols that read as writing).

**K147. `art/sprites/kit/shrine/ground-3.png`** GROUND, opaque 1024 x 1024 seamless tile. Damaged floor: cracked and chipped flagstone, fallen plaster dust, a few weeds in the joints.

**K148*. `art/sprites/kit/shrine/decal-rubble.png`** DECAL (the engine's `rubble` kind), transparent 256 x 256. Rubble scatter: limestone chunks, plaster and gilded fragments. Soft ragged edge, centred, covers about one tile and overlaps well when repeated.

**K149*. `art/sprites/kit/shrine/decal-toxic.png`** DECAL (the engine's `toxic` kind), transparent 256 x 256. Toxic spill: a dark violet-black ichor slick (the toxic spill), soft edge.

**K150. `art/sprites/kit/shrine/decal-scorch.png`** DECAL (hazard and burnt ground), transparent 256 x 256. Scorch: a candle-soot and burn mark, soft edge.

**K151*. `art/sprites/kit/shrine/wall-straight.png`** WALL piece, straight, 256 x 256 cell: a carved pale limestone wall with a gold-leaf cap line and a dark base band, running left to right, half a tile thick, flat cut ends at the cell edges.

**K152*. `art/sprites/kit/shrine/wall-corner.png`** WALL piece, corner, same wall and thickness: an L joining the left edge and the bottom edge, outer corner square.

**K153*. `art/sprites/kit/shrine/wall-end.png`** WALL piece, end cap, same wall: it runs from the left edge to the middle of the cell and ends in a square finished cap, the right half empty.

**K154*. `art/sprites/kit/shrine/wall-door.png`** WALL piece, doorway, same wall: two short wall stubs from each side with plain jambs, an empty 128 px gap in the middle (nothing in it), butting at both cell edges.

**K155*. `art/sprites/kit/shrine/wall-broken.png`** WALL piece, broken section, same wall: a straight run with a ragged breach in the middle, brick-sized rubble at the gap, both ends flat cut at the cell edges.

**K156*. `art/sprites/kit/shrine/crate.png`** CRATE (`crate`, half cover, destructible): a carved wooden offering chest with an iron band; about a metre, waist-high look, centred.

**K157. `art/sprites/kit/shrine/crate-broken.png`** CRATE broken: the same crate smashed to splinters and scraps, flat, low, same footprint, nothing standing.

**K158*. `art/sprites/kit/shrine/low_wall.png`** LOW WALL (`low_wall`, half cover): a waist-high stone balustrade or low chancel rail, one tile long; fills the width of the tile, low and clearly waist-high with a visible light top face.

**K159*. `art/sprites/kit/shrine/pillar.png`** PILLAR (`pillar`, full cover, destructible): a round fluted limestone column with a gilded capital seen from above; strong dark edge, reads as taller than a person, fits one tile.

**K160. `art/sprites/kit/shrine/pillar-broken.png`** PILLAR broken: the same pillar collapsed to a low heap of chunks, same footprint, lower and lighter than the standing one.

**K161*. `art/sprites/kit/shrine/barricade.png`** BARRICADE (`barricade`, full cover, destructible): a full-height barricade of stacked pews and altar cloth, tall enough to hide behind; fills the width of the tile.

**K162. `art/sprites/kit/shrine/barricade-broken.png`** BARRICADE broken: the same barricade collapsed into a low scatter of parts, same footprint.

**K163*. `art/sprites/kit/shrine/door.png`** DOOR closed (`door`): a tall double wooden door with iron studs in a stone arch, closed; one tile wide, drawn to sit in a wall gap, flat-cut sides at the cell edges.

**K164*. `art/sprites/kit/shrine/door-open.png`** DOOR open (`door`, open state): the same door swung open, threshold of pale stone visible; the same door seen open, same cell.

**K165*. `art/sprites/kit/shrine/hole.png`** HOLE (`hole`): a round open well or floor shaft with a stone lip, black depth; round or square, fits one tile, the depth reads as dark and void.

**K166. `art/sprites/kit/shrine/trap.png`** TRAP (`trap`): a pressure tile trap: one raised flagstone with a hairline seam and dust spilled; deliberately subtle but readable at 64 px.

**K167*. `art/sprites/kit/shrine/fire.png`** FIRE (`fire`): a toppled candle stand fire: flames seen from above, orange and gold; fits one tile, bright core, no glow or bloom, flat painted flames.

**K168*. `art/sprites/kit/shrine/barrel.png`** BARREL (`barrel`, half cover, explodes): a sealed oil jar, round, ceramic with a wax seal and a faint red mark (explosive); about 60 cm across, reads as dangerous.

**K169*. `art/sprites/kit/shrine/container.png`** CONTAINER (`container`, half cover, holds loot), transparent 384 x 256: a stone sarcophagus or long reliquary chest, a tile and a half long, waist-high.

**K170*. `art/sprites/kit/shrine/terminal.png`** TERMINAL (`terminal`): a lectern-like reading stand with a softly glowing blank plate, no text; fits one tile.

**K171*. `art/sprites/kit/shrine/lamp.png`** LAMP (`lamp`): a tall iron candle stand with a cluster of lit candles, seen from above, gold glow; fits one tile.

**K172. `art/sprites/kit/shrine/turret.png`** TURRET (`turret`, half cover): a consecrated emplaced turret: a bronze-and-stone gun cage on a plinth (waist-high); fits one tile, a single clear barrel direction (up).

**K173. `art/sprites/kit/shrine/camera.png`** CAMERA (`camera`): a small carved lantern eye on a bracket (camera), seen from above; small, about a third of a tile, centred.

**K174. `art/sprites/kit/shrine/alarm.png`** ALARM (`alarm`): a hanging prayer-bell on a short frame (alarm), flat from above; small, about a third of a tile, centred.

**K175. `art/sprites/kit/shrine/cache.png`** CACHE (`cache`, loot): a locked reliquary box with a gold clasp and a violet cloth; about a metre, waist-high look.

**K176. `art/sprites/kit/shrine/exit.png`** EXIT (`exit`, the way out): a stair-head going down or a small door arch lit gold, with a worn threshold, no letters; fits one tile, reads as a place to leave by.

**K177. `art/sprites/kit/shrine/dress-1.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A fallen prayer cloth, plain violet, no patterns. Low, flat, nothing taller than a few centimetres.

**K178. `art/sprites/kit/shrine/dress-2.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A spill of candle wax and a few burnt-out candles. Low, flat, nothing taller than a few centimetres.

**K179. `art/sprites/kit/shrine/dress-3.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A scatter of dried petals. Low, flat, nothing taller than a few centimetres.

**K180. `art/sprites/kit/shrine/dress-4.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): An abstract floor inlay ring in gold line (geometric, no letters). Low, flat, nothing taller than a few centimetres.


### Kit rim: Setting 6: rim station

Light: cold blue-grey accretion glow from above, a few warm lamps. **Kit paragraph (paste after the kit style block):** Steel blue-grey, ivory plate, black glass, thin cyan-white light strips. Accent: cold cyan `#8BDEEE` light strips and one warm lamp. Reads as a lonely frontier station: clean blue-grey plate, hazard ivory, black void edges. Same place as the setting's backdrops and maps: reuse their materials and local colour.

**K181*. `art/sprites/kit/rim/ground-1.png`** GROUND, opaque 1024 x 1024 seamless tile. Blue-grey deck plate with fine grip texture and bolted seams.

**K182*. `art/sprites/kit/rim/ground-2.png`** GROUND, opaque 1024 x 1024 seamless tile. Dark steel deck with ivory lane stripes, slightly glossy-looking but matte painted.

**K183. `art/sprites/kit/rim/ground-3.png`** GROUND, opaque 1024 x 1024 seamless tile. Damaged deck: scorched, buckled plate, a missing panel showing dark pipework.

**K184*. `art/sprites/kit/rim/decal-rubble.png`** DECAL (the engine's `rubble` kind), transparent 256 x 256. Rubble scatter: plate shards, bolts and glass-free debris. Soft ragged edge, centred, covers about one tile and overlaps well when repeated.

**K185*. `art/sprites/kit/rim/decal-toxic.png`** DECAL (the engine's `toxic` kind), transparent 256 x 256. Toxic spill: a cold green coolant slick (the toxic spill), soft edge.

**K186. `art/sprites/kit/rim/decal-scorch.png`** DECAL (hazard and burnt ground), transparent 256 x 256. Scorch: a blast burn on the deck, soft edge.

**K187*. `art/sprites/kit/rim/wall-straight.png`** WALL piece, straight, 256 x 256 cell: a blue-grey bulkhead wall with an ivory cap band and a thin cyan light strip along the top face, running left to right, half a tile thick, flat cut ends at the cell edges.

**K188*. `art/sprites/kit/rim/wall-corner.png`** WALL piece, corner, same wall and thickness: an L joining the left edge and the bottom edge, outer corner square.

**K189*. `art/sprites/kit/rim/wall-end.png`** WALL piece, end cap, same wall: it runs from the left edge to the middle of the cell and ends in a square finished cap, the right half empty.

**K190*. `art/sprites/kit/rim/wall-door.png`** WALL piece, doorway, same wall: two short wall stubs from each side with plain jambs, an empty 128 px gap in the middle (nothing in it), butting at both cell edges.

**K191*. `art/sprites/kit/rim/wall-broken.png`** WALL piece, broken section, same wall: a straight run with a ragged breach in the middle, brick-sized rubble at the gap, both ends flat cut at the cell edges.

**K192*. `art/sprites/kit/rim/crate.png`** CRATE (`crate`, half cover, destructible): a sealed grey-blue cargo crate with an ivory corner bracket; about a metre, waist-high look, centred.

**K193. `art/sprites/kit/rim/crate-broken.png`** CRATE broken: the same crate smashed to splinters and scraps, flat, low, same footprint, nothing standing.

**K194*. `art/sprites/kit/rim/low_wall.png`** LOW WALL (`low_wall`, half cover): a waist-high deck rail or equipment casing, one tile long, with an ivory stripe; fills the width of the tile, low and clearly waist-high with a visible light top face.

**K195*. `art/sprites/kit/rim/pillar.png`** PILLAR (`pillar`, full cover, destructible): a round steel support strut, ringed with ivory bands, seen from above; strong dark edge, reads as taller than a person, fits one tile.

**K196. `art/sprites/kit/rim/pillar-broken.png`** PILLAR broken: the same pillar collapsed to a low heap of chunks, same footprint, lower and lighter than the standing one.

**K197*. `art/sprites/kit/rim/barricade.png`** BARRICADE (`barricade`, full cover, destructible): a full-height wall of stacked cargo plates and crates, tall enough to hide behind; fills the width of the tile.

**K198. `art/sprites/kit/rim/barricade-broken.png`** BARRICADE broken: the same barricade collapsed into a low scatter of parts, same footprint.

**K199*. `art/sprites/kit/rim/door.png`** DOOR closed (`door`): a sliding bulkhead door in a frame, closed, with a cyan light strip; one tile wide, drawn to sit in a wall gap, flat-cut sides at the cell edges.

**K200*. `art/sprites/kit/rim/door-open.png`** DOOR open (`door`, open state): the same bulkhead door retracted, jambs visible, threshold clear; the same door seen open, same cell.

**K201*. `art/sprites/kit/rim/hole.png`** HOLE (`hole`): an open maintenance shaft in the deck, black depth, a hatch cover leaning beside it; round or square, fits one tile, the depth reads as dark and void.

**K202. `art/sprites/kit/rim/trap.png`** TRAP (`trap`): a pressure plate trap: a raised deck panel with a hairline seam and a cyan blink; deliberately subtle but readable at 64 px.

**K203*. `art/sprites/kit/rim/fire.png`** FIRE (`fire`): an electrical fire in a wrecked panel: flames and sparks seen from above, orange; fits one tile, bright core, no glow or bloom, flat painted flames.

**K204*. `art/sprites/kit/rim/barrel.png`** BARREL (`barrel`, half cover, explodes): a pressurised gas canister cluster, ivory with a red band (explosive); about 60 cm across, reads as dangerous.

**K205*. `art/sprites/kit/rim/container.png`** CONTAINER (`container`, half cover, holds loot), transparent 384 x 256: a long cargo container, a tile and a half long, blue-grey with a cyan latch light, waist-high.

**K206*. `art/sprites/kit/rim/terminal.png`** TERMINAL (`terminal`): a station console on a stand, dark screen with abstract cyan bars, no text; fits one tile.

**K207*. `art/sprites/kit/rim/lamp.png`** LAMP (`lamp`): a tall deck floodlamp on a stand, warm lamp glass, seen from above; fits one tile.

**K208. `art/sprites/kit/rim/turret.png`** TURRET (`turret`, half cover): an emplaced defence turret on a ring mount, grey-blue housing, one barrel (waist-high); fits one tile, a single clear barrel direction (up).

**K209. `art/sprites/kit/rim/camera.png`** CAMERA (`camera`): a ceiling camera dome seen from above, black glass, a cyan dot; small, about a third of a tile, centred.

**K210. `art/sprites/kit/rim/alarm.png`** ALARM (`alarm`): a bulkhead alarm panel with an amber beacon, flat; small, about a third of a tile, centred.

**K211. `art/sprites/kit/rim/cache.png`** CACHE (`cache`, loot): a locked equipment cache case, blue-grey with an ivory seal; about a metre, waist-high look.

**K212. `art/sprites/kit/rim/exit.png`** EXIT (`exit`, the way out): an airlock hatch with ivory chevrons toward it, no letters; fits one tile, reads as a place to leave by.

**K213. `art/sprites/kit/rim/dress-1.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): Cables: a loose bundle of ivory and cyan cables across the deck. Low, flat, nothing taller than a few centimetres.

**K214. `art/sprites/kit/rim/dress-2.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A floor lane marking: ivory dashes and a corner mark, no letters. Low, flat, nothing taller than a few centimetres.

**K215. `art/sprites/kit/rim/dress-3.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A drifted dust and ice rim along a wall base. Low, flat, nothing taller than a few centimetres.

**K216. `art/sprites/kit/rim/dress-4.png`** SET DRESSING (non-blocking, any free tile, no rules meaning): A dropped tool case and some bolts, nothing readable. Low, flat, nothing taller than a few centimetres.


---

## Batch 1b: painted battle maps (18; training material first)

**Leon, 13 Nov 2026: "painted map too, let it chew on it so we have enough for the LoRA later."** Three maps for each of the
six settings, so each setting has a matched set of four backdrops and three maps. **These are training material first:**
whether the game goes back to showing painted maps (it draws maps from tiles today, rules 1.16) is a later design
decision and not this request's. Paint them as if they would be played on.

**What the archived maps were** (`art/_archive/maps/m813/v1/`, `retired-2026-11/`; brief `m813-tutorial-campaign.md`): opaque,
**top-down, orthographic, no perspective**, **1600 x 1100 (16 x 11 tiles of 100 px, each tile 1.5 m)**, painted in the
same Heavenprint hand, walls and open door gaps following a tile guide, objects left as plain floor. Those were **not
square**; the game's maps are now **26 x 26 tiles at most** (rules 1.16), so **the master here is square: 2600 x 2600
(26 tiles of 100 px), never smaller than 2080 x 2080**, the same 100 px a tile as the archived ones, so the two sets match
in scale. Reason: a square master is the shape of a full map, and any smaller map is a crop of it.

**Scale to tell the artist:** the whole frame is a place about **39 m x 39 m** (26 x 26 tiles of 1.5 m). A person is about
half a tile (a figure's shoulders about 50 px wide at 100 px a tile): doors about 1 to 2 tiles wide, corridors 2 to 4
tiles, a crate about 1 tile, a vehicle 2 to 4 tiles long.

**The map style block (paste at the start of every map prompt):**

> Paint one top-down battle map for a game in Heavenprint: hand-painted opaque gouache and ink with broken, directional
> brush strokes, selective dry-brush scumbling, restrained hatching, charcoal lost edges and warm ivory accents, the same
> hand as the attached Heavenprint scene references. **Straight overhead, orthographic: no perspective tilt, no vertical
> faces, no horizon, no sky;** walls are seen as flat thick bands from above with a clear edge, rooftops flat. The whole
> play area fills the frame edge to edge, **square, 2600 x 2600 PNG (never smaller than 2080 x 2080), opaque.** Scale: the
> frame is a place about 39 m across (a 26 x 26 tile map, a tile is 1.5 m, 100 px). **No grid lines, no tile marks, no
> characters, no creatures, no figures, no text, no letters, no numbers, no labels, no UI, no frame, no border, no
> watermark, no parchment.** Make the play surface unmistakable: **clear, calm, walkable ground** (floor, earth, paving)
> against **clear obstacles and cover** (walls, crates, wreckage, columns, machinery, water) with hard, readable edges and
> a darker or lighter band around each obstacle, so that a tile layout can be traced from the picture later. Keep detail
> and drama on the obstacles and edges; keep the walkable floor low-contrast. Light comes from one direction, **upper
> left**, with a short soft shadow toward the lower right, the same in every map of the set. Local colour of the setting
> only; no glowing bloom. Everything is invented: nothing recognisable from real-world works, brands, buildings or places.

**Attach as references:** two of the archived maps (`art/_archive/maps/m813/v1/outpost_1.png` and `shield_line.png`: their
paint and the way walls and floor separate; not their layouts), the scene references of the scene block, and the setting's
first backdrop from batch 1 once it exists (the matched set shares palette and materials). Save as
`art/maps/survival/<setting>-<n>.png` (**a proposal**; `art/maps/` is a new folder).

### Setting 1: AHOC chapter outpost

**M1. `art/maps/survival/ahoc-1.png`** The outpost yard and gatehouse: walled compound seen from above; a gate in the south wall, a loading yard of packed gravel with crates and drums in two stacks (cover), a gatehouse and a guard shed on the left, a watchtower base on the right, a long barracks block across the north with two doors; lanes run left and right of a central parked cargo hauler.

**M2. `art/maps/survival/ahoc-2.png`** The corridor grid: a plan of ceramic-grey panelled corridors, four rooms around a central junction hall; each room has a door onto the hall and one back door; pipe runs and filing racks as cover inside the rooms, a bare 4 tile central hall with two pillars.

**M3. `art/maps/survival/ahoc-3.png`** The records vault: a large circular hall with a ring of dark machine banks and cabinets as cover around a bare central floor, four entrances at the compass points, a raised catwalk platform in the north, and two side alcoves.

### Setting 2: Central City back streets

**M4. `art/maps/survival/city-1.png`** A crossing of alleys: two alleys crossing in the middle between building roofs (roofs are solid), market stalls and crates along one alley, a dry fountain bay at the crossing, three alley mouths and a locked yard in the corner.

**M5. `art/maps/survival/city-2.png`** The rooftop terrace: several rooftops of different heights joined by plank bridges (shown as narrow walkable bands), water tanks, stair housings and chimney stacks as cover, an open central gravel roof, a roof edge (void) on two sides.

**M6. `art/maps/survival/city-3.png`** The plaza: a small square with a stopped clock-tower base on the north side, a dry fountain in the centre as cover, shuttered cafe fronts on three sides with doors, and four streets entering at the corners.

### Setting 3: Daggerfall battlefield

**M7. `art/maps/survival/field-1.png`** The trench line: two parallel trench systems (dark cut bands with sandbag edges) crossed by two spurs, a no-man's-land of craters between them, a wrecked field gun at the east end as cover; open lanes along the north and south edges.

**M8. `art/maps/survival/field-2.png`** The crater field: open cracked mud broken by about a dozen craters of different sizes (low cover), two wrecked tank hulls, a line of burnt stumps; no walls; entry from the west, a dry gully along the east.

**M9. `art/maps/survival/field-3.png`** The crashed hull: the broken ribs of a huge fallen war machine lying diagonally across the map as large solid cover, a ring of open ash ground around it, scattered plates, two lanes passing either end.

### Setting 4: machine works and drone foundry

**M10. `art/maps/survival/works-1.png`** The assembly hall: two long parallel conveyor lines (solid, crossable at three bridges), unfinished shells on the lines as cover, a clear walkway down the middle, a loading door at each end.

**M11. `art/maps/survival/works-2.png`** The scrap yard: a fenced yard of heaps of broken parts (cover), a gantry crane's rails along the edges, a magnet pad in the centre, a gate in the south fence and a hole in the west fence.

**M12. `art/maps/survival/works-3.png`** The casting hall: a furnace mouth in the north wall, slag channels cutting the floor into three lanes (with plank crossings), pillars in two rows, catwalk supports at the edges, a bare dark iron plate centre.

### Setting 5: shrine and cathedral district

**M13. `art/maps/survival/shrine-1.png`** The nave: a long hall seen from above, a bare central aisle of flagstones, two rows of pillars and pushed-back pews as cover, a chancel step at the north end and a west door; side chapels as alcoves.

**M14. `art/maps/survival/shrine-2.png`** The cloister: an arcaded square walkway (pillars along the inner edge) around an open courtyard garden with a covered well as central cover, four doors at the compass points.

**M15. `art/maps/survival/shrine-3.png`** The altar apse: a semicircular apse with a raised bare dais, a ring of candle stands as cover, two stairs, a round gold floor pool of light (a lighter painted patch, walkable), and two side vestries.

### Setting 6: rim station

**M16. `art/maps/survival/rim-1.png`** The hangar bay: an open painted bay floor with gantry feet and empty cradles as cover, a gutted shuttle in the east, a large airlock door in the south and a small door in each corner.

**M17. `art/maps/survival/rim-2.png`** The rear landing pad: an open circular pad with a scorch ring, loose crates and a mast base as cover, a low parapet around the edge (solid), two ramps in the south and a sealed hatch in the north.

**M18. `art/maps/survival/rim-3.png`** The power core chamber: a ring of resonant conduits (solid) around a dim central well (void), catwalk rails and four bridge crossings, two generators in the corners as cover, entrances at north and south.

---

## Batch 2: the path map (2 for Leon to pick from)

The UI draws the nodes, paths, icons and text on top (this is the path-selection screen's backdrop, not a battle map; the battle maps are batch 1b). Both are wide, 16:9, 2560 x 1440, the scene block's rules apply except: the centre may be busier
(it is a map of places), but leave **three or four large calm zones** (left, centre and right thirds each with a calm
band) where the nodes and lines will sit, and keep it dark enough (mid-dark values) for pale lines and chips.

**25. `art/illustrations/survival/map/map-display.png`** (direction A) An **in-world tactical display**: a dark table or a wall of a command room, a raised relief of broken ground and districts in dark slate with thin etched ivory contour lines and faint cyan `#4FC8DF` grid ticks at the edges only, a few brass pins and cables, a lamp's pool of light on one side. Blank, no labels or lettering, no parchment, no paper.

**26. `art/illustrations/survival/map/map-aerial.png`** (direction B) A **painted aerial** of a district at dusk, as if seen from a drone high over it: a river bend, rooftops and courtyards in layered Heavenprint planes, roads as pale thread-like lines, a rim of mist and darkness at the edges, calm open areas of plaza, field and water where nodes can sit. No labels, no UI, no map symbols, no parchment.

---

## Batch 3: node scenes (8)

Scene block, **card variant**: replace "16:9, 2560 x 1440" with "4:3, 2048 x 1536 PNG (never smaller than 1600 x 1200)", and
replace the backdrop paragraph with: "**A card shown when the player arrives; no characters in it** (an empty counter,
an empty chair; the keeper is a separate portrait), a clear focal object lit from one side, a calm lower third where the
UI will put text". Everything else is unchanged. Save as `art/illustrations/survival/nodes/<name>.png`.

**27. `shop-quartermaster.png`** A quartermaster's counter in an AHOC chapter store: a steel counter with a mesh cage, shelves of boxed kit and rifles in racks behind, a ledger and a bell, a green-shaded lamp. Ordered, military, a little dusty.

**28. `shop-alley-dealer.png`** A back-alley dealer's pitch in Central City: a canvas awning, a folding table of mismatched goods under a bare bulb, a hanging coat of pockets, crates, wet cobbles, a lookout's empty stool.

**29. `shop-faction-trader.png`** A faction trader's wagon or stall at the frontier: a Smetanita-style lacquer-black and brass pavilion with a bright lamp, drawers of cores and rounds, bundles of gold-coin pouches; rich, polished, slightly sinister. No logos or lettering.

**30. `rest-safe-room.png`** A safe room: a reinforced cellar with a cot, a medical kit, a stove, a lamp, a rug over concrete, a door barred from inside. Warm, quiet, human.

**31. `rest-campfire.png`** A campfire under a broken roof: a ruined hall with rafters open to a night sky, a small fire in a ring of stones, a kettle, bedrolls (empty), sparks rising. The warm fire is the only strong light.

**32. `elite-lair.png`** An Elite's lair: a wide chamber hung with trophies and salvage (no bodies), a throne of crates and plates, chains, a dim red work lamp; threat without a creature in sight.

**33. `boss-door.png`** A Boss's arena door: a colossal doorway of black stone and iron at the end of a ruined hall, light leaking along its seam, fallen banners, the floor scratched in a wide arc. The most dramatic picture in the set (still no figure).

**34. `reward-cache.png`** A reward cache: an open armoured locker or sunken vault holding a few wrapped bundles, a glowing core, a pouch of coins (ivory and gold accents), dust motes in one shaft of light. Generic enough to hold any reward.

---

## Batch 4: people (10 portraits)

**Style block (the existing character-portrait mode, copied from `art/style-guide/PHC-Style-Guide.md` section 12, "Heavenprint
base prompt" + "Character portrait addition", and `art/briefs/m813-mpat.md` for the canvas):**

> Create an original Project Heaven Cry illustration in HEAVENPRINT. Use the attached approved Original 27 and New
> Faces images as the painting authority: expressive ink and opaque gouache, deliberate angular form, selective
> dry-brush scumbling, restrained hatching, charcoal lost edges and warm ivory accents. Faces have believable anatomy
> and restrained stylization (not enormous eyes, not interchangeable pointed chins, not flat cel shading) and specific
> emotional acting. Paint forms directly; avoid photographed skin with a texture overlay. Preserve local material
> colours and quiet dark areas. Match the references' finish without copying their characters, clothes, composition or
> incidental accessories. Follow the lore for tools and magic. Format: 4:5, 800 x 1000 PNG, one character, shown from
> the chest or waist up, one visible action, one specific emotion, one useful setting hint behind them. No
> unrequested text, frame, UI or watermark; no real-world person, brand or recognisable character.

**Attach:** `art/portraits/world/new-faces/orren-vask.png`, `.../ivara-drenn.png`, `art/portraits/m813/security-guard.png` (the
existing mode's finish), and one Original Heavenprint portrait. Save under `art/portraits/survival/`.

Mixed ages, builds and skin tones across the set. Nobody is a copy of a person or character from anything else.

**35. `shop-quartermaster.png`** An AHOC chapter quartermaster (Factions.md section 0): a broad middle-aged woman with grey-streaked cropped hair, sleeves rolled, a pencil behind her ear, a mesh counter in front, a lamp. Action: weighing a box of rounds in one hand. Emotion: dry patience, "you again?".

**36. `shop-dealer.png`** A civilian back-alley dealer in Central City (Sector-Earth): a thin, quick man in his thirties with a patched long coat full of inside pockets, stubble, a rolled sleeve, a bare bulb overhead. Action: opening his coat to show the goods. Emotion: friendly and calculating.

**37. `shop-trader.png`** A faction trader of the Smetanita Conjunction (Factions.md section 4): a poised older woman in lacquer-black and brass, rings, a gold-thread scarf, a small abacus-like ledger. Action: sliding a coin over the counter with one finger. Emotion: amused, in no hurry.

**38. `rest-medic.png`** A field medic at a rest stop: a tired young man (or woman) in a stained grey medical smock with a stitched plain plus mark patch (never a real-world cross emblem), a lantern, an open satchel. Action: stitching a bandage. Emotion: gentle, exhausted, steady.

**39. `giver-mission.png`** A mission-giver (an AHOC chapter officer with the suspicion of the truth, Factions.md section 0): a lean man in his fifties in a worn long coat with a ceramic-grey lapel plate, a map case, a dim office. Action: sliding a sealed folder across a desk. Emotion: controlled urgency, hiding something.

Elite and Boss faces: **the enemy table (`data/enemies.json`) has only five tiers (vermin, minion, soldier, elite, boss); the kinds come from `data/loot_tables.json` `kind_tables`**. The catalog has only `scavenger-drone` (drone) and `security-guard` (human) for them, so these five kinds have no portrait yet: `ork`, `crawler`, `robot`, `beast` and `upper_realm`. One Elite or Boss face each:

**40. `boss-ork-warlord.png`** (kind `ork`) An Ork warlord (Orks are the Hellraisers' standing enemy, Sector-Earth.md): a huge green-grey-ochre warrior with a broken tusk, daubed war paint in ochre and rust, a patchwork of salvaged plates, a heavy jaw. Action: hefting a nailed club, looking straight at the viewer. Emotion: delighted menace. Nothing recognisable from any game or film.

**41. `elite-crawler.png`** (kind `crawler`) A Crawler (NPC version 2: a human esper cursed to look like a monster to ordinary eyes; Sector-Earth.md): drawn as the player sees it, a hunched pale thing with too many joints and long dark fingers, but with a human sorrow in the eyes. Action: crouched on a wall edge, one hand raised. Emotion: wary grief. Not a copy of any known monster.

**42. `boss-robot-warframe.png`** (kind `robot`) A heavy Factory war robot (Sector-Earth.md; MPAT-and-M813.md): a tall ivory-and-charcoal ceramic combat automaton, chipped, a blank pixel-screen face with a single line of light, a stencilled regimental mark (abstract marks, no letters), welded patches. Action: raising one servo gauntlet. Emotion: none; the line of light on its face is the only expression. In the construction language of MPAT, but bigger and a soldier.

**43. `boss-beast-mana-warped.png`** (kind `beast`) A mana-warped beast: a lean horned hound-bear creature with faint glowing ivory veins along its flanks (mana as nanobots), ash on its fur, a ring of bone plates on its shoulder. Action: low and about to spring. Emotion: hunger, almost sorrow. Painted creature, not a monster-manual illustration.

**44. `boss-upper-realm-patch.png`** (kind `upper_realm`) An upper-realm "patch": a Celestial's counter to a mistake, a hero made to correct something (World Bible, "Heroes are patches"): a tall, immaculate figure in a pale armoured coat with a faint halo of straight lines behind the head, a perfect calm face that is slightly too symmetrical, hands empty. Action: standing quite still, one hand opening. Emotion: serene and mechanical, like a rule being applied. No wings, no religious emblem.

---

## Batch 5: gear follow-ups (13; the artist **replaces**, not adds)

Style block: **copy section 1 of [`GPT-PROMPTS-2026-11-13-gear.md`](GPT-PROMPTS-2026-11-13-gear.md) word for word** (the "Paint one game inventory icon in Heavenprint" paragraph, the
references, the faction accents) and use the family paragraphs for Pistols, Rifles, Submachine guns, Light blades and Heavy weapons, and Magazines and loaders from its section 2. **Save under the same file names as the originals in `art/icons/gear/`.** The line "(`-v2`)" in a prompt means
**this is a re-do of an existing file: the same design and the same silhouette, repainted so it reads at 32 px**; **three prompts (50, 51, 52) are new files**. General fix for every re-do: **bolder and simpler silhouette, one distinguishing feature drawn 20 to 30% larger, lighter values on dark metal (a lighter steel and ivory rim light so it separates from a dark panel `#10151F`), the object fills the same 80% box**.

**45. `mag-pistol_32.png`** (-v2) Pistol magazine (.32 Decrkm): a **single, fat, slightly curved stick** with a visible bright brass round at the top, a heavy base plate; 25% wider than before. **At 32 px:** a short fat curve, not a thin sliver.

**46. `mag-smg_32.png`** (-v2) SMG magazine (.32 Decrkm): a **long straight stick, very tall, with a clearly stepped ribbed body and a bright base plate**; twice the height of the pistol one. **At 32 px:** tall and ribbed.

**47. `mag-rifle.png`** (-v2) Rifle magazine: a **broad, strongly curved banana box with three rounds showing at the lip**, a wide bright base plate; the curve is the tell. **At 32 px:** one big banana curve.

**48. `mod-extended_mag.png`** (-v2) Extended magazine: a **very long curved box with a clear step** where the standard mag ends and the extension begins, an amber round at the top, ridged; visibly longer than the pistol, SMG and rifle magazines. **At 32 px:** the longest, with the step visible; amber accent kept.

**49. `weapon-service_pistol.png`** (-v2) Service pistol: the same design (squared slab slide, forward grip cut, open ejection port, stick magazine at the grip base, one faded blue-grey grip panel), **lighter metal**: pale gunmetal slide with bright ivory edge highlights and a mid-grey frame, not charcoal. **At 32 px:** a light slab on the dark panel.

**50. `mag-magistrate.png`** (new) Magistrate heavy-pistol magazine (for `weapon-magistrate_pistol.png`): a **short, thick, heavy single-stack box** with a flat base plate and two large rounds showing; heavy calibre, a plain dark steel body with bright edges; a thin clean-ivory band. **At 32 px:** short and fat, fatter than the pistol magazine.

**51. `mag-brigade_shotgun.png`** (new) Brigade auto-shotgun magazine (for `weapon-brigade_auto_shotgun.png`): a **wide flat box magazine with a pale steel plate and a gilt and brass-orange `#F68A38` top rim**, three fat shotgun shells showing at the top with brass bases; Adamantile plate shapes. **At 32 px:** wide and flat, with the orange rim.

**52. `mag-repeating_crossbow.png`** (new) Repeating crossbow magazine (for `weapon-repeating_crossbow.png`): a **tall slab-sided wooden-and-iron bolt hopper** with a hinged lid, four short bolts with violet-stained inlay lines showing at the top (Arkvelton), no gun parts. **At 32 px:** a tall box with bolts sticking up.

**53. `weapon-long_rifle.png`** (-v2) Long rifle: same design, **thicker silhouette**: a **very long barrel with a clearly oversized scope on top and a heavy bipod folded under the muzzle**; the barrel at least 40% thicker than before. **At 32 px:** the oversized scope and the bipod tell it from the marksman rifle.

**54. `weapon-ccec_marksman_rifle.png`** (-v2) CCEC marksman rifle: same design, **thicker silhouette**: a **stocky semi-auto with a cheek-riser stock, a short thick suppressor-like muzzle and a thin low-profile scope**; shorter and heavier than the long rifle. **At 32 px:** short, thick muzzle and a pale cheek-riser.

**55. `weapon-blackpoint_700.png`** (-v2) The .700 Blackpoint: same design, **much thicker silhouette**: an **absurdly large bore (a huge round muzzle), a short heavy barrel and a massive slab frame** about 60% thicker than the rifles; a visible oversized brass round at the breech. **At 32 px:** the huge round muzzle.

**56. `weapon-katana.png`** (-v2) Katana: a **long slim curved single-edged blade on the diagonal with a plain round guard (tsuba-like, but invented) and a dark wrapped hilt**, a single bright edge highlight along the blade. **At 32 px:** a slim bright curved line, **no ring on the guard larger than a small disc, no gem**; the plain one of the pair.

**57. `weapon-emanator_katana.png`** (-v2) Emanator katana: the same blade shape but with a **large ornate ring guard (a wide circle around the hilt, about 25% of the blade length) and a big violet `#9D7ADC` gem in the guard**, more rounded forms (the Soul line), a violet etched line in the blade. **At 32 px:** the big ring and the bright violet gem; tells it from the plain katana at a glance.

---

## Batch 6: Survival cards (3, optional, last)

Scene block, **card variant** (4:3, 2048 x 1536, no characters). The UI puts the words on top: leave the upper or lower third calm. Save as `art/illustrations/survival/cards/<name>.png`.

**58. `title-survival.png`** The mode's title card: a long road of broken tiles and rubble leading toward a cluster of lit district windows on a dark horizon, three paths forking in the middle ground, a cold sky with a thin crack of gold light high up (Heaven coming down). Hope and dread together.

**59. `run-over.png`** A "run over" card: the same road at night, a single dropped lantern burning low on a cracked step in the foreground, mana motes rising from the ground (the dead feed the air), the lit windows far away and dim. Quiet loss, not gore.

**60. `run-won.png`** A "run won" card: dawn on the same road, the paths merging into one wide road to a lit city gate, the lantern re-lit and placed on a wall, a pale gold sky, warm ivory light. Earned relief, not triumph.
