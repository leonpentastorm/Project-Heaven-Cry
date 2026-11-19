# Items 2.0: the gun lines and the bow families (design sheet, RULED 19 Nov 2026)

Moved here from `art/briefs/prompts-2026-11-19/06-gun-forms.md`, which now holds only the artist's prompts. This is the design material behind those 17 pictures, updated to Leon's rulings of 19 Nov 2026 ("approve everything"):

- **R1.** The 12 gun lines, their forms and ids, and the 2 bow families are approved as proposed. Existing ids are never renamed.
- **R2.** Grades: scheme S1, all five grades painted for every graded item.
- **R3.** A gun's art reads as its real-world pattern at a glance; the name, the maker and the markings are ours. No real brand, model or maker name anywhere (game text, file names, prompts, pictures). This sheet names patterns in generic pattern words only.
- **R4.** The heavy weapons are the families of file 09 (launchers, rocket tubes, flamers, rotary, anti-materiel, powered blades, power gauntlets, thrown); the core rifle and the censer gun families are out of the pack (advanced-class weapons). The five heavy one-offs this sheet used to list belong to file 09.
- **R5.** A gun line's base form scales on Dexterity only. A variant's second skill is always an **alpha** skill (Durability, Raw Power, Ingenuity, Brain Power, Visualization, Empathy, Will Power, Faith), and only where it honestly applies; otherwise none. Never a beta or a gamma.

Sources: `data/weapons.json`, `data/rules.json` (`weapons_rules`), `data/skills.json` (slots), `art/briefs/ART-REQUESTS-2026-11-19.md` section 4.3, `art/briefs/prompts-2026-11-19/10-rifle-analogues.md` (the coverage table, the 17 repaints and the redraw notes for this file). The five new maker lines G13 to G17 are file 10's and are not repeated here.

## What the three forms are

Every gun line has three forms; how each makes Pressure:

- **Close:** one hand or short, cheap to draw and reload, short reach, many small hits (Pressure by volume).
- **Standard:** the all-rounder with the full technique set.
- **Long:** the biggest single hit and the longest reach, slow, poor when a foe is adjacent (Pressure by the one big shot).

Dexterity always rolls the shot (`phys.hits_with: dexterity`, as on every gun today) and damage keeps its live profile (`phys.scales_with: agility`, rules 1.56 L6). A variant's second skill feeds the line's **signature**, never the hit.

**Base choice.** The base is the form that exists and carries the line's name, so the picture that defines the line is the Dexterity-only gun.

**Build note.** The nearest live field is `phys.also_scales` (`data/CONVENTIONS.md`). Reading an alpha into a signature's size (a push's tiles, armour ignored, a crit range) is built through the primitives in `docs/ENGINE-HOOKS.md`; anything missing goes on the lead's "Needs a new primitive" list, never into code. Each alpha below is named with the door it opens, because that is what makes the pairing honest: the variant's signature is a door's move done with a gun.

## The sheet (R5)

