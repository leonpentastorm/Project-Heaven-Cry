# The balance pass (draft, 10 Nov 2026)

Leon's order: balance the numbers before any new system, so that Weapon Arts, armour and the open playstyles have a
ceiling to balance to. The damage targets are his and stand (`docs/design/balance-targets.md`): 350 a hit for a full
build, 500 on a mega critical, plain weapon attacks as 100%, Sigil up to 150%, Outburst 125% steady, optimised physical
150% (110% without ideal gear), and 125% as the melee ceiling a Weapon Art reaches at once. He also asked for the AP
economy and for the other angles a designer would check. This is that list, what each angle measures, and the order of
work. **No number in the game changes from this document; every target marked "proposed" is mine and waits for Leon.**

## 1. What is wrong with balancing by feel

The game has grown system by system (Sigil 1.4, Outburst 4.0, Faith 2.1, Physical 2.0, Skeleton 2.0). Each was tuned
against itself. Nothing has yet measured them against each other, or against the enemies. Three facts read straight
from the data show why the pass has to start from measurements:

1. **Enemies do not grow.** The four tiers have 30, 60, 100 and 200 HP at every level (`data/enemies.json`). Rifles
   deal 28 to 50 a shot before any bonus; the ceiling for a full build is 350. A boss has less HP than one capped hit.
2. **AP is one third of everything.** A turn is 6 AP; a shot is 2 to 4. Fifteen of the 106 perks move AP, several by
   plus or minus 2 (a third of a turn) on a story condition. Nobody has priced an AP.
3. **Damage ceilings exist only for Sigils.** The 350 and 500 caps are enforced in `sigil.ts`. Weapons already pass
   them (spec item 591: about 990 on a critical with the breacher tube) and nothing stops a technique, a perk and a critical from multiplying.

## 2. The angles

Each angle has a question, a measure, and a target. Targets marked *(Leon)* are decided; *(proposed)* are mine.

### A. Damage: ceilings and ratios
- **Question:** does each way to fight sit where the targets put it, at equal investment?
- **Measure:** sustained damage per turn and the biggest single hit, for reference builds at levels 1, 3, 6, 9, 12 and
  20 (the levels where the attribute ceiling moves, plus the start and the end).
- **Target:** the table in `balance-targets.md` *(Leon)*. The ceilings are targets for the maths, not a clamp in the
  engine *(Leon, section 5)*.

### B. The AP economy
- **Question:** what is 1 AP worth, and does every action pay about that much?
- **Measure:** value per AP for every action: damage per AP for attacks and techniques; for the rest (move, reload,
  Brace, a Call, a Whisper, Begin and Pump, drawing a glyph, picking up, swapping gear) what it buys in the same
  currency (damage dealt, damage prevented, or turns of an enemy removed). Then the sources and sinks: who gets more
  than 6 AP, how often, and what a 9 AP turn does.
- **Targets *(proposed)*:** (1) the plain attack is the yardstick: 1 AP = half a plain attack; (2) nothing is strictly
  better than the plain attack at the same AP with no cost in Momentum, Heat, ammo, mana or position; (3) free actions
  are counted: a turn's free and 0 AP actions together are worth no more than 2 AP; (4) a conditional AP swing is
  capped at 1, or the +2 perks become once a fight.
- **Known suspects:** the ±2 AP perks (Got You in My Sight, Talks Broke Down, Sweet Talker); 1 AP techniques that hit
  like a 2 AP attack; movement at high Agility (tiles per AP grows, so the same AP covers the map); the Calls at
  1 AP from 5 points and as a reaction from 9.

### C. Time to kill, both ways
- **Question:** how many turns does a fight last, and how many hits does anyone survive?
- **Measure:** hits and turns for a squad of 1 to 4 to kill each tier; turns for each tier to down a character.
- **Targets *(proposed)*:** a minion dies to 1 or 2 plain attacks, a soldier to 3 or 4, an elite to a full turn from
  two characters, a boss lasts 4 to 6 rounds against a squad of four. A character at full HP survives at least 3 full
  enemy turns of focus at equal level. A standard fight is 4 to 6 rounds.
