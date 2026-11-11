# The Outburst rework, round 2 (rules 1.19)

11 Nov 2026. For Leon and whoever picks Soul magic up next. The rules are in `docs/rules/PHC-Core-Rules-v1.0.md`
("Rules revision 1.19", section 14 items 1200 to 1221). This is what was asked, what was built, what was measured,
what is not met, and what only Leon can settle. **Nothing here is committed by this session; nothing was built with
`npm run build`, deployed or run in a browser.** Sigil was not touched.

## 1. What Leon asked, and where it stands

| Asked (Leon, 11 Nov 2026) | Built | Met? |
|---|---|---|
| "Normal pump need to go down so the number dif from the emotion feel worth" | A plain Pump is **+0.2** (it was +0.4): ×0.8, ×1.0, ×1.2, ×1.4, ×1.6. Rage is +0.5: two and a half plain Pumps (it was 1.75) | Yes |
| "reconsider some effect of emotion, does it does something the outburst school already did" | All 25 audited against the schools, modules and elements. **Six got a new job** (Grief, Fear, Joy, Hope, Guilt, and Longing lost its pull); **four overlaps are kept on purpose**, each with its reason (Love, Cruelty, Longing's reach, Relief) | Yes |
| "effect like relief is busted and make rage rage rage relief the go to" | **Each feeling goes into an Outburst once**, so that line can't be poured. Relief steps **−0.2** and takes 2 Strain off | Yes. In rules 1.17 one set of four was the best in all four situations measured; now the best four differ in each (section 6) |
| "Cant miss too, busted" | Calm no longer lands by itself. It **rolls twice and keeps the better**, at **−0.4**, and can't be a critical. It pays under about a 60% chance to hit, and nowhere else | Yes |
| "Some busted effect need to lower multipier instead of increase" | Calm −0.4, Relief −0.2, Awe +0; Defiance and Cruelty at a plain Pump's +0.2 | Yes |
| "consider is 1 AP for pumps the right balance" | Measured against three other prices. **1 AP stays** (section 4) | Answered |
| "A full 10 soul character also start with like 3 free pumb ... swell barely matter" | **One free Pump a turn**, whatever gives it. Empathy 7 now makes a held Outburst swell without Strain. Shape reworked. A stage 4 with four feelings costs the whole turn | Yes for stage 4 in one turn (5.8 AP of 6 for a steady Release at level 20; it was 4.1, and 3.5 all in). See section 8 for what is left |
| "Ob school is also weak, too litte effect to choose" | Every school reads the stage now (Control, Status and the two Buff boons did not). The Damage school has **four ways to strike**; Control can **Swap**; Status can **Silence** | Built. Not playtested |
| "2 same school stack ... advance class feature so ready for it" | Defined per school, carried by the engine and the data, **shelved**: nobody can build one (a test holds that) | Yes |
| Targets stay: steady about 125%, the biggest Release about 150% | Damage base 28 → **36** (enemy casters 18 → 24) | Steady: 113% (a new caster) and 126% (a seasoned one) at levels 3 and 6. The biggest Release: 138 to 165% from level 6. Details and misses in sections 7 and 8 |

## 2. How it is measured

`packages/engine/test/balance/outburst-measure.test.ts` (new). It uses the 1.17 tool's own `pattern` and `rifle`
(`magic-measure.ts`): the shooting range, a target with a Soldier's numbers that never acts, 8 turns, 12 fights a cell.

```
OUTBURST_MEASURE=1 npx vitest run --root packages/engine test/balance/outburst-measure.test.ts --silent=false
    OUTBURST_MEASURE_PARTS=sheets,rows,seq,ap   OUTBURST_MEASURE_LEVELS=6,20   OUTBURST_MEASURE_N=12
```

1. **Before and after are measured against the same rifle.** The other agent was changing guns in the same tree, so
   both runs were made on copies: the tree as it was this morning (commit `55b00ac`), and that tree with only this
   work's files laid over it. The rifle is the 1.17 yardstick in both: 72.6 / 84.5 / 97.6 / 107.9 / 105.4 / 120.1 a
   turn at levels 1, 3, 6, 9, 12, 20. If rules 1.18 moves the plain rifle, every percent here moves with it.
2. **The policy** (`policies.ts`) was taught the new rules: each feeling once; one free Pump a turn; Calm's two rolls
   and Joy's wider critical in what a Pump is worth; Pride's Strain. Steady play still takes, for each Pump, the feeling
   that adds most among those the heart can pay for. Three things it will not do: pour a feeling that costs more than 1
   Strain in steady play (Abandon; Pride with no kill in sight); pour Fear without an enemy next to it (it throws the
   caster out of reach); play Relief at all.
3. **The best four** (section 6) is not a simulation: every set of four feelings (12,650 legal ones now; 20,150 in
   rules 1.17) is put into a held stage-4 Outburst and the engine's own preview is asked what it expects (damage after
   armour × the chance to land).
