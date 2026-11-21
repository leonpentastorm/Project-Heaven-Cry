# 06. The world's side: enemies, their levels, Survival's shape, the budget and campaign tiers

Drafter's file for the 0.34 rebalance (21 Nov 2026). It is written to the charter, `docs/design/proposals/2026-11-21-the-curve.md` section 18, and to Leon's debate rounds in sections 10, 11, 13, 15 and 17 of that file. **Nothing here is built.** Every proposed number is PROVISIONAL. Facts about today were checked in data and code at `release/0.34-final` (`ae619d8f6`) and carry file:line.

**The scale file.** `docs/design/growth/01-scale.md` did not exist when I wrote this. The attacker and defender columns below come from the charter's numbers, as section 1.2 sets out. Every enemy column is defined as a **ratio to those two columns**, so when 01-scale lands, its columns replace mine and the enemy table is derived again by the same three formulas (1.3). Nothing else in this file needs to change.

---

## 1. The enemy table

### 1.1 Today (checked)

**The tier rows are the level-1 numbers** (`data/enemies.json`):

| Tier (line) | HP | Defense | Attack | Armour | Damage factor | Lag (`lag`, levels under the fight level) |
| --- | --- | --- | --- | --- | --- | --- |
| vermin (:7) | 15 | 10 | +0 | 0 | 0.5 | 3 (:36) |
| minion (:39) | 70 | 10 | +1 | 0 | 1.0 | 3 (:67) |
| soldier (:70) | 140 | 11 | +3 | 5 | 0.78 | 1, and 2 from level 10 (:102) |
| elite (:105) | 240 | 12 | +5 | 10 | 1.05 | 0 (:143) |
| boss (:146) | 820 | 13 | +6 | 10 | 1.2 | 0 (:186) |

**The level table** (`enemies.json:214`, rows 1 to 20) raises those numbers. At level 20: `hp_mult` 8.4844, `armour_mult` 7.5, `defense_plus` 6 (reached at level 13), `attack_plus` 6, `damage_mult` 8.5312. Its note (`:191`) says it was fitted so "a Soldier takes about 3.5 of the plain rifleman's hits at level 1 and just under 4 from level 12".

**How the table is applied.** `levelled()` (`packages/engine/src/data.ts:117-120`) works out:
- HP = hp × hp_mult, and armour = armour × armour_mult, both rounded;
- Defense + defense_plus, and attack + attack_plus;
- the damage factor × damage_mult.

`unitFromEnemy` (`packages/engine/src/combat.ts:636-650`) puts these on the unit. The factor becomes `lvlDmg`. In `attackDamage` (`combat.ts:1518-1533`) an enemy's hit is its weapon's base × `lvlDmg`: no profile k, no Level term. Armour comes off flat ("dealt = max(1, floor(amount) − armour)", `data/rules.json` `output.formula`).

**Weapons.** A foe's weapon comes from `data/survival.json` `pools` (`:473`), by tier and range, and a setting may name its own. A Soldier's ranged pool is the Hellraiser service rifle (30), the Legion bullpup (28), the lever carbine (32) and the Magistrate pistol (26) (`data/weapons.json`).

**The level-gap rules** (`enemies.json:199-212`):
- `one_hit_levels_below` 5: a foe 5 or more levels under the attacker dies to any damaging hit (`combat.ts:742`).
- `to_hit_per_level` 1, up to `max_levels` 5.
- `full_hp_guard` (tiers elite and boss, left on 1 HP; `combat.ts:752`, `:763-790`; spec rules 1.15 point 4).
- `narrator_shift` −3 to +2 (`:195`; `combat.ts:1787`).

**The doors on enemies** (rules 1.79 and 1.83). A row's `doors` block is read by `armDoors` (`combat.ts:668-686`): `hold`, `skills` (raised, never lowered), `faith`, `wants` and `hands`. The rows that carry one:
- the caster rows, for example `heart_adept` (`enemies.json:521`): Empathy 3, an Attuner, Bond, Tug and Snap, Mother Ember at Devotion 3;
- the tag rows in `ai.tag_doors` (`:729`): `faithful` (Nerukhan, Devotion 3) and `skulk` (Tag, Ingenuity 3).

Guard is separate. `armGuard` (`combat.ts:700-704`) reads a row's own `guard.plates` and `guard.durability`, typed per row: `heartfire_elite` has plates 3 and Durability 5 (`enemies.json:603`). It does **not** read a tag block, and the plate count is not derived from Durability.

### 1.2 The stated attacker and defender (whom the table is written for)

