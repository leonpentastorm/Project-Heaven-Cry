# Combat by phase and by encounter: who is wanted where (draft, 11 Nov 2026)

Leon: "Divide combat into phases and encounter types; which class do you not want anywhere? Then we tune from that."
This is that grid. It becomes the frame of the damage step of the balance pass
(`docs/design/proposals/2026-11-balance-pass.md`): numbers are tuned so the grid comes out as designed, and the
simulator plays every encounter type to check it.

**Measured** means the fight simulator played it (`docs/design/handoffs/balance-sim-baseline.md`: Defender, Fighter,
Marksman, Mage, Channeler, Guardian). **Read** means judged from the class's moves; the simulator has no build for
Infiltrator, Trickster or Bard yet.

## 1. The three phases of a fight

| Phase | When | What decides it |
| --- | --- | --- |
| **Opening** | Before contact and round 1 | Who sees whom first, who acts first, the first volley, where everyone ends up standing |
| **Trade** | The middle rounds | Sustained damage, cover, Pressure, Momentum, Guard, keeping the squad standing, setting things up |
| **Close-out** | The last third: the enemy is hurt, broken or down to its strongest unit | Finishers, what was set up paying off, running down or accepting surrender, who still has resources |

A fight of 4 to 6 rounds has all three. A fight of 2 rounds, which is what the game plays today, has only an Opening.

## 2. The six kinds of encounter

| Encounter | What it is | What it asks for |
| --- | --- | --- |
| **Swarm** | Many weak enemies (Vermin, minions), coming at you | Area damage, a choke point, not being surrounded |
| **Skirmish** | A squad against a squad of soldiers, cover on both sides | Sustained fire, Pressure, movement, focus |
| **Elites** | One or two dangerous enemies with a few soldiers | Single-target damage, control, breaking armour |
| **Boss** | One enemy that lasts 8 to 10 rounds, with helpers | Lasting power, peak damage at the right moment, healing, surviving its big hits |
| **Hold** | They come to you: defend a point, waves, an ambush sprung on the squad | Overwatch, fields and traps, a front line, calm under Pressure |
| **Breach** | You go to them: a held position, doors, cover, their Overwatch | Getting in unseen or fast, breaking cover, denying their first volley |

## 3. Today: who is wanted where

W = wanted (a squad is better for bringing it), ok = pulls its weight, **dead** = the squad is better off with anyone
else. "Read" classes are marked *.

| Class | Swarm | Skirmish | Elites | Boss | Hold | Breach | Phase it is best in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marksman | W | W | W | W | W | W | Opening (and the fight is over) |
| Fighter | ok | ok | W | ok | dead | ok | Trade, if it gets one |
| Defender | dead | dead | dead | dead | dead | dead | none |
| Infiltrator* | ok | W | ok | ok | ok | W | Opening |
| Mage | ok | dead until level 6 | W from 12 | W from 12 | ok | dead | Close-out (it never comes) |
| Trickster* | dead | dead | ok | dead | dead | ok | none |
| Bard* | dead | dead | dead | dead | dead | dead | none |
| Channeler | ok | ok | ok | ok | ok | ok | Trade |
| Guardian | ok | ok in a squad | ok | ok | ok | ok | Trade (dead alone) |

**The classes nobody wants today: Defender, Bard and Trickster.** And one class is wanted everywhere, the Marksman,
which is the same sickness seen from the other side.

Why, in one line each:

- **Defender (measured):** it takes 18 to 62% of the damage a rifleman takes and deals 52 to 73% of his damage, in a
  game where enemies hit for 5 to 15 after armour and die in two rounds. There is nothing to stand in front of.
- **Bard (read):** a healer in fights where nobody is hurt for long enough to need one.
- **Trickster (read):** images and control pay off over several rounds; the fight is over before they do.
- **Mage (measured):** the hardest single hit in the game, behind two turns of drawing. In a two-round fight that is
  either the whole fight (level 12 up: it kills a boss on turn 1) or nothing (below level 6).
- **Marksman (measured):** 173 to 215% of a plain rifle from the weapon's base damage alone, at range, from round 1,
  with no set-up and no resource that binds.
- **Fighter (measured):** fine when it reaches the enemy; its Momentum is empty on 50 to 90% of turns under fire, so
  its Finishers almost never fire, and in a Hold it has nobody to walk to.
- **Channeler (measured):** steady at 66 to 98%, never short of mana or Strain, best at nothing.
- **Guardian (measured):** worth it in a squad of four (Calls, Hymns), 20 to 30% alone.

**One root cause sits under all of it:** fights last about 2 rounds and enemies barely hurt. Everything about lasting
(a front line, healing, control, set-up magic, Finishers) has no room to matter, and everything about the first volley
is king. Step 1 of the balance pass (enemies that scale, criticals at ×1.5, 4 to 6 round fights) attacks the root; the
grid is measured again after it.

## 4. The grid as it should be (proposed)

Every class owns one phase and is the wanted pick in two kinds of encounter. Nobody is wanted everywhere; nobody is
dead in more than one.

| Class | Owns the phase | Wanted in | Weak in (on purpose) | Its job in one line |
| --- | --- | --- | --- | --- |
| Marksman | Opening | Skirmish, Hold | Breach (close quarters) | The first volley and the long lane |
| Infiltrator | Opening | Breach, Elites | Swarm | Sees first, strikes first, opens the door |
| Trickster | Opening | Breach, Elites | Swarm | Takes the enemy's first volley away; turns a strong enemy's turn against it |
| Fighter | Trade | Elites, Breach | Hold | Builds Momentum on the way in and breaks one enemy at a time |
| Defender | Trade | Hold, Boss | Breach (slow) | The line the squad stands behind |
| Guardian | Trade | Skirmish, Boss | none alone (it is a squad class) | Makes the squad's turns bigger |
| Channeler | Trade | Swarm, Boss | Breach | Steady damage that doesn't run dry |
| Bard | Close-out | Boss, Hold | Swarm | Keeps the squad standing long enough to win |
| Mage | Close-out | Swarm, Hold | Breach | What it wrote in the Trade goes off: areas, fields, the one great Line |

## 5. The tuning rules that follow (proposed)

1. **Every class is the best or second-best pick in at least two kinds of encounter and in one phase.**
2. **No class is the best pick in more than three of the six.** (Today the Marksman is best in six.)
3. **No class is dead in more than one.** (Today the Defender and the Bard are dead in six.)
4. **A class's weak encounter is a choice, written down above**, not an accident of the numbers.
5. **The simulator plays all six encounters** with a squad of four, once with the class and once with a plain
   rifleman in its place: "wanted" means the squad wins more often or with more HP left with the class in it.
   Three new reference builds are needed first (Infiltrator, Trickster, Bard).
6. Together with the peak rule: a class's most expensive move should land in the phase it owns.

## 6. Order of work

1. Step 1 of the balance pass lands (enemy levels, criticals, accuracy). Measure the grid again.
2. The simulator learns the six encounters and the three missing builds, and plays area and control.
3. Tune by cell, worst first: Defender, Bard, Trickster (dead everywhere), then the Marksman (wanted everywhere), then
   the Mage's turns of set-up, then the Fighter's Momentum under fire.
