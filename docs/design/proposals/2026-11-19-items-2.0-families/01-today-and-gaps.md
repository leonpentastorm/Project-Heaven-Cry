# Design record: file 01 (the fight banners, class-move icons, mods, a Figment portrait and the map kit)

Moved here on 19 Nov 2026 from `art/briefs/prompts-2026-11-19/01-today-and-gaps.md`, which now holds only the artist's
prompts (37 pictures). Nothing below is for the artist. What was taken out of the artist file, and why:

- **Section 5, the three HOLD rows** (`guardian.ward` Ward, `guardian.sanctuary` Sanctuary, `visualizer_core` Load the
  Visualizer). They may need no picture at all; they are not in the artist's pack. If any of them is wanted later, its
  prompt is in the original text below and goes into a new prompt file.
- **The PROPOSED marks** on the ids `banner-approach` and `banner-level-up` (approved under R1: the ids stand).
- **The intake notes** (catalog maps `move_icons` and `gear`, `tools/art/kit_catalog.py` HOLD removal, the seam checker
  run) and the pointer to the art list. Intake stays the lead's job: `art/catalog.json`, `tools/rehash_art_checksums.py`,
  `tools/validate_art.py`, `tools/art/kit_seams.py --sheet <dir>`, `npm run assets`.
- **Rules numbers in the Shows lines** (19 Nov, last pass): the Sigil wall's "full cover, 30 HP, crumbles after 3 rounds",
  the pile's "picked up for 1 AP", the seam measurements "(band step 2.81, limit 2.0)" and "(3.32)". The numbers live in
  data; the artist's lines now say what the thing does in words.
- **"Daggerfall-type battlefield"** in the field kit's setting line is now "old battlefield" in the artist file (Daggerfall
  is a real game title; the lore term stays in design docs).
- **The field Sigil mark's glyph** was "a cross of unequal strokes"; it is now "three notched strokes inside a broken
  ring" (a cross reads as a real faith's symbol).
- The two pointers to the older briefs (`GPT-PROMPTS-2026-11-15-figments.md`, `GPT-PROMPTS-2026-11-13-survival.md`
  "Batch 1c") were removed from the artist file: the pack is self-contained.

The artist file as it stood before the final pass (commit 7bfb793b) follows, unchanged, for the record.

---

# GPT prompts, 19 Nov 2026, file 01: today's build (P0) and the gaps in the live game

For the artist, and for GPT. Source of the list: [`../ART-REQUESTS-2026-11-19.md`](../ART-REQUESTS-2026-11-19.md), sections 1 and 3 (ids, names, file names and one-line directions are its own). This file holds **40 prompts**: 3 for today's build (P0), 3 class-move icons owed since 0.30, 2 mod paintings, 1 Figment portrait, 28 map-kit pieces, and 3 held rows that may need no picture at all (counted in the 40).

**One image a prompt.** For each picture: attach the references of its mode, paste **the mode's style block once** (below, one per mode), then paste the entry's fenced prompt. Each fenced prompt reads on after the style block and names its own subject, its own "At icon size" test and its own "Avoid" list. Every delivery is a review candidate until Leon approves it; Claude adds the catalog entries, runs `python3 tools/rehash_art_checksums.py`, `python3 tools/validate_art.py` and `npm run assets`.

**In-world only.** Everything is invented: no real-world person, brand, franchise, place or insignia, no real weapon model, no real faith's symbol (a medical mark is a plain plus, never a red cross). **No text, letters or numbers in any image** (a glyph is an abstract mark, never a letterform). Nanobots are mana. Lore: `docs/lore/`.

## Order

1. Section 1 (P0, today): `banner-approach`, `banner-level-up`, `second_wind`.
2. Section 2 (class moves owed since 0.30): `move-draw-fire`, `class:fighter.wind_up`, `read_the_swing`.
3. Section 3 (two mod paintings and the Scrap Turret portrait).
4. Section 4 (the map kit: the 4 held-back fixes first, then the 24 new pieces; lowest priority of the firm rows).
5. Section 5 (HOLD: check with Claude before drawing).

## Counts

| Mode | Count | Entries |
| --- | --- | --- |
| Sign (white flat ink, 1024 x 1024) | 2 | banner-approach, banner-level-up |
| Wick icon (white flat ink, 1024 x 1024) | 4 live + 3 HOLD | second_wind, move-draw-fire, wind_up, read_the_swing; HOLD: ward, sanctuary, load-the-visualizer |
| Gear painting (1024 x 1024) | 2 | mod_follow_guard, mod_afterword |
| Figment portrait (800 x 1000) | 1 | figment-scrap-turret |
| Kit sprite (256 x 256, or a 1024 ground) | 28 | 4 CHANGE, 24 NEW |
| **All** | **40** | |

---

## Style blocks, one per mode (paste the matching one first)

### Wick icon (perks, class moves, verbs)

**Attach:** `art/icons/traits/mind-without-fog.png` (the master), three of `art/icons/perks/*.png` and two of `art/icons/moves/*.png` for the line weight. Rule: `art/icons/STYLE-LOCK.md`.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons: Wick, the small flame-headed figure of the trait and perk icons, in bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight. No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. Wick is the only full figure; anyone else is a partial (a hand, a shoulder, a silhouette cut by the frame). One action, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 32 px in a row and at 44 px on a chip: silhouette first, two or three interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only: nothing recognisable from real-world works, brands, insignia or religions. The icon shows:

### White-ink sign (banners, conditions, interface marks)

**Attach:** `art/icons/traits/mind-without-fog.png`, `art/icons/banners/fight-start.png`, `fight-won.png`, `fight-lost.png` and `fight-field.png` (the family: match their weight), and `art/icons/boons/edge.png`.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons (bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight). No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. This icon is a sign, not a scene: Wick does not appear; a small generic faceless silhouette may. One subject, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 16 px in a tile corner or beside a word and at 48 px on a banner: silhouette first, two interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only. The icon shows:

### Gear painting (mods)

**Attach:** `art/icons/gear/mod-foregrip.png`, `art/icons/gear/mod-bayonet.png` and `art/icons/gear/mod-compensator.png` (the family: scale, light, edge hierarchy), and one portrait for the brushwork, e.g. `art/portraits/world/new-faces/orren-vask.png`. Rule: `art/style-guide/gear-icons.md`; palette `art/style-guide/palette.json`.

> Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss and no uniform digital sharpness. One single object, three-quarter view, lit from one side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene. Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha; the object fills about 80% of the canvas (about 100 px of clear margin on every side). No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands and no figures. Everything is invented: never a recognisable real-world make, model or emblem. The silhouette is bold and readable first: the icon is shown at 64 px in a shop grid and at 32 px in a backpack row, so keep detail on one or two focal edges. Metal in charcoal, steel grey and warm ivory highlights; one accent colour only, given below. No coloured rarity border (the UI adds it). Standard finish with honest wear. The object:

