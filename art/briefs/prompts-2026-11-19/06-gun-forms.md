# GPT prompts, 19 Nov 2026, file 06: Items 2.0, the gun forms and the bow forms (PROPOSED)

For the artist, and for GPT. Source list: `art/briefs/ART-REQUESTS-2026-11-19.md`, section 4.3 (the 12 gun maker lines, the two bow families and the 5 heavy one-offs). What each gun does today comes from `data/weapons.json` and `data/rules.json` (`weapons_rules`); the forms, the bases and the second skills below are the lead's proposal on Leon's ruling of 19 Nov 2026, and are **PROPOSED until Leon rules them**. Every picture below is invented here: change any freely, as long as each stays distinct at 32 px from its neighbours.

**17 pictures, all gear paintings: 15 new gun forms and 2 new bow forms.** The other 21 gun forms, the other 4 bow forms and the 5 heavy one-offs are painted already (REUSE: do not redraw them).

**Hold before painting.** Section 4.6 of the list applies: none of these forms is safe to paint until Leon answers questions 4 and 5 (the gun table, the bow families). A renamed or merged form wastes its picture and its grade set. Paint only on Leon's word.

## How to use

One image a prompt. Paste **the base prompt (below)**, then the entry's prompt, and attach the references the base prompt names plus the line's own paintings named in the entry. Save under the file name given, do not rename. Every delivery is a review candidate until Leon approves it; Claude adds the catalog entries (map `gear`) and the line icons on intake. In-world only: invented guns, never a real make or model; no maker marks, emblems, text, letters or numbers in any image. The Standard finish is the master: grade pictures (`<stem>--<tier>.png`) are made later, image to image, from an approved master.

## Base prompt: gear painting (Heavenprint object icon)

**Attach:** `art/sprites/objects/fuel-drum.png`, `art/sprites/objects/tool-rack.png` and `art/sprites/objects/field-lamp.png` (material treatment and edge hierarchy only; their top-down camera does not apply), `art/portraits/world/new-faces/orren-vask.png` (brushwork), and the paintings of the form's own maker line named in each entry (the silhouette language and the accent to match). Rules: `art/style-guide/gear-icons.md`, `art/style-guide/weapon-icons.md` (faction signatures), palette `art/style-guide/palette.json`.

**Size / background:** 1024 x 1024 PNG with alpha, fully transparent, the object inside the central 80 to 85% (about 100 px clear margin on every side).

> Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss and no uniform digital sharpness. One single object, three-quarter view, lit from one side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene. Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha; the object fills about 80% of the canvas. No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands and no figures. Everything is invented: never a recognisable real-world make, model or emblem. The silhouette must be bold and instantly readable first: the icon is shown at 64 px in a shop grid and at 32 px in a backpack row, so keep detail on one or two focal edges and make the shape unmistakable when shrunk. Metal is painted in the palette's neutrals (charcoal, steel grey, warm ivory highlights); the maker's colour is the single accent, a muted local paint, never a glow. Standard finish with honest wear; rarity is not shown. It must sit in one set with the attached paintings of its maker line: the same scale rule, the same shape language, the same accent. The object is:

**Scale rules (say the one for the entry; each prompt below already carries it):** pistols and one-hand guns in side profile turned slightly toward the viewer, muzzle right, level, about 80% of the canvas width, every pistol the same width; submachine guns and short carbines on a slight diagonal (about 16 degrees, muzzle up and right), about 70% of the width; rifles and long guns on the same diagonal, about 85% of the width; shotguns on the same diagonal, about 80%; bows upright on a gentle diagonal, string to the lower left, about 85% of the height; crossbows horizontal like a rifle.

**Avoid in every gear painting:** text, numbers or maker marks; a hand or a figure; smoke, muzzle flash, sparks or loose floating parts; a glow bloom; a real-world gun; a coloured rarity border.

---

## The gun design sheet (PROPOSED, lead's proposal on Leon's ruling of 19 Nov 2026)

**Leon's ruling.** Every maker line has a **base form that scales on Dexterity only**; its other two variants take a **second skill where it applies**. Dexterity always rolls the shot (`phys.hits_with: dexterity`, as on every gun today) and the gun's damage keeps its live profile (`phys.scales_with: agility`, rules 1.56 L6); the second skill feeds the line's **signature**, never the hit. A second skill never repeats Dexterity.

