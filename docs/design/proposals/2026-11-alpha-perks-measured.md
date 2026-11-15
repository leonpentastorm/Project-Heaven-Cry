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
