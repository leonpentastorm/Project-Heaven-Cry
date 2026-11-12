# The MP rework (rules 1.24)

12 Nov 2026. Spec: `docs/rules/PHC-Core-Rules-v1.0.md`, "Rules revision 1.24", and section 14, items 1340 to 1353.
Tests: `packages/engine/test/rules124-mp.test.ts` (22). Measuring tool: `packages/engine/test/balance/mp-measure.test.ts`.
This is about a character's **MP** (what an Emanator holds), not the battlefield's mana meter. No damage number was changed.

Leon's words: "MANA. Pumps should cost you more mana as a gentle modifier, endgame character have like a thousand. Also
MP sitting on Virtue is a bit fucked, faith class don't use mana at all, physical class that want prayer spec into mana
for no reason and pure OB mage need virtue in them even though their class fantasy have nothing to do with that, several
of the archetype shows this."

## 1. What was built, in four lines

1. **Max MP = 100 + 75 × (Determination − 1) + 25 × (Insight − 1).** 100 with neither, 1,000 with both at 10. Virtue gives none.
2. **A Pump costs MP: a tenth of what the Begin cost, for each stage it reaches** (10%, 20%, 30%, 40%). A full heart
   costs the Begin's price twice over. A free Pump still owes it. The swell costs none. Short of MP, the Pump is refused.
3. **Seven archetypes re-spread** (section 8). Old saves keep their share of the pool (section 10).
4. **The fitted damage tables did not move** for the normal-share caster. The all-in rows rose, because the old all-in
   caster was running out of MP (section 7).

## 2. The finding that changes the brief

The brief said the pool dwarfs the costs (1,000 MP at Virtue 10 against a 21 MP Begin). That is true of a character
with Virtue 10, and that character is not a caster. Measured on the reference builds:

| Who | Virtue | Max MP, every level | What a fight took |
|---|---|---|---|
| Outburst caster, normal share | 3 | 300 | 234 MP in 8 turns of steady play: 78% of the pool |
| Outburst caster, all in | 2 | 200 | 216 to 250 MP in 8 turns: over the pool, 1 to 3 Syphons |
| Soul healer (Bard, Empathy first) | 1 | 100 | 72 to 80 MP in one fight under fire at levels 6 to 20 |
| Faith build, calls leader | 7 to 10 | 700 to 1,000 | 0 |

So MP was already tight for the people who use it and enormous for the people who don't. The pool never grew with a
caster's level, because nothing a caster raises raised it. Moving it is most of the fix; the Pump price is the gentle part.

## 3. Inventory: everything that reads or changes MP

**The pool and what fills it**

| What | Rule | Where |
|---|---|---|
| Max MP | was 100 + 100 × (Virtue − 1); the `mp_max` stat can be changed by an effect (`stat_mod`, `stat_mult`), and no item in the data does | `character.ts` `maxMp` |
| Holding it | only an Emanator carried holds MP; it pays only from a hand; no Emanator, no MP | `mpNow`, `magicOf` |
| First value | full, the first time an Emanator is carried | `mpNow` |
| Long rest | full, if the air is Normal or richer (Thin: nothing); Insomniac's Wired: half | `game.ts` `applyRest`, `perks/h.ts` |
| A new session | full (Wired: half) | `game.ts` `beginSession` |
| Short rest | nothing | |
| Syphon | 1 AP: 10 / 20 / 30 / 40 MP by the air's band × (1 + 10% × (Determination − 1) + 10% × Will Power); the meter −2 | `magic.ts` `syphon` |
| Closed Loop (shelved class) | Vent into the heart: 10 MP a Flux | `classes/k.ts` |
| Drink It In (Guardian II) | an enemy spell on your shield: its MP price back (10 a Sigil word) | `classes/i.ts` |
| The Quartermaster | your MP hits 0: 25% of Max MP back, as an intervention | `faith.ts` |
| Proving Ground refill | full | `game.ts` |

**What spends it**

