# 05. Pacing: what a character gains, and when (0.34 rebalance, design phase; second draft, 21 Nov 2026)

**For the lead. Nothing here is built.** This draft applies the lead's rulings (`00-rulings.md`: B11, B12, B13, B15, B19's Devotion start, D22 to D27) and fixes the critics' findings that name this file (the table "Critics' findings" at the end). It sets the clock of the charter (`docs/design/proposals/2026-11-21-the-curve.md` sections 10 to 18). **05 owns every rate** (ruling D22): the XP table, drill, door Marks, study, modules, feelings, forms, Devotion, credits and the one grade-step price; 02, 03 and 04 quote it. Shared numbers (the columns, the grade ladder) are 01's and are quoted from it by name. Every proposed number is **PROVISIONAL** with one line of reason; nothing is fitted to a percentage, a line or a ceiling: the XP table is the maps' own XP summed, and the hours are a reading of a stated time model.

Every table below is printed by `tools/balance/pacing.py` (it reads `data/*.json` and writes nothing):

    export PYTHONUTF8=1
    python tools/balance/pacing.py                         # every table
    python tools/balance/pacing.py levels xp calendar      # some of: time levels xp points practice eighty credits coop calendar

Facts about today were read in data and code at the release branch's HEAD `d61ec6f13`.

## 0. What this file decides, in short

1. **A level comes from the map, not the clock** (D24): level 2m as map m's gate falls and 2m + 1 as its Boss falls (maps 1 to 5, the final boss at 11), then one level at each endless Boss, **level 20 as map 14's Boss falls**. The XP table is those anchors' XP summed (section 2). By the time model that is level 5 at hour 5.2, 10 at 11.9, 15 at 25.9 and **20 at hour 42.4**, then the peak.
2. **A fight's XP is the standard fight's XP at the fight's level, times its kind, times its worth to you** (the gap table, section 2). Weak foes pay nothing; the map's foes keep you within two levels if you walk it.
3. **Points** (B11, B12): 38 Skill and 20 Attribute points in a career; levels 4 and 14 give 2 Skill points, levels 5 and 15 give 1 Skill and 1 Attribute point, so each gate and the point that uses it land together. Four spend plans under the family rule (B13) show the specialist alone reaches its door's top.
4. **Every practice track** has a rate per worthy fight and its hours; door Marks are one formula, written as numbers per door (section 4).
5. **Grades by map** (D25) and **one grade-step price** (D26); the vault gives the map's own best grade; a Relic or Celestial property can be re-forged at the peak (section 5).
6. **Co-op** (D27): the `party_pace` row multiplies the practice gains; XP stays paced by the map (section 6 and the one question).
7. **The calendar** (section 7): no hour from 0 to 49 is empty for any of four characters (a specialist, a two-door character, a wide character, a wall with no faith).
8. **Migration** (B15, section 8): nothing is taken from a live character; XP, study and practice are rebased by share, ceilings and ranks grandfathered.

## 1. How long things take

### 1.1 Facts about today (checked)

- **Rounds a fight:** fight 5 (4 at depth 2 or less), Elite and gate 6.5, vault guard 6.5, Boss 9 (`data/survival.json:64` `rounds`). The standard fight runs about 10% over its target (`docs/design/handoffs/0.33-MEASURES.md:127`; `0.34-WEAPON-MEASURES.md:425-441`).
- **A map:** 15 rows, gate Elite at row 8, Boss at row 15; a route holds fights 5 to 8, Elites 1 to 3, shops 2 to 3, Forges 1 to 2, rests 1 to 2, training 0 to 2, a shrine 0 to 1, caches and events 0 to 2 (`survival.json` `map.expect.path`).
- **XP a node today:** `(base 35 + per_depth 0 x (d - 1))` x the kind (Elite and vault guard 1.5, Boss 5, cache 0.25, chest 0) x the stage's `xp` [1, 2.6, 4, 4, 4.5] (`survival.json:126`, `:60`; `packages/engine/src/run/rewards.ts:63-66` `nodeXp`). **It reads no foe's level and no character's.** A stage-1 map pays about 520 XP a character, level 3 by today's `xp_total` (`data/rules.json:252-273`, 100 at 2 to 15,250 at 20).
- **Foe levels today copy the party** (`run/encounter.ts:70-75` `foeLevel`, `eliteUp`; `data.ts:124` `fightLevelOf`); 06 replaces that with the map's levels (D24).
- **Campaign XP today** is absolute (`rules.json:282` `xp_sources`: combat 25 / 50 / 100 / 200; dialogue 25 to 100; discovery 25 to 75; quest 50 to 300) **and typed a second time in code** (`packages/engine/src/data.ts:129-132` `XP_SOURCES`, `COMBAT_XP`; `combat.ts:3490` `combatXp`'s `|| 50`): data typed into code, a defect under the no-rebuild rules 2 and 3. `rules.json:274-280` `pacing_target` paces level 20 at about session 51.

### 1.2 The time model (ASSUMED; `pacing.py` ASSUMED block)

| Piece | Minutes | Why |
| --- | --- | --- |
| A player's 6-AP turn | 1.25 at level 1, +0.05 a level (2.2 at 20) | read the board, choose among techniques, words and feelings, watch it resolve; more to choose each level |
| One foe's turn | 0.15 | animated, not chosen |
| Rounds in a fight | the target x1.1, the same at every level | the measured 10%; 01 T12: the turns to drop a same-level foe at level 20 are at or under level 1's once Margins count, so a fight does not lengthen with the level |
| After a fight | 2 | the field's 3 rounds and the reward panel |
| Other nodes | shop 4, Forge 3, rest, training, shrine, event 2, the vault's chest 1.5, cache 1; 0.5 to choose each node; the camp 5; a boon 1.5 | |

A fight is 11 minutes at level 1, 14 at 10, 17 at 20; an Elite 14 / 17 / 21; a Boss 19 / 23 / 28. **A map plays in 2.6 hours at level 2, 2.9 at level 10, 3.4 at 19.** The hours are a reading of these minutes: if play is faster, every hour in this file moves earlier by the same share, and **every level still lands at the same Boss**, because the XP is tied to the map.

### 1.3 The maps, their foes and their hours (D24; the rows are 06's)

The foe levels are this file's reading of ruling D24 (06 owns the rows; `pacing.py` `boss_level` and `foe_level` are one function each, to change if 06's rows differ): **map m's Boss and every Elite, the gate and the vault's guard at 2m + 1 on maps 1 to 5, then one level a map, at most 20; the early foes (rows 1 to 7) two levels under the Boss, the late foes (rows 9 to 14) one under.** A character who walks the map arrives at the early foes' level (maps 1 to 5) or one over it (endless), and leaves at the Boss's level.

| map | name | early foes (rows 1-7) | late foes (rows 9-14) | Elites, gate, vault guard, Boss | character arrives / leaves at | starts (h) | ends (h) | hours | finds and the vault (D25) | shelf (D25) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | map 1 | 1 | 2 | 3 | 1 / 3 | 0.0 | 2.6 | 2.6 | fine | fine |
| 2 | map 2 | 3 | 4 | 5 | 3 / 5 | 2.6 | 5.2 | 2.62 | fine | fine |
| 3 | map 3 | 5 | 6 | 7 | 5 / 7 | 5.2 | 7.9 | 2.72 | masterwork | masterwork |
| 4 | map 4 | 7 | 8 | 9 | 7 / 9 | 7.9 | 10.8 | 2.82 | masterwork | masterwork |
| 5 | map 5 | 9 | 10 | 11 | 9 / 11 | 10.8 | 13.7 | 2.92 | relic | masterwork |
| 6 | endless 1 | 10 | 11 | 12 | 11 / 12 | 13.7 | 16.7 | 2.99 | relic | relic |
| 7 | endless 2 | 11 | 12 | 13 | 12 / 13 | 16.7 | 19.7 | 3.04 | relic | relic |
| 8 | endless 3 | 12 | 13 | 14 | 13 / 14 | 19.7 | 22.8 | 3.09 | relic | relic |
| 9 | endless 4 | 13 | 14 | 15 | 14 / 15 | 22.8 | 25.9 | 3.14 | relic | relic |
| 10 | endless 5 | 14 | 15 | 16 | 15 / 16 | 25.9 | 29.1 | 3.19 | celestial | relic |
| 11 | endless 6 | 15 | 16 | 17 | 16 / 17 | 29.1 | 32.4 | 3.24 | celestial | relic |
| 12 | endless 7 | 16 | 17 | 18 | 17 / 18 | 32.4 | 35.7 | 3.29 | celestial | relic |
| 13 | endless 8 | 17 | 18 | 19 | 18 / 19 | 35.7 | 39.0 | 3.35 | celestial | relic |
| 14 | endless 9 | 18 | 19 | 20 | 19 / 20 | 39.0 | 42.4 | 3.4 | celestial | relic |
| 15 | endless 10 | 19 | 20 | 20 | 20 / 20 | 42.4 | 45.9 | 3.45 | celestial | relic |
| 16 | endless 11 | 20 | 20 | 20 | 20 / 20 | 45.9 | 49.3 | 3.45 | celestial | relic |
| 17 | endless 12 | 20 | 20 | 20 | 20 / 20 | 49.3 | 52.8 | 3.45 | celestial | relic |
| 18 | endless 13 | 20 | 20 | 20 | 20 / 20 | 52.8 | 56.2 | 3.45 | celestial | relic |

What the hours say against the charter's calendar (section 14, a draft): level 3 at hour 2.6 (charter 2), 5 at 5.2 (4), 10 at 11.9 (16), 15 at 25.9 (28), 20 at 42.4 (40). The first half runs faster than the charter's draft because D24 puts two levels on each of the first five maps and a map plays in under three hours; the cap lands within the charter's "about hour 40". Then about eight hours at the peak to hour 50 (maps 15 to 17), on maps whose foes are all level 20 from map 16.