4. **Noise.** Twelve fights move a steady row about 10% either way (see level 9 against level 12 in section 7). The
   biggest Release is one roll that lands 65% of the time: it is measured over 120 fights here (36 in the 1.17 report)
   and still moves about 7%.
5. **What the range does not see.** One target that never acts: nothing a feeling *does* has a value (a Taunt, AP
   lost, a heal, a cleanse), nor a shape on a group, a second school, the stage riders of Control and Status, or being
   shot at while holding. **Labelled estimates** are marked as such below; everything else is measured.

## 3. The 25 feelings

The price rule: **1 Strain or 8 HP buys +0.3 above a plain Pump**; a feeling that changes the Release steps **+0.3**;
a strong one steps **+0.2, +0 or below 0**. Each goes into an Outburst once.

| # | Feeling | Step, rules 1.17 | Step now | Cost | What it does now | It overlapped | Why |
|---|---|---|---|---|---|---|---|
| 1 | Rage | +0.7 | **+0.5** | 1 Strain | buys the multiplier | nothing | the yardstick |
| 2 | Grief | +0.4 | **+0.2; +0.5 once an ally has gone Down or died this fight** | none | reads the fight | Slowed: Control, Frost | new job: the feeling of a fight going wrong |
| 3 | Fear | +0.4 | **+0.3** | none | throws **you** 2 tiles back from where you aimed; nobody reacts | push 1 and Shaken: Control, Gale, Status | new job: the only thing in Soul magic that moves the caster |
| 4 | Love | +0.4 | **+0.3** | none | allies in the shape spared and healed ×0.35; with none in it the most wounded ally in reach, or you, ×0.2 | a heal: Buff | kept on purpose: the only way a harmful shape spares friends; the heal is a share of the damage |
| 5 | Joy | +0.4 | **+0.3** | none | a Bolt or Lance is a critical on 18 to 20 | a chain: Storm, Split | new job: the gamble, Calm's opposite |
| 6 | Calm | +0.4, Release ×0.75 | **−0.4** | the multiplier | rolls twice, keeps the better; no critical | no miss, no cover: At Once, Homing | narrowed and priced (below) |
| 7 | Spite | +0.4; +0.6 | **+0.2; +0.5 against whoever last hurt you** | none | | nothing | |
| 8 | Shame | +0.7 | **+0.5** | 8 HP at the Release | buys the multiplier | nothing | the yardstick, in HP |
| 9 | Pride | +0.4; +0.5 at stage 4 | **+0.6** | 2 Strain after the Release unless it took somebody down | the finisher | nothing | it was a plain Pump |
| 10 | Despair | +0.4 to +0.8 | **+0.2 to +0.6** (+0.1 per 20% HP missing) | none | | nothing | |
| 11 | Hope | +0.4 | **+0.3** | none | you and each ally in the shape shake off one harmful condition | +2 to a roll: Buff's Inspired | new job: the only cleanse in Soul magic |
| 12 | Mercy | +0.4 | **+0.3** | none | Downs, never kills; surrender at a quarter HP (Heart save) | nothing | |
| 13 | Cruelty | +0.4 | **+0.2** | none | Bleed (no save), spreading to one next to each | damage over time: Fire, Acid | kept on purpose: the only wound a Raw Outburst leaves; the Bleed is damage on top |
| 14 | Loneliness | +0.4; +0.5 | **+0.2; +0.4 with no ally within 3** | none | | nothing | |
| 15 | Belonging | +0.4 to +0.7 | **+0.2 to +0.5** (+0.1 an ally within 3) | none | counts twice for allies' Resonance | nothing | |
| 16 | Dread | +0.4 | **+0.3** | none | targets lose their reactions and held shot | nothing | |
| 17 | Awe | +0.4 | **+0** | the step | targets hit lose 1 AP next turn (no save) | nothing | strong: no save, every target |
| 18 | Longing | +0.4 | **+0.3** | none | +2 reach; the pull is gone | pull: Lure, Control. Reach: Move | reach kept on purpose: Move takes a slot for good |
| 19 | Relief | +0.2 | **−0.2** | the multiplier | 2 Strain off you at the Release | Quiet halves a hold's Strain | kept on purpose: Quiet is built into a design, Relief is a choice in the moment |
| 20 | Contempt | +0.4 | **+0.3** | none | targets hit −2 to attack you, 2 rounds | nothing | |
| 21 | Guilt | +0.4, 5 HP | **+0.3** | none | targets hit are Taunted (Heart save): their next attack is at you | a heal: Buff, Love | new job: drawing fire, Contempt's opposite |
| 22 | Jealousy | +0.4 | **+0.3** | none | steals a helpful condition or the shield | nothing | |
| 23 | Wonder | +0.4 | **+0.3** | none | reveals what is Hidden in its area | nothing | |
| 24 | Defiance | +0.4 | **+0.2** | none | saves against the Release are 4 harder; your next save passes | nothing | strong: it was no save at all |
| 25 | Abandon | +1.0 | **+0.8** | 2 Strain | the biggest step | nothing | |

