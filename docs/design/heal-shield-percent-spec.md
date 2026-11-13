# Heals and shields in percent of HP (spec, 13 Nov 2026)

Leon's rulings (13 Nov 2026, binding): *"Balance the whole heal and shield system with a late-game full-HP character:
the ceiling for each heal and shield source is the % of health they can heal or shield them in one turn. Then try
scaling down. If a level 1 character has 125 HP and they heal for 9, not even enough to tank one arrow shot, you fucked
up."* · *"Sigil and pure Outburst also have a healing school and word, so tune our Insight class to heal more than
them."* · *"Ceiling is 65% HP; strongest shield in the game should tank about 2 turns' worth of full assault. Just
balance with the cost instead of making a full turn feel wasted for the player. For these systems we really should have
at least one % gate so at low level stuff doesn't feel worthless."*

This replaces the Soldier-turn yardstick of rules 1.20, 1.23 and 1.27 for heals and shields. Damage is not touched.
Every number here is **PROVISIONAL**. Arithmetic: `heal = base × k × Stat × Level × own multipliers`, the existing
formula (`rules.json output.formula`); nothing new except one gate (section 4) and one data column (section 1).

**The principle, first.** A player who spends a turn healing must SEE the bar move. A heal is never made small to stop
it being spammed: the **price** stops that (AP, MP, Strain, charge, the Hymn's wait, per-target limits, the hunt).
A full turn spent healing must never feel wasted.

## 1. The reference character and the unit

**The reference character** is the contract's: the normal-share plain rifleman (`test/balance/builds.ts`
`plain_gun`, `NORMAL_SHARE` 0.36, 14% of Skill points in Pain Threshold), Class 3 armour. Built through the reducer
(a scratch run of `buildCharacter`, 13 Nov): Endurance 4 and Pain Threshold 1 at level 1, Pain Threshold 2 at 2 to 6,
3 at 7 to 10, 4 at 11 to 17, Endurance 5 and Pain Threshold 5 at 18 to 20: 145 / 181 / 244 / 445 HP at levels 1 / 5 /
10 / 20, with steps (+17% at level 18). **The curve used is that build smoothed**: Endurance 4 + (L − 1)/19, Pain
Threshold 1 + 4(L − 1)/19, in the HP formula `100 + 15(E − 1) + (L − 1)(5 + 2 PT)`. It hits 145 and 445 exactly and
is within 3% of the build elsewhere.

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Reference HP R(L)** | 145 | 153 | 162 | 172 | 183 | 194 | 207 | 220 | 234 | 249 | 265 | 282 | 299 | 317 | 337 | 357 | 377 | 399 | 422 | 445 |
| The build, measured | 145 | 154 | 163 | 172 | 181 | 190 | 211 | 222 | 233 | 244 | 275 | 288 | 301 | 314 | 327 | 340 | 353 | 415 | 430 | 445 |
| Frail (Endurance 1, PT 0) | 100 | 105 | 110 | 115 | 120 | 125 | 130 | 135 | 140 | 145 | 150 | 155 | 160 | 165 | 170 | 175 | 180 | 185 | 190 | 195 |
| Tank (`tank` all in, measured) | 190 | 203 | 235 | 256 | 289 | 325 | 358 | 381 | 435 | 460 | 485 | 510 | 535 | 560 | 585 | 610 | 635 | 660 | 685 | 710 |
| **New `mend` Level column M(L)** | 1 | 1.057 | 1.057 | 1.112 | 1.182 | 1.182 | 1.257 | 1.338 | 1.344 | 1.43 | 1.52 | 1.616 | 1.716 | 1.821 | 1.931 | 2.045 | 2.165 | 2.289 | 2.419 | 2.553 |
| Old `mend` (enemy damage column) | 1 | 1.02 | 1.05 | 1.07 | 1.1 | 1.13 | 1.17 | 1.2 | 1.24 | 1.28 | 1.33 | 1.38 | 1.43 | 1.48 | 1.53 | 1.58 | 1.64 | 1.7 | 1.76 | 1.82 |

**The unit:** percent of R(L) restored (or shielded) by one whole turn (6 AP) spent on that source by an all-in build.

