# GPT prompts, 19 Nov 2026, file 05: Items 2.0, the 19 new melee base forms (PROPOSED)

For the artist, and for GPT. Source list: `art/briefs/ART-REQUESTS-2026-11-19.md`, section 4.3, the melee table (12 families, 36 forms: 17 exist and are painted, 19 new). **Every form, name and id here is PROPOSED: Leon has ruled the shape (families of three forms) but not the tables** (ART-REQUESTS 4.8 question 3). Items 2.0 comes after 0.32: 0.33 builds the system on today's art, 0.34.x adds the content as the art lands, so these are paint-ahead pictures with no data row yet. What each form does in a fight is not designed beyond its role (below); the prompts describe the object only.

**20 pictures: 19 painted gear icons, plus 1 alternate** (entry 12b, the spear, painted only if Leon takes the recommendation of question 3 and drops the poleaxe). Masters only, at Standard finish: the five grade pictures of each form (scheme S1, ruled 19 Nov) are made later, image-to-image from the **approved** master, with the tier lines of `GPT-PROMPTS-2026-11-13-gear.md` section 4.

## How to use

One image a prompt. Paste **the base prompt (below)**, then the entry's prompt, and attach the base references plus the entry's family reference painting. Save under the file name given, do not rename. Every delivery is a review candidate until Leon approves it; deliver one contact sheet per family (the new forms beside the existing one, each checked at 64 and 32 px on `#10151F`); Claude adds the catalog entries (`gear` map) on intake. In-world only: invented shapes, no real-world makes, models, maker marks or emblems; no text, letters or numbers in any image.

## Base prompt: Heavenprint gear icon (painted weapon)

**Attach:** `art/sprites/objects/fuel-drum.png`, `art/sprites/objects/tool-rack.png` and `art/sprites/objects/field-lamp.png` (material treatment and edge hierarchy only; their top-down camera does not apply), `art/portraits/world/new-faces/orren-vask.png` (the brushwork), and **the family reference painting named in the entry** (`art/icons/gear/weapon-<id>.png`: the style, the pose and the scale the new form must match). Rules: `art/style-guide/gear-icons.md`, `art/style-guide/weapon-icons.md`.

**Size / background:** 1024 x 1024 PNG with alpha, fully transparent, the weapon inside the central 80 to 85% (about 100 px clear margin on every side).

```
Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows, warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D render, no airbrushed gloss and no uniform digital sharpness. One single melee weapon, three-quarter view, lit from one side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene, no sheath, no stand. Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha; the weapon fills about 80% of the canvas (keep it inside the central 80 to 85%). No text, no letters, no numbers, no logos, no maker marks, no borders, no frame, no hands and no figures, no blood. Nothing floats: every part touches the weapon. Everything is invented: never a recognisable real-world make, model or emblem. The silhouette must be bold and instantly readable first: the icon is shown at 64 px in a shop grid and at 32 px in a backpack row, so keep detail on one or two focal edges and make the shape unmistakable when shrunk. Metal is painted in charcoal, steel grey and warm ivory highlights; the maker's colour is the single accent, a muted local paint, never a glow. Standard finish with honest wear (no rarity border, no engraving beyond what is asked). Match the attached reference painting of the same family exactly in brushwork, pose and scale: blades and hafted weapons lie on the 45 degree diagonal, grip bottom-left, head or point top-right; gloves stand upright. The weapon is:
```

**Avoid in every entry:** a real-world named sword, knife or axe pattern copied whole; a scabbard, belt or display stand; sparks, glints drawn as stars, motion lines; a second object; any lettering on the blade.

---

## The family sheet (read before painting)

