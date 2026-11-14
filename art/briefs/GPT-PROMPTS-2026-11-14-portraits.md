# GPT prompts, 14 Nov 2026: every portrait a different person

For the artist. Leon, 14 Nov 2026: "make every character look different, tag their class fantasy, gender and specie
for our future work, current portrait suffer from same face syndrome anyway."

## Read this first

The 145 character portraits in `art/portraits/` share a face: the same age, jaw, nose and expression, recoloured.
This batch repaints them so that **no two portraits could be the same person**, and returns a **tag file** so the
game can later offer portraits by class, gender and species.

**Rules for every portrait**

1. **Same file, same size, same framing.** Keep each file's path and name exactly (the game finds art by its catalog
   id), 800 x 1000, 4:5, opaque painted scene, the eye line where it is now (within 5% of the height), the same
   Heavenprint style as the current set (`art/style-guide/PHC-Style-Guide.md`), the same dominant colour per portrait
   (its skill's pigment) so the wall of portraits still reads by colour.
2. **A different person each time.** Each row below fixes six things: gender, species, age, build, face, skin and
   hair. Paint exactly that. Then check the finished set as one contact sheet: if two faces could be siblings,
   repaint one. Vary also: expression (not everyone is grim), posture, what the hands do, scars, tattoos, implants,
   jewellery, eyewear, headgear.
3. **The class fantasy shows.** Each row names what this person does in a fight. Show it in what they wear and hold
   (the tool of their trade in frame: a shield rim, a heavy haft, a holstered gun, a hood and a knife, a glove with
   a glowing palm or knuckles, a prayer token), not as a costume: these are working people.
4. **Species, in-world.** Human is the default. A **Crawler** looks human to us (the curse only shows to ordinary
   humans in the world): mark them with an esper's tell (eyes that catch light wrongly, a faint shimmer at the
   temples). An **automaton** is a robot made by people: plainly a machine, worn, with a face it was given. An
   **ork** is big, tusked, scarred, proud. No elves, dwarves or animal-people. No real-world brands, flags, text.
5. **Named casts keep their identity.** Sections D and E are named characters: keep the person (their role, their
   signature item, their colour), but fix the shared face: give each their own age, features and build as listed.
   If a row's listed gender or species contradicts who that character is in the lore, keep the lore and tag what
   you painted.
6. **Deliver** on a branch `art/portraits-distinct-2026-11-14`: the repainted files in place, the old ones moved to
   `art/_archive/portraits-2026-11-14/` with the same names, `art/checksums.sha256` regenerated, a contact sheet per
   section, and the tag file below.

**The tag file** (`art/portraits/tags.json`), one entry per portrait id, filled with what you actually painted:

```json
{ "<catalog id>": { "class_fantasy": "bulwark|breaker|skirmisher|operative|sigilist|rigger|mender|channeler|chaplain|none",
                    "gender": "woman|man|nonbinary", "species": "human|crawler|automaton|ork",
                    "age": "20s|30s|40s|50s|old|ageless", "build": "lean|broad|stocky|tall|slight|heavy|wiry",
                    "skin": "...", "hair": "...", "notes": "one line: what makes this face theirs" } }
```

**The base prompt** (paste before each row):

> Heavenprint painted character portrait, 4:5, 800 x 1000, bust to waist, opaque painted scene behind, dramatic
> single-source light, visible brushwork, muted ground with one strong pigment. One person, looking like nobody
> else in the set. No text, no logos, no frame.

Then the row: "A {gender}, {species}, {age}, {build}, {face}, {skin} skin, {hair}. {class fantasy}. Dominant
pigment as in the current file."


## A. The 46 archetype cards (the player's portrait picker)

