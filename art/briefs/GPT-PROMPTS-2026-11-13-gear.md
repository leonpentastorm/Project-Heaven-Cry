# Prompts for the artist (image generation): Heavenprint gear icons, 13 Nov 2026

One painted icon for every weapon and item the engine recognises today, plus the Visualizer and the Attuner (the two new gloves of Classes 3.0) and the Toxin vial (13 Nov 2026: the Classes 3.0 additions are numbers 148 and 149).
The artist is an image generator (GPT): **one image a prompt**. For each image paste **the style block (section 1), then
the family paragraph (section 2) for that batch, then the numbered line (section 3)**. Attach, once per session, two or
three of the existing Heavenprint object references named in section 1.

Why now (Leon, 13 Nov 2026): the roguelike comes after Classes 3.0 and needs a shop and many new pipelines, so the art
has to be ready first. The monoline SVG weapon and armour icons are placeholders for inventory and shop use; see
[`ART-REQUESTS.md`](ART-REQUESTS.md) request E2 and the rule in [`gear-icons.md`](../style-guide/gear-icons.md).

**Every delivery is a review candidate until Leon approves it.** Send the files to Leon; Claude adds them to the
catalog and runs the checks.

## Count by kind (generated from `data/weapons.json`, `data/items.json` and the engine's pack rules, 13 Nov 2026)

