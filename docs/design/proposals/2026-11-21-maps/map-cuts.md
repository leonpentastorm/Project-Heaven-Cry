## Rewards cut to hold a line

Everything was read in `E:/phc-wt/rel030` (spec = `docs/rules/PHC-Core-Rules-v1.0.md`). "Now" was checked in today's data and code.

### Table 1: rewards reduced, flattened, capped or removed for a ceiling, line, band, target or contract

| # | System | Before | Now (checked, file:line) | When | Reason in the doc's own words |
|---|---|---|---|---|---|
| 1 | Sigil damage clamp | strongest Line about 1,144 (2,288 crit) | clamp removed in rules 1.17 (`sigils.json` has no cap) | decision ~101 (items 587–590), before rules 1.15 | "the 350 / 500 ceiling per creature per spell… falls… to about 346" (`decisions.md:320`); removed in 1.17: "No ceiling" (spec:3231) |
| 2 | Weapon critical | ×2 + 10%/Perception + 5%/Dexterity (×2.4 at L1 to ×2.9 at L20); Breath Held ×1.5 on top | ×1.5 + 3%/Perc + 2%/Dex, **max ×2.0** (`rules.json:362`) | rules 1.15 | "Criticals alone pass the ceilings" (`balance-pass.md:161`); spec:3199 |
| 3 | Spell critical (Sigil, Outburst) | ×2 | ×1.5, max ×2.0 (`sigils.json` critical; `soul_modules.json` damage.critical) | 1.17 | "the weapon's rule" (spec:3232) |
| 4 | Sigil one-Evoke kill on Elite/Boss | could kill | left on 1 HP (`sigils.json:124-131`); since 12 Nov one rule for every action | 1.17 target 2 | "An Elite and a Boss are never taken out by one Evoke at equal level" (spec:3217, 3234) |
| 5 | Sigil Line multiplier | ×1.7/1.75/1.8 (1.17) | ×1.87/1.93/1.98 (`sigils.json:107-109`), raised in 1.26 | 1.17 | "what holds the 4-glyph number down is target 2… Above ×1.8 every landed Line would need the guard" (spec:3237) |
| 6 | Burst (characters) | 2 rolls at −2 (Quick none); Auto: **3 rolls** −1 each | 3 rounds, **2 rolls**, second at −4 (`techniques.json:1498`) | 1.18 | "An optimised gun deals a bit under 150%… 135 to 148%" (spec:3312); Burst "×1.5 to ×1.8… with no skill, perk or class behind it" (spec:3326) |
| 7 | Mag Dump | 4 rolls, −1 each | 3 rolls max, −4 each (`techniques.json:2063-2066`) | 1.18 | same guns target (spec:3347) |
| 8 | Heavy Bolt | +50% | +40% (`techniques.json:1811`) | 1.18 | same target (spec:3348) |
| 9 | Long rifle | 50, Shot 2 AP | **47**, Shot 3 AP (`weapons.json:394`, cycle_ap 1). 48 in 1.18, 47 in 1.60 | 1.18; 1.60 item 4644 | "the slow big shot"; then "The gun ceiling held… Trimmed at the dial the contract names" (spec:11535-11540) |
| 10 | Battle rifle / marksman / core rifle / .700 / hand cannon | 38 / 40 / 32 / 90 / 40 | 30 / 33 / 29 / 66 / 38 (`weapons.json:1664, 1732, 3418, 460, 1399`) | 1.18 | ".700: the special-ammunition class, at 150%"; "hand cannon: one in each hand measured 152% at level 20" (spec:3358-3371) |
| 11 | Rifle with a 2-AP Shot | none | "deals no more than 33"; new rows over 33 get the bolt (+1 AP a shot): adamantile_heavy_rifle 36, arsenal_heavy_rifle 38, chezknov_precision_rifle 35 (`weapons.json:6046, 6916, 6736`); adcorp_designated_rifle 34→33 | 1.18 (spec:3373); 1.93 item 8101 (spec:14676-14680) | "Rules 1.18's guard stands for the new rows" |
| 12 | **Rarity damage** (Masterwork, Relic, Celestial) | ×1.1 | **×1.0 at every grade** (`rules.json:1610/1621/1632/1643/1654`; read `combat.ts:585`) | 1.26 item 1701 | "Masterwork's +10% was the gun premium the all-in ceiling could not hold" (`rules.json:1603`); "+25 to 37% from rarity alone, measured" (`balance-refit.md:100-102`) |
| 13 | Weapon damage slope | attr 0.1, skill 0.05 a point | 0 / 0, k 1.5 (`rules.json:1991-1997`) | 1.26 item 1700 | "no damage slope on a rolled attack (skill buys accuracy, level buys damage)"; all-in = ceiling, normal = ceiling ÷ 1.25 (spec:4188) |
| 14 | Sigil damage slope | 0.1 / 0.1 | 0 / 0 (`rules.json:2020-2027`) | 1.26 | same (`balance-refit.md:61`) |
| 15 | Outburst (soul) damage slope | 0.05 / 0.1 | 0 / 0 (`rules.json:2036-2043`) | 1.26 | same (`balance-refit.md:62`) |
| 16 | Elemental bonus (Expression) | 0.1 / 0.05 | k 1, none (`rules.json:2028-2035`) | 1.26 | "Elemental damage adds no bonus any more" (spec:4202) |
| 17 | Blessing power (Faith) | 1 + 0.1 × Faith (×2.0 at Faith 10) | 0.956 × (1 + 0.06(Virtue−1) + 0.06 Faith) (`rules.json:2044-2051`) | 1.26 item 1706 | fitted to Whisper 80 / Hymn 150 (spec:4215) |
| 18 | Healing given (heals and shields) | 1 + 0.1/0.1 | 0.87 × (1 + 0.06/0.06) in 1.26; ×1.6 in 1.27 (k 1.392, `rules.json:2052`); slopes still 0.06 | 1.26 | "A healer's turn: 1.25 Soldier-turns" (spec:4216) |
| 19 | Prayer heal dial | ×1.6 wanted (1.53) | **1.44 "capped"** (`rules.json:2091`) | 1.27 | "At ×1.6 it was 265 at level 1, past the cap of 2.5 Soldier-turns: capped there" (spec:4266) |
| 20 | Sigil MEND/WARD dial | 1.92 (the ×1.6) | 1.17 in 1.27; now 1.629 (1.36) | 1.27 | trimmed so "its system's all-in average… sits on 200" (spec:4258, 4265) |
| 21 | Outburst Damage base | 20 → 28 (1.17) → 40 (1.19) | **31** in 1.26, then **37** (`soul_modules.json:112`) | 1.26 item 1705; 1.56 item 4201 | 1.26 fitted to 135 / 165 (spec:4214); 1.56: "No base sits both lines… the peak's level-5 band allows at most about ×1.16" (spec:10934) |
| 22 | Outburst stage table | ×0.8/1.2/1.6/2.0/2.4 (1.17) | ×0.8/1.0/1.2/1.4/1.6 (`soul_modules.json:14-19`) | 1.19 | Leon: "Normal pump need to go down so the number dif from the emotion feel worth" (spec:3402). Targets "stand: 125% steady, 150% biggest" |
| 23 | Feelings re-stepped down | Rage +0.7, Shame +0.7, Abandon +1.0, Despair/Spite/Cruelty/Loneliness +0.4, Awe +0.4, Calm +0.4 | Rage +0.5 (`feelings.json:32`), Abandon +0.8 (`feelings.json:1119`), Shame +0.5, those +0.2, Awe 0, Calm −0.4, Relief −0.2; each feeling once a Release | 1.19 | price rule "1 Strain or 8 HP for +0.3"; "strong… the multiplier going down is its price" (spec:3419). Fitted to the 1.17 targets |
| 24 | Heart Surge past stage 4 | ×2.6 → ×2.8 (1.17) → ×1.8 (1.19) | **removed: never past stage 4** | 1.60 item 4634 | "past it is the Outburst door's reserved peak" (spec:11505) |
| 25 | Free Pumps | Empathy 7: a 2nd free Pump; Shape: an extra free Pump | 1 free stage a turn; Shape +0.1 → **+0.12** (`classes.json:5169`) | 1.19; 1.68 item 5400 | 1.19 quotes Leon on free Pumps; 1.68: "+0.2 gives 217%, +0.15 214%, +0.13 213%, +0.12 passes" the peak band (spec:12313; CHANGELOG:90) |
| 26 | Resonance (perk) | +10% a step, to +20 / +30% | 4% a step, to 8 / 12% (`perks.json:8816`) | 1.56 alpha perks, item 24 | "overtuned. **Cut**"; band "+4 to +8% Tier I, +8 to +12% Tier II" (`alpha-perks-revamp.md:9, 30`) |
| 27 | 18 alpha perks | various | all set inside the band +4–8% / +8–12% (see list 2) | 1.56 | same band (`alpha-perks-revamp.md:9`) |
| 28 | Melee factor | none / slopes | ×1.35 on every blow (`rules.json:2159`) | 1.26 | fitted to "165%" (spec:4212). A raise at the time, but set to the line |
| 29 | Thrown grenades and charges | ×1 (frag 40) | **×0.7** (frag 28) (`rules.json:2160`) | 1.26 item 1710 | "a frag at 40 was 1.5 times that [the budget rule]" (`rules.json:2162`) |
| 30 | Mender damage per Bond | +10% | **+5%** (`tending.json:21`) | 1.38 item 3 | "measured 79 solo and 84… against its line of 70" (spec:5116) |
| 31 | Guard soak / pool | 10 a point / 5 | **6 / 4** (`techniques.json:38, 30`) | 1.55 items 72, 74 | "6 brings it to the lead's band"; "the lead's lever to bring a solo tank nearer a solo gunner" (spec:6519, 6532) |
| 32 | Measured Blow (Breaker) | 2 Momentum (as built) | **1** (`classes.json:4302`) | 1.60 items 4623 / 4644 | "the heavy blade's level-20 line read 211% (the band's top 206%), so it is 1"; "fits to hold the contract, not design" (spec:11539-11541) |
| 33 | Gun damage from Agility | G1: 0.05 a point (Agility 10 ×1.12) | **0.0294** (Agility 10 ×1.075; Agility 1 ×0.85) (`rules.json:2010-2013`) | 1.61 R2 item 4721 | "softer at the low end"; k re-pins Agility 7 to the yardstick's 1.5; ceiling held "at the pin" (spec:11654-11656) |
| 34 | Variants | none | worth ≤ **20%** of a rifle-turn (`variants.json:8`) | 1.56 L4 | "(Leon)" (spec:6643) |
| 35 | Survival run power | none | boons + Relic properties + token + graft ≤ **50%** of a rifle-turn (`survival.json:219-222`) | 1.43 rule 31 | "one run-power budget, every source of it priced the same way" (`survival-spec.md:143`) |
| 36 | Target bonuses | none | added together, **capped +100%** (`effects/output.ts:129`, `rules.json:1892`) | unified damage stage a | no reason found; "today's VS_CAP" (`unified-damage.md:385`) |
| 37 | Weapon Art (planned) | – | owed: "a gun or blade build's steady output comes down by what its Art adds"; slot is null everywhere (`families.json:29…`) | ruling of 12 Nov | "the ceiling of rules 1.18 is on the average over a fight with the Art in it" (`balance-pass.md:401-404`) |