**What the three forms are (how a gun makes Pressure).** **Close:** one hand, cheap to draw and reload, short reach, many small hits (Pressure by volume). **Standard:** the all-rounder with the full technique set. **Long:** the biggest single hit and the longest reach, slow, poor when a foe is adjacent (Pressure by the one big shot).

**Base choice.** The base is the form that exists and carries the line's name, so the picture that defines the line is the Dexterity-only gun; the new forms are its variants. One exception is marked (B1).

**Build note (not the artist's).** The nearest live field is `phys.also_scales` (attributes or skills, `data/CONVENTIONS.md`). Reading a second skill into a signature's size (a push's tiles, armour ignored, a crit range) is a build question for the lead; anything it needs that the engine lacks goes on the "Needs a new primitive" list, not into code.

| Line | Forms: close / standard / long | Base, Dexterity only (why) | Signature (one card line) | Variant: second skill, what it feeds | Variant: second skill, what it feeds |
| --- | --- | --- | --- | --- | --- |
| G1 Service sidearms | `parlour_pistol` / `service_pistol` / `magistrate_pistol` | `service_pistol`: the issued sidearm everyone carries; the line is named for it | **Quick:** draw and fire in one action | `parlour_pistol`: **Ingenuity**, feeds Ace in the Sleeve (the first shot of a fight, from a hand nobody watched) | `magistrate_pistol`: **Intimidation**, feeds Stopping Power (the AP a hit takes from the target's next turn) |
| G2 Revolvers | *snub revolver* / `drifter_revolver` / `frontier_hand_cannon` | `drifter_revolver`: the line's namesake six-shot | **Few rounds, the best critical:** every chamber counts | *snub revolver*: **Reaction Speed**, feeds the critical on a shot fired the turn it is drawn | `frontier_hand_cannon`: **Raw Power**, feeds Knockback (the tiles a hit shoves the target) |
| G3 DECRKM automatics | `decrkm_autopistol` / `decrkm_smg` / *DECRKM carbine* | `decrkm_smg`: the common .32 gun that is the maker's name | **Cheap and common:** the commonest round, full auto for less AP | `decrkm_autopistol`: **Guts**, feeds Point Blank (the to-hit bonus at arm's length) | *DECRKM carbine*: **Improvisation** (`proficiency`), feeds keeping a cheap gun firing (heat cleared, jams) over a long burst |
| G4 Legion automatics | `legion_pdw` / `legion_bullpup` / *Legion marksman rifle* | `legion_bullpup`: the Legion's service rifle | **Squad doctrine:** shoot, then move with the line | `legion_pdw`: **Athletics**, feeds Clear the Room while moving in armour (the door-kicker) | *Legion marksman rifle*: **Camaraderie**, feeds the shot on a foe a squadmate hit this round |
| G5 Whisper | *whisper pistol* / `whisper_smg` / *whisper carbine* | `whisper_smg`: the one Whisper gun that exists | **Silent:** firing never reveals a Hidden shooter; suits Shadow | *whisper pistol*: **Ingenuity** (Shadow's door), feeds the Break from Hidden | *whisper carbine*: **Vigilance** (`vigilant`), feeds the shot on a foe it spotted while still Hidden (overwatch from the dark) |
| G6 Mandestra drum guns | *drum pistol* / `mandestra_drum_gun` / *drum rifle* | `mandestra_drum_gun`: the line's namesake | **The biggest magazines:** full auto catches the flanks | *drum pistol*: **Raw Power**, feeds holding a full drum in one hand (Recoil relief on auto) | *drum rifle*: **Composure**, feeds Wide Spray's width at long range (a hand that never moves) |
| G7 Hellraiser line | *trench carbine* / `hellraiser_service_rifle` / `hellraiser_lmg` | `hellraiser_service_rifle`: the Hellraisers' answer to every frontier | **Suppresses:** marks a line foes fear to cross | *trench carbine*: **Guts**, feeds suppression at close quarters (and the bayonet's charge) | `hellraiser_lmg`: **Intimidation**, feeds the Pressure Suppressing Fire lays on the line |
| G8 Adamantile battle rifles | *Adamantile carbine* / `adamantile_battle_rifle` / *Adamantile heavy rifle* | `adamantile_battle_rifle`: the Brigade's rifle | **Pierces armour and plates** | *Adamantile carbine*: **Acuity** (`analysis`), feeds armour ignored on a foe you have Analyzed | *Adamantile heavy rifle*: **Raw Power**, feeds the plates a hit strips |
| G9 Precision rifles | `lever_carbine` / `ccec_marksman_rifle` / `long_rifle` | `ccec_marksman_rifle`: the line's standard precision rifle; Steady Aim is the line's Aimed reward in its plainest form | **Rewards Aimed fire** | `lever_carbine`: **Reaction Speed**, feeds Work the Lever (the follow-up shot after a hit) | `long_rifle`: **Vigilance** (`vigilant`), feeds One Breath (the Aimed bonus when still) |
| G10 Break-action shotguns | `sawn_off` / `coach_gun` / *fowling gun* | `coach_gun`: the line's two-barrel namesake | **Spread and shove:** two shells, both at once | `sawn_off`: **Guts**, feeds Close Quarters (both barrels into an adjacent foe) | *fowling gun*: **Senses** (`sensory`), feeds the far band (less falloff past 4 tiles: the hunter's feel for wind) |
| G11 Brigade auto shotguns | *shot-pistol* / `brigade_auto_shotgun` / *drum shotgun* | `brigade_auto_shotgun`: the Brigade's corridor-clearer | **Spread and shove:** a burst split between neighbours | *shot-pistol*: **Athletics**, feeds the shove on a charge in armour | *drum shotgun*: **Durability**, feeds Room Sweeper while you hold a corridor (Guard up) |
| G12 Lumeri scatterguns | *hand scatter* / `lumeri_scattergun` / *long scatter* | `lumeri_scattergun`: the Church's key | **Breaks doors and cover** | *hand scatter*: **Authority**, feeds Door Key on a door (the warrant of the Church's riot police) | *long scatter*: **Faith**, feeds Door Key on cover from range (the sacrament carried to the wall) |
| B1 Bows (exception) | *short bow* / `recurve_bow` / `longbow` | *short bow* (new): **live drawn bows already scale on Raw Power** (`rules.json weapons_rules.bows.damage_scales`; recurve 20 + 5 x Raw Power, longbow 25 + 6 x Raw Power and Raw Power 3 to draw), so the Dexterity-only base must be a light new bow; nothing live changes | **Silent, no heat, the quiver** | `recurve_bow`: **Raw Power** (live, unchanged), feeds the draw's damage | `longbow`: **Raw Power** (live, unchanged), feeds the draw's damage and Arc |
| B2 Crossbows | `repeating_crossbow` / `crossbow` / *arbalest* | `crossbow`: the namesake; its damage is fixed today (no Raw Power) | **Silent, cranked:** the bolt reloads as part of the shot | `repeating_crossbow`: **Improvisation** (`proficiency`), feeds Volley (keeping a fussy mechanism feeding) | *arbalest*: **Raw Power**, feeds the heavy bolt (spanning a prod no crank alone can) |
| Heavies (5 one-offs) | `blackpoint_700`, `hellraiser_rotary`, `smetanita_thumper`, `breacher_tube`, `purifier_flamer` | Each stays a one-off, Dexterity only, as live; no forms, no second skill | as live (Through and Through, Spin Up, Lob, Bunker Buster, Wall of Fire) | none | none |

