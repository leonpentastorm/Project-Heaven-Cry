# The balance contract (rules 1.26, 12 Nov 2026; the healer's ceiling: rules 1.27)

The floor every later system, class, weapon, Weapon Art and mode is balanced to. Leon's rulings (12 Nov 2026) are the
contract; this page says what they mean in numbers, where each number lives, and how to measure something new against
them. The numbers themselves are in **`data/rules.json` `balance`** (read by the guard) and the spec's rules 1.26 (items
1700 to 1724) and 1.27 (the heal re-fit, items 1730 to 1741). Everything here is **PROVISIONAL** until playtests confirm it.

## 1. The rulings

1. **A ceiling is what an ALL-IN build reaches.** All in: the main Attribute and its attack Skill at the level's
   ceiling and nothing else in the same core bought for damage. A normal-share build (36% of the Skill points in the
   main skill) sits at **ceiling ÷ 1.25** where the ratio can be held (levels 1 to 7), and catches the ceiling by level
   13, when it is all in too.
2. **No damage slope on a rolled attack.** Skill buys accuracy (and the critical, and the gates); level buys damage. A
   rifle, a blade, a Sigil Line and an Outburst hit as hard in anyone's hands at the same level.
3. **Flat things grow with level** (grenades, charges, splash, traps, hazards, barrels, damage over time).
4. **Every system's identity is one named multiplier in data.** Re-tuning a system is changing that number.
5. **Cost counts:** a system with set-up or a resource may sit higher than a free one (the cost ledger, section 4).
6. Weapon Arts (not built) may break the ceiling as a charged ultimate, counted in the build's fight average. Miracles
   are exempt. **Survival's run power (its boons, a Relic's named property, a shrine's token, the Crossroads graft) is
   exempt from the guard, as Miracles and Weapon Arts are; it is bounded instead by the run's cap (`data/survival.json
   boon_cap`, 50% of a rifle-turn a character) and measured by the survival run test (`test/balance/survival-run.ts`).**
   (Leon's ruling 4, second batch; `docs/design/survival-spec.md` section 11.6 item 5.)
7. **Heals and shields are balanced in percent of HP** (rules 1.36, Leon 13 Nov 2026; it replaces rules 1.27's two
   Soldier-turns): one whole turn, all in, restores a percent of the reference character's max HP
   (`output.level.reference_hp`): the Mender 65, a door user about 59, an off-heal (the Outburst's Buff, a Sigil MEND
   Line) 45, a Whisper 15, a Hymn's turn 65 at most and about 45 over its wait. **The gate:** every 2-AP heal or shield
   action gives at least 20% of its target's max HP (counted to 145 × scale; a Whisper 13.3%, a Hymn 33.3%). **The
   cap:** no single heal more than half its target's bar. Faith's shield is the strongest (two full assaults); the
   Mender's Tending shield, then the Sigil WARD Line and the Outburst's Inverse sit under it (`ceilings.shield_order`).
8. **Classes 3.0** (rules 1.38, step 11; Revision 4's reading, Leon 13 Nov 2026): a base class all in sits ON its
   system's ceiling; a door user (anyone through the alpha skill) about 13% under (ceiling ÷ 1.15); a squared advanced
   class (not built) about 13% over in its own column. The class lines this contract holds: Shadow (the Operative 125,
   the door 109), Tending (the Mender's healing turn 65, the door 59; the Mender's steady offence 70, its best window
   100), Figments (the Rigger 150, the door 130), the Chaplain's turn 125 (the Faith door: the Whisper and Hymn rows).
9. **The level scale** (rules 1.36): a plain hit grows ×7.5 from level 1 to 20 (`output.level.deal`), and everything
   measured in HP grows with it (`output.level.scale`: max HP, enemies' HP, armour and damage, Guard, Strain's burn,
   objects, heals and shields). Every line of this contract is a ratio and does not move; MP does not scale.

## 2. The unit and the yardsticks

| Yardstick | What it is | Where |
| --- | --- | --- |
| **A rifle-turn (100%)** | what the normal-share plain rifle (service rifle, standard, plain shots, no perks) deals in one 6-AP turn on the simulator's range at that level: a Soldier's numbers, 5,000 HP, 13 tiles off, never acts, 8 turns | `test/balance/sim.ts`, `refit-measure.ts yardOf` |
| **A Soldier-turn** | what one Soldier of the fight's level takes off the plain rifleman in one of its turns (18.5 at level 1 to 60.2 at 20); one Soldier-turn kept off the squad counts as one rifle-turn | `balance.yardsticks.soldier_turn` |
| **One AP** | a sixth of a turn: 16.7% | |
| **The cluster** | what a shape aimed at one enemy of a standard group catches, measured: 2.4 at radius 1, 2.8 at radius 2, 2.95 at radius 3; a chain finds its second (2.0) | `balance.yardsticks.area.cluster`; `refit-measure.ts cluster` |
| **A denied turn** | a whole Soldier turn denied = one rifle-turn; one AP off it = a sixth; an Elite ×1.4; a Boss ×3 and never a whole turn; never the same enemy two rounds running | `balance.yardsticks.control` |

## 3. The ceilings

All in, in percent of a rifle-turn (a healer: of a Soldier-turn). The guard holds the all-in average over levels 1, 5,
10 and 20 within **±12%** of the ceiling and each level within **±25%** (`balance.tolerance`).

| System | Ceiling, all in | Normal share (÷ 1.25, levels 1 to 7) | Its dial (the one number to change) | Measured all in, levels 1 / 5 / 10 / 20 |
| --- | --- | --- | --- | --- |
| Plain rifle | 125 | 100 by definition | `rules.json output.profiles.weapon.k` × `output.level.deal` (derived: never tune it) | 129 / 113 / 112 / 101 |
| Best gun, steady (the Skirmisher) | 145 | 116 | each weapon's damage in `weapons.json` (rarity buys accuracy only since rules 1.26: Masterwork's damage is 1.0, and the ceiling is measured at Masterwork) | 164 / 161 / 158 / 153 (mean 159, +10%) |
| Melee (the damage dealer) | 165; the Defender lower | 132 | `rules.json output.factors.melee` | 156 / 150 / 133 / 178 (the Tank 77 / 55 / 78 / 124) |
| Sigil, a full Line over its turns | 150 to 200 | 120 to 160 | `sigils.json grammar.line_mult` | 155 / 147 / 176 / 189 |
| Outburst, steady | 135 | 108 | `soul_modules.json damage.base` | 139 / 155 / 136 / 137 |
| Outburst, the biggest Release | 165 | 132 | `soul_modules.json damage.base`, then `cycle.stage_mult` | 150 / 173 / 152 / 158 |
| Faith, a Whisper turn (the door) | 80 | 64 | the Whispers' values in `patrons.json`; `output.profiles.blessing.k` | 92 / 75 / 62 / 100 (mean 82) |
| Faith, a Hymn turn (the door) | 150 (low end 55% at Devotion 3) | 120 | the Hymns' values in `patrons.json`; `output.profiles.blessing.k` | 119 / 104 / 156 / 173 (mean 138) |
| The Chaplain's turn (rules 1.31) | 125 | 100 | `classes.json guardian.smite` (held equal to Rebuke's 20 by the validator) | 117 / 131 / 117 / 138 (mean 126) |
| Shadow: the Operative's window; the door (rules 1.32) | 125; door 109 | door 87 | `rules.json shadow.per_point` (0.7) | Operative 125 / 128 / 133 / 110 (124); door 118 / 122 / 104 / 109 (113) |
| The Mender's steady offence (rules 1.33, 1.38) | 70 (the door 61) | | `tending.json bond.per_bond` (0.05) | solo 81 / 67 / 60 / 63, squad 81 / 72 / 63 / 67 (68 / 71); door 67 |
| Figments: the Rigger; the door (rules 1.34) | 150; door 130 | 120; door 104 | `figments.json level.hp` (`hp_stat`), `output.factors.figment` | Rigger 156 / 118 / 116 / 101 (123); door 144 / 106 / 114 / 112 (119): the soak is capped at 60% of the enemy's fire in both, so no HP dial separates them (step 11 hand-off) |
| An off-heal's turn (rules 1.36: percent of the reference HP; it was 200 Soldier-turns) | 45 | 36 | `soul_modules.json schools.buff.heal` on `soul_mend` (11.3); the Sigil `mend.heal` 15 on `sigil_mend.k` 1.629 | 56 at every level with the spec's 14, so fitted to 11.3 (45) |
| The Mender's healing turn (rules 1.36) | 65 (a door user 59) | 52 | `rules.json output.profiles.tend.k` (3.74) | 70 / 64 / 65 / 65 (the door 67 / 62 / 62 / 62; at a normal share 63 / 51 / 38 / 36) |
| A Hymn turn's healing; a Whisper | at most 65, about 45 over the wait; a Whisper 15 | | the Hymns' and Whispers' values in `patrons.json` | |
| A shield | Faith's strongest = 1 (70% of the reference HP); the Tending shield 0.36; WARD Line and Inverse 0.33 | | `balance.ceilings.shield_order` | |
| Grenades and charges a character throws | the budget rule (section 5) | | `rules.json output.factors.thrown` | a frag on the cluster: 64 landed against 61 allowed at level 1 (+5%; it was 98) |

Measured all in on 13 Nov 2026 (rules 1.38, step 11; `refit-measure` at 16 fights a cell, the class and door tools at
their own samples; the step 11 hand-off has every row and both shares). The guard plays 6 seeded fights a cell, so it
reads a little differently (the Whisper door at level 20: 113 at 6 fights, 100 at 16; its `level_hi` stays 1.42 for that).

The order of the peaks Leon set: a full Sigil Line 150 to 200%, a charged Weapon Art (to be set), the Outburst's
biggest Release 165%, melee 165%, the best gun 145%, the Outburst steady 135%, the plain rifle all in 125%.

**One constant per system.** A dial is one number at every level, so all in sits a little over its ceiling early and a
little under late (the all-in head start is accuracy, which a normal share catches by level 13). The proposal's ladder
(rank III and the Mastered perk carrying the last 25% from level 7 to 13) would flatten that; it waits for those moves.

## 4. Where each multiplier lives

| Term | Where | What it is |
| --- | --- | --- |
| Stat | `rules.json output.profiles` (k, attr, skill, level) and `output.pairs` | three shapes: **aimed** (no slope; weapon k 1.5, sigil 1.7, soul 1.55, elemental 1), **landed** (0.06 a point; blessing 0.956; rules 1.27: healing and mend 1.392, sigil_mend 1.17, soul_mend 1.296, blessing_mend 1.44, each heal and shield profile with a `floor` of 0.5: never under half of a normal share's Stat, `output.floor_reference`), **flat** (k 1) |
| Level | `rules.json output.level.deal` (aimed and flat), `mend` (heals and shields: the enemy table's damage column) | `deal` is derived from the plain rifle: k × deal is its old multiplier |
| A system's identity | `rules.json output.factors` (melee, thrown), `rules.json rarity`, `sigils.json grammar.line_mult`, `soul_modules.json damage.base` and `cycle.stage_mult`, the prayers' values | one number each |
| Own multipliers | the register `rules.json output.systems` lists each system's, in the order they apply | technique, stage, shape, Line, ammunition, critical, conditions, perks |
| Items' numbers | `amounts` blocks on perks, traits, classes, conditions (`data/CONVENTIONS.md`) | the lint (`amount-literals.test.ts`) fails on a literal in code |
| The contract | `rules.json balance` | ceilings, ratio, tolerances, yardsticks, cost allowances, tiers |

## 5. The cost ledger and the budget rule

What the range already counts (Heat, reloads, Strain, the Hymn wait, Momentum, glyph AP, walking into range) needs no
allowance. What it leaves out earns one (`balance.yardsticks.cost`):

| Cost class | Allowance on the ceiling |
| --- | --- |
| None (no resource, no set-up, no roll, any range) | −15%, or a wait of 3 rounds or more |
| Upkeep inside the fight | 0 |
| Session supply (rounds, cores, MP, Supplies) | +5%; +10% when it also costs credits that matter |
| A set-up turn a target can waste | +10% a turn, and the output counted over the turns it takes |
| Rooted on what you prepared | +5% |
| Exposure (in the target's reach) | +15% |

**The budget rule for one use:** `allowed = (AP / 6) × tier × (1 + cost allowances) × area worth`, with tiers plain
1.25, steady 1.45, peak 1.65 (at most once in three turns, the three-turn average at steady), ultimate 2.5 (once a
fight, counted in the build's average, which stays at steady + 10%) (`balance.yardsticks.tiers`).

**Many targets.** An area is worth its single-target allowance **plus half of it for each extra target** it is expected
to catch on the cluster (`area.extra_target_share` 0.5): 1.7 at radius 1, 1.9 at radius 2, 2.0 at radius 3, 1.5 for a
chain. Today: SPREAD ×0.6 on 2.8 = 1.68 (inside 1.9); Wave and Burst ×0.7 on 2.4 = 1.68 (inside 1.7); Aura ×0.6 = 1.44;
PUSH ×0.7 on 2.4 = 1.68; CHAIN 1 + 0.75 = 1.75 against 1.5 (17% over; not changed, item 1716).

**Control.** A condition is worth the share of the enemy's turn it removes, × its rounds, × the chance it lands, in
rifle-turns (a denied Soldier turn = 1):

| Condition | Share of a turn a round | Note |
| --- | --- | --- |
| Stunned | 1.0 | a denied turn; never a Boss's whole turn; never the same enemy two rounds running |
| Dazed | 0.33 | −2 AP |
| Nausea, Suppressed | 0.17 | −1 AP (Suppressed: no reaction either) |
| Weakened | 0.25 | −25% damage dealt |
| Blinded | about 0.35 | −4 to hit on about a 55% shot |
| Pinned | about 0.2 | −2 to hit, no move |
| Fear | about 0.2 | −2 to hit, and nothing at the source |
| Confused | about 0.25 | half its attacks go astray (estimate) |
| Slowed | about 0.1 | a gunner barely moves |
| Taunted | 0 for damage | it moves the damage onto the taunter: priced as that character's armour and HP |
| Silenced | 0 on a gunner, 1.0 on a caster | |
| Prone | 0.17 | 1 AP to stand |

**Damage over time** counts in full for 2 rounds and ×0.75 for longer (`yardsticks.over_time`).

## 6. How to balance a new system (or a new item)

1. **Give it an amount, not a literal.** A weapon's damage, a word's, a school's base, a prayer's value, or an `amounts`
   block on a perk, trait or class move. Name its profile: aimed if it rolls, landed if it always lands, flat if it has
   no dealer's skill. The lint fails on a number handed to a sink from code.
2. **Give the system one dial** in data (a factor in `output.factors`, a base, a multiplier table) and name it in
   `balance.ceilings.<system>.dial`.
3. **Price one use with the budget rule** (section 5): its AP, its tier, the cost classes it pays, its area worth, its
   control worth. That is the number to aim at, all in.
4. **Measure it on the range** with the tools that exist: add a row to `test/balance/refit-measure.ts` `measure` (a
   build in `builds.ts` or a variant of one, a policy in `policies.ts` if it needs one), then
   `REFIT_MEASURE=1 REFIT_SYSTEMS=<yours> npx vitest run --root packages/engine test/balance/refit-measure.test.ts --silent=false`
   (12 to 16 fights a cell; a cell is about ±5 points at 16). Measure both shares at levels 1, 5, 10 and 20.
5. **Fit with the dial only**, until the all-in average over the four levels is within ±12% of the ceiling. If no single
   number can do it (the shape over the levels is wrong), the system needs a second dial or a ladder: say so, do not
   add a literal.
6. **Add it to the guard:** a ceiling in `rules.json balance.ceilings` and the row id in `balance-contract.test.ts`
   `SYS`. `npm run check` then holds it.
7. **Re-record what moved on purpose** (`docs/TESTING.md`: the golden tables, the replay hashes) and say which tables
   in the commit.

## 7. What the contract does not hold yet

Reflex (the Skirmisher's second reaction: measured +0 in whole fights, the simulator's enemies never cross a held
line; it needs a scripted fight or the playtest), Class moves rank by rank, perks and Mastered perks, traits, weapon mastery, special rounds and mods, Calls and squad
buffs, reactions and held actions, stealth openers, armour (Equipment 2.0), enemy casters and the enemy Burst, Overdraw
and Heart Overload. Each is priced with the budget rule when it is built or measured (PATCH-TALLY section 10).