Already undone: 1.93 item 8120 (34 new rows' damage) was **reverted on 21 Nov** (spec:14756-14771). Only the Blackpoint carbine's magazine of 3 was kept.

Cut in the same passes for a design reason, not a line (for context): Return ×1 → ×0.3, Shell ×0.5 → ×0.35, Inverse ×1 → ×0.7, Impact retired (spec:3286); Witnessed's +2 now applies only after a kill (spec 1.22); the Hymn cooldown lengthened (1.22); AP perks once every 3 turns (spec:3030); weapon mastery retired (item 947).

Not cut (checked): level HP is still 5 + 2 × Pain Threshold a level (`rules.json:314`; Pain Threshold's `hp_per_level` 2 is at `skills.json:465`). Rules 1.73–1.75 say "no number was fitted to a ceiling" (spec:12893). Rules 1.81 raised or left numbers.

### Table 2: rewards that give nothing or almost nothing today

| Reward | What it gives now | file:line |
|---|---|---|
| Grade damage (all five grades) | ×1 | `rules.json:1610-1654`; `combat.ts:585` |
| **Masterwork → Relic step** | accuracy +2 = +2, durability ×1.5 = ×1.5: no number moves; only one Relic property worth 4–10% (Keen +10%, Balanced 4), which counts against the 50% boon cap; price ×8 → ×25 | `rules.json:1627-1648`; `survival.json:224-247` |
| **Relic → Celestial** | identical numbers; "Celestial's quirk is not designed (until then Celestial is Relic stats)"; price ×50 | `rules.json:1649-1659`; spec:14229 |
| **+1 mod slot (Fine, Masterwork)** | promised by the spec, **not built**: mod slots come only from the weapon row | spec:681-682 vs spec:14227-14228; `character.ts:1721` |
| **Armour grades** | `arm` 1 at every grade, and armour doesn't wear, so a grade changes only price and marks; the Forge charges the weapon fees | `rules.json:1614…1658`; `character.ts:224`; spec:14231-14241 |
| Fine → Masterwork | +1 accuracy, +25% durability, for ×3 → ×8 price | `rules.json:1616-1637` |
| Class dials (Sigilist, Rigger, Channeler, Chaplain) | **every dial 1**; "a dial at exactly 1 is no item at all" | `classes.json:1950, 2830, 4010`; spec:13612-13618 |
| Beta feeds (all nine) | +1% × alpha points per beta point (×1.1 at alpha 10, beta 1); the contract holds lines "with every feed at ×1" | `skills.json:463, 1007, 1559, 2507, 3112, 3684, 4234, 5450`; spec:11376-11379, 11438 |
| Alpha perk Tier I/II steps | Weight of the Wall 2%/3% a Guard (max 10/15) `perks.json:23`; Many-Eyed Dream 4/6% a Figment `:5742`; Clenched Heart +5% at stage 3+ `:8680`; Second Clause 6/12% `:4541`; Taut Thread 6/12% `:6875`; Iron Grip 6% `:1390`; Answer in Kind 8/12% `:151`; Long Dark 8/14% `:3496`; Sinner's Due 8/12% `:10193`; Resonance 4% a step `:8816` | as listed |
| Follow strike | "a follows item's strike deals 1 to 5% of the main hand's"; its −2 "buys nothing" (kept) | spec:13563-13564 (6902), 13609-13611 (7002) |
| Reflex (Skirmisher's 2nd reaction) | measured "+0": "nothing of its spends the second" | spec:13559-13561; spec 1.38 item 4 (~5126) |
| Athletics' Defense from point 1 | OFF (`defense_from` 2), waiting on Leon | `skills.json:1561`; spec:13694, 7504 |
| Weapon mastery (kills, +1/+2 to hit, 33 weapon perks) | retired, loaded by no engine file; One Blade's 1.25 "a record nothing reads" | `weapon_mastery.json:6`; spec:1071, 9744, 10171 |
| Weapon Art slot | null on every family, row and variant line | `families.json:29-37…`; spec:14291-14295 |
| Measured Blow | 1 Momentum, once a fight | `classes.json:4285, 4302` |
| Survival nodes' MP | `ammo_pack.mp` all 0 (Leon, 17 Nov) | CHANGELOG:84 |

### Not verified
- `CHANGELOG.md` before 0.23.0 (lines 1300–1841) was searched for keywords only, not read line by line. The handoffs `_archive` folder and the 0.32 lane perk rewrites were not read in full.
- Whether red dot and scope still do nothing on rifles (`mods-today.md:137`: rifle range past a sight of 12) was not re-checked against today's sight rule.
- The follow strike's 1–5% is the 1.81 measure; it was not re-measured with today's `mod_follow_strike` ×0.6 (`items.json:1744`).
- No source was found for the +100% target-bonus cap.
- Whether Devout's +1 Devotion XP is in practice eaten by the session cap.
- Iron Grip Tier II's number.