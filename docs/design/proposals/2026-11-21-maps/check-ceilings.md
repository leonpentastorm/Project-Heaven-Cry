# Checked map: ceilings, lines and guards (READ ONLY, E:/phc-wt/rel030)

## 0. Header correction
- **WRONG: HEAD.** HEAD is now **fd6edc391** ("Items 2.0: revert the first fit, weapons back to their designed numbers"), one commit after 7fea0868b. That commit touched data/weapons.json, the spec, ROADMAP, two 0.34 handoffs, the items-2.0 proposals and five golden files. It did **not** touch data/rules.json, data/survival.json or the tests. The line numbers below were read at fd6edc391.
- **ADDED, an important fact:** `git grep` over packages/engine/src finds no reader of `balance`, `ceilings` or `yardsticks`. Only tests read them: balance-contract.test.ts, test/balance/*, figments.test.ts, heal-pct.test.ts and suite-shape.test.ts. The game code reads only the caps in A4 (SIGIL_CAP, BOON_CAP, stageCeiling, VS_CAP) and the B-list rules.

## 1. The ten claims checked against the file

| # | Claim | Verdict | Truth (file:line) |
|---|---|---|---|
| 1 | D1 `balance` 1661-1665, ratio 1.25, levels [1,5,10,20] | RIGHT | rules.json:1661 `balance`, :1665 ratio 1.25, :1666-1671 levels |
| 2 | D3f `outburst_peak` allin 90, level_lo 0.62, level_hi 1.25, notes "set to what is measured", "one base dial cannot..." | RIGHT | rules.json:1718-1727. "set to what is measured" is in `level_lo_note`; the dial sentence is in `level_hi_note` |
| 3 | D3q `figments` at 1672-1684 | WRONG (lines) | rules.json:1678-1686. It is the first row inside `ceilings` (:1677); 1672-1676 is `tolerance`. Values RIGHT (150 / 130 / 104 / 120, dial `output.factors.figment`, then `figments.json level.hp`) |
| 4 | D12 `output.factors` melee 1.35, thrown 0.7, figment 0.9 | RIGHT | rules.json:2157-2164; the melee 165% sentence is in the note at :2158 |
| 5 | D14 rules.json:1579-1591 `heal` (20% gate, cap 50%) | WRONG (name and detail) | The block is **`mending`** (rules.json:1533). `gate` (:1581-1588): hp 145, whisper 0.1333, hymn 0.3333, intervention 0.3333. The 20% for a 2-AP action is the profiles' `min_pct`, not a field here. `cap_pct` 0.5 is at :1590. The block's text (:1580) also says "Nothing limits how much a creature can be healed in a round". Engine reader: src/effects/output.ts:255-281 `MEND_GATE` |
| 6 | D15/C2 `boon_cap.cap` 50; BOON_CAP refusal | RIGHT | survival.json:219-223; src/run/power.ts:25 (`BOON_CAP = SV.boon_cap.cap`), :49 `capRoom`; give.ts:78 ("boon room left"); game.ts:3487, 3553 |
| 7 | T1 balance-contract "each system all in sits on its ceiling", SYS list, at_pin rise, 600 s | RIGHT | balance-contract.test.ts:33 `GUARD_GUNS`, :35 `SYS`, :44-78; timeout 600000 at :78 |
| 8 | T21 the solo-gunner bar 55%, at most 10 of 40 clear stage 4, level 3 | RIGHT, with one addition | survival-run.test.ts:42 `BAR = 0.55`, :48 floor(40 x 0.55) = 22, :50 at most floor(40/4) = 10, :52 level 3. The comments record each bar being re-set to "the measured share less one standard error" (:31-41). After :52 the test also asserts that a gunner on Bursts never runs dry between shops |
| 9 | T24/C1 SIGIL_CAP 350 / 500 kept; test pins them and the < 350 x 1.3 spell | RIGHT | src/sigil.ts:329; exported at src/magic.ts:646; test/sigil-balance.test.ts:23-38 (`capParts` returns parts unchanged; `expect(best).toBeLessThan(SIGIL_CAP * 1.3)` and `> 200`) |
| 10 | B7/B8 Elite/Boss guard and the one-hit rule in combat.ts | RIGHT (lines shifted) | combat.ts:742 `one_hit_levels_below`; :752 `BOSS_GUARD` read from enemies.json `levels.gap.full_hp_guard`; :763-790 the guard and its log line |
| 11 | T12/T14 magic-measure bands | RIGHT, incomplete | magic-measure.test.ts:25-31 (135-215, 70-125, plus `perCast > two.perCast * 1.6`, not listed). :33-37 also pins **`castsToKillAvg` >= 2 for an Elite and >= 4 for a Boss**, a line beyond the 1-HP guard. :38-49 adds `peak.perCast > steady.perCast` |
| 12 | T8/T9 guns-measure | RIGHT | guns-measure.test.ts:46-53 (1.05-1.25, Mag Dump <= 1.35), :55-59 (0.85-1.13, others <= 1.2), :61-67 (105-172) |
| 13 | S1/S2/S10/S14/S15/S21/S25 spec, docs and roadmap quotes | RIGHT | spec:3216, :3231, :4183 (rules 1.26 heading), :6639, :6665; balance-targets.md:9 "Nothing in the game should exceed these"; ROADMAP.md:341, 378, 391 |

Other rows I spot-read and found RIGHT: D2 (:1672-1676), D3a (:1692-1699), D3j (:1750-1759), D3k (:1760), D3l (:1764), D3s (:1767), D3o (:1785-1793), D4-D11 (:1811-1890; `control` is :1828-1836, `full_assault` :1869, `heal_floor` :1877), D13 (:1960), D16 (53 `"worth":` in survival.json), D17 (variants.json:8 `worth_cap` 20), D18-D20 (survival.json:63-85), D22 (survival.json:147), C4 (output.ts:129-132; combat.ts:1558).

Small line shifts, values right: D3b `plain` is :1687-1691; D3c `melee` :1700-1704; D3d :1705-1712; D3e :1713-1717.

## 2. The map, corrected and completed

Parts A1 to A4 and B stand as written in the map, with these corrections: header HEAD; D3q lines; D14 is `mending` (see table row 5); T12/T14 additions. The items below are missing from the map and marked **ADDED**.

### A1. DATA, ADDED
| # | file:line | What it pins |
|---|---|---|
| D29 ADDED | data/traits.json:11-12 `budget_sp_net` 3, `budget_note` | "Design budget: upside minus downside is about +3 SP; +1 on a roll costs 2 SP". A spreadsheet-style price on every trait. Per-trait costs are null |
| D30 ADDED | data/rules.json output.profiles `floor` (:2059, :2068, :2078, :2088, :2098, :2134, :2147; e.g. 0.5) and `output.floor_reference` :2151-2155 (attribute 4, skill 4) | The data behind T4: no heal or shield profile's Stat term falls under `floor` x a normal share's (4 points in each). "A damage profile has no floor" |
| D31 ADDED | data/rules.json:1579 `mending.shield_over_heal` 1.2, :1580 `area_share` 0.4 | The shield-for-heal exchange rate (a twin of D3k `shield.of_heal` 1.2: the same number in two places) and the area heal share |
| D32 ADDED | data/survival.json:149 `rewards.mods.band` 0.5 | A mod reward is "priced within band x the node's price band" |
| D33 ADDED | data/survival.json `stage` (:52-59): bulk 0.42, pressure 0.35, credits 0.35, xp [1, 2.6, 4, 4, 4.5], elite_up {per 2, max 4} | The stage curve of the fight budget (D18) and the rewards: bulk and pressure x (1 + k x (s-1)); Elites and Bosses at most 4 levels up |
| D34 ADDED | data/survival.json:42 `loadout.budget` 300; tools/validate.py:2816-2821, :2871-2873 | The camp budget; the validator fails any fixed stock id priced over it. A game rule (Leon, 14 Nov; "the budget stays 300, ruled 19 Nov", ROADMAP:378), not a % line |
| D35 ADDED | data/classes.json:5292 `sanctuary_cap` | Faith's shield pool, the `shield_order` dial (D3r names it). Located by grep only; its values were not opened |
| D36 ADDED | docs/design/handoffs/0.34-WEAPON-MEASURES.md:324 | The 0.34 weapon measure judges **melee against a 125% line**, special ammunition against 150%, and shields "read at melee 125%". data/rules.json `ceilings.melee.allin` is 165 (:1701). ROADMAP.md:391 repeats "melee 42 of 51 over 125%". Where 125 and 150 come from: not verified |

### A2. TESTS, ADDED
| # | file:line | Fails when | Gate? |
|---|---|---|---|
| T43 ADDED | packages/engine/test/suite-shape.test.ts:1-45 | `npm test` stops being `vitest run` over all of test/; `npm run balance` loses BALANCE_QUICK; more or fewer than **3** tests are gated behind BALANCE_QUICK, or a gated one is not a "quick run". Its header: "The balance targets ... so a number changed in data/ fails a plain `npm run check`" | Gate. It is the meta-guard that keeps every line test in the gate: removing or parking balance tests has to edit it too |
| T44 ADDED | packages/engine/test/balance/balance-sim.test.ts:44-121 | The reference builds are illegal, unspent or overburdened; "all in" is not main skill 7 at L1 and 10 at L9; "normal share" is not 3-4 at L1; the simulator is not deterministic or not matching previewAttack | Gate. Not a % line, but it defines the "normal share / all in" the lines are measured with |
| T45 ADDED | packages/engine/test/balance/run-policies.ts:309 | The 0.33 balance lane's play policies (the Sigilist from cover, ...) used by the simulated runs | Library |

### B. Hard rules that are caps, ADDED
| # | file:line | Rule |
|---|---|---|
| B14 ADDED | data/rules.json:23 `reduction_cap_pct` 60 | Damage reduction cap 60% (grep found no reader in packages/engine/src: not verified whether it is used) |
| B15 ADDED | data/rules.json:856 `healing_cap` "max HP" | Healing never above max HP |
| B16 ADDED | data/patrons.json:48 `tag_caps`, :56 `session_gain_cap` 10 | Devotion XP caps (2 a fight / 2 a scene / ... a session, CLAUDE.md) |
| B17 ADDED | data/survival.json:781 `fumble` {squad_max 1, floor_hp 1} | A scouting fumble's floor |
| B18 ADDED | data/survival.json:200-206 `repair.floor` 10, `rate` 0.1; validate.py:2994 | Repair price floor |
| B19 ADDED | data/skills.json:5209 `hymn_floor` 3 | A per-skill numbers floor (meaning not opened: not verified) |
| B20 ADDED | tools/validate.py:3402 loot `qty_max`; :2526 a shadow verb's cost at most its Ingenuity cap; :3623 one armour row is the `light_cap` | Structural caps the validator enforces |

## 3. Not verified
- No test was run. Every "fails when" is read from the assertion code.
- D3g, D3h, D3i, D3m, D3n, D3p, D3r: values were seen in the printed block and match; their notes were not read word by word.
- T2-T7, T10, T11, T13 line ranges beyond magic-measure, T15-T20, T22, T23, T25-T42: not opened.
- S3-S9, S11-S13, S16-S20, S22-S24, S26-S29: not opened.
- The source of the 125% melee and 150% special-ammunition lines in 0.34-WEAPON-MEASURES.md (D36).
- D35 `sanctuary_cap` values; B14 whether `reduction_cap_pct` is read anywhere (src grep found nothing); B19's meaning.
- The working tree at E:/phc-wt/rel030 showed no uncommitted changes when read. The other agent may commit again, which would shift weapon numbers (not rules.json lines).
