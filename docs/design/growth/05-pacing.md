# 05. Pacing: what a character gains, and when (0.34 rebalance, design phase)

**Drafter's file, 21 Nov 2026. Nothing here is built.** It sets the clock of the charter
(`docs/design/proposals/2026-11-21-the-curve.md` section 18): about 50 hours for one character to cap out every
system, level 20 at about hour 40, then about ten hours at the peak. Every proposed number is **PROVISIONAL**. The
working is in `tools/balance/pacing.py`, which only reads data and prints every table below:

    export PYTHONUTF8=1
    python tools/balance/pacing.py                 # every table
    python tools/balance/pacing.py xp credits      # one or more of: time xp points practice credits calendar
    PACING_NOFIX=1 python tools/balance/pacing.py calendar   # the calendar before the two peak fixes (section 6)

The motto rules every choice: **effort is always rewarded, and actions have consequences.** No number here is fitted
to a share of a weapon or to a line. A rate is chosen so that something a player can see moves often enough to be
felt, and a gain only comes from a fight worth fighting.

## 0. What this file decides (short)

1. **One clock for everything:** a "worthy fight" (foes within two levels of you) is the unit; the time model turns
   fights into hours. The XP table is pinned to the content: **level 10 as Survival's final Boss falls (hour 16)**,
   level 5 at hour 4, 15 at 28, 20 at 40.
2. **A fight's XP grows with its level** (a column, 50 at level 1, about 620 at level 19) and is **multiplied by
   its worth** to you: full within two levels, falling to nothing five under, up to x1.5 five over.
3. **The gates on fives:** ceilings 7 / 8 / 9 / 10 from levels 1 / 5 / 10 / 15; class ranks at 3, 5 and 15.
4. **Every practice track gets a rate in worthy fights and in hours**, and the same worth factor.
5. **Credits:** income stays; the grade ceiling and the Relic step move so Fine lands about hour 2 to 3, Masterwork
   about 7, Relic about 19, Celestial (found, not bought) about 29 to 35.
6. **The calendar:** no hour from 0 to 50 is empty for any of the three characters, after two fixes at the peak.

## 1. How long things take today

### Facts (checked in data and code)

- **A fight's target rounds:** fight 5 (4 at depth 2 or less), Elite and the gate 6.5, vault guard 6.5, Boss 9
  (`data/survival.json:64` `rounds`). **Measured:** the standard fight (three Soldiers and an Elite, three
  characters) runs 7.0 rounds with no Calls (`docs/design/handoffs/0.33-MEASURES.md:127`) and 6.8 to 8.7 with the
  shield walls (`docs/design/handoffs/0.34-WEAPON-MEASURES.md:425-441`): about 10% over its 6.5 target. After a won
  fight, the field runs `field.rounds` 3 (`survival.json` `field`).
- **A map:** 15 rows (`survival.json` `map.rows`), gate Elite at row 8, Boss at 15. A route holds fights 5 to 8,
  Elites 1 to 3, shops 2 to 3, Forges 1 to 2, rests 1 to 2, training 0 to 2, a shrine 0 to 1, caches and events 0 to 2,
  one Boss (`survival.json` `map.expect.path`). The reference walk the script uses: 6 fights, 2 Elites (the gate and
  one more), the Boss, 2 shops, a Forge, a rest, and half a training ground, shrine, cache, event and vault spur
  (14.9 fight-equivalents: fight 1, Elite 1.5, vault guard 1.5, Boss 5, cache 0.25, the XP weights of
  `survival.json:126`).
- **XP a node, today:** f(d) = 35 + 0 x (d - 1), x1.5 an Elite and the vault guard, x5 the Boss, x0.25 a cache, x the
  stage's `stage.xp` [1, 2.6, 4, 4, 4.5] (`survival.json:126`, `:55`; code `packages/engine/src/run/rewards.ts:63-66`
  `nodeXp`). **The XP does not read any foe's level or the character's.** A stage-1 map pays about **520 XP** a
  character. With `rules.json:252-273` `xp_total` (100 at 2 ... 15,250 at 20) a character ends map 1 at level 3 (as
  the data note promises), map 2 at 5, map 3 at 8, map 4 at 11 and map 5 at 13, and reaches **level 20 at the end of
  map 8**: levels outrun the five maps and the endless stages give nothing to grow into.
