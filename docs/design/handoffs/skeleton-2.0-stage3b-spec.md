# Skeleton 2.0, Stage 3b: spec text for the lead to paste in

Rules 1.13. Text for `docs/rules/PHC-Core-Rules-v1.0.md`, written by the Stage 3b worker (Durability's Guard, the shield's techniques, gear gates, archetype skills). Everything here is built and tested; every number is provisional and sits in `data/techniques.json` (`rules.guard`, `rules.gear_gates`, and each technique's `numbers`). Section 14 items are numbered from 973, after Stage 2's 972: renumber if the perk pass took those numbers first.

## A. New subsection, after "Melee: Momentum and the chain"

### Guard (rules 1.13, Durability's door)

Guard is a pool of points that takes hits for you. Anyone with Durability has one.

1. **The pool.** Its size is your Durability points, 5 at most. A fight starts with 0 Guard and what you hold is lost when the fight ends. The Defender's own pool (5) stands when it is the larger, and the Defender's class moves are unchanged.
2. **Gaining Guard.** The Brace action (1 AP) and the Guard technique each give 1 Guard, +1 for each Durability point above the first, +1 more with a shield in the off hand, never above the pool. Durability 1 gives 1, Durability 3 gives 3, Durability 3 with a shield 4 (the pool of 3 holds 3 of it). With a Guard pool you may Brace with any weapon; Brace is still once until you move.
3. **Guard soaks.** When a hit would take HP, each Guard point takes 10 damage off it and is spent, as many points as the hit needs. Guard is counted last: after armour, after every other reduction, and after your shield of HP. A condition's own tick (Bleeding, Burning, poison) and harm you do to yourself (Strain, a Mana Short) are not hits; a trap, a hazard and an explosion are.
4. **Pressure comes off Guard first:** each point of Pressure that would land on you costs 1 Guard instead, with no reaction, while you have any.
5. **Momentum.** A hit on a unit that holds Guard points costs it no Momentum.
6. **Interpose (Durability 3).** An Answer everyone with Durability 3 has, whatever is in the hands: when an ally next to you is hit by an enemy's attack, spend 1 Guard and your reaction to take the hit instead. The damage is worked out again against you, so your armour applies; your shield and the Guard you have left then soak it. A critical hit's injury follows the hit to you. It works while Suppressed (it protects). You switch it off like any Answer.
7. **The Defender.** A Defender Interposes by the class move (and that move's policy), not by the Answer. A Defender with Reactive Plate spends Guard through the plate and its policy (spend what it takes, keep 1, off); the soak of rule 3 stands aside for that unit, so Guard is never spent twice on one hit.

## B. New rows in the melee technique table, and a line under it

A shield (an off-hand item with the **Shield** property: the buckler and the riot shield; a pavise is carried, not held up) has its own techniques. They are the off hand's while it holds the shield, whatever the main hand holds (a melee weapon, a gun, or nothing), and they are never learned, readied or picked: the shield brings them. A shield-bearer has the Momentum meter. The strike is the bare hand behind the shield.

| # | Technique | Cost | What it does | With the right weapon |
|---|---|---|---|---|
| 29 | **Shield Bash** (Strike) | 2 AP, 1 Guard | Strike with the shield: bare-hand damage ×1.5, hitting with Raw Power. It costs 1 Guard in place of the Strike's 1 Momentum. On a hit you gain 1 Momentum, and the target makes a Body save or is pushed 1 tile. | Shield only. |
| 30 | **Raise Shield** (Link) | 1 AP | Turn Momentum into Guard, 1 for 1, as much as you choose up to your pool (all of it unless you say less). Until your next turn, ranged attacks from the front are at −2 to hit you. Once a turn. | Shield only. |
| 31 | **Shield Wall** (Answer) | reaction, 1 Guard | *When an ally next to you is the target of a ranged attack:* the attack is at −2 to hit, and your ally counts as behind half cover against it (−5, unless they already have cover facing the shot or the attack ignores cover). A burst or a volley is one attack: every round of it is walled. | Shield only. |
| 32 | **Interpose** (Answer) | reaction, 1 Guard | *When an ally next to you is hit by an attack:* you take the hit instead (Guard, rule 6). | Durability 3, any weapon or none. |

Under the table: "The front" is as for Guard: the way you faced when you raised the shield, toward the tile you named or else the nearest enemy, three of the eight directions. Shield Bash is a Strike of your melee chain (it can't follow a Finisher, and an Opener can't follow it). Protective reactions that always work, Suppressed or not: Parry, Shield Wall, Interpose.

Also change two existing lines:
- Guard's row (16): add "With Durability you also gain Guard points (Guard, rule 2)."
- Momentum rule 1 ("only the plain attack gives Momentum"): add "Two techniques still give it by their text: Parry's Light line, and Shield Bash's hit, which pays Guard for it."

## C. Gear gates (replace the lines that name the old skills)

- **Hellraiser servo-fist:** needs Raw Power 3 (was Proficiency 3).
- **Science Team core rifle:** needs Dexterity 3 (was Proficiency 3).
- **Bot-thread banner:** needs Empathy 3 (was Camaraderie 3).
- **Heavy armour:** outer-torso armour of Class 4 needs Pain Threshold 3; Class 5 needs Pain Threshold 5. Classes 0 to 3 ask nothing.
- **Light blades and guns** are gated by Dexterity as before: it is the skill they hit with, and they ask no level.
- **The off hand asks what the main hand asks.** A weapon's or an item's requirement is checked in whichever hand it goes to (and for a worn piece). A second weapon still asks 2 more of its skill than it does in the main hand.

## D. Derived stats / skill table

Durability's line: "Your Guard pool holds 1 more (5 at most). Brace and the Guard technique give 1 Guard, +1 for every point after the first. Interpose at 3."

## E. Archetypes (the section that lists the 46)

Thirteen presets were re-pointed for the new skill jobs (rules 1.13); the other 33 are unchanged. Old → new:

| Archetype | Was | Is |
|---|---|---|
| Bulwark | Durability 4, Pain Threshold 3, Guts 3 | Pain Threshold 4, Durability 3, Guts 3 |
| Bodyguard | Durability 3, Reaction Speed 3, Vigilance 2, Guts 2 (Endurance 3, Strength 3) | Durability 3, Reaction Speed 3, Vigilance 2, Pain Threshold 2 (Endurance 5, Strength 1; it now leans Defender) |
| Heavy gunner | Dexterity 4, Durability 3, Guts 3 | Dexterity 4, Pain Threshold 3, Guts 3 |
| Sentinel | Rumination 4, Composure 3, Acuity 3 | Brain Power 4, Composure 3, Acuity 3 |
| Enchanter | Rumination 4, Improvisation 3, Eloquence 3 | Brain Power 4, Empathy 3, Eloquence 3 |
| Jinx | Acuity 4, Charisma 3, Eloquence 3 | Acuity 4, Charisma 3, Brain Power 3 |
| Scholar | Rumination 4, Acuity 3, Brain Power 3 | Lore Master 4, Acuity 3, Brain Power 3 |
| Mender | Camaraderie 4, Empathy 3, Insinuation 3 | Empathy 4, Camaraderie 3, Insinuation 3 |
| Confessor | Faith 4, Camaraderie 3, Conscience 3 | Faith 4, Empathy 3, Conscience 3 |
| Witch | Lore Master 4, Will Power 3, Insinuation 3 | Will Power 4, Lore Master 3, Insinuation 3 |
| Troubadour | Insinuation 4, Camaraderie 3, Authority 3 | Insinuation 4, Empathy 3, Authority 3 |
| Crusader | Faith 4, Durability 3, Guts 3 | Faith 4, Durability 3, Pain Threshold 3 |
| Field medic | Camaraderie 4, Senses 3, Improvisation 2, Empathy 1 | Empathy 4, Camaraderie 3, Improvisation 2, Pain Threshold 1 |

## F. Section 14, new open items (all provisional)

973. **Guard pool:** Durability points, 5 at most (`rules.guard.max`, `per_durability`).
974. **Guard gained:** 1, +1 a Durability point above the first, +1 with a shield, by Brace or the Guard technique (`gain_base`, `gain_per_point`, `shield_gain`). Brace is once until you move and the Guard technique once a turn; nothing else limits it. At Durability 5 one Brace (1 AP) fills the pool, which is 50 damage soaked.
975. **Guard soaks 10 a point** (`soak`), after armour and after the shield of HP, with no reaction and no choice: every point the hit needs is spent. There is no "keep 1" for the general soak (the Defender's Reactive Plate has one).
976. **What a hit is for Guard:** anything that takes HP but a condition's tick and self-harm; friendly fire, traps, hazards and explosions are hits.
977. **Anyone with a Guard pool may Brace with any weapon** (it was a heavy weapon's action). Braced still halves Recoil, so Durability 1 opens that to every gun.
978. **Interpose at Durability 3, 1 Guard** (`interpose_durability`, `interpose_cost`); a hit is an enemy's weapon attack on an ally within 1 tile; it may be used on your own turn (an enemy's reaction hitting an ally).
979. **The Defender beside the general rule:** rank I and II Defenders soak by rule 3 like anyone; with Reactive Plate (rank III) the plate does it. Reactive Plate's own text now gives little beyond its policy and the bots it sheds; Shrug It Off, Draw Fire and Interpose compete with the soak for the same Guard. The Defender's class Brace (2 AP: the same Guard, and +2 Defense) sits beside the plain Brace (1 AP: the Guard). For the perk and class pass to settle.
980. **Shield Bash:** 2 AP, ×1.5 bare-hand damage, 1 Guard, +1 Momentum on a hit, Body save or pushed 1 tile. Without Durability there is no Guard pool, so a shield-bearer with no Durability can Raise Shield (for the −2) but can't Bash or Wall.
981. **Raise Shield:** 1 AP, 1 Momentum for 1 Guard, −2 to ranged attacks from the front until your next turn; it stacks with Guard's Heavy line and with the shield's own Defense.
982. **Shield Wall:** 1 Guard and the reaction; −2 to hit and half cover (−5) together, so −7 against an ally in the open. Reading of "half cover counts for them": the ally counts as behind half cover. The other reading (cover the ally stands at counts even when it doesn't face the shot) would make it −2 in the open.
983. **Which shields:** the buckler and the riot shield carry the Shield property; the pavise doesn't (carried, it does nothing). The riot shield's old text ("half cover against shots from the front", "Shield Wall: an adjacent ally behind you counts as behind half cover") is not an engine rule; the two techniques replace it and the item text should follow.
984. **Heavy armour's gate:** Class 4 Pain Threshold 3, Class 5 Pain Threshold 5 (`rules.gear_gates.heavy_armour`). The Armour Class is a number on the sheet, not an item: the gate is asked where the class is set (today the Proving Ground's armour tool; `armourGateWhy`), and by `equip` for any worn piece that carries an `armour_class`.
985. **Enemies have no Guard:** a stat block has no Durability. A unit given `resMax.guard` and `durability` by a campaign would use every rule above.
