# M813 tutorial campaign: complete art brief

**For:** the artist (GPT). **From:** the M813 campaign (`data/campaigns/m813.json`; story and design in `docs/design/M813-tutorial-campaign.md`; lore in `docs/lore/MPAT-and-M813.md`).
**Status:** 52 original brief images drawn and pushed, pending Leon’s visual review. One runtime followup (E25, field lamp) brings the current delivery queue to 53. The original group order below is retained.

Read `art/style-guide/v1.3/PHC-Style-Guide.md` first. Everything here is **Heavenprint** (ink and opaque gouache, angular forms, deep charcoal and warm ivory, believable faces), except the object sprites (group E), which are a flat top-down game mode defined in that section. Attach for every Heavenprint image: `approved-original-27.jpg`, `approved-new-faces-27.jpg`, `approved-pilot.png`, plus `art/illustrations/m813/v1/outpost813.png` (the approved M813 world look) and `art/character-portraits/m813/mpat.png` (the approved 258th robot design).

**Already done, keep:** MPAT (`mpat`), the comrade head (`mpat-comrade`), Outpost-813 after the ship left (`outpost813`), the repair bay ending (`outpost1-repair-bay`, spoiler).

## Shared look for M813

- **The black hole B813** hangs over every M813 exterior: a cold accretion ring, blue-white, lighting everything from above. Outpost-1 sits beside a different black hole; same visual language, seen through windows.
- **258th Medical Unit robots** (the players and the NPC medics): MPAT's design language. Ivory ceramic shell, chipped and patched with other units' plates, charcoal screen face with sparse square pixel features, a triage lamp behind a medical-cross grille in the chest, a short scorched field cloak, surgical manipulators. Each medic differs in build, patches and cloak.
- **Infantry robots of Regiment 093** (Thousand World Legion): heavier, olive-grey military plating, a different maker's stencil, "093" on the shoulder, slit visors rather than screen faces. Broken ones are missing limbs, leaking coolant, still talking.
- **Regiment 093's humans:** Thousand World Legion field dress, practical and worn, regimental "093" marks. Engineers in heavy work coveralls with tool harnesses.
- **The enemy** is never identified in the record. Keep it unreadable: masked, hooded, mismatched armour, no faction marks. *Proposal.*
- **No real-Earth logos, flags, brands or text** anywhere (the Unspoken Name). Invented stencils only.

---

## A. Zone banners: 4 world illustrations (highest priority)

The big image at the top of the story screen for each zone, like `outpost813.png`. **1600 × 900 PNG, 16:9, opaque.** Keep the lower third calm, because the zone title sits over it. Opening-safe: no spoilers unless marked.

| # | ID · file | Show | Light |
|---|---|---|---|
| A1 | `m813-shield-line` · `art/illustrations/m813/v2/shield-line.png` | The moment the guns stop. A line of scorched barrier stakes across a grey plain, smoke drifting. Sergeant Nine-Nine, an infantry torso, is wedged upright in the stakes. Four medic robots move among twenty-odd broken infantry robots laid in a row behind the line. In no-man's-land, a fallen squad half buried, and an abandoned enemy drop pod. **This is also the campaign's card art.** | B813 rising over the horizon, cold blue-white; small warm triage lamps. |
| A2 | `m813-rear-pad-loading` · `.../v2/rear-pad-loading.png` | The rear pad **before** the ship leaves (the existing `outpost813` is after). The last ship, ramp down, the crane lowering a pallet of platinum crates. Chief Engineer Keel at the foot of the ramp with a manifest and a pistol on his hip, engineers behind him. In the foreground, the medics' column arriving: robots carrying robots. | B813 overhead; the ship's floodlights hard and white on the ramp. |
| A3 | `m813-outpost-hangar` · `.../v2/outpost-hangar.png` | Inside Outpost-813's hangar, long after. A wrecked short-hop escape craft half rebuilt from mismatched parts; two repair cradles side by side; parts of fallen robots laid out like an orderly ossuary; MPAT's field stove. Time has passed: dust, makeshift lamps, tally marks on a wall. | One work lamp, warm; B813's cold light through a high hangar slot. |
| A4 | `m813-outpost-1` · `.../v2/outpost-1.png` | Outpost-1, the Colonel's wing: clean, cold, polished floors, regimental banners. A long corridor leads to the repair bay's windows, where a black hole fills the glass. **Not the ending:** empty cradles, doors open, no one inside. | Even, cold institutional light; the black hole's ring as a reflection on the floor. |

