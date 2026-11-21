## The progression curve as built (release/0.34-final, read only, 21 Nov 2026)

What I read: `data/rules.json`, `data/enemies.json`, `data/survival.json`, `data/skills.json`, `data/attributes.json`, `data/perks.json`, `data/weapons.json`, `data/items.json`, `data/techniques.json`, `packages/engine/src/character.ts`, `packages/engine/src/effects/output.ts`, `packages/engine/src/data.ts`, `packages/engine/src/run/encounter.ts`, `packages/engine/src/run/power.ts` and `packages/engine/src/physical/data.ts`. Where a number is my own hand calculation, the working is shown. My scratch script is `C:/Users/Izacarl/AppData/Local/Temp/claude/6c0adb75db3b704b/010295d4-bc48-4c45-8cf0-c06248c0fbbf/scratchpad/curve.py`.

### 0. The two level columns that drive everything

`rules.json:1894` `deal` (what a character's level multiplies its damage by) = 7.5^((L−1)/19): ×1.112 every level, ×7.5 at level 20. `rules.json:1916` `scale` (HP, armour, and the profiles with no column of their own: physical, elemental, healing, blessing) reaches ×4.69 at level 20. Max HP = round(scale(L) × (100 + 15(End−1) + (L−1)(5 + 2·Pain Threshold))) (`character.ts:798-801`). Enemies use their own table instead (`enemies.json:214`): hp_mult reaches ×8.48, damage_mult ×8.53, armour_mult ×7.5, Defense +6 (capped from level 13) and attack bonus +6 at level 20 (`data.ts:117-119`).

Where weapon damage stops moving with attributes and skills:

- **Gun profile** `rules.json:2010`: k 1.275, +0.0294 per Agility point. Per point that is **+3.75% gun damage**. The data note says k "re-pins the all-in gunner (Agility 7) to the weapon profile's 1.5".
- **Melee profile** `rules.json:2000`: k 1.15385, +0.05 per point, skill slope 0. Per point of the weapon's Attribute that is **+5.77% damage**. The same re-pin: Attribute 7 gives 1.5.
- **Bows, thrown weapons and mana weapons** have no profile, so they use `weapon`: a flat 1.5 at every Attribute.
- **Raw Power's "+5% physical damage"** (`skills.json:762`) and **Strength's "+10% physical damage"** (`attributes.json`) are only read through `physicalMult` (`character.ts:829,834`). That is reached only by a weapon with no `phys` block, hurled objects (`hurl.ts:69`) and cover damage (`fire.ts:269`, `press.ts:268`). **On every melee weapon, Raw Power adds 0 damage** (code-read). The text and the engine disagree.

### 1. Levels 1 to 20 (one character)

HP is shown for End 1 / PT 0 and for End 4 / PT 3. The XP table is `rules.json` `character.levels.xp_total`. Points: odd levels give 2 Skill points, even levels 1 Skill and 1 Attribute point. The Attribute ceiling is 7, then 8 from level 3, 9 from 6, 10 from 9. Classes come from `classes.json` `assignment`: rank I at level 3, rank II at level 6 with the attribute at 5, rank III at level 12 with the attribute at 8.

| L | XP total | HP E1/PT0 | HP E4/PT3 | deal | Skill / Attr pts | Attr ceiling | Class |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 100 | 145 | 1.00 | creation 10/10 | 7 | |
| 2 | 100 | 109 | 163 | 1.11 | 1/1 | 7 | |
| 3 | 250 | 124 | 188 | 1.24 | 2/0 | 8 | class, rank I |
| 4 | 700 | 135 | 210 | 1.37 | 1/1 | 8 | |
| 5 | 1300 | 153 | 241 | 1.53 | 2/0 | 8 | |
| 6 | 2050 | 168 | 268 | 1.70 | 1/1 | 9 | rank II |
| 8 | 3550 | 208 | 341 | 2.10 | 1/1 | 9 | |
| 10 | 5050 | 257 | 432 | 2.60 | 1/1 | 10 | |
| 12 | 6850 | 318 | 545 | 3.21 | 1/1 | 10 | rank III |
| 15 | 9550 | 469 | 825 | 4.41 | 2/0 | 10 | |
| 20 | 15250 | 914 | 1659 | 7.50 | 1/1 | 10 | |

### 2. One Attribute point (`attributes.json`, the formulas in `character.ts:766-861`)

| Attribute | One point gives |
|---|---|
| Endurance | +15 × scale HP; +10% to ignore an injury |
| Strength | +5.77% melee damage on Strength weapons; +5 kg carried. The text says +10%, but that is only the physical path (above) |
| Agility | +3.75% gun damage, +5.77% on finesse melee; +0.5 tile per AP; +1 Initiative |
| Perception | +2 tiles of vision; +3% critical damage (crits capped at ×2.0, `character.ts:853-855`); −10% critical damage taken |
| Intelligence | +10% Sigil power by `attributes.json`, **but the sigil profile has attr 0 and skill 0** (`rules.json` profiles.sigil, k 1.7). What the engine reads for Sigils: **not verified**. +0.5 Sigil word |
| Expression | +10% elemental (elemental profile slope 0: **not verified**); −0.1 AP per glyph |
| Insight | +6% healing given; −5% Soul MP cost; +25 max MP |
| Determination | +5% Soul (soul profile slope 0, k 1.55: **not verified**); +75 MP; +10% syphon |
| Virtue | Hymn wait −0.25 rounds |

### 3. One Skill point

The modifier is −2 at 0 points, then points − 1 (`skills.json:5`).

- **Alpha, Dexterity:** +1 to hit with guns, light blades and thrown weapons; +2% critical damage. **Raw Power:** +1 to hit with heavy melee and bare hands; no damage on melee weapons (§0).
  - The perk ladder for alphas is steps at 3/6/7/9, forks at 4/8, Mastered at 10 (`skills.json` ladder).
- **Beta, Athletics:** +1 Defense per point from point 1 (`character.ts:824`). **Pain Threshold:** +2 HP per level × scale, +1% Guard soak, 6% elemental taken. Perk steps 3/5/7/9.
- **Gamma:** +1 tile of call reach and narrative ease. On checks a gamma skill adds its full points. No combat number.

### 4. Perks (`perks.json`, 90 acquired, 27 mastered, 19 achieved, 6 ultimate)

- **10 of 90 acquired perks raise your own damage; 0 raise your own to-hit.** All 10 are conditional:

| Perk | Tier I | Tier II | Condition |
|---|---|---|---|
| hold_the_stroke | +6% Sigil | +12% | target holds a condition |
| shared_breath | +6% | +12% | Bonded foe |
| iron_grip | +6% | +12% | melee on a Grappled or Prone foe |
| heart_overload | +5% | +5%/+5% steps | Release at stage 3 |
| both_hands | +5% | +5%/+5% | target Pressure at 2 or 3 |
| shrug_it_off | +8% | +12% | after being hurt |
| sleight_of_hand | +8% | +14% | while Hidden |
| holy_ordnance | +8% | +12% | prayer on a foe at ≤50% HP |
| bulwark | +2%/Guard, to +10% | +3%/Guard, to +15% | holding Guard |
| mirage | +4%/Figment, to +12% | +6%, to +18% | Figments kept |

- The other acquired perks are actions, costs, conditions and saves. Three give +1 AP on a trigger: jury_rig, blueprint, five_stars.
- **Mastered:** case_closed ×1.2; true_name ×1.5 once a session.
- **Ultimate:** last_charge ×1.5 after a 5-tile charge.
- **Typical size:** tier I is +5 to 8%, tier II +12 to 15%, all conditional. Five from small to large: heart_overload I +5%, hold_the_stroke I +6%, sleight_of_hand II +14%, mirage II up to +18%, case_closed (Mastered) +20%.

### 5. Class ranks

The table follows the moves sheet `docs/design/proposals/2026-11-20-class-moves-sheet.md`, which reads `classes.json`. I checked only Smite (`classes.json:2922`) and the Ledger (`classes.json:2337`, factor 0.7) myself.

| Rank (level) | Moves that change damage or to-hit (the rest is utility, reactions or passives) |
|---|---|
| I (3) | Smite: 20 base, blessing profile, **reads `scale`, not `deal`**, through armour, once a turn. Ledger: next damage +70% of the heals given. Shape: +12% on a Release. Mark: squad +1 to hit. Fire Discipline: +1 aimed. Wind-up: +2 Momentum. Brace: +2 Defense |
| II (6) | Retort: 50% of a melee blow back. Special Ammo. Storm Front: +2 targets. Under the Eye: +2 to hit while Witnessed |
| III (12) | Execution: Marked foe at ≤25% dies. Verdict: ×(1 + Blessing power), once a fight. Heart Surge: +1 stage. Killzone: +2 to hit on 2 held shots. Payload: double area |

Smite against a rifle hit, my working: at level 3 with Virtue 7 / Faith 3, about 33 against a 59 rifle hit (+56%); at level 12 with Virtue 10 / Faith 7, about 77 against 154 (+50%). Which attributes the blessing pair reads is **not verified**. Because Smite reads `scale`, its share of a weapon hit falls by deal/scale, which is ×1.6 at level 20.

### 6. Gear

**Grades** (`rules.json:1605-1660`):

| Grade | To hit | Damage | Durability | Price | Shown pips |
|---|---|---|---|---|---|
| Standard | +0 | ×1 | ×1 | ×1 | 0 |
| Fine | +1 | ×1 | ×1.25 | ×3 | 1 |
| Masterwork | +2 | ×1 | ×1.5 | ×8 | 2 |
| Relic | +2 | ×1 | ×1.5 | ×25 | 3 |
| Celestial | +2 | ×1 | ×1.5 | ×50 | 4 |

- The data says grades add no damage on purpose: "Masterwork's +10% was the gun premium the all-in ceiling could not hold" (`rules.json:1603`).
- The "marks" field only draws pips (`gearpreview.ts:275`).
- Relic adds one property, counted against the boon cap (`survival.json:224`): keen or biting +10% (worth 10), true +2 on the first attack (6), quick −1 AP reload (6), deep +1 (8), gentle +15% heal (6).
- **Celestial = Relic + nothing**, apart from the price. It is not sold; a Boss gives it 5% of the time.
- Armour graded by `arm` = 1 at every grade.

**Inside one family**, damage barely follows price (`weapons.json`):
- Rifles: 27 to 38 for 650 to 2,100 credits; long and stalking rifles 44 to 47.
- Pistols: 15 to 26.
- Light melee: 15 to 24; heavy melee 32 to 46.
- The camp's free rifle is the cheapest rifle tagged `issue`, the lever carbine (32, 700). The hellraiser service rifle (30, 900) does less damage for more money.

**Mods** (`items.json`):

| Mod | Effect | Price |
|---|---|---|
| scope | +1 aimed | 450 |
| foregrip | +1 burst/auto | 150 |
| suppressor | −2 damage | 400 |
| weighted | +3 flat melee | 200 |
| red dot | no −2 in one range band | 200 |
| compensator | recoil −1 | 250 |
| extended mag | +50% magazine | 300 |
| quick release | reload 1 AP | 350 |
| enchantments | ×0.9 damage + a stage-2 tone rider | 400 |

- Fitting happens only at a Forge, for 20% of the mod's price (at least 25) (`survival.json:208`).
- A reward pick is a mod 5% of the time after a fight, 10% after an Elite, 35% after a Boss (`survival.json:149`).
- **A typical mod: +1 to hit in one mode, or no number at all.**

**Drill** (`techniques.json` rules.drill, `physical/data.ts:119-147`):
- Marks at 300 / 900 / 1800 drill XP. A kill gives 1 / 5 / 10 / 25 / 50 (vermin to Boss), ×3 for the Bulwark, Breaker and Skirmisher.
- A rest gives 200, a training ground 400 (`survival.json:423,430`).
- Each mark teaches a technique (the signature at I, a pick at II and III). Techniques are AP and mode variants with almost no damage change (`add` 0 or ±1). Ready cap = 3 + 0.5 × skill.

**Forge and grade steps** (`survival.json:189`):
- Fine 1,500, Masterwork 3,500, Relic 6,500 (the Relic step from stage 3, Forge only). The Forge charges ×0.8, the shop ×1.
- Armour fit: class 1 for 100, 2 for 250, 3 for 600, 4 for 1,200 (`survival.json:214`).
- Repair: 10% of the price.
- Income is 80 + 20 × depth credits a fight, ×(1 + 0.35(stage − 1)). A Fine step costs about 8 stage-1 fights.

**Armour classes** (`rules.json:798`), value × scale:

| Class | Name | Value | Penalty | Price |
|---|---|---|---|---|
| 1 | Light | 5 | none | 150 |
| 2 | Medium | 10 | none | 400 |
| 3 | Heavy | 15 | −0.5 Movement | 900 |
| 4 | Assault | 20 | −0.5 Movement, −1 Dodge | 1,800 |
| 5 | Juggernaut | 25 | −1 Movement, no Sprint | 4,000 |
| 6 | Breacher plate | 18 | −0.5 Movement | 1,400 |

Against a Soldier's rifle hit (23 at level 1), class 1 takes 22% off and class 4 takes 87% off.

**Special rounds:** armour-piercing ignores armour. Against stage-3+ Elites (armour 26 to 44 against hits of 55 to 105) that is worth +47% to +88% a hit. This is the biggest single gear step in the data.

### 7. Survival's own growth

- **Boons** (`survival.json:249`; cap 50 "percent of a rifle-turn", `survival.json:219`, enforced in `power.ts:56-60`). One a Boss:

| Boon | Effect | Worth |
|---|---|---|
| edge | +10% damage | 10 |
| second_wind | +1 AP | 17 |
| true_aim | +1 to hit | 7 |
| hardened | −10% damage taken | 13 |
| sure_script, steady_heart | +2 to hit | 13 each |

- A full cap is, for example, second_wind + hardened + edge + keen = 50.
- **Starting boons** (`survival.json:328`): +5% damage or +1 to hit, worth 4 to 6.
- **Shrine:** 10 Devotion XP (curve 45/102/200/450) or a token boon worth ≤8, one a stage (`survival.json:435`). The graft is a boon with −10% max HP.
- **Shop:** the counter at fixed prices; 3 weapons + 2 items + 1 rare per visit, in the band 300 + 150d + 1000(s−1). Rarity 70/25/5 (Standard/Fine/Masterwork) in stage 1, 45/35/15/5 from stage 4.

### 8. Enemies by stage

**The budget** (`encounter.ts:92-96`, `survival.json:55-80`):
- Bulk = 0.25 × N × rounds × (1 + 0.42(s−1)); pressure = pc[N] × N × (1 + 0.35(s−1)), with pc = 1.3 solo and 0.9 for 2 to 4.
- A solo plain fight (5 rounds): bulk 1.25 / 1.78 / 2.30 / 2.83 / 3.35 SE and pressure 1.30 / 1.76 / 2.21 / 2.67 / 3.12 SE for stages 1 to 5.

**Levels** (`encounter.ts:65-75`, `enemies.json:36-186`):
- Fight level = the party's average level, rounded down.
- Vermin and Minions are 3 levels under it, Soldiers 1 under (2 from fight level 10).
- Elites and Bosses are +0 / +2 / +4 / +4 levels over it in stages 1 / 2 / 3+.
- Each level of lag makes a foe cost ×0.83 SE.
- Elite and Boss HP and damage by party size (`survival.json:80`): solo Boss HP ×0.28, damage ×0.4.
- Elites and Bosses at or above the attacker's level can't be taken from full HP in one action (`enemies.json:203`).

**Enemy weapons never change** (`survival.json:473-480`). Soldiers always carry the 30-damage rifle and the like, at every stage.

**Typical levels by stage** (my working, static): the typical stage-1 route pays 284 XP to the Boss door and 175 for the Boss (`docs/design/proposals/2026-11-xp-fit-0.29.md` §4). The stage XP multipliers are ×1 / 2.6 / 4 / 4 / 4.5 (`survival.json:55`). That gives:

| Stage | Level during the stage | Level after its Boss |
|---|---|---|
| 1 | 1 to 3 | 3 |
| 2 | 3 to 4 | 5 |
| 3 | 5 to 6 | 7 |
| 4 | 7 to 9 | 10 |
| 5 | 10 to 11 | 12 |

### 9. Put together: fixed build against a grown build, solo, my working

- **Fixed** = the all-in gunner as created (Agility 7, Dexterity 4 for +3, lever carbine 32 at Standard, class 1 armour, End 1) with no growth.
- **Grown** = Dexterity to 10 and Agility to 10 as the points and ceilings allow, Fine in stage 2, Masterwork from stage 3. No boons or perks.
- Hit = d20 + modifier + level gap ≥ Defense. A shot = 32 × gun profile × deal − armour.

| Stage / L | Foe (level, solo HP, armour, Def) | Fixed: p(hit), hits, shots expected | Grown: p(hit), hits, shots expected | Foe hit on the player (HP) |
|---|---|---|---|---|
| 1 / 1 | Soldier L1, 140, 5, 11 | .65, 4, 6.2 | .65, 4, 6.2 | 23−5 (100) |
| 1 / 1 | Boss L1, 230, 10, 13 | .55, 7, 12.7 | .55, 7, 12.7 | 14−5 |
| 2 / 4 | Soldier L3, 183, 6, 12 | .65, 4, 6.2 | .90, 3, 3.3 | 27−6 (135) |
| 2 / 4 | Elite L6, 333, 17, 14 | .40, 7, 17.5 | .65, 7, 10.8 | 28−6 |
| 3 / 6 | Soldier L5, 232, 8, 13 | .60, 4, 6.7 | .95, 4, 4.2 | 32−7 (168) |
| 3 / 6 | Elite L10, 513, 26, 16 | **.20, 10, 50** | .55, 9, 16.4 | 42−7 |
| 3 / 6 | Boss L10, 655, 26, 17 | .15, 12, 80 | .50, 12, 24 | 32−7 |
| 4 / 8 | Elite L12, 642, 32, 17 | .15, 10, 67 | .50, 9, 18 | 53−8 (208) |
| 5 / 11 | Soldier L9, 360, 12, 15 | .55, 3, 5.5 | .95, 3, 3.2 | 48−10 (289) |
| 5 / 11 | Elite L15, 889, 44, 18 | .10, 10, 100 | .50, 9, 18 | 79−10 |

Same-level Soldier from level 1 to 20, fixed build:
- **Hits to kill: 4, 3, 3, 4, 4 ... then 3 from level 10 to 20.**
- **Soldier hits to Down the player: 6 to 8 at every level.**
- **To-hit falls from .65 at level 1 to .45 from level 15** (foe Defense +6, the player's gap only +1 or +2).

The project's simulators measure stage 1 only in 0.34 (`docs/design/handoffs/0.34-MEASURES.md`: clears out of 40, damage a head, Downs). **There is no current stage 2 to 5 measure** (the last were 0.29's: `docs/design/proposals/2026-11-xp-fit-0.29.md` §3, stage-2 clears 0 to 67%).

### 10. Flat, steep, cancelled

- **Cancelled exactly: levels.** A character's ×1.112 damage a level meets Soldier HP at the lagged level: hits to kill stay 3 to 4 from level 1 to 20. The player's HP gain and the enemy's damage gain also match: hits to Down stay 6 to 8. **A level-up changes nothing a player can see in damage or survival against ordinary foes.** The encounter budget is re-indexed to the party's level every fight (`fightLevelOf`), so whatever the player gains, the next fight is resized to it.
- **Flat:**
  - Weapon damage and price inside a family.
  - Grade damage (×1 at every grade).
  - Relic to Celestial: nothing changes but the price.
  - Raw Power on melee damage: 0.
  - An Attribute point: +3.75% (guns) or +5.77% (melee).
  - Most mods: 0 to +1.
  - Drill marks: techniques of about the same damage.
  - Perks: +5 to 18%, all conditional.
  - A gamma skill in a fight: nothing.
  - The boon cap holds the whole run's boons to about +10 to 20% damage.
- **Eroding:** an unchanged character's to-hit falls by 20 points from level 1 to 20. Smite and every `scale`-column source (healing, blessing, elemental, physical) fall behind weapons by ×1.6 at level 20.
- **Steep:**
  - Stage 2 to 3 for Elites and Bosses: +2 levels a stage, to +4, gives −4 to hit, +4 Defense and their armour (26 to 44) eating a third or more of a rifle hit. Fixed build: 17.5 to 50 shots expected for an Elite.
  - The only player steps that cut it back are skill points into the alpha's to-hit (+1 a point), Fine and Masterwork (+1, +2), and armour-piercing rounds.
  - Bulk grows +42% a stage, so fights get longer at a matched level.
  - Elite and Boss armour (7.5× by level 20) grows faster than nothing else the player owns except armour-piercing.
- **Not verified:** what the engine reads for Intelligence, Expression and Determination damage (their profiles carry 0 slopes); the blessing pair's attributes; whether `damage_mod` +3 goes into the formula's flat term; any stage 2+ outcome on 0.34.
