## Checked map: the progression curve as built (release/0.34-final, read only, 21 Nov 2026)

I read the files in E:/phc-wt/rel030 and changed nothing. HEAD is `fd6edc391`, "Items 2.0: revert the first fit, weapons back to their designed numbers". `data/weapons.json` changed three times today and another agent is still editing it, so any weapon number here may move.

### Part 1. Ten claims checked against their files

| # | Claim | Verdict | What the file says |
|---|---|---|---|
| 1 | `deal` = 7.5^((L−1)/19), ×7.5 at level 20 (`rules.json:1894`) | RIGHT | The column runs 1.0, 1.1119 … 7.5. The note at `rules.json:1960` says the same. |
| 2 | `scale` reaches ×4.69 at level 20 (`rules.json:1916`) | RIGHT | It ends at 4.6875. **Missed:** there is a third column, `mend` (`rules.json:1938`), which reaches **×11.97** at level 20. See ADDED K. |
| 3 | Gun profile: "+3.75% gun damage per Agility point" (`rules.json:2010`) | WRONG | 1.275 × 0.0294 = +0.0375 on a multiplier that sits near 1.5. Agility 1 gives 1.275 and the pin (Agility 7) gives 1.5, so one point is about **+2.5% of the hit at the pin** (2.9% of the Agility-1 hit). The data note at `rules.json:2018` puts it the same way: Agility 1 ×0.85, 3 ×0.90, 5 ×0.95, 7 ×1.00, 10 ×1.075 of the pin. |
| 4 | Melee profile: "+5.77% per point" (`rules.json:2000`) | WRONG | Same mistake. 1.15385 × 0.05 = +0.0577 on a multiplier that is 1.154 at Attribute 1, 1.5 at 7 and 1.673 at 10. That is about **+3.8% of the hit at the pin**. |
| 5 | Raw Power adds 0 damage on melee weapons. Its text says +5% physical. | RIGHT | `weaponMult` (`character.ts:832-836`) reads the `melee` profile, whose skill slope is 0. `skills.json` raw_power `per_point.numbers.damage` 0.05 is only filled into its text; no engine code reads it as a number. The 0.05 only applies on the `physical` profile (`rules.json:1985`, skill 0.05). **The same goes for Dexterity on guns:** gun profile skill slope 0, so Dexterity buys only the hit. |
| 6 | Athletics: "+1 Defense per point from point 1" (`character.ts:824`) | WRONG | The data says `skills.json` athletics `per_point.numbers.defense_from: 2`, and the code falls back to 2 when the field is missing. **Athletics 1 gives 0 Defense; the first +1 comes at point 2.** The code comment above `athDefense` says "from 1, was from 2" (rules 1.82 item 7011), but the data still says 2. |
| 7 | Grades add no damage (`rules.json:1605-1660`) | RIGHT | `dmg` is 1 on all five grades and `arm` is 1 on all five. Celestial differs from Relic only in price (50 against 25), pips (4 against 3) and `sold: false`. |
| 8 | Boon cap 50, enforced in `power.ts:56-60` | RIGHT (line off) | The cap is at `survival.json:221` (its note is on 220), not 219. `capRoom` and `capProblem` are at `power.ts:47-52`. The worths match: edge 10, second_wind 17, true_aim 7, hardened 13. |
| 9 | Enemy level table (`enemies.json:214`, `data.ts:117-119`) | RIGHT | At level 20: hp_mult 8.4844, armour_mult 7.5, defense_plus 6 (already at level 13), attack_plus 6, damage_mult 8.5312. The function `levelled` is at `data.ts:116-119`. |
| 10 | "Enemy weapons never change. Soldiers always carry the 30-damage rifle." (`survival.json:473-480`) | HALF WRONG | The `pools` have no stage key, so "never change by stage" is right. But each tier draws from a pool. A Soldier's ranged pool is four guns: the Hellraiser service rifle (30), the Legion bullpup (28), the lever carbine (32) and the Magistrate pistol (26). It also has melee and close-range pools. |