- **This forces a decision:** enemies must scale with level (HP, armour, damage), or the 350 ceiling means nothing.
  Proposal: tier × level, written as a table in `enemies.json`.

### D. Accuracy and critical hits
- **Question:** how often does an equal-level attack hit, and how much of the damage is critical?
- **Measure:** the hit chance of each reference build against each tier's Defense across levels; the critical rate and
  its share of total damage.
- **Targets *(proposed)*:** 65% to hit at equal investment, never under 35% or over 90% before situational modifiers;
  criticals no more than 20% of sustained damage.

### E. Defence stacking
- **Question:** can damage reduction be stacked until nothing hurts?
- **Measure:** every source of "less damage" (armour, cover, Guard, shields, Walking Wounded, Rally Cry, Used to the
  Pain, Bulwark, Scar Tissue, Soulmate) combined on one tank build.
- **Target *(proposed)*:** percentage reductions multiply rather than add, and the total is capped at 75%.

### F. Control and saves
- **Question:** can an enemy or a character be kept from acting?
- **Measure:** save chance by level against each source (the technique save TN of 12 + half strength, Calls,
  conditions from magic); the longest chain of lost turns a squad can build on one target.
- **Targets *(proposed)*:** a target at equal level saves 45% to 55% of the time; a boss can't lose two turns running;
  the same condition from the same source can't be renewed while it runs.

### G. Resources
- **Question:** does each resource run out at an interesting moment?
- **Measure:** per fight, how much of each is earned and spent, and how often it is empty or capped: Momentum, Guard,
  Heat, ammunition, MP and Strain, Flux, cores, Echo, Devotion, reactions.
- **Target *(proposed)*:** a resource that is never empty or never spent is cut or re-priced. Each should bind in
  about one turn out of three.

### H. Growth
- **Question:** does a level feel like a level, and does power stay inside the ceilings to level 20?
- **Measure:** HP, sustained damage and hit chance at each level for each reference build; the size of the steps at
  levels 3, 6, 9 and 12.
- **Target *(proposed)*:** damage and HP each grow about 3 to 4 times from level 1 to 20, in step with each other.

### I. Parity of the 27 skills and the 9 attributes
- **Question:** is any point a trap, or a must?
- **Measure:** what one point buys in each skill and attribute in the common currency (the before-and-after tool from
  Skeleton 2.0 already prints most of it); how often each appears in the strongest builds the simulator finds.
- **Target *(proposed)*:** no skill is in every top build and none is in zero.

### J. Perks, traits and classes
- **Question:** which items are far above or below the rest?
- **Measure:** each perk's value in AP or damage a fight; rank them; look at the top and bottom tenth.
- **Target:** the outliers are moved toward the middle. Flavour perks the Narrator runs are left alone.

### K. Squad size
- **Question:** is the game fair solo and with four?
- **Measure:** C and G again for squads of 1, 2, 3 and 4 against fights built by the same rule.
- **Target *(proposed)*:** an encounter budget in enemy points per character, so the Narrator and the campaign
  files build fights the same way.

### L. Healing and attrition
- **Question:** does damage carry between fights, or does every fight start fresh?
- **Measure:** HP restored a fight and a rest by each source against damage taken.
- **Target:** a decision for Leon: attrition across a session (resources matter) or fresh fights (each fight is its
  own puzzle). The data today leans to fresh.

Out of this pass: prices, loot and gear tiers (Equipment 2.0), XP pacing (settled in rules 1.11), story checks.

## 3. The instruments

1. **A fight simulator** in the engine's tests (the real reducer, seeded): reference builds played by a simple policy
   against each tier, a few hundred fights each, reporting damage a turn, damage an AP, biggest hit, hit and critical
   rates, rounds to win, damage taken and each resource's use. It prints one table per angle and is kept as a test so
   later systems are measured the same way.
2. **Reference builds:** one per way to fight (plain gun, plain blade, optimised gun, optimised blade, tank with
   shield, Sigil caster, Outburst caster, a Faith build, a Calls leader), each at the six levels, built by the
   creation and levelling rules so they are legal.