### Figment portrait

**Attach:** `art/icons/skills/visualization.png`, `art/icons/skills/analysis.png`, `art/icons/skills/charisma.png`, and the delivered `art/portraits/figments/figment-sentinel.png` and `figment-wall.png` (the family look). Source of the set: `GPT-PROMPTS-2026-11-15-figments.md`.

> Create a PHC Heavenprint abstract portrait of a Figment, a made thing, not a person, matching the attached Figment portraits. Opaque cream gouache and broken directional ink marks on pure black, the body built of small cream flecks and squares like filings, denser where the form is solid, at least one edge fraying into drifting motes. No face, no living eyes, no skin, no clothes, no NPC identity. Palette: black #000000, neutral cream #F2E5C8 and ONLY Expression deep petrol-blue (#075369, with #14758B lighter and #033443 darker) for every remaining mark and shadow. No unrelated undertones. Keep the whole subject inside the central circle (about 560 px across, centred at x 400, y 480 of the image); leave the corners black; the silhouette must read at 40 px. Vertical 4:5, 800 x 1000 PNG, opaque, no text or border. This Figment:

### Kit sprite (the map kit)

**Attach:** the setting's own pieces from `art/sprites/kit/<setting>/` (at least `crate.png`, `barrel.png`, `lamp.png`, `terminal.png`, `wall-straight.png`, `ground-1.png`) and that setting's first backdrop from `art/illustrations/survival/backdrops/`; the existing `art/sprites/objects/poi-marker.png`, `fire.png` and `rubble.png` for the view. How the kits are briefed: `GPT-PROMPTS-2026-11-13-survival.md`, "Batch 1c".

> Paint one game-map kit piece in Heavenprint: hand-painted gouache and ink with broken, directional brush strokes, selective dry-brush scumbling, restrained hatching and warm ivory accents, the same hand as the attached kit pieces, but simplified and bold so it reads at 64 px. Straight overhead view, no perspective tilt, no horizon. Flat, even top light with one consistent soft highlight from the upper left on edges and tops; NO cast shadow, NO drop shadow, NO ground contact shadow, NO glow or bloom. Scale: one tile = 1.5 m = 256 px; a crate is about a metre (about 170 px), a standing person's footprint about a third of a tile. No text, no letters, no numbers, no signs with writing, no logos, no figures, no creatures, no UI, no frame, no border, no watermark. Everything is invented. For a sprite: transparent background (PNG with alpha), the object centred inside an 80% safe box of a 256 x 256 px canvas, crisp clean edges, no halo, nothing touching the canvas edge. For a ground texture: a seamless tileable square texture, 1024 x 1024 px, straight top-down, the left and right edges match and the top and bottom edges match when repeated, flat even lighting, no vignette, no border, no landmark that would show as a repeat, no objects on it, even mid-dark value with gentle low-contrast variation. The piece:

