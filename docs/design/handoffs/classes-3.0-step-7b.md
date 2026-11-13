# Classes 3.0, step 7b: the level scale, and healing and shields in percent of HP (rules 1.36)

Built 13 Nov 2026 on the worktree branch `worktree-agent-aa7fcf4cb4350f000`, from `claude/charming-gauss-hbq4n0`
(12a34e7b, all four systems merged). Specs: `level-scale-spec.md`, `heal-shield-percent-spec.md` (each with its
"Settled by Leon" block). Spec text: Core Rules "Rules revision 1.36", items 2300 to 2335, all PROVISIONAL. Not pushed,
version not bumped.

## 1. What was built

**The level scale.** One primitive change: `levelFactor(column, level)` reads any named array of `output.level`
(`deal`, `scale`, `mend`, `reference_hp`); `scaleOf(level)` is `levelFactor('scale', level)`. Everything else is data
or one `scale` term at the one place a number is read in code:

| Site | Where | Term |
| --- | --- | --- |
| Max HP | `character.ts maxHp` | `round(scale(level) × fx(c, 'hp', old formula))` |
| A character's armour (Class + gear + items) | `character.ts armourOf / classArmour`, `combat.ts unitFromCharacter` | × scale at its level |
| A weapon's armour break | `combat.ts onHit` | × scale at the striker's level |
| Armour a technique or a weapon ignores | `physical/core.ts` (the strike's `ignoreArmour`), `combat.ts attackDamage` (weapon props, ignore_armour op) | × scale at the striker's level |
| Guard's soak | `physical/guard.ts`, the read-out in `physical/core.ts` | × scale at the holder's level |
| Strain's burn (and its preview warning), Shame's self-damage, residue, the Aura's tick | `magic.ts strainBurn`, `heldPlan`, `residueTick`, the Aura | × scale at the caster's level |
| Objects and cover | `combat.ts objectAtLevel` (startCombat, objectsOf), `sigil.ts` RAISE wall | at the fight's level / the maker's; `MapObject.hpLvl` keeps the level its HP is in |
| Flat things made by nobody | `effects/mending.ts flatLevelOf` | the enemy table's damage column (was `levelFactor('mend')`) |
| Old saves | `character.ts migrateCharacterHp` (`hpRev` 136), `game.ts migrateCombatHp` | HP × scale, once; a fight's units and objects too |
| A level-up | `character.ts applyLevels` | adds the rise in max HP |
| A Figment's HP | `figments.ts figmentBlock` | `statTerm(figments.json level.hp_stat)` on the maker's Visualization; `level.hp` is `["hp_mult"]` |

**Heals and shields in percent.** The gate and the cap of step 1b are switched on by data (`profiles.*.min_pct`,
`mending.gate`, `mending.cap_pct`); `mendGate` counts the gate's HP × scale at the giver's level and rounds up with an
epsilon (0.2 × 1.6 × 125 is 40, not 41). Two helpers next to `mend` route the sources that size their own number
through the same gate: `mendSized` (give it) and `gatedAmount` (preview it). Wired: the Outburst's Buff heal and Inverse
(`magic.ts`, resolution and preview), the Sigil boon (`sigil.ts numbersFor`), the Whisper and the Hymns (`faith.ts
healLine`, Protection, Saint's Shield), Mother Ember's intervention, the stim (`combat.ts stimOn`: the gate alone), and
every item amount through `mend()` (Tending, through its `tend` profile and the blocks' own `min_pct`).

**Display.** `apps/web/src/game/numbers.ts` (`fmtNum`, `fmtFloat`, with a test): the floating damage, heal and shield
numbers (`game/fx/play.ts`) and the cover read-out (`game/fx/ranged.ts`). HP bars are fractions already. NOT done (the
screens agent's files): the HP readouts and hover cards in `apps/web/src/screens/**` and templates; the combat log's
numbers are engine text (`say`) and are not separated.

## 2. Every changed field (old → new)

| File, field | Old | New |
| --- | --- | --- |
| `rules.json output.level.deal` | 1 … 1.6 (rules 1.26) | 7.5^((L − 1)/19): 1, 1.1119 … 1.5284 (5) … 2.5972 (10) … 7.5 |
| `output.level.scale` | (new) | new deal ÷ old: 1 … 1.2736 (5) … 1.7708 (10) … 4.6875 |
| `output.level.mend` | pointer to the enemy damage column | M(L) × scale: 1 … 1.5054 … 2.5322 … 11.9672 |
| `output.level.reference_hp` | (new) | 145, 159, 182, 203, 233 … 441 (10) … 2,086 (20) |
| `enemies.json levels.table` hp / armour / damage _mult | 1.81 / 1.6 / 1.82 at 20 | × scale: 8.4844 / 7.5 / 8.5312 at 20 |
| `output.profiles` physical, elemental, healing, blessing `.level` | null | `"scale"` |
| `profiles.tend.k` | 1.573 | 3.74 |
| `profiles.sigil_mend.k` | 1.17 | 1.629 (the boon no longer reads Healing given) |
| `profiles.mend / sigil_mend / soul_mend / tend .min_pct` | — | 0.2; `blessing_mend` 0.1333 |
| `profiles.figment_hp`, `pairs.figment_hp` | (new) | k 0.35, skill 0.15 on Visualization |
| `mending.gate` | — | hp 145, whisper 0.1333, hymn 0.3333, intervention 0.3333 |
| `mending.cap_pct` | — | 0.5 |
| `mending.medic.stim` / `stim_pct` | 6 / — | 0 / 0.2 |
| `soul_modules.json schools.buff.heal` | 7 | 11.3 (now on soul_mend) |
| `modules.inverse.shield` | 10 | 7 (Shell 4 kept) |
| `sigils.json mend.heal / ward.shield` | 10 / 12 | 15 / 4.3 |
| `patrons.json` Health / Protection | 5 / 6 | 8.5 / 10 |
| Warm Hands / Saint's Shield / Absolution / Coin / Hearthlight | 13 / 16 / 9 / 5 / 4 | 28 / 34 / 19 / 11 / 9 (Coin's text now reads its value) |
| Mother Ember's intervention | 10 + 3D, no Level | 7 + 2.1D, the heal Level term |
| `classes.json` Sanctuary pool | 11 | 40 |
| the Ledger's cap base | 15.5 | 6.5 (factor 0.7, echo 0.20 kept) |
| `tending.json` Raise `min_pct`; classes Rally `min_pct` | — | 0.1333; 0.08 |
| `rules.json shadow.per_point` (and skills.json ingenuity.1) | 0.15 | 0.7 |
| `figments.json level.hp` | ["hp_mult", "damage_mult"] | ["hp_mult"], `hp_stat` "figment_hp" |
| perks shrug_it_off, clean_hands, field_surgeon; trait crawler_blooded chitin | profile flat | no profile (a share carries no Level) |
| `rules.json balance` | healer_turn 200 Soldier-turns | `unit_heal`; healer_turn 45 (% of R) with hymn_heal_cap 65, hymn_avg 45, whisper 15; tending_turn 65 (door 59); `shield_order`; yardsticks `soldier_turn` × scale, `full_assault`, `heal_floor` |
| `derived.body.max_hp` text | old formula | × scale |

## 3. The golden diff (the factor check)

`python3 tools/golden_scale_check.py --rev 12a34e7b` (new, committed): for every changed golden line, its level (from
the key, else inferred; a line may hold two levels, a character in a fight of another level), level 1 lines must be
byte-identical, and every number above must stay or move by scale(level). Run on the scale commit alone (d7f84f64,
before the heal work): **23,738 lines; 0 changed at level 1** (two `weapon-bend/…/L1` keys name the enemy's level, the
shooter is level 6: moved by scale(6)); 6,399 moved by scale exactly. The rest, read by hand:
- *did not move* (16): harness literals (a shield of 8 or 15, HP set to 9, a strain test's shield 12) — not engine sites;
- *moved otherwise* (~570): mixed levels the two-level inference cannot separate, the harness's fixed amounts (`flat/harm/<type>/30`, `special/order/spell/*/77`: a number handed to the sink is not scaled, by design), Guard's whole points against a scaled soak (the tank's `taken` lines), kills crossed by rounding;
- *scale²* (11): the same mixed-level lines (a level 3 character under a level 6 Soldier); none was a double Level term once the harness read armour from the engine (`classArmour`).
A bug found by it and fixed: the armour-break line had swallowed its own `setEffectiveArmour` call behind a comment.
The heal and shield lines then moved again by the percent work (re-recorded after it): every Whisper, Hymn, MEND, WARD,
Buff, Inverse, Tending, stim and intervention line.

## 4. Measured (the tools in `test/balance/`; small samples, the heavy runs were made on a machine at load 20+)

| Line | L1 | L5 | L10 | L20 | Mean | Line it holds to |
| --- | --- | --- | --- | --- | --- | --- |
| Plain hit on a Soldier | 40 | 60 | 103 | 299 | | (40 / 48 / 59 / 64 before) |
| Reference (normal build) HP | 145 | 233 | 441 | 2,086 | | |
| Contract, all in: plain | 126 | 123 | 109 | 108 | 117 | 125 (bands unchanged; passes) |
| gun / blade | 164 / 155 | 171 / 152 | 167 / 133 | 145 / 173 | 162 / 153 | 145 / 165 |
| sigil4 / ob / obPeak | 147 / 146 / 137 | 147 / 149 / 196 | 194 / 135 / 153 | 215 / 116 / 160 | 176 / 137 / 162 | 150–200 / 135 / 165 |
| whisper / hymn / Chaplain | 91 / 117 / 113 | 82 / 110 / 134 | 66 / 147 / 127 | 113 / 167 / 150 | 88 / 135 / 131 | 80 / 150 / 125 |
| Off-heal (Buff steady, % of R) | 56 → 45 after the fit (constant at every level) | | | | 45 | 45 |
| Mender's healing turn (% of R) | 70 | 64 | 65 | 65 | 66 | 65 |
| Door Tending all in / normal | 67 / 63 | 62 / 51 | 62 / 38 | 62 / 36 | 63 / 47 | 59 / ÷1.25 |
| Recruit (125 HP, no Soul skill) | quick heal 25, fully pumped 40 (stage 4, plain) | | | | | ≥ 25 |
| Faith's top shield (Sanctuary pool, all in, arithmetic) | about 70% of R (40 × 2.56 = 102 at L1) | | | | | 1.0 |
| Tending shield / WARD full Line / Inverse steady (arithmetic) | 25 / 23 / 22 % of R | | | | | 0.36 / 0.33 / 0.33 of Faith's |
| Mender offence solo / squad (no Ledger) | 95 / 95 | 78 / 86 | 70 / 76 | 73 / 80 | 79 / 84 | 70 (gap: see 5.3) |
| Mender strike, Ledger full (cap 15.5) | 162 | 137 | 127 | 172 | 150 | (cap 6.5: about 123 at L1 by arithmetic) |
| Figments door normal / all in | 99 / 169 | 114 / 129 | 137 / 116 | 145 / 129 | 124 / 136 | 104 / 130 |
| Figments Rigger normal / all in | 99 / 156 | 149 / 129 | 122 / 142 | 122 / 112 | 123 / 135 | 120 / 150 |
| Shadow door / Operative (per_point 0.7, 24 fights) | 121 / 123 | 101 / 134 | 101 / 125 | 106 / 100 | 107 / 121 | 109 / 125 |
| Skirmisher | not re-measured (161 before; a ratio line: the guard's damage rows did not move) | | | | | 145 |

Rounds-to-kill between equals (c): the contract guard's damage rows are ratios on the same seeded range and pass with
their bands unchanged; the spec's arithmetic (section 3) gives the same rounds within 2% (the one cell, a Soldier on
the rifleman at level 10, is integer rounding). The full `DEFENCE_PARTS=fights` and the healer-stall run (`fire`,
`^tank`, a Mender against two and three Soldiers) were **not run**: the machine was at load 20+ for the whole step
(three agents); they are step 11's.

## 5. Where a spec was wrong or silent, and what was done (calls for Leon)

1. **"×7.5" and the column called `scale`.** Leon's settled block lists 1, 1.53, 2.60 … 7.5 as `scale`; those are the
   new `deal`. Built as the level-scale spec defines it: `deal` = 7.5^((L−1)/19), `scale` = new ÷ old deal (4.69 at
   20), which gives his 300 hit and "half the ×15 HP". (Item 2300.)
2. **The Buff heal at 14 measured 56% (line 45)**: fitted to 11.3 by its dial. The Outburst heals by its own pair
   (soul_mend), the percent spec's question 7, built as recommended.
3. **The Mender's offence steady (79 / 84 against 70) cannot be reached by the Ledger**: the steady line has no Ledger
   in it; its contract dial is `tending.json bond.per_bond`. The Ledger's cap was set to 6.5 (the spec's: its HP as
   before), which keeps the best window under 100 by arithmetic (about 91 at level 1). Gap reported, not chased.
4. **Shields' order**: the percent spec's 70 for the WARD Line is replaced, by Leon's settled 4, with Faith on top;
   "a share of Faith's" was chosen by single use: Tending shield 0.36, WARD Line and Inverse 0.33 (WARD 12 → 4.3,
   Inverse 10 → 7). A big cut to WARD: Leon to confirm. Faith's top is Sanctuary's pool (40).
5. **Figments**: one dial (HP through Visualization) brings the door all in to 136 and the Rigger all in to 135: it
   cannot put the door 13% under the class (the class's edge is its moves, not HP). Normal shares sit under all in at
   levels 1 to 5 and catch up later, as the contract's ruling 1 says. Small samples (4 fights a cell, ±15).
6. **Shadow**: one dial for two lines; at 0.7 the door is 107 (109) and the Operative 121 (125): both inside, the
   Operative 3% under.
7. **The Chaplain** (item 2334): not refitted. The dial its hand-off names (Smite's base) is held equal to Rebuke's 20
   by the validator (rules 1.31), and a constant cannot flatten one level. 131 mean, level 20 at 150 (inside ±25%).
8. **The Emanator katana** (item 2333): **stopped, still needs engine code.** `FOCUS_IDS` in
   `packages/engine/src/character.ts` builds each focus kind from `FOCUS_BASE` (the mana arms typed as ids:
   `evoker_blade`, `emanator_gauntlet`, …) plus `ITEM` entries (items.json) with a `focus` block; it never reads
   `WEAPON` (weapons.json). A weapon with `focus: {door: 'will_power', …}` is ignored. One general line (read weapons
   too) would do it; the `it.todo` in `test/katana.test.ts` stays.
9. **Superseded tests kept as a skipped record**: the rules 1.20 bands (`heal-measure.test.ts`) and the rules 1.23
   medic kit (`defence-measure.test.ts`) measure in Soldier-turns and the old stim; the new lines are held by
   `balance-contract.test.ts` and the new `heal-pct.test.ts`. The guns guard's long-rifle top 1.12 → 1.13 (armour
   rounding at level 6, item 2335).
10. **Objects not yet scaled** (item 2309): the shelved advanced classes' objects and the Sentry turret's literal 40.
11. **Not built**: thousands separators in `screens/**` readouts and hover cards (the screens agent's lane); the
    browser suites were not run (no time on a loaded machine): the ones that pin a number above level 1 (`pg-levelup`,
    `sigil14`, `heart`, `figments`, …) are step 10's to re-pin.

## 6. How to add a number measured in HP

Give it an amount block with a profile (its Level term comes from the column), or, where code reads a data number
that is HP, multiply it by `scaleOf(level of whoever owns it)` at that one place. A share of max HP or of a hit takes
no profile. A heal or shield goes through `mend()` (an amount block) or `mendSized` (a number you sized) so the gate
and the cap apply. Then `python3 tools/golden_scale_check.py --rev <base>`.

## 7. `npm run built-from` on this step (10 smells in 5 places, none a lint fails on)

- `character.ts` 611, 916 and `game.ts` 465: the old-save move and the level-up's rise in max HP set HP by hand: a
  change of units, not damage or healing (as `migrateCharacterMp` does for MP).
- `combat.ts` 673: `objectAtLevel` puts an object's HP in the level's units (not damage).
- `faith.ts` 1152 to 1227: the prayer switch by id was there before; this step only routed its amounts through `mendSized`.
- `magic.ts` 1776, 1781: the Outburst's preview sums were there before; this step wrapped them in `gatedAmount`.
