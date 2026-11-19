# GPT prompts, 19 Nov 2026, file 08: Items 2.0 grade pictures (scheme S1) and the uniques

For the artist, and for GPT. Source list: `art/briefs/ART-REQUESTS-2026-11-19.md`, section 4 (P2, Items 2.0: a PLAN), with Leon's ruling of 19 Nov 2026: **scheme S1, all five grades painted for every graded item**. The grade ladder and its names are data (`data/rules.json` `rarity`): **Standard, Fine, Masterwork, Relic, Celestial** (keys `standard`, `fine`, `masterwork`, `relic`, `celestial`). The game shows a grade today as a word and 0 to 4 ◆ marks (`rarity.*.marks`); the frame and the marks stay UI, never painted. Rule: `art/style-guide/gear-icons.md` (grade shows by finish and wear, never by a coloured border; the Standard picture is the master; grade files are `<stem>--<tier>.png`).

**What this file holds:** (a) the grade method, one reusable block per grade per item class; (b) a worked example, the five grades of `katana` and of `service_pistol` (the proof sheet of section 4.6); (c) the batch order, the sheet checklist and the count (572 pictures); (d) the uniques: the brief template, Leon's three shield concepts, and 8 PROPOSED concepts.

**Nothing here is ordered before Leon answers section 4.8, except the proof sheet.** Every new form name, unique name and unique id is PROPOSED. Every delivery is a review candidate until Leon approves it; Claude adds the catalog entries on intake (`gear` map, key = file stem) and draws the line icons and the Unique frame.

## How to use

One image a prompt.

