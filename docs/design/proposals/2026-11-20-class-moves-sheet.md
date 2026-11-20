# Class moves sheet, for designing Weapon Arts (20 Nov 2026)

For Leon. Documents only. Facts, no verdicts: Weapon Arts will add or replace moves, so this is what each base class has
today, by rank, with its cost, what it gives, and whether it reads the weapon in hand.

**Source.** `data/classes.json` (`base`, nine classes; each rank's moves, with refs resolved to `move_pool` and the advanced
classes' rows), numbers rendered from the move's own fields. Weapon reads come from the move's data (`if` with melee,
damage or mode), its text, and the guard `packages/engine/test/class-weapon-neutral.test.ts` (55 moves: 54 plus the
Bulwark's rank III ceiling; its PENDING list is empty). Class ids are Revision 3's and stay (`defender`, `fighter`,
`marksman`, `infiltrator`, `mage`, `trickster`, `bard`, `channeler`, `guardian`).

**Ranks.** Two moves a rank (`assignment`): rank I on gaining the class (level 3); rank II needs the class's own attribute
at 5 and level 6; rank III needs it at 8 and level 12. Class gains (rows under `gain`) are held from rank I and are listed
under each class; they are not moves, but Weapon Arts may touch them.

**Reading the last column.** "No" means no data, text or code read of a weapon family. "Incoming" means it reads the
attacker's weapon, not yours. "Door" means it reads a family because the class's door is that family's (Momentum, Heat,
Pressure). "Branch" means it reads the family only to pick which plain attack to make, never to refuse. "Gear" means it needs
a focus (Evoker, Emanator, Visualizer, Attuner), not a weapon family.

## Bulwark (`defender`, Endurance, Guard)

