# The damage step, guns: the guns' ceiling (rules 1.18)

11 Nov 2026. For Leon and whoever picks the balance pass up next. The rules are in `docs/rules/PHC-Core-Rules-v1.0.md`
("Rules revision 1.18", section 14 items 1069 to 1088); this is what was measured, what changed and why, what is not met,
and what only Leon can settle. **Nothing here is committed by this session; nothing was built, deployed or run in a
browser.**

## 1. What was asked, and where it stands

| Target (Leon, 11 Nov 2026) | Before | Now (the simulator) | Met? |
|---|---|---|---|
| An optimised gun deals a bit under 150% of the plain rifle (aim 135 to 148% from level 6) | 204 / 212 / 217 / 213 / 212 / 221% at levels 1, 3, 6, 9, 12, 20 (four different guns were over 190%) | **145 / 146 / 146 / 143 / 146 / 144%** (the best gun played the best way) | Yes, at every level |
| A gun whose price is its ammunition may reach 150% | the .700 Blackpoint 179 to 196% | **131 to 143%** | Yes for the Blackpoint. The breacher tube is at 25% on one target (its blast is not measured) |
| Guns end below a full Sigil Line (150 to 200%) and level with the biggest Outburst (150%) | above both | 143 to 146% | Yes |
| The plain rifle does not move | 71.6 / 79.1 / 90.5 / 101.4 / 110.6 / 117.7 damage a turn | the same numbers | Yes: nothing it uses changed |
| The enemy table of rules 1.15 does not move | – | what a Soldier, an Elite and a Boss deal is the same to the last point at all six levels | Yes for what enemies deal, by keeping the enemy's Burst as it was fitted (5.1; your call). **Fights are longer** because the squad's gun deals a third less (5.2) |
| A technique beats the plain Shot for its AP by 10 to 25% when its condition is met | the Burst of an automatic gun +85%, Mag Dump +77% | a Burst +13% at 65% to hit, +15% at 75%, +4% at 45%; Mag Dump +4% at 65%, +10% at 75% (and the magazine is gone) | Yes for the Burst in the open; under 10% against a target in cover |
| A Burst deals more than the Shot for its AP and is worse to hit | three rolls at 0, −1, −2 | two rolls, the second at −4 | Yes |
| Melee: measure it | – | the optimised blade 112 to 126% (109 to 142% holding its Finisher) | Under 150%: not touched |

The yardstick everywhere: the plain rifle (service rifle, standard, plain shots, a normal share, no perks) at the same
level on the simulator's shooting range, 8 turns.

## 2. How it is measured (and what a good player still does better)

`packages/engine/test/balance/guns-measure.ts` and `guns-measure.test.ts` (new). One row is one **gun** in the hands of
the step-1 report's optimised gun build (Marksman from level 3, a normal share or all in, its perks, drill marks by
level, a **Masterwork** weapon), played **four ways** for 8 turns on the range; 24 fights a cell. A gun's number is the
best of the four.

```
GUNS_MEASURE=1 npx vitest run --root packages/engine test/balance/guns-measure.test.ts --silent=false
    GUNS_MEASURE_N=24  GUNS_MEASURE_LEVELS=6,12  GUNS_MEASURE_VARIANTS=normal  GUNS_MEASURE_WEAPONS=all
    GUNS_MEASURE_DUAL=frontier_hand_cannon  GUNS_MEASURE_OUT=<folder>  GUNS_MEASURE_TAG=after
GUNS_MEASURE_FOES=1 npx vitest run --root packages/engine test/balance/guns-measure.test.ts --silent=false     (what enemies deal)
```

The four ways (the letter in every table):

- **P** plain shots only.
- **O** the simulator's optimised policy, as the step-1 report ran it: the best expected damage for its AP among the
  plain shot and the ready techniques, one action ahead.
- **G** "the gunner" (new, `policies.ts`): O, plus Brace and Bead once, the paired shot and paired techniques with a
  gun in each hand, a spare AP to Vent; it leaves Mag Dump out.
- **D** the gunner with Mag Dump.

**Why the step-1 report's 170 to 224% was half the picture.** Its optimised gun held a long rifle and fired nothing
but plain Shots: no technique beat a 50-damage Shot for 2 AP. The same build with a service rifle and Bursts measured
the same 200%, and so did the bullpup; the Blackpoint, the machine gun (braced), the battle rifle and the marksman
rifle were at 165 to 195%. Lowering the long rifle alone would have moved the ceiling to the next gun.

**What a good player would still do better.** Fire from cover and move between shots (Quick guns lose nothing by it);
hold a shot (Overwatch, Killzone); split a Burst between two targets; Rake and blasts on a group (the range has one
target); special rounds (not measured: question 7); Echo rerolls. **The gun is never shot at** on the range.

## 3. Before and after

Each cell: **the best of the four ways** and its letter · (plain shots only). Plain rifle, damage a turn: L1 71.6 ·
L3 79.1 · L6 90.5 · L9 101.4 · L12 110.6 · L20 117.7 (before and after).

### 3.1 Before (the game as it was this morning: commit 55b00ac)

**Normal share, Masterwork.**

