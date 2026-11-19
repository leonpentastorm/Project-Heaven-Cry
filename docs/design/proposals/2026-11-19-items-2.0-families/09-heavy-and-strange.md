# Items 2.0 design sheet: the heavy and strange weapons (families H1 to H8)

Moved here on 19 Nov 2026 from `art/briefs/prompts-2026-11-19/09-heavy-and-strange.md`, which now holds only the
artist's prompts. This sheet keeps the design material, brought in line with Leon's rulings of 19 Nov 2026:

- **R1:** everything proposed is approved (the families, forms, names and ids below; file 10's redraw notes for this
  file: the spinner is the belt-fed general-purpose gun, the siege tube the warhead-out-front launcher, the drum launcher
  the revolving six-shot 40 mm launcher).
- **R2:** scheme S1, all five grades painted for every graded item.
- **R3:** the gun-like heavies (launchers, rocket tubes, rotary, anti-materiel) are drawn as their real-world pattern by
  its features; names, makers and markings are ours. Flamers, powered blades, power gauntlets and thrown weapons stay
  invented.
- **R4:** eight families stand. The core rifle and the censer gun are advanced-class weapons: their families (old H6 and
  H7) and their four forms are out of this pack (kept below under "Later: advanced-class weapons"). A weapon too weird
  for a family is a one-off unique.
- **R5:** a gun line's base scales on Dexterity only; a variant's second skill is always an alpha skill (Durability, Raw
  Power, Ingenuity, Brain Power, Visualization, Empathy, Will Power, Faith) and only where it honestly applies, otherwise
  none. Powered melee bases roll Raw Power only.

Nothing here is data yet: the spec changes first, then `data/`, then the validator (CLAUDE.md). Every number a form
mentions is a sketch of what it does, not a value.

The old ids H1 to H10 are renumbered H1 to H8 (Core and Censer removed). The artist file uses the new numbering.

---

## 1. The families sheet

Read from `data/weapons.json`: the five guns below roll and scale on Dexterity (`skill: dexterity`, `phys.hits_with`), so
each is already the Dexterity-only base of its family. The two powered melee bases (`ork_rip_saw`,
`hellraiser_servo_fist`) roll **Raw Power** only (R5): the servo-fist's `phys.also_scales` goes. `afterword` is a unique
and stays out of every family. `hellraiser_lmg` is the long form of the Hellraiser gun line (G7), so H4 does not repeat it:
its light form is the general-purpose belt-fed gun, a different pattern (heavier calibre, quick-change barrel).

"Second skill" says what the skill feeds, always the family's signature, never the hit roll.

### H1 Launchers (Smetanita Conjunction: lacquer black and brass)

**Signature:** the shot goes over cover in an arc and lands on a tile: a blast that hits everyone in it and gives Pressure,
no roll (the Lob technique, `phys.props` `blast`, `arc`). **Drawn as:** real patterns (R3).

| Form | Id | Pattern (by features) | One line | Second skill (what it feeds) |
| --- | --- | --- | --- | --- |
| Light | `smetanita_snub_launcher` | the compact single-shot break-open 40 mm launcher with a pistol grip and a folding stock | One shot, radius 1, short range; a thumper that fits a coat. | none |
| Base | `smetanita_thumper` | the single-shot break-action 40 mm launcher (repaint in file 10) | Six loose rounds, radius 2. | none (Dexterity only) |
| Heavy | `smetanita_drum_launcher` | the revolving six-shot 40 mm launcher | The whole cylinder ready, no loose reloads between shots. | **Raw Power**: Lob's AP (3 to 2 from Raw Power 5) |

The underslung launcher (`mod_underslung`, `built: false`) fires the same 40 mm round and should lend Lob when it is built;
it is a mod, not a form, and its painting exists (`art/icons/gear/mod-underslung.png`).

### H2 Rocket tubes (Thousand World Legion: anonymous olive-grey)

**Signature:** breaks what it hits: triple damage to cover, walls and shields, plus a splash (`cover_damage_mult` 3,
`splash_damage`, `area_radius_1`). **Drawn as:** real patterns (R3).

