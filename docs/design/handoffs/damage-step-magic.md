# The damage step, magic: Sigil and Outburst (rules 1.17)

11 Nov 2026. For Leon and whoever picks the balance pass up next. The rules are in `docs/rules/PHC-Core-Rules-v1.0.md`
("Rules revision 1.17", section 14 items 1050 to 1068); this is what was measured, what changed and why, what is not met,
and what only Leon can settle. **Nothing here is committed by this session; nothing was built, deployed or run in a
browser.**

## 1. What was asked, and where it stands

| Target (Leon, 11 Nov 2026) | Before | Now (the simulator) | Met? |
|---|---|---|---|
| A full Sigil Line (4 glyphs) lands at 150 to 200% of the plain rifle over the same turns | 78 to 119% | **140 / 190 / 151 / 191 / 205%** at levels 3, 6, 9, 12, 20 (normal share); all in 142 to 205% | Yes at levels 6 to 12. Level 3 is 10 points under, level 20 is 5 over. Level 1 has no 4-glyph Line (2 words known) |
| A 2-glyph Line cast every turn is about on par with the rifle | 42 to 61% | **88 / 71 / 96 / 87 / 102 / 105%** | Yes, except level 3 (71%) |
| An Elite and a Boss are never one-hit by it at equal level | never (the hit was small) | the biggest Evoke seen is under their HP at every level; an Elite takes 2.0 to 2.8 Evokes, a Boss 6 to 10 | Yes, with a rule that guarantees it (section 5.2) |
| Outburst is about 125% of the plain rifle in normal play | 61 to 89% (a new caster), 84 to 126% (the early feelings) | **94 / 115 / 115 / 109 / 140 / 129%** (a new caster), **105 / 127 / 126 / 129 / 156 / 155%** (the early feelings) | Yes at levels 3 to 9. Level 1 is under, levels 12 and 20 are over |
| Outburst peaks at 150% with the biggest Pump possible | 122 to 143% (levels 6 to 20) | **148 / 145 / 169 / 158%** at levels 6, 9, 12, 20 | Yes at levels 6 and 9; 10 to 20 points over at 12 and 20; at levels 1 and 3 the biggest Release takes two turns on the range (91% and 113%) |
| No feeling is a strict downgrade of a plain Pump | 17 of 25 stepped under +0.4 | none steps under +0.4 except Relief (+0.2, it gives Strain back) | Yes (pinned by a test) |
| A critical is ×1.5 to ×2.0 for spells too | ×2 | ×1.5 (the weapon's rule) | Yes |
| Spells read the level gap | no | yes (the roll to hit; saves still do not) | Yes |

The yardstick everywhere: the plain rifle (service rifle, plain shots, normal share) at the same level on the
simulator's shooting range, 8 turns. Its damage a turn in these runs: 72.6 / 84.5 / 97.6 / 107.9 / 105.4 / 120.1 at
levels 1, 3, 6, 9, 12, 20.

## 2. How it is measured (and what a good player still does better)

`packages/engine/test/balance/magic-measure.ts` and `magic-measure.test.ts` (new). One row is one **pattern**, played
for 8 turns on the range by a policy held to it; 12 fights a cell.

```
MAGIC_MEASURE=1 npx vitest run --root packages/engine test/balance/magic-measure.test.ts --silent=false
    MAGIC_MEASURE_N=12  MAGIC_MEASURE_LEVELS=6,12  MAGIC_MEASURE_VARIANTS=normal  MAGIC_MEASURE_OUT=<folder>  MAGIC_MEASURE_TAG=after
```

Each cell: the damage of one cast (misses counted: all spell damage ÷ casts) · the turns one cast took (turns played ÷
casts) · its AP (drawing, walking the Line, core changes, vents, Pumps, the Release) · the Strain it added · **the cast
as a percent of what the rifle deals over those same turns** (which is spell damage a turn ÷ rifle damage a turn). The
sidearm's shots are left out of the percent.

The policies were changed so they play these patterns honestly (`policies.ts`, `sim.ts`):

1. **Sigil.** It can be held to Lines of exactly 2, 3 or 4 glyphs. It now draws the Line **across** the way to the
   target and Evokes from beside it (the facing rule), so the next Line starts where it stands: the old policy walked 3
   tiles back to its start after every Line and cast one 2-glyph Line a turn with 3 AP left over. With few words it
   repeats a word (FIRE · FIRE · SEEK). It still casts only single-target damage Lines with SEEK.
2. **Outburst.** It can be held to a stage with plain Pumps. Otherwise each Pump takes the feeling worth most (its
   multiplier × its chance to land, so it knows Calm can't miss) among those the heart can pay for; it carries the
   Outburst over the turn for the swell when the Strain allows; it uses **Overdraw** when the turn's Pumps can't reach
   stage 4, and **Heart Overload**'s free Begin. Steady play never pays in HP (Shame); the peak may, and may burn 2 over
   the limit. "The early feelings" (Rage, Love, Calm, Spite, Joy, Shame, Fear, Grief) is my assumption for a caster after
   a session or two.

**What a good player would still do better.** Sigil: start closer so three or four Lines fit before walking back into
range (the policy resets every second Line); keep a second Line half-drawn with Hold the Stroke; use SPREAD, CHAIN and
TWICE on groups (the range has one target); ration cores (a full Line burns 5 to 8 of a core's 10 charge, and the kit
carries 4 spare). Outburst: pick feelings for what they do (Grief, Awe, Joy on a group), use a shape on a group, a
second school, a tone, Quiet with the costly feelings, Steady and the calming ways. **Neither caster is shot at** on the
range: under fire a Line that takes two turns is the first thing lost.

## 3. Before and after

### 3.1 Before (the game as it was this morning, the same policies)

**Normal share.** Plain rifle (normal share), damage a turn: L1 72.6 · L3 84.5 · L6 97.6 · L9 107.9 · L12 105.4 · L20 120.1

Sigil. Each cell: damage of one Evoke (misses counted) · turns it took · AP · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| 2 glyphs | 44.4 · 1.14 t · 4.9 AP · **54%** | 40.7 · 1.14 t · 4.3 AP · **42%** | 55 · 1 t · 4.1 AP · **56%** | 55 · 1 t · 4.1 AP · **51%** | 63.2 · 1 t · 4.1 AP · **60%** | 73.7 · 1 t · 3.5 AP · **61%** |
| 3 glyphs | 62.6 · 1.6 t · 7.5 AP · **54%** | 70.1 · 1.33 t · 6.2 AP · **62%** | 73.8 · 1.14 t · 5.5 AP · **66%** | 91.9 · 1.14 t · 5.5 AP · **75%** | 94.8 · 1.14 t · 5.5 AP · **79%** | 85.8 · 1 t · 4.7 AP · **71%** |
| 4 glyphs | out of reach | 105 · 1.6 t · 7.4 AP · **78%** | 142 · 1.33 t · 6.6 AP · **109%** | 127.5 · 1.33 t · 6.5 AP · **89%** | 149.7 · 1.33 t · 6.3 AP · **107%** | 164 · 1.14 t · 5.9 AP · **119%** |

Outburst. Each cell: damage of one Release (misses counted) · turns · AP · Strain added · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| stage 0, plain Pumps | 19.2 · 0.73 t · 3.4 AP · S1 · **36%** | 26.3 · 0.73 t · 3.4 AP · S1 · **43%** | 23.7 · 0.62 t · 3.4 AP · S1 · **39%** | 29.4 · 0.62 t · 3.4 AP · S1 · **44%** | 32.3 · 0.62 t · 3.3 AP · S1 · **50%** | 38.2 · 0.67 t · 3.2 AP · S1 · **48%** |
| stage 1, plain Pumps | 28.8 · 0.89 t · 3.9 AP · S1.1 · **45%** | 26.5 · 0.73 t · 3.5 AP · S1 · **43%** | 30.5 · 0.62 t · 3.4 AP · S1 · **51%** | 32.8 · 0.62 t · 3.4 AP · S1 · **49%** | 39.1 · 0.62 t · 3.3 AP · S1 · **60%** | 40.3 · 0.67 t · 3.2 AP · S1 · **50%** |
| stage 2, plain Pumps | 38.5 · 1 t · 4.8 AP · S1 · **53%** | 34.6 · 0.8 t · 4 AP · S1 · **51%** | 45.7 · 0.73 t · 3.7 AP · S1.1 · **64%** | 47.4 · 0.67 t · 3.1 AP · S1 · **65%** | 54.8 · 0.53 t · 2.5 AP · S1 · **97%** | 58.4 · 0.5 t · 2.6 AP · S1 · **97%** |
| stage 3, plain Pumps | 50 · 1.14 t · 5.3 AP · S1 · **60%** | 53.5 · 1 t · 4.9 AP · S1 · **63%** | 69.2 · 0.8 t · 4.2 AP · S1 · **89%** | 53.4 · 0.73 t · 3.5 AP · S1.1 · **68%** | 74.6 · 0.73 t · 3.5 AP · S1.1 · **97%** | 81.1 · 0.67 t · 3.2 AP · S1 · **101%** |
| stage 4, plain Pumps | 54.5 · 1.33 t · 6.8 AP · S1.2 · **56%** | 56.4 · 1.14 t · 5.7 AP · S1.1 · **58%** | 67.3 · 1 t · 4.9 AP · S1 · **69%** | 62 · 0.8 t · 4.6 AP · S1.1 · **72%** | 76.5 · 0.73 t · 3.9 AP · S1 · **100%** | 97 · 0.67 t · 3.8 AP · S1 · **121%** |
| stage 4, best feelings | 86.2 · 1.6 t · 5.6 AP · S3.3 · **74%** | 90.7 · 1.35 t · 5 AP · S3 · **79%** | 120.2 · 1.6 t · 4.7 AP · S3.8 · **77%** | 130.6 · 1.6 t · 4.6 AP · S3.8 · **76%** | 146.5 · 1.33 t · 4.5 AP · S3.7 · **104%** | 157.2 · 1.33 t · 3.8 AP · S3 · **98%** |
| steady play (a new caster: Rage and Love) | 44.2 · 1 t · 5.5 AP · S1.4 · **61%** | 64 · 1 t · 5.5 AP · S1.4 · **76%** | 74.3 · 1 t · 4.9 AP · S1.6 · **76%** | 67.7 · 0.89 t · 4.4 AP · S1.6 · **71%** | 83.7 · 0.89 t · 4.4 AP · S1.7 · **89%** | 80.5 · 0.8 t · 4.1 AP · S1.5 · **84%** |
| steady play (the early feelings) | 69.4 · 1.14 t · 5.7 AP · S1.4 · **84%** | 86.8 · 1 t · 5.5 AP · S1.4 · **103%** | 98.6 · 1 t · 4.9 AP · S1.6 · **101%** | 99.2 · 0.89 t · 4.4 AP · S1.6 · **103%** | 114.7 · 0.89 t · 4.4 AP · S1.7 · **122%** | 121.1 · 0.8 t · 4.1 AP · S1.5 · **126%** |
| steady play (all 25 feelings) | 72.1 · 1 t · 5.5 AP · S1.3 · **99%** | 116.1 · 1 t · 5.5 AP · S1.3 · **137%** | 137.1 · 1 t · 4.9 AP · S1.6 · **140%** | 136.9 · 0.89 t · 4.4 AP · S1.6 · **143%** | 159.6 · 0.89 t · 4.4 AP · S1.7 · **170%** | 176.7 · 0.8 t · 4.1 AP · S1.4 · **184%** |
| THE PEAK: the biggest Release, one turn | 89 · 2 t · 8 AP · S6 · **61%** (two turns: it walks into reach first) | 71.3 · 1 t · 4 AP · S3 · **84%** (two turns: it walks into reach first) | 122 · 1 t · 4 AP · S5 · **125%** | 132 · 1 t · 4 AP · S5 · **122%** | 151 · 1 t · 4 AP · S5 · **143%** | 161 · 1 t · 5 AP · S6 · **134%** |
| the biggest Release with the early feelings, one turn | 77 · 2 t · 8 AP · S2 · **53%** (two turns: it walks into reach first) | 85 · 2 t · 8 AP · S2 · **50%** (two turns: it walks into reach first) | 99 · 1 t · 4 AP · S1 · **101%** | 108 · 1 t · 4 AP · S1 · **100%** | 124 · 1 t · 4 AP · S1 · **118%** | 132 · 1 t · 5 AP · S2 · **110%** |

**All in.** Plain rifle (normal share), damage a turn: L1 72.6 · L3 84.5 · L6 97.6 · L9 107.9 · L12 105.4 · L20 120.1; all-in rifle: L1 115.7 · L3 117 · L6 133.9 · L9 141.5 · L12 123.2 · L20 123.1

Sigil. Each cell: damage of one Evoke (misses counted) · turns it took · AP · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| 2 glyphs | 62.7 · 1.14 t · 5.5 AP · **76%** | 65.4 · 1.14 t · 5.4 AP · **68%** | 71.3 · 1.14 t · 5.4 AP · **64%** | 66.5 · 1 t · 4.6 AP · **62%** | 69 · 1 t · 4.5 AP · **65%** | 61.1 · 1 t · 4.5 AP · **51%** |
| 3 glyphs | 105 · 1.6 t · 7.8 AP · **90%** | 115.9 · 1.33 t · 6.4 AP · **103%** | 113.7 · 1.33 t · 6.5 AP · **87%** | 110.9 · 1.33 t · 6.4 AP · **77%** | 104.8 · 1.14 t · 5.7 AP · **87%** | 96.5 · 1.14 t · 5.7 AP · **70%** |
| 4 glyphs | 155.3 · 2 t · 9.7 AP · **107%** | 136.1 · 2 t · 10.1 AP · **81%** | 167.7 · 1.6 t · 8 AP · **107%** | 189.4 · 1.6 t · 7.1 AP · **110%** | 162.2 · 1.33 t · 6.8 AP · **115%** | 185.8 · 1.33 t · 6.8 AP · **116%** |

Outburst. Each cell: damage of one Release (misses counted) · turns · AP · Strain added · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| stage 0, plain Pumps | 36.5 · 0.73 t · 3.8 AP · S1 · **69%** | 38.8 · 0.73 t · 3.7 AP · S1 · **63%** | 38 · 0.73 t · 3.8 AP · S1.1 · **54%** | 42 · 0.67 t · 3.6 AP · S1 · **58%** | 42.6 · 0.67 t · 3.4 AP · S1 · **61%** | 34.1 · 0.67 t · 3.2 AP · S1 · **43%** |
| stage 1, plain Pumps | 39.2 · 0.8 t · 4.3 AP · S1 · **68%** | 47.1 · 0.73 t · 3.7 AP · S1 · **77%** | 48.2 · 0.73 t · 3.7 AP · S1.1 · **68%** | 48.7 · 0.67 t · 3.6 AP · S1 · **68%** | 45.6 · 0.67 t · 3.4 AP · S1 · **65%** | 39.5 · 0.67 t · 3.2 AP · S1 · **49%** |
| stage 2, plain Pumps | 68 · 0.89 t · 4.4 AP · S1.1 · **105%** | 64.9 · 0.73 t · 3.5 AP · S1.1 · **106%** | 72.7 · 0.68 t · 3.4 AP · S1 · **110%** | 72.6 · 0.62 t · 3.2 AP · S1.1 · **109%** | 66.4 · 0.57 t · 3 AP · S1 · **110%** | 57.9 · 0.57 t · 2.5 AP · S1 · **84%** |
| stage 3, plain Pumps | 75.9 · 1 t · 5.4 AP · S1 · **105%** | 81.6 · 0.89 t · 4.9 AP · S1.1 · **109%** | 87.3 · 0.73 t · 3.8 AP · S1 · **123%** | 89.1 · 0.73 t · 4.2 AP · S1 · **114%** | 86 · 0.67 t · 3.6 AP · S1 · **122%** | 73.7 · 0.57 t · 3 AP · S1 · **107%** |
| stage 4, plain Pumps | 88.5 · 1.14 t · 6.4 AP · S1.1 · **107%** | 97.6 · 1 t · 5.5 AP · S1 · **116%** | 101.7 · 0.89 t · 5 AP · S1.1 · **117%** | 104.3 · 1 t · 5.8 AP · S1 · **97%** | 92.9 · 1 t · 5.9 AP · S1 · **88%** | 97.6 · 0.67 t · 3.5 AP · S1 · **122%** |
| stage 4, best feelings | 112.9 · 1.6 t · 5.4 AP · S3.8 · **97%** | 128 · 1.33 t · 5.2 AP · S3.3 · **114%** | 133.9 · 1.33 t · 5.2 AP · S3.3 · **103%** | 162 · 1.6 t · 5.6 AP · S3.8 · **94%** | 162 · 1.6 t · 5.6 AP · S3.8 · **96%** | 160.7 · 1.33 t · 3.2 AP · S3 · **100%** |
| steady play (a new caster: Rage and Love) | 86.6 · 1 t · 5.6 AP · S1.4 · **119%** | 91.3 · 1 t · 5.6 AP · S1.8 · **108%** | 111 · 1 t · 5.6 AP · S1.8 · **114%** | 108.1 · 1.14 t · 6.7 AP · S2.1 · **88%** | 99.4 · 1 t · 5.9 AP · S1.9 · **94%** | 95 · 0.89 t · 3.4 AP · S1.7 · **89%** |
| steady play (the early feelings) | 86.6 · 1 t · 5.6 AP · S1.4 · **119%** | 115.5 · 1 t · 5.6 AP · S1.8 · **137%** | 123.4 · 1 t · 5.6 AP · S1.8 · **126%** | 131.7 · 1.14 t · 6.7 AP · S2.1 · **107%** | 131.9 · 1 t · 5.9 AP · S1.9 · **125%** | 122.4 · 0.8 t · 3.5 AP · S1.5 · **127%** |
| steady play (all 25 feelings) | 107.3 · 1 t · 5.6 AP · S1.4 · **148%** | 158.6 · 1 t · 5.6 AP · S1.8 · **188%** | 169.1 · 1 t · 5.6 AP · S1.8 · **173%** | 181.6 · 1.14 t · 6.7 AP · S2.1 · **147%** | 183.6 · 1 t · 5.9 AP · S1.9 · **174%** | 176.9 · 0.8 t · 3.4 AP · S1.4 · **184%** |
| THE PEAK: the biggest Release, one turn | 122.5 · 1 t · 4.5 AP · S4 · **169%** (two turns: it walks into reach first) | 124 · 1 t · 4 AP · S3 · **147%** | 133 · 1 t · 4 AP · S3 · **136%** | 161 · 1 t · 5 AP · S5 · **149%** | 161 · 1 t · 5 AP · S5 · **153%** | 161 · 1 t · 5 AP · S6 · **134%** |
| the biggest Release with the early feelings, one turn | 105 · 1 t · 4.5 AP · S1 · **145%** (two turns: it walks into reach first) | 107 · 1 t · 4 AP · S1 · **127%** | 115 · 1 t · 4 AP · S1 · **118%** | 132 · 1 t · 5 AP · S1 · **122%** | 132 · 1 t · 5 AP · S1 · **125%** | 132 · 1 t · 5 AP · S2 · **110%** |

All in, against the all-in rifle: Sigil L1 47%/57%/67% · L3 49%/74%/58% · L6 47%/64%/78% · L9 47%/59%/84% · L12 56%/74%/99% · L20 50%/69%/113%; Outburst steady (new caster) L1 75% · L3 78% · L6 83% · L9 67% · L12 81% · L20 87%; the peak L1 106% · L3 106% · L6 99% · L9 114% · L12 131% · L20 131%

**The biggest 4-glyph Evoke against each tier at the caster's level** (normal share; the best seen, a critical included when one fell). Each cell: the tier's HP · the biggest Evoke · the average Evoke · Evokes to kill at the average

| Level | Minion | Soldier | Elite | Boss |
|---|---|---|---|---|
| 1 | 70 · 38 · 0 · – | 140 · 0 · 0 · – | 240 · 0 · 0 · – | 960 · 0 · 0 · – |
| 3 | 81 · 200 · 70 · 1.2 | 162 · 145 · 85 · 1.9 | 278 · 136 · 61.2 · 4.5 | 1114 · 136 · 56.7 · 19.7 |
| 6 | 97 · 116 · 63.3 · 1.5 | 193 · 167 · 51.9 · 3.7 | 331 · 157 · 67.3 · 4.9 | 1325 · 331 · 107.8 · 12.3 |
| 9 | 108 · 263 · 102 · 1.1 | 216 · 256 · 72.8 · 3 | 370 · 377 · 110.1 · 3.4 | 1478 · 377 · 106.5 · 13.9 |
| 12 | 122 · 147 · 147 · 0.8 | 244 · 286 · 130.4 · 1.9 | 418 · 197 · 95.5 · 4.4 | 1670 · 419 · 121.7 · 13.7 |
| 20 | 127 · 152 · 152 · 0.8 | 253 · 223 · 137.6 · 1.8 | 434 · 448 · 134.9 · 3.2 | 1738 · 448 · 163.3 · 10.6 |

### 3.2 After (rules 1.17)

**Normal share.** Plain rifle (normal share), damage a turn: L1 72.6 · L3 84.5 · L6 97.6 · L9 107.9 · L12 105.4 · L20 120.1

Sigil. Each cell: damage of one Evoke (misses counted) · turns it took · AP · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| 2 glyphs | 73.2 · 1.14 t · 4.9 AP · **88%** | 69 · 1.14 t · 4.3 AP · **71%** | 93.4 · 1 t · 4.1 AP · **96%** | 94.2 · 1 t · 4.1 AP · **87%** | 107.4 · 1 t · 4.1 AP · **102%** | 126.2 · 1 t · 3.5 AP · **105%** |
| 3 glyphs | 104.5 · 1.6 t · 7.5 AP · **90%** | 122.9 · 1.33 t · 6.2 AP · **109%** | 123.1 · 1.14 t · 5.5 AP · **110%** | 159.9 · 1.14 t · 5.5 AP · **130%** | 162.4 · 1.14 t · 5.5 AP · **135%** | 150 · 1 t · 4.7 AP · **125%** |
| 4 glyphs | out of reach | 189.6 · 1.6 t · 7.4 AP · **140%** | 247.5 · 1.33 t · 6.6 AP · **190%** | 217.6 · 1.33 t · 6.5 AP · **151%** | 268 · 1.33 t · 6.3 AP · **191%** | 281.8 · 1.14 t · 5.9 AP · **205%** |

Outburst. Each cell: damage of one Release (misses counted) · turns · AP · Strain added · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| stage 0, plain Pumps | 27.1 · 0.73 t · 3.4 AP · S1 · **51%** | 37.8 · 0.73 t · 3.4 AP · S1 · **62%** | 32.9 · 0.62 t · 3.4 AP · S1 · **55%** | 40.6 · 0.62 t · 3.4 AP · S1 · **61%** | 44.3 · 0.62 t · 3.3 AP · S1 · **68%** | 56.4 · 0.67 t · 3.2 AP · S1 · **70%** |
| stage 1, plain Pumps | 46.7 · 0.89 t · 3.9 AP · S1.1 · **72%** | 43.6 · 0.73 t · 3.5 AP · S1 · **70%** | 49.6 · 0.62 t · 3.4 AP · S1 · **83%** | 53.1 · 0.62 t · 3.4 AP · S1 · **80%** | 63.6 · 0.62 t · 3.3 AP · S1 · **98%** | 65.8 · 0.67 t · 3.2 AP · S1 · **82%** |
| stage 2, plain Pumps | 59.5 · 1 t · 4.8 AP · S1 · **82%** | 53.9 · 0.8 t · 4 AP · S1 · **80%** | 70.7 · 0.73 t · 3.7 AP · S1.1 · **100%** | 72.1 · 0.67 t · 3.1 AP · S1 · **100%** | 84.8 · 0.53 t · 2.5 AP · S1 · **151%** | 91 · 0.5 t · 2.6 AP · S1 · **152%** |
| stage 3, plain Pumps | 71.3 · 1.14 t · 5.3 AP · S1 · **86%** | 79.3 · 1 t · 4.9 AP · S1 · **94%** | 101.3 · 0.8 t · 4.2 AP · S1 · **130%** | 81 · 0.73 t · 3.5 AP · S1.1 · **103%** | 113.1 · 0.73 t · 3.5 AP · S1.1 · **148%** | 120.9 · 0.67 t · 3.2 AP · S1 · **151%** |
| stage 4, plain Pumps | 80.1 · 1.33 t · 6.8 AP · S1.2 · **83%** | 83.7 · 1.14 t · 5.7 AP · S1.1 · **87%** | 96.8 · 1 t · 4.9 AP · S1 · **99%** | 92.7 · 0.8 t · 4.6 AP · S1.1 · **107%** | 114.4 · 0.73 t · 3.9 AP · S1 · **149%** | 144.9 · 0.67 t · 3.8 AP · S1 · **181%** |
| stage 4, best feelings | 97.6 · 1.6 t · 5.2 AP · S3.2 · **84%** | 107.8 · 1.6 t · 4.8 AP · S3.6 · **80%** | 144.1 · 1.6 t · 4.8 AP · S4.2 · **92%** | 156.8 · 1.6 t · 4.8 AP · S4.2 · **91%** | 182.6 · 1.6 t · 4.6 AP · S4.2 · **108%** | 176.8 · 1.33 t · 3.8 AP · S3.3 · **110%** |
| steady play (a new caster: Rage and Love) | 68.2 · 1 t · 5.5 AP · S1.4 · **94%** | 96.9 · 1 t · 5.5 AP · S1.4 · **115%** | 112 · 1 t · 4.9 AP · S1.6 · **115%** | 104.4 · 0.89 t · 4.4 AP · S1.6 · **109%** | 131.3 · 0.89 t · 4.4 AP · S1.7 · **140%** | 124.1 · 0.8 t · 4.1 AP · S1.5 · **129%** |
| steady play (the early feelings) | 86.7 · 1.14 t · 5.7 AP · S1.4 · **105%** | 107.3 · 1 t · 5.5 AP · S1.4 · **127%** | 122.8 · 1 t · 4.9 AP · S1.6 · **126%** | 123.5 · 0.89 t · 4.4 AP · S1.6 · **129%** | 145.9 · 0.89 t · 4.4 AP · S1.7 · **156%** | 148.8 · 0.8 t · 4.1 AP · S1.5 · **155%** |
| steady play (all 25 feelings) | 83.6 · 1 t · 5.5 AP · S1.4 · **115%** | 117.5 · 1 t · 5.5 AP · S1.4 · **139%** | 134.2 · 1 t · 4.9 AP · S1.6 · **137%** | 134.3 · 0.89 t · 4.4 AP · S1.6 · **140%** | 159.6 · 0.89 t · 4.4 AP · S1.7 · **170%** | 177.7 · 0.89 t · 4.2 AP · S1.7 · **167%** |
| THE PEAK: the biggest Release, one turn | 66 · 1 t · 4 AP · S2.5 · **91%** (two turns: it walks into reach first) | 95.2 · 1 t · 4 AP · S3.5 · **113%** (two turns: it walks into reach first) | 144 · 1 t · 4 AP · S5 · **148%** | 156 · 1 t · 4 AP · S5 · **145%** | 178 · 1 t · 4 AP · S5 · **169%** | 190 · 1 t · 5 AP · S8 · **158%** |
| the biggest Release with the early feelings, one turn | 102 · 2 t · 8 AP · S5 · **70%** (two turns: it walks into reach first) | 112 · 2 t · 8 AP · S5 · **66%** (two turns: it walks into reach first) | 133 · 1 t · 4 AP · S4 · **136%** | 143 · 1 t · 4 AP · S4 · **132%** | 164 · 1 t · 4 AP · S4 · **156%** | 174 · 1 t · 5 AP · S6 · **145%** |

**All in.** Plain rifle (normal share), damage a turn: L1 72.6 · L3 84.5 · L6 97.6 · L9 107.9 · L12 105.4 · L20 120.1; all-in rifle: L1 115.7 · L3 117 · L6 133.9 · L9 141.5 · L12 123.2 · L20 123.1

Sigil. Each cell: damage of one Evoke (misses counted) · turns it took · AP · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| 2 glyphs | 104.6 · 1.14 t · 5.5 AP · **126%** | 109.8 · 1.14 t · 5.4 AP · **114%** | 119.2 · 1.14 t · 5.4 AP · **107%** | 113.4 · 1 t · 4.6 AP · **105%** | 115.4 · 1 t · 4.5 AP · **109%** | 102.4 · 1 t · 4.5 AP · **85%** |
| 3 glyphs | 173.7 · 1.6 t · 7.8 AP · **150%** | 198.6 · 1.33 t · 6.4 AP · **176%** | 195.1 · 1.33 t · 6.5 AP · **150%** | 196.1 · 1.33 t · 6.4 AP · **136%** | 184.4 · 1.14 t · 5.7 AP · **153%** | 164.6 · 1.14 t · 5.7 AP · **120%** |
| 4 glyphs | 268.3 · 2 t · 9.7 AP · **185%** | 240.4 · 2 t · 10.1 AP · **142%** | 292.8 · 1.6 t · 8 AP · **187%** | 331.8 · 1.6 t · 7.1 AP · **192%** | 288.3 · 1.33 t · 6.8 AP · **205%** | 324.2 · 1.33 t · 6.8 AP · **203%** |

Outburst. Each cell: damage of one Release (misses counted) · turns · AP · Strain added · **percent of the rifle over the same turns**

| Pattern | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| stage 0, plain Pumps | 50.6 · 0.73 t · 3.8 AP · S1 · **96%** | 54.1 · 0.73 t · 3.7 AP · S1 · **88%** | 53.9 · 0.73 t · 3.8 AP · S1.1 · **76%** | 61.1 · 0.67 t · 3.6 AP · S1 · **85%** | 62.7 · 0.67 t · 3.4 AP · S1 · **89%** | 49.4 · 0.67 t · 3.2 AP · S1 · **62%** |
| stage 1, plain Pumps | 64.8 · 0.8 t · 4.3 AP · S1 · **112%** | 75.4 · 0.73 t · 3.7 AP · S1 · **123%** | 79.3 · 0.73 t · 3.7 AP · S1.1 · **112%** | 79.9 · 0.67 t · 3.6 AP · S1 · **111%** | 75.4 · 0.67 t · 3.4 AP · S1 · **107%** | 63.7 · 0.67 t · 3.2 AP · S1 · **80%** |
| stage 2, plain Pumps | 105.2 · 0.89 t · 4.4 AP · S1.1 · **163%** | 101.6 · 0.73 t · 3.5 AP · S1.1 · **165%** | 113.3 · 0.68 t · 3.4 AP · S1 · **172%** | 110.2 · 0.62 t · 3.2 AP · S1.1 · **166%** | 103.2 · 0.57 t · 3 AP · S1 · **171%** | 88.4 · 0.57 t · 2.5 AP · S1 · **129%** |
| stage 3, plain Pumps | 113.2 · 1 t · 5.4 AP · S1 · **156%** | 125.2 · 0.89 t · 4.9 AP · S1.1 · **167%** | 131.8 · 0.73 t · 3.8 AP · S1 · **186%** | 133.8 · 0.73 t · 4.2 AP · S1 · **170%** | 130 · 0.67 t · 3.6 AP · S1 · **185%** | 113.2 · 0.57 t · 3 AP · S1 · **165%** |
| stage 4, plain Pumps | 132.4 · 1.14 t · 6.4 AP · S1.1 · **160%** | 147.5 · 1 t · 5.5 AP · S1 · **175%** | 151.7 · 0.89 t · 5 AP · S1.1 · **175%** | 156.4 · 1 t · 5.8 AP · S1 · **145%** | 140.9 · 1 t · 5.9 AP · S1 · **134%** | 142.7 · 0.67 t · 3.5 AP · S1 · **178%** |
| stage 4, best feelings | 167.4 · 1.6 t · 5.4 AP · S3.7 · **144%** | 183.5 · 1.6 t · 5.6 AP · S4.4 · **136%** | 227.4 · 1.6 t · 5.6 AP · S4.4 · **146%** | 209.9 · 1.6 t · 5.6 AP · S4.2 · **122%** | 224.1 · 1.6 t · 5.6 AP · S4.2 · **133%** | 186.2 · 1.33 t · 3.2 AP · S3.3 · **116%** |
| steady play (a new caster: Rage and Love) | 133.7 · 1 t · 5.6 AP · S1.4 · **184%** | 139.9 · 1 t · 5.6 AP · S1.8 · **166%** | 172.3 · 1 t · 5.6 AP · S1.8 · **176%** | 171.5 · 1.14 t · 6.7 AP · S2.1 · **139%** | 154.7 · 1 t · 5.9 AP · S1.9 · **147%** | 145.2 · 0.89 t · 3.4 AP · S1.7 · **136%** |
| steady play (the early feelings) | 122.8 · 1 t · 5.6 AP · S1.4 · **169%** | 170.8 · 1 t · 5.6 AP · S1.8 · **202%** | 183.9 · 1 t · 5.6 AP · S1.8 · **188%** | 177.3 · 1.14 t · 6.7 AP · S2.1 · **144%** | 166.1 · 1 t · 5.9 AP · S1.9 · **158%** | 153.2 · 0.8 t · 3.5 AP · S1.5 · **160%** |
| steady play (all 25 feelings) | 133.1 · 1 t · 5.6 AP · S1.4 · **183%** | 158.6 · 1 t · 5.6 AP · S1.8 · **188%** | 190.4 · 1 t · 5.6 AP · S1.8 · **195%** | 184.5 · 1.14 t · 6.7 AP · S2.1 · **150%** | 181.6 · 1 t · 5.9 AP · S1.9 · **172%** | 177.7 · 0.89 t · 3.4 AP · S1.7 · **166%** |
| THE PEAK: the biggest Release, one turn | 155.6 · 1 t · 4.5 AP · S4 · **214%** (two turns: it walks into reach first) | 167.1 · 1 t · 4 AP · S5 · **198%** | 200.8 · 1 t · 4 AP · S5 · **206%** | 205.3 · 1 t · 5 AP · S6 · **190%** | 223.8 · 1 t · 5 AP · S6 · **212%** | 190 · 1 t · 5 AP · S8 · **158%** |
| the biggest Release with the early feelings, one turn | 158.4 · 1 t · 4.5 AP · S4 · **218%** (two turns: it walks into reach first) | 153.5 · 1 t · 4 AP · S4 · **182%** | 190.5 · 1 t · 4 AP · S4 · **195%** | 216.8 · 1 t · 5 AP · S5 · **201%** | 175.9 · 1 t · 5 AP · S5 · **167%** | 174 · 1 t · 5 AP · S6 · **145%** |

All in, against the all-in rifle: Sigil L1 79%/94%/116% · L3 82%/127%/103% · L6 78%/109%/137% · L9 80%/104%/147% · L12 94%/131%/175% · L20 83%/117%/198%; Outburst steady (new caster) L1 116% · L3 120% · L6 129% · L9 106% · L12 126% · L20 133%; the peak L1 134% · L3 143% · L6 150% · L9 145% · L12 182% · L20 154%

**The biggest 4-glyph Evoke against each tier at the caster's level** (normal share; the best seen, a critical included when one fell). Each cell: the tier's HP · the biggest Evoke · the average Evoke · Evokes to kill at the average

| Level | Minion | Soldier | Elite | Boss |
|---|---|---|---|---|
| 1 | 70 · 38 · 0 · – | 140 · 0 · 0 · – | 240 · 0 · 0 · – | 960 · 0 · 0 · – |
| 3 | 81 · 273 · 117.3 · 0.7 | 162 · 175 · 109.4 · 1.5 | 278 · 257 · 120.5 · 2.3 | 1114 · 257 · 107.1 · 10.4 |
| 6 | 97 · 208 · 113.5 · 0.9 | 193 · 202 · 80.8 · 2.4 | 331 · 296 · 118.1 · 2.8 | 1325 · 460 · 195.8 · 6.8 |
| 9 | 108 · 364 · 171.6 · 0.6 | 216 · 357 · 94.9 · 2.3 | 370 · 369 · 147.5 · 2.5 | 1478 · 530 · 190.4 · 7.8 |
| 12 | 122 · 265 · 265 · 0.5 | 244 · 399 · 260.9 · 0.9 | 418 · 375 · 180.3 · 2.3 | 1670 · 589 · 209.9 · 8 |
| 20 | 127 · 274 · 274 · 0.5 | 253 · 266 · 266 · 1 | 434 · 433 · 219.6 · 2 | 1738 · 646 · 287.7 · 6 |

Reading notes. (a) "stage 4, best feelings" over 8 turns is lower than steady play: pouring the costly feelings every
turn fills the heart, and the caster then waits; that row shows the price working. (b) "THE PEAK" is one turn from a
quiet heart: at levels 1 and 3 the reference caster walks into reach first, so the Release comes on turn 2 and the row
is over two turns (the cells say so; their "t" reads 1 because two Releases fell in the two turns). (c) The all-in
rows are against the **normal-share** rifle, as in the step-1 report; the line under them gives the same against the
all-in rifle. (d) At level 1 the normal-share Sigil caster knows two words, so its only 3-glyph Line repeats one.

## 4. What changed

### 4.1 Sigil

1. **The Line multiplier:** ×1.7 for 2 glyphs, ×1.75 for 3, ×1.8 for 4, on a character's direct damage (not heals,
   shields, ranges or conditions; not enemy casters). One lever.
2. **The 350 / 500 limit inside Sigil magic is gone** (your ruling 3: targets, not a clamp).
3. **A critical is ×1.5** (to ×2.0 at most), from ×2.
4. **A spell's roll to hit reads the level gap** (±1 a level).
5. **The Elite and Boss guard:** one Evoke leaves an Elite or a Boss at or above the caster's level on 1 HP if it found
   it at full HP.

Why the three multipliers are so close: a long Line is already worth more for its words (CONDENSE ×1.5, a second
element at half). The whole school was at about half of what the targets ask, at every length. And ×1.8 is as high as
a full Line can go before **every** Line that lands on an equal-level Elite needs the guard (see 5.2).

### 4.2 Outburst

1. **The stage table:** ×0.8, ×1.2, ×1.6, ×2.0, ×2.4 (was ×0.8, ×1, ×1.4, ×1.8, ×2.2). Every plain Pump is now +0.4;
   before, the first Pump was +0.2, so a feeling poured into the first Pump showed 0.2 less than its card said.
2. **The Damage base: 28** for a character (was 20); **18** for an enemy caster, which keeps enemy Outbursts where the
   enemy table was fitted.
3. **A critical ×1.5; the roll reads the level gap** (also in the class moves that strike with an Outburst).
4. **Every feeling** (the table below). The yardstick: **1 Strain or 8 HP buys +0.3 above the plain +0.4**.
5. **Abandon once in an Outburst.**
6. **Modules:** Impact retired; At Once ×0.8; Return's second hit ×0.3; Shell ×0.35; Inverse ×0.7; Quiet +5 MP.
7. **Not changed:** the Strain rules and the limit, the schools, shapes and tones, Overdraw, Heart Overload, Resonance.

### 4.3 The feelings, old to new

| # | Feeling | Step before | Step now | Cost | What it does | Why it changed |
|---|---|---|---|---|---|---|
| 1 | Rage | +0.5 | **+0.7** | 1 Strain at the Pump | nothing else: it buys the multiplier | +0.1 for a Strain was no trade (Leon). Now +0.3 over a plain Pump for 1 Strain: the yardstick. |
| 2 | Grief | +0.3 | **+0.4** | none | targets hit are Slowed 2 rounds (Body save) | under a plain Pump; now equal, with the Slow on top |
| 3 | Fear | +0.3 | **+0.4** | none | targets hit are pushed 1 tile and Shaken 2 rounds (Heart save) | under a plain Pump |
| 4 | Love | +0.3 | **+0.4** | none | allies in the shape are spared and healed for ×0.35 of the Release; with no ally in the shape, the most wounded ally within its reach (or you) heals ×0.2 of it | under a plain Pump, and it did nothing on a Bolt (no ally stands in a one-tile shape); the heal shares went from ×0.5 with the base (28 from 20) so the HP healed stays about what it was |
| 5 | Joy | +0.3 | **+0.4** | none | chains to one more enemy within 2 tiles of the first hit, at half, no roll | under a plain Pump |
| 6 | Calm | +0.3 | **+0.4** | the whole Release ×0.75, and no critical (only when the shape rolls) | a Bolt or Lance can't miss and ignores cover; on a Wave, Burst or Aura (which never roll) it is a plain Pump | was the strongest damage feeling in the game for a Bolt: no roll at full strength and +0.3 (about +40% at a 65% hit chance). Very strong behaviour, so it pays: ×0.75 on the Release. At 65% to hit it is still worth about +11% and takes the miss away; at 80% it costs 9%. |
| 7 | Spite | +0.4; +0.8 | **+0.4; +0.6 against whoever last hurt you** | none | +0.6 instead, against whoever last hurt you | its plain case was already a plain Pump; the revenge case was +0.8, more than Rage, for free, four times over |
| 8 | Shame | +0.6 | **+0.7** | 8 HP to you for each Shame, at the Release (true damage) | nothing else: it buys the multiplier with HP | 5 damage once, however many Shames, for +0.2 each: "does nothing else" (Leon). Now the same trade as Rage, paid in HP at the burn's rate (1 Strain over the limit burns 8). |
| 9 | Pride | +0.2 a stage | **+0.4; +0.5 at stage 4** | none | +0.5 instead, when Released at stage 4 | was +0.2 at stage 1 (half a plain Pump) and +0.8 at stage 4 (a free Abandon) |
| 10 | Despair | +0.1 per 10% HP missing | **+0.4, +0.1 more per 20% of your HP missing** | none | +0.1 more for every 20% of your max HP missing, to +0.8 | was +0 at full HP: a wasted Pump |
| 11 | Hope | +0.3 | **+0.4** | none | you and the allies in the shape lose Afraid and Shaken and are Hopeful (+2 to the next roll, 2 rounds) | under a plain Pump |
| 12 | Mercy | +0.2 | **+0.4** | none | Downs instead of killing; a target hit at a quarter HP or less surrenders unless it passes a Heart save | half a plain Pump |
| 13 | Cruelty | +0.4 | **+0.4** | none | targets hit Bleed (no save), and it spreads to one enemy next to each | unchanged: it was the one behaviour feeling at +0.4 |
| 14 | Loneliness | +0.2; +0.5 alone | **+0.4; +0.5 with no ally within 3 tiles** | none | +0.5 instead, with no ally within 3 tiles | half a plain Pump next to an ally |
| 15 | Belonging | +0.1 an ally (to +0.5) | **+0.4, +0.1 more per ally within 3 tiles** | none | +0.1 more for each ally within 3 tiles, to +0.7; counts twice for allies' Resonance | +0 with no ally near: a wasted Pump |
| 16 | Dread | +0.3 | **+0.4** | none | targets hit lose their reactions this round and any held shot | under a plain Pump |
| 17 | Awe | +0.3 | **+0.4** | none | targets hit lose 1 AP on their next turn | under a plain Pump |
| 18 | Longing | +0.3 | **+0.4** | none | +2 reach; pulls targets hit 1 tile toward you | under a plain Pump |
| 19 | Relief | +0.2 | **+0.2** | half a plain Pump's step | each Relief takes 1 Strain off you at the Release | gave back the WHOLE hold's Strain for one Pump, so Relief + three Rages was three free Rages every turn. Very strong behaviour: the one feeling under +0.4. |
| 20 | Contempt | +0.3 | **+0.4** | none | targets hit have −2 to attack you for 2 rounds (no save) | under a plain Pump |
| 21 | Guilt | +0.3 | **+0.4** | 5 HP to you at the Release | heals the ally you hurt last for 10 × the stage; if none, the most wounded ally within its reach | under a plain Pump, and with no ally hurt it only cost you 5 HP (the Shame problem) |
| 22 | Jealousy | +0.3 | **+0.4** | none | steals one helpful condition, or the shield, from the first enemy hit | under a plain Pump |
| 23 | Wonder | +0.2 | **+0.4** | none | reveals Hidden creatures, traps and hazards in its area | half a plain Pump |
| 24 | Defiance | +0.3 | **+0.4** | none | no saves against its conditions, pushes and element effects; your next save passes | under a plain Pump |
| 25 | Abandon | +0.8 | **+1.0** | 2 Strain at the Pump; once in an Outburst | nothing else: the biggest step there is | four of them made ×3.8 on the old table (1.7 times a plain stage 4). Once in an Outburst now. |

What the audit found that was a lie or did nothing (card against `feelings.ts` and `magic.ts`):

1. **Shame** dealt 5 to you once, however many Shames were poured in (the engine keeps feelings as a set).
2. **Love** did nothing on the starting design: it heals "allies inside the shape", and a Bolt's shape is the one tile
   the enemy stands on. Rage and Love are the two feelings every caster starts with.
3. **Guilt** with no ally hurt only cost you 5 HP.
4. **Relief** gave back all the Strain the hold had added, for one Pump: Relief and three Rages was three free Rages
   a turn.
5. **Calm** was the strongest damage feeling in the game for a Bolt (no roll at full strength), and it made the At Once
   module (no roll at half damage, 10 MP, a slot) pointless.
6. **Pride, Despair, Belonging** stepped +0.2, +0 and +0 in their plain case: a Pump that made the Release weaker.
7. **Dread** carried a data field (`blind_hidden`) nothing reads; removed. `max_feelings_per_hold` (4) is not read
   either: four stages already limit it.
8. The first Pump of every Outburst was worth half of what "a plain Pump adds +0.4" says (the stage table).

### 4.4 The modules, schools, tones and shapes

| What | Card against engine | Changed? |
|---|---|---|
| **Impact** | Its own card said it changes nothing. It could be learned (a practice pick) and took a slot | **Retired.** Old designs lose it (the engine's retired-module path) |
| **At Once** | True, and a trap: ×0.5 for no roll, when a free Calm gave no roll at ×1 | **×0.8** |
| **Return** | True: both hits at full strength, each rolling: ×2 damage for 20 MP and a slot | **Second hit ×0.3** |
| **Shell** | True: a shield of half the Release each cast | **×0.35**, about the same HP as before the base rose |
| **Inverse** | True: a shield of the full damage on every ally reached | **×0.7**, about the same HP as before |
| **Quiet** | True; it cost −5 MP and halves the hold's Strain, which is now the feelings' price | **+5 MP** |
| Volley | True (3 bolts × 0.4, each rolls: ×1.2) | No |
| Split | True (a second full hit when two enemies stand within 2) | No; flagged (item 1063) |
| Bloom | True (+1 radius a stage: radius 5 at stage 4, allies included) | No; flagged |
| Swift, Move, Homing, Ether, Time, Left, Right, Size, Random, Ricochet, Fuse, Anchor, Lure, Linger, Silent, Thread | True | No |
| Schools (Damage, Buff, Control, Status) | True. The Buff heal (30 × the stage) grows 9 to 20% with the new table | The table only |
| Shapes (Lance ×0.8, Wave and Burst ×0.7, Aura ×0.6) | True | No |
| Tones (+5 MP, riders by stage) | True | No |
| Strain (limit 3 + half Will Power; +1 Begin and swell; −1 a turn; 8 a point over; Short at 3 over) | True | No. It was nearly idle (a Begin a turn cancels the turn's −1); the costly feelings are what spend it now |
| Overdraw (2 stages, 1 Strain after the first) | True; +0.4 for 1 Strain, on the yardstick | No |
| Heart Overload (a free Begin after a Release at stage 2+) | True; worth 2 AP a turn | No |
| Resonance (+10% a Release, to +20 / +30%) | True; it is in every number above (the reference build takes it) | No |

Side effects of the new stage table, outside my files: Heart Surge "past stage 4" now reads ×2.8 (it was ×2.6: one line
in `classes/i.ts`, the table's step continued); the shelved Vessel's body forms read the table (Iron +12 / +16 / +20
armour for +10 / +14 / +18); Storm Front's arcs take the new critical and the level gap (two lines in
`classes/soul.ts`).

## 5. What is not met, and why

1. **Level 3 full Line: 140%.** The caster's Sigil multiplier is still low (1.9) and the Line costs 7.4 AP.
2. **Level 20 full Line: 205%.** A Line costs 5.9 AP there (Glyph AP 0.5, Movement 2.5, the Mage's rank III moves), so
   it lands almost every turn. One multiplier cannot hold both ends: before the change the same builds ran from 78% to
   119%. All in, the Line always takes 1.3 to 2 turns and the band is 142 to 205%.
3. **"Two turns of set-up" is not what a full Line costs.** For a normal share it is 5.9 to 7.4 AP: about one turn and
   a third, core change and vent included. Two turns is the all-in caster at levels 1 to 3 (Expression 3, Agility 2).
4. **Outburst at level 1: 94%.** A new caster reaches stage 3 in a turn, has no free Pump and a Strain limit of 5.
5. **Outburst at levels 12 and 20: 129 to 156% steady, 158 to 169% at the peak.** The Channeler's rank III moves and
   the free Pump give more than one Release a turn. With all 25 feelings felt, steady play is 137 to 170% from level 3.
6. **Peak against steady.** You asked for 125 and 150: a ratio of 1.2. With feelings that are worth their Strain the
   biggest Release is about 1.3 times steady play, because steady play can afford about one Rage a turn and the peak
   pours three or four costly feelings at once. The numbers above are the compromise (Rage +0.7; the first fit, with
   Rage +0.8, Abandon +1.1 stacking and Calm ×0.8, measured the peak at 189 to 220%).

### 5.2 The Elite, in numbers

An Elite has about 3.4 rifle-turns of HP at every level. A full Line at 150 to 200% over 1.3 to 1.6 turns is 2 to 3.2
rifle-turns **on average**; it hits 65% of the time, so a Line that lands is 3 to 5 rifle-turns: at or over an Elite's
HP. At ×1.8 a normal-share hit that is not a critical stays under it through level 12 (89 to 92% of the Elite's HP at
levels 3, 6 and 12); a critical (×1.5) and an all-in caster at levels 1 to 3 go over. So "never" needs the guard.

## 6. Questions only Leon can answer

Each has my recommendation, and the recommendation is what is built.

1. **The Elite and Boss guard** (a full-HP Elite or Boss at your level is left on 1 HP by one Evoke). Keep it?
   *Recommendation: yes.* It fires on criticals and for all-in casters at low level only. The other way to keep your
   rule with criticals in the game is a full Line at about ×1.2, which by proportion is about 95 to 135% of the rifle.
2. **Should a full Line be able to miss?** It rolls like any spell (65% for a normal share), after one or two turns of
   drawing. *Recommendation: a 4-glyph Line does not roll: it lands, and cannot crit.* Then the multiplier comes down
   to about ×1.25 for the same 150 to 200% (by arithmetic from the 65% hit chance, not measured), the hit is the same
   every time, well under an Elite's HP, and the guard is hardly ever needed. Not built: it changes how the school
   feels, so it is yours to call.
3. **Rage: +0.7 or your +0.8?** *Recommendation: +0.7.* +0.8 on its own was not measured; the first fit (Rage and Shame +0.8, Abandon +1.1
   with no limit, Calm ×0.8) put the biggest Release at 189 to 220%, and each 0.1 on Rage is about 3 to 4% on a Release
   that holds three of them.
4. **Is "about 125%" the new caster or the seasoned one?** A new caster (Rage and Love) is at 94 to 140%, one with the
   early feelings at 105 to 156%. *Recommendation: leave the base at 28; the middle levels sit on 115 to 129%.*
5. **Calm at ×0.75.** It was free. Now it is a trade: no miss and no critical for a quarter of the damage (worth +11%
   at 65% to hit, −9% at 80%). *Recommendation: keep.*
6. **Abandon once in an Outburst.** Every other feeling still stacks. *Recommendation: keep; without it four Abandons
   are ×4.8.*
7. **A spell's critical grows with Perception and Dexterity** (the weapon's rule, unchanged). A caster has neither, so
   it is ×1.5 in practice. Should it grow with a caster's own attribute? *Recommendation: no, leave it at ×1.5 until
   gear exists that raises it.*
8. **Enemy casters** take no Line multiplier, no guard and keep a base of 18. *Recommendation: yes, until the enemy
   table is fitted with casters in it.*
9. **Bloom, Split and Swift** were not touched and are strong (item 1063). *Recommendation: measure them on groups
   in the next step, when the simulator fights more than one target with magic.*
10. **Sigil's AP is the real spread between levels** (5.9 to 10.1 AP for the same Line). *Recommendation: look at the
    Glyph AP floor (0.5) and the core change (2 AP, almost every full Line) in the AP step, not here.*

### Leon's answers (11 Nov 2026, night)

1. The Elite and Boss guard: **yes, keep it.**
2. A 4-glyph Line: **it rolls like anything else.** Nothing changes.
3. to 6. (Rage, the base, Calm, Abandon): not settled one by one. Instead, a second round on the Outburst as rules
   1.19 (hand-off: `outburst-rework-2.md`): feelings re-audited by effect and against what the schools already do
   (Relief and Calm's can't-miss called out as too strong; "Rage, Rage, Rage, Relief" must not be the line); the plain
   Pump goes down so a feeling's number shows; a strong effect takes a lower or negative step; whether 1 AP is the
   right price for a Pump; the free Pumps of a Soul 10 character (stage 4 every turn, the swell never matters);
   schools get more to choose from; the same school twice in a design is prepared as an advanced-class feature.
7. to 10.: not answered; the recommendations stand.

## 7. Files

- Spec: `docs/rules/PHC-Core-Rules-v1.0.md` ("Rules revision 1.17"; notes in the Sigil and Soul sections and in rules
  1.15; items 492, 496, 590, 801, 1031, 1032 annotated; new items 1050 to 1068).
- Data: `data/sigils.json` (grammar.line_mult, critical, elite_guard), `data/soul_modules.json` (the table, the base,
  the modules, Impact retired), `data/feelings.json` (all 25), `data/rules.json` (the Sigil and Soul lines).
- Engine: `sigilwords.ts`, `sigil.ts`, `magic.ts`, `feelings.ts`, `glossary.ts`; one line in `classes/i.ts` and two in
  `classes/soul.ts` (above).
- Tests: `test/rules117-magic.test.ts` (new, 22 tests); `test/balance/magic-measure.ts` and `.test.ts` (new: the full
  run, and 3 cheap target tests that run in `npm run check`); `test/helpers/grammar-only.ts` (new: the older Sigil
  tests pin the grammar's own numbers with the Line multiplier off); the Outburst tests updated to the new table and
  feelings (they keep a base of 20 where they pinned the cycle).
- Client: `apps/web/src/game/heartView.ts` (the workshop's numbers), `feelingsView.ts` (the codex step from the data),
  `commands.ts` and `screens/combat.js` (two texts that named the old table), their tests, `e2e/feelings40.mjs`.
- `art/briefs/ART-REQUESTS.md` (Impact needs no icon).

**For the lead:** `CLAUDE.md` ("The game in one screen") still gives the old Release multipliers (×0.6 / 1 / 1.4 / 1.8 /
2.2) and stage 0 ×0.8; the Mana line could carry "rules 1.17: ×0.8 +0.4 a stage, base 28, Line ×1.7 / 1.75 / 1.8".
`CHANGELOG.md` and the version are yours.