**Other claims checked, also right:**
- The XP table.
- HP at level 20: 914 for End 1 / PT 0, and 1659 for End 4 / PT 3.
- Smite: base 20, `blessing` profile, which reads `scale`, through armour (`classes.json:2922-2960`). Your worked number of about 33 at level 3 checks: 0.956 × (1 + 0.36 + 0.18) × 20 × 1.1239.
- The Ledger's factor 0.7 (`classes.json:2350`).
- The encounter budget formula (`encounter.ts:92-96`) and the stage multipliers (`survival.json:55-62`).
- The mod chances 0.05 / 0.1 / 0.35 (`survival.json:149`).
- The Forge and grade prices.
- Drill 200 at a rest, 400 at a training ground.
- Starting boons worth 4 to 6.
- The free camp rifle is the cheapest `issue` rifle: the lever carbine (32 damage, 700) against the Hellraiser service rifle (30, 900).

**Your "not verified" items, now checked:**
- **Sigil, Soul and Elemental damage take nothing from Attributes or Skills.** `statTerm` (`output.ts:87-92`) computes k × (1 + attr × (A−1) + skill × S). The `sigil`, `soul` and `elemental` profiles have attr 0 and skill 0, so their Stat term is a constant: 1.7, 1.55 and 1. Intelligence, Brain Power, Expression, Visualization, Determination and Will Power add 0 to those damages. The comments at `character.ts:876-880` still describe the old 0.1 / 0.05 slopes and are out of date.
- **The blessing pair is Virtue and Faith.** `rules.json` `output.pairs.blessing`; healing reads Insight and Empathy.

