# Weapons v2: proposal (draft for Leon)

Status: **draft, not yet rules.** Once Leon approves or strikes lines, it goes into the spec (Weapons; Equipment slots), then `data/weapons.json` and friends, then the validator. Every new number here is provisional and will be listed in spec section 14.

Leon's calls (7 Nov 2026):

1. Yes to shields and off-hand items, and torches. A spellsword holds the Evoker or Emanator in the other hand.
2. Dual-wielding rules for melee and guns.
3. Launchers, flamers and explosives go in Heavy weapons.
4. A mana-arms family exists: it's in the lore, and the gunner-mage classes need it.
5. One icon per weapon **type**. Higher rarities reuse it with a new name, text and border. What matters is the stats, the granted skill, the ammo, the price and the lore.
6. Everything has a price.

The existing 20 weapons keep their numbers (marked ✓). The rest is new.

---

## 1. Anatomy of a weapon

| Field | Meaning |
|---|---|
| **Type** | One per icon (e.g. "service rifle"). Rarer versions are the same type. |
| **Family** | The weapon-mastery family: kills here level its mastery. |
| **Hands** | 1H or 2H. |
| **Uses** | The attack skill: Dexterity (guns, bows, thrown), Athletics (light blades), Raw Power (heavy melee, unarmed). |
| **Grants** | One **weapon skill**: an action or reaction you have only while you wield it. |
| **Stats** | Damage, range (tiles), magazine and ammo, heat limit, modes, AP, weight. |
| **Durability** | Wear points (section 4). |
| **Mod slots** | Which mods fit (section 5). |
| **Price** | In credits, at Standard rarity. |
| **Lore** | One line, in-world. |

A **weapon skill** never repeats a general action (Overwatch, aimed shot, burst and auto are open to everyone). Unless it says otherwise, a weapon skill is usable once per turn and stacks with weapon-mastery perks.

## 2. Rarity

Same icon, a different border and name. Rarity is shown as a **word plus ornament marks** on the frame (0 to 4), not by hue: colour already means skill, core and state.

| Rarity | Marks | Stats | Price |
|---|---|---|---|
| **Standard** | 0 | As listed | ×1 |
| **Fine** | 1 | +1 accuracy, +25% durability, +1 mod slot | ×3 |
| **Masterwork** | 2 | +2 accuracy, +10% damage, +50% durability, +1 mod slot | ×8 |
| **Relic** | 3 | Masterwork, plus one named property (written per item; hybrid adjudication) | ×25 |
| **Celestial** | 4 | Relic, plus a quirk. Made by a Celestial, often as a LARP of something from real Earth (never named in the world: the Unspoken Name) | Not for sale; ×50 if it ever is |

## 3. Hands, off hands and dual wielding

1. **Hands.** A 2H weapon fills both hands. The off hand takes a 1H weapon, a shield, a torch or a focus.
2. **Focuses must be held.** Sigils need an Evoker in a hand; Soul spells need an Emanator in a hand. The Evoker blade and the Emanator gauntlet (mana arms) count as their focus, so a spellsword can hold a blade-focus and a shield. Swapping what a hand holds costs 1 AP per hand (spec: draw or swap a weapon). Dropping is free.
3. **Single attacks.** With a weapon in each hand, attack with either one at its normal cost and modifiers.
4. **Paired attack.** One action with both weapons. **AP = the higher attack cost + 1.** The main hand attacks at −1 and the off hand at −3, at the same target or two targets, each with its own roll. The off-hand penalty drops by 1 for every 3 points in its attack skill (Dexterity for guns, Athletics for blades), to a minimum of −1.
5. **Two guns.** Each gun tracks its own heat, ammo and recoil. Reloading one gun is 2 AP; reloading both is 3 AP.
6. **Gun and blade.** A paired attack may mix a shot and a strike: the strike needs an adjacent target, and firing at an adjacent enemy provokes as usual.
7. **Injured arms.** An arm injury (spec: Injuries) applies to the weapon in that arm.
8. **Mastery.** A kill counts for the weapon that dealt the final hit. Shield bashes and torch strikes count as Unarmed.

## 4. Durability

