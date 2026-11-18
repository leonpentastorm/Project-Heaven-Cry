# Scout: Items 2.0 ground truth (sections L, M, N, P of SESSION-TODO-2026-11-16)

Scouted 18 Nov 2026 in worktree E:/phc-wt/rel030 (branch release/0.31, live 0.31.10). Read-only; nothing changed. Facts only; every one carries a file and line, or a data id. Lines are as of this worktree.

1. **Weapon row:** 72 rows in data/weapons.json; one `phys` block carries hits_with / scales_with / also_scales / profile / props / teaches. Per-weapon state (`GearState`: rarity, dur, mods, name, prop) lives on the character (`weaponState`, `offHand`, pack lines); worn armour has NO per-item state (`c.worn` maps slot to id) and body armour is a bare number `c.armourClass`.
2. **Momentum is paid by hand in `physical/core.ts` 994-995 (refund 1008, gate 386-387), not through `effects/cost.ts`. The only technique group that spends the TARGET's Pressure is `take` (flat 2 pips, target must be Pressed), special-cased by `group === 'take'` in core.ts (392, 409, 449, 944, 999, 1024). A Dexterity-rolled melee hit ALREADY lays 1 pip (skills.json dexterity.unlocks.1.effects.3, "pressing_blade", 2 a target a turn) AND still builds Momentum (combat.ts 1587).** `cost.ts` charges only the acting unit or its character (`holderOfRes`); `resPay` writes the resource path directly and skips the `pressure` setter.
3. **Forge** today: 4 rolled stock slots, mod fit / swap / take off (guns and any carried weapon with `mod_slots`), armour class fit (classes 1 to 4 priced; class 5 has no price), grade step (Fine 1500, Masterwork 3500, x0.8 at a Forge), Relic step (6500, stage 3+, 3 properties offered of 7), repair. No reforge, no realign. The one grip mod is `built: false`, so no melee grip slot can be filled.
4. **GEAR tab rig = 12 slots.** Real choices today: head 3 items, head accessory 3, outer torso 5 classes (a number, not an item), inner 2, lower 2, legs 2, hands 2, footwear 2, veil 0 (and it cannot be worn: `WORN_SLOT` in main.js has no veil). Each piece carries one small op; none has a grade, mod, durability or name.
5. **Item cards are drawn in 6 places** (ShopScreen `Card`, rewardCards `Offer`, UpgradeCard, LoadoutScreen `PickCard`/`ShelfCard`, GiveTab rows, main.js `weaponTip`/`itemTip`/`handCard`) fed by one engine source (`gearPreview`, gearpreview.ts). Defense is on STATUS (derived.ts) only; armour is not on STATUS at all.
6. **Variants (0.29):** 20 lines in data/variants.json, expanded at load by `variants.ts`; never rolled (shop, rewards, camp filter them out), so no player can obtain one today. **Art:** every weapon, shield and worn piece has exactly one painting; only `figment_claws`, `figment_edge` (companion weapons) and 2 variant mods lack one. No per-grade pictures exist.

---

## 1. Weapon row schema (data/weapons.json, 72 items)

Counts by category: light_melee 8 (combat_knife, sabre, throwing_knives, hatchet, legion_gladius, kemizuchi_duelling_blade, katana, afterword), heavy_melee 7 (ork_machete, maul, lance, war_axe, adamantile_greatsword, glaive, ork_rip_saw), unarmed 10 (7 usable: fists, knuckledusters, hand_wraps, striking_gloves, iron_mitts, kemizuchi_strikers, hellraiser_servo_fist; 3 `companion_only`: beast_bite, figment_claws, figment_edge), shield 3, mana 8, pistol 4, revolver 2, smg 4, rifle 6, shotgun 4, heavy 6, bow 4 (30 guns and bows), thrown 6. Total 72. Leon's "6 wearable gloves" = the 6 unarmed rows with `variant_mods` (knuckledusters, hand_wraps, striking_gloves, iron_mitts, kemizuchi_strikers, servo_fist). `type` equals `id` on every row.

### 1.1 Every field and who reads it

