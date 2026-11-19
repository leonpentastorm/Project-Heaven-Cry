# GPT prompts, 19 Nov 2026, file 07: shields and armour (the Items 2.0 families, gear paintings)

For the artist, and for GPT.

**20 pictures: 6 shields and 14 armour pieces, all gear paintings (Heavenprint).** Each is painted at all five grades: the Standard master from the prompt here, then Fine, Masterwork, Relic and Celestial image-to-image from the approved master by the method of file 08 (`08-grades-and-uniques.md`, section A3.6 shields and A3.7 armour). Grade files: `<save name stem>--<fine|masterwork|relic|celestial>.png`.

## How to use

One image a prompt. Paste **the style block (below)**, then the entry's prompt, and attach the references named in the entry (every one is in the repo). Save under the file name given in the folder given, do not rename. In-world only: invented shapes, no real-world brands, insignia, religions or characters; no text, letters or numbers in any image.

## Style block: gear painting, shields and armour (paste first)

**Attach, once per session:** the nearest existing painting named in the entry; and for brushwork `art/sprites/objects/tool-rack.png` and `art/sprites/objects/field-lamp.png` (material treatment and edge hierarchy only; their top-down camera does not apply). Palette: `art/style-guide/palette.json`; naming: `art/style-guide/gear-icons.md`.

**Size / background:** 1024 x 1024 PNG with alpha, fully transparent; the object inside the central 90% of the canvas (at least 50 px of clear margin on every side); shields fill about 85% of the canvas height, worn armour pieces about 75 to 80% of the canvas.

> Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss and no uniform digital sharpness. One single object, lit from one side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene. Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha. No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands, no wearer, no figures. Everything is invented: never a recognisable real-world make, model or emblem. The silhouette must be bold and instantly readable first: the icon is shown at 64 px in a shop grid and at 32 px in a backpack row, so keep detail on one or two focal edges and make the shape unmistakable when shrunk. Colour: metal in the palette's neutrals (charcoal, steel grey, warm ivory highlights); the faction's accent, where given, is the single accent, a muted local paint, not a glow. Standard finish, with honest wear; no coloured border or frame. Shields are shown front view, upright, about 85% of the canvas height. Worn armour fills about 75 to 80% of the canvas and is shown on its own, floating, front or three-quarter view as if laid out for sale (pairs side by side as one object), no wearer; weight shows in the thickness. The object:

**Avoid in every picture:** a wearer, a hand or arm inside the piece, heraldry or a crest that reads as lettering, a glow, a coloured frame, a cast shadow, a second object.

**Accents used below:** Adamantile Brigade pale steel with gilt and brass-orange `#F68A38`; Science Team cyan `#4FC8DF` in windows only; Central City ivory with blue-grey `#5394AC`; Kemizuchi lacquer black with crimson `#86234E`; Thousand World Legion olive-grey, no accent; Frontier and unbranded: bare steel, walnut, leather, no accent.

---

# Shields (all carried in one hand; the heavy forms must look heavy)

## 1. `spiked_buckler`: Spiked buckler (shield, light)

- **Save as:** `art/icons/gear/shield-spiked_buckler.png`
- **Attach:** `art/icons/gear/shield-buckler.png` (same shape family, add the spike)
- **Shows in:** backpack, shop, Forge, off-hand slot
- **At icon size it must read as:** the buckler's round, with one long spike thrusting out of its middle.

```
A small round steel buckler, front view, upright, a little darker and more battered than a plain one, with a single long tapering spike rising out of its central boss like a nail, and a ring of short rivet-spikes round the rim. A worn leather arm strap shows at one edge. The spike is the whole point of the silhouette: it must read at 32 px as a round plate with a needle in it. Dull steel, scuffs, a dent, nicked spike tip. Accent: none, Frontier.
Avoid: a spear head, a flail, a sun face, a skull, more than one big spike.
```

## 2. `boss_shield`: Boss shield (shield, standard)

- **Save as:** `art/icons/gear/shield-boss_shield.png`
- **Attach:** `art/icons/gear/shield-riot_shield.png` (the standard-weight reference)
- **Shows in:** backpack, shop, Forge, off-hand slot
- **At icon size it must read as:** a mid-size round-cornered shield with one big domed lump in the middle.

