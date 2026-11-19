# Melee weapons: 19 new painted icons

19 new melee weapon pictures, one per prompt, in 12 families of three forms. Every picture here is a master at the Standard finish, a transparent 1024 x 1024 PNG. Each is painted at all five grades: the Standard master below, then its four grade pictures (fine, masterwork, relic, celestial), made image to image from the approved master by the method in `08-grades-and-uniques.md` and saved as `weapon-<id>--<tier>.png` in the same folder.

## How to use

One image a prompt. Paste the base prompt below first, then the entry's prompt, and attach the base references plus the entry's family reference painting. Save under the file name given, do not rename. Deliver one contact sheet per family (the new forms beside the existing one, each checked at 64 and 32 px on `#10151F`). In-world only: invented shapes, no real-world makes, models, maker marks or emblems; no text, letters or numbers in any image.

## Base prompt: Heavenprint gear icon (painted weapon)

**Attach:** `art/sprites/objects/fuel-drum.png`, `art/sprites/objects/tool-rack.png` and `art/sprites/objects/field-lamp.png` (material treatment and edge hierarchy only; their top-down camera does not apply), `art/portraits/world/new-faces/orren-vask.png` (the brushwork), and **the family reference painting named in the entry** (`art/icons/gear/weapon-<id>.png`: the style, the pose and the scale the new form must match). Rules: `art/style-guide/gear-icons.md`, `art/style-guide/weapon-icons.md`.

**Size / background:** 1024 x 1024 PNG with alpha, fully transparent, the object inside the central 90% of the canvas (at least 50 px of clear margin on every side); each entry gives the object's own width.

```
Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss and no uniform digital sharpness. One single melee weapon, in the pose the description gives, lit from one side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene, no sheath, no stand. Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha; the weapon fills about 80% of the canvas (inside the central 90%). No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands and no figures, no blood. Nothing floats: every part touches the weapon. Everything is invented: never a recognisable real-world make, model or emblem. The silhouette must be bold and instantly readable first: the icon is shown at 64 px in a shop grid and at 32 px in a backpack row, so keep detail on one or two focal edges and make the shape unmistakable when shrunk. Metal is painted in charcoal, steel grey and warm ivory highlights; the maker's colour is the single accent, a muted local paint, never a glow. Standard finish with honest wear (no rarity border, no engraving beyond what is asked). Match the attached reference painting of the same family exactly in brushwork, pose and scale: blades and hafted weapons lie on the 45 degree diagonal, grip bottom-left, head or point top-right; gloves stand upright. The weapon is:
```

**Avoid in every entry:** a real-world named sword, knife or axe pattern copied whole; a scabbard, belt or display stand; sparks, glints drawn as stars, motion lines; a second object; any lettering on the blade.

---

## The families (read before painting)

Each family has three forms. Reach, mass and guard tell them apart at 32 px: **reach** reads from the grip-to-head ratio (every form fills the frame by the same rule, so a short weapon shows a long grip against its blade and a long one a small grip); **mass** from the width of the blade or head and the thickness of the haft (light form narrow, heavy form visibly heavy with its weight forward); **guard** from the hilt (no two forms of one family share a hilt silhouette).

| # | Family | Light / middle / heavy form | Already painted (attach) | New in this file |
| --- | --- | --- | --- | --- |
| 1 | Service knives | `combat_knife` / trench knife / lowland chopper | `combat_knife` | trench knife, lowland chopper |
| 2 | Cavalry blades | `sabre` / dock cutter / broadback sabre | `sabre` | dock cutter, broadback sabre |
| 3 | Legion blades | legion leaf-dagger / `legion_gladius` / legion rank sword | `legion_gladius` | leaf-dagger, rank sword |
| 4 | Draw blades | short draw / `katana` / long draw | `katana` | short draw, long draw |
| 5 | Kemizuchi duelling | `kemizuchi_duelling_blade` / side-sword / sword-breaker | `kemizuchi_duelling_blade` | side-sword, sword-breaker |
| 6 | Axes | pitch axe / `hatchet` / `war_axe` | `hatchet` | pitch axe |
| 7 | Polearms | legion spear / `glaive` / `lance` | `glaive`, `lance` | legion spear |
| 8 | Hammers | war pick / war hammer / `maul` | `maul` | war pick, war hammer |
| 9 | Great blades | plate needle / Brigade longsword / `adamantile_greatsword` | `adamantile_greatsword` | plate needle, longsword |
| 10 | Scrap cutters | ork skinner / `ork_machete` / ork cleaver-glaive | `ork_machete` | skinner, cleaver-glaive |
| 11 | Hand-to-hand gloves | `striking_gloves` / `hand_wraps` / `knuckledusters` | (all exist) | none |
| 12 | Heavy fists (gloves) | `kemizuchi_strikers` / weighted gloves / `iron_mitts` | `kemizuchi_strikers`, `iron_mitts` | weighted gloves |