**Calm, in numbers** (arithmetic, from the multipliers; a Release of Rage and two +0.3 feelings, the fourth Pump Calm
or plain): at a 40% chance to hit Calm is worth +14%, at 50% +7%, at 65% −4%, at 85% −18%. In rules 1.17 it was worth
+11% at 65% and took the miss away outright.

**Relief, in numbers:** Abandon (+0.8, 2 Strain) and Relief (−0.2, −2 Strain) together are +0.6 for no Strain: the
same as two +0.3 feelings. Rage and Relief are +0.3 and 1 Strain *off*. So Relief buys nothing for free; it is how a
full heart keeps casting.

**Residue is unchanged** (rules 1.8), so Grief's residue still Slows and Fear's still Shakes: that is what the feeling
leaves on the ground. Say if the residue should follow the new jobs.

## 4. Is 1 AP the right price for a Pump?

Yes, once the free Pumps are capped and each feeling goes in once. Measured on the finished rules (steady play with
the early feelings · the biggest Release; percent of the rifle; these runs use other seeds than section 7's, so read
down the columns, not across the sections):

| Price of a Pump | Level 6 | Level 20 | Level 6, all in | Level 20, all in |
|---|---|---|---|---|
| **1 AP (built)** | 131% · 138% | 127% · 160% | 173% · 202% | 137% · 170% |
| 1 AP, then 2 AP for every paid Pump after the second of a turn | 108% · 132% | 126% · 156% | 180% · 214% | 143% · 168% |
| 2 AP | 84% · 122% | 128% · 72% | 154% · 189% | 134% · 82% |
| a feeling Pump costs 1 AP more than a plain one | 115% · 122% | 101% · 69% | 159% · 192% | 107% · 72% |

1. **"The third Pump costs 2"** takes 18% from the level 6 caster and nothing from anyone else: it taxes the caster
   with no perks, which is the wrong one.
2. **2 AP** puts the level 6 caster under the rifle (84%) and makes the biggest Release a 9 AP cast at level 20.
3. **Feelings cost more** makes a feeling the thing you can't afford: steady play falls 12 to 22%, and the biggest
   Release is 11 AP at level 20.
4. What 1 AP costs now: Begin 2, one free Pump, three paid, Release 1: **the whole turn** for stage 4 with four
   feelings. Keep 2 AP to move and it is stage 2 this turn, and the swell gives the third stage next turn. That is the
   build-up, without a dearer Pump.

The two dearer prices that can be told apart are data switches, off: `cycle.pump_ap_after_second`,
`cycle.feeling_pump_ap_extra` (`soul_modules.json`).

## 5. The free Pumps of a high-Soul character

**What gave stages for nothing** (found in `character.ts`, `magic.ts`, `classes/i.ts`, `classes/k.ts`, `perks/d.ts`,
`perks/skills.ts`):