**Forms.** Every melee family has three forms: a **Dexterity form** (quick, light, hits with Dexterity and grows with Agility), a **hybrid form** (between the two; the family's balanced middle, usually the piece that exists today), and a **Strength form** (heavy, hits with Raw Power and grows with Strength; rules 1.56). The art shows this as **reach, mass and guard**:

- **Reach** reads from the **grip-to-head ratio**, not from size: every form fills the frame by the same rule (gear-icons.md "Scale in a family"), so a short weapon shows a grip that is long against its blade, a long one a grip that is small against it.
- **Mass** reads from the **width of the blade or head** and the thickness of the haft: the Dexterity form is narrow, the Strength form visibly heavy, its weight forward.
- **Guard** reads from the **hilt**: each form has its own guard shape, so two forms of one family never share a hilt silhouette.

| # | Family (PROPOSED in-world name) | Dexterity / hybrid / Strength | Maker and signature (one accent) | At a glance |
| --- | --- | --- | --- | --- |
| 1 | Service knives | `combat_knife` / *trench knife* / *lowland chopper* | Issue and frontier steel: black blades, black wraps, no accent; the trench knife is Hellraiser issue (oxide red `#CC2435`, trench spikes); the chopper is Black Scavenger work (riveted scales, a rag) | open grip / closed spiked knuckle loop / a forward-heavy belly |
| 2 | Cavalry blades | `sabre` / *dock cutter* / *broadback sabre* | The officer's line: curved single edges, gilt knuckle bows | open bow, slim curve / solid cup guard, short broad blade / thick bow, blade widening to a clipped end |
| 3 | Legion blades | *leaf-dagger* / `legion_gladius` / *rank sword* | Thousand World Legion: plain mass-made steel, olive-grey grips, no accent, block guards | short leaf, disc pommel / broad leaf, stout guard / long straight blade, same guard |
| 4 | Draw blades (working name "Eastern blades") | *short draw* / `katana` / *long draw* | The Kemizuchi schools' sheath line: one continuous curve, a round aged-brass collar, a diamond-lattice cord grip; no crimson (that is the Academy duelling line) | short curve, long grip / the middle curve / long two-hand crescent |
| 5 | Kemizuchi duelling | `kemizuchi_duelling_blade` / *side-sword* / *sword-breaker* | Kemizuchi Military Academy: straight blades, swept dish guards, lacquer black with crimson cord `#86234E` | needle-slim / wider blade, dish plus a ring / short broad blade with a slotted spine |
| 6 | Axes | *pitch axe* / `hatchet` / `war_axe` | Frontier, unbranded: walnut and ash, leather wraps, bare steel | slim bit and back spike on a long stick / broad short bit / huge bearded head |
| 7 | Polearms | `lance` / `glaive` / *poleaxe* | Mixed: the lance and poleaxe are Adamantile Brigade (pale steel, gilt, brass-orange `#F68A38`, plate rondels), the glaive frontier | cone and vamplate / one curved blade / a three-part head |
| 8 | Hammers | *war pick* / *war hammer* / `maul` | Frontier and dockside: dark iron heads, banded ash hafts, no accent | thin beak / squared head with a back spike / a block of iron |
| 9 | Great blades | *plate needle* / *Brigade longsword* / `adamantile_greatsword` | Adamantile Brigade: pale steel, oversized plate guards, crests, a brass-orange line in the fuller | long needle / mid-width cross / wide slab |
| 10 | Ork cutters | *skinner* / `ork_machete` / *cleaver-glaive* | Orks: jagged, nailed, uneven; rust and dirty ochre daubs | short hook / wide jagged cleaver / a cleaver slab on a pole |
| 11 | Hand-to-hand (gloves) | `striking_gloves` / `hand_wraps` / `knuckledusters` | (nothing new) | |
| 12 | Heavy fists (gloves) | `kemizuchi_strikers` / *weighted gloves* / `iron_mitts` | Mixed makers, one glove scale: the strikers Kemizuchi, the weighted gloves Smetanita Conjunction (lacquer black leather, brass), the mitts foundry iron | slim armoured knuckle / padded swollen knuckle / riveted iron block |

**Names (the Unspoken Name).** The working names in ART-REQUESTS borrow real-Earth weapon words. Each gets an in-world name and id, **PROPOSED** for Leon; the prompts use only the in-world name. Existing ids are not renamed (`katana` and `legion_gladius` keep theirs; Leon may want an in-world display name for the katana too).

| Working name | PROPOSED in-world name | PROPOSED id | Why |
| --- | --- | --- | --- |
| bolo | Lowland chopper | `lowland_chopper` | the Black Scavengers' brush blade, from the ruined lowlands |
| cutlass | Dock cutter | `dock_cutter` | the short boarding blade of the frontier docks and ship crews |
| falchion | Broadback sabre | `broadback_sabre` | the cavalry line's heavy cut, named for its widening back |
| pugio | Legion leaf-dagger | `legion_leaf_dagger` | the gladius's leaf shape at dagger size |
| spatha | Legion rank sword | `legion_rank_sword` | the long blade of the Legion's front rank |
| "Eastern blades" (family) | Draw blades | (family, no id) | the schools' rule that a blade is drawn once (the katana's own lore) |
| wakizashi | Short draw | `short_draw` | |
| odachi | Long draw | `long_draw` | |
| estoc | Plate needle | `adamantile_plate_needle` | the Brigade's answer to plate: a blade with no edge |
| tomahawk | Pitch axe | `pitch_axe` | the frontier throwing axe ("pitched", not swung) |
| trench knife, side-sword, sword-breaker, poleaxe, war pick, war hammer, longsword, skinner, cleaver-glaive, weighted gloves | kept (plain descriptive words) | `trench_knife`, `kemizuchi_side_sword`, `kemizuchi_sword_breaker`, `adamantile_poleaxe`, `war_pick`, `war_hammer`, `adamantile_longsword`, `ork_skinner`, `ork_cleaver_glaive`, `weighted_gloves` | |