Where these pictures show: the shop grid (64 px), backpack and inventory rows (32 px), loot and reward cards, the gear card, and a row of the family's three forms side by side, so the three must read apart at 32 px.

---

# 1. Service knives

## 1. `trench_knife`: Trench knife

- **Save as:** `art/icons/gear/weapon-trench_knife.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-combat_knife.png`
- **Is:** the service-knife family's middle form, Hellraiser issue: a fighting knife for close trench work, light enough for a knife fighter, heavy enough to punch through a padded coat. One-handed.
- **At icon size it must read as:** a knife whose grip is closed by a spiked knuckle loop.

```
The Hellraiser Divisions' trench knife. On the 45 degree diagonal like the attached service knife, the same frame. A straight double-edged spear-point blade, a little longer and wider than the plain service knife's, with a short central ridge. The grip is closed by a solid steel knuckle loop running from the crossguard to the pommel, with three short blunt pyramid studs along the loop's outer edge; a squared pommel with one short spike. Blackened steel blade with a bright worn edge, black ribbed grip, dark parkerised loop with rubbed-bright studs. Accent: oxide red #CC2435 as one muted painted band across the knuckle loop.
Avoid: finger holes like a knuckle-duster (it is one solid loop), a serrated back, a bayonet lug, a long crossguard.
```

## 2. `lowland_chopper`: Lowland chopper

- **Save as:** `art/icons/gear/weapon-lowland_chopper.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-combat_knife.png`
- **Is:** the family's heavy form: the Black Scavengers' short brush blade from the ruined lowlands past the desert, for wire, scrub and whoever is in the scrub. One-handed, its weight in the tip.
- **At icon size it must read as:** a teardrop of steel on a short handle, fat at the far end.

```
A heavy short chopping blade from the ruined lowlands, scavenger-made. On the 45 degree diagonal like the attached service knife, the same frame. A single-edged blade, narrow where it leaves the grip and swelling into a heavy rounded belly near the tip; the spine nearly straight, the tip round and blunt; no guard, only a thick steel collar. The weight sits visibly forward. Dark carbon steel, pitted near the spine, a bright freshly ground edge; a grip of two mismatched wooden scales held by three steel rivets; a strip of faded grey cloth knotted through a hole in the butt, hanging short and touching the grip. No accent colour: bare scavenger work.
Avoid: a curved sword shape, a hook at the tip, a crossguard, a knuckle loop, a machete's long straight blade (the Ork family has that).
```

# 2. Cavalry blades

## 3. `dock_cutter`: Dock cutter

- **Save as:** `art/icons/gear/weapon-dock_cutter.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-sabre.png`
- **Is:** the cavalry line's middle form: a short, broad curved blade for close work on ship decks and loading docks, where a long sabre catches on everything. One-handed.
- **At icon size it must read as:** a short broad curve with a round solid cup over the grip.

```
A short boarding blade of the frontier docks. On the 45 degree diagonal like the attached sabre, the same frame. A single-edged blade with a gentle curve, clearly shorter and broader than the sabre's, the point clipped short. The whole grip is enclosed by a solid dished steel shell guard, a round cup that runs from the blade's base round to the pommel, its rim rolled. Polished steel with small freckles of salt rust near the guard, black leather grip bound in wire. Accent: gilt on the rolled rim of the shell guard (the cavalry family's gilt).
Avoid: an open knuckle bow (that is the sabre), a pierced or basket-work guard, a pirate look, skulls.
```