3. **An action price list:** every action with its AP and what it buys, from the data files, as a table in this
   folder.

## 4. Order of work

1. Build the simulator and the reference builds; print the baseline. No changes yet.
2. Leon reads the baseline and settles the proposed targets (section 5).
3. Enemies first (angle C): the tier-by-level table. Everything else is measured against it.
4. Damage ceilings and ratios (A), then AP prices (B). These two move the most numbers.
5. Accuracy, defence, control (D, E, F).
6. Resources and growth (G, H), then the outliers (I, J), then squad size (K).
7. Spec first, then data, then validator and tests; every changed number flagged provisional in section 14; one
   release, with the before-and-after tables.

## 5. Leon's rulings (10 Nov 2026)

1. **Enemies scale with level.** A tier-by-level table.
2. **Two attacks at least.** Every enemy at your level takes a minimum of 2 attacks to kill. One-hit kills are for
   enemies you drastically out-level, and for small vermin.
3. **No hard damage cap.** 350 a hit and 500 on a mega critical are the targets the maths is balanced around; the
   engine does not clamp damage. (The clamp inside Sigils, `SIGIL_CAP`, is now the odd one out: see section 7, item 7.)
4. **AP swings are not capped.** Capping them takes value from the gamma (talk and notice) builds. They get a
   cooldown in turns instead.
5. **Fresh fights.** Each fight is its own puzzle; damage and resources are not meant to grind a squad down across a
   session.

These replace the proposed targets in angles A (no enforced ceiling), B (target 4), C (the kill counts) and L.

## 6. The first baseline (10 Nov 2026)

Instrument 1 exists: `packages/engine/test/balance-baseline.test.ts` asks the engine for the plain attack of 17 sample
weapons at four levels of investment against the four enemy tiers, and writes
`docs/design/handoffs/balance-baseline.md`. Only the weapon's skill and its attribute are set: no gear quality, no
perks, no techniques, no class. What it shows:

1. **A new character already kills a boss in a turn.** With 7 in the skill and attribute (legal at creation), a coach
   gun or a maul deals 78 to a boss (200 HP) at 65% to hit: three hits. The breacher tube deals 205: one hit.
2. **Criticals alone pass the ceilings.** The critical multiplier is about 2.5 to 2.8 at 10 points. There a long rifle's
   critical is 336, a recurve bow's 470 and a breacher tube's 739, with standard gear and no perks.
3. **The bow is the strongest plain weapon in the game.** Its damage adds Raw Power before the multipliers: 168 a
   shot at 2 AP at 10 points (a long rifle: 120). It costs two attributes, which is not enough to explain it.
4. **Damage per AP differs sevenfold at the same investment.** At creation, all in: combat knife 13, service pistol
   18, sabre 25, maul 27, long rifle 45, bow 49, breacher tube 99.
5. **Heavy melee's third AP buys nothing on a plain attack.** A maul at 3 AP does less per AP than a servo fist at 2.
6. **Hit chance starts high and tops out early.** 85% against a minion and 65% against a boss at creation; 95% and
   80% at 10 points. Defense (10 to 14) doesn't move with level, so accuracy is settled at level 1.
7. **Enemy armour (0, 5, 10, 10) is flat.** It halves a knife and is invisible to a rifle.

Not measured yet: techniques, perks, gear quality, magic, enemies' damage against characters, AP sources. Those need
the fight simulator (instrument 1 in section 3).

## 7. What only Leon can settle

A simulator can say what the numbers are. It can't say what they should be. These are the calls a lead designer
makes before the numbers move, in the order they block the work. Each has my recommendation so he can answer in a
word.

**Blocking the enemy table (step 3 of the order of work)**

1. **How long a fight lasts.** In rounds, for a standard fight and for a boss. Everything else is derived from this.
   *Recommendation: 4 to 6 rounds standard, 6 to 8 for a boss.*
