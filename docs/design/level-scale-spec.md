# The level scale: a hit grows about ×15 from level 1 to 20 (spec, 13 Nov 2026)

Leon's ruling (13 Nov 2026, binding; `class-roster-rev4-proposal.md`, the last block, half B): *"Going in at level one
players are used to about 20 damage per hit, then late game they do about 300 per hit, even more with crits and
ultimates and such."* Everything measured in HP grows with it; everything that is a percent or a ratio stays. Half A
(ordinary enemies lag behind the party) is section 6, for the Survival spec. Built in step 7b of
`handoffs/CLASSES-3.0-PICKUP.md`, together with `heal-shield-percent-spec.md`. Every number here is **PROVISIONAL**.

**The principle.** At each level L there is one number, **`scale(L)`**: the new size of the game at that level over
today's. Every HP-denominated quantity at level L is multiplied by `scale(L)`: what deals damage, what takes it, what
stops it, what restores it. Every ratio between them is then the same as today, so every fight between equals lasts
exactly as long as today (to integer rounding), the balance contract holds unchanged, and level 1 (`scale` = 1) is
identical to the digit. The re-scale is a change of units that grows with level, not a re-balance.

## 1. The target

**A hit today** (`builds-normal.json`, `build/plain_gun/normal/*/plain/soldier`): the Hellraiser service rifle (30) ×
the weapon profile's k 1.5 × `output.level.deal` = 45 at level 1, less a Soldier's armour 5 = **40**; at level 20
30 × 1.5 × 1.6 = 72, less 8 = **64**. Growth ×1.6 over a whole campaign (51 sessions): Leon's complaint.

**Leon's "about 20" is lower than the data's 40** (a pistol hits a Soldier for 25, a knife 25). Level 1 must not move
(section 4), so the ruling is read as its **ratio**: the same plain hit grows **×15**, 40 at level 1 to **600** at 20
(question 1 offers the other reading, ×7.5 to an absolute 300).

**The curve: geometric by level, ×1.1532 a level** (15^(1/19)). The new `deal` column is exactly 1.1532^(L − 1):

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Session reached (XP table) | 1 | 1 | 1 | 2.5 | 4.5 | 7 | 9.5 | 12 | 14.5 | 17 | 20 | 23 | 26 | 29 | 32 | 35 | 39 | 43 | 47 | 51 |
| `deal` today | 1 | 1.067 | 1.1 | 1.167 | 1.2 | 1.267 | 1.3 | 1.367 | 1.4 | 1.467 | 1.5 | 1.567 | 1.6 | 1.6 | 1.6 | 1.6 | 1.6 | 1.6 | 1.6 | 1.6 |
| **`deal` new** | 1 | 1.1532 | 1.3298 | 1.5336 | 1.7685 | 2.0394 | 2.3518 | 2.712 | 3.1275 | 3.6066 | 4.1591 | 4.7962 | 5.5309 | 6.3781 | 7.3552 | 8.4819 | 9.7812 | 11.2796 | 13.0074 | 15 |
| **`scale` = new ÷ today** | 1 | 1.0811 | 1.2089 | 1.3145 | 1.4737 | 1.6101 | 1.8091 | 1.9844 | 2.2339 | 2.459 | 2.7727 | 3.0614 | 3.4568 | 3.9863 | 4.597 | 5.3012 | 6.1133 | 7.0498 | 8.1296 | 9.375 |
| Plain hit on a Soldier, today | 40 | 43 | 44 | 46 | 48 | 51 | 52 | 54 | 56 | 59 | 60 | 62 | 64 | 64 | 64 | 64 | 64 | 64 | 64 | 64 |
| **Plain hit on a Soldier, new** | 40 | 45 | 52 | 61 | 70 | 81 | 93 | 109 | 124 | 144 | 166 | 191 | 220 | 255 | 293 | 339 | 391 | 451 | 520 | 600 |