| Gun | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Hellraiser service rifle | **184%** D · (129%) | **206%** O · (127%) | **208%** G · (123%) | **208%** O · (133%) | **210%** D · (125%) | **203%** D · (124%) |
| Long rifle | **204%** G · (196%) | **212%** D · (194%) | **217%** G · (207%) | **213%** D · (202%) | **212%** D · (194%) | **221%** G · (200%) |
| Legion bullpup | **170%** O · (110%) | **180%** O · (121%) | **202%** G · (121%) | **187%** O · (113%) | **193%** O · (126%) | **188%** D · (116%) |
| Adamantile battle rifle | **179%** P · (179%) | **176%** P · (176%) | **179%** G · (176%) | **168%** G · (163%) | **172%** P · (172%) | **174%** G · (173%) |
| CCEC marksman rifle | **161%** P · (161%) | **168%** G · (167%) | **164%** P · (164%) | **171%** P · (171%) | **170%** P · (170%) | **172%** G · (158%) |
| Science Team core rifle | **154%** P · (154%) | **148%** G · (142%) | **149%** G · (146%) | **151%** P · (151%) | **161%** G · (159%) | **158%** P · (158%) |
| .700 Blackpoint anti-materiel | **180%** D · (177%) | **179%** D · (174%) | **191%** G · (176%) | **187%** D · (173%) | **196%** G · (194%) | **189%** D · (167%) |
| Lever carbine | **132%** G · (129%) | **127%** P · (127%) | **129%** P · (129%) | **130%** P · (130%) | **131%** G · (130%) | **128%** G · (125%) |
| Frontier hand cannon | **131%** G · (113%) | **129%** O · (126%) | **138%** D · (116%) | **124%** G · (119%) | **131%** G · (111%) | **126%** P · (126%) |
| Hellraiser LMG | **171%** D · (93%) | **182%** G · (90%) | **189%** G · (89%) | **170%** D · (83%) | **172%** D · (89%) | **182%** G · (92%) |
| Crossbow | **144%** G · (77%) | **147%** G · (77%) | **145%** O · (81%) | **150%** G · (76%) | **146%** O · (81%) | **146%** D · (80%) |
| Decrkm SMG (.32 Decrkm) | **66%** D · (49%) | **82%** O · (51%) | **80%** D · (53%) | **82%** D · (49%) | **81%** O · (50%) | **83%** G · (49%) |
| Breacher tube | **29%** D · (25%) | **26%** D · (24%) | **25%** G · (21%) | **27%** P · (27%) | **26%** O · (24%) | **26%** O · (25%) |
| Frontier hand cannon, one in each hand | **131%** D · (110%) | **136%** G · (124%) | **137%** G · (130%) | **146%** D · (120%) | **139%** D · (124%) | **152%** G · (127%) |
| **The ceiling** (the best gun, the best way) | **204%** Long rifle | **212%** Long rifle | **217%** Long rifle | **213%** Long rifle | **212%** Long rifle | **221%** Long rifle |
| Special ammunition (allowed 150%) | **180%** .700 Blackpoint anti-materiel | **179%** .700 Blackpoint anti-materiel | **191%** .700 Blackpoint anti-materiel | **187%** .700 Blackpoint anti-materiel | **196%** .700 Blackpoint anti-materiel | **189%** .700 Blackpoint anti-materiel |

**All in, Masterwork** (against the normal-share rifle; the all-in plain rifle is 167 / 158 / 146 / 131 / 110 / 100% of it).

| Gun | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Hellraiser service rifle | **293%** D · (212%) | **329%** G · (200%) | **311%** D · (191%) | **284%** G · (167%) | **249%** O · (147%) | **214%** D · (125%) |
| Long rifle | **331%** O · (308%) | **320%** P · (320%) | **300%** D · (275%) | **281%** G · (255%) | **242%** G · (229%) | **217%** G · (196%) |
| Legion bullpup | **268%** G · (191%) | **299%** G · (186%) | **284%** G · (181%) | **255%** D · (156%) | **222%** O · (129%) | **198%** O · (119%) |
| Adamantile battle rifle | **288%** P · (288%) | **268%** P · (268%) | **254%** P · (254%) | **229%** G · (225%) | **202%** P · (202%) | **169%** P · (169%) |
| CCEC marksman rifle | **258%** P · (258%) | **261%** G · (259%) | **237%** P · (237%) | **214%** G · (211%) | **184%** P · (184%) | **161%** P · (161%) |
| Science Team core rifle | **240%** G · (229%) | **238%** G · (234%) | **218%** G · (217%) | **195%** P · (195%) | **178%** P · (178%) | **163%** G · (149%) |
| .700 Blackpoint anti-materiel | **290%** P · (290%) | **281%** P · (281%) | **261%** G · (248%) | **244%** D · (229%) | **211%** G · (186%) | **192%** O · (185%) |
| Lever carbine | **213%** G · (199%) | **208%** P · (208%) | **186%** G · (185%) | **177%** P · (177%) | **138%** G · (136%) | **134%** P · (134%) |
| Frontier hand cannon | **212%** O · (208%) | **216%** O · (213%) | **208%** G · (201%) | **168%** D · (165%) | **154%** P · (154%) | **137%** O · (129%) |
| Hellraiser LMG | **268%** G · (149%) | **280%** D · (136%) | **259%** D · (141%) | **238%** D · (118%) | **200%** G · (98%) | **175%** G · (91%) |
| Crossbow | **222%** D · (129%) | **212%** D · (125%) | **197%** D · (121%) | **180%** O · (113%) | **155%** O · (98%) | **149%** O · (76%) |
| Decrkm SMG (.32 Decrkm) | **121%** G · (93%) | **139%** O · (84%) | **129%** G · (78%) | **113%** G · (65%) | **94%** D · (62%) | **79%** D · (47%) |
| Breacher tube | **40%** P · (40%) | **40%** O · (36%) | **36%** D · (33%) | **37%** P · (37%) | **30%** D · (22%) | **22%** G · (21%) |
| Frontier hand cannon, one in each hand | **227%** G · (218%) | **235%** G · (213%) | **226%** G · (211%) | **197%** D · (186%) | **169%** G · (142%) | **147%** D · (129%) |
| **The ceiling** (the best gun, the best way) | **331%** Long rifle | **329%** Hellraiser service rifle | **311%** Hellraiser service rifle | **284%** Hellraiser service rifle | **249%** Hellraiser service rifle | **217%** Long rifle |
| Special ammunition (allowed 150%) | **290%** .700 Blackpoint anti-materiel | **281%** .700 Blackpoint anti-materiel | **261%** .700 Blackpoint anti-materiel | **244%** .700 Blackpoint anti-materiel | **211%** .700 Blackpoint anti-materiel | **192%** .700 Blackpoint anti-materiel |