2. **How many attacks each tier takes at equal level.** The ruling gives the floor (2). The rest is taste.
   *Recommendation: minion 2, soldier 3 to 4, elite 6 to 8, boss about 20 (a squad of four for 5 rounds).* "Attacks"
   needs a yardstick weapon: *the service rifle in the hands of a character who put a normal share of points in it,
   not an all-in one.*
3. **What a level gap does.** How many levels above an enemy before one hit kills it, and how many below before the
   fight is hopeless. *Recommendation: one-hit kills from 5 levels above; 3 levels below is "run".*
4. **A tier under minion.** The ruling names small vermin as one-hit enemies; the data has no such tier.
   *Recommendation: add "vermin" (one hit, comes in swarms).*
5. **How often a character goes down.** In a standard fight at equal level, how many enemy turns of focused fire a
   character survives, and how often a squad member should hit 0 HP. *Recommendation: 3 turns of focus; someone goes
   down in about one fight in three.*

**Blocking the damage work (step 4)**

6. **What each weapon family is for.** Equal damage per AP for everything would make weapons the same; unequal needs a
   reason. One line per family: what it is best at and what it pays. *My draft: pistol (one hand, cheap, weak),
   revolver (few big shots), SMG (volume up close), rifle (the all-rounder and the yardstick), long rifle (range and
   one big shot, slow), shotgun (most damage inside 4 tiles, nothing beyond 8), heavy (area and suppression, must
   brace), bow (silent, no Heat, two attributes), light melee (Momentum and techniques), heavy melee (knockback and
   breaking, 3 AP), unarmed (always there, weakest).* He should strike out or rewrite any line.
7. **How big a critical is.** His two targets (350 a hit, 500 on a mega critical) put a critical at about ×1.4. The
   engine's critical is ×2.5 to ×2.8 at 10 points. One of the two has to give. *Recommendation: criticals at ×1.5,
   rising to ×2 only with perks and gear; the Sigil clamp is removed once the maths holds without it.*
8. **How often an attack should hit.** Today 65% to 85% at creation and 95% by level 9. *Recommendation: about 65% at
   equal level for the whole career, by letting enemy Defense grow with level.* The other school is "always hit,
   balance by damage"; it reads better in a grid game but makes cover and range matter less.
9. **What "optimised" means.** The 150% target for an optimised physical build needs a definition of the 100% it is
   measured from. *Recommendation: 100% is the plain attack with a standard weapon and a normal share of points;
   150% is the best technique rotation with perks and a Masterwork weapon.*
10. **Is the Sigil's 150% a peak or an average?** A Line takes turns to draw. *Recommendation: an average over the
    fight, counting the drawing turns, so the peak turn is higher.*

**Blocking the AP work (step 4)**

11. **The cooldown for the AP perks.** His ruling: a cooldown in turns, not a cap. *Recommendation: 3 turns.*
12. **What a 9 AP turn is allowed to be.** The ceiling is 9. Is that 4 plain attacks, or should the last points pay
    less? *Recommendation: leave it; price the sources so 9 is rare.*
13. **What a fight gives the talk and notice skills.** The Calls are the answer today. What should a point of a gamma
    skill be worth beside a point of an alpha? *Recommendation: about half in direct effect, the rest in what it
    does for the squad.*

**Later, but his**

14. **How unkillable a tank may be**, and how many turns a character may lose to control in a row
    (*recommendation: never two*).
15. **Solo.** Same fights scaled down, or is one character meant to feel outnumbered?
    *Recommendation: scaled by an encounter budget per character.*
16. **What "fresh fights" resets.** HP, MP, Strain, ammunition, Echo, injuries, Devotion: which come back between
    fights and which only at a rest. *Recommendation: HP, MP and Strain come back; ammunition, Echo, injuries and
    Devotion don't.*
17. **Numbers that must not move.** The 2020 legacy he wants kept whatever the maths says (6 AP a turn, 100 base HP,
    the 10-point budgets, d20 against 8/12/16/20). *Recommendation: all four stay.*
18. **What he plays and reports.** The simulator can't feel a turn. After each step he plays one Proving Ground fight
    and answers three questions: did the fight end when it should have, was there a turn with no real choice, did
    anything die or survive in a way that felt wrong.

