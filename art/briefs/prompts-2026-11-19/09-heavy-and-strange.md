# GPT prompts, 19 Nov 2026, file 09: the heavy and strange weapons (PROPOSED families and their new forms)

For the artist, for GPT, and first for Leon. Leon asked where the grenade launchers and rocket launchers are. The Items 2.0
plan (`art/briefs/ART-REQUESTS-2026-11-19.md` section 4.3) gives melee 12 families and guns 12 maker lines of three forms,
but leaves the heavy and strange weapons as nine one-offs with no forms (section 4.2: `smetanita_thumper`, `breacher_tube`,
`purifier_flamer`, `hellraiser_rotary`, `blackpoint_700`, `ork_rip_saw`, `hellraiser_servo_fist`, `throwing_knives`,
`afterword`), and `core_rifle` and `lumeri_censer_gun` sit outside every family. This file fills that gap.

**Everything below is PROPOSED.** Leon has not ruled any family, form, name, id or second skill here. Every number a form
mentions is a sketch of what it does, not a value for `data/`: nothing in this file goes into data until Leon rules it and
the spec is changed first. No picture here should be painted before question 1 is answered (section 4.6 of the art
requests: a renamed or merged form wastes its painting and its grade set).

**Rulings this file follows (Leon, 19 Nov 2026):** weapon families must feel different; a family has three forms; every gun
line has a **base form that scales on Dexterity only**, and its other two forms take a **second skill where it applies**
(Dexterity always rolls the shot; the second skill feeds the signature); all five grades are painted for every graded item
(scheme S1); weapons are invented, never real models; in-world names only.

---

## 1. The families sheet (PROPOSED)

Read from `data/weapons.json` today: all seven guns below roll and scale on Dexterity (`skill: dexterity`, `phys.hits_with`),
so each existing one is already the Dexterity-only base of its family. The two powered melee weapons (`ork_rip_saw`,
`hellraiser_servo_fist`) roll **Raw Power** today, not Dexterity: their bases are "one skill only" in the same spirit
(question 3). `afterword` is the first **unique** (section 4.5: uniques have no forms) and stays out of every family.
`hellraiser_lmg` is already the long form of the Hellraiser line (G7), so the belt-fed family below is built round the
rotary and does not repeat the LMG.

"Second skill" says what the skill feeds, always the family's signature, never the hit roll. Heavies are the natural home of
**Raw Power**: in every family that has a heavy form, Raw Power feeds the weight (handling, reload, firing unbraced, the
size of what it leaves behind).

### H1 Launchers (Smetanita Conjunction: lacquer black and brass)

**Signature:** the shot goes over cover in an arc and lands on a tile: a blast that hits everyone in it and gives Pressure,
no roll (the Lob technique, `phys.props` `blast`, `arc`).

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`smetanita_snub_launcher`* | A one-hand 40 mm break-open pistol: one shot, radius 1, short range; a thumper that fits a coat. | **Intimidation**: the blast's Pressure (+1 at Intimidation 4) |
| Base | `smetanita_thumper` | The thumper as it is: six loose rounds, radius 2. | none (Dexterity only) |
| Heavy | *`smetanita_drum_launcher`* | A six-chamber revolving drum launcher on a shoulder stock: the whole cylinder ready, no loose reloads between shots. | **Raw Power**: Lob's AP (3 to 2 from Raw Power 5) |

The underslung launcher (`mod_underslung`, `built: false`) fires the same 40 mm round and should lend Lob when it is built;
it is a mod, not a form, and its painting exists (`art/icons/gear/mod-underslung.png`).

### H2 Rocket tubes (Thousand World Legion: anonymous olive-grey)

**Signature:** breaks what it hits: triple damage to cover, walls and shields, plus a splash (`cover_damage_mult` 3,
`splash_damage`, `area_radius_1`).

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`legion_throwaway_tube`* | A folded single-use tube: fire it once and drop it; light enough to carry two beside a rifle. | **Ingenuity**: a shaped charge, the cover multiplier (3 to 4 from Ingenuity 5) |
| Base | `breacher_tube` | The breacher tube as it is: one rocket, reload 3 AP. | none (Dexterity only) |
| Heavy | *`legion_siege_tube`* | A long tube with a loading cradle and a blast shield: a bigger rocket, radius 2, for doors that are buildings. | **Raw Power**: reload AP (3 to 2 from Raw Power 5) |

