# PHC Core Rules v1.0 (Game Spec)

> Exported from the living Claude Doc https://claude.ai/artifact/Mm2PsQVYuBKoFybSUTFii5 on 2026-11-05. The Doc is the source of truth; re-export after edits.
>
> **Revision 1.1 (2026-11-05), synced to the living Doc:** skill modifier = points − 1; skill Voices replace Inner Voice; Overreach is indulge-or-resist; creation is 10 skill points; new XP table; HP rescale; class rank thresholds 13/18. Rationale: `docs/design/proposals/2026-11-gameplay-fixes.md`.

2026-11-03 · Leon PT

## How to use this spec

This is the single source of truth for Project Heaven Cry's rules. Where it disagrees with an earlier draft (Skills v2, Traits v2, the Class Rosters), this spec wins. Every number a game engine needs is here; the content lists (traits, perks, classes, Sigil words) live in the JSON data files described at the end.

**Two referees, one rulebook.** The web game has two kinds of referee, and the spec says which one owns each rule:

- **The engine** owns anything with a number: rolls, AP, damage, Heat, the ambient mana meter, conditions, XP. It never improvises.
- **The Narrator** (an AI Dungeon Master or a human one) owns judgement: setting difficulty targets, describing the world, playing NPCs and Celestial patrons, writing voice hooks and voicing the skills that pass them, deciding when an Overreach trigger fires, granting Achieved perks. Where a rule says "the Narrator decides," the engine asks and waits.

**Conventions**

- Rolls are d20 plus modifiers against a target. "Roll Analysis" means d20 + your Analysis modifier.
- The grid uses square tiles of 1.5 m. Distances in old drafts given in metres convert at 1 tile per 1.5 m.
- Per-point bonuses from Attributes and Skills add into one derived stat (see Derived stats). Separate multipliers from traits, perks, criticals and conditions then multiply: a ×1.3 stat with a +50% trait is ×1.95.
- Round down unless a rule says otherwise. AP can be fractional (0.5); a fraction left at the end of a turn is lost.
- Mastery tiers are skill points: Mastery 1 at 3, Mastery 2 at 5, Mastery 3 at 7, Mastery 4 at 9, Mastered at 10.

## Core resolution

**The roll.** d20 + skill modifier + other modifiers, against a target number (TN) the Narrator sets. Meet or beat it to succeed.

| Difficulty | TN |
|---|---|
| Easy | 8 |
| Standard | 12 |
| Hard | 16 |
| Heroic | 20 |

**Skill modifier (the 0–10 track).** 0 points: −2 (untrained). One point removes the penalty (+0), and every point after that adds +1: 2 points +1, 3 +2, 5 +4, 7 +6, 10 +9. In formula terms: −2 at 0, otherwise points − 1. Written **mod(skill)** below.

**Natural 20** always succeeds and is a critical success: the Narrator adds a benefit. **Natural 1** always fails and is a critical failure: the Narrator adds a complication.

**Combined checks.** Most tasks call on one skill, but the Narrator can call for two or three ("Endurance and Ingenuity" in the 2020 example). Roll once with the lowest of their modifiers, +2 for each other skill in the check that has at least 1 point. The TN doesn't change.

**Opposed checks.** Both sides roll their skill; higher total wins; the defender wins ties.

**Help.** One ally with at least 1 point in the skill can help: +2 to the roll, and the helper shares any critical failure.

**Voices.** Every skill with 1 point or more is a voice in your head, with its own personality (the voice cards in skills.json). Voices are private: only their player sees them.

1. **Hooks.** When the Narrator describes a beat in story mode, it attaches hidden *voice hooks*: things a skill could notice or want, each with a skill, a TN from the ladder above, and a truth flag (true, partial or misleading) that players never see.
2. **Passive check.** The engine compares each character's **passive score, 10 + mod(skill)**, with every hook for that skill. No roll.
3. **Lines.** For each player, the passed hooks with the biggest margins, at most **2 per beat**, become private lines in the skill's voice, written by the Narrator. Voices can be wrong: a misleading hook sounds just as sure as a true one.
4. **Ask a skill.** Out of combat, once per scene per skill, a player may ask a skill what it thinks: d20 + mod(skill) against the lowest-TN unrevealed hook for that skill. On a success the skill speaks it; otherwise it has nothing to say.

**Overreach.** At Mastery 2 or higher, each skill has an Overreach trigger (listed in the skill data). When the trigger happens, the skill pushes: the Narrator voices its push, and the player chooses.

- **Indulge:** play it out. The skill's consequence happens, and you gain **1 Echo**.
- **Resist:** spend **1 Echo** (Mastery 2–4) or **2 Echo** (Mastered), and nothing happens.
- Without enough Echo, you indulge. Each skill's Overreach fires at most once per scene. There is no roll.

**Echo.** You start each session with 1 Echo and can hold at most 3. Spend 1 Echo to reroll any d20 you rolled; at most 1 Echo per roll.

## Characters

**The stat tree.** 3 Cores → 9 Attributes → 27 Skills. Each Core owns three Attributes; each Attribute owns three Skills (one α, one β, one γ). The full tree is in skills.json.

**Caps.** An Attribute can't exceed its Core. A Skill can't exceed its Attribute. Nothing exceeds 10.

**Creation budget**

| Pool | Starts at | At creation |
|---|---|---|
| Skills | 0 each | spend **10 Skill points** |
| Attributes | 1 each | spend **10 Attribute points** |
| Cores | 1 each | spend **6 Core points**. An unspent Core point trades for **2 Attribute points** |
| Traits | none | pick 0–2 |