## 8. Leon's answers to section 7 (10 Nov 2026)

1. Fight length: **standard 4 to 6 rounds, elite 6 to 8, boss 8 to 10.**
2. Attacks to kill at equal level: as recommended (minion 2, soldier 3 to 4, elite 6 to 8, boss about 20; the boss
   figure follows from item 1 and is re-derived for 8 to 10 rounds).
3. Level gap: as recommended. 4. A vermin tier: yes.
5. Going down: as recommended, **except for tanks** (a tank survives longer; how much is angle E).
6. Weapon families: as drafted, **and hybrids too, through the tag system** (a weapon with two families' tags gets
   part of each family's strength and price).
7. Criticals ×1.5, to ×2 with perks and gear. 8. About 65% to hit at equal level. 9. "Optimised" as defined.
10. The Sigil's 150% is an average over the fight. 11. AP perks: a 3-turn cooldown. 12. The 9 AP ceiling stays.
13. A gamma point is worth about half an alpha point in direct effect. 14. Never two lost turns in a row.
15. Solo: an encounter budget, **but enemies are not cut too far (it gets lonely); solo play earns more XP by a
    percentage instead.**
16. **HP and MP do not come back between fights** unless healed or siphoned. **Strain resets**, like Momentum.
    (This changes ruling 5 of section 5: fights are fresh in their special meters, not in HP and MP.)
17. The four legacy numbers stay. 18. Leon playtests; each request for a playtest comes with what to test.

**Also to investigate (Leon):** how good or bad dual wielding is.

## 9. Parked until the pass starts (Leon, 11 Nov 2026)

Not to be worked on before the balance pass itself begins:

1. **Dual wielding.** First read, not measured: a both-hands technique makes both weapons attack for the dearer
   weapon's AP + 1, at −1 to hit on the main hand and −1 to −3 on the off hand (by Dexterity). For two sabres that is
   roughly 20% more damage per AP than one, paid for with the shield, two-handed weapons, and 2 more skill points on
   the second weapon. To measure: add paired techniques to `packages/engine/test/balance-baseline.test.ts`.
2. **The fight simulator** (instrument 1 of section 3): not built. The plain-attack baseline exists.

## 10. The peak rule (Leon, 11 Nov 2026)

A standing rule of the pass, beside the targets:

1. **Every class has its moment.** Each class may go past the soft targets (350 a hit, 500 on a mega critical, and
   its share of sustained damage) with **the most expensive move the class has**. The targets describe ordinary play;
   the peak is what the class pays its highest price for.
2. **Power and price are read together.** For every move the pass records what it does and what it costs (AP,
   Momentum, Guard, mana, Strain, cores, Flux, uses a fight, turns of set-up, Devotion). Two cases get looked at:
   a move that is **powerful but not expensive enough**, and a move that is **expensive but not powerful enough**.
3. What this adds to the instruments: the reference builds are measured twice, once on their ordinary turn and once
   on their peak turn (the dearest move, fully set up), and the report lists each class's peak with its full price.
4. A move that passes the targets and is **not** its class's dearest move is an outlier by definition.

## 11. The engine takes everything it can (Leon, 11 Nov 2026)

**The rule.** To keep both the human and the AI Narrator light, anything the engine can decide, it decides, at about
90% engine to 10% Narrator. A Narrator is asked for judgement only, never for a rule.

**Where things stand** (the `adjudication` field, 11 Nov 2026):

| | engine | hybrid | narrator | engine share |
|---|---|---|---|---|
| Perks (106) | 72 | 23 | 11 | 68% |
| Traits (74) | 28 | 41 | 5 | 38% |
| Both (180) | 100 | 64 | 16 | 56% |

So 80 items still lean on the Narrator. The target is about 18.

**The combo perks' deeds.** All 19 combo perks are granted by a deed that only the Narrator can record today. Read
against what the engine already sees:

- **The engine can see these now, or with one counter:** Charge! (open a fight with a charge and win it), Field
  Surgeon (bring a squadmate back from below 10% HP), Dance of Iron (dodge three attacks in one round), Between
  Heartbeats (come through an ambush unhit), Siege Engine (break a wall in a fight you win), Twin Souls (survive a
  Mana Short), Bite the Bullet (a whole fight below a quarter HP), Fire Sermon (an enemy surrenders to your words in
  a fight, once speaking in a fight is built), The Voice (an officer backs off: the same).
- **The engine can see these through World Play:** Silent Partner (the squad crosses a guarded area unseen), Dead
  Signal (a security hazard disarmed with no alarm), Just the Repairman (a guard's notice talked down), Sixth Sense
  (a tail spotted before it strikes), Make Way (a hostile crowd crossed with no weapon drawn).
- **These stay the Narrator's, as story beats:** Spoon-Feed (teach someone a Sigil), Cultured (win someone over
  with art), Cold Read (close a case with a confession), What Could Be (talk someone out of a terrible choice),
  Verse of War (the line worth remembering; the fight-ending Outburst half is the engine's).

That is 14 of 19 the engine can own, and 5 that are judgement by nature.

**What the pass does with it.**
1. Each deed the engine can see gets a detector; the perk is granted the moment it happens, with the same spotlight.
   The Narrator can still grant any of them by hand.
2. Every `hybrid` perk and trait is read once: what part is a rule (to the engine) and what part is judgement (stays,
   stated in one plain sentence on the card). An item is `hybrid` only if a real judgement is left.
3. A `narrator` item with no judgement left in it is a rule nobody runs: it becomes `engine` or is rewritten.
4. The count above is printed again at the end of the pass.

## 12. Stage A is measured; Leon's answers (11 Nov 2026)

The baseline is `docs/design/handoffs/balance-sim-baseline.md`; the action prices `action-price-list.md`; the engine
and Narrator split `adjudication-split.md`; the 38 questions and Leon's answers `balance-questions.md` (all in
`docs/design/handoffs/`). The answers that change the targets above:

1. **Guns sit a bit under 150% optimised.** The full 150% is for weapons whose price is ludicrously expensive
   ammunition (a rocket launcher). Blades and other physical builds keep 150%.
2. **A ranged technique beats the plain shot by 10 to 25% when its condition is met.**
3. **Burst deals more than the Shot for its AP and is worse to hit.**
4. **A hit costs Momentum at most once a round.**
5. **"3 turns of focus"** is 3 rounds under fire from half the enemies of a standard fight for four.
6. **The engine target** is "no rule is ever left to the Narrator", not a share of labels.

## 13. Outburst needs a full rework in the damage step (Leon, 11 Nov 2026)

Leon, from play on 0.22.0: "we need to rebalance the Outburst hugely. Rage adds Strain but does not make the
multiplier bigger; Shame deals 5 damage to you and does nothing else. Everything in the Outburst module needs a look."

This is part of the damage step, not a later pass. To do, in order:

1. **Audit every one of the 25 feelings** (rules 1.8): for each, what the card says, what the engine does, what it
   costs (Strain, HP, AP) and what it gives (step size, behaviour, residue). A feeling that costs and gives nothing
   back is a bug in the numbers. Rage and Shame are the first two named; check them in the engine before trusting
   the report (not reproduced yet).
2. **Audit every module, school, tone and shape** the same way, and the stage multipliers (×0.8 / 1 / 1.4 / 1.8 / 2.2).
3. **Price them with the same instruments as weapons**: the fight simulator and the action price list, against the
   targets in sections 5, 8 and 12 (Outburst steady at 125% of a plain weapon; the peak rule in section 10).
4. **Rule for every feeling:** a Pump with a feeling must be better than a plain Pump in one clear way, and its cost
   must be in proportion. Draft the new numbers as one table for Leon, flagged provisional, spec first.

**Checked in the data (11 Nov 2026), Leon is right.** A plain Pump adds +0.4 to the multiplier. Rage adds +0.5, so
it buys +0.1 for its Strain. Shame adds +0.6, so it buys +0.2 for 5 damage to yourself. Worse: 17 of the 25
feelings step at 0.2 or 0.3, less than a plain Pump, so pouring them makes the Release *weaker* and the behaviour
they add has to carry the whole price. Only Abandon (+0.8), Spite against the one who last hurt you (+0.8), and the
scaling ones (Pride, Despair, Belonging, Loneliness alone) can clearly beat a plain Pump.

## 14. Sigil: the biggest hit in the game (Leon, 11 Nov 2026)

Leon: "increase the Sigil damage cap to about 150% to 200%. Let them spend 2 turns setting up, just make the hit the
biggest in the game. That system needs way too much fiddling to use; if the damage is not good it is a dead system."

This replaces the earlier Sigil ceiling in the damage step:

1. **Target:** a full Line (4 glyphs, about 2 turns of drawing and walking) Evoked lands at **150% to 200%** of a
   plain weapon's damage over the same turns, the highest single hit of any school. *Provisional until the table is
   drafted:* where in that band each Line length sits (2, 3 and 4 glyphs).
2. Guns stay a bit under 150% (rocket-class ammo excepted), Outburst steady at 125%: Sigil is slow and biggest,
   Outburst steady, weapons immediate.
3. Measure setup cost honestly in the simulator: AP to draw, AP to walk the Line, the turn spent not attacking, and
   the risk of being hit off it.

## 15. Fewer button presses for Sigil users: two-key hotkeys (Leon, 11 Nov 2026)

Leon: "Sigilists have to press way too many buttons, switching tab 1 - 4 - 1 - 4 constantly. Make the UI have double
hotkeys so they can press 11 to move, 12 to sprint, then 41 to draw, 42 to evoke."

Not a balance number, a fight-screen change; build it with the bug list (it touches `apps/web/src/screens/combat.js`):

1. First digit picks the tab, second digit picks the action in that tab, in the order shown. The tab does not have
   to be open first, and the screen switches to it so the player sees what was picked.
2. Every action button shows its two-digit code on the button. A lone digit still opens the tab as today; a second
   digit within a short moment completes the code (*provisional:* about 1 second).
3. Works for every class, not only Sigil users. Add it to the keys list on the help screen.

**Ruling (Leon, 11 Nov 2026):** the Sigil peak stands as the class's peak move (Elites and Bosses stay out of
one-hit range). **Outburst gets a peak too: 150% at the biggest Pump possible** (stage 4, held and pumped all the
way); below that it stays the steady 125% school. So the peaks are: Sigil 150% to 200% after two turns of set-up,
Outburst 150% at full Pump, guns a bit under 150% (rocket-class ammo at 150%).

