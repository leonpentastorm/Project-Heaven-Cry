# Checked map: rewards cut to hold a line, and rewards that give nothing today

I only read files in `E:/phc-wt/rel030` at HEAD `fd6edc391` (the weapons revert of 21 Nov). The spec is `docs/rules/PHC-Core-Rules-v1.0.md`. I edited nothing and ran nothing except reads.

## Part 1: twenty claims checked against the file and line they cite

| # | Claim | Verdict | What the file says |
|---|---|---|---|
| 2 | Weapon crit ×1.5 + 3%/Perception + 2%/Dexterity, max ×2.0 (`rules.json:362`); "Criticals alone pass the ceilings" (`balance-pass.md:161`) | RIGHT | `rules.json:362`: `min(2.0, 1.5 + 0.03*(perception-1) + 0.02*dexterity …)`. The old ×2.4 / ×2.9 is at spec:3199. The quote is at `2026-11-balance-pass.md:161`. |
| 4 | One Evoke leaves an Elite or Boss on 1 HP (`sigils.json:124-131`) | RIGHT | `elite_guard` is at `sigils.json:124-132` (`leaves_hp: 1`). The heading is at spec:3217. |
| 5 | Line multiplier ×1.87 / 1.93 / 1.98 (`sigils.json:107-109`) | RIGHT | The values are at lines 107-109. |
| 9 | Long rifle 47, `cycle_ap` 1, trimmed at the contract's dial (spec:11535-11540) | RIGHT | The row is at `weapons.json:394` (damage 47, cycle_ap 1). The item is 4644 at spec:11538-11544, and it adds: "both are fits to hold the contract, not design" (spec:11543). |
| 10 | Battle / marksman / core / .700 / hand cannon at 30 / 33 / 29 / 66 / 38 | RIGHT | The damage fields sit a few lines below the cited ids: `weapons.json:1671` (adamantile_battle_rifle 30), `:1739` (ccec_marksman_rifle 33), `:3423` (core_rifle 29), `:467` (blackpoint_700 66), `:1408` (frontier_hand_cannon 38). |
| 11 | The 2-AP rifle guard of 33; new rows over 33 take the bolt (spec:14676-14680) | RIGHT | Today's data: adamantile_heavy_rifle 36, arsenal_heavy_rifle 38, chezknov_precision_rifle 35, all with cycle_ap 1; adcorp_designated_rifle 33 with no cycle. The 21 Nov revert of item 8120 did not touch item 8101. |
| 12 | Rarity dmg ×1 at every grade (`rules.json:1610/1621/1632/1643/1654`); the quote at `:1603` | RIGHT | All five `"dmg": 1` lines are at the cited lines, and the quote is at `:1603`. The "+25 to 37% from rarity alone, measured" quote is in `docs/design/handoffs/balance-refit.md:100-102`, which is in `handoffs/`, not `proposals/`. |
| 13–16 | Weapon, Sigil, Outburst and elemental slopes are 0 | RIGHT | In `rules.json` near 1991-2043: weapon k 1.5, attr 0, skill 0; sigil k 1.7, 0/0; soul k 1.55, 0/0; elemental k 1, 0/0. The old `physical` profile still carries attr 0.1 / skill 0.05 (about line 1985). |
| 19 | Prayer heal dial 1.44 "capped" (`rules.json:2091`) | RIGHT | `blessing_mend.k` 1.44 is at `rules.json:2092`. The spec row at spec:4266 says "past the cap of 2.5 Soldier-turns: capped there (×1.51)". |
| 21 | Outburst base 37 (`soul_modules.json:112`); "No base sits both lines…" (spec:10934) | RIGHT | The quote is at spec:10934 (item 4201, 31 → 37 on 16 Nov). **Stale context:** the peak line of 165% is no longer the ceiling (see ADDED A2). |
| 25 | Shape +0.12 (`classes.json:5169`); +0.2 / +0.15 break the peak band (spec:12313) | RIGHT | The text is at spec:12313-12318 (item 5400) and repeated at CHANGELOG:90. |
| 26 | Resonance cut to 4% a step, to 8 / 12% (`perks.json:8816`); band "+4 to +8% Tier I, +8 to +12% Tier II" (`alpha-perks-revamp.md:9, 30`) | RIGHT, one detail WRONG | The id is at 8816; value 4 and limit 8 are a few lines below. The band text is at revamp:9, and "**Cut**" is at :30. **The "before" is wrong:** the doc says "live today at +20% / +30%" (revamp:30). "+10% a step" is not in the cited line (not verified). |
| 30 | Bond per_bond 0.05 (`tending.json:21`), "against its line of 70" (spec:5116) | RIGHT | per_bond 0.05 is at `tending.json:21`. The contract's `mender_offence` ceiling is 70, with the dial named `tending.json bond.per_bond`. |
| 31 | Guard soak 6, pool max 4 (`techniques.json:38, 30`) | RIGHT | The values are at `techniques.json:30` (max 4) and `:38` (soak 6). Spec:6519 and 6532 confirm. |
| 32 | Measured Blow 1 Momentum (`classes.json:4302`) | RIGHT | `"value": 1` on the momentum resource is at 4302. Spec:11542-11543: "211% (the band's top 206%), so it is 1 (203%)". |
| 33 | Gun profile k 1.275, attr 0.0294 (`rules.json:2010-2013`) | RIGHT | The `gun` profile is at about 2010. Its note says Agility 1 ×0.85, 7 ×1.00, 10 ×1.075 (spec items 4700, 4721). |
| 34 | Variants worth_cap 20 (`variants.json:8`) | RIGHT | The value is at line 8. |
| 35 | Boon cap 50 (`survival.json:219-222`) | RIGHT | The block is at `survival.json:219-222`. The quote is at `survival-spec.md:143`. |
| 36 | Target bonuses capped +100%; "no reason found" | Number RIGHT, reason WRONG | `VS_CAP = 1.0` is at `effects/output.ts:129`. The source comment is at `output.ts:126-128`: "capped at ×2.0 in all (plan 6a-1, provisional)", listing True Name, Judgement Day, Case Closed, Weak Point, Deliver the Sinner, Holy Ordnance, Moon Hunter, Humanity First and Ork Steel. It also holds the negative side at −90% (`:132`). |
| 37 | Weapon Art owed: steady output comes down by what the Art adds (`balance-pass.md:401-404`) | RIGHT | The text is at the cited lines. |
| T2 | Class dials all 1 (`classes.json:1950, 2830, 4010`) | RIGHT, one line MISSED | There are four dials blocks: `classes.json:1941` (Sigilist), `:2282` (Rigger, a Figment it owns), `:2821` and `:4001`, each `"value": 1`. The data note is at `classes.json:8904`. Leon approved the piece on 20 Nov (spec:13612-13618, item 7003). |
| T2 | +1 mod slot not built; armour `arm` 1; Celestial = Relic | RIGHT | Spec:681-682 promises the slot. Spec:14227-14229 says it is unbuilt and that Celestial is Relic stats. `character.ts:1721` reads only the row's `mod_slots`. `arm` 1 is on all five rows. Note: `rules.json:1603` still says rarity "buys … a mod slot", but nothing builds it. |
| — | "Already undone: item 8120 reverted 21 Nov" | RIGHT | Spec:14756: "REVERTED 21 Nov 2026 (Leon: the ceilings compare fun against effort; they are not a line to fit weapons to)." |