1. Every weapon, shield and mod has **Durability**. An attack action wears 1 (full auto wears 2); a jam or fumble wears 5 more.
2. **Worn** (25% or less): guns jam on a natural 1 or 2; melee loses 10% damage.
3. **Broken** (0): guns can't fire, melee does half damage, shields stop protecting. Broken things can still be repaired.
4. **Field Repair** (this defines spec item 22's missing action): 2 AP, Proficiency 3+, uses one charge of a **spare-parts kit**, restores 10% + 5% per Proficiency point above 3. Out of combat, 10 minutes per kit charge restores 50%. A gunsmith restores 100% for 10% of the weapon's price.
5. Durability by family: sidearms 300, SMGs 300, rifles 400, shotguns 300, heavy 500, bows 200, light blades 250, heavy melee 300, unarmed 200, mana arms 250, shields 150 (plus their HP), torches burn 30 minutes.

## 5. Mods

| Slot | Mod | Effect | Weight | Price |
|---|---|---|---|---|
| Optic | Red dot | No −2 for the first range band past effective range | 0.1 | 200 |
| Optic | Scope | +1 to aimed shots; +1 range band before penalties | 0.4 | 450 |
| Muzzle | Suppressor | Shots don't reveal a Hidden shooter; −2 damage | 0.3 | 400 |
| Muzzle | Compensator | Recoil −1 per shot | 0.2 | 250 |
| Magazine | Extended magazine | +50% capacity (round down) | 0.2 | 300 |
| Magazine | Quick-release | Reload costs 1 AP | 0.1 | 350 |
| Underbarrel | Foregrip | First burst each turn ignores recoil | 0.2 | 150 |
| Underbarrel | Bayonet | Melee strike 15 damage, Athletics, 2 AP | 0.4 | 120 |
| Underbarrel | Underslung launcher | Holds 1 grenade round (Heavy: grenade launcher, single) | 1.5 | 900 |
| Edge (melee) | Serrated edge | Crits also cause Bleeding | 0.1 | 250 |
| Edge (melee) | Weighted head | +3 damage, +0.5 kg | 0.5 | 200 |
| Grip (any) | Wrapped grip | Can't be disarmed | 0.1 | 80 |
| Inscription (mana) | Sigil-etched magazine | Holds one stored Sigil (section 9) | 0.1 | 600 |

## 6. Ammo and calibres

| Calibre | Round kg | Credits per round | Used by |
|---|---|---|---|
| .32 Decrkm | 0.01 | 1 | Service pistol, auto-pistol, parlour pistol, SMGs |
| Revolver | 0.015 | 2 | Drifter revolver, Magistrate heavy pistol |
| .50 Frontier (new) | 0.03 | 4 | Hand cannon |
| Rifle | 0.012 | 2 | Rifles, bullpup, LMG, rotary |
| Shell | 0.04 | 3 | Shotguns, censer shotgun |
| .700 | 0.12 | 40 | Blackpoint |
| Arrow · Bolt | 0.03 · 0.04 | 3 · 4 | Bows · crossbows |
| 40 mm grenade (new) | 0.25 | 60 | Grenade launcher, underslung launcher |
| Rocket (new) | 2.5 | 400 | Rocket launcher |
| Fuel canister (new) | 1.5 | 50 (10 bursts) | Flamethrower, rip-saw |
| Core charge | (core 0.2) | core 150 = 10 charge | Core rifle |

Ammo types multiply the price: armour-piercing ×3, hollow-point ×2, incendiary ×3. Enhanced rounds cost 15 each (one core makes 10). Empty magazines cost 30 (pistol), 40 (rifle), 25 (speedloader), 60 (drum or box).

## 7. The roster: 65 types (58 weapons in 11 families, plus 7 off-hand items)

Range is in tiles. Mag is the magazine (or "loose", for loading round by round). Heat is the heat limit. Weight is in kg; price is in credits at Standard.

### 7.1 Sidearms: 6 types (1H, Dexterity)

| Type | Dmg | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|
| ✓ Service pistol (.32 Decrkm) | 20 | 8 | 12 | 6 | single | 1 | 250 | optic, muzzle, magazine |
| Decrkm auto-pistol | 14 | 6 | 20 | 8 | single, burst | 1.2 | 500 | optic, muzzle, magazine |
| Parlour pistol | 16 | 4 | 2 (loose) | 4 | single | 0.4 | 150 | none |
| ✓ Drifter revolver | 28 | 10 | 6 (speedloader) | 6 | single | 1.5 | 350 | optic |
| Magistrate heavy pistol (revolver) | 26 | 8 | 7 | 5 | single | 1.4 | 450 | optic, muzzle, magazine |
| Frontier hand cannon (.50) | 40 | 8 | 5 (speedloader) | 4 | single | 2.2 | 800 | optic |

Weapon skills and lore:
- **Service pistol · Quick Draw:** swap to it and fire in one action for 2 AP. *"Issued to everyone, trusted by no one, carried by all of them."*
- **Auto-pistol · Point Blank:** +2 to hit within 2 tiles. *"For the kind of conversation that happens across a table."*
- **Parlour pistol · Ace in the Sleeve:** +2 to the first shot of a fight; a pat-down finds it only on a Hard check. *"Two rounds. That's usually one more than it takes."*
- **Drifter revolver · Fan the Hammer:** 3 AP, up to 3 shots at one target at −2 each (recoil still applies). *"Six chances, and frontier folk count every one."*
- **Magistrate heavy pistol · Stopping Power:** a hit costs the target 1 AP on its next turn. *"Central City's courts went armed for a reason."*
- **Hand cannon · Knockback:** a hit pushes the target 1 tile away from you. *"You don't fire it so much as negotiate with it."*

### 7.2 SMGs: 4 types (Dexterity)

| Type | Hands | Dmg | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|---|
| ✓ Decrkm SMG | 2H | 15 | 8 | 30 | 10 | single, burst, auto | 3 | 600 | optic, muzzle, magazine, underbarrel |
| Legion PDW | 1H | 16 | 8 | 25 | 9 | burst, auto | 2.2 | 750 | optic, muzzle, magazine |
| Whisper SMG | 2H | 13 | 7 | 30 | 12 | single, burst, auto | 3.2 | 900 | optic, magazine (built-in suppressor) |
| Mandestra drum-gun | 2H | 15 | 7 | 70 (drum) | 10 | auto | 4.5 | 1,100 | optic, underbarrel |

- **Decrkm SMG · Spray and Pray:** full auto costs 3 AP instead of 4. *"Thirty rounds of opinion."*
- **Legion PDW · Clear the Room:** bursts get +2 to hit within 3 tiles. *"The Thousand World Legion's door-kicker."*
- **Whisper SMG · Quiet Work:** firing never reveals you while Hidden. *"Bought by people who don't want receipts."*
- **Drum-gun · Hose:** the full-auto cone is 4 tiles wide. *"A merchant's answer to a negotiation gone wrong."*

### 7.3 Rifles: 6 types (2H, Dexterity)

| Type | Dmg | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|
| ✓ Hellraiser service rifle | 30 | 16 | 24 | 8 | single, burst, auto | 4 | 900 | all four |
| ✓ Lever carbine | 32 | 14 | 8 (loose) | 6 | single | 3.5 | 700 | optic, muzzle |
| Adamantile battle rifle | 38 | 18 | 15 | 6 | single, burst | 5 | 1,300 | all four |
| CCEC marksman rifle | 40 | 22 | 10 | 6 | single | 4.5 | 1,600 | optic, muzzle, magazine |
| ✓ Long rifle | 50 | 30 | 5 (loose) | 6 | single | 6 | 1,400 | optic, muzzle |
| Legion bullpup | 28 | 14 | 30 | 8 | single, burst, auto | 3.4 | 1,100 | optic, muzzle, magazine |

- **Service rifle · Suppressing Fire:** 3 AP; mark a 3-tile line until your next turn. Enemies shooting from or moving through it are at −2, and the first one to move through it takes a shot from you. *"The Hellraisers' answer to every frontier."*
- **Lever carbine · Work the Lever:** after a hit, your next shot this turn costs 1 AP less. *"Old, honest, and never needs a battery."*
- **Battle rifle · Armour-Breaker:** shots ignore 5 armour. *"The Brigade wanted a rifle that argued with plate."*
- **Marksman rifle · Steady Aim:** aimed shots crit on 18–20. *"CCEC evidence: one round, one report."*
- **Long rifle · One Breath:** if you haven't moved this turn, aimed shots get +3 instead of +2, and range-band penalties are halved. *"Fired from the next valley over."*
- **Bullpup · Shoot and Scoot:** after a shot, move 1 tile for free. *"Short enough for a dropship aisle."*

### 7.4 Shotguns: 4 types (Dexterity, shells)

| Type | Hands | Dmg (within 4 / within 8) | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|---|
| ✓ Lumeri scattergun | 2H | 40 / 25 | 8 | 6 (loose) | 6 | single | 4 | 650 | optic, underbarrel |
| Coach gun | 2H | 45 / 25 | 6 | 2 (loose) | 4 | single, both barrels | 3.5 | 400 | none |
| Sawn-off | 1H | 42 / 15 | 6 | 2 (loose) | 4 | single, both barrels | 2 | 300 | none |
| Brigade auto-shotgun | 2H | 35 / 20 | 8 | 12 | 9 | single, burst | 5 | 1,500 | optic, magazine, underbarrel |

- **Scattergun · Breach:** 2 AP; breaks a door, or deals double damage to cover. *"The Church calls it a key."*
- **Coach gun · Both Barrels:** 3 AP; both shells in one attack, +50% damage. *"Two arguments, one conclusion."*
- **Sawn-off · Close Quarters:** firing at an adjacent enemy doesn't provoke. *"Illegal in Central City, which is how you know it works."*
- **Auto-shotgun · Room Sweeper:** a burst can split between two adjacent targets. *"The Brigade's corridor-clearer."*

### 7.5 Heavy weapons: 7 types (2H, Dexterity; launchers, flamers and explosives live here)

| Type | Dmg | Range | Ammo | Heat | Kg | Price | Notes |
|---|---|---|---|---|---|---|---|
| ✓ Hellraiser LMG | 25 | 18 | 100 rifle (box) | 14 | 10 | 2,500 | −2 unless emplaced |
| Hellraiser rotary | 22 | 16 | 200 rifle (belt) | 20 | 18 | 4,500 | auto only; −1 Movement |
| ✓ .700 Blackpoint | 90, ignores 10 armour | 40 | 3 (.700) | 3 | 15 | 4,000 | braced or prone |
| Smetanita thumper (grenade launcher) | 40, radius 2 | 14 | 6 grenades (loose) | 4 | 4.5 | 1,800 | |
| Breacher tube (rocket launcher) | 110 on the tile, 60 radius 1 | 16 | 1 rocket (loose) | none | 8 | 3,000 | 3 AP to reload |
| Purifier flamer | 20 + Burning, 3-tile cone | 3 | fuel canister (10 bursts) | none | 12 | 2,200 | flame ignores half cover |
| Satchel charge | 120, radius 2 | placed adjacent | consumable | none | 3 | 600 | 2 AP to place; 1 AP to detonate (or a 1–3 round timer) |

- **LMG · Emplace:** 1 AP to set up: no −2, +1 to hit, and you can't move until you pack up (1 AP). *"The Hellraisers' favourite sentence: 'hold here.'"*
- **Rotary · Spin Up:** the first full auto each fight costs +1 AP; after that, full auto costs 3. *"Ground near it stops being ground."*
- **Blackpoint · Through and Through:** a hit carries on to the next target in line at half damage, breaking any half cover it passes. *"Anti-materiel. Everyone else is materiel."*
- **Thumper · Lob:** indirect fire: no line of sight needed if an ally sees the tile, at −2. *"Smetanita property. Return it or else."*
- **Breacher tube · Bunker Buster:** rockets deal triple damage to cover. *"The Legion's door, and the wall it was in."*
- **Purifier · Wall of Fire:** 3 AP; a 3-tile line burns for 2 rounds (Burning to anyone who ends a turn in it). *"The Lumeri insist it's a sacrament."*
- **Satchel · Shaped Charge:** placed against cover, it destroys it outright. *"Some problems are best solved from the next room."*

### 7.6 Bows: 4 types (2H, Dexterity; bows scale with Raw Power, all silent)

| Type | Dmg | Range | Ammo | Kg | Price | Needs |
|---|---|---|---|---|---|---|
| ✓ Recurve bow | 20 + 5 × Raw Power | 14 | quiver of 20 | 1.5 | 300 | |
| Longbow | 25 + 6 × Raw Power | 20 | quiver of 20 | 2 | 450 | Raw Power 3 |
| ✓ Crossbow | 35 | 16 | 1 bolt | 4 | 500 | |
| Repeating crossbow | 22 | 10 | 6 bolts | 3.5 | 700 | |

- **Recurve · Nock and Loose:** if you haven't moved this turn, your second arrow costs 1 AP. *"Quiet, cheap, and it never jams."*
- **Longbow · Arc:** indirect shot at −2, like Lob. *"Over the wall and through the roof."*
- **Crossbow · Bolt Rest:** aimed shots cost 2 AP. *"Patience, cranked."*
- **Repeating crossbow · Volley:** 3 AP; two bolts, each with its own roll. *"An Arkvelton toy that got out of hand."*

### 7.7 Light blades: 6 types (1H, Athletics)

| Type | Dmg | Kg | Price | Notes |
|---|---|---|---|---|
| ✓ Combat knife | 15 | 0.5 | 60 | thrown 6 tiles |
| Throwing knives (set of 4) | 12 | 0.8 | 80 | thrown 6 tiles |
| Hatchet | 22 | 1 | 120 | thrown 5 tiles |
| Legion gladius | 26 | 1.3 | 300 | |
| ✓ Sabre | 28 | 1.5 | 400 | |
| Kemizuchi duelling blade | 24, +1 accuracy | 1.2 | 550 | |

- **Combat knife · Finish It:** +50% damage against a target that is Dazed, Stunned, Bleeding or Downed. *"Every kit has one. Every story ends with one."*
- **Throwing knives · Fan of Knives:** 3 AP; one throw each at up to two targets. *"Four problems, four solutions."*
- **Hatchet · Splitter:** double damage to shields and cover. *"Frontier tool first, weapon whenever needed."*
- **Gladius · Shield Partner:** +1 Defense while your off hand holds a shield. *"Made for the second rank of a shield wall."*
- **Sabre · Riposte:** reaction; when a melee attack misses you, strike back. *"An officer's argument."*
- **Duelling blade · Lunge:** strike a target 2 tiles away. *"The school across town settles things with this."*

### 7.8 Heavy melee: 7 types (Raw Power)

| Type | Hands | Dmg | Reach | Kg | Price |
|---|---|---|---|---|---|
| ✓ Ork machete | 1H (was 2H) | 35 | 1 | 3 | 250 |
| War axe | 2H | 40 | 1 | 3.5 | 500 |
| Adamantile greatsword | 2H | 42 | 1 | 4 | 900 |
| ✓ Maul | 2H | 45 | 1 | 7 | 450 |
| ✓ Lance | 2H | 32 | 2 | 3 | 500 |
| Glaive | 2H | 36 | 2 | 3.5 | 650 |
| Ork rip-saw | 2H | 38, ignores 5 armour | 1 | 6 | 1,400 (fuel) |

- **Machete · Cleave:** after a kill, a free strike at another adjacent enemy. *"Orks don't make tools. They make machetes."*
- **War axe · Sunder:** a hit lowers the target's armour by 5 for the fight (to −10 at most). *"Plate is just a slower kind of skin."*
- **Greatsword · Sweep:** 4 AP; strike every adjacent enemy. *"The Brigade's way of saying 'stand back.'"*
- **Maul · Knockdown:** a hit knocks the target prone. *"It doesn't cut. It explains."*
- **Lance · Charge:** after 3+ tiles of straight-line movement this turn, +50% damage. *"Adamantile knights don't stop. They arrive."*
- **Glaive · Keep Back:** reaction; strike an enemy that steps into your reach. *"The space around you is yours."*
- **Rip-saw · Rip:** a hit causes Bleeding. *"Ork engineering: loud, sharp, and on fire."*

### 7.9 Unarmed: 3 types (1H, Raw Power)

| Type | Dmg | Kg | Price | Needs |
|---|---|---|---|---|
| ✓ Gloves or bare fists | 10 | 0 | 40 (gloves) | |
| Knuckledusters | 16 | 0.3 | 60 | |
| Hellraiser servo-fist | 30 | 2.5 | 1,200 | Proficiency 3 |

- **Fists · Grapple:** 2 AP; the target can't move until it breaks free (its Athletics or Raw Power check against your Raw Power check). *"Everyone's first weapon."*
- **Knuckledusters · Rabbit Punch:** 1 AP jab for half damage. *"A bar argument that brought friends."*
- **Servo-fist · Haymaker:** a hit pushes the target 2 tiles; if it hits a wall or cover, +20 damage to it. *"A mining tool the Hellraisers misread."*

### 7.10 Thrown: 5 types (1H, Dexterity; range 6 + Raw Power tiles; consumable)

| Type | Effect | Kg | Price |
|---|---|---|---|
| ✓ Frag grenade | 40, radius 2 | 0.5 | 120 |
| ✓ Smoke grenade | blocks sight, radius 3, 2 rounds | 0.5 | 60 |
| ✓ Flashbang | Blinded 1 round, radius 2 (Body save) | 0.5 | 90 |
| Incendiary grenade | 15 + Burning, radius 2; the ground burns 2 rounds | 0.6 | 150 |
| Bot-scrambler | Robots Stunned 1 turn; mana arms jam; Sigils in the radius cost +1 AP for 2 rounds | 0.5 | 200 |

- **Frag · Cook It:** spend 1 AP more; the blast radius is 3. *"Pull, count, apologise."*
- **Smoke · Cover Me:** allies who start a turn inside the smoke move +1 tile. *"Not a weapon. A permission slip."*
- **Flashbang · Sudden Dark:** Blinded targets also lose their reaction. *"Lumeri riot police swear by them."*
- **Incendiary · Firebreak:** you choose which tiles in the radius burn. *"The frontier's least favourite smell."*
- **Bot-scrambler · Static:** mana arms in the radius stay jammed until cleared (2 AP). *"Science Team surplus, sold out the back door."*

### 7.11 Mana arms: 6 types (new family; requirements listed)

Guns use Dexterity; melee uses Athletics or Raw Power. These are the class weapons for Spellslinger, Storm Hand, Blade Scribe, Lumeri Templar and Banner Dancer, but anyone who meets the requirement can use them.

| Type | Hands | Dmg | Range | Feeds on | Kg | Price | Needs |
|---|---|---|---|---|---|---|---|
| Science Team core rifle | 2H | 32 Elemental, ignores armour | 16 | a mana core: 1 charge a shot | 5 | 2,600 | Proficiency 3 |
| Spellslinger's pistol | 1H | 22 | 8 | .32 Decrkm, sigil-etched magazines | 1.1 | 1,500 | Brain Power 3 to inscribe |
| Evoker blade | 1H | 26 | 1 | counts as an Evoker | 1.8 | 2,400 | Brain Power 3 |
| Emanator gauntlet | 1H | 18 + one element | 1 | counts as an Emanator | 1.5 | 2,200 | Will Power 3 |
| Lumeri censer gun | 2H | 30 / 18 (shotgun) | 8 | shells, or blessed shells | 4.5 | 2,000 | Faith 3 |
| Bot-thread banner | 2H | 24 | 2 | none | 3 | 1,800 | Camaraderie 3 |

Each hit from mana arms releases bots: +1 on the ambient mana meter, like enhanced rounds.

- **Core rifle · Overcharge:** spend 3 charge on one shot: 80 Elemental damage, and +3 on the meter. *"The Science Team's proof that mana is a munition."*
- **Spellslinger's pistol · Stored Spell:** each sigil-etched magazine holds one Sigil, drawn into it out of combat with an Evoker (the core cost is paid then). The first hit from that magazine releases it at the target. *"Every magazine is a letter. Some are threats."*
- **Evoker blade · Edge Word:** after a hit, draw one Sigil word for 0 AP (its core cost still applies). *"The Blade Scribes write with the edge."*
- **Emanator gauntlet · Charged Strike:** kills charge it (up to 3). Spend all charge on a hit for +15 element damage per charge. *"The Storm Hand's heart goes into the fist."*
- **Censer gun · Blessed Shell:** a Templar or anyone with a patron can bless a shell (out of combat, a prayer) with a Blessing they hold. Firing it lands the Blessing on the target tile, radius 1, helping allies or harming foes as the Blessing says. *"The Church fires its prayers at range."*
- **Bot-thread banner · Rally:** 2 AP, once per fight; plant it, and allies within 3 tiles get a shield worth 15 × your Healing given. *"Banner Dancers fight armourless. The banner is the armour."*

### 7.12 Off-hand items: 7 types

| Item | Effect | Kg | Price | Durability or HP |
|---|---|---|---|---|
| Buckler | +1 Defense. **Parry** (reaction): +3 Defense against one melee attack | 2 | 200 | 150 |
| Legion riot shield | +2 Defense. You count as behind half cover against shots from the front three directions. −0.5 Movement. **Shield Wall:** an adjacent ally behind you counts as behind half cover | 7 | 700 | HP 60: shots stopped by its −5 hit the shield (like cover) |
| Pavise | Carried, it does nothing. **Plant** (2 AP): becomes a full-cover tile in front of you (80 HP). Picking it back up is 2 AP | 10 | 1,200 | HP 80 |
| Torch | Light radius 4 (once darkness exists). Melee 12 Elemental (Unarmed). **Ignite:** a hit on 15+ sets the target Burning; 1 AP to light something flammable | 0.6 | 10 | burns 30 minutes |
| Flare | Light radius 6 for 3 rounds; reveals Hidden in it. Can be thrown | 0.3 | 25 | consumable |
| Evoker (held) | Needed in a hand to cast Sigils (section 3) | 1.2 | 1,000 | 250 |
| Emanator (held) | Needed in a hand to cast Soul spells | 0.4 | 1,000 | 250 |

## 8. Prices for everything else (so the shop works)

| Item | Price |
|---|---|
| Armour, by class I to V | 150 · 400 · 900 · 1,800 · 4,000 |
| Stim injector | 80 |
| Field kit | 120 |
| Spare-parts kit (5 charges) | 80 |
| Ration pack | 10 |
| Standard mana core (spec) | 150 (small 75, heavy 300) |
| Chalk and wax | 15 |
| Prayer beads and incense | 20 |
| Essence of Experience (spec) | 300 |
| Selling | Shops buy at 40% of price; the Essence sells for its full 300 (spec) |

## 9. What changes in the rules (if approved)

1. **Spec:**
   - Hands and dual wielding (section 3).
   - Durability and Field Repair (section 4; closes item 22's Field Repair).
   - Rarity (section 2).
   - Mods (section 5).
   - Calibres and prices (sections 6 and 8).
   - Weapon skills.
   - An 11th mastery family (Mana arms) with mastery perks to write.
   - The Ork machete becomes one-handed.
2. **Data:**
   - `weapons.json` gains `type`, `hands`, `grants`, `durability`, `mod_slots`, `price_credits`, `requires`, `rarity` and `lore` (rarity is a per-instance field on owned weapons, not on the type).
   - New `mods.json`.
   - `items.json` gains prices, shields and torches.
   - `weapon_mastery.json` gains the Mana arms family.
3. **Engine:**
   - Hands and the off-hand slot.
   - Paired attacks.
   - Durability.
   - Weapon skills: about 60 small hooks, done in waves. Anything not built yet falls back to the Narrator with its text, as the rules require.
4. **Art:** 65 type icons (58 weapons and 7 off-hand items), each with one icon prompt built from its row, plus the rarity border frame done once.

## 10. Open questions for Leon

1. **Rarity words:** Standard / Fine / Masterwork / Relic / Celestial. Keep, or rename in-world?
2. **Paired-attack penalties:** −1 / −3, reduced by 1 per 3 skill points. Feels right?
3. **Is the durability wear rate (1 per attack) too fiddly?** The alternative is wear per fight (−5% each fight), which is simpler but less tactical.
4. **Torch light** needs darkness rules (vision, Hidden). Is darkness wanted now or later?
5. **The Ork machete becoming one-handed** changes the existing two-handed rule. OK?
6. Strike or add any types: the 65 is a ceiling, not a target.