**Counts.** Second skills chosen: 24 over the 12 gun lines (Raw Power and Guts 3 each; Ingenuity, Intimidation, Reaction Speed, Athletics and Vigilance 2 each; Improvisation, Acuity, Camaraderie, Composure, Senses, Durability, Authority and Faith 1 each), 4 over the bows (2 live). Questions for Leon: (1) the bases as tabled, with B1's exception; (2) the 24 second skills; (3) whether a long form whose job is the single big hit should take Raw Power more often (today two of the twelve long forms do: G2's hand cannon and G8's heavy rifle).

---

# Guns

## 1. `snub_revolver`: Snub revolver (G2 Revolvers, close; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-snub_revolver.png` (catalog `gear`, key `weapon-snub_revolver`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-drifter_revolver.png`, `art/icons/gear/weapon-frontier_hand_cannon.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** a pocket revolver drawn and fired in one breath; few chambers, the line's best critical; second skill Reaction Speed.
- **At icon size it must read as:** a revolver that is nearly all cylinder, with no barrel to speak of.

```
A five-chamber snub-nosed frontier revolver made for a coat pocket. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols (do not draw it smaller: it is told apart by shape). Silhouette: a very short barrel that barely clears the front of a fat exposed fluted cylinder, so the cylinder is the widest and most central mass; a bobbed, shrouded hammer with no spur, so nothing can snag on cloth; a rounded bird's-head grip curling under. Materials: oiled dark steel rubbed silver along the cylinder flutes and the muzzle crown, dark walnut grip with a worn pale patch; accent: one small aged-brass pin through the frame, no other colour. Unbranded frontier work, plain and honest.
At 32 px: against the drifter revolver, almost no barrel and a curled grip; against the hand cannon, slim and rounded with no top vents.
Avoid: a spurred hammer, a long barrel, engraving or ornament, a holster, a speedloader.
```

