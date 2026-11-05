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
| Carry weight | 20 kg + 5 kg × (Strength − 1) |
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
| Vision range | 12 + 2 × (Perception − 1); halved in darkness |
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

## Attacks, damage and armour

**Attack roll.** d20 + attack skill modifier + weapon accuracy + situational modifiers, against the target's **Defense** (10 + Dodge + cover).

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
| Target in half / full cover | +2 / +5 to their Defense |

**Flanking.** If the line from attacker to target doesn't pass through the side of the tile the cover protects, the cover doesn't count.

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

**The Veil** is a special equipment type with its own slot. Its rules aren't written yet: the engine records what's worn there and applies nothing, and the Narrator reads the item's text.

**Injuries.** After a critical, the target rolls Injury resistance; if that fails, roll a d6. 1: head, Dazed for 1 turn. 2–3: torso, Bleeding. 4: arm, −2 to attacks with it. 5–6: leg, half Movement. Arm and leg injuries last until treated.

**Shields** are temporary HP, used up before real HP, and gone at the end of combat unless a rule says otherwise. Healing can't raise HP above its maximum.

**Downed and dying.** At 0 HP you're Downed: you can't act. At the start of each of your turns, roll d20: 10 or more is a success, less is a failure. Three successes and you stabilise at 1 HP; three failures and you die. Each hit you take while Downed counts as a failure. An ally can stabilise you with a stim (1 AP for a Medic, 2 AP for anyone else).

**Every death releases bots.** When any person or beast dies, the ambient mana meter rises (see Mana).

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

**Perks** (perks.json, 103 perks)

- **Acquired:** every skill has two. Each Mastery level in the skill (3, 5, 7 and 9 points) gives one **perk step** in it: take one of its perks at Tier I, or upgrade one you hold to Tier II (Tier I always comes first). The order is the choice: at 5 points you hold both at Tier I or one at Tier II; at 7 you hold three of the four steps; at 9 you hold both at Tier II. Tier II replaces Tier I.
- **Mastered:** every skill has one Mastered perk, granted automatically at 10 points. It's the capstone only a specialist reaches; nothing else gives it.
- **Achieved:** need Mastery 1 in every skill listed, plus a deed done in play. The Narrator grants them; the engine checks the skill requirement and records the deed.
- **Ultimate:** granted automatically when you hold both of the Achieved perks it names.
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
| perks.json | 103 | 54 Acquired, 27 Mastered, 16 Achieved, 6 Ultimate |
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
7. **Durability gains.** Does extra HP per level apply retroactively when Durability rises? *Suggested: yes.*
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
22. **Undefined actions** that perks rely on: Field Repair, Shove, Break, wards and rituals, Improvise Tool, Analyze on NPCs.
23. **Perk type labels.** Origami Hands, Hold the Stroke and Pattern Lock carry type labels that don't match their effects. Soulmate scales by Mastery inside Tier I.
24. **Bone Talk** calls Shaken a body debuff; Shaken is in the heart family.
25. **Roster terms replaced by spec terms:** "Outburst" became Soul spell, GM became Narrator, and the Roster's Mastery-gated recipes became signature totals.

**Added in the data; fold into this spec**

26. **Eight new conditions:** Grappled, Taunted, Commanded, Puppeted, Disarmed, Injured (by location), Emplaced and Augment Offline.
27. **Sigil word list** (24 words). It keeps the 2020 Roster's names: FIRE, FREEZE, SHOCK, BIND, BLIND, SLOW, MUDDLE, WALL.

**Balance and design passes**

28. The numbers for Sigil words, Soul modules and patron blessings are all new and provisional.
29. Of the 82 bespoke effect ops, merge any that turn out to be the same rule in disguise.
30. Is a 15/9 signature split plus a tutor the right bar for advanced classes?
31. Can a character gain a second base class later?
32. Do enhanced rounds stay, as rare bought ammo?
33. The Quartermaster and The Laughing Mask are invented patrons: keep, rename or replace them.
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