**The attacker** is a specialist on one door: its door attribute at the ceiling for its level, the skill at the attribute, carrying a weapon **one grade under the best grade the foe's level band offers** (section 3.4). The reference weapon is the rifle at the charter's base of 14 (today's 30 × 0.45). Its plain hit D(L) is no Margin, no critical and no cash-out:

D(L) = 18 × 1.21^(L−1) × grade(L) × build(L)

- **grade(L):** Standard ×1 for foe levels 1 to 4, Fine ×1.15 for 5 to 11, Masterwork ×1.3 for 12 to 16, Relic ×1.5 for 17 to 20 (the grade multipliers are the curve's section 4).
- **build(L):** (1 + 0.10 × (attribute − 7)) × (1 + 0.03 × (skill − 7)). The attribute is 7, then 8 from level 5, 9 from 10 and 10 from 15 (the gates on fives). The 0.03 for a skill point is my stand-in for 01-scale's skill Bite.

**Its to-hit A(L)** is the skill's modifier (points − 1; Mastered +9) plus the grade's accuracy (+0 / +1 / +2 / +3): +6 at level 1, +8 at 5, +9 at 10, +11 at 15 and +12 at 20.

**The defenders:**
- **frail:** Endurance 1, Pain Threshold 0, light armour. HP 60 at level 1 to 3,000 at level 20, geometric (the charter's numbers).
- **hardy:** Endurance 7, medium armour. HP 120 to 8,000.

Their armour is taken as 10% (frail) and 20% (hardy) of a Soldier's raw hit at their level. That is 01-scale's to set; the shares below move with it.

| Level | D(L), the attacker's plain hit | A(L) | frail HP | hardy HP |
| --- | --- | --- | --- | --- |
| 1 | 18 | +6 | 60 | 120 |
| 5 | 50 | +8 | 137 | 291 |
| 10 | 146 | +9 | 383 | 877 |
| 15 | 478 | +11 | 1,072 | 2,649 |
| 20 | 1,431 | +12 | 3,000 | 8,000 |

So a hit is two digits at level 1 and four at level 20, as Leon asked. The specialist's full cash-outs (Law 2) reach five digits at level 20. The charter's x7 Coup is about 5.5 plain blows (curve section 16), and a plain two-handed blow at level 20 is about 4,000, so the Coup is above 20,000.

### 1.3 The three column rules (PROVISIONAL)

The engine keeps **one level table applied to every tier** (`levelled()` unchanged in shape). The columns are no longer fitted by a simulator to a rifle. Each one is chosen for what a player feels:

1. **`hp_mult(L)` = D(L)/D(1) × (1 + (4.0/3.5 − 1) × (L − 1)/19).** *So a Soldier of your level always takes three or four of your solid hits, and a little more at level 20, which leaves room for the long cash-outs.* A Soldier goes from 3.5 plain hits at level 1 to 4.0 at level 20, and an Elite from 7 to 8.
2. **`armour_mult(L)` = D(L)/D(1).** *So a foe's armour is always the same bite out of a good hit, and a weak weapon or a small hit always feels the plate. A big cash-out loses only a sliver to armour.* Flat armour that keeps pace with the hit is how the cash-out pays: Law 2's reward grows against armour for free.
3. **`damage_mult(L)` = frailHP(L)/frailHP(1) × 3.5/(3.5 + 0.5 × (L − 1)/19).** *So a Soldier of your level always takes about a quarter of a frail character's HP with a solid hit (3.5 hits to drop you at level 1, 4 at level 20), and a hardy one twice that or better.*

Defense and to-hit columns:
- **`defense_plus(L)` = A(L) − A(1)**: 0 / 0 / 0 / 0 / 2 (levels 5 to 9) / 3 (10, 11) / 4 (12 to 14) / 5 (15, 16) / 6 (17 to 20). *So the specialist with the expected grade hits a foe of its own level as often at level 20 as at level 1. Better gear or a level ahead buys Margins; a weaker grade feels it.*
- **`attack_plus(L)`**: today's column, kept until 01-scale gives the defender's Defense by level. Then it becomes that Defense's rise from level 1, by the same rule.

The full table (one row a level; replaces `enemies.json:214`):

| L | hp_mult | armour_mult | defense_plus | attack_plus (today's, kept) | damage_mult |
| --- | --- | --- | --- | --- | --- |
| 1 | 1.000 | 1.000 | 0 | 0 | 1.000 |
| 2 | 1.219 | 1.210 | 0 | 0 | 1.219 |
| 3 | 1.486 | 1.464 | 0 | 0 | 1.487 |
| 4 | 1.812 | 1.772 | 0 | 0 | 1.814 |
| 5 | 2.877 | 2.793 | 2 | 0 | 2.212 |
| 6 | 3.507 | 3.380 | 2 | 1 | 2.698 |
| 7 | 4.274 | 4.089 | 2 | 1 | 3.291 |
| 8 | 5.208 | 4.948 | 2 | 1 | 4.015 |
| 9 | 6.347 | 5.987 | 2 | 1 | 4.898 |
| 10 | 8.683 | 8.133 | 3 | 2 | 5.975 |
| 11 | 10.581 | 9.841 | 3 | 2 | 7.290 |
| 12 | 14.574 | 13.461 | 4 | 2 | 8.894 |
| 13 | 17.757 | 16.288 | 4 | 3 | 10.852 |
| 14 | 21.634 | 19.708 | 4 | 3 | 13.242 |
| 15 | 29.361 | 26.565 | 5 | 4 | 16.159 |
| 16 | 35.769 | 32.144 | 5 | 4 | 19.719 |
| 17 | 50.276 | 44.877 | 6 | 5 | 24.065 |
| 18 | 61.242 | 54.302 | 6 | 5 | 29.369 |
| 19 | 74.597 | 65.705 | 6 | 6 | 35.845 |
| 20 | 90.860 | 79.503 | 6 | 6 | 43.750 |

**The jumps at levels 5, 12 and 17** (×1.5 and more on HP) are where the expected grade steps up. Because foe levels come from the map (section 2), each jump falls on a **map boundary**: *a new map's foes ask for the grade its shop and vault now sell.* A squad that upgraded on time feels nothing; one that did not feels the map change. That is the consequence, and the cure is on the shelf.

### 1.4 The new tier rows (level 1; PROVISIONAL)

| Tier | HP | Armour | Defense | Attack | Damage factor | Why a player would recognise it |
| --- | --- | --- | --- | --- | --- | --- |
| vermin | 14 | 0 | 8 | +0 | 0.85 | one solid hit drops one at any level (0.8 of a hit at 1, 0.9 at 20); a swarm is many small bites |
| minion | 32 | 0 | 9 | +1 | 1.75 | two hits; it carries the light guns, so its factor is high and its bite is still smaller than a Soldier's |
| soldier | 56 | 2 | 11 | +3 | 1.35 | three and a half hits for you; three and a half hits on a frail character |
| elite | 98 | 4 | 14 | +5 | 1.85 | twice a Soldier's hits. Its Defense is 3 over a Soldier's, so the specialist's roll "just lands" and Margins are rare; it hits a frail character in two or three |
| boss | 338 | 5 | 15 | +6 | 2.1 | about 26 plain hits at full share (four players), so a squad has to build and cash out to end it in nine rounds |

Today's Elite Defense of 12 is only one over a Soldier's. With Margins (Law 2) that would let a master hit an Elite as hard as a Soldier. Defense 14 is chosen so the curve's promise holds: *a master beats a weak foe by 8 and hits half again as hard; against an Elite the same roll just lands.*

### 1.5 The table at levels 1, 5, 10, 15, 20 (derived from 1.3 and 1.4)

"Hits" is the attacker's plain hits to drop the foe from full HP. "Hit %" is the attacker's chance to hit at equal level. It stays the same at every level, by design.

| L | Tier | HP | Armour | Defense | Attack | Hits | Hit % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | vermin / minion / soldier / elite / boss | 14 / 32 / 56 / 98 / 338 | 0 / 0 / 2 / 4 / 5 | 8 / 9 / 11 / 14 / 15 | +0 / +1 / +3 / +5 / +6 | 0.8 / 1.8 / 3.5 / 7.0 / 26.0 | 95 / 90 / 80 / 65 / 60 |
| 5 | same order | 40 / 92 / 161 / 282 / 972 | 0 / 0 / 6 / 11 / 14 | 10 / 11 / 13 / 16 / 17 | as level 1 + 0 | 0.8 / 1.8 / 3.7 / 7.2 / 27.0 | same |
| 10 | same order | 122 / 278 / 486 / 851 / 2,935 | 0 / 0 / 16 / 33 / 41 | 11 / 12 / 14 / 17 / 18 | + 2 | 0.8 / 1.9 / 3.7 / 7.5 / 28.0 | same |
| 15 | same order | 411 / 940 / 1,644 / 2,877 / 9,924 | 0 / 0 / 53 / 106 / 133 | 13 / 14 / 16 / 19 / 20 | + 4 | 0.9 / 2.0 / 3.9 / 7.7 / 28.8 | same |
| 20 | same order | 1,272 / 2,908 / 5,088 / 8,904 / 30,711 | 0 / 0 / 159 / 318 / 398 | 14 / 15 / 17 / 20 / 21 | + 6 | 0.9 / 2.0 / 4.0 / 8.0 / 29.7 | same |

**What a foe's hit does to the defenders.** Rifle-class weapon (14 base), at equal level; the figure is how many landed hits drop the defender from full:

| L | Soldier's raw hit | frail lasts | hardy lasts | Elite's raw hit | frail / hardy | Boss's raw hit | frail / hardy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 19 | 3.5 | 7.9 | 26 | 2.5 / 5.4 | 29 | 2.2 / 4.7 |
| 5 | 42 | 3.6 | 8.7 | 57 | 2.6 / 5.9 | 65 | 2.2 / 5.1 |
| 10 | 113 | 3.8 | 9.7 | 155 | 2.7 / 6.6 | 176 | 2.3 / 5.7 |
| 15 | 305 | 3.9 | 10.8 | 419 | 2.8 / 7.4 | 475 | 2.4 / 6.4 |
| 20 | 827 | 4.0 | 12.1 | 1,133 | 2.9 / 8.3 | 1,286 | 2.5 / 7.1 |

The hardy character grows hardier with level: Endurance's HP per level outpaces the foes, which is *what a point in Endurance should feel like.*

For comparison, today at level 20 a Soldier has 1,188 HP, 38 armour and a ×6.65 factor (`enemies.json:70` × `:214`). The new Soldier at level 20 has 5,088 HP against a 1,431 hit. Today the comparison is 1,188 against about 300 (`rules.json` `output.level.note`: "a plain rifle hit is 40 at level 1 and about 300 at level 20").

### 1.6 Enemies and the doors on the new scale

The rule is **one copy**: an enemy's door does what a character's does, at the enemy's door points and its level.
- **Reach comes from points**, from the door drafters' Reach rows: Guard's plates 2 / 3 / 4 / 6 at Durability 1 / 4 / 7 / 10 (curve section 2).
- **Bite and any HP-shaped amount** (a plate's soak, a Whisper's heal, a Snap's hurt, a Tug's MP) ride the same level column a character's door reads, at the enemy's level (the Level term of `effects/output.ts`; enemies read `lvlDmg` today, combat.ts:1531).

No door number is typed into an enemy row.

**Door points rise with the place, as tags** (data only; `armDoors` already takes the higher of every block's `skills`, `combat.ts:673`). Today's `ai.tag_doors` gains three steps of each door (PROVISIONAL):

| Tag (step I / II / III) | Door points | What the player meets |
| --- | --- | --- |
| `plated` / `plated_ii` / `plated_iii` | Durability 4 / 7 / 10 | 3 / 4 / 6 plates; Challenge and Slam from the Durability ladder as the rows hold them today (`heartfire_elite` wants, `enemies.json:604-611`) |
| `skulk` (exists, Ingenuity 3) / `skulk_ii` / `skulk_iii` | Ingenuity 3 / 6 / 9 | Tag, Hide; deeper Shadow at II, the Break from Hidden at III |
| `faithful` (exists, Devotion 3, Faith 1) / `faithful_ii` / `faithful_iii` | Devotion 3 / 6 / 9; Faith 1 / 3 / 5 | Whispers (Health under half HP); at II Protection; Witnessed at III (Faith 5) |
| `bonded` / `bonded_ii` / `bonded_iii` | Empathy 3 / 6 / 9, an Attuner | Bond, Tug the runner back, Snap the one nearly done; more Bonds held by Reach |

*So a level-15 skulker hides deeper than a level-3 one, as a character with more Ingenuity does, and a player reads it off the same ladder they climb.*

**The casters** keep their rows (`casters` `:432`, `soul_casters` `:520`; Max Sigil words by tier from `sigils.json enemy_ai.max_words`).
- Their `mp`, `strain_limit` and `free_pumps` follow whatever the Outburst drafter sets for a character's pool at a level. If a character's MP scales by level, `mp` here is read through the same column. If it does not, nothing changes.
- Sigil casters' Line length follows the Sigils Reach row by their Brain Power, given as `skills` in their door block (Brain Power 1 / 4 / 7 = 2 / 3 / 4 glyphs). That replaces the separate `max_words` by tier, which is a second copy of the rule.

**Elite and Boss guard (keep).** No single action takes an Elite or Boss at or above the attacker's level from full HP to nothing. On the new scale it does three things:
1. **At level 20:** a full ×7 cash-out (about 20,000) would one-shot an Elite of 8,904 HP. The guard leaves it on 1 HP, and the next action of anyone ends it. Against a four-player Boss (30,711) the same cash-out takes about two thirds: *the big blow is the turning point of a Boss fight, never its whole story.*
2. **The guard falls away for the squad that took the long road.** Foe levels are the map's (section 2), so a squad a level over the map's Elite has earned the right to delete it. *Effort is rewarded: over-level and the guard is gone.*
3. The Miracle and an execution stay past it, as today (spec rules 1.15 point 4).

**The other gap rules (keep, unchanged numbers):**
- **`one_hit_levels_below` 5:** a foe 5 levels under already has 1/2.6 to 1/3.4 of the HP of one at your level (the HP column steps ×1.21 to ×1.5 a level). The rule just finishes the sliver. *Go back to an early map's foes at level 7 and they drop to anything.*
- **`to_hit_per_level` 1, `max_levels` 5:** on the Margin rule each level of gap also moves the Margin threshold by one, so a level ahead is felt in how hard you hit as well as how often.
- **`narrator_shift` −3 to +2:** kept. In a campaign it now moves the zone's level, not the party's (section 6).

---

## 2. Levels of their own

### 2.1 Where the party's level sets a foe's level today (checked)

1. **Survival's generator.** `composeEncounter` (`packages/engine/src/run/encounter.ts:164-166`) sets `L = fightLevelOf(inp.levels)`: the living characters' average level, rounded down (`data.ts:124`). The callers pass the party's levels: `game.ts:3621` (a node's fight) and `run/ambush.ts:83` (an ambush).
2. **`foeLevel`** (`encounter.ts:74-75`) gives every foe a level from L:
   - an ordinary tier is L − `tierLag` (`:65-68`, from the tier's `lag` rows);
   - an Elite or Boss is L + `eliteUp(stage)` (`:70`, from `survival.json stage.elite_up` {per 2, max 4} at `:55-62`).

   So the foes copy the party and the growth cancels.
3. **`foeCost`** (`encounter.ts:83-86`) prices a foe by `lag_factor`^(L − level) (`survival.json:79`, 0.83), measured against the same party level.
4. **Story fights and campaigns.** `fightLevel` (`combat.ts:1785-1789`) returns the level given outright, else the party's average plus the Narrator's shift. `encounterLevels` (`game.ts:1663-1670`) takes `level` from a prepared encounter or enemy when the file has one. None of M813's encounters do (`data/campaigns/m813.json` `encounters`).
5. **The Narrator's drill spawn.** `sandbox/spawn` (`game.ts:4331`): "empty is the squad's level".

### 2.2 What replaces it

**A foe's level comes from the place.**
- In Survival: from the map (the run's `stage`) and the node's depth, read from a new `survival.json levels` block (section 3.2) by one reader, `worldLevel(stage, depth, tier)`.
- In a campaign: from the zone (section 6).

The party's level is used for one thing only: **the budget's level difference** (section 4), which says how much of the room a foe takes up for *this* squad. `tierLag` stays, with a new meaning: its `lag` rows become an offset under the place's level (vermin 1, minion 1, soldier 0, elite and boss 0). *A swarm is a level under its masters, so more of them fit the room.* `eliteUp` and `stage.elite_up` are deleted.

*So taking the long road (more fights, more training) makes you stronger than the map, and rushing to the Boss makes you weaker than it. A level means something because the world does not follow you.*

---

## 3. Survival's shape

### 3.1 Today (checked)

- A run is stages, each a 15-row path map: gate Elite at row 8, final junction at 13, shop and rest at 14, the Boss at 15 (`survival.json map` `:805`).
- After a Boss comes a boon and the next stage's tile from `world.offer` 3 settings (`:413`; `run/stage.ts:130-134`).
- It runs until the squad dies or retires after a Boss (`run/state.ts:252`, `:257`; `RunEnd.how` is 'lost' or 'retired', `:71`). There is no final boss and no end.
- **Grade ceilings:** `rewards.ceiling` is fine / masterwork / relic for stages 1 / 2 / 3+ (`:147`; `run/rewards.ts:156`). The validator refuses Celestial as a ceiling (`tools/validate.py:2960`). The vault gives grade_up 1, at most Relic (`:580`).
- **The stage term:** bulk ×(1 + 0.42(s − 1)) and pressure ×(1 + 0.35(s − 1)) (`stage` `:55-62`; `budgetFor`, `encounter.ts:92-96`).

### 3.2 Five maps, then endless (PROVISIONAL)

The run's `stage` stays the counter (saves load unchanged). On screen it is called **the map**. Maps 1 to 5 are Survival proper; map 6 onward is endless.

**The level table by map and depth.** "Early" is rows 1 to 7, "late" is rows 9 to 14. The gate Elite (row 8), the vault's guard and every Elite take the Elite column.

| Map | Early foes | Late foes | Elites, gate, vault guard | Boss | Squad arrives / leaves at about | Hours (about) | Best grade found here |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 2 | 3 | 3 | 1 / 3 | 0 to 2 | Fine (vault Masterwork) |
| 2 | 3 | 4 | 5 | 5 | 3 / 5 | 2 to 4.5 | Fine (vault Masterwork) |
| 3 | 5 | 6 | 7 | 7 | 5 / 7 | 4.5 to 8 | Masterwork (vault Relic) |
| 4 | 7 | 8 | 9 | 9 | 7 / 9 | 8 to 12.5 | Masterwork (vault Relic) |
| 5 | 9 | 10 | 11 | **final boss 11** | 9 / 10 | 12.5 to 16 | Masterwork (vault Relic) |
| endless e (map 5 + e) | 10 + e | 11 + e | 12 + e | 12 + e | 10 + e − 1 / 10 + e | 2.4 a map | Relic (maps 6 to 9); Celestial as a find from map 10 (foe level 17) |

Every level is capped at 20 (`enemies.json levels.max`).

**Why these numbers (one line each):**
- **The Boss at 2m + 1 and level with the squad that walked the map:** *the Boss is the top of the map, at your level if you fought your way there, a level over you if you rushed; the full-HP guard is on.*
- **Early foes at the squad's arrival level, late foes a level up:** *the map's second half is felt as harder, and by then you have levelled into it.*
- **The final boss at 11 for a level-10 squad:** *the last fight of Survival is one level over you, with the gap's +1 to hit and the guard.*
- **The hours match the charter's chase calendar:** level 3 at about hour 2, 5 at 4, 7 at 8, 9 at 13 and 10 at 16 (curve section 12; level and XP are the progression drafter's to fit). Tiers I and II (levels 1 to 10) are done at the final boss, as Leon ruled (curve section 10 item 4).
- **The best grade by map** follows the calendar: Fine by hour 3, Masterwork by 8, Relic by 20, Celestial by 33. The vault is always one step over the map's shelf. *Taking the dead-end fight pays a grade early.*

### 3.3 The final boss (data, from existing rows)

A template **`last_reckoning`**, the only template on map 5's Boss node (`survival.json levels.final.template`), with target rounds 12 (`levels.final.rounds`; a normal Boss's is 9). Its slots:

1. **The final boss.** Tier `boss`, `boss: true` (it reads the setting's Boss block for its name, kind, weapon and face, as today, `encounter.ts` `armed`), caster `heart_sovereign` (`enemies.json` `soul_casters`: Sovereign lance, Rime bolt, Gale heart, Sovereign's grace; Mother Ember at Devotion 6) and tags `plated_ii` and `faithful_ii`. So it carries 4 plates, Slam, Whispers and an Outburst it builds and holds.
2. **One `sigil_warden`** (`enemies.json:469`): CHAIN, FREEZE, WARD and NULL on what the squad leaves on the field. Required.
3. **One `heartfire_elite`** with `plated_ii`: Guard, Challenge and Slam. Required.
4. **Minions, up to 4, tag `bonded`:** they Tug a runner back to the boss.

*It asks for everything the five maps taught: break plates, kill the healer's words, keep the line together against FIRE and CHAIN, do not run from the Bonds, and build a cash-out for the turn its plates are down.* No new behaviour: every piece is a row that exists.

- **Its level:** 11. **Its HP at four players:** 338 × 10.58 × (12/9 bulk) ≈ 4,770, about 37 plain hits of the level-11 attacker (177 a hit, 49 armour). The budget scales HP to reach the bulk target, as it does for every fight (`encounter.ts:170-185`).
- **After it falls:** the boon of three as after every Boss, then the **Survival cleared** panel with the run's score. The **account's permanent upgrade** is a slot that ships empty: `survival.json levels.final.account_reward: null`, with the text "Kept for when accounts exist" (charter: not in 0.34). Then the squad chooses: **retire** (the run ends, `how: 'retired'`) or **walk on** into endless (stage 6's tiles).

### 3.4 Endless: how it keeps getting meaner (PROVISIONAL)

- **Levels:** one a map, by the table above, until foes cap at 20. Ordinary foes reach 20 on map 14's late rows, at about hour 37.6, and everything is 20 by map 15, at about hour 40. *Level-20 foes arrive as your character reaches 20, and from then on the fights change, not the numbers.*
- **Numbers:** the budget's map term (section 4.3) keeps adding +0.1 bulk and +0.1 pressure a map with no end. *Each map past the cap puts a little more in the room.*
- **What a fight is made of: a kit a map, in this order** (each endless map adds the next; after the eighth the list starts again one door step stronger, `_ii` to `_iii`, up to `_iii`):

| Endless map | Kit added | What the squad must answer |
| --- | --- | --- |
| 1 (map 6) | Soldiers `plated_ii` | plates on the line: armour-piercing, Slam, a cash-out for a plate-less turn |
| 2 | casters in plain fights (`caster_guards`, `healer_line` weight ×2) | kill the words first |
| 3 | Elites `faithful_ii`, Bosses `faithful_iii` | Witnessed foes; silence or Rebuke |
| 4 | minions `skulk_ii` everywhere | spotting; flanks are never safe |
| 5 | Elites `bonded_ii` | a runner is Tugged back; break the Bond or fight in its reach |
| 6 | an Elite slot in plain fights (`firing_line`'s Elite slot from row 1) | every fight has a centre |
| 7 | the gate becomes `twin_elites` | two plated centres at once |
| 8 | the Boss node draws `last_reckoning` (the final boss's template at the map's level) | the final boss, again, meaner |

**Kinds and kits by setting** stay as they are: a setting's `kinds`, `pools`, `boss` and `vault_guard` (`survival.json settings` `:559`).
- Endless repeats settings once all six are played. `world` (`:413`) already falls back when none is unplayed.
- In endless the `pools` may name the new Items 2.0 rows: *Smetanita guns that lay Pressure on you, Whisper-line weapons that keep a skulker Hidden.* This is data on the setting's `pool`.

### 3.5 What today's "stages" become (data keys)

| Key (today) | Becomes |
| --- | --- |
| `RunState.stage` (`run/state.ts:112`) | unchanged: the map number; 1 to 5 Survival, 6+ endless |
| `survival.json stage.elite_up` (`:61`) | deleted (replaced by `levels`) |
| `stage.bulk` 0.42, `stage.pressure` 0.35 | 0.1 and 0.1 (section 4.3) |
| `stage.credits` 0.35, `stage.xp` [1, 2.6, 4, 4, 4.5] | the economy and progression drafters'. **My one ask:** XP should be paid by the foe's level against the character's (the calendar: "weak foes give nothing"), not by a stage multiplier |
| `rewards.ceiling` ["fine", "masterwork", "relic"] (`:147`) | by map: fine, fine, masterwork, masterwork, masterwork, relic (maps 6 to 9), celestial (map 10+; the last repeats). Needs the validator rule changed (Question 3) |
| `vault.grade_max` "relic" (`:580`) | "celestial": *the dead-end fight in endless is where the first Celestial can come from* |
| `enemies.json items[].lag` | kept in shape; the offset under the place's level (section 2.2) |
| new `survival.json levels` | `{ maps: [ { map, early, late, elite, boss, tags: { tier: [tag] }, from_template... } x5 ], endless: { early: 10, late: 11, big: 12, per_map: 1, kits: [ ... ], beyond: { bulk: 0.1, pressure: 0.1 } }, final: { stage: 5, template: "last_reckoning", rounds: 12, account_reward: null, text } }` |
| `templates[].from_depth` | joined by `from_stage` on templates and slots (section 5) |
| `rounds` (`:64`) | joined by `pressure_kind` (section 4.2) |

---

## 4. The fight budget by level difference

### 4.1 The cost of one foe (Soldier-equivalents, SE)

Today (`survival.json tiers` `:70-77`): bulk / pressure is vermin 0.3 / 0.3, minion 0.55 / 0.75, soldier 1 / 1, elite 2.1 / 2.2, boss 7.9 / 3. `foeCost` multiplies by `lag_factor`^(squad − foe) and the Elite and Boss share by squad size (`share` `:80-83`).

**New (PROVISIONAL):**
- **Bulk becomes plain hits over a Soldier's** (section 1.4): vermin 0.25, minion 0.5, soldier 1, elite 2.0, boss 7.5. *So the room's size reads in the same hits you count.* Pressure is kept as fitted, and re-measured by the run simulator.
- **`lag_factor` 0.83 becomes 0.78.** *A foe one level over you takes about a fifth more to put down and hits a fifth harder, and the gap's +1 makes it a little surer: it fills the room like 1.3 foes of your level.* That is ×1.21 a level on HP and on damage, and about ×1.05 from the gap's ±1 to hit.

Cost factor by **foe level minus the squad's level** (one squad level: the living characters' average, rounded down, `data.ts:124`):

| Foe − squad | −5 or less | −4 | −3 | −2 | −1 | 0 | +1 | +2 | +3 | +4 | +5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| × cost | 0.29 (and its bulk is one hit: vermin's 0.25) | 0.37 | 0.47 | 0.61 | 0.78 | 1 | 1.28 | 1.64 | 2.11 | 2.70 | 3.46 |

So a Soldier two levels over a squad costs 1.64 SE of bulk and of pressure. An Elite of map 1 (level 3) against a level-1 squad costs 2.0 × 1.64 = 3.3 bulk × its share. *Rushing is felt in the generator too: fewer bodies, each a wall.*

### 4.2 The budget by squad and difficulty

Difficulty words map onto the node kinds Survival has. A campaign's encounter `difficulty` (easy, standard, hard; `campaign-format.md` `encounters`) reads the same rows, easy as light. Bulk is 0.25 × n × rounds (`bulk_per_char_round`, `:65`); pressure is `pressure_per_char`[n − 1] × n (`:66`) × the new `pressure_kind`.

| Difficulty (node kind) | Rounds | `pressure_kind` (new) | Squad of 1: bulk / pressure | of 2 | of 3 | of 4 |
| --- | --- | --- | --- | --- | --- | --- |
| light (a plain fight at depth 1 or 2; easy) | 4 | 0.85 | 1.0 / 1.1 | 2.0 / 1.5 | 3.0 / 2.3 | 4.0 / 3.1 |
| standard (a plain fight) | 5 | 1.0 | 1.25 / 1.3 | 2.5 / 1.8 | 3.75 / 2.7 | 5.0 / 3.6 |
| hard (Elite, gate; the vault guard ×1.3 on both) | 6.5 | 1.15 | 1.6 / 1.5 | 3.25 / 2.1 | 4.9 / 3.1 | 6.5 / 4.1 |
| deadly (Boss) | 9 | 1.25 | 2.25 / 1.6 | 4.5 / 2.25 | 6.75 / 3.4 | 9.0 / 4.5 |
| final boss | 12 | 1.35 | 3.0 / 1.8 | 6.0 / 2.4 | 9.0 / 3.6 | 12.0 / 4.9 |

`pressure_kind` (PROVISIONAL): *an Elite's room hurts more each round, not only for longer; you feel it in the first exchange, not the sixth.* Today the pressure cap does not depend on the kind at all (`budgetFor`, `encounter.ts:95`).

### 4.3 Where the generator reads it

- `budgetFor` (`encounter.ts:92-96`) gains the `pressure_kind` multiplier, and the final boss's rounds from `levels.final`. The map term stays in the same place: (1 + 0.1 × (s − 1)) on bulk and on pressure.
- `foeCost` (`:83-86`) keeps its formula, with the squad level, the foe's place-level and the new `lag_factor`.
- `fill` (`:127-160`) calls `worldLevel` in place of `foeLevel`.
- `bulk_band`, `pressure_band`, `max_foes` and `share` are unchanged.

---

## 5. Each map asks something different (PROVISIONAL)

A map's identity is its **order** (players pick the setting from the offer, `world`), so what it is made of is read from `levels.maps[m]`: which templates may be drawn there (`from_stage` on templates and slots) and which tags its foes carry by tier (`tags`).

| Map | Templates that open here (today's ids) | Tags its foes carry | What it asks of the squad |
| --- | --- | --- | --- |
| 1 | `firing_line`, `swarm`, `rush`, `machines`, `elite_pack` (gate), `champion` (Boss) | the gate Elite and the Boss `plated` | aim, cover, focus fire. It **meets Guard once** at the gate, so the Durability door is learned by facing it |
| 2 | + `ambush` (`skulk` minions and Soldiers) | minions `skulk` | spotting, flanks, not walking into the open; Soldiers' Suppress puts Pressure on you |
| 3 | + `caster_guards`, `healer_line` (from row 1 of the map, not depth 3 or 5 as now), `warden` (gate) | casters `bonded` (the heart adept's Attuner exists) | spread out against FIRE, kill the healer first, break or respect the Bonds |
| 4 | + `twin_elites` (gate) | Soldiers `plated`; Elites `faithful` | armour-piercing and the big cash-out (armour is flat), Slam plates, Rebuke prayers |
| 5 | everything; `firing_line`'s Elite slot opens from row 9 | Elites `plated_ii`; casters `faithful` | all of it at once, then `last_reckoning` |

*So the five maps teach the doors on the other side one at a time, and the final boss asks for all of them.* Endless (3.4) then raises each door a step and makes one thing at a time the rule rather than the exception.

`from_depth` on today's templates (`survival.json templates` `:495`: ambush 3, caster_guards 3, healer_line 5, warden 8 and twin_elites 8 at the gate row) stays for the row inside a map. `from_stage` is added beside it.

---

## 6. A campaign states its tier

### 6.1 Today

- A campaign file has no tier and no level (`docs/design/campaign-format.md` "Top level").
- An encounter may carry `difficulty` and the enemies' `level` (`game.ts:1663-1670`); M813 gives none.
- So every M813 fight takes the party's level (`combat.ts:1785-1789`).
- M813's kicker says "ONE-SHOT · 2–3 SESSIONS" as text only (`m813.json` `kicker`).

### 6.2 The new fields (PROVISIONAL)

| Field | Where | What it is | Read by |
| --- | --- | --- | --- |
| `tier` | top level | `one_shot`, `season`, `campaign` or `epic` (curve section 10 item 1): **one_shot** a few sessions inside one level tier; **season** tiers I and II (levels 1 to 10, about 16 hours: Survival's five maps); **campaign** I to III (1 to 15, about 28 hours); **epic** I to IV (1 to 20 and the peak, about 40 hours and on) | the Room card, `validateCampaign` (that `levels` fits the tier), the progression drafter's XP pace |
| `levels` | top level | `{ start, end }`: the level the story is written to begin and end at | `validateCampaign`; the fallback for a zone with no level |
| `level` | each zone | **the place's level**: every fight in the zone without a level given takes it, then the Narrator's shift (−3 to +2) is added | `fightLevel` (`combat.ts:1785`) and the drill spawn (`game.ts:4331`) |
| `level` | encounter and enemy | exists (`game.ts:1663-1670`); now expected, not optional, on a shipped campaign | as today |
| `acts[].level` | each act | optional band `{ from, to }` for the validator to check its zones against | `validateCampaign` |

**The order a fight takes its level:** given outright → the encounter's → the zone's (plus the shift) → the campaign's `levels.start` (plus the shift) → **the party's (plus the shift), only for a file with no level anywhere** (a host's own custom file, `own.json`). The validator warns on that last fallback in a shipped campaign. *So a campaign's world, like Survival's, does not follow the party: a hard place is hard.*

**What M813 declares:**
- `tier: "one_shot"` and `levels: { start: 1, end: 3 }`;
- zones `shield_line` 1, `rear_pad` 2, `outpost` 2, `outpost_1` 3;
- encounters "Picking at the dead" 1, "The ramp" 2, "Station security" 3.

*The tutorial fight is at your level; the ramp is a level up as the guns turn on you; station security is the level you should have grown to by the end.* `curse`, `godplot` and `summoning` are campaign starts; they declare `tier: "campaign"` and zone levels when their acts are written. The Proving Ground (`proving.json`) keeps its waves' own levels and is not read here.

---

## Questions for the lead

1. **The Boss at 2m + 1 (3, 5, 7, 9, 11) or 2m + 2?** The brief allowed "3 or 4" for map 1. Recommended: **2m + 1.** A map-1 Boss at 4 against a level-2 or level-3 squad drops a frail character in two hits with a +2 gap to hit, before the class at level 3 has been played.
2. **Endless at one level a map (ten endless maps to level 20, about 2.4 hours each) or two (five maps of about 5 hours)?** Recommended: **one a map.** A map's 15 rows hold about 2.5 hours, and one level a map keeps "level-20 foes at about hour 40" without stretching a map.
3. **Celestial as a find from map 10, through `rewards.ceiling`.** The validator today says Celestial is never a ceiling, because the ceiling also caps the shop (`tools/validate.py:2960`). Recommended: **allow `celestial` in the ceiling list for reward rolls; the shop clamps to the highest sold grade at or under it** (a reader change in the shop, one rule).
4. **The party-level fallback in campaigns.** Keep it only for a file with no level anywhere (a host's custom), with a warning? Recommended: **yes.** Removing it breaks every custom file a host has saved.
5. **`pressure_kind`, harder rounds for hard and deadly fights.** Today only their length differs. Recommended: **yes**, at 1.15 / 1.25 / 1.35, re-measured by the run simulator before 0.34 ships.

---

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| Enemy HP, armour, Defense, attack and damage by level | `levelled()` (`packages/engine/src/data.ts:117`), `enemies.json levels.table` | the table's 20 rows (1.3); no code |
| Tier level-1 rows | `enemies.json items[]` hp, armour, defense, attack_bonus, damage | five rows (1.4) |
| The attacker and defender columns | 01-scale.md (not yet written) | the three column rules re-derived when it lands |
| Gap rules, guard, shift | `enemies.json levels.gap` and `narrator_shift`; `combat.ts:742`, `:752-790`, `:1787` | none |
| Foe level from the place (Survival) | `foeLevel` (`run/encounter.ts:74`), `tierLag` (`:65`) | `foeLevel`'s body becomes `worldLevel(stage, depth, tier)` reading `survival.json levels`; `eliteUp` and `stage.elite_up` deleted; `lag` reread as the offset |
| Foe cost by level difference | `foeCost` (`encounter.ts:83`), `lag_factor` (`survival.json:79`) | `lag_factor` 0.78; `tiers` bulk 0.25 / 0.5 / 1 / 2.0 / 7.5 |
| Budget by squad and kind | `budgetFor` (`encounter.ts:92`), `rounds`, `pressure_per_char`, `bulk_per_char_round` | read `pressure_kind` (new data key) and the final's rounds |
| Map term | `stage.bulk`, `stage.pressure` | 0.1 and 0.1 |
| Templates by map | `templatesFor` (`encounter.ts:116`), `templates[].from_depth`, slots' `from_depth` (`:146`) | add `from_stage` beside `from_depth` in the same filters (an extension of a filter that exists) |
| Tags by map and kit | slot `tags` (applied in `armed`, `encounter.ts:214`), `ai.tag_doors` (`enemies.json:729`), `armDoors` (`combat.ts:668`) | `armed` also adds `levels.maps[m].tags[tier]` and the endless kits' tags; new tag rows `plated*`, `skulk_ii/iii`, `faithful_ii/iii`, `bonded*` (data) |
| Guard on a tagged enemy, plates by Reach | `armGuard` (`combat.ts:700`), the door's Reach row (doors drafter) | `armGuard` reads Durability from every door block (tags included) and takes plates from the Reach row; the typed `guard.plates` is removed (one copy of the rule) |
| Enemy door amounts by level | the Level term of `effects/output.ts` | enemies read their level's column as a character does (no typed amount) |
| Casters' Line length | `sigils.json enemy_ai.max_words` | replaced by Brain Power in the caster's `doors.skills` through the Sigils Reach row |
| The final boss | `templates`, `champion`'s slot shape, setting `boss`, `soul_casters.heart_sovereign`, `casters.sigil_warden`, `heartfire_elite` | a new template `last_reckoning` (data); `composeEncounter` picks it and its rounds from `levels.final` on that stage's Boss node |
| Survival ends, endless begins | `endRun` and the `boon` / `tile` states (`run/state.ts:252-257`), `RunEnd.cleared` | the "Survival cleared" panel after stage `levels.final.stage` (text in data); the choice to retire or walk on uses today's retire |
| The account's upgrade | none | `levels.final.account_reward: null` (an empty slot, not read in 0.34) |
| Grade by map | `rewards.ceiling` (`survival.json:147`; `run/rewards.ts:156`), `vault` | lists by map; `tools/validate.py:2960` allows Celestial for reward rolls (Question 3) |
| Campaign tier and levels | `validateCampaign` (`packages/engine/src/campaign.ts`), `encounterLevels` (`game.ts:1663`), `fightLevel` (`combat.ts:1785`) | the fields of 6.2; `fightLevel` takes the zone's level before the party's |

## Needs a new primitive

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| 1. `worldLevel(stage, depth, tier)` | an exported reader in `run/encounter.ts` over `survival.json levels` (maps rows, endless rule, final); returns a level 1 to 20 | every level source today is the party's (`fightLevelOf`) or a number given outright. Nothing gives a level from a place. It replaces `foeLevel` and `eliteUp` rather than adding beside them |
| 2. The zone's level in `fightLevel` | `fightLevel(chars, { level, shift, place })`: a `place` level (the zone's, else the campaign's `levels.start`) that the shift is added to, before the party fallback | `fightLevel` knows only an outright level (no shift) or the party's; there is no "a level that the Narrator may still shift" |

The extensions, each of a piece that nearly does it and not new (listed for the lead's check):
- `from_stage` beside `from_depth`;
- map `tags` added in `armed` beside slot tags;
- `pressure_kind` beside `rounds` in `budgetFor`;
- `armGuard` reading tag blocks and the Reach row.

## What re-records

| What | Why it moves |
| --- | --- |
| `packages/engine/test/golden/enemies.json`, `rules-enemies.json` / `.log.json`, `costs-foes.json` | every enemy stat block and level row changes |
| `golden/replays.json`, `test/helpers/replay.ts` | seeded fights: foe HP, armour, Defense, levels and the generator's picks all move |
| `enemy-levels.test.ts`, `rules115-review.test.ts`, `rules123-defence.test.ts`, `bugsweep-1112.test.ts` | they read the level table and the gap at today's numbers |
| `survival-encounter.test.ts`, `survival-stage.test.ts`, `survival-vault.test.ts`, `survival-layout.test.ts`, `survival-faces.test.ts` | `composeEncounter`'s levels come from the map, not the party; `eliteUp` is gone; new `lag_factor`, tier bulk, `pressure_kind`, `from_stage`, the final template |
| `enemy-doors-183.test.ts`, `enemy-bonds-186.test.ts`, `enemy-ai-179.test.ts` | new tag rows, and Guard from tags and Reach in place of typed plates |
| `test/balance/survival-run*.test.ts`, `survival-run-levels.test.ts`, `party-fit.test.ts`, `step1-fit.test.ts`, `defence-measure.test.ts`, `balance-sim.test.ts` (`sim.ts`, `fit.ts`) | the run simulator's whole curve (levels by map, five maps and endless). The bars are re-set as readings, not lines (rules 1.94) |
| `magic-measure.test.ts` (castsToKill Elite ≥ 2, Boss ≥ 4), `shadow-measure.test.ts` | Elite and Boss HP and armour move; the guard assertion stays |
| `tools/validate.py` (the ceiling rule at `:2960`; the new `levels` block and campaign fields) | new checks, and one rule changed |
| `apps/web/e2e` suites that read a foe's HP or a Survival stage's level, and `npm run try` scenarios that name enemy numbers | displayed numbers change |
| `docs/rules/PHC-Core-Rules-v1.0.md` rules 1.15 and 1.41 to 1.48 (the spec first, then data) and `docs/design/survival-spec.md` | the text of the level table, the budget and Survival's shape |