| Source | It gave | Now |
|---|---|---|
| The fight's first Pump (rules 1.8) | 1 stage, once a fight | the same; it is that turn's free Pump |
| Empathy 3 | 1 free Pump a round | the same |
| Empathy 7 | a second free Pump a round | **gone. From Empathy 7 a held Outburst swells without Strain** |
| Shape (Channeler I) | one more free Pump a turn on a Damage design, on top of Empathy's | **the free Pump on a Damage design even without Empathy 3 (still one a turn); the turn's free Pump steps +0.1 more** |
| Overdraw (Will Power 3) | a second stage on one Pump a turn; no Strain the first time in a fight, 1 after | unchanged. Its second stage is plain: worth +0.2 now (it was +0.4) |
| Heart Overload (perk) | a free Begin after a Release at stage 2+, once a turn; at tier II it held at stage 1 | the free Begin is unchanged; **tier II's stage 1 is the turn's free stage: taken already, it holds at stage 0** |
| Heart Surge (Channeler III) | the Release a stage higher, for the Begin's Strain again | unchanged (past stage 4: ×1.8) |
| The Twin Pays (Will Power Mastered) | once a fight a Begin for no AP, MP or Strain | unchanged (it gives no stage) |
| Shelved: Feed a feeling, Overflow (Heartfed), Love Made Manifest (Devoted) | free Pumps; a Begin at stage 2 or 4 | a fed Pump is under the cap; the other two are to be looked at when the classes return |

**As it stood:** a Channeler with Empathy 7 and Will Power 3 pumped twice on Empathy, once on Shape, and put Overdraw
on one of them: stage 4 for the Begin and the Release, 3 AP, every turn.

**The fix: a character takes one free stage a turn at most, whatever gives it.** Enemy casters are not bound by it
(their stat blocks were fitted with their free Pumps). In the measurements a steady Release costs 5.5 to 5.8 AP at
every level (it was 4.1 at level 20, and 3.5 for the all-in caster).

**Why Empathy 7 makes the swell free of Strain:** you said the swell barely matters to these characters. With one free
Pump a turn the cheap way to a big Outburst is to hold it over the turn; at Empathy 7 that costs no Strain. A held
heart that only waits is then −1 Strain a turn, still less than a turn of stillness (−2), so "holding is not
stillness" stands.

## 6. Is there a best four?

The engine's preview, level 6, normal share, a 65% chance to hit; every legal set of four.

**Rules 1.17 (before):**

| The moment | The biggest hit | Kept up every turn (1 Strain) | Costing nothing |
|---|---|---|---|
| alone, unhurt | **Rage ×2, Calm, Abandon** (139) | Rage, Calm, Pride ×2 (112) | Calm, Pride ×3 (104) |
| two allies near | **Rage ×2, Calm, Abandon** (139) | Rage, Calm, Belonging ×2 (120) | Calm, Belonging ×3 (116) |
| alone, 40% HP, aiming at whoever hurt you | **Rage ×2, Calm, Abandon** (139) | Rage, Calm, Despair ×2 (128) | Calm, Despair ×3 (128) |
| a squad with an ally Down | **Rage ×2, Calm, Abandon** (139) | Rage, Calm, Pride ×2 (112) | Calm, Pride ×3 (104) |

Calm was in every one of the six best sets in every row. Rage ×4 was 121; four plain Pumps 81.

**Rules 1.19 (now):**

| The moment | The biggest hit | Kept up every turn (1 Strain) | Costing nothing |
|---|---|---|---|
| alone, unhurt | Rage, Shame, Pride, Abandon (138; 5 Strain, 8 HP) | Rage, Loneliness and any two of the +0.3 feelings (99) | Loneliness and any three (90) |
| two allies near | Rage, Shame, Pride, Abandon (138) | Rage, Belonging and any two (99) | Belonging and any three (90) |
| alone, 40% HP, aiming at whoever hurt you | Rage, Spite, Pride, Abandon (138) | Rage, Spite, Despair, Loneliness (116) | Spite, Despair, Loneliness and any one (108) |
| a squad with an ally Down | Rage, Grief, Pride, Abandon (138) | Rage, Grief and any two (103) | Grief and any three (95) |

1. The biggest hit is the same size as before (138 against 139 expected) and costs more: 5 Strain and 8 HP for the
   first row (4 Strain before), and 6 AP in place of 4.
2. Rage, Pride and Abandon are in every "biggest hit": they are the three that buy the multiplier with Strain, and
   pouring all of them *is* the biggest hit. They are not the go-to: 5 Strain is more than half of a Will Power 10
   heart, and Pride's 2 Strain is forgiven only when the Release takes somebody down.
