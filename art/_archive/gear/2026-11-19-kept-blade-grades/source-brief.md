# GPT prompts, 19 Nov 2026, file 08: the grade pictures and the uniques

For the artist, and for GPT. Every graded item is painted at all five grades. The grades, in order (the game's names): **Standard, Fine, Masterwork, Relic, Celestial**. The Standard is the item's master painting; the other four are made from it, image-to-image. There is no "Worn" picture.

**What this file holds:** (A) the grade method: base prompt G, and one block per grade for each of the 10 item classes; (B) the proof sheet, the eight grade pictures of `katana` and `drifter_revolver`, written out in full; (C) the order of work, the checklist per sheet, the list of every graded item and the count; (D) the 23 uniques, one prompt each.

**What this file makes:** 656 grade pictures (the proof sheet's 8 among them) and 23 unique paintings. The Standards the grade sets are built on are painted from files 05, 06, 07, 09 and 10.

## How to use

One image a prompt.

- **A grade picture** (Fine, Masterwork, Relic, Celestial) is made **image-to-image** (the generator's edit mode) from the item's **approved** Standard painting. Paste **base prompt G**, then the item's **keep line** (section A2), then the **grade block** of its class (section A3). Attach the approved Standard; from Masterwork on, also attach the item's approved grade below it. If the generator has a strength or change setting, start low and raise it only until the finish changes: the outline must not move.
- **A unique** is a new painting. Paste **base prompt U**, then the entry's prompt.
- In-world only: no real-world brand, model or maker name, logo, insignia or religion, and no text, letters, numbers, rollmarks or maker marks in any image.

**Save names for grade pictures (the one rule).** A grade picture is saved in `art/icons/gear/` as `<stem>--<grade>.png`, where `<stem>` is the Standard's file name without `.png` and `<grade>` is `fine`, `masterwork`, `relic` or `celestial` (lower case, two hyphens before it). The Standard keeps its own name with no suffix. Examples: `weapon-katana.png` (the Standard), `weapon-katana--fine.png`, `armour-field_helmet--relic.png`, `shield-buckler--masterwork.png`, `focus-evoker--celestial.png`, `quiver-quiver--fine.png`.

**Where a grade picture shows:** the backpack row, the shop grid, the loot card, the Forge's grade step and the inspect view (the 1024 master), for an item of that grade. The game draws the frame and the grade marks around it.

## Base prompt G: a grade step of an approved gear painting (image-to-image)

**Attach:** the item's approved Standard, `art/icons/gear/<stem>.png` (the shape master); from Masterwork on, the approved grade below it (`<stem>--fine.png` for Masterwork, `<stem>--masterwork.png` for Relic, `<stem>--relic.png` for Celestial). For the house look: `art/portraits/world/new-faces/orren-vask.png` (brushwork). Palette: `art/style-guide/palette.json`. Rule: `art/style-guide/gear-icons.md` (for a gun, `art/style-guide/weapon-icons.md` rule 8 governs the silhouette: it follows the real pattern the entry describes, while the name, maker, markings and text stay ours; gear-icons.md's ban on real-world models applies to everything else).

**Size / background:** 1024 x 1024 PNG with alpha, fully transparent, exactly the Standard's canvas, framing and margins (the object inside the central 90% of the canvas, at least 50 px clear on every side).

```
Repaint the attached game inventory icon as a higher grade of the very same object. This is the same item, not a new one: keep exactly its silhouette and outline, every part and where it sits, its proportions and lengths, the camera angle, the pose and the diagonal, the scale in the frame and the margins, the light from the upper left and the short painted shading on its own underside. Keep the maker's signature parts named below exactly as they are. Change only the surface: finish, material, wear, inlay and ornament, as the grade below says, and keep every addition inside the existing outline (flush, inlaid, engraved, stitched or wrapped on). Same style as the attached painting: Heavenprint, hand-painted opaque gouache and ink with broken directional brush strokes, dry-brush scumbling, charcoal shadows, warm ivory highlights on the focal edges. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss. Fully transparent background, square 1024 x 1024 PNG with alpha, no ground, no cast shadow, no scene. No text, letters, numbers, logos or real heraldry; the maker's own blank crest, seal plate or tag stays exactly as it is, and no new symbol is added. No hands, no figures. No frame, no border, no coloured rim: the game draws the grade frame. Do not add parts that change the outline: no new spikes, guards, blades, rails, scopes, gems standing proud, ribbons, tassels, chains, wings, auras, smoke or sparks. It must read at 64 px in a shop grid and at 32 px in a backpack row as the same item as the attached one, one grade higher.
```

**Avoid in every grade picture:** a changed outline, a different weapon of the same family, a coloured border or glow ring, a gem or crystal stuck on, any lettering, a light that spills past the outline.

## Base prompt U: a unique (new painting)

**Attach:** the paintings named in the entry (its family's silhouette), `art/icons/gear/weapon-afterword.png` (the first unique: the richness to match) and `art/portraits/world/new-faces/orren-vask.png` (brushwork). Palette: `art/style-guide/palette.json`.

**Size / background:** 1024 x 1024 PNG with alpha, the object inside the central 90% of the canvas (at least 50 px of clear margin on every side); no frame (the game draws the Unique frame).

```
Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss. One single object, lit from the upper left, with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene. Fully transparent background, square 1024 x 1024 PNG with alpha; the object fills about 80 to 85% of the canvas, inside the central 90%. No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands and no figures. A blade, a bow, a shield or a piece of armour is invented, never a recognisable real-world make or emblem; a gun keeps the real-world pattern of its family exactly as described (layout, proportions, magazine, sights, stock and furniture) but carries no real name, logo, rollmark or marking. This is a unique item, one of a kind: it keeps the silhouette of its family so that at 32 px it still reads as that kind of weapon or armour, and it carries one story detail and one impossible material, painted with the richness of an heirloom, not the gilding of a parade piece. One accent colour (given below), as a muted local paint or a contained light inside the outline, never a bloom. The silhouette must be bold and readable at 64 px in a shop grid and 32 px in a backpack row. The item:
```

---

# A. The grade method

## A1. What the five grades must read as (the rule every block follows)

The grades climb by one visible step each, and each step **keeps what the step below added**, so the order reads without a label. Read at 64 px on `#10151F`, the five side by side must show one signal growing:

| Grade | File suffix | What changes | What it reads as at 64 px |
| --- | --- | --- | --- |
| Standard | none | The approved painting, untouched: honest wear | The master |
| Fine | `--fine` | Wear removed, edges freshly bright, finish even; **one thin engraved (or stitched) line** along the main surface | The same object, cleaner and a step lighter, one fine line |
| Masterwork | `--masterwork` | That line becomes **an inlay in the item's accent colour** (bright brass where the item has no accent); finer materials in the same shapes; exact edges | One continuous coloured stripe added |
| Relic | `--relic` | Heirloom age: **warm deep patina**, the inlay now old gold, **one small flush gilt ornament** at the focal fitting, **one old repair** that tells a story | The darkest, warmest of the five, one gold point |
| Celestial | `--celestial` | **Pale, unmarked material**; the inlay line and one seam give **a faint contained ivory-gold light from inside**, nothing past the outline | The lightest of the five, one lit line |

**What never changes, at any grade:** the silhouette, every part and its position, proportions, camera, pose, scale and margins; the maker's signature (Hellraiser slabs, spikes and brakes; Lumeri lancets and spires; Adamantile plates and crests; Science Team core windows; Legion plain shapes and the pale stripe; the scrap-cutters' nails, welds and jags; Kemizuchi lacquer; Central City clean lines; Smetanita and Mandestra lacquer and brass; ADCorp's small blank tag; Chezknov's single brass rivet; the Central Command Arsenal's thin blue-grey trim line; Albert Town walnut and its brass buttplate screw; Frontier bare steel, walnut and leather); a gun's real-world pattern (its magazine, sights, stock and furniture); the place of the faction accent (it may become richer or paler, never move or vanish); a focus glove's lens or core window and its ink colour; the ammunition, magazine, drum, belt, tank, warhead or chain shape; a pilot flame's own colour. A grade is never a frame, never a tint over the whole object, never a different item.

## A2. The keep line (one per item)

After base prompt G, paste the item's keep line, a sentence that starts "The maker's signature parts are:" and lists the maker's signature parts that make it **this** item, written from its approved Standard (outline parts, materials, the accent and where it sits). Where to start it from:

- **An existing painting kept as it is:** describe the approved painting you attach: its outline parts, its materials, its accent and where the accent sits.
- **A repainted gun:** its entry in `10-rifle-analogues.md` section 1 (the pattern and the maker's touch).
- **A new form:** the description in its own prompt (files 05, 06, 07, 09 and 10).

Check it against the approved painting: where the painting differs from the text, describe the painting. The proof sheet (section B) shows two keep lines written in full.

## A3. The grade blocks, by item class

Paste the block of the item's class and grade after its keep line. Section C3 lists every graded item under its class.

| Class | Block |
| --- | --- |
| Blades: knives, swords, sabres, draw blades, great blades, scrap cutters | A3.1 |
| Hafted: axes, polearms, hammers | A3.2 |
| Guns: every maker line, pistols to long rifles and shotguns | A3.3 |
| Bows, crossbows and the quiver | A3.4 |
| Gloves and foci: striking gloves, wraps, knuckledusters, strikers, mitts, weighted gloves; the four focus gloves | A3.5 |
| Shields | A3.6 |
| Armour, by slot | A3.7 |
| Heavy weapons: launchers, rocket tubes, flamers, rotary and belt-fed guns, anti-materiel rifles | A3.8 |
| Powered melee and power gauntlets | A3.9 |
| Thrown weapons | A3.10 |

### A3.1 Blades

Change sits on: the flat of the blade along the spine or fuller, the edge, the guard (the bolster or collar where there is no guard), the grip wrap, the pommel. An Ork piece stays Ork at every grade, and a sword-breaker keeps its slots: nails, welds, jags, saw notches, slots and ochre daubs stay where they are and keep their shape (section A1); only their finish, material and wear change with the grade.

**Fine**
```
Grade: Fine. The same blade, newly kept. The edge is freshly honed into one clean bright line along its whole length; the flat is polished so the old scratches are gone and the steel reads one step lighter (nails, welds, jags, saw notches and slots keep their shape); the grip wrap is tightened and clean; the guard and pommel are cleaned to a soft shine. Add one thin engraved line running along the spine or the fuller from the guard toward the point, no wider than the edge highlight. Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Lay a narrow inlay of the item's accent colour (bright brass if it has no accent) into the engraved line, so that it reads as one continuous coloured stripe along the blade. Re-make the guard and pommel in a finer material in exactly the same shapes, with sharper edges and a deeper polish; the grip wrap becomes a richer, darker leather or cord in an even pattern; the steel shows a faint, fine forging pattern. Exact edges everywhere (nails, welds, jags, saw notches and slots keep their shape), no wear, a calm sense of quality.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay line. Age it as an heirloom: the steel darkens to a warm deep patina (blued brown, oiled, never rust), the inlay line turns to dull old gold, and the guard (or the collar) carries one small raised gilt ornament set flush inside its outline. Add one old repair that tells a story: the grip rewrapped in an older cord of a different colour, or a small riveted collar mended where blade meets guard. The edge is still bright: it is old and loved, not neglected.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay line and the ornament's place. The blade and its fittings become a pale, unmarked, almost pearl-ivory material with no scratch, patina or tool mark; nails, welds, jags, saw notches and slots keep their shape in the pale material; the grip wrap is ivory cord. The inlay line and the seam where blade meets guard give a faint, contained ivory-gold light from inside, a lit line no wider than the inlay; nothing spills past the outline: no bloom, no halo, no rays, no sparks. As if made by someone with nothing to fear.
```

### A3.2 Hafted

Change sits on: the cheek of the head, the cutting edge, point or striking face, the socket where head meets haft, the haft and its bands, the butt cap.

**Fine**
```
Grade: Fine. The same weapon, newly kept. The head is cleaned of grime, its cutting edge, point or striking face bright; the haft is oiled smooth, its bands and wraps tightened. Add one thin engraved line on the cheek of the head that follows the head's own outline a little inside it. Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the engraved line on the head with the item's accent colour (bright brass if it has no accent), so the head carries one clear coloured stripe. The haft becomes a finer, darker, straight-grained wood (or a finer steel tube where it is metal), with two flat metal strips laid along it below the head, flush with its surface; the butt cap and the socket are re-made in the same shapes with crisp edges. Exact edges, no wear.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The head darkens to a warm deep patina, the inlay to dull old gold, and the socket where head meets haft carries one small flush gilt ornament ring. Add one old repair that tells a story: the haft spliced near the grip and bound with old cord, or a cracked cheek held by two hand-set rivets. The edge, point or face is still bright and true.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay and the ornament's place. The head turns to a pale, unmarked pearl-ivory metal, the haft to a pale ivory wood without a knot or flaw. The inlay line on the head and the seam of the socket give a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays, no sparks.
```

### A3.3 Guns

Change sits on: the largest flat side of the slide or receiver, the grip panels or stock, the trigger, hammer and pins, the muzzle. The gun's pattern stays exactly as it is: the magazine, drum, cylinder, sights, rails, stock and furniture keep their shape.

**Fine**
```
Grade: Fine. The same gun, refinished. An even, unscratched finish on the slide or receiver, its edges and the muzzle crown bright; the grip panels or stock clean; moving parts look freshly oiled. Add one thin engraved line along the side of the slide or receiver, following its top edge. Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the engraved line with the item's accent colour (bright brass if it has no accent), so the side carries one continuous coloured stripe. The grip panels or stock are re-made in a finer material in exactly the same shapes (polished hardwood, ivory polymer or lacquer, in the item's own colours); the trigger, hammer, screws and pins are polished brass or bright steel; machining exact, every edge crisp. No wear.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The steel darkens to a warm deep patina (oiled blued brown, never rust); the grip panels or stock are darkened and worn smooth by years of hands; the inlay becomes dull old gold, and one small flush panel of engraved scrollwork (no letters, no figures) sits on the receiver or slide beside it. Add one old repair that tells a story: a hand-fitted pin of a different metal, a grip panel replaced in an older material, or a stock bound with old wire. It still works perfectly.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay and the scroll panel's place. The metal turns to a pale, unmarked pearl-ivory; the grip panels or stock are ivory, keeping a faint trace of the item's accent where its accent was. The inlay line and one seam (the ejection port, the cylinder gap or the receiver seam) give a faint, contained ivory-gold light from inside. The muzzle stays dark: no light from the barrel, no muzzle flash, nothing spilling past the outline: no bloom, no halo, no rays, no sparks.
```

### A3.4 Bows, crossbows and the quiver

Change sits on: the face of the limbs (the prod on a crossbow), the riser or grip, the nock tips, the string, the crossbow's stock. On the quiver (`quiver-quiver`): the long face of the body, the rim of the mouth, the strap and its buckle.

**Fine**
```
Grade: Fine. The same piece, newly kept. Bow: the limbs are smoothed and oiled, the sinew or cord wraps fresh, the string new and taut; crossbow: the prod polished and the stock clean; quiver: the leather cleaned and conditioned, the stitching neat. Add one thin carved line along the face of each limb (along the side of the stock on a crossbow; down the long face of the quiver, stitched). Nothing else is added. No arrow or bolt unless the Standard has one.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the line with the item's accent colour (bright brass if it has no accent): one clear stripe along each limb, along the stock, or down the quiver. The nock tips are capped in polished horn or brass, flush with the limb ends; the grip is wrapped in fine dark leather in an even pattern; the prod and metal fittings are crisp and bright; the quiver's rim is bound with a neat edge and its buckle polished.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The wood and leather darken to a deep warm sheen with age, the inlay to dull old gold, and one small flush gilt ferrule sits on the grip (on the quiver, on the strap buckle). Add one old repair that tells a story: a limb bound with old sinew at one point, a crossbow stock pinned with a brass plate, or a quiver seam re-stitched in an older thread. A string is darker and old but taut.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay and the ferrule's place. The wood becomes a pale ivory wood with no grain flaw, leather a pale hide, a string pale silk, the metal pearl-ivory. The inlay line gives a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays, no sparks.
```

### A3.5 Gloves and foci

Change sits on: the knuckle plate or bar, the back of the hand, the stitched seams, the cuff and its buckle; on a wrap, the outer turns of the cloth. **A focus glove's lens or core window keeps its own ink colour and its own glow at every grade** (the Evoker `#8BDEEE`, the Emanator `#9D7ADC`, the Visualizer `#5394AC`, the Attuner `#EB95B7`); the grade's light runs only in the stitched line, never in the lens.

**Fine**
```
Grade: Fine. The same glove, newly kept. The leather or cloth is cleaned and conditioned, the stitching neat and even, any metal knuckles or plates bright. Add one thin line across the back of the hand: stitched on leather, engraved on metal, woven into the wrap on cloth. Nothing else is added. No hand inside.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. The line becomes a cord or inlay in the item's accent colour (bright brass thread if it has no accent), one clear stripe across the back of the hand. The leather is a finer, darker, supple hide in the same shapes; metal parts are polished crisp; the cuff is bound with a neat edge. A focus's lens or core window is unchanged.
```

**Relic**
```
Grade: Relic. Keep the shape and the line. The leather darkens smooth with use like an heirloom, the metal takes a warm patina, the line turns to old gold thread, and the cuff buckle or the knuckle bar carries one small flush gilt ornament. Add one old repair that tells a story: a seam re-stitched in a different, older thread, or a knuckle plate held by a replaced rivet.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the line and the ornament's place. The leather becomes a pale ivory hide, the metal pearl-ivory, unmarked. The stitched line gives a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo. A focus's lens or core window keeps its own colour and glow exactly as before; the ivory-gold light never enters it.
```

### A3.6 Shields

Change sits on: the face, the rim, the boss, the viewport frame, the core windows or the boards. Front view as the Standard. Never heraldry, never a symbol on the face. A shield's core windows keep their own cyan at every grade.

**Fine**
```
Grade: Fine. The same shield, newly kept. The dents are hammered out, the face refinished evenly in its own colour, the rim bright, the straps clean. Add one thin engraved line running just inside the rim all the way round. Nothing else is added; no emblem on the face.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the rim line with the item's accent colour (bright brass if it has no accent), a clear coloured ring just inside the rim. The rivets are polished brass; the face is a finer material in the same shape (planed close-fitted boards, or evenly painted steel with crisp edges); the viewport, boss or windows are re-made with sharp edges. Still no emblem.
```

**Relic**
```
Grade: Relic. Keep the shape and the rim inlay. The face takes a warm, deep, battle-old patina, the inlay turns to dull old gold, and a flush gilt ring is set around the boss or the centre of the face. Add one old repair that tells a story: a riveted patch plate over an old breach, or one board replaced with a darker plank.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the rim inlay and the ring's place. The face becomes a pale, unmarked pearl-ivory, the rim and rivets the same. The rim inlay gives a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays. Core windows keep their own colour.
```

### A3.7 Armour, by slot

Armour shows at 36 to 88 px, smaller than weapons: lean on the value change (Fine a step lighter, Relic clearly darker and warmer, Celestial clearly pale). A pair (gloves, boots, greaves) gets the same change on both pieces, mirrored. Paste the grade block, then the slot line from the table.

| Slot | Family | The focal part (where the line, the inlay, the ornament and the repair go) |
| --- | --- | --- |
| head | Helmets | the brow rim of the shell; the ornament at the chin-strap rivet |
| head | Hoods | the hood's front edge; the ornament at the throat clasp |
| head accessory | Optics | the rings around the lenses; the ornament at the strap mount (the lens glass keeps its colour) |
| head accessory | Respirators | the cheek plates around the filters; the ornament at the strap buckle (the lenses keep their colour) |
| outer torso | Vests (Light, Medium, Heavy) | the top edge of the chest plate or the collar; the ornament at the front fastening |
| outer torso | Plate (Breacher, Assault, Juggernaut) | the gorget or collar edge; the ornament at the crest or the centre of the chest |
| inner torso | Undershirts | the central seam (quilted or mesh pieces) or the curved top edge (the plate); the ornament at the collar |
| lower torso | Belts | the upper edge of the belt; the ornament on the buckle |
| legs | Legwear | the outer seam (trousers) or the knee-cup rim (greaves); the ornament at the knee |
| hands | Worn gloves | across the back of the hand; the ornament at the cuff |
| feet | Boots | the ankle collar and the toe cap; the ornament at the top lace hook or the ankle plate |

**Fine**
```
Grade: Fine. The same piece, cleaned and repaired: stains gone, cloth evenly dyed, seams neat, plates refinished evenly, buckles bright. Add one thin line along the focal part named below: engraved on metal or ceramic, stitched on cloth or leather. Nothing else is added. The focal part:
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. The line becomes an inlay or a cord in the item's accent colour (bright brass if it has no accent), a clear coloured stripe along the focal part. Finer materials in exactly the same shapes: a tighter weave, a supple dark leather, polished plate with crisp edges, brass buckles. No wear. The focal part:
```

**Relic**
```
Grade: Relic. Keep the shape and the stripe. The piece takes an heirloom's warm deep patina (darker, warmer cloth and leather, plate in an oiled bronze-dark), the stripe becomes dull old gold, and one small flush gilt ornament sits at the place named below. Add one old repair that tells a story: a patch sewn on in an older cloth, or a plate held by replaced rivets. The focal part and the ornament's place:
```

**Celestial**
```
Grade: Celestial. Keep the shape, the stripe and the ornament's place. The piece becomes pale and unmarked: ivory cloth, pale hide, pearl-ivory plate. The stripe gives a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays. Lenses and filters keep their own colour. The focal part:
```

### A3.8 Heavy weapons: launchers, rocket tubes, flamers, rotary and belt-fed guns, anti-materiel rifles

Change sits on: the largest flat side of the receiver, the body of the tube or the side of the fuel tank; the grips, the stock or shoulder rest; the bands, hinges and fittings. The barrel ring, cylinder of chambers, tube, warhead, belt and box, fuel tanks and hoses, bipod and shield plate keep their shape; a pilot flame keeps its own small colour; a muzzle, venturi or nozzle stays dark inside.

**Fine**
```
Grade: Fine. The same heavy weapon, refinished. An even, unscratched finish on the receiver, tube or tank, its edges bright, the scorch at the muzzle or rear flare cleaned to bare metal; grips and stock clean; hinges, bands and fittings freshly oiled. Add one thin engraved line along the largest flat side (the receiver, the length of the tube, or round the tank), following its edge. Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the engraved line with the item's accent colour (bright brass if it has no accent), one continuous coloured stripe along the receiver, tube or tank. The grips, stock and shoulder rest are re-made in a finer material in exactly the same shapes; the bands, hinges, pins and fittings are polished brass or bright steel; every edge machined crisp. No wear, no scorch.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The metal darkens to a warm deep patina (oiled bronze-brown, never rust), the grips worn smooth by years of hands, the inlay dull old gold, and one small flush panel of engraved scrollwork (no letters, no figures) sits beside it on the receiver, tube or tank. Add one old repair that tells a story: a band or bracket replaced in a different metal, a hose or strap mended with old wire, or a dented panel beaten back and riveted. It still works perfectly.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay and the scroll panel's place. The metal turns to a pale, unmarked pearl-ivory; grips and stock ivory, a faint trace of the item's accent where its accent was. The inlay line and one seam (a receiver seam, a tube joint or a tank band) give a faint, contained ivory-gold light from inside. The muzzle, venturi or nozzle stays dark; a pilot flame stays its own small colour; nothing spills past the outline: no bloom, no halo, no rays, no sparks, no smoke.
```

### A3.9 Powered melee and power gauntlets

Change sits on: the side of the engine casing or the forearm plate, the blade bar or disc's flat (never its teeth), the grip or cuff, the bands and pistons' collars. The chain, teeth, saw disc, pistons, hoses and air bottle keep their shape. An Ork piece stays Ork at every grade: its nails, welds, jags and ochre daubs stay where they are and keep their shape (section A1); only their finish, material and wear change with the grade.

**Fine**
```
Grade: Fine. The same machine, newly serviced. Grime and soot cleaned off, the casing or plate an even finish one step lighter, the teeth or striking face bright, hoses and straps clean, moving parts freshly oiled. Add one thin engraved line along the side of the engine casing or the forearm plate, following its edge. Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the engraved line with the item's accent colour (bright brass if it has no accent), one continuous stripe along the casing or plate. The grip or cuff is re-made in a finer, darker leather in the same shape; the bands, piston collars and bolts are polished brass or bright steel; every weld and nail keeps its place and shape, cleanly finished. Exact edges, no wear.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The metal darkens to a warm deep patina (oiled bronze-brown, never rust), the inlay to dull old gold, and one small flush gilt ornament sits on the casing or at the cuff. Add one old repair that tells a story: a cracked casing held by a hand-welded patch plate, a hose bound with old wire, or a bolt replaced by one of a different metal. It still runs perfectly.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay and the ornament's place. The casing, plate and fittings turn to a pale, unmarked pearl-ivory; the grip or cuff ivory hide; the teeth or striking face pale steel. The inlay line and one seam of the casing give a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no sparks, no exhaust smoke.
```

### A3.10 Thrown weapons

Change sits on: each piece of the set (the flat of each knife, the shaft of each dart, the head of each javelin) and its holder (the roll, the loops, the back quiver). Every piece in the set gets the same change: the count of pieces never changes, and the two darkened dart tips stay darkened at every grade.

**Fine**
```
Grade: Fine. The same set, newly kept. Every blade, dart or head cleaned and honed to a bright edge or point (the two darkened dart tips stay darkened), the shafts oiled, the flights or wraps fresh, the leather holder cleaned and conditioned. Add one thin engraved line along each blade or head (a thin painted ring on each dart shaft), the same on every piece. Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay each line with the item's accent colour (bright brass if it has no accent), the same narrow stripe on every piece. The grips, shafts and flights are re-made in finer materials in exactly the same shapes; the holder's stitching is even and its buckle polished. Exact edges, no wear.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The steel darkens to a warm deep patina, the inlays turn to dull old gold, and one small flush gilt ornament sits on the holder's buckle or flap. Add one old repair that tells a story: one piece of the set a little different from the others (an older grip wrap, a replaced shaft), or the holder re-stitched in an older thread. Every edge and point still bright.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlays and the ornament's place. Every piece becomes a pale, unmarked pearl-ivory, the holder a pale hide; the two darkened dart tips stay darkened. Each inlay gives a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays, no sparks.
```

---

# B. The proof sheet (8 pictures)

`katana` (blade class) and `drifter_revolver` (gun class) at Fine, Masterwork, Relic and Celestial. Make this sheet first: it shows whether the generator holds the silhouette across a set. Each prompt below is complete when pasted after base prompt G: it holds the item's keep line and its grade block.

## B1. `katana`: Katana (blade class)

- **Standard (attach for all four grades; do not regenerate it):** `art/icons/gear/weapon-katana.png`
- **Shows in:** backpack, shop grid, loot card, the Forge's grade step, the inspect view, by the item's grade

### B1.1 `weapon-katana--fine`: Katana, Fine

- **Save as:** `art/icons/gear/weapon-katana--fine.png`
- **Attach:** `art/icons/gear/weapon-katana.png`
- **At icon size it must read as:** the same katana, cleaner and a step lighter, one fine line on the blade.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Fine. The same blade, newly kept. The edge is freshly honed into one clean bright line from collar to point; the flat is polished so the dull mottling is gone and the steel reads one step lighter, the wavy temper line crisper; the braided wrap is tightened, every diamond even; the brass guard, collar and pommel cap are cleaned to a soft shine. Add one thin engraved line running along the spine from the collar toward the point. Nothing else is added.
```

### B1.2 `weapon-katana--masterwork`: Katana, Masterwork

- **Save as:** `art/icons/gear/weapon-katana--masterwork.png`
- **Attach:** `art/icons/gear/weapon-katana.png` and the approved `art/icons/gear/weapon-katana--fine.png`
- **At icon size it must read as:** the Fine katana with one bright brass stripe along the spine.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Masterwork. Keep everything of the Fine grade. Lay a narrow inlay of bright polished brass into the engraved line along the spine, one continuous stripe from collar to near the point. The round guard and the pommel cap are re-made in the same shapes in a deeper, richer brass with crisp edges; the grip wrap becomes a finer, darker cord in a tight even diamond pattern; the steel shows a faint, fine folded forging pattern under the temper line. Exact edges, no wear.
```

### B1.3 `weapon-katana--relic`: Katana, Relic

- **Save as:** `art/icons/gear/weapon-katana--relic.png`
- **Attach:** `art/icons/gear/weapon-katana.png` and the approved `art/icons/gear/weapon-katana--masterwork.png`
- **At icon size it must read as:** the darkest, warmest katana of the five, one gold point at the guard.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Relic. Keep the shape and the inlay along the spine. The blade darkens to a warm deep oiled patina, blued brown, the temper line still pale and the edge still bright; the spine inlay turns to dull old gold; the round guard carries one small raised gilt ornament set flush in its face, a single curling wave. The grip is rewrapped in an older cord of a faded deep red, its diamonds worn smooth by a long life of hands. It is an heirloom, not a ruin: no rust, no chips.
```

### B1.4 `weapon-katana--celestial`: Katana, Celestial

- **Save as:** `art/icons/gear/weapon-katana--celestial.png`
- **Attach:** `art/icons/gear/weapon-katana.png` and the approved `art/icons/gear/weapon-katana--relic.png`
- **At icon size it must read as:** the lightest katana of the five, one lit line along the spine.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Celestial. Keep the shape, the spine inlay and the wave ornament's place on the guard. The blade becomes a pale, unmarked pearl-ivory steel with the temper line as a faint silver wave; the guard, collar and pommel cap become pale gold-ivory; the grip is wrapped in ivory cord in the same diamond pattern. The spine inlay and the seam where the blade meets the collar give a faint, contained ivory-gold light from inside, a lit line no wider than the inlay. Nothing spills past the outline: no bloom, no halo, no rays, no sparks.
```

## B2. `drifter_revolver`: Drifter revolver (gun class)

- **Standard (attach for all four grades; do not regenerate it):** `art/icons/gear/weapon-drifter_revolver.png`
- **Shows in:** backpack, shop grid, loot card, the Forge's grade step, the inspect view, by the item's grade

### B2.1 `weapon-drifter_revolver--fine`: Drifter revolver, Fine

- **Save as:** `art/icons/gear/weapon-drifter_revolver--fine.png`
- **Attach:** `art/icons/gear/weapon-drifter_revolver.png`
- **At icon size it must read as:** the same revolver, cleaner and a step lighter, one fine line along the barrel.

```
The maker's signature parts are: side profile, muzzle to the right, level; a long octagonal barrel with a small brass blade front sight at the muzzle; a fluted six-chamber cylinder in an open steel frame; a tall curved spur hammer at the rear; three brass pins on the frame; a curved brass trigger guard and trigger; a walnut grip curling down and back, with one brass pin. Worn dark steel with a bronze cast, no colour accent: the brass of the fittings.
Grade: Fine. The same gun, refinished. The barrel, cylinder and frame have an even, unscratched dark steel finish a step lighter, the edges of the octagonal barrel flats and the muzzle crown bright; the walnut grip is clean and oiled, its pale worn patch smoothed; the brass trigger guard, sight and pins are clean. Add one thin engraved line along the upper flat of the barrel, from the frame to the front sight. Nothing else is added.
```

### B2.2 `weapon-drifter_revolver--masterwork`: Drifter revolver, Masterwork

- **Save as:** `art/icons/gear/weapon-drifter_revolver--masterwork.png`
- **Attach:** `art/icons/gear/weapon-drifter_revolver.png` and the approved `art/icons/gear/weapon-drifter_revolver--fine.png`
- **At icon size it must read as:** the Fine revolver with one bright brass stripe along the barrel.

```
The maker's signature parts are: side profile, muzzle to the right, level; a long octagonal barrel with a small brass blade front sight at the muzzle; a fluted six-chamber cylinder in an open steel frame; a tall curved spur hammer at the rear; three brass pins on the frame; a curved brass trigger guard and trigger; a walnut grip curling down and back, with one brass pin. Worn dark steel with a bronze cast, no colour accent: the brass of the fittings.
Grade: Masterwork. Keep everything of the Fine grade. Inlay the engraved line on the barrel with bright polished brass, one continuous stripe from the frame to the front sight. The grip is re-made in exactly the same shape in a deep, close-grained figured walnut with a high polish; the trigger guard, trigger, sight and pins are bright polished brass; the cylinder flutes and the barrel flats are machined crisp. No wear.
```

### B2.3 `weapon-drifter_revolver--relic`: Drifter revolver, Relic

- **Save as:** `art/icons/gear/weapon-drifter_revolver--relic.png`
- **Attach:** `art/icons/gear/weapon-drifter_revolver.png` and the approved `art/icons/gear/weapon-drifter_revolver--masterwork.png`
- **At icon size it must read as:** the darkest, warmest revolver of the five, one gold point on the frame.

```
The maker's signature parts are: side profile, muzzle to the right, level; a long octagonal barrel with a small brass blade front sight at the muzzle; a fluted six-chamber cylinder in an open steel frame; a tall curved spur hammer at the rear; three brass pins on the frame; a curved brass trigger guard and trigger; a walnut grip curling down and back, with one brass pin. Worn dark steel with a bronze cast, no colour accent: the brass of the fittings.
Grade: Relic. Keep the shape and the barrel stripe. The steel darkens to a warm, deep, oiled blued-brown patina; the walnut grip is darkened and worn glassy-smooth where a palm sat for decades; the barrel stripe turns to dull old gold, and a small flush panel of engraved scrollwork (no letters, no figures) sits on the side of the frame below the cylinder. One old repair: the grip's brass pin replaced by a plain steel one that does not match. It still works perfectly: no rust, no chips.
```

### B2.4 `weapon-drifter_revolver--celestial`: Drifter revolver, Celestial

- **Save as:** `art/icons/gear/weapon-drifter_revolver--celestial.png`
- **Attach:** `art/icons/gear/weapon-drifter_revolver.png` and the approved `art/icons/gear/weapon-drifter_revolver--relic.png`
- **At icon size it must read as:** the lightest revolver of the five, one lit line along the barrel.

```
The maker's signature parts are: side profile, muzzle to the right, level; a long octagonal barrel with a small brass blade front sight at the muzzle; a fluted six-chamber cylinder in an open steel frame; a tall curved spur hammer at the rear; three brass pins on the frame; a curved brass trigger guard and trigger; a walnut grip curling down and back, with one brass pin. Worn dark steel with a bronze cast, no colour accent: the brass of the fittings.
Grade: Celestial. Keep the shape, the barrel stripe and the scroll panel's place. Barrel, cylinder and frame become a pale, unmarked pearl-ivory metal; the grip is ivory with a faint warm trace of walnut; the trigger guard, trigger, sight and pins are pale gold. The barrel stripe and the gap between the cylinder and the frame give a faint, contained ivory-gold light from inside. The muzzle stays dark: no light from the barrel, nothing past the outline: no bloom, no halo, no rays, no sparks.
```

---

# C. Order, checklist, the graded items and the count

## C1. Order of work

1. **The proof sheet** (section B, 8 pictures). Send it for review before any other grade set. If the generator does not hold the silhouette, stop and report.
2. **Grade sets of the 60 existing Standards that are kept** (section C3, "kept"), one sheet per item, by class.
3. **The 17 repainted guns** (`10-rifle-analogues.md` section 1) are repainted and approved first; then their grade sets, made from the repaint, never from the old painting.
4. **The 87 new Standards** (files 05, 06, 07, 09 and 10): each new Standard is approved first, then its grade set.
5. **The 23 uniques** (section D) last, after the grade sets; a unique built on a repainted or new silhouette is painted after that Standard is approved. Uniques have no grade pictures.

## C2. Checklist per sheet (one item, five grades side by side)

1. **Same weapon?** Lay each grade over the Standard at 50% opacity: the outlines match; every part is in the same place; the number of parts is the same (count the screws, the bands, the rivets, the pieces of a thrown set). A moved part or a new outline is a failed pick.
2. **Readable at 64 px?** Scale the five to 64 px on `#10151F`, then to 32 px: all five read as the same item; Fine's line, Masterwork's stripe, Relic's gold point and Celestial's lit line are each still visible at 64 px.
3. **Grade order obvious without the label?** Shuffle the five at 64 px and put them in order by eye: lighter-and-clean, then a coloured stripe, then dark-warm-gold, then pale-and-lit. If two can be swapped, push the weaker step further.
4. **Rules kept:** transparent background, the Standard's margins, no frame or coloured rim, no text or symbol, the Celestial light inside the outline, a focus's lens colour unchanged, the faction accent in its place, a gun's pattern unchanged.
5. **Sheet consistency across a family:** the three forms of one family at the same grade look like the same workshop's work (the same inlay width, the same patina warmth).

## C3. Every graded item, by class

Stems are the Standard's file name in `art/icons/gear/` without `.png`. Each item gets four grade pictures: `<stem>--fine.png`, `<stem>--masterwork.png`, `<stem>--relic.png`, `<stem>--celestial.png`.

**Blades (A3.1), 21 items.** Kept (7): `weapon-combat_knife`, `weapon-sabre`, `weapon-legion_gladius`, `weapon-katana`, `weapon-kemizuchi_duelling_blade`, `weapon-adamantile_greatsword`, `weapon-ork_machete`. New, file 05 (14): `weapon-trench_knife`, `weapon-lowland_chopper`, `weapon-dock_cutter`, `weapon-broadback_sabre`, `weapon-legion_leaf_dagger`, `weapon-legion_rank_sword`, `weapon-short_draw`, `weapon-long_draw`, `weapon-kemizuchi_side_sword`, `weapon-kemizuchi_sword_breaker`, `weapon-adamantile_plate_needle`, `weapon-adamantile_longsword`, `weapon-ork_skinner`, `weapon-ork_cleaver_glaive`.

**Hafted (A3.2), 9 items.** Kept (5): `weapon-hatchet`, `weapon-war_axe`, `weapon-glaive`, `weapon-lance`, `weapon-maul`. New, file 05 (4): `weapon-pitch_axe`, `weapon-legion_spear`, `weapon-war_pick`, `weapon-war_hammer`.

**Guns (A3.3), 51 items.** Kept (7): `weapon-parlour_pistol`, `weapon-drifter_revolver`, `weapon-lever_carbine`, `weapon-sawn_off`, `weapon-coach_gun`, `weapon-legion_bullpup`, `weapon-whisper_smg`. Repainted, file 10 section 1 (14): `weapon-service_pistol`, `weapon-magistrate_pistol`, `weapon-frontier_hand_cannon`, `weapon-decrkm_autopistol`, `weapon-decrkm_smg`, `weapon-legion_pdw`, `weapon-mandestra_drum_gun`, `weapon-hellraiser_service_rifle`, `weapon-hellraiser_lmg`, `weapon-adamantile_battle_rifle`, `weapon-ccec_marksman_rifle`, `weapon-long_rifle`, `weapon-brigade_auto_shotgun`, `weapon-lumeri_scattergun`. New, file 06 (15): `weapon-snub_revolver`, `weapon-decrkm_carbine`, `weapon-legion_marksman_rifle`, `weapon-whisper_pistol`, `weapon-whisper_carbine`, `weapon-mandestra_drum_pistol`, `weapon-mandestra_drum_rifle`, `weapon-hellraiser_trench_carbine`, `weapon-adamantile_carbine`, `weapon-adamantile_heavy_rifle`, `weapon-fowling_gun`, `weapon-brigade_shot_pistol`, `weapon-brigade_drum_shotgun`, `weapon-lumeri_hand_scatter`, `weapon-lumeri_long_scatter`. New, file 10 (15): `weapon-adcorp_short_carbine`, `weapon-adcorp_line_rifle`, `weapon-adcorp_designated_rifle`, `weapon-chezknov_machine_carbine`, `weapon-chezknov_battle_rifle`, `weapon-chezknov_precision_rifle`, `weapon-arsenal_courier_pdw`, `weapon-arsenal_piston_rifle`, `weapon-arsenal_heavy_rifle`, `weapon-smetanita_pocket_pistol`, `weapon-smetanita_service_pistol`, `weapon-smetanita_hand_cannon`, `weapon-albert_town_brush_carbine`, `weapon-albert_town_service_rifle`, `weapon-albert_town_stalking_rifle`.

**Bows, crossbows and the quiver (A3.4), 7 items.** Kept (5): `weapon-recurve_bow`, `weapon-longbow`, `weapon-crossbow`, `weapon-repeating_crossbow`, `quiver-quiver`. New, file 06 (2): `weapon-short_bow`, `weapon-arbalest`.

**Gloves and foci (A3.5), 10 items.** Kept (9): `weapon-striking_gloves`, `weapon-hand_wraps`, `weapon-knuckledusters`, `weapon-kemizuchi_strikers`, `weapon-iron_mitts`, `focus-evoker`, `focus-emanator`, `focus-visualizer`, `focus-attuner`. New, file 05 (1): `weapon-weighted_gloves`.

**Shields (A3.6), 9 items.** Kept (3): `shield-buckler`, `shield-riot_shield`, `shield-pavise`. New, file 07 (6): `shield-spiked_buckler`, `shield-boss_shield`, `shield-ram_plate`, `shield-deflector`, `shield-bulwark_screen`, `shield-barrier_wall`.

**Armour (A3.7), 33 items.** Kept (19): `armour-field_helmet`, `armour-ballistic_helmet`, `armour-night_goggles`, `armour-gas_mask`, `armour-torso_class1_light`, `armour-torso_class2_medium`, `armour-torso_class3_heavy`, `armour-torso_class4_assault`, `armour-torso_class5_juggernaut`, `armour-padded_undershirt`, `armour-trauma_plate`, `armour-utility_belt`, `armour-armoured_belt`, `armour-runner_trousers`, `armour-armoured_greaves`, `armour-work_gloves`, `armour-combat_gloves`, `armour-field_boots`, `armour-heavy_boots`. New, file 07 (14): `armour-assault_helm`, `armour-cowl`, `armour-hood`, `armour-blackout_hood`, `armour-spotters_monocle`, `armour-sight_visor`, `armour-breather`, `armour-sealed_visor`, `armour-breacher_plate`, `armour-mesh_undersuit`, `armour-rig_belt`, `armour-field_trousers`, `armour-tactical_gloves`, `armour-jump_boots`.

**Heavy weapons (A3.8), 15 items.** Kept (2): `weapon-hellraiser_rotary`, `weapon-purifier_flamer`. Repainted, file 10 section 1 (3): `weapon-smetanita_thumper`, `weapon-breacher_tube`, `weapon-blackpoint_700`. New, file 09 (10): `weapon-smetanita_snub_launcher`, `weapon-smetanita_drum_launcher`, `weapon-legion_throwaway_tube`, `weapon-legion_siege_tube`, `weapon-lumeri_votive_torch`, `weapon-lumeri_cathedral_burner`, `weapon-hellraiser_spinner`, `weapon-hellraiser_twin_rotary`, `weapon-blackpoint_carbine`, `weapon-blackpoint_wall_gun`.

**Powered melee and power gauntlets (A3.9), 6 items.** Kept (2): `weapon-ork_rip_saw`, `weapon-hellraiser_servo_fist`. New, file 09 (4): `weapon-ork_snarl_knife`, `weapon-ork_wreck_saw`, `weapon-hellraiser_piston_knuckles`, `weapon-hellraiser_door_knocker`.

**Thrown (A3.10), 3 items.** Kept (1): `weapon-throwing_knives`. New, file 09 (2): `weapon-throwing_darts`, `weapon-throwing_javelins`.

Armour by slot: helmets 3 (2 kept, 1 new), hoods 3 (0, 3), optics 3 (1, 2), respirators 3 (1, 2), vests 3 (3, 0), plate 3 (2, 1), undershirts 3 (2, 1), belts 3 (2, 1), legwear 3 (2, 1), worn gloves 3 (2, 1), boots 3 (2, 1): 33 items, 19 kept, 14 new.

## C4. The count

Per class: graded items = kept + repainted + new; grade pictures = graded items x 4; pictures to make = repainted + new + grade pictures (a repainted item makes five pictures: the repaint and its four grades).

| Class (block) | Graded items | Existing Standards kept | Repainted Standards | New Standards | Grade pictures (x 4) | Pictures to make |
| --- | --- | --- | --- | --- | --- | --- |
| Blades (A3.1) | 21 = 7 + 0 + 14 | 7 | 0 | 14 | 84 | 0 + 14 + 84 = 98 |
| Hafted (A3.2) | 9 = 5 + 0 + 4 | 5 | 0 | 4 | 36 | 0 + 4 + 36 = 40 |
| Guns (A3.3) | 51 = 7 + 14 + 30 | 7 | 14 | 30 | 204 | 14 + 30 + 204 = 248 |
| Bows, crossbows, quiver (A3.4) | 7 = 5 + 0 + 2 | 5 | 0 | 2 | 28 | 0 + 2 + 28 = 30 |
| Gloves and foci (A3.5) | 10 = 9 + 0 + 1 | 9 | 0 | 1 | 40 | 0 + 1 + 40 = 41 |
| Shields (A3.6) | 9 = 3 + 0 + 6 | 3 | 0 | 6 | 36 | 0 + 6 + 36 = 42 |
| Armour (A3.7) | 33 = 19 + 0 + 14 | 19 | 0 | 14 | 132 | 0 + 14 + 132 = 146 |
| Heavy weapons (A3.8) | 15 = 2 + 3 + 10 | 2 | 3 | 10 | 60 | 3 + 10 + 60 = 73 |
| Powered melee and gauntlets (A3.9) | 6 = 2 + 0 + 4 | 2 | 0 | 4 | 24 | 0 + 4 + 24 = 28 |
| Thrown (A3.10) | 3 = 1 + 0 + 2 | 1 | 0 | 2 | 12 | 0 + 2 + 12 = 14 |
| **All** | **164** | **60** | **17** | **87** | **656** | **17 + 87 + 656 = 760** |

**164 graded items x 4 = 656 grade pictures.** With the 17 repaints and the 87 new Standards, 760 pictures for the graded items; with the 23 uniques of section D, **783 gear pictures**. Only the items listed in C3 get grade pictures; every other gear painting, the uniques included, has none.

---

# D. The uniques (23 new paintings)

A unique is one of a kind: one painting, no grade pictures, shown inside the Unique frame the game draws. **Afterword** (`weapon-afterword`, `art/icons/gear/weapon-afterword.png`) is the first unique and is already painted: nothing to draw.

**What every unique shows (the brief).** It keeps its family's silhouette, so at 32 px it still reads as a sabre, a revolver, a pavise, never a new kind of object; it carries one small story detail somebody did to it (a mend, a keepsake, a scratched record), inside the outline, legible at 256 px and felt at 64; one part is made of an impossible material, the part that shows what the item does; it takes one accent from its maker or patron, as paint or as a contained light inside the outline; it is richer than a Standard but never the pale-and-lit look of a Celestial; no frame, no text.

**Where every unique shows:** the backpack row, the shop grid, the loot card, the Forge, the inspect view, inside the Unique frame; armour also in its gear slot.

## D1. Melee (7)

### D1.1 `last_sentence`: Last Sentence (great blade)

- **Save as:** `art/icons/gear/weapon-last_sentence.png`
- **Attach:** `art/icons/gear/weapon-adamantile_greatsword.png`, `art/icons/weapons/adamantile_greatsword.svg`
- **At icon size it must read as:** the plated greatsword, with a pale lit strip down the middle of the blade.

```
A unique two-handed greatsword of the Adamantile Brigade, on the 45 degree diagonal, nearly corner to corner, the blade as the focal point: a wide flat blade, an oversized plate guard and a crest on the pommel, pale steel with gilt. The impossible material: the centre of the blade, along the fuller, is a strip of stilled daylight, a pale warm ivory-gold #E9D6A2 that the guard can be seen through, solid as glass and quietly lit from inside, bounded exactly by the fuller's edges. The story detail: a narrow reliquary slot at the base of the blade holding a rolled verdict sealed with blank wax at both ends, the seal cracked once and remade. Heirloom richness, heavy and solemn.
Avoid: letters on the scroll or the seals, a halo or rays, a cross, flames, wings on the guard, a glow past the blade's edge.
```

### D1.2 `grandmothers_teeth`: Grandmother's Teeth (scrap cutter)

- **Save as:** `art/icons/gear/weapon-grandmothers_teeth.png`
- **Attach:** `art/icons/gear/weapon-ork_machete.png`, `art/icons/weapons/ork_machete.svg`
- **At icon size it must read as:** the jagged wide machete, its edge a row of big teeth.

```
A unique Ork machete, on the 45 degree diagonal, handle bottom-left: a wide, uneven cleaver blade with a jagged back and a belly, a grip of oily leather with nails driven through it, rust and dirty ochre paint daubs. Instead of an edge, the belly of the blade is set with a row of big curved teeth hammered in like nails. The impossible material: the teeth are still growing; the one at the tip is longer than the rest, and at the back of the blade the pale roots of two teeth push through the steel like new shoots. The story detail: one tooth near the grip is missing, replaced by a bent iron bolt wired into the gap with care no Ork admits to. Ugly, heavy, a family heirloom. Accent: dirty ochre daubs.
Avoid: gore or blood, a skull, a jaw or a mouth shape, a chainsaw, anything that leaves the blade's silhouette.
```

### D1.3 `last_crossing`: Last Crossing (polearm)

- **Save as:** `art/icons/gear/weapon-last_crossing.png`
- **Attach:** `art/icons/gear/weapon-glaive.png`, `art/icons/weapons/glaive.svg`
- **At icon size it must read as:** a glaive whose blade is an oar's blade, darkly wet.

```
A unique glaive belonging to the Toll-Keeper's ferrymen, on the 45 degree diagonal, nearly corner to corner: a long pole of dark weathered wood, and at its head a curved single-edged blade that is plainly an old oar's blade, sharpened along its curved side, with a small hook at its base. The impossible material: the oar blade is coated in a film of black water that never drips, still and glassy, holding a pale teal #79BDB6 reflection of a sky that is not there; no drop leaves it. The story detail: a single old coin wedged into a slot cut in the socket where blade meets pole, and the hasp of a coin box nailed beside it. Quiet, patient, oilskin-dark.
Avoid: a skull, a scythe, drops or splashes, a boat, a hooded figure, a glow past the blade.
```

### D1.4 `owed_in_full`: Owed in Full (Kemizuchi duelling blade)

- **Save as:** `art/icons/gear/weapon-owed_in_full.png`
- **Attach:** `art/icons/gear/weapon-kemizuchi_duelling_blade.png`, `art/icons/weapons/kemizuchi_duelling_blade.svg`
- **At icon size it must read as:** the open-frame Kemizuchi blade, its frame strung with violet threads.

```
A unique Kemizuchi duelling blade, on the 45 degree diagonal, handle bottom-left: a straight blade built as an open steel frame with an angled chisel tip, a round lacquered disc guard, a short squared cross-bar behind it, a cord-wrapped grip and a squared ring pommel; pale steel and black lacquer. The impossible material: the open window inside the blade's frame is strung end to end with taut violet threads #9C82D7, close as a loom's warp, hard as steel and holding an edge, faintly lit from inside. The story detail: one thread near the guard is tied in a single small knot, and three small brass beads are threaded on another, pushed up against the guard like a count kept. Precise, cold, patient.
Avoid: a spider web, letters or numbers, a loose thread end, a glow past the frame, crimson in place of the violet.
```

### D1.5 `reveille`: Reveille (maul)

- **Save as:** `art/icons/gear/weapon-reveille.png`
- **Attach:** `art/icons/gear/weapon-maul.png`, `art/icons/weapons/maul.svg`
- **At icon size it must read as:** the riveted block maul, its striking face rippled like a struck bell.

```
A unique two-handed maul of the Hellraiser Divisions, on the 45 degree diagonal, head top-right: a big squared steel block head with a short wedge on its back, held by riveted straps on a banded wooden haft with a ring at the butt; dark parkerised steel, slab-cut edges. The impossible material: the striking face is a single bell-note made solid: the steel of the face stands in fine concentric ripples, as if the head had just been struck and the ring had set hard mid-sound, the deepest ring holding a dull oxide red #CC2435 heat; the ripples stay inside the face's square outline. The story detail: a dented brass bugle mouthpiece riveted to the collar where head meets haft. Heavy, loud even standing still.
Avoid: musical notes, sound lines drawn in the air, a bell shape for the head, spikes, a glow past the face.
```

### D1.6 `breath_of_morning`: Breath of Morning (hand wraps)

- **Save as:** `art/icons/gear/weapon-breath_of_morning.png`
- **Attach:** `art/icons/gear/weapon-hand_wraps.png`, `art/icons/weapons/hand_wraps.svg`
- **At icon size it must read as:** the wrapped fist of the hand wraps, bound in pale mist.

```
A unique set of fighting hand wraps, shown as the wrapped shape of a closed fist with no hand inside, three-quarter view, one loose tail strip curling away at the wrist. The impossible material: the wraps are bound from a strip of morning fog, pale grey-white and soft-edged, faintly translucent where the turns overlap, solid enough to hold a fist; the loose tail thins toward its end and fades to nothing within the outline. The story detail: one narrow strip of faded red ribbon wound in among the fog at the wrist and knotted, a keepsake. No colour accent: the fog's pale value is the light of the piece, the ribbon the only colour. Quiet, light, unhurried.
Avoid: a hand or skin, wind lines, a face in the mist, drifting smoke past the outline.
```

### D1.7 `rearguard`: Rearguard (Legion short sword)

- **Save as:** `art/icons/gear/weapon-rearguard.png`
- **Attach:** `art/icons/gear/weapon-legion_gladius.png`, `art/icons/weapons/legion_gladius.svg`
- **At icon size it must read as:** the broad Legion short sword, its blade white as packed snow.

```
A unique Thousand World Legion short sword, on the 45 degree diagonal, handle bottom-left: a broad straight blade with a long leaf point and a central fuller, a squared riveted crossguard block, an olive-grey wrapped grip and a round pommel; plain issue steel. The impossible material: the blade is packed winter snow, firm as steel and holding an edge, a fine crust of frost along the edge, a thin blue shadow lying in the fuller; it has never melted. The story detail: a cord tied round the grip with a row of small knots, one for each soldier it covered on a retreat, the last knot left half tied. Accent: none, the Legion's single pale stripe across the guard.
Avoid: icicles hanging, snowflakes in the air, numbers, a glow, a crossguard of a different shape.
```

## D2. Guns and bows (8)

### D2.1 `in_triplicate`: In Triplicate (Legion bullpup)

- **Save as:** `art/icons/gear/weapon-in_triplicate.png`
- **Attach:** `art/icons/gear/weapon-legion_bullpup.png` (the family silhouette), `art/icons/weapons/legion_bullpup.svg`
- **At icon size it must read as:** the carry-handle bullpup, its magazine pale and flat as folded paper.

```
A unique Thousand World Legion bullpup rifle, on a slight diagonal, muzzle up and right: the bullpup pattern with a long carry handle running over the whole body, the cocking handle under it, the short straight magazine behind the pistol grip, two thin bipod legs folded along the fore-end, a short barrel with a ringed flash hider and a flat butt; olive-grey polymer and bare steel, plain and mass-produced. The impossible material: the magazine is a crisp folded paper form, pale and flat-edged with sharp creases, holding a stack of brass rounds at its lips as firmly as steel. The story detail: three blank wax seals pressed in a neat row on the receiver's side, and the butt wrapped in a long strip of blank ledger tape bound with wire. Accent: the olive green #8B9F47 of the seals. Dry, orderly, faintly absurd.
Avoid: writing, numbers or stamps on the paper or the tape, a barcode, a book, a scope, a glow.
```

### D2.2 `second_thunder`: Second Thunder (magnum revolver)

- **Save as:** `art/icons/gear/weapon-second_thunder.png`
- **Attach:** `art/icons/gear/weapon-frontier_hand_cannon.png` (paint this unique after its repaint is approved), `art/icons/weapons/frontier_hand_cannon.svg`
- **At icon size it must read as:** the long magnum revolver, its cylinder a grey cloud in a brass cage.

```
A unique big double-action magnum revolver, side profile turned slightly toward the viewer, muzzle to the right, level: a long barrel with a full-length underlug and a vented top rib, an adjustable rear sight, a heavy frame and a rubber-wrapped grip; blued steel. The impossible material: the cylinder is a cage of aged brass bands around a ball of grey storm cloud held perfectly still, a thin vein of Old Overcast blue #4E8DD1 light caught inside it. The story detail: the front sight is a small copper lightning-rod finial, and the grip is wrapped in the cord of an old weather vane, knotted twice. Theatrical and heavy, an heirloom of someone who argued with the sky.
Avoid: lightning bolts leaving the gun, sparks, rain, a face in the cloud, a glow past the cage, any marking on the barrel.
```

### D2.3 `encore`: Encore (two-shot derringer)

- **Save as:** `art/icons/gear/weapon-encore.png`
- **Attach:** `art/icons/gear/weapon-parlour_pistol.png`, `art/icons/weapons/parlour_pistol.svg`
- **At icon size it must read as:** the tiny over-and-under pistol with red velvet barrels.

```
A unique two-shot over-and-under pocket pistol, side profile, muzzle to the right, drawn to fill the frame like a full pistol: two stacked short barrels, a small ornate frame with a spur trigger and a curved ivory grip. The impossible material: the two barrels are rolled stage-curtain velvet in deep red #B83243, hardened like steel, the nap of the velvet still visible, the folds of the curtain running down their length. The story detail: a tiny carved cameo of a plain smiling face in profile set in the grip (a carved face only, not a mask, no eyes painted in), and a faded blank ticket stub tucked under the grip's lower screw. Playful, polished, a little sinister.
Avoid: letters on the ticket, a jester or clown, a ribbon hanging loose, confetti.
```

### D2.4 `homecoming`: Homecoming (harpoon gun)

- **Save as:** `art/icons/gear/weapon-homecoming.png`
- **Attach:** only the base references of base prompt U (this one-off gun has no family painting: draw the pattern the prompt describes)
- **At icon size it must read as:** a short shoulder gun with a barbed harpoon standing out of its muzzle and a reel of line under it.

```
A unique harpoon gun of the river docks, the classic shoulder-fired whaler's gun pattern, on a slight diagonal, muzzle up and right, about 85% of the canvas width: a short, very thick, heavy steel barrel with a heavy barbed harpoon head standing out of the muzzle, its shaft running back into the barrel; a heavy round breech with one exposed side hammer; a single trigger in a plain guard; a plain straight walnut stock with a slim wrist and a steel butt plate, no pistol grip; a round line reel with a crank handle bolted under the fore-end, its line running up to the harpoon. Frontier work: bare steel, walnut, worn leather. The impossible material: the line wound on the reel and running up to the harpoon's eye is a thin rope of flowing river water, clear and quick, coiled tight on the reel and never spilling a drop. The story detail: a small brass house key tied to the reel's crank on a short cord. No colour accent: the water's cool clear blue-grey is the only colour beside steel and walnut.
Avoid: a whale or fish, splashes or drops, a glow, a rope of ordinary fibre, a trident or spear-gun with rubber bands.
```

### D2.5 `first_light`: First Light (precision rifle)

- **Save as:** `art/icons/gear/weapon-first_light.png`
- **Attach:** `art/icons/gear/weapon-long_rifle.png` (paint this unique after its repaint is approved), `art/icons/weapons/long_rifle.svg`
- **At icon size it must read as:** the scoped bolt-action precision rifle, its scope holding a sunrise.

```
A unique bolt-action precision rifle, on a slight diagonal, muzzle up and right, about 85% of the canvas width: the classic precision pattern of the attached repaint: a one-piece synthetic stock with a straight comb and a near-vertical pistol grip, a round receiver with a turned-down bolt handle, a long heavy plain barrel with no brake, a hinged floorplate with nothing hanging below, a bipod folded under the fore-end and a large scope with tall turrets; neutral matte finish. The impossible material: the scope's body is translucent amber glass, and inside it a sunrise is caught half-risen, a small warm sun at the horizon line, never rising further; the light stays inside the scope. The story detail: a hand-made sunshade of folded tin over the scope's front lens, dented once and mended with wire. Accent: the warm dawn amber inside the scope.
Avoid: a beam or glare leaving the lens, rays, a glow past the scope, a wooden hunting stock, any marking.
```

### D2.6 `night_watch`: Night Watch (pump shotgun)

- **Save as:** `art/icons/gear/weapon-night_watch.png`
- **Attach:** `art/icons/gear/weapon-lumeri_scattergun.png` (paint this unique after its repaint is approved), `art/icons/weapons/lumeri_scattergun.svg`
- **At icon size it must read as:** the Lumeri pump shotgun, its magazine tube a glass candle.

```
A unique Lumeri Church pump-action combat shotgun, on a slight diagonal, muzzle up and right, about 80% of the canvas width: a long tube magazine under the barrel, a ribbed pump fore-end, a receiver with a side ejection port, a bead front sight and a plain fixed stock with a straight wrist carrying one thin gold inlay line; ivory-painted wood and steel. The impossible material: the tube magazine is clear glass and holds one candle flame that burns along its whole length without wax or wick, steady and contained. The story detail: drips of old white wax layered down the pump fore-end, left by a hundred night watches. Accent: Lumeri gold #F2C46A in the flame.
Avoid: smoke, a flame outside the tube, a cross or halo, a candle standing on the gun, letters.
```

### D2.7 `unsaid`: Unsaid (suppressed submachine gun)

- **Save as:** `art/icons/gear/weapon-unsaid.png`
- **Attach:** your saved `art/icons/gear/weapon-chezknov_machine_carbine.png` (file 10, entry 2.5: the pattern's receiver, sights, magazine and stock), `art/icons/gear/weapon-whisper_smg.png` (the scale and the blue-grey stock plate only, not its silhouette)
- **At icon size it must read as:** the slim roller-delayed submachine gun with its integral suppressor, the suppressor a piece of night.

```
A unique integrally suppressed submachine gun, on a slight diagonal, muzzle up and right, about 70% of the canvas width: the integrally suppressed version of the roller-delayed submachine gun pattern of the attached machine carbine: a slim round stamped receiver tube with the cocking tube above it and the cocking handle at its front-left; a round rotary drum rear sight and a hooded front sight ring; a strongly curved pistol-calibre magazine set just ahead of the trigger group; a pistol grip; a retracted sliding metal stock of two bars with a rubber butt pad and a small blue-grey plate on it; and, in place of the barrel and fore-end, one long fat smooth suppressor tube of even diameter forming the front half of the gun, with no ports; matte dark steel. The impossible material: the suppressor is a piece of night, a matte black that holds no highlight at all, with a few faint stars deep inside it. The story detail: a moth's wing pressed flat under a strip of clear tape on the side of the stock. Accent: the small blue-grey plate on the stock, as on the attached painting.
Avoid: a glow past the suppressor, smoke, a moon, letters or marks, a second magazine, a straight magazine, a folding skeleton stock.
```

### D2.8 `windfall`: Windfall (recurve bow)

- **Save as:** `art/icons/gear/weapon-windfall.png`
- **Attach:** `art/icons/gear/weapon-recurve_bow.png`, `art/icons/weapons/recurve_bow.svg`
- **At icon size it must read as:** the recurve bow, its string a line of standing raindrops.

```
A unique recurve bow, upright on a gentle diagonal, string to the lower left, about 85% of the canvas height: two curving limbs with curled tips, a riser bound with cord wraps and a small arrow shelf; weathered wood with mossy green-and-ochre paint. The impossible material: the string is a single strand of falling rain held taut between the nocks, a line of clear drops standing still along it, each catching one point of light. The story detail: three feathers of three different birds tied together at the riser with a twist of cord. No colour accent beyond the bow's own moss green.
Avoid: an arrow, splashes, clouds, a glow past the string, letters.
```

## D3. Shields (3)

### D3.1 `return_clause`: Return Clause (Ward shield)

- **Save as:** `art/icons/gear/shield-return_clause.png`
- **Attach:** `art/icons/gear/shield-buckler.png` and `art/icons/gear/shield-riot_shield.png` (shield scale and front view), and file 07's approved `art/icons/gear/shield-deflector.png` (paint this unique after it)
- **At icon size it must read as:** a light kite-shaped shield whose face is a pane of water holding one bright mark.

```
A unique Ward shield made by the Science Team, front view, upright, about 85% of the canvas height: a light rounded-diamond deflector with a thin pale steel frame, precise straight edges and a thin dark arm strap showing at one edge. Its face is the impossible material: a sheet of still water standing upright inside the frame, flat and unbroken, reflecting a cool pale sky, with no drip at the edges. Suspended inside the water is one caught spell: a single bright abstract glyph stroke in Mind cyan #4FC8DF, as if it had struck and been held, ready to go back the way it came. The story detail: a burn-black scorch line on the frame's upper edge where the first spell it ever turned grazed it, left unrepaired on purpose. Pale ceramic and dark steel; the only accent is the cyan of the glyph, contained inside the water.
Avoid: a mirror, a reflected face or figure, letters or numerals as the glyph, a round buckler shape, sparks or a glow past the frame.
```

### D3.2 `outpost_wall`: Outpost Wall (Guard shield)

- **Save as:** `art/icons/gear/shield-outpost_wall.png`
- **Attach:** `art/icons/gear/shield-pavise.png`, `art/icons/armour/pavise.svg`
- **At icon size it must read as:** a tall planted board whose foot has taken root.

```
A unique Guard shield of the Thousand World Legion's frontier outposts, front view, standing on its ground edge, about 85% of the canvas height: a tall, wide board shield with a centre ridge and a folded prop leg showing behind it, in olive-grey painted steel over dark boards, plain and mass-produced, one faded pale stripe across the top. The impossible material: its foot and its prop leg have grown roots of dark iron, thick and coiled tight against the bottom edge, gripping nothing, as if the shield took root the first night it was planted and never quite let go; the roots stay inside a neat silhouette at the base. The story detail: a long row of short scratched notches along the right edge, one for each night it held a line, the newest still bright. Heavy, dented, cared for. Accent: none, the pale stripe.
Avoid: soil, grass or a ground plane, numerals for the notches, an emblem, a riot-shield viewport, leaves.
```

### D3.3 `grudge_plate`: Grudge Plate (Strike shield)

- **Save as:** `art/icons/gear/shield-grudge_plate.png`
- **Attach:** `art/icons/gear/shield-buckler.png` and `art/icons/gear/shield-riot_shield.png` (shield scale and front view), and file 07's approved `art/icons/gear/shield-boss_shield.png` (paint this unique after it)
- **At icon size it must read as:** a round-cornered shield with a big domed boss and dents that glow.

```
A unique Strike shield of the Hellraiser Divisions, front view, upright, about 85% of the canvas height: a medium round-cornered shield of dark parkerised steel plates over planks, a slab-cut steel rim, and one big thick domed steel boss in the middle ringed by heavy rivets; the boss is the largest shape. The impossible material: the face is covered in deep dents from blows it has taken, and every dent holds the heat of the blow like a banked coal, a deep oxide red #CC2435 glow sitting inside each dent only, brightest in the newest, as if the shield is keeping count and waiting to give it all back. The story detail: one dent near the rim has been ringed with a hand-scratched circle, the one blow its owner swore to return. Hard scratches at the edges.
Avoid: flames, smoke, sparks, a glow outside the dents, a skull or emblem, spikes, a kite or rectangular shape.
```

## D4. Armour (5)

### D4.1 `red_thread_gloves`: Red Thread (worn gloves)

- **Save as:** `art/icons/gear/armour-red_thread_gloves.png`
- **Attach:** `art/icons/gear/armour-work_gloves.png`, `art/icons/gear/armour-combat_gloves.png`, `art/icons/armour/work_gloves.svg`
- **At icon size it must read as:** a pair of gloves joined by one red thread.

```
A unique pair of fitted field gloves, shown side by side as one object, front view, no hands inside: supple dark leather with light padding at the knuckles, neat stitching, short cuffs. The impossible material: one red thread #D879AF that has no end: it runs out of the right glove's index fingertip, loops once across the gap between the pair, and goes into the left glove's cuff, where it is stitched into the seam and comes out again at its fingertip, a single unbroken loop binding the two. The story detail: a small empty thread spool clipped at the right cuff, polished by use. Warm, tidy, fond.
Avoid: hearts, a knot shaped like a heart, hands or skin, a loose thread end, a glow, any lettering.
```

### D4.2 `hearth_coat`: Hearth Coat (vest, outer torso)

- **Save as:** `art/icons/gear/armour-hearth_coat.png`
- **Attach:** `art/icons/gear/armour-torso_class1_light.png`
- **At icon size it must read as:** the long quilted coat, its open collar glowing like a hearth.

```
A unique padded coat, front view, laid out as for sale, no wearer: a long quilted coat with a high collar, front toggles and one reinforced shoulder, in dark waxed cloth with brown leather patches, an apron panel tied over the front with a deep pocket. The impossible material: the quilted lining, seen at the open collar and at the turned-back cuffs, is banked embers, glowing a low hearth orange #ED8A3C and never burning the cloth beside it, the glow contained inside the lining. The story detail: flour dusted on both cuffs and a wooden spoon standing in the apron pocket. Homely, warm, worn soft.
Avoid: flames or smoke, a heart, a cross or medical mark, a wearer, a glow past the coat's outline.
```

### D4.3 `lucky_dent`: Lucky Dent (helmet)

- **Save as:** `art/icons/gear/armour-lucky_dent.png`
- **Attach:** `art/icons/gear/armour-field_helmet.png`, `art/icons/armour/field_helmet.svg`
- **At icon size it must read as:** the field helmet with one deep dent on the brow holding a bright round.

```
A unique field helmet, three-quarter view, upright, no wearer: a domed steel shell with a short ridge at the crown, a riveted brim band and a flared brim, a canvas liner and a chin strap with a square buckle; olive-grey paint chipped to bare steel. The impossible material: one deep dent on the brow holds the round that made it, caught in the steel as in clear honey-coloured amber: the steel around the dent has turned clear, and the flattened brass round hangs inside it, still. The story detail: a small star twisted from wire tied to the chin-strap ring for luck. Accent: none, Legion olive-grey; the brass of the round is the only warm point.
Avoid: a hole through the shell, blood, cracks spreading, letters or numbers, a glow past the dent.
```

### D4.4 `spring_air`: Spring Air (respirator)

- **Save as:** `art/icons/gear/armour-spring_air.png`
- **Attach:** `art/icons/gear/armour-gas_mask.png`, `art/icons/armour/gas_mask.svg`
- **At icon size it must read as:** the gas mask, its two filters little green worlds.

```
A unique gas mask, front view, upright, no wearer: a dark rubber face with two squared goggle lenses, a strap harness over the crown with square buckles, a snout vent below, and two round filter canisters on the cheeks. The impossible material: the two filter canisters are glass drums, and each holds a tiny living spring morning: a tuft of fresh green grass, one small white flower and a pale sky above it, sealed behind the glass. The story detail: a dried blossom tucked under the head strap's buckle. No colour accent beyond the green inside the canisters; the lenses keep a plain glass tint.
Avoid: a face behind the lenses, smoke or gas, insects, a glow past the canisters, letters.
```

### D4.5 `long_road`: The Long Road (boots)

- **Save as:** `art/icons/gear/armour-long_road.png`
- **Attach:** `art/icons/gear/armour-field_boots.png`, `art/icons/armour/field_boots.svg`
- **At icon size it must read as:** the pair of tall laced boots standing on soles of cobblestone.

```
A unique pair of tall lace-up field boots, three-quarter view, side by side as one object, no wearer: worn brown leather, brass eyelets, a turned-down collar, scuffed toe caps. The impossible material: the soles are a slab of old cobbled road, rounded grey cobblestones set in rows where the tread lugs would be, a thin line of moss growing between two of them. The story detail: the left boot laced with its old brown lace, the right with a mismatched cord of faded blue, and a sprig of dried heather pushed through the top eyelet. Accent: none, Frontier leather and stone.
Avoid: a road or ground plane under them, footprints, mud splashes, a glow, letters.
```

## D5. The 23 uniques at a glance

| # | Id | Name | Save as |
| --- | --- | --- | --- |
| 1 | `last_sentence` | Last Sentence | `art/icons/gear/weapon-last_sentence.png` |
| 2 | `grandmothers_teeth` | Grandmother's Teeth | `art/icons/gear/weapon-grandmothers_teeth.png` |
| 3 | `last_crossing` | Last Crossing | `art/icons/gear/weapon-last_crossing.png` |
| 4 | `owed_in_full` | Owed in Full | `art/icons/gear/weapon-owed_in_full.png` |
| 5 | `reveille` | Reveille | `art/icons/gear/weapon-reveille.png` |
| 6 | `breath_of_morning` | Breath of Morning | `art/icons/gear/weapon-breath_of_morning.png` |
| 7 | `rearguard` | Rearguard | `art/icons/gear/weapon-rearguard.png` |
| 8 | `in_triplicate` | In Triplicate | `art/icons/gear/weapon-in_triplicate.png` |
| 9 | `second_thunder` | Second Thunder | `art/icons/gear/weapon-second_thunder.png` |
| 10 | `encore` | Encore | `art/icons/gear/weapon-encore.png` |
| 11 | `homecoming` | Homecoming | `art/icons/gear/weapon-homecoming.png` |
| 12 | `first_light` | First Light | `art/icons/gear/weapon-first_light.png` |
| 13 | `night_watch` | Night Watch | `art/icons/gear/weapon-night_watch.png` |
| 14 | `unsaid` | Unsaid | `art/icons/gear/weapon-unsaid.png` |
| 15 | `windfall` | Windfall | `art/icons/gear/weapon-windfall.png` |
| 16 | `return_clause` | Return Clause | `art/icons/gear/shield-return_clause.png` |
| 17 | `outpost_wall` | Outpost Wall | `art/icons/gear/shield-outpost_wall.png` |
| 18 | `grudge_plate` | Grudge Plate | `art/icons/gear/shield-grudge_plate.png` |
| 19 | `red_thread_gloves` | Red Thread | `art/icons/gear/armour-red_thread_gloves.png` |
| 20 | `hearth_coat` | Hearth Coat | `art/icons/gear/armour-hearth_coat.png` |
| 21 | `lucky_dent` | Lucky Dent | `art/icons/gear/armour-lucky_dent.png` |
| 22 | `spring_air` | Spring Air | `art/icons/gear/armour-spring_air.png` |
| 23 | `long_road` | The Long Road | `art/icons/gear/armour-long_road.png` |