## 2. `decrkm_carbine`: DECRKM carbine (G3 DECRKM automatics, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-decrkm_carbine.png` (catalog `gear`, key `weapon-decrkm_carbine`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-decrkm_smg.png`, `art/icons/gear/weapon-decrkm_autopistol.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the common .32 gun given reach: the line's long form, cheap rounds over distance; second skill Improvisation keeps it firing.
- **At icon size it must read as:** the familiar Decrkm SMG stretched into a carbine with a fixed stock.

```
A cheap civilian-line carbine built from the common .32 submachine gun, made for reach. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette: the same slab receiver and perforated barrel shroud as the Decrkm SMG, but the shroud runs twice as far forward and a bare thin barrel pokes out past it; a fixed tube-and-plate skeleton stock in place of the folding wire; the same straight stick magazine, only longer, hanging straight down; a simple folding peep sight at the rear, no optic. Materials: dull gunmetal, black polymer grip, paint worn through to bare metal at the edges and on the shroud holes; accent: none, as the rest of the Decrkm line, one small brass pin in the receiver.
At 32 px: against the Decrkm SMG, longer with a fixed stock and a barrel past the shroud; against the Legion marksman rifle, a perforated shroud and a stick magazine in front of the grip, no scope.
Avoid: a scope, a curved magazine, a drum, a bayonet, any brake or ornament.
```

## 3. `legion_marksman_rifle`: Legion marksman rifle (G4 Legion automatics, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-legion_marksman_rifle.png` (catalog `gear`, key `weapon-legion_marksman_rifle`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-legion_bullpup.png`, `art/icons/gear/weapon-legion_pdw.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the squad's designated marksman: the long form of the Legion line; second skill Camaraderie feeds the shot on a foe a squadmate hit.
- **At icon size it must read as:** the stubby Legion bullpup with a long barrel and a scope.

```
The Thousand World Legion's squad marksman rifle: the plain mass-produced bullpup lengthened for range. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette: the bullpup body with the magazine set behind the pistol grip, as on the Legion bullpup, but a long plain free barrel running well forward of the body; a boxy, utilitarian optic on a flat top rail where the bullpup has its carry handle; two folded bipod legs tucked under the fore-end; a flat plain butt. Materials: anonymous olive-grey polymer and bare steel, scuffed from issue, no ornament; accent: none, anonymous, a single pale stencil patch left blank.
At 32 px: against the Legion bullpup, a long barrel and a scope; against the CCEC marksman rifle, blocky and olive with the magazine behind the grip.
Avoid: a thumbhole or skeleton stock, wood, any crest, brake or spike, a bolt knob, markings.
```

