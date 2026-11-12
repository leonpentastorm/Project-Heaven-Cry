# The re-fit: balance pass stage (b), steps b1 to b8 (rules 1.26, 12 Nov 2026)

Stage (b) of [`../proposals/2026-11-unified-damage.md`](../proposals/2026-11-unified-damage.md) on the one damage
formula of stage (a) ([`unified-damage-stage-a.md`](unified-damage-stage-a.md)). The rulings it builds are Leon's of
12 Nov 2026: every ceiling is what an **all-in** build reaches and a normal share sits at ceiling ÷ 1.25; **no damage
slope on a rolled attack** (skill buys accuracy, level buys damage); flat things grow with level; every system's
identity is a **named multiplier in data**; cost counts. The contract that now holds it all:
[`../balance-contract.md`](../balance-contract.md), `data/rules.json` `balance`, and the guard
`packages/engine/test/balance-contract.test.ts` (in `npm run check`, about 20 seconds). Spec: rules 1.26, items 1700
to 1724.

## 0. The result

1. **b1, the profiles and Level.deal: done.** Three shapes (aimed, landed, flat). The normal-share plain rifle hits
   exactly as before at all 20 levels (the golden plain-rifle lines did not move).
2. **b2 to b6, each system on its ceiling: done**, one dial each (table below). All in, the average over levels 1, 5,
   10 and 20 is within 9% of every ceiling.
