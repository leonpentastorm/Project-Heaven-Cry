# What this patch changes, against what is live

**Live: 0.22.0.** This branch (`claude/charming-gauss-hbq4n0`) is everything below on top of it. Kept by the lead as the
work goes; the last section says where it stands. Rules revisions 1.15 to 1.26 are all new to players: live stops
at rules 1.14. (Rules 1.27, the heal re-fit, is on top of live 0.23.0: section 6.)

Each row: what a player on live has today, what they get with this patch, and where the detail is. Written from the
hand-offs as the work went; **the live column is to be checked against `origin/main` line by line before release**
(cells marked "not checked" are the ones known to be unverified).

**Live column checked against `origin/main` (0.22.0, `651ad63`) on 12 Nov 2026**, with `git show` and `git grep` on
`data/*.json` and the engine source, without a checkout. One live value was wrong and is fixed (Boss HP: live has 200
at every level; 960 was an interim value on this branch). Four were made exact (critical multiplier, prayer heal
sizes, Boss row, tier HP). Rows that could not be verified from the code on `origin/main` (they are measurements or
need a running game) are listed at the end of section 11b below.

## 1. Enemies (rules 1.15)

| | Live 0.22.0 | This patch |
| --- | --- | --- |
| Enemy numbers | One set per tier, whatever your level | By tier **and level** (HP, damage, to-hit, defence grow with you) |
| Tiers | Minion, Soldier, Elite, Boss | Plus **Vermin** (dies in one hit) |
| To hit at equal level | Not fitted | About 65% |
| Criticals | ×2 plus 0.1 per Perception and 0.05 per Dexterity over 1, no cap (`rules.json derived.multipliers.critical`) | ×1.5, to ×2.0 with Perception and Dexterity |
| Elites and Bosses | Could be one-shot by a big level gap | Never taken out in one hit by the gap |
| AP perks | Usable every turn | 3-turn cooldown |
| Enemy 13 or 14 tiles away | (maps were too small for it) | Closes in or fires (it used to stand still: fixed) |
| Target choice | Most hurt, but techniques went at the first character in the list (a bug that spread the fire) | Techniques aim at the chosen target; **enemies go for whoever heals the most** (Soldiers lean, Elites and Bosses hunt); a **fire doctrine per tier** was fitted (rules 1.25) because fixed aim made them pile on one character |
| Boss HP | **200** at every level (one row a tier: Minion 30, Soldier 60, Elite 100, Boss 200) | **820** at level 1 (rules 1.23; it was 960 earlier on this branch), growing with the level table |

Detail: `balance-sim-step1-full.md`, `defence-step.md`.

## 2. Maps and camera (rules 1.16)

| | Live | This patch |
| --- | --- | --- |
| Map size | 16 × 11 | Up to **26 × 26**, smaller per campaign |
| View | Whole map on screen | A **camera**: today's tile size, follows the play, overview on the M key, edge arrows |
| Painted maps | The M813 paintings | Plain colour until the M813 rewrite (art requests M1 to M9) |
| Deployment | A few tiles apart | 10 to 14 tiles apart |

## 3. Guns (rules 1.18)

| | Live | This patch |
| --- | --- | --- |
| Best gun build, against the plain rifle | 204 to 221% | **143 to 146%** |
| Burst | 3 rounds, 3 rolls | 3 rounds, **2 rolls**, the second at −4 (enemies keep 3 rolls for now) |
| Mag Dump | 4 rolls | 3 rolls at most |
| Long rifle | Shot 2 AP | Shot **3 AP**, Aimed 4 (two Shots a turn) |
| Damage | Battle rifle 38, marksman 40, core rifle 32, Blackpoint 90, hand cannon 40 | 30, 33, 29, 66, 38 |
| Heavy Bolt | +50% | +40% |
| SMG family | SMG 15, PDW 16, whisper 13, drum 15, auto-pistol 14 | 19, 20, 16, 19, 17 |
| Plain rifle, melee | | Unchanged |
| **Rules 1.26, the re-fit** | | The best gun **all in** on 145% (measured 164 / 150 / 148 / 135% at levels 1, 5, 10, 20), a normal share under it (136 to 130%). A weapon hits as hard in anyone's hands at the same level: no damage slope, a Level term instead (the plain rifle at a normal share did not move). Masterwork, Relic and Celestial add **no damage** (×1.1 before): accuracy, durability and a mod slot only |
| **Melee (rules 1.26)** | 112 to 142% (the optimised blade) | All in on **165%**: every melee blow a character strikes ×1.35 (the greatsword 156 / 149 / 131 / 176%; the Tank lower, 77 to 121%) |
| **Grenades and charges (rules 1.26)** | Frag 40, flat at every level | A character's consumables ×0.7 (a frag 28), × the thrower's Level term: on a group of enemies they were 1.5 times the budget |

