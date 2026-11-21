# Damage balance targets (Leon, 8 Nov 2026)

> **SUPERSEDED (rules 1.94, 21 Nov 2026).** The balance contract, its ceilings, lines, bands, tolerance and guards are
> withdrawn (Leon, 21 Nov 2026: "delete all the ceiling in the data and balance like a game designer would. I gave you
> those numbers as shorthand for what I want the reward to be and now you balance it like a spreadsheet. What is the
> point of having a class or weapon or upgrade system if everything is just a derivative to hit a % number?"; and on
> 19 Nov: "ceilings are a relative measure of the effort a class puts in and the fun it gets back, not a hard line.").
> The percentages here were shorthand for how a reward should feel; they are not limits, nothing is fitted to them and
> no test fails on them. A measuring tool reads and reports. A number changes only for a reason a player would feel.
> This page is kept as the record. The units a measure reports in are in `data/rules.json measure`.

The frame for the damage balance pass that follows Outburst 2.0. Every damage number in the spec is checked against it.

## Ceilings

- **About 350 damage** in one hit for a fully built character with the best equipment.
- **About 500** on a mega critical (the best build, the best gear, a critical and every stacking bonus).
- Nothing in the game should exceed these. Today's outliers (maxed FIRE ×11 ≈ 331 per hit and 662 on a crit; Vessel's
  two-form Release at stage 4 ≈ 162, spec item 532; the three-form 242 is gone with item 550) are measured against them
  in the pass.

## Damage per turn, relative to a plain weapon

The baseline is **100%: take your gun, sword or weapon and just attack every turn.** Each way to fight is measured
against it, as sustained damage over a fight, at equal investment:

| Way to fight | Target | Character |
|---|---|---|
| Plain weapon attacks | **100%** | The baseline. |
| Sigil magic | **up to ~150%** | The most complex and hardest system: the highest ceiling, reached only by good Lines, placement and setups. |
| Outburst | **~125%, steady** | Stable, like the heart: less ceiling than Sigils, less variance, reliable. |
| Optimised physical build | **~150%** with the right weapon skills, perks and gear; **~110%** when the equipment isn't ideal | Gear-dependent. |

## How the pass uses this

1. A simulator plays standard fights (the Proving Ground waves) with reference builds at levels 1, 5, 10 and 20, for each
   way to fight, and reports damage per turn and the biggest single hits.
2. Numbers move (base damage, multipliers, stage multipliers, word damage) until the ratios and ceilings hold.
3. Every change is flagged provisional and listed in spec section 14, as usual.