3. **b7, flat things grow with level: done** (grenades, charges, splash, traps, hazards, barrels, ticks).
4. **b8, the guard: done.** Hybrids re-measured (the Faith build's rifle; casters' sidearms now hit like anyone's).
   **Boss HP re-run** (section 4 item 6): the boss fight is 5.3 to 7.8 rounds for the damage squads, as in rules 1.25
   (6.3 to 7.4); not changed.
5. **(a) Many targets: measured**, a per-extra-target rule proposed and built into the contract; the thrown factor
   fitted.
6. **(b) The control yardstick: written**, the conditions priced against it (arithmetic, not played).
7. **(c) The unmeasured systems: melee beyond one build, mana arms, Elites by damage type measured;** thrown fitted;
   the rest listed.
8. **(d) The contract and the guard: done.**

## 1. Before and after, by system and level

Percent of the normal-share plain rifle's turn at the same level (heal: of a Soldier-turn), on the range,
`refit-measure.ts` (`REFIT_MEASURE=1`). Before: 12 fights a cell on the tree this branch started from; after: 16. A
cell is about ±5 points. "n" normal share, "a" all in.

| System (ceiling, all in) | L1 n | L1 a | L5 n | L5 a | L10 n | L10 a | L20 n | L20 a |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plain rifle (125) | 99 → 103 | 178 → **129** | 107 → 104 | 138 → **113** | 99 → 101 | 121 → **112** | 103 → 104 | 101 → **101** |
| Best gun (145) | 152 → 136 | 235 → **164** | 139 → 130 | 194 → **150** | 149 → 131 | 179 → **148** | 152 → 133 | 148 → **135** |
| Greatsword (165) | 117 → 149 | 166 → **156** | 118 → 149 | 142 → **149** | 107 → 131 | 119 → **131** | 140 → 172 | 141 → **176** |
| Tank (lower) | 66 → 93 | 44 → **77** | 53 → 87 | 24 → **52** | 53 → 92 | 35 → **74** | 79 → 118 | 83 → **121** |
| Sigil, 2 glyphs | 92 → 80 | 131 → 108 | 103 → 107 | 118 → 106 | 84 → 84 | 128 → 119 | 113 → 111 | 92 → 93 |
| Sigil, 3 glyphs | 94 → 79 | 156 → 130 | 96 → 110 | 165 → 149 | 110 → 122 | 151 → 150 | 134 → 150 | 129 → 129 |
| Sigil, full Line (150 to 200) | – | 192 → **155** | 156 → 147 | 154 → **145** | 188 → 189 | 197 → **174** | 221 → 210 | 218 → **188** |
| Outburst steady (135) | 139 → 104 | 221 → **128** | 132 → 104 | 218 → **149** | 164 → 132 | 181 → **132** | 154 → 123 | 168 → **136** |
| Outburst peak (165) | 78 → 57 | 248 → **147** | 156 → 130 | 275 → **166** | 180 → 142 | 195 → **150** | 189 → 153 | 194 → **157** |
| Whisper turn (80) | 97 → 105 | 86 → **98** | 84 → 98 | 60 → **71** | 67 → 83 | 51 → **57** | 82 → 94 | 95 → **98** |
| Hymn turn (150) | 94 → 97 | 116 → **124** | 96 → 99 | 92 → **95** | 150 → 157 | 148 → **157** | 160 → 167 | 160 → **167** |
| Healer's turn (125) | 151 → 112 | 218 → **146** | 168 → 115 | 200 → **132** | 170 → 112 | 190 → **122** | 153 → 99 | 153 → **99** |

All in, averaged over the four levels: plain 114, gun 149, greatsword 153, full Line 166, Outburst steady 136 and peak
155, Whisper turn 81, Hymn turn 136, healer 125.

The levels moved from the proposal's 1, 3, 6, 9, 12, 20 to the brief's 1, 5, 10, 20. Outburst peak at level 1 at a
normal share (57%): the caster walks into reach first, so the "one turn" peak is over two turns.

## 2. Every number that changed (data unless said)

| Where | Was | Now | Item |
| --- | --- | --- | --- |
| `rules.json output.profiles.weapon` | k 1, attr 0.1, skill 0.05, no Level | **k 1.5, no slope, Level deal** | 1700 |
| `output.profiles.sigil` | k 1, 0.1 / 0.1 | **k 1.7, no slope, Level deal** | 1700 |
| `output.profiles.soul` | k 1, 0.05 / 0.1 | **k 1.55, no slope, Level deal** | 1700 |
| `output.profiles.elemental` | k 1, 0.1 / 0.05 | **k 1, no slope** (no Elemental bonus) | 1700 |
| `output.profiles.blessing` (and `blessing_mend`) | k 1, Faith 0.1 | **k 0.956, Virtue 0.06 and Faith 0.06** (`output.pairs.blessing` gains Virtue) | 1706 |
| `output.profiles.healing` and `mend` | k 1, 0.1 / 0.1 | **k 0.87, 0.06 / 0.06** | 1707 |
| `output.profiles.sigil_mend`, `soul_mend` | (new) | **k 1.2 and k 0.81, 0.06 / 0.06, Level mend** | 1708 |
| `output.profiles.flat` | Level none | **Level deal** | 1709 |
| `output.level.deal` | ×1 at every level | 1, 1.067, 1.1, 1.167, 1.2, 1.267, 1.3, 1.367, 1.4, 1.467, 1.5, 1.567, 1.6 (to 20) | 1703 |
| `rules.json rarity` (from `character.ts`) | Masterwork, Relic, Celestial damage ×1.1 | **×1.0** | 1701 |
| `output.factors.melee` | (new) | **×1.35** | 1702 |
| `output.factors.thrown` | (new) | **×0.7** (consumables a character throws or sets) | 1710 |
| `sigils.json grammar.line_mult` | 1.7 / 1.75 / 1.8 | **1.87 / 1.93 / 1.98** | 1704 |
| `soul_modules.json damage.base` | 40 | **31** | 1705 |
| `rules.json balance` | (new) | the contract | 1711 |
| Texts | the formulas in `rules.json derived.multipliers`, `soul_modules.json damage.soul_mult` and `.text`, `attributes.json` Insight's derived line; the spec's Rarity table | brought to the new numbers | |

### Engine changes (not numbers), each because a step said so or a number needed a place

1. `magic.ts`: a character's heart and Evoker carry `deal` (the Level term), `sigilBoon` and `soulBoon` (the landed
   Stat of a boon and a Soul shield); `outburstTerms` multiplies by `deal`; `inverseShield`, `shellShield` read
   `soulBoon`. `sigil.ts`: `sigilDamageTerms` multiplies by `deal`; MEND and WARD read `sigilBoon`. `faith.ts`: a
   prayer's damage and an intervention take the blessing profile's Level term (none today: data). Enemies and tests'
   hand-made hearts have none of the three, so they read ×1 or the old multiplier.
2. `effects/mending.ts` `flatLevelOf` (b7): `combat.ts hurtUnit` and the three ticks multiply a flat thing by it. An
   enemy's splash was scaled in `splash()`; it is now scaled in that one place (the same number).
3. `effects/output.ts` `factorOf` (the named factors); `combat.ts attackDamage` (melee), `tactics.ts blast` and
   `perks/c.ts detonate` (thrown) read it.