## 4. `whisper_pistol`: Whisper pistol (G5 Whisper, close; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-whisper_pistol.png` (catalog `gear`, key `weapon-whisper_pistol`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-whisper_smg.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the silent one-hand gun of the Shadow door; firing never reveals a Hidden shooter; second skill Ingenuity feeds the Break from Hidden.
- **At icon size it must read as:** a pistol whose front half is one fat smooth tube.

```
A silent one-hand pistol sold quietly to people who don't want receipts. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette: a short, flat, rounded slide with no ports and no edges to catch light, and an integral suppressor that is the barrel: a fat, perfectly smooth cylinder as long as the slide itself, thicker than the slide, running straight out to a plain flat muzzle; a slim grip with a flush magazine. Materials: matte black everything, a dull non-reflective finish that swallows the light, only the faintest grey edge highlights; accent: a single small dark steel-blue tag at the base of the grip, blank. The same quiet family as the attached Whisper SMG.
At 32 px: against the service pistol, a fat smooth tube twice the slide's length; against the Whisper SMG, no stock, a pistol grip only.
Avoid: shine or glints, a perforated shroud, a laser or light, an optic, any brake, a screwed-on can with knurling.
```

## 5. `whisper_carbine`: Whisper carbine (G5 Whisper, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-whisper_carbine.png` (catalog `gear`, key `weapon-whisper_carbine`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-whisper_smg.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the silent long gun, overwatch from the dark; second skill Vigilance feeds the shot on a foe spotted while Hidden.
- **At icon size it must read as:** a long rifle that is one smooth suppressor from the grip forward, with a hooded scope.

```
A silent carbine for watching a street from the dark: the Whisper line's long form. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette: an integral suppressor that forms the whole fore-end, one long smooth fat tube from just ahead of the trigger to the muzzle, no ports, no brake; a minimal skeleton stock of thin struts; a low, compact optic whose front lens is covered by a long hood so it cannot glint; a short straight magazine. Materials: matte black, dull and non-reflective, the faintest grey edge highlights; accent: a single small dark steel-blue tag on the stock, blank.
At 32 px: against the Whisper SMG, longer with a hooded scope; against every other rifle, the only one with a smooth fat tube and no brake.
Avoid: lens glint, a bipod, wood, a bayonet, shine, any marking.
```

## 6. `mandestra_drum_pistol`: Mandestra drum pistol (G6 Mandestra drum guns, close; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-mandestra_drum_pistol.png` (catalog `gear`, key `weapon-mandestra_drum_pistol`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-mandestra_drum_gun.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** a one-hand machine pistol carrying far more rounds than it should; the line's biggest-magazine signature at pistol size; second skill Raw Power holds it on auto.
- **At icon size it must read as:** a small pistol with a big round drum hung beneath it.

```
A merchant house's one-hand machine pistol with a drum far too big for it. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols; the drum may hang low into the frame. Silhouette: a sleek short pistol body with a small flared muzzle, and a large round drum magazine clamped under the frame in front of the trigger guard, the drum's diameter nearly the height of the gun; a short folding forward grip under the muzzle to hold it down. Materials: sleek lacquered dark red-black body with soft highlights, polished brass drum plates with a winding key in the centre of the drum face, a small blank brass tag; accent: brass.
At 32 px: against the other pistols, the big disc under it; against the Mandestra drum-gun, no stock and pistol length.
Avoid: a stick magazine, a stock, text on the tag, engraving that looks like lettering, chrome shine.
```

## 7. `mandestra_drum_rifle`: Mandestra drum rifle (G6 Mandestra drum guns, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-mandestra_drum_rifle.png` (catalog `gear`, key `weapon-mandestra_drum_rifle`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-mandestra_drum_gun.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the drum line's long form: a long gun on full auto whose spray still catches the flanks at range; second skill Composure.
- **At icon size it must read as:** a full-length rifle with a very large drum under its middle.

```
A merchant house's long drum-fed rifle, built to keep a whole street honest. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette: a long sleek receiver with a lacquered shroud running out to a wide flared muzzle; under the middle of the gun an even larger round drum than the drum-gun's, its face toward the viewer; a full sweeping stock with a brass-capped butt; a small low optic. Materials: sleek lacquered dark red-black with soft highlights, polished brass drum plates and fittings, a small blank brass tag; accent: brass.
At 32 px: against the Mandestra drum-gun, a longer barrel, a full stock and a bigger drum; against the Brigade drum shotgun, slim and lacquered, not plated and crested.
Avoid: a bipod, a belt, a box magazine, chrome, text or numbers on the drum.
```