Resource: Guard, a pool of 5 at rank I, 6 at rank II, 7 at rank III, whatever Durability says; lost when the fight ends.
While you hold Guard you Interpose (a hit on an adjacent ally comes to you, 1 Guard and your reaction).

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Brace | 2 AP | Gain Guard equal to your Durability; Braced: +2 Defense until you move; Interpose for a friend beside you, 1 Guard; start each fight with 1 Guard | Incoming (Interpose answers an enemy's weapon attack) |
| I | Called Out | 0 (passive) | Challenge costs no Guard; the foe you name is Taunted with no save | No |
| II | Retort | Reaction; 1 Guard | A foe hits you in melee while you hold Guard: throw 50 percent of the blow back at it (its armour applies) | Incoming (a foe's melee blow) |
| II | Shrug It Off | Reaction; 1 Guard | Bleeding, Slowed, Weakened and Prone end at once | No |
| III | Reforge | 0 (passive) | At the start of your turn, holding 1 Guard or none: gain 2 Guard | No |
| III | Anchor | 0 (passive) | Braced: can't be pushed, pulled or knocked Prone; a foe leaving your reach provokes an attack | The opportunity attack is melee by base rule (the test allows the word) |
| III | Stand Behind Me | 0 (passive) | A ranged attack on the ally directly behind you lands on you instead; your plates take it | Incoming (a foe's ranged attack) |

Class gains: none.

## Breaker (`fighter`, Strength, Momentum)

Resource: Momentum, up to 5 (x1 to x5 on the token), built by plain melee hits and Charge, spent by a Strike, an Opener or
a Finisher. Rules 1.56: built with any melee weapon, a shield or bare hands, never with a gun or a throw.

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Barrel In | 1 Momentum, once a turn (the strike pays its own AP) | Move up to 2 tiles and strike, no opportunity attacks; the first hit a turn on a Shaken or Frightened foe gives 1 Momentum | Door (strikes with the melee weapon or fists; its hit builds Momentum only as a melee hit) |
| I | Wind-up | 0 (passive) | Start each fight with +2 Momentum | Door (the meter is melee's) |
| II | Riposte | Reaction; 1 Momentum | Answer: a melee miss against you is struck back at 0 AP, adding your Counter bonus to hit | Door (a melee miss; its riders read the technique) |
| II | Read the Swing | 0, once a round | A melee miss against you gives 1 Momentum | Door (the incoming melee attack) |
| III | Measured Blow | 0, once a fight for the any-Finisher half | A Finisher that drops its target leaves you 1 Momentum; once a fight, any Finisher does | Door (a Finisher is a melee technique; the move itself reads no family) |
| III | Unstoppable | 1 AP, once a scene | Until your next turn Fear, Shaken, Slowed and Pinned don't affect you and nobody gets an opportunity attack on you; +2 Momentum | No |

Class gains (all 0 AP unless noted): The Charge Carries (a Charge that hits gives 2 Momentum and tries to bowl its target
over, Body save against Raw Power, any weapon; never a Boss). Four Ways to Finish (Cleave, Break and Coup with any melee
weapon or bare hands; Cleave +2 to hit, Break leaves Exposed, Coup under 50 percent HP +2 to hit and 20 percent more damage).
Launch (2 AP and all your Momentum, at least 2: heave an adjacent foe 3 tiles). Wrecker (each blow or shot on cover, a
barricade or a door gives 1 Momentum). Breach (striking cover Exposes every foe within 2 tiles of it). Into the Wall (a foe
forced into a wall, cover, the edge or another body takes a slam). Hurl (2 AP: throw a loose object or a held small foe at a
tile within 4, 10 damage and more by weight).

## Skirmisher (`marksman`, Agility, Heat and Pressure)

Resource: Heat. Guns build Heat (+1 a single shot, +2 a burst, +4 full auto; every 2 Heat is -1 to hit; the gun jams at the
weapon's heat limit, 2 AP to clear; Heat falls by 2 each turn). Bows build none. The class works through Pressure, which every
hit rolled with Dexterity adds (a gun, a bow, a thrown knife, a light blade, a Dexterity glove).

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Fire Discipline | 0 (passive); once a turn for the discount | Aimed: +1 to hit and no Heat; once a turn a technique of 3 AP or more costs 1 AP less | Door (Aimed is a technique's own mode; Heat is read from the weapon's heat limit, not its family) |
| I | Hold the Lane | 0 (passive) | Held shots cost 1 AP less (at least 1); a held shot that misses still adds 1 Pressure (once a turn a foe) | Door (Pressure; a held shot) |
| II | Special Ammo | Loading is a reload (its AP); 12 attacks a load | One load each of armour-piercing (ignores armour), hollow-point (against doubled armour) and incendiary (Burning), restocked on a rest | Branch (any weapon takes a load; one code read picks the reload art) |
| II | Duck and Roll | Reaction; 0 AP | Step 1 tile before a ranged attack on you; out of sight cancels it; into cover -2 to hit | Incoming (a ranged attack on you) |
| III | Killzone | Twice the shot's AP; 2 reactions | Hold two attacks: one at each of the first two foes to enter your line or reach, +2 to hit; not while Pressed | Branch (a melee weapon holds strikes at its reach; an aimed hold needs a weapon that aims) |
| III | Run and Gun | 0, once a turn | After you attack: your next move of up to 2 tiles is free with no opportunity attack; your next hit adds +1 Pressure | Door (Pressure) |

Class gains: Reflex (one more reaction a round, two in all; what fires by itself leaves your last reaction for it). Fire and
Move (once a turn, after an attack rolled with Dexterity, a 1-tile move costs no AP and draws no opportunity attack).
Relocated (your first Dexterity attack after moving on your turn is +1 to hit, and a hit adds 1 more Pressure). Break Them
(Rout costs 1 AP less on your turn, at least 1; every save a foe makes against you is harder by 1 for each Pressure on it,
at most 2).

## Operative (`infiltrator`, Perception, Shadow and Marks)

Resource: Marks, up to 3 foes Marked at once; Shadow held is one more than Ingenuity gives; 2 toxin doses, +1 for every 3
points of Ingenuity, restocked on a rest.

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Mark | 1 AP | A foe you see is Marked until the fight ends: the squad has +1 to hit it, it can't Hide; 3 Marks at once | No |
| I | Vanish | 0, once a turn | Your Hide costs 0 AP | No |
| II | Toxin | 1 AP; 1 dose | Coat your weapon with Weakened, Slowed or Bleeding; your next hit: Body save or the condition; a Break raises the save | Branch (coats whatever weapon you hold; the text says "weapon") |
| II | Sabotage | 0 (passive) | Pick, Disable and Rig are yours (Hijack too at rank III); Disable and Rig cost no Shadow | No |
| III | Execution | 0 (passive) | A hit that leaves a Marked foe at a quarter HP or less kills it; not Bosses or Celestials | No |
| III | Called Shot | 3 AP | With any weapon (a shot, a throw, or a strike in reach) name the head, an arm or a leg and attack at -2 to hit, or no penalty while the target can't see you; a hit causes that injury (head Dazed, arm -2 to attacks with that arm, leg half Movement) | Branch (it reads the family only to make the weapon's plain attack) |

Class gains: Tradecraft (start each fight with 1 Shadow; your Shadow holds one more than Ingenuity gives; your Analyze Reads
its target; once a turn, Analyzing a foe that can't see you gives 1 Shadow).

## Sigilist (`mage`, Intelligence, Flux and cores)

Resource: Flux, up to 6 on the Evoker (each word drawn adds 1; over 6 the Evoker overloads: 10 damage a point over, locked
until the next round; Vent, 1 AP, empties it into the ambient mana). Spells also use mana cores. Gear: the Evoker (a glove or
a blade), not a weapon family. Class dial: damage through the Sigil door x1 (a dial at 1 is no item).

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Barrage | 0 (passive) | FIRE, FREEZE, SHOCK, STONE and ACID cost 1 core charge less to draw | Gear (Evoker) |
| I | Core Change | 0 (passive) | Swapping a spent core costs 1 AP less (at least 1) | Gear (Evoker) |
| II | Backdraft | 0 (passive) | When your Evoker overloads, every foe next to you takes its damage too, more as you level | Gear (Evoker) |
| II | Bleed the Flux | 0 (passive) | Venting costs 1 AP less; the next glyph after a Vent adds 1 Flux less | Gear (Evoker) |
| III | Payload | 0 (passive) | Evoke a Line with double area; it adds Flux equal to its glyphs; not with STAY, WAIT or WATCH | Gear (Evoker) |
| III | Stored Spell | 1 AP to set off, in a fight | Out of a fight write a whole Sigil spell onto an object (its charge paid now); in a fight, with an Evoker in hand, set off your oldest stored spell from your tile in every direction; keep as many as your Rumination modifier (at least 1); they fade at your next rest | Gear (Evoker) |

Class gains: none.

## Rigger (`trickster`, Expression, Figments)

Resource: Figments held (the door's count, plus one for the Rigger), kept with the Visualizer's charge. Gear: the Visualizer.
Class dial: the Rigger's Figments x1.

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Double | 2 AP; no charge | With the Visualizer in hand: a Double appears within 6 tiles for 3 rounds; one at a time, no upkeep | Gear (Visualizer) |
| I | Quick Sketch | 0, once a turn | Picture costs 1 AP less (never under 1) | Gear (Visualizer) |
| II | Salvage | 1 AP | Beside a wreck: +2 Visualizer charge, once a wreck | Gear (Visualizer) |
| II | Redline | 1 AP, once a turn | A Figment or machine of yours within 8 tiles acts now, up to 2 AP, free; it takes 5 damage | Gear (Visualizer) |
| III | Sleight | 1 AP, once a scene | Swap places with a Figment or an ally within 6 tiles, no opportunity attacks | No |
| III | Scrap Sentinel | 3 AP, once a scene | A Sentinel stands beside a wreck, weapon pile or barricade for 3 rounds, free, no upkeep | No (a "weapon pile" is a place, not the weapon in hand) |

Class gains: The Rigger's Hands (1 more Figment held, 1 more ready design).

## Mender (`bard`, Insight, the Ledger and MP)

Resource: the Ledger (the healing and shielding you give, up to its cap; your next damaging blow on an enemy spends it as
extra damage). MP is the fuel of every Tending verb and move, paid through the Attuner. Moves keep their old keys (Triage is
`class:medic.triage`).

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Triage | 2 AP; 18 MP; once an ally a turn | Heal a friend beside you (reach 2 with the Short Thread fork) or a Bonded friend in sight and stop Bleeding; out of a fight it heals 200 percent more; once a stage map in a run | Gear (Attuner) |
| I | The Ledger | 0 (passive) | Heals and shields you give fill the Ledger; your next damage adds 70 percent of it, then it empties | No (the "next blow" is any weapon's) |
| II | Inspire | 1 AP; 30 MP | Give a Bonded unit in sight a feeling you have felt: an ally gets a bonus on its next roll and the feeling's boon, an enemy the feeling's enemy face | Gear (Attuner) |
| II | Take the Weight | Reaction | A Bonded ally about to go Down stays on 1 HP and you lose 15 percent max HP (only above 25 percent); or you take its Stun, Daze or Fear | No |
| III | Brimming | 0 (passive) | Healing past max HP leaves 50 percent of the excess as a shield | No |
| III | Rally | 2 AP; 60 MP; once a scene | Every Bonded ally and every ally within 4 tiles heals and loses Fear and Shaken; not you or a Downed ally | Gear (Attuner) |

Gear column note: the class rule says MP is paid through the Attuner; Triage's own text does not name it, so "Gear" here is the class rule's, not a text read.

Class gains: none.

## Channeler (`channeler`, Determination, Strain and MP)

Resource: Strain (limit 3, +1 at Composure 1, 2, 4, 6 and 8): each Begin or cast adds 1, each turn you hold an Outburst adds
1; it falls 1 a turn and when you calm the heart; each point over the limit burns 8 damage through armour; 3 over is a Mana
Short. Gear: the Emanator. Class dial: damage through an Outburst x1.

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Shape | 0 (passive) | The free Pump each turn adds 12 percent more damage to a Damage design's Release | Gear (Emanator) |
| I | Iron Heart | 0, once a fight | On a Mana Shock: -2 Strain | Gear (Emanator) |
| II | Storm Front | 0 AP; 10 MP more; once a turn | Begin a Bolt or Lance: it arcs to 2 more foes within 2 tiles, each rolled on its own | Gear (Emanator) |
| II | Occult Library | 0, once a turn | Syphon costs 0 AP; once, out of a fight, learn one more tone | Gear (Emanator) |
| III | Heart Surge | 0, once a turn | Release or snap cast one stage higher (not past the top; a snap cast fires at stage 1); double Strain | Gear (Emanator) |
| III | Eye of the Storm | 0 AP, once a scene | Your next Release this turn adds no Strain and its rider counts one stage higher (max 4) | Gear (Emanator) |

Class gains: none.

## Chaplain (`guardian`, Virtue, Devotion)

Resource: Devotion (0 to 10, your standing with your patron) and the Hymn's wait; no move costs MP, Strain, cores or
ammunition of its own. The weapon carries the god (Smite): any weapon. Class dial: damage through a prayer x1.

| Rank | Move | Cost | Gives | Reads the weapon in hand |
| --- | --- | --- | --- | --- |
| I | Ward | 1 AP (a Whisper); no MP | Shield an ally in sight for the fight; up to 4 allies at once | No |
| I | Smite | 0, once a turn | A weapon hit on a standing foe adds Soul damage through armour, no roll; the foe is Judged until its next turn ends | Any weapon (the text says "a weapon hit"; no family read) |
| II | Under the Eye | 0 (passive) | While Witnessed, allies within 3 tiles get +2 to hit; out of a fight +2 on checks the Narrator counts as on your patron's theme | No |
| II | Blessed Arms | 0 | When a prayer succeeds you may load the Hymn into your weapon instead: your next hit with it releases it (a harmful Hymn on the target, a helpful one on every ally next to the target); it stays loaded until that hit or the fight ends; a Smite may ride the same hit | Branch (the text names every form a weapon takes: a round, an arrow, an edge, a thrown blade) |
| III | Sanctuary | 3 AP (a Hymn only you can say); no MP | Pick a tile within 6 tiles: allies on the 3x3 around it take half damage until your next turn start, preventing at most 40 x your Blessing power; starts your Hymn wait; Witnessed if answered | No |
| III | Verdict | 4 AP and 1 Devotion; once a fight | One plain attack with your weapon, whatever it is (a strike, a shot or a throw; never a Burst, an Aimed shot or a technique), dealing damage x (1 + your Blessing power); the Devotion is spent even on a miss | Branch (the family picks the plain attack; every weapon may pass a Verdict) |

Class gains: The Patron at Your Side (while Witnessed your patron stands on your tile; its interventions land where your
weapon struck). Canticle (1 AP, once a turn, not a prayer: you and allies within 2 tiles carry your patron's verse 2 rounds;
sing again for Rising, from Faith 5 Crescendo). Amen (after you pray, the first hit an ally lands before your next turn adds
10 x your Blessing power Soul damage through armour). Holy Dread (a prayer's damage leaving a foe at half HP or less: Heart
save or Shaken 1 round, once a turn). Last Rites (a prayer's heal on a Downed ally x1.5). Hallow (2 AP, your own Hymn: a
tile and the tiles within 1 hold hallowed ground 3 rounds; allies who start a turn there carry the verse, foes on it -1 to hit).

## Last section: weapon-neutral by rule, and what already depends on a weapon family

**By rule.** Leon, 13 Nov 2026: every base class is weapon-neutral. The guard
(`class-weapon-neutral.test.ts`) walks all 55 base-class moves and fails on a weapon family read in data, in text or in a
handler, beyond an allow-list that holds only door reads and incoming-attack reads. The PENDING list is empty.

**Moves with no weapon read at all** (no family, no focus beyond the class's own door): Bulwark: Called Out, Shrug It Off,
Reforge. Breaker: Unstoppable. Operative: Mark, Vanish, Sabotage, Execution. Rigger: Sleight, Scrap Sentinel. Mender: The
Ledger, Take the Weight, Brimming. Chaplain: Ward, Smite (any weapon), Under the Eye, Sanctuary.

**Moves that read the incoming attack's weapon, not yours** (allowed): Brace (an enemy's weapon attack), Retort (a foe's
melee blow), Stand Behind Me (a foe's ranged attack), Duck and Roll (a ranged attack on you), Read the Swing and Riposte (a
melee miss against you).

**Moves that already depend on a weapon family through their door:**
- **Momentum, melee only** (a melee weapon, a shield or bare hands; never a gun or a throw): Barrel In, Wind-up, Riposte,
  Read the Swing, Measured Blow, and the Breaker's gains (Charge Carries "any weapon" on a Charge; Four Ways to Finish "any
  melee weapon or bare hands"; Launch; Wrecker counts a blow or a shot on cover; Breach; Into the Wall; Hurl).
- **Heat, guns** (bows none): the Skirmisher's resource; Fire Discipline waives Heat on Aimed.
- **Pressure, Dexterity-rolled hits only** (a gun, a bow, a thrown knife, a light blade, a Dexterity glove): Hold the Lane,
  Run and Gun, Fire and Move, Relocated, Break Them.
- **A focus, not a family:** Evoker (all six Sigilist moves), Emanator (all six Channeler moves), Visualizer (Double, Quick
  Sketch, Salvage, Redline), Attuner (Triage, Inspire, Rally).

**Moves that read the family only to choose which plain attack to make** (a branch, never a refusal): Called Shot, Killzone,
Verdict, Special Ammo, Toxin (coats any weapon), Blessed Arms (names every form a weapon takes).

**Counts to check against the guard.** In the test's allow-list a handler may read a family this many times (a ratchet):
Barrel In 2, Special Ammo 1, Killzone 2, Called Shot 2, Duck and Roll 1, Verdict 2; every other move 0. If Weapon Arts adds a
family read to a base-class move, the allow-list and its count change in the same commit.
