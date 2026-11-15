# The alpha perks revamp: measured (15 Nov 2026)

What the 18 new alpha perks (rules 1.56, the alpha perks; `docs/design/proposals/2026-11-alpha-perks-revamp.md`)
measure at, against the doc's estimates. A record, not a target: no number was tuned to meet the estimates (spec
item 4223).

## How it was measured

The balance contract's own measure (`test/balance/refit-measure.ts`, run by `test/balance-contract.test.ts`): each
system's reference build, all in, levels 1, 5, 10 and 20, the optimised policy, as a percent of the plain rifle.
Two runs on the same code (lane head), differing only in `test/balance/builds.ts STEPS.perks`:

- **Line:** no perk steps (what the contract now holds; Leon's ruling: perk steps sit on top of the line).
- **With steps:** each build takes the perk steps its Mastery earns, its preferred perks first (`builds.ts`): the
  door's two alpha perks (Tier I at Mastery 1 to 2, both at Tier II by Mastery 4), plus the build's other perks.

The difference is the build's perk steps together, not one perk alone: it holds both alpha perks of the door and the
build's beta and gamma steps (Roll With It, Rounding Up, Rite in the Field, Outclassed: none of them a damage term).
Each perk's own term is proven exact by the reducer tests in `packages/engine/test/alpha-perks-156.test.ts` (it changes
a real action's result by its data's number under its condition, and nothing outside it).

## The systems, all in (percent of the plain rifle)