| field | rows | read by |
|---|---|---|
| id, name, type, text, lore | 72 (text and lore 71) | `data.ts` WEAPON table; `glossary.ts:36`; narrator context |
| category | 72 | `character.ts:703` ONE_HANDED list; `run/shop.ts:82` GEAR_POOL (excludes thrown); `run/progress.ts` upgradeProblem (thrown cannot be upgraded); `run/loadout.ts:46` camp archetypes (with mastery_family); main.js glyphOf |
| damage (number; object within_4 / within_8 for 4 shotguns; the strings "20 + 5*raw_power" and "25 + 6*raw_power" for the 2 bows) | 72 | `combat.ts` unitFromCharacter 541-553 / attackDamage; `gearpreview.ts` |
| damage_type, range_tiles, magazine, heat_limit, modes, recoil, reload, reload_unit, magazine_kg, ammo, accuracy | most | `combat.ts` 541-553, `character.ts` magazineSize / gearNum, `physical/ranged/*` |
| ap_cost {attack, throw, single, aimed, burst, auto} | 72 | `physical/core.ts` apFor / attackApCost; `effects/cost.ts` priced as the weapon-own sites |
| skill | 72 | `combat.ts:545` attack mod = mod(c.skills[w.skill]) + RARITY.acc; `combat.ts:1472 weaponVia` (the roll's `via`) reads `strikeWeapon(att, mode).skill`, NOT phys.hits_with. They agree on every row today (shields: skill durability, hits_with durability) |
| **phys.system** (melee / ranged) | 72 | `physical/data.ts weaponSystem`, `core.ts gate()` (technique system must match) |
| **phys.profile** ("gun" 30, "melee" 21, absent 21: 4 bows, 6 thrown, 8 mana, 3 companion) | 51 | `character.ts:757 weaponProfile` into `effects/output.ts`; rules.json output.profiles: melee k 1.15385 attr 0.05, gun k 1.275 attr 0.0294, absent = profile `weapon` (k 1.5, no slope). Mana melee rows (evoker_blade etc.) have none |
| **phys.props** (quick, precise, auto, spread, loud, silent, heavy, light, edge, point, blunt, hook, reach, thrown, bare, open_hand, shield, follows, drawn, arc, blast) | 72 | `physical/data.ts weaponProps`; `core.ts gate()` (`not_with`), `lineProp`; texts at techniques.json rules.props |
| **phys.hits_with** | 72 | `physical/data.ts hitsWith` to `core.ts:597 techVia` (a technique's via), `core.ts:423` (off-hand skill), `melee/answers.ts:39`, `character.ts:748/760` (damage's skill term), `gearpreview.ts:64` ("Hits with"); `apps/web/src/game/fx/techniqueFx.ts:188` |
| **phys.scales_with** (attribute list; all single) | 72 | `character.ts:743-750 weaponMult` (attribute term of damage), `character.ts:757-765 weaponMultLabel`, `gearpreview.ts:72, 95` |
| **phys.also_scales** (skill list that REPLACES hits_with in the damage skill term only) | 9: fists, knuckledusters, hand_wraps, iron_mitts, servo_fist, emanator_gauntlet, 3 companion rows. All `[raw_power, dexterity]` | `character.ts:748, 760` only. It does not change what the weapon rolls with (all 9 roll with raw_power) and the melee profile has skill slope 0, so it prices nothing today |
| **phys.teaches** (technique id the weapon lends) | 52 | `physical/data.ts weaponTeaches` to `core.ts:325` (lent while held, learned at drill mark I), `core.ts:1038` |
| mastery_family (light_blades, heavy_melee, unarmed, sidearms, smgs, rifles, shotguns, heavy, bows, thrown, mana_arms) | 72 | `game.ts:2445` weaponKills by family; `perks/c.ts:652-659` One Blade (stores `fam`); `run/loadout.ts:46`. It is not the Items 2.0 "family"; weapon_mastery.json is retired (its `rules.retired`; nothing loads it) |
| hands (1H / 2H) | 72 | `character.ts:1393, 1442`; `gear.ts:92`; `physical/core.ts:959`; `run/loadout.ts:247`; `gearpreview.ts:43`. (There is no `two_handed` field in weapons.json; `two_handed_draw_ap` is gear.ts GEAR data.) |
| properties (top level: damage_falloff, armor_ignore_N, polearm, reach_2, area_radius_N, counts_as_evoker...) | 72 | `character.ts thingProps` and per-name sites in combat.ts |
| price_credits | 69 (3 companion rows null) | `credits.ts:51 priceOf` (the one price door; a `built: false` row or `stock: false` returns null) |
| durability | 69 | `character.ts:163 maxDurOf` = durability x RARITY.dur, rounded |
| mod_slots (optic, muzzle, magazine, underbarrel, edge, grip, inscription) | 69 | `character.ts:1519`; `run/progress.ts:222 modWheres` and 524; `run/rewards.ts:205`; `perks/c.ts:266` |
| grants {name, text, effect} | 60 | perk and effect layer (the pistols' Snap Shot is op `narrator`) |
| requires (skill: points) | 10 (longbow, servo_fist, 8 mana rows) | `character.ts requiresWhy` |
| effects | 3 (the 3 shields: defense_bonus, movement_bonus on the riot shield, narrator on the pavise) | `character.ts:174 gearEffects`; `physical/melee/links.ts:54` |
| variant_mods | 10 (the 6 gloves, afterword, buckler, riot_shield, pavise) | `effects/collect.ts`, `effects/hooks.ts heldOfChar`, `character.ts handProps`: modifier items built into the row (`open_hand`, `mod_follow_guard`, `mod_afterword`), held only while in a hand |
| focus (5), explosive (5), tags (7), companion_only (3), built (1: pavise false), adjudication (4: afterword, buckler, riot_shield, pavise), source, hp (pavise 80), splash_damage, fx, cycle_ap, reload_ap, applies, provisional (57) | few | per-name sites |

`weaponMult` (character.ts:746) is the Stat term of the one formula: 1 + profile.attr x (each scales_with attribute - 1) + profile.skill x skill, then `mult_physical` perks. For melee profile.skill is 0.

### 1.2 Every weapon (generated from data/weapons.json)

`dur` durability; `req:` requires; flags are row keys that exist. The Pavise is `built: false` with adjudication narrator: `priceOf` returns null for it, so it cannot be bought, sold or stocked today (its text promises "plant it for 2 AP", unbuilt).

### Melee: light_melee (8)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| combat_knife | 1H | 15 | att2,thr2 | throwable_6_tiles | melee | light,edge,point,thrown | dexterity | agility | coup | light_blades | 60 | 250 | edge,grip |  |
| sabre | 1H | 20 | att2 |  | melee | light,edge | dexterity | agility | riposte | light_blades | 400 | 250 | edge,grip |  |
| throwing_knives | 1H | 12 | att2,thr2 | throwable_6_tiles | melee | light,point,thrown | dexterity | agility | flurry | light_blades | 80 | 250 | edge |  |
| hatchet | 1H | 22 | att2,thr2 | throwable_5_tiles | melee | light,edge,hook,thrown | dexterity | strength | drag | light_blades | 120 | 250 | edge,grip |  |
| legion_gladius | 1H | 19 | att2 |  | melee | light,point,edge | dexterity | agility | parry | light_blades | 300 | 250 | edge,grip |  |
| kemizuchi_duelling_blade | 1H | 24 | att2 |  | melee | light,point | dexterity | agility | lunge | light_blades | 550 | 250 | edge,grip |  |
| katana | 1H | 20 | att2 |  | melee | light,edge | dexterity | agility | draw_cut | light_blades | 500 | 250 | edge,grip |  |
| afterword | 1H | 15 | att2 |  | melee | light,follows | dexterity | agility | - | light_blades | 700 | 160 | - | variant_mods;adjudication |

### Melee: heavy_melee (7)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ork_machete | 1H | 35 | att3 |  | melee | heavy,edge | raw_power | strength | cleave | heavy_melee | 250 | 300 | edge,grip |  |
| maul | 2H | 45 | att3 |  | melee | heavy,blunt | raw_power | strength | break | heavy_melee | 450 | 300 | edge,grip |  |
| lance | 2H | 32 | att3 | polearm | melee | heavy,point,reach | raw_power | strength | charge | heavy_melee | 500 | 300 | edge,grip |  |
| war_axe | 2H | 40 | att3 |  | melee | heavy,edge,hook | raw_power | strength | sunder | heavy_melee | 500 | 300 | edge,grip |  |
| adamantile_greatsword | 2H | 42 | att3 |  | melee | heavy,edge,point | raw_power | strength | sweep | heavy_melee | 900 | 300 | edge,grip |  |
| glaive | 2H | 36 | att3 | polearm,reach_2 | melee | heavy,edge,hook,reach | raw_power | strength | keep_back | heavy_melee | 650 | 300 | edge,grip |  |
| ork_rip_saw | 2H | 38 | att3 | armor_ignore_5 | melee | heavy,edge | raw_power | strength | hamstring | heavy_melee | 1400 | 300 | grip |  |

### Melee: unarmed (gloves, fists, companion natural weapons) (10)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fists | 1H | 10 | att2 |  | melee | light,bare | raw_power | strength +also raw_power,dexterity | bind | unarmed | 40 | 200 | grip |  |
| knuckledusters | 1H | 20 | att2 |  | melee | light,bare,blunt,open_hand | raw_power | strength +also raw_power,dexterity | bash | unarmed | 120 | 200 | - | variant_mods |
| hand_wraps | 1H | 14 | att2 |  | melee | light,bare,open_hand | raw_power | strength +also raw_power,dexterity | bind | unarmed | 30 | 200 | - | variant_mods |
| striking_gloves | 1H | 17 | att2 |  | melee | light,bare,open_hand | dexterity | agility | sidestep | unarmed | 120 | 200 | - | variant_mods |
| iron_mitts | 1H | 25 | att2 |  | melee | light,bare,blunt,open_hand | raw_power | strength +also raw_power,dexterity | throw_down | unarmed | 500 | 200 | - | variant_mods |
| kemizuchi_strikers | 1H | 21 | att2 |  | melee | light,bare,point,open_hand | dexterity | agility | feint | unarmed | 500 | 200 | - | variant_mods |
| hellraiser_servo_fist | 1H | 30 | att2 |  | melee | heavy,bare,blunt,open_hand | raw_power | strength +also raw_power,dexterity | throw_down | unarmed | 1200 | 200 | - | req:raw_power3;variant_mods |
| beast_bite | 1H | 18 | att2 |  | - | light,bare,edge | raw_power | strength +also raw_power,dexterity | - | unarmed | - | - | - | companion_only |
| figment_claws | 1H | 30 | att2 |  | - | light,bare,edge | raw_power | strength +also raw_power,dexterity | - | unarmed | - | - | - | companion_only |
| figment_edge | 1H | 25 | att2 |  | - | light,bare,edge | raw_power | strength +also raw_power,dexterity | - | unarmed | - | - | - | companion_only |

### Shields (category shield) (3)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| buckler | 1H | 15 | att2 |  | melee | shield,follows | durability | endurance | - | unarmed | 200 | 150 | - | variant_mods;adjudication |
| riot_shield | 1H | 20 | att2 |  | melee | shield,follows | durability | endurance | - | unarmed | 700 | 150 | - | variant_mods;adjudication |
| pavise | 1H | 20 | att2 |  | melee | shield,follows | durability | endurance | - | unarmed | 1200 | 150 | - | variant_mods;built;adjudication |

### Mana weapons (category mana) (8)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| core_rifle | 2H | 29 | sin2,aim3 | ignores_armour,mana_meter_on_hit | - | precise | dexterity | agility | - | mana_arms | 2600 | 250 | optic | req:dexterity3 |
| spellslinger_pistol | 1H | 22 | sin2,aim3 |  | - | quick | dexterity | agility | - | mana_arms | 1500 | 250 | optic,magazine,inscription | focus;req:brain_power3 |
| evoker_blade | 1H | 26 | sin2,aim3 | counts_as_evoker | - | light,edge | dexterity | agility | - | mana_arms | 2400 | 250 | edge,grip | focus;req:brain_power3 |
| emanator_gauntlet | 1H | 18 | sin2,aim3 | counts_as_emanator | - | light,bare,blunt | raw_power | strength +also raw_power,dexterity | - | mana_arms | 2200 | 250 | grip | focus;req:will_power3 |
| emanator_katana | 1H | 26 | sin2,aim3 | counts_as_emanator | - | light,edge | dexterity | agility | - | mana_arms | 2400 | 250 | edge,grip | focus;req:will_power3 |
| lumeri_censer_gun | 2H | <=4:30/<=8:18 | sin2,aim3 | damage_falloff | - | spread,loud | dexterity | agility | - | mana_arms | 2000 | 250 | optic | req:faith3 |
| bot_thread_banner | 2H | 24 | sin2,aim3 | reach_2 | - | reach,blunt | dexterity | agility | - | mana_arms | 1800 | 250 | grip | req:empathy3 |
| grand_staff | 2H | 24 | sin2,aim3 | counts_as_evoker | - | heavy,blunt,reach | dexterity | agility | - | mana_arms | 2400 | 250 | grip | focus;req:brain_power3 |

### Guns: pistol, revolver (6)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| service_pistol | 1H | 20 | sin2,aim3 |  | gun | quick | dexterity | agility | snap_shot | sidearms | 250 | 300 | optic,muzzle,magazine |  |
| drifter_revolver | 1H | 28 | sin2,aim3 |  | gun | quick,precise | dexterity | agility | mag_dump | sidearms | 350 | 300 | optic |  |
| decrkm_autopistol | 1H | 17 | sin2,aim3,bur3 |  | gun | quick,auto | dexterity | agility | burst | sidearms | 500 | 300 | optic,muzzle,magazine |  |
| parlour_pistol | 1H | 16 | sin2,aim3 |  | gun | quick,silent | dexterity | agility | crossfire | sidearms | 150 | 300 | - |  |
| magistrate_pistol | 1H | 26 | sin2,aim3 |  | gun | quick,loud | dexterity | agility | stopping_shot | sidearms | 450 | 300 | optic,muzzle,magazine |  |
| frontier_hand_cannon | 1H | 38 | sin2,aim3 |  | gun | loud,precise | dexterity | agility | last_round | sidearms | 800 | 300 | optic |  |

### Guns: smg, rifle (10)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| decrkm_smg | 2H | 19 | sin2,aim3,bur3,aut4 |  | gun | quick,auto | dexterity | agility | rake | smgs | 600 | 300 | optic,muzzle,magazine,underbarrel |  |
| hellraiser_service_rifle | 2H | 30 | sin2,aim3,bur3,aut4 |  | gun | auto,precise | dexterity | agility | suppress | rifles | 900 | 400 | optic,muzzle,magazine,underbarrel |  |
| lever_carbine | 2H | 32 | sin2,aim3 |  | gun | precise,quick | dexterity | agility | walking_fire | rifles | 700 | 400 | optic,muzzle |  |
| long_rifle | 2H | 47 | sin3,aim4 |  | gun | precise,loud | dexterity | agility | bead | rifles | 1400 | 400 | optic,muzzle |  |
| legion_pdw | 1H | 20 | sin2,aim3,bur3,aut4 |  | gun | quick,auto | dexterity | agility | storm | smgs | 750 | 300 | optic,muzzle,magazine |  |
| whisper_smg | 2H | 16 | sin2,aim3,bur3,aut4 | silent | gun | auto,silent | dexterity | agility | spot | smgs | 900 | 300 | optic,magazine |  |
| mandestra_drum_gun | 2H | 19 | sin2,aim3,aut4 |  | gun | auto,loud | dexterity | agility | rake | smgs | 1100 | 300 | optic,underbarrel |  |
| adamantile_battle_rifle | 2H | 30 | sin2,aim3,bur3 |  | gun | precise,loud | dexterity | agility | punch_through | rifles | 1300 | 400 | optic,muzzle,magazine,underbarrel |  |
| ccec_marksman_rifle | 2H | 33 | sin2,aim3 |  | gun | precise | dexterity | agility | called_shot | rifles | 1600 | 400 | optic,muzzle,magazine |  |
| legion_bullpup | 2H | 28 | sin2,aim3,bur3,aut4 |  | gun | auto,quick | dexterity | agility | shift | rifles | 1100 | 400 | optic,muzzle,magazine |  |

### Guns: shotgun, heavy, bow (14)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lumeri_scattergun | 2H | <=4:40/<=8:25 | sin2,aim3 | damage_falloff | gun | spread,loud | dexterity | agility | flush | shotguns | 650 | 300 | optic,underbarrel |  |
| blackpoint_700 | 2H | 66 | sin2,aim3 | armor_ignore_10,requires_braced_or_prone | gun | heavy,precise,loud | dexterity | agility | dead_centre | heavy | 4000 | 500 | optic |  |
| hellraiser_lmg | 2H | 25 | bur3,aut4 | minus2_to_hit_unless_emplaced | gun | heavy,auto | dexterity | agility | brace | heavy | 2500 | 500 | optic |  |
| recurve_bow | 2H | 20 + 5*raw_power | sin2,aim3 | silent,no_heat,quiver | - | drawn,silent,quick | dexterity | agility | pin_down | bows | 300 | 200 | optic |  |
| crossbow | 2H | 55 | sin3,aim3 | silent,no_heat,autoload | - | precise,silent | dexterity | agility | heavy_bolt | bows | 500 | 200 | optic |  |
| coach_gun | 2H | <=4:45/<=8:25 | sin2,aim3 | damage_falloff | gun | spread,loud | dexterity | agility | mag_dump | shotguns | 400 | 300 | - |  |
| sawn_off | 1H | <=4:42/<=8:15 | sin2,aim3 | damage_falloff | gun | spread,quick | dexterity | agility | storm | shotguns | 300 | 300 | - |  |
| brigade_auto_shotgun | 2H | <=4:40/<=8:24 | sin2,aim3,bur3 | damage_falloff | gun | spread,auto | dexterity | agility | burst | shotguns | 1500 | 300 | optic,magazine,underbarrel |  |
| hellraiser_rotary | 2H | 22 | sin2,aim3,aut4 | minus2_to_hit_unless_emplaced | gun | heavy,auto,loud | dexterity | agility | suppress | heavy | 4500 | 500 | optic |  |
| smetanita_thumper | 2H | 40 | sin2,aim3 | area_radius_2 | gun | heavy,blast,arc | dexterity | agility | lob | heavy | 1800 | 500 | optic | explosive |
| breacher_tube | 2H | 110 | sin2,aim3 | area_radius_1 | gun | heavy,blast,loud | dexterity | agility | flush | heavy | 3000 | 500 | optic | explosive |
| purifier_flamer | 2H | 20 | sin2,aim3 | cone_3,applies_burning,ignores_half_cover | gun | heavy,spread | dexterity | agility | - | heavy | 2200 | 500 | - |  |
| longbow | 2H | 25 + 6*raw_power | sin2,aim3 | silent,no_heat,quiver | - | drawn,silent,arc | dexterity | agility | dead_to_rights | bows | 450 | 200 | optic | req:raw_power3 |
| repeating_crossbow | 2H | 22 | sin2,aim3 | silent,no_heat | - | silent,quick | dexterity | agility | burst | bows | 700 | 200 | optic |  |

### Thrown (category thrown) (6)

| id | hands | dmg | AP | properties | phys.profile | phys.props | hits_with | scales_with | teaches | mastery_family | price | dur | mod_slots | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| frag_grenade | 1H | 40 | thr2 | area_radius_2,consumable | - | thrown,blast,arc | dexterity | agility | rout | thrown | 120 | None | - | explosive |
| smoke_grenade | 1H | 0 | thr2 | area_radius_3,blocks_sight_2_rounds,consumable | - | thrown,blast,arc | dexterity | agility | head_down | thrown | 60 | None | - |  |
| flashbang | 1H | 0 | thr2 | area_radius_2,consumable | - | thrown,blast,arc | dexterity | agility | - | thrown | 90 | None | - |  |
| satchel_charge | 1H | 120 | thr2 | area_radius_2,consumable,placed | - | thrown,blast,arc | dexterity | agility | - | thrown | 600 | None | - | explosive |
| incendiary_grenade | 1H | 15 | thr2 | area_radius_2,consumable,applies_burning | - | thrown,blast,arc | dexterity | agility | - | thrown | 150 | None | - | explosive |
| bot_scrambler | 1H | 0 | thr2 | area_radius_2,consumable | - | thrown,blast,arc | dexterity | agility | - | thrown | 200 | None | - |  |

### 1.3 What the current alignment of each melee weapon is (the Items 2.0 question)

| rolls to hit with | weapons (hits_with / scales_with) |
|---|---|
| dexterity / agility | combat_knife, sabre, throwing_knives, legion_gladius, kemizuchi_duelling_blade, katana, afterword, striking_gloves, kemizuchi_strikers; mana melee: evoker_blade, emanator_katana, bot_thread_banner, grand_staff |
| dexterity / **strength** (the only split) | hatchet (light_melee; techniques `drag`) |
| raw_power / strength | ork_machete, maul, lance, war_axe, adamantile_greatsword, glaive, ork_rip_saw, fists, knuckledusters, hand_wraps, iron_mitts, hellraiser_servo_fist, emanator_gauntlet, the 3 companion rows |
| durability / endurance | buckler, riot_shield, pavise |
| (all guns, bows, thrown) | dexterity / agility |

`also_scales` is on the 6 raw_power fist weapons plus 3 more (section 1.1). There is no weapon today whose roll skill is raw_power and whose Attribute is agility, and none whose techniques run on both meters.

---

## 2. Per-weapon state (what `weaponState` holds, where it lives)

| thing | where | fields | file |
|---|---|---|---|
| `GearState` | interface at `character.ts:157` | `rarity?` (Rarity), `dur?` (current durability), `mods?` (item ids), `name?` (free text, kept when it differs from the row's name), `prop?` (one Relic property id, ruled 1.43) | character.ts:157 |
| main hand | `Character.weaponState?: GearState` (character.ts:81), with `Character.weapon` = weapon id and `loaded` / `loadedType` beside it | | |
| off hand | `Character.offHand?: { id, loaded?, ammoType? } & GearState` (character.ts:84) | | |
| pack | `PackItem` (character.ts:182-193): `weapon`, `rarity`, `dur`, `mods`, `prop`, `loaded`, `ammoType`, `magTypes`, `mags` | | |
| quiver | `quiversOf(c)` entries carry rarity, mods (enchantments) | character.ts:1561, 1588 | |
| worn armour | `Character.worn?: Record<slot, itemId>` (character.ts:88): id only, NO rarity, mods, dur or name; body armour is `Character.armourClass` (a number 0 to 5) | | |
| moves between hand, pack, pile, drop and give | `gearEntry` (1471), `equip` (1437: copies rarity, dur, mods, name if different, prop), `game.ts:2063-2064` swap hands, `give.ts:214` | | |
| the One Blade | `Character.state.oneBlade = { weapon: <weapon ID>, fam }` (perks/c.ts:652): keyed by the weapon id, so an id change would orphan it (also `perks/c.ts:256, 653, 656, 659`) | | |
| drill (technique marks) | `Character.phys.drill[<weaponId>]` and `phys.picked[<weaponId>]` (`physical/data.ts:116, 139`): keyed by weapon id | | |
| kills for the family | `Character.weaponKills[mastery_family]` (game.ts:2445) | | |
| a Relic's one property counted on the run's cap | `gearProps(c)` (character.ts:1004) sums `weaponState.prop`, `offHand.prop` and pack props | | |
| wear | `weaponDurOf(c)` (character.ts:164), `wearState` (170) | | |

Saved with the game: the character is part of GameState, which is rebuilt from the event log (CLAUDE.md "the event log is the save"); no per-weapon separate store. Nothing on the row or the state records an "alignment" or a "form"; `scales_with` and `hits_with` are read straight from the WEAPON row by id (`physical/data.ts:19`, `character.ts:743`), so a per-instance override would be a new field read at those two places (both are single-source: `weaponPhys()` and `weaponMult` / `weaponMultLabel`).

Reading a weapon's `phys` goes through ONE accessor, `weaponPhys(weaponId)` (`physical/data.ts:19`), used by `weaponProps`, `weaponSystem`, `hitsWith`, `scalesWith`, `weaponTeaches`. Two direct reads of `WEAPON[id].phys` bypass it: `character.ts:746` (weaponMult) and `character.ts:757, 760` (profile, label), and `combat.ts:1472 weaponVia` reads the row's `skill`.

---

## 3. Rarity and grades

data/rules.json `rarity` (line 1621). Five grades only: standard, fine, masterwork, relic, celestial. Provisional.

| grade | acc | dmg | dur | price x | marks |
|---|---|---|---|---|---|
| standard | 0 | 1 | 1 | 1 | 0 |
| fine | +1 | 1 | 1.25 | 3 | 1 |
| masterwork | +2 | 1 | 1.5 | 8 | 2 |
| relic | +2 | 1 | 1.5 | 25 | 3 |
| celestial | +2 | 1 | 1.5 | 50 | 4 |

Loaded into `RARITY` at `character.ts:159` (throws if a grade row is missing). Where each field is applied:
- `acc`: `combat.ts:545` (attack mod); `rolls.ts:191` (a focus's door roll, `focusRarity`).
- `dmg`: `combat.ts:550` `dmgMult`; `physical/melee/strikes-b.ts:216` (a stuck weapon's); every value is 1, so it does nothing (rules 1.26).
- `dur`: `character.ts:163 maxDurOf`; `perks/c.ts:246` has its OWN copy of the multipliers `{ standard: 1, fine: 1.25, masterwork: 1.5, relic: 1.5, celestial: 1.5 }` typed in code (Field Repair's max).
- `price`: `credits.ts:54` (body armour of a class), `credits.ts:68` (weapons and items).
- `marks`: `gearpreview.ts:254 rarityMarks`; main.js:600, 645 (frame width and colour), ShopScreen.tsx:54.
- `LADDER` and `GRADE_WORD` (`run/progress.ts:58`, "Standard", "Fine", ...) are separate code lists of the same five grades; stage ceiling: survival.json `rewards.ceiling` ["fine","masterwork","relic"] and `stageCeiling` in `run/rewards.ts`.
- Where grades come from: survival.json `shop.stock.rarity` (by stage: standard / fine / masterwork, relic from stage 4), `rewards.rarity` (fight 90/10, elite 75/20/5, boss masterwork 70 / relic 25 / celestial 5, crate), `shop.stock.rarity` and `rare_rarity`, the grade step and the Relic step at the Forge (celestial is never sold: progress.ts:107 comment). Loot (`loot.ts:135`) drops weapons at standard.

How a name is built today: nowhere centrally. The row's `name` (or `GearState.name`) is shown, and the grade is a separate word beside it: main.js:545 `name + ' · ' + rarity.toUpperCase()`; ShopScreen.tsx:54 and rewardCards.tsx a separate line "FINE ◆"; engine `rarityWord(r)` (gearpreview.ts:252). A `name` set by the One Blade or by data (loot entry `name`, loot.ts:63) replaces the row name. No prefix or suffix mechanism exists. A variant carries its own full name in data (e.g. "Hellraiser 'Long Belly'"). Mods are shown as separate chips or a "Mods: ..." line (main.js:547, 642).

---

## 4. Techniques, Momentum, Pressure: where each is read and paid

### 4.1 Melee techniques (data/techniques.json: 66 rows, melee 34 and ranged 32)

Counts: melee: opener 5 (lunge, charge, feint, draw_cut, ambush), strike 11 (cut, sweep, bash, sunder, flurry, hamstring, bind, half_sword, throw, pull_out, shield_bash), finisher 5 (coup, cleave, break, run_through, throw_down), link 7, answer 5, follow 1; ranged: fire 9, set 7, press 6, take 6 (dead_centre, pin_down, rout, stopping_shot, storm, last_round), watch 4.

| step | where |
|---|---|
| Momentum meter exists | `physical/core.ts:161 ensureMomentum` (only for a unit that holds a melee weapon or shield: `holdsMelee`), `res.momentum`, max `PHYS_RULES.momentum.max` (3; the Breaker class 5) |
| a plain melee hit gives +1 | `combat.ts:1585-1587` `resGain(att,'momentum',1)` in resolveAttack when `melee && !opts.noMomentum`; the technique layer passes `noMomentum` for everything but the plain `cut` (`core.ts` ~485-487) |
| a Strike or Opener costs 1 | `core.ts:188 momentumCost` (data: techniques.json rules.momentum strike_cost 1, opener_cost 1, first_opener_free true; a technique's own `numbers.momentum_cost`; items change it by stat `momentum_cost:<id or group>`: `core.ts:200`) |
| it is checked | `core.ts:386-387` (gate) and previewed `core.ts:919-933` (`t.pv.momentum`) |
| it is paid | `core.ts:994-995` directly (`u.res.momentum = max(0, was - cost)`); refunded on a handler's refusal `core.ts:1008`. NOT `cost.ts pay()`. The Guard cost beside it (Shield Bash) is the same hand-written pattern (`core.ts:998`) |
| a Finisher | needs `needs.momentum` (2, less items: `finisherNeed` core.ts:368), spends ALL via `spendMomentum` (core.ts:168-172) which each finisher handler calls itself and scales on `momentumOf` (`physical/melee/finishers.ts`: 16 reads of momentumOf / spendMomentum; coup +25% damage per point; cleave one extra target per point; break, run_through, throw_down read it too) |
| other readers | `melee/shield.ts` 3, `melee/strikes.ts` 1, `melee/shared.ts` 1 (re-export), `rules.ts` 3 (start of fight `momentumStart`, walking and hits taken wear it: `wearMomentum`), `classes/i.ts`, `classes/j.ts`, `classes/rev3.ts` (the Breaker's chain counter x1 to x5), `descriptors.ts`, `effects/stats.ts`, `effects/triggers.ts`; web: fx/physical.ts, fx/breaker.ts, classView.ts, techView.ts, resources.ts, combat.js |
| resource row | data/actions.json `resources.momentum` { on: unit, path: res.momentum } (so an item op `resource` can give or take it; a technique's own price does not use the row) |
| shown | `core.ts:1086 MOMENTUM_HINT` (techniques.json rules.momentum.texts.how: "A plain melee attack that hits builds Momentum; a Strike or an Opener spends some, a Finisher spends it all..."), meter on the token (`core.ts:1097-1103`) |

### 4.2 Pressure today (the "pips")

- Stored as a plain field `unit.pressure` (not in `u.res`), with `pressBy`, `pressHidden` (`combat.ts:201`). Arithmetic in `physical/pressure.ts`: `pressureOf`, `pressureCap` (players 3, elites 3, bosses 2, others 4: techniques.json rules.pressure max 4, player_max 3, elite_max 3, boss_max 2), `addPressureTo` (:55; filters, cap, hidden pips, state events), `lowerPressureOf` (:63), `hitPressure` (:89).
- States: pressed 2, suppressed 3, broken 4 (rules.pressure).
- Gun hit: first ranged hit on a target each turn adds `hitPressure` (1, +1 past cover, 2 hidden if silent unseen): `physical/rules.ts:42-52` in the `on_hit` hook (`ctx.melee` returns early).
- **Melee hit and the 0.31 reading:** `rules.ts:42`: `if (ctx.melee) { if (ctx.via !== P().door && pressureOf(att) && !strikeNoPressure(att)) lowerPressureOf(att, melee_hit_sheds 1); return; }`. `P().door` = `"dexterity"` (techniques.json rules.pressure.door). So a blow rolled with anything but Dexterity sheds the attacker's OWN pips; a Dexterity blow sheds none and lays none HERE. The pip it lays is DATA: data/skills.json dexterity.unlocks.1 effect index 3 (label `pressing_blade`): op `resource`, resource `pressure`, value 1, target `target`, when `hit`, if `{melee: true, rolled_with: ["dexterity"], hostile, target_alive}`, limit 2 per turn per target; effect 4 (`flush_out_blade`) frightens a Pressed non-Elite non-Boss (Dexterity 5); effect 0 (`near_miss`, Dexterity 3) adds a pip on an off-turn miss. The op runs `resGive` through the resource row `pressure` setter `addPressureTo` (`effects/cost.ts:127 resGive`, `physical/pressure.ts:99 setResSetter`).
- `rolled_with` predicate: `effects/triggers.ts:169` reads `ctx.via ?? ctx.src?.via`; `combat.ts:1286` (`via` on the attack), `1381-1383` (`via = weaponVia(att, mode)`, then `roll_with`'s `rollWithPick`), `1605-1606` (emitted on `on_hit` / `on_miss`: `via: pv.via`). `roll_with` op: data/effect_ops.json:3930 (users: items.json:1294 `open_hand`).
- A Dexterity melee hit therefore: builds +1 Momentum (combat.ts:1587, plain `cut` only), and lays 1 pip (max 2 a turn per target). That is the "double stack" of section M.
- **Boss and Elite caps** are `pressureCap` (Boss 2): a Finisher spending "all pips" on a Boss spends at most 2.
- Pressure decays: end of turn `decay` 1 (rules.ts:111-119, `DECAY` rules, `pressureDecay`), 2 hidden, 2 closing; `rules.pressure.decay*`. A kill spills `kill_spill` 1 within 3 tiles (rules.pressure). Pips are per unit, not per attacker (`pressBy` only records who).

### 4.3 How a gun technique "spends the target's Pressure" today (the code path)

Only the `take` group does, and it is special-cased in the technique core, not through the cost site:
- gate: `physical/core.ts:409` `if (group==='take') { no target -> 'Pick a target.'; if (!isPressed(t.tgt)) return "<name> isn't Pressed." }` and `core.ts:392` "One Take a turn". The data row also carries `needs.pressed` (6 rows).
- preview: `core.ts:944` pushes `t.pv.pressure` with `after = max(0, now - rules.pressure.take_cost)` (take_cost 2).
- pay: `core.ts:1024` `lowerPressureOf(cb, t.tgt, PHYS_RULES.pressure.take_cost, def.name, u)` after the handler ran; `core.ts:999` shows hidden pips first; `core.ts:449` marks the Take's own hit `noPressure`.
- per-technique handlers in `physical/ranged/takes.ts` (rout: lines 73-92 take the same cost from every Pressed unit in a blast radius; the other Takes read it the same way).
- Flat 2 pips, "all the pips" is not a thing; no per-pip scaling exists. The 5 melee Finishers scale per Momentum point; no ranged technique scales per pip.
- Other readers of a target's pips: perks.json 1591 and 1717 (items 4614, 4615: "a pip more on a foe already Pressed", "Off Balance"), classes.json Marksman moves (`break_them`: Rout costs 1 AP less), the item-op predicate `target_res.pressure.at_least` and the `value.per.of: "target:pressure"` form (skills.json dexterity effect 1, "shaken nerves": +1 save TN per pip, max 2).

### 4.4 What a cost site would have to do to charge a TARGET resource (gaps, stated)

`effects/cost.ts`: `Priced = { action, ap, res: Record<id, n>, labels, free }` (line 21); `RESOURCES` rows say where a resource lives on the PAYER (`on: 'unit' | 'character'`, `path`; `holderOfRes` line 71 resolves it from `u` or `charOfUnit(u)`); `resWhyNot(res, u, c)` (99), `resPay(res, u, c)` (108), `pay` (128) and `refund` (152) all take the payer only and call `resAdd(u, id, n)` which writes `path` directly (no setter, so no Pressure events, filters or state words). `resGive` (:127, the item op's route) is the only place that uses a row's `setter` and can address any unit, but it is outside an action's price. The `pressure` row exists (`actions.json resources.pressure`, `setter: "pressure"`, `max` via `setResMax('pressure', pressureCap)`). Needed and absent: (a) a Priced / bill() entry that names whose resource (a target), (b) `pay`/`refund`/`whyNot` taking the target unit, (c) paying through the setter (`lowerPressureOf`), not `resAdd`; (d) the preview structure `t.pv.pressure` (core.ts:944 shows the existing shape). Momentum for melee has the same property in reverse: it is `on: unit` already but its payment is hand-written in core.ts (994), so the lint `lint-costs` cannot see it. Checked: `COST_SITES` list is in `effects/stats.ts`; the technique's price is `priced(x, 'technique', ap)` through `apFor`, resources are not included for techniques.

Technique and class text that names the rule: skills.json dexterity `door_line`; techniques.json rules.momentum.texts.how; rules.pressure.states texts.

---

## 5. The Forge (every option, code, price)

Place kind `forge` (map node). Code: `packages/engine/src/run/progress.ts` (services and actions), `run/power.ts` (Relic properties, boon cap), `run/shopview.ts` / `run/placeview.ts` (views), web `PlaceScreen.tsx` + `UpgradeCard.tsx` + `rewardCards.tsx Choices`. Actions: `ProgressAction` (progress.ts:63-70): `run/upgrade`, `run/repair`, `run/forge`, `run/fit`, `run/fit_mod`, `run/unfit_mod` (+ the `extra` flag), plus the grade step's chit and the shop's.

| option | code | price (data/survival.json) |
|---|---|---|
| Grade step Standard->Fine->Masterwork of ONE carried weapon or focus (main, off, any pack line, a quiver) | `upgradeProblem` :121, `doUpgrade`, option group `grade` in `runOptions` :496; ceiling by stage `stageCeiling`; one step per character per visit (`grade_up.per_visit` 1); thrown weapons refused (:126) | `grade_up.price` fine 1500, masterwork 3500; Forge factor `grade_up.places.forge` 0.8, shop 1.0 (progress.ts:112 `gradePrice`) |
| Relic step (Masterwork->Relic) with a named property | only at a Forge (`relic_at`), from stage `relic_from_stage` 3; `relicChoices` :116 (`rollProps`, 3 offered, `capRoom` of the run's boon cap 50) | `grade_up.price.relic` 6500, no Forge discount |
| Armourer's chit pays a Fine or Masterwork step | `chitAt`, item `armourer_chit` (items.json, stock false, sell false) | 0 credits |
| Repair a carried weapon or shield to full | `repairPrice` :159, `repairProblem` :165 | `repair.rate` 0.10 of priceOf(item at grade, no mods) x missing share, floor 10, x0.8 at a Forge |
| Rolled stock: 4 mods and worn pieces "for what the party lacks first" | `forgeStock` :189 (`FORGE_SLOTS` = `forge.slots` 4), `forgeProblem`, action `run/forge` | `priceOf(id)` of each (mods 120 to 900; worn pieces 40 to 500; enchantments 400) |
| Fit / swap a weapon mod from the pack onto a carried weapon with the free slot (main, off, pack lines), or take one off | option group `mod` in `runOptions` (:520-535), `modFee` :219, `fitMod` (character.ts:1512, `setGunMods` 1502) and the `run/unfit_mod` case (progress.ts:434); ONLY weapons with `mod_slots` | `forge.fit.rate` 0.2 x the mod's price, min 25, rounded up |
| Fit into the EXTRA slot (Gun Nut, Blade Recluse "extra_mod", Overhaul "extra_slot") | `extraEntries`, `forge.fit.extra_actions` ["extra_mod","extra_slot"]; the perk actions in `perks/c.ts:266, 653` | the same fee |
| Armour class fit (next class only: 0->1->2...) | `fitOf` :206, `run/fit`; gates: `armourCap` (a trait's cap), `armourGateWhy` (character.ts:1700: class 4 needs Pain Threshold 3, class 5 needs 5; techniques.json rules.gear_gates) | `armour_fit.price` 1: 100, 2: 250, 3: 600, 4: 1200; **class 5 has no key, so `FIT['5']` is undefined and the Forge never fits Juggernaut** |

Also at a Forge and a shop: Give (GiveTab), Sell (shop only). The Forge's rolled stock uses `lastingFor` (rewards.ts:205-211, mod for a free slot on a carried gun; a worn piece better than the one worn, comparing priceOf only). Enchantments are stocked only for a party that carries a quiver (:192). Melee `edge` slot: mod_serrated 250, mod_weighted 200 can be fitted (items.json); the melee `grip` slot's only mod `mod_wrapped_grip` is `built: false` and the `optic` slot on 3 mana melee rows; `inscription` / `mod_sigil_magazine` `built: false`; `mod_underslung` `built: false`.

Relic properties (survival.json `relic_props`, 7): prop.keen (guns, worth 10, +10% gun damage), prop.true (guns+melee, 6, +2 first attack a turn), prop.quick (magazine guns, 6, reload -1 AP), prop.biting (melee, 10, +10% melee damage), prop.balanced (melee, 4, first swap free), prop.deep (foci, 8), prop.gentle (foci, 6). `propFits` = `power.ts:67` over `FITS` buckets (guns, melee, foci, magazine_guns). 0.31.2 "does gloves" per section L: no glove-only property exists in `relic_props` today (7 rows, none gloves-specific).

---

## 6. Equipment slots and armour

### 6.1 The slots (data/rules.json `equipment_slots.slots`: 12; main.js `SLOTS` line 112)

main_hand, off_hand, head, head_accessory, torso_outer, torso_inner (`inner`), lower_torso (`lower`), legs, hands, footwear (`feet`), veil, backpack. `WORN_SLOT` (main.js:66) maps rules ids to `c.worn` keys; it covers head, head_accessory, inner_torso, lower_torso, legs, hands, footwear (7); torso_outer is `c.armourClass` (not an item), veil is mapped to nothing: it can hold nothing (rules.json veil: "special equipment type... record what is worn; apply nothing", reserved).

| slot | what can go in it today | count | engine reader |
|---|---|---|---|
| main hand | any weapon row except companion_only; a shield (rules 1.57 a shield may be held in either hand) | 69 usable (72 less 3 companion) | `c.weapon`, `equip` (character.ts:1437) |
| off hand | a 1H weapon, a shield, or an item with `slot: off_hand` | every 1H weapon row + 3 shields + 6 items: evoker, emanator, attuner, visualizer (foci, 1000 each), torch (10), flare (25) | character.ts:1442; `inHands`; foci via `focus` |
| head | field_helmet (120, injury resist +10%), ballistic_helmet (350, armour +2), smiling_mask (40, narrator, `stock:false`, trait The Mask) | 3 | `gearBonus` ops: `injury_resist_bonus` (character.ts:701), `armour_bonus` (combat.ts:544) |
| head accessory | night_goggles (500, `dark_sight`), gas_mask (150, `hazard_immune`), prescription_glasses (60, trait Bottle Butts, `stock:false`, no effect) | 3 | combat.ts:552 `darkSight`, `hazardImmune`; hazards.ts:60 |
| outer torso | NOT an item: `Character.armourClass` 0 to 5, from the kit, the camp's `armour:1` (150), the Forge fit | 5 classes | ARMOUR (character.ts:712), see 6.2 |
| inner torso | padded_undershirt (80, armour +1), trauma_plate (400, armour +3) | 2 | `armour_bonus` |
| lower torso | utility_belt (90, +3 kg carry), armoured_belt (200, armour +1) | 2 | `carry_bonus` (character.ts:697), `armour_bonus` |
| legs | armoured_greaves (300, armour +2 and movement -0.5), runner_trousers (180, movement +0.5) | 2 | `movement_bonus` (character.ts:737) |
| hands | work_gloves (40, unarmed damage +2), combat_gloves (220, armour +1) | 2 | `unarmed_damage_bonus` (combat.ts:553), `armour_bonus` |
| footwear | field_boots (120, `ignore_difficult`), heavy_boots (200, armour +1 and injury resist +10%) | 2 | combat.ts:553 `ignoreDifficult` |
| veil | nothing | 0 | none |
| backpack | the pack (carry limit 20 + 5 x (Strength - 1) + belts: `carryLimit` character.ts:697; overburden -1 Movement per 5 kg over: `overburdenPenalty`) | n/a | |

All 16 worn pieces are items.json `category: armour` with a `slot`; weights 0.05 to 3 kg; `isLightArmour` = at most `GEAR.light_armour_max_kg` (1.2 kg) may be changed in a fight (gear.ts:40). No worn piece has `requires` or `armour_class`, durability, mod slots, grade or a name. A worn piece's effect sits in the row's `effects`, so a held `armour_bonus` is in raw armour units, scaled by the wearer's level at `armourOf` (character.ts:719-721).

Where pieces come from: camp `loadout.stock.ids` (survival.json): `armour:1`, work_gloves, padded_undershirt, utility_belt, field_helmet, field_boots, buckler; Forge stock (`forgeStock` :189, any `category: armour` with a `slot` priced); rewards: `lastingFor` (rewards.ts:211: offered only when the slot is empty or the piece costs more than the worn one). The shop's Today's-gear pool is weapons (not thrown) plus foci only (`run/shop.ts:82`); the shop's item categories are consumable, tool, light, food (`shop.item_categories`). So worn pieces never appear in a shop.

### 6.2 Armour classes and Defense: formulas

| thing | formula | where |
|---|---|---|
| Armour class table | rules.json `combat.armor.classes` (0 None 0; 1 Light 5 / 4 kg / 150 cr; 2 Medium 10 / 8 / 400; 3 Heavy 15 / 12 / 900 / move -0.5; 4 Assault 20 / 18 / 1800 / move -0.5, dodge -1; 5 Juggernaut 25 / 28 / 4000 / move -1, no sprint). **The code does not read it for values**: `character.ts:712 ARMOUR` is a typed copy `{value, move, dodge}` (class 5 there has `dodge: 0`; `no_sprint` is read by no engine code at all); only price, weight and names come from data (`data.ts ARMOUR_CLASSES`, `ARMOUR_KG`; `credits.ts:54` price). | rules.json (combat.armor) vs character.ts:712 |
| Armour (the number) | `armourOf(c, add) = round(scale(level) x (ARMOUR[class].value + add))`, add = `gearBonus(c,'armour_bonus') + statQuery('armor')` | character.ts:719-721; unit built at combat.ts:544 (`armour: armourOf(...)`) |
| Effect of armour on a hit | `landed(amount, armour) = max(1, floor(amount) - armour)` (flat soak per hit; a blow always does 1) | effects/output.ts:211; applied combat.ts:1565-1569; `effectiveArmour` (:1252, Break cuts it); `armor_ignore_N` weapon properties |
| Defense | `defense(c) = 10 + max(0, mod(athletics) + ARMOUR[class].dodge) + gearBonus('defense_bonus') + (shield held and main weapon grants `defense_with_shield`)`, then `fx 'defense'` | character.ts:738-739; shields' `defense_bonus` rows: buckler +1, riot_shield +2 (+ movement -0.5), pavise none (links.ts:54 sums the held shields) |
| To hit | `pct = clamp(5, 95, (21 - (target.def - toHit)) x 5)`; "need" = `target.def` | combat.ts:1391-1393 |
| Movement | `(1 + 0.5 (Agility - 1) + ARMOUR.move) x (leg injury 0.5) - overburden + movement_bonus`, floor 0.5 | character.ts:737 |
| Heavy armour gate | class 4 needs Pain Threshold 3, class 5 needs 5 | techniques.json rules.gear_gates.heavy_armour; `armourGateWhy` character.ts:1700 (used in equip :1453 and the Forge `fitOf`) |
| "what beta skills gate" (N item 3) | only the Pain Threshold gate above, plus `requires` on weapons (10 rows) and none on armour pieces | |

### 6.3 Where armour and Defense are shown to the player today

| place | what | file |
|---|---|---|
| STATUS tab (derived lines) | `Defense <n>` ("from Athletics"); no armour line | `apps/web/src/game/derived.ts:26` |
| GEAR tab, outer torso row | name "(Class II)" and "Armour <value>" (`ARMOUR[class].value`, unscaled by level); hover tip "Armour N against every hit. Sets your Armour Class." | main.js:548, 653 |
| GEAR tab, other worn rows | the piece's name and its text with the leading "Head: " stripped | main.js ~551 |
| GEAR tab, hover tip for a worn piece | `itemTip`: name, slot, item text, weight and price | main.js:608-614 |
| gear preview (shop, camp, reward cards, compare) | for armour and shields: lines `def` "Defense", `armour` "Armour", injury resistance, durability: built in `gearpreview.ts:72-82` (armour) and :54 (shield "Defense (held)") against the character's own numbers | gearpreview.ts |
| fight: hit preview | "Hit N% . need <def> (you roll d20 +x)" and "Damage <total> - armour <n>" | combat.js:1479 ("need", `odds`), :1485 (`dmgLine`) |
| fight: target card | `Defense <def> . Armour <n>` only if the target was Analyzed; otherwise "Analyze to see its HP and status" | combat.js:1478 |
| fight: backpack | "light armour 1 a piece" rule line | combat.js:1837 |
| shop camp shelf | armour cards through the same preview (camp `loadout.stock`) | LoadoutScreen.tsx |
| Forge | "Armour class N to M" option text only ("The armourer fits you for heavier armour"); no numbers of what it changes | progress.ts:530 |

---

## 7. Every place an item card is drawn

One engine source: `gearPreview(c, {id, rarity, mods})` (gearpreview.ts:114) returns `{ kind, category, traits, lines: [{key, label, value, num, better}], name, ... }`; `compareGear` (:240) puts the held item beside it; `run/shopview.ts` and `run/loadout.ts` wrap it into `ShopCardV` and `LoadoutCardV`. `apps/web/src/game/previewLines.ts shownLines(lines, n)` picks the lines (skill lines, recoil, `mod:`, `variant:` always; the first n others). The icon is `gearIcons.ts gearIconUri(id, ink, {large})` everywhere (one resolver, 0.30.1).

| place | component | file | what it draws |
|---|---|---|---|
| Shop shelves (always, today's gear) | `Card` | apps/web/src/game/ShopScreen.tsx:~48-80 | 88 px painting, name, grade word and ◆ marks, "for" line, 5 preview lines, price, quantity stepper, Buy |
| Shop compare panel | `Compare` | ShopScreen.tsx:83-100 | rows held vs next with better / worse / same |
| Sell | rows in `ShopScreen` (`v.sell.map`, :137) | ShopScreen.tsx:137-150 | icon, label, value, `AmountField` |
| Upgrade / repair at a shop; the Forge's grade, relic, repair, mod, fit options | `UpgradeCard` | apps/web/src/game/UpgradeCard.tsx:19 | icon, title, step, before/after lines, wear bar, price, button |
| Forge rolled stock and other place options | `Choices` (cards for each option) | apps/web/src/game/rewardCards.tsx:74 and `PlaceScreen.tsx` | option rows; group names GROUP (:~70) |
| Reward pick (after a fight) | `Offer` (big card per choice) | rewardCards.tsx:29 | icon 100+ px, name, grade word and marks, category, preview `lines`, "Worth N credits" |
| Reward panel (dock) | `RewardPanel` | apps/web/src/game/RewardPanel.tsx:87 (uses `Offer` with `minH`) and `rewardPanelView.ts` | |
| Camp (free weapon, free focus, shelf, boons) | `PickCard`, `ShelfCard` | apps/web/src/game/LoadoutScreen.tsx:89, 114 | free-pick card with 4 preview lines; shelf card with 2 lines and the compare rows |
| Give | rows in `GiveTab` / `GiveInline` | apps/web/src/game/GiveTab.tsx:24, 106 | 36 px icon row, 56 or 120 px portrait for a character |
| GEAR tab (sheet) | `handCard`, `weaponTip`, `itemTip`, `rigView` rows | apps/web/src/screens/main.js:608-690 | hands as panels with grade frame width, fitted chips; hover tip (title, "sub", lines, lore) |
| Fight backpack, token hover | `combat.js` own rows (`backpack` 1827+) and `apps/web/src/game/backpack.ts` | | |
| Sandbox (Proving Ground) | `sandbox.tsx` own list | apps/web/src/game/sandbox.tsx:607-740 | |

So: 6 distinct hand-built card layouts (`Card`, `UpgradeCard`, `Offer`, `PickCard`/`ShelfCard`, GiveTab row, main.js tips), each with its own grade word and ◆ drawing, own icon size, and own choice of `shownLines` n (5, 4, 2, all).

---

## 8. items.json: items with no engine reader (74 items)

Categories: mod 22, armour 16, tool 9, consumable 5, focus 4, loot 4, ammo 4, food 3, light 2, document 2, quiver 1, augment 1, companion 1. Adjudication: engine 58, narrator 11, hybrid 5.

What 0.30.1 already took off the shelves (CHANGELOG 0.30.1): `ration_pack`, `chalk_and_wax`, `prayer_beads` (`stock: false`; they are still in the three KITS' starting packs at `character.ts:634-638`), `cigarettes` (`stock: false`). It also made the field kit usable (`use` op `treat`), the toolbox count as a field kit (`serves_as`), blank plates choose a lesson.

| item | category | adjudication | stock / sell | reader found | verdict |
|---|---|---|---|---|---|
| ration_pack | food | narrator | stock false | only `character.ts:634` (a kit's pack line), `sandboxWorld.ts` | no reader |
| chalk_and_wax | tool | narrator | stock false | only `character.ts:636` (kit pack) | no reader |
| prayer_beads | tool | narrator | stock false | only `character.ts:638` (kit pack) | no reader |
| cigarettes | food | narrator | stock false | none | no reader; text says so |
| grimoire | tool | narrator | stock false, sell false | none | no reader |
| city_id, bank_card | document | narrator | stock false, sell false | none | plot props |
| contraband | loot | narrator | stock false, sell false | none | plot prop |
| bottle_of_spirits | food | narrator | NOT stock false (stocked) | `perks/h.ts` (the Lunarshine trait counts drinks) | one trait reads it |
| musek_blestor | tool | engine | stock false | `game.ts:690` (a music trait gets it), `loadout.ts:32` | trait-given |
| prosthetic_arm | augment | hybrid | stock false | `perks/b.ts:833, 862` (an arm injury hits the metal) | read |
| drone_frame | companion | engine | | `perks/f.ts` (Drone Handler) | read, class gated |
| torch | light | hybrid | not stock false | effect `light` only (`built: "light only"`): its text promises 12 elemental damage as a weapon and Burning on a 15+; not built | half dead |
| flare | light | hybrid | not stock false | effect `light` only (`built: "light only"`): thrown or held, lights 6 tiles for 3 rounds, reveals Hidden: not built beyond light | half dead (the `flare` hits in web fx are VFX names) |
| armourer_chit | tool | engine | stock false, sell false | `run/progress.ts chitAt` (grade_up.chit) | read |
| essence_of_experience | consumable | engine | stock false | op `xp_grant`, use via effects | read |
| stim_injector, field_kit, spare_parts, toolbox, quiver, standard_core, sigil_plate, heart_plate, gunpowder, casing, mana_residue, ammo_maker, the 4 foci | various | engine | | stims (`use.via stim`), field kit (`treat`), parts (perks a, c, e, f), toolbox (servesIndex), quiver code, cores (magic), plates (magic/learn), recipes.json (materials, ammo maker), focus code | read |
| mods | mod | engine | | `built: false`: mod_underslung (900), mod_wrapped_grip (80), mod_sigil_magazine (600) are unbuilt and unsellable; `open_hand`, `mod_follow_guard`, `mod_afterword` are variant modifier items with no price or slot; 6 `ench_*` need a quiver | 3 unbuilt |
| worn pieces | armour | engine, 2 narrator-ish | prescription_glasses and smiling_mask: `stock: false`, no effects (trait checks only) | | 2 trait props |

Also unreachable: weapons `pavise` (`built: false`, no price) and the 3 companion-only natural weapons (no price, by design).

---

## 9. Variants (data/variants.json, added 0.29, rules 1.56 L4)

- Data: `kinds` (12: harder, true, quick_hands, rider, kind, deep_magazine, long_reach, runs_cool, kicks_less, holds_more_flux, deep_cell, steady_heart; each with `forms`, `neutral`, `worth_per`, a sentence template, and either a `field` (changes a number on the row) or `effects` (becomes a modifier item `vmod.<variant id>.<kind>`)), `worth_cap` 20, and `items` (20 lines: id `<base>.<name>`, name, base, rarity, 1 or 2 `mods`). Gun lines 10 (long_belly, steady_hand, quickdraw, ranch_pair, hot_six, cold_drum, pin, lazy_susan, brush_gun, barbed); focus lines 10 (evoker 4, emanator 2, attuner 2, visualizer 2). No melee variant and no shield variant exists.
- Loader: `packages/engine/src/variants.ts expandVariants` (called once at `data.ts:97`): clones the base row with `variant_of`, `variant_grade`, `variant_worth`, `variant_mods`, `variant_lines`; adds the modifier items.
- Readers: `credits.ts:66` (price = base x (1 + worth / 100), never under its own grade); `gearpreview.ts:106, 206` (preview lines "variant:<kind>"); `effects/collect.ts`, `effects/hooks.ts`, `effects/triggers.ts` (modifiers act only while in a hand, `with_this`); `run/loadout.ts:46` (excluded from camp archetypes); `run/rewards.ts:142` and `run/shop.ts:82` (excluded from every pool: "never rolled"); `apps/web/src/game/gearIcons.ts:22` (picture falls back to the base's); `narrator/context.ts:198` (excluded from the Narrator's item list). Nothing names a variant by id today (no campaign, shop line or loot entry), so none can be found in a run.
- The 10 unarmed and shield rows also carry `variant_mods` in WEAPON rows: these are NOT variants of data/variants.json; they are built-in modifier items of the base row (`open_hand`, `mod_follow_guard`, `mod_afterword`), read by the same hand-held machinery.

---

## 10. Art (art/icons/gear, one painting per item id)

- Painted icons: `art/icons/gear/<kind>-<id>.png` (174 files), indexed in art/catalog.json `gear` (173 entries, each with exports at 256 / 128 / 64 / 32 and status `review-candidate`), built into `apps/web/src/game/assets.json` as `gear-<id>` and `gear-<id>-lg` by `tools/build_web_assets.py` (194-230; a catalog entry's `data_ids` aliases a derived id: `mag:<weapon>`, `armour:<class>`, `rounds:<calibre>`). Resolver: `gearIcons.ts` `gearIconUri(id, ink, {large})`; painted first, then the monoline SVG (`art/icons/weapons` 70 files, `art/icons/armour` 19, `art/icons/focus` 4), then a variant's base.
- **Weapons:** 70 of 72 weapon rows are painted (`weapon-<id>.png`). Missing: `figment_claws`, `figment_edge` (companion-only natural weapons). Shields are painted as `shield-buckler`, `shield-riot_shield`, `shield-pavise`. All 6 gloves are painted (the section M note "2 gloves unpainted" is out of date; the gaps are the two Figment rows).
- **Armour:** all 16 worn pieces painted (`armour-<id>`); body armour has 5 paintings (`armour-torso_class1_light` ... `class5_juggernaut`) answered to ids `armour:1` to `armour:5`.
- Other painted: 4 foci, torch, flare, all items except `mod_follow_guard` and `mod_afterword` (variant modifier items with no icon), 10 `mag-*` files, rounds (12 calibres), materials, 4 special ammo.
- **No grade pictures exist anywhere:** one painting per base id; grades are shown only by the ◆ marks and a frame border (main.js:645 frame width `2 + marks` px, ShopScreen border colour). No unique frame.
- Melee paintings in the dir today: knife, sabre, katana, gladius, kemizuchi blade, hatchet, throwing knives, afterword; machete, maul, lance, war axe, greatsword, glaive, rip saw; fists, knuckledusters, hand wraps, striking gloves, iron mitts, strikers, servo fist (section P counts 8 light, 7 heavy, 6 gloves: matches). Variants share their base's picture.
- Art request list to update when Items 2.0 changes art: art/briefs/ART-REQUESTS.md (CLAUDE.md rule).

---

## Appendix: facts a builder will trip on

1. Reforging into another form changes the weapon id; these are keyed by id: the One Blade (`state.oneBlade.weapon`), technique drill and picks (`phys.drill[id]`, `phys.picked[id]`), the Gun Nut collection (`collectionOf`), the weapon's lent technique (`phys.teaches`), the lent state in `weaponKills[family]` is by family (safe).
2. `ARMOUR` (character.ts:712) and `RARITY.dur` in `perks/c.ts:246` are typed copies of data (rules.json armor.classes; rules.json rarity); `GRADE_WORD` and `LADDER` (progress.ts) are code lists of the five grades.
3. `weaponVia` (combat.ts:1472) reads the row's `skill`; `hitsWith` reads `phys.hits_with`. Both are Dexterity on every melee weapon that has a Dexterity door and agree today; a per-instance alignment must change both or fold one into the other.
4. `weaponMult` has no slope for skill in melee (profile.skill 0), so `also_scales` and the 9 rows that use it change only the label text, not the number.
5. The `take` group is the only precedent for a technique that spends a target's resource; it is by group, not by data.
6. Armour pieces and body armour have no instance: no grade, mods, wear or name can be stored without a new state shape (c.worn is a string map; c.armourClass a number).