```
A medium round-cornered shield of iron-banded dark planks, front view, upright, with one big thick domed steel boss in the middle, as wide as a dinner plate and scuffed bright on its crown from striking things, ringed by heavy rivets. A short rim of steel bands, a wooden face with the grain visible, chips along the edge. The boss must be the largest, brightest shape. Accent: none, Frontier.
Avoid: a spike, a tower shield, a window slit, heraldry, a face.
```

## 3. `ram_plate`: Ram plate (shield, heavy)

- **Save as:** `art/icons/gear/shield-ram_plate.png`
- **Attach:** `art/icons/gear/shield-pavise.png` (heaviest existing shield) and `art/icons/gear/shield-riot_shield.png`
- **Shows in:** backpack, shop, Forge, off-hand slot
- **At icon size it must read as:** a huge thick slab with a blunt wedge prow, plainly the heaviest thing in the row.

```
A massive thick slab of a shield, front view, upright, taller and heavier than a riot shield: a broad rectangular steel plate faced with a wedge-shaped blunt prow ridge down its centre, like the bow of a ship, with great bolted corner plates and dents hammered into the face from impacts. Visibly very thick at the edge (show the slab's depth), a heavy arm strap and a single grip behind. Dark steel with bright worn-metal scars on the ridge. It must look like the heaviest slab a person carries on one arm. Accent: Brigade pale steel with a narrow brass-orange #F68A38 stripe along the ridge.
Avoid: a gun port, a viewport slit like the riot shield, a round shape, a spike, a wearer.
```

## 4. `deflector`: Deflector (shield, light)

- **Save as:** `art/icons/gear/shield-deflector.png`
- **Attach:** `art/icons/gear/shield-buckler.png`
- **Shows in:** backpack, shop, Forge, off-hand slot
- **At icon size it must read as:** a small kite-shaped shield with a cyan-lined window in its middle.

```
A small light shield shaped like a rounded diamond or kite, front view, upright, of smooth pale steel with a slightly convex face, and one narrow hexagonal core window in its centre holding cyan etched lines like a fine circuit, with two fine etched lines running outward from it to the points. Precise straight edges, almost no dents; a thin dark arm strap at one edge. Clean Science Team lines rather than war scars. Accent: Mind cyan #4FC8DF only inside the window and the etched lines.
Avoid: a glow, rays, a mirror shine, a round buckler shape, spikes, any text or rune lettering.
```

## 5. `bulwark_screen`: Bulwark screen (shield, standard)

- **Save as:** `art/icons/gear/shield-bulwark_screen.png`
- **Attach:** `art/icons/gear/shield-riot_shield.png`
- **Shows in:** backpack, shop, Forge, off-hand slot
- **At icon size it must read as:** a tall pale-steel panel with a row of cyan-lined cells, like a fence panel.

```
A tall rectangular panel shield with softly clipped top corners, front view, upright, built as a frame of pale steel holding three stacked hexagonal core windows down its centre line, each with fine cyan etched lines, joined by thin vertical ribs. A narrow dark grip-and-strap behind, a flat steel foot-edge. Clean, machined, a few honest scratches and one dented corner. It is taller than a buckler and plainly lighter than a ram plate: thin, not slab-thick. Accent: Mind cyan #4FC8DF only in the three windows and etched ribs.
Avoid: a viewport slit, a glow, rays, a wedge prow, planks, heraldry.
```

## 6. `barrier_wall`: Barrier wall (shield, heavy)

- **Save as:** `art/icons/gear/shield-barrier_wall.png`
- **Attach:** `art/icons/gear/shield-pavise.png` (the standing heavy shield) and `art/icons/gear/shield-riot_shield.png`
- **Shows in:** backpack, shop, Forge, off-hand slot
- **At icon size it must read as:** the largest shape in the row: a wide wall-panel on a ground edge with a cyan-lined cell grid.