## 4. `broadback_sabre`: Broadback sabre

- **Save as:** `art/icons/gear/weapon-broadback_sabre.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-sabre.png`
- **Is:** the cavalry line's heavy form: a sabre hilt carrying a blade that widens toward its end, so the cut lands with the weight of a cleaver. One-handed.
- **At icon size it must read as:** a sabre hilt with a blade that flares wide at the end.

```
The cavalry line's heavy cutting sword. On the 45 degree diagonal like the attached sabre, the same frame. A single-edged blade, narrow at the hilt and widening steadily toward its end, the edge bowing outward while the spine stays nearly straight, finishing in a clipped, angled point at its widest part. A short fuller along the spine. The hilt is the family's: an open knuckle bow, but thicker than the sabre's, with a short straight quillon on the other side. Polished steel with a darker patch of wear along the belly, dark leather grip. Accent: gilt on the knuckle bow.
Avoid: a cleaver's square end, a cup or shell guard (that is the dock cutter), an even-width blade.
```

# 3. Legion blades

## 5. `legion_leaf_dagger`: Legion leaf-dagger

- **Save as:** `art/icons/gear/weapon-legion_leaf_dagger.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-legion_gladius.png`
- **Is:** the Legion family's light form: the issue dagger every Thousand World Legion trooper carries at the belt, the line blade's leaf shape cut down to a hand. One-handed.
- **At icon size it must read as:** a small leaf blade with a round disc pommel.

```
The Thousand World Legion's issue dagger. On the 45 degree diagonal like the attached Legion line blade, the same frame. A short broad double-edged leaf-shaped blade, waisted just below the middle and swelling again before the point, with a strong raised midrib. A short straight bar guard, a grip with a round swelling at its middle, and a flat round disc pommel. Plain mass-made steel with even grinding marks, olive-grey grip, one line of three bright rivets through the guard. No accent: anonymous, numberless, issued by the thousand.
Avoid: a crossguard with curled tips, ornament or inlay, any marking, a long thin stiletto blade.
```

## 6. `legion_rank_sword`: Legion rank sword

- **Save as:** `art/icons/gear/weapon-legion_rank_sword.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-legion_gladius.png`
- **Is:** the Legion family's heavy form: the long straight blade of the front rank, cutting down over the shield wall. One-handed.
- **At icon size it must read as:** a long plain straight blade on the Legion's block guard.

```
The Thousand World Legion's front-rank sword. On the 45 degree diagonal like the attached Legion line blade, the same frame. A long straight double-edged blade with parallel edges and a rounded cutting point, nearly twice the length of the family's leaf-shaped line blade and narrower, with one broad shallow fuller down its middle. The same stout plain block guard as the line blade, a plain grip and a round knob pommel. Plain mass-made steel, olive-grey grip, a few honest nicks along the edge. No accent: anonymous issue.
Avoid: a leaf-shaped blade, a long two-hand grip, a knightly cross with plate wings (that is the Brigade), crests.
```

# 4. Draw blades

## 7. `short_draw`: Short draw

- **Save as:** `art/icons/gear/weapon-short_draw.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-katana.png`
- **Is:** the draw family's light form: the schools' companion blade, drawn and cut in one motion at arm's length or closer. One-handed.
- **At icon size it must read as:** the family's curve, short, with a grip long against its blade.

```
The short companion blade of the Kemizuchi schools' sheath line. On the 45 degree diagonal like the attached long curved sword, the same frame, but shorter in the blade, so the grip looks long against it. A single-edged blade with one gentle continuous curve and a sharp angled point, a pale tempered line running wavy along the edge. A small round aged-brass guard collar and a brass end cap; the grip wrapped in a tight diamond lattice of dark cord, about a third of the blade's length. Steel with a soft polish, the cord rubbed pale where the thumb sits. Accent: aged brass.
Avoid: crimson cord (that is the Academy duelling line), a sheath, a straight blade, a guard with arms.
```

