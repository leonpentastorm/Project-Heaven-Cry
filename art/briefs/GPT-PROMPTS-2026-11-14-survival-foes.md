# GPT prompts, 14 Nov 2026: faces for the enemies of Survival

For the artist. Leon, 14 Nov 2026: "loads of enemies in survival do not have picture at all, why not request it to
the artist?" He is right: the earlier Survival request asked for only five Elite and Boss faces, and none have been
delivered. Today every enemy in a Survival fight is a token with a letter on it.

## Read this first

- **What they are for:** the round token on the fight map (the game crops a circle around the face), the turn-order
  strip, the hover card, and the cut-in of a Boss. So the **face or lens must sit on the eye line** and read at
  40 pixels: one clear silhouette, strong light from one side, a plain dark ground behind the head.
- **Format:** Heavenprint painted portrait, the same mode as `art/portraits/world/` and `art/portraits/m813/`
  (`art/style-guide/PHC-Style-Guide.md`), 800 x 1000, 4:5, bust, opaque painted background, eye line about 22%
  from the top and centred within 10%. No text, no logos, no frame.
- **Each a different individual.** Where a kind has two of a tier they must not look like the same person or the
  same unit: change age, build, gear, damage, the colour of cloth.
- **Colour tells the tier at a glance** (the game also writes it): vermin dull and grey; minion muted; soldier one
  clear accent; elite a second accent and a trophy or mark; a Boss the richest and largest in frame.
- **Save as** `art/portraits/survival/foes/<id>.png` with the ids below; add each to `art/catalog.json` under
  `characters` with `"collection": "survival-foes"`, its `kind`, `tier` and `eye_line`. Deliver on a branch
  `art/survival-foes-2026-11-14` with a contact sheet per kind.
- In-world only: no real-world insignia. Orks, Crawlers, robots and the rest as `docs/lore/` describes them.

## The base prompt (paste before each row)

> Heavenprint painted character portrait, 4:5, 800 x 1000, bust, dark plain painted ground, single hard side
> light, visible brushwork, muted palette with one accent. The face (or lens) in the upper third, centred. Reads
> as a small round token. No text, no logos, no frame.

## A. By kind and tier

### Human  (appears in: AHOC chapter outpost, Central City back streets, The old battlefield, Shrine and cathedral district, Rim station)

Human fighters of the Earth Sector: militia, deserters, chapter troopers, hired guns. Working gear, mismatched armour, tired faces. Each one a different person (age, build, skin, hair).

| # | Id | Tier | Paint |
|---|---|---|---|
| 1 | `foe-human-vermin` | vermin | A human vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 2 | `foe-human-minion-a` | minion | A human minion: a line fighter, poorly armed. |
| 3 | `foe-human-minion-b` | minion | A human minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 4 | `foe-human-soldier-a` | soldier | A human soldier: a trained, properly armed fighter. |
| 5 | `foe-human-soldier-b` | soldier | A human soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 6 | `foe-human-elite` | elite | A human elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Robot  (appears in: AHOC chapter outpost, Machine works and drone foundry, Rim station)

Robots: machines built by people, bipedal, service-worn, a given face or a sensor mask, markings scraped off. Not sleek: dented plate, exposed cabling.

| # | Id | Tier | Paint |
|---|---|---|---|
| 7 | `foe-robot-vermin` | vermin | A robot vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 8 | `foe-robot-minion-a` | minion | A robot minion: a line fighter, poorly armed. |
| 9 | `foe-robot-minion-b` | minion | A robot minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 10 | `foe-robot-soldier-a` | soldier | A robot soldier: a trained, properly armed fighter. |
| 11 | `foe-robot-soldier-b` | soldier | A robot soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 12 | `foe-robot-elite` | elite | A robot elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Drone  (appears in: AHOC chapter outpost, Central City back streets, Machine works and drone foundry, Rim station)

Drones: small flying or skittering machines, no face, one lens or a cluster, rotors or legs, a slung weapon. Painted as a creature portrait: the lens is the eye.

| # | Id | Tier | Paint |
|---|---|---|---|
| 13 | `foe-drone-vermin` | vermin | A drone vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 14 | `foe-drone-minion-a` | minion | A drone minion: a line fighter, poorly armed. |
| 15 | `foe-drone-minion-b` | minion | A drone minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 16 | `foe-drone-soldier-a` | soldier | A drone soldier: a trained, properly armed fighter. |
| 17 | `foe-drone-soldier-b` | soldier | A drone soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 18 | `foe-drone-elite` | elite | A drone elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Crawler  (appears in: Central City back streets)

Crawlers: espers cursed to look, to ordinary people, like the thing they fear most. Paint what an ordinary human sees: a wrong, frightening shape with a human posture and human eyes somewhere in it. Tragic, not bestial.