### 3.2 After (rules 1.18)

**Normal share, Masterwork.**

| Gun | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Hellraiser service rifle | **129%** P · (129%) | **142%** G · (127%) | **140%** G · (123%) | **139%** O · (133%) | **140%** O · (125%) | **141%** D · (124%) |
| Long rifle | **145%** P · (145%) | **134%** O · (132%) | **140%** P · (140%) | **141%** P · (141%) | **138%** P · (138%) | **137%** P · (137%) |
| Legion bullpup | **125%** O · (110%) | **125%** O · (121%) | **141%** O · (121%) | **134%** O · (113%) | **135%** G · (126%) | **134%** D · (116%) |
| Adamantile battle rifle | **142%** P · (142%) | **140%** P · (140%) | **140%** G · (138%) | **143%** O · (129%) | **140%** O · (134%) | **140%** D · (135%) |
| CCEC marksman rifle | **136%** D · (130%) | **136%** G · (135%) | **139%** O · (133%) | **139%** P · (139%) | **146%** O · (138%) | **140%** G · (128%) |
| Science Team core rifle | **139%** P · (139%) | **146%** D · (127%) | **146%** O · (132%) | **138%** D · (136%) | **145%** G · (144%) | **143%** P · (143%) |
| Lever carbine | **132%** G · (129%) | **127%** P · (127%) | **129%** P · (129%) | **130%** P · (130%) | **131%** G · (130%) | **128%** G · (125%) |
| Frontier hand cannon | **123%** G · (106%) | **122%** O · (119%) | **131%** D · (110%) | **117%** G · (112%) | **124%** G · (105%) | **119%** P · (119%) |
| Hellraiser LMG | **125%** D · (93%) | **130%** G · (90%) | **127%** G · (89%) | **122%** D · (83%) | **122%** G · (89%) | **126%** G · (92%) |
| Crossbow | **135%** G · (77%) | **111%** O · (77%) | **113%** G · (81%) | **112%** D · (76%) | **117%** D · (81%) | **114%** D · (80%) |
| Decrkm SMG (.32 Decrkm) | **69%** D · (66%) | **76%** O · (67%) | **75%** D · (69%) | **75%** D · (64%) | **75%** O · (68%) | **76%** G · (65%) |
| .700 Blackpoint anti-materiel | **131%** O · (129%) | **131%** D · (127%) | **140%** G · (128%) | **137%** D · (127%) | **143%** P · (143%) | **139%** D · (123%) |
| Breacher tube | **29%** D · (25%) | **26%** D · (24%) | **25%** G · (21%) | **27%** P · (27%) | **26%** O · (24%) | **26%** O · (25%) |
| Frontier hand cannon, one in each hand | **123%** D · (103%) | **128%** G · (117%) | **130%** G · (123%) | **137%** D · (113%) | **132%** D · (118%) | **144%** G · (120%) |
| **The ceiling** (the best gun, the best way) | **145%** Long rifle | **146%** Science Team core rifle | **146%** Science Team core rifle | **143%** Adamantile battle rifle | **146%** CCEC marksman rifle | **144%** Frontier hand cannon ×2 |
| Special ammunition (allowed 150%) | **131%** .700 Blackpoint anti-materiel | **131%** .700 Blackpoint anti-materiel | **140%** .700 Blackpoint anti-materiel | **137%** .700 Blackpoint anti-materiel | **143%** .700 Blackpoint anti-materiel | **139%** .700 Blackpoint anti-materiel |

**All in, Masterwork** (against the normal-share rifle).

