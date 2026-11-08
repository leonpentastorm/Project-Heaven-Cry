# Art brief: Blessing 2.0 (patrons, marks, prayer icons)

For the artist (ChatGPT Pro). Written 8 Nov 2026 for Project Heaven Cry (PHC), a tactical science-fantasy RPG.

Everything you need is on this page. The links are for the people who receive your files.

- Design source: `docs/design/blessing-2.0-spec.md`
- Style guide: `art/style-guide/v1.3/PHC-Style-Guide.md`

**Attach to every job:**

1. The style guide, sections 01–07. These cover Heavenprint paint, faces, light, and "World, tools and magic".
2. Two portraits from `art/character-portraits/original-heavenprint/` and two from `heavenprint-new-faces/`, as paint anchors.
3. `art/emblems/ahoc-seal-white.png`, as the anchor for flat white emblems.
4. `art/traits/wick/mind-without-fog/` (the approved Wick icon), as the anchor for line weight and print character **only**. Wick himself does not appear in this brief.

## The idea, in one paragraph

In this world, gods are **Celestials**: trapped humans from a world above, who play gods. Each one picks a costume and
never breaks it. That is a LARP, in the world's words.

A **patron** is a Celestial a character prays to. Faith in PHC is a relationship with someone who is watching you. The
art has to show a person playing a god, with sincerity and with a wink:

- the costume is real and lovingly made;
- the person inside it shows through.

Blessing visual grammar (style guide 07): **focused radiance, sacred negative space, a deliberate halo or answering
emblem.** Blessing motifs run gold. Don't make everyone a hooded priest.

## Rules for every piece

1. **In-universe only.**
   - Never use a real-world god, saint, religious symbol (cross, crescent, star of David, om, dharma wheel…), brand or person.
   - No recognisable recreations of real mythological figures. These are **archetypes** (a sky-father, a hearth-mother), not any culture's actual god.
2. **No lettering, numbers or readable text.**
3. Original work only, matching PHC's existing art. No other game's look.
4. New art goes in versioned folders, as review candidates. Leon approves.

## Deliverable A: 8 patron portraits (Heavenprint character mode)

- **Format:** 800 × 1000 PNG (4:5), the same as every character portrait.
- **Style:** Heavenprint gouache and broken ink. Faces with restrained stylisation and convincing acting.
- **Composition:** a bust or three-quarter view.
- **Light:** each patron is lit by their own **answering light**, a halo or radiance shape that belongs to their costume, in
  the accent colour listed below. Keep it practical light, no glow haze.
- **Folder:** `art/character-portraits/patrons/v1/`. File name = id (`nerukhan.png`).
- **The test of a good portrait:** the costume is a god, the face is a person who chose to play that god.

| Id | Patron | Paint this | Accent |
|---|---|---|---|
| nerukhan | Holy Father Nerukhan | A stern holy father of the Lumeri saint-church. Heavy vestments embroidered with saints' hands (no real symbols). One hand raised in judgement, eyes that have already decided. Never smiles in costume. | pale gold |
| the_quartermaster | The Quartermaster | A gruff officer-god of a war that never ended. Greatcoat with requisition tags, a ledger under the arm, a rubber stamp worn like a holy seal. A crate of rounds glows faintly behind. Loves paperwork, too much. | olive brass |
| the_laughing_mask | The Laughing Mask | A grinning masked trickster mid-bow, as if the battlefield were a stage. Theatre curtains as a cape, one hand hiding a card. The mask is the costume; a real, tired smile shows at the jaw. | crimson and white |
| the_toll_keeper | The Toll-Keeper | The quiet guide of the dead at the last crossing. A boatman in an oilskin, a small lantern on a pole, a box of coins at the hip. Kind, very patient, a little sad. Dusk light. | cold silver |
| mother_ember | Mother Ember | The hearth-mother. Apron, rolled sleeves dusted with flour, a kettle that steams with sparks. She has just called you "love" and is about to feed you. | warm orange |
| old_overcast | Old Overcast | The thunder sky-father, played big and theatrical: a beard made of storm cloud, a lightning rod held like a sceptre, a cape that is weather. A ham actor who loves the role. | storm blue |
| the_matchmaker | The Matchmaker | The love goddess, played as a wedding planner. Spools of red thread on a bandolier, a clipboard of seating charts, scissors kept *away* from the thread. Fond, bossy, romantic. | rose red |
| the_counting_weaver | The Counting Weaver | The fate-spinner, played as an auditor. A loom made of ledger tape, an abacus of bright beads, half-moon reading glasses. Not unkind, simply sure. | thread gold |

## Deliverable B: 8 patron marks (flat white emblems)

The mark is the patron's **answering emblem**. It appears on the Faith panel, beside the Devotion meter, in prayer
buttons and over the battlefield when a prayer is answered.

- **Format:**
  - 1024 × 1024 transparent PNG, **pure white `#FFFFFF` flat ink**, no glow, no gradient.
  - Exports at 256, 128, 64, 48, 32 and 24 px.
- **Style:** a simple, bold, emblem-like shape, readable at 24 px. Line weight like the AHOC seal. Meaning must survive in
  silhouette.
- **Folder:** `art/emblems/patrons/v1/`. File name = id.