3. The best set with Calm is second to seventh (134); the best with Relief is past the 650th. Four plain Pumps: 69.
4. "Any two of the +0.3 feelings" is the point: eleven feelings are equal on the multiplier, so those places are
   chosen for what they do. The range gives that no value (section 2.5).
5. Joy's wider critical is not in these numbers (the preview gives an expected hit without criticals): about +5% on a
   Release that holds it. **Estimate.**

## 7. Before and after, by level

Percent of the plain rifle over the same turns. Each cell: damage of one Release (misses counted) · turns · AP ·
Strain added · **percent**. Before is rules 1.17, measured again with this tool on this morning's tree.

### 7.1 A new caster (Rage and Love), normal share

| | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| before | 68 · 1 t · 5.5 AP · S1.4 · **94%** | 97 · 1 t · 5.5 AP · S1.4 · **115%** | 112 · 1 t · 4.9 AP · S1.6 · **115%** | 104 · 0.89 t · 4.4 AP · S1.6 · **109%** | 131 · 0.89 t · 4.4 AP · S1.7 · **140%** | 124 · 0.8 t · 4.1 AP · S1.5 · **129%** |
| now | 70 · 1 t · 5.5 AP · S1.3 · **96%** | 96 · 1 t · 5.5 AP · S1.3 · **113%** | 108 · 1 t · 5.8 AP · S1.4 · **110%** | 110 · 1 t · 5.6 AP · S1.5 · **102%** | 146 · 1 t · 5.6 AP · S1.6 · **138%** | 142 · 1 t · 5.8 AP · S1.8 · **119%** |

### 7.2 A seasoned caster (Rage, Love, Calm, Spite, Joy, Shame, Fear, Grief), normal share

| | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| before | 87 · 1.14 t · 5.7 AP · S1.4 · **105%** | 107 · 1 t · 5.5 AP · S1.4 · **127%** | 123 · 1 t · 4.9 AP · S1.6 · **126%** | 124 · 0.89 t · 4.4 AP · S1.6 · **129%** | 146 · 0.89 t · 4.4 AP · S1.7 · **156%** | 149 · 0.8 t · 4.1 AP · S1.5 · **155%** |
| now | 87 · 1 t · 5.5 AP · S1.3 · **120%** | 107 · 1 t · 5.5 AP · S1.3 · **126%** | 123 · 1 t · 5.8 AP · S1.4 · **126%** | 118 · 1 t · 5.6 AP · S1.5 · **109%** | 162 · 1 t · 5.6 AP · S1.6 · **154%** | 155 · 1 t · 5.8 AP · S1.8 · **129%** |

With all 25 feelings felt: before 115 / 139 / 137 / 140 / 170 / 167%; now 118 / 122 / 133 / 129 / 147 / 156%.

### 7.3 The Soul 10 caster, all in (Will Power 10 from level 9; Empathy 0 until level 20, where it is 8)

Against the normal-share rifle; in brackets against its own share's rifle (141.5 / 123.2 / 123.1 a turn at levels 9,
12, 20).

| | Level 9 | Level 12 | Level 20 |
|---|---|---|---|
| steady, the early feelings, before | 177 · 1.14 t · 6.7 AP · **144%** (110%) | 166 · 1 t · 5.9 AP · **158%** (135%) | 153 · 0.8 t · 3.5 AP · **160%** (156%) |
| steady, the early feelings, now | 191 · 1.14 t · 6.6 AP · **155%** (118%) | 189 · 1 t · 5.8 AP · **179%** (153%) | 168 · 1 t · 5.8 AP · **140%** (137%) |
| steady, a new caster's two feelings, before | **139%** | **147%** | **136%** |
| steady, a new caster's two feelings, now | **138%** | **145%** | **124%** |
| the biggest Release, before | 205 · 5 AP · **190%** | 203 · 5 AP · **193%** | 190 · 5 AP · **158%** |
| the biggest Release, now (over two turns) | 222 · 5 AP · **205%** | 215 · 5 AP · **204%** | 206 · 5 AP · **172%** |

All in at levels 1, 3 and 6 (steady, the early feelings): before 169 / 202 / 188%, now 181 / 230 / 202%.

### 7.4 The biggest Release and plain Pumps, normal share

| | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| the biggest Release, before | 68 · 4 AP · S2.5 · **93%** over two turns | 99 · 4 AP · S3.5 · **117%** over two turns | 144 · 4 AP · S5 · **148%** | 156 · 4 AP · S5 · **145%** | 178 · 4 AP · S5 · **169%** | 190 · 5 AP · S8 · **158%** |
| the biggest Release, now (over two turns) | 104 · 5 AP · S6 · **72%** | 84 · 4 AP · S3 · **99%** | 134 · 5 AP · S4.5 · **138%** | 157 · 4.5 AP · S4.5 · **145%** | 174 · 4.5 AP · S4.5 · **165%** | 186 · 5 AP · S5 · **155%** |
| stage 4, plain Pumps, before | **83%** | **87%** | **99%** | **107%** | **149%** | **181%** |
| stage 4, plain Pumps, now | **71%** | **79%** | **79%** | **77%** | **97%** | **110%** |
| stage 2, plain Pumps, before | **82%** | **80%** | **100%** | **100%** | **151%** | **152%** |
| stage 2, plain Pumps, now | **79%** | **81%** | **105%** | **85%** | **107%** | **112%** |

Reading notes. (a) "Over two turns": the reference caster steps into reach on turn 1, and a stage 4 with feelings now
needs the rest of that turn, so the Release comes on turn 2; the percent is over both turns, in which the policy
Releases twice (Heart Overload's free Begin). Before, the free Pumps let it Release on turn 1 from level 6. (b) The
plain rows are the price of a plain Pump going down: at level 20 plain stage 4 fell from 181% to 110%, which is where
the free Pumps used to be. (c) In 7.3 the all-in caster has no Empathy until level 20, so it had no free Pumps to lose
at levels 9 and 12: it changed only at level 20.

## 8. What is not met, and why

1. **Level 1, the biggest Release: 72%.** A new caster has one free Pump in the fight, a Strain limit of 5, and walks
   into reach first. Steady play at level 1 is 96% (a new caster) to 120%.
2. **Level 12: 138 to 154% steady.** Heart Overload II arrives there (a free Begin every turn). It was 140 to 156%.
3. **The all-in caster is far over 125%** against the normal-share rifle (124 to 230% steady), and 118 to 153% against
   its own share's rifle from level 9. This is the same as rules 1.17 (it never had free Pumps). The target is set for
   the normal share; an all-in Soul build against an all-in rifle is the fair comparison, and it is 118 / 153 / 137%.
4. **The biggest Release against steady play.** You asked for 125 and 150: a ratio of 1.2. Measured against the
   seasoned caster's steady play: 138 to 126, 145 to 109, 165 to 154 and 155 to 129 at levels 6, 9, 12 and 20 (1.1, 1.3,
   1.1, 1.2; rules 1.17 measured 1.2, 1.1, 1.1, 1.0 the same way). The two rows are noisy and the biggest Release is no
   longer a one-turn cast, so read this as "about 1.2, as before", not as a gain.
5. **Heart Overload is what still lets a Soul 10 character move and Release big.** Held over the turn, its free
   Begin, the swell and the free Pump make a stage 4 with two or three feelings for about 3 AP a turn. It is slower to
   start, pays the swell's Strain below Empathy 7, and holds fewer feelings than before (two free Pumps and Shape
   poured three). It was not touched: you wrote it this week (rules 1.14). **Estimate, from the rules, not measured as
   its own row.**
6. **Overdraw is weaker than you set it.** Its second stage is a plain one, and a plain stage is +0.2 now (+0.4
   before), for 1 Strain after the first of a fight. Rage gives +0.5 for the same Strain.
7. **Healing fell back.** A Buff heal is 30 × the multiplier and its base was not raised: stage 1 heals 30 (36 in rules
   1.17), stage 4 with Rage and three +0.3 feelings 66 (81). Rules 1.17 had raised healing 9 to 20% as a side effect;
   this gives that back and a little more at high stages.

## 9. The schools

**What they did:** Damage: its number. Buff: heal 30 × the multiplier, or Inspired, or Guarded. Control: push 3,
pull 3, Pinned, Slowed. Status: Afraid, Shaken, Confused, Left or Right Brain Debuff. **A Pump changed nothing in a
Control or Status design or in a Buff boon:** conditions kept their rounds and saves at every stage, so those schools
had no reason to hold an Outburst at all except for an element's rider.

