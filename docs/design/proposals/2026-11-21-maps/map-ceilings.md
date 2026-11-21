# Inventory of ceilings (READ ONLY, branch release/0.34-final, HEAD 7fea0868b). Facts only; nothing proposed.

Paths are relative to E:/phc-wt/rel030. Gate = `python tools/check.py` ("npm run check"), whose engine job is `vitest run` over ALL of packages/engine/test, including test/balance/*.test.ts. Only the BALANCE_QUICK smoke fights and env-gated parts (X_MEASURE=1 etc.) are left out. `npm run balance` adds the quick smokes (opt-in).

Not verified: I did not run any test, so "fails when" is read from the assertion code. Spec hits number about 370 for the pattern; I list the load-bearing ones, not every table cell.

## PART A. Balance targets (delete candidates)

### A1. DATA

| # | file:line | What it pins |
|---|---|---|
| D1 | data/rules.json:1661-1665 `balance` | The "balance contract": `unit` = percent of the normal-share plain rifle's 6-AP turn; `ratio_allin_to_normal` 1.25 (a normal share is the ceiling divided by 1.25); `levels` [1,5,10,20] (1666) |
| D2 | rules.json:1672-1676 `balance.tolerance` | mean 0.12, level 0.25: the pass/fail band around every ceiling below |
| D3 | rules.json:1677 `balance.ceilings` (the whole block, 1677-1810) | One ceiling and one "dial" per system. Rows below |
| D3a | :1693-1700 `gun` | allin 145 (best gun, Masterwork), `at_pin` true. Note says a gunner above Agility 7 "deals more on purpose" but is held under the band times the gun-profile rise |
| D3b | :1686-1690 `plain` | allin 125 (plain rifle all in; normal share = 100 by definition) |
| D3c | :1701-1705 `melee` | allin 165; dial `output.factors.melee` |
| D3d | :1706-1713 `sigil_line` | allin [150, 200]; dial `sigils.json grammar.line_mult` |
| D3e | :1714-1718 `outburst_steady` | allin 135; dial `soul_modules.json damage.base` |
| D3f | :1719-1727 `outburst_peak` | allin 90 (was 165), `level_lo` 0.62, `level_hi` 1.25; the notes record "set to what is measured" and "one base dial cannot put both the steady turn and the peak on their lines" |
| D3g | :1728-1735 `chaplain_turn` | allin 125, `at_pin`; "the god in the gun never out-hits a gunner" |
| D3h | :1736-1744 `whisper_turn` | allin 80, `level_hi` 1.42, `at_pin` |
| D3i | :1745-1751 `hymn_turn` | allin 150, `level_lo` 0.55 |
| D3j | :1752-1760 `healer_turn` | allin 45 (% of reference HP); `hymn_heal_cap` 65, `hymn_avg` 45, `whisper` 15 |
| D3k | :1761-1764 `shield` | `of_heal` 1.2 (a shield is worth 1.2 heals) |
| D3l | :1765-1767 `weapon_art` | "not built: may break the ceiling as a charged ultimate" (a reserved exception to the line) |
| D3m | :1771-1777 `shadow` | allin 125, `door_allin` 109, `door_normal` 87 |
| D3n | :1778-1786 `tending_turn` | allin 65, `door_allin` 59 (heal %) |
| D3o | :1787-1796 `mender_offence` | allin 70, `played_floor` 52.5 (derived: 70 x 0.75), `at_pin` |
| D3p | :1797-1799 `mender_window` | allin 100 ("never above a rifle-turn on average") |
| D3q | :1672-1684 `figments` | allin 150, `door_allin` 130, `door_normal` 104, `class_normal` 120 |
| D3r | :1800-1809 `shield_order` | faith 1.0, tending_shield 0.36, sigil_ward_line 0.33, outburst_inverse 0.33, `top_pct` 70: an ordering of shields as shares of Faith's |
| D3s | :1766-1768 `miracle` | "exempt" |
| D4 | rules.json:1811-1823 `yardsticks.rifle` | The 100% yardstick: build `plain_gun`, normal share, profile `gun`, `pin` 7 (Attribute 7 read as the gun profile's flat 1.5) |
| D5 | rules.json:1824-1831 `yardsticks.soldier_turn` | Soldier-turn in HP by level (1: 18.5 ... 20: 282.2): "one Soldier-turn kept off the squad counts as one plain rifle's turn" |
| D6 | rules.json:1832-1840 `yardsticks.control` | Denied turn = 1.0 rifle-turn; ap 0.167; elite 1.4; boss 3.0 |
| D7 | rules.json:1837-1846 `yardsticks.area` | `extra_target_share` 0.5; cluster r1 2.4, r2 2.8, r3 2.95, chain 2.0 (an area is worth its single-target plus half per extra target) |
| D8 | rules.json:1847-1851 `yardsticks.over_time` | Damage over time counts in full 2 rounds, x0.75 beyond |
| D9 | rules.json:1852-1861 `yardsticks.cost` | Allowances on a ceiling: none -0.15, setup_turn 0.1, rooted 0.05, exposure 0.15 and others ("allowances on a ceiling for what the range leaves out") |
| D10 | rules.json:1862-1868 `yardsticks.tiers` | plain 1.25, steady 1.45, peak 1.65, ultimate 2.5: "allowed = (AP / 6) x tier x (1 + cost allowances) x the area worth" (the price-a-move budget rule) |
| D11 | rules.json:1869-1878 `yardsticks.full_assault` and `heal_floor` (~1879-1890) | Heal and shield floors and ceilings in HP, by level, against the "fire doctrine" |
| D12 | rules.json:2155-2163 `output.factors` | `melee` 1.35 ("melee's all-in ceiling is 165% of the plain rifle, the gun's 145% plus the price of standing in reach"), `thrown` 0.7, `figment` 0.9 ("deals at most this share of what the same AP of the plain rifle does"). These multipliers exist to hit D3 |
| D13 | rules.json:1960-1962 `output.level.deal` | Level curve 7.5^((L-1)/19): "a plain rifle hit is 40 at level 1 and about 300 at level 20" (the rifle is the scale of the level curve itself) |
| D14 | rules.json:1579-1591 `heal` (gate and `cap_pct`) | 20% gate for a heal, cap 50% of the target's HP per heal. Mixed: partly a rule the player sees (50%), partly a balance floor (gate) |
| D15 | data/survival.json:220-222 `boon_cap` | `cap` 50 = "run power a character may carry, in percent of a rifle-turn". Every boon, relic property, graft and shrine token carries a `worth` against it |
| D16 | data/survival.json `worth` fields (53 of them; e.g. :286, :322 `start_boon.max_worth` 6, :438 `shrine.token_max_worth` 8) | The `worth` numbers exist only to be summed against D15 or the caps beside it |
| D17 | data/variants.json:8 `worth_cap` 20 and each form's `worth_per` (:14-30) | A variant's modifiers may total at most 20 "percent of a rifle-turn"; a variant's price is the base times (1 + worth/100) |
| D18 | data/survival.json:63-69 `rounds`, `bulk_per_char_round` 0.25, `pressure_per_char` [1.3,0.9,0.9,0.9], `bulk_band` 0.15, `pressure_band` 0.1, `max_foes` | The fight's budget: bulk in rifle-turns, pressure caps danger, +-15% / +-10% bands |
| D19 | data/survival.json:70-76 `tiers` | Each tier's bulk (rifle-turns to remove it over a Soldier's) and pressure (Soldier-turns it deals a round) |
| D20 | data/survival.json:77 `lag_factor` 0.83 and :80-85 `share` (boss/elite hp and damage by party size) | Foe scaling by party size and level lag, fitted to the budget |
| D21 | data/enemies.json:191 `levels.note` | The enemy table is "fitted ... a Soldier takes 3.5 of the plain rifleman's hits at level 1 and just under 4 from level 12" |
| D22 | data/survival.json:147 `rewards.ceiling` ["fine","masterwork","relic"] | A grade ceiling by stage (a progression gate, not a % line; listed for the word) |
| D23 | data/survival.json:50-60 `bulk_per_char_round`/`xp` and `price_band` :148, `rare_band` :595 | Reward and price bands by depth |
| D24 | data/techniques.json:285 `max_pct` 50 (with `per_tile_pct` 10, `min_run` 3) | A melee opener's bonus capped at +50% (a per-technique cap, not a system line) |
| D25 | data/classes.json:353 `"ceiling": true` (rank III move) | NOT a balance ceiling: marks a third rank-III move. Name clash only |
| D26 | data/rules.json:1446 `sigil damage` text and sigils.json `grammar.line_mult` (1.7 / 1.75 / 1.8 by glyph count) | Rules 1.17: the Line multiplier, set to put a Line on D3d |
| D27 | data/soul_modules.json `damage.base` (37 per rules.json:1724, 40 earlier) and `cycle.stage_mult` | Dials of D3e/D3f; the base is "fitted" and cannot hold steady and peak lines at once |
| D28 | data/enemies.json:199-206 `levels.gap` (`one_hit_levels_below` 5, `full_hp_guard`) | The Elite and Boss full-HP guard as data. See B-list (it is a player-visible rule) |

### A2. TESTS AND TOOLS

All listed are under packages/engine/test unless noted.

| # | file:line | Fails when | Gate? |
|---|---|---|---|
| T1 | balance-contract.test.ts:45-78 "played: each system all in sits on its ceiling" | Any system in `SYS` (plain, gun, melee, sigil_line, outburst_steady, outburst_peak, whisper, hymn, healer, chaplain; line 33) has an all-in mean over levels 1/5/10/20 outside ceiling +-12%, or a level outside +-25% (or `level_lo`/`level_hi`); `at_pin` rows additionally held under band x gun-profile rise. Its comment (:52-53) says the old gun expectation was 145% +-12%, 109 to 181% a level. 600 s timeout | Gate (`npm test`) |
| T2 | balance-contract.test.ts:98-101 "a normal share at level 1 is not over any ceiling" | gun, blade, ob, hymn or heal normal share exceeds band top x 1.25 at level 1 | Gate |
| T3 | balance-contract.test.ts:103-112 | Sigil healer's all-in mean outside `healer_turn.allin` +-12% (45), each level +-25%; a Hymn turn's healing above `hymn_heal_cap` 65 | Gate |
| T4 | balance-contract.test.ts:114-120 | A heal by a caster with no skill points falls below the profile `floor` of a normal share | Gate |
| T5 | balance-contract.test.ts:123-143 | Mender healing turn off 65 +-12%/25%; door Tending off 59; Mender offence off 70 +-12%/25%; as played over band x rise or under `played_floor` 52.5 | Gate |
| T6 | balance-contract.test.ts:145-157 and 159-165 | An area's per-target multiplier x expected targets exceeds `worth(n)` x 1.12; chain jump; a thrown frag exceeds the budget rule for 2 AP of the plain tier | Gate |
| T7 | balance-contract.test.ts:81-96 | Reports only (perk steps, beta feeds "go above the line"); asserts only 0 errors | Gate (no line asserted) |
| T8 | balance/guns-measure.test.ts:46-52 | Burst per AP outside 1.05 to 1.25 x the Shot; Mag Dump above 1.35 x; also `:55-59` the long rifle outside 0.85 to 1.13 of the service rifle per AP, and the other rifles above 1.2 x | Gate |
| T9 | balance/guns-measure.test.ts:61-66 | An optimised rifle at level 6 is outside 105% to 172% of the plain rifle (comment: "between the plain rifle and 150%") | Gate |
| T10 | rules118-guns.test.ts:111-113 | An automatic sidearm out-hits the service pistol with a plain shot; any rifle at 2 AP a shot has `damage` above 33 | Gate |
| T11 | rules118-guns.test.ts:103-110 ("the guns that were over the ceiling") | The weapon numbers set in rules 1.18 to fit the 145% ceiling change | Gate |
| T12 | balance/magic-measure.test.ts:25-31 | A 4-glyph Line at level 6 outside 135-215% of the rifle; a 2-glyph Line outside 70-125%; 2-glyph not below the 4-glyph | Gate |
| T13 | balance/magic-measure.test.ts:38-49 | Outburst steady outside 80-135%, fresh caster 75-130%, biggest Release 95-170% of the rifle | Gate |
| T14 | balance/magic-measure.test.ts:33-36 | An Elite or Boss of the caster's level taken out by one Evoke (rule B-list) | Gate |
| T15 | balance/faith-measure.test.ts:41-58 | A Hymn turn outside 125-200% of the rifle, a quiet turn outside 45-130%, Hymn frequency outside 0.3-0.55; two targets 145-215%; :61-66 a no-Hymn patron outside 40-125%; :67-71 a dabbler gains over 1.15 x | Gate |
| T16 | balance/heal-measure.test.ts:39-41 | Soldier-turn not 12% to 14.5% of rifleman HP; :43-91 Outburst/Sigil/prayer heal rows outside fixed percent bands of a Soldier-turn (65-130, 85-170, 60-115, 170-280, 28-45, 75-100, 120-180); :86-91 all in above 240% or one heal above half the rifleman's HP | Gate |
| T17 | balance/defence-measure.test.ts:81-98 | The idle pair's first Down is not within 1.5 to 4.2 rounds (the "defence guard of 4.2"); healer first-down below 75% | Gate |
| T18 | balance/defence-measure.test.ts:61-65 | Boss HP below 20 of the yardstick's hits at any level | Gate |
| T19 | balance/defence-measure.test.ts:40-56 | The medic's kit bands (20-40%, 25-50%, 12-35%) | `describe.skip`, off ("superseded by rules 1.36") |
| T20 | balance/step1-fit.test.ts:14-31 | Enemy table: Vermin 1 hit, Minion 2, Soldier 4 (exact >= 3.5), Elite > 6 and <= 8, Boss >= 20 of the yardstick's hits at each reference level; the chance to hit a Soldier exactly 65 | Gate (`TABLE ? skip`) |
| T21 | balance/survival-run.test.ts:20-52 | Over 40 seeds, a solo plain gunner clears stage 1 in fewer than floor(40 x 0.55) = 22 runs, or more than 10 runs clear stage 4; every stage-1 clear must reach level 3 | Gate. Comment records "OLD bar 37%, NEW bar 55%": the bar is re-set to whatever was measured |
| T22 | survival-encounter.test.ts:60-71, 85-100 | A generated fight's spent bulk is outside the target +-15% or pressure above the cap +10%, over seeds x party sizes x levels x nodes | Gate |
| T23 | survival-map.test.ts:127-138 | The map generator's mean counts outside tolerance, and the typical-route share under `typical_share` | Gate |
| T24 | sigil-balance.test.ts:26-38 | `SIGIL_CAP` != 350 or `SIGIL_CAP_CRIT` != 500; a built caster's single-target spell before the Line multiplier >= 350 x 1.3 | Gate. The 350/500 are Leon's 8 Nov "targets" (balance-targets.md); rules 1.17 removed them as a hard cap but the constants and this test remain (src/sigil.ts:329) |
| T25 | rules117-magic.test.ts:73 | A spell is scaled down to 350 ("no ceiling") | Gate |
| T26 | figments.test.ts:28 and heal-pct.test.ts:64-66 | `figments.allin` <= `door_allin`; `shield_order` out of order or `faith` != 1 | Gate |
| T27 | heal-pct.test.ts:42-51 | A heal above 50% of target HP; recruit's quick heal != 25 | Gate |
| T28 | rules119-outburst.test.ts:71 | A strong feeling's step below 2.5 x the plain step (shape of the Outburst table) | Gate |
| T29 | variants.test.ts and mods-data.test.ts | Variant worth arithmetic (`variant_worth`); the validator (tools/validate.py:3472-3552) fails a variant over `worth_cap` | Gate (validator is in `check`) |
| T30 | tools/validate.py:3002-3012, 3095-3118 | `boon_cap.cap`, every `worth`, `start_boon.max_worth` must be numbers within bounds ("percent of a rifle-turn") | Gate (validator) |
| T31 | golden-damage*.test.ts, golden-costs*.test.ts, golden-itemops.test.ts, golden-mods.test.ts, golden-rules.test.ts, test/golden/*.json (85 files) | ANY damage or cost number moves ("re-recorded only on purpose", CLAUDE.md). Not a percent line, but freezes the fitted numbers; the fit's output is locked into 85 files | Gate |
| T32 | many rules1xx-*.test.ts (rules117, 118, 119, 120, 121, 122, 123, 124, 125) | Pin the spec's per-revision numbers (damage bases, cooldowns, gates) read from the fit | Gate (not all are line tests; flagged as number-freezers) |
| T33 | tools/check_spec_tables.py | The spec's weapon, enemy and condition tables differ from data (spec wins) | Gate (`check`) |
| T34 | balance/refit-measure.ts (+ .test.ts) | Engine of the contract: `measure()` yields % of the plain rifle (`yardOf`) at levels 1/5/10/20, N=6 fights a cell | Library for T1; its own test is env-gated (`REFIT_MEASURE=1`) |
| T35 | balance/guns-measure.ts `rifleYard`, sim.ts:53-72 `YARD`, builds.ts `plain_gun`, `opt_gun`, `opt_blade` | The yardstick and the "optimised build" the lines are measured with | Library |
| T36 | balance/items2-measure.test.ts (0.34) | Reports every weapon row as % of the plain rifle (L1, L10 normal, L10 all in, + mods); asserts none | Opt-in `ITEMS2=1` |
| T37 | balance/melee-measure.test.ts, dex-melee-measure.test.ts, outburst-measure.test.ts, mp-measure.test.ts, tending-measure.test.ts, shadow-measure.test.ts (the guard at :77-86 is a rule), figments-measure.test.ts, forks-measure.test.ts, niche-measure.test.ts, calls-measure.test.ts, measures-032.test.ts, party-fit.test.ts, opening-volley.test.ts, tank-measure.test.ts, syphon-measure.test.ts, tend-mp-measure.test.ts, monk-measure.test.ts, ath-measure.test.ts, price-list.test.ts | Print tables against the lines (percent of the rifle; clears of 40) | Opt-in env gates (`*_MEASURE=1` etc.); each keeps only a cheap sanity test in the gate. price-list asserts structure only |
| T38 | balance/survival-run.test.ts :63-89, survival-run.ts, survival-run-report.ts, survival-run-levels.test.ts | Simulated-run reports; levels by route (asserts 6 expectations at :1-73) | Part gate, part env-gated |
| T39 | balance/engine-speed.bench.test.ts | Speed only | Opt-in `ENGINE_BENCH=1` |
| T40 | docs/handoffs "within 3 clears": 0.33-LANE-BALANCE.md:33, 0.33-LANE-ENGINE.md:13, spec item 7503 (PHC-Core-Rules-v1.0.md:13981) | A practice, not a test: nine doors "within 3 clears of 40" of their numbers, solo and four | Measured by `party-fit.test.ts` (opt-in); no assertion found |
| T41 | tools/check.py:12-14 | States the engine run "runs ... every balance target (guns, magic, heals, Faith, defence, the enemy table, the price list)" | Doc of the gate |
| T42 | tools/text_numbers.json:3 `ceiling` 1023; lint-item-ops.baseline.json | Code-hygiene baselines "only shrink" (CLAUDE.md "No rebuild" rule 6). Name clash, not balance; listed so it is not confused | Gate |

apps/web: no test or tool asserts a ceiling or percent line (grep found only unrelated hits in settings, narrator and assets files). Not verified beyond that grep.

### A3. SPEC AND DOCS (rules stated as ceilings or lines)

| # | file:line | Statement |
|---|---|---|
| S1 | docs/rules/PHC-Core-Rules-v1.0.md:3216-3218 (rules 1.17) | "Sigil is the biggest single hit in the game. A full Line ... lands at 150% to 200% of what the plain rifle deals"; Outburst "about 125% ... about 150% with the biggest Pump" (later 135 / 165) |
| S2 | spec:3231 | "No ceiling" on Sigil damage, "the targets the maths is balanced around (Leon's ruling 3 ...) and the full Line is the Mage's peak move" |
| S3 | spec:3190 (rules 1.15/1.17 item 4) | The Elite and Boss guard (a rule: see B-list) |
| S4 | spec:3306-3316 (rules 1.18 "the guns' ceiling") | Yardstick is the plain rifle; "Guns end below a full Sigil Line (150 to 200%) and level with the biggest Outburst (150%)", then 3316 amended to 135/165 |
| S5 | spec:3362-3373 | "No rifle that fires a Shot for 2 AP deals more than 33" (the CCEC marksman at 33). Also item 1074 (:9890) "Set so each rifle's best rotation lands inside the ceiling" and item 8101 (:14676) "Rules 1.18's guard stands for the new rows" |
| S6 | spec:3377 | "Masterwork (+2 to hit, +10% damage): it is the largest single piece of the ceiling" (later removed from damage by rules 1.26) |
| S7 | spec:3390-3394, 3529-3530 | Tables of "best gun 145%", "biggest Release 165%" |
| S8 | spec:3409 | Damage base 40 chosen because "with the best gun at about 145% every turn the Outburst felt weak, so steady play goes to about 135% and the biggest Release to about 165%" (item 1222) |
| S9 | spec:3721, 3782, 3850, 3880 | Faith: Outburst "135% steady, 165% at its peak"; a Hymn turn "about 125%"; "The average is not a target any more" |
| S10 | spec:4183-4219 (rules 1.26) | "Every ceiling is what an all-in build reaches"; table plain 125, gun 145, melee 165, Outburst 135/165; "One constant per system, no ladder ... within +-12% ... no level is more than 25% off" (item 1712). Also 4234 control, 4245-4258 healer 2.0 Soldier-turn ceiling (superseded by 1.36) |
| S11 | spec:4560, 4658-4659, 4791, 4899 | Class lines: Chaplain 125; Shadow 125 / 109 / 87; Tending 200 then 65; Figments 150 / 130 / 104 |
| S12 | spec:5120-5122 | "The balance contract's guard now holds the Mender's healing turn, the door's Tending turn and the Mender's offence" |
| S13 | spec:6192-6194 (item 17) | "The mod ceiling (rules 1.18), measured, not changed": mods pass the 145% ceiling |
| S14 | spec:6639 (Leon, 15 Nov) | "weapon can be under or over the line, depends on their price and niche ..." |
| S15 | spec:6665 (item 2) | "Perk steps sit on top of a class's damage line (Leon). No class or perk is trimmed to fit under a ceiling. The balance contract ... holds the line, so it measures its builds with no perk steps" |
| S16 | spec:6696 (item 29) | Outburst peak band set to 212, "not 206", because one dial cannot hold both lines |
| S17 | spec:7270-7272 (R1-R3) | The yardstick is pinned at Attribute 7; the gun ceiling and the solo-gunner bar re-set after G1 |
| S18 | spec:11655 (item 4723), :13468 | Solo-gunner guard bar "5 of 8 seeds ... measured"; the idle pair "4.2 rounds at most, measured 5" |
| S19 | spec:13981 (item 7503) | "every door within 3 clears of its number" |
| S20 | docs/design/balance-contract.md:1-166 | The whole contract document: ceilings table (:55-72), "A ceiling is what an ALL-IN build reaches" (:10), +-12%/25% (:53), peak order 150-200 / 165 / 165 / 145 / 135 / 125 (:79-80), "Fit with the dial only" (:153), "add it to the guard" (:156), "What the contract does not hold yet" (:161-164) |
| S21 | docs/design/balance-targets.md:1-30 (Leon, 8 Nov) | "About 350 damage ... About 500 on a mega critical. Nothing in the game should exceed these"; plain 100%, Sigil ~150%, Outburst ~125%, optimised physical ~150% / ~110% |
| S22 | docs/design/heal-shield-percent-spec.md (29 hits), level-scale-spec.md (11), shadow-spec.md (13), figments-spec.md (11), chaplain-spec.md (16), bonds-spec.md (10), survival-spec.md (25), class-roster-rev4-proposal.md (20), rev4-primitives.md (10), reactions-spec.md:128 ("about 33% of a rifle-turn") | Per-system lines and percent targets. survival-spec.md:860-870 "the gunner clears it in 9 of 12; each caster at least 7 of 12", "within +-1 of 9 of 12" |
| S23 | docs/TESTING.md:175-181 | The balance contract described as inside `npm run check`, "each system all in ... against its ceiling in data/rules.json balance" |
| S24 | docs/ENGINE-GUIDE.md:106, :155, :205-207 | New system procedure: "one dial in data named in `balance.ceilings.<system>.dial` ... fit with the dial only; add its ceiling to `rules.json balance` and its row to `SYS`"; table row "Balance contract ... Fit the named dial in data; never add a literal" |
| S25 | docs/ROADMAP.md:92, 208, 215, 219, 340-341, 378, 389, 391 | 215 "The rifle contract holds 4 guns plus greatsword and sabre"; 340 "Sabre and katana are over 165% all-in at level 10"; 341 "Guns reach 162-195% against the 145% line; Leon ruled 19 Nov that ceilings are a relative measure ..., not a hard line"; 378 "Guns reach 195% with both perks: refit the perks, or accept it under your 'ceilings are relative' ruling?"; 391 "guns 19 of 74 over 145% all in, melee 42 of 51 over 125% ... re-draw the lines when Weapon Arts are designed" |
| S26 | CLAUDE.md "Balance before content" bullet and the Combat, Mana and Classes paragraphs | "so that everything added afterwards has a ceiling to balance to"; rules 1.17/1.19 percent figures (145% / 135% / 165%) repeated in the Mana paragraph |
| S27 | docs/design/handoffs/0.34-WEAPON-MEASURES.md | Measures every holdable weapon vs the plain rifle with the project's "own ceiling tools" |
| S28 | docs/design/decisions.md:320 | Sigil damage balance: the 350 / 500 ceiling per creature per spell (items 587-590); and :475-493 "Two fits hold the contract (item 4644): the long rifle 48 to 47..." |
| S29 | docs/design/proposals/2026-11-balance-pass.md, 2026-11-balance-2.0.md, 2026-11-unified-damage.md, 2026-11-party-fit.md, handoffs/damage-step-guns.md, damage-step-magic.md, balance-refit.md, defence-step.md, heal-shield-pass.md, faith-fit.md, 0.32-FIT.md, 0.33-LANE-BALANCE.md | The working papers behind each line. Not read line by line (not verified); they are the origin of D3 and T1-T20 |

### A4. Code that reads a ceiling as a constant

| # | file:line | What |
|---|---|---|
| C1 | packages/engine/src/sigil.ts:329 `SIGIL_CAP = 350, SIGIL_CAP_CRIT = 500` (exported through magic.ts:646) | Kept constants of the 8 Nov targets; `capParts` returns parts unchanged since rules 1.17 (:370). Used only by T24 and old callers |
| C2 | src/run/power.ts:24-49, give.ts:77-78, game.ts:3487, run/loadout.ts, run/progress.ts, run/rewards.ts, run/stage.ts | `BOON_CAP` = D15: a Give or a boon is refused when `runWorth + worth > BOON_CAP` ("boon room left"). A balance ceiling that is a player-visible refusal |
| C3 | src/run/rewards.ts:154-157 `stageCeiling` | A grade ceiling by stage (D22) |
| C4 | src/effects/output.ts:129-132 `VS_CAP = 1.0` | Target-bonus stacking capped at +100% ("capped at x2", combat.ts:1558) |

## PART B. Hard game rules that happen to be caps ("game rule, Leon's or structural"; not delete candidates)

| # | file:line | Rule | Mark |
|---|---|---|---|
| B1 | data/rules.json:193 `cap_at_creation` 7; :218 caps text; :249 | Skill <= Attribute <= 10; Attribute 7 at creation, 8 / 9 / 10 from levels 3 / 6 / 9; a Legendary Deed lets one point stand 1 above (never over 10) | game rule, structural (spec) |
| B2 | data/rules.json:117 `echo.max` 3 | Echo maximum 3 (1 at session start) | game rule |
| B3 | data/rules.json:493 `ceiling` 9; data/perks.json:10-14 `ap_ceiling` (turn_max 9, turn_min 2, perk_gain_max_per_turn 3) | AP ceiling 9, floor 2, perks +3 at most a turn | game rule, structural (src/effects/ap.ts:12-19) |
| B4 | data/rules.json:857 `combat.elemental_taken_cap` 0.8 | Elemental resistance cap 80% (Leon's ruling of 19 Nov, spec item 5540) | game rule, Leon's |
| B5 | data/soul_modules.json `strain.limit` (3, +1 at Composure 1/2/4/6/8) (spec item 5539) | Strain limit; over it burns HP | game rule, Leon's |
| B6 | data/classes.json:77 (Guard pool "up to the pool's cap"), techniques.json guard `soak` | Guard pool cap by Durability (the Bulwark's larger) | game rule (Guard cap) |
| B7 | spec:3190; data/enemies.json:199-206 `levels.gap.full_hp_guard`; src/combat.ts:744-757 `BOSS_GUARD`; src/sigil.ts:348 `lineGuards`; test T14, shadow-measure.test.ts:77-86 | Elite and Boss guard: no single character action takes an Elite or Boss of the character's level or above from full HP to nothing (left on 1 HP); Miracle exempt (faith.ts:1053) | game rule, Leon's (12 Nov 2026) |
| B8 | data/enemies.json:200 `one_hit_levels_below` 5; src/combat.ts:738 | An enemy 5 or more levels below dies in one hit (never an Elite or Boss) | game rule, Leon's |
| B9 | data/rules.json:1590 `heal.cap_pct` 0.5 | No single heal restores more than half the target's max HP (Miracle exempt) | game rule (Leon's 1.36); shared with D14 |
| B10 | data/rules.json `ap`/`reaction` (one reaction per round); char sheet HP, Level 20 cap (spec 5489), mana meter 0 to 40, Sigil 4 glyphs, Max Sigil words, XP table | Structural limits a player sees | game rule, structural |
| B11 | data/techniques.json:285 `max_pct` 50 | A melee opener's bonus cap | structural per-technique cap |
| B12 | data/rules.json:1514 Pump 10% of Begin, `ties_max` (rules.json:2703), Resonance +0.4 total (spec 2063; src/magic.ts:747) | Per-system structural caps (Pump cost, tie counts, Resonance) | game rule |
| B13 | tools/validate.py:269-270 | One `ceiling` move beside a rank-III's two (name clash with A) | structural |

## Notes on classification for the lead

- Items I marked A that are borderline: D14 (heal gate and cap, partly a Leon rule), D15-D17 and C2 (the boon and variant worth caps are percent-of-rifle budgets that also act as visible refusals in play), D18-D20 (the fight budget), D22 (grade ceilings by stage, a progression gate).
- Every A-line number is read from `rules.json balance` through one place: `test/balance-contract.test.ts` (T1-T6) and `test/balance/*-measure.test.ts` (T8-T18). Removing `balance.ceilings`/`tolerance`/`ratio_allin_to_normal` would fail `balance-contract.test.ts:38-42` (the "contract is in data" test) and the dial checks, `figments.test.ts:28`, `heal-pct.test.ts:64-66` and `defence-measure.test.ts:31`, plus the validator hooks for `boon_cap`/`worth`/`worth_cap`.
- Several fixed bands in T8-T16 are literals typed into the tests (105-172, 135-215, 70-125, 80-135, 125-200, 45-130, 65-130, 85-170, 28-45, 75-100) and do not read `balance.ceilings`.
- Data fields that exist only to feed a line: D3 (all), D4-D11, D12 (`factors.melee` 1.35, `thrown` 0.7, `figment` 0.9), D26-D27, plus the `worth` numbers (D16), `shield_over_heal` 1.2 (rules.json:1579), `top_pct`, `hymn_heal_cap`.
- Spec items already recording Leon's relaxations: S14 (15 Nov), S15 (15 Nov), ROADMAP:341/395 (19 Nov "ceilings are relative"). The gate still enforces T1-T22 as hard failures.