| Form | Id | Pattern (by features) | One line | Second skill (what it feeds) |
| --- | --- | --- | --- | --- |
| Light | `legion_throwaway_tube` | the telescoping disposable rocket tube | Fire it once and drop it; light enough to carry two beside a rifle. | **Ingenuity**: a shaped charge, the cover multiplier (3 to 4 from Ingenuity 5) |
| Base | `breacher_tube` | the reusable recoilless rifle (repaint in file 10) | One rocket, reload 3 AP. | none (Dexterity only) |
| Heavy | `legion_siege_tube` | the shoulder rocket launcher with the warhead out the front | A bigger rocket, radius 2, for doors that are buildings. | **Raw Power**: reload AP (3 to 2 from Raw Power 5) |

### H3 Flamers (Lumeri Church: ivory and gold)

**Signature:** burning ground: a cone that ignores half cover and sets targets Burning, and a line of fire that stays on
the tiles (Wall of Fire). **Drawn as:** invented.

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | `lumeri_votive_torch` | A one-hand pistol flamer with a hand-held fuel flask: a short cone, no wall. | none (was Intimidation, a gamma: removed by R5) |
| Base | `purifier_flamer` | A 3-tile cone, the Wall of Fire for 3 AP. | none (Dexterity only) |
| Heavy | `lumeri_cathedral_burner` | A two-tank backpack burner with a long lance nozzle: a longer wall that lasts longer. | **Raw Power**: the wall's length (+1 tile at Raw Power 3, 6 and 9) |

### H4 Rotary and belt-fed guns (Hellraiser Divisions: oxide red)

**Signature:** suppression: a stream of fire that pins an area, Pressure on everyone near the target, and holds until your
next turn (Suppress with the `auto` and `heavy` lines), at the price of a spin-up (rotaries) and a penalty unless
emplaced. **Drawn as:** real patterns (R3).