| Kind | Count | Where it comes from |
| --- | --- | --- |
| Weapons | 60 | `data/weapons.json` (59 roster types and the beast's bite) |
| Armour (head, body, hands, feet) | 16 | `data/items.json` category `armour` |
| Shields | 3 | `shield` |
| Focuses | 4 | `focus`: Evoker, Emanator, and the Visualizer and the Attuner (planned, Classes 3.0) |
| Weapon mods | 13 | `mod` |
| Tools | 7 | `tool` |
| Consumables (stim, cores, plates, essence, toxin vial) | 6 | `consumable` (the toxin vial is planned, Classes 3.0) |
| Special ammunition | 4 | `ammo` |
| Food | 3 | `food` |
| Lights | 2 | `light` |
| Documents | 2 | `document` |
| Augment, loot, companion | 3 | `augment`, `loot`, `companion` (one each) |
| Torso armour classes, loose rounds, magazines, personal effects | 26 | not in `items.json`: the engine's armour classes 1 to 5 (`rules.json` armor; kits name three of them), the 12 calibres (`rules.json` calibres), magazine families (`character.ts` `magsOf`) and the loot table's `personal` effects |
| **Total prompts** | **149** | one file each (147 on 13 Nov morning; the Attuner and the Toxin vial added the same day) |

Left out on purpose: map objects (`data/objects.json`: crate, barrel, terminal, cache and the rest) are map pieces with
their own sprites, not gear; the loot table's piles use the item icons; Wick, perks, traits and prayers have their own
modes. No rarity tiers exist in `items.json`; rarity is a per-weapon instance field (section 4).

## 1. Style block (paste at the start of every prompt)

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

**Attach as references (existing Heavenprint objects in this game):** `art/sprites/objects/fuel-drum.png`,
`art/sprites/objects/tool-rack.png` and `art/sprites/objects/field-lamp.png` (painted objects: material treatment and
edge hierarchy; their top-down camera does not apply, the camera here is three-quarter), plus a portrait for the
brushwork, e.g. `art/portraits/world/new-faces/orren-vask.png`. Palette: [`palette.json`](../style-guide/palette.json);
rule: [`gear-icons.md`](../style-guide/gear-icons.md). The monoline icon of the item (`art/icons/weapons/<id>.svg`,
`art/icons/armour/<id>.svg`, `art/icons/focus/<id>.svg`) is the **silhouette reference**: the painting and the line icon
of one item must be recognisably the same object.

**Faction accents (Suggested until Leon confirms; use as the one accent colour, a muted local paint, not a glow):**
Hellraiser Divisions oxide red `#CC2435`; Lumeri Church gold `#F2C46A` with ivory; Adamantile Brigade pale steel with
gilt and brass-orange `#F68A38`; Science Team and Sigil arms cyan `#4FC8DF` in core windows only; Thousand World Legion
none (anonymous olive-grey); Orks dirty ochre daubs and rust; Central City clean ivory with blue-grey `#5394AC`;
Kemizuchi lacquer black with crimson `#86234E`; Smetanita and Mandestra lacquer black with brass; Frontier and
unbranded: no accent, bare steel, walnut, leather. The four focus gloves: Evoker Intelligence `#8BDEEE`, Emanator
Determination `#9D7ADC`, Visualizer Expression `#5394AC`, Attuner Insight `#EB95B7`.

## 2. Family sheets (paste the one for the batch after the style block)

**Starting kit, mixed** (kits). This batch mixes families: use the family paragraph of each item (pistol, revolver, SMG, rifle, knife, focus glove, armour, magazine, round, small kit). Common rule: ordinary, issued, worn from use; nothing ornate. These are the first things a new character sees, so they set the look of the whole set: get these approved by Leon before batching the rest.

**Pistols and revolvers** (pistols). Side profile turned slightly toward the viewer, muzzle to the right, level, the whole object about 80% of the canvas width. Every pistol and revolver fills the frame to the same width (a derringer is not drawn smaller: tell it apart by shape). Shape language: slab slides and stick magazines for Decrkm and Central City (clean civilian lines); long barrels, spurred hammers, cylinders and walnut for frontier revolvers; thick short ported barrels for heavy calibres; ornament only on the parlour pistol. Gunmetal, worn edges bright, polymer or walnut grips.

**Rifles and long rifles** (rifles). Lying along a slight diagonal (about 16 degrees, muzzle up and right), the full length filling about 85% of the canvas width. All rifles share this scale; the long rifle is drawn the same length with a thinner, longer-looking barrel. Shape language by faction: Hellraiser slab receivers, ported brakes, a bayonet sharing the barrel edge, trench-spike buttplates; Adamantile plate shapes, oversized guards, crests; Central City clean pale lines; Legion plain, mass-produced; frontier wood and blued steel. A rifle needs a visible magazine or tube so it reads as a gun, not a stick.

**Submachine guns** (smgs). Same pose as rifles but shorter: about 70% of the canvas width. Shape language: boxy, utilitarian, a stick or drum magazine as the readable feature; the Whisper SMG is smooth and matte; the Mandestra drum-gun is sleek with brass; the Legion PDW is tiny and plain.

**Shotguns** (shotguns). Diagonal like the rifles, about 80% of the canvas width (the sawn-off is a one-hand pistol shape at pistol size). Shape language: fat muzzles, tube magazines or double barrels; Lumeri lancet arches and spire sights; Brigade boxy plates and crests; frontier walnut and brass; the sawn-off a rough cut with tape.

**Heavy weapons and launchers** (heavy). Diagonal, about 90% of the canvas width, drawn dense and heavy: thick tubes, big brakes, drums and belts. Shape language: Hellraiser slabs, brakes and spikes; Legion plain tubes; Lumeri brass censer nozzle with gold and ivory; Smetanita lacquer and brass. These must read heavier than any rifle even at 32 px.

**Bows and crossbows** (bows). Bows stand upright on a gentle diagonal, string to the lower left, filling the canvas height about 85%; crossbows lie horizontal like a rifle. No arrow in a bow (no floating parts). Natural materials: wood, sinew, rope, iron; the Arkvelton repeating crossbow has violet-stained inlay lines.

**Light blades and tools** (blades). On the 45 degree diagonal, handle bottom-left, point top-right, filling about 80% of the diagonal; short items (hatchet, knives) are drawn larger to fill the same frame. Shape language: single edges, plain handles; Legion plain; Kemizuchi slim lacquer; the officer sabre gilt. Highlights on the edge, shadow in the fuller.

**Heavy blades, blunt weapons and polearms** (heavyblades). On the 45 degree diagonal (polearms and lance nearly the full corner-to-corner length), the heavy head or blade as the focal point. Shape language: Ork jagged, nailed, uneven, rust and daubs; Adamantile plate guards and crests, pale steel with gilt; frontier plain iron and ash; the maul is a block of iron. A heavy slow weapon must look heavy: massive heads, thick hafts.

**Unarmed and natural weapons** (unarmed). Upright, front or three-quarter, filling about 75% of the canvas. No hands inside anything. Wraps, brass knuckles, a servo gauntlet with Hellraiser slab shapes, spikes and hoses.

**Grenades and explosives** (thrown). Upright, three-quarter, drawn large (about 70% of the canvas height; the satchel about 80%). Plain painted steel canisters. The tell is the shape: egg, cylinder, squat vented cylinder, perforated sleeve, flat puck. Pins and levers stay attached to the body.

**Mana arms** (mana). Same pose as the weapon family they belong to (rifle, pistol, blade, gauntlet, staff). Science Team and Sigil arms: precise straight lines, a hexagonal core window, cyan only inside windows and etched lines; Soul arms (Emanator gauntlet): rounded forms, violet lens; Lumeri censer gun: ivory and gold, a brass censer chamber with lancet windows, no smoke; Banner Dancers: a pole and a woven thread banner.

**Shields** (shields). Front view, upright, about 85% of the canvas height; the pavise stands on its ground edge. Wood and iron or plain painted steel, scuffs and dents, no heraldry, no text.

**Armour by weight, and clothing** (armour). Each piece shown on its own, floating, front or three-quarter view, as if laid out for sale (pairs shown side by side as one object): helmets upright in three-quarter view; torso armour as a front view with the body shape hinted by the form, no wearer. Light armour is cloth, wax and leather; Medium adds ceramic plates; Heavy adds steel plates; Assault and Juggernaut are pale Brigade plate with gilt and crests. Weight must show in the thickness. Civilian clothing stays plain and worn.

**Focuses: the four gloves** (focus). Evoker, Emanator, Visualizer and Attuner are one family (the standard gloves of the gear companies' line): a single glove, no hand inside, empty but with the shape of a hand, worn on the hand and read at 32 px as a hand. Each has a different heart: the Evoker is angular with a hexagonal core window on the back of the hand and a stylus-point index finger (Intelligence cyan #8BDEEE); the Emanator is rounded on a long bracer with a round emitter lens in the palm and a heart-link line to the cuff (Determination violet #9D7ADC); the Visualizer is palm toward the viewer with a projector lens set in the middle of the palm (Expression #5394AC); the Attuner is back of the hand toward the viewer with a small round core on the back of the hand and fine filaments running from it to each fingertip, one filament lit (Insight rose #EB95B7). The same leather, stitching and wear level on all four, the same scale (the glove fills about 85% of the canvas height). Only the glow differs, and only inside the lens or window.

**Consumables, tools, lights, food, documents, loot** (misc). Small objects drawn large: fill about 75% of the canvas, one object (or one tidy group), three-quarter view. Packaging and containers are blank (no labels, no text). Mana containers (cores, essence, plates) glow softly from inside, never as a bloom. Medical goods use a small plain stitched plus mark, never a real-world cross emblem or logo.

**Weapon mods** (mods). Each mod drawn alone, as it would sit in a shop case, about 75% of the canvas width, in a pose that shows how it attaches. Dark steel and polymer, with a single bright working part (lens, paddle, teeth). Not attached to any gun.

**Special ammunition** (specialammo). A tight handful: three or four cartridges (two standing, one or two lying) filling about 70% of the canvas. The tell between the four types is the tip: black needle (armour-piercing), open flower cut (hollow-point), ember red (incendiary), glowing etched casing (enhanced, mana).

**Loose rounds by calibre** (rounds). A small group of rounds of that calibre, about 70% of the canvas, no box. Scale cue: show the size difference honestly (the .700 round is huge, the .32 tiny) but keep the group filling the frame.

**Magazines and loaders** (mags). Single object, three-quarter view, ammunition visible at the top where it should be, about 80% of the canvas height. The silhouette is the tell: straight stick, curved box, round disc speedloader, round drum, squared belt box.

## 3. The prompts

Each line below is the numbered prompt: **Subject**, **Silhouette feature**, **Materials and accent**, optionally **At
32 px** (what must tell it from a near-twin). Save as the file name given, in `art/icons/gear/` (naming: kind, a hyphen,
the item id with any `ammo_` or `mod_` prefix removed). Where a faction is named it is the maker; "Frontier
(unbranded)" means no accent.

### Batch 1: what a new character holds, wears and packs (the four starting kits, the Proving Ground and M813)

Family paragraph: **Starting kit, mixed**. The first-use order inside this batch is the order of the numbers.

**1. `weapon-service_pistol.png`** | Service pistol (.32 Decrkm) | Decrkm / Central City civilian
> **Subject:** The plain issued sidearm: 12-round semi-automatic, trusted by no one, carried by everyone. Worn from use, not abused. **Silhouette feature:** a squared slab slide with one forward grip cut and an open ejection port, the stick magazine just showing at the grip base. **Materials and accent:** gunmetal slide with rubbed-bright edges, black polymer grip, one faded blue-grey grip panel (Central City civilian line).

**2. `weapon-drifter_revolver.png`** | Drifter revolver | Frontier (unbranded)
> **Subject:** Six chances: a long-barrelled six-shot frontier revolver (1.5 kg) made for fanning the hammer. **Silhouette feature:** an exposed six-chamber cylinder, a long barrel with a blade sight, and a big spurred hammer. **Materials and accent:** oiled dark steel, dark walnut grip with a worn pale patch where a palm sits; accent: aged brass trigger guard.

**3. `weapon-decrkm_smg.png`** | Decrkm SMG (.32 Decrkm) | Decrkm
> **Subject:** Thirty rounds of opinion: the common .32 submachine gun (3 kg). **Silhouette feature:** a straight 30-round stick magazine, a perforated barrel shroud and a folding wire stock. **Materials and accent:** gunmetal, black polymer, worn paint; accent: none.

**4. `weapon-hellraiser_service_rifle.png`** | Hellraiser service rifle | Hellraiser Divisions
> **Subject:** The Hellraisers' answer to every frontier: a 24-round select-fire service rifle with a short bayonet (4 kg). **Silhouette feature:** a ported brake, a short bayonet sharing the barrel's edge, a slab receiver and a trench-spike buttplate, with a slightly curved box magazine. **Materials and accent:** dark parkerised steel and black polymer, hard scratches at the edges; accent: oxide red #CC2435, as a muted band on the handguard.

**5. `weapon-combat_knife.png`** | Combat knife | Frontier / Legion issue
> **Subject:** Every kit has one. Every story ends with one: a plain fixed-blade combat knife (0.5 kg). **Silhouette feature:** a single-edge blade with a tanto point and a short blood groove. **Materials and accent:** black blade, black wrapped grip, bare steel edge; accent: none.

**6. `weapon-fists.png`** | Gloves or bare fists | Everyone
> **Subject:** Everyone's first weapon: a pair of gloves or bare fists. Draw a pair of wrapped leather hand-wraps with taped knuckles (nothing weapon-like). **Silhouette feature:** a pair of leather-wrapped hands shapes (empty wraps, no hands inside) with taped knuckle bars. **Materials and accent:** worn cloth and leather wraps; accent: faded grey tape; no hands, no skin.

**7. `focus-evoker.png`** | Evoker | Science Team / Sigil arms
> **Subject:** The Sigil focus (Mind, Intelligence): a hand-worn glove that holds one mana core (1.2 kg). Back of the hand toward the viewer. One of the three focus gloves, with a different heart. **Silhouette feature:** angular squared chamfered fingers, a stylus-point index fingertip and a hexagonal core window on the back of the hand (the heart is the core). **Materials and accent:** dark steel plates over grey leather, a cuff seam; accent: Intelligence #8BDEEE glow in the core window only. **At 32 px:** Against the other foci: angular and back-of-hand, core window on the back; the Emanator is round with a palm lens, the Visualizer shows its palm projector, the Attuner a fan of fine lines.

**8. `focus-emanator.png`** | Emanator | Soul arms
> **Subject:** The Soul focus (Soul, Determination): a hand-worn glove on a long bracer; the heart link runs from the palm lens to the cuff (0.4 kg). Same glove family as the Evoker, with a different heart. **Silhouette feature:** rounded fingers, a round emitter lens in the palm (three-quarter view so the palm shows) and one line from the lens down the wrist to the cuff. **Materials and accent:** soft pale leather over rounded dark metal; accent: Determination #9D7ADC in the lens and the line only. **At 32 px:** Against the Evoker: rounded and soft with a long bracer; the Visualizer is the palm-out glove with the projector.

**9. `armour-torso_class1_light.png`** | armour-torso_class1_light | Frontier
> **Subject:** Torso armour class 1 (Light, 4 kg): the starting Padded coat. **Silhouette feature:** a long quilted coat with a high collar, front toggles, and a reinforced shoulder. **Materials and accent:** dark waxed cloth, brown leather patches; accent: none.

**10. `armour-torso_class2_medium.png`** | armour-torso_class2_medium | 258th Medical Unit / field medics
> **Subject:** Torso armour class 2 (Medium, 8 kg): the starting Medic plate. **Silhouette feature:** a half-plate chest and back with a quilted underside and a stitched plus-shaped patch on the chest. **Materials and accent:** pale ceramic plates over grey canvas; accent: a muted red #CC2435 plus-patch (not a cross emblem).

**11. `armour-torso_class3_heavy.png`** | armour-torso_class3_heavy | Thousand World Legion
> **Subject:** Torso armour class 3 (Heavy, 12 kg): the soldier's Flak vest. **Silhouette feature:** a thick flak vest with shoulder yokes and a high plate pocket, belted front. **Materials and accent:** olive-drab nylon and steel plates, buckles; accent: none.

**12. `mag-pistol_32.png`** | mag-pistol_32 | Magazines
> **Subject:** Pistol magazine (.32 Decrkm) (drawn for: service pistol, auto-pistol, Spellslinger's pistol). **Silhouette feature:** a short straight stick magazine with ridged sides, a base plate and a few rounds visible in the top. **Materials and accent:** dark steel, brass rounds.

**13. `mag-rifle.png`** | mag-rifle | Magazines
> **Subject:** Rifle magazine (drawn for: Hellraiser rifle, battle rifle, marksman rifle, bullpup). **Silhouette feature:** a curved 24-round box magazine with ribs, a base plate and a feed lip. **Materials and accent:** dark steel and black polymer, rubbed edges.

**14. `mag-speedloader_revolver.png`** | mag-speedloader_revolver | Magazines
> **Subject:** Revolver speedloader (drawn for: Drifter revolver). **Silhouette feature:** a round disc holding six cartridges with a twist knob. **Materials and accent:** brass and steel disc, knurled knob.

**15. `rounds-32_decrkm.png`** | rounds-32_decrkm | Ammunition (loose: .32 Decrkm)
> **Subject:** .32 Decrkm: the common pistol and SMG round (one stack per calibre in the pack). **Silhouette feature:** a few small straight-walled cartridges, three standing and a few loose. **Materials and accent:** brass.

**16. `rounds-revolver.png`** | rounds-revolver | Ammunition (loose: Revolver)
> **Subject:** Revolver: six-shot revolver rounds (one stack per calibre in the pack). **Silhouette feature:** a few rimmed revolver cartridges with round-nosed lead, three standing. **Materials and accent:** brass and lead.

**17. `rounds-rifle.png`** | rounds-rifle | Ammunition (loose: Rifle)
> **Subject:** Rifle: rifle rounds (one stack per calibre in the pack). **Silhouette feature:** a few tapered bottle-necked cartridges, three standing. **Materials and accent:** brass with dark tips.

**18. `tool-field_kit.png`** | Field kit | 258th Medical Unit
> **Subject:** Bandages, splints and a suture set (1.5 kg): what a Bard treats injuries with. **Silhouette feature:** a roll-up canvas kit tied and half open, with a splint end showing, and a small stitched plus patch. **Materials and accent:** tan canvas and a leather tie; accent: muted red #CC2435 plus-patch.

**19. `tool-spare_parts.png`** | Spare-parts charge | Mechanics
> **Subject:** One charge of parts for Field Repair (0.16 kg). **Silhouette feature:** a small hinged parts tin open with a few gears, a spring and a bolt. **Materials and accent:** tin grey, bright steel parts; accent: none.

**20. `consumable-standard_core.png`** | Standard mana core | Mana
> **Subject:** A core of condensed mana (0.2 kg): an Evoker burns it for Sigils. **Silhouette feature:** a hexagonal prism of luminous mana with metal end caps. **Materials and accent:** clear faceted core, brass-grey caps; accent: Mind cyan #4FC8DF, contained inner light.

**21. `tool-chalk_and_wax.png`** | Chalk and wax | Sigil students
> **Subject:** For drawing sigils by hand (0.4 kg). **Silhouette feature:** a stub of white chalk and a lump of wax crayon tied in a small cloth wrap. **Materials and accent:** chalky white, tan wax, brown cloth; accent: none.

**22. `food-ration_pack.png`** | Ration pack | Legion issue
> **Subject:** A day of food, sealed (0.6 kg). **Silhouette feature:** a foil-sealed brick pack with a tear notch and tuck fold. **Materials and accent:** olive foil, a plain pale label (blank); accent: none.

**23. `tool-prayer_beads.png`** | Prayer beads and incense | Lumeri Church
> **Subject:** For prayer and patience (0.3 kg): beads and incense. **Silhouette feature:** a loop of dark beads with a small tassel and a bundle of incense sticks tied to it. **Materials and accent:** dark wood beads, one gold bead, ivory incense; accent: Lumeri gold #F2C46A.

**24. `consumable-stim_injector.png`** | Stim injector | Medical
> **Subject:** One dose of stim (0.1 kg). **Silhouette feature:** a pen-shaped auto-injector with a clear window, a cap and a band. **Materials and accent:** white-grey casing, steel needle cap; accent: HP red #F65157 band and a pale amber dose.

### Batch 2: pistols and revolvers

Family paragraph: **Pistols and revolvers**.

**25. `weapon-decrkm_autopistol.png`** | Decrkm auto-pistol | Decrkm
> **Subject:** A burst-capable machine pistol for the kind of conversation that happens across a table (20 rounds, 1.2 kg). **Silhouette feature:** a long 20-round stick magazine hanging well below the grip, and a small slotted compensator on the muzzle. **Materials and accent:** dull gunmetal, black grip, matte; accent: a single small brass pin through the slide. **At 32 px:** Against the service pistol: the magazine is more than twice as long and the muzzle has a visible block.

**26. `weapon-parlour_pistol.png`** | Parlour pistol | Decrkm (a gentleman's model)
> **Subject:** A two-round over-and-under pocket pistol, ornate and tiny: one more round than it usually takes. **Silhouette feature:** two stacked short barrels and a pearly ivory grip with an engraved scroll on the frame. **Materials and accent:** polished steel with fine gold-line engraving, ivory grip; accent: soft gold. **At 32 px:** Draw it to fill the frame like the other pistols (do not shrink it to true scale); it is told apart by the stacked double barrel and the ornate grip.

**27. `weapon-magistrate_pistol.png`** | Magistrate heavy pistol | Central City (the courts)
> **Subject:** A heavy 7-round pistol that slows whatever it hits: Central City courts went armed for a reason. **Silhouette feature:** a thick, squared slide and a flared muzzle on a short heavy barrel, a flat brass seal plate (blank, no text) on the grip. **Materials and accent:** dark blued steel, white-ivory grip panels, brass plate; accent: Central City blue-grey #5394AC on a small trim line. **At 32 px:** Against the service pistol: much thicker and squarer, with the brass plate and the flared muzzle.

**28. `weapon-frontier_hand_cannon.png`** | Frontier hand cannon | Frontier (unbranded)
> **Subject:** A five-shot .50 revolver you negotiate with rather than fire: its hit shoves the target back a tile (2.2 kg). **Silhouette feature:** a very thick short barrel with ported vents on top, a fat cylinder, and a steel frame like a slab. **Materials and accent:** heavy blued steel, plain dark grip with wrap; accent: aged brass cylinder bands. **At 32 px:** Against the drifter revolver: half again as thick, with a short barrel and the top vents; the drifter is long and slim.

### Batch 3: rifles and long rifles

Family paragraph: **Rifles and long rifles**.

**29. `weapon-lever_carbine.png`** | Lever carbine | Frontier (unbranded)
> **Subject:** An old, honest lever-action carbine that never needs a battery: 8 rounds under the barrel (3.5 kg). **Silhouette feature:** a big finger-lever loop under the receiver and a tubular magazine under the barrel. **Materials and accent:** blued steel, polished walnut stock and fore-end, brass receiver; accent: brass.

**30. `weapon-long_rifle.png`** | Long rifle | Frontier / marksman
> **Subject:** A bolt-action rifle fired from the next valley over: a very long barrel, a heavy optic (6 kg, 30-tile range). **Silhouette feature:** an extremely long thin barrel, a raised bolt handle, a long scope and a folded bipod. **Materials and accent:** matte dark steel, a wooden thumbhole stock, a lens glinting once; accent: none (neutral and matte). **At 32 px:** Against the lever carbine and the service rifle: it is the longest and thinnest shape in the rifle family, with a scope and a bolt knob.

**31. `weapon-adamantile_battle_rifle.png`** | Adamantile battle rifle | Adamantile Brigade
> **Subject:** The Brigade wanted a rifle that argued with plate: a 15-round rifle whose shots ignore armour (5 kg). **Silhouette feature:** a plate-slab receiver, an oversized guard shroud around the front of the barrel, and a crest on the stock. **Materials and accent:** pale steel plate with a gilt crest, a sturdy box magazine; accent: Brigade gilt and a brass-orange #F68A38 trim. **At 32 px:** Against the Hellraiser rifle: smooth plate shapes and a crest where the Hellraiser one has spikes and a bayonet.

**32. `weapon-ccec_marksman_rifle.png`** | CCEC marksman rifle | Central City (CCEC)
> **Subject:** CCEC evidence: one round, one report; a slim 10-round marksman rifle that crits on 18 to 20 (4.5 kg). **Silhouette feature:** a slim fluted barrel, a clean low-profile scope, and an elegant skeleton stock with no spikes or ornament. **Materials and accent:** white-ivory polymer furniture, dark steel barrel; accent: Central City blue-grey #5394AC at one stripe. **At 32 px:** Against the long rifle: shorter, no bolt knob, a clean civilian line and a lighter, whiter look.

**33. `weapon-legion_bullpup.png`** | Legion bullpup | Thousand World Legion
> **Subject:** A short mass-produced bullpup built for a dropship aisle: the magazine sits behind the grip (3.4 kg). **Silhouette feature:** a stubby body with the magazine behind the trigger, a carry handle, and a plain flat stock. **Materials and accent:** olive-drab grey polymer with bare plain steel, no ornament; accent: none, anonymous. **At 32 px:** Against the service rifle: very short, magazine behind the grip, no brake or bayonet.

### Batch 4: submachine guns

Family paragraph: **Submachine guns**.

**34. `weapon-legion_pdw.png`** | Legion PDW | Thousand World Legion
> **Subject:** The Legion's door-kicker: a compact, plain 25-round PDW you can fire one-handed (2.2 kg). **Silhouette feature:** a tiny blocky body, a short barrel, and a short magazine in the grip. **Materials and accent:** olive-drab grey polymer, plain steel; accent: none, anonymous. **At 32 px:** Against the Decrkm SMG: half the length, no stock, magazine in the grip.

**35. `weapon-whisper_smg.png`** | Whisper SMG | Rigaz-style (sold quietly)
> **Subject:** Bought by people who don't want receipts: a silent 30-round SMG with an integral long suppressor (3.2 kg). **Silhouette feature:** a thick integral suppressor running the full length of the barrel, and a minimal skeleton stock. **Materials and accent:** matte black everything, no shine; accent: a single dark steel-blue tag on the stock (blank, no text). **At 32 px:** Against the Decrkm SMG: a smooth fat silencer tube in place of the perforated shroud.

**36. `weapon-mandestra_drum_gun.png`** | Mandestra drum-gun | Mandestra (merchant house)
> **Subject:** A merchant's answer to a negotiation gone wrong: a 70-round drum-fed SMG whose full auto catches the flanks (4.5 kg). **Silhouette feature:** a big round drum magazine under the receiver and a wide flared muzzle. **Materials and accent:** sleek lacquered dark red-black, polished brass drum plates and a small brass tag (blank); accent: brass. **At 32 px:** Against the other SMGs: the drum, and the sleek merchant lacquer.

### Batch 5: shotguns

Family paragraph: **Shotguns**.

**37. `weapon-lumeri_scattergun.png`** | Lumeri scattergun | Lumeri Church
> **Subject:** The Church calls it a key: a 6-shell pump scattergun for doors and the people behind them (4 kg). **Silhouette feature:** a tube magazine, a pump fore-end with a lancet arch cut through it, and a spire-shaped brass front sight. **Materials and accent:** dark steel and ivory-painted wood, gold inlay; accent: Lumeri gold #F2C46A.

**38. `weapon-coach_gun.png`** | Coach gun | Frontier (unbranded)
> **Subject:** A two-barrelled coach gun: two arguments, one conclusion (2 shells, 3.5 kg). **Silhouette feature:** two side-by-side barrels, two exposed hammers, and a break-action hinge. **Materials and accent:** dark steel, walnut stock, brass hinge pin; accent: brass.

**39. `weapon-sawn_off.png`** | Sawn-off | Frontier / Central City underworld
> **Subject:** A sawn-off double barrel, illegal in Central City, which is how you know it works (one hand, 2 kg). **Silhouette feature:** a short cut-down double barrel with a bare hacksaw edge, and a stock cut down to a pistol grip with tape on it. **Materials and accent:** bare steel at the cut, scuffed dark steel, wrapped grip; accent: a strip of faded red tape. **At 32 px:** Against the coach gun: no stock, tiny, with a taped pistol grip; the coach gun has a full stock.

**40. `weapon-brigade_auto_shotgun.png`** | Brigade auto-shotgun | Adamantile Brigade
> **Subject:** The Brigade's corridor-clearer: a 12-round box-fed auto shotgun that can split a burst (5 kg). **Silhouette feature:** a wide boxy receiver, a chunky box magazine, an oversized slab handguard and a crest. **Materials and accent:** pale plate steel and dark polymer, gilt crest; accent: Brigade gilt and brass-orange #F68A38. **At 32 px:** Against the Lumeri scattergun: boxy and plated with a magazine, not a tube and pump.

### Batch 6: heavy weapons and launchers

Family paragraph: **Heavy weapons and launchers**.

**41. `weapon-blackpoint_700.png`** | .700 Blackpoint anti-materiel | Frontier / mercenary
> **Subject:** Anti-materiel. Everyone else is materiel: a 3-round .700 rifle (15 kg) that must be braced or prone. **Silhouette feature:** a huge muzzle brake, an enormously thick barrel, a bipod folded under it and a heavy bolt. **Materials and accent:** dark steel, scratched and scorched at the brake; accent: none, grim and massive. **At 32 px:** It must read as by far the heaviest rifle in the set: a very thick, short-looking tube.

**42. `weapon-hellraiser_lmg.png`** | Hellraiser LMG | Hellraiser Divisions
> **Subject:** The Hellraisers' favourite sentence: "hold here." A 100-round belt-fed light machine gun on a bipod (10 kg). **Silhouette feature:** a boxy belt drum on the side, a ported brake, folded bipod legs and trench spikes at the buttplate. **Materials and accent:** dark parkerised steel and black polymer; accent: oxide red #CC2435 band on the handguard. **At 32 px:** Against the Hellraiser service rifle: a big belt box on the side and a bipod.

**43. `weapon-hellraiser_rotary.png`** | Hellraiser rotary | Hellraiser Divisions
> **Subject:** Ground near it stops being ground: a 200-round rotary cannon (18 kg), spin-up first. **Silhouette feature:** a cluster of six barrels in a ring with a front brake collar and a large ammunition drum. **Materials and accent:** heavy dark steel, scorched barrel tips, scuffed black; accent: oxide red #CC2435. **At 32 px:** Against the LMG: six barrels in a ring and a round drum, not a single barrel and a box.

**44. `weapon-smetanita_thumper.png`** | Smetanita thumper | Smetanita Conjunction (crime family)
> **Subject:** A grenade thumper: "Smetanita property. Return it or else." Single 40 mm shot, a fat break-action barrel (4.5 kg). **Silhouette feature:** a very fat short barrel, a break-action hinge, and a stubby wooden stock with brass-capped corners. **Materials and accent:** lacquered black steel, brass fittings and a small brass tag (blank); accent: brass and gold.

**45. `weapon-breacher_tube.png`** | Breacher tube | Thousand World Legion
> **Subject:** The Legion's door, and the wall it was in: a single-shot rocket tube (8 kg). **Silhouette feature:** a long smooth tube flared at the rear, a folded iron sight, a shoulder pad and a grip. **Materials and accent:** plain olive-drab painted tube, scuffed; accent: none, a single pale stripe near the muzzle. **At 32 px:** Against the thumper: a plain long tube, not a fat shotgun body.

**46. `weapon-purifier_flamer.png`** | Purifier flamer | Lumeri Church
> **Subject:** The Lumeri insist it's a sacrament: a fuel-fed flamer (12 kg, a 3-tile line). **Silhouette feature:** a censer-shaped brass nozzle with lancet windows, hoses to a canister on the back, a small pilot flame. **Materials and accent:** ivory-painted steel with gold bands and brass nozzle; accent: Lumeri gold #F2C46A, a small contained pilot flame at the tip.

### Batch 7: bows and crossbows

Family paragraph: **Bows and crossbows**.

**47. `weapon-recurve_bow.png`** | Recurve bow | Frontier (unbranded)
> **Subject:** Quiet, cheap, and it never jams: a short recurve bow (1.5 kg). **Silhouette feature:** a double-curved recurve limb shape, a wrapped grip and a taut string, a short arrow rest. **Materials and accent:** pale wood with sinew wraps, dark string, a hint of green-brown painted wear; accent: none. **At 32 px:** Against the longbow: short and strongly curved.

**48. `weapon-crossbow.png`** | Crossbow | Frontier (unbranded)
> **Subject:** Patience, cranked: a heavy crossbow with a windlass (55 damage, 1 bolt, 4 kg). **Silhouette feature:** a thick steel prod, a stirrup in front, a cranking windlass at the rear and one bolt loaded. **Materials and accent:** dark steel, plain wooden stock, rope string, iron bolt; accent: none.

**49. `weapon-longbow.png`** | Longbow | Frontier (unbranded)
> **Subject:** Over the wall and through the roof: a tall, plain longbow (2 kg). **Silhouette feature:** a very tall, nearly straight limb with notched tips and a plain leather grip. **Materials and accent:** a single dark stave with a golden sheen, string; accent: none. **At 32 px:** Against the recurve bow: much taller and nearly straight.

**50. `weapon-repeating_crossbow.png`** | Repeating crossbow | Arkvelton
> **Subject:** An Arkvelton toy that got out of hand: a repeating crossbow with a six-bolt magazine (3.5 kg). **Silhouette feature:** a boxy bolt magazine on top and a lever on the side under a slim steel prod. **Materials and accent:** polished dark wood, steel prod and violet-stained inlay lines (Soul witches' craft); accent: violet #AE9BFF inlay. **At 32 px:** Against the crossbow: it has a magazine box on top and a lever instead of a windlass.

### Batch 8: light blades and tools

Family paragraph: **Light blades and tools**.

**51. `weapon-sabre.png`** | Sabre | Officer's weapon
> **Subject:** An officer's argument: a light curved sabre (1.5 kg). **Silhouette feature:** a single curved edge, a knuckle bow and a swept guard. **Materials and accent:** polished steel, gilt knuckle bow and leather grip; accent: gilt.

**52. `weapon-throwing_knives.png`** | Throwing knives | Frontier
> **Subject:** Four problems, four solutions: a set of four balanced throwing knives (0.8 kg), thrown two at a time. **Silhouette feature:** four identical slim ringed-pommel knives fanned tight on a leather strip. **Materials and accent:** blackened steel, plain leather strip; accent: none. **At 32 px:** Against the combat knife: slender, four of them, ring pommels, no guard.

**53. `weapon-hatchet.png`** | Hatchet | Frontier (unbranded)
> **Subject:** A frontier tool first, a weapon whenever needed: a one-handed hatchet (1 kg), double damage to cover. **Silhouette feature:** a single broad bit with a small notch, a short haft with a wrapped grip. **Materials and accent:** bright worn steel head, wood haft with leather wraps; accent: none.

**54. `weapon-legion_gladius.png`** | Legion gladius | Thousand World Legion
> **Subject:** Made for the second rank of a shield wall: a short broad leaf-blade (1.3 kg). **Silhouette feature:** a short broad leaf blade with a stout plain guard. **Materials and accent:** olive-grey grip, plain steel; accent: none, anonymous. **At 32 px:** Against the combat knife: broader, with a proper guard.

**55. `weapon-kemizuchi_duelling_blade.png`** | Kemizuchi duelling blade | Kemizuchi Military Academy
> **Subject:** The school across town settles things with this: a slim lunging duelling blade, reach 2 (1.2 kg). **Silhouette feature:** a very slim straight blade and a swept dish guard. **Materials and accent:** bright steel, lacquered black grip with crimson cord #86234E; accent: lacquer crimson. **At 32 px:** Against the sabre: straight, slimmer, with a dish guard; the sabre curves.

### Batch 9: heavy blades, blunt and polearms

Family paragraph: **Heavy blades, blunt weapons and polearms**.

**56. `weapon-ork_machete.png`** | Ork machete | Orks
> **Subject:** Orks don't make tools. They make machetes: a heavy wide cleaver blade (3 kg). **Silhouette feature:** a wide, uneven jagged-backed blade with a belly, and a grip with nails through the leather. **Materials and accent:** rusted steel, oily dark leather, nails; accent: dirty ochre paint daubs.

**57. `weapon-maul.png`** | Maul | Frontier / dockside
> **Subject:** It doesn't cut. It explains: a two-handed maul (7 kg). **Silhouette feature:** a massive square hammer head with a flat face and a pein on a long ash haft. **Materials and accent:** dark iron head, banded haft; accent: none. **At 32 px:** It must be the largest head of the melee set: a block of iron.

**58. `weapon-lance.png`** | Lance | Adamantile Brigade
> **Subject:** Adamantile knights don't stop. They arrive: a long lance with a vamplate hand guard (reach 2, 3 kg). **Silhouette feature:** a long tapering steel point and a round vamplate guard, with a short attached crest plume near the head. **Materials and accent:** pale steel head, dark wood shaft, gilt crest; accent: Brigade gilt and brass-orange #F68A38.

**59. `weapon-war_axe.png`** | War axe | Frontier / mercenary
> **Subject:** Plate is just a slower kind of skin: a two-handed war axe that strips armour (3.5 kg). **Silhouette feature:** a broad axe head with a long hooked beard and a spike on the back. **Materials and accent:** dark steel head, ash haft, chips on the edge; accent: none. **At 32 px:** Against the hatchet: huge, two-handed, with the beard and the back spike.

**60. `weapon-adamantile_greatsword.png`** | Adamantile greatsword | Adamantile Brigade
> **Subject:** The Brigade's way of saying "stand back": a great sweeping two-handed sword (4 kg). **Silhouette feature:** a wide flat blade, an oversized plate guard and a crest on the pommel. **Materials and accent:** pale steel, gilt crest, plate guard; accent: Brigade gilt and brass-orange #F68A38. **At 32 px:** Against the Legion gladius: long, wide, plated and crested.

**61. `weapon-glaive.png`** | Glaive | Frontier / Legion guard
> **Subject:** The space around you is yours: a glaive with a curved blade on a long pole (reach 2, 3.5 kg). **Silhouette feature:** a long curved single-edge blade with a small hook at the base, on a pole. **Materials and accent:** dark steel blade, ash pole with leather wrap; accent: none.

**62. `weapon-ork_rip_saw.png`** | Ork rip-saw | Orks
> **Subject:** Ork engineering: loud, sharp, and on fire: a chain-toothed rip-saw that leaves a target bleeding (6 kg). **Silhouette feature:** a long toothed chain bar with a welded exhaust stack and a rusted engine block grip. **Materials and accent:** rust, scorched steel, welded plates, nails; accent: dirty ochre daubs, soot black.

### Batch 10: unarmed

Family paragraph: **Unarmed and natural weapons**.

**63. `weapon-knuckledusters.png`** | Knuckledusters | Frontier
> **Subject:** A bar argument that brought friends: a knuckle-duster set of four rings and a bar (0.3 kg). **Silhouette feature:** four finger rings joined by a heavy bar with rounded bumps. **Materials and accent:** worn brass with dull edges; accent: brass.

**64. `weapon-hellraiser_servo_fist.png`** | Hellraiser servo-fist | Hellraiser Divisions
> **Subject:** A mining tool the Hellraisers misread: a servo-assisted power gauntlet that pushes a target 2 tiles (2.5 kg, electronic). **Silhouette feature:** a boxy gauntlet with an exposed piston and hydraulic hoses over the knuckles, and trench spikes. **Materials and accent:** dark steel, rubbed black rubber hoses, hazard scuffs; accent: oxide red #CC2435.

**65. `weapon-beast_bite.png`** | Bite and claws | Companion only
> **Subject:** A beast companion's own weapon: bite and claws (not a carried item; for completeness). **Silhouette feature:** a cluster of curved claws and long fangs arranged on a bone-pale plinth shape. **Materials and accent:** bone-ivory, darker tips; accent: none. **At 32 px:** Low priority: a companion has no backpack.

### Batch 11: thrown and explosives

Family paragraph: **Grenades and explosives**.

**66. `weapon-frag_grenade.png`** | Frag grenade | Frontier / Legion issue
> **Subject:** Pull, count, apologise: a fragmentation grenade (0.5 kg), 2-tile blast. **Silhouette feature:** an egg shape with segmented ridges, a spoon lever and a pin ring. **Materials and accent:** olive-drab steel, bright pin; accent: none.

**67. `weapon-smoke_grenade.png`** | Smoke grenade | Frontier / Legion issue
> **Subject:** Not a weapon: a permission slip. A smoke grenade (blocks sight for 2 rounds). **Silhouette feature:** a cylinder with a vented top and a pull ring. **Materials and accent:** a pale grey-white canister with a thick dark band; accent: none. **At 32 px:** Against the frag grenade: a cylinder with a pale band, not an egg.

**68. `weapon-flashbang.png`** | Flashbang | Lumeri riot police
> **Subject:** Lumeri riot police swear by them: a flashbang that blinds for a round. **Silhouette feature:** a squat cylinder with slotted vent windows and a gilt band. **Materials and accent:** ivory-painted steel with a thin gold band and a pull ring; accent: Lumeri gold #F2C46A. **At 32 px:** Against the smoke grenade: squat and ivory with slits.

**69. `weapon-satchel_charge.png`** | Satchel charge | Frontier / sappers
> **Subject:** Some problems are best solved from the next room: a satchel charge (120 damage, 3 kg) that destroys cover. **Silhouette feature:** a canvas satchel with a strap and several blocks of charge showing, a short fuse lead tied back, and a detonator box. **Materials and accent:** tan canvas, dull red blocks, a fraying wire; accent: faded red.

**70. `weapon-incendiary_grenade.png`** | Incendiary grenade | Frontier
> **Subject:** The frontier's least favourite smell: an incendiary grenade that sets the tile burning. **Silhouette feature:** a perforated sleeve around a canister, scorched at the vents. **Materials and accent:** a red-black canister, heat-warped, orange glint at the vents; accent: ember orange.

**71. `weapon-bot_scrambler.png`** | Bot-scrambler | Science Team surplus
> **Subject:** Science Team surplus, sold out the back door: a bot-scrambler that stuns robots and jams mana weapons. **Silhouette feature:** a flat puck shape with a short antenna stub and a hex core window. **Materials and accent:** matte grey casing, a glowing hex core window; accent: Mind cyan #4FC8DF, contained.

### Batch 12: mana arms

Family paragraph: **Mana arms**.

**72. `weapon-core_rifle.png`** | Science Team core rifle | Science Team
> **Subject:** The Science Team's proof that mana is a munition: a rifle that fires from a mana core (10 charge, 5 kg). **Silhouette feature:** a hexagonal core window glowing on the receiver and a precise straight-line body with a fine barrel. **Materials and accent:** pale grey ceramic and dark steel with exact lines; accent: Mind cyan #4FC8DF in the core window only. **At 32 px:** Against other rifles: a hex window and fine glowing seams, no magazine.

**73. `weapon-spellslinger_pistol.png`** | Spellslinger's pistol | Sigil arms (Science Team)
> **Subject:** Every magazine is a letter. Some are threats: a pistol that fires sigil-etched magazines (12 rounds, 1.1 kg). **Silhouette feature:** a sleek pistol with etched glyph lines running over the slide and a hexagonal inlay in the grip. **Materials and accent:** dark steel with fine cyan-etched lines; accent: Mind cyan #4FC8DF.

**74. `weapon-evoker_blade.png`** | Evoker blade | Blade Scribes (Sigil)
> **Subject:** The Blade Scribes write with the edge: a blade that counts as an Evoker (1.8 kg). **Silhouette feature:** a straight blade with a glyph line etched into the fuller and a hex core window in the guard. **Materials and accent:** bright steel, dark grip, cyan glow only in the window and the etched line; accent: Mind cyan #4FC8DF.

**75. `weapon-emanator_gauntlet.png`** | Emanator gauntlet | Storm Hand (Soul)
> **Subject:** The Storm Hand's heart goes into the fist: a gauntlet that counts as an Emanator and stores charge (1.5 kg). **Silhouette feature:** a heavy gauntlet with a round emitter lens in the knuckle plate and a line running to the cuff. **Materials and accent:** rounded dark steel and violet-dyed leather; accent: Soul violet #AE9BFF in the lens.

**76. `weapon-lumeri_censer_gun.png`** | Lumeri censer gun | Lumeri Church
> **Subject:** The Church fires its prayers at range: a two-handed censer gun carrying a Blessing in a shell (4.5 kg). **Silhouette feature:** a short gun barrel with a suspended brass censer chamber beneath it, lancet windows, a chain and vent holes. **Materials and accent:** ivory-painted steel, brass censer, gold; accent: Lumeri gold #F2C46A, no smoke.

**77. `weapon-bot_thread_banner.png`** | Bot-thread banner | Banner Dancers
> **Subject:** Banner Dancers fight armourless. The banner is the armour: a pole with a woven bot-thread banner (reach 2, 3 kg). **Silhouette feature:** a long pole with a spear tip and a narrow banner woven of fine glinting threads, attached along the pole. **Materials and accent:** dark pole, a banner of thread woven in two colours; accent: Mind cyan #4FC8DF and Soul violet #AE9BFF threads.

**78. `weapon-grand_staff.png`** | Grand staff | Grand Sigilists
> **Subject:** No description in data. Read from the rules: a two-handed staff that counts as an Evoker; a Grand Sigilist plants it to raise a Grand form (2.5 kg). **Silhouette feature:** a tall staff with a hexagonal core cradle at the head and a heavy metal planting spike at the foot. **Materials and accent:** dark wood and steel, a faint cyan core; accent: Mind cyan #4FC8DF.

### Batch 13: shields

Family paragraph: **Shields**.

**79. `shield-buckler.png`** | Buckler | Frontier
> **Subject:** A small round shield for parries (2 kg). **Silhouette feature:** a round steel face with a raised central boss and rivets round the rim. **Materials and accent:** dull steel, a leather strap peeking at the edge, scuffs; accent: none.

**80. `shield-riot_shield.png`** | Legion riot shield | Thousand World Legion
> **Subject:** A tall curved riot shield, slow to carry (7 kg). **Silhouette feature:** a tall rectangular curved face with a narrow viewport slit and a dented edge. **Materials and accent:** plain olive-grey painted steel, scuffed; accent: none, anonymous.

**81. `shield-pavise.png`** | Pavise | Frontier / mercenary
> **Subject:** Carried, it does nothing. Planted, it becomes full cover (10 kg, 80 HP). **Silhouette feature:** a tall wide board with a centre ridge and a folded prop leg behind it, standing on the ground edge. **Materials and accent:** dark wood boards with iron bands and rivets; accent: none. **At 32 px:** It must read as taller and wider than the riot shield and plainly wooden.

### Batch 14: armour pieces

Family paragraph: **Armour by weight, and clothing**.

**82. `armour-field_helmet.png`** | Field helmet | Thousand World Legion
> **Subject:** A plain padded field helmet: +Injury resistance (1.2 kg). **Silhouette feature:** an open-face rounded shell with a chin strap and a padded rim. **Materials and accent:** olive-grey painted steel, canvas strap; accent: none.

**83. `armour-ballistic_helmet.png`** | Ballistic helmet | Adamantile / heavy line
> **Subject:** A heavy ballistic helmet: +armour (2 kg). **Silhouette feature:** a deep helmet with a thick brow guard and a flat face shield cut-out. **Materials and accent:** dark ceramic plate steel with chipped paint; accent: none. **At 32 px:** Against the field helmet: deeper, fuller, with the brow.

**84. `armour-night_goggles.png`** | Night-sight goggles | Science Team surplus
> **Subject:** Night-sight goggles: darkness doesn't halve your sight (0.6 kg). **Silhouette feature:** a pair of chunky twin lens tubes on a strap. **Materials and accent:** dark rubber, steel, lenses with a pale cyan sheen; accent: Mind cyan #4FC8DF.

**85. `armour-gas_mask.png`** | Gas mask | Frontier / Legion
> **Subject:** A gas mask: toxic spills don't hurt you (0.8 kg). **Silhouette feature:** a close-fitting mask with two round filter canisters and wide lenses. **Materials and accent:** black rubber, olive canisters; accent: none. **At 32 px:** Against the night goggles: a full mask with canisters.

**86. `armour-prescription_glasses.png`** | Prescription glasses | Civilian
> **Subject:** Thick lenses. A thin pair of spectacles (0.05 kg). **Silhouette feature:** thick round lenses, bent on the frame at one temple. **Materials and accent:** thin dark wire frame, clear thick lenses; accent: none.

**87. `armour-smiling_mask.png`** | Smiling mask | Civilian / theatre
> **Subject:** A mask with a fixed smile (0.3 kg): The Mask trait. **Silhouette feature:** a pale half-face mask with a fixed carved smile, an elastic strap, and a slight crack across one cheek. **Materials and accent:** ivory-white ceramic with a dark inner shadow; accent: none; not Wick's face.

**88. `armour-padded_undershirt.png`** | Padded undershirt | Civilian
> **Subject:** A padded undershirt worn beneath armour (1 kg). **Silhouette feature:** a quilted body garment laid out, with stitched diamond seams. **Materials and accent:** faded grey-blue quilting; accent: none.

**89. `armour-trauma_plate.png`** | Trauma plate insert | Adamantile / heavy line
> **Subject:** A rigid trauma-plate insert (2 kg). **Silhouette feature:** a flat rectangular plate with chamfered corners and a curved top edge. **Materials and accent:** ivory ceramic with chips exposing darker underlayer; accent: none.

**90. `armour-utility_belt.png`** | Utility belt | Frontier
> **Subject:** A utility belt: carry limit up (0.6 kg). **Silhouette feature:** a thick belt with three pouches and a buckle. **Materials and accent:** weathered brown leather and canvas, brass buckle; accent: brass.

**91. `armour-armoured_belt.png`** | Armoured belt | Adamantile / heavy line
> **Subject:** An armoured belt (1.5 kg). **Silhouette feature:** a belt with overlapping steel plate segments and a heavy buckle. **Materials and accent:** dark steel plates on leather; accent: none.

**92. `armour-armoured_greaves.png`** | Armoured greaves | Adamantile Brigade
> **Subject:** Armoured greaves: +armour, slower (3 kg). **Silhouette feature:** a pair of shaped shin plates with knee cups, shown as a pair side by side. **Materials and accent:** pale steel, gilt trim; accent: Brigade gilt and brass-orange #F68A38.

**93. `armour-runner_trousers.png`** | Runner's trousers | Civilian / courier
> **Subject:** Runner's trousers: faster movement (0.8 kg). **Silhouette feature:** slim tapered trousers with zipped calf panels, rolled at the ankle. **Materials and accent:** dark grey technical cloth; accent: a fine amber stripe down the seam.

**94. `armour-work_gloves.png`** | Work gloves | Civilian
> **Subject:** Plain work gloves: +unarmed damage (0.3 kg). **Silhouette feature:** a pair of thick stitched gloves, hands slightly cupped. **Materials and accent:** tan leather, black stitch; accent: none.

**95. `armour-combat_gloves.png`** | Combat gloves | Frontier / Legion
> **Subject:** Combat gloves: +armour (0.4 kg). **Silhouette feature:** a pair of gloves with hard knuckle plates and padded palms. **Materials and accent:** black leather, dark steel knuckle plates; accent: none. **At 32 px:** Against work gloves: black with knuckle plates.

**96. `armour-field_boots.png`** | Field boots | Frontier
> **Subject:** Field boots: rough ground costs no extra (1.2 kg). **Silhouette feature:** a pair of lace-up boots with deep lugged soles. **Materials and accent:** worn brown leather, mud-dark soles; accent: none.

**97. `armour-heavy_boots.png`** | Heavy boots | Adamantile / heavy line
> **Subject:** Heavy boots: +armour, +Injury resistance (2 kg). **Silhouette feature:** a pair of boots with steel toe caps and ankle plates. **Materials and accent:** dark steel and black leather; accent: none. **At 32 px:** Against field boots: bulky, metal-capped, black.

**98. `armour-torso_class4_assault.png`** | armour-torso_class4_assault | Adamantile Brigade
> **Subject:** Torso armour class 4 (Assault, 18 kg). **Silhouette feature:** full cuirass and collar plates with pauldrons and a crest at the neck. **Materials and accent:** pale steel, gilt trim; accent: Brigade gilt.

**99. `armour-torso_class5_juggernaut.png`** | armour-torso_class5_juggernaut | Adamantile Brigade (ceremonial heavy)
> **Subject:** Torso armour class 5 (Juggernaut, 28 kg). **Silhouette feature:** massive layered plates with a high gorget, pauldrons like slabs, and a crest. **Materials and accent:** pale steel and gilt, heavy rivets; accent: Brigade gilt and brass-orange #F68A38. **At 32 px:** Against class 4: layered and massive, with a huge collar.

### Batch 15: the third and fourth focus (the Visualizer, the Attuner)

Family paragraph: **Focuses: the four gloves**.

**100. `focus-visualizer.png`** | Visualizer | Expression arms (coming in Classes 3.0)
> **Subject:** The Expression focus, an Evoker for artists, coming in Classes 3.0 (not yet in items.json; see docs/design/figments-spec.md). A hand-worn glove, palm held out: nanobots build what is pictured in the light of the projector set in the middle of the palm. Holds one mana core of its own (10 charge). **Silhouette feature:** a single glove, palm toward the viewer, with a projector lens set in the middle of the palm as the silhouette feature, ringed by a small emitter bezel, fingers slightly spread. **Materials and accent:** pale ceramic and dark grey leather, in the same glove family as the other two; accent: Expression #5394AC glow from the palm lens, contained, no bloom. **At 32 px:** Against the Evoker and Emanator: palm out, a big central projector bezel and spread fingers.

**148. `focus-attuner.png`** | Attuner | Insight arms (coming in Classes 3.0; added 13 Nov)
> **Subject:** The Insight focus, the fourth standard glove of the gear companies' line, coming in Classes 3.0 (not yet in items.json; see docs/design/bonds-spec.md, 0.4 kg, off hand, one hand). Its wearer feels the people around them, friend or foe: fine threads run from the glove to whoever is Bonded. A hand-worn glove, back of the hand toward the viewer, no hand inside. **Silhouette feature:** a small round core set on the back of the hand, and from it a fan of very fine filaments laid along the back of the hand and each finger to its fingertip (five thin lines, one to each tip, like the veins of a leaf), with one of the five filaments lit; fingers slightly curled as if just closed on a thread. The cuff is plain. **Materials and accent:** the same pale ceramic and dark grey leather as the Visualizer, thin brass-grey wire for the filaments; accent: Insight rose #EB95B7, only in the small core and in the one lit filament, contained, no bloom. **At 32 px:** Against the Evoker (angular, one hexagonal window) and the Visualizer (palm out, big lens): the Attuner is back-of-hand with a round dot and a fan of thin lines to the fingertips, one of them rose.

### Batch 16: consumables, tools, lights, food, documents, loot, augment, companion

Family paragraph: **Consumables, tools, lights, food, documents, loot**.

**101. `consumable-essence_of_experience.png`** | Essence of Experience | Mana
> **Subject:** Experience sealed in mana (0.1 kg): crack it for XP. **Silhouette feature:** a glass ampoule with a thick cork collar, motes of light swirling inside. **Materials and accent:** clear glass, brass collar; accent: warm pale gold-white light, contained (not cyan or violet).

**102. `consumable-sigil_plate.png`** | Sigil plate | Science Team
> **Subject:** A slate with one Sigil word cut into it (0.3 kg). **Silhouette feature:** a rectangular slate with one abstract glyph cut as a groove (no letters). **Materials and accent:** dark slate; accent: Mind cyan #4FC8DF in the groove.

**103. `consumable-heart_plate.png`** | Heart plate | Soul arms
> **Subject:** A violet-veined slate holding one Outburst lesson (0.3 kg). **Silhouette feature:** a rectangular slate with violet veins and one ribbon-like cut line. **Materials and accent:** dark slate; accent: Soul violet #AE9BFF veins. **At 32 px:** Against the sigil plate: veined and ribbon-cut, not a straight glyph.

**104. `light-torch.png`** | Torch | Frontier
> **Subject:** A simple torch (0.6 kg): lights 4 tiles, burns 30 minutes. **Silhouette feature:** a wrapped, tarred head on a short stick, burning with a small painted flame. **Materials and accent:** dark wood, tar-black head; accent: warm orange flame.

**105. `light-flare.png`** | Flare | Frontier
> **Subject:** A flare (0.3 kg): lights 6 tiles for 3 rounds, used up. **Silhouette feature:** a thick red cardboard-like tube with a cap and a striker end, one end sputtering. **Materials and accent:** red tube, steel cap; accent: red #F65157 and white-hot tip.

**106. `tool-musek_blestor.png`** | Musek Blestor | Musek
> **Subject:** A palm-sized player with a speaker that can fill a hangar (0.3 kg). **Silhouette feature:** a chunky box with a big round speaker grille, a dial and a stubby carry loop. **Materials and accent:** dented brass-grey casing, dark mesh grille; accent: brass and an amber dial.

**107. `tool-toolbox.png`** | Toolbox | Mechanics
> **Subject:** Spanners, a crimper, wire (3 kg). **Silhouette feature:** a closed hinged toolbox with a handle, a spanner end poking out of the lid. **Materials and accent:** dented red-brown steel, brass latch; accent: muted red.

**108. `tool-grimoire.png`** | Grimoire | Unknown
> **Subject:** Notes in a hand older than the cover (1.2 kg). **Silhouette feature:** a thick old book with a cracked cover, a brass clasp and an abstract glyph embossed on the cover (no letters). **Materials and accent:** dark cracked leather, brass; accent: faded gold.

**109. `food-bottle_of_spirits.png`** | Bottle of spirits | Civilian
> **Subject:** Something strong (0.8 kg): the Lunarshine trait. **Silhouette feature:** a squat bottle with a cork and a blank label. **Materials and accent:** dark glass, amber liquid; accent: amber.

**110. `food-cigarettes.png`** | Pack of cigarettes | Civilian
> **Subject:** Twenty cigarettes (0.05 kg): the Chain Smoker trait. **Silhouette feature:** a small soft pack with a flap open and one cigarette peeking out, with a blank face. **Materials and accent:** pale card pack, no markings; accent: none.

**111. `loot-contraband.png`** | Contraband | Underworld
> **Subject:** Something the law wants back (1 kg): the Narrator decides what it is. **Silhouette feature:** a taped brick-shaped parcel wrapped in oilcloth and twine, a customs seal broken. **Materials and accent:** dark oilcloth, twine, wax seal; accent: dull red wax.

**112. `loot-personal_effects.png`** | loot-personal_effects | Everyone
> **Subject:** What a person carries: personal effects dropped as loot, twenty named oddments (a letter, a lighter, a charm). **Silhouette feature:** a small battered tin with the lid ajar and a folded letter and a chain poking out. **Materials and accent:** dented tin, worn paper; accent: none. **At 32 px:** One generic icon covers all twenty; they are not drawn one by one.

**113. `document-city_id.png`** | Central City ID | Central City
> **Subject:** Proof of residence in Central City. **Silhouette feature:** a card with a blank photo window, a holo strip and a small circular stamp (no text, no face). **Materials and accent:** white-ivory card, blue-grey holo strip; accent: Central City blue-grey #5394AC.

**114. `document-bank_card.png`** | Bank card | Central City
> **Subject:** An account in a Central City bank. **Silhouette feature:** a chipped card with a gold chip and a stripe, a corner worn. **Materials and accent:** dark card, gold chip; accent: gold.

**115. `augment-prosthetic_arm.png`** | Prosthetic arm | Augmentation
> **Subject:** A working arm of metal and wire (a part that can go offline). **Silhouette feature:** a full arm without a hand: a sleeve of plates, an exposed servo at the elbow, wire bundles and a shoulder socket cuff; show a hand shape only as a capped wrist. **Materials and accent:** dark steel, brass wire, rubbed wear; accent: Mind cyan #4FC8DF as one tiny status light.

**116. `companion-drone_frame.png`** | Drone frame | Science Team
> **Subject:** A folding combat drone (4 kg). **Silhouette feature:** a folded quad-rotor frame with four arms, a belly gun mount and a single sensor eye. **Materials and accent:** matte grey frame, dark rotors; accent: Mind cyan #4FC8DF in the sensor lens.

**149. `consumable-toxin_vial.png`** | Toxin vial | Underworld / Operatives (coming in Classes 3.0; added 13 Nov)
> **Subject:** One dose of toxin: the Operative coats a weapon with it (a blade's edge, an arrow, a thrown weapon, a gun's next rounds) and the hit leaves its target Weakened, Slowed or Bleeding. A pack item, used up. Not in items.json yet (see docs/design/rev4-primitives.md section 3.7). **Silhouette feature:** a slim, flat-sided glass phial with a wax-sealed neck and a small dropper cap, laid at a slight diagonal, a leather loop around its neck, and two pale hatch bars painted across the glass as a plain warning band (no symbol, no skull, no text). **Materials and accent:** dark glass, brass dropper cap, oilcloth tie; accent: Perception sea-teal #40BAA0 liquid, a muted tint inside the glass only. **At 32 px:** Against the stim injector (a white pen) and the Essence of Experience (a round ampoule with a cork collar, gold-white): a thin dark phial with a teal fill and a dropper cap.

### Batch 17: weapon mods

Family paragraph: **Weapon mods**.

**117. `mod-red_dot.png`** | Red dot sight | Gun mod (optic)
> **Subject:** Optic: red dot sight (0.1 kg). **Silhouette feature:** a small open tube sight with a glass window and a faint red dot. **Materials and accent:** black body, glass; accent: red #F65157 dot.

**118. `mod-scope.png`** | Scope | Gun mod (optic)
> **Subject:** Optic: scope (0.4 kg). **Silhouette feature:** a long tube with a bell-shaped front lens and two turret knobs. **Materials and accent:** dark steel body, lens glint; accent: none. **At 32 px:** Against the red dot: much longer, with the bell and turrets.

**119. `mod-suppressor.png`** | Suppressor | Gun mod (muzzle)
> **Subject:** Muzzle: suppressor (0.3 kg). **Silhouette feature:** a plain cylinder with the internal baffles hinted, a threaded end. **Materials and accent:** matte black; accent: none.

**120. `mod-compensator.png`** | Compensator | Gun mod (muzzle)
> **Subject:** Muzzle: compensator (0.2 kg). **Silhouette feature:** a short block with slotted ports on top and a threaded rear. **Materials and accent:** dark steel, scorched ports; accent: none. **At 32 px:** Against the suppressor: short, with ports, not a smooth tube.

**121. `mod-extended_mag.png`** | Extended magazine | Gun mod (magazine)
> **Subject:** Magazine: extended magazine (0.2 kg). **Silhouette feature:** a long curved box magazine with a ridged body and a base plate. **Materials and accent:** dark steel and polymer, an amber round visible at the top; accent: amber.

**122. `mod-quick_release.png`** | Quick-release magazine | Gun mod (magazine)
> **Subject:** Magazine: quick-release magazine (0.1 kg). **Silhouette feature:** a standard magazine with a release paddle at the top and a spring-loaded floor plate. **Materials and accent:** black polymer, a bright release paddle; accent: Agility gold #E3BF51 paddle. **At 32 px:** Against the extended magazine: short, with the paddle.

**123. `mod-foregrip.png`** | Foregrip | Gun mod (underbarrel)
> **Subject:** Underbarrel: foregrip (0.2 kg). **Silhouette feature:** a vertical ribbed grip on a short mounting rail. **Materials and accent:** black polymer, ribbed; accent: none.

**124. `mod-bayonet.png`** | Bayonet | Gun mod (underbarrel)
> **Subject:** Underbarrel: bayonet (0.4 kg, 15 damage). **Silhouette feature:** a short knife blade on a barrel-ring mount with a mounting lug. **Materials and accent:** dark blade, steel ring; accent: none.

**125. `mod-underslung.png`** | Underslung launcher | Gun mod (underbarrel)
> **Subject:** Underbarrel: underslung launcher (1.5 kg), one 40 mm round. **Silhouette feature:** a short fat single-barrel launcher with its own trigger and handguard. **Materials and accent:** dark steel and black polymer; accent: none. **At 32 px:** Against the foregrip: a fat tube with a trigger.

**126. `mod-serrated.png`** | Serrated edge | Melee mod (edge)
> **Subject:** Edge: serrated edge (0.1 kg). **Silhouette feature:** a clip-on blade strip with saw teeth. **Materials and accent:** bright steel; accent: none.

**127. `mod-weighted.png`** | Weighted head | Melee mod (edge)
> **Subject:** Edge: weighted head (0.5 kg). **Silhouette feature:** a heavy iron sleeve clamped round a blunt shaft. **Materials and accent:** dark iron, bolts; accent: none.

**128. `mod-wrapped_grip.png`** | Wrapped grip | Melee mod (grip)
> **Subject:** Grip: wrapped grip (0.1 kg). **Silhouette feature:** a hilt shape wrapped tightly in leather cord with a pommel knob. **Materials and accent:** tan cord over dark leather; accent: none.

**129. `mod-sigil_magazine.png`** | Sigil-etched magazine | Sigil arms
> **Subject:** Inscription: a sigil-etched magazine (0.1 kg), stores one Sigil spell. **Silhouette feature:** a pistol magazine etched with one glowing glyph line. **Materials and accent:** dark steel, etched glyph; accent: Mind cyan #4FC8DF.

### Batch 18: special ammunition

Family paragraph: **Special ammunition**.

**130. `ammo-armor_piercing.png`** | Armour-piercing rounds | Special ammunition
> **Subject:** Armour-piercing rounds: ignore armour, 20% less damage. **Silhouette feature:** a handful of cartridges with long needle-thin dark tips and a black band. **Materials and accent:** steel casing, black tungsten tips; accent: none. **At 32 px:** At 32 px tell them apart by tip colour: black, bright brass cut, orange, cyan.

**131. `ammo-hollow_point.png`** | Hollow-point rounds | Special ammunition
> **Subject:** Hollow-point rounds: 30% more damage, armour counts double. **Silhouette feature:** a handful of cartridges with open flower-cut tips. **Materials and accent:** brass casing, bright cut tips; accent: none.

**132. `ammo-incendiary.png`** | Incendiary rounds | Special ammunition
> **Subject:** Incendiary rounds: set the target Burning. **Silhouette feature:** a handful of cartridges with red-orange sealed tips and a band. **Materials and accent:** brass casing, ember-red tips; accent: ember orange.

**133. `ammo-enhanced.png`** | Enhanced rounds | Special ammunition (mana)
> **Subject:** Enhanced rounds: ignore armour, Elemental damage, raise the mana meter. **Silhouette feature:** a handful of cartridges with etched glyph lines and glowing seams. **Materials and accent:** grey casing; accent: Mind cyan #4FC8DF.

### Batch 19: loose rounds by calibre

Family paragraph: **Loose rounds by calibre**.

**134. `rounds-shell.png`** | rounds-shell | Ammunition (loose: Shell)
> **Subject:** Shell: shotgun shells (one stack per calibre in the pack). **Silhouette feature:** three fat shells standing and one tipped, rimmed bases. **Materials and accent:** red paper cases with brass heads; accent: red #CC2435.

**135. `rounds-700.png`** | rounds-700 | Ammunition (loose: .700 Blackpoint)
> **Subject:** .700 Blackpoint: the huge anti-materiel round (0.12 kg each) (one stack per calibre in the pack). **Silhouette feature:** two enormous cartridges, one standing and one lying, thick as fingers. **Materials and accent:** brass with dark grey tips.

**136. `rounds-arrow.png`** | rounds-arrow | Ammunition (loose: Arrow)
> **Subject:** Arrow: arrows (0.03 kg each) (one stack per calibre in the pack). **Silhouette feature:** a bundle of three arrows with fletching and broad heads, tied. **Materials and accent:** wood shafts, grey fletching, steel heads.

**137. `rounds-bolt.png`** | rounds-bolt | Ammunition (loose: Bolt)
> **Subject:** Bolt: crossbow bolts (0.04 kg each) (one stack per calibre in the pack). **Silhouette feature:** three short heavy bolts with blunt steel heads and tiny vanes. **Materials and accent:** dark wood, steel.

**138. `rounds-50_frontier.png`** | rounds-50_frontier | Ammunition (loose: .50 Frontier)
> **Subject:** .50 Frontier: the hand-cannon round (0.03 kg each) (one stack per calibre in the pack). **Silhouette feature:** three fat rimmed cartridges standing in a row. **Materials and accent:** brass, dull lead noses.

**139. `rounds-40mm_grenade.png`** | rounds-40mm_grenade | Ammunition (loose: 40 mm grenade)
> **Subject:** 40 mm grenade: a 40 mm grenade round (0.25 kg) (one stack per calibre in the pack). **Silhouette feature:** a stubby brass cartridge with a rounded grenade nose and a banded neck. **Materials and accent:** olive nose, brass case; accent: pale band.

**140. `rounds-rocket.png`** | rounds-rocket | Ammunition (loose: Rocket)
> **Subject:** Rocket: a rocket (2.5 kg) (one stack per calibre in the pack). **Silhouette feature:** a finned rocket projectile lying diagonally with a blunt warhead. **Materials and accent:** olive-drab with a pale band; accent: none.

**141. `rounds-fuel_canister.png`** | rounds-fuel_canister | Ammunition (loose: Fuel canister)
> **Subject:** Fuel canister: a flamer fuel canister (1.5 kg) (one stack per calibre in the pack). **Silhouette feature:** a steel canister with a valve and handle and a hazard band. **Materials and accent:** dull steel; accent: ember orange band.

**142. `rounds-core_charge.png`** | rounds-core_charge | Ammunition (loose: Core charge)
> **Subject:** Core charge: a core-rifle charge (0.02 kg) (one stack per calibre in the pack). **Silhouette feature:** a small slim cylindrical charge with a glowing core line. **Materials and accent:** grey metal; accent: Mind cyan #4FC8DF.

### Batch 20: magazines and loaders

Family paragraph: **Magazines and loaders**.

**143. `mag-smg_32.png`** | mag-smg_32 | Magazines
> **Subject:** SMG magazine (.32 Decrkm) (drawn for: Decrkm SMG, Whisper SMG, Legion PDW). **Silhouette feature:** a long straight 30-round stick magazine with a spring slot and a base plate. **Materials and accent:** dark steel; accent: none.

**144. `mag-blackpoint_700.png`** | mag-blackpoint_700 | Magazines
> **Subject:** .700 magazine (drawn for: .700 Blackpoint). **Silhouette feature:** a short fat three-round magazine with a heavy base plate. **Materials and accent:** dark steel, large brass cartridge nose.

**145. `mag-speedloader_50.png`** | mag-speedloader_50 | Magazines
> **Subject:** .50 speedloader (drawn for: Frontier hand cannon). **Silhouette feature:** a round clamp holding five fat cartridges with a twist knob. **Materials and accent:** brass rounds, dark steel clamp.

**146. `mag-drum_32.png`** | mag-drum_32 | Magazines
> **Subject:** Drum magazine (drawn for: Mandestra drum-gun). **Silhouette feature:** a big round 70-round drum with a dished side and a brass trim. **Materials and accent:** lacquered dark red-black, brass; accent: brass.

**147. `mag-belt.png`** | mag-belt | Magazines
> **Subject:** Belt box (drawn for: Hellraiser LMG, Hellraiser rotary). **Silhouette feature:** a squared ammunition box with a hanging cartridge belt. **Materials and accent:** dark steel box, brass belt; accent: oxide red #CC2435 band.

## 4. Rarity and wear (variants, not separate prompts)

The master icon of every item is the **Standard** finish. Rarity is a per-instance field of a weapon (`data/rules.json`
`rarity`: Standard, Fine, Masterwork, Relic, Celestial) and the UI draws the frame and the marks. Rarity is shown on the
object only by **finish and wear**. Do not make variants for the first delivery; they come second, for the weapons the
game gives out first. If asked for a variant, use the item's base prompt (same silhouette, same pose, same scale) and add
one line:

| Tier | Add to the base prompt |
| --- | --- |
| Worn (durability at or under 25%: guns jam, melee is dulled) | "Heavily worn: chipped paint, bare metal showing, rust at the edges, a taped or wired repair, a loose part." |
| Standard | The base prompt. |
| Fine | "Crisp and well kept: polished metal, one thin line of engraving, one small accent in the faction colour." |
| Masterwork | "Hand-finished and flawless: inlay in the faction accent colour, exact edges, rich materials, a calm sense of quality." |
| Relic | "Antique, an heirloom: warm deep patina, a unique ornament or old repair carrying a story, one old inlay." |
| Celestial | "Impossibly perfect: pale unmarked material, a faint contained inner light (ivory-gold) from its seams, as if made by someone with nothing to fear; no bloom." |

Variant file name: `<stem>--worn.png`, `--fine.png`, `--masterwork.png`, `--relic.png`, `--celestial.png`. First
variants wanted, after all Standard icons: the four the loot table already names (`weapon-hellraiser_service_rifle` and
`weapon-legion_pdw` as Fine, `weapon-adamantile_battle_rifle` and `weapon-kemizuchi_duelling_blade` as Masterwork).
Where two items are near-identical in data, the "At 32 px" line in their prompts says what tells them apart; if a pair
still reads the same at 32 px, redo the weaker one with a more different silhouette (do not add a label).

## 5. Inventory (generated from data, not typed)

Generated on 13 Nov 2026 by reading `data/weapons.json`, `data/items.json` and the engine's pack rules; a text number
shown here as a figure is the data's `{=placeholder}` read from its own item. "Mono" = a monoline SVG icon exists today
(`art/icons/weapons`, `armour`, `focus`). **No painted gear sprite exists for any item today**: `art/sprites/objects/`
holds only the 25 map objects. Rarity tiers (Standard, Fine, Masterwork, Relic, Celestial) are a per-instance field of a
weapon (`data/rules.json` `rarity`); none are written per item. The loot table's Notable drops name four rarity
instances: `hellraiser_service_rifle` and `legion_pdw` (fine), `adamantile_battle_rifle` and
`kemizuchi_duelling_blade` (masterwork).

| File | Id | Name | Kind | Maker | Description (from data) | Mono |
| --- | --- | --- | --- | --- | --- | --- |
| `weapon-service_pistol.png` | service_pistol | Service pistol (.32 Decrkm) | weapon / pistol | Decrkm / Central City civilian | Issued to everyone, trusted by no one, carried by all of them. | yes |
| `weapon-drifter_revolver.png` | drifter_revolver | Drifter revolver | weapon / revolver | Frontier (unbranded) | Six chances, and frontier folk count every one. | yes |
| `weapon-decrkm_smg.png` | decrkm_smg | Decrkm SMG (.32 Decrkm) | weapon / smg | Decrkm | Thirty rounds of opinion. | yes |
| `weapon-hellraiser_service_rifle.png` | hellraiser_service_rifle | Hellraiser service rifle | weapon / rifle | Hellraiser Divisions | The Hellraisers' answer to every frontier. | yes |
| `weapon-lever_carbine.png` | lever_carbine | Lever carbine | weapon / rifle | Frontier (unbranded) | Old, honest, and never needs a battery. | yes |
| `weapon-lumeri_scattergun.png` | lumeri_scattergun | Lumeri scattergun | weapon / shotgun | Lumeri Church | The Church calls it a key. | yes |
| `weapon-long_rifle.png` | long_rifle | Long rifle | weapon / rifle | Frontier / marksman | Fired from the next valley over. | yes |
| `weapon-blackpoint_700.png` | blackpoint_700 | .700 Blackpoint anti-materiel | weapon / heavy | Frontier / mercenary | Anti-materiel. Everyone else is materiel. | yes |
| `weapon-hellraiser_lmg.png` | hellraiser_lmg | Hellraiser LMG | weapon / heavy | Hellraiser Divisions | The Hellraisers' favourite sentence: "hold here." | yes |
| `weapon-recurve_bow.png` | recurve_bow | Recurve bow | weapon / bow | Frontier (unbranded) | Quiet, cheap, and it never jams. | yes |
| `weapon-crossbow.png` | crossbow | Crossbow | weapon / bow | Frontier (unbranded) | Patience, cranked. | yes |
| `weapon-combat_knife.png` | combat_knife | Combat knife | weapon / light_melee | Frontier / Legion issue | Every kit has one. Every story ends with one. | yes |
| `weapon-sabre.png` | sabre | Sabre | weapon / light_melee | Officer's weapon | An officer's argument. | yes |
| `weapon-ork_machete.png` | ork_machete | Ork machete | weapon / heavy_melee | Orks | Orks don't make tools. They make machetes. | yes |
| `weapon-maul.png` | maul | Maul | weapon / heavy_melee | Frontier / dockside | It doesn't cut. It explains. | yes |
| `weapon-lance.png` | lance | Lance | weapon / heavy_melee | Adamantile Brigade | Adamantile knights don't stop. They arrive. | yes |
| `weapon-fists.png` | fists | Gloves or bare fists | weapon / unarmed | Everyone | Everyone's first weapon. | yes |
| `weapon-frag_grenade.png` | frag_grenade | Frag grenade | weapon / thrown | Frontier / Legion issue | Pull, count, apologise. Deals 40 damage to everyone within 2 tiles of where it lands. | yes |
| `weapon-smoke_grenade.png` | smoke_grenade | Smoke grenade | weapon / thrown | Frontier / Legion issue | Not a weapon. A permission slip. Smoke blocks sight within 3 tiles of where it lands, for 2 rounds. | yes |
| `weapon-flashbang.png` | flashbang | Flashbang | weapon / thrown | Lumeri riot police | Lumeri riot police swear by them. Everyone within 2 tiles of where it lands is Blinded for 1 round unless they pass a Body save. | yes |
| `weapon-decrkm_autopistol.png` | decrkm_autopistol | Decrkm auto-pistol | weapon / pistol | Decrkm | For the kind of conversation that happens across a table. +2 to hit against targets within 2 tiles. | yes |
| `weapon-parlour_pistol.png` | parlour_pistol | Parlour pistol | weapon / pistol | Decrkm (a gentleman's model) | Two rounds. That's usually one more than it takes. +2 to hit on your first shot of each fight. | yes |
| `weapon-magistrate_pistol.png` | magistrate_pistol | Magistrate heavy pistol | weapon / pistol | Central City (the courts) | Central City's courts went armed for a reason. A plain attack that hits takes 1 AP from the target's next turn. | yes |
| `weapon-frontier_hand_cannon.png` | frontier_hand_cannon | Frontier hand cannon | weapon / revolver | Frontier (unbranded) | You don't fire it so much as negotiate with it. A plain attack that hits pushes the target 1 tile away from you. | yes |
| `weapon-legion_pdw.png` | legion_pdw | Legion PDW | weapon / smg | Thousand World Legion | The Thousand World Legion's door-kicker. +2 to hit against targets within 3 tiles. | yes |
| `weapon-whisper_smg.png` | whisper_smg | Whisper SMG | weapon / smg | Rigaz-style (sold quietly) | Bought by people who don't want receipts. Firing this weapon never reveals you while you are Hidden. | yes |
| `weapon-mandestra_drum_gun.png` | mandestra_drum_gun | Mandestra drum-gun | weapon / smg | Mandestra (merchant house) | A merchant's answer to a negotiation gone wrong. Full auto also catches enemies up to 2 tiles to either side of the line of fire. | yes |
| `weapon-adamantile_battle_rifle.png` | adamantile_battle_rifle | Adamantile battle rifle | weapon / rifle | Adamantile Brigade | The Brigade wanted a rifle that argued with plate. Shots ignore 5 points of the target's armour. | yes |
| `weapon-ccec_marksman_rifle.png` | ccec_marksman_rifle | CCEC marksman rifle | weapon / rifle | Central City (CCEC) | CCEC evidence: one round, one report. Aimed Shots score a critical hit on a roll of 18, 19 or 20. | yes |
| `weapon-legion_bullpup.png` | legion_bullpup | Legion bullpup | weapon / rifle | Thousand World Legion | Short enough for a dropship aisle. After a shot, you can move 1 tile for free. | yes |
| `weapon-coach_gun.png` | coach_gun | Coach gun | weapon / shotgun | Frontier (unbranded) | Two arguments, one conclusion. For 3 AP, fire both shells as one attack that deals +50% damage. | yes |
| `weapon-sawn_off.png` | sawn_off | Sawn-off | weapon / shotgun | Frontier / Central City underworld | Illegal in Central City, which is how you know it works. Firing at an enemy next to you doesn't provoke an opportunity attack. | yes |
| `weapon-brigade_auto_shotgun.png` | brigade_auto_shotgun | Brigade auto-shotgun | weapon / shotgun | Adamantile Brigade | The Brigade's corridor-clearer. A burst can be split between two targets standing next to each other. | yes |
| `weapon-hellraiser_rotary.png` | hellraiser_rotary | Hellraiser rotary | weapon / heavy | Hellraiser Divisions | Ground near it stops being ground. Your first full auto of each fight costs 1 AP more. After that, full auto costs 3 AP. | yes |
| `weapon-smetanita_thumper.png` | smetanita_thumper | Smetanita thumper | weapon / heavy | Smetanita Conjunction (crime family) | Smetanita property. Return it or else. The thumper lends the Lob technique: you aim at a tile, with no roll and no penalty, and everyone in the blast gains 2 Pressure. | yes |
| `weapon-breacher_tube.png` | breacher_tube | Breacher tube | weapon / heavy | Thousand World Legion | The Legion's door, and the wall it was in. Rockets deal triple damage to cover. | yes |
| `weapon-purifier_flamer.png` | purifier_flamer | Purifier flamer | weapon / heavy | Lumeri Church | The Lumeri insist it's a sacrament. For 3 AP, set a line 3 tiles long burning for 2 rounds. | yes |
| `weapon-satchel_charge.png` | satchel_charge | Satchel charge | weapon / thrown | Frontier / sappers | Some problems are best solved from the next room. Placed against a piece of cover, it destroys that cover outright. | yes |
| `weapon-longbow.png` | longbow | Longbow | weapon / bow | Frontier (unbranded) | Over the wall and through the roof. You can shoot over full cover at a target that someone on your side can see, at −2 to hit. | yes |
| `weapon-repeating_crossbow.png` | repeating_crossbow | Repeating crossbow | weapon / bow | Arkvelton | An Arkvelton toy that got out of hand. For 3 AP, fire two bolts. Each rolls to hit on its own. | yes |
| `weapon-throwing_knives.png` | throwing_knives | Throwing knives | weapon / light_melee | Frontier | Four problems, four solutions. For 3 AP, throw one knife each at up to two targets. | yes |
| `weapon-hatchet.png` | hatchet | Hatchet | weapon / light_melee | Frontier (unbranded) | Frontier tool first, weapon whenever needed. Deals double damage to cover. | yes |
| `weapon-legion_gladius.png` | legion_gladius | Legion gladius | weapon / light_melee | Thousand World Legion | Made for the second rank of a shield wall. +1 Defense while you hold a shield in your off hand. | yes |
| `weapon-kemizuchi_duelling_blade.png` | kemizuchi_duelling_blade | Kemizuchi duelling blade | weapon / light_melee | Kemizuchi Military Academy | The school across town settles things with this. Your melee attacks reach a target 2 tiles away. | yes |
| `weapon-war_axe.png` | war_axe | War axe | weapon / heavy_melee | Frontier / mercenary | Plate is just a slower kind of skin. A plain attack that hits lowers the target's armour by 5 for the rest of the fight, to 10 below its starting armour at most. | yes |
| `weapon-adamantile_greatsword.png` | adamantile_greatsword | Adamantile greatsword | weapon / heavy_melee | Adamantile Brigade | The Brigade's way of saying "stand back." For 4 AP, attack every enemy next to you. | yes |
| `weapon-glaive.png` | glaive | Glaive | weapon / heavy_melee | Frontier / Legion guard | The space around you is yours. When an enemy steps into your reach, strike it. Uses your reaction. | yes |
| `weapon-ork_rip_saw.png` | ork_rip_saw | Ork rip-saw | weapon / heavy_melee | Orks | Ork engineering: loud, sharp, and on fire. A plain attack that hits leaves the target Bleeding. | yes |
| `weapon-knuckledusters.png` | knuckledusters | Knuckledusters | weapon / unarmed | Frontier | A bar argument that brought friends. For 1 AP, throw a jab that deals half damage. | yes |
| `weapon-hellraiser_servo_fist.png` | hellraiser_servo_fist | Hellraiser servo-fist | weapon / unarmed | Hellraiser Divisions | A mining tool the Hellraisers misread. A plain attack that hits pushes the target 2 tiles away from you. | yes |
| `weapon-incendiary_grenade.png` | incendiary_grenade | Incendiary grenade | weapon / thrown | Frontier | The frontier's least favourite smell. Deals 15 fire damage to everyone within 2 tiles of where it lands and sets them Burning. The tile it lands on catches fire. | yes |
| `weapon-bot_scrambler.png` | bot_scrambler | Bot-scrambler | weapon / thrown | Science Team surplus | Science Team surplus, sold out the back door. Within 2 tiles of where it lands, robots and drones are Stunned for 1 round and mana weapons jam. For 2 rounds, drawing a glyph in that area costs 1 AP more. | yes |
| `weapon-core_rifle.png` | core_rifle | Science Team core rifle | weapon / mana | Science Team | The Science Team's proof that mana is a munition. Spend 3 charge on one shot to deal 80 Elemental damage. | yes |
| `weapon-spellslinger_pistol.png` | spellslinger_pistol | Spellslinger's pistol | weapon / mana | Sigil arms (Science Team) | Every magazine is a letter. Some are threats. Each sigil-etched magazine holds one Sigil spell. The first hit from that magazine releases it. | yes |
| `weapon-evoker_blade.png` | evoker_blade | Evoker blade | weapon / mana | Blade Scribes (Sigil) | The Blade Scribes write with the edge. After a hit, your next glyph this turn costs 0 AP. You still draw it on your own tile and still pay its charge and Flux. Counts as an Evoker. | yes |
| `weapon-emanator_gauntlet.png` | emanator_gauntlet | Emanator gauntlet | weapon / mana | Storm Hand (Soul) | The Storm Hand's heart goes into the fist. Each kill gives it 1 charge, up to 3. On a hit you can spend all its charge for +15 damage per charge. Counts as an Emanator. | yes |
| `weapon-lumeri_censer_gun.png` | lumeri_censer_gun | Lumeri censer gun | weapon / mana | Lumeri Church | The Church fires its prayers at range. A blessed shell carries a Blessing you are holding to the tile it hits and the tiles next to it. | yes |
| `weapon-bot_thread_banner.png` | bot_thread_banner | Bot-thread banner | weapon / mana | Banner Dancers | Banner Dancers fight armourless. The banner is the armour. For 2 AP, once per fight, allies within 3 tiles gain a shield of 15 × your Healing given. | yes |
| `weapon-grand_staff.png` | grand_staff | Grand staff | weapon / mana | Grand Sigilists | (no description in data) | yes |
| `weapon-beast_bite.png` | beast_bite | Bite and claws | weapon / unarmed | Companion only | A beast companion's own weapon. | yes |
| `consumable-essence_of_experience.png` | essence_of_experience | Essence of Experience | consumable | Mana | Experience sealed in mana, worth 100 XP. Cracking it takes 10 minutes outside a fight, and someone with Brain Power 5 and an Evoker, or Will Power 5 and an Emanator. They choose who absorbs it: themselves or a party member who is present. A character can absorb one per long rest. It also sells well. | no |
| `consumable-stim_injector.png` | stim_injector | Stim injector | consumable | Medical | One dose. Use it on an ally next to you: it stabilises a Downed ally at 1 HP, or heals 6 × your Healing given, more as you level. It also stops Bleeding. | no |
| `tool-field_kit.png` | field_kit | Field kit | tool | 258th Medical Unit | Bandages, splints and a suture set. What a Bard treats injuries with. | no |
| `food-ration_pack.png` | ration_pack | Ration pack | food | Legion issue | A day of food, sealed. | no |
| `focus-evoker.png` | evoker | Evoker | focus / off_hand | Science Team / Sigil arms | Holds one mana core; the focus for Sigil magic. | yes |
| `consumable-standard_core.png` | standard_core | Standard mana core | consumable | Mana | A core of condensed mana. An Evoker burns it for Sigils. | no |
| `consumable-sigil_plate.png` | sigil_plate | Sigil plate | consumable | Science Team | A slate with one Sigil word cut into it. Study it for a scene to learn the word; the plate crumbles. Its note in your pack says which word it holds. | no |
| `consumable-heart_plate.png` | heart_plate | Heart plate | consumable | Soul arms | A violet-veined slate that holds one Outburst lesson: a tone (fire, storm, frost, stone, gale or acid), a school or a module. Study it for a scene to learn it; the plate crumbles. Its note in your pack says what it teaches. | no |
| `tool-chalk_and_wax.png` | chalk_and_wax | Chalk and wax | tool | Sigil students | For drawing sigils by hand. | no |
| `focus-emanator.png` | emanator | Emanator | focus / off_hand | Soul arms | The heart link; the focus for Soul magic. | yes |
| `tool-prayer_beads.png` | prayer_beads | Prayer beads and incense | tool | Lumeri Church | For prayer and patience. | no |
| `shield-buckler.png` | buckler | Buckler | shield / off_hand | Frontier | +1 Defense. As a shield it gives you Shield Bash, Raise Shield and Shield Wall, +2 on a Parry roll, and Brace and the Guard technique give 1 more Guard. | yes |
| `shield-riot_shield.png` | riot_shield | Legion riot shield | shield / off_hand | Thousand World Legion | +2 Defense. -0.5 Movement. As a shield it gives you Shield Bash, Raise Shield and Shield Wall, and Brace and the Guard technique give 1 more Guard. | yes |
| `shield-pavise.png` | pavise | Pavise | shield / off_hand | Frontier / mercenary | Carried, it does nothing. Plant it for 2 AP and it becomes a tile of full cover in front of you, with 80 HP. Picking it back up costs 2 AP. | yes |
| `light-torch.png` | torch | Torch | light / off_hand | Frontier | Lights 4 tiles around you, so darkness doesn't halve your sight there. As a weapon it hits for 12 Elemental damage (Unarmed), and a hit on a roll of 15 or more sets the target Burning. It burns for 30 minutes. | no |
| `light-flare.png` | flare | Flare | light / off_hand | Frontier | Thrown or held, it lights 6 tiles for 3 rounds and reveals anyone Hidden there. It is used up. | no |
| `tool-spare_parts.png` | spare_parts | Spare-parts charge | tool | Mechanics | One charge of parts for Field Repair. A kit of five weighs 0.8 kg and costs 80 credits. | no |
| `mod-red_dot.png` | mod_red_dot | Red dot sight | mod | Gun mod (optic) | Optic: no −2 to hit in the first range band past the weapon's effective range. | no |
| `mod-scope.png` | mod_scope | Scope | mod | Gun mod (optic) | Optic: Aimed Shots get +1 to hit and one more range band before penalties start. | no |
| `mod-suppressor.png` | mod_suppressor | Suppressor | mod | Gun mod (muzzle) | Muzzle: shots don't reveal you while you are Hidden. -2 damage. | no |
| `mod-compensator.png` | mod_compensator | Compensator | mod | Gun mod (muzzle) | Muzzle: Recoil −1 per shot. | no |
| `mod-extended_mag.png` | mod_extended_mag | Extended magazine | mod | Gun mod (magazine) | Magazine: +50% capacity (rounded down). | no |
| `mod-quick_release.png` | mod_quick_release | Quick-release magazine | mod | Gun mod (magazine) | Magazine: reloading costs 1 AP. | no |
| `mod-foregrip.png` | mod_foregrip | Foregrip | mod | Gun mod (underbarrel) | Underbarrel: the first burst each turn ignores Recoil. | no |
| `mod-bayonet.png` | mod_bayonet | Bayonet | mod | Gun mod (underbarrel) | Underbarrel: melee attacks with the gun deal 15 damage (Dexterity) instead of your fists' damage. | no |
| `mod-underslung.png` | mod_underslung | Underslung launcher | mod | Gun mod (underbarrel) | Underbarrel: holds one 40 mm grenade round. | no |
| `mod-serrated.png` | mod_serrated | Serrated edge | mod | Melee mod (edge) | Edge: critical hits also cause Bleeding. | no |
| `mod-weighted.png` | mod_weighted | Weighted head | mod | Melee mod (edge) | Edge: +3 damage. | no |
| `mod-wrapped_grip.png` | mod_wrapped_grip | Wrapped grip | mod | Melee mod (grip) | Grip: you can't be Disarmed while you hold this weapon. | no |
| `mod-sigil_magazine.png` | mod_sigil_magazine | Sigil-etched magazine | mod | Sigil arms | Inscription: holds one stored Sigil spell. | no |
| `armour-field_helmet.png` | field_helmet | Field helmet | armour / head | Thousand World Legion | Head: +10% Injury resistance. | yes |
| `armour-ballistic_helmet.png` | ballistic_helmet | Ballistic helmet | armour / head | Adamantile / heavy line | Head: +2 armour. | yes |
| `armour-night_goggles.png` | night_goggles | Night-sight goggles | armour / head_accessory | Science Team surplus | Head accessory: darkness doesn't halve your sight. | yes |
| `armour-gas_mask.png` | gas_mask | Gas mask | armour / head_accessory | Frontier / Legion | Head accessory: toxic spills don't hurt you. | yes |
| `armour-padded_undershirt.png` | padded_undershirt | Padded undershirt | armour / inner_torso | Civilian | Inner torso: +1 armour. | yes |
| `armour-trauma_plate.png` | trauma_plate | Trauma plate insert | armour / inner_torso | Adamantile / heavy line | Inner torso: +3 armour. | yes |
| `armour-utility_belt.png` | utility_belt | Utility belt | armour / lower_torso | Frontier | Lower torso: +3 kg carry limit. | yes |
| `armour-armoured_belt.png` | armoured_belt | Armoured belt | armour / lower_torso | Adamantile / heavy line | Lower torso: +1 armour. | yes |
| `armour-armoured_greaves.png` | armoured_greaves | Armoured greaves | armour / legs | Adamantile Brigade | Legs: +2 armour; -0.5 Movement. | yes |
| `armour-runner_trousers.png` | runner_trousers | Runner's trousers | armour / legs | Civilian / courier | Legs: +0.5 Movement. | yes |
| `armour-work_gloves.png` | work_gloves | Work gloves | armour / hands | Civilian | Hands: +2 Unarmed damage. | yes |
| `armour-combat_gloves.png` | combat_gloves | Combat gloves | armour / hands | Frontier / Legion | Hands: +1 armour. | yes |
| `armour-field_boots.png` | field_boots | Field boots | armour / footwear | Frontier | Footwear: rough ground costs no extra. | yes |
| `armour-heavy_boots.png` | heavy_boots | Heavy boots | armour / footwear | Adamantile / heavy line | Footwear: +1 armour; +10% Injury resistance. | yes |
| `tool-musek_blestor.png` | musek_blestor | Musek Blestor | tool | Musek | A palm-sized player with a speaker that can fill a hangar. The music traits start with one. It plays your favourite song for the room: 2 AP in a fight, or once per scene outside one. | no |
| `armour-prescription_glasses.png` | prescription_glasses | Prescription glasses | armour / head_accessory | Civilian | Thick lenses. The trait Bottle Butts for Eyes checks whether you are wearing them. | yes |
| `armour-smiling_mask.png` | smiling_mask | Smiling mask | armour / head | Civilian / theatre | A mask with a fixed smile. The trait The Mask checks whether you are wearing it. | yes |
| `augment-prosthetic_arm.png` | prosthetic_arm | Prosthetic arm | augment | Augmentation | A working arm of metal and wire. An arm injury hits the metal instead: the arm goes offline (Augment Offline) until it gets a Field Repair. With Improvisation 3 it can take up to 2 mods, fitted outside a fight; the Narrator decides what each mod does on it. | no |
| `document-city_id.png` | city_id | Central City ID | document | Central City | Proof of residence in Central City. | no |
| `document-bank_card.png` | bank_card | Bank card | document | Central City | An account in a Central City bank. | no |
| `loot-contraband.png` | contraband | Contraband | loot | Underworld | Something the law wants back. The Narrator decides what it is. | no |
| `tool-grimoire.png` | grimoire | Grimoire | tool | Unknown | Notes in a hand older than the cover. | no |
| `tool-toolbox.png` | toolbox | Toolbox | tool | Mechanics | Spanners, a crimper, wire. It counts as spare parts and as a field kit for any job that needs a toolbox. | no |
| `food-bottle_of_spirits.png` | bottle_of_spirits | Bottle of spirits | food | Civilian | Something strong. The Lunarshine trait counts your drinks. | no |
| `food-cigarettes.png` | cigarettes | Pack of cigarettes | food | Civilian | Twenty. The Chain Smoker trait counts them. | no |
| `companion-drone_frame.png` | drone_frame | Drone frame | companion | Science Team | A folding combat drone. If you are a Drone Handler, it fights beside you. | no |
| `ammo-armor_piercing.png` | ammo_armor_piercing | Armour-piercing rounds | ammo | Special ammunition | Armour-piercing rounds for any gun. Load them outside a fight to fill the magazine in the gun. They ignore armour and deal 20% less damage. | no |
| `ammo-hollow_point.png` | ammo_hollow_point | Hollow-point rounds | ammo | Special ammunition | Hollow-point rounds for any gun. Load them outside a fight to fill the magazine in the gun. They deal 30% more damage, but the target's armour counts double. | no |
| `ammo-incendiary.png` | ammo_incendiary | Incendiary rounds | ammo | Special ammunition | Incendiary rounds for any gun. Load them outside a fight to fill the magazine in the gun. A hit sets the target Burning, and they deal 10% less damage. | no |
| `ammo-enhanced.png` | ammo_enhanced | Enhanced rounds | ammo | Special ammunition (mana) | Enhanced rounds for any gun. Load them outside a fight to fill the magazine in the gun. They ignore armour, deal Elemental damage, and each hit raises the mana meter by 1. | no |
| `focus-visualizer.png` | visualizer (planned) | Visualizer | focus / off_hand | Expression arms | Coming in Classes 3.0 (docs/design/figments-spec.md): a glove with a palm projector; Figments. | no |
| `focus-attuner.png` | attuner (planned) | Attuner | focus / off_hand | Insight arms | Coming in Classes 3.0 (docs/design/bonds-spec.md): the Bond focus, a glove with a core on the back of the hand and filaments to the fingertips; Bonds and Tending. | no |
| `consumable-toxin_vial.png` | toxin_vial (planned) | Toxin vial | consumable | Underworld / Operatives | Coming in Classes 3.0 (docs/design/shadow-spec.md, rev4-primitives.md 3.7): one dose the Operative's Toxin coats a weapon with. Not in items.json yet. | no |
| `armour-torso_class1_light.png` | torso_class1_light | armour-torso_class1_light | derived |  | Torso armour class 1 (Light, 4 kg): the starting Padded coat. | no |
| `armour-torso_class2_medium.png` | torso_class2_medium | armour-torso_class2_medium | derived |  | Torso armour class 2 (Medium, 8 kg): the starting Medic plate. | no |
| `armour-torso_class3_heavy.png` | torso_class3_heavy | armour-torso_class3_heavy | derived |  | Torso armour class 3 (Heavy, 12 kg): the soldier's Flak vest. | no |
| `armour-torso_class4_assault.png` | torso_class4_assault | armour-torso_class4_assault | derived |  | Torso armour class 4 (Assault, 18 kg). | no |
| `armour-torso_class5_juggernaut.png` | torso_class5_juggernaut | armour-torso_class5_juggernaut | derived |  | Torso armour class 5 (Juggernaut, 28 kg). | no |
| `loot-personal_effects.png` | personal_effects | loot-personal_effects | derived |  | What a person carries: personal effects dropped as loot, twenty named oddments (a letter, a lighter, a charm). | no |
| `rounds-32_decrkm.png` | 32_decrkm | rounds-32_decrkm | derived |  | .32 Decrkm: the common pistol and SMG round (one stack per calibre in the pack). | no |
| `rounds-revolver.png` | revolver | rounds-revolver | derived |  | Revolver: six-shot revolver rounds (one stack per calibre in the pack). | no |
| `rounds-rifle.png` | rifle | rounds-rifle | derived |  | Rifle: rifle rounds (one stack per calibre in the pack). | no |
| `rounds-shell.png` | shell | rounds-shell | derived |  | Shell: shotgun shells (one stack per calibre in the pack). | no |
| `rounds-700.png` | 700 | rounds-700 | derived |  | .700 Blackpoint: the huge anti-materiel round (0.12 kg each) (one stack per calibre in the pack). | no |
| `rounds-arrow.png` | arrow | rounds-arrow | derived |  | Arrow: arrows (0.03 kg each) (one stack per calibre in the pack). | no |
| `rounds-bolt.png` | bolt | rounds-bolt | derived |  | Bolt: crossbow bolts (0.04 kg each) (one stack per calibre in the pack). | no |
| `rounds-50_frontier.png` | 50_frontier | rounds-50_frontier | derived |  | .50 Frontier: the hand-cannon round (0.03 kg each) (one stack per calibre in the pack). | no |
| `rounds-40mm_grenade.png` | 40mm_grenade | rounds-40mm_grenade | derived |  | 40 mm grenade: a 40 mm grenade round (0.25 kg) (one stack per calibre in the pack). | no |
| `rounds-rocket.png` | rocket | rounds-rocket | derived |  | Rocket: a rocket (2.5 kg) (one stack per calibre in the pack). | no |
| `rounds-fuel_canister.png` | fuel_canister | rounds-fuel_canister | derived |  | Fuel canister: a flamer fuel canister (1.5 kg) (one stack per calibre in the pack). | no |
| `rounds-core_charge.png` | core_charge | rounds-core_charge | derived |  | Core charge: a core-rifle charge (0.02 kg) (one stack per calibre in the pack). | no |
| `mag-pistol_32.png` | pistol_32 | mag-pistol_32 | derived |  | Pistol magazine (.32 Decrkm) (drawn for: service pistol, auto-pistol, Spellslinger's pistol). | no |
| `mag-smg_32.png` | smg_32 | mag-smg_32 | derived |  | SMG magazine (.32 Decrkm) (drawn for: Decrkm SMG, Whisper SMG, Legion PDW). | no |
| `mag-rifle.png` | rifle | mag-rifle | derived |  | Rifle magazine (drawn for: Hellraiser rifle, battle rifle, marksman rifle, bullpup). | no |
| `mag-blackpoint_700.png` | blackpoint_700 | mag-blackpoint_700 | derived |  | .700 magazine (drawn for: .700 Blackpoint). | no |
| `mag-speedloader_revolver.png` | speedloader_revolver | mag-speedloader_revolver | derived |  | Revolver speedloader (drawn for: Drifter revolver). | no |
| `mag-speedloader_50.png` | speedloader_50 | mag-speedloader_50 | derived |  | .50 speedloader (drawn for: Frontier hand cannon). | no |
| `mag-drum_32.png` | drum_32 | mag-drum_32 | derived |  | Drum magazine (drawn for: Mandestra drum-gun). | no |
| `mag-belt.png` | belt | mag-belt | derived |  | Belt box (drawn for: Hellraiser LMG, Hellraiser rotary). | no |