**One correction to the shop line (§7):**
- The stage-1 shop's 5% Masterwork never arrives as Masterwork. Every shop roll is capped by the stage's grade ceiling `rewards.ceiling` = ["fine", "masterwork", "relic"] for stages 1 / 2 / 3+ (the shop's own text, `survival.json:582`). So in stage 1 it comes out as Fine.
- The rare piece rolls Fine 60 / Masterwork 40, at 1.5 times the band, under the same cap.
- I read this cap in the data text only, not in the code.

### Part 2. What the map missed: the ceilings themselves

The map never names the block that holds the ceilings. These are the items Leon is asking to delete.

- **A. ADDED. `rules.json:1661-1885` `balance`: the balance contract.**
  - Unit (`rules.json:1664`): "percent of what the normal-share plain rifle deals in one 6-AP turn".
  - `ratio_allin_to_normal: 1.25`: an all-in build is defined as 1.25 times a normal share. This caps the reward for specialising.
  - `tolerance`: a system's mean must sit within 12% of its ceiling, and no single level more than 25% off.
  - Enforced by `packages/engine/test/balance-contract.test.ts`; the reasoning is in `docs/design/balance-contract.md` §3 (it also lists the measured values).
  - `ceilings` (`rules.json:1677`), in % of a rifle-turn:

| Row | Ceiling (all in) | Door / normal share | The number tuned to hold it |
|---|---|---|---|
| plain | 125 | normal 100 | `profiles.weapon.k` |
| gun | 145, measured at Masterwork | | each weapon's damage in `weapons.json` |
| melee | 165 | | `factors.melee` |
| sigil_line | 150 to 200 | | `line_mult` |
| outburst_steady | 135 | | `damage.base` |
| outburst_peak | 90 (level_lo 0.62, level_hi 1.25) | | `damage.base`, then `stage_mult` |
| chaplain_turn | 125 | | Smite base |
| whisper_turn | 80 (level_hi 1.42) | | the Whispers' values; `blessing.k` |
| hymn_turn | 150 (level_lo 0.55) | | the Hymns' values; `blessing.k` |
| healer_turn | 45% of reference HP | hymn_heal_cap 65, Whisper 15 | the Buff heal |
| tending_turn | 65 | door 59 | `profiles.tend.k` |
| shadow | 125 | door 109 / 87 | `shadow.per_point` |
| figments | 150 | door 130 / 104, class at a normal share 120 | `factors.figment`, then figment HP |
| mender_offence | 70, with `played_floor` 52.5 | | `bond.per_bond` |
| mender_window | 100 | | the Ledger's factor |
| shield | 1.2 × the heal of the same cost | | |
| shield_order | Faith 1.0 at 70% of reference HP; Tending 0.36; WARD Line and Inverse 0.33 | | |

  - Two rows are only a line of text: `weapon_art` ("not built: may break the ceiling … steady + 10%") and `miracle` ("exempt").

- **B. ADDED. `rules.json` `balance.yardsticks` (from about line 1810): the yardsticks every measure is taken against.**
  - `rifle`: the reference rifle read at Agility 7 ("pin 7"), whatever the build's real Agility.
  - `soldier_turn`: 18.5 at level 1 … 282.2 at level 20.
  - `control`: a denied turn = 1.0; one AP = 0.167; an Elite ×1.4; a Boss ×3 and never a whole turn.
  - `area`: each extra target is worth 0.5; the cluster caught is 2.4 / 2.8 / 2.95 at radius 1 / 2 / 3, and 2.0 for a chain.
  - `over_time`: counted in full for 2 rounds, then ×0.75.
  - `cost` allowances: none −0.15, session supply +0.05 (+0.10 with credits), set-up +0.1, rooted +0.05, exposure +0.15.
  - **`tiers`: plain 1.25 / steady 1.45 / peak 1.65 / ultimate 2.5**, and the rule at `rules.json:1867`: *"allowed = (AP / 6) x tier x (1 + cost allowances) x the area worth"*. This rule prices any single use (perk, technique, grenade); `balance-contract.test.ts:159` applies it to the thrown frag.
  - `full_assault`: 55 / 85 / 158 / 708 HP at levels 1 / 5 / 10 / 20.
  - `heal_floor`: 18 / 27 / 44 / 178 HP; the level-1 Recruit's quick heal is 25.

- **C. ADDED. The reward for Attribute points is itself capped** (`rules.json:1698`, gun ceiling note, ruling R3). Guns are measured "at the pin" (Agility 7). An all-in gunner above Agility 7 may deal more, but only "at most the gun profile's rise from the pin" (×1.075 at Agility 10). The same pin rule is applied to `chaplain_turn`, `whisper_turn` and `mender_offence` (`at_pin: true`).

- **D. ADDED. `rules.json:2156-2162` `output.factors`: multipliers whose only job is to hold a ceiling.**
  - `melee 1.35`: "melee's all-in ceiling is 165% of the plain rifle".
  - `thrown 0.7`.
  - `figment 0.9`: an attack through a Figment "deals at most this share of what the same AP of the plain rifle does".

- **E. ADDED. The stacking cap** (`output.ts:125-133`; also stated in `rules.json` `output.formula`). Bonuses against a target (True Name, Case Closed, Holy Ordnance, Weak Point and the rest) are added together and held between −90% and +100% (`VS_CAP = 1.0`). The map lists case_closed as "×1.2"; it is one of these capped bonuses.

- **F. ADDED. The enemy table was fitted to the yardstick, and this is why levels cancel (your §10).**
  - `enemies.json:191`: the level table was fitted "so a Soldier takes 3.5 of the plain rifleman's hits at level 1 and just under 4 from level 12".
  - The rifle yardstick's note says the enemy table "(rules 1.15: a Soldier is 4 of its hits) is fitted to it".
  - So the flat 3 to 4 hits to kill is a fitted target, not an accident.

- **G. ADDED. Level-gap rules** (`enemies.json` `levels.gap`, around 200-212):
  - An enemy 5 or more levels below the character who hits it dies to any hit that deals damage (`one_hit_levels_below: 5`).
  - ±1 to hit per level of difference, up to 5 (`to_hit_per_level`, `max_levels`).
  - `full_hp_guard`: an Elite or Boss at or above the attacker's level is left on 1 HP by any single action from full HP (the map had this one).
  - `narrator_shift`: the Narrator may shift a fight's level from −3 to +2.

- **H. ADDED. Grade ceiling by stage** (`survival.json:147`): `rewards.ceiling` = ["fine", "masterwork", "relic"] for stages 1 / 2 / 3+. It caps every reward and shop roll. `tools/validate.py:2964-2965` checks it, and Celestial can never be a ceiling.

- **I. ADDED. Fight budget bands** (`survival.json:66-69`): `bulk_band 0.15` and `pressure_band 0.1` (the tolerance around the bulk target and the pressure cap) and `max_foes` [4, 6, 8, 10] for parties of 1 to 4. The spawn rows also carry per-tier `max` counts (`survival.json:498-536`).

- **J. ADDED. A number held equal by the validator:** `tools/validate.py:600-603` fails the data if Smite's base is not exactly Rebuke's 20. The contract's own dial note (`rules.json:1734`) says Smite drops to 15 only if the measured all-in mean passes 140.

- **K. ADDED. Heals pinned to a constant percent of HP** (`rules.json:1938-1985`). The `mend` column (×11.97 at level 20) exists so that "an all-in heal turn is the same percent of the reference character's HP at every level". `reference_hp` runs 145 at level 1 to 2,086 at 20. The `mend` profile has floor 0.5 and min_pct 0.2. A `floor_reference` of 4 and 4 means a heal never drops under half of what a normal-share healer gives.

- **L. ADDED. The golden tables freeze damage numbers.**
  - `packages/engine/test/golden/` and the `golden-damage-*.test.ts` files (builds all in and normal, magic, perks, techniques, traits and classes) hold exact damage tables that are only re-recorded on purpose.
  - The `amount-literals` lint (`docs/design/balance-contract.md` §4) fails on any number typed into code.
  - Any redesign has to re-record these.

- **M. ADDED. The contract's own cost table and condition prices** (`docs/design/balance-contract.md` §5 and the conditions table at lines 123-134). Every condition is priced as a share of a turn: Stunned 1.0, Dazed 0.33, Weakened 0.25, Blinded about 0.35, and so on.

- **N. ADDED, different meaning.** `classes.json:338/353` has a `ceiling` mark on a third rank-III move ("Stand Behind Me"), checked at `tools/validate.py:269-270`. It is a slot rule (a move beside the rank's two), not a damage ceiling. I list it so the word is not confused.

### The progression curve, with corrections applied

The map's §0 to §10 stand as written, except for these changes:
- **§0:** a third level column, `mend` (×11.97 at level 20).
- **§0 and §2:** one Attribute point is about **+2.5% gun / +3.8% melee** of the hit at the pin, not +3.75% / +5.77%.
- **§2:** Intelligence, Expression and Determination add **0** to Sigil, Elemental and Soul damage. Their only combat returns are words, AP per glyph and MP. Virtue's damage return goes through Smite and prayer (the blessing pair is Virtue and Faith, slope 0.06).
- **§3:** Athletics gives Defense **from point 2**. Dexterity, like Raw Power, adds 0 to damage.
- **§4:** case_closed is an additive bonus against the target, under the +100% cap (E).
- **§6:** the stage-1 shop never sells Masterwork; every roll is capped to Fine (H).
- **§8:** a Soldier carries one of four ranged guns (26 to 32 damage), or a melee or close-range weapon.
- **§10, "cancelled exactly":** this is designed, not an accident. The enemy table was fitted to a fixed reference rifle at "a Soldier is about 4 of its hits" (F). On top of that, every system's output is held to a fixed share of that reference by the contract (A to E, K) and frozen by the golden tables (L).

### Not verified

- Whether the shop's ceiling cap (H) is applied in code; I read it in the data text only.
- What the Sigil "Stat" line's "plus the Elemental bonus" adds in practice (both its terms are constant profiles, but I did not trace the code).
- Whether `weapons.json` damage values will still be what this map shows once the other agent's edit lands.
- The map's §9 hit-probability and shots-expected table and its §8 typical-levels table. These are the other reader's hand calculations and I did not redo them.
- Whether `damage_mod` +3 (the weighted mod) goes into the formula's flat term.
- Any outcome measured on 0.34 for stages 2 to 5; the stage-1-only claim about `0.34-MEASURES.md` was not opened.