- **Foe levels today copy the party:** fight level = the party's average, rounded down (`data/enemies.json`
  `levels.fight_level`); vermin and minions lag 3, Soldiers 1 (2 from level 10), Elites and Bosses 0
  (`enemies.json` items `lag`), plus `stage.elite_up` 2 a stage, at most 4 (`survival.json:55`;
  `packages/engine/src/run/encounter.ts:70-75`). (The charter gives foes their own levels from the map; that is the
  enemy drafter's. This file reads whatever level the foe has.)
- **Campaign XP today** is absolute numbers: `rules.json:282` `xp_sources` (combat easy 25 / standard 50 / hard 100
  / boss 200; dialogue 25 to 100; quest 50 to 300), and **a second copy typed in code**:
  `packages/engine/src/data.ts:129-132` `XP_SOURCES` and `COMBAT_XP`, and `combat.ts:3490` `|| 50` (a defect under
  the no-rebuild rule 2 and 3: data typed into code). `rules.json:274` `pacing_target` paces level 20 at about
  session 51.

### The time model (ASSUMED; no data holds these, `pacing.py` ASSUMED block)

| Piece | Minutes | Why |
| --- | --- | --- |
| A player's 6-AP turn | 1.25 at level 1, +0.05 a level (about 2.2 at 20) | read the board, pick from techniques, words and feelings, watch it resolve; more to choose each level |
| One foe's turn | 0.15 | animated, not chosen |
| Rounds in a fight | target x1.1, x(1 + 0.015 x (level - 1)) | the measured 10%; the scale drafter's "room for the long cash-outs" (x1.29 at level 20) |
| After a fight | 2 | the field's 3 rounds and the reward panel |
| Other nodes | shop 4, Forge 3, rest / training / shrine / event 2, vault chest 1.5, cache 1; 0.5 to choose each node | |

**Result (solo):** a fight 11 minutes at level 1, 15 at 10, 21 at 20; an Elite 14 / 19 / 26; the Boss 19 / 26 / 36.
**A map: about 2.7 hours at level 3, 3.4 at level 9.** The model ends map 5 at hour 14.6; the charter says 16. The
tables pin the content to the charter (x1.10 on every model hour): the levels arrive at the same **fights** whatever
the minutes really are. If play is faster than 16 hours for five maps, every row of section 6 arrives earlier in
hours and at the same place on the map.

| Map | Hours (pinned) | Level at its end (PROPOSED) |
| --- | --- | --- |
| 1 | 0 to 3.0 | 4.3 |
| 2 | 3.0 to 6.1 | 5.9 |
| 3 | 6.1 to 9.3 | 7.2 |
| 4 | 9.3 to 12.6 | 8.6 |
| 5 (final Boss) | 12.6 to 16.0 | **10.0** |
| endless 1 to 7 | 16.0 to 44.0, 3.5 to 4.5 hours each | 11.5, 13.0, 14.6, 16.3, 18.0, 19.8, **20 at hour 40** |

"Two levels a map" holds on average (9 levels in 5 maps); map 1 gives more (1 to 4, the class in it) and maps 3 to 5
give about 1.3 each. Leon, debate round 2 item 2: more at the beginning is fine. Then ten hours at the peak in endless
maps 6 and 7.

## 2. The XP table and the XP a fight gives

### A fight's XP (PROPOSED)

**XP = the standard fight's XP at the fight's level x the node's kind x its worth to you.**

- **The column** (`rules.json character.levels.fight_xp`, new key, one row a level): **50 at level 1, x1.15 a level**
  (57, 66, 76, 87, 100, 120, 130, 150, 180, 200, 230, 270, 310, 350, 410, 470, 540, 620, 710; rounded to two
  figures). PROVISIONAL. *So the number on the reward panel grows as your hits do, and a level's bar still fills in
  the same eight to eleven fights.*
- **The kind** stays as today (`survival.json:126`: Elite and vault guard x1.5, Boss x5, cache x0.25, chest 0).
  `xp.base` 35 and `stage.xp` [1, 2.6, 4, 4, 4.5] are **retired**: the level column does their work (a deeper stage
  has higher-level foes, so it pays more by itself).
- **The worth** (`enemies.json levels.gap.worth`, new key; gap = the foe's level minus yours; in a node, the fight's
  level):

| gap | -5 or less | -4 | -3 | -2 to 0 | +1 | +2 | +3 | +4 | +5 or more |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| worth | 0 | 0.33 | 0.67 | 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 |

PROVISIONAL. *Within two levels a fight pays in full; farming foes five levels down pays nothing (they already die to
one hit there: `enemies.json levels.gap.one_hit_levels_below` 5); taking on a fight above you pays more, so a squad
that rushed ahead catches up by fighting, and one that took the long road coasts.* Five matches the to-hit gap's
`max_levels` 5. A foe below a full-HP Elite's level is never a way round the guard: the worth reads levels only.

**The worth applies to every gain earned in a fight** (XP, drill, study, practice, a door's Marks, a feeling's and a
form's Marks, Devotion tag XP), through one reader (section 8, primitive P1). Out of a fight (a rest, a training
ground, a shrine, a Narrator's award) there is no gap and the worth is 1.

### The XP table (`rules.json character.levels.xp_total`, PROPOSED)

Built from the hour targets (L2 0.5 h, L3 1.25, L4 2.5, L5 4, then 2.4 hours a level: 10 at 16, 15 at 28, 20 at 40)
x the fight-equivalents an hour at that depth x the column. PROVISIONAL.

| Level | Hour | XP for it | xp_total | today | fight-equivalents for it |
| --- | --- | --- | --- | --- | --- |
| 2 | 0.5 | 120 | 120 | 100 | 2.4 |
| 3 | 1.25 | 210 | 330 | 250 | 3.7 |
| 4 | 2.5 | 410 | 740 | 700 | 6.2 |
| 5 | 4.0 | 550 | 1,290 | 1,300 | 7.2 |
| 6 | 6.4 | 1,000 | 2,290 | 2,050 | 11.5 |
| 7 | 8.8 | 1,100 | 3,390 | 2,800 | 11.0 |
| 8 | 11.2 | 1,300 | 4,690 | 3,550 | 10.8 |
| 9 | 13.6 | 1,400 | 6,090 | 4,300 | 10.8 |
| 10 | 16.0 | 1,600 | 7,690 | 5,050 | 10.7 |
| 11 | 18.4 | 1,800 | 9,490 | 5,950 | 10.0 |
| 12 | 20.8 | 1,900 | 11,390 | 6,850 | 9.5 |
| 13 | 23.2 | 2,200 | 13,590 | 7,750 | 9.6 |
| 14 | 25.6 | 2,500 | 16,090 | 8,650 | 9.3 |
| 15 | 28.0 | 2,900 | 18,990 | 9,550 | 9.4 |
| 16 | 30.4 | 3,100 | 22,090 | 10,450 | 8.9 |
| 17 | 32.8 | 3,500 | 25,590 | 11,650 | 8.5 |
| 18 | 35.2 | 4,100 | 29,690 | 12,850 | 8.7 |
| 19 | 37.6 | 4,500 | 34,190 | 14,050 | 8.3 |
| 20 | 40.0 | 5,100 | 39,290 | 15,250 | 8.2 |

The first four levels are cheap on purpose (the class at 3 inside the first map); from level 6 a level is about ten
fight-equivalents and 2.4 hours, so each one is a beat of about one map's worth of play. Past 20, XP counts to the
run's renown only (`packages/engine/src/run/stage.ts:162` `renownOf`, unchanged).

### Campaigns: the author's rule

The same table and the same column, so a level costs the same hours in every mode. `rules.json:282` `xp_sources`
becomes **multiples of the column at the fight's (or the scene's) level**, PROVISIONAL: combat easy 0.5 / standard 1
/ hard 2 / boss 4; dialogue 0.5 to 2; discovery 0.5 to 1.5; quest 1 to 6; a bond 1; the Essence of Experience stays
a fixed 100 x the column's ratio at your level (it is an item). The engine reads them through the one reader
(`data.ts` `XP_SOURCES` / `COMBAT_XP` typed in code are removed). A campaign plays about 40% of its time in fights,
so its author gives about as much XP again in story beats.

| Tier of content | Hours | Starts at | Levels gained | The rule for the author |
| --- | --- | --- | --- | --- |
| One-shot | 3 to 5 | any gate (1, 5, 10 or 15) | 1 to 3 | starting at 1, it reaches the class (3); from a gate it crosses at most one gate |
| Season | 12 to 20 (6 to 8 sessions) | 1, or a gate | about 5 (one tier) | one tier: 1 to 5, 5 to 10, 10 to 15 or 15 to 20 |
| Published campaign | 30 to 40 | 1 | 1 to 15 (tiers I to III) | or 5 to 20; pace about 2.4 hours a level from level 5 |
| Epic | 50 and more | 1 | 1 to 20 and the peak | the whole table, then ten hours at 20 |

`rules.json:274` `pacing_target` (session 51) is replaced by these four rows (one copy: the table above, in data as
`pacing_target.tiers`).

## 3. The gates on fives, points and three spend plans

### Data keys that change

| Key | Today | PROPOSED | Reason a player sees |
| --- | --- | --- | --- |
| `rules.json:194` `creation.attributes.cap_by_level` | {1: 7, 3: 8, 6: 9, 9: 10} | **{1: 7, 5: 8, 10: 9, 15: 10}** | the ceiling moves at the tier gates, so crossing one is felt (Leon's working frame, round 2 item 3) |
| `rules.json:193` `cap_at_creation` | 7 | 7 | unchanged |
| `rules.json:218` `caps` (text) | "8 from level 3, 9 from 6, 10 from 9" | "8 from level 5, 9 from 10, 10 from 15" | |
| `classes.json:17` `assignment.rank_levels` | {I: 3, II: 6, III: 12} | **{I: 3, II: 5, III: 15}** | rank II with the first gate; rank III with the last ceiling and the Mastered perk |
| `classes.json:12` `rank_thresholds` | II 5, III 8 | II 5, III 8 | unchanged: the class's own attribute at 5 and at 8 |
| `classes.json:22` `rank_rule` (text) | "level 6 ... level 12" | "level 5 ... level 15" | |
| `classes.json:29`, `:35` `advanced.hybrid_gate.level_min`, `squared_gate.level_min` | 7, 7 | **10, 10** | the advanced classes open at the level-10 gate; shelved in 0.34, moved now so no later pass touches it |
| `rules.json` `levels.gains` | odd 2 Skill, even 1 Skill and 1 Attribute | unchanged | 38 Skill and 20 Attribute points in a career (counted in `pacing.py` section 3) |

Defects to remove in the same change (content typed into code): `packages/engine/src/character.ts:1321` falls back to
{1: 7, 3: 8, 6: 9, 9: 10} when the data key is missing; `:1361-1363` fall back to 5 / 8 and 1 / 1. The data is always
there; the fallbacks are second copies of a rule.

### Points a character has

| Level | 1 | 3 | 5 | 6 | 10 | 11 | 15 | 16 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Skill points (career) | 10 | 13 | 16 | 17 | 23 | 25 | 31 | 32 | 38 |
| Attribute points (career, above the 1s) | 10 | 11 | 12 | 13 | 15 | 15 | 17 | 18 | 20 |
| Ceiling | 7 | 7 | 8 | 8 | 9 | 9 | 10 | 10 | 10 |
| Class rank | | I | II | | | | III | | |

An Attribute point the ceiling blocks is held to the next level (`c.unspent.attr` already allows it), so the level-4
point becomes the attribute's 8 at level 5, and the level-14 point its 10 at level 15.

### Three spend plans (greedy, legal at every level: skill <= attribute <= ceiling)

**The specialist** (a Breaker: Strength 7 and Endurance 5 at creation; Raw Power, then Guts, then Intimidation, then
Endurance's skills):

| Level | Attributes | Skills | What is capped |
| --- | --- | --- | --- |
| 1 | Str 7, End 5 | Raw Power 7, Guts 3 | |
| 5 | Str 8, End 6 | Raw Power 8, Guts 8 | rank II; the fork at 8 in reach |
| 10 | Str 9, End 6 | Raw Power 9, Guts 8, Intimidation 6 | the last perk step on Raw Power |
| 15 | Str 10, End 6 | Raw Power 10, Guts 10, Intimidation 9, Pain Threshold 2 | **Strength, Raw Power and Guts at 10 (level 15)**: rank III, two Mastered perks |
| 16 | | Intimidation 10 | the whole Strength family Mastered |
| 20 | Str 10, End 10 | + Pain Threshold 4, Durability 4 | the last eight points buy HP and soak |

**The two-door character** (a Breaker with Sigils: Strength 7 and Intelligence 4 at creation):

| Level | Attributes | Skills | What is capped |
| --- | --- | --- | --- |
| 1 | Str 7, Int 4, End 2 | Raw Power 7, Brain Power 3 | |
| 5 | Str 7, Int 6 | Raw Power 7, Brain Power 6, Guts 3 | rank II |
| 10 | Str 8, Int 8 | Raw Power 8, Brain Power 8, Guts 5, Rumination 2 | both doors at the Push (8) |
| 15 | Str 9, Int 9 | Raw Power 9, Brain Power 9, Rumination 5, Pain Threshold 2 | |
| 16 | Str 10 | Raw Power 10 | the first door Mastered |
| 20 | Str 10, Int 10, End 3 | Brain Power 10 (level 18), Guts 5, Rumination 5 | **both doors at 10 by level 18**; five Skill points left to spend wide |

**The wide character** (five doors at about five: Raw Power, Dexterity, Brain Power, Will Power, Faith):

| Level | Attributes | Skills | What is capped |
| --- | --- | --- | --- |
| 1 | Str 5, Agi 5, Int 3 | Raw Power 4, Dexterity 4, Brain Power 2 | |
| 5 | + Det 2, Vir 2 | Raw Power 5, Brain Power 3, Will Power 2, Faith 2 | rank II (Strength or Agility 5) |
| 10 | Int 5, Det 3 | Dexterity 5, Brain Power 5, Will Power 3, Guts 3 | |
| 15 | Det 5 | Will Power 5, Athletics 3, Rumination 3 | |
| 20 | Str 5, Agi 5, Int 5, Det 5, Vir 5 | + Faith 5, Composure 3, Conscience 3 | **nothing at 10, ever**: five doors at Reach 4 (the 4-point step) and a Mastery 2 each |

What this shows: **the Attribute points are the wide character's limit** (20 in a career over five attributes), not
the Skill points. That is the charter's "a mixed character cashes out more often and weaker" in points: it never
reaches a door's 7 or 10, so its Reach stays at the 4-point step and its gains come from Crossings, five sets of
bars and the most cash-outs a turn. The plans need no change to the points a level; they are a reading.

## 4. Every practice track: per worthy fight and per hour

Reference rate (map 1, solo, the reference walk): **3.2 fights an hour, 5.0 fight-equivalents an hour**; it falls to
about 3.4 fight-equivalents an hour by level 20 as fights get longer, so every track below slows a little late (a
step about 20 to 30% further apart at hour 40 than at hour 3). Every amount earned in a fight is x its worth.

| Track | Earned by (data key) | Per worthy fight, today | PROPOSED (PROVISIONAL) | Per hour | When |
| --- | --- | --- | --- | --- | --- |
| **Weapon drill** | a kill, to every weapon that hit the victim; none on the field (`techniques.json:99-118` `rules.drill`; `physical/rules.ts:84-91`) | `per_kill` vermin 1 / minion 5 / Soldier 10 / Elite 25 / Boss 50: about 16 a fight, 35 an Elite, 70 the Boss; x3 for Bulwark, Breaker, Skirmisher (`martial_mult`) | **`per_kill` 20 / 35 / 70 / 180 / 360** (a fight about 125, an Elite 250, the Boss 500); **`martial_mult` 1.5**; marks unchanged **300 / 900 / 1800** | about 690 with the rests' and training's drill (`survival.json:423` `train.drill` 200, `:430` `training.drill` 400, unchanged) | **Mark III in 2.6 hours** for anyone using the weapon every fight, **1.8 hours** for a martial class (today 21 and 7). Mark I inside the first half hour. *So the weapon you pick at the camp gives its signature in the first map and its second pick before the gate* |
| **Sigil words** | an Evoke: 1, +1 a glyph past the second, +1 if it hit (`sigils.json:209-231` `study`) | about 3 Evokes a fight = 9 study; a word at 6, then every 8: **a word every 17 minutes, held only by the words-known cap** (`sigils.json:193` `known_max` "4 + brain_power", typed again in `character.ts:890`) | **`first` 10, `step` 60, `copy` 10, `mastery_study` 30**; `survival.json` `train.study` 5 to **30**, `training.study` 10 to **60** | about 38 study | **a word every 1.6 hours; 33 of 40 by hour 48** (2 at creation). The words-known cap must not stop it: at Brain Power 10 it must reach at least 32 (the Sigil door's Reach; recommended **4 + 3 x Brain Power**: 7 at 1, 16 at 4, 34 at 10). *So a word is an event you look forward to, and Brain Power is how many you can hold, not how fast you learn* |
| Word mastery | every Evoke adds a use to each known word in it (`sigils.json` `word_mastery`) | Practised 10 uses, Mastered 30 | unchanged | a word in half the Evokes: about 5 uses an hour | Practised in about 2 hours, Mastered in about 6 |
| **Found spells** | the first time a Line (or an Outburst design) you never cast lands on a worthy foe (Law 3; not built) | none | a found spell is written in the book and gives **10 study (or 10 practice)** | most fights early, then about one an hour | from hour 5 (five or six words); the book never closes |
| **Outburst modules** | a Release: 1, +1 a stage past 1, +1 a feeling poured (`soul_modules.json:1327-1349` `practice`) | about 2 Releases a fight = 8 practice; a module at 5, 15, then every 15: **one every 36 minutes** | **`thresholds` [10], `then_every` 80, `mastery_bonus` 40**; `survival.json` `train.practice` 8 to **40**, `training.practice` 15 to **80** | about 38 practice | **a module every 2.1 hours; 23 of the 28 unlocked modules by hour 45** (the 10 `locked` rows are shelved). Learned is not slotted: `moduleSlots` (Will Power, `character.ts:907`) is the Reach |
| **Feelings** | happening to you (`feelings.json`, 25 rows; `start_count` 2) | unlocked the first time (`magic.ts:1154`) | **a feeling unlocks at Mark I of its own bar**: each time its trigger happens in a worthy fight adds 1; each row's `marks` [I unlocked, II its step grows, III it can be chosen] by how common its trigger is: **[2, 6, 12] for a common trigger, [1, 3, 6] for a rare one** | about one new feeling every 2.5 hours | **20 of 25 by hour 45** (Law 3's three steps; the trigger counts are measured by the simulator and each row's marks set from them, a reading, not a fit) |
| **Figment forms** | being held through a worthy fight (Law 3; not built). Forms known stay by Visualization points (`figments.json:41-47` `forms_known`, the door's Reach) | none | **`form_marks` [3, 7, 13]** fights held (I hardier, II a second order a turn, III a trait slot) | 3.2 fights | a form you keep up: Mark I in about 1 hour, II in 2.2, III in 4.1. *A Figment you rely on becomes yours like a drilled weapon* |
| **A door's Marks** | units of the door's counter spent in cash-outs on worthy foes (chain steps, glyphs Evoked, stages Released, plates spent, pips broken; Law 3) | none | each door row's `marks` = **[2, 11, 17, 23] hours x that door's units an hour for a specialist** (the simulator reads the units; the door drafters name the unit) | by door | **specialist: I at hour 2, II at 11 (the Push already open at 8 points), the middle at 17, III at 23.** A two-door character at 60/40 reaches them at about x1.7 and x2.5 the hours (III at about 39 and, for the second door, past 50: the middle at about 37); a wide one at about x2 (III at 46) |
| **Devotion** | liked tags (1 each), vows +3, rites +4 (campaigns), the shrine's rite 10 and the rest's 4 in a run (`patrons.json:17-56`; `survival.json:423`, `:435`) | at most 2 tag XP a fight, 2 a scene, **6 a session in all** (`patrons.json:48-52`); a Survival run is one session (`game.ts:1404` `beginSession`, `effects/uses.ts:52`), so tags give at most 6 in a whole run (not verified in play) | **`tag_caps.fight` 3; a new `tag_caps.stage` 30 read in a run in place of the session's 6** (campaigns keep 6); **`xp.curve` [0, 10, 25, 42, 68, 100, 140, 185, 225, 260, 300]** (today [0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450]) | about 8.5 (2.2 tags a fight, the rests and shrines) | **Devotion 3 at hour 5.0, 5 at 11.8, 7 at 21.9, 10 at 35.5.** Today's curve at this rate would reach 10 at hour 53. *So the Miracle (Faith 7 and Devotion 10) arrives with the advanced class's capstone, and spending it (-5 levels) costs about 13 hours of faith* |

**Who the 80% is for.** A capped character "has gained about 80% of all the techniques, words and Outburst modifiers
there are" (round 1 item 3). Words and modules need a door (an Evoker, an Emanator), so this file reads the 80% as:
**in every system the character's doors open, about 80% by the end of the peak**, and the known-caps (words known,
forms known, module slots) never stop a specialist before it. Techniques belong to everyone: 66 rows, 34 melee and 32
ranged (`techniques.json`), 2 + 2 at the start; a weapon at Mark III gives about three (its signature and two picks,
`physical/data.ts:122-137`), so **about 17 weapons drilled is 80%**, which the specialist reaches at hour 42 and the
two-door character at about hour 50 (section 6). This is question 1.

## 5. The credit economy by hour

### Facts

- **Income:** c(d) = 80 + 20 x d a character, Elite and vault guard x1.5, Boss x2, cache x1.5, chest x2, x(1 + 0.35 x
  (stage - 1)) (`survival.json:127` `credits`, `:55` `stage.credits`; `rewards.ts:68-69` `nodeCredits`). The
  reference walk: **about 3,300 credits a stage-1 map, 7,900 at stage 5, 13,700 at stage 10** (1,100 an hour rising to
  3,300).
- **The grade step:** to Fine 1,500 and Masterwork 3,500, x0.8 at a Forge; Relic 6,500 at a Forge only, from stage 3
  (`survival.json:189` `grade_up`; `run/progress.ts:125` `gradePrice`). Every step and every roll is capped by the
  stage's ceiling ["fine", "masterwork", "relic"] (`survival.json:147`; `rewards.ts:156` `stageCeiling`;
  `progress.ts:144-145`, which also reads `relic_from_stage`: two gates for one rule).
- **Buying a graded piece** is its price x the grade's `price` (Fine 3, Masterwork 8, Relic 25, Celestial 50;
  `rules.json:1601-1661` `rarity`; `credits.ts:51` `priceOf`). **Two prices for "a Fine X"**: buy it at 3 x base, or
  buy it plain and pay a flat 1,500 (question 4).
- **Mods:** 19 priced rows, 80 to 900, median 400 (`items.json`); fitted only at a Forge for 20% of the mod's price, at
  least 25 (`survival.json` `forge.fit`). **Armour:** classes 1 to 4 fitted at 100 / 250 / 600 / 1,200
  (`survival.json` `armour_fit`); graded at the Forge by the same step.
- **The vault** gives a pick of three at one grade above the stage's ceiling, at most Relic
  (`survival.json:580`; `rewards.ts:81` `vaultGrade`): a Masterwork in stage 1, **a Relic from stage 2** (about hour 4).
- **Celestial** is `sold: false` and is never a ceiling (`rules.json` `rarity.celestial`; `tools/validate.py:2792`), so
  the 5% Celestial in the Boss's row (`survival.json` `rewards.rarity.boss`) is always capped to Relic or below:
  **no character ever finds a Celestial piece today.**

### PROPOSED (PROVISIONAL)

| Key | Today | PROPOSED | Reason a player sees |
| --- | --- | --- | --- |
| `survival.json:147` `rewards.ceiling` (by stage, the last repeats) | fine, masterwork, relic | **fine; masterwork x4 (stages 2 to 5); relic x4 (6 to 9); celestial (10 on)** | each tier opens a grade: Masterwork in tier II, Relic after the final Boss, Celestial in the deep endless |
| `survival.json:580` `vault.grade_up` 1, `grade_max` relic | one grade above this stage's ceiling | **the next stage's ceiling** (`vault.ahead` 1), `grade_max` **celestial** | the dead-end chest is a taste of the next tier, never two tiers early: Masterwork in map 1, a Relic in map 5 (hour 15), a Celestial in endless map 4 (hour 29) |
| `survival.json` `rewards.rarity.boss` | masterwork 70, relic 25, celestial 5 | **masterwork 40, relic 35, celestial 25** | from stage 10 a Boss pick is Celestial one time in four; before, the ceiling turns it into the best grade the stage allows (as today) |
| `survival.json:189` `grade_up.price.relic` | 6,500 | **12,000** | a Relic is the purchase of a stage's saving after the final Boss, not of map 3 |
| `grade_up.relic_from_stage` | 3 | **removed** (the ceiling is the one gate) | one copy of the rule |
| `grade_up.price.fine`, `.masterwork`, places | 1,500, 3,500, shop 1 / Forge 0.8 | unchanged | |
| `credits`, `stage.credits`, mod and armour prices, `forge.fit` | as above | unchanged | the income already climbs with the stage; the prices that needed to move are the Relic step and the gates |
| `validate.py:2792` (no Celestial vault) and its Celestial-never-a-ceiling check | | allow Celestial as the last ceiling and the vault's top | |

**The gear calendar** (a character saving half its income for gear, the rest on rounds, cores, stims and repair;
ASSUMED; `pacing.py` section 5):

| Bought or found | Hour | Stage | Target (charter section 14) |
| --- | --- | --- | --- |
| Fine (Forge) | 2.3 | 1 | about 3 |
| Medium armour | 2.7 | 1 | |
| Masterwork (Forge) | 6.6 | 3 | about 8 |
| first and second mods, fitted; Heavy armour | 7.2 to 8.3 | 3 | mods matter from about 8 (round 4 item 2) |
| then a mod about every 1.5 hours | 9.5 to 50 | | every 1.5 hours to 40; past 40 the Celestial piece's slots |
| Relic (Forge) | 19.0 | 6 | about 20 |
| Relic step on armour | 21.2 | 7 | |
| Celestial (found: the stage-9 vault) | about 29 | 9 | about 33 |
| Celestial (a Boss pick, one in four, from stage 10) | 31 to 35 and on | 10 | |

## 6. The calendar, hours 0 to 50

`python tools/balance/pacing.py calendar` prints it in full; this is a reading of it. Three characters: the
specialist (a Breaker, one door, a melee weapon, drilling two weapons a fight), the two-door character (a Breaker
with Sigils), the wide character (five doors; Sigils and Outbursts among them). L = a level; w3 MII = the third
weapon's Mark II; door / door2 = the first and second door's Marks; Dev = Devotion standing; boon = a Boss's boon.

| Hour | Specialist | Two doors | Wide |
| --- | --- | --- | --- |
| 0 | L2, w1 MI | L2, w1 MI, word 3 | L2, w1 MI, word 3 |
| 1 | L3 (class), w1 MII, Dev 1 | L3, w1 MII, Dev 1 | L3, Dev 1 |
| 2 | L4, w1 MIII, w2 MI, door I, Fine, Medium armour, boon, Dev 2 | L4, word 4, Fine, armour, boon, Dev 2 | L4, w1 MII, module 2, Fine, armour, boon, Dev 2 |
| 3 | L5 (gate: ceiling 8, rank II), w2 MII | L5, w1 MIII, door I, word 5 | L5, word 4, feeling 3 |
| 4 | w2 MIII, Dev 3 | w2 MI, Dev 3 | door I, door2 I, Dev 3 |
| 5 | w3 MI | w2 MII, door2 I, word 6, found spell | w1 MIII, word 5, found spell, module 3 |
| 6 | L6, w3 MII, Masterwork, boon | L6, word 7, found spell, Masterwork, boon | L6, w2 MI, found spell, feeling 4, Masterwork, boon |
| 7 | w3 MIII, w4 MI, mods, Heavy armour | w2 MIII, w3 MI, found spell, mods, armour | w2 MII, found spell, mods, armour |
| 8 | L7, w4 MII, mod, Dev 4 | L7, word 8, found spell, mod, Dev 4 | L7, word 6, found spell, module 4, mod, Dev 4 |
| 9 | w4 MIII, mod, boon | w3 MII, found spell, mod, boon | found spell, feeling 5, mod, boon |
| 10 | w5 MI | word 9, found spell | w2 MIII, word 7, found spell |
| 11 | L8, w5 MII, door II, mod, Dev 5 | L8, w3 MIII, w4 MI, word 10, found spell, mod, Dev 5 | L8, w3 MI, found spell, module 5, mod, Dev 5 |
| 12 | w5 MIII, w6 MI, mod, boon | w4 MII, found spell, mod, boon | w3 MII, found spell, feeling 6, mod, boon |
| 13 | L9, w6 MII | L9, word 11, found spell | L9, word 8, found spell |
| 14 | w6 MIII, mod | w4 MIII, word 12, found spell, mod | found spell, module 6, mod |
| 15 | L10 (gate, final Boss), w7 MI, mod, boon | L10, w5 MI, found spell, mod, boon | L10, w3 MIII, found spell, feeling 7, mod, boon |
| 16 | w7 MII, Dev 6 | w5 MII, word 13, found spell, Dev 6 | w4 MI, word 9, found spell, Dev 6 |
| 17 | w7 MIII, w8 MI, door middle, mod | found spell, mod | found spell, module 7, mod |
| 18 | L11, w8 MII, mod | L11, w5 MIII, door II, word 14, found spell, mod | L11, w4 MII, word 10, found spell, feeling 8, mod |
| 19 | w8 MIII, Relic, boon | word 15, w6 MI, found spell, Relic, boon | found spell, Relic, boon |
| 20 | L12, w9 MI, mod | L12, w6 MII, found spell, mod | L12, w4 MIII, found spell, module 8, mod |
| 21 | w9 MII, Relic armour, mod, Dev 7 | word 16, Relic armour, mod, Dev 7 | w5 MI, word 11, feeling 9, Relic armour, mod, Dev 7 |
| 22 | w9 MIII, w10 MI | w6 MIII, w7 MI, word 17, found spell | door II, found spell |
| 23 | L13, w10 MII, door III, mod, boon | L13, w7 MII, mod, boon | L13, w5 MII, word 12, module 9, mod, boon |
| 24 | w10 MIII, mod | word 18, found spell, mod | door2 II, found spell, feeling 10, mod |
| 25 | L14, w11 MI | L14, w7 MIII | L14, w5 MIII |
| 26 | w11 MII, mod, Dev 8 | w8 MI, word 19, found spell, mod, Dev 8 | w6 MI, word 13, found spell, module 10, mod, Dev 8 |
| 27 | L15 (gate: ceiling 10, rank III), w11 MIII, w12 MI, mod, boon | L15, w8 MII, door2 II, word 20, mod, boon | L15, feeling 11, mod, boon |
| 28 | w12 MII | door middle, found spell | w6 MII, found spell |
| 29 | w12 MIII, mod, Celestial (vault) | w8 MIII, word 21, mod, Celestial (vault) | word 14, module 11, mod, Celestial (vault) |
| 30 | L16, w13 MI, mod, boon, Dev 9 | L16, w9 MI, word 22, found spell, mod, boon, Dev 9 | L16, found spell, feeling 12, mod, boon, Dev 9 |
| 31 | w13 MII | w9 MII | w6 MIII, w7 MI, word 15 |
| 32 | L17, w13 MIII, w14 MI, mod | L17, word 23, found spell, mod | L17, w6 MI, word 14, found spell, module 12, mod |
| 33 | w14 MII, mod | w9 MIII, w10 MI, mod | w7 MII, feeling 13, mod |
| 34 | w14 MIII | word 24, found spell | door middle, word 16, found spell |
| 35 | L18, w15 MI, mod, Celestial (Boss), boon, Dev 10 | L18, w10 MII, word 25, mod, Celestial (Boss), boon, Dev 10 | L18, module 13, mod, Celestial (Boss), boon, Dev 10 |
| 36 | w15 MII, mod | w10 MIII, found spell, mod | w7 MIII, word 17, found spell, feeling 14, mod |
| 37 | L19, w15 MIII, w16 MI | L19, w11 MI, word 26 | L19, w8 MI, door2 middle |
| 38 | w16 MII, mod | w11 MII, word 27, found spell, mod | w8 MII, found spell, module 14, mod |
| 39 | L20 (the cap), w16 MIII, mod, boon | L20, door III, mod, boon | L20, word 18, feeling 15, mod, boon |
| 40 | w17 MI | w11 MIII, word 28, found spell | found spell |
| 41 | w17 MII, mod | w12 MI, mod | w8 MIII, module 15, mod |
| 42 | w17 MIII, w18 MI, mod | w12 MII, door2 middle, word 29, found spell, mod | word 19, found spell, feeling 16, mod |
| 43 | w18 MII, boon | word 30, boon | boon |
| 44 | w18 MIII, mod | w12 MIII, w13 MI, found spell, mod | word 20, found spell, module 16, mod |
| 45 | w19 MI, mod | word 31, mod | feeling 17, mod |
| 46 | w19 MII | w13 MII, word 32, found spell | door III, found spell |
| 47 | w19 MIII, w20 MI, mod | w13 MIII, mod | word 21, module 17, mod |
| 48 | w20 MII, mod, boon | w14 MI, word 33, found spell, mod, boon | found spell, feeling 18, mod, boon |
| 49 | w20 MIII | w14 MII | word 22, module 18 |

(Levels are listed in the hour they land: level 5 at hour 4.0 shows in hour 3's row, the gate at 16.0 in hour 15's.)

**Hours in which a character gained nothing, and the fixes.** Before the fixes (`PACING_NOFIX=1`): the specialist
gains nothing in hours **45, 46, 47 and 49**, the two-door character in **41, 47 and 49**; the wide character never.
All are at the peak, and all for one reason: the specialist's last door Mark is at hour 23 and Devotion 10 at 35, so
after level 20 only the weapon bars and the gear remain, and the gear calendar stopped mods at hour 40.

1. **The collection runs past 80%.** 80% of the techniques (about 17 weapons drilled) lands at about hour 42 for the
   specialist; the last fifth of the rows (to about 21 weapons) is what the peak hours are for. No number changes:
   the drill rate above already gives a mark about every 50 minutes on the weapon you are drilling.
2. **Mods do not stop at 40:** past hour 40 a Celestial piece's slots and properties (the grade drafter's two
   properties) are what the Forge and the Boss picks fill, one about every 1.5 hours.

With both, **no hour from 0 to 49 is empty for any of the three.** Where the rows are thin: the specialist from hour
24 on lives on weapon bars, levels and gear (no new door Mark after 23); that is what being a one-door specialist
plays like, and its Reach is the reward. Two items for other drafters, read from this calendar: **the boon cap**
(`survival.json:219` `boon_cap.cap` 50, a worth line) is full after about ten boons of worth 5, which is endless map 5
(hour 35): from then a Boss's boon is a worth-0 utility, a reward taken by a cap (the Survival drafter's); and a
two-door character's second door reaches only its middle Mark by hour 42 (by design of Law 3; the Crossings that
would count on both bars are not in 0.34).