## B. Character portraits: 16 (high priority)

Profile pictures for NPCs and enemies; the game also crops them into round map tokens, so keep the face or head in the **upper-middle third**. **800 × 1000 PNG, 4:5, opaque**, like `mpat.png`. One subject, chest-up or waist-up, with a background hinting at where they are.

**The 258th and Regiment 093's robots**

| # | ID | Who | Action and emotion |
|---|---|---|---|
| B1 | `m813-nine-nine` | **Sergeant Nine-Nine**, infantry sergeant: a torso and one shoulder, wedged in barrier stakes, voice box cracked, a sergeant's stripes painted on the shoulder plate. | Giving an order with his one arm, a dry joke in the tilt of the visor. Dying slowly and refusing to be dramatic about it. |
| B2 | `m813-seven-seven` | **Seven-Seven**, infantry robot, both legs gone below the knee. | Counting under its breath; one finger tapping the seconds on its own chest plate. Frightened, holding it together. |
| B3 | `m813-hum` | **Hum**, infantry robot with a cracked visor. | Head tilted, humming; small notes drifting from its speaker grille as faint marks in the air. Absent, peaceful, strange. |
| B4 | `m813-lantern` | **Lantern**, infantry robot. | Both hands holding its chest plate shut. Through a gap: a child's crayon drawing of a human family. Protective, shy. |
| B5 | `m813-soft-hands` | **Soft-Hands**, medic robot of the 258th (MPAT's design language). Slender, delicate manipulators, a cloak patched with bandage cloth. | Mid-repair on someone's arm off-frame; gentle, tired. |
| B6 | `m813-rook` | **Rook**, medic robot: heavier, a stretcher harness on its back, one replacement arm from an infantry robot. | Bracing to lift; stubborn. |
| B7 | `m813-penny` | **Penny**, medic robot: small and quick, a triage tag reel at its hip, a coin-sized dent on its face screen. | Writing a tag, glancing up; the youngest-feeling of the four. |

**Regiment 093's humans**

| # | ID | Who | Action and emotion |
|---|---|---|---|
| B8 | `m813-keel` | **Chief Engineer Keel**: fifties, heavy coveralls, grease to the elbows, a manifest on a clipboard, a revolver on his hip. | Looking down at a column of robots off-frame. Frightened and reasonable: he is right about the thrust numbers, and he knows what he is about to do. |
| B9 | `m813-ilse-varga` | **Ilse Varga**, junior engineer: early twenties, oversized coveralls, crane-control gloves. | Hands shaking on the crane controls; not looking at Keel. Conscience, and fear of it. |
| B10 | `m813-engineer-a` | **Engineer**, generic token: work goggles up, wrench and service pistol. | Wary, finger near the trigger. |
| B11 | `m813-engineer-b` | **Engineer**, generic token, a second face: a different age, build and gear. | Clutching a grenade belt, sweating. |
| B12 | `m813-novikov` | **Colonel Alexei Novikov**: sixties, immaculate Thousand World Legion dress uniform, regimental "093" on the collar, reading glasses. | Seated at a desk, hands folded, looking up as if he expected you. Polite. Never raises his voice. The calm is the menace. |
| B13 | `m813-security-guard` | **Station security guard**, generic token: Outpost-1 security armour, helmet visor up, SMG. | Alert, blocking a corridor. |
| B14 | `m813-guard-captain` | **Guard captain**: older, scarred, a service rifle across the chest, captain's bar. | Assessing you, unimpressed. |

**The enemy and the machines**

| # | ID | Who | Action and emotion |
|---|---|---|---|
| B15 | `m813-scavenger-drone` | **Scavenger drone**: a small hovering salvage machine with grabbing claws and a cutting torch, picking at the dead. | Mid-dive, claws open. Insect-like, mindless. |
| B16 | `m813-rearguard` | **Enemy rearguard trooper**: masked, hooded, mismatched armour, a rifle, no faction marks (*proposal*: the enemy stays unknowable). | Turning to leave, then seeing you. |

(The rearguard sergeant reuses B16 with a different name; one portrait is enough.)

## C. Map backgrounds: 4 (high priority)

The painted ground under each zone's grid. **Top-down, orthographic, no perspective.** **1600 × 1100 PNG** (16 × 11 tiles of 100 px; each tile is 1.5 m, so a robot fills about half a tile). Opaque.

**Paint to the layout guides** in `art/briefs/m813-tutorial/maps/` (`<zone>-layout.png`), rendered from the campaign file, so the art matches the rules exactly:

| Guide shows | Paint |
|---|---|
| Dark tiles ("WALL") | Walls, hulls, cliffs: clearly impassable, readable at a glance. |
| Hatched tiles | Slow ground: rubble, mud, wreckage, still walkable. |
| Red-boxed tiles (crates, doors, terminals, POIs…) | **Plain floor.** The game draws a sprite there (group E). Don't paint the object. |
| Green dots, red rings | Nothing; context only. |

No grid lines, letters or text in the painting; the game draws them. Keep floors mid-dark so white UI and tokens read on top. Light from the same direction in all four (top-left).

| # | ID · file | Zone | Ground |
|---|---|---|---|
| C1 | `map-m813-shield-line` · `art/maps/m813/v1/shield_line.png` | The shield line | Grey ash plain, shell scars and scorch rings, tracks of the squads; west half (A–F) is no-man's-land with craters and wreckage; the trench line behind the stakes; coolant stains to the east. |
| C2 | `map-m813-rear-pad` · `.../rear_pad.png` | The rear pad | Scorched landing pad plating with painted landing markings (invented, no real symbols); the ship's hull in N1–P6 seen from above (wing and hull plates, ramp edge toward M); the wreck field's edge along rows 10–11. |
| C3 | `map-m813-outpost` · `.../outpost.png` | Outpost-813 | Interior floor plan from above: barracks bunks (A1–E4), infirmary tiles (G1–J4), comms room (L1–P4), corridor (row 6), hangar deck with oil stains and tie-down rings (rows 8–11). Walls as thick ceramic-concrete. |
| C4 | `map-m813-outpost-1` · `.../outpost_1.png` | Outpost-1 | Polished institutional floors; the Colonel's office carpet (A1–E4); security room (L1–P3); atrium (A6–F11); the repair bay's clean deck with drainage grilles (H7–P11); the bay doors' frame along the east wall. |

## D. Story moments: 4 illustrations (medium priority)

Shown in the story stream at key beats. **1600 × 900 PNG.** Mind the spoiler level.

| # | ID | Beat | Show | Spoiler |
|---|---|---|---|---|
| D1 | `m813-how-many` | Opening | Close on Nine-Nine in the stakes, looking up at a medic's triage lamp: "How many of us can you carry?" | Opening-safe |
| D2 | `m813-the-ramp` | The ramp standoff | Keel and the engineers above on the ramp; the column below; Lantern being carried up front, chest plate open. Guns not yet raised. | Mid |
| D3 | `m813-the-choice` | The record's choice | Two repair cradles; MPAT and the comrade head between them; parts of everyone else laid out. Undecided. | Mid, after the ship leaves |
| D4 | `m813-the-demand` | Outpost-1 | The Colonel's desk from the robots' side: a battered medic robot standing, the comrade head on the desk between them, the Colonel's folded hands. | End: hide until Outpost-1 |

## E. Object sprites: 24 (needed before maps are playable)

The game places these on tiles. **Top-down, flat, transparent PNG, 256 × 256**, the object filling about 80% of the tile, a soft drop shadow toward the bottom-right, and the same light (top-left). Style: a simplified painted look (Heavenprint shapes, fewer details, strong silhouettes), readable at 46 px. **Not Wick's flat white ink**; that's for icons.

| # | ID | Object (kind) | Used where |
|---|---|---|---|
| E1 | `obj-barrier-stakes` | Scorched barrier stakes in a short row (low wall) | Shield line G3–G9 |
| E2 | `obj-platinum-crates` | Stack of platinum crates, one split showing metal bars (crate) | Rear pad L3–L5 |
| E3 | `obj-tool-rack` | Tool rack / workbench (crate) | Outpost hangar |
| E4 | `obj-cargo-pylon` | Cargo pylon, standing (pillar) | Rear pad K7 |
| E5 | `obj-toppled-pylon` | Toppled pylon on its side (pillar) | Shield line E8 |
| E6 | `obj-door-closed` | Interior blast door, closed (door) | Outposts |
| E7 | `obj-door-open` | The same door, open (door) | Outposts |
| E8 | `obj-crater` | Shell crater, deep, debris sliding in (hole) | Shield line K2–K3 |
| E9 | `obj-mine` | Unexploded mine, revealed (trap) | Shield line E5 |
| E10 | `obj-coolant` | Coolant pool, iridescent green-blue (toxic) | Shield line N5–N6 |
| E11 | `obj-fire` | Burning patch of ground (fire) | After explosions |
| E12 | `obj-fuel-drum` | Fuel drum with hazard stencil (barrel) | Rear pad L9, outpost O10 |
| E13 | `obj-rubble` | Broken cover: scattered rubble (rubble) | Anywhere cover breaks |
| E14 | `obj-fallen-squad` | Pile of fallen infantry robots, two lights blinking (container) | Shield line D4 |
| E15 | `obj-triage-line` | Broken robots laid in a neat row on tarps (container) | Shield line J7 |
| E16 | `obj-footlockers` | Two open footlockers (container) | Outpost B2 |
| E17 | `obj-cookbook` | A greasy cookbook open on a bunk (container) | Outpost D2 |
| E18 | `obj-platinum-net` | Pallet of platinum in a cargo net (container) | Rear pad L6 |
| E19 | `obj-terminal-field` | Field radio and hatch panels: a small rugged console (terminal; one sprite for the squad radio and hatch controls) | Shield line M8, rear pad M3 |
| E20 | `obj-drop-pod` | Enemy drop pod from above, hatch open, a glowing sigil burned into it (terminal) | Shield line B9 |
| E21 | `obj-console` | Wall console: medical bay, comms, security cameras (terminal; one sprite) | Outposts |
| E22 | `obj-escape-craft` | Wrecked short-hop escape craft from above (POI). **May overflow its tile**: 512 × 512, centred on H9 | Outpost H9 |
| E23 | `obj-repair-cradles` | Two repair cradles side by side (POI). 512 × 256, two tiles | Outpost K10, Outpost-1 L9 |
| E24 | `obj-poi-marker` | Generic point-of-interest marker: a small surveyor's flag with the 258th's cross. Also used for "no-man's-land", "the ramp", "the column", "bay doors" and exits | Anywhere |

NPC points of interest (Nine-Nine, Ilse Varga, the Colonel) use their portraits (group B) as tokens, so they need no sprite.

## Runtime followup — 6 November 2026

The implementer’s movement/vision update added two `lamp` objects to `data/campaigns/m813.json`, after this brief was written: a work lamp at Outpost-813 I9 and an infirmary lamp at H3. A shared `obj-field-lamp` sprite is added as E25 so these new objects have art. Same top-down transparent256px specification as group E. The lamp’s appearance is a proposal. Both positions are already empty floor in the painted map.

## Delivery

- Group A and D → `art/illustrations/m813/v2/` (D4 in `spoilers/`); group B → `art/character-portraits/m813/v2/`; group C → `art/maps/m813/v1/`; group E → `art/sprites/objects/v1/`.
- Add each to `art/catalog.json` with the ID above (new sections `maps` and `sprites`; mark `spoiler` and `visibility` for groups A and D), update `checksums.sha256`, and run `python3 scripts/validate_art.py`. Claude extends the validator and wires the art into the game on delivery: zone banners, portrait tokens, map backgrounds under the grid, and sprites on tiles.
- Anything not stated in the lore is a *proposal*. Flag doubts in the delivery notes instead of guessing.
