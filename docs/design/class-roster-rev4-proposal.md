# Class Roster, Revision 4: nine mechanics, four tiers of using them (draft 2, 13 Nov 2026)

**Leon's name for the patch that builds this: Classes 3.0** (13 Nov; the build's guide is `handoffs/CLASSES-3.0-PICKUP.md`). A proposal, accepted in its rulings (section 8). **Nothing here is built.** It replaces `class-roster-rev3-proposal.md` when Leon accepts it; until then
Revision 3 is in force. Written by the lead from a design talk with Leon (13 Nov 2026). Every name marked
*(Suggested)* is the lead's and Leon's to change. Every number is PROVISIONAL and has no ceiling yet: section 7 says
what must be measured against the balance contract (`balance-contract.md`) before anything is built.

It builds on two documents that stay in force: **the nine doors** (`proposals/2026-11-nine-doors.md`: every
attribute's alpha skill opens a way to fight, to anyone who has the skill) and Revision 3's **advanced roadmap** (9
squared classes, 27 cross-core hybrids).

## 1. Leon's rulings this revision rests on (13 Nov 2026)

1. **Respec all nine base classes**, new names allowed. Three had no mechanic of their own (Perception, Expression,
   Insight) and four spent another class's resource.
2. **Expression is the maker.** The two machine skills are split on purpose: **Acuity** (Perception) takes machines
   apart, **Improvisation** (Expression) makes them work.
3. **Insight is the pure healer and support tree.** Its mechanic is **Bonds**.
4. **Everyone can use all nine mechanics.** "A Channeler can throw on a melee weapon and use Momentum. The 9 base
   classes use these 9 base mechanics BETTER, then the squared class uses it BESTEST. A mixed class uses 2 mechanics
   from 2 trees at once and is better than just randomly picking up a blade."

**Leon's answers to draft 1 (13 Nov 2026), built into this draft:**

5. **Bulwark and Breaker: the new names are better.** (The other names stand as suggested until he says otherwise.)
6. **Talk is nobody's class move.** "All classes have a gamma skill, all classes can talk if they raise it far
   enough, no reason for only one of the 9 to have a special talk mechanic." So no class move is a speech action:
   Silver Tongue (Rigger) and Command (Chaplain) are out; speech is the nine Calls, on their one ladder.
7. **Reactions must be looked at before anyone gets more of them.** "I've seen a turn where my character Riposted 4
   times and downed [an enemy] while they missed me 3 times." Section 2.1.
8. **Everyone can wait and pray. The Chaplain has special prayers, and attacks with the power of the god, with the
   patron at his side.** The wait is not shortened for the class.
9. **The Mender bonds for free, as a function of the class:** one free Bond action. Anyone else who wants to heal
   puts points in the tree and pays AP to Bond.
10. **The budget (15% / 30% / 5% and a bridge) is used as written;** playtests find the real targets later.
11. **Design everything, then build it as one big patch.** (The lead advised one system a version; Leon's call.)

## 2. The four tiers

One mechanic per attribute. What changes from tier to tier is how well you use it, never whether you may.

| Tier | Who | What they get | The rule for the designer |
| --- | --- | --- | --- |
| **The door** | Anyone with the alpha skill (and the gear it asks for) | The whole mechanic: its meter, its basic verbs. Its size grows with the skill's points | Nothing in the mechanic is locked behind a class. A door user must be able to play the loop from start to payoff |
| **The base class** (BETTER) | Highest attribute at level 3 | Exactly three kinds of thing: **a bigger meter** (cap or starting value), **one thing a turn cheaper or free**, and **six verbs of its own** (two a rank) that feed or spend the meter | A class move never does what the door already does, only more of it or something the door can't |
| **The squared class** (BEST) | That attribute at 9, from level 7 | **Breaks one rule of its own mechanic**, and gets verbs built on the break | One rule only. Name the rule it breaks in one sentence |
| **The mixed class** | Base attribute 6 and a partner attribute 5 from another Core, from level 7 | Both doors already, by the points. The class adds **a bridge**: one mechanic's meter pays into the other, and two or three verbs that only work with both | The bridge must be worth more than holding the two doors side by side, or the class is a label |

**Fuel belongs to the Core, the meter belongs to the attribute.** Body classes burn ammo and gear, Mind classes burn
mana cores, Soul classes spend MP (Virtue: nothing but the wait between prayers). Two classes of one Core may share a
fuel; no class spends another attribute's **meter** or uses its **verbs** unless the character has that door too.
This is the rule Revision 3 broke: the Trickster paid in Sigil words, the Bard in Supplies and MP at once, the
Guardian in MP, Strain and Devotion.

**Budget (PROVISIONAL, to be measured):** with the same points in the skill, a door user sits on that system's
normal line, the base class about 15% above it, the squared class about 30% above it; a mixed class has each of its
two systems about 5% above the door and the rest of its worth in the bridge. All of them stay under the system's
all-in ceiling in the contract.

### 2.1 Reactions, made real (Leon's ruling 7)

The spec already says it ("Reactions": one a round, counted; an Answer "uses your reaction"), and Riposte's own
text says "Uses your reaction". Four Ripostes in one enemy turn is therefore either a bug or a hole in the rule; the
engine is being checked (bug list, "Riposte fired four times"). Whatever the cause, this revision needs the rule
stated so that it holds for every class:

1. **One reaction a round, for everyone, and everything that happens outside your turn spends it:** an opportunity
   attack, every Answer (Riposte, Parry, Keep Back, Interpose, Shield Wall), an Overwatch or held shot, Heart
   Overwatch, a class reaction (Shrug It Off, Duck and Roll, Take the Weight), a perk's reaction.
2. **A reaction never triggers a reaction.** A Riposte can't be Riposted, and its hit starts no chain.
3. **More reactions come from one place only:** the Skirmisher's Reflex (two a round), and items that say so. A
   Call that gives one (Cue) gives exactly one, used before the giver's next turn.
4. **A reaction that attacks is a plain attack** (no technique riders unless its own text gives one), so that a
   second reaction is worth about a third of a turn and can be priced.
5. Protective reactions still work while Suppressed (as today); attacking and moving ones do not.

Reflex stays in this draft **on the condition** that rule 1 is true in the engine first.

### 2.2 Built on the engine's primitives, never beside them (Leon, 13 Nov)

"They are forbidden to write custom code for each system if one already exists. We need to make use of our new
engine effectively." Every one of the seven specs carries a **"Built from"** table: each rule and verb against the
primitive that carries it (item ops and their closed lists of triggers, predicates and ops; action descriptors; the
condition table; the output profiles and amounts; costs; uses and cooldowns; rolls; kit geometry; `displace`; fog;
`say`; the hover card: `docs/ENGINE-GUIDE.md`). What no primitive can carry is listed as **"Needs a new
primitive"**, with the one general thing to add to the closed lists so the next system can use it too. No spec may
ask for a per-item or per-system handler where a primitive exists, and the builder may not write one: the lints
(`lint-item-ops`, `lint-costs`, `lint-conditions`, `lint-foundations`) are the guard.

## 3. The nine, at a glance

| Attribute | Door (alpha skill) | Mechanic and meter | Fuel | Base class (now → suggested) | State |
| --- | --- | --- | --- | --- | --- |
| Endurance | Durability | **Guard** (points that take hits) | none | Defender → **Bulwark** | built |
| Strength | Raw Power | **Momentum** (0 to 3, the chain) | none | Fighter → **Breaker** | built |
| Agility | Dexterity | **Pressure** (on the target) and Heat | ammo | Marksman → **Skirmisher** | built; the class changes |
| Perception | Ingenuity | **Shadow** (0 to 3, built unseen) | none | Infiltrator → **Operative** | **new** (nine doors 5.1) |
| Intelligence | Brain Power | **Sigils** and Flux | cores | Mage → **Sigilist** | built |
| Expression | Visualization | **Figments** (things the bots build for you), through the Visualizer | cores | Trickster → **Rigger** | **new** (nine doors 5.2, accepted 10 Nov) |
| Insight | Empathy | **Bonds** (ties to allies; tending travels along them) | MP | Bard → **Mender** | **new** |
| Determination | Will Power | **Outbursts** and Strain | MP | Channeler (kept) | built |
| Virtue | Faith | **Blessings**, Devotion and the wait | none | Guardian → **Chaplain** | built; the class changes |

**Calls stay everyone's (Leon's ruling 6).** They are the nine gamma skills' speech actions (rules 1.13), one for
each attribute, on one ladder by the skill's points. No class has a speech move of its own, and none is needed: a
character of any class who raises a gamma skill talks as well as its points say.

## 4. The nine classes

Each page: the fantasy in one line; **the door** (what anyone gets); **better** (the class's three kinds of thing);
the six moves (kept from Revision 3, moved in, or NEW); what leaves; and the rule its squared class breaks.

### 4.1 Bulwark *(Suggested; was Defender)*: Endurance

*Nothing gets past me.* Durability, Pain Threshold, Senses.

- **The door:** a Guard pool the size of your Durability (5 at most), the Guard technique, Brace, Interpose at
  Durability 3. As built (rules 1.13).
- **Better:** the pool is 5 whatever the Durability; a fight starts with 1 Guard *(new)*; the six moves.

| Rank | Move | State |
| --- | --- | --- |
| I | Brace: Guard, +2 Defense until you move, Interpose while you hold Guard | kept |
| I | Draw Fire (1 AP, 1 Guard) | kept |
| II | Unbroken (once a scene) | kept |
| II | Shrug It Off (reaction, 1 Guard) | kept |
| III | Reactive Plate (spend Guard as you are hit) | kept |
| III | Anchor | kept |

- **Leaves:** nothing. The clearest class in Revision 3; only the name is new, and only if Leon likes it better.
- **Squared, the Juggernaut, breaks:** "Guard is lost when the fight ends, and the last point is held back." Its
  Guard carries between fights of a session and every point soaks.

### 4.2 Breaker *(Suggested; was Fighter)*: Strength

*I break what I reach, and they know it.* Raw Power, Guts, Intimidation.

- **The door:** Momentum 0 to 3 with any melee weapon, the chain (Opener, Strikes, Links, Finisher, Answers). As
  built.
- **Better:** Momentum to 5; **the first hit each turn on a Shaken or Frightened enemy gives +1 Momentum** *(new:
  it ties Intimidation and Guts to the meter)*; the six moves.

| Rank | Move | State |
| --- | --- | --- |
| I | Lunge (1 Momentum) | kept |
| I | Shove (1 AP) | kept |
| II | Riposte (reaction, 1 Momentum): **the one reaction of the round**, section 2.1 | kept; the count made real |
| II | Lingering Dread (a kill Shakes those who saw it) | kept |
| III | Finisher (3 AP, all Momentum) | kept |
| III | Unstoppable (once a scene) | kept |

- **Leaves:** nothing.
- **Squared, the Berserker, breaks:** "walking and being hit cost Momentum." Neither does.

### 4.3 Skirmisher *(Suggested; was Marksman)*: Agility

*The quick hand that is never where you aimed.* Dexterity, Athletics, Reaction Speed.

- **The door:** ranged techniques and light blades, Pressure on what you shoot, Heat on the gun. As built
  (Physical 2.0).
- **Better:** **Reflex: two reactions a round** *(new; everyone else has one; on the condition of section 2.1)*; the first reload each turn 1 AP
  cheaper; the six moves. The class is about handling the weapon and not being where the shot lands. **Aiming is
  Perception's** and moves there.

| Rank | Move | State |
| --- | --- | --- |
| I | Fire Discipline (Aimed shots add no Heat; one Burst a turn 2 AP) | kept |
| I | Speed Loader | kept (now the class's "one thing cheaper") |
| II | Duck and Roll (reaction) | kept |
| II | Special Ammo (per rest) | kept |
| III | Killzone (Overwatch holds two shots) | kept; it spends both reactions |
| III | **Run and Gun** (once a turn): a move of up to 2 tiles between two attacks costs no AP and provokes nothing; the next shot adds +1 Pressure | NEW |

- **Leaves:** Called Shot, to the Operative.
- **Squared, the Gunslinger, breaks:** "a reaction is spent when used." With a pistol in hand its first reaction
  each round is free.

### 4.4 Operative *(Suggested; was Infiltrator)*: Perception

*I see you, you don't see me, and I know how you work.* Ingenuity, Acuity, Vigilance.

- **The door (new; nine doors 5.1):** **Shadow**, 0 to 3, on you. It rises while no enemy sees you (a turn ended
  unseen, a move from cover to cover unseen, a kill nobody saw) and falls to 0 when you are seen. Being Hidden is
  still the gate. Four kinds of verb, riding on whatever weapon technique you use: **Slip** (move past Detection),
  **Mark** (prepare a target that can't see you), **Work** (hands: lift, plant, rig a tile, jam a gun, open a lock),
  **Break** (the strike that reveals you is stronger for each point: PROVISIONAL +15% a point). The list opens at
  Ingenuity 3; Shadow reaches 2 at 5 and 3 at 7. The fog the engine now owns (0.23.0) is what makes this cheap.
- **Better:** a fight starts with 1 Shadow; **Analyze (Acuity) on a target that can't see you gives +1 Shadow** and
  costs 1 AP; the six moves.

| Rank | Move | State |
| --- | --- | --- |
| I | Mark (1 AP): the squad gets +1 to hit it, it can't hide | kept |
| I | Vanish (1 AP, once a turn) | kept |
| II | Toxin (1 AP, 1 dose): a Break's rider | kept |
| II | Sabotage (2 AP): disable an enemy machine, turret, drone or barricade for 2 rounds, or rig your tile | kept, moved down from III: **taking machines apart is this class's** |
| III | Execution (a Marked enemy at a quarter HP) | kept |
| III | Called Shot (3 AP): name head, arm or leg; **no −2 while the target can't see you** | moved in from the Marksman |

- **Leaves:** Field Fix, to the Rigger (fixing is Expression's). The Trickster's Read (Analyze for 1 AP, and the
  target's next action) folds into this class's "better".
- **Squared, the Ghost, breaks:** "attacking reveals you." Once a turn it doesn't.

### 4.5 Sigilist *(Suggested; was Mage)*: Intelligence

*The word, written correctly, is law.* Brain Power, Rumination, Eloquence.

- **The door:** an Evoker, cores, the forty words, the Line, Flux. As built (rules 1.4 to 1.17).
- **Better:** damage words 1 charge cheaper (Barrage); venting 1 AP cheaper and 1 more Flux; the six moves.

| Rank | Move | State |
| --- | --- | --- |
| I | Barrage | kept |
| I | Core Change | kept |
| II | Overcharge (once a combat) | kept |
| II | Bleed the Flux | kept |
| III | Payload | kept |
| III | Stored Spell (per rest) | kept |

- **Leaves:** nothing. BLIND, SLOW and MUDDLE come back to the common word list (anyone with the door learns them
  by study); the Trickster's discount on them goes.
- **Squared, the Grand Sigilist, breaks:** "a word covers its own shape." One word covers the field
  (`grand-sigilist-draft.md`).

### 4.6 Rigger *(Suggested; was Trickster)*: Expression

*Give me a minute and some scrap.* Visualization, Improvisation, Charisma.

- **The door (new; nine doors 5.2, accepted by Leon 10 Nov):** the **Visualizer** (the third focus, an Evoker for
  artists), and **Figments**: you picture a thing and the bots build it. Each is a unit on the grid with HP and no
  turn of its own: you spend your AP to act through it. Five forms to start: **Double** (a copy that draws
  attacks), **Beast** (a fast striker), **Wall** (cover you can move), **Blade** (holds a tile and strikes what
  passes), **Eye** (sees for the squad). Paid in core charge when made, part given back when you unmake it
  yourself. Held: 1 at Visualization 3, 2 at 5, 3 at 7; each one held costs something every turn (PROVISIONAL: 1
  charge, or 1 AP for the third). A design, like an Outburst's: a form plus one or two traits, made out of a fight.
- **Better:** one more Figment held; **the first Figment made each fight is free**; and what no door gives:
  **Improvisation on the field**, real machines fixed and pushed past their limits.

| Rank | Move | State |
| --- | --- | --- |
| I | Double (2 AP): the False Image, now the Double form made at once within range for 2 rounds, outside your held count | kept, renamed; it is a Figment now, not a Sigil |
| I | Field Fix (2 AP): clear a jam, restore an item, repair a robot, drone or turret for 20 | moved in from the Infiltrator |
| II | **Salvage** (1 AP): from a wreck, a destroyed machine or one of your own Figments next to you, take back 1 core charge, or repair a machine or Figment of your side for 15 | NEW (replaces Silver Tongue: talk is no class's move, ruling 6) |
| II | **Overclock** (1 AP, once a turn): one Figment, robot, drone or turret of your side acts once now. A machine pushed this way takes 5 damage | NEW |
| III | Sleight (once a scene, 1 AP): swap places with a Figment or a willing ally within 6 | kept |
| III | **Jury-Rig** (3 AP, once a scene): from a wreck, a dropped weapon or a barricade next to you, build a turret that fights for 3 rounds with that weapon's plain attack | NEW (replaces Rewrite) |

- **Leaves:** Silver Tongue (ruling 6: what it did is what Charisma's Call is for), Rewrite (flipping a buff is
  neither making nor mending; to the move pool for the Mirage or the Hexer), Blind and Slow (above), Read (to the
  Operative).
- **What this costs the old fantasy:** the Trickster as "the liar" is the Double and whatever its Charisma lets it
  say, like anyone's. The liar comes back whole in the squared class.
- **Squared, the Mirage, breaks:** "a Figment has no turn of its own." Its Figments act by themselves, and enemies
  must save to tell which is real.

### 4.7 Mender *(Suggested; was Bard)*: Insight

*Nobody in this squad falls alone.* Empathy, Camaraderie, Insinuation. **The pure healer and support (Leon).**

- **The door (new):** **Tending** (the support list of nine doors 5.4: mend, shield, lift a condition, move an
  ally; opened by Empathy, which carries the healing multiplier) and **Bonds**. A Bond (**1 AP for anyone**, an ally within 6
  you can see; it lasts the fight) is a tie between you and one ally: **your tending reaches a Bonded ally at any
  range you can see, and at +20% (PROVISIONAL)**; you know their HP, conditions and who is aiming at them; when a
  Bonded ally goes Down you take 1 Strain. Bonds held: 1 at Empathy 1, 2 at Empathy 5, 3 at Empathy 8. Fuel: MP.
  Medical kits and stims are gear anyone uses; they are not this class's.
- **Better:** one more Bond; **Bonding is free: one free Bond action a turn, with whoever the Mender wants**
  (Leon's ruling 9; everyone else pays the 1 AP); feelings travel
  along a Bond (the 25 feelings of rules 1.8: the Channeler pours its own into an Outburst, the Mender gives one to
  an ally); the six moves.

| Rank | Move | State |
| --- | --- | --- |
| I | Triage (2 AP): heal 20 × multiplier and end Bleeding; **a Bonded ally from range** | kept; no Supplies, as before |
| I | Inspire (1 AP, 10 MP): **give a Bonded ally a feeling you have felt**; it is +2 on their next roll and that feeling's own small boon (PROVISIONAL: one line a feeling, in `feelings.json`) | reworked |
| II | Mend: the Soul heal, 40 × multiplier | kept |
| II | **Take the Weight** (reaction, Camaraderie): when a Bonded ally gains a condition or would go Down, take the condition yourself, or give them 1 HP and take 2 Strain | NEW (replaces Stim Throw, which becomes a gear action anyone has) |
| III | Rally (once a scene, 2 AP): **every Bonded ally, wherever they are**, heals 20 × multiplier and loses Fear and Shaken | kept, through Bonds |
| III | Field Surgery (out of combat): treat a limb injury or clear every Body condition | kept |

- **Leaves:** Stim Throw (to gear). Supplies stop being a class resource.
- **Squared, the Heartbinder, breaks:** "a Bond runs between you and an ally." Its Bonds run between allies: what
  one is given, the others share (Link, Through, Share).

### 4.8 Channeler (kept): Determination

*My heart is the weapon.* Will Power, Composure, Lore Master.

- **The door:** an Emanator, MP, designs, Begin / Pump / Release, the feelings, Strain. As built (rules 1.5 to
  1.24).
- **Better:** the first paid Pump each turn free on a Damage design (Shape); Strain limit +1; one more tone and
  ready design; the six moves. Unchanged from Revision 3.

| Rank | Move | State |
| --- | --- | --- |
| I | Shape | kept |
| I | Iron Heart | kept |
| II | Storm Front | kept |
| II | Occult Library | kept |
| III | Heart Surge | kept |
| III | Eye of the Storm | kept |

- **Squared, the Heartfed, breaks:** "you pour in only what you have felt." Every feeling in the room is fuel.

### 4.9 Chaplain *(Suggested; was Guardian)*: Virtue

*The saints judge. I give the order.* Faith, Conscience, Authority.

- **The door:** anyone with Faith 3 prays: Whispers, Hymns and their wait, Devotion, Witnessed, the Miracle. As
  built (rules 1.6 to 1.22).
- **Better (Leon's ruling 8):** the wait is the same as everyone's. What the class has is **prayers nobody else
  can say** (Ward, Sanctuary: below), **the god in its weapon** (Smite), and **the patron at its side**: while the
  Chaplain is Witnessed its patron stands on the field beside it (the Miracle cut-in's figure, as a presence on its
  tile), the first intervention of a fight does not end Witnessed, and the patron's interventions strike where the
  Chaplain's weapon struck. It spends **no MP and no Strain**: one pool, Devotion, and the wait.

| Rank | Move | State |
| --- | --- | --- |
| I | **Ward** (a Whisper only the Chaplain has, 1 AP): an ally gains a shield of 30 × Blessing power for the fight | reworked from Will Shield: a prayer now, no MP |
| I | **Smite** (once a turn, with a weapon attack): the hit also deals Rebuke's damage (20 at rules 1.21) × Blessing power, as the patron's own; it counts as a prayer for what the patron likes | NEW (replaces Command: an order is Authority's Call, ruling 6) |
| II | Under the Eye | kept |
| II | Blessed Shells | kept |
| III | **Sanctuary** (a Hymn only the Chaplain has, 3 AP, the Hymn's wait): a 3×3 zone where allies take half damage until your next turn | reworked: a Hymn now, no MP or Strain |
| III | Judgement (4 AP, 3 Devotion, once a scene) | kept |

- **Leaves:** MP and Strain as costs; Command (to Authority's Call, Order).
- **Squared, the Saint, breaks:** "a Hymn makes you wait." Its first Hymn each fight has no wait.

## 5. What moves where

| Thing | From | To | Why |
| --- | --- | --- | --- |
| Called Shot | Marksman | Operative | aiming is Perception's; handling is Agility's |
| Field Fix | Infiltrator | Rigger | Improvisation fixes; Acuity breaks |
| Sabotage | Infiltrator III | Operative II | it is the class's identity, so it comes earlier |
| Read | Trickster | Operative's "better" | Analyze is Acuity |
| False Image | Trickster (a Sigil charge) | Rigger's Double (a Figment) | one mechanic a class |
| Blind and Slow | Trickster | the common Sigil word list | Sigil words are the Sigil door's |
| Rewrite | Trickster | the move pool (Mirage or Hexer) | fits neither maker nor mender |
| Stim Throw | Bard | a gear action | kits are everyone's |
| Will Shield, Sanctuary | Guardian (MP, Strain) | Chaplain's prayers | one pool |
| Silver Tongue, Command | Trickster, Guardian | out: the Calls do this for everyone | talk is the gamma's, no class's (ruling 6) |
| The healing multiplier | Camaraderie | Empathy | it is the alpha's (nine doors 5.4) |

## 6. Mixed classes: what a bridge is

A mixed class needs the base attribute at 6 and a partner from another Core at 5 (Revision 3, unchanged), so the
character already holds both doors by its points. The class's worth is the **bridge**: a rule that makes one meter
pay into the other. Examples on Revision 3's batch 2, to show the shape (none designed yet):

| Mixed class | Doors | The bridge, in one sentence |
| --- | --- | --- |
| Storm Hand | Momentum + Outbursts | A Finisher releases the held Outburst through the weapon: each Momentum spent counts as a stage |
| Blade Scribe | Momentum + Sigils | A Strike that hits draws a glyph on the target's tile for no charge; the chain writes the Line |
| Spellslinger | Pressure + Sigils | A glyph loads into the magazine: the shot carries the word, and Pressure on the target lowers its save |
| Shade | Shadow + Outbursts | A Break pours a feeling into whoever saw it: Shadow spent is the stage |
| Adamantile Knight | Guard + Blessings | Guard that soaks a hit becomes a shield on the nearest ally; a prayer refills Guard |
| Warden | Guard + Figments | The Wall form holds your Guard: a hit on it is soaked from your pool |
| Banner Dancer | Pressure + Bonds | A Bonded ally's shot adds your Pressure; your reactions may be spent for them |
| Inquisitor | Shadow + Blessings | A Marked enemy is Witnessed by your patron: the next prayer against it can't be saved |
| Hexer | Figments + Bonds | A Bond can be tied to an enemy: your Figments know where it is and it feels what they do |

And the case Leon named, with no class at all: **a Channeler who picks up a blade** has the Momentum door at its
Raw Power's size, the whole chain, and nothing more. That is already true in the engine (Momentum is everyone's who
holds a melee weapon). A Storm Hand is that character with the bridge.

## 7. What it takes

**New systems, each a piece of its own, each measured against the contract before it is built:**

1. **Shadow** (Perception's door). Cheapest: it sits on Hidden, the fog and the Ambush multiplier, all built. Needs
   a ceiling for the Break (a damage multiplier that is set up over turns: compare the Sigil Line's 150 to 200).
2. **Bonds** and the tending list (Insight's door). Reuses heals, shields and feelings. Needs: what a feeling given
   to an ally is worth, and that range-free healing does not break the healer ceiling (2.0 Soldier-turns, rules
   1.27).
3. **Figments** and the Visualizer (Expression's door). The biggest: units that act on their owner's AP, five
   forms, designs, a new focus item and its art. Needs a ceiling for bodies on the board (the control yardstick is
   only an estimate today).
4. **Reflex** (the Skirmisher's two reactions) and **the Chaplain's prayers** (Ward, Sanctuary, the ally Whisper):
   rule changes to built systems. Small to build, but two reactions a round touches every Answer and Overwatch, and
   Faith is the one system with no fuel: measure both.

**Order (Leon's ruling 11): design everything, then build it as one big patch.** So nothing is built until each
of these is a full spec with its data tables, and this document is accepted:

1. The reaction rule (section 2.1), with the engine's count checked first.
2. Shadow: the list of about twenty verbs in four kinds, the meter's gains and losses, the Break's multiplier.
3. Tending and Bonds: the support list, what each of the 25 feelings does when given to an ally, range and sight.
4. Figments: the Visualizer as an item, the five forms' numbers, traits, designs, upkeep, what the AI does about
   them.
5. The Chaplain's prayers and the patron's presence: Ward, Sanctuary, Smite, and what "at his side" does for each
   of the eight patrons.
6. The moves that change hands (section 5) and the new ones (Run and Gun, Salvage, Overclock, Jury-Rig, Take the
   Weight), each with its number and its ceiling.
7. The rename.

The lead's advice stands beside the ruling: the patch can be built in that order behind the scenes and still ship
as one, so that each system is measured against the contract before the next is laid on it.

**What the rename touches:** class ids in data and saves (keep the ids, change the display names: `class:defender`
stays), the level-up picker, nine class emblems (`art/briefs/ART-REQUESTS.md`: new marks only if the names change
the picture), every card text that names a class, the spec's class section, CLAUDE.md.

## 8. Settled, and still open

**Settled by Leon (13 Nov):** Bulwark and Breaker; talk is no class's move; the Chaplain's shape; the Mender's free
Bond; the budget; one big patch.

**Calls made for him (he can reverse any):** the other seven names stand as suggested (Skirmisher, Operative,
Sigilist, Rigger, Mender, Channeler kept, Chaplain); Salvage replaces Silver Tongue and Smite replaces Command;
Rewrite waits in the move pool; Jury-Rig is the Rigger's rank III.

**Settled by Leon on draft 2 (13 Nov):** Reflex in full (two reactions a round for the Skirmisher); the patron at
the Chaplain's side is a presence, not a body; Smite is measured, and it is meant to lift the Chaplain's offence
("a Whisper is already weaker compared to other classes, so Smite makes up for their offensive capability").

**The seven specs** (being written 13 Nov; each ends with its own questions for Leon): `shadow-spec.md`,
`bonds-spec.md`, `figments-spec.md`, `chaplain-spec.md`, `reactions-spec.md`, `rev4-moves-and-rename.md` (the moves
that change hands, the rename, the build order).

**A correction the specs carry:** this draft has the Mender take Strain (a Bonded ally going Down; Take the Weight).
Strain is Determination's meter; the Bonds spec replaces it with a cost in MP or HP.

**Settled by Leon on the specs (13 Nov, later):**

1. **The budget reading: the base class all in sits ON the contract ceiling** (where today's classes were fitted),
   a door user all in about 13% under it, the squared class about 13% over it in a column of its own. Section 2's
   "15% / 30%" is read this way; nothing fitted in rules 1.26 and 1.27 moves.
2. **A reaction never triggers a reaction.** No Riposte of a Riposte, no Parry of an opportunity attack.
3. **Killzone spends both of the Skirmisher's reactions.**
4. **Ward is 7 × Blessing power**, uses the turn's Whisper, and sits on at most two allies at once.
5. **Smite stays at Rebuke's 20; the Chaplain's own line is 125% of a rifle-turn all in.**
6. **The current advanced classes may be shelved for a whole new system**, designed after all of Revision 4 is in.
   So the squared classes' "one rule broken" lines and the bridges of section 6 are sketches of the shape, not a
   plan; no spec may depend on them.

**Calls made for him on the specs' other questions (no answer; each is the lead's recommendation, he can reverse
any):** every door plays its whole loop at 1 point, smaller (one Figment, the Double, at Visualization 1); Shadow as
its spec's section 11 recommends (no gain on a turn you attacked, a silent attack lets the target roll to spot, the
ambush a flat ×1.5 and 0.15 a point spent, the line 125% over three turns, Sabotage 1 round, Toxin's doses its own
supply); the Mender as its spec recommends (Take the Weight 15% of max HP, a felt Down 10 MP, Traced, the free Bond
with no range limit, Supplies leave, Brimming replaces the Outburst Mend, Empathy's free Pump moves to Will Power
and the Outburst is re-measured); Figments as its spec recommends (upkeep 1 charge a Figment a turn, the Blade's
strike spends your reaction, a ceiling of 150% for bodies on the board, Scrap Turret for Jury-Rig); Suppressed never
blocks a protective reaction; the Chaplain's Judgement is renamed Verdict *(Suggested)*. **Settled by Leon since:** the Visualizer is a
glove with a projector in the middle of the palm; **prayer opens at Faith 1** (Whispers at Faith 1 and 2, Hymns
from 3 as built). Nothing of the design is open now.

**The consolidated primitives** are in `rev4-primitives.md`: the six specs asked for 26; 12 are needed, with 13 rows
added to closed lists. The specs are brought into line with it and with the rulings above in one pass.

**Settled by Leon, 13 Nov (after 0.25.0): the Mender fights, through Bonds on enemies; and base classes are
weapon-neutral.**

1. **A Bond can be tied to an enemy** (the door, for anyone with Empathy; the same action and the same cap as an ally
   Bond). While an enemy is Bonded to you:
   - **it takes damage for you:** part of the damage you take goes to it instead, so you take less;
   - **you hit it more easily:** a bonus to hit a Bonded enemy;
   - **your healing hurts it:** when you heal yourself, each Bonded enemy takes a quarter of that heal as damage at the
     start of its next turn; with Bonds on allies and on enemies at once the same holds through the ally Bond (what
     you heal on a Bonded ally is felt the same way).
   An advanced class may later tie an ALLY to an enemy ("making the tank the mega tank"): a sketch only, like every
   advanced idea.
2. **The more you are tied, the harder you hit:** an inherent rule of the door: your damage rises with the number of
   Bonds you hold, to allies or to enemies.
3. **The Mender's class skill:** it collects the healing and shielding it gives (to allies and to itself) and spends
   what it has collected as a damage bonus on its next damaging action.
4. **Base classes are weapon-neutral (binding on all nine):** a class move or class rule that changes damage, to-hit
   or what a hit does applies to EVERY weapon the character may attack with (gun, bow, blade, fist, thrown, and the
   weapon attack of a focus), never to one family. A move may still need what its own door needs (a reaction, the
   door's meter, a focus in hand). Leon saw a Faith rank II move that only worked with guns: that is the kind of thing
   to find and fix. The specs and `data/classes.json` are audited against this rule (13 Nov), and step 2 onward
   builds from the audited specs.

**Lore and a ruling from Leon, 13 Nov: the gloves are the standard system; a faction's way has its own focus.**
The Evoker and the Emanator as gloves are a **unified system made by the gear companies**: standard issue, the same
for everyone, and what the base classes use. So the base doors' focuses are all gloves of that one system: the
Evoker (Sigils), the Emanator (Outbursts), the Visualizer (Figments: the projector in the palm), and **the focus that
gates Bonds** (Leon: Bonds is unique enough to need its own gate, like the Visualizer; working name the Attuner
*(Suggested)*: a glove of the same line with its own heart, not a separate kind of object). **Advanced classes are
learned from factions, and each faction has its own way of Sigiling or Outbursting, so each advanced class (squared
or hybrid) has a special Evoker or Emanator of its own; the Evoker blade is one.** For the design: a base class
never needs anything but the standard glove; a faction focus is how an advanced class will be told apart and gated
when that system is designed (a sketch, like every advanced idea here); nothing in Classes 3.0 builds one, and the
focus item's data shape must leave room for variants (a focus is an item with a door, a hand rule and a core or MP
link, not a hard-coded glove).

**Mana arms (Leon, 13 Nov; for the later advanced-class system, nothing to build now).** The idea behind mana arms
was a Soul user with a sword: a custom-made weapon and a martial art whose cuts give off the elements; not a hybrid
like the Storm Hand, since nothing is shot from an Emanator: "they just absorb, dance, and win". It predates Sigils;
with Sigils in the design it lives on as **the blade Evokers**, and Leon has shelved it as an idea for a new advanced
class. **What mana arms are in the engine today** (rules 7.11, `data/weapons.json`): seven weapons anyone can use who
meets the skill requirement: the core rifle (Dexterity 3; a mana core as ammunition), the Spellslinger's pistol, the
**Evoker blade** and the **Grand staff** (Brain Power 3; each counts as an Evoker), the **Emanator gauntlet** (Will
Power 3; counts as an Emanator), the Lumeri censer gun (Faith 3) and the bot-thread banner (Empathy 3); each hit adds
1 to the ambient mana. They were written as the class weapons of five Revision 2 hybrids. **For Classes 3.0 they stay
exactly as they are.** They are already what a faction focus looks like in rules: a weapon that is also a focus, so
it frees the hand the standard glove takes. When the advanced system is designed, these seven are its starting stock
and that freed hand is its first number to price; until then no new one is added, and none counts as the Visualizer
or the Bond focus.

**Settled by Leon, 13 Nov (on the Bonds rewrite):** (1) **one hook for every roll to hit:** Sigil and Outburst
attack rolls are brought onto the same roll primitive's hook as weapon attacks (`rolls.ts`), so a to-hit bonus such
as the one against a Bonded enemy reaches every way of attacking; built in step 1b; (2) the Ledger is the Mender's
rank I move (Inspire to II, Brimming to III; Field Surgery is anyone's at Empathy 3); (3) healing yourself is once a
turn; (4) a Channeler who also tends (about 140 against the Outburst's 135) is measured when built, not refitted on
paper. **The Bond focus is the Attuner** (Leon: "sounds cool, keep it"): the fourth standard glove, fine filaments
from a core on the back of the hand to each fingertip, one lit a Bond, in Insight's ink.

**The healing order (Leon, 13 Nov): "Sigil and pure Outburst also have a healing school and word, so tune our
Insight class to heal more than them; if not, what's even the point."** Ruling: **Tending is the game's best healing,
and every other door's healing is an off-heal.** In Soldier-turns for a whole turn spent healing, all in (the
contract's unit; rules 1.27 put every heal on 2.0):

| Who heals | Line (all in) | Was (rules 1.27) | Dial |
| --- | --- | --- | --- |
| The Mender, Tending through Bonds | **2.0** (the ceiling; the class sits on it) | new | `output.profiles.tend` |
| A door user with Empathy, Tending | about 1.74 (13% under the class, the frame's reading) | new | the same |
| An Outburst of the Buff school (Channeler or anyone with the door) | **1.4** | 2.0 | `output.profiles.soul_mend` |
| A Sigil MEND word | **1.4** | 2.0 | `output.profiles.sigil_mend` |
| Prayer: a Whisper's heal, a turn | **1.4** | about 2.0 | `output.profiles.blessing_mend` |
| Prayer: a Hymn's heal, the turn it is said | up to 2.0, and no more than 1.4 averaged over its wait | up to 2.5 | the same, and the wait |
| Kits and stims (gear, anyone) | unchanged: priced by the item, not a door | as built | items |

The numbers 1.4 and "70% of the Mender" are the lead's (a call made for Leon; PROVISIONAL): an off-heal keeps one
ally standing against one Soldier with something to spare, and cannot hold a line the way a Mender does. Shields
follow their heals (×1.2 of the heal line, as the contract has it). **This is part of Classes 3.0, not a hotfix:**
the live game has no Tending yet, so Sigil and Outburst heals stay at 2.0 until the patch that brings the Mender;
the patch lowers them in the same revision that adds Tending (step 7), with the golden lines re-recorded on purpose,
and step 11 measures all five lines. A Mender's other advantages are not counted in the line and stay: range through
Bonds, no Strain, no glyph to draw, Raise, lifting conditions.

**Healing and shields are balanced in percent of a character's HP (Leon, 13 Nov; this supersedes the Soldier-turn
numbers in "The healing order" above; its ORDER stands).** "Balance the whole heal and shield system with a late-game
full-HP character: the ceiling for each heal and shield source is the % of health they can heal or shield them in one
turn; then try scaling down. If a level 1 character has 125 HP and they heal for 9, not even enough to tank one arrow
shot, you fucked up." The method, the ceilings for every source and the floors are in
`docs/design/heal-shield-percent-spec.md` (being written); until it is accepted, read every Soldier-turn heal number
in the Revision 4 documents as a ratio between sources only (the Mender first; other doors at about 70% of it).