## 8. `long_draw`: Long draw

- **Save as:** `art/icons/gear/weapon-long_draw.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-katana.png`
- **Is:** the draw family's heavy form: the schools' great two-handed curved blade, carried across the back and drawn by stepping out from under it. Two-handed.
- **At icon size it must read as:** a long crescent with a two-hand grip; longer and heavier than the middle form.

```
The great two-handed curved blade of the Kemizuchi schools' sheath line. On the 45 degree diagonal, nearly corner to corner, the same frame rule as the attached long curved sword, so the blade looks long and the grip small against it. A long, broad single-edged blade with a deep curve near the grip that straightens toward the point, a wide back, a pale wavy tempered line along the edge. A broad round aged-brass guard, a long grip for two hands in a diamond lattice of dark cord, a heavy brass end cap. Steel with a deep, cared-for polish and one long scratch along the flat. Accent: aged brass.
Avoid: a polearm shaft, a straight blade, crimson cord, a sheath or strap.
```

# 5. Kemizuchi duelling

## 9. `kemizuchi_side_sword`: Kemizuchi side-sword

- **Save as:** `art/icons/gear/weapon-kemizuchi_side_sword.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-kemizuchi_duelling_blade.png`
- **Is:** the Academy duelling family's middle form: the officer's everyday sword, cut and thrust, with more blade than the duelling needle and more guard for the hand. One-handed.
- **At icon size it must read as:** a straight blade with the family's dish guard plus a looping bar.

```
The Kemizuchi Military Academy's officer sword. On the 45 degree diagonal like the attached duelling blade, the same frame. A straight double-edged blade, clearly wider than the duelling blade's and tapering to an acute point, with a short fuller near the hilt. The hilt keeps the family's swept dish guard and adds a single side ring and one curving knuckle bar from the guard to the pommel. Bright steel, the guard blackened steel, a lacquered black grip bound with crimson cord. Accent: lacquer crimson #86234E in the cord.
Avoid: a full basket of bars, a curved blade, a needle-thin blade (that is the duelling blade), gilt.
```

## 10. `kemizuchi_sword_breaker`: Kemizuchi sword-breaker

- **Save as:** `art/icons/gear/weapon-kemizuchi_sword_breaker.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-kemizuchi_duelling_blade.png`
- **Is:** the Academy duelling family's heavy form: a short, heavy blade whose back is cut into deep slots that catch an opponent's blade and twist it out of the hand. One-handed.
- **At icon size it must read as:** a short broad blade with a comb of slots along its back.

```
The Kemizuchi Military Academy's blade-catcher. On the 45 degree diagonal like the attached duelling blade, the same frame, so the short blade is drawn large. A short, thick, straight single-edged blade; its spine is cut into a comb of four deep square slots, each slot as wide as the teeth between them so the gaps stay open when shrunk. A heavy straight crossguard with rounded tips, a short lacquered black grip, a squared pommel. Dark blued steel with bright edges on the comb's teeth, crimson cord bound at the pommel. Accent: lacquer crimson #86234E.
Avoid: a saw with many small teeth, a serrated edge, a dish guard (the family's quick forms carry it), a curved blade.
```

# 6. Axes

## 11. `pitch_axe`: Pitch axe

- **Save as:** `art/icons/gear/weapon-pitch_axe.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-hatchet.png`
- **Is:** the axe family's light form: a light frontier throwing axe, balanced to be pitched end over end and to hook in close. One-handed.
- **At icon size it must read as:** a slim head with a back spike on a long thin haft.

```
A light frontier throwing axe. On the 45 degree diagonal like the attached hatchet, the same frame. A narrow blackened head with a small flared bit and a bright edge, and on the back of the head a short square spike; the head sits on a long, straight, slim haft (longer and thinner than the hatchet's), leather-wrapped at the grip and ending in a small round knob. Oiled walnut haft, blackened steel head, worn brown leather. No accent: frontier, unbranded.
Avoid: feathers, beads, painted tribal patterns, a pipe bowl in the head, a broad bit (that is the hatchet).
```