| What | MP | Notes |
|---|---|---|
| Begin | school 20 (Control 25) + modules (−10 to 20 each, most 10 to 20) + 10 a second school + 5 an element tone; × the band (Thin 1.5, Normal 1, Rich 0.75, Flooded 0.5) × (1 − 5% × (Insight − 1)); 5 at least; +20% under a Right Brain Debuff | `designCost`, `previewOutburst` |
| Pump | **was 0**; now 10% of the Begin × the stage reached | `pumpMp` |
| Release, Steady, Let go, Feed, the swell, Crystallise | 0 | Crystallise takes 10 from the meter, not MP |
| Storm Front (Channeler II) | +10 at Begin | |
| Twin Souls (perk) | +20 for a third school | |
| Will Shield (Guardian I) | 20 × the band | from the air without an Emanator (+2 Strain) |
| Sanctuary (Guardian III) | 60 | |
| Inspire (Bard I) | 10 | 2 Strain without an Emanator |
| Moves of shelved classes or not on a class now | Puppet 60 (Hexer), Inner Charge 20, Gauntlet Infusion 5 a hit, Self-Crystallise 100, Gift (the design's price) | |

**What changes a price:** Insight (−5% a point), the band, a Right Brain Debuff (+20%), Beloved Spells (−30%), Fed
(−10% a gauge point), Dread (−5), Upper-Touched (×0.8), a Seal (×2 inside it), The Twin Pays (a Begin for nothing, once
a fight), Heart Overload (the free Begin paid in HP, 1 HP a point, when the MP is short).

**What happens at 0 MP:** a Begin is refused ("Syphon first"). Nothing else: a Mana Short is about Strain, not MP, and
does not touch MP. Overdraw is about Strain too.

**Enemy casters:** 80, 140 and 220 MP for the Soldier, Elite and Boss casters, flat at every level. They pay their
Begins from it and Syphon when short. Their Pumps cost nothing (unchanged).

**Sigil users never touch MP.** A Mage or a Trickster burns core charge and vents Flux; "mana" for them is the meter.

**What the client shows:** the MP bar under HP (the You card, the area-map HUD, the turn cut-in: `resources.ts`),
the sheet's Max MP line (`derived.ts`), a design card's Begin price, the Narrator's context line (`MP 240/600`). Until
now nothing showed a Pump's MP, because there was none.

**Everything else Virtue gives:** the cap on Faith, Conscience and Authority; the Guardian (class at level 3, rank II at
Virtue 5, rank III at 8); −0.25 of a round on the wait between Hymns a point (rules 1.22); and Self-Crystallise's cap
of one core a point (its class is shelved). That is all. See section 9.

## 4. Where MP sits now, and why

**Max MP = 100 + 75 × (Determination − 1) + 25 × (Insight − 1).**

1. They are the Outburst's own two attributes: Will Power is Determination's alpha, Empathy is Insight's.
2. Determination leads (three quarters of the pool), so the Emanator belongs to the Channeler first.
3. Insight's quarter is the healer's floor. A Bard who leads with Empathy and holds Determination 1 has 250 MP at
   Insight 7 and 325 at Insight 10.

| | Determination 1 | 4 | 7 | 10 |
|---|---|---|---|---|
| Insight 1 | 100 | 325 | 550 | 775 |
| Insight 4 | 175 | 400 | 625 | 850 |
| Insight 7 | 250 | 475 | 700 | 925 |
| Insight 10 | 325 | 550 | 775 | 1,000 |

**The alternatives**

| Option | Verdict | Why |
|---|---|---|
| Determination alone, 100 a point (the lead's lead) | rejected | The Soul healer of the heal fit holds Determination 4 and would have 400, fine; a healer who puts nothing in Determination has 100, and so does every Guardian. It also makes Insight's −5% a point the only thing Insight does for a caster |
| The Soul Core | rejected | Since rules 1.13 a Core is not bought: it is the highest attribute of its family. A pool on the Soul Core is Virtue again for anyone whose highest Soul attribute is Virtue. (My first build was 50 × Soul Core + 50 × Determination; a Virtue 10 prophet had 550 MP) |
| Insight alone | rejected | The blaster would need Insight first |
| Level only, or a level term | rejected | Gives MP to a Defender with no Soul at all; the pool stops saying anything about the build |
| Will Power and Empathy (the skills) | rejected | Every other pool reads an attribute |
| A split, Determination and Insight | **built**, 75 and 25 | 60 and 40 and 50 and 50 were weighed: at 50 and 50 an Insight 8 healer has the same pool as a Determination 8 blaster, which is not what "the Emanator's own" means |

**Against the brief's criteria**

1. A Faith build and a physical build that take Virtue for prayer: no MP from it. A Virtue 10 prophet has 100 (200 with the Insight 5 the preset now holds).
2. A pure Outburst mage needs no Virtue: Determination 10 alone is 775.
3. The Empathy-first healer: the reference Soul healer's pool goes from 100 to 400, 475, 550 and 700 at levels 1, 6, 12 and 20. Under fire it spends 54 to 163 MP a fight: 14 to 28% of the pool. (Before: 72 to 80 of 100.)
4. Sigil users: untouched.
5. **One thing that is worse:** a Guardian. Its Will Shield (20 MP) and Sanctuary (60 MP) used to draw on 100 × Virtue. A Guardian with no Determination or Insight now has 100 MP: one Sanctuary and two Will Shields, then Syphon at 20 MP an AP. Leon's "faith class don't use mana at all" is not quite true of the class as written. Not changed; question 3.

## 5. The pool by level

The reference Outburst caster (its sheet from `builds.ts`; Determination / Insight / Virtue in brackets).

| | Level 1 | 3 | 6 | 9 | 12 | 20 |
|---|---|---|---|---|---|---|
| Normal share, before | 300 (4/4/3) | 300 | 300 | 300 | 300 | 300 (10/6/3) |
| Normal share, now | **400** | **475** | **550** | **625** | **775** | **900** |
| All in, before | 200 (7/3/2) | 200 | 200 | 200 | 200 | 200 (10/10/2) |
| All in, now | **600** | **675** | **750** | **850** | **900** | **1,000** |
| Soul healer (normal share), before → now | 100 → 400 | 100 → 425 | 100 → 475 | 100 → 500 | 100 → 550 | 100 → 700 |

"Endgame characters have like a thousand" is now true of the endgame caster, and only of the caster.

## 6. The Pump's price

**10% of the MP the Begin cost, × the stage the Pump reaches.** Rounded, 1 MP at least.

| A Begin of | Stage 1 | 2 | 3 | 4 | A full heart, Begin included |
|---|---|---|---|---|---|
| 21 MP (Heart Bolt, this build) | 2 | 4 | 6 | 8 | 41 |
| 30 MP | 3 | 6 | 9 | 12 | 60 |
| 45 MP | 5 | 9 | 14 | 18 | 91 |
| 70 MP (four modules, a second school, a tone, Insight 6) | 7 | 14 | 21 | 28 | 140 |

The answers to the brief's design questions:

1. **Flat, rising, or a share?** A share of the Begin, rising with the stage. "A gentle modifier" on the spell's own
   price. It means every discount and surcharge that already exists is in the Pump with no new rule, a cheap design
   pumps cheaply, and a loaded one does not.
2. **A feeling Pump:** the same MP as a plain one. Feelings already have their own prices (Strain, HP); a second price
   would change which feeling is best.
3. **The free Pump of the turn:** free of AP only. Its MP is owed.
4. **The swell:** no MP. Holding is the thrifty way to fill a heart, which is a real choice now: time or mana.
5. **Revert Pump:** gives the MP back.
6. **Overdraw:** two stages, both paid for. **Heart Overload:** a free Begin paid in blood cost 0 MP, so its Pumps cost 0.
   Heart Overload II's stage 1 is not a Pump. **The Twin Pays:** the same, 0.
7. **Can't pay:** refused, with the reason. No Strain, no Short.
8. **No Emanator in hand:** the heart draws on the air; no MP for a Pump (the Begin's +2 Strain is the price).
9. **The meter:** a Pump's MP does not move it. A Begin lowers the meter by MP ÷ 10; had Pumps done the same, a full
   heart would take the air from Normal to Thin in two casts and the fitted tables would all move.

**What was measured and thrown away:** 5 MP × the stage reached (5, 10, 15, 20). Readable, and too much: the level 1
to 9 caster ran dry inside 8 turns and those rows of the fitted table fell 7 to 12%.

## 7. MP spent, before and after

Simulator policies (they read the engine's previews, so they pay what the engine charges). 8 fights a cell. Heart
Bolt only: the cheapest damage design.

**Normal share**

| | Level 1 | 3 | 6 | 9 | 12 | 20 |
|---|---|---|---|---|---|---|
| A Release in steady play: before → now | 29 → 46 | 29 → 54 | 29 → 57 | 29 → 58 | 29 → 58 | 25 → 49 |
| 8 turns of steady play, before (of 300) | 234, 78% | 234, 78% | 234, 78% | 234, 78% | 234, 78% | 197, 66% |
| the same, now | 364, 91% | 432, 91% | 453, 82% | 466, 75% | 464, 60% | 395, 44% |
| 8 turns, stage 4 with plain Pumps every time, before | 202 | 234 | 234 | 234 | 234 | 197 |
| the same, now | 365, 91% | 398, 84% | 435, 79% | 458, 73% | 456, 59% | 395, 44% |
| A fight against two Soldiers (2 to 3 turns), before | 39, 13% | 45, 15% | 43, 14% | 47, 16% | 57, 19% | 43, 14% |
| the same, now | 75, 19% | 87, 18% | 85, 15% | 92, 15% | 111, 14% | 88, 10% |
| Three such fights with no rest, now | 56% | 55% | 46% | 44% | 43% | 29% |

**All in**

| | Level 1 | 3 | 6 | 9 | 12 | 20 |
|---|---|---|---|---|---|---|
| 8 turns of steady play, before (of 200) | 250, 3 Syphons | 216, 1 | 216, 1 | 234, 2 | 197 | 147 |
| the same, now | 435, 73% | 500, 74% | 498, 66% | 464, 55% | 395, 44% | 288, 29% |
| A fight against two Soldiers, before → now | 43 → 86 | 40 → 81 | 56 → 112 | 32 → 62 | 33 → 68 | 19 → 39 |

(A Release costs more than the Begin's 21 because the caster's own Begins thin the air: the meter falls by 3 a cast,
and Thin air is ×1.5. That feedback was already there.)

How to read it:

1. **A normal fight never leaves a sensible caster dry:** 10 to 19% of the pool.
2. **A long fight of nothing but full hearts visibly drains it:** 73 to 91% at levels 1 to 9. Nobody Syphons yet, on
   the cheapest design.
3. **The design is the dial (arithmetic, not measured).** MP spent grows in step with the Begin's price, because the
   Pump is a share of it. A design of 45 MP is 2.1 times these numbers: 8 turns at level 6 is about 970 MP against 550.
   A loaded level 20 design of 70 MP is 3.6 times: about 1,400 against 900, and a short fight is a third of the pool.
   Lean designs all day, loaded ones managed with Syphon, the air and the next rest: that is where MP matters.
4. **The all-in caster has more staying power than a dabbler:** 1,000 against, say, 275 (Determination 3, Insight 2).
5. **At level 20 on the starter design MP is loose (44%, 29% all in).** I left it: tightening it there means tightening
   level 1, where the Begins alone are 58% of the pool in 8 turns.

**The damage tables** (`outburst-measure`, part `rows`, 12 fights a cell, percent of the plain rifle; before is the
tree at commit 50f165f, now is this tree; same seeds).

| Row | Before: levels 1, 3, 6, 9, 12, 20 | Now |
|---|---|---|
| Normal, steady, a new caster | 107 126 123 114 154 132 | the same |
| Normal, steady, the early feelings | 133 140 140 122 171 143 | the same |
| Normal, steady, all 25 | 131 135 148 143 163 173 | the same |
| Normal, the biggest Release (all 25) | 80 110 153 161 183 171 | the same |
| Normal, the biggest Release (early) | 73 73 71 134 160 148 | the same |
| Normal, stage 2, plain Pumps | 88 90 117 95 119 124 | 88 90 117 **96 120** 124 |
| Normal, stage 4, plain Pumps | 79 87 87 86 108 122 | the same |
| All in, steady, a new caster | 201 184 194 153 161 138 | **210** 184 **196 183** 161 138 |
| All in, steady, the early feelings | 201 255 225 172 199 156 | **212** 255 **227 200** 199 156 |
| All in, steady, all 25 | 211 220 236 178 219 145 | **224** 220 **239 206** 219 145 |
| All in, the biggest Release (both rows) | 271 261 237 228 227 190 · 223 221 208 175 175 148 | the same |
| All in, stage 2, plain Pumps | 172 190 164 163 153 141 | **189 182 173** 162 153 **151** |
| All in, stage 4, plain Pumps | 152 177 159 144 134 113 | 152 177 **160 145** 134 113 |

The normal share is untouched. **The all-in rows rose because the old all-in caster spent AP on Syphon** (200 MP).
Level 9 steady play is up 28 to 30 points. Whoever re-fits the all-in ceilings starts from the right-hand column.

## 8. The archetypes

Every preset still spends 10 Skill and 10 Attribute points, with each skill at or under its attribute and no
attribute over 7 (pinned in the test). Cores are not bought since rules 1.13; `cores` follows the attributes.

| Preset | Before | Now | Max MP | Class it leans to | Why |
|---|---|---|---|---|---|
| Stormcaller | Expression 4, Insight 3, Determination 4, Virtue 3 | Expression 4, Insight 4, Determination 5 | 300 → 475 | Channeler (was Channeler or Trickster) | Virtue was there for MP |
| Mender | Endurance 3, Insight 5, Virtue 5 | Endurance 3, Insight 5, Determination 5 | 500 → 500 | Bard or Channeler (was Bard or Guardian) | Virtue was there for MP |
| Troubadour | Expression 3, Insight 5, Virtue 5 | Expression 3, Insight 5, Determination 3, Virtue 3 | 500 → 350 | Bard (was Bard or Guardian) | Authority 3 needs Virtue 3; the other two points were MP |
| Heartreader | Insight 7, Determination 3, Virtue 3 | Insight 7, Determination 5 | 300 → 550 | Bard | Virtue was there for MP |
| Unbroken | Insight 3, Determination 7, Virtue 3 | Insight 5, Determination 7 | 300 → 650 | Channeler | Virtue was there for MP |
| Zealot | Strength 3, Determination 5, Virtue 5 | Endurance 3, Strength 3, Agility 3, Virtue 5 | 500 → 100 | Guardian (was Channeler or Guardian) | prays and shoots; Determination would give it MP it can't use |
| Prophet | Insight 3, Determination 3, Virtue 7 | Insight 5, Virtue 7 | 700 → 200 | Guardian | the same; an all-in Soul build has to put its 4 spare points in Insight or Determination, and Insight is the smaller pool |

The Witch needed no change and is the clearest case of the old problem: Will Power 4, Virtue 1, **100 MP**. Now 500.

**Left alone:** Confessor, Captain, Enforcer, Crusader (their Virtue holds Faith, Conscience or Authority). Nine
presets hold Determination with no Will Power or Empathy (Bulwark, Brawler, Berserker, Monk, Spy, Sentinel, Scholar,
Captain, Harbinger): they now have 250 to 500 MP that shows nowhere unless they pick up an Emanator. That Determination
is there for the character (grit, Composure, Lore Master), not for mana, so I did not move it.

**One Faith test followed:** `perks-d.test.ts` (True Believer) built its caster from the Stormcaller and read a Hymn
wait that needed its Virtue 3; the test now sets Virtue 3 itself.

`tools/archetype_fill.py` does not run and has not since rules 1.13 (it still looks for Core points). The seven were
set by hand; I brought its role list in line and left the script broken, as I found it.

## 9. What Virtue is left with

1. The cap on **Faith, Conscience and Authority**.
2. **The Guardian:** the class at level 3, rank II at Virtue 5, rank III at 8.
3. **A quarter of a round off the wait between Hymns, a point** (9 − 0.75 × Faith − 0.25 × Virtue; rules 1.22).

It is thin: one number of its own, where every other attribute has two. I added nothing. If it wants one back, the
natural home is **Blessing power**, the only multiplier with no attribute term (1 + 0.1 × Faith; Sigil, Soul, weapon,
Elemental and Healing all read an attribute as well as a skill). That belongs to the next Faith fit: it moves every
prayer's number.

## 10. Old saves

`mpRev` 124 on the character (`migrateCharacterMp`, called with the other migrations at the top of `apply`).

1. An Emanator keeps the **same share** of the new pool that it held of the old one: full stays full, half stays half. Rounded, never above the pool.
2. The units of a fight in progress follow, on the same action.
3. One line in the story for each character who carries an Emanator: "Vale's Emanator now holds up to 550 MP (it was 300): Max MP comes from Determination and Insight now, not Virtue (rules 1.24)."
4. A character whose MP was never written stays "always full". A new character is stamped and never moved.

Pinned in `rules124-mp.test.ts` ("old saves", three tests). `apps/web/e2e/old-save.mjs` checks that an old save opens
without an error; nothing in it reads MP. Not run.

## 11. On screen

1. **The Pump button** shows its MP before the click: "1 AP · 4 MP". A free Pump that owes MP reads "0 AP · 4 MP" (still green); "FREE" only when it takes neither. The tooltip: "A plain Pump: stage 1 → 2 (×1.2). It takes 4 MP (you have 380)."
2. **Each feeling button** shows the same price.
3. **Refused:** "✕ A Pump to stage 2 needs 4 MP (3): Syphon first, or Release what you hold".
4. **A design card** adds "full heart 41 MP".
5. **Revert's** tooltip names the MP. The MP bar's hint says a Begin and every Pump spend it.
6. The sheet's Max MP line reads "Determination and Insight"; the attribute cards read "+75 max MP" and "+25 max MP"; Virtue's reads "Hymns come back a little sooner".
7. The engine's own numbers throughout: `previewPump().mp`, `previewOutburstPlan().mp` (the Begin plus the Pumps planned), the `pump` fx event carries `mp`.

Files: `heartView.ts` (+ test, 1 new test), `feelingsView.ts`, `resources.ts`, `derived.ts`, `screens/shared.js`, `create-points.test.ts`, `narrator/context.ts` (three words, "costs MP too": a full sentence put the prompt over its size cap in `faith-context.test.ts`).

## 12. Not met, estimates, and what is flagged

1. **"Over a session MP is something you manage"** is met for a caster with a real design and only loosely for the starter design (three short fights: 29 to 56% of the pool). The "loaded design" numbers are arithmetic from the Begin's price. The simulator plays only Heart Bolt.
2. **The simulator's fights against two Soldiers last 2 to 3 turns.** A fight of the target length (4 to 6 rounds) would spend about twice the "a fight" row. An estimate.
3. **The Twin's Pumps are free of MP** (its Begin is paid from its caller's MP). Generous; left until Twinbound comes back.
4. **Enemy casters' Pumps are free of MP.** Their 80 / 140 / 220 were fitted on Begins alone.
5. **A Right Brain Debuff that lands after the Begin** does not raise that Outburst's Pumps (the Pump reads the price paid).
6. **The Quartermaster's 25% of Max MP** is a bigger number on a caster's bigger pool, and a smaller one on a Guardian's. Faith's file; not touched.
7. **Self-Crystallise's cap** is still "one core a point of Virtue" (shelved class).
8. **The heal fit's tables** were measured with the Soul healer on 100 MP (72 to 80 spent a fight: it never ran dry in one fight). They should not move; I did not re-run them.
9. **Browser suites: none run, none edited.** By search, none pins a number this changes (`magic.mjs` reads "/ 100 MP" on a Sigilist with Determination 1 and Insight 1: still 100).
10. `npm run build`, `npm run e2e`, deploy, versions and CHANGELOG: not touched, as asked.

## 13. Added without being asked

1. `mp-measure.test.ts`: the pool, the price and the MP spent, by level and variant. `MP_MEASURE=1 npx vitest run --root packages/engine test/balance/mp-measure.test.ts --silent=false`. It runs on the old tree unchanged, which is how the "before" columns were made.
2. `data/attributes.json` said the Soul multiplier was 1 + 0.1 × (Determination − 1) + 0.15 × Will Power and that Healing given read Camaraderie. Both lines now say what the spec and the engine say.
3. `protodata.json` was regenerated (`build.py --web`) for the archetypes and the attribute lines. That also carried in three texts other agents had changed in the data and not yet rebuilt (Faith's per-point line, the Bard's Triage text, a combo's text).
4. "full heart N MP" on the design cards.
5. Drink It In reads the Begin and its Pumps.

## 14. Questions for Leon

Each with a recommendation, which is what is built.

1. **The split, 75 and 25.** Determination leads, Insight is the healer's floor. *Recommendation: keep.* The other honest answer is 100 × Determination and nothing else; it is one line shorter and it leaves a Determination 1 healer and every Guardian on 100 MP.
2. **A Pump at 10% of the Begin a stage** (a full heart doubles the price). *Recommendation: keep.* 15% is the next step up (a full heart is 2.5 times); it fits every level but puts the level 1 caster at 100% of the pool in 8 turns.
3. **The Guardian's two Soul moves on 100 MP.** *Recommendation: leave it for the Guardian's own pass.* Its Will Shield and Sanctuary read like prayers and are priced like Outbursts; the clean fix is to decide which they are, not to give Virtue its mana back.
4. **Does Virtue want a second number?** *Recommendation: yes, a Virtue term in Blessing power, at the next Faith fit.* Not now.
5. **The nine presets with Determination and no Outburst** carry 250 to 500 MP nobody sees. *Recommendation: leave them.* Say so if you would rather their spare points went elsewhere.
6. **Level 20 on the cheapest design is loose (44% in 8 turns).** *Recommendation: leave it.* An endgame caster casting the starter design all day should not be short. If you want it tighter at the top without touching level 1, the lever is the Begin's price of the big modules, not the pool.
7. **The all-in ceilings.** The all-in steady rows are up to 30 points higher than the table you last saw, because that caster was Syphoning. Nothing to decide here; it is the starting point for the all-in re-fit.

## 15. Files

Spec: "Rules revision 1.24" + notes in Derived stats and Soul magic sections 1 and 4 + items 1340 to 1353.
Data: `soul_modules.json` (`cycle.pump_mp`, the cycle and cost texts), `rules.json` (`derived.magic.max_mp`, `mana.soul.cycle.pump_mp`), `attributes.json`, `archetypes.json`.
Engine: `character.ts` (`maxMp`, `maxMpOld`, `MP_*`, `migrateCharacterMp`, `mpRev`), `magic.ts` (`pumpMp`, `pumpsMp`, `paysPumpMp`, `previewPump`, `pumpOutburst`, `revertPump`, the plan, the spell's price), `game.ts` (two lines: the migration and the units of a fight in progress).
Tests: `rules124-mp.test.ts` (new), `perks-d.test.ts` (one line), `balance/mp-measure.test.ts` (new, skipped unless asked for).
Client: section 11. Tools: `design/canvas-build/build.py` (three attribute lines), `tools/archetype_fill.py` (the role list).