### H3 Flamers (Lumeri Church: ivory and gold)

**Signature:** burning ground: a cone that ignores half cover and sets targets Burning, and a line of fire that stays on
the tiles (Wall of Fire).

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`lumeri_votive_torch`* | A one-hand pistol flamer with a hand-held fuel flask: a short cone, no wall. | **Intimidation**: a Burning target gains 1 Pressure each turn it burns (from Intimidation 4) |
| Base | `purifier_flamer` | The purifier as it is: a 3-tile cone, the Wall of Fire for 3 AP. | none (Dexterity only) |
| Heavy | *`lumeri_cathedral_burner`* | A two-tank backpack burner with a long lance nozzle: a longer wall that lasts longer. | **Raw Power**: the wall's length (+1 tile at Raw Power 3, 6 and 9) |

### H4 Rotary and belt-fed guns (Hellraiser Divisions: oxide red)

**Signature:** suppression: a stream of fire that pins an area, Pressure on everyone near the target, and holds until your
next turn (Suppress with the `auto` and `heavy` lines), at the price of a spin-up and a penalty unless emplaced.

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`hellraiser_spinner`* | A three-barrel hip rotary with a short belt box: fired standing, no emplacement penalty, less range. | **Intimidation**: Suppress's Pressure (+1 at Intimidation 4) |
| Base | `hellraiser_rotary` | The rotary as it is: six barrels, 200 rounds, Spin Up. | none (Dexterity only) |
| Heavy | *`hellraiser_twin_rotary`* | Two barrel clusters fed from a backpack belt: the heaviest gun a person carries. | **Raw Power**: fires without the unemplaced penalty from Raw Power 5 |

### H5 Anti-materiel rifles (Frontier mercenaries: no accent, grim steel)

**Signature:** the shot goes through: it ignores armour, carries on to the next target in line and breaks the half cover
it crosses (Through and Through), at the price of bracing or lying prone.

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`blackpoint_carbine`* | A cut-down .700 with a short barrel and a recoil cage: one round, half the range, braced on anything. | **Raw Power**: fire it unbraced from Raw Power 5 |
| Base | `blackpoint_700` | The Blackpoint as it is: three rounds, 40 tiles, braced or prone. | none (Dexterity only) |
| Heavy | *`blackpoint_wall_gun`* | A prone-only .700 with a five-round box and a front shield plate: the hit goes through full cover as well. | **Analysis**: one more target in the line (at Analysis 5) |

### H6 Core weapons (Science Team: cyan in the core window only)

**Signature:** mana as a munition: Elemental damage that ignores armour and feeds the mana meter on a hit, and charge spent
for a big shot (Overcharge).

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`science_core_pistol`* | A one-hand core pistol, silent (no report, no flash), short range, few charges. | **Ingenuity**: a hit from Hidden leaves you Hidden (from Ingenuity 5) |
| Base | `core_rifle` | The core rifle as it is: 10 charge, Overcharge for 3. | none (Dexterity only) |
| Heavy | *`science_core_lance`* | A two-hand beam projector with a cooling fin stack: the shot is a line, not a point. | **Brain Power**: Overcharge's cost (1 charge less from Brain Power 5) |

### H7 Censer guns, the faith-fed arms (Lumeri Church: ivory, brass and gold)

**Signature:** a prayer at range: the shell carries a Blessing you hold to where it lands and the tiles next to it.

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`lumeri_thurible_pistol`* | A one-hand pistol with a small swinging thurible under the barrel: carries a Whisper, to its tile only. | **Faith**: which prayer it can carry (a Hymn from Faith 5) |
| Base | `lumeri_censer_gun` | The censer gun as it is (it requires Faith 3 to carry; its damage scales on Dexterity only). | none (Dexterity only) |
| Heavy | *`lumeri_reliquary_mortar`* | A squat bell-mouthed mortar that lobs a blessed shell over cover, radius 2. | **Conscience**: allies in the radius also gain a small shield (scaled by Conscience) |