## 16. Rulings, 12 Nov 2026 (Leon)

1. **The Outburst goes up: steady about 135% of the plain rifle, the biggest Release about 165%.** With the best gun
   at about 145% every turn and no set-up (rules 1.18), an Outburst whose two-turn peak was 150% felt weak. It now sits
   between a gun and a full Sigil Line (150 to 200%). Built after the heal and shield pass (rules 1.20) lands, through
   the damage base.
2. **Weapon Arts break the ceiling, as a charged ultimate.** A physical class's Art is its big moment and is allowed
   over 150%; it has to be charged, and what it deals is **counted in the build's average**: the ceiling of rules 1.18
   is on the average over a fight with the Art in it, not on the Art's own hit. So when Arts are built, a gun or blade
   build's steady output comes down by what its Art adds over the turns it takes to charge. "Big moment deserve to be
   big."
3. The peaks, in order: a full Sigil Line 150 to 200% (two turns of drawing), a charged Art (to be set with the
   Arts), the Outburst's biggest Release 165%, the best gun's steady 145%, the Outburst's steady 135%, a prayer-led
   build about level with the Outburst (rules 1.21, being measured), the plain rifle 100%.

### Faith (Leon, 12 Nov 2026, after rules 1.21)

4. **The Whisper is the every-turn prayer and is weaker than every combat system**, because anyone can pray one on top
   of what they already do. There is a Whisper that hurts.