## 2. The XP table and the XP a fight gives

### 2.1 A fight's XP (PROPOSED)

**XP = fight_xp(the fight's level) x the node's kind x its worth to you.**

- **`fight_xp`** (`rules.json character.levels.fight_xp`, a new key, one row a level): **50 at level 1, x1.15 a level** (to two figures: 57, 66, 76, 87, 100, 120, 130, 150, 180, 200, 230, 270, 310, 350, 410, 470, 540, 620, 710). PROVISIONAL. *So the number on the reward panel grows as you go deeper, and a deeper map pays more by itself.* `survival.json` `xp.base` 35, `xp.per_depth` and `stage.xp` [1, 2.6, 4, 4, 4.5] are **retired**: the fight's level does their work.
- **The kind** stays today's (`survival.json:126`: Elite, gate and vault guard x1.5, Boss x5, cache x0.25, chest 0).
- **The fight's level** is the node's level from 06's reader (`worldLevel`, the map and the row; a campaign's from the encounter or zone, D28). For a fight of mixed levels, the highest Elite's or Boss's level if one stands, else the foes' level.
- **The worth** (`enemies.json levels.gap.worth`, a new key; gap = the fight's level minus yours):

| gap | -5 or less | -4 | -3 | -2 to 0 | +1 | +2 | +3 | +4 | +5 or more |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| worth | 0 | 0.33 | 0.67 | 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 |

PROVISIONAL. *Within two levels a fight pays in full; five levels down pays nothing (those foes already die to one hit, `enemies.json:200` `one_hit_levels_below` 5); a fight above you pays more, so a character who rushed catches up by fighting.* Five matches the to-hit gap's `max_levels` 5 (`enemies.json:202`).

**The worth applies to every gain earned in a fight** (XP, drill, study, practice, every Mark, Devotion tag XP), through the one reader S7 `growthWorth` (the table "Needs a new primitive"). Out of a fight (a rest, a training ground, a shrine, a Narrator's award) the worth is 1.

### 2.2 The XP table (`rules.json character.levels.xp_total`, PROPOSED)

Each level's XP is the reference route's XP between its two anchors (section 0 item 1) at the worth the character has on the way, rounded to two figures, then summed. PROVISIONAL. *Reason: a level arrives at a place the player can see coming (a gate, a Boss), whatever the minutes.*

| level | lands as this falls | hour (solo) | XP for it | xp_total PROPOSED | xp_total today | fight_xp at this level | standard fights of the level before, for it |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | map 1, its gate | 1.0 | 270 | 270 | 100 | 57 | 5.4 |
| 3 | map 1, its Boss | 2.6 | 700 | 970 | 250 | 66 | 12.2 |
| 4 | map 2, its gate | 3.6 | 360 | 1,330 | 700 | 76 | 5.4 |
| 5 | map 2, its Boss | 5.2 | 930 | 2,260 | 1,300 | 87 | 12.2 |
| 6 | map 3, its gate | 6.3 | 480 | 2,740 | 2,050 | 100 | 5.5 |
| 7 | map 3, its Boss | 7.9 | 1,200 | 3,940 | 2,800 | 120 | 11.9 |
| 8 | map 4, its gate | 9.0 | 630 | 4,570 | 3,550 | 130 | 5.4 |
| 9 | map 4, its Boss | 10.8 | 1,600 | 6,170 | 4,300 | 150 | 12.0 |
| 10 | map 5, its gate | 11.9 | 830 | 7,000 | 5,050 | 180 | 5.4 |
| 11 | map 5, its Boss | 13.7 | 2,200 | 9,200 | 5,950 | 200 | 12.5 |
| 12 | map 6 (endless 1), its Boss | 16.7 | 3,400 | 12,600 | 6,850 | 230 | 16.8 |
| 13 | map 7 (endless 2), its Boss | 19.7 | 3,900 | 16,500 | 7,750 | 270 | 16.8 |
| 14 | map 8 (endless 3), its Boss | 22.8 | 4,500 | 21,000 | 8,650 | 310 | 16.8 |
| 15 | map 9 (endless 4), its Boss | 25.9 | 5,200 | 26,200 | 9,550 | 350 | 16.9 |
| 16 | map 10 (endless 5), its Boss | 29.1 | 5,900 | 32,100 | 10,450 | 410 | 16.7 |
| 17 | map 11 (endless 6), its Boss | 32.4 | 6,800 | 38,900 | 11,650 | 470 | 16.7 |
| 18 | map 12 (endless 7), its Boss | 35.7 | 7,900 | 46,800 | 12,850 | 540 | 16.9 |
| 19 | map 13 (endless 8), its Boss | 39.0 | 9,000 | 55,800 | 14,050 | 620 | 16.7 |
| 20 | map 14 (endless 9), its Boss | 42.4 | 10,000 | 65,800 | 15,250 | 710 | 16.2 |

On the first five maps a level is about 5 standard fights (to the gate) or 12 (the second half with its Boss); in endless a level is a whole map, about 17. *More at the beginning (Leon, round 2 item 2), and each endless map is one level.* Past 20, XP counts to the run's renown only (`run/stage.ts:162` `renownOf`, unchanged).

### 2.3 Campaigns: the author's rule

The same table and the same `fight_xp`, so a level costs a campaign what it costs Survival. `rules.json:282` `xp_sources` becomes **multiples of `fight_xp` at the fight's or the scene's level** (the level the campaign states, D28), PROVISIONAL: combat easy 0.5 / standard 1 / hard 2 / boss 4 (today's 25 / 50 / 100 / 200 over 50); dialogue 0.5 to 2; discovery 0.5 to 1.5; quest 1 to 6; the Essence of Experience stays its own item. The engine reads them through one reader; `data.ts:129-132` and `combat.ts:3490`'s `|| 50` are deleted in the same change. A campaign plays less of its time in fights, so its author gives about as much again in story beats.

| Tier (06's `tier` field) | Levels | Survival's hours for the same levels | The rule for the author |
| --- | --- | --- | --- |
| one_shot | 1 to 3, or one gate crossed (5, 10 or 15 to the next level or two) | 2 to 5 | from level 1 it reaches the class at 3 |
| season | one tier: 1 to 5, 5 to 10, 10 to 15 or 15 to 20 | 5, 7, 14, 16 | ends on the tier's gate |
| campaign | 1 to 15 | 26 | or 5 to 20 |
| epic | 1 to 20 and the peak | 42 and on | the whole table, then the peak |

`rules.json:274-280` `pacing_target` is replaced by these four rows (`pacing_target.tiers`, one copy).

## 3. The gates, the points and four spend plans

### 3.1 Data keys that change

| Key | Today | PROPOSED | Reason a player sees |
| --- | --- | --- | --- |
| `rules.json:194-199` `creation.attributes.cap_by_level` | {1: 7, 3: 8, 6: 9, 9: 10} | **{1: 7, 5: 8, 10: 9, 15: 10}** (B12) | the ceiling moves at the tier gates, so crossing one is felt |
| `rules.json:193` `cap_at_creation` | 7 | 7 | unchanged |
| `rules.json:218` `caps` (text) | "8 from level 3, 9 from level 6, 10 from level 9" | reads its numbers from `cap_by_level` (a `{=placeholder}` text) | a text with digits lies after the next change |
| `rules.json:223-245` `levels.gains` | odd levels 2 Skill, even levels 1 Skill and 1 Attribute | the same, with a **`by_level` row: 4 and 14 give 2 Skill and 0 Attribute, 5 and 15 give 1 Skill and 1 Attribute** (B12) | the Attribute point arrives on the level its ceiling opens; the totals are unchanged |
| `classes.json:17-21` `rank_levels` | {I: 3, II: 6, III: 12} | **{I: 3, II: 5, III: 15}** (B12) | rank II with the first gate; rank III with the last ceiling |
| `classes.json:12-16` `rank_thresholds` | II 5, III 8 | unchanged | the class's own attribute at 5 and at 8 |
| `classes.json:22` `rank_rule` (text) | "level 6 ... level 12" | reads `rank_levels` and `rank_thresholds` | |
| `classes.json:32`, `:37` `hybrid_gate.level_min`, `squared_gate.level_min` | 7, 7 | **10, 10** | the advanced classes open at the level-10 gate (shelved in 0.34; set now so no later pass touches it) |

Defects removed in the same change (a rule typed into code): `packages/engine/src/character.ts:1321` falls back to {1: 7, 3: 8, 6: 9, 9: 10} when the data key is missing; `:1361-1363` fall back to 5 / 8 and 1 / 1. The data is always there; the fallbacks are second copies.

### 3.2 Points by level (B11, B12)

| level | attribute ceiling | this level gives (Skill / Attribute) | Skill points (career) | Attribute points (career, above the 1s) | class rank |
| --- | --- | --- | --- | --- | --- |
| 1 | 7 | creation 10 / 10 | 10 | 10 |  |
| 2 | 7 | 1 / 1 | 11 | 11 |  |
| 3 | 7 | 2 / 0 | 13 | 11 | I |
| 4 | 7 | 2 / 0 | 15 | 11 |  |
| 5 | 8 | 1 / 1 | 16 | 12 | II |
| 6 | 8 | 1 / 1 | 17 | 13 |  |
| 7 | 8 | 2 / 0 | 19 | 13 |  |
| 8 | 8 | 1 / 1 | 20 | 14 |  |
| 9 | 8 | 2 / 0 | 22 | 14 |  |
| 10 | 9 | 1 / 1 | 23 | 15 |  |
| 11 | 9 | 2 / 0 | 25 | 15 |  |
| 12 | 9 | 1 / 1 | 26 | 16 |  |
| 13 | 9 | 2 / 0 | 28 | 16 |  |
| 14 | 9 | 2 / 0 | 30 | 16 |  |
| 15 | 10 | 1 / 1 | 31 | 17 | III |
| 16 | 10 | 1 / 1 | 32 | 18 |  |
| 17 | 10 | 2 / 0 | 34 | 18 |  |
| 18 | 10 | 1 / 1 | 35 | 19 |  |
| 19 | 10 | 2 / 0 | 37 | 19 |  |
| 20 | 10 | 1 / 1 | 38 | 20 |  |

No Attribute point is ever held for want of a ceiling on a specialist's door (critic-player 4 and 18): level 5's and 15's points are the ones that open 8 and 10, and level 10's opens 9.

### 3.3 Four spend plans (greedy, legal at every level: skill <= attribute <= ceiling; the family rule B13)

The family rule (B13, PROVISIONAL, flagged for Leon): a door's Reach step at 7 needs its beta at 4; its step at 10 needs the beta at 7 and the gamma at 4. The plans spend every point (38 and 20); each table shows the levels where a door step or a Push (skill 8) lands.

**specialist (a Breaker: one door to its top)**

| level | attributes above 1 | skills | unspent S / A | door steps reached |
| --- | --- | --- | --- | --- |
| 1 | Str 7 End 5 | raw power 7, guts 3 | 0 / 0 | Strength Reach step 4 |
| 2 | Str 7 End 6 | raw power 7, guts 4 | 0 / 0 | Strength Reach step 7 |
| 3 | Str 7 End 6 | raw power 7, guts 6 | 0 / 0 |  |
| 4 | Str 7 End 6 | raw power 7, guts 7, intimidation 1 | 0 / 0 |  |
| 5 | Str 8 End 6 | raw power 8, guts 7, intimidation 1 | 0 / 0 | Strength Push (8) |
| 10 | Str 9 End 8 | raw power 9, guts 8, intimidation 6 | 0 / 0 |  |
| 14 | Str 9 End 9 | raw power 9, guts 9, intimidation 9, pain threshold 3 | 0 / 0 |  |
| 15 | Str 10 End 9 | raw power 10, guts 9, intimidation 9, pain threshold 3 | 0 / 0 | Strength Reach step 10 |
| 16 | Str 10 End 10 | raw power 10, guts 10, intimidation 9, pain threshold 3 | 0 / 0 |  |
| 20 | Str 10 End 10 Agi 3 | raw power 10, guts 10, intimidation 10, pain threshold 4, durability 4 | 0 / 0 |  |

**two doors (a Breaker with Sigils: one door to its top, the second a step under)**

| level | attributes above 1 | skills | unspent S / A | door steps reached |
| --- | --- | --- | --- | --- |
| 1 | Str 7 Int 4 End 2 | raw power 7, brain power 3 | 0 / 0 | Strength Reach step 4; Intelligence Reach step 1 |
| 3 | Str 7 Int 4 End 3 | raw power 7, brain power 3, guts 3 | 0 / 0 |  |
| 4 | Str 7 Int 4 End 3 | raw power 7, brain power 4, guts 4 | 0 / 0 | Strength Reach step 7; Intelligence Reach step 4 |
| 5 | Str 8 Int 4 End 3 | raw power 8, brain power 4, guts 4 | 0 / 0 | Strength Push (8) |
| 10 | Str 9 Int 6 End 3 | raw power 9, brain power 6, guts 4, rumination 4 | 0 / 0 |  |
| 12 | Str 9 Int 7 End 3 | raw power 9, brain power 7, guts 6, rumination 4 | 0 / 0 | Intelligence Reach step 7 |
| 14 | Str 9 Int 7 End 3 | raw power 9, brain power 7, guts 7, rumination 4, intimidation 3 | 0 / 0 |  |
| 15 | Str 10 Int 7 End 3 | raw power 10, brain power 7, guts 7, rumination 4, intimidation 3 | 0 / 0 |  |
| 16 | Str 10 Int 8 End 3 | raw power 10, brain power 7, guts 7, rumination 4, intimidation 4 | 0 / 0 | Strength Reach step 10 |
| 17 | Str 10 Int 8 End 3 | raw power 10, brain power 8, guts 7, rumination 4, intimidation 4, pain threshold 1 | 0 / 0 | Intelligence Push (8) |
| 20 | Str 10 Int 9 End 4 | raw power 10, brain power 9, guts 7, rumination 4, intimidation 4, pain threshold 3 | 1 / 0 |  |

**wide (four doors at 4 to 5: Pressure, Sigils, Outbursts, Prayer)**

| level | attributes above 1 | skills | unspent S / A | door steps reached |
| --- | --- | --- | --- | --- |
| 1 | Agi 5 Int 4 Det 3 Vir 2 | dexterity 4, brain power 3, will power 2, faith 1 | 0 / 0 | Agility Reach step 4; Intelligence Reach step 1; Determination Reach step 1; Virtue Reach step 1 |
| 3 | Agi 5 Int 4 Det 3 Vir 2 End 2 | dexterity 5, brain power 4, will power 3, faith 1 | 0 / 0 | Intelligence Reach step 4 |
| 4 | Agi 5 Int 4 Det 3 Vir 2 End 2 | dexterity 5, brain power 4, will power 3, faith 2, athletics 1 | 0 / 0 |  |
| 5 | Agi 5 Int 5 Det 3 Vir 2 End 2 | dexterity 5, brain power 5, will power 3, faith 2, athletics 1 | 0 / 0 |  |
| 6 | Agi 5 Int 5 Det 4 Vir 2 End 2 | dexterity 5, brain power 5, will power 4, faith 2, athletics 1 | 0 / 0 | Determination Reach step 4 |
| 10 | Agi 5 Int 5 Det 5 Vir 3 End 2 | dexterity 5, brain power 5, will power 5, faith 3, athletics 4, rumination 1 | 0 / 0 |  |
| 12 | Agi 5 Int 5 Det 5 Vir 4 End 2 | dexterity 5, brain power 5, will power 5, faith 4, athletics 4, rumination 3 | 0 / 0 | Virtue Reach step 4 |
| 14 | Agi 5 Int 5 Det 5 Vir 4 End 2 | dexterity 5, brain power 5, will power 5, faith 4, athletics 4, rumination 4, composure 3 | 0 / 0 |  |
| 15 | Agi 5 Int 5 Det 5 Vir 5 End 2 | dexterity 5, brain power 5, will power 5, faith 5, athletics 4, rumination 4, composure 3 | 0 / 0 |  |
| 16 | Agi 5 Int 5 Det 5 Vir 5 End 3 | dexterity 5, brain power 5, will power 5, faith 5, athletics 4, rumination 4, composure 4 | 0 / 0 |  |
| 20 | Agi 5 Int 5 Det 5 Vir 5 End 4 | dexterity 5, brain power 5, will power 5, faith 5, athletics 4, rumination 4, composure 4, conscience 4, reaction speed 1, authority 1 | 0 / 1 |  |

**wall (a Bulwark: Guard to its top, no faith)**

| level | attributes above 1 | skills | unspent S / A | door steps reached |
| --- | --- | --- | --- | --- |
| 1 | End 7 Agi 5 | durability 7, pain threshold 3 | 0 / 0 | Endurance Reach step 4 |
| 2 | End 7 Agi 5 Str 2 | durability 7, pain threshold 4 | 0 / 0 | Endurance Reach step 7 |
| 3 | End 7 Agi 5 Str 2 | durability 7, pain threshold 6 | 0 / 0 |  |
| 4 | End 7 Agi 5 Str 2 | durability 7, pain threshold 7, sensory 1 | 0 / 0 |  |
| 5 | End 8 Agi 5 Str 2 | durability 8, pain threshold 7, sensory 1 | 0 / 0 | Endurance Push (8) |
| 10 | End 9 Agi 5 Str 4 | durability 9, pain threshold 8, sensory 6 | 0 / 0 |  |
| 14 | End 9 Agi 5 Str 4 Per 2 | durability 9, pain threshold 9, sensory 9, athletics 3 | 0 / 0 |  |
| 15 | End 10 Agi 5 Str 4 Per 2 | durability 10, pain threshold 9, sensory 9, athletics 3 | 0 / 0 | Endurance Reach step 10 |
| 16 | End 10 Agi 5 Str 4 Per 3 | durability 10, pain threshold 10, sensory 9, athletics 3 | 0 / 0 |  |
| 20 | End 10 Agi 5 Str 4 Per 5 | durability 10, pain threshold 10, sensory 10, athletics 3, raw power 3, ingenuity 2 | 0 / 0 |  |

What the plans show:

1. **The specialist alone reaches its door's top.** The Breaker holds the Push at level 5 and the Reach step 10 at level 15, the gate and its point together (B12). Its last eight Skill points and its spare Attribute points buy HP and soak.
2. **The two-door character** reaches its first door's top a level late (16) and its second door's step 7 at 12 and Push at 17; the second door's step 10 (Brain Power 10, Rumination 7, Eloquence 4: 21 points more) is not affordable with 38. *That is B13's edge: two doors at the top cost 42 points.* Critic-player 2 is answered.
3. **The wide character** (four doors at 4 to 5, B14) reaches Reach step 4 on all four doors and never a Push or rank III: its Attribute points (20 over five attributes) are its limit, not its Skill points. Its things are many small cash-outs and four sets of bars (section 7); Leon's unique advanced classes are where it gets something of its own (B14, not solved here).
4. **The wall** (a Bulwark with no Faith) reaches Guard's top at 15 like the Breaker; its spare points go to Agility, Strength and Perception.

## 4. Every practice track: per worthy fight and per hour

Every amount earned in a fight is x its worth (S7); every fight on the reference route is worthy (its gap is -1 to +2). Worthy fights an hour fall from 3.7 on map 1 to 2.8 on map 14 as fights grow longer, so every track below slows a little late.

### 4.1 The tracks (PROPOSED, PROVISIONAL)

| Track | Earned by (data key) | Today | PROPOSED | When (solo, the model's hours) |
| --- | --- | --- | --- | --- |
| **Weapon drill** (D22) | a kill, to every weapon that hit the victim; none on the field (`techniques.json:99-118` `rules.drill`; `physical/rules.ts:84-91`; `physical/data.ts:138` `drillMult`, `:140` `addDrill`) | `per_kill` vermin 1 / minion 5 / Soldier 10 / Elite 25 / Boss 50; `martial_mult` 3 (`:107`); `marks` 300 / 900 / 1,800 (`:113`) | **`per_kill` 20 / 35 / 70 / 180 / 360, `martial_mult` 1.5** (D22); **`marks` 300 / 900 / 1,800 kept** (no saved mark moves); rests and training grounds unchanged (`survival.json:423` `train.drill` 200, `:430` `training.drill` 400) | one weapon in every fight: Mark I 0.4 h, II 1.1 h, **III 2.2 h**; a martial class (Bulwark, Breaker, Skirmisher) 0.2 / 0.8 / **1.6 h**. *The weapon you take at the camp gives its signature in the first fights and its second pick before the gate.* What each mark gives is 02's (critic-consistency S10) |
| **A shield's drill by soaks** (new) | a worthy blow its plates soak (`physical/core.ts:121` `guardSoak`, the soak site) | none: a shield is drilled only by kills | **`rules.drill.per_soak` 20**, shields only | a wall soaking about five worthy blows a fight: Mark III on a shield in about 3.5 hours. *A shield learns by taking blows, as the wall's own door does (B18).* Critic-player 11 |
| **Sigil study** | an Evoke: 1, +1 a glyph past the second, +1 if it hit (`sigils.json:209-231` `study`; `sigilgrowth.ts:40` `addStudy`, `:48` `noteEvoke`) | `first` 6, `step` 8, `copy` 2, `mastery_study` 5; `train.study` 5, `training.study` 10; words held "4 + brain_power" (`sigils.json:193`, typed again at `character.ts:890` `wordsKnownCap`) | **`first` 10, `step` 60, `copy` 10, `mastery_study` 30; a found spell 10; `train.study` 30, `training.study` 60**; words held **4 + 3 x Brain Power** (B19, 03's), a number block read by the sheet, `character.ts:890`'s typed 4 removed | a Sigil specialist (3 Evokes a fight, 9 study): **a word every 1.6 hours** from study alone; a two-door character every 2.1, a wide one every 2.9. *A word is an event you look forward to; Brain Power is how many you can hold, not how fast you learn* |
| Word Marks | each Evoke adds a use to each known word in it (`sigils.json:233` `word_mastery`) | Practised 10, Mastered 30 | 03's Word Marks: 10 / 30 / 80 uses (I and II today's) | a word in half the Evokes: Mark I in about 2 hours, II in about 6 |
| **Found spells** | the first time a Line (or an Outburst design) you never cast lands on a worthy foe (Law 3; S9 firsts) | none | **10 study (or 10 practice)**, and the book's entry | from about hour 5 (five or six words); about one an hour to hour 20, then one every two hours (a reading) |
| **Outburst modules** | a Release: 1, +1 a stage past 1, +1 a feeling poured (`soul_modules.json:1327-1349` `practice`; `magic.ts:1728` `addPractice`) | picks at 5, 15, then every 15; `mastery_bonus` 5; `train.practice` 8, `training.practice` 15 | **`thresholds` [10], `then_every` 80, `mastery_bonus` 40; a found design 10; `train.practice` 40, `training.practice` 80** | an Outburst specialist (2 Releases a fight, 8 practice): **a module every 2.1 hours** from practice alone. Learned is not slotted: module slots are Will Power's Reach (04) |
| **Feelings** | happening to you (`feelings.json`, 25 rows, `start_count` 2; the felt list `m.feelings`, read at `magic.ts:1154`) | unlocked the first time | **a feeling unlocks at Mark I of its own bar**: each time its trigger happens in a worthy fight adds 1; each row's `marks` by how common its trigger is, **[2, 6, 12] common, [1, 3, 6] rare** (Law 3's three steps; 04 says what II and III give) | about one new feeling every 2.5 hours (a reading until the simulator counts each trigger) |
| **Figment form Marks** | being held through a worthy fight to its end (S4 keyed Marks; forms known stay by Visualization, `figments.json:41-47` `forms_known`) | none | **`form_marks` [6, 20, 50] fights** (03's, critic-consistency minor 3) | a form held in every fight: Mark I 1.7 h, II 5.5 h, III 14.4 h; a specialist holding about 3 forms a fight over 7 or 8 forms holds 24 of the 30 form Marks by hour 42 |
| **A door's Marks** | units of the door's counter used on worthy foes (each door file names its unit; Guard's include plates soaked, B18) | none | **one formula: each threshold = the door's units a worthy fight x the worthy fights a specialist has walked by hours 2, 11, 17 and 23** (7.4, 38.9, 58.1, 76.7 fights); the numbers per door in 4.2, written on each door row | a specialist: I at hour 2, II at 11 (the Push already open at 8), the middle at 17, III at 23. A two-door character at 60 / 40 of its units: the first door's III at about 40, the second's middle at about 46; a wide character at 30% a door: four Mark IIs at about hour 41 |
| **Devotion** | liked tags, vows, rites; a rest's 4 and the shrine's rite 10 in a run (`patrons.json:17` `xp.curve`, `:48` `tag_caps`; `survival.json:423`, `:435`; `faith.ts:95` `TAG_CAPS`, `:506` `tallyOf`) | **start 3** (`patrons.json:8`); curve [0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450]; tag caps 2 a fight, 2 a scene, **6 a session**: a Survival run is one session (`game.ts:780`, `:790` `beginSession`), so tags give at most 6 in a whole run | **start 0** (B19; live characters keep theirs); **curve [0, 10, 25, 42, 68, 100, 140, 185, 225, 260, 300]**; **`tag_caps.fight` 3; a new `tag_caps.stage` 30**, read in a run in place of the session's 6 (campaigns keep 6) | about 2.2 tag XP a fight with the rests and the shrine: **standing 3 at hour 3.9, 5 at 9.6, 7 at 18.6, 10 at 31.6** (today's curve at this rate: 10 at hour 50). *Standing is the faithful's grade (01 T9: 3 / 5 / 7 / 10 as Fine / Masterwork / Relic / Celestial); it arrives a few hours after the same grade of gear, as the charter's calendar has it* |

The practice tracks' texts (`sigils.json` study `text`, `soul_modules.json` practice `text`) type their numbers today ("At 6 study, and every 8"); they read their fields (`{=placeholder}`) in the same change.

### 4.2 Door Mark thresholds (the formula, read; each door file writes these on its row)

| door (its unit) | units a worthy fight (the door file's) | Mark I | Mark II | middle | Mark III |
| --- | --- | --- | --- | --- | --- |
| Guard (plates soaked and spent, B18) | 9 | 66 | 350 | 523 | 690 |
| Momentum (chain steps spent) | 9 | 66 | 350 | 523 | 690 |
| Pressure (pips spent) | 9 | 66 | 350 | 523 | 690 |
| Shadow (Shadow spent in a Break) | 9 | 66 | 350 | 523 | 690 |
| Sigils (glyphs past the first) | 10.5 | 78 | 408 | 610 | 805 |
| Figments (blows; 2 a Figment cashed) | 9 | 66 | 350 | 523 | 690 |
| Bonds (Bonds snapped) | 4.5 | 33 | 175 | 262 | 345 |
| Outbursts (stages Released) | 7 | 52 | 272 | 407 | 537 |
| Prayer (Grace spent) | 6 | 44 | 233 | 349 | 460 |

These replace 02's and 03's 60 / 380 / 600 / 820 and 04's per-door sets (critic-consistency minor 2): one rule, nine readings. A door file that measures its unit a fight differently re-runs the formula; the hours stay 2, 11, 17 and 23.

### 4.3 The 80% (ruling D23)

D23: the 80% counts each system the character's doors open; techniques count against all 66 (34 melee, 32 ranged, `techniques.json`). Read for each door's specialist:

| system | how | at level 20 (hour 42) | at hour 50 | of |
| --- | --- | --- | --- | --- |
| techniques | a martial specialist keeping its main weapon until a better grade, its second hand drilling the collection: 16 and 19 weapons to Mark III; 4 at the start, 3 a weapon, one signature in twelve repeats | 48 (72%) | 56 (84%) | 66 |
| techniques (a collector) | both hands move to a new weapon at Mark III | 66 (100%) | 66 (100%) | 66 |
| words | study, found spells, 12 Mastery levels x 30 study; held at most 4 + 3 x Brain Power and the 3 Mastered free words (37) | 37 (92%) | 37 (92%) | 40 |
| modules | practice, found designs, 12 Mastery levels x 40, 3 Mastered free picks; at most the 23 its gates and six spare points open (04 2(e)) | 23 (82%) | 23 (82%) | 28 |
| feelings | Mark I of each feeling's bar | 18 (72%) | 22 (88%) | 25 |
| forms | Figment form Marks, about 3 forms held a fight over 7 or 8 forms (03) | 24 (80%) | 24 (80%) | 30 |

What it says: **techniques** reach 72% at level 20 and 84% at hour 50 for a specialist who keeps its main weapon until a better grade and drills the collection in its second hand, and all 66 for a collector who moves both hands to a new weapon at each Mark III: *about 80% sits between, by how you play* (Law 3). **Words** stop at the words-held limit (4 + 3 x Brain Power and the Mastered free words: 37 of 40) at about level 20: the last three are never a specialist's. **Modules** stop at the 23 an Outburst specialist's gates and spare points open (04 2(e)). **Forms** and **feelings** are at or near 80% at level 20 and above it at the peak.

## 5. Credits, grades by map and the one grade-step price

### 5.1 Facts (checked)

- **Income:** c(d) = 80 + 20 x d a character, Elite and vault guard x1.5, Boss x2, cache x1.5, chest x2, x(1 + 0.35 x (stage - 1)) (`survival.json:127`, `:59`; `rewards.ts:68-69` `nodeCredits`).
- **The grade step:** Fine 1,500 and Masterwork 3,500 x the place (shop 1, Forge 0.8); Relic 6,500 at a Forge only with no factor, from stage 3 (`survival.json:189-200` `grade_up`, `relic_from_stage` at `:195`; `run/progress.ts:125` `gradePrice`). Every step and roll is capped by `rewards.ceiling` ["fine", "masterwork", "relic"] (`survival.json:147`; `rewards.ts:156` `stageCeiling`), and `progress.ts:145` reads `relic_from_stage` as a second gate for the same rule.
- **Buying a graded piece** is its price x the grade's `price` (Fine 3, Masterwork 8, Relic 25, Celestial 50; `rules.json:1601` `rarity`): two prices for "a Fine X" (3 x base bought, or base and a flat 1,500).
- **The vault** gives a pick of three at `grade_up` 1 above the stage's ceiling, at most Relic (`survival.json:580`; `rewards.ts:80` `vaultGrade`); the validator demands `grade_up` 1 or more and refuses Celestial at the top (`tools/validate.py:2791-2792`) and as a ceiling (`:2959-2960`). **No character can ever find a Celestial piece today.**
- **Mods** are fitted only at a Forge (`survival.json` `forge.fit`); armour classes are fitted at 100 / 250 / 600 / 1,200 (`survival.json:214-218` `armour_fit`).

### 5.2 PROPOSED (PROVISIONAL)

| Key | Today | PROPOSED | Reason a player sees |
| --- | --- | --- | --- |
| `survival.json:147` `rewards.ceiling` (finds, by map, the last repeats) | fine, masterwork, relic | **fine, fine, masterwork, masterwork, relic, relic, relic, relic, relic, celestial** (D25) | each band of maps finds a grade: Masterwork from map 3, Relic from the final map, Celestial from endless map 10 |
| `rewards.shelf` (new list beside it: what shops and Forges sell and step to) | the ceiling | **fine, fine, masterwork, masterwork, masterwork, relic** (D25: Relic sold only in endless; Celestial never) | the shop is a step behind the finds: the best grade is earned before it is bought |
| `survival.json:580` `vault.grade_up`, `grade_max` | 1, relic | **0, celestial**: the vault's three are at the map's finds grade | the dead-end fight is the sure way to the map's best grade; it never gives a grade two maps early (D25: no Celestial before map 10) |
| `rewards.rarity.boss` | masterwork 70, relic 25, celestial 5 | **masterwork 40, relic 35, celestial 25**, capped by the finds | from map 10 one Boss pick in four is Celestial (D25); before, the cap turns it into the map's best grade |
| `rewards.rarity.gate` (new row) and `weapon_card.gate` | the gate reads the Elite's row (`survival.json:131` `reads`) | **{relic: 100} capped by the shelf; `weapon_card.gate` 1** | the gate is the map's turn: it pays a weapon of the grade the shops sell, so the middle of a map is a beat as its Boss is |
| `grade_up.price` and the step's price | Fine 1,500, Masterwork 3,500 x the place; Relic 6,500 flat | **one price (D26): max(the step's floor, priceOf(item, to) - priceOf(item, from)) x the place**, floors **1,500 / 3,500 / 12,000**, the place factor on every step (shop 1, Forge 0.8); the Relic step stays at a Forge (`relic_at`, kept) | one formula for the shop and the Forge, and the same total whether you buy a Fine piece or step a plain one up; a dear weapon costs dearly to raise |
| `grade_up.relic_from_stage` | 3 | **removed**: the shelf is the one gate | one copy of the rule |
| `grade_up.reforge` (new) | none | **the Relic floor x the place (9,600 at a Forge)**: a Relic or Celestial piece's property offered again (`relic_offer` 3) | the peak's credit sink: once every piece is a Relic (about hour 36 to 40), credits buy a better property, not nothing |
| `credits`, `stage.credits`, mods, armour fits, `forge.fit` | as above | unchanged | the income already climbs with the map |
| `tools/validate.py:2791-2792`, `:2959-2960` | `grade_up` at least 1; no Celestial vault, no Celestial ceiling | allow `grade_up` 0, Celestial as the vault's top and the finds' last ceiling, never on the shelf | |

| map | ends at hour | credits a map (a character) | an hour | finds and the vault | shelf (sold, and the steps) |
| --- | --- | --- | --- | --- | --- |
| 1 | 2.6 | 3,390 | 1,304 | fine | fine |
| 2 | 5.2 | 4,576 | 1,749 | fine | fine |
| 3 | 7.9 | 5,763 | 2,120 | masterwork | masterwork |
| 4 | 10.8 | 6,950 | 2,465 | masterwork | masterwork |
| 5 | 13.7 | 8,136 | 2,786 | relic | masterwork |
| 6 | 16.7 | 9,322 | 3,117 | relic | relic |
| 7 | 19.7 | 10,509 | 3,455 | relic | relic |
| 8 | 22.8 | 11,696 | 3,782 | relic | relic |
| 9 | 25.9 | 12,882 | 4,099 | relic | relic |
| 10 | 29.1 | 14,068 | 4,405 | celestial | relic |
| 11 | 32.4 | 15,255 | 4,702 | celestial | relic |
| 12 | 35.7 | 16,442 | 4,990 | celestial | relic |
| 13 | 39.0 | 17,628 | 5,269 | celestial | relic |
| 14 | 42.4 | 18,814 | 5,540 | celestial | relic |
| 15 | 45.9 | 20,001 | 5,803 | celestial | relic |
| 16 | 49.3 | 21,188 | 6,147 | celestial | relic |

The one grade-step price (D26): max(the step's floor, priceOf(item, to) - priceOf(item, from)) x the place (shop 1, Forge 0.8):

| item price | to Fine (Forge) | to Masterwork (Forge) | to Relic (Forge) |
| --- | --- | --- | --- |
| 100 | 1,200 | 2,800 | 9,600 |
| 750 | 1,200 | 3,000 | 10,200 |
| 2,000 | 3,200 | 8,000 | 27,200 |
| 4,500 | 7,200 | 18,000 | 61,200 |
| 8,000 | 12,800 | 32,000 | 108,800 |

**The gear calendar**, bought with 50% of income (ASSUMED; the calendar in section 7 uses 60% for the melee specialist, 50% two doors, 40% the wide gun-and-magic character, 70% the wall, which buys no rounds and no cores), in this order (the median weapon: 750 credits):

| purchase | hour | map | price |
| --- | --- | --- | --- |
| Fine weapon (Forge step) | 1.9 | 1 | 1,200 |
| Medium armour | 2.3 | 1 | 250 |
| Masterwork weapon (Forge step) | 5.8 | 3 | 3,000 |
| first mod, fitted | 6.2 | 3 | 480 |
| Heavy armour | 6.7 | 3 | 600 |
| Masterwork armour (two Forge steps) | 10.2 | 4 | 4,000 |
| second mod, fitted | 10.6 | 4 | 480 |
| Relic weapon (Forge step) | 17.4 | 7 | 10,200 |
| Relic armour (Forge step) | 22.6 | 8 | 9,600 |
| Masterwork second weapon or shield (two Forge steps) | 24.7 | 9 | 4,200 |
| Relic second weapon or shield (Forge step) | 29.5 | 11 | 10,200 |
| Masterwork off-hand focus or sidearm (two Forge steps) | 31.2 | 11 | 4,200 |
| Relic off-hand focus or sidearm (Forge step) | 35.3 | 12 | 10,200 |
| Masterwork third carried piece (two Forge steps) | 37.0 | 13 | 4,200 |
| Relic third carried piece (Forge step) | 40.7 | 14 | 10,200 |
| re-forge a property (Forge) | 44.1 | 15 | 9,600 |
| re-forge a property (Forge) | 47.4 | 16 | 9,600 |
| re-forge a property (Forge) | 50.5 | 17 | 9,600 |
| re-forge a property (Forge) | 53.4 | 18 | 9,600 |
| re-forge a property (Forge) | 56.2 | 18 | 9,600 |

First masterwork found: map 3 (its vault and its Boss picks), hours 5.2 to 7.9.

First relic found: map 5 (its vault and its Boss picks), hours 10.8 to 13.7.

First celestial found: map 10 (its vault and its Boss picks), hours 25.9 to 29.1.

## 6. Co-op pace (D27)

`survival.json xp.party_pace` **[1, 1.6, 2.2, 2.8]** for squads of 1 to 4 (D27), PROVISIONAL until a co-op playtest. It is read once, by S7 `growthWorth`, beside the worth. The model's reading of what it answers (each player's turn added to a round, the budget scaling the foes with the squad, the other nodes a quarter longer a player):

| squad | map 5 ends (h) | map 14 ends, level 20 (h) | x solo | party_pace (D27) |
| --- | --- | --- | --- | --- |
| 1 | 13.7 | 42.4 | 1.0 | 1 |
| 2 | 23.8 | 75.1 | 1.77 | 1.6 |
| 3 | 33.9 | 107.7 | 2.54 | 2.2 |
| 4 | 44.1 | 140.4 | 3.31 | 2.8 |

**What the row multiplies (the one question for the lead):** every gain paced by fights (drill, study, practice, every Mark, Devotion tag XP with its caps), so a squad's bars fill in the solo hours. **XP is not multiplied:** under D24 a level is tied to a map, and the map's foes do not follow the party; XP x2.8 would lift a squad of four several levels over its maps' foes (the worth throttles it only at -3 and below), and its fights would be over in a few blows. So a co-op run reaches level 20 at the same Boss as a solo one, in about 1.8 / 2.5 / 3.3 times the hours: the price of four players' turns. If Leon wants a co-op squad at level 20 near hour 40, the lever is the map's length for a squad (06's rows), not XP.

## 7. The calendar, hours 0 to 49

`python tools/balance/pacing.py calendar` prints it. Four characters, solo, on the reference route: **the specialist** (a Breaker, one door; a melee main kept until a better grade, the second hand drilling the collection), **two doors** (a Breaker with Sigils), **wide** (four doors at 4 to 5: Pressure, Sigils, Outbursts, Prayer; a Skirmisher), **the wall** (a Bulwark, Guard only, no Faith: critic-player 11's worst case). L = a level; wN MI = the N-th weapon's (or shield's) Mark I; door / door2 = the first and second door's Marks; Dev = Devotion standing (only the wide character has Faith to use it); a gate pick is at the shelf's grade; mods are fitted at each map's Forge.

| hour | specialist | two doors | wide | wall |
| --- | --- | --- | --- | --- |
| 0 | w1 MI, w2 MI | w1 MI, w2 MI, word 3 | w1 MI, w2 MI, word 3, module 2, Dev 1 | w1 MI, w2 MI |
| 1 | L2, w1 MII, w2 MII, Fine weapon, Medium armour, gate pick (fine) | L2, w1 MII, Fine weapon, gate pick (fine) | L2, w1 MII, gate pick (fine) | L2, w1 MII, Fine weapon, Medium armour, gate pick (fine) |
| 2 | L3, w1 MIII, w2 MIII, door I, boon | L3, w2 MII, w1 MIII, word 4, Medium armour, boon | L3, w2 MII, word 4, Fine weapon, Medium armour, boon, Dev 2 | L3, w2 MII, door I, boon |
| 3 | L4, w3 MI, gate pick (fine) | L4, w2 MIII, door I, word 5, gate pick (fine) | L4, w1 MIII, module 3, feeling 3, gate pick (fine), Dev 3 | L4, w1 MIII, w3 MI, gate pick (fine) |
| 4 | w3 MII | w3 MI | w2 MIII | w2 MIII, w3 MII |
| 5 | L5, w3 MIII, Masterwork weapon, Heavy armour, boon | L5, w3 MII, door2 I, word 6, found spell, Masterwork weapon, boon | L5, w3 MI, word 5, found spell, boon | L5, w4 MI, Masterwork weapon, Heavy armour, boon |
| 6 | L6, w4 MI, w5 MI, Masterwork found, gate pick (masterwork) | L6, w4 MI, found spell, Heavy armour, Masterwork found, gate pick (masterwork) | L6, w3 MII, door I, door2 I, door3 I, door4 I, found spell, module 4, feeling 4, Masterwork weapon, Masterwork found, gate pick (masterwork), Dev 4 | L6, w3 MIII, Masterwork found, gate pick (masterwork) |
| 7 | L7, w4 MII, w5 MII, mod, boon | L7, w4 MII, word 7, found spell, mod, boon | L7, w4 MI, word 6, found spell, mod, boon | L7, w6 MI, w5 MI, Masterwork armour, mod, boon |
| 8 | w5 MIII, w4 MIII, Masterwork armour | w3 MIII, w5 MI, word 8, found spell | w4 MII, found spell, Heavy armour | w6 MII, w5 MII |
| 9 | L8, w6 MI, mod, gate pick (masterwork) | L8, w4 MIII, found spell, mod, gate pick (masterwork) | L8, w3 MIII, word 7, found spell, module 5, feeling 5, mod, gate pick (masterwork), Dev 5 | L8, mod, gate pick (masterwork) |
| 10 | L9, w6 MII, boon | L9, w5 MII, word 9, found spell, Masterwork armour, boon | L9, w5 MI, w4 MIII, word 8, found spell, boon | L9, w6 MIII, w7 MI, boon |
| 11 | L10, door II, Relic found, gate pick (masterwork) | L10, word 10, found spell, Relic found, gate pick (masterwork) | L10, w5 MII, found spell, Masterwork armour, Relic found, gate pick (masterwork) | L10, w5 MIII, door II, Relic found, gate pick (masterwork) |
| 12 | w6 MIII, w7 MI, w8 MI, mod | w5 MIII, w6 MI, found spell, mod | w6 MI, word 9, found spell, module 6, feeling 6, mod | w7 MII, w9 MI, mod |
| 13 | L11, w7 MII, w8 MII, boon | L11, w7 MI, w6 MII, word 11, found spell, boon | L11, found spell, boon, Dev 6 | L11, w7 MIII, Relic weapon, boon |
| 14 | w7 MIII, gate pick (relic) | w7 MII, word 12, found spell, gate pick (relic) | w6 MII, w5 MIII, word 10, found spell, gate pick (relic) | w10 MI, w9 MII, gate pick (relic) |
| 15 | w8 MIII, Relic weapon, two mods | w6 MIII, found spell, two mods | w7 MI, found spell, feeling 7, two mods | w10 MII, two mods |
| 16 | L12, w9 MI, boon | L12, w7 MIII, word 13, found spell, boon | L12, w6 MIII, w7 MII, word 11, found spell, module 7, boon | L12, boon |
| 17 | w9 MII, door mid, gate pick (relic) | w8 MI, word 14, found spell, Relic weapon, gate pick (relic) | found spell, gate pick (relic) | w9 MIII, w10 MIII, door mid, gate pick (relic) |
| 18 | two mods | found spell, two mods | word 12, found spell, feeling 8, two mods, Dev 7 | w11 MI, w12 MI, Relic armour, Assault armour, two mods |
| 19 | L13, w9 MIII, w10 MI, boon | L13, w8 MII, door II, word 15, found spell, boon | L13, w7 MIII, found spell, module 8, boon | L13, w12 MII, w11 MII, boon |
| 20 | w10 MII, Relic armour, gate pick (relic) | word 16, found spell, gate pick (relic) | w8 MI, word 13, found spell, Relic weapon, gate pick (relic) | gate pick (relic) |
| 21 | Masterwork second weapon or shield, two mods | w8 MIII, two mods | feeling 9, two mods | w12 MIII, Masterwork Assault armour, two mods |
| 22 | L14, w10 MIII, boon | L14, w9 MI, word 17, found spell, Relic armour, boon | L14, w8 MII, word 14, found spell, boon | L14, w13 MI, w11 MIII, boon |
| 23 | w11 MI, door III | w9 MII | module 9, Dev 8 | w14 MI, w13 MII, door III |
| 24 | w11 MII, two mods, gate pick (relic) | word 18, found spell, Masterwork second weapon or shield, two mods, gate pick (relic) | w8 MIII, found spell, feeling 10, two mods, gate pick (relic) | two mods, gate pick (relic) |
| 25 | L15, boon | L15, boon | L15, w9 MI, word 15, boon | L15, w14 MII, w13 MIII, boon |
| 26 | w11 MIII, w12 MI, Relic second weapon or shield | w9 MIII, word 19, found spell | found spell, module 10, Relic armour, Dev 9 | w15 MI, Relic Assault armour |
| 27 | w13 MI, w12 MII, Masterwork off-hand focus or sidearm, Celestial (vault), gate pick (relic) | w10 MI, w11 MI, Celestial (vault), gate pick (relic) | w9 MII, word 16, feeling 11, Celestial (vault), gate pick (relic) | w15 MII, Celestial (vault), gate pick (relic) |
| 28 | w13 MII, two mods | w10 MII, word 20, found spell, two mods | w10 MI, found spell, Masterwork second weapon or shield, two mods | w16 MI, Masterwork second weapon or shield, two mods |
| 29 | L16, w12 MIII, w13 MIII, Celestial (Boss pick, 1 in 4), boon | L16, w11 MII, door mid, door2 II, word 21, Relic second weapon or shield, Celestial (Boss pick, 1 in 4), boon | L16, w10 MII, word 17, Celestial (Boss pick, 1 in 4), boon | L16, w15 MIII, Celestial (Boss pick, 1 in 4), boon |
| 30 | w14 MI, gate pick (relic) | w11 MIII, found spell, gate pick (relic) | w9 MIII, found spell, module 11, feeling 12, gate pick (relic) | w16 MII, w17 MI, gate pick (relic) |
| 31 | w14 MII, Relic off-hand focus or sidearm, two mods | w10 MIII, word 22, Masterwork off-hand focus or sidearm, two mods | w11 MI, two mods, Dev 10 | w17 MII, Relic second weapon or shield, two mods |
| 32 | L17, Masterwork third carried piece, boon | L17, w12 MI, found spell, boon | L17, w10 MIII, word 18, found spell, boon | L17, w16 MIII, Masterwork off-hand focus or sidearm, boon |
| 33 | w14 MIII, w15 MI, gate pick (relic) | w12 MII, word 23, gate pick (relic) | w11 MII, feeling 13, gate pick (relic) | w17 MIII, w18 MI, gate pick (relic) |
| 34 | two mods | found spell, two mods | word 19, found spell, module 12, Relic second weapon or shield, two mods | two mods |
| 35 | L18, w15 MII, boon | L18, word 24, Relic off-hand focus or sidearm, boon | L18, boon | L18, w18 MII, Relic off-hand focus or sidearm, boon |
| 36 | Relic third carried piece, gate pick (relic) | w12 MIII, found spell, gate pick (relic) | w11 MIII, found spell, feeling 14, Masterwork off-hand focus or sidearm, gate pick (relic) | Masterwork third carried piece, gate pick (relic) |
| 37 | w15 MIII, w16 MI, two mods | w13 MI, word 25, Masterwork third carried piece, two mods | w12 MI, word 20, module 13, two mods | two mods |
| 38 | w16 MII | w13 MII, found spell | found spell | w18 MIII |
| 39 | L19, re-forge a property, boon | L19, word 26, boon | L19, w12 MII, word 21, feeling 15, boon | L19, w19 MI, Relic third carried piece, boon |
| 40 | w16 MIII, gate pick (relic) | door III, found spell, Relic third carried piece, gate pick (relic) | found spell, Relic off-hand focus or sidearm, gate pick (relic) | gate pick (relic) |
| 41 | w17 MI, two mods | w13 MIII, word 27, two mods | w12 MIII, door II, door2 II, door3 II, door4 II, word 22, module 14, two mods | w19 MII, two mods |
| 42 | L20, w17 MII, w18 MI, re-forge a property, Celestial (Boss pick, 1 in 4), boon | L20, w14 MI, found spell, Celestial (Boss pick, 1 in 4), boon | L20, w13 MI, found spell, feeling 16, Masterwork third carried piece, Celestial (Boss pick, 1 in 4), boon | L20, re-forge a property, Celestial (Boss pick, 1 in 4), boon |
| 43 | w18 MII, gate pick (relic) | w15 MI, word 28, gate pick (relic) | w14 MI, gate pick (relic) | w20 MI, gate pick (relic) |
| 44 | w17 MIII, two mods | w14 MII, w15 MII, found spell, re-forge a property, two mods | w14 MII, w13 MII, word 23, found spell, two mods | re-forge a property, two mods |
| 45 | w18 MIII, w19 MI, re-forge a property, boon | word 29, boon | module 15, feeling 17, boon | w20 MII, boon |
| 46 | w19 MII | w15 MIII, w14 MIII, door2 mid, found spell | found spell | re-forge a property |
| 47 | re-forge a property, gate pick (relic) | w16 MI, word 30, re-forge a property, gate pick (relic) | w14 MIII, w13 MIII, word 24, Relic third carried piece, gate pick (relic) | gate pick (relic) |
| 48 | w19 MIII, two mods | found spell, two mods | w15 MI, found spell, feeling 18, two mods | w20 MIII, two mods |
| 49 | w20 MI, boon | w16 MII, word 31, boon | word 25, module 16, boon | w21 MI, re-forge a property, boon |

specialist: hours with nothing: none

two doors: hours with nothing: none

wide: hours with nothing: none

wall: hours with nothing: none

**No hour from 0 to 49 is empty for any of the four.** What it took, each a rule a player sees, not a number moved to fill a row:

1. **A shield is drilled by its soaks** (4.1): without it the wall's last weapon bars ran dry from hour 28.
2. **The gate pays a pick at the shelf's grade** (5.2): a beat in the middle of every map.
3. **Mods land at each map's Forge** (one a map from map 3, two from map 6), where they are fitted today; the first draft's "a mod every 1.5 hours past 40" is withdrawn.
4. **A character takes a better-grade weapon of a new id as its main** at the first Masterwork, Relic and Celestial it finds (ASSUMED play), and the bar starts again.
5. **Re-forging a property** (5.2) at the peak, when every carried piece is already a Relic.

Where the rows are thin: the specialist and the wall live on weapon bars, levels and gear after their door's Mark III at hour 23 (*that is what one door plays like, and its Reach is the reward*); a character with Faith 0 gains nothing from its standing, so the specialist, the two-door character and the wall show no Devotion. **The boon cap** (`survival.json:219` `boon_cap.cap` 50) fills at about ten boons of worth 5, which is map 10 (about hour 29): from then a Boss's boon past the cap is worth nothing (critic-consistency minor 6; the cap is 06's and 07's).

## 8. Migration: nothing is taken from a live character (B15)

One revision, `GROWTH_REV`, run where every character migration runs today: at the start of each action, `apply` (`packages/engine/src/game.ts:650-660`), whose notes go to the story (the "your sheet changed" lines critic-player 12 asks for). Tested through that real load path: `test/old-save.test.ts` with a 0.33 fixture per case below, loaded and played one action.

| What moved | Who it touches (checked) | The migration |
| --- | --- | --- |
| **Attribute ceilings** {1: 7, 5: 8, 10: 9, 15: 10} | a 0.33 specialist holds 8 from level 4 (ceiling 8 from level 3), 9 from 6, 10 from 9 (`rules.json:194-199`); nothing refuses it at load (`validateSheet`, `character.ts:340`, checks the creation sheet only), but `legendRoom` (`character.ts:1327`) would go negative and eat a later Legendary Deed's room | points standing above the new ceiling are recorded as grandfathered (`c.capGrace`, by attribute), counted beside `legends` in `legendRoom`; nothing is lowered, refunded or lost, and a later ceiling absorbs them (critic-consistency M-1) |
| **Rank III at 15** (was 12) | a level 12 to 14 character holding rank III; `classRank` reads the level every call (`character.ts:1385`) | `c.rankHeld`, the rank held at migration; `classRank` returns the higher of it and the computed rank (M-2) |
| **The XP table** (65,800 at 20; was 15,250) | every character | the level is kept; XP is rebased to the same share of the way into its level on the new table: `new_total(L) + (xp - old_total(L)) / (old_total(L+1) - old_total(L)) x (new_total(L+1) - new_total(L))`; at 20, the renown past 20 is kept as is |
| **Points at levels 4, 5, 14, 15** | a character saved at level 4 or 14 took 1 Skill and 1 Attribute point there (the new rule gives 2 Skill) | `c.pointsOwed`: the new rule's career totals at its level less the old rule's (+1 Skill, -1 Attribute at levels 4 and 14; zero elsewhere); a positive part is given at once as unspent; a negative part is taken from the next level's gain of that kind, never from points held. By level 5 (or 15) its totals equal the new rule's |
| **Study and practice steps** (10 / 60 and 10 / 80) | every word and module learned is a list and is kept | the study and practice counters are rebased as XP is: the same share of the way to the next pick on the new steps, so no character waits hours for the next word it was nearly at |
| **Feelings by Marks** | felt feelings are a list (`m.feelings`) | every felt feeling's bar starts at its Mark I |
| **Devotion** (curve to 300; start 0) | every Faithful character | **its Devotion XP is kept**; every new threshold is at or under today's, so standing never falls; the start of 0 applies at creation only (`patrons.json:8`) (M-6) |
| **Drill** (thresholds kept) | every drilled weapon | nothing: the marks read the same totals (M-5) |
| **Advanced gates 7 to 10** | nobody: advanced classes are shelved and a held one gives nothing (`classes.json` `advanced.held_rule`) | nothing (M-9) |

## Questions for the lead

1. **Co-op pace and the map's levels (D27 against D24):** the `party_pace` row multiplies every practice gain and Devotion, but not XP, because a level is tied to a map whose foes do not follow the party (section 6)? Recommended: yes; a co-op squad reaches level 20 at map 14's Boss in about 3.3 times the solo hours for four players, until a co-op playtest; the lever for its hours is the map's length for a squad (06), not XP.

## Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency S10 (drill: 02 against 05) | FIXED | D22's rates (20 / 35 / 70 / 180 / 360, martial x1.5) and today's thresholds 300 / 900 / 1,800, so no saved mark moves; what a mark gives is 02's |
| consistency S11 (three grade-by-map lists) | FIXED | D25's split: finds and shelf as two lists (5.2); the vault gives the map's own finds grade, not the next map's as the critic proposed, because the next map's would put Celestial in map 9's vault, which D25 forbids; `relic_from_stage` removed |
| consistency S12 (endless pace: 05 against 06) | FIXED | the clock now follows D24's maps (1.3): one level an endless map, the level-20 Boss on map 14 at hour 42.4; 06's hours a map (2 / 2.5 / 3.5 / 4.5 / 3.5) are replaced by the model's 2.6 to 3.4, which 06 and 07 quote |
| consistency M6 (Devotion: curve and start) | FIXED | 05's curve and caps, start 0 for new characters (B19), live characters keep their XP (section 8) |
| consistency M10 (48 or 38 Skill points) | FIXED | 38 and 20 (B11), counted in 3.2 |
| consistency M11 (the gate and its point) | FIXED | B12's swap at 4 / 5 and 14 / 15 as a `by_level` row of `gains` (3.1); no point is held |
| consistency minor 2 (door Mark thresholds) | FIXED | one formula, written as numbers for each door (4.2) |
| consistency minor 3 (form Marks) | FIXED | 03's [6, 20, 50] |
| consistency minor 6 (the boon cap at hour 35) | NOT FIXED | the cap is 06's and 07's; the calendar now reads it full at map 10, about hour 29 (section 7) |
| consistency section 4 (05's P1 to P4 merged) | FIXED | P1 is S7 `growthWorth` (with `party_pace` and `practice_rate`), P2 is S4 keyed Marks, P3 is the `tallyOf` stage scope (an extension, not a list), P4 is S9 firsts |
| consistency section 5 item 5 (literals in code) | FIXED for 05's | `XP_SOURCES`, `COMBAT_XP`, `combatXp`'s `\|\| 50`, the fallbacks at `character.ts:1321` and `:1361-1363`, `wordsKnownCap`'s typed 4 leave code in the change that moves their numbers (Built from) |
| consistency section 6, M-1, M-2, M-5, M-6, M-9 | FIXED | section 8, through the real load path |
| consistency question 5 (grandfather or recompute) | FIXED | B15: grandfathered (section 8) |
| player 1 (05's map hours against 06's; grade by map) | FIXED for 05 | hours from the model on D24's maps (1.3), the grades from D25 (5.2); 06 and 07 quote them |
| player 2 (a specialist never ahead in Reach) | FIXED | B13 applied to the plans (3.3): the two-door character's second door stops at step 7 |
| player 4 and 18 (the held Attribute point) | FIXED | B12's swap (3.1, 3.2) |
| player 8, Brain Power's words-held limit binding late | NOT FIXED here | the limit is 03's card (B19's 4 + 3 x Brain Power); 4.3 reads where it binds (37 of 40 at about level 20) |
| player 11 (the wall's empty hours) | FIXED | the wall is the calendar's fourth column; its gaps closed by a shield's drill by soaks, the gate's pick, the Forge's mods, armour bought first and the re-forge (section 7) |
| player 12 (rewards taken back from saves) | FIXED for 05's part | section 8: Devotion, ranks, ceilings, XP, study and practice kept; the migration's notes go to the story as today |
| player 15 (the boon cap) | NOT FIXED | as consistency minor 6 |

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| The XP table | `rules.json:252-273` `xp_total`; `character.ts:1282` `xpForLevel` | the 19 values (2.2) |
| A fight's XP by its level | `run/rewards.ts:63-66` `nodeXp`; new column `rules.json character.levels.fight_xp` (data) | `nodeXp` reads `fight_xp` at the node's level (06's `worldLevel`) x the kind x S7; `xp.base`, `xp.per_depth` and `stage.xp` go |
| The node kinds' weights | `survival.json:126` `xp` | unchanged |
| Worth by the gap | `combat.ts` `levelGap`; `effects/hooks.ts:37` `growthHeld` | new `enemies.json levels.gap.worth`; S7 |
| Co-op pace | `rewards.ts:65` (every character takes the node's XP) | `survival.json xp.party_pace` read by S7 on practice and Devotion gains (section 6) |
| Campaign XP | `rules.json:282` `xp_sources`; `combat.ts:3490` `combatXp` | multiples of `fight_xp` at the stated level (D28); delete `data.ts:129-132` and the `\|\| 50` |
| Campaign tiers | `rules.json:274-280` `pacing_target` | the four tier rows (2.3), read by 06's `tier` field |
| Ceilings on fives | `rules.json:194-199` `cap_by_level`; `character.ts:1321` | values; the fallback goes |
| The swapped gains | `rules.json:223-245` `levels.gains`; `character.ts:1313` (the level-up adds them) | a `by_level` row (4, 5, 14, 15) read by the same adder |
| Ranks at 3, 5, 15; advanced gates at 10 | `classes.json:17-22`, `:32`, `:37`; `character.ts:1361-1363`, `:1385` `classRank` | values and texts; the fallbacks go |
| Weapon drill | `techniques.json:99-118` `rules.drill`; `physical/data.ts:138-147` `drillMult`, `addDrill`; `physical/rules.ts:84-91` | `per_kill`, `martial_mult`; the kill site x S7 |
| A shield's drill by soaks | `physical/core.ts:121` `guardSoak` (the soak site); `addDrill` | `rules.drill.per_soak` 20; the soak site calls the drill adder for a held shield (one call, no new list) |
| Rests and training | `survival.json:423` `train`, `:430` `training`; `run/progress.ts` | `study`, `practice` values |
| Sigil study and words held | `sigils.json:193`, `:209-231`; `sigilgrowth.ts:40`, `:48`; `character.ts:890` | the study numbers; words held a number block (B19), its typed 4 removed |
| Outburst practice | `soul_modules.json:1327-1349`; `magic.ts:1728` | `thresholds`, `then_every`, `mastery_bonus`; the Release site x S7 |
| Feelings, forms, door Marks | the felt list (`magic.ts:1154`); `figments.json` `forms`; the door rows | `marks` on each feeling row, `form_marks`, each door row's `marks` (4.2); all through S4 |
| Found spells | the felt list's shape | S9 (the magic drafters own the book) |
| Devotion | `patrons.json:8`, `:17`, `:48`; `faith.ts:95` `TAG_CAPS`, `:506` `tallyOf` | start, curve, `tag_caps.fight`; `tag_caps.stage` read by `tallyOf`'s stage scope |
| Finds and shelf by map | `survival.json:147` `rewards.ceiling`; `rewards.ts:156` `stageCeiling`, `:159` `cappedRarity`; `progress.ts:145` | ten finds; a `shelf` list; `stageCeiling(stage, purpose)`; the `relic_from_stage` gate goes |
| The vault's grade | `survival.json:580`; `rewards.ts:80` `vaultGrade`; `validate.py:2791-2792` | `grade_up` 0, `grade_max` celestial; the validator's checks |
| The Boss's and the gate's rows | `survival.json:141-146` `rewards.rarity`, `:131` `reads`, `:134` `weapon_card` | Boss 40 / 35 / 25; a `gate` row and `weapon_card.gate` |
| One grade-step price | `run/progress.ts:125` `gradePrice`, `:534` (the offer line's own Relic price); `credits.ts:51` `priceOf` | `gradePrice` reads the formula once (the offer line reads `gradePrice`, not `GRADE_UP.price.relic`) |
| The calendar's arithmetic | `tools/balance/pacing.py` (read-only) | none: it reads data |

## Needs a new primitive

Names from critic-consistency's merged list (its section 4) where one exists. General pieces only; each for the lead to approve.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S7. `growthWorth`** (with `practice_rate` and `party_pace`) | `growthHeld` (`effects/hooks.ts:37`) extended to a factor: 0 on the field and in a dry run (so `growthHeld` is its `== 0` case), 1 out of a fight, else `levels.gap.worth` by the gap x `xp.party_pace` by the squad (practice only) x a `practice_rate` stat line; read once by every growth site in a fight | `growthHeld` is yes or no; no piece scales a gain by the gap |
| **S4. Keyed Marks** | the drill bar (`physical/data.ts:123-147` `drillMarks`, `addDrill`) keyed `weapon:`, `door:`, `form:`, `feeling:`, thresholds from the track's row | the bar is weapon-only and kill-only; feelings unlock on a first-time list with no count |
| **S9. Firsts** | the felt list generalised to a keyed set on the character, with a load default | nothing records which spells were cast |
| Extension: `tallyOf` gains a stage scope | `faith.ts:506` keys its session part by the run's stage when a run is on, with `tag_caps.stage` | a run is one session, so 6 a session holds Devotion for a whole run |
| Extension: `stageCeiling(stage, purpose)` | purpose `finds`, `shelf` or `vault` reads its list (`rewards.ceiling`, `rewards.shelf`) | one list serves finds and the shop today |
| Extension: `levels.gains.by_level` | the level-up's gain reader takes a per-level exception row | `gains` reads only odd and even levels |
| Extension: a grade step to the same grade (the re-forge) | `run/upgrade` with the piece's own grade (Relic or Celestial) re-offers its property pick at `grade_up.reforge` | the step only goes up a grade |

## What re-records

| What | Why |
| --- | --- |
| `level-gains.test.ts`, `levelup-revert.test.ts`, `legendary-deed.test.ts`, `skeleton-strength-checks.test.ts` | ceilings on fives, the swapped gains, `capGrace` in `legendRoom` |
| `test/balance/builds.ts`, `test/golden/builds-allin.json`, `builds-normal.json` and every golden table built on them | the reference builds are legal at each level by the new ceilings and gains |
| The class-rank tests; `classView.ts` | ranks at 5 and 15; `rankHeld` |
| `sigil-word-cap.test.ts` and the study tests | words held 4 + 3 x Brain Power; the study numbers |
| The Outburst practice tests | the practice numbers |
| The faith suites (`tag_caps`, the curve, the start, the stage scope) | the Devotion numbers |
| `survival-progress`, `survival-stage`, `survival-run`, `survival-run-levels`, `survival-vault`, `survival-loot`, `survival-materials`, `survival-field*`, `survival-map` | XP by the fight's level and worth, the finds and the shelf, the vault at the finds grade, the gate's pick, the grade-step formula, the Forge's re-forge |
| `test/balance/survival-run.ts`, `party-fit.ts` (the 0.34 MEASURES seeds) | characters level by the map: a new baseline column, not a regression |
| `test/old-save.test.ts` and its fixtures | `GROWTH_REV`: a fixture for each row of section 8 |
| `text-number-truth.test.ts`, `tools/text_numbers.py`, `test/datatext.test.ts` | `caps`, `rank_rule`, the study and practice texts read their fields |
| `tools/validate.py` | the vault's `grade_up` 0, Celestial as the finds' last ceiling and the vault's top, the `shelf` list, `fight_xp`, `levels.gap.worth`, `party_pace`, the `by_level` gains |
| Web: `apps/web/src/screens/levelup.js`, `game/classView.ts`, `game/runView.ts`, `narrator/context.ts` | the next ceiling, the rank's level, the XP bar, the XP sources told to the AI Narrator |
| The two-browser e2e that levels a character in Survival | level 2 at 270 XP and 3 at 970 (was 100 and 250) |
| The spec `docs/rules/PHC-Core-Rules-v1.0.md` | a rules revision first: the XP table, `fight_xp`, the worth, the gates and gains, the practice rates, the grades by map and the step price; section 14's provisional list |