| System (its build's alpha pair) | Line L1 / L5 / L10 / L20 (mean) | With steps L1 / L5 / L10 / L20 (mean) | Gain of the mean | The doc's estimate (the pair at Tier II) |
| --- | --- | --- | --- | --- |
| Gun (Pressure Point, Keep Their Heads Down) | 164 / 171 / 167 / 145 (162) | 177 / 203 / 219 / 182 (195) | **+20%** | +18% (9 + 9) |
| Melee (Iron Grip, Keep Swinging) | 155 / 158 / 165 / 194 (168) | 155 / 158 / 149 / 198 (165) | **about 0** | +20% (11 + 10) |
| Sigil, a 4-glyph Line (Second Clause, Running Hand) | 147 / 147 / 194 / 215 (176) | 148 / 185 / 228 / 225 (197) | **+12%** | +19% (9 + 10) |
| Outburst, steady (Clenched Heart, Resonance) | 104 / 108 / 101 / 93 (102) | 118 / 123 / 121 / 111 (118) | **+16%** | +18% (8.5 + 9.5) |
| Outburst, peak | 122 / 177 / 144 / 151 (149) | 132 / 189 / 161 / 169 (163) | **+9%** | |
| Whisper turn (Sinner's Due, Unbroken Litany) | 91 / 82 / 66 / 113 (88) | 98 / 77 / 66 / 118 (90) | +2% | +18% (8 + 10) |
| Hymn turn | 117 / 110 / 147 / 167 (135) | 119 / 101 / 149 / 190 (140) | +4% | |
| Chaplain turn | 113 / 134 / 127 / 150 (131) | 107 / 132 / 115 / 162 (129) | about 0 | |

Not in the contract's measure (no reference build holds the pair in this measure): Guard (Weight of the Wall, Answer
in Kind), Shadow (Long Dark, Shadow Step), Figments (Many-Eyed Dream, Wake of the Kill), Bonds and Tending (Taut Thread,
Bitter Balm). Their terms are exact in the reducer tests (Tier II: ×1.03 a Guard to ×1.15; ×1.12 for a turn after a
hurt; ×1.14 while Hidden and −1 AP twice a turn; ×1.06 a Figment kept, to ×1.18, and 1 AP and 1 charge a downing;
×1.12 on a Bonded enemy, and 8% of a heal as Soul damage). The next measure pass (`niche-measure`, `tending-measure`,
the survival simulator's builds) should add a row for each.

## What it says

1. **The gun pair is over its estimate and the gun line is under its ceiling without it.** With the steps the gun
   build is at 195% against a ceiling of 145 (the contract held it there with the old Running Reload and Both Hands,
   which added little). Keep Their Heads Down keeps the yard target Pressed most turns, so Pressure Point's step is on
   nearly every shot; the measure's single target is the best case for both.
2. **The melee pair adds nothing in this measure.** The melee build fights one target that is never Grappled or Prone
   and is seldom dropped by a Finisher, so neither Iron Grip nor Keep Swinging fires. It is a measure gap (the
   technique loop with Trip and a crowd: `melee-measure`), not proof they are weak.
3. **The Outburst line fell, not the perks.** Without perk steps the Outburst build is at 102% against a ceiling of
   135: it was fitted with Heart Overload's free Begin (about 2 AP a turn) and Resonance's old +20/30% inside it. With
   the new steps it is at 118%. The contract now fails on the Outburst's steady turn (and its level 1 peak) until its
   dial is re-fitted (spec item 4201; the lead's).
4. **The prayer pair is small in a turn's damage:** Sinner's Due needs a broken target, and the yard foe spends most
   of the measure above half; Unbroken Litany's AP is once a fight.

PROVISIONAL (spec items 4201, 4223).

## The refit (16 Nov 2026, the lead's ruling 1: the class line is fitted without perk steps)

Measured with the contract's own measure (`refit-measure.ts`, 6 fights a cell, all in, levels 1 / 5 / 10 / 20), on
the lane after the merge of feature/0.29 (Bonds 2.0 slice 1, Figments 2.0 slices 2 and 3).

**The Outburst: `soul_modules.json damage.base` 31 → 37** (the only dial moved).

| base | steady L1 / L5 / L10 / L20 (mean) | peak L1 / L5 / L10 / L20 (mean) |
|---|---|---|
| line | 135 (band 119 to 151; each level 101 to 169) | 165 (band 145 to 185; each level 124 to 206) |
| 31 (before) | 104 / 108 / 101 / 93 (102) | 122 / 177 / 144 / 151 (149) |
| **37 (after)** | **124 / 128 / 120 / 111 (121)** | **147 / 210 / 172 / 180 (177)** |
| 41 (steady on 135) | 138 / 142 / 133 / 123 (134) | 163 / 233 / 190 / 199 (196) |

No value of the base puts both on their lines: the steady turn needs about ×1.32, the peak's level 5 allows about ×1.16.
At 37 every cell is inside the contract but one: **the level-5 peak, 210 against 206** (2% over). The stage table was
tried as the second dial and does not separate them (the steady turn also swells to stage 4 and releases there):

| tried | steady (mean) | peak L5 |
|---|---|---|
| base 41, stage 4 ×1.5 | 131 / 136 / 127 / 118 (128) | 225 |
| base 41, stages 3-4 ×1.3 / ×1.4 | 123 / 129 / 121 / 112 (121) | 217 |
| base 35, the table +0.1 (×0.9 to ×1.7) | 123 / 127 / 119 / 110 (120) | 206 (passes by 0.25) |
| base 36, stages 1-3 +0.2/+0.2/+0.1 | 121 / 125 / 117 / 108 (118) | 205 |
| base 31, `cycle.begin_ap` 2 → 1 (not a dial of the brief) | 129 / 140 / 118 / 101 (122) | 197; peak mean 160 |

The gap is what Heart Overload's free Begin was: a tempo lever inside the steady loop that the one-turn peak does not
use. **For the lead:** either (a) Begin at 1 AP (the last row: every cell in band at the old base, a rule change: the
Swift module then gives nothing), (b) the feelings' steps as the peak's own dial (the peak is the stage table plus four
feelings' steps), or (c) the level-5 peak band. Until then the contract is red on that one cell.

**The other systems, no perk steps, at base 37** (the line, then the measured levels and mean): none was fitted with an
old alpha perk inside it that it now lacks, and each sits within the contract's tolerance, so none was moved.

| system | line | L1 / L5 / L10 / L20 (mean) | with both alpha perks at Tier II (mean) |
|---|---|---|---|
| plain rifle | 125 | 126 / 123 / 109 / 108 (117) | 117 |
| gun (Masterwork) | 145 | 164 / 171 / 167 / 145 (162) | 177 / 203 / 219 / 182 (195) |
| melee (blade) | 165 | 155 / 158 / 165 / 194 (168) | 155 / 158 / 149 / 198 (165) |
| Sigil Line of 4 | 150 to 200 | 147 / 147 / 194 / 215 (176) | 148 / 185 / 228 / 225 (197) |
| Outburst steady | 135 | 124 / 128 / 120 / 111 (121) | 141 / 147 / 144 / 132 (141) |
| Outburst peak | 165 | 147 / 210 / 172 / 180 (177) | 157 / 226 / 192 / 201 (194) |
| Whisper turn | 80 | 91 / 82 / 66 / 113 (88) | 98 / 77 / 66 / 118 (90) |
| Hymn turn | 150 | 117 / 110 / 147 / 167 (135) | 119 / 101 / 149 / 190 (140) |
| Chaplain turn | 125 | 113 / 134 / 127 / 150 (131) | 107 / 132 / 115 / 162 (129) |

"With both alpha perks" is the build taking its Mastery's perk steps, its door's two alpha perks first (at level 1 the
all-in skill has three steps: one perk at Tier II, one at Tier I). The melee, Whisper and Chaplain rows read lower at
some levels with steps than without: the steps include perks the policy uses badly (a measure for the lead, not a
defect found in a perk). The contract prints these lines on every run and asserts none of them.