| Form | Id | Pattern (by features) | One line | Second skill (what it feeds) |
| --- | --- | --- | --- | --- |
| Light | `hellraiser_spinner` | the general-purpose belt-fed machine gun (file 10's redraw note) | Full-power belt, fired standing from the hip, no emplacement penalty, less range than the rotary; no Spin Up. | none (was Intimidation, a gamma: removed by R5) |
| Base | `hellraiser_rotary` | the six-barrel rotary gun | Six barrels, 200 rounds, Spin Up. | none (Dexterity only) |
| Heavy | `hellraiser_twin_rotary` | two six-barrel rotary clusters, each drawn faithfully, on one carried twin mount with a backpack belt feed (no single real pattern exists: the clusters carry the read) | The heaviest gun a person carries. | **Raw Power**: fires without the unemplaced penalty from Raw Power 5 |

The name "spinner" stays (R1: ids are never renamed); the picture is the belt-fed gun.

### H5 Anti-materiel rifles (Frontier mercenaries: no accent, grim steel)

**Signature:** the shot goes through: it ignores armour, carries on to the next target in line and breaks the half cover
it crosses (Through and Through), at the price of bracing or lying prone. **Drawn as:** real patterns (R3).

| Form | Id | Pattern (by features) | One line | Second skill (what it feeds) |
| --- | --- | --- | --- | --- |
| Light | `blackpoint_carbine` | the compact bolt-action bullpup anti-materiel rifle (the picture shows its five-round magazine; the magazine is cosmetic, in the game it holds one round) | One round, half the range, braced on anything. | **Raw Power**: fire it unbraced from Raw Power 5 |
| Base | `blackpoint_700` | the long semi-automatic anti-materiel rifle with a box magazine (as repainted in file 10, 1.9) | Three rounds, 40 tiles, braced or prone. | none (Dexterity only) |
| Heavy | `blackpoint_wall_gun` | the very long wartime semi-automatic anti-tank rifle with an internal five-round magazine, a barrel carry handle and a mid bipod (no shield in the picture) | Prone only; the hit goes through full cover as well. | none (was Analysis, not an alpha: removed by R5) |

### H6 Powered blades (Orks: rust and dirty ochre) (was H8)

**Signature:** a running blade that saws through armour and leaves wounds open (armour ignore, Bleeding on a hit).
**Drawn as:** invented.

| Form | Id | One line | Rolls | Second skill (what it feeds) |
| --- | --- | --- | --- | --- |
| Light | `ork_snarl_knife` | A one-hand chain knife with a pull-cord engine on the guard. | Dexterity (the melee light form) | **Raw Power**: armour ignored (5 to 8 from Raw Power 5) |
| Base | `ork_rip_saw` | The rip-saw as it is. | Raw Power only | none |
| Heavy | `ork_wreck_saw` | A two-hand circular saw on a long engine body: breaks plates and cover as well as men. | Raw Power | none (was Guts, a beta: removed by R5) |

### H7 Power gauntlets (Hellraiser Divisions: oxide red) (was H9)

**Signature:** a fist that moves people: a hit pushes the target away (forced movement), into walls and friends.
**Drawn as:** invented.

| Form | Id | One line | Rolls | Second skill (what it feeds) |
| --- | --- | --- | --- | --- |
| Light | `hellraiser_piston_knuckles` | A knuckle-and-wrist piston, no gauntlet: quick jabs, a 1-tile push. | Dexterity | **Raw Power**: push (+1 tile from Raw Power 5) |
| Base | `hellraiser_servo_fist` | A 2-tile push. | Raw Power only (`also_scales` removed) | none |
| Heavy | `hellraiser_door_knocker` | A forearm-length pneumatic ram gauntlet: a 3-tile push, and triple damage to cover and doors. | Raw Power | none (was Intimidation, a gamma: removed by R5) |

### H8 Thrown weapons (Frontier: no accent) (was H10)

**Signature:** a ranged attack with no ammunition and no noise, at two targets at once (Flurry's `thrown` line); the
weapons land in the piles on the targets' tiles. **Drawn as:** invented.

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | `throwing_darts` | A roll of eight needle darts: tiny damage, longer reach, each one can carry a dose. | **Ingenuity**: a dart carries a Toxin vial's dose (from Ingenuity 3) |
| Base | `throwing_knives` | Four knives, Fan of Knives. | none (Dexterity only) |
| Heavy | `throwing_javelins` | Three short iron javelins in a back quiver: heavy hits that stagger. | **Raw Power**: range (+2 tiles from Raw Power 5) and a hit costs the target 1 AP |

### Summary

| Family | Base | Two new forms | Signature | Second skills (light / heavy) |
| --- | --- | --- | --- | --- |
| H1 Launchers | `smetanita_thumper` | snub launcher / drum launcher | arc over cover, blast, Pressure | none / Raw Power |
| H2 Rocket tubes | `breacher_tube` | throwaway tube / siege tube | breaks cover and walls, splash | Ingenuity / Raw Power |
| H3 Flamers | `purifier_flamer` | votive torch / cathedral burner | burning ground, ignores half cover | none / Raw Power |
| H4 Rotary and belt-fed | `hellraiser_rotary` | spinner / twin rotary | area suppression | none / Raw Power |
| H5 Anti-materiel | `blackpoint_700` | carbine / wall gun | through armour, the line, cover | Raw Power / none |
| H6 Powered blades | `ork_rip_saw` | snarl knife / wreck saw | armour ignore, Bleeding, plate break | Raw Power / none |
| H7 Power gauntlets | `hellraiser_servo_fist` | piston knuckles / door-knocker | forced movement | Raw Power / none |
| H8 Thrown | `throwing_knives` | darts / javelins | silent, no ammo, two targets | Ingenuity / Raw Power |

**8 families, 24 forms: 8 exist and are painted, 16 new.** Pictures for the 16 new forms under S1: 16 Standard masters +
64 grade pictures = 80 (the 8 existing bases' grade sets are counted with the other graded one-offs). Line icons
(Claude's, not the artist's): 16 new.

---

## 2. Engine features these need (for the lead)

Leon ruled (19 Nov 2026) that every engine feature these need is added in Items 2.0, after one consolidated primitives
list across every Items 2.0 file is approved by the lead (CLAUDE.md "No rebuild": general pieces, one copy; no builder
adds to a closed list on its own word).

Exists today (from `docs/ENGINE-HOOKS.md` and `data/techniques.json`): the blast radius and `blast_landed`; Lob (arc over
full cover, blast with Pressure); Pressure; Suppress and Brace with their `auto` and `heavy` lines; `cover_damage_mult`;
`on_hit` (push, bleed, prone, armour_break, ap_loss); `applies_burning` on the units a blast hits; `armor_ignore_N`;
`braced_bonus`; Flurry's `thrown` line; the `silent` property; `push_tiles`; the AP cost sites; a weapon's second scaling
skill (`phys.also_scales`).

Needs a new primitive (each to be checked against `docs/ENGINE-HOOKS.md` first):

1. **Burning ground on tiles.** The Wall of Fire is `op: narrator` today and the data zone kinds hold only `sanctuary`
   (`magic.ts` `DATA_ZONE_KINDS`). H3 heavy.
2. **A line hit for a gun:** Through and Through (`blackpoint_700`, `op: narrator`). H5. (The core lance, which would have
   shared it, is out of this pack; build it general so the advanced-class weapon can reuse it.)
3. **Spin Up** (the first full auto of a fight costs more): `op: narrator` today. H4 base and heavy.
4. **A dart carrying a dose** (a consumable riding an attack). H8 light.
5. **A skill waiving a weapon's restriction** (unbraced at Raw Power 5; unemplaced penalty waived): check whether the
   predicates can already say it. H4 heavy, H5 light.
6. **A weapon number read from a skill** (radius, AP, multiplier, push, range, by skill points): every second skill here
   needs it; it is the same piece the gun forms (file 06) need: build it once, for both.
7. **Single use** (the throwaway tube is dropped after firing): grenades carry `consumable`; check whether a gun can use
   it. H2 light.
8. Check whether `cone_3` (the flamer's cone) is run by the engine for a gun today or only read by the Narrator. H3.
9. **Prone only** (the wall gun fires only from prone): check whether `braced_bonus` or a requirement predicate covers it.
   H5 heavy.

---

## 3. Weird weapons: each a one-off unique or dropped (R4)

1. **Harpoon gun:** a line that pulls the target to you, or you to a wall (the `displace` op already pulls).
   **One-off unique.**
2. **Net or bola launcher:** a ranged restraint, a Grapple at range. **One-off unique.**
3. **Concussion projector:** a cone of sound that pushes and Dazes and does no damage. **Dropped** (forced movement is the
   power gauntlets' signature and Slam/Launch already push).
4. **Turret pack:** a gun you set down that fires by itself. **Dropped** (the Rigger's Scrap Turret Figment owns the
   deployed gun).
5. **Acid sprayer:** armour that corrodes over turns instead of breaking at once. **One-off unique.**
6. **Returning blade:** a thrown ring blade that comes back to the hand if it misses. **One-off unique.**

The four uniques get their concepts and prompts with the other uniques (file 08, section D) when they are designed; none is
painted from this sheet.

---

## 4. Later: advanced-class weapons (out of this pack, R4)

The core rifle and the censer gun are advanced-class weapons (tier 1, with three upgrade tiers each, as ruled 17 Nov). The
two families and four forms below were drafted for this pack and are kept for the advanced classes; nothing here is
painted now.

### Core weapons (Science Team: cyan in the core window only)

**Signature:** mana as a munition: Elemental damage that ignores armour and feeds the mana meter on a hit, and charge spent
for a big shot (Overcharge, `op: narrator` today: a primitive to build then).

| Form | Id | One line | Second skill (R5) |
| --- | --- | --- | --- |
| Light | `science_core_pistol` | A one-hand core pistol, silent (no report, no flash), short range, few charges. | **Ingenuity**: a hit from Hidden leaves you Hidden (from Ingenuity 5) |
| Base | `core_rifle` | 10 charge, Overcharge for 3. | none (Dexterity only) |
| Heavy | `science_core_lance` | A two-hand beam projector with a cooling fin stack: the shot is a line, not a point (the line hit, section 2 item 2). | **Brain Power**: Overcharge's cost (1 charge less from Brain Power 5) |

Prompt drafts (for when they are commissioned):

- `weapon-science_core_pistol.png`, attach `art/icons/gear/weapon-core_rifle.png`, `art/icons/weapons/core_rifle.svg`:
  "No report, no flash: a one-hand pistol that fires from a mana core. A smooth straight-lined slab body, a small hexagonal
  core window on the side, a fine barrel ending in a flat emitter face with no muzzle hole, glowing seams along the slide.
  Pale grey ceramic and dark steel; Mind cyan #4FC8DF in the core window and seams only. At 32 px: against the
  spellslinger's pistol, pale ceramic and a hex window, no magazine."
- `weapon-science_core_lance.png`, same attachments: "The shot is a line, not a point: a two-hand beam projector with a
  cooling fin stack. A long straight emitter rod with three hexagonal core windows in a row along the body, a stack of
  flat cooling fins around the rear half, a squared shoulder brace. Pale grey ceramic, dark steel fins; Mind cyan #4FC8DF
  in the windows only, no beam drawn. At 32 px: against the core rifle, longer, a row of three windows and a fin stack."

### Censer guns, the faith-fed arms (Lumeri Church: ivory, brass and gold)

**Signature:** a prayer at range: the shell carries a Blessing you hold to where it lands and the tiles next to it
(Blessed Shell, `op: narrator` today: a primitive to build then).

| Form | Id | One line | Second skill (R5) |
| --- | --- | --- | --- |
| Light | `lumeri_thurible_pistol` | A one-hand pistol with a small swinging thurible under the barrel: carries a Whisper, to its tile only. | **Faith**: which prayer it can carry (a Hymn from Faith 5) |
| Base | `lumeri_censer_gun` | Requires Faith 3 to carry; damage scales on Dexterity only. | none (Dexterity only) |
| Heavy | `lumeri_reliquary_mortar` | A squat bell-mouthed mortar that lobs a blessed shell over cover, radius 2. | none (was Conscience, not an alpha: removed by R5) |

Prompt drafts:

- `weapon-lumeri_thurible_pistol.png`, attach `art/icons/gear/weapon-lumeri_censer_gun.png`,
  `art/icons/weapons/lumeri_censer_gun.svg`: "A small prayer, fired: a one-hand pistol with a little thurible hung under
  the barrel on a short chain. A short barrel with a spire front sight, a small brass thurible with lancet windows
  swinging beneath on a chain, an ivory grip. Ivory-painted steel, brass thurible, gold; Lumeri gold #F2C46A, no smoke.
  At 32 px: against the votive torch, a hanging thurible on a chain, a barrel, no flask."
- `weapon-lumeri_reliquary_mortar.png`, same attachments: "A blessing sent over the wall: a squat bell-mouthed mortar that
  lobs a blessed shell. A short wide barrel flared like a bell, steeply raised, a reliquary chamber with lancet windows at
  its base, two carry handles and a round baseplate. Ivory-painted bronze, gold bands, brass reliquary; Lumeri gold
  #F2C46A, no smoke. At 32 px: against the thumper, a raised bell mouth and a round baseplate, ivory not black."

The other mana arms (`spellslinger_pistol`, `evoker_blade`, `emanator_gauntlet`, `emanator_katana`, `bot_thread_banner`,
`grand_staff`) are tier 1 of the advanced-class weapons too (`art/briefs/ART-REQUESTS-2026-11-19.md` section 4.2).

## Final pass, 19 Nov 2026 (what changed in the artist file)

- **Wall gun (`blackpoint_wall_gun`):** the field-fitted armoured gun shield was taken out. It changed the outline of a
  Pattern entry, which the pattern clause forbids. The entry is now the long semi-automatic anti-tank rifle pattern as it
  is, with a slotted muzzle brake and a tape wrap on the carrying handle as the maker's touch. If a shielded wall gun is
  wanted, it is a one-off unique, not this form.
- **Twin rotary (`hellraiser_twin_rotary`):** no longer marked Pattern. The twin carried mount, crossbar and backpack feed
  are invented; each of its guns is drawn like the family's rotary gun.
- **Snub launcher:** now describes one pattern (the break-open 40 mm launcher with the pistol grip, the ladder leaf sight
  and the collapsing two-rod stock).
- **Blackpoint carbine:** now the maker's bolt-action bullpup pattern with a five-round magazine behind the grip, a bipod,
  and the same arrowhead double-chamber brake as the long Blackpoint (file 10, 1.9). The design's "one round" stays a
  game number; the art draws the pattern's own magazine.
- **The style block** is fenced and no longer says "three-quarter view" or "everything is invented" (the pose is each
  entry's; a Pattern entry's silhouette follows its pattern). One frame rule for the pack: inside the central 90%, at
  least 50 px of margin.
- The intake sentence was removed; the order note (paint the four file-10 repaints first) was added.