```
A very large, wide wall-of-a-shield, front view, upright, standing on its flat ground edge like a gate leaf: a thick pale steel slab framed by heavy bolted plates, its face set with a two-by-three grid of hexagonal core windows with fine cyan lines, a folded steel prop foot visible at the bottom corners, thick depth at the edge. Rivets the size of coins, a patched dent, a single arm strap and grip behind. Heavier and broader than anything else a person carries. Accent: Mind cyan #4FC8DF only in the windows; Brigade brass-orange #F68A38 trim on the frame.
Avoid: planks (that is the pavise), a wedge prow (that is the ram plate), a viewport slit, glow or beams, a wearer.
```

---

# Armour (14 new forms)

## 7. `assault_helm`: Assault helm (Helmets, heavy)

- **Save as:** `art/icons/gear/armour-assault_helm.png`
- **Attach:** `art/icons/gear/armour-ballistic_helmet.png`
- **Shows in:** backpack, shop, Forge, head slot, character sheet
- **At icon size it must read as:** a closed, crested, full-face helm, clearly heavier than the ballistic helmet.

```
A heavy closed assault helm in three-quarter view, upright: a deep domed pale steel shell with a thick brow ridge, cheek plates meeting under a narrow horizontal eye slit, a short crest ridge along the crown, and a high gorget collar flare at the neck. Gilt trim along the brow, rivets, chipped paint and scuffs at the crest. It is a closed face, no opening for a mouth. Accent: Brigade gilt and a brass-orange #F68A38 trim.
Avoid: an open face (that is the field helmet), a visor cut-out like the ballistic helmet, feathers, horns, a face.
```

## 8. `cowl`: Cowl (hood, light)

- **Save as:** `art/icons/gear/armour-cowl.png`
- **Attach:** `art/icons/gear/armour-torso_class1_light.png` (the waxed-cloth treatment)
- **Shows in:** backpack, shop, Forge, head slot
- **At icon size it must read as:** a soft draped hood shape that tapers down over the shoulders.

```
A soft draped cowl laid out in three-quarter view, standing open as if on an unseen form: a loose dark grey-brown waxed-cloth hood with a deep hollow opening and a short mantle falling over the shoulders in two or three heavy folds, a single wooden toggle at the throat. Plain, worn, patched at the seam, matte. The soft drape is the silhouette. Accent: none.
Avoid: a face, eyes in the hollow, a pointed wizard hood, a hard shell, glow, armour plates.
```

## 9. `hood`: Hood (hood, standard)

- **Save as:** `art/icons/gear/armour-hood.png`
- **Attach:** `art/icons/gear/armour-torso_class1_light.png`
- **Shows in:** backpack, shop, Forge, head slot
- **At icon size it must read as:** a close-fitting hood with a stitched mask panel across the lower face.

```
A close-fitting fitted hood in three-quarter view, upright, of matte charcoal quilted fabric with panel seams that follow the skull, a built-in snug cloth mask panel covering where the lower face would be, held by a strap and a small steel clasp, and thin padded ear flaps. Tidy, professional, worn at the seams. Shapes are clean and close, not draped. Accent: none, with a single thread of Central City blue-grey #5394AC stitching at the seam.
Avoid: a loose cloak hood (that is the cowl), a full black cover (that is the blackout hood), eye holes cut out, a face, glow.
```

## 10. `blackout_hood`: Blackout hood (hood, heavy)

- **Save as:** `art/icons/gear/armour-blackout_hood.png`
- **Attach:** `art/icons/gear/armour-gas_mask.png` (sealed head cover reference) and `art/icons/gear/armour-torso_class1_light.png`
- **Shows in:** backpack, shop, Forge, head slot
- **At icon size it must read as:** a seamless black head-bag shape with a bare slot of lens-darkness, no features.

```
A sealed blackout hood in three-quarter view, upright: a seamless matt black sealed head cover of treated cloth over thin plates, ridged neck collar, a single narrow horizontal band of dark smoked glass for the eyes, light-absorbing, with a short padded mantle collar. Rubberised, no shine, deep charcoal shadows with only a few ivory highlights on the glass band and collar rim. It is the darkest piece in the set. Accent: none.
Avoid: a cloth hood with a visible opening (that is the hood), glowing eyes, a breathing filter (that is the respirator line), a face, a skull.
```

## 11. `spotters_monocle`: Spotter's monocle (Optics, light)