- **A grade picture** (Fine, Masterwork, Relic, Celestial) is made **image-to-image** (the generator's edit mode) from the item's **approved** Standard painting. Paste **base prompt G**, then the item's **keep line** (section A2), then the **grade block** of its class (section A3). Attach the approved Standard; from Masterwork on, also attach the item's approved grade below it. If the generator has a strength or change setting, start low and raise it only until the finish changes: the outline must not move.
- **A unique** is a new painting. Paste **base prompt U**, then the entry's prompt.
- Save under the file name given. Do not rename. In-world only: invented shapes, no real-world makes, models, brands, insignia or religions; no text, letters, numbers, logos or maker marks in any image.

## Base prompt G: a grade step of an approved gear painting (image-to-image)

**Attach:** the item's approved Standard, `art/icons/gear/<stem>.png` (the shape master); from Masterwork on, the approved grade below it (`<stem>--fine.png` for Masterwork, and so on), for continuity of what each grade added. For the house look: `art/portraits/world/new-faces/orren-vask.png` (brushwork). Palette: `art/style-guide/palette.json`. Rule: `art/style-guide/gear-icons.md`.

**Size / background:** 1024 x 1024 PNG with alpha, fully transparent, exactly the Standard's canvas, framing and margins (the object inside the central 80 to 85%, about 100 px clear on every side).

```
Repaint the attached game inventory icon as a higher grade of the very same object. This is the same item, not a new one: keep exactly its silhouette and outline, every part and where it sits, its proportions and lengths, the camera angle, the pose and the diagonal, the scale in the frame and the margins, the light from the upper left and the short painted shading on its own underside. Keep the maker's signature parts named below exactly as they are. Change only the surface: finish, material, wear, inlay and ornament, as the grade below says, and keep every addition inside the existing outline (flush, inlaid, engraved, stitched or wrapped on). Same style as the attached painting: Heavenprint, hand-painted opaque gouache and ink with broken directional brush strokes, dry-brush scumbling, charcoal shadows, warm ivory highlights on the focal edges. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss. Fully transparent background, square 1024 x 1024 PNG with alpha, no ground, no cast shadow, no scene. No text, letters, numbers, logos, maker marks, heraldry or symbols. No hands, no figures. No frame, no border, no coloured rim: the game draws the grade frame. Do not add parts that change the outline: no new spikes, guards, blades, rails, scopes, gems standing proud, ribbons, tassels, chains, wings, auras, smoke or sparks. It must read at 64 px in a shop grid and at 32 px in a backpack row as the same item as the attached one, one grade higher.
The maker's signature parts are:
```

**Avoid in every grade picture:** a changed outline, a different weapon of the same family, a coloured border or glow ring, a gem or crystal stuck on, any lettering, a light that spills past the outline.

## Base prompt U: a unique (new painting)

**Attach:** two or three approved gear paintings of the unique's family (the silhouette references: for example `art/icons/gear/weapon-adamantile_greatsword.png` for a great blade), `art/icons/gear/weapon-afterword.png` (the first unique), and `art/portraits/world/new-faces/orren-vask.png` (brushwork). The monoline icon of the family's standard form (`art/icons/weapons/<id>.svg`, `art/icons/armour/<id>.svg`) is the silhouette reference.

**Size / background:** 1024 x 1024 PNG with alpha, the object inside the central 80 to 85%; frame-free (the game draws the Unique frame).

```
Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss. One single object, three-quarter view, lit from the upper left, with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene. Fully transparent background, square 1024 x 1024 PNG with alpha; the object fills about 80% of the canvas, about 100 px of clear margin on every side. No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands and no figures. Everything is invented: never a recognisable real-world make, model or emblem. This is a unique item, one of a kind: it keeps the silhouette of its family so that at 32 px it still reads as that kind of weapon or armour, and it carries one story detail and one impossible material, painted with the richness of an heirloom, not the gilding of a parade piece. One accent colour (given below), as a muted local paint or a contained light inside the outline, never a bloom. The silhouette must be bold and readable at 64 px in a shop grid and 32 px in a backpack row. The item:
```

---

# A. The grade method

## A1. What the five grades must read as (the rule every block follows)

The grades climb by one visible step each, and each step **keeps what the step below added**, so the order reads without a label. Read at 64 px on `#10151F`, the five side by side must show one signal growing:

| Grade (data key) | What changes | What it reads as at 64 px |
| --- | --- | --- |
| Standard (`standard`) | The approved painting, untouched: honest wear | The master |
| Fine (`fine`) | Wear removed, edges freshly bright, finish even; **one thin engraved (or stitched) line** along the main surface | The same object, cleaner and a step lighter, one fine line |
| Masterwork (`masterwork`) | That line becomes **an inlay in the item's accent colour** (bright brass where the item has no accent); finer materials in the same shapes; exact edges | One continuous coloured stripe added |
| Relic (`relic`) | Heirloom age: **warm deep patina**, the inlay now old gold, **one small flush gilt ornament** at the focal fitting, **one old repair** that tells a story | The darkest, warmest of the five, one gold point |
| Celestial (`celestial`) | **Pale, unmarked material**; the inlay line and one seam give **a faint contained ivory-gold light from inside**, nothing past the outline | The lightest of the five, one lit line |

**What never changes, at any grade:** the silhouette, every part and its position, proportions, camera, pose, scale and margins; the maker's signature (Hellraiser slabs, spikes and brakes; Lumeri lancets and censers; Adamantile plates and crests; Science Team core windows; Legion plain shapes; Ork nails and jags; Kemizuchi lacquer; Central City clean lines); the place of the faction accent (it may become richer or paler, never move or vanish); a focus glove's lens or core window and its ink colour; the ammunition, magazine, drum or belt shape. A grade is never a frame, never a tint over the whole object, never a different item.

## A2. The keep line (one per item)

After base prompt G, paste the item's keep line: what makes it **this** item. For the 73 painted items, it is the item's **Silhouette feature** and **Materials and accent** text from `art/briefs/GPT-PROMPTS-2026-11-13-gear.md` section 3 (by its number), checked against the approved painting (where the painting differs from that prompt, describe the painting: the painting wins). For a new form, it is its own base prompt's silhouette line once its Standard is approved. The worked examples in section B show two keep lines written in full.

## A3. The grade blocks, by item class

Paste the block of the item's class and grade after its keep line. Where a class says "the focal fitting", it means the part the block names for it.

### A3.1 Blades: knives, swords, sabres, great blades, Ork cutters, throwing knives, `afterword`

Change sits on: the flat of the blade along the spine or fuller, the edge, the guard (the bolster or collar where there is no guard), the grip wrap, the pommel.

**Fine**
```
Grade: Fine. The same blade, newly kept. The edge is freshly honed into one clean bright line along its whole length; the flat is polished so the old scratches are gone and the steel reads one step lighter; the grip wrap is tightened and clean; the guard and pommel are cleaned to a soft shine. Add one thin engraved line running along the spine or the fuller from the guard toward the point, no wider than the edge highlight. Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Lay a narrow inlay of the item's accent colour (bright brass if it has no accent) into the engraved line, so that it reads as one continuous coloured stripe along the blade. Re-make the guard and pommel in a finer material in exactly the same shapes, with sharper edges and a deeper polish; the grip wrap becomes a richer, darker leather or cord in an even pattern; the steel shows a faint, fine forging pattern. Exact edges everywhere, no wear, a calm sense of quality.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay line. Age it as an heirloom: the steel darkens to a warm deep patina (blued brown, oiled, never rust), the inlay line turns to dull old gold, and the guard (or the collar) carries one small raised gilt ornament set flush inside its outline. Add one old repair that tells a story: the grip rewrapped in an older cord of a different colour, or a small riveted collar mended where blade meets guard. The edge is still bright: it is old and loved, not neglected.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay line and the ornament's place. The blade and its fittings become a pale, unmarked, almost pearl-ivory material with no scratch, patina or tool mark; the grip wrap is ivory cord. The inlay line and the seam where blade meets guard give a faint, contained ivory-gold light from inside, a lit line no wider than the inlay; nothing spills past the outline: no bloom, no halo, no rays, no sparks. As if made by someone with nothing to fear.
```

### A3.2 Hafted: axes, hammers, polearms, `ork_rip_saw`

Change sits on: the cheek of the head (for the rip saw, the side of the engine casing), the cutting edge or striking face, the socket where head meets haft, the haft and its bands, the butt cap.

**Fine**
```
Grade: Fine. The same weapon, newly kept. The head is cleaned of grime, its cutting edge or striking face bright; the haft is oiled smooth, its bands and wraps tightened. Add one thin engraved line on the cheek of the head that follows the head's own outline a little inside it (on the rip saw, along the side of the engine casing). Nothing else is added.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the engraved line on the head with the item's accent colour (bright brass if it has no accent), so the head carries one clear coloured stripe. The haft becomes a finer, darker, straight-grained wood (or a finer steel tube where it is metal), with two flat metal strips laid along it below the head, flush with its surface; the butt cap and the socket are re-made in the same shapes with crisp edges. Exact edges, no wear.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The head darkens to a warm deep patina, the inlay to dull old gold, and the socket where head meets haft carries one small flush gilt ornament ring. Add one old repair that tells a story: the haft spliced near the grip and bound with old cord, or a cracked cheek held by two hand-set rivets. The edge or face is still bright and true.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay and the ornament's place. The head turns to a pale, unmarked pearl-ivory metal, the haft to a pale ivory wood without a knot or flaw. The inlay line on the head and the seam of the socket give a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays, no sparks.
```

### A3.3 Guns: pistols, revolvers, SMGs, rifles, shotguns, the heavies

Change sits on: the largest flat side of the slide or receiver, the grip panels or stock, the trigger, hammer and pins, the muzzle. The magazine, drum, belt, cylinder and any fuel or core part keep their shape; a core window or pilot flame keeps its own colour.

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

### A3.4 Bows and crossbows

Change sits on: the face of the limbs (the prod on a crossbow), the riser or grip, the nock tips, the string, the crossbow's stock.

**Fine**
```
Grade: Fine. The same bow, newly kept. The limbs are smoothed and oiled, the sinew or cord wraps fresh, the string new and taut; on a crossbow the prod is polished and the stock clean. Add one thin carved line along the face of each limb (along the side of the stock on a crossbow). Nothing else is added. No arrow, no bolt unless the Standard has one.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the carved line with the item's accent colour (bright brass if it has no accent), one clear stripe along each limb or along the stock. The nock tips are capped in polished horn or brass, flush with the limb ends; the grip is wrapped in fine dark leather in an even pattern; the prod and metal fittings are crisp and bright.
```

**Relic**
```
Grade: Relic. Keep the shape and the inlay. The wood darkens to a deep warm sheen with age, the inlay to dull old gold, and the grip carries one small flush gilt ferrule. Add one old repair that tells a story: a limb bound with old sinew at one point, or a crossbow stock pinned with a brass plate. The string is darker and old but taut.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the inlay and the ferrule's place. The limbs and stock become a pale ivory wood with no grain flaw, the string a pale silk, the metal pearl-ivory. The inlay line gives a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays, no sparks.
```

### A3.5 Gloves and foci: striking gloves, wraps, knuckledusters, strikers, mitts, the servo fist; the four focus gloves and the quiver only if Leon says yes (question 8)

Change sits on: the knuckle plate or bar, the back of the hand, the stitched seams, the cuff and its buckle. **A focus glove's lens or core window keeps its own ink colour and its own glow at every grade**; the grade's light runs only in the stitched line, never in the lens.

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

Change sits on: the face, the rim, the boss, the viewport frame or the boards. Front view as the Standard. Never heraldry, never a symbol on the face.

**Fine**
```
Grade: Fine. The same shield, newly kept. The dents are hammered out, the face refinished evenly in its own colour, the rim bright, the straps clean. Add one thin engraved line running just inside the rim all the way round. Nothing else is added; no emblem on the face.
```

**Masterwork**
```
Grade: Masterwork. Keep everything of the Fine grade. Inlay the rim line with the item's accent colour (bright brass if it has no accent), a clear coloured ring just inside the rim. The rivets are polished brass; the face is a finer material in the same shape (planed close-fitted boards, or evenly painted steel with crisp edges); the viewport or boss is re-made with sharp edges. Still no emblem.
```

**Relic**
```
Grade: Relic. Keep the shape and the rim inlay. The face takes a warm, deep, battle-old patina, the inlay turns to dull old gold, and a flush gilt ring is set around the boss or the centre of the face. Add one old repair that tells a story: a riveted patch plate over an old breach, or one board replaced with a darker plank.
```

**Celestial**
```
Grade: Celestial. Keep the shape, the rim inlay and the ring's place. The face becomes a pale, unmarked pearl-ivory, the rim and rivets the same. The rim inlay gives a faint, contained ivory-gold light from inside, nothing past the outline: no bloom, no halo, no rays.
```

### A3.7 Armour, by slot

Armour shows at 36 to 88 px, smaller than weapons: lean on the value change (Fine a step lighter, Relic clearly darker and warmer, Celestial clearly pale). A pair (gloves, boots, greaves) gets the same change on both pieces, mirrored. Paste the grade block, then the slot line from the table.

| Slot | Family | The focal part (where the line, the inlay, the ornament and the repair go) |
| --- | --- | --- |
| head | Helmets | the brow rim of the shell; the ornament at the chin-strap rivet |
| head | Hoods | the hood's front edge; the ornament at the throat clasp |
| head_accessory | Optics | the rings around the lenses; the ornament at the strap mount (the lens glass keeps its colour) |
| head_accessory | Respirators | the cheek plates around the filters; the ornament at the strap buckle (the lenses keep their colour) |
| torso_outer | Vests (Light, Medium, Heavy) | the top edge of the chest plate or the collar; the ornament at the front fastening |
| torso_outer | Plate | the gorget or collar edge; the ornament at the crest or the centre of the chest |
| inner_torso | Undershirts | the central seam (quilted pieces) or the curved top edge (the plate); the ornament at the collar |
| lower_torso | Belts | the upper edge of the belt; the ornament on the buckle |
| legs | Legwear | the outer seam (trousers) or the knee-cup rim (greaves); the ornament at the knee |
| hands | Worn gloves | across the back of the hand; the ornament at the cuff |
| footwear | Boots | the ankle collar and the toe cap; the ornament at the top lace hook or the ankle plate |

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

---

# B. Worked example: the proof sheet (8 pictures)

The proof sheet of section 4.6, item 3: `katana` and `service_pistol` (both approved re-paints) at Fine, Masterwork, Relic and Celestial. It decides whether the generator holds the silhouette across a set. Each prompt below is complete when pasted after base prompt G (it already holds the keep line and the grade block).

## B1. `katana`: Katana (blade class)

- **Standard:** `art/icons/gear/weapon-katana.png`, exists, **Leon's pick: do not regenerate it**. It is the attachment for all four grades.
- **Shows in:** backpack, shop grid, loot card, the Forge's grade step, the inspect view (the 1024 master), by the instance's grade
- **Keep line (from the painting):** a long single-edged blade with a gentle curve, lying on the diagonal from the pommel at lower left to the point at upper right; a pale wavy temper line along the edge; a round brass guard with a short brass collar; a long grip in dark diamond-braided wrap; a flat round brass pommel cap. The accent is the brass of the fittings.

### B1.1 `weapon-katana--fine.png`: Katana, Fine

- **Save as:** `art/icons/gear/weapon-katana--fine.png`
- **At icon size it must read as:** the same katana, cleaner and a step lighter, one fine line on the blade.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Fine. The same blade, newly kept. The edge is freshly honed into one clean bright line from collar to point; the flat is polished so the dull mottling is gone and the steel reads one step lighter, the wavy temper line crisper; the braided wrap is tightened, every diamond even; the brass guard, collar and pommel cap are cleaned to a soft shine. Add one thin engraved line running along the spine from the collar toward the point. Nothing else is added.
```

### B1.2 `weapon-katana--masterwork.png`: Katana, Masterwork

- **Save as:** `art/icons/gear/weapon-katana--masterwork.png` (attach the Standard and the approved Fine)
- **At icon size it must read as:** the Fine katana with one bright brass stripe along the spine.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Masterwork. Keep everything of the Fine grade. Lay a narrow inlay of bright polished brass into the engraved line along the spine, one continuous stripe from collar to near the point. The round guard and the pommel cap are re-made in the same shapes in a deeper, richer brass with crisp edges; the grip wrap becomes a finer, darker cord in a tight even diamond pattern; the steel shows a faint, fine folded forging pattern under the temper line. Exact edges, no wear.
```

### B1.3 `weapon-katana--relic.png`: Katana, Relic

- **Save as:** `art/icons/gear/weapon-katana--relic.png` (attach the Standard and the approved Masterwork)
- **At icon size it must read as:** the darkest, warmest katana of the five, one gold point at the guard.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Relic. Keep the shape and the inlay along the spine. The blade darkens to a warm deep oiled patina, blued brown, the temper line still pale and the edge still bright; the spine inlay turns to dull old gold; the round guard carries one small raised gilt ornament set flush in its face, a single curling wave. The grip is rewrapped in an older cord of a faded deep red, its diamonds worn smooth by a long life of hands. It is an heirloom, not a ruin: no rust, no chips.
```

### B1.4 `weapon-katana--celestial.png`: Katana, Celestial

- **Save as:** `art/icons/gear/weapon-katana--celestial.png` (attach the Standard and the approved Relic)
- **At icon size it must read as:** the lightest katana of the five, one lit line along the spine.

```
The maker's signature parts are: a long single-edged blade with a gentle curve on the diagonal from the pommel at lower left to the point at upper right, a pale wavy temper line along the edge, a round brass guard with a short brass collar, a long grip in dark diamond-braided wrap, a flat round brass pommel cap.
Grade: Celestial. Keep the shape, the spine inlay and the wave ornament's place on the guard. The blade becomes a pale, unmarked pearl-ivory steel with the temper line as a faint silver wave; the guard, collar and pommel cap become pale gold-ivory; the grip is wrapped in ivory cord in the same diamond pattern. The spine inlay and the seam where the blade meets the collar give a faint, contained ivory-gold light from inside, a lit line no wider than the inlay. Nothing spills past the outline: no bloom, no halo, no rays, no sparks.
```

## B2. `service_pistol`: Service pistol (gun class)

- **Standard:** `art/icons/gear/weapon-service_pistol.png`, exists, an approved re-paint: **do not regenerate it**. It is the attachment for all four grades.
- **Shows in:** backpack, shop grid, loot card, the Forge's grade step, the inspect view, by the instance's grade
- **Keep line (from the painting):** side profile, muzzle to the right; a squared pale-grey steel slab slide with three slanted grip cuts at the rear, an open ejection port showing a brass round, a chamfered front end; a flat grey frame with a rounded trigger guard and a curved brass trigger; a small brass slide-stop lever and one brass pin above the trigger; blue-grey grip panels held by two brass screws; a short flat magazine base plate under the grip. The accent is the Central City blue-grey `#5394AC` of the grip panels.

### B2.1 `weapon-service_pistol--fine.png`: Service pistol, Fine

- **Save as:** `art/icons/gear/weapon-service_pistol--fine.png`
- **At icon size it must read as:** the same pistol, cleaner and a step lighter, one fine line along the slide.

```
The maker's signature parts are: side profile, muzzle to the right; a squared pale-grey steel slab slide with three slanted grip cuts at the rear, an open ejection port showing a brass round, a chamfered front end; a flat grey frame with a rounded trigger guard and a curved brass trigger; a small brass slide-stop lever and one brass pin above the trigger; blue-grey grip panels held by two brass screws; a short flat magazine base plate.
Grade: Fine. The same gun, refinished. The slide and frame have an even, unscratched finish, a step lighter, the slide's edges and the muzzle crown bright; the blue-grey grip panels are clean with their scuffs gone; the brass trigger, lever, pin and screws are clean. Add one thin engraved line along the side of the slide, just under and parallel to its top edge, from the grip cuts to the front chamfer. Nothing else is added.
```

### B2.2 `weapon-service_pistol--masterwork.png`: Service pistol, Masterwork

- **Save as:** `art/icons/gear/weapon-service_pistol--masterwork.png` (attach the Standard and the approved Fine)
- **At icon size it must read as:** the Fine pistol with one blue-grey stripe along the slide.

```
The maker's signature parts are: side profile, muzzle to the right; a squared pale-grey steel slab slide with three slanted grip cuts at the rear, an open ejection port showing a brass round, a chamfered front end; a flat grey frame with a rounded trigger guard and a curved brass trigger; a small brass slide-stop lever and one brass pin above the trigger; blue-grey grip panels held by two brass screws; a short flat magazine base plate.
Grade: Masterwork. Keep everything of the Fine grade. Inlay the engraved line on the slide with Central City blue-grey #5394AC enamel, one continuous stripe from the grip cuts to the front chamfer. The grip panels are re-made in exactly the same shape in a deeper, polished blue-grey stone-like polymer; the trigger, lever, pin and screws are bright polished brass; every edge of slide and frame is machined crisp, the grip cuts sharp. No wear.
```

### B2.3 `weapon-service_pistol--relic.png`: Service pistol, Relic

- **Save as:** `art/icons/gear/weapon-service_pistol--relic.png` (attach the Standard and the approved Masterwork)
- **At icon size it must read as:** the darkest, warmest pistol of the five, one gold point on the slide.

```
The maker's signature parts are: side profile, muzzle to the right; a squared pale-grey steel slab slide with three slanted grip cuts at the rear, an open ejection port showing a brass round, a chamfered front end; a flat grey frame with a rounded trigger guard and a curved brass trigger; a small brass slide-stop lever and one brass pin above the trigger; blue-grey grip panels held by two brass screws; a short flat magazine base plate.
Grade: Relic. Keep the shape and the slide stripe. The steel darkens to a warm, deep, oiled blued-brown patina; the blue-grey grip panels are darkened and worn smooth where a palm sat for decades; the slide stripe turns to dull old gold, and a small flush panel of engraved scrollwork (no letters, no figures) sits on the slide just behind the ejection port. One old repair: the lower grip screw replaced by a plain steel one that does not match the brass. It still works perfectly: no rust, no chips.
```

### B2.4 `weapon-service_pistol--celestial.png`: Service pistol, Celestial

- **Save as:** `art/icons/gear/weapon-service_pistol--celestial.png` (attach the Standard and the approved Relic)
- **At icon size it must read as:** the lightest pistol of the five, one lit line along the slide.

```
The maker's signature parts are: side profile, muzzle to the right; a squared pale-grey steel slab slide with three slanted grip cuts at the rear, an open ejection port showing a brass round, a chamfered front end; a flat grey frame with a rounded trigger guard and a curved brass trigger; a small brass slide-stop lever and one brass pin above the trigger; blue-grey grip panels held by two brass screws; a short flat magazine base plate.
Grade: Celestial. Keep the shape, the slide stripe and the scroll panel's place. Slide and frame become a pale, unmarked pearl-ivory metal; the grip panels are ivory with a faint trace of blue-grey; the trigger, lever, pin and screws are pale gold. The slide stripe and the edges of the ejection port give a faint, contained ivory-gold light from inside; the brass round in the port stays brass. The muzzle stays dark: no light from the barrel, nothing past the outline: no bloom, no halo, no rays, no sparks.
```

---

# C. Order, checklist and count

## C1. Batch order

1. **Approve the bases.** Every grade set is built on an approved Standard; a base due a repaint is repainted first, or its set is wasted (section 4.6, item 4).
2. **The proof sheet** (section B: 8 pictures). Leon checks it against the checklist below. If the generator does not hold the silhouette, stop and report before any other set.
3. **Grade sets of the 73 painted items** (292 pictures, 8 of them the proof sheet), one sheet per item, by class: guns (the starting-kit guns first: `decrkm_smg`, `hellraiser_service_rifle`, `drifter_revolver`; then lines G1 to G12; the five heavies last), blades, hafted, gloves, bows, shields, armour (body classes first, then slot by slot).
4. **The 6 new shield bases** (safe now, section 4.6), then their grades.
5. **The other 50 new bases and their grades** only after Leon rules the family tables (section 4.8, questions 3 to 6): each new base approved alone first, then its four grades.
6. **Uniques** (section D) when Leon answers question 7; they have no grade set.

## C2. Checklist per sheet (one item, five grades side by side)

1. **Same weapon?** Lay each grade over the Standard at 50% opacity: the outlines match; every part is in the same place; the number of parts is the same (count the screws, the bands, the rivets). A moved part or a new outline is a failed pick.
2. **Readable at 64 px?** Scale the five to 64 px on `#10151F`, then to 32 px: all five read as the same item; Fine's line, Masterwork's stripe, Relic's gold point and Celestial's lit line are each still visible at 64 px.
3. **Grade order obvious without the label?** Shuffle the five at 64 px and put them in order by eye: lighter-and-clean, then a coloured stripe, then dark-warm-gold, then pale-and-lit. If two can be swapped, push the weaker step further.
4. **Rules kept:** transparent background, the Standard's margins, no frame or coloured rim, no text or symbol, the Celestial light inside the outline, a focus's lens colour unchanged, the faction accent in its place.
5. **Sheet consistency across a family:** the three forms of one family at the same grade look like the same workshop's work (the same inlay width, the same patina warmth).

## C3. The count (S1, section 4.4)

129 graded items x 5 grades = 645 pictures; 73 Standards exist; **572 new**: 56 new bases + 516 grade pictures (129 x 4). The count moves with the family tables, which are not ruled.

| Class (block) | Graded items | Painted today | New bases | Grade pictures (x 4) | New pictures |
| --- | --- | --- | --- | --- | --- |
| Blades (A3.1): 7 blade families, `afterword`, `throwing_knives` | 23 | 9 | 14 | 92 | 106 |
| Hafted (A3.2): axes, polearms, hammers, `ork_rip_saw` | 10 | 6 | 4 | 40 | 44 |
| Gloves (A3.5): 2 glove families, `hellraiser_servo_fist` | 7 | 6 | 1 | 28 | 29 |
| Guns (A3.3): 12 maker lines, 5 heavies | 41 | 26 | 15 | 164 | 179 |
| Bows (A3.4): bows, crossbows | 6 | 4 | 2 | 24 | 26 |
| Shields (A3.6): Guard, Strike, Ward | 9 | 3 | 6 | 36 | 42 |
| Armour (A3.7): 11 families | 33 | 19 | 14 | 132 | 146 |
| **All** | **129** | **73** | **56** | **516** | **572** |

Armour by slot: head 6 items (2 painted), head accessory 6 (2), outer torso 6 (5), inner torso 3 (2), belts 3 (2), legs 3 (2), hands 3 (2), boots 3 (2). Not counted: the 4 foci and the quiver (question 8: +20 if yes), and the 23 uniques (section D).

---

# D. Uniques (section 4.5: 23 new paintings, PROPOSED)

The list gives a count, not names: 24 uniques (8 melee with Afterword the first, already painted; 8 guns and bows; 3 shields; 5 armour), **23 new paintings**, one each, no grade set, the Unique frame drawn by Claude as UI, the 23 line icons by Claude. Only the three shields come with concepts (Leon's). So below: the brief template, Leon's three shields (names PROPOSED), and 8 PROPOSED concepts. All for Leon to rule; the remaining 12 are concepted after he does.

## D1. The unique brief template (what every unique must show)

A unique is about as strong as a Relic and has its own passive. Its painting:

1. **Keeps its family's silhouette.** At 32 px it reads as a sabre, a revolver, a pavise: never a new kind of object. Its form (Dexterity / hybrid / Strength; close / standard / long; light / standard / heavy) is the one its stats use.
2. **Carries one story detail**: a thing somebody did to it (a mend, a keepsake fixed on, a record scratched in), small, inside the outline, legible at 256 px and felt at 64.
3. **Is made of one impossible material**: one part made of something that cannot be a material (still water standing upright, a storm held in a cage, a fire that does not burn), the part that shows its passive.
4. **Takes one accent** from its maker or its patron (faction accents: `GPT-PROMPTS-2026-11-13-gear.md` section 1; patron accents: `data/patrons.json` `accent`), as paint or as a contained light inside the outline.
5. **Is richer than a Standard, not a Celestial.** Heirloom richness; no pale-and-lit look (that is the Celestial grade's), no frame, no text.
6. Ties to one faction or one patron of `docs/lore/` (`Factions.md`; the patrons in `docs/design/blessing-2.0-spec.md`).

**Afterword** (`afterword`, `art/icons/gear/weapon-afterword.png`): the first unique, painted. REUSE, nothing to draw; it is also counted among the graded items (section C3).

## D2. Leon's three shields (concepts from the list; names and ids PROPOSED)

### D2.1 `return_clause` (PROPOSED): Return Clause, Ward-family shield (throws back part of a spell)

- **Save as:** `art/icons/gear/shield-return_clause.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Ward family, the light form (the deflector); Science Team (Mind cyan `#4FC8DF`)
- **Does (Leon's concept):** when a spell hits its bearer, part of it is thrown back at the caster.
- **At icon size it must read as:** a light, round-ish shield whose face is a pane holding one bright mark.

```
A unique Ward shield made by the Science Team, front view, upright, about 85% of the canvas height: a light, slightly convex deflector, wider than tall, with a thin hexagon-cut steel frame and a short grip bar showing at one edge. Its face is the impossible material: a sheet of still water standing upright inside the frame, flat and unbroken, reflecting a cool pale sky, with no drip at the edges. Suspended inside the water is one caught spell: a single bright abstract glyph stroke in Mind cyan #4FC8DF, as if it had struck and been held, ready to go back the way it came. The story detail: a burn-black scorch line on the frame's upper edge where the first spell it ever turned grazed it, left unrepaired on purpose. Precise straight lines, pale ceramic and dark steel; the only accent is the cyan of the glyph, contained inside the water.
Avoid: a mirror, a reflected face or figure, letters or numerals as the glyph, a round buckler shape, sparks or a glow past the frame.
```

### D2.2 `outpost_wall` (PROPOSED): Outpost Wall, Guard-family shield (plants as lasting cover)

- **Save as:** `art/icons/gear/shield-outpost_wall.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Guard family, the heavy form (the pavise silhouette); the Thousand World Legion's Outposts (no accent: anonymous olive-grey, one pale stripe)
- **Does (Leon's concept):** planted, it stays as cover for the rest of the fight.
- **At icon size it must read as:** a tall planted board whose foot has taken root.

```
A unique Guard shield of the Thousand World Legion's frontier outposts, front view, standing on its ground edge, about 85% of the canvas height: a tall, wide board shield with a centre ridge and a folded prop leg showing behind it, in olive-grey painted steel over dark boards, plain and mass-produced, one faded pale stripe across the top. The impossible material: its foot and its prop leg have grown roots of dark iron, thick and coiled tight against the bottom edge, gripping nothing, as if the shield took root the first night it was planted and never quite let go; the roots stay inside a neat silhouette at the base. The story detail: a long row of short scratched notches along the right edge, one for each night it held a line, the newest still bright. Heavy, dented, cared for.
Avoid: soil, grass or a ground plane, numerals for the notches, an emblem, a riot-shield viewport, leaves.
```

### D2.3 `grudge_plate` (PROPOSED): Grudge Plate, Strike-family shield (stores soaked damage for a Slam)

- **Save as:** `art/icons/gear/shield-grudge_plate.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Strike family, the standard form (the boss shield); Hellraiser Divisions (oxide red `#CC2435`)
- **Does (Leon's concept):** the damage it soaks is stored and released in the bearer's next Slam.
- **At icon size it must read as:** a round shield with a big central boss and dents that glow.

```
A unique Strike shield of the Hellraiser Divisions, front view, upright, about 85% of the canvas height: a round heavy steel shield with a large, deep central boss shaped like a short blunt pressure bell, a slab-cut rim, and three short trench spikes standing from the rim at the top. The impossible material: the face is covered in deep dents from blows it has taken, and every dent holds the heat of the blow like a banked coal, a deep oxide red #CC2435 glow sitting inside each dent only, brightest in the newest, as if the shield is keeping count and waiting to give it all back. The story detail: one dent near the rim has been ringed with a hand-scratched circle, the one blow its owner swore to return. Dark parkerised steel, hard scratches at the edges.
Avoid: flames, smoke, sparks, a glow outside the dents, a skull or emblem, a kite or rectangular shape.
```

## D3. Eight PROPOSED concepts (for Leon to rule)

Spread over melee (3), guns (3) and armour (2); the shields are Leon's three above. Each passive is a direction in words for the designer, not a rule: no numbers until a spec gives them.

### D3.1 `last_sentence` (PROPOSED): Last Sentence, great blade

- **Save as:** `art/icons/gear/weapon-last_sentence.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Great blades, the Strength form (the `adamantile_greatsword` silhouette); the Adamantile Brigade, sworn to Holy Father Nerukhan (patron accent `#E9D6A2` with Brigade gilt)
- **Passive (PROPOSED direction):** its blows land harder on a foe the Chaplain has Judged.
- **At icon size it must read as:** the plated greatsword, with a pale lit strip down the middle of the blade.

```
A unique two-handed greatsword of the Adamantile Brigade, on the 45 degree diagonal, nearly corner to corner, the blade as the focal point: a wide flat blade, an oversized plate guard and a crest on the pommel, pale steel with gilt. The impossible material: the centre of the blade, along the fuller, is a strip of stilled daylight, a pale warm ivory-gold #E9D6A2 that the guard can be seen through, solid as glass and quietly lit from inside, bounded exactly by the fuller's edges. The story detail: a narrow reliquary slot at the base of the blade holding a rolled verdict sealed with blank wax at both ends, the seal cracked once and remade. Heirloom richness, heavy and solemn.
Avoid: letters on the scroll or the seals, a halo or rays, a cross, flames, wings on the guard, a glow past the blade's edge.
```

### D3.2 `grandmothers_teeth` (PROPOSED): Grandmother's Teeth, Ork cutter

- **Save as:** `art/icons/gear/weapon-grandmothers_teeth.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Ork cutters, the hybrid form (the `ork_machete` silhouette); the Orks (dirty ochre daubs and rust)
- **Passive (PROPOSED direction):** the edge grows back: it never dulls, and its cuts leave the target Bleeding.
- **At icon size it must read as:** the jagged wide machete, its edge a row of big teeth.

```
A unique Ork machete, on the 45 degree diagonal, handle bottom-left: a wide, uneven cleaver blade with a jagged back and a belly, a grip of oily leather with nails driven through it, rust and dirty ochre paint daubs. Instead of an edge, the belly of the blade is set with a row of big curved teeth hammered in like nails. The impossible material: the teeth are still growing; the one at the tip is longer than the rest, and at the back of the blade the pale roots of two teeth push through the steel like new shoots. The story detail: one tooth near the grip is missing, replaced by a bent iron bolt wired into the gap with care no Ork admits to. Ugly, heavy, a family heirloom.
Avoid: gore or blood, a skull, a jaw or a mouth shape, a chainsaw, anything that leaves the blade's silhouette.
```

### D3.3 `last_crossing` (PROPOSED): Last Crossing, polearm

- **Save as:** `art/icons/gear/weapon-last_crossing.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Polearms, the hybrid form (the `glaive` silhouette); the Toll-Keeper (patron accent `#79BDB6`)
- **Passive (PROPOSED direction):** a foe it brings down can be stabilised instead of killed, a mercy the Toll-Keeper counts.
- **At icon size it must read as:** a glaive whose blade is an oar's blade, darkly wet.

```
A unique glaive belonging to the Toll-Keeper's ferrymen, on the 45 degree diagonal, nearly corner to corner: a long pole of dark weathered wood, and at its head a curved single-edged blade that is plainly an old oar's blade, sharpened along its curved side, with a small hook at its base. The impossible material: the oar blade is coated in a film of black water that never drips, still and glassy, holding a pale teal #79BDB6 reflection of a sky that is not there; no drop leaves it. The story detail: a single old coin wedged into a slot cut in the socket where blade meets pole, and the hasp of a coin box nailed beside it. Quiet, patient, oilskin-dark.
Avoid: a skull, a scythe, drops or splashes, a boat, a hooded figure, a glow past the blade.
```

### D3.4 `in_triplicate` (PROPOSED): In Triplicate, Legion automatic

- **Save as:** `art/icons/gear/weapon-in_triplicate.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** G4 Legion automatics, the standard form (the `legion_bullpup` silhouette); the Quartermaster (patron accent `#8B9F47`), on Legion issue
- **Passive (PROPOSED direction):** its first reload of a fight costs nothing: the paperwork was filed in advance.
- **At icon size it must read as:** the stubby bullpup, its magazine pale and flat as folded paper.

```
A unique Thousand World Legion bullpup rifle, on a slight diagonal, muzzle up and right: a stubby, plain, mass-produced body with the magazine behind the grip, a carry handle and a flat stock, olive-grey polymer and bare steel. The impossible material: the magazine is a crisp folded paper form, pale and flat-edged with sharp creases, holding a stack of brass rounds at its lips as firmly as steel. The story detail: three blank wax seals pressed in a neat row on the receiver's side, and the stock wrapped in a long strip of ledger tape bound with wire. Accent: the olive green #8B9F47 of the seals. Dry, orderly, faintly absurd.
Avoid: writing, numbers or stamps with text on the paper or the tape, a barcode, a book, a scope, a glow.
```

### D3.5 `second_thunder` (PROPOSED): Second Thunder, revolver

- **Save as:** `art/icons/gear/weapon-second_thunder.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** G2 Revolvers, the long form (the `frontier_hand_cannon` silhouette); Old Overcast (patron accent `#4E8DD1`), frontier-made
- **Passive (PROPOSED direction):** the last round in the cylinder strikes as Storm and arcs to a foe beside the target.
- **At icon size it must read as:** the thick hand cannon, its cylinder a grey cloud in a cage.

```
A unique frontier hand cannon, side profile turned slightly toward the viewer, muzzle to the right: a very thick short barrel with ported vents on top, a steel slab frame, a plain grip in heavy blued steel. The impossible material: the cylinder is a cage of aged brass bands around a ball of grey storm cloud held perfectly still, a thin vein of Old Overcast blue #4E8DD1 light caught inside it. The story detail: the front sight is a small copper lightning-rod finial, and the grip is wrapped in the cord of an old weather vane, knotted twice. Theatrical and heavy, an heirloom of someone who argued with the sky.
Avoid: lightning bolts leaving the gun, sparks, rain, a beard or face in the cloud, a glow past the cage.
```

### D3.6 `encore` (PROPOSED): Encore, service sidearm

- **Save as:** `art/icons/gear/weapon-encore.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** G1 Service sidearms, the close form (the `parlour_pistol` silhouette); the Laughing Mask (patron accent `#B83243`)
- **Passive (PROPOSED direction):** a miss comes back for an encore: once a fight, a missed shot is rolled again.
- **At icon size it must read as:** the tiny double-barrelled pistol with a red velvet barrel.

```
A unique two-round over-and-under pocket pistol, side profile, muzzle to the right, drawn to fill the frame like a full pistol: two stacked short barrels and a small ornate frame with an ivory grip. The impossible material: the two barrels are rolled stage-curtain velvet in deep red #B83243, hardened like steel, the nap of the velvet still visible, the folds of the curtain running down their length. The story detail: a tiny carved cameo of a grinning mask set in the grip (a carved face shape only, no eyes painted in), and a faded ticket stub tucked under the grip's lower screw. Playful, polished, a little sinister.
Avoid: letters on the ticket, a jester or clown, a real theatre mask emblem, a ribbon hanging loose, confetti.
```

### D3.7 `red_thread_gloves` (PROPOSED): Red Thread, worn gloves

- **Save as:** `art/icons/gear/armour-red_thread_gloves.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** the gear slots, backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Worn gloves, the standard form (between `work_gloves` and `combat_gloves`); the Matchmaker (patron accent `#D879AF`)
- **Passive (PROPOSED direction):** the wearer's first Bond of a fight costs nothing and reaches further.
- **At icon size it must read as:** a pair of gloves joined by one red thread.

```
A unique pair of fitted field gloves, shown side by side as one object, front view, no hands inside: supple dark leather with light padding at the knuckles, neat stitching, short cuffs. The impossible material: one red thread #D879AF that has no end: it runs out of the right glove's index fingertip, loops once across the gap between the pair, and goes into the left glove's cuff, where it is stitched into the seam and comes out again at its fingertip, a single unbroken loop binding the two. The story detail: a small wedding-planner's spool clip fastened at the right cuff, empty of thread, polished by use. Warm, tidy, fond.
Avoid: hearts, a knot shaped like a heart, hands or skin, a loose thread end, a glow, any lettering.
```

### D3.8 `hearth_coat` (PROPOSED): Hearth Coat, vest family (outer torso)

- **Save as:** `art/icons/gear/armour-hearth_coat.png` (PROPOSED id)
- **Mode:** gear painting (base prompt U)
- **Shows in:** the gear slots, backpack, shop, loot card, Forge, inspect view, inside the Unique frame
- **Family and maker:** Vests, the light form (the `armour-torso_class1_light` padded coat silhouette); Mother Ember (patron accent `#ED8A3C`)
- **Passive (PROPOSED direction):** a heal the wearer gives warms the wearer too.
- **At icon size it must read as:** the long quilted coat, its open collar glowing like a hearth.

```
A unique padded coat, front view, laid out as for sale, no wearer: a long quilted coat with a high collar, front toggles and one reinforced shoulder, in dark waxed cloth with brown leather patches, an apron panel tied over the front with a deep pocket. The impossible material: the quilted lining, seen at the open collar and at the turned-back cuffs, is banked embers, glowing a low hearth orange #ED8A3C and never burning the cloth beside it, the glow contained inside the lining. The story detail: flour dusted on both cuffs and a wooden spoon standing in the apron pocket. Homely, warm, worn soft.
Avoid: flames or smoke, a heart, a cross or medical mark, a wearer, a glow past the coat's outline.
```