The other mana arms (`spellslinger_pistol`, `evoker_blade`, `emanator_gauntlet`, `emanator_katana`, `bot_thread_banner`,
`grand_staff`) stay where section 4.2 puts them: tier 1 of the advanced-class weapons. See question 2 for the core rifle and
the censer gun.

### H8 Powered blades (Orks: rust and dirty ochre)

**Signature:** a running blade that saws through armour and leaves wounds open (armour ignore, Bleeding on a hit).

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`ork_snarl_knife`* | A one-hand chain knife with a pull-cord engine on the guard; rolls **Dexterity** (the melee light form). | **Raw Power**: armour ignored (5 to 8 from Raw Power 5) |
| Base | `ork_rip_saw` | The rip-saw as it is; rolls **Raw Power** only. | none (Raw Power only) |
| Heavy | *`ork_wreck_saw`* | A two-hand circular saw on a long engine body: breaks plates and cover as well as men. | **Guts**: armour broken on a hit (+1 per 3 Guts) |

### H9 Power gauntlets (Hellraiser Divisions: oxide red)

**Signature:** a fist that moves people: a hit pushes the target away (forced movement), into walls and friends.

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`hellraiser_piston_knuckles`* | A knuckle-and-wrist piston, no gauntlet: quick jabs, a 1-tile push; rolls **Dexterity**. | **Raw Power**: push (+1 tile from Raw Power 5) |
| Base | `hellraiser_servo_fist` | The servo-fist as it is: a 2-tile push; rolls **Raw Power** only. | none (Raw Power only) |
| Heavy | *`hellraiser_door_knocker`* | A forearm-length pneumatic ram gauntlet: a 3-tile push, and triple damage to cover and doors. | **Intimidation**: a target pushed into something gains Pressure (+1 at Intimidation 4) |

### H10 Thrown weapons (Frontier: no accent)