**Why geometric by level** (and not by session or front/back-loaded): (1) the level-up is the moment a player feels;
every one is worth the same +15%, and the old plateau (no damage growth at all from level 13 to 20, the 26 sessions
where two thirds of the campaign is played) is gone. (2) Growth per hour comes out mildly front-loaded on its own,
because levels come fast early: sessions 1 to 17 bring ×3.6 (40 → 144), sessions 17 to 51 ×4.2 (144 → 600); early
sessions are where a group decides to stay. A curve even by session would leave levels 2 to 10 flat (×2.5 by session
17), which is the complaint again. (3) Section 6 needs one level of lag to be worth the same at every level.

**Everything that damages takes the same growth.** Today each damaging thing grows by one of four things: `deal`
(weapons, Sigil, Outburst, flat things a character makes), the enemy table (enemies, their spells and splash, flat
things made by nobody), `mend` (heals and shields), or nothing (prayer damage, interventions, Smite, the `physical`,
`elemental` and `healing` profiles, Guard, objects). Each is multiplied by `scale`, so each keeps its place against the
plain rifle: "flat things grow with level" keeps its meaning and gains the same ×15.

**The same hits at level 20** (golden lines today × `scale`(20) 9.375; armour 75 on a Soldier):

| On a Soldier | Level 1 | Level 20 today | Level 20 new |
| --- | --- | --- | --- |
| Plain rifle, normal share (hit / critical) | 40 / 68 | 64 / 123 | **600 / 1,154** |
| Sabre, normal share (`plain_blade`) | 51 | 82 | 776 |
| Outburst, the biggest Release (stage 4, all in) | 76 | 130 | 1,150 |
| Sigil, full Line (stone, fire, condense, seek, all in) | 172 | 275 | 2,576 |
| Sigil, the best full Line (shock, fire: armour-free) / its critical (×2.0 at most) | 172 | 360 | 3,375 / about 6,700 |
| A Miracle (The Sky Answers, Faith 10, Devotion 10) | | 303 | 2,841 |
| A Weapon Art (not built; the budget rule's ultimate tier 2.5, twice the plain all-in turn) | | | about 2 × a plain turn |

## 2. Everything measured in HP

Generated from the data (every `amounts` block by profile, every numeric field named hp, damage, armour, shield, heal,
soak, burn, cap, by a scan of `data/*.json`) and the catalogue (`ENGINE-HOOKS.md`: profiles, Level tables,
`flatLevelOf`, `mendFactor`). **S** = scales by `scale` (automatically, through a column it already reads, or by
reading `scale` where its number is used); **R** = a ratio, stays; **?** = a ruling.

| Quantity | Its dial today | How it moves |
| --- | --- | --- |
| Weapons, Sigil Lines, Outbursts (damage and Soul shields), flat things a character makes (grenades, charges, traps, Bleeding/Burning/Corroded ticks, Flux overload, the `flat` blocks on perks, traits, classes) | `output.level.deal` via profiles weapon, sigil, soul, flat | **S, data**: the new `deal` column |
| Prayer damage, Smite, interventions (20 + 4 × Devotion), prayer chains, the Toll-Keeper's 40 | profile `blessing`, level `null` (`faith.ts` multiplies `levelOf('blessing')` by hand) | **S, data**: `blessing.level` → `"scale"` |
| Amounts on `physical`, `elemental`, `healing` (Grenadier's Arm, Storm Hand, school rider, shelved heals) | level `null` | **S, data**: their `level` → `"scale"` (verify, section 7: the factor check catches a double count) |
| Heals and shields (every `mend`, `sigil_mend`, `soul_mend`, `blessing_mend` source, the kit) | `output.level.mend` | **S**: the percent spec's `mend` column × `scale` (section 2a) |
| Enemies' HP, armour, damage (and through `lvlDmg` their spells, splash, grenades, ticks; companions and owned units, which use the rows at their owner's level) | `enemies.json levels.table` hp_mult, armour_mult, damage_mult | **S, data**: each column × `scale` (section 7) |
| Enemies' Defense and attack bonus | `defense_plus`, `attack_plus` | **R**: unchanged |
| Flat things made by nobody (hazards, map traps, barrels) | `flatLevelOf` → the enemy damage column at the fight's level | **S**: through the new column; see 2a (it must keep reading the enemy row) |
| **Players' max HP** | `character.ts maxHp`: 100 + 15(E − 1) + (L − 1)(5 + 2 PT) | **S, one site**: `round(scale(L) × fx(c, 'hp', …))` (below) |
| Players' armour (Class 1 to 5: 5 / 10 / 15 / 20 / 25) | `character.ts ARMOUR` | **S, one site**: × `scale` at the wearer's level |
| Guard's soak (10 a point) | `techniques.json rules.guard.soak` (`physical/guard.ts`) | **S, one site**: × `scale` at the holder's level; Guard *points* (5 at most, parry's 2, brace's 1) **R** |
| Armour ignored or added by a technique (Half-sword 10, Charge's point 5) | `techniques.json` numbers | **S**: × `scale` at the user's level |
| Strain's burn (8 a point) | `soul_modules.json strain.burn_per_point` (`magic.ts STRAIN_BURN`) | **S**: × `scale` at the caster's level |
| A feeling's HP price (8 a step), Shame's self-damage (8), residue (5 a tile), the Aura tick (5) | `feelings.json price.hp_per_step`, items; `soul_modules.json aura.tick_damage` | **S**: × `scale` at the caster's level, unless the golden line shows it already rides the Release's `deal` |
| Cover and objects (crate 30, low wall 60, pillar 80, barricade 60, door 40, barrel 20, turret 60, sigil wall 30 …; cover 30 / 80) | `objects.json` hp, `rules.json combat.attack.cover` | **S** at the fight's level (`makeObject`, `COVER_HP`); question 3 |
| Objects a character makes or carries (Raise's barrier 30, Watch 10, the pavise 80, deployed cover and turret 40) | `sigils.json`, `items.json`, `classes.json` | **S** at the maker's level |
| Shields and heals that are a share of max HP or of a hit (Shrug It Off 10%, Clean Hands 15 / 25%, Field Surgeon 50%, Trick Shot and Breaching Strike half a hit, Chitin 30%, Drain 25%, Love's shares, the stim's 20%) | `per: max_hp`, `mults.share`, `pct_of_max_hp` | **R**: they follow their base. Any of these blocks that also carries a Level term today (profile `flat`) **drops its profile** (absent = no Stat, no Level), or it grows by `scale`² |
| Flat HP gains inside the HP formula (Factory Made 10 a point, Oil −2 a level) | traits, through `fx(c, 'hp')` | **S**: `scale` wraps `fx` |
| The Elite and Boss guard (left on 1 HP); Downed at 0; stabilise at 1; the max(1, ·) floor on a hit | `full_hp_guard.hp`, `combat.downed` | **R**: a state, not an amount. The 1-damage floor does not scale: a Vermin on plate stays a 1 (accepted) |
| Thresholds in percent ("below half HP", "25% of max HP in one hit", Finish under 50%, Coup 25%, the healer notice 10%, a short rest 25%, the heal cap 50%, the gate's percents) | each item | **R** |
| The gate's counting ceiling (145 HP) | `mending.gate.hp` (percent spec) | **S**: 145 × `scale` at the healer's level (2a) |
| The Ledger's cap, the healing echo, Brimming, Take the Weight (Classes 3.0) | through `tend.k` × `mend`, or shares | **S** / **R** automatically |
| MP, its costs, the pools, Flux, the mana meter, cores, Echo, AP | | **No** (below) |
| Loot, credits, prices, XP, Devotion XP | | **No**: not HP. A stim's price stays; it heals 20% at every level |
| The contract's HP yardsticks: `balance.yardsticks.soldier_turn` (18.5 / 21.5 / 25.4 / 32.4 / 37.8 / 60.2 at 1 / 3 / 6 / 9 / 12 / 20) | data | **S**: 18.5 / 26.0 / 40.9 / 72.4 / 115.7 / 564.4 |

**Players' HP, the new formula:** `max_hp = round(scale(L) × (100 + 15(Endurance − 1) + (L − 1)(5 + 2 × Pain
Threshold)))`, perks and traits inside. A point of Endurance is worth 15 × `scale(L)` HP (15 at level 1, 141 at 20) and
a point of Pain Threshold 2(L − 1) × `scale(L)`: **the same share of the bar as today at every level**, so neither
attribute nor skill gains or loses worth. `rules.json derived.body.max_hp` text follows.

| Build | Level 1 | 5 | 10 | 20 (today → new) |
| --- | --- | --- | --- | --- |
| Frail (Endurance 1, PT 0) | 100 | 120 → 177 | 145 → 357 | 195 → 1,828 |
| Normal (the contract's rifleman, measured) | 145 | 181 → 267 | 244 → 600 | 445 → 4,172 |
| Tank (`tank` all in) | 190 | 289 → 426 | 460 → 1,131 | 710 → 6,656 |

**Enemies** (tier HP / armour, today → new): Soldier 140 / 5 at level 1; 182 / 6 → 268 / 9 at 5; 225 / 7 → 554 / 18 at
10; 253 / 8 → **2,376 / 75** at 20. Elite 434 / 16 → 4,073 / 150 at 20; **Boss 1,484 / 16 → 13,915 / 150**; Minion 127
→ 1,188; Vermin 27 → 255. A Soldier's hit on the Class 3 rifleman at 20: 27 → 258 (of 4,172 HP: 6.2%, as today's 6.1%).

**MP does not scale.** MP is counted in casts: a pool and its costs in the same unit (Begin 20, Pump a tenth, Max MP
100 + 75 × (Determination − 1) + …). Multiplying both by `scale` changes no decision and only enlarges numbers; what an
MP buys (damage, heals) already grows through `deal` and `mend`. Where MP and HP meet, the HP side scales (Strain's
burn, a feeling's HP price) and the shares stay (the Quartermaster's 25%, Drain's 25%).

### 2a. With the percent spec (one step, so the two must agree)

1. **`output.level.reference_hp`** = the percent spec's R(L) × `scale(L)`: 145, 165, 196, 226, 270, 312, 374, 437,
   523, 612, 735, 863, 1,034, 1,264, 1,549, 1,893, 2,305, 2,813, 3,431, 4,172 (the smoothed rifleman under the new
   HP formula).
2. **`output.level.mend`** = the percent spec's M(L) × `scale(L)` (M is R(L)/R(1) × S_all(1)/S_all(L) held
   non-decreasing; S_all does not change): 1, 1.143, 1.278, 1.462, 1.742, 1.903, 2.274, 2.655, 3.002, 3.516, 4.215,
   4.947, 5.932, 7.259, 8.877, 10.841, 13.235, 16.137, 19.666, 23.934. The builder recomputes it from item 1 and keeps
   the rounding to three places. Every percent in that spec (65, 59, 45, 15, the 70 shield, the 20% gate, the 50%
   cap) is unchanged; every HP number in its tables is × `scale` (its full assault 55 / 67 / 89 / 151 → 55 / 99 /
   219 / 1,416; floor (a) 18 / 21 / 25 / 38 → 18 / 31 / 61 / 356).
3. **The gate's 145** (`mending.gate.hp`) is a level 1 HP, so it is read as **145 × `scale`** at the healer's level
   (157, 175, 191, 214 … 1,359): one term inside the new `mendGate`. Kept at a flat 145, the gate would stop mattering
   from level 2 and the percent spec's "untrained" column would fall below what Leon approved.
4. **`flatLevelOf`** (`effects/mending.ts`) reads `levelFactor('mend', cb.level)` for flat things made by nobody, which
   today *is* the enemy damage column. When the percent spec turns `mend` into its own array, this path must read
   `enemyLevelRow(cb.level).damage_mult` (or a `levelFactor` column of that name), in the same commit, or every hazard
   and barrel takes the heal curve. Enemy heals already take their own damage column (percent spec, section 3), which
   is × `scale` here.

## 3. What must not change, and the proof

**Unchanged:** every line of the contract (percent of a same-level rifle-turn, Soldier-turns, percent of HP), its
ceilings, tolerances and the guard's bands; to-hit, Defense, attack bonuses, criticals' multipliers; AP, MP, Flux,
ranges, conditions' rounds; rounds-to-kill between equals; the fight lengths the contract and rules 1.25 aim at
(standard fight 4.3 to 6.0 rounds, the boss fight 8 to 10).

**Rounds-to-kill, the arithmetic** (an estimate: rifle-turn 69.7 / 91.8 / 101.7 / 110.9 HP at 1 / 5 / 10 / 20 on a
Soldier, scaled by the hit on each tier and −5% hit chance a point of extra Defense; enemy turns 18.5 / 24.1 / 34.2 /
60.2 for a Soldier, the percent spec's estimates for the Elite and Boss; HP with the integer rounding of both scales):

| Level | Rifleman kills a Soldier | an Elite | a Boss (alone) | A Soldier kills him | an Elite | a Boss |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.01 → 2.01 | 4.26 → 4.26 | 15.9 → 15.9 | 7.84 → 7.84 | 3.54 → 3.54 | 2.64 → 2.64 |
| 5 | 1.98 → 2.00 | 4.21 → 4.27 | 15.7 → 15.9 | 7.51 → 7.39 | 3.69 → 3.71 | 2.78 → 2.84 |
| 10 | 2.21 → 2.23 | 4.76 → 4.74 | 17.8 → 17.7 | 7.13 → 6.82 | 3.87 → 3.81 | 2.98 → 2.95 |
| 20 | 2.28 → 2.29 | 4.85 → 4.85 | 18.1 → 18.1 | 7.39 → 7.25 | 4.24 → 4.19 | 3.35 → 3.31 |

Within 2% everywhere but one cell: a Soldier on the rifleman at level 10 (−4%). It is rounding, not a drift: today's
hit there is 14 (a floored 29 less armour 15), a small integer whose rounding the new scale removes (36 = 73 less 37).
The guard decides: it measures the same ratios, and the simulator's 5,000-HP range target is a tier base, so it grows
with `hp_mult` by itself.

## 4. Level 1 stays to the digit

`scale(1)` = 1, `deal(1)` = 1, every enemy row 1 at level 1, `mend(1)` = 1, `reference_hp(1)` = 145, the gate's
145 × 1. Every level 1 number in the game is unchanged: HP 145 for the rifleman, a hit of 40, the Soldier's 140 HP,
the Recruit's 125, the percent spec's level 1 numbers. M-number campaigns and the Proving Ground start where they do.
The re-scale is visible from level 2 (+8%) and grows from there.

## 5. Display

The largest numbers: a level 20 Boss's 13,915 HP, a tank's 6,656, a critical full Line about 6,700. So up to five
digits. **HP bars** are a fraction of max and need nothing. **Numbers** (bar text, damage floats, the combat log, hover
and sheet cards, the level-up screen's "+N HP") are written with thousands separators, `toLocaleString('en-GB')`
style (13,915), never abbreviated in the log; a floating number may shorten from 10,000 (13.9k). Check the widest case
at five digits on the HP bar text and the unit hover card (`npm run e2e -- layout`, `combat-portraits`); no layout
change is intended. **Rounding:** as today, once, at the end: an amount floors (`dealt = max(1, floor(amount) −
armour)`), max HP and armour round, a heal floors at the sink, the gate rounds up. `scale` and the columns are stored
to four places; nothing is rounded between them.

## 6. Half A, for the Survival spec: ordinary enemies lag behind

Today a lag means nothing at the top: a level 17 Soldier against level 20 has 99% of the HP and 90% of the damage
(the old table is flat from 13). Under the new curve **one level of lag is about ×0.87 of HP, armour and damage, plus
one point to hit both ways** (the gap rule, `levels.gap.to_hit_per_level`): a lagging Soldier dies about 20% sooner
and deals about 20% less, **about two-thirds the threat** (damage × lifetime). Two levels: ×0.75, about 0.42 of the
threat; three: ×0.65 (×0.60 at level 5), about a quarter of the threat.

**Proposed rule** (a field on each tier, `enemies.json items[].lag`, read where the fight level is given to a unit;
floor level 1): **Vermin and Minions −3, Soldiers −1 (−2 from party level 10), Elites and Bosses 0.** Never 5 or more
(the gap rule's one-hit line). This is what makes a level feel like power: the trash you fought at level 7 is a third as
dangerous at level 10. The contract's yardsticks stay defined between equals; the Survival spec's encounter budget
prices a lagging enemy at its threat (a Soldier at −1 is about 0.65 of a Soldier, at −2 about 0.42) so the fight's
length is kept by more bodies, not by stronger ones. The Narrator's per-fight shift (−3 to +2) stays on top.

## 7. How it is built and pinned

**Built from** (no handler, no new formula beyond one factor on the HP formula):

| Rule | Primitive |
| --- | --- |
| Damage grows ×1.1532 a level | `output.level.deal` (new values), read by profiles weapon, sigil, soul, flat |
| Enemies grow the same | `enemies.json levels.table` (three columns × `scale`) |
| What grows by nothing today | profiles' `level: "scale"` through `levelOf` / `levelFactor` |
| Heals and shields | `output.level.mend` (percent spec) × `scale` |
| Numbers read in code with no Level term (max HP, player armour, Guard's soak, Strain's burn, feeling prices, objects and cover, technique armour) | `levelFactor('scale', the level of whoever owns the number)` at the one place each is read |
| Ratios | unchanged; ratio blocks lose any Level term |

**Needs a new primitive:** (1) the column **`output.level.scale`** (20 values); (2) **`levelFactor(column: string,
level)`** reads any named array of `output.level` (today it takes only `'deal' | 'mend'` and special-cases `mend`; the
percent spec removes the special case). `ENGINE-HOOKS.md` regenerates; the lints' baselines do not grow.

**The data fields:**

| File, field | Today (levels 1 to 20) | New |
| --- | --- | --- |
| `rules.json output.level.scale` | (new) | 1, 1.0811, 1.2089, 1.3145, 1.4737, 1.6101, 1.8091, 1.9844, 2.2339, 2.459, 2.7727, 3.0614, 3.4568, 3.9863, 4.597, 5.3012, 6.1133, 7.0498, 8.1296, 9.375 |
| `rules.json output.level.deal` | 1, 1.067, 1.1, 1.167, 1.2, 1.267, 1.3, 1.367, 1.4, 1.467, 1.5, 1.567, 1.6 (to 20) | 1, 1.1532, 1.3298, 1.5336, 1.7685, 2.0394, 2.3518, 2.712, 3.1275, 3.6066, 4.1591, 4.7962, 5.5309, 6.3781, 7.3552, 8.4819, 9.7812, 11.2796, 13.0074, 15 |
| `enemies.json levels.table[].hp_mult` | 1, 1.07, 1.16, 1.23, 1.3, 1.38, 1.43, 1.49, 1.54, 1.61, 1.67, 1.74, 1.78, 1.78, 1.79, 1.79, 1.8, 1.8, 1.81, 1.81 | 1, 1.157, 1.402, 1.617, 1.916, 2.222, 2.587, 2.957, 3.44, 3.959, 4.63, 5.327, 6.153, 7.096, 8.229, 9.489, 11.004, 12.69, 14.715, 16.969 |
| `…armour_mult` | 1, 1.04, 1.09, 1.16, 1.2, 1.27, 1.29, 1.36, 1.4, 1.47, 1.49, 1.56, 1.6 (to 20) | 1, 1.124, 1.318, 1.525, 1.768, 2.045, 2.334, 2.699, 3.127, 3.615, 4.131, 4.776, 5.531, 6.378, 7.355, 8.482, 9.781, 11.28, 13.007, 15 |
| `…damage_mult` | 1, 1.02, 1.05, 1.07, 1.1, 1.13, 1.17, 1.2, 1.24, 1.28, 1.33, 1.38, 1.43, 1.48, 1.53, 1.58, 1.64, 1.7, 1.76, 1.82 | 1, 1.103, 1.269, 1.407, 1.621, 1.819, 2.117, 2.381, 2.77, 3.148, 3.688, 4.225, 4.943, 5.9, 7.033, 8.376, 10.026, 11.985, 14.308, 17.062 |
| `rules.json output.level.mend`, `reference_hp` | percent spec section 1 | section 2a items 1 and 2 |
| `rules.json output.profiles` physical, elemental, healing, blessing `.level` | `null` | `"scale"` |
| `rules.json balance.yardsticks.soldier_turn`, the percent spec's `full_assault` and floors | section 2 | × `scale` |
| Ratio `amounts` blocks with `profile: "flat"` (Shrug It Off, Clean Hands, Field Surgeon, Trick Shot, Breaching Strike, Chitin) | `"flat"` | profile removed, if the golden line shows a Level term on them |
| `rules.json derived.body.max_hp`, the `deal` and `enemies.json levels.note` texts; `data/CONVENTIONS.md` | | the new formula and the column's name |

**Order inside step 7b:** two commits. **(i)** the percent spec on today's scale, measured and recorded as that spec
says. **(ii)** this re-scale alone. Then the golden diff of (ii) has exactly one shape and can be checked by a script.

**The factor check** (`tools/golden_diff.py --scale`, new mode, about 80 lines; or a scratch script the reviewer
runs): for every key of every golden table between (i) and (ii): find the line's level (`/L(\d+)/`, `L20-faith…`, the
fight level of a `rules-*` or `costs-*` state; none = level 1). **Level 1: the line is byte-identical.** Above:
tokenise both lines in the same order; classify each number by its tag: HP states `hp(\d+)>(\d+)`, landed `i:…:(\d+)`,
previews `pv`, armour `a(\d+)`, sheet `hp`, `armour`, shields, heals, the `o:` line's total multiplier (`x2.4` →
`x22.5`) move; everything else (bases, criticals, Defense, AP, to-hit, ids, rounds) is identical. A moving integer
passes if **|new ÷ scale(L) − old| ≤ 1 + 0.002 × old** (floors on both sides; four-place storage), a multiplier if
within 0.2%. The script prints only failures, grouped: **moved by scale²** (a double Level term: a ratio block or a
by-hand multiply), **did not move** (a site still on the old units: the section 2 list), **moved otherwise** (a state
change: a kill threshold crossed by rounding; read those by hand: there should be a handful). The replay hashes
(`REPLAY_RECORD=1 REPLAY_FULL=1`) move for every game above level 1; the check there is that each replay's sequence of
actions, hits, misses, Downs and deaths is the same with the numbers stripped.

**The guard:** `balance-contract.test.ts` must pass **unchanged** (no band, no ceiling, no tolerance moved). A failure
means a site was missed. Then the measuring runs at levels 1, 5, 10, 20 (`refit-measure.ts`, `defence-measure.ts` with
`DEFENCE_PARTS=fights`, `heal-measure.ts`) must read as before within their cell noise (±5 points, ±1 round).

**Old saves.** Max HP is computed, current HP is stored. On load, a save from before this revision gets, for each
character, **current HP × `scale`(level)** (the same fraction of the new max; rounded, clamped to the max; level 1
untouched), and the same for a fight in progress (every unit's hp, max, shield, armour, and cover's and objects' HP,
by the level that owns each). A level-up after this adds the rise in max HP to current HP (today's rule, +hp per level,
generalised: `c.hp += newMax − oldMax`, `character.ts` line 862). `e2e/old-save.mjs` gains a level 9 save.

**Browser suites that set a level above 1** and may assert a number: `camera`, `turn-order` (level 12), `classes`
(3, 6), `feelings40`, `heart`, `sigil14`, `sigil15`, `sigil15-strokes` (10), `perks` (5), `pg-levelup` (9; it shows the
"+N HP" of a level-up), `skeleton-screens` (4). Each is run; a pinned HP or damage number above level 1 is re-pinned as
`old × scale` with the reason in the commit.

**Spec text, draft** (the revision number is the builder's: the next after the last used, after the percent spec's own):

> **Rules revision 1.NN: the level scale.** (1) A character's level multiplies everything measured in HP by
> `scale` (`rules.json output.level.scale`: ×1 at level 1, ×1.47 at 5, ×2.46 at 10, ×9.375 at 20). Damage grows
> ×1.1532 a level (`output.level.deal` = 1.1532^(level − 1): ×15 at level 20): the plain rifle's hit on a Soldier
> of its level is 40 at level 1, 70 at 5, 144 at 10, 600 at 20. (2) Max HP = `scale` × (100 + 15 × (Endurance − 1) +
> (level − 1) × (5 + 2 × Pain Threshold)). (3) The enemy table's HP, armour and damage columns, armour of every
> Class, Guard's soak, Strain's burn, a feeling's HP price, objects and cover (at the fight's level), heals and
> shields (`mend`), prayer damage and interventions, and the percent gate's 145 grow by the same factor. (4) Ratios,
> percents, to-hit, Defense, AP, MP, Flux, credits and XP do not change. (5) Level 1 is unchanged. Supersedes rules
> 1.26's `deal` column (item 1703), rules 1.15's three enemy columns and the HP line of "The game in one screen".

Section 14 items (all **PROVISIONAL**), numbered from the last used: the ruling read as a ratio (×15, the hit 40 →
600); the geometric curve ×1.1532; the `scale` column; the new `deal` column; the HP formula; the three enemy columns;
the four profiles on `scale`; player armour, Guard, Strain, feeling prices, technique armour × `scale`; objects and
cover at the fight's level × `scale`; the gate's 145 × `scale`; MP not scaled; the 1-damage floor not scaled; old
saves keep their HP fraction; the lag by tier (Survival spec, section 6).

## 8. Open questions for Leon (each with the recommendation; built as recommended if unanswered)

1. **The ratio or the absolute?** The data's level 1 hit is 40, not 20: ×15 (600 at level 20, a Boss 13,915 HP) or
   your 300 as written (×7.5: the same table with `deal(20)` 7.5, ×1.112 a level, a Boss about 6,960)? **×15**: the
   ruling is about how growth feels, and the 20 you remember is a pistol's.
2. **The curve's shape:** geometric by level (+15% every level-up), or front-load (fast to 10, slow after) or
   back-load (even by session)? **Geometric by level** (section 1).
3. **Objects and cover:** × `scale` at the fight's level keeps today's hits-to-break exactly (a crate takes one rifle
   hit at level 1 and still one at 20; a low wall 1.3 hits at level 1 and 0.8 at 20, as today). Or × the new `deal`
   (level-proof: a wall takes 1.3 hits at every level, cover lasts ×1.6 longer at 20 than today)? **`scale` in this
   step** (the factor check stays clean), then `deal` as a one-line follow-up if you want cover as sturdy at 20 as at 1.
4. **MP does not scale** (section 2): its pool and costs are one unit; what it buys grows already. **Agreed?**
5. **Armour under ×15:** a flat reduction that scales (today's shape: Class 3 removes 64% of a Soldier hit at level 1
   and 35% at 20, at every new size the same), or a percent of each hit? **Flat × `scale` now**; a percent model belongs
   to Equipment 2.0, which fits armour to the full-assault table anyway.
6. **The gate's 145 grows with `scale`** (the percent spec's dabbler numbers hold at every level), not a flat 145 (the
   gate vanishes from level 2). **Grows.**
7. **The lag** (section 6): Vermin and Minions −3, Soldiers −1 (−2 from level 10), Elites and Bosses at level.
   **As written**, for the Survival spec to adopt and measure.
8. **The 1-damage floor stays 1** (a Vermin's bite on plate). **Stays.**
