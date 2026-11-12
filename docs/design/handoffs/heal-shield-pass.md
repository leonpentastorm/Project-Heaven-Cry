# The heal and shield pass: Sigil, Outburst and prayers (rules 1.20)

12 Nov 2026. For Leon and whoever picks the balance pass up next. The rules are in `docs/rules/PHC-Core-Rules-v1.0.md`
("Rules revision 1.20", section 14 items 1230 on). **Nothing here is committed by this session; nothing was built with
`npm run build`, deployed or run in a browser.**

Sigil and the Outburst were the first ask; prayer was added the same day ("Faith have heal and shield too"). Damage
was not changed and guns were not touched.

## 1. The yardstick and the bands

### 1.1 The unit: one Soldier's turn

Leon gave no number for healing, so the pass needs a unit. It is **a Soldier-turn**: what one Soldier of the fight's
level takes off the plain rifleman (the pass's yardstick character: service rifle, Class 3 armour, a normal share of
points) in one of its turns, after armour, misses counted.

Measured on the ground the rules 1.15 table was fitted on (16 × 11, the sides 11 tiles apart; 60 fights a level, two
Soldiers with 5,000 HP firing at the rifleman until he drops; `GUNS_MEASURE_FOES=1`, `guns-measure.test.ts`). **Not**
the simulator's 26 × 26 ground: an enemy there never fires at a character 13 tiles away (spec item 1086).

| | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| The rifleman's max HP | 145 | 163 | 190 | 233 | 288 | 445 |
| **One Soldier-turn (HP he loses a Soldier's turn)** | **18.5** | **21.5** | **25.4** | **32.4** | **37.8** | **60.2** |
| The same as a share of his max HP | 12.8% | 13.2% | 13.4% | 13.9% | 13.1% | 13.5% |
| Rounds he lasts under two Soldiers | 3.3 | 3.1 | 3.2 | 3.0 | 3.1 | 3.1 |

1. **A Soldier-turn is 13% of the rifleman's max HP at every level.** That is the rules 1.15 table doing its job (three
   rounds under two Soldiers). So "percent of a Soldier-turn" and "percent of max HP" are one yardstick: 100% of a
   Soldier-turn is 13% of the rifleman's HP; 125% is 17%; 200% is 27%.
2. **It grows ×3.25 from level 1 to 20**, because a character's HP grows that much and the table keeps pace. A heal
   that is a fixed number times a multiplier does not: Healing given grows about ×1.5 over a career, the Sigil
   multiplier ×1.7, Blessing power ×1.4. This is the main finding of the "before" measurement (section 3).
3. **Who is being shot matters.** A Soldier's hit is 23 before armour at level 1: 8 after the rifleman's Class 3
   armour, 18 after a caster's Class 1. Against a caster a Soldier-turn is about twice the number above, so the same
   heal is worth half as much on a caster and about three times as much on a tank. The bands are stated on the
   rifleman, as the rules 1.15 "under fire" rows are.
4. **A standard fight for four** (3 Soldiers and an Elite) opens at about **4.4 Soldier-turns a round** coming in (an
   Elite is worth about 1.4 Soldiers).
5. A heal always lands. The damage targets count misses (a 65% roll); these do not need to.

### 1.2 The bands

They mirror the damage rulings of rules 1.17 and 1.19 (Outburst the steady school at about 125% of the plain rifle
and 150% at its peak; a full Sigil Line 150 to 200% over the turns it takes), with the Soldier-turn in the rifle's
place: **a healer undoes a Soldier at the rate a damage caster outdoes a rifle.**

| # | What | Band (percent of one Soldier-turn, for a normal-share caster) | Why |
|---|---|---|---|
| 1 | **Outburst, steady:** a whole turn spent healing one ally (Begin, the Pumps the turn affords with the feelings a caster has early, Release) | **100 to 150%, centre 125%** | One healer keeps one ally up against one Soldier and cannot outpace two |
| 2 | **Outburst, the biggest heal** (stage 4, the four feelings that buy the multiplier; costs Strain and HP) | **150 to 175%** | The peak, once or twice a fight |
| 3 | **Outburst, quick:** a stage 1 heal (3 AP, half a turn) | **50 to 75%** | Half a turn, half a heal |
| 4 | **Sigil, a 2-glyph Line every turn** (MEND and a Reach word) | **about 100%** | On par with the steady school, as the 2-glyph damage Line is on par with the rifle |
| 5 | **Sigil, a full Line** (4 glyphs; 1.1 to 1.6 turns of drawing) | **150 to 200% over the turns it takes**: one heal of 200 to 270%, about a third of the rifleman's HP | The set-up earns the biggest single heal |
| 6 | **A shield** against the heal of the same cost | **×1.2** | A point of shield is a point of HP (it is taken after armour and lasts the fight). It can go on before the wound, but it can sit on the ally nobody shoots, it never adds to another shield, and it never gets anyone up |
| 7 | **A rider:** a heal or shield that comes with a Release or an Evoke that also does its full job (Love, Shell) | **at most 50 to 75%** | It costs no turn |
| 8 | **An area:** all the allies in a shape together | **at most about 1.6 times the single heal** | The total is what makes a squad unkillable, not the single number |
| 9 | **Lifesteal** (LEECH, Drain): a share of the damage dealt, the caster only | not fitted: it moves with the damage it is a share of | It is paid for in damage |
| 10 | **A prayer:** a Whisper (1 AP, once a turn) | **30 to 40%** (a shield ×1.2) | A sixth of a turn, every turn |
| 11 | **A prayer:** a healing Hymn (3 AP; from Virtue 4 its cooldown is one round, so it is prayed every turn, and the other 3 AP still shoot) | **60 to 75%** (a shield ×1.2) | Half a turn, half a steady heal. (This row read 125 to 150% in the first hours of this file, on the assumption that a Hymn is not an every-turn action; the pairs under fire showed it is: section 5) |
| 12 | **A prayer:** the patron's intervention (once a fight; twice from Devotion 7) | **about 150%** | The peak, and it costs no action |
| 13 | **All in** (every point in the healing skill) | may pass the bands by about half, as all-in damage does | |
| 14 | **Nothing makes a squad unkillable:** two healers on one ally; a heal and a shield together | a hard limit on what magic and prayer can give one creature in a round (section 5) | The bands hold one healer; the limit holds any number |

A Miracle is not on this table: it is once a session and costs five levels of Devotion.

### 1.3 How heals keep pace with level

Every band above is flat across levels only if heals and shields grow as a Soldier-turn does. **The rule built: a
character's healing and shields from Sigil, the Outburst and prayer are multiplied by the caster's level row of the
enemy table's damage column** (`data/enemies.json` `levels.table`: ×1.00 at level 1, ×1.05 at 3, ×1.13 at 6, ×1.24 at
9, ×1.38 at 12, ×1.82 at 20). It is the same number that raises what an enemy deals, read from the same place, so the
two cannot drift apart. In the engine it is one function, `mendFactor(level)` (`packages/engine/src/effects/mending.ts`).

**For the Faith fit (rules 1.21):** prayer heals and shields already carry this factor. If prayers get a general
scaling rule of their own (with level or with Faith), the prayer heal and shield bases in section 4 were fitted with
Blessing power (1 + 0.1 × Faith) × this factor and nothing else: a second scaling on top would need those bases
lowered by what it adds.

### 1.4 Where each base lives (so one can move without the others)

