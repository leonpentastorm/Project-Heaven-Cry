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
- **Target:** the table in `balance-targets.md` *(Leon)*. One enforced ceiling for every source of damage, not only
  Sigils *(proposed)*.

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

## 5. Decisions for Leon

1. Enemies scale with level (tier × level table): yes or no.
2. The time-to-kill targets in angle C.
3. One damage ceiling for every source, enforced by the engine.
4. The AP rules in angle B, above all the cap on conditional AP swings.
5. Attrition or fresh fights (angle L).
6. Anything on this list he wants dropped, or an angle that is missing.

## 6. The first baseline (10 Nov 2026)

Instrument 1 exists: `packages/engine/test/balance-baseline.test.ts` asks the engine for the plain attack of 17 sample
weapons at four levels of investment against the four enemy tiers, and writes
`docs/design/handoffs/balance-baseline.md`. Only the weapon's skill and its attribute are set: no gear quality, no
perks, no techniques, no class. What it shows:

1. **A new character already kills a boss in a turn.** With 7 in the skill and attribute (legal at creation), a coach
   gun or a maul deals 78 to a boss (200 HP) at 65% to hit: three hits. The breacher tube deals 205: one hit.
2. **Criticals alone pass the ceilings.** The critical multiplier is about 2.6 to 2.8. At 10 points a long rifle's
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