# 7. Polearms (spear / glaive / lance)

## 12. `legion_spear`: Legion spear

- **Save as:** `art/icons/gear/weapon-legion_spear.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-glaive.png`
- **Is:** the light end of the polearm family: the plain thrusting spear of the Legion guard, quick to recover. Two-handed.
- **At icon size it must read as:** a thin pole with a small leaf head and a crossbar under it.

```
A plain thrusting spear of the Thousand World Legion's guard. On the 45 degree diagonal, nearly corner to corner like the attached glaive, the head top-right. A small slim leaf-shaped head with a raised midrib on a long, straight, thin ash shaft; a short straight steel bar set crosswise just below the head as a stop; a small iron butt cap. Plain mass-made steel, pale ash with a grip patch of olive-grey wrap. No accent: anonymous issue.
Avoid: a curved blade (that is the glaive), a cone or vamplate (that is the lance), a pennant, a long winged crossbar.
```

# 8. Hammers

## 13. `war_pick`: War pick

- **Save as:** `art/icons/gear/weapon-war_pick.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-maul.png`
- **Is:** the hammer family's light form: one narrow beak that finds the gap in plate, swung fast from one hand. One-handed.
- **At icon size it must read as:** a thin downward beak on a hammer's haft; a pick, not an axe.

```
A dockside war pick. On the 45 degree diagonal like the attached maul, the same frame, the head top-right. A narrow, slightly down-curved beak of square section on one side of the head, tapering to a point; a small flat hammer face on the other side; two iron straps running a hand's length down the haft from the head. A medium-length ash haft, banded twice with iron, wrapped in leather at the grip. Dark iron head with a bright worn point, worn ash. No accent: frontier and dockside.
Avoid: a mining pickaxe with two long arms, an axe blade, a thick block head (that is the maul).
```

## 14. `war_hammer`: War hammer

- **Save as:** `art/icons/gear/weapon-war_hammer.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-maul.png`
- **Is:** the hammer family's middle form: a hand-and-a-half hammer, a squared face for crushing and a spike behind it for the follow-up. One or two hands.
- **At icon size it must read as:** a squared head with a curved spike behind it, about half the maul's head.

```
A dockside war hammer. On the 45 degree diagonal like the attached maul, the same frame, the head top-right. A squared hammer head with a slightly domed, cross-cut striking face, about half the size of the maul's iron block, and a short, thick, down-curved spike on the back. A haft shorter than the maul's, of ash banded with three iron rings, a leather grip long enough for two hands. Dark iron with bright worn corners on the face, chipped ash. No accent: frontier and dockside.
Avoid: a carpenter's claw hammer, a blacksmith's hammer, a block with no spike (that is the maul), ornament.
```

# 9. Great blades

## 15. `adamantile_plate_needle`: Plate needle

- **Save as:** `art/icons/gear/weapon-adamantile_plate_needle.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-adamantile_greatsword.png`
- **Is:** the great-blade family's light form: the Adamantile Brigade's answer to plate, a long two-handed blade with no edge at all, driven into the gaps. Two-handed.
- **At icon size it must read as:** a long needle on the Brigade's big plate guard.

```
The Adamantile Brigade's plate needle. On the 45 degree diagonal, nearly corner to corner like the attached greatsword, the same frame. A long, rigid, edgeless blade of four-sided diamond section, as long as the greatsword's but a fraction of its width, tapering steadily to a needle point; a hard ridge of light runs down its centre. An oversized plate crossguard of two flat angled wings, a small crest boss at its centre, a long two-hand grip and a faceted pommel. Pale steel with ivory highlights, gilt on the crest boss. Accent: one thin brass-orange #F68A38 line painted down the base of the blade (the family's fuller line).
Avoid: a fencing foil or bell guard, a wide blade, a flexible-looking blade, gems.
```

## 16. `adamantile_longsword`: Brigade longsword

- **Save as:** `art/icons/gear/weapon-adamantile_longsword.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-adamantile_greatsword.png`
- **Is:** the great-blade family's middle form: the Adamantile knight's hand-and-a-half sword, one hand with a shield, two without.
- **At icon size it must read as:** a classic cross shape, mid-width: between the needle and the slab.