## 8. `hellraiser_trench_carbine`: Hellraiser trench carbine (G7 Hellraiser line, close; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-hellraiser_trench_carbine.png` (catalog `gear`, key `weapon-hellraiser_trench_carbine`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-hellraiser_service_rifle.png`, `art/icons/gear/weapon-hellraiser_lmg.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the short trench gun that suppresses up close and charges with its bayonet; second skill Guts.
- **At icon size it must read as:** a short brutal carbine with a long bayonet reaching past the muzzle.

```
The Hellraiser Divisions' trench carbine: the service rifle cut short for the trench. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the submachine guns. Silhouette: a slab receiver, a stubby barrel ending in a short ported brake, and a long blade bayonet fixed under it that reaches well past the muzzle, longer than the service rifle's; a folding stock of welded struts ending in a trench-spike buttplate; a short curved box magazine. Materials: dark parkerised steel and black polymer with hard scratches at every edge; accent: oxide red #CC2435 as one muted band round the handguard.
At 32 px: against the Hellraiser service rifle, half the length with the blade out in front; against the Adamantile carbine, spikes and a blade instead of plates.
Avoid: blood, a scope, a drum, a pistol shape, ornament.
```

## 9. `adamantile_carbine`: Adamantile carbine (G8 Adamantile battle rifles, close; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-adamantile_carbine.png` (catalog `gear`, key `weapon-adamantile_carbine`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-adamantile_battle_rifle.png`, `art/icons/gear/weapon-adamantile_greatsword.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the Brigade's short plate-piercer, for a foe you have read; second skill Acuity.
- **At icon size it must read as:** a compact plated block with a pointed, chisel-like muzzle.

```
The Adamantile Brigade's compact carbine: a short gun that still argues with plate. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the submachine guns. Silhouette: a short plate-slab receiver in overlapping pale steel plates, an oversized guard shroud hugging a short barrel, and a narrow pointed chisel-shaped penetrator brake at the muzzle (the armour-piercing tell); a short sturdy box magazine; a short stock with a small crest at its heel. Materials: pale steel plate with a gilt crest, dark steel underneath; accent: Brigade gilt and a brass-orange #F68A38 trim line along the guard.
At 32 px: against the Adamantile battle rifle, half the length; against the Hellraiser trench carbine, smooth plates and a pointed muzzle where that one has spikes and a blade.
Avoid: heraldry with figures or letters, spikes, a bayonet, a drum, a scope.
```

## 10. `adamantile_heavy_rifle`: Adamantile heavy rifle (G8 Adamantile battle rifles, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-adamantile_heavy_rifle.png` (catalog `gear`, key `weapon-adamantile_heavy_rifle`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-adamantile_battle_rifle.png`, and for weight `art/icons/gear/weapon-blackpoint_700.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the long form's single big hit that strips plates; second skill Raw Power.
- **At icon size it must read as:** the heaviest rifle short of the anti-materiel gun, plated, with a chisel-point muzzle.

```
The Adamantile Brigade's heavy rifle: one shot, and the plate comes off. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette: a thick barrel inside a stepped shroud of layered pale steel plates, ending in a heavy chisel-pointed penetrator brake; a deep plate-slab receiver; a short thick box magazine; two folded bipod legs; a heavy stock with a raised crest. It must read heavier than the battle rifle and lighter than the attached anti-materiel gun: a dense, thick shape, not a long thin one. Materials: pale steel plates with chipped edges, dark steel at the joins, gilt on the crest; accent: Brigade gilt and a brass-orange #F68A38 trim.
At 32 px: against the Adamantile battle rifle, thicker and longer with a bipod and a pointed muzzle; against the .700 anti-materiel gun, plated and crested, not a huge round brake.
Avoid: a huge round muzzle brake (that is the .700), a scope glint, spikes, lettering on the crest.
```

