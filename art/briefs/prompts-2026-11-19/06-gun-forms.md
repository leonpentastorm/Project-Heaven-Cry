# GPT prompts, 19 Nov 2026, file 06: the gun forms, a bow and a crossbow

**17 pictures, all gear paintings: 15 new gun forms, 1 new bow and 1 new crossbow.** Every picture here is a master at the Standard finish. Each graded item is painted at all five grades: the Standard master below, then its four grade pictures (fine, masterwork, relic, celestial), made image to image from the approved master by the method in `08-grades-and-uniques.md` and saved as `weapon-<id>--<tier>.png` in the same folder.

## How to use

One image a prompt. For a **gun**, paste the **base prompt**, then the **gun pattern clause**, then the entry's prompt. For a **bow or crossbow**, paste the **base prompt**, then the entry's prompt. Attach the base references below and the line's own paintings named in the entry. Save under the exact file name given; do not rename.

**Order.** Where an entry says "paint after the repaint", the line's existing painting is being repainted to its real pattern in `10-rifle-analogues.md` (section 1, the repaints), saved over the same path. Paint that repaint first and attach the new one: the new form must match it.

**Delivery.** One contact sheet per line (the new forms beside the line's existing paintings), each picture checked at 64 and 32 px on `#10151F`.

## Base prompt: gear painting (Heavenprint object icon)

**Attach:** `art/sprites/objects/fuel-drum.png`, `art/sprites/objects/tool-rack.png` and `art/sprites/objects/field-lamp.png` (material treatment and edge hierarchy only; their top-down camera does not apply), `art/portraits/world/new-faces/orren-vask.png` (brushwork), and the paintings of the form's own line named in each entry (the scale, the finish and the maker's accent to match). Rules: `art/style-guide/gear-icons.md` (for a gun, `art/style-guide/weapon-icons.md` rule 8 governs the silhouette: it follows the real pattern the entry describes, while the name, maker, markings and text stay ours; gear-icons.md's ban on real-world models applies to everything else), palette `art/style-guide/palette.json`.

**Size / background:** 1024 x 1024 PNG with alpha, fully transparent, the object inside the central 90% of the canvas (at least 50 px of clear margin on every side); each entry gives the object's own width.

```
Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss and no uniform digital sharpness. One single object, in the pose the description gives, lit from one side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene. Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha; the object fills the width the description gives, inside the central 90% of the canvas. No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands and no figures. The name, maker and markings are invented: never a real brand, model name, logo or text. The silhouette must be bold and instantly readable first: the icon is shown at 64 px in a shop grid and at 32 px in a backpack row, so keep detail on one or two focal edges and make the shape unmistakable when shrunk. Metal is painted in the palette's neutrals (charcoal, steel grey, warm ivory highlights); the maker's colour is the single accent, a muted local paint, never a glow. Standard finish with honest wear; rarity is not shown. It must sit in one set with the attached paintings of its maker line: the same scale rule, the same shape language, the same accent. The object is:
```

## Gun pattern clause (paste after the base prompt, for every gun; the same clause, word for word, is the pattern clause of `09-heavy-and-strange.md` and the middle of the style block of `10-rifle-analogues.md`)

```
This weapon follows a well-known real firearm pattern faithfully: keep its overall layout and proportions, its magazine, belt or ammunition shape and curve, its gas system and sight layout, its stock and furniture style and its receiver's character exactly as that pattern has them, so that a gun enthusiast recognises the pattern instantly at 64 px. Do not invent a new silhouette, and do not add fantasy plates, spikes, crests or blades that change the outline. What must NOT appear: any real logo, rollmark, maker mark, text, letter, number or serial; no engraved words. The only departure from the pattern is the small maker's touch named at the end of the description (paint, inlay or a small metal fitting inside the outline, such as a band, a rivet, a tag or a small blank gilt boss; a boss or tag is a plain abstract shape with no device, letters or figure, so it is not a maker mark); it must not change the silhouette. The pattern rule governs a gun's silhouette only; the name, the maker and the markings stay invented.
```

**Scale rules (each prompt below already carries its own):** pistols and one-hand guns in side profile turned slightly toward the viewer, muzzle right, level, about 80% of the canvas width, every pistol the same width; submachine guns and short carbines on a slight diagonal (about 16 degrees, muzzle up and right), about 70% of the width; rifles and long guns on the same diagonal, about 85% of the width; shotguns on the same diagonal, about 80%, the long shotguns (the fowling gun and the Lumeri long scatter) about 85%; bows upright on a gentle diagonal, string to the lower left, about 85% of the height; crossbows horizontal like a rifle.

**Avoid in every picture:** text, letters, numbers, logos, rollmarks or maker marks; a hand or a figure; smoke, muzzle flash, sparks or loose floating parts; a glow bloom; a second object; a coloured rarity border; fantasy plates, spikes or crests that change a gun's outline.

## The lines

| Line | Close / standard / long | Already painted (path) | New in this file |
| --- | --- | --- | --- |
| Service sidearms | `parlour_pistol` / `service_pistol` / `magistrate_pistol` | all three: `art/icons/gear/weapon-<id>.png` | none |
| Revolvers | `snub_revolver` / `drifter_revolver` / `frontier_hand_cannon` | `weapon-drifter_revolver.png`, `weapon-frontier_hand_cannon.png` | `snub_revolver` |
| Decrkm automatics | `decrkm_autopistol` / `decrkm_smg` / `decrkm_carbine` | `weapon-decrkm_autopistol.png`, `weapon-decrkm_smg.png` | `decrkm_carbine` |
| Legion automatics | `legion_pdw` / `legion_bullpup` / `legion_marksman_rifle` | `weapon-legion_pdw.png`, `weapon-legion_bullpup.png` | `legion_marksman_rifle` |
| Whisper | `whisper_pistol` / `whisper_smg` / `whisper_carbine` | `weapon-whisper_smg.png` | `whisper_pistol`, `whisper_carbine` |
| Mandestra drum guns | `mandestra_drum_pistol` / `mandestra_drum_gun` / `mandestra_drum_rifle` | `weapon-mandestra_drum_gun.png` | `mandestra_drum_pistol`, `mandestra_drum_rifle` |
| Hellraiser line | `hellraiser_trench_carbine` / `hellraiser_service_rifle` / `hellraiser_lmg` | `weapon-hellraiser_service_rifle.png`, `weapon-hellraiser_lmg.png` | `hellraiser_trench_carbine` |
| Adamantile battle rifles | `adamantile_carbine` / `adamantile_battle_rifle` / `adamantile_heavy_rifle` | `weapon-adamantile_battle_rifle.png` | `adamantile_carbine`, `adamantile_heavy_rifle` |
| Precision rifles | `lever_carbine` / `ccec_marksman_rifle` / `long_rifle` | all three: `art/icons/gear/weapon-<id>.png` | none |
| Break-action shotguns | `sawn_off` / `coach_gun` / `fowling_gun` | `weapon-sawn_off.png`, `weapon-coach_gun.png` | `fowling_gun` |
| Brigade auto shotguns | `brigade_shot_pistol` / `brigade_auto_shotgun` / `brigade_drum_shotgun` | `weapon-brigade_auto_shotgun.png` | `brigade_shot_pistol`, `brigade_drum_shotgun` |
| Lumeri scatterguns | `lumeri_hand_scatter` / `lumeri_scattergun` / `lumeri_long_scatter` | `weapon-lumeri_scattergun.png` | `lumeri_hand_scatter`, `lumeri_long_scatter` |
| Bows | `short_bow` / `recurve_bow` / `longbow` | `weapon-recurve_bow.png`, `weapon-longbow.png` | `short_bow` |
| Crossbows | `repeating_crossbow` / `crossbow` / `arbalest` | `weapon-repeating_crossbow.png`, `weapon-crossbow.png` | `arbalest` |

All paths are in `art/icons/gear/`.

---

# Guns

## 1. `snub_revolver`: Snub revolver (Revolvers, close)

- **Save as:** `art/icons/gear/weapon-snub_revolver.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-drifter_revolver.png`; `art/icons/gear/weapon-frontier_hand_cannon.png` (paint after the repaint)

```
The snub-nosed pocket revolver pattern. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols (do not draw it smaller: it is told apart by shape). Silhouette, kept exactly: a small-frame double-action revolver with a two-inch barrel that barely clears the front of the cylinder, a ramped blade front sight on top of it and a short exposed ejector rod beneath; a five-shot fluted swing-out cylinder that is the widest and most central mass; a cylinder release latch on the side of the frame behind the cylinder; a shrouded hammer with only its tip showing; a rounded trigger guard; a small round-butt grip. Materials: oiled dark steel rubbed silver along the cylinder flutes and the muzzle crown, dark walnut grip panels with a worn pale patch. Maker's touch: one aged-brass screw in the side plate of the frame.
At 32 px: against the drifter revolver, almost no barrel and a small round grip; against the hand cannon, slim and short with no underlug.
Avoid: a spurred hammer, a long barrel, engraving, a holster, a speedloader.
```

## 2. `decrkm_carbine`: Decrkm carbine (Decrkm automatics, long)

- **Save as:** `art/icons/gear/weapon-decrkm_carbine.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-decrkm_smg.png` and `art/icons/gear/weapon-decrkm_autopistol.png` (paint after both repaints)

```
The long-barrelled semi-automatic carbine of the boxy telescoping-bolt submachine gun pattern. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: the same short boxy stamped receiver as the attached submachine gun, with its ribbed top cover and the cocking knob on top; the magazine inserted through the pistol grip, its base flush with the grip; a grip safety at the back of the grip; a protected front sight with two ears at the front of the receiver and a rear sight with ears at the back; a long thin barrel running far out in front of the receiver, held by a knurled barrel nut; a fixed wooden buttstock in place of the folding metal stock. Materials: dull gunmetal stamped steel, black grip panels, dark oiled wood stock, paint worn through to bare metal at the edges. Maker's touch: one small brass pin through the receiver.
At 32 px: against the Decrkm submachine gun, a long bare barrel and a wooden stock; against every other rifle, a short box with the magazine in the grip and a thin barrel.
Avoid: a scope, a curved magazine, a drum, a bayonet, a muzzle brake, a folding stock.
```

## 3. `legion_marksman_rifle`: Legion marksman rifle (Legion automatics, long)

- **Save as:** `art/icons/gear/weapon-legion_marksman_rifle.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-legion_bullpup.png` and `art/icons/gear/weapon-legion_pdw.png` (paint after the PDW's repaint)

```
The issued marksman fit of the carry-handle bullpup pattern. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: the same rifle as the attached Legion bullpup, the long carry handle running over the whole top of the gun with the cocking handle under it; the short straight magazine set behind the pistol grip; the long trigger guard; the ribbed polymer fore-end and the short barrel with its ringed flash hider; fitted for the marksman: a compact scope clamped on top of the carry handle, and the two thin bipod legs unfolded and spread down under the fore-end. Materials: anonymous olive-grey polymer and bare steel, scuffed from issue. Maker's touch: one pale stripe painted round the butt.
At 32 px: against the Legion bullpup, a scope on the handle and two legs spread under the front; against the precision rifles, a short bullpup body with the magazine behind the grip.
Avoid: wood, a thumbhole or skeleton stock, a longer barrel, a crest, spikes, a bolt knob, any marking.
```

## 4. `whisper_pistol`: Whisper pistol (Whisper, close)

- **Save as:** `art/icons/gear/weapon-whisper_pistol.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-whisper_smg.png`

```
The wartime integrally suppressed tube pistol pattern. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette, kept exactly: the whole gun is one long smooth cylinder of even diameter, receiver and suppressor in one, from a round knurled bolt cap at the rear end to a plain flat muzzle; the magazine forms the grip, hanging straight down below the rear third of the tube, with a rubber-covered base; a grip safety on the back of the grip; a small trigger in a narrow trigger guard; two tiny low blade sights on top of the tube. Materials: matte black everything, a dull non-reflective finish that swallows the light, only the faintest grey edge highlights, dark rubber on the grip base. Maker's touch: a single small dark steel-blue tag at the base of the grip, blank.
At 32 px: against the service pistol, a long smooth tube with a grip under its back end; against the Whisper submachine gun, no stock and no front grip.
Avoid: shine or glints, a slide, ports or holes in the tube, a laser or light, an optic, a screwed-on can with knurling at the front.
```

## 5. `whisper_carbine`: Whisper carbine (Whisper, long)

- **Save as:** `art/icons/gear/weapon-whisper_carbine.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-whisper_smg.png`

```
The integrally suppressed special-purpose carbine pattern. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: a fat smooth suppressor that forms the whole fore-end, one even tube from just ahead of the receiver to the muzzle, no ports and no brake; a small stamped receiver with a dust cover and a large safety lever on the right side; a short straight box magazine; a skeleton wooden thumbhole stock, an open frame of wood with the pistol grip inside it; a compact scope on a side rail on the left of the receiver. Materials: matte black metal, dull and non-reflective, a dark matte-stained wood stock, the faintest grey edge highlights. Maker's touch: a single small dark steel-blue tag on the stock, blank.
At 32 px: against the Whisper submachine gun, longer with an open wooden stock and a scope; against every other rifle, the only one whose front half is one fat smooth tube.
Avoid: lens glint, a bipod, a bayonet, shine, any marking.
```

## 6. `mandestra_drum_pistol`: Mandestra drum pistol (Mandestra drum guns, close)

- **Save as:** `art/icons/gear/weapon-mandestra_drum_pistol.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-mandestra_drum_gun.png` (paint after the repaint)

```
The long-barrelled toggle-lock pistol pattern with the snail drum magazine. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols; the drum may hang low into the frame. Silhouette, kept exactly: a toggle-lock action on top of the frame, the jointed knee-shaped toggle ending in two round knurled grips at the rear; a long slim tapered barrel with a tangent leaf rear sight on the barrel just ahead of the frame and a small blade front sight; a steeply raked grip with chequered wooden panels; a snail-shaped drum magazine, a round drum on a long neck inserted into the bottom of the grip, angling forward and down below the barrel. No stock. Materials: lacquered dark red-black metal with soft highlights, dark wooden grip panels, polished brass drum plates. Maker's touch: brass on the drum, and one small blank brass tag on the side of the frame.
At 32 px: against the other pistols, the toggle on top and the big round drum under the grip; against the Mandestra drum gun, no stock and pistol length.
Avoid: a stick magazine, a stock, text on the tag, engraving that looks like lettering, chrome shine.
```

## 7. `mandestra_drum_rifle`: Mandestra drum rifle (Mandestra drum guns, long)

- **Save as:** `art/icons/gear/weapon-mandestra_drum_rifle.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-mandestra_drum_gun.png` (paint after the repaint)

```
The wartime drum-fed submachine gun pattern with the full wooden rifle stock. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: a full one-piece wooden stock running from the butt, with a strong drop at the wrist, up to a wooden fore-wrist under the receiver; a short hinged stamped receiver with a small flip rear sight on top; a round barrel jacket pierced with rows of oblong cooling slots, its front end cut off on a slant to make the muzzle compensator, with a hooded front sight; a large round drum magazine under the receiver just ahead of the trigger guard. Materials: lacquered dark red-black on the metal with soft highlights, dark oiled wood, polished brass drum plates. Maker's touch: the brass drum plates and one small blank brass tag on the stock.
At 32 px: against the Mandestra drum gun, a full wooden rifle stock and a slotted jacket with a slanted nose; against the Brigade drum shotgun, wood and a slotted round jacket, not a straight black box.
Avoid: a bipod, a belt, a box magazine, a pistol grip, chrome, text or numbers on the drum.
```

## 8. `hellraiser_trench_carbine`: Hellraiser trench carbine (Hellraiser line, close)

- **Save as:** `art/icons/gear/weapon-hellraiser_trench_carbine.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-hellraiser_service_rifle.png` and `art/icons/gear/weapon-hellraiser_lmg.png` (paint after both repaints)

```
The folding-stock short assault carbine of the stamped long-stroke rifle family. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the submachine guns. Silhouette, kept exactly: a very short barrel ending in a large cylindrical cone-shaped muzzle booster; a short gas tube over the barrel with a short wooden handguard above and below; a hinged top cover that lifts from the front, carrying a small flip rear sight; a stamped steel receiver with a large safety lever on the right side; a short, strongly curved box magazine; a pistol grip; a side-folding skeleton stock of two struts and a triangular butt, shown open. Materials: dark stamped steel and worn reddish-brown wood with hard scratches at every edge. Maker's touch: oxide red #CC2435 as one muted band round the handguard.
At 32 px: against the Hellraiser service rifle, half the length with a fat booster at the muzzle and an open strut stock; against the Adamantile carbine, a curved magazine and a cone booster in place of a long slotted flash hider.
Avoid: a bayonet, spikes, blood, a scope, a drum, ornament.
```

## 9. `adamantile_carbine`: Adamantile carbine (Adamantile battle rifles, close)

- **Save as:** `art/icons/gear/weapon-adamantile_carbine.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-adamantile_battle_rifle.png` (paint after the repaint)

```
The paratrooper version of the tilting-breechblock metric battle rifle. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the short carbines. Silhouette, kept exactly: the same receiver as the attached battle rifle, its top cover tapering to the rear peep sight, the small folding cocking handle on the left side toward the front, and a straight 20-round box magazine; a short barrel with a tall eared front sight and a long slotted flash hider; a slim ventilated handguard; a side-folding skeleton stock of steel tubes with a flat butt plate, shown open. No carry handle. Materials: dark steel and black furniture, worn grey at the edges. Maker's touch: one small blank gilt boss at the heel of the stock and a thin brass-orange #F68A38 trim line along the handguard.
At 32 px: against the Adamantile battle rifle, shorter with an open tube stock; against the Hellraiser trench carbine, a straight magazine and a long slotted flash hider.
Avoid: armour plates, spikes, a bayonet, a drum, a scope, heraldry with figures or letters.
```

## 10. `adamantile_heavy_rifle`: Adamantile heavy rifle (Adamantile battle rifles, long)

- **Save as:** `art/icons/gear/weapon-adamantile_heavy_rifle.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-adamantile_battle_rifle.png` (paint after the repaint)

```
The heavy-barrel squad version of the metric full-power battle rifle pattern. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: the same receiver as the attached battle rifle, with its top cover tapering to the rear peep sight, the small folding cocking handle on the left toward the front and the tall eared front sight; a thick heavy barrel ending in a long slotted flash hider; a folding bipod hinged near the muzzle, its two legs folded back along the barrel; a wooden handguard and a fixed wooden stock; a straight 30-round box magazine. Materials: dark steel and dark oiled wood, chipped at the edges. Maker's touch: one small blank gilt boss at the heel of the stock and a thin brass-orange #F68A38 trim line along the handguard.
At 32 px: against the Adamantile battle rifle, a thicker barrel, wood and a bipod; against the long rifle, a straight magazine and a bipod, no scope.
Avoid: armour plates, spikes, a huge round muzzle brake, a scope, any device or lettering on the gilt boss.
```

## 11. `fowling_gun`: Fowling gun (Break-action shotguns, long)

- **Save as:** `art/icons/gear/weapon-fowling_gun.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-coach_gun.png`, `art/icons/gear/weapon-sawn_off.png`

```
The long side-by-side hammer game gun pattern. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width, longer than the coach gun. Silhouette, kept exactly: two very long slim side-by-side barrels, longer than the stock, with a raised rib between them and a single small bead at the muzzle; two exposed hammers on side-lock plates; a top lever behind the breech; double triggers in one trigger guard; a slim splinter fore-end; a slender straight-hand stock with a narrow wrist. Materials: dark browned steel barrels with a soft sheen, figured walnut. Maker's touch: one brass hinge pin.
At 32 px: against the coach gun, barrels far longer and slimmer; against the long rifle, two barrels and two hammers, no scope and no bolt.
Avoid: a scope, a pump, a magazine tube, engraving of animals or scenes, a sling.
```

## 12. `brigade_shot_pistol`: Brigade shot-pistol (Brigade auto shotguns, close)

- **Save as:** `art/icons/gear/weapon-brigade_shot_pistol.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-brigade_auto_shotgun.png` (paint after the repaint)

```
The stockless short version of the box-fed shotgun built on the stamped long-stroke rifle's body. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette, kept exactly: the same receiver as the attached auto shotgun, with the ribbed dust cover, the large safety lever on the right side and a fat straight box magazine; a very short barrel with a short gas tube over it and a short handguard; a pistol grip; no stock, the receiver ending in a plain rear plate with a sling loop. Materials: dark stamped steel and black polymer, worn grey at every edge. Maker's touch: one small blank gilt boss on the side of the receiver and a thin brass-orange #F68A38 trim line along the handguard.
At 32 px: against the sawn-off, one barrel and a fat box magazine, not two barrels; against the Lumeri hand scatter, a box magazine and a dust cover, not a pump and a tube.
Avoid: armour plates, a ram plate, double barrels, a tube magazine, spikes, a stock, any device or lettering on the gilt boss.
```

## 13. `brigade_drum_shotgun`: Brigade drum shotgun (Brigade auto shotguns, long)

- **Save as:** `art/icons/gear/weapon-brigade_drum_shotgun.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-brigade_auto_shotgun.png` (paint after the repaint)

```
The full-auto drum-fed combat shotgun pattern with the straight-line box body. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 80% of the canvas width like the shotguns. Silhouette, kept exactly: a long rectangular box receiver that runs straight back into a fixed stock of the same depth, the whole gun one straight line; a long carry handle along the top with the rear sight in it; a large round drum magazine under the receiver just ahead of the pistol grip; a short barrel sticking out of the front of the box, ending in a big flash hider, with a front sight post. Materials: black polymer and dark steel, scuffed at every edge. Maker's touch: one small blank gilt boss at the heel of the stock and a thin brass-orange #F68A38 trim line along the side of the box.
At 32 px: against the Brigade auto shotgun, a straight box body with a round drum; against the Mandestra drum rifle, a black box and a handle, not wood and a slotted jacket.
Avoid: armour plates, a ram plate, a belt, a bipod, spikes, a tube magazine, lettering.
```

## 14. `lumeri_hand_scatter`: Lumeri hand scatter (Lumeri scatterguns, close)

- **Save as:** `art/icons/gear/weapon-lumeri_hand_scatter.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-lumeri_scattergun.png` (paint after the repaint)

```
The short pistol-grip pump shotgun pattern, fitted for breaching doors. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette, kept exactly: a short barrel over a tube magazine that runs to the muzzle; a ribbed pump fore-end with a hand strap; a receiver with an ejection port on the side; a bird's-head pistol grip curling down behind the trigger guard and no stock; a short toothed breaching standoff on the muzzle; a small bead front sight. Materials: dark steel, ivory-painted grip and pump. Maker's touch: one thin Lumeri gold #F2C46A inlay line along the grip.
At 32 px: against the Lumeri scattergun, a pump and a bird's-head grip with no stock; against the Brigade shot-pistol, a pump and a tube, not a box magazine.
Avoid: any cross, star or real faith's symbol, prayer text, smoke, a censer chain, a stock.
```

## 15. `lumeri_long_scatter`: Lumeri long scatter (Lumeri scatterguns, long)

- **Save as:** `art/icons/gear/weapon-lumeri_long_scatter.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-lumeri_scattergun.png` (paint after the repaint)

```
The semi-automatic gas-operated tube-fed combat shotgun pattern. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: a long barrel over a tube magazine that runs almost to the muzzle; a short gas-system collar on the barrel just ahead of the receiver; a fixed slim ribbed fore-end, no pump; a receiver with a flat top rail; a ghost-ring rear sight (a ring with two protective ears) and a post front sight with two ears; a separate pistol grip and a collapsible stock on a tube. Materials: dark steel, ivory-painted fore-end, grip and stock. Maker's touch: one thin Lumeri gold #F2C46A inlay line along the stock.
At 32 px: against the Lumeri scattergun, a fixed fore-end, ring sights and a pistol-grip tube stock; against the fowling gun, one barrel over a tube, ivory not walnut.
Avoid: any cross, star or real faith's symbol, prayer text, smoke, a censer, a scope, a pump.
```

---

# Bows and crossbows

Bows and crossbows are invented shapes, never a real model: paste the base prompt only, no pattern clause.

## 16. `short_bow`: Short bow (Bows, close)

- **Save as:** `art/icons/gear/weapon-short_bow.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-recurve_bow.png`, `art/icons/gear/weapon-longbow.png`

```
A short, light frontier hunting bow that any hand can draw, made to be shot from behind a wall. Pose: upright on a gentle diagonal, string to the lower left, filling about 85% of the canvas height like the other bows (do not draw it smaller: it is told apart by shape). Silhouette: one single deep D-shaped curve from tip to tip, no reflexed ends, thick short limbs tapering to plain rounded nocks; a broad rawhide-wrapped grip; a taut dark string. No arrow on the string. Materials: pale ash wood with dry-brush grain, rawhide wrap, a dark string; no colour accent.
At 32 px: against the recurve bow, one soft D-curve with no flicked tips; against the longbow, a deep bend and thick limbs, not a tall near-straight stave.
Avoid: an arrow, a quiver, sights or a stabiliser, recurved tips, carving or feathers.
```

## 17. `arbalest`: Arbalest (Crossbows, long)

- **Save as:** `art/icons/gear/weapon-arbalest.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge
- **Attach (its line):** `art/icons/gear/weapon-crossbow.png`, `art/icons/gear/weapon-repeating_crossbow.png`

```
A heavy frontier arbalest: one bolt that goes through a door. Pose: horizontal like a rifle, the prod at the right turned slightly toward the viewer, filling about 85% of the canvas width. Silhouette: a very thick laminated steel prod, much wider and deeper than the crossbow's, bound to the stock with iron bands; a long rifle-like stock; a stirrup at the front; at the rear a squared toothed crank box with a short handle, in place of the crossbow's windlass; one heavy square-headed bolt lying loaded in the groove. Materials: dark steel prod with hammered facets, plain oiled wood stock, a thick rope-and-cable string, iron fittings; no colour accent.
At 32 px: against the crossbow, the prod is far thicker and wider and the crank is a toothed box; against the repeating crossbow, no magazine box on top.
Avoid: a magazine, a scope, ornament or inlay, a loose bolt beside it, a hand on the crank.
```