| # | Id | Tier | Paint |
|---|---|---|---|
| 19 | `foe-crawler-vermin` | vermin | A crawler vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 20 | `foe-crawler-minion-a` | minion | A crawler minion: a line fighter, poorly armed. |
| 21 | `foe-crawler-minion-b` | minion | A crawler minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 22 | `foe-crawler-soldier-a` | soldier | A crawler soldier: a trained, properly armed fighter. |
| 23 | `foe-crawler-soldier-b` | soldier | A crawler soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 24 | `foe-crawler-elite` | elite | A crawler elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Ork  (appears in: The old battlefield)

Orks: huge, tusked, grey-green, scarred, daubed with ochre war paint, scrap armour, a rip-saw or a machete. Proud and enjoying themselves.

| # | Id | Tier | Paint |
|---|---|---|---|
| 25 | `foe-ork-vermin` | vermin | A ork vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 26 | `foe-ork-minion-a` | minion | A ork minion: a line fighter, poorly armed. |
| 27 | `foe-ork-minion-b` | minion | A ork minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 28 | `foe-ork-soldier-a` | soldier | A ork soldier: a trained, properly armed fighter. |
| 29 | `foe-ork-soldier-b` | soldier | A ork soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 30 | `foe-ork-elite` | elite | A ork elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Beast  (appears in: The old battlefield)

Beasts of the old battlefield: gaunt war-hounds and carrion things, half-fed, armour scraps grown into hide. Animal, no weapon.

| # | Id | Tier | Paint |
|---|---|---|---|
| 31 | `foe-beast-vermin` | vermin | A beast vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 32 | `foe-beast-minion-a` | minion | A beast minion: a line fighter, poorly armed. |
| 33 | `foe-beast-minion-b` | minion | A beast minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 34 | `foe-beast-soldier-a` | soldier | A beast soldier: a trained, properly armed fighter. |
| 35 | `foe-beast-soldier-b` | soldier | A beast soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 36 | `foe-beast-elite` | elite | A beast elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Cursed  (appears in: The old battlefield, Shrine and cathedral district)

The cursed: people marked by a mistake of a Celestial: ash-pale, cracked like glaze, something bright leaking from the cracks, old uniforms or pilgrim cloth.

| # | Id | Tier | Paint |
|---|---|---|---|
| 37 | `foe-cursed-vermin` | vermin | A cursed vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 38 | `foe-cursed-minion-a` | minion | A cursed minion: a line fighter, poorly armed. |
| 39 | `foe-cursed-minion-b` | minion | A cursed minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 40 | `foe-cursed-soldier-a` | soldier | A cursed soldier: a trained, properly armed fighter. |
| 41 | `foe-cursed-soldier-b` | soldier | A cursed soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 42 | `foe-cursed-elite` | elite | A cursed elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Machine  (appears in: Machine works and drone foundry, Rim station)

Machines of the works: not built to look like anything: a loader, a press arm on tracks, a welding rig, turned on the squad. Heavy, slow, industrial yellow under grime.

| # | Id | Tier | Paint |
|---|---|---|---|
| 43 | `foe-machine-vermin` | vermin | A machine vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 44 | `foe-machine-minion-a` | minion | A machine minion: a line fighter, poorly armed. |
| 45 | `foe-machine-minion-b` | minion | A machine minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 46 | `foe-machine-soldier-a` | soldier | A machine soldier: a trained, properly armed fighter. |
| 47 | `foe-machine-soldier-b` | soldier | A machine soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 48 | `foe-machine-elite` | elite | A machine elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

### Upper Realm  (appears in: Shrine and cathedral district)

Upper-realm things: a patch made by a Celestial, walking: too clean, too bright, a figure of light and enamel with a calm mask of a face, robes that do not move right.

| # | Id | Tier | Paint |
|---|---|---|---|
| 49 | `foe-upper-realm-vermin` | vermin | A upper realm vermin: the smallest and weakest of its kind: a scavenger, a runt, a broken unit. |
| 50 | `foe-upper-realm-minion-a` | minion | A upper realm minion: a line fighter, poorly armed. |
| 51 | `foe-upper-realm-minion-b` | minion | A upper realm minion: a line fighter, poorly armed. A second individual: different age, build and gear from the first. |
| 52 | `foe-upper-realm-soldier-a` | soldier | A upper realm soldier: a trained, properly armed fighter. |
| 53 | `foe-upper-realm-soldier-b` | soldier | A upper realm soldier: a trained, properly armed fighter. A second individual: different age, build and gear from the first. |
| 54 | `foe-upper-realm-elite` | elite | A upper realm elite: a named veteran or a heavy unit: bigger, better armoured, with a distinguishing mark (a banner, a trophy, a commander plate). |

## B. Bosses (one per distinct Boss; the largest and richest portraits; also shown full-screen)