Detail: `damage-step-guns.md`; the re-fit: `balance-refit.md`. Ruling for later: Weapon Arts may break the ceiling as a charged ultimate, counted in the
build's average.

## 4. Sigil magic (rules 1.17)

| | Live | This patch |
| --- | --- | --- |
| Full 4-glyph Line, against the plain rifle | 78 to 119% | **140 to 205%** (the biggest hit in the game) |
| 2-glyph Line | 42 to 61% | 71 to 105% |
| How | Damage clamped at 350 / 500 | A Line multiplies its damage: ×1.7 / 1.75 / 1.8 for 2 / 3 / 4 glyphs; no clamp |
| Spell criticals | Not checked for this table | ×1.5 |
| Elites and Bosses | | One Evoke leaves a full-HP Elite or Boss at your level or above on 1 HP |
| MEND / WARD | 25 / 30, flat | 10 / 12 × the level factor (see Healing); since rules 1.26 × a landed Stat on Intelligence and Brain Power (`sigil_mend`) |
| **Rules 1.26, the re-fit** | | Line multiplier **×1.87 / 1.93 / 1.98**; no damage slope (Sigil power 1.7 × the Level term), no Elemental bonus; a full Line **all in** 155 / 145 / 174 / 188% at levels 1, 5, 10, 20 (band 150 to 200%) |
| Edge Word (Evoker blade) | Triggered on any hit | Only on your own turn |

Detail: `damage-step-magic.md`; the re-fit: `balance-refit.md`.

## 5. Outburst (rules 1.17, 1.19, and the base of 12 Nov)