| School | It is | Inside it now (new in bold) | The stage |
|---|---|---|---|
| Damage | the school that ends a fight | **Strike** (the full damage) · **Finish** (×0.8; ×1.4 against a target at half its HP or less) · **Brand** (×0.8, and Marked: your side +1 to hit it, it can't hide) · **Drain** (×0.8, and you heal a quarter of the HP it takes) | the multiplier |
| Buff | the school that keeps your side standing | Heal · Inspired · Guarded | the heal reads the multiplier; **the boons last 3 rounds from stage 2, 4 at stage 4** |
| Control | the school that moves the fight | Push · Pull · Pinned · Slowed · **Swap** (you and the first creature a Bolt reaches trade places; an ally doesn't resist) | **a save 1 harder every 2 stages; a push or pull 4 tiles from stage 2, 5 at stage 4; conditions a round longer from stage 3** |
| Status | the school that gets inside their heads | Afraid · Shaken · Confused · Left Brain Debuff · Right Brain Debuff · **Silenced** (1 round) | **a save 1 harder every 2 stages; a round longer from stage 3** |

It fits the existing design: a way is the school's `option`, which Buff, Control and Status already had; the workshop,
the Create screen, the twin and Beloved pickers and the Proving Ground list the new ones from the data. The preview
shows each way's number on each target, the harder save and the longer push. No new art (the ways are words on a chip;
`art/briefs/ART-REQUESTS.md` says so).

**Not measured:** none of this has a number on the range (one target that never acts). Finish and Drain are priced by
arithmetic: Finish is ×0.8 for the first half of a target's HP and ×1.4 for the second, an average of ×1.1 on a
target fought from full to nothing and less on one that others are shooting too; Drain gives up 20% of the damage for
HP equal to a fifth of what is left. **Estimates.**

## 10. The same school twice

Shelved: `soul_modules.json` `second_school.same_school.shelved`. `checkOutburstDesign` (the workshop, the Beloved and
twin designs) and the Proving Ground refuse it for everyone; the pickers never offer it. The engine carries a design
that has it (`secondOf` no longer drops a second school equal to the first), and a test builds one by hand.

| School | A different way | The same way twice |
|---|---|---|
| Damage | the second way rides at half (Strike, then Drain at half) | half again the damage |
| Buff | the second rides at half (the heal, then Guarded for half the rounds) | half again the healing; half again the rounds of a boon |
| Control | the second rides at half (the push, then Pinned for half the rounds) | half again the push or pull (rounded down, at least 1 tile more); half again the rounds |
| Status | the second rides at half | half again the rounds, on one save |

It takes the second school's place (Will Power 5, +10 MP). When the advanced class comes: set
`second_school.same_school.shelved` to false and give the class `soulKnown.sameSchool`.

## 11. What I added that you did not ask for

1. **Each feeling once in an Outburst.** You asked that no fixed four be the best; this is how. It changes your rules
   1.8 sentence "Rage, Rage, Rage is three Rage steps".
2. **Pride is a new feeling in all but name** (+0.6; 2 Strain unless the Release takes somebody down).
3. **Defiance** went from "no save" to "4 harder": with each feeling once and no cost, "no save" made every Control and
   Status Release certain.
4. **Swap** and **Silenced**, and the stage riders of Control, Status and the Buff boons.
5. **The enemy casters' base** went to 24 (from 18) so their Outbursts stay about where the enemy table has them; they
   read the stage riders too.
6. **Two switches for the Pump's price** in the data, off.
7. `outburst-measure.test.ts`, and the 1.17 tool's biggest-Release rows now run 120 fights (36).

## 12. Questions only Leon can answer

Each has my recommendation, and the recommendation is what is built.

1. **Each feeling once in an Outburst?** *Recommendation: yes.* The other way is a smaller step each time a feeling
   repeats; "once" is one rule, it reads on the Pump button, and it makes a new feeling a new slot filled.
2. **Plain Pump +0.2, or +0.3?** *Recommendation: +0.2.* At +0.3 the +0.3 feelings would be no better than a plain
   Pump on the number, and Rage would be 1.7 plain Pumps where you asked for the gap to show.
3. **Calm: two rolls at −0.4, or gone as an accuracy feeling?** *Recommendation: keep it as built.* It pays under about
   60% to hit and costs you above it.
4. **Empathy 7: the swell without Strain.** *Recommendation: yes.* The other candidate was a second free Pump only on
   a turn that begins with the heart already held.
5. **Heart Overload's free Begin** is the last free 2 AP a turn (section 8.5). *Recommendation: leave it for a
   playtest;* if it is still too much, make it cost 1 AP at tier I and 0 at tier II.
6. **Overdraw** lost half its value with the plain Pump. *Recommendation: leave it, and look at it with Heart
   Overload.* The cheap repair is that an Overdraw Pump may carry its feeling into both stages' worth (not built).
7. **The Buff heal's base (30).** *Recommendation: leave it;* healing was not a target. Raising it to 36 would put a
   full heal back where rules 1.17 had it.
8. **Residue of the feelings with new jobs** (Grief still Slows the ground, Fear still Shakes it). *Recommendation:
   leave it;* it is a different thing from what the feeling does to the Release, and no school leaves residue.
9. **Pride's price:** 2 Strain unless the Release takes somebody down (dead, Down or surrendered, among those it hit).
   *Recommendation: as built.* At 1 Strain it was simply a better Rage.
10. **Which advanced class takes the same school twice,** and should it cost more than a second school's 10 MP?
    *Recommendation: 10 MP, decided with the class.*
11. **Awe at +0 with no save,** or +0.2 with a Heart save? *Recommendation: +0, no save:* it is the feeling for a
    Control or Status caster, where the multiplier is no price at all, and one AP off a Boss every turn is worth a
    Pump.
12. **Should a new caster's two feelings stay Rage and Love?** With each feeling once, a new caster pours two feelings
    and two plain Pumps. *Recommendation: yes;* every feeling felt after that is a visible step up, which is what you
    asked the numbers to do.

## 13. Files

- Spec: `docs/rules/PHC-Core-Rules-v1.0.md` ("Rules revision 1.19"; a pointer at the head of the Soul magic section
  and in rules 1.17; items 1200 to 1221).
- Data: `data/feelings.json` (revision 20: all 25, `plain_step`, `once_each`), `data/soul_modules.json` (revision 20:
  `cycle`, `damage` and its `modes`, `stage_riders`, the schools' `identity`, options and `stack`,
  `second_school.same_school`), `data/classes.json` (Shape's text), `data/perks.json` (Heart Overload II's text),
  `data/rules.json` (the Soul lines).
- Engine: `magic.ts`, `feelings.ts`, `character.ts` (`freePumps`, `swellFree`, `sameSchoolError`), `classes/i.ts`
  (Shape; Heart Surge's step past stage 4), `classes/k.ts` (a fed Pump under the cap), `perks/d.ts` (Heart Overload
  II), `game.ts` (the Proving Ground's design check), `glossary.ts`.
- Tests: `test/rules119-outburst.test.ts` (new, 24 tests); `test/balance/outburst-measure.test.ts` (new, the
  measurements; skipped unless asked for); `test/balance/policies.ts`, `magic-measure.ts`, `magic-measure.test.ts`;
  pinned numbers updated in `outburst20*.test.ts`, `outburst40*.test.ts`, `rules117-magic.test.ts`, `classes-i.test.ts`,
  `classes-k.test.ts`.
- Client: `apps/web/src/game/heartView.ts` (the ways in the workshop's verdict, the free Pump's line),
  `feelingsView.ts` (a step below zero), `actionPickers.ts` and `screens/create.js` (the new ways' names),
  `commands.ts` (the Pump's line); their tests; `apps/web/e2e/feelings40.mjs` (edited by reading, **not run**).
- `art/briefs/ART-REQUESTS.md` (no new art; what the feeling glyphs mean).

**Not run:** the browser suites (`npm run e2e`): `feelings40`, `heart`, `soul`, `rules114`, `magic`, `resources`.

**For the lead:** `CLAUDE.md` ("The game in one screen", the Mana line) still gives rules 1.8's Release multipliers and
"Empathy" free Pumps; it could carry "rules 1.19: ×0.8 +0.2 a stage, base 36, each feeling once, one free Pump a turn,
the schools read the stage". `CHANGELOG.md` and the version are yours.


## Leon's answers (12 Nov 2026)

1. Each feeling once per Outburst: **yes.**
5. Heart Overload's free Begin: **stays as it is; change after a playtest if it is still too much.**
2. The plain Pump: **+0.2.**
7. The Buff heal base: not settled alone. **A pass on heals and shields, for Sigil and the Outburst both** (rules 1.20,
   hand-off `heal-shield-pass.md`).

The other questions were not answered; their recommendations stand.