5. **A Hymn is always better, per cast, than a standard spell or an Outburst**; its price is the cooldown, which is
   long when Faith is low and comes down with Faith. Faith-boosting items come later and are what lowers it further; a
   Hymn is not prayed every turn without them. (Rules 1.21 had fitted an every-turn Hymn: the cooldown formula reached
   its floor of 1 round at Virtue 4 and Faith 3.)
6. **A vow fulfilled in combat takes 1 round off the Hymn cooldown.** Balance around that.
7. A prayer-led build averages a little under the Outburst (about 120 to 125%); Devotion 3 may sit under the rifle.
8. Witnessed's +2 to hit for Old Overcast's devoted is for a kill, not every attack.

Built as rules 1.22 (hand-off `faith-round-2.md`).

### Defence (Leon, 12 Nov 2026, after rules 1.20)

9. **No round limit on healing.** The half-max-HP limit of rules 1.20 is withdrawn; healing is balanced by its AP
   price. A tank kept up by a healer who does nothing else is allowed: "let them have it".
10. **The enemies go for whoever heals the most.** That is the answer to the dedicated healer, not a cap.
11. **Refit Boss HP** (it was fitted against the old 200% gun) and **a medic pass** (Triage and stims with the level
    factor).
12. **Hold the Gate** is a Hymn: it gets a long cooldown of its own.
13. **Faith's damage range** (Leon's correction): a turn with only a Whisper is about 80% of the plain rifle, a turn
    with a Hymn about 125%; both go up with Faith items later. This replaces the 120 to 125% average of ruling 7.