| Id | Mark idea (a starting point; improve on it) |
|---|---|
| nerukhan | an open raised hand inside a ring of small saints' halos |
| the_quartermaster | a stamped seal crossed with a ration tag |
| the_laughing_mask | a grinning half-mask with one tear-shaped spark |
| the_toll_keeper | a coin with a small boat-lantern above it |
| mother_ember | a kettle whose steam curls into a flame |
| old_overcast | a cloud with one thick lightning bolt like a sceptre |
| the_matchmaker | two loops of thread tied in a knot |
| the_counting_weaver | three threads through an abacus bead row |

## Deliverable C: prayer icons (a new icon mode; do the test set first)

PHC needs icons for **6 Whispers** (shared by every patron), **24 Hymns** (3 per patron) and **8 Miracles** (1 per
patron).

This is a **new icon mode**, so it starts with a **test set of 6 Whispers** for Leon's review. Don't start the rest until
Leon approves it.

**Prayer icon mode (proposed):**

- Flat **white** ink on transparency, like the trait and perk icons.
- **No Wick, and no full figure.** A hand, a gesture or an object is fine.
- **One dominant motif** plus **sacred negative space**: a halo arc, a ray, a frame of light drawn as white shapes.
- **Whispers** have no patron mark; they are universal.
- **Hymns** carry their patron's mark small in one corner.
- **Miracles** carry the mark large, behind the motif, as a halo.
- Format and checks:
  - 1024 × 1024 masters.
  - Exports at 256, 128, 64, 56, 48, 44 and 40 px.
  - Check on `#10151F` at 44 px: it must read.
- **Folder:** `art/ui/prayers/v1/`. File names:
  - `whisper-luck.png`
  - `hymn-nerukhan-1.png`
  - `miracle-nerukhan.png`

**Whispers (the test set):**

| File | Whisper | It does | Motif idea |
|---|---|---|---|
| whisper-luck.png | Luck | +2 on the next roll | a coin spinning on its edge under a ray |
| whisper-health.png | Health | a small heal | two cupped hands holding a small light |
| whisper-protection.png | Protection | a small shield | an arc of light over a bowed head (partial) |
| whisper-courage.png | Courage | ends fear | a candle flame standing straight in wind lines |
| whisper-guidance.png | Guidance | reveals hidden things | an open eye made of a halo, a path below it |
| whisper-safe-passage.png | Safe Passage | no attacks as you move | a footprint inside a ring of light |

**Hymns and Miracles (after approval):**

| Patron | Hymn 1 | Hymn 2 | Hymn 3 | Miracle |
|---|---|---|---|---|
| nerukhan | Saint's Shield (a shield of light on an ally) | Judgement (a falling ray on one enemy) | Absolution (chains of conditions breaking) | The Saints' Verdict (many rays, a raised hand) |
| the_quartermaster | Resupply (a magazine dropping into a hand) | Dig In (sandbags rising) | Covering Fire (tracer lines over a square) | Requisition Approved (a giant stamp coming down) |
| the_laughing_mask | Lucky Break (a die mid-air with a spark) | Switcheroo (two arrows swapping places) | Pratfall (a banana-peel-like slip line and a falling weapon) | Encore (a curtain opening, a bow) |
| the_toll_keeper | Coin for the Ferry (a coin on a palm) | Hold the Gate (a lantern on a gatepost) | Last Crossing (a boat leaving on still water) | Turned Back at the Shore (a hand pulled back from the water) |
| mother_ember | Warm Hands (hands over a kettle steam) | Hearthlight (a hearth square of light) | Feed the Fire (a ladle pouring sparks) | Everyone Home (an open door with light) |
| old_overcast | Thunderclap (a ring of shockwave) | Lightning Rod (a bolt that forks once) | Gather the Clouds (clouds pulling together) | The Sky Answers (a storm square striking) |
| the_matchmaker | Red Thread (two hands tied by one thread) | Sweet Nothings (a lowered weapon with a small heart-knot) | Together (two shields overlapping) | Love Conquers (a dropped weapon, a thread knot) |
| the_counting_weaver | Foreknowing (a thread bending around an arrow) | Unravel (a knot coming undone) | Cut Short (a thread with an hourglass cut) | Rewoven (a loom shuttle passing back) |

(Colour stays out of the icons. The game tints nothing; the patron's accent appears only in effects.)

## Handoff (please follow)

For each delivery:

1. **Files.** Put them in the folders above, each with a `README.md` listing:
   - every file;
   - what it shows;
   - the prompt or approach;
   - any rule you bent and why.
2. **Review sheet.** A contact sheet per deliverable:
   - portraits side by side;
   - marks at 24 and 64 px on `#10151F`;
   - icons at 44 px on `#10151F`.
3. **Order:**
   1. Deliverable A or B, whichever you like first.
   2. Then the Whisper test set.
   3. Wait for Leon's verdict.
   4. Then the 32 Hymn and Miracle icons, in batches of 8 (one batch per two patrons), each batch shown for review.
4. **Questions.** Note any question for Leon at the top of the README. Don't guess silently.
5. **Catalog and checks.** If you can't edit the repo, send the files and READMEs to Leon. Claude will add them to
   `art/catalog.json` and run `python3 scripts/validate_art.py`.