| # | Id | Boss | Settings | Paint |
|---|---|---|---|---|
| 55 | `boss-robot-warframe` | Chapter warframe (robot) | AHOC chapter outpost, Machine works and drone foundry, Rim station | A war machine of the chapter: twice the height of a man, slab armour with the seal ground off, a belt-fed gun for an arm, one cracked amber lens, old kill marks. Tireless. |
| 56 | `elite-crawler` | Crawler elder (crawler) | Central City back streets | The oldest of a Crawler brood, as ordinary people see it: vast, many-jointed, a crown of something like antlers or hands, and in the middle of it a small, old, very human face that is weeping. |
| 57 | `boss-ork-warlord` | Ork warlord (ork) | The old battlefield | An Ork warlord: enormous, one tusk broken, ochre and white war paint, a cloak of stitched banners, a rip-saw greatsword over the shoulder, laughing. |
| 58 | `boss-upper-realm-patch` | Upper-realm patch (upper_realm) | Shrine and cathedral district | A hero made by a Celestial to fix its own mistake: radiant, symmetrical, beautiful and blank, enamel-white and gold, a greatsword of light, a halo slightly off-centre. Wrong by being too right. |

## C. Vault guards (one per setting: stronger than an Elite, guarding a chest)

| # | Id | Guard | Setting | Paint |
|---|---|---|---|---|
| 59 | `vault-guard-ahoc` | Strongroom warden (human) | AHOC chapter outpost | Strongroom warden: a human of AHOC chapter outpost, heavier and better kept than its fellows, standing before a strongroom door; keys, a seal or a chain as its mark. |
| 60 | `vault-guard-city` | The fence's bruiser (crawler) | Central City back streets | The fence's bruiser: a crawler of Central City back streets, heavier and better kept than its fellows, standing before a strongroom door; keys, a seal or a chain as its mark. |
| 61 | `vault-guard-field` | Ork loot-keeper (ork) | The old battlefield | Ork loot-keeper: a ork of The old battlefield, heavier and better kept than its fellows, standing before a strongroom door; keys, a seal or a chain as its mark. |
| 62 | `vault-guard-works` | Vault press (machine) | Machine works and drone foundry | Vault press: a machine of Machine works and drone foundry, heavier and better kept than its fellows, standing before a strongroom door; keys, a seal or a chain as its mark. |
| 63 | `vault-guard-shrine` | Reliquary warden (cursed) | Shrine and cathedral district | Reliquary warden: a cursed of Shrine and cathedral district, heavier and better kept than its fellows, standing before a strongroom door; keys, a seal or a chain as its mark. |
| 64 | `vault-guard-rim` | Bonded-store sentinel (robot) | Rim station | Bonded-store sentinel: a robot of Rim station, heavier and better kept than its fellows, standing before a strongroom door; keys, a seal or a chain as its mark. |

## D. Casters (enemies that use Sigils or Outbursts; they must read as casters at token size)

| # | Id | Name | Tier | Paint |
|---|---|---|---|---|
| 65 | `foe-caster-sigil-novice` | Sigil novice | minion | Sigil novice: a Sigil user: an Evoker glove with lit knuckles raised, a glyph burning in the air by the hand (a shape, not a letter), chalk or ink on the sleeves. |
| 66 | `foe-caster-sigil-adept` | Sigil adept | soldier | Sigil adept: a Sigil user: an Evoker glove with lit knuckles raised, a glyph burning in the air by the hand (a shape, not a letter), chalk or ink on the sleeves. |
| 67 | `foe-caster-sigil-warden` | Sigil warden | elite | Sigil warden: a Sigil user: an Evoker glove with lit knuckles raised, a glyph burning in the air by the hand (a shape, not a letter), chalk or ink on the sleeves. |
| 68 | `foe-caster-sigil-magister` | Sigil magister | boss | Sigil magister: a Sigil user: an Evoker glove with lit knuckles raised, a glyph burning in the air by the hand (a shape, not a letter), chalk or ink on the sleeves. |
| 69 | `foe-caster-heart-adept` | Heart adept | soldier | Heart adept: a Soul user: an Emanator glove with a glowing palm held to the chest, light gathering there, hair and cloth lifting as if in a wind from inside. |
| 70 | `foe-caster-heartfire-elite` | Heartfire elite | elite | Heartfire elite: a Soul user: an Emanator glove with a glowing palm held to the chest, light gathering there, hair and cloth lifting as if in a wind from inside. |
| 71 | `foe-caster-heart-sovereign` | Heart sovereign | boss | Heart sovereign: a Soul user: an Emanator glove with a glowing palm held to the chest, light gathering there, hair and cloth lifting as if in a wind from inside. |

## Counts

71 portraits. Order of need: section A soldiers and minions for **human, robot, drone** (the first setting uses only
those), then the Bosses, then the rest of A, then C and D.

## For the builder (later; not the artist)

The game should pick the portrait of a foe from data by kind and tier (`foe-<kind>-<tier>`, a variant chosen by the
seed of the unit), fall back to the generic token of the tier when a file is missing, and never name a portrait id in code.
