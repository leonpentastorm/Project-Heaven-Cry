# The heal and shield pass: Sigil, Outburst and prayers (rules 1.20)

12 Nov 2026. For Leon and whoever picks the balance pass up next. The rules are in `docs/rules/PHC-Core-Rules-v1.0.md`
("Rules revision 1.20", section 14 items 1230 on). **Nothing here is committed by this session; nothing was built with
`npm run build`, deployed or run in a browser.**

**Status: section 1 (the yardstick and the bands) is settled and safe to read from. The sections after it are filled
in as the fit lands.**

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
| 11 | **A prayer:** a healing Hymn (3 AP, on a cooldown) | **125 to 150%** (a shield ×1.2) | Half a turn, but not every turn |
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