- **Save as:** `art/icons/gear/armour-spotters_monocle.png`
- **Attach:** `art/icons/gear/armour-prescription_glasses.png`
- **Shows in:** backpack, shop, Forge, head-accessory slot
- **At icon size it must read as:** one round lens ring on a short chain with a small side arm.

```
A single brass-rimmed round monocle lying three-quarter view, a thick glass lens with a faint ivory highlight sweep, a small hinged cheek arm on one side and a short fine chain looped beneath it, a tiny knurled adjustment ring on the rim. Delicate and compact, the lens ring being the silhouette. Worn brass, a hairline scratch in the glass. Accent: none.
Avoid: a pair of glasses (that is the prescription pair), two lenses, a strap goggle, a cross-hair drawn on the glass, text.
```

## 12. `sight_visor`: Sight visor (Optics, heavy)

- **Save as:** `art/icons/gear/armour-sight_visor.png`
- **Attach:** `art/icons/gear/armour-night_goggles.png`
- **Shows in:** backpack, shop, Forge, head-accessory slot
- **At icon size it must read as:** a wide curved band with one big lens and a small side lens.

```
A wide wraparound sight visor in three-quarter view, upright: a curved dark steel band with a thick padded brow, one large round lens on the left and a smaller offset lens on a swing-arm at the right, a thick fabric head strap with a steel buckle trailing out of the frame edges. Lenses show a hint of Science Team cyan only in the glass, scuffed grey casing. Heavier and broader than goggles. Accent: Mind cyan #4FC8DF only inside the lenses.
Avoid: two equal round goggle eyes (that is the night goggles), a face, a glowing beam, a helmet, text.
```

## 13. `breather`: Breather (Respirators, light)

- **Save as:** `art/icons/gear/armour-breather.png`
- **Attach:** `art/icons/gear/armour-gas_mask.png`
- **Shows in:** backpack, shop, Forge, head-accessory slot
- **At icon size it must read as:** a soft half mask with one round filter on the side.

```
A light half-face breather in three-quarter view, upright: a soft grey rubber-and-cloth cup shaped for nose and mouth, a single round perforated metal filter canister screwed on at one side, two thin elastic straps trailing, a stitched cloth rim. Small, plain, worn and stained at the filter. It covers the lower face only. Accent: none.
Avoid: a full face with lenses (that is the gas mask), a hose, two canisters, a skull, a face.
```

## 14. `sealed_visor`: Sealed visor (Respirators, heavy)

- **Save as:** `art/icons/gear/armour-sealed_visor.png`
- **Attach:** `art/icons/gear/armour-gas_mask.png`
- **Shows in:** backpack, shop, Forge, head-accessory slot
- **At icon size it must read as:** a smooth hard faceplate with a long lens and a bulky filter pod.

```
A heavy sealed visor in three-quarter view, upright: a smooth hard dark steel faceplate that seals the whole face, a single long curved smoked lens across the eyes in a thick gasket, a bulky cylindrical filter pod low at the chin with a ribbed collar, a gasketed rim round the whole edge and a stout buckled strap system. Much heavier and smoother than the gas mask, no hose. Accent: none, with a thin Brigade brass-orange #F68A38 line on the filter pod ring.
Avoid: a hose and dual canisters (that is the gas mask), an open mouth, a face, a skull, a glowing lens.
```

## 15. `breacher_plate`: Breacher plate (Plate, light)

- **Save as:** `art/icons/gear/armour-breacher_plate.png`
- **Attach:** `art/icons/gear/armour-torso_class4_assault.png` (the next one up)
- **Shows in:** backpack, shop, Forge, outer-torso slot
- **At icon size it must read as:** a plain two-plate chest piece, thinner than the Assault cuirass.

```
A light breacher plate, front view, upright, no wearer: a flat front chest plate and a matching back plate joined at the shoulders by two webbing straps and side buckles, worn grey steel, a pale scuffed band worn across the chest, a small padded collar. No pauldrons, no crest, no gorget: it must read as clearly lighter than the Assault cuirass. Accent: none, Legion olive-grey.
Avoid: pauldrons, gilt, a crest, a high collar, layered plates, a torso shape with arms.
```

## 16. `mesh_undersuit`: Mesh undersuit (Undershirts, standard)

