# Items 2.0: the grades and the uniques (design notes behind art file 08)

The design material behind `art/briefs/prompts-2026-11-19/08-grades-and-uniques.md`, moved out of the artist's file on 19 Nov 2026 and brought up to Leon's rulings of that day. The artist's file holds only what the artist needs (style blocks, grade blocks, the proof sheet, the item list and count, the unique prompts); everything about why lives here.

## 1. Rulings applied (Leon, 19 Nov 2026)

- **R1, everything proposed is approved:** the melee family table with its in-world names, the 12 gun lines and the 2 bow families, the shield and armour forms, the unique concepts, file 10's five new maker lines (G13 ADCorp, G14 Chezknov, G15 Central Command Arsenal, G16 Smetanita sidearms, G17 Albert Town, 15 forms), file 10's 17 faithful repaints (same id, same file name, new picture), and file 10's redraw notes for files 06 and 09. The polearms are `legion_spear` / `glaive` / `lance` (ART-REQUESTS question 3: the poleaxe is dropped). The recommendations of the old questions are taken: foci and the quiver are graded (question 8), 24 uniques with Afterword the first and the Unique frame drawn as UI (question 7), and of file 09's six "weird" weapons only the harpoon gun goes ahead (09 question 5), as a unique (R4).
- **R2, scheme S1:** all five grades are painted for every graded item, armour and foci included.
- **R3, gun patterns:** a gun's art reads as its real-world pattern; names, makers and markings are ours. The grade blocks keep the pattern at every grade (A1, A3.3), and base prompt U lets a gun unique keep its family's pattern.
- **R4, heavy and strange:** eight families stand (launchers, rocket tubes, flamers, rotary, anti-materiel, powered blades, power gauntlets, thrown). The core rifle and the censer gun are advanced-class weapons: their families and the four new forms (`science_core_pistol`, `science_core_lance`, `lumeri_thurible_pistol`, `lumeri_reliquary_mortar`) are out, and so are their grade sets. A weapon too weird for a family is a one-off unique (the harpoon gun: `homecoming`).
- **R5** (second skills) does not touch this file: no unique or grade carries a second skill.

## 2. The grade ladder (checked against data)

`data/rules.json` `rarity`, in order: `standard`, `fine`, `masterwork`, `relic`, `celestial`, with 0 to 4 marks (`rarity.*.marks`). The artist's file uses these names and this order, and the file suffixes are the keys. `art/style-guide/gear-icons.md` also lists "worn" among the finishes; Worn is not a grade in data, so it gets no picture (ART-REQUESTS question 13: words only). File 07's opening line once said "Worn to Celestial"; the artist's files should read "Fine to Celestial".

## 3. The count, and how it moved from 129 to 164

ART-REQUESTS section 4.3 counted 129 graded items (120 forms + 9 one-offs) and 572 new pictures. After the rulings:

| Change | Graded items | Why |
| --- | --- | --- |
| ART-REQUESTS 4.3 | 129 | 120 forms (64 painted, 56 new) + 9 graded one-offs |
| `afterword` leaves the graded list | -1 | It is the first unique, and uniques have no grade set (section 4.5); 4.2 had listed it among the graded one-offs |
| The 4 foci and the quiver are graded | +5 | Question 8 approved; R2 names the foci |
| File 09: 8 families, 16 new forms | +16 | The 8 one-offs that became family bases were already counted; the 4 core and censer forms are out (R4) |
| File 10: 5 new maker lines | +15 | R1 |
| The polearm change | 0 | `legion_spear` replaces the poleaxe one for one |
| **Now** | **164** | 77 painted today (60 kept, 17 to be repainted) and 87 new Standards |

Grade pictures: 164 x 4 = 656. Pictures to make for the graded items: 87 new Standards + 17 repaints + 656 grade pictures = 760; with the 23 uniques, 783. Each repaint makes five pictures (the repaint and its four grades); the four are made from the repaint, so no grade set of a repainted gun is started before its repaint is approved. Size (ART-REQUESTS 4.4 gave 4.8 MB on the site and 295 MB in the repo for 572 pictures; scaled to 783): about 6.6 MB more on the site and about 400 MB more in the repo.

New Standards by file: 05: 19 (18 melee + `weighted_gloves`); 06: 17 (15 guns + 2 bows); 07: 20 (6 shields + 14 armour); 09: 16; 10: 15. 19 + 17 + 20 + 16 + 15 = 87.

## 4. The proof sheet

The proof sheet was `katana` and `service_pistol`. `service_pistol` is one of file 10's 17 repaints (the polymer striker service pistol pattern), so a grade set built on today's painting would be thrown away. The gun of the proof sheet is now `drifter_revolver`: a starting-kit gun, a painting file 10 judged to read as its pattern already (the single-action army revolver), not repainted. `katana` stays (not repainted, the hybrid form of the Draw blades).

## 5. Grade blocks added for the new classes

The artist's file had 7 class blocks; it now has 10. A3.8 heavy weapons, A3.9 powered melee and power gauntlets and A3.10 thrown weapons are new, because the eight heavy and strange families of R4 are graded items now. A3.4 gained the quiver and A3.5 the four foci (with their lens colours). A3.3 (guns) and A1 now say that a gun's real-world pattern does not change with grade, and A1 names the signatures of the five new makers.

