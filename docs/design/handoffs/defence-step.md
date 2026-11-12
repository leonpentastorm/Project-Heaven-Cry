# The defence step: no round limit, the enemies go for the healer, the medic pass, the Boss (rules 1.23)

12 Nov 2026. For Leon and whoever picks the balance pass up next. The rules are in `docs/rules/PHC-Core-Rules-v1.0.md` ("Rules revision 1.23", section 14 items 1300 to 1322). **Nothing here was built with `npm run build`, deployed or run in a browser.** Prayer numbers were not touched (rules 1.22 is another session's); gun, Sigil and Outburst damage were not touched.

Leon's rulings, his words: "refit boss hp and do the medic pass. No round limit, just balance ap for healing accordingly; also if a tank is unkillable because a healer is healing them dedicatedly, let them have it, in real combat just make AI focus the unit that are dishing out the most heals."

## 0. The numbers that matter

1. **The round limit is gone.** Nothing limits a round's healing but max HP. One amount changed for it: a Split heal or shield is ×0.8 each (it was twice the heal for one slot).
2. **The enemies go for whoever is mending the squad.** Soldiers lean (the healer counts as hurt by half of their max HP more), Elites and Bosses put the healer first and, with a gun, step to where they have a shot. Minions and Vermin never look. Taunt, reach, line of sight and cover still decide who can be attacked.
3. **What that does under fire** (open ground, no cover, nobody between the healer and the Soldiers; the worst case for the healer): a pair with a healer lasts **2.2 to 7.9 rounds under two Soldiers** (rules 1.20: 7 to 10; an idle pair 4.1 to 4.8) and 2.0 to 4.3 under three. The healer is the first one Down in most fights. A healer and an Inverse shielder under three Soldiers: **2.9 to 4.5 rounds** (rules 1.20: 9.3 to 10). **Behind a tank it holds:** the tank and a dedicated healer last 8.7 to 10.0 rounds under two Soldiers (all ten, in every fight, from level 6) and 5.1 to 9.0 under three. In whole fights with a healer behind a tank the weight changes little (section 3.3).
4. **The medic's kit is fitted with the level factor:** Triage **5**, a dose (a stim, a thrown stim) **6**, Rally **6**, each × Healing given × the level factor. In a medic's hands a Triage is 42 to 50% of a Soldier-turn for 2 AP (it was 173% at level 1 and 96% at level 20) and a dose 49 to 61% for 1 AP (259% and 145%).
5. **The Boss has 820 HP** (960). The boss fight is 6.3 to 7.7 rounds on open ground and 8.9 to 11.7 on ground with cover (before: 6.9 to 9.1 and 10.6 to 13.8; target 8 to 10): the average of the two grounds is 9. For the fit's own squad it is not inside the target on either ground; with a second gun or the Outburst caster in the Sigil caster's place the ground with cover reads 7.7 to 10.4 (section 5.3; question 2).
6. **The enemy damage numbers of rules 1.15 stand** on the 26 × 26 ground: with enemies that close in and fire, the yardstick lasts 3.3 rounds under two Soldiers at levels 1 and 3. From level 6 the measurement's rifleman dodges out of sight with Duck and Roll (5.4 to 5.7 rounds); without that move 3.0 to 4.1.
7. **Enemies keep their own Burst.** With the characters' two-roll Burst and the factors raised to match, the table holds at levels 1, 3, 6 and 20 and is a round soft at 9 and 12. Recommended for the next fit of the level column; not built.

## 1. What was asked, and where it stands

| Asked | Built | Met? |
|---|---|---|
| Remove the healing round limit; mark it withdrawn in rules 1.20, keep the history | Removed from the engine and the data; rules 1.20 section 7 carries a withdrawal note; the test that pinned it now pins its absence | Yes |
| Check the AP price of healing without it; fix what heals too much through AP or the amount, not a cap | The price list (section 2); Split on a heal or shield ×0.8 each. Nothing else changed: what two healers or a healer and a shielder could do is answered by the enemy AI, as Leon ruled | Yes; see section 2.2 for what I looked at and left |
| Prayer numbers are not yours | Not touched. What I saw is in section 9 | Yes |
| The enemy AI goes for the unit dishing out the most healing and shielding; a strong pull, not absolute; by tier; visible; tests | Section 3. A count on every unit of what it gave others over two rounds; `healer_focus` by tier; the fight log and the intent say why; 11 tests | Yes |
| Re-measure the "under fire" tables with it on | Section 3.2, with the weight on and off | Yes (10 fights a cell; rules 1.20 used 16) |
| The medic pass: inventory, the same yardstick and level factor, a bit under a magic healer per AP, bounded by supplies | Section 4 | Yes for Triage. A dose is about twice magic's rate for its AP, on purpose (it is paid for from the kit): say if it should be under too |
| Refit Boss HP; check Elite HP; say the step-1 targets | Section 5. Boss 960 to 820. Elite left at 240. Targets: standard 4 to 6 rounds, elite 6 to 8, boss 8 to 10 (rules 1.15, "The fit") | Partly: the average of the two grounds is 9; neither ground is inside 8 to 10 |
| Re-run the fit on the 26 × 26 ground; do the rules 1.15 damage numbers still land? | Section 5.1 | Yes at levels 1 and 3; from level 6 the answer depends on Duck and Roll (found, not changed) |
| Should enemies take the two-roll Burst? Recommend; build only if the table still fits | Section 6. Recommended; not built, because it does not fit at levels 9 and 12 | As asked |
| Spec, data, engine, client text, tests, `rules123-defence.test.ts`, cheap measurement tests and env-gated full runs, validator, `npm run check` | Section 11 | See section 11 for what is red and whose it is |

## 2. No round limit, and what healing costs

### 2.1 The price list

Percent of one Soldier-turn restored on one ally by a caster with a normal share of points (the yardstick and the numbers are rules 1.20's: 100% is 13% of the plain rifleman's max HP at every level), against the AP it costs. Only Split and the medic's rows are new.

| Action | AP | Restores | For one AP |
|---|---|---|---|
| Sigil: MEND · SEEK (2 glyphs) | about 4 | 88 to 102% | 22 to 26% |
| Sigil: MEND · CONDENSE · SEEK (3 glyphs) | about 5.5 | 132 to 153% | 24 to 28% |
| Sigil: the full MEND Line (4 glyphs) | about 6.5, over 1.1 to 1.6 turns | 237 to 276% in one heal | 36 to 42% (157 to 208% a turn) |
| Sigil: MEND · SPREAD · SEEK | about 5.5 | 53 to 61% each | 10 to 11% each (four allies: 40 to 44%) |
| Sigil: WARD · SEEK (a shield) | about 4 | 105 to 123% | 26 to 31% |
| Sigil: the full WARD Line | about 6.5, over 1.1 to 1.6 turns | 284 to 331% in one shield | 44 to 51% |
| Outburst: the quick heal (stage 1) | 3 | 43 to 53% | 14 to 18% |
| Outburst: a steady turn (Rage and Love), the reference Channeler | 6 | 109 to 132% | 18 to 22% |
| Outburst: the same by a healer (Bard, Empathy first) | 6 | 151 to 179% | 25 to 30% |
| Outburst: the same with the Bard's Mend (from level 6) | 6 | 195 to 230% | 33 to 38% |
| Outburst: the same, all in, with the Bard's Mend | 6 | 197 to 280% | 33 to 47% |
| Outburst: the biggest heal (Rage, Shame, Pride, Abandon) | 6, with 6 Strain and 8 HP | 139 to 170% | 23 to 28% |
| Outburst: a steady heal in an Aura | 6 | 43 to 53% each | 7 to 9% each |
| Outburst: a Split heal (rules 1.23) | 6 | ×0.8 each of two (it was ×1 each) | ×1.6 in all (it was ×2) |
| Outburst: Inverse shield, steady | 6 | 148 to 168% | 25 to 28% |
| **Triage (a medic)** | 2 | 42 to 50% | 21 to 25% |
| **A dose (a medic)** | 1 and a stim or a Supply | 49 to 61% | 49 to 61% |
| **A dose (anyone)** | 1 and a stim | 17 to 32% | 17 to 32% |
| **Rally (a medic, rank III)** | 2, once a scene | 51 to 61% each | |
| Prayer (rules 1.22, another session's: not measured here) | 1 (a Whisper); 3 (a Hymn, on a cooldown) | a turn with Warm Hands and Health: 109 to 132% (rules 1.22, item 1286) | |

1. **Everything costs the healer about a turn for one to one and a half Soldier-turns.** The exceptions are the ones rules 1.20 chose: the full Lines (the biggest single heal and shield, after a turn or more of drawing), the healer built for it, and doses.
2. **"A dedicated healer keeps one tank up": yes, and it costs the whole turn.** A Bard healer's steady turn is 151 to 179% for 6 AP. A Soldier's turn takes about 9 HP off the tank at level 6 (25 off the rifleman: the tank is in Class 4 armour), so one healer more than covers two Soldiers: the tank and a healer hold two Soldiers for all ten rounds (section 3.2). That is the case Leon said to allow.

### 2.2 What I looked at for the missing limit, and what I did

| What the limit held | Without it | Done |
|---|---|---|
| Two healers on one ally | Twice one healer, for two characters' whole turns: 3 to 3.6 Soldier-turns a round from two Bard healers (the limit was 3.7: it did not bind them); 5.6 from two all-in healers with the Bard's Mend | Nothing. The enemies answer it: two healers and the rifleman under three Soldiers last 2.4 to 5.7 rounds with the weight on and 6.3 to 8.8 with it off |
| A healer and an Inverse shielder | The pair rules 1.20 flagged (item 1243): three Soldiers held for ten rounds in 38 to 94% of fights | Nothing to the numbers. With the weight on: 2.9 to 4.5 rounds under three Soldiers |
| Split on a healing Bolt | Twice the single heal for one slot and 15 MP | **×0.8 each** (the area band of 1.6) |
| Thread (the next heal on one of two linked allies is copied to the other, once) | One heal doubled, once | Nothing: it is once |
| The target's Camaraderie (+10% a point to healing received), Rich air, the Bard's Mend, all in, together | An all-in Bard healer on a target with high Camaraderie in Rich air heals over half of the rifleman's HP in a turn | Nothing. It is one healer's whole turn on one ally; and it is three attributes' worth of build |
| MEND and WARD read two multipliers (Sigil multiplier × Healing given) | As rules 1.20 said (its question 5): safe for a Mage, double or triple for a character with Intelligence and Insight both high | Nothing; still worth a look if a playtest builds it |
| An area heal (Aura ×0.4 each, SPREAD ×0.6 each) | 1.6 times the single heal over four allies: inside the band | Nothing |
| A full MEND Line on a small target | It could be clipped by the limit; it no longer is | Nothing |

## 3. The enemy AI goes for the healer

### 3.1 How a target was picked, and how it is now

**Before.** `enemyTurn` (`packages/engine/src/combat.ts`) runs up to six steps a turn: get out of trouble (flames, a grapple, a dropped weapon, a jam), scuff a glyph underfoot, weigh a spell (casters), reload, a Call or a technique if one beats a plain attack, a plain attack, else walk to the nearest tile with a line on someone. A plain attack chose among the characters it could attack (reach, range, sight, line of sight, not Hidden): its Taunter first, standing before Downed, then **the least HP left** (the number, not the share), then the likeliest hit. A technique chose differently: the first character in the fight's list it could be used on (found here; item 1315). A Soldier's fire at range is mostly Bursts, which are a technique, so in practice Soldiers shot whoever was first in the list.

**Now.** One thing is added to both choices.

1. **The count.** `healUnit` and `grantShield` (`effects/damage.ts`), the two places every heal and every shield in the engine goes through, note on the giver what it restored or added for someone else of its side (`noteTended`, `effects/mending.ts`). So spells, prayers, Outbursts, Triage, stims, Rally, perks and class moves are all in, with no list to keep. Overhealing, a smaller shield over a bigger one, and anything given to oneself are not counted.
2. **The window: this round and the last.** I chose two rounds over the whole fight. With a whole-fight count the enemies would stay on a healer who has run out of MP or supplies and never turn to the second healer who took over; with one round a healer who walks for a turn is forgotten at once. Two rounds means: stop healing for a full round and they let you go.
3. **The healer** is whoever of the other side has the highest count, if it is at least a tenth of their own max HP, they are standing, not Hidden, and somebody on the enemy's side sees them now.
4. **By tier** (`healer_focus` in `data/enemies.json`): Vermin and Minion 0; **Soldier 0.5**: in the sort by HP left the healer counts as having half of their max HP less; **Elite and Boss 1**: the healer sorts first.
5. **The hunt.** An Elite or a Boss with a gun, a known healer and no shot at them walks the shortest way to a tile that has one (in range, in its sight or an ally's, a clear line), if it can still fire after the walk. Once a turn. A melee enemy never does: it turns on the healer only when the healer is already in reach.
6. **Limits.** Taunt is sorted first, as before. Only characters it could attack anyway are candidates. If its chance to hit the healer is under half its best chance on anyone, no weight (cover). Fear and Threatened stop the walk. A False Image stands in for its owner.
7. **Told to the player.** The fight log: "*Soldier 2* turns on *Mira*: the enemy has seen who is mending the squad." once a round for each healer. The intent (the Trickster's Read): "shoot Mira: it goes for whoever is mending the squad", or "move to K7 for a shot at Mira: it goes for …". `Intent.why = 'healer'` is there for a screen that wants a badge. One line was added to the AI Narrator's rules of the fight (`apps/web/src/narrator/context.ts`).

**Why a Soldier's 0.5 is nearly the whole way.** Enemies sort by HP left, and a caster has less of it than anyone (115 at level 1 against the rifleman's 145). So any weight above 0 puts a caster-healer first for a Soldier until somebody else is badly hurt. The half only changes the answer for a sturdy healer (a Faith build in Class 3 armour, a medic with HP). That is question 1.

### 3.2 Under fire again

The heal pass's own measurement (`heal-measure.ts`): the plain rifleman, who stands and shoots, and one or two more characters on the 16 × 11 ground under Soldiers that never fall, at most 10 rounds; 10 fights a cell here (rules 1.20: 16). Each cell: **the rounds played before the first of them went Down** (round brackets: the share of fights in which nobody did); in square brackets, how often a supporter was the first Down; then "off": the same fights with the healer weight off, or "1.20": what the heal pass measured.

**A pair:**

| The second character | L1, 2 Soldiers | L1, 3 Soldiers | L6, 2 Soldiers | L6, 3 Soldiers | L12, 2 Soldiers | L12, 3 Soldiers | L20, 2 Soldiers | L20, 3 Soldiers |
|---|---|---|---|---|---|---|---|---|
| standing idle (the control) | 4.7 | 2.6 | 4.8 | 2.8 | 4.6 | 2.2 | 4.1 | 2.0 |
| a Soul healer (Bard, Empathy first), healing | 2.4 [100%] · off 7.4 | 2.7 [60%] · off 4.1 | 6.1 [50%] · off 8.2 | 2.8 [90%] · off 5.0 | 7.9 (20%) [10%] · off 8.4 | 4.3 [50%] · off 5.1 | 7.9 (10%) [30%] · off 8.7 | 2.4 [80%] · off 4.2 |
| the Outburst caster (Channeler), healing | 3.0 [100%] · 1.20: 8.6 | 2.6 [50%] · 1.20: 3.4 | 6.2 [50%] · 1.20: 8.9 | 2.9 [70%] · 1.20: 3.8 | 6.0 [70%] · 1.20: 7.9 | 3.4 [60%] · 1.20: 3.7 | 5.3 [60%] · 1.20: 9.4 | 2.0 [80%] · 1.20: 3.1 |
| the Outburst caster, Inverse shields | 3.4 [100%] · 1.20: 9.8 | 2.6 [80%] · 1.20: 4.6 | 6.8 (20%) [80%] · 1.20: 9.8 | 3.0 [90%] · 1.20: 6 | 7.3 (10%) [90%] · 1.20: 9.9 | 3.5 [90%] · 1.20: 6.3 | 6.2 (20%) [70%] · 1.20: 10 | 2.1 [100%] · 1.20: 5.6 |
| the Sigil caster, MEND · SEEK every turn | 2.2 [100%] · 1.20: 9.8 | 2.2 [80%] · 1.20: 4 | 3.4 [100%] · 1.20: 9.1 | 2.2 [90%] · 1.20: 4.4 | 4.8 [100%] · 1.20: 8.6 | 2.7 [80%] · 1.20: 4.9 | 4.5 [100%] · 1.20: 8.8 | 2.2 [80%] · 1.20: 3.9 |
| the Sigil caster, the full MEND Line | 2.4 [100%] · 1.20: 9.9 | 2.8 [70%] · 1.20: 4 | 4.9 [90%] · 1.20: 9.8 | 3.8 [70%] · 1.20: 5.7 | 5.2 [100%] · 1.20: 9.4 | 2.9 [80%] · 1.20: 7.2 | 5.2 [100%] · 1.20: 9.9 | 3.0 [80%] · 1.20: 6.6 |
| the medic: Triage and one dose a turn (no magic; at level 1 no class yet: three stims) | 6.5 (20%) [60%] · off 7.1 | 3.9 [30%] · off 4.3 | 4.2 [100%] · off 8.3 | 3.1 [90%] · off 5.0 | 5.4 [100%] · off 8.7 | 3.6 [100%] · off 6.4 | 5.1 [100%] · off 9.0 | 3.3 [100%] · off 4.4 |
| the medic: Triage only (level 1: nothing to give) | 7.4 (10%) [40%] | 3.3 [10%] | 5.9 [70%] | 4.1 [60%] | 6.5 (20%) [50%] | 4.3 [20%] | 7.1 (20%) [60%] | 3.5 [30%] |

**A trio** (four Soldiers is the whole fire of a standard fight, on three characters):

| The second character | L1, 2 Soldiers | L1, 3 Soldiers | L1, 4 Soldiers | L6, 2 Soldiers | L6, 3 Soldiers | L6, 4 Soldiers | L12, 2 Soldiers | L12, 3 Soldiers | L12, 4 Soldiers | L20, 2 Soldiers | L20, 3 Soldiers | L20, 4 Soldiers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| two Soul healers standing idle (the control) | 6.7 | 3.3 | 1.5 | 5.8 | 3.4 | 1.9 | 6.0 | 2.6 | 2.0 | 6.1 | 2.1 | 1.6 |
| two Soul healers, healing | 6.3 (20%) [60%] · off 9.8 | 2.4 [100%] · off 6.3 | 1.7 [100%] · off 3.6 | 9.0 (50%) [20%] · off 9.4 | 3.5 [90%] · off 7.7 | 1.7 [100%] · off 5.9 | 9.2 (70%) [10%] · off 9.8 | 4.3 (10%) [70%] · off 8.8 | 2.3 [100%] · off 7.4 | 9.1 (70%) [10%] · off 10.0 | 5.7 [70%] · off 8.3 | 1.5 [100%] · off 6.5 |
| two all-in Soul healers | 7.3 (50%) [30%] · 1.20: 9.7 | 2.8 [100%] · 1.20: 7.8 | 1.3 [100%] · 1.20: 5.4 | 8.3 (60%) [30%] · 1.20: 9.7 | 3.1 (10%) [90%] · 1.20: 8.3 | 1.5 [100%] · 1.20: 6.7 | 5.8 (40%) [60%] · 1.20: 9.8 | 1.2 [100%] · 1.20: 8.4 | 1.5 [100%] · 1.20: 6.3 | 3.1 (10%) [90%] · 1.20: 10 | 1.1 [100%] · 1.20: 7.6 | 1.3 [100%] · 1.20: 5.1 |
| a Soul healer and an Inverse shielder | 7.0 (40%) [60%] · off 10.0 | 2.9 [90%] · off 9.3 | 1.5 [100%] · off 5.4 | 10.0 (100%) · off 10.0 | 4.2 [90%] · off 9.7 | 2.1 [100%] · off 7.6 | 10.0 (100%) · off 10.0 | 4.5 (30%) [70%] · off 10.0 | 2.5 [100%] · off 8.7 | 9.2 (90%) [10%] · off 10.0 | 3.4 (10%) [90%] · off 10.0 | 1.0 [100%] · off 8.5 |

**The tank in the rifleman's place** (it walks up and fights; the healer stays where she started):

| The second character | L1, 2 Soldiers | L1, 3 Soldiers | L6, 2 Soldiers | L6, 3 Soldiers | L12, 2 Soldiers | L12, 3 Soldiers | L20, 2 Soldiers | L20, 3 Soldiers |
|---|---|---|---|---|---|---|---|---|
| the tank and an idle Soul healer (the control) | 8.6 (40%) | 5.2 | 9.2 (40%) | 7.1 (20%) | 8.2 (20%) | 6.4 | 9.9 (90%) | 7.5 |
| the tank and a dedicated Soul healer | 8.7 (40%) [50%] · off 9.5 | 5.1 [60%] · off 6.7 | 10.0 (100%) · off 10.0 | 7.5 (20%) [80%] · off 8.7 | 10.0 (100%) · off 10.0 | 9.0 (80%) [20%] · off 10.0 | 10.0 (100%) · off 10.0 | 8.0 (50%) [50%] · off 10.0 |

1. **In the open, a healer is now the first one Down.** A pair with a healer lasts 2.2 to 7.9 rounds under two Soldiers, where the heal pass had 7 to 10 and an idle pair lasts 4.1 to 4.8. Under three: 2.0 to 4.3 (idle 2.0 to 2.8).
2. **At level 1 healing in the open is worse than not healing** (2.2 to 3.4 rounds against 4.7): the healer has 115 HP and Class 1 armour, a Soldier's turn on her is twice what it is on the rifleman, and her heals are small. From level 6 a Soul healer buys one to four rounds under two Soldiers (6.1 to 7.9 against 4.1 to 4.8); a Sigil caster who draws Lines in the open buys nothing (3.4 to 5.2).
3. **Two healers and a healer with a shielder no longer hold three Soldiers:** 1.1 to 5.7 rounds (with the weight off: 6.3 to 10.0). Under four: 1.0 to 2.5.
4. **The medic** is the same story with smaller numbers: 4.2 to 5.4 rounds under two Soldiers at levels 6 to 20, against 8.3 to 9.0 with the weight off. (At level 1 there is no class yet: the row is three stims.)
5. **Behind a tank it works.** The tank and a dedicated healer: 8.7 to 10.0 rounds under two Soldiers (from level 6 nobody goes Down in ten rounds, in every fight), 5.1 to 9.0 under three. The Soldiers are busy with the tank that walked up to them; the healer is 11 tiles back.
6. **What this does not show:** everything a player does about it. The supporters stand in the open at 11 tiles and never move for cover; nobody Taunts; nobody shields the healer. So read these as the floor.

### 3.3 Whole fights with a healer in the squad

The fit's squad with a Soul healer (Bard, Empathy first, healing the most wounded) in the Sigil caster's place, 10 fights a cell, on the 26 × 26 grounds. Each cell: rounds to win · won · fights with someone Downed · in how many of the 10 the healer was Downed.

| A healer in the squad (optimised gun, tank, Soul healer, Calls leader): rounds to win · won · fights with someone Downed · how often the healer was among them | Level 1, open | Level 1, cover | Level 6, open | Level 6, cover | Level 12, open | Level 12, cover |
|---|---|---|---|---|---|---|
| Standard, the enemies go for the healer | 6.5 · 100% · 30% · 2 in 10 | 9.1 · 90% · 40% · 3 in 10 | 7.0 · 100% · 0% · 0 in 10 | 9.3 · 100% · 30% · 0 in 10 | 6.9 · 100% · 0% · 0 in 10 | 10.0 · 90% · 50% · 0 in 10 |
| Standard, the healer weight off (the control) | 6.7 · 100% · 20% · 1 in 10 | 9.1 · 90% · 40% · 3 in 10 | 7.1 · 100% · 0% · 0 in 10 | 9.4 · 100% · 30% · 0 in 10 | 7.0 · 100% · 0% · 0 in 10 | 9.8 · 90% · 50% · 0 in 10 |
| Boss, the enemies go for the healer | 9.9 · 100% · 10% · 0 in 10 | 11.8 · 100% · 50% · 3 in 10 | 11.7 · 100% · 0% · 0 in 10 | 14.4 · 70% · 80% · 4 in 10 | 11.4 · 100% · 0% · 0 in 10 | 13.0 · 60% · 50% · 0 in 10 |
| Boss, the healer weight off (the control) | 10.0 · 100% · 10% · 1 in 10 | 11.1 · 90% · 40% · 3 in 10 | 11.8 · 100% · 0% · 0 in 10 | 14.6 · 70% · 80% · 4 in 10 | 11.1 · 100% · 0% · 0 in 10 | 12.8 · 60% · 50% · 0 in 10 |

1. **In a whole fight with a tank in front, the weight changed little:** the same rounds to win, and the healer Downed in the same number of fights, with it on and off. The healer stays behind the squad and the enemies have nearer and more hurt targets, or no shot at her at all.
2. Read with care: 10 fights a cell, and this squad has one damage dealer less than the fit's, so its fights are longer than the targets by construction (and the boss fight on ground with cover is lost 3 or 4 times in 10 from level 6, with the weight on or off).

## 4. The medic pass

### 4.1 The inventory: every heal, shield and cleanse that is not a spell or a prayer

| Source | Who has it | Cost and limit | Before | Now |
|---|---|---|---|---|
| **Triage** (`class:medic.triage`) | Bard, rank I (from level 3) | 2 AP, next to you, once an ally a turn; no supplies | 20 × Healing given | **5 × Healing given × the level factor** |
| Triage out of a fight (the story, the area map) | Bard | once an ally a scene | 20 × Healing given | **three times a fight's Triage** |
| Stabilise | Bard: 1 AP, no stim. Anyone else: 2 AP and a stim | a Downed ally next to you | up at 1 HP | unchanged |
| **A stim** | anyone | 1 AP, next to you, one stim | 30 × Healing given; ends Bleeding | **6 × Healing given × the level factor**; ends Bleeding |
| **Stim Throw** | Bard, rank II (Insight 5, level 6) | 1 AP, within 4 tiles in sight, 1 Supply | 30 × Healing given; a Downed ally up at 1 HP | **6 × Healing given × the level factor** |
| Thrown Stim (perk) | its holder | a stim, at range | stabilises at 1 HP | unchanged (no heal) |
| Field Surgery | Bard, rank III | out of a fight, 1 Supply | treats a limb injury or clears every Body condition | unchanged |
| **Rally** | Bard, rank III (Insight 8, level 12) | 2 AP, every ally within 4 tiles, once a scene | 20 × Healing given each; ends Fear and Shaken | **6 × Healing given × the level factor** each |
| **Field Repair on an ally** (Field Surgeon, an Achieved perk) | its holder | 2 AP, next to you, a spare-parts charge; Improvisation 3 | 10 × Improvisation × Healing given | **3 × Improvisation × Healing given × the level factor** |
| Field Repair on yourself (Factory Made) | a machine | a spare-parts charge | 10 × Improvisation | not changed (item 1310) |
| Patch the drone (Jury-Rig II) | its holder | 2 AP, a spare-parts charge | 20% of the drone's max HP and more with Improvisation | not changed: a share of max HP |
| Shrug It Off II, Clean Hands, Last Charge (perks) | their holder, on themselves | their own triggers | a shield of 10% or 15 to 25% of max HP, or 15 × Armour Class | not changed: they keep pace with level already (75 to 115% of a Soldier-turn, rules 1.20) |
| Shrug It Off (Defender II), Daggerfall Veteran, Hope | their holder | | end conditions | not changed |
| The rally banner, Sweep, Bulwark of Will, Adamantile Plate, the Warden's Ward | shelved classes | | 10 to 20 × Healing given, no level factor | not fitted until the classes return (item 1310) |
| A rest | everyone | out of a fight | | not looked at (there is no rest inside a fight) |
| Calls | a leader | | none of the nine heals or shields | – |
| Items (`data/items.json`) | | | the stim injector is the only one that heals | as the stim above |

### 4.2 Before and now, against the yardstick

HP · **percent of one Soldier-turn** (in brackets: before). A Soldier-turn is 18.5 / 21.5 / 25.4 / 32.4 / 37.8 / 60.2 HP at levels 1 / 3 / 6 / 9 / 12 / 20 (rules 1.20).

| Who | Action | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|
| Anyone (Healing given ×1.0) | Triage, 2 AP | 5 · **27%** (20 · 108%) | 5 · **23%** (20 · 93%) | 5 · **20%** (20 · 79%) | 6 · **19%** (20 · 62%) | 6 · **16%** (20 · 53%) | 9 · **15%** (20 · 33%) |
| | a dose, 1 AP (a stim, a thrown stim) | 6 · **32%** (30 · 162%) | 6 · **28%** (30 · 140%) | 6 · **24%** (30 · 118%) | 7 · **22%** (30 · 93%) | 8 · **21%** (30 · 79%) | 10 · **17%** (30 · 50%) |
| | Rally, 2 AP, each ally, once a scene (rank III) | 6 · **32%** (20 · 108%) | 6 · **28%** (20 · 93%) | 6 · **24%** (20 · 79%) | 7 · **22%** (20 · 62%) | 8 · **21%** (20 · 53%) | 10 · **17%** (20 · 33%) |
| | Triage out of a fight, once an ally a scene (HP) | 15 (20) | 15 (20) | 16 (20) | 18 (20) | 20 (20) | 27 (20) |
| A medic (Bard, Empathy first: Healing given ×1.6 to ×2.9) | Triage, 2 AP | 8 · **43%** (32 · 173%) | 9 · **42%** (38 · 177%) | 12 · **47%** (44 · 173%) | 15 · **46%** (50 · 154%) | 19 · **50%** (56 · 148%) | 26 · **43%** (58 · 96%) |
| | a dose, 1 AP (a stim, a thrown stim) | 9 · **49%** (48 · 259%) | 11 · **51%** (57 · 265%) | 14 · **55%** (66 · 260%) | 18 · **56%** (75 · 231%) | 23 · **61%** (84 · 222%) | 31 · **51%** (87 · 145%) |
| | Rally, 2 AP, each ally, once a scene (rank III) | 9 · **49%** (32 · 173%) | 11 · **51%** (38 · 177%) | 14 · **55%** (44 · 173%) | 18 · **56%** (50 · 154%) | 23 · **61%** (56 · 148%) | 31 · **51%** (58 · 96%) |
| | Triage out of a fight, once an ally a scene (HP) | 24 (32) | 29 (38) | 37 (44) | 46 (50) | 57 (56) | 79 (58) |
| | Triage for one AP · the same character's steady Outburst heal for one AP | 21.5% · 25.2% | 21% · 27% | 23.5% · 28.5% | 23% · 27.8% | 25% · 29.8% | 21.5% · 25.5% |
| A medic all in (Healing given ×2.3 to ×2.9) | Triage, 2 AP | 11 · **59%** (46 · 249%) | 13 · **60%** (50 · 233%) | 15 · **59%** (54 · 213%) | 17 · **52%** (58 · 179%) | 20 · **53%** (58 · 153%) | 26 · **43%** (58 · 96%) |
| | a dose, 1 AP (a stim, a thrown stim) | 13 · **70%** (69 · 373%) | 15 · **70%** (75 · 349%) | 18 · **71%** (81 · 319%) | 21 · **65%** (87 · 269%) | 24 · **63%** (87 · 230%) | 31 · **51%** (87 · 145%) |
| | Rally, 2 AP, each ally, once a scene (rank III) | 13 · **70%** (46 · 249%) | 15 · **70%** (50 · 233%) | 18 · **71%** (54 · 213%) | 21 · **65%** (58 · 179%) | 24 · **63%** (58 · 153%) | 31 · **51%** (58 · 96%) |
| | Triage out of a fight, once an ally a scene (HP) | 34 (46) | 39 (50) | 45 (54) | 53 (58) | 60 (58) | 79 (58) |
| | Triage for one AP · the same character's steady Outburst heal for one AP | 29.5% · 36.3% | 30% · 35.7% | 29.5% · 35% | 26% · 32.3% | 26.5% · 30.8% | 21.5% · 25.5% |

### 4.3 The bands I used

| What | Band | Measured (a medic) | Why |
|---|---|---|---|
| **Triage** (2 AP, every turn, free) | for its AP, 75 to 95% of the same character's steady magic heal | 21 to 25% of a Soldier-turn an AP, against 25 to 30% for the Outburst: **83 to 87%** | "A bit under a magic healer's steady turn per AP": it needs no MP, no Strain, no line of sight and no set-up, so it should not also be the best rate |
| **A dose** (1 AP and a stim or a Supply) | about twice magic's rate for its AP | 49 to 61% for 1 AP | What bounds it is the kit. If a dose were under magic for its AP (about 20% of a Soldier-turn: 4 HP at level 1), an 80-credit stim would not be worth the pocket |
| A dose in anyone's hands | about a Whisper (30 to 40% in rules 1.20) | 17 to 32% | Anyone can carry one; its other job (stabilising, Bleeding) is unchanged |
| **Rally** | a dose to each ally in reach | 51 to 61% each (it is rank III: level 12 on) | Once a scene: it is a moment, not a rate |
| A medic's turn with one dose | about a Soldier-turn for half a turn | Triage and a dose: 91 to 111% for 3 AP | The medic keeps 3 AP for the weapon, for as long as the doses last |

### 4.4 Supplies, counted

1. **Stims:** the medic kit starts with 3; the soldier, Sigil and Soul kits with none. More are bought (80 credits), found or handed out. They do not come back at a rest.
2. **Supplies** (a Bard's resource, for Stim Throw and Field Surgery): 3 + 1 for every 2 points of Improvisation (3 to 8), refilled at a long rest; they carry over between fights.
3. So a medic has **6 to 11 doses between rests**: 3.3 to 6.7 Soldier-turns in all at a dose's 55%. One round of a standard fight brings about 4.4 Soldier-turns. Doses are a reserve for the fight that goes wrong, not a rate; Triage is the rate.
4. **Spare parts** (Field Repair): a charge each, carried as items.
5. Not changed: any count. With doses at a fifth of what they were, three stims are worth less than they were: if the kit should carry more, that is a number for the equipment step.

## 5. The Boss and the enemy table

**The targets** (rules 1.15, "The fit"; `fit.ts`): a standard fight (3 Soldiers, 1 Elite) **4 to 6 rounds**, an elite fight (2 Elites, 2 Soldiers) **6 to 8**, a boss fight (1 Boss, 2 Soldiers) **8 to 10**; the yardstick lasts **3 rounds** under half a standard fight's enemies; a standard fight won 9 times in 10 with someone Downed in 1 of 3.

### 5.1 The trap: do the rules 1.15 damage numbers still land on the 26 × 26 ground?

Until today an enemy 13 or 14 tiles off with a long gun never moved or fired, so the fit's "under fire" rows read 10 rounds at every level (item 1086). With that fixed, 30 fights a cell:

| The yardstick under two Soldiers: rounds it lasts · HP it loses a Soldier-turn · rolls a Soldier makes a turn | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Target |
|---|---|---|---|---|---|---|---|
| the 16 × 11 ground of the rules 1.15 fit (the sides 11 tiles apart) | 3.4 · 17.9 · 4.1 | 3 · 22.3 · 4.2 | 3.1 · 25.5 · 4.2 | 3 · 32.2 · 4.3 | 3.2 · 37.1 · 4.2 | 3 · 61.3 · 4.1 | 3 rounds |
| the 26 × 26 ground (13 tiles apart), the plain rifleman as he is (a Marksman) | 3.3 · 18.3 · 3.9 | 3.3 · 20.9 · 4 | 5.7 · 15.7 · 2.8 | 5.4 · 19.8 · 2.8 | 5.6 · 23.6 · 2.8 | 5.4 · 37.4 · 2.8 | 3 rounds |
| the 26 × 26 ground, the same rifleman with no Duck and Roll (a Fighter's class) | 3.4 · 17.8 · 3.9 | 3.3 · 21 · 4 | 3.5 · 24 · 4 | 4.1 · 26.4 · 3.9 | 3.8 · 33.2 · 4 | 3 · 66.7 · 3.9 | 3 rounds |

1. **Yes at levels 1 and 3:** 3.3 rounds, the same HP a Soldier-turn and nearly the same rolls a turn as on the old ground.
2. **From level 6 the plain rifleman lasts 5.4 to 5.7 rounds, and it is not the table.** The measurement's rifleman is a Marksman; at level 6 he gets Duck and Roll (rank II). The enemies stop at the edge of their sight (12 tiles), he rolls one tile back when a Burst comes, he is out of sight, and the Burst is lost ("can't attack: You can't see it"). A Soldier then makes 2.8 rolls a turn in place of 4.
3. **With no Duck and Roll** (the same sheet with a Fighter's class): 3.5, 4.1, 3.8 and 3.0 rounds at levels 6, 9, 12 and 20. So the table lands at 6 and 20 and is up to a round soft at 9 and 12 on the big ground (the enemies spend part of round 1 walking).
4. **Found, not changed:** Duck and Roll at the edge of sight cancels a Burst a round. It is a class move doing what it says; whether "out of sight" should be that cheap at 12 tiles is a question for the sight rules.
5. The fit tool's own "under fire" rows (`fit.ts`, which uses the Marksman) read 3.0, 3.4, 5.8, 5.5, 5.7 and 5.3 for the same reason; the tank 6.6 at level 1 and 9.5 to 10 after.

### 5.2 Whole fights, before and now

The fit's squad of four (optimised gun, tank, Sigil caster, Calls leader), normal share, enemies of the squad's level, 10 fights a cell (rules 1.15 used 60: read a cell as plus or minus a round). "Before" is this morning's game: the Boss at 960 HP, no healer weight, the sight fix in.

| Fight (rounds to win, open ground · ground with cover) | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Target |
|---|---|---|---|---|---|---|---|
| Standard (3 Soldiers, 1 Elite), before | 5.3 · 7.2 | 4.9 · 6.8 | 5.2 · 6.6 | 5.7 · 7.5 | 4.7 · 6.9 | 4.7 · 5.7 | 4 to 6 |
| Standard (3 Soldiers, 1 Elite), **now** | **5.3 · 6.3** | **5.3 · 7.2** | **4.6 · 6.6** | **5.1 · 7.6** | **5.5 · 6.1** | **4.4 · 5.9** | |
| Elite (2 Elites, 2 Soldiers), before | 6.0 · 7.0 | 5.9 · 7.6 | 6.3 · 7.1 | 6.2 · 8.4 | 6.8 · 8.4 | 5.7 · 6.1 | 6 to 8 |
| Elite (2 Elites, 2 Soldiers), **now** | **5.7 · 6.8** | **5.5 · 7.5** | **5.5 · 8.0** | **5.5 · 9.0** | **6.1 · 7.4** | **4.8 · 6.0** | |
| Boss (1 Boss, 2 Soldiers), before | 8.9 · 11.3 | 6.9 · 13.8 | 9.1 · 12.2 | 8.2 · 12.9 | 8.6 · 12.3 | 7.4 · 10.6 | 8 to 10 |
| Boss (1 Boss, 2 Soldiers), **now** | **7.6 · 11.4** | **6.3 · 11.7** | **6.3 · 11.5** | **7.2 · 10.2** | **7.1 · 10.9** | **7.7 · 8.9** | |

| Fight: won · fights with someone Downed (open ground; ground with cover) | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Standard (3 Soldiers, 1 Elite), before | 100% · 20%; 90% · 60% | 100% · 10%; 100% · 30% | 100% · 10%; 100% · 20% | 100% · 20%; 100% · 50% | 100% · 0%; 100% · 40% | 100% · 10%; 100% · 0% |
| Standard (3 Soldiers, 1 Elite), now | 100% · 30%; 100% · 60% | 100% · 20%; 100% · 20% | 100% · 0%; 100% · 40% | 100% · 0%; 100% · 10% | 100% · 0%; 100% · 20% | 100% · 30%; 100% · 30% |
| Elite (2 Elites, 2 Soldiers), before | 100% · 60%; 90% · 60% | 100% · 40%; 100% · 40% | 100% · 30%; 90% · 50% | 100% · 10%; 100% · 40% | 100% · 10%; 100% · 40% | 100% · 10%; 100% · 10% |
| Elite (2 Elites, 2 Soldiers), now | 100% · 40%; 100% · 40% | 100% · 30%; 100% · 50% | 100% · 10%; 100% · 50% | 100% · 0%; 80% · 60% | 100% · 10%; 100% · 30% | 100% · 0%; 100% · 20% |
| Boss (1 Boss, 2 Soldiers), before | 100% · 50%; 90% · 60% | 100% · 0%; 100% · 90% | 100% · 20%; 90% · 90% | 100% · 0%; 100% · 90% | 100% · 10%; 90% · 60% | 100% · 0%; 100% · 50% |
| Boss (1 Boss, 2 Soldiers), now | 100% · 40%; 100% · 90% | 100% · 10%; 100% · 70% | 100% · 0%; 100% · 80% | 100% · 10%; 100% · 40% | 100% · 20%; 100% · 90% | 100% · 10%; 100% · 40% |

1. **The Boss fight:** 6.3 to 7.7 rounds on open ground (average 7.0) and 8.9 to 11.7 with cover (average 10.8); before, 6.9 to 9.1 and 10.6 to 13.8 (averages 8.2 and 12.2).
2. **Why one number cannot do both.** On open ground this squad's Sigil caster deals 150 to 210 a turn and its gun 110 to 165. On the ground with cover (the game's real open ground: walls, debris, two lanes) the same caster deals 10 to 60 a turn, with whole turns of nothing, and the gun has turns with no line; and now and then a fight runs to the 20-round stop. In a trial at 760 HP the fight was 6.0 to 7.4 rounds in the open and 8.3 to 11.2 with cover (averages 6.8 and 10.2). By a line through the three numbers tried (760, 820, 960), this squad takes about 0.7 rounds for every 100 HP of Boss in the open and 1.0 with cover.
3. **What I fitted to:** the average of the two grounds at 9 rounds for the fit's squad. The simulator plays cover badly and a player will not (a good player's fight is nearer the open-ground number), and open ground gives the enemies nothing to hide behind (a real fight is longer than that number). 820 HP: about 7 and about 11. Across the three squads of section 5.3 the ground with cover averages 9.7 rounds at 820 HP, and open ground 6.9.
4. **Elite HP is left at 240.** The elite fight is 4.8 to 6.1 rounds in the open (a little short of 6 to 8) and 6.0 to 9.0 with cover (a little long at levels 6 and 9); the two grounds average 6.6. An Elite takes 6.9 to 7.8 of the yardstick's hits (target 6 to 8), so there is no room to raise its HP for the open ground, and lowering it for the cover ground would take the open-ground fight further under 6.
5. **The standard fight** is 4.4 to 5.5 rounds in the open and 5.9 to 7.6 with cover (target 4 to 6). Not changed: a Soldier is at 3.5 to 3.95 hits (target 3 to 4).
6. **Safety** has not moved: the standard fight is won in every cell, and someone is Downed in 0 to 60% of fights by level and ground.
7. **Rules 1.17's guard** (one Evoke leaves a full-HP Elite or Boss on 1 HP) reads max HP, so it moves with the number and needs nothing.

### 5.3 Other squads against the Boss

| Boss fight, by squad (rounds to win, open · cover; in brackets: fights with someone Downed, open · cover) | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| the fit's squad: optimised gun, tank, Sigil caster, Calls leader | 7.6 · 11.4 (40% · 90%) | 6.3 · 11.5 (0% · 80%) | 7.1 · 10.9 (20% · 90%) | 7.7 · 8.9 (10% · 40%) |
| a second gun (the plain rifle) in the caster's place | 7.0 · 10.2 (20% · 80%) | 7.4 · 8.4 (0% · 10%) | 7.3 · 9.0 (20% · 50%) | 7.6 · 7.9 (0% · 10%) |
| the Outburst caster in the caster's place | 6.2 · 10.4 (10% · 60%) | 7.9 · 9.8 (20% · 50%) | 5.8 · 9.6 (20% · 50%) | 5.9 · 7.7 (10% · 10%) |

1. **With a second gun or the Outburst caster in the Sigil caster's place, the boss fight on ground with cover is 7.7 to 10.4 rounds: inside the target** (they keep their lines where the simulator's Sigil caster loses them). Their open-ground fight is 5.8 to 7.9. So at 820 HP the ground a fight is really played on is on target for two squads of three, and long by a round or so for the squad whose caster the simulator plays worst.
2. Faith is not in these (rules 1.22 was being fitted while this ran): **pending.** By its targets a prayer-led character in the caster's place should sit near the plain-rifle row.

## 6. The enemy's Burst (the open question of rules 1.18)

Today a character's Burst is two rolls (the second at −4) and an enemy's is three with an Auto weapon (0, −1, −2), because the rules 1.15 damage factors were fitted with three. The question: give enemies the characters' Burst?

The yardstick and two others under fire on the 16 × 11 ground the table was fitted on, 30 fights a cell:

| Rounds it lasts (16 × 11 ground, 30 fights a cell) | The enemy's Burst | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | |
|---|---|---|---|---|---|---|---|---|
| the rifleman under two Soldiers | as built: three rolls, Soldier ×0.78, Elite ×1.05 | 3.4 | – | 3.1 | – | – | 3 | target 3 (rules 1.15: 3.0 to 3.3) |
| the rifleman under two Soldiers | two rolls (0, −4), the same factors | 4.4 | – | 4.3 | – | – | 4.4 | target 3 (rules 1.15: 3.0 to 3.3) |
| the rifleman under two Soldiers | two rolls, Soldier ×0.88, Elite ×1.08, Boss ×1.3 | 3.2 | 3.4 | 3 | 4 | 4.2 | 3.4 | target 3 (rules 1.15: 3.0 to 3.3) |
| the rifleman under two Soldiers | two rolls, Soldier ×0.96, Elite ×1.1, Boss ×1.35 | 2.7 | – | 2.6 | – | – | 3.1 | target 3 (rules 1.15: 3.0 to 3.3) |
| the rifleman under an Elite and a Soldier | as built: three rolls, Soldier ×0.78, Elite ×1.05 | 3.2 | – | 3.1 | – | – | 3.6 | target 3 (rules 1.15: 3.2 to 3.6) |
| the rifleman under an Elite and a Soldier | two rolls (0, −4), the same factors | 3.7 | – | 3.8 | – | – | 3.9 | target 3 (rules 1.15: 3.2 to 3.6) |
| the rifleman under an Elite and a Soldier | two rolls, Soldier ×0.88, Elite ×1.08, Boss ×1.3 | 3.2 | 3.8 | 3.3 | 4 | 4.6 | 3.5 | target 3 (rules 1.15: 3.2 to 3.6) |
| the rifleman under an Elite and a Soldier | two rolls, Soldier ×0.96, Elite ×1.1, Boss ×1.35 | 3 | – | 3 | – | – | 3.2 | target 3 (rules 1.15: 3.2 to 3.6) |
| the tank under two Soldiers | as built: three rolls, Soldier ×0.78, Elite ×1.05 | 6.6 | – | 10 | – | – | 8.3 | noticeably longer |
| the tank under two Soldiers | two rolls (0, −4), the same factors | 7.7 | – | 10 | – | – | 9.4 | noticeably longer |
| the tank under two Soldiers | two rolls, Soldier ×0.88, Elite ×1.08, Boss ×1.3 | 5.9 | 9.4 | 9.9 | 9.9 | 9.5 | 8.2 | noticeably longer |
| the tank under two Soldiers | two rolls, Soldier ×0.96, Elite ×1.1, Boss ×1.35 | 5.3 | – | 8.9 | – | – | 6.9 | noticeably longer |
| an idle caster (Class 1 armour) under two Soldiers | as built: three rolls, Soldier ×0.78, Elite ×1.05 | 0.9 | – | 1 | – | – | 1.4 |  |
| an idle caster (Class 1 armour) under two Soldiers | two rolls (0, −4), the same factors | 1.4 | – | 1.5 | – | – | 2 |  |
| an idle caster (Class 1 armour) under two Soldiers | two rolls, Soldier ×0.88, Elite ×1.08, Boss ×1.3 | 1.3 | 1.3 | 1.3 | 1.6 | 1.6 | 1.6 |  |
| an idle caster (Class 1 armour) under two Soldiers | two rolls, Soldier ×0.96, Elite ×1.1, Boss ×1.35 | 1.1 | – | 1.2 | – | – | 1.4 |  |

Whole fights with the middle trial (the fit's squad):

| With the two-roll Burst and Soldier ×0.88, Elite ×1.08, Boss ×1.3 (30 fights a cell; the Boss at 820 HP): rounds to win, open · cover (won; someone Downed) | Level 3 | Level 9 | Level 12 |
|---|---|---|---|
| Standard (3 Soldiers, 1 Elite) | 4.9 · 6.7 (100% · 100%; 10% · 23%) | 5.2 · 7.7 (100% · 97%; 3% · 23%) | 5.4 · 6.6 (100% · 100%; 17% · 30%) |
| Elite (2 Elites, 2 Soldiers) | 5.4 · 7.9 (100% · 100%; 23% · 37%) | 6.5 · 8.7 (100% · 93%; 23% · 57%) | 6.3 · 7.9 (100% · 100%; 27% · 43%) |
| Boss (1 Boss, 2 Soldiers) | 7.0 · 10.2 (100% · 87%; 27% · 67%) | 7.0 · 11.4 (100% · 97%; 13% · 63%) | 7.8 · 10.6 (100% · 93%; 23% · 73%) |

1. **With the characters' Burst and the factors as they are**, enemies deal about a quarter less to the rifleman and he lasts 4.3 to 4.4 rounds (target 3).
2. **Soldier ×0.88, Elite ×1.08 brings the three rounds back at levels 1, 3, 6 and 20** (3.0 to 3.4 under two Soldiers, 3.2 to 3.8 under an Elite and a Soldier), with the tank where it was (5.9 at level 1, 8.2 to 9.9 after) and a caster lasting a third longer (1.3 to 1.6 rounds under two Soldiers, against 0.9 to 1.4): fewer, bigger hits are kinder to no armour and no worse for heavy armour than I expected.
3. **At levels 9 and 12 it is a round soft:** 4.0 and 4.2 rounds under two Soldiers, 4.0 and 4.6 under an Elite and a Soldier. A higher factor fixes those and breaks levels 1 and 6 (at ×0.96: 2.6 to 2.7 rounds).
4. So one factor a tier does not hold the table at every level. Fitting it properly means fitting the level column's damage again at levels 7 to 14, and that column is also the level factor of every heal and shield in the game (rules 1.20 section 3) and the damage of Minions and Vermin, who fire no Bursts.

**Recommendation: one Burst for everyone, done together with the next fit of the level column; not now.** It is the better rule (a player sees a Soldier with the same rifle fire the same Burst, and the dice are on the screen), and the middle trial shows it is close. **Not built**, as asked: the table does not still fit afterwards. What is in the engine is a switch for the measurement (`burst.numbers.enemy_same` in `data/techniques.json`, not set), so the trial can be run again: `DEFENCE_PARTS=burst DEFENCE_BURST=old,0.88/1.08/1.3`.

## 7. Not met, and what is estimated

1. **The Boss fight is not inside 8 to 10 rounds on either ground for the fit's squad** (about 7 and about 11); on ground with cover it is for the other two squads (7.7 to 10.4). Sections 5.2 and 5.3; question 2.
2. **Standard and elite fights on ground with cover are long** (5.9 to 7.6 and 6.0 to 9.0 rounds). Not changed.
3. **A dose is over magic for its AP** (about twice). Deliberate; section 4.3.
4. **The Soldier's lean is nearly a hunt** for any healer with less HP than the squad. Section 3.1; question 1.
5. **Whole fights are 10 a cell** (the heal pass 16 under fire, rules 1.15 60 a fight): a cell is good to about a round. The Burst table and the yardstick table are 30 a cell.
6. **Estimates, not measurements:** "0.7 rounds for every 100 HP in the open and 1.0 with cover" and the 720 HP numbers in question 2 (a line through three points: 760, 820 and 960 HP, 10 fights a cell each); "6 to 11 doses between rests" (3 stims and 3 to 8 Supplies, by arithmetic); everything in the price list of section 2.1 except the medic's rows is rules 1.20's arithmetic on real sheets, not simulated casting.
7. **Not played by the simulator:** a healer who uses cover or stays out of sight; a Taunt protecting the healer; an enemy caster or an enemy Call against a squad with a healer; Faith in any squad; the hunt on a real map (it is pinned by two tests on small grounds).
8. **Not measured:** Rally; Field Repair on an ally; Triage out of a fight (the ×3 is a judgement: about what the old 20 gave a level 1 to 9 medic, and more after).

## 8. What I added that was not asked

1. **Split on a heal or a shield ×0.8 each.** Asked for in kind ("an area heal … fix it through AP cost or the amount"), but nobody named Split; rules 1.20 had flagged it (item 1244).
2. **Triage out of a fight is three times a fight's Triage.** Without it the story Triage (once an ally a scene) would have dropped from 32 HP to 8 at level 1 with the fit, which makes the action pointless out of a fight. The 3 is my number (item 1306).
3. **Field Repair on an ally** (Field Surgeon) got the same fit, 10 a point to 3 a point with the level factor: it was 162% of a Soldier-turn at level 1 with Improvisation 3.
4. **The hunt** (an Elite or a Boss with a gun steps for a line on the healer). The ask was a target weight; "Elites and Bosses hunt" was the lead's phrase and a weight alone never makes anybody move.
5. **The cover rule** (no weight under half the best chance to hit): "cover still applies" needed a number.
6. **One line in the AI Narrator's prompt**, so it narrates the enemy turning on the healer as the enemy's choice.
7. **A fourth squad in the measurements** (a healer in it), the tank and healer rows, and the medic's policy for the simulator (Triage, one dose a turn, then the weapon).
8. **`enemy_same`,** the measurement's switch for the enemy's Burst (off).

## 9. Found on the way

1. **A technique goes at the first character in the fight's list** (item 1315). The comment on the enemy's turn says "shoot the most hurt"; that is true of a plain attack only, and most of a Soldier's fire is Bursts. Not changed (it would change every fight). With a healer marked the technique goes at the healer.
2. **Duck and Roll at the edge of sight** (section 5.1): a Marksman 12 tiles from an enemy cancels a Burst a round by rolling out of its sight.
3. **An idle caster lasts 0.9 to 1.4 rounds under two Soldiers** (115 HP at level 1, a Soldier-turn of 42 HP on Class 1 armour). Rules 1.20 said "about twice the rifleman's"; measured it is 2.3 times at level 1 and 1.6 at level 20. This is what makes the healer weight bite so hard, and it is armour's question (Equipment 2.0), not this step's.
4. **Prayer (not mine; seen):** Warm Hands is 13 now (rules 1.22), so a turn with Warm Hands and Health is 109 to 132% of a Soldier-turn for 4 AP: over the medic's Triage and a dose (91 to 111% for 3 AP) and level with the Outburst healer's 6 AP. With the Hymn on a cooldown that is a turn in two or three, not every turn. Hold the Gate has its own wait now (item 1287): with no round limit it was the one thing I would have flagged.
5. **A class is earned at level 3:** the "medic" of the level 1 rows has no Triage. Nobody has an every-turn non-magic heal at levels 1 and 2.

## 10. Questions for Leon

Each with what I recommend, which is what is built unless it says otherwise.

1. **How hard should a Soldier turn on the healer?** Built: Soldiers lean (the healer counts as hurt by half of their max HP more), Elites and Bosses go for the healer first. Because enemies sort by HP left and a caster has the least, a Soldier's lean already means "shoot the healer" for a caster-healer; in the open with no cover she is the first one Down, and at level 1 healing in the open is worse than not healing. **Recommended: keep it for the playtest.** It is what you ruled, it is told to the player in the log, and the answers are the game's own: a tank in front, cover, staying out of sight. The dial is one number a tier (`healer_focus`): 0.25 or 0 for Soldiers would leave the hunting to Elites and Bosses.
2. **The Boss: 820 HP, about 7 rounds in the open and about 11 with cover** for the fit's squad (7.7 to 10.4 with cover for the gun and Outburst squads). One number cannot put both grounds inside 8 to 10. **Recommended: 820** (the two grounds average 9, and the ground with cover is on target for two squads of three). If the ground with cover has to be inside 8 to 10 for the fit's squad too, the number is about 720 (about 6.5 rounds in the open and 9.8 with cover: an estimate, not measured); if the open ground is the one to hold, it stays 960 and cover is 12.
3. **The enemy's Burst.** **Recommended: one Burst for everyone, with the next fit of the level column; not built now** (section 6). Until then a Soldier's Burst rolls three times and a character's twice.
4. **A dose is about twice magic's rate for its AP** (49 to 61% of a Soldier-turn for 1 AP in a medic's hands), bounded by 6 to 11 doses between rests. **Recommended: keep.** If a dose should also be under magic, it is 3 (25 to 30%), and then the kit should carry more of them.
5. **Triage out of a fight is three times a fight's Triage.** **Recommended: keep** (a medic patches up 24 HP at level 1, 37 at level 6, 79 at level 20, once an ally a scene). The other way is one number in and out of a fight, which leaves 8 HP at level 1.
6. **Duck and Roll at the edge of sight** cancels a Burst a round. **Recommended: leave it and watch it in the playtest;** if it shows, the fix is in the enemy (walk one tile closer than the edge of its sight), not in the move.
7. **Enemy techniques go at the first character in the list, not the most hurt.** **Recommended: fix it with the next enemy fit** (sort a technique's targets as a plain attack's are). It makes enemies focus fire, so it moves the "three rounds under fire" numbers and cannot be slipped in alone.
8. **The level 1 and 2 medic has no Triage** (no class yet). **Recommended: nothing now;** it is the class-at-level-3 rule's price, and three stims cover a first session.

## 11. Files, and how to run

| File | What |
|---|---|
| `docs/rules/PHC-Core-Rules-v1.0.md` | "Rules revision 1.23"; section 14 items 1300 to 1322; the withdrawal note in rules 1.20 (its section 7, its intro, items 1240, 1244, 1245; items 1079 and 1086 point here) |
| `data/rules.json` | `mending.round_limit` (withdrawn), `mending.medic`, `mending.tending`, the `mending.text` |
| `data/enemies.json` | the Boss's `hp` 820; `healer_focus` on every tier |
| `data/classes.json`, `data/items.json`, `data/perks.json`, `data/soul_modules.json` | Triage, Stim Throw and Rally (numbers and card texts); the stim injector's text; Field Surgeon's text; Split's `boon_mult` and text |
| `packages/engine/src/effects/mending.ts`, `effects/damage.ts`, `effects/index.ts` | the limit removed; `noteTended`, `tendedLately`; the medic's numbers |
| `packages/engine/src/combat.ts` | `healerFocus`, `healerMark`, the weight in `enemyTargets`, `enemyHuntTile`, the log line, `Intent.why`; `stimHeal`; the Burst switch |
| `packages/engine/src/physical/ai.ts` | a technique tries the healer first |
| `packages/engine/src/classes/i.ts`, `classes/rev3.ts`, `perks/e.ts`, `magic.ts` | Triage, Stim Throw, Rally, Field Repair on an ally, Split |
| `apps/web/src/game/commands.ts`, `apps/web/src/screens/main.js`, `apps/web/src/narrator/context.ts` | the stim's two texts; the Narrator's line |
| `data/CONVENTIONS.md`, `docs/design/handoffs/README.md` | `healer_focus` and the two new `mending` blocks; this hand-off's row |
| `packages/engine/test/rules123-defence.test.ts` (new) | the rules, 19 tests |
| `packages/engine/test/balance/defence-measure.ts`, `defence-measure.test.ts` (new) | the instruments; 6 cheap tests in `npm run check`, the full runs behind `DEFENCE_MEASURE=1` |
| `packages/engine/test/rules120-heal-shield.test.ts`, `balance/heal-measure.ts` and `.test.ts`, `enemy-levels.test.ts`, `classes-i.test.ts`, `classes-rev3.test.ts`, `classes-rev3-moves.test.ts`, `perks-e.test.ts` | edited to the new numbers; each says rules 1.23 where it does |

```
npm run check                                     everything
npm run check -- -t "rules 1.23"                  the rules
DEFENCE_MEASURE=1 npx vitest run --root packages/engine test/balance/defence-measure.test.ts --silent=false -t measured
    DEFENCE_PARTS=medic,yard,fights,fire   DEFENCE_N=10   DEFENCE_LEVELS=1,6   DEFENCE_SQUADS=sigil,healer
    DEFENCE_FIGHTS=boss   DEFENCE_MAPS=cover   DEFENCE_ROWS=medic   DEFENCE_FOCUS=off   DEFENCE_OUT=<file>
    DEFENCE_TABLE='{"tiers":{"boss":{"hp":700}}}'                 a trial table
    DEFENCE_PARTS=burst DEFENCE_BURST=old,0.88/1.08/1.3           the enemy's Burst, tried
```

The tables here took about an hour on a busy 4-core machine (whole fights about half a minute a cell at 10 fights).

**`npm run check` at the end of this session:** validator 0 errors; engine types clean; web types clean; engine tests **3,253 passed** (24 skipped; 3,204 before this session and the Faith session's); web tests **986 passed, 1 failed**: `apps/web/src/game/heartView.test.ts` "Overdraw is offered every turn …". That file's source (`apps/web/src/game/heartView.ts`) was being edited by another session at the time (uncommitted, not mine; the test passed in my run ten minutes earlier). During the session the Faith session's own tests were red for a while (`faith.test.ts`, `perks-d.test.ts` True Believer, `rules120-heal-shield.test.ts` "prayer: the bases", `balance/heal-measure.test.ts` "prayer: a Whisper …": Warm Hands 10 against 13) and were green again by the last run; I did not edit them. `apps/web/src/narrator/faith-context.test.ts` (the Narrator prompt's size, under 25.6k) went 45 tokens over with my first, longer Narrator line; the line is one short sentence now and the test passes without moving its limit.

**Not run:** no browser suite (none was edited: a search of `apps/web/e2e` found no number this revision changes); `npm run build`; the screen data (`python3 design/canvas-build/build.py --web`), so `apps/web/src/game/protodata.json` still shows the old Triage, Stim Throw and Rally texts.