- **Save as:** `art/icons/gear/armour-mesh_undersuit.png`
- **Attach:** `art/icons/gear/armour-padded_undershirt.png`
- **Shows in:** backpack, shop, Forge, inner-torso slot
- **At icon size it must read as:** a long-sleeved shirt shape with a fine diamond mesh and a line down the middle.

```
A long-sleeved mesh undersuit laid out front view, arms slightly out, no wearer: a close garment of fine interlinked dark steel rings that catches light in small ivory flecks, with a quilted grey cloth collar and cuffs and a zip line down the front. The ring-mesh texture is the focal edge. Hangs a little, flexible, worn. Accent: none.
Avoid: quilted diamond seams (that is the padded undershirt), a plate insert, a wearer, a jumpsuit with legs, chainmail armour of a knight.
```

## 17. `rig_belt`: Rig belt (Belts, standard)

- **Save as:** `art/icons/gear/armour-rig_belt.png`
- **Attach:** `art/icons/gear/armour-utility_belt.png`
- **Shows in:** backpack, shop, Forge, lower-torso slot
- **At icon size it must read as:** a belt with a cross strap and a row of squared pouches.

```
A load-carrying rig belt laid out in a loose U in three-quarter view: a wide webbing belt of dark canvas with a quick-release steel buckle, a thin cross-body harness strap rising from it, and a row of squared tough canvas pouches along the front with flap snaps and a loop for a tool, no armour plates. Straps and pouches are the silhouette. Worn, sun-faded, a repaired seam. Accent: none, Legion olive-grey.
Avoid: overlapping steel segments (that is the armoured belt), a holster with a gun, a plain strap with no pouches (that is the utility belt), text.
```

## 18. `field_trousers`: Field trousers (Legwear, standard)

- **Save as:** `art/icons/gear/armour-field_trousers.png`
- **Attach:** `art/icons/gear/armour-runner_trousers.png`
- **Shows in:** backpack, shop, Forge, legs slot
- **At icon size it must read as:** a pair of sturdy trousers with two bold knee patches.

```
A pair of field trousers laid out front view, legs straight and slightly apart as one object: heavy olive-brown canvas with reinforced double-stitched seams, two big rounded knee pad patches in darker padded leather, thigh cargo pockets with buttoned flaps, a webbing belt loop and cuff drawstrings. Stiffer, bulkier and darker than the runner's trousers, with the knee pads as the focal shapes. Accent: none.
Avoid: shin plates and knee cups of steel (that is the greaves), a wearer, shoes, slim running cut, text.
```

## 19. `tactical_gloves`: Tactical gloves (Worn gloves, standard)

- **Save as:** `art/icons/gear/armour-tactical_gloves.png`
- **Attach:** `art/icons/gear/armour-combat_gloves.png`
- **Shows in:** backpack, shop, Forge, hands slot
- **At icon size it must read as:** a pair of fingered gloves, with one finger tip cut away.

```
A pair of tactical gloves laid out side by side as one object, backs up, fingers slightly spread: close-fitting dark grey leather and stretch fabric, a padded reinforced palm, a hook-and-loop wrist strap, a hard but small segmented knuckle guard, and the index fingertip and thumb tip cut open on each glove. Practical, worn through at the fingertips. Smaller and neater than the combat gloves, no heavy plates. Accent: none.
Avoid: large steel knuckle plates (that is the combat glove), a hand inside, a floating hand, a focus glove with a glowing core, text.
```

## 20. `jump_boots`: Jump boots (Boots, standard)

- **Save as:** `art/icons/gear/armour-jump_boots.png`
- **Attach:** `art/icons/gear/armour-field_boots.png`
- **Shows in:** backpack, shop, Forge, footwear slot
- **At icon size it must read as:** a pair of boots with a thick curved spring sole.

```
A pair of jump boots shown side by side as one object, three-quarter view, one boot slightly ahead: mid-height lace-up boots in dark brown leather and grey canvas with a notably thick sole built from a curved, layered spring heel plate like a stack of leaf springs, a padded ankle cuff, lace hooks and one buckle strap. The curved spring sole is the silhouette. Scuffed toe, worn laces. Accent: none.
Avoid: steel toe caps and ankle plates (that is the heavy boots), flat plain soles (that is the field boots), rocket flames, wings, a wearer.
```
