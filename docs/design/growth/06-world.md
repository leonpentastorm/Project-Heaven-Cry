# 06. The world's side: enemies, their levels, Survival's shape, the budget and campaign tiers

Drafter's file for the 0.34 rebalance, **second draft** (21 Nov 2026). **Nothing here is built.** Every proposed number is PROVISIONAL. It applies the lead's rulings (`00-rulings.md`: A1 to A3, A8, B15, C19, D22, D24, D25, D28) and fixes the critics' findings that name this file (the table "Critics' findings" at the end). Above it stand Leon's rulings and the charter (`docs/design/proposals/2026-11-21-the-curve.md`, sections 10 to 18).

**01-scale.md owns every shared number** (the factor x0.6, the level columns, the enemy columns `hp_mult`, `damage_mult`, `armour_mult`, `defense_plus`, `attack_plus`, the tier rows, character HP, armour, a plate, the grade ladder, Margins). This file quotes them by name (01 section 3.1 and T4 for the columns, 3.2 for the stated attacker and defender, 3.3 for Defense, 3.4 and T12 for the tier rows) and types none of its own. **05-pacing.md owns every rate and the clock** (ruling 22): map hours, the squad's level at a map's end, XP. **07-gear-perks.md owns the grade lists by map** (ruling 25). The first draft's enemy table (written on the charter's x0.45 before 01 existed) is discarded.

Facts about today were checked in data and code at `release/0.34-final` HEAD `d61ec6f13` and carry file:line. The derived tables (1.3, 1.4, 4.1, 4.2) are worked from 01's formulas with a read-only calculation; change a number in 01 and they move with it.

## 0. What changed from the first draft, in short

1. **The enemy table is 01's** (ruling A2, A3): smooth columns, Defense and to-hit level-free, tier Defense 8 / 9 / 11 / 14 / 15 fixed. My jumps at levels 5, 12 and 17 and my `defense_plus` that followed the expected attacker are gone (critic-consistency M1). What this file adds is the reading per map (1.3).
2. **Survival's shape follows ruling D24 and 05's clock:** five maps, foes 2m − 1 early, 2m late, the Elites and the Boss at 2m + 1, the final boss at 11; endless at one level a map to level-20 foes at about hour 40; hours from 05.
3. **The budget is re-derived on 01's columns:** a level of gap is about x1.38 of a foe's worth (`lag_factor` 0.72); Elite and Boss bulk re-read for their Defense 14 and 15; `pressure_kind` makes hard, deadly and final fights press harder a round (D24); the map term is 0 while foes climb and only grows past level 20.
4. **Enemy doors read the same ladders as characters:** tag steps at the Reach points, with the family points ruling 13 asks; plates soak on `armour_mult`, dealt amounts on `damage_mult` (01 section 3.1); casters' Line length and stage from Brain Power and Will Power in their door blocks; the Pressure tier offset as data on the tier row (ruling 19).
5. **The migration of ruling B15 is written here** (section 7): no live character loses a point above a new ceiling or a rank III held before level 15.

---

## 1. The enemy table

### 1.1 Today (checked)

**The tier rows are the level-1 numbers** (`data/enemies.json`): vermin (`:7`), minion (`:39`), Soldier (`:70`), Elite (`:105`), Boss (`:146`), each with `hp`, `defense`, `attack_bonus`, `armour`, a `damage` factor and a `lag` (levels under the fight level: vermin and minion 3, Soldier 1 and 2 from level 10 at `:102`, Elite and Boss 0).

**The level table** (`enemies.json:214`, rows 1 to 20) raises them: at level 20 `hp_mult` 8.4844, `armour_mult` 7.5, `damage_mult` 8.5312, `defense_plus` 6 and `attack_plus` 6 (01 T1 prints the column today).

**How it is applied.** `levelled()` (`packages/engine/src/data.ts:117`) gives HP = hp x hp_mult and armour = armour x armour_mult (rounded), Defense + defense_plus, attack + attack_plus, and the damage factor x damage_mult. `unitFromEnemy` (`combat.ts:636`) puts them on the unit; the factor becomes `lvlDmg`, which an enemy's weapon hit multiplies.

**The level-gap rules** (`enemies.json:199-212`): `one_hit_levels_below` 5 (a foe, never an Elite or a Boss, five or more levels under the attacker dies to any damaging hit; `combat.ts:738-742`); `to_hit_per_level` 1 up to `max_levels` 5 (the higher +1 a level, the lower -1, `levelGap`, `combat.ts:732-737`, read in the one to-hit hook, `combat.ts:1502`); `full_hp_guard` (an Elite or a Boss at or above the attacker's level is left on 1 HP by any single action from full; `combat.ts:752`); `narrator_shift` -3 to +2 (`:195`; `fightLevel`, `combat.ts:1785-1789`).

**The doors on enemies.** `armDoors` (`combat.ts:668-686`) reads a row's `doors` blocks: `hold`, `skills` (the highest across blocks, `:673`), `faith` (**the last block's wins**, `:675`), `wants` and `hands`. The tag rows are `ai.tag_doors` (`enemies.json:729`): `faithful` (Nerukhan, Devotion 3, Faith 1) and `skulk` (Tag, Ingenuity 3). Guard is apart: `armGuard` (`combat.ts:700-704`) reads a row's own `guard.plates` and `guard.durability`, typed per row (`heartfire_elite`, `enemies.json:603`: plates 3, Durability 5).

**Casters.** Sigil casters (`casters`, `enemies.json:432`) take their Line length from `sigils.json enemy_ai.max_words` by tier (`sigils.json:318`: minion 2, Soldier 3, Elite 4, Boss 4), with a second copy typed in code (`sigil.ts:1444`, `ENEMY_MAX_WORDS`). Soul casters (`soul_casters`, `:520`) carry `mp` 80 / 140 / 220, `strain_limit` 4 / 5 / 6, `free_pumps` 0 / 1 / 2 and `reach_bonus` 0 / 0 / 1 (`:527-530`, `:569-572`, `:621-624`).

**Pressure's cap by tier** is typed in the reader by tier name (`physical/pressure.ts:15-17`, `pressureCap`).

### 1.2 The columns and the rows: 01's, quoted

