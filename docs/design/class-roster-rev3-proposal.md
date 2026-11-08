# Class Roster, Revision 3: one base class per attribute (DRAFT 2 for Leon, 8 Nov 2026)

Status: **draft. Nothing in the spec, data or engine has changed.** Leon's direction (8 Nov 2026):

- Each attribute gets one base class.
- Advanced classes are shelved and rethought later as attribute pairs.
- Classes are written **fantasy first**. An old move is reused only where it fits. Old moves are dropped freely (their
  code stays in the engine). New moves are added where the fantasy needs them.
- **Base moves are foundations.** An advanced class keeps its base class's moves. So every base move is something the
  fantasy wants, whatever specialist it later turns into.

Draft 1 kept all 39 old base moves and bent classes to fit them (Warden's walls on the Trickster, Hexer's fear on the
Channeler). Draft 2 drops that. Every number marked NEW is provisional.

## 1. The shape

- **9 base classes, one per attribute.**
  - Each attribute's three skills are its combat, utility and social sides.
  - The class's fantasy is read from those three skills.
- **The cores line up by themselves.**
  - Body: Defender, Fighter, Marksman.
  - Mind: Infiltrator, Mage, Trickster.
  - Soul: Bard, Channeler, Guardian.
- **Two moves per rank, six per class: 54 moves in all.**
  - 28 old base moves.
  - 6 old advanced moves.
  - **20 new moves.**
- **Shelved: 11 old base moves and 57 advanced moves** (section 4).
  - Their code and tests stay.
  - They come back in the advanced rethink.

## 2. Getting a class and ranking up (provisional)

| | Rule |
|---|---|
| Earn the class | Level 3 (unchanged): the class of your **highest attribute**. On a tie you choose. Nobody is classless. |
| Rank I | On gaining the class: both rank I moves. |
| Rank II | That attribute at **5**: both rank II moves. |
| Rank III | That attribute at **8**: both rank III moves. |
| Changing class | At a level-up where another attribute has become your highest, you may switch (you keep nothing of the old class). |

Rank reads the attribute, not signature skill totals (the old 13 / 18).

## 3. The nine classes

How to read the tables:

- **[pool]** = an existing move, kept under its old id, so the engine runs it unchanged.
- **NEW** = a new move (its numbers are provisional).
- "Foundation for" names the specialists the class could grow into. Each base move is chosen so all of them still want it.

### Body

**Defender (Endurance): the body that doesn't fall.**