I did not re-check the "before" values in claims 1, 3, 6–8, 14–18, 20, 22–24, 27–29 against their old sources. Their "now" values matched where I opened the data: crit `sigils.json:118-122`, stage_mult `soul_modules.json:14-19`, melee 1.35 and thrown 0.7 at `rules.json:2159-2160`, Heavy Bolt `damage_pct` 40 at `techniques.json:1811`, Mag Dump max_rolls 3 / step 4 at `:2063-2066`, Burst "two rolls … −4" at `:1498`.

## Part 2: the corrected and completed map

### Table 1: rewards reduced, flattened, capped or removed for a ceiling, line, band, target or contract

These rows are unchanged from the map you gave me except where marked.

- **1–11:** as given.
- **12:** the `balance-refit.md` path is `docs/design/handoffs/balance-refit.md`.
- **13–25:** as given.
- **21:** add that the peak line it was fitted to has since been redefined (see A2).
- **26:** the "before" is **+20% / +30%** (revamp:30), not "+10% a step".
- **27–35:** as given.
- **36, corrected:** the cap's source is "plan 6a-1, provisional" (`output.ts:126-128`): target bonuses add, are held between −90% and +100%, then multiply once.
- **37:** as given.

**ADDED rows:**

| # | System | Now (file:line) | When | Reason in the doc's own words |
|---|---|---|---|---|
| A1 | **The balance contract itself:** each system has an all-in ceiling and one named dial that is turned to hold it | `rules.json:1661` (`balance.ceilings`): plain 125 (weapon.k, level.deal); gun 145 (each weapon's damage); melee 165 (factors.melee); sigil_line 150–200 (line_mult); outburst_steady 135 (damage.base); outburst_peak 90 (damage.base, then stage_mult); chaplain_turn 125 (smite base: "Rebuke's 20; 15 only if the measured all-in mean passes 140"); whisper 80 / hymn 150 (blessing.k); healer 45; shadow 125 (`shadow.per_point`, now 0.6 at `rules.json:2772`); tending 65 (tend.k); mender_offence 70 (per_bond); mender_window 100 (bard.ledger factor); figments 150 (factors.figment). Tolerance is mean ±12%, ±25% at any one level. `balance-contract.test.ts` fails a system that leaves its band. | rules 1.26 (12 Nov) | "fails when it leaves its band" (`rules.json` balance.rules) |
| A2 | **Outburst peak ceiling redefined to the measured value** | `balance.ceilings.outburst_peak.allin` **90** (was the 165 line that items 21, 22 and 25 were fitted to) | rules 1.81 item 6903 (20 Nov) | "The contract's `outburst_peak` ceiling is set to what is measured: 90" (spec:13565-13573). This happened after the base (37) and Shape (+0.12) had been trimmed to the older band, and they were not raised back. |
| A3 | **Figment factor** | `rules.json:2161` `figment` 0.9: "every attack made through a Figment deals at most this share of what the same AP of the plain rifle does" | rules 1.34 (spec item 2160) | "its worth over the rifle is its soak (the figments ceiling)" (`rules.json` figment_note) |
| A4 | **Sigil boon (MEND) Stat trimmed** | 1.17 × (1 + 0.06 …) after being scaled to 1.92 | rules 1.27 item 1732 | "scaled to 1.92 and trimmed, because a boon also multiplies by Healing given … average 200" (spec:10159) |
| A5 | **Single-heal cap** | `rules.json:1590` `cap_pct` 0.5: "no single heal restores more than this share of its target's max HP" | rules 1.36 | the note at `rules.json:1591` |
| A6 | **Hymn heal cap** | `rules.json:1755` `hymn_heal_cap` 65, `hymn_avg` 45, whisper 15 (in % of reference HP) | rules 1.36 | "a Hymn turn's healing … at most hymn_heal_cap" (`rules.json:1758`) |
| A7 | **Devotion XP caps** (a reward earned by play, capped) | `patrons.json:48-52` tag_caps 2 a fight / 2 a scene / 6 a session; `:53-56` Narrator deeds min −6, max 5, `session_gain_cap` 10 | Faith 2.x | (the map lists only "whether Devout's +1 is eaten by the cap" as not verified) |
| A8 | **Elemental damage-taken cap** (defence reward) | `rules.json:857` `elemental_taken_cap` 0.8 from every source; Pain Threshold +6% a point, at most 60% (`rules.json:23` `reduction_cap_pct` 60) | rules 1.70 item 5540 (Leon, 19 Nov) | the note at `rules.json:858` |
| A9 | **Outburst level-5 peak band widened instead of the reward cut** | `outburst_peak.level_hi` 212 (was 206) | lead's ruling item 4231 / spec:6696 item 29 (16 Nov) | "one base dial cannot put both the steady turn and the peak on their lines" |
| A10 | **Contradiction on record** | Spec:6665 (Leon): "**No class or perk is trimmed to fit under a ceiling.** The balance contract … holds the line, so it measures its builds with no perk steps." | 1.56 | Later items trimmed a class move and a class feature to the contract anyway: item 4644's Measured Blow 2 → 1 (spec:11542) and item 5400's Shape +0.2 asked, +0.12 built (spec:12317-12318). |
| A11 | **Survival loot caps** (scarce drops) | `loot_tables.json:7` caps easy 2 / standard 3 / hard 4 …, plus `qty_max` (rules 1.54 item 8) | rules 1.54 | "the pack's quantity cap" (`loot_tables.json:5`). Not a % ceiling; listed as a reward capped by count. |

**Context, cut for a design reason rather than a line:** as given in the map.

**Not cut (checked):** as given in the map. Also, spec:9944 (item 1243) records heals that were "Measured and not met … Not changed; Leon's call": the Outburst's biggest heal was under its band and the MEND Line was over it, and neither was moved to the line.

### Table 2: rewards that give nothing or almost nothing today

These rows are as given, with these corrections and additions:

- **Class dials:** the four blocks are `classes.json:1941, 2282, 2821, 4001` (Sigilist, Rigger, and two more), all `value` 1. Leon approved the piece on 20 Nov (item 7003).
- **ADDED, the rarity description is wrong.** `rules.json:1603` tells readers that rarity "buys accuracy, durability and a mod slot", but the mod slot is unbuilt (spec:14227-14228). Fine and Masterwork's only working rewards are +1 / +2 accuracy and durability.
- **ADDED, Relic is sold.** `rules.json` relic `"sold": true`, price ×25, numbers identical to Masterwork (acc 2, dmg 1, dur 1.5). Only `marks` 3 and one Relic property differ.
- **ADDED, the target-bonus perks share a ceiling.** The nine target-bonus perks (True Name … Ork Steel, about +0.15 each, `output.ts:126-128`) add into one cap of +100%. Past the cap, a further target bonus gives nothing.

## Not verified

- The "before" values of claims 1, 3, 6, 7, 8, 14–18, 20, 22–24, 27–29 (I checked only their "now").
- Resonance's "+10% a step" before value: the revamp doc gives only "+20% / +30%".
- Whether the two remaining class dials (`classes.json:2821`, `:4001`) belong to the Channeler and the Chaplain. I read their positions but not their labels.
- Whether `shadow.per_point` 0.6 (`rules.json:2772`) was itself cut to the shadow ceiling. The contract names it as the dial and says "fitted after the window rows are measured", but I found no history item for the 0.6.
- Whether `chaplain_turn`'s Rebuke base is 20 or 15 in today's data (I did not open `classes.json` guardian.smite amounts).
- The map's earlier not-verified items stand: CHANGELOG before 0.23.0, the handoffs `_archive`, red dot and scope on rifles, the follow strike's 1–5% under ×0.6, and Iron Grip Tier II. For Iron Grip, spec:10939 (item 4206) says +6%, II +12%, but I did not read the data row.