- **Columns** (01 section 3.1, T4): `hp_mult` = 140^((L - 1)/19), `damage_mult` = 54^((L - 1)/19), `armour_mult` = `deal`, `defense_plus` and `attack_plus` 0 at every level. They replace `enemies.json:214` row for row.
- **Whom they are written for** (01 section 3.2): the stated attacker (T4b: a one-door specialist at the gated attribute and alpha, one grade under the map's best, the ordinary sheet sum) and the stated defender (T4c: the frail character in Light armour). The map's best grade those bands read is ruling 25's (section 3.2 below gives the maps their levels).
- **Defense and to-hit** (01 section 3.3, ruling A3): the tier's own, fixed: vermin 8, minion 9, Soldier 11, Elite 14, Boss 15; to-hit +0 / +1 / +3 / +5 / +6. The gap (+1 a level to 5) is the only way a level touches the roll. *A point of skill is always a Margin you can see, and "against an Elite the same roll just lands" holds at every level.*
- **Tier rows** (01 section 3.4, T12's last table): HP and armour today's x0.6, the damage factor x1.28.
- **One field this file adds to each tier row, from ruling 19:** `pressure_off`, the levels under the best Reach laid on the target that its Pressure cap stands at: vermin, minion and Soldier 0, Elite 1, Boss 2. `pressureCap` reads it (critic-consistency section 5 item 2) in place of the tier names. *An Elite shakes off one pip of what the best shooter lays, a Boss two.*
- **`lag` is read again** as the offset under the place's level (section 2.2): vermin and minion 1, Soldier, Elite and Boss 0 (one row each, `{ from: 1, lag: n }`). *A swarm is a level under its masters, so more of them fit the room.*

### 1.3 What the squad meets on each map (derived from 1.2 and section 3.2)

Foe levels are section 3.2's; the squad's levels and the hours are 05's (section 1, the pinned map table; endless at one level a map by ruling D24). A foe's rifle hit is a service rifle (18) in its hands, as 01 T12 counts it. PROVISIONAL with everything it is made of.

| Map | Soldier at the early level: HP / armour / rifle hit | Elite at the map's top level | Boss at the map's top level |
| --- | --- | --- | --- |
| 1 (foes 1 / 2 / 3) | 84 / 3 / 18 | 242 / 9 / 37 | 828 / 9 / 42 |
| 2 (3 / 4 / 5) | 141 / 4 / 27 | 408 / 13 / 56 | 1,392 / 13 / 64 |
| 3 (5 / 6 / 7) | 238 / 7 / 42 | 686 / 19 / 85 | 2,343 / 19 / 97 |
| 4 (7 / 8 / 9) | 400 / 10 / 63 | 1,153 / 28 / 130 | 3,941 / 28 / 148 |
| 5 (9 / 10 / 11) | 673 / 14 / 97 | 1,940 / 42 / 197 | 6,630 / 42 / 226 (the final boss) |
| 8 (12 / 13 / 14) | 1,468 / 25 / 181 | 4,234 / 75 / 371 | 14,467 / 75 / 424 |
| 10 (14 / 15 / 16) | 2,470 / 37 / 276 | 7,123 / 110 / 564 | 24,338 / 110 / 645 |
| 14 (18 / 19 / 20) | 6,990 / 81 / 639 | 20,160 / 240 / 1,306 | 68,880 / 240 / 1,493 |

The stated attacker of the squad's level (01 T4b, its rifle variant of T12) against those foes, in plain hits after armour (no Margins, no misses), and the stated defender's count of the top foe's hits:

| Map | Its rifle specialist on arrival: hits on an early Soldier | At the Boss (the squad's level then): hits on the Elite / the Boss | The frail character at that level survives the Elite's / the Boss's hits |
| --- | --- | --- | --- |
| 1 | 2.7 (level 1) | 4.3 / 14.6 (level 4) | 3.6 / 3.1 |
| 2 | 2.3 (level 4) | 5.3 / 18.2 (level 5) | 2.8 / 2.4 |
| 3 | 2.9 (level 5) | 5.0 / 17.0 (level 7) | 2.9 / 2.4 |
| 4 | 2.7 (level 7) | 6.9 / 23.7 (level 8) | 2.2 / 1.9 |
| 5 | 3.7 (level 8) | 6.0 / 20.3 (level 10) | 2.3 / 1.9 |
| 8 | 2.7 (level 12) | 6.9 / 23.4 (level 13) | 2.2 / 1.9 |
| 14 | 2.9 (level 18) | 7.1 / 24.4 (level 19) | 2.2 / 1.9 |

What a player reads off it:
1. **A Soldier is two and a half to four solid hits at every map** (01's promise that fight length holds), and the Boss is a squad's fight everywhere: 15 to 24 of one specialist's plain hits at the full four-player share.
2. **The map's top is one level over a squad that walked it** from map 4 on (05's squad gains about 1.4 levels a map there): the +1 to hit and a level's HP are felt, and **a frail character goes down to two hits of the Elite or the Boss** (at equal level 01 T12 gives three to three and a half). *The last fight of a map is where the wall earns its place.* On map 1 the squad levels past the Boss (05: the class and three levels come in the first map), so map 1's Boss is the one a squad meets at or under its level: the full-HP guard is off for a squad of level 4.
3. **Rushing shows:** a squad that skips map 2's fights reaches the Boss at 4, a level under it: the gap's -1 to hit, a level's HP and 1.39 of the room (section 4.1).

### 1.4 What one level does, on these columns

One level of gap between a foe and the squad moves its HP x1.297 (`hp_mult`'s step), its hit x1.234 (`damage_mult`'s step) and both rolls by one (the gap rule). Through 01 T10's expected worth (the stated attacker at +6 against Defense 11, Perception 1) that is **about x1.41 the turns to drop it and x1.35 what it deals a round**: one foe a level over is worth about 1.38 foes of your level. That is the budget's `lag_factor` (section 4.1).

**The gap rules (kept, unchanged numbers):**
- **`one_hit_levels_below` 5:** a foe five levels under already has a quarter of the HP of one at your level (1.297^5 = 3.7); the rule finishes the sliver. *Go back to an early map's foes five levels later and they drop to anything.*
- **`to_hit_per_level` 1, `max_levels` 5:** with Margins (01 section 9) each level of gap also moves the Margin threshold by one, so a level ahead is felt in how hard you hit as well as how often.
- **The full-HP guard (kept):** on 01's scale a level-20 Elite has 20,160 HP (16,128 at the four-player share) and a specialist's largest legal turn reaches five digits (01 T11, under 100,000 by ruling A8), so a top cash-out can take an Elite of your level from full: it is left on 1 HP and the next action ends it. A Boss (68,880 at level 20) takes several. *The big blow is the turning point of a Boss fight, never its whole story.* A squad a level over the map's Elite has no guard to face: *over-level and the guard is gone.* The Miracle and an execution stay past it (spec rules 1.15 point 4).
- **`narrator_shift` -3 to +2:** kept. In a campaign it now shifts the zone's level, not the party's (section 6).

### 1.5 Enemies and the doors

**One copy:** an enemy's door does what a character's does, at the enemy's door points and its level.
- **Reach comes from points**, read from the door's ladder (02 to 04; the door-ladder piece, critic-consistency S2). Guard's plates, Shadow's meter, a Line's length, an Outburst's top stage and Bonds held are never typed into an enemy row.
- **A tag at a Reach step carries the family that step needs** (ruling 13): at alpha 7 the door's beta at 4; at alpha 10 the beta at 7 and the gamma at 4. *A level-15 skulker hides as deep as a character with the same points does, and a player reads it off the ladder it climbs.*
- **What an enemy deals through a door** (a Slam, a Snap, a Rebuke, an Outburst, a Figment's blow) reads `damage_mult` at its level (01 section 3.1: an amount reads the column of its dealer; critic-consistency minor 4). **What it soaks** (a plate) reads `armour_mult`, as its armour does: 01 sets a character's plate on `deal` (T8), and `armour_mult` = `deal`, so *a plate is a plate on either side of the board.* A heal or a shield an enemy gives reads its own multipliers as today (`mending.level_factor.who`, 01 section 3.1).

**The tag rows** (`ai.tag_doors`; data only; PROVISIONAL). Step I keeps today's points where a tag exists; II and III are the Reach steps at 7 and 10.

| Tag (I / II / III) | Door points (with ruling 13's family at II and III) | What the player meets |
| --- | --- | --- |
| `plated` / `plated_ii` / `plated_iii` (new) | Durability 4 / 7 / 10; Pain Threshold 4 at II, 7 at III; Sensory 4 at III | the plates 02's ladder gives at those points; Challenge and Slam from the Durability ladder, as `heartfire_elite`'s `wants` hold them (`enemies.json:604-611`) |
| `skulk` (exists, Ingenuity 3) / `skulk_ii` / `skulk_iii` | Ingenuity 3 / 7 / 10; Analysis 4 at II, 7 at III; Vigilant 4 at III | Tag and Hide; the deeper meter at II; the Break from Hidden at III |
| `faithful` (exists, Devotion 3, Faith 1) / `faithful_ii` / `faithful_iii` | Devotion 3 / 5 / 7, Faith 1 / 3 / 5 (the standing that opens Hymn I / II / III; Witnessed at Faith 5) | Whispers (Health under half HP); a Hymn at II; Witnessed at III |
| `bonded` / `bonded_ii` / `bonded_iii` (new) | Empathy 4 / 7 / 10, an Attuner in hand (`hands`); Camaraderie 4 at II, 7 at III; Implication 4 at III | Bond, Tug the runner back, Snap the one nearly done; the Bonds 04's ladder holds at those points |

**Guard by the same reader:** `armGuard` reads Durability from every door block (tags included) and takes the plates from the ladder; the row's typed `guard` block goes (one copy of the rule). `heartfire_elite` becomes `doors.skills.durability` 5 (today's points).

**Faith by the highest:** `armDoors` takes the highest Devotion and Faith across blocks, as it takes the highest skill, so a tag never lowers a caster's own standing (today the last block wins, `combat.ts:675`).

**The casters keep their rows**, read through the same ladders:
- **Sigil casters' Line length** comes from Brain Power in their door block, on 03's ladder (Line 2 / 3 / 4 at Brain Power 1 / 4 / 7, ruling 19): a minion-tier caster Brain Power 1, a Soldier 4, an Elite and a Boss 7 (with Rumination 4), so each keeps today's length. `sigils.json enemy_ai.max_words` and `ENEMY_MAX_WORDS` (`sigil.ts:1444`) go: a second copy of the rule.
- **Soul casters' top stage** comes from Will Power in their door block, on 04's ladder (ruling 16: the top stage is bought): the heart adept Will Power 4 (stage 3), the heartfire elite 7 (stage 4, with Composure 4), the heart sovereign 10 (stage 5, with Composure 7 and Lore Master 4). `reach_bonus` goes. *A Soldier's heart fills to three, an Elite's to four, a Boss's to five, as a player's would at those points.*
- **Soul casters' MP:** today's `mp` (80 / 140 / 220) stays as the level-1 pool and rides `mp` at the caster's level (01 T7b: "an enemy caster's pool, x mp at its level"). *They already hold about three of their own full cash-outs (the adept's Heart bolt full is 28 MP; the sovereign's lance 56), a fight's worth, as a character's pool holds about four.* `strain_limit` and `free_pumps` are counts and do not scale.

---

## 2. Levels of their own

### 2.1 Where the party's level sets a foe's level today (checked)

1. **Survival's generator.** `composeEncounter` (`run/encounter.ts:164-166`) sets `L = fightLevelOf(inp.levels)`, the living characters' average rounded down (`data.ts:124`); the callers pass the party's levels (`game.ts:3621` a node's fight, `run/ambush.ts:83` an ambush).
2. **`foeLevel`** (`encounter.ts:74-75`): an ordinary tier is L - `tierLag` (`:65-68`); an Elite or a Boss is L + `eliteUp(stage)` (`:70`, `survival.json stage.elite_up` {per 2, max 4}, `:61`). *The foes copy the party and the growth cancels.*
3. **`foeCost`** (`encounter.ts:83-86`) prices a foe by `lag_factor`^(L - level) (`survival.json:79`, 0.83).
4. **Story fights.** `fightLevel` (`combat.ts:1785-1789`): the level given outright, else the party's average plus the Narrator's shift. `encounterLevels` (`game.ts:1664-1670`) takes a prepared encounter's or enemy's `level`; M813's encounters give none (`data/campaigns/m813.json:73`, `:93`, `:132`).
5. **The drill spawn.** `sandbox/spawn` (`game.ts:4331`, `:4352`): "empty is the squad's level".

### 2.2 What replaces it

**A foe's level comes from the place** (ruling D24: "an enemy's level comes from the map and the row, never from the party"). In Survival from the map (the run's `stage`) and the node's row, read from a new `survival.json levels` block (section 3.2) by `foeLevel`, whose body is rewritten to read it (`worldLevel`'s work; critic-consistency section 4: a rewrite, not a new piece); `eliteUp` and `stage.elite_up` are deleted. In a campaign from the zone (section 6). The drill spawn takes the zone's level when the campaign gives one, else the squad's.

**The party's level is used for one thing:** the budget's level difference (section 4), how much of the room a foe takes for *this* squad. *Taking the long road makes you stronger than the map; rushing to the Boss makes you weaker than it. A level means something because the world does not follow you.*

---

## 3. Survival's shape

### 3.1 Today (checked)

- A run is stages, each a 15-row path map: the gate Elite at row 8, the final junction at 13, the shop and rest at 14, the Boss at 15 (`survival.json:805-812`, `map`).
- After a Boss: a boon of three and the next stage's tile from `world.offer` settings (`:413`; `run/stage.ts:125-134`).
- It runs until the squad falls or retires after a Boss (`run/state.ts:252`, `:257`; `RunEnd.how` 'lost' or 'retired', `:71`). No final boss, no end.
- **Grade ceilings:** `rewards.ceiling` fine / masterwork / relic for stages 1 / 2 / 3+ (`:147`; `stageCeiling`, `run/rewards.ts:156`); the validator refuses Celestial in it (`tools/validate.py:2959-2960`) and `cappedRarity` turns a Celestial roll into a Relic (`run/rewards.ts:159-163`). The vault: `grade_up` 1, `grade_max` relic (`:580`).
- **The stage term:** bulk x(1 + 0.42 (s - 1)) and pressure x(1 + 0.35 (s - 1)) (`:55-62`; `budgetFor`, `encounter.ts:92-96`).

### 3.2 Five maps, then endless (ruling D24; PROVISIONAL)

The run's `stage` stays the counter (saves load unchanged); on screen it is **the map**. Maps 1 to 5 are Survival proper; map 6 on is endless. "Early" is rows 1 to 7, "late" rows 9 to 14; the gate Elite (row 8), every Elite node and the vault's guard take the top column.

| Map | Early foes | Late foes | Elites, gate, vault guard | Boss | Squad arrives / leaves (05) | Hours (05) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 2 | 3 | 3 | 1 / 4.3 | 0 to 3.0 |
| 2 | 3 | 4 | 5 | 5 | 4.3 / 5.9 | 3.0 to 6.1 |
| 3 | 5 | 6 | 7 | 7 | 5.9 / 7.2 | 6.1 to 9.3 |
| 4 | 7 | 8 | 9 | 9 | 7.2 / 8.6 | 9.3 to 12.6 |
| 5 | 9 | 10 | 11 | **the final boss, 11** | 8.6 / 10.0 | 12.6 to 16.0 |
| endless, map n (6 on) | n + 4 | n + 5 | n + 6 | n + 6 | n + 4 / n + 5 | 2.4 a map from hour 16 |

Every level is capped at 20 (`enemies.json levels.max`). The Elites and the Boss reach 20 on map 14 (hour 35.2 to 37.6), the late rows on map 15 (to hour 40), everything on map 16: **level-20 foes at about hour 40, as the squad reaches 20** (05's XP table, level 20 at hour 40).

**Why these numbers (one line each):**
- **Two levels a map, the Boss at 2m + 1** (ruling D24): *the Boss is the top of the map, a level over a squad that is still climbing, at its level if it fought for it.*
- **Early foes at the map's opening level, late foes one up:** *the map's second half is harder, and by then you have levelled into it.* On map 2 the early rows are a level under the squad (05 front-loads map 1 with the class), so *the class is played on a map's easy half before the map climbs.*
- **The final boss at 11 for a level-10 squad** (D24): *the last fight of Survival is one level over you: the gap's +1 to hit, a level's HP and the guard.*
- **Endless at one level a map, about 2.4 hours** (D24; 05's XP table: 2.4 hours a level from level 6): *each endless map is a level for you and a level for them.* **For 05:** its first draft's endless row (maps of 3.5 to 4.5 hours, about 1.5 levels each) is what D24 replaces; at 1.5 levels a map the squad would stand four levels over its foes by map 11 and earn a third of a fight's worth (critic-consistency S12). 05 sets the endless XP so a map is about a level.

**The grade a map finds and sells** is ruling 25, written as 07's lists: Fine on maps 1 and 2, Masterwork on 3 and 4; Relic found on map 5 and sold only in endless; Celestial found only, from map 10 (the vault and one Boss pick in four). The hours above are the ones 07's table quotes. The stated attacker's grade bands (01 T4b) read the same rows.

**What the player sees (critic-player 16):** the path map's card and each fight node show the foes' level beside the squad's (read from `levels` and `fightLevelOf`; client text), so a level gained is read as "map 2's Soldiers now fall faster" and a level rushed as "this Boss is a level over you".

### 3.3 The final boss (data, from existing rows)

A template **`last_reckoning`**, the one template on map 5's Boss node (`survival.json levels.final.template`), with target rounds 12 (`levels.final.rounds`; a Boss's is 9). Its slots, filled by the generator as every fight's are:

1. **The final boss** (required): tier `boss`, `boss: true` (the setting's Boss block for its name, kind, weapon and face, as `armed` reads it today, `encounter.ts:197`), caster `heart_sovereign` (`enemies.json:616`: Sovereign lance, Rime bolt, Gale heart, Sovereign's grace; Mother Ember at Devotion 6), tags `plated_ii` and `faithful_ii`: plates, Slam, Hymns and an Outburst it builds to stage 5 and holds.
2. **A `sigil_warden`** (`enemies.json:469`, tier Elite; SHOCK, FREEZE, CHAIN and WARD among its words), optional, one.
3. **A `heartfire_elite`** (`:564`) with `plated`, optional, one.
4. **Minions, up to four, tag `bonded`**, optional: they Tug a runner back to the boss.

*It asks for everything the five maps taught: break plates, kill the words, keep the line together against FIRE and CHAIN, do not run from the Bonds, and build a cash-out for the turn its plates are down.* No new behaviour: every piece is a row that exists.

- **Its numbers at level 11** (1.2's columns): HP 6,630 at the four-player share (`share.boss.hp` 1; 1,856 / 3,315 / 4,973 for squads of 1 to 3), armour 42, Defense 15, +6 to hit, a rifle-class hit 226. About 20 plain hits of a level-10 rifle specialist (01 T12: 368 a hit at level 10, less its armour).
- **What it fills:** the Boss is about 9.8 Soldier-equivalents of bulk at four (section 4.1), the final room 12 (section 4.2): a squad of four meets the sovereign, one lieutenant and its minions; a solo meets the sovereign at its share and the minions. The generator scales HP to the bulk target as for every fight (`encounter.ts:170-185`).
- **After it falls:** the boon of three as after every Boss, then the **Survival cleared** panel with the run's score. The account's permanent upgrade is a slot that ships empty: `levels.final.account_reward: null`, text "Kept for when accounts exist" (charter: not in 0.34). Then the squad **retires** (`how: 'retired'`) or **walks on** into endless (map 6's tiles).

### 3.4 Endless: how it keeps getting meaner (PROVISIONAL)

- **Levels:** one a map (3.2) until foes stop at 20 on map 16. *Level-20 foes arrive as your character reaches 20; from then on the fights change, not the numbers.*
- **Numbers past the cap:** from the first map whose every foe is 20 (map 16), the map term adds +0.1 bulk and +0.1 pressure a map with no end (section 4.3). *Each map past the cap puts a little more in the room: about one more Soldier in a four-squad's plain fight every two maps.*
- **What a fight is made of: a kit a map, in this order** (each endless map adds the next; after the eighth the list starts again one tag step stronger, to `_iii`):

| Endless map | Kit added | What the squad must answer |
| --- | --- | --- |
| 6 | Soldiers `plated_ii` | plates on the line: armour-piercing, Slam, a cash-out for a plate-less turn |
| 7 | casters in plain fights (`caster_guards` and `healer_line` weight x2) | kill the words first |
| 8 | Elites `faithful_ii`, Bosses `faithful_iii` | Witnessed foes; silence or Rebuke |
| 9 | minions `skulk_ii` everywhere | spotting; flanks are never safe |
| 10 | Elites `bonded_ii` | a runner is Tugged back; break the Bond or fight in its reach |
| 11 | an Elite slot in plain fights (`firing_line`'s Elite slot from row 1) | every fight has a centre |
| 12 | the gate draws `twin_elites` (squads of 3 or more, its `min_party`; else `elite_pack`) | two plated centres at once |
| 13 | the Boss node draws `last_reckoning` at the map's level | the final boss, again, meaner |

**Kinds and kits by setting** stay as they are: a setting's `kinds`, `pools`, `boss` and `vault_guard` (`survival.json settings`, `:559`). Endless repeats settings once all are played (`world`, `:413`, already falls back). A setting's `pools` may name Items 2.0 rows (data).

**The boon cap** stays (ruling A10, 01 section 12): past it a Boss's boon of three is worth 0, and its card says so (critic-consistency minor 6).

### 3.5 What today's keys become

| Key (today) | Becomes |
| --- | --- |
| `RunState.stage` (`run/state.ts:112`) | unchanged: the map number; 1 to 5 Survival, 6 on endless |
| `survival.json stage.elite_up` (`:61`) | deleted (replaced by `levels`) |
| `stage.bulk` 0.42, `stage.pressure` 0.35 (`:57-58`) | 0.1 and 0.1, counted from `stage.from` 16 (section 4.3) |
| `stage.credits`, `stage.xp` (`:59-60`) | 05's (05 retires `stage.xp` for its XP by the fight's level) |
| `rewards.ceiling` (`:147`), `vault.grade_max` (`:580`), the validator's rule (`tools/validate.py:2960`), `cappedRarity`'s Celestial clamp (`run/rewards.ts:161`) | 07's lists under ruling 25; 07 owns the reader change |
| `enemies.json items[].lag` | kept in shape; the offset under the place's level (1.2) |
| `enemies.json items[].pressure_off` (new) | 0 / 0 / 0 / 1 / 2 (1.2, ruling 19) |
| new `survival.json levels` | `{ maps: [ { map, early, late, top, boss, tags: { tier: [tag] } } x5 ], endless: { from_map: 6, early: 4, late: 5, top: 6, per_map: 1, kits: [ ... ] }, final: { stage: 5, template: "last_reckoning", rounds: 12, account_reward: null, text } }` (endless levels are the map number plus the offsets) |
| `templates[].from_depth` | joined by `from_stage` on templates and slots (section 5) |
| `rounds` (`:64`) | joined by `pressure_kind` (section 4.2) |

---

## 4. The fight budget by level difference

### 4.1 The cost of one foe (Soldier-equivalents, SE)

Today (`survival.json tiers`, `:70-77`): bulk / pressure vermin 0.3 / 0.3, minion 0.55 / 0.75, Soldier 1 / 1, Elite 2.1 / 2.2, Boss 7.9 / 3; `foeCost` multiplies by `lag_factor`^(squad - foe) and the Elite and Boss share by squad size (`share`, `:80-83`).

**New (PROVISIONAL), each derived, not fitted:**
- **Pressure rows unchanged.** 01 moves every tier's damage factor by the same x1.28 and keeps the tiers' to-hit, so a tier's hurt per round against a Soldier's is what it was.
- **Bulk rows re-read for the new Defense** (01 section 3.3): today's bulk x (the stated attacker's expected worth against the old Defense over against Soldier 11, today's rules) x (its worth against Soldier 11 over against the new Defense, 01 T10). It holds within a few hundredths for to-hit +6 to +12: **vermin 0.25, minion 0.5, Soldier 1, Elite 2.5, Boss 9.8.** *An Elite and a Boss are harder to hit (14 and 15), so each takes more of the squad's turns than its HP alone says, and the generator must know it.*
- **`lag_factor` 0.83 becomes 0.72** (1.4: a level is about x1.38). *A foe one level over you takes about two fifths longer to drop and hits about a third harder: it fills the room like 1.4 foes of your level.*

Cost factor by **foe level minus the squad's level** (the squad's level: the living characters' average rounded down, `data.ts:124`):

| Foe - squad | -5 | -4 | -3 | -2 | -1 | 0 | +1 | +2 | +3 | +4 | +5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| x cost | 0.19 | 0.27 | 0.37 | 0.52 | 0.72 | 1 | 1.39 | 1.93 | 2.68 | 3.72 | 5.17 |

At -5 the one-hit rule ends any ordinary foe at the first hit; its cost there is the room it takes until it is hit.

**Rushing, for squads of 1 to 4:** map 2's gate Elite (level 5) against the hard room (6.5 rounds; 4.2), bulk cost / pressure cost, by the squad's level:

| Squad of | Hard room (bulk / pressure) | Squad at 3 | at 4 | at 5 (walked it) | at 6 |
| --- | --- | --- | --- | --- | --- |
| 1 | 1.6 / 1.5 | 3.6 / 2.6 | 2.6 / 1.8 | 1.9 / 1.3 | 1.4 / 1.0 |
| 2 | 3.3 / 2.1 | 4.8 / 4.2 | 3.5 / 3.1 | 2.5 / 2.2 | 1.8 / 1.6 |
| 3 | 4.9 / 3.1 | 4.8 / 4.2 | 3.5 / 3.1 | 2.5 / 2.2 | 1.8 / 1.6 |
| 4 | 6.5 / 4.1 | 3.9 / 3.4 | 2.8 / 2.4 | 2.0 / 1.8 | 1.4 / 1.3 |

*Rushing is felt in the generator too: a squad two levels short meets the gate Elite alone and it is a wall (its HP is what its level says; its damage is brought to the room's cap, as `anchorDamage` does today, `encounter.ts:158-162`); a squad that walked the map meets the Elite and its line.*

### 4.2 The budget by squad and difficulty

Difficulty words map onto Survival's node kinds; a campaign encounter's `difficulty` (easy, standard, hard, `campaign-format.md:21`) reads the same rows, easy as light. Bulk is `bulk_per_char_round` 0.25 x n x rounds (`:65`); pressure is `pressure_per_char`[n - 1] x n (`:66`) x the new `pressure_kind` (ruling D24: "hard, deadly and final fights press harder a round as well as lasting longer").

| Difficulty (node kind) | Rounds | `pressure_kind` (new) | Squad of 1: bulk / pressure | of 2 | of 3 | of 4 |
| --- | --- | --- | --- | --- | --- | --- |
| light (a plain fight at row 1 or 2; easy) | 4 | 0.85 | 1.0 / 1.1 | 2.0 / 1.5 | 3.0 / 2.3 | 4.0 / 3.1 |
| standard (a plain fight) | 5 | 1.0 | 1.25 / 1.3 | 2.5 / 1.8 | 3.75 / 2.7 | 5.0 / 3.6 |
| hard (an Elite, the gate; the vault's guard x1.3 on both, `:580`) | 6.5 | 1.15 | 1.6 / 1.5 | 3.25 / 2.1 | 4.9 / 3.1 | 6.5 / 4.1 |
| deadly (a Boss) | 9 | 1.25 | 2.25 / 1.6 | 4.5 / 2.25 | 6.75 / 3.4 | 9.0 / 4.5 |
| final boss | 12 | 1.35 | 3.0 / 1.8 | 6.0 / 2.4 | 9.0 / 3.65 | 12.0 / 4.9 |

`pressure_kind`, one line each: *the first fights of a map are a warm-up (0.85); an Elite's room hurts more each round, so you feel it in the first exchange, not the sixth (1.15); a Boss's more (1.25); the last fight of Survival most (1.35).* Today the pressure cap does not read the kind at all (`budgetFor`, `encounter.ts:95`). The run simulator re-measures them before 0.34 ships, as readings.

**A Boss at four fills its room:** the Boss's bulk (9.8 at the four-player share 1) is inside the deadly room's band (9.0, `bulk_band` 0.15), so a four-squad's Boss comes with few or no adds where today it came with about one Soldier's worth. This is the honest cost of Defense 15 at 01's HP (question 1).

### 4.3 Where the generator reads it

- `budgetFor` (`encounter.ts:92-96`) multiplies the pressure cap by `pressure_kind`, takes the final's rounds from `levels.final`, and counts the map term from `stage.from`: (1 + 0.1 x max(0, s - from)) on bulk and on pressure. *While foes climb, their levels are the growth; a map term on top would make a level-15 fight longer than a level-5 one twice over (01's `hp_mult` already lets a level-20 fight run about a third longer).*
- `foeCost` (`:83-86`) keeps its formula, with the squad's level, the foe's place level and `lag_factor` 0.72.
- `fill` (`:128-160`) gets each foe's level from `foeLevel`'s new body (the place).
- `bulk_band`, `pressure_band`, `max_foes` and `share` are unchanged.

---

## 5. Each map asks something different (PROVISIONAL)

A map's identity is its **order** (players pick the setting, `world`), so what it is made of is read from `levels.maps[m]`: which templates may be drawn there (`from_stage` on templates and slots) and which tags its foes carry by tier (`tags`).

| Map | Templates that open here (today's ids, `survival.json:495-558`) | Tags its foes carry | What it asks of the squad |
| --- | --- | --- | --- |
| 1 | `firing_line`, `swarm`, `rush`, `machines`, `elite_pack` (gate), `champion` (Boss) | the gate Elite and the Boss `plated` | aim, cover, focus fire; it **meets Guard once** at the gate, so the Durability door is learned by facing it |
| 2 | + `ambush` (`skulk` minions and Soldiers) | minions `skulk` | spotting, flanks, not walking into the open; Soldiers' Suppress lays Pressure on you |
| 3 | + `caster_guards`, `healer_line` (from row 1 of the map, not rows 3 and 5 as now), `warden` (gate) | casters `bonded` | spread out against FIRE, kill the healer first, break or respect the Bonds |
| 4 | + `twin_elites` (gate, squads of 3 or more) | Soldiers `plated`; Elites `faithful` | armour-piercing and the big cash-out, Slam plates, Rebuke prayers |
| 5 | everything; `firing_line`'s Elite slot opens from row 9 | Elites `plated_ii`; casters `faithful` | all of it at once, then `last_reckoning` |

*So the five maps teach the doors on the other side one at a time, and the final boss asks for all of them.* Endless (3.4) then raises each door a step and makes one thing at a time the rule. `from_depth` on today's templates (`ambush` 3, `caster_guards` 3, `healer_line` 5, `warden` 8, `twin_elites` 8) stays for the row inside a map; `from_stage` is added beside it.

---

## 6. A campaign states its tier (ruling D28)

### 6.1 Today

- A campaign file has no tier and no level (`docs/design/campaign-format.md` "Top level").
- An encounter may carry `difficulty` and the enemies' `level` (`game.ts:1664-1670`); M813 gives none, so every M813 fight takes the party's level (`combat.ts:1785-1789`).
- M813's kicker says "ONE-SHOT · 2–3 SESSIONS" as text only (`m813.json:6`).

### 6.2 The new fields (PROVISIONAL)

| Field | Where | What it is | Read by |
| --- | --- | --- | --- |
| `tier` | top level | one of 05's content tiers (05 section 2, "Campaigns: the author's rule"; `rules.json pacing_target.tiers`): `one_shot`, `season`, `campaign`, `epic`; their hours and levels are 05's rows, not typed here | the Room card, `validateCampaign` (`packages/engine/src/campaign.ts:122`: that `levels` fits the tier's row), 05's XP pace |
| `levels` | top level | `{ start, end }`: the levels the story is written to begin and end at | `validateCampaign`; the fallback for a zone with no level |
| `level` | each zone | **the place's level**: every fight in the zone with no level given takes it, then the Narrator's shift (-3 to +2) | `fightLevel` (`combat.ts:1785`), the drill spawn (`game.ts:4331`) |
| `level` | encounter and enemy | exists (`game.ts:1664-1670`); now expected on a shipped campaign | as today |
| `acts[].level` | each act, optional | a band `{ from, to }` the validator checks its zones against | `validateCampaign` |

**The order a fight takes its level:** given outright, then the encounter's, then the zone's (plus the shift), then the campaign's `levels.start` (plus the shift), then **the party's (plus the shift), only for a file with no level anywhere** (a host's own file), with a validator warning on a shipped campaign (ruling D28). *A campaign's world, like Survival's, does not follow the party: a hard place is hard.*

**What M813 declares:** `tier: "one_shot"` and `levels: { start: 1, end: 3 }` (05: a one-shot from level 1 reaches the class); zones `shield_line` 1, `rear_pad` 2, `outpost` 2, `outpost_1` 3 (`m813.json:174`, `:612`, `:918`, `:1238`); encounters "Picking at the dead" 1, "The ramp" 2, "Station security" 3. *The first fight is at your level; the ramp is a level up as the guns turn on you; station security is the level you should have grown to by the end.* `curse`, `godplot` and `summoning` declare their tier and zone levels when their acts are written. The Proving Ground (`proving.json`) keeps its waves' own levels.

---

## 7. Migration: nothing is taken from a live character (ruling B15)

05 quotes this section; it is the one copy.

- **Points above a new ceiling.** Today's ceiling is 8 from level 3, 9 from 6, 10 from 9 (`rules.json:194` `cap_by_level`); 05 moves it to 8 / 9 / 10 at 5 / 10 / 15. A 0.33 specialist is one over at levels 3 to 4, 6 to 9 and 10 to 14 (critic-consistency M-1). Nothing refuses it at load (`validateSheet`, `character.ts:340`, checks the creation sheet only), but `legendRoom` (`character.ts:1327-1330`) goes negative and eats a later Legendary Deed's room. **The move:** a `CAP_REV`; at migration the points standing above the new ceiling are recorded as `c.capGrace` (a count), and `legendRoom` counts them beside `legends`. Nothing is refunded or lowered; a later ceiling rise absorbs them; skill <= attribute and every perk step stay true.
- **Rank III before level 15.** `classRank` (`character.ts:1378-1386`) reads the level every call, so a level 12 to 14 character holding rank III would lose it when `rank_levels.III` moves to 15. **The move:** at the same revision, `c.rankHeld` records the rank held, and `classRank` returns at least it.
- **A saved run between nodes** loads unchanged: `stage` keeps its meaning (the map number) and a run holds no unit; the next fight is built at the map's levels. A 0.33 squad on today's pace (05: map 3 ends at level 8 today) meets map 3's foes at 5 to 7, over-levelled, which takes nothing from it.
- **A room saved in the middle of a fight** is ruling E's (01 section 13 states the two options for the lead).
- **Tested through the real load path** (ruling B15): `test/old-save.test.ts` gains a 0.33 fixture of a level-12 specialist with an attribute at 10 and rank III; it loads through the game's own load and keeps every point and its rank.

---

## Questions for the lead

1. **A four-squad's Boss fills its room alone (4.2).** At 01's HP and Defense 15 the Boss is 9.8 SE of bulk at the four-player share, inside the deadly room of 9.0, so its adds go. Keep it (a Boss fight of four is the Boss), or scale `share.boss.hp` and `share.elite.hp` by today's bulk over the new (about x0.8) so the adds come back at the same rounds? Recommended: **keep it** and let the run simulator read it; the share is the lever if the fight reads empty.

## Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency S1 (x0.45 against x0.6) | FIXED | the first draft's numbers discarded; every enemy number is 01's or derived from 01's formulas (1.2 to 1.4) |
| consistency S2 (two enemy tables) | FIXED | one table, 01's T4; my jump rule and rising Defense dropped |
| consistency S3 (tier rows) | FIXED | 01's rows quoted (1.2); bulk re-read for their Defense (4.1); the final boss restated on them (3.3) |
| consistency S11 (grade by map, three lists) | FIXED for 06 | ruling 25 quoted; the lists, the vault rule and the validator are 07's; my own grade column removed |
| consistency S12 (endless pace) | NOT FIXED as asked | ruling D24 sets one level a map; the critic's foe levels by 05's 1.5-a-map clock are overruled. Hours are 05's for maps 1 to 5; the endless clash is put to 05 (3.2) |
| consistency M1 (columns cancel growth) | FIXED | 01's smooth columns, level-free Defense (1.2) |
| consistency M4 (`attack_plus` at today's column) | FIXED | 0 at every level (01) |
| consistency minor 4 (enemy door amounts) | FIXED | dealt amounts on `damage_mult`; a plate on `armour_mult` as armour, with the reason (1.5) |
| consistency minor 6 (boon cap) | FIXED for 06 | the cap stays (A10); the card says a boon past it is worth 0 (3.4) |
| consistency minor 8 (final boss HP) | FIXED | 6,630 at four, on 01's columns (3.3) |
| consistency section 4 (06's two primitives) | FIXED | `worldLevel` is `foeLevel`'s rewritten body; the zone level is a parameter of `fightLevel`; both listed as extensions |
| consistency section 5 item 2 (Pressure offsets by tier name) | FIXED | `pressure_off` on each tier row (1.2) |
| consistency section 5 item 7 (`last_reckoning` named in prose) | FIXED | data only, read through `levels.final.template` (3.3) |
| consistency M-1, M-2 (ceilings, rank III on load) | FIXED | section 7 (ruling B15) |
| consistency M-8 (a room saved mid-fight) | NOT FIXED here | ruling E: the builder proposes, the lead approves (01 section 13) |
| player 1 (files on two scales; map hours) | FIXED for 06 | 01's numbers; 05's hours and squad levels (3.2) |
| player 13 (06 cancels the to-hit) | FIXED | level-free Defense (1.2) |
| player 15 (boon cap) | NOT FIXED | ruling A10 and 01 section 12 keep the cap; slots would be a new rule the rulings did not take |
| player 16 ("I levelled, the Soldier didn't get easier") | FIXED for 06's part | foe levels from the map, so a level gained is felt on the same map; the map card shows foe and squad levels (3.2); the level-up screen's text is the client's |

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| Enemy columns and tier rows | `levelled()` (`data.ts:117`), `enemies.json levels.table`, `items[]` | 01's (its Built from) |
| The Pressure tier offset | `pressureCap` (`physical/pressure.ts:15-17`) | reads `pressure_off` from the tier row (02 writes the cap's Reach part) |
| Gap rules, guard, shift | `enemies.json levels.gap`, `narrator_shift`; `levelGap` (`combat.ts:732`), `:738-742`, `BOSS_GUARD` (`:752`), `fightLevel` (`:1785`) | none |
| Foe level from the place (Survival) | `foeLevel` (`run/encounter.ts:74`), `tierLag` (`:65`) | `foeLevel`'s body reads `survival.json levels` by stage, row and tier; `eliteUp` and `stage.elite_up` deleted; `lag` read as the offset |
| Foe cost by level difference | `foeCost` (`encounter.ts:83`), `lag_factor` (`survival.json:79`), `tiers` (`:70-77`) | `lag_factor` 0.72; bulk 0.25 / 0.5 / 1 / 2.5 / 9.8; pressure unchanged |
| Budget by squad and kind | `budgetFor` (`encounter.ts:92`), `rounds`, `pressure_per_char`, `bulk_per_char_round` | reads `pressure_kind`, the final's rounds and `stage.from` |
| Map term | `stage.bulk`, `stage.pressure` | 0.1 and 0.1 from `stage.from` 16 |
| Templates by map | `templatesFor` (`encounter.ts:116-118`), slots' `from_depth` (`:140`) | `from_stage` beside `from_depth` in the same two filters |
| Tags by map and kit | slot `tags` (applied in `armed`, `encounter.ts:197`), `ai.tag_doors` (`enemies.json:729`), `armDoors` (`combat.ts:668`) | `armed` also adds `levels.maps[m].tags[tier]` and the endless kits' tags; new tag rows `plated*`, `skulk_ii/iii`, `faithful_ii/iii`, `bonded*` (data); `armDoors` takes the highest Devotion and Faith across blocks |
| Guard on any enemy, plates by Reach | `armGuard` (`combat.ts:700`), 02's Durability ladder (the door-ladder piece) | `armGuard` reads Durability from every door block and the plates from the ladder; the typed `guard` block goes |
| Enemy door amounts and plates by level | the dealer's column (01 section 3.1); `armour_mult` | none beyond 01's rule; a plate's soak reads `armour_mult` |
| Casters' Line length and top stage | `sigils.json enemy_ai.max_words`, `ENEMY_MAX_WORDS` (`sigil.ts:1444`), `soul_casters[].reach_bonus` | Brain Power and Will Power in the casters' `doors.skills`, read by 03's and 04's ladders; `max_words`, its code copy and `reach_bonus` go |
| Casters' MP | `soul_casters[].mp`, 01's `mp` column | the number read x `mp` at the caster's level |
| The final boss | `templates`, `champion`'s slot shape, setting `boss`, `heart_sovereign`, `sigil_warden`, `heartfire_elite` | a template `last_reckoning` (data); `composeEncounter` picks it and its rounds from `levels.final` on that stage's Boss node |
| Survival ends, endless begins | `endRun` and the `boon` / `tile` states (`run/state.ts:252-257`), `RunEnd.cleared` | the "Survival cleared" panel after `levels.final.stage` (text in data); retire or walk on uses today's retire |
| Campaign tier and levels | `validateCampaign` (`campaign.ts:122`), `encounterLevels` (`game.ts:1664`), `fightLevel` (`combat.ts:1785`), the drill spawn (`game.ts:4331`), 05's `pacing_target.tiers` | the fields of 6.2; `fightLevel` takes the zone's level before the party's; a validator warning on the last fallback |
| Migration | `legendRoom` (`character.ts:1327`), `classRank` (`:1378`), the load path's `migrateCharacter*` (`game.ts:18`) | `CAP_REV`; `capGrace` read by `legendRoom`; `rankHeld` read by `classRank` |

## Needs a new primitive

None from this file. Everything rides a piece that exists; the extensions below are each one more key or parameter of that piece, under the names of critic-consistency section 4's list where it has one:

| Extension | Smallest form | Why it is not a new piece |
| --- | --- | --- |
| `foeLevel` reads the place (06's former `worldLevel`) | its body reads `survival.json levels` (stage, row, tier); same signature's callers | a rewrite of an existing function (critic-consistency section 4) |
| The zone's level in `fightLevel` | `fightLevel(chars, { level, shift, place })`: a place level the shift is added to, before the party fallback | a parameter of an existing function |
| `from_stage` beside `from_depth` | one key in the two existing filters | on critic-consistency's extension list |
| `pressure_kind` in `budgetFor` | one multiplier read beside `rounds` | on the extension list |
| `stage.from` in `budgetFor` | the map term counted from a stage | one key in the existing term |
| `armGuard` reading door blocks and the Reach row | the ladder's plates in place of a typed count | on the extension list |
| `armDoors` faith by the highest | `max` in place of overwrite, as for `skills` | the same rule the reader already applies to skills |
| `pressure_off` on the tier row | `pressureCap` reads a field in place of tier names | critic-consistency section 5 item 2 |
| `capGrace`, `rankHeld` | two saved fields with a load default, read by `legendRoom` and `classRank` | critic-consistency M-1 and M-2's form; general for any later ceiling or rank move |

## What re-records

| What | Why it moves |
| --- | --- |
| `packages/engine/test/golden/enemies.json`, `rules-enemies.json` / `.log.json`, `costs-foes.json` | every enemy stat block, level row, tier bulk and `lag_factor` |
| `golden/replays.json`, `test/replay-hash.test.ts`, `test/helpers/replay.ts` | seeded fights: foe HP, armour, Defense, levels and the generator's picks |
| `enemy-levels.test.ts`, `rules115-review.test.ts`, `rules123-defence.test.ts`, `bugsweep-1112.test.ts` | the level table and the gap at today's numbers |
| `survival-encounter`, `survival-stage`, `survival-vault`, `survival-layout`, `survival-faces`, `survival-run-levels` suites | levels from the map; `eliteUp` gone; new `lag_factor`, tier bulk, `pressure_kind`, `stage.from`, `from_stage`, the final template |
| `enemy-doors-183.test.ts`, `enemy-bonds-186.test.ts`, `enemy-ai-179.test.ts`, the Sigil and Soul caster suites | new tag rows; Guard from door blocks and the ladder; Line length and top stage from Brain Power and Will Power; faith by the highest |
| the Pressure suites that read `elite_max` and `boss_max` | `pressure_off` on the tier row |
| `test/balance/survival-run*`, `party-fit`, `step1-fit`, `defence-measure`, `balance-sim` (`sim.ts`, `fit.ts`), `magic-measure`, `shadow-measure` | the run's whole curve and Elite and Boss HP; read again as readings (rules 1.94); the guard assertion stays |
| `test/old-save.test.ts` and a new 0.33 fixture | `CAP_REV`, `capGrace`, `rankHeld` (section 7) |
| `tools/validate.py` | the `levels` block, `pressure_off`, the campaign fields and the fallback warning (the ceiling rule is 07's) |
| `apps/web` suites and e2e that read a foe's HP or a map's level; `npm run try` scenarios naming enemy numbers | displayed numbers; the map card's levels |
| `docs/rules/PHC-Core-Rules-v1.0.md` rules 1.15 and 1.41 to 1.48, `docs/design/survival-spec.md`, `docs/design/campaign-format.md` | the spec first, then the data: the level table, the budget, Survival's shape, the campaign fields |