## 7. Questions for the lead

1. **What does "80% of all the techniques, words and Outburst modifiers" count?** Recommended: in each system the
   character's doors open (words need an Evoker, modules an Emanator), so the known-caps must let a specialist at 10
   reach 80% (words known at least 32 at Brain Power 10: recommended 4 + 3 x Brain Power, the Sigil door drafter's
   Reach), and techniques (anyone's) count of all 66.
2. **Who is "Mark III in about 2.5 hours" for?** Recommended: for anyone who uses the weapon every fight (2.6 hours),
   with `martial_mult` cut from 3 to 1.5 (1.8 hours for a Bulwark, Breaker or Skirmisher). At x3 on the new rates a
   martial class would finish a weapon in under an hour, a third of a map.
3. **Co-op pace.** Every character takes the node's full XP (`rewards.ts:66`), but a four-player round is about three
   times as long as a solo one, so a quad squad reaches level 20 in about three times the hours. Recommended: a
   `survival.json xp.party_pace` row by party size (1, 1.6, 2.2, 2.8, PROVISIONAL) multiplying XP and every practice
   gain, read once the first co-op playtest gives the real minutes a round.
4. **The grade step as one price.** Recommended: the step costs **max(the step's floor, priceOf(item, to) -
   priceOf(item, from)) x the place's factor**, with today's `grade_up.price` as the floors (1,500 / 3,500 / 12,000).
   For the median weapon (750) the difference is 1,500 / 3,750 / 12,750, so nothing moves for a typical gun; a
   4,500 heavy weapon's Relic step becomes 76,500 against a flat 12,000. One formula, no second price for "a Fine X".
5. **Celestial as a find:** from the vault (the next stage's ceiling, so stage 9's at about hour 29) and one Boss pick
   in four from stage 10, never sold. Recommended: yes; today no character can ever see a Celestial piece.

## 8. Tables

### Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| XP table | `rules.json:252` `character.levels.xp_total`; read by `character.ts:1282` `xpForLevel` and `data.ts:125` | the 20 values (section 2) |
| A fight's XP by its level | new column `rules.json character.levels.fight_xp` (data, like `output.level.deal`); `run/rewards.ts:65-66` `nodeXp` | `nodeXp` reads the column at the fight's level in place of `xp.base` x `stage.xp`; retire `survival.json` `xp.base` and `stage.xp` |
| The node kinds' XP weights | `survival.json:126` `xp` elite / boss / cache / vault_guard / vault | unchanged |
| Worth by level gap | `combat.ts:732` `levelGap` (the gap); `effects/hooks.ts:37` `growthHeld` (the existing yes/no on growth) | new `enemies.json levels.gap.worth`; primitive P1 |
| Campaign XP | `rules.json:282` `xp_sources`; `game.ts:1580` (the Narrator's XP op); `combat.ts:3490` `combatXp` | values become multiples of the column; delete `data.ts:129-132` `XP_SOURCES` / `COMBAT_XP` and `combat.ts:3490`'s `|| 50` (typed copies) |
| Campaign tiers | `rules.json:274` `pacing_target` | replace with the four tiers (data) |
| Ceilings on fives | `rules.json:194` `cap_by_level`; `character.ts:1321-1322` `attrCapAt` | values; delete the fallback at `:1321` |
| Class ranks at 3, 5, 15 | `classes.json:17` `rank_levels`; `character.ts:1361-1363` `RANK_AT`, `RANK_LEVEL` | values and `rank_rule` text; delete the fallbacks |
| Advanced gates at 10 | `classes.json:29`, `:35` `level_min` | 7 to 10 |
| Weapon drill rate | `techniques.json:99-118` `rules.drill.per_kill`, `martial_mult`, `marks`; `physical/rules.ts:84-91`; `physical/data.ts:139-147` `drillMult`, `addDrill` | `per_kill`, `martial_mult`; the kill site multiplies by P1 |
| Rest and training amounts | `survival.json:423` `train`, `:430` `training`; `run/progress.ts:291` | `study` and `practice` values |
| Sigil study rate | `sigils.json:209-231` `study`; `sigilgrowth.ts:40-45` `addStudy`, `:48` `noteEvoke` | `first`, `step`, `copy`, `mastery_study`; `noteEvoke` x P1 |
| Words known | `sigils.json:193` `known_max` (text); `character.ts:890` `wordsKnownCap` (typed `4 +`) | the Sigil door drafter's number as a number block read by the sheet resolver (as `figments.json forms_known.count`) |
| Outburst practice | `soul_modules.json:1327-1349` `practice`; `magic.ts:1728` `addPractice` | `thresholds`, `then_every`, `mastery_bonus`; the Release site x P1 |
| Feelings by Marks | `feelings.json` rows; `magic.ts:1154` (felt list `m.feelings`) | each row's `marks`; the trigger site adds to the feeling's bar (P2) |
| Figment form Marks | `figments.json` `forms`, `forms_known` | new `form_marks`; P2 |
| Door Marks | the door rows the door drafters write | `marks` per door; P2 |
| Found spells | a first-time list, the shape of the felt list (`magic.ts` `m.feelings`) | P4 (the magic drafters') |
| Devotion | `patrons.json:17` `devotion.xp.curve`, `:48` `tag_caps`; `faith.ts:95` `TAG_CAPS`, `:506-510` `tallyOf` | curve and `tag_caps.fight`; `tag_caps.stage` (P3) |
| Credits income | `survival.json:127` `credits`, `:55` `stage.credits`; `rewards.ts:68-69` | unchanged |
| Grade ceilings by stage | `survival.json:147` `rewards.ceiling`; `rewards.ts:156` `stageCeiling`; `progress.ts:144-145` | ten entries; remove `relic_from_stage` from the gate |
| The vault's grade | `survival.json:580` `vault`; `rewards.ts:81` `vaultGrade` | `ahead` 1 in place of `grade_up`; `grade_max` celestial; `validate.py:2792` |
| The Boss's rarity row | `survival.json` `rewards.rarity.boss` | 40 / 35 / 25 |
| Relic step | `survival.json:189` `grade_up.price.relic`; `progress.ts:125` `gradePrice` | 12,000 (and question 4) |
| The calendar's arithmetic | `tools/balance/pacing.py` (new, read-only) | none: it reads data |

### Needs a new primitive

| # | Piece (smallest form) | Why nothing existing does it |
| --- | --- | --- |
| P1 | **The worth of a gain:** `growthWorth(cb, c, foe?)`, beside `growthHeld` in `effects/hooks.ts`, reading `enemies.json levels.gap.worth` by `levelGap`; 0 on the field and in a dry run (so `growthHeld` becomes its `== 0` case), 1 out of a fight. Read by every growth site in a fight: `nodeXp`, the drill kill site, `noteEvoke`, the Release's practice, P2's sites, the Devotion tag tally | `growthHeld` is yes/no; `levelGap` feeds only to-hit and the one-hit rule. No piece scales a gain by the gap |
| P2 | **Marks made general:** the drill bar's piece (`physical/data.ts:121-147` `drillMark`, `drillMarks`, `addDrill`) as `addMarks(c, track, id, n)` and `marksOf(c, track, id)`, thresholds from the track's row (`techniques.json drill.marks`, `feelings.json` row `marks`, `figments.json form_marks`, a door row's `marks`); weapon drill becomes its first track with no change in play | the drill bar is the only bar and is keyed to weapons; feelings unlock on a first-time list with no count. Likely asked for by the door drafters too: one piece for all, consolidated by the lead |
| P3 | **A per-stage scope for the faith tally in a run:** `tallyOf` (`faith.ts:506`) keys the session part by the run's stage when a run is on, with its own cap `tag_caps.stage` | the tally knows fight, scene and session only; a run is one session, so the 6-a-session cap holds Devotion for a whole run. The shrine's `tokens_per_stage` (`run/progress.ts:48`) counts per stage, but for tokens, not the tally: reuse its stage key, not its counter |
| P4 | **A found-spell book** (shared; the Sigil and Outburst drafters own it if their files ask for it): a first-time list of Line or design signatures on the character, the shape of the felt list | nothing records which spells a character has cast |

### What re-records

| What | Why |
| --- | --- |
| `packages/engine/test/level-gains.test.ts`, `legendary-deed.test.ts`, `skeleton-strength-checks.test.ts` | ceilings move to 5 / 10 / 15 (a deed's +1 over the ceiling reads it) |
| `packages/engine/test/balance/builds.ts` and the golden builds `test/golden/builds-allin.json`, `builds-normal.json` (and every golden table built on them) | the reference builds are legal at each level by the ceiling: an all-in build at level 3 or 6 holds a different attribute, so its damage rows move |
| `sigil-word-cap.test.ts` | the words-known cap (if question 1 is taken) |
| `survival-progress.test.ts`, `survival-stage.test.ts`, `survival-run.test.ts`, `survival-run-levels.test.ts` (the levels guard), `survival-vault.test.ts`, `survival-loot.test.ts`, `survival-materials.test.ts`, `survival-field*.test.ts`, `survival-map.test.ts` | node XP, the stage's XP, the grade ceiling by stage, the vault's grade, the Relic step, and the worth on gains |
| `packages/engine/test/balance/survival-run.ts`, `party-fit.ts` runs (`docs/design/handoffs/0.34-MEASURES.md` seeds) | characters level at a different pace, so every seeded run takes other levels and grades: a new baseline column, not a regression |
| `text-number-truth.test.ts` and the `{=placeholder}` texts | `rank_rule`, `caps`, `known_max`, the study and practice texts quote the moved numbers |
| Class-rank and faith tests (rank at 6 and 12; `tag_caps`, the Devotion curve) | rank levels, the curve, the stage tally |
| Web: `apps/web/src/screens/levelup.js`, `game/classView.ts`, `game/runView.ts`, `narrator/context.ts` | they show the next ceiling, the rank's level, the XP bar and the XP sources told to the AI Narrator |
| The two-browser e2e that levels a character in Survival | XP to level 2 and 3 moves (120 and 330 in place of 100 and 250) |
| Spec `docs/rules/PHC-Core-Rules-v1.0.md` | a rules revision: the XP table, the gates on fives, the worth table, the practice rates, the grade gates; and section 14's provisional list |