| Gun | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Hellraiser service rifle | **217%** G · (212%) | **223%** O · (200%) | **208%** D · (191%) | **186%** O · (167%) | **175%** O · (147%) | **148%** D · (125%) |
| Long rifle | **222%** O · (208%) | **218%** P · (218%) | **192%** O · (186%) | **177%** P · (177%) | **157%** G · (151%) | **137%** P · (137%) |
| Legion bullpup | **198%** D · (191%) | **208%** O · (186%) | **195%** D · (181%) | **173%** D · (156%) | **159%** O · (129%) | **147%** O · (119%) |
| Adamantile battle rifle | **228%** P · (228%) | **213%** O · (212%) | **200%** P · (200%) | **180%** G · (177%) | **158%** P · (158%) | **134%** O · (133%) |
| CCEC marksman rifle | **215%** O · (210%) | **213%** G · (212%) | **197%** O · (192%) | **175%** G · (172%) | **154%** O · (150%) | **134%** O · (131%) |
| Science Team core rifle | **219%** G · (209%) | **215%** G · (212%) | **196%** P · (196%) | **182%** O · (177%) | **161%** P · (161%) | **147%** G · (135%) |
| Lever carbine | **213%** G · (199%) | **208%** P · (208%) | **186%** G · (185%) | **177%** P · (177%) | **138%** G · (136%) | **134%** P · (134%) |
| Frontier hand cannon | **201%** O · (197%) | **203%** O · (201%) | **197%** G · (190%) | **159%** D · (157%) | **146%** P · (146%) | **130%** O · (122%) |
| Hellraiser LMG | **197%** G · (149%) | **197%** G · (136%) | **189%** D · (141%) | **168%** D · (118%) | **146%** D · (98%) | **135%** G · (91%) |
| Crossbow | **208%** D · (129%) | **197%** D · (125%) | **183%** D · (121%) | **155%** O · (113%) | **143%** O · (98%) | **121%** O · (76%) |
| Decrkm SMG (.32 Decrkm) | **120%** P · (120%) | **122%** O · (109%) | **117%** D · (102%) | **108%** G · (86%) | **88%** G · (83%) | **76%** D · (63%) |
| .700 Blackpoint anti-materiel | **212%** P · (212%) | **206%** P · (206%) | **192%** G · (182%) | **179%** D · (168%) | **155%** G · (137%) | **141%** O · (136%) |
| Breacher tube | **40%** P · (40%) | **40%** O · (36%) | **36%** D · (33%) | **37%** P · (37%) | **30%** D · (22%) | **22%** G · (21%) |
| Frontier hand cannon, one in each hand | **216%** G · (207%) | **222%** G · (201%) | **214%** G · (200%) | **187%** D · (176%) | **160%** G · (135%) | **140%** D · (122%) |
| **The ceiling** (the best gun, the best way) | **228%** Adamantile battle rifle | **223%** Hellraiser service rifle | **214%** Frontier hand cannon ×2 | **187%** Frontier hand cannon ×2 | **175%** Hellraiser service rifle | **148%** Hellraiser service rifle |
| Special ammunition (allowed 150%) | **212%** .700 Blackpoint anti-materiel | **206%** .700 Blackpoint anti-materiel | **192%** .700 Blackpoint anti-materiel | **179%** .700 Blackpoint anti-materiel | **155%** .700 Blackpoint anti-materiel | **141%** .700 Blackpoint anti-materiel |

Reading notes. (a) Fights are seeded, so a cell is about ±4 points at 24 fights; the lever carbine and the breacher
tube are the same before and after to the point because nothing they use changed. (b) At level 1 the build has no
class and two techniques; from level 3 it is a Marksman. (c) The letter names the policy, not what was fired: "D" on a
5-round rifle is the gunner's play. (d) The crossbow at level 1 (135%) is Aimed Shots at 96% to hit; from level 3 the
policy picks Heavy Bolt, which now pays less than the one-action-ahead reading thinks. (e) The "ceiling" rows leave
the special-ammunition guns out; they have their own row.

### 3.3 Every gun, levels 6 and 12 (normal share, Masterwork)

Each cell: the best of the four ways · (plain shots only). Before: 10 fights a cell; after: 16.

| Gun | Before, level 6 | Before, level 12 | After, level 6 | After, level 12 |
|---|---|---|---|---|
| Service pistol (.32 Decrkm) | **73%** · (65%) | **76%** · (65%) | **70%** · (62%) | **73%** · (65%) |
| Drifter revolver | **98%** · (84%) | **98%** · (96%) | **96%** · (89%) | **99%** · (96%) |
| Decrkm SMG (.32 Decrkm) | **81%** · (51%) | **82%** · (50%) | **75%** · (68%) | **77%** · (69%) |
| Hellraiser service rifle | **223%** · (123%) | **204%** · (125%) | **143%** · (120%) | **141%** · (126%) |
| Lever carbine | **126%** · (126%) | **135%** · (135%) | **130%** · (130%) | **134%** · (132%) |
| Lumeri scattergun | **85%** · (85%) | **83%** · (80%) | **87%** · (87%) | **82%** · (80%) |
| Long rifle | **212%** · (212%) | **220%** · (188%) | **143%** · (143%) | **140%** · (135%) |
| .700 Blackpoint anti-materiel | **194%** · (184%) | **203%** · (203%) | **139%** · (133%) | **149%** · (146%) |
| Hellraiser LMG | **193%** · (89%) | **173%** · (91%) | **133%** · (84%) | **120%** · (90%) |
| Recurve bow | **101%** · (77%) | **99%** · (69%) | **101%** · (76%) | **101%** · (74%) |
| Crossbow | **154%** · (86%) | **140%** · (85%) | **116%** · (80%) | **114%** · (82%) |
| Decrkm auto-pistol | **67%** · (43%) | **65%** · (39%) | **64%** · (51%) | **61%** · (49%) |
| Parlour pistol | **43%** · (38%) | **42%** · (39%) | **42%** · (39%) | **40%** · (39%) |
| Magistrate heavy pistol | **95%** · (87%) | **105%** · (93%) | **93%** · (90%) | **103%** · (90%) |
| Frontier hand cannon | **141%** · (102%) | **130%** · (106%) | **130%** · (107%) | **125%** · (104%) |
| Legion PDW | **86%** · (54%) | **100%** · (54%) | **78%** · (70%) | **83%** · (70%) |
| Whisper SMG | **69%** · (41%) | **66%** · (39%) | **63%** · (55%) | **54%** · (54%) |
| Mandestra drum-gun | **86%** · (41%) | **81%** · (51%) | **74%** · (59%) | **74%** · (67%) |
| Adamantile battle rifle | **179%** · (179%) | **170%** · (170%) | **140%** · (140%) | **144%** · (133%) |
| CCEC marksman rifle | **171%** · (165%) | **176%** · (176%) | **142%** · (127%) | **144%** · (141%) |
| Legion bullpup | **208%** · (127%) | **221%** · (120%) | **145%** · (125%) | **145%** · (121%) |
| Coach gun | **60%** · (55%) | **67%** · (67%) | **61%** · (60%) | **66%** · (66%) |
| Sawn-off | **37%** · (29%) | **53%** · (53%) | **35%** · (29%) | **47%** · (47%) |
| Brigade auto-shotgun | **106%** · (64%) | **123%** · (72%) | **90%** · (82%) | **107%** · (90%) |
| Hellraiser rotary | **134%** · (71%) | **135%** · (82%) | **107%** · (76%) | **104%** · (80%) |
| Smetanita thumper | **53%** · (47%) | **52%** · (46%) | **53%** · (48%) | **53%** · (48%) |
| Breacher tube | **25%** · (24%) | **27%** · (22%) | **27%** · (23%) | **25%** · (21%) |
| Purifier flamer | **51%** · (46%) | **50%** · (49%) | **50%** · (45%) | **50%** · (49%) |
| Repeating crossbow | **83%** · (79%) | **92%** · (82%) | **80%** · (80%) | **87%** · (81%) |
| Science Team core rifle | **151%** · (150%) | **169%** · (169%) | **146%** · (133%) | **148%** · (144%) |
| Service pistol (.32 Decrkm), one in each hand | **84%** · (72%) | **88%** · (70%) | **84%** · (75%) | **88%** · (69%) |
| Drifter revolver, one in each hand | **114%** · (99%) | **108%** · (102%) | **111%** · (98%) | **111%** · (105%) |
| Decrkm auto-pistol, one in each hand | **78%** · (49%) | **67%** · (43%) | **63%** · (58%) | **59%** · (51%) |
| Parlour pistol, one in each hand | **44%** · (38%) | **45%** · (43%) | – | – |
| Magistrate heavy pistol, one in each hand | **111%** · (89%) | **122%** · (98%) | **112%** · (89%) | **114%** · (95%) |
| Frontier hand cannon, one in each hand | **146%** · (124%) | **136%** · (136%) | **127%** · (117%) | **130%** · (122%) |
| Legion PDW, one in each hand | **99%** · (60%) | **106%** · (62%) | **88%** · (72%) | **96%** · (80%) |
| Sawn-off, one in each hand | **54%** · (34%) | **78%** · (41%) | **53%** · (34%) | **78%** · (37%) |