## 11. `fowling_gun`: Fowling gun (G10 Break-action shotguns, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-fowling_gun.png` (catalog `gear`, key `weapon-fowling_gun`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-coach_gun.png`, `art/icons/gear/weapon-sawn_off.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the long break-action that keeps its shot together past close range; second skill Senses.
- **At icon size it must read as:** a very long, slim double-barrelled gun.

```
A long-barrelled frontier fowling gun: a hunter's double that still hits at the far end of a field. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width, longer than the coach gun. Silhouette: two very long slim side-by-side barrels, longer than the stock, with a single small bead sight at the muzzle; an open break-action hinge with two exposed hammers; a slender straight walnut stock with a narrow wrist. Materials: dark browned steel barrels with a soft sheen, figured walnut, a brass hinge pin; accent: brass, nothing else.
At 32 px: against the coach gun, barrels far longer and slimmer; against the long rifle, two barrels and two hammers, no scope and no bolt.
Avoid: a scope, a pump, a magazine tube, engraving of animals or scenes, a sling.
```

## 12. `brigade_shot_pistol`: Brigade shot-pistol (G11 Brigade auto shotguns, close; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-brigade_shot_pistol.png` (catalog `gear`, key `weapon-brigade_shot_pistol`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-brigade_auto_shotgun.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** a one-hand auto shotgun that spreads and shoves on a charge; second skill Athletics.
- **At icon size it must read as:** a fat box-shaped pistol with a flat plate round its muzzle.

```
The Adamantile Brigade's one-hand shot-pistol, for the knight who arrives first. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette: a wide boxy plated receiver, a short fat barrel, and around the muzzle a flat squared ram plate a little taller than the barrel (the shove tell); a stubby box magazine just ahead of a thick grip; a small gilt crest on the side plate. Materials: pale plate steel over dark polymer, chips along the plate edges, gilt crest; accent: Brigade gilt and brass-orange #F68A38.
At 32 px: against the sawn-off, a box with a flat muzzle plate, not two barrels; against the Lumeri hand scatter, square and plated, not a bell and a spire.
Avoid: double barrels, a tube magazine, spikes, a stock, lettering on the crest.
```

## 13. `brigade_drum_shotgun`: Brigade drum shotgun (G11 Brigade auto shotguns, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-brigade_drum_shotgun.png` (catalog `gear`, key `weapon-brigade_drum_shotgun`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-brigade_auto_shotgun.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the corridor-holder: a drum-fed auto shotgun that splits bursts while you hold your ground; second skill Durability.
- **At icon size it must read as:** the Brigade auto shotgun, longer, with a round drum and a broad muzzle plate.

```
The Adamantile Brigade's drum shotgun, made to hold a corridor. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette: a wide plated receiver, a round drum magazine under it in place of the box, a long heavy barrel inside an oversized slab handguard, and a broad flat ram plate round the muzzle; a heavy stock with a crest. Materials: pale plate steel and dark polymer, gilt crest, scuffed plate edges; accent: Brigade gilt and brass-orange #F68A38.
At 32 px: against the Brigade auto-shotgun, longer with a drum, not a box; against the Mandestra drum rifle, plated, crested and wide-muzzled, not sleek lacquer.
Avoid: a belt, a bipod, spikes, a tube magazine, lettering.
```

## 14. `lumeri_hand_scatter`: Lumeri hand scatter (G12 Lumeri scatterguns, close; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-lumeri_hand_scatter.png` (catalog `gear`, key `weapon-lumeri_hand_scatter`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-lumeri_scattergun.png`, `art/icons/gear/weapon-purifier_flamer.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the Church riot police's one-hand door key; breaks doors and cover; second skill Authority.
- **At icon size it must read as:** a pistol with a flared bell muzzle and a spire sight.

```
The Lumeri Church's one-hand scatter pistol, carried by its riot police to open doors. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette: a short fat barrel ending in a flared bell muzzle with a thick squared lip (the door-breaking tell); a short tube magazine under the barrel; a small brass spire-shaped front sight; one lancet arch cut through the frame above the trigger; an ivory-painted grip. Materials: dark steel, ivory-painted wood with a gold inlay line; accent: Lumeri gold #F2C46A.
At 32 px: against the Lumeri scattergun, a pistol with no pump and no stock; against the Brigade shot-pistol, a round bell and a spire, not a flat plate and a box.
Avoid: any cross, star or real faith's symbol, prayer text, smoke, a censer chain.
```