**Size follows the level's reference HP; the gate reads the target (a hybrid, Leon's direction).** M(L) =
R(L)/R(1) × S_all(1)/S_all(L), held non-decreasing (a level never lowers a heal; levels 3 and 6 hold the level
before), where S_all is the all-in landed Stat (Attribute and Skill at the level's ceiling, 0.06 a point each): 1.78
at levels 1 to 2, 1.90 at 3 to 5, 2.02 at 6 to 8, 2.14 from 9. So **an all-in healer's turn is the same percent of
R(L) at every level**, a normal share sits at ÷ 1.25 to level 7 and catches it by 13 (contract ruling 1), exactly as
`output.level.deal` was derived from the plain rifle. Why not the target's own max HP for the size: a tank (710 HP at
20) would be refilled 1.6 times faster in HP than the rifleman for the same turn; its armour and Guard already pay for
standing in front. A heal sized to R is 34% of the level 1 tank's bar for an off-heal turn, 28% at level 20: the tank
gets a smaller percent, as intended. The target's own HP enters only through the gate and the cap (section 4).

**Data:** `rules.json output.level.reference_hp` (the 20 values, new) and `output.level.mend` (the 20 values,
replacing the pointer `"enemies.levels.table.damage_mult"`). **Engine gap (one line):** `effects/output.ts
levelFactor` reads `'mend'` from the enemy row (line 105); it must read the array, as `deal` does.

## 2. What kills you (the check)

From `enemies.json` (`items`, `levels.table`): one hit = the service rifle's 30 × the tier's `damage` × the level's
`damage_mult`, less armour (Class 1 = 5, Class 3 = 15, `character.ts ARMOUR`); a turn = 3 single shots at a hit
chance of 73% for a Soldier (the measured Soldier-turn 18.5 / 60.2 at levels 1 / 20 is reproduced to 0.2 HP), ±5% a
point of attack bonus for the other tiers. Percent of R(L). Elite and Boss turns are estimates (no techniques).

| Level (R) | Minion hit · turn | Soldier hit (none / Class 1 / Class 3) | Soldier-turn (measured) | Elite turn | Boss turn |
| --- | --- | --- | --- | --- | --- |
| 1 (145) | 15 · 28 (10% · 20%) | 23 / 18 / 8 (16% / 13% / 6%) | 18.5 (13%) | 41 (28%) | 55 (38%) |
| 5 (183) | 18 · 34 (10% · 19%) | 26 / 21 / 11 (14% / 11% / 6%) | 24.1 (13%) | 49 (27%) | 65 (36%) |
| 10 (249) | 23 · 44 (9% · 18%) | 30 / 25 / 15 (12% / 10% / 6%) | 34.2 (14%) | 63 (25%) | 82 (33%) |
| 20 (445) | 40 · 75 (9% · 17%) | 43 / 38 / 28 (10% / 8% / 6%) | 60.2 (14%) | 105 (24%) | 133 (30%) |

