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
   **Boss HP was not re-run** (section 6).
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
6. **Boss HP (rules 1.23) was not re-run** (b8): the defence measurements (`defence-measure.test.ts` fight rows, about
   10 minutes) were not part of this run. The plain rifle did not move and Boss HP was fitted on it, but the optimised
   and all-in builds now deal less early: Boss fights will run longer for an all-in squad. **Run
   `DEFENCE_MEASURE=1 npx vitest run --root packages/engine test/balance/defence-measure.test.ts --silent=false` next.**
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
- Docs: the spec (rules 1.26, items 1700 to 1724), `balance-contract.md` (new), this hand-off, `PATCH-TALLY.md`, the
  hand-offs README. Tools: `tools/golden_diff.py` (new).
- Not touched: versions, the changelog, `PICKUP.md`, `CLAUDE.md`, the web client.