4. `character.ts RARITY` reads `rules.json rarity`.
5. `ai-sigil.ts biteOf`: the AI's estimate of a field counts the Line multiplier and the Level term (it left the Line
   out, so a field that kills read as one that nearly does). **A behaviour change:** an enemy walks round a field it
   would die in. `sigil14-ai` pins it with a Minion of 25 HP.
6. The measuring tools: `test/balance/refit-measure.ts` and `.test.ts` (new: every system at any level; the cluster);
   `sim.ts runFight` takes a `watch` callback; `heal-measure.ts` reads `sigilBoon`; `tools/golden_diff.py` (new: what
   moved in the golden tables against a git revision).

## 3. Calls made for Leon (each built; reverse any)

1. **One constant per system, no ladder** (item 1712). All in is a little over early (the best gun 164% at level 1)
   and under late (135% at 20). The ladder (rank III and the Mastered perk carrying the last 25%) waits for those moves.
2. **The gun's dial is Masterwork's damage** (×1.1 → ×1.0, item 1701). The gun premium over the plain rifle was mostly
   Masterwork (+25 to 37% from rarity alone, measured); the plain rifle is itself a gun, so a "gun factor" would have
   moved the reference. Rarity keeps its accuracy, durability, mod slot and marks.
3. **Melee's dial is a factor on every melee blow a character strikes** (×1.35), the Tank included; it stays lower by
   its own play (Guard, the shield).
4. **Prayer damage takes no Level term** (the landed shape, as the proposal's first fit). With it the Hymn turn was 224
   to 249% at levels 10 and 20.
5. **Elemental damage gives no bonus** (the aimed shape has no slope; Expression keeps the glyph AP).
6. **A boon and a Soul shield keep a slope through a landed Stat of their own system** (`sigil_mend`, `soul_mend`),
   so they did not lose their growth with the aimed damage Stat.
7. **Flat things made by nobody grow by the enemy table's damage column at the fight's level**; made by an enemy, by its
   own tier and level.
8. **The thrown factor applies to consumables only** (a frag, an incendiary, a satchel); a launcher's shell (the thumper,
   the breacher tube) is a weapon and keeps its number. An enemy's grenade keeps its number.
9. **The per-extra-target rule is half a target for each extra** (measured cluster 2.4 / 2.8 / 2.95 / 2.0); it validates
   today's shapes and leaves CHAIN 17% over.
10. **The guard's bands**: average ±12%, each level ±25%; the Hymn turn's low end 55% (Devotion 3 has Hymn I only), the
    Whisper turn's high end 140% (the rifle half's shape). Six fights a cell, seeded.

## 4. What could not be fitted, and why