| | Live | This patch |
| --- | --- | --- |
| Steady, against the plain rifle | 61 to 89% | about **135%** |
| Biggest Release | 122 to 143% | about **165%**, over two turns |
| Stage table | ×0.8 / 1 / 1.4 / 1.8 / 2.2 | ×0.8 / 1.0 / 1.2 / 1.4 / 1.6 (a plain Pump is **+0.2**) |
| Damage base | 20 | **31** (rules 1.26: all in on 135% steady and 165% at the peak, measured 128 to 149% and 147 to 166%; 40 on 12 Nov). The Soul multiplier has no slope: 1.55 × the Level term |
| A feeling in one Outburst | As many times as you like | **Once each** |
| Rage | +0.5, 1 Strain | +0.5, 1 Strain (now 2.5 plain Pumps' worth) |
| Shame | +0.6, 5 HP | +0.5, 8 HP |
| Abandon | +0.8, 2 Strain | +0.8, 2 Strain, once |
| Calm | Can't miss, free | Rolls twice, keeps the better, no critical, **−0.4** |
| Relief | Removes Strain, +0.2 | Removes 2 Strain, **−0.2** |
| New jobs | Grief Slows, Fear pushes, Joy chains, Hope +2, Guilt heals, Longing pulls | Grief +0.5 once an ally has fallen, Fear throws you back 2, Joy crits on 18 to 20, Hope cleanses, Guilt Taunts, Longing reach only |
| Free stages | Several sources stacked (stage 4 every turn at Soul 10) | **One free stage a turn** from any source; Empathy 7 swells without Strain instead |
| Schools | Damage or heal, the stage ignored by Control, Status, Buff | They read the stage; Damage: **Strike, Finish, Brand, Drain**; Control: Swap; Status: Silenced |
| Modules | Impact | Retired (it did nothing); At Once, Return, Shell, Inverse, Quiet re-stepped |
| Same school twice | | Defined, **locked** for an advanced class |
| Pump price | 1 AP | 1 AP (measured against three alternatives) |

Detail: `damage-step-magic.md`, `outburst-rework-2.md`.

## 6. Healing and shields (rules 1.20, 1.23, 1.27)

| | Live | This patch |
| --- | --- | --- |
| Size | 3 to 7 Soldier-turns for a healer's turn at level 1; flat with level | About **1.25 Soldier-turns** for a healer's turn at every level |
| Level | Heals did not grow | A **level factor** (the enemy damage column) |
| Area heal | Every ally in full | Each ally ×0.4 |
| Love, Inverse, Shell | Shares of damage | Their own bases |
| Round limit | | None (a half-max-HP limit was built in 1.20 and is **withdrawn**: Leon) |
| Medic's kit, Triage, stims | Triage 20, stim 30, Rally 20, flat | Triage 5, stim 6, Rally 6, × Healing given × the level factor |
| **Rules 1.26, the re-fit** | | A healer's turn **all in** on 1.25 Soldier-turns (146 / 132 / 122 / 99% measured at levels 1, 5, 10, 20), a normal share about 1.0: Healing given 0.87 × (1 + 0.06 per point of Insight over 1 and of Empathy). Inverse and Shell read a landed Soul Stat (`soul_mend`) |
| **Rules 1.27, the heal re-fit** (Leon on 0.23.0: "we might have over-nerfed the healing") | | A healer's turn **all in** on **2.0 Soldier-turns** (234 / 211 / 195 / 158%), a normal share about 1.6: every heal and shield ×1.6 by its dial (Healing given 1.392 ×, the Soul shields 1.296 ×, the Sigil boon 1.17 ×; Faith ×1.51, capped where a Hymn turn heals 2.5 Soldier-turns). The medic's kit ×1.6 through Healing given. A Recruit with no Soul skill: a stage-4 Mend heals 15 at level 1 (it was 9; 6 at stage 1). A heal by a caster with no points in its skill is never under half of a normal share's (a floor; it binds nowhere today). Enemy healers unchanged |

| **Rules 1.36 (Classes 3.0 step 7b): heals and shields in percent of HP** | | Balanced in percent of the reference character's HP a whole turn, all in: the Mender 65, an off-heal (Buff, MEND) 45, a Whisper 15, a Hymn's turn 65 at most; **a gate** (every 2-AP heal or shield at least 20% of its target, counted to 145 × scale; Whisper 13.3%, Hymn and intervention 33.3%), **a cap** (no single heal over half the target's bar); a stim 20% of the target; Faith's shield the strongest (Sanctuary's pool 40); the Recruit's quick heal 25 (it was 9) |
| **Rules 1.36: the level scale** | A hit grew ×1.6 over a career (40 at level 1, 64 at 20); HP ×3 | A plain hit grows **×7.5** (40 at level 1, 60 / 103 / 299 at 5 / 10 / 20); **everything measured in HP grows with it** (max HP 145 / 233 / 441 / 2,086 for the reference rifleman; a Soldier 1,188 HP at 20, a Boss 6,957); every ratio, to-hit, Defense, MP unchanged; level 1 identical |

Detail: `heal-shield-pass.md`, `defence-step.md`, `classes-3.0-step-7b.md`.

## 7. Faith (rules 1.21, 1.22)

| | Live | This patch |
| --- | --- | --- |
| Prayer as a way to fight | Two patrons with a damage Hymn, 84 to 116% from Devotion 5; six at 15 to 53% | A Whisper turn about **74%**, a Hymn turn about **150%** (Leon: raised from 125%) |
| Whispers | Six, none hurts | Seven: **Rebuke** hurts |
| Hymn cooldown | 1 round from Virtue 4 and Faith 3 (every turn) | **9 − 0.75 × Faith − 0.25 × Virtue rounds, never under 3** (2 with a vow or True Believer); the rest is for Faith items |
| Vows | Kept at the end of a fight | **A vow fulfilled in a fight takes 1 round off the Hymn cooldown**; each of the six vows has a moment the engine sees |
| Thunderclap, Lightning Rod, Judgement, The Saints' Verdict | | Deal damage / more damage |
| Cut Short | Could lock one enemy out all fight | Not the same enemy two rounds running |
| Hold the Gate | Any Hymn turn | Its own 6-round cooldown |
| Witnessed, Old Overcast | +2 to hit on every attack | +2 on the next attack after a kill made while Witnessed |
| Prayer heals | Flat: Warm Hands 40, Saint's Shield 40, Absolution 30, Health 15 (× Blessing power) | Level factor; Warm Hands 13, Saint's Shield 16, Absolution 9 |
| **Blessing power (rules 1.26)** | 1 + 0.1 × Faith | 0.956 × (1 + 0.06 per point of Virtue over 1 and of Faith): Virtue counts. All in: a Hymn turn 124 / 95 / 157 / 167%, a Whisper turn 98 / 71 / 57 / 98% at levels 1, 5, 10, 20 |

Detail: `faith-fit.md`, `faith-round-2.md`.

## 7b. MP (rules 1.24)

| | Live | This patch |
| --- | --- | --- |
| Max MP | 100 + 100 × (Virtue − 1) | **100 + 75 × (Determination − 1) + 25 × (Insight − 1)**; Virtue gives none |
| A Pump | 1 AP, no MP | 1 AP and **10% of the Begin's MP × the stage reached** (a full heart costs the Begin twice over) |
| The reference caster's pool | 300 at every level (Virtue 3) | 400 at level 1 to 900 at level 20 |
| Archetypes | Casters carried Virtue for MP | Seven re-spread (Stormcaller, Mender, Troubadour, Heartreader, Unbroken, Zealot, Prophet) |
| Old saves | | Migrated: an Emanator keeps its share of the pool |

Detail: `mp-rework.md`. Open: Virtue is thin now (the caps on its skills, the Guardian, a quarter-round off the Hymn
wait); a Guardian's Will Shield and Sanctuary sit on 100 MP.

## 8. The screen, effects and tools

| | Live | This patch |
| --- | --- | --- |
| Hotkeys | A number switches tab | **Two-key codes**: 11 move, 42 Evoke; each button shows its code |
| Effect testing room | | In the Proving Ground: a dummy with 9,999 HP, your AP back after every action |
| A fight's last blow | Skipped its animation | Plays |
| Next wave | Could play no enemy effects, your-turn card early | Plays in full; the card waits |
| Enemy portraits | Could change mid-fight | Kept once given |
| Thumper Suppress | Drew bullets | Draws what the weapon fires |
| Lob | Went off before it landed | Blast, damage and HP wait for the landing |
| Suppress | Sound and damage before the shots | Rattle with the first flash, damage with the last round |
| Area preview | Marked and named enemies in the fog | Only what you can see |
| The fight log (co-op, team fights) | Every player read every line, so a line named and placed hostiles they had never seen ("Drill drone 3 moves to N10") | Each player reads only the lines about what their side saw when it happened; a line that hits you from the fog reads "Something unseen shoots Cy from somewhere unseen" (spec item 1600 a) |
| A drawn glyph | Could vanish before its Evoke played | Stays until the effect that removes it has played |
| Opportunity attack | The step out played before the blow | The blow, then the step, if the mover still stands |
| Tests | | `fx-sweep`: every weapon × technique (2,022 cases) |

Detail: `BUGLIST-0.22.md`.

## 9. Under the hood

- The fight simulator and reference builds (`packages/engine/test/balance/`), with a measurement for guns, magic, the
  Outburst, healing and Faith.
- 19 perks and traits moved from the Narrator to the engine.
- Spec section 14: items 1015 to 1088, 1200 to 1222, 1230 to 1247, 1260 to 1274, and what 1.22 and 1.23 add.

## 10. What has no ceiling yet (asked by Leon, 12 Nov)

Fitted = measured and brought to a target. Everything is measured on **one target that never acts**, which is why the
second and third groups exist.

**Fitted:** the plain rifle (the 100% line); guns on one target (rules 1.18); Sigil damage (1.17); Outburst damage
(1.17, 1.19, base 40); magic heals and shields (1.20); enemies by tier and level (1.15). Since fitted (12 Nov): Faith (1.22 and 1.26), the
medic's kit and Boss HP (1.23).

**Measured, not fitted (inside the ceiling, so left):** the optimised blade (112 to 126%; 109 to 142% holding its
Finisher); a gun in each hand (123 to 144%).

**Measured and over every ceiling, undecided:** the all-in 7/1/1 builds (gun 148 to 228%, Outburst 190 to 270%, Sigil
142 to 205% of the normal-share rifle). Leon's answer is wanted: is the ceiling for a normal share only.

**Rules 1.26 (the re-fit, `balance-refit.md` section 5):** row 1 (many targets) measured: the cluster, a per-extra-target
rule, grenades fitted (×0.7); row 2 (melee beyond one build) and row 4 (mana arms) measured, inside their ceilings;
row 3 (thrown) fitted; row 9 (control) has its yardstick and a condition table (arithmetic, not played); row 15
(Elites by damage type) measured, not fitted. The rest below is still unmeasured.

**Never measured:**

| # | System | What is in the game | Why it matters |
| --- | --- | --- | --- |
| 1 | Area and many targets | Blast, Spread, cones, the thumper, breacher tube, flamer, satchel charge, grenades; Sigil Burst and Filter words; Outburst Wave, Burst, Aura; Bloom, Split, Swift (flagged strong) | A blast on four enemies is four hits; none of the ceilings count it |
| 2 | Melee beyond one blade build | 7 heavy, 6 light, the lance and glaive (Reach), 4 unarmed (fists to the servo fist), the Bare vow | Only "optimised blade" was run |
| 3 | Thrown | Frag, incendiary, flashbang, smoke, bot scrambler, knives, hatchet | Not in any build |
| 4 | Mana arms | Spellslinger pistol, Evoker blade, Emanator gauntlet, censer gun, banner, grand staff (the core rifle is fitted) | They ride on casters whose spells were fitted without them |
| 5 | Class moves | 9 classes, two moves a rank, three ranks | The builds carry a class, but no move was measured or given a ceiling |
| 6 | Perks, Mastered perks, traits | 76 perks, 27 Mastered, 74 traits | Guns: "perks add no gun damage" was checked; nothing else |
| 7 | Weapon mastery and drill | 33 mastery items in 11 families | Inside the gun runs only as Masterwork (×1.25, left alone) |
| 8 | Special rounds and mods | 4 ammunition types, 13 weapon mods | Not measured; "with the armour step" |
| 9 | Control and conditions | 40 conditions; lost turns, Slows, Marks, Taunts; damage over time (bleed, burn, corrode); Sigil fields, traps, turrets, walls; Outburst Control and Status | No yardstick yet for a turn taken away (Cut Short could lock an enemy out all fight) |
| 10 | Calls | 9 Calls; a Calls leader build exists in the simulator | Support worth is an estimate, as for the six support patrons |
| 11 | Squad multipliers | Resonance, Feed the Fire (+2 AP), Foreknowing, Marks, buffs between characters | The simulator plays one character at a time for damage |
| 12 | Reactions and held actions | Overwatch, held shots, Heart Overwatch, opportunity attacks, Watches | Damage outside your own turn is in no total |
| 13 | Stealth openers and decoys | Hidden attacks (Infiltrator), False Image (Trickster) | Not measured |
| 14 | Defence | 16 armours, 3 shields, cover, Guard, the Tank build | Armour is a planned system; the defence step (1.23) fits Boss HP and healing only |
| 15 | Elites and Bosses by damage type | Soul and lightning ignore armour, Elemental half | Faith and Raw Outbursts are worth more there than the range shows |
| 16 | Enemy casters and the enemy Burst | Untouched on purpose | They keep pre-1.17 numbers and the old three-roll Burst |
| 17 | Overdraw, Heart Overload, Miracles, interventions | Peaks with a price | Left for the playtest; a Miracle is allowed over every ceiling |
| 18 | Consumables and the rest | Stims (in the medic pass), the companion, the augment, hazards and traps on the map | Not measured |

**Order suggested:** 1 (many targets) first, because it changes every other number; then 9 (a yardstick for control),
5 (class moves), 2 to 4 (the weapons left out), 6 to 8, and the rest with Weapon Arts and armour.

## 11. Bugs found by the audits and fixed (Leon, 12 Nov: "autofix everything you consider bug and add to the tally")

| Bug | On live | State |
| --- | --- | --- |
| An enemy 13 or 14 tiles off with a long gun never moved or fired | Hidden by the small maps | Fixed |
| A drawn glyph vanished before its Evoke played | Yes | Fixed |
| Edge Word triggered on an opportunity attack | Yes | Fixed |
| The step out played before the opportunity attack that interrupted it | Yes | Fixed |
| The longbow deals a flat 20 (its formula is text the engine doesn't read) | Yes | Fixed |
| An enemy's blast splash ignores its tier and level | Yes | Fixed |
| The generic heal effect ignores its scale | Yes | Fixed |
| An enemy technique (most Bursts) goes at the first character in the list, not the chosen target | Yes | Fixed |
| A shield stops a bullet or a spell but not a grenade, a trap or a hazard | Yes | Fixed (ruled: it stops them; damage over time and true damage go past) |
| The Elite and Boss guard covered Sigil only | New in this patch | On every action now (Miracles exempt) |
| Card texts with old numbers (the Outburst base, Triage, Stim Throw, Rally) | New in this patch | Fixed |
| The Narrator prompt 45 tokens over its cap | New in this patch | Fixed |

## 11b. Live column: what was not verified (12 Nov 2026)

- Every "% of the plain rifle" figure in the Live columns (guns 204 to 221%, Sigil 78 to 119%, Outburst 61 to 143%,
  Faith 84 to 116% and 15 to 53%, healing 3 to 7 Soldier-turns): measurements from the simulator on the 0.22.0 rules,
  not fields in the code. Not re-measured.
- "To hit at equal level: not fitted" and "Elites and Bosses could be one-shot by a big level gap": a description of
  0.22.0 behaviour, not a data field (live has no level gap rule or table); not checked.
- "AP perks usable every turn": confirmed only by the absence of any cooldown field on `origin/main`.
- "Witnessed, Old Overcast: +2 to hit on every attack": on live the +2 applies to an attack carrying a tag the patron
  likes, and a patron that likes `kill` gets it on every attack (`faith.ts likedAttack`); the row is right for Old
  Overcast only if its likes include `kill`. Not checked patron by patron.
- Hymn damage rows ("two patrons with a damage Hymn"), Cut Short, Hold the Gate, Lightning Rod, Judgement and the
  Saints' Verdict: texts read, behaviours not run.
- Section 8's visual rows (a fight's last blow, the next wave, portraits, Suppress and Lob timing, area preview in the
  fog, the opportunity attack order, a vanishing glyph): bugs Leon saw on live (`BUGLIST-0.22.md`); the code on
  `origin/main` was not run.
- Section 2, the Proving Ground's ground: live campaigns are 16 × 11 (`data/campaigns/*.json`); the bug list reports
  16 × 12 in the Proving Ground.
- Verified exact on `origin/main`: weapon damages (section 3), SMG family, Heavy Bolt +50%, Mag Dump 4 rolls, long
  rifle Shot 2 / Aimed 3, Burst 3 rolls, MEND 25 / WARD 30, the 350 / 500 Sigil clamp, Outburst base 20 and stage
  table 0.8 / 1 / 1.4 / 1.8 / 2.2, feeling steps (Rage 0.5, Shame 0.6, Abandon 0.8, Relief 0.2) and their jobs,
  Max MP 100 + 100 × (Virtue − 1), the prayer cooldown `max(1, 4 − 0.5 × (Virtue − 1) − 0.5 × Faith)`, six Whispers,
  Triage 20, stim 30, Rally 20, frag 40, tiers (no Vermin), number-key hotkeys.

## Where it stands (12 Nov, at the close)

- Rules 1.15 to 1.26 are built and merged on this branch; the re-fit (1.26) and its guard are in `npm run check`.
- Merged since the first draft of this tally: the engine foundation (one damage formula, saves, forced movement,
  costs and counters, conditions from data, fog in the engine including the fight log, action descriptors, item ops
  first pass), the 77 artist icons shown, painted icons tinted, the eight failing browser suites.
- Not done: the final `npm run check` and `npm run e2e -- all` on the merged tree on a quiet machine, a playtest of
  any of it (`docs/PLAYTEST-CHECKLIST.md`), Leon's word. **Nothing here is live.**
