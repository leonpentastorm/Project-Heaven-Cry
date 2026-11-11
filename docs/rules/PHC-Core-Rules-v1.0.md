# PHC Core Rules v1.0 (Game Spec)

> Exported from the living Claude Doc https://claude.ai/artifact/Mm2PsQVYuBKoFybSUTFii5 on 2026-11-05. Since 10 Nov 2026 **this file is the source of truth**: the Doc stops at revision 1.1 and carries a notice pointing here.
>
> **Revision 1.1 (2026-11-05), synced to the living Doc:** skill modifier = points − 1; skill Voices replace Inner Voice; Overreach is indulge-or-resist; creation is 10 skill points; new XP table; HP rescale; class rank thresholds 13/18 (superseded by Class Roster Revision 3: ranks II and III at the class's attribute 5 and 8, items 551–552; see Classes). Rationale: `docs/design/proposals/2026-11-gameplay-fixes.md`.

> **Revision 1.10 (2026-11-09), Sigil 1.5:** a Line is a stroke (the glyphs drawn as one); touching glyphs of other strokes no longer poison a Line; Lines stay 2–4 glyphs; study, copying and sigil marks; word mastery and inflections; Junctions at Brain Power Mastered. See Mana, Drawing a spell, rule 3, The Magic panel and learning, and items 901 on. Design: `docs/design/sigil-1.5-spec.md`.

> **Revision 1.11 (2026-11-10), level gains:** every level gives two picks (odd levels 2 Skill points; even levels 1 Skill point and 1 Attribute point) and a Core point comes every 3rd level (3, 6, 9, 12, 15, 18), not every 5th. A class rank needs a level as well as the attribute (rank II level 6, rank III level 12). At creation the budgets are unchanged, the Core-for-Attribute trade is gone, and Mind Without Fog gives 1 Core point, not 2. See Characters, Classes and items 924 on. Design: `docs/design/proposals/2026-11-skeleton.md`.

> **Revision 1.12 (2026-11-10), Physical 2.0:** techniques for melee weapons (Momentum, a meter on you, built by chaining different techniques and spent by Finishers) and for ranged weapons (Pressure, a meter on the target, built by fire and spent by Takes); weapon properties; ready lists; drill per weapon in place of weapon mastery; the quiver. See Weapons, Physical techniques, and items 932 on. Design: `docs/design/proposals/2026-11-melee-techniques.md`, `2026-11-ranged-techniques.md`. *(Momentum's rule was reworked the same day: it is no longer built by chaining different techniques. Superseded by "Melee: Momentum and the chain" and Revision 1.13.)*

> **Revision 1.16 (2026-11-11), Maps:** a fight map is at most 26 × 26 tiles (A to Z by 1 to 26) and at least 8 × 8; open ground and the Proving Ground are the full size; a campaign zone sets its own size; the sides deploy 10 to 14 tiles apart with cover on the approach; every map is plain colour until it is repainted. See Maps, and items 1039 on.

> **Revision 1.13 (2026-11-10), Skeleton 2.0:**
> - **Cores are not spent.** Body, Mind and Soul are families; a Core shows the highest Attribute of its family. Creation is 10 Skill and 10 Attribute points, and no level gives a Core point. An Attribute's ceiling rises with level: 7 at creation, 8 from level 3, 9 from level 6, 10 from level 9.
> - **Every slot has a job.** An alpha opens a way of fighting and carries the offence, a beta is a defence, a gamma is world play and speech.
> - **Numbers moved to the skill whose job they are:** HP per level to Pain Threshold, critical damage taken to Acuity, ambush damage taken to Improvisation, Sigil range and core saving to Brain Power, Soul range and ready designs to Will Power, healing given to Empathy, healing received to Camaraderie, shields received to Conscience, Karma to Authority.
> - **Saves:** Body with Guts, Brain with Rumination, Heart with Composure (Composure is Determination's beta now; Lore Master its gamma).
> - **Strength by source:** a condition is as strong as the skill that delivered it (the weapon's skill, Brain Power, Will Power, Faith, the gamma that spoke); a technique's own save adds half of it.
> - **A gamma adds its full points to a check** (1 better than an alpha or a beta with the same points) and owns one of the nine **Calls**, the only way AP is given or taken inside a turn.
> - **Momentum reworked:** only the plain attack builds it, a Strike or an Opener spends 1, walking and being hit cost it, a fight starts with 1, and it carries between turns.
> - **Guard for anyone with Durability** (a pool that soaks hits, Interpose at 3), **shield techniques** (Shield Bash, Raise Shield, Shield Wall), and gear gates by the new skills.
> - **The perk, unlock and trait pass:** AP gifts on alphas and betas became defences; Grapple is Iron Grip, Origami Hands is Both Hands, Weak Point is Read Them.
> - **Names:** Analysis is Acuity (Perception), Proficiency is Improvisation (Expression), and Implication, Vigilant and Sensory are Insinuation, Vigilance and Senses; the ids did not change.
> See Characters, Derived stats, Physical techniques (Momentum, Guard), Calls, Conditions and saves, "The perk, unlock and trait pass", and items 953 on. Design: `docs/design/proposals/2026-11-nine-doors.md`.

2026-11-03 · Leon PT

## How to use this spec

This is the single source of truth for Project Heaven Cry's rules. Where it disagrees with an earlier draft (Skills v2, Traits v2, the Class Rosters), this spec wins. Every number a game engine needs is here; the content lists (traits, perks, classes, Sigil words) live in the JSON data files described at the end.

**Two referees, one rulebook.** The web game has two kinds of referee, and the spec says which one owns each rule:

- **The engine** owns anything with a number: rolls, AP, damage, Heat, the ambient mana meter, conditions, XP. It never improvises.
- **The Narrator** (an AI Dungeon Master or a human one) owns judgement: setting difficulty targets, describing the world, playing NPCs and Celestial patrons, writing voice hooks and voicing the skills that pass them, deciding when an Overreach trigger fires, granting Achieved perks. Where a rule says "the Narrator decides," the engine asks and waits.

**Conventions**

- Rolls are d20 plus modifiers against a target. "Roll Acuity" means d20 + your Acuity modifier.
- **Skill names changed in rules 1.13** (ids did not). Older lines and section 14 items still use the old names; read them so: **Analysis** is **Acuity** (Perception's beta: knowing how a thing works; Analyze, locks, hacking, pricing, reading a scene). **Proficiency** is **Improvisation** (Expression's beta: making a thing work now; Field Repair, fitting, modding, upkeep), except where the old line is about understanding or cracking a mechanism, which is Acuity. **Implication** is **Insinuation**, **Vigilant** is **Vigilance**, **Sensory** is **Senses**. Composure is Determination's beta and Lore Master its gamma. The current rule for every perk the pass changed is in "The perk, unlock and trait pass".
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

**Caps** (rules 1.13). A Skill can't exceed its Attribute. An Attribute's ceiling rises with level: **7 at creation, 8 from level 3, 9 from level 6, 10 from level 9**. Nothing exceeds 10. **Cores are not spent:** Body, Mind and Soul are families (colours, saves, class groups), and a Core shows the highest Attribute of its family. *(Before rules 1.13 an Attribute couldn't exceed its Core, and Cores were bought with their own points. Older lines below and in section 14 that speak of Core points are superseded by this.)*

**Creation budget**

| Pool | Starts at | At creation |
|---|---|---|
| Skills | 0 each | spend **10 Skill points** |
| Attributes | 1 each | spend **10 Attribute points**; no Attribute above 7 at creation |
| Cores | — | not spent (rules 1.13): a Core shows the highest Attribute of its family. *Before: 6 Core points.* |
| Traits | none | pick 0–2 |

Everyone spends the same budgets (the 2020 EPCCG's: 6 Core, 10 Attribute, 10 Skill points), so focusing on one Core costs nothing that spreading across three would save. Every point is placed where it belongs: a Core point can't be traded for Attribute points (rules 1.11, item 928; before it, an unspent Core point became 2 Attribute points, which only ever worked for one point and was a loss when it did). *(Rules 1.13: the 6 Core points are gone; the budgets are 10 Skill and 10 Attribute points.)*

**Creation's only cap** (rules 1.13) is the tree's own: Skill ≤ Attribute, and no Attribute above 7. *(Before: Skill ≤ Attribute ≤ Core ≤ 10, and 6 Core points in one Core made a 7/1/1 character.)*

**Order doesn't matter.** You can raise Attributes first, or place skills first: when a skill needs a higher Attribute, it spends that point for you, and the preview says so ("−1 skill · −1 Attribute (Endurance 3→4)"). A skill can't go up if its Attribute would need points you no longer have. Lock in needs every Skill and Attribute point spent. *(Rules 1.13: no Core step.)*

**Archetypes** (archetypes.json, 46 presets in 9 families, one of them **All-in**: nine 7/1/1 builds, one per Attribute) help new players. **Every archetype spends all three budgets:** picking one places the 10 Skill points and every Attribute point (rules 1.13: there are no Core points), so there is nothing left to spend; anything can still be changed on the Skills step. An archetype that can't spend them all isn't offered. Regular archetypes spread over at least two Cores; only the All-in family puts everything in one. Archetypes are guidance only and have no effect after creation. After creation the caps work normally: to raise a skill past its Attribute you need an Attribute point from levelling, and an Attribute stops at the ceiling of your level.

**Archetypes re-pointed (rules 1.13).** Thirteen presets were re-pointed for the new skill jobs; the other 33 are unchanged.

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

**Levels and XP.** Levels run 1 to 20. XP is cumulative:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Total XP | 0 | 100 | 250 | 700 | 1,300 | 2,050 | 2,800 | 3,550 | 4,300 | 5,050 |
| **Level** | **11** | **12** | **13** | **14** | **15** | **16** | **17** | **18** | **19** | **20** |
| Total XP | 5,950 | 6,850 | 7,750 | 8,650 | 9,550 | 10,450 | 11,650 | 12,850 | 14,050 | 15,250 |

**Pacing target.** The first session (one story scene and one fight, about 250 XP) ends at level 3, so every player has a class after session 1. After that the Narrator aims for about 300 XP per character per session: about 2 sessions a level through level 5, 2.5 through level 10, 3 through level 16 and 4 after that. That is level 5 by session 5, level 10 by session 17 and level 20 by about session 51, the same overall pace as the D&D 5e DMG's session guideline.

| On reaching a level | You gain |
|---|---|
| Every level | HP rises by your HP-per-level stat |
| Every odd level (3, 5, … 19) | +2 Skill points |
| Every even level (2, 4, … 20) | +1 Skill point and +1 Attribute point |
| Levels 3, 6 and 9 | the Attribute ceiling rises to 8, 9 and 10 (rules 1.13). *Rules 1.11 to 1.12: every 3rd level gave +1 Core point; none since.* |
| Level 3 | Your base class (see Classes) |

Rules revision 1.11 (10 Nov 2026; provisional, items 924–927). Over levels 2 to 20 that is **28 Skill points, 10 Attribute points and 6 Core points**, on top of creation's 10, 10 and 6: 38 Skill points in a career. Before 1.11 a level gave 1 Skill point, and a Core point came every 5th level (19 Skill and 4 Core points in a career): raising a capped skill needs a point of each kind, so every character's best skill rose by 1 per 5 levels and no build that started below a Core of 6 could ever reach a Mastered perk. Points you don't spend are kept. *(Rules 1.13: no Core points at creation or from levels; a career is 38 Skill and 20 Attribute points.)*

Skill books and quest rewards can grant extra Skill points. **Taking a level-up back.** The points and perk steps you spend on the level-up screen can be taken back with Revert, all at once, until something settles them: a fight starts, or you earn your class. After that they are spent for good.

A **Legendary Deed**, at the Narrator's call, grants **1 Attribute point**, and for each deed done one Attribute point may stand **1 above the level's ceiling** (never above 10). When the ceiling rises past that point, the room is free again. A skill still can't pass its Attribute.

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

**The slot decides what a skill's points are for** (rules 1.13, Skeleton 2.0). An **alpha** opens a way of fighting and carries the offence. A **beta** is a defence. A **gamma** is world play and speech: on a check it adds its **full points** (1 better than an alpha or a beta with the same points; 0 points is still −2), it is called first when talking to someone, and it owns a **Call**, the only way AP is given or taken inside a turn. The skills named Acuity and Improvisation keep the ids `analysis` and `proficiency` in the data; Insinuation, Vigilance and Senses keep `implication`, `vigilant` and `sensory`.

**Body and survival**

| Stat | Formula |
|---|---|
| Max HP | 100 + 15 × (Endurance − 1) + (level − 1) × HP per level |
| HP per level | 5 + 2 × Pain Threshold (rules 1.13: it was Durability) |
| AP per turn | 6 |
| Initiative bonus | (Agility − 1) + Reaction Speed modifier |
| Movement (tiles per AP) | 1 + 0.5 × (Agility − 1); never below 0.5 |
| Carry weight | 20 kg + 5 kg × (Strength − 1). Over it you are **Overburdened** (a permanent status while it lasts): −1 Movement per started 5 kg over, never below 0.5, and no Sprint (provisional, item 54) |
| Defense | 10 + Dodge, where Dodge = mod(Athletics), minimum 0 |
| Guard pool | Durability points, 5 at most; the Guard technique gives 1 + (Durability − 1), 1 more with a shield; Brace gives 2, 3 with a shield |
| Counter bonus | mod(Raw Power), minimum 0 |
| Injury resistance | 10% × (Endurance − 1) chance to ignore an injury |
| Critical damage taken | −10% × (Perception − 1) − 5% × Acuity (rules 1.13: it was Durability) |
| Elemental damage taken | −10% × Pain Threshold |
| Ambush damage taken | −10% × Improvisation (rules 1.13: it was Reaction Speed) |
| Healing received | +10% × Camaraderie (rules 1.13: it was Sensory) |
| Shields received | +10% × Conscience, whatever made the shield (rules 1.13) |
| Saves (Body / Brain / Heart) | mod(Guts) / mod(Rumination) / mod(Composure) (rules 1.13: the Brain save was Charisma) |
| Strength of a condition you inflict | mod of the skill that delivered it, minimum 0: a weapon's skill for a technique, Brain Power for a Sigil, Will Power for an Outburst, Faith for a Blessing, the gamma that spoke for a Call or a spoken condition, Ingenuity for a trap or a poison (rules 1.13: it was one number a family, from Intimidation, Eloquence and Implication) |

**Senses and reach** (in tiles)

| Stat | Formula |
|---|---|
| Vision range | 12 + 2 × (Perception − 1) + Vigilance; halved in darkness (see Vision) |
| Detection range | 2 + Vigilance |
| Stealth | 0.5 × Ingenuity, subtracted from enemies' Detection range against you |
| Throwing range | 6 + 0.5 × Dexterity |
| Analyze range | 4 + Acuity |
| A Call's range | 4 + the points of its gamma skill |

**Damage multipliers**

| Stat | Formula |
|---|---|
| Weapon attacks (rules 1.12) | 1 + 0.1 × (the weapon's Attribute − 1) + 0.05 × the skill the weapon hits with. Heavy melee: Strength and Raw Power. Light melee, guns, bows and thrown weapons: Agility and Dexterity. Bare hands: Strength, and 0.05 × both Raw Power and Dexterity. Each weapon names its own (`phys.scales_with`, `phys.hits_with`; item 946) |
| Physical (anything that isn't a weapon attack: a thrown body, a sling stone) | 1 + 0.1 × (Strength − 1) + 0.05 × Raw Power |
| Elemental | 1 + 0.1 × (Expression − 1) + 0.05 × Visualization |
| Sigil | 1 + 0.1 × (Intelligence − 1) + 0.1 × Brain Power |
| Soul | 1 + 0.05 × (Determination − 1) + 0.1 × Will Power (rules 1.5; 2.45 maxed) |
| Healing given | 1 + 0.1 × (Insight − 1) + 0.1 × Empathy (rules 1.13: it was Camaraderie) |
| Critical | 2 + 0.1 × (Perception − 1) + 0.05 × Dexterity (rules 1.12: it was Athletics; offence sits on the alpha, item 953) |
| Ambush | 1.5 + 0.05 × Ingenuity |
| Blessing power | 1 + 0.1 × Faith |

**Magic**

| Stat | Formula |
|---|---|
| Max Sigil words per spell | 2 + floor((Intelligence − 1) ÷ 2); a spell never holds more than 4 glyphs (rules 1.4) |
| Glyphs on the ground at once | Max Sigil words (+ Hold the Stroke); it keeps growing above Intelligence 5 (rules 1.4) |
| Glyph AP cost (draft 1.2) | 1 − 0.1 × (Expression − 1) per glyph, minimum 0.5 (was: Sigil AP cost) |
| Sigil Core saving | floor(Brain Power ÷ 3) per spell, minimum cost 1 (rules 1.13: it was Proficiency) |
| Sigil range bonus | +0.5 tile × Brain Power, rounded down; added once to a Reach word's range, never to Touch (rules 1.13: it was Rumination) |
| Sigil duration bonus | +0.5 round × Brain Power |
| Max MP (Emanator charge) | 100 + 100 × (Virtue − 1) |
| Soul cast AP | 2 (rules 1.5: Begin, and class moves cast like an Outburst; Swift 1). Empathy instead gives free Pumps: 1 a round from Empathy 3, 2 from 7 |
| Soul mana cost | −5% × (Insight − 1) |
| Soul range bonus | +0.5 tile × Will Power (rules 1.13: it was Lore Master) |
| Ready designs | 2 + floor(Will Power ÷ 2), at least 3 (rules 1.13: it was Empathy) |
| Mana Syphon bonus | +10% × (Determination − 1) + 10% × Will Power |
| Strain limit | 3 + floor(Will Power ÷ 2) |
| Prayer cooldown | 4 turns − 0.5 × (Virtue − 1) − 0.5 × Faith, minimum 1 |

**Social.** Leadership comes from Authority: 0 Unfit, 1–2 Squad, 3–4 Platoon, 5+ Command. Each point of Authority moves Karma 1 further every time it changes, more when it is awarded and more when it is taken (rules 1.13: it was Conscience).

**What a point gives, skill by skill** (rules 1.13; the lines the skill cards and the level-up screen show, from `skills.json` `per_point.text`).

| Skill | Attribute | Slot | A point gives |
|---|---|---|---|
| Durability | Endurance | alpha | Your Guard pool holds 1 more (5 at most). The Guard technique gives you more Guard: 1, plus 1 for every point here after the first (Brace gives a flat 2, whatever your points). |
| Pain Threshold | Endurance | beta | −10% elemental damage taken. +2 HP every level. |
| Senses | Endurance | gamma | You sense what you can't see (by ear, smell and touch) 1 better. Your Warn Call reaches 1 tile further. On a check it rolls 1 better than its points say. |
| Raw Power | Strength | alpha | +1 to hit with heavy melee weapons and bare hands. +5% physical damage. Your melee techniques are harder to save against. From 2 points, +1 to your counter-attacks. |
| Guts | Strength | beta | +1 on Body saves (poison, knock-downs, being pushed or pinned). |
| Intimidation | Strength | gamma | Your Threaten Call reaches 1 tile further and is harder to shake off. On a check it rolls 1 better than its points say. |
| Athletics | Agility | beta | +1 Defense (you are harder to hit), from 2 points. |
| Dexterity | Agility | alpha | +1 to hit with guns, light blades and thrown weapons. +2% critical damage. You throw half a tile further. Your shots' techniques are harder to save against. |
| Reaction Speed | Agility | gamma | +1 Initiative: you act earlier in the round. Your Cue Call reaches 1 tile further. On a check it rolls 1 better than its points say. |
| Ingenuity | Perception | alpha | +5% ambush damage. Every 2 points, enemies need 1 more to spot you while you sneak. Your traps and poisons are harder to save against. |
| Improvisation | Expression | beta | −10% ambush damage taken. Field Repair restores 5% more from 3 points up. |
| Vigilance | Perception | gamma | You notice traps, hidden things and hidden enemies 1 better, and 1 tile further off. Your Spot Call reaches 1 tile further. On a check it rolls 1 better than its points say. |
| Brain Power | Intelligence | alpha | +10% Sigil power. You know 1 more Sigil word. Every 2 points: Sigils reach 1 tile further and last 1 round longer. Every 3 points: a Sigil burns 1 less core charge. Your Sigils' conditions are harder to save against. |
| Rumination | Intelligence | beta | +1 on Brain saves (confusion, illusions, having your mind turned). |
| Eloquence | Intelligence | gamma | Persuading an enemy in a fight is harder to resist. Your Brief Call reaches 1 tile further. On a check it rolls 1 better than its points say. |
| Visualization | Expression | alpha | +5% elemental damage. |
| Acuity | Perception | beta | −5% critical damage taken. Analyse reaches 1 tile further; at 3 points it costs 1 AP, and at 5 it also shows the target's weak point. |
| Charisma | Expression | gamma | An offer of terms is harder to refuse. Your Rally Call reaches 1 tile further. On a check it rolls 1 better than its points say. |
| Empathy | Insight | alpha | +10% healing given. From 3 points, one Pump of an Outburst each round is free; from 7, two. |
| Camaraderie | Insight | beta | +10% healing received. |
| Insinuation | Insight | gamma | Your Taunt Call reaches 1 tile further and is harder to shake off. On a check it rolls 1 better than its points say. |
| Will Power | Determination | alpha | +10% Soul power. +10% mana syphoned. Every 2 points: +1 Strain limit, Outbursts reach 1 tile further, and you keep 1 more design ready. Every 3 points: 1 more module slot. Your Outbursts' conditions are harder to save against. |
| Lore Master | Determination | gamma | Your Name It Call reaches 1 tile further. On a check it rolls 1 better than its points say. |
| Composure | Determination | beta | +1 on Heart saves (fear, despair, losing your nerve). |
| Faith | Virtue | alpha | +10% Blessing power. Prayers come back half a turn sooner. Your Blessings' conditions are harder to save against. |
| Conscience | Virtue | beta | +10% to every shield you are given. |
| Authority | Virtue | gamma | Karma moves 1 further each time it changes: more when it is awarded, more when it is taken. Your Order Call reaches 1 tile further. On a check it rolls 1 better than its points say. |

## Classes

**Class Roster Revision 3 (accepted 8 Nov 2026; `docs/design/class-roster-rev3-proposal.md`).** Each of the 9 attributes has one base class. A class's three skills are that attribute's combat, utility and social sides (α, β, γ), and the class's fantasy is read from them. The cores line up by themselves: Body is Defender, Fighter and Marksman; Mind is Infiltrator, Mage and Trickster; Soul is Bard, Channeler and Guardian.

**Getting your class (level 3).** You get the class of your **highest attribute** (trait bonuses never count). On a tie you choose among the tied classes. If every attribute is tied, all nine are offered. Nobody is left without a class (item 551).

**The class is fixed.** The class picked at level 3 is kept for good, even if another attribute later grows higher. A second pick is refused: "Your class is set; changing class is a separate system for later." Changing class will be its own system later (item 553).

**Class rank** reads the class's own attribute and your level: rank I when you gain the class, rank II at that attribute **5** and **level 6**, rank III at **8** and **level 12** (items 552 and 930; the levels are rules 1.11). Each rank gives **two moves**, so a class has six. The level stops a 7/1/1 build from taking ranks I and II in the same moment and rank III a level later; a build that keeps its class attribute up reaches rank III at about level 12 whatever its Cores were at creation.

| Core | Class | Attribute | Rank I | Rank II | Rank III |
|---|---|---|---|---|---|
| Body | Defender | Endurance | Brace (`defender.brace`) · Draw Fire (`defender.draw_fire`) | Unbroken (`adamantile_knight.unbroken`) · **Shrug It Off** (new) | Reactive Plate (`defender.reactive_plate`) · **Anchor** (new) |
| Body | Fighter | Strength | Lunge (`fighter.lunge`) · **Shove** (new) | Riposte (`fighter.riposte`) · Lingering Dread (`shade.lingering_dread`) | Finisher (`fighter.finisher`) · **Unstoppable** (new) |
| Body | Marksman | Agility | Fire Discipline (`marksman.fire_discipline`) · **Speed Loader** (new) | Special Ammo (`marksman.special_ammo`) · **Duck and Roll** (new) | Killzone (`marksman.killzone`) · Called Shot (`gunslinger.called_shot`) |
| Mind | Infiltrator | Perception | Mark (`assassin.mark`) · **Vanish** (new) | Toxin (`assassin.toxin`) · **Field Fix** (new) | Execution (`assassin.execution`) · **Sabotage** (new) |
| Mind | Mage | Intelligence | Barrage (`mage.barrage`) · **Core Change** (new) | Overcharge (`mage.overcharge`) · **Bleed the Flux** (new) | Payload (`mage.payload`) · Stored Spell (`scribe.stored_spell`) |
| Mind | Trickster | Expression | **Read** (new) · **False Image** (new) | Blind and Slow (`trickster.blind_and_slow`) · **Silver Tongue** (new) | Rewrite (`trickster.rewrite`) · **Sleight** (new) |
| Soul | Bard | Insight | Triage (`medic.triage`) · Inspire (`bard.inspire`) | Stim Throw (`medic.stim_throw`) · Mend (`bard.mend`) | Field Surgery (`medic.field_surgery`) · **Rally** (new) |
| Soul | Channeler | Determination | Shape (`channeler.shape`) · **Iron Heart** (new) | Storm Front (`channeler.storm_front`) · **Occult Library** (new) | Heart Surge (`channeler.heart_surge`) · **Eye of the Storm** (new) |
| Soul | Guardian | Virtue | Will Shield (`guardian.will_shield`) · **Command** (new) | Under the Eye (`lumeri_templar.under_the_eye`) · Blessed Shells (`lumeri_templar.blessed_shells`) | Sanctuary (`guardian.sanctuary`) · Judgement (`lumeri_templar.judgement`) |

The 54 moves:

- **28 old base moves and 6 old advanced moves**, each kept under its old key (`class:<origin>.<moveId>`), so the engine runs it unchanged. classes.json lists them as `{"ref": "<origin>.<moveId>"}`. For example, the Bard's Triage is `class:medic.triage`.
- **20 new moves** (item 554). The engine runs all of them (`packages/engine/src/classes/rev3.ts`); every number is provisional, and the readings that fill gaps in the texts are items 559–580. All but Iron Heart and Occult Library are combat-only (classes.json `surface`).

**What the new moves do in play.**

- **Shrug It Off** (reaction, 1 Guard): Bleeding, Slowed, Weakened or Prone ends the moment you gain it (on or off for the fight).
- **Anchor:** while Braced, nothing pushes, pulls, shoves or knocks you Prone. An enemy that started its turn next to you and leaves your reach draws your opportunity attack even when it Disengages.
- **Shove** (1 AP): an adjacent enemy is pushed 1 tile or knocked Prone (your choice) on a failed Body save against 12 + your Body debuff strength. A blocked push is refused before anything is spent.
- **Unstoppable** (1 AP, once a scene): until your next turn, Fear, Shaken, Slowed and Pinned are set aside and refused, no opportunity attack is taken against you, and you gain 2 Momentum.
- **Speed Loader:** the turn's first reload costs 1 AP less (at least 1).
- **Duck and Roll** (reaction): when a ranged weapon attack targets you, step 1 tile first: out of sight, the attack isn't taken; into cover, it is at −2 (instead of half cover's −5).
- **Vanish** (1 AP, once a turn): Hidden if no enemy sees you.
- **Field Fix** (2 AP): an adjacent squadmate's jam cleared, weapon durability restored, or a machine repaired for 20.
- **Sabotage** (2 AP): an adjacent enemy machine, turret or drone disabled for 2 rounds, a barricade passable for 2 rounds, or your tile rigged (30 and Pinned on a failed Body save for the next enemy to step on it).
- **Core Change:** a core swap costs 1 AP. **Bleed the Flux:** a Vent costs 0 AP, and your next glyph adds 1 Flux less.
- **Read:** Analyze costs 1 AP and shows what the enemy means to do on its next turn.
- **False Image** (2 AP, 1 charge): a decoy within 8 + your Sigil range bonus. Enemies who see it make a Brain save; those who fail attack and close on it instead of you. It scatters when attacked and fades after 2 rounds.
- **Silver Tongue** (2 AP): an enemy within 6 makes a Brain save or loses 2 AP on its next turn (a Boss 1).
- **Sleight** (1 AP, once a scene): swap places with your False Image or a squadmate within 6.
- **Rally** (2 AP, once a scene): every squadmate within 4 heals 20 × your Healing given and loses Fear and Shaken.
- **Iron Heart:** Strain limit +1. **Occult Library:** one more ready design, and one tone learned once, out of a fight.
- **Eye of the Storm** (once a scene): your next Release this turn adds no Strain and its tone's riders count a stage higher.
- **Command** (1 AP, once a turn; Authority 1): a squadmate within 6 walks up to 2 tiles now, for no AP.

**Resources follow the moves.**

- Defender: Guard.
- Fighter: Momentum.
- Marksman: Heat (the shared gun rule).
- Infiltrator: Marks and toxin doses.
- Mage and Trickster: Flux.
- Bard: Supplies, MP and Strain.
- Channeler: Strain.
- Guardian: MP, Strain and Devotion (the patron's).

The Guardian's Under the Eye, Blessed Shells and Judgement need a patron and prayer. Without one, a Guardian has Will Shield, Command and Sanctuary (item 555).

**Shelved moves.** 11 old base moves and 57 advanced moves are on no class's list. Their data, handlers and tests stay in the engine; `docs/design/move-pool.md` lists each with a suggested future home.

**Advanced classes are shelved (item 556).**

- None can be learned. The level-up screen and the reducer say: "Advanced classes are being rebuilt; not learnable yet."
- The Narrator places no tutors.
- A character who already holds one keeps the field in the save, but gets none of its moves, resources or effects until advanced classes return.
- They come back as **attribute pairs** (proposal section 7). **Squared** is a base attribute twice: 9 classes, batch 1. **Hybrid** is a base attribute with one from another core: 27 classes; batch 2 is a ring of 9, batch 3 the other 18.
- Every advanced class in classes.json carries `kind`, `pair`, `batch` and, where it maps to a roadmap slot, `roadmap`. `advanced_roadmap` lists the slots.
- The gate (item 557; engine `advancedPairError`): a hybrid needs its base attribute at 6 and its partner at 5, from level 7. A squared class needs its attribute at 9, from level 7.
- Turning a batch on is data only: `assignment.advanced.live` and each class's `shelved` flag.
- Advanced classes keep every base move.

**Old saves (item 558).**

- A Revision 2 character's class becomes its Revision 3 class once, on load: medic → bard, scribe → mage, warden → trickster, hexer → channeler, assassin → infiltrator. The rest keep their id.
- Moves the new class doesn't list stop working.
- A note in the log says what changed.

## Combat on the grid

**The map.** Square tiles, 1.5 m each. Line of sight runs centre to centre; anything solid in between blocks it. A character on higher ground gets +1 to hit targets below.

**Order.** At the start of combat everyone rolls initiative: d20 + Initiative bonus. Highest goes first; ties go to higher Agility. If one side ambushes the other, the ambushers get a **surprise round**: each acts once with up to 3 AP, and the surprised side can't act unless a perk says so.

**A turn.**

1. **Start:** you get 6 AP. Conditions tick. Your weapon loses 2 Heat. Strain drops by 1 (always; rules 1.5), then a held Outburst swells.
2. **Act:** spend AP on actions, in any order.
3. **End:** unspent AP is lost, except AP held for Overwatch.

**The AP ceiling.** Nothing can give a turn more than 9 AP or fewer than 2, and perks can add at most +3 AP to a single turn.

**Reactions.** Each character gets one reaction per round, used outside their turn: an opportunity attack, or a perk that says "reaction." Reactions cost no AP unless stated.

**Grid references.** Every map is a grid. Columns are letters, A, B, C… from left to right, and rows are numbers, 1, 2, 3… from top to bottom; a map is at most 26 × 26, so the last column is Z and the last row 26 (see Maps, rules 1.16). "C7" is column C, row 7. Each map carries notes on what is where ("L3–L5: stacked platinum crates"). Players see them by hovering a tile, and the Narrator reads them with the map.

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
| Camera · Alarm panel | | | 10 | Electronic devices (rules 1.3): Slicers work on them; shot, they go dark |
| Emplaced turret | movement | half | 60 | Electronic; the Narrator runs it as an enemy |

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
| Speed reload a magazine (the old one drops into the pile on your tile), or swap an Evoker core | 2 |
| Tactical reload a magazine (the old one goes back in your pack; rules 1.9) | the reload's cost + 1 (3) |
| Clear a jam | 2 |
| Throw | 2 |
| Use an item, open a door | 1 |
| Draw from the pack into one hand (a one-handed weapon, a focus, a torch, a shield; what the hand held goes to the pack), or swap main hand and off hand (rules 1.9: Gear in a fight) | 1 |
| Draw a two-handed weapon (it fills both hands; what the off hand held goes to the pack) | 2 |
| Put away what a hand holds into the pack | 1 a hand (2 for a two-handed weapon) |
| Drop what a hand holds (it lands in the pile on your tile) | 0 |
| Put on or take off a light armour piece (1.2 kg or less, provisional: item 685); heavier armour is not changed in a fight | 1 each |
| Fit a mod (item 147) | 1 |
| Pick up from a pile on your tile or an adjacent one (any or all of it; rules 1.9) | 1 |
| Analyze an enemy (reveals HP, armour, resistances, weak points) | 2 |
| Overwatch: hold AP for one shot at the first enemy that moves into your line | AP of the shot |
| Draw a Sigil glyph (on your own tile only, rules 1.4) | Glyph AP cost, see Derived stats (draft 1.2) |
| Evoke a Sigil Line (within 1 tile of a glyph, not on a middle one; rules 1.4) | 1 (draft 1.2) |
| Begin an Outburst / Pump / Release (rules 1.5) | 2 (Swift 1) / 1 (free while Empathy's free Pumps last) / 1 |
| Steady the heart / Feed a glyph / Let it go / Heart Overwatch on | 1 / 1 / free / free |
| Cast a Soul class move | Soul cast AP (2) |
| Syphon (refill MP from the air) | 1 |
| Vent (dump Flux into the air) | 1 |
| Crystallise (make a mana core) | 3 |
| Pray | 3 |
| Speak a sentence | 0 |
| Persuade, threaten or parley mid-fight (a skill check) | 2 |
| Hide (only out of every enemy's sight; rules 1.3) | 2 |
| Put out Burning (yourself or an adjacent ally) | 1 |
| Break a grapple | 2 |
| Recover a dropped weapon (raise a lowered one) | 2 (1) |
| Reload both guns: speed / tactical | 3 / 4 |
| Shove an adjacent enemy | 2 |
| Brace (set a heavy weapon) | 1 |
| Field Repair | 2 |

## Attacks, damage and armour

**The actions perks rely on** (item 22, written 7 Nov 2026; provisional):
- **Shove** (2 AP): an adjacent enemy. Roll d20 + Raw Power modifier against 10 + the target's Raw Power or Athletics modifier, whichever is higher (an enemy uses its attack bonus). On a success it moves 1 tile directly away from you. If that tile is blocked, it is knocked prone instead. Shoving someone into fire or a toxic spill is the point.
- **Break**: attacking an object (Shoot an object; a melee strike works the same way). See Cover and Map objects.
- **Brace** (1 AP): set a heavy weapon. While braced (or prone) you don't move, the LMG loses its −2, the .700 Blackpoint can fire, and Recoil is halved. Moving ends it.
- **Field Repair** (2 AP): Improvisation 3+, uses a spare-parts kit charge, restores 10% + 5% per Improvisation point above 3 of a weapon's or a robot's Durability. Out of combat, 10 minutes per charge restores 50%.
- **Improvise Tool**: out of combat, an Improvisation check the Narrator calls; on a success you have a one-use tool for the job, as the Narrator describes it.
- **Analyze on NPCs**: out of combat it is an Acuity check the Narrator calls (TN by how guarded they are). On a success you learn what Analyze reveals in a fight, in words.
- **Wards and rituals** belong to Sigil and Soul magic; until that pass, the Narrator rules them from the perk's text.

**Prone** (1 AP to drop or stand): ranged attacks against you are at −2 and melee attacks at +2, and you can't move until you stand. **Opportunity attacks** need a free reaction (one per round). **Overwatch** spends the shot's AP now and holds the shot until your next turn: the first enemy that moves while in your line of sight and range takes it, as your reaction.

**Vision** (written 7 Nov 2026, Leon: vision, fog of war and darkness are one stat; provisional):
- **Vision range** = 12 + 2 × (Perception − 1) + Vigilant tiles.
- **Darkness** halves it. A zone is lit or dark. Light sources (fire, lamps, torches) light a radius around them, and a target standing in light is seen at full range.
- **Fog of war:** the squad shares what any member sees. An enemy out of every member's sight (range and line of sight) isn't shown and can't be targeted. **Sensory** lets you sense what you can't see: within 1 + Sensory ÷ 3 tiles (rounded down), an unseen enemy shows as a presence, with no details.
- Enemies see by the same rule (Vision 12, halved in darkness).

**Analyze.** 2 AP (1 with Acuity's Quick Read), at an enemy you can see within 4 + Acuity tiles. No roll. From then until the fight ends, the whole squad sees that enemy's HP, Defense, armour and status effects. Before that, the squad sees only its name, its tier and how hurt it looks (unhurt, wounded, badly hurt, down). If the analyst has **Read Them** (Acuity 5; it was Weak Point), that enemy deals 15% less damage to the whole squad (rules 1.13: a beta is defence; the +15% squad damage is gone). Details are provisional (item 56).

**Attack roll.** d20 + attack skill modifier + weapon accuracy + situational modifiers, against the target's **Defense** (10 + Dodge).

| Attack | Skill |
|---|---|
| Guns, bows, thrown weapons | Dexterity |
| Heavy melee and unarmed | Raw Power |
| Light (finesse) melee | Dexterity (rules 1.12, item 953: the attack skill is the attribute's alpha) |
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

**Critical hits.** A natural 20 is a critical; an Aimed shot or an attack from Hidden crits on 19–20. A critical does damage × the attacker's Critical multiplier, reduced by the target's Critical damage taken. (Rules 1.15: the multiplier is ×1.5, to ×2.0 at most; see "Rules revision 1.15".) A critical also forces an injury roll.

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

**Injuries.** After a critical, the target rolls Injury resistance; if that fails, roll a d6. 1: head, Dazed for 1 turn. 2–3: torso, Bleeding. 4: arm, −2 to attacks with it. 5–6: leg, half Movement. Arm and leg injuries last until treated. Details (item 53): Injury resistance is a d100 at or under 10% × (Endurance − 1); arms and legs are left or right on a d2; an arm injury hurts attacks with a two-handed weapon (anything but pistols, revolvers, light melee, thrown and unarmed) whichever arm it is, and a one-handed weapon only if it's the main-hand arm; leg injuries halve Movement once, however many; head and torso injuries end with the fight, arm and leg injuries go back to the character. The Narrator decides when the story treats them (a long rest with a Bard, the class that carries the medic rules (item 581), surgery, a field hospital). Enemies resist with their tier's Endurance.

**Shields** are temporary HP, used up before real HP, and gone at the end of combat unless a rule says otherwise. Healing can't raise HP above its maximum.

**Downed and dying.** At 0 HP you're Downed: you can't act. At the start of each of your turns, roll d20: 10 or more is a success, less is a failure. Three successes and you stabilise at 1 HP; three failures and you die. Each hit you take while Downed counts as a failure. An ally can stabilise you with a stim (1 AP for a Bard, the class that carries the medic rules (item 581); 2 AP for anyone else).

**Every death releases bots.** When any person or beast dies, the ambient mana meter rises (see Mana).

**Enemy stat blocks** (enemies.json, provisional). **Superseded by rules 1.15: every enemy has a level, there is a fifth tier (Vermin), and the numbers in this table are no longer used; see "Rules revision 1.15".** Hostiles that aren't full characters use one of four tiers. The Narrator picks the tier, a name and a weapon from weapons.json when it starts a fight; the engine runs them.

| Tier | HP | Defense | Attack bonus | Armour | Movement (tiles per AP) | Endurance | Spare magazines |
|---|---|---|---|---|---|---|---|
| Minion | 30 | 10 | +1 | 0 | 1.5 | 1 | 1 |
| Soldier | 60 | 12 | +3 | 5 | 1.5 | 3 | 2 |
| Elite | 100 | 13 | +5 | 10 | 2 | 5 | 3 |
| Boss | 200 | 14 | +6 | 10 | 2 | 7 | 4 |

Hostiles get 6 AP, roll initiative with their attack bonus, and deal their weapon's damage with no multipliers. A Boss counts as 3 kills for weapon mastery. Their Endurance sets their Injury resistance (10% × (Endurance − 1)), like a character's. They carry their weapon's spare magazines, which they reload from like anyone else. When a gun runs dry they fight with their fists, and what they carry is there to be stolen or looted: when they die, their weapon, their leftover magazines and what the drop tables roll land in the pile where they fell (rules 1.9, World Play: Drop tables).

## Weapons

**Guns.**

- **Heat:** a single shot adds 1, a burst 2, full auto 4. Each 2 Heat is −1 to hit. When Heat reaches the weapon's limit, it jams (2 AP to clear). Heat drops by 2 at the start of each of your turns.
- **Recoil:** each shot after the first in the same turn is −1 to hit, cumulative, reduced by floor(Dexterity ÷ 2).
- **Range:** each weapon has an effective range in tiles. Each further band of the same length is −2 to hit, out to two bands.
- **Modes:** a weapon lists which of single, burst and auto it supports.

**Bows and crossbows** make no noise, so a shot doesn't reveal a Hidden archer. Bows have no Heat and no recoil, and their damage scales with the archer's Raw Power.

**Melee** reaches adjacent tiles (diagonals count); polearms reach 2 tiles. Heavy melee weapons cost 3 AP per attack, and use Raw Power. Light melee weapons cost 2 AP, and use Dexterity (rules 1.12, item 953).

**Ammo types**

| Ammo | Effect |
|---|---|
| Standard | none |
| Armour-piercing | ignores armour; −20% damage |
| Hollow-point | +30% damage; armour counts double |
| Incendiary | target is Burning; −10% damage |
| Enhanced | a sliver of mana core in every round. Ignores armour, deals Elemental damage, and each hit releases bots (+1 on the ambient mana meter). One core makes 10 rounds. Rare, and expensive to buy. |

**Reloading** uses up ammo you carry, and a magazine weapon (the pistol, SMG, service rifle, LMG, .700, and the revolver's speedloaders) offers two reloads (rules 1.9, World Play 1.1). A **speed reload** (2 AP) swaps in your fullest spare magazine and drops the one in the gun into the **pile** on your tile (World Play: Piles), empty or with whatever rounds were left in it, so it can be picked up again. A **tactical reload** (the speed reload's cost + 1, so 3 AP) puts the old magazine back in your pack, rounds still in it. Quick Release and Speed Loader lower the speed reload's cost as before; the tactical reload is that cost + 1. Each magazine keeps its own ammo type. Weapons loaded round by round (lever carbine, scattergun, long rifle, bows, crossbow) have one reload: they top up from loose rounds and drop nothing. No spares, no reload: fight with something else. Starting kits carry spares: the medic and the Sigil student 2 pistol magazines, the line soldier 3 rifle magazines, the Soul initiate 2 speedloaders. Enemies carry the spare magazines their tier lists (Enemy stat blocks) and always speed-reload, so their magazines feed the piles. On the area map the same two reloads exist. Provisional (items 55, 679, 680).

**Magazines and rounds are inventory.** The backpack lists loaded, part-loaded and empty magazines, and loose rounds, separately, each with its weight. Reload only takes a magazine with rounds in it. What is dropped lies in a **pile** on its tile, on every map, and stays there (World Play: Piles). **Picking up** (1 AP) takes what you tick from the pile on your tile or one adjacent tile (everything by default): a dropped magazine keeps its rounds and ammo type, loose rounds come in one stack per calibre, and weapons keep their rarity, wear and mods. In a fight a magazine for the gun in your main hand joins its spares, one for a different off-hand gun the off hand's spares, and everything else your pack. **Loading** a magazine from loose rounds costs 1 AP per 5 rounds in combat (load part of one if you're short of AP), and nothing out of combat. Starting kits also carry loose rounds: 24 for the pistols, 48 rifle rounds for the line soldier, 12 for the revolver. Provisional (items 58, 674, 675).

**Plot items.** The Narrator's loot names a weapon or item id the engine knows, and the character gets that thing (with the Narrator's in-world name, if given). Anything else (an unknown or empty id) becomes a **plot item**: the Narrator's name and one-line description, no weight, no stats, never equipped, listed under PLOT ITEMS in the backpack. A player can give one to another character or drop it out of a fight; the Narrator takes one back when the story uses it up (its plot id with a negative quantity). The log line always says what was actually given.

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
| Crossbow | Bow | 55 | 16 | 1 | none | single | 4 kg |
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
| **Uses** | The attack skill: Dexterity (guns, bows, thrown, light blades), Raw Power (heavy melee, unarmed). |
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
2. **Focuses must be held** (item 630 retires item 77's "carried counts"). A focus counts only in the main or the off hand; one in the pack or on the belt does nothing until it is drawn. Sigils need an Evoker in a hand ("Needs an Evoker in hand."); Soul magic pays MP only from an Emanator in a hand (without one, an Outburst draws on the air at +2 Strain, as in Soul magic; Syphon, Crystallise and moves that spend MP need it: "Needs an Emanator in hand."). The Evoker blade, the spellslinger's pistol and the Grand staff count as an Evoker, the Emanator gauntlet as an Emanator, so a spellsword can hold a blade-focus and a shield. A 2H weapon fills both hands: no focus with it unless the weapon is one (the Grand staff). A focus put away mid-fight stops new casts at once; an Outburst already held stays held. Carried, a focus keeps what it stores (the Evoker's core charge, the Emanator's MP). Changing what a hand holds in a fight costs **1 AP a hand** (rules 1.9, World Play: Gear in a fight): drawing from the pack into one hand 1, a two-handed weapon 2, swapping main and off hand 1, putting away 1 a hand, dropping 0 (it lands in the pile on your tile). A focus drawn from the pack counts at once. Out of a fight gear changes are free.
3. **Single attacks.** With a weapon in each hand, attack with either one at its normal cost and modifiers.
4. **Paired attack.** One action with both weapons. **AP = the higher attack cost + 1.** The main hand attacks at −1 and the off hand at −3, at the same target or two targets, each with its own roll. The off-hand penalty drops by 1 for every 3 points in its attack skill (Dexterity, for guns and light blades alike: rules 1.12, item 953), to a minimum of −1.
5. **Two guns.** Each gun tracks its own ammo. **Heat is one pool for the pair** (item 956): its limit is the two guns' limits added, either gun's shot adds to it, and it cools 4 at your turn start; at the limit the gun that fires jams. Reloading one gun is 2 AP; reloading both is 3 AP (a tactical reload of both, 4; item 679).
5a. **The second weapon asks more** (item 956). With a weapon in each hand, the off-hand weapon needs 2 more points of its skill than it does in the main hand; a weapon with no requirement needs 2 of the skill it hits with. Shields, torches and focuses are not weapons.
5b. **Both hands** (item 956). Two weapons of one kind (two guns, or two melee weapons) get a third block on the Attack tab: the paired attack, reloading both guns, and the techniques that can be made **with each weapon in turn** by the paired attack's rule (main hand −1, off hand −3 less 1 per 3 Dexterity, the dearer of the two costs + 1 AP): Bash, Sunder, Hamstring, Half-Sword; Aimed Shot, Called Shot, Punch Through, Burst, Suppress. Both weapons must be able to use the technique.
5c. **Gear gates (rules 1.13; provisional, item 1002; techniques.json `rules.gear_gates`).**
    - **Hellraiser servo-fist:** needs Raw Power 3 (was Proficiency 3).
    - **Science Team core rifle:** needs Dexterity 3 (was Proficiency 3).
    - **Bot-thread banner:** needs Empathy 3 (was Camaraderie 3).
    - **Heavy armour:** outer-torso armour of Class 4 needs Pain Threshold 3; Class 5 needs Pain Threshold 5. Classes 0 to 3 ask nothing.
    - **Light blades and guns** are gated by Dexterity as before: it is the skill they hit with, and they ask no level.
    - **The off hand asks what the main hand asks.** A weapon's or an item's requirement is checked in whichever hand it goes to (and for a worn piece). A second weapon still asks 2 more of its skill than it does in the main hand (5a).
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
| Underbarrel | Bayonet | Melee strike 15 damage, Dexterity, 2 AP | 0.4 | 120 |
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
| ✓ Crossbow | 55 | 16 | 1 bolt | 4 | 500 | |
| Repeating crossbow | 22 | 10 | 6 bolts | 3.5 | 700 | |

- **Recurve · Nock and Loose:** if you haven't moved this turn, your second arrow costs 1 AP. *"Quiet, cheap, and it never jams."*
- **Longbow · Arc:** indirect shot at −2, like Lob. *"Over the wall and through the roof."*
- **Crossbow · Bolt Rest:** a Shot costs 3 AP and loads the next bolt as part of it (no separate reload while bolts are carried); an Aimed Shot costs no more than a Shot. Its signature is **Heavy Bolt**. Provisional (item 955). *"Patience, cranked."*
- **Repeating crossbow · Volley:** 3 AP; two bolts, each with its own roll. *"An Arkvelton toy that got out of hand."*

##### 7.7 Light blades: 6 types (1H, Dexterity)

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
| Hellraiser servo-fist | 30 | 2.5 | 1,200 | Raw Power 3 (rules 1.13; was Proficiency 3) |

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

##### 7.11 Mana arms: 7 types (new family; requirements listed)

Guns and light blades use Dexterity; heavy melee and bare hands use Raw Power. These are the class weapons for Spellslinger, Storm Hand, Blade Scribe, Lumeri Templar and Banner Dancer, but anyone who meets the requirement can use them.

| Type | Hands | Dmg | Range | Feeds on | Kg | Price | Needs |
|---|---|---|---|---|---|---|---|
| Science Team core rifle | 2H | 32 Elemental, ignores armour | 16 | a mana core: 1 charge a shot | 5 | 2,600 | Dexterity 3 (rules 1.13; was Proficiency 3) |
| Spellslinger's pistol | 1H | 22 | 8 | .32 Decrkm, sigil-etched magazines | 1.1 | 1,500 | Brain Power 3 to inscribe |
| Evoker blade | 1H | 26 | 1 | counts as an Evoker | 1.8 | 2,400 | Brain Power 3 |
| Emanator gauntlet | 1H | 18 + one element | 1 | counts as an Emanator | 1.5 | 2,200 | Will Power 3 |
| Lumeri censer gun | 2H | 30 / 18 (shotgun) | 8 | shells, or blessed shells | 4.5 | 2,000 | Faith 3 |
| Bot-thread banner | 2H | 24 | 2 | none | 3 | 1,800 | Empathy 3 (rules 1.13; was Camaraderie 3) |
| Grand staff | 2H | 24 | 1 | counts as an Evoker | 2.5 | 2,400 | Brain Power 3 |

Each hit from mana arms releases bots: +1 on the ambient mana meter, like enhanced rounds.

- **Core rifle · Overcharge:** spend 3 charge on one shot: 80 Elemental damage, and +3 on the meter. *"The Science Team's proof that mana is a munition."*
- **Spellslinger's pistol · Stored Spell:** each sigil-etched magazine holds one Sigil, drawn into it out of combat with an Evoker (the core cost is paid then). The first hit from that magazine releases it at the target. *"Every magazine is a letter. Some are threats."*
- **Evoker blade · Edge Word:** after a hit, your next glyph this turn costs 0 AP (drawn on your own tile; its charge and Flux still apply; not on an attack that already drew one, item 487). *"The Blade Scribes write with the edge."*
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

> **Rules 1.12:** drill (Physical techniques, below) takes weapon mastery's place: a bar per weapon, three marks, techniques for rewards. The kills table, its attack bonus and the weapon perks below are **retired** (Leon, 10 Nov 2026; item 947) and kept here for reference only.

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

### Physical techniques (rules 1.12, Physical 2.0)

Anyone can pick up any weapon and mix the techniques they know with it, the way Sigil words and Outburst modules mix. There are two systems, and each has its own meter:

- **Melee owns the sequence.** Techniques chain inside your turn around **Momentum**, a meter on you: the plain attack builds it, Strikes and Openers spend it, Finishers spend all of it. *(Rules 1.12 built it by chaining different techniques; superseded by the rework in "Melee: Momentum and the chain".)*
- **Ranged owns Pressure,** a meter on the target, built by fire and spent by Takes.

Design: `docs/design/proposals/2026-11-melee-techniques.md` and `2026-11-ranged-techniques.md`. Data: `data/techniques.json` (58 techniques and the shared numbers) and the `phys` block on each weapon in `data/weapons.json`. Engine: `packages/engine/src/physical/`. **Every number in this section is a placeholder for the balance pass** (section 14, items 932 on).

#### Weapon properties

A weapon is a set of properties. A technique works with any weapon of its system, and reads the weapon's properties for a bonus line ("with the right weapon"). When a weapon has two properties a technique reads, the player picks one line.

Melee:

| Property | Means |
|---|---|
| **Edge** | It cuts. Typical rider: Bleeding. |
| **Point** | It thrusts. Typical riders: to-hit, armour ignored, pinning. |
| **Blunt** | It crushes. Typical riders: Prone, Dazed, armour broken. |
| **Hook** | It catches. Typical riders: pull, trip, disarm. |
| **Reach** | It strikes 2 tiles away. |
| **Heavy** | Mass. Melee: 3 AP an attack, knockback, hitting several. Ranged: must be Braced to work well. |
| **Light** | Fast. 2 AP an attack; extra steps and strikes. |
| **Bare** | A fist or a glove. Grapples and throws. |
| **Thrown** | It can leave the hand. |

Ranged:

| Property | Means |
|---|---|
| **Quick** | Handy. Firing next to an enemy doesn't provoke; moving costs no accuracy. |
| **Auto** | Throws many rounds. Pressure on a miss; several targets. Always offers Burst and Rake. |
| **Precise** | A long barrel or glass. Better when you haven't moved; criticals. |
| **Spread** | Shot or flame in a cone. Everyone close; breaks cover. |
| **Heavy** | Mass. Melee: 3 AP an attack, knockback, hitting several. Ranged: must be Braced to work well. |
| **Blast** | It explodes. Aimed at a tile; Pressure to everyone in the radius. |
| **Arc** | It flies over. Indirect fire. |
| **Silent** | No report. Never reveals you; no Pressure on a miss, more on a hit from unseen; its pips are hidden. |
| **Loud** | A cannon in the hand. A miss still gives Pressure; saves against it are harder. |
| **Drawn** | Your arm is the powder. No Heat or Recoil; a quiver, not a magazine; it can't be reloaded in a fight. |
| **Thrown** | It can leave the hand. |

Each weapon also names the skill its attacks roll (**hits with**) and what its damage **scales with**: the damage multiplier of a weapon attack is 1 + 0.1 × (that Attribute − 1) + 0.05 × that skill (Derived stats). A Bare weapon scales with Strength and with both Raw Power and Dexterity.

#### Knowing, readying and drill

1. **Everyone knows** Cut, Shot, Aimed Shot and Overwatch. They take no ready slot.
2. **At creation** a character with Raw Power or Dexterity picks 2 melee techniques (one must be an Opener), and one with Dexterity picks 2 ranged techniques. With no picks sent, they are Lunge and Sidestep, and Suppress and Shift. A character made before 1.12 gets those defaults.
3. **Ready lists.** A character has one ready list per system: 3 + half the attack skill, rounded down (melee: the better of Raw Power and Dexterity; ranged: Dexterity). Only ready techniques can be used. The lists are changed out of a fight.
4. **A weapon lends its signature.** Each weapon teaches one technique. While you hold the weapon, that technique is usable without knowing it and without a ready slot.
5. **Auto weapons always offer Burst and Rake,** known or not.
6. **Drill** is an XP bar per weapon. When an enemy dies, everyone who hit it in that fight gains drill for the weapon they hit it with: minion 5, soldier 10, elite 25, boss 50. A hit alone gives nothing. Defenders, Fighters and Marksmen earn it at ×3.
7. **Three marks** on each bar, at 300, 900 and 1,800 drill. Mark I teaches the weapon's signature for good: it becomes a technique you can ready with any weapon. Marks II and III each give one pick of any technique of that weapon's system. A weapon with no signature gives a pick at mark I too.
8. **Off its home.** A technique marked † is particular to a kind of weapon. With a weapon that has none of its home properties it is at −2 to hit and gets no property line.

#### Melee: Momentum and the chain

*Reworked 10 Nov 2026 (Leon; `docs/design/proposals/2026-11-nine-doors.md` section 20). Enemies follow the same rules.*

1. **Momentum** runs 0 to 3 for everyone holding a melee weapon (a Fighter: 5). **A fight starts with 1.**
2. **Only the plain attack gives Momentum:** +1 when it hits. That is Cut, a plain swing with any melee weapon, fists included. No other technique's hit gives any, and no technique gives it by its text, with two exceptions: Parry's Light line (+1), and Shield Bash's hit (+1), which pays Guard for it.
3. **A Strike and an Opener each spend 1 Momentum** when used, and can't be used without it. Cut and Pull Out are free and spend none; Ambush costs none. **The first Opener you use in each fight costs no Momentum.** Links and Answers spend none.
4. **The chain** is the melee techniques of one turn, in order:
   - an **Opener** is only the first of them;
   - **Strikes** and **Links** follow in any order (a Link costs 1 AP and deals no damage);
   - a **Finisher** needs Momentum 2, spends all of it, and is the last melee technique of the turn;
   - an **Answer** is a reaction: it fires on its trigger, on anyone's turn.
5. **Walking costs Momentum:** −1 for each tile you move by a walk, a Sprint or a Disengage. A forced move (a push, a pull, a throw) costs none; neither does a Link's own move (Sidestep, Drag's step), a technique's own step or run (Lunge's step, Charge's run when the run is part of Charge), or a free step from a perk or a class move. Move with a Link to keep your Momentum.
6. **Being hit costs Momentum:** −1 each time you take a damaging hit, from any source. Not while you are guarding: the Guard technique is up, the hit was Parried, or you hold Guard points.
7. **Momentum carries from turn to turn.** Nothing drops it at the end of a turn.
8. **A set-up** (Feint, Sidestep) marks one target for your next technique this turn, and is spent by it.
9. **A technique's save** (Leon, 10 Nov 2026) is against 12 + **half** your strength with the skill the weapon hits with, rounded up, plus the technique's own step: 10 points in the skill (strength 9) is +5 (TN 17), 6 points +3, 2 points +1; an enemy's tier number is halved the same way (minion 0, soldier +1, elite +1). This is every save a technique itself forces, melee and ranged (Bash, Trip, Feint, Keep Back, Guard with Reach, walking away from a Bind, a Stop, Rout, Pin Down, Stopping Shot). A condition applied with its own save (Bind's grapple) keeps the full strength, as Sigils, Outbursts, prayers and speech do.

#### Guard (rules 1.13, Durability's door)

Guard is a pool of points that takes hits for you. Anyone with Durability has one. Every number here is provisional (techniques.json `rules.guard`; items 991 to 1003).

1. **The pool.** Its size is your Durability points, 5 at most. A fight starts with 0 Guard and what you hold is lost when the fight ends. The Defender's own pool (5) stands when it is the larger, and the Defender's class moves are unchanged.
2. **Gaining Guard.** The **Guard technique** gives 1 Guard, +1 for each Durability point above the first, +1 more with a shield in the off hand: Durability 1 gives 1, Durability 3 gives 3, Durability 3 with a shield 4 (the pool of 3 holds 3 of it). The **Brace action** (1 AP) gives a flat 2 Guard, 3 with a shield. Never above the pool. With a Guard pool you may Brace with any weapon; Brace is still once until you move.
3. **Bracing for Guard is not bracing the weapon.** A weapon that had the Brace action before rules 1.13 (one that must be braced, one at −2 unbraced, one whose skill is a braced bonus) is set as before: Recoil halved, its penalties gone, its techniques' Braced lines open. With any other weapon, Brace sets only you: you gain the Guard and stand in the braced stance that class moves ask for, and nothing else. The Brace technique (ranged, 16) still sets such a weapon where its own rule allows.
4. **Guard soaks.** When a hit would take HP, each Guard point takes 10 damage off it and is spent, as many points as the hit needs, **but the last point is kept back** so that a reaction (Interpose, Shield Wall, Shrug It Off) can still be paid. If what would get through would take you down, the last point is spent too. Guard is counted last: after armour, after every other reduction, and after your shield of HP. A condition's own tick (Bleeding, Burning, poison) and harm you do to yourself (Strain, a Mana Short) are not hits; a trap, a hazard and an explosion are.
5. **Pressure comes off Guard first:** each point of Pressure that would land on you costs 1 Guard instead, with no reaction, while you have any.
6. **Momentum.** A hit on a unit that holds Guard points costs it no Momentum.
7. **Interpose (Durability 3).** An Answer everyone with Durability 3 has, whatever is in the hands: when an ally next to you is hit by an enemy's attack, spend 1 Guard and your reaction to take the hit instead. The damage is worked out again against you, so your armour applies; your shield and the Guard you have left then soak it. A critical hit's injury follows the hit to you. It works while Suppressed (it protects). You switch it off like any Answer.
8. **The Defender.** A Defender Interposes by the class move (and that move's policy), not by the Answer. A Defender with Reactive Plate spends Guard through the plate and its policy (spend what it takes, keep 1, off); the soak of rule 4 stands aside for that unit, so Guard is never spent twice on one hit.

#### Ranged: Pressure

1. **Pressure** runs 0 to 4 on every combatant.

   | Pressure | State | On an enemy | On a player character |
   |---|---|---|---|
   | 1 | Under fire | nothing | nothing |
   | 2 | **Pressed** | -1 to hit with ranged attacks (melee attacks are not affected); it can't hold a Watch | the same |
   | 3 | **Suppressed** | −1 AP; no reactions that attack or move it | no reactions that attack or move you; **never an AP loss** |
   | 4 | **Broken** | −2 AP; its first action must be to reach cover or drop Prone | players stop at 3 |

2. **Tiers.** An elite stops at 3. A boss stops at 2: it can be Pressed, never Suppressed.
3. **Protective reactions always work.** Suppressed stops the reactions you hit back or move with (a held shot, an opportunity attack, Riposte, Keep Back). It never stops the ones that protect (Parry, Take the Hit, Shrug It Off and the like).
4. **Gaining it.**
   - The first ranged hit you land on a target each turn gives it +1.
   - +1 more if the shot goes past cover the target is standing against. A target in the open gives no extra.
   - A hit from Hidden with a Silent weapon gives 2 in place of 1, and those pips are hidden from the target's side until a Take is used on it.
   - A technique that states its own Pressure for a hit gives that in place of the ordinary +1.
   - When a ranged attack takes someone out, every other combatant of their side within 3 tiles who saw it gains +1.
5. **Losing it.**
   - At the end of your own turn: −1; or −2 if you end it against cover and out of every enemy's sight, or closer to the nearest enemy than you began it. (One of these, not a sum.)
   - Each melee hit of yours removes 1 from you.
6. **A Take** needs its target Pressed, is one a turn per shooter, and lowers the target's Pressure by 2 after its effect. Its own hit adds none. If the target was Suppressed when the Take began, the Take's stronger line applies.
7. **A Watch** (a held shot) is paid for on your turn with its trigger, and fires as your reaction with no prompt. It ends when it fires or at the start of your next turn. It can't be set while you are Pressed, and becoming Pressed ends one you hold.
8. **Stopped once.** A unit that a ranged technique has Pinned, pushed, knocked Prone or halted can't be stopped by another ranged technique until the end of its next turn. Where a stop allows a save it is the better of Guts and Athletics against TN 12. Melee techniques neither set nor check this.
9. **A Press** adds 1 Heat on top of what it fires. A **Set** costs 1 AP, never fires and adds no Heat. Every technique lists its rounds beside its AP; a technique the magazine can't pay for is refused with the count.
10. **The quiver.** A Drawn weapon has a quiver, filled out of a fight from the arrows you carry, in any mix of types up to the weapon's capacity. Each shot names its arrow type. A quiver can't be refilled in a fight.
11. **Thrown weapons.** A technique that throws the held weapon makes a ranged attack at throwing range, with line of sight and cover, aimed with Dexterity whatever the weapon hits with. It burns no rounds and adds no Heat or Recoil. A hit gives Pressure as any ranged hit does. *(Rules 1.12 added "and Momentum when the technique is a melee one"; superseded by the Momentum rework: only the plain attack, Cut, gives Momentum.)* The weapon lands in the pile on the target's tile.
12. **A weapon that isn't in the hand.** A technique that draws its weapon (Draw Cut, Snap Shot) names a stowed weapon: the draw is part of the technique and costs nothing more, and the weapon that was in the hand goes to the pack. A carried grenade is the weapon of a technique used with it (Lob, Rout): it has the grenade's properties, and one is spent.
13. **Nailed in place.** Where a technique pins "until it spends 2 AP", the target can't move until it pays 2 AP to pull free, or an ally next to it does. A weapon left in it falls to its tile when it is freed, when it dies or surrenders, or when the fight ends. **A weapon left in it (Run Through, Reach)** may be pulled out by anyone next to it for the same 2 AP, which frees it: the one who left it, or anyone else not on the target's side, takes the weapon into a free hand (no free hand: it falls to the target's tile); an ally of the target frees it as above (Leon, 10 Nov 2026).
14. **An attack that never comes.** When a held shot answers an attack being called and takes the attacker out, that attack is not made; its AP is spent.

#### Enemies

Enemies have both meters and follow every rule above. An enemy has the free techniques, the technique its weapon lends, and the list of its tier (item 950). A minion has no list and keeps to plain attacks. The enemy AI uses a technique where it would have made a plain attack, when the technique is worth more to it; Analyze shows it ("means to use Suppress on …").

#### The melee techniques (27)

AP "weapon" is the weapon's attack cost (2 AP; 3 for a heavy melee weapon).

**Openers**

| # | Technique | AP | What it does | With the right weapon |
|---|---|---|---|---|
| 1 | **Lunge** | weapon | Step 1 tile toward the target, then strike. The step draws no opportunity attack. | **Point:** +2 to hit. **Reach:** the step may be 2 tiles. **Heavy:** on a hit the target is pushed 1 tile. |
| 2 | **Charge** | weapon | After moving 3 or more tiles in a straight line this turn: strike at +10% damage per tile moved, up to +50%. | **Point:** ignores 5 armour. **Blunt or Heavy:** the target makes a Body save or falls Prone. **Reach:** you strike before it can take its Overwatch or Keep Back. |
| 3 | **Feint** | 1 | No damage. The target makes a Brain save against 12 + half your strength with the weapon's skill (Momentum, rule 9; it was "your Brain debuff strength"). If it fails, your next technique against it this turn has +3 to hit and it can't use an Answer. | **Light:** the save is at −2. **Hook:** on a failed save its weapon is also lowered (1 AP to raise). |
| 4 | **Draw Cut** | weapon −1 | Draw this weapon from the pack or a sheath and strike in one action. Only if you started the turn with it stowed. | **Edge:** Bleeding on a hit. **Light:** if the target hasn't acted this fight, it counts as an ambush. |
| 5 | **Ambush** | weapon | Only from Hidden: strike with the Ambush multiplier. It costs no Momentum. | **Point:** crits on 18–20. **Bare:** no damage, the target is Grappled and Silenced for 1 round instead. |

**Strikes**

| # | Technique | AP | What it does | With the right weapon |
|---|---|---|---|---|
| 6 | **Cut** (free) | weapon | One strike. Everyone knows it; it never takes a ready slot. | **Edge:** a critical leaves Bleeding. **Point:** +1 to hit. **Blunt:** a critical leaves Dazed. |
| 7 | **Sweep** † | weapon +1 | Strike up to 3 enemies in an arc in front of you, each at ×0.7, one roll each. | **Reach:** the arc is 2 tiles out. **Heavy:** all adjacent enemies, not just the arc. **Edge:** each one hit bleeds on a critical. Friendly fire applies. |
| 8 | **Bash** | weapon | Strike at ×0.5 with the pommel, haft or fist. The target makes a Body save or is Dazed. | **Blunt:** full damage. **Heavy:** on a failed save it is pushed 2 tiles instead of Dazed, your choice. **Bare:** costs 1 AP less. |
| 9 | **Sunder** | weapon | Strike at ×0.7. On a hit the target's armour is 5 lower for the rest of the fight (once per target per attacker). | **Blunt or Hook:** 10 lower. **Edge:** if the target has no armour left, Bleeding instead. |
| 10 | **Flurry** | weapon +1 | Two strikes at ×0.6 at one target, the second at −1 to hit. | **Light:** three strikes. **Bare:** each hit after the first adds +1 to the next Bind or Throw Down this turn. **Thrown:** the strikes may go to two targets in throwing range; the weapons land in the pile on their tiles. |
| 11 | **Hamstring** | weapon | Strike at ×0.7. The target makes a Body save or is Slowed 2 rounds. | **Edge:** no save. **Hook:** Prone instead of Slowed. **Point:** it also can't Sprint or Disengage while Slowed. |
| 12 | **Bind** | weapon | No damage. Lock the target's weapon with yours: until your next turn it attacks anyone but you at −2 and can't move away without a Body save. You can't use Reach while binding. | **Hook:** Brain save or it is Disarmed. **Bare:** it is Grappled. **Heavy:** the −2 becomes −4. |
| 13 | **Half-Sword** | weapon | A short, driven thrust: ×0.8 damage, ignores 10 armour. | **Point:** ignores all armour. **Heavy:** full damage. **Bare or Blunt:** not available (greyed, with the reason). |
| 14 | **Throw** | weapon | Throw the weapon at a target in throwing range (Dexterity to hit). On a hit it stays in the target: it falls when the target does, or **Pull Out** from next to it brings it back. On a miss it lands on the target's tile. | **Thrown:** no penalty and full damage. Without Thrown: −2 to hit, ×0.7. **Heavy:** the target makes a Body save or is knocked Prone. |
| 28 | **Pull Out** † | 1 | Next to an enemy with a thrown weapon stuck in it: wrench it out. The weapon comes back into your hand, the target takes half the weapon's damage and is Bleeding. No roll. It costs no Momentum. Everyone knows it. | |

**Links**

| # | Technique | AP | What it does | With the right weapon |
|---|---|---|---|---|
| 15 | **Sidestep** | 1 | Move 1 tile to another tile next to the same enemy. No opportunity attack. Your next Strike against it this turn ignores a carried shield and counts as flanking. | **Light:** 2 tiles. |
| 16 | **Guard** | 1 | +2 Defense against melee until your next turn, and your Momentum doesn't drop when you are hit. With Durability you also gain Guard points (Guard, rule 2). | **Reach:** enemies must make a Body save to step next to you. **Heavy:** the +2 also applies to ranged attacks from the front. |
| 17 | **Shove** | 1 | Push an enemy next to you 1 tile, or knock it Prone if it can't move back. | **Blunt or Heavy:** 2 tiles. **Reach:** from 2 tiles away. |
| 18 | **Trip** | 1 | The target makes a Body save or falls Prone. | **Hook or Reach:** the save is at −2. **Bare:** you may go Prone with it and it is Grappled. |
| 19 | **Drag** | 1 | Pull an adjacent or reached target 1 tile toward you, or swap tiles with it (Body save). | **Hook:** you pull from 2 tiles away (3 with Reach), up to 2 tiles. **Bare:** you may move 1 tile and bring it with you. |

**Finishers**

| # | Technique | AP | What it does | With the right weapon |
|---|---|---|---|---|
| 20 | **Coup** | weapon | Needs Momentum 2. One strike at +25% damage per Momentum spent. (This is the Fighter's Finisher, opened to everyone; see section 6.) | **Edge:** +50% more against a target that is Bleeding, Dazed, Prone or Downed. **Point:** a hit is a critical if the target is at a quarter HP or less. |
| 21 | **Cleave** † | weapon | Needs Momentum 2. One strike; then the same strike at one more adjacent enemy per Momentum spent, each at full damage. | **Heavy:** the extra targets may be 2 tiles apart. **Edge:** every target hit bleeds. |
| 22 | **Break** | weapon | Needs Momentum 2. One strike. The target makes a Body save at −1 per Momentum spent or is Stunned (bosses: Dazed). | **Blunt:** its armour is also 0 for a round. **Hook:** it is Disarmed as well. |
| 23 | **Run Through** † | weapon | Needs Momentum 2. One strike at +20% per Momentum spent. On a hit the target is Pinned where it stands until it spends 2 AP to pull free. | **Point:** ignores armour, and if a second enemy stands directly behind the first it is struck at half. **Reach:** you may leave the weapon in (you are unarmed; the target stays Pinned until anyone next to it pulls it out for 2 AP; you, or anyone not on its side, take it into a free hand). Without Point: −2 to hit. |
| 24 | **Throw Down** † | weapon | Needs Momentum 2. Only on a target you have Grappled or Bound: slam it into a tile next to you. Damage ×1 + 25% per Momentum, Prone, and the grapple ends. Anyone on that tile is struck at half and must save or fall Prone. | **Bare:** no roll needed. **Heavy:** you may throw it 2 tiles. |

**Answers**

| # | Technique | AP | What it does | With the right weapon |
|---|---|---|---|---|
| 25 | **Parry** | reaction | *When a melee attack hits you:* Roll your attack skill against the attacker's total. If you win, the hit is halved. A shield in the off hand adds +2. | **Light:** and you gain 1 Momentum. **Heavy:** you may parry for an adjacent ally. |
| 26 | **Riposte** | reaction | *When a melee attack misses you:* Strike back for 0 AP. | **Edge or Point:** +2 to hit. |
| 27 | **Keep Back** | reaction | *When an enemy steps into your reach:* Strike it first. If you hit, it makes a Body save or stops where it is. | **Reach:** your reach is 2 tiles, so most enemies never arrive. **Hook:** on a failed save it is also Prone. |

**The shield's techniques, and Interpose (rules 1.13)**

A shield (an off-hand item with the **Shield** property: the buckler and the riot shield; a pavise is carried, not held up) has its own techniques. They are the off hand's while it holds the shield, whatever the main hand holds (a melee weapon, a gun, or nothing), and they are never learned, readied or picked: the shield brings them. A shield-bearer has the Momentum meter. The strike is the bare hand behind the shield. They are not counted in the 27.

| # | Technique | Cost | What it does | With the right weapon |
|---|---|---|---|---|
| 29 | **Shield Bash** (Strike) | 2 AP, 1 Guard | Strike with the shield: bare-hand damage ×1.5, hitting with Raw Power. It costs 1 Guard in place of the Strike's 1 Momentum. On a hit you gain 1 Momentum, and the target makes a Body save or is pushed 1 tile. | Shield only. |
| 30 | **Raise Shield** (Link) | 1 AP | Turn Momentum into Guard, 1 for 1, as much as you choose up to your pool (all of it unless you say less). Until your next turn, ranged attacks from the front are at −2 to hit you. Once a turn. | Shield only. |
| 31 | **Shield Wall** (Answer) | reaction, 1 Guard | *When an ally next to you is the target of a ranged attack:* your ally counts as behind half cover against it (−5, unless they already have cover facing the shot or the attack ignores cover). A burst or a volley is one attack: every round of it is walled. | Shield only. |
| 32 | **Interpose** (Answer) | reaction, 1 Guard | *When an ally next to you is hit by an attack:* you take the hit instead (Guard, rule 7). | Durability 3, any weapon or none. |

"The front" is as for Guard: the way you faced when you raised the shield, toward the tile you named or else the nearest enemy, three of the eight directions. Shield Bash is a Strike of your melee chain (it can't follow a Finisher, and an Opener can't follow it). Protective reactions that always work, Suppressed or not: Parry, Shield Wall, Interpose.

#### The ranged techniques (31)

**Fire**

| # | Technique | AP | Rounds | What it does | With the right weapon |
|---|---|---|---|---|---|
| 0 | **Shot** (free) | 2 | 1 | One shot. Everyone knows it; it takes no ready slot. | **Precise:** +1 if you haven't moved this turn. **Loud:** a miss gives +1 Pressure. |
| 1 | **Snap Shot** | 2 | 1 | Draw or swap to this weapon and fire, at −2. | **Quick:** no penalty. **Heavy:** not available. |
| 2 | **Burst** | 3 | 3 | Two rolls at one target, the second at −2. | **Auto:** three rolls, and it may split between two adjacent targets. **Quick:** no −2. |
| 3 | **Aimed Shot** (free) | 3 | 1 | +2 to hit. | **Precise:** +3, and a critical on 18–20 if you haven't moved. **Drawn:** full draw, +25% damage. |
| 4 | **Called Shot** | 3 | 1 | −2 to hit. Choose leg (Slowed), arm (weapon lowered) or head (Dazed); the target makes a Body save. | **Precise:** no penalty. **Loud or Heavy:** leg is Prone instead. **Spread:** only within 4 tiles. |
| 5 | **Walking Fire** | 3 | 1 | Move 2 tiles and fire one shot at any point of the move. | **Quick:** 3 tiles, and no opportunity attacks. **Auto:** the shot is a Burst for 3 rounds. **Heavy:** not available. |
| 6 | **Punch Through** | 3 | 1 | Half cover counts −2, not −5, and the cover takes the damage as well. | **Heavy:** the round carries on to the next target in line at half. **Blast or Spread:** half cover is destroyed. |
| 7 | **Lob** † | 3 | 1 | Fire at a target only an ally can see (through smoke or dark), at −4. | **Arc:** over full cover, at −2. **Blast:** you aim at the tile; no penalty, and everyone in the radius gains +2 Pressure. |
| 31 | **Heavy Bolt** | 4 | 1 | One bolt at +50% damage that ignores 10 armour. On a hit the target saves (Body) or is pushed 1 tile. | **Precise:** +2 to hit. **Quick:** 1 AP less. |

**Press**

| # | Technique | AP | Rounds | What it does | With the right weapon |
|---|---|---|---|---|---|
| 8 | **Suppress** | 3 | 3 | One roll at +2. A hit is half damage and +2 Pressure; a miss is +1. | **Auto:** enemies within 1 tile of the target also gain +1. **Heavy, Braced:** it holds until your next turn: any enemy that moves or fires inside 3 tiles of the target gains +1 Pressure. **Silent:** hits only. |
| 9 | **Rake** † | 4 | 6 | Up to 3 targets within 2 tiles of each other, each at −3; +1 Pressure on a hit. | **Auto:** a full-auto cone for 10 rounds (one roll at −2 against every enemy near the line); +1 Pressure hit or miss. **Spread:** the cone is 1 wider. |
| 10 | **Warning Shot** | 1 | 1 | No attack. The target makes a Heart save or gains +1 Pressure. | **Loud:** the save is at −2. **Silent:** not available. |
| 11 | **Flush** | 3 | 1 | Hit the target's cover (no roll; the cover takes the damage). The target gains +2 Pressure. | **Spread or Blast:** double damage to the cover. **Arc:** the cover is ignored and the target takes half damage as well. |
| 12 | **Mag Dump** † | 4 | all | Empty the weapon at one target: one roll per 3 rounds left (at most 4 rolls), each at −1 more than the last. +1 Pressure per hit. Heat goes to one under the limit. | **Auto:** +1 Pressure per roll, hit or miss. **Quick and Precise:** no growing penalty. **Spread:** both barrels, one roll at double damage within 4 tiles. **Drawn:** not available. |
| 13 | **Crossfire** | 2 | 1 | A shot at a target an ally has already hit this round: +2 to hit and +1 extra Pressure. | **Quick:** step 1 tile first, with no opportunity attack. |

**Sets**

| # | Technique | AP | Rounds | What it does | With the right weapon |
|---|---|---|---|---|---|
| 14 | **Bead** | 1 | 0 | Name a target. Until you move or name another, your shots at it ignore one range band, and its Pressure doesn't fall while you see it. | **Precise:** +1 to hit it. **Heavy:** you may move 1 tile without losing it. |
| 15 | **Spot** | 1 | 0 | Name a target for the squad: until your next turn allies have +1 to hit it, and the first ally to hit it adds +1 Pressure more. | **Precise:** allies also ignore one range band. **Silent:** the target isn't told. |
| 16 | **Brace** | 1 | 0 | Rest the weapon on half cover (a weapon with a bipod braces anywhere): Recoil halved until you move. | **Heavy:** removes its penalties. **Auto:** Suppress gives +1 more. |
| 17 | **Load Special** | 1 | 0 | Chamber one special round you carry (armour-piercing, hollow-point, incendiary, enhanced) for your next Fire. The magazine stays as it is. | **Drawn:** not needed (any arrow, every shot). **Spread:** the whole cone gets the round's rider. |
| 18 | **Shift** | 1 | 0 | Move 1 tile from cover to cover without setting off a Watch. | **Quick:** 2 tiles. **Heavy:** you stay Braced. |
| 19 | **Vent** | 1 | 0 | −2 Heat now. | **Heavy:** −4 (a barrel swap). **Drawn:** not needed. |
| 20 | **Head Down** | 1 | 0 | Remove 1 Pressure from yourself, 2 behind full cover. You can't Watch this round. | — |

**Takes**

| # | Technique | AP | Rounds | What it does | With the right weapon |
|---|---|---|---|---|---|
| 21 | **Dead Centre** † | 3 | 1 | One shot at +50% damage. *Suppressed:* Its cover doesn't count. | **Precise:** +2 to hit. **Drawn:** ignores 5 armour. |
| 22 | **Pin Down** | 3 | 1 | A shot at ×0.7. On a hit the target saves (Guts or Athletics, whichever is better) or is Pinned for 1 round. *Suppressed:* The save is at −2. | **Auto:** full damage. **Drawn or Silent:** nailed in place until it spends 2 AP. |
| 23 | **Rout** | 3 | 1 | No damage. The target makes a Heart save or runs its full move away from you, drawing opportunity attacks and Watches. *Suppressed:* The save is at −3. | **Loud:** −2 more. **Blast:** everyone Pressed in the radius. |
| 24 | **Stopping Shot** | 2 | 1 | A shot. On a hit the target saves (Guts or Athletics, whichever is better) or loses 1 AP next turn and is pushed 1 tile. *Suppressed:* It also falls Prone on a failed save. | **Loud or Heavy:** pushed 2. **Spread:** pushed 2 and Prone either way. |
| 25 | **Storm** | 3 | 1 | Move up to 3 tiles toward the target without its reaction, then shoot. *Suppressed:* Your shot is a critical on 18–20. | **Quick:** +2 to hit. **Spread:** Body save or Prone. |
| 26 | **Last Round** | 2 | 1 | Only with the last round in the weapon: +3 to hit. If it takes the target out, your next speed reload is free. *Suppressed:* It can't be reduced by cover. | **Quick and Precise:** +50% damage. **Drawn:** the last arrow in the quiver counts. |

**Hold a shot**

| # | Technique | AP | Rounds | What it does | With the right weapon |
|---|---|---|---|---|---|
| 27 | **Overwatch** (free) | weapon | 1 | *When the first enemy to move in your sight:* the held shot | **Precise:** +2. **Auto:** it is a Burst. **Spread:** anyone coming within 4 tiles. |
| 28 | **Deny** | 2 | 1 | *When the first enemy to enter a tile you name:* the shot; on a hit it stops there | **Heavy, Braced:** any tile in a straight line of 3. **Blast:** the tile takes the blast. |
| 29 | **Cover Me** | 2 | 1 | *When the first enemy to attack an ally you name:* that attack is at −2, and the enemy gains +1 Pressure | **Auto:** two allies. **Precise:** you also take the shot. |
| 30 | **Dead to Rights** | 3 | 1 | *When a Pressed enemy you name attacks, stands up, reloads or leaves cover:* the shot lands first, at +2 | **Precise:** a critical on 18–20. **Silent:** you stay Hidden. |

#### The weapons

Melee:

| Weapon | Properties | Hits with | Damage scales with | Teaches |
|---|---|---|---|---|
| Combat knife | Light, Edge, Point, Thrown | Dexterity | Agility | Coup |
| Sabre | Light, Edge | Dexterity | Agility | Riposte |
| Ork machete | Heavy, Edge | Raw Power | Strength | Cleave |
| Maul | Heavy, Blunt | Raw Power | Strength | Break |
| Lance | Heavy, Point, Reach | Raw Power | Strength | Charge |
| Gloves or bare fists | Light, Bare | Raw Power | Strength, Raw Power, Dexterity | Bind |
| Throwing knives | Light, Point, Thrown | Dexterity | Agility | Flurry |
| Hatchet | Light, Edge, Hook, Thrown | Dexterity | Agility | Throw |
| Legion gladius | Light, Point, Edge | Dexterity | Agility | Parry |
| Kemizuchi duelling blade | Light, Point | Dexterity | Agility | Lunge |
| War axe | Heavy, Edge, Hook | Raw Power | Strength | Sunder |
| Adamantile greatsword | Heavy, Edge, Point | Raw Power | Strength | Sweep |
| Glaive | Heavy, Edge, Hook, Reach | Raw Power | Strength | Keep Back |
| Ork rip-saw | Heavy, Edge | Raw Power | Strength | Hamstring |
| Knuckledusters | Light, Bare, Blunt | Raw Power | Strength, Raw Power, Dexterity | Bash |
| Hellraiser servo-fist | Heavy, Bare, Blunt | Raw Power | Strength, Raw Power, Dexterity | Throw Down |
| Evoker blade | Light, Edge | Dexterity | Agility | — |
| Emanator gauntlet | Light, Bare, Blunt | Raw Power | Strength, Raw Power, Dexterity | — |
| Bot-thread banner | Reach, Blunt | Dexterity | Agility | — |
| Grand staff | Heavy, Blunt, Reach | Dexterity | Agility | — |
| Bite and claws | Light, Bare, Edge | Raw Power | Strength, Raw Power, Dexterity | — |

Ranged:

| Weapon | Properties | Hits with | Damage scales with | Teaches |
|---|---|---|---|---|
| Service pistol (.32 Decrkm) | Quick | Dexterity | Agility | Snap Shot |
| Drifter revolver | Quick, Precise | Dexterity | Agility | Mag Dump |
| Decrkm SMG (.32 Decrkm) | Quick, Auto | Dexterity | Agility | Rake |
| Hellraiser service rifle | Auto, Precise | Dexterity | Agility | Suppress |
| Lever carbine | Precise, Quick | Dexterity | Agility | Walking Fire |
| Lumeri scattergun | Spread, Loud | Dexterity | Agility | Flush |
| Long rifle | Precise, Loud | Dexterity | Agility | Bead |
| .700 Blackpoint anti-materiel | Heavy, Precise, Loud | Dexterity | Agility | Dead Centre |
| Hellraiser LMG | Heavy, Auto | Dexterity | Agility | Brace |
| Recurve bow | Drawn, Silent, Quick | Dexterity | Agility | Pin Down |
| Crossbow | Precise, Silent | Dexterity | Agility | Heavy Bolt |
| Frag grenade | Thrown, Blast, Arc | Dexterity | Agility | Rout |
| Smoke grenade | Thrown, Blast, Arc | Dexterity | Agility | Head Down |
| Flashbang | Thrown, Blast, Arc | Dexterity | Agility | — |
| Decrkm auto-pistol | Quick, Auto | Dexterity | Agility | Burst |
| Parlour pistol | Quick, Silent | Dexterity | Agility | Crossfire |
| Magistrate heavy pistol | Quick, Loud | Dexterity | Agility | Stopping Shot |
| Frontier hand cannon | Loud, Precise | Dexterity | Agility | Last Round |
| Legion PDW | Quick, Auto | Dexterity | Agility | Storm |
| Whisper SMG | Auto, Silent | Dexterity | Agility | Spot |
| Mandestra drum-gun | Auto, Loud | Dexterity | Agility | Rake |
| Adamantile battle rifle | Precise, Loud | Dexterity | Agility | Punch Through |
| CCEC marksman rifle | Precise | Dexterity | Agility | Called Shot |
| Legion bullpup | Auto, Quick | Dexterity | Agility | Shift |
| Coach gun | Spread, Loud | Dexterity | Agility | Mag Dump |
| Sawn-off | Spread, Quick | Dexterity | Agility | Storm |
| Brigade auto-shotgun | Spread, Auto | Dexterity | Agility | Burst |
| Hellraiser rotary | Heavy, Auto, Loud | Dexterity | Agility | Suppress |
| Smetanita thumper | Heavy, Blast, Arc | Dexterity | Agility | Lob |
| Breacher tube | Heavy, Blast, Loud | Dexterity | Agility | Flush |
| Purifier flamer | Heavy, Spread | Dexterity | Agility | — |
| Satchel charge | Thrown, Blast, Arc | Dexterity | Agility | — |
| Longbow | Drawn, Silent, Arc | Dexterity | Agility | Dead to Rights |
| Repeating crossbow | Silent, Quick | Dexterity | Agility | Burst |
| Incendiary grenade | Thrown, Blast, Arc | Dexterity | Agility | — |
| Bot-scrambler | Thrown, Blast, Arc | Dexterity | Agility | — |
| Science Team core rifle | Precise | Dexterity | Agility | — |
| Spellslinger's pistol | Quick | Dexterity | Agility | — |
| Lumeri censer gun | Spread, Loud | Dexterity | Agility | — |

### Calls (rules 1.13, Skeleton 2.0)

Design: `docs/design/proposals/2026-11-nine-doors.md`, sections 10, 15.7 and 17.3. Data: `data/calls.json`. Engine: `packages/engine/src/calls/`. A **Call** is what a gamma skill does in a fight: something you say to one unit that can hear you. Each of the nine gamma skills has exactly one, and every Call obeys the same ladder, so none outgrows the others. Everything that gives or takes AP inside a turn by speech is a Call. **Every number in this section is provisional** (section 14, items 958 on).

#### The ladder

By the speaker's points in the Call's skill:

| Points | What every Call gains |
|---|---|
| 1 | usable: 2 AP, heard within 5 tiles |
| each point | +1 tile of voice (5 at 1 point, 14 at 10) |
| 3 | effect step 2 |
| 5 | costs 1 AP |
| 7 | effect step 3 |
| 9 | may also be made as a reaction, once a round |
| 10 | your first Call each turn costs 0 AP |

- **As many Calls a turn as your AP pays for.**
- **One helping Call and one hindering Call on a unit each round**, whoever makes them. A helping Call is aimed at an ally (Name It also at yourself); a hindering Call at an enemy.
- **A Call deals no damage.**
- **A hindering Call's save** is against **12 + the speaker's strength with that skill** (points − 1, floor 0; not halved, and never the full-points number a gamma adds to checks). Threaten and Taunt are Heart saves; Spot has no save. A Call on an ally just works.
- **Hearing, not sight:** the target must be within the voice's range; no line of sight is needed. A Hidden enemy your side doesn't see can't be Called at (Spot from 3 points is the exception, below).
- **Silenced:** a Silenced unit can't Call. **Stunned:** a Stunned ally can't be Ordered or Cued. **Suppressed:** a Suppressed ally has no reaction, so it can't be Ordered and gets nothing from Cue (the Call is refused, nothing spent).
- **AP a Call gives** lands **this turn** when the ally has not acted yet this round (at once on their own turn; otherwise at the start of their turn, up to the turn's 9) and **on their next turn** when they have. Every AP a Call gives counts in the +3 of AP a unit may gain in one turn.
- **As a reaction (9 points):** the speaker's player makes the Call while it is another unit's turn. It spends the speaker's reaction and no AP, once a round. On your own turn a Call is an action.
- **What a Call leaves standing** (Spot, Warn, Cue) lasts until the start of the speaker's next turn, and is used up only by the real event (a real attack, a real reaction), never by a card or a preview.
- Companions, puppets and units with a fixed action list never Call.

#### The nine Calls

| Call | Skill | On | Step 1 (1 point) | Step 2 (3 points) | Step 3 (7 points) |
|---|---|---|---|---|---|
| **Order** | Authority | ally | They reload, stand up or pick up, now | or move their Movement (the tiles 1 AP walks them) | two different things of those |
| **Rally** | Charisma | ally | They gain 1 AP | 1 AP, and they shed 1 Pressure | 2 AP, and they shed 1 Pressure |
| **Brief** | Eloquence | ally | Their next action costs 1 AP less | their next two actions cost 1 AP less each | their next action costs 2 AP less, the one after 1 less |
| **Name It** | Lore Master | ally or self | +2 on all their saves until your next turn | +3, and a fresh save now against one condition on them | +4, the fresh save, and Shaken and Afraid end |
| **Cue** | Reaction Speed | ally | One more reaction | or a step of 1 tile now, on that reaction | and they act straight after you in the order |
| **Spot** | Vigilance | enemy (no save) | The next ally to attack it ignores its cover | and it isn't Hidden to them | the next two allies, at +1 to hit |
| **Warn** | Senses | ally | They step 1 tile before the next attack on them | up to 2 tiles | and that attack is at −2 to hit |
| **Threaten** | Intimidation | enemy (Heart save) | Shaken, and −1 AP on its next turn | and it can't move toward you on that turn | −2 AP |
| **Taunt** | Insinuation | enemy (Heart save) | Taunted: its next attack must go at you | and that attack costs it 1 AP more | 2 AP more |

How each is run:

- **Order.** The speaker chooses what (`reload`, `stand`, `pickup`, `move`) and, for a move, the tile. The ally does it at once, on their reaction (it is spent) and for none of their AP. Pick up takes everything in the pile under them, or the first pile next to them. An ordered move is a real move: it can draw opportunity attacks and held shots. **An Order never makes an ally attack** (the Mastered perk On My Mark keeps that, and is unchanged).
- **Rally.** The AP rule above. From 7 points it gives 2 AP for 1: the first number to watch in play.
- **Brief.** The discount holds until the end of the ally's next turn. An action that costs nothing doesn't use it up; an action that costs less than the discount uses it up all the same. What it saves counts in the turn's +3 of gained AP.
- **Name It.** You call out what the thing is, so it can't get into their head. The one you call to adds the Call's number (+2, +3, +4) to every save they roll until the start of your next turn. From step 2 they also roll a fresh save at once against one condition on them that allows a save. At step 3 Shaken and Afraid end on them outright (the fresh save goes to another condition). *(Leon, 10 Nov 2026. The first Name It cancelled AP the ally would lose next turn: 1 / 2 / all of it; replaced.)*
- **Cue.** The extra reaction is used after the ally's own, and lasts until the start of the speaker's next turn. From step 2 the speaker may name a free tile next to the ally in place of the stored reaction: the ally steps there at once, free and with no opportunity attack. At step 3, an ally who has not acted yet this round acts straight after the speaker; the order is put back when the round ends.
- **Spot.** The mark is used by allies only, never by the speaker; one attack action per ally (a burst is one attack). From step 2 a Spotted unit that is or becomes Hidden shows to the speaker's side and can be attacked by the allies still to use the mark, and the speaker may Spot a Hidden enemy whose tile they can see.
- **Warn.** When the next weapon attack on the ally is made, they step first: to the tile the speaker named with the Call, if it is still within reach, or else to the nearest tile that takes them out of that attack. If no tile within reach does, they stay. The step is free and draws no opportunity attack. An attack that can no longer reach them is wasted: its AP is spent and nothing is rolled.
- **Threaten.** On a failed save: Shaken (3 rounds), and the AP comes off its next turn as a penalty (so the turn's floor of 2 holds). From step 2 it can't move toward the speaker on that turn. `combat/parley` with `threaten` is the same effect on the old Talk action (2 AP, 8 tiles), at the speaker's step, and counts as the target's hindering Call of the round.
- **Taunt.** On a failed save: Taunted (1 round), as the condition has always worked (weapon attacks only). The extra AP is on its first attack at the speaker.

**Persuade and the offer of terms** stay as ways to talk an enemy down (Eloquence and Charisma, the Talk action at 2 AP within 8 tiles). They are not Calls and are outside the one-a-round limits.

#### Enemies

An enemy has no skill points. A tier lists the Calls it has and one level that stands in for the points (enemies.json `calls`, `call_level`): a minion and a soldier none; an **elite** Threaten and Rally at level 3 (2 AP, 7 tiles, step 2); a **boss** Threaten, Taunt and Rally at level 5 (1 AP, 9 tiles, step 2). The save against an enemy's Call uses its tier's strength (12 + 2 for an elite or a boss), as every enemy condition does. An enemy makes **one Call a turn at most**, only while another of its side still stands, and only where the Call is worth more to it than a plain attack: it Threatens a fighter who is above half HP and not yet Shaken, Rallies one of its own who is Pressed, and a boss Taunts a fighter off a wounded ally. Reading an enemy's intent shows it ("means to call Threaten at …").

## Conditions and saves

**Debuffs come in three families,** Body, Brain and Heart. Whoever receives one rolls a **save** for its family: Body saves with **Guts**, Brain with **Rumination**, Heart with **Composure** (rules 1.13; the Brain save was Charisma). Whoever inflicts one adds their **strength with the skill that delivered it**: the modifier of that skill, never below 0. A technique reads the skill its weapon hits with, a Sigil Brain Power, an Outburst Will Power, a Blessing Faith, a Call or a spoken condition the gamma that spoke, a trap or a poison Ingenuity, a companion its handler's Empathy. There is no single Body, Brain or Heart strength any more.

**The save.** d20 + your save bonus for the family, against 12 + the attacker's strength with the skill that delivered it (a technique's own save uses half of it, rounded up: see Physical techniques). Succeed and the condition doesn't land. Conditions that come from a hit (Bleeding from an injury, Burning from incendiary rounds) don't allow a save.

**Stacking.** The same condition never stacks; a second application resets it to the longer duration.

**When conditions tick** (rules 1.3, provisional, item 82). A duration in rounds counts the ends of the bearer's own turns: a 2-round condition lasts until the end of your second turn after it lands. One that lands during your own turn doesn't lose a round at that turn's end. Damage over time (Bleeding, Burning) still bites at the start of your turn. Every condition remembers who put it on you (its **source**): Fear, Taunted, Grappled and Marked depend on it, and kill credit for Bleeding and Burning goes to it.

| Condition | Family | Effect | Lasts |
|---|---|---|---|
| Bleeding | Body | 5 damage at the start of each turn; a stim ends it | 3 rounds |
| Burning | Body | 10 damage at the start of each turn | until someone spends 1 AP to put it out |
| Weakened | Body | −25% damage dealt | 2 rounds |
| Slowed | Body | half Movement | 2 rounds |
| Silenced | Brain | no Sigils, Outbursts or prayers (rules 1.2, provisional) | 1 round |
| Nausea | Body | −1 AP | 2 rounds |
| Pinned | Body | can't move; −2 to hit | until the end of your next turn |
| Stunned | Body | lose your next turn | 1 turn |
| Dazed | Body | −2 AP on your next turn | 1 turn |
| Blinded | Body | −4 to hit; you see only adjacent tiles | 1 round |
| Prone | Body | melee against you +2, ranged against you −2; 1 AP to stand | until you stand |
| Left Brain Debuff | Brain | −2 on Mind skill checks; Sigils cost +1 AP | 2 rounds |
| Right Brain Debuff | Brain | −2 on Expression and Soul checks; Soul spells cost +20% mana | 2 rounds |
| Confused | Brain | each attack has a 50% chance to go at someone at random (anyone else it could attack) | 1 round |
| Fear | Heart | can't move toward or attack the source; −2 to hit anyone else | 2 rounds |
| Shaken | Heart | −2 on Heart saves and social checks | 3 rounds, or the rest of the scene out of combat |
| Grappled | Body | held by an adjacent enemy: you can't move; −2 to attacks against anyone but the grappler. Break free: 2 AP, d20 + the better of your Raw Power and Athletics modifiers against the grappler's | until you break free, or the grappler is down or not adjacent |
| Suppressed | Body | −1 AP and no reactions (lighter than Pinned; item 83) | 1 round |
| Taunted | Heart | your attacks must go at the one who taunted you while you can see them | 1 round, or until you attack them |
| Commanded | Heart | you obey one short order on your next turn. Against an enemy the engine runs the order from a menu: halt, hold (no attacks), drop (Disarmed), kneel (prone), flee; anything else goes to the Narrator | 1 round |
| Puppeted | Brain | the caster's player runs your next turn (your AP); you can't be made to harm yourself | 1 round |
| Disarmed | Heart | your weapon is down: you strike with your fists until you recover it (2 AP) or draw another (rules 1.9, item 687: the downed one stays in the pile). **Weapon lowered** is the light version: 1 AP to raise it | until recovered |
| Augment Offline | Body | one augment, prosthetic or implant gives nothing and its actions are unavailable | until repaired |
| Corroded | Body | 5 damage at the start of each turn; Defense −2. Set by ACID with no save to land it; a Body save at the end of each of your turns ends it early (rules 1.4, provisional) | 3 rounds |

**Helpful states**

| State | Effect |
|---|---|
| Hidden | enemies can't target you until they spot you; your first attack from Hidden uses the Ambush multiplier, then you're revealed (see Hidden in a fight) |
| Marked | the marker's squad gets +1 to hit you, and you can't become Hidden; lasts until its source rule ends it or the fight ends |
| Braced / Emplaced | set by class moves and heavy weapons; ends when you move. Emplaced: +2 to attacks with the weapon and Recoil halved |
| Withdrawing | +2 Defense until the end of your next turn (a fighting retreat) |
| Overwatch | AP held for one reaction shot before your next turn |
| Witnessed | your patron is watching until the fight ends or it intervenes (see Patrons and prayer) |
| Quickened | +2 AP on your next turn, within the ceiling of 9; at most once a round; never self-cast (QUICKEN, rules 1.4, provisional) |
| Sharpened | your next attack: +3 to hit and ×1.25 damage; lasts until that attack or the end of your next turn (SHARPEN, rules 1.4, provisional) |

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

**On screen** (Leon, 9 Nov 2026; decision 110): the meter is a **mana forecast**, its own movable panel on the combat screen (above the map by default; drag it under the map or into the action column; under the map on narrow windows), read like the weather: the band and the number on a gauge of the four bands, the trend this round and last, the outlook to the next band up and down (in deaths and Crystallises), what this air does to magic and what moves it. It left the header. Every number comes from the tables above.

**Mana cores** are bot clusters. A standard core holds 10 charge (small 5, heavy 20) and costs 150 credits. One standard core also makes 10 enhanced rounds.

> **Rules revision 1.2 (accepted 6 Nov 2026, with Leon's answers: Line range by length; charge paid on drawing and more on firing; enemy Sigil users Evoke your patterns).** It replaces the 1.1 Sigil and Soul rules: Sigils are written onto the map (Leon), and every Soul mage charges and releases. Every new number is provisional (items 68–76). **Its Sigil part is replaced by rules revision 1.4** (below); its Soul part is replaced by **rules revision 1.5** (Outburst 2.0, below).

> **Rules revision 1.4: Sigil magic (accepted 7 Nov 2026, with Leon's answers; decision 98).** It replaces the 1.2 Sigil rules: 40 words in five groups, the Line as the only shape, glyphs drawn only on your own tile, Reach words for range and the facing rule for aim. The mana meter, cores, Flux and the Evoker are unchanged; Soul magic is now rules revision 1.5 (Outburst 2.0, below). Every new number is provisional (items 415–491). The design is in `docs/design/sigil-1.4-proposal.md`; what it changes in classes, perks and traits is in `docs/design/sigil-1.4-impact.md`.

> **Rules revision 1.10: Sigil 1.5, strokes (accepted direction, Leon, 9 Nov 2026; design `docs/design/sigil-1.5-spec.md`).** A Line is what you drew as one: every glyph records its **stroke**, and glyphs of other strokes no longer join, poison or block a Line (Drawing, rule 3). Lines stay 2 to 4 glyphs for everyone (Leon, 9 Nov 2026: no Lines of 5). The facing rule, Evoking and fizzling are unchanged. **Study** (every Evoke and Mastery level builds toward guaranteed new words; glyphs can be read and copied) and **word mastery** (use counts and inflections) are in The Magic panel and learning, with **sigil marks** (words drawn into the world, copied with Investigate); **Junctions** (Brain Power Mastered: one glyph in two strokes, a crossing) are Drawing rule 3.11. Every new number and reading is provisional (items 901 on).

### The Magic panel and learning

Magic has its own tab on the character sheet, **MAGIC**. It lists the Sigil words you know and your Outburst designs, and it is where you learn new ones and make designs. It shows for any character with Brain Power 1+, Will Power 1+, an Evoker or an Emanator.

- **Starting magic.** A character with Brain Power 1+ picks **2 Sigil words** at creation. Together they must make a spell (one Subject and one other word), and **one of them must be a Reach word** (Leon, rules 1.4): SPARK · SEEK (the default), FIRE · ARC, MEND · RELAY, BIND · SEEK. A new caster can always hit something more than one tile away. A character with Will Power 1+ makes **1 Outburst design** from one school and one module. A character with both gets both.
- **Learning Sigil words is study.** Each new word takes one long rest with a source: a tutor the Narrator places, a **Sigil plate** (loot: a slate with one word cut into it, used up), or an ally who knows the word. You know at most **4 + Brain Power** words, out of 40, so every Sigil user is a specialist.
- **Rules revision 1.10 (Sigil 1.5): study guarantees new words.** You still know at most **4 + Brain Power** words. Every number here is provisional (items 906 on).
  1. **Study.** Every Evoke earns study: **1**, **+1 per glyph past 2**, **+1 if it struck an enemy** (a 2-glyph miss earns 1, a 4-glyph hit 4). An Evoke that fizzles earns nothing.
  2. **Thresholds.** At **6** study you may learn a word of your choice, then at every **8** more (6, 14, 22, 30…). The choice is any of the 40 words you don't know, within your cap; words you copied are listed first. Learn out of combat (`sigil/learn`). A pick you can't use yet (no slot free) is **banked** until a slot frees up (Brain Power rises).
  3. **Copying in a fight.** **Read** (the Analyze action, the same AP and range, line of sight) a glyph on the map or the **trace** of a scuffed glyph that holds a word you don't know: **+2 study**, and the word joins your **known-to-study** list. Analyzing an enemy also reads the glyphs it has drawn within your Analyze range. A scuffed glyph leaves its trace for **2 rounds**. Each glyph (and its trace) copies once per character; copying never teaches a word outright (only a critical Investigate or a Narrator grant does).
  4. **Copying on the map: sigil marks.** Words drawn into the world long ago (carved on doors and ruins, on Keystones and warding posts, old Sigil plates fixed to walls) are points of interest (`sigil_mark`, with its `word`, its `age` and its `damage`). Each has an **Investigate** approach (2 AP, standing on or next to it): **Analysis or Rumination** (the better one), the TN by age and damage (fresh and intact 8, up to ancient and broken 20; item 921). **Success:** +3 study and the word joins your known-to-study list. **A critical** (a natural 20) teaches it outright, if you have a slot free; with none free it counts as a success and the log says so. **Failure:** nothing learned, and the try is spent (each character investigates each mark once). A word you already know can't be investigated (item 922). The Narrator places marks with `objects[]`; the M813 campaign has three.
  5. **Mastery study.** Each Mastery level (3/5/7/9 points) in **Brain Power, Rumination or Eloquence** gives **+5 study**, once. **Mastered** (10) in one of them gives **one free word** that ignores the cap, once per skill.
  6. **Bonus sources** stay as before: a tutor, a Sigil plate, an ally who knows the word, or a Narrator grant, **one new thing a scene** from those. A Narrator grant that comes when the scene's new thing is spent, or with no slot free, isn't lost: the word joins your known-to-study list.
- **Rules revision 1.10: word mastery.** Every word you know has a **use count**: each Evoke that includes it adds 1 (a word twice in one spell still adds 1). At **10** uses the word is **Practised** (a star on its chip); at **30** it is a **Mastered word** (a filled star) and its **inflection** is always on for you: one small upgrade of that word (about 10%, or +1 of something; never a new shape). The 40 inflections are in sigils.json (`inflection`), all provisional (item 916). Your inflections apply to the spells you Evoke, including words an ally drew, and to the fields, traps and turrets those spells leave. An inflection the engine doesn't run falls back to the Narrator with its text.
- **Learning Outbursts is living.** New schools and modules come from tutors, and from experience: after a moment that shakes a character (a death, a vow, a betrayal), the Narrator may grant one module that fits it, like an Achieved perk. Designs are made out of combat; you keep 2 + floor(Empathy ÷ 2) ready.

### Sigil magic: commands written on the map (Mind, through an Evoker)

Sigils are **commands to the bots in the air**. Each glyph is one command word drawn onto a tile; a spell is the sentence a row of glyphs makes. The words are in sigils.json. Every word works by the general rules below; no word needs a rule of its own.

#### 1. The words

Every word answers one question:

| Group | Question | Words |
|---|---|---|
| **Subjects** | What happens to the target? | 25 in four kinds: **Elements** (damage), **Afflictions** (debuffs and control), **Boons** (support), **Workings** (the world) |
| **Reach** | Where may I pick the target? | 4: SEEK, ARC, SENSE, RELAY |
| **Delivery** | What flies out, how does it act, what happens after, what stays? | 7: STAY, TWICE, PULL, WAIT, WATCH, CHAIN, LEECH |
| **Burst** | What does it cover where it lands? | 3: CONDENSE, SPREAD, PUSH |
| **Filter** | Who may it affect? | 1: KIN |

**Elements: damage**

| Word | Effect | Charge |
|---|---|---|
| FIRE | 30, Elemental; a critical sets Burning | 2 |
| FREEZE | 25, Elemental; Slowed (Body save) | 2 |
| SHOCK | 30, Elemental; ignores half cover | 2 |
| STONE | 35, Sigil (armour applies) | 2 |
| GALE | 15, Sigil; pushes the target 2 tiles away from where the spell came from | 1 |
| SPARK | 15, Elemental; the cheapest attack | 1 |
| ACID | 15, Elemental, and the target is **Corroded** (no save to land it): 5 damage at the start of each of its turns and Defense −2, 3 rounds; a Body save at the end of each of its turns ends it early | 2 |

**Afflictions: debuffs and control** (no hit roll: the target saves against 12 + your debuff strength for that family)

| Word | Effect | Charge |
|---|---|---|
| BIND | Pinned (Body save) | 2 |
| BLIND | Blinded (Body save) | 1 |
| SLOW | Slowed (Body save) | 1 |
| MUDDLE | Left Brain Debuff (Brain save) | 2 |
| DREAD | Shaken (Heart save) | 2 |
| SILENCE | Silenced: no Sigils, Outbursts or prayers for 1 round (Brain save) | 2 |
| COMMAND | Brain save, or **Commanded**: the target obeys one order on its next turn, picked by you from the menu: halt, kneel (Prone), drop its weapon (Disarmed), or move up to 3 tiles where you choose (never into harm: a field, a trap you know of, a ledge) | 3 |

**Boons: support** (no hit roll, no save)

| Word | Effect | Charge |
|---|---|---|
| WARD | A shield of 30 until the end of the fight (the higher shield stands) | 2 |
| MEND | Heals 25 (× Healing given) | 3 |
| QUICKEN | **Quickened:** +2 AP on the target's next turn (within the AP ceiling of 9). At most once per target per round, and **never on yourself** (Leon): with a Burst that covers you, you are skipped | 3 |
| SHARPEN | **Sharpened:** the target's next attack gets +3 to hit and ×1.25 damage (it lasts until that attack, or the end of its next turn) | 2 |
| CLEANSE | Ends **one condition** on the target, the newest first | 2 |

**Workings: the world** (no hit roll; a Working may aim at an empty tile)

| Word | Effect | Charge |
|---|---|---|
| VEIL | Smoke in radius 1 around the target: blocks sight, 2 rounds + the Sigil duration bonus | 2 |
| LIGHT | Lights radius 4 for the scene; reveals the Hidden in it | 1 |
| STEP | **Teleport:** whoever it affects moves to a free tile you pick, up to 4 tiles from where they stand, past anything in between. It isn't movement: no Overwatch, no difficult ground, nothing on the way. An enemy resists with a Body save. On yourself it's a **blink** | 2 |
| RAISE | **A solid barrier** on each **empty** tile it covers (no creature, object, glyph or placed magic on it): blocks movement and sight, 30 HP a tile, 3 rounds + the Sigil duration bonus. **One RAISE working per caster** (Leon): a new one takes down the old | 3 |
| NULL | **Dispel:** removes the placed Sigil magic on the tiles it covers: glyphs (anyone's, yours too), fields, traps (hidden ones too), turrets, and the smoke, light and walls of Workings. Keystones, Grand forms and class zones are not Sigil spells and stay | 3 |
| MASK | The target is **Hidden** until it attacks, or for 2 rounds. A Marked target can't be hidden (the spell fizzles on it) | 2 |

**Reach: where you may pick the target**

| Word | Missile | Range | Multiplier | What can stop it | Charge | Each extra copy |
|---|---|---|---|---|---|---|
| *(none)* | **Touch:** nothing flies | 1 tile deep | ×1 | nothing | | |
| SEEK | A **bolt**, straight | 8 | ×1 | the first creature or full cover in its way takes it or stops it; needs sight of the target | 2 | +4 range |
| ARC | A **lob**, over everything | 6 | ×0.8 | nothing; needs sight of the tile it lands on | 2 | +3 range |
| SENSE | It **appears** at the target | 8 | ×0.6 | nothing; no sight needed | 3 | +4 range |
| RELAY | **Cast from an ally's tile**: the spell works as if you stood where they stand | an ally within 8, in your sight | ×1 | nothing between you and the ally | 2 | through one more ally (within 8 of the last, in its sight) |

- **One Reach word per spell.** You may repeat it for more range; a second, different Reach word is refused when you draw it.
- **The Sigil range bonus** (Derived stats) is added **once** to SEEK, ARC, SENSE and RELAY, however many copies, and **never to Touch**.
- **RELAY's area** is the relaying ally's own tile and every tile next to it (all around; the facing rule doesn't apply). The ally can't be you.
- **Cover.** A SEEK bolt takes cover like a shot (half cover −5 to hit; SHOCK ignores it). Touch, ARC and SENSE don't fly through cover, so it doesn't apply.

**Delivery: what flies out and how it acts**

| Word | 1 copy | Each extra copy | Charge |
|---|---|---|---|
| STAY | **Field:** the spell strikes once when Evoked, at full, as it would without STAY; then it stands on what it covers for 2 rounds + the Sigil duration bonus and takes whoever enters it or starts a turn in it: at full the first time it affects them, ×0.5 once it has (its strike or an earlier bite); once per creature per round, the strike counting as that round's (item 422) | +2 rounds | 1 |
| TWICE | **2 missiles** at 2 targets you pick in the area, each with its own Burst; the glyph adds +1 Flux | +1 missile, +1 Flux | 3 |
| PULL | After the hit, drags each target it affected **3 tiles toward you** (a turret's, toward the turret) | +3 tiles | 1 |
| WAIT | **Trap** on the tile you aim at: hidden from the other side (they can spot it like any hidden trap), it goes off once when someone of the other side steps on it or starts a turn on it; 3 rounds + the Sigil duration bonus. Your side never sets it off (its Burst can still hit them) | goes off once more | 2 |
| WATCH | **Turret** on the tile you aim at: at the start of each of your turns it casts the spell at the **nearest creature it can reach** (allies too: add KIN), from its own tile with the spell's Reach, all around, ×0.5, for 2 rounds + the Sigil duration bonus. 10 HP and Defense 10; it doesn't block movement; Scuff (1 AP on its tile) or a hit destroys it | +2 rounds | 3 |
| CHAIN | After the hit, **jumps forward** to the next creature within 3 tiles of the last one hit (allies too: add KIN) that is no closer to you (or the turret), at ×0.75 of the last hit; never back to one it hit; jumps can't be blocked | +1 jump | 2 |
| LEECH | **Life drain:** after the hit you heal **half the damage** the spell dealt, in all (not × Healing given) | +25% (of the damage) | 2 |

- **Order.** A spell resolves **how many** (TWICE) → **how it travels** (Reach) → **what it covers** (Burst) → **what happens after** (PULL, CHAIN, LEECH) → **what stays** (STAY, WAIT, WATCH).
- **Mixes follow from the words:** STAY + PULL is a *whirlpool* (the field drags everyone in it 3 tiles toward you each round) · STAY + TWICE, two fields · WAIT + STAY, a hidden trap that strikes when set off and leaves a field (the springing is the field's strike) · WAIT + TWICE, two traps · WAIT + WATCH, a hidden turret (hidden until it first fires or is spotted) · WATCH + TWICE, two shots a round (the two nearest) · WATCH + CHAIN, the *Tesla tower* · CHAIN + LEECH, you heal from every jump.
- **Refused:** WATCH + STAY (a turret already lasts).
- **Limits:** at most **2 traps and 1 turret** per caster; another removes your oldest.
- **Who places it:** fields, traps and turrets belong to whoever Evoked the spell, use that caster's numbers when they go off, and count toward that caster's limits.

**Burst: what it covers where it lands**

| Word | 1 copy | Each extra copy | Charge |
|---|---|---|---|
| *(none)* | The one target you pick, ×1 | | |
| CONDENSE | One target, **×1.5** | +0.5 | 1 |
| SPREAD | Everyone within **2 tiles** of where it lands (5 × 5), ×0.6; it can land on empty ground | +1 radius, −0.1 | 2 |
| PUSH | A **cone** from where it lands, carrying on the way the spell faced (a bolt: the way it flew), 3 tiles long and widening like the full-auto cone, ×0.7; it can land on empty ground. Refused on your own tile | +2 length, −0.1 | 1 |

- **Mixes:** CONDENSE + SPREAD is *core and splash* (×1.5 on the landing tile, ×0.6 around it) · CONDENSE + PUSH (×1.5 on the landing tile, ×0.7 in the cone) · SPREAD + PUSH (the radius and the cone; anyone in both is hit once, at the better multiplier).
- **With the Workings, a Burst widens what the Working covers:** RAISE walls every empty tile in it (SPREAD: a 5 × 5 block; PUSH: a fan of wall); NULL cleans the whole area; VEIL's smoke and LIGHT's light cover their own radius or the Burst's area, whichever is larger; STEP moves everyone caught the same way and the same distance (you pick one tile for the landing tile; everyone shifts alike; anyone whose new tile isn't free stays; each enemy saves on its own).

**Filter: KIN** (charge 2, **one copy**: a second KIN adds nothing and is refused). **Your side is never affected:** you and your allies can't be picked (aiming at an ally's tile is refused before anything is spent; your own tile is the one exception, and KIN spares you there) and nothing in the spell touches you. "Your side" is whoever Evokes it. It works the same for every Subject, so it **backfires** on Boons (MEND · RELAY · KIN can only heal an enemy). It changes who the spell affects, **not how it flies**: an ally in a SEEK bolt's way still stops it, and the bolt fizzles.

#### 2. Grammar and cost

1. **A spell needs at least 1 Subject and at least 1 other word** (a non-Subject word). A Subject on its own is not a spell: the cheapest second word is CONDENSE (1 charge), so a blink is STEP · CONDENSE on yourself.
2. **A spell holds at most 4 glyphs**, whatever it holds. Below that, your **Max Sigil words** (2 + floor((Intelligence − 1) ÷ 2)) limits you: 2 at Intelligence 1–2, 3 at 3–4, 4 from 5. Rules that add a word past Max Sigil words (Brain Power's Overclock, the Mage's Overcharge) never pass 4.
3. **Glyphs on the ground.** You can have at most your Max Sigil words glyphs on the ground at once (Hold the Stroke adds to it); drawing one more fades your oldest. Above Intelligence 5 it no longer grows a spell, but it still grows this number, so a high-Intelligence caster keeps more Lines and traps ready.
4. **Cost.** Drawing a glyph costs the Glyph AP (Derived stats), **the word's charge** from your Evoker's core, and **1 Flux** (TWICE: 2). Evoking costs **1 AP** and **1 charge per glyph** in the spell, minus your Sigil Core saving, minimum 1.
5. **Repeats** (Leon). **Any word may repeat**, Subjects too, except KIN and a second Reach word of another kind. A repeated non-Subject word gives its "each extra copy" line. Repeated Subjects add up: their damage, healing and shields sum, and each copy's rider applies once (a condition never stacks: a second BIND adds nothing). **Every repeated glyph** (each copy past the first of a word) **multiplies the spell's final numbers by ×0.9**. FIRE · CONDENSE · CONDENSE · CONDENSE: 30 × 2.5 × 0.9 × 0.9 = **61** (raw 75; about 20% weaker). FIRE · FIRE · CONDENSE: (30 + 15) × 1.5 × 0.9 = **61** (one main element, item 589). The final numbers are the spell's direct damage, healing and shields; never ranges, tiles, rounds, AP, HP of walls and turrets, or the numbers of the conditions it sets (Burning's 10, Corroded's 5).
6. **One main element** (balance pass, item 589, provisional): the strongest damaging Subject glyph counts in full; every other damaging glyph (another Element, or a repeat) adds half its damage. **The multipliers stack by product:** the Subjects' sum × the Reach multiplier × the Burst multiplier × the Delivery multiplier (field or turret ×0.5, each CHAIN jump ×0.75) × 0.9 per repeated glyph × the Sigil multiplier (× the Elemental multiplier for Elemental damage; × Healing given for MEND and WARD) × a critical. Elemental damage takes the Sigil and Elemental bonuses **added**, 1 + (Sigil − 1) + (Elemental − 1), not their product (item 588). **The ceiling:** a spell's direct damage to one creature is at most **350**, or **500** on a critical, before armour (item 590; the parts are scaled down together). Then armour (Sigil damage takes full armour, Elemental half).
7. **Hitting.** A spell that deals damage rolls Brain Power against each target's Defense (a natural 20 is a critical: × the Critical multiplier; a natural 1 misses). Conditions a damage word sets (FREEZE's Slowed) still call for their save on a hit. Afflictions don't roll to hit: the target saves against 12 + your debuff strength. Boons and Workings neither roll nor allow a save, except STEP on an enemy (Body save).
8. **Fizzle.** A spell that goes off but finds nothing it may affect **fizzles**: nothing happens, and the charge, AP and Flux are still spent and its glyphs fade. The screen says so before you confirm.
9. **Harmful effects skip the Downed and those who surrendered**; Boons don't.

#### 3. Drawing a spell

1. **You draw a glyph only on the tile you stand on**, with an Evoker in hand (Glyph AP, the word's charge, 1 Flux).
2. **One glyph per tile.** A tile that holds any glyph (yours, an ally's or an enemy's) takes no other, unless a perk, trait or skill lets that caster put a second glyph there. None does yet: this is the hook for one (the **two-glyph hook**). With it, two glyphs on one tile on their own are a **Stack**; on a tile of a Line, both count as words of that Line. A spell still holds at most 4 glyphs.
3. **The only shape is the Line, and a Line is a stroke** (rules revision 1.10, Sigil 1.5). A **stroke** is a run of glyphs drawn as one Line; every glyph records the stroke it belongs to. A **Line** is a stroke of 2 to 4 glyphs in one straight row, **horizontal, vertical or diagonal**. **The Ring and the old Stack are gone.**
   1. **Extending a stroke.** A new glyph **extends** a stroke when it is drawn next to that stroke's **end** glyph (the last one drawn) **and** continues its straight row (the same axis, the same direction), and the stroke has fewer than 4 glyphs. A stroke of one glyph can be extended in any of the 8 directions; the second glyph sets its axis.
   2. **Otherwise the new glyph starts a new stroke**, even if it touches other glyphs.
   3. **The stroke picker.** When a new glyph could extend more than one stroke, you pick which, or **new Line**, on the draw step. The default is the stroke you drew into last; a stroke you have no glyph in is never the default (item 901). The preview shows the result: "extends FIRE·SEEK" or "starts a new Line".
   4. **Touching glyphs of other strokes don't matter:** they don't join, poison or block. Two Lines may run side by side, cross diagonally, or end next to each other.
   5. **The draw's refusals read the stroke it extends:** a second Reach word, a second KIN, WATCH with STAY, past 4 glyphs or past the Max Sigil words of its drawers are refused before anything is spent; pick **new Line** to start a fresh stroke instead.
   6. **Co-op:** an ally may extend **your** stroke by drawing at its end along its axis, picked on the same picker (rule 8). Allies' glyphs never join a stroke by accident. **Enemies** use strokes too; their glyphs never join yours, and yours never join theirs.
   7. **The facing rule, Evoking and fizzling are unchanged:** they read the stroke's tiles exactly as they read a Line.
   8. **Scuffing a middle glyph splits the stroke** in two. Each part still 2 or more long is a Line; a single glyph left alone is just a glyph (it can be extended again). The same holds when a middle glyph fades or is unmade (item 903).
   9. **A Stack** (the two-glyph hook, rule 2): a second glyph on a tile joins the stroke of the glyph already there (item 902).
   10. **Old saves:** glyphs drawn before rules 1.10 (no stroke recorded) keep the 1.4 reading until they fade: the ones of a side that touch each other make one group, and a group that isn't one straight row of 2–4 is no shape. They never join a stroke, and a stroke never joins them (item 904).
   11. **Junctions** (rules 1.10, Brain Power **Mastered**, 10; items 917–920). A glyph may belong to **two strokes** at once: a crossing. When a new glyph could extend a stroke of your side, the picker also offers a **junction**: "junction: extends FIRE·SEEK and BIND" (the glyph extends both strokes at once, each on its own axis) or "junction: extends FIRE·SEEK + a new Line" (it extends that stroke and is also the first glyph of a new stroke, which you then extend from it in any direction). It is one glyph: one draw's AP, charge and Flux, and one of your glyphs on the ground. The draw's refusals (rule 3.5) read both strokes. A junction is never the default; without Brain Power Mastered the pick is refused. **Evoking either Line** counts the junction as a word of that Line; it stays, now in the other stroke only, and **fades when the second Line is Evoked**. Time, your glyph cap, a Scuff and NULL remove it like any glyph (both strokes lose it). Enemies don't draw junctions.
4. **So you walk a spell:** draw, step, draw. A 4-word spell is a Line of 4 tiles: 3 steps, 4 glyphs, then Evoke. At Agility 1 and Expression 1 that's 3 + 4 + 1 = 8 AP, more than one turn's 6, so you finish it next turn. A Line can't cross a tile you can't stand on (walls, cover, deep water), and walking it can draw Overwatch.
5. **Glyphs last** 2 rounds + your Sigil duration bonus (rounded down); out of combat, the same number of overworld rounds. They fade when the spell is Evoked (Keystones excepted).
6. **Everyone sees a glyph glowing.** Reading it needs you to know that word, or an Analysis check against TN 12 (no AP, once per glyph).
7. **Scuff** (1 AP): anyone standing on a glyph's tile can wipe it out. Enemies scuff glyphs that threaten them when they have AP to spare.
8. **Co-op.** Two Sigil users can build one Line together, each drawing their own glyphs: the second extends the first one's stroke by picking it on the draw step (rule 3.6). Whoever Evokes pays the firing charge, rolls, and needs Max Sigil words of at least the Line's length. **Enemy Sigil users** can Evoke any Line they can read, yours included, and the other way round.
9. **Skill unlocks that change drawing and Evoking** (engine-run, items 482–485): **Brain Power · Overclock** (Mastery 1): your next glyph may make a spell one word longer than your Max Sigil words (never past 4), for 2 charge more. **Brain Power · Twin Draw** (Mastery 2): once per combat, the glyphs of two spells cost the Glyph AP of the longer spell only (steps still cost Movement). (**Rumination · Proven Formula** is no longer a Sigil unlock: since rules 1.13 it is +3 on saves against a condition that has already hit you this combat.) **Visualization · Paint the Field** (Mastery 2): once per Evoke, a spell with no Burst word gets a free SPREAD or PUSH (no glyph, no charge, not counted toward 4).

#### 4. Evoking: the facing rule

**You fire away from yourself.** To Evoke (1 AP) you stand **within 1 tile of any glyph** of the Line; standing on a **middle glyph** is refused. Where you stand sets which way the spell's **area** opens:

- **Along the Line:** you stand on an **end glyph**, or next to an end and further along the Line than it (*beyond the line*). The area runs **past the far end**, the way the Line points from your end. It is **as wide as the Line** (one lane per glyph, lanes side by side, the middle lane on the Line's own axis; for an even number of glyphs the extra lane is on the right of the way it fires) and as deep as the range.
- **Across the Line:** you stand next to the glyphs **from the side** (not beyond either end). The area runs **straight across**, away from you, covering **the whole Line**: row 1 is the Line moved one step away from you, row 2 two steps, and so on, as deep as the range. The step is the perpendicular for a horizontal or vertical Line; for a diagonal Line it is the step north, south, east or west that leads away from you (the north or south one when both do), so the band has no gaps.
- **The area is as wide as the whole Line** (Leon: even lengths included) and **as deep as the range**: the Reach word's range (+ the range bonus), or **1 tile for Touch**. Example: a Line on N15–Q15, standing on Q14: with SEEK, pick any target in N16–Q23; with no Reach word (Touch), only in N16–Q16.
- **When you finish a Line you stand on the last glyph you drew**, an end, so the spell runs along the Line past the first glyph: **back the way you came**. To fire across it, or the other way, step off first. The preview draws the direction before you Evoke (Leon).
- **You can always target yourself** (your own tile), whatever the Reach, even though your tile is never in the area: to heal, shield, blink or hide yourself, or to centre a burst on yourself. This is Touch's one exception (Leon: no RETURN word). A Burst centred on you covers you too: add KIN to keep yourself and your allies out of it (and QUICKEN always skips you). PUSH is refused on your own tile.
- **Picking the target.** Inside the area you pick a creature (or yourself); a Working, SPREAD or PUSH may pick an empty tile. A SEEK bolt leaves from the Line (from the far-end glyph when the area runs along it, from the glyph in the target's lane when it runs across) and stops at the first creature or full cover on its way: that is where it hits or bursts. The area only limits where you aim; a Burst may reach past it.
- **On a Stack** (only with the two-glyph hook): the area is all around **you** (centred on where you stand, not on the Stack), out to the range, in sight (item 489).

#### 5. Flux, overload and Vent

As before: each glyph drawn adds 1 Flux (TWICE 2); above 6 the Evoker overloads (10 damage per Flux over 6, it locks for 1 turn, all the Flux bursts into the air); Vent (1 AP) dumps it into the air.

#### 6. What you can make

All numbers before the Sigil multiplier; they assume no armour.

| Spell | Pattern | Result |
|---|---|---|
| Starter bolt | SPARK · SEEK | 15 at up to 8, blockable. Draw, step, draw, Evoke: 4 AP at Agility 1 and Expression 1; 3 charge to draw + 2 to fire |
| Firebolt | FIRE · SEEK | 30 at up to 8 |
| Fireball | FIRE · SEEK · SPREAD | 18 to everyone within 2 of a tile up to 8 away |
| Grenade | FIRE · ARC · SPREAD | 14 to everyone within 2, lobbed over cover |
| Shotgun | FIRE · PUSH | From the tile touching your Line on the far side, a cone fans out away from you, 21 each |
| Nova | FIRE · SPREAD · KIN, on your own tile | 18 to every enemy within 2 of you |
| Burning ground | FIRE · STAY · SPREAD · KIN, on your own tile | A 5 × 5 burning field around you: 18 to every enemy in it when Evoked and to every newcomer, 9 to one it has already burned, harmless to your side |
| Wall of fire | FIRE · ARC · STAY · SPREAD | A 5 × 5 burning patch up to 6 away: 14 when Evoked and to a newcomer, 7 after, 2 rounds |
| Chain lightning | SHOCK · SEEK · CHAIN · CHAIN | 27 → 20 → 15 along a line of creatures (one repeat: ×0.9) |
| Tesla tower | SHOCK · SEEK · WATCH · CHAIN | 15 then 11 to the nearest creatures within 8 of it, each round for 2 rounds; it zaps allies too |
| Safe Tesla post | SHOCK · WATCH · CHAIN · KIN | Zaps an enemy next to it (15), then chains forward (11); never your side |
| Heavy hit | FIRE · CONDENSE · CONDENSE · CONDENSE | 61 to one creature next to the Line (two repeats) |
| Heaviest hit | FIRE · FIRE · FIRE · CONDENSE | 90 × 1.5 × 0.81 = 109 to one creature next to the Line; 7 charge to draw + 4 to fire, more than one standard core holds, so you swap cores between draws (item 418) |
| Fire mine | FIRE · WAIT · SPREAD | Hidden; 18 to everyone within 2 when set off |
| Snare | BIND · WAIT · PULL | Pinned and dragged toward you |
| Acid rain | ACID · ARC · STAY · SPREAD | Strikes the 5 × 5 area once (7, Corroded), then a field that corrodes everyone in it |
| Blink | STEP · CONDENSE, on yourself | You jump to a free tile within 4 |
| Swap a friend to safety | STEP · RELAY | Your relay, or someone next to it, jumps 4 tiles |
| Haste | QUICKEN · RELAY | +2 AP for your relay or someone next to it |
| Bless the squad | SHARPEN · SPREAD, on your own tile | Everyone within 2 of you, you too, gets the bonus on their next attack, enemies standing there too (never add KIN: it would bless only the enemies) |
| Cleanse | CLEANSE · SEEK | Ends one condition on someone up to 8 away |
| Charm | COMMAND · SEEK | An enemy halts, kneels, drops its weapon or walks where you say |
| Stone wall | RAISE · SEEK · PUSH | A fan of wall across a corridor |
| Fortress | RAISE · SPREAD, on your own tile | Walls on every empty tile within 2 of you (your own tile is taken, so it stays open) |
| Dispel | NULL · SEEK · SPREAD | Wipes every glyph, field, trap and turret within 2 of a tile |
| Invisibility | MASK · CONDENSE, on yourself | You're Hidden for 2 rounds, or until you attack |
| Vampiric bolt | FIRE · SEEK · LEECH | 30 to the target; you heal 15 |
| Healing post | MEND · WATCH | Heals whoever stands nearest it (next to it) 13 a round (25 × 0.5 = 12.5, rounded to the nearest by item 456) |

#### 7. Friendly fire

Bursts, cones, fields, chains and turrets **hit allies** (Leon), and so does a bolt with an ally in its way. **KIN** keeps your side out. A single-target spell hits only the one you pick.

#### 8. Enemy casters

Enemies with an Evoker use the 40 words by the same rules (Leon). In short: an enemy knows the words its stat block lists, or its tier's default set (sigils.json `enemy_ai`). On its turn it weighs a spell it can finish this turn (or a Line it started) against its weapon by expected damage, walks the Line on its own tiles, steps to the side it needs, and Evokes. It adds KIN or picks targets so that its burst, cone, chain or turret hits as few of its own side as it can, and holds a spell that would hit more allies than enemies. It sets traps on the tiles players are likely to cross, NULLs or scuffs the player traps, turrets and glyphs it has spotted when they threaten it, steps out of fields, and can still Evoke a player's Line it can read. The AI only chooses; the engine resolves everything. Caster archetypes (enemies.json `casters`: the Sigil novice, adept, warden and the boss-tier magister) can be named by any fight's foe of the same tier; a caster's COMMAND gives the order that fits its target (walk a player out of its guards' reach, halt a charger, make a shooter drop its weapon, else kneel; section 14 item 490); every enemy, caster or not, steps out of player fields, walks around the fields and spotted traps it knows of, and strikes a player turret or RAISE wall that threatens or blocks it (section 14 items 469 and 491).

#### 9. What the player must see

**Every Sigil spell shows everything it will do before it is Evoked, and everything it is doing while it lasts.** No rule the player can't see decides a Sigil spell. Each colour on screen is paired with a word or glyph (docs/design/colour-system.md). The client must show:

1. **Before drawing:** the tile you'll draw on (yours), the word's cost, and which stroke the glyph joins (rules 1.10, rule 3): "extends FIRE·SEEK", "starts a new Line", a Stack or a junction, with the stroke picker when more than one fits. A glyph that turns off a stroke's row starts a new Line and breaks nothing; only glyphs from before rules 1.10 can still be left with no shape (rule 3.10).
2. **While building:** the Line's words in order and its shape; whether it's a valid spell yet ("needs a Subject", "needs another word", "a second Reach word is refused"); glyphs left before your cap; charge, AP and Flux now and after Evoke; an overload warning.
3. **Where to stand:** the tiles you can Evoke from, each with the direction its area opens; refused tiles say why (a middle glyph, too far).
4. **Targeting:** the area you may pick from, tinted; out-of-reach tiles dimmed; the direction it fires, drawn before you Evoke.
5. **Delivery (on hover):** a bolt's path and the tile where it would be stopped; a lob's arc; where SENSE appears; RELAY's hop; every TWICE missile; CHAIN's jumps in their order, each with its multiplier; where PULL and STEP would leave a creature.
6. **Burst (on hover):** the exact tiles of the radius or cone, and CONDENSE's core tile.
7. **Who is affected:** every creature that would be hit, marked; allies marked apart from enemies; those KIN spares, and the Downed or surrendered that are skipped; for each, the expected damage, healing or shield after multipliers, and the roll or save TN it takes. The other Boons say what they give (QUICKEN +2 AP on their next turn; SHARPEN +3 to hit and ×1.25 on the next attack; CLEANSE the condition it would end, newest first; MASK Hidden until they attack or 2 rounds); COMMAND's move order marks the tiles it may send them to. LEECH shows the caster's heal (if every hit lands, and what that restores). NULL marks every glyph, field, trap, turret and wall it would unmake (never the other side's unspotted traps); LIGHT draws its radius 4 and marks your side's Hidden it would reveal (section 14 item 480).
8. **Fizzle:** "Nothing it may affect: this spell will fizzle", before you confirm.
9. **Placed magic:** fields, traps, turrets and RAISE walls show their tiles or reach, the rounds left and whose they are. A turret shows its reach (the tiles it can fire into) and who it would fire at if it fired now; so does a WATCH spell before it is Evoked. Your traps show to your side only; an enemy's shows once spotted.
10. **Other casters' Lines:** every glyph glows for everyone. Words you know are readable; a Line you can read shows its area the same way as your own.
11. **Afterwards:** the log lists every target, roll, save and number.

#### 10. Elements: their riders and how they look and sound

Each element has one identity, used by every spell that carries it. Sigil magic draws it inside its own frame: Mind cyan (#4FC8DF, ink #8BDEEE), square glyphs, hard snapping strokes. **Soul Outbursts will reuse the same element bodies** inside the Soul frame (violet, round, swelling) when Outbursts gain elements: the frame says which magic it is, the body says which element. Element hues are for effects only, never for UI meaning, and always come with the element's word or glyph.

| Element | Rider | Look | Sound |
|---|---|---|---|
| FIRE | A critical sets Burning | A white-hot core flaring orange at the edges, embers lifting off the tile, a scorch left for a beat | A dry whoomph, then crackle |
| FREEZE | Slowed (Body save) | Pale blue-white frost spreading in sharp crystals from the impact, a breath of mist, the target rimed | A glassy crack and a high ring |
| SHOCK | Ignores half cover | A jagged blue-white arc with branches, a hard flicker of the tile, a jump between targets for CHAIN | A sharp snap and electric buzz |
| STONE | Sigil damage, armour applies | Grey-brown shards and dust bursting up from the ground, a short heavy shake | A deep thud and grinding crunch |
| GALE | Pushes 2 tiles | Pale curved streaks sweeping through, dust and debris swept along the push | A rising whoosh |
| SPARK | The cheap attack | A small bright pinpoint flash and a few scattered sparks | A quick tick-snap |
| ACID | Corroded (5 a turn, Defense −2) | Sickly yellow-green droplets that hiss and pit the target, a thin smoke while it burns | A wet splash, then a long hiss |

Non-element Subjects keep plain Sigil visuals (cyan, square) with a glyph per kind: Afflictions bind and cage, Boons rise, Workings build or unbuild the ground.

### Soul magic: Outbursts, the heart (Soul, through an Emanator)

> **Rules revision 1.5 (Soul magic: Outburst 2.0, accepted 8 Nov 2026; decision 99).** It replaces the 1.2 Soul rules (items 68–76 where they name 1.2 numbers): Begin, Pump and Release with stage multipliers, the swell, Strain that burns and shorts with no roll, calming the heart (no vent), a second school as a half-strength rider, tones (the Sigil 1.4 elements in the Soul style), shapes, and holding as gameplay (the aura, Heart Overwatch, Resonance, Feeding). Sigil magic owns space; Outburst owns time and the body. **Every number is provisional** (items 492–521) until the damage balance pass. The design is in `docs/design/outburst-2.0-proposal.md`; the data in `soul_modules.json` (`cycle`, `strain`, `tones`, shapes as `form` modules, `retired`).

An Emanator stores bots as MP, up to your Max MP. It pays only from a hand (Hands 2, item 630): without one in hand, every Begin pays straight from the air at +2 Strain (the MP stays in the carried Emanator). You hold an Outburst in the heart, fill it over turns and choose the moment to let it go.

#### 1. The heart cycle: Begin, Pump, Release

1. **Begin** (2 AP; **Swift**: 1 AP): open a ready design. Pay its MP (cost below) and take **1 Strain** (2 in Flooded air). It is now **held at stage 0**: your heart glows and everyone can see it. You hold one Outburst at a time.
2. **Pump** (1 AP each): +1 stage, up to **stage 4**. Every AP you don't spend moving or shooting can go into the heart. Pumping adds no Strain.
3. **Release** (1 AP): it fires at the stage reached. **Stage multipliers: 0 → ×0.8 (rules 1.8; was ×0.6), 1 → ×1, 2 → ×1.4, 3 → ×1.8, 4 → ×2.2.** The multiplier scales damage and healing; conditions keep their durations.
4. **A snap cast** is Begin and Release at once (3 AP, ×0.8 under rules 1.8). A full turn (Begin, Pump × 3, Release) is ×1.8. Begin one turn, carry it, and the swell + Pump × 2 + Release next turn reaches ×2.2.
5. **Holding past your turn keeps the stage.** At the start of each of your next turns the held Outburst **swells**: +1 stage for free and +1 Strain (+2 in Flooded air). While holding you can move, shoot, Syphon, Steady or Feed, but not Begin another.
6. **Empathy** gives **free Pumps each round**: 1 from Empathy 3, a second from Empathy 7. They come back at the start of each of your turns. Empathy no longer lowers any AP; it still sets your ready designs (2 + floor(Empathy ÷ 2)).
7. **Every Pump has its heartbeat** (section 9): pumping must feel like the heart filling.
8. **Silenced:** no Begin, Pump, Feed or Release.
9. **No slipping.** Taking damage while holding no longer makes the Outburst slip (1.2's check is gone): the Strain is the risk now.

#### 2. Damage

1. **Damage school base 20** × the **Soul multiplier** (1 + 0.05 × (Determination − 1) + 0.1 × Will Power; 2.45 maxed) × the stage multiplier × the shape's multiplier.
2. Maxed (2.45): a snap cast 29, a full turn's stage 3 88, a held stage 4 108 (a long rifle is 120 a shot every turn; fixed Sigil FIRE 114). Outburst trades damage per turn for one chosen, unblockable big moment.
3. **Raw** (no tone): Soul damage, **armour ignored**. **An element:** Elemental damage, **armour counts half** (Stone from stage 1: in full).
4. **Hitting.** A **Bolt** and a **Lance** roll Will Power against each target's Defense (half cover −5; a natural 20 doubles the damage, a natural 1 misses). **Wave, Burst and Aura don't roll**: everyone in the area is hit. **At Once** makes a Bolt or Lance land with no roll at half damage. Control and Status call for saves (12 + your debuff strength), as before.

#### 3. Strain, the burn, the Mana Short and calming the heart

1. **Strain limit:** 3 + floor(Will Power ÷ 2). **+1 per Begin** and **+1 per held turn** (the swell), each +2 in Flooded air; +2 a Begin without an Emanator.
2. **Every turn start: −1 Strain, always** (whatever you did), before the swell.
3. **Over the limit, no roll:** each point over **burns your heart for 8 true damage at the end of your turn**. It Downs, never kills (a foe is subdued).
4. **The Mana Short is automatic at 3 over the limit** (checked whenever Strain rises, and again at the end of your turn, for a limit that fell: item 544): you are **Stunned** (you lose your next turn), a held Outburst **goes off wild** (at a random creature within its reach, or into the air), and its element's **stage-1 rider lands on your own tile** (you take Frost's Slowed, Acid's Corroded). Then Strain falls to the limit. Will Power raises the limit; it no longer rolls you out of trouble.
5. **No vent** (Leon: "feels like ripping off Sigil"). Strain falls by **calming the heart**, through what the body does, so fighting mages and support mages each have their own way. All five add to the turn-start −1:
   1. **A turn of stillness:** end a turn in which you didn't Begin, Pump or Feed **and hold no Outburst**: −1 more. Holding is not stillness (Leon, 8 Nov 2026): a held heart that only waits nets 0 a turn (+1 swell, −1 turn start); Steady the heart nets −2 at the cost of growth.
   2. **Fighting it out:** your first weapon attack each turn (melee or shot): −1. Only the first counts, even one made at Strain 0.
   3. **Tending others:** your first heal, stim, shield or cleanse given to an ally each turn: −1. Only the first counts, even one given at Strain 0.
   4. **Let it go** (free, on your turn): drop the held Outburst without releasing it: Strain falls by **its stage**, but **never by more than the Strain its swells cost** (stages bought with AP, free Pumps, Feeding or a perk give nothing back: Pump-then-let-go would otherwise be a vent; item 541); the built power is lost (a harmless violet sigh, the mana meter +1).
   5. **Steady the heart** (1 AP, only while holding): −1 Strain, and the held Outburst **doesn't swell** at the start of your next turn. Growth traded for safety: keep a charged heart ready (for Heart Overwatch or the right moment) without drifting over the limit. (Leon, 8 Nov 2026: the first draft, Breathe for 2 AP with a Strain debt, was a net zero for 2 AP.)
6. Strain and a held Outburst reset after combat. **Syphon** (1 AP) still draws the air into MP (see the meter table, × your Mana Syphon bonus). **Crystallise** (3 AP, the meter at 10 or more) still turns the air into a core (the meter −10).

#### 4. Designs, schools and the second school

1. **Design out of combat** from one **school** plus **modules** (soul_modules.json) and a **tone**. Module slots: 1 + floor(Will Power ÷ 3). **One shape a design** (a shape is a module and takes a slot); a tone takes no slot.
2. **The second school** (from Will Power 5): a design has a **primary school** (full effect) and may add a **secondary school** with **its own option** at **half strength**, as a rider after the first. They must be different schools, **working on the same side** (item 542): Buff, and Damage with Inverse (a shield), work on allies; Damage, Control and Status on foes. So Buff pairs only with Inverse Damage, and the hostile schools with each other; the workshop refuses the rest (a Buff design's heal would otherwise carry a push, a Status or damage onto the ally it healed). Damage + Control (push) = damage, then a 1-tile push; Damage + Status (Shaken) = the damage, then Shaken 1 round; Buff (heal) + Damage with Inverse = the heal, then a shield of half the damage; Control (Pinned) + Damage = Pinned and half damage (no roll). The rider lands only where the primary did (item 543): a Bolt that misses, a push the target saves against (it holds its ground) and a condition it resists or is immune to carry nothing. Half strength: half damage or healing, half the push (rounded down, at least 1), half the rounds (at least 1).
3. **Cost** (paid at Begin): school base + modules + 10 for a second school + the tone's cost (an element 5, Raw 0), × the meter band's Soul cost, × (1 − 5% × (Insight − 1)), minimum 5; +20% under a Right Brain Debuff. Pumps cost no MP.
4. **Learning.** Schools, modules and tones come from tutors, plates (a **Heart plate** holds one Outburst lesson, used up: item 546) and the Narrator's grants after a moment that shakes you. **Tones:** one at Lore Master 1 (rules 1.8; was Visualization 1), picked with the starting design or with your first toned design; more from tutors or plates.

| School | Base cost | Effect (at ×1) |
|---|---|---|
| Damage | 20 | 20 damage × the Soul multiplier |
| Buff | 20 | allies: heal 30 × Healing multiplier, or Inspired (+2 to hit), or Guarded (+2 Defense), 2 rounds |
| Control | 25 | push or pull 3 tiles (Body save), or Pinned, or Slowed, 2 rounds |
| Status | 20 | Fear, Shaken, Confused, or a Left or Right Brain Debuff, 2 rounds (Heart or Brain save) |

#### 5. Elements (tones)

The same element ids, riders and effects as Sigil 1.4 (sigils.json `elements`), in the Soul style: violet heat blooming into the element's colour. A design's **tone** is Raw (default) or Fire, Storm (shock), Frost (freeze), Stone, Gale or Acid. An element's rider grows with the stage and lands on **enemies** it reaches (never allies):

| Element | Stage 1 | Stage 2–3 | Stage 4 |
|---|---|---|---|
| Fire | — | Burning 2 rounds | Burning 2 rounds; it spreads to foes next to each target; the ground under the target burns (a fire tile) |
| Storm | Ignores half cover | + chains to 1 more enemy within 2 tiles at half (no roll) | + 2 chains, and Shaken (Heart save) |
| Frost | Slowed (Body save) | Slowed (no save) | Slowed and Pinned 1 round (no save) |
| Stone | Armour counts in full, +10 damage | + Prone (Body save) | + rubble on the empty tiles around the target |
| Gale | Push 2 | Push 3 | Push 3, and everyone else within 1 of the target pushed 2 |
| Acid | Corroded (Body save) | Corroded (no save) | Corroded (no save), and Defense −2 more while it lasts |

- **Stage 0** carries no rider (Stone's armour counts half there). Raw: no rider.
- **The air shifts riders:** in Flooded air riders count one stage higher; in Thin air one lower (0 to 4).
- Pushes go away from you (a Burst's away from where it landed).

#### 6. Holding is gameplay

1. **The aura:** holding an elemental Outburst leaks it: enemies adjacent to you at the start of your turn take **5 Elemental** and the tone's **stage-1 rider** (shifted by the air). Holding next to enemies is a threat. Raw leaks nothing.
2. **Heart Overwatch:** while holding, turn on **watching** (free, Heart Overwatch). The first enemy who **enters your design's reach** in your sight (Ether: through walls) draws the release **as your reaction**, at the stage reached, aimed at it (an Aura around you). It uses your one reaction for the round.
3. **Resonance:** an ally who releases after another ally's release in the same round gets **+0.2 on the stage multiplier for each earlier ally releaser** that round, **at most +0.4 in total per release** (Leon, 8 Nov 2026) (the first release has already landed, so the bonus goes to the later ones). **Allies on the players' side only:** player characters and the units fighting with them (companions, the Twinbound twin) resonate; enemies never resonate with each other, never give it and never get it (item 549). In a Proving Ground team fight each team resonates within itself. You and your own twin don't resonate with each other (item 533).
4. **Feeding** (1 AP): absorb a glyph on your own tile (yours, an ally's or an enemy's; never a Keystone) into your held Outburst: **+1 stage**; the glyph is gone. The one bridge between the two magics.

#### 7. Shapes (forms) and showing them

| Shape | Area | Reach and aim | Damage | How |
|---|---|---|---|---|
| Bolt | one target at the aim | 4 tiles (Far: 8) + the Soul range bonus, in sight | ×1, rolls | default |
| Wave | a 3-tile cone from you toward the aim (Size: 4) | a direction | ×0.7, no roll | module |
| Burst | radius 1 around the aimed tile (Size: radius 2) | 4 tiles (Far: 8) + range bonus, in sight | ×0.7, no roll | module |
| Aura | radius 1 around you, all at once (Size: radius 2); your tile spared | none | ×0.6, no roll | module |
| Lance | a straight line of 4 tiles from you toward the aim (8 directions), piercing everyone on it (Size: 6); walls and cover stop it | a direction | ×0.8, rolls each | module |

- **Who is reached:** Damage, Control and Status reach **everyone in the area but you** (friendly fire); Buff reaches **allies only** (you too in an Aura); Inverse damage shields allies only. The cone uses the same test as Sigil's (within its length, about 45 degrees of the line to the aim); areas need sight from their centre unless Ether.
- **Design cards** carry a shape icon and read like "WAVE · cone 3 from you · Fire" (a Wave and a Lance start at you: their size is their reach, so they name no separate reach; a Bolt or a Burst card reads "BOLT · one target · reach 4 · Raw").
- **The preview standard (as Sigil 1.4's "What the player must see"):** before a Begin or a Release, and while holding, the grid shows the **reach ring**, the **tinted area**, **everyone affected** (allies and enemies marked) with **expected numbers after the multipliers and armour**, the **roll's chance** where it rolls, the **saves** with their TNs, **this stage's rider** in words, the AP, MP and **Strain after** with the **burn** (8 a point over) and **Short** warnings, and **Resonance** when it applies. The engine's `previewOutburstPlan` is the one source; the screen never computes its own numbers.

**Modules under 1.5** (soul_modules.json; old designs convert on load):

| Module | 1.5 |
|---|---|
| Move (Far) | survives: Bolt and Burst reach 8 |
| Homing | survives: +2 to the roll, ignores half cover |
| Swift | changed: Begin 1 AP |
| Ether | survives: no sight needed; absorbs Teleport |
| Right, Left | survive: the Status save family |
| Time | survives: conditions +2 rounds (the "half again next turn" damage is gone) |
| Inverse | survives: damage becomes a shield on allies |
| Size | changed: a shape +1 (Lance +2); a Bolt can't take it |
| Random | survives: the aim picked among creatures within reach |
| Impact | survives (no effect: the default) |
| At Once | survives: a Bolt or Lance with no roll, half damage |
| **Wave, Burst, Aura, Lance** | **new: the shapes** |
| Rain | **replaced by Burst** (Rain + Size → Burst + Size) |
| Size alone on a single target | **becomes Burst** |
| Teleport | **retired into Ether** |
| Duplicate, Bounce, Periodic, Proximity, Expire, Mastery | **retired** (shapes and Storm's chains, Fire and Acid over time, Heart Overwatch, holding, stages) |

A 1.2 held Outburst keeps its stage (stage *n* under 1.2 was × (1 + 0.5 × (*n* − 1)); it is read at the 1.5 table from now on).

#### 8. Storm Hand (rules 1.5)

1. **Charged by Battle:** each **melee hit** gives 1 Charge (max 3), not each kill (Leon: "need to be ATTACK").
2. **Gauntlet Infusion:** melee hits carry the infused element's stage-1 rider with its effect and sound (Fire: Burning 1 round on a critical, else +5; Shock: chains to one adjacent enemy for half; Freeze: Slowed, Body save; Spark: +1 AP on a kill), plus the existing +10 Elemental for 5 MP.
3. **Discharge:** spend all Charges with a melee hit: everyone adjacent takes 20 Elemental per Charge and the element's stage-N rider (N = Charges; fire Fire, shock Storm, freeze Frost from the table above; Spark none), with full effects and screen shake. The discharging hit gains no Charge.

#### 9. Effects and sounds

- **Pump:** a heartbeat thump and a violet ring pulse from the chest; pitch and brightness rise with each stage; at stage 4 the screen edge throbs. **Begin:** a breath in and the heart lights. **Swell:** a slow beat at turn start.
- **Holding:** the token's heart glows by stage; an elemental aura ring (embers, static, frost mist, dust, wind, acid drip) around the token; aura ticks flash on adjacent enemies.
- **Release:** per shape (bolt, wave, burst, aura, lance), Soul style per element (the Sigil 1.4 element module, family 'soul'). **Heart Overwatch:** a sharp gasp and the release snaps out of turn. **Resonance:** two hearts beat in sync, a linked ring. **Feeding:** the glyph's cyan squares drawn into the violet heart. **Mana Short:** the heartbeat stops, the screen desaturates, silence, then a crack. **Calming and Steady:** a long exhale and the glow cools. **Let go:** a violet sigh.

#### 10. Resources on screen (all classes)

Every class resource shows **below the HP bar** in the combat You card, the area-map HUD and the turn cut-in, large and labelled: ammo (loaded / spare, the ammo type), Evoker charge and spare cores, Flux, MP, **Strain (with its limit)**, **the held Outburst (design, stage, tone)**, Momentum, Charges, Devotion, Guard, Heat, and any other class or perk resource the runtime tracks. Each is a bar or pips with its name in words and a colour per the colour system, and a clear warning state (EMPTY, RELOAD, OVERLOAD SOON, OVER THE LIMIT). The cut-in shows every row too, two columns past four (item 548). (Leon: testers asked "where does it say I need to reload my Sigil core? Oh, it's that 10 px line.")

#### 11. The Soul classes, perks and unlocks under 1.5

Every Soul move that read 1.2 behaviour is re-derived on the heart cycle (items 522–540, all PROVISIONAL). Engine: `classes/i.ts`, `classes/j.ts`, `classes/k.ts`, `classes/soul.ts`, `perks/d.ts`, `perks/skills.ts`.

| Move | Rules 1.5 |
|---|---|
| **Shape** (Channeler I) | Your first Pump each turn that would cost AP is free, on a Damage design. Empathy's free Pumps go first. |
| **Storm Front** (Channeler II) | +10 MP at Begin, once a turn: once a Damage **Bolt or Lance** has landed, it arcs on to up to 2 more enemies within 2 tiles of the first creature it hit (else the first in its area, else the aim; outside its area), at the release's multiplier, one roll each (At Once: none, half), with the tone's rider. Wave, Burst and Aura can't take it. |
| **Heart Surge** (Channeler III) | Once a turn, a toggle on a Release or a snap: it fires **one stage higher** (a held one's stage really rises, rider too; past stage 4 ×2.6; a snap ×1). Double Strain: the Begin's Strain again (1, Flooded 2) once the release has landed. |
| **Sanctuary** (Guardian III) | Halves all damage to allies inside but your own heart's burn. |
| **Drink It In** (Guardian II) | An elemental Outburst feeds its MP price like a Raw one (it is told from a Sigil by the MP it carries). |
| **Gift** (Bard III) | The ally pays 3 AP (Begin and Release); it goes off at **stage 1** on the Bard's MP (the design's full price) and a Begin's Strain (+2 without an Emanator). |
| **Fed** (Heartfed) | −10% MP a point of the key gauge at Begin. **Feed a feeling** (0 AP, 2 a turn): spend 1 point for a Pump that costs no AP. Release empties the gauge. No damage bonus. |
| **Overflow** (Heartfed) | The keyed Begin is held at stage 2 at once (no Strain on it). |
| **Through** (Heartbinder) | Snap-cast or Release from a linked ally's tile: range, sight and the shape (cone, line, aura) run from there. |
| **Share** (Heartbinder) | Also: Strain that would take a linked ally over their limit comes to you (as far as your own limit allows); **Take their Strain** (1 AP, once a turn) moves up to 2. |
| **Inner Charge** (Vessel) | 2 AP, 20 MP, 1 Strain. Forms start at stage 1 and read the 1.5 table (×1 / ×1.4 / ×1.8 / ×2.2), swell each turn (1 Strain each) and can be **Pumped** (1 AP or an Empathy free Pump). No slipping. |
| **Release** (Vessel) | 15 Soul × each form's stage multiplier, summed, × the Soul multiplier (no 8-stage cap). |
| **Call** (Twinbound) | The twin has **its own heart**: it Begins, Pumps, holds (swelling on its own turn) and Releases its three designs with the engine's Soul actions, at its own stage. Your MP, your Strain (a Short of yours darkens its held one). You may each hold one. You and the twin don't resonate with each other. |
| **Heart's Own** (Devoted) | The +2 limit lasts while a Beloved spell is begun or held; the plain limit is back at your turn's end once it is gone. |
| **Love Made Manifest** (Devoted) | Once a fight, a Beloved Outburst **Begins at stage 4**. (1.2's ×3 would reach ×6.6.) |
| **Fusion** (Circuit Mage) | Each creature the Sigil reaches takes the Outburst as a Bolt, at stage 0 or its held stage. |
| **Heart Overload** (perk) | Rewritten in rules 1.14 (see "Rules revision 1.14"): a free Begin after a Release; paying in HP is its fallback. |
| **Resonance** (perk) | Rewritten in rules 1.14 (see "Rules revision 1.14"): your own Releases build on each other; allies' Releases count at tier II. |
| **Twin Souls** (perk) | The third school is a half-strength rider with its own option and no roll, on the release's area by its own reach rule; it lands after the primary hit (on whoever is still standing). |
| **Twin Discipline** (perk) | Each creature the Sigil covers takes the held Outburst as a Bolt. |
| **Verse of War** (perk) | "In verse" rides a Release too (+1 reach, ×1.1). Its ×1.1 reaches elemental Outbursts. |
| **The Twin Pays** (perk) | No AP for the Begin (since 11 Nov 2026), no MP, no Begin Strain, no swell Strain. A free heart swelled to stage 4 once a fight. |
| **Hollow Heart** (trait) | When your own heart's burn Downs you, you are stable; **a Mana Short doesn't Stun you**. +10% reaches elemental Outbursts. |
| **Overdraw** (Will Power 3) | Rules 1.14: once a turn, a Pump adds 2 stages (from stage 2 or lower). The first Overdraw of a fight costs no Strain; each one after it +1 Strain. |
| **Pure Heart** (Will Power 5) | Once a fight, the first Strain that would short you is refused: Strain falls to your limit, no Stun, no wild release. |

#### 12. Rules 1.8: Outburst 4.0, remembered spells felt live

> **Rules revision 1.8 (Outburst 4.0, accepted direction 9 Nov 2026; decision 109; design `docs/design/outburst-4.0-spec.md`).** It keeps everything in sections 1–11 and adds **feelings** poured in live while you pump (*how* the remembered spell feels this time), **many more modules** with **guaranteed ways to unlock them** (*what* you can remember), takes **Visualization out of Soul magic**, and fixes low-level play. Sigil you **show** (you draw, and the world obeys the drawing; it lives on the map); Outburst you **hold** (you remember a spell and feel it, and the world obeys the heart; it lives in the caster). **Every number is provisional** (items 801–818) until the damage balance pass. Data: `data/feelings.json` (the 25 feelings), `soul_modules.json` (revision 18: the new modules, gates, the starting templates). Engine: `magic.ts` (the cycle) and `feelings.ts` (triggers, residue, practice).

**1. Visualization leaves Soul magic** (Leon: "it's a Mind skill").
- The first tone is free at **Lore Master 1** (was Visualization 1): picked with the starting design or the first toned design. More from tutors, plates and the Narrator, as before.
- A toned Outburst uses the **Soul multiplier only**, never the Elemental one (Expression and Visualization). Storm Hand's Infusion and Discharge, which run through an Emanator gauntlet, also use the Soul multiplier (item 802). Sigil keeps the Elemental multiplier; Visualization stays a Mind skill (Sigil forms, the Elemental multiplier, the Trickster).

**2. The stage table and the snap cast.** Stage 0 is now **×0.8** (was ×0.6): **0 → ×0.8, 1 → ×1, 2 → ×1.4, 3 → ×1.8, 4 → ×2.2**. A snap cast (Begin and Release at once, 3 AP) and a Begin released straight away are the same thing at ×0.8 (item 803).

**3. Feelings.**
1. **Pouring one in.** While you hold an Outburst, each **Pump** (1 AP, or a free one) is **plain** (+1 stage, as before) or a **feeling pump**: +1 stage and one feeling you know. A feeling pump has **its own step** on the multiplier instead of the plain +0.4: the release's multiplier is the stage table's, plus (step − 0.4) for each feeling pump (item 804). Stages from the swell, Feeding, Overdraw and Heart Surge are plain. Up to stage 4, as now. Feelings stack with themselves (Rage, Rage, Rage is three Rage steps) and combine freely with each other, the tone and the modules, each rider by its own rules ("lightning love" heals the allies it touches and chains by Storm's rule, healing along the chain).
2. **Behaviour changes are real.** A feeling's behaviour joins the spell at the release (the table): Love on a Damage design also heals the allies inside its shape, and spares them the damage; Joy chains; Calm can't miss. A feeling poured in twice applies its behaviour once (its step counts twice) (item 806).
3. **Residue.** On a Release, the **strongest feeling poured in** (the most pumps; ties go to the latest) leaves **residue** on every tile the release covered (a Bolt: the tile it struck) **for 2 rounds**. **Helping** residue (Love, Hope, Belonging, Calm, Relief, Mercy, Joy, Guilt, Wonder, Defiance) works for the caster's side only. **Harming** residue (Rage, Grief, Fear, Spite, Shame, Despair, Cruelty, Dread, Contempt, Abandon) works on **anyone** who stands there, the caster's side too. "A turn" effects land at the start of the turn of whoever stands on the tile; "on entry" effects when a creature steps in; the rest hold while it stands there. A tile holds one residue; a newer one replaces it (item 807).
4. **Revert Pump** (0 AP): undoes your **last pump this turn**, refunding its AP, the free Pump it used and the Strain it added. Repeat to undo more, back to the start of your turn. It can't undo the swell, a Feed, or a pump that set off a Mana Short (item 808).
5. **Learning them: you feel it first.** A feeling **unlocks the first time its trigger happens to you** (the table); the engine detects every trigger, and the Narrator may grant one at a story moment as a bonus. Every Soul caster **starts with 2 feelings** of their choice (default Rage and Love). Unlocks are permanent: a log line and a card say "You have felt Grief. You can pour it in now." Only characters who can cast Outbursts (a design or a known school) feel (item 809).

| # | Feeling | Unlocked when the engine sees… | Step | Poured in, it… | Residue |
|---|---|---|---|---|---|
| 1 | Rage | you take 25% of your max HP or more in one hit | +0.5 | hits harder; +1 Strain to you at the pump | harms: 5 Soul damage a turn |
| 2 | Grief | an ally goes Down or dies | +0.3 | targets hit are Slowed (Body save) | harms: Slowed a turn (no save) |
| 3 | Fear | a fight with an Elite or Boss starts, or you're made Afraid | +0.3 | targets hit are pushed 1 and Shaken (Heart save) | harms: Shaken on entry (Heart save) |
| 4 | Love | you heal or shield an ally | +0.3 | the shape also heals the allies inside it by the release's power × 0.5, and spares them its damage | helps: heal 5 a turn |
| 5 | Joy | you roll a natural 20 | +0.3 | chains to one more enemy within 2 of the first hit, at half, no roll | helps: +1 to rolls |
| 6 | Calm | you end a turn having Steadied, or with 0 Strain | +0.3 | ignores cover; a Bolt or Lance can't miss (no roll) | helps: Strain −1 on entry |
| 7 | Spite | an enemy damages you | +0.4; +0.8 against whoever last hurt you | revenge | harms: 5 a turn to whoever hurt you last |
| 8 | Shame | you roll a natural 1, or a vow breaks | +0.6 | 5 true damage to you on release | harms: −1 to rolls |
| 9 | Pride | you take down an Elite or Boss | +0.2 a stage reached | rewards big casts | none |
| 10 | Despair | you drop below a quarter of your max HP | +0.1 per 10% of max HP you're missing | stronger near death | harms: Weakened a turn |
| 11 | Hope | you get back up from Downed | +0.3 | allies in the shape (and you) lose Afraid and Shaken, and their next roll is +2 (Hopeful) | helps: +2 to saves |
| 12 | Mercy | a foe surrenders to you because of you (you accept it) | +0.2 | Downs instead of killing; a target hit at a quarter HP or less makes a Heart save or surrenders | helps: the Downed are stable |
| 13 | Cruelty | you hit someone Downed or helpless (Stunned, Pinned, Grappled) | +0.4 | adds Bleeding (no save); Bleeding spreads to one enemy next to the target | harms: Bleeding |
| 14 | Loneliness | you're the last of your side standing | +0.2, +0.3 more with no ally within 3 | the lone caster's power | none |
| 15 | Belonging | you stand with 3 or more allies within 2 | +0.1 per ally within 3 (up to +0.5) | counts twice for allies' Resonance this round (the +0.4 ceiling stands) | helps: +1 Defense |
| 16 | Dread | an attacker who was Hidden hits you, or a trap or hazard goes off on you | +0.3 | targets hit lose their reactions this round and their Overwatch (item 817) | harms: no reactions |
| 17 | Awe | a Miracle or a Grand form happens in your sight | +0.3 | targets hit lose 1 AP next turn | none |
| 18 | Longing | a scene starts with your linked ally gone (or the Narrator grants it) | +0.3 | +2 reach; pulls targets hit 1 toward you | none |
| 19 | Relief | a fight you win ends with no ally Down | +0.2 | the Strain this hold added (Begin, swells, feelings) is given back at the release | helps: Strain −1 on entry |
| 20 | Contempt | an enemy gives up while you were its last attacker | +0.3 | targets hit take −2 to attack you (Scorned, 2 rounds) | harms: −2 to attacks |
| 21 | Guilt | you damage an ally | +0.3 | heals the ally you hurt last by 10 × the stage; 5 true damage to you | helps: heal 5 a turn |
| 22 | Jealousy | an ally takes down a target you damaged this round | +0.3 | steals one boon or the shield from the first enemy hit, to you | none |
| 23 | Wonder | a hidden thing is revealed to you, or you reach a zone for the first time (or the Narrator grants it) | +0.2 | reveals Hidden creatures, traps and hazards in its area | helps: spot Hidden things within 3 |
| 24 | Defiance | you resist an Overreach, or pass a save against Fear | +0.3 | can't be resisted (no saves on its conditions, pushes and riders); your next save passes | helps: immune to Fear |
| 25 | Abandon | you indulge an Overreach | +0.8 | +2 Strain to you at the pump | harms: a random condition on entry (Slowed, Weakened, Shaken, Confused or Bleeding; no save) |

*Abandon is "Surrender" in the brainstorm, renamed because "surrender" is already a combat word.*

**4. Modules: many more, gated by Soul skills, the strongest by advanced class.** Today's 16 stay (Move, Homing, Swift, Ether, Right, Left, Time, Inverse, Size, Random, Impact, At Once; the shapes Wave, Burst, Aura, Lance). New, for everyone (item 810):

| Module | Gate | What it does |
|---|---|---|
| Split | Empathy 2 | a Bolt also strikes the nearest other creature it can reach within 2 of the aim (the same side rule), at full power |
| Ricochet | Lore Master 4 | a Bolt needs no line of sight and ignores half cover when a wall or cover tile lies within 2 of the aim (a bank shot) |
| Fuse | Lore Master 4 | the release lands and waits: it goes off at the start of your next turn, or when a creature steps into its area, whichever is first |
| Return | Lore Master 4 | a Bolt or Lance goes out and comes back: each target is struck twice (each strike rolls) |
| Volley | Will Power 4 | a Bolt becomes 3 small bolts at the aim, each ×0.4, each rolling |
| Bloom | Will Power 4 | a Burst or Aura grows +1 radius a stage reached |
| Anchor | Implication 2 | targets hit are Pinned 1 round (Body save) |
| Lure | Implication 2 | targets hit are pulled 2 toward you |
| Shell | Camaraderie 2 | you gain a shield of the release's power × 0.5 as it leaves |
| Linger | Implication 2 | the area stays as a field for 2 rounds: a creature of the side it works on that starts its turn there takes 5 (Damage, + the tone's stage-1 rider) or heals 5 (Buff) |
| Quiet | Will Power 2 | the hold's Strain (Begin, swells, feelings) is halved, rounded down; the release ×0.8 |
| Silent | Composure 2 | Begin, Pump and Release don't reveal you while Hidden |
| Thread | Camaraderie 2 | a Buff release threads the first two allies it reaches: the next heal on one heals the other as much (once) |

**Gated to advanced and hybrid classes with Soul (Leon)**, shown locked with their class and unlocked when the class's batch goes live (`class-roster-rev3-proposal.md` section 7): Echo and Cascade (Heartfed), Tether (Heartbinder), Siphon (Hexer), Phantom (Shade), Orbit (Banner Dancer), Volatile (Storm Hand), Bastion (Adamantile Knight), Judgement-mark (Inquisitor), Halo (Saint). Their texts are in `soul_modules.json`; the engine refuses them until then.

**Gating by Soul skill** (never Visualization). A module needs **2 points in its gate skill**, or **4 for the second tier** (Bloom, Volley, Ricochet, Fuse, Return), to be learned by practice, a Mastered pick, a plate or a tutor; the Narrator's grants and the Proving Ground ignore gates, and a module already known stays known (item 811).

| Skill | Gates |
|---|---|
| Lore Master | structure and the strange: the shapes (Wave, Burst, Aura, Lance), Time, Ether, Fuse, Return, Ricochet (and Phantom) |
| Will Power | power and Strain: Impact, Size, Bloom, Volley, Quiet |
| Empathy | the design itself: Move, Random, At Once, Split (and ready designs, as now) |
| Camaraderie | ally modules: Inverse, Thread, Shell |
| Implication | status modules: Anchor, Lure, Linger |
| Composure | precision: Homing, Swift, Left, Right, Silent |

**5. Guaranteed ways to unlock modules** (Leon: the Narrator granting one is a bonus, not the only way).
1. **Practice** (the engine keeps it on the character): each Release you make earns **1, +1 per stage reached past 1, +1 per feeling poured in** (a wild release earns none). At **5** practice you pick a new module your gates allow, at **15** the second, then every **+15** (30, 45, …). A practice bar sits on the Magic tab. Picks are made out of combat (`magic/pick`).
2. **Mastery:** each Mastery level (3/5/7/9) in a gate skill (Lore Master, Will Power, Empathy, Camaraderie, Implication, Composure) adds **+5 practice**, as well as its perk step; **Mastered (10)** in one grants **one free module pick** from the modules that skill gates (item 812).
3. **Bonus sources:** tutors, Heart plates and the Narrator's grants, as before.

*Pen and paper (later):* the tabletop version replaces practice with one module pick per level-up for Soul casters, alongside the Mastery picks. Not built.

**6. Low level: no more three sessions of "magic bolt 1"** (item 813).
- A new Soul caster starts with **3 remembered designs**: the starting kit's **Heart Bolt** (Damage, Bolt, Move: reach 8), **Mend** (Buff heal, Bolt) and **Heart Wave** (Control push, Wave); a design picked at creation takes the first one's place. They know the Damage, Buff and Control schools, the shape Wave and the module Move (the old default cantrip's), and the module they picked. Ready designs are at least 3 (3, or 2 + floor(Empathy ÷ 2) when that is more).
- **2 feelings** of their choice, **one tone** at Lore Master 1.
- **Snap cast ×0.8.**
- **The first Pump each fight is free**, before Empathy's free Pumps.
- **Starting templates** in the workshop: one-click designs (`soul_modules.json` `templates`), so nobody faces an empty builder.

**7. Classes re-derived.** Shape's free Pump works on feeling pumps too. Heart Surge's extra stage is counted after the feelings (a plain stage on top). Occult Library's tone is now at Lore Master. Eye of the Storm's "no Strain" covers feelings' Strain. The Heartfed's gauges (Rage, Grief, Fear, Devotion) map onto the feelings of the same name when the class returns.

### Magic advanced classes (draft)

Six new advanced classes join the 15 (21 in all). The rules for learning one don't change: 15 in one parent's signature skills, 9 in the other's, and a tutor.

**Glyph Mason** (Mage + Warden; tutor: the scholar halls). *"The old masons cut words that are still burning."* Draws with a mason's chisel that counts as an Evoker.
- **Keystone** (2 AP + 1 standard core): cut a glyph on your own tile instead of drawing it. It never fades, can't be scuffed, doesn't count toward your glyph limit and survives being Evoked. It stays in that zone until you cut another (one at a time).
- **Survey:** you and your allies can Evoke a pattern that holds your Keystone from up to 2 tiles away, and it costs 1 charge less.
- **Foundation** (once per scene): this turn, glyphs you draw within 2 tiles of your Keystone cost 0 AP.

**Grand Sigilist** (Mage + Defender; tutor: the southern sects). *"Write it big enough and the floor believes it."* Draws with a staff that counts as a two-handed Evoker.
- **Enlarge** (3 AP + 3 charge, once per combat): plant the staff on a tile and enlarge one word you know into its **Grand form** over radius 2 around the staff for 3 rounds + duration bonus (table below). While the staff is planted you can't draw or Evoke; pulling it out (1 AP, adjacent) ends the Grand form.
- **Empty Hand:** with empty hands, unarmed strikes deal 20 Physical for 2 AP, and you get +2 Defense.
- **Earthed:** inside your own Grand form you ignore its harm, and your unarmed strikes carry its element.

| Word | Grand form | Word | Grand form |
|---|---|---|---|
| FIRE | Lava floor: 10 fire damage on entering or starting a turn inside; Burning on a failed Body save | BLIND | Fog: no one inside sees beyond 1 tile |
| FREEZE | Ice sheet: difficult ground; a Body save each move or fall Prone | SLOW | Mire: Movement halved inside |
| SHOCK | Storm field: 15 damage at turn start to anyone in Medium armour or heavier; robots Stunned | MUDDLE | Maze: Brain save at turn start or stagger 1 tile in a random direction |
| STONE | Earthworks: up to 4 half-cover pillars rise where you choose | DREAD | Haunting: enemies inside are Shaken (Heart save each turn) |
| GALE | Cyclone: anyone entering is pushed 2 tiles outward; shots through it −5 | VEIL | Smoke field: blocks all sight; everyone inside counts as Hidden |
| SPARK | Static: attack rolls of 1−3 inside jam the weapon | LIGHT | Noon: Hidden revealed; enemies inside −2 to hit |
| WARD | Dome: allies inside +2 Defense and a 20 shield at each turn start (does not stack) | SILENCE | Dead zone: no Sigils, Outbursts or prayers inside, yours included |
| MEND | Spring: allies starting a turn inside heal 10 × Healing multiplier | CONDENSE | Crush: enemies starting a turn inside next to another creature take 10 Sigil damage |
| BIND | Tar: Pinned on entering (Body save) | SPREAD | Bloom: a spell your side lands inside also deals 10 Sigil damage to every enemy inside it didn't hit |
| PUSH | Gust: enemies starting a turn inside are blown 1 tile outward, away from the staff | PULL | Vortex: enemies within 4 tiles are pulled 1 tile toward the staff at their turn start |
| STAY | Stasis: conditions inside do not tick down | SEEK | Hunting ground: allies' attacks on enemies inside ignore half cover |
| TWICE | Echo field: the first spell your side lands inside each round rings again on the enemies it hit, at half its damage per target (5 at least) |  |  |

Rules 1.4: RETURN is gone, and so is its Grand form (Sanctuary). The 17 words new in 1.4, redesigned in the Grand form pass so that each has its own job (items 582–586, provisional; SPREAD, TWICE, CONDENSE and PUSH above were changed in the same pass):

| Word | Grand form | Word | Grand form |
|---|---|---|---|
| ACID | Etching ground: cover inside (crates, low walls, pillars, earthworks, walls) loses 15 HP at each round start and crumbles at 0; your side gets +2 to hit enemies inside | ARC | Mortar pit: at the start of each of your turns the staff shells the tile within 6 of it that catches the most enemies: 15 Sigil damage there, 5 to enemies next to it. It reaches out of the zone |
| COMMAND | Parade ground: enemies starting a turn inside make a Brain save or halt: Pinned for that turn (no moving; they can still act) | SENSE | Second sight: Hidden enemies within 4 tiles of the staff are revealed at each turn start |
| QUICKEN | Quickstep: allies (not you) starting a turn inside get +1 AP that turn, within the AP ceiling of 9 | RELAY | Relay net: your side's attacks from inside get +1 to hit for each other ally inside with a line to the target (+3 at most) |
| SHARPEN | Whetstone: attacks your side makes from inside deal +5, or +10 with melee and unarmed strikes (you included) | WAIT | Minefield: every enemy, the first time it enters each round, takes 10 Sigil damage and its walk stops |
| CLEANSE | Clear water: allies starting a turn inside lose their newest harmful condition | WATCH | Sentinel: at the start of each of your turns the staff strikes the nearest enemy inside for 15 Sigil damage; an enemy leaving the zone takes a 10 strike, once a round each |
| STEP | Fold: for your side, a move that starts and stays inside costs 1 AP at most, however far | CHAIN | Conductor: when your side hurts an enemy inside, 10 lightning damage arcs to the nearest other enemy inside within 3 tiles (once a round for each enemy it reaches) |
| RAISE | Ramparts: up to 8 wall segments rise on the edge ring (every other edge tile, never on anyone): solid, 30 HP each; they fall with the form | LEECH | Bloodwell: each hit your side lands on an enemy inside heals the one who landed it 5 (once a round for each attacker and enemy) |
| NULL | Clean ground: placed Sigil magic inside (glyphs, fields, traps, turrets, smoke, light, walls; not Keystones) is wiped when it goes up and at each round start, and no glyph can be drawn inside, yours included | KIN | Sanctum: allies inside take no damage from your side's spells and attacks |
| MASK | Hall of masks: enemies outside can't target your side inside from more than 3 tiles away |  |  |

Every Grand form is drawn on the grid for everyone: its word's ground look and tint on each tile, a bright edge ring, the planted staff with a ◎ badge (word and rounds left), and its line in each tile's tooltip. It ends with its fight; one planted on the area map stays there until it runs out or the staff is pulled.

**Heartfed** (Channeler + Hexer; tutor: Arkvelton). *"Every feeling in this room is fuel. Yours too."*
- **Four hearts:** you carry four gauges, 0 to 5: **Rage** (+1 per 20 damage you take), **Grief** (+2 when an ally is Downed, +5 when one dies), **Fear** (+1 at the start of a fight with an Elite or Boss, +2 when you're Shaken), **Devotion** (+1 when an ally heals or buffs you). Each design you make is keyed to one of them.
- **Fed:** your Outbursts cost 10% less MP per point in their key gauge, at Begin. **Feed a feeling** (0 AP, twice a turn): while you hold a keyed Outburst, spend 1 point of its gauge for a Pump that costs no AP. Releasing it empties that gauge. No damage bonus (rules 1.5; the 1.2 "10% harder" is gone).
- **Overflow** (once per scene): when a gauge reaches 5, your next Outburst keyed to it Begins held at stage 2 (the stage itself) with no Strain on that Begin.

**Heartbinder** (Channeler + Medic; tutor: Bazaim). *"Bazaim knows what love lifts. We just learned to aim it."*
- **Link** (1 AP): bind your heart to one ally within 6 tiles (two from Will Power 5) for the scene, or until you're Downed.
- **Through:** your Outbursts can Begin or Release from a linked ally's position; buffs you receive reach them at half.
- **Share** (your reaction): when a linked ally takes damage, take up to half of it yourself. Heals you send through a link are ×1.25. If a linked ally is Downed, you take 2 Strain.

**Vessel** (Channeler + Defender; tutor: Kemizuchi). *"The heart only knows one spell: me."* Can't design or cast Outbursts. Keeps MP, Syphon and Strain, and charges the body instead.
- **Inner Charge** (Begin's 2 AP, 20 MP, 1 Strain): take one body form and hold it like an Outburst. It starts at stage 1 and reads the 1.5 stage table (×1, ×1.4, ×1.8, ×2.2), swells a stage at the start of each of your turns (1 Strain each) and can be **Pumped** (1 AP a stage, or an Empathy free Pump), up to stage 4. Forms: **Iron** (armour +10), **Surge** (melee and unarmed damage +15), **Swift** (+2 Movement), **Pain to Power** (+1 AP next turn per 20 damage taken, up to +2), **Steady** (can't be knocked Prone or pushed; +2 Body saves), **Heartbeat** (heal 10 at turn start). The form's number × its stage multiplier. Hold **at most 2 forms** at once, whatever your Will Power (item 550).
- **Release** (1 AP, or free with a melee hit): end every form at once in one strike: +15 Soul damage × each form's stage multiplier, summed, × your Soul multiplier (rules 1.5; no cap).
- **Empty Hand:** unarmed strikes deal 20 Physical for 2 AP.

**Twinbound** (Channeler + Trickster; tutor: Arkvelton). *"Everyone has a twin on the other side. Mine got bored of waiting."* The EPCCG's Outbursts pull across the bond between your soul and its twin in the upper realm; the Twinbound's twin leans through.
- **Manifest** (once, out of combat): design your **Twin**: its look (a portrait card) and three built-in Outbursts from schools and modules you know. They are fixed.
- **Call** (2 AP): the Twin appears within 3 tiles. It takes its own turn right after yours with 4 AP: move, work its built-in Outbursts with **its own heart** (it Begins, Pumps, holds, swelling at the start of its own turn, and Releases at its own stage with the engine's Soul actions; paid from your MP, Strain to you, and a Mana Short of yours darkens its held one; you may each hold one, and you and the twin don't resonate with each other), or **Guard** you (it takes the next hit aimed at you while within 1 tile). HP 50% of yours, your Defense, Movement 1.5, your Will Power for its rolls. It can't go more than 6 tiles from you.
- **Bond:** if the Twin drops to 0 HP it vanishes and you take 3 Strain; call it again next scene.
- In game text it is only ever *the twin*. It never speaks of the upper realm (the Knowing).

**The old classes under the new Sigil rules (rules 1.4; full list and engine notes in `docs/design/sigil-1.4-impact.md`).** Every glyph is drawn on its caster's own tile, one to a tile, and spells are Lines. Blade Scribe's Sword Form and the Evoker blade's Edge Word draw their glyph on your own tile as part of the strike. Siege Engineer's barricade becomes full cover with a STAY glyph on a tile next to it. Warden's cover rune is still a lone STAY glyph Evoked on its own (the class's exception to the Line), from a tile next to it. Spellslinger's and the Scribe's stored spells hold words, not shapes: a stored spell goes off at the shot's target (Spellslinger) or from the object's tile with its own Reach, all around (Scribe). Stroke Gambler's half-glyphs fall on your own tile and complete as a Line of half-glyphs, or as a Stack of two on one tile (the two-glyph hook's first holder, item 464). Glyph Mason's Keystone is cut on your own tile and counts as a glyph of the Line it sits in. Mage's Barrage still cuts element words' charge; Overcharge lets one spell hold a word beyond your Max Sigil words, never beyond 4 glyphs. Circuit Mage's Fusion joins the non-Subject words (Reach, Delivery, Burst, Filter) to a Soul school (item 466). The Grand Sigilist's Enlarge reaches all 40 words (item 468).

### Patrons and prayer (rules 1.6, Blessing 2.0)

> **Rules revision 1.6 (8 Nov 2026; design `docs/design/blessing-2.0-spec.md`, decision 102).** Faith is a relationship:
> someone is watching. Sigils own space, Outbursts own time and the body, Blessings own a relationship and are paid for
> with obedience (vows, rites, taboos). Every number here is PROVISIONAL (section 14, items 592–629). The patron's mood
> (the old prayer TN) is retired. The data is `patrons.json` (version 2); the engine is `faith.ts`.
>
> **Rules revision 1.6.1 (Faith 2.1, 9 Nov 2026; design `docs/design/faith-2.1-spec.md`, decision 107; Leon's rulings
> of 8–9 Nov).** Devotion is earned as **Devotion XP**, the caps on tags live on the character (the area map can't farm
> them), the Narrator moves XP within a session cap, leaving a pact has a 90-day cooldown on a new **day counter**, and
> the patron you leave for another may hold a **grudge**. Every number is PROVISIONAL (section 14, items 701–723).
>
> **Rules revision 1.6.2 (Miracle 2.1, 9 Nov 2026; Leon's ruling: "Buff all miracles to deserve the title, miracle only
> at 10 and it reduces your devotion by 5").** A Miracle needs **Devotion 10** (and Faith 7, as before); it lowers
> Devotion by **5 levels** (10 → 5) instead of spending it all; and all eight Miracles are much stronger (the table
> below). Devotion 7 now opens Hymn III only. PROVISIONAL (section 14, items 724–736).
>
> **Rules revision 1.6.3 (Faith 2.2, "the god shows up", 9 Nov 2026; design `docs/design/faith-presence-spec.md`,
> decision 111; Leon's ruling: "Witnessed change to after a hymn, last forever until end of combat or the intervention
> trigger").** A successful Hymn (or a Miracle) makes you **Witnessed until the fight ends or your patron intervenes**;
> an intervention ends it; interventions are once a fight (twice from Devotion 7), their numbers grow with Devotion
> (20 + 4 × Devotion) and the Quartermaster's (a reload, a dry core, empty MP) and the Laughing Mask's triggers widen; a new voice-line bank, **grant**,
> is what the god says granting a Miracle. PROVISIONAL (section 14, items 738–746).

**Belief** (a step in character creation). Every character is **Faithful** (sworn to one patron of their Sector; all eight
below for the Earth Sector; Devotion starts at 3) or an **Atheist** (no patron, no Devotion; prays by dice: the pilgrim).
Belief is chosen at Faith 0; **praying at all needs Faith 3**. Old saves: a character with a pact becomes Faithful to that
patron with their current Devotion; one without becomes an Atheist.

**Devotion** (Faithful only) runs 0–10: your **standing**. You don't spend it to ask; asking is limited by cooldowns.
Each level needs **Devotion XP** (rules 1.6.1): the character keeps the total, the level is what the total reaches, and
events give or take XP, not levels. A loss can drop you a level, never below 0. The Faithful start at Devotion 3 (45 XP).

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Total XP | 0 | 10 | 25 | **45** | 70 | **102** | 147 | **200** | 270 | 350 | 450 |
| Step | | 10 | 15 | 20 | 25 | 32 | 45 | 53 | 70 | 80 | 100 |

The pace this aims at (checked by a simulation, items 717 and 726): Hymn I at creation, Hymn II (5) around sessions 3–4,
Hymn III (7) around sessions 8–10, full standing (10) and with it the first Miracle after 20 sessions, then a Miracle
about every 19 sessions (17–22 in the simulation: each one drops you to 5, and 5 → 10 is 348 XP at about 18 XP a session).

| Rises | XP | Falls | XP |
|---|---|---|---|
| An action carries a tag your patron likes | +1 (capped, below) | An action carries a taboo tag | −3, −6 while Witnessed |
| A vow kept | +3 | A vow broken | −5 |
| A rite kept (once per rite per session) | +4 | A failed overreach | −3 |
| Bringing someone into the faith (Narrator) | +4 | Breaking character where your patron can see (Narrator) | −6 |
| A deed the Narrator marks | +2 to +5 | Judgement (the Guardian's move) | −10 |
| Each knowledge piece of a new patron, on conversion | +1 level (XP to that level's threshold) | A Miracle | 5 levels: Devotion 10 → 5 (XP to 102) |

**The caps on tags.** Each liked tag counts **once per fight and once per scene** (a story scene: a new scene title starts
a new one). Liked tags give at most **2 XP a fight**, at most **2 XP a scene** out of fights (the area map counts as the
scene) and at most **6 XP a session** in all. Taboos aren't capped; every tag still counts once per action. Vows, rites
and the Narrator's moves don't count toward the tag caps. The caps are kept on the character, not on the fight's unit.

**What standing allows:** a Whisper at any Devotion; Hymn I at 3, II at 5, III at 7; a Miracle at Faith 7 and **Devotion
10**, once a session. A Miracle **lowers Devotion by 5 levels**, after its effect: the XP is set to the threshold of the
level 5 below (10 → 5: 102 XP), so the XP into the level is lost too (rules 1.6.2). **Overreach:** a Faithful may ask for their own patron's Hymn above their Devotion:
d20 + Faith modifier against 12 + 2 × (the gate − your Devotion). A miss: nothing happens, the AP is spent, −3 Devotion XP.
Within your standing a Hymn needs no roll. There is no overreach for a Miracle.

**The three sizes of prayer.** Every prayer drops the mana meter by 5. Silenced characters can't pray. Any prayer works in a
fight or in the story: out of a fight the engine applies what still has numbers there (heals, conditions on the squad) and
the Narrator narrates the rest.

| Size | AP | Limit | Who |
|---|---|---|---|
| **Whisper** | 1 | once a turn (once a round in the story) | anyone with Faith 3 |
| **Hymn** | 3 | the prayer cooldown (Derived stats; rounds) | the Faithful: their patron's Hymns; an Atheist: the Hymns they learned |
| **Miracle** | 3 | once a session | the Faithful at Faith 7 and Devotion 10 (Atheists never); lowers Devotion by 5 levels |

**Whispers**, the same six for every patron (the patron changes the look, the sound and the line): **Luck** (you or an ally
in sight: +2 on the next roll), **Health** (heals 15 × Blessing power), **Protection** (a 15 × Blessing power shield),
**Courage** (ends Fear or Shaken), **Guidance** (reveals Hidden enemies and traps within 6; +2 on your next notice roll),
**Safe Passage** (your next move this turn draws no opportunity attacks). **Hymns and Miracles** belong to each patron
(the table below). Effects are × Blessing power (damage, heals and shields; never rounds, AP, half HP or full HP).

**Witnessed** (Faith 5, the Faithful only; rules 1.6.3): a successful Hymn of your own patron, or a Miracle, makes you
Witnessed **until the end of the fight, or until your patron's intervention fires**, whichever comes first. While you are
Witnessed your attack rolls that would carry a tag your patron likes get +2, and taboo actions cost double Devotion XP
(−6). It is a fight condition: it never exists out of a fight (story prayers don't give it), and it shows as "WITNESSED ·
UNTIL THE FIGHT ENDS OR <PATRON> ACTS".

**Atheists and pilgrims.** An Atheist prays by dice: a Whisper is d20 + Faith modifier against 12; a learned Hymn I, II or
III against 14, 16 or 18. A miss: nothing happens and the AP is spent. **Knowledge pieces:** an NPC with Faith above 5 can
teach you about their patron; each lesson is one piece (the Narrator grants it), and each piece unlocks that patron's next
Hymn in order (I, then II, then III). Pieces from several patrons give a mixed kit. Atheists never get a Miracle and are
never Witnessed.

**Vows.** At the start of a fight, before you first act, any Faithful character may swear one vow (free). The engine
tracks it: broken, −5 Devotion XP at once; kept to the end of the fight, +3. The patron speaks a line either way.

| Vow | Broken when |
|---|---|
| **Shield** "None of them falls." (name an ally) | that ally is Downed |
| **Mercy** "I spare who yields." | you damage a surrendered or Downed enemy |
| **Stand** "I don't give ground." | you end a turn farther from the nearest enemy than you started it |
| **Bare Hands** "By my own hands." | you attack with a gun or a spell |
| **No Magic but Theirs** "No magic but theirs." | you draw, Evoke or Begin (Sigil or Outburst) |
| **Nobody Left Behind** "Nobody left behind." | an ally is still Downed when the fight ends |

**Tags: what your patron sees.** The engine tags actions in a fight and on the area map; a tag counts once per action
(and a liked tag once per fight and once per scene, within the caps above). Each patron likes 3 tags and holds 2 as taboo.

| Tag | When you… | Tag | When you… |
|---|---|---|---|
| protect | shield, Interpose, Brace, take a hit for someone | supply | reload an ally, give a stim or an item, place cover |
| heal | heal or stabilise someone else | hold | end a turn Braced, Anchored or in Overwatch |
| mercy | accept a surrender, or end a fight without killing a surrendered enemy | flee | leave a fight, or Disengage away from enemies |
| judge | kill or Down an enemy that harmed a surrendered or Downed creature this fight | desecrate | damage a shrine or holy ground (objects tagged holy) |
| kill | kill an enemy | betray | attack a creature on your own side |
| burn | deal Fire damage or set Burning | cower | end a turn Hidden while an ally is Downed |
| storm | deal Storm (lightning) damage | trick | hide, a Trickster move, a False Image, a feint or a swap |

**Conversion and the patron's rule about other gods.** The Narrator makes a pact (an Atheist converts): the new patron's
knowledge pieces turn into Devotion, +1 level each on top of the starting 3 (at most 10; the XP is set to that level's
threshold), and those Hymns are prayed by standing. Every patron is **Open** (you keep Hymns learned from other patrons
and pray them by dice; you may keep learning) or **Jealous** (on the pact every other patron's Hymn and piece is gone, and
you can't learn from other patrons).

**Leaving a patron** (rules 1.6.1; Narrator events). There are two ways out.

- **Apostasy** (walking away without joining anyone): Devotion XP 0, Devotion 0, you become an Atheist, and the old
  patron's Hymns stay as pieces, as many as the Hymn gates your Devotion had reached (at least 1). The patron says
  farewell. Then **nobody answers for 90 days**: a pact with any patron is refused until the day counter reaches the day
  you left + 90 ("Nobody answers yet: N days").
- **Leaving one patron for another** (a pact while Faithful) is not apostasy: no cooldown. The old patron's Hymns stay as
  pieces (counted the same way) unless the new patron is Jealous (then they are gone). The patron you leave decides how
  it takes it, from its data: an **Open** patron rolls d20 + your Faith modifier against its leave TN (10–12): on a
  success it lets you go; on a miss it holds a **light grudge** (1 session). A **Jealous** patron never lets go: always a
  **harder grudge** (2–3 sessions). Either way it says farewell. **A switch never raises Devotion:** the new pact starts at
  the lower of the Devotion XP you had and what a conversion would give (item 719), so a pact can't undo a Miracle's
  price, a taboo or a Judgement.
- **A grudge:** at the start of each fight you begin with the old patron's chosen condition for its rounds (no save), and
  your **new** patron's Devotion XP gains are multiplied by 0.5 (the old patron lobbies against you). It lasts the rest of
  the session it began in and the grudge's sessions after it; going back to that patron ends it, and so does apostasy
  (with no patron left there is nothing to lobby against; item 720). The condition lasts its rounds of your own turns
  whatever the initiative, and ends with the fight: it is never carried into the story (item 723).

| Patron left | Lets go | Grudge: condition at each fight's start | Sessions |
|---|---|---|---|
| Holy Father Nerukhan | never | Marked, 2 rounds (the saints point you out) | 3 |
| The Quartermaster | d20 + Faith vs 11 | Nausea, 1 round (your rations were docked) | 1 |
| The Laughing Mask | d20 + Faith vs 12 | Prone (something slippery at every curtain-up) | 1 |
| The Toll-Keeper | never | Slowed, 2 rounds (the river drags at your legs) | 2 |
| Mother Ember | d20 + Faith vs 10 | Shaken, 2 rounds (not angry, only disappointed) | 1 |
| Old Overcast | never | Dazed (thunder at your every entrance) | 3 |
| The Matchmaker | d20 + Faith vs 11 | Weakened, 1 round (no heart for it) | 1 |
| The Counting Weaver | d20 + Faith vs 12 | Pinned, 1 round (she keeps a knot of your thread) | 1 |

**The day counter** (rules 1.6.1). The game counts days from day 1: each **long rest** is a day, and the Narrator can
move time on with **days** (1 to 3650: travel, a time skip, years passing). A turn's rest and days come before its faith
events, so "three months later she swears to the Matchmaker" is one turn. Old saves start at day 1.

**Sessions** (rules 1.6.1, item 721). A room plays session after session: the host ends one with **Next session** (in
Rest… in the story, out of a fight) and the next begins at once. It counts as a long rest for recovery (not a day), Echo
goes back to 1, and everything once a session starts over: rites, the Miracle, the tag and Narrator caps, a grudge's
count. The Proving Ground has no sessions (its tools reset the limits); there the session's tag cap doesn't apply,
the fight's and the scene's do (item 722).

**Interventions** (rules 1.6.3). While you are Witnessed, your patron acts unasked when its trigger happens (the last
column of the patron table below), **and Witnessed ends**: to be watched again you need another successful Hymn. **Once
a fight; twice a fight from Devotion 7** (the second still needs a new Hymn first). Nerukhan's Soul, Mother Ember's heal
and Old Overcast's Storm are **20 + 4 × Devotion** (32 at Devotion 3, 48 at 7, 60 at 10), × Blessing power as every
faith number is. The Quartermaster answers three things: a reload of yours (free), your Evoker's core running dry (a fresh
core slots in, free) and your MP running out (25% of your max MP back). The engine emits one fx event per intervention.

**Rites.** Each patron has two: an **engine rite** (a story button: a confession or a challenge at any time out of a
fight, a vigil or a count after a rest, a ration given up) and a **Narrator rite** (marked kept by the Narrator). Each is
kept once a session for +4 Devotion XP.

**Voice lines.** Each patron has 3 lines for each event (answered, refused, taboo, vow kept, vow broken, Witnessed,
intervention, Miracle, conversion, farewell, and **grant**: what the god says granting a Miracle, calling the devoted by
name in capitals; rules 1.6.3), in its costume's voice. The engine picks one with the game's dice; the Narrator never
writes them.

**The eight launch patrons.** Each is a Celestial LARPing a god archetype; no real god is named, and none is a central
figure of a living religion.

| Patron | Likes | Taboos | Rule | Hymn I (Devotion 3) | Hymn II (5) | Hymn III (7) | Miracle (Devotion 10; rules 1.6.2) | Intervention |
|---|---|---|---|---|---|---|---|---|
| **Holy Father Nerukhan** (judge-saint) | judge, mercy, protect | betray, desecrate | Jealous | Saint's Shield: an ally gains a 40 shield | Judgement: an enemy takes 40 Soul; ×2 if it harmed the helpless | Absolution: an ally is cleansed of every condition and heals 30 | The Saints' Verdict: every enemy in sight takes 100 Soul and is Stunned 1 round; those that harmed the helpless this fight take double and are Stunned 2 rounds | an enemy damages a surrendered or Downed creature: it takes 20 + 4 × Devotion Soul |
| **The Quartermaster** (logistics god) | supply, hold, protect | flee, desecrate | Open | Resupply: an ally reloads every weapon free and regains 1 Supply | Dig In: an ally is dug in (half cover) until they move, and Braced | Covering Fire: a 3×3 area; enemies in it make a Body save or are Pinned 1 round | Requisition Approved: the whole squad is fully restocked (ammo, Supplies, throwables), gets 2 standard cores each, all gear repaired to full, jams and heat cleared, and +3 AP next turn | you reload (any reload): it is free, its AP comes back; your Evoker's core runs dry (charge 0): a fresh core slots in, free; your MP runs out (0): 25% of your max MP back |
| **The Laughing Mask** (trickster) | trick, burn, flee | cower, mercy | Open | Lucky Break: an ally's next failed attack roll is rerolled at +5 | Switcheroo: swap two units in sight within 6 of you (an enemy gets a Brain save) | Pratfall: an enemy makes a Body save or falls Prone and drops its weapon | Encore: every ally may repeat the last action they took this round for free, and every enemy in sight is Confused 1 round | an enemy misses you: it falls Prone |
| **The Toll-Keeper** (ferryman of the dead) | mercy, heal, hold | kill (of the surrendered or Downed), desecrate | Jealous | Coin for the Ferry: a Downed ally stands at 10 HP | Hold the Gate: until your next turn, allies in sight can't drop below 1 HP | Last Crossing: an enemy at a quarter HP or less makes a Heart save or dies (bosses take 40 Soul) | Turned Back at the Shore: every ally who died or fell (Downed) this fight stands at half HP | an ally would drop to 0 HP: they stay at 1 HP |
| **Mother Ember** (hearth-mother) | heal, protect, supply | betray, cower | Open | Warm Hands: an ally heals 40 | Hearthlight: a 3×3 area; allies starting a turn in it heal 10, for 3 rounds | Feed the Fire: an ally gets +1 AP now (ceiling applies) and loses Weakened and Slowed | Everyone Home: the whole squad heals to full, the Downed stand, every harmful condition is cleared, and each gets a 40 shield | an ally drops below a quarter HP: they heal 20 + 4 × Devotion |
| **Old Overcast** (thunder sky-father) | storm, kill, hold | flee, cower | Jealous | Thunderclap: enemies within 2 of a tile are pushed 1 and make a Heart save or are Shaken | Lightning Rod: 50 lightning to an enemy, then 25 to one more within 2 | Gather the Clouds: until your next turn, allies' Storm riders count a stage higher | The Sky Answers: a 5×5 area in sight takes 150 Storm, enemies only (the sky picks), and they are Stunned 1 round and Shaken | you kill an enemy: 20 + 4 × Devotion Storm (lightning) to the nearest other enemy |
| **The Matchmaker** (love goddess) | protect, mercy, heal | betray, kill (of the surrendered or Downed) | Open | Red Thread: two allies are linked for 2 rounds; damage to either is split between them | Sweet Nothings: an enemy makes a Heart save or is Smitten (can't attack you or your linked allies) next turn | Together: two adjacent allies get +2 to hit and +2 Defense until your next turn | Love Conquers: every non-boss enemy in sight surrenders, no save; a boss (or one that can't yield) makes a Heart save or is Commanded to hold 1 round | an ally next to you is hit: half the damage moves to you |
| **The Counting Weaver** (fate-spinner) | hold, trick, judge | flee, betray | Open | Foreknowing: the next attack against an ally misses | Unravel: every boon, shield and helpful state on an enemy ends | Cut Short: an enemy makes a Heart save or loses its next turn (bosses lose 2 AP) | Rewoven: the squad takes another full turn now, and every ally's HP goes back to what it was at the start of this round, if that was higher | an enemy crits you: it becomes a normal hit |

**What the Narrator owns:** pacts and conversions, apostasy, knowledge pieces, Narrator rites kept, Devotion XP moves of
−6 to +5 a call with a reason (a deed, bringing in a believer, breaking character; its gains at most +10 XP a session per
character, losses uncapped), days passing, holy ground (objects tagged holy), and what a prayer means in the story. **The
engine owns** every number, the XP, the caps, the tags, vows, Witnessed, interventions, the leave roll, grudges, the day
counter and the dice.

**Still working as before:** the Guardian's Blessed Shells (they seal a Hymn), Under the Eye, and Judgement (which spends 1
Devotion, now 10 Devotion XP: the only spend besides a Miracle's 5 levels; item 706); Blessing power and the Faith perks; Rite in the Field (it cuts a
Hymn's or Miracle's AP); the prayer traits; and the Factory Made and The Old Blood hooks on a Blessing landing
(`blessing_in`).

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
- **Only a gamma's perk gives or takes AP inside a turn** (rules 1.13). An alpha's or a beta's perk may make its own skill's action cheaper, and nothing more; the perks that used to hand AP out are listed in "The perk, unlock and trait pass" below.

## Shared rules for perks, traits and classes (rules 1.3)

Written 7 Nov 2026 so every perk, trait and class move has the base rules it stands on. All provisional (items 82–100).

**Damage, in order.** Every loss of HP goes through one chain: the attack (or blast, spell, hazard) works out its damage and its armour, then **reductions** (percentages and flat ones, immunities), then the **shield**, then the **last-HP check** (a rule that keeps you standing at 1 HP acts here; several such rules apply in this order: Angel of the Trenches, Bite the Bullet, Last Wall), then HP, then what follows (wounds, Downs, kills). Kill credit goes to whoever took the last HP; Bleeding and Burning credit whoever caused them, a broken barrel whoever broke it.

**Damage types.** Physical by default. Each weapon names its type (weapons.json `damage_type`): the flamer and incendiary rounds deal fire, the core rifle and Enhanced rounds Elemental, SHOCK and SPARK lightning, the bot-scrambler emp. Fire and lightning count as Elemental for *Elemental damage taken*. Grenades, launchers, satchels and barrels are **explosive**. The derived reductions apply in the chain: Elemental damage taken −10% × Pain Threshold, Ambush damage taken −10% × Reaction Speed, Critical damage taken −10% × (Perception − 1) − 5% × Durability (it shrinks the critical multiplier's bonus), each capped at 60%. Healing and shields received get +10% × Sensory. The air's Healing given multiplier applies to magical healing.

**Stacking damage bonuses.** Bonuses against one particular target (True Name, Judgement Day, Deliver the Sinner, Holy Ordnance, Moon Hunter, Humanity First, Ork Steel; Case Closed and Weak Point left this list with rules 1.13) **add together**, and in all they can at most double the damage (×2.0). Situational multipliers on yourself (Pain Eater, The Brightest Light, the Ambush multiplier, Weakened) multiply as before.

**Special ammo.** A magazine holds one type (rules.json `ammo_types`): armour-piercing ignores armour at −20% damage; hollow-point +30% damage, armour counts double; incendiary −10% damage and the target is Burning (no save); Enhanced ignores armour, deals Elemental damage, and each hit puts +1 on the meter. Special rounds are carried as items and loaded into the gun out of combat; each spare magazine keeps its own type.

**Recoil** (spec: Modifiers, now run by the engine): −1 to hit for each earlier shot this turn, reduced by floor(Dexterity ÷ 2); halved while braced or Emplaced; none for bows and weapons marked no_recoil; the compensator removes it. Shots inside one burst, full auto or weapon skill use the burst's own penalty instead, and reactions take none.

**Guns that can't jam.** Only weapons with a Heat limit jam. Bows, crossbows, the flamer, the breacher tube and the core rifle build no Heat; a natural 1 is a fumble (−1 AP next turn).

**Reactions.** One per round, counted (an opportunity attack, an Overwatch shot, a perk reaction). Items may grant more. A Suppressed or Stunned unit has none. Overwatch may hold more than one shot when a class move says so; all of them fire on the one reaction.

**Moving, tile by tile.** A move is walked one tile at a time. Opportunity attacks and Overwatch are checked at every step, so Overwatch fires the moment you come into its line, not only where you stop. A walk can stop early (a trap, a reaction that Downs or Pins you, a rule that says stop); the tiles you paid for and didn't walk stay in your turn's bank. **Sprint is once per turn.** Rules can open paths: run along a wall or over a hole, jump one blocked tile (2 tiles of movement), pass through an ally, ignore rough ground. A unit avoids the traps its side knows about: the enemy knows its own traps, you know the ones you set or spotted.

**Hidden in a fight.** You are Hidden when a fight opens on your ambush (and so is anyone else still sneaking unseen), or when a rule hides you. **Hide** (2 AP) works only out of every enemy's sight, never while Marked. While Hidden, enemies can't target you and draw no line to you; you draw no opportunity attacks or Overwatch. Your **first attack from each time you hide** is an **ambush**: it crits on 19–20 and multiplies its damage by your Ambush multiplier (1.5 + 0.05 × Ingenuity). Any attack reveals you unless the weapon is silent (bows, the suppressor); taking damage reveals you. **Spotting:** at the end of each turn, the unit whose turn it was looks for Hidden enemies whose tile it can see: d20 + its notice (enemies by tier: minion +0, soldier +2, elite +4, boss +6; characters their Vigilant modifier) against 10 + your Ingenuity modifier + your Stealth; ending a turn next to you finds you outright.

**What things are.** Every combatant and NPC has a **kind** (human by default; robot, crawler, ork, upper_realm, cursed, beast, machine, turret, drone, celestial) and **tags** (humanoid, military, hunter, lawful, unaware, no_surrender, prisoner…). The Narrator sets them when it starts a fight or places someone; campaigns can set them in their data. Robots, machines, turrets and drones put +2 on the meter when they die, not +5. An **unaware** enemy loses round 1.

**Surrender and subdue.** Talking a beaten enemy down (Parley, below) calls its **surrender save**: a Heart save against 12 + the speaker's Heart debuff strength, only when it is at half HP or less or every ally of its is down, and only once per enemy a fight. Bosses, machines, robots, turrets, drones and anyone tagged no_surrender never surrender. A non-lethal blow that takes a foe's last HP **subdues** it instead. Surrendered and subdued foes are out of the fight: not targets, counted as defeated, no kill credit and no rise on the meter. After the fight they stay on the map as neutral prisoners, for the Narrator to deal with. The fight's XP counts them as defeated.

**Talking in a fight** (the action table's 2 AP): within 8 tiles of someone who can hear you. **Persuade** (Eloquence): a Left Brain Debuff against a Brain save. **Threaten** (Intimidation): Shaken against a Heart save, with the Threaten Call's AP loss (rules 1.13: Threaten is a Call; this action stays as another way to make it). **Parley** (offer terms): the surrender save. What you say goes to the Narrator with the fight report.

**Throwing** (2 AP): a grenade at a tile within Throwing range (6 + 0.5 × Dexterity) and line of sight; a satchel is placed on your tile or next to you. Frag: 40 to everyone within 2 tiles, and the objects there. Smoke: blocks sight within 3 tiles for 2 rounds. Flashbang: Blinded 1 round within 2 tiles (Body save). Incendiary: 15 and Burning (no save) within 2, and the tile burns. Bot-scrambler: robots, machines and drones within 2 are Stunned (no save), mana arms there jam, and Sigils drawn there cost +1 AP for 2 rounds. Satchel: 120 within 2. Explosive weapons (the thumper, the breacher tube) splash everyone else within their radius of the target on a hit, and the flamer's cone gives everyone in 3 tiles its own attack.

**Swapping weapons** (1 AP a hand; rules 1.9, World Play: Gear in a fight): bring the off-hand weapon to the main hand (the two change places, 1 AP), draw a weapon from the pack (1 AP; a two-handed one 2), put one away (1 a hand, 2 for a two-handed weapon), drop it (0 AP, into the pile on your tile), or fit a mod (1 AP). A stowed or dropped gun keeps the rounds in it, the off-hand gun too. Reloading both of two guns is 3 AP.

**Burning, grapples and dropped weapons.** Putting out Burning is 1 AP (yourself or someone next to you). Breaking a grapple is 2 AP. Recovering a weapon is 2 AP (1 for a lowered one).

**Companions.** A drone or a beast fights beside its owner: it acts right after the owner in the order, on the owner's player's orders (move, attack, Overwatch, reload, end its turn), with its own numbers (enemies.json `companions`). The drone (30 HP) only moves and shoots: a plain shot with its service pistol, which never runs dry, never needs reloading and never jams; it has no aimed shot, burst, Overwatch or other weapon action. The beast has 60 HP. At 0 HP it is destroyed, not Downed; its HP carries between fights, and a destroyed one is out until the story repairs or heals it.

**Prayer** (rules 1.6; see Patrons and prayer): a Whisper 1 AP, a Hymn or a Miracle 3 AP; not while Silenced. A Faithful character's own Hymns need no roll within their Devotion; an overreach, an Atheist's prayer and a kept Hymn roll d20 + Faith modifier (rules 1.6). Effects × Blessing power; what the engine can't run goes to the Narrator with its text. The Hymn cooldown counts rounds.

**Class resources.** Momentum (Fighter, max 5): +1 for each melee hit; it drops to 0 when you end a turn without attacking *(superseded by the Momentum rework in "Melee: Momentum and the chain": everyone with a melee weapon has it, only the plain attack gives it, it carries between turns)*. Guard (Defender, max 5; since rules 1.13 anyone with Durability has a pool, see "Guard"), Marks (Assassin, max 3) and Charges (Storm Hand, max 3) start each fight at 0 and are spent by the class's moves. Supplies (Medic, 3 + floor(Proficiency ÷ 2)) and toxins (Assassin, 2 + floor(Ingenuity ÷ 3)) carry over between fights and are restocked at a long rest. Heat, Flux and Strain are shared rules every gun, Evoker or Emanator user already has. An advanced class that leans on a parent's resource carries it (Adamantile Knight: Guard; Shade: Marks).

**Item modifiers on every d20.** A trait's or perk's bonus to a skill applies to every d20 roll that uses that skill's modifier: checks, passives, saves, weapon attacks, Sigil and Soul strikes, initiative. Never to stats worked out per point. Conditions do the same: the Left Brain Debuff's −2 reaches every Mind skill roll, the Right Brain Debuff's every Expression and Soul skill roll (Brain saves use Charisma, Heart saves Composure).

**Conditions in the story.** Out of a fight, the Narrator can put a condition on an NPC for the scene, or on a character for the scene, the session or the arc. A character still Shaken when a fight ends stays Shaken for the rest of the scene. Story conditions change checks like items do (Shaken −2 on social checks and Heart saves). When a fight starts, the ones a story beat can carry come in as combat conditions for their own combat duration, with no save: Shaken, Fear, the Brain debuffs, Weakened, Nausea, Bleeding, an injury, an augment offline. The rest (a story Stun, Pin, Blind and the like) stay in the story; the fight's notes tell the Narrator. **PROVISIONAL** (item 373).

**Voices per character.** The cap of 2 voice lines a beat is per character (item 36): a player with two characters hears each one's voices.

**Start items.** A trait's start item is in the pack at creation, and worn at once when it has an armour slot (prescription glasses, the smiling mask). Traits marked as excluding each other can't be taken together; the creation check refuses them.

## Perks, traits and class moves in play (rules 1.3)

Written 7 Nov 2026, when every perk, trait and class move was built into the engine. Each item's numbers are in perks.json, traits.json and classes.json; this section is the reading the engine runs where the item text needed one. Whatever the engine can't judge goes to the Narrator with the item's text: a fight report line, a pending ruling in the story, or a line in the character brief. Every ruling that resolves a design flagged as game-breaking or ambiguous follows the audit's recommended fix, is marked `provisional: true` in the data, and is an open item in section 14 (items 101–376; the tag in brackets, such as *(C2)*, names the item there).

### Body, melee and damage taken

- **Ranged, for Bulwark.** Ranged means weapon shots, plus Sigil, Soul or Elemental damage from a caster who isn't
  adjacent. Area blasts (explosions, barrels, grenades) are never ranged. "Behind" means the ray from the attacker
  through the guard, carried on 1 tile (Tier II: 2). Diagonal rays are rounded. Two Bulwarks don't stack; the best one
  counts. The attack preview names it in the covered ally's damage chain ("Bulwark (name)", ×0.75 or ×0.5); the real cut
  comes after armour (item 377).
- **A wound** is a hit by someone that takes HP. A hit fully absorbed by a shield is not a wound. Hazards, traps,
  Bleeding and Burning are not wounds. Used to the Pain and Scar Tissue both use this definition.
- **Self-inflicted damage** never triggers the drop-to-0 savers: Mana Short, overload, Strain and Flux.
- **Drop-to-0 order:** Angel of the Trenches runs first (it needs priority < 10), then Last Wall (10), then Bite the
  Bullet (20).
- **Limb damage** (Glass Runner, Crawler-Blooded, Scar Tissue II). The engine has no hit locations, so "limb damage"
  means one of two things:
  - the hit's damage, when a critical's injury lands on an arm or a leg;
  - for Scar Tissue II, Injury resistance (d100).
- **Movement −1 on traits** becomes −0.5. Under the tiles-per-AP model, −1 at Agility 1 halves Movement. This covers
  Right of Way, Heavyworlder and Old Timer.

### Movement, stealth and vision

**Into the Dark** (rules 1.13: it gives no AP any more).
- **I:** you can't be ambushed on your first move into the unknown. The first time in a fight you walk onto a tile your side hasn't seen, attacks against you are not ambushes until your next turn starts: no critical on 19 and no Ambush multiplier. Once a fight.
- **II:** and you can't be made Afraid during round 1 of a fight in a place that causes Fear. That is either the Narrator's start-fight `fear` flag or a zone tagged `fear`.
- **Narrator:** out of a fight, the character who walks in first is never caught off guard there.

**Wall Run.** A move may cross wall faces, low obstacles (half-cover objects) and holes as if they were floor.
- **Tier I:** at most 2 such tiles in a row. **Tier II:** at most 4.
- **Never crossable:** a door, a free-standing full-cover object (a pillar), or the inside of a building (a blocked tile whose 8 neighbours are all blocked).
- You can't end a move on a wall or over a gap.
- **II, Wall Run strike (Perks tab):** run to a tile of the run, which may be on the wall. Make one attack from there with your weapon's basic attack, then finish the move on the tile you chose. Each leg pays its own AP.
- **Story:** parkour within 3 m (I) or 6 m (II) needs no Athletics check. The engine makes an Athletics check tagged `parkour`, `climbing`, `jump` or `wall_run` an automatic success; the Narrator tags it so only when the run is within the tier's distance (the brief tells it).

**Roll With It.** A *successful dodge* is an attack against you that misses. It works once a round.
- **I:** 1 free tile. **II:** 2 free tiles.
- **Free tiles:** they cost no AP and draw no opportunity attacks. A miss on your own turn (Overwatch during your move) gives them at once. A miss on an enemy's turn gives them at the start of your next turn.
- Tier II's critical rider is gone (rules 1.13: no damage on a beta).

**Shadow Step.**
- **I:** while Hidden, a move from a tile next to cover to a tile next to cover counts half its tiles, rounded up. On the area map, sneaking from cover to cover halves the tiles for the move and for the sneak surcharge.
- **II:** when an attack reveals you, roll d20 + your Ingenuity modifier. The TN is 10 + the best notice (minion 0, soldier 2, elite 4, boss 6) among enemies who can see you, +2 for each earlier success this fight. If no enemy can see you, you stay Hidden without a roll.
  - **On a success:** you stay Hidden, but in the same Hidden entry, so no second ambush.

**Got You in My Sight.**
- **I:** an enemy you see hiding, or an enemy leaving your own sight, gives +2 AP. Once a round, and it counts toward the +3 perk AP cap.
  - **On your turn:** the AP comes at once.
  - **If your turn is still to come this round:** it is banked for that turn.
  - **If your turn has already passed this round:** nothing.
  - **The penalty:** a sneak attack that hits you costs 2 AP next turn. A sneak attack is an ambush, meaning the first attack from a Hidden entry.
- **II:** no penalty. The squad keeps the last position of an enemy that left your sight (`cb.lastSeen`).
- **On the area map:** an NPC token the holder could see (12 tiles, a line) that moves out of sight, hides or leaves
  gives +2 AP on the next overworld round, once a round. Tier II marks its last-seen tile (`story.lastSeen`). Item 379.

**Eyes in the Back.**
- **I:** half cover next to you counts against a ranged attack from any direction: −5, labelled. It counts as the
  shot's cover tile, so a shot that misses only by those 5 hits the cover instead (spec: Cover).
- **I, the shield:** with no half cover next to you, a carried shield (not a pavise) gives its −5 from every side.
- **II:** allies next to you get the same.

**Wind on the Skin.** When a fight starts, the squad learns where enemies it can't see are. The range is the holder's Vision, ignoring line of sight.
- **Tier I:** the nearest such enemy. **Tier II:** every one.
- This is a known position, not sight: the enemy can't be targeted.
- **On the area map:** a lurking (hidden) NPC token within 12 tiles is revealed on arriving in a zone and when a fight
  opens from the area map (Tier I: the nearest, once per arrival or fight; Tier II: every one). The rest open the fight
  Hidden. Item 380.

**Skin Map.** Hidden enemies within 6 tiles are revealed when there is a line to them through smoke and darkness. Walls and sight-blocking objects still stop it. This is checked at every turn start, after every move, when someone hides, and when the fight starts. Within 6 tiles the holder also sees and targets through smoke and darkness (the sight hook); squadmates don't. On the area map a lurking token within 6 tiles with a line is revealed when placed, at each round and when the holder moves. Item 381.

**Sixth Sense.** The same within 3 tiles, through anything.

**Never There.**
- The first move action each turn (Move, Sprint or Disengage) draws no opportunity attacks and no Overwatch.
- During any later move that turn, ranged attacks against you take −4. That means Overwatch and ranged reactions, and only during your own move (the narrow reading).

**Before the Blink.**
- **Round 1:** holders act first, in their initiative order; everyone else keeps theirs. A hidden ambush opener still goes first.
- **From round 2:** the original initiative order.
- **Reactions:** +1 a round.

**Vanishing Act.** 2 AP, once a fight.
- **The effect:** become Hidden where you stand, even in plain view. Your next attack is an ambush.
- **What reveals you:**
  - any attack, even with a silent weapon;
  - a shove;
  - a released Outburst;
  - taking damage;
  - an enemy ending a move next to you;
  - normal spotting.
- **On the area map:** once a scene, 2 AP. You are sneaking and hidden, and only someone who walks up to you can notice you.

**Charge!** Once a turn, a normal move qualifies if:
- it is 3 or more tiles;
- every step goes in the same one of the 8 directions;
- it ends next to a visible enemy, and the move closed the distance on that enemy (on the area map, a hostile NPC).

Up to 3 AP of the move is free; the rest is paid. The bank keeps the tiles bought.

**Make Way.**
- No opportunity attacks; Overwatch still fires.
- **On the area map:** neutral NPCs don't block your path. You can pass through them but not stop on them.
- **Narrator:** crowds part.

**War Footing.**
- **Combat:** an enemy that ends a move next to you loses 2 AP at once. This applies once per enemy a turn, and not to a Disengage or a forced move.
- **Story:** a failed Intimidation check costs nothing. There is no complication, and a natural 1 counts as an ordinary failure. The engine sets `roll.fumble = false` and `roll.noCost = true` and tells the Narrator. The same target can't be intimidated again that scene: the check fails automatically.

**Last Charge.**
- **The trigger:** a straight charge of 5 or more tiles at an enemy, by Charge!'s rule (a normal move).
- **Melee:** your melee hits for the rest of that turn deal ×1.5.
- **The shield:** max(15, 15 × Armour Class), once a fight. What is left of it goes at the start of your next turn.

**Just the Repairman.** You are spotted while sneaking and carrying a toolbox (the `toolbox` item).
- **The roll:** 50% that the observer takes you for maintenance staff, rolled as a d100 before the Ingenuity roll; 50 or less passes.
- **On a pass:** you stay hidden from that observer, and it never checks you again this scene (this fight, in combat).
- **What ends it:** attacking.

**Silent Partner.**
- **In a fight:** when you hide, the nearest ally next to you hides with you. They lose it when either of you ends a move with the two of you apart, or when you are found.
- **On the area map:** while you sneak hidden, the partner is the sneaking ally next to you (the first by id). The partner uses your Dexterity for notice range and your Ingenuity to stay hidden, and stays hidden while next to you.
- **An ambush:** it opens with both of you hidden.

**Dead Signal.** 1 AP, while in stealth: disable one electronic device within 3 tiles, silently.
- **In stealth means:**
  - in a fight, Hidden, or seen by no enemy;
  - on the area map, sneaking and hidden.
- **Lamps:** go dark.
- **Electronic locks:** open.
- **Everything else:** a camera, an alarm, a terminal or a turret is marked `disabled`, and the Narrator is told.

**Forlorn Hope.**
- **Charge:** if you end a turn closer to the nearest enemy than you started it, +2 AP are banked for next turn, under the +3 cap.
- **No Way Back:**
  - you can't Disengage;
  - you can't Retreat;
  - your armour counts as at most Class I's 5, with slot pieces included.

**Live to Fight Another Day.**
- **Disengage:** free once a turn, 1 AP after that.
- **Retreat (Perks tab):** a Sprint ending farther from every enemy you can see. 0 AP, no opportunity attacks, once a fight.
- **After either:** Withdrawing (+2 Defense until your next turn ends).
- **Yellow:** allies within 3 tiles, not you, take −1 on saves against Fear.

**Drill Echo.**
- **Best Time:**
  - Sprint costs 1 AP less.
  - On a running, climbing or endurance check, the d20 can't roll below 10. That means a check with Athletics or an Endurance skill, or one tagged `running` or `climbing`. A natural 20 still crits.
- **The Count:** before any Brain Power or Rumination check (combined checks too), roll a d6. On a 1 the check fails automatically.
- **Sigils:** before a glyph is drawn, roll a d6. On a 1 the AP is spent, no glyph appears and no charge or Flux is used. Story-mode glyphs go through the same draw.

**Ghost Soldier.**
- **Unseen:** your first attack from stealth each fight (an ambush) deals ×1.5. The Narrator is told that it made no sound.
- **The arm:** the prosthetic arm is a start item.
- **The War Never Ended:**
  - **Resting in a settlement** (a short or long rest flagged settlement) takes a Vigilant check against TN 12. On a failure you get no rest benefit.
  - **Stealth broken:** −2 AP next turn. That means being spotted, being touched, or taking damage while Hidden, but not your own attack or throw.
  - **Skills:** −1 Eloquence, Charisma, Implication and Composure.

**Lowland Born.**
- **Concrete Forest:** in a zone tagged `urban` or with terrain `ruins` or `urban`, +1 Movement. The Narrator gives you one way out.
- **Open Sky:** in terrain `open`, −2 Vigilant. The story side is the generic skill_mod; in a fight it is a stat answer. In a fight you also spot Hidden enemies only within half your Vision ("half Detection Range").

### Weapons, ammo, reactions and explosives

- **"Free" weapon handling.** A reload or clear that rides on another action (Running Reload) runs the normal action
  with its AP check skipped. Every other rule of that action still applies: spare magazines, loose rounds, jams.
- **Fractional AP.** The only fractional AP in the game comes from Glyph AP (0.5–0.9). Rounding Up rounds the AP left
  after a glyph up to the next whole number, once per turn. The gained fraction counts toward the +3 perk-AP cap.
- **Catching.** A thrown item that is caught produces no blast where it was aimed. The catcher holds it as a throwable.
  Placed charges (a satchel) can't be caught.
- **Improvised traps** are map traps that belong to a side. Units on the other side don't know where they are, so they
  path through them. The trap's damage is credited to whoever set it.
- **Extra mod slots** (Gun Nut, Blade Recluse, Overhaul) are a second slot of a type the weapon already has. Two optics
  is allowed; a slot type the weapon lacks is not. Each source adds one: Gun Nut on any gun, Blade Recluse on the named
  weapon, Overhaul on a weapon it overhauled. Rarity's "+1 mod slot" (Fine, Masterwork) should use the same rule. It
  isn't built yet (core `fitMod`).
- **Upper-realm and cursed beings** (Holy Ordnance) are units of kind `upper_realm`, `cursed`, `crawler` or `celestial`,
  or units tagged `cursed` or `upper_realm`. Crawlers are cursed in the lore.
- **Ammo Hog accounting.** Every round fired costs one more round. A single shot costs 2, a burst 6 and full auto 20.
  The extra rounds are charged after the action: at the next shot's roll, a reload, a swap or the end of the turn. If
  the fight ends first, they come off the rounds carried out of it. A gun with fewer rounds loaded is emptied.

### Sigil, Soul, prayer and music

- **Sigil stroke pool.** How many of your glyphs may stand on the map at once before the oldest fades. It equals Max
  Sigil words; Hold the Stroke adds to it. Max Sigil words still caps the words in one spell.
- **"Still active" Sigil** (Parallel Thought): one of your placed spells stands: a field (STAY), a trap (WAIT) or a
  turret (WATCH) (rules 1.4). Unfired glyphs, Workings' smoke, light and walls don't count.
- **Wards and rituals** (Rite in the Field): wards are drawing a WARD glyph, Begin on a Buff (Guarded) Outburst and the
  Warden's Ward move; rituals are Pray and Crystallise.
- **Upper-realm beings** are enemies with `kind: upper_realm` (or the tag `upper_realm`) on the Narrator's start_fight
  enemies or the campaign's zone NPCs.
- **Verse** is declared by the player: Say the line in the fight (free), then Begin with "In verse" (or Release a held
  Outburst with the same "In verse" chip; on the area map, "Release in verse"). The Narrator audits it after the fight,
  never per cast.
- **The music traits' modifier** reaches every d20 that uses the skill: story checks, asks and stealth (music.ts), voice
  passives and initiative, and in a fight the weapon attack, Sigil and Soul strikes, prayer, shoves, spotting and the
  three saves. It never reaches derived stats. A shield of 30 or more you give starts your song, the same as a big heal.

### Command, the AP economy, the team and the medic

- **Bonds.** Soulmate, Sworn Sibling and Rival name a squadmate (a character). The bond is set out of a fight, with a
  "Bond" story or area-map action. Sworn Sibling and Rival need the other player's consent. The bond takes hold at
  once, and a pending ruling asks the Narrator to confirm that both players agreed. If the Narrator refuses, the use
  is refunded and the bond stops holding. A bond between two characters of the same player needs no ruling. The bond
  rides into each fight on the unit.
- **Out-of-turn actions** come in three kinds:
  - **Windows** (On My Mark, Supreme Command): the ordered player acts, or declines (the host declines for an away
    player).
  - **Armed presets** (Between Heartbeats): set on your turn, resolved by the engine at the trigger.
  - **Automatic interrupts** (Angel of the Trenches): resolved at the trigger with no choice. "Hold position" turns it
    off.
- **AP debt** (On My Mark) comes off the next turn after the floor of 2, at most 4.
- **AP an ally gives** (a Call, Outclassed; Hand-Off and Rally Cry give none since rules 1.13) is banked for the ally's next turn. It counts toward that
  turn's +3 perk-AP cap.
- **Healing an ally** (Triage) has a floor of 1 AP.
- **Help** means an engine action that benefits a squadmate: a stim, Command, Field Repair on an ally, or a
  Thrown Stim. Rival's Petty gate reads this list.

### Status, surrender, judgement, kin and companions

- **Shaken NPCs in the story.** An NPC that is Shaken this scene (the Narrator's `conditions` field) gives every
  character +2 on social checks that target it (`check.target`). The TN ladder stays fixed, so the NPC's −2 is the
  player's +2. If a fight starts in the same scene, it starts Shaken. (Today this runs from Bone Talk's handler, so it
  only works while someone in the party holds Bone Talk; see hooks gap 2.)
- **Surrender offers.** The general surrender save is once per enemy per fight (rules 1.3). Open Hand's offer is its
  own, also once per enemy. The Name They Whisper uses the general one.
- **Hearing.** Bone Talk, Trench Poet's Verse and Parley share the 8-tile hearing range.
- **Non-human** (Humanity First) means any unit whose kind isn't human: robots, machines, turrets, drones, Crawlers,
  Orks, upper-realm beings, the cursed, Celestials, beasts, any companion, and a Factory Made squadmate.
- **Race** (The Old Blood) is a character's `race` (default human). For a non-PC unit, it's the unit's kind.
- **Companions** act on their own AP: the drone gets 3 and the beast 4 (the trait text). It's the turn's 6 minus a
  penalty, so Stunned and Dazed still apply.

### Story perks and dialogue traits

- **How a story item reaches the Narrator.** A story use posts a tagged line `[Name · key]` (private to its player when
  the item says so: Their Own Idea, What Could Be, Case File) and a pending ruling saying what the Narrator owes. A
  refused use (perkRulings accepted false) is refunded. A line an item owes its holder (Bedside Manner, Cold Read, Case
  File, Real Power, What Could Be, Detective's Eye) comes back in `perkLines` with the item's key, private to the
  holder, and is never a lie, even though voice hooks may mislead.
- **Check fields the engine reads.** `target` (the NPC or character a check is aimed at), `applies` (item ids that
  apply), `footnote` (the charId whose cited fact the roll acts on), `double` (Double or Nothing declared), `auto`.
  Tags beyond the shared vocabulary: `hinted`, `culture`, `ancient_script`, `lie`.
- **traitState keys the engine reads.** `case_open`, `case_related` (reset at each new scene), `identity` (set by
  New Name; null when burned), `old_con`, `lie_door` (set by Every Lie Is a Door; null when a weapon is drawn),
  `mislead_used` (reset at session start).
- **Mastered and Ultimate uses bend a scene, not the frame.** No stated fact, planted idea or lie decides a check by
  itself, creates items, money or allies, touches the Veil, or makes a Celestial appear without cause.

**Per item: what the engine runs, what the Narrator rules.**

- **Bedside Manner** (story action Touch, at will): a ruling owes a private truthful line (II: afraid, of whom).
- **Footnote** (story: once a scene, cite a fact; combat: once a fight, 0 AP, an enemy): +1 (II +2) on every ally
  check this scene the Narrator marks `footnote: <citer>` (or `applies footnote`), never the citer's own; in a fight,
  allies (not the citer) get +1/+2 to hit the cited enemy for the rest of that round.
- **Burden of Proof** (story action, at will): a ruling: no evidence, the accuser loses outright, no check; II onlookers
  shift one step (narrative until an attitude ladder exists).
- **Detective's Eye**: story: owed every scene (the brief says "owed this scene" until a perkLines line with its key
  is delivered in that scene); combat: at the fight's start, one hidden trap or the weak point of the enemy with the
  most HP (as if Analyzed, no AP); II two, and the log says whether they're connected (same owner).
- **Crowd Pleaser**: +2 on a holder's Charisma check tagged `crowd`; II on success a ruling (turn it on one person).
  Combat: a Persuade or Threaten heard by 3+ enemies (8 tiles) is one roll for all, its save TN +2.
- **Double Meaning**: story: the sentence (at will) opens the scene's hint: any squad member's check tagged `hinted`
  gets +2. Combat: once a round, 0 AP, name an enemy: each squad member's next attack on it +2 until the holder's next
  turn; II the nearest other enemy within 8 tiles loses its first action next turn (2 AP).
- **Old Tongue**: a holder's check tagged `ancient_script` (or `applies old_tongue`) is an automatic success. II:
  Speak it (story, once per being; in a fight against a unit of kind `upper_realm`: it holds its attacks on its next
  turn while it listens, a fight note).
- **Real Power** (story action, once per organisation): a ruling (keep it consistent in memory); II they agree to see you.
- **Established Fact** (once a session; story or fight): a ruling with the guardrails; in a fight a fight note.
- **Closing Argument** (once a scene): a pending Eloquence check of the holder (the one named, else the latest)
  succeeds without the die; a ruling for the listeners.
- **Everyone's Friend** (once a scene, an NPC): the first lie lands: the button First lie lands on a pending Charisma
  check, or a Charisma check the Narrator tags `lie` aimed at the friend, is an automatic success, once that scene.
  An NPC who already hates them: refused, refunded.
- **Their Own Idea** (once a scene; story or fight): the suggestion is private; important listeners save (G5).
- **Foreseen** (once a session): public line; the Narrator replays the moment from before the decision (G9).
- **Cultured**: +1 on a holder's Ingenuity or Charisma check tagged `culture` (or art, history, holo_drama), once on a
  combined check.
- **Cold Read**: Analyze (combat or the area map) of a person owes what they want most (fight note / ruling); a
  successful story Analysis check owes it too.
- **What Could Be** (once a session): private line and a ruling.
- **Every Lie Is a Door** (once a session): `lie_door` on the character; hostile NPCs' notice range is 0 for the
  holder while sneaking and stay-hidden rolls get +20; it ends at a fight's start, a new scene, or traitState
  `lie_door: null`.
- **Gambler**: story action Double or Nothing on a pending check (or the Narrator's `double: true`, which spends the
  scene's use; without a use left the flag is dropped): success → critical success, failure → critical failure; an
  Echo reroll keeps it. Combat: the toggle `trait:gambler#double` on an attack: a hit is a critical, a miss jams a gun
  (a melee or no-Heat weapon: −1 AP next turn). One use a scene shared by both.
- **Crowded Head**: voice cap +2 for its holder, each skill Asked twice a scene, Overreach resist +1 Echo; the twisted
  line is the Narrator's, once a session (`mislead_used`).
- **Cover Story**: New Name (once a session) sets `identity`; a failed roll while it holds owes a ruling (burned?
  `identity: null`); the engine counts identities cleared after a failed roll; at 3 the brief owes the old con until
  `old_con: true`.
- **Cold Case**: Analyze −1 AP (generic); Case File (once a session, private truthful yes/no); Obsession −1 (G11).
- **Interrogator**: the +2/−2 are generic skill mods on the tags `alone_with_captive` and `vs_civilians_who_know`; a
  successful break owes a ruling (one true answer).
- **Holo-Drama Addict**: Play it as a holo-drama (story: a ruling; combat: +3 to the next attack this turn), one use a
  scene shared; a holder's check tagged `drama` gets +3 (a tag without the declaration spends the use; one check a
  scene). Leading Role: a holder's check tagged `unglamorous` makes the engine roll Visualization vs 12 at once; on a
  fail that check is at −3.
- **Born Performer**: Adaptable: the highest γ skill by default at each new scene, changeable once a scene by the
  player (story action, choice = a γ skill id); +2 on checks (named), passives, Ask, and a fight in that scene. Hollow:
  dialogue XP 0, combat XP +20% (generic xp_mod); an ally's Empathy check aimed at the holder +2.

### Identity, economy and upkeep traits

- **Karma locks.**
  - *Locked at its value* (Mind Without Fog): no award moves it, including Conscience's +1.
  - *Locked to a band* (Symbol of Order: Lawful, starting at +30; Rogue Element: Chaotic, starting at −30, set at the
    first session start):
    - The band edge holds. Every point an award would carry past the edge is owed as "pressure".
    - Two points of pressure move Karma one point out of the band, so leaving costs double.
    - Pressure carries between awards. An award back toward the band pays it off first.
    - Once outside, awards work normally. Coming back into the band locks it again.
  - *Unlawful acts* (Symbol of Order): the Narrator flags the award `unlawful`; the loss is doubled before the band rule.
- **Check tags this lane reads:**
  - `dialogue` (Machine-Faced)
  - `heart_debuff`: a social attempt to break someone through the Heart (Mind Without Fog)
  - `official`, `merchant` (Central City Kid)
  - `underworld` or `vs_underworld` (Wanted)
- **Story Heart conditions on Mind Without Fog** never take. The engine removes them when the next check is called or
  the scene changes. If the condition arrives in the same Narrator turn as a check, that check shows Shaken's −2 and an
  equal +2 from Mind Without Fog. Every story Heart save (`kind: 'save', family: 'heart'`) succeeds on its own.
- **Machine-Faced in dialogue.**
  - Charisma and Implication are struck out of a dialogue check. If neither skill is left, the check fails on its own,
    and its stakes say why.
  - A Composure check made with Composure alone, or a Heart save in dialogue, succeeds with no roll.
  - Combined checks roll normally.
- **Glasses and masks** are worn and taken off through the sheet: free outside a fight, not possible in one.
  - In the story, the Narrator knocks glasses off with `traitState {key:'glasses', value:'off'}`. The engine moves them
    to the pack at the next check or scene change.
- **Lunarshine.**
  - Drinks are counted on the character (`state.lunar`).
  - A Bottle of spirits holds 5 drinks.
  - A drink in the story is free; in a fight it costs 1 AP.
  - A drink someone pours: the Narrator sends `traitState {key:'drink', value:n}`.
  - The states stack (Tipsy, Drunk, Wasted).
  - When a scene ends with the character Drunk, the engine rolls Will Power vs 12 + drinks today. A fail adds one drink
    and skips the reset; a success clears the drinks. A scene that ends below Drunk clears them too.
  - A "day" runs from one long rest (or session start) to the next. A day without a drink gives the shakes until the
    next drink.
- **Rest-camp fight** (Insomniac): a fight that starts in the same scene as a rest.
- **Masterpiece** (both Oils, once a session, 0 AP): an ally's next d20 gets +2: a story check, a save against an
  enemy's condition, or an attack roll. An Echo reroll of that same check keeps the +2.

### The perk, unlock and trait pass (rules 1.13, Skeleton 2.0)

Leon's rulings of 10 Nov 2026. Where an older line in this spec says otherwise (the items named below), this section wins. Numbers marked provisional are items 973 to 990.

**Replaced** (a new perk in the same place; the old ids `grapple` and `origami_hands` are gone).

| Was | Is now | Skill | What it does |
|---|---|---|---|
| Shove (unlock at 3) | **Heavy Hands** | Raw Power | A melee technique of yours that pushes its target moves it 1 tile further. |
| Break (unlock at 5) | **Follow Through** | Raw Power | When a Finisher of yours takes its target out, you are left with 1 Momentum. |
| Grapple (perk) | **Iron Grip** (`iron_grip`) | Raw Power | **I:** a target you have Bound or Grappled can't use Answers or reactions; attacks aimed at you have a 50% chance to hit it instead; when you move, it comes with you, into the tile you leave. **II:** each of your melee techniques that hits a target you hold gives you 1 Momentum (once a technique, never a Finisher), and Throw Down on it needs no Momentum. |
| Origami Hands (perk) | **Both Hands** (`both_hands`) | Dexterity | **I:** after one of your melee techniques hits, your next shot that turn has no Recoil. **II:** and after one of your shots hits, you gain 1 Momentum, once a turn. |

Shove and Break are techniques everyone can learn (the Shove Link, the Break Finisher), and grappling is Bind with bare hands. Origami Hands' traps wait for the stealth list.

**Reworded** (same name, same skill, same picture).

| Perk or unlock | Skill | Rule now |
|---|---|---|
| **Breaching Strike** I/II | Raw Power | A passive (the 3 AP strike is gone). **I:** when one of your melee techniques pushes a target and a wall, a solid object or another enemy stops it, it takes the hit again at half damage: half the damage of the hit that pushed it, or half a plain blow with the weapon in hand when the push had no hit (Shove). **II:** the enemy it was pushed into takes the same. |
| **Quick Draw** (unlock at 5) | Dexterity | Once per combat, your first attack with a weapon you draw for it (Draw Cut, Snap Shot) costs 0 AP. |
| **Read Them** (unlock at 5; was Weak Point) | Acuity | Enemies you've analyzed deal 15% less damage to your whole squad. Named Read Them because Read is a class move. |
| **Case Closed** (Mastered) | Acuity | Analyze reveals everything at once, as before. You and your allies have +2 Defense against an enemy you've analyzed (its attacks on your side are at −2). The +2 to hit and the +20% damage are gone. |
| **Nothing Gets Past** (Mastered) | Vigilance | Every enemy that moves in your sight is Spotted for free: the mark your Spot Call would leave at your level, with no AP, no reaction and no Call slot used; once a round for each enemy. The every-mover Overwatch is gone (the Marksman's Killzone holds several shots). |
| **Still Water** (Mastered) | Composure | Its original text stands: immune to Brain debuffs, and nothing reads you. Composure is a beta again, and a defence is its job. |
| **Stand Still** (unlock at 5) | Composure | Until you first move, attack or use an ability in a combat, your Calls cost 1 AP less (never below 0). Making a Call is not acting. |
| **Proven Formula** (unlock at 5) | Rumination | +3 on your saves against a spell or condition that has already hit you this combat. Engine reading: a condition that has taken hold on you once this fight is saved against at +3 from then on. |
| **Tuned** (unlock at 5) | Improvisation | The weapon in your main hand never jams and never breaks. The +10% damage is gone. |
| **Roll With It** II | Athletics | 2 free tiles, and nothing else. |
| **You Get Used to It** I/II | Composure | **I:** the first time each round an ally within 5 tiles takes a Brain or Heart condition, your next save this round is at +2. **II:** +4, and you may give the bonus to that ally instead (the Seen worse action, 0 AP). |

**AP gifts on alphas and betas, turned into defence** (15.7: anything that gives or takes AP inside a turn is a gamma's).

| Perk or unlock | Skill | Was | Is now |
|---|---|---|---|
| **Hand-Off** (unlock at 3) | Camaraderie | give 1 AP to an adjacent ally | Once per round, when an ally next to you is attacked, they use your Defense in place of their own if yours is higher. |
| **Rally Cry** I/II | Camaraderie | +1 / +2 AP to all when an ally drops | When an ally drops to 0 HP, every other ally takes 15% (II: 25%) less damage until their own next turn. |
| **Many Hands** (Mastered) | Camaraderie | Hand-Off of any amount of AP; a shared reaction | Your Hand-Off reaches any ally within 3 tiles. An ally you can see may use your reaction as their own (kept). |
| **Used to the Pain** I/II | Pain Threshold | ±AP after the first hit of a fight | If the first hit of a fight took less than 20% (II: 30%) of your max HP, the next hit against you deals 25% (II: 40%) less. A heavier first hit gives nothing; there is no penalty. |
| **Walking Wounded** (Mastered) | Pain Threshold | +1 AP a turn below half HP | Injuries never cost you AP or Movement (kept). Below half your max HP you take 20% less damage. |
| **Into the Dark** I/II | Guts | a free first move; +1 AP in a place of Fear | **I:** no ambush counts against you on your first move into the unknown. **II:** no Fear in round 1 of a fight in a place that causes Fear. |
| **Clean Hands** I/II | Conscience | +2 / +3 AP after sparing someone | A shield worth 15% (II: 25%) of your max HP after you spare an enemy or protect an innocent, once a turn. Out of a fight, a claim the Narrator accepts is that shield when the next fight starts. |
| **Blueprint** II | Visualization | +1 AP to allies who saw the sketch | +2 Movement in the first round (tier I: +1). |

**Kept as they are:** Still Standing, Eyes in the Back, True Name, Second Wind, On My Mark, Paint the Field, and the eleven discounts on a skill's own action (Speed Load, Quick Draw, Hot-Swap, Overhaul, Twin Draw, Parallel Thought, Quick Read, Rite in the Field, Righteous, Shrug It Off II). The gammas' AP perks stay (Grim Reaper, Overruled, Talks Broke Down, Sweet Talker, Outclassed, Got You in My Sight, Rounding Up).

**Moved.** Dead Signal's skills are Acuity and Ingenuity (it was Proficiency: knowing where the wire is). The detective perks (Detective's Eye, Pattern Lock, Case Closed, Cold Read) are Acuity's and the gear perks (Jury-Rig, Hot-Swap, Overhaul, Field Surgeon) are Improvisation's, because the perks stayed on their ids.

**Traits** follow what a skill means now, not its old name. Understanding, hacking, pricing and seeing read **Acuity**: Bottle Butts for Eyes (+1 with the glasses, −4 without), Slicer's Backdoor, Oil in My Mind, Market Blood, Old Timer. Repairing, modding and upkeep read **Improvisation**: Factory Made's self-repair, Drone Handler, Augmented's maintenance check, Ghost Soldier's arm. Lunarshine's Wasted state lowers both. A trait's Composure modifier reaches the Heart save again; a Charisma modifier no longer reaches a save; a Lore Master modifier is worth a full point on lore checks.

### Class moves in play

- **Revision 3 (8 Nov 2026):** the nine attribute classes above; the notes below were written for the 13 Revision 2 classes and still describe how each kept move runs (Ward, Seal, Quicken, Inscribe, Puppet and Drink It In are shelved).

- **Class moves are actions in the Class tab** (combat/perk with `id: 'class:<class>.<move>'`). A move with options
  becomes one action per option: Ward ×1/×2/×3, Toxin by condition, ammo by type, Inscribe weapon or armour, self
  versions. The UI sends only an action id, a target unit and a tile.
- **Off-turn policies.** Interpose, Riposte, Reactive Plate and Drink It In fire automatically. Each one has 0-AP
  policy actions that last for the fight: on every time (the default), only to save a Downed ally (Interpose), keep
  1 Guard (Plate), or off.
- **Outburst toggles.** Storm Front and Heart Surge are toggles that ride on `combat/outburst` as `mods`.
- **Soul class casts** (Will Shield, Sanctuary, Puppet) cost:
  - the Soul cast AP;
  - the school base cost × the air × (1 − saving), +20% under a Right Brain Debuff, priced through `outburst_cost`;
  - 1 Strain (2 in Flooded air, +2 without an Emanator), plus any extra the move adds;
  - the meter drops MP ÷ 10.
  They release at once and are never held.
- **Evoker class moves** (Ward, Seal, Rewrite, Quicken, Inscribe) need a ready Evoker: not locked and not Silenced.
  They spend charge from the loaded core. Ward, Seal and Rewrite add Flux, which can overload.

### Advanced classes, part 1

- **Shelved in Class Roster Revision 3** (item 556): these notes describe the built handlers, which run only in tests until advanced classes return.

- **Advanced moves are held all at once** (no ranks), alongside the base class (`c.advancedClass`). They show in the
  combat Class tab and, where they have a story part, in the story Perks strip.
- **Credits.** A character's account is `c.state.credits` (the Narrator sets it with `traitState {key: 'credits'}`).
  An RTC Contractor with no account yet starts with the Company line of **1000 credits** (PROVISIONAL, J13). The
  engine spends credits; the Narrator decides where the Company has signal.
- **Advanced-class Defender pieces.** An Adamantile Knight has the Defender's Brace (2 AP: Guard 1 + Durability
  modifier, max 5; Braced: +2 Defense until you move, a shove or knockback ends it), Interpose and Reactive Plate
  (J27). If the Knight also holds the Defender's own moves, the Defender's versions run instead.
- **Summoned turrets** are units on the owner's side that never take a turn, die at 0 HP, release no bots and leave
  when the fight ends.
- **Extraction** is a third way a fight ends: everyone left was lifted out. No win, no win XP, not a defeat (J15).

### Advanced classes, part 2 (the magic advanced classes)

- **Shelved in Class Roster Revision 3** (item 556), like part 1.

- **Advanced magic classes keep their state on the character for the scene**: Heartfed gauges
  (`c.state.heartfed`), Heartbinder links (`c.state.links`), Vessel body forms (`c.state.vessel`), the twin
  (`c.state.twin`, `c.state.twinLost`), Devoted Beloved designs (`c.state.beloved`), Heartfed design keys
  (`c.state.heartKeys`), the Glyph Mason's Keystone (`c.state.keystone`). Each is stamped with the scene (or zone
  and session) and resets when it ends. Taken on the area map, they carry into a fight in the same scene.
- **One heart.** The twin casts through its maker's heart: neither can Begin while the other holds an Outburst; the
  MP and Strain are the maker's.
- **Positions for Soul magic.** A Heartbinder's link and the twin are new origins for an Outburst: range and line of
  sight are measured from them (the area and targets are as usual).
- **Grand forms** are zones of kind `grand` (radius 2 around the planted staff, 3 rounds + Sigil duration bonus);
  VEIL and LIGHT also lay the ordinary smoke and light zones so sight works as usual.
- **Story uses.** Advanced moves with a story part show in the story Perks strip: Bless a shell (the engine rolls the
  prayer), Mark/Design a Beloved spell, Self-Crystallise, Enlarge (a ruling), Key a design, Let it fill a gauge (a
  ruling), Link, Share always/never, Inner Charge, Manifest the twin.

## Rules revision 1.14 (11 Nov 2026): speaking in a fight, and the Will Power perks

Accepted by Leon on 11 Nov 2026 from `docs/design/proposals/2026-11-playtest-fixes-2.md`. Every number here is provisional (section 14, items 1008 to 1013).

### Speaking and attempting in a fight

Words said in a fight used to wait in the log until the fight was over. Now the Narrator answers inside the fight.

1. **Speech is free.** Anything a player says in a fight goes in the log and to the Narrator, who may answer with one or two lines. Plain speech has no effect on the fight.
2. **An attempt costs 1 AP**, once a turn for each character, on that character's own turn. An attempt is words that want something to happen: talk an enemy down, call a bluff, shout a warning, try something the action list doesn't have. A perk that asks for words costs what its card says and counts as that turn's attempt.
3. **The Narrator answers at once** with one or two lines, and may ask the engine for **exactly one** of these, and nothing else:
   - **a check** by the speaker, with the skill and the TN the Narrator sets (the engine rolls it; its result is the Narrator's to describe, with the effect below it earns on a success);
   - **one condition on one unit for one round**, from this list only: Shaken, Taunted (by the speaker), weapon lowered, Hesitates (−1 AP on its next turn);
   - **a surrender:** one enemy stops fighting. Only an enemy at half its HP or less, or after a successful check;
   - **a ruling on a perk:** yes, or no (a no gives the use and the AP back).
4. **The Narrator never** deals damage, heals, moves a unit, or changes AP beyond that −1. The engine keeps every number.
5. **A check comes first when the outcome is in doubt.** A condition or a surrender with no check is for when the fiction has already earned it (a beaten enemy, a threat the squad just carried out).
6. **No Narrator connected** (no key, or the Narrator is offline): the attempt is refused and costs nothing; plain speech still goes in the log.
7. **A human Narrator** gets the words on the Narrator screen with the same four answers as buttons; the fight waits for them.

### Overdraw (Will Power 3)

**Once a turn**, a Pump may be an Overdraw: it adds 2 stages instead of 1 (so it needs stage 2 or lower), for the Pump's own AP. The first Overdraw of a fight costs no Strain. Each one after it costs 1 Strain once the Pump is done.

### Heart Overload (Will Power perk)

- **I:** once a turn, right after you Release an Outburst at stage 2 or higher, you may Begin the same design again at once for **0 AP**. You pay its mana and its Strain as usual, and it holds at stage 0.
- **II:** that free Begin holds at stage 1.
- **Blood for mana:** if you don't have the mana for that free Begin, you may pay it in HP, 1 HP for each point of mana. An Outburst paid in blood can't heal or shield.
- It needs an Emanator in hand, like any Begin.

### Resonance (Will Power perk)

- **I:** each Outburst you Release gives your **next** Release in this fight **+10%** to its effect, building up to **+20%**. You lose what you have built when you end a turn in which you neither held nor Released an Outburst.
- **II:** it builds up to **+30%**, and an ally's Release that you can see adds a step too.
- The shared Resonance rule of rules 1.5 (allies releasing in the same round, +0.2 on the stage multiplier each, +0.4 at most) is unchanged and adds to this.

### The perk card in a fight

The Perks tab shows three shelves and nothing that can't be used:

1. **Use now:** perks, traits and class moves with an action: its AP, the uses left, and the reason when it can't be used.
2. **Rides an action:** those that change an attack, a move, a Pump, a Begin or a prayer. They are not buttons here: each is a switch on the action it rides. The shelf lists them with where to find the switch.
3. **Always on:** passives, each with a live line: ready, used this fight, waiting for its trigger, or what it last did.

Items that only matter in the story are not on the fight's card. The audit behind the shelves is `docs/design/handoffs/perk-audit.md`.

### Deeds the engine sees

A combo perk is earned by a deed. Nine of the deeds happen in a fight, where the engine can watch them: it grants the perk the moment the deed is complete, exactly as the Narrator's record of a deed does (the perk, the deed on the sheet, the line in the story, the spotlight and its song). The character must have the perk's skills at Mastery 2 and not hold it yet; it is granted once; the Narrator can still grant any of them by hand; a Proving Ground fight grants nothing; enemies and companions earn nothing. The other ten deeds stay with the Narrator. A fight that was already under way when the engine began to watch it (a save from before this rule) earns none of the deeds that need its opening. Each condition below is how the engine reads the deed's sentence (all PROVISIONAL, item 1014).

| Combo perk | The deed | The engine reads it as |
| --- | --- | --- |
| **Charge!** | Open a fight by charging the enemy line, and win it. | On your first turn of the fight, before you do anything but move, you run 3 or more tiles in one straight line and end next to an enemy you closed on (or you use the Charge technique); 2 or more enemies are on their feet when that turn begins (one lone enemy is no line); and the fight is won. A run on somebody else's turn is not the opening. Granted when the fight ends. |
| **Field Surgeon** | Bring a squadmate back from below 10% HP. | An ally was put Downed or under 10% of max HP by an enemy or a hazard (not by the squad's own fire and not by their own heart; a wound carried in from an earlier fight counts), and your healing gets them back on their feet, or from under 10% to 10% or more. A companion's healing earns nothing. Granted at once. |
| **Dance of Iron** | Dodge three attacks in one round. | Three enemy attacks at you miss in one round, while you are on your feet. One burst or volley is one attack, however many of its shots miss. Granted on the third. |
| **Between Heartbeats** | Come through an ambush without being hit. | The fight opened with an enemy Hidden and nobody of your squad Hidden; you were in it from the start; an enemy attacked you at least once; no enemy attack hit you and nothing but your own heart hurt you; you end it on your feet; and the fight is won. Granted when the fight ends. |
| **Siege Engine** | Break through a wall to win a fight. | You destroy a closed door, or a piece of full cover that blocks the way (a barricade, a pillar; not a wall made by magic), that stood there when the fight opened (not one put up during it); you then move through the tile where it stood; and the fight is won. Granted when the fight ends. |
| **Twin Souls** | Survive a Mana Short. | You suffer a Mana Short in a fight and are alive when it ends, won or lost. (Pure Heart, which every eligible character has, refuses the first Short of each fight: the deed is the second.) Granted when the fight ends. |
| **Bite the Bullet** | Fight through an entire combat below a quarter of your max HP. | From the start of your first turn to the end of a won fight of 2 rounds or more, your HP is never at a quarter of your max or above and you are never Downed (Downed when your first turn comes also fails); an enemy attacked you at least once; you end it on your feet. Granted when the fight ends. |
| **Fire Sermon** | Convert an enemy mid-fight. | You are Faithful (you serve a patron), and an enemy surrenders to your words in a fight: talked down (the offer of terms, or an attempt the Narrator answers with a surrender), or your offered mercy accepted. An Atheist's words can make an enemy give up, but that is no conversion (item 1110). Granted at once. |
| **The Voice** | Stare down an enemy officer until they back off. | An enemy surrenders to your words in a fight in the same ways (Faithful or not), and the enemy who gives up is an Elite or a Boss (a Boss never surrenders today, so in practice an Elite). Granted at once. |

### The engine takes everything it can, first step

Built on 11 Nov 2026 from section 11 of the balance pass (`docs/design/proposals/2026-11-balance-pass.md`), the split of all 80 hybrid and Narrator-run perks and traits (`docs/design/handoffs/adjudication-split.md`) and the recommendations to questions C1, C4, C5, C6, C8, C9 and C12 and Leon's answer 11 (`docs/design/handoffs/balance-questions.md`). Every number and reading here is PROVISIONAL (section 14, items 1101 to 1116).

**1. Nineteen items are relabelled "engine".** Nothing they do needs a ruling: every number on the card runs by itself. What is left on some of them is colour (a standing fact about how people treat you, a story hook, a "the Narrator may", a roleplay line), and colour does not make an item Narrator-run (item 1101).

- **Perks (8):** Into the Dark, Blueprint, Talks Broke Down, Just the Repairman, Verse of War, War Footing, Foreseen, Make Way.
- **Traits (11):** Mind Without Fog, Sigil Savant, Grenadier's Arm, Blade Recluse, Bottle Butts for Eyes, The Mask, Factory Made, Upper-Touched, Gambler, Crowded Head, Drone Handler.

The labels after it, of 180 perks and traits:

| | engine | hybrid | narrator | engine share |
| --- | --- | --- | --- | --- |
| Before | 100 | 64 | 16 | 56% |
| After | 119 | 46 | 15 | 66% |

Two of the nineteen changed a sentence to get there. **Talks Broke Down** no longer says the Narrator decides whether the talk caused the fight: a fight breaks out of a talk when it starts in the same story round as the squad's last dialogue check or the round after (the timing the engine already used). The Narrator's `fromTalk` stays as a way to overrule it. **Verse of War** loses its last sentence (below). Into the Dark and Just the Repairman no longer send the Narrator a standing line about something the engine now handles.

**2. Six small fixes.**

- **The Name They Whisper.** Every enemy knows your name unless it is a **stranger**. A stranger is an enemy that carries the label `stranger`, or that the Narrator has listed for the holder (the `strangers` list in the holder's state, by name). The perk no longer reads `unaware`: an enemy caught unaware is still Afraid of your name, and a stranger no longer loses its first turn (item 1106).
- **Verse of War.** The sentence "After the fight, the Narrator checks that your lines really were verse" is gone, with the audit note behind it. You still have to say a line before the switch can be turned on (item 1111).
- **True Name.** "Studied" means **Analyzed**: the being carries the mark an Analyze leaves, yours or a squadmate's (an enemy can be Analyzed once). In a fight, and for a being that stands on the area map, the engine refuses the name until then. For a being that exists only in the story the Narrator still confirms it. "It can't lie to you" stays the Narrator's to play, so the perk stays hybrid (item 1107).
- **Crowd Pleaser.** A crowd is **3 or more listeners within 8 tiles**, in or out of a fight. Outside a fight the engine counts the people on the area map within 8 tiles of you (hostile or not, not hidden ones) and gives the +2 by itself; the Narrator can still mark a check `crowd` where there is no map. What the crowd does to the person you name (Tier II) stays the Narrator's (item 1108).
- **Old Tongue II.** In a fight the being **holds its attacks** on its next turn, as the card says: it makes no attack, casts nothing and uses no technique, but it may still move. Before this it lost the whole turn (item 1109).
- **Fire Sermon's deed** also needs the character to be **Faithful** (the table in "Deeds the engine sees" is updated; The Voice's deed does not; item 1110).

**3. The AP perks' cooldown** (Leon: "capping those decreases the value of gamma classes, just add a cooldown by turn"; 3 turns).

A perk or trait that gives AP on a condition gives it **at most once every 3 of its holder's turns**: after its AP lands on one of your turns, it gives none on your next 2 turns. Where the same item also takes AP from its holder on a condition, that penalty has the same limit, counted by itself (so the bonus never cancels a penalty that is due, and a penalty never eats the bonus). The cooldown is one number (`rules.ap_cooldown.turns` in `data/perks.json`, item 1102).

| Item | What is now once every 3 turns | It used to be |
| --- | --- | --- |
| **Grim Reaper** (I, II) | +2 AP for a kill or a knock-out on your own turn | once a turn |
| **Got You in My Sight** (I, II) | +2 AP when an enemy you see hides or leaves your sight; Tier I's −2 AP when an Ambush hits you | once a round; every Ambush |
| **Overruled!** (I, II) | +2 AP at the start of a turn while an enemy carries your Brain Debuff; the −2 AP (Tier II −1) while you carry one | every turn |
| **Talks Broke Down** (I, II) | +2 AP after a won talk: on your first turn, then on turns 4, 7 and so on; Tier I's −2 AP after a lost talk on the same turns | every turn of the fight |
| **Sweet Talker** (I, II) | +2 AP (Tier II +3) for a buff or debuff on someone you charmed; Tier I's −2 AP when they debuff you | once a turn; every betrayal |
| **War Footing** | an enemy that ends a move next to you loses 2 AP: one enemy, then nothing for your next 2 turns | once for each enemy, every turn |
| **Forlorn Hope** (trait) | +2 AP on your next turn for ending a turn closer to the enemy | every turn |
| **Rabbit's Foot** (trait), Vengeful | +2 AP on your next turn when an ally is Downed | every time |

How it is counted and what it leaves alone:

- A turn here is a turn of the holder in a fight (one a round). AP that is banked for your next turn counts on the turn it lands. Each fight starts with every cooldown ready.
- While a cooldown runs, the fight's log says at the start of each of the holder's turns when the item is ready again, so the perk card's live line shows it.
- The limit of +3 AP gained a turn and the ceiling of 9 are unchanged and still apply on top.
- Grim Reaper's 1 AP less on the first turn of a fight, and Talks Broke Down II's hesitating enemy, happen once a fight and are not part of the cooldown.
- On the area map these items keep the limits they had (once a round); the cooldown is a rule of fights.
- **Not covered** (item 1105): Outclassed (its AP comes once a fight already); the standing +1 AP of Southern Fist and Sworn Sibling; traits whose AP effect is only a penalty (Ghost Soldier, Soft Hands, Born Officer's squad); discounts, free moves and free attacks; and everything that is not a perk or a trait: the Calls (Rally, Brief, Order), the Sigil word QUICKEN, prayers and class moves.

**4. After the review** (11 Nov 2026, a second reader tried to break the three parts above; items 1112 to 1116).

*The relabels.* All nineteen handlers were read again for anything that waits for a Narrator: a standing line, a note, a pending ruling, a card sentence that says the Narrator decides. None of the nineteen has a rule left in it; what is left is the colour item 1101 describes, so no label went back. One line to the Narrator was wrong and is corrected: **Just the Repairman** told the Narrator the cover holds "until they act unlike a repairman", which is a judgement the card does not give anyone. It now says what the card says: the guard does not look again that scene unless the character attacks (item 1116).

*The six fixes.* Three cards did not say what the game does, or left a judgement unnamed:

- **True Name.** An Analyze made on the area map was lost when the Narrator started the fight (the fight seats the people on the map without their Analyze mark), so the button refused a being the squad had studied a moment earlier. The holder now remembers who the squad Analyzed on the area map (by the person's id and name, the last 24 people), and such a being counts as Analyzed in the fight. The card reads "It must have been Analyzed first", which covers all three kinds of being, and both buttons say it too (item 1112).
- **Grim Reaper II.** The card said every enemy who sees "a kill of yours" is tested for Fear. The game tests them only for a kill or a knock-out on the holder's own turn, and does so every time, whether or not the 2 AP came. The card now says that (item 1113).
- **The Name They Whisper** stays hybrid, and a hybrid card names the judgement that is left: "Only a stranger is spared: the Narrator says who has never heard of you." (item 1114).

*The cooldown.* It was attacked through real turns (the turn ended, the enemies acting, 5 to 8 rounds) and held every time:

| Attempt | Result |
| --- | --- |
| Talks Broke Down over 8 real rounds | +2 AP on turns 1, 4 and 7 only; a lost talk (Tier I) −2 AP on the same turns only |
| A save and a reload in the middle of a fight | the cooldown is kept (it is stored on the fighter) |
| A fight ends and a new one starts | every cooldown is ready again, as written above; inside one fight it never comes back early |
| Two holders in one squad | each has its own cooldown; neither gives the other an extra turn |
| The trigger on an enemy's turn (Got You in My Sight, Vengeful) | two triggers in one enemy turn pay once; a trigger after the holder's turn is over pays nothing and does not spend the cooldown (Got You in My Sight) or lands next turn and starts the 3 turns there (Vengeful) |
| The Proving Ground | giving a perk or a trait in a fight keeps a running cooldown; the Refill tool starts the fighter fresh, cooldowns included |
| A fight saved before the cooldown existed | the item is ready on the first turn after loading, then cools down |
| The penalty side | Got You in My Sight, Overruled!, Sweet Talker and Talks Broke Down: each penalty at most once every 3 turns, and it never blocks or is blocked by the bonus |
| The Calls and QUICKEN | untouched: nothing in their code reads the cooldown |

What the attack found that is a reading, not a fault (item 1115): the count is kept in rounds of the fight, so a turn the holder loses (Downed, Stunned) still counts as one of the 3; AP that is lost to the limit of +3 a turn or the ceiling of 9 still starts the cooldown; and two holders of **War Footing** standing together each take 2 AP from the same enemy (4 in all), as they did before.

## Rules revision 1.15 (balance pass, step 1): enemies with levels, Vermin, criticals, hit chance

Built on 11 Nov 2026 from Leon's rulings in `docs/design/proposals/2026-11-balance-pass.md` (section 5: enemies scale with level, two attacks at least, no hard damage cap; section 8, answers 1 to 5, 7 and 8) and the recommendations of `docs/design/handoffs/balance-questions.md` (A1, B7). **The first numbers were set by arithmetic from the measured game (`docs/design/handoffs/balance-sim-baseline.md`); the table was then fitted against the targets with the fight simulator ("The fit" below; the report is `docs/design/handoffs/balance-sim-step1.md`). All are provisional (section 14, items 1015 to 1038).** Where this section and an older one disagree (Enemy stat blocks, Critical hits, the Critical damage line of Derived stats and of the Dexterity skill), this section wins.

### Every enemy has a level

1. **An enemy is a tier and a level.** The tier says what it is (Vermin, Minion, Soldier, Elite, Boss). The level, 1 to 20, says how strong. The Narrator names the tier; the game sets every number.
2. **A fight has a level.** By default it is the average level of the characters in the fight, rounded down. Every enemy in the fight is that level unless it is given its own.
3. **Who may change it.** The AI Narrator may shift a fight by −3 to +2 levels (an easy fight, a deadly one); it never names a number of its own, and no Narrator has a way to pin an enemy's HP, armour, Defense or damage. A campaign file, or a human Narrator's fight, may give a fight or one enemy a level outright: in a campaign file, `level` on an encounter is that fight's level and `level` on an encounter's enemy or on a zone's person is its own. A level given outright is the fight's level as it stands (no shift is added to it); an enemy's own level wins over the fight's; the fight's own list wins over the campaign file. Any level is held between 1 and 20 and rounded down. A level that is not a number (a word, an empty field) is no level: the squad's is used.
4. **The Proving Ground.** Waves are the squad's level. The spawn tool can set a level for the unit it spawns; left empty, it is the squad's level as it is at that moment (a fighter levelled up in the middle of a fight counts at once; the enemies already in the fight keep their numbers).
5. **Enemy casters** (Sigil and Soul) take their tier's numbers at the fight's level, and their spells' damage grows by the same damage factor as a weapon's. What a Sigil caster's spells heal and shield grows by the same factor, because they read the same multiplier (section 14, item 1034).
6. **Companions** (the drone, the beast) are the level of their owner: their own stat block is the level 1 block, and the level table below raises it. The twin keeps its own rule (half its owner's HP, its owner's Defense, its own damage with no factor) and stands at its owner's level for the level gap, however it was called.
7. **A fight that was already running** when this rule arrived keeps the numbers its units have. Nothing is worked out again for a saved fight.
8. **XP for a fight is unchanged** in this step (by difficulty: 25 / 50 / 100 / 200).

### The table

An enemy's numbers are its tier's row at level 1, raised by its level's row (`data/enemies.json`: `items` and `levels.table`).

**Tiers at level 1**

| Tier | HP | Armour | Defense | Attack bonus | Damage factor | Movement | Endurance | Spare magazines |
|---|---|---|---|---|---|---|---|---|
| Vermin | 15 | 0 | 10 | +0 | ×0.5 | 2 | 1 | 0 |
| Minion | 70 | 0 | 10 | +1 | ×1.0 | 1.5 | 1 | 1 |
| Soldier | 140 | 5 | 11 | +3 | ×0.78 | 1.5 | 3 | 2 |
| Elite | 240 | 10 | 12 | +5 | ×1.05 | 2 | 5 | 3 |
| Boss | 960 | 10 | 13 | +6 | ×1.2 | 2 | 7 | 4 |

**What a level adds**

| Level | HP | Armour | Defense | Attack bonus | Damage |
|---|---|---|---|---|---|
| 1 | ×1.00 | ×1.00 | +0 | +0 | ×1.00 |
| 2 | ×1.07 | ×1.04 | +0 | +0 | ×1.02 |
| 3 | ×1.16 | ×1.09 | +1 | +0 | ×1.05 |
| 4 | ×1.23 | ×1.16 | +1 | +0 | ×1.07 |
| 5 | ×1.30 | ×1.20 | +2 | +0 | ×1.10 |
| 6 | ×1.38 | ×1.27 | +2 | +1 | ×1.13 |
| 7 | ×1.43 | ×1.29 | +3 | +1 | ×1.17 |
| 8 | ×1.49 | ×1.36 | +3 | +1 | ×1.20 |
| 9 | ×1.54 | ×1.40 | +4 | +1 | ×1.24 |
| 10 | ×1.61 | ×1.47 | +4 | +2 | ×1.28 |
| 11 | ×1.67 | ×1.49 | +5 | +2 | ×1.33 |
| 12 | ×1.74 | ×1.56 | +5 | +2 | ×1.38 |
| 13 | ×1.78 | ×1.60 | +6 | +3 | ×1.43 |
| 14 | ×1.78 | ×1.60 | +6 | +3 | ×1.48 |
| 15 | ×1.79 | ×1.60 | +6 | +4 | ×1.53 |
| 16 | ×1.79 | ×1.60 | +6 | +4 | ×1.58 |
| 17 | ×1.80 | ×1.60 | +6 | +5 | ×1.64 |
| 18 | ×1.80 | ×1.60 | +6 | +5 | ×1.70 |
| 19 | ×1.81 | ×1.60 | +6 | +6 | ×1.76 |
| 20 | ×1.81 | ×1.60 | +6 | +6 | ×1.82 |

HP and armour are rounded to the nearest whole number. **Damage:** an enemy deals its weapon's damage × its tier's damage factor × its level's damage factor (it used to deal the weapon's damage with no multiplier). Everything else on the tier (Movement, AP, Endurance, spare magazines, techniques, Calls) does not change with level.

### The working

The yardstick is the plain rifleman of the baseline: a service rifle (30 damage) in the hands of a character with a normal share of points, measured on hits that land.

| Level | Yardstick: damage a hit | Attack bonus | HP | Defense | Soldier: HP | Armour | Hits to kill | Defense | Yardstick hits it | Soldier's hit, before armour | 2 soldiers drop the yardstick in (measured) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 45 | +3 | 145 | 11 | 140 | 5 | 3.50 | 11 | 65% | 23.4 | 3.3 rounds |
| 3 | 49 | +4 | 163 | 11 | 162 | 5 | 3.68 | 12 | 65% | 24.6 | 3.1 rounds |
| 6 | 57 | +5 | 190 | 12 | 193 | 6 | 3.78 | 13 | 65% | 26.4 | 3.2 rounds |
| 9 | 63 | +7 | 233 | 12 | 216 | 7 | 3.86 | 15 | 65% | 29.0 | 3.0 rounds |
| 12 | 70 | +8 | 288 | 13 | 244 | 8 | 3.94 | 16 | 65% | 32.3 | 3.1 rounds |
| 20 | 72 | +9 | 445 | 17 | 253 | 8 | 3.95 | 17 | 65% | 42.6 | 3.0 rounds |

How each column was set:

1. **Armour** grows as the yardstick's damage a hit grows: 45 at level 1, 72 from level 13, so ×1.60 at the top. Armour then takes the same share of a hit at every level.
2. **HP** grows a little faster than that: ×1.16 at level 3 where the yardstick's damage is ×1.09, ×1.74 at level 12 where it is ×1.56, ×1.81 at level 20 where it is ×1.60. The first table gave HP the yardstick's growth exactly (3.5 hits for a Soldier at every level), and the simulator showed fights getting shorter level by level, because a squad grows faster than the plain rifleman does. The fit uses the room the target leaves: a Soldier takes 3.5 of the yardstick's hits at level 1 and 3.68, 3.78, 3.86, 3.94 and 3.95 at levels 3, 6, 9, 12 and 20 (target 3 to 4); an Elite 6.9 at level 1 and 7.3 to 7.8 after (target 6 to 8). HP cannot go further without a fifth hit on a Soldier.
3. **Hits to kill at equal level** (HP ÷ (yardstick damage − armour)): Vermin 15 HP, one hit from almost any weapon. Minion 70 ÷ 45 = 1.6, so 2 hits; a critical (45 × 1.64 = 73) can do it in one. Soldier 140 ÷ 40 = 3.5. Elite 240 ÷ 35 = 6.9. Boss 960 ÷ 35 = 27 hits.
4. **The boss** is set from whole boss fights (1 boss and 2 soldiers against the squad of four), target 8 to 10 rounds. With 900 HP and damage ×1.4 the fight was 9.6 to 9.8 rounds at level 1 with 2.2 to 2.5 characters Downed a fight and 17 to 27% of fights lost: long enough, too deadly. Damage ×1.2 brought that to 1.3 to 1.5 Downed and 3% lost but shortened the fight (fewer characters down means more shooting), so HP went to 960. Measured: 9.0 and 9.6 rounds at level 1, 7.7 and 8.6 rounds at level 3, 7.2 and 8.8 rounds at level 6, 7.1 and 8.9 rounds at level 9, 7.9 and 9.9 rounds at level 12, 6.5 and 9.2 rounds at level 20 (open ground and ground with cover).
5. **Defense** grows by what the yardstick's attack bonus grows: +1 every second level, to +6 at level 13 (+3 at level 1, +9 from level 13). The yardstick needs an 8 or more on the die against a Soldier at every level: 65% on open ground at 4 tiles. Minion and Vermin 70%, Elite 60%, Boss 55%.
6. **Attack bonus** grows by what the yardstick's own Defense grows (11 at level 1, 17 at level 20), so a Soldier hits the yardstick 65% of the time for the whole career (an Elite 75%, a Boss with its machine gun 70%, a Minion 55%).
7. **Damage.** The rule: a character at full HP in its normal armour lasts 3 rounds under fire from half the enemies of a standard fight for four (2 soldiers, or 1 elite and 1 soldier). The first table worked this out from 2.45 landed hits a soldier's turn and set the Soldier's factor at ×0.85 and the Elite's at ×1.15. Measured against soldiers who never go down, the yardstick then lasted 2.4 to 2.7 rounds and was Downed by the end of round 3 in about half the fights. The fit lowers the two factors by 8%: Soldier ×0.78 (a hit of 23.4 before armour at level 1, 8 after the yardstick's Class 3 armour), Elite ×1.05. Measured: the yardstick lasts 3.0 to 3.3 rounds under 2 soldiers and 3.2 to 3.6 under 1 elite and 1 soldier, and is Downed by the end of round 3 in about one fight in four. The level column (to ×1.82) is unchanged: the measure is flat across the six levels. A Minion keeps its weapon's damage; Vermin deal half.
8. **A tank lasts noticeably longer:** under the same 2 soldiers the reference tank lasts 6.1 rounds at level 1 (Class 3 armour) and 8.1 to 9.9 from level 3 (Class 4; the measure stops at 10 rounds). That is 2 to 3 times the rifleman, and more than "noticeably": how unkillable a tank may be is the defence step's question, not this table's.

### The fit

Whole fights played by the simulator: the baseline's squad of four (optimised gun, tank, Sigil caster, Calls leader), enemies of the squad's level unless the row says otherwise, 60 fights a cell on open ground and as many on ground with cover (`packages/engine/test/balance/fit.ts`). The full before-and-after, the tuning log and what is still off are in `docs/design/handoffs/balance-sim-step1.md`.

| Measure | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Target |
|---|---|---|---|---|---|---|---|
| Standard fight (3 soldiers, 1 elite): rounds to win, open · cover | 4.8 · 5.7 | 4.2 · 5.0 | 4.3 · 5.5 | 4.3 · 5.3 | 5.1 · 5.4 | 4.4 · 4.8 | 4 to 6 |
| Elite fight (2 elites, 2 soldiers): rounds to win, open · cover | 5.5 · 6.3 | 4.8 · 6.0 | 5.1 · 6.2 | 5.0 · 6.2 | 5.2 · 6.7 | 4.6 · 5.6 | 6 to 8 |
| Boss fight (1 boss, 2 soldiers): rounds to win, open · cover | 9.0 · 9.6 | 7.7 · 8.6 | 7.2 · 8.8 | 7.1 · 8.9 | 7.9 · 9.9 | 6.5 · 9.2 | 8 to 10 |
| Standard fight: won · fights with someone Downed (open and cover together) | 99% · 28% | 100% · 8% | 100% · 17% | 100% · 8% | 100% · 28% | 100% · 8% | 90% · 33% |
| The yardstick under fire: rounds it lasts, 2 soldiers · 1 elite and 1 soldier | 3.3 · 3.2 | 3.1 · 3.2 | 3.2 · 3.4 | 3.0 · 3.4 | 3.1 · 3.5 | 3.0 · 3.6 | 3 |
| The tank under the same fire | 6.1 · 5.8 | 9.8 · 8.6 | 9.9 · 9.5 | 9.8 · 9.5 | 9.1 · 9.3 | 8.1 · 9.2 | noticeably longer |
| Standard fight, enemies 3 levels up: won, open · cover | 67% · 30% | 58% · 47% | 68% · 50% | 78% · 62% | 75% · 57% | (20 is the top) | lost more often than won |
| Standard fight, enemies 5 levels down: most hits any enemy took | – | – | 1 | 1 | 1 | 1 | 1 |

What the table holds: the hits to kill, the 65%, the standard fight's length at every level, the 3 rounds under fire, the tank, the one-hit rule. What it does not, and why:

1. **The elite fight is about a round short on open ground** (4.6 to 5.5 rounds; 5.6 to 6.7 with cover) and **the boss fight is short on open ground from level 3** (6.5 to 7.9; 8.6 to 9.9 with cover). Enemy HP is at the top of what the hits-to-kill targets allow. The squad's damage is what is over: the optimised long rifle deals 173 to 215% of the yardstick (target: a bit under 150%). The weapon step closes this, not the table.
2. **A standard fight is too safe:** won 98 to 100% of the time (target 9 in 10), someone Downed in about 1 fight in 6 (target 1 in 3). This pulls against the 3 rounds under fire: with damage that puts someone down in 4 fights of 10 (Soldier ×0.95, Elite ×1.3) the yardstick lasts 2 rounds, not 3. The fit holds the 3 rounds, because that measure depends on the table alone, and leaves the other to the steps that change what a squad can do. Leon's call (the report's question 1).
3. **Enemies 3 levels up are still beaten more often than not** on open ground (58 to 78% won). Three levels of the table and ±3 to hit are not enough. In the simulator, a gap of 2 to hit a level (in place of 1) loses that fight 70 to 100% of the time (tried before the damage factors were lowered); it is not built (the report's question 2).
4. **The numbers fall with level where nothing in the table says they should:** characters Downed in a boss fight go from 1.4 a fight at level 1 to about 0.5 at level 20. The table is flat for the yardstick in its Class 3 armour (a Soldier's hit is 8 after armour at level 1 and 27 at level 20, as its HP goes from 145 to 445). It is not flat for a caster in Class 1 armour, whose HP triples while the same hit only doubles (18 to 38), and a squad kills faster as it grows. Armour by level is Equipment 2.0's.

### The level gap

1. **Far below.** An enemy 5 or more levels below the character who hurts it is taken out by that hit (**never an Elite or a Boss**: they always fight to their last HP; Leon, 11 Nov 2026), whatever its HP and its shield, as long as the hit deals at least 1 damage after every reduction. Any damage counts (a weapon, a spell, a bleed the character caused, the character's companion). The attack card says so before the shot ("far below your level: any hit takes it out") and the fight log says so after it. It never works the other way: an enemy 5 levels above a character gets its bonus to hit and nothing more. (The first build called this rule "Outclassed"; the name is not used in the game, because a perk already has it.)
2. **To hit.** For each level between an enemy and a character, the higher of the two gets +1 to hit the other and the lower gets −1, to at most 5 levels. This is on top of the table. An enemy 3 levels above the squad is then hit 42% of the time instead of 65% and hits back about 80% of the time: the fight to run from. The table alone cannot do this (three levels of the table are worth about 7 points of hit chance), which is why the gap has its own line. **It is read by weapon attacks and techniques only.** A spell's roll to hit (Sigil, Outburst) and every save do not read it yet (section 14, item 1032).
3. The gap is read between an enemy with a level and a character (or a companion, which has its owner's level; a twin too). Each character reads its own: in a squad of levels 1 and 20 the fight is level 10, the level 1 character is 5 below every enemy and the level 20 character takes each of them out with one hit (section 14, item 1033). It does not apply between characters, or to a unit from a fight saved before this rule.

### Vermin

A tier under Minion, for swarms: small things that die to one hit at equal level. 15 HP, no armour, weak attacks (half its weapon's damage), fast (2 tiles an AP), no techniques, no Calls, no spare magazines, nothing in the drop tables, and the least weapon drill of any tier (1 a kill). It counts as a Minion wherever a rule ranks tiers (saves, notice). Where a rule names tiers one by one it is not yet named (section 14, item 1035). Player-facing name: **Vermin**.

### Critical hits

1. **A critical multiplies damage by 1.5.**
2. **It can rise to ×2.0 and no further**, everything together: Perception gives +3% for each point above 1, Dexterity +2% a point, and One Shot's Breath Held +25% on that shot. Perception 10 and Dexterity 10 make ×1.97; anything more stops at ×2.0. (It was 2 + 10% a point of Perception + 5% a point of Dexterity, about ×2.4 at level 1 and ×2.9 at level 20, and Breath Held multiplied that by 1.5 again.)
3. **An enemy's critical is ×1.5** (it was ×2).
4. The target's Critical damage taken still cuts the part above ×1: at −50%, a ×1.5 critical is ×1.25.
5. **It never falls under ×1.5** either, whatever a sheet holds.
6. What makes a critical more likely (an Aimed shot, an ambush, a weapon or a technique that crits on 18 to 20) is not changed. The limit inside Sigil magic (350, or 500 on a critical) is not changed in this step.
7. **This is the weapon's critical.** A spell's critical (a natural 20 on a Sigil's or an Outburst's roll to hit) still doubles the spell's damage, for characters and for enemy casters: it is not changed in this step (section 14, item 1031).

### Not in this step

The weapons (the long rifle against the service rifle), the AP prices, Burst, the Calls, defence stacking and XP by level are later steps of the balance pass. The simulator (`packages/engine/test/balance/`) fights enemies of a chosen level and measures this table against the targets (`fit.ts`); every later step runs it again.

## Maps (rules 1.16)

Leon, 11 Nov 2026: fights were crowded on 16 × 11 tiles. A squad had no room to manoeuvre, every weapon was in range from the first turn, and a melee fighter had no approach to make. Maps grow so that range bands, Sprint and cover on the way in matter (`docs/design/proposals/2026-11-combat-roles.md`). Numbers are in `data/maps.json`.

**Size.**
- A map is **at most 26 tiles wide and 26 tall**: columns A to Z, rows 1 to 26 (39 m a side). Nothing is larger, so a grid reference is always one letter and a number.
- A map is **at least 8 × 8** (provisional, item 1039).
- **Open ground** (the map of the Narrator's Own Start, and of any fight that names no place) and **the Proving Ground** are the full **26 × 26**.
- **A campaign zone has its own size**, any width and any height from 8 to 26, chosen when the campaign is made: a cellar may be 12 × 9, a street 26 × 10. A later game mode may set smaller maps the same way. An interior that should feel tight stays small: the penthouse of *A Summoning in Central City* stays 16 × 11 (24 m × 16.5 m is already a large suite, and its two starts are 11 tiles apart; item 1041).
- A size outside the limits is **an error**: the campaign check refuses the file and says why. The engine never cuts a map down to fit.
- The four M813 zones keep their 16 × 11 layouts until M813 is rewritten.

**Deployment.** Where a fight starts with the two sides apart (a prepared fight, a wave on the Proving Ground, a fight on open ground):
- The squad starts on its **start tiles** and the enemy on its **enemy start tiles**, as the map gives them. On the full-size maps the nearest tile of each side is **10 to 14 tiles** from the other's (13 on open ground and on the Proving Ground): outside pistol and shotgun range, inside a rifle's, and two turns of walking for a melee fighter at Agility 1, with cover on the way.
- **A map that gives no enemy start tiles** gets them from the engine: the squad's start tiles mirrored to the other side of the map; if that leaves the nearest of each more than 14 apart, the enemy's tiles come nearer, column by column, until it is 14; a tile inside solid ground or on something that blocks the way moves to the nearest free tile. On a map too narrow for 10 tiles, or with the squad starting in the middle, the enemy starts as far to the other side as the map allows.
- **More fighters than start tiles:** the next one stands on the free tile nearest that side's start tiles, never on the other side of the map.
- **Out of sight on turn 1.** The full-size maps that ship are laid out so that no start tile of one side has a line of sight to a start tile of the other: something that blocks sight (a wall, a building, a barricade line) stands between them, with a way round it on both sides. A campaign author is asked to do the same wherever the place allows it; the engine does not move start tiles to make it so (item 1042).
- A fight that starts in the middle of the story is not deployed: everyone starts where they stand, and an enemy the Narrator places with a grid reference starts there.

**What a full-size map needs.** Both starts on free ground; a way between them (never a walled-off start); cover within 4 tiles of each start; at least two ways across (a lane or a flank each side of the middle), so a squad can go round instead of meeting head-on; some difficult ground. The game's own maps are checked for all of this by a test that walks every zone of every campaign.

**Drawing a map.** A map may be written as a picture instead of lists of tiles: one row of characters per row of the map, one character per tile (`docs/design/campaign-format.md`, "A map as a picture"). `.` is open ground, `#` solid, `~` difficult ground, `S` a squad start tile, `E` an enemy start tile; any other character is an object the zone's legend names (`c` a crate, `w` a low wall, `P` a pillar, `B` a barricade, `o` a barrel unless the legend says otherwise). The engine turns the picture into the same lists a hand-written zone has. Open ground is one shared picture (`data/maps.json`, `layouts.open_ground`).

**Plain colour.** A map with no painting is drawn in the interface's own colours, and that is the normal case: open tiles in the ground colour, solid ground and walls in the raised panel colour, difficult ground a shade lighter than open ground, half cover and full cover in their two browns, objects as their sprites or their labels. No map is painted today: the four M813 paintings were made for layouts and a scale that no longer hold and are retired to `art/_archive/maps/` until the maps are repainted (`art/briefs/ART-REQUESTS.md`, maps M1 to M9). A zone's banner (the illustration over the story) is not a map painting and stays.

**Saves from before this revision.** A fight in progress keeps the map it began on (the fight carries its own map). A story in progress keeps the zones its campaign was copied in with: a zone whose layout changed keeps its old layout and size, and only new games get the larger ground.

**The enemy on a big map.** The enemy's rules are unchanged: it attacks what it can, and otherwise walks toward the nearest tile with a line on someone, around what is in the way. A round of twelve enemies on a 26 × 26 map takes the engine about 0.2 seconds (measured 11 Nov 2026).

## Exploration, social play, rest, and the Narrator

**Social checks** use the target's disposition as the TN.

| Disposition | TN |
|---|---|
| Friendly | 8 |
| Neutral | 12 |
| Wary | 16 |
| Hostile | 20 |

Threats, arguments and seduction that aim to break someone rather than persuade them work like debuffs: Intimidation, Eloquence or Implication against the target's Body, Brain or Heart save.

**Karma** is one score from −100 (Chaotic) to +100 (Lawful). −29 to +29 is Neutral. Traits that lock Karma double the cost of leaving the locked band. The Narrator awards it (at most 30 a time) and flags unlawful acts; the engine adds Conscience and keeps the score (rules 1.3).

**Reputation** is tracked per faction, from −100 to +100: Hated (−60 or less), Hostile (−59 to −20), Unknown (−19 to +19), Known (+20 to +59), Revered (+60 or more).

**Rest**

| Rest | Takes | You recover |
|---|---|---|
| Short | 1 hour | 25% of max HP; Heat, Flux and Strain reset |
| Long | 8 hours | all HP; MP to full if the air is Normal or richer; Supplies and toxins restocked from carried stock; a Bard can treat injuries (item 581) |

The Narrator calls a rest (or the host does, with Rest… in the story; any player can ask for one, and the request goes to the Narrator). No rest in a fight. In the Proving Ground the host rests from the tools while gearing up. The start of a session counts as a long rest (the host starts the next session from the same menu: rules 1.6.1, item 721). Each rest starts a new window for once-per-rest uses (rules 1.3). A long rest is also a **day** on the day counter (rules 1.6.1, item 709; the start of a session isn't); the Narrator moves time on with days.

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
  - Attacking: Shot, Aimed shot, Melee. A shot at something with no HP (a console, a crate, a door) is a real shot: it spends a round, adds heat, needs sight and an unjammed, loaded weapon, and shows in the story as an action; the Narrator rules what it does.
  - Analyze, Reload (speed or tactical), Load a magazine, Pick up from a pile, Clear a jam, Field Repair, Stim an ally, drop prone or stand.
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

**On screen** (6 Nov 2026, Leon):
- **The area map** shows your status beside the actions (HP, MP, AP left, the weapon with rounds loaded and spare magazines, red when empty) and a **log** of this round under the map: shots, reloads, doors, rolls.
- **Actions read as actions** in the story: a line with a red edge for an attack, a white edge for anything else.
- **A point of interest is rolled in its own popup:** trying an approach opens the dice right there, and a "Roll it" button stays in the popup until you do. The bar above the chat is only for checks the Narrator calls.
- **The play screen is fixed:** the header, the sheet, the map column and the input stay on screen; each column scrolls on its own. The story sticks to the newest line; scrolled up, a **↓ Latest** button (with the count of new lines) jumps back down.

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

## World Play (rules revision 1.7)

> **Rules revision 1.7: World Play (accepted direction, Leon, 8 Nov 2026; decision 105; design `docs/design/world-play-spec.md`).** The principle: **anything the story says is there is on the map, and the engine owns what it does.** The Narrator places things and writes their choices; the engine runs the rolls, the costs and the effects, and typing can't skip a check. Every number below is provisional (items 636–670). Data: `data/world_play.json` (kinds, weights, avatar pools, the hurt table, hazards), the `cache` kind in `data/objects.json`.

**People on the map have a face.** Every token has a **kind** (human, robot, drone, crawler, beast, machine; default human) and an **avatar** (an art id). The Narrator may name the avatar; otherwise the engine picks one: the campaign's portrait for that name, else the kind's pool (world-character portraits for humans and crawlers, the drone art for drones and machines, the infantry-robot art for robots; beasts have none yet and show their kind badge). The web draws every token with its avatar and a kind badge.

**Carrying people and things.**
- **Carry** (1 AP, area map): pick up an adjacent creature that is not hostile, or is a prisoner, or is at 0 HP. Its token leaves the map and rides in the carrier's inventory with a weight by kind: robot 40 kg, drone 15, human 70, crawler 70, beast 80, machine 40 (any other kind 70). The weight counts against Carry weight; the overweight rules apply (−1 Movement per started 5 kg over, no Sprint).
- **Put down** (1 AP, area map): onto an adjacent free tile (the nearest free one when none is named). The token comes back with its name, kind, avatar, side and state.
- **In a fight** carried creatures come along (their weight stays). A carrier who is **Downed** drops them on the nearest free tiles; in a fight they lie there and are tokens again when it ends. Out of a fight they are tokens at once.
- **The Narrator** carries and drops in the story with `npcs[]` `carry` (id, charId) and `drop` (id, charId, at): no AP, no adjacency. Typed lines map to `actions[]` `carry` (targetId) and `put_down` (targetId, to).

**Caches.** A new object kind, `cache` (a crate, a body, a locker), holds `items[]` in the loot shape (an item or weapon id, qty, rarity, name; a plot item is a name and a line of text). **Search** (1 AP, adjacent, in a fight too) moves everything into the searcher's pack and empties it. A locked cache opens through its approaches first. Players see that a cache holds something, not what, until it is searched. `loot[]` stays for direct gifts.

**Approaches with consequences.** An approach (on an object, a hazard or a person) has a success effect and a failure effect, and the engine applies both.
- **Success:** remove (break or clear it), open (unlock), reveal (the object and every hidden token, object and hazard within 3 tiles of it), disarm (the object and any hazard on its tile), loot (the actor gets its items), advance (the objective named in `objective` is done), "" (the Narrator narrates). On people also ally (hostile becomes neutral, neutral becomes an ally) and inform (the hint and a map marker).
- **Failure (`fail`):** hurt (Physical damage by the approach's TN: 8 → 10, 12 → 20, 16 → 35, 20 → 50, armour applies), alarm (every hidden hostile in the zone is revealed and alerted; the Narrator is called and may start the fight), condition (`failCondition`, e.g. Bleeding, Shaken, Slowed), jam (the object locks for the rest of the scene and that approach is gone), lose (one `failItem` leaves the actor's pack), "" (nothing more). On people also hostile (the person turns hostile).
- The Narrator never writes these numbers. Each character tries each approach once (the old once-per-scene retry is gone). An attempt costs 2 AP.

**Hazards.** The Narrator places and removes hazards with `hazards[]`: a kind, a severity (light or heavy), an area (tiles, or a rectangle `from`–`to`; at most 64 tiles) and `hidden` (until spotted). **The engine runs them on every tile entered, in a fight or on the area map, at any speed** (moves, sprints and the Narrator's own moves walk the path):

| Kind | Light | Heavy | Also |
|---|---|---|---|
| minefield | 25 | 45 | Body save (TN 12 / 16) halves; armour applies; that tile's mine is spent; the walk stops |
| fire | 10 | 20 | Burning (no save); ignores armour |
| radiation | 5 | 10 | Weakened from the 3rd tile a unit enters in it; ignores armour |
| gas | – | – | Heart save (TN 12 / 16) or Shaken (light) or Stunned (heavy, the walk stops) |
| collapse | 20 | 35 | Prone; armour applies; the walk stops |

- **Every hazard has two approaches the engine writes itself** (TN 12 light, 16 heavy; 2 AP; within 1 tile of it): **Find a safe path** (the better of Vigilant and Sensory) marks a one-tile lane through it that doesn't trigger for the squad; **Disarm** (put it out, vent it, shore it up: the better of Proficiency and Ingenuity) removes it, and failing it gives the actor one tile of the hazard's effect.
- **Hidden hazards** are found by passive Vigilant (10 + modifier) against the hazard's TN within 2 tiles after a move, by stepping in, or by a reveal. Their approaches open once they are seen. Players' views never carry an unseen hazard.
- Enemies set hazards off too. Tokens on the area map are not hurt by them (the Narrator's call).

**Triggers.** The Narrator sets triggers with `triggers[]` that fire without a Narrator call, once each:
- **when:** `enter` (a party member steps on one of its tiles or its rectangle), `examine` (any interaction with an object: examine, search or an attempt), `objective` (an objective is done);
- **then:** `spawn` (people in the `npcs[]` place shape, hidden or not), `fight` (spawn, then start a fight with its `difficulty`; every hostile token on the map joins), `reveal` (the ids it lists, or everything hidden on and next to its tiles);
- the turn after, the Narrator is told what fired and narrates it. Triggers are never shown to players. At most 16 a zone; area-map only.

**Talking without typing.** People take `wants` (one plain line), `knows` (an objective id and a one-line hint) and `talk[]` (2 to 4 approaches). Clicking a token opens its **Talk panel**: **Ask what they want** (1 AP, shows `wants`), **Ask about the objective** (1 AP, shows the hint and puts a marker on the map), and the talk approaches, rolled like any approach. Talking needs the person within 3 tiles and seen. Every choice also goes into the round's lines, so the Narrator answers in character. Free typing still works.

**A clear aim in every area.** Objectives take an optional **`where`**: a zone id and references (token ids, object ids, grid references), set by the campaign or by the Narrator's `missions[]` `where`. The **HERE card** shows up to 3 open objectives in this zone (the first open one elsewhere when none is here) and what moves each forward. Each reference, and each hint a person gave, puts a **marker** on the map.

**Typing can't skip a check.** A typed attempt at something an approach, a hazard or a check covers maps to `actions[]` `attempt` (an object, hazard or person id and the approach's number as listed) and the engine rolls it like the button. The Narrator never grants it by fiat. People who give a task say what, where and why, plainly.

**In the Proving Ground** the tools place caches, hazards, triggers, people (kind, avatar, wants, knows, talk) and objectives with `where`; attempts roll at once (there is no Narrator).

> **Rules revision 1.9: World Play 1.1 (accepted direction, Leon, 9 Nov 2026; decision 106; design `docs/design/world-play-1.1-spec.md`).** What lands on the ground stays on the map, every map shows it, and the engine owns it. Every number below is provisional (items 671–700). Data: the `pile` kind in `data/objects.json`, the `pile` and `gear` blocks and `ap.pickup` in `data/world_play.json`, the gear actions in `data/rules.json`, the drop tables in `data/loot_tables.json`.

**Piles: things on the ground.** Everything lying on a tile is **one pile** (an object of kind `pile`: open, never blocking movement or sight, weighing nothing to anyone). The caches' code holds it: a cache is closed (players see how many things it holds until it is searched), a pile is open (whoever can see the tile sees what is in it).
- **Entries keep what they are:** a dropped magazine keeps its rounds and ammo type ("Rifle magazine 7/24"); loose rounds are one stack per calibre and ammo type ("38 × .32 Decrkm"); weapons keep rarity, durability, mods and loaded rounds; tools, consumables and plot items keep their qty and text.
- **Merging:** dropping onto a tile with a pile adds to it. Loose rounds of the same calibre and type merge; plain items with the same id merge their qty; magazines, weapons and unique items stay separate entries. A pile holds at most **24 entries**: past that the oldest junk is lost (empty magazines first), with a log line (items 672, 673).
- **Pick up** (1 AP, from your own tile or an adjacent one, on any map): tick the entries you want (all by default). In a fight it is a combat action; on the area map an area-map action that spends the round's AP. Searching a pile is picking up everything (item 674).
- **What goes where:** in a fight a magazine for your main-hand gun joins its spares, one for a different off-hand gun the off hand's, any other magazine your pack after the fight; loose rounds for your gun's calibre join the rounds you carry for it; everything else goes into your pack at once. On the area map everything goes straight into the pack (item 675).
- **Fog:** a player sees a pile only on a tile the party can see now (each party member's vision, halved in the dark, and line of sight, as for units). The Narrator sees every pile (item 676).
- **Hidden piles:** a pile the Narrator places may be hidden: it is not drawn for players until it is spotted (passive Vigilant 10 + modifier against TN 12 within 2 tiles after a move) or revealed (an approach's reveal, a trigger). Reload drops are never hidden; one landing on a hidden pile reveals it (item 677).
- **Persistence:** piles live with the map, not the fight: area map → fight → area map, on the same map or another zone's, across travel and saves (item 678).
- **The Narrator** places piles with `ground[]` (`at`, `items[]` in the loot shape, `hidden`), the ids `loot[]` takes plus `mag:<weapon id>` (one magazine, full unless `qty` says rounds) and `rounds:<calibre>`; at most 6 a turn and 12 items each. `loot[]` takes the same two ammo ids (items 681, 682).

**Paths and hazards.** A click-path for a player's unit (in a fight or on the area map) goes around every revealed hazard tile when such a route is at most **2 tiles** longer than the shortest; otherwise it takes the shortest, and the move preview names the revealed hazard tiles it crosses. Hidden hazards stay hidden; enemies and the Narrator's moves take the shortest path (item 683).

**Gear in a fight.** One rule: changing what a hand holds costs **1 AP a hand**. The data: `data/world_play.json` `gear`, the action costs in `data/rules.json`.

| Change | Cost |
|---|---|
| Draw from the backpack into one hand (a pistol, a focus, a torch, a shield; what the hand held goes to the pack) | 1 AP |
| Draw a two-handed weapon (it fills both hands; what the off hand held goes to the pack) | 2 AP |
| Swap main hand and off hand | 1 AP |
| Put away what a hand holds into the backpack | 1 AP a hand (2 for a two-handed weapon) |
| **Drop** what a hand holds | **0 AP**: it lands in the pile on your tile (Piles) |
| **Light armour** piece (1.2 kg or less, provisional: the field helmet, gloves, goggles, masks, light belts, undershirts, light trousers, field boots…) on or off | 1 AP each |
| Heavier armour (over 1.2 kg: the ballistic helmet, plates, greaves, the armoured belt, heavy boots…) and body armour | **not in a fight** |

- **Hot-Swap** makes one draw, put-away or swap free (once a turn, twice at Tier II), a two-handed draw too; never armour (item 686).
- **Disarmed:** you can draw another weapon into the main hand (or swap the off-hand one there): the weapon on the ground stays there, in the pile on your tile, and Disarmed ends. Recover is unchanged (item 687).
- **A focus counts only in a hand** (item 630): drawn from the pack it counts at once; put away or dropped it stops new casts (item 632).
- The change rebuilds the fighter from the character (armour, Defense, Movement, Vision, light, weight, the off-hand gun's spares, throwables), keeping HP, AP, conditions, heat, a held Outburst and the off-hand gun's real rounds (items 688, 689).
- **The Proving Ground** charges the same for the player's own gear in its fights; its tools stay free (item 690).

**Drop tables: what the fallen leave.** The engine rolls every drop on the fight's seeded dice, never the Narrator, once per death, and puts it in the **pile on the tile where the enemy died** (Piles; merged with what is there). The data: `data/loot_tables.json`. Every number is provisional (items 691–700).
- **Three layers, the most specific winning** (item 691): the engine's defaults; a campaign's own `loot_tables` (a table with an engine table's id replaces it) and `drops` on its zone people and encounter enemies; the Narrator's `drops` on `combat.enemies[]` and `npcs[]` for one fight or one person. A layer that says anything about an enemy's rolled drops replaces the layers under it for that enemy.
- **A `drops` value** is `{ table?, items? }`: a table id, and a list of `{ item, qty (n or [min, max]), chance?, rarity?, name?, text? }` in the loot shape (the ids `loot[]` takes, `mag:<weapon>` and `rounds:<calibre>` too; an unknown id is a plot item). The Narrator writes at most **4** items a list (item 698).
- **Always dropped**, outside the cap (item 694): the weapon the enemy was using, **worn** (durability 40–80% of its maximum, rarity kept, the rounds in it still in it), and what it still carried for it: up to **2** spare magazines with their real rounds, or, for a weapon loaded round by round, its loose rounds (at most two magazines' worth). Natural weapons (fists, a beast's bite, a weapon with no item) drop nothing.
- **Rolled**, by kind (items 692, 693): people roll on `person` (personal effects, rations, cigarettes, stims and the like); robots, machines, turrets and drones on `machine` (spare parts, mana cores); Sigil and Soul casters on `caster` (cores, rarely a heart or sigil plate); beasts on `beast` (empty: a campaign or the Narrator adds trophies). A minion and a soldier roll once, an elite and a boss twice; a roll may come up empty.
- **The cap** (item 695): at most **2 / 3 / 4 / 5** rolled items a fight (easy / standard / hard / boss). Past it nothing more is rolled into the piles; the host's log says so ("loot cap reached").
- **Bosses** always drop one **notable** thing (a roll on the `notable` table: a fine or masterwork weapon, a mod, an Essence of Experience, a plate), outside the cap (item 696).
- **Nothing** from surrendered or subdued foes (they keep their gear as prisoners), companions, a player's own fighter, a Twin, or illusions (item 697).
- **The Narrator learns what dropped:** a log line per death ("Rook drops: Service pistol (worn), magazine 9/12, a letter home, unsent") that the end-of-fight report carries (item 699).

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

## OOC, missions and end states

Players need to ask the table things the story can't answer, see what they are trying to do, and know when it is done (Leon's M813 playtest, 23 rounds: "[OOC] Quest complete, now what?", "So mission complete? We just free roam now?").

**Out of character (OOC)**

- **Marking a line.** A player's line is OOC when its OOC toggle (beside Send) is on, or when it starts with `[OOC]`, `(OOC`, `OOC:`, `//`, `[to the narrator]` or `[to the narator]`, in any case. The marker is stripped for display.
- **It costs nothing.** An OOC line doesn't use the player's Say for the round and isn't their turn in the speaking order. It can be sent at any time after the session starts: between turns, while the Narrator is answering, in a fight (the combat Say row reads the same markers), and after the campaign ends.
- **Everyone sees it,** muted and labelled "OOC · player name".
- **The Narrator answers on its next turn,** in a separate "NARRATOR · OOC" box everyone sees: plain, short (at most about 80 words, *provisional, item 406*), naming the current objectives and two or three concrete options. No prose, no hidden objectives, no secrets. The questions reach it in their own block, by character name, never in the transcript.
- **No extra call.** An OOC question never triggers a Narrator call of its own. It makes the round's close call the Narrator even if nobody said anything in character, so a room that only asked OOC is answered as soon as everyone ends their turn. A question asked while a call is in flight waits for the next one. *Provisional, item 407.* At most 8 questions wait at once; older ones drop (*provisional, item 406*).

**Missions**

- A campaign may list **missions** (format: `docs/design/campaign-format.md`). Each has a title, an act, a player-facing summary and goal, objectives (some optional, some hidden until revealed), a next mission (or several branches), Narrator-only notes, and optionally an **end** (of an act, or of the campaign). Each objective has a `done_when`: guidance for the Narrator, not code. Campaigns without missions play as before.
- **Start:** at session start, every mission no other mission leads to becomes active.
- **The Narrator marks progress** with its turn: an objective done, failed, or revealed (a hidden one), or a whole mission done, failed or revealed. The engine checks every id against the campaign and ignores unknown ones; only active missions change, and a settled objective stays settled. At most 12 updates a turn (*provisional, item 409*).
- **A mission closes** when every required objective is settled: complete if all are done, over if any failed. Optional objectives never hold it open. Either way its end fires and its next mission activates; with several branches, the Narrator picks one (missionNext) once the story has decided. *Provisional, item 408.*
- **Side jobs:** the Narrator may add side jobs (an id, a title, a line) and settle them; it can't add, edit or remove main missions. At most 12 a turn and 24 in all (*provisional, item 409*).
- **Log and toasts:** every change is a line in the story ("✓ Objective: Get the wounded aboard") and a toast for everyone. No XP comes from missions; the Narrator's quest XP stays as it is.
- **The mission board:** a MISSIONS button in the header, with the count of open objectives and side jobs, opens the board: the current mission's title, goal and summary, its objectives (☐ to do, ✓ done, ✕ failed; optional ones marked), side jobs, and completed missions folded below. Hidden objectives, notes and `done_when` never show.
- **The board NPC** (open campaigns): a campaign may name an NPC (name, zone, tile, portrait) who offers side jobs in character. They stand in their zone as a neutral token. M813 is linear and has none.
- **Old saves** without missions load and play. Refreshing the campaign from the built-ins (host) starts the board at the first mission.

**End states**

- **Act end:** when a mission with an act end closes, everyone gets a full-screen MISSION COMPLETE card: the act's title, what happened (the Narrator's scene summaries and chapters since the act began), the objectives done, the XP each character gained in the act (from the engine's records), key choices (memory facts of importance 4 or more from the act), and the next mission's title and goal. No extra Narrator call. Continue returns to the story; each player sees the card once. The Narrator's next turn is told: "ACT ENDED: open the next mission … with a clear scene and a clear first goal."
- **Campaign end:** when a mission with a campaign end closes, the Narrator gets one last turn, the **epilogue**, guided by the mission's epilogue guidance. Open checks and Overreach pushes are dropped (*provisional, item 410*); a fight still on finishes first. Then everyone sees the end screen: the epilogue, each character's final card (portrait, class, level, deeds), the campaign's credits if it has any, and Return to the room. The save is marked complete: nobody speaks in character any more (OOC still works), and the room shows the campaign as finished.

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

## The Proving Ground

Practice mode: gear up, then fight waves of drill units on one arena, with endless retries and a tools panel for everything the engine owns. **No Narrator is ever called there**, on any path (no story work is ever queued, every Narrator and story action is refused, and the host's client never calls a provider while it is open). Nothing done there lasts: no XP, no injuries, no deaths, no story; leaving restores the room exactly. Sandbox actions are refused outside it.

- **Opening it.** From the title, PROVING GROUND asks **Solo** or **With friends**; both open a fresh room just for it (*standalone*), the host with a test fighter, "Recruit" (Wick's face). With friends shows the room code big, with a copy button and the shareable link (the Squad tab's *Invite friends* shows it again). From an existing room, the host's ⚔ Proving Ground opens it with the room's locked-in characters.
- **Gearing up and fighting.** Gearing up, the squad stands on the map with the wave's drill units idle; gear and magic change freely and moving costs nothing. A fight begins with *Start the fight*, or at once when anyone attacks a drill unit (the fight's log says so, and how many were ready). When it ends (cleared, fallen, or stopped by the host) the Proving Ground is gearing up again. Cleared: Next wave, for everyone at once, the squad as it stands. Fallen: Retry the wave (everyone refilled at the start tiles) or Restart from wave 1.
- **Waves.** Wave n's point budget is 2 + 1.5n (minion 1, soldier 2, elite 4, champion 8; soldiers from wave 2, elites from wave 4, a champion every 5th wave; at most 8 units). With friends the budget and the soldier and elite caps take **× (0.6 + 0.4 × players)**, players being those with a fighter (one player: × 1, the solo waves). *Provisional.* The wave the tools placed on the map is placed again when the party grows or shrinks while gearing up.
- **Tools for magic** (rules 1.4). The *magic kit* gives an Evoker (in the off hand where it fits), 4 mana cores and the words FIRE, SEEK, SPREAD, CONDENSE and WARD: a Reach word among them, so the kit casts at once (every new caster starts with a Reach word); *learn* teaches any of the 40 words without the Brain Power cap. *Spawn* can make the unit a **Sigil caster** of its tier (item 469: Sigil novice, adept or warden): it fights with an Evoker and its words, with the caster's own weapon unless another is picked.

### With friends (multiplayer)

- **A fighter for everyone.** Up to 4 players (the room limit). A friend who joins gets their own test fighter, "Recruit 2", "Recruit 3"… (Wick's face), refilled, on a free start tile; joining mid-fight, it fights in the next one. Instead, a player can **bring** one of their saved characters or drafts (the library, or a `.phc.zip` file) while gearing up: a **copy** replaces their Recruit, and nothing done in the Proving Ground reaches the saved character. Brought copies and Recruits are removed when the Proving Ground ends. A player with no fighter can take a Recruit at any time between fights.
- **READY.** Each player with a fighter has a READY toggle (in the tools and on the Squad tab). *Start the fight* is the host's button and shows how many are ready ("2 / 3 ready"); the host can start anyway, and once everyone is ready anyone can. READY clears whenever a fight begins.
- **Who can do what.**

  | Everyone | Host only |
  | --- | --- |
  | Gear tools on their **own** fighter: give, equip, unequip, drop, armour, the magic kit, learn, designs, class, level, skills, perks, traits, refill | Spawn and clear enemies, place and jump waves, the mana meter (*Everyone can spawn* opens these to all) |
  | READY; their team (team fight); bring a character or take a Recruit | Enemy AI on or off, endless waves, stop a fight, retry or restart mid-fight |
  | Next wave after a clear; Retry or Restart after a fall (the host can turn *Guests can retry* off) | Room settings (Mode, Everyone can spawn, Guests can retry), remove a player, end the Proving Ground |

  The host can also use the gear tools on anyone's fighter. *Everyone can spawn* is off by default; *Guests can retry* is on.
- **Co-op.** Turn order and initiative are as in any fight; each player plays their own units, and every player sees every turn's banner, the cut-in on their own turns and the same effects. The best wave cleared is kept for the room and for each player (the Squad tab lists every player: colour, name, fighter, READY, best wave, and team in a team fight).
- **Team fight** (room setting *Mode: Co-op waves | Team fight*; switched while gearing up). No drill units. Players pick **Team A** or **Team B** on the Squad tab (alternating by default). *Start the fight* begins a fight between the teams on the Proving Ground map, everyone refilled, Team A at the squad's start tiles, Team B at the far side. Each team has its own fog of war; friendly fire works as anywhere. **Downed is out** for both teams (no death saves, no stims back up). *Provisional.* A team wins when the other is all Downed, out or dead; then everyone is back to gearing up with full HP, and each winner's count of wins goes up. The engine seats Team B's fighters on the fight's foe side as players' units (no enemy AI runs them) and turns each Team B player's view around, so every player sees their own team as the squad.
- **Leaving.** A guest who leaves goes to the title, and their fighter goes with them (mid-fight too: the turn moves on; a team left with nobody loses). A guest whose connection drops keeps their fighter and READY and rejoins with the code. The host's *Leave the Proving Ground* puts the room back as it was (its characters, players, story and memory; players who joined during it stay in the room, players the host removed don't); opened from the title, it closes the room and everyone lands on the title, guests with the message "The host closed the Proving Ground."

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

The room hears one song at a time. The engine decides what plays and why; each player's browser plays it (YouTube's embedded player, or the game's own files for the fight music) and can pause it or turn it down for that player alone (the music panel's volume, times Settings' music volume; mute silences it). **Pausing changes nothing in the rules:** a song counts as playing for everyone while the room plays it.

**Layers** (the highest one playing wins):

| Layer | Source | Ends |
|---|---|---|
| Pinned song | A music-trait holder's song, kept on | After 2 area changes, or when its holder stops it |
| Spotlight | The favourite song of the character who did something amazing | One full play outside a fight; the end of the fight if it started in one |
| Last Rounds | The game's own track, while at least half the party is Downed (or dead) | When enough of the party is up again: it hands back |
| Encounter | The campaign's theme for that named encounter | The end of the fight |
| Combat | The game's own fight music (Project Heaven Cry OST): **Heaven Falls** once the party has seen an elite or a boss in the fight (it holds for the rest of the fight), or in a Hard or Boss fight (the difficulty is known to everyone); else **the fight's song**, one of the nine in the pool below. An elite or boss still hidden in the fog of war changes nothing, and the music card names only what the party has seen (an unseen one reads as plain *Fight*). Campaigns' generic combat tracks are not played | The end of the fight |
| Ambient | The zone's ambient track, else the campaign's | Leaving the zone |

**The fight's song.** Ordinary fights share a pool of nine songs: *Gunline*, *Brass on the Floor*, *Danger Close*, *Flank Left*, *Held Breath*, *Hold the Line*, *Line of Four*, *Mag Check* and *Suppressing Fire*. The engine picks one at random when a fight begins, and the pick is part of the game's state: every player in the room hears the same song, and it is that fight's song to the end. Re-opening the page or reconnecting keeps it, and when Heaven Falls or Last Rounds take over and hand back, the same song returns. A fight never gets the song the last ordinary fight had (a fight that begins on Heaven Falls doesn't count as one). The pick uses none of the game's dice: it changes no roll. A fight saved before the pool existed keeps *Gunline*.

The game's own tracks loop seamlessly, crossfade (about 1.2 s) when the fight's situation changes, and fade out when the fight ends.

**The Proving Ground** plays *Gearing Up* on a loop while the squad is gearing up (no fight on: before the first, and between fights), in place of area music, alone or with a room. A fight there switches to its own music as anywhere else, and the end of the fight brings *Gearing Up* back. A spotlight or pinned song still plays over it.

**The spotlight.** These start the character's favourite song for the whole room:

- A critical success (natural 20) on a Hard or Heroic check (TN 16 or 20).
- Taking down an elite or a boss.
- Reviving a downed ally.
- Earning a combo perk by a deed.
- An Ultimate.

Each character gets one spotlight per scene, and one per fight. A song that is already playing is never cut off: a trigger while it plays does nothing.

**The cut-in** (decision 113; presentation only, no rule and no number changes). Every spotlight moment also plays a cut-in for the whole room, whether or not the song starts: the screen behind blurs a little and dims, and torn strips show the eyes of whoever made the moment, inked in their highest attribute's colour. In a fight, the action the moment happened in (the shot that dropped the boss, the revive) then plays back 15% slower. Play my song cuts in when the song starts. A patron's intervention cuts in too, the patron's strip first. So does a critical hit by a player's character or companion in a fight (a weapon attack, or a damaging Sigil or Outburst spell): a shorter cut-in, and one cut-in an action (a crit that also takes down a boss shows the takedown); enemies' crits don't. Each player chooses All, Once per scene or Off in Settings; reduced motion keeps the blur and drops the slide and the slow-down. The engine marks the moment with a `spotlight` event; how it looks is `docs/design/cutin-spec.md`.

**The favourite song** is a YouTube link on the character's identity (Favourite Song), with its title, artist, start time and length. The link must allow embedding. What a player picks is up to the player.

**Music traits** (Soundscape of the Soul, Headbanger, Underground Sound; see the traits) add to this. A character holds **only one music trait**: they exclude each other, at creation and on any later gain.

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
| techniques.json | 58 | Physical techniques (rules 1.12): 27 melee and 31 ranged, each with its group, AP, rounds, text, property lines and placeholder numbers; `rules` holds Momentum, Pressure, ready slots and drill. Each weapon's `phys` block in weapons.json holds its properties, the skill it hits with, what its damage scales with and the technique it teaches |
| items.json | 1 | Items with rules of their own: Essence of Experience |
| sigils.json | 40 | Sigil words (five groups), grammar, element identities and the enemy casters' default words (rules 1.4; provisional numbers) |
| soul_modules.json | 4 + 20 | Soul schools and modules (provisional numbers) |
| patrons.json | 3 | Patrons and blessings by Faith tier (provisional numbers) |
| maps.json | object | Map limits (26 at most, 8 at least; deployment 10 to 14 tiles), the picture legend, and the shared open-ground layout (rules 1.16) |
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
21. **Mind Without Fog.** It locks Karma permanently and gives +1 Core point at creation (7 instead of 6; rules 1.11, item 929: it was +2, which allowed a 9/1/1 start). Confirm both.
22. ~~Undefined actions.~~ *Written 7 Nov 2026 (see Analyze and the actions perks rely on); provisional, item 60.*
23. **Perk type labels.** Origami Hands, Hold the Stroke and Pattern Lock carry type labels that don't match their effects. Soulmate scales by Mastery inside Tier I.
24. **Bone Talk** calls Shaken a body debuff; Shaken is in the heart family.
25. **Roster terms replaced by spec terms:** "Outburst" became Soul spell, GM became Narrator, and the Roster's Mastery-gated recipes became signature totals.

**Added in the data; fold into this spec**

26. **Eight new conditions:** Grappled, Taunted, Commanded, Puppeted, Disarmed, Injured (by location), Emplaced and Augment Offline.
27. **Sigil word list** (24 words; 40 from rules 1.4, items 415–452). It keeps the 2020 Roster's names: FIRE, FREEZE, SHOCK, BIND, BLIND, SLOW, MUDDLE, WALL.

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
47. **Creation budgets restored** (archetypes spend all of them; their extra Attribute and Core placements are provisional too) (the 2020 EPCCG's 6 Core, 10 Attribute, 10 Skill points), with skills spending the Attribute and Core points they need automatically, no creation caps beyond the tree's own (so up to 7 in one Core, Attribute or skill), and (until rules 1.11 removed it, item 928) the exchange rate of 1 unspent Core point for 2 Attribute points (the 2020 line "one Core point represents two Attribute points", read as an exchange rate). Replaces 1.1's free automatic rise, which let builds spread across three Cores finish with up to 4 more Core points than single-Core builds.
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
68. **Rules 1.2: Sigils on the map** (Leon; superseded by rules 1.4 where it names shapes, Line range or 2 glyphs a tile: items 415–452). Glyph AP (1 − 0.1 per Expression above 1, min 0.5), Evoke 1 AP, word charge on drawing plus 1 a glyph on firing, Line range 4 / 8 / 12 by length, glyphs lasting 2 rounds + duration bonus, Scuff 1 AP, reading at TN 12, 2 glyphs a tile, the three shapes and their ranges, enemy Sigil users Evoking your patterns.
69. **The three new words** (SPARK 15 damage at 1 charge, PULL 3 tiles, SILENCE 1 round) replacing LINE, WALL and CONE.
70. **Learning magic:** 2 starting words that must make a Stack (rules 1.4: a spell with a Reach word, item 438), 1 starting design, 4 + Brain Power words known, one word per long rest, Sigil plates, Narrator-granted modules.
71. **Charge and release:** stages up to 4 (×1 to ×2.5), 1 Strain per held turn, the slip check (10 + damage ÷ 10), wild release. *(Superseded by rules 1.5: items 492–521.)*
72. **Heart burst Downs, never kills** (Leon), using the existing death saves.
73. **Glyph Mason and Grand Sigilist:** the Keystone's cost (2 AP + a core), Survey's 2 tiles, Enlarge (3 AP + 3 charge, once a combat, radius 2) and all 24 Grand forms.
74. **Heartfed and Heartbinder:** the four gauges and what fills them, 10% per point, Link range 6, Share half, 2 Strain when a link is Downed.
75. **Vessel:** the six body forms and their numbers, at most 2 held forms (item 550; the Will Power 5 third form is retired), Release 15 × each form's stage multiplier, summed (rules 1.5, item 532).
76. **Twinbound:** the Twin's HP 50%, 4 AP, 6-tile leash, 3 Strain on its loss, three fixed built-in Outbursts.
77. **Magic in the engine (first build; the Ring and Stack parts superseded by rules 1.4):** damage types against armour (Sigil takes full armour, Elemental half, Soul and true none); a Ring hits at ×0.8, SPREAD at ×0.6; Evoke charge 1 a glyph minus the Sigil core saving (minimum 1); ~~the Evoker and Emanator count when carried, not only in hand~~ (retired by item 630: a focus counts only in a hand); learning is one new word, school or module a scene, from an ally who knows it or a Sigil plate; enemies save at +0 / +1 / +2 / +3 by tier (minion to boss); the mana meter starts each session at 15; the periodic, proximity, expire, mastery and teleport modules, the six advanced classes' moves and the Grand forms fall back to the Narrator until the engine runs them.
78. **The perk, trait and class-move runtime (first build, provisional):** item skill modifiers reach every d20 that uses the skill (checks, passives, saves, weapon attacks, initiative), never derived per-point stats; an active perk's or class move's other effects run only when its action runs, while a trait's effects always stand; story hooks reach every character; a per-scene use spans a fight in that scene; a story use the Narrator refuses is refunded.
79. **Weapon-granted actions (provisional):** a weapon shows only the actions it grants (Reload by its own name: Swap magazine, Speedloader, Swap drum, Feed belt, Nock an arrow, Load a bolt…; Load a magazine; Clear jam; Brace; Field Repair; Overwatch or Hold a strike). Only weapons with a Heat limit jam; the rest fumble on a natural 1 (−1 AP next turn) and build no Heat. Brace only for weapons that need or reward it. The breacher tube reloads for 3 AP (data `reload_ap`).
80. **Holding an advanced class (provisional):** held alongside the base class, with all three moves at once; it doesn't replace the base class's moves.
81. **AP bookkeeping (provisional):** AP banked for next turn counts toward that turn's +3 perk AP; debt comes off after the floor of 2, at most 4; out-of-turn pools (windows, Supreme Command) are not perk AP. Bleeding that kills credits whoever opened the wound.

**Added in rules 1.3: the shared rules for perks, traits and classes (7 Nov 2026, provisional, settle in playtest)**

82. **Conditions tick at the end of the bearer's turn**, a condition landed on your own turn loses no round that turn, and conditions keep their source. Durations follow the conditions table: Pinned 1 round (until the end of your next turn), Blinded 1, Shaken 3, Confused 1, Silenced 1, Burning until put out (10 a turn, ignoring armour). Shaken and Confused no longer touch the attack roll; Pinned is −2 and Blinded −4 to hit. The Right Brain Debuff is a Brain condition. Stunned loses the whole next turn (a Mana Short now Stuns); a fumble stays −1 AP.
83. **Suppressed** (plan 6a-13, the fix for Spray and Pray's soft lock): −1 AP and no reactions, a Body save, 1 round, no stacking. **Withdrawing** +2 Defense for 1 round. **Weapon lowered**: the light Disarmed, 1 AP to raise.
84. **Commanded against enemies** runs from a menu (halt, hold, drop, kneel, flee); **Puppeted** enemies are run by the caster's player for one turn, with no self-harm.
85. **Target-specific damage bonuses add, capped at ×2.0** (plan 6a-1: True Name + Judgement Day + Case Closed + Weak Point reached about ×3.7 on one boss). Self multipliers still multiply.
86. **Derived damage stats now run:** Critical, Elemental and Ambush damage taken (each capped at 60%), Healing and shields received (+10% × Sensory), the air's Healing given multiplier on magical healing.
87. **Special ammo:** the five ammo types' effects as listed, one type per magazine, special rounds bought or found as items (ammo_*) and loaded out of combat; Enhanced and mana-arm hits put +1 on the meter.
88. **Recoil runs** (−1 a shot after the first, less floor(Dexterity ÷ 2), halved braced or Emplaced, none in a volley or a reaction). Emplaced: +2 to attacks with the weapon.
89. **Reactions are counted** (1 a round; items add; none while Suppressed or Stunned); Overwatch can hold several shots on one reaction (class moves).
90. **The walk is tile by tile:** opportunity attacks and Overwatch on every step; a walk cut short keeps its unwalked tiles in the bank; **one Sprint per turn for everyone** (plan 6a-12, the Drill Echo fix). Path options (wall running, a 2-tile jump, passing allies, rough ground) are opened by items. Traps a side set itself or spotted are known to that side only.
91. **Hidden in a fight:** Hide is 2 AP, only out of every enemy's sight; the ambush (crit 19–20, × Ambush) applies to the first attack of each time you hide (plan 6a-8); silent weapons don't reveal; spotting at the end of every turn (d20 + notice, enemies +0/+2/+4/+6 by tier, against 10 + Ingenuity modifier + Stealth); adjacency reveals. *Still to do (lane B): the stay-hidden TN rising +2 per success for Shadow Step II.*
92. **Kinds and tags** on every unit and NPC (human by default); robots, machines, turrets and drones give +2 on the meter when they die; unaware enemies lose round 1.
93. **Surrender** (plan 6a-3, the fix for The Name They Whisper): one surrender save per enemy per fight, Heart save vs 12 + the speaker's Heart debuff strength, only at half HP or less or alone; Bosses, machines and no_surrender never. Surrendered and subdued foes count as defeated (XP too) but give no kill credit and no meter rise; they stay as neutral prisoners.
94. **Talking in a fight:** 2 AP, within 8 tiles; Persuade (Eloquence → Left Brain Debuff, Brain save), Threaten (Intimidation → Shaken, Body save), Parley (the surrender save).
95. **Throwing and blasts:** Throwing range 6 + 0.5 × Dexterity (Derived stats; item 17 settles on it); the six thrown items as listed (an incendiary burns only its centre tile); explosive weapons splash their radius on a hit; the flamer's cone attacks everyone in 3 tiles. Enemies don't throw yet.
96. **Swaps and companions:** 1 AP a hand (the full table: rules 1.9, items 684–690); a stowed gun keeps its rounds; both guns reload for 3 AP. Drone (HP 30, Defense 12, +3, armour 5, Movement 2, a service pistol with only a plain shot and unlimited ammo) and beast (HP 60, Defense 12, +3, armour 0, Movement 2.5, bite 18) companions act after their owner and are destroyed at 0 HP (HP and the drone's gun settled in item 370). One advanced class at a time, learned with a tutor (c.tutors) from the level-up screen.
97. **Prayer in the engine:** the cooldown counts rounds; a Blessing's hp numbers heal (positive) or deal Soul damage (negative), its shield numbers shield, all × Blessing power; a Miracle is a guaranteed success at ×3. Out of combat a heard prayer goes to the Narrator. *(The ×3 predates Blessing 2.0 and is not applied: a Miracle is × Blessing power like a Hymn; rules 1.6.2, item 727.)*
98. **Class resources:** Momentum +1 per melee hit, lost when a turn ends without an attack; Guard, Marks and Charges start each fight at 0; Supplies and toxins persist and restock at a long rest; Adamantile Knight carries Guard, Shade Marks, Storm Hand Charges, Gunslinger and Banner Dancer Momentum, RTC Contractor and Banner Dancer Supplies, CCEC Ballistician Marks. *(Momentum: superseded by the rework of 10 Nov 2026, "Melee: Momentum and the chain": only the plain attack gives it, a fight starts with 1, and it is not lost at the end of a turn. Guard: since rules 1.13 anyone with Durability has a pool, see "Guard".)*
99. **Story plumbing:** Narrator-set conditions on NPCs (scene) and characters (scene, session or arc); Karma awards capped at 30 a turn, Conscience added; rests from the Narrator or the host; the voice cap per character, not per player; private perk lines outside the voice cap; Narrator-set item state (traitState).
100. **Data fixes:** perk type labels (item 23: Origami Hands active, Hold the Stroke passive, Overruled and Outclassed AP mods, Pattern Lock and Heart Overload passive); Lab Coat II costs 2 AP; Born Performer's −100% is on dialogue XP; Bone Talk's Shaken is a Heart debuff (item 24); Mind Without Fog excludes Symbol of Order and Rogue Element (its Karma lock would contradict theirs); the start items (prescription glasses, smiling mask, prosthetic arm, Central City ID, bank card, contraband, grimoire) and a toolbox, spirits, cigarettes, a drone frame and the four special-ammo items exist now; cameras, alarm panels and emplaced turrets are map objects; terminals and lamps are electronic.

**Added in rules 1.3: perk, trait and class-move rulings (7 Nov 2026; the audit's recommended fix for every flagged design; provisional, settle in playtest)**

*Body, melee and damage taken*

101. **Shrug It Off.** The action needs a Body debuff to remove. Without one, Tier II's 1-AP shield could be repeated
    every turn (GAMEBREAKING). The shield doesn't stack and uses Healing and shields received.
    - Out of a fight, it ends a story Body condition.
    - If the condition was only narrated, it opens a pending ruling instead.
    - It never removes Marked, Augment Offline, Emplaced or Last Turn.
102. **Used to the Pain.** It triggers on the first wound only, so a hit absorbed by a shield doesn't count. Friendly *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    fire doesn't count either. The AP goes through the bank, so it counts toward the next turn's +3 cap.
103. **Scar Tissue.** It stacks on wounds.
    - The reduction combined with the derived Elemental damage taken stays within the 60% cap.
    - Tier II's "limb damage" is +5 Injury resistance per stack, up to +40. Leon to confirm.
104. **Iron Stomach in the story.**
    - Tier II passes checks tagged `fear`, `nausea`, `gore`, `horror` or `disgust` automatically, and a story
      Fear or Nausea on the character ends at once.
    - Tier I ends a story Fear or Nausea at the next check or scene.
105. **Grapple.** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - It needs no free hand. Leon decides if one is required.
    - The hold ends when the grappler moves, and the engine's source check ends it when the grappler goes down.
    - Tier II redirects 50% of the attacks aimed at the grappler to an adjacent captive, rolled d100 on the game's RNG.
    - In the story, the NPC is marked `grappled` in `npcConds` and the Narrator rules whether the hold is plausible.
    - The Fists weapon skill "Grapple" stays separate. Folding the two together is a data job (see Data deltas).
106. **Breaching Strike.** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - "Ignores cover" had no effect, since melee already ignores cover; `ignore_cover` is dropped from the data (both
      tiers) and the text.
    - The wall bonus is decided by simulating the push before the roll.
    - "Wall" means a solid tile, the map edge or a movement-blocking object. A unit doesn't count.
107. **Earthbreaker.**
    - Allies in the 3×3 are hit. The user is not.
    - There is no attack roll and no critical; damage goes through attackDamage (so Pain Eater, Ork Steel and
      Augmented apply), less armour.
    - A Downed creature takes 1 death-save failure.
    - Every object with HP in the area takes its full HP as damage.
    - In the story, it is a once-per-scene Narrator ruling.
108. **Last Wall.** It holds against any source except self-inflicted damage. If it fires on your own turn, the guard
    lasts until your next turn starts, which is a whole round.
109. **Bite the Bullet.** The engine can't keep a unit "up at 0 HP", so Last Turn is played at 1 HP (with the
    `last_turn` condition shown).
    - Each hit during Last Turn is a death-save failure instead of damage: 1, or 2 on a critical. At 3 the
      character dies.
    - Any heal ends Last Turn and the character stays up.
    - Otherwise the character goes Downed at the end of the turn: this turn if it fired on their own turn, else
      their next one.
    - Bleeding and hazards do nothing during Last Turn.
110. **Siege Engine.**
    - "Knock back" covers shoves, weapon knockback and Breaching Strike. Prone from a blocked shove still lands.
    - Shove's −1 AP works now. Break's −1 AP waits on a hook (see Missing hooks).
111. **Factory Made.**
    - Field Repair heals 10 HP per Proficiency point, not per Mastery level.
    - Poison means the toxic spill hazard (immune) and any poison or suffocation condition (cancelled).
      Suffocation is otherwise the Narrator's.
    - Blessings are re-run at half power, so a healing Blessing is halved once, not twice.
112. **Glass Runner.**
    - GAMEBREAKING as written: the first Move each combat has its first 1 AP of tiles free.
    - A limb injury from a critical does +50% more damage.
    - A broken leg quarters Movement, because everyone's leg injury already halves it.
113. **Right of Way and Heavyworlder.**
    - Movement is −0.5.
    - Shove immunity doesn't block knockback.
    - Heavyworlder's "can't hide in light" works like this:
      - In a fight, Hide on a lit tile is undone at once.
      - In the story, the stay-hidden roll uses TN 99 and −99 when the character isn't in the dark, so only a
        natural 20 succeeds. Leon to decide if a natural 20 should also fail.
114. **Crawler-Blooded.**
    - A critical's arm or leg injury gives back 30% of that hit.
    - A crawler enemy can't target the holder until the holder attacks a crawler this fight. This is per holder;
      making it per squad is the alternative.
    - Climbing is the Narrator's.
    - Lumeri Blessings deal 10 true damage first. The patron counts as Lumeri when its faction is `lumeri`.
115. **Old Timer.**
    - +1 Echo at session start, so 2 in all. Everyone already starts with 1, so as written the upside did nothing.
    - Seen It All is a story action (once per session) on a waiting Rumination, Lore Master or Analysis check. The
      check resolves as a plain success, never a critical.
    - Movement is −0.5.
    - The −2 to Body skills reads `c.state.no_full_rest`. The Narrator sets it with `traitState`; a long rest or a
      new session clears it.
116. **The Brightest Light.**
    - Every foe taken out counts as one kill, bosses included.
    - A character is Crashed only if they attacked or were hurt in the fight.
    - Crashed is −2 on every d20 that uses a skill: checks, attacks, saves and initiative. Passives and death saves
      are not affected.
    - Any rest ends Crashed, short or long, and so does a session start.
    - Wear is doubled by tracking durability lost and taking the same amount again.
117. **Squad Anchor.**
    - "This turn" means the anchor's turn in progress, or its last finished turn when it isn't the anchor's turn.
    - Fixed Point counts tiles walked; forced moves don't count.
    - The bonus reaches condition saves and Defense. Death saves wait on a hook (see Missing hooks).
118. **Augmented.**
    - The pick is stored in `c.state.augment`. A "Choose your augment" action handles it until the creation screen
      does.
    - Arm is ×1.2 on weapon damage that isn't Elemental.
    - Legs stay at +1 Movement as written. Leon to decide on +0.5.
    - Maintenance is a Proficiency check vs TN 12 after every rest; on a fail the augment is offline until the next
      rest.
    - EMP sets Augment Offline for 2 turns.
119. **Raised by Orks.**
    - "Can't Read" auto-fails checks tagged `text`, `text_based` or `written`. It means in-world maps and documents,
      never the game's grid.
    - An Ork enemy can't target the holder until someone on the holder's side attacks an Ork.
    - The squad opt-in for −2 Charisma is roleplay only.
120. **Southern Fist.** "Nothing but gloves" means an unarmed main-hand weapon with no weapon in the off hand. The
    trait's +1 AP counts toward the +3-per-turn cap.

*Movement, stealth and vision*

121. *(B1)* **Into the Dark I:** the free part is 1 AP (one Movement of tiles), once a fight. It doesn't apply to Sprint (audit problem 1). "Unexplored" is a tile the squad hasn't seen this fight; on the area map, a zone this character hasn't moved in yet. The first zone counts as new. *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
122. *(B2)* **Wall Run:**
    - **Runnable tiles:** map walls with at least one open neighbour, half-cover objects, and objects whose kind contains hole, pit or gap. Never doors or free-standing full-cover objects.
    - **The II strike:** your weapon's basic attack (shot, or melee with a melee weapon).
    - **Story:** the distance limit is the Narrator's judgement; the engine auto-passes a tagged Athletics check (provisional reading; a check `distance` field would let the engine own it).
123. *(B3)* **Roll With It:** once a round, and the tiles are deferred off your turn (audit problems 2 and 3). The II crit bonus is spent by the next attack, hit or miss. *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
124. *(B4)* **Shadow Step II:** TN 10 + best notice + 2 per earlier success; no new ambush (plan 6a-8, GAMEBREAKING fix). No witness: stays Hidden.
125. *(B5)* **Got You in My Sight:**
    - once a round;
    - nothing if your turn has already passed;
    - a sneak attack is an ambush (audit problems 2 to 4).
126. *(B6)* **Eyes in the Back:** an unflanked shot gets −5, and the adjacent half cover becomes the shot's cover tile, so a miss by that margin hits it (the `coverTile` hook in the attack preview). The lowest tile key wins when two qualify. A carried shield gives −5 from every side when no half cover is next to you. PROVISIONAL.
127. *(B7)* **Wind on the Skin:** range is Vision ignoring line of sight; the result is a known position only.
128. *(B8)* **Skin Map:**
    - It reveals Hidden enemies for the whole squad, because sight is shared.
    - Within 6 tiles the holder alone also sees and targets through smoke and darkness (the sight hook); a squadmate
      can't target what only the holder senses.
    - Walls stop it.
129. *(B9)* **Never There:** the narrow reading (−4 only during your own later moves).
130. *(B10)* **Vanishing Act:** any attack reveals, even a silent one (the perk wins over the silent-weapon rule). Touched means an enemy ends a move next to you.
131. *(B11)* **Charge!:** at most 3 AP free (the +3 cap, GAMEBREAKING fix). "At an enemy" means ending next to a visible enemy that the move closed on.
132. *(B12)* **War Footing:** not on a Disengage; once per enemy a turn; the Intimidation target is unmoved for the scene (anti-retry). The data says `adjudication: engine`; it should be `hybrid` (data change).
133. *(B13)* **Last Charge:** the shield is once a fight (the fix for the every-turn loop, GAMEBREAKING). ×1.5 melee applies for the rest of the charge turn. 5 tiles.
134. *(B14)* **Just the Repairman:** the `toolbox` item only. Spare parts and the field kit don't count.
135. *(B15)* **Silent Partner:** the nearest ally (in combat), the first by id (on the area map). The partner pays the sneak cost.
136. *(B16)* **Dead Signal:** a lock opens rather than jams; a lamp's hp is set to 0 so it goes dark.
137. *(B17)* **Forlorn Hope:** the AP is banked to next turn; the armour cap is Class I's value, 5, with slot pieces included.
138. *(B18)* **Live to Fight Another Day:**
    - **Disengage:** free once a turn (GAMEBREAKING fix).
    - **Retreat:** 0 AP once a fight, and it counts as the turn's Sprint. Leon chooses between this and 1 AP once a turn.
    - **+2 Dodge:** Withdrawing.
    - **Yellow:** doesn't include the holder.
139. *(B19)* **Drill Echo:**
    - "Endurance checks" means the Endurance attribute's skills, plus Athletics and the tags running and climbing.
    - The Count's lost action is a failed attempt.
    - An Echo reroll rerolls the d20, not the d6.
140. *(B20)* **Ghost Soldier:**
    - Settlement rest is Vigilant against TN 12, on short and long rests.
    - Stealth broken excludes your own attack or throw.
    - The prosthetic arm: Proficiency mods aren't designed yet (data).
141. *(B21)* **Lowland Born:** half Detection Range is read as spotting Hidden enemies only within half your Vision.

*Weapons, ammo, reactions and explosives*

142. *(C1)* **Running Reload.** The reload costs nothing on top of the move's own AP (merge_action: the move's cost only). It
    needs a move of at least 1 tile and works once per turn. Tier II adds a separate once-per-turn jam clear. In
    combat it is a toggle on Move. On the area map it is a "Move and reload" action, because the area map's Move takes
    no toggles. PROVISIONAL.
143. *(C2)* **Rounding Up (GAMEBREAKING, 6a-7).**
    - Tier I: once per turn, so it gives at most +1 AP, counted toward the +3 cap. Leon still picks between this and
      rounding movement down.
    - Tier II: banks 1 AP into the next turn once per fight, and does it automatically. It fires at the first turn end
      with at least 1 whole AP left over.
    - The area map rounds once per round. There is no story AP to carry.
    - PROVISIONAL.
144. *(C3)* **Catch (6b).** Automatic, no roll, and uses your reaction.
    - It covers a throw at your own tile, or at the tile of an ally next to you.
    - You hold the item until your next turn. Throwing it back costs 1 AP at Tier I, 0 at Tier II.
    - If it isn't thrown back by the end of your next turn, it goes off in your hands, credited to the original
      thrower.
    - PROVISIONAL.
145. *(C4)* **Sleight of Hand (6b).**
    - Planting needs no roll.
    - A planted grenade goes off at the start of the target's next turn.
    - A tracker Marks the target (no save) for the rest of the fight.
    - Anything else becomes a Narrator note.
    - On the area map, a planted grenade waits for that NPC's first turn in a fight.
    - "Mid-conversation" means holding the story focus. Tier I refuses it.
    - PROVISIONAL.
146. *(C5)* **Jury-Rig (6b).**
    - Tier I: after the extra use the weapon is Broken again, not destroyed. The use comes back once the weapon is
      repaired. The extra strike does full damage.
    - Tier II: "Patch the drone" is new. The engine had no Field Repair for drones. It restores (10% + 5% per
      Proficiency above 3) × 2 of the drone's max HP and uses one spare-parts charge. There are no vehicles yet.
    - PROVISIONAL.
147. *(C6)* **Hot-Swap (6b).** In a fight, swapping a mod costs 1 AP, like swapping a weapon. Hot-Swap makes the first swap
    of the turn free (Tier II: the first two). PROVISIONAL. *(Rules 1.9: the swaps it covers are drawing, putting away and swapping hands, a two-handed draw included; not armour: item 686.)*
148. *(C7)* **Origami Hands (GAMEBREAKING, 6a-6).** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - Each build uses one spare-parts charge, and at most 2 of your traps can stand on the map at once.
    - Trap: 25 damage (Tier II: 37).
    - Sling: d20 + Dexterity against Defense, within throwing range, 10 × Strength physical damage.
    - Tool: a one-use plot item; the Narrator decides what it can do.
    - Story: no Proficiency check, one spare-parts charge.
    - PROVISIONAL.
149. *(C8)* **Trick Shot (6b).**
    - It ignores half cover only.
    - The second target takes half of what the first target lost, at least 1, with no second armour roll.
    - The second target must be within 2 tiles of the first and in its line of sight. The default pick is the nearest,
      then the lowest HP; a `trick_shot_target:<id>` mod picks it instead.
    - A miss still uses the turn's ricochet.
    - PROVISIONAL.
150. *(C9)* **Overhaul.**
    - Bench repair (out of combat) restores 100% for one spare-parts charge.
    - The extra slot is available after a long rest, once per weapon. The player picks its type by the mod they fit.
    - PROVISIONAL.
151. *(C10)* **Nothing Gets Past (6b).** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - "Hold the line" spends all whole shots of AP. Each enemy that moves draws one shot per move.
    - The whole chain runs on one reaction (the extra shots refund it).
    - Tiles not walked stay in the mover's bank.
    - PROVISIONAL.
152. *(C11)* **Dance of Iron (6b).**
    - It uses your reaction.
    - It triggers on a miss, fumbles included. A shot stopped by cover doesn't count.
    - The return shot waits until the attacker's next action or the end of its turn, so it lands after a volley ends.
    - With a melee weapon in hand there is no return shot.
    - PROVISIONAL.
153. *(C12)* **Holy Ordnance (6b).**
    - The blessing goes on an adjacent ally's magazine or your own.
    - It lasts until the magazine is swapped out (a reload). Tier II blesses the next magazine too.
    - The bonus goes in the target-specific bucket, capped at ×2.
    - Blessing power doesn't apply.
    - A blessing given out of combat carries into the next fight. One still loaded when a fight ends carries over too.
    - PROVISIONAL.
154. *(C13)* **Gun Nut (6a-29).**
    - The 0-AP clear doesn't reset Heat.
    - Collector: no guns are granted at creation. The collection is the first 3 guns the character gets (the kit's
      gun, then loot, gifts, purchases, the Proving Ground's give), kept as the character's `collection`. Old saves fill
      it from the first 3 guns they carry. Item 369 (settled, Leon, 7 Nov 2026).
    - Parting with a collection gun (sell, abandon, drop, give away) is the Dexterity check, TN 12, or the gun stays
      until the next rest; the −50% sale price is the Narrator's. Both stay that way until the engine has sell and drop
      actions; an engine path that removes a gun from the pack refuses a collection gun.
    - PROVISIONAL (the 0-AP clear and the TN 12).
155. *(C14)* **Old School.**
    - Fan the Hammer fires every loaded round, each at −2 plus Recoil (−1 per earlier shot past ⌊Dexterity ÷ 2⌋).
      It is once per turn and costs 3 AP.
    - Analog bans the red dot sight (electronic), and Evoker-linked and electronic guns (weapon tags). The scope is
      glass and is allowed. The engine enforces the ban by refusing to fire.
    - PROVISIONAL.
156. *(C15)* **Spray and Pray (GAMEBREAKING, 6a-13).**
    - Full auto applies Suppressed, not Pinned, with a Body save. It doesn't stack.
    - The full-auto penalty is −1 instead of −2.
    - Ammo Hog doubles every round, single shots included, as the text says.
    - Aimed shots are at −2.
    - PROVISIONAL.
157. *(C16)* **One Shot (6b).**
    - The critical multiplier is ×1.5 the multiplier, so 2.0 becomes 3.0.
    - "First shot" means the first shot of the turn.
    - It ignores half cover only.
    - Tunnel Vision: Vigilant checks fail, Vigilant voice lines stay silent and the holder spots no Hidden enemies.
      Ambushes on the holder do +50%.
    - Tunnel Vision ends on the holder's next move. A scene change also ends it.
    - PROVISIONAL.
158. *(C17)* **Grenadier's Arm (6b).**
    - Weights: people 80 kg, elites 100 kg, drones 15 kg, other companions 40 kg. Bosses can't be thrown.
    - Range is throwing range − ⌊kg ÷ 20⌋.
    - Damage is (10 + kg ÷ 4) × physical multiplier, to the thrown body and to whoever it lands on. The body then
      lands on the nearest free tile.
    - The throw costs the Throw AP: 2 + 1 for Strained Arm.
    - Throwing objects is the Narrator's call.
    - PROVISIONAL.
159. *(C18)* **Demolitionist.**
    - The +30% applies to explosions credited to you, after armour (hurtUnit removes armour first). Explosive weapon
      hits use the data's damage_mod before armour.
    - Shaped Charge shapes: circle = the item's radius; line = 2r + 1 tiles away from you; cone = 90° and 2r + 1 tiles
      long.
    - "Detonate" on a trigger costs 1 AP.
    - The charge comes from your thrown explosives: satchel, frag or incendiary.
    - PROVISIONAL.
160. *(C19)* **Blade Recluse.** Naming the weapon is free and can be redone out of combat. Kills with the named weapon's
    family add 0.25 more, stored as fractions. Lowered is blocked along with Disarmed. PROVISIONAL.
161. *(C20)* **Slicer (GAMEBREAKING, 6a-17).**
    - Static devices only: doors, terminals, cameras, alarms and emplaced turrets (kind `turret`). Never mobile robots
      or people.
    - TNs: devices 12, a turret object 14. A turret unit goes by its tier: minion 12, soldier 14, elite 16, boss 20.
    - No line of sight is needed, and the range is 5 tiles.
    - A door can be opened, closed or locked until your next turn; then its lock goes back to what it was.
    - A turret unit is Puppeted for one turn.
    - Jacked In: a lightning or EMP hit, or a bot scrambler blast that reaches you, Stuns you with no save.
    - Machines get −2 to the TN to spot the Slicer in a fight, +2 notice range in the story and +2 to the stay-hidden
      TN.
    - PROVISIONAL.

*Sigil, Soul, prayer and music*

162. *(D1)* **Hold the Stroke** (spec item 15). +1 / +2 stroke pool (rules 1.4: glyphs on the ground, item 443). It doesn't change words per spell.
163. *(D2)* **Parallel Thought** (plan 6a-9, PROVISIONAL). Once per turn, and only while a placed spell of yours stands (rules 1.4: a STAY field, a WAIT trap or a WATCH turret; item 460). The
    discount (1 / 2 AP) covers the glyph draws first, then the Evoke, never below 0. It ends with the Evoke, and
    anything left over is lost.
164. *(D3)* **Heart Overload** (plan 6a-4, PROVISIONAL). It's a toggle on Begin ("Pay with HP"), 2 / 1 HP per point of mana,
    after every other discount, as true HP loss.
    - An HP-paid cast can't heal or shield: its heal and shield come to 0.
    - It can't be held to grow: a held Outburst pays mana.
    - You can't pay into Downed.
    - Without an Emanator it does nothing: the toggle stays off and isn't offered (Leon, 7 Nov 2026; item 371).
165. *(D4)* **Resonance.** Allies only. The best discount you've been given waits for your next Begin, and that Begin uses it
    up.
166. *(D5)* **Rite in the Field** (PROVISIONAL mapping, needs Leon's OK). −1 / −2 AP, in combat only, with these floors:
    - WARD glyph: 0.5;
    - Guarded Outburst: 1;
    - Pray: 1;
    - Warden Ward: 1;
    - Crystallise: 1.
167. *(D6)* **Clean Draw** (PROVISIONAL). It costs 0 AP to arm, once per fight; the use is spent when you arm it.
    - Clean glyphs cost no charge and no Flux.
    - Evoking a pattern made only of your clean glyphs costs no charge.
    - The Evoke disarms it, and so does losing the clean glyphs.
    - An enemy evoking them pays as normal.
    - Rules 1.4: "any length" is at most 4 glyphs; only a glyph that lands is clean (a refused draw records nothing),
      and an Evoke that uses any clean glyph spends it (item 461).
168. *(D7)* **The Twin Pays** (PROVISIONAL). A toggle on Begin, once per fight: 0 MP, no meter drop, no Strain on the cast or
    while it is held (Right Brain Debuff's +20% included).
169. *(D8)* **Twin Souls** (PROVISIONAL). "Mid-level" is dropped: any design may carry a third school, at +20 MP before the
    band and Insight saving.
    - The third school runs at release, before the first two.
    - Story: once per session, a private question, answered as a pending ruling, short of proof (the Veil).
170. *(D9)* **Twin Discipline** (PROVISIONAL). Its costs:
    - the Evoke's charge and AP now;
    - the Outburst's MP and Strain, already paid at Begin.
    How it works:
    - The pattern's shape decides the targets.
    - Rain, Size, Random and Move are ignored, and Ether is implied.
    - Rules 1.4 (item 462): the Line's Reach word and the facing rule set where it reaches, its Burst (and TWICE,
      CHAIN) what it covers; each creature covered is hit once, allies too (KIN spares your side), at the Sigil's
      multiplier for it capped at ×1 (the Ring's ×0.8 is gone with the Ring).
    - The pattern's Subject words don't fire (nor PULL, STEP or LEECH), and its glyphs fade (a Keystone stays).
    - A placed spell (STAY, WAIT, WATCH) can't be fused.
171. *(D10)* **Verse of War** (plan 4.3). It applies only when the player has Said a line that round (on the area map, the
    toggle alone). +1 range on Begin, and on Release through its "In verse" chip ("Release in verse" on the area map).
    ×1.1 on the Soul damage of that release.
172. *(D11)* **Fire Sermon** (PROVISIONAL). Enemies within 4 tiles. The Heart save is against 12 + your Heart debuff strength
    (Implication).
173. *(D12)* **Litany.** You are included. It doesn't stack: the higher Litany stands. It ends at your next turn start.
    - Story: once per scene, the party's next save check gets +1 / +2.
    - It reaches every save through applyCond. The Control school's push and pull save doesn't go through applyCond
      (see the missing hooks).
174. *(D13)* **Upper-Touched** (PROVISIONAL). 0.8 × Outburst MP, keeping the 5 MP floor.
    - Sense: a log line when an upper-realm foe comes within 10 tiles.
    - Seen From Above: you can't stay Hidden while one stands, and their spot rolls always succeed. In the story an
      upper-realm NPC always notices your sneak.
    - **Blessing d6 table**: 1 the Blessing fails, 2 +1 Strain, 3 Shaken for 1 round, 4 normal, 5 ×1.5 power, 6 a voice
      from above (a Narrator note).
175. *(D14)* **Sigil Savant** (plan 6a-19, PROVISIONAL).
    - Muscle Memory: one word, chosen once (the Perks action). It draws for 0 charge and Glyph AP −1, never below 0.5.
      It still adds 1 Flux, and the Evoke's charge is paid.
    - Rigid: at each long rest you practise at most Max Sigil words (the Perks action "Practise words"). If you don't
      choose, the first Max Sigil words you know are practised. The Muscle Memory word is always practised. Until the
      first long rest, everything you know is practised.
176. *(D15)* **Hollow Heart** (PROVISIONAL). A Mana Short that Downs you leaves you stable: your death saves always succeed but
    never stand you up, and hits while you're Downed add no failures. You're back at 1 HP after the fight, or when
    healed.
    - +10% on the Soul damage you deal.
    - Echo Chamber: casting reveals you, and you can't hide that turn. The Narrator is told that the enemies within 10
      tiles know where you are. On the area map it ends your sneak.
177. *(D16)* **Heretic** (PROVISIONAL reading).
    - Stolen Fire: pray to any patron for any of its Blessings, with no pact. Will Power stands in for Faith in the
      gates (3 / 5 / 7), the roll and the cooldown, and Devotion is never changed.
    - Blessing Power = 1 + 0.1 × Will Power.
    - Excommunicated: an ally's Blessing on you fails on a d6 of 1–2. At the campaign's first session start the Lumeri
      Church is set to −40 (Hostile). The Narrator decides which other faiths count.
178. *(D17)* **True Believer** (PROVISIONAL).
    - The cooldown is 1 turn shorter, never below 1.
    - The miracle is a story button, once per session.
    - Missed rites are `traitState rites_missed` (set by the Narrator). Each one is −1 on Faith and Will Power rolls,
      capped at −3.
179. *(D18)* **Heaven's Faithful** (PROVISIONAL). The Treason check is d20 + Faith against **TN 12**, once at the start of each
    fight against upper-realm beings. A failure costs −2 AP on your first turn.
    - Communion: once per scene, a private pending ruling.
180. *(D19)* **Music traits.** They follow the scope in the spec text above. Shields of 30+ count as a big heal.
181. *(D20)* **You Get Used to It.** Tier I's −1 comes at the start of your next turn, at most once per turn. The +3 AP comes *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    when you heal or shield an ally (not yourself) who carries a Brain debuff. It is once per turn and within the
    +3 cap. Tier II has no penalty.
182. *(D21)* **Shared Breath** (PROVISIONAL). The link range is 3 tiles, with sight.
    - The partner takes the debuff with no save.
    - Half duration is rounded up, minimum 1. Untimed ones (Disarmed) stay untimed.
    - Tier I ends after one split. Tier II lasts the fight.
183. *(D22)* **Mirage** (plan 6a-10, PROVISIONAL).
    - Range is 6 + mod(Visualization). The Analysis check is d20 + tier (minion 0, soldier 1, elite 2, boss 3) against
      12 + mod(Visualization).
    - It lasts until the start of your next turn (Tier II: the turn after).
    - There is one cast per caster: a new cast replaces the old.
    - An enemy that saw through one of your Mirages, or attacked a figure, gets +5 against your later Mirages.
    - A wall stops a believer's move at the tile and refuses its shots through the tile.
    - A figure takes a believer's attack, as a miss, and disproves it.
    - A sound pulls a believer one move toward the tile instead of an action (once).
    - Tier II's second projection comes in `text` ("x,y" or "kind@x,y").
184. *(D23)* **Solid Image** (PROVISIONAL). It works only on Mirage projections (the Visualization Afterimage decoy isn't built
    yet).
    - A wall becomes a barricade object until your next turn starts.
    - A figure takes the first hostile hit on any ally, for 0, and breaks.

*Command, the AP economy, the team and the medic*

185. *(E1)* **Grim Reaper.**
    - A KO is a subdued foe: a non-lethal blow that takes the last HP. It counts like a kill.
    - Only a kill on your own turn counts. A kill by Overwatch or a reaction gives nothing.
    - The +2 AP comes at once, within the cap.
    - Tier II: every enemy that sees the kill saves against Fear, once per kill.
    - On the area map, the +2 goes to the story AP. The first-turn penalty applies only in a fight.
186. *(E2)* **Overruled!** Read at the start of the turn only (plan). Persuade (rules 1.3 parley, 2 AP) lets a non-caster
    inflict the Left Brain Debuff. No story part.
187. *(E3)* **Blueprint (ambiguous: Movement).** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - "+1 Movement" is +1 tile per AP, as written. At Agility 1 that doubles your movement. PROVISIONAL, flagged as
      strong.
    - Sketching costs 1 AP on the area map and nothing in the story. Once per scene. PROVISIONAL.
    - Every living squadmate in the scene has seen the sketch, the sketcher included.
    - The mark is used by the next fight that starts in the same scene, or it lapses.
    - A fight with no story before it gets nothing.
188. *(E4)* **Talks Broke Down.**
    - The engine infers that the fight "started because of" a dialogue check. The check must be the last dialogue check
      any squadmate made this scene, in this story round or the one before. A dialogue check is one that uses a
      dialogue skill or carries the 'dialogue' tag. PROVISIONAL.
    - The Narrator's `combat.fromTalk` decides when given: false means an unrelated fight (no effect); true means the
      scene's last talk counts however many rounds back. Item 383.
    - Tier II's hesitating enemy is the first enemy in initiative order. It loses 1 AP on its round-1 turn, once
      however many holders there are.
189. *(E5)* **Rally Cry.** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - It triggers when an ally drops to 0 HP to an enemy, a hazard or an enemy effect. Friendly fire and your own
      side's Mana Short don't trigger it. PROVISIONAL.
    - "Every other ally" includes the holder. Allies that are already Downed are left out.
    - It doesn't stack in a round: the best value counts.
190. *(E6)* **Soulmate.**
    - The share is taken after the bondmate's armour and shield.
    - It is rounded down and is true damage. It is never shared again.
    - It stops at the holder's last HP: you can't Down yourself for a bondmate. PROVISIONAL.
    - Mastered (10 points) shares 20%.
    - Tier I keeps the latest bond; Tier II keeps two.
    - Story damage goes through the engine (the Narrator's `harm[]`, traps) and is shared the same way. Item 384.
191. *(E7)* **Sweet Talker.**
    - A charm is a successful Charisma or Implication check with a `target` (an NPC). It lasts for the scene.
    - The AP gain is once per turn. PROVISIONAL.
    - The sting (Tier I) is −2 AP on the holder's next turn.
    - On the area map, buffing or debuffing a charmed NPC adds the AP to the story AP.
192. *(E8)* **Outclassed.** Only a death counts as the first kill; a surrender doesn't. The first casualty is the first PC
    Downed or killed on the holder's side; companions don't count. Each flag is set once per fight.
193. *(E9)* **Many Hands (GAMEBREAKING-adjacent: "any amount").** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - Hand-Off gives 1 to 3 AP. More is wasted to the +3 cap, so the action caps the amount at 3 and says why.
      PROVISIONAL.
    - Range is 3 tiles, once per round.
    - On the area map the AP is added to the ally's story AP at once.
    - Reaction sharing isn't built yet (hook H1). It goes to the Narrator through the brief.
194. *(E10)* **On My Mark.**
    - The ally gets an off-turn window with a pool of 4 AP (6 minus the floor of 2). PROVISIONAL.
    - The AP spent becomes debt on the ally's next turn.
    - The ally can be any conscious squadmate who isn't Silenced, at any range. PROVISIONAL.
    - One order per ally per round, however many holders there are.
    - The debt settles at the next hook after the window closes (see hook H2).
195. *(E11)* **Supreme Command.**
    - It costs 0 AP (the data gives no cost). PROVISIONAL.
    - Each other living, conscious squadmate gets one action from a separate pool of 2 AP, in initiative order.
    - Companions are not included.
    - The pool doesn't count toward the +3 cap.
196. *(E12)* **The Voice.**
    - It costs 0 AP. The save is Heart vs 12 + your Authority modifier. PROVISIONAL.
    - Rank-and-file means minion and soldier tier. Hearing is 8 tiles.
    - Orders use the engine's Commanded menu: halt, hold fire, drop it (Disarmed), kneel, fall back (flee).
    - A typed order outside the menu holds the enemy in place (halt) and goes to the Narrator in the fight report.
197. *(E13)* **Between Heartbeats.**
    - It is an armed preset: shot, move (`move:<tile>`, else the reachable tile farthest from the enemy), prone, stim
      (an ally target) or reload. PROVISIONAL.
    - The 2 AP aren't yours and don't use your reaction.
    - Ambush: before your first turn, an unarmed holder fires a shot, or drops prone if no shot is possible, at the
      first enemy action in sight. PROVISIONAL.
    - A preset that can't resolve (out of range) stays armed, unless it was the ambush default.
198. *(E14)* **Spoon-Feed.**
    - "Allies who hear" means allies within 6 tiles when it is used; you don't count. PROVISIONAL.
    - The bonus lasts until the start of your next turn and doesn't stack on one enemy.
    - No Analyze is needed.
199. *(E15)* **Flat Line.** The engine picks at combat start: highest tier, then highest HP. The player can change the pick
    (0 AP) until the end of their first turn. No re-pick when that enemy dies. PROVISIONAL.
200. *(E16)* **Pattern Lock.**
    - An attack type is the weapon plus the mode. Seen means you were the target or you saw the attacker.
    - Tier II's ally +2 needs the holder up. It applies once however many holders there are.
201. *(E17)* **Lay Down Arms (spec/data mismatch, timing).**
    - A failed save applies Commanded "hold" (no attacks on its next turn; moving is still allowed) instead of the
      data's Disarmed, whose 2 AP recovery isn't in the text. PROVISIONAL.
    - Hearing is 8 tiles.
    - Humanoid means not a robot, machine, turret, drone or beast, and not tagged `non_humanoid`.
    - Area map and story: the engine rolls the save (d20 + the tier save vs 12 + Implication), and a pending ruling
      tells the Narrator the result.
    - Data delta: change the condition to `commanded` with `arg: hold` (or keep `disarmed` and add
      `recovery: none`).
202. *(E18)* **Field Surgeon.**
    - Healing a living ally is 10 × Proficiency points × Healing given. PROVISIONAL (the Factory Made number).
    - It costs 2 AP and one spare-parts charge, and needs Proficiency 3+.
    - A Downed ally is revived.
    - Your heals (stims, Field Repair) on a Factory Made ally undo Plug's halving.
    - Out of a fight: 50% of max HP per charge, 10 minutes. PROVISIONAL.
203. *(E19)* **Angel of the Trenches.**
    - "Within your Movement" means a free tile next to the ally that you can walk to for 1 AP (floor of Movement).
      PROVISIONAL.
    - The ally stays at 1 HP, stops bleeding and isn't Downed.
    - No stim is used and the move draws no opportunity attacks.
    - It runs before Bite the Bullet (priority 10).
    - "Hold position" (armed) turns it off.
204. *(E20)* **Sworn Sibling.**
    - One shared AP per pair per round. The first of the two to start a turn adjacent takes it. PROVISIONAL.
    - "Defending them" means an attack on an enemy within 2 tiles of the Downed sibling, or one that has hurt them.
      PROVISIONAL.
    - Moving away costs double AP. The extra AP buys no extra tiles: it comes out of the move bank.
    - Story: −2 on checks while the sibling's character is at 0 HP, unless tagged `for_bond`.
205. *(E21)* **Rival.**
    - The rivalry is mutual even if the rival doesn't hold the trait (consent through the bond).
    - Show-Off is +2 once, with no stacking. A weapon hit counts as success on the weapon's skill.
    - Neck and Neck: 50 XP per level the rival gains. +10% from every source except Essence and bond, while the other
      is higher level.
    - Petty: a Camaraderie check at TN 12, once per turn per stamp. PROVISIONAL. It covers Hand-Off, Command, Field
      Surgeon's repair, Thrown Stim and a stim on a conscious rival. On a failure the AP and the stim are given back.
206. *(E22)* **Born Officer.**
    - Command gives a free 1-AP move or a free basic Shoot or Strike. No aimed shot, burst or weapon skill.
      PROVISIONAL.
    - An officer ally takes the order only on a Composure check vs TN 12. PROVISIONAL. If it refuses, the AP stays
      spent.
    - The Squad Leans on You: −1 AP to an ally within 5 tiles while the officer is Downed or dead, or out of that
      ally's sight (literal). Once per turn however many officers there are.
207. *(E23)* **Field Medic (GAMEBREAKING: 0-AP stims).**
    - Triage has a floor of 1 AP. A conscious stim stays 1 AP, and stabilising goes from 2 to 1. Healing Outbursts are
      −1 AP (floor 1). PROVISIONAL.
    - Thrown Stim costs the stabilise AP after Triage and uses a stim. The data says `ap: 0`; change it to `null`.
      PROVISIONAL.
    - First, Do No Harm applies only while the medic has a way to heal: stims, the Medic class or a heal design. This
      avoids a softlock. PROVISIONAL.
    - Companions don't count.
208. *(E24)* **Many Hands, On My Mark, Supreme Command and Command don't reach companions.** Companions follow their owner's
    orders.
209. *(E25)* **Lay Down Arms and The Voice in the story.** The Voice is combat only, as its text says. Lay Down Arms has a
    story and area-map plea. PROVISIONAL.
210. *(E26)* **The Petty gate's TN of 12** applies to every help action. The Narrator calls story help (tag `help_rival`).

*Status, surrender, judgement, kin and companions*

211. *(F1)* **Bone Talk.**
    - In the story there's no save: the NPC chooses between answering and being Shaken (plan 6, Bone Talk 2). The
      Narrator rules whether the threat names a real physical detail, gives the true answer, or reports the refusal
      through `conditions`.
    - In a fight, it costs 2 AP, needs an enemy within hearing who can see you, and the enemy makes a Heart save against
      12 + your Heart debuff strength.
    - Tier II: every enemy within hearing who sees you rolls.
    - **PROVISIONAL** (the AP cost and the combat save).
212. *(F2)* **The Name They Whisper.** GAMEBREAKING as written (it halves every enemy's effective HP).
    - One surrender save per enemy per fight, only while you're up, never a Boss, never a machine, and never a foe
      tagged no_surrender.
    - The Fear at fight start lasts 2 rounds.
    - Both TNs are 12 + max(Intimidation mod, Heart debuff strength).
    - Enemies the Narrator marks `unaware` aren't affected.
    - **PROVISIONAL.**
213. *(F3)* **Open Hand.**
    - The offer comes the moment an enemy you can see drops from above 25% to 25% or less while still standing.
    - It's a Heart save against 12 + Heart debuff strength. One offer per enemy, separate from the general surrender
      save.
    - Setting: always (default), ask (no automatic offer; the free Offer mercy action is used on your turn), or never.
      The engine can't pause an enemy turn to ask.
    - **PROVISIONAL.**
214. *(F4)* **Clean Hands.** Spare is a toggle chosen before the roll. A blow that takes a foe's last HP subdues it. *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - Spared foes give no kill credit.
    - Every surrender you cause counts as a spare.
    - Protect means healing or shielding a unit tagged civilian, or a neutral one.
    - The AP is banked for your next turn, once a turn, within the +3 cap.
    - The audit's damage ×0.75 for nonlethal blows was a question, not a recommendation, so it isn't built. Leon to
      decide.
    - **PROVISIONAL.**
215. *(F5)* **Judgement Day.**
    - The judged enemy's next attack roll against anyone on your side, you included, is forced to a miss. It still
      spends its AP and ammo.
    - +50% goes into the target bucket (capped at ×2, plan 6a-1).
    - **PROVISIONAL.**
216. *(F6)* **True Name.**
    - Allowed targets are units of kind upper_realm, cursed, celestial or beast, or tagged upper_realm. Other targets are
      refused before anything is spent.
    - "Studied" is the Narrator's call. In the story it's a pending ruling, and a refusal refunds the use.
    - +50% from you and your allies goes into the target bucket.
    - It lasts for the scene: in the story it's `c.state.true_name`, and a fight in the same scene against that name
      counts.
    - **PROVISIONAL.**
217. *(F7)* **Case Closed.** *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    - Analyze also logs the target's kind, tags, saves and conditions, and sets Weak Point.
    - +2 to hit and +20% (target bucket) for the whole squad.
    - New action, **Close the case** (the Analyze AP cost): re-read an enemy someone else analyzed, because `analyze()`
      refuses a second Analyze.
    - The motive goes to the Narrator: a fight note, or a pending ruling after a successful story Analysis check.
    - Enemies have no resistances data, so that part shows nothing.
218. *(F8)* **Still Water.**
    - The Brain immunity is generic.
    - "Nothing reads you": when the AI picks this unit while it's hurt, the pick is rerun as if it were at full HP, and
      the attack is redirected if the answer changes.
    - Only hostile reads: allies' Feel Their Pain etc. still work (plan 6, Still Water 3).
    - NPC reads in the story are the Narrator's (brief).
    - **PROVISIONAL.**
219. *(F9)* **Red Line.**
    - The line is named with a story action (`c.state.red_line`).
    - The Narrator rules a crossing with `traitState red_line_crossed: true`.
    - No new line until the next session; session start clears a crossed line.
    - In a fight: +1 (II: +2) on Heart saves through stat `save_heart`. Tier II also gives allies within 3 tiles +1
      (cond_apply saveAdd).
    - In the story, the holder gets +1/+2 on Heart saves (checks of kind save, family heart or Composure). Tier II gives
      every other character +1.
    - **PROVISIONAL** (the next-session rule, and the story allies).
220. *(F10)* **Lab Coat.**
    - "Identified" means any of:
      - the Narrator's `identify` field (`c.state.identified`);
      - a story save that targets an identified agent, or is tagged `identified`;
      - in a fight, a chemical condition (Nausea; Poisoned, Drugged and Toxin if they exist) that is identified, or that
        comes from a unit the holder analyzed.
    - Story saves need the `chemical` tag.
    - Tier II's radius is 2 tiles. The agent ends on allies in that radius, and they're immune to it for the fight. A
      toxic spill stops hurting them (`hazardImmune`). Out of a fight, Tier II is free and ends the matching story
      conditions on the party, and blocks that agent landing on anyone in the party for the rest of the scene. Item 386.
    - **PROVISIONAL** (the radius and the identified rules).
    - Data delta: Tier II's `ap_cost` is already 2.
221. *(F11)* **Daggerfall Veteran.**
    - The Flashback TN is 12 (the ladder) instead of 13, because the story can't ask for a TN that isn't on the ladder.
    - Flashback happens at most once per fight. Its triggers are:
      - Burning on you;
      - a grenade or satchel thrown within 3 tiles;
      - a barrel or explosive breaking within 3 tiles;
      - explosive damage within 3 tiles;
      - a launcher shell (an explosive gun, not a throw) that misses a target within 3 tiles: the shell still lands,
        at the target's tile, since the engine has no scatter. Item 399.
    - On a fail you're Stunned for 1 round, which loses the turn.
    - In the story, a failed check tagged `flashback` ends your round now (`g.story.ended`). The trait says "the next
      turn", but there's no hook at the start of an overworld round.
    - +2 on Heart saves against debuffs from units tagged military.
    - Shake It Off: once per combat in a fight, once per scene in the story.
    - Seen It Before (fight): the deterministic AI runs on a copy of the game for each visible enemy, and the forecast is
      logged.
    - **PROVISIONAL** (the TN, once per fight, ending the round in the story).
222. *(F12)* **Chain Smoker.** Light Up has no limit and uses no cigarettes (plan 6, Chain Smoker 2: the item exists but the
      trait doesn't start with it). It costs 2 AP in a fight and on the area map, and nothing in the story.
    - Detection +2 means +2 to an enemy's spotting roll against you, and +2 tiles of NPC notice range in the story.
    - −1 Athletics doesn't change Defense.
    - **PROVISIONAL.**
223. *(F13)* **Trench Poet.** Verse uses the spec's debuff rule instead of the opposed roll: a Heart save against 12 + your
      Heart debuff strength (in the story: the NPC's tier save against 12 + Implication mod). It lands Confused as a
      declared exception (Confused is in the Brain family).
    - In a fight it costs 1 AP and reaches 8 tiles, no sight needed.
    - Allies in earshot (in the story, everyone else present) get +1 Composure for the scene.
    - Once per scene, shared by the fight and the story.
    - **PROVISIONAL.** Leon to confirm the family.
224. *(F14)* **Grudge Bearer.** GAMEBREAKING as written.
    - The extra round never applies to Stunned or Dazed.
    - The first-debuff save skip never applies to a Boss or to Stunned.
    - Never Forgive: the mark is `traitState grudge`; the Narrator sets it, and clears it with null when you're even. It
      gives −2 on attack rolls against anyone else, −2 on your saves (except against the mark), and −2 on story checks
      not targeting the mark (`check.target`, or the tag `targets_mark`).
    - The Narrator must give a path to get even. The arc lapse waits for an arc concept.
    - **PROVISIONAL.**
225. *(F15)* **Pacifist.** Sanctuary ends with your first attack, a damaging hit, a shove or an Outburst.
    - Nonlethal is a toggle, on by default; send `!nonlethal` to kill. It covers every blow that takes a foe's last HP,
      magic included.
    - Subdued foes are kept by name and id in `c.state.subdued`. Talking with one is +3, either when the check targets
      them or when it's tagged `talk_with_enemy_defeated_nonlethally`.
    - Karma awards whose reason says mercy, spare(d) or subdue(d) are doubled.
    - The Vow: a kill (kill credit, so bleeding you opened counts) sets Echo to 0 and gives Shaken for the session, in the
      story and in this fight and later ones.
    - **PROVISIONAL** (the Karma reason words, and the Heart debuff being Shaken).
226. *(F16)* **Humanity First.**
    - +15% goes into the target bucket.
    - +2 on saves against Fear from a non-human.
    - Heals from a non-human are halved.
    - Empathy, Charisma and Camaraderie checks tagged `non_human` or `vs_non_human` fail automatically. The check still
      appears, labelled "Xenophobe".
    - A Crawler counts as non-human for this trait.
227. *(F17)* **The Old Blood.** Heals from another race are halved. Prices are the Narrator's: there is no shop.
228. *(F18)* **Moon Hunter.**
    - "Creature" means any quarry you tracked.
    - Tracked comes from the Track story action (which also opens a pending ruling for where the trail leads) or from
      `traitState tracked`. Either way it clears when the scene changes.
    - +30% (target bucket) on the first attack on each tracked quarry this scene; a miss uses it too.
    - **PROVISIONAL.**
229. *(F19)* **Rabbit's Foot.**
    - Lucky Foot is armed at the start of each fight while its once-per-session use is left. The first enemy attack roll
      against you that would hit is rerolled automatically, because the engine can't pause an enemy turn. You can stand
      it down. Your own saves don't count.
    - In the story it's a pending ruling, sharing the same use.
    - Vengeful: +2 AP once, on the next turn after an ally (not a companion) is Downed.
    - Hunters (tag hunter) and Orks (kind ork) deal +25% to you.
    - **PROVISIONAL** (arm-then-auto).
230. *(F20)* **Drone Handler.**
    - The drone joins at session start and when the scene changes (`c.companions`).
    - Its stat block comes from enemies.json: HP 30 (the trait's), a service pistol with only a plain shot (no aimed
      shot, burst, auto, reload, Overwatch or jam clearing) and unlimited ammo: no reloads, no Heat, no jams (item 370,
      settled, Leon, 7 Nov 2026).
    - 3 AP a turn. +5 kg carry while it stands.
    - Repair drone: 2 AP, adjacent, one spare-parts charge, 10 HP × Proficiency Mastery level (minimum 1).
    - Out of a fight, Rebuild drone repairs it to full for 1 spare part. A destroyed drone needs a rest since it was
      destroyed, plus a drone frame or 3 spare parts.
    - Tethered: Shaken (story scope arc) until it's rebuilt, and in every fight.
    - **PROVISIONAL** (repair numbers, materials).
231. *(F21)* **Beast Handler.**
    - The stat block comes from enemies.json: HP 60 (the trait's) and bite 18 (item 370, settled, Leon, 7 Nov 2026).
    - 4 AP a turn.
    - Each of its turns is an order: d20 + Empathy mod against TN 8. On a fail it acts on instinct: it bites an adjacent
      enemy, or holds, and its turn is spent. It also fails if the handler is down.
    - Grapple: every melee hit of the beast's bite carries it (no attack mod: the beast's turns, ordered or on instinct,
      have no mod to pick). On a hit an enemy not already Grappled makes a Body save or is Grappled by the beast.
      **PROVISIONAL** (always-on rider).
    - Bond: if it dies, Shaken for the arc.
    - A long rest heals a living beast to full.
    - **PROVISIONAL** (TN 8, instinct, grapple as a bite rider).

*Story perks and dialogue traits*

232. *(G1)* **Footnote**: the bonus reaches every ally roll the Narrator ties to the fact that scene (the citation is once a
    scene). Combat form (new design): once a fight, 0 AP, +1/+2 for allies' attacks on one enemy for the rest of the
    round. Leon to approve the combat form or keep the perk story-only.
233. *(G2)* **Double Meaning** combat form (new design): once a round (not at will), 0 AP, +2 to each squad member's next
    attack on the named enemy until the holder's next turn; II: the nearest other enemy within 8 tiles loses its first
    action (2 AP). The decoy-tile variant isn't built.
234. *(G3)* **Crowd Pleaser** in a fight: 3+ enemies within 8 tiles make it one roll for all, save TN +2.
235. *(G4)* **Detective's Eye** combat form: at the fight's start, one hidden trap or the most-HP enemy's weak point (two at II).
236. *(G5)* **Their Own Idea**: an elite or boss listener, or an upper-realm or cursed one, makes a Heart save: d20 + tier
    save (minion 0, soldier 1, elite 2, boss 3) vs 12 + the holder's Heart debuff strength, rolled by the engine; a
    resisted try spends the use. Celestials are immune (the Accords). Off-map important listeners: the Narrator only.
237. *(G6)* **Old Tongue II** in a fight: the upper-realm being holds its attacks on its next turn (once per being, ever).
238. *(G7)* **Real Power**: once per organisation; II "agrees to see you" is a meeting, not a yes; Celestials only by cause.
239. *(G8)* **Established Fact** guardrails (as in the spec text above); a refusal refunds.
240. *(G9)* **Foreseen**: today a rewind in the fiction only (the Narrator shows what would have happened and replays the
    moment); the room sees the line. A real state rewind (the reroll copies) and a host veto are a hooks gap (below).
241. *(G10)* **Gambler**: checks and attack rolls only (not saves, death saves, Mana Short); an Echo reroll keeps the double;
    a fight counts as part of the scene (one use for both).
242. *(G11)* **Cold Case Obsession**: unrelated is the default; the Narrator marks related scenes (`case_related`) or checks
    (tag `case_related`). −1 on story checks, Ask and stay-hidden rolls, and in a fight attack rolls and saves (fixed at
    the fight's start); never passives.
243. *(G12)* **Holo-Drama Addict**: one use a scene shared by the story and fights; the combat form is +3 to the next attack
    that turn with no approval (new design). Leading Role's gate is Visualization vs TN 12 (Standard).
244. *(G13)* **Born Performer**: the default pick is the highest γ skill (ties in skill order), changeable once a scene.
245. *(G14)* **Every Lie Is a Door**: only the holder; +20 to stay hidden next to a guard; ends at any fight's start and at a
    new scene; people only, not simulation-level barriers.
246. *(G15)* **Closing Argument**: a pending Eloquence check on the point succeeds without the die.
247. *(G16)* **Everyone's Friend**: the first lie is declared by the player (button) or tagged `lie` by the Narrator.
248. *(G17)* **Cover Story**: the engine counts an identity as burned when it is cleared after a failed roll; the old con is
    owed at 3 (once, until `old_con: true`).

*Identity, economy and upkeep traits*

249. *(H1)* **Mind Without Fog / Unmoving and the trait items.** The glasses (Bottle Butts) and the mask (The Mask) are not
    "gear" for Unmoving. Unmoving cancels only worn items' skill bonuses, and items.json has none yet (plan 6 Mind
    Without Fog 3). The excludes with Symbol of Order and Rogue Element are already in the data. Disarmed is in the Heart
    family, so this trait also makes the character impossible to disarm; Leon to confirm (problem 4).
250. *(H2)* **Symbol of Order / Rogue Element, the band rule.** The pressure rule above: 2 points of award per point outside
    the band (plan 6 Symbol of Order 2). Leon to confirm the reading of "costs double".
251. *(H3)* **Rogue Element, wrecking.**
    - In a fight: this unit breaks a map object to 0 HP. That gives +1 Echo once a scene; the fight counts within its
      scene.
    - In the story: the player claims it with the action. The Echo comes at once, and the Narrator takes it back with
      `echo n:-1` if nothing was wrecked.
    - Lawful factions start hostile, but this stays a brief line: factions carry no lawful tag.
252. *(H4)* **Machine-Faced.**
    - Only a Composure check made with Composure alone succeeds on its own (problem 2).
    - A Heart save in dialogue succeeds on its own (problem 3).
    - A dialogue check left with no skill fails on its own.
    - Charisma and Implication voices keep speaking (problem 4).
253. *(H5)* **Bottle Butts.** A critical hit that lands a head injury (Dazed) knocks the glasses off at once (problem 4).
    They go to the pack; the player puts them back on after the fight.
254. *(H6)* **Oil in My Mind / Oil in My Soul, Paper.** One point's worth comes off what those skills derive, on top of −1 on
    their rolls, applied once with both Oils (plan 6 Oil in My Mind 1):
    - −2 HP per level (Durability);
    - Elemental damage taken −10% (Pain Threshold), so the character takes 10% more;
    - Healing received −10% (Sensory).
    Without this the downside never bites. Leon to confirm.
255. *(H7)* **Masterpiece.**
    - The +2 goes on the ally's next roll, not a roll the ally picks: the check card has no toggle for it (problem 3).
    - The ally must be another character.
    - The Masterpiece action is granted once (by Oil in My Mind) even though both Oils carry the synergy block (Oil in My
      Soul problem 2).
256. *(H8)* **Lunarshine.**
    - The states stack (problem 2).
    - A fail on the scene-end check adds a drink and skips the reset (problem 1).
    - A bottle holds 5 drinks.
    - A drink costs 1 AP in a fight.
    - A "day" is the stretch between long rests (problem 3).
    - The shakes need a whole day without a drink: the first session start never gives them.
257. *(H9)* **Central City Kid.**
    - Soft Hands triggers on the first real HP loss of the fight. Self-inflicted damage doesn't count; shield-only hits
      don't count (problem 5).
    - The −2 AP comes off now on the character's own turn, otherwise off the next turn, within the floor of 2.
    - "Outside the city" means a campaign zone marked `in_city: false`. Unmarked zones are neither in nor out.
258. *(H10)* **Insomniac.**
    - Wired gives back half of what the rest would (problem 2):
      - a short rest: 12.5% of max HP;
      - a long rest: half the missing HP and half the missing MP.
    - Always Up applies in a rest-camp fight: hidden enemies' ambush gets no 19–20 critical and no Ambush multiplier
      against the Insomniac.
    - Session start isn't a rest for Wired yet (hooks gap 2).
259. *(H11)* **Wanted.** Officials' hostility is party-wide, as memory factions are (problem 2): "Central City officials",
    standing −40, seeded once.
260. *(H12)* **Company Man, GAMEBREAKING.** The data's `price_mod buy_pct -100` makes RTC gear free. Recommended: −40 (60% of
    list), or a number from Leon.
    - No shops exist, so the price is only in the brief.
    - Extraction from a fight works only while conscious (problem 4). The character leaves the fight and gets no XP from
      it. The fight is a loss if no conscious PC is left.
261. *(H13)* **Market Blood.**
    - Buy −20% and sell +20% stay Narrator-side until shops exist.
    - "Price it" reads items.json prices for what the character carries, as a private line. Anything else is a ruling.
    - The gift Analysis check is the Narrator's for now (hooks gap 3).
262. *(H14)* **Inner Ring Heir.** "Triple funds" has no base: characters have no credits. It stays a brief line until a
    starting-credits figure exists (problem 1).
263. *(H15)* **Ace Pilot, Grounded.**
    - It triggers only when the Narrator sets `traitState {key:'grounded', value:true}`: a full day on foot with vehicles
      at hand (problem 1). Without vehicle rules, the trait would otherwise be all downside.
    - Movement −1 becomes −0.5 (lane A's −1 Movement ruling).
    - Reaction Speed −1 includes initiative.
    - "Back in a seat" ends it, and the Narrator can refuse.
264. *(H16)* **Worldline Fracture.**
    - It is active only when every living character in the room holds it. The brief says ACTIVE or dormant, and the
      session start says which.
    - Prepared campaign content stays and is reframed as its impossible version (problem 4).
    - By design this makes the Narrator heavier.

*The 13 base classes*

265. *(I1)* **Fire Discipline.**
    - Aimed shots add 0 Heat, Overwatch aimed shots included.
    - The Burst discount works once a turn.
    - A bow's Aimed shot gets +1 on top of the aimed +2.
266. *(I2)* **Special Ammo.** One load of each type per rest: armour-piercing, hollow-point, incendiary.
    - Nothing stockpiles.
    - A bow's quiver holds **12 arrows** (provisional).
    - Flamers, launchers and thrown weapons aren't eligible.
    - Loading a type costs the weapon's reload AP.
    - A partly spent standard magazine goes back to the pouch.
    - The next normal reload goes back to standard rounds.
    - In the story, loading is free and costs the same use.
267. *(I3)* **Killzone.**
    - The double hold costs twice the shot's AP.
    - The +2 to hit applies only to Killzone double holds.
    - The two shots share one reaction.
    - Each shot goes at a different enemy.
268. *(I4)* **Momentum toward a target.** The gain is the distance closed on the target since the turn began.
    - It is counted at the first melee attack of the turn, at most +2.
    - Lunge's own tiles don't count.
    - Riposte hits still earn the usual +1.
269. *(I5)* **Lunge.**
    - Costs 1 Momentum plus the strike's AP (2, or 3 heavy).
    - The move is free and provokes no opportunity attacks. Overwatch still fires.
    - The engine picks the stopping tile: the shortest walk, then the tile nearest the target.
270. *(I6)* **Riposte.**
    - A fumble counts as a miss.
    - A riposte never triggers another riposte.
    - It uses the reaction and adds the Counter bonus (`u.counter`).
271. *(I7)* **Finisher.** Momentum is spent even on a miss. A hit then earns the usual +1.
272. *(I8)* **Brace (shown as "Brace (Hold the Line)").**
    - Guard gained: +max(1, 1 + Durability modifier), up to 5 in all.
    - +2 Defense until you move, are shoved or pushed, or go prone.
    - It also counts as the weapon Brace (`u.braced`).
273. *(I9)* **Interpose.**
    - Only weapon attacks on an adjacent ally can be intercepted.
    - The Defender takes the attack's damage recomputed against their own armour, with their shield and Reactive
      Plate applying.
    - A critical's injury from the Interposed blow lands on the Defender, not the ally (item 400).
    - It costs 1 Guard and the reaction.
274. *(I10)* **Draw Fire.**
    - No save: it costs Guard.
    - Rule text for the Taunted condition: must attack the taunter if able, otherwise −2 to hit anyone else.
    - Bosses and Celestials aren't Taunted. They take −2 against anyone but the Defender on their next turn.
275. *(I11)* **Reactive Plate.**
    - It is not a reaction.
    - It applies after armour and before the shield, and can cut damage to 0.
    - Each 3 Guard lost raises the meter by 2.
    - Policies: spend what it takes, keep 1, or off.
276. *(I12)* **Triage (GAMEBREAKING at will).**
    - In a fight: once per target per turn.
    - Out of one (the story, and the area map's rounds): once per ally per scene, at 20 × Healing given; one count for
      both.
    - Never on yourself: Triage heals an ally.
    - Stabilise costs 1 AP and needs no stim.
277. *(I13)* **Stim Throw.**
    - Needs sight; the throwing range doesn't apply.
    - It also stops Bleeding.
    - A Downed ally is stabilised at 1 HP.
278. *(I14)* **Field Surgery.**
    - Choose one: treat one arm or leg injury, or clear the ally's lasting Body conditions (`persistentConds` and
      this scene's `npcConds`).
    - Robot medics repairing machines: the Narrator rules it.
279. *(I15)* **Marks.** At most 3 at a time; a 4th lifts the oldest. A Mark lasts until the fight ends.
280. *(I16)* **Toxin.**
    - Blades, thrown weapons and bows only, not bullets.
    - The engine rolls its own Body save against 12 + Body debuff strength, Bleeding included.
    - The coat lasts until the next hit or the end of the fight.
    - A coat put on in the story carries into the next fight.
281. *(I17)* **Execution.**
    - Any squad Mark counts.
    - The 25% is checked after the hit's damage.
    - Bosses and units of kind `celestial` are immune.
282. *(I18)* **Barrage.**
    - STONE counts too; under 1.4, ACID too (item 486): the 2-charge damage words are FIRE, FREEZE, SHOCK, STONE and ACID.
      SPARK and GALE already cost 1 charge, the floor, so they gain nothing.
    - Each glyph costs at least 1 charge.
283. *(I19)* **Overcharge.**
    - Once a fight; once a scene on the area map.
    - The next glyph costs no charge and no AP, and adds 1 Flux.
    - Max Sigil words is +1 only while that glyph is on the ground. The data's standing +1 is the bug.
    - The free glyph takes 1 off the firing charge (minimum 1).
284. *(I20)* **Payload** ("Evoke with Payload"; in a fight and on the area map). It adds Flux equal to the Line's glyph
    count (a TWICE glyph counts once here, though drawing it cost 2 Flux). Under 1.4 (items 448, 470) what doubles is the
    Burst, not a shape:
    - **SPREAD:** the radius doubles (2 → 4).
    - **PUSH:** the cone's length doubles (3 → 6).
    - **Both:** both double.
    - **Neither** (one target; CONDENSE counts as one target): one more missile, as one more TWICE would, at a target you
      didn't pick in the area (the nearest of the right kind).
    - **STAY, WAIT or WATCH:** can't carry a Payload (what stays isn't doubled).
    - With Paint the Field the free Burst word is doubled too (item 485).
    - *The 1.2 outcomes (Ring 2 tiles, Line + SPREAD 6-tile cone, a bolt that carries on, a lone-target Stack, TWICE's 2
      more targets) are gone with the shapes they read.*
285. *(I21)* **Raise Cover.**
    - A lone STAY glyph of yours (alone on its tile and the only glyph of its stroke; glyphs of other strokes touching it don't matter, rules 1.10; a STAY drawn before 1.10 keeps the old test, no glyph of its side touching it) becomes a cover rune (1 AP, 1
      charge): 2 tiles of full cover (barricade objects, 40 HP each). Under 1.4 you drew it standing on it, so you Evoke
      it from a tile next to it; the rune needs its tile clear. It is the class's one exception to the Line.
    - The tiles are the glyph's own and the free neighbour across the line to the nearest enemy.
    - It lasts 2 rounds + the duration bonus.
    - Combat only.
286. *(I22)* **Ward.**
    - Self allowed.
    - The higher shield stands.
    - 10 × charge × Healing given, +1 Flux per charge.
287. *(I23)* **Seal.**
    - Range 8 + the Sigil range bonus, sight needed.
    - +2 Flux.
    - The caster's own tile is what counts: Sigil charge (glyph and firing) and Outburst MP are doubled while an enemy
      caster stands in the zone.
288. *(I24)* **Quicken.**
    - Not on yourself; no sight needed; no Flux.
    - It is not perk AP, so the +3 cap doesn't count it. The ceiling of 9 holds.
    - It applies at the start of the ally's next turn. On the area map it lands on this overworld round's AP (item 403).
289. *(I25)* **Inscribe Gear.**
    - Always 2 charge. 3 AP in a fight (adjacent or yourself); no AP out of one.
    - Weapon: +10% damage with that weapon. Torso: +5 armour, worn armour or not.
    - One inscription per item. Two Scribes don't stack.
    - It lasts until the next rest.
290. *(I26)* **Stored Spell (GAMEBREAKING dead move).**
    - Cap: max(1, Rumination modifier).
    - Writing is at will within the cap. The data's `per_rest` conflicts with the cap.
    - Both the draw charge and the firing charge are paid when written.
    - Words are capped at Max Sigil words, so writing never overloads. STAY can't be stored.
    - It fires for 1 AP from the holder's tile with the Scribe's snapshot numbers:
      - a Stack lands next to you (8 tiles with PUSH);
      - a Line flies toward the chosen tile (range by word count, 2–4);
      - a Ring bursts on an adjacent tile.
    - It fades at the next rest.
291. *(I27)* **Bind (GAMEBREAKING dead move).** Rank I also teaches BIND, outside the cap. The +2 to the save TN goes to
    whoever Evokes the pattern.
292. *(I28)* **Blind and Slow (GAMEBREAKING free words).** A glyph's draw costs at least 1 charge. Only MUDDLE really gets
    cheaper.
293. *(I29)* **Rewrite.**
    - Range 8 + the range bonus, sight needed. +1 Flux. Once a turn.
    - On a failed Brain save, one helpful state flips:
      - **Overwatch:** lost, with its reaction.
      - **Shield:** becomes Sigil damage, at most 30 × the Sigil multiplier, armour applies.
      - **Braced or Emplaced:** Prone.
      - **Guarded or Withdrawing:** −2 Defense for the rounds left.
      - **Inspired:** −2 to hit for the rounds left.
      - **Hidden:** revealed and Marked.
    - Anything else: the Narrator.
294. *(I30)* **Shape.** *(Superseded by rules 1.5: item 522.)*
    - It removes the base cast Strain (1, 2 in Flooded air).
    - The +2 for having no Emanator and the Strain of holding stay.
    - Either school being Damage counts.
295. *(I31)* **Storm Front.** *(Superseded by rules 1.5: item 523.)*
    - +10 MP, flat, after the multipliers, paid at Begin.
    - Single-target Damage designs only (no Rain, Size, At Once, Inverse).
    - It hits 2 more enemies within 2 tiles of the aim tile, nearest first, one roll each. Once a turn.
296. *(I32)* **Heart Surge (GAMEBREAKING with Shape and at will).** *(Superseded by rules 1.5: item 524.)*
    - Once a turn.
    - It adds the base Strain on top. With Shape the net is the base, not 0.
    - ×2 at release.
    - Conditions from that release last twice as long. Push and pull distances double too (item 401).
    - MP and holding Strain are not doubled.
297. *(I33)* **Will Shield.**
    - A class Buff cast, not a design option.
    - Self allowed.
    - 30 × Healing given, until the fight ends.
298. *(I34)* **Drink It In.**
    - It uses the reaction and needs at least 1 point absorbed.
    - MP gained: the spell's real price, carried on its damage: an Outburst's MP cost, 10 per word of a Sigil spell
      (item 402). The old stand-ins (25, 2 words) apply only to a source that carries neither.
299. *(I35)* **Sanctuary.** *(Superseded by rules 1.5: item 525.)*
    - Released at once.
    - Allies (you included) take half of all damage, except your own Mana Short.
    - It lasts until your next turn starts.
    - In the story it is a pending ruling.
300. *(I36)* **Inspire** (the state is named "Encouraged").
    - It works on attacks, saves, story checks, and Sigil and Soul strike rolls (the `spell_roll` hook).
    - It refreshes and never stacks. Not on yourself.
    - Without an Emanator it costs +2 Strain in a fight.
301. *(I37)* **Mend.** Every Buff heal the Bard makes heals 40 (not 30). The data's `ap_cost: 0` should read `soul_cast_ap`.
302. *(I38)* **Gift.** *(Superseded by rules 1.5: item 526.)*
    - The ally casts with their own Soul cast AP and the Bard's design and numbers, on the Bard's MP and Strain.
    - It releases at once.
    - It fails if the Bard is down.
    - Once a rest.
303. *(I39)* **Dread.** −5 MP after the multipliers (minimum 5). Every Fear you inflict, from any source, lasts +1 round.
304. *(I40)* **Mind Fog (expanded) and Puppet.**
    - Mind Fog: every condition your Status Outbursts inflict saves at +2 TN.
    - Puppet: the class text wins over `conditions.json`. It is a Heart save (a boss rolls twice and keeps the
      better), and the Hexer picks one action: a move, an attack or a reload. Then the target goes back to its AI.

*Advanced classes, part 1*

305. *(J1)* **The Draw** (audit 1-3). Once per fight, not per scene. It fires at combat start, before the first turn, at the
    nearest enemy the squad can see (lowest HP on a tie). The engine picks the target because no player can choose
    before the first turn. A surprised Gunslinger (no turn in round 1: caught unaware or striking in the open) can't
    Draw; an ambushing one can. Pistols and revolvers only. PROVISIONAL.
306. *(J2)* **Six for Six.** Targets are a list (repeats allowed). Recoil applies to each shot. Heat is the engine's +1 a
    shot: from cold, the 6th shot of a Heat-6 gun jams after firing. No further numbers needed.
307. *(J3)* **Called Shot** (audit 1-6). The shot is a plain single shot at −2 (not Aimed) for 3 AP, with any gun or bow (not
    melee or thrown). The shooter picks the arm (`arm:left` / `arm:right`; default the target's main hand). The
    target's Injury resistance still rolls. A natural-20 crit also rolls its own injury. Data fix: `tn_mod` →
    `attack_mod` context `called_shot` −2. PROVISIONAL.
308. *(J4)* **Emplace** (audit 1-5). Needs a heavy weapon or a rifle. It sets the Emplaced condition and counts as braced
    (the LMG's "−2 unless emplaced" goes and its braced bonus applies). It gives no recoil and +5 armour until you move.
    A shove or knockback ends it too. OPEN: the Emplaced condition's +2 to hit (conditions.json, combat.ts:563)
    contradicts the class text. The audit's fix (drop the +2 or rewrite it to match) is a data/core change, so the +2
    stands for now. Rename one of the two "Emplace"s (the LMG skill or the class move). Data fix: `stat_mod armor +5`
    needs `while: emplaced`. PROVISIONAL.
309. *(J5)* **Suppression** (audit 1-7). Laying the zone down costs 10 rounds (or what's left) and +4 Heat. Nothing is rolled
    when the burst goes down. Until your next turn, each enemy that moves into, inside or out of the 3x3, or attacks
    from it, takes one attack roll from you, once per enemy. Those shots deal the weapon's damage and cost no ammo, Heat
    or reaction. A hit Pins (Body save). PROVISIONAL.
310. *(J6)* **Belt Discipline.** While Emplaced, Heat limit +6 and 4 Heat shed a turn. Data fix: the per_turn `heat_mod` should
    read `set: -4` (audit 2), and the move should be marked passive.
311. *(J7)* **Case File** (audit 1, 3-5). Analyze costs 1 AP flat. The data's −1 gives 0 at Analysis 3, so it should be
    `action_cost analyze set: 1`. Every Analyze Marks the target with no save; Marks last the fight. Each marker holds
    3 Marks at most (the Assassin cap) and the oldest drops. The class action re-Marks an already-analyzed target. In
    the story, "Open a case file" on an NPC, then pass an Analysis check in the same scene, files them: they start the
    next fight with you Marked. PROVISIONAL.
312. *(J8)* **Weak Point (class)** (audit 1-3). Aimed shots at a Marked target ignore armour (shields still absorb) and crit on
    18-20. Data fix: `crit_min set 18` scoped to aimed+marked. OPEN: rename it (it collides with Analysis's Weak
    Point), e.g. "Soft Tissue".
313. *(J9)* **One Shot** (audit 1, 2, 4). The data's `damage_mult 2.0` is a bug: triple damage means 3.0. GAMEBREAKING fix:
    Bosses and Celestials take ×2, not ×3. Once per fight. PROVISIONAL.
314. *(J10)* **Banner Thread** (audit 1, 2). The bonus needs no armour in the outer, inner or lower torso slots. +1 Movement
    stands as written. OPEN for Leon: +1 tile per AP doubles speed at Agility 1; the alternative is +0.5. PROVISIONAL.
315. *(J11)* **Rally Banner** (audit 1-6). The banner is a 20 HP object enemies can cut down. The shield is 10 × the dancer's
    Healing given, topped up and never stacked; the dancer counts as an ally. It holds while the dancer stands within
    3 tiles and isn't Downed. The bot-thread banner weapon's Rally is a separate one-off burst. PROVISIONAL.
316. *(J12)* **Sweep** (audit 3, 5-7). Hits during Sweep build no Momentum (no free loop). Heals are 10 × Healing given,
    once per ally. Only tiles entered count, not the start tile. The walk draws opportunity attacks and Overwatch like
    a move (Leon's call; the alternative is none, like Lunge). A gun in hand strikes with fists. Data fix: rename the
    action id to `banner_sweep` (it collides with the greatsword's Sweep). PROVISIONAL.
317. *(J13)* **Credits** (RTC). Starting account 1000 credits (see spec text). PROVISIONAL until there's an economy.
318. *(J14)* **Supply Drop** (audit 2-6). A Supply is a stim. The crate holds 4 takes, is half cover with 30 HP, and lands at
    the start of the Contractor's next turn. GAP: allies can't take from it yet (needs an object-granted action), so
    the Contractor takes, or hands a take to an ally next to the crate (1 AP). In the story: 100 credits, a stim at
    once, and a ruling on whether there's signal. PROVISIONAL.
319. *(J15)* **Strike Call** (audit 1-5). The centre must be a tile the squad can see. The 50 is flat Physical (armour applies,
    no multipliers) and hits friend and foe. Before it lands, the engine moves every unit inside that has a reaction 1
    tile out, if a free tile outside is next to it. Cover inside takes 50. Kills are the Contractor's. PROVISIONAL.
320. *(J16)* **Extraction** (audit 1-4). The landing tile must be one the squad can see. It lands at the start of round +2 and
    lifts every PC within 2 tiles (a Downed one only with a standing ally within 1). Lifted PCs leave the fight. If
    nobody is left, the fight ends as "extracted". GAP: the engine has no such outcome, so `finishCombat` reports
    "Lost" and the fight note says EXTRACTED. Data fix: adjudication `narrator` → `hybrid`. PROVISIONAL.
321. *(J17)* **Sword Form** (audit 1-4). A glyph is drawn on a miss too. One free glyph per attack in all: the Evoker blade's
    Edge Word doesn't stack (both engine-run: an attack that drew a Sword Form glyph leaves no Edge Word, item 487). The glyph needs the target next to you; a reach-2
    target can't carry one. Data fix: `action_cost value '0_with_melee'` → `set: 0` with context `melee_attack`.
    PROVISIONAL.
322. *(J18)* **Edge Sigil** (audit 1-4). The bonus is the word's listed damage × the Elemental multiplier: not the Sigil
    multiplier, not the crit. It takes half armour. FIRE, SHOCK, FREEZE, SPARK and GALE count; STONE doesn't. OPEN
    (audit 3): the glyph stays and can still join a pattern, so it deals damage twice. PROVISIONAL.
323. *(J19)* **Three-Cut Script** (audit 1-3, 6). The spell resolves as a Stack cast straight onto the last target struck. The
    Evoke charge is paid on top of the draws. The third word may go over Max Sigil words (the alternative is to need
    Intelligence 3). An overload ends the script. Words are paid as they're cut, but no glyph is left on the ground
    (three wouldn't fit one tile). PROVISIONAL.
324. *(J20)* **Deploy Cover** (audit 1-4). GAMEBREAKING fix: at most 3 out per engineer, and a fourth packs up the oldest. The
    barricade is a crate-kind object (half cover, 40 HP, blocks movement) on an open adjacent tile. A STAY glyph on it
    turns it to full cover (blocks sight) without Evoking, for as long as the glyph lasts. Barricades pack up when the
    fight ends. Data delta: add a `portable_barricade` object kind instead of the renamed crate. PROVISIONAL.
325. *(J21)* **Sentry Turret** (audit 1-6). It needs an Evoker (2 charge). At will, one at a time (the data's `per_scene`
    plus "one at a time" was redundant). It fires at the end of the engineer's turn at the nearest visible enemy
    within 12 tiles: d20 + 4 against Defense, −5 for half cover, 20 flat Physical. It releases no bots. PROVISIONAL.
326. *(J22)* **Bulwark Line** (audit 1-5). GAMEBREAKING fix: only cover within 3 tiles (measured from where you stand when you
    use it) that has an ally next to it hardens. It turns full and gets +20 HP, which is lost first. At your next turn
    it goes back, never breaking the cover. Data fix: "rounds: 1" → "until your next turn". PROVISIONAL.
327. *(J23)* **Inscribed Rounds** (audit 1-6). Any gun, an Evoker, the word known, 1 charge per round, up to 6 a rest. The
    inscribed rounds fire first (a toggle, on by default) and a miss spends one. On a hit:
    - An element word adds half its Subject damage as its own type: FIRE 15, SHOCK 15, FREEZE 12 plus a Slowed save,
      SPARK 7, STONE 17 Sigil, GALE 7 Sigil.
    - A condition word (BIND, BLIND, SLOW, MUDDLE, DREAD, SILENCE) applies its condition, saved against 12 + debuff.
    - Each hit adds +1 on the meter.
    Stored as `c.state['class:spellslinger.inscribed_rounds'] {word, n}`. There's no per-round ammo identity yet.
    PROVISIONAL.
328. *(J24)* **Spell Magazine** (audit 1-5). One magazine per rest (the alternative is the Rumination modifier, like Stored
    Spell). The cost is every word's charge plus the Evoke charge, paid out of combat; the Flux vents. Loading it costs
    the weapon's reload AP and drops the old magazine on the floor (superseded by item 679: it drops into the pile on your tile, empty or not, as a speed reload does). Its first hit auto-hits with damage words, while
    conditions still get saves. Stack and Line land on the target, SPREAD hits within 2 at ×0.6. An unfired spell fades
    at the next rest. PROVISIONAL.
329. *(J25)* **Ricochet Glyph** (audit 1-5). Any ranged shot, not on a fumble or a shot cover stopped. The new target is the
    nearest other enemy within 4 tiles of the first that the first target's tile can see. The roll is at −2, with no
    ammo or Heat. A toggle, on by default. Data fix: `tn_mod` → `attack_mod`, plus a trigger `on_miss`. PROVISIONAL.
330. *(J26)* **Gauntlet Infusion / Charged by Death / Discharge** (audit). The infusion elements are FIRE, FREEZE, SHOCK and
    SPARK, chosen once per rest out of combat. +10 × Elemental for 5 MP a melee hit, as a toggle (on by default). No
    riders, no Strain, no meter. Charges (max 3) come from any kill credited to you and share the gauntlet's pool.
    Discharge hits enemies next to the target (not the target, you or allies) for 20 per Charge × Elemental. A miss
    keeps the Charges; a kill on the hit gains its Charge after the spend. Data fix: `max: 3` on charged_by_death.
    PROVISIONAL.
331. *(J27)* **Adamantile Knight's Defender pieces** (audit 1, GAMEBREAKING).
    - Brace (2 AP) is granted as the Knight's own action.
    - Interpose: an adjacent ally hit by an attack: 1 Guard and the reaction, and the Knight takes the damage the ally
      would have taken.
    - Reactive Plate uses the reaction, except on a hit the Knight Interposed for. It spends just enough Guard to
      stop the hit (each cuts 10), and every 3 Guard lost adds +2 on the meter.
    PROVISIONAL.
332. *(J28)* **Adamantile Plate** (audit 2-4). Every Reactive Plate use shields the adjacent ally with the least HP left for
    10 per Guard spent, unscaled. The larger shield stands. PROVISIONAL.
333. *(J29)* **Bulwark of Will** (audit 1-3). Only the Defender Brace (2 AP) triggers it, not the 1-AP weapon brace. The
    shield is 20 × Healing given, doesn't stack, and lasts until it's absorbed or the fight ends. PROVISIONAL.
334. *(J30)* **Unbroken.** Once per fight (the data's `per_scene` should read `per_combat`), from any source, after Last Wall
    and Bite the Bullet. Data fix: replace `stat_mod hp_floor_once` with a `would_drop_to_0` trigger.

*Advanced classes, part 2 (the magic advanced classes)*

335. *(K1)* **Silent Kill** (audit 2-3, GAMEBREAKING). A killing blow from Hidden keeps you Hidden unless it was a loud gunshot
    (a firearm with no suppressor; bows, melee and silent or suppressed guns are quiet). No new ambush until you hide
    again (one per Hidden entry, already the engine's rule). Every enemy looking for you this round gets +2 per kill you
    made this round (its spot TN drops by 2 a kill). PROVISIONAL.
336. *(K2)* **Nightmare Mark** (audit 1-4). A Shade who isn't an Assassin gets the Mark (1 AP, no save, 3 at most, the oldest
    lifts). The marked foe's Heart save is at the start of each of its turns; a failure makes it Afraid of you for that
    turn only (the Fear ends at its turn end). Hexer's Dread doesn't lengthen it. Bosses save at their tier. PROVISIONAL.
337. *(K3)* **Lingering Dread** (audit 1-4). Within 3 tiles **of the victim**, with line of sight to the victim's tile; Blinded
    enemies are immune. Shaken uses the spec's Shaken (3 rounds, −2 Heart saves and social). A silent kill frightens the
    witnesses too. PROVISIONAL.
338. *(K4)* **Blessed Shells** (audit 2-6). A toggle on Pray. Any weapon ("or your weapon"). The Pray cooldown is still paid. A
    loaded Blessing lasts until the hit or the end of the fight. Harmful → the target; helpful → every ally next to the
    target, the Templar included. Polarity: patrons.json has none, so HP loss or a debuff reads as harmful (a fight note
    asks the Narrator to overrule). Story: "Bless a shell" rolls the prayer (d20 + mod(Faith) + half Devotion vs the
    patron's mood) and loads at the start of the next fight this scene. Data delta: `polarity: harm|help` on each
    Blessing. PROVISIONAL.
339. *(K5)* **Under the Eye** (audit 1-5). Combat: while the Templar is Witnessed, allies within 3 tiles get +2 to hit (the
    fight counts as on-theme by default; a fight note asks the Narrator once a round). Story: +2 on any other
    character's check the Narrator tags `patron_theme`. Allies pay no off-theme Devotion. Data fix: `skill_mod_tag tag
    patron_theme` should be a hook/tag the Narrator supplies (it now is: the `patron_theme` check tag). PROVISIONAL.
340. *(K6)* **Judgement** (audit 1-5, near-GAMEBREAKING economy). Costs **1 Devotion** (not 3), once per fight (the data
    said per_scene and 3 Devotion; fixed), 4 AP all told, a melee weapon or any shotgun-family weapon (the scattergun,
    censer gun, coach gun, sawn-off, brigade auto). Damage × (1 + Blessing power), Blessing power = 1 + 0.1 × Faith.
    Spent hit or miss. A fight note asks the Narrator about taboos. Rename the move or Nerukhan's Blessing (both
    `judgement`). Data (done): `resource devotion -1`, `uses: per_combat`, text "Once per fight, spend 1 Devotion". PROVISIONAL.
    *Rules 1.6.1: 1 Devotion is 10 Devotion XP (item 706); the data is now `resource devotion -10, unit xp`.*
341. *(K7)* **Half-Sigil** (audit 1-5, GAMEBREAKING). A half-glyph costs **1 charge** (never free; the word's charge is
    skipped), +1 Flux, Glyph-limit and 2-per-tile rules as normal, an Evoker needed. Half-glyphs pair as a Stack: the
    second on a tile is drawn from the words that complete the grammar (a Subject with a Form/Motion word you know, and
    back). Rules 1.4: item 464. PROVISIONAL.
342. *(K8; rules 1.4: item 465)* **Stitch** (audit 1-6). A pattern of only half-glyphs fires only through Stitch (the plain Evoke refuses it). The
    d20: 1-5 the spell's Subjects land at full strength, no roll, on the nearest creature on your side, you included
    (ties to you); 16-20 damage doubles (damage only, after armour); 6-15 normal. A natural 20 on the hit roll stacks.
    Words that make no spell fizzle (the glyphs fade, the Flux stays). Echo rerolls of the Stitch d20 are not wired
    (MISSING: Echo in combat). PROVISIONAL.
343. *(K9)* **House Edge** (audit 1-2). Once per fight (data per_scene → per_combat). A toggle on Stitch, on by default: a
    1-5 is rerolled; the new roll stands. PROVISIONAL.
344. *(K10)* **Beloved Spells** (audit 1-3). Marked out of a fight (area map or story), 3 at most. −30% MP after the band and
    the Insight saving, 5 MP at least. "Design a Beloved spell" makes a design with one module more than the slots
    (text `school: module, module`). A design using the extra slot can't be un-marked until edited down. PROVISIONAL.
345. *(K11)* **Heart's Own** (audit 1-3). One Strain pool. While Beginning or holding a Beloved spell the limit is +2, and the
    Mana Short's excess counts from the raised limit (10 + 2 × (Strain − (limit + 2))). A later ordinary cast shorts
    against the plain limit. PROVISIONAL.
346. *(K12)* **Love Made Manifest** (audit 1-4, GAMEBREAKING with Heart Surge). Once per fight, a toggle on Begin/Release:
    ×3 on damage, heal and shield; the release's conditions last ×3 rounds; push distance isn't lengthened. Spent on a
    miss. It doesn't combine with Heart Surge or another effect multiplier: the higher stands (×3). PROVISIONAL.
347. *(K13)* **Closed Loop** (audit 1-5). A second Vent ("Vent into your heart", 1 AP): 10 MP per Flux to Max MP, the meter
    doesn't rise. The plain Vent stays. Overloads still burst into the air. Not in the spec: add a Circuit Mage block
    next to the 1.2 magic classes. Data fix: `ap_cost` 1 on the move is the Vent's (set it to 0 with
    `modifies: vent`); `value: "10*flux"` → a bespoke op `vent_to_mp {per_flux: 10}`; add `provisional: true` and
    `rules: "1.2"` to the class. PROVISIONAL.
348. *(K14)* **Self-Crystallise** (audit 1-4, GAMEBREAKING economy). 100 MP → 1 standard core, any meter. At most **Virtue**
    cores per long rest, and self-made cores **can't be sold** (counted in `c.state.selfCores`; MISSING: the shop
    must refuse them). Works out of combat too (the story strip), with a ruling: a pile of self-made cores is
    conspicuous. PROVISIONAL.
349. *(K15)* **Fusion** (audit 1-5; needs Leon's sign-off; rules 1.4: item 466). The model: a pattern of only Form/Motion glyphs fired with a ready
    Outburst in the Subject's place. Costs: the draws as normal, then the Evoke's AP (1) and charge, plus the
    Outburst's MP, Soul cast AP and Strain, plus +1 Strain and +2 Flux. Delivery: a Line's reach by length (SPREAD: a
    cone ×0.6), a Ring's burst ×0.8, a Stack next to it (PUSH: 8 tiles; SPREAD: within 2, ×0.6), TWICE adds the
    nearest other enemy within 6. Every target gets the school at stage 1, or the held stage when you fuse an Outburst
    you were holding. STAY isn't allowed (no standing Outbursts yet). Each Fusion is a fight note (Knowing risk).
    Data fix: `ap_cost 0` vs the expression: unify. PROVISIONAL.
350. *(K16; rules 1.4: item 467)* **Keystone** (audit 1-5, GAMEBREAKING STAY wall). 2 AP + 1 spare standard core (in place of the word's charge),
    +1 Flux, own or adjacent tile, any Evoker (the mason's chisel item doesn't exist yet: data delta `mason_chisel`,
    1H tool, counts as an Evoker; price and weight provisional). Never fades, can't be scuffed, doesn't count toward
    the glyph limit, survives being Evoked, one at a time. It stays in that map zone for the session (lost on leaving
    the zone's map or at session end). The fix: a STAY zone holding a Keystone lasts as an ordinary glyph would (the
    Keystone always counts as a fresh glyph). The glyph fade, Scuff (yours and an enemy's) and Evoke all skip a glyph
    flagged `keystone`, so it is never briefly gone (a second Evoke in the same turn finds it). PROVISIONAL.
351. *(K17)* **Survey** (audit 1-3). −1 charge (1 at least) for you and your allies firing a pattern that holds your Keystone;
    enemies get nothing. Reach: Evoke from up to 2 tiles of the pattern (with sight of it), for you and your allies,
    through the plain Evoke (the `evoke_reach` hook); the mason's Class tab action stays as the explicit form. Data fix: `word_cost keystone_pattern` → bespoke `keystone_reach {tiles: 2, evoke_charge: -1}`.
    PROVISIONAL.
352. *(K18)* **Foundation** (audit 1-3). Once per scene, 0 AP: this turn, draws within 2 tiles of the Keystone cost 0 AP
    (charge and Flux paid), through the "Draw near the Keystone" action. Needs a Keystone on the map. Data fix:
    `action_cost draw_sigil_word "0_near_keystone"` → `{action: 'draw', set: 0, context: 'within_2_of_keystone',
    uses: 'per_scene', duration: 'turn'}`. PROVISIONAL.
353. *(K19)* **Enlarge and the Grand forms** (audit 1-11). Own or adjacent tile; no Flux; 3 charge from the Evoker; once per
    fight. While planted: no drawing or Evoking. Pull out: 1 AP next to it (the engine lets the Sigilist do it;
    MISSING: an enemy pulling it out). When the form runs out the staff comes back. Grand damage is flat (lava 10
    fire, storm 15 lightning). Harmful forms hit everyone inside but the owner (Earthed); WARD/MEND only allies;
    DREAD/LIGHT's −2/PULL only enemies; SILENCE everyone, the owner too. Per form:
    - FIRE: 10 on entering (once a round) or starting a turn inside, Burning on a failed Body save.
    - FREEZE: each tile inside costs double; a Body save after a move through it, or Prone.
    - SHOCK: 15 at turn start to anyone in Medium armour or heavier (a PC's armour class 2+; an enemy's armour 10+);
      robots, machines, drones and turrets are Stunned (save).
    - STONE: up to 4 half-cover earthwork pillars (crates, 30 HP) on tiles you name (`text`), else around the staff.
    - GALE: entering stops the walk and throws you 2 tiles outward; shots that start, end or pass inside take −5.
    - SPARK: an attack roll of 1-3 by a gun inside jams it.
    - WARD: allies starting a turn inside get Guarded (+2 Defense, 1 round) and a 20 shield (not stacking).
    - MEND: allies starting a turn inside heal 10 × the owner's Healing given.
    - BIND: entering → Pinned (Body save); a Pin stops the walk.
    - BLIND: anyone inside sees 1 tile.
    - SLOW: each tile inside costs double.
    - MUDDLE: a Brain save at turn start or a stagger 1 tile in a random direction.
    - DREAD: enemies inside, a Heart save at turn start or Shaken.
    - VEIL: smoke (blocks sight) and anyone inside is Hidden (no new ambush entry; they stay Hidden after leaving until
      spotted).
    - LIGHT: Hidden enemies inside are revealed; enemies inside −2 to hit.
    - SILENCE: Silenced while inside (it ends when they leave).
    - CONDENSE: everyone inside pulled 1 tile toward the staff at their turn start.
    - SPREAD (Bloom) and TWICE (Echo field): **Narrator** (a fight note): no hook into a spell's area or a repeat.
    - PUSH: shots from outside into it −3.
    - STAY: conditions inside don't tick down.
    - SEEK: allies' attacks on enemies inside ignore half cover.
    - RETURN: an ally inside who would drop to 0 stays at 1, once each.
    - PULL: enemies within 4 tiles of the staff pulled 1 toward it at their turn start.
    Data deltas: structured Grand data per word (trigger, effect, save, numbers) instead of prose; a `grand_staff` item
    (2H, counts as an Evoker); a real `robot` kind on enemies (the engine reads `kind`). Spec fix: "duration bonus
    (table below)" → the Sigil duration bonus. PROVISIONAL.
354. *(K20)* **Empty Hand (Grand Sigilist)** (audit 1-4). Empty hands = an unarmed weapon and nothing in the off hand. Unarmed
    strikes deal at least 20 (max of the weapon's and 20). +2 Defense, on the sheet too (stat `defense`) and kept right
    through a swap. Data fix: `stat_mod unarmed_damage value 20` → `set: 20` (it reads as +20), `when: hands_empty` on
    both effects. ~~OPEN (audit 4): spec item 77 counts a carried Evoker, so an empty-handed Sigilist can still draw.~~ Settled by item 630: a focus counts only in a hand, so an empty-handed Sigilist holds no Evoker and can't draw.
    PROVISIONAL.
355. *(K21)* **Earthed** (audit 1-3). Inside your own Grand form you ignore its harm and hindrance (not SILENCE). Unarmed
    strikes inside an element form (FIRE, FREEZE, SHOCK, SPARK) are Elemental (half armour, as a flat add of half the
    target's armour), with FIRE's Burning on a critical and FREEZE's Slowed on a hit (save). STONE, GALE and the
    effect words add nothing (the Narrator may rule a DREAD fist). PROVISIONAL.
356. *(K22)* **Four Hearts** (audit 1-6). Gauges last the scene. Rage: a running carry (+1 per 20 taken in total). Grief: any
    PC-side unit but the twin (+2 Downed, +5 when a hit kills a Downed one; MISSING: a death from failed death saves
    fires no hook). Fear: only an Elite or Boss the squad can see when the fight starts. Devotion: an ally's heal,
    shield or boon (Guarded, Inspired…). Designs are keyed out of a fight ("Key a design"). The Narrator adds points
    with `traitState {key: 'heartfed_add', value: {rage|grief|fear|devotion: n}}` (added to the scene's gauges at the
    next round or fight, capped at 5; see item 405) or answers "Let it fill a gauge". Data delta: params on the bespoke ops
    (`max: 5`, the per-event amounts). PROVISIONAL.
357. *(K23)* **Fed** (audit 1-3). Cost uses the gauge at Begin (−10% a point, 5 MP at least); power uses the gauge at Release
    (+10% a point on damage, heal and shield; Control and Status get nothing), which empties it, a wild release too.
    PROVISIONAL.
358. *(K24)* **Overflow** (audit 1-3). Automatic, once per scene. It waives only the Begin's Strain (the air's +2 without an
    Emanator too); holding still strains. Begins at stage 2 (a release at once counts as stage 2; held, it shows stage 2
    from your next turn start and grows from there). PROVISIONAL.
359. *(K25)* **Link** (audit 1-4). Any PC-side unit you can see within 6 (the twin and companions too), for the scene or until
    you're Downed; two from Will Power 5; a new link past the limit replaces the oldest; no leash. Story: link to a
    character in the scene (a ruling on whether they're close). Data delta: `max_links {base: 1, will_power_5: 2}`.
    PROVISIONAL.
360. *(K26)* **Through** (audit 1-3). Begin-and-release or Release from a linked ally's place (range and sight from them).
    Mirrors: heals and shields you receive reach every linked ally at half; Guarded and Inspired land on them for half
    the rounds (at least 1), whatever their source. PROVISIONAL.
361. *(K27)* **Share** (audit 1-4). Uses your one reaction a round. Half (rounded down) of what's left after the ally's armour
    and shield, taken by you with no armour or shield of yours. A setting decides (always, the default, or never):
    no off-turn prompt exists. Heals you send through a link ×1.25. A linked ally Downed: +2 Strain (it can short).
    Data delta: `heal_mult {when: target_linked, value: 1.25}` and `resource strain +2 on linked_ally_downed`.
    PROVISIONAL.
362. *(K28)* **Inner Charge** (audit 1-6). Soul cast AP, 20 MP × the air's band (from the air without an Emanator: +2 Strain),
    1 Strain (2 Flooded). Each form grows a stage at your turn start (×1/×1.5/×2/×2.5) and strains 1 each (2 Flooded).
    Iron +10 armour, Surge +15 melee/unarmed, Swift +2 Movement, Steady no Prone or push and +2 Body saves, Heartbeat
    heal 10: each × its stage. Pain to Power +1 AP next turn per 20 taken, at most +2 (no stage). Two forms (three
    from Will Power 5; the third retired, item 550), each once. Damage can slip the newest form (d20 + Will Power vs 10 + damage/10). A failed Mana
    Short ends all forms. Silenced: no new form. Story: take a form before the trouble (20 MP), with a ruling. Data
    delta: the six forms, their numbers, the 2-form cap (item 550) and the Strain as structured data (spec item 75). OPEN: Swift +5
    and Iron +25 at stage 4 are strong (audit 1). PROVISIONAL.
363. *(K29)* **Release** (audit 1-4). The standalone strike is a melee attack roll (1 AP); with the toggle on, any melee hit
    releases for free. +15 Soul per stage, summed, **capped at 8 stages**, × the Soul multiplier, armour ignored. The
    forms end on a miss too. Data fix: the id `release_strike` stays (no clash with the Outburst `release`).
    PROVISIONAL.
364. *(K30)* **Empty Hand (Vessel)** (audit 1-3). Unarmed damage at least 20 (set, not +20). The Vessel can't Begin or Release
    Outbursts (refused at the cost: the engine shows it as "Needs 99 AP" until the hook below exists). Existing designs
    stay but can't be cast. MISSING: refusing `magic/design` for a Vessel. Data fix: `forbid_action outburst` → the
    engine's `combat/outburst`, `combat/release`, `magic/design`. PROVISIONAL.
365. *(K31)* **Manifest** (audit 1-3). Once forever (no re-manifest even after it falls), out of a fight. Three designs from
    known schools/modules, the usual module slots; they don't count against ready designs. Text: `school: mod, mod;
    school; school` or JSON `{portrait, designs}`. A ruling asks the Narrator to describe the moment. Narrator rule (add
    to the prompt): it is only ever "the twin" and never speaks of where it comes from. PROVISIONAL.
366. *(K32)* **Call** (audit 1-6). HP half your **maximum**; your Defense; your Will Power as its attack bonus; Movement 1.5; 4
    AP (6 − 2); it acts right after you. One heart: no Begin by either while the other holds (its casts use your MP
    and Strain, range and sight from it). Guard: 1 AP, it takes the next attack aimed at you while within 1 tile, until
    your next turn. Leash: it can't walk past 6 tiles from you, and follows to the nearest free tile within 6 when you
    move away. It can be healed and shielded; it is never Downed. When you're Downed it fades (no Strain). It takes no
    XP; its kills are its own. Data delta: `summon_twin` params (range 3, movement 1.5, copies Defense and Will
    Power, Guard). On the area map: item 404. PROVISIONAL.
367. *(K33)* **Bond** (audit 1-3). At 0 HP it vanishes, no bots on the meter (it isn't a death). +3 Strain to you (a natural 1
    on the short Downs you). No Call again this scene. PROVISIONAL.

*Waiting on Leon*

368. ~~Daggerfall Veteran's Flashback TN.~~ *Settled (Leon, 7 Nov 2026): TN 12. The trait's text says "Composure check (target 12)" and the `gate_check` carries tn 12 with no provisional flag. Engine: 12 (lane F).*
369. ~~Gun Nut's extra guns.~~ *Settled (Leon, 7 Nov 2026: "the 3 first gun you look/buy/get"): no extra guns at creation. The collection is the first 3 guns the character gets: the kit's gun counts, then loot, gifts, purchases, the Proving Ground's give, in the order they come (the character's `collection`, weapon ids, at most 3; an old save without it takes the first 3 guns it carries: main hand, off hand, then the pack in order). A gun after the third doesn't join; parting with a collection gun doesn't open a place (a reading of "the first 3", PROVISIONAL). Collector's drawback applies to the collection: selling, abandoning, dropping or giving one away needs the Dexterity check (TN 12, still provisional) or the character keeps it until the next rest. That check and the −50% sale price are the Narrator's (the engine has no sell action; the brief names the collection); an engine path that takes a gun out of the pack (the Proving Ground's drop) refuses a collection gun with the Collector's reason. The `min_carry` op lost its `start_fill`; there is no session-start note. Engine: character.ts collectionOf, collectGuns, partError.*
370. ~~Companion numbers disagree.~~ *Settled (Leon, 7 Nov 2026): the drone has 30 HP and the beast 60 HP, as the traits say (enemies.json companions and the traits' `companion` ops agree; HP no longer provisional). The drone keeps its service pistol but has only a plain shot: no aimed shot, burst, full auto, reload, magazine loading, jam clearing, Overwatch or other weapon action, and its ammo is unlimited (it never runs dry, never reloads, takes no Heat and never jams; a natural 1 costs it 1 AP next turn instead). Its other numbers (Defense 12, +3, armour 5, Movement 2) and the beast's stay provisional. Engine: enemies.json companions `actions` and `infinite_ammo` → the unit's `allowedActions` and `infiniteAmmo` (tactics.ts companionUnits).*
371. ~~Heart Overload without an Emanator.~~ *Settled (Leon, 7 Nov 2026): it does nothing. The Pay with HP toggle stays off and isn't offered (no greyed entry); a `pay_hp` sent anyway costs no HP. Engine: perks/d.ts heart_overload.*
372. **Beast Handler's grapple is always on.** Every melee hit of the beast's bite carries the grapple (a Body save or Grappled); there is no attack mod to pick, since the beast's turns (ordered or on instinct) have no attack chips. *Engine: perks/f.ts beast_handler.*
373. **Story conditions coming into a fight.** Only Shaken, Fear, the Brain debuffs, Weakened, Nausea, Bleeding, an injury and an augment offline come in, each for its own combat duration and with no save (they used to come in for 99 rounds). A story Stun, Pin or Blind stays in the story, with a line in the fight's notes. *Engine: game.ts magicIn, STORY_CARRY.*
374. **A partial Extraction.** When some PCs are lifted out and everyone left behind is Downed, dead or surrendered, the fight ends as extracted (no win, no loss). If nobody was lifted, it is a loss. *Engine: combat.ts checkOver.*
375. **Triage out of a fight.** On the area map it is once per ally per scene, counted with the story Triage (it used to reset every area-map round), and never on yourself. *Engine: classes/i.ts medic.triage.*
376. **Adamantile Knight from Defender.** The Defender's Brace grants Bulwark of Will. Guard spent by the Defender's Reactive Plate still shields the adjacent ally (Adamantile Plate). A hit either Interpose took is plated without a second reaction. *Engine: classes/i.ts 'braced' and 'plate_spent' hooks; classes/j.ts.*
377. **Bulwark in the attack preview.** The covered ally's damage chain shows "Bulwark (name)" (×0.75, Tier II ×0.5),
    the best one only. It is shown in the preview alone, because the real cut comes after armour in damage_in. Sigil,
    Soul and Elemental damage from a caster more than 1 tile away is ranged; explosions never are. *Engine: perks/a.ts.*
378. **Breaching Strike on the area map.** The same 3 AP strike against an NPC token next to you starts the fight with *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    the strike (from Sneak, unseen, as an ambush on your turn; in the open, you act from round 2). Too far is refused
    before anything is spent. In the story panel it is a ruling for the Narrator (no AP). PROVISIONAL. *Engine:
    perks/a.ts, game.ts strikeFromWorld.*
379. **Got You in My Sight on the area map.** A token the holder could see (12 tiles and a line) that moves out of
    sight, hides or leaves gives +2 AP on the next overworld round, once a round; Tier II marks its last-seen tile.
    The Narrator moves tokens; the engine checks the sight. PROVISIONAL. *Engine: perks/b.ts 'npc_moved', 'round_ap'.*
380. **Wind on the Skin on the area map.** Range 12 tiles (the default Vision; tokens have no Vision of their own),
    through walls. On arriving in a zone and when an area-map fight opens: Tier I the nearest lurker, Tier II every
    one. A token placed after arrival isn't felt until the next arrival or fight. PROVISIONAL. *Engine: perks/b.ts
    'npc_sense'.*
381. **Skin Map on the area map.** A lurking token within 6 tiles with a line is revealed for the party when placed,
    at each round start and when the holder moves. PROVISIONAL.
382. **Clean Hands out of a fight.** "I spared them" (twice a scene) opens a ruling; if the Narrator accepts it, +2 *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    AP (Tier II +3) on the next overworld round, within the round's AP ceiling. Refused, nothing. PROVISIONAL (the audit's
    recommendation). *Engine: perks/f.ts 'ruling_answered', 'round_ap'.*
383. **Talks Broke Down: the Narrator's `fromTalk`.** Optional boolean on `combat`. False: no effect (an unrelated fight
    in the same scene). True: the scene's last dialogue check counts however many rounds back. Absent: the engine's
    inference (item 188). Replaces the planned `after` enum (H3); it costs nothing on turns that don't start a fight.
384. **Story damage through the engine.** The Narrator's `harm[]` (charId, amount 0-500, type, why) and traps go
    through the damage chokepoint on the area map's throwaway fight, so Soulmate's share, Angel and the other damage
    items apply out of a fight. 0 HP is Downed. PROVISIONAL.
385. **Mirage on the area map** costs 2 overworld AP (the audit's story side); the engine rolls each NPC token's
    Analysis in range (d20 + tier vs 12 + mod(Visualization)) and opens a ruling with who believes it. In the story
    panel (no map) it is free and a ruling only. PROVISIONAL.
386. **Lab Coat II out of a fight.** Neutralising an agent ends it on the party and blocks it landing on anyone in the
    party for the rest of the scene (`scene.labImmune`); the next scene it lands again. Tier I has no neutralise action.
    PROVISIONAL.
387. **Iron Stomach and Nothing Left to Fear between story and fight.** A story Fear carried into a fight lands through
    the immunities: Iron Stomach I caps it at 1 round, II and Nothing Left to Fear cancel it, and an Afraid ally within 3
    tiles who sees a Nothing Left to Fear holder loses it at fight start or its turn start.
388. **Grapple's scene hold on the area map.** Naming an NPC token (its id or name) in the scene hold on the area map is *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
    the token grab: walk up first (too far is refused before anything is spent), 2 AP, and the fight opens with the
    grab as its opening move (the Body save rolls in the fight), as Grapple on the token does. In the story panel (no
    map) it stays a scene condition and a ruling, which now tells the Narrator a hold on someone hostile starts the
    fight. PROVISIONAL. *Engine: perks/a.ts grapple_npc, game.ts strikeFromWorld.*
389. **Silent Partner on the area map.** The stay-hidden roll for the pair is one roll: whichever of the two a hostile
    looks toward first rolls it with the holder's Ingenuity (and notice range uses the holder's Dexterity); a failure
    finds both, a success spares the other its roll against that hostile this round. The partner loses the shared
    stealth when either of you ends a move apart, when the partner attacks without opening a fight (an ally, an
    object), or when the pair is found; it comes back only after a fresh sneak (a normal move first). A partner's
    attack that opens a fight strikes from the shared stealth. PROVISIONAL. *Engine: perks/b.ts silent_partner.*
390. **Verse of War on the area map.** The verse line is this overworld round's Say. "Release in verse" (or a release
    with the "In verse" toggle) at a token opens the fight with the release as its opening move; the round's Say is
    carried into the new fight's notes as each speaker's round-1 line, so the +1 range and ×1.1 hold there and the
    Narrator audits the line in the fight report. A release that touches nobody stays on the area map and the line is a
    pending ruling. PROVISIONAL. *Engine: perks/d.ts, game.ts overworldAttack.*
391. **Twin Discipline on the area map.** A fused cast whose pattern finds an NPC token opens the fight with the cast as
    its opening move (the Evoke AP from the character's AP); otherwise it runs on the area map. PROVISIONAL.
392. **Weapon wear out of a fight.** A strike or shot at an object on the area map wears the weapon 1, as an attack
    action does in a fight (spec: Weapons v2); breaking cover in a fight wears 1 too. The Brightest Light doubles it.
393. **The drone on the area map (Drone Handler).** The drone is a token of its own next to its owner (keyed by its unit
    id in the story's positions), with 3 AP each overworld round (as in a fight), spent only on moves (world/act
    move with `unit`); the owner's AP is untouched. It starts a fight opened on the area map where its token stood and
    stays where it ended after the fight. A destroyed drone leaves the map. What it sees is the Narrator's (the brief
    names its tile). The area map has no fog of war, so its sight adds nothing there. The stat block (enemies.json: 40
    HP, a service pistol) still disagrees with the trait text (30 HP, no attack): item 370, waiting on Leon.
    PROVISIONAL.
394. **Ghost Soldier's prosthetic arm.** With Proficiency 3 it takes up to 2 mods, fitted out of a fight (the audit's
    proposal); what a mod does in the arm is the Narrator's (the brief lists them). An arm injury hits the metal
    (Augment Offline) while the arm is carried. PROVISIONAL.
395. **Field Repair's text.** skills.json's Proficiency 3 unlock now says what the spec says (10% + 5% per Proficiency
    point above 3 of Durability; out of combat 50% per charge), not "10 HP per point" (that number is Factory Made's
    machine body, item 111).
396. **The beast on the area map (Beast Handler).** The beast is a token next to its owner, as the drone is (item 393),
    with its own 4 AP each overworld round (as in a fight), spent only on moves (world/act move with `unit`); the
    owner's AP is untouched and no Empathy order is rolled for a move out of a fight (other orders out of a fight are
    Empathy checks the Narrator calls). It starts a fight opened on the area map where it stood, stays where it ended,
    and leaves the map when it dies. The brief names its tile. PROVISIONAL.
397. **Prey and Interpose (Rabbit's Foot).** A hunter's or an Ork's blow on the holder stays on them: a taunt doesn't pull
    it off (the attack preview ignores the taunt) and an ally's Interpose can't take it (stat `prey_lock`, read by the
    Defender's Interpose). The Raw Power 3 unlock Take the Hit has no handler of its own yet, so it isn't gated.
    PROVISIONAL.
398. **Paper's Elemental damage taken (Oil in My Mind).** The derived penalty (+10% Elemental damage taken) used to be
    lost at Pain Threshold 0, because the reduction was floored at 0. The reduction now keeps the 60% cap but may go
    below 0, which is damage taken extra. Healing received −10% and −2 HP per level were already applied. PROVISIONAL
    (plan 6 Oil in My Mind 1). *Engine: character.ts elementalTakenPct.*
399. **Daggerfall Veteran's shelling on a miss.** A launcher shell that misses still lands at its target's tile, so a
    miss within 3 tiles of the veteran calls the Flashback (once a fight, as before). The engine has no scatter rule
    for a missed shell, and a miss does no splash damage: that is still open. PROVISIONAL. *Engine: perks/f.ts.*
400. **Interpose's critical injury.** A critical's injury from a blow that an Interpose took (the Defender's, or the
    Adamantile Knight's granted Interpose) lands on whoever Interposed, not on the ally (audit problem 3); a Downed or
    dead Interposer takes none. PROVISIONAL. *Engine: classes/i.ts and j.ts, the 'injury' hook.*
401. **Heart Surge and forced movement.** A surged release doubles push and pull distances too (Control push and pull,
    GALE, PULL: the 'forced_move' hook's tiles, read back by the magic shove). PROVISIONAL.
402. **Drink It In's price.** The MP gained is the spell's real price, carried on its damage (`spellMp`, `spellWords`):
    an Outburst's MP cost (modules and the air's band included), 10 per word of a Sigil spell, up to your Max MP. The
    audit's rule, now in the engine. PROVISIONAL.
403. **Quicken on the area map.** The audit proposed combat and overworld rounds. An overworld round is everyone's turn
    at once, so 1 charge gives an ally within 6 +1 AP on this round's AP straight away (the ceiling of 9 holds), once a
    round, not on yourself, not on an ally who has ended the turn. PROVISIONAL (a proposal, not a firm rule).
404. **The twin on the area map (Twinbound's Call).** *Settled (Leon, 7 Nov 2026): the twin stays on the area map until it is let go or a fight starts; it doesn't leave on a scene or zone change (after travel it stands beside you again).* The audit proposed the twin as a token in overworld rounds. Call
    on the area map (2 AP, a free tile within 3): the twin is a token with HP half your maximum and its own 4 AP each
    overworld round, spent only on moves (world/act move with its unit id); your AP is untouched. It stays within 6
    tiles of you (it follows when you walk away). "Let the twin go" (0 AP) sends it back. A fight opened on the area
    map starts with it beside you as the called twin (right after you in the order, its HP carried in); in the story
    its presence is narration. The token, its 4 AP and its leash stay PROVISIONAL; that it stays is settled. *Engine: classes/k.ts, game.ts
    COMPANION_ROUND_AP, enemies.json companions.twin (stand-in numbers the engine replaces).*
405. **Four Hearts' story points.** The Narrator writes `traitState heartfed_add {rage|grief|fear|devotion: n}` (in
    answer to "Let it fill a gauge" or on its own): the points are added to the scene's gauges at the next round or
    fight, capped at 5 (Overflow can trigger). A `heartfed` object written without a scene (the old instruction) adds
    the same way instead of resetting the gauges. PROVISIONAL. *Engine: classes/k.ts gauges().*

*OOC, missions and end states (8 Nov 2026)*

406. **OOC limits.** The Narrator's OOC answer is at most about 80 words (the engine keeps 600 characters); at most 8 OOC questions wait at once, older ones drop. PROVISIONAL.
407. **OOC never calls the Narrator by itself.** A question makes the round's close call the Narrator; a question asked mid-call waits for the next turn. Alternative: an immediate small call when the whole room is idle. PROVISIONAL.
408. **A failed required objective closes its mission** as over; the end state and next mission fire either way (M813's ramp branches on it: left behind leads to The Years). PROVISIONAL.
409. **Mission update caps.** 12 mission updates and 12 side-job changes per Narrator turn; 24 side jobs in a campaign. PROVISIONAL.
410. **The campaign end drops open checks and pushes** for the epilogue turn. PROVISIONAL.
411. **Branches are the Narrator's choice** (missionNext). A player vote between branches is not built. PROVISIONAL.

*Proving Ground multiplayer (Nov 2026)*

412. **Wave scaling by party size.** With friends the wave budget and the soldier and elite caps take × (0.6 + 0.4 × players with a fighter); the unit cap stays 8 (the map seats 9). One player: × 1. *Engine: game.ts sandboxWave, sandboxScale.* PROVISIONAL.
413. **Downed is out in a team fight.** Both teams: a Downed fighter is out at once (no death saves, no stims), so Team A (on the fight's PC side) and Team B (on its foe side, where 0 HP is already out) are alike. *Engine: game.ts sandboxAfter.* PROVISIONAL.
414. **Team B's side-bound rules.** Team B fights from the engine's foe side, so the few rules still written for the PC side don't reach it yet: Analyze (only foes can be analyzed), Weak Point (only PC attackers) and spotting traps while moving; several perk and trait handlers that check the PC side also skip Team B (a would-drop-to-0 save in Lane A, two Lane G story-side checks, Still Water's foe-attacker test and one more in Lane F, one in Lane H); perk combat_start handlers run before Team B is seated on the foe side; and a Team B player at 0 HP goes through the foe kill path ("Downed is out"). Stims follow the stimmer's own side. Fix when team fights are played for real. *Engine: combat.ts analyze, previewAttack, moveUnit.* PROVISIONAL.

*Sigil magic, rules revision 1.4 (7 Nov 2026; decision 98). All PROVISIONAL until playtests (Leon, answer 6). Items 27, 68, 69, 70 and 77 are superseded where they name Stacks, Rings, RETURN, Line range by length, 2 glyphs a tile or drawing on a next tile; the class, perk and trait items that read those (Payload, Stored Spell, Half-Sigil, Keystone, Fusion, Sword Form and others) are re-read under 1.4 in `docs/design/sigil-1.4-impact.md`.*

415. **The word list:** 40 words (25 Subjects: 7 Elements, 7 Afflictions, 5 Boons, 6 Workings; 4 Reach; 7 Delivery; 3 Burst; 1 Filter) and every charge in sigils.json. The 9 new Subjects' numbers: ACID 15 + Corroded (5 a turn, Defense −2, 3 rounds), COMMAND's 3 charge and its four orders (move up to 3 tiles), QUICKEN +2 AP, SHARPEN +3 to hit and ×1.25, CLEANSE one condition, STEP 4 tiles, RAISE 30 HP a tile for 3 rounds, NULL's list, MASK 2 rounds. PROVISIONAL.
416. **Reach numbers:** SEEK 8 (+4 a copy), ARC 6 ×0.8 (+3), SENSE 8 ×0.6 (+4), RELAY an ally within 8 (+1 ally a copy); the range bonus once, never on Touch; Touch 1 tile deep. ARC needs sight of its landing tile and SENSE needs none (the proposal only said SENSE reaches a target you can't see). PROVISIONAL.
417. **Delivery numbers:** STAY for 2 rounds (+2), ×1 the first time it affects a creature and ×0.5 after, TWICE 2 missiles (+1) and +1 Flux a glyph, PULL 3 tiles (+3), WAIT 3 rounds and 1 trigger (+1), WATCH ×0.5 for 2 rounds (+2), 10 HP and Defense 10, CHAIN 1 jump (+1) within 3 at ×0.75, LEECH 50% (+25%); 2 traps and 1 turret per caster. PROVISIONAL.
418. **Repeats** (Leon): any word may repeat except KIN and a second, different Reach word; every repeated glyph multiplies the spell's direct damage, healing and shields by ×0.9 (FIRE · CONDENSE ×3: 61). **Pushback:** repeated Subjects sum before the Burst, so FIRE · FIRE · FIRE · CONDENSE is 109 at Touch (raw 135), well past the old ceiling of 75 and above a fresh character's 100 HP. It costs 11 charge (more than one standard core, so a core swap between draws) and two turns of walking, which may be enough of a brake; if it plays too hot, the suggested fix is ×0.75 for each repeated Subject (FIRE ×3 · CONDENSE → 76). PROVISIONAL.
419. **A Subject alone is not a spell.** The proposal's examples cast STEP and MASK alone "on yourself", but its grammar asks for a Subject and another word and a Line is 2–4 glyphs, so self-casts take a second word (CONDENSE, 1 charge: Blink is STEP · CONDENSE). Alternative: let a lone Subject glyph on your own tile be a spell. PROVISIONAL.
420. **Burst numbers:** CONDENSE ×1.5 (+0.5), SPREAD radius 2 ×0.6 (+1 radius, −0.1), PUSH a 3-tile cone ×0.7 (+2 length, −0.1), using the full-auto cone's shape; SPREAD + PUSH hits anyone in both once, at the better multiplier. PROVISIONAL.
421. **The facing rule's details:** "beyond the line" means further along the Line's axis than the end you're next to; the along band is centred on the Line's axis with the extra lane on the right of the firing direction for even lengths; for a diagonal Line the across step is the orthogonal step away from you (the north or south one when both lead away) and the along lanes sit side by side one step east or west apart, so no band has gaps. A SEEK bolt leaves from the far-end glyph (along) or the glyph in the target's lane (across). PROVISIONAL.
422. **STAY: one strike, then the field** (settled, Leon, 8 Nov 2026: "Stay should deal one instance of dmg when placed, one full dmg when someone step in, half if they are already affected by that stay before."). Evoked, a STAY spell first strikes as the same spell would without STAY (one instance at full: its roll, saves and multipliers on the creatures in its area), then leaves the field on those tiles. The field takes a creature that enters it or starts a turn in it at full (×1) if this field hasn't affected it yet, and at ×0.5 if it has (hit by its strike, or bitten before); still at most once per creature per round, and the strike counts as that round's bite. A trap with STAY: its springing is the strike, then the field. KIN, Boons and PULL (the whirlpool) act in the strike and in each bite alike. *Engine: sigil.ts evoke / place / placeField (zone.ever) / fieldBite / springTrap.*
423. **Turrets:** cast at the start of the caster's turns at the nearest creature in reach (ties: the lowest HP, then the engine's order), with the caster's numbers at that moment, for no charge; they don't block movement; Scuff or any hit destroys one at 10 HP. Traps and hidden turrets are spotted like hidden traps. PROVISIONAL.
424. **CHAIN:** the next creature within 3 tiles of the last one hit and no closer to the caster (or turret); nearest first, ties the engine's order; it skips the Downed and surrendered. PROVISIONAL.
425. **LEECH** heals from the spell's direct damage after armour, in all, not × Healing given and not from conditions it sets. PROVISIONAL.
426. **KIN** is 2 charge and one copy. PROVISIONAL.
427. **Cover against Sigils:** a SEEK bolt takes cover like a shot (−5 for half cover, SHOCK ignores it; full cover stops it); Touch, ARC and SENSE ignore cover. PROVISIONAL.
428. **The strongest words' limits** (Leon): COMMAND as written (Brain save, one order); QUICKEN at most once per target per round and never on yourself; RAISE only on empty tiles (no creature, object, glyph or placed magic), 30 HP a tile, one RAISE working per caster. Whether the Scribe's Quicken class move (+1 AP) counts toward QUICKEN's once a round is OPEN; until settled they're separate. PROVISIONAL.
429. **COMMAND's save is Brain** (the word's rule), though Commanded sits in the Heart family in conditions.json for CLEANSE and debuff strength; the engine's order menu gains *move up to 3 tiles* (never into a known harm). PROVISIONAL.
430. **NULL's reach:** glyphs of every side, fields, traps (hidden ones too), turrets, and VEIL smoke, LIGHT and RAISE walls; never Keystones, Grand forms or class zones (Seal, Sanctuary). PROVISIONAL.
431. **STEP isn't movement:** no Overwatch, no difficult ground, no traps on the way (landing on one sets it off); with a Burst everyone shifts by the same offset and anyone whose new tile isn't free stays. PROVISIONAL.
432. **MASK** lasts 2 rounds flat (no duration bonus), ends on an attack, and fizzles on a Marked target. PROVISIONAL.
433. **Corroded:** 5 damage at turn start, Defense −2, 3 rounds, a Body save at the end of each of the bearer's turns ends it early (against 12 + the caster's Body debuff strength). PROVISIONAL.
434. **Quickened and Sharpened** are helpful states: Quickened is used at the bearer's next turn start; Sharpened lasts until the next attack or the end of the bearer's next turn and doesn't stack. PROVISIONAL.
435. **Workings with a Burst:** VEIL and LIGHT cover their own radius or the Burst's, whichever is larger; RAISE and NULL cover exactly the Burst's tiles. PROVISIONAL.
436. **Groups and shapes:** glyphs of one side that touch (diagonals too) are one group; a group that isn't a single straight row of 2–4 is no shape. An enemy glyph next to your Line doesn't break it. PROVISIONAL.
437. **The 4-glyph cap holds over every bonus** (Brain Power's Overclock, Overcharge, Three-Cut Script). PROVISIONAL.
438. **Starting magic** (Leon): 2 words making a spell, one of them a Reach word; the default is SPARK · SEEK (replacing SPARK · CONDENSE; old characters whose two starting words hold no Reach word swap their non-Subject word for SEEK when loaded). PROVISIONAL.
439. **Enemy casters** (Leon: build it): enemies with an Evoker use the 40 words; tier default words in sigils.json `enemy_ai` (minion SPARK · SEEK; soldier FIRE, SEEK, SPREAD, BIND; elite SHOCK, SEEK, CHAIN, WARD, KIN, BIND; boss nine words); they avoid hitting their own side, hold a spell that would hit more allies than enemies, and NULL or scuff the player magic they have spotted. PROVISIONAL.
440. **Friendly fire** (Leon): bursts, cones, fields, chains, turrets and a bolt's path hit allies; KIN keeps your side out. Settled.
441. **Old saves:** 1.2 glyphs are dropped when a 1.2 fight loads (their charge isn't refunded), 1.2 zones of kind wall become STAY fields where they can, others are dropped; the word RETURN is removed from known words and replaced by one free word of the player's choice at the next rest. PROVISIONAL.
442. **Element identities** (Leon): each element has one look and sound (the table in Mana), drawn in the Sigil frame now and reusable in the Soul frame when Outbursts gain elements. The hues are effect colours only. PROVISIONAL.
443. **Glyphs on the ground** stays Max Sigil words (+ Hold the Stroke) and keeps growing above Intelligence 5. PROVISIONAL.
444. **Evoking from the side** needs you next to a glyph; standing on a middle glyph is refused, but standing beside one from the side fires across. PROVISIONAL.
445. **RELAY's area** is the relaying ally's tile and the tiles next to it, all around; each extra copy passes through one more ally within 8 of the last, in its sight. PROVISIONAL.
446. **Harmful effects skip the Downed and the surrendered;** Boons reach them. PROVISIONAL.
447. **A refused glyph costs nothing:** a second different Reach word, a second KIN, WATCH with STAY, or a glyph past your cap is refused before any AP, charge or Flux is spent. PROVISIONAL.
448. **Payload under 1.4:** doubles a SPREAD radius or a PUSH cone's length, or adds one target to a single-target spell (as TWICE does); a STAY, WAIT or WATCH spell can't carry it. PROVISIONAL.
449. **Grand forms** stay for the 23 old words that remain (RETURN's Sanctuary is gone); the new words (17, not 16) have provisional forms in item 468. OPEN: Leon to rewrite them or leave them out. *Settled by items 582–583.*
450. **Visualization's Paint the Field (Mastery 2)** (was: pick line, cone or circle for free) becomes: once per Evoke, add SPREAD or PUSH to a spell that has no Burst, free (no glyph, no charge, not counted toward 4). PROVISIONAL.
451. **Brain Power's Overclock (Mastery 1)** (a spell one word longer than Max Sigil words, +2 charge) never passes 4 glyphs, so it does nothing from Intelligence 5. PROVISIONAL.
452. **Two-glyph hook:** only the Stroke Gambler's half-glyphs hold it so far (item 464): a tile with one half-glyph takes a second half-glyph, making a Stack (area all around out to the range). No perk, trait or skill gives it to ordinary glyphs. OPEN: whether any other item gets it. *Answered by item 586 (nobody else yet).*
453. **Enemy casters' numbers** (engine, rules 1.4): an enemy with an Evoker (a fight's foe given `sigils`) has Max Sigil words by tier (minion 2, soldier 3, elite and boss 4; sigils.json `enemy_ai.max_words`), Brain Power equal to its tier's attack bonus, a full standard core and 2 spare cores, Glyph AP 1, no range or duration bonus, and its tier's saves and debuff strength. Its AI decides once a turn, only on spells it can draw, walk and Evoke this turn (drawing away from the target and firing back), and casts when the spell's expected value per AP is at least its weapon's. *Engine: sigil.ts enemyMagic, enemyCast.* PROVISIONAL.
454. **Fields hit without a roll** (as 1.2 walls did): a STAY field's damage lands automatically at its multipliers; its Afflictions still call for their saves. Evoked strikes, traps and turrets roll Brain Power (the owner's) against Defense. *Engine: sigil.ts fieldBite.* PROVISIONAL.
455. **Repeated Boons and Workings:** CLEANSE ends one condition per copy (newest first); WARD and MEND copies sum (×0.9 per repeat); other Workings and riders apply once. In a STAY field's bites (after its strike, item 422), only Elements, Afflictions, Boons and MASK act on whoever it catches; VEIL, LIGHT, RAISE, NULL and STEP in a field spell do nothing (the field is the spell). *Engine: sigil.ts.* PROVISIONAL.
456. **Rounding:** a spell's direct damage, healing and shields are rounded to the nearest whole number after every multiplier (FIRE · CONDENSE ×3: 60.75 → 61), then armour. PROVISIONAL.
457. **A trap that goes off mid-walk ends the walk there**, and so does a field that moves you (a whirlpool). Traps and turrets don't act on the area map (no fight is running); fields bite the squad at the overworld round's start. *Engine: combat.ts moveUnit, sigil.ts sigilEnter.* PROVISIONAL.
458. **Turret reach:** a WATCH turret uses its spell's Reach from its own tile (Touch: 1 tile all around; SEEK needs sight and is blocked like a bolt; ARC needs sight; SENSE none); with RELAY it reaches as Touch. A hit destroys it: a weapon attack at its tile (the weapon's attack AP, d20 + attack against Defense 10; *engine: combat/strike-turret*). PROVISIONAL.
459. **Old saves (engine detail of item 441):** a 1.2 RETURN that was one of exactly two starting words becomes SEEK (item 438's swap); otherwise it is removed and owed back as one free word at the next rest (`sigilFree`). PROVISIONAL.
460. **Parallel Thought under 1.4:** "still active" is one of your fields (STAY), traps (WAIT) or turrets (WATCH) standing; your unfired glyphs, VEIL smoke, LIGHT, RAISE walls and an ally's placed spells don't count. The discount (1 / 2 AP, once a turn) covers glyphs first, then the Evoke, and ends with any Evoke (a fused cast included) once some of it was used. PROVISIONAL. *Engine: perks/d.ts.*
461. **Clean Draw under 1.4:** a Sigil of any length is at most 4 glyphs. A glyph is clean only if it lands (a draw refused by Rigid, a second Reach word or the cap records nothing). An Evoke made only of clean glyphs costs no charge; any Evoke or fused cast that uses a clean glyph spends Clean Draw; if every clean glyph fades, is scuffed or is NULLed first, it is spent too. PROVISIONAL. *Engine: perks/d.ts (glyph_drawn, evoked).*
462. **Twin Discipline under 1.4:** the fused Line covers whom its Evoke would (Reach, facing, Burst, TWICE's missiles, CHAIN's jumps, friendly fire, KIN); each creature covered takes the held Outburst once, released at it (Ether implied; Rain, Size, Random, Move ignored), at the Sigil's multiplier for that creature capped at ×1, so a Burst's edge or a chain jump weakens it and CONDENSE or repeats never grow it. The Sigil's Subjects, PULL, STEP and LEECH don't fire; STAY, WAIT and WATCH Lines can't be fused. PROVISIONAL. *Engine: perks/d.ts.*
463. **Hold the Stroke under 1.4:** the engine asks the `ground_cap` hook how many of your glyphs stand (Max Sigil words + 1 / + 2), so the extra glyphs are ordinary glyphs (the 1.3 "#pool" tags are cleared at your next draw). PROVISIONAL. *Engine: sigil.ts groundCap, perks/d.ts.*
464. **Half-Sigil under 1.4** (lane classes-k): a half-glyph goes on your own tile only (1 AP, 1 charge, +1 Flux). The Stroke Gambler's half-glyphs are the first holder of the two-glyph hook (item 452): a tile holding one half-glyph of yours, and nothing else, takes a second half-glyph (a Stack, area all around out to the range); no ordinary glyph goes on a half-glyph or a half-glyph on an ordinary one. The second half on a tile is drawn from the words that complete the grammar (a Subject with a non-Subject, and back). The random word is drawn only from words the draw wouldn't refuse (a second Reach word, a second KIN, WATCH with STAY, past your cap); with none left, Half-Sigil is refused and costs nothing. Half-glyphs make Lines like any glyph and count toward your glyphs on the ground. *Engine: classes/k.ts.* PROVISIONAL.
465. **Stitch under 1.4:** a Line or Stack of only half-glyphs is Evoked by the 1.4 rules (where you stand, the facing rule, the aim) and only through Stitch; the gamble (1-5 backlash, 6-15 holds, 16-20 double damage) is rolled after the Evoke is checked, so a refused Evoke rolls nothing. Words that make no spell fizzle: the strokes fade, no AP or roll (the Flux was paid on drawing). **The backlash** goes off on the victim's tile as Touch at full strength with no roll: its Subjects, Burst and CHAIN as written (friendly fire); KIN spares no one (the spell has turned on its maker), STAY, WAIT and WATCH go off once instead of standing, and its Reach word adds nothing. The Evoke's AP and charge are spent. *Engine: classes/k.ts (sigil.ts castAt).* PROVISIONAL.
466. **Fusion under 1.4:** the Line holds only non-Subject words (Reach, Delivery, Burst, Filter) and the Outburst stands in the Subject's place: it counts toward the 4 words of a spell (so a Fusion Line is 3 glyphs at most) but not toward Max Sigil words or the charge. The Evoke plan delivers it as it would a Sigil Subject (where you stand, the facing rule, the Reach word's area and ×0.8 / ×0.6, the Burst's tiles and multipliers, TWICE's missiles, CHAIN's jumps, friendly fire, KIN); each creature it covers takes the Outburst's school at its multiplier there; PULL drags them toward you afterwards; LEECH heals you half the Outburst damage dealt to the other side. STAY, WAIT and WATCH are refused (no standing Outbursts). A buff design is planned as a Boon (allies its natural picks), any other as an Affliction. Costs are unchanged (the Evoke's AP and charge, the Outburst's AP, MP and Strain, +1 Strain, +2 Flux). *Engine: classes/k.ts; sigil.ts planEvoke `opts.subject` (additive).* PROVISIONAL.
467. **Glyph Mason under 1.4:** the Keystone is cut on your own tile, on a tile that holds no glyph, and the draw's refusals hold (a second Reach word, a second KIN, WATCH with STAY, past 4 glyphs or Max Sigil words in the Line it joins), checked before the core is spent. It counts as a glyph of its Line (or Stack) and is never wiped by NULL (item 430). **Survey:** you and your allies Evoke a Line holding your Keystone from up to 2 tiles of any of its glyphs, with sight of one; the facing rule reads from where you stand (beyond an end: along; beside the Line: across, away from you; a middle glyph still refused); the plain Evoke reaches it (the `evoke_reach` hook), and the Survey action is the explicit form. **Foundation:** the 0-AP draws are the ordinary Draw on your own tile within 2 tiles of the Keystone (the `glyph_cost` hook now carries the tile), so it prices the steps of a Line walked around the Keystone. *Engine: classes/k.ts.* PROVISIONAL.
468. **Grand forms for the words new in 1.4** (lane classes-k; closes item 449's "none yet"). The count is **17**, not 16: the 9 new Subjects, ARC, SENSE, RELAY, WAIT, WATCH, CHAIN, LEECH and KIN (24 old words − RETURN = 23, + 17 = 40). Same frame as the 23 old forms (radius 2 round the staff, 3 rounds + duration bonus, flat numbers, the Earthed owner unharmed): ACID *Corroding mire* (5 acid on entering, once a round, or starting a turn inside; Corroded on a failed Body save) · COMMAND *Court* (enemies starting a turn inside: Brain save or kneel, Prone) · QUICKEN *Quickstep* (allies, not you, starting a turn inside +1 AP, ceiling 9) · SHARPEN *Whetstone* (allies attacking from inside +2 to hit) · CLEANSE *Clear water* (allies starting a turn inside lose their newest harmful condition) · STEP *Fold* (for allies, each tile of a move inside counts as half a tile) · RAISE *Bastion* (shots from outside at allies inside −5, as half cover) · NULL *Clean ground* (placed Sigil magic inside wiped when it goes up and at each round start, never Keystones; no glyph drawn inside, yours included) · MASK *Shroud* (allies starting a turn inside are Hidden) · ARC *Plunging fire* (allies' shots from inside ignore half cover) · SENSE *Second sight* (Hidden enemies within 4 tiles of the staff revealed at each turn start) · RELAY *Switchboard* (an ally inside Evokes a pattern lying inside from anywhere inside: reach 4) · WAIT *Tripwire* (the first time each round an enemy enters: 10 Sigil damage, its walk stops) · WATCH *Sentinel* (at the start of each of your turns, 10 Sigil damage to the nearest enemy inside) · CHAIN *Conductor* (your side hurts an enemy inside: 5 lightning arcs to the nearest other enemy inside within 3, once a round for each enemy it reaches; an arc doesn't arc) · LEECH *Bloodwell* (enemies starting a turn inside lose 5, Sigil, and you heal what they lose) · KIN *Sanctum* (allies inside take no damage from your side's spells and attacks; hazards still hurt). Earthed: ACID joins the element words (Elemental fists, Corroded on a hit, Body save). OPEN: Leon to rewrite any of them; the old 23 keep their 1.2 texts even where the word's 1.4 meaning moved. *Engine: classes/k.ts; data: sigils.json `grand` (`grand_provisional: true` on the 17).* PROVISIONAL. *Superseded by items 582–584.*
469. **Enemy Sigil casters: the AI and the caster archetypes** (lane ai, rules 1.4; Leon's answer 8). **Casters:** enemies.json `casters` lists four archetypes a fight's foe may name by `caster` (a campaign NPC or encounter enemy too, same tier only): *Sigil novice* (minion, knife; SPARK, SEEK, MEND), *Sigil adept* (soldier, knife; FIRE, SPARK, SEEK, ARC, SPREAD, KIN, BIND, SLOW, MEND, STEP) *Sigil warden* (elite, sabre; SHOCK, FREEZE, SEEK, ARC, CHAIN, SPREAD, CONDENSE, KIN, WARD, MEND, SLOW, STEP, NULL, WAIT) and *Sigil magister* (boss, item 491); each has its tier's stat block, its tier's Max Sigil words (item 453) and a spell bias (×1.3, the warden ×1.25) on the worth of its spells against its weapon. The Proving Ground's waves carry them: wave 2 and every third wave after it the first drill drone is a Sigil novice; from wave 3, on odd waves, the first sparring trooper is a Sigil adept; from wave 6, on even waves, the first range warden is a Sigil warden; from wave 10, on every champion wave, the first Proving champion is a Sigil magister (same tier, same points). **How a caster chooses** (once a turn, before its weapon): every spell it can finish this turn, a Line it stands by (its own or a player's it can read) or a new Line drawn from its own tile and walked away from the aim (or the two directions beside), planned by the engine's own Evoke planner; for each spell length (2, 3 or 4 glyphs: item 491), at most the 4 strongest spells of each Reach word that do harm (and, for each Affliction it knows, its strongest spell with that word: item 490), 2 Boons and 2 of each other kind are weighed. Worth: expected damage after armour and the roll (capped at the target's HP, +10 for a likely kill) plus each condition's worth × the target's chance to fail its save (BIND, SLOW or FREEZE 22 on a player charging in with a melee weapon, else 9; BLIND 16 on a shooter; SILENCE 20 on a caster; COMMAND by the order it gives (item 490); others 9); healing up to the HP missing (×1.3 under half HP); a shield ×0.7 on a hurt, threatened ally (×0.35 unhurt, ×0.1 with no player within 8); QUICKEN or SHARPEN 7 on a threatened ally; CLEANSE 9; NULL by what it unmakes (a player turret 16, field 12, trap 10 once spotted, RAISE wall 8, glyph 3, +8 near its side; its own side's magic counts against); a blink out of melee (STEP on itself, landing out of every player's reach, off known danger, in sight of a player if it shoots) 10 + 5 per adjacent player, +10 under half HP, +6 if it shoots; a field ×1.1 its bite on the players standing in it; a trap ×0.45 its damage on a tile 1 to 2 from a player on the way toward its side; a turret its bite × its rounds (at most 2) × missiles when a player is in its reach. Its own side caught counts ×1.5 against; a spell that harms at least as many of its own side as of the other is held. Opportunity attacks its walk would draw count 10 each against (a blink's Line is walked sideways, in the adjacent player's reach). It casts the spell with the best spell worth + weapon worth per AP × the AP left, if its worth is over 4 and at least the weapon's worth per AP × the spell's AP; a vent first when the glyphs would push Flux past 6 (never an overload), a core swap first when the charge is short. It never targets a Hidden player and never knows a player trap it hasn't spotted. **Every enemy** (caster or not): steps out of a player field it stands in (to the nearest safe tile, at most 2 AP, staying in reach of whoever it fights), scuffs a player turret it stands on, adds to each move's score the risk of the walk (a player field: 10 + 3 × its estimated bite; a spotted player trap: 150; +200 when the bite would kill it), and, with no player in reach, strikes a visible player turret that has its side in reach, or breaks a player RAISE wall that blocks its only way closer. All numbers PROVISIONAL. *Engine: ai-sigil.ts (armFoe, aiSigilStep, aiSigilCast, aiAvoid, aiClearBlock, aiRouteRisk); combat.ts enemyTurn; game.ts sandboxWave; data: enemies.json `casters`.*
470. **Payload with both Bursts** (lane classes-i): a spell with both SPREAD and PUSH has both doubled (radius 2 → 4, cone 3 → 6); CONDENSE counts as one target, so a CONDENSE spell gets the extra missile, aimed at the nearest other target of the right kind in its area (an ally for a Boon, else an enemy), as TWICE's unpicked missiles are. With no aim given, Payload aims by the spell's kind: a spell that harms (an Element or Affliction among its Subjects) goes to the nearest enemy in the area (none there: refused, nothing spent); a Boon or a Working goes on your own tile (the self-target rule, section 3), or with PUSH (which can't face from your own tile) the nearest ally in the area. *Engine: classes/i.ts payloadAim, withPayload (the `spell_shape` hook).* PROVISIONAL.
471. **Overcharge under 1.4:** its +1 Max Sigil words lasts from arming until the free glyph leaves the ground (Evoked, faded, scuffed or NULLed); the 4-glyph cap still holds. *Engine: classes/i.ts.* PROVISIONAL.
472. **Stored Spell under 1.4:** it stores words only (no shape). Triggered, it goes off from the Scribe's tile with its own Reach, all around (a Stack's area: Touch reaches the next tiles, SEEK 8), using the Scribe's live numbers; it needs the Scribe's Evoker ready and costs no firing charge (paid when written) and 1 AP. STAY, WAIT and WATCH are refused, when it is written and when it is triggered (what stays would outlive the object; item 290's STAY refusal, widened to the 1.4 words). A 1.2 stored spell fires with its shape ignored and RETURN read as SEEK; one that no longer makes a spell crumbles when triggered (one holding STAY, WAIT or WATCH too). Only the Scribe can trigger it. *Engine: classes/i.ts withStored.* PROVISIONAL.
473. **Rewrite's new flips:** Quickened becomes Dazed; Sharpened becomes −3 to hit and ×0.8 damage on the next weapon attack (until that attack or 2 rounds). Seal and Rewrite keep 8 tiles (+ the range bonus) as their own reach. *Engine: classes/i.ts.* PROVISIONAL.
474. **Edge Sigil under 1.4** (lane classes-j): every element but STONE counts, ACID included (15); no riders ride the blade (ACID doesn't Corrode, GALE doesn't shove). *Engine: classes/j.ts.* PROVISIONAL.
475. **Inscribed Rounds under 1.4:** Elements and Afflictions only. Only FREEZE's Slowed and ACID's Corroded ride a bullet (ACID deals 7); FIRE's Burning still needs a critical spell, GALE's shove a spell; COMMAND's order is halt. A round inscribed with a word no longer allowed fires as a plain round. *Engine: classes/j.ts.* PROVISIONAL.
476. **Deploy Cover under 1.4:** a STAY glyph of your side on a tile next to the barricade (or on it, as in 1.2 saves) makes it full cover; an enemy's STAY glyph does nothing for it. *Engine: classes/j.ts.* PROVISIONAL.
477. **Three-Cut Script under 1.4:** the cuts leave no glyphs; each pays its word's charge and Flux, checked against the 1.4 grammar before anything is spent. After the third cut the words go off as Touch on the last target (Reach words ignored; Bursts, Delivery, repeats ×0.9 and friendly fire apply). TWICE's other missiles (it is paid for like any word) go to the other creatures you cut, in the order you cut them, then to the nearest creature of the right kind (an ally for a Boon, else an enemy) within 1 tile of the last target; with none there, a missile is lost and its price stays paid. PROVISIONAL (the 1 tile). If the last target falls before the spell, the Evoke charge is spent and nothing goes off. *Engine: classes/j.ts (sigil.ts castAt).* PROVISIONAL.
478. **Spell Magazine under 1.4:** stores words only, checked against the grammar and Max Sigil words; on its first hit the spell goes off as Touch on the target with no roll. Its Burst centres on the target; PUSH's cone and PULL measure from the shooter; WAIT, STAY and WATCH place on the target's tile. TWICE's other missiles go to the nearest creature of the right kind (an ally for a Boon, else an enemy) within 1 tile of the target, with no roll; with none there, a missile is lost (its charge stays paid). PROVISIONAL (the 1 tile). *Engine: classes/j.ts.* PROVISIONAL.
479. **Spells cast through a class move** (Three-Cut Script, Spell Magazine, the Stitch backlash, fused casts) don't fire the `evoked` hook (they resolve through sigil.ts castAt, not an Evoke), so items that react to an Evoke (Overcharge's and Deploy Cover's syncs, Parallel Thought's discount) don't react to them. **Stored Spell is the exception:** its trigger is a real Evoke from the Scribe's tile, so it fires `evoked` like any Evoke. Items that react to a spell's roll (`spell_roll`: Inspire's +2 when Encouraged) do apply where the class move rolls: Three-Cut Script rolls its spell, so Inspire counts there; Spell Magazine's spell hits with no roll, so it doesn't. OPEN: whether class-move casts should fire `evoked`. *Engine: sigil.ts castAt, evokeInner; classes/i.ts withStored.*
480. **Sigil previews and KIN aims (completeness batch 1).** (a) **KIN aims:** a spell with KIN refuses an aim at a tile where you or an ally stands, other than your own tile (spec: Filter); TWICE's unpicked missiles under KIN go to enemies, Boons included. (b) **LEECH preview:** the heal shown is half (+25% a copy) of the direct damage after armour the Evoke would deal if every roll hits, each hit capped at what its target has left (HP and shield), rounded down; beside it, what that restores under the caster's max HP, and the heal weighted by each hit's chance. (c) **Turret reach:** a turret fires into the tiles within its range (its Reach word's range + the owner's range bonus; with no Reach word or RELAY, 1 tile) in its sight (SENSE: no sight needed); its next targets are worked out from where everyone stands now. (d) **COMMAND · move:** the tiles shown are those the target could walk to in 3 tiles (the same walk its turn checks). (e) **QUICKEN** lasts until the target's next turn starts and logs no rounds. (f) **Healing post** heals 13 a round (item 456's rounding; the proposal's 12 was before the rounding rule). PROVISIONAL.
481. **COMMAND · move, checked** (completeness batch 2). The tile is checked when the spell is planned and Evoked: a move order needs a tile the target could walk to in 3 tiles (the same walk as item 480 d); none, or one out of reach, is refused before anything is spent. The preview draws the walk and the tile it would stop on. On the target's turn the walk is checked again (the ground may have changed): too far, no way through, or prone, it stays where it is and the log says why. PROVISIONAL.
482. **Brain Power · Overclock in the engine** (Mastery 1, 3 points; skill unlocks are now runtime items, key `skill:<skill>.<points>`). An action (0 AP, at will) arms it: while armed, and then while the next glyph you draw stands, your Max Sigil words is +1 (the 4-glyph cap holds, item 437), and that glyph costs **+2 charge**. Refused once your Max Sigil words is already 4 (item 451). It stacks with the Mage's Overcharge up to the cap. PROVISIONAL.
483. **Brain Power · Twin Draw** (Mastery 2, 5 points; 1.4 reading of "draw two spells with one action, pay the longer's AP"). **Once per combat**, an action (0 AP) starts it: the first glyph you draw afterwards starts spell A; a glyph that touches one of A's glyphs (diagonals too) joins A; any other glyph is spell B. **B's glyphs cost no Glyph AP while B has fewer glyphs than A**, so the two spells cost the Glyph AP of the longer only. Charge, Flux and steps are paid as usual. It ends when B is as long as A, or with the fight. Combat only. PROVISIONAL.
484. **Rumination · Proven Formula** (Mastery 2, 5 points). A Line whose words, in the order they were written, match a spell you Evoked earlier in this combat (on the area map: this scene) costs **1 AP less to Evoke** (never below 0). It applies to the Evoke's AP only, not to Glyph AP. PROVISIONAL. *(Rules 1.13: superseded in part or whole by "The perk, unlock and trait pass" and items 973 to 990.)*
485. **Paint the Field in the engine** (Mastery 2, 5 points; item 450). The Evoke carries the choice (SPREAD or PUSH); a spell that already has a Burst ignores it. The free word shapes the spell before it is aimed, before the Mage's Payload (which then doubles it). It is no glyph, so it adds no Flux, costs no charge, isn't a repeat and doesn't count toward 4 or Max Sigil words. PUSH's rule holds (refused on your own tile). PROVISIONAL.
486. **Barrage and the 1.4 elements** (closes the impact doc's OPEN). Barrage takes 1 charge off the 2-charge damage words: FIRE, FREEZE, SHOCK, STONE and **ACID**. SPARK and GALE cost 1 already, the floor, so they gain nothing. OPEN for Leon only if he wants Barrage limited to the three words of the old text. PROVISIONAL.
487. **Evoker blade · Edge Word in the engine.** A hit with the blade (an Evoker in hand) leaves one free glyph: your next glyph **this turn** costs 0 AP (charge and Flux as usual), drawn on your own tile by the drawing rules. It doesn't stack with itself, ends at the end of your turn, and isn't given by an attack that already drew a glyph through Sword Form (one free glyph per attack, item 321). PROVISIONAL.
488. **Bulwark under 1.4.** A Sigil spell counts as ranged for Bulwark when its caster isn't next to the target (a Touch spell from a Line beside the caster included). The line of fire runs from where the spell comes from, not from the caster: the Line's glyph a Touch spell or a bolt leaves from (SEEK: the far-end glyph along, the lane's glyph across), a chain's last target for a CHAIN jump, a turret's tile. SENSE appears at its target and a field lies under it: they have no line of fire, so Bulwark doesn't apply. PROVISIONAL.
489. **Sigil log and previews (completeness batch 2).** (a) **Every save is logged:** a failed save shows its roll and TN beside the condition ("Pinned (1 round; body save 7 vs 14)"), every Affliction, FREEZE's Slowed and STEP's Body save included, and the conditions perks and traits set. (b) **A Stack's area** is centred on the caster (the facing rule). (c) **Class moves that cast Sigils** (Payload, Seal, Survey, Fusion, Twin Discipline, Stitch, Stored Spell) paint their area, the tiles they cover and who they affect on the grid before you confirm, as an Evoke does. (d) **Turrets** show their reach on both maps (item 480 c). PROVISIONAL.
490. **Enemy COMMAND orders** (completeness batch 3; Leon's answers 4 and 8). An enemy caster's COMMAND gives the order that fits the creature at its aim, checked in this order: **move** (single-target spells only: no Burst, one missile, no CHAIN) a player standing next to one of the caster's side to the tile it can walk to in 3 tiles that is farthest from the caster's side, at least 2 tiles from all of them, never onto a tile under a field, trap, turret or wall of either side (the order never sends it into harm), worth 18 + 2 for each of the caster's side it stood next to; **halt** a player charging in with a melee weapon (item 469's test), worth 20; **drop** the weapon of an armed player who could shoot one of the caster's side (a ranged weapon, one of them in its range and sight), worth 16, or who stands next to one of them, worth 14; else **kneel** (Prone), worth 9. A burst whose aim tile holds nobody halts whoever it catches. The worth replaces item 469's flat 14 and is × the target's chance to fail its Brain save, as every condition's. So that a cheap control word is still weighed, the caster keeps, in each group of harmful spells, the strongest spell for each Affliction it knows beside the 6 strongest. The target obeys on its turn by the Commanded rules (item 481). Ties break by tile key; deterministic. PROVISIONAL.
491. **The boss-tier caster** (completeness batch 3). enemies.json `casters` adds the *Sigil magister* (boss, magistrate pistol, spell bias ×1.2): the boss tier's nine default words (FIRE, SHOCK, SEEK, ARC, SPREAD, CHAIN, KIN, WARD, NULL; sigils.json `enemy_ai`) plus ACID, CONDENSE, MEND, STEP and COMMAND, Max Sigil words 4 (item 453). A boss foe given `sigils: true` still gets the nine default words. In the Proving Ground, from wave 10, on every champion wave (every 5th), the first Proving champion is a Sigil magister (same tier, same points). **The spells the AI weighs are kept per length:** with many words the strongest spells on paper are all 4 glyphs long, and a 4-glyph Line (4 glyphs, 3 steps and the Evoke: 8 AP at Glyph AP 1) never fits an enemy's 6 AP turn, so a caster with a large word set (the warden, the magister) cast nothing; item 469's pruning now keeps the strongest few of each length. PROVISIONAL.

**Rules revision 1.5: Soul magic, Outburst 2.0 (accepted 8 Nov 2026; decision 99). Every number below is PROVISIONAL until the damage balance pass.**

492. **Stage multipliers** 0 → ×0.6, 1 → ×1, 2 → ×1.4, 3 → ×1.8, 4 → ×2.2 (soul_modules.json `cycle.stage_mult`); they scale damage and healing only, never durations.
493. **The cycle's AP:** Begin 2 (Swift 1), Pump 1, Release 1; a snap cast (Begin + Release, `combat/outburst` with an aim) 3 AP at ×0.6. Class moves "at Soul cast AP" cost 2.
494. **The swell:** +1 stage and +1 Strain (+2 Flooded) at each of your turn starts while holding, after the turn-start −1.
495. **Empathy's free Pumps:** 1 a round from Empathy 3, 2 from 7 (`free_pumps` stat for items), on top of the swell. Flagged strong (Leon's caveat): with the swell a held heart gains 2–3 stages a turn for Strain alone. *Settled by Leon (8 Nov 2026): keep it; the numbers stay provisional for the balance pass.*
496. **Damage:** school base 20 × the Soul multiplier 1 + 0.05 × (Determination − 1) + 0.1 × Will Power (2.45 maxed: snap 29, stage 3 88, stage 4 108).
497. **Shape damage:** Bolt ×1, Lance ×0.8, Wave ×0.7, Burst ×0.7, Aura ×0.6; Bolt and Lance roll Will Power against Defense, the areas don't roll. Not in the proposal: added so an unrolled area isn't a full-damage Bolt on everyone. *Settled by Leon (8 Nov 2026): the shape and roll rules confirmed; the multipliers stay provisional for the balance pass.*
498. **Strain falls by 1 at the start of every one of your turns, always** (Leon), and the five calming ways add to it.
499. **The burn:** 8 true damage a point over the limit at the end of your turn; it Downs, never kills (a foe is subdued).
500. **The automatic Mana Short at 3 over:** Stunned 1 turn, a held Outburst wild, its element's stage-1 rider on your own tile (conditions only), then **Strain falls to the limit** (not in the proposal: otherwise the Short would repeat on every point). *Settled by Leon (8 Nov 2026).*
501. **Stillness:** a turn with no Begin, Pump or Feed (class casts count as a Begin) **and no Outburst held**. *Settled by Leon (8 Nov 2026): holding does not count as stillness*, so a held heart that only waits nets 0 Strain a turn (+1 swell, −1 turn start), and Steady the heart nets −2 at the cost of growth (the first draft let the held heart net −1, which made holding still too cheap). The −1 stays provisional for the balance pass.
502. **Fighting it out and Tending others** are once each per turn, on your own turn only (reaction shots and heals out of turn don't calm). Tending counts a heal or shield that lands, a stim, and each CLEANSE that ends a condition.
503. **Let it go:** free, on your own turn; Strain −stage (0 at stage 0), at most the Strain the swells cost (item 541); the meter +1.
504. **Steady the heart:** 1 AP, while holding, once per turn: −1 Strain and no swell at your next turn start (the Strain of the swell is skipped too).
505. **The second school:** from Will Power 5, its own option, half strength (damage, healing, push rounded down to at least 1, rounds halved to at least 1), +10 MP (was +20); on the same side as the primary (item 542); it lands only where the primary landed (item 543).
506. **Tone cost** 5 MP for an element, 0 for Raw. One tone at Lore Master 1 (rules 1.8, section 12; was Visualization 1), learned with the starting design or the first toned design; more by `magic/learn` (tone) from an ally, a tutor or the Narrator.
507. **The riders table** (soul_modules.json `tones`): stage 0 none; enemies only; Fire's Burning has no save; Storm's Shaken at 4 has a Heart save; Stone's +10 and full armour from stage 1; Stone 4 puts rubble (difficult ground, no cover) on every empty tile around the target; Acid 4's Defense −2 more lasts as long as that Corroded.
508. **The air's shift:** riders read one stage higher in Flooded air, one lower in Thin (0 to 4); the multiplier doesn't shift.
509. **The aura:** 5 Elemental (Stone 15, armour in full) and the stage-1 rider (shifted) to enemies within 1 at your turn start, after the swell.
510. **Heart Overwatch** is opt-in (`combat/heartwatch`, or Begin with `watch`): an enemy that steps from outside your design's reach to inside it, in sight, draws the release as your reaction. Reach: Bolt and Burst their range, Wave and Lance their length, Aura its radius. Riders land on enemies only. *Settled by Leon (8 Nov 2026): opt-in per hold.*
511. **Resonance:** +0.2 on the stage multiplier for each earlier ally releaser in the same round, on the later release (the first has already landed: "give each other" is credited forward). A wild release neither gives nor gets it, nor does an enemy (item 549). *Settled by Leon (8 Nov 2026): capped at +0.4 in total per release* (`resonance.max_bonus`), so with 4 players the fourth gets +0.4, not +0.6. The +0.2 and the cap stay provisional for the balance pass.
512. **Feeding:** 1 AP, +1 stage, any glyph on your own tile but a Keystone (an enemy's too).
513. **Shapes:** areas as in section 7 (Wave cone 3, Burst radius 1, Aura radius 1, Lance 4; Size +1, Lance +2); hostile schools reach allies in the area (friendly fire), Buff allies only; a Lance stops at walls and cover tiles.
514. **Module conversions:** Rain → Burst; Size alone → Burst; Rain + Size → Burst + Size; Teleport → Ether; Duplicate, Bounce, Periodic, Proximity, Expire and Mastery retire (soul_modules.json `retired`). Shape costs: Wave 15, Burst 20, Aura 15, Lance 15.
515. **No slipping:** 1.2's Will Power check when hurt while holding is gone (not named in the proposal; Will Power "no longer rolls you out of trouble").
516. **Raw on a Short's backlash:** no rider. A wild release from a Short picks among every creature within the design's reach (at least 1 tile).
517. **Storm Hand:** Infusion's riders as section 8 (Fire +5 when not a critical; Shock's arc 5 × Elemental multiplier; Spark +1 AP within the ceiling of 9, on any kill by the infused hit, the weapon's own damage included, still 5 MP); Discharge's rider at stage N = Charges (max 3, so a Discharge never reaches a stage-4 rider); the discharging hit gains no Charge.
518. ~~**Hollow Heart** under 1.5: to be re-derived.~~ *Done: item 538.*
519. ~~**Vessel's body forms** keep the 1.2 stage table.~~ *Done: item 531.*
520. ~~**Will Power's Overdraw (3) and Pure Heart (5)** name a Mana Short check.~~ *Done: items 539, 540.*
521. **Old saves:** a 1.2 held Outburst keeps its stage number; designs and learned modules convert once (`c.soulRev = 15`).

**Rules 1.5: the Soul classes, perks and unlocks re-derived (Outburst 2.0 lanes; section "Soul magic", 11). All PROVISIONAL.**

522. **Shape:** the first Pump a turn that would cost AP is free (Damage designs, either school). Empathy's free Pumps are spent first. Flag: with Empathy 7, a Begin reaches stage 3 for 2 AP (Begin + 2 free + Shape).
523. **Storm Front:** Bolt and Lance only; after the release has landed (the `outburst_after` hook), 2 arcs within 2 tiles of the first creature hit (else the first in the area, else the aim), outside the release's area, at the release's multiplier (stage + Resonance) and rider stage, one roll each; +10 MP flat.
524. **Heart Surge:** +1 stage at release (held: the stage itself; past 4: ×2.6; a snap: ×1), once a turn; +1 Strain (2 Flooded) after the release. Replaces 1.2's ×2 and doubled durations and pushes (items 296, 401). Flag: much weaker than 1.2's ×2; Leon to confirm.
525. **Sanctuary:** your own burn ('strain' damage) isn't halved (was "your own Mana Short", item 299).
526. **Gift:** the ally's 3 AP, stage 1, the Bard's full design price and a Begin's Strain (item 302).
527. **Love Made Manifest:** Begins at stage 4 once a fight (item 346's ×3 retired).
528. **Fusion:** a fresh Outburst fuses at stage 0 (was 1, item 349); each target takes it as a Bolt.
529. **Fed:** 1 gauge point = a free Pump, at most 2 a turn; release empties the gauge; no damage bonus (item 357). **Overflow** sets the held stage to 2 at the Begin (item 358).
530. **Heartbinder Share:** over-limit Strain of a linked ally moves to you within your own limit; Take their Strain (1 AP, once a turn, up to 2). **Through** runs the shape from the ally's tile (items 360, 361).
531. **Inner Charge:** forms on the 1.5 table from stage 1; Pump a form (1 AP or a free Pump); no slipping (items 362, 519). Flag: Iron at stage 4 is +22 armour, Swift +4.4 Movement.
532. **Vessel Release:** 15 × each form's stage multiplier, summed, × Soul multiplier (no cap; item 363). Flag: two stage-4 forms are 66 × 2.45 = 162 on one melee hit (the three-form 242 is gone with item 550). Strong for a Defender hybrid: watch it.
533. **The twin's heart:** its own held Outburst and stage, the caller's numbers and MP, all its Strain to the caller, no free Pumps of its own, no Resonance with its caller (item 366's "one heart, no Begin while the other holds" retired). Flag: the twin is 4 more Soul AP a round; with its swell both hearts strain you.
534. **Heart Overload:** the Begin's MP in HP, holdable; Pumps stay AP (item 164).
535. **Resonance (perk):** the window widens by a round (I: hear allies; II: allies hear you); the MP discount retired (item 165).
536. **The Twin Pays:** unchanged, flagged: a free heart can swell to stage 4 for AP alone, once a fight.
537. **Twin Souls:** the third school at half, no roll, its own reach rule, the 1.5 stage table (item 169); it lands after the primary hit, the second school and the tone's riders (the `outburst_after` hook), so a creature the primary dropped takes nothing.
538. **Hollow Heart:** stable when the burn Downs you; a Mana Short doesn't Stun you; +10% on elemental Outbursts too (items 176, 518). Flag: no Stun is a real buff; Leon to confirm.
539. **Overdraw (Will Power 3):** once a fight, a Pump +2 stages from stage 2 or lower, +1 Strain after (item 520).
540. **Pure Heart (Will Power 5):** once a fight, the first shorting Strain is refused and Strain falls to the limit (item 520).

**Rules 1.5: fixes from the Outburst 2.0 review (8 Nov 2026). PROVISIONAL; 541 is a design call for Leon.**

541. **Let it go gives back only what the swells cost.** As written ("Strain falls by its stage"), stage bought with AP or free Pumps (Empathy, Shape, Fed, Overdraw, Overflow, Love Made Manifest's stage 4) turned into Strain removal 1:1 with no cap: Begin (+1), Pump ×4, let go (−4) netted −3 in one turn, a vent by another name, and Love Made Manifest was −3 for 2 AP. Now the fall is the stage **capped at the Strain the hold's swells have cost** (Flooded swells count 2; a Twin Pays hold, whose swells cost nothing, gives nothing back). A hold that only swelled behaves as before. *Accepted by Leon, 8 Nov 2026 ("do yours"). The same day he called two side effects intended: the Proving Ground's Refill also resets Strain and Charges, and Pure Heart (Will Power M2) turns away the first Mana Short of each fight.*
542. **The second school works on the primary's side.** Buff and Inverse Damage on allies; Damage, Control and Status on foes. A cross-side pairing is refused by `magic/design` (and Beloved Spells, the Twinbound twin, the Proving Ground); an old design that has one keeps its primary and drops the rider. The section 4.2 example "Buff (heal) + Status (Inspired)" was impossible as written (Inspired is a Buff option, and a Status rider would have Shaken the healed ally); it is now "Damage + Status (Shaken)" and "Buff (heal) + Damage with Inverse".
543. **"Landed" means took effect.** The primary lands when its roll hits, its push moves the target (a Body save that holds, or an immunity, is not a landing) or its condition takes hold (a resisted or cancelled one is not). Only then do the second school and the tone's riders ride, and only then does the creature count as hit for `outburst_after` (Storm Front, Twin Souls).
544. **The Short is a state, checked at the end of your turn too.** A limit that falls without a Strain gain (Heart's Own's +2 ending when the Beloved spell is released) is checked before the burn: 3 over shorts then (and Strain falls to the limit, so it doesn't also burn).

**Rules 1.5: gaps closed after the review (8 Nov 2026). PROVISIONAL.**

545. **Tending others counts every kind.** The first heal, stim, shield or cleanse a Soul caster gives an ally on its own turn eases 1 Strain whatever gives it: an Outburst, a Sigil (MEND, WARD, CLEANSE), a perk, trait or class move (the generic `heal`, `shield` and `cleanse` ops and the lanes that heal, shield or wash), a prayed Blessing, Lab Coat's neutralising, or a stim (any stim given, even to an ally at full HP: the stim is spent). A cleanse that removes nothing and a heal that restores nothing are not tending; yourself and foes never count.
546. **Heart plates.** Tones, schools and modules come from plates as Sigil words do: a **Heart plate** (loot, 400 credits, used up) holds one Outburst lesson, written on it (the pack note: `fire`, `school:control`, `Wave module`). Studying it takes the scene's one new thing (`magic/learn` with `from: 'plate'` and the tone, school or module); a lesson already known keeps the plate. The Narrator's loot carries the lesson (or a Sigil plate's word) in `note`.
547. **The preview lists everyone a release reaches.** Past the tinted area too: Storm's chains (stage 2–3 one, stage 4 two, at half, with Shaken's save at 4), Fire's stage-4 spread to foes next to each target, Gale's stage-4 push of everyone within 1 (allies included), and an item's own reach through the `outburst_plan` hook (Storm Front's two arcs, with their rolls). Each is marked on the grid with how it is reached (CHAIN, SPREAD, PUSHED, ARC) and its expected number or save; they take effect only if the primary lands.
548. **The turn cut-in shows every resource row** (section 10), in the You card's order: one column up to four rows, two columns past that, the card growing to fit. (The first build showed the four most urgent; Leon's caveat 3 asks for all.)

**Rules 1.5: follow-ups (8 Nov 2026). PROVISIONAL.**

549. **Resonance is for the players' side.** Player characters and the units on their side (companions, the Twinbound twin) resonate with each other; enemies (side `foe`: the Heart adept, the Heartfire elite, the Heart sovereign) never do, among themselves or with anyone: their releases aren't counted and they get no bonus, so the enemy AI's previews never count it. The Resonance perk widens only the players' window. You and your own twin still don't resonate with each other (item 533). What counts is a character behind the unit, not the side it stands on: in a Proving Ground team fight Team B's player characters stand on the enemy side, and they resonate with each other just as Team A does (never across the teams).
550. **A Vessel holds at most 2 body forms at once.** The third form from Will Power 5 is retired (items 75, 362, 532): a third Inner Charge is refused ("You hold 2 forms already: a Vessel holds at most 2."), in a fight or in the story, whatever the Will Power. A save from before this change that still holds three keeps the first two taken; the third is dropped and adds nothing.

**Class Roster Revision 3 (8 Nov 2026; Leon's flags in `docs/design/class-roster-rev3-proposal.md` section 6, with his answers). PROVISIONAL.**

551. **Class from the highest attribute.** Level 3 gives the class of the highest attribute. On a tie the player chooses among the tied, and with every attribute tied all nine are offered (Leon). Replaces the signature-total closest-class rule (two highest totals) and the 13 / 18 rank totals.
552. **Ranks at the class's attribute 5 and 8.** Rank I on gaining the class. Rank reads the class's own attribute, not the highest one.
553. **No class switching (Leon).** The level-3 class is fixed. A second pick is refused. Changing class is a separate system for later.
554. **20 new moves, numbers provisional.**
    - Defender: Shrug It Off, Anchor.
    - Fighter: Shove, Unstoppable.
    - Marksman: Speed Loader, Duck and Roll.
    - Infiltrator: Vanish, Field Fix, Sabotage.
    - Mage: Core Change, Bleed the Flux.
    - Trickster: Read, False Image, Silver Tongue, Sleight.
    - Bard: Rally.
    - Channeler: Iron Heart, Occult Library, Eye of the Storm.
    - Guardian: Command.
    - The engine runs every part of each (phase B, `packages/engine/src/classes/rev3.ts`); the readings the texts needed are items 559–580.
    - Two moves per rank doubles what a class gives at level 3 (flag 7): watch it in the balance pass.
555. **The Guardian leans on a patron** (flag 4). Without one: Will Shield, Command and Sanctuary. Conscience has no class move; it stays the story's Karma skill (flag 5). Names are kept as drafted: Infiltrator, and Bard rather than "Medic" (flag 6).
556. **Advanced classes are shelved, not grandfathered (Leon).** No learning; no tutors placed. A held advanced class stays in the save and gives nothing (moves, resources, effects) while shelved. The handlers and tests stay; tests turn them on with a test-only switch.
557. **The advanced gate by attribute pair:** hybrid base 6 + partner 5, squared 9, both from level 7. Behind the shelving; turning a batch on is data only.
558. **Save migration:** medic → bard, scribe → mage, warden → trickster, hexer → channeler, assassin → infiltrator, once (`classRev` 3). Moves the new class doesn't list stop working.

**Class Roster Revision 3, phase B: the new moves' handlers (8 Nov 2026). Readings where a text was silent or open; the most conservative was taken each time. PROVISIONAL.**

559. **Shrug It Off** triggers on a condition gained through the rules (any Bleeding, Slowed, Weakened or Prone that lands) and on a hit's own riders (a critical's Bleeding, a weapon's knockdown). Going prone by your own choice isn't "gaining" it. It spends your reaction and 1 Guard; a policy turns it off for the fight.
560. **Anchor's opportunity attack** is the normal one made to catch a Disengage too: an enemy that started its turn next to you and leaves your reach is struck as it goes. The normal rule already strikes a plain walk away. Items that waive opportunity attacks (Unstoppable, Lunge) still waive it. The Anchor part reads "Braced" as the unit's Braced (the Defender's Brace or a weapon's); it also undoes a hit's knockdown. The enemy AI counts +10 against a tile that walks out of an Anchor's reach (`ai_move_risk`).
561. **Opportunity attacks land on the tile the mover leaves** (engine fix found while building Anchor): the strike used to be checked a step too late, so a melee opportunity attack was always "out of reach". A blow that drops the mover leaves it there.
562. **Shove (Fighter)**: push or Prone is the player's choice. A push needs a free tile straight behind the target (else it is refused before anything is spent: knock it Prone instead). A save, a shove or knockback immunity (Heavyworlder, a Braced Anchor) and it holds. The base Shove (2 AP, opposed roll) stays for everyone.
563. **Unstoppable's "ignore"**: new Fear, Shaken, Slowed and Pinned are refused, and ones you carry are set aside and come back at your next turn start with the rounds they would have had (one tick less). "Until your next turn" ends at your next turn start. Momentum still empties after a turn with no attack. *(Its last sentence is superseded by the Momentum rework of 10 Nov 2026: Momentum carries from turn to turn.)*
564. **Speed Loader** discounts the turn's first reload of the main hand (a Special Ammo load counts); the first reload spends it even when it was already 1 AP. The off-hand gun's reload never gets it or spends it, nor does reloading both guns at once (3 AP, its own price); a refused reload (already full, nothing to load) spends nothing.
565. **Duck and Roll**: only weapon attacks at range (spells aren't), the first shot of a volley; the step is a real 1-tile move for no AP (traps, opportunity attacks and Overwatch apply). Out of sight: the attack has no target, isn't taken, and the attacker keeps its AP. Into cover: −2 for this attack **in place of** half cover's −5 (the step was late), and only when you weren't in cover already. No step that helps: no reaction spent.
566. **Vanish** is combat-only (the area map keeps its own stay-hidden rules) and refused while Marked.
567. **Field Fix**: a squadmate next to you, not yourself (your own jam is Clear Jam). Restoring durability gives the base Field Repair's amount (10% of the maximum + 5% per Proficiency point over 3, at least 10%) with no spare parts. Repairing a robot, drone, turret or machine (a Factory Made squadmate too) is exactly 20, as a repair: no healing multipliers, not halved by Plug; a Downed one comes back up.
568. **Sabotage targets**: units of kind machine, turret or drone, or named a drone or turret (robots are people, rules 1.3, and aren't sabotaged). Disabled = Stunned for 2 of its turns (no actions, no reactions). A barricade stops blocking the way (not sight or cover) for 2 rounds: a walk may pass through it but not end on it, so nobody stands inside it when it blocks again; an emplaced turret object is disabled for 2 rounds (the Narrator runs it; a note says so). Sigil turrets are spells, not machines.
569. **Sabotage's rigged tile**: one at a time (a new one replaces the old); armour applies to the 30; the walk stops there; the Body save is against 12 + your Body debuff strength. Your side sees it and walks round it; the enemy AI doesn't know it is there.
570. **Core Change** and **Bleed the Flux** price the Vent and the core swap through the items (`ap_cost:vent`, `ap_cost:swap_core`): a core swap 1 AP, a Vent 0 AP.
571. **Bleed the Flux's "1 more Flux"**: a Vent already empties the Evoker, so the one more is the next point you take: the next glyph you draw adds 1 Flux less (TWICE 1), and that point goes into the air then (the meter +1). It doesn't stack and lasts the fight.
572. **Read's intended action** is the enemy's own next-turn choice read by the engine without rolling or changing anything (`enemyIntent`): its conditions first, then a reload, the attack it would make (on whom), or where it would walk. A Sigil or Soul caster is named as weighing a spell, then its weapon choice. It is kept on the enemy until its turn ends. An enemy already analyzed can't be analyzed again, so it is read once a fight.
573. **False Image's range** is 8 + your Sigil range bonus, sight needed (the Seal's reach, item 287). Only enemies that can see the tile save; it adds no Flux (it isn't a word). One image at a time. It scatters when attacked (the attack's AP, a round and Heat are spent; it passes through) and fades at the start of your turn two rounds on, or when you fall. A fooled enemy's spells leave you alone; its reactions (opportunity attacks, Overwatch) still see the real you. To a fooled enemy the image's tile is taken: it never ends a walk there (it closes on the image, next to it).
574. **Silver Tongue** can't be used on a machine, turret or drone (nothing to lie to). The AP comes off the target's next turn through the turn's AP (the floor of 2 holds). A second one before that turn doesn't add: the larger stands.
575. **Sleight**: both the image and the squadmate must be within 6; a Downed squadmate can't. A swap is not a walk: no opportunity attacks, Overwatch or traps; both lose Braced. The image swap needs the image's tile free: with anyone standing on it (an enemy walked onto it) it is refused ("Someone stands on your image.") and nothing is spent.
576. **Rally**: squadmates within 4, not you; Downed ones aren't rallied (they aren't standing); refused with nobody in reach. A cleanse with no healing still counts as tending others (rules 1.5).
577. **Occult Library's tone**: once (per campaign), out of a fight, any element tone you don't know, as from a tutor; it is the scene's one new thing (the magic/learn rule).
578. **Eye of the Storm** is armed for your turn (0 AP; the scene's use is spent when you arm it). The Strain waived is what the Release adds while it resolves (Heart Surge's doubling included); a snap cast's Begin Strain comes before the Release and stays. Riders count a stage higher up to 4 (a stage-0 release gets stage 1's rider). Not a Heart Overwatch or a wild release.
579. **Command**: a squadmate (not you) within 6 (inside hearing), able to move; the walk is real (opportunity attacks, Overwatch, traps, Afraid apply) and banks nothing. Leadership Squad is read as Authority 1.
580. **Combat-only moves** (classes.json `surface: "combat"`): all but Iron Heart and Occult Library (`surface: "always"`). None of the active ones has a story version: the Narrator rules such moments as usual.
581. **The Bard carries the medic rules** (Class Roster Revision 3; the Medic is now the Bard, item 558). Everything the rules give a Medic goes to the Bard (the engine's `isMedicChar`): the 1 AP stim to stabilise a Downed ally (2 AP for anyone else) and its Thrown Stim price, treating arm and leg injuries on a long rest, and the Medic's moves the Bard lists (Triage). A Revision 2 Medic migrates to the Bard and keeps them.

**The Grand Sigilist and the Sigil damage balance (8 Nov 2026; docs/design/grand-sigilist-draft.md). PROVISIONAL.**

582. **Grand forms for the 17 words new in 1.4** (settles item 468): each has its own job, no copy of an older form. ACID *Etching ground* (cover inside loses 15 HP a round and crumbles; +2 to hit enemies inside) · COMMAND *Parade ground* (Brain save or Pinned for the turn) · SHARPEN *Whetstone* (+5 to your side's attacks from inside, +10 melee and unarmed) · STEP *Fold* (a move that stays inside costs 1 AP at most) · RAISE *Ramparts* (up to 8 walls of 30 HP on the edge ring) · MASK *Hall of masks* (no targeting your side inside from more than 3 tiles outside) · ARC *Mortar pit* (item 584) · RELAY *Relay net* (+1 to hit per other ally inside with a line, +3 at most) · WAIT *Minefield* (every enemy, 10 and its walk stops) · WATCH *Sentinel* (15 at your turn start; 10 to an enemy leaving, once a round each) · CHAIN *Conductor* (10, was 5) · LEECH *Bloodwell* (a hit on an enemy inside heals the hitter 5, once a round per pair). QUICKEN, CLEANSE, NULL, SENSE and KIN keep their forms.
583. **Four old forms changed so the engine runs them** (no Narrator rulings left): SPREAD *Bloom* (a spell your side lands inside also deals 10 to every enemy inside it missed) · TWICE *Echo field* (the first spell your side lands inside each round rings again on those it hit, half its damage per target, 5 at least) · CONDENSE *Crush* (enemies starting a turn inside next to another creature take 10; PULL keeps the pull) · PUSH *Gust* (enemies starting a turn inside are blown 1 tile outward).
584. **ARC's Mortar pit reaches out of the zone:** at the start of the owner's turns the staff shells the tile within 6 of it that catches the most enemies (a direct hit counts 3, a neighbour 1; at least 3): 15 there, 5 to enemies next to it.
585. **Grand forms end with their fight** (a fix): with the smoke, light and ramparts their staff raised. One planted on the area map stays there.
586. **The two-glyph hook** (item 452): nobody else gets it for now. One glyph a tile is the core of rules 1.4 Lines, a Stack is the strongest shape, and the Grand Sigilist can't draw while the staff stands. Revisit with the damage simulator.
587. **The Elemental multiplier** follows the Physical slope: 1 + 0.1 × (Expression − 1) + 0.05 × Visualization (was 0.2 and 0.1; at most ×2.4, was ×3.8).
588. **Sigil and Elemental bonuses add** for Elemental damage: 1 + (Sigil − 1) + (Elemental − 1) (was their product: up to ×11 with both maxed).
589. **One main element:** the strongest damaging Subject glyph in full, every other one at half. FIRE · FIRE · CONDENSE is 61 (was 81); FIRE ×3 · CONDENSE 73 (was 109).
590. **The Sigil ceiling:** 350 a hit, 500 on a critical, per creature per spell, before armour (balance-targets.md). With items 587–589 a maxed caster's strongest single-target Line (STONE · FIRE · SHOCK · CONDENSE) is about 346 (was about 1,144; 2,288 on a critical), so the ceiling only trims the extreme cases.
591. **Weapons exceed the ceilings too** (not changed here; for the damage simulator): the breacher tube at about 290 a hit for a maxed build with a masterwork, and about 990 on a critical (Critical multiplier up to 3.4).
630. **A focus counts only in a hand** (Leon, 8 Nov 2026; retires item 77's "the Evoker and Emanator count when carried"; closes item 354's open note). The main or the off hand; a 2H weapon fills both, so an off-hand focus doesn't count beside one (and equipping one stows it). Evokers: the Evoker, the Evoker blade, the spellslinger's pistol, the Grand staff (2H). Emanators: the Emanator, the Emanator gauntlet. The refusals read "Needs an Evoker in hand." and "Needs an Emanator in hand." Carried, a focus keeps its store (core charge, MP; rests and refills still reach it), but nothing is cast or spent from it. Enemy casters hold theirs.
631. **No Emanator in hand: Outbursts draw on the air** (Leon, 8 Nov 2026, choosing between Hands 2's "Soul spells need an Emanator in a hand" and Soul magic's "without one, every Begin pays from the air"). Begin costs no MP and +2 Strain; the MP stays in the carried Emanator. Syphon, Crystallise and every move that spends or fills MP need the Emanator in hand.
632. **Putting a focus away mid-fight** (swapping a 2H weapon into the main hand, or something else into the off hand) stops new casts at once: drawing, Evoking, swapping a core, Venting, Syphon, Crystallise and MP. Glyphs already drawn stay on the ground (Evoking them needs an Evoker again). An Outburst already held stays held: it swells, can be Pumped, Fed, Steadied, let go and Released (the spec gives no rule that ends it). Disarmed leaves a focus weapon in reach: it still counts (the condition stops attacks, not casting).
633. ~~**Swapping a focus in a fight:** a focus from the pack into the off hand is 1 AP (one hand), like any swap; a 2H weapon into the main hand is 1 AP and stows the off hand with it (one motion).~~ *(Superseded by rules 1.9: item 684. A focus into one hand is still 1 AP; a 2H weapon into the main hand is now 2 AP, one a hand, and still stows the off hand with it.)* Story and area-map casting read the same hands.
634. **The Grand staff** (mana arms, 2H, 24 physical, reach 1, 2.5 kg, 2,400 credits, Brain Power 3, counts as an Evoker; item 353's data delta). PROVISIONAL: every number; the Grand Sigilist (shelved) doesn't need it to plant its Grand form yet.
635. **The Proving Ground's magic kits** put the Evoker in the off hand when it is free and the main hand is 1H (the Sigil kit; also the both kit), the Emanator there for the Soul kit; anything that doesn't fit (a 2H weapon, a full off hand, the second focus of the both kit) goes to the pack, and the tool's line says where each one went.

**Rules revision 1.6: Blessing 2.0 (8 Nov 2026; decision 102; `docs/design/blessing-2.0-spec.md`). Readings where the design was silent or open. PROVISIONAL.**

592. **Blessing 2.0 numbers.** Every Hymn, Miracle, Whisper and intervention number (patrons.json v2, from the design spec) still needs a pass against `docs/design/balance-targets.md` (design open item 4).
593. ~~The liked-tag cap.~~ *Superseded in rules 1.6.1 (Faith 2.1): items 702–704 (XP; 2 a fight, 2 a scene, 6 a session; on the character).*
594. **No roll within standing.** A Faithful character's Whisper, and a Hymn of their own patron at or under their Devotion, need no roll; only an overreach, an Atheist's prayer and a kept Hymn of another patron roll.
595. **Witnessed's +2** goes on attack rolls that would carry a tag the patron likes: an attack on an enemy when the patron likes kill (or judge, when that enemy harmed the helpless), fire damage when it likes burn, lightning when it likes storm. Other rolls get nothing; the tag is judged before the roll.
596. **A tag counts once per action** (one reducer action; what happens during an enemy's turn because of you, such as an Interpose, is its own action). Liked and taboo tags of one action all count.
597. **Kill as a taboo** (the Toll-Keeper, the Matchmaker) means killing or Downing a surrendered or Downed creature, not any kill (`taboo_notes` in the data).
598. **Betray** is any attack, Sigil or Soul hit on a creature of your own side that takes HP (friendly fire included); a heal or a shield never is.
599. **Mercy** fires when an enemy surrenders to you (Parley or a non-lethal blow), and at the end of a fight for each surrendered enemy still alive that you never damaged after it yielded.
600. **Protect** fires on a shield you give an ally, an Interpose, a Brace, or a hit you take in an ally's place (the Matchmaker's share, Red Thread); **heal** on a heal or stabilise given to someone else; **supply** on a stim given, an item handed over, an ally's reload, or cover placed.
601. **Hold** is checked at the end of your turn (Braced, Anchored, or holding Overwatch); **cower** at the end of your turn (Hidden while an ally is Downed); **flee** on a Disengage that ends farther from the nearest enemy, or leaving the fight (Extraction).
602. **Vows** are sworn in round 1 before the character first acts, one per fight. Bare Hands breaks on an attack with a gun or a thrown weapon, or any Sigil or Soul strike; Stand compares the distance to the nearest living enemy at the start and the end of each of your turns; Nobody Left Behind is checked at the fight's end (an ally still Downed breaks it then, −2). *Rules 1.6.1: a broken vow is −5 Devotion XP (item 702).*
603. **Interventions** are once a fight per Faithful fighter, while that fighter is Witnessed; two Witnessed Faithful each get their patron's. *Rules 1.6.3: twice a fight from Devotion 7, and each ends Witnessed (items 739–740).*
604. **Prayers in the story** cost AP from the overworld round when rounds are running; the Hymn cooldown counts story rounds; a Whisper is once a story round. They go at the squad (characters); what they would do to anyone else goes to the Narrator. Story prayers don't make you Witnessed.
605. **Engine rites** check one of three things: `story` (any time out of a fight), `after_rest` (a rest has been taken this session) or `tithe_item` (you give up one item of a category, such as a ration). Each rite is kept once a session for +1. *Rules 1.6.1: +4 Devotion XP (item 702); the rite texts say so.*
606. ~~Apostasy.~~ *Superseded in rules 1.6.1: items 707–710 and 714 (the pieces are counted as before; Devotion XP 0; a 90-day cooldown; the farewell).*
607. ~~Changing patrons is apostasy, then the pact.~~ *Superseded in rules 1.6.1: items 711–714 (a direct switch, no cooldown; the leave roll and grudges).*
608. **The Miracle** takes no roll and doesn't wait on the Hymn cooldown; it makes you Witnessed (Faith 5) like a Hymn. Whispers never make you Witnessed. *Rules 1.6.3: Witnessed now lasts until the fight ends or the intervention fires (item 738).*
609. **Luck and Lucky Break** act on attack rolls in a fight and on checks in the story. Luck: +2 on the next one. Lucky Break: in a fight the next failed attack roll is rerolled at +5; in the story it is +5 on the next check (a story check has no reroll step the engine can hook). Saves aren't touched.
610. **Guidance** reveals Hidden enemies within 6 tiles and hidden traps there; the +2 goes on the character's next spotting roll in the fight, or next notice check in the story.
611. **Safe Passage** makes your next move this turn draw no opportunity attacks (Overwatch still fires).
612. **Dig In** gives the half-cover penalty (−5 to shots at the ally) and Braced until the ally moves (the engine has no cover on a unit's own tile; this reads it as a state).
613. **Switcheroo** swaps two units in your sight, each within 6 tiles of you; an enemy among them makes a Brain save and the swap fails if it saves.
614. ~~**Encore** banks for every ally's next turn the AP of the last action they took this round (the AP ceiling applies when it arrives).~~ *Superseded in rules 1.6.2: item 729.* **Rewoven** puts every living ally into the order right after the current turn, once each, in initiative order, this round only (rules 1.6.2 adds the HP rewind: item 734).
615. **Hearthlight, Hold the Gate, Gather the Clouds and Together** last until the caster's next turn, except Hearthlight (3 rounds). **Red Thread** lasts 2 rounds: half of each hit on one of the pair moves to the other.
616. **Foreknowing** lasts until the ally is next attacked or the fight ends. **Unravel** ends every boon condition, the shield, Braced, Overwatch and Hidden. **Cut Short** is Stunned 1 round (Heart save); a boss instead loses 2 AP on its next turn.
617. **Last Crossing** kills outright on a failed save (no Downed state). ~~**Turned Back at the Shore** brings an ally who died this fight back standing at 1 HP. **Love Conquers** uses the surrender rules: bosses, machines and the no_surrender never yield.~~ *Superseded in rules 1.6.2: items 730 and 733.*
618. **Enemy faithful:** one enemy type that prays (a Whisper and a Hymn) is deferred; enemies don't pray yet.
619. ~~Judgement (Guardian) spends 1 Devotion.~~ *Superseded in rules 1.6.1: item 706 (10 Devotion XP). Blessed Shells' story prayer still uses the rules 1.6 roll (by standing, overreach or dice) instead of the patron's mood; its miss is item 716.*
620. ~~**Interventions scale with Blessing power** like Hymns: Nerukhan's 20 Soul, Mother Ember's 15 heal and Old Overcast's 20 lightning are × the praying character's Blessing power.~~ *Superseded in rules 1.6.3: item 741 (20 + 4 × Devotion, still × Blessing power).*
621. ~~The Miracle spends Devotion after its effect.~~ *Superseded in rules 1.6.1: item 707, then in rules 1.6.2: item 725 (still after its effect: now 5 levels).*
622. **Harming the helpless** (judge, the Mercy vow, Nerukhan's intervention) counts any hostile hit on a Downed creature, even though a Downed creature takes the hit as a failed death save rather than HP, and any HP damage to a surrendered one. Killing a Downed creature (its third failed save) or a surrendered one is the "kill of the helpless" taboo.
623. **Mercy at the fight's end** is one tag per fighter (not one per spared enemy), given when a surrendered enemy is alive and that fighter never harmed the helpless this fight. **Flee** on Extraction is one tag per fighter still standing.
624. **Story prayers that need a tile or an enemy** (Thunderclap, Covering Fire, Judgement, Love Conquers…) and Whispers with no story meaning (Protection, Safe Passage) are paid and rolled as usual; what they do goes to the Narrator as a pending ruling. A story Hymn or Miracle also fires the items' `story_blessing` hook (Upper-Touched's d6). The old `story/pray` is a Hymn I of your patron through `faith/pray` (it now costs 3 AP while rounds run).
625. **Knowledge pieces of your own patron** are refused (standing is what counts); a Faithful of a Jealous patron is refused pieces of other patrons; a fourth piece of a patron is refused.
626. **Rites:** an engine rite is kept only from its button (the Narrator can't mark it), a Narrator rite only by the Narrator; a tithe takes one matching item (an item whose kind or id is the category, such as food).
627. ~~The Narrator's Devotion move (±2).~~ *Superseded in rules 1.6.1: item 705 (−6 to +5 XP, refused out of range when sent directly, clamped in a turn; +10 a session). The turn's `patronMood` is still not applied.*
628. **Heretic's Stolen Fire** prays a stolen Hymn as an Atheist prays a learned one (d20 + Will Power against 14, 16 or 18; no Witnessed), with the Hymn's own target, second unit or tile. In the story it is d20 + Will Power against the same TN, and the Narrator rules the answer.
629. **Old-shape patrons** (a patron added at run time with `blessings` and no `hymns`) still work: their Blessings are Hymns (tier 1 unless given), aimed at you or an ally, and run their data effects.

**Rules revision 1.7: World Play (8 Nov 2026; decision 105; `docs/design/world-play-spec.md`). Numbers and readings where the design was silent. PROVISIONAL.**

636. **Carry weights by kind:** robot 40 kg, drone 15, human 70, crawler 70, beast 80, machine 40; any other kind 70 (`data/world_play.json`).
637. **Carry and Put down** are area-map actions, 1 AP each. Carry takes an adjacent token that is seen and is not hostile, or is a prisoner, or is at 0 HP (that is the reading of "willing, Downed, a robot or a drone": a hostile robot is still fighting you). Put down goes onto an adjacent free tile; with no tile named, the nearest free one.
638. **Overweight while carrying** uses the existing rules unchanged (−1 Movement per started 5 kg over, no Sprint), so a 70 kg body takes most characters to the 0.5 Movement floor. A playtest question: the rules may want a carry-specific penalty instead.
639. **In a fight** carried creatures come along and can't be put down until it ends. A carrier who is Downed (or killed) drops them on the nearest free tiles; in a fight they lie there (`combat.dropped`) and are tokens again when it ends; out of a fight they are tokens at once.
640. **The Narrator's carry and drop** cost no AP and need no adjacency; a drop on a taken tile goes to the nearest free one.
641. **Caches:** Search is 1 AP, adjacent, in a fight too (`combat/search`). Players see how many entries a cache holds, never what, until it is searched; a locked or jammed cache refuses Search. At most 12 entries.
642. **Each character tries each approach once** (spec section 4), replacing the old once per scene.
643. **Reveal** shows the object and every hidden token, object and hazard within 3 tiles of it. **Open** on a cache leaves it to be searched; remove and disarm settle the object.
644. **Disarm** on an object also removes any hazard covering its tile.
645. **Alarm** reveals every hidden hostile in the zone, and every unaware one loses unaware (they are alerted); the Narrator is called and may start the fight.
646. **A failed approach's condition:** the ones a story carries (Bleeding, Shaken, Weakened, Fear, Nausea, Injured, the brain debuffs) last the scene as story conditions; the others (Slowed, Burning, Stunned…) go on the area map for their normal rounds, with no save.
647. **Jam** locks the object for the rest of the scene and removes that approach for everyone, for good.
648. **Lose** takes one of `failItem` (an item id, its name, or a plot item's name); nothing if the actor carries none.
649. **Approaches on people:** success ally, inform, advance, reveal (within 3 tiles) or remove (they leave); failure hostile, hurt, alarm, condition, lose. Open, disarm and loot do nothing on a person.
650. **Hazard TNs** are 12 light, 16 heavy, for both their approaches and their saves. Armour applies to minefields and collapses, not to fire or radiation; a hit always does at least 1.
651. **Hazard details:** a minefield, a collapse and a gas that Stuns stop the walk on that tile; fire, radiation and a gas that only Shakes don't. Radiation counts the tiles each creature enters in that hazard; Weakened lands from the third and on every tile after.
652. **The engine's approaches:** Find a safe path rolls the better of **Vigilant and Sensory** (the spec's "Perception or Vigilant": Perception is an attribute, so its skill for spotting and the senses' skill), Disarm the better of Proficiency and Ingenuity. 2 AP, within 1 tile of the hazard.
653. **A safe path** is a lane: the hazard's tiles on the shortest walk from the actor to the hazard's farthest tile. It holds for the squad only (side pc); a second success adds another lane.
654. **A failed disarm** gives the actor one tile of the hazard (no mine is spent, radiation doesn't count it).
655. **Hidden hazards:** minefields, radiation and gas can be hidden; fire and collapses can't. Passive Vigilant (10 + modifier) against the hazard's TN within 2 tiles, at the end of a move; stepping in reveals it; its approaches open once it is seen.
656. **Hazard limits:** 64 tiles each, 12 a zone; solid tiles are left out.
657. **Enemies** set hazards off and don't path around them (yet). Tokens on the area map are not hurt by hazards, and the Narrator moving a token through one fires nothing (the Narrator's call). Gear that is `hazard_immune` protects (fire; toxic covers gas and radiation).
658. **Triggers** are area-map only. Enter fires on a party member's walk (their own moves, typed moves, the Narrator's moves); examine on an examine, a search or an attempt on that object; objective when it is done, checked after every action. Spawn places at most 6; a fight whose people couldn't be placed does nothing; reveal with no ids shows what is hidden within 1 tile of its tiles; at most 16 unfired a zone; its text is shown to everyone when it fires.
659. **The Narrator's moves** (`moves[]`) walk the path for free (no AP), firing hazards, traps and triggers on the way. With no path the move is a cutscene jump, refused (with a note) when the straight line crosses a live hazard tile.
660. **Talk** needs the person seen and within 3 tiles. Each ask is 1 AP and is refused (at no cost) when they have no want or nothing to tell. Wants and hints stay out of players' views until asked or told; once told, the whole party knows. Talk checks carry the dialogue tag.
661. **Ally:** a hostile person becomes neutral, a neutral one an ally (shown as ally). Allies don't fight beside the party yet.
662. **Markers:** each open objective's `where` references in this zone, and the hints people gave (their optional `knows.at`, else the objective's references). Never on a hidden token, object or hazard.
663. **The HERE card** counts an objective as here when its `where` names this zone, a reference resolves here, or something here moves it forward (an advance approach, a person who knows it). At most 3; with none here, the first open required objective, and its zone.
664. **Where** holds a zone and up to 8 references, set by `missions[]` with or without a status. A campaign may write `where` on an objective (in the cached campaign block); the Narrator's own appear in the per-turn MISSION block.
665. **A typed attempt's index** counts from 1, as the Narrator's list numbers approaches; the web's `idx` counts from 0.
666. **Default avatars:** the campaign's portrait for the name first; else the kind's pool, picked by a hash of the token's id and name (the same on every screen): world-character portraits for humans and crawlers, the M813 infantry robots for robots, the scavenger drone for drones and machines, none for beasts (their kind badge shows). A Narrator avatar must be a pool member or a campaign portrait.
667. **Lurkers start a story fight Hidden:** a hidden hostile token joining a fight the Narrator or a trigger starts starts it Hidden (as an attack from the area map already did).
668. **The Proving Ground:** attempts and asks roll at once (no Narrator, AP always full); the tools place things only while gearing up; their objectives live in a "Drill" mission.
669. **What the engine tells the Narrator:** up to 20 events (triggers fired, hazards hit, approaches tried with their effects, carrying, searches, talk, alarms) since its last turn, consumed by that turn; hazards hit in a fight are reported after it.
670. **The Narrator's tool** stays the same all session: the new fields are optional, with fixed vocabularies only.

**Rules revision 1.9: World Play 1.1 (9 Nov 2026; decision 106; `docs/design/world-play-1.1-spec.md`). Numbers and readings where the design was silent. PROVISIONAL.**

671. **A pile is a map object** of kind `pile`, one per tile (its id is `pile-x-y`, so the tile names it): open, never blocking movement or sight, weighing nothing. Its entries are exact pack items (`items[].pack`) with a stable key each, so a pick-up names what it takes even after the pile changed.
672. **The pile cap:** 24 entries (`world_play.json` `pile.max_entries`). Past that the engine loses, in this order, empty magazines (oldest first), then the oldest entry that is neither a weapon nor a plot item, then the oldest entry, with a log line for each.
673. **Merging:** loose rounds of the same calibre and ammo type are one stack; items with the same id, name and note and no rarity above standard, durability, mods or magazine merge their qty (thrown weapons like grenades stack too); every other weapon and every magazine is its own entry.
674. **Picking up:** 1 AP (`world_play.json` `ap.pickup`), from your own tile or an adjacent one, a selection of entry keys (or indices), everything by default; never from a hidden pile; a selection that matches nothing is refused. A Search on a pile picks up everything. Companions and puppets don't pick up. Review fix (9 Nov 2026): a stim injector picked up joins the character's stims (what Stim spends) and an Essence of Experience the Essence, on every map and from caches and `loot[]` too; neither is a pack entry.
675. **Where picked-up things go in a fight:** a magazine for the main-hand gun into its spares (with its type); for a different off-hand gun into the off-hand spares; any other magazine into the pack after the fight; loose rounds of the main gun's calibre join the unit's loose rounds whichever way it loads (they are pack rounds, written back after the fight); thrown weapons, spare parts and mana cores join the unit's counts and the pack; everything else goes straight into the pack. The area map runs the same routing and writes it back after the action.
676. **Fog for piles:** the party's shared sight, as in a fight: each standing party unit's Vision (halved in the dark unless it sees in the dark, lit tiles at full range) and line of sight; on the area map from where each character stands. Piles in other zones are never in a player's view. The host's state and the Narrator keep every pile. Review fix: a pile's fx (`pile` {at, id, count, why}) goes only to a view whose party sees its tile now, and a death's drop line ("X drops: …") reads "X falls; whatever it carried lies where it fell." in such a view; a reload's log line names no tile. The host's state and the end-of-fight report keep the full line.
677. **Hidden piles** (the Narrator's `ground[]` only) are spotted by passive Vigilant (10 + modifier) against TN 12 within 2 tiles after a move (the `pile` kind's `detect_tn` and `detect_range`), by any reveal, or by the Narrator's `hidden: false`. A drop onto a hidden pile reveals it (reload drops are never hidden).
678. **Persistence:** a fight on another zone's map starts from that zone's stashed objects, and when it ends there the zone the party was in is stashed first; old saves' `floor` entries become piles once (on the fight's map, and on the area map too when the finished fight was on the current zone).
679. **Speed and tactical reload:** a tactical reload costs the speed reload's price + 1 (Quick Release and Speed Loader lower the base; the +1 stays); the old magazine, empty or not, goes to the end of the spares. Reloading both guns tactically is 4 AP; the off-hand gun's old magazine goes back to its own spares. Enemies always speed-reload. The spell magazine (Load the spell magazine) drops the old one as a speed reload does, empty or not. Review fix: a full magazine gun isn't reloaded either way ("Already full."); reload both is refused when either gun is full (reload the other alone). A character's off-hand gun reloads only from what it carries (its own spares, or the main gun's when both hands hold the same model; a round-by-round off-hand gun from loose rounds of its calibre); with none it is refused ("No loaded spare for the off-hand gun."). Enemies' off-hand guns still never run out.
680. **Each magazine keeps its type:** the magazine swapped in sets the gun's loaded type (standard unless that spare's type says otherwise); the one dropped or put back keeps the type it had. Review fix: the off-hand gun's spares keep their types too (a picked-up typed magazine included, written back in line with the magazines), and with the same model in both hands the off-hand reload takes the shared spare's type with it. The rounds loaded in a gun keep their type when it leaves the hand (put away, dropped, swapped, a dead enemy's gun) and when it is drawn again; an empty gun has no type.
681. **The Narrator's `ground[]`:** at most 6 entries a turn, 12 items an entry (`world_play.json` `pile`); a tile off the map or solid does nothing; it merges into the pile on the tile (the 24 cap applies); `hidden` only hides a new pile, `hidden: false` reveals one; `mag:<weapon>` is one magazine (qty is its rounds, at most the magazine; a qty of 1 or none is a full one, 0 an empty one), and for a weapon loaded round by round its rounds loose; `rounds:<calibre>` at most 120 rounds an entry; an unknown id is a plot item. An `objects[]` place of kind `pile` is read as a `ground[]` entry. Applied on the area map (the Narrator doesn't act mid-fight). Review fix: an `objects[]` entry of kind `pile` (or naming a pile's id) counts with `ground[]` against the 6 entries a turn; an `objects[]` op with no kind never matches a pile on its tile.
682. **`loot[]` ammo:** `mag:<weapon>` puts one magazine per entry in the pack (qty as in `ground[]`: its rounds, 1 or none for a full one); `rounds:<calibre>` puts qty rounds (at most 120) in the pack's stack of that calibre.
683. **Click-paths and hazards:** a player's unit (characters and companions, in a fight and on the area map) routes around every revealed, live hazard tile (not a safe-path or spent tile) when a route exists at most 2 path tiles longer than the shortest; a hazard tile that is the destination doesn't count against a route. Otherwise it takes the shortest. The engine's `routeHazards` lists the revealed hazard tiles a route crosses, for the preview. Review fix: the way round is taken only when the unit can still pay for it this way (AP for a move, plus a sneak's 1 AP a tile on the area map; 3 × Movement for a sprint); otherwise the click takes the shortest path, which the preview shows with what it crosses, so a tile shown as reachable is never refused for the detour's price.
684. **Gear in a fight costs 1 AP a hand** (Leon, 9 Nov 2026; supersedes item 633's 2H row; `world_play.json` `gear`): a draw into one hand 1 (whatever that hand held goes to the pack in the same motion, so a draw into a full hand is still 1; a one-handed weapon into the main hand while a two-handed one is held is 1, the two-handed one going to the pack); a two-handed draw 2 (the off hand's item goes to the pack with it); swapping main and off hand 1; putting away 1 a hand, 2 for a two-handed weapon (the main hand is then empty: fists); dropping 0, into the pile on your tile, with its rounds, rarity, wear and mods; a mod 1 (item 147). The pack entry is named by its index or its id and found before the fight's state is written back, so a used-up entry ahead of it never shifts the choice. Handing over or dropping pack items and loading magazines out of the pack stay out of a fight (Load is its own combat action). A companion or a puppet has no pack.
685. **Light armour is 1.2 kg or less** (`gear.light_armour_max_kg`). PROVISIONAL. Of today's pieces the field helmet (1.2 kg), field boots (1.2), night goggles, gas mask, glasses, smiling mask, padded undershirt, utility belt, runner trousers and both gloves are light; the ballistic helmet (2), trauma plate (2), armoured belt (1.5), armoured greaves (3) and heavy boots (2) are not, and are refused with "Heavy armour (over 1.2 kg) isn't changed in a fight." Body armour (the armour class) never changes in a fight. Putting a light piece on over another light piece in its slot is 2 AP (one off, one on); a heavy piece in the slot refuses it. *Decided 9 Nov 2026 (the review's open question):* the line was 1 kg, which left every helmet heavy although the design's examples (helmets, gloves, goggles, belts, undershirts) call helmets light; it is raised to 1.2 kg so the field helmet changes in a fight and the ballistic helmet stays out. The field boots (1.2 kg) come in with it. Leon to confirm in playtest.
686. **Hot-Swap in rules 1.9:** it makes one whole draw, put-away, swap of hands or mod free (a two-handed draw's 2 AP too), once a turn (Tier II twice); never armour; a drop is 0 AP anyway and doesn't use it.
687. **Disarmed and gear:** drawing a weapon into the main hand, or swapping the off-hand one there, leaves the weapon on the ground in the pile on your tile (it keeps its rounds) and ends Disarmed; drawing into the off hand leaves Disarmed as it is; putting away or dropping the weapon on the ground is refused ("Your weapon is on the ground: recover it (2 AP) or draw another."). Recover is unchanged.
688. **The off-hand gun keeps its own rounds:** the character keeps the rounds in the off-hand gun (`offHand.loaded`) through a swap, a put-away and the end of a fight, like the main gun's; drawn from the pack, an off-hand gun holds what its pack entry held (nothing, if the entry says nothing, as the main hand); an old save's off-hand gun with no count starts full, as before.
689. **The rebuild after a change:** Defense, armour, Movement and Vision change by the difference the gear makes (so a break, a slow or a guard on them stays); the weapon's numbers, the off-hand gun's spares, light, dark sight, hazard immunity, weight, throwables, spare parts and the d20 item modifiers are taken fresh from the character; HP, AP, conditions, heat, a held Outburst, Flux and Strain are kept (review fix, 9 Nov 2026: heat now stays, as the design says, so two swaps no longer cool a gun). A change of main weapon resets a jam and a brace; the gun drawn holds the rounds its pack entry kept, of their type (standard if none).
690. **The Proving Ground** charges the same for the player's own gear actions in a live fight (on its turn, through the same combat checks); the tools (give, equip, take off, armour class, kits) stay free and rebuild the fighter as before. Gearing up between fights is free.
691. **Drop table layers:** the engine's `data/loot_tables.json`; a campaign's `loot_tables` (a list of tables in the same shape; one with an engine table's id replaces it everywhere in that campaign) and `drops` on its zones' `npcs` and its encounters' `enemies` (an encounter is matched to the fight by name, as its music is, and its enemies to the fighters by name, first unused match); the Narrator's `drops` on `combat.enemies[]` and on `npcs[]` (place and update). The most specific layer that gives an enemy a `drops` value replaces the rest for that enemy's rolled drops (no merging); `drops: {}` means no rolled drops. A token keeps its `drops` when it walks away from a fight. Players never see a `drops` value.
692. **Default rolls:** a minion and a soldier roll once on their kind's table, an elite and a boss twice (`rolls_by_tier`). A table is a weighted list with a weight for nothing (`none`); one roll picks one entry, its qty rolled within its range. Kinds: human, crawler, ork, upper realm, cursed and celestial roll `person`; robot, machine, turret and drone roll `machine`; beast rolls `beast` (empty); an enemy with an Evoker or an Emanator rolls `caster` whatever its kind. A `drops.table` rolls that table the same number of times; each `drops.items` entry rolls once against its chance (default certain). A Sigil plate or Heart plate that drops with no `note` rolls its lesson on the same dice, evenly: one Sigil word for a Sigil plate; one tone (not Raw), school or module for a Heart plate (note `tone: fire`, `school: …`, `module: …`), so every dropped plate can be studied (review fix, 9 Nov 2026).
693. **Personal effects:** the `person` table's `personal` entry picks one of 20 in-world plot items (`personal_items`: "a ration tin with a Wick sticker", "a letter home, unsent", "a Lumeri prayer card"…), evenly.
694. **Always-drops:** the weapon in the main hand, unless natural (`natural_weapons`: fists, the beast's bite) or unknown; durability a whole percent from 40 to 80 of the weapon's maximum at its rarity (`worn_durability`; a weapon with no durability drops as it is, a thrown one as one); the rounds loaded stay in it with their type. The spare magazines: the 2 fullest with any rounds left, with their types. A weapon loaded round by round: its loose rounds, at most 2 × its capacity (`spare_mags_max`).
695. **The loot cap:** rolled items a fight by difficulty (`caps`: easy 2, standard 3, hard 4, boss 5), counted in the order enemies die; one entry is one item whatever its qty. A roll past the cap is not made into an item; the fight's host-only `lootLog` gets "loot cap reached" with what was skipped. Certain entries in a `drops.items` list (no `chance`, or 1) are given, not rolled: they are outside the cap, like the always-drops.
696. **Boss notable:** every boss death rolls once on `notable` (no empty weight), outside the cap, whatever its `drops` say. A campaign may replace the table.
697. **No drops:** a surrendered or subdued foe (even if killed later), a companion, a unit on the player's side or a player's own fighter (the Proving Ground's team fight), a Twin, the sentry turret; illusions are not units. Deaths on the area map's own sweep roll nothing (only fights roll).
698. **Inline lists:** the Narrator's at most 4 entries a `drops` (`inline_max`; the rest are ignored); qty 1–20 or [min, max] within 1–20; chance 0–1; rarity one of the five; an unknown table id is ignored (the engine default stands); a plot item written the way `loot[]` writes one (item "", a name and a line of text) is kept and drops as that plot item, and an entry with neither an id nor a name is dropped. Campaign lists have no count limit but are validated (`validateCampaign`: unknown table, an unknown item id with no name, a bad qty, chance or rarity).
699. **When and where:** in the death sweep (`noteDeaths`) on the fight's dice, so the same seed and actions give the same drops; into the pile on the death tile (the 24-entry cap applies); one log line per death, "<name> drops: …", which the end-of-fight report's key moments keep. Review fix: a Shade's silent takedown on the area map (no fight opens) runs the same sweep, so the victim's drops lie in the pile on its tile on the area map.
700. **Labels in the drop line:** the weapon "(worn)", a magazine "magazine 9/12", rounds "38 × .32 Decrkm", anything else its name; nothing at all leaves no line. Review fix: in a pile's list (hover, checklist, Near you, the Narrator's ON THE GROUND) a weapon also says the rounds in it and its wear ("Service pistol · 9/12 loaded · worn 62%"), and loose rounds of a calibre named only for a gun say rounds ("30 × Rifle rounds").

**Rules revision 1.6.1: Faith 2.1 (9 Nov 2026; decision 107; `docs/design/faith-2.1-spec.md`). Numbers and readings where the design was silent. PROVISIONAL.**

701. **Devotion XP and the curve.** The total XP for levels 0–10 is 0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450 (the design's 152, 212, 277, 347 and 432 for levels 6–10 were tuned by the pace simulation, item 717). XP stops at 450. The level stays in `devotion` for old readers; a level written on its own (an old save, an old writer, the Proving Ground's stepper) reads as that level's threshold. *Data: `patrons.json` devotion.xp.curve.*
702. **The sources in XP:** a liked tag +1, a vow kept +3, a rite kept +4, bringing someone into the faith +4 and a deed +2 to +5 (both the Narrator's), a taboo −3 (−6 while Witnessed), a vow broken −5, a failed overreach −3, breaking character where the patron can see −6 (the Narrator's), Judgement −10, a Miracle all of it (*rules 1.6.2: 5 levels, item 725*). *Data: devotion.gain and devotion.loss (losses written as positive numbers).*
703. **The tag caps:** 2 XP a fight, 2 XP a scene out of fights, 6 XP a session from tags in all; each liked tag once per fight and once per scene. A fight and the scene it happens in are separate (a fight's tags don't use up the scene's 2); the session's 6 covers both. Caps count the XP before a grudge's multiplier. *Data: devotion.tag_caps.*
704. **Where the caps live:** on the character (`faithTally`: the session, the scene with its XP and liked tags, the fight's id with its XP and liked tags, the last action's tags), reset by a new session and (the scene part) a new scene (`story.scene.n`). A fight's id is set when it starts. A tag counts once per action, keyed by the reducer step, the round and the turn and kept on the character, so the area map's rebuilt units can't reset it. The area map counts toward the scene. The Proving Ground's reset clears the tally.
705. **The Narrator's devotion op:** −6 to +5 XP a call, with a reason. Sent directly (`faith/devotion`) outside that range it is refused; in a turn (`faith`, and the legacy `patrons`) it is clamped. Gains are capped at +10 XP a session per character: a gain over the cap is cut to what is left, and refused once nothing is left; losses aren't capped. The cap counts the XP asked for, before a grudge's multiplier. A refusal in a turn is logged out of character. *Data: devotion.narrator.*
706. **Judgement** spends 10 Devotion XP (its "1 Devotion") and needs 10 XP; it can drop a level. *Data: classes.json, the move's resource effect −10 (unit xp).*
707. ~~**The Miracle** sets Devotion XP 0 and Devotion 0, after its effect (its own tags give nothing back). Climbing back to 7 takes 200 XP, about 10 sessions at the target pace: the Miracle's real price now (for Leon at review).~~ *Superseded in rules 1.6.2 (Leon, 9 Nov 2026): items 724–726 (the Miracle at Devotion 10; it lowers Devotion by 5 levels; the pace).*
708. **Conversion:** Devotion 3 + 1 level for each piece of the new patron (at most 10), the XP set to that level's threshold. A pact clears a sworn vow.
709. **The day counter:** `g.day`, from 1 (old saves: 1). A long rest adds a day; the start of a session doesn't (it counts as a long rest only for recovery). The Narrator's turn field `days` adds 1 to 3650 days: rounded, clamped to 3650, ignored under 1. A turn's rest and days come before its faith ops (review fix, 9 Nov 2026: a time skip and a pact in one turn work; they used to come after, and the pact was refused).
710. **The cooldown after apostasy:** no pact with any patron (the one left included) until the day counter reaches the day they left + 90; the refusal names the days left. The Proving Ground's tools ignore it. *Data: devotion.apostasy.cooldown_days.*
711. **A direct switch** (a pact while Faithful to another patron) is not apostasy: no cooldown, no APOSTASY line. The old patron's Hymns stay as pieces counted as apostasy counts them (one per Hymn gate reached, at least 1, never fewer than already held), unless the new patron is Jealous (then all are gone).
712. **The leave roll:** an Open patron rolls d20 + Faith modifier against its leave TN, a natural 20 always letting go and a natural 1 never: Mother Ember 10, the Quartermaster 11, the Matchmaker 11, the Laughing Mask 12, the Counting Weaver 12. Jealous patrons never let go (no roll). A patron with no leave data (one added at run time) lets go. *Data: each patron's leave block.*
713. **Grudges:** Nerukhan Marked 2 rounds, 3 sessions; the Quartermaster Nausea 1 round, 1 session; the Laughing Mask Prone, 1; the Toll-Keeper Slowed 2 rounds, 2; Mother Ember Shaken 2 rounds, 1; Old Overcast Dazed (the first turn), 3; the Matchmaker Weakened 1 round, 1; the Counting Weaver Pinned 1 round, 1; every grudge ×0.5 XP. The condition lands on the character (not a companion) at each fight's start with no save. The multiplier applies to every gain (tags, vows, rites, the Narrator's), the fraction carried to the next gain. It lasts the rest of the session it began in and its sessions after that (so a light grudge is never shorter than one full session, whenever in a session you switch; the design's "1 session" read that way), and is announced over when the next session starts (item 721); apostasy ends it too (item 720). One grudge at a time (a newer one replaces it); going back to that patron ends it. *Data: leave.grudge.*
714. **Farewell:** the patron left speaks a line from its farewell bank on apostasy and on a switch (let go or not), before any grudge. Ten line banks of 3 lines per patron (eleven from rules 1.6.3: the grant bank, item 745).
715. **Old saves:** faith rules revision 17. Devotion XP is set to the saved level's threshold (Devotion 6: 147 XP); no tally, no cooldown, no grudge; day 1.
716. **A failed overreach** costs 3 XP everywhere: in a fight, in the story and in Blessed Shells' story prayer.
717. **The pace simulation** (`packages/engine/test/faith-pace.test.ts`), the typical session: 2–4 fights and 2–4 scenes out of fights (about 3 each); a vow sworn in 80% of fights and kept 85% of the time; each of the patron's 3 liked tags comes up in 60% of fights and 30% of scenes; a taboo in 10% of fights and 5% of scenes; the engine rite every session and the Narrator rite in half (1–2 rites); one Narrator deed of 2–5. That is about 18 XP a session. Over 40 seeds Devotion 5 lands at session 3.6 on average (3–5), 7 at 9.0 (8–11), 10 at 23 (20–28). With the design's curve 7 landed at 9.7 (up to 12) and 10 as early as session 19, so levels 6–7 came down (152 → 147, 212 → 200) and the top went up (432 → 450). *Rules 1.6.2: the Miracle's pace is item 726.*
718. **Heretic's Stolen Fire** puts back the Devotion XP, the tag tally, the pact cooldown and the grudge along with the rest of the faith it borrows.
719. **A switch never raises Devotion.** A pact while Faithful to another patron starts the new pact at the lower of the Devotion XP held and the conversion's (Devotion 3 + 1 level a piece, at that level's threshold): Devotion 8 becomes 3 (45 XP), Devotion 0 after a Miracle stays 0 (*rules 1.6.2: a Miracle now leaves Devotion 5, and a switch keeps it at most there*), 1 stays 1 (its XP kept). An Atheist's conversion is unchanged (item 708). Without this, two pacts in a turn took a character from a Miracle's 0 back to Devotion 4 in the same session, and a switch was a cheaper way out than apostasy's 90 days. The pact's log and fx give the real change (from the old XP and level). *Review fix, 9 Nov 2026; for Leon with item 707.*
720. **Apostasy ends a grudge.** A grudge lobbies against the new patron's Devotion (spec rules 1.6.1); an Atheist has neither, so leaving the pact ends it, with a line. (A later pact starts clean.) *Review fix.*
721. **Next session.** A room's session counter moves on only when the host ends a session: `session/next` (Rest… → Next session; host only, in the story, out of a fight, not in the Proving Ground). It runs what a session's start runs (recovery as a long rest, Echo 1, `session_start`: rites, the Miracle, the tag and Narrator caps and grudges count from the new number) and is not a day (item 709). Before it, `session/start` ran only from the lobby and nothing returned a room there, so a grudge never ended and the session caps lasted the room's life. *Review fix; the product's first session boundary.*
722. **The Proving Ground's tag caps:** it has no sessions, so the session's 6 XP doesn't apply there; the fight's 2 and the scene's 2 do, and the tools' reset still clears the tally. The faith tab shows the caps ("LIKED TAGS · 1/2 THIS FIGHT · 4/6 THIS SESSION", "CAPPED" once one is reached; no session part in the Proving Ground). *Review fix.*
723. **A grudge's condition in the fight:** it lasts its rounds of the bearer's own turns whatever the initiative (landing before the first turn doesn't count as "on your own turn"), and it ends with the fight: Mother Ember's Shaken is not carried into the story as a scene's Shaken (and so not into later fights). The same condition put on again by something else in the fight is a real one and carries as usual. A story condition carried into the fight merges with it (the longer stays). *Review fix.*

**Rules revision 1.6.2: Miracle 2.1 (9 Nov 2026; Leon's ruling: "Buff all miracles to deserve the title, miracle only at 10 and it reduces your devotion by 5"; decision 107; `docs/design/faith-2.1-spec.md` section 7). Numbers and readings where the ruling was silent. PROVISIONAL.**

724. **The Miracle's gate:** Faith 7 and **Devotion 10**, once a session; Atheists never; no overreach. Devotion 7 now opens Hymn III only (the gates are Hymn I 3, II 5, III 7, the Miracle 10). The refusal names the number ("A Miracle needs Devotion 10 (you have 9)."). *Data: `patrons.json` devotion.gates.miracle 10 = prayer.miracle.devotion_min; the validator checks they agree and sit above Hymn III.* Supersedes the gate in item 707 and rules 1.6.
725. **The Miracle's price:** it lowers Devotion by **5 levels**, after its effect (item 621's order): the XP is set to the threshold of the level 5 below the level held after the effect (10 → 5: 450 XP → 102), so the XP into the level goes too; through the one choke point (logged "−348 Devotion XP (the Miracle: Devotion −5 levels): DEVOTION 5", an fx event). Its own liked tags give nothing back (XP is at its 450 cap while it lands) and use none of the fight's or session's tag caps (item 737). In the story the price is paid after the effect too (it used to be paid before). A switch afterwards never raises it (item 719). The Guardian's Judgement is unchanged (item 706). *Data: prayer.miracle.devotion_cost_levels 5 (whole levels, 1 to the gate); "spends all" is retired (the validator refuses `spends`).*
726. **The pace** (`packages/engine/test/faith-pace.test.ts`, the item 717 session run for 80 sessions over 12 seeds, the Miracle prayed in the first fight of a session that finds the character at 10): the first Miracle at session 22.6 on average (21–25), then one every 19.3 sessions (17–22; 5 → 10 is 348 XP at about 18 XP a session); 3–4 Miracles in 80 sessions. Never before session 20. Asserted loosely (first after 19 and by 32; gaps 12–26, averaging 17–21). The rules text says "about every 19 sessions" (item 737).
727. **Scaling:** every Miracle number that is damage, a heal or a shield is × Blessing power (1 + 0.1 × Faith with items: 1.7 at Faith 7), as Hymns are. Rounds, AP, half HP, full HP, cores and the restock aren't scaled. Item 97's "×3" predates Blessing 2.0 and is not applied: 100 Soul × 1.7 already kills every tier but a boss (minion 30, soldier 60, elite 100, boss 200 HP). **The Saints' Verdict:** every enemy in sight (not Hidden, not surrendered) takes 100 Soul and is Stunned 1 round, no save; one that harmed the helpless this fight (item 622) takes 200 and is Stunned 2 rounds. Each lands through `blessing_in` (Blessed Shells, Factory Made, The Old Blood).
728. **Requisition Approved**, for every character on the squad (not a companion; the Downed too): every magazine full (the loaded one and each spare, and at least as many spares as the fight began with), loose rounds and throwables back to at least what the fight began with (the engine keeps that at the fight's start), Supplies to their maximum, **2 standard cores** (into the Evoker kit's spares when the unit carries magic, else the pack), every weapon carried at full durability (the main hand, the off hand, the pack), no jam, no heat; and **+3 AP next turn**. The +3 is banked AP: it counts toward that turn's +3 perk-AP cap and the ceiling of 9 (6 + 3 = 9), so any other perk AP that turn is lost to the cap (the log says so); Stunned and Dazed still come off it. The writeback keeps what the fight's rules keep (no more loose rounds or throwables than you carried in).
729. **Encore:** each ally (the one praying too) whose last action this round cost AP may repeat **that action** once for free: the same action type and kind (an attack's mode, a move's kind, a perk's id…), any target. It is lent the AP the action cost then (so it can be taken with too little AP); if the repeat costs more now, the rest is paid. It lasts until the end of the ally's next turn (the one praying: the rest of this turn), and ends unused with a log line. Prayers, ending a turn and declining a window can't be repeated; an ally who hasn't acted this round gets nothing. Every enemy in sight is Confused 1 round, no save. *Engine: the Encore key is kept on the unit after each action; the reducer lends and settles the AP (encoreBefore/encoreAfter).*
730. **Turned Back at the Shore:** every ally who died or is Downed (fell) in this fight stands at half HP (rounded up), death saves cleared, the character no longer dead. No target to pick. Surrendered allies aren't touched.
731. **Everyone Home:** every ally not dead (the Downed stand) heals to full (whatever trims a heal), every harmful condition ends (every non-boon condition, and Prone, Bleeding, Dazed and a fumble's stagger; boons such as Inspired stay; a grudge's condition ends too), and each gets a 40 shield (× Blessing power; shields don't stack: the larger stands).
732. **The Sky Answers:** a tile in sight; the 5×5 around it; the sky picks: only enemies (alive, not surrendered) in it take 150 Storm (Elemental, lightning) and are Stunned 1 round and Shaken, no save. Allies in the area are untouched. The fx area is the 25 tiles.
733. **Love Conquers:** every enemy in sight that can yield surrenders at once, no save (a refused parley doesn't matter). One that can't yield (a boss, a machine, robot, turret or drone, or no_surrender) makes a Heart save (TN 12 + the praying character's Heart debuff) or is **Commanded to hold** for 1 round: the engine's Commanded with the order hold (no attacks on its next turn), the closest engine-run reading of "Commanded" for a patron's order to a boss.
734. **Rewoven:** each ally's HP goes back to what it was at the start of this round, if that was higher (a Downed ally stands at it; the dead stay dead: that is the Toll-Keeper's); then every living ally takes another full turn right after this one, in initiative order, this round only (item 614). The round's HP is kept on the fight at its start and at every round's start.
735. **Miracles in the story** (item 624): Everyone Home heals the squad to full and ends their story conditions (the shield is a fight's); Requisition Approved fills the loaded magazine and the spares, gives 2 cores, repairs every weapon and fills Supplies, and its throwables and +3 AP go to the Narrator with the text; the other six are the Narrator's to rule (a pending ruling with the text and the power). Every story Miracle pays its 5 levels after its effect.
736. **What this supersedes:** the gate and the reset of items 702 and 707, Encore in item 614, Turned Back and Love Conquers in item 617, and item 621's "spends"; the Miracle texts in the patron table. Every Miracle number is still for the balance pass (item 592). *Data: `patrons.json` items[].miracle text and effects (new bespoke ops `repair_gear`, `clear_jam` and `rewind_hp` in `effect_ops.json`).*
737. **Miracle 2.1 review fixes** (9 Nov 2026), PROVISIONAL with the rest: (a) **Encore** remembers each unit's last action that can be repeated *and cost AP* this round; ending the turn, declining a window, a prayer or a free action never replaces it (an ally who acted and ended its turn used to lose its repeat). (b) **The lend in the previews:** the attack preview, the perk list and the move range count Encore's lent AP for the matching action, so the client offers the repeat even with too little AP and marks it "FREE · ENCORE"; never twice inside the reducer's own action. (c) **A Miracle that would find nobody is refused**, so its once a session and its 5 levels aren't spent: Turned Back with nobody fallen ("Nobody has fallen this fight."), The Saints' Verdict or Love Conquers with no enemy in sight ("No enemy in sight."), Encore with nobody who acted this round and no enemy in sight. Out of a fight they still go to the Narrator (item 735). (d) **Turned Back** never raises a companion (a drone, turret or pet): a destroyed companion is repaired or healed in the story first, as before. (e) **Rewoven** takes its extra turns from the round's own initiative, once each: two Rewovens in one round give each ally two extra turns, not a doubling. (f) **The log** reads the Miracle first, then its price. (g) **Tags at the top:** a liked tag that lands while Devotion XP is at its 450 cap gives nothing and uses none of the fight's, scene's or session's tag caps (the Miracle's own kill or storm used to eat the fight's cap and 2 of the session's 6). (h) **The pace** is written as measured (item 726): a Miracle about every 19 sessions (17–22), not 17–19.

**Rules revision 1.6.3: Faith 2.2, "the god shows up" (9 Nov 2026; Leon's ruling: "Witnessed change to after a hymn, last forever until end of combat or the intervention trigger"; decision 111; `docs/design/faith-presence-spec.md` section 1). Numbers and readings where the ruling was silent. PROVISIONAL.**

738. **Witnessed lasts until the fight ends or the intervention fires.** A successful Hymn of your own patron (by standing, or an overreach that lands; never a Hymn prayed by dice) or a Miracle, at Faith 5, makes you Witnessed; it no longer ends at your next turn. Another such Hymn while Witnessed changes nothing but the patron's line (it doesn't stack). It ends with the fight and is never carried into the story; story prayers still don't give it (item 604); Whispers never do (item 608). **Flag for playtest:** its +2 (item 595), taboo ×2 (item 702) and Under the Eye (item 339) now last much longer and may need tuning. *Engine: the condition doesn't tick (`noTick`, like Emplaced). A fight saved under the old rule keeps its old Witnessed, which ends at that fighter's next turn as it would have. Data: `conditions.json` witnessed (duration, ends_on, text); `patrons.json` prayer.witnessed.until.*
739. **An intervention ends Witnessed**, after its effect: the condition ends (logged "<name> is no longer Witnessed"), so a second intervention needs another successful Hymn (or the Miracle). The patron's intervention line is spoken as before.
740. **Once a fight; twice from Devotion 7.** Each Faithful fighter's interventions this fight are counted on the unit; the limit is 1, or 2 when the character's Devotion is 7 or more at the moment the trigger happens (a fighter who falls below 7 after the first has used its one). The Proving Ground's reset clears the count. A fight saved under the old rule (one intervention flag) counts it as one used. *Data: `patrons.json` prayer.intervention per_fight 1, per_fight_high 2, high_from_devotion 7.*
741. **The numbers scale with Devotion:** Nerukhan's Soul, Mother Ember's heal and Old Overcast's Storm are 20 + 4 × Devotion (the Devotion when it fires: 32 at 3, 48 at 7, 60 at 10), × Blessing power (1.7 at Faith 7: 82 at Devotion 7), rounded. Supersedes item 620's flat 20 Soul, 15 heal and 20 Storm. *Data: prayer.intervention.amount (base 20, per_devotion 4); each scaled intervention has `scale: "devotion"` and its effect's per_devotion; the validator checks they agree.*
742. **The Quartermaster: you reload, your core runs dry, or your MP runs out** (Leon, 9 Nov 2026). Three triggers, one patron's intervention (they share the fight's limit, and each ends Witnessed). (a) **A reload:** your own reload action in a fight, any hand (main, off or both) and either way (speed or tactical, item 679), happens as usual and all its AP comes back. A reload that cost no AP (Resupply, Requisition Approved, a reload done for you) doesn't trigger it, so it can't fire on its own refund. A refunded reload cost nothing, so Encore doesn't take it as the last action to repeat (item 737). (b) **Your Evoker's core runs dry:** its charge goes from above 0 to 0: a fresh core from the Quartermaster slots into the Evoker (full charge, 10), free: no AP, and your spare cores are untouched. (c) **Your MP runs out:** an Emanator's MP goes from above 0 to 0 (rounded as the sheet shows it): you get 25% of your max MP back, rounded down. The engine remembers each fighter's charge and MP after every action and at every turn's start, so a fight begun at 0 isn't "running dry", and a drain off your own actions is caught by the next action or turn. The old trigger (your gun runs dry: a free reload) is retired. *Trigger ids `you_reload`, `core_dry`, `mp_out` (patrons.json `triggers`; each effect names its trigger with `when`; the MP share is the mp_out effect's value 0.25).*
743. **The Laughing Mask: an enemy misses you.** Any attack by an enemy at you that misses (the engine's miss, a fumble included, and one Foreknowing turned aside) makes the attacker fall Prone, no save, wherever it stands. A shot that cover stops is not a miss (as everywhere in the engine). In a burst or auto volley the first missed shot fires it. Supersedes the natural 1 trigger. *Trigger id `enemy_misses_you`.*
744. **The fx event** for every intervention is `intervention {unit, patron, trigger, target, amount, at}`: the unit whose patron acted, the trigger id, the unit it acted on (or null), and the number it moved: the scaled Soul, heal or Storm (before the target's own reductions), the AP refunded, the charge loaded (10) or the MP given back (the Quartermaster), the share of the hit moved (the Matchmaker), 1 (the Toll-Keeper's HP kept), or null (the Laughing Mask, the Counting Weaver). The web plays it (today the existing float; the patron's small cut-in is the design's section 3, for later).
745. **The grant bank** (the 11th: 3 lines a patron, in its costume's voice): when a Miracle is answered, in a fight or in the story, the engine picks one with the game's dice and replaces `{name}` with the character's name in capitals ("VESS. REQUISITION RECEIVED, STAMPED AND APPROVED. SIGN HERE."). It is logged as the patron's words after the Miracle's line and before its price; the Miracle bank still speaks after the price. *Data: `patrons.json` line_banks gains grant; the validator counts 11 banks of 3 and checks each grant line has `{name}`.*
746. **The Miracle's fx event** carries what the web's cut-in needs, so it needs no engine call: `miracle {patron, id, at, area, unit, char, name, text, line, summary}`: the Miracle's name and text, the grant line (already substituted) and the summary of what the engine applied (the Miracle's effect line from the log; in the story, what the engine applied, or "The Narrator rules the rest." when the rest is the Narrator's). The event is put on the list before the Miracle's effects (so the cut-in plays first) and its summary filled in after them.
747. **The patron's own act is not the devoted's deed** (review fix, 9 Nov 2026). While an intervention's effect runs, (a) it can't set off another intervention from the same Witnessed: Old Overcast's Storm that downs the next foe at Devotion 7 is one intervention, not two, and the second still needs another Hymn (item 739); (b) what the patron does pays the devoted no tag: no Devotion XP (Mother Ember's heal is no Heal, Old Overcast's Storm no Storm and its kill no Kill) and no taboo, as a Miracle's own tags pay nothing back (items 725, 737); (c) it marks no one for harming the helpless and breaks no Mercy vow. The Matchmaker's share stays a protect (item 600): the devoted takes that hit in the ally's place. The log reads the intervention first, then "<name> is no longer Witnessed", once. **Question for Leon (item 738's flag):** Witnessed's +2 to liked attacks (item 595) and the Guardian's Under the Eye (+2 to hit for allies within 3 tiles, item 339) now last the whole fight off one 3 AP Hymn and stack (+4). Built as ruled ("last forever"); if they should keep their old span (to the bearer's next turn) while Witnessed itself lasts, that is a separate timer for the riders.

**Rules 1.8: Outburst 4.0** (decision 109; `docs/design/outburst-4.0-spec.md`). Numbered from 801 so they don't collide with items 671–700 (World Play 1.1) and 701 on (Faith 2.1), written on other branches at the same time. Every number here is provisional, for the damage balance pass.

801. **Feeling steps, residue values and practice thresholds** (the design's open item 1): every step in the feelings table, the residue's 5 a turn, heal 5, +1, +2, −1, −2 and its 2 rounds, practice 1 + stages past 1 + feelings, the thresholds 5 / 15 / +15, and Mastery's +5 (`data/feelings.json`, `soul_modules.json` `practice`).
802. **Storm Hand's Infusion and Discharge use the Soul multiplier** (they used the Elemental one): the gauntlet is an Emanator, and the design says Outburst tones use the Soul multiplier only. The class is shelved.
803. **Stage 0 is ×0.8 for every release at stage 0**, not only the one-action snap cast: a Begin released at once in two actions is the same spell, and two prices for it would punish the interface.
804. **A feeling pump's arithmetic:** the multiplier is the stage table's plus (step − 0.4) for each feeling pump, so every other way to gain a stage (the swell, Feeding, Overdraw, Heart Surge) stays a plain +0.4 step, and anything that reads the stage still works. Steps that depend on the moment (Pride by the stage reached, Despair by HP missing, Loneliness and Belonging by allies near, Spite by the target) are read at the release. A Resonance bonus and items' multipliers apply on top, as before.
805. **A feeling pump's price** is a plain Pump's (1 AP, or a free one); Rage's +1 and Abandon's +2 Strain are added at the pump (Quiet halves them with the rest of the hold's Strain; Eye of the Storm's "no Strain" covers them).
806. **Behaviour once, step each time:** a feeling poured in twice applies its behaviour once; its step counts each time. Behaviours on "targets" reach the creatures the primary school landed on (a missed Bolt carries none); Love's and Hope's reach the allies inside the shape.
807. **Residue** is a zone (`kind: 'residue'`) on the release's area for 2 rounds (counted down with the round, like a field). Helping residue works for the caster's side only, harming residue for anyone. Per-turn effects land at the start of the stander's turn; on-entry effects when it steps in (a turn started there is not an entry). A tile holds one residue; the newest replaces it.
808. **Revert Pump** keeps an undo stack for the turn: each entry the AP paid, the free Pump used (the fight's first, Empathy's or an item's), the feeling and the Strain added. Anything that ends the hold (a Release, Let go, a Mana Short) clears it; Feeding and the swell are not pumps and can't be reverted.
809. **Who feels:** player characters who can cast Outbursts (an Outburst design, or a known school). Enemies and companions don't. Characters made before rules 1.8 get Rage and Love once, when their Soul magic is next read (`soulRev` 18).
810. **The 13 new modules' numbers and readings:** Split at full power on the second target (Bolt only; a Lance or an area ignores it); Ricochet's bank shot within 2 of the aim; Fuse waits until your next turn's start or an entry into its area (the fuse is lost if you are Downed first); Return's second strike rolls again; Volley ×0.4 per bolt; Bloom on Burst and Aura only; Anchor Pinned 1 round with a Body save; Lure 2 tiles; Shell the release's power × 0.5 as a shield; Linger 5 a turn for 2 rounds; Quiet half the hold's Strain and ×0.8; Silent keeps you Hidden through Begin, Pump and Release: under rules 1.8 a hostile release reveals a Hidden caster, as a harmful Sigil does (Outbursts revealed nobody before); Thread once. Module costs: Split 15, Ricochet 15, Fuse 10, Return 20, Volley 15, Bloom 20, Anchor 15, Lure 10, Shell 10, Linger 15, Quiet −5, Silent 10, Thread 10 MP.
811. **What the gates gate:** learning (practice picks, Mastered picks, Heart plates, an ally or tutor teaching), not designing with a module already known. Move, Random, At Once and Split sit under Empathy (the design spec leaves them unassigned; Empathy "gates the design itself"). The Narrator's grants and the Proving Ground's tools ignore the gates.
812. **Mastery's practice and picks** read the six gate skills only (Lore Master, Will Power, Empathy, Camaraderie, Implication, Composure), since those are the skills Soul magic is built on; Faith, Conscience and Authority (Virtue) feed the Blessings. Practice from Mastery is derived from your points, so it is never lost or doubled; practice from releases is kept on the character.
813. **The starting designs:** Heart Bolt (Damage), Mend (Buff, heal) and Heart Wave (Control, push, Wave). A picked starting design replaces Heart Bolt; ready designs are at least 3. A character made before rules 1.8 keeps its designs and gains the missing templates while it has room (`soulRev` 18).
814. **The fight's free first Pump** is spent before Empathy's free Pumps and before Shape's; it comes back at the start of each fight, not each round. Player characters only (not enemies, companions or the Twinbound twin), and not on the area map (no fight).
815. **Feeling triggers the engine reads** (item 809's characters): Rage from one hit's HP damage after armour and shields; Grief from an ally of your side (not you) Downed or killed in your fight; Fear when a fight starts with an Elite or Boss among the foes, or when Afraid lands on you; Love from a heal or shield of more than 0 on an ally (not yourself); Joy and Shame from a natural 20 or 1 on any d20 you roll (attacks, spell rolls, story checks); Calm at the end of a turn you Steadied in or ended at 0 Strain; Spite from damage by an enemy; Pride from taking down an Elite or Boss; Despair when one hit takes you from a quarter of your max HP or more to below it; Hope when you are back up from Downed; Mercy when a foe surrenders to you because of you (talked down, or spared by a non-lethal blow: the engine has no separate "accept", so the surrender you brought about is the one you accepted); Cruelty when you hit someone Downed, Stunned, Pinned or Grappled; Loneliness when everyone else on your side is Down or dead and you stand; Belonging at the start or end of your turn with 3 allies within 2; Dread when a Hidden attacker hits you or a trap or hazard goes off on you; Awe when a Miracle is worked or a Grand form Evoked within your sight; Longing at a scene start with your Heartbinder link's ally dead or away (else the Narrator); Relief at the end of a fight your side wins with nobody of it Down or dead; Contempt when an enemy gives up some other way while you were its last attacker (there is no flee rule yet, so fleeing waits for one); Guilt when you damage an ally; Jealousy when an ally takes down a creature you damaged this round; Wonder when a hidden thing is revealed to you (a reveal, a spotted trap) or you enter a zone for the first time; Defiance when you resist an Overreach or pass a save against Afraid; Abandon when you indulge an Overreach.
816. **Mercy's surrender roll:** d20 + the target's Heart save against 12 + your Heart debuff strength (the Status school's save); a surrendered enemy is out of the fight as the surrender rules say.
817. **Dread's "can't see Hidden things for a round"** runs as: the targets lose every reaction this round and their Overwatch. Sight for Hidden creatures is per side, not per unit, so a single foe can't be blinded to them yet; the rest waits for per-unit sight.
818. **Hopeful** (Hope) is +2 to the next attack or spell roll, spent on that roll, at most 2 rounds; **Scorned** (Contempt) is −2 to attack the one who scorned you, 2 rounds, no save.

**Rules revision 1.10: Sigil 1.5, strokes (9 Nov 2026; `docs/design/sigil-1.5-spec.md`). Readings where the design was silent. PROVISIONAL.** Sigil 1.5 was written on its own branch as revision 1.9 with items 671–693; World Play 1.1 reached develop first with the same numbers, so Sigil 1.5 is revision **1.10** and its items are numbered from **901** (clear of World Play 1.1's 671–700, Faith 2.1's 701 on and Outburst 4.0's 801–818).

901. **The stroke picker's default:** the stroke among those the glyph could extend that holds your most recent glyph; if none holds a glyph of yours, **new Line**. So an ally's stroke is extended only when you pick it (or after you have drawn into it once), and a lone glyph of yours next to you is extended by default (pick **new Line** to keep them apart). An explicit pick the glyph can't extend is refused.
902. **A Stack's second glyph** joins the stroke of the glyph already on the tile (no pick); the stroke's length counts tiles, its words count glyphs (a spell still holds at most 4 glyphs).
903. **A split stroke's ids:** whatever removes a glyph from the middle of a stroke (Scuff, a fade, NULL, an Evoke that spares a Keystone) splits it; the part holding the stroke's oldest glyph keeps its id, every other part takes a fresh one named after its own oldest glyph. A Keystone left behind by an Evoke is a stroke of one glyph and can be extended again.
904. **Old glyphs** (drawn before 1.10, with no stroke) never join a stroke and no stroke joins them; they keep the 1.4 touching-group reading among themselves until they fade. Saves are not migrated (no glyph is dropped).
905. **Enemy casters** draw their Lines as strokes (the first glyph a new Line, then extending it), so a Line of theirs is no longer spoiled by a glyph of their side beside it.

**Rules revision 1.10: Sigil 1.5, study and word mastery (9 Nov 2026; `docs/design/sigil-1.5-spec.md` sections 2 and 3). PROVISIONAL.**

906. **Study per Evoke:** 1, +1 per glyph past 2 (a Stack's glyphs count), +1 if the spell struck an enemy (a damage roll that hits, or an Affliction, Boon or Working that reaches an enemy, saved against or not; a miss counts nothing, and a trap or turret placed strikes nothing yet). An Evoke that fizzles earns no study and no use count (no farming at empty ground). Enemies and companions earn nothing. Kept on the character (`sigilGrowth`), across fights and sessions.
907. **Study thresholds:** the 1st pick at 6 study, then every 8 more (6, 14, 22, 30…); the balance pass may change both (design open item 1).
908. **What a pick can learn (reading):** any of the 40 words you don't know, within your cap of 4 + Brain Power ("a word of your choice"). Copied words (the known-to-study list) are listed first; a copied word is guaranteed learnable even with no tutor, plate or ally. *Leon to confirm; the stricter reading (a pick only teaches a word you have a source for or copied) would make copying the only way past the bonus sources.*
909. **Banked picks:** a pick with no free slot waits (no limit on how many). Learning is out of combat only; a pick is not a bonus source and doesn't take the scene's one new thing.
910. **Copying a glyph:** Read is the Analyze action aimed at a glyph or a trace (2 AP, 1 with Quick Read; range 4 + Analysis; line of sight; no roll): +2 study and the word on your known-to-study list, for each glyph or trace on the tile that holds a word you don't know (a second glyph of a word already on the list pays its +2 too: the limit is per glyph, not per word). Analyzing an enemy also copies the glyphs it has drawn within your Analyze range (no extra AP). On the area map too. A glyph's trace keeps the glyph's copy marks.
911. **Traces:** a glyph you scuff leaves a trace of its word for 2 rounds (a NULL or a fade leaves none). Traces can only be read; they are not glyphs.
912. **Mastery study counts levels already reached**, creation included (a character made with Brain Power 3 starts with 5 study). Each level of each of the three skills pays once.
913. **The Mastered free word:** once per skill (Brain Power, Rumination and Eloquence Mastered give up to three free words). It ignores the cap and is taken like a pick (`sigil/learn` with `free`); unused, it waits. Each free word taken raises your cap by one (`sigilGrowth.freeTaken`), so it never fills an ordinary slot, whether taken below the cap or at it, and a slot Brain Power opens later is an ordinary one. *Leon to confirm "once per skill" against "once in total".*
914. **The Narrator's word grant** takes the scene's one new thing (as a plate or an ally), within the cap; one that can't land (the scene's new thing spent, no slot free) puts the word on the known-to-study list instead, and the log says so.
915. **Use counts** are kept for the words you know (each Evoke that includes one adds 1, repeats once): Practised at 10, Mastered word at 30 (design open item 1).
916. **The 40 inflections** (sigils.json `inflection`, op `inflection` with a `stat` and a `value`) are a first draft for Leon to strike or change. They apply to the caster's spells, whoever drew the glyphs, and ride on what the spell places (fields, traps, turrets keep the caster's inflections); charge and Flux inflections lower the cost of drawing the word (never below 1 charge).

**Rules revision 1.10: Sigil 1.5, Junctions and sigil marks (9 Nov 2026; `docs/design/sigil-1.5-spec.md` sections 2.2 and 4.2). PROVISIONAL.**

917. **Junctions' gate:** Brain Power Mastered (10) on the character (design open item 3). The Proving Ground can switch Junctions on for everyone there (`sandbox/junctions`). Enemies and companions never draw them.
918. **Junction geometry:** a junction is drawn on an empty tile where it could extend a stroke (next to its end, along its axis; a 1-glyph stroke in any direction). It either extends two such strokes ("extends A and B") or extends one and starts a new stroke ("extends A + a new Line"). The pick is `junction:A,B` or `junction:A,new` on the draw action. It never joins two strokes that already share a glyph, and it is never a Stack.
919. **A junction's life:** Evoking one of its Lines takes it out of that stroke only; it fades when its second Line is Evoked. Its rounds left are the glyph's own (it doesn't refresh), and it counts once toward your glyph cap. A junction Evoked as part of a Line that fizzles leaves that stroke too (the Line is spent).
920. **Evoking from a junction's tile:** the tile reads the Line of the stroke it was drawn into first; the Evoke may name the other stroke (`stroke` on the Evoke), and a junction whose first stroke is a lone glyph reads its other stroke.
921. **A sigil mark's TN** by age (fresh, old, ancient) and damage (intact, worn, broken): fresh 8 / 12 / 16, old 12 / 16 / 20, ancient 16 / 20 / 20. The default is old and intact (12). Success gives +3 study (copying a glyph in a fight gives 2: a mark costs a check and 2 AP). Numbers in objects.json `sigil_mark.mark`.
922. **Investigate's limits:** each character tries each mark once (the approach rule); a word already on the known-to-study list gives no more study; a critical that teaches the word does not take the scene's one new thing (it is study, not a bonus source), and with no slot free the word goes on the known-to-study list with the study. A failure costs nothing more (no Flux sting: a mark is not your Evoker).
923. **Narrator grants and the rest rule:** the spec's "one per long rest from those" bonus sources is the engine's "one new thing a scene" (it takes a rest to sink in); a Narrator word grant keeps item 914. *Leon to confirm a scene against a long rest.*
924. **Level gains (rules 1.11):** odd levels +2 Skill points; even levels +1 Skill point and +1 Attribute point; a Core point at levels 3, 6, 9, 12, 15 and 18. Aim (Leon, 10 Nov 2026): a fully optimised character has at least 1 point in every skill it uses, and enough to Master two skills (an All-in build) or to Master one and hold several at 7. rules.json `character.levels.gains`; the engine reads it (`levelGains`).
925. **Old saves keep what they have:** a character already past a level is not paid the difference (no back-pay for levels gained before 1.11). *Leon to confirm, or ask for a one-time top-up on load.*
926. **Left as it was:** the XP table and the 20 levels (`docs/design/proposals/2026-11-skeleton.md`, section 6).
927. **The advanced class gates** (item 557: a hybrid at 6 and 5 across two Cores, a squared class at its attribute 9, from level 7) are unchanged and become reachable near level 7 to 9 under 1.11 (before: level 15 at the earliest for a hybrid).
928. **No Core-for-Attribute trade at creation (rules 1.11).** Every Core point is placed in a Core and the Attribute budget is 10. Before: an unspent Core point became 2 Attribute points; trading two or more was never legal (the Attribute points had nowhere to go) and trading one swapped a point worth several levels for two worth less. rules.json drops `unspent_core_point_trades_for_attribute_points`; the engine's `BUDGET.trade` is 0. Every archetype already spent all 6.
929. **Mind Without Fog gives +1 Core point** at creation (it was +2): `FOG_CORE` in the engine, traits.json `creation_points` value 1. A character made with 8 Core points before 1.11 keeps them (item 931).
930. **Class ranks need a level too (rules 1.11):** rank II at the class attribute 5 and level 6, rank III at 8 and level 12 (classes.json `assignment.rank_levels`; engine `RANK_LEVEL`, `classRank`). The Proving Ground's rank tool raises the level to the rank's as well as the attribute. A saved character below the level drops to the rank its level allows until it gets there, in a fight saved in progress too. A rank that arrives with a level is announced like one that arrives with an Attribute point ("reaches Fighter II: Riposte, Lingering Dread"), and the character's units in a running fight hold it at once. *Leon to confirm 6 and 12.*
931. **Characters made before 1.11 stay legal.** A sheet locked in under 1.11 is stamped (`rulesRev`, engine `SHEET_REV`) and must fit today's budgets. A sheet with no stamp was made before: when today's budgets don't fit it, the budgets of its day are used (a Core point for 2 Attribute points; Mind Without Fog's 2 Core points), so a saved character or a character file from before 1.11 can still be brought into a room (engine `sheetDerive`). Reopening one in creation and locking it in again makes it a 1.11 sheet. *Leon to confirm, or ask for old sheets to be refused with a reason instead.*
932. **Momentum (rules 1.12):** 0 to 3 for everyone holding a melee weapon, 5 for a Fighter; +1 for each melee strike that hits; +1 more once per technique when it differs from the last one this turn; the first technique of a turn earns no variety bonus; a Finisher needs 2 and spends all (techniques.json `rules.momentum`). *(Superseded by the rework of 10 Nov 2026, "Melee: Momentum and the chain": only the plain attack gives Momentum; a Strike or an Opener spends 1; there is no variety bonus; a fight starts with 1. The Finisher rule stands.)*
933. **Pressure's states and caps:** 0 to 4; Pressed at 2, Suppressed at 3, Broken at 4 (enemies only); players stop at 3, elites at 3, bosses at 2 (`rules.pressure`).
934. **What the states cost:** Pressed −1 to hit with ranged attacks only, and no Watch; Suppressed −1 AP for an enemy and never for a player, and no reactions that attack or move; Broken −2 AP. Protective reactions always work (Leon, 10 Nov 2026). *Not built yet: the Broken enemy's forced first action, and the Heart save to leave cover the proposal gives Suppressed.*
935. **Gaining Pressure:** +1 for the first ranged hit on a target each turn; +1 past cover the target stands against; 2 for an unseen hit with a Silent weapon (hidden pips); +1 to others of the victim's side within 3 tiles who saw a ranged kill.
936. **Losing Pressure:** 1 at the end of your turn, or 2 when against cover and unseen, or when you end closer to the nearest enemy than you began (one number, not a sum: the lead's reading); 1 for each melee hit you land; 2 from a Take used on you.
937. **Stopped once** (Leon: "gating 1 pin already did that"): ranged techniques only; until the end of the target's next turn; the save is the better of Guts and Athletics against TN 12.
938. **Ready slots:** 3 + half the attack skill, rounded down, per system. Changed out of a fight only.
939. **Drill:** 5, 10, 25 or 50 a kill by tier for everyone who hit the victim, ×3 for Defenders, Fighters and Marksmen; marks at 300, 900 and 1,800 (Leon: about two hours of fighting to a signature for a class that isn't martial). Mark I: the signature; marks II and III: a pick.
940. **What everyone knows, and creation's picks:** Cut, Shot, Aimed Shot, Overwatch; 2 melee picks (one an Opener) with Raw Power or Dexterity, 2 ranged with Dexterity; the defaults are Lunge and Sidestep, Suppress and Shift.
941. **A weapon lends its signature while held; Auto weapons always offer Burst and Rake** (the lead's readings of Leon's "cards you drag into your weapon").
942. **Off its home:** −2 to hit and no property line, for the techniques marked particular (Leon: "work a bit worse if not used on the right weapon class").
943. **Becoming Pressed ends a held Watch** (confirmed by Leon, 10 Nov 2026; the proposal only said one can't be set while Pressed): a held lane is taken back by suppressing the watcher.
944. **A technique's own Pressure replaces the ordinary +1** (Suppress: 2 in all on a hit, 1 on a miss), and **a Take's hit adds none** (the lead's readings).
945. **Every technique's own numbers** (`numbers` on each of the 58 in techniques.json: to-hit bonuses, damage multipliers, tiles, rounds, durations) are placeholders, flagged `provisional: true`, for the balance pass after every Body system is in.
946. **Damage follows what the weapon is aimed with** (Leon, 10 Nov 2026, melee answer 4): a weapon attack's multiplier is 1 + 0.1 × (the `scales_with` Attribute − 1) + 0.05 × the `hits_with` skill, in place of Strength and Raw Power for every weapon. Bare weapons use Strength and add 0.05 × both Raw Power and Dexterity (answer 5, as changed by item 953). The 0.1 and 0.05 are the old physical multiplier's, kept as placeholders. Perks and traits that raise physical damage apply to every weapon as before. Enemies without a character sheet have no multiplier, as before.
947. **Weapon mastery** (kills per weapon family, attack bonus +1 / +2, three perks) is replaced by drill. The attack bonus goes with it (confirmed by Leon, 10 Nov 2026; the engine never applied it).
948. **The old Suppressed condition** (item 83: −1 AP and no reactions, from Spray and Pray and other perks) stays beside Pressure until it is moved onto Pressure 3; the two AP losses don't add.
949. **The quiver** (Leon, 10 Nov 2026): loaded from a menu out of a fight, any mix of arrow types up to capacity, the type named per shot, no reload in a fight. Crossbows keep their reload.
950. **Enemies** have Momentum and Pressure and use techniques: the free ones, what their weapon lends, and their tier's list (enemies.json `techniques`). First lists, to grow as the techniques are built: a minion none (plain attacks only, whatever its weapon lends); a soldier Lunge, Suppress; an elite Lunge, Coup, Riposte, Suppress, Dead Centre; a boss the elite's and Deny. Where an enemy would make a plain attack it uses the technique its handler scores highest, if that beats a plain attack (5); the scores are in the handlers (`ai`). Analyze reads the technique as the intent.
951. **The Parlour pistol teaches Crossfire,** not Warning Shot as the ranged proposal's table had it: Warning Shot is not available with a Silent weapon, so the pistol could never use its own signature (found in review; the pick confirmed by Leon, 10 Nov 2026). **Dead Centre's home is Precise or Drawn** (the proposal names bows the best at Takes; with Precise alone its Drawn line could never apply). The validator now refuses both kinds of conflict.
952. **Readings made while building the core (rules 1.12):** a technique's AP is priced by the user's items as an attack's is (Southern Fist, Fire Discipline); companions, puppets and the drone use the free techniques only; a held melee strike is not a held shot (Pressed leaves it); a technique's step is the engine's own move, free and without opportunity attacks, so a Pinned, Grappled, Prone or nailed user doesn't step and traps and held shots on the way fire; Draw Cut needs the weapon stowed now (the proposal's "at the start of the turn" isn't tracked: stowing and drawing in one turn gains nothing); pulling free costs 2 AP (placeholder).
953. **Alpha, beta, gamma (Leon, 10 Nov 2026; "rules are rules").** In every attribute the **alpha** skill opens the combat playstyle and gates what you deal damage with; the **beta** skill carries defence and gates armour; the **gamma** skill is for world play and speech, and weighs more in skill checks. First application, in rules 1.12: **Agility's alpha is Dexterity and its beta is Athletics** (they were the other way round). Light blades hit with Dexterity; bare hands scale with Raw Power and Dexterity; the Critical multiplier reads Dexterity; a melee ready list and creation's melee picks read the better of Raw Power and Dexterity. Athletics keeps Dodge, its unlocks, and the saves and contests that resist being moved or stopped (with Guts, also a beta). The 0.05 a point is the old number, moved. **Characters made before this are not changed:** a light-blade build made on Athletics now attacks with Dexterity. *Leon to say whether old characters get a one-time swap of the two skills.*
954. **Still to bring under item 953** (`docs/design/proposals/2026-11-nine-doors.md`): the other skills whose points give the wrong kind of thing for their slot; the four alphas that open no playstyle yet (Durability, Ingenuity, Visualization, Empathy); gear gates (weapons and foci by the alpha, armour by the beta, tri-scale armour by two or three betas); and how much more a gamma skill weighs in a check.
955. **The crossbow (Leon, 10 Nov 2026; provisional numbers):** damage 55 (was 35); a Shot costs 3 AP and loads the next bolt as part of it; Bolt Rest makes an Aimed Shot cost the same 3. Its signature is the new technique **Heavy Bolt** (31): 4 AP, +50% damage, ignores 10 armour, a Body save or pushed 1 tile; the repeating crossbow can ready it at 1 AP less. To settle in play: 55 against the service rifle's 30 at 2 AP, and whether the other flat-cost techniques should also cost a crossbow 1 more.
956. **Two weapons (Leon, 10 Nov 2026; provisional):** the second weapon needs +2 of its skill (`gear.second_weapon_skill_extra`); two guns pool their Heat (limits added, cooling 4); two weapons of one kind have a both-hands block with nine techniques made with each weapon in turn. To settle in play: which techniques belong on that list, whether the −1 per 2 Heat penalty is too hard on a pooled bar, and whether a gun and a blade should get paired techniques of their own.
957. **Throw and Pull Out (Leon, 10 Nov 2026; provisional):** a thrown melee weapon that hits stays in its target until the target falls (it drops there) or someone next to it uses **Pull Out** (technique 28, free to everyone: 1 AP, no roll, half the weapon's damage, Bleeding, the weapon straight back into a free hand). A miss still lands on the target's tile. Flurry's Thrown line still drops its weapons on the ground.
958. **The Calls ladder (rules 1.13):** 2 AP; heard within 4 + points tiles; step 2 at 3 points; 1 AP from 5; step 3 at 7; as a reaction once a round from 9; the first Call of a turn free at 10 (calls.json `rules`). One helping and one hindering Call on a unit a round. The save is 12 + the speaker's strength (points − 1, floor 0).
959. **Each Call's step numbers** (calls.json `steps[].numbers`): Rally 1 / 1 / 2 AP and 0 / 1 / 1 Pressure; Brief −1 / −1, −1 / −2, −1; Name It +2 / +3 / +4 on every save, a fresh save from 3 points, Shaken and Afraid ended from 7 (it was 1 / 2 / all AP of loss cancelled); Cue 1 reaction, a step from 3 points, the order from 7; Spot 1 / 1 / 2 allies and +1 to hit at 7; Warn 1 / 2 / 2 tiles and −2 to hit at 7; Threaten −1 / −1 / −2 AP; Taunt +0 / +1 / +2 AP. Rally's 2 AP for 1 at 7 points is the first to watch.
960. **A Call as a reaction costs the reaction and no AP,** and is sent by the speaker's player during another unit's turn. The engine plays an enemy's whole turn without stopping, so in practice it is made on an ally's turn. The proposal names no trigger and no cost; to settle: whether it should cost its AP, and whether it needs a held form that fires inside an enemy's turn.
961. **"Your first Call each turn costs 0" is one free Call a turn in all,** when that first Call is in a skill at 10 points. A speaker with two gammas at 10 does not get two free Calls.
962. **"This round" is read as "until the start of the speaker's next turn"** for what Spot, Warn and Cue leave standing: by the round counter alone, a speaker who acts last would mark nothing. The one-helping and one-hindering limit is by the round counter.
963. **Order:** the speaker chooses the thing and the tile, not the ally's player; pick up takes the whole pile; "their Movement" is the tiles 1 AP walks them, rounded down, at least 1; the ordered move can draw opportunity attacks; two things are two different things.
964. **Brief:** holds to the end of the ally's next turn (the proposal's "this round" gave nothing to an ally who had acted); a free action doesn't use it up; what it saves counts in the +3 of AP gained in a turn; it does nothing inside an off-turn window. No enemy tier has it.
965. **Name It** cancels penalties, then Stunned's 1, then Dazed's 2, then an AP debt, and ends at that turn start whether used or not. *(Superseded, Leon, 10 Nov 2026: Name It gives +2 / +3 / +4 on every save until the speaker's next turn, a fresh save against one condition from step 2, and ends Shaken and Afraid at step 3. It cancels no AP loss.)*
966. **Cue:** the second reaction is held, not tied to the round's count, until the speaker's next turn. The step is to a tile the speaker names when Calling (the engine has no reaction that is a move chosen later). The order change applies only to an ally still to act, and is undone when the round ends. A Suppressed ally is refused, nothing spent.
967. **Spot:** the speaker's own attacks never use the mark; one attack action per ally; from 3 points a Hidden enemy in the speaker's sight can be Spotted and a Spotted Hidden unit shows to the speaker's side, but only the allies still to use the mark can attack it. Speaking doesn't reveal a Hidden speaker.
968. **Warn:** the tile is named with the Call or chosen by the engine (the nearest tile that takes the ally out of the attack; none: no step). An attack that can't reach after the step is wasted and its AP is spent. Only weapon attacks trigger it: Sigils, Outbursts and prayers do not. This makes step 1 able to cancel one melee attack for 2 AP: to watch.
969. **Threaten:** the AP loss is a turn-start penalty (the floor of 2 holds), not a debt; "can't move toward you" lasts for its next turn only, not for Shaken's 3 rounds; bosses and machines are not exempt. The old Talk action's Threaten is the same effect at 2 AP and 8 tiles, which reaches further than a low speaker's Call: to settle whether the old action should go once the Calls pad is on screen.
970. **Taunt** binds weapon attacks only, as the Taunted condition always has; a Sigil, an Outburst or a prayer ignores it.
971. **Enemy Calls:** an elite has Threaten and Rally at level 3; a boss Threaten, Taunt and Rally at level 5; minions and soldiers none (enemies.json `calls`, `call_level`). One Call a turn, only while it has an ally standing, and only when the Call scores above a plain attack (5): Threaten 6 to 6.5, Rally 6 to 6.5, Taunt 6.5 (calls.json `rules.enemy`). An enemy's save TN uses its tier's strength, not its level.
972. **What a view shows of a Call's mark:** a mark shows to the side that made it; the AP loss, the no-approach and the dearer attack that a failed save put on a unit also show to that unit's side. A side is not shown that one of its units is Spotted, nor where a warned enemy will step.
973. **The perk, unlock and trait pass (rules 1.13, Skeleton 2.0; proposal sections 15 and 18).** The rules are in "The perk, unlock and trait pass". Items 974 to 990 are its provisional numbers and the readings made while building it; each perk and unlock they name carries `provisional: true` in the data.
974. **Used to the Pain:** 25% less from the next hit when the first hit took under 20% of max HP; tier II 40% and 30%. Only the one next hit. The proposal gave no number.
975. **Walking Wounded:** 20% less damage below half HP. The proposal gave no number.
976. **Rally Cry:** 15% (II 25%) less damage, for every other ally, each until their own next turn starts; drops and holders don't stack (the best counts). The proposal gave no number.
977. **Clean Hands:** the shield is 15% (II 25%) of the holder's max HP, once a turn; shields received apply and shields don't stack. Out of a fight an accepted claim is one shield held for the next fight. The proposal gave no number.
978. **Roll With It II is 2 tiles**, as before, with the rider removed. The proposal's "a second free tile" can also be read as 3.
979. **Breaching Strike's tiers:** I is the half hit against a wall, a solid object or another enemy; II adds the same damage to the enemy it was pushed into. The proposal gave no tiers. "The hit again" is half the damage the pushing hit dealt; a push with no hit is half a plain blow with the weapon in hand. The engine sees a push that moved the target at least 1 tile and then left it against something; a target that was already against the wall is not seen until the technique core reports a blocked push.
980. **Both Hands' tiers:** I is the shot with no Recoil; II adds the Momentum. The proposal's second half read "counts as different for Momentum", which was the variety bonus the Momentum rework removed. Its reading under the new rule: a shot that hits gives 1 Momentum, once a turn, to a holder with a melee weapon in a hand. To confirm.
981. **Iron Grip II** read "earns the variety bonus" in the proposal. Its reading under the new rule: each melee technique that hits a held target gives 1 Momentum, once a technique, never a Finisher (which ends the hold). To confirm. "Held" is Grappled by you or Bound by you, next to you. The drag is one held target, into the tile you leave; what can't be moved (nailed, an item that holds it) stays behind.
982. **Read Them** is the name of Weak Point's replacement: "Read" is a class move. It applies to whoever is on the other side of the analysed unit, by weapon or spell.
983. **Case Closed** gives no bonus to hit or damage any more: the proposal names only the +2 to hit, and the +20% damage went with it as offence on a beta.
984. **Many Hands** now widens Hand-Off's Defense loan to 3 tiles. The proposal only says the AP gift goes; the old perk's 3-tile reach was kept for the new Hand-Off.
985. **Hand-Off** is automatic: the first enemy attack roll each round against an ally in reach whose Defense is lower than the holder's. A preview shows it and spends nothing. Rival's Petty check and Humanity First's refusal of AP no longer touch it (no AP moves); Humanity First still refuses AP from a Call.
986. **Stand Still** is built as Leon's 15.5 ruling (Calls 1 AP cheaper until you first act). Composure became a beta after that ruling, and its old text (−2 to be hit until you first act) is a defence that would fit a beta: to confirm which stands.
987. **Tuned:** "the weapon you maintain" is read as the weapon in your main hand. A jam is cleared the moment the attack is over, and wear stops at 1 point of Durability.
988. **Nothing Gets Past** leaves the Spot mark of the holder's own level (at 10 points: two allies, +1 to hit, not Hidden to them), takes no Call slot on the enemy, and doesn't replace a Spot the enemy already carries. Not while the holder is Silenced or Stunned.
989. **Into the Dark I** is once a fight: from the first walk onto a tile your side hasn't seen until your next turn starts. II is round 1 of a fight in a place that causes Fear. The area-map discount of item 121 is gone with the AP.
990. **Open after the pass:** Siege Engine said "Shove and Break cost 1 AP less" when both had become techniques, priced by the technique core (the discount reached neither; settled in item 1005). Proven Formula counts conditions only (a spell's damage has no save). You Get Used to It's bonus is for the save against a condition, not a technique's or a story save. Chain Smoker's Light Up (+2 Composure for the scene) is a real Heart save bonus again: to watch.
991. **Guard pool:** Durability points, 5 at most (`rules.guard.max`, `per_durability`).
992. **Guard gained:** by the Guard technique 1, +1 a Durability point above the first, +1 with a shield (`gain_base`, `gain_per_point`, `shield_gain`); by Brace a flat 2, 3 with a shield (`brace_gain`, `brace_shield_gain`; the lead's tuning of 10 Nov 2026: Brace first gave the scaling gain, and at Durability 5 one Brace for 1 AP filled the pool, 50 damage soaked). Brace is once until you move and the Guard technique once a turn; nothing else limits it.
993. **Guard soaks 10 a point** (`soak`), after armour and after the shield of HP, with no reaction and no choice. **The last point is kept back** (`keep_back` 1; the lead's tuning) so a reaction is still payable, unless what gets through would take the unit down: then every point the hit needs is spent, whether or not that saves it.
994. **What a hit is for Guard:** anything that takes HP but a condition's tick and self-harm; friendly fire, traps, hazards and explosions are hits.
995. **Anyone with a Guard pool may Brace with any weapon** (it was a heavy weapon's action). **The weapon's own benefits stay with the weapons that could brace before:** a unit that braces only for Guard gets the Guard and the braced stance (which class moves and the patron's "hold" tag read), not Recoil halved and not a technique's Braced line (`Unit.guardBrace`). A class move that braces (the Defender's Brace, Dig In) sets the weapon as it did before.
996. **Interpose at Durability 3, 1 Guard** (`interpose_durability`, `interpose_cost`); a hit is an enemy's weapon attack on an ally within 1 tile; it may be used on your own turn (an enemy's reaction hitting an ally).
997. **The Defender beside the general rule:** rank I and II Defenders soak by rule 4 like anyone; with Reactive Plate (rank III) the plate does it. Reactive Plate's own text now gives little beyond its policy and the bots it sheds; Shrug It Off, Draw Fire and Interpose compete with the soak for the same Guard (the kept point is for them). The Defender's class Brace (2 AP: the same Guard, and +2 Defense) sits beside the plain Brace (1 AP: the Guard). For the perk and class pass to settle.
998. **Shield Bash:** 2 AP, ×1.5 bare-hand damage, 1 Guard, +1 Momentum on a hit, Body save or pushed 1 tile. Without Durability there is no Guard pool, so a shield-bearer with no Durability can Raise Shield (for the −2) but can't Bash or Wall.
999. **Raise Shield:** 1 AP, 1 Momentum for 1 Guard, −2 to ranged attacks from the front until your next turn; it stacks with Guard's Heavy line and with the shield's own Defense.
1000. **Shield Wall:** 1 Guard and the reaction; the ally counts as behind half cover (−5) for that attack, and nothing more (the lead's tuning: it first added −2 to hit as well, −7 against an ally in the open). The other reading of "half cover counts for them" (cover the ally stands at counts even when it doesn't face the shot) would make it nothing in the open.
1001. **Which shields:** the buckler and the riot shield carry the Shield property; the pavise doesn't (carried, it does nothing). The riot shield's old text ("half cover against shots from the front", "Shield Wall: an adjacent ally behind you counts as behind half cover") is not an engine rule; the two techniques replace it and the item text should follow.
1002. **Heavy armour's gate:** Class 4 Pain Threshold 3, Class 5 Pain Threshold 5 (`rules.gear_gates.heavy_armour`). The Armour Class is a number on the sheet, not an item: the gate is asked where the class is set (today the Proving Ground's armour tool; `armourGateWhy`), and by `equip` for any worn piece that carries an `armour_class`.
1003. **Enemies have no Guard:** a stat block has no Durability. A unit given `resMax.guard` and `durability` by a campaign would use every rule above.
1004. **The kept Guard point and Momentum.** "A hit on a unit that holds Guard points costs it no Momentum" was written when the soak spent every point. With 1 point kept back, a unit that has Braced once keeps its Momentum against every hit until it spends that point on a reaction or the hit would take it down. To settle: leave it, or protect Momentum only from a hit that Guard soaked part of.
1005. **The perk hooks wired into the technique core** (after item 990): Heavy Hands adds 1 tile to every push away by a melee technique (Shove, Bash's Heavy line, Lunge's Heavy line, Shield Bash), on the card and in play. Quick Draw zeroes the AP of the first technique of a fight that draws its weapon (Draw Cut, Snap Shot). Iron Grip II lets Throw Down start with no Momentum on a held target (it then deals its base damage). Breaching Strike also answers a push that is blocked at once, where the target stands, including a Shove that knocks Prone because the tile behind is blocked; a push is slammed once. Siege Engine's discount reaches the Shove Link and the Break Finisher, never below 1 AP, so a 1 AP Shove stays 1 AP and in practice only Break is cheaper: to settle whether Shove should be free for its holder. Tuned: a natural 1 with a gun that can jam is only a miss (no jam, and no −1 AP either), and Heat never jams it.
1006. ~~A Legendary Deed's Core point~~ **Settled (Leon, 10 Nov 2026):** a Legendary Deed grants 1 Attribute point, and one Attribute point per deed may stand 1 above the level's ceiling (never above 10).
1007. **The Twin Pays also pays the Begin's AP** (Leon, 11 Nov 2026): the Begin costs 0 AP as well as 0 MP and 0 Strain, once a fight.
1008. **An attempt in a fight** costs 1 AP, once a turn for each character; plain speech is free (rules 1.14).
1009. **What the Narrator may ask for in a fight:** one check, or one condition for one round (Shaken, Taunted, weapon lowered, Hesitates −1 AP), or one surrender (at half HP or less, or after a check), or a yes/no on a perk. The list and the one-round length are provisional.
1010. **Overdraw** once a turn; free of Strain the first time each fight, then 1 Strain.
1011. **Heart Overload:** the free Begin needs a Release at stage 2 or higher, once a turn; tier II starts it at stage 1; blood pays at 1 HP a point.
1012. **Resonance (perk):** +10% a step, to +20% (tier II +30%); lost on a turn with no held or Released Outburst.
1013. **The perk card's three shelves** follow the audit of 11 Nov 2026; which perk sits on which shelf is the audit's reading and can move.
1014. **Deeds the engine sees:** the nine conditions in the table of that name (rules 1.14) are the engine's reading of each deed's sentence and are provisional: 3 tiles, the first turn and 2 enemies standing for Charge!, 10% for Field Surgeon, a Downed ally counting and who put them there, 3 misses in a round with a burst as 1, what opens as an ambush and 1 attack at you, which objects are a wall and going through the gap, the second Mana Short for Twin Souls, a quarter, 2 rounds, 1 attack at you and never Downed for Bite the Bullet, which surrenders are words.
1101. **Colour is not a ruling** (rules 1.14, "The engine takes everything it can, first step"; the recommendation to question C1): a standing fact about how people treat you, a story hook, a "the Narrator may" and a roleplay line do not make a perk or a trait Narrator-run. On that reading 19 items were relabelled `engine` (8 perks, 11 traits; 100 to 119 of 180). If Leon says no to C1, the 11 "colour" items go back to `hybrid`: Foreseen, Make Way, Grenadier's Arm, Blade Recluse, Bottle Butts for Eyes, The Mask, Factory Made, Upper-Touched, Gambler, Crowded Head, Drone Handler.
1102. **The AP perks' cooldown: 3 turns** (`rules.ap_cooldown.turns`; Leon's answer 11). Counted in the holder's turns of one fight (one a round), from the turn the AP lands; a banked gain counts on the turn it arrives; every cooldown is ready when a fight starts. The bonus and the penalty of one item are counted separately. To settle: whether they should share one cooldown, and whether a cooldown should carry from one fight into the next.
1103. **Talks Broke Down under the cooldown:** +2 AP (or Tier I's −2) on turns 1, 4, 7 and so on of the fight, where it was every turn. "Out of a talk" is the engine's timing rule on the card: the fight starts in the same story round as the squad's last dialogue check or the round after (the one story round of item 383).
1104. **War Footing under the cooldown:** one enemy loses 2 AP, then nothing for the holder's next 2 turns (rounds), whichever enemy steps up. The other reading (a cooldown kept for each enemy) would leave it almost as it was: once for each enemy every turn.
1105. **What the cooldown does not cover:** Outclassed (once a fight by its own rule), Southern Fist's +1 AP a turn with bare hands and Sworn Sibling's shared 1 AP (standing bonuses of 1, not swings of 2), penalty-only traits (Ghost Soldier's −2 when found, Soft Hands, Born Officer's squad leaning on the officer), discounts, free moves and free attacks, the Calls, QUICKEN, prayers and class moves. To settle: Southern Fist and Sworn Sibling.
1106. **The Name They Whisper's strangers:** everyone knows the name unless marked a stranger: the label `stranger` on the enemy, or a name on the holder's `strangers` list (the Narrator's `traitState`). The label is read by the perk already, but the list of labels an enemy may carry does not have it yet (that list is part of the "labels on people" step), so today the list on the holder is the way that works.
1107. **True Name's "studied" is Analyzed** (the recommendation to C4): the mark any squad member's Analyze leaves on the being; refused by the engine in a fight and for a being on the area map; a being that is only in the story is still confirmed by the Narrator.
1108. **Crowd Pleaser's crowd outside a fight:** 3 or more people on the area map within 8 tiles of the speaker, hostile or neutral, not hidden (the fight half's numbers; the recommendation to C5). It applies to every Charisma check the holder makes there.
1109. **Old Tongue II holds attacks, not the turn** (the recommendation to C12): for its next turn the being makes no attack, casts nothing and uses no technique; it may move. No save, 0 AP, once per being, as before.
1110. **Fire Sermon's deed needs a Faithful character** (the recommendation to C6): one who serves a patron when the enemy gives up. The Voice's deed does not.
1111. **Verse of War has no audit** (the recommendation to C9): nothing checks that the line was verse; a line must still have been said that round.
1112. **True Name remembers an Analyze made on the area map** (rules 1.14, "After the review"): the holder keeps the id and the name of the last 24 people the squad Analyzed on the area map, and such a being counts as Analyzed in the fight that follows. The number 24 is new. The cause is outside the perk: a fight the Narrator starts seats the people on the map without their Analyze mark (only a fight a player opens by attacking carries it). To settle: carry the mark itself into every fight; then this memory can go.
1113. **Grim Reaper II's Fear** comes with every kill or knock-out on the holder's own turn, also on the turns the 2 AP is cooling down, and never with a kill made off the holder's turn (a held shot, a reaction). The card was reworded to say so; the game did not change.
1114. **A hybrid card names its judgement:** The Name They Whisper reads "the Narrator says who has never heard of you". The first step had removed the sentence; the perk is still hybrid, and section 11 of the balance pass asks for the judgement in one plain sentence on the card.
1115. **The cooldown's readings, confirmed in review:** counted in rounds of the fight, so a turn the holder loses still counts; AP lost to the +3 limit or the ceiling of 9 still starts it; each holder has its own; a new fight and the Proving Ground's Refill start it ready. To settle: (a) whether a penalty should be on a cooldown at all (Talks Broke Down I after a lost talk was −2 AP every turn, now on turns 1, 4, 7); (b) whether two War Footing holders may both take 2 AP from one enemy; (c) whether the free attacks and free moves the action price list counted under the ruling (Dance of Iron, Roll With It, Heart Overload's free Begin) should have the same cooldown; (d) Got You in My Sight also pays when the holder is the one who walks out of sight of an enemy, which the cooldown now limits to once every 3 turns.
1116. **Just the Repairman's line to the Narrator** says what the card says: the guard does not look again that scene unless the character attacks. It no longer says "until they act unlike a repairman".
1015. **Enemy levels (rules 1.15):** a fight's level is the average level of its characters, rounded down; the Narrator's shift is −3 to +2; levels are held to 1 to 20.
1016. **The tier rows at level 1 (rules 1.15):** HP 15 / 70 / 140 / 240 / 960, armour 0 / 0 / 5 / 10 / 10, Defense 10 / 10 / 11 / 12 / 13, attack bonus +0 / +1 / +3 / +5 / +6 (Vermin, Minion, Soldier, Elite, Boss). First numbers by arithmetic; the Boss's HP moved in the fit (item 1027).
1017. **The tiers' damage factors (rules 1.15):** ×0.5 / ×1.0 / ×0.78 / ×1.05 / ×1.2 (the first table had ×0.85 / ×1.15 / ×1.4 for Soldier, Elite and Boss; items 1026 and 1027). They are measured with one weapon a tier (service rifle, bullpup, machine gun); another weapon in the same hands lands a different number.
1018. **The level table (rules 1.15):** armour to ×1.60 at level 13 and flat after it (HP: item 1025); Defense +1 every second level to +6; attack bonus +1 at levels 6, 10, 13, 15, 17 and 19; damage to ×1.82 at level 20. All four follow one reference character (the plain rifleman with a normal share), whose damage stops growing at level 13 while its HP does not.
1019. **Far below, first called Outclassed (rules 1.15):** 5 levels; any hit that deals 1 damage; every tier, the Boss included. To settle: whether a Boss should be spared the rule.
1020. **The level gap to hit (rules 1.15):** 1 a level, to 5 levels. It is not one of Leon's rulings: it was added because the table alone does not make an enemy 3 levels up a fight to run from. Weapon attacks and techniques that roll to hit only; spells and saves do not read it yet.
1021. **Vermin (rules 1.15):** 15 HP, Defense 10, attack +0, damage ×0.5, Movement 2, no spare magazines, no drop-table roll, 1 weapon drill a kill, ranked as a Minion for saves and notice. The Proving Ground's Vermin is the "Drill mite" (bite and claws, or a combat knife).
1022. **Critical hits (rules 1.15):** ×1.5; +3% a point of Perception above 1 and +2% a point of Dexterity; One Shot's Breath Held +25%; ×2.0 at most; an enemy's ×1.5. The split between Perception and Dexterity is the old 2 to 1, scaled down.
1023. **Companions and levels (rules 1.15):** the drone's 30 HP and the beast's 60 HP (settled, item 370) are now their level 1 numbers; at their owner's level 20 they have 54 and 109. To confirm with Leon.
1024. **Enemy casters and levels (rules 1.15):** their spell damage takes the tier and level damage factor of a weapon; their MP, Strain limit and words do not change with level.
1025. **Enemy HP by level, fitted (rules 1.15):** ×1.07, ×1.16, ×1.23, ×1.30, ×1.38, ×1.43, ×1.49, ×1.54, ×1.61, ×1.67, ×1.74 at levels 2 to 12, ×1.78 at 13 and 14, ×1.79 at 15 and 16, ×1.80 at 17 and 18, ×1.81 at 19 and 20. It runs ahead of armour (×1.60 at the top) so that a Soldier takes 3.5 of the plain rifleman's hits at level 1 and 3.95 at level 20, an Elite 6.9 and 7.8. There is no room left under the targets (4 and 8); if the weapon step lowers the yardstick's damage this column is fitted again.
1026. **Soldier ×0.78 and Elite ×1.05 (rules 1.15, the fit):** set so the plain rifleman lasts 3 rounds under fire from 2 soldiers, or 1 elite and 1 soldier, that never go down (measured 3.0 to 3.3 and 3.2 to 3.6 rounds at the six levels). The price, measured: a squad of four wins 98 to 100% of standard fights (target 9 in 10) and someone is Downed in 1 fight in 6 (target 1 in 3). At ×0.95 and ×1.3 the squad targets come close (93 to 100% won, someone Downed in 4 fights of 10) and the rifleman lasts 2 rounds. To settle with Leon: which of the two wins.
1027. **Boss 960 HP and ×1.2 (rules 1.15, the fit):** from 900 and ×1.4, where a level 1 squad lost a boss fight 1 time in 4 with 2 of 4 Downed. A boss fight is now 9.0 to 9.6 rounds at level 1 and 6.5 to 9.3 at level 20 (open ground to cover), with 1.4 characters Downed a fight at level 1 and 0.5 at level 20. A Boss takes 27 to 31 of the yardstick's hits.
1028. **Targets the table does not reach (rules 1.15, the fit):** the elite fight on open ground (4.6 to 5.5 rounds, target 6 to 8), the boss fight on open ground from level 3 (6.5 to 7.9, target 8 to 10), the win rate and the Downed rate of a standard fight (item 1026), and a fight against enemies 3 levels up (item 1029). The first two wait for the weapon step (the optimised long rifle at 173 to 215% of the yardstick).
1029. **Three levels up is not yet "run" (rules 1.15, the fit):** the squad still wins 58 to 78% of standard fights on open ground against enemies 3 levels above it (30 to 62% with cover). In the simulator a level gap of 2 to hit a level, in place of 1, loses them 70 to 100% of the time (tried before the damage factors were lowered) and makes the Narrator's +2 a fight won 27 to 60% of the time. Not built; to settle with Leon.
1030. **How "3 rounds under fire" is measured (rules 1.15, the fit):** the plain rifleman alone on open ground against 2 enemies with a Soldier's numbers (or an Elite's and a Soldier's) and 5,000 HP, for 10 rounds; it lasted the rounds before the one it went Down in. Enemies that could be killed would make the number larger.
1031. **A spell's critical is still ×2 (rules 1.15, the review):** Sigil and Outburst criticals double the spell's damage, for characters and enemy casters, while a weapon's critical is ×1.5 to ×2.0. Leon's ruling 7 ("criticals ×1.5") does not say whether spells are in it. To settle with Leon; the change is two lines in the magic files.
1032. **Spells do not read the level gap (rules 1.15, the review):** the ±1 to hit a level is on weapon attacks and techniques only. A caster 3 levels below an enemy hits it as if at equal level, and an enemy caster 3 levels up gets no bonus. The simulator's squad has a Sigil caster, so part of "3 levels up is still beaten" (item 1029) is this. To build with the magic step, or sooner if Leon says so.
1033. **Far below, the Boss included (rules 1.15, the review; item 1019's question):** in a squad of mixed levels the rule is read by each character, so a level 20 character beside a level 1 one (fight level 10) takes a level 10 Boss out with one hit. To settle with Leon: spare the Boss (and perhaps the Elite), or read the gap from the fight's level instead of each character's.
1034. **Enemy heals and shields grow with the damage factor (rules 1.15, the review):** a Sigil caster's MEND and WARD read the same multiplier as its damage, so a Soldier-tier adept heals ×0.78 at level 1 and ×1.42 at level 20, a Boss-tier magister ×1.2 and ×2.18. HP grows ×1.81 over the same levels, so the level part keeps pace; the tier part (a Soldier healing less than a Minion) is an accident of the build. To settle in the magic step.
1035. **Vermin where tiers are named one by one (rules 1.15, the review):** the "rank-and-file" order perk lists Minion and Soldier, so Vermin do not hear it; a Vermin turret would be hacked at a Soldier's difficulty; the Proving Ground's waves never send Vermin; a fight started on the map with 3 or more Vermin is rated Standard (50 XP) like 3 of anything. None is built differently yet.
1036. **A level given outright ignores the shift (rules 1.15, the review):** the first build added the Narrator's shift on top of a level set by hand (9 and +2 made 11). Now 9 is 9.
1037. **The spawn tool's empty level is the squad's level now (rules 1.15, the review):** the first build used the level the fight started at, so a fighter levelled from 4 to 15 in the middle of a fight still spawned level 4 units.
1038. **Enemy weapons that end a character in one hit (rules 1.15, the review):** at level 1 a Boss with a Blackpoint 700 deals 108 before armour and with a breacher tube 132; an Elite 94 and 115. A character with 100 HP in Class 1 armour goes Down to one such hit at full HP (the breacher tube did this before the step; the Boss's ×1.2 adds the Blackpoint). The table is fitted with one weapon a tier (item 1017). To settle in the weapon step: these two weapons' damage, or which weapons the Narrator may hand an enemy.
1039. **The smallest map (rules 1.16):** 8 × 8 tiles (it was 6 × 6). Nothing ships that small; 8 is the least that leaves two start tiles, a tile of cover and a way round it. *Data: maps.json limits.min, flagged provisional.*
1040. **The deployment gap on the full-size maps (rules 1.16):** Leon's band is 10 to 14 tiles; open ground and the Proving Ground use 13 (columns F–G against T–U), the mining camp and the lifted town 13. To settle in playtests: 11 (one column nearer each side) if melee fighters spend too long walking.
1041. **The penthouse stays 16 × 11 (rules 1.16):** the one interior among the open campaigns. To settle when its campaign is written: a larger suite with rooms, or this one.
1042. **Out of sight on turn 1 is a property of the layout, not a rule the engine enforces (rules 1.16):** the shipped full-size maps are tested for it; a campaign file is not refused for lacking it, and a map with no enemy start tiles gets them by mirroring, whatever can then be seen.
1043. **The layouts of the mining camp and the lifted town (rules 1.16):** first layouts at 26 × 26 for two campaigns that are still sketches (not offered in the Room). They pass the map checks; nobody has played them.
1044. **The Proving Ground's layout (rules 1.16):** the blockhouse to the north, a staggered barricade line across the middle, sandbags in front of both starts, low walls on the south lane, a rubble field on the south flank, churned sand on the north-west and north-east. First layout; every position is open to playtests. The ammo locker stands on the squad's side only.
1045. **The Narrator's limits were not raised with the maps (rules 1.16):** 64 hazard tiles, 12 hazards and 16 triggers a zone, 6 spawned people a turn (world_play.json limits). A 26 × 26 map has 4.2 times the tiles of a 16 × 11 one; the limits are counts of things, not of tiles, and stay until a playtest shows one is too low.
1046. **The simulator's grounds (rules 1.16):** both are 26 × 26 with the game's deployment (13 tiles); "open" is bare ground, "cover" is the real open-ground layout. The saved baselines (11 Nov 2026 and earlier) were measured on 16 × 11 with the sides 11 tiles apart and are not comparable tile for tile; only the quick run was repeated.
1047. **The enemy holds at range on a big map (rules 1.16):** an enemy with a gun stops on the first tile that has a line on someone within its weapon's range and does not come closer. On 26 × 26 that leaves riflemen far back while the knife fighters arrive alone. Unchanged in this revision; to look at with the combat-roles work.
1048. **The camera's numbers (roadmap 2c, 11 Nov 2026; the screen, not a rule: no fight's outcome depends on them):** all provisional until playtests. The map's window shows the tiles at the size a 16 × 11 map had when it was fitted to the same window (about 35 px a tile at 1280 × 720, 49 px at 1440 × 900, 63 px at 1920 × 1080) and is 16 tiles wide unless the player widens the map zone; the camera glides in 250 ms at Fast (following the combat speed; a cut under reduced motion) and leaves that long plus 40 ms before the beat it moves for, so it has arrived when the beat plays and no beat is delayed; only attacks, spells, pushes, throws, walks and turns move it (a wound, a heal or a unit going down off screen gets an edge arrow instead); it keeps a target 1.5 tiles inside the window's edge; on the player's own turn it leaves the view alone while their pointer is over the map and for 4 s after they moved it by hand, on anyone else's turn for 1.5 s after; an arrow or W A S D key moves the view 2 tiles; a press that moves 6 px or more is a drag; the small map is 150 px on its longest side (under 6 px a tile at 26 × 26); an edge arrow stays 2.6 s at Fast (never under 1.2 s) and at most 5 show at once.
1049. **The camera's rest (review of roadmap 2c, 11 Nov 2026; the screen, not a rule):** provisional. A camera move that the next beat would undo before the camera had rested 350 ms where it arrived (at Fast; it follows the combat speed) is not made: the camera goes straight to the later beat and the place it skipped gets an edge arrow. This is what keeps the view on the target when a hostile too far away to share the window shoots as its turn begins. To judge in play: whether players would rather see the shooter first (a longer banner, then the shot).