Everyone spends the same budgets (the 2020 EPCCG's: 6 Core, 10 Attribute, 10 Skill points), so focusing on one Core costs nothing that spreading across three would save. A specialist who needs fewer Core points trades the rest for Attributes.

**No creation caps.** Only the tree's own caps apply (Skill ≤ Attribute ≤ Core ≤ 10). Put all 6 Core points into Body and you have a 7/1/1 character; the budgets themselves stop a skill at 7 at creation.

**Order doesn't matter.** You can raise Cores and Attributes first, or place skills first: when a skill needs a higher Attribute or Core, it spends those points for you, and the preview says so ("−1 skill · −1 Attribute (Endurance 3→4) · −1 Core (Body 3→4)"). A skill can't go up if its Attribute or Core would need points you no longer have. Lock in needs every point of all three budgets spent.

**Archetypes** (archetypes.json, 46 presets in 9 families, one of them **All-in**: nine 7/1/1 builds, one per Attribute) help new players. **Every archetype spends all three budgets:** picking one places the 10 Skill points and every Attribute and Core point, so there is nothing left to spend; anything can still be changed on the Skills step. An archetype that can't spend them all isn't offered. Regular archetypes spread over at least two Cores; only the All-in family puts everything in one. Archetypes are guidance only and have no effect after creation. After creation the caps work normally: to raise a skill past its Attribute you need an Attribute point, and to raise an Attribute past its Core you need a Core point, both from levelling.

**Levels and XP.** Levels run 1 to 20. XP is cumulative:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Total XP | 0 | 100 | 250 | 700 | 1,300 | 2,050 | 2,800 | 3,550 | 4,300 | 5,050 |
| **Level** | **11** | **12** | **13** | **14** | **15** | **16** | **17** | **18** | **19** | **20** |
| Total XP | 5,950 | 6,850 | 7,750 | 8,650 | 9,550 | 10,450 | 11,650 | 12,850 | 14,050 | 15,250 |

**Pacing target.** The first session (one story scene and one fight, about 250 XP) ends at level 3, so every player has a class after session 1. After that the Narrator aims for about 300 XP per character per session: about 2 sessions a level through level 5, 2.5 through level 10, 3 through level 16 and 4 after that. That is level 5 by session 5, level 10 by session 17 and level 20 by about session 51, the same overall pace as the D&D 5e DMG's session guideline.

| On reaching a level | You gain |
|---|---|
| Every level | +1 Skill point; HP rises by your HP-per-level stat |
| Every even level | +1 Attribute point |
| Every 5th level | +1 Core point |
| Level 3 | Your base class (see Classes) |

Skill books and quest rewards can grant extra Skill points. A Legendary Deed, at the Narrator's call, grants an extra Core point.

**XP sources.** XP is tagged by source, because traits care (Born Performer gets +20% from combat and nothing from conversation).

| Source | Typical award per character |
|---|---|
| Combat: easy / standard / hard / boss | 25 / 50 / 100 / 200 |
| Dialogue: a scene won through talk | 25–100 |
| Discovery: a secret, a place, a truth | 25–75 |
| Quest: an objective completed | 50–300 |
| Essence: one Essence of Experience absorbed | 100 |
| Bond: your rival reaches a new level (Rival trait, both ways) | 50 |

**Essence of Experience** is experience sealed in mana: an item worth 100 XP to whoever absorbs it. It weighs nothing, sells for 300 credits, and every character starts with one.

- **Cracking it** takes someone with Mastery 2 (5 points) in the skill that drives their focus: **Brain Power with an Evoker**, or **Will Power with an Emanator**. It takes 10 minutes out of combat.
- **Absorbing it:** whoever cracks it chooses who takes the XP: themselves or a party member present. A character can absorb **one per long rest**.
- Essence XP counts toward the Narrator's pacing target. It is tagged `essence`, so traits that change combat or dialogue XP don't touch it.

## Derived stats

In these formulas an Attribute counts from 1, so "+(Strength − 1)" is 0 at the starting value. A Skill is its points (0–10); mod(skill) is its modifier (−2 at 0, otherwise points − 1). Results round down. Percentage caps stop any reduction above 60%.

**Body and survival**

| Stat | Formula |
|---|---|
| Max HP | 100 + 15 × (Endurance − 1) + (level − 1) × HP per level |
| HP per level | 5 + 2 × Durability |
| AP per turn | 6 |
| Initiative bonus | (Agility − 1) + Reaction Speed modifier |
| Movement (tiles per AP) | 1 + 0.5 × (Agility − 1); never below 0.5 |
| Carry weight | 20 kg + 5 kg × (Strength − 1). Over it you are **Overburdened** (a permanent status while it lasts): −1 Movement per started 5 kg over, never below 0.5, and no Sprint (provisional, item 54) |
| Defense | 10 + Dodge, where Dodge = mod(Athletics), minimum 0 |
| Counter bonus | mod(Raw Power), minimum 0 |
| Injury resistance | 10% × (Endurance − 1) chance to ignore an injury |
| Critical damage taken | −10% × (Perception − 1) − 5% × Durability |
| Elemental damage taken | −10% × Pain Threshold |
| Ambush damage taken | −10% × Reaction Speed |
| Healing and shields received | +10% × Sensory |
| Saves (Body / Brain / Heart) | mod(Guts) / mod(Charisma) / mod(Composure) |
| Debuff strength (Body / Brain / Heart) | mod(Intimidation) / mod(Eloquence) / mod(Implication), minimum 0 |

**Senses and reach** (in tiles)

| Stat | Formula |
|---|---|
| Vision range | 12 + 2 × (Perception − 1) + Vigilant; halved in darkness (see Vision) |
| Detection range | 2 + Vigilant |
| Stealth | 0.5 × Ingenuity, subtracted from enemies' Detection range against you |
| Throwing range | 6 + 0.5 × Dexterity |
| Analyze range | 4 + Analysis |

**Damage multipliers**

| Stat | Formula |
|---|---|
| Physical | 1 + 0.1 × (Strength − 1) + 0.05 × Raw Power |
| Elemental | 1 + 0.2 × (Expression − 1) + 0.1 × Visualization |
| Sigil | 1 + 0.1 × (Intelligence − 1) + 0.1 × Brain Power |
| Soul | 1 + 0.1 × (Determination − 1) + 0.15 × Will Power |
| Healing and shields given | 1 + 0.1 × (Insight − 1) + 0.1 × Camaraderie |
| Critical | 2 + 0.1 × (Perception − 1) + 0.05 × Athletics |
| Ambush | 1.5 + 0.05 × Ingenuity |
| Blessing power | 1 + 0.1 × Faith |

**Magic**

| Stat | Formula |
|---|---|
| Max Sigil words per spell | 2 + floor((Intelligence − 1) ÷ 2) |
| Sigil AP cost | 1 per word − 0.5 × (Expression − 1), minimum 1 |
| Sigil Core saving | floor(Proficiency ÷ 3) per spell, minimum cost 1 |
| Sigil range bonus | +0.5 tile × Rumination |
| Sigil duration bonus | +0.5 round × Brain Power |
| Max MP (Emanator charge) | 100 + 100 × (Virtue − 1) |
| Soul cast AP | 3 − 0.5 × Empathy, minimum 1 |
| Soul mana cost | −5% × (Insight − 1) |
| Soul range bonus | +0.5 tile × Lore Master |
| Mana Syphon bonus | +10% × (Determination − 1) + 10% × Will Power |
| Strain limit | 3 + floor(Will Power ÷ 2) |
| Prayer cooldown | 4 turns − 0.5 × (Virtue − 1) − 0.5 × Faith, minimum 1 |

**Social.** Leadership comes from Authority: 0 Unfit, 1–2 Squad, 3–4 Platoon, 5+ Command. Each point of Conscience adds 1 Karma to every Karma award; each point of Authority adds 1 Reputation to every Reputation award.

## Classes

Classes aren't picked; skills earn them. Each base class has three **signature skills**, and every one of the 27 skills appears in at least one class.

**Getting your class (level 3).** For each base class, add up your points in its three signature skills. You may take any class whose total is among your two highest totals (ties included). Nobody is left without a class; a character who spread points thin just starts at a lower total.

**Class rank** follows that total: rank I when you gain the class, rank II at a signature total of 13, rank III at 18. Each rank unlocks the class's next signature move. On the pacing target, a focused character reaches rank II around level 5 and rank III around level 11; a spread-out one later.

**Advanced classes** mix two base classes. To learn one you need a signature total of 15 in one parent class and 9 in the other, plus a tutor from the faction that teaches it (the Narrator places the tutor in the story). You don't need to hold either parent class yourself.

| Core | Class | Role | Signature skills | Resource |
|---|---|---|---|---|
| Body | Marksman | Ranged offense (guns or bows) | Dexterity, Vigilant, Reaction Speed | Heat |
| Body | Fighter | Melee offense | Athletics, Raw Power, Guts | Momentum |
| Body | Defender | Defense | Durability, Pain Threshold, Guts | Guard |
| Body | Medic | Support | Sensory, Camaraderie, Proficiency | Supplies |
| Body | Assassin | Debuff | Ingenuity, Intimidation, Reaction Speed | Marks, toxins |
| Mind | Mage | Offense | Brain Power, Visualization, Vigilant | Flux |
| Mind | Warden | Defense | Rumination, Composure, Analysis | Flux |
| Mind | Scribe | Support | Proficiency, Eloquence, Rumination | Flux |
| Mind | Trickster | Debuff | Analysis, Charisma, Eloquence | Flux |
| Soul | Channeler | Offense | Will Power, Empathy, Visualization | Strain |
| Soul | Guardian | Defense | Lore Master, Conscience, Faith | Strain |
| Soul | Bard | Support | Camaraderie, Implication, Authority | Strain |
| Soul | Hexer | Debuff | Intimidation, Implication, Lore Master | Strain |

Each class's three signature moves, and all 15 advanced classes, are in classes.json.

## Combat on the grid

**The map.** Square tiles, 1.5 m each. Line of sight runs centre to centre; anything solid in between blocks it. A character on higher ground gets +1 to hit targets below.

**Order.** At the start of combat everyone rolls initiative: d20 + Initiative bonus. Highest goes first; ties go to higher Agility. If one side ambushes the other, the ambushers get a **surprise round**: each acts once with up to 3 AP, and the surprised side can't act unless a perk says so.

**A turn.**

1. **Start:** you get 6 AP. Conditions tick. Your weapon loses 2 Heat. If you didn't cast a Soul spell last turn, Strain drops by 1.
2. **Act:** spend AP on actions, in any order.
3. **End:** unspent AP is lost, except AP held for Overwatch.

**The AP ceiling.** Nothing can give a turn more than 9 AP or fewer than 2, and perks can add at most +3 AP to a single turn.

**Reactions.** Each character gets one reaction per round, used outside their turn: an opportunity attack, or a perk that says "reaction." Reactions cost no AP unless stated.

**Grid references.** Every map is a grid. Columns are letters, A, B, C… from left to right (after Z: AA, AB…), and rows are numbers, 1, 2, 3… from top to bottom. "C7" is column C, row 7. Each map carries notes on what is where ("L3–L5: stacked platinum crates"). Players see them by hovering a tile, and the Narrator reads them with the map.

**Moving outside a fight.** Between fights each character stands on a tile of the story's map. Players move their own characters freely (no AP), and the Narrator moves characters when the story moves them ("Leon moves to A15"). A fight on the same map starts with everyone where they stand; the Narrator places enemies by grid reference. When a fight ends, everyone stays where they ended up.

**Campaigns.** A campaign is a package (`data/campaigns/`, format in `docs/design/campaign-format.md`):
- a pitch the players read;
- an arc only the Narrator sees (beginning, middle, end, plus secrets): the intended shape, which the Narrator steers by but never forces;
- an opening for the Narrator's first turn;
- a cast and prepared fights;
- zones: maps with notes, objects and points of interest, approaches included, already built.

The party moves between zones when the Narrator says it travels, and each zone keeps its objects as the party left them. A host can load their own campaign file in the Room before the session starts.

**Map objects.** Everything that matters on a map is an object on a tile; the background image is only for looks. The kinds (`objects.json`):

| Kind | Blocks | Cover | HP | What it does |
|---|---|---|---|---|
| Crate | movement | half | 30 | |
| Low wall | movement | half | 60 | |
| Pillar | movement, sight | full | 80 | |
| Barricade | movement, sight | full | 60 | Breaks into rubble |
| Door | movement, sight (closed) | | 40 | Open or close: 1 AP in a fight, free outside one. Locked doors need a check or enough damage |
| Hole | movement | | | Falling in is the Narrator's call |
| Trap | | | | Hidden until spotted by passive Vigilant (10 + modifier) against its TN 12 within 2 tiles. Stepping on it deals 25 and springs it. Disarming is a check |
| Fire · Toxic spill | | | | 10 · 8 damage to anyone who starts a turn in it |
| Explosive barrel | movement | half | 20 | At 0 HP: 40 damage within 2 tiles, and the tile burns |
| Rubble | | | | Slow ground (2 per tile) |
| Container · Terminal | movement | half · none | 40 · 30 | Using it is a check |
| Point of interest · Way out | | | | Markers with text |

Shooting any object with HP works like shooting cover. Hidden objects (unspotted traps) are never shown to players. All numbers are provisional (item 59).

**Points of interest.** Any object can carry a description and **approaches**: the ways to deal with it, each a check (one to three skills and a TN) with stakes and an optional effect the engine applies on success: remove it, open it, reveal something, or disarm it. The Narrator writes them, usually when a player **examines** the object. A player standing on or next to it may **try** an approach instead of speaking that round, and the roll goes to the dice table like any other check. Each character may try each approach once per scene. Every try is recorded on the object, so the party can come back and try another way, or someone else can, without the Narrator setting anything up again.

**Speaking in a fight** costs 0 AP. What a character says or attempts that needs judgement (a bluff, a surrender offer, a prayer) goes in the combat log and is ruled on by the Narrator when the fight ends. A fight costs the AI Narrator one call: the engine runs every roll, move and enemy turn, then sends one report (key moments, who's left where, what was said).

**Moving.** Movement is tiles per AP: at Agility 1 every tile costs 1 AP; Agility 3 moves 2 tiles per AP, Agility 5 three, Agility 7 four. Moving N tiles costs N ÷ Movement AP, rounded up. Tiles you've paid for but not walked carry over to the rest of the turn, so half a Movement is never wasted. Before you commit, the grid shows your path and its AP cost.

**Opportunity attacks.** When an enemy leaves your melee reach without Disengaging, you may make one free melee attack against it as your reaction.

**Action costs**

| Action | AP |
|---|---|
| Move: each AP buys your Movement in tiles (difficult terrain: each tile counts double) | 1 per Movement tiles |
| Sprint (3 × your Movement in tiles) | 2 |
| Disengage (move 1 tile, no opportunity attacks) | 1 |
| Drop prone / stand up | 1 |
| Melee attack | 2 |
| Ranged shot, or loose an arrow | 2 |
| Aimed shot (+2 to hit) | 3 |
| Burst: 3 rounds at one target, −1 to hit for each round after the first | 3 |
| Full auto: a 3-tile cone, 10 rounds, one roll per target at −2 | 4 |
| Reload a magazine, or swap an Evoker core | 2 |
| Clear a jam | 2 |
| Throw | 2 |
| Use an item, draw or swap a weapon, open a door | 1 |
| Analyze an enemy (reveals HP, armour, resistances, weak points) | 2 |
| Overwatch: hold AP for one shot at the first enemy that moves into your line | AP of the shot |
| Draw a Sigil | 1 per word, see Derived stats |
| Cast a Soul spell | Soul cast AP |
| Syphon (refill MP from the air) | 1 |
| Vent (dump Flux into the air) | 1 |
| Crystallise (make a mana core) | 3 |
| Pray | 3 |
| Speak a sentence | 0 |
| Persuade, threaten or parley mid-fight (a skill check) | 2 |
| Shove an adjacent enemy | 2 |
| Brace (set a heavy weapon) | 1 |
| Field Repair | 2 |

## Attacks, damage and armour

**The actions perks rely on** (item 22, written 7 Nov 2026; provisional):
- **Shove** (2 AP): an adjacent enemy. Roll d20 + Raw Power modifier against 10 + the target's Raw Power or Athletics modifier, whichever is higher (an enemy uses its attack bonus). On a success it moves 1 tile directly away from you. If that tile is blocked, it is knocked prone instead. Shoving someone into fire or a toxic spill is the point.
- **Break**: attacking an object (Shoot an object; a melee strike works the same way). See Cover and Map objects.
- **Brace** (1 AP): set a heavy weapon. While braced (or prone) you don't move, the LMG loses its −2, the .700 Blackpoint can fire, and Recoil is halved. Moving ends it.
- **Field Repair** (2 AP): Proficiency 3+, uses a spare-parts kit charge, restores 10% + 5% per Proficiency point above 3 of a weapon's or a robot's Durability. Out of combat, 10 minutes per charge restores 50%.
- **Improvise Tool**: out of combat, a Proficiency check the Narrator calls; on a success you have a one-use tool for the job, as the Narrator describes it.
- **Analyze on NPCs**: out of combat it is an Analysis check the Narrator calls (TN by how guarded they are). On a success you learn what Analyze reveals in a fight, in words.
- **Wards and rituals** belong to Sigil and Soul magic; until that pass, the Narrator rules them from the perk's text.

**Prone** (1 AP to drop or stand): ranged attacks against you are at −2 and melee attacks at +2, and you can't move until you stand. **Opportunity attacks** need a free reaction (one per round). **Overwatch** spends the shot's AP now and holds the shot until your next turn: the first enemy that moves while in your line of sight and range takes it, as your reaction.

**Vision** (written 7 Nov 2026, Leon: vision, fog of war and darkness are one stat; provisional):
- **Vision range** = 12 + 2 × (Perception − 1) + Vigilant tiles.
- **Darkness** halves it. A zone is lit or dark. Light sources (fire, lamps, torches) light a radius around them, and a target standing in light is seen at full range.
- **Fog of war:** the squad shares what any member sees. An enemy out of every member's sight (range and line of sight) isn't shown and can't be targeted. **Sensory** lets you sense what you can't see: within 1 + Sensory ÷ 3 tiles (rounded down), an unseen enemy shows as a presence, with no details.
- Enemies see by the same rule (Vision 12, halved in darkness).

**Analyze.** 2 AP (1 with Analysis's Quick Read), at an enemy you can see within 4 + Analysis tiles. No roll. From then until the fight ends, the whole squad sees that enemy's HP, Defense, armour and status effects. Before that, the squad sees only its name, its tier and how hurt it looks (unhurt, wounded, badly hurt, down). If the analyst has Weak Point (Analysis 5), the squad deals +15% damage to that enemy. Details are provisional (item 56).

**Attack roll.** d20 + attack skill modifier + weapon accuracy + situational modifiers, against the target's **Defense** (10 + Dodge).

| Attack | Skill |
|---|---|
| Guns, bows, thrown weapons | Dexterity |
| Heavy melee and unarmed | Raw Power |
| Light (finesse) melee | Athletics |
| Sigils that strike | Brain Power |
| Soul spells that strike | Will Power |

Spells that inflict a condition instead of damage call for a save from the target (see Conditions).

**Modifiers**

| Situation | Modifier |
|---|---|
| Aimed shot | +2 |
| Higher ground | +1 |
| Weapon Heat | −1 per 2 Heat |
| Recoil: each earlier shot this turn | −1 each, reduced by floor(Dexterity ÷ 2) |
| Beyond effective range | −2 per range band past it, out to 2 bands |
| Target prone: melee / ranged | +2 / −2 |
| Attacker Blinded | −4 |
| Target behind half cover | −5 (full cover blocks the shot) |

**Flanking.** If the line from attacker to target doesn't pass through the side of the tile the cover protects, the cover doesn't count.

**Cover** comes in two kinds. **Half cover** (crates, low walls, wreckage) gives −5 to shots at a target next to it when the cover lies between the shooter and the target. **Full cover** (pillars, hull plates, high walls) blocks sight, so it blocks shots and Analyze through it. Melee ignores cover. All cover has HP: half 30, full 80. Shoot it on purpose (the weapon's attack AP and ammo, no roll, the weapon's damage), and a shot that misses only because of the −5 hits the half cover instead. At 0 HP the cover breaks and leaves rubble: difficult terrain, no cover. Provisional (item 57).

**Damage.** On a hit: the weapon's damage × the matching multiplier (Physical, Elemental, Sigil, Soul) × any other multipliers, then subtract armour. Minimum 1.

**Critical hits.** A natural 20 is a critical; an Aimed shot or an attack from Hidden crits on 19–20. A critical does damage × the attacker's Critical multiplier, reduced by the target's Critical damage taken. A critical also forces an injury roll.

**Natural 1 on an attack.** Guns jam; melee and spell users fumble and lose 1 AP from their next turn.

**Armour Class.** Your torso armour sets your class; every hit you take is reduced by its armour value. Armour-piercing and enhanced rounds ignore it.

| Class | Name | Armour value | Penalty |
|---|---|---|---|
| 0 | None | 0 | none |
| I | Light | 5 | none |
| II | Medium | 10 | none |
| III | Heavy | 15 | −0.5 Movement |
| IV | Assault | 20 | −0.5 Movement, −1 Dodge |
| V | Juggernaut | 25 | −1 Movement, no Sprint |

**Equipment slots** (from the 2020 sheet): main hand, off hand, head, head accessory, outer torso, inner torso, lower torso, legs, hands, footwear, **Veil**, and a backpack. The armour in the **outer torso** slot sets your Armour Class. Pieces in the other slots carry their own small effects, listed per item.

**Slot armour** (drafted 7 Nov 2026, provisional, item 61). The outer torso sets Armour Class; the other slots take these pieces, whose bonuses add up:

| Slot | Piece | Effect | Weight | Price |
|---|---|---|---|---|
| Head | Field helmet | +10% Injury resistance. | 1.2 kg | 120 |
| Head | Ballistic helmet | +2 armour. | 2 kg | 350 |
| Head accessory | Night-sight goggles | darkness doesn't halve your sight. | 0.6 kg | 500 |
| Head accessory | Gas mask | toxic spills don't hurt you. | 0.8 kg | 150 |
| Inner torso | Padded undershirt | +1 armour. | 1 kg | 80 |
| Inner torso | Trauma plate insert | +3 armour. | 2 kg | 400 |
| Lower torso | Utility belt | +3 kg carry limit. | 0.6 kg | 90 |
| Lower torso | Armoured belt | +1 armour. | 1.5 kg | 200 |
| Legs | Armoured greaves | +2 armour; −0.5 Movement. | 3 kg | 300 |
| Legs | Runner's trousers | +0.5 Movement. | 0.8 kg | 180 |
| Hands | Work gloves | +2 Unarmed damage. | 0.3 kg | 40 |
| Hands | Combat gloves | +1 armour. | 0.4 kg | 220 |
| Footwear | Field boots | rough ground costs no extra. | 1.2 kg | 120 |
| Footwear | Heavy boots | +1 armour; +10% Injury resistance. | 2 kg | 200 |

**The Veil** is a special equipment type with its own slot. Its rules aren't written yet: the engine records what's worn there and applies nothing, and the Narrator reads the item's text.

**Item weights.** Everything carried has a weight, down to the single round, and counts against Carry weight: the weapon itself, the loaded magazine (magazine plus rounds), every spare magazine and loose round, armour, and every item in the backpack. Armour by class: none 0, Light 4 kg, Medium 8, Heavy 12, Assault 18, Juggernaut 28. Rounds: .32 Decrkm 0.01 kg, revolver 0.015, rifle 0.012, shell 0.04, .700 0.12, arrow 0.03, bolt 0.04. Empty magazines: service pistol 0.1 kg, Decrkm SMG 0.2, service rifle 0.15, revolver speedloader 0.05, .700 Blackpoint 0.3, LMG box 0.8. Gear: stim 0.1, field kit 1.5, ration pack 0.6, Evoker 1.2, standard mana core 0.2, chalk and wax 0.4, Emanator 0.4, prayer beads and incense 0.3, Essence of Experience 0.1. All provisional (item 54); more items get weights as they're added. What happens over the limit isn't settled yet.

**Injuries.** After a critical, the target rolls Injury resistance; if that fails, roll a d6. 1: head, Dazed for 1 turn. 2–3: torso, Bleeding. 4: arm, −2 to attacks with it. 5–6: leg, half Movement. Arm and leg injuries last until treated. Details (item 53): Injury resistance is a d100 at or under 10% × (Endurance − 1); arms and legs are left or right on a d2; an arm injury hurts attacks with a two-handed weapon (anything but pistols, revolvers, light melee, thrown and unarmed) whichever arm it is, and a one-handed weapon only if it's the main-hand arm; leg injuries halve Movement once, however many; head and torso injuries end with the fight, arm and leg injuries go back to the character. The Narrator decides when the story treats them (a long rest with a Medic, surgery, a field hospital). Enemies resist with their tier's Endurance.

**Shields** are temporary HP, used up before real HP, and gone at the end of combat unless a rule says otherwise. Healing can't raise HP above its maximum.

**Downed and dying.** At 0 HP you're Downed: you can't act. At the start of each of your turns, roll d20: 10 or more is a success, less is a failure. Three successes and you stabilise at 1 HP; three failures and you die. Each hit you take while Downed counts as a failure. An ally can stabilise you with a stim (1 AP for a Medic, 2 AP for anyone else).

**Every death releases bots.** When any person or beast dies, the ambient mana meter rises (see Mana).

**Enemy stat blocks** (enemies.json, provisional). Hostiles that aren't full characters use one of four tiers. The Narrator picks the tier, a name and a weapon from weapons.json when it starts a fight; the engine runs them.

| Tier | HP | Defense | Attack bonus | Armour | Movement (tiles per AP) | Endurance | Spare magazines |
|---|---|---|---|---|---|---|---|
| Minion | 30 | 10 | +1 | 0 | 1.5 | 1 | 1 |
| Soldier | 60 | 12 | +3 | 5 | 1.5 | 3 | 2 |
| Elite | 100 | 13 | +5 | 10 | 2 | 5 | 3 |
| Boss | 200 | 14 | +6 | 10 | 2 | 7 | 4 |

Hostiles get 6 AP, roll initiative with their attack bonus, and deal their weapon's damage with no multipliers. A Boss counts as 3 kills for weapon mastery. Their Endurance sets their Injury resistance (10% × (Endurance − 1)), like a character's. They carry their weapon's spare magazines, which they reload from like anyone else. When a gun runs dry they fight with their fists, and what they carry is there to be stolen or looted.

## Weapons

**Guns.**

- **Heat:** a single shot adds 1, a burst 2, full auto 4. Each 2 Heat is −1 to hit. When Heat reaches the weapon's limit, it jams (2 AP to clear). Heat drops by 2 at the start of each of your turns.
- **Recoil:** each shot after the first in the same turn is −1 to hit, cumulative, reduced by floor(Dexterity ÷ 2).
- **Range:** each weapon has an effective range in tiles. Each further band of the same length is −2 to hit, out to two bands.
- **Modes:** a weapon lists which of single, burst and auto it supports.

**Bows and crossbows** make no noise, so a shot doesn't reveal a Hidden archer. Bows have no Heat and no recoil, and their damage scales with the archer's Raw Power.

**Melee** reaches adjacent tiles (diagonals count); polearms reach 2 tiles. Heavy melee weapons cost 3 AP per attack, and use Raw Power. Light melee weapons cost 2 AP, and use Athletics.

**Ammo types**

| Ammo | Effect |
|---|---|
| Standard | none |
| Armour-piercing | ignores armour; −20% damage |
| Hollow-point | +30% damage; armour counts double |
| Incendiary | target is Burning; −10% damage |
| Enhanced | a sliver of mana core in every round. Ignores armour, deals Elemental damage, and each hit releases bots (+1 on the ambient mana meter). One core makes 10 rounds. Rare, and expensive to buy. |

**Reloading** (2 AP) uses up ammo you carry. Magazine weapons (the pistol, SMG, service rifle, LMG, .700, and the revolver's speedloaders) swap in your fullest spare magazine, and the one in the gun drops on the floor: empty, or with whatever rounds were left in it, which are lost with it. Weapons loaded round by round (lever carbine, scattergun, long rifle, bows, crossbow) top up from loose rounds and drop nothing. No spares, no reload: fight with something else. Starting kits carry spares: the medic and the Sigil student 2 pistol magazines, the line soldier 3 rifle magazines, the Soul initiate 2 speedloaders. Enemies carry the spare magazines their tier lists (Enemy stat blocks). Provisional (item 55).

**Magazines and rounds are inventory.** The backpack lists loaded, part-loaded and empty magazines, and loose rounds, separately, each with its weight. Reload only takes a magazine with rounds in it. **Picking up** (1 AP) takes everything on your tile or one adjacent tile: dropped magazines, empty or not, go back in the pack. **Loading** a magazine from loose rounds costs 1 AP per 5 rounds in combat (load part of one if you're short of AP), and nothing out of combat. Starting kits also carry loose rounds: 24 for the pistols, 48 rifle rounds for the line soldier, 12 for the revolver. Provisional (item 58).

**Starter weapons** (damage before multipliers; range in tiles)

| Weapon | Type | Damage | Range | Magazine | Heat limit | Modes | Weight |
|---|---|---|---|---|---|---|---|
| Service pistol (.32 Decrkm) | Pistol | 20 | 8 | 12 | 6 | single | 1 kg |
| Drifter revolver | Revolver | 28 | 10 | 6 | 6 | single | 1.5 kg |
| Decrkm SMG (.32 Decrkm) | SMG | 15 | 8 | 30 | 10 | single, burst, auto | 3 kg |
| Hellraiser service rifle | Rifle | 30 | 16 | 24 | 8 | single, burst, auto | 4 kg |
| Lever carbine | Rifle | 32 | 14 | 8 | 6 | single | 3.5 kg |
| Lumeri scattergun | Shotgun | 40 within 4 tiles, 25 within 8 | 8 | 6 | 6 | single | 4 kg |
| Long rifle | Rifle | 50 | 30 | 5 | 6 | single | 6 kg |
| .700 Blackpoint anti-materiel | Heavy | 90, ignores 10 armour | 40 | 3 | 3 | single; must be braced or prone | 15 kg |
| Hellraiser LMG | Heavy | 25 | 18 | 100 | 14 | burst, auto; −2 to hit unless emplaced | 10 kg |
| Recurve bow | Bow | 20 + 5 × Raw Power | 14 | quiver of 20 | none | single | 1.5 kg |
| Crossbow | Bow | 35 | 16 | 1 | none | single | 4 kg |
| Combat knife | Light melee | 15 (thrown: 6 tiles) | 1 | none | none | none | 0.5 kg |
| Sabre | Light melee | 28 | 1 | none | none | none | 1.5 kg |
| Ork machete | Heavy melee | 35 | 1 | none | none | none | 3 kg |
| Maul | Heavy melee | 45 | 1 | none | none | none | 7 kg |
| Lance | Heavy melee, polearm | 32 | 2 | none | none | none | 3 kg |
| Gloves or bare fists | Unarmed | 10 | 1 | none | none | none | 0 kg |
| Frag grenade | Thrown | 40 to everyone within 2 tiles | throwing range | none | none | none | 0.5 kg |
| Smoke grenade | Thrown | blocks sight within 3 tiles for 2 rounds | throwing range | none | none | none | 0.5 kg |
| Flashbang | Thrown | Blinded for 1 round within 2 tiles (Body save) | throwing range | none | none | none | 0.5 kg |

### Weapons, version 2 (accepted 7 Nov 2026)

The full roster, hands and dual wielding, rarity, durability, mods, calibres and prices. Accepted from `docs/design/Weapons-v2-proposal.md` with Leon's calls: durability wears per attack, darkness and torches work through Vision, the Ork machete is one-handed, all types stay. A weapon skill that the engine doesn't run yet falls back to the Narrator with its text. All new numbers are provisional (item 61).

#### 1. Anatomy of a weapon

| Field | Meaning |
|---|---|
| **Type** | One per icon (e.g. "service rifle"). Rarer versions are the same type. |
| **Family** | The weapon-mastery family: kills here level its mastery. |
| **Hands** | 1H or 2H. |
| **Uses** | The attack skill: Dexterity (guns, bows, thrown), Athletics (light blades), Raw Power (heavy melee, unarmed). |
| **Grants** | One **weapon skill**: an action or reaction you have only while you wield it. |
| **Stats** | Damage, range (tiles), magazine and ammo, heat limit, modes, AP, weight. |
| **Durability** | Wear points (section 4). |
| **Mod slots** | Which mods fit (section 5). |
| **Price** | In credits, at Standard rarity. |
| **Lore** | One line, in-world. |

A **weapon skill** never repeats a general action (Overwatch, aimed shot, burst and auto are open to everyone). Unless it says otherwise, a weapon skill is usable once per turn and stacks with weapon-mastery perks.

#### 2. Rarity

Same icon, a different border and name. Rarity is shown as a **word plus ornament marks** on the frame (0 to 4), not by hue: colour already means skill, core and state.

| Rarity | Marks | Stats | Price |
|---|---|---|---|
| **Standard** | 0 | As listed | ×1 |
| **Fine** | 1 | +1 accuracy, +25% durability, +1 mod slot | ×3 |
| **Masterwork** | 2 | +2 accuracy, +10% damage, +50% durability, +1 mod slot | ×8 |
| **Relic** | 3 | Masterwork, plus one named property (written per item; hybrid adjudication) | ×25 |
| **Celestial** | 4 | Relic, plus a quirk. Made by a Celestial, often as a LARP of something from real Earth (never named in the world: the Unspoken Name) | Not for sale; ×50 if it ever is |

#### 3. Hands, off hands and dual wielding

1. **Hands.** A 2H weapon fills both hands. The off hand takes a 1H weapon, a shield, a torch or a focus.
2. **Focuses must be held.** Sigils need an Evoker in a hand; Soul spells need an Emanator in a hand. The Evoker blade and the Emanator gauntlet (mana arms) count as their focus, so a spellsword can hold a blade-focus and a shield. Swapping what a hand holds costs 1 AP per hand (spec: draw or swap a weapon). Dropping is free.
3. **Single attacks.** With a weapon in each hand, attack with either one at its normal cost and modifiers.
4. **Paired attack.** One action with both weapons. **AP = the higher attack cost + 1.** The main hand attacks at −1 and the off hand at −3, at the same target or two targets, each with its own roll. The off-hand penalty drops by 1 for every 3 points in its attack skill (Dexterity for guns, Athletics for blades), to a minimum of −1.
5. **Two guns.** Each gun tracks its own heat, ammo and recoil. Reloading one gun is 2 AP; reloading both is 3 AP.
6. **Gun and blade.** A paired attack may mix a shot and a strike: the strike needs an adjacent target, and firing at an adjacent enemy provokes as usual.
7. **Injured arms.** An arm injury (spec: Injuries) applies to the weapon in that arm.
8. **Mastery.** A kill counts for the weapon that dealt the final hit. Shield bashes and torch strikes count as Unarmed.

#### 4. Durability

1. Every weapon, shield and mod has **Durability**. An attack action wears 1 (full auto wears 2); a jam or fumble wears 5 more.
2. **Worn** (25% or less): guns jam on a natural 1 or 2; melee loses 10% damage.
3. **Broken** (0): guns can't fire, melee does half damage, shields stop protecting. Broken things can still be repaired.
4. **Field Repair** (this defines spec item 22's missing action): 2 AP, Proficiency 3+, uses one charge of a **spare-parts kit**, restores 10% + 5% per Proficiency point above 3. Out of combat, 10 minutes per kit charge restores 50%. A gunsmith restores 100% for 10% of the weapon's price.
5. Durability by family: sidearms 300, SMGs 300, rifles 400, shotguns 300, heavy 500, bows 200, light blades 250, heavy melee 300, unarmed 200, mana arms 250, shields 150 (plus their HP), torches burn 30 minutes.

#### 5. Mods

| Slot | Mod | Effect | Weight | Price |
|---|---|---|---|---|
| Optic | Red dot | No −2 for the first range band past effective range | 0.1 | 200 |
| Optic | Scope | +1 to aimed shots; +1 range band before penalties | 0.4 | 450 |
| Muzzle | Suppressor | Shots don't reveal a Hidden shooter; −2 damage | 0.3 | 400 |
| Muzzle | Compensator | Recoil −1 per shot | 0.2 | 250 |
| Magazine | Extended magazine | +50% capacity (round down) | 0.2 | 300 |
| Magazine | Quick-release | Reload costs 1 AP | 0.1 | 350 |
| Underbarrel | Foregrip | First burst each turn ignores recoil | 0.2 | 150 |
| Underbarrel | Bayonet | Melee strike 15 damage, Athletics, 2 AP | 0.4 | 120 |
| Underbarrel | Underslung launcher | Holds 1 grenade round (Heavy: grenade launcher, single) | 1.5 | 900 |
| Edge (melee) | Serrated edge | Crits also cause Bleeding | 0.1 | 250 |
| Edge (melee) | Weighted head | +3 damage, +0.5 kg | 0.5 | 200 |
| Grip (any) | Wrapped grip | Can't be disarmed | 0.1 | 80 |
| Inscription (mana) | Sigil-etched magazine | Holds one stored Sigil (section 9) | 0.1 | 600 |

#### 6. Ammo and calibres

| Calibre | Round kg | Credits per round | Used by |
|---|---|---|---|
| .32 Decrkm | 0.01 | 1 | Service pistol, auto-pistol, parlour pistol, SMGs |
| Revolver | 0.015 | 2 | Drifter revolver, Magistrate heavy pistol |
| .50 Frontier (new) | 0.03 | 4 | Hand cannon |
| Rifle | 0.012 | 2 | Rifles, bullpup, LMG, rotary |
| Shell | 0.04 | 3 | Shotguns, censer shotgun |
| .700 | 0.12 | 40 | Blackpoint |
| Arrow · Bolt | 0.03 · 0.04 | 3 · 4 | Bows · crossbows |
| 40 mm grenade (new) | 0.25 | 60 | Grenade launcher, underslung launcher |
| Rocket (new) | 2.5 | 400 | Rocket launcher |
| Fuel canister (new) | 1.5 | 50 (10 bursts) | Flamethrower, rip-saw |
| Core charge | (core 0.2) | core 150 = 10 charge | Core rifle |

Ammo types multiply the price: armour-piercing ×3, hollow-point ×2, incendiary ×3. Enhanced rounds cost 15 each (one core makes 10). Empty magazines cost 30 (pistol), 40 (rifle), 25 (speedloader), 60 (drum or box).

#### 7. The roster: 65 types (58 weapons in 11 families, plus 7 off-hand items)

Range is in tiles. Mag is the magazine (or "loose", for loading round by round). Heat is the heat limit. Weight is in kg; price is in credits at Standard.

##### 7.1 Sidearms: 6 types (1H, Dexterity)

| Type | Dmg | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|
| ✓ Service pistol (.32 Decrkm) | 20 | 8 | 12 | 6 | single | 1 | 250 | optic, muzzle, magazine |
| Decrkm auto-pistol | 14 | 6 | 20 | 8 | single, burst | 1.2 | 500 | optic, muzzle, magazine |
| Parlour pistol | 16 | 4 | 2 (loose) | 4 | single | 0.4 | 150 | none |
| ✓ Drifter revolver | 28 | 10 | 6 (speedloader) | 6 | single | 1.5 | 350 | optic |
| Magistrate heavy pistol (revolver) | 26 | 8 | 7 | 5 | single | 1.4 | 450 | optic, muzzle, magazine |
| Frontier hand cannon (.50) | 40 | 8 | 5 (speedloader) | 4 | single | 2.2 | 800 | optic |

Weapon skills and lore:
- **Service pistol · Snap Shot:** swap to it and fire in one action for 2 AP. *"Issued to everyone, trusted by no one, carried by all of them."*
- **Auto-pistol · Point Blank:** +2 to hit within 2 tiles. *"For the kind of conversation that happens across a table."*
- **Parlour pistol · Ace in the Sleeve:** +2 to the first shot of a fight; a pat-down finds it only on a Hard check. *"Two rounds. That's usually one more than it takes."*
- **Drifter revolver · Fan the Hammer:** 3 AP, up to 3 shots at one target at −2 each (recoil still applies). *"Six chances, and frontier folk count every one."*
- **Magistrate heavy pistol · Stopping Power:** a hit costs the target 1 AP on its next turn. *"Central City's courts went armed for a reason."*
- **Hand cannon · Knockback:** a hit pushes the target 1 tile away from you. *"You don't fire it so much as negotiate with it."*

##### 7.2 SMGs: 4 types (Dexterity)

| Type | Hands | Dmg | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|---|
| ✓ Decrkm SMG | 2H | 15 | 8 | 30 | 10 | single, burst, auto | 3 | 600 | optic, muzzle, magazine, underbarrel |
| Legion PDW | 1H | 16 | 8 | 25 | 9 | burst, auto | 2.2 | 750 | optic, muzzle, magazine |
| Whisper SMG | 2H | 13 | 7 | 30 | 12 | single, burst, auto | 3.2 | 900 | optic, magazine (built-in suppressor) |
| Mandestra drum-gun | 2H | 15 | 7 | 70 (drum) | 10 | auto | 4.5 | 1,100 | optic, underbarrel |

- **Decrkm SMG · Spray and Pray:** full auto costs 3 AP instead of 4. *"Thirty rounds of opinion."*
- **Legion PDW · Clear the Room:** bursts get +2 to hit within 3 tiles. *"The Thousand World Legion's door-kicker."*
- **Whisper SMG · Quiet Work:** firing never reveals you while Hidden. *"Bought by people who don't want receipts."*
- **Drum-gun · Wide Spray:** full auto also catches enemies up to 2 tiles from the line. *"A merchant's answer to a negotiation gone wrong."*

##### 7.3 Rifles: 6 types (2H, Dexterity)

| Type | Dmg | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|
| ✓ Hellraiser service rifle | 30 | 16 | 24 | 8 | single, burst, auto | 4 | 900 | all four |
| ✓ Lever carbine | 32 | 14 | 8 (loose) | 6 | single | 3.5 | 700 | optic, muzzle |
| Adamantile battle rifle | 38 | 18 | 15 | 6 | single, burst | 5 | 1,300 | all four |
| CCEC marksman rifle | 40 | 22 | 10 | 6 | single | 4.5 | 1,600 | optic, muzzle, magazine |
| ✓ Long rifle | 50 | 30 | 5 (loose) | 6 | single | 6 | 1,400 | optic, muzzle |
| Legion bullpup | 28 | 14 | 30 | 8 | single, burst, auto | 3.4 | 1,100 | optic, muzzle, magazine |

- **Service rifle · Suppressing Fire:** 3 AP; mark a 3-tile line until your next turn. Enemies shooting from or moving through it are at −2, and the first one to move through it takes a shot from you. *"The Hellraisers' answer to every frontier."*
- **Lever carbine · Work the Lever:** after a hit, your next shot this turn costs 1 AP less. *"Old, honest, and never needs a battery."*
- **Battle rifle · Armour-Breaker:** shots ignore 5 armour. *"The Brigade wanted a rifle that argued with plate."*
- **Marksman rifle · Steady Aim:** aimed shots crit on 18–20. *"CCEC evidence: one round, one report."*
- **Long rifle · One Breath:** if you haven't moved this turn, aimed shots get +3 instead of +2, and range-band penalties are halved. *"Fired from the next valley over."*
- **Bullpup · Shoot and Scoot:** after a shot, move 1 tile for free. *"Short enough for a dropship aisle."*

##### 7.4 Shotguns: 4 types (Dexterity, shells)

| Type | Hands | Dmg (within 4 / within 8) | Range | Mag | Heat | Modes | Kg | Price | Mods |
|---|---|---|---|---|---|---|---|---|---|
| ✓ Lumeri scattergun | 2H | 40 / 25 | 8 | 6 (loose) | 6 | single | 4 | 650 | optic, underbarrel |
| Coach gun | 2H | 45 / 25 | 6 | 2 (loose) | 4 | single, both barrels | 3.5 | 400 | none |
| Sawn-off | 1H | 42 / 15 | 6 | 2 (loose) | 4 | single, both barrels | 2 | 300 | none |
| Brigade auto-shotgun | 2H | 35 / 20 | 8 | 12 | 9 | single, burst | 5 | 1,500 | optic, magazine, underbarrel |

- **Scattergun · Door Key:** 2 AP; breaks a door, or deals double damage to cover. *"The Church calls it a key."*
- **Coach gun · Both Barrels:** 3 AP; both shells in one attack, +50% damage. *"Two arguments, one conclusion."*
- **Sawn-off · Close Quarters:** firing at an adjacent enemy doesn't provoke. *"Illegal in Central City, which is how you know it works."*
- **Auto-shotgun · Room Sweeper:** a burst can split between two adjacent targets. *"The Brigade's corridor-clearer."*

##### 7.5 Heavy weapons: 7 types (2H, Dexterity; launchers, flamers and explosives live here)

| Type | Dmg | Range | Ammo | Heat | Kg | Price | Notes |
|---|---|---|---|---|---|---|---|
| ✓ Hellraiser LMG | 25 | 18 | 100 rifle (box) | 14 | 10 | 2,500 | −2 unless emplaced |
| Hellraiser rotary | 22 | 16 | 200 rifle (belt) | 20 | 18 | 4,500 | auto only; −1 Movement |
| ✓ .700 Blackpoint | 90, ignores 10 armour | 40 | 3 (.700) | 3 | 15 | 4,000 | braced or prone |
| Smetanita thumper (grenade launcher) | 40, radius 2 | 14 | 6 grenades (loose) | 4 | 4.5 | 1,800 | |
| Breacher tube (rocket launcher) | 110 on the tile, 60 radius 1 | 16 | 1 rocket (loose) | none | 8 | 3,000 | 3 AP to reload |
| Purifier flamer | 20 + Burning, 3-tile cone | 3 | fuel canister (10 bursts) | none | 12 | 2,200 | flame ignores half cover |
| Satchel charge | 120, radius 2 | placed adjacent | consumable | none | 3 | 600 | 2 AP to place; 1 AP to detonate (or a 1–3 round timer) |

- **LMG · Emplace:** 1 AP to set up: no −2, +1 to hit, and you can't move until you pack up (1 AP). *"The Hellraisers' favourite sentence: 'hold here.'"*
- **Rotary · Spin Up:** the first full auto each fight costs +1 AP; after that, full auto costs 3. *"Ground near it stops being ground."*
- **Blackpoint · Through and Through:** a hit carries on to the next target in line at half damage, breaking any half cover it passes. *"Anti-materiel. Everyone else is materiel."*
- **Thumper · Lob:** indirect fire: no line of sight needed if an ally sees the tile, at −2. *"Smetanita property. Return it or else."*
- **Breacher tube · Bunker Buster:** rockets deal triple damage to cover. *"The Legion's door, and the wall it was in."*
- **Purifier · Wall of Fire:** 3 AP; a 3-tile line burns for 2 rounds (Burning to anyone who ends a turn in it). *"The Lumeri insist it's a sacrament."*
- **Satchel · Shaped Charge:** placed against cover, it destroys it outright. *"Some problems are best solved from the next room."*

##### 7.6 Bows: 4 types (2H, Dexterity; bows scale with Raw Power, all silent)

| Type | Dmg | Range | Ammo | Kg | Price | Needs |
|---|---|---|---|---|---|---|
| ✓ Recurve bow | 20 + 5 × Raw Power | 14 | quiver of 20 | 1.5 | 300 | |
| Longbow | 25 + 6 × Raw Power | 20 | quiver of 20 | 2 | 450 | Raw Power 3 |
| ✓ Crossbow | 35 | 16 | 1 bolt | 4 | 500 | |
| Repeating crossbow | 22 | 10 | 6 bolts | 3.5 | 700 | |

- **Recurve · Nock and Loose:** if you haven't moved this turn, your second arrow costs 1 AP. *"Quiet, cheap, and it never jams."*
- **Longbow · Arc:** indirect shot at −2, like Lob. *"Over the wall and through the roof."*
- **Crossbow · Bolt Rest:** aimed shots cost 2 AP. *"Patience, cranked."*
- **Repeating crossbow · Volley:** 3 AP; two bolts, each with its own roll. *"An Arkvelton toy that got out of hand."*

##### 7.7 Light blades: 6 types (1H, Athletics)

| Type | Dmg | Kg | Price | Notes |
|---|---|---|---|---|
| ✓ Combat knife | 15 | 0.5 | 60 | thrown 6 tiles |
| Throwing knives (set of 4) | 12 | 0.8 | 80 | thrown 6 tiles |
| Hatchet | 22 | 1 | 120 | thrown 5 tiles |
| Legion gladius | 26 | 1.3 | 300 | |
| ✓ Sabre | 28 | 1.5 | 400 | |
| Kemizuchi duelling blade | 24, +1 accuracy | 1.2 | 550 | |

- **Combat knife · Finish It:** +50% damage against a target that is Dazed, Stunned, Bleeding or Downed. *"Every kit has one. Every story ends with one."*
- **Throwing knives · Fan of Knives:** 3 AP; one throw each at up to two targets. *"Four problems, four solutions."*
- **Hatchet · Splitter:** double damage to shields and cover. *"Frontier tool first, weapon whenever needed."*
- **Gladius · Shield Partner:** +1 Defense while your off hand holds a shield. *"Made for the second rank of a shield wall."*
- **Sabre · Riposte:** reaction; when a melee attack misses you, strike back. *"An officer's argument."*
- **Duelling blade · Lunge:** strike a target 2 tiles away. *"The school across town settles things with this."*

##### 7.8 Heavy melee: 7 types (Raw Power)

| Type | Hands | Dmg | Reach | Kg | Price |
|---|---|---|---|---|---|
| ✓ Ork machete | 1H (was 2H) | 35 | 1 | 3 | 250 |
| War axe | 2H | 40 | 1 | 3.5 | 500 |
| Adamantile greatsword | 2H | 42 | 1 | 4 | 900 |
| ✓ Maul | 2H | 45 | 1 | 7 | 450 |
| ✓ Lance | 2H | 32 | 2 | 3 | 500 |
| Glaive | 2H | 36 | 2 | 3.5 | 650 |
| Ork rip-saw | 2H | 38, ignores 5 armour | 1 | 6 | 1,400 (fuel) |

- **Machete · Chop Through:** after a kill, a free strike at another adjacent enemy. *"Orks don't make tools. They make machetes."*
- **War axe · Bite the Plate:** a hit lowers the target's armour by 5 for the fight (to −10 at most). *"Plate is just a slower kind of skin."*
- **Greatsword · Sweep:** 4 AP; strike every adjacent enemy. *"The Brigade's way of saying 'stand back.'"*
- **Maul · Knockdown:** a hit knocks the target prone. *"It doesn't cut. It explains."*
- **Lance · Charge:** after 3+ tiles of straight-line movement this turn, +50% damage. *"Adamantile knights don't stop. They arrive."*
- **Glaive · Keep Back:** reaction; strike an enemy that steps into your reach. *"The space around you is yours."*
- **Rip-saw · Rip:** a hit causes Bleeding. *"Ork engineering: loud, sharp, and on fire."*

##### 7.9 Unarmed: 3 types (1H, Raw Power)

| Type | Dmg | Kg | Price | Needs |
|---|---|---|---|---|
| ✓ Gloves or bare fists | 10 | 0 | 40 (gloves) | |
| Knuckledusters | 16 | 0.3 | 60 | |
| Hellraiser servo-fist | 30 | 2.5 | 1,200 | Proficiency 3 |

- **Fists · Grapple:** 2 AP; the target can't move until it breaks free (its Athletics or Raw Power check against your Raw Power check). *"Everyone's first weapon."*
- **Knuckledusters · Rabbit Punch:** 1 AP jab for half damage. *"A bar argument that brought friends."*
- **Servo-fist · Haymaker:** a hit pushes the target 2 tiles; if it hits a wall or cover, +20 damage to it. *"A mining tool the Hellraisers misread."*

##### 7.10 Thrown: 5 types (1H, Dexterity; range 6 + Raw Power tiles; consumable)

| Type | Effect | Kg | Price |
|---|---|---|---|
| ✓ Frag grenade | 40, radius 2 | 0.5 | 120 |
| ✓ Smoke grenade | blocks sight, radius 3, 2 rounds | 0.5 | 60 |
| ✓ Flashbang | Blinded 1 round, radius 2 (Body save) | 0.5 | 90 |
| Incendiary grenade | 15 + Burning, radius 2; the ground burns 2 rounds | 0.6 | 150 |
| Bot-scrambler | Robots Stunned 1 turn; mana arms jam; Sigils in the radius cost +1 AP for 2 rounds | 0.5 | 200 |

- **Frag · Cook It:** spend 1 AP more; the blast radius is 3. *"Pull, count, apologise."*
- **Smoke · Cover Me:** allies who start a turn inside the smoke move +1 tile. *"Not a weapon. A permission slip."*
- **Flashbang · Sudden Dark:** Blinded targets also lose their reaction. *"Lumeri riot police swear by them."*
- **Incendiary · Firebreak:** you choose which tiles in the radius burn. *"The frontier's least favourite smell."*
- **Bot-scrambler · Static:** mana arms in the radius stay jammed until cleared (2 AP). *"Science Team surplus, sold out the back door."*

##### 7.11 Mana arms: 6 types (new family; requirements listed)

Guns use Dexterity; melee uses Athletics or Raw Power. These are the class weapons for Spellslinger, Storm Hand, Blade Scribe, Lumeri Templar and Banner Dancer, but anyone who meets the requirement can use them.

| Type | Hands | Dmg | Range | Feeds on | Kg | Price | Needs |
|---|---|---|---|---|---|---|---|
| Science Team core rifle | 2H | 32 Elemental, ignores armour | 16 | a mana core: 1 charge a shot | 5 | 2,600 | Proficiency 3 |
| Spellslinger's pistol | 1H | 22 | 8 | .32 Decrkm, sigil-etched magazines | 1.1 | 1,500 | Brain Power 3 to inscribe |
| Evoker blade | 1H | 26 | 1 | counts as an Evoker | 1.8 | 2,400 | Brain Power 3 |
| Emanator gauntlet | 1H | 18 + one element | 1 | counts as an Emanator | 1.5 | 2,200 | Will Power 3 |
| Lumeri censer gun | 2H | 30 / 18 (shotgun) | 8 | shells, or blessed shells | 4.5 | 2,000 | Faith 3 |
| Bot-thread banner | 2H | 24 | 2 | none | 3 | 1,800 | Camaraderie 3 |

Each hit from mana arms releases bots: +1 on the ambient mana meter, like enhanced rounds.

- **Core rifle · Overcharge:** spend 3 charge on one shot: 80 Elemental damage, and +3 on the meter. *"The Science Team's proof that mana is a munition."*
- **Spellslinger's pistol · Stored Spell:** each sigil-etched magazine holds one Sigil, drawn into it out of combat with an Evoker (the core cost is paid then). The first hit from that magazine releases it at the target. *"Every magazine is a letter. Some are threats."*
- **Evoker blade · Edge Word:** after a hit, draw one Sigil word for 0 AP (its core cost still applies). *"The Blade Scribes write with the edge."*
- **Emanator gauntlet · Charged Strike:** kills charge it (up to 3). Spend all charge on a hit for +15 element damage per charge. *"The Storm Hand's heart goes into the fist."*
- **Censer gun · Blessed Shell:** a Templar or anyone with a patron can bless a shell (out of combat, a prayer) with a Blessing they hold. Firing it lands the Blessing on the target tile, radius 1, helping allies or harming foes as the Blessing says. *"The Church fires its prayers at range."*
- **Bot-thread banner · Rally:** 2 AP, once per fight; plant it, and allies within 3 tiles get a shield worth 15 × your Healing given. *"Banner Dancers fight armourless. The banner is the armour."*

##### 7.12 Off-hand items: 7 types

| Item | Effect | Kg | Price | Durability or HP |
|---|---|---|---|---|
| Buckler | +1 Defense. **Parry** (reaction): +3 Defense against one melee attack | 2 | 200 | 150 |
| Legion riot shield | +2 Defense. You count as behind half cover against shots from the front three directions. −0.5 Movement. **Shield Wall:** an adjacent ally behind you counts as behind half cover | 7 | 700 | HP 60: shots stopped by its −5 hit the shield (like cover) |
| Pavise | Carried, it does nothing. **Plant** (2 AP): becomes a full-cover tile in front of you (80 HP). Picking it back up is 2 AP | 10 | 1,200 | HP 80 |
| Torch | Light radius 4 (see Vision). Melee 12 Elemental (Unarmed). **Ignite:** a hit on 15+ sets the target Burning; 1 AP to light something flammable | 0.6 | 10 | burns 30 minutes |
| Flare | Light radius 6 for 3 rounds; reveals Hidden in it. Can be thrown | 0.3 | 25 | consumable |
| Evoker (held) | Needed in a hand to cast Sigils (section 3) | 1.2 | 1,000 | 250 |
| Emanator (held) | Needed in a hand to cast Soul spells | 0.4 | 1,000 | 250 |

#### 8. Prices for everything else (so the shop works)

| Item | Price |
|---|---|
| Armour, by class I to V | 150 · 400 · 900 · 1,800 · 4,000 |
| Stim injector | 80 |
| Field kit | 120 |
| Spare-parts kit (5 charges) | 80 |
| Ration pack | 10 |
| Standard mana core (spec) | 150 (small 75, heavy 300) |
| Chalk and wax | 15 |
| Prayer beads and incense | 20 |
| Essence of Experience (spec) | 300 |
| Selling | Shops buy at 40% of price; the Essence sells for its full 300 (spec) |


### Weapon mastery

Weapon mastery is the second way a character grows, beside character level. It's tracked by **kills**, separately for each of ten weapon families:

| Family | Weapons |
|---|---|
| Sidearms | pistols, revolvers |
| SMGs | submachine guns |
| Rifles | service rifles, carbines, long rifles |
| Shotguns | scatterguns |
| Heavy weapons | LMGs, anti-materiel rifles |
| Bows | bows, crossbows |
| Light blades | knives, sabres and other light melee weapons |
| Heavy melee | machetes, mauls, polearms |
| Unarmed | fists, gloves |
| Thrown | grenades, thrown knives |

**What counts as a kill.** Your attack with a weapon of that family takes a hostile out of the fight: dead or Downed. A boss counts as 3. Only fights that award combat XP count, so executions, captives and harmless targets add nothing.

| Level | Name | Kills | Attack bonus | Weapon perk |
|---|---|---|---|---|
| 0 | Untested | 0 | +0 | none |
| 1 | Blooded | 5 | +0 | Tier I |
| 2 | Practised | 15 | +1 | none |
| 3 | Veteran | 40 | +1 | Tier II |
| 4 | Expert | 80 | +2 | none |
| 5 | Master | 140 | +2 | Tier III |

- The **attack bonus** adds to attack rolls with every weapon of that family.
- **Weapon perks** come automatically at levels 1, 3 and 5: each family has one perk per tier (weapon_mastery.json). They aren't skill perks: they don't count toward Achieved perks, and every AP gain from them obeys the AP ceiling.
- Changing weapons inside a family keeps your mastery. Evokers and Emanators aren't weapons for mastery.
- **Pacing:** a character who sticks to one family makes about 4 kills a session, so Blooded comes in session 2, Veteran around session 10 and Master around session 35.

## Conditions and saves

**Debuffs come in three families,** matching the three Cores. Whoever inflicts one adds their **debuff strength** for that family; whoever receives one rolls a **save** for that family.

**The save.** d20 + your save bonus for the family, against 12 + the attacker's debuff strength for it. Succeed and the condition doesn't land. Conditions that come from a hit (Bleeding from an injury, Burning from incendiary rounds) don't allow a save.

**Stacking.** The same condition never stacks; a second application resets it to the longer duration.

| Condition | Family | Effect | Lasts |
|---|---|---|---|
| Bleeding | Body | 5 damage at the start of each turn; a stim ends it | 3 rounds |
| Burning | Body | 10 damage at the start of each turn | until someone spends 1 AP to put it out |
| Weakened | Body | −25% damage dealt | 2 rounds |
| Slowed | Body | half Movement | 2 rounds |
| Nausea | Body | −1 AP | 2 rounds |
| Pinned | Body | can't move; −2 to hit | until the end of your next turn |
| Stunned | Body | lose your next turn | 1 turn |
| Dazed | Body | −2 AP on your next turn | 1 turn |
| Blinded | Body | −4 to hit; you see only adjacent tiles | 1 round |
| Prone | Body | melee against you +2, ranged against you −2; 1 AP to stand | until you stand |
| Left Brain Debuff | Brain | −2 on Mind skill checks; Sigils cost +1 AP | 2 rounds |
| Right Brain Debuff | Brain | −2 on Expression and Soul checks; Soul spells cost +20% mana | 2 rounds |
| Confused | Brain | 50% chance each action targets someone at random | 1 round |
| Fear | Heart | can't move toward or attack the source; −2 to hit anyone else | 2 rounds |
| Shaken | Heart | −2 on Heart saves and social checks | 3 rounds, or the rest of the scene out of combat |

**Helpful states**

| State | Effect |
|---|---|
| Hidden | enemies can't target you until they spot you; your first attack from Hidden uses the Ambush multiplier, then you're revealed |
| Marked | the marker's squad gets +1 to hit you, and you can't become Hidden |
| Braced / Emplaced | set by class moves and heavy weapons; ends when you move |
| Overwatch | AP held for one reaction shot before your next turn |
| Witnessed | your patron is watching (see Mana) |

## Mana

### The ambient mana meter

Every battlefield tracks one number from 0 to 40: the bots in the air. It starts at 15 unless the Narrator sets it by location.

| Meter | Level | Soul spell cost | Syphon gives | Healing given |
|---|---|---|---|---|
| 0–9 | Thin | ×1.5 | 10 MP | ×0.75 |
| 10–19 | Normal | ×1 | 20 MP | ×1 |
| 20–29 | Rich | ×0.75 | 30 MP | ×1.25 |
| 30–40 | Flooded | ×0.5, and +1 Strain per cast | 40 MP | ×1.25 |

| Event | Meter |
|---|---|
| A person dies | +5 |
| A beast or monster dies | +3 |
| A robot is destroyed | +2 |
| A Sigil mage vents | + the Flux vented |
| A Defender loses 3 Guard to reactive plate | +2 |
| An enhanced round hits | +1 |
| Syphon | −2 |
| A Soul spell is cast | − its final mana cost ÷ 10, rounded up |
| Crystallise | −10 |
| A prayer | −5 |

**Mana cores** are bot clusters. A standard core holds 10 charge (small 5, heavy 20) and costs 150 credits. One standard core also makes 10 enhanced rounds.

### Sigil magic (Mind, through an Evoker)

An Evoker holds one core. A spell is a string of command words, drawn in order. The engine checks the grammar; the words are in sigils.json.

1. **Grammar:** at least one **Subject** word (an element or an effect), plus whatever Form or Motion it needs. Without PUSH, a spell reaches only an adjacent tile.
2. **Length:** at most your Max Sigil words.
3. **Cost:** each word's Core charge, minus your Sigil Core saving. AP: see Derived stats.
4. **Flux:** each word drawn adds 1 Flux to the Evoker. Above 6 Flux the Evoker overloads: you take 10 damage per Flux over 6, the Evoker locks for 1 turn, and all the Flux bursts into the air.
5. **Vent** (1 AP): dump all Flux into the air.
6. **Hitting:** damaging spells roll Brain Power against Defense; condition words call for the target's save against 12 + your debuff strength for that family.
7. **Damage:** element damage × Form multiplier × Sigil multiplier × Elemental multiplier.

Example: FIRE – CONDENSE – PUSH. Three words, 4 charge, 3 AP at Expression 1: a 30-damage bolt out to 8 tiles, before multipliers.

### Soul magic (Soul, through an Emanator)

An Emanator stores bots as MP, up to your Max MP. Without one, your MP is 0, and every cast pays straight from the air at +2 Strain.

1. **Design:** out of combat, design spells from one **school** plus **modules** (soul-modules.json). From Will Power 5 a spell may combine two schools. Module slots: 1 + floor(Will Power ÷ 3). You can keep 2 + floor(Empathy ÷ 2) designs ready. Improvising a new design in combat costs +1 AP.
2. **Cost:** school base + modules (+20 for a second school), × the ambient multiplier, − your Insight saving. Paid from MP.
3. **Syphon** (1 AP): refill MP from the air (see table), × your Mana Syphon bonus.
4. **Strain:** each cast adds 1 Strain (2 in Flooded air). If Strain passes your Strain limit, make a **Mana Short check**: d20 + Will Power modifier against 10 + 2 × the excess. Fail: take 15 damage per point of Strain and be Stunned. Natural 1: your heart bursts, and you drop to 0 HP. Strain falls by 1 at the start of any turn after one with no cast, and resets after combat.
5. **Hitting:** Damage spells roll Will Power against Defense; Control and Status spells call for saves.
6. **Crystallise** (3 AP, needs the meter at 10 or more): the meter drops 10 and you make one standard core.

| School | Base cost | Effect |
|---|---|---|
| Damage | 20 | 25 Soul damage |
| Buff | 20 | one ally: +2 to hit, or +2 Defense, or heal 30 × Healing multiplier; 2 rounds |
| Control | 25 | push or pull 3 tiles, or Pinned, or Slowed (Body save) |
| Status | 20 | Fear, Shaken, Confused, or a Left or Right Brain Debuff (Heart or Brain save) |

### Patrons and prayer

A **patron** is a Celestial in a pact with you, played by the Narrator. They have a theme, a costume they keep, rites they expect, and a list of Blessings (examples in patrons.json). **Devotion** runs 0–10 and starts at 3 when the pact is made: +1 for each session you keep the rites, +1 for bringing someone into the faith, −1 for a broken rite, −2 for breaking character where your patron can see.

| Faith | You can |
|---|---|
| 3 | **Pray** (3 AP): d20 + Faith modifier + half your Devotion, against your patron's mood (TN 12 by default; the Narrator moves it with events). Success: one Blessing from the patron's list, × Blessing power. Natural 1: −1 Devotion. Every prayer drops the meter by 5. Cooldown: see Derived stats. |
| 5 | **Witnessed:** after a successful prayer, until your next turn, on-theme actions get +2 and off-theme ones cost 1 Devotion each. |
| 7 | **Miracle:** once per session, spend all your Devotion (at least 5) for a Blessing at triple power, or a story-sized intervention the Narrator designs. |

## Skills, traits and perks in play

**Skill unlocks.** Every skill has two unlocks of its own, at 3 and 5 points, plus its per-point combat bonus and its Overreach trigger. They're automatic. All of it is in skills.json.

**Traits** (traits.json, 74 traits)

- Picked at creation, 0–2, and never removed. Traits marked as excluding each other can't be taken together.
- Trait bonuses add to rolls; they never count as skill points, so they can't unlock perks, skill unlocks or classes.
- Each trait has an upside, a downside and a Narrator hook. Upsides and downsides with plain numbers are engine-enforced; anything that needs judgement ("the Narrator decides when collectors turn up") is flagged for the Narrator.

**Perks** (perks.json, 106 perks)

- **Acquired:** every skill has two. Each Mastery level in the skill (3, 5, 7 and 9 points) gives one **perk step** in it: take one of its perks at Tier I, or upgrade one you hold to Tier II (Tier I always comes first). The order is the choice: at 5 points you hold both at Tier I or one at Tier II; at 7 you hold three of the four steps; at 9 you hold both at Tier II. Tier II replaces Tier I.
- **Mastered:** every skill has one Mastered perk, granted automatically at 10 points. It's the capstone only a specialist reaches; nothing else gives it.
- **Achieved** (combo perks, 19): each joins two or three skills. They need **Mastery 2 (5 points) in every skill listed**, plus a deed done in play. The Narrator grants them; the engine checks the skill requirement and records the deed. Every skill is in at least one combo.
- **Ultimate** (6): granted automatically when you hold both of the Achieved perks it names. **They're secret:** no screen lists them, hints at them or shows progress toward them until one is granted, which gets its own award screen. The AI Narrator never mentions an Ultimate the player doesn't hold.
- Every AP gain from perks obeys the AP ceiling: +3 per turn at most, 9 AP at most, 2 AP at least.

## Exploration, social play, rest, and the Narrator

**Social checks** use the target's disposition as the TN.

| Disposition | TN |
|---|---|
| Friendly | 8 |
| Neutral | 12 |
| Wary | 16 |
| Hostile | 20 |

Threats, arguments and seduction that aim to break someone rather than persuade them work like debuffs: Intimidation, Eloquence or Implication against the target's Body, Brain or Heart save.

**Karma** is one score from −100 (Chaotic) to +100 (Lawful). −29 to +29 is Neutral. Traits that lock Karma double the cost of leaving the locked band.

**Reputation** is tracked per faction, from −100 to +100: Hated (−60 or less), Hostile (−59 to −20), Unknown (−19 to +19), Known (+20 to +59), Revered (+60 or more).

**Rest**

| Rest | Takes | You recover |
|---|---|---|
| Short | 1 hour | 25% of max HP; Heat, Flux and Strain reset |
| Long | 8 hours | all HP; MP to full if the air is Normal or richer; Supplies and toxins restocked from carried stock; a Medic can treat injuries |

**The Narrator's job.** The AI Dungeon Master and a human one follow the same brief:

1. Set every TN, and say what's at stake before the roll.
2. Play NPCs and Celestial patrons; patrons keep their costumes and react to Devotion.
3. Attach voice hooks to every story beat (skill, TN, truth flag) and write the lines for the hooks the engine says were passed, in each skill's voice from its voice card. Voice Overreach pushes when a trigger happens, grant Achieved perks, and award XP by source, aiming for the pacing target.
4. **Keep the Veil.** Never reveal that the world is a simulation unless a character earns the Knowing. **The Unspoken Name:** Celestials (and players' imported characters, framed as Celestial LARPs) may plainly imitate anything from real Earth, but no real-Earth proper noun is ever said or written in the world. Describe it, rename it; the players will recognise it, the characters never can.
5. **Hold the tone line:** NPCs are funny the way people are; Celestials are funny the way people are when nothing can hurt them, careless and therefore cruel. The tragedy belongs to the NPCs.
6. Leave numbers to the engine. The Narrator asks for a roll and narrates the result; it never invents a modifier.

## Overworld rounds

Outside fights the story runs in rounds, the way a fight does, but with everyone acting at once.

- **Each round** every player character has a full turn of AP (6, at the same movement rate as in a fight) and every player has one **Say**. Players act in any order.
- **Actions** are the fight's actions at the fight's AP costs, on the area map:
  - Moving: Move, Sprint, Sneak.
  - Attacking: Shot, Aimed shot, Melee.
  - Analyze, Reload, Load a magazine, Clear a jam, Field Repair, Stim an ally, drop prone or stand.
  - Points of interest: examining one costs **1 AP**, trying an approach **2 AP**, stepping through an exit **1 AP** (and it asks the Narrator to travel). Opening a door costs 1 AP.
- **Pass** gives up only the Say. **End turn** gives up the AP left, and the Say if unused. Running out of AP ends the turn too.
- **The round closes** when every player has used or passed the Say and ended every character's turn (the host can skip an away player). It goes to the Narrator only if something needs judgement: a line said, an examine, an attempt, a travel request, or a sneaking character spotted. Otherwise the next round opens at once, with no Narrator call.
- **Trails:** each character's path this round shows on every player's area map and minimap.

**People and enemies** stand on the overworld map as tokens: hostile or neutral, each with a tier and a weapon.
- The campaign places them, and the Narrator places, moves, updates or removes them.
- A neutral token turns hostile when attacked.
- When the Narrator starts a fight on the current map, every hostile token joins where it stands.

**Attacking from the overworld** starts the fight on the spot, with everyone where they stand, the target and every hostile token on the map.
- **Seen:** the attack still lands, but the attacker sits out round 1 and acts from round 2. Allies roll initiative as normal.
- **Hidden** (sneaking and unseen): an ambush. The attack lands and the fight opens on the attacker's turn, with the AP they had left after it.

**Sneak** is a move mode for +1 AP per tile, with no dice. Starting to sneak hides you. You stay hidden until a hostile notices you, and then you must pass **Ingenuity** (d20 + Ingenuity vs 10 + its notice bonus) or be seen. A hostile notices you when:
- it has line of sight within its notice range: 4 + its notice bonus − your Dexterity modifier, halved in the dark;
- it steps next to you;
- or you attack it from its front (the half it faces).

Notice bonus: minion +0, soldier +2, elite +4, boss +6. Each hostile checks each character at most once a round. Once seen, you stay seen until you move normally and start sneaking again.

**Typed intents.** A player can also say what they do ("I move to A15 and shoot that guard"). The Narrator turns the mechanical part into actions, and the engine runs them as that player's own actions when the next round opens, from their fresh AP, under every rule above. An action the rules forbid is reported, not done.

**The shared spotlight.** When a player opens a point of interest or rolls a check, the panel or the dice table opens for the whole party by default, with a large "NAME'S TURN" banner. Everyone sees what that player hovers and chooses, live. Anyone can close it and wait for the story to tell them what happened.

## Anyone is a target

It's an RPG: players can attack anyone and anything. The game never refuses an attack; the story plays the consequences.

- **People on the map** (tokens, hostile or neutral): attacking one from the overworld starts a fight, as in Overworld rounds. **If nobody on the map was hostile before the attack, the fight gives no combat XP and no weapon kills.** The victim's attitude to the party drops to −3 in the Narrator's memory, and the dead are recorded there.
- **People who are points of interest** (a portrait on the map, like Sergeant Nine-Nine): attacking one makes them a token on the spot, neutral, a minion with fists (provisional), and the fight starts.
- **Allies (friendly fire):**
  - **On the overworld:** the attack resolves on the map. No fight starts, and the Narrator rules what follows. A character brought to 0 HP outside a fight is **Downed**: they can't act until an ally stims them or the Narrator treats them.
  - **In a fight:** any unit but yourself is a target, under the normal rules, with a warning on screen. Friendly fire earns no kills.
- **Objects:** an object with HP takes the weapon's damage (cover breaks into rubble, barrels explode). Attacking anything else costs 2 AP and goes to the Narrator.
- **The Narrator** puts every person the party can see or reach on the map as a token, maps a declared attack to actions (a target can be named by id or by exact name), and never refuses or softens one.
- A fight that has no foes can never end as a win.

## Rerolls and edits

The room can redo or reword the AI Narrator's answers, **only if everyone agrees**.

- **Suggest:** any player can suggest rerolling or rewording one of the Narrator's lines, with a note ("Keel wouldn't shoot first"). The suggestion goes to the host. Each player can have at most 3 waiting.
- **Vote:** only the host starts a vote, from a suggestion or on their own. Every player online when it starts must say yes; one no and nothing happens. The host's own yes counts.
- **Reroll:** possible for the Narrator's last 5 turns. The game goes back to how it was just before that turn: everything the turn did, and everything after it (moves, rolls, fights, loot, XP, memory), is undone, dice included. The Narrator answers the same moment again with the note.
  - The old answer stays in the log, greyed and struck through, and is never sent to the Narrator.
  - Costs already spent are kept.
  - The copies of past states live only on the host's computer.
- **Reword:** nobody can type into the Narrator's words. The Narrator rewords its own line as asked: wording, tone, emphasis and details that change no outcome. It refuses, keeping its words, any request that would change what happened (items, money, injuries, deaths, positions, who did what, results, new events). The original is kept.
- **Cost:** a reroll is one Narrator call; a rewording is a small call at low effort.

## Character portraits are cards

- **One pool, no labels.** The creation screen's portraits are one grid of cards with no names and no set labels: a card is who *you* are, not someone else in the world. *Upload* adds your own.
- **Archetype cards.** Each of the 46 archetypes gets its own painted card (commissioned: `art/briefs/archetype-portraits.md`). It shows beside the archetype on the creation screen, large in the preview, and joins the pool first. Until it is delivered, each archetype shows a different world portrait painted for one of its skills. Either way it is labelled a *suggested character icon*: the player's portrait is chosen on the Identity step.
- **The archetype screen** opens on *Show all* (all 46, with their family), and each family has its own tab.
- **NPCs use the same cards.** An NPC shows its own portrait, or, if it has none and is a person, a card from the pool cast by its role (a guard gets a guard's card). Things that aren't people (drones, turrets, beasts) don't.
- **A card a player holds is theirs.** If a player's portrait is a card an NPC was showing, the NPC shows another free card that fits the same role instead. Casting is the same on every screen.

## Character files

A character is a file you can keep, or make for a friend and send to them.

- **Download:** ⬇ beside any character on the title screen saves it as `Name.phc.zip`. Inside are `character.json` (the sheet) and `portrait.jpg` if the portrait is your own upload, at full size (up to 1200 × 1500).
- **Import:** *Import* on the title screen, or *Import a character file…* under "Bring a saved character" in a room, adds the character to your characters. In a room's lobby it is brought in at once. A file that breaks the creation rules comes in as a draft to fix on the creation screen. A character you already have is never overwritten: the import takes a free name ("Mara Voss (2)"). A file is treated as untrusted: only a sheet's own fields come in, as whole numbers and short text; a portrait is either the file's own image or one of the game's portraits, never a link.
- **Your own portrait:** *Upload* on the creation screen takes any image and crops it to 4:5. The full size stays in the file and in your browser. The room only ever carries a small copy (320 × 400, about 15–30 KB), so rooms stay light whatever people upload; a room refuses a portrait over 150 KB, and a sheet carrying over 30 KB of other text.

## Playtest tools

- **Report a problem:** ⚑ *Report* (top bar in play, the room and combat; the footer of the title screen) downloads one file, `phc-report-ROOM-time.zip`, to send to the developer. It holds what the player wrote, the browser and connection, the Narrator model (never the key: it is stripped, with anything shaped like a key), the voice's state, the last 300 errors and warnings, the host's last 3 Narrator calls (what was sent and what came back), and the game: the host's whole save, or what a guest's screen shows. Nothing is sent from the game.
- **The spend meter:** the cost beside the room code opens the Narrator's spend: the room's total, the average, last and dearest call, how much input was read from the cache, the last 20 calls against the $0.50 ceiling, and (for the host) an estimate of the next turn's request. A turn that fails after the provider answered still counts (it was billed). Rewordings count in the total but not as turns.
- **First-time tips:** one tip the first time a player meets each part of play: their round (Say, AP, Pass, End turn), the Narrator's voice, skill voices, rerolls and rewordings, combat, and the Report button. Each shows once per browser; *No more tips* turns them off.

## The Narrator's voice

The Narrator speaks aloud, free, in each player's own browser. Nothing is paid and nothing leaves the browser except the one-time model download.

- **The voice:** an open voice model (Kokoro, Apache-2.0), run on the device's graphics card where there is one, else on the processor. It downloads once (about 90 MB on the processor, more on the graphics card) and is cached. While it loads, or on a device that can't run it, the browser's own speech voice reads instead.
- **Auto-read (the default):** a new Narrator line is held back, with "The Narrator gathers their voice…" in its place, until its first sentence is ready; then the text appears as the voice starts. The rest is made while it plays. Every player hears it in their own browser.
  - A line waits at most 15 s for the voice to load and 8 s for its first sentence; past that the text shows and the browser's voice reads it.
  - A new line stops the one before. Rerolled and out-of-character lines are not read.
- **Music ducks** to a quarter of its volume while the Narrator speaks, and comes back after.
- **Read aloud:** every Narrator line and every skill voice line has a 🔊 button to hear it again (■ stops). Skill voices have their own voice by core: Body low, Mind British, Soul bright.
- **Settings** (in the music panel, per player): auto-read on or off (off: lines show at once and the voice speaks only when you press 🔊), the Narrator's voice (7 to choose from), and volume.

## The Narrator's memory

A campaign of 50 hours and four players is far more story than any prompt should carry. Models also get worse as their input grows. So the engine keeps the campaign as data and gives the Narrator only what the moment needs, inside a hard cost ceiling. **The ceiling is $0.50 per Narrator turn**, every round of lookups included. On Sonnet 5.5 at medium effort, a call on a full 50-hour, 4-player save measured **$0.18 with nothing cached and $0.045 warm**.

**What the engine keeps:**
- **The ledger**, written by the Narrator in `memory[]`:
  - **People:** role, where they are, attitude to the party (−3 to +3), alive or dead, notes, and their last few interactions with the party.
  - **Threads:** quests, promises, debts, mysteries and goals, each open, done, failed or dropped, with a short log.
  - **Facts:** with importance 1 to 5, and a secret flag for what the party doesn't know yet. A fact that stops being true is retired, never left next to its contradiction.
  - **Factions:** standing from −100 to +100.
  - **Pins:** plot essentials that are always in view.
- **Canon:** the engine writes what it knows for certain as facts the Narrator may not contradict: fights and who died in them, travel, deeds, approach results. A named NPC killed in a fight is marked dead.
- **Recursive summaries:** every closed scene keeps its summary. Every 6 scenes, the Narrator rolls them into a chapter and rewrites the saga (the story so far). If it never does, the engine folds them in itself, so memory never overflows.
- **The archive:** the live log keeps 400 lines; older lines move to the archive. The host's full save (archive included) lives in the host's browser storage (IndexedDB) at any size. The room server and other players get a slim copy, and players' views never carry the memory.

**What each call carries:**
1. **Cached for an hour**, stable content first:
   - the rules;
   - the campaign (only the current act's zones and fights in full, the rest a line each);
   - the party sheets (no changing numbers);
   - the long memory: the saga, the last 4 chapters and the pins.
2. **The turn itself:**
   - the scenes not yet in a chapter;
   - the active memory, picked for this moment inside a 9,000-character budget;
   - the party's condition, the map, the tokens and objects;
   - the recent transcript, inside a 9,000-character budget;
   - the job.
3. **How the active memory is picked:** by relevance (named in the recent transcript or the scene, or standing in this zone), importance, and recency with a forgetting curve. Open important threads and the people named now always make it in.

**The Memory menu (host only).** The host can read and fix everything the Narrator remembers, secrets and spoilers included:
- the saga, chapters and scene summaries;
- people, threads, facts (canon included) and factions;
- pins.

Every record can be edited, added or deleted, and every change is an engine action. Other players never receive the memory. The same menu will be the human Narrator's memory aid.

**Recall:** the Narrator can search everything with `recall`: every record, every scene and chapter summary, and the whole transcript back to session 1 (keyword search, BM25, on the host). It also has the wiki for rules and lore. It gets at most 3 lookups a turn, and fewer if the turn's cost nears the ceiling. Each reply may only use what is left of the ceiling.

## Music

The room hears one song at a time. The engine decides what plays and why; each player's browser plays it through YouTube's embedded player and can pause it or turn it down for that player alone. **Pausing changes nothing in the rules:** a song counts as playing for everyone while the room plays it.

**Layers** (the highest one playing wins):

| Layer | Source | Ends |
|---|---|---|
| Pinned song | A music-trait holder's song, kept on | After 2 area changes, or when its holder stops it |
| Spotlight | The favourite song of the character who did something amazing | One full play outside a fight; the end of the fight if it started in one |
| Encounter | The campaign's encounter music (boss themes) | The end of the fight |
| Combat | The zone's combat track, else the campaign's | The end of the fight |
| Ambient | The zone's ambient track, else the campaign's | Leaving the zone |

**The spotlight.** These start the character's favourite song for the whole room:

- A critical success (natural 20) on a Hard or Heroic check (TN 16 or 20).
- Taking down an elite or a boss.
- Reviving a downed ally.
- Earning a combo perk by a deed.
- An Ultimate.

Each character gets one spotlight per scene, and one per fight. A song that is already playing is never cut off: a trigger while it plays does nothing.

**The favourite song** is a YouTube link on the character's identity (Favourite Song), with its title, artist, start time and length. The link must allow embedding. What a player picks is up to the player.

**Music traits** (Soundscape of the Soul, Headbanger, Underground Sound; see the traits) add to this:

- You start with a **Musek Blestor** (0.3 kg, 120 credits).
- **Play my song:** 2 AP in a fight; free once per scene outside one. It can take over another holder's pinned song, but never a spotlight.
- **Your trait's own triggers** start your song with no once-per-scene limit: any kill, reviving an ally, or a heal of 30 HP or more.
- **Keep it playing:** while your song plays, you can pin it for the room. It stays on for 2 area changes, or until you stop it.
- **The bonus and the penalty:** the trait's +1 holds while your song plays and until 2 area changes pass without it. The −1 starts once 4 area changes have passed without it. A new character starts at 2 (no bonus, no penalty). In a fight the modifier applies to your weapon skill's attack and to checks.

**Credits.** Every change of song shows its title and artist to every player, and the music panel names the track, the artist, why it plays, and a link to the video.

**The Narrator** is told whose song is playing, never its title (the Unspoken Name).

## The Narrator's wiki

The AI Narrator carries only what the moment needs. Everything else it looks up by key, the way a player clicks a word to open its wiki page.

- **Entries come from the data pack** (the engine builds them): `skill:`, `trait:`, `perk:` (never Ultimate perks), `weapon:`, `item:`, `condition:`, `class:`, `patron:`, `enemy:`, `object:`, each with its id. They say what a thing is and does in words. The engine still owns every number in play.
- **Lore comes in keyed chunks.** The World Bible is cut by section and by titled paragraph (`truth/knowing`, `worlds/timeline`, `magic/sigil-magic`, `mana/canon`), plus `sector-earth` and `epccg-cast`. Design notes (advanced classes, how the old material reads, open questions) are never sent.
- **The campaign file decides what is preloaded** (`narratorLore`, a list of keys; a key takes everything under it). Without one, a campaign gets `truth` and `worlds`. Magic chunks join when the party carries magic: Sigil with an Evoker or Brain Power 3+, Soul with an Emanator or Will Power 3+, Blessings with Faith 3+.
- **Lookups:** the Narrator calls `wiki_lookup` with up to 8 keys at once, at most 3 times a turn; then it must answer. If the provider refuses tools with structured output, the turn runs without the wiki.

## 13. Data files

The engine never reads this document; it reads the data pack. Every rule-bearing item carries its player-facing `text`, machine-readable `effects`, and an `adjudication` tag (engine, hybrid or narrator). Ids are snake_case and every cross-reference is by id. `validate.py` checks the whole pack and must report 0 errors before anything ships. **Where a file and this spec disagree, the spec wins and the file is the bug.**

| File | Items | Holds |
|---|---|---|
| rules.json | object | Every constant in sections 2–12 (including the equipment slots), plus the lists of what the engine owns and what the Narrator owns |
| attributes.json | 9 + 3 cores | Attribute → α/β/γ skills, derived-stat formulas, core economies |
| skills.json | 27 | Slot, per-point effects, unlocks at 3/5/7/9/10, Overreach, voice card, signature-of |
| classes.json | 13 + 15 | Signatures, economy, role, resource, rank moves; advanced parents, tutor, moves; the level-3 assignment rule |
| traits.json | 74 | Upsides, downsides, excludes, Narrator hooks |
| archetypes.json | 46 | Creation presets (guidance only): role, blurb, 10-point skill preset, all attributes and cores (every creation point spent), class leans |
| enemies.json | 4 | Enemy stat tiers for hostiles that aren't full characters (provisional) |
| perks.json | 106 | 54 Acquired, 27 Mastered, 19 Achieved, 6 Ultimate |
| conditions.json | 29 | Debuffs by family (body, brain, heart), helpful states, Downed |
| weapons.json | 20 | Starter weapons, each with its mastery family |
| weapon_mastery.json | 10 + 30 | Weapon mastery families and levels, and 30 weapon perks (3 per family) |
| items.json | 1 | Items with rules of their own: Essence of Experience |
| sigils.json | 24 | Sigil words and grammar (provisional numbers) |
| soul_modules.json | 4 + 20 | Soul schools and modules (provisional numbers) |
| patrons.json | 3 | Patrons and blessings by Faith tier (provisional numbers) |
| effect_ops.json | 132 | Registry of every effect op: 50 core, 82 bespoke |

**Effect ops.** The engine implements the 50 core ops generically. The 82 bespoke ops cover about 10% of effect uses, each in one or two items: implement each as a hook on its item, or until then hand that item's text to the Narrator. An op the engine doesn't recognise always falls back to the Narrator; it is never silently ignored.

**AI Narrator context.** Each Narrator call gets the scene, the `narrator_owns` list, and the `text` of every item in play that is tagged hybrid or narrator. It never gets authority over numbers in the engine's list.

## 14. Open items for playtest

The data pack handles each of these provisionally, as noted, so the engine can be built now. Settle them at the table, then update this spec first and the data second.

**Numbers the spec doesn't give yet**

1. **Weapon accuracy.** The attack roll adds weapon accuracy, but the weapon table has no accuracy column. *Data: 0 for all weapons.*
2. **Prices.** No prices for weapons, small cores or heavy cores; only the standard core has one (150).
3. **Diagonal movement.** No cost is given. *Suggested: every second diagonal costs 2 tiles.*
4. **Initiative ties** after Agility. *Suggested: compare Reaction Speed, then the players choose.*
5. ~~Inner Voice ties.~~ *Obsolete in 1.1: Voices replace Inner Voice; ties between hooks go to the bigger margin, then the Narrator's choice.*
6. ~~Echo rerolls.~~ *Settled in 1.1: at most 1 Echo per roll.*
7. ~~Durability gains.~~ *Settled (Leon): yes, retroactive; max HP is always recomputed from current Durability.*
8. **Mana over time.** Does the ambient meter rise on its own (the World Bible's Tide), and on what interval do new bots spawn?
9. **Armour slots.** The slot list is settled (the 2020 sheet's, see Attacks, damage and armour). Head, hands, feet and the other non-torso pieces still have no items. The Veil slot is reserved: rules to come.
10. **Braced and Emplaced bonuses** aren't stated. *Data: Emplaced gives +2 to attacks and halves Recoil.*
11. **Crossbow** reload cost per bolt.
12. ~~Fractional tiles per Move.~~ *Settled: Movement is tiles per AP, and paid-for tiles carry over within the turn (item 48).*
13. **Prayer cooldown** outside combat.
14. **Class resources** need numbers: Momentum, Guard, Supplies, Marks and toxins, and how Marksman Heat interacts with weapon Heat.
15. **Sigil stroke pool.** Hold the Stroke needs a maximum-strokes stat that doesn't exist yet.

**Contradictions resolved provisionally**

16. **Melee cost.** The action table says 2 AP for melee; the weapons text says heavy melee costs 3. *Data: 3 for heavy.*
17. **Thrown knife range.** It uses a fixed 6 tiles instead of the Throwing range formula.
18. **Free shots and the reaction limit.** Dance of Iron and Catch give free shots. Do they use the one reaction per round? *Suggested: yes, unless the text says "free reaction".*
19. **No dodge action.** Riposte now triggers when a melee attack against you misses.
20. **Last Charge.** 7 m is not a whole number of tiles; *data uses 5 tiles*. Its shield of 100 × Armour Class is off the HP scale.
21. **Mind Without Fog.** It locks Karma permanently and gives +2 Core points at creation (8 instead of 6). Confirm both.
22. ~~Undefined actions.~~ *Written 7 Nov 2026 (see Analyze and the actions perks rely on); provisional, item 60.*
23. **Perk type labels.** Origami Hands, Hold the Stroke and Pattern Lock carry type labels that don't match their effects. Soulmate scales by Mastery inside Tier I.
24. **Bone Talk** calls Shaken a body debuff; Shaken is in the heart family.
25. **Roster terms replaced by spec terms:** "Outburst" became Soul spell, GM became Narrator, and the Roster's Mastery-gated recipes became signature totals.

**Added in the data; fold into this spec**

26. **Eight new conditions:** Grappled, Taunted, Commanded, Puppeted, Disarmed, Injured (by location), Emplaced and Augment Offline.
27. **Sigil word list** (24 words). It keeps the 2020 Roster's names: FIRE, FREEZE, SHOCK, BIND, BLIND, SLOW, MUDDLE, WALL.

**Balance and design passes**

28. The numbers for Sigil words, Soul modules and patron blessings are all new and provisional.
29. Of the 82 bespoke effect ops, merge any that turn out to be the same rule in disguise.
30. ~~Advanced class bar.~~ *Settled (Leon): keep 15/9 plus a tutor.*
31. ~~Second base class.~~ *Settled (Leon): no; saved for a later expansion.*
32. ~~Enhanced rounds.~~ *Settled (Leon): they stay, rare and bought (15 credits each), and some classes make them: Mind classes and the Spellslinger press 10 from a standard core in an hour out of combat (provisional).*
33. ~~Invented patrons.~~ *Settled (Leon): keep; inventing is welcome, and he flags what feels off.*
34. **Class balance.** Monte Carlo over 100k level-3 builds: 0% classless, an average of 3.5 class options per character, and each class reachable by 26–28% of builds. *(1.1 changes creation to 10 skill points; rerun the Monte Carlo.)*

**Added in revision 1.1 (provisional, settle in playtest)**

35. ~~Creation cap of 5 points in any one skill.~~ *Removed (Leon: no creation caps); the budgets limit a skill to 7 at creation. See item 47.*
36. **Voice line cap** of 2 per player per beat, and the passive score 10 + mod(skill).
37. **Overreach resist costs** (1 Echo at Mastery 2–4, 2 when Mastered) and **1 Echo at the start of each session**.
38. **XP table and the 300 XP per session target.** Check that session 1 really ends at level 3.
39. **Class rank thresholds 13 / 18.** Advanced classes stay at 15 + 9.
40. **HP rescale** (+15 per Endurance, 5 + 2 × Durability per level). Mid and high levels need a pass; Last Charge's shield (item 20) should drop to 15 × Armour Class.
41. **Crits** on a natural 20, or 19–20 for Aimed shots and attacks from Hidden.
42. **Combined checks of two or three skills:** lowest modifier, +2 per other trained skill in the check.

**Added after 1.1: weapon mastery, the Veil, Essence of Experience (provisional, settle in playtest)**

43. **Weapon mastery thresholds** (5 / 15 / 40 / 80 / 140 kills), the attack bonus (+1 at level 2, +2 at level 4), a boss counting as 3 kills, and only XP-awarding fights counting. Check the pacing (Master around session 35 for a one-family character).
44. **The 30 weapon perks** are all new.
45. **Essence of Experience:** 100 XP each, sells for 300 credits, one at creation, cracking needs Mastery 2 in Brain Power (Evoker) or Will Power (Emanator), and one absorbed per long rest.
46. **One Blade** (Blade Recluse trait): "weapon mastery levels 25% faster" now means each kill with the named weapon's family counts as 1.25.
47. **Creation budgets restored** (archetypes spend all of them; their extra Attribute and Core placements are provisional too) (the 2020 EPCCG's 6 Core, 10 Attribute, 10 Skill points), with skills spending the Attribute and Core points they need automatically, no creation caps beyond the tree's own (so up to 7 in one Core, Attribute or skill), and the exchange rate of 1 unspent Core point for 2 Attribute points (the 2020 line "one Core point represents two Attribute points", read as an exchange rate). Replaces 1.1's free automatic rise, which let builds spread across three Cores finish with up to 4 more Core points than single-Core builds.
48. **Movement is tiles per AP** (Leon: moving 4 tiles costs 4 AP unless you have good Agility). Restores the 2020 rule: Movement 1 + 0.5 × (Agility − 1) tiles per AP, never below 0.5, paid-for tiles carry over within the turn. Replaces 1.1's "3 + 0.5 × (Agility − 1) tiles for 1 AP". Check the pace in playtest (an Agility 1 character spending 4 of 6 AP to cross 4 tiles), and the converted armour penalties (−0.5 / −0.5 / −1 Movement).
49. **A perk step at every Mastery level, and 27 Mastered perks** (Leon). Replaces Tier I at 3 / Tier II or second perk at 7 / both Tier II at 10. A skill at 5 points now holds two steps (Tier II can arrive at 5, two points earlier), and a 7/3 creation spread holds 4 steps instead of 3. The Mastered perks' numbers are all new: check Last Wall, Earthbreaker, Nothing Gets Past, Judgement Day and On My Mark against the AP ceiling and the action economy first.
50. **Rival's Neck and Neck** (Leon: rivals help each other grow): 50 XP (tagged `bond`) when your rival reaches a new level, and +10% XP from every source but Essence while your rival is a higher level; both ways. Check that two rivals don't pull ahead of the rest of the squad.
51. **Combo perks at Mastery 2** (Leon: combos are for high levels in 2–3 skills): 5 points in every listed skill, up from 3, now that each Mastery level also gives a perk step. A two-skill combo costs 10 points, a three-skill one 15. Plus three new combos so every skill is in one: Bite the Bullet (Guts + Pain Threshold), Sixth Sense (Sensory + Vigilant), What Could Be (Visualization + Conscience).
52. **Enemy stat tiers** (Minion, Soldier, Elite, Boss): HP 30/60/100/200, Defense 10/12/13/14, attack +1/+3/+5/+6, armour 0/5/10/10, Endurance 1/3/5/7, spare magazines 1/2/3/4. Written for the first playable build; tune from playtest fights.
53. **Injury details** (provisional): the d2 side, the two-handed list, one halving for legs, and enemies at 0% resistance were set for the first playable build. Tune from playtests.
54. **Item weights** (Leon: everything has weight, down to the single bullet): the armour, round, magazine and gear weights under Item weights were set for the first playable build. Over the limit: Overburdened, −1 Movement per started 5 kg over (Leon accepted the shape; the numbers are provisional).
55. **Ammo and reloading** (Leon: reloading uses ammo up; reloading early drops the magazine and its rounds): the round-by-round list, the kits' spare magazines, and enemies' unlimited spares.
56. **Analyze details:** no roll, line of sight needed, shared with the whole squad for the rest of the fight, and what the squad sees before it.
57. **Two kinds of cover with HP** (Leon): half cover −5 to hit, full cover blocks sight; HP 30 / 80; misses caused by the −5 hit the cover; broken cover becomes rubble. Replaces +2 / +5 Defense.
58. **Picking up and loading** (Leon: dropped magazines can be picked up; empty magazines can be loaded for AP by the rounds needed): pick-up 1 AP per tile, loading 1 AP per 5 rounds, the kits' loose rounds.
59. **Map objects and points of interest** (Leon): the object list and its numbers (trap 25 damage, TN 12, 2-tile detection; barrel 40 within 2; fire 10, toxic 8; door 40 HP), and approaches tried once per character per scene.
60. **The written actions and Vision** (Shove, Brace, Field Repair, Improvise Tool, Analyze on NPCs; Vision + Vigilant, darkness, light radius, Sensory presence): all numbers are first drafts.
61. **Weapons v2** (accepted 7 Nov 2026): every new weapon, mod, rarity, durability, calibre and price number, the 58 weapon skills, off-hand items and the slot armour.
62. **Music:** the spotlight triggers and their once-per-scene limit, the 2-area pin, the big-heal line at 30 HP, the Musek Blestor's weight and price, and the starting silence of 2.
63. **The Narrator's wiki:** 3 lookups a turn, 8 keys a lookup, and the magic-lore thresholds (3 points).
64. **Overworld rounds:** the examine, approach and exit costs (1, 2, 1 AP), the notice range (4 + bonus − Dexterity), the notice bonuses by tier, sitting out round 1 after an open attack, and the Narrator's queued actions spending next round's AP.
65. **The Narrator's memory:** the $0.50 ceiling, 6 scenes per chapter, the 9,000-character budgets for active memory and transcript, the ledger caps (300 people, 200 threads, 1,500 facts), the forgetting curve (scenes/10).
66. **Anyone is a target:** a point-of-interest person fights as a minion with fists; attacking something without HP costs 2 AP; Downed outside a fight lasts until a stim or treatment.
67. **Rerolls and edits:** the last 5 turns can be rerolled; 3 waiting suggestions per player; only online players vote.