## 4. What changed

### 4.1 Where the 200% came from

| Contributor | Worth | Changed? |
|---|---|---|
| A Masterwork gun: +2 to hit, +10% damage | ×1.23 to ×1.28 on every gun | **No.** It is the same rule for blades, and they are under 150% |
| A big round for the price of a small one: every Shot was 2 AP | long rifle ×1.7 over the service rifle, battle rifle ×1.45, marksman rifle ×1.35, Blackpoint ×1.55, core rifle ×1.2 | Yes: the long rifle's bolt; damage on the other four |
| The Burst of an automatic gun: three rolls for 3 AP | ×1.5 to ×1.8 over plain shots, with no skill, perk or class behind it | Yes: two rolls, the second at −4 |
| Mag Dump: four rolls for 4 AP | the old Burst's rate, once a magazine; with Speed Loader, every turn | Yes: three rolls, each −4 more |
| Heavy Bolt: +50% through 10 armour every turn | crossbow ×1.8 over its plain bolt | Yes: +40% |
| Fire Discipline (one Burst a turn for 2 AP) | with a three-roll Burst, 3 rolls for 2 AP; with two rolls, about 1 AP a turn | No |
| Dead Centre (+50%, a Pressed target, one a turn) | +13 to +17% for its AP | No: inside the ruling |
| Perks | none adds gun damage (Dexterity's are reloads, Recoil and reactions) | No |
| A gun in each hand | two hand cannons 131 to 152% | The hand cannon 40 → 38; the paired attack's rule not touched |
| Criticals | ×1.5 since rules 1.15; about 10 to 20% of a gun's damage | No |

The stack was a product: Masterwork (×1.25) × either the big round (×1.7) or the Burst (×1.6 to ×1.8). The cut is on
the two things that multiplied, not on Masterwork and not on every gun.

### 4.2 The rules, one by one

1. **Burst: three rounds, two rolls, the second at −4.** Quick: −3. Heavy and braced: −1. Auto: the two rolls may
   split. 3 AP, 3 rounds, 2 Heat (one a roll), as before. Walking Fire's Burst, an Auto weapon's held shot and the
   paired Burst are the same Burst; so is the old plain burst action (`combat/attack`, mode `burst`).
2. **Mag Dump: three rolls at most, each at −4 more than the last** (four rolls, −1 more each).
3. **The long rifle's bolt:** a Shot costs 3 AP, an Aimed Shot 4, and every technique that fires a round with it
   costs 1 AP more. Damage 48 (50). It is the only gun with a bolt (`cycle_ap` in weapons.json).
4. **Damage:** battle rifle 30 (38), marksman rifle 33 (40), core rifle 29 (32), .700 Blackpoint 66 (90), Frontier
   hand cannon 38 (40).
5. **Heavy Bolt +40%** (+50%).
6. **The automatic guns whose whole output was the three-roll Burst get damage back,** so their Burst rotation is
   about where it was: SMG 19 (15), PDW 20 (16), whisper SMG 16 (13), drum gun 19 (15), auto-pistol 17 (14),
   auto-shotgun 40 and 24 (35 and 20). None passes the service pistol's 20.
7. **Enemies keep the Burst they were fitted with** (three rolls with an Auto weapon). See 5.1.

### 4.3 What each family is now

| Family | What it is | Measured (Masterwork, normal share, levels 6 and 12) |
|---|---|---|
| Service rifle | the all-rounder: plain Shots, Bursts when the target is in the open, Suppress, Dead Centre | 140% |
| Long rifle | two big Shots a turn (1.6 times a rifle round), range 30, the best Aimed Shot | 138 to 140% |
| Battle rifle | ignores 5 armour, a Burst without Auto, loud | 140% |
| Marksman rifle | range 22, criticals on an Aimed Shot, 10 rounds | 139 to 146% |
| Lever carbine | Quick and Precise: moves and shoots | 129 to 131% |
| Bullpup | Quick and Auto: Bursts at −3, moves and shoots | 135 to 141% |
| Core rifle | Elemental, past armour, no Heat, no jams | 145 to 146% |
| Machine gun | braced: Bursts at −1, 100 rounds, Suppress holds a lane | 122 to 127% |
| .700 Blackpoint | the biggest hit of any gun (2.2 times a rifle round), through 10 armour, braced, 40 credits a round | 140 to 143% |
| Crossbow | silent, no Heat, Heavy Bolt through armour | 113 to 117% |
| Hand cannon | the one-handed big round; one in each hand | 124 to 131%; 130 to 132% |
| SMG and its kin | Quick, 30 rounds, Heat 10 to 12 | 75% (it was 80%) |

## 5. What is not met, and what was found

### 5.1 Enemies fire the old Burst

A Soldier's fire at range is mostly Bursts (4.1 to 4.3 rolls a turn). With the new Burst for enemies too, measured:
a Soldier deals 29 to 37% less a turn, an Elite 0 to 5% less, a Boss 8 to 13% less, and the plain rifleman lasts 4.9
to 5.3 rounds under two Soldiers (target 3) and 3.8 to 4.9 under an Elite and a Soldier. Rules 1.15 fitted the damage
factors (Soldier ×0.78, Elite ×1.05) with the old Burst. So an enemy's Burst is still three rolls with an Auto weapon
(two at 0 and −2 with any other), and what enemies deal has not moved by a point:

| Level | Two Soldiers: rounds the plain rifleman lasts · damage a Soldier turn · rolls a turn | An Elite and a Soldier |
|---|---|---|
| 1 | 3.37 rounds, down by round 3 in 23% · damage a turn 17.9 · rolls a turn 4.06 · hit 51% | 3.03 rounds, down by round 3 in 27% · damage a turn 20.8 · rolls a turn 2.92 · hit 60% |
| 3 | 2.97 rounds, down by round 3 in 30% · damage a turn 22.3 · rolls a turn 4.20 · hit 54% | 3.43 rounds, down by round 3 in 17% · damage a turn 20.4 · rolls a turn 2.92 · hit 57% |
| 6 | 3.13 rounds, down by round 3 in 20% · damage a turn 25.5 · rolls a turn 4.25 · hit 51% | 3.27 rounds, down by round 3 in 30% · damage a turn 25.5 · rolls a turn 2.92 · hit 60% |
| 9 | 3.03 rounds, down by round 3 in 23% · damage a turn 32.2 · rolls a turn 4.26 · hit 52% | 3.20 rounds, down by round 3 in 30% · damage a turn 31.6 · rolls a turn 3.04 · hit 60% |
| 12 | 3.17 rounds, down by round 3 in 23% · damage a turn 37.1 · rolls a turn 4.18 · hit 51% | 3.50 rounds, down by round 3 in 27% · damage a turn 35.9 · rolls a turn 2.95 · hit 59% |
| 20 | 2.97 rounds, down by round 3 in 27% · damage a turn 61.3 · rolls a turn 4.08 · hit 55% | 3.53 rounds, down by round 3 in 20% · damage a turn 53.9 · rolls a turn 2.90 · hit 58% |

(The plain rifleman under fire for 10 rounds, 30 fights a cell, on the 16 × 11 ground of the rules 1.15 fit. Before
and after are the same table, line for line; so are one-on-one fights against a Soldier, an Elite and a Boss.)

The price: a player's service rifle rolls twice in a Burst and the Soldier's rolls three times. It is flagged
(item 1079) and it is question 1.

### 5.2 Fights are longer; and the fit's "under fire" rows no longer measure anything

**Longer fights.** The baseline's squad of four holds the optimised long rifle, which deals a third less. Whole
fights on the simulator's ground, the fit's own tool, 10 fights a cell (read it as a direction):

| Fight (rounds to win, open ground · with cover) | Level 3 | Level 6 | Level 12 | Level 20 | Target |
|---|---|---|---|---|---|
| Standard (3 Soldiers, 1 Elite), before | 4 · 5.1 | 4.1 · 4.9 | 4.5 · 5.2 | 3.9 · 4.9 | 4 to 6 |
| Standard (3 Soldiers, 1 Elite), **after** | **4.7 · 6.8** | **5.3 · 6.6** | **4.9 · 6.9** | **4.5 · 5.7** | |
| Elite (2 Elites, 2 Soldiers), before | 4.2 · 7.2 | 4.4 · 5.8 | 4.6 · 6.8 | 4.5 · 5.3 | 6 to 8 |
| Elite (2 Elites, 2 Soldiers), **after** | **6.3 · 7.6** | **6.4 · 7.1** | **5.8 · 8.4** | **5.4 · 6.1** | |
| Boss (1 Boss, 2 Soldiers), before | 6.8 · 9.4 | 5.6 · 8.7 | 7.5 · 9.5 | 6.6 · 8.7 | 8 to 10 |
| Boss (1 Boss, 2 Soldiers), **after** | **8.3 · 13.8** | **8.2 · 12.2** | **8.9 · 12.3** | **6.4 · 10.6** | |

The standard fight on open ground stays inside its target (4.5 to 5.3 rounds); with cover it is 5.7 to 6.9. The elite
fight on open ground was a round short and is now 5.4 to 6.4. The boss fight on open ground is 8.2 to 8.9 at levels 3
to 12 (inside 8 to 10; 6.4 at level 20); **with cover it is 10.6 to 13.8, which is too long** (one fight in ten ran to
the 20-round stop at levels 6 and 12). Rules 1.15 says the squad's 200% gun was why the elite and boss fights were
short on open ground, and that the weapon step would close it; it did, and it overshoots the boss fight in cover. The
Boss's 960 HP is the number to look at. Not changed here.

**The "under fire" rows (found, not caused, here).** Since the simulator's grounds became 26 × 26 with the sides 13
tiles apart (commit 2762b0a), **an enemy never fires at a character who stands still and shoots**: in a duel on that
ground the enemy makes 0 attacks, and the fit's "under fire" rows read 10 rounds at every level (rules 1.15: 3.0 to
3.4). At commit 551882b, one before, they read 3 and 4. On the old ground with today's code the rules 1.15 numbers
come back exactly (5.1). So the table is not wrong; the measure is. Not looked into: whether a real fight has the same
gap (an enemy that sees nobody at 13 tiles and does not close in). `GUNS_MEASURE_FOES=1` runs the measure on the old
ground.