**Signature:** a ranged attack with no ammunition and no noise, at two targets at once (Flurry's `thrown` line); the
weapons land in the piles on the targets' tiles.

| Form | Id | One line | Second skill (what it feeds) |
| --- | --- | --- | --- |
| Light | *`throwing_darts`* | A roll of eight needle darts: tiny damage, longer reach, each one can carry a dose. | **Ingenuity**: a dart carries a Toxin vial's dose (from Ingenuity 3) |
| Base | `throwing_knives` | The throwing knives as they are: four, Fan of Knives. | none (Dexterity only) |
| Heavy | *`throwing_javelins`* | Three short iron javelins in a back quiver: heavy hits that stagger. | **Raw Power**: range (+2 tiles from Raw Power 5) and a hit costs the target 1 AP |

### Summary

| Family | Base | Two new forms | Signature | Second skills |
| --- | --- | --- | --- | --- |
| H1 Launchers | `smetanita_thumper` | snub launcher / drum launcher | arc over cover, blast, Pressure | Intimidation / Raw Power |
| H2 Rocket tubes | `breacher_tube` | throwaway tube / siege tube | breaks cover and walls, splash | Ingenuity / Raw Power |
| H3 Flamers | `purifier_flamer` | votive torch / cathedral burner | burning ground, ignores half cover | Intimidation / Raw Power |
| H4 Rotary | `hellraiser_rotary` | spinner / twin rotary | area suppression | Intimidation / Raw Power |
| H5 Anti-materiel | `blackpoint_700` | carbine / wall gun | through armour, through the line, through cover | Raw Power / Analysis |
| H6 Core | `core_rifle` | core pistol / core lance | Elemental, ignores armour, Overcharge | Ingenuity / Brain Power |
| H7 Censer | `lumeri_censer_gun` | thurible pistol / reliquary mortar | a prayer carried to tiles | Faith / Conscience |
| H8 Powered blades | `ork_rip_saw` | snarl knife / wreck saw | armour ignore, Bleeding, plate break | Raw Power / Guts |
| H9 Power gauntlets | `hellraiser_servo_fist` | piston knuckles / door-knocker | forced movement | Raw Power / Intimidation |
| H10 Thrown | `throwing_knives` | darts / javelins | silent, no ammo, two targets | Ingenuity / Raw Power |

**10 families, 30 forms: 10 exist and are painted, 20 new.**

### What exists in the engine and what would be new (honest)

Numbers on things that exist (from `docs/ENGINE-HOOKS.md` and `data/techniques.json`): the blast radius and `blast_landed`;
Lob (arc over full cover, blast with Pressure); Pressure itself; Suppress and Brace with their `auto` and `heavy` lines;
`cover_damage_mult`; `on_hit` (push, bleed, prone, armour_break, ap_loss); `applies_burning` on the units a blast hits;
`armor_ignore_N`; `braced_bonus`; Flurry's `thrown` line; the `silent` property; `push_tiles`; the AP cost sites; a
weapon's second scaling skill (`phys.also_scales`, on the servo-fist today).

Would need rules that do not exist yet (each a "Needs a new primitive" item for the lead, none to be built on a builder's
word):

1. **Burning ground on tiles.** The Wall of Fire is `op: narrator` today and the data zone kinds hold only `sanctuary`
   (`magic.ts` `DATA_ZONE_KINDS`). H3's heavy form rests on it.
2. **A line hit for a gun** (one primitive for both): Through and Through (`blackpoint_700`, `op: narrator`) and the core
   lance's beam. H5 and H6.
3. **Spin Up** (the first full auto of a fight costs more): `op: narrator` today. H4.
4. **Overcharge** (spend charge for one shot): `op: narrator` today. H6.
5. **Blessed Shell** (a held prayer carried to the tiles a shot hits): `op: narrator` today. H7, all three forms.
6. **A dart carrying a dose** (a consumable riding an attack). H10 light.
7. **A skill waiving a weapon's restriction** (unbraced at Raw Power 5; unemplaced penalty waived): to verify whether the
   predicates can say it. H4 and H5.
8. **A weapon number read from a skill** (radius, Pressure, multiplier, push, by skill points): every second skill in
   this file needs it; it is the same piece the gun forms need, so it should be built once, for both.
9. **Single use** (the throwaway tube is dropped after firing): grenades already carry `consumable`; to verify whether a
   gun can use it. H2 light.
10. To verify: whether `cone_3` (the flamer's cone) is run by the engine for a gun today or read only by the Narrator.

### Weird weapons the game has no example of at all (ideas for Leon, not proposed forms)

1. **Harpoon gun:** a line that pulls the target to you, or you to a wall (the `displace` op already pulls).
2. **Net or bola launcher:** a ranged restraint, a Grapple at range.
3. **Concussion projector:** a cone of sound that pushes and Dazes and does no damage.
4. **Turret pack:** a gun you set down that fires by itself (a deployed weapon object; nothing like it exists).
5. **Acid sprayer:** armour that corrodes over turns instead of breaking at once.
6. **Returning blade:** a thrown ring blade that comes back to the hand if it misses.

---

## 2. The prompts (20, one per PROPOSED new form)

**How to use.** One image a prompt. Paste **the style block** (`art/briefs/GPT-PROMPTS-2026-11-13-gear.md` section 1),
then **the family paragraph of the kind named** (same file, section 2: "Heavy weapons and launchers", "Pistols and
revolvers", "Heavy blades, blunt weapons and polearms", "Light blades and tools", "Unarmed and natural weapons" or "Mana
arms"), then the numbered line below. **Attach** the family's existing painting named in each line (the same faction's
shapes, materials and accent; the new form must sit beside it as a sibling) and that painting's line icon. Each prompt
draws the family's signature into the silhouette. Save as the file name given in `art/icons/gear/`. Every delivery is a
review candidate until Leon approves it; nothing here is painted before question 1 is answered.

**Family rule for all ten families:** the light form, the base and the heavy form are the same maker's work: same accent,
same materials, same wear; they must differ at 32 px by gross shape, never by colour.

### H1 Launchers

**H1a. `weapon-smetanita_snub_launcher.png`** | Snub launcher (PROPOSED) | Smetanita Conjunction | family paragraph: Pistols and revolvers
> **Attach:** `art/icons/gear/weapon-smetanita_thumper.png`, `art/icons/weapons/smetanita_thumper.svg`.
> **Subject:** A thumper that fits in a coat: a one-hand break-open 40 mm grenade pistol, one shot. **Silhouette feature:** a very fat short barrel far too big for the pistol grip under it, a break-action hinge open a crack, a folding ladder sight on top for the arc. **Materials and accent:** lacquered black steel, brass hinge pin and brass-capped grip; accent: brass and gold. **At 32 px:** Against every pistol: the barrel is as wide as the grip is long.

**H1b. `weapon-smetanita_drum_launcher.png`** | Drum launcher (PROPOSED) | Smetanita Conjunction | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-smetanita_thumper.png`, `art/icons/weapons/smetanita_thumper.svg`.
> **Subject:** The whole argument at once: a six-chamber revolving grenade launcher on a shoulder stock. **Silhouette feature:** a huge revolving cylinder of six fat chambers in front of the grip, a short stubby barrel, a tall ladder sight raised for the arc, a padded lacquer stock. **Materials and accent:** lacquered black steel, brass chamber rims and spring housing; accent: brass and gold. **At 32 px:** Against the thumper and the Hellraiser rotary: one fat barrel and a round cylinder of chambers behind it, no ring of barrels.

### H2 Rocket tubes

**H2a. `weapon-legion_throwaway_tube.png`** | Throwaway tube (PROPOSED) | Thousand World Legion | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-breacher_tube.png`, `art/icons/weapons/breacher_tube.svg`.
> **Subject:** Fire it, drop it, keep walking: a slim single-use rocket tube, extended for firing. **Silhouette feature:** a thin telescoped tube in two sections (the join visible), end caps hanging on short straps, a flip-up frame sight and a small trigger box; no shoulder pad. **Materials and accent:** cheap olive-drab painted tube, mass-produced, stencil-free; accent: none, a single pale stripe near the muzzle (the family's). **At 32 px:** Against the breacher tube: thinner, two-section, end caps dangling.

**H2b. `weapon-legion_siege_tube.png`** | Siege tube (PROPOSED) | Thousand World Legion | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-breacher_tube.png`, `art/icons/weapons/breacher_tube.svg`.
> **Subject:** For doors that are buildings: a long, wide rocket tube with a loading cradle and a blast shield. **Silhouette feature:** a very wide tube with a fat warhead nose showing at the muzzle, a flat square blast shield plate near the front grip, a loading cradle and a flared venturi at the rear. **Materials and accent:** olive-drab, scorched black at the rear flare; accent: none, the pale stripe doubled. **At 32 px:** Against the breacher tube: wider, with a square shield plate and a warhead nose.

### H3 Flamers

**H3a. `weapon-lumeri_votive_torch.png`** | Votive torch (PROPOSED) | Lumeri Church | family paragraph: Pistols and revolvers
> **Attach:** `art/icons/gear/weapon-purifier_flamer.png`, `art/icons/weapons/purifier_flamer.svg`.
> **Subject:** A pistol-sized flamer for one hand: a small lancet-windowed nozzle fed by a flask clipped under the grip. **Silhouette feature:** a short brass nozzle shaped like a votive lamp, a round fuel flask under the frame, a coiled feed line, a small contained pilot flame at the tip. **Materials and accent:** ivory-painted steel, gold bands, brass nozzle; accent: Lumeri gold #F2C46A, the pilot flame small and contained. **At 32 px:** Against every pistol: a round flask under the grip and a lamp nozzle, no barrel.

**H3b. `weapon-lumeri_cathedral_burner.png`** | Cathedral burner (PROPOSED) | Lumeri Church | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-purifier_flamer.png`, `art/icons/weapons/purifier_flamer.svg`.
> **Subject:** The wall of fire, made into architecture: a two-tank backpack burner with a long lance nozzle. **Silhouette feature:** two tall tanks shaped like twin spires side by side with lancet arches, heavy hoses to a long straight lance with a censer-shaped head, a pilot flame at the tip. **Materials and accent:** ivory-painted steel, gold banding, brass head; accent: Lumeri gold #F2C46A. Draw the tanks and lance together as one object (the tank pack upright behind, the lance diagonal in front). **At 32 px:** Against the purifier: two spire tanks and a much longer lance.

### H4 Rotary and belt-fed guns

**H4a. `weapon-hellraiser_spinner.png`** | Spinner (PROPOSED) | Hellraiser Divisions | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-hellraiser_rotary.png`, `art/icons/weapons/hellraiser_rotary.svg`.
> **Subject:** A rotary you fire from the hip: three short barrels in a ring, a carry handle and a short belt box. **Silhouette feature:** a ring of three stubby barrels with a brake collar, a top carry handle, a front hand grip, a small squared belt box hanging under it; no bipod. **Materials and accent:** dark steel, scorched barrel tips; accent: oxide red #CC2435 on the box. **At 32 px:** Against the rotary: half the length, three barrels, a handle on top.

**H4b. `weapon-hellraiser_twin_rotary.png`** | Twin rotary (PROPOSED) | Hellraiser Divisions | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-hellraiser_rotary.png`, `art/icons/weapons/hellraiser_rotary.svg`.
> **Subject:** The heaviest gun a person carries: two rotary clusters side by side, fed by a belt chute from a backpack drum. **Silhouette feature:** two rings of six barrels joined by one slab housing, an armoured belt chute curving away to a large drum, trench spikes on the housing. **Materials and accent:** heavy dark steel and black, scorched tips; accent: oxide red #CC2435. **At 32 px:** Against the rotary: two barrel rings, not one, and a long chute.

### H5 Anti-materiel rifles

**H5a. `weapon-blackpoint_carbine.png`** | Blackpoint carbine (PROPOSED) | Frontier mercenaries | family paragraph: Rifles and long rifles
> **Attach:** `art/icons/gear/weapon-blackpoint_700.png`, `art/icons/weapons/blackpoint_700.svg`.
> **Subject:** The .700 cut down to be carried: one round, a short thick barrel and a recoil cage. **Silhouette feature:** a short barrel as thick as the Blackpoint's, the same huge muzzle brake, an open recoil-spring cage over the stock, a single-shot bolt; no bipod. **Materials and accent:** dark steel, scorched brake; accent: none. **At 32 px:** Against the Blackpoint: half the length, the same brake, a cage at the back.

**H5b. `weapon-blackpoint_wall_gun.png`** | Wall gun (PROPOSED) | Frontier mercenaries | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-blackpoint_700.png`, `art/icons/weapons/blackpoint_700.svg`.
> **Subject:** A gun that shoots through the wall and the man behind it: a prone-only .700 with a five-round box and a front shield plate. **Silhouette feature:** a very long thick barrel through a square shield plate with a sight slot, a deep box magazine, a heavy bipod and a rear monopod spike. **Materials and accent:** dark steel, a dented shield plate; accent: none, grim and massive. **At 32 px:** Against the Blackpoint: a square plate on the barrel and a deep box.

### H6 Core weapons

**H6a. `weapon-science_core_pistol.png`** | Core pistol (PROPOSED) | Science Team | family paragraph: Mana arms (pose of the pistols)
> **Attach:** `art/icons/gear/weapon-core_rifle.png`, `art/icons/weapons/core_rifle.svg`.
> **Subject:** No report, no flash: a one-hand pistol that fires from a mana core. **Silhouette feature:** a smooth straight-lined slab body, a small hexagonal core window on the side, a fine barrel ending in a flat emitter face with no muzzle hole, glowing seams along the slide. **Materials and accent:** pale grey ceramic and dark steel; accent: Mind cyan #4FC8DF in the core window and seams only. **At 32 px:** Against the spellslinger's pistol: pale ceramic and a hex window, no magazine.

**H6b. `weapon-science_core_lance.png`** | Core lance (PROPOSED) | Science Team | family paragraph: Mana arms (pose of the heavy weapons)
> **Attach:** `art/icons/gear/weapon-core_rifle.png`, `art/icons/weapons/core_rifle.svg`.
> **Subject:** The shot is a line, not a point: a two-hand beam projector with a cooling fin stack. **Silhouette feature:** a long straight emitter rod with three hexagonal core windows in a row along the body, a stack of flat cooling fins around the rear half, a squared shoulder brace. **Materials and accent:** pale grey ceramic, dark steel fins; accent: Mind cyan #4FC8DF in the windows only, no beam drawn. **At 32 px:** Against the core rifle: longer, a row of three windows and a fin stack.

### H7 Censer guns

**H7a. `weapon-lumeri_thurible_pistol.png`** | Thurible pistol (PROPOSED) | Lumeri Church | family paragraph: Mana arms (pose of the pistols)
> **Attach:** `art/icons/gear/weapon-lumeri_censer_gun.png`, `art/icons/weapons/lumeri_censer_gun.svg`.
> **Subject:** A small prayer, fired: a one-hand pistol with a little thurible hung under the barrel on a short chain. **Silhouette feature:** a short barrel with a spire front sight, a small brass thurible with lancet windows swinging beneath on a chain, an ivory grip. **Materials and accent:** ivory-painted steel, brass thurible, gold; accent: Lumeri gold #F2C46A, no smoke. **At 32 px:** Against the votive torch: a hanging thurible on a chain, a barrel, no flask.

**H7b. `weapon-lumeri_reliquary_mortar.png`** | Reliquary mortar (PROPOSED) | Lumeri Church | family paragraph: Heavy weapons and launchers
> **Attach:** `art/icons/gear/weapon-lumeri_censer_gun.png`, `art/icons/weapons/lumeri_censer_gun.svg`.
> **Subject:** A blessing sent over the wall: a squat bell-mouthed mortar that lobs a blessed shell. **Silhouette feature:** a short wide barrel flared like a bell, steeply raised, a reliquary chamber with lancet windows at its base, two carry handles and a round baseplate. **Materials and accent:** ivory-painted bronze, gold bands, brass reliquary; accent: Lumeri gold #F2C46A, no smoke. **At 32 px:** Against the thumper: a raised bell mouth and a round baseplate, ivory not black.

### H8 Powered blades

**H8a. `weapon-ork_snarl_knife.png`** | Snarl knife (PROPOSED) | Orks | family paragraph: Light blades and tools
> **Attach:** `art/icons/gear/weapon-ork_rip_saw.png`, `art/icons/weapons/ork_rip_saw.svg`.
> **Subject:** The rip-saw's little brother, for one hand: a short chain-toothed knife with a pull-cord engine on the guard. **Silhouette feature:** a short bar of chain teeth, a fist-sized welded engine at the guard with a pull-cord ring and a stub exhaust, a nail-studded grip. **Materials and accent:** rust, scorched steel, welds; accent: dirty ochre daubs, soot. **At 32 px:** Against the combat knife: chain teeth and an engine lump at the guard.

**H8b. `weapon-ork_wreck_saw.png`** | Wreck saw (PROPOSED) | Orks | family paragraph: Heavy blades, blunt weapons and polearms
> **Attach:** `art/icons/gear/weapon-ork_rip_saw.png`, `art/icons/weapons/ork_rip_saw.svg`.
> **Subject:** For plates, cover and the man inside them: a two-hand circular saw on a long engine body. **Silhouette feature:** a huge round toothed saw disc at the head with a bent guard, a long welded engine body, two exhaust stacks, a crossbar handle. **Materials and accent:** rust, scorched steel, welded plates, nails; accent: dirty ochre daubs, soot black. **At 32 px:** Against the rip-saw: a round disc, not a long bar.

### H9 Power gauntlets

**H9a. `weapon-hellraiser_piston_knuckles.png`** | Piston knuckles (PROPOSED) | Hellraiser Divisions | family paragraph: Unarmed and natural weapons
> **Attach:** `art/icons/gear/weapon-hellraiser_servo_fist.png`, `art/icons/weapons/hellraiser_servo_fist.svg`.
> **Subject:** The servo-fist without the gauntlet: a knuckle bar with a single piston strapped along the wrist. **Silhouette feature:** a slab knuckle bar of four rings, one exposed piston running back to a wrist cuff with a small air bottle, no glove. **Materials and accent:** dark steel, black rubber hose, scuffs; accent: oxide red #CC2435 on the cuff. **At 32 px:** Against the knuckledusters: one long piston behind the bar.

**H9b. `weapon-hellraiser_door_knocker.png`** | Door-knocker (PROPOSED) | Hellraiser Divisions | family paragraph: Unarmed and natural weapons
> **Attach:** `art/icons/gear/weapon-hellraiser_servo_fist.png`, `art/icons/weapons/hellraiser_servo_fist.svg`.
> **Subject:** A mining ram the Hellraisers wear: a forearm-length pneumatic ram gauntlet with a flat striking plate. **Silhouette feature:** a massive flat square ram plate over the knuckles, two thick pistons running the length of the forearm, an air tank at the elbow, trench spikes on the plate's edge. **Materials and accent:** dark steel, dented plate, black hoses; accent: oxide red #CC2435. **At 32 px:** Against the servo-fist: twice as long, a flat square plate in front.

### H10 Thrown weapons

**H10a. `weapon-throwing_darts.png`** | Throwing darts (PROPOSED) | Frontier | family paragraph: Light blades and tools
> **Attach:** `art/icons/gear/weapon-throwing_knives.png`, `art/icons/weapons/throwing_knives.svg`.
> **Subject:** Eight quiet needles: a roll of slim weighted darts, two with a dark coated tip. **Silhouette feature:** a leather roll opened flat with eight needle darts in loops, short stiff flights, two tips darkened. **Materials and accent:** blackened steel, worn leather; accent: none. **At 32 px:** Against the throwing knives: many thin lines in a row, not four blades in a fan.

**H10b. `weapon-throwing_javelins.png`** | Throwing javelins (PROPOSED) | Frontier | family paragraph: Heavy blades, blunt weapons and polearms
> **Attach:** `art/icons/gear/weapon-throwing_knives.png`, `art/icons/weapons/throwing_knives.svg`.
> **Subject:** Heavy and short: three iron javelins in a back quiver. **Silhouette feature:** three short thick shafts with long barbless iron heads, standing in a stiff leather back quiver, the heads fanned. **Materials and accent:** dark iron heads, ash shafts, worn leather; accent: none. **At 32 px:** Against the glaive and the lance: three short shafts in a quiver, not one long pole.

### Count

**20 new base paintings (Standard).** Under Leon's scheme S1 every graded item gets all five grades, so each new form adds
4 grade pictures (Fine, Masterwork, Relic, Celestial) made image-to-image from its approved base: **20 + 80 = 100 new
pictures.** The 10 existing bases: 8 of them are among the 9 graded one-offs already counted in section 4.3's 572; if
question 2 makes `core_rifle` and `lumeri_censer_gun` graded family bases rather than advanced-class weapons, add **8**
grade pictures for them (108 in all). Line icons (Claude's, not the artist's): 20 new.

---

## 3. Questions for Leon (each with a recommendation)

1. **Do the heavy and strange weapons become families of three (10 families, 20 new forms), or stay one-offs?**
   Recommended: families, as tabled; the launcher, rocket, flamer and rotary families first, since they answer the
   question you asked and rest on rules that exist (only the flamer's heavy form waits on burning ground).
2. **The core rifle and the censer gun: graded family bases, or tier 1 of the advanced-class weapons (section 4.2)?**
   Recommended: family bases. Neither is class-locked (they have requirements, Dexterity 3 and Faith 3, not a class), and
   a player meets them in shops; the other six mana arms stay advanced-class weapons.
3. **The gun rule says the base scales on Dexterity only. The rip-saw and the servo-fist roll Raw Power. Is their base
   "Raw Power only", with the light forms rolling Dexterity?** Recommended: yes: the rule for every family becomes "the
   base takes one skill only"; the servo-fist's `also_scales` goes.
4. **Build burning ground and the line hit as engine primitives in the Items 2.0 system release (0.33)?** Recommended:
   yes, both, before any heavy form is commissioned: three existing weapons (`purifier_flamer`, `blackpoint_700`,
   `hellraiser_rotary` via Spin Up) are Narrator-run today, and the heavy forms of H3, H5 and H6 need them.
5. **Any of the six "weird" ideas (harpoon gun, net launcher, concussion projector, turret pack, acid sprayer, returning
   blade) for 0.34?** Recommended: the harpoon gun only (it rides the existing `displace` pull); the rest wait for a
   later content release.