1. **The 1.25 ratio for melee** (item 1714): a blow almost always lands against a Soldier's Defense, so with no slope the
   all-in greatsword is 1.05 times a normal share at level 1 and 1.0 later. Needs a second dial (Leon's call).
2. **The 1.25 ratio for the plain rifle after level 1** is the roll's: 1.25 at level 1, 1.09 at 5, 1.11 at 10, 1.0 at 20
   (item 1713). As the proposal said, no formula holds it once a normal share catches the cap.
3. **Sigil: a normal share draws faster than all in** (Expression's glyph AP; item 1717): the full Line is 189 to 210%
   at a normal share at levels 10 and 20, all in 174 to 188%.
4. **The Hymn turn at levels 1 to 5** (95 to 124%): Devotion 3 gives Hymn I only. The ceiling is reached from Devotion 6.
5. **CHAIN** is 17% over the area rule (left: it needs a glyph and a second target).
6. **Boss HP (rules 1.23): re-run, not changed.** `DEFENCE_MEASURE=1 DEFENCE_PARTS=fights DEFENCE_FIGHTS=boss,standard
   DEFENCE_MAPS=open DEFENCE_N=6 DEFENCE_LEVELS=1,6,12,20`: the boss fight on open ground 6.8 / 5.3 / 6.3 / 7.7 rounds
   (the Sigil squad), 7.0 / 7.3 / 7.7 / 7.5 (guns), 7.8 / 7.5 / 6.7 / 6.5 (Outburst), 10.4 / 10.2 / 10.5 / 10.7 (the
   healer squad), all won (83% for the healer squad at level 1); the standard fight 4.3 to 6.0 (7.0 with the healer
   squad). Rules 1.25 measured the boss fight at 6.3 to 7.4: the re-fit leaves it where it was, still under its 8 to 10
   rounds target (item 1409's lever is the enemy table, a ruling). Six fights a cell: read a cell as about ±1 round.
7. **Not measured** (PATCH-TALLY 10): class moves, perks, Mastered perks, traits, weapon mastery, special rounds and
   mods, Calls and squad buffs, reactions, stealth openers, armour, enemy casters, Overdraw and Heart Overload. The
   guard does not hold them.

## 5. (a) to (c): many targets, control, the unmeasured systems

1. **The cluster** (`refit-measure.ts cluster`, 8 fights a cell, the reference squad against 3 Soldiers and an Elite):
   within 1 tile of an enemy 2.47 / 2.31 / 2.50 (levels 1, 6, 12, open ground), 1.75 / 3.17 / 2.33 in cover; within 2
   2.88 / 2.70 / 2.75; within 3 about 2.95; another enemy within 3 tiles always (open). Denser than the proposal's
   estimate (1.6 and 2.2 a shape).
2. **Areas against the rule:** Sigil SPREAD 1.68 (allowed 1.9), PUSH 1.68 (1.7), Wave and Burst 1.68 (1.7), Aura 1.44,
   CHAIN 1.75 (1.5: over). A frag at 40: 98 landed on the cluster at level 1 against 61 allowed: **fitted** (×0.7: 64).
3. **Control** (the contract, section 5): the yardstick and the condition table; Stopping Shot, a flashbang and Cut Short
   estimated inside their allowances. Nothing changed.
4. **Melee beyond one build** (all in, levels 5 and 10): greatsword 156 / 140, maul 168 / 165, glaive 124 / 144, war
   axe 136 / 152, Ork machete 103 / 124, servo fist 125 / 130 (fists could not be built on that sheet); light blades on
   the Dexterity build: sabre 155 / 152, gladius 141 / 146, duelling blade 140 / 131, combat knife 85 / 81. Inside 165.
5. **Mana arms** (the gunner's sheet): core rifle 152 / 143, spellslinger pistol 118 / 128, censer gun 120 / 123.
6. **On an Elite** (percent of the plain rifle on the same Elite, all in, levels 5 / 10): best gun 141 / 161, full Line
   124 / 162, Outburst steady 162 / 174, Hymn turn 112 / 189, greatsword 143 / 155. Armour-ignoring damage gains about
   a quarter there; held, as the proposal recommended.
7. **Known to re-check:** Bleeding (3 rounds) is 5 a round × the Level term: about 11% of a rifle-turn a wound at level
   1 by the over-time rule; left. The breacher tube's splash of 60 was not measured on a group.

## 6. The golden tables re-recorded (numbers moved on purpose)

Every table that holds a damage, heal or shield number moved: `builds-normal`, `builds-allin`, `weapons`, `techniques`,
`sigil`, `outburst`, `faith`, `flat`, `special`, `items-perks`, `items-traits-classes`, `items-shelved`, `literals`, and
the rules, costs, conditions and item-ops tables whose states follow from a hit (a unit Downed sooner, a condition that
no longer lands on a dead one), and `replays.json` (`REPLAY_RECORD=1 REPLAY_FULL=1`). Checked before recording: the
normal-share plain rifle's lines (`build/plain_gun/normal/*/plain/*`) moved only in their preview's last decimal and the
sheet line; every other change is one of the dials above. `python3 tools/golden_diff.py --rev <the branch's base>`
lists them table by table.

## 7. How to balance a new system

[`../balance-contract.md`](../balance-contract.md) section 6. In short: give it an amount and a profile, one dial in
data, price one use with the budget rule, measure it with `refit-measure.ts`, fit with the dial only, add its ceiling
to `rules.json balance` and its row to the guard.

## 8. Touched

- Data: `rules.json` (`balance`, `rarity`, `output.profiles`, `output.pairs.blessing`, `output.level.deal`,
  `output.factors`, `derived.multipliers` texts), `sigils.json`, `soul_modules.json`, `attributes.json`.
- Engine: `effects/output.ts`, `effects/mending.ts`, `effects/index.ts`, `character.ts`, `combat.ts`, `magic.ts`,
  `sigil.ts`, `faith.ts`, `tactics.ts`, `perks/c.ts`, `ai-sigil.ts`.
- Tests: `balance-contract.test.ts` (new), `balance/refit-measure.ts` and `.test.ts` (new), `balance/sim.ts`,
  `balance/heal-measure.ts`, the balance bands brought to rules 1.26 (`defence-measure`, `faith-measure`,
  `heal-measure`, `magic-measure`), and about 30 rules tests whose numbers were the old slopes (each now reads the
  number from data or a neutral caster, `deal: 1`).
- Docs: the spec (rules 1.26, items 1700 to 1725), `balance-contract.md` (new), this hand-off, `PATCH-TALLY.md`, the
  hand-offs README. Tools: `tools/golden_diff.py` (new).
- Not touched: versions, the changelog, `PICKUP.md`, `CLAUDE.md`, the web client.

## 9. Rules 1.27, the heal re-fit (12 Nov 2026)

Leon on live 0.23.0: "a recruit at level 0 soul skill and a fully pumped soul mend heals for 6, his HP is 125, we might
have over-nerfed the healing." The lead's ruling, built: a healer's turn all in is **2.0 Soldier-turns** (was 1.25), a
normal share 1.6; every heal and shield ×1.6 by its dial, re-measured and trimmed to an all-in average of 200 over
levels 1, 5, 10 and 20; Faith ×1.6 unless a Hymn turn's healing passes 2.5 Soldier-turns (it did: capped); a floor of
half a normal share for a caster with no points in the skill. Spec: rules 1.27, items 1730 to 1741.

### 9.1 Every k, before and after

| Dial (`rules.json output.profiles`) | Was | ×1.6 | Now | Measured all in, levels 1 / 5 / 10 / 20 (% of a Soldier-turn) |
| --- | --- | --- | --- | --- |
| `healing.k` (Healing given) | 0.87 | 1.392 | **1.392** | Soul healer's steady turn 234 / 211 / 195 / 158 (avg 200; was 146 / 132 / 122 / 99) |
| `mend.k` | 0.87 | 1.392 | **1.392** | (items through the `mend` op; same pair) |
| `soul_mend.k` | 0.81 | 1.296 | **1.296** | Inverse steady 157 / 133 / 120 / 158 (was 98 / 83 / 75 / 99) |
| `sigil_mend.k` | 1.2 | 1.92 | **1.17** | MEND · CONDENSE · SEEK 235 / 212 / 196 / 158 (avg 200; was 151 / 136 / 125 / 101); at 1.92: 386 / 348 / 321 / 259 |
| `blessing_mend.k` | 0.956 | 1.53 | **1.44** (capped) | Hymn turn's healing (Warm Hands + Health) 249 / 224 / 208 / 168 (was 166 / 149 / 138 / 111); at 1.53: 265 at level 1 |

1. **The Sigil boon was trimmed back nearly to where it was** because MEND and WARD multiply two Stat terms: their own
   (`sigil_mend`) and Healing given (`healing`). `healing.k`'s ×1.6 already carried the boon to ×1.6.
2. **`blessing_mend.k` was read by nothing** before this revision: a prayer's heal took Blessing power (the `blessing`
   damage profile's Stat). It is now the heal dial: faith.ts `mendDial` multiplies a prayer heal or shield, and Mother
   Ember's intervention, by `blessing_mend.k ÷ blessing.k`. Faith's damage did not move.
3. **The medic's kit** rose ×1.6 through Healing given; its bases (`mending.medic`) did not move.
4. **The floor** (`floor` 0.5 on the five heal and shield profiles; `output.floor_reference` 4 and 4;
   `effects/output.ts statTerm`) binds nowhere with today's slopes: no points is 1 ÷ 1.42 = 70% of a normal share on a
   Stat term. The double punishment the ruling named exists only for a Sigil boon (two Stat terms): a caster with
   nothing in either is at 49.6% of one with 4 and 4 in both; each term is inside its floor.
5. **Leon's case.** A Recruit (the Proving Ground's Sharpshooter, Insight 1, no Soul skill), the Mend design at stage 4,
   through the reducer: **9 → 15** at level 1 (10 → 17, 12 → 19, 17 → 28 at 5, 10, 20). The 6 Leon saw is the same Mend
   at stage 1 (×1.0) before; it is 9 now.
6. **Enemy healers did not move:** an enemy caster has a Healing given of 1 and its own bases; no enemy prays.

### 9.2 The tank, dedicated-healed (`DEFENCE_MEASURE=1 DEFENCE_PARTS=fire DEFENCE_ROWS=^tank DEFENCE_N=10`)

A new pair in `defence-measure.ts` PAIRS, `tankAllin` (the tank and an all-in Soul healer). Rounds before the first Down
(ten at most), the enemy AI's healer weight on, before → after:

| Pair | L1 | L6 | L12 | L20 |
| --- | --- | --- | --- | --- |
| tank + all-in healer, 2 Soldiers | 10 → 10 | 10 → 10 | 10 → 10 | 6.8 → 7.1 |
| tank + all-in healer, 3 Soldiers | 4.8 → 5.3 | 8.8 → 8.0 | 9.1 → 9.1 | 2.9 → 3.6 |
| tank + normal-share healer, 2 Soldiers | 9.9 → 10 | 10 → 10 | 10 → 10 | 10 → 10 |
| tank + normal-share healer, 3 Soldiers | 5.0 → 5.6 | 8.4 → 9.0 | 7.9 → 9.8 | 8.7 → 9.7 |
| tank + idle healer (control), 3 Soldiers | 3.3 | 5.6 | 5.8 | 6.4 |

With a normal-share healer, nobody is Down after ten rounds under three Soldiers in 70 to 80% of fights from level 6
(30 to 40% before). The one who drops first is mostly the healer (the doctrine). Allowed (Leon); not tuned against.
**Seen, not investigated:** the simulator's all-in healer casts 2 to 8 heals a fight under fire against 8 to 10 for a
normal share (its policy runs short); a question for the simulator.

### 9.3 Re-recorded on purpose, and what was touched

Golden tables (`GOLDEN_RECORD=1`), each changed line checked to be a heal, a shield, a boon or a sheet's Healing given
(`python3 tools/golden_diff.py --rev <base>`): `builds-normal` and `builds-allin` (66 each: the sheet line and the
Faith build's Health and Protection), `faith` (58: every Whisper heal and shield, Warm Hands, Saint's Shield,
Absolution, Everyone Home's shield), `outburst` (90: the Buff school's heal at every stage, Love, Shell, the shapes'
boon, the caster line), `sigil` (31: every MEND and WARD Line; the damage parts of MEND · FIRE did not move), `flat`
(12: the stim), `items-traits-classes` (12: Triage, Stim Throw, Rally, Will Shield), `items-shelved` (12: Triage, Stim
Throw, Will Shield, Ward, the Adamantile Knight's brace shield, the banner sweep's heal), `costs-outburst` and
`costs-sigil` (the caster line), `rules-outburst.log` and `rules-sigil.log` (the same heals' log lines). The replay
hashes (`REPLAY_RECORD=1 REPLAY_FULL=1`, after the four oracles passed): 11 of 24 games, every one with a caster or a
healer in it.

- Data: `rules.json` (`output.profiles` healing, mend, sigil_mend, soul_mend, blessing_mend: k and `floor`;
  `output.floor_reference`; `balance.ceilings.healer_turn` 200 and `hymn_heal_cap` 250; `systems.prayer_mend`;
  `derived.multipliers.healing_given`), `attributes.json` (Insight's Healing given line).
- Engine: `effects/output.ts` (`floor` in `statTerm`, `normalShareTerm`), `faith.ts` (`prayerMendDial`: a prayer heal
  or shield and Mother Ember's intervention read the heal dial).
- Tests: `balance-contract.test.ts` (the Sigil healer's turn on the ceiling, the Hymn heal cap, the floor),
  `balance/heal-measure.ts` (the prayer rows read the heal dial) and `.test.ts`, `balance/defence-measure.ts` (the
  `tankAllin` pair) and `.test.ts` (bands ×1.6, read from data), `faith.test.ts`, `faith-presence.test.ts`,
  `miracle-2.1.test.ts`, `rules122-faith.test.ts` (read `prayerMendDial`), `output.test.ts` (the formula's order).
- Docs: the spec (rules 1.27, items 1730 to 1741, superseded notes on 1.20, 1.23, 1.26 and items 1231, 1306, 1707,
  1708), `balance-contract.md`, this section, `PATCH-TALLY.md`. Not touched: versions, the changelog, the web client.
