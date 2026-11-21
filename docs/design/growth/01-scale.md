# 01. The number scale (the 0.34 rebalance, design phase; drafted 21 Nov 2026)

**For the lead.** Nothing here is built. Every proposed number is PROVISIONAL. Every table below is printed by `tools/balance/scale.py` (it reads `data/*.json` and writes nothing): change a number in its `PROPOSAL` block and run it again (`PYTHONUTF8=1 python tools/balance/scale.py`, or one section: `today columns weapons digits flat stats hp check costs margins caps`). Facts about today were read in data and code at the release branch's HEAD `ae619d8f6`; where a map in `proposals/2026-11-21-maps/` said otherwise, the file won.

Leon's ruling this file answers (the curve, section 17 item 2): *a hit is one or two digits at level 1, four at level 20, five for something super; you feel every level in the power of the hits, your HP, their HP, AP cost, mana cost; nothing is 100 HP because other games do it.*

## 0. What I decided, in five lines

1. **One factor for every flat number: x0.6** (not the charter's x0.45 for weapons and x0.6 for HP). Damage, HP, healing, shields, armour, soak, cover, hazards and enemy HP all move together, so every count of hits (to kill, to survive, to heal) stays what it is today and only the changes I name move it. A rifle shot is 28 at level 1, a specialist's maul blow 63, a frail character has 60 HP.
2. **One level column for a character: x40 at level 20 (x1.214 a level)**, read by every hit, every HP bar, armour and Guard's soak; heals and shields read it times a normal bar's growth (x65). Enemies: damage x60 and HP x90 at level 20, because they are written for a specialist whose gear is one grade under the stage's best. Defense and to-hit become level-free; only the level *gap* (+1 a level, to 5) touches the roll.
3. **The cards become true.** Each damage profile's slopes are what its cards say (Strength +10%, Raw Power +5%, Dexterity +4% on guns, light blades and thrown, Intelligence and Brain Power +10%, Expression +10%, Determination +5%, Will Power +10%, Virtue +5% and Faith +10%, Insight and Empathy +6%). Each profile's own constant `k` is re-set so a normal share (4 and 4) deals today's number x0.6 at level 1; the melee, thrown and Figment factors fold into their `k` and go. A dabbler hits up to a quarter softer than today, a specialist up to a quarter harder.
4. **Character HP = deal(L) x (60 + 10 x (Endurance - 1) + (L - 1) x (1 + 0.5 x Pain Threshold))**: 60 / 120 at level 1 for Endurance 1 / 7, 3,160 and 10,560 at level 20 (Endurance 1 and Pain Threshold 0; Endurance 10 and Pain Threshold 10).
5. **Margins replace the capped critical** (every full 4 over the Defense or TN adds a quarter; a natural 20 adds two, Perception 4, 7 and 10 one more each), with the grade ladder (Fine x1.15 +1 to Celestial x1.75 +3) on damage and on armour, and a grade for magic too: the Evoker's and Emanator's grade, and Devotion as the faithful's grade. The caps that only held a reward down go.

---

## 1. How the engine computes a hit today (checked in code and data)

**The one formula** (`packages/engine/src/effects/output.ts:4-7`, and `data/rules.json:1722` `output.formula`):

`amount = (base + flat) x Stat x Level x own multipliers x (1 + target bonuses, capped at +100%)`, then `dealt = max(1, floor(amount) - armour)`.

| Term | Where the code builds it | The data keys that carry it |
| --- | --- | --- |
| base | `combat.ts:1527` (`weaponDamage`) for a weapon; `amounts` blocks for everything else (`effects/amounts.ts`, `output.ts:174-175`) | `weapons.json items[].damage` (a number, a `within_4 / within_8` band for shotguns, or a formula such as `20 + 5*raw_power` for bows); `items.json mod_bayonet.melee_damage`; every `amounts.<key>.base` and `per[]`; `sigils.json items[].damage / heal / shield`; `soul_modules.json damage.base` (37, read by `magic.ts:752`); `patrons.json` effects' `value`; `conditions.json` ticks |
| flat | the `damage_out` hook's `ctx.add` (`combat.ts:1554-1556`) | items' ops |
| Stat | `output.ts:87-92` `statTerm` = k x (1 + attr x (Attribute - 1) + skill x Skill); a weapon's Stat is `character.ts:833-837` `weaponMult` (the row's `phys.profile`, its `scales_with` Attributes and its `hits_with` skill); an enemy's Stat and Level together are `Unit.lvlDmg` = tier `damage` x level `damage_mult` (`combat.ts:639`, `:711`) | `rules.json output.profiles` (`:1814`) and `output.pairs` (`:1995`); `weapons.json items[].phys` |
| Level | `output.ts:111-117` `levelFactor`, the profile's `level` column at the dealer's level; `scaleOf` (`:120`) reads `scale` for everything measured in HP (`character.ts:801` max HP, `:803` armour, `physical/core.ts:121` Guard's soak, `combat.ts:808-818` objects) | `rules.json output.level.deal` (`:1724`, x7.5 at 20), `.scale` (`:1746`, x4.69), `.mend` (`:1768`, x11.97); `enemies.json levels.table` (`:214`): `hp_mult` x8.48, `armour_mult` x7.5, `damage_mult` x8.53, `defense_plus` +6, `attack_plus` +6 at 20 |
| own multipliers | `combat.ts:1536-1547`: rarity (`att.dmgMult`), technique, **melee factor** (`:1537`, x1.35 on every character's melee blow), wear, ammunition, **the critical** (`:1542-1544`: 1.5 + 0.03 x (Perception - 1) + 0.02 x Dexterity, held to 2.0 by `character.ts:853-855`), ambush, Weakened, Sharpened | `rules.json output.factors` (`:1987`: melee 1.35, thrown 0.7, figment 0.9); `rules.json rarity` (`:1601`: `dmg` 1 on every grade); `weapons_rules.ammo_types[].damage_mult` |
| target bonuses | `output.ts:129-134` `stackDamage`: added, held between -90% and +100% (`VS_CAP`, a constant in code) | items' `vs` pushes |
| armour | `output.ts:208-214` `armourAgainst`, `landed` | `rules.json combat.armor.classes[].value` (`:798`: 0 / 5 / 10 / 15 / 20 / 25 / 18) x grade `arm` (1 everywhere) x scale; `enemies.json items[].armour` x `armour_mult` |

What a character's weapon profile does today (`rules.json:1830`, `:1840`): **melee** k 1.15385, +0.05 a point of the row's Attribute, no skill slope; **gun** k 1.275, +0.0294 a point of Agility, no skill slope. **Sigil** k 1.7, **soul** k 1.55, **elemental** k 1: no slope at all (`:1850-1873`): Intelligence, Brain Power, Expression, Determination and Will Power add nothing to the damage their cards promise. Raw Power's `+5% physical damage` (`skills.json raw_power per_point.numbers.damage` 0.05) and Dexterity's `+2% critical damage` are text only on a weapon. **HP** (`character.ts:798`, `:801`): `round(scale(L) x (100 + 15 x (End - 1) + (L - 1) x (5 + 2 x PT)))`, with 100, 15 and 5 typed in code. **Healing** reads `mend` (x11.97), so a heal outgrew the bars (x9.1 for Endurance 1) by a third.

The full profile table and today's three columns are T1:

#### T1. Today: the output formula's terms, as data holds them (rules.json output)

| profile | k | attr | skill | level column | pair (attrs ; skills) | floor | min_pct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| physical | 1 | 0.1 | 0.05 | scale | strength ; raw_power |  |  |
| weapon | 1.5 | 0 | 0 | deal |  ;  |  |  |
| melee | 1.15385 | 0.05 | 0 | deal |  ;  |  |  |
| gun | 1.275 | 0.0294118 | 0 | deal |  ;  |  |  |
| sigil | 1.7 | 0 | 0 | deal | intelligence ; brain_power |  |  |
| elemental | 1 | 0 | 0 | scale | expression ; visualization |  |  |
| soul | 1.55 | 0 | 0 | deal | determination ; will_power |  |  |
| blessing | 0.956 | 0.06 | 0.06 | scale | virtue ; faith |  |  |
| healing | 1.392 | 0.06 | 0.06 | scale | insight ; empathy | 0.5 |  |
| mend | 1.392 | 0.06 | 0.06 | mend | insight ; empathy | 0.5 | 0.2 |
| sigil_mend | 1.629 | 0.06 | 0.06 | mend | intelligence ; brain_power | 0.5 | 0.2 |
| soul_mend | 1.296 | 0.06 | 0.06 | mend | determination ; will_power | 0.5 | 0.2 |
| blessing_mend | 1.44 | 0.06 | 0.06 | mend | virtue ; faith | 0.5 | 0.1333 |
| flat | 1 | 0 | 0 | deal |  ;  |  |  |
| figment | 1.5 | 0 | 0 | deal | expression ; visualization |  |  |
| figment_hp | 0.35 | 0 | 0.15 | None |  ; visualization |  |  |
| repair | 1.392 | 0.06 | 0.06 | mend | expression ; proficiency | 0.5 |  |
| tend | 3.74 | 0.06 | 0.06 | mend | insight ; empathy | 0.5 | 0.2 |

factors: melee 1.35, thrown 0.7, figment 0.9

| level | deal | scale | mend |
| --- | --- | --- | --- |
| 1 | 1.0 | 1.0 | 1.0 |
| 2 | 1.1119 | 1.0424 | 1.1018 |
| 3 | 1.2363 | 1.1239 | 1.188 |
| 4 | 1.3746 | 1.1782 | 1.3102 |
| 5 | 1.5284 | 1.2736 | 1.5054 |
| 6 | 1.6993 | 1.3416 | 1.5858 |
| 7 | 1.8894 | 1.4534 | 1.8269 |
| 8 | 2.1008 | 1.5372 | 2.0568 |
| 9 | 2.3359 | 1.6685 | 2.2425 |
| 10 | 2.5972 | 1.7708 | 2.5322 |
| 11 | 2.8877 | 1.9252 | 2.9263 |
| 12 | 3.2108 | 2.0495 | 3.312 |
| 13 | 3.57 | 2.2313 | 3.8289 |
| 14 | 3.9694 | 2.4809 | 4.5177 |
| 15 | 4.4135 | 2.7584 | 5.3265 |
| 16 | 4.9072 | 3.067 | 6.272 |
| 17 | 5.4562 | 3.4102 | 7.3831 |
| 18 | 6.0667 | 3.7917 | 8.6792 |
| 19 | 6.7454 | 4.2159 | 10.1983 |
| 20 | 7.5 | 4.6875 | 11.9672 |


Three things today that would leave numbers on the old scale whatever the columns say (each a "must change" in the Built-from table):

- **A thrown blast, a barrel, a trap and a hazard read no level.** `tactics.ts:433-435` and `perks/c.ts:485` hurt with `w.damage x factors.thrown`; `combat.ts:889-893` with `explodes.damage`; both through `hurtUnit` (`combat.ts:859`), which takes the number as given. A frag deals 28 at level 20 as at level 1.
- **Figments grow their HP by the enemy HP column** (`figments.json:18` `level.hp: ["hp_mult"]`), not by what hits them.
- **The heal gate counts to `gate.hp` x scale** (`output.ts:264`; `rules.json:1582` `mending.gate.hp` 145, the old reference character), not to a bar at that level.

## 2. The new columns

### 2.1 The level column `deal`: x40 at level 20

`deal(L) = 40 ^ ((L - 1) / 19)`: **x1.214 a level, x2.17 at 5, x5.74 at 10, x15.2 at 15, x40 at 20.** PROVISIONAL. *Reason a player sees: every level-up makes your hit, your HP bar and your armour a fifth bigger, every time, and by level 20 a rifle shot that was 28 is past a thousand.*

It is read by every amount a character deals (the `weapon`, `melee`, `blade`, `gun`, `thrown`, `sigil`, `elemental`, `soul`, `blessing`, `flat`, `figment` profiles), by max HP, by armour and by Guard's soak. **`scale` stops being a second column:** it names `deal` (today it is the "new deal over the old" of rules 1.36, a correction for a column that no longer differs; two columns with one meaning is a second copy of a rule). The physical, elemental, healing and blessing profiles that read `scale` today read `deal`.

### 2.2 Heals and shields: `mend` = deal x the growth of a normal bar

`mend(L) = deal(L) x (90 + 3 x (L - 1)) / 90`, x65 at level 20. PROVISIONAL. *Reason: a heal that closes a third of a friend's bar at level 1 closes a third of it at level 20; a normal-share character's bar (Endurance 4, Pain Threshold 4) grows by its per-level HP on top of the column, so the heal does too.* The percent gates (`min_pct`, a share of the target's max HP) are unit-free and stay; the HP they count up to becomes `gate.hp` 90 (the new normal bar at level 1) x `mend`, not x `scale`.

### 2.3 Enemy damage and armour

- **damage_mult(L) = 60 ^ ((L - 1) / 19)**, x60 at 20. PROVISIONAL. *Reason: your armour grows with its grade (x1.15 to x1.75) and takes a flat number off every hit; if a Soldier's rifle grew only with the level, a Heavy plate in Celestial grade would stop nine tenths of it at level 20. x60 is the level column times the armour grade one step under the stage's best (Relic, x1.5), so a same-level Soldier lands about the same share of your bar at 20 as at 1.* A Figment's HP grows by this column too (`figments.json level.hp: ["damage_mult"]`): it is built to take those hits.
- **armour_mult(L) = deal(L)**, x40. *Reason: an enemy's plate keeps its bite against a plain level-matched hit; your Strength, skill and grade cut through it.* A dabbler at level 20 loses about a fifth of a pistol shot to a Soldier's plate; a specialist loses a twentieth.
- **Each tier's `damage` x1.28** (vermin 0.64, minion 1.28, Soldier 1.0, Elite 1.34, Boss 1.54). PROVISIONAL. *Reason: the charter's frail character takes three to four hits from a level-1 Soldier (18 a shot against 60 HP, 15 through Light armour: four); today it takes four to five.* This is the one deliberate change in the hit counts against characters.

### 2.4 Enemy HP: `hp_mult` = 90 ^ ((L - 1) / 19)

x2.58 at 5, x8.43 at 10, x27.5 at 15, x90 at 20 (x1.267 a level). PROVISIONAL. The working (T2b): the charter writes enemies for one expected attacker, a specialist in the grade one step under the stage's best. That attacker's plain hit grows by the level column (x40), by its Attribute and skill reaching 10 (x1.16, the mean of the maul and the rifle), and by its grade (Relic x1.5): x70 at level 20. x90 makes a level-20 fight about 1.3 times as long in plain hits as a level-1 fight. *Reason a player sees: a Boss at 20 lasts long enough for a chain of seven or a stage-5 Release to be built and spent; and a character who skipped its points or its gear feels it, because the enemy is written for one who did not.* The curve stays smooth: a grade found is a jump in your damage, never cancelled by a jump in theirs. **Margins are not in it** (section 8): a master's extra quarters are the reward of skill and shorten the fight; if a stage then reads too easy, the stage changes (more foes, an Elite), never the reward (the curve, section 6).

#### T2. The new columns, levels 1 to 20

| level | deal (hits, HP, armour, soak) | mend (heals, shields) | enemy hp_mult | enemy damage_mult | enemy armour_mult | defense_plus | attack_plus | HP End 1 PT 0 | HP End 4 PT 4 | HP End 10 PT 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0 | 0 | 60 | 90 | 150 |
| 2 | 1.214 | 1.255 | 1.267 | 1.240 | 1.214 | 0 | 0 | 74 | 113 | 189 |
| 3 | 1.474 | 1.573 | 1.606 | 1.539 | 1.474 | 0 | 0 | 91 | 142 | 239 |
| 4 | 1.790 | 1.969 | 2.035 | 1.909 | 1.790 | 0 | 0 | 113 | 177 | 301 |
| 5 | 2.174 | 2.464 | 2.579 | 2.368 | 2.174 | 0 | 0 | 139 | 222 | 378 |
| 6 | 2.640 | 3.080 | 3.268 | 2.937 | 2.640 | 0 | 0 | 172 | 277 | 475 |
| 7 | 3.206 | 3.847 | 4.141 | 3.644 | 3.206 | 0 | 0 | 212 | 346 | 596 |
| 8 | 3.893 | 4.801 | 5.248 | 4.520 | 3.893 | 0 | 0 | 261 | 432 | 747 |
| 9 | 4.727 | 5.987 | 6.650 | 5.607 | 4.727 | 0 | 0 | 321 | 539 | 936 |
| 10 | 5.739 | 7.461 | 8.427 | 6.955 | 5.739 | 0 | 0 | 396 | 672 | 1,171 |
| 11 | 6.969 | 9.292 | 10.679 | 8.627 | 6.969 | 0 | 0 | 488 | 836 | 1,464 |
| 12 | 8.463 | 11.566 | 13.533 | 10.702 | 8.463 | 0 | 0 | 601 | 1,041 | 1,828 |
| 13 | 10.276 | 14.387 | 17.150 | 13.275 | 10.276 | 0 | 0 | 740 | 1,295 | 2,281 |
| 14 | 12.478 | 17.885 | 21.733 | 16.468 | 12.478 | 0 | 0 | 911 | 1,610 | 2,845 |
| 15 | 15.152 | 22.223 | 27.540 | 20.428 | 15.152 | 0 | 0 | 1,121 | 2,000 | 3,546 |
| 16 | 18.399 | 27.598 | 34.900 | 25.340 | 18.399 | 0 | 0 | 1,380 | 2,484 | 4,416 |
| 17 | 22.341 | 34.256 | 44.226 | 31.433 | 22.341 | 0 | 0 | 1,698 | 3,083 | 5,496 |
| 18 | 27.128 | 42.501 | 56.044 | 38.992 | 27.128 | 0 | 0 | 2,089 | 3,825 | 6,836 |
| 19 | 32.941 | 52.706 | 71.021 | 48.369 | 32.941 | 0 | 0 | 2,569 | 4,744 | 8,499 |
| 20 | 40.000 | 65.333 | 90.000 | 60.000 | 40.000 | 0 | 0 | 3,160 | 5,880 | 10,560 |

Today, for comparison: deal x7.50, scale x4.69, mend x11.97 at level 20; enemy hp_mult x8.48, damage_mult x8.53, defense_plus 6, attack_plus 6.

#### T2b. The enemy HP column's working (the expected attacker: a specialist, gear one grade under the stage's best)

| level | main attr = skill | expected grade | deal | stat growth (melee and gun mean) | grade x | attacker growth | enemy hp_mult | fight length vs level 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 7 | standard | 1.00 | 1.000 | 1.0 | 1.0 | 1.0 | 1.00 |
| 5 | 7 | standard | 2.17 | 1.000 | 1.0 | 2.2 | 2.6 | 1.19 |
| 10 | 9 | fine | 5.74 | 1.108 | 1.15 | 7.3 | 8.4 | 1.15 |
| 15 | 9 | masterwork | 15.15 | 1.108 | 1.3 | 21.8 | 27.5 | 1.26 |
| 20 | 10 | relic | 40.00 | 1.162 | 1.5 | 69.7 | 90.0 | 1.29 |


### 2.5 Defense and to-hit are level-free; the gap rule does the levels

`defense_plus` and `attack_plus` go to 0 at every level (today +6 each at 20, `enemies.json:214` table). *Reason: today an enemy's Defense rises with the level exactly as a character's skill does, so seven points of Dexterity buy nothing against a same-level foe; level-free, every point is a Margin (section 8).* The roll is bounded: modifiers run -2 to +9 from skill, +3 from grade, a few from perks, against Defense 10 to 16, so a d20 still decides.

The **level gap** (`enemies.json:199` `gap`: +1 to hit for each level between an enemy and a character, for the higher, and -1 for the lower, to 5; `combat.ts:736-742`) **stays and becomes the only place a level touches the roll.** With enemy levels from the stage (the curve, Law 6), a squad that took the long road is +2 or +3 against the stage: two or three more faces of the die land and each lands a Margin sooner. A squad that rushed is -2: misses and no Margins. The one-hit rule five levels down and the Elite and Boss guard stay as they are (section 9).

## 3. The one factor, and every base number

### 3.1 Why one factor, x0.6

The charter proposed weapon bases x0.45 (a rifle 14, a maul 20) and HP x0.6 (60 for Endurance 1). I checked both and moved the first, with this working:

- Damage and HP sit on two different sides: what a character deals is measured against an enemy's HP, what an enemy deals against a character's HP. The unit is free; only the two ratios matter (hits to kill, hits to survive). Two factors are harmless only if every number belongs to one side.
- Many numbers belong to both: a barrel's blast, burning, a trap, a hazard, cover's HP, a Figment that hits and is hit, Guard's soak against an enemy's hit, a shield against either. With x0.45 on what characters deal and x0.6 on bars, each of those needs a side, and every one put on the wrong side moves a fight by a third without anyone choosing it.
- **x0.6 on everything keeps every count of hits exactly where it is today**, so the only changes a player feels are the ones this file names (the cards, the grades, Margins, the frail character's four Soldier hits, the columns). That is the meaning of "make no mistake" here.
- The digits rule holds with x0.6 (T3b, T7): every plain hit at level 1 is one or two digits except the rocket tubes and the satchel (below); every specialist's plain hit at level 20 is four digits; a full Momentum chain is five.

So the charter's reference hits become: a specialist's two-handed blow **63** at level 1 and **5,417** at 20 (charter: about 40 and 4,000); a rifle shot **28** and **2,110** (charter: about 18 and 1,400); a x7 Coup **29,905** (charter: above 20,000). Each is the same digits.

### 3.2 Weapons: every row x0.6, rounded half up, no row bumped

- A number: `round_half_up(old x 0.6)`. A shotgun band: each band the same. A bow formula: base and per-point each (recurve `12 + 3*raw_power`, longbow `15 + 4*raw_power`). `splash_damage` the same (60 to 36).
- **No row is bumped to keep a strict order.** 18 pairs of rows in one category meet on one new number (listed in T3); every one was under a tenth apart today (2.4% to 6.2%), a gap no player could feel by Leon's rule, and those rows still differ in AP, range, magazine, accuracy, price and their maker's line. Bumping instead pushed 28 rows up by a point and cascaded (a maul at 28, not 27).
- **The rocket tubes and the satchel charge stay three digits at level 1** (the siege tube 78 x 1.388 = 108 for a normal share). *Reason: a one-shot rocket is the level-1 "something super", one digit above a plain hit as five digits is above four at level 20.* PROVISIONAL; if the lead wants every level-1 hit under 100, the three tube rows and the satchel take x0.5 instead.
- The 72 rows Items 2.0 added are inside the 144 and take the same rule.

**New profiles on the rows** (the cards, section 4): every gun's `phys.scales_with` becomes empty (Agility no longer) and it reads Dexterity at +4% through the `gun` profile; the 17 light blades that scale with Agility today take a new `blade` profile (Dexterity +4%); the 6 light melee rows that scale with Strength (axes, hammers, the pick) stay on `melee`; shields keep Endurance on `melee` (the Bulwark's attribute is its shield blow's size; the Endurance card gains the line); the 6 thrown rows take a new `thrown` profile (Dexterity +4%); bows and focus weapons keep the `weapon` profile (k 1.5, no slope; a bow's draw is its Raw Power formula).

#### T3. Every weapon row, old and new (weapons.json damage x F, rounded half up)

| category | id | damage today | damage new | profile today (scales_with) | profile new |
| --- | --- | --- | --- | --- | --- |
| bow | recurve_bow | 20 + 5*raw_power | 12 + 3*raw_power | weapon (agility) | weapon (no slope, k 1.5) |
| bow | repeating_crossbow | 22 | 13 | weapon (agility) | weapon (no slope, k 1.5) |
| bow | short_bow | 24 | 14 | weapon (agility) | weapon (no slope, k 1.5) |
| bow | longbow | 25 + 6*raw_power | 15 + 4*raw_power | weapon (agility) | weapon (no slope, k 1.5) |
| bow | crossbow | 55 | 33 | weapon (agility) | weapon (no slope, k 1.5) |
| bow | arbalest | 72 | 43 | weapon (agility) | weapon (no slope, k 1.5) |
| heavy | breacher_tube | 110 | 66 | gun (agility) | gun (Dexterity) |
| heavy | legion_siege_tube | 130 | 78 | gun (agility) | gun (Dexterity) |
| heavy | lumeri_votive_torch | 16 | 10 | gun (agility) | gun (Dexterity) |
| heavy | purifier_flamer | 20 | 12 | gun (agility) | gun (Dexterity) |
| heavy | hellraiser_spinner | 20 | 12 | gun (agility) | gun (Dexterity) |
| heavy | hellraiser_rotary | 22 | 13 | gun (agility) | gun (Dexterity) |
| heavy | hellraiser_twin_rotary | 22 | 13 | gun (agility) | gun (Dexterity) |
| heavy | lumeri_cathedral_burner | 24 | 14 | gun (agility) | gun (Dexterity) |
| heavy | hellraiser_lmg | 25 | 15 | gun (agility) | gun (Dexterity) |
| heavy | smetanita_snub_launcher | 36 | 22 | gun (agility) | gun (Dexterity) |
| heavy | smetanita_thumper | 40 | 24 | gun (agility) | gun (Dexterity) |
| heavy | smetanita_drum_launcher | 40 | 24 | gun (agility) | gun (Dexterity) |
| heavy | blackpoint_carbine | 54 | 32 | gun (agility) | gun (Dexterity) |
| heavy | blackpoint_700 | 66 | 40 | gun (agility) | gun (Dexterity) |
| heavy | legion_throwaway_tube | 90 | 54 | gun (agility) | gun (Dexterity) |
| heavy_melee | lance | 32 | 19 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | lowland_chopper | 33 | 20 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | kemizuchi_sword_breaker | 33 | 20 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | legion_rank_sword | 34 | 20 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | ork_machete | 35 | 21 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | glaive | 36 | 22 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | broadback_sabre | 36 | 22 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | ork_cleaver_glaive | 37 | 22 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | ork_rip_saw | 38 | 23 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | war_axe | 40 | 24 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | long_draw | 41 | 25 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | adamantile_greatsword | 42 | 25 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | maul | 45 | 27 | melee (strength) | melee (strength and Raw Power) |
| heavy_melee | ork_wreck_saw | 46 | 28 | melee (strength) | melee (strength and Raw Power) |
| light_melee | throwing_knives | 12 | 7 | melee (agility) | blade (Dexterity) |
| light_melee | combat_knife | 15 | 9 | melee (agility) | blade (Dexterity) |
| light_melee | afterword | 15 | 9 | melee (agility) | blade (Dexterity) |
| light_melee | legion_leaf_dagger | 16 | 10 | melee (agility) | blade (Dexterity) |
| light_melee | pitch_axe | 17 | 10 | melee (agility) | blade (Dexterity) |
| light_melee | ork_skinner | 17 | 10 | melee (agility) | blade (Dexterity) |
| light_melee | trench_knife | 18 | 11 | melee (strength) | melee (strength and Raw Power) |
| light_melee | short_draw | 18 | 11 | melee (agility) | blade (Dexterity) |
| light_melee | war_pick | 18 | 11 | melee (agility) | blade (Dexterity) |
| light_melee | legion_gladius | 19 | 11 | melee (agility) | blade (Dexterity) |
| light_melee | kemizuchi_duelling_blade | 19 | 11 | melee (agility) | blade (Dexterity) |
| light_melee | sabre | 20 | 12 | melee (agility) | blade (Dexterity) |
| light_melee | katana | 20 | 12 | melee (agility) | blade (Dexterity) |
| light_melee | dock_cutter | 21 | 13 | melee (strength) | melee (strength and Raw Power) |
| light_melee | kemizuchi_side_sword | 21 | 13 | melee (strength) | melee (strength and Raw Power) |
| light_melee | hatchet | 22 | 13 | melee (strength) | melee (strength and Raw Power) |
| light_melee | legion_spear | 22 | 13 | melee (agility) | blade (Dexterity) |
| light_melee | ork_snarl_knife | 22 | 13 | melee (agility) | blade (Dexterity) |
| light_melee | war_hammer | 23 | 14 | melee (strength) | melee (strength and Raw Power) |
| light_melee | adamantile_longsword | 23 | 14 | melee (strength) | melee (strength and Raw Power) |
| light_melee | adamantile_plate_needle | 24 | 14 | melee (agility) | blade (Dexterity) |
| light_melee | throwing_javelins | 24 | 14 | melee (agility) | blade (Dexterity) |
| light_melee | throwing_darts | 9 | 5 | melee (agility) | blade (Dexterity) |
| mana | emanator_gauntlet | 18 | 11 | weapon (strength) | weapon (no slope, k 1.5) |
| mana | spellslinger_pistol | 22 | 13 | weapon (agility) | weapon (no slope, k 1.5) |
| mana | bot_thread_banner | 24 | 14 | weapon (agility) | weapon (no slope, k 1.5) |
| mana | grand_staff | 24 | 14 | weapon (agility) | weapon (no slope, k 1.5) |
| mana | evoker_blade | 26 | 16 | weapon (agility) | weapon (no slope, k 1.5) |
| mana | emanator_katana | 26 | 16 | weapon (agility) | weapon (no slope, k 1.5) |
| mana | core_rifle | 29 | 17 | weapon (agility) | weapon (no slope, k 1.5) |
| mana | lumeri_censer_gun | {within_4: 30, within_8: 18} | {within_4: 18, within_8: 11} | weapon (agility) | weapon (no slope, k 1.5) |
| pistol | whisper_pistol | 15 | 9 | gun (agility) | gun (Dexterity) |
| pistol | smetanita_pocket_pistol | 15 | 9 | gun (agility) | gun (Dexterity) |
| pistol | parlour_pistol | 16 | 10 | gun (agility) | gun (Dexterity) |
| pistol | decrkm_autopistol | 17 | 10 | gun (agility) | gun (Dexterity) |
| pistol | mandestra_drum_pistol | 18 | 11 | gun (agility) | gun (Dexterity) |
| pistol | service_pistol | 20 | 12 | gun (agility) | gun (Dexterity) |
| pistol | smetanita_service_pistol | 21 | 13 | gun (agility) | gun (Dexterity) |
| pistol | magistrate_pistol | 26 | 16 | gun (agility) | gun (Dexterity) |
| revolver | snub_revolver | 26 | 16 | gun (agility) | gun (Dexterity) |
| revolver | drifter_revolver | 28 | 17 | gun (agility) | gun (Dexterity) |
| revolver | smetanita_hand_cannon | 36 | 22 | gun (agility) | gun (Dexterity) |
| revolver | frontier_hand_cannon | 38 | 23 | gun (agility) | gun (Dexterity) |
| rifle | adcorp_short_carbine | 27 | 16 | gun (agility) | gun (Dexterity) |
| rifle | legion_bullpup | 28 | 17 | gun (agility) | gun (Dexterity) |
| rifle | hellraiser_trench_carbine | 28 | 17 | gun (agility) | gun (Dexterity) |
| rifle | adamantile_carbine | 28 | 17 | gun (agility) | gun (Dexterity) |
| rifle | hellraiser_service_rifle | 30 | 18 | gun (agility) | gun (Dexterity) |
| rifle | adamantile_battle_rifle | 30 | 18 | gun (agility) | gun (Dexterity) |
| rifle | adcorp_line_rifle | 30 | 18 | gun (agility) | gun (Dexterity) |
| rifle | arsenal_piston_rifle | 30 | 18 | gun (agility) | gun (Dexterity) |
| rifle | chezknov_battle_rifle | 31 | 19 | gun (agility) | gun (Dexterity) |
| rifle | albert_town_brush_carbine | 31 | 19 | gun (agility) | gun (Dexterity) |
| rifle | lever_carbine | 32 | 19 | gun (agility) | gun (Dexterity) |
| rifle | legion_marksman_rifle | 32 | 19 | gun (agility) | gun (Dexterity) |
| rifle | albert_town_service_rifle | 32 | 19 | gun (agility) | gun (Dexterity) |
| rifle | ccec_marksman_rifle | 33 | 20 | gun (agility) | gun (Dexterity) |
| rifle | adcorp_designated_rifle | 34 | 20 | gun (agility) | gun (Dexterity) |
| rifle | chezknov_precision_rifle | 35 | 21 | gun (agility) | gun (Dexterity) |
| rifle | adamantile_heavy_rifle | 36 | 22 | gun (agility) | gun (Dexterity) |
| rifle | arsenal_heavy_rifle | 38 | 23 | gun (agility) | gun (Dexterity) |
| rifle | albert_town_stalking_rifle | 44 | 26 | gun (agility) | gun (Dexterity) |
| rifle | long_rifle | 47 | 28 | gun (agility) | gun (Dexterity) |
| shield | deflector | 12 | 7 | melee (endurance) | melee (endurance and Raw Power) |
| shield | buckler | 15 | 9 | melee (endurance) | melee (endurance and Raw Power) |
| shield | bulwark_screen | 15 | 9 | melee (endurance) | melee (endurance and Raw Power) |
| shield | barrier_wall | 15 | 9 | melee (endurance) | melee (endurance and Raw Power) |
| shield | riot_shield | 20 | 12 | melee (endurance) | melee (endurance and Raw Power) |
| shield | pavise | 20 | 12 | melee (endurance) | melee (endurance and Raw Power) |
| shield | spiked_buckler | 20 | 12 | melee (endurance) | melee (endurance and Raw Power) |
| shield | boss_shield | 25 | 15 | melee (endurance) | melee (endurance and Raw Power) |
| shield | ram_plate | 30 | 18 | melee (endurance) | melee (endurance and Raw Power) |
| shotgun | lumeri_hand_scatter | {within_4: 36, within_8: 15} | {within_4: 22, within_8: 9} | gun (agility) | gun (Dexterity) |
| shotgun | brigade_shot_pistol | {within_4: 38, within_8: 14} | {within_4: 23, within_8: 8} | gun (agility) | gun (Dexterity) |
| shotgun | brigade_auto_shotgun | {within_4: 40, within_8: 24} | {within_4: 24, within_8: 14} | gun (agility) | gun (Dexterity) |
| shotgun | brigade_drum_shotgun | {within_4: 40, within_8: 24} | {within_4: 24, within_8: 14} | gun (agility) | gun (Dexterity) |
| shotgun | lumeri_scattergun | {within_4: 40, within_8: 25} | {within_4: 24, within_8: 15} | gun (agility) | gun (Dexterity) |
| shotgun | fowling_gun | {within_4: 40, within_8: 30} | {within_4: 24, within_8: 18} | gun (agility) | gun (Dexterity) |
| shotgun | lumeri_long_scatter | {within_4: 40, within_8: 30} | {within_4: 24, within_8: 18} | gun (agility) | gun (Dexterity) |
| shotgun | sawn_off | {within_4: 42, within_8: 15} | {within_4: 25, within_8: 9} | gun (agility) | gun (Dexterity) |
| shotgun | coach_gun | {within_4: 45, within_8: 25} | {within_4: 27, within_8: 15} | gun (agility) | gun (Dexterity) |
| smg | whisper_smg | 16 | 10 | gun (agility) | gun (Dexterity) |
| smg | decrkm_smg | 19 | 11 | gun (agility) | gun (Dexterity) |
| smg | mandestra_drum_gun | 19 | 11 | gun (agility) | gun (Dexterity) |
| smg | whisper_carbine | 19 | 11 | gun (agility) | gun (Dexterity) |
| smg | arsenal_courier_pdw | 19 | 11 | gun (agility) | gun (Dexterity) |
| smg | legion_pdw | 20 | 12 | gun (agility) | gun (Dexterity) |
| smg | chezknov_machine_carbine | 20 | 12 | gun (agility) | gun (Dexterity) |
| smg | decrkm_carbine | 21 | 13 | gun (agility) | gun (Dexterity) |
| smg | mandestra_drum_rifle | 21 | 13 | gun (agility) | gun (Dexterity) |
| thrown | smoke_grenade | 0 | 0 | weapon (agility) | thrown (Dexterity) |
| thrown | flashbang | 0 | 0 | weapon (agility) | thrown (Dexterity) |
| thrown | bot_scrambler | 0 | 0 | weapon (agility) | thrown (Dexterity) |
| thrown | satchel_charge | 120 | 72 | weapon (agility) | thrown (Dexterity) |
| thrown | incendiary_grenade | 15 | 9 | weapon (agility) | thrown (Dexterity) |
| thrown | frag_grenade | 40 | 24 | weapon (agility) | thrown (Dexterity) |
| unarmed | fists | 10 | 6 | melee (strength) | melee (strength and Raw Power) |
| unarmed | hand_wraps | 14 | 8 | melee (strength) | melee (strength and Raw Power) |
| unarmed | striking_gloves | 17 | 10 | melee (agility) | melee (agility and Raw Power) |
| unarmed | beast_bite | 18 | 11 | weapon (strength) | weapon (no slope, k 1.5) |
| unarmed | kemizuchi_strikers | 19 | 11 | melee (agility) | melee (agility and Raw Power) |
| unarmed | knuckledusters | 20 | 12 | melee (strength) | melee (strength and Raw Power) |
| unarmed | weighted_gloves | 22 | 13 | melee (strength) | melee (strength and Raw Power) |
| unarmed | hellraiser_piston_knuckles | 24 | 14 | melee (agility) | melee (agility and Raw Power) |
| unarmed | iron_mitts | 25 | 15 | melee (strength) | melee (strength and Raw Power) |
| unarmed | figment_edge | 25 | 15 | weapon (strength) | weapon (no slope, k 1.5) |
| unarmed | hellraiser_servo_fist | 30 | 18 | melee (strength) | melee (strength and Raw Power) |
| unarmed | figment_claws | 30 | 18 | weapon (strength) | weapon (no slope, k 1.5) |
| unarmed | hellraiser_door_knocker | 34 | 20 | melee (strength) | melee (strength and Raw Power) |

Rows of one category that meet on one new number: 18 (the gap between them today in the last column)

| category | lower row | today | higher row | today | new (both) | gap today |
| --- | --- | --- | --- | --- | --- | --- |
| pistol | parlour_pistol | 16 | decrkm_autopistol | 17 | 10 | 6.2% |
| rifle | chezknov_battle_rifle | 31 | lever_carbine | 32 | 19 | 3.2% |
| rifle | chezknov_battle_rifle | 31 | legion_marksman_rifle | 32 | 19 | 3.2% |
| rifle | chezknov_battle_rifle | 31 | albert_town_service_rifle | 32 | 19 | 3.2% |
| rifle | ccec_marksman_rifle | 33 | adcorp_designated_rifle | 34 | 20 | 3.0% |
| light_melee | legion_leaf_dagger | 16 | pitch_axe | 17 | 10 | 6.2% |
| light_melee | legion_leaf_dagger | 16 | ork_skinner | 17 | 10 | 6.2% |
| light_melee | trench_knife | 18 | legion_gladius | 19 | 11 | 5.6% |
| light_melee | trench_knife | 18 | kemizuchi_duelling_blade | 19 | 11 | 5.6% |
| light_melee | dock_cutter | 21 | hatchet | 22 | 13 | 4.8% |
| light_melee | dock_cutter | 21 | legion_spear | 22 | 13 | 4.8% |
| light_melee | dock_cutter | 21 | ork_snarl_knife | 22 | 13 | 4.8% |
| light_melee | war_hammer | 23 | adamantile_plate_needle | 24 | 14 | 4.3% |
| light_melee | war_hammer | 23 | throwing_javelins | 24 | 14 | 4.3% |
| heavy_melee | lowland_chopper | 33 | legion_rank_sword | 34 | 20 | 3.0% |
| heavy_melee | glaive | 36 | ork_cleaver_glaive | 37 | 22 | 2.8% |
| heavy_melee | long_draw | 41 | adamantile_greatsword | 42 | 25 | 2.4% |
| unarmed | beast_bite | 18 | kemizuchi_strikers | 19 | 11 | 5.6% |

Meetings where the gap today was a tenth or more (a gap a player could feel): 0

| id | splash_damage today | new |
| --- | --- | --- |
| breacher_tube | 60 | 36 |
| legion_throwaway_tube | 60 | 36 |
| legion_siege_tube | 60 | 36 |


#### T3b. The digits rule by category: the strongest row of each, a plain hit (no Margins; a bow at Raw Power 10)

| category | strongest row | new base | profile | L1 at 1/0 | L1 at 4/4 | L1 at 7/7 | L20 at 10/10, Celestial |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bow | longbow | 55 | weapon | 82 | 82 | 82 | 5,775 |
| heavy | legion_siege_tube | 78 | gun | 93 | 108 | 119 | 9,143 |
| heavy_melee | ork_wreck_saw | 28 | melee | 33 | 50 | 65 | 5,618 |
| light_melee | war_hammer | 14 | melee | 17 | 25 | 33 | 2,809 |
| mana | lumeri_censer_gun | 18 | weapon | 27 | 27 | 27 | 1,890 |
| pistol | magistrate_pistol | 16 | gun | 19 | 22 | 24 | 1,876 |
| revolver | frontier_hand_cannon | 23 | gun | 28 | 32 | 35 | 2,696 |
| rifle | long_rifle | 28 | gun | 33 | 39 | 43 | 3,282 |
| shield | ram_plate | 18 | melee | 21 | 32 | 42 | 3,611 |
| shotgun | coach_gun | 27 | gun | 32 | 37 | 41 | 3,165 |
| smg | decrkm_carbine | 13 | gun | 16 | 18 | 20 | 1,524 |
| thrown | satchel_charge | 72 | thrown | 65 | 76 | 83 | 6,387 |
| unarmed | hellraiser_door_knocker | 20 | melee | 24 | 36 | 47 | 4,013 |


### 3.3 Every other flat number in data: x0.6

The rule, so that nothing stays on the old scale:

| Kind | Rule | Data keys |
| --- | --- | --- |
| A flat amount (damage, heal, shield, HP, armour, soak, tick, splash, a price in HP) | x0.6, kept to two places (an `amounts` base is not rounded to a whole number: the formula floors at the end) | every `amounts.<key>.base`; every `per[]` value that counts a thing (Momentum, kg, charge, Guard, Devotion, armour value, Improvisation, mastery, forms); `damage`, `hp`, `heal`, `shield`, `armour`, `tick`, `tick_damage`, `splash_damage`, `melee_damage`, `burn_per_point`, `hp_per_step`, `self_damage`, `soak`, `heal_enemy`, `shield_enemy`, `boss_damage`, `damage_per_flux_over`, `hp_per_point`; the `value` of every `heal`, `shield`, `damage` op and every `stat_mod` on `hp` |
| A share of something | unchanged (unit-free) | a `per[]` of `event:*`, `self:max_hp`, `max_hp`, `res:ledger`, `damage`; every `*_pct`, `*_share`, `*_mult`, `hp_frac`, `min_pct`, `cap_pct`, `stim_pct`, `if.*_hp_*` |
| A per-level HP number | x0.25, Pain Threshold's rate (2 a point a level becomes 0.5) | `traits.json` `derived.hp_per_level` (-2 on Oil in My Mind and Oil in My Soul becomes -0.5) |
| An enemy tier's `damage` | x1.28 (section 2.3) | `enemies.json items[].damage` |
| A count | unchanged | plates, pips, glyphs, charges, Strain, Echo, Devotion, Flux, cores |

T4 lists every number the rule touches outside `weapons.json` (188, plus the named rows), with today's value and the new one:

#### T4. Every other flat number of damage, HP, healing, shield, armour and soak: x F, rounded as its file rounds

| file | path | today | new |
| --- | --- | --- | --- |
| classes.json | .base[fighter].gain[launch].amounts.launch.base | 22 | 13 |
| classes.json | .base[fighter].gain[launch].amounts.launch.per[0](res:momentum) | 5.5 | 3.3 |
| classes.json | .base[fighter].gain[into_the_wall].amounts.slam.base | 12 | 7.2 |
| classes.json | .base[fighter].gain[hurl].amounts.hurl.base | 10 | 6.0 |
| classes.json | .base[fighter].gain[hurl].amounts.hurl.per[0](kg) | 0.25 | 0.15 |
| classes.json | .base[trickster].ranks.II.moves[overclock].amounts.strain.base | 5 | 3.0 |
| classes.json | .base[bard].ranks.I.moves[ledger].amounts.cap.base | 6.5 | 3.9 |
| classes.json | .base[bard].ranks.III.moves[rally].amounts.heal.base | 3.1 | 1.86 |
| classes.json | .base[guardian].ranks.I.moves[ward].amounts.ward.base | 10 | 6.0 |
| classes.json | .base[guardian].ranks.I.moves[smite].amounts.smite.base | 20 | 12 |
| classes.json | .base[guardian].ranks.I.moves[smite].amounts.smite_storm.base | 20 | 12 |
| classes.json | .base[guardian].gain[amen].amounts.amen.base | 10 | 6.0 |
| classes.json | .move_pool.moves[triage].amounts.heal.base | 4.3 | 2.58 |
| classes.json | .move_pool.moves[ward].amounts.shield.per[0](charge) | 10 | 6.0 |
| classes.json | .move_pool.moves[rewrite].amounts.shield_turned.base | 30 | 18 |
| classes.json | .move_pool.moves[sanctuary].amounts.sanctuary_cap.base | 40 | 24 |
| classes.json | .move_pool.moves[inspire].amounts.love.base | 1.9 | 1.14 |
| classes.json | .move_pool.moves[field_fix].amounts.repair.base | 15 | 9.0 |
| classes.json | .advanced[banner_dancer].moves[rally_banner].amounts.shield.base | 10 | 6.0 |
| classes.json | .advanced[banner_dancer].moves[rally_banner].effects[0].value | 10 | 6.0 |
| classes.json | .advanced[banner_dancer].moves[sweep].amounts.heal.base | 10 | 6.0 |
| classes.json | .advanced[banner_dancer].moves[sweep].effects[1].value | 10 | 6.0 |
| classes.json | .advanced[rtc_contractor].moves[strike_call].amounts.damage.base | 50 | 30 |
| classes.json | .advanced[siege_engineer].moves[deploy_cover].effects[0].hp | 40 | 24 |
| classes.json | .advanced[siege_engineer].moves[sentry_turret].amounts.damage.base | 20 | 12 |
| classes.json | .advanced[siege_engineer].moves[sentry_turret].effects[0].hp | 40 | 24 |
| classes.json | .advanced[storm_hand].moves[gauntlet_infusion].amounts.damage.base | 10 | 6.0 |
| classes.json | .advanced[storm_hand].moves[gauntlet_infusion].amounts.fire_extra.base | 5 | 3.0 |
| classes.json | .advanced[storm_hand].moves[gauntlet_infusion].amounts.arc.base | 5 | 3.0 |
| classes.json | .advanced[storm_hand].moves[discharge].amounts.damage.per[0](charge) | 20 | 12 |
| classes.json | .advanced[adamantile_knight].moves[adamantile_plate].amounts.shield.per[0](guard) | 10 | 6.0 |
| classes.json | .advanced[adamantile_knight].moves[bulwark_of_will].amounts.shield.base | 20 | 12 |
| classes.json | .advanced[adamantile_knight].moves[bulwark_of_will].effects[0].value | 20 | 12 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.lava.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.storm.base | 15 | 9.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.dome.base | 20 | 12 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.mend.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.crush.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.tripwire.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.mortar.base | 15 | 9.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.mortar_splash.base | 5 | 3.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.sentinel.base | 15 | 9.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.sentinel_leaving.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.bloodwell.base | 5 | 3.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.arc.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.bloom.base | 10 | 6.0 |
| classes.json | .advanced[vessel].moves[inner_charge].amounts.heartbeat.per[0](forms) | 10 | 6.0 |
| classes.json | .advanced[vessel].moves[release_strike].amounts.damage.base | 15 | 9.0 |
| conditions.json | .items[bleeding].amounts.tick.base | 5 | 3.0 |
| conditions.json | .items[bleeding].effects[0].value | -5 | -3.0 |
| conditions.json | .items[burning].amounts.tick.base | 10 | 6.0 |
| conditions.json | .items[burning].effects[0].value | -10 | -6.0 |
| conditions.json | .items[corroded].amounts.tick.base | 5 | 3.0 |
| conditions.json | .items[corroded].effects[0].value | -5 | -3.0 |
| conditions.json | .items[given_spite].amounts.spite.base | 6 | 3.6 |
| conditions.json | .items[foe_spite].amounts.spite.base | 6 | 3.6 |
| conditions.json | .items[given_shame].amounts.shame.base | 8 | 4.8 |
| conditions.json | .items[foe_shame].amounts.shame.base | 8 | 4.8 |
| effect_ops.json | .items[deal].example.amount.base | 30 | 18 |
| effect_ops.json | .items[mend].example.amount.base | 5 | 3.0 |
| effect_ops.json | .items[heal].example.value | 20 | 12 |
| effect_ops.json | .items[companion].example.hp | 30 | 18 |
| effect_ops.json | .items[rig_tile].example.damage | 30 | 18 |
| enemies.json | .items[vermin].hp | 15 | 9.0 |
| enemies.json | .items[minion].hp | 70 | 42 |
| enemies.json | .items[soldier].hp | 140 | 84 |
| enemies.json | .items[soldier].armour | 5 | 3.0 |
| enemies.json | .items[elite].hp | 240 | 144 |
| enemies.json | .items[elite].armour | 10 | 6.0 |
| enemies.json | .items[boss].hp | 820 | 492 |
| enemies.json | .items[boss].armour | 10 | 6.0 |
| enemies.json | .companions[drone].hp | 30 | 18 |
| enemies.json | .companions[drone].armour | 5 | 3.0 |
| enemies.json | .companions[beast].hp | 60 | 36 |
| enemies.json | .companions[twin].hp | 50 | 30 |
| feelings.json | .items[rage].residue.damage | 5 | 3.0 |
| feelings.json | .items[love].residue.heal | 5 | 3.0 |
| feelings.json | .items[spite].residue.damage | 5 | 3.0 |
| feelings.json | .items[shame].pour.self_damage | 8 | 4.8 |
| feelings.json | .items[guilt].residue.heal | 5 | 3.0 |
| feelings.json | .price.hp_per_step | 8 | 4.8 |
| figments.json | .forms[double].hp | 30 | 18 |
| figments.json | .forms[eye].hp | 15 | 9.0 |
| figments.json | .forms[wall].hp | 60 | 36 |
| figments.json | .forms[wall].armour | 5 | 3.0 |
| figments.json | .forms[beast].hp | 45 | 27 |
| figments.json | .forms[beast].armour | 3 | 1.8 |
| figments.json | .forms[blade].hp | 25 | 15 |
| figments.json | .forms[snare].hp | 10 | 6.0 |
| figments.json | .forms[hand].hp | 20 | 12 |
| figments.json | .forms[ward].hp | 40 | 24 |
| figments.json | .forms[ward].armour | 3 | 1.8 |
| figments.json | .forms[husk].hp | 20 | 12 |
| figments.json | .forms[sentinel].hp | 30 | 18 |
| figments.json | .forms[sentinel].armour | 3 | 1.8 |
| figments.json | .turret.hp | 40 | 24 |
| figments.json | .turret.armour | 5 | 3.0 |
| figments.json | .verbs[figment_burst].amounts.burst.base | 20 | 12 |
| figments.json | .traits[volatile].amounts.burst.base | 20 | 12 |
| figments.json | .traits[barbed].amounts.barb.base | 10 | 6.0 |
| forks.json | .items[fork.tend.shared_pulse].amounts.pulse.base | 0.9375 | 0.56 |
| forks.json | .items[fork.momentum.spill].amounts.spill.base | 22 | 13 |
| forks.json | .items[fork.sigil.clean_vent].amounts.scorch.base | 6 | 3.6 |
| items.json | .items[mod_bayonet].melee_damage | 15 | 9.0 |
| objects.json | .items[crate].hp | 30 | 18 |
| objects.json | .items[low_wall].hp | 60 | 36 |
| objects.json | .items[pillar].hp | 80 | 48 |
| objects.json | .items[barricade].hp | 60 | 36 |
| objects.json | .items[door].hp | 40 | 24 |
| objects.json | .items[trap].trap.damage | 25 | 15 |
| objects.json | .items[fire].hazard.damage | 10 | 6.0 |
| objects.json | .items[toxic].hazard.damage | 8 | 4.8 |
| objects.json | .items[barrel].hp | 20 | 12 |
| objects.json | .items[barrel].explodes.damage | 40 | 24 |
| objects.json | .items[container].hp | 40 | 24 |
| objects.json | .items[terminal].hp | 30 | 18 |
| objects.json | .items[lamp].hp | 10 | 6.0 |
| objects.json | .items[camera].hp | 10 | 6.0 |
| objects.json | .items[alarm].hp | 10 | 6.0 |
| objects.json | .items[turret].hp | 60 | 36 |
| objects.json | .items[sigil_wall].hp | 30 | 18 |
| patrons.json | .whispers[health].effects[0].value | 8.5 | 5.1 |
| patrons.json | .whispers[protection].effects[0].value | 10 | 6.0 |
| patrons.json | .whispers[rebuke].effects[0].value | -20 | -12 |
| patrons.json | .items[nerukhan].intervention.effects[0].value | -20 | -12 |
| patrons.json | .items[nerukhan].hymns[saints_shield].effects[0].value | 34 | 20 |
| patrons.json | .items[nerukhan].hymns[judgement].effects[0].value | -56 | -34 |
| patrons.json | .items[nerukhan].hymns[absolution].effects[1].value | 19 | 11 |
| patrons.json | .items[nerukhan].miracle.effects[0].value | -130 | -78 |
| patrons.json | .items[toll_keeper].hymns[coin_for_the_ferry].effects[0].value | 11 | 6.6 |
| patrons.json | .items[toll_keeper].hymns[last_crossing].effects[0].boss_damage | 40 | 24 |
| patrons.json | .items[mother_ember].intervention.effects[0].value | 7 | 4.2 |
| patrons.json | .items[mother_ember].hymns[warm_hands].effects[0].value | 28 | 17 |
| patrons.json | .items[mother_ember].hymns[hearthlight].effects[0].effects[0].value | 9 | 5.4 |
| patrons.json | .items[mother_ember].miracle.effects[2].value | 17 | 10 |
| patrons.json | .items[old_overcast].intervention.effects[0].value | -20 | -12 |
| patrons.json | .items[old_overcast].hymns[thunderclap].effects[0].value | -20 | -12 |
| patrons.json | .items[old_overcast].hymns[lightning_rod].effects[0].value | -56 | -34 |
| patrons.json | .items[old_overcast].miracle.effects[0].value | -150 | -90 |
| perks.json | .items[field_repair].amounts.repair.base | 15 | 9.0 |
| perks.json | .items[nobody_left_behind].amounts.heal.base | 1.9 | 1.14 |
| perks.json | .items[last_charge].amounts.shield.base | 15 | 9.0 |
| perks.json | .items[last_charge].amounts.shield_by_armour.per[0](armour_value) | 3 | 1.8 |
| rules.json | .combat.attack.cover.half.hp | 30 | 18 |
| rules.json | .combat.attack.cover.full.hp | 80 | 48 |
| rules.json | .mana.sigil.flux.overload.damage_per_flux_over | 10 | 6.0 |
| rules.json | .mana.sigil.example.damage | 26 | 16 |
| rules.json | .output.amounts.flux_overload.damage.per[0](flux_over) | 10 | 6.0 |
| rules.json | .output.amounts.school_rider.heal.base | 30 | 18 |
| shadow.json | .items[shadow.rig].amounts.rig.base | 25 | 15 |
| sigils.json | .example.damage | 26 | 16 |
| sigils.json | .items[fire].damage | 30 | 18 |
| sigils.json | .items[freeze].damage | 25 | 15 |
| sigils.json | .items[shock].damage | 30 | 18 |
| sigils.json | .items[stone].damage | 35 | 21 |
| sigils.json | .items[gale].damage | 15 | 9.0 |
| sigils.json | .items[spark].damage | 15 | 9.0 |
| sigils.json | .items[acid].damage | 15 | 9.0 |
| sigils.json | .items[ward].shield | 4.3 | 2.58 |
| sigils.json | .items[ward].shield_enemy | 30 | 18 |
| sigils.json | .items[mend].heal | 15 | 9.0 |
| sigils.json | .items[mend].heal_enemy | 25 | 15 |
| sigils.json | .items[raise].barrier.hp | 30 | 18 |
| sigils.json | .items[watch].hp | 10 | 6.0 |
| soul_modules.json | .strain.burn_per_point | 8 | 4.8 |
| soul_modules.json | .aura.tick_damage | 5 | 3.0 |
| soul_modules.json | .schools[damage].damage | 40 | 24 |
| soul_modules.json | .schools[buff].heal | 11.3 | 6.78 |
| soul_modules.json | .schools[buff].heal_enemy | 30 | 18 |
| soul_modules.json | .items[inverse].shield | 7 | 4.2 |
| soul_modules.json | .items[shell].shield | 4 | 2.4 |
| soul_modules.json | .items[linger].tick | 5 | 3.0 |
| techniques.json | .rules.guard.soak | 6 | 3.6 |
| tending.json | .items[tend.snap].amounts.snap.base | 3.0 | 1.8 |
| tending.json | .items[tend.snap].amounts.snap_heal.base | 3.0 | 1.8 |
| tending.json | .items[tend.mend].amounts.heal.base | 3.75 | 2.25 |
| tending.json | .items[tend.mend_self].amounts.heal.base | 3.75 | 2.25 |
| tending.json | .items[tend.shield].amounts.shield.base | 4.5 | 2.7 |
| traits.json | .items[grenadiers_arm].amounts.damage.base | 10 | 6.0 |
| traits.json | .items[grenadiers_arm].amounts.damage.per[0](kg) | 0.25 | 0.15 |
| traits.json | .items[oil_in_my_mind].effects[4].derived.hp_per_level (a per-level HP number: at the Pain Threshold rate, x0.25) | -2 | -0.5 |
| traits.json | .items[oil_in_my_soul].effects[4].derived.hp_per_level (a per-level HP number: at the Pain Threshold rate, x0.25) | -2 | -0.5 |
| traits.json | .items[factory_made].amounts.repair.per[0](improvisation) | 10 | 6.0 |
| traits.json | .items[factory_made].effects[3].hp_per_point | 10 | 6.0 |
| traits.json | .items[drone_handler].amounts.repair.per[0](mastery) | 10 | 6.0 |
| traits.json | .items[drone_handler].effects[drone].hp | 30 | 18 |
| traits.json | .items[crawler_blooded].amounts.blessing_burn.base | 10 | 6.0 |
| traits.json | .items[beast_handler].effects[beast].hp | 60 | 36 |

| armour class | value today | new |
| --- | --- | --- |
| None | 0 | 0.0 |
| Light | 5 | 3.0 |
| Medium | 10 | 6.0 |
| Heavy | 15 | 9.0 |
| Assault | 20 | 12.0 |
| Juggernaut | 25 | 15.0 |
| Breacher plate | 18 | 10.8 |

| named number | today | new |
| --- | --- | --- |
| techniques.json rules.guard.soak (a plate, x the level column) | 6 | 3.6 |
| soul_modules.json damage.base (a character's Damage school) | 37 | 22.2 |
| soul_modules.json damage.enemy_base | 24 | 14.4 |
| rules.json mending.gate.hp (the reference bar the gate counts to) | 145 | 90 |
| patrons.json prayer.intervention.amount (base, per Devotion) | 20, 4 | 12, 2.4 |
| rules.json combat.attack.cover half / full hp | 30 / 80 | 18 / 48 |

Counted: 188 flat numbers outside weapons.json (plus the named rows above).


## 4. The Stat terms made true, and the grades

### 4.1 Slopes and `k`

Each profile's slope is its card's number; its `k` is set so a **normal share** (4 in the Attribute and 4 in the skill, the game's own `output.floor_reference`, `rules.json:1981`) deals at level 1 exactly today's number x0.6. *Reason: a character who spread its points sits where it sits today; every point above that is the card's promise, and every point below it is missing.* `k` is no longer a "pin": the notes that call it one (`rules.json:1838`, `:1848`) go. A card's promise holds whatever `k` is: a Strength point adds k x 0.10, which is +10% of the Strength-1 character's blow.

| Profile | Attribute slope | Skill slope | Data keys |
| --- | --- | --- | --- |
| `melee` (heavy melee, Strength light melee, unarmed on Strength, shields on Endurance) | +0.10 a point of the row's `scales_with` | Raw Power +0.05 | `output.profiles.melee` attr 0.10, skill 0.05, k 1.194 (`factors.melee` 1.35 folded in, then deleted); `weapons.json phys.hits_with` stays `raw_power` |
| `blade` (new row; the 17 light blades on Agility today) | none | Dexterity +0.04 | `output.profiles.blade` (new, data only): attr 0, skill 0.04, level `deal`, k 1.544 (folds the melee factor); rows' `phys.profile: "blade"`, `scales_with: []` |
| `gun` | none (Agility no longer) | Dexterity +0.04 | `output.profiles.gun` attr 0, skill 0.04, k 1.196; every gun row's `phys.scales_with: []` |
| `thrown` (new row) | none | Dexterity +0.04 | `output.profiles.thrown` (new, data only), k 0.905 (folds `factors.thrown` 0.7, then deleted) |
| `sigil` | Intelligence +0.10 | Brain Power +0.10 | `output.profiles.sigil` attr 0.10, skill 0.10, k 1.0 |
| `elemental` | Expression +0.10 | none | `output.profiles.elemental` attr 0.10, skill 0, k 0.769, level `deal`; `attributes.json` expression formula loses "+ 0.05 x Visualization" (Visualization's card never promised it) |
| `soul` | Determination +0.05 | Will Power +0.10 | `output.profiles.soul` attr 0.05, skill 0.10, k 1.0 |
| `blessing` | Virtue +0.05 | Faith +0.10 | `output.profiles.blessing` attr 0.05, skill 0.10, k 0.876, level `deal`; Virtue's card gains "+5% Blessing power" (question 3) |
| `healing`, `mend`, `tend` and the other landed heal and shield profiles | Insight +0.06 | Empathy +0.06 | unchanged slopes and `k` (as built); level `mend` |
| `figment` | none | none | k 1.35 (`factors.figment` 0.9 folded in, then deleted) |
| `physical` (Hurl, Grenadier's Arm) | Strength +0.10 | Raw Power +0.05 | level `deal` (was `scale`) |

**Cards that change words:** Dexterity's "+2% critical damage" becomes "+4% damage: guns, light blades, thrown" (`skills.json dexterity per_point.numbers.crit` 0.02 becomes `damage` 0.04); Agility's card loses nothing (it never promised damage); Endurance gains "+10% shield blows"; Virtue gains "+5% Blessing power"; Perception's "+3% critical damage" becomes Margins (section 8); Intelligence, Expression, Determination, Brain Power, Will Power and Faith become true as written.

#### T5. The Stat terms: today and new (k re-pinned so a normal share, 4 and 4, deals today's x F at level 1)

| profile | reads | attr a point | skill a point | k new | today at 4/4 | new / today at 1/0 | at 4/4 | at 7/7 | at 10/10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| melee | Strength (or the row's scales_with) and Raw Power | 0.1 | 0.05 | 1.194 | 1.791 | 1.194 / 1.558 | 1.791 / 1.791 | 2.329 / 2.025 | 2.866 / 2.259 |
| blade | Dexterity (light blades that scale with Agility today) | 0.0 | 0.04 | 1.544 | 1.791 | 1.544 / 1.558 | 1.791 / 1.791 | 1.977 / 2.025 | 2.162 / 2.259 |
| gun | Dexterity (Agility no longer) | 0.0 | 0.04 | 1.196 | 1.388 | 1.196 / 1.275 | 1.388 / 1.388 | 1.531 / 1.500 | 1.675 / 1.613 |
| thrown | Dexterity | 0.0 | 0.04 | 0.905 | 1.050 | 0.905 / 1.050 | 1.050 / 1.050 | 1.159 / 1.050 | 1.267 / 1.050 |
| sigil | Intelligence and Brain Power | 0.1 | 0.1 | 1.000 | 1.700 | 1.000 / 1.700 | 1.700 / 1.700 | 2.300 / 1.700 | 2.900 / 1.700 |
| elemental | Expression | 0.1 | 0.0 | 0.769 | 1.000 | 0.769 / 1.000 | 1.000 / 1.000 | 1.231 / 1.000 | 1.462 / 1.000 |
| soul | Determination and Will Power | 0.05 | 0.1 | 1.000 | 1.550 | 1.000 / 1.550 | 1.550 / 1.550 | 2.000 / 1.550 | 2.450 / 1.550 |
| blessing | Virtue and Faith | 0.05 | 0.1 | 0.876 | 1.358 | 0.876 / 0.956 | 1.358 / 1.358 | 1.752 / 1.702 | 2.146 / 2.046 |
| healing | Insight and Empathy (as built) | 0.06 | 0.06 | 1.392 | 1.977 | 1.392 / 1.392 | 1.977 / 1.977 | 2.478 / 2.478 | 2.979 / 2.979 |

A card's promise holds against the 1-point character: a Strength point is +10% of the Strength-1 blow (k x 0.1 over k), whatever k is.

| grade | damage x | armour x | to hit | today |
| --- | --- | --- | --- | --- |
| standard | 1.0 | 1.0 | +0 | x1 damage, +0 |
| fine | 1.15 | 1.15 | +1 | x1 damage, +1 |
| masterwork | 1.3 | 1.3 | +2 | x1 damage, +2 |
| relic | 1.5 | 1.5 | +3 | x1 damage, +2 |
| celestial | 1.75 | 1.75 | +3 | x1 damage, +2 |


### 4.2 The grade ladder, on damage and on armour

| Grade | Damage x | Armour x | To hit | Also (the charter) |
| --- | --- | --- | --- | --- |
| Standard | 1 | 1 | +0 | |
| Fine | 1.15 | 1.15 | +1 | |
| Masterwork | 1.3 | 1.3 | +2 | a mod slot more |
| Relic | 1.5 | 1.5 | +3 (today +2) | a property |
| Celestial | 1.75 | 1.75 | +3 (today +2) | two properties |

PROVISIONAL. Data keys: `rules.json rarity.<grade>.dmg`, `.arm`, `.acc` (`:1601`). *Reason: a grade is how hard the thing does what it does; Fine is a felt step (+15% and a face of the die), Celestial is three-quarters again.* The mod slot (unbuilt: `character.ts:1721` reads only the row's own `mod_slots`) and the properties belong to the Items 2.0 drafter; the text at `rules.json:1603` ("adds no damage") is rewritten.

**Magic gets a grade too** (a new general piece, section "Needs a new primitive"). Today a Sigil, an Outburst and a prayer read no grade (no reader of rarity in `sigil.ts` or `magic.ts`), so at level 20 a Sigilist would fall x1.75 behind a rifle for no reason a player can see. Proposal: a damage, heal or shield profile names where its grade comes from: `sigil` and `elemental` from the held Evoker, `soul` and `soul_mend` from the held Emanator, the weapon profiles from the weapon (as today), and **`blessing` from Devotion**: standing 3, 5, 7 and 10 count as Fine, Masterwork, Relic and Celestial. *Reason: the faithful's gear is its standing; the chase calendar puts Devotion 3 / 5 / 7 / 10 at hours 5 / 12 / 22 / 35, the same hours as Fine / Masterwork / Relic / Celestial, so a Chaplain grows as a gunner does, earned by deeds instead of credits.*

## 5. Character HP

`maxHp = round(deal(L) x (60 + 10 x (End - 1) + (L - 1) x (1 + 0.5 x PT)))`, perks and traits inside the bracket as today (`fx('hp')`, `fx('hp_per_level')`). PROVISIONAL. The numbers move from code (`character.ts:798`, `:801`) to data: `attributes.json endurance.derived[max_hp]` (base 60, `per_point_above_1` 10, per level 1) and `skills.json pain_threshold per_point.numbers.hp_per_level` (0.5). *Reasons: 60 is three to four Soldier hits for the frail and 120 at Endurance 7 is twice that (the charter); an Endurance point is a sixth of the frail bar at level 1 and still an eighth at 20; Pain Threshold is the toughness that grows: nothing at level 1, a fifteenth of the bar at 10, as much as an Endurance point at 20.* Pain Threshold's other lines (Guard soak, elemental resistance) are what its point gives at level 1.

#### T6. Character HP: deal(L) x (60 + 10 x (End - 1) + (L - 1) x (1 + 0.5 x PT)), and what one point gives

| build | L1 new (today) | L5 | L10 | L15 | L20 |
| --- | --- | --- | --- | --- | --- |
| End 1 PT 0 | 60 (100) | 139 (153) | 396 (257) | 1,121 (469) | 3,160 (914) |
| End 4 PT 2 | 90 (145) | 213 (231) | 620 (400) | 1,788 (748) | 5,120 (1,481) |
| End 4 PT 4 | 90 (145) | 222 (251) | 672 (464) | 2,000 (902) | 5,880 (1,838) |
| End 7 PT 0 | 120 (190) | 270 (267) | 740 (416) | 2,030 (717) | 5,560 (1,336) |
| End 7 PT 4 | 120 (190) | 287 (308) | 844 (544) | 2,455 (1,026) | 7,080 (2,048) |
| End 10 PT 10 | 150 (235) | 378 (427) | 1,171 (815) | 3,546 (1,614) | 10,560 (3,328) |

| level | HP at End 1 PT 0 | one Endurance point | one Pain Threshold point |
| --- | --- | --- | --- |
| 1 | 60 | +10 (16.7%) | +0 (0.0%) |
| 10 | 396 | +57 (14.5%) | +26 (6.5%) |
| 20 | 3,160 | +400 (12.7%) | +380 (12.0%) |


A save moves once (the existing `migrateCharacterHp`, `character.ts:810-816`, with a new `HP_REV`): a character keeps the same share of its new max HP as it held of the old one.

## 6. The check: six builds, levels 1 to 20

Gear by the chase calendar (the curve, section 14: Fine by hour 3, Masterwork by 8, Relic by 20, Celestial by 33, so levels 4, 7, 12, 17); a specialist's main Attribute and its alpha skill 7 at creation and 8, 9, 10 with the Attribute point after each gate (levels 6, 10, 16). Cash-outs use the Law 2 pattern (Reach 3 / 4 / 5 / 7 for Momentum and 2 / 3 / 4 / 5 for the other doors at 1 / 4 / 7 / 10 points; Bite 25 / 30 / 35% at 1 / 6 / 9; each unit 1.2 times the one before): **the door drafters' own numbers replace these columns.** Enemies are of the character's level, carrying the service rifle.

#### T7. The check: six builds against a same-level Soldier, Elite and Boss

Plain: one plain attack or cast, no Margins. A turn: 6 AP of it (the Chaplain: three pistol shots and one Smite). Cash-out: the Law 2 pattern at the door's Reach (each unit 1.2 x the one before, Bite 25 / 30 / 35%), on one plain hit. Kill: plain turns to kill one foe of that tier alone, after armour; in brackets counting misses and Margins. Survive: the same-level foe's rifle hits taken before 0 HP, after armour. Flags: D (digits: a level-1 plain hit over two digits; at level 20 a specialist's plain hit under four or its cash-out under five), E (a same-level Elite in under one turn), B (a Boss in under two turns alone), L (a Boss over twelve turns alone), F (under two Soldier hits survived).

| build | L | attr/skill | grade | armour | plain | cash-out | HP | turns: Soldier | Elite | Boss | survives: Soldier | Elite | Boss | flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Two-handed Strength specialist (maul, Momentum) | 1 | 7/7 | standard | Medium | 63 | x5: 203 | 80 | 0.7 (0.6) | 1.3 (1.2) | 4.3 (4.4) | 6.7 | 4.4 | 3.7 | - |
|  | 5 | 7/7 | fine | Medium | 157 | x5: 508 | 196 | 0.7 (0.6) | 1.3 (1.1) | 4.4 (4.1) | 7.1 | 4.6 | 3.9 | - |
|  | 10 | 9/9 | masterwork | Medium | 541 | x5: 1,951 | 672 | 0.7 (0.5) | 1.2 (0.8) | 4.1 (3.0) | 8.4 | 5.4 | 4.6 | - |
|  | 15 | 9/9 | relic | Heavy | 1,649 | x5: 5,944 | 2,106 | 0.7 (0.5) | 1.3 (0.8) | 4.3 (3.0) | 13.0 | 7.3 | 5.8 | - |
|  | 20 | 10/10 | celestial | Heavy | 5,417 | x7: 29,905 | 7,040 | 0.7 (0.4) | 1.3 (0.8) | 4.3 (2.9) | 15.7 | 8.6 | 6.8 | - |
| Rifle Dexterity specialist (service rifle, Pressure) | 1 | 7/7 | standard | Light | 28 | x4: 72 | 70 | 1.1 (1.0) | 2.2 (2.0) | 7.6 (7.5) | 4.7 | 3.3 | 2.8 | - |
|  | 5 | 7/7 | fine | Light | 69 | x4: 180 | 170 | 1.2 (0.9) | 2.2 (1.8) | 7.6 (6.9) | 4.8 | 3.4 | 2.9 | - |
|  | 10 | 9/9 | masterwork | Light | 218 | x4: 629 | 562 | 1.2 (0.8) | 2.2 (1.5) | 7.5 (5.3) | 5.5 | 3.9 | 3.3 | - |
|  | 15 | 9/9 | relic | Light | 665 | x4: 1,916 | 1,742 | 1.2 (0.8) | 2.3 (1.5) | 7.9 (5.2) | 5.8 | 4.1 | 3.5 | - |
|  | 20 | 10/10 | celestial | Light | 2,110 | x5: 7,605 | 5,880 | 1.3 (0.8) | 2.3 (1.4) | 7.9 (5.1) | 6.8 | 4.7 | 4.1 | D |
| Pistol and knife, mixed (Dexterity and Ingenuity 5/4 at L1, 8/8 at L20) | 1 | 5/5 | standard | Light | 17 | x3: 33 | 70 | 2.0 (2.0) | 4.3 (4.4) | 14.6 (16.8) | 4.7 | 3.3 | 2.8 | L |
|  | 5 | 6/6 | fine | Light | 44 | x3: 85 | 165 | 1.9 (1.6) | 3.9 (3.4) | 13.4 (12.8) | 4.7 | 3.3 | 2.9 | L |
|  | 10 | 6/6 | masterwork | Light | 133 | x3: 278 | 505 | 2.0 (1.6) | 4.1 (3.3) | 14.1 (12.3) | 4.9 | 3.5 | 3.0 | L |
|  | 15 | 7/7 | relic | Light | 418 | x4: 1,090 | 1,636 | 2.1 (1.4) | 4.0 (2.8) | 13.8 (10.4) | 5.5 | 3.8 | 3.3 | L |
|  | 20 | 8/8 | celestial | Light | 1,326 | x4: 3,462 | 5,100 | 2.1 (1.4) | 4.0 (2.6) | 13.6 (9.6) | 5.9 | 4.1 | 3.5 | L |
| Sigilist (FIRE in a Line of two, Evoker grade) | 1 | 7/7 | standard | Light | 77 | x4: 202 | 60 | 0.6 (0.5) | 1.0 (0.9) | 3.4 (3.5) | 4.0 | 2.8 | 2.4 | - |
|  | 5 | 7/7 | fine | Light | 194 | x4: 505 | 139 | 0.6 (0.5) | 1.0 (0.9) | 3.5 (3.3) | 4.0 | 2.8 | 2.4 | - |
|  | 10 | 9/9 | masterwork | Light | 678 | x4: 1,952 | 479 | 0.5 (0.4) | 0.9 (0.6) | 3.2 (2.4) | 4.7 | 3.3 | 2.8 | E |
|  | 15 | 9/9 | relic | Light | 2,066 | x4: 5,946 | 1,379 | 0.6 (0.4) | 1.0 (0.7) | 3.4 (2.4) | 4.6 | 3.2 | 2.8 | - |
|  | 20 | 10/10 | celestial | Light | 6,833 | x5: 24,630 | 4,720 | 0.6 (0.3) | 1.0 (0.6) | 3.4 (2.2) | 5.4 | 3.8 | 3.3 | E |
| Channeler (Damage school Bolt at stage 1, Emanator grade) | 1 | 7/7 | standard | Light | 44 | x4: 116 | 70 | 2.0 (1.8) | 3.7 (3.5) | 12.8 (13.0) | 4.7 | 3.3 | 2.8 | L |
|  | 5 | 7/7 | fine | Light | 111 | x4: 290 | 165 | 2.1 (1.7) | 3.8 (3.2) | 13.0 (12.0) | 4.7 | 3.3 | 2.9 | L |
|  | 10 | 9/9 | masterwork | Light | 381 | x4: 1,097 | 562 | 1.9 (1.3) | 3.5 (2.4) | 12.0 (8.8) | 5.5 | 3.9 | 3.3 | - |
|  | 15 | 9/9 | relic | Light | 1,160 | x4: 3,341 | 1,636 | 2.1 (1.3) | 3.7 (2.4) | 12.7 (8.6) | 5.5 | 3.8 | 3.3 | L |
|  | 20 | 10/10 | celestial | Light | 3,807 | x5: 13,724 | 5,500 | 2.1 (1.3) | 3.6 (2.3) | 12.4 (8.2) | 6.3 | 4.4 | 3.8 | L |
| Chaplain (pistol at Dexterity 2 plus Smite; Devotion as its grade) | 1 | 7/7 | standard | Medium | 37 | x4: 55 | 90 | 1.4 (2.0) | 2.9 (4.3) | 9.9 (16.9) | 7.5 | 4.9 | 4.2 | - |
|  | 5 | 7/7 | fine | Medium | 91 | x4: 137 | 217 | 1.5 (1.8) | 2.9 (3.8) | 9.8 (14.8) | 7.9 | 5.1 | 4.3 | - |
|  | 10 | 9/9 | masterwork | Medium | 296 | x4: 519 | 703 | 1.5 (1.7) | 2.9 (3.5) | 9.8 (13.3) | 8.8 | 5.7 | 4.8 | - |
|  | 15 | 9/9 | relic | Heavy | 902 | x4: 1,582 | 2,152 | 1.6 (1.6) | 3.0 (3.3) | 10.2 (12.5) | 13.2 | 7.4 | 6.0 | - |
|  | 20 | 10/10 | celestial | Heavy | 2,888 | x5: 6,497 | 7,060 | 1.6 (1.7) | 3.0 (3.3) | 10.2 (12.7) | 15.7 | 8.6 | 6.9 | D |

| tier | L1 | L5 | L10 | L15 | L20 |
| --- | --- | --- | --- | --- | --- |
| vermin | 9 HP, 0 armour, 12 a rifle hit | 23 HP, 0 armour, 27 a rifle hit | 76 HP, 0 armour, 80 a rifle hit | 248 HP, 0 armour, 235 a rifle hit | 810 HP, 0 armour, 691 a rifle hit |
| minion | 42 HP, 0 armour, 23 a rifle hit | 108 HP, 0 armour, 55 a rifle hit | 354 HP, 0 armour, 160 a rifle hit | 1,157 HP, 0 armour, 471 a rifle hit | 3,780 HP, 0 armour, 1,382 a rifle hit |
| soldier | 84 HP, 3 armour, 18 a rifle hit | 217 HP, 7 armour, 43 a rifle hit | 708 HP, 17 armour, 125 a rifle hit | 2,313 HP, 45 armour, 367 a rifle hit | 7,560 HP, 120 armour, 1,078 a rifle hit |
| elite | 144 HP, 6 armour, 24 a rifle hit | 371 HP, 13 armour, 57 a rifle hit | 1,214 HP, 34 armour, 168 a rifle hit | 3,966 HP, 91 armour, 494 a rifle hit | 12,960 HP, 240 armour, 1,452 a rifle hit |
| boss | 492 HP, 6 armour, 28 a rifle hit | 1,269 HP, 13 armour, 65 a rifle hit | 4,146 HP, 34 armour, 192 a rifle hit | 13,550 HP, 91 armour, 565 a rifle hit | 44,280 HP, 240 armour, 1,659 a rifle hit |


What the check says:

1. **The digits rule holds** for every plain hit at level 1 (17 to 77) and every specialist's at 20 (2,110 to 6,833; the Chaplain's pistol and Smite together 2,888). **Five digits at 20** come from the Momentum chain (29,905), the Sigil Line (24,630) and the Outburst (13,724). The rifle's Pressure cash-out (7,605) reaches five digits only with its Margins (x1.6 a shot for a level-20 specialist against a Soldier); the prayer cash-out (6,497) is landed, has no roll and so no Margins. **Flag D for the Pressure and prayer drafters:** Reach 5 at Bite 35% is a x3.6 cash-out, Momentum's x7 is x5.5.
2. **Fight length holds across the levels**: every build's turns to kill a Soldier, an Elite and a Boss alone are within a fifth of its level-1 number at 20 in plain hits; counting Margins, specialists get faster as they level (the maul's Elite from 1.2 to 0.8 turns), which is the reward.
3. **Flags E:** a Sigilist one-turns a same-level Elite at 10 and 20 (two Lines of two a turn at 2.9 Sigil power and its Evoker's grade). The Elite guard (`sigils.json:124` `elite_guard`: one Evoke never takes a full-HP Elite to nothing) still holds, so it takes two Evokes; I leave it: the Sigilist's Lines are its specialist's Reach. **Flags L:** a Boss takes the mixed character 13 to 15 turns alone and the Channeler 12 to 13 at plain stage-1 Bolts. A Boss is a party's fight; a mixed character is "more often and weaker" by the charter. No cell flags F: the frail Sigilist survives four Soldier hits at level 1 and four to five and a half later.
4. **Survive** grows with Endurance, Pain Threshold and armour, as it should: the maul specialist in Heavy plate takes 6.7 Soldier hits at 1 and 15.7 at 20; the frail Sigilist 4.0 and 5.4.
5. Margins against an Elite or Boss (Defense 12 and 13) add less than against a Soldier (11): "against an Elite the same roll just lands" (the curve, Law 2) shows in the brackets.

## 7. Costs and pools

**The rule.** AP is the clock and never scales (6 a turn, 2 to 9, perks +3 at most; `rules.json:493`, `effects/ap.ts:16-20`). A cost is paid in one of three currencies, and each has one rule:

1. **A count** (plates, chain, pips, glyphs, Flux, core charge, Strain, Echo, Devotion): never scales with the level. Its pool grows by points (Reach, Law 1) and its cost grows with what you build (Law 2). *Reason: a choice at level 1 is the same choice at 20, because both sides of it are counted in the same things.*
2. **MP**: a budget between rests (MP refills at a long rest, `rules.json rest.long.mp`; it is not refilled between fights), so it does not scale with the level either: the level grows what each MP buys (the column), points grow the pool. **Max MP stays `100 + 75 x (Det - 1) + 25 x (Ins - 1)`** (its numbers move from `character.ts:860` to data). *Reason: a Damage design with two modules is about 50 MP and its Pumps to stage 4 another 50, so a Channeler at Determination 7 (625 MP with Insight 4) holds about six full cash-outs before a syphon or a rest, and a dabbler at Determination 1 holds one: the choice is real at both ends.* Each door's MP, charge and core costs are the door drafters'; the rule they write to: **the bill grows with the Reach spent, never with the level**.
3. **HP**: a flat HP price (Strain's burn, a feeling's price, Overclock's strain, Flux overload, a feeling's self-damage) is x0.6 and rides the `deal` column (through the `flat` profile or `scaleOf`, as it does today); a share of max HP (Mana Shock 25%, Take the Weight 15%) is unit-free and stays. *Reason: a price in blood costs the same share of your bar at every level.*

#### T8. Pools and costs as data holds them today

| pool or cost | today | where | kind (section 7 of 01-scale.md) |
| --- | --- | --- | --- |
| AP a turn | 6 | rules.json combat.ap | flat: the clock |
| Max MP | 100 + 75 x (Det - 1) + 25 x (Ins - 1) (typed in character.ts:860) | character.ts MP_BASE... | grows by points only |
| Outburst school base cost | damage 20, buff 20, control 25, status 20 | soul_modules.json schools[].base_cost | flat MP; the bill grows with what is built |
| Pump | 10% of the Begin a stage reached | soul_modules.json cycle.pump_mp | share of the Begin |
| Strain limit | 3, +1 at Composure 1, 2, 4, 6, 8 | soul_modules.json strain.limit | flat count |
| Strain burn | 8 HP a point over (x the level column) | soul_modules.json strain.burn_per_point | HP: on the deal column |
| Mana Shock | 25% of max HP | soul_modules.json strain.shock.hp_share | share of the bar |
| Flux safe max | 6 | rules.json mana.sigil.flux.safe_max | flat count |
| Flux overload | 10 true damage a Flux over | rules.json output.amounts.flux_overload | HP: on the deal column (flat profile) |
| Core charge | standard 10, small 5, heavy 20 | rules.json mana.cores | flat count |
| Guard plates | pool 1, max 4; soak 6 a plate | techniques.json rules.guard; skills.json durability | count flat; soak on the deal column |
| Devotion | 0 to 10; XP curve "45/102/200/450" | patrons.json devotion | flat standing |
| Echo | 3 | rules.json echo.max | flat count |
| Feeling HP price | 8 HP a step | feelings.json price.hp_per_step | HP: on the deal column |


The pools I am asked to set:

| Pool | Today | New | Reason |
| --- | --- | --- | --- |
| Max MP | 100 + 75 x (Det - 1) + 25 x (Ins - 1) | unchanged, into data | six full Outbursts at Det 7 between rests, one at Det 1 (above) |
| Flux safe max | 6 (`rules.json:1434`) | 6, a count | a Line of four leaves room for one more Line before the vent; the Push past it (Overflux) is the consequence |
| Strain limit | 3, +1 at Composure 1, 2, 4, 6, 8 (`soul_modules.json strain.limit`) | unchanged | the count of how far a heart is pushed; Composure is its Reach |
| Strain burn | 8 a point over, x scale | 4.8, x deal | the same share of your bar at every level |
| Core charge | standard 10, small 5, heavy 20 (`rules.json:1412`) | unchanged, a count | a core is a number of glyphs, not of HP |
| Guard soak | 6 a plate, x scale (`techniques.json:38`) | 3.6, x deal (the reader rounds: 4 at level 1) | a plate eats about a fifth of a same-level Soldier's shot (a quarter today, before the Soldier's damage rose by x1.28) |
| Devotion | 0 to 10, XP 45 / 102 / 200 / 450 | unchanged | it is standing; with section 4.2 it is also the faithful's grade |

## 8. Margins

**The rule** (the curve, Law 2; agreed by Leon, round 1 item 5): every full 4 a roll beats the Defense or the TN by is a **Margin**; each Margin adds a quarter to what the roll does. A natural 20, and a roll in a weapon's critical range (an aimed shot's 19, an ambush's 19), is a **critical**: it lands and adds two Margins. PROVISIONAL. Data: `rules.json rolls.margins {step 4, per 0.25, critical 2, critical_perception_at [4, 7, 10]}`.

**Where the engine resolves it.** The one judge of a d20 is `packages/engine/src/rolls.ts:78` (its result already carries `total`, `tn` and `nat`, `:50-58`): it gains `margins`. A weapon attack's roll is `combat.ts:1644-1648` (`total = roll + toHit` against `need`); its damage term is pushed where the critical term is pushed today (`combat.ts:1542-1544`, `critOf`), as `1 + 0.25 x margins`. The same at a Sigil's roll (`sigil.ts:334-339` `spellCritMult`) and an Outburst's Bolt and Lance (`classes/soul.ts:36-39`). A landed action (a prayer, a heal, a Smite) has no roll and no Margins. A check against a TN reports its Margins with the result (the Narrator reads "beat it by 8: two Margins" as degree; an amount a check produces takes them). Enemies get Margins as characters do.

**What goes:** `CRIT_BASE`, `CRIT_MAX`, `CRIT_PER_PERCEPTION`, `CRIT_PER_DEXTERITY` (`character.ts:853-855`), `soul_modules.json damage.critical` and the `sigils.json grammar.critical` block. **What it becomes:**

- **Perception's "+3% critical damage"** becomes **"a critical adds one more Margin at Perception 4, 7 and 10"** (2 / 3 / 4 / 5). *Reason: a point a step is felt at the moment it matters (a critical from Hidden lands a quarter harder for each step), and Perception is the Shadow door's Attribute, where criticals live.*
- **Dexterity's "+2% critical damage"** goes to its damage line (section 4).
- **An item that raised the critical multiplier** (the `crit_damage` stat; `ctx.critBonus` on `damage_out`: One Shot's Breath Held, Tunnel Vision's +25%) adds the same number to what a critical's Margins add (Tunnel Vision: a critical adds 0.75, not 0.5). Same stat, same hook, no new piece.
- **Critical damage taken** (Perception -10% a point and Analysis -5% today, `crit_taken`) cuts what a critical's own Margins add by that share, as it cuts the critical bonus today.

#### T9. Margins: the expected damage multiplier of one attack (misses count 0; in brackets the chance to hit)

| to-hit modifier | Defense 10 | Defense 12 | Defense 14 | Defense 16 |
| --- | --- | --- | --- | --- |
| -2 | 0.55 (45%) | 0.41 (35%) | 0.29 (25%) | 0.17 (15%) |
| -1 | 0.62 (50%) | 0.47 (40%) | 0.35 (30%) | 0.23 (20%) |
| +0 | 0.70 (55%) | 0.55 (45%) | 0.41 (35%) | 0.29 (25%) |
| +1 | 0.78 (60%) | 0.62 (50%) | 0.47 (40%) | 0.35 (30%) |
| +2 | 0.86 (65%) | 0.70 (55%) | 0.55 (45%) | 0.41 (35%) |
| +3 | 0.95 (70%) | 0.78 (60%) | 0.62 (50%) | 0.47 (40%) |
| +4 | 1.04 (75%) | 0.86 (65%) | 0.70 (55%) | 0.55 (45%) |
| +5 | 1.12 (80%) | 0.95 (70%) | 0.78 (60%) | 0.62 (50%) |
| +6 | 1.23 (85%) | 1.04 (75%) | 0.86 (65%) | 0.70 (55%) |
| +7 | 1.32 (90%) | 1.12 (80%) | 0.95 (70%) | 0.78 (60%) |
| +8 | 1.43 (95%) | 1.23 (85%) | 1.04 (75%) | 0.86 (65%) |
| +9 | 1.48 (95%) | 1.32 (90%) | 1.12 (80%) | 0.95 (70%) |

How many of the 20 faces give each count of Margins against a Soldier's Defense 11:

| modifier | miss | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| +0 | 10 | 4 | 4 | 1 | 0 | 1 | 0 | 0 |
| +3 | 7 | 4 | 4 | 4 | 0 | 0 | 1 | 0 |
| +6 | 4 | 4 | 4 | 4 | 3 | 0 | 1 | 0 |
| +9 | 1 | 4 | 4 | 4 | 4 | 2 | 0 | 1 |
| +12 | 1 | 1 | 4 | 4 | 4 | 4 | 1 | 0 |


Against today: a +6 shooter against Defense 10 expects x0.88 a shot today (85% to hit, a 5% critical at x1.5); with Margins x1.23. **Margins make a specialist about a third faster against a weak foe** and change little against an Elite at Defense 14 to 16. That is the reward Law 2 names; it is not taken back in the enemy HP column (section 2.4).

## 9. The engine's caps that limit a reward

From `docs/design/proposals/2026-11-21-caps-the-engine-reads.md` "Limits a reward", each checked where it is read:

| Cap | Ruling | Reason |
| --- | --- | --- |
| Target bonuses at most +100% (`VS_CAP`, `output.ts:129`; the label at `combat.ts:1558`) | **Remove the top** (keep the -90% floor, so a hit always does something) | past the cap a seventh perk against a target gives nothing: a point not felt |
| The critical at most x2.0 (`CRIT_MAX`, `character.ts:853`) | **Replace** with Margins (section 8) | the capped critical is what Law 2 replaces |
| `SIGIL_CAP` 350, `SIGIL_CAP_CRIT` 500 (`sigil.ts:329`, `magic.ts:646`) | **Remove** | dead: `capParts` returns its parts unchanged; and 350 means nothing on the new scale |
| Boon cap 50 (`survival.json:219`, `run/power.ts:25`) | **Keep** | a rule a player sees: how many boons a character carries; the Survival drafter may turn it into slots |
| Starting boon at most 6, shrine token at most 8 (`survival.json:322`, `:438`) | **Keep** | which boons a node offers: a menu, not a held reward |
| A variant at most 20 worth (`variants.json:8`) | **Keep** | it prices a variant and keeps it the same weapon; it does not hold a player's reward down |
| The stage's grade ceiling, the vault at most Relic (`survival.json:147`, `:580`) | **Keep** | the chase calendar: a higher grade is found by going deeper |
| Mod band 0.5 (`survival.json:149`) | **Keep** | which mods a reward offers |
| Fight budget bands, `max_foes` (`survival.json:63-69`) | **Keep** | the generator's own shape; it is how "the stage changes" |
| Elites and Bosses at most 4 levels up (`survival.json:61` `elite_up`) | **Replace** by the stage's own enemy levels (the curve, Law 6; the Survival drafter's table) | an enemy's level comes from where it lives, never from the party |
| Camp budget 300 (`survival.json:42`) | **Keep** | credits, not HP; Leon's ruling (19 Nov) |
| A melee opener at most +50% (`techniques.json:285` `max_pct`) | **Replace** by the Momentum door's Reach (the door drafter) | a run is a counter; Reach is bought with points, not capped |
| One heal at most half the target's max HP (`rules.json:1590` `mending.cap_pct`, `output.ts:281`) | **Remove** (question 4) | a healer's full cash-out may save a friend outright; the per-round brake on giving the same target again (`mending.brake`, x1.5 a give) already prices a stream of heals |
| Devotion XP caps 2 / 2 / 6, the Narrator's 10 (`patrons.json:48`, `:56`) | **Keep** | they pace the chase calendar (Devotion 10 at hour 35), a rule a player sees |
| Elemental damage taken at most 80% resisted (`rules.json:857`) | **Keep** | a rule a player sees: nothing is immune by stacking |
| Ambush damage taken at most 60% (`effects/damage.ts:81`) | **Keep** | the same |
| Damage reduction at most 60% (`rules.json:23` `reduction_cap_pct`) | **Remove** | no reader in the engine |
| `output.level.reference_hp` (`rules.json:1791`) | **Remove** | the ceilings' unit; no reader in the engine or the client |

Structural rules a player sees (the Elite and Boss guard, the one-hit rule five levels down, the gap read to 5 levels, AP 2 to 9, Attribute and skill caps, Echo 3, the Strain limit, Light armour's cap for Forlorn Hope) all **stay**.

#### T10. The engine's caps that limit a reward (docs/design/proposals/2026-11-21-caps-the-engine-reads.md): see section 9 of 01-scale.md for the rulings

| cap | today |
| --- | --- |
| VS_CAP (target bonuses) | +100% (output.ts:129) |
| CRIT_MAX | 2.0 (character.ts:853) |
| SIGIL_CAP / SIGIL_CAP_CRIT | 350 / 500 (sigil.ts:329, dead) |
| boon_cap.cap | 50 |
| start_boon.max_worth | 6 |
| shrine.token_max_worth | 8 |
| variants worth_cap | 20 |
| rewards.ceiling | ['fine', 'masterwork', 'relic'] |
| stage.elite_up | {'per': 2, 'max': 4} |
| loadout.budget | 300 |
| mending.cap_pct | 0.5 |
| combat.elemental_taken_cap | 0.8 |


## 10. Defects found on the way (for the lead; not the scale's to fix)

1. **Two copies of the Damage school's base:** `soul_modules.json:112` `damage.base` 37 (read, `magic.ts:752`) and `:187` `schools[damage].damage` 40 (a fallback that is never reached). One goes.
2. **Numbers typed in code:** max HP's 100, 15 and 5 and Pain Threshold's 2 (`character.ts:798`, `:801`); Max MP's 100, 75, 25 (`:860`); the critical's 1.5 / 2.0 / 0.03 / 0.02 (`:853`); "Bleeding: 5 damage a turn" (`character.ts:775`, the bleeding row's tick is in `conditions.json`); `armor_ignore_5` / `armor_ignore_10` read as 5 and 10 (`combat.ts:1562`).
3. **Digits typed in data texts:** Judgement's "takes 56 Soul damage" and the other prayer texts with numbers (`patrons.json`); they must read `{=effects.N.value}` or they lie after the rescale.
4. **Item ids in code:** `tactics.ts:420-428` switches on `smoke_grenade`, `flashbang`, `bot_scrambler`.
5. **A stale comment:** `output.ts:15` says the `deal` column is "x1 at every level today"; it has been x7.5 at 20 since rules 1.36.

## Questions for the lead

1. **One factor x0.6 for everything (a rifle shot 28 at level 1), or the charter's x0.45 on what characters deal (18) with x0.6 on bars?** Recommended: x0.6, for the working in 3.1 (every shared number keeps its side, every count of hits stays, the digits hold).
2. **Enemy HP written for the expected specialist (x90 at 20), so a character who skipped its points or its grades takes about twice as many hits at level 20 as at level 1?** Recommended: yes; it is "effort is always rewarded" seen from the other side, and Margins are kept out of it so skill is never taken back.
3. **Virtue gains "+5% Blessing power"** (today its card promises only that Hymns return sooner, while the profile reads it at +6%)? Recommended: yes, so every attribute's card makes its door bigger, as Determination's does for the Soul.
4. **Remove the half-bar heal cap** (`mending.cap_pct` 0.5)? Recommended: yes; the per-round brake already prices repeated heals, and a healer's built-up cash-out should be able to bring a friend back from the edge.
5. **Magic and prayer take a grade** (the Evoker, the Emanator, Devotion), one new general piece? Recommended: yes; without it every caster falls x1.75 behind every gunner by level 20 for nothing the player chose.

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| The level column x40 | `levelFactor` (`effects/output.ts:111-117`); `rules.json output.level.deal` | values `40^((L-1)/19)` |
| `scale` is `deal` | `scaleOf` (`output.ts:120`), read by max HP, armour, soak, objects, pierce | `output.level.scale: "deal"` (a column naming a column: new piece 3); every profile that reads `scale` reads `deal` |
| Heals and shields x65 | `mendFactor` (`effects/mending.ts:20`); `output.level.mend` | values `deal x (90 + 3(L-1))/90`; `mendGate` (`output.ts:264`) counts `gate.hp` x `mend`, not x `scale`; `mending.gate.hp` 145 to 90 |
| Enemy columns | `levelled` (`data.ts:116-119`), `combat.ts:711`; `enemies.json levels.table` | `hp_mult` 90^t, `armour_mult` 40^t, `damage_mult` 60^t, `defense_plus` 0, `attack_plus` 0 |
| Tier damage x1.28, HP and armour x0.6 | `enemies.json items[]` | the numbers |
| Figment HP by what hits it | `figments.json level.hp` (its reader of enemy columns) | `["damage_mult"]` |
| The gap rule | `combat.ts:736-742`; `enemies.json levels.gap` | nothing |
| Every flat number x0.6 | the amounts' readers (`effects/amounts.ts`, `openAmount`); each file's own keys (T4) | the numbers; per-level HP numbers x0.25 |
| Weapons x0.6 | `weaponDamage` (`combat.ts:1527`); `weapons.json items[].damage`, `splash_damage` | the numbers; guns' `phys.scales_with: []`; light blades `phys.profile: "blade"`, `scales_with: []`; thrown `phys.profile: "thrown"` |
| Thrown blast, barrel, trap, hazard on the column | `deal()` (`output.ts:235`) with the `thrown` or `flat` profile and `level` = the thrower's or `cb.level` | `tactics.ts:433-435`, `perks/c.ts:485`, `combat.ts:889-893` and the trap and hazard callers of `hurtUnit` go through `deal()`; `factorOf('thrown')` goes |
| The cards' slopes and `k` | `statTerm` (`output.ts:87-92`), `weaponMult` (`character.ts:833-837`); `output.profiles` | the numbers; new rows `blade`, `thrown` (data); delete `output.factors.melee`, `.thrown`, `.figment` and `MELEE_FACTOR` (`combat.ts:46`, `:1537`); the "pin" notes |
| Card texts | `skills.json` per-point rows, `attributes.json` `player` and `derived` | Dexterity's line; Endurance's and Virtue's new lines; Expression's formula; Perception's |
| Grades on damage and armour | `att.dmgMult` 'rarity' (`combat.ts:1536`); `bodyArmourValue` x `armOf` (`character.ts:796`); `rules.json rarity` | `dmg`, `arm`, `acc` values; the rarity text (`rules.json:1603`) |
| Grades on magic and prayer | none | new piece 2 |
| Character HP | `maxHp`, `hpPerLevel` (`character.ts:798-801`), `fx('hp')`, `fx('hp_per_level')` | the formula's numbers into `attributes.json` and `skills.json`; `HP_REV` and `migrateCharacterHp` move by share of the old max |
| Margins | `rolls.ts:78` judge; `attack_roll` (`combat.ts:1644-1648`); the critical term sites (`combat.ts:1542-1544`, `sigil.ts:334-339`, `classes/soul.ts:36-39`) | new piece 1; `rules.json rolls.margins`; remove `CRIT_*` (`character.ts:853-855`) |
| Perception's critical Margins; items' critical bonus | `critMult`'s stat `crit_damage`; `ctx.critBonus` | read as a critical's added worth |
| Max MP into data | `maxMp` (`character.ts:860-861`) | the three numbers into `attributes.json` |
| Guard soak | `guardSoak` (`physical/core.ts:121`); `techniques.json rules.guard.soak` | 3.6 |
| Caps removed | `VS_CAP` (`output.ts:129`), `SIGIL_CAP` (`sigil.ts:329`), `mending.cap_pct`, `reduction_cap_pct`, `reference_hp` | delete; `stackDamage` keeps the floor |

## Needs a new primitive

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| 1. **Margins** on a judged roll | `rolls.ts` judge returns `margins = max(0, floor((total - tn) / step))` (+ `critical` on a critical, + Perception's steps); the attack and spell roll contexts carry it; one own multiplier `1 + per x margins` pushed where the critical term is pushed today; numbers in `rules.json rolls.margins` | the roll knows only `nat` (`rolls.ts:58`) and the attack only `crit` (`combat.ts:1647`); nothing counts how far a roll beat its target |
| 2. **A profile's grade source** | `output.profiles.<id>.grade: "weapon" \| "focus:evoker" \| "focus:emanator" \| "devotion"`, read in `openAmount` as one own multiplier from `rules.json rarity.<grade>.dmg`; Devotion's steps in `patrons.json devotion.grade_at` [3, 5, 7, 10] | the grade is read only on a weapon attack (`att.dmgMult`, `combat.ts:1536`); `sigil.ts` and `magic.ts` read no rarity; Devotion is read only as an additive per-point part (`per: devotion`) |
| 3. **A level column that names another** | `output.level.<name>` may be a string naming a column; `levelFactor` (`output.ts:106-117`) follows it | `LEVEL_COLS` keeps only arrays and a missing column throws (`output.ts:106`, `:116`); without it `scale` stays a second copy of `deal` |

## What re-records

| What | Why |
| --- | --- |
| Every golden damage table: `packages/engine/test/golden/builds-allin.json`, `builds-normal.json` and the tables behind `golden-damage.test.ts`, `golden-damage-builds-allin`, `-builds-normal`, `-magic`, `-perks`, `-shelved`, `-techniques`, `-traits-classes` | every base x0.6, every Stat term (slopes, `k`), the level column, the grades on damage, Margins in place of the critical |
| `golden-conditions.test.ts` (`golden/conditions.json`, `conditions.log.json`) | ticks x0.6 and on the column |
| `golden-costs*.test.ts` (`golden/costs-*.json`) | HP prices (Strain burn, feelings, Overclock, Flux overload) x0.6; MP and counts unchanged, so only the HP lines move |
| `golden-itemops`, `golden-mods`, `golden-rules` | amounts x0.6; the bayonet's `melee_damage`; the rarity rows |
| `enemy-levels.test.ts`, `level-gains.test.ts`, `levelup-revert.test.ts`, `fx-hp-stamp.test.ts` | the enemy table, max HP by level, the HP a level gives |
| `heal-pct.test.ts`, `rules120-heal-shield.test.ts`, `bond-heal-shown.test.ts` | the `mend` column, `gate.hp` 90, the heal cap removed |
| `figments*.test.ts` | forms' HP and armour x0.6, `level.hp` on `damage_mult`, the figment factor folded |
| `sigil-balance.test.ts` | it asserts `SIGIL_CAP` (removed) |
| `outburst20*`, `outburst40*`, `rules119-outburst.test.ts`, the `sigil14*` and `sigil15*` suites that assert a number | bases x0.6, the soul and sigil slopes, Margins |
| The balance measures in `packages/engine/test/balance/` (`guns-`, `melee-`, `magic-`, `shadow-`, `faith-`, `heal-`, `tank-`, `figments-`, `tending-`, `outburst-`, `items2-`, `mp-`, `syphon-measure`, `survival-run*`, `balance-sim`, `party-fit`) | they are readings: every number they print moves; `survival-run`'s bars were set to measured shares and are read again on the new scale |
| `tools/check_spec_tables.py` against the spec's tables | the spec's HP, damage and enemy tables are rewritten first (spec, then data) |
| Saved fights and replays (event logs) and `npm run try` scenarios | a replay re-runs the reducer: every number in it moves; saves migrate once by `HP_REV` |
| The e2e suites that read a number on screen | HP bars, damage lines and the critical's label |