- Skills: Durability (the tank), Pain Threshold (wounds don't slow you), Sensory (the ground under your feet).
- Resource: Guard.
- Foundation for: the emplaced gunner, the siege engineer, the plated knight, the bodyguard.

| Rank | Move | What it does | Why the fantasy keeps it |
|---|---|---|---|
| I | Brace (2 AP) [defender] | Gain Guard (1 + Durability modifier, max 5). +2 Defense until you move. Interpose while you hold Guard. | Makes Guard; protects an ally. |
| I | Draw Fire (1 AP, 1 Guard) [defender] | One enemy must attack you next turn, or take −2 against anyone else. | Pulls the hits onto you. |
| II | Unbroken (once a scene) [adamantile_knight] | The first time you'd drop to 0 HP, drop to 1 and gain 3 Guard. | The tank that doesn't fall. |
| II | **Shrug It Off** (reaction, 1 Guard) NEW | When you gain Bleeding, Slowed, Weakened or Prone, end it. | Pain Threshold: wounds don't slow you. |
| III | Reactive Plate (reaction) [defender] | Spend Guard as you take damage: −10 per point. Shed bots raise the meter. | Guard becomes damage you never take. |
| III | **Anchor** NEW | While Braced you can't be pushed, pulled or knocked Prone. An enemy that starts its turn next to you and moves away provokes your opportunity attack. | Sensory: rooted. Holds the line for every specialist. |

Dropped: Deploy Cover and Bulwark Line (gear; they belong to the siege engineer).

**Fighter (Strength): close in and break them.**

- Skills: Raw Power (heavy melee, fists, the counter), Guts (fear doesn't get a vote), Intimidation (rule through fear).
- Resource: Momentum.
- Foundation for: the blade-scribe, the storm-hand, the brawler, the banner dancer, the berserker.

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | Lunge (1 Momentum) [fighter] | Move 2 tiles as part of a melee attack, with no opportunity attacks. | Closing the gap. |
| I | **Shove** (1 AP) NEW | Push an adjacent enemy 1 tile, or knock it Prone (Body save against 12 + your Body debuff strength). | Raw Power's simplest verb. Every melee build wants it. |
| II | Riposte (reaction, 1 Momentum) [fighter] | When a melee attack misses you, hit back for 0 AP. | The counter (Raw Power). |
| II | Lingering Dread [shade] | When you kill, enemies within 3 who saw it save or become Shaken. | Intimidation, earned in blood. |
| III | Finisher (3 AP) [fighter] | Spend all Momentum: +20% damage per point (up to +100%). | Momentum's payoff. |
| III | **Unstoppable** (once a scene, 1 AP) NEW | Until your next turn, ignore Fear, Shaken, Slowed, Pinned and opportunity attacks, and gain 2 Momentum. | Guts. |

Dropped: Empty Hand and Sweep (the brawler and the banner dancer).

**Marksman (Agility): the gun hand and quick feet.**

- Skills: Athletics (dodge, light blades), Dexterity (guns, reloads, recoil), Reaction Speed (moving in time).
- Resource: Heat.
- Foundation for: the gunslinger, the heavy gunner, the ballistician, the spellslinger.

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | Fire Discipline [marksman] | Aimed shots add no Heat. One Burst a turn costs 2 AP. Bows get +3 on Aimed. | Heat control for every gun. |
| I | **Speed Loader** NEW | Your first reload each turn costs 1 AP less (minimum 1). | Dexterity: reloads. |
| II | Special Ammo (per rest) [marksman] | One magazine each of AP, hollow-point and incendiary. Swap type while reloading. | Every gun build wants the right round. |
| II | **Duck and Roll** (reaction) NEW | When a ranged attack targets you, step 1 tile first. If that puts you in cover or out of sight, the attack is at −2 or has no target. | Athletics and Reaction Speed. |
| III | Killzone [marksman] | Overwatch holds two shots, one each at the first two enemies to move, both at +2. | Owning the ground. |
| III | Called Shot (3 AP, −2) [gunslinger] | Name head, arm or leg. A hit gives that injury without a crit. | Precision, for any gun. |

Dropped: The Draw and Six for Six (the gunslinger's pistols).

### Mind

**Infiltrator (Perception): see first, strike first, fix what breaks.**

- Skills: Ingenuity (stealth, sleight of hand), Proficiency (the mechanic), Vigilant (sight and intent).
- Resources: Marks and toxin doses.
- Foundation for: the assassin, the sniper-analyst, the saboteur, the shade.

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | Mark (1 AP) [assassin] | Marked: your squad gets +1 to hit it, and it can't hide. | Vigilant: you spot for everyone. |
| I | **Vanish** (1 AP, once a turn) NEW | If no enemy can see you right now (fog, smoke, full cover), become Hidden. | Ingenuity. |
| II | Toxin (1 AP, 1 dose) [assassin] | Your next hit also adds Weakened, Slowed or Bleeding (save). | Sleight of hand. |
| II | **Field Fix** (2 AP) NEW | Adjacent: clear a jammed weapon, restore one item's durability, or repair a robot, drone or turret for 20. | Proficiency: the mechanic, missing until now. |
| III | Execution [assassin] | A hit on a Marked enemy at a quarter HP or less kills it (not bosses or Celestials). | The patient kill. |
| III | **Sabotage** (2 AP) NEW | Adjacent: disable an enemy machine, turret, drone or barricade for 2 rounds. Or rig your tile: the next enemy to enter it takes 30 and is Pinned (Body save). | Proficiency turned around. |

Name: "Assassin" is one of its specialists, so I'd call the base class Infiltrator.

**Mage (Intelligence): the Sigil scholar. Power, reach and the long script.**

- Skills: Brain Power (Sigil power and duration), Rumination (range, the library), Eloquence (logic as a weapon).
- Resource: Flux.
- Foundation for: every Sigil specialist (blade-scribe, spellslinger, glyph mason, grand sigilist, stroke gambler, circuit mage).

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | Barrage [mage] | FIRE, FREEZE, SHOCK, STONE and ACID cost 1 charge less. | Cheaper damage words. |
| I | **Core Change** NEW | Swapping a spent mana core costs 1 AP less (minimum 1). | The Evoker's reload. Every Sigil build needs it. |
| II | Overcharge (once a combat) [mage] | One word past your limit (4 glyphs max), free. | Bigger spells. |
| II | **Bleed the Flux** NEW | Venting costs 1 AP less and vents 1 more Flux. | Flux control for every Sigil class. |
| III | Payload [mage] | Double area, or one more missile. Flux = glyph count. | The scholar's big answer. |
| III | Stored Spell (per rest) [scribe] | Write a spell into an object. Anyone fires it later for 1 AP. | Rumination: the long script. |

Dropped: Quicken and Inscribe Gear (a support Sigil specialist).

**Trickster (Expression): images, reading people, lying with a smile.**

- Skills: Visualization (thought into images), Analysis (reading a target), Charisma (persuasion and lies).
- Resource: Flux.
- Foundation for: the illusionist, the con artist, the duellist of minds, the stroke gambler.

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | **Read** NEW | Analyze costs 1 AP and also tells you the target's intended next action. | Analysis. |
| I | **False Image** (2 AP, 1 charge) NEW | A decoy of you on a tile within Sigil range, for 2 rounds. Enemies who fail a Brain save treat it as you. | Visualization. |
| II | Blind and Slow [trickster] | Learn BLIND, SLOW and MUDDLE, each 1 charge cheaper. | Deceiving the senses. |
| II | **Silver Tongue** (2 AP) NEW | A target within 6 who can hear you makes a Brain save, or loses 2 AP next turn (bosses lose 1). | Charisma: lying with a smile. |
| III | Rewrite (3 AP, 3 charge) [trickster] | An enemy buff flips into its opposite (save). | Changing what's true. |
| III | **Sleight** (once a scene, 1 AP) NEW | Swap places with your False Image or a willing ally within 6. | The trick everyone remembers. |

Dropped: Bind (Body binding is the Fighter's world) and all of the Warden (walls; for an Endurance + Mind pair later).

### Soul

**Bard (Insight): nobody stays behind.**

- Skills: Empathy (feeling the other side), Camaraderie (the squad is a world), Implication (subtext).
- Resources: Supplies, MP and Strain.
- Foundation for: the medic, the heart-binder, the devoted, the banner dancer.

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | Triage (2 AP) [medic] | Heal an adjacent ally 20 × healing multiplier and end Bleeding. Stabilise for 1 AP. No Supplies. | The first thing any support does. |
| I | Inspire (1 AP, 10 MP) [bard] | An ally gets +2 on their next roll. No Strain. | Belief made useful. |
| II | Stim Throw (1 AP, 1 Supply) [medic] | Heal an ally within 4 for 30 × multiplier. | Reach the one who's down. |
| II | Mend [bard] | A Buff-school heal of 40 × multiplier, stronger in rich air. | The Soul heal. |
| III | Field Surgery (1 Supply, out of combat) [medic] | Treat a limb injury, or clear every Body condition. Repairs robots too. | Injuries outlast fights. |
| III | **Rally** (once a scene, 2 AP) NEW | Every ally within 4 heals 20 × multiplier and loses Fear and Shaken. | Camaraderie: the squad stands back up together. |

Without an Emanator, Triage, Stim Throw, Field Surgery and Rally still work. Dropped: Gift (a design-sharing specialist).

**Channeler (Determination): an iron will and a storm in the heart.**

- Skills: Will Power (the soul's strength), Lore Master (the occult library), Composure (a face that never moves).
- Resource: Strain.
- Foundation for: the storm-hand, the vessel, the heartfed, the devoted, the twinbound.

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | Shape [channeler] | Your first paid Pump each turn is free on a Damage design. | The Pump economy. |
| I | **Iron Heart** NEW | Strain limit +1. | Composure. Every Soul specialist lives at the limit. |
| II | Storm Front (+10 MP, once a turn) [channeler] | A Damage Bolt or Lance arcs to 2 more enemies with its tone's rider. | The storm. |
| II | **Occult Library** NEW | Learn one more tone; +1 ready design. | Lore Master. |
| III | Heart Surge (once a turn) [channeler] | A Release fires a stage higher (×2.6 past 4) for double Strain. | The big moment. |
| III | **Eye of the Storm** (once a scene) NEW | Your next Release this turn adds no Strain, and its tone's rider counts one stage higher. | Will over the body. |

Dropped: all of the Hexer (fear and subtext are Strength and Insight; a pair later).

**Guardian (Virtue): the saints judge, you deliver, and the squad follows.**

- Skills: Faith (prayer, Blessings), Conscience (seeing where an act leads), Authority (leadership).
- Resources: MP, Strain and Devotion.
- Foundation for: the templar, the plated knight, the contractor-commander.

| Rank | Move | What it does | Why |
|---|---|---|---|
| I | Will Shield (20 MP) [guardian] | An ally gains a 30 × multiplier shield for the combat. | Protecting the flock. |
| I | **Command** (1 AP, once a turn) NEW | An ally within 6 who can hear you moves up to 2 tiles now, for free. Needs Leadership Squad (Authority 1). | Authority. |
| II | Under the Eye [lumeri_templar] | While Witnessed, allies within 3 get +2 on actions that fit your patron. | Faith shared. |
| II | Blessed Shells [lumeri_templar] | A successful prayer's Blessing loads into your weapon, and resolves on your next hit. | Faith delivered. |
| III | Sanctuary (60 MP, +1 Strain, once a scene) [guardian] | A 3×3 zone where allies take half damage until your next turn. | Holy ground. |
| III | Judgement (4 AP, 3 Devotion, once a scene) [lumeri_templar] | One attack dealing damage × (1 + Blessing power). | The saints judge. |

Dropped: Drink It In (a shield specialist).

## 4. Shelved for the advanced rethink

All shelved moves stay in the engine and tests, and can't be learned.

- **Old base moves (11):**
  - Quicken and Inscribe Gear (Scribe).
  - Raise Cover, Ward and Seal (Warden).
  - Dread, Mind Fog and Puppet (Hexer).
  - Bind (Trickster).
  - Gift (Bard).
  - Drink It In (Guardian).
- **Advanced moves (57):** every advanced move except Unbroken, Lingering Dread, Called Shot, Under the Eye, Blessed Shells and Judgement.
- **Partly folded in:** Gunslinger, Adamantile Knight, Shade and Lumeri Templar each give some moves to base classes.
  - Their other moves are shelved with the rest.
  - Lumeri Templar is fully absorbed.

## 5. What changes, and what it costs

- **Engine:**
  - Class from the highest attribute; rank from that attribute.
  - Class move lists can name an old move id (one function).
  - Resources follow their moves.
  - Advanced learning returns "shelved".
  - **20 new move handlers**, with tests.
- **Saves:**
  - Old classes map to new ones: medic → bard, scribe → mage, warden → trickster, hexer → channeler, assassin → infiltrator. The rest keep their id.
  - Moves the new class doesn't have stop working.
  - A character with an advanced class keeps it working (grandfathered).
- **Data and spec:** the Classes section and classes.json are rewritten.
- **UI:** the level-up picker and class panel. Old emblems are reused; the Infiltrator needs one new emblem.
- **Narrator: lighter.** It knows 9 classes instead of 34, and places no tutors.

## 6. Flags for Leon

1. **20 new moves.** That's the price of fantasy first. They need tuning in the balance pass.
2. **Ranks at attribute 5 and 8** (provisional).
3. **Switching class** at a level-up when your highest attribute changes: yes (my pick), or fixed at level 3?
4. **The Guardian leans on a patron.**
   - Under the Eye, Blessed Shells and Judgement need prayer.
   - Without a patron, a Guardian has Will Shield, Command and Sanctuary.
   - Fine for a paladin fantasy, but say if a patronless Guardian should have more.
5. **Conscience has no move.** It's the Karma skill, so story-side. I left it that way on purpose.
6. **Names:**
   - Infiltrator is new.
   - Bard reads as a medic now. Keep "Bard", or call it "Medic"?
7. **Two moves per rank** doubles what a class gives at level 3. Too much?
