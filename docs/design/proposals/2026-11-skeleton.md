# Proposal: the skeleton (Cores, Attributes, Skills, and what a level gives)

Status: **section 4 accepted and applied as rules 1.11** (Leon, 10 Nov 2026: "apply everything you recommend with the skeleton"): the level gains, rank levels 6 and 12, no Core-for-Attribute trade, Mind Without Fog at +1 Core. Spec items 924–930. **Section 5 is not applied:** it is carried into `2026-11-melee-techniques.md` (the `hits_with` / `scales_with` fields, drill in place of kills, where the fencer lives).

Leon, 10 Nov 2026: the 2020 budgets (6 Core, 10 Attribute, 10 Skill) were drawn out of a hat, every number needs tuning, and the damage pass waits until the Body classes have their own tools. So this looks only at the frame those numbers hang on: the three budgets, the caps, what a level gives, and where the Body tools will plug in. It sets no damage, HP or cost number.

**The short version.** The 10 / 10 / 6 creation budgets are fine and I would keep them. The problem is the drip after creation. Creation hands out Core points at 6 for every 10 Skill points; levelling hands them out at 2 for every 10. Since +1 to a capped skill costs one point of each kind, every character's best skill grows by exactly +1 per 5 levels, whatever they do, and the gap set on the creation screen never closes. One change fixes most of what follows from that: **a Core point every 3rd level instead of every 5th.** The full recommendation is in section 4, and the decisions I need from you are in section 7.

How I got the numbers: a script that takes each of the 46 archetypes in `data/archetypes.json` and levels it to 20 as a focused player would (best skill first, then the second, then new skills), under the current rules and under each alternative. Points bank when they can't be spent, as in the engine (`character.ts`, `unspent`). I can add the script to `tools/` if you want it kept.

## 1. How the skeleton works today

1. **Three currencies, two caps.** Skill ≤ Attribute ≤ Core ≤ 10. Skills start at 0, Attributes and Cores at 1.
2. **What height costs.** A skill at height *h* needs its Attribute at *h* and its Core at *h*:

   | To have… | Skill points | Attribute points | Core points |
   |---|---|---|---|
   | one skill at *h* | *h* | *h* − 1 | *h* − 1 |
   | a second skill at *h* in the same Attribute | *h* | 0 | 0 |
   | a second skill at *h* in another Attribute of the same Core | *h* | *h* − 1 | 0 |
   | a second skill at *h* in another Core | *h* | *h* − 1 | *h* − 1 |

   So staying inside one Attribute is the cheapest way to build, and an Attribute's three skills are its combat, utility and social sides. The tree and Class Roster Revision 3 (one class per Attribute) agree with each other. That part of the skeleton is sound.
3. **What each currency does.**
   - **Skill points** do everything a player sees: the modifier, the voice, unlocks at 3 and 5, a perk step at 3, 5, 7 and 9, the Mastered perk at 10.
   - **Attribute points** do two jobs: they cap skills, and they are the combat numbers (HP, Movement, damage multipliers, MP).
   - **Core points** do one job: they cap Attributes. Nothing in Derived stats reads a Core.
4. **Supply.**

   | | Skill | Attribute | Core |
   |---|---|---|---|
   | Creation | 10 | 10 | 6 |
   | Levels 2 to 20 | 19 (1 a level) | 10 (even levels) | 4 (levels 5, 10, 15, 20) |
   | Ratio at creation | 10 | 10 | 6 |
   | Ratio from levelling | 10 | 5.3 | 2.1 |

## 2. What I found

### The drip is the problem, not the budgets