## 15. `lumeri_long_scatter`: Lumeri long scatter (G12 Lumeri scatterguns, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-lumeri_long_scatter.png` (catalog `gear`, key `weapon-lumeri_long_scatter`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-lumeri_scattergun.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the Church's key carried to the wall from range: breaks cover at distance; second skill Faith.
- **At icon size it must read as:** the Lumeri scattergun, longer, with a tall spire sight and a long tube.

```
The Lumeri Church's long scattergun, for breaking a wall from across the square. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette: a long barrel over an equally long tube magazine; a pump fore-end with two lancet arch cuts through it; a tall brass spire front sight, taller than the scattergun's; a muzzle choke shaped as a narrow lancet window in a steel collar; a full ivory-painted stock. Materials: dark steel, ivory-painted wood, a gold inlay line along the stock; accent: Lumeri gold #F2C46A.
At 32 px: against the Lumeri scattergun, longer with a taller spire; against the fowling gun, one barrel over a tube with a pump, ivory not walnut.
Avoid: any cross, star or real faith's symbol, prayer text, smoke, a censer, a scope.
```

---

# Bows

## 16. `short_bow`: Short bow (B1 Bows, close; the line's Dexterity-only base; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-short_bow.png` (catalog `gear`, key `weapon-short_bow`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-recurve_bow.png`, `art/icons/gear/weapon-longbow.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** a light, quick bow anyone can draw (no Raw Power), silent, shot from cover; the bow family's base.
- **At icon size it must read as:** a small, deeply bent plain bow with thick limbs.

```
A short, light frontier hunting bow that any hand can draw, made to be shot from behind a wall. Pose: upright on a gentle diagonal, string to the lower left, filling about 85% of the canvas height like the other bows (do not draw it smaller: it is told apart by shape). Silhouette: one single deep D-shaped curve from tip to tip, no reflexed ends, thick short limbs tapering to plain rounded nocks; a broad rawhide-wrapped grip; a taut dark string. No arrow on the string. Materials: pale ash wood with dry-brush grain, rawhide wrap, a dark string; accent: none, unbranded.
At 32 px: against the recurve bow, one soft D-curve with no flicked tips; against the longbow, a deep bend and thick limbs, not a tall near-straight stave.
Avoid: an arrow, a quiver, sights or a stabiliser, recurved tips, carving or feathers.
```

## 17. `arbalest`: Arbalest (B2 Crossbows, long; PROPOSED id)

- **Save as:** `art/icons/gear/weapon-arbalest.png` (catalog `gear`, key `weapon-arbalest`)
- **Mode:** gear painting (base prompt)
- **Attach (its line):** `art/icons/gear/weapon-crossbow.png`, `art/icons/gear/weapon-repeating_crossbow.png`
- **Shows in:** backpack row, shop grid, loot card, the Forge (Items 2.0)
- **Does:** the crossbow line's single biggest silent hit, a heavy bolt from a prod no crank alone can span; second skill Raw Power.
- **At icon size it must read as:** a crossbow with a very thick, very wide prod and a toothed crank box at the rear.

```
A heavy frontier arbalest: the crossbow's long form, one bolt that goes through a door. Pose: horizontal like a rifle, the prod at the right turned slightly toward the viewer, filling about 85% of the canvas width. Silhouette: a very thick laminated steel prod, much wider and deeper than the crossbow's, bound to the stock with iron bands; a long rifle-like stock; a stirrup at the front; at the rear a squared toothed crank box with a short handle, in place of the crossbow's windlass; one heavy square-headed bolt lying loaded in the groove. Materials: dark steel prod with hammered facets, plain oiled wood stock, a thick rope-and-cable string, iron fittings; accent: none, unbranded.
At 32 px: against the crossbow, the prod is far thicker and wider and the crank is a toothed box; against the repeating crossbow, no magazine box on top.
Avoid: a magazine, a scope, ornament or inlay, a loose bolt beside it, a hand on the crank.
```