| # | Catalog id | File | Now called | Paint: gender | Species | Age | Build | Face | Skin | Hair | Class fantasy |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `arch-bulwark` | `art/portraits/archetypes/bulwark.png` | Holdfast | man | ork | late 20s | tall and rangy | narrow eyes | grey-green, scarred | white and thin | none: a civilian, an officer or a creature of the story (keep their role) |
| 2 | `arch-bodyguard` | `art/portraits/archetypes/bodyguard.png` | Bodyguard | man | human | 50s | heavyset | round face | golden tan | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 3 | `arch-brawler` | `art/portraits/archetypes/brawler.png` | Brawler | woman | human | 30s | lean | broken nose | warm brown | shaved head | none: a civilian, an officer or a creature of the story (keep their role) |
| 4 | `arch-berserker` | `art/portraits/archetypes/berserker.png` | Berserker | woman | human | 100 and more, ageless and worn | stocky | freckled | ruddy and weathered | shoulder-length straight | none: a civilian, an officer or a creature of the story (keep their role) |
| 5 | `arch-fencer` | `art/portraits/archetypes/fencer.png` | Fencer | man | automaton (a robot built by NPCs) | ageless, long in service | slight | sharp cheekbones | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 6 | `arch-monk` | `art/portraits/archetypes/monk.png` | Monk | non-binary or hard to read | human | 40s | wiry | wide-set eyes | deep brown | hood up, hair hidden | none: a civilian, an officer or a creature of the story (keep their role) |
| 7 | `arch-sharpshooter` | `art/portraits/archetypes/sharpshooter.png` | Sharpshooter | woman | human | early 20s | broad | long face | ashen grey (Crawler or ill) | curly and loose | none: a civilian, an officer or a creature of the story (keep their role) |
| 8 | `arch-heavy_gunner` | `art/portraits/archetypes/heavy-gunner.png` | Heavy Gunner | man | human | late 20s | tall and rangy | heavy brow | light olive | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 9 | `arch-ranger` | `art/portraits/archetypes/ranger.png` | Ranger | man | Crawler (as other Crawlers see them: human, with an esper's tell) | 50s | heavyset | deep-lined | very dark | bald with a beard | none: a civilian, an officer or a creature of the story (keep their role) |
| 10 | `arch-grenadier` | `art/portraits/archetypes/grenadier.png` | Grenadier | woman | human | 30s | lean | soft features | golden tan | short cropped | none: a civilian, an officer or a creature of the story (keep their role) |
| 11 | `arch-infiltrator` | `art/portraits/archetypes/infiltrator.png` | Infiltrator | woman | ork | 100 and more, ageless and worn | stocky | hooked nose | grey-green, scarred | locs | none: a civilian, an officer or a creature of the story (keep their role) |
| 12 | `arch-stalker` | `art/portraits/archetypes/stalker.png` | Stalker | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | square jaw | ruddy and weathered | grey bun | none: a civilian, an officer or a creature of the story (keep their role) |
| 13 | `arch-thief` | `art/portraits/archetypes/thief.png` | Thief | non-binary or hard to read | human | 40s | wiry | narrow eyes | very pale | white and thin | none: a civilian, an officer or a creature of the story (keep their role) |
| 14 | `arch-spy` | `art/portraits/archetypes/spy.png` | Spy | woman | human | early 20s | broad | round face | deep brown | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 15 | `arch-sigilist` | `art/portraits/archetypes/sigilist.png` | Glyphwright | man | automaton (a robot built by NPCs) | ageless, long in service | tall and rangy | broken nose | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 16 | `arch-sentinel` | `art/portraits/archetypes/sentinel.png` | Sentinel | man | human | 50s | heavyset | freckled | light olive | shoulder-length straight | none: a civilian, an officer or a creature of the story (keep their role) |
| 17 | `arch-enchanter` | `art/portraits/archetypes/enchanter.png` | Enchanter | woman | human | 30s | lean | sharp cheekbones | very dark | long braid | none: a civilian, an officer or a creature of the story (keep their role) |
| 18 | `arch-jinx` | `art/portraits/archetypes/jinx.png` | Jinx | woman | human | 100 and more, ageless and worn | stocky | wide-set eyes | golden tan | hood up, hair hidden | none: a civilian, an officer or a creature of the story (keep their role) |
| 19 | `arch-detective` | `art/portraits/archetypes/detective.png` | Detective | man | Crawler (as other Crawlers see them: human, with an esper's tell) | 60s to 80s (people live about 400 years: visibly old) | slight | long face | warm brown | curly and loose | none: a civilian, an officer or a creature of the story (keep their role) |
| 20 | `arch-engineer` | `art/portraits/archetypes/engineer.png` | Engineer | non-binary or hard to read | human | 40s | wiry | heavy brow | ruddy and weathered | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 21 | `arch-scholar` | `art/portraits/archetypes/scholar.png` | Scholar | woman | ork | early 20s | broad | deep-lined | grey-green, scarred | bald with a beard | none: a civilian, an officer or a creature of the story (keep their role) |
| 22 | `arch-stormcaller` | `art/portraits/archetypes/stormcaller.png` | Stormcaller | man | human | late 20s | tall and rangy | soft features | deep brown | short cropped | none: a civilian, an officer or a creature of the story (keep their role) |
| 23 | `arch-mender` | `art/portraits/archetypes/mender.png` | Empath | man | human | 50s | heavyset | hooked nose | ashen grey (Crawler or ill) | locs | none: a civilian, an officer or a creature of the story (keep their role) |
| 24 | `arch-confessor` | `art/portraits/archetypes/confessor.png` | Confessor | woman | human | 30s | lean | square jaw | light olive | grey bun | none: a civilian, an officer or a creature of the story (keep their role) |
| 25 | `arch-zealot` | `art/portraits/archetypes/zealot.png` | Zealot | woman | automaton (a robot built by NPCs) | ageless, long in service | stocky | narrow eyes | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 26 | `arch-witch` | `art/portraits/archetypes/witch.png` | Witch | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | round face | golden tan | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 27 | `arch-harbinger` | `art/portraits/archetypes/harbinger.png` | Harbinger | non-binary or hard to read | human | 40s | wiry | broken nose | warm brown | shaved head | none: a civilian, an officer or a creature of the story (keep their role) |
| 28 | `arch-silver_tongue` | `art/portraits/archetypes/silver-tongue.png` | Silver Tongue | woman | human | early 20s | broad | freckled | ruddy and weathered | shoulder-length straight | none: a civilian, an officer or a creature of the story (keep their role) |
| 29 | `arch-troubadour` | `art/portraits/archetypes/troubadour.png` | Troubadour | man | Crawler (as other Crawlers see them: human, with an esper's tell) | late 20s | tall and rangy | sharp cheekbones | very pale | long braid | none: a civilian, an officer or a creature of the story (keep their role) |
| 30 | `arch-captain` | `art/portraits/archetypes/captain.png` | Captain | man | human | 50s | heavyset | wide-set eyes | deep brown | hood up, hair hidden | none: a civilian, an officer or a creature of the story (keep their role) |
| 31 | `arch-enforcer` | `art/portraits/archetypes/enforcer.png` | Enforcer | woman | ork | 30s | lean | long face | grey-green, scarred | curly and loose | none: a civilian, an officer or a creature of the story (keep their role) |
| 32 | `arch-spellblade` | `art/portraits/archetypes/spellblade.png` | Spellblade | woman | human | 100 and more, ageless and worn | stocky | heavy brow | light olive | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 33 | `arch-crusader` | `art/portraits/archetypes/crusader.png` | Crusader | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | deep-lined | very dark | bald with a beard | none: a civilian, an officer or a creature of the story (keep their role) |
| 34 | `arch-witch_hunter` | `art/portraits/archetypes/witch-hunter.png` | Witch Hunter | non-binary or hard to read | human | 40s | wiry | soft features | golden tan | short cropped | none: a civilian, an officer or a creature of the story (keep their role) |
| 35 | `arch-field_medic` | `art/portraits/archetypes/field-medic.png` | Field Medic | woman | automaton (a robot built by NPCs) | ageless, long in service | broad | hooked nose | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 36 | `arch-survivor` | `art/portraits/archetypes/survivor.png` | Survivor | man | human | late 20s | tall and rangy | square jaw | ruddy and weathered | grey bun | none: a civilian, an officer or a creature of the story (keep their role) |
| 37 | `arch-drifter` | `art/portraits/archetypes/drifter.png` | Drifter | man | human | 50s | heavyset | narrow eyes | very pale | white and thin | none: a civilian, an officer or a creature of the story (keep their role) |
| 38 | `arch-living_wall` | `art/portraits/archetypes/living-wall.png` | Living Wall | woman | human | 30s | lean | round face | deep brown | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 39 | `arch-wrecking_ball` | `art/portraits/archetypes/wrecking-ball.png` | Wrecking Ball | woman | Crawler (as other Crawlers see them: human, with an esper's tell) | 100 and more, ageless and worn | stocky | broken nose | ashen grey (Crawler or ill) | shaved head | none: a civilian, an officer or a creature of the story (keep their role) |
| 40 | `arch-deadeye` | `art/portraits/archetypes/deadeye.png` | Deadeye | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | freckled | light olive | shoulder-length straight | none: a civilian, an officer or a creature of the story (keep their role) |
| 41 | `arch-phantom` | `art/portraits/archetypes/phantom.png` | Phantom | non-binary or hard to read | ork | 40s | wiry | sharp cheekbones | grey-green, scarred | long braid | none: a civilian, an officer or a creature of the story (keep their role) |
| 42 | `arch-savant` | `art/portraits/archetypes/savant.png` | Savant | woman | human | early 20s | broad | wide-set eyes | golden tan | hood up, hair hidden | none: a civilian, an officer or a creature of the story (keep their role) |
| 43 | `arch-illusionist` | `art/portraits/archetypes/illusionist.png` | Illusionist | man | human | late 20s | tall and rangy | long face | warm brown | curly and loose | none: a civilian, an officer or a creature of the story (keep their role) |
| 44 | `arch-heartreader` | `art/portraits/archetypes/heartreader.png` | Heartreader | man | human | 50s | heavyset | heavy brow | ruddy and weathered | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 45 | `arch-unbroken` | `art/portraits/archetypes/unbroken.png` | Unbroken | woman | automaton (a robot built by NPCs) | ageless, long in service | lean | deep-lined | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 46 | `arch-prophet` | `art/portraits/archetypes/prophet.png` | Prophet | woman | human | 100 and more, ageless and worn | stocky | soft features | deep brown | short cropped | none: a civilian, an officer or a creature of the story (keep their role) |

## B. New Faces (27 world characters)

| # | Catalog id | File | Now called | Paint: gender | Species | Age | Build | Face | Skin | Hair | Class fantasy |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 47 | `orren-vask` | `art/portraits/world/new-faces/orren-vask.png` | Orren Vask | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | hooked nose | ashen grey (Crawler or ill) | locs | Bulwark (holds the line: shield, plate, Guard) |
| 48 | `ivara-drenn` | `art/portraits/world/new-faces/ivara-drenn.png` | Ivara Drenn | non-binary or hard to read | human | 40s | wiry | square jaw | light olive | grey bun | none: a civilian, an officer or a creature of the story (keep their role) |
| 49 | `nemi-sol` | `art/portraits/world/new-faces/nemi-sol.png` | Nemi Sol | woman | Crawler (as other Crawlers see them: human, with an esper's tell) | early 20s | broad | narrow eyes | very dark | white and thin | Bulwark (holds the line: shield, plate, Guard) |
| 50 | `basko-rell` | `art/portraits/world/new-faces/basko-rell.png` | Basko Rell | man | human | late 20s | tall and rangy | round face | golden tan | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 51 | `tessa-rook` | `art/portraits/world/new-faces/tessa-rook.png` | Tessa Rook | man | ork | 50s | heavyset | broken nose | grey-green, scarred | shaved head | Breaker (heavy blows, Momentum) |
| 52 | `veyra-salt` | `art/portraits/world/new-faces/veyra-salt.png` | Veyra Salt | woman | human | 30s | lean | freckled | ruddy and weathered | shoulder-length straight | Breaker (heavy blows, Momentum) |
| 53 | `ketta-flint` | `art/portraits/world/new-faces/ketta-flint.png` | Ketta Flint | woman | human | 100 and more, ageless and worn | stocky | sharp cheekbones | very pale | long braid | Skirmisher (fast gun or blade, Pressure) |
| 54 | `sera-venn` | `art/portraits/world/new-faces/sera-venn.png` | Sera Venn | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | wide-set eyes | deep brown | hood up, hair hidden | Skirmisher (fast gun or blade, Pressure) |
| 55 | `milo-quill` | `art/portraits/world/new-faces/milo-quill.png` | Milo Quill | non-binary or hard to read | automaton (a robot built by NPCs) | ageless, long in service | wiry | long face | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 56 | `pell-morrow` | `art/portraits/world/new-faces/pell-morrow.png` | Pell Morrow | woman | human | early 20s | broad | heavy brow | light olive | dyed streak | Operative (Shadow: unseen, precise) |
| 57 | `drava-keel` | `art/portraits/world/new-faces/drava-keel.png` | Drava Keel | man | human | late 20s | tall and rangy | deep-lined | very dark | bald with a beard | Rigger (Visualizer glove, Figments and machines) |
| 58 | `asher-fen` | `art/portraits/world/new-faces/asher-fen.png` | Asher Fen | man | human | 50s | heavyset | soft features | golden tan | short cropped | Operative (Shadow: unseen, precise) |
| 59 | `ilyen-taal` | `art/portraits/world/new-faces/ilyen-taal.png` | Ilyen Taal | woman | Crawler (as other Crawlers see them: human, with an esper's tell) | 30s | lean | hooked nose | warm brown | locs | none: a civilian, an officer or a creature of the story (keep their role) |
| 60 | `marden-silt` | `art/portraits/world/new-faces/marden-silt.png` | Marden Silt | woman | human | 100 and more, ageless and worn | stocky | square jaw | ruddy and weathered | grey bun | Sigilist (Evoker glove, drawn glyphs) |
| 61 | `yara-voss` | `art/portraits/world/new-faces/yara-voss.png` | Yara Voss | man | ork | 60s to 80s (people live about 400 years: visibly old) | slight | narrow eyes | grey-green, scarred | white and thin | Sigilist (Evoker glove, drawn glyphs) |
| 62 | `osa-reed` | `art/portraits/world/new-faces/osa-reed.png` | Osa Reed | non-binary or hard to read | human | 40s | wiry | round face | deep brown | undercut | Rigger (Visualizer glove, Figments and machines) |
| 63 | `inspectant-latch-7` | `art/portraits/world/new-faces/inspectant-latch-7.png` | Inspectant Latch-7 | woman | human | early 20s | broad | broken nose | ashen grey (Crawler or ill) | shaved head | Operative (Shadow: unseen, precise) |
| 64 | `juniper-vale` | `art/portraits/world/new-faces/juniper-vale.png` | Juniper Vale | man | human | late 20s | tall and rangy | freckled | light olive | shoulder-length straight | Rigger (Visualizer glove, Figments and machines) |
| 65 | `mallow-3` | `art/portraits/world/new-faces/mallow-3.png` | Mallow-3 | man | automaton (a robot built by NPCs) | ageless, long in service | heavyset | sharp cheekbones | worn metal and ceramic plate | none: a shaped head | Mender (Attuner glove, Bonds and Tending) |
| 66 | `dema-brin` | `art/portraits/world/new-faces/dema-brin.png` | Dema Brin | woman | human | 30s | lean | wide-set eyes | golden tan | hood up, hair hidden | Mender (Attuner glove, Bonds and Tending) |
| 67 | `selka-noon` | `art/portraits/world/new-faces/selka-noon.png` | Selka Noon | woman | human | 100 and more, ageless and worn | stocky | long face | warm brown | curly and loose | Mender (Attuner glove, Bonds and Tending) |
| 68 | `ruen-ash` | `art/portraits/world/new-faces/ruen-ash.png` | Ruen Ash | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | heavy brow | ruddy and weathered | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 69 | `anka-moss` | `art/portraits/world/new-faces/anka-moss.png` | Anka Moss | non-binary or hard to read | Crawler (as other Crawlers see them: human, with an esper's tell) | 40s | wiry | deep-lined | very pale | bald with a beard | none: a civilian, an officer or a creature of the story (keep their role) |
| 70 | `tal-ren` | `art/portraits/world/new-faces/tal-ren.png` | Tal Ren | woman | human | early 20s | broad | soft features | deep brown | short cropped | Channeler (Emanator glove, Outbursts) |
| 71 | `brother-halden` | `art/portraits/world/new-faces/brother-halden.png` | Brother Halden | man | ork | late 20s | tall and rangy | hooked nose | grey-green, scarred | locs | Chaplain (prayer, Ward, Smite) |
| 72 | `eris-ward` | `art/portraits/world/new-faces/eris-ward.png` | Eris Ward | man | human | 50s | heavyset | square jaw | light olive | grey bun | Chaplain (prayer, Ward, Smite) |
| 73 | `captain-nara-dusk` | `art/portraits/world/new-faces/captain-nara-dusk.png` | Captain Nara Dusk | woman | human | 30s | lean | narrow eyes | very dark | white and thin | Chaplain (prayer, Ward, Smite) |

## C. Original Heavenprint (27 world characters)

| # | Catalog id | File | Now called | Paint: gender | Species | Age | Build | Face | Skin | Hair | Class fantasy |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 74 | `original-heavenprint--durability` | `art/portraits/world/original-heavenprint/durability.png` | Durability | woman | human | 100 and more, ageless and worn | stocky | round face | golden tan | undercut | Bulwark (holds the line: shield, plate, Guard) |
| 75 | `original-heavenprint--pain-threshold` | `art/portraits/world/original-heavenprint/pain-threshold.png` | Pain Threshold | man | automaton (a robot built by NPCs) | ageless, long in service | slight | broken nose | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 76 | `original-heavenprint--sensory` | `art/portraits/world/original-heavenprint/sensory.png` | Sensory | non-binary or hard to read | human | 40s | wiry | freckled | ruddy and weathered | shoulder-length straight | Bulwark (holds the line: shield, plate, Guard) |
| 77 | `original-heavenprint--raw-power` | `art/portraits/world/original-heavenprint/raw-power.png` | Raw Power | woman | human | early 20s | broad | sharp cheekbones | very pale | long braid | none: a civilian, an officer or a creature of the story (keep their role) |
| 78 | `original-heavenprint--guts` | `art/portraits/world/original-heavenprint/guts.png` | Guts | man | human | late 20s | tall and rangy | wide-set eyes | deep brown | hood up, hair hidden | Breaker (heavy blows, Momentum) |
| 79 | `original-heavenprint--intimidation` | `art/portraits/world/original-heavenprint/intimidation.png` | Intimidation | man | Crawler (as other Crawlers see them: human, with an esper's tell) | 50s | heavyset | long face | ashen grey (Crawler or ill) | curly and loose | Breaker (heavy blows, Momentum) |
| 80 | `original-heavenprint--athletics` | `art/portraits/world/original-heavenprint/athletics.png` | Athletics | woman | human | 30s | lean | heavy brow | light olive | dyed streak | Skirmisher (fast gun or blade, Pressure) |
| 81 | `original-heavenprint--dexterity` | `art/portraits/world/original-heavenprint/dexterity.png` | Dexterity | woman | ork | 100 and more, ageless and worn | stocky | deep-lined | grey-green, scarred | bald with a beard | Skirmisher (fast gun or blade, Pressure) |
| 82 | `original-heavenprint--reaction-speed` | `art/portraits/world/original-heavenprint/reaction-speed.png` | Reaction Speed | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | soft features | golden tan | short cropped | none: a civilian, an officer or a creature of the story (keep their role) |
| 83 | `original-heavenprint--ingenuity` | `art/portraits/world/original-heavenprint/ingenuity.png` | Ingenuity | non-binary or hard to read | human | 40s | wiry | hooked nose | warm brown | locs | Operative (Shadow: unseen, precise) |
| 84 | `original-heavenprint--proficiency` | `art/portraits/world/original-heavenprint/proficiency.png` | Proficiency | woman | human | early 20s | broad | square jaw | ruddy and weathered | grey bun | Rigger (Visualizer glove, Figments and machines) |
| 85 | `original-heavenprint--vigilant` | `art/portraits/world/original-heavenprint/vigilant.png` | Vigilant | man | automaton (a robot built by NPCs) | ageless, long in service | tall and rangy | narrow eyes | worn metal and ceramic plate | none: a shaped head | Operative (Shadow: unseen, precise) |
| 86 | `original-heavenprint--brain-power` | `art/portraits/world/original-heavenprint/brain-power.png` | Brain Power | man | human | 50s | heavyset | round face | deep brown | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 87 | `original-heavenprint--rumination` | `art/portraits/world/original-heavenprint/rumination.png` | Rumination | woman | human | 30s | lean | broken nose | ashen grey (Crawler or ill) | shaved head | Sigilist (Evoker glove, drawn glyphs) |
| 88 | `original-heavenprint--eloquence` | `art/portraits/world/original-heavenprint/eloquence.png` | Eloquence | woman | human | 100 and more, ageless and worn | stocky | freckled | light olive | shoulder-length straight | Sigilist (Evoker glove, drawn glyphs) |
| 89 | `original-heavenprint--visualization` | `art/portraits/world/original-heavenprint/visualization.png` | Visualization | man | Crawler (as other Crawlers see them: human, with an esper's tell) | 60s to 80s (people live about 400 years: visibly old) | slight | sharp cheekbones | very dark | long braid | Rigger (Visualizer glove, Figments and machines) |
| 90 | `original-heavenprint--analysis` | `art/portraits/world/original-heavenprint/analysis.png` | Analysis | non-binary or hard to read | human | 40s | wiry | wide-set eyes | golden tan | hood up, hair hidden | Operative (Shadow: unseen, precise) |
| 91 | `original-heavenprint--charisma` | `art/portraits/world/original-heavenprint/charisma.png` | Charisma | woman | ork | early 20s | broad | long face | grey-green, scarred | curly and loose | Rigger (Visualizer glove, Figments and machines) |
| 92 | `original-heavenprint--empathy` | `art/portraits/world/original-heavenprint/empathy.png` | Empathy | man | human | late 20s | tall and rangy | heavy brow | ruddy and weathered | dyed streak | Mender (Attuner glove, Bonds and Tending) |
| 93 | `original-heavenprint--camaraderie` | `art/portraits/world/original-heavenprint/camaraderie.png` | Camaraderie | man | human | 50s | heavyset | deep-lined | very pale | bald with a beard | Mender (Attuner glove, Bonds and Tending) |
| 94 | `original-heavenprint--implication` | `art/portraits/world/original-heavenprint/implication.png` | Implication | woman | human | 30s | lean | soft features | deep brown | short cropped | Mender (Attuner glove, Bonds and Tending) |
| 95 | `original-heavenprint--will-power` | `art/portraits/world/original-heavenprint/will-power.png` | Will Power | woman | automaton (a robot built by NPCs) | ageless, long in service | stocky | hooked nose | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 96 | `original-heavenprint--lore-master` | `art/portraits/world/original-heavenprint/lore-master.png` | Lore Master | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | square jaw | light olive | grey bun | none: a civilian, an officer or a creature of the story (keep their role) |
| 97 | `original-heavenprint--composure` | `art/portraits/world/original-heavenprint/composure.png` | Composure | non-binary or hard to read | human | 40s | wiry | narrow eyes | very dark | white and thin | Channeler (Emanator glove, Outbursts) |
| 98 | `original-heavenprint--faith` | `art/portraits/world/original-heavenprint/faith.png` | Faith | woman | human | early 20s | broad | round face | golden tan | undercut | Chaplain (prayer, Ward, Smite) |
| 99 | `original-heavenprint--conscience` | `art/portraits/world/original-heavenprint/conscience.png` | Conscience | man | Crawler (as other Crawlers see them: human, with an esper's tell) | late 20s | tall and rangy | broken nose | warm brown | shaved head | Chaplain (prayer, Ward, Smite) |
| 100 | `original-heavenprint--authority` | `art/portraits/world/original-heavenprint/authority.png` | Authority | man | human | 50s | heavyset | freckled | ruddy and weathered | shoulder-length straight | Chaplain (prayer, Ward, Smite) |

## D. First-Patch Revival: the EPCCG cast (27) — KEEP WHO THEY ARE

| # | Catalog id | File | Now called | Paint: gender | Species | Age | Build | Face | Skin | Hair | Class fantasy |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 101 | `first-patch-revival--durability` | `art/portraits/epccg/durability.png` | Sanchez | woman | ork | 30s | lean | sharp cheekbones | grey-green, scarred | long braid | Bulwark (holds the line: shield, plate, Guard) |
| 102 | `first-patch-revival--pain-threshold` | `art/portraits/epccg/pain-threshold.png` | Knight Jiren | woman | human | 100 and more, ageless and worn | stocky | wide-set eyes | deep brown | hood up, hair hidden | none: a civilian, an officer or a creature of the story (keep their role) |
| 103 | `first-patch-revival--sensory` | `art/portraits/epccg/sensory.png` | Grandma Marry | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | long face | ashen grey (Crawler or ill) | curly and loose | Bulwark (holds the line: shield, plate, Guard) |
| 104 | `first-patch-revival--raw-power` | `art/portraits/epccg/raw-power.png` | Knight Andre Giant Fist | non-binary or hard to read | human | 40s | wiry | heavy brow | light olive | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 105 | `first-patch-revival--guts` | `art/portraits/epccg/guts.png` | Ragoul the Keeper | woman | automaton (a robot built by NPCs) | ageless, long in service | broad | deep-lined | worn metal and ceramic plate | none: a shaped head | Breaker (heavy blows, Momentum) |
| 106 | `first-patch-revival--intimidation` | `art/portraits/epccg/intimidation.png` | Tommy Avencio | man | human | late 20s | tall and rangy | soft features | golden tan | short cropped | Breaker (heavy blows, Momentum) |
| 107 | `first-patch-revival--athletics` | `art/portraits/epccg/athletics.png` | Dominik Edelgard | man | human | 50s | heavyset | hooked nose | warm brown | locs | Skirmisher (fast gun or blade, Pressure) |
| 108 | `first-patch-revival--dexterity` | `art/portraits/epccg/dexterity.png` | Ambrosius Costeau | woman | human | 30s | lean | square jaw | ruddy and weathered | grey bun | Skirmisher (fast gun or blade, Pressure) |
| 109 | `first-patch-revival--reaction-speed` | `art/portraits/epccg/reaction-speed.png` | Yukimura | woman | Crawler (as other Crawlers see them: human, with an esper's tell) | 100 and more, ageless and worn | stocky | narrow eyes | very pale | white and thin | none: a civilian, an officer or a creature of the story (keep their role) |
| 110 | `first-patch-revival--ingenuity` | `art/portraits/epccg/ingenuity.png` | Lin Shin Long | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | round face | deep brown | undercut | Operative (Shadow: unseen, precise) |
| 111 | `first-patch-revival--proficiency` | `art/portraits/epccg/proficiency.png` | Demitri Kortev | non-binary or hard to read | ork | 40s | wiry | broken nose | grey-green, scarred | shaved head | Rigger (Visualizer glove, Figments and machines) |
| 112 | `first-patch-revival--vigilant` | `art/portraits/epccg/vigilant.png` | Vermilion Jasmine | woman | human | early 20s | broad | freckled | light olive | shoulder-length straight | Operative (Shadow: unseen, precise) |
| 113 | `first-patch-revival--brain-power` | `art/portraits/epccg/brain-power.png` | Professor Avdol | man | human | late 20s | tall and rangy | sharp cheekbones | very dark | long braid | none: a civilian, an officer or a creature of the story (keep their role) |
| 114 | `first-patch-revival--rumination` | `art/portraits/epccg/rumination.png` | Thalatûl the Librarian | man | human | 50s | heavyset | wide-set eyes | golden tan | hood up, hair hidden | Sigilist (Evoker glove, drawn glyphs) |
| 115 | `first-patch-revival--eloquence` | `art/portraits/epccg/eloquence.png` | Xander Badman | woman | automaton (a robot built by NPCs) | ageless, long in service | lean | long face | worn metal and ceramic plate | none: a shaped head | Sigilist (Evoker glove, drawn glyphs) |
| 116 | `first-patch-revival--visualization` | `art/portraits/epccg/visualization.png` | Master Sakamoto | woman | human | 100 and more, ageless and worn | stocky | heavy brow | ruddy and weathered | dyed streak | Rigger (Visualizer glove, Figments and machines) |
| 117 | `first-patch-revival--analysis` | `art/portraits/epccg/analysis.png` | D12.9.6 | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | deep-lined | very pale | bald with a beard | Operative (Shadow: unseen, precise) |
| 118 | `first-patch-revival--charisma` | `art/portraits/epccg/charisma.png` | Damian Nox | non-binary or hard to read | human | 40s | wiry | soft features | deep brown | short cropped | Rigger (Visualizer glove, Figments and machines) |
| 119 | `first-patch-revival--empathy` | `art/portraits/epccg/empathy.png` | Paul Remarque | woman | Crawler (as other Crawlers see them: human, with an esper's tell) | early 20s | broad | hooked nose | ashen grey (Crawler or ill) | locs | Mender (Attuner glove, Bonds and Tending) |
| 120 | `first-patch-revival--camaraderie` | `art/portraits/epccg/camaraderie.png` | Souji | man | human | late 20s | tall and rangy | square jaw | light olive | grey bun | Mender (Attuner glove, Bonds and Tending) |
| 121 | `first-patch-revival--implication` | `art/portraits/epccg/implication.png` | Aleksandr Donovik Artem | man | ork | 50s | heavyset | narrow eyes | grey-green, scarred | white and thin | Mender (Attuner glove, Bonds and Tending) |
| 122 | `first-patch-revival--will-power` | `art/portraits/epccg/will-power.png` | Nora the Witch | woman | human | 30s | lean | round face | golden tan | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 123 | `first-patch-revival--lore-master` | `art/portraits/epccg/lore-master.png` | Andrade Lovelace | woman | human | 100 and more, ageless and worn | stocky | broken nose | warm brown | shaved head | none: a civilian, an officer or a creature of the story (keep their role) |
| 124 | `first-patch-revival--composure` | `art/portraits/epccg/composure.png` | Kaizer Meyer Reinch Wolf | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | freckled | ruddy and weathered | shoulder-length straight | Channeler (Emanator glove, Outbursts) |
| 125 | `first-patch-revival--faith` | `art/portraits/epccg/faith.png` | Sister October | non-binary or hard to read | automaton (a robot built by NPCs) | ageless, long in service | wiry | sharp cheekbones | worn metal and ceramic plate | none: a shaped head | Chaplain (prayer, Ward, Smite) |
| 126 | `first-patch-revival--conscience` | `art/portraits/epccg/conscience.png` | The Azure Blood Holder | woman | human | early 20s | broad | wide-set eyes | deep brown | hood up, hair hidden | Chaplain (prayer, Ward, Smite) |
| 127 | `first-patch-revival--authority` | `art/portraits/epccg/authority.png` | Hank Ladan | man | human | late 20s | tall and rangy | long face | ashen grey (Crawler or ill) | curly and loose | Chaplain (prayer, Ward, Smite) |

## E. The M813 cast (18) — KEEP WHO THEY ARE

| # | Catalog id | File | Now called | Paint: gender | Species | Age | Build | Face | Skin | Hair | Class fantasy |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 128 | `mpat` | `art/portraits/m813/mpat.png` | MPAT — M1.4 8R4-D83-RRY | man | human | 50s | heavyset | heavy brow | light olive | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 129 | `mpat-comrade` | `art/portraits/m813/mpat-comrade.png` | MPAT's unnamed comrade | woman | Crawler (as other Crawlers see them: human, with an esper's tell) | 30s | lean | deep-lined | very dark | bald with a beard | none: a civilian, an officer or a creature of the story (keep their role) |
| 130 | `m813-nine-nine` | `art/portraits/m813/nine-nine.png` | M813 — Sergeant Nine-Nine | woman | human | 100 and more, ageless and worn | stocky | soft features | golden tan | short cropped | none: a civilian, an officer or a creature of the story (keep their role) |
| 131 | `m813-seven-seven` | `art/portraits/m813/seven-seven.png` | M813 — Seven-Seven | man | ork | 60s to 80s (people live about 400 years: visibly old) | slight | hooked nose | grey-green, scarred | locs | none: a civilian, an officer or a creature of the story (keep their role) |
| 132 | `m813-hum` | `art/portraits/m813/hum.png` | M813 — Hum | non-binary or hard to read | human | 40s | wiry | square jaw | ruddy and weathered | grey bun | none: a civilian, an officer or a creature of the story (keep their role) |
| 133 | `m813-lantern` | `art/portraits/m813/lantern.png` | M813 — Lantern | woman | human | early 20s | broad | narrow eyes | very pale | white and thin | none: a civilian, an officer or a creature of the story (keep their role) |
| 134 | `m813-soft-hands` | `art/portraits/m813/soft-hands.png` | M813 — Soft-Hands | man | human | late 20s | tall and rangy | round face | deep brown | undercut | none: a civilian, an officer or a creature of the story (keep their role) |
| 135 | `m813-rook` | `art/portraits/m813/rook.png` | M813 — Rook | man | automaton (a robot built by NPCs) | ageless, long in service | heavyset | broken nose | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |
| 136 | `m813-penny` | `art/portraits/m813/penny.png` | M813 — Penny | woman | human | 30s | lean | freckled | light olive | shoulder-length straight | none: a civilian, an officer or a creature of the story (keep their role) |
| 137 | `m813-keel` | `art/portraits/m813/keel.png` | M813 — Chief Engineer Keel | woman | human | 100 and more, ageless and worn | stocky | sharp cheekbones | very dark | long braid | none: a civilian, an officer or a creature of the story (keep their role) |
| 138 | `m813-ilse-varga` | `art/portraits/m813/ilse-varga.png` | M813 — Ilse Varga | man | human | 60s to 80s (people live about 400 years: visibly old) | slight | wide-set eyes | golden tan | hood up, hair hidden | none: a civilian, an officer or a creature of the story (keep their role) |
| 139 | `m813-engineer-a` | `art/portraits/m813/engineer-a.png` | M813 — Engineer A | non-binary or hard to read | Crawler (as other Crawlers see them: human, with an esper's tell) | 40s | wiry | long face | warm brown | curly and loose | none: a civilian, an officer or a creature of the story (keep their role) |
| 140 | `m813-engineer-b` | `art/portraits/m813/engineer-b.png` | M813 — Engineer B | woman | human | early 20s | broad | heavy brow | ruddy and weathered | dyed streak | none: a civilian, an officer or a creature of the story (keep their role) |
| 141 | `m813-novikov` | `art/portraits/m813/novikov.png` | M813 — Colonel Alexei Novikov | man | ork | late 20s | tall and rangy | deep-lined | grey-green, scarred | bald with a beard | none: a civilian, an officer or a creature of the story (keep their role) |
| 142 | `m813-security-guard` | `art/portraits/m813/security-guard.png` | M813 — Station Security Guard | man | human | 50s | heavyset | soft features | deep brown | short cropped | none: a civilian, an officer or a creature of the story (keep their role) |
| 143 | `m813-guard-captain` | `art/portraits/m813/guard-captain.png` | M813 — Guard Captain | woman | human | 30s | lean | hooked nose | ashen grey (Crawler or ill) | locs | none: a civilian, an officer or a creature of the story (keep their role) |
| 144 | `m813-scavenger-drone` | `art/portraits/m813/scavenger-drone.png` | M813 — Scavenger Drone | woman | human | 100 and more, ageless and worn | stocky | square jaw | light olive | grey bun | none: a civilian, an officer or a creature of the story (keep their role) |
| 145 | `m813-rearguard` | `art/portraits/m813/rearguard.png` | M813 — Enemy Rearguard Trooper | man | automaton (a robot built by NPCs) | ageless, long in service | slight | narrow eyes | worn metal and ceramic plate | none: a shaped head | none: a civilian, an officer or a creature of the story (keep their role) |

## Counts and checks

145 portraits. Before delivering, count the tag file: about half women, at least one non-binary person in ten, about
one Crawler in ten, one automaton in ten, one ork in ten, the rest human; every age band used; no face, skin and hair
combination used twice inside a section. Sections D and E: identity kept.