1. **After creation the binding currency flips.** At creation Skill points run out first. From level 2 on, Core points do. Raising a capped skill by 1 needs a Core point, and those come every 5 levels, so:

   | Build (highest Core at creation) | Best skill at level 1 / 5 / 10 / 15 / 20 |
   |---|---|
   | Deadeye (7) | 7 / 7 / 9 / 9 / 10 |
   | Bulwark (5) | 4 / 5 / 7 / 7 / 9 |
   | Sharpshooter (4) | 4 / 4 / 6 / 6 / 8 |
   | Drifter (3) | 2 / 3 / 5 / 5 / 7 |

   Everyone climbs the same staircase from where they started. Four of every five Skill points must go sideways, because the tall skill is waiting for a Core point.
2. **Who reaches what, today.** Across the 37 regular archetypes and the 9 All-in ones:

   | | Regular (37) | All-in (9) |
   |---|---|---|
   | A skill at 10 (the Mastered perk) | none, ever | level 15 or 16 |
   | Class attribute at 8 (rank III) | median level 20 (16 to 20); the Drifter never | level 5 or 6 |
   | Perk steps held at level 20 | median 11 | median 12 |
   | Level-ups (of 19) that bring no perk step, unlock or Mastered perk | median 11 | median 9 |

   More than half of all level-ups give +1 to one skill's rolls and nothing else.
3. **The advanced class gates can't be met when they say they can.** `classes.json` gates a squared class at its attribute 9 and a hybrid at 6 and 5 in two different Cores, both "from level 7". With a Core point every 5 levels:

   | Cores at creation | Squared (attribute 9) | Hybrid (6 and 5 across Cores) |
   |---|---|---|
   | 7 / 1 / 1 | level 10 | level 20 |
   | 6 / 2 / 1 | level 15 | level 15 |
   | 5 / 3 / 1 | level 20 | level 15 |
   | 4 / 4 / 1 | never | level 15 |
   | 4 / 3 / 2 | never | level 20 |
   | 3 / 3 / 3 | never | never |

   Batch 1 (the nine squared classes, roadmap item 5) would open for 7/1/1 builds at level 10 and for almost nobody else. Nobody at all can take a hybrid before level 15, about session 32. These gates read as if they were written for a faster Core rate.
4. **The creation screen itself is fair.** A Deadeye starts with 4 perk steps and 3 unlocks; a Bulwark with 3 and 3. The 7/1/1 build pays for its height with two voices, Agility or Endurance at whatever its one Core allows, and nothing in the other two Cores. I would not touch 10 / 10 / 6 or "no creation caps". What makes 7/1/1 the only build that sees the end of the game is levelling, not creation.

### Smaller things in the frame