**A full assault** (for shields): what the standard encounter (3 Soldiers and an Elite, rules 1.25's doctrine)
puts on one character in one round: the Elite **focuses** (its whole turn) and the three Soldiers **spread** over a
squad of four (three quarters of one Soldier-turn reaches the target): **55 / 67 / 89 / 151 HP = 38 / 37 / 36 / 34% of
R** at levels 1 / 5 / 10 / 20. Everything on one target (all four enemies: 4.4 Soldier-turns, 56 to 60% of R) is the
worst case, not the definition (question 1).

**The floors** (the guard holds them; HP on the reference character unless named):

- **(a) One heal action** (2 AP; a Whisper, 1 AP, owes half) of the least trained legal healer of each door (the door
  at 1 point, level 1, no class) restores at least **one Soldier hit through Class 1 armour: 18 HP at level 1** (21 /
  25 / 38 at 5 / 10 / 20 for a normal share). **The 125-HP Recruit: at least 19 HP (15%).** Today: 9.
- **(b) A whole turn** of the least trained healer restores at least one Soldier-turn (18.5 at level 1); for prayer,
  at Faith 3 (the first Hymn), since a Whisper is once a turn.
- **(c) The stage ladder:** an Outburst heal's stage 0 or 1 Release meets (a) on its own.
- **(d) The top:** no source restores more than **65% of R(L)** in a turn; **no single heal action more than 50% of
  its target's max HP** (the cap, section 4; Miracles exempt).
- **(e) The dedicated healer:** section 6.

## 3. The ceilings (all in, one whole turn, percent of R)

The order is Leon's: Tending first, every other door an off-heal at about 70% of the Mender. Shields: the strongest
soaks **two full assaults (68 to 76% of R: 70)**; every other shield is **×1.2 the heal of the same cost** (the
contract's rule stands under the top; the two agree: 1.2 × the 45 off-heal is 54, under 70). "Today" is the live
formula at level 1 (old base × k × Stat × old Level), all in; × marks a miss.

| Source | What a turn is | Line | Today L1 | Why |
| --- | --- | --- | --- | --- |
| **Mender, Tending through Bonds** (B) | Triage + 2 Mends on Bonded allies | **65** | (27, Bonds spec) × | the top (Leon) |
| Door user, Tending (B) | 3 Mends, 2 of them Bonded (Bonding costs 1 AP) | **59** (91%) | (25) × | the shared dial gives 91%, not the frame's 87: the Mender's edge is Triage and the free Bond; kept, measured when built |
| Outburst, Buff school, steady (A) | Begin, 3 Pumps with Rage and Love, Release (×2.0) | **45** | 24 × | 70% of the Mender |
| Outburst, biggest Release (A) | stage 4, four feelings (×3.2) | **50** (the cap) | 38 × | the formula gives 71%: the per-action cap holds it |
| Sigil MEND (A) | MEND · CONDENSE · SEEK (5.5 AP) | **45** | 30 × | 70%; the full Line (81% formula) is capped at 50, about 38 a turn over its 1.33 turns |
| A Whisper, Health (A) | one Whisper (1 AP, once a turn) and 5 AP of rifle | **15** | 9 × | **changed from the lead's 28**: a 28% Whisper plus a 5-AP rifle is 2.1 Soldier-turns of healing and 0.8 rifle-turns of damage, more than a Mender's whole turn with no price at all (no pool) |
| A Hymn's turn (A) | Warm Hands (3 AP) + Health | **65** (Hymn 50 + 15); **≤ 45 averaged over its wait** | 32 × | all in the wait is 3 rounds: (50 + 3 × 15) ÷ 3 = 32 |
| Mother Ember's intervention (A) | no action; once a fight (twice from Devotion 7) | **up to 50** (the cap) at Devotion 10 | 71, no Level term | it gains the Level term; it never passes the cap |
| Bard Triage (A, the live Insight class) | 3 Triages, three allies (once an ally a turn) | **64** | 26 × | the live Bard is the live top healer, as the order wants; on ONE ally it is 21 a turn |
| Rally (A) | once a scene, every ally within 4 | 17 each | 10 × | a Triage-sized heal × 0.6, the area rule |
| A stim, Stim Throw (A) | 1 AP and a dose | **20% of the target's max HP** | 6 (Healing given 1.0) × | gear: a percent of the target, priced in credits (question 3) |
| **WARD, the full Line** (A) | WARD · WARD · CONDENSE · SEEK over 1.1 to 1.6 turns | **70 (the strongest shield)** | 64 | two full assaults; set-up, 7 charge, Flux |
| Outburst Inverse, steady (A) | as the Buff turn | 54 | 32 × | ×1.2 of 45 |
| Tending Shield (B) | 2 AP | 21 (Mender through: 25) | (21) | ×1.2 of a Mend |
| Protection (A) | a Whisper | 18 | 11 × | ×1.2 of Health |
| Ward (B, Chaplain) | the turn's Whisper; its own layer; 2 allies | 18 | 12 | = Protection: it stacks on top of any other shield, so it is not given the class's +17% (question 5) |
| Saint's Shield (A) | a Hymn | 60 | 27 × | ×1.2 of Warm Hands, under 70 |
| Sanctuary (B) | a Hymn; 3×3, half damage to the next turn | **pool = one full assault** (37% of R) | 19 | halves one round's assault on the zone |
| Will Shield (A, live Guardian; leaves in B) | 3 AP, 20 MP | 27 | 11 × | ×1.2 of a half-turn off-heal |
| Shell (A) | a rider on any Release | 22 steady | 13 | the rider band |

**Perks and traits** (`perks.json`, `traits.json`; every live one with a heal or shield): Shrug It Off II (shield 10%
of your max HP), Clean Hands (15%), Last Charge (15 × Armour Class) are already percent of the bearer: kept, they sit
under the 2-AP line. Field Surgeon / Overhaul (Field Repair on a living ally, 3 a point of Improvisation × Healing
given × Level): about 20% of R at Improvisation 7, kept (inside the Mender's per-action 22). Bite the Bullet and Angel
of the Trenches give no amount. The Old Blood, Factory Made and Humanity First change healing **received**: they apply
after the gate (target bonuses). Field Medic changes Triage's AP only. **Riders that follow their parent's base and
need no number:** Love (its shares of the Buff heal), Absolution 9 → **19**, Coin for the Ferry 5 → **11**, Hearthlight 4
→ **9** (each Hymn heal × 28/13), Split, Thread, Linger (flat 5, kept). LEECH and Drain are shares of damage: untouched.
Everyone Home (a Miracle) is exempt: its shield stays 17.

**Guard and armour (not in this pass), how the method will read them:** Guard soaked a round is counted as shield in
percent of R a turn, priced against the full assault (a Bulwark all in should soak about one assault a round with its
Guard and armour together); armour is read as the share of a Soldier hit it removes at the level (Class 3: 64% at level
1, 35% at 20, which is why the tank's smaller heal percent is fair); Equipment 2.0 fits both to the assault table.

**Enemy healers** (`heal_enemy` 25 MEND, 30 Buff; enemy multipliers of rules 1.15): today about 18 to 36% of the healed
enemy's HP a cast at level 1 (a Sigil novice's MEND · SEEK 25 on a 70-HP Minion 36%, on a Soldier 18%; a Heart adept's
Mending pulse at ×1.2 about 30% of a Soldier). Enemy HP grows ×1.81 to level 20 and the damage column ×1.82: **an enemy
heal must take the damage column of its own level** to hold its percent; if `ai-soul.ts` / `ai-sigil.ts` do not apply
it, that is the one change (bases kept). The gate and the cap apply to enemies too (section 4).

## 4. The gate and the cap

Every heal and shield action resolves as:

`amount = max( (base + flat) × Stat × Level , min_pct × min(target max HP, gate_hp) ) × own multipliers`, then the
air, then the target's received bonuses, then (heals only) **no more than `cap_pct` × the target's max HP**.

- **`min_pct`**, a field on the source's `amounts` block, defaulted by its profile in `output.profiles` (one field):
  **0.15 for a 2-AP action** (Mend, Touch, Triage, Tending Shield, a Sigil Line, an Outburst Release before
  its stage multiplier), **0.10 for a Whisper** (Health, Protection, Ward) and Raise (1 AP), **0.25 for a Hymn and an intervention**.
  Own multipliers apply to it: an Outburst at stage 0 / 1 / 4 is gated at 12 / 15 / 24%, a 3-glyph Line at 22.5%, a
  Bonded Mend at 18%, a heal in an area shape at ×0.4.
- **`gate_hp` = 145** (`mending.gate.hp`, the level 1 reference HP): **the gate is for low level.** On a target of
  145 HP or less it is a true percent; above, it stops growing, so a level 20 dabbler is carried by the formula (the
  gate would otherwise make a 1-point dabbler 76% of an all-in healer at every level) and a Boss's heal floor is at
  most 36 HP. **No tier exception is needed:** enemies, companions and Figments take the same gate (a 30-HP drone's
  2-AP heal floor is 5).
- **The stim is the gate alone:** `base 0`, `min_pct 0.20`, `gate_hp: null` (its own field): 20% of the target's max
  HP at every level.
- **`cap_pct` = 0.50** (`mending.cap_pct`): no single heal restores more than half its target's bar (an all-in Hymn,
  72 HP at level 1, on a 100-HP frail ally gives 50). Shields have no cap (one shield stands per layer; that is their
  limit). Miracles are exempt.
- **Rounding:** the gate rounds **up**, the formula as today (the heal sink floors).
- **Engine (one place):** `effects/output.ts`, a `mendGate(amount, block, target)` inside `amountOf` for kinds `heal`
  and `shield`, after the Stat × Level product and before the own multipliers; the target's max HP comes in the
  context. **Gap:** `sigil.ts sigilDamageTerms` and the Outburst previews compute a boon before the target is known;
  they must pass it at resolution, and a test asserts every call into the heal and shield sinks went through the gate
  (`test/mend-gate.test.ts`, new). No per-item code.

**The Recruit** (Leon's case: 125 HP, level 1, Insight 1, no Soul skill, the Buff design), today → under this spec:
stage 1 Release (3 AP) **9 → 19 (15%)**, at least one Soldier hit through Class 1 (18); stage 0, 15 (12%); fully
pumped, plain (stage 4) **15 → 30 (24%)**; two quick heals in one turn 19 + 15 = 34 (27%). A stim: 8 → 25 (20%).

## 5. Untrained, normal, all in: the table

One action / one turn in HP on the reference (R), and the turn in percent of R. Untrained = the door at 1 point
(Stat 1.06; the Outburst's Recruit 1.0; prayer at Faith 3 for the Hymn row), gate included. Today (live formula, all in
and untrained) in brackets; × = today misses the new line by more than 12% or a floor.

| Source | Level | All in: action / turn (%) | Normal turn (%) | Untrained: action / turn (%) | Today all-in turn · untrained action |
| --- | --- | --- | --- | --- | --- |
| Mender (B) | 1 / 5 / 10 / 20 | 30 / 94 (65) · 38 / 119 · 51 / 162 · 92 / 289 | 75 (52) · 95 (52) · 144 (58) · 289 (65) | (no untrained Mender) | (40 · 47 · 61 · 87) × |
| Door Tending (B) | 1 / 5 / 10 / 20 | 25 / 85 (59) · 31 / 107 · 43 / 146 · 77 / 260 | 68 (47) · 86 (47) · 130 (52) · 260 (59) | 22 / 74 (51) · 22 / 74 (40) · 22 / 74 (30) · 38 / 129 (29) | (36 · 6) × |
| Outburst Buff (A) | 1 / 5 / 10 / 20 | 32 / 64 (44) · 41 / 81 · 55 / 111 · 99 / 198 | 52 (36) · 65 (36) · 98 (39) · 198 (44) | 22 / 44 (30) · 23 / 45 (25) · 27 / 55 (22) · 49 / 98 (22) | (35 · 10; 41 · 11; 53 · 12; 76 · 18) × |
| Sigil MEND (A) | 1 / 5 / 10 / 20 | 43 / 65 (45) · 55 / 82 · 75 / 112 · 133 / 200 | 52 (36) · 66 (36) · 100 (40) · 200 (45) | 26 / 39 (27) · 31 / 46 (25) · 37 / 56 (22) · 66 / 99 (22) | (43 · 17; 51 · 19; 67 · 22; 95 · 31) × |
| Whisper Health (A) | 1 / 5 / 10 / 20 | 22 (15) · 27 · 37 · 67 | 17 (12) · 22 · 33 (13) · 67 (15) | 14 (10) · 15 (8) · 19 (7) · 33 (7) | (13 · 8; 15; 20; 28 · 14) × |
| Hymn turn (A) | 1 / 5 / 10 / 20 | 72 / 94 (65) · 91 / 118 · 123 / 161 · 220 / 287 | 75 (52) · 94 (52) · 143 (57) · 287 (65) | 43 / 56 (38) · 51 / 66 (36) · 61 / 80 (32) · 109 / 142 (32) | (46 · 20; 54; 71; 101 · 36) × |
| Bard Triage (A) | 1 / 5 / 10 / 20 | 31 / 93 (64) · 39 / 117 · 53 / 160 · 95 / 285 | 74 (51) · 94 (51) · 142 (57) · 285 (64) | 22 / 65 (45) · 22 / 65 (36) · 26 / 79 (32) · 47 / 141 (32) | (37 · 7; 44; 57; 81 · 13) × |

Floors at level 1, untrained: (a) every action ≥ 18 (the Whisper's 14 ≥ 9, half); (b) every turn ≥ 18.5 (prayer's
56 at Faith 3). The normal share passes (a) and (b) at every level. **Untrained at higher levels** misses (a) once: Door
Tending at level 10 (22 against 25); accepted: the gate is for low level, and a level 10 character with 1 point in a
door is a choice. A Sigil dabbler knows two words, so its turn is one MEND · SEEK (26 at level 1, still over (b)). The arithmetic for "today": e.g.
the Outburst all in at level 1: 7 × 1.392 × 1.78 × 2.0 × 1.0 = 35 HP (24%).

## 6. The dials, and the knock-ons

| Source | The one dial (data) | Today | New | Arithmetic (all in, level 1, R 145) |
| --- | --- | --- | --- | --- |
| Every heal and shield's growth | `rules.json output.level.mend` | the enemy damage column | the 20 values of section 1 | holds all in on its percent |
| Outburst Buff heal | `soul_modules.json schools[buff].heal` | 7 | **13** | 13 × 1.392 × 1.78 × 2.0 = 64 (44%) |
| The Bard's Mend (Buff, rank II) | its heal base | 9 | **17** | × 13/7 as before |
| Inverse, Shell | `items[inverse].shield`, `items[shell].shield` | 10, 4 | **17, 7** | 17 × 1.296 × 1.78 × 2.0 = 78 (54%) |
| Sigil MEND, WARD | `sigils.json items[mend].heal`, `items[ward].shield` | 10, 12 | **15, 13** | 15 × 1.17 × 1.392 × 1.78 × 1.5 = 65 (45%); WARD full Line 13 × 2.90 × 2.68 = 101 (70%) |
| Whisper Health, Protection | `patrons.json whispers` health, protection `value` | 5, 6 | **8.5, 10** | 8.5 × 1.44 × 1.78 = 22 (15%) |
| Warm Hands, Saint's Shield | the Hymns' `value` | 13, 16 | **28, 34** | 28 × 2.563 = 72 (50%) |
| Absolution, Coin, Hearthlight | their `value` | 9, 5, 4 | **19, 11, 9** | × 28/13 |
| Mother Ember's intervention | its `value` + `per_devotion` | 10 + 3D, no Level | **7 + 2.1D, Level `mend`** | Devotion 10: 28 × 2.563 = 72, capped 50% |
| Triage, Rally, Will Shield | `rules.json mending.medic` triage, rally; Will Shield's amount | 5, 6, 12 | **12.5, 8, 28** | 12.5 × 1.392 × 1.78 = 31 (22% an action) |
| A stim, Stim Throw | `mending.medic.stim`; `items.json stim_injector` | 6 × Healing given | **base 0, min_pct 0.20, gate_hp null** | the gate is the stim |
| Tending (B) | `output.profiles.tend.k` | 1.573 (Bonds spec) | **3.74** | (4.3 + 2 × 3.75) × 1.2 × 3.74 × 1.78 = 94 (65%) |
| Ward, Sanctuary (B) | `amounts.ward.base`, `amounts.sanctuary_cap.base` | 7, 11 | **10, 21** | 21 × 2.563 = 54: one assault |
| The gate, the cap | `profiles.*.min_pct`, `mending.gate.hp`, `mending.cap_pct` | none | as section 4 | |
| The old Stat floor | `profiles.*.floor` 0.5 | 0.5 | kept (it never binds; the gate is the floor now) | |

**Foundation gaps (not numbers):** (1) `levelFactor('mend')` reads the enemy row in code; (2) the gate needs the target
in `amountOf`; (3) **(B)** the Outburst heal reads Healing given (Empathy, `magic.ts outburstHeal`, `loveHeal`:
`m.healMult`) and the Sigil boon multiplies Healing given as a second Stat (`sigil.ts sigilBoon`): in Classes 3.0
Empathy is Tending's, so each door heals by its own pair: the Buff heal moves to `soul_mend` (base 13 × 1.392 / 1.296 =
**14**), the Sigil boon drops the Healing-given term and `sigil_mend.k` takes it (1.17 × 1.392 = **1.629**), the number
on live unchanged for a caster with no Empathy (question 7); (4) Mother Ember's intervention takes no Level term
(`faith.ts`); (5) enemy heals' Level (section 3).

**Costs and the sustained rate** (a session of three six-round fights assumed; sustained = percent of R a turn
averaged over one fight, the healer doing nothing else while its pool lasts):

| Healer, all in | Price | Pool, levels 1 / 5 / 10 / 20 | Full heal turns a session | Sustained a turn, per fight |
| --- | --- | --- | --- | --- |
| Mender (B) | 22 MP a turn (Triage 6, Mend 8: the Bonds spec, kept); Triage once an ally a turn; the hunt | MP 100 + 25 × (Insight − 1): 250 / 275 / 325 / 325 | 11.4 / 12.5 / 14.8 / 14.8 | 41 / 45 / 53 / 53 |
| Outburst | 40 MP a steady turn (Begin 20 + Pumps 100% of it, rules 1.24); 2 Strain; one heart | MP 100 + 75 × (Determination − 1): 550 / 625 / 775 / 775 (it also pays the damage) | 13.8 / 15.6 / 19.4 / 19.4 | 34 / 39 / 44 / 44 |
| Sigil | 6 charge a 3-glyph Line (90 credits of cores); 5.5 AP; Flux | cores carried | about 5 a fight on 3 cores | about 37 |
| Prayer | no pool: Whisper once a turn, Hymn on its wait (3 rounds all in, 5 to 7 at Faith 3 to 5) | none | every turn | 15 + 50 ÷ 3 = **32**, and 2 to 5 AP still shoot |
| Bard Triage (live) | 2 AP, no MP; **once an ally a turn** | none | every turn | 64 spread over three allies; **21 on one** |

The order holds per turn (65 > 59 > 45 ≥ prayer) and sustained (Mender 41 to 53 > Outburst 34 to 44 > Sigil 37 >
prayer 32). **Watch:** prayer's 32 sustained comes with a rifle; it is measured, not refit on paper (question 6).

**(e) The dedicated healer.** A Mender's 65% is 4.9 Soldier-turns on the reference (13.2% of R each) or 1.8 full
assaults: one Mender keeps one ally standing against about five Soldiers or the whole standard encounter's doctrine,
for as long as its MP lasts (11 turns at level 1). Allowed (Leon: "let them have it"; the enemy hunts the healer). Two
Menders healing each other (130% of R a round in) outlast even all four enemies on one target (58%): **the stall ends
by price, not by numbers**: each runs dry in 11 to 15 turns, Bonds tie them to the enemy hunt (`healer_focus`), and
neither deals damage. Today's simulator (`balance-refit.md` 9.2: tank + all-in healer under three Soldiers, rounds to
first Down 5.3 / 8.0 / 9.1 / 3.6) is expected to read 10 (the cap) at every level: **measure** `DEFENCE_MEASURE=1
DEFENCE_PARTS=fire DEFENCE_ROWS=^tank DEFENCE_N=10` with MP drawn (the simulator must charge MP), a new pair
`menderPair`, and the standard and boss fights for the healer squad (today 7.0 and 10.4 to 10.7 rounds; the boss fight's
target is 8 to 10: if the healer squad passes 12, the lever is `healer_focus`, not the heal).

**The Mender's offence (B).** With `tend.k` ×2.38: (1) **the Ledger cap** keeps its HP (43 at level 1): `amounts.cap.base`
15.5 → **6.5** (6.5 × 3.74 × 1.78 = 43), factor 0.7 kept, so a strike adds what Leon approved and `mender_offence` 70
does not move (a turn of attacks has no heal in it); (2) **the echo** 0.25 of HP restored would rise ×2.38 with the
heals: the heal turn's echo 16 / 14 / 16 / 21% of a rifle-turn per Bonded enemy becomes 38 / 33 / 38 / 50, and the
window with two enemies Bonded 85 / 84 / 86 / 99 → 100 / 97 / 101 / **118** (over 100). **0.25 → 0.10** puts it back
on the measured table (question 4). **Brimming:** half an overheal becomes a shield (a base layer: the larger stands):
at most half a Mend, 11% of R; kept. **Take the Weight** (15% of max HP) kept. **Ward:** 10 × Blessing power (heal dial,
Level), 18% of R, two allies, its own layer: with the strongest base shield under it, one ally can hold 88% of R
(about 2.3 assaults); allowed, it costs the Chaplain's Whisper every turn.

**`rules.json balance`, rewritten:** `unit_heal`: "percent of the reference character's max HP
(`output.level.reference_hp`) restored or shielded by one whole turn, all in"; `ceilings.healer_turn` → `heal_top` 65
(the Mender), `tending_door` 59, `offheal` 45 (`outburst_heal`, `sigil_mend`), `whisper` 15, `hymn_turn` 65 with
`hymn_avg` 45, `shield_top` 70 (`full_assault`: 2), `shield.of_heal` 1.2 kept, `hymn_heal_cap` 250 removed;
`yardsticks.full_assault` (55 / 67 / 89 / 151 at 1 / 5 / 10 / 20, doctrine of 1.25); `floors` (a) and (b) as numbers by
level. Guard bands unchanged (±12% mean, ±25% a level); the floors are hard (no band); the cap and the gate are
checked by `mend-gate.test.ts`.

## 7. How it ships

**(A) Now, on live, a rules revision of its own** (the floors must hold before Classes 3.0): the `mend` column and
`reference_hp`; the gate and the cap; the Buff heal 13, the Bard's Mend 17, Inverse 17, Shell 7; MEND 15, WARD 13;
Health 8.5, Protection 10, Warm Hands 28, Saint's Shield 34, Absolution 19, Coin 11, Hearthlight 9, Mother Ember 7 +
2.1D with the Level term; Triage 12.5, Rally 8, Will Shield 28; the stim as a gate; `balance` rewritten; enemy heals'
Level if missing. **Measure first** (before any number moves, on the tree as it is): `heal-measure.ts` (`underFire`),
`defence-measure.ts` (the `^tank` rows), `refit-measure.ts` (the healer rows), the standard and boss fights for the
healer squad; then after, the same, and the guard. **Golden lines that move** (`GOLDEN_RECORD=1`, then `python3
tools/golden_diff.py --rev <base>`): `faith` (every Whisper and Hymn heal and shield, Mother Ember), `outburst` (Buff at
every stage, Love, Inverse, Shell, the shapes' boon), `sigil` (every MEND and WARD Line), `flat` (the stim),
`items-traits-classes` and `items-shelved` (Triage, Rally, Stim Throw, Will Shield, Ward, the brace shield, the banner's
heal), `builds-normal` and `builds-allin` (the Faith build's Health and Protection; sheet lines), `costs-outburst`,
`costs-sigil`, `rules-outburst.log`, `rules-sigil.log`, and the replay hashes of every game with a healer
(`REPLAY_RECORD=1 REPLAY_FULL=1`). Each changed line must be a heal, a shield or a boon.

**(B) With Classes 3.0:** `tend.k` 3.74 and the Mender's 65 / the door's 59; Tending Shield; Ward 10 and Sanctuary 21;
the Ledger cap 6.5 and the echo 0.10; the Outburst heal on `soul_mend` (14) and the Sigil boon on `sigil_mend` alone
(1.629); prayer from Faith 1 (floors re-checked: a Faith 1 Whisper is gated at 10%, 15 HP on the Recruit). Step 11 of
the patch measures all the lines.

**Spec text, draft (rules 1.29, the number is the builder's to confirm):**

> **Rules revision 1.29: heals and shields in percent of HP.** (1) Healing and shields are measured in percent of the
> reference character's max HP (the normal-share rifleman: 145 at level 1, 445 at 20; `rules.json
> output.level.reference_hp`) restored by one whole turn, all in. (2) They grow with the healer's level by the `mend`
> column (`output.level.mend`: ×1.00 at level 1, ×1.18 at 5, ×1.43 at 10, ×2.55 at 20), which keeps an all-in turn on
> its percent; it no longer reads the enemy table. (3) The lines, all in: the best healer 65% a turn; an off-heal
> (Outburst Buff, Sigil MEND) 45%; a Whisper 15%; a Hymn's turn 65%, 45% averaged over its wait; the strongest shield
> (a full WARD Line) two rounds of the standard encounter's fire on one character (70%); other shields ×1.2 their heal.
> (4) **The gate:** every heal and shield is at least a share of its target's max HP (counted up to 145): 15% for a
> 2-AP action, 10% for a Whisper, 25% for a Hymn or an intervention, times the action's own multipliers. A stim heals
> 20% of its target's max HP. (5) **The cap:** no single heal restores more than half its target's max HP; Miracles
> are exempt. (6) The new numbers: [the (A) list]. Supersedes rules 1.20 section 3 (the level factor), 1.23's medic
> numbers, 1.27 (the 2.0 Soldier-turn ceiling, its floor and the Hymn heal cap).

Section 14 items (all **PROVISIONAL**): the reference curve and the smoothing; the `mend` column; each line of section
3 (65, 59, 45, 15, Hymn 65/45, shield top 70, ×1.2); the full assault's definition; the gate's three percents, its 145
and the stim's 20%; the cap 50%; every base of the (A) list; Mother Ember's Level term; enemy heals' Level; floors (a)
and (b) and the Class 1 armour they read.

## 8. Open questions for Leon (each with the recommendation; built as recommended if unanswered)

1. **"A full assault":** the doctrine's fire on one character (Elite focused, Soldiers spread: 34 to 38% of R; two =
   70), or all four enemies on one (56 to 60%; two = 115 to 120%, a shield bigger than the bar)? **The doctrine's.**
2. **The gate's ceiling of 145 HP** (it fades from level 5 on), or the level's reference HP (every dabbler at about 76%
   of an all-in healer at every level)? **145:** "at low level", as you said; the formula carries the rest.
3. **A stim as 20% of the target's max HP** (gear, credits, not a door), not a multiple of Healing given. **Yes.**
4. **The echo 0.25 → 0.10** (you ruled "a quarter" when heals were 2.4 times smaller; 0.10 deals the HP you approved
   and keeps the window under 100), and the Ledger cap's base 15.5 → 6.5 (its HP unchanged). **Yes to both.**
5. **Ward 7 → 10 × Blessing power**, equal to Protection, not 17% over it: it stacks on any shield. **10.**
6. **Prayer's sustained 32% beside a rifle** (no pool): kept and measured; if the Faith build's combined line passes
   the Mender's sustained, the Hymn's 28 is the dial. **Measure first.**
7. **Each door heals by its own Stat in Classes 3.0** (the Outburst by Will Power, the Sigil by Brain Power, Empathy only
   for Tending). **Yes**: otherwise a Channeler or a Mage who dips Empathy buys the Mender's edge.
8. **The Whisper at 15, not 28**, and the door user at 59 (91% of the Mender), not 57: the arithmetic of section 3.
   **As written.**
9. **What cannot hold at 65:** the Outburst's biggest Release (71% by formula) and the full MEND Line (81%) pass the top
   as single actions; the per-action cap (50% of the target) holds them. If you would rather keep them under 65 by
   their own numbers, the dials are `cycle.stage_mult` and `grammar` (the second MEND's share). **The cap.**