```
The Adamantile Brigade knight's longsword. On the 45 degree diagonal like the attached greatsword, the same frame. A straight double-edged blade of medium width (clearly narrower than the greatsword's slab, clearly wider than a needle), tapering to a firm point, with a fuller running two thirds of its length. A crossguard of two plate wings with squared ends, a grip long enough for one hand and a half, and a pommel shaped as a small crest. Pale steel, ivory highlights on the edges, gilt on the pommel crest. Accent: brass-orange #F68A38 as a painted line inside the fuller.
Avoid: a wide slab blade (that is the greatsword), a curved blade, a cross with real-world religious symbols, gems, a ring-shaped pommel.
```

# 10. Scrap cutters

## 17. `ork_skinner`: Ork skinner

- **Save as:** `art/icons/gear/weapon-ork_skinner.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-ork_machete.png`
- **Is:** the Ork family's light form: a short hooked blade for quick work at the throat and the hamstring. One-handed.
- **At icon size it must read as:** a short hook-shaped blade with a notched back.

```
An Ork skinning hook. On the 45 degree diagonal like the attached Ork machete, the same frame. A short, crude blade bent forward into a hook, the sharpened edge on the inside of the curve, the outer back cut with five uneven saw notches; hammered from a scrap bar, uneven in thickness. The grip is a length of pipe wrapped in oily leather with two nails driven through it, the nail heads proud. Rusted steel with a bright ground inner edge, dark leather. Accent: dirty ochre paint daubs, two uneven stripes on the flat.
Avoid: a neat curved knife, a sickle on a long handle, a bone handle, gore.
```

## 18. `ork_cleaver_glaive`: Ork cleaver-glaive

- **Save as:** `art/icons/gear/weapon-ork_cleaver_glaive.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-ork_machete.png`
- **Is:** the Ork family's heavy form: an Ork machete grown too big for a hand and welded onto a pole. Two-handed.
- **At icon size it must read as:** a big square slab of blade on a short thick pole.

```
An Ork cleaver-glaive. On the 45 degree diagonal like the attached Ork machete, the head top-right and taking up half the length. A huge, roughly rectangular cleaver blade, twice the machete's width, with a jagged, uneven back and one belly-curved edge, welded at its base onto a short, thick steel pipe pole by a bolted collar with a bead of rough weld; a lump of scrap iron is bolted to the butt as a counterweight. Rust, scorched steel, nails driven through a leather grip patch. Accent: dirty ochre daubs, three uneven stripes across the blade.
Avoid: a neat polearm, a chain or engine (that is the rip-saw), skulls, gore.
```

# 12. Heavy fists (gloves)

## 19. `weighted_gloves`: Weighted gloves

- **Save as:** `art/icons/gear/weapon-weighted_gloves.png`
- **Shows in:** shop grid (64 px), backpack rows (32 px), loot cards, the gear card, the family form row.
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-iron_mitts.png` (and `art/icons/gear/weapon-kemizuchi_strikers.png`)
- **Is:** the heavy-fist family's middle form: Smetanita Conjunction collector's gloves, soft black leather with a pad of lead shot sewn across the knuckles, so a punch lands like a cosh. Light, one-handed.
- **At icon size it must read as:** a glove with a fat padded knuckle ridge: softer than the iron mitt, heavier than the strikers.

```
A Smetanita Conjunction weighted glove. Upright, back of the hand toward the viewer, filling the frame like the attached iron mitt; one glove, empty, no hand inside, the fingers half-curled toward a fist. Across the knuckles a thick swollen pad sewn into the leather, its row of stitched lumps showing the lead shot inside; a short wrist cuff closed by one strap and a square brass buckle. Black lacquered leather, polished at the knuckles and creased at the finger joints. Accent: brass, in the buckle and one line of brass stud seam along the cuff.
Avoid: metal plates or rivets on the back (that is the iron mitt), finger rings or a bar (that is the knuckle-duster), a boxing glove, spikes.
```