Built as rules 1.23 (hand-off `defence-step.md`) and in rules 1.22.

## 17. The capstone (Leon, 12 Nov 2026)

"Do the things you think this balance patch needed, this will be the floor any future class/addition/combat system
base themselves around, so capstone it." And: "is the damage engine unified? Each action that deals dmg should have
something like base+attribute+level, since we have had to patch in level scaling several times now."

The lead's plan, in order. Each step ends with `npm run check` green and its numbers in a hand-off.

1. **Finish what is in flight:** rules 1.22 (Faith round 2) and 1.23 (the defence step).
2. **One damage formula** (`proposals/2026-11-unified-damage.md`, being written from an audit of every source):
   every action that deals damage, heals or shields declares base + attribute term + level term in data and goes
   through one engine function and one sink. A re-expression, not a re-balance: the tables of rules 1.17 to 1.23 must
   not move.
3. **Many targets:** the simulator fights groups; area, blasts and shapes get a price per target (tally section 10,
   row 1). This moves other numbers, so it comes before the rest.
4. **A yardstick for control** (a turn taken away, a Slow, a Mark, damage over time), then the conditions and the
   Sigil fields, traps and turrets against it.
5. **What was left out:** class moves (a ceiling per rank), melee beyond one build, thrown, mana arms, special rounds
   and mods, reactions and held actions, stealth openers, Calls and squad buffs.
6. **The all-in builds. Ruled (Leon, 12 Nov): "you kinda need all in builds to achieve any of the ceiling listed".**
   The ceilings are what an **all-in** build reaches; a normal-share build sits under them. Rules 1.17 to 1.21 were
   fitted the other way (normal share on the ceiling, all-in at 148 to 270%), so every system is re-fitted: all-in
   lands on its ceiling, and the gap between all-in and normal share is one ratio for every system, set by the
   attribute term of the unified formula (step 2). The lead's starting ratio: all-in about 1.25 times normal share.
   The plain rifle at a normal share stays the 100% line the enemy table is fitted to.
7. **The floor, written down and enforced:** a budget rule for new content (cost in AP, resource, cooldown, set-up,
   targets, reach, reliability gives the output allowed), in `docs/design/balance-contract.md`; and a guard in
   `npm run check` that fails when a reference build or a data item goes over its ceiling.
8. **Close the patch:** the stale browser suites repaired or retired, every suite green, the tally's live column
   checked against `main`, the version and changelog. Deploy on Leon's word only.

Left for their own systems, with the budget rule to hold them: Weapon Arts, armour (Equipment 2.0), enemy casters and
the enemy table refit, Faith items.