**Where all of these show:** the shop grid (64 px), the backpack and inventory rows (32 px), loot and reward cards, the Forge, the gear card; from 0.33 the family's form row (three forms side by side, so the three must read apart at 32 px).

---

# 1. Service knives

## 1. `trench_knife`: Trench knife (hybrid form)

- **Save as:** `art/icons/gear/weapon-trench_knife.png` (catalog `gear`, id `weapon-trench_knife`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-combat_knife.png`
- **Is:** the service-knife family's middle form, Hellraiser issue: a fighting knife for close trench work, light enough for a knife fighter, heavy enough to punch through a padded coat. One-handed, about 0.8 kg.
- **At icon size it must read as:** a knife whose grip is closed by a spiked knuckle loop.

```
The Hellraiser Divisions' trench knife. On the 45 degree diagonal like the attached service knife, the same frame. A straight double-edged spear-point blade, a little longer and wider than the plain service knife's, with a short central ridge. The grip is closed by a solid steel knuckle loop running from the crossguard to the pommel, with three short blunt pyramid studs along the loop's outer edge; a squared pommel with one short spike. Blackened steel blade with a bright worn edge, black ribbed grip, dark parkerised loop with rubbed-bright studs. Accent: oxide red #CC2435 as one muted painted band across the knuckle loop.
Avoid: finger holes like a knuckle-duster (it is one solid loop), a serrated back, a bayonet lug, a long crossguard.
```

## 2. `lowland_chopper`: Lowland chopper (Strength form; working name "bolo")

- **Save as:** `art/icons/gear/weapon-lowland_chopper.png` (catalog `gear`, id `weapon-lowland_chopper`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-combat_knife.png`
- **Is:** the family's Strength form: the Black Scavengers' short brush blade from the ruined lowlands past the desert, for wire, scrub and whoever is in the scrub. One-handed, about 1.2 kg, its weight in the tip.
- **At icon size it must read as:** a teardrop of steel on a short handle, fat at the far end.

```
A heavy short chopping blade from the ruined lowlands, scavenger-made. On the 45 degree diagonal like the attached service knife, the same frame. A single-edged blade, narrow where it leaves the grip and swelling into a heavy rounded belly near the tip; the spine nearly straight, the tip round and blunt; no guard, only a thick steel collar. The weight sits visibly forward. Dark carbon steel, pitted near the spine, a bright freshly ground edge; a grip of two mismatched wooden scales held by three steel rivets; a strip of faded grey cloth knotted through a hole in the butt, hanging short and touching the grip. No accent colour: bare scavenger work.
Avoid: a curved sword shape, a hook at the tip, a crossguard, a knuckle loop, a machete's long straight blade (the Ork family has that).
```

# 2. Cavalry blades

## 3. `dock_cutter`: Dock cutter (hybrid form; working name "cutlass")

- **Save as:** `art/icons/gear/weapon-dock_cutter.png` (catalog `gear`, id `weapon-dock_cutter`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-sabre.png`
- **Is:** the cavalry line's middle form: a short, broad curved blade for close work on ship decks and loading docks, where a long sabre catches on everything. One-handed, about 1.6 kg.
- **At icon size it must read as:** a short broad curve with a round solid cup over the grip.

```
A short boarding blade of the frontier docks. On the 45 degree diagonal like the attached sabre, the same frame. A single-edged blade with a gentle curve, clearly shorter and broader than the sabre's, the point clipped short. The whole grip is enclosed by a solid dished steel shell guard, a round cup that runs from the blade's base round to the pommel, its rim rolled. Polished steel with small freckles of salt rust near the guard, black leather grip bound in wire. Accent: gilt on the rolled rim of the shell guard (the cavalry family's gilt).
Avoid: an open knuckle bow (that is the sabre), a pierced or basket-work guard, a pirate look, skulls.
```

## 4. `broadback_sabre`: Broadback sabre (Strength form; working name "falchion")

- **Save as:** `art/icons/gear/weapon-broadback_sabre.png` (catalog `gear`, id `weapon-broadback_sabre`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-sabre.png`
- **Is:** the cavalry line's Strength form: a sabre hilt carrying a blade that widens toward its end, so the cut lands with the weight of a cleaver. One-handed, about 2 kg.
- **At icon size it must read as:** a sabre hilt with a blade that flares wide at the end.

```
The cavalry line's heavy cutting sword. On the 45 degree diagonal like the attached sabre, the same frame. A single-edged blade, narrow at the hilt and widening steadily toward its end, the edge bowing outward while the spine stays nearly straight, finishing in a clipped, angled point at its widest part. A short fuller along the spine. The hilt is the family's: an open knuckle bow, but thicker than the sabre's, with a short straight quillon on the other side. Polished steel with a darker patch of wear along the belly, dark leather grip. Accent: gilt on the knuckle bow.
Avoid: a cleaver's square end, a cup or shell guard (that is the dock cutter), an even-width blade.
```

# 3. Legion blades

## 5. `legion_leaf_dagger`: Legion leaf-dagger (Dexterity form; working name "pugio")

- **Save as:** `art/icons/gear/weapon-legion_leaf_dagger.png` (catalog `gear`, id `weapon-legion_leaf_dagger`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-legion_gladius.png`
- **Is:** the Legion family's Dexterity form: the issue dagger every Thousand World Legion trooper carries at the belt, the line blade's leaf shape cut down to a hand. One-handed, about 0.5 kg.
- **At icon size it must read as:** a small leaf blade with a round disc pommel.

```
The Thousand World Legion's issue dagger. On the 45 degree diagonal like the attached Legion line blade, the same frame. A short broad double-edged leaf-shaped blade, waisted just below the middle and swelling again before the point, with a strong raised midrib. A short straight bar guard, a grip with a round swelling at its middle, and a flat round disc pommel. Plain mass-made steel with even grinding marks, olive-grey grip, one line of three bright rivets through the guard. No accent: anonymous, numberless, issued by the thousand.
Avoid: a crossguard with curled tips, ornament or inlay, any marking, a long thin stiletto blade.
```

## 6. `legion_rank_sword`: Legion rank sword (Strength form; working name "spatha")

- **Save as:** `art/icons/gear/weapon-legion_rank_sword.png` (catalog `gear`, id `weapon-legion_rank_sword`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-legion_gladius.png`
- **Is:** the Legion family's Strength form: the long straight blade of the front rank, cutting down over the shield wall. One-handed, about 2 kg.
- **At icon size it must read as:** a long plain straight blade on the Legion's block guard.

```
The Thousand World Legion's front-rank sword. On the 45 degree diagonal like the attached Legion line blade, the same frame. A long straight double-edged blade with parallel edges and a rounded cutting point, nearly twice the length of the family's leaf-shaped line blade and narrower, with one broad shallow fuller down its middle. The same stout plain block guard as the line blade, a plain grip and a round knob pommel. Plain mass-made steel, olive-grey grip, a few honest nicks along the edge. No accent: anonymous issue.
Avoid: a leaf-shaped blade, a long two-hand grip, a knightly cross with plate wings (that is the Brigade), crests.
```

# 4. Draw blades (working name "Eastern blades")

## 7. `short_draw`: Short draw (Dexterity form; working name "wakizashi")

- **Save as:** `art/icons/gear/weapon-short_draw.png` (catalog `gear`, id `weapon-short_draw`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-katana.png`
- **Is:** the draw family's Dexterity form: the schools' companion blade, drawn and cut in one motion at arm's length or closer. One-handed, about 0.7 kg.
- **At icon size it must read as:** the family's curve, short, with a grip long against its blade.

```
The short companion blade of the Kemizuchi schools' sheath line. On the 45 degree diagonal like the attached long curved sword, the same frame, but shorter in the blade, so the grip looks long against it. A single-edged blade with one gentle continuous curve and a sharp angled point, a pale tempered line running wavy along the edge. A small round aged-brass guard collar and a brass end cap; the grip wrapped in a tight diamond lattice of dark cord, about a third of the blade's length. Steel with a soft polish, the cord rubbed pale where the thumb sits. Accent: aged brass.
Avoid: crimson cord (that is the Academy duelling line), a sheath, a straight blade, a guard with arms.
```

## 8. `long_draw`: Long draw (Strength form; working name "odachi")

- **Save as:** `art/icons/gear/weapon-long_draw.png` (catalog `gear`, id `weapon-long_draw`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-katana.png`
- **Is:** the draw family's Strength form: the schools' great two-handed curved blade, carried across the back and drawn by stepping out from under it. Two-handed, about 2.5 kg.
- **At icon size it must read as:** a long crescent with a two-hand grip; longer and heavier than the middle form.

```
The great two-handed curved blade of the Kemizuchi schools' sheath line. On the 45 degree diagonal, nearly corner to corner, the same frame rule as the attached long curved sword, so the blade looks long and the grip small against it. A long, broad single-edged blade with a deep curve near the grip that straightens toward the point, a wide back, a pale wavy tempered line along the edge. A broad round aged-brass guard, a long grip for two hands in a diamond lattice of dark cord, a heavy brass end cap. Steel with a deep, cared-for polish and one long scratch along the flat. Accent: aged brass.
Avoid: a polearm shaft, a straight blade, crimson cord, a sheath or strap.
```

# 5. Kemizuchi duelling

## 9. `kemizuchi_side_sword`: Kemizuchi side-sword (hybrid form)

- **Save as:** `art/icons/gear/weapon-kemizuchi_side_sword.png` (catalog `gear`, id `weapon-kemizuchi_side_sword`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-kemizuchi_duelling_blade.png`
- **Is:** the Academy duelling family's middle form: the officer's everyday sword, cut and thrust, with more blade than the duelling needle and more guard for the hand. One-handed, about 1.4 kg.
- **At icon size it must read as:** a straight blade with the family's dish guard plus a looping bar.

```
The Kemizuchi Military Academy's officer sword. On the 45 degree diagonal like the attached duelling blade, the same frame. A straight double-edged blade, clearly wider than the duelling blade's and tapering to an acute point, with a short fuller near the hilt. The hilt keeps the family's swept dish guard and adds a single side ring and one curving knuckle bar from the guard to the pommel. Bright steel, the guard blackened steel, a lacquered black grip bound with crimson cord. Accent: lacquer crimson #86234E in the cord.
Avoid: a full basket of bars, a curved blade, a needle-thin blade (that is the duelling blade), gilt.
```

## 10. `kemizuchi_sword_breaker`: Kemizuchi sword-breaker (Strength form)

- **Save as:** `art/icons/gear/weapon-kemizuchi_sword_breaker.png` (catalog `gear`, id `weapon-kemizuchi_sword_breaker`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-kemizuchi_duelling_blade.png`
- **Is:** the Academy duelling family's Strength form: a short, heavy blade whose back is cut into deep slots that catch an opponent's blade and twist it out of the hand. One-handed, about 1.6 kg.
- **At icon size it must read as:** a short broad blade with a comb of slots along its back.

```
The Kemizuchi Military Academy's blade-catcher. On the 45 degree diagonal like the attached duelling blade, the same frame, so the short blade is drawn large. A short, thick, straight single-edged blade; its spine is cut into a comb of four deep square slots, each slot as wide as the teeth between them so the gaps stay open when shrunk. A heavy straight crossguard with rounded tips, a short lacquered black grip, a squared pommel. Dark blued steel with bright edges on the comb's teeth, crimson cord bound at the pommel. Accent: lacquer crimson #86234E.
Avoid: a saw with many small teeth, a serrated edge, a dish guard (the family's quick forms carry it), a curved blade.
```

# 6. Axes

## 11. `pitch_axe`: Pitch axe (Dexterity form; working name "tomahawk")

- **Save as:** `art/icons/gear/weapon-pitch_axe.png` (catalog `gear`, id `weapon-pitch_axe`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-hatchet.png`
- **Is:** the axe family's Dexterity form: a light frontier throwing axe, balanced to be pitched end over end and to hook in close. One-handed, about 0.7 kg.
- **At icon size it must read as:** a slim head with a back spike on a long thin haft.

```
A light frontier throwing axe. On the 45 degree diagonal like the attached hatchet, the same frame. A narrow blackened head with a small flared bit and a bright edge, and on the back of the head a short square spike; the head sits on a long, straight, slim haft (longer and thinner than the hatchet's), leather-wrapped at the grip and ending in a small round knob. Oiled walnut haft, blackened steel head, worn brown leather. No accent: frontier, unbranded.
Avoid: feathers, beads, painted tribal patterns, a pipe bowl in the head, a broad bit (that is the hatchet).
```

# 7. Polearms

## 12. `adamantile_poleaxe`: Adamantile poleaxe (Strength form)

- **Save as:** `art/icons/gear/weapon-adamantile_poleaxe.png` (catalog `gear`, id `weapon-adamantile_poleaxe`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-lance.png` (and `art/icons/gear/weapon-glaive.png` for the haft)
- **Is:** the polearm family's Strength form, as tabled: the Adamantile Brigade knight's foot weapon, one head that cuts, crushes and stabs. Two-handed, about 3 kg. (ART-REQUESTS question 3 recommends dropping it for a spear: see 12b.)
- **At icon size it must read as:** a three-part head (blade, hammer, spike) on a long pole.

```
The Adamantile Brigade knight's poleaxe. On the 45 degree diagonal, nearly corner to corner like the attached lance, the head top-right as the focal point. A three-part head: a broad axe blade on one side, a squared hammer face with a fluted grip pattern on the other, and a long four-sided spike on top. Two steel straps run down the haft from the head, and a round plate guard sits on the haft just below the head. Pale steel head with ivory highlights, dark wood haft, a short iron spike at the butt. Accent: Brigade gilt on the round plate and one muted brass-orange #F68A38 band on the haft below it.
Avoid: a crescent moon blade, a broad axe with a rear hook and a beak, a plume, a cone guard (that is the lance).
```

## 12b. `legion_spear`: Legion spear (Dexterity form; ALTERNATE, only if Leon takes question 3)

- **Save as:** `art/icons/gear/weapon-legion_spear.png` (catalog `gear`, id `weapon-legion_spear`, PROPOSED)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-glaive.png`
- **Is:** the recommended Dexterity form if the polearms become spear / glaive / lance: the plain thrusting spear of the Legion guard, quick to recover. Two-handed, about 2 kg.
- **At icon size it must read as:** a thin pole with a small leaf head and a crossbar under it.

```
A plain thrusting spear of the Thousand World Legion's guard. On the 45 degree diagonal, nearly corner to corner like the attached glaive, the head top-right. A small slim leaf-shaped head with a raised midrib on a long, straight, thin ash shaft; a short straight steel bar set crosswise just below the head as a stop; a small iron butt cap. Plain mass-made steel, pale ash with a grip patch of olive-grey wrap. No accent: anonymous issue.
Avoid: a curved blade (that is the glaive), a cone or vamplate (that is the lance), a pennant, a long winged crossbar.
```

# 8. Hammers

## 13. `war_pick`: War pick (Dexterity form)

- **Save as:** `art/icons/gear/weapon-war_pick.png` (catalog `gear`, id `weapon-war_pick`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-maul.png`
- **Is:** the hammer family's Dexterity form: one narrow beak that finds the gap in plate, swung fast from one hand. One-handed, about 1.5 kg.
- **At icon size it must read as:** a thin downward beak on a hammer's haft; a pick, not an axe.

```
A dockside war pick. On the 45 degree diagonal like the attached maul, the same frame, the head top-right. A narrow, slightly down-curved beak of square section on one side of the head, tapering to a point; a small flat hammer face on the other side; two iron straps running a hand's length down the haft from the head. A medium-length ash haft, banded twice with iron, wrapped in leather at the grip. Dark iron head with a bright worn point, worn ash. No accent: frontier and dockside.
Avoid: a mining pickaxe with two long arms, an axe blade, a thick block head (that is the maul).
```

## 14. `war_hammer`: War hammer (hybrid form)

- **Save as:** `art/icons/gear/weapon-war_hammer.png` (catalog `gear`, id `weapon-war_hammer`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-maul.png`
- **Is:** the hammer family's middle form: a hand-and-a-half hammer, a squared face for crushing and a spike behind it for the follow-up. One or two hands, about 3 kg.
- **At icon size it must read as:** a squared head with a curved spike behind it, about half the maul's head.

```
A dockside war hammer. On the 45 degree diagonal like the attached maul, the same frame, the head top-right. A squared hammer head with a slightly domed, cross-cut striking face, about half the size of the maul's iron block, and a short, thick, down-curved spike on the back. A haft shorter than the maul's, of ash banded with three iron rings, a leather grip long enough for two hands. Dark iron with bright worn corners on the face, chipped ash. No accent: frontier and dockside.
Avoid: a carpenter's claw hammer, a blacksmith's hammer, a block with no spike (that is the maul), ornament.
```

# 9. Great blades

## 15. `adamantile_plate_needle`: Plate needle (Dexterity form; working name "estoc")

- **Save as:** `art/icons/gear/weapon-adamantile_plate_needle.png` (catalog `gear`, id `weapon-adamantile_plate_needle`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-adamantile_greatsword.png`
- **Is:** the great-blade family's Dexterity form: the Adamantile Brigade's answer to plate, a long two-handed blade with no edge at all, driven into the gaps. Two-handed, about 2 kg.
- **At icon size it must read as:** a long needle on the Brigade's big plate guard.

```
The Adamantile Brigade's plate needle. On the 45 degree diagonal, nearly corner to corner like the attached greatsword, the same frame. A long, rigid, edgeless blade of four-sided diamond section, as long as the greatsword's but a fraction of its width, tapering steadily to a needle point; a hard ridge of light runs down its centre. An oversized plate crossguard of two flat angled wings, a small crest boss at its centre, a long two-hand grip and a faceted pommel. Pale steel with ivory highlights, gilt on the crest boss. Accent: one thin brass-orange #F68A38 line painted down the base of the blade (the family's fuller line).
Avoid: a fencing foil or bell guard, a wide blade, a flexible-looking blade, gems.
```

## 16. `adamantile_longsword`: Brigade longsword (hybrid form)

- **Save as:** `art/icons/gear/weapon-adamantile_longsword.png` (catalog `gear`, id `weapon-adamantile_longsword`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-adamantile_greatsword.png`
- **Is:** the great-blade family's middle form: the Adamantile knight's hand-and-a-half sword, one hand with a shield, two without. About 2.5 kg.
- **At icon size it must read as:** a classic cross shape, mid-width: between the needle and the slab.

```
The Adamantile Brigade knight's longsword. On the 45 degree diagonal like the attached greatsword, the same frame. A straight double-edged blade of medium width (clearly narrower than the greatsword's slab, clearly wider than a needle), tapering to a firm point, with a fuller running two thirds of its length. A crossguard of two plate wings with squared ends, a grip long enough for one hand and a half, and a pommel shaped as a small crest. Pale steel, ivory highlights on the edges, gilt on the pommel crest. Accent: brass-orange #F68A38 as a painted line inside the fuller.
Avoid: a wide slab blade (that is the greatsword), a curved blade, a cross with real-world religious symbols, gems, a ring-shaped pommel.
```

# 10. Ork cutters

## 17. `ork_skinner`: Ork skinner (Dexterity form)

- **Save as:** `art/icons/gear/weapon-ork_skinner.png` (catalog `gear`, id `weapon-ork_skinner`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-ork_machete.png`
- **Is:** the Ork family's Dexterity form: a short hooked blade for quick work at the throat and the hamstring. One-handed, about 0.8 kg.
- **At icon size it must read as:** a short hook-shaped blade with a notched back.

```
An Ork skinning hook. On the 45 degree diagonal like the attached Ork machete, the same frame. A short, crude blade bent forward into a hook, the sharpened edge on the inside of the curve, the outer back cut with five uneven saw notches; hammered from a scrap bar, uneven in thickness. The grip is a length of pipe wrapped in oily leather with two nails driven through it, the nail heads proud. Rusted steel with a bright ground inner edge, dark leather. Accent: dirty ochre paint daubs, two uneven stripes on the flat.
Avoid: a neat curved knife, a sickle on a long handle, a bone handle, gore.
```

## 18. `ork_cleaver_glaive`: Ork cleaver-glaive (Strength form)

- **Save as:** `art/icons/gear/weapon-ork_cleaver_glaive.png` (catalog `gear`, id `weapon-ork_cleaver_glaive`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-ork_machete.png`
- **Is:** the Ork family's Strength form: an Ork machete grown too big for a hand and welded onto a pole. Two-handed, about 5 kg.
- **At icon size it must read as:** a big square slab of blade on a short thick pole.

```
An Ork cleaver-glaive. On the 45 degree diagonal like the attached Ork machete, the head top-right and taking up half the length. A huge, roughly rectangular cleaver blade, twice the machete's width, with a jagged, uneven back and one belly-curved edge, welded at its base onto a short, thick steel pipe pole by a bolted collar with a bead of rough weld; a lump of scrap iron is bolted to the butt as a counterweight. Rust, scorched steel, nails driven through a leather grip patch. Accent: dirty ochre daubs, three uneven stripes across the blade.
Avoid: a neat polearm, a chain or engine (that is the rip-saw), skulls, gore.
```

# 12. Heavy fists (gloves)

## 19. `weighted_gloves`: Weighted gloves (hybrid form)

- **Save as:** `art/icons/gear/weapon-weighted_gloves.png` (catalog `gear`, id `weapon-weighted_gloves`)
- **Mode:** Heavenprint gear icon (base prompt)
- **Family reference:** `art/icons/gear/weapon-iron_mitts.png` (and `art/icons/gear/weapon-kemizuchi_strikers.png`)
- **Is:** the heavy-fist family's middle form: Smetanita Conjunction collector's gloves, soft black leather with a pad of lead shot sewn across the knuckles, so a punch lands like a cosh. Light, one-handed, about 0.7 kg.
- **At icon size it must read as:** a glove with a fat padded knuckle ridge: softer than the iron mitt, heavier than the strikers.

```
A Smetanita Conjunction weighted glove. Upright, back of the hand toward the viewer, filling the frame like the attached iron mitt; one glove, empty, no hand inside, the fingers half-curled toward a fist. Across the knuckles a thick swollen pad sewn into the leather, its row of stitched lumps showing the lead shot inside; a short wrist cuff closed by one strap and a square brass buckle. Black lacquered leather, polished at the knuckles and creased at the finger joints. Accent: brass, in the buckle and one line of brass stud seam along the cuff.
Avoid: metal plates or rivets on the back (that is the iron mitt), finger rings or a bar (that is the knuckle-duster), a boxing glove, spikes.
```