### 5.3 All in

Against the normal-share rifle an all-in optimised gun is 228 / 223 / 214 / 187 / 175 / 148% at levels 1 to 20
(before: 331 / 329 / 311 / 284 / 249 / 217%). The all-in **plain** rifle is itself 167 / 158 / 146 / 131 / 110 / 100%
of the normal one, so against its own share's rifle the optimised gun is 137 to 159%. Whether a 7/1/1 build may pass
the ceiling is the creation budget's question (question 5).

### 5.4 Smaller things

1. **A Burst against a target in cover is worth +4% for its AP.** The ruling says 10 to 25%. A −4 costs more the
   harder the target is; that is what "worse to hit" does.
2. **Heat is a small price.** Clearing a jam takes Heat to 0 for 2 AP. Not changed: the plain rifle jams too (1.6
   times in 8 turns), so changing it moves the yardstick.
3. **The weak families are still weak:** pistols 40 to 105%, SMGs 55 to 85%, shotguns 35 to 105% (they walk 9 tiles
   first), bows 80 to 115%, the thumper and the flamer 50%. A floor is a later step.
4. **The rocket class** is at 25% on one target: one rocket loaded, 3 AP to load the next, and the carry limit
   leaves the build one or two. Its worth is the blast.
5. **A Burst's effects.** The volley event still says 3 shots and two shot events follow it. How the effects layer
   draws the third round was not looked at (`apps/web/src/game/fx` is another session's).
6. **One cell over the special class's line in the small survey:** the Blackpoint read 149% at level 12 with 16
   fights (143% with 24).

## 6. Melee, measured and not touched

| Share | Level | Optimised blade | Optimised blade, holding the Finisher | Plain blade | Tank |
|---|---|---|---|---|---|
| normal share | 1 | 112% (first 4 turns 87%, biggest hit 103) | 109% (first 4 turns 94%, biggest hit 103) | 86% (first 4 turns 65%, biggest hit 63) | 59% (first 4 turns 26%, biggest hit 59) |
| normal share | 3 | 115% (first 4 turns 93%, biggest hit 113) | 119% (first 4 turns 94%, biggest hit 113) | 88% (first 4 turns 71%, biggest hit 71) | 63% (first 4 turns 37%, biggest hit 67) |
| normal share | 6 | 114% (first 4 turns 87%, biggest hit 130) | 115% (first 4 turns 93%, biggest hit 130) | 98% (first 4 turns 85%, biggest hit 83) | 56% (first 4 turns 36%, biggest hit 69) |
| normal share | 9 | 112% (first 4 turns 88%, biggest hit 220) | 131% (first 4 turns 107%, biggest hit 259) | 94% (first 4 turns 91%, biggest hit 94) | 42% (first 4 turns 23%, biggest hit 68) |
| normal share | 12 | 126% (first 4 turns 108%, biggest hit 154) | 130% (first 4 turns 104%, biggest hit 356) | 89% (first 4 turns 84%, biggest hit 106) | 46% (first 4 turns 25%, biggest hit 76) |
| normal share | 20 | 118% (first 4 turns 100%, biggest hit 164) | 142% (first 4 turns 107%, biggest hit 381) | 94% (first 4 turns 83%, biggest hit 110) | 68% (first 4 turns 53%, biggest hit 94) |
| all in | 1 | 151% (first 4 turns 105%, biggest hit 132) | 163% (first 4 turns 111%, biggest hit 132) | 148% (first 4 turns 138%, biggest hit 86) | 37% (first 4 turns 16%, biggest hit 46) |
| all in | 3 | 160% (first 4 turns 108%, biggest hit 143) | 155% (first 4 turns 90%, biggest hit 143) | 144% (first 4 turns 132%, biggest hit 94) | 30% (first 4 turns 14%, biggest hit 46) |
| all in | 6 | 144% (first 4 turns 99%, biggest hit 153) | 143% (first 4 turns 97%, biggest hit 153) | 133% (first 4 turns 124%, biggest hit 101) | 21% (first 4 turns 10%, biggest hit 45) |
| all in | 9 | 148% (first 4 turns 109%, biggest hit 247) | 150% (first 4 turns 84%, biggest hit 374) | 124% (first 4 turns 115%, biggest hit 109) | 22% (first 4 turns 9%, biggest hit 51) |
| all in | 12 | 124% (first 4 turns 96%, biggest hit 246) | 124% (first 4 turns 73%, biggest hit 373) | 107% (first 4 turns 97%, biggest hit 108) | 38% (first 4 turns 22%, biggest hit 66) |
| all in | 20 | 122% (first 4 turns 104%, biggest hit 161) | 129% (first 4 turns 119%, biggest hit 288) | 96% (first 4 turns 93%, biggest hit 108) | 76% (first 4 turns 64%, biggest hit 101) |

Each cell: damage a turn against the plain rifle over 8 turns on the range (the first 4 turns alone; the biggest
hit). It walks 13 tiles first. A normal share is under 150% at every level, played either way. All in is 122 to 163%
against the normal-share rifle, where the all-in plain blade is already 96 to 148%.

## 7. Questions only Leon can answer

Each has my recommendation, and the recommendation is what is built.

1. **Enemies keep the old three-roll Burst until the enemy table is fitted again.** *Recommendation: yes, for now.*
   The other way is the new Burst for everyone today and the Soldier's ×0.78 raised to about ×0.92 (arithmetic from
   the 29 to 37%, not measured; an enemy caster's spells read the same factor, so they would rise with it).
2. **Burst at −4, or three rolls back with a real price?** Two rolls at 0 and −4 is +13% for its AP. *Recommendation:
   keep.* Three rolls for 3 AP is twice the Shot's rolls; a penalty that brings that to +15% at 65% to hit leaves it
   far higher for a Masterwork or all-in shooter (by arithmetic), because a flat penalty matters less the better the
   shooter.
3. **The long rifle fires twice a turn.** A Shot is 3 AP, an Aimed Shot 4. *Recommendation: keep.* It is how a
   48-damage round and a 30-damage round can both be fair; the other way is a long rifle at about 33 damage.
4. **Masterwork is ×1.25 by itself.** With it untouched, everything else a gun build does has to fit in ×1.15.
   *Recommendation: leave it in this step; look at it with armour and gear (Equipment 2.0), for blades and guns
   together.*
5. **All-in builds:** 148 to 228% of the normal-share rifle with a gun, because the all-in plain rifle is 100 to
   167% of it. *Recommendation: the ceiling is for a normal share; the 7/1/1 question belongs to the creation
   budget.*
6. **The special-ammunition class is "a round at 40 credits or more"** (the Blackpoint, the thumper, the flamer, the
   breacher tube). *Recommendation: yes.* The core rifle (15 credits a round) is held to the ordinary ceiling.
7. **Special rounds were not measured** (armour-piercing, hollow-point, incendiary, Enhanced). *Recommendation:
   measure them with the armour step:* what they are worth depends on enemy armour.
8. **The SMG family got damage back** (15 → 19 and its kin) so its Burst rotation stays at 75 to 80%.
   *Recommendation: yes;* it is still the weakest family, and an enemy Minion with an SMG now deals 19 a shot (a
   service pistol: 20).
9. **The boss fight with cover is now 10.6 to 13.8 rounds** (target 8 to 10). *Recommendation: refit the Boss's HP
   in the defence step, on a ground where enemies fire back (5.2), together with question 1.* Not built.

## 8. Files

- Spec: `docs/rules/PHC-Core-Rules-v1.0.md` ("Rules revision 1.18"; notes in Actions, Heat, the weapon tables, the
  technique tables, Physical techniques and rules 1.15; new items 1069 to 1088).
- Data: `data/techniques.json` (burst, mag_dump, heavy_bolt, walking_fire, overwatch), `data/weapons.json` (12 guns;
  `cycle_ap` and `ap_cost` on the long rifle), `data/rules.json` (the burst action's line).
- Engine: `combat.ts` (`cycleAp`, `attackApCost` reads the weapon's Aimed Shot cost, `burstRolls`, `burstCool`,
  the plain burst action), `physical/core.ts` (the bolt's AP on techniques), `physical/ranged/fire.ts` (Burst,
  Walking Fire), `physical/ranged/watches.ts` (an Auto weapon's held shot).
- Tests: `test/rules118-guns.test.ts` (new, 14 tests); `test/balance/guns-measure.ts` and `.test.ts` (new: the full
  run, the enemy measure, and 3 cheap target tests that run in `npm run check`); `test/balance/policies.ts` (the
  gunner), `test/balance/builds.ts` (an off-hand gun starts loaded); the ranged technique tests updated to the new
  Burst, Mag Dump and Heavy Bolt (`phys-ranged-fire`, `-press`, `-sets`, `-fx-events`, `-ai`, `phys-seams`).
- Client: `apps/web/src/game/commands.ts` (one sentence that described the old Burst).
- Not regenerated: `apps/web/src/game/protodata.json` (screen data from the data pack). No browser suite was found
  to pin a number changed here (`fx-sweep` reads a Burst as 3 rounds, which it still is); none was run.

**For the lead:** `CLAUDE.md` names no number changed here. `CHANGELOG.md` and the version are yours. Two things
outside this step: section 14 has two runs of the numbers 1101 to 1116 (rules 1.14's and rules 1.19's), and the
simulator's ground (5.2).