## 6. The uniques (24: Afterword and 23 new paintings)

All approved (R1). The passives below are directions for the item spec, not rules: their numbers are set in the spec when Items 2.0 builds the uniques, and anything the engine lacks goes on the lead's "Needs a new primitive" list.

| Id | Name | Family (silhouette) | Maker or patron (accent) | What it does (direction) |
| --- | --- | --- | --- | --- |
| `afterword` | Afterword | great blade (painted) | as painted | as live |
| `last_sentence` | Last Sentence | Great blades (`adamantile_greatsword`) | Adamantile Brigade, sworn to Holy Father Nerukhan (`#E9D6A2`) | Its blows land harder on a foe the Chaplain has Judged |
| `grandmothers_teeth` | Grandmother's Teeth | Ork cutters (`ork_machete`) | Orks (ochre) | The edge grows back: it never dulls, and its cuts leave the target Bleeding |
| `last_crossing` | Last Crossing | Polearms (`glaive`) | The Toll-Keeper (`#79BDB6`) | A foe it brings down can be stabilised instead of killed, a mercy the Toll-Keeper counts |
| `owed_in_full` | Owed in Full | Kemizuchi duelling (`kemizuchi_duelling_blade`) | The Counting Weaver (`#9C82D7`) | Each hit it takes from a foe is counted on the threads; its next hit on that foe pays the count back |
| `reveille` | Reveille | Hammers (`maul`) | Hellraiser Divisions (`#CC2435`) | Its hit rings: foes next to the target lose their next reaction |
| `breath_of_morning` | Breath of Morning | Hand-to-hand (`hand_wraps`) | Frontier, the Open Hand (no accent) | The first time the wearer would drop in a fight, the Breath form is free that turn |
| `rearguard` | Rearguard | Legion blades (`legion_gladius`) | Thousand World Legion (no accent) | While its bearer withdraws, allies who move with them are not struck as they leave |
| `in_triplicate` | In Triplicate | G4 Legion automatics (`legion_bullpup`) | The Quartermaster (`#8B9F47`) | Its first reload of a fight costs nothing: the paperwork was filed in advance |
| `second_thunder` | Second Thunder | G2 Revolvers (`frontier_hand_cannon`, repainted) | Old Overcast (`#4E8DD1`) | The last round in the cylinder strikes as Storm and arcs to a foe beside the target |
| `encore` | Encore | G1 Service sidearms (`parlour_pistol`) | The Laughing Mask (`#B83243`) | Once a fight, a missed shot is rolled again |
| `homecoming` | Homecoming | one-off: the harpoon gun (09's weird weapon 1) | Frontier docks (no accent) | A hit pulls the target to the shooter, or the shooter to a wall it hits (the existing `displace` pull) |
| `first_light` | First Light | G9 Precision rifles (`long_rifle`, repainted) | Frontier (dawn amber in the scope) | Its first Aimed Shot of a fight ignores the range bands |
| `night_watch` | Night Watch | G12 Lumeri scatterguns (`lumeri_scattergun`, repainted) | Lumeri Church (`#F2C46A`) | A foe that moves into its spread on the enemy's turn is shot without a reaction spent |
| `unsaid` | Unsaid | G5 Whisper (`whisper_smg`) | Whisper line (the blue-grey plate) | A kill from Hidden leaves no body noise: nearby foes are not alerted |
| `windfall` | Windfall | B1 Bows (`recurve_bow`) | Frontier (no accent) | Its arrows can be fired at a tile to fall as a short rain on everyone there |
| `return_clause` | Return Clause | Ward shields (the deflector) | Science Team (`#4FC8DF`) | When a spell hits its bearer, part of it is thrown back at the caster (Leon's concept) |
| `outpost_wall` | Outpost Wall | Guard shields (`pavise`) | Thousand World Legion outposts (no accent) | Planted, it stays as cover for the rest of the fight (Leon's concept) |
| `grudge_plate` | Grudge Plate | Strike shields (the boss shield) | Hellraiser Divisions (`#CC2435`) | The damage it soaks is stored and released in the bearer's next Slam (Leon's concept) |
| `red_thread_gloves` | Red Thread | Worn gloves | The Matchmaker (`#D879AF`) | The wearer's first Bond of a fight costs nothing and reaches further |
| `hearth_coat` | Hearth Coat | Vests, the light form (`torso_class1_light`) | Mother Ember (`#ED8A3C`) | A heal the wearer gives warms the wearer too |
| `lucky_dent` | Lucky Dent | Helmets (`field_helmet`) | Thousand World Legion (no accent) | Once a fight, a critical hit on the wearer becomes an ordinary hit |
| `spring_air` | Spring Air | Respirators (`gas_mask`) | Frontier (the green inside) | Clean air: the wearer ignores gas and smoke, and Steady calms one more Strain |
| `long_road` | The Long Road | Boots (`field_boots`) | Frontier (no accent) | Difficult ground costs the wearer no extra movement |

Spread: melee 8 (Afterword and 7 new), guns and bows 8, shields 3, armour 5. Each of the eight patrons appears once (Nerukhan, the Quartermaster, the Laughing Mask, the Toll-Keeper, Mother Ember, Old Overcast, the Matchmaker, the Counting Weaver).

The twelve uniques written on 19 Nov to complete the 24 (the directions in the table are new with them): `owed_in_full`, `reveille`, `breath_of_morning`, `rearguard`, `homecoming`, `first_light`, `night_watch`, `unsaid`, `windfall`, `lucky_dent`, `spring_air`, `long_road`. Three are drawn on a repainted silhouette (`second_thunder`, `first_light`, `night_watch`) and two on a new file 07 form (`return_clause` on the deflector, `grudge_plate` on the boss shield); the artist's file says to paint each after its Standard is approved. `second_thunder` was redrawn to the repainted hand cannon's pattern (long barrel, full underlug), and `grudge_plate` lost its rim spikes to keep the boss shield's outline.

**Ids that also name a prayer or an action.** `last_crossing` and `encore` (both as written and approved) are also prayer ids in `data/patrons.json`; the new ones were chosen to avoid this (`breath_of_morning` rather than `second_wind`, a `skills.json` action; `night_watch` rather than `vigil`, a prayer). Item ids and prayer ids are separate lists and the art catalog key carries the `weapon-` prefix, so nothing breaks; whoever writes the item rows may still prefer to rename the two.

**Not the artist's:** the 23 line icons of the uniques and the Unique frame are drawn by Claude as UI; the catalog entries (`gear` map, key = file stem) are added on intake, one per Standard, grade picture and unique.

## 7. What is not in the artist's file and why

- The five other weird weapons of file 09 (net or bola launcher, concussion projector, turret pack, acid sprayer, returning blade): not in this pack; they wait for a later content release (09 question 5).
- Advanced-class weapons (the 8 mana arms, the core rifle and the censer gun among them): three tiers each when the advanced classes return; nothing is painted now.
- Weapon Arts icons, random-modifier art, a Worn picture: none (words only, ART-REQUESTS questions 11 to 13).

## 8. Moved out of the artist's file in the second verification (19 Nov 2026)

The artist's file (section C4) now ends on one line: 164 graded items x 4 = 656 grade pictures; 760 pictures for the graded
items; 783 gear pictures with the 23 uniques; only the items listed in C3 get grade pictures. The accounting it carried
before is kept here, as it stood, then corrected to the 17 repaints of R1:

> Column sums: graded items 21 + 9 + 51 + 7 + 10 + 9 + 33 + 15 + 6 + 3 = 164; kept 7 + 5 + 5 + 5 + 9 + 3 + 19 + 2 + 2 + 1 = 58; repainted 16 + 3 = 19; new 14 + 4 + 30 + 2 + 1 + 6 + 14 + 10 + 4 + 2 = 87; grade pictures 164 x 4 = 656; pictures to make 98 + 40 + 250 + 30 + 41 + 42 + 146 + 73 + 28 + 14 = 762. Painted Standards that exist today: 58 kept + 19 to be repainted = 77.
> 
> Where the 762 are prompted: the 656 grade pictures in this file (sections A and B); the 87 new Standards in files 05 (19), 06 (17), 07 (20), 09 (16) and 10 (15); the 19 repaints in file 10. **Plus the 23 uniques of section D: 785 pictures in all.** Not graded, so no grade pictures: the uniques (Afterword included); the grenades, the flashbang, the satchel charge and the other consumables; the special rounds, the magazines and the rounds; the materials, tools, documents, food, lights, loot, the prosthetic arm and the drone frame; the mods; the trait props (`armour-prescription_glasses`, `armour-smiling_mask`); bare fists and `weapon-beast_bite`; the bot items (`weapon-bot_scrambler`, `weapon-bot_thread_banner`); and the mana and advanced-class weapons (`weapon-evoker_blade`, `weapon-emanator_gauntlet`, `weapon-emanator_katana`, `weapon-spellslinger_pistol`, `weapon-grand_staff`, `weapon-core_rifle`, `weapon-lumeri_censer_gun`). This list and section C3 together cover every painting in `art/icons/gear/`: the 164 graded items, the 656 grade pictures and the 785 pictures in all are complete.

**Corrected to R1's 17 repaints:** `legion_bullpup` and `whisper_smg` are kept Standards, not repaints (R1 approves the 17
repaints of file 10's coverage table, where both read as their pattern today). Kept 7 + 5 + 7 + 5 + 9 + 3 + 19 + 2 + 2 + 1
= 60; repainted 14 + 3 = 17; new 87; grade pictures 164 x 4 = 656; pictures to make 98 + 40 + 248 + 30 + 41 + 42 + 146 +
73 + 28 + 14 = 760; with the 23 uniques, 783 gear pictures. The README's 871 adds files 01 to 04 (88 pictures: 37 + 11 +
21 + 19). Painted Standards that exist today: 60 kept + 17 to be repainted = 77. The core rifle and the censer gun stay in
`art/icons/gear/` as painted advanced-class weapons, not graded and not in this pack (R4).