| Number | Where |
|---|---|
| Outburst **damage** base (36; enemy casters 24) | `data/soul_modules.json` `damage.base`, `damage.enemy_base`. **No heal or shield reads it any more** |
| Outburst **heal** base (the Buff school; Love reads it too) | `data/soul_modules.json` `schools[buff].heal` |
| Outburst **shield** bases (Inverse, Shell) | `data/soul_modules.json` items `inverse.shield`, `shell.shield` |
| Sigil heal and shield bases | `data/sigils.json` items `mend.heal`, `ward.shield` (the Line multiplier of rules 1.17 does not touch them) |
| Prayer heal and shield bases | `data/patrons.json` (`whispers`, each patron's `hymns`, `prayer.intervention.amount`) |
| The level factor | `data/enemies.json` `levels.table[].damage_mult` |
| The limit on one creature in a round | `data/rules.json` `mending` |
| Lifesteal (LEECH 0.5, Drain 0.25) | a share of damage dealt: **these two do move when the damage base moves** |

## 2. What was asked, and where it stands

| Asked | Built | Met? |
|---|---|---|
| "Do a pass on heal and shield. For both sigil and OB" (Leon, 12 Nov 2026) | Every heal and shield of Sigil and the Outburst measured against one Soldier's turn and fitted to the bands of section 1.2; a level factor so they stay there; a round limit | Yes, with the misses of section 7 |
| "Faith have heal and shield too" | The prayers' heals and shields fitted to the same yardstick | Yes |
| Keep heal and shield bases apart from the damage base (the lead: the Outburst's damage targets are going up) | No heal or shield reads the Damage base now. Love, Inverse and Shell did | Yes. Only lifesteal (Drain, LEECH) still moves with damage, by definition |
| A simulator that can measure a fight with a healer or shielder | `heal-measure.ts`: four supporters' policies and the pair under fire | Yes |
| Don't change the damage of rules 1.17 to 1.19; don't touch guns | Not changed | Yes |

**The main finding.** Healing was not low. It was two to seven Soldier-turns a turn at level 1 and still one to three at level 20, because nothing in it grew with level and the Outburst's heal came twice (the Buff heal, and Love adding a third of the Damage school's damage on top). Rules 1.19 lowered the Buff heal from 36 to 30 at stage 1; against the yardstick that was a move from 2.7 Soldier-turns to 2.3 for half a turn. **This pass is a cut of 60 to 80% at level 1 and of 25 to 65% at level 20.** It is the biggest thing here that needs Leon's eye (question 1).

## 3. The inventory: every source, before and now

Each cell: HP now · **percent of one Soldier-turn** (HP before · percent before). On a plain target (no Camaraderie, no Conscience) in Normal air. Before is what the same source gave under rules 1.19 (the old bases are written down in `heal-measure.ts`, `OLD`); both sides are arithmetic on the engine's own multipliers for the reference builds, not a simulation. "Steady" is a stage 4 Release with Rage, Love and two plain Pumps (×2.0); "the early feelings" is Rage, Love and two more +0.3 feelings (×2.2); "the biggest" is Rage, Shame, Pride and Abandon (×3.2).

**3.1 The reference Sigil caster (Mage), normal share. Sigil multiplier ×1.7 / 1.9 / 2.2 / 2.5 / 2.8 / 2.9; Healing given ×1.0**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| MEND · SEEK (2 glyphs) | about 4 AP, 5 charge | 1 | 17 · **92%** (43 · 230%) | 20 · **93%** (48 · 221%) | 25 · **98%** (55 · 217%) | 31 · **96%** (63 · 193%) | 39 · **102%** (70 · 185%) | 53 · **88%** (73 · 120%) |
| MEND · CONDENSE · SEEK (3 glyphs) | about 5.5 AP, 6 charge | 1 | 26 · **138%** (64 · 345%) | 30 · **139%** (71 · 331%) | 37 · **147%** (83 · 325%) | 47 · **144%** (94 · 289%) | 58 · **153%** (105 · 278%) | 79 · **132%** (109 · 181%) |
| MEND · MEND · CONDENSE · SEEK (the full Line) | about 6.5 AP over 1.1 to 1.6 turns, 9 charge | 1 | 46 · **248%** (115 · 620%) | 54 · **251%** (128 · 597%) | 67 · **264%** (149 · 585%) | 84 · **258%** (169 · 521%) | 104 · **276%** (189 · 500%) | 143 · **237%** (196 · 325%) |
| MEND · SPREAD · SEEK (each ally within 2 of where it lands) | about 5.5 AP, 7 charge | each in a 5 × 5 | 10 · **55%** (26 · 138%) | 12 · **56%** (29 · 133%) | 15 · **59%** (33 · 130%) | 19 · **57%** (38 · 116%) | 23 · **61%** (42 · 111%) | 32 · **53%** (44 · 72%) |
| WARD · SEEK (2 glyphs) | about 4 AP, 4 charge | 1 | 20 · **110%** (51 · 276%) | 24 · **111%** (57 · 265%) | 30 · **117%** (66 · 260%) | 37 · **115%** (75 · 231%) | 46 · **123%** (84 · 222%) | 63 · **105%** (87 · 145%) |
| WARD · WARD · CONDENSE · SEEK (the full Line) | about 6.5 AP over 1.1 to 1.6 turns, 7 charge | 1 | 55 · **298%** (138 · 744%) | 65 · **301%** (154 · 716%) | 81 · **317%** (178 · 702%) | 100 · **310%** (203 · 625%) | 125 · **331%** (227 · 600%) | 171 · **284%** (235 · 390%) |

The full Line over the turns it takes (1.6 at level 3, 1.33 at levels 6 to 12, 1.14 at level 20; the turns are the 1.17 measurement's): **157 / 198 / 194 / 207 / 208%**. At level 1 the Mage has no 4-glyph Line. SPREAD on four allies gives 2.4 times the 2-glyph heal in all, for a third glyph: 1.6 times the single 3-glyph heal.

**3.2 The Sigil caster all in. Sigil multiplier ×2.3 / 2.5 / 2.7 / 2.9 / 2.9 / 2.9**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| MEND · SEEK (2 glyphs) | about 4 AP, 5 charge | 1 | 23 · **124%** (58 · 311%) | 26 · **122%** (63 · 291%) | 31 · **120%** (68 · 266%) | 36 · **111%** (73 · 224%) | 40 · **106%** (73 · 192%) | 53 · **88%** (73 · 120%) |
| MEND · CONDENSE · SEEK (3 glyphs) | about 5.5 AP, 6 charge | 1 | 35 · **186%** (86 · 466%) | 39 · **183%** (94 · 436%) | 46 · **180%** (101 · 399%) | 54 · **166%** (109 · 336%) | 60 · **159%** (109 · 288%) | 79 · **132%** (109 · 181%) |
| MEND · MEND · CONDENSE · SEEK (the full Line) | about 6.5 AP over 1.1 to 1.6 turns, 9 charge | 1 | 62 · **336%** (155 · 839%) | 71 · **330%** (169 · 785%) | 82 · **324%** (182 · 718%) | 97 · **300%** (196 · 604%) | 108 · **286%** (196 · 518%) | 143 · **237%** (196 · 325%) |
| MEND · SPREAD · SEEK (each ally within 2 of where it lands) | about 5.5 AP, 7 charge | each in a 5 × 5 | 14 · **75%** (35 · 186%) | 16 · **73%** (38 · 174%) | 18 · **72%** (41 · 159%) | 22 · **67%** (44 · 134%) | 24 · **64%** (44 · 115%) | 32 · **53%** (44 · 72%) |
| WARD · SEEK (2 glyphs) | about 4 AP, 4 charge | 1 | 28 · **149%** (69 · 373%) | 32 · **147%** (75 · 349%) | 37 · **144%** (81 · 319%) | 43 · **133%** (87 · 269%) | 48 · **127%** (87 · 230%) | 63 · **105%** (87 · 145%) |
| WARD · WARD · CONDENSE · SEEK (the full Line) | about 6.5 AP over 1.1 to 1.6 turns, 7 charge | 1 | 75 · **403%** (186 · 1007%) | 85 · **396%** (203 · 942%) | 99 · **389%** (219 · 861%) | 117 · **360%** (235 · 725%) | 130 · **343%** (235 · 621%) | 171 · **284%** (235 · 390%) |

**3.3 The reference Outburst caster (Channeler), normal share. Soul multiplier ×1.55 / 1.7 / 1.85 / 2.0 / 2.3 / 2.45; Healing given ×1.4 / 1.5 / 1.6 / 1.7 / 1.7 / 2.1**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| Buff heal, stage 1 (the quick heal) | 3 AP, 20 MP, 1 Strain | 1 | 10 · **53%** (42 · 227%) | 11 · **51%** (45 · 209%) | 13 · **50%** (48 · 189%) | 15 · **46%** (51 · 157%) | 16 · **43%** (51 · 135%) | 27 · **44%** (63 · 105%) |
| Buff heal, stage 4, plain Pumps | 6 AP, 20 MP, 1 Strain | 1 | 16 · **85%** (67 · 363%) | 18 · **82%** (72 · 335%) | 20 · **80%** (77 · 302%) | 24 · **73%** (82 · 252%) | 26 · **70%** (82 · 216%) | 43 · **71%** (101 · 167%) |
| Buff heal, steady (Rage and Love: a new caster) | 6 AP, 20 MP, 2 Strain | 1 | 25 · **132%** (123 · 665%) | 28 · **128%** (133 · 618%) | 32 · **125%** (143 · 561%) | 37 · **114%** (152 · 470%) | 41 · **109%** (160 · 423%) | 67 · **111%** (188 · 312%) |
| Buff heal, the early feelings (Rage, Love and two more) | 6 AP, 20 MP, 2 Strain | 1 | 27 · **146%** (135 · 732%) | 30 · **141%** (146 · 680%) | 35 · **137%** (157 · 618%) | 41 · **125%** (168 · 517%) | 45 · **119%** (176 · 465%) | 74 · **122%** (207 · 343%) |
| Buff heal, the biggest (Rage, Shame, Pride, Abandon) | 6 AP, 20 MP, 6 Strain, 8 HP | 1 | 31 · **170%** (134 · 726%) | 35 · **164%** (144 · 670%) | 40 · **159%** (154 · 605%) | 47 · **146%** (163 · 504%) | 53 · **139%** (163 · 432%) | 86 · **142%** (202 · 335%) |
| Buff heal in an Aura, steady (each ally next to you, and you) | 6 AP, 35 MP, 2 Strain | each | 10 · **53%** (107 · 581%) | 11 · **51%** (116 · 538%) | 13 · **50%** (124 · 488%) | 15 · **46%** (132 · 408%) | 16 · **43%** (137 · 362%) | 27 · **44%** (163 · 271%) |
| Love on a Damage Outburst: an ally in the shape (steady) | a feeling: no AP beyond the Pump | each ally in the shape | 5 · **26%** (39 · 211%) | 6 · **26%** (43 · 199%) | 6 · **25%** (47 · 184%) | 7 · **23%** (50 · 156%) | 8 · **22%** (58 · 153%) | 13 · **22%** (62 · 103%) |
| Love on a Damage Outburst, no ally in the shape (steady) | a feeling | 1 | 3 · **16%** (22 · 121%) | 3 · **15%** (24 · 114%) | 4 · **15%** (27 · 105%) | 4 · **14%** (29 · 89%) | 5 · **13%** (33 · 88%) | 8 · **13%** (35 · 59%) |
| Inverse shield, stage 1 | 3 AP, 30 MP, 1 Strain | 1 | 15 · **84%** (39 · 211%) | 18 · **83%** (43 · 199%) | 21 · **82%** (47 · 184%) | 25 · **77%** (50 · 156%) | 32 · **84%** (58 · 153%) | 45 · **74%** (62 · 103%) |
| Inverse shield, steady | 6 AP, 30 MP, 2 Strain | 1 | 31 · **168%** (78 · 422%) | 36 · **166%** (86 · 399%) | 42 · **165%** (93 · 367%) | 50 · **153%** (101 · 311%) | 63 · **168%** (116 · 307%) | 89 · **148%** (123 · 205%) |
| Inverse shield in a Wave, steady | 6 AP, 45 MP, 2 Strain | each | 12 · **67%** (55 · 296%) | 14 · **66%** (60 · 279%) | 17 · **66%** (65 · 257%) | 20 · **61%** (71 · 218%) | 25 · **67%** (81 · 215%) | 36 · **59%** (86 · 144%) |
| Shell (a shield on you with any Release, steady) | a module: 10 MP, a slot | you | 12 · **67%** (39 · 211%) | 14 · **66%** (43 · 199%) | 17 · **66%** (47 · 184%) | 20 · **61%** (50 · 156%) | 25 · **67%** (58 · 153%) | 36 · **59%** (62 · 103%) |
| Drain (a quarter of the HP a steady Damage Outburst takes; it lands 65% of the time) (not changed: a share of damage) | the Damage school at ×0.8 | you | 15 · **78%** (15 · 78%) | 16 · **74%** (16 · 74%) | 17 · **68%** (17 · 68%) | 19 · **58%** (19 · 58%) | 22 · **57%** (22 · 57%) | 23 · **38%** (23 · 38%) |
| Guardian, Will Shield (with this caster's Healing given) | 3 AP, 20 MP, 1 Strain | 1 | 17 · **91%** (42 · 227%) | 19 · **88%** (45 · 209%) | 22 · **85%** (48 · 189%) | 25 · **78%** (51 · 157%) | 28 · **74%** (51 · 135%) | 46 · **76%** (63 · 105%) |

**3.4 The Outburst caster all in (Will Power first; Empathy comes last). Soul multiplier ×2.0 to ×2.45; Healing given ×1.2 / 1.2 / 1.2 / 1.3 / 1.5 / 2.7**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| Buff heal, stage 1 (the quick heal) | 3 AP, 20 MP, 1 Strain | 1 | 8 · **45%** (36 · 195%) | 9 · **41%** (36 · 167%) | 9 · **37%** (36 · 142%) | 11 · **35%** (39 · 120%) | 14 · **38%** (45 · 119%) | 34 · **57%** (81 · 135%) |
| Buff heal, stage 4, plain Pumps | 6 AP, 20 MP, 1 Strain | 1 | 13 · **73%** (58 · 311%) | 14 · **66%** (58 · 268%) | 15 · **60%** (58 · 227%) | 18 · **56%** (62 · 193%) | 23 · **61%** (72 · 190%) | 55 · **91%** (130 · 215%) |
| Buff heal, steady (Rage and Love: a new caster) | 6 AP, 20 MP, 2 Strain | 1 | 21 · **114%** (122 · 662%) | 22 · **103%** (126 · 587%) | 24 · **93%** (130 · 512%) | 28 · **87%** (140 · 431%) | 36 · **96%** (152 · 401%) | 86 · **143%** (224 · 372%) |
| Buff heal, the early feelings (Rage, Love and two more) | 6 AP, 20 MP, 2 Strain | 1 | 23 · **125%** (135 · 728%) | 24 · **113%** (139 · 646%) | 26 · **103%** (143 · 563%) | 31 · **96%** (154 · 474%) | 40 · **105%** (167 · 442%) | 95 · **157%** (246 · 409%) |
| Buff heal, the biggest (Rage, Shame, Pride, Abandon) | 6 AP, 20 MP, 6 Strain, 8 HP | 1 | 27 · **145%** (115 · 623%) | 28 · **131%** (115 · 536%) | 30 · **120%** (115 · 454%) | 36 · **111%** (125 · 385%) | 46 · **123%** (144 · 381%) | 110 · **183%** (259 · 431%) |
| Buff heal in an Aura, steady (each ally next to you, and you) | 6 AP, 35 MP, 2 Strain | each | 8 · **45%** (102 · 553%) | 9 · **41%** (105 · 486%) | 9 · **37%** (107 · 420%) | 11 · **35%** (115 · 355%) | 14 · **38%** (127 · 336%) | 34 · **57%** (199 · 331%) |
| Love on a Damage Outburst: an ally in the shape (steady) | a feeling: no AP beyond the Pump | each ally in the shape | 4 · **23%** (50 · 272%) | 4 · **21%** (54 · 252%) | 5 · **19%** (58 · 228%) | 6 · **17%** (62 · 191%) | 7 · **19%** (62 · 163%) | 17 · **29%** (62 · 103%) |
| Love on a Damage Outburst, no ally in the shape (steady) | a feeling | 1 | 3 · **14%** (29 · 156%) | 3 · **12%** (31 · 144%) | 3 · **11%** (33 · 130%) | 3 · **10%** (35 · 109%) | 4 · **12%** (35 · 93%) | 10 · **17%** (35 · 59%) |
| Inverse shield, stage 1 | 3 AP, 30 MP, 1 Strain | 1 | 20 · **108%** (50 · 272%) | 23 · **105%** (54 · 252%) | 26 · **102%** (58 · 228%) | 30 · **94%** (62 · 191%) | 34 · **89%** (62 · 163%) | 45 · **74%** (62 · 103%) |
| Inverse shield, steady | 6 AP, 30 MP, 2 Strain | 1 | 40 · **216%** (101 · 545%) | 45 · **210%** (108 · 504%) | 52 · **205%** (116 · 456%) | 61 · **188%** (123 · 381%) | 68 · **179%** (123 · 327%) | 89 · **148%** (123 · 205%) |
| Inverse shield in a Wave, steady | 6 AP, 45 MP, 2 Strain | each | 16 · **86%** (71 · 381%) | 18 · **84%** (76 · 353%) | 21 · **82%** (81 · 319%) | 24 · **75%** (86 · 267%) | 27 · **72%** (86 · 229%) | 36 · **59%** (86 · 144%) |
| Shell (a shield on you with any Release, steady) | a module: 10 MP, a slot | you | 16 · **86%** (50 · 272%) | 18 · **84%** (54 · 252%) | 21 · **82%** (58 · 228%) | 24 · **75%** (62 · 191%) | 27 · **72%** (62 · 163%) | 36 · **59%** (62 · 103%) |
| Drain (a quarter of the HP a steady Damage Outburst takes; it lands 65% of the time) (not changed: a share of damage) | the Damage school at ×0.8 | you | 19 · **101%** (19 · 101%) | 20 · **94%** (20 · 94%) | 22 · **85%** (22 · 85%) | 23 · **71%** (23 · 71%) | 23 · **61%** (23 · 61%) | 23 · **38%** (23 · 38%) |
| Guardian, Will Shield (with this caster's Healing given) | 3 AP, 20 MP, 1 Strain | 1 | 14 · **78%** (36 · 195%) | 15 · **70%** (36 · 167%) | 16 · **64%** (36 · 142%) | 19 · **60%** (39 · 120%) | 25 · **66%** (45 · 119%) | 59 · **98%** (81 · 135%) |

**3.5 A Soul healer (Bard, Empathy the main skill), normal share. Healing given ×1.6 / 1.9 / 2.2 / 2.5 / 2.8 / 2.9**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| Buff heal, stage 1 (the quick heal) | 3 AP, 20 MP, 1 Strain | 1 | 11 · **61%** (48 · 259%) | 14 · **65%** (57 · 265%) | 17 · **69%** (66 · 260%) | 22 · **67%** (75 · 231%) | 27 · **72%** (84 · 222%) | 37 · **61%** (87 · 145%) |
| Buff heal, stage 4, plain Pumps | 6 AP, 20 MP, 1 Strain | 1 | 18 · **97%** (77 · 415%) | 22 · **104%** (91 · 424%) | 28 · **110%** (106 · 416%) | 35 · **107%** (120 · 370%) | 43 · **114%** (134 · 356%) | 59 · **98%** (139 · 231%) |
| Buff heal, steady (Rage and Love: a new caster) | 6 AP, 20 MP, 2 Strain | 1 | 28 · **151%** (130 · 703%) | 35 · **162%** (148 · 688%) | 44 · **171%** (169 · 664%) | 54 · **167%** (189 · 584%) | 68 · **179%** (207 · 548%) | 92 · **153%** (221 · 366%) |
| Buff heal, the early feelings (Rage, Love and two more) | 6 AP, 20 MP, 2 Strain | 1 | 31 · **166%** (143 · 773%) | 38 · **179%** (163 · 757%) | 48 · **188%** (185 · 730%) | 60 · **184%** (208 · 642%) | 74 · **197%** (228 · 603%) | 102 · **169%** (243 · 403%) |
| Buff heal, the biggest (Rage, Shame, Pride, Abandon) | 6 AP, 20 MP, 6 Strain, 8 HP | 1 | 36 · **194%** (154 · 830%) | 45 · **208%** (182 · 848%) | 56 · **219%** (211 · 831%) | 69 · **214%** (240 · 741%) | 87 · **229%** (269 · 711%) | 118 · **196%** (278 · 462%) |
| Buff heal in an Aura, steady (each ally next to you, and you) | 6 AP, 35 MP, 2 Strain | each | 11 · **61%** (116 · 629%) | 14 · **65%** (134 · 625%) | 17 · **69%** (154 · 606%) | 22 · **67%** (173 · 535%) | 27 · **72%** (191 · 506%) | 37 · **61%** (202 · 336%) |
| Love on a Damage Outburst: an ally in the shape (steady) | a feeling: no AP beyond the Pump | each ally in the shape | 6 · **30%** (34 · 184%) | 7 · **32%** (34 · 158%) | 9 · **34%** (37 · 144%) | 11 · **33%** (39 · 121%) | 14 · **36%** (39 · 103%) | 18 · **31%** (47 · 77%) |
| Love on a Damage Outburst, no ally in the shape (steady) | a feeling | 1 | 3 · **18%** (19 · 105%) | 4 · **19%** (19 · 90%) | 5 · **21%** (21 · 82%) | 7 · **20%** (22 · 69%) | 8 · **21%** (22 · 59%) | 11 · **18%** (27 · 44%) |
| Inverse shield, stage 1 | 3 AP, 30 MP, 1 Strain | 1 | 13 · **73%** (34 · 184%) | 14 · **66%** (34 · 158%) | 16 · **65%** (37 · 144%) | 19 · **59%** (39 · 121%) | 21 · **57%** (39 · 103%) | 34 · **56%** (47 · 77%) |
| Inverse shield, steady | 6 AP, 30 MP, 2 Strain | 1 | 27 · **146%** (68 · 368%) | 28 · **132%** (68 · 316%) | 33 · **129%** (73 · 288%) | 38 · **119%** (78 · 241%) | 43 · **113%** (78 · 207%) | 67 · **112%** (93 · 155%) |
| Inverse shield in a Wave, steady | 6 AP, 45 MP, 2 Strain | each | 11 · **58%** (48 · 257%) | 11 · **53%** (48 · 222%) | 13 · **52%** (51 · 201%) | 15 · **47%** (55 · 169%) | 17 · **45%** (55 · 145%) | 27 · **45%** (65 · 108%) |
| Shell (a shield on you with any Release, steady) | a module: 10 MP, a slot | you | 11 · **58%** (34 · 184%) | 11 · **53%** (34 · 158%) | 13 · **52%** (37 · 144%) | 15 · **47%** (39 · 121%) | 17 · **45%** (39 · 103%) | 27 · **45%** (47 · 77%) |
| Drain (a quarter of the HP a steady Damage Outburst takes; it lands 65% of the time) (not changed: a share of damage) | the Damage school at ×0.8 | you | 13 · **68%** (13 · 68%) | 13 · **59%** (13 · 59%) | 14 · **53%** (14 · 53%) | 15 · **45%** (15 · 45%) | 15 · **38%** (15 · 38%) | 17 · **29%** (17 · 29%) |
| Bard, Mend (rank II): the steady Buff heal with it (from Insight 5 and level 6) | as the heal | 1 | 36 · **195%** (162 · 876%) | 45 · **209%** (186 · 865%) | 56 · **220%** (213 · 837%) | 70 · **215%** (239 · 738%) | 87 · **230%** (263 · 696%) | 119 · **197%** (279 · 463%) |
| Guardian, Will Shield (with this caster's Healing given) | 3 AP, 20 MP, 1 Strain | 1 | 19 · **104%** (48 · 259%) | 24 · **111%** (57 · 265%) | 30 · **117%** (66 · 260%) | 37 · **115%** (75 · 231%) | 46 · **123%** (84 · 222%) | 63 · **105%** (87 · 145%) |

**3.6 The Soul healer all in. Healing given ×2.3 / 2.5 / 2.7 / 2.9 / 2.9 / 2.9**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| Buff heal, stage 1 (the quick heal) | 3 AP, 20 MP, 1 Strain | 1 | 16 · **87%** (69 · 373%) | 18 · **85%** (75 · 349%) | 21 · **84%** (81 · 319%) | 25 · **78%** (87 · 269%) | 28 · **74%** (87 · 230%) | 37 · **61%** (87 · 145%) |
| Buff heal, stage 4, plain Pumps | 6 AP, 20 MP, 1 Strain | 1 | 26 · **139%** (110 · 597%) | 29 · **137%** (120 · 558%) | 34 · **135%** (130 · 510%) | 40 · **124%** (139 · 430%) | 45 · **119%** (139 · 368%) | 59 · **98%** (139 · 231%) |
| Buff heal, steady (Rage and Love: a new caster) | 6 AP, 20 MP, 2 Strain | 1 | 40 · **218%** (166 · 896%) | 46 · **214%** (178 · 827%) | 53 · **210%** (190 · 747%) | 63 · **194%** (203 · 626%) | 70 · **185%** (206 · 544%) | 92 · **153%** (231 · 383%) |
| Buff heal, the early feelings (Rage, Love and two more) | 6 AP, 20 MP, 2 Strain | 1 | 44 · **239%** (182 · 985%) | 51 · **235%** (195 · 909%) | 59 · **231%** (209 · 822%) | 69 · **214%** (223 · 689%) | 77 · **204%** (226 · 598%) | 102 · **169%** (254 · 422%) |
| Buff heal, the biggest (Rage, Shame, Pride, Abandon) | 6 AP, 20 MP, 6 Strain, 8 HP | 1 | 52 · **278%** (221 · 1194%) | 59 · **273%** (240 · 1116%) | 68 · **269%** (259 · 1020%) | 81 · **249%** (278 · 859%) | 90 · **237%** (278 · 737%) | 118 · **196%** (278 · 462%) |
| Buff heal in an Aura, steady (each ally next to you, and you) | 6 AP, 35 MP, 2 Strain | each | 16 · **87%** (155 · 836%) | 18 · **85%** (167 · 775%) | 21 · **84%** (179 · 703%) | 25 · **78%** (191 · 591%) | 28 · **74%** (193 · 510%) | 37 · **61%** (208 · 346%) |
| Love on a Damage Outburst: an ally in the shape (steady) | a feeling: no AP beyond the Pump | each ally in the shape | 8 · **44%** (28 · 150%) | 9 · **43%** (28 · 129%) | 11 · **42%** (28 · 109%) | 13 · **39%** (29 · 89%) | 14 · **37%** (31 · 83%) | 18 · **31%** (57 · 94%) |
| Love on a Damage Outburst, no ally in the shape (steady) | a feeling | 1 | 5 · **26%** (16 · 86%) | 6 · **26%** (16 · 74%) | 6 · **25%** (16 · 62%) | 8 · **23%** (17 · 51%) | 8 · **22%** (18 · 48%) | 11 · **18%** (32 · 54%) |
| Inverse shield, stage 1 | 3 AP, 30 MP, 1 Strain | 1 | 11 · **59%** (28 · 150%) | 12 · **54%** (28 · 129%) | 12 · **49%** (28 · 109%) | 14 · **44%** (29 · 89%) | 17 · **46%** (31 · 83%) | 41 · **68%** (57 · 94%) |
| Inverse shield, steady | 6 AP, 30 MP, 2 Strain | 1 | 22 · **119%** (55 · 300%) | 23 · **107%** (55 · 258%) | 25 · **98%** (55 · 218%) | 29 · **88%** (58 · 179%) | 35 · **91%** (63 · 167%) | 82 · **136%** (113 · 188%) |
| Inverse shield in a Wave, steady | 6 AP, 45 MP, 2 Strain | each | 9 · **48%** (39 · 210%) | 9 · **43%** (39 · 181%) | 10 · **39%** (39 · 153%) | 11 · **35%** (41 · 125%) | 14 · **37%** (44 · 117%) | 33 · **54%** (79 · 132%) |
| Shell (a shield on you with any Release, steady) | a module: 10 MP, a slot | you | 9 · **48%** (28 · 150%) | 9 · **43%** (28 · 129%) | 10 · **39%** (28 · 109%) | 11 · **35%** (29 · 89%) | 14 · **37%** (31 · 83%) | 33 · **54%** (57 · 94%) |
| Drain (a quarter of the HP a steady Damage Outburst takes; it lands 65% of the time) (not changed: a share of damage) | the Damage school at ×0.8 | you | 10 · **56%** (10 · 56%) | 10 · **48%** (10 · 48%) | 10 · **41%** (10 · 41%) | 11 · **33%** (11 · 33%) | 12 · **31%** (12 · 31%) | 21 · **35%** (21 · 35%) |
| Bard, Mend (rank II): the steady Buff heal with it (from Insight 5 and level 6) | as the heal | 1 | 52 · **280%** (212 · 1144%) | 59 · **275%** (228 · 1059%) | 69 · **270%** (244 · 960%) | 81 · **250%** (261 · 805%) | 90 · **238%** (264 · 697%) | 119 · **197%** (289 · 480%) |
| Guardian, Will Shield (with this caster's Healing given) | 3 AP, 20 MP, 1 Strain | 1 | 28 · **149%** (69 · 373%) | 32 · **147%** (75 · 349%) | 37 · **144%** (81 · 319%) | 43 · **133%** (87 · 269%) | 48 · **127%** (87 · 230%) | 63 · **105%** (87 · 145%) |

**3.7 The Faith build, normal share. Blessing power ×1.3 / 1.5 / 1.6 / 1.8 / 1.9 / 2.0; Devotion 3 / 3 / 5 / 7 / 7 / 10**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| Whisper: Health | 1 AP, once a turn | 1 | 7 · **35%** (20 · 105%) | 8 · **37%** (23 · 105%) | 9 · **36%** (24 · 94%) | 11 · **34%** (27 · 83%) | 13 · **35%** (29 · 75%) | 18 · **30%** (30 · 50%) |
| Whisper: Protection (a shield) | 1 AP, once a turn | 1 | 8 · **42%** (20 · 105%) | 9 · **44%** (23 · 105%) | 11 · **43%** (24 · 94%) | 13 · **41%** (27 · 83%) | 16 · **42%** (29 · 75%) | 22 · **36%** (30 · 50%) |
| Hymn I: Warm Hands (Mother Ember) | 3 AP, on a cooldown | 1 | 13 · **70%** (52 · 281%) | 16 · **73%** (60 · 279%) | 18 · **71%** (64 · 252%) | 22 · **69%** (72 · 222%) | 26 · **69%** (76 · 201%) | 36 · **60%** (80 · 133%) |
| Hymn I: Saint's Shield (Nerukhan) | 3 AP, on a cooldown | 1 | 16 · **84%** (52 · 281%) | 19 · **88%** (60 · 279%) | 22 · **85%** (64 · 252%) | 27 · **83%** (72 · 222%) | 31 · **83%** (76 · 201%) | 44 · **73%** (80 · 133%) |
| Hymn I: Coin for the Ferry (a Downed ally stands up with) | 3 AP, on a cooldown | 1 Downed | 7 · **35%** (13 · 70%) | 8 · **37%** (15 · 70%) | 9 · **36%** (16 · 63%) | 11 · **34%** (18 · 56%) | 13 · **35%** (19 · 50%) | 18 · **30%** (20 · 33%) |
| Hymn II: Hearthlight (each ally starting a turn in a 3 × 3, for 3 rounds) (from Devotion 5) | 3 AP, on a cooldown | each, each round | 5 · **28%** (13 · 70%) | 6 · **29%** (15 · 70%) | 7 · **28%** (16 · 63%) | 9 · **28%** (18 · 56%) | 10 · **28%** (19 · 50%) | 15 · **24%** (20 · 33%) |
| Hymn III: Absolution (every harmful condition ends, and a heal) (from Devotion 7) | 3 AP, on a cooldown | 1 | 9 · **49%** (39 · 211%) | 11 · **51%** (45 · 209%) | 13 · **50%** (48 · 189%) | 16 · **48%** (54 · 167%) | 18 · **49%** (57 · 151%) | 25 · **42%** (60 · 100%) |
| Mother Ember's intervention (an ally under a quarter HP) (Devotion 3) | no action; once a fight, twice from Devotion 7 | 1 | 25 · **135%** (42 · 225%) | 29 · **135%** (48 · 223%) | 40 · **157%** (64 · 252%) | 56 · **173%** (86 · 267%) | 59 · **156%** (91 · 241%) | 80 · **133%** (120 · 199%) |
| Miracle: Everyone Home, the shield on each (the heal to full is not changed) | once a session | each | 22 · **119%** (52 · 281%) | 27 · **125%** (60 · 279%) | 31 · **121%** (64 · 252%) | 38 · **117%** (72 · 222%) | 45 · **118%** (76 · 201%) | 62 · **103%** (80 · 133%) |

**3.8 The Faith build all in. Blessing power ×1.7 / 1.8 / 1.9 / 2.0 / 2.0 / 2.0**

| Source | Cost | On | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|---|
| Whisper: Health | 1 AP, once a turn | 1 | 9 · **46%** (26 · 138%) | 9 · **44%** (27 · 126%) | 11 · **42%** (29 · 112%) | 12 · **38%** (30 · 93%) | 14 · **37%** (30 · 79%) | 18 · **30%** (30 · 50%) |
| Whisper: Protection (a shield) | 1 AP, once a turn | 1 | 10 · **55%** (26 · 138%) | 11 · **53%** (27 · 126%) | 13 · **51%** (29 · 112%) | 15 · **46%** (30 · 93%) | 17 · **44%** (30 · 79%) | 22 · **36%** (30 · 50%) |
| Hymn I: Warm Hands (Mother Ember) | 3 AP, on a cooldown | 1 | 17 · **92%** (68 · 368%) | 19 · **88%** (72 · 335%) | 21 · **85%** (76 · 299%) | 25 · **77%** (80 · 247%) | 28 · **73%** (80 · 212%) | 36 · **60%** (80 · 133%) |
| Hymn I: Saint's Shield (Nerukhan) | 3 AP, on a cooldown | 1 | 20 · **110%** (68 · 368%) | 23 · **105%** (72 · 335%) | 26 · **101%** (76 · 299%) | 30 · **92%** (80 · 247%) | 33 · **88%** (80 · 212%) | 44 · **73%** (80 · 133%) |
| Hymn I: Coin for the Ferry (a Downed ally stands up with) | 3 AP, on a cooldown | 1 Downed | 9 · **46%** (17 · 92%) | 9 · **44%** (18 · 84%) | 11 · **42%** (19 · 75%) | 12 · **38%** (20 · 62%) | 14 · **37%** (20 · 53%) | 18 · **30%** (20 · 33%) |
| Hymn II: Hearthlight (each ally starting a turn in a 3 × 3, for 3 rounds) (from Devotion 5) | 3 AP, on a cooldown | each, each round | 7 · **37%** (17 · 92%) | 8 · **35%** (18 · 84%) | 9 · **34%** (19 · 75%) | 10 · **31%** (20 · 62%) | 11 · **29%** (20 · 53%) | 15 · **24%** (20 · 33%) |
| Hymn III: Absolution (every harmful condition ends, and a heal) (from Devotion 7) | 3 AP, on a cooldown | 1 | 12 · **64%** (51 · 276%) | 13 · **62%** (54 · 251%) | 15 · **59%** (57 · 224%) | 17 · **54%** (60 · 185%) | 19 · **51%** (60 · 159%) | 25 · **42%** (60 · 100%) |
| Mother Ember's intervention (an ally under a quarter HP) (Devotion 3) | no action; once a fight, twice from Devotion 7 | 1 | 32 · **173%** (54 · 294%) | 34 · **158%** (58 · 268%) | 48 · **189%** (76 · 299%) | 62 · **191%** (96 · 296%) | 62 · **164%** (96 · 254%) | 80 · **133%** (120 · 199%) |
| Miracle: Everyone Home, the shield on each (the heal to full is not changed) | once a session | each | 29 · **156%** (68 · 368%) | 32 · **149%** (72 · 335%) | 36 · **144%** (76 · 299%) | 42 · **130%** (80 · 247%) | 47 · **124%** (80 · 212%) | 62 · **103%** (80 · 133%) |

### 3.9 What else heals, shields or cleanses (not changed)

| Source | What it gives | Against the yardstick | Note |
|---|---|---|---|
| LEECH (Sigil, Delivery) | you heal half of the damage the spell dealt (+25% a copy) | **estimate, not measured:** a 3-glyph FIRE · LEECH · SEEK that lands heals about 45 at level 1 and 58 at level 6 (240% and 230%); it lands 65% of the time and takes 1.1 to 1.6 turns: about 75 to 140% over its turns | you only; it costs a damage word's place. A share of damage: **it moves when Sigil's damage moves** |
| Drain (the Damage school) | you heal a quarter of the HP it takes; the school at ×0.8 | 78 / 74 / 68 / 58 / 57 / 38% in steady play, misses counted | you only. **It moves when the Damage base moves** |
| CLEANSE (Sigil) | ends one harmful condition a copy, the newest first | – | a Line's work for one condition |
| Hope (a feeling) | you and each ally in the shape shake off one harmful condition | – | a rider. Cheaper than CLEANSE, but it has to have been felt (getting up from Downed) |
| Absolution (Nerukhan III) | every harmful condition, and a heal | 42 to 51% | Devotion 7 |
| The Buff school's Inspired and Guarded | +2 to hit; +2 Defense; 2 to 4 rounds by the stage | – | rules 1.19 |
| Thread (module) | the next heal on one of two linked allies is copied to the other, once | doubles one heal | counted by the round limit |
| Linger (module) on a Buff design; Love's and Guilt's residue | 5 a turn to each ally standing there, 2 rounds | 27% at level 1, 8% at level 20 | flat; no level factor |
| Split (module) on a healing Bolt | the nearest other ally within 2 is healed in full | 2 times the single heal | over the area band (item 1244) |
| Hold the Gate (Toll-Keeper II) | until your next turn nobody you see drops below 1 HP | not a number | a Hymn, every turn at Devotion 5 with a one-round cooldown (question 6) |
| Miracles: Everyone Home, Turned Back, Rewoven | to full; the fallen at half HP; HP back to the round's start | not a number | once a session, five levels of Devotion |
| Jealousy (a feeling) | steals the first enemy's shield | – | |
| **Not magic (the baseline):** Triage (Bard I) | 20 × Healing given, 2 AP, next to you, once an ally a turn | Healing given ×1.0: 108 / 93 / 79 / 62 / 53 / 33%; the Soul healer's ×1.6 to ×2.9: 173 / 177 / 173 / 154 / 148 / 96% | no level factor (question 2) |
| A stim; Stim Throw (Bard II) | 30 × Healing given, 1 AP (a dose; a Supply) | ×1.0: 162 / 140 / 118 / 93 / 79 / 50% | the same |
| Rally (Bard III) | 20 × Healing given to every ally within 4, once a scene | as Triage, each | the same |
| Shrug It Off II, Clean Hands, Last Charge (perks) | a shield of 10% or 15% of your max HP, or 15 × Armour Class, on yourself | 75 to 115% | a share of max HP: they keep pace with level already |
| A rest | out of a fight | – | not looked at |

## 4. What changed, rule by rule

1. **The level factor** (spec, rules 1.20, section 3; item 1232). Healing and shields from Sigil, the Outburst and prayer × the damage column of the enemy table at the caster's level. `packages/engine/src/effects/mending.ts`; a character's magic carries it as `mg.mend`.
2. **Sigil:** MEND 25 → **10**, WARD 30 → **12** (item 1233). The grammar around them is unchanged.
3. **Outburst, the Buff heal:** 30 → **7** (item 1234). **In a shape: ×0.4 each** (item 1235); before, a Buff heal in a Wave, Burst, Aura or Lance healed every ally in it in full.
4. **Love:** ×0.25 of the Buff school's heal at the Release's multiplier (the lone heal ×0.15; ×0.25 more on a healing or shielding Outburst), not ×0.35 and ×0.2 of the damage (item 1236). It reads Healing given now.
5. **Inverse:** a shield of **10** × Soul multiplier × the stage multiplier, not ×0.7 of the damage. **Shell: 4**, not ×0.35 of the damage (item 1237).
6. **Class moves:** Will Shield 30 → **12**; the Bard's Mend heals from **9** in place of 7 (it was 40 in place of 30) (item 1238).
7. **Prayer:** Health 15 → **5**, Protection 15 → **6**, Warm Hands 40 → **10**, Saint's Shield 40 → **12**, Absolution's heal 30 → **7**, Hearthlight 10 → **4**, Coin for the Ferry 10 → **5**, Everyone Home's shield 40 → **17**; Mother Ember's intervention 20 + 4 × Devotion → **10 + 3 × Devotion**, with no level factor (item 1239). The engine now reads these from `data/patrons.json`; it carried its own copies.
8. **The round limit:** spells and prayers restore at most half of a creature's max HP a round; a Miracle is exempt (item 1240).
9. **Stacking, as it stands and unchanged:** a shield lasts the fight; the bigger one stands, whoever gave it; it is taken after armour and before HP; Guard and armour work before it. Overhealing is lost. A shield and a heal are separate pools.
10. **Enemy casters keep everything they had** (item 1241).

Identity, in one line each: **Sigil** is the big single heal or ward that takes a turn or two to draw. **The Outburst** is the steady heal that reads the heart (stage and feelings) and the only one that covers an area cheaply; its shields come from the damage side of the sheet (Soul multiplier), its heals from Empathy. **Prayer** is small and cheap in AP (1 and 3), every turn, with a patron's rescue behind it.

## 5. The pairs under fire (measured)

`heal-measure.ts`, `underFire`. On the 16 × 11 ground of the rules 1.15 fit (see section 8 for why not the simulator's 26 × 26).

**The pair under fire.** The plain rifleman and one more character stand on the 16 × 11 ground under Soldiers that never fall (5,000 HP), 16 fights a cell, at most 10 rounds. Each cell: the rounds played before the first of the pair went Down (in brackets: the share of fights in which nobody went Down in 10 rounds). Under one Soldier almost nobody goes Down in 10 rounds, with or without support (at level 20, one idle pair in eight), so the table starts at two.

| The second character | L1, 2 Soldiers | L1, 3 Soldiers | L6, 2 Soldiers | L6, 3 Soldiers | L12, 2 Soldiers | L12, 3 Soldiers | L20, 2 Soldiers | L20, 3 Soldiers |
|---|---|---|---|---|---|---|---|---|
| standing idle (the control: the Soul healer; the others are within 0.2) | 4.6 | 2.6 | 4.7 | 2.6 | 4.3 | 2.6 | 4 | 2.1 |
| a Soul healer (Bard, Empathy first), healing | 7.1 | 3.9 | 8.6 (19%) | 4.6 | 8.6 (13%) | 5.8 | 8.9 (25%) | 4.4 |
| the Outburst caster (Channeler), healing | 8.6 (25%) | 3.4 | 8.9 (38%) | 3.8 | 7.9 (31%) | 3.7 | 9.4 (69%) | 3.1 |
| the Outburst caster, Inverse shields | 9.8 (75%) | 4.6 | 9.8 (81%) | 6 | 9.9 (75%) | 6.3 | 10 (100%) | 5.6 |
| the Sigil caster, MEND · SEEK every turn | 9.8 (56%) | 4 | 9.1 (31%) | 4.4 | 8.6 (13%) | 4.9 | 8.8 (31%) | 3.9 |
| the Sigil caster, the full MEND Line | 9.9 (69%) | 4 | 9.8 (69%) | 5.7 | 9.4 (88%) | 7.2 (31%) | 9.9 (88%) | 6.6 (6%) |
| the Sigil caster, WARD · SEEK (not known at level 1) | 4.6 | 2.6 | 8.7 (38%) | 4.3 | 8.4 (19%) | 4.6 | 8.4 (25%) | 3.1 |
| the Faith build, Health and Warm Hands (in Class 3 armour itself) | 9.8 (81%) | 4.2 | 10 (100%) | 5.3 (6%) | 9.9 (94%) | 7.1 (13%) | 10 (100%) | 5.8 |
| the Faith build, Protection and Saint's Shield | 8.8 (38%) | 3.6 | 9 (31%) | 3.7 | 8.2 (31%) | 3.9 | 8.1 (25%) | 2.9 |

The rifleman and two more characters, under two, three and four Soldiers (four is the whole fire of a standard fight, held for ten rounds on three characters):

| The second character | L1, 2 Soldiers | L1, 3 Soldiers | L1, 4 Soldiers | L6, 2 Soldiers | L6, 3 Soldiers | L6, 4 Soldiers | L12, 2 Soldiers | L12, 3 Soldiers | L12, 4 Soldiers | L20, 2 Soldiers | L20, 3 Soldiers | L20, 4 Soldiers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| two Soul healers standing idle (the control) | 6.4 | 3.4 | 1.8 | 6.1 | 3.1 | 1.8 | 5.9 | 2.9 | 1.7 | 6 | 2.4 | 1.6 |
| two Soul healers, healing | 9.6 (69%) | 6.7 | 3.7 | 9.6 (56%) | 7.6 | 5.9 | 9.9 (75%) | 8.6 (6%) | 7.4 | 9.9 (81%) | 8.1 | 6.7 |
| two all-in Soul healers | 9.7 (75%) | 7.8 | 5.4 | 9.7 (69%) | 8.3 | 6.7 | 9.8 (81%) | 8.4 | 6.3 | 10 (94%) | 7.6 | 5.1 |
| a Soul healer and an Inverse shielder | 10 (94%) | 9.3 (38%) | 5.8 | 10 (100%) | 9.5 (56%) | 7.8 | 10 (100%) | 9.9 (88%) | 8.6 | 10 (100%) | 10 (94%) | 8.6 (6%) |

1. **One healer about doubles how long a pair lasts under two Soldiers** (4.0 to 4.7 rounds without, 7 to 10 with) and does not hold three (2.1 to 2.6 without, 3.4 to 7.2 with).
2. **Two healers do not make three characters unkillable:** under four Soldiers somebody is Down after 3.7 to 7.4 rounds, in every fight. All in changes little (the all-in healer has less HP and is shot too).
3. **A healer and a shielder together are the strongest pair:** under three Soldiers nobody goes Down in 38 to 94% of fights; under four, somebody does in 94 to 100%, after 5.8 to 8.6 rounds. A shield is refilled to its size every turn, so it is worth more than its number says when the fire is spread. Flagged (section 14, item 1243; the report's question 4).
4. The Faith build looks strongest in the first table because it wears Class 3 armour: it heals less a round than the Soul healer (about 105% of a Soldier-turn for 4 AP, against 150 to 180% for 6), and takes half the damage itself.

What the supporters' policies do: an Outburst healer Begins the starting Mend, Pumps with Rage (when the heart has room), Love, then any feeling that costs nothing, and Releases on the most wounded of its side; the shielder does the same with an Inverse design on whoever holds the smallest shield; the Sigil caster walks a MEND or WARD Line straight away from the ally and Evokes it back; the Faith build prays Health or Protection every turn and its patron's Hymn when it is ready. **What they don't model:** the rifleman never moves, so reach and line of sight cost the supporter nothing; nobody is ever out of the fight for good (the Soldiers never fall, so it never thins out); the enemy's focus is the engine's own (the most hurt first).

**What this says about prayer.** The first fit put Warm Hands at 20 (141% of a Soldier-turn) on the assumption that a Hymn is not an every-turn action. It is: the cooldown is one round from Virtue 4, and the Faith build prayed it in 8 rounds of 10 with a Whisper beside it, for 4 AP. Warm Hands went to 14 and then to **10** (70%), which puts a prayer-led turn of healing at about 105% for 4 AP, with 2 AP left to shoot. The Faith fit's report suggested 13 to 14 for Warm Hands (a Hymn and a Whisper together at about 133%); I settled lower because the band is for a whole turn and this is two thirds of one: at 14 the Faith healer would out-heal the Outburst healer (125% for 6 AP) and still shoot. Saint's Shield is 12 (×1.2), Absolution's heal 7 (it also ends every harmful condition). If a Hymn stops being an every-turn action, these three go back up (section 10).

## 6. Nothing makes a squad unkillable?

1. **Two healers:** no. The round limit holds them on one ally (half the rifleman's HP is about 3.7 Soldier-turns; a standard fight brings about 4.4), and under four Soldiers a trio with two healers loses somebody in every fight.
2. **All in:** a healer with every point in Empathy heals 153 to 218% in a steady turn, 197 to 280% with the Bard's Mend. Under fire it does little better than the normal-share healer: it has 115 to 210 HP and is shot too.
3. **A heal and a shield:** the closest thing to it. A trio with one healer and one shielder holds three Soldiers for ten rounds in 38 to 94% of fights. Four Soldiers still break it. Two characters of a squad of four spent on support leave two to do the killing. I did not cut the shields further for this (question 4).
4. **Hold the Gate** makes a squad unkillable for a round, every round its cooldown allows. Not a number; not changed (question 6).
5. **Before this pass** the same check was not close: a new caster's steady heal alone undid more than a standard fight's whole fire at level 1 (6.6 Soldier-turns against 4.4).

## 7. Not met, and what is estimated

1. **The quick Outburst heal** is 43 to 53% (band 50 to 75%). The stage table gives stage 1 half of a steady stage 4 with feelings; raising the base to fix it would push the steady turn over.
2. **The Outburst's biggest heal** is 139 to 146% from level 9 (band 150 to 175%): the reference Channeler's Healing given stops growing between levels 9 and 12.
3. **A full MEND Line** is 207 to 208% over its turns at levels 12 and 20 (band to 200%); at level 1 there is no 4-glyph Line.
4. **A healer built for it** (Empathy first) sits at 151 to 179%, over the 100 to 150% the bands were set on (the reference Channeler). Deliberate: the bands are for the caster who also heals; the specialist is a fifth to a third better. Say if the specialist should be the one at 125%.
5. **Split** on a healing Bolt (twice the heal for one slot) and **the heal and shield pair** (section 6.3) are over.
6. **Estimates, not measurements:** LEECH's numbers (section 3.9); the standard fight's 4.4 Soldier-turns a round (3 Soldiers and an Elite at 1.4, from the damage factors ×1.05 / ×0.78 and the hit chances of rules 1.15); "a Soldier-turn on a caster is about twice the rifleman's" (18 against 8 a hit at level 1, 38 against 27 at level 20: it is 2.25 times at level 1 and 1.4 times at level 20); everything in section 3 is arithmetic on real sheets, not simulated casting (the turns a Line takes are the 1.17 run's).
7. **Not played by the simulator:** whole fights with a healer in the squad of four; area heals; Love on a Damage Outburst; Shell; an enemy healer.
8. **Side effects not chased:** the music traits start a song on "a big heal" of 30 HP or more and "a shield of 30 or more" (harder to reach at low levels now); Love's own trigger and Mother Ember's liked tags do not read amounts and are unaffected; the AI Narrator's prompt was not checked for old numbers.
9. **Not run:** no browser suite; `npm run build`; the screen data (`python3 design/canvas-build/build.py --web`), which still carries the old card texts.

## 8. Why an enemy does not fire at 13 tiles (item 1086): found, not fixed

On the 26 × 26 ground the sides start 13 or 14 tiles apart and an enemy with a rifle stands still for the whole fight. The cause is two tests that disagree in `packages/engine/src/combat.ts`:

1. `previewAttack` refuses a shot past 12 tiles with "You can't see it" (measured: at 13 tiles refused, at 12 tiles 65%).
2. `enemyCloseTile` decides whether to walk by asking "is there a tile from which I have a line on someone?", and its test for that is the weapon's range (16 for the service rifle, 14 for the bullpup, 18 for the machine gun) and line of sight. At 13 tiles its own tile passes, so it scores as good as any other and the enemy does not move.

So it thinks it has a shot from where it stands, is refused the shot, and stays. **Real fights share it:** rules 1.16 deploys the sides 10 to 14 tiles apart, so any enemy whose weapon reaches past 12 tiles and who starts 13 or 14 tiles from everyone with a clear line will stand still until a character walks to within 12. The fix is one line's worth (make `enemyCloseTile` use the same sight limit as the attack), but it changes every fight's opening and every number fitted since, so it is the lead's call. Everything "under fire" in this report is from the 16 × 11 ground, where the sides are 11 tiles apart.

## 9. Questions for Leon

Each with what I recommend, which is what is built unless it says otherwise.

1. **Is one Soldier-turn the right size for a healer's turn?** Built: a steady turn of Outburst healing undoes about 1.25 Soldier-turns (17% of the rifleman's HP), the mirror of your 125% for damage. That is a cut to a fifth of what it was at level 1. **Recommended: keep it.** A standard fight was already won 98 to 100% of the time with no healer in the squad. If you want healing to feel bigger, the dials are one number each and move nothing else: `schools[buff].heal` (7; at 9 a steady turn is 140 to 170%), `mend.heal` (10), `ward.shield` (12), and the prayer bases.
2. **Triage and the stim are now better than a spell at low levels.** A Triage is 20 × Healing given for 2 AP with no level factor: 108% of a Soldier-turn at level 1, 33% at level 20; a 1 AP stim 162% and 50%. **Recommended: fit them in a medic pass with the same level factor** (Triage 8, the stim 10 and Rally 6 would put them where the Whisper and the Hymn are). Not built: the ask was magic.
3. **The round limit: half of max HP a round from spells and prayers.** **Recommended: keep it.** It never binds a single normal healer (the biggest single heal, the full Line, is about a third of the rifleman's HP) and it is what holds two healers, Thread, Rich air and Camaraderie together. It can clip a full Line on a caster-sized target that was already healed that round.
4. **Shields.** A shield is ×1.2 the heal of the same cost, lasts the fight, and is refilled to its size every turn, so a healer and a shielder together hold three Soldiers. Two ways to close it: count a shield toward the round limit (so a heal and a shield on one ally share the half), or make a spell's shield last 2 rounds and be ×1.5. **Recommended: leave it as built for the playtest**; if it shows, count shields toward the round limit (the smaller change).
5. **MEND and WARD multiply two multipliers** (Sigil multiplier × Healing given). A Mage has Healing given ×1.0, so the reference numbers are safe; a character with Intelligence and Insight both high doubles or triples them. **Recommended: leave it** (it costs two attributes), and look again if a playtest builds it.
6. **Hold the Gate** (nobody you see drops below 1 HP until your next turn; a Hymn with a one-round cooldown). No band can hold it. **Recommended for the Faith fit (rules 1.21): once a fight**, or the cooldown floor that report's question 2 raises.
7. **Enemy casters were not touched.** An enemy MEND is still 25 and grows with the enemy's level. Whether an enemy healer should be refitted is a question for the enemy table. **Recommended: leave it.**
8. **The Outburst's damage targets are going to 135% and 165%.** Heals and shields will not move with the damage base any more. **Recommended: leave the heal bands at 125% and 150 to 175%.** If they should follow, the Buff heal goes from 7 to 8 (a steady turn at 125 to 150%, the biggest heal at 160 to 195%).

## 10. For the Faith fit (rules 1.21)

1. Prayer heals and shields carry Blessing power × the level factor and nothing else. I assumed no other scaling on them: a second one would need the bases in section 4.7 lowered by what it adds. At the time of writing `faith.ts` has none.
2. I assumed the cooldown as it is today (one round from Virtue 4). If Hymns become rarer, Warm Hands and Saint's Shield are low for a set-piece: 20 and 24 were the numbers that fitted "125 to 150%, not every turn".
3. The damage interventions' 20 + 4 × Devotion are untouched; Mother Ember's heal has its own two numbers on her entry (`intervention.effects[0]`), and the validator lets a healing intervention carry its own.
4. `healUnit` has a sixth argument, `{ noLimit }`, for a Miracle.

## 11. Files, and how to run

| File | What |
|---|---|
| `docs/rules/PHC-Core-Rules-v1.0.md` | "Rules revision 1.20"; section 14 items 1230 to 1247; the old tables it replaces carry a note |
| `data/rules.json` | `mending` (the level factor's source, the round limit, the area share) |
| `data/sigils.json`, `data/soul_modules.json`, `data/feelings.json`, `data/classes.json`, `data/patrons.json` | the bases and card texts |
| `tools/validate.py` | a healing intervention may carry its own numbers |
| `packages/engine/src/effects/mending.ts` (new), `effects/damage.ts` (`healUnit`: the round limit), `effects/index.ts` | the level factor and the limit |
| `packages/engine/src/sigil.ts`, `magic.ts`, `classes/i.ts`, `faith.ts` | the sources |
| `apps/web/src/game/heartView.ts`, `actionPickers.ts`, `apps/web/src/screens/create.js` | the design card's numbers; "Heal 30" reads "Heal" |
| `packages/engine/test/rules120-heal-shield.test.ts` (new) | the rules, 12 tests |
| `packages/engine/test/balance/heal-measure.ts`, `heal-measure.test.ts` (new) | the instruments; 8 cheap tests in `npm run check`, the full run behind `HEAL_MEASURE=1` |
| The older engine and web tests that pinned these numbers (15 files) | edited to the new ones; each says rules 1.20 where it does |

```
npm run check                                   everything
npm run check -- -t "rules 1.20"                the rules
HEAL_MEASURE=1 npx vitest run --root packages/engine test/balance/heal-measure.test.ts --silent=false
    HEAL_MEASURE_N=16   HEAL_MEASURE_LEVELS=6,12   HEAL_MEASURE_PARTS=yard,inv,fire   HEAL_MEASURE_ROWS=Faith
```

The full run is about 35 minutes at 16 fights a cell (vitest prints nothing until it ends). The tables above are from it (the prayer rows from a second run after Warm Hands changed).