5. **The Core-for-Attribute trade is nearly dead, and a loss when it works.** Every Attribute point has to be placed before lock-in, and a Core caps how many fit. I enumerated every split: trading **one** Core point is legal (6/1/1, 5/2/1, 4/3/1, 4/2/2, 3/3/2); trading **two or more is never legal**, because the 14 Attribute points have nowhere to go. And the one legal trade swaps a point that takes 5 levels to earn for two that take 4, while lowering a ceiling for good.
6. **Attribute points are the combat budget, and that works, but nobody is told.** The skills in an archetype need on average 5.8 of the 10 Attribute points; the other 4.2 are placed where no skill needs them. Across the 46 presets, 56 raised Attributes hold no skill at all (a Sharpshooter's Endurance 4, for +45 HP). That matches the EPCCG ("Attributes set the fundamentals of combat… They do nothing in conversation"). It is a good split: skills are the character, Attributes are the chassis. The creation screen should say so.
7. **But five of the nine Attributes give a non-caster nothing.** Endurance (HP), Agility (Movement, initiative), Perception (sight, criticals) and Strength (weapon damage, carry) help anyone. Intelligence, Expression, Insight, Determination and Virtue only feed Sigils, Outbursts, healing or prayer. A Charisma face must raise Expression to raise Charisma, and gets a cheaper glyph they will never draw. Each Attribute should have one thing per point that every character can use. Which thing is a question for the numbers pass; that the slot is empty is a skeleton fact.
8. **Everyone's legs and armour are in Body.** HP, Movement, Defense (Athletics) and gun accuracy (Dexterity) all sit under one Core. Of the 37 regular archetypes, 19 have Agility 1 (one tile per AP) and 10 have Body 1. A character from Mind or Soul buys the basics of fighting with Core points, the scarcest thing they have. This matters for your Body plan: if Body is everyone's chassis, then being "a Body class" has to mean more than having the chassis. That is the gap your tools fill.
9. **A Core point shows nothing on screen.** It is the rarest reward and it changes no number until an Attribute point and then a Skill point follow it. At level 5 today a player gets a Core point and the sheet looks the same.
10. **Rank by attribute lets a specialist skip a rank.** A 7/1/1 build has its class attribute at 7 when the class arrives, so it gets ranks I and II (four moves) in the same moment at level 3, and rank III two or three levels later. A regular build waits until level 16 to 20. Any faster Core rate makes the first half of that worse.

## 3. Alternatives I ran

Each row is the same 46 archetypes, levelled the same way.

| Skeleton | Regular: Mastered | Regular: class attribute 8 | All-in: Mastered | Empty level-ups (regular, of 19) |
|---|---|---|---|---|
| **Today:** 1 skill a level, Attribute on even levels, Core every 5th | 0 of 37 | median level 20 | level 15 or 16 | 11 |
| Core every 4th, more skill points | 16 of 37, all at level 20 | median level 16 | level 12 | 8 |
| **Core every 3rd, more skill points (recommended)** | 36 of 37, median level 18 (16 to 18) | median level 12 (10 to 16) | level 9 or 10 | 6 |
| Core every 2nd, Attribute every level | 37 of 37, median level 12 | median level 8 | level 6 | not run |

"More skill points" is the cadence in section 4 (38 over a career instead of 29). Core every 4th helps too little: most builds still reach 10 only on the last level. Core every 2nd makes everyone a master by the middle of the campaign and leaves nothing to climb. Every 3rd puts a regular build's capstone in the last fifth of the game and a specialist's in the middle, which is a real price difference without a lockout.

I also tried giving a free Attribute point with each Core point. It moved every milestone by one level at most, so it isn't worth a rule.

## 4. What I recommend

1. **Keep creation as it is:** 10 Skill, 10 Attribute, 6 Core, no caps, archetypes that spend everything.
2. **A Core point at levels 3, 6, 9, 12, 15 and 18** (six in a career instead of four).
3. **Every level gives two picks.**

   | Level | You gain |
   |---|---|
   | Odd levels (3, 5, … 19) | 2 Skill points |
   | Even levels (2, 4, … 20) | 1 Skill point and 1 Attribute point |
   | Every 3rd level (3, 6, … 18) | also 1 Core point |
   | Level 3 | also your class |

   That is 38 Skill points over a career instead of 29, the same 10 Attribute points from levels, and 6 Core points. A level-up is always two decisions, and three on a Core level.
4. **Class ranks need a level as well as the attribute:** rank II at the class attribute 5 **and level 6**; rank III at attribute 8 **and level 12**. Specialists stop skipping rank II, and a regular build that keeps up its class attribute reaches rank III at about the same level as a specialist. The attribute still matters: the Drifter gets there at level 16.
5. **Leave the advanced gates alone.** With a Core point every 3rd level they work as written:

   | Cores at creation | Squared (attribute 9) | Hybrid (6 and 5 across Cores) |
   |---|---|---|
   | 7 / 1 / 1 | level 7 | level 12 |
   | 6 / 2 / 1 | level 9 | level 9 |
   | 5 / 3 / 1 | level 12 | level 9 |
   | 4 / 4 / 1 | level 15 | level 9 |
   | 4 / 3 / 2 | level 15 | level 12 |
   | 3 / 3 / 3 | level 18 | level 15 |

   The specialist gets the squared class first and the two-Core build gets the hybrid first, which is what the two kinds are for.
6. **Delete the Core-for-Attribute trade.** Only one point can ever be traded and it is a bad deal. One fewer rule on the creation screen.
7. **Mind Without Fog: +1 Core point, not +2.** At the new rate +2 is still six levels of Core progression from a trait.
8. **What the recommended skeleton gives the same four builds:**

   | Build | Best skill at level 1 / 5 / 10 / 15 / 20 | Mastered at | Perk steps at 20 (today) |
   |---|---|---|---|
   | Deadeye (7) | 7 / 8 / 10 / 10 / 10 | level 10 | 15 (12) |
   | Bulwark (5) | 4 / 6 / 8 / 9 / 10 | level 16 | 16 (11) |
   | Sharpshooter (4) | 4 / 5 / 7 / 8 / 10 | level 18 | 14 (11) |
   | Drifter (3) | 2 / 4 / 6 / 7 / 9 | never (a skill at 9 at level 18) | 15 (10) |

   After level 10 the Deadeye has spare Core points and nowhere to put them in Body, so the late game opens a second Core for the specialist. I think that is the right shape: narrow and tall early, wider later.

## 5. Two things to decide before the Body tools, because the tools will sit on them

You said the Body classes get their own tools next. I read "weapon attack skills" as techniques a fighter uses in a fight, not new entries among the 27 skills (the tree has no free slot). If you meant new skills in the tree, tell me, because that changes this section.

1. **Each magic plugs into the same three sockets. Body has only one of them filled.**

   | | What you know | What limits it | How it grows | The turn-by-turn meter |
   |---|---|---|---|---|
   | Sigil | words | 4 + Brain Power known; words per spell by Intelligence | study, earned per Evoke | Flux (and charge) |
   | Soul | designs and modules | ready designs by Empathy; module slots by Will Power | practice, earned per Release | Strain (and MP) |
   | Faith | Hymns | Devotion | vows, rites, deeds | the cooldown |
   | **Body today** | one weapon skill that comes with the weapon; three passive perks per weapon family | nothing | kills (5 / 15 / 40 / 80 / 140) | Heat for guns, Momentum for the Fighter, Guard for the Defender; nothing for light blades, bows or fists |

   So the frame the tools need is: a list of techniques you know, a skill that limits how many you keep ready, growth by using the weapon, and a meter. My recommendations for the frame, not the content:
   - **The attack skill limits the list** (Raw Power, Athletics or Dexterity), the way Brain Power and Empathy do. That gives those three skills a reason to climb beyond the to-hit bonus.
   - **Weapon mastery counts uses, not kills,** in the same kind of unit as study and practice. Kills reward the last hit, and in co-op that starves the tank and the medic.
2. **The fighting styles don't sit evenly on the tree.**

   | Style | To hit | Damage scales with | Class it leads to | Problem |
   |---|---|---|---|---|
   | Heavy melee | Raw Power (Strength α) | Strength, Raw Power | Fighter | none |
   | Unarmed | Raw Power | Strength, Raw Power | Fighter | the monk idea (agile, Determination) is not this |
   | Light blades | Athletics (Agility α) | Strength, Raw Power | Marksman, a gun class | hit and damage in different Attributes; the class has gun moves |
   | Guns (7 weapon families) | Dexterity (Agility β) | Strength, Raw Power | Marksman | the gun skill is a utility slot; bullets hit harder for the strong |
   | Bows | Dexterity | Raw Power twice (in the base and in the multiplier) | Marksman | as guns |
   | Thrown | Dexterity | Strength, Raw Power | Marksman | as guns |
   | Stealth and theft | Ingenuity (Perception α, **Mind**) | by the weapon carried | Infiltrator | the thief is not a Body character on the tree; they need two Cores |
   | Tanking | none | none | Defender | Defense comes from Athletics, in another Attribute |

   Dexterity carries seven of the ten weapon families from a β slot. Athletics is both the dodge skill and the light-blade skill. Before tools are written for "the gunner", "the fencer" and "the thief", decide where each one lives. My recommendations:
   - **Agility's class covers both of its weapons.** Reshape the Marksman so its moves work with whatever Agility attacks with: a gun through Dexterity or a light blade through Athletics. Then the fencer has a home and Revision 3's one class per Attribute stands.
   - **Each weapon's damage scales with the Attribute it is aimed with.** Guns, bows and light blades with Agility; heavy melee and fists with Strength. One Attribute per style, and Strength stops being a gun stat.
   - **The thief stays in Mind.** The Infiltrator is a Perception class and that is fine. Just don't file it under Body when you write the tools: its tools should run on Ingenuity.

## 6. What this does not cover

1. Any damage, HP, cost or XP number. They wait for the pass, as you said.
2. The XP table and the 20 levels. I kept both. With two picks a level the 2 to 4 sessions between levels should feel less thin; that is for play to show.
3. Voices for untrained skills, and Overreach in fights. Those are in the review (`docs/reviews/2026-11-PHC-review-fable.md` on `review/fable-first-read`, section 3) and don't depend on this.
4. The Mastery thresholds (3 / 5 / 7 / 9 / 10) and the modifier (points − 1). I looked and would not change either.
5. A use for Core points beyond capping (section 2, point 9). Cheap to add later; not needed for the rest.

## 7. Decisions for Leon

1. Core points at levels 3, 6, 9, 12, 15, 18? (My answer: yes.)
2. Two picks a level, 38 Skill points over a career? (Yes. The alternative is to keep 1 a level and accept about 11 empty level-ups in 19.)
3. Class ranks need a level too: 6 for rank II, 12 for rank III? (Yes.)
4. Delete the Core-for-Attribute trade? (Yes.)
5. Mind Without Fog to +1 Core? (Yes.)
6. Should a regular build reach a Mastered perk at all? This is the real design question behind 1. If Mastered is meant to be the specialist's alone, keep Core at every 5th level and say so on the creation screen. I think that is the wrong call, because 27 capstones are too much content for nine archetypes, but it is yours.
7. Agility's class covers blades as well as guns, and damage follows the Attribute a weapon is aimed with? (Yes to both, and decide them before the Body tools are written.)
8. By "weapon attack skills", do you mean techniques, or new skills in the tree?

If you accept 1 to 5, the change is small: the level table in the spec, `levels.gains` and `assignment.rank_thresholds` in the data, three lines in the engine's level-up (`character.ts`), the trade removed from creation, and the tests built from the spec's tables. Spec first, then data, then the validator.

## 8. Leon's answers (10 Nov 2026)

1. **The end-state target.** A fully optimised character rolls at +0 or better in every skill they use (at least 1 point each), and has enough points to Master two skills (an All-in build) or to Master one and hold several at 7.
2. **Checked against section 4.** 38 Skill points cover it: two at 10 and 18 single points, or one at 10, three at 7 and 7 single points. The caps allow it only inside one Core (a second Core can't reach 7 while the first reaches 10: that would take 15 Core points and a career has 12). The next limit is Attribute points: a second Mastered skill in a *different* Attribute needs that Attribute at 10 too, and with 1 Attribute point per even level a 7/1/1 build gets there only at level 20. In the same Attribute it comes at about level 12. If two Mastered skills in two Attributes should arrive earlier, the lever is Attribute points, not Core.
3. **"Weapon attack skills" are techniques** performed with a melee weapon, not new skills in the tree. The aim: anyone can pick up any melee weapon and mix and match the techniques they know, with the variety Sigils and Outbursts have. Section 5 stands.
4. **Attack rolls are unclear to testers** (melee, Sigil and Soul hit chances), and weapons have no "scales with" field. This is section 5, point 2: it needs one stated rule for every attack and a field on each weapon.