| Line | Forms: close / standard / long | Base, Dexterity only | Signature (one card line) | Close variant: alpha, what it feeds | Long variant: alpha, what it feeds |
| --- | --- | --- | --- | --- | --- |
| G1 Service sidearms | `parlour_pistol` / `service_pistol` / `magistrate_pistol` | `service_pistol` | **Quick:** draw and fire in one action | `parlour_pistol`: **Ingenuity** (Shadow, sleight of hand): Ace in the Sleeve, the first shot of a fight from a hand nobody watched | `magistrate_pistol`: **Raw Power** (Momentum): Stopping Power, the AP a hit takes from the target's next turn |
| G2 Revolvers | `snub_revolver` / `drifter_revolver` / `frontier_hand_cannon` | `drifter_revolver` | **Few rounds, the best critical** | `snub_revolver`: **Ingenuity** (Shadow): the critical on a shot drawn from concealment the turn it is drawn | `frontier_hand_cannon`: **Raw Power** (Momentum): Knockback, the tiles a hit shoves the target |
| G3 DECRKM automatics | `decrkm_autopistol` / `decrkm_smg` / `decrkm_carbine` | `decrkm_smg` | **Cheap and common:** the commonest round, full auto for less AP | `decrkm_autopistol`: **Raw Power**: Recoil relief on its burst, held in one hand | `decrkm_carbine`: **none** (a cheap gun given reach; no alpha honestly applies) |
| G4 Legion automatics | `legion_pdw` / `legion_bullpup` / `legion_marksman_rifle` | `legion_bullpup` | **Squad doctrine:** shoot, then move with the line | `legion_pdw`: **Durability** (Guard, the tank): Clear the Room while moving in armour | `legion_marksman_rifle`: **Empathy** (Bonds): the shot on a foe a bonded squadmate hit this round |
| G5 Whisper | `whisper_pistol` / `whisper_smg` / `whisper_carbine` | `whisper_smg` | **Silent:** firing never reveals a Hidden shooter | `whisper_pistol`: **Ingenuity** (Shadow): the Break from Hidden | `whisper_carbine`: **Ingenuity** (Shadow): the shot on a foe it spotted while still Hidden (overwatch from the dark) |
| G6 Mandestra drum guns | `mandestra_drum_pistol` / `mandestra_drum_gun` / `mandestra_drum_rifle` | `mandestra_drum_gun` | **The biggest magazines:** full auto catches the flanks | `mandestra_drum_pistol`: **Raw Power**: Recoil relief on auto, a full drum held in one hand | `mandestra_drum_rifle`: **none** (Wide Spray at range is the line's signature as is) |
| G7 Hellraiser line | `hellraiser_trench_carbine` / `hellraiser_service_rifle` / `hellraiser_lmg` | `hellraiser_service_rifle` | **Suppresses:** marks a line foes fear to cross | `hellraiser_trench_carbine`: **Raw Power** (Momentum): suppression laid at the end of a charge (Charge Carries) | `hellraiser_lmg`: **Durability** (Guard): the Pressure Suppressing Fire lays while you hold your ground |
| G8 Adamantile battle rifles | `adamantile_carbine` / `adamantile_battle_rifle` / `adamantile_heavy_rifle` | `adamantile_battle_rifle` | **Pierces armour and plates** | `adamantile_carbine`: **none** (the short piercer; no alpha honestly applies) | `adamantile_heavy_rifle`: **Raw Power** (Momentum): the plates a hit strips |
| G9 Precision rifles | `lever_carbine` / `ccec_marksman_rifle` / `long_rifle` | `ccec_marksman_rifle` | **Rewards Aimed fire** | `lever_carbine`: **none** (Work the Lever stays the line's own) | `long_rifle`: **none** (One Breath stays the line's own) |
| G10 Break-action shotguns | `sawn_off` / `coach_gun` / `fowling_gun` | `coach_gun` | **Spread and shove:** two shells, both at once | `sawn_off`: **Raw Power** (Momentum): Close Quarters, the shove of both barrels into an adjacent foe | `fowling_gun`: **none** (the far band is the gun's, not a skill's) |
| G11 Brigade auto shotguns | `brigade_shot_pistol` / `brigade_auto_shotgun` / `brigade_drum_shotgun` | `brigade_auto_shotgun` | **Spread and shove:** a burst split between neighbours | `brigade_shot_pistol`: **Raw Power** (Momentum): the shove on a charge | `brigade_drum_shotgun`: **Durability** (Guard): Room Sweeper while you hold a corridor with Guard up |
| G12 Lumeri scatterguns | `lumeri_hand_scatter` / `lumeri_scattergun` / `lumeri_long_scatter` | `lumeri_scattergun` | **Breaks doors and cover** | `lumeri_hand_scatter`: **Raw Power**: Door Key on a door at arm's length | `lumeri_long_scatter`: **Faith** (prayer, "the saints judge, you deliver"): Door Key on cover from range |

**Counts (12 lines, 24 variants):** Raw Power 9, Ingenuity 4, Durability 3, Empathy 1, Faith 1, none 6. Brain Power, Visualization and Will Power take no gun: no gun signature honestly reads Sigils, Figments or Outbursts. Every earlier beta or gamma pick (Guts, Intimidation, Reaction Speed, Athletics, Vigilance, Improvisation, Acuity, Camaraderie, Composure, Senses, Authority) is gone.

## The bow families

Recorded as they are in data (`data/weapons.json`, `rules.json weapons_rules.bows`): every bow and crossbow hits with Dexterity and grows with Agility (`phys`); the drawn bows add `damage_scales: raw_power` (an alpha, so R5 holds for them); the crossbows' damage is fixed.

| Family | Close / standard / long | Base, Dexterity only | Signature | Close variant | Long variant |
| --- | --- | --- | --- | --- | --- |
| B1 Bows | `short_bow` / `recurve_bow` / `longbow` | `short_bow` (new) | **Silent, no heat, the quiver** | `short_bow` is the base | `recurve_bow` and `longbow`: **Raw Power** (live, unchanged), the draw's damage (and the longbow's Arc) |
| B2 Crossbows | `repeating_crossbow` / `crossbow` / `arbalest` | `crossbow` | **Silent, cranked:** the bolt reloads as part of the shot | `repeating_crossbow`: **none** (Volley is the mechanism's, not a skill's) | `arbalest`: **Raw Power** (Momentum): the heavy bolt, a prod no crank alone can span |