**The six settings (each kit prompt names its setting's material and accent; they repeat here so you can check the set).** ahoc: ceramic-grey panels, riveted plate, concrete, rust-red `#F65157` marks, amber lamp glass. city: wet cobbles, ivory plaster, brick, iron, canvas, amber lamp pools and blue-grey `#5394AC` shadow. field: cracked mud, ash, scorched steel plate, sandbag canvas, smoky orange `#F68A38`, faint ivory mana specks. works: dark iron plate, soot, cast steel, ivory safety lines, furnace orange `#F68A38` against cool blue lamp light. shrine: pale flagstone, dark wood, ivory wax, violet cloth, gold `#F2C46A` candle glow. rim: blue-grey steel, ivory plate, black glass, cyan `#8BDEEE` light strips, one warm lamp.

---

## 1. P0: for today's build (0.31.11 and 0.31.12)

The game falls back to text where these are missing; nothing is blocked.

### `banner-approach`: APPROACH banner mark (PROPOSED id)

- **Mode:** White-ink sign, 1024 x 1024 PNG, transparent.
- **Save as:** `art/icons/banners/fight-approach.png`; catalog `interface_icons`.
- **Shows:** the fight's first big banner while no foe has seen the squad (sub-line "Unseen · moving is free"); drawn as a mask in the stripe colour, beside `banner-fight-start`, `-won`, `-lost` and `-field`.

```
A sign for APPROACH, the quiet minute before contact when nobody has seen the squad yet. One flat white boot print, toe pointing up and to the right, set low in front of three horizontal bands of fog that thin out to the right: the first band solid, the second broken into long dashes, the third only a few scattered dots. A little clear space between the print and the first band. The meaning is stealth before contact, a step into the unseen. At icon size it must read as one print leading into dissolving bars. It must look different from the start mark, the won mark, the lost mark and the free-roam mark: no ring, no pair of crossing prints, no looping arrow, no flag, no burst, no crosshair. Avoid: a magnifying glass, an eye, a question mark, a ghost, a compass, wavy cloud outlines, any text.
```

### `banner-level-up`: LEVEL UP banner mark (PROPOSED id)

- **Mode:** White-ink sign, 1024 x 1024 PNG, transparent.
- **Save as:** `art/icons/banners/level-up.png`; catalog `interface_icons`.
- **Shows:** a new banner shown to the whole room when a character levels (today only a log line and the words LEVEL UP).

```
A sign for LEVEL UP, a character growing. A short stair of three solid steps rising to the right, a small faceless generic silhouette standing on the top step with one foot lifted to go higher, and above it a nested pair of upward chevrons with three short rays fanning out over the top. Everything solid white, bold, with a little clear space between the stair, the silhouette and the chevrons. The meaning is growth, not victory: rising, not winning. At icon size the stair and the upward chevrons carry it; the silhouette may fall to a dot. It must differ from the won mark (no wreath, no flag, no raised arms). Avoid: a star, a crown, a trophy, a medal, a laurel, a plus sign, an up arrow with text, a number, any letters, a cartoon thumbs-up.
```

### `second_wind`: Second Wind (Pain Threshold perk and the combat action)

- **Mode:** Wick icon, 1024 x 1024 PNG, transparent; the pipeline makes the perk sizes.
- **Save as:** `art/icons/perks/second-wind.png` (one picture; the combat action points to it).
- **Shows:** the combat bar's Second Wind action now (0.31.12), then the 0.32 perk card (Pain Threshold).

```
Wick in the half-second after a hard blow, catching his breath: bent a little at the waist with one hand pressed flat to his ribs, and his back straightening again, the line from hips to head rising into an upright stance, the flame of his head burning taller than a moment ago. Two short curved ticks at his chest show the breath going in, kept inside the silhouette, not drawn as air. Feet planted a shoulder apart. The meaning is the body drawing itself back up for one more turn. At icon size it must read as a figure straightening with a hand at his side. Do not copy the boons Second Wind sign, a grimacing face with a brick, or a gust. Avoid: swirling wind lines, lungs or any anatomy, a heart, a plus sign, a cloud, sweat drops, text.
```

---

## 2. Class-move icons owed since 0.30

Wick icons for three Class move cards; all three are live in the game with no (or a placeholder) picture.

### `move-draw-fire`: Called Out (Bulwark rank I, `class:defender.draw_fire`)

- **Mode:** Wick icon, 1024 x 1024 PNG, transparent.
- **Save as:** `art/icons/moves/draw-fire.png` (replaces the placeholder `draw-fire.svg`; catalog `move_icons` `move-draw-fire`).
- **Shows:** Class move card and the fight bar. Naming a foe: its next attack must be aimed at the Bulwark.

```
Wick facing right with a tower shield raised on his left arm, his right arm flung out straight and pointing, his head thrown back and forward as he shouts: three short broken call lines leap from his head toward the edge of the frame, where the cut-off silhouette of a single foe (just a shoulder and the point of a helm) is turning to look at him. The shield is the bulk of the picture, a bold rounded slab with one interior cut. The meaning is making a foe pick you. At icon size it must read as a shielded figure pointing and calling. Avoid: a speech bubble, letters, an exclamation mark, a megaphone, a target or bullseye, a taunting face, a second full figure.
```

### `class:fighter.wind_up`: Wind-up (Breaker rank I)

- **Mode:** Wick icon, 1024 x 1024 PNG, transparent.
- **Save as:** `art/icons/moves/wind-up.png` (catalog `move_icons`; the data link is also missing: Claude's job).
- **Shows:** Class move card. Wind-up: the Breaker starts each fight with more Momentum.

```
Wick coiled for a heavy swing: weight on a bent back leg, torso twisted away from the target, both hands gripping a long heavy-headed weapon drawn back behind his shoulder with its head high over his back. Two short curved arcs trail behind the weapon head to show the tension stored, not motion blur. The front foot is light, toes forward. The meaning is Momentum already stored before the first blow. At icon size it must read as a figure cocked back with a heavy head over the shoulder. Avoid: the swing already landing, an impact burst, sparks, a spinning blur, a specific named weapon, a spring or a clock, text.
```

### `read_the_swing`: Read the Swing (Breaker rank II)

- **Mode:** Wick icon, 1024 x 1024 PNG, transparent.
- **Save as:** `art/icons/moves/read-the-swing.png` (catalog `move_icons`; not linked in data yet).
- **Shows:** Class move card. Once a round a melee attack that misses the Breaker gives Momentum.

```
Wick leaning hard out of the way of a blow: head and shoulders tipped aside, one foot stepping off the line, and a single wide curved band (the cut-off arc of a swing from the edge of the frame) passing through the exact place where his head was a heartbeat ago, left empty. Two small short marks at the side of his head show him watching it come. His free hand is open and low, ready to take the momentum. At icon size it must read as a figure dodging a curved band that goes through empty space. It must look different from Called Out (no shield, no pointing, no calling). Avoid: the blow hitting, a spiral, a swirl of dust, an eye icon, an arrow, text.
```

---

## 3. Two mod paintings and a Figment portrait

### `mod_follow_guard`: Shield follow (mod)

- **Mode:** Gear painting, 1024 x 1024 PNG, transparent.
- **Save as:** `art/icons/gear/mod-follow_guard.png` (catalog `gear`).
- **Shows:** Backpack, shop, Forge. A shield mod: follow strike at 0.4 of the shield's blow, and Guard on a hit.

```
Subject: a shield fitting, the follow bracket (weightless in the game, a hand-sized part). Silhouette feature: a curved steel arm bracket shaped like half a ring, with a hinge pin at its top end, a short sprung link, and a worn walnut-brown leather strap running through two slotted loops and closed with one brass buckle, so the shield follows the arm forward and back. The bracket is laid flat, three-quarter view, the strap curled once in a loose S. Materials and accent: dark scuffed steel, oiled leather, a single small brass buckle; the accent is the brass, no faction colour (Frontier, unbranded). At 32 px: a half-ring of steel with a strap hanging off it. Against the foregrip: it is a ring and a strap, not a grip; against the bayonet: not a blade. No shield face in the picture, no hands, no arm.
```

### `mod_afterword`: Afterword's edge (mod)

- **Mode:** Gear painting, 1024 x 1024 PNG, transparent.
- **Save as:** `art/icons/gear/mod-afterword.png` (catalog `gear`); match the painting `art/icons/gear/weapon-afterword.png` (hammered bronze-brown blade, brass rings, rust-red stitched leather).
- **Shows:** Backpack, Forge. A fitted edge for the reversed-grip knife: its follow leaves Bleeding.

```
Subject: a fitted knife edge, Afterword's edge (a hand-sized part). Silhouette feature: a slim detachable edge plate the length of a hand, shaped like a leaf blade with a straight back, a single small stepped notch cut into its spine near the base, and two round brass rivets in a short brass clamp collar at its base, so it clips over a knife's own edge. Laid at a slight diagonal, point to the lower left, as the knife is. Materials and accent: hammered dark bronze-brown steel with a pale honed cutting edge, brass collar; the one accent is the same rust-red stitched leather as on Afterword, a small tab between the two rivets and nowhere else. At 32 px: a bronze leaf blade with a rust-red tab. Against Afterword itself: no handle, no wrap, no pommel; it is the blade part only. Avoid: a full knife, a sword, a real brand mark, a blood drop (bleeding is shown by words).
```

### `figment-scrap-turret`: Scrap Turret / Scrap Sentinel (Figment portrait)

- **Mode:** Figment portrait, 800 x 1000 PNG, opaque.
- **Save as:** `art/portraits/figments/figment-scrap-turret.png` (catalog `characters`, Figment collection; the icon id `figment-scrap-turret` already exists as a line icon).
- **Shows:** The Figment card and the token for the Rigger's turret (40 HP, does not move, fires a plain weapon for 3 rounds at the nearest foe).

```
The Scrap Turret: a turret thrown together by the bots from scrap and light, a stopgap rather than a proper form, and unlike the tall slender Sentinel it is squat, low and cobbled. Subject: a rounded hunched cowl made of five mismatched rectangular plates of cream flecks and squares, each plate edged with a row of tiny rivet dots, overlapping like badly fitted armour; one short stubby pistol barrel clamped on its front, one round lens above it; two bent splayed legs of jointed flecks holding it, and a third stump behind as a brace. Stature: wide and low, about as wide as it is tall, sitting in the lower middle of the circle. Pose: planted, barrel level and pointing right, still. Cue: three loose spare plates hanging in the air above its shoulders, edges fraying into motes, being drawn in to patch it; the base and the legs dissolve into drifting flecks. Avoid: a face, living eyes, a tall spire, a tank, a real turret model, any lettering on the plates.
```

---

## 4. The map kit: 4 held-back fixes, then 24 new pieces

Files go in `art/sprites/kit/<setting>/` under the names given. The game draws a plain fallback where a piece is missing, and a held-back piece is drawn plain until its replacement is delivered. All other kit rules (view, size, no shadow, 80% safe box) are in the kit style block above.

### 4.1 The 4 held-back pieces (CHANGE: replace the file of the same name)

Claude removes each piece from `HOLD` in `tools/art/kit_catalog.py` on intake. Grounds are checked with `python3 tools/art/kit_seams.py --sheet <dir>` and must read clean before delivery; the wall corner is checked butted to the straight piece at 64 px.

### `kit-ahoc-ground-2`: AHOC ground 2

- **Mode:** Kit sprite, ground, opaque 1024 x 1024 seamless tile.
- **Save as:** `art/sprites/kit/ahoc/ground-2.png`.
- **Shows:** Survival fight maps, AHOC chapter outpost. The old file has a seam at the left-right join (band step 2.81, limit 2.0).

```
Setting: ahoc, a tired, well-kept containment base. A seamless tileable ground, 1024 x 1024, straight top-down: scuffed ceramic-grey floor plates with bolted seams every half tile (every 128 px) and two faint worn walking lanes of slightly paler wear running top to bottom. To fix the old seam: every lane, seam line and bolt row must be placed so that it meets its own continuation exactly at the left edge and the right edge and at the top edge and the bottom edge, with the overall brightness the same all the way across (no lighter or darker vertical band near either edge, no vignette, no stripe that ends at the border). Calm, even mid-dark grey with low-contrast scuffs and a few dull rust-red paint ghosts no bigger than a bolt. No letters, no stencil text, no objects. Avoid: a single large stain or a landmark that would show as a repeat, a bright seam line, a gradient across the tile.
```

### `kit-shrine-ground-2`: Shrine ground 2

- **Mode:** Kit sprite, ground, opaque 1024 x 1024 seamless tile.
- **Save as:** `art/sprites/kit/shrine/ground-2.png`.
- **Shows:** Survival fight maps, shrine and cathedral district. The old file's octagon rows lose their step at the top-bottom join (3.32).

```
Setting: shrine, a hushed sacred place in candlelight. A seamless tileable ground, 1024 x 1024, straight top-down: dark polished stone floor with a faint ivory inlay line pattern of repeating octagons and small squares, abstract geometry only. To fix the old join: the octagon rows must be an exact whole number of rows in 1024 px (four rows of 256 px) so the pattern continues unbroken across the top and bottom edges as well as across the left and right edges; the inlay lines are the same thickness everywhere, with no row cut half through at an edge. Even mid-dark value, deep violet-black stone with the inlay in dim ivory, a barely visible gold #F2C46A fleck in a few inlay crossings, gentle polish variation. Avoid: anything that reads as writing or a symbol of a real faith, a central medallion, a glow, a vignette.
```

### `kit-ahoc-dress-2`: AHOC dress 2

- **Mode:** Kit sprite, set dressing, 256 x 256 transparent.
- **Save as:** `art/sprites/kit/ahoc/dress-2.png`.
- **Shows:** Survival fight maps, AHOC outpost; non-blocking, scattered on any free tile, meaning nothing in the rules. The old file has lettering on the floor.

```
Setting: ahoc, a ceramic-grey containment base. Set dressing, non-blocking, low and flat, nothing taller than a few centimetres: a stencilled floor marking, a faded ivory arrow with a boxed zone made of four short corner brackets beside it, painted on a patch of ceramic-grey plate and worn down to a ghost, with a few chipped edges and a dusty smear. All of it is abstract shapes only: no letters, no numerals, no words, no wordmark on the floor. The paint is ivory with one thin rust-red #F65157 band at one edge. Transparent background, the marking and its plate patch in the central 80% of the cell with a soft ragged edge. Avoid: any lettering at all (the last version had a phrase painted on the floor), hazard text, a person.
```

### `kit-rim-wall-corner`: Rim wall corner

- **Mode:** Kit sprite, wall piece, 256 x 256 cell, transparent.
- **Save as:** `art/sprites/kit/rim/wall-corner.png`.
- **Shows:** Survival fight maps, rim station. The old corner is a different wall than its straight (a panel grid and a lighter shade), so every corner shows a join.

```
Setting: rim, a lonely frontier station. A wall piece, corner: an L joining the left edge and the bottom edge of a 256 x 256 cell, outer corner square, painted as the very same wall as the attached rim wall-straight: a blue-grey bulkhead band half a tile thick (128 px), a darker outline on the exposed edges only, an ivory cap band, and a thin cyan #8BDEEE light strip along the top face. Match the straight piece exactly in its blue-grey value, its panel texture (no added panel grid), its cap width and its light strip: the strip and the cap band run through the corner in one unbroken line and meet the straight pieces at the same height and centreline at both cut ends. Both arms end flat-cut exactly at the cell edge with no end outline, so the piece butts cleanly to a straight run. Top light from the upper left, no shadow. Avoid: a different shade, extra panel seams, a lighter cap, a rounded corner, a gap, any text.
```

### 4.2 The 24 new pieces (NEW)

Four objects the engine places, one piece of each per setting (6 settings). The game drew them as a plain glyph until now: `poi` the point of interest (a diamond), `sigil_wall` the raised Sigil wall (a hatched square), `sigil_mark` the old carved Sigil word (a star), `pile` the heap of things on the ground (three bars). **Lowest of the firm rows.** All are 256 x 256 transparent sprites, one tile, per the kit style block. Each prompt names its setting and its own materials, so paste the kit style block and the prompt only.

### `kit-ahoc-poi`: Point of interest, ahoc

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/ahoc/poi.png`.
- **Shows:** Survival fight maps, AHOC chapter outpost; a tile worth a closer look (Examine it, the Narrator gives the ways to deal with it). A plain diamond today.

```
Setting: ahoc, AHOC chapter outpost (ceramic-grey panels, riveted plate, concrete, rust-red #F65157 marks, amber lamp glass). One point-of-interest sprite, non-blocking, flat on the ground, about one tile: a small sealed ceramic-grey evidence case with a rust-red band, its latch half open and one amber lamp lit on its lid, resting on a floor plate where the dust has been wiped away in a neat circle round it. It must say 'look here' without saying what: one small object and one cleared ring, nothing that reads as loot or a hazard. At 64 px: a small object in a bare circle, bigger than a dress piece but quieter than a crate. It must differ from the setting's terminal, lamp and cache. Avoid: an exclamation mark, an arrow, a question mark, a glowing beam, any writing.
```

### `kit-city-poi`: Point of interest, city

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/city/poi.png`.
- **Shows:** Survival fight maps, Central City back streets; a tile worth a closer look (Examine it, the Narrator gives the ways to deal with it). A plain diamond today.

```
Setting: city, Central City back streets (wet cobbles, ivory plaster, brick, iron, canvas, warm amber lamp light and blue-grey #5394AC shadow). One point-of-interest sprite, non-blocking, flat on the ground, about one tile: a lifted cobblestone hatch left ajar over a dark gap, a little brass oil lantern with amber glass set beside it and a pale chalk ring (no marks inside it) drawn round both on the wet stones. It must say 'look here' without saying what: one small object and one cleared ring, nothing that reads as loot or a hazard. At 64 px: a small object in a bare circle, bigger than a dress piece but quieter than a crate. It must differ from the setting's terminal, lamp and cache. Avoid: an exclamation mark, an arrow, a question mark, a glowing beam, any writing.
```

### `kit-field-poi`: Point of interest, field

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/field/poi.png`.
- **Shows:** Survival fight maps, Daggerfall-type battlefield; a tile worth a closer look (Examine it, the Narrator gives the ways to deal with it). A plain diamond today.

```
Setting: field, Daggerfall-type battlefield (cracked mud, ash, scorched steel plate, sandbag canvas, burnt wood, smoky orange #F68A38, faint ivory mana specks). One point-of-interest sprite, non-blocking, flat on the ground, about one tile: a small cairn of sandbag canvas with a bent steel signal stake thrust into it and a torn strip of ivory cloth tied on the stake, a ring of scuffed mud cleared round the cairn. It must say 'look here' without saying what: one small object and one cleared ring, nothing that reads as loot or a hazard. At 64 px: a small object in a bare circle, bigger than a dress piece but quieter than a crate. It must differ from the setting's terminal, lamp and cache. Avoid: an exclamation mark, an arrow, a question mark, a glowing beam, any writing.
```

### `kit-works-poi`: Point of interest, works

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/works/poi.png`.
- **Shows:** Survival fight maps, machine works and drone foundry; a tile worth a closer look (Examine it, the Narrator gives the ways to deal with it). A plain diamond today.

```
Setting: works, machine works and drone foundry (dark iron plate, soot, cast steel, ivory safety lines, furnace orange #F68A38 against cool blue lamp light). One point-of-interest sprite, non-blocking, flat on the ground, about one tile: a cooling slag-cast ingot on a scorched iron plate with one hot-orange seam still glowing, a blue work lamp clipped to the plate's edge, and a ring of swept soot round them. It must say 'look here' without saying what: one small object and one cleared ring, nothing that reads as loot or a hazard. At 64 px: a small object in a bare circle, bigger than a dress piece but quieter than a crate. It must differ from the setting's terminal, lamp and cache. Avoid: an exclamation mark, an arrow, a question mark, a glowing beam, any writing.
```

### `kit-shrine-poi`: Point of interest, shrine

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/shrine/poi.png`.
- **Shows:** Survival fight maps, shrine and cathedral district; a tile worth a closer look (Examine it, the Narrator gives the ways to deal with it). A plain diamond today.

```
Setting: shrine, shrine and cathedral district (pale flagstone, dark wood, ivory wax, violet cloth, gold #F2C46A candle glow). One point-of-interest sprite, non-blocking, flat on the ground, about one tile: a shallow stone offering dish holding one lit candle with violet cloth folded beneath it, the flagstones round it swept in a clean ring and a few ivory wax drips on the rim. It must say 'look here' without saying what: one small object and one cleared ring, nothing that reads as loot or a hazard. At 64 px: a small object in a bare circle, bigger than a dress piece but quieter than a crate. It must differ from the setting's terminal, lamp and cache. Avoid: an exclamation mark, an arrow, a question mark, a glowing beam, any writing.
```

### `kit-rim-poi`: Point of interest, rim

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/rim/poi.png`.
- **Shows:** Survival fight maps, rim station; a tile worth a closer look (Examine it, the Narrator gives the ways to deal with it). A plain diamond today.

```
Setting: rim, rim station (blue-grey steel, ivory plate, black glass, thin cyan #8BDEEE light strips, one warm lamp). One point-of-interest sprite, non-blocking, flat on the ground, about one tile: a black-glass maintenance hatch set into blue-grey plate with a pulsing cyan light strip round its edge, its cover ajar and a loose cable looped out of the gap, the plate round it scuffed in a ring. It must say 'look here' without saying what: one small object and one cleared ring, nothing that reads as loot or a hazard. At 64 px: a small object in a bare circle, bigger than a dress piece but quieter than a crate. It must differ from the setting's terminal, lamp and cache. Avoid: an exclamation mark, an arrow, a question mark, a glowing beam, any writing.
```

### `kit-ahoc-sigil_wall`: Sigil wall, ahoc

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/ahoc/sigil_wall.png`.
- **Shows:** Survival fight maps, AHOC chapter outpost; the wall of packed mana a RAISE Sigil makes: blocks movement and sight, full cover, 30 HP, crumbles after 3 rounds. A hatched square today.

```
Setting: ahoc, AHOC chapter outpost (ceramic-grey panels, riveted plate, concrete, rust-red #F65157 marks, amber lamp glass). One Sigil wall sprite, a block of packed mana (nanobots) filling about three quarters of the one-tile cell, square to the grid, straight overhead. It is built of cool pale cyan-white flecks with amber specks, dense and nearly solid in the middle so it reads as full cover that blocks a standing person, with three stacked horizontal bars of denser flecks laid across its top face as the raised Sigil, an abstract mark and never a letter. The edges are crisp on the top and left and fray into a few drifting motes on the right and bottom, so it looks newly made and about to crumble. A faint inner glow of its own flecks only, no bloom outside it. At 64 px: a bright speckled slab with one bold mark. It must not read as masonry, glass, ice or a stone wall of the setting. Avoid: a brick pattern, a door, a person, a shield, any lettering.
```

### `kit-city-sigil_wall`: Sigil wall, city

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/city/sigil_wall.png`.
- **Shows:** Survival fight maps, Central City back streets; the wall of packed mana a RAISE Sigil makes: blocks movement and sight, full cover, 30 HP, crumbles after 3 rounds. A hatched square today.

```
Setting: city, Central City back streets (wet cobbles, ivory plaster, brick, iron, canvas, warm amber lamp light and blue-grey #5394AC shadow). One Sigil wall sprite, a block of packed mana (nanobots) filling about three quarters of the one-tile cell, square to the grid, straight overhead. It is built of warm violet-blue flecks lit amber at the top, dense and nearly solid in the middle so it reads as full cover that blocks a standing person, with a rising chevron of denser flecks laid across its top face as the raised Sigil, an abstract mark and never a letter. The edges are crisp on the top and left and fray into a few drifting motes on the right and bottom, so it looks newly made and about to crumble. A faint inner glow of its own flecks only, no bloom outside it. At 64 px: a bright speckled slab with one bold mark. It must not read as masonry, glass, ice or a stone wall of the setting. Avoid: a brick pattern, a door, a person, a shield, any lettering.
```

### `kit-field-sigil_wall`: Sigil wall, field

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/field/sigil_wall.png`.
- **Shows:** Survival fight maps, Daggerfall-type battlefield; the wall of packed mana a RAISE Sigil makes: blocks movement and sight, full cover, 30 HP, crumbles after 3 rounds. A hatched square today.

```
Setting: field, Daggerfall-type battlefield (cracked mud, ash, scorched steel plate, sandbag canvas, burnt wood, smoky orange #F68A38, faint ivory mana specks). One Sigil wall sprite, a block of packed mana (nanobots) filling about three quarters of the one-tile cell, square to the grid, straight overhead. It is built of ash-grey flecks with smoky orange sparks, dense and nearly solid in the middle so it reads as full cover that blocks a standing person, with two crossing diagonal strokes of denser flecks laid across its top face as the raised Sigil, an abstract mark and never a letter. The edges are crisp on the top and left and fray into a few drifting motes on the right and bottom, so it looks newly made and about to crumble. A faint inner glow of its own flecks only, no bloom outside it. At 64 px: a bright speckled slab with one bold mark. It must not read as masonry, glass, ice or a stone wall of the setting. Avoid: a brick pattern, a door, a person, a shield, any lettering.
```

### `kit-works-sigil_wall`: Sigil wall, works

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/works/sigil_wall.png`.
- **Shows:** Survival fight maps, machine works and drone foundry; the wall of packed mana a RAISE Sigil makes: blocks movement and sight, full cover, 30 HP, crumbles after 3 rounds. A hatched square today.

```
Setting: works, machine works and drone foundry (dark iron plate, soot, cast steel, ivory safety lines, furnace orange #F68A38 against cool blue lamp light). One Sigil wall sprite, a block of packed mana (nanobots) filling about three quarters of the one-tile cell, square to the grid, straight overhead. It is built of pale orange-white flecks like drifting filings against the dark iron, dense and nearly solid in the middle so it reads as full cover that blocks a standing person, with a ring split by one vertical stroke of denser flecks laid across its top face as the raised Sigil, an abstract mark and never a letter. The edges are crisp on the top and left and fray into a few drifting motes on the right and bottom, so it looks newly made and about to crumble. A faint inner glow of its own flecks only, no bloom outside it. At 64 px: a bright speckled slab with one bold mark. It must not read as masonry, glass, ice or a stone wall of the setting. Avoid: a brick pattern, a door, a person, a shield, any lettering.
```

### `kit-shrine-sigil_wall`: Sigil wall, shrine

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/shrine/sigil_wall.png`.
- **Shows:** Survival fight maps, shrine and cathedral district; the wall of packed mana a RAISE Sigil makes: blocks movement and sight, full cover, 30 HP, crumbles after 3 rounds. A hatched square today.

```
Setting: shrine, shrine and cathedral district (pale flagstone, dark wood, ivory wax, violet cloth, gold #F2C46A candle glow). One Sigil wall sprite, a block of packed mana (nanobots) filling about three quarters of the one-tile cell, square to the grid, straight overhead. It is built of ivory and gold flecks, dense and nearly solid in the middle so it reads as full cover that blocks a standing person, with a square with one corner open, outlined in denser flecks laid across its top face as the raised Sigil, an abstract mark and never a letter. The edges are crisp on the top and left and fray into a few drifting motes on the right and bottom, so it looks newly made and about to crumble. A faint inner glow of its own flecks only, no bloom outside it. At 64 px: a bright speckled slab with one bold mark. It must not read as masonry, glass, ice or a stone wall of the setting. Avoid: a brick pattern, a door, a person, a shield, any lettering.
```

### `kit-rim-sigil_wall`: Sigil wall, rim

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/rim/sigil_wall.png`.
- **Shows:** Survival fight maps, rim station; the wall of packed mana a RAISE Sigil makes: blocks movement and sight, full cover, 30 HP, crumbles after 3 rounds. A hatched square today.

```
Setting: rim, rim station (blue-grey steel, ivory plate, black glass, thin cyan #8BDEEE light strips, one warm lamp). One Sigil wall sprite, a block of packed mana (nanobots) filling about three quarters of the one-tile cell, square to the grid, straight overhead. It is built of cold cyan-white flecks, dense and nearly solid in the middle so it reads as full cover that blocks a standing person, with three short parallel strokes of denser flecks, the middle one longer laid across its top face as the raised Sigil, an abstract mark and never a letter. The edges are crisp on the top and left and fray into a few drifting motes on the right and bottom, so it looks newly made and about to crumble. A faint inner glow of its own flecks only, no bloom outside it. At 64 px: a bright speckled slab with one bold mark. It must not read as masonry, glass, ice or a stone wall of the setting. Avoid: a brick pattern, a door, a person, a shield, any lettering.
```

### `kit-ahoc-sigil_mark`: Sigil mark, ahoc

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/ahoc/sigil_mark.png`.
- **Shows:** Survival fight maps, AHOC chapter outpost; a Sigil word drawn into the world long ago (a door carving, a Keystone, a warding post, an old plate), investigated from the next tile. A plain star today.

```
Setting: ahoc, AHOC chapter outpost (ceramic-grey panels, riveted plate, concrete, rust-red #F65157 marks, amber lamp glass). One Sigil mark sprite, flat on the ground, non-blocking, about two thirds of a tile: an old riveted brass plate set flush in the grey floor, four corner rivets, an incised abstract glyph of a ring crossed by two strokes, worn bright at the edges and dull in the grooves. It is old, worn and only slightly lit, an abstract glyph and never a letter; it shows a deliberate old mark, not damage. At 64 px: a worn plate or stone with one clear carved shape at its centre. It must differ from the poi (this one is a fixed carving, not an object lying on the floor) and from the Sigil wall (no flecks, no glow). Avoid: letters, numerals, a real religion's symbol, a bright glow, a person.
```

### `kit-city-sigil_mark`: Sigil mark, city

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/city/sigil_mark.png`.
- **Shows:** Survival fight maps, Central City back streets; a Sigil word drawn into the world long ago (a door carving, a Keystone, a warding post, an old plate), investigated from the next tile. A plain star today.

```
Setting: city, Central City back streets (wet cobbles, ivory plaster, brick, iron, canvas, warm amber lamp light and blue-grey #5394AC shadow). One Sigil mark sprite, flat on the ground, non-blocking, about two thirds of a tile: one worn cobblestone with an incised abstract glyph of a crescent of three notches, the grooves filled with old pale lime plaster, the stones round it wet and dark. It is old, worn and only slightly lit, an abstract glyph and never a letter; it shows a deliberate old mark, not damage. At 64 px: a worn plate or stone with one clear carved shape at its centre. It must differ from the poi (this one is a fixed carving, not an object lying on the floor) and from the Sigil wall (no flecks, no glow). Avoid: letters, numerals, a real religion's symbol, a bright glow, a person.
```

### `kit-field-sigil_mark`: Sigil mark, field

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/field/sigil_mark.png`.
- **Shows:** Survival fight maps, Daggerfall-type battlefield; a Sigil word drawn into the world long ago (a door carving, a Keystone, a warding post, an old plate), investigated from the next tile. A plain star today.

```
Setting: field, Daggerfall-type battlefield (cracked mud, ash, scorched steel plate, sandbag canvas, burnt wood, smoky orange #F68A38, faint ivory mana specks). One Sigil mark sprite, flat on the ground, non-blocking, about two thirds of a tile: a shard of wrecked steel plate lying flat in the mud, scratched with a crude abstract glyph of a cross of unequal strokes, rust-bloomed round the scratches, ash drifted against one edge. It is old, worn and only slightly lit, an abstract glyph and never a letter; it shows a deliberate old mark, not damage. At 64 px: a worn plate or stone with one clear carved shape at its centre. It must differ from the poi (this one is a fixed carving, not an object lying on the floor) and from the Sigil wall (no flecks, no glow). Avoid: letters, numerals, a real religion's symbol, a bright glow, a person.
```

### `kit-works-sigil_mark`: Sigil mark, works

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/works/sigil_mark.png`.
- **Shows:** Survival fight maps, machine works and drone foundry; a Sigil word drawn into the world long ago (a door carving, a Keystone, a warding post, an old plate), investigated from the next tile. A plain star today.

```
Setting: works, machine works and drone foundry (dark iron plate, soot, cast steel, ivory safety lines, furnace orange #F68A38 against cool blue lamp light). One Sigil mark sprite, flat on the ground, non-blocking, about two thirds of a tile: a cast-iron keystone plate set in the diamond plate, a raised abstract glyph of a hook inside a square, the raised lines rubbed bright and the rest soot-black, two oil-dark stains beside it. It is old, worn and only slightly lit, an abstract glyph and never a letter; it shows a deliberate old mark, not damage. At 64 px: a worn plate or stone with one clear carved shape at its centre. It must differ from the poi (this one is a fixed carving, not an object lying on the floor) and from the Sigil wall (no flecks, no glow). Avoid: letters, numerals, a real religion's symbol, a bright glow, a person.
```

### `kit-shrine-sigil_mark`: Sigil mark, shrine

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/shrine/sigil_mark.png`.
- **Shows:** Survival fight maps, shrine and cathedral district; a Sigil word drawn into the world long ago (a door carving, a Keystone, a warding post, an old plate), investigated from the next tile. A plain star today.

```
Setting: shrine, shrine and cathedral district (pale flagstone, dark wood, ivory wax, violet cloth, gold #F2C46A candle glow). One Sigil mark sprite, flat on the ground, non-blocking, about two thirds of a tile: a carved pale flagstone with an abstract glyph of nested arcs inlaid in gold leaf, the gold worn thin at the centre, a drip of ivory wax beside it. It is old, worn and only slightly lit, an abstract glyph and never a letter; it shows a deliberate old mark, not damage. At 64 px: a worn plate or stone with one clear carved shape at its centre. It must differ from the poi (this one is a fixed carving, not an object lying on the floor) and from the Sigil wall (no flecks, no glow). Avoid: letters, numerals, a real religion's symbol, a bright glow, a person.
```

### `kit-rim-sigil_mark`: Sigil mark, rim

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/rim/sigil_mark.png`.
- **Shows:** Survival fight maps, rim station; a Sigil word drawn into the world long ago (a door carving, a Keystone, a warding post, an old plate), investigated from the next tile. A plain star today.

```
Setting: rim, rim station (blue-grey steel, ivory plate, black glass, thin cyan #8BDEEE light strips, one warm lamp). One Sigil mark sprite, flat on the ground, non-blocking, about two thirds of a tile: a black glass floor tile etched with an abstract glyph of a dotted ring and a bar, the etching faintly lit cyan, framed by a blue-grey plate edge and ivory corner brackets. It is old, worn and only slightly lit, an abstract glyph and never a letter; it shows a deliberate old mark, not damage. At 64 px: a worn plate or stone with one clear carved shape at its centre. It must differ from the poi (this one is a fixed carving, not an object lying on the floor) and from the Sigil wall (no flecks, no glow). Avoid: letters, numerals, a real religion's symbol, a bright glow, a person.
```

### `kit-ahoc-pile`: Ground pile, ahoc

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/ahoc/pile.png`.
- **Shows:** Survival fight maps, AHOC chapter outpost; the pile of things lying on a tile (dropped magazines, loose rounds, weapons and anything else), one pile a tile, picked up for 1 AP. Three bars today.

```
Setting: ahoc, AHOC chapter outpost (ceramic-grey panels, riveted plate, concrete, rust-red #F65157 marks, amber lamp glass). One ground pile sprite, a small low heap of dropped kit of about two thirds of a tile, slightly irregular, non-blocking: a dropped box magazine, three loose brass rounds, a coiled olive strap and a dented ration tin lying on ceramic-grey plate, rust-red paint on the tin's lid. It reads as 'things lying here, pick them up': a heap with a clear top face, items overlapping so no single one is identifiable as a particular weapon or tool, nothing standing taller than a magazine. At 64 px: an uneven pile of small shapes with one brighter metal glint, sitting on the ground. It must differ from the poi (it is loose and untidy, no cleared ring) and from the crate (no box). Avoid: a named weapon, a chest, a skull, a body, a hand, any lettering.
```

### `kit-city-pile`: Ground pile, city

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/city/pile.png`.
- **Shows:** Survival fight maps, Central City back streets; the pile of things lying on a tile (dropped magazines, loose rounds, weapons and anything else), one pile a tile, picked up for 1 AP. Three bars today.

```
Setting: city, Central City back streets (wet cobbles, ivory plaster, brick, iron, canvas, warm amber lamp light and blue-grey #5394AC shadow). One ground pile sprite, a small low heap of dropped kit of about two thirds of a tile, slightly irregular, non-blocking: a small canvas satchel slumped open, spilling two loose rounds and a corked glass bottle, a coil of rope beside it, resting on wet cobbles with an amber glint on the bottle. It reads as 'things lying here, pick them up': a heap with a clear top face, items overlapping so no single one is identifiable as a particular weapon or tool, nothing standing taller than a magazine. At 64 px: an uneven pile of small shapes with one brighter metal glint, sitting on the ground. It must differ from the poi (it is loose and untidy, no cleared ring) and from the crate (no box). Avoid: a named weapon, a chest, a skull, a body, a hand, any lettering.
```

### `kit-field-pile`: Ground pile, field

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/field/pile.png`.
- **Shows:** Survival fight maps, Daggerfall-type battlefield; the pile of things lying on a tile (dropped magazines, loose rounds, weapons and anything else), one pile a tile, picked up for 1 AP. Three bars today.

```
Setting: field, Daggerfall-type battlefield (cracked mud, ash, scorched steel plate, sandbag canvas, burnt wood, smoky orange #F68A38, faint ivory mana specks). One ground pile sprite, a small low heap of dropped kit of about two thirds of a tile, slightly irregular, non-blocking: a battered ammunition crate lid, two empty magazines, a scatter of brass cases and a rolled grey blanket tossed on cracked mud, a little ash sifted over the heap. It reads as 'things lying here, pick them up': a heap with a clear top face, items overlapping so no single one is identifiable as a particular weapon or tool, nothing standing taller than a magazine. At 64 px: an uneven pile of small shapes with one brighter metal glint, sitting on the ground. It must differ from the poi (it is loose and untidy, no cleared ring) and from the crate (no box). Avoid: a named weapon, a chest, a skull, a body, a hand, any lettering.
```

### `kit-works-pile`: Ground pile, works

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/works/pile.png`.
- **Shows:** Survival fight maps, machine works and drone foundry; the pile of things lying on a tile (dropped magazines, loose rounds, weapons and anything else), one pile a tile, picked up for 1 AP. Three bars today.

```
Setting: works, machine works and drone foundry (dark iron plate, soot, cast steel, ivory safety lines, furnace orange #F68A38 against cool blue lamp light). One ground pile sprite, a small low heap of dropped kit of about two thirds of a tile, slightly irregular, non-blocking: a steel-banded parts tray tipped on its side, a spent magazine, a handful of bolts and cut cable, and a pair of work gloves on the iron plate, one bolt catching furnace orange. It reads as 'things lying here, pick them up': a heap with a clear top face, items overlapping so no single one is identifiable as a particular weapon or tool, nothing standing taller than a magazine. At 64 px: an uneven pile of small shapes with one brighter metal glint, sitting on the ground. It must differ from the poi (it is loose and untidy, no cleared ring) and from the crate (no box). Avoid: a named weapon, a chest, a skull, a body, a hand, any lettering.
```

### `kit-shrine-pile`: Ground pile, shrine

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/shrine/pile.png`.
- **Shows:** Survival fight maps, shrine and cathedral district; the pile of things lying on a tile (dropped magazines, loose rounds, weapons and anything else), one pile a tile, picked up for 1 AP. Three bars today.

```
Setting: shrine, shrine and cathedral district (pale flagstone, dark wood, ivory wax, violet cloth, gold #F2C46A candle glow). One ground pile sprite, a small low heap of dropped kit of about two thirds of a tile, slightly irregular, non-blocking: a spilled cloth bundle on pale flagstone with a plain magazine, two loose rounds, a candle stub and a folded violet cloth, ivory wax drips round it. It reads as 'things lying here, pick them up': a heap with a clear top face, items overlapping so no single one is identifiable as a particular weapon or tool, nothing standing taller than a magazine. At 64 px: an uneven pile of small shapes with one brighter metal glint, sitting on the ground. It must differ from the poi (it is loose and untidy, no cleared ring) and from the crate (no box). Avoid: a named weapon, a chest, a skull, a body, a hand, any lettering.
```

### `kit-rim-pile`: Ground pile, rim

- **Mode:** Kit sprite, 256 x 256 transparent sprite, NEW.
- **Save as:** `art/sprites/kit/rim/pile.png`.
- **Shows:** Survival fight maps, rim station; the pile of things lying on a tile (dropped magazines, loose rounds, weapons and anything else), one pile a tile, picked up for 1 AP. Three bars today.

```
Setting: rim, rim station (blue-grey steel, ivory plate, black glass, thin cyan #8BDEEE light strips, one warm lamp). One ground pile sprite, a small low heap of dropped kit of about two thirds of a tile, slightly irregular, non-blocking: a ripped utility pouch on blue-grey plate with a magazine, three loose rounds, a bundle of cut cable and a cyan-lit data chip, black glass dust round it. It reads as 'things lying here, pick them up': a heap with a clear top face, items overlapping so no single one is identifiable as a particular weapon or tool, nothing standing taller than a magazine. At 64 px: an uneven pile of small shapes with one brighter metal glint, sitting on the ground. It must differ from the poi (it is loose and untidy, no cleared ring) and from the crate (no box). Avoid: a named weapon, a chest, a skull, a body, a hand, any lettering.
```

---

## 5. HOLD: check before drawing (may need no picture)

**Do not paint these until Claude answers.** A data link may already answer each row (Claude does it in code); the prompts are written so they are ready the day an icon is wanted. Recommendation (question 16): point the Ward and Sanctuary moves at the existing prayer icons, no new art.

### `guardian.ward`: Ward (Chaplain) (HOLD)

- **Mode:** Wick icon, 1024 x 1024 PNG, transparent.
- **Save as (only if wanted):** `art/icons/moves/ward.png`. Otherwise the move points at `art/icons/prayers/whisper-ward.png`, which exists.
- **Shows:** Class move card (Chaplain).

```
Wick with one hand held up palm out and the other hand sweeping an arc, and between him and the edge of the frame a single standing hexagon-edged screen of light (three bold sides visible, the rest cut by the frame) that an arrow-shaped shard glances off. Wick's head is bowed, his flame low and steady, speaking a ward under his breath: two tiny ticks at his mouth. The meaning is a protective ward set up over someone. At icon size it must read as a figure behind a six-sided screen. It must differ from the existing Whisper of Ward prayer icon: no cupped hands, no flame in the palm, no verse. Avoid: a shield with a crest, a cross, a halo, a bubble, text.
```

### `guardian.sanctuary`: Sanctuary (Chaplain) (HOLD)

- **Mode:** Wick icon, 1024 x 1024 PNG, transparent.
- **Save as (only if wanted):** `art/icons/moves/sanctuary.png`. Otherwise the move points at `art/icons/prayers/hymn-sanctuary.png`, which exists.
- **Shows:** Class move card (Chaplain).

```
Wick kneeling on one knee at the centre of a clean round patch of ground, his head bowed and both hands pressed flat to the earth, and round him a ring of seven short evenly spaced posts, each with a tiny flame on top, so the ring reads as a place set apart. A single partial silhouette of an ally, cut by the frame, stands inside the ring edge, unharmed. The meaning is a zone where the hunted can rest. At icon size it must read as a figure in a small ring of lit posts. It must differ from the Hymn of Sanctuary prayer icon and from Ward (no screen, no hexagon). Avoid: a temple, a tent, a roof, a halo, a cross, an angel, text.
```

### `visualizer_core`: Load the Visualizer (verb) (HOLD)

- **Mode:** Wick icon, 1024 x 1024 PNG, transparent.
- **Save as (only if wanted):** `art/icons/moves/load-the-visualizer.png`.
- **Shows:** The Visualization verbs. No key exists; it is unknown whether any screen asks for it.

```
Wick looking down at a plain glove on his left hand, his right hand pressing a small round core (a disc with one notch cut in its rim) into a socket in the back of the glove's cuff, the flame of his head tilted toward it. Three thin short ticks radiate from the joint to show it taking. The glove is a bold blocky shape; the core is a solid disc with one interior cut. The meaning is loading the Visualizer glove with a core before drawing. At icon size it must read as a hand inserting a disc into a glove. Avoid: a smartphone, a battery with a plus sign, a plug and cable, a game controller, text.
```