**The short bow: kept (decided 19 Nov 2026).** The live drawn bows both scale on Raw Power, so without a new light bow the bow family has no Dexterity-only base and only two forms. The short bow is that base (drawn by anyone, no Raw Power in its damage) and the family's close form; nothing live changes. It is a firm prompt in the artist file.

## The art: which pattern each new gun form follows (R3, generic words only)

The redraw notes of file 10 (section 3.3) are applied, and every gun prompt was reviewed against R3.

| Form | Pattern (generic words) | From |
| --- | --- | --- |
| `snub_revolver` | the snub-nosed small-frame double-action pocket revolver | kept, tightened to the pattern |
| `decrkm_carbine` | the long-barrel semi-auto carbine of the boxy telescoping-bolt SMG, fixed wooden stock | file 10 note |
| `legion_marksman_rifle` | the carry-handle bullpup with a longer barrel, a scope on the handle and its folding bipod | reviewed: was a flat-top bullpup, redrawn to keep the line's pattern |
| `whisper_pistol` | the wartime integrally suppressed tube pistol, grip as magazine | reviewed: was an invented slide-and-tube pistol |
| `whisper_carbine` | the integrally suppressed special-purpose carbine, skeleton wooden thumbhole stock | file 10 note |
| `mandestra_drum_pistol` | the long-barrelled toggle-lock pistol with the snail drum | reviewed: was an invented drum pistol |
| `mandestra_drum_rifle` | the wartime drum-fed SMG with the full wooden rifle stock and slotted slant-nosed jacket | reviewed: was an invented drum rifle |
| `hellraiser_trench_carbine` | the folding-stock short assault carbine of the stamped long-stroke family (no bayonet) | file 10 note |
| `adamantile_carbine` | the paratrooper version of the metric battle rifle | file 10 note |
| `adamantile_heavy_rifle` | the heavy-barrel squad version of the metric battle rifle | file 10 note |
| `fowling_gun` | the long side-by-side hammer game gun | kept, tightened to the pattern |
| `brigade_shot_pistol` | the stockless short box-fed shotgun on the stamped long-stroke body | reviewed: was a plated box with a ram plate |
| `brigade_drum_shotgun` | the full-auto drum shotgun with the straight-line box body | file 10 note |
| `lumeri_hand_scatter` | the short pistol-grip pump shotgun with a breaching standoff | reviewed: was a bell-muzzle pistol |
| `lumeri_long_scatter` | the semi-auto gas-operated tube-fed combat shotgun | file 10 note |

The bows and the arbalest stay invented (R3 covers guns only). Faction signatures that changed a gun's outline (Brigade plates and ram plates, Hellraiser bayonets and spikes) are dropped from these forms; each keeps its maker's touch as a colour band, a crest at the stock heel, a tag or a pin, matching the repaints of file 10.

## Counts

17 pictures in the artist file (15 gun forms, 2 bow forms), each painted at five grades under S1 (the master plus four grade pictures, 68 grade pictures). Seven of the fifteen gun forms were redrawn from file 10's notes and six more on review; two were kept and tightened.

## Final pass, 19 Nov 2026 (what changed in the artist file)

- The base prompt no longer says "three-quarter view", "fills about 80%" or "everything is invented": the name, maker and
  markings are invented, and the gun pattern clause says it governs a gun's silhouette. Bows stay invented.
- **Legion marksman rifle:** no longer a longer-barrelled invented layout; it is the bullpup pattern's issued marksman fit
  (a scope on the carry handle, the bipod legs spread). The bullpup and the Whisper SMG are now repainted in file 10, so
  their siblings say "paint after the repaint".
- **Lumeri hand scatter and long scatter:** one maker's touch each (a gold inlay line); the lancet cut-outs and the spire
  sight changed the outline.
- The long shotguns (fowling gun, Lumeri long scatter) are 85% wide, stated in the scale rule. One frame rule: inside the
  central 90%, at least 50 px of margin. "Section 3.2" of file 10 is now "section 1".
