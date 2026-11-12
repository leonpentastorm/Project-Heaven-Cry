# The fight simulator's full run after step 1 of the balance pass (generated 2026-11-11)

**This is the whole baseline run again on the fitted enemy table of rules 1.15** (`balance-sim-step1.md` is the report on the fit itself). It is the "before" for the next step of the pass. The first baseline, the game before the pass, is `balance-sim-baseline.md`. The sentences below are written by the simulator for every run, so some compare against targets that later steps deal with. To run it again: `BALANCE_SIM_OUT=docs/design/handoffs BALANCE_SIM_NAME=balance-sim-step1-full npx vitest run --root packages/engine test/balance/balance-sim.test.ts`.

Made by `packages/engine/test/balance/` (the fight simulator, instrument 1 of `docs/design/proposals/2026-11-balance-pass.md`). **This measures the game as it is, with enemies of the character's or the squad's level (rules 1.15).** Whole fights are played through the real rules with seeded dice: the player side by a fixed way of playing (section 12 says exactly what each one does and does not do), the enemies by the engine's own AI. 20 fights a row for duels, 10 for the long fights; the run took 1032 seconds. Run it again with `BALANCE_SIM_OUT=docs/design/handoffs npx vitest run --root packages/engine test/balance/balance-sim.test.ts`.

**How to read it.** "Normal share" is a character who put 36% of all Skill points in the main attack skill (4 of 10 at creation; the rest in defence and utility). "All in" raises the main skill and its attribute as fast as the level's ceiling allows. "Damage a turn" counts every turn the character took, walking and reloading turns included. Damage is what the hit dealt, not cut off at the target's last HP. Three kinds of fight are used: **the shooting range** (8 turns on a target with a soldier's numbers that never acts: damage with nothing in the way), **the sandbag under fire** (the same target shooting back with a soldier's rifle, for 8 rounds or until the character goes down), and **real fights** (duels, focus, squads) that end when one side is down. **Every enemy is the level of the character or squad it faces; at level 1 the four tiers are (Minion 70 HP, Defense 10, armour 0; Soldier 140 HP, Defense 11, armour 5; Elite 240 HP, Defense 12, armour 10; Boss 960 HP, Defense 13, armour 10), and the level table raises them (`data/enemies.json`).**

## 1. Summary: what matters most, against the targets

1. **Attacks to kill an enemy (minion inside the target, soldier inside the target, elite inside the target, boss above the target).** The yardstick (service rifle, normal share) needs these hits that land to kill, at level 1: minion 2, soldier 4, elite 7, boss 28; at level 20: minion 2, soldier 4, elite 8, boss 32. Target: minion 2, soldier 3 to 4, elite 6 to 8, boss about 20. Enemies are the character's level (section 4.2).
2. **Fight length (standard fight: partly inside the target; boss fight: partly inside the target).** A squad of four wins the standard fight in 3.9 to 5.6 rounds on open ground and 4.8 to 5.7 with cover, and the boss fight in 6.3 to 8.9 and 8.5 to 9 (levels 1 to 20; it won 151 of 160). Targets: 4 to 6 rounds, boss 8 to 10 (section 11).
3. **Damage a turn against the plain rifle (100%), normal share, lowest to highest over levels 1 to 20.** On the shooting range, 8 turns: optimised gun 170 to 224%, optimised blade 111 to 140%, Sigil 64 to 149%, Outburst 67 to 117%, Faith 67 to 125%, plain blade 86 to 106%, tank 49 to 74%, Calls leader 13 to 28%. Over the first 4 turns only (a fight of the target length): Sigil 53 to 126%, Outburst 67 to 121%, optimised gun 158 to 245%, optimised blade 79 to 125% (it walks for most of the first turn). Under fire (the target shoots back): optimised gun 179 to 226%, optimised blade 106 to 153%, Sigil 51 to 134%, Outburst 70 to 123%, Faith 62 to 125%, plain blade 92 to 117%, tank 38 to 57%, Calls leader 14 to 25%. Targets: optimised physical 150%, Sigil up to 150% on average over the fight, Outburst 125% steady. The casters are played in a simple fixed way (section 12): read theirs as a floor. Section 3.1 has every level.
4. **What techniques add to the optimised builds.** With the same sheet and gear on the shooting range, the optimised gun with its techniques does 90 to 103% of what it does with plain shots only, and spends 0% of its AP on techniques: it used none, so the spread around 100% is dice (the way it is played picks a technique only when it beats the plain shot for its AP; against a target that is not Pressed none does). The optimised blade with its techniques does 103 to 130% of its own plain cuts (37 to 42% of its AP on techniques). The gun's place against the 150% target is its weapon: a long rifle's base damage is 50, the service rifle's 30, at the same AP a shot.
5. **The biggest single hits in a fight:** 482 (Sigil caster, all in, level 20: Evoke STONE·FIRE·CONDENSE·SEEK, critical); 454 (Outburst caster, normal share, level 12: Release Heart Bolt (stage 4), critical); 356 (Optimised gun, normal share, level 20: Dead Centre (Long rifle), critical); 292 (Faith build, normal share, level 20: Miracle: The Sky Answers). Targets: 350 a hit, 500 on a mega critical. Nothing passed 500 in a fight. Nothing passed 350 without a critical. On the engine's own card with the price fully met (section 3.4), against a boss: Dead Centre (Optimised gun, all in, level 20): 182 on a hit, 374 on a critical; Coup (Optimised blade, normal share, level 20): 233 on a hit, 373 on a critical. The reference weapons are not the hardest-hitting in the data (the breacher tube and the bows hit harder: `balance-baseline.md`).
6. **Accuracy and criticals.** Hit chance of the yardstick's first shot at 4 tiles on open ground, level 1: minion 70%, soldier 65%, elite 60%, boss 55%; level 20: minion 70%, soldier 65%, elite 60%, boss 55% (target: about 65% at equal level). A critical multiplies the yardstick's damage by 1.6 at level 1 and 1.8 at level 20 (1.7 all in) (target: ×1.5, to ×2 with perks and gear). Criticals were 5 to 22% of the weapon builds' damage (proposed limit: 20%).
7. **How hard enemies hit, and how long a character lasts.** A plain hit before armour, with the weapon each tier carries here: minion 20, soldier 23, elite 29, boss 30. Turns of ONE enemy to take the yardstick character from full HP to 0, level 1: minion 29.6, soldier 7.7, elite 8.5, boss 6.5; level 20: minion 24.2, soldier 10.5, elite 9.8, boss 7.1. With every enemy on it, at level 1, 4 minions: down in 0% of fights; 4 soldiers: down in 100% of fights (round 2 on average); 2 elites: down in 90% of fights (round 4.8 on average) | at level 9, 4 minions: down in 0% of fights; 4 soldiers: down in 100% of fights (round 2.1 on average); 2 elites: down in 90% of fights (round 5.9 on average) | at level 20, 4 minions: down in 0% of fights; 4 soldiers: down in 100% of fights (round 2.1 on average); 2 elites: down in 70% of fights (round 6 on average). Target: 3 turns of focus (which of the two readings is meant is question 1).
8. **The tank takes 30 to 65% of the damage the plain rifleman takes from an elite, per enemy turn, and deals 49 to 74% of his damage on the range (38 to 57% under fire).** Under fire it spends 8 to 24% of its AP walking and 19 to 20% on Guard. It wears the heaviest armour it can carry and still walk 1 tile an AP (section 2, assumption 4).
9. **Resources and AP.** The Fighter's Momentum was empty at the start of 84 to 94% of its turns under fire (30 to 48% on the range) (every hit taken costs 1; only a plain cut that lands gives 1). The Outburst caster at level 9 spent 394 MP over 8 turns on the range from a pool of 300, kept going by Syphon (5 a fight); it started 0% of its turns with no MP and 0% at its Strain limit. The Sigil caster started 0% of its turns with no spare core left (a 4-glyph Line and its Evoke burn most of a core; the kit carries 4 spares). No build left more than 16% of its AP unspent; AP above 6 was seen in 4 of the 8-turn rows (section 5 names the sources). Section 9 has every resource.
10. **Growth from level 1 to 20 (normal share, on the range):** plain rifle ×1.4 damage, ×3.1 HP; optimised gun ×1.6 damage, ×3 HP; optimised blade ×1.4 damage, ×3.1 HP; Sigil ×3.4 damage, ×3 HP; Outburst ×2.5 damage, ×2.6 HP. Target (proposed): damage and HP each about ×3 to ×4, in step. On the range the target is the character's level, so its Defense and armour grow too: read the damage growth as growth against an equal enemy.

**What this report cannot tell you** (details in section 12):

1. **Control** (rule: never two lost turns in a row). The longest run seen was 0 for a character and 1 for an enemy, but the ways of playing never use control on purpose. A squad built to stun is not measured here.
2. **The ceiling of the casters.** The Sigil caster plays one kind of Line and the Outburst caster one design. A good player does more.
3. **The worth of the Calls leader, the Faith build's support, and anything that is not damage.** Only damage dealt and taken is counted.
4. **The strongest weapons.** The optimised gun is a Masterwork long rifle and the optimised blade a Masterwork greatsword: sensible picks, not the highest numbers in the weapon list.

## 2. The reference builds

Every build was made by the game's own rules (the creation check, the level table, the attribute ceiling by level, the class of the highest attribute at level 3, perk steps at Mastery). A test asserts it. Assumptions for what play earns and levels do not (**proposed**, not rules):

1. Weapon drill on the build's own weapon (optimised builds and the tank): mark I by level 3, mark II by level 6, mark III by level 9.
2. Sigil words learned by study: 0 picks by level 1, 2 picks by level 3, 4 picks by level 6, 6 picks by level 9, 8 picks by level 12, 14 picks by level 20 (each still needs a free slot under the Brain Power cap).
3. Devotion of the Faith build: 3 at level 1, 3 at level 3, 5 at level 6, 7 at level 9, 7 at level 12, 10 at level 20.
4. Gear: standard quality for the plain builds and the casters' kit weapons; Masterwork for the optimised builds and the tank; for the tank, the heaviest armour class that its Pain Threshold allows, that its kit stays inside its carry limit with, and that leaves it walking at least 1 tile an AP (with a riot shield and a sabre that is Class 4 from level 3: Class 5 would need Strength 6 to carry); Class 3 for the other weapon builds, the kit's own for the rest. No build is overburdened: spare ammunition is cut first. Gear has no level in the rules today.
5. Plain builds take no perk steps (the Mastered perk at 10 points comes by itself). An all-in build holds an Attribute point back when the class attribute is at the level's ceiling, for the next ceiling.

| Build | What it is |
|---|---|
| Plain gun (a) | Service rifle (standard), plain shots only. No perk steps taken. The yardstick: 100%. |
| Plain blade (b) | Sabre (standard), plain cuts only. No perk steps taken. A sabre hits with Dexterity, so the class the rules give at level 3 is Marksman. |
| Optimised gun (c) | Long rifle (Masterwork), Marksman, the best ranged techniques it can ready, perk steps in its skills. |
| Optimised blade (d) | Greatsword (Masterwork), Fighter (a Raw Power weapon, so Strength is the highest attribute), the best melee techniques it can ready. |
| Tank (e) | Sabre (Masterwork) and riot shield, the heaviest armour Pain Threshold allows, Defender. Its main skill is Durability (Guard), not its weapon skill. |
| Sigil caster (f) | Evoker and the kit's service pistol, Mage. Words: FIRE and SEEK at creation, then the damage words as fast as study and Brain Power allow. |
| Outburst caster (g) | Emanator and the kit's revolver, Channeler. Design: the starting Heart Bolt (Damage, reach 8). |
| Faith build (h) | Sworn to Old Overcast (the damage patron), service rifle (standard), Guardian. Hymns as Devotion allows, plain shots between them. |
| Calls leader (i) | The nine gamma skills (Authority and Charisma first) and the kit's service pistol. Class: Guardian (Virtue). |

| Build | Share | Level | Sheet |
|---|---|---|---|
| Plain gun | normal share | 1 | skills Dexterity 4, Athletics 2, Pain Threshold 1, Vigilance 1, Guts 1, Reaction Speed 1 · attributes endurance 4, agility 4, strength 3, perception 3 · no class yet · Hellraiser service rifle · armour Class 3 · HP 145 |
| Plain gun | normal share | 9 | skills Dexterity 8, Athletics 3, Pain Threshold 3, Vigilance 3, Guts 3, Reaction Speed 2 · attributes agility 8, endurance 4, strength 3, perception 3 · Marksman rank 2 · Hellraiser service rifle · armour Class 3 · HP 233 |
| Plain gun | normal share | 20 | skills Dexterity 10, Athletics 8, Reaction Speed 6, Pain Threshold 5, Vigilance 5, Guts 4 · attributes agility 10, endurance 5, perception 5, strength 4 · Marksman rank 3 · Hellraiser service rifle · armour Class 3 · HP 445 · perks Trick Shot (Mastered) |
| Plain gun | all in | 1 | skills Dexterity 7, Athletics 3 · attributes agility 7, endurance 3, strength 2, perception 2 · no class yet · Hellraiser service rifle · armour Class 3 · HP 130 |
| Plain gun | all in | 9 | skills Dexterity 10, Athletics 10, Reaction Speed 2 · attributes agility 10, endurance 4, strength 2, perception 2 · Marksman rank 2 · Hellraiser service rifle · armour Class 3 · HP 185 · perks Trick Shot (Mastered), Never There (Mastered) |
| Plain gun | all in | 20 | skills Dexterity 10, Athletics 10, Reaction Speed 10, Pain Threshold 8 · attributes endurance 10, agility 10, strength 2, perception 2 · Marksman rank 3 · Hellraiser service rifle · armour Class 3 · HP 634 · perks Trick Shot (Mastered), Never There (Mastered), Before the Blink (Mastered) |
| Plain blade | normal share | 1 | skills Dexterity 4, Athletics 2, Pain Threshold 1, Guts 1, Durability 1, Reaction Speed 1 · attributes endurance 4, agility 4, strength 3, perception 3 · no class yet · Sabre · armour Class 3 · HP 145 |
| Plain blade | normal share | 9 | skills Dexterity 8, Athletics 3, Pain Threshold 3, Guts 3, Durability 3, Reaction Speed 2 · attributes agility 8, endurance 4, strength 3, perception 3 · Marksman rank 2 · Sabre · armour Class 3 · HP 233 |
| Plain blade | normal share | 20 | skills Dexterity 10, Athletics 7, Pain Threshold 6, Guts 5, Durability 5, Reaction Speed 5 · attributes agility 10, endurance 6, strength 5, perception 3 · Marksman rank 3 · Sabre · armour Class 3 · HP 498 · perks Trick Shot (Mastered) |
| Plain blade | all in | 1 | skills Dexterity 7, Athletics 3 · attributes agility 7, endurance 3, strength 2, perception 2 · no class yet · Sabre · armour Class 3 · HP 130 |
| Plain blade | all in | 9 | skills Dexterity 10, Athletics 10, Reaction Speed 2 · attributes agility 10, endurance 4, strength 2, perception 2 · Marksman rank 2 · Sabre · armour Class 3 · HP 185 · perks Trick Shot (Mastered), Never There (Mastered) |
| Plain blade | all in | 20 | skills Dexterity 10, Athletics 10, Reaction Speed 10, Pain Threshold 8 · attributes endurance 10, agility 10, strength 2, perception 2 · Marksman rank 3 · Sabre · armour Class 3 · HP 634 · perks Trick Shot (Mastered), Never There (Mastered), Before the Blink (Mastered) |
| Optimised gun | normal share | 1 | skills Dexterity 4, Athletics 1, Acuity 1, Ingenuity 1, Reaction Speed 1, Pain Threshold 1, Vigilance 1 · attributes agility 4, perception 4, endurance 3, strength 3 · no class yet · Long rifle (masterwork) · armour Class 3 · HP 130 · perks Running Reload |
| Optimised gun | normal share | 9 | skills Dexterity 8, Athletics 3, Acuity 3, Ingenuity 2, Reaction Speed 2, Pain Threshold 2, Vigilance 2 · attributes agility 8, perception 4, endurance 3, strength 3 · Marksman rank 2 · Long rifle (masterwork) · armour Class 3 · HP 202 · perks Running Reload II, Both Hands, Roll With It, Detective's Eye |
| Optimised gun | normal share | 20 | skills Dexterity 10, Athletics 6, Acuity 5, Ingenuity 5, Reaction Speed 4, Pain Threshold 4, Vigilance 4 · attributes agility 10, perception 7, endurance 4, strength 3 · Marksman rank 3 · Long rifle (masterwork) · armour Class 3 · HP 392 · perks Running Reload II, Both Hands II, Roll With It II, Detective's Eye II, Sleight of Hand II, Rounding Up, Trick Shot (Mastered), Used to the Pain, Got You in My Sight |
| Optimised gun | all in | 1 | skills Dexterity 7, Athletics 3 · attributes agility 7, perception 3, endurance 2, strength 2 · no class yet · Long rifle (masterwork) · armour Class 3 · HP 115 · perks Running Reload II, Both Hands, Roll With It |
| Optimised gun | all in | 9 | skills Dexterity 10, Athletics 10, Reaction Speed 2 · attributes agility 10, perception 4, endurance 2, strength 2 · Marksman rank 2 · Long rifle (masterwork) · armour Class 3 · HP 155 · perks Running Reload II, Both Hands II, Roll With It II, Wall Run II, Trick Shot (Mastered), Never There (Mastered) |
| Optimised gun | all in | 20 | skills Dexterity 10, Athletics 10, Reaction Speed 10, Ingenuity 8 · attributes agility 10, perception 10, endurance 2, strength 2 · Marksman rank 3 · Long rifle (masterwork) · armour Class 3 · HP 210 · perks Running Reload II, Both Hands II, Roll With It II, Wall Run II, Trick Shot (Mastered), Never There (Mastered), Rounding Up II, Catch II, Before the Blink (Mastered), Sleight of Hand II, Shadow Step |
| Optimised blade | normal share | 1 | skills Raw Power 4, Guts 1, Athletics 1, Pain Threshold 1, Durability 1, Reaction Speed 1, Intimidation 1 · attributes endurance 4, strength 4, agility 3, perception 3 · no class yet · Adamantile greatsword (masterwork) · armour Class 3 · HP 145 · perks Breaching Strike |
| Optimised blade | normal share | 9 | skills Raw Power 8, Guts 3, Athletics 3, Pain Threshold 3, Durability 2, Reaction Speed 2, Intimidation 1 · attributes strength 8, endurance 4, agility 3, perception 3 · Fighter rank 2 · Adamantile greatsword (masterwork) · armour Class 3 · HP 233 · perks Breaching Strike II, Iron Stomach, Iron Grip, Roll With It, Used to the Pain |
| Optimised blade | normal share | 20 | skills Raw Power 10, Guts 6, Athletics 6, Pain Threshold 5, Durability 4, Reaction Speed 4, Intimidation 3 · attributes strength 10, agility 6, endurance 5, perception 3 · Fighter rank 3 · Adamantile greatsword (masterwork) · armour Class 3 · HP 445 · perks Breaching Strike II, Iron Stomach II, Iron Grip II, Roll With It II, Used to the Pain II, Bulwark, Earthbreaker (Mastered), Rounding Up, Grim Reaper |
| Optimised blade | all in | 1 | skills Raw Power 7, Guts 3 · attributes strength 7, endurance 3, agility 2, perception 2 · no class yet · Adamantile greatsword (masterwork) · armour Class 3 · HP 130 · perks Breaching Strike II, Iron Grip, Iron Stomach |
| Optimised blade | all in | 9 | skills Raw Power 10, Guts 10, Intimidation 2 · attributes strength 10, endurance 4, agility 2, perception 2 · Fighter rank 2 · Adamantile greatsword (masterwork) · armour Class 3 · HP 185 · perks Breaching Strike II, Iron Grip II, Iron Stomach II, Into the Dark II, Earthbreaker (Mastered), Nothing Left to Fear (Mastered) |
| Optimised blade | all in | 20 | skills Raw Power 10, Guts 10, Intimidation 10, Athletics 4, Pain Threshold 4 · attributes strength 10, endurance 8, agility 4, perception 2 · Fighter rank 3 · Adamantile greatsword (masterwork) · armour Class 3 · HP 452 · perks Breaching Strike II, Iron Grip II, Iron Stomach II, Into the Dark II, Earthbreaker (Mastered), Nothing Left to Fear (Mastered), Grim Reaper II, Bone Talk II, The Name They Whisper (Mastered), Roll With It, Used to the Pain |
| Tank | normal share | 1 | skills Durability 3, Pain Threshold 2, Dexterity 2, Guts 1, Athletics 1, Senses 1 · attributes endurance 4, strength 4, agility 3, perception 3 · no class yet · Sabre (masterwork) + Legion riot shield · armour Class 3 · HP 145 · perks Bulwark |
| Tank | normal share | 9 | skills Durability 7, Pain Threshold 5, Dexterity 4, Guts 2, Athletics 2, Senses 2 · attributes endurance 7, strength 4, agility 4, perception 3 · Defender rank 2 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 310 · perks Bulwark II, Used to the Pain II, Both Hands, Shrug It Off |
| Tank | normal share | 20 | skills Durability 10, Pain Threshold 9, Dexterity 7, Guts 4, Athletics 4, Senses 4 · attributes endurance 10, agility 7, strength 4, perception 3 · Defender rank 3 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 672 · perks Bulwark II, Used to the Pain II, Both Hands II, Shrug It Off II, Iron Stomach, Wind on the Skin, Wall Run, Scar Tissue II, Running Reload, Last Wall (Mastered) |
| Tank | all in | 1 | skills Durability 7, Pain Threshold 3 · attributes endurance 7, strength 3, agility 2, perception 2 · no class yet · Sabre (masterwork) + Legion riot shield · armour Class 2 · HP 190 · perks Bulwark II, Used to the Pain, Shrug It Off |
| Tank | all in | 9 | skills Durability 10, Pain Threshold 10, Dexterity 2 · attributes endurance 10, strength 4, agility 2, perception 2 · Defender rank 2 · Sabre (masterwork) + Legion riot shield · armour Class 2 · HP 435 · perks Bulwark II, Used to the Pain II, Shrug It Off II, Scar Tissue II, Last Wall (Mastered), Walking Wounded (Mastered) |
| Tank | all in | 20 | skills Durability 10, Pain Threshold 10, Dexterity 8, Athletics 6, Guts 4 · attributes endurance 10, agility 8, strength 4, perception 2 · Defender rank 3 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 710 · perks Bulwark II, Used to the Pain II, Shrug It Off II, Scar Tissue II, Last Wall (Mastered), Walking Wounded (Mastered), Both Hands II, Iron Stomach, Wall Run II, Running Reload |
| Sigil caster | normal share | 1 | skills Brain Power 4, Visualization 1, Rumination 1, Athletics 1, Pain Threshold 1, Dexterity 1, Improvisation 1 · attributes intelligence 4, expression 4, endurance 3, agility 3 · no class yet · Service pistol (.32 Decrkm) + Evoker · armour Class 1 · HP 130 · perks Hold the Stroke |
| Sigil caster | normal share | 9 | skills Brain Power 8, Visualization 4, Rumination 2, Athletics 2, Pain Threshold 2, Dexterity 2, Improvisation 2 · attributes intelligence 8, expression 4, endurance 3, agility 3 · Mage rank 2 · Service pistol (.32 Decrkm) + Evoker · armour Class 1 · HP 202 · perks Hold the Stroke II, Mirage, Parallel Thought |
| Sigil caster | normal share | 20 | skills Brain Power 10, Visualization 6, Rumination 5, Improvisation 5, Athletics 4, Pain Threshold 4, Dexterity 4 · attributes intelligence 10, expression 6, endurance 4, agility 4 · Mage rank 3 · Service pistol (.32 Decrkm) + Evoker · armour Class 1 · HP 392 · perks Hold the Stroke II, Mirage II, Parallel Thought II, Footnote II, Roll With It, Used to the Pain, Clean Draw (Mastered), Both Hands, Jury-Rig II |
| Sigil caster | all in | 1 | skills Brain Power 7, Rumination 3 · attributes intelligence 7, expression 3, endurance 2, agility 2 · no class yet · Service pistol (.32 Decrkm) + Evoker · armour Class 1 · HP 115 · perks Hold the Stroke II, Parallel Thought, Footnote |
| Sigil caster | all in | 9 | skills Brain Power 10, Rumination 10, Eloquence 2 · attributes intelligence 10, expression 4, endurance 2, agility 2 · Mage rank 2 · Service pistol (.32 Decrkm) + Evoker · armour Class 1 · HP 155 · perks Hold the Stroke II, Parallel Thought II, Footnote II, Lab Coat II, Clean Draw (Mastered), Established Fact (Mastered) |
| Sigil caster | all in | 20 | skills Brain Power 10, Rumination 10, Eloquence 10, Visualization 8 · attributes intelligence 10, expression 10, endurance 2, agility 2 · Mage rank 3 · Service pistol (.32 Decrkm) + Evoker · armour Class 1 · HP 210 · perks Hold the Stroke II, Parallel Thought II, Footnote II, Lab Coat II, Clean Draw (Mastered), Established Fact (Mastered), Overruled! II, Burden of Proof II, Closing Argument (Mastered), Mirage II, Blueprint |
| Outburst caster | normal share | 1 | skills Will Power 4, Empathy 1, Composure 1, Pain Threshold 1, Athletics 1, Lore Master 1, Conscience 1 · attributes insight 4, determination 4, endurance 3, virtue 3 · no class yet · Drifter revolver + Emanator · armour Class 1 · HP 130 · perks Resonance |
| Outburst caster | normal share | 9 | skills Will Power 7, Empathy 4, Composure 3, Pain Threshold 2, Athletics 2, Lore Master 2, Conscience 2 · attributes determination 7, insight 4, endurance 3, virtue 3 · Channeler rank 2 · Drifter revolver + Emanator · armour Class 1 · HP 202 · perks Resonance II, Shared Breath, Heart Overload, You Get Used to It |
| Outburst caster | normal share | 20 | skills Will Power 10, Composure 7, Empathy 6, Lore Master 6, Pain Threshold 3, Athletics 3, Conscience 3 · attributes determination 10, insight 6, endurance 3, agility 3 · Channeler rank 3 · Drifter revolver + Emanator · armour Class 1 · HP 339 · perks Resonance II, Shared Breath II, Heart Overload II, You Get Used to It II, Used to the Pain, Rite in the Field II, Red Line, The Twin Pays (Mastered), Roll With It, Flat Line |
| Outburst caster | all in | 1 | skills Will Power 7, Composure 3 · attributes determination 7, insight 3, endurance 2, virtue 2 · no class yet · Drifter revolver + Emanator · armour Class 1 · HP 115 · perks Resonance II, Heart Overload, You Get Used to It |
| Outburst caster | all in | 9 | skills Will Power 10, Composure 10, Lore Master 2 · attributes determination 10, insight 4, endurance 2, virtue 2 · Channeler rank 2 · Drifter revolver + Emanator · armour Class 1 · HP 155 · perks Resonance II, Heart Overload II, You Get Used to It II, Flat Line II, The Twin Pays (Mastered), Still Water (Mastered) |
| Outburst caster | all in | 20 | skills Will Power 10, Composure 10, Lore Master 10, Empathy 8 · attributes insight 10, determination 10, endurance 2, virtue 2 · Channeler rank 3 · Drifter revolver + Emanator · armour Class 1 · HP 210 · perks Resonance II, Heart Overload II, You Get Used to It II, Flat Line II, The Twin Pays (Mastered), Still Water (Mastered), Rite in the Field II, Old Tongue II, True Name (Mastered), Shared Breath II, Lay Down Arms |
| Faith build | normal share | 1 | skills Faith 3, Dexterity 2, Conscience 1, Pain Threshold 1, Athletics 1, Authority 1, Guts 1 · attributes agility 4, virtue 4, endurance 3, perception 3 · no class yet · Hellraiser service rifle · armour Class 3 · HP 130 · perks Litany |
| Faith build | normal share | 9 | skills Faith 8, Dexterity 4, Conscience 3, Pain Threshold 2, Athletics 2, Authority 2, Guts 1 · attributes virtue 8, agility 4, endurance 3, perception 3 · Guardian rank 2 · Hellraiser service rifle · armour Class 3 · HP 202 · perks Litany II, Both Hands, Holy Ordnance, Red Line |
| Faith build | normal share | 20 | skills Faith 10, Dexterity 7, Conscience 6, Athletics 5, Authority 5, Pain Threshold 3, Guts 2 · attributes virtue 10, agility 7, endurance 3, perception 3 · Guardian rank 3 · Hellraiser service rifle · armour Class 3 · HP 339 · perks Litany II, Both Hands II, Holy Ordnance II, Red Line II, Roll With It II, Used to the Pain, Outclassed II, Judgement Day (Mastered), Running Reload |
| Faith build | all in | 1 | skills Faith 7, Conscience 3 · attributes virtue 7, agility 3, endurance 2, perception 2 · no class yet · Hellraiser service rifle · armour Class 3 · HP 115 · perks Litany II, Holy Ordnance, Red Line |
| Faith build | all in | 9 | skills Faith 10, Conscience 10, Authority 2 · attributes virtue 10, agility 4, endurance 2, perception 2 · Guardian rank 2 · Hellraiser service rifle · armour Class 3 · HP 155 · perks Litany II, Holy Ordnance II, Red Line II, Clean Hands II, Judgement Day (Mastered), Foreseen (Mastered) |
| Faith build | all in | 20 | skills Faith 10, Conscience 10, Authority 10, Dexterity 8 · attributes agility 10, virtue 10, endurance 2, perception 2 · Guardian rank 3 · Hellraiser service rifle · armour Class 3 · HP 210 · perks Litany II, Holy Ordnance II, Red Line II, Clean Hands II, Judgement Day (Mastered), Foreseen (Mastered), Outclassed II, Real Power II, On My Mark (Mastered), Both Hands II, Running Reload |
| Calls leader | normal share | 1 | skills Authority 2, Charisma 2, Dexterity 1, Intimidation 1, Vigilance 1, Eloquence 1, Insinuation 1 · attributes virtue 4, endurance 3, agility 3, perception 3 · no class yet · Service pistol (.32 Decrkm) · armour Class 2 · HP 130 |
| Calls leader | normal share | 9 | skills Authority 4, Charisma 3, Dexterity 3, Vigilance 3, Intimidation 2, Reaction Speed 2, Senses 2 · attributes endurance 4, agility 4, virtue 4, perception 3 · Guardian rank 1 · Service pistol (.32 Decrkm) · armour Class 2 · HP 185 · perks Outclassed, Talks Broke Down, Both Hands, Got You in My Sight |
| Calls leader | normal share | 20 | skills Authority 6, Charisma 6, Dexterity 4, Reaction Speed 4, Senses 4, Pain Threshold 4, Vigilance 3 · attributes expression 6, virtue 6, endurance 4, agility 4 · Guardian rank 2 · Service pistol (.32 Decrkm) · armour Class 2 · HP 392 · perks Outclassed II, Talks Broke Down II, Both Hands, Got You in My Sight, Rounding Up, Wind on the Skin, Used to the Pain |
| Calls leader | all in | 1 | skills Authority 7, Charisma 3 · attributes virtue 7, expression 3, endurance 2, agility 2 · no class yet · Service pistol (.32 Decrkm) · armour Class 2 · HP 115 · perks Outclassed II, Talks Broke Down, Real Power |
| Calls leader | all in | 9 | skills Authority 9, Charisma 5, Reaction Speed 2, Intimidation 1, Vigilance 1, Eloquence 1, Insinuation 1 · attributes virtue 9, expression 5, endurance 2, agility 2 · Guardian rank 2 · Service pistol (.32 Decrkm) · armour Class 2 · HP 155 · perks Outclassed II, Talks Broke Down II, Real Power II |
| Calls leader | all in | 20 | skills Authority 10, Charisma 10, Reaction Speed 2, Senses 2, Dexterity 2, Pain Threshold 2, Athletics 2 · attributes expression 10, virtue 10, endurance 2, agility 2 · Guardian rank 3 · Service pistol (.32 Decrkm) · armour Class 2 · HP 286 · perks Outclassed II, Talks Broke Down II, Real Power II, On My Mark (Mastered), Crowd Pleaser II, Everyone's Friend (Mastered) |

Where a build could not have what was wanted:

1. Optimised gun, all in, level 1: ammunition: the loose rounds are left behind (carry limit)
2. Optimised gun, all in, level 3: ammunition: the loose rounds are left behind (carry limit)
3. Optimised gun, all in, level 6: ammunition: the loose rounds are left behind (carry limit)
4. Optimised gun, all in, level 9: ammunition: the loose rounds are left behind (carry limit)
5. Optimised gun, all in, level 12: ammunition: the loose rounds are left behind (carry limit)
6. Optimised gun, all in, level 20: ammunition: the loose rounds are left behind (carry limit)
7. Tank, normal share, level 1: armour: Class 5 wanted, Class 3 is the heaviest that allows its Pain Threshold
8. Tank, normal share, level 3: armour: Class 5 wanted, Class 4 is the heaviest that allows its Pain Threshold
9. Tank, normal share, level 6: armour: Class 5 wanted, Class 4 is the heaviest that allows its Pain Threshold
10. Tank, normal share, level 9: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 4 is the heaviest that allows its carry limit (Strength)
11. Tank, normal share, level 12: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 4 is the heaviest that allows its carry limit (Strength)
12. Tank, normal share, level 20: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 4 is the heaviest that allows its carry limit (Strength)
13. Tank, all in, level 1: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 2 is the heaviest that allows walking at least 1 tile an AP
14. Tank, all in, level 3: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 2 is the heaviest that allows walking at least 1 tile an AP
15. Tank, all in, level 6: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 2 is the heaviest that allows walking at least 1 tile an AP
16. Tank, all in, level 9: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 2 is the heaviest that allows walking at least 1 tile an AP
17. Tank, all in, level 12: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 4 is the heaviest that allows its carry limit (Strength)
18. Tank, all in, level 20: ammunition: the loose rounds are left behind (carry limit); ammunition: one magazine fewer (carry limit); armour: Class 5 wanted, Class 4 is the heaviest that allows its carry limit (Strength)

## 3. Angle A: damage

### 3.1 Damage a turn, against the plain rifle

**On the shooting range.** Eight turns on a target with a soldier's Defense (12) and armour (5) and 5,000 HP that never acts: nothing Presses the character, nothing costs it Momentum, nobody goes down. This is the cleanest reading of "take your weapon and attack every turn". Each cell: damage a turn · percent of the plain rifle with a normal share at the same level.

**normal share, on the range**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 71.6 · 100% | 77.8 · 100% | 98.6 · 100% | 107.6 · 100% | 124.6 · 100% | 103.8 · 100% |
| Plain blade | 65.3 · 91% | 76.9 · 99% | 87 · 88% | 96 · 89% | 107.2 · 86% | 109.7 · 106% |
| Optimised gun | 149.1 · 208% | 153.9 · 198% | 183.5 · 186% | 185.4 · 172% | 211.3 · 170% | 232 · 224% |
| Optimised blade | 100 · 140% | 99 · 127% | 112.2 · 114% | 132.8 · 123% | 138.3 · 111% | 144.7 · 139% |
| Tank | 45.1 · 63% | 57.9 · 74% | 68.9 · 70% | 53.8 · 50% | 60.7 · 49% | 76.9 · 74% |
| Sigil caster | 45.6 · 64% | 58.8 · 76% | 69.4 · 70% | 70.5 · 66% | 122.1 · 98% | 154.7 · 149% |
| Outburst caster | 48 · 67% | 70.4 · 90% | 78.6 · 80% | 77.9 · 72% | 110.8 · 89% | 121.7 · 117% |
| Faith build | 59.6 · 83% | 52.5 · 67% | 99.5 · 101% | 108.7 · 101% | 113 · 91% | 129.3 · 125% |
| Calls leader | 20.3 · 28% | 18.5 · 24% | 18.5 · 19% | 23.9 · 22% | 17.7 · 14% | 13.3 · 13% |

**all in, on the range**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 119.5 · 167% | 128 · 165% | 143.3 · 145% | 138.1 · 128% | 130.2 · 104% | 117.4 · 113% |
| Plain blade | 108.1 · 151% | 116 · 149% | 126.2 · 128% | 123.6 · 115% | 118.4 · 95% | 107.1 · 103% |
| Optimised gun | 222.4 · 311% | 243 · 312% | 271.7 · 276% | 261.2 · 243% | 254.8 · 204% | 229 · 221% |
| Optimised blade | 118.9 · 166% | 127.1 · 163% | 132.9 · 135% | 140.5 · 131% | 129.8 · 104% | 145.4 · 140% |
| Tank | 24.8 · 35% | 22.8 · 29% | 25 · 25% | 27.1 · 25% | 41.5 · 33% | 101.2 · 97% |
| Sigil caster | 73.2 · 102% | 72.7 · 93% | 102.9 · 104% | 99.1 · 92% | 104 · 83% | 128.6 · 124% |
| Outburst caster | 71.1 · 99% | 95.7 · 123% | 105.7 · 107% | 99.5 · 92% | 107.8 · 87% | 158.1 · 152% |
| Faith build | 35.4 · 49% | 26.7 · 34% | 103.1 · 105% | 107 · 99% | 108.6 · 87% | 139.5 · 134% |
| Calls leader | 11.5 · 16% | 9.4 · 12% | 8.1 · 8% | 3 · 3% | 4.2 · 3% | 6 · 6% |

**Normal share, on the range, the first 4 turns only** (a fight of the target length: 4 to 6 rounds). A supply that runs out later does not show here; a walk to the target (melee) weighs double. Each cell: damage a turn · percent of the plain rifle over its own first 4 turns.

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 73.8 · 100% | 76.2 · 100% | 102.3 · 100% | 117.6 · 100% | 133.9 · 100% | 101.9 · 100% |
| Plain blade | 57.2 · 78% | 63.7 · 84% | 78.3 · 77% | 84.2 · 72% | 91.6 · 68% | 102.7 · 101% |
| Optimised gun | 148 · 201% | 166.2 · 218% | 173.4 · 170% | 185.3 · 158% | 214.5 · 160% | 250.1 · 245% |
| Optimised blade | 81.7 · 111% | 88.7 · 116% | 102.9 · 101% | 108.9 · 93% | 106.2 · 79% | 127.1 · 125% |
| Tank | 26 · 35% | 35.8 · 47% | 45.2 · 44% | 31 · 26% | 43.5 · 32% | 60.6 · 59% |
| Sigil caster | 38.9 · 53% | 43.7 · 57% | 92.2 · 90% | 80.8 · 69% | 136.5 · 102% | 128.6 · 126% |
| Outburst caster | 49.7 · 67% | 68.1 · 89% | 86.1 · 84% | 86 · 73% | 117.4 · 88% | 123.8 · 121% |
| Faith build | 56.2 · 76% | 57.4 · 75% | 103.1 · 101% | 108.8 · 93% | 110.1 · 82% | 132 · 130% |
| Calls leader | 22 · 30% | 18.3 · 24% | 22.1 · 22% | 25.6 · 22% | 21 · 16% | 13.3 · 13% |

**What the techniques add** (normal share, on the range): the optimised builds with the same sheet and gear, making plain attacks only. Each cell: damage a turn with plain attacks only · with techniques · techniques as a percent of plain.

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Optimised gun | 144.3 · 149.1 · 103% | 171.5 · 153.9 · 90% | 177.7 · 183.5 · 103% | 193.4 · 185.4 · 96% | 230.7 · 211.3 · 92% | 236.2 · 232 · 98% |
| Optimised blade | 77 · 100 · 130% | 89.4 · 99 · 111% | 91.1 · 112.2 · 123% | 120.5 · 132.8 · 110% | 118.1 · 138.3 · 117% | 140.1 · 144.7 · 103% |

**Under fire.** The same target, shooting back with a soldier's rifle (Suppress and Burst), for 8 rounds or until the character goes down. Each cell: damage a turn · percent of the plain rifle (normal share, same level, also under fire) · rounds the character lasted, on average. A character that goes down early never finishes what it was setting up.

**normal share, under fire**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 62 · 100% · 7.6 | 81.4 · 100% · 7.8 | 80.7 · 100% · 7.8 | 100.6 · 100% · 7.9 | 91.4 · 100% · 7.3 | 111.8 · 100% · 7.9 |
| Plain blade | 62.5 · 101% · 8 | 74.5 · 92% · 8 | 90.7 · 112% · 8 | 106.4 · 106% · 8 | 106.9 · 117% · 8 | 117.1 · 105% · 8 |
| Optimised gun | 140.2 · 226% · 7.5 | 149.1 · 183% · 7.6 | 172.1 · 213% · 7.5 | 180 · 179% · 8 | 189.3 · 207% · 7.8 | 239.3 · 214% · 7.5 |
| Optimised blade | 94.7 · 153% · 8 | 98.5 · 121% · 8 | 107.1 · 133% · 8 | 106.8 · 106% · 8 | 132.4 · 145% · 8 | 138.2 · 124% · 8 |
| Tank | 34.8 · 56% · 8 | 43 · 53% · 8 | 46.3 · 57% · 8 | 38.1 · 38% · 8 | 42.7 · 47% · 8 | 64.2 · 57% · 8 |
| Sigil caster | 53.7 · 87% · 4.6 | 41.4 · 51% · 4.9 | 71.5 · 89% · 7.7 | 94.8 · 94% · 8 | 122.1 · 134% · 7.4 | 130 · 116% · 7.4 |
| Outburst caster | 43.6 · 70% · 4.2 | 62.9 · 77% · 4.2 | 74.4 · 92% · 4.3 | 113.5 · 113% · 4.1 | 112.6 · 123% · 4.7 | 134.9 · 121% · 4.4 |
| Faith build | 43.6 · 70% · 7 | 50.4 · 62% · 7.5 | 99.6 · 123% · 7.2 | 110 · 109% · 6.8 | 114 · 125% · 7.4 | 122.3 · 109% · 5.1 |
| Calls leader | 15.8 · 25% · 5 | 12.2 · 15% · 5.4 | 11.3 · 14% · 5.7 | 20 · 20% · 5.1 | 16.7 · 18% · 3.9 | 18.4 · 16% · 4.1 |

**all in, under fire**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 103.9 · 168% · 7.7 | 123.1 · 151% · 8 | 124.2 · 154% · 7.7 | 121.9 · 121% · 8 | 115.2 · 126% · 8 | 105.5 · 94% · 8 |
| Plain blade | 112.4 · 181% · 8 | 112.9 · 139% · 8 | 124.3 · 154% · 8 | 128.8 · 128% · 8 | 117.8 · 129% · 8 | 123.4 · 110% · 8 |
| Optimised gun | 191.2 · 308% · 7.2 | 219.3 · 269% · 7.7 | 235.5 · 292% · 8 | 238.7 · 237% · 8 | 219.1 · 240% · 7.9 | 226.7 · 203% · 6.8 |
| Optimised blade | 107 · 173% · 8 | 137.2 · 169% · 8 | 125.4 · 155% · 8 | 132.9 · 132% · 8 | 133.1 · 146% · 8 | 143.7 · 129% · 8 |
| Tank | 21.7 · 35% · 8 | 15.9 · 20% · 8 | 15.6 · 19% · 8 | 16.3 · 16% · 8 | 34.1 · 37% · 8 | 71.5 · 64% · 8 |
| Sigil caster | 79 · 127% · 7.2 | 86 · 106% · 6.7 | 109.1 · 135% · 5.6 | 71.9 · 71% · 4.4 | 129 · 141% · 6.2 | 110.8 · 99% · 4.8 |
| Outburst caster | 77.9 · 126% · 3.9 | 98.9 · 121% · 3.7 | 114.5 · 142% · 3.7 | 119.9 · 119% · 4.2 | 94.1 · 103% · 3.1 | 95.8 · 86% · 2.4 |
| Faith build | 26.1 · 42% · 6.4 | 22.7 · 28% · 5.9 | 100 · 124% · 5.5 | 104.9 · 104% · 5.5 | 101.4 · 111% · 4.8 | 121.7 · 109% · 2.5 |
| Calls leader | 7.2 · 12% · 4.5 | 9.4 · 12% · 4.4 | 7.4 · 9% · 4 | 2.9 · 3% · 4 | 6 · 7% · 3.3 | 4.1 · 4% · 3.8 |

**Normal share, under fire from a target with a boss's numbers** (Defense 14, armour 10, a light machine gun)

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 57 · 100% | 56.2 · 100% | 59.8 · 100% | 71 · 100% | 77.9 · 100% | 90.4 · 100% |
| Plain blade | 44 · 77% | 48.9 · 87% | 57.7 · 96% | 67 · 94% | 76.3 · 98% | 88.9 · 98% |
| Optimised gun | 130.2 · 228% | 125 · 222% | 151.1 · 253% | 166.9 · 235% | 208.2 · 267% | 186.3 · 206% |
| Optimised blade | 62 · 109% | 87.4 · 156% | 73.3 · 123% | 92.8 · 131% | 97 · 125% | 110.8 · 123% |
| Tank | 25.7 · 45% | 31.2 · 56% | 31.4 · 53% | 31 · 44% | 29.5 · 38% | 42.4 · 47% |
| Sigil caster | 31.1 · 55% | 30.2 · 54% | 32.9 · 55% | 60.1 · 85% | 68.9 · 88% | 98.5 · 109% |
| Outburst caster | 38.6 · 68% | 55.7 · 99% | 78.8 · 132% | 73.4 · 103% | 118.1 · 152% | 110.1 · 122% |
| Faith build | 32.2 · 56% | 38.4 · 68% | 90.3 · 151% | 96.4 · 136% | 107 · 137% | 109 · 121% |
| Calls leader | 7.2 · 13% | 11.6 · 21% | 11.7 · 20% | 7.5 · 11% | 18.1 · 23% | 9.1 · 10% |

### 3.2 The biggest single hit of each build, and what made it

Over every fight of this run.

| Build | Share | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|
| Plain gun | normal share | 73 (plain shot (Hellraiser service rifle), critical) | 82 (plain shot (Hellraiser service rifle), critical) | 95 (plain shot (Hellraiser service rifle), critical) | 108 (plain shot (Hellraiser service rifle), critical) | 122 (plain shot (Hellraiser service rifle), critical) | 131 (plain shot (Hellraiser service rifle), critical) |
| Plain gun | all in | 97 (plain shot (Hellraiser service rifle), critical) | 106 (plain shot (Hellraiser service rifle), critical) | 115 (plain shot (Hellraiser service rifle), critical) | 124 (plain shot (Hellraiser service rifle), critical) | 124 (plain shot (Hellraiser service rifle), critical) | 124 (plain shot (Hellraiser service rifle), critical) |
| Plain blade | normal share | 68 (plain cut (Sabre), critical) | 76 (plain cut (Sabre), critical) | 89 (plain cut (Sabre), critical) | 101 (plain cut (Sabre), critical) | 114 (plain cut (Sabre), critical) | 118 (plain cut (Sabre), critical) |
| Plain blade | all in | 91 (plain cut (Sabre), critical) | 99 (plain cut (Sabre), critical) | 101 (plain cut (Sabre), critical) | 116 (plain cut (Sabre), critical) | 116 (plain cut (Sabre), critical) | 116 (plain cut (Sabre), critical) |
| Optimised gun | normal share | 206 (Dead Centre (Long rifle), critical) | 153 (plain shot (Long rifle), critical) | 172 (plain shot (Long rifle), critical) | 289 (Dead Centre (Long rifle), critical) | 228 (plain shot (Long rifle), critical) | 372 (Dead Centre (Long rifle), critical) |
| Optimised gun | all in | 182 (plain shot (Long rifle), critical) | 193 (plain shot (Long rifle), critical) | 215 (plain shot (Long rifle), critical) | 236 (plain shot (Long rifle), critical) | 244 (plain shot (Long rifle), critical) | 260 (plain shot (Long rifle), critical) |
| Optimised blade | normal share | 108 (plain cut (Adamantile greatsword), critical) | 118 (Lunge (Adamantile greatsword), critical) | 136 (Lunge (Adamantile greatsword), critical) | 169 (Coup (Adamantile greatsword)) | 243 (Coup (Adamantile greatsword), critical) | 178 (Coup (Adamantile greatsword)) |
| Optimised blade | all in | 137 (plain cut (Adamantile greatsword), critical) | 148 (Lunge (Adamantile greatsword), critical) | 153 (plain cut (Adamantile greatsword), critical) | 180 (Coup (Adamantile greatsword)) | 178 (Coup (Adamantile greatsword)) | 280 (Coup (Adamantile greatsword), critical) |
| Tank | normal share | 64 (plain cut (Sabre), critical) | 72 (plain cut (Sabre), critical) | 75 (plain cut (Sabre), critical) | 75 (plain cut (Sabre), critical) | 84 (plain cut (Sabre), critical) | 102 (plain cut (Sabre), critical) |
| Tank | all in | 51 (plain cut (Sabre), critical) | 51 (plain cut (Sabre), critical) | 51 (plain cut (Sabre), critical) | 58 (plain cut (Sabre), critical) | 74 (plain cut (Sabre), critical) | 109 (plain cut (Sabre), critical) |
| Sigil caster | normal share | 123 (Evoke FIRE·SEEK, critical) | 296 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 341 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 388 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 431 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 460 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) |
| Sigil caster | all in | 348 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 378 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 406 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 439 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 446 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 482 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) |
| Outburst caster | normal share | 154 (Release Heart Bolt (stage 4), critical) | 204 (Release Heart Bolt (stage 4), critical) | 211 (Release Heart Bolt (stage 4), critical) | 228 (Release Heart Bolt (stage 4), critical) | 454 (Release Heart Bolt (stage 4), critical) | 399 (Release Heart Bolt (stage 4), critical) |
| Outburst caster | all in | 187 (Release Heart Bolt (stage 3), critical) | 245 (Release Heart Bolt (stage 4), critical) | 263 (Release Heart Bolt (stage 4), critical) | 399 (Release Heart Bolt (stage 4), critical) | 280 (Release Heart Bolt (stage 4), critical) | 280 (Release Heart Bolt (stage 4), critical) |
| Faith build | normal share | 67 (plain shot (Hellraiser service rifle), critical) | 70 (plain shot (Hellraiser service rifle), critical) | 92 (Hymn: Lightning Rod) | 117 (Hymn: Lightning Rod) | 123 (Hymn: Lightning Rod) | 292 (Miracle: The Sky Answers) |
| Faith build | all in | 55 (plain shot (Hellraiser service rifle), critical) | 55 (plain shot (Hellraiser service rifle), critical) | 95 (Hymn: Lightning Rod) | 100 (Hymn: Lightning Rod) | 100 (Hymn: Lightning Rod) | 292 (Miracle: The Sky Answers) |
| Calls leader | normal share | 39 (plain shot (Service pistol (.32 Decrkm)), critical) | 39 (plain shot (Service pistol (.32 Decrkm)), critical) | 44 (plain shot (Service pistol (.32 Decrkm)), critical) | 46 (plain shot (Service pistol (.32 Decrkm)), critical) | 49 (plain shot (Service pistol (.32 Decrkm)), critical) | 49 (plain shot (Service pistol (.32 Decrkm)), critical) |
| Calls leader | all in | 33 (plain shot (Service pistol (.32 Decrkm)), critical) | 33 (plain shot (Service pistol (.32 Decrkm)), critical) | 33 (plain shot (Service pistol (.32 Decrkm)), critical) | 33 (plain shot (Service pistol (.32 Decrkm)), critical) | 34 (plain shot (Service pistol (.32 Decrkm)), critical) | 36 (plain shot (Service pistol (.32 Decrkm)), critical) |

### 3.3 The peak: each build's dearest move, with its whole price

Played to set the move up and use it (a target with a boss's numbers and 5,000 HP that shoots back; 8 rounds or until the character goes down). Each row is **the biggest single action that happened** in those fights (a lucky critical counts), not an average. "Damage" is everything that one use dealt; "one hit" its biggest single hit; the price is everything spent from the first action of the move to the last.

| Build | Share | Level | The biggest action seen | Damage | One hit | Price | On turn | Damage a turn, whole fight |
|---|---|---|---|---|---|---|---|---|
| Optimised gun | normal share | 1 | Aimed Shot (Long rifle), critical | 127 | 127 | 3 AP, +1 Heat, 1 rounds, 1 turn | 1 | 130.2 |
| Optimised gun | normal share | 3 | Aimed Shot (Long rifle), critical | 142 | 142 | 3 AP, 1 rounds, 1 turn | 4 | 123.7 |
| Optimised gun | normal share | 6 | Aimed Shot (Long rifle), critical | 165 | 165 | 3 AP, 1 rounds, 1 turn | 1 | 174 |
| Optimised gun | normal share | 9 | Aimed Shot (Long rifle), critical | 188 | 188 | 3 AP, 1 rounds, 1 turn | 2 | 182.4 |
| Optimised gun | normal share | 12 | Aimed Shot (Long rifle), critical | 212 | 212 | 3 AP, 1 rounds, 1 turn | 4 | 199.3 |
| Optimised gun | normal share | 20 | Aimed Shot (Long rifle), critical | 232 | 232 | 3 AP, 1 rounds, 1 turn | 4 | 195.6 |
| Optimised gun | all in | 1 | Aimed Shot (Long rifle), critical | 172 | 172 | 3 AP, +1 Heat, 1 rounds, 1 turn | 5 | 162.1 |
| Optimised gun | all in | 3 | Aimed Shot (Long rifle), critical | 187 | 187 | 3 AP, 1 rounds, 1 turn | 1 | 198.9 |
| Optimised gun | all in | 6 | Aimed Shot (Long rifle), critical | 202 | 202 | 3 AP, 1 rounds, 1 turn | 3 | 212.4 |
| Optimised gun | all in | 9 | Aimed Shot (Long rifle), critical | 222 | 222 | 3 AP, 1 rounds, 1 turn | 5 | 230 |
| Optimised gun | all in | 12 | Aimed Shot (Long rifle), critical | 228 | 228 | 3 AP, 1 rounds, 1 turn | 3 | 223.9 |
| Optimised gun | all in | 20 | Aimed Shot (Long rifle), critical | 244 | 244 | 3 AP, 1 rounds, 1 turn | 4 | 193 |
| Optimised blade | normal share | 1 | plain cut (Adamantile greatsword), critical | 98 | 98 | 3 AP, +1 Momentum, 1 turn | 3 | 61.1 |
| Optimised blade | normal share | 3 | plain cut (Adamantile greatsword), critical | 107 | 107 | 3 AP, +1 Momentum, 1 turn | 3 | 75.7 |
| Optimised blade | normal share | 6 | plain cut (Adamantile greatsword), critical | 123 | 123 | 3 AP, +1 Momentum, 1 turn | 5 | 79.4 |
| Optimised blade | normal share | 9 | Coup (Adamantile greatsword) | 155 | 155 | 3 AP, 3 Momentum, 1 turn | 7 | 96.8 |
| Optimised blade | normal share | 12 | plain cut (Adamantile greatsword), critical | 146 | 146 | 3 AP, +1 Momentum, 1 turn | 3 | 74.3 |
| Optimised blade | normal share | 20 | Coup (Adamantile greatsword) | 178 | 178 | 3 AP, 3 Momentum, 1 turn | 6 | 108.3 |
| Optimised blade | all in | 1 | plain cut (Adamantile greatsword) | 80 | 80 | 3 AP, +1 Momentum, 1 turn | 3 | 81.3 |
| Optimised blade | all in | 3 | plain cut (Adamantile greatsword), critical | 137 | 137 | 3 AP, +1 Momentum, 1 turn | 6 | 103.2 |
| Optimised blade | all in | 6 | plain cut (Adamantile greatsword), critical | 146 | 146 | 3 AP, +1 Momentum, 1 turn | 8 | 93.8 |
| Optimised blade | all in | 9 | Coup (Adamantile greatsword) | 180 | 180 | 3 AP, 3 Momentum, 1 turn | 6 | 103.1 |
| Optimised blade | all in | 12 | Coup (Adamantile greatsword) | 178 | 178 | 3 AP, 3 Momentum, 1 turn | 6 | 97.2 |
| Optimised blade | all in | 20 | Coup (Adamantile greatsword), critical | 280 | 280 | 3 AP, 3 Momentum, 1 turn | 7 | 119.6 |
| Tank | normal share | 1 | plain cut (Sabre), critical | 54 | 54 | 2 AP, +1 Momentum, 1 turn | 8 | 22.3 |
| Tank | normal share | 3 | plain cut (Sabre), critical | 61 | 61 | 2 AP, +1 Momentum, 1 turn | 7 | 32.5 |
| Tank | normal share | 6 | plain cut (Sabre), critical | 62 | 62 | 2 AP, +1 Momentum, 1 turn | 6 | 34.2 |
| Tank | normal share | 9 | plain cut (Sabre), critical | 61 | 61 | 2 AP, +1 Momentum, 1 turn | 4 | 22.7 |
| Tank | normal share | 12 | plain cut (Sabre), critical | 68 | 68 | 2 AP, +1 Momentum, 1 turn | 7 | 28.1 |
| Tank | normal share | 20 | plain cut (Sabre), critical | 86 | 86 | 2 AP, +1 Momentum, 1 turn | 4 | 42.4 |
| Tank | all in | 1 | plain cut (Sabre), critical | 41 | 41 | 2 AP, +1 Momentum, 1 turn | 6 | 15.1 |
| Tank | all in | 3 | plain cut (Sabre), critical | 40 | 40 | 2 AP, +1 Momentum, 1 turn | 8 | 12.2 |
| Tank | all in | 6 | plain cut (Sabre), critical | 38 | 38 | 2 AP, +1 Momentum, 1 turn | 8 | 7.7 |
| Tank | all in | 9 | plain cut (Sabre), critical | 44 | 44 | 2 AP, +1 Momentum, 1 turn | 5 | 14.6 |
| Tank | all in | 12 | plain cut (Sabre), critical | 58 | 58 | 2 AP, +1 Momentum, 1 turn | 5 | 25.4 |
| Tank | all in | 20 | plain cut (Sabre), critical | 93 | 93 | 2 AP, +1 Momentum, 1 turn | 5 | 54.6 |
| Sigil caster | normal share | 1 | Evoke FIRE·SEEK, critical | 118 | 118 | 2.4 AP, +2 Flux, 5 core charge, 1 turn | 2 | 38.6 |
| Sigil caster | normal share | 3 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 287 | 287 | 7.8 AP, 2 Flux, +2 core charge, 1 cores, 2 turns | 3 | 57.7 |
| Sigil caster | normal share | 6 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 331 | 331 | 4.8 AP, +4 Flux, 7 core charge, 1 turn | 1 | 50.1 |
| Sigil caster | normal share | 9 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 377 | 377 | 5.8 AP, +4 Flux, +2 core charge, 1 cores, 2 turns | 4 | 56.6 |
| Sigil caster | normal share | 12 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 419 | 419 | 4.8 AP, 6 core charge, +3 Flux, 1 turn | 8 | 105.1 |
| Sigil caster | normal share | 20 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 448 | 448 | 6 AP, 3 Flux, +4 core charge, 1 cores, 2 turns | 8 | 100.2 |
| Sigil caster | all in | 1 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 340 | 340 | 6.2 AP, +4 Flux, 9 core charge, 2 turns | 2 | 56.6 |
| Sigil caster | all in | 3 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 369 | 369 | 6.2 AP, +4 Flux, 7 core charge, 2 turns | 2 | 70.4 |
| Sigil caster | all in | 6 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 396 | 396 | 8.2 AP, 3 Flux, +3 core charge, 1 cores, 3 turns | 4 | 81.9 |
| Sigil caster | all in | 9 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 428 | 428 | 5.8 AP, +4 Flux, 6 core charge, 2 turns | 5 | 78.2 |
| Sigil caster | all in | 12 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 434 | 434 | 6 AP, 3 Flux, +3 core charge, 1 cores, 2 turns | 3 | 84.3 |
| Sigil caster | all in | 20 | Evoke STONE·FIRE·CONDENSE·SEEK | 222 | 222 | 6 AP, +4 Flux, 6 core charge, 2 turns | 4 | 90.8 |
| Outburst caster | normal share | 1 | Release Heart Bolt (stage 4), critical | 154 | 154 | 5 AP, 21 MP, +4 Strain, 2 turns | 2 | 37.8 |
| Outburst caster | normal share | 3 | Release Heart Bolt (stage 4), critical | 204 | 204 | 6 AP, 32 MP, +1 Strain, 1 turn | 4 | 61.3 |
| Outburst caster | normal share | 6 | Release Heart Bolt (stage 4) | 150 | 150 | 4 AP, 21 MP, +1 Strain, 2 turns | 2 | 64.2 |
| Outburst caster | normal share | 9 | Release Heart Bolt (stage 4) | 218 | 218 | 5 AP, 32 MP, +1 Strain, 1 turn | 3 | 61.8 |
| Outburst caster | normal share | 12 | Release Heart Bolt (stage 4), critical | 454 | 454 | 5 AP, 32 MP, +1 Strain, 1 turn | 4 | 118.3 |
| Outburst caster | normal share | 20 | Release Heart Bolt (stage 4), critical | 399 | 399 | 3 AP, 19 MP, +1 Strain, 1 turn | 2 | 137 |
| Outburst caster | all in | 1 | Release Heart Bolt (stage 3), critical | 184 | 184 | 6 AP, 23 MP, +4 Strain, 1 turn | 2 | 90.2 |
| Outburst caster | all in | 3 | Release Heart Bolt (stage 4) | 175 | 175 | 3 AP, 23 MP, +1 Strain, 2 turns | 2 | 104.1 |
| Outburst caster | all in | 6 | Release Heart Bolt (stage 4) | 251 | 251 | 6 AP, 34 MP, +1 Strain, 1 turn | 3 | 97.6 |
| Outburst caster | all in | 9 | Release Heart Bolt (stage 4), critical | 399 | 399 | 4 AP, 32 MP, +1 Strain, 1 turn | 2 | 161.9 |
| Outburst caster | all in | 12 | Release Heart Bolt (stage 3), critical | 235 | 235 | 3 AP, 19 MP, +3 Strain, 1 turn | 2 | 131.8 |
| Outburst caster | all in | 20 | Release Heart Bolt (stage 4) | 267 | 267 | 4 AP, 21 MP, +1 Strain, 1 turn | 3 | 83.2 |
| Faith build | normal share | 1 | plain shot (Hellraiser service rifle), critical | 57 | 57 | 2 AP, +1 Heat, 1 rounds, 1 turn | 2 | 43.5 |
| Faith build | normal share | 3 | plain shot (Hellraiser service rifle), critical | 59 | 59 | 2 AP, +1 Heat, 1 rounds, 1 turn | 1 | 44.3 |
| Faith build | normal share | 6 | Hymn: Lightning Rod | 74 | 74 | 3 AP, 1 turn | 1 | 90.1 |
| Faith build | normal share | 9 | Hymn: Lightning Rod | 83 | 83 | 3 AP, 1 turn | 1 | 91.8 |
| Faith build | normal share | 12 | Hymn: Lightning Rod | 87 | 87 | 3 AP, 1 turn | 1 | 106.9 |
| Faith build | normal share | 20 | Miracle: The Sky Answers | 292 | 292 | 3 AP, 1 turn | 1 | 151.3 |
| Faith build | all in | 1 | plain shot (Hellraiser service rifle), critical | 45 | 45 | 2 AP, +1 Heat, 1 rounds, 1 turn | 1 | 13.1 |
| Faith build | all in | 3 | plain shot (Hellraiser service rifle), critical | 44 | 44 | 2 AP, +1 Heat, 1 rounds, 1 turn | 3 | 13.8 |
| Faith build | all in | 6 | Hymn: Lightning Rod | 89 | 89 | 3 AP, 1 turn | 1 | 96.1 |
| Faith build | all in | 9 | Hymn: Lightning Rod | 93 | 93 | 3 AP, 1 turn | 1 | 97.1 |
| Faith build | all in | 12 | Hymn: Lightning Rod | 92 | 92 | 3 AP, 1 turn | 1 | 97 |
| Faith build | all in | 20 | Miracle: The Sky Answers | 292 | 292 | 3 AP, 1 turn | 1 | 188.2 |

How often the dearest move was really made in these fights: the optimised gun used Dead Centre 0 times in 120 fights (it needs a Pressed target; one shooter with no Suppress ready gives 1 Pressure a turn, and Pressed is 2, so alone it fires Aimed Shots: its peak is on the card in 3.4, and in a squad). The optimised blade used a Finisher 11 times in 120 fights; the Faith build called its Miracle 20 times in 120.

### 3.4 The weapon builds' dearest technique on its card, with its price fully met

The engine's own card for each technique, against a boss (Defense 14, armour 10), staged so the price is met: Momentum full, the target Pressed as far as Pressure goes, 6 AP. This is what the move does when everything it asks for is there; the fights above show how often that happens. Each cell: the technique · chance to hit · damage on a hit · on a critical · its price.

| Build | Share | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|
| Optimised gun | normal share | Dead Centre · 75% · 113 · 196 · 3 AP, 1 round, a Pressed target | Dead Centre · 75% · 125 · 219 · 3 AP, 1 round, a Pressed target | Dead Centre · 75% · 143 · 255 · 3 AP, 1 round, a Pressed target | Dead Centre · 75% · 159 · 289 · 3 AP, 1 round, a Pressed target | Dead Centre · 75% · 177 · 327 · 3 AP, 1 round, a Pressed target | Dead Centre · 75% · 182 · 356 · 3 AP, 1 round, a Pressed target |
| Optimised gun | all in | Dead Centre · 90% · 150 · 263 · 3 AP, 1 round, a Pressed target | Dead Centre · 90% · 162 · 286 · 3 AP, 1 round, a Pressed target | Dead Centre · 90% · 172 · 309 · 3 AP, 1 round, a Pressed target | Dead Centre · 85% · 184 · 340 · 3 AP, 1 round, a Pressed target | Dead Centre · 80% · 182 · 350 · 3 AP, 1 round, a Pressed target | Dead Centre · 75% · 182 · 374 · 3 AP, 1 round, a Pressed target |
| Optimised blade | normal share | Cut · 65% · 59 · 98 · 3 AP | Cut · 65% · 65 · 107 · 3 AP | Cut · 65% · 74 · 123 · 3 AP | Coup · 65% · 204 · 326 · 3 AP, 5 Momentum (of 5) | Coup · 65% · 217 · 348 · 3 AP, 5 Momentum (of 5) | Coup · 65% · 233 · 373 · 3 AP, 5 Momentum (of 5) |
| Optimised blade | all in | Cut · 80% · 80 · 127 · 3 AP | Cut · 80% · 86 · 137 · 3 AP | Cut · 80% · 90 · 146 · 3 AP | Coup · 75% · 235 · 367 · 3 AP, 5 Momentum (of 5) | Coup · 70% · 233 · 365 · 3 AP, 5 Momentum (of 5) | Coup · 65% · 233 · 365 · 3 AP, 5 Momentum (of 5) |
| Tank | normal share | Cut · 55% · 30 · 54 · 2 AP | Cut · 55% · 33 · 61 · 2 AP | Cut · 55% · 33 · 62 · 2 AP | Cut · 45% · 32 · 61 · 2 AP | Cut · 45% · 34 · 68 · 2 AP | Cut · 50% · 44 · 86 · 2 AP |
| Tank | all in | Cut · 40% · 23 · 41 · 2 AP | Cut · 35% · 22 · 40 · 2 AP | Cut · 30% · 20 · 38 · 2 AP | Cut · 35% · 22 · 44 · 2 AP | Cut · 40% · 30 · 58 · 2 AP | Cut · 55% · 48 · 93 · 2 AP |
| Plain gun | normal share | Burst (3 rolls) · 55% · 105 · 189 · 3 AP, 3 rounds | Burst (3 rolls) · 55% · 114 · 213 · 2 AP, 3 rounds | Burst (3 rolls) · 55% · 132 · 246 · 2 AP, 3 rounds | Burst (3 rolls) · 55% · 147 · 282 · 2 AP, 3 rounds | Burst (3 rolls) · 55% · 162 · 318 · 2 AP, 3 rounds | Burst (3 rolls) · 55% · 168 · 345 · 2 AP, 3 rounds |
| Plain gun | all in | Burst (3 rolls) · 70% · 144 · 261 · 3 AP, 3 rounds | Burst (3 rolls) · 70% · 156 · 285 · 2 AP, 3 rounds | Burst (3 rolls) · 70% · 162 · 306 · 2 AP, 3 rounds | Burst (3 rolls) · 65% · 174 · 330 · 2 AP, 3 rounds | Burst (3 rolls) · 60% · 168 · 324 · 2 AP, 3 rounds | Burst (3 rolls) · 55% · 168 · 324 · 2 AP, 3 rounds |
| Plain blade | normal share | Cut · 55% · 32 · 58 · 2 AP | Cut · 55% · 35 · 65 · 2 AP | Cut · 55% · 40 · 76 · 2 AP | Cut · 55% · 44 · 87 · 2 AP | Cut · 55% · 49 · 98 · 2 AP | Cut · 55% · 51 · 102 · 2 AP |
| Plain blade | all in | Cut · 70% · 44 · 81 · 2 AP | Cut · 70% · 47 · 88 · 2 AP | Cut · 70% · 50 · 94 · 2 AP | Cut · 65% · 53 · 102 · 2 AP | Cut · 60% · 51 · 100 · 2 AP | Cut · 55% · 51 · 100 · 2 AP |

## 4. Angle C: time to kill, both ways

### 4.1 Rounds to win, one character against one enemy (open ground, normal share)

Each cell: rounds to win · percent of fights won. A fight stops at 12 rounds.

**Minion**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 1.3 · 100% | 1.3 · 100% | 1.2 · 100% | 1.3 · 100% | 1.3 · 100% | 1.5 · 100% |
| Plain blade | 2.2 · 100% | 2.2 · 100% | 2.2 · 100% | 2.1 · 100% | 1.4 · 100% | 1.3 · 100% |
| Optimised gun | 1.1 · 100% | 1.1 · 100% | 1.1 · 100% | 1.1 · 100% | 1.1 · 100% | 1.1 · 100% |
| Optimised blade | 2.6 · 100% | 2.1 · 100% | 2.6 · 100% | 2.2 · 100% | 2.3 · 100% | 2.2 · 100% |
| Tank | 3.7 · 100% | 3.3 · 100% | 3.7 · 100% | 4.2 · 100% | 3.6 · 100% | 3.3 · 100% |
| Sigil caster | 2.5 · 95% | 2.9 · 90% | 1.5 · 95% | 1.9 · 100% | 1.9 · 100% | 1.5 · 100% |
| Outburst caster | 2.3 · 100% | 2.2 · 100% | 2.2 · 100% | 2 · 100% | 1.6 · 100% | 1.5 · 100% |
| Faith build | 1.5 · 100% | 1.3 · 100% | 1.3 · 100% | 1.5 · 100% | 1.4 · 100% | 1.4 · 100% |
| Calls leader | 3.7 · 100% | 4.6 · 100% | 4.2 · 100% | 4.7 · 100% | 4.2 · 85% | 6.1 · 85% |

**Soldier**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 2.6 · 100% | 2.2 · 100% | 2.5 · 100% | 2.9 · 100% | 2.6 · 100% | 2.6 · 100% |
| Plain blade | 3.6 · 100% | 3.3 · 100% | 3.6 · 100% | 3.7 · 100% | 3.2 · 100% | 3.1 · 100% |
| Optimised gun | 1.3 · 100% | 1.4 · 100% | 1.3 · 100% | 1.4 · 100% | 1.8 · 100% | 1.9 · 100% |
| Optimised blade | 3.1 · 100% | 3.5 · 100% | 3.4 · 100% | 3.4 · 100% | 3.1 · 100% | 3.1 · 100% |
| Tank | 5.2 · 100% | 5.6 · 100% | 5.8 · 100% | 6.5 · 100% | 6.5 · 100% | 5.5 · 100% |
| Sigil caster | 2.7 · 60% | 3.5 · 60% | 3.1 · 100% | 3.8 · 95% | 3.8 · 95% | 4.1 · 95% |
| Outburst caster | 3.5 · 55% | 3.3 · 65% | 2.5 · 75% | 2.6 · 80% | 2.5 · 80% | 2.5 · 65% |
| Faith build | 3.4 · 90% | 4.1 · 95% | 2.8 · 100% | 2.8 · 100% | 2.7 · 100% | 2.7 · 100% |
| Calls leader | 6.5 · 10% | 6 · 5% | – · 0% | – · 0% | – · 0% | – · 0% |

**Elite**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 4.4 · 100% | 4.5 · 95% | 4.7 · 100% | 4.8 · 80% | 4.6 · 90% | 4.4 · 95% |
| Plain blade | 5.6 · 100% | 5.5 · 100% | 5.6 · 95% | 5.5 · 100% | 5.6 · 100% | 5.6 · 95% |
| Optimised gun | 2.4 · 100% | 2.3 · 100% | 2.6 · 100% | 2.6 · 100% | 2.4 · 100% | 2.3 · 100% |
| Optimised blade | 4.3 · 95% | 5.2 · 100% | 4.2 · 100% | 4.6 · 100% | 4.6 · 95% | 4.7 · 100% |
| Tank | 8.3 · 70% | 8.8 · 90% | 9.1 · 90% | 11 · 45% | 11.7 · 30% | 9 · 95% |
| Sigil caster | 5 · 15% | 4 · 15% | 5.8 · 85% | 6.4 · 90% | 6.2 · 85% | 5.4 · 100% |
| Outburst caster | 4 · 10% | 5.5 · 20% | 4.3 · 30% | 4.2 · 50% | 3.6 · 95% | 3.5 · 75% |
| Faith build | 5.9 · 55% | 5.3 · 60% | 4.1 · 100% | 4.2 · 95% | 4.7 · 100% | 4.1 · 100% |
| Calls leader | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% |

**Boss**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% |
| Plain blade | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% |
| Optimised gun | 7 · 15% | 8 · 15% | 8.5 · 20% | – · 0% | 10 · 5% | 9 · 5% |
| Optimised blade | – · 0% | 11 · 5% | – · 0% | – · 0% | – · 0% | – · 0% |
| Tank | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% |
| Sigil caster | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | 7 · 5% |
| Outburst caster | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% |
| Faith build | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% |
| Calls leader | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% | – · 0% |

### 4.2 Attacks that land to kill one enemy (the engine's own numbers for a plain attack at 4 tiles)

Target: minion 2, soldier 3 to 4, elite 6 to 8, boss about 20.

| Build | Share | Level | Minion: damage a hit · hits to kill | Soldier: damage a hit · hits to kill | Elite: damage a hit · hits to kill | Boss: damage a hit · hits to kill |
|---|---|---|---|---|---|---|
| Plain gun | normal share | 1 | 45 · 2 | 40 · 4 | 35 · 7 | 35 · 28 |
| Plain gun | normal share | 3 | 49 · 2 | 44 · 4 | 38 · 8 | 38 · 30 |
| Plain gun | normal share | 6 | 57 · 2 | 51 · 4 | 44 · 8 | 44 · 31 |
| Plain gun | normal share | 9 | 63 · 2 | 56 · 4 | 49 · 8 | 49 · 31 |
| Plain gun | normal share | 12 | 70 · 2 | 62 · 4 | 54 · 8 | 54 · 31 |
| Plain gun | normal share | 20 | 72 · 2 | 64 · 4 | 56 · 8 | 56 · 32 |
| Plain gun | all in | 1 | 58 · 2 | 53 · 3 | 48 · 5 | 48 · 20 |
| Plain gun | all in | 3 | 63 · 2 | 58 · 3 | 52 · 6 | 52 · 22 |
| Plain gun | all in | 6 | 67 · 2 | 61 · 4 | 54 · 7 | 54 · 25 |
| Plain gun | all in | 9 | 72 · 2 | 65 · 4 | 58 · 7 | 58 · 26 |
| Plain gun | all in | 12 | 72 · 2 | 64 · 4 | 56 · 8 | 56 · 30 |
| Plain gun | all in | 20 | 72 · 2 | 64 · 4 | 56 · 8 | 56 · 32 |
| Plain blade | normal share | 1 | 42 · 2 | 37 · 4 | 32 · 8 | 32 · 30 |
| Plain blade | normal share | 3 | 46 · 2 | 41 · 4 | 35 · 8 | 35 · 32 |
| Plain blade | normal share | 6 | 53 · 2 | 47 · 5 | 40 · 9 | 40 · 34 |
| Plain blade | normal share | 9 | 58 · 2 | 51 · 5 | 44 · 9 | 44 · 34 |
| Plain blade | normal share | 12 | 65 · 2 | 57 · 5 | 49 · 9 | 49 · 35 |
| Plain blade | normal share | 20 | 67 · 2 | 59 · 5 | 51 · 9 | 51 · 35 |
| Plain blade | all in | 1 | 54 · 2 | 49 · 3 | 44 · 6 | 44 · 22 |
| Plain blade | all in | 3 | 58 · 2 | 53 · 4 | 47 · 6 | 47 · 24 |
| Plain blade | all in | 6 | 63 · 2 | 57 · 4 | 50 · 7 | 50 · 27 |
| Plain blade | all in | 9 | 67 · 2 | 60 · 4 | 53 · 7 | 53 · 28 |
| Plain blade | all in | 12 | 67 · 2 | 59 · 5 | 51 · 9 | 51 · 33 |
| Plain blade | all in | 20 | 67 · 2 | 59 · 5 | 51 · 9 | 51 · 35 |
| Optimised gun | normal share | 1 | 82 · 1 | 77 · 2 | 72 · 4 | 72 · 14 |
| Optimised gun | normal share | 3 | 90 · 1 | 85 · 2 | 79 · 4 | 79 · 15 |
| Optimised gun | normal share | 6 | 104 · 1 | 98 · 2 | 91 · 4 | 91 · 15 |
| Optimised gun | normal share | 9 | 115 · 1 | 108 · 2 | 101 · 4 | 101 · 15 |
| Optimised gun | normal share | 12 | 129 · 1 | 121 · 3 | 113 · 4 | 113 · 15 |
| Optimised gun | normal share | 20 | 132 · 1 | 124 · 3 | 116 · 4 | 116 · 15 |
| Optimised gun | all in | 1 | 107 · 1 | 102 · 2 | 97 · 3 | 97 · 10 |
| Optimised gun | all in | 3 | 115 · 1 | 110 · 2 | 104 · 3 | 104 · 11 |
| Optimised gun | all in | 6 | 123 · 1 | 117 · 2 | 110 · 4 | 110 · 13 |
| Optimised gun | all in | 9 | 132 · 1 | 125 · 2 | 118 · 4 | 118 · 13 |
| Optimised gun | all in | 12 | 132 · 1 | 124 · 2 | 116 · 4 | 116 · 15 |
| Optimised gun | all in | 20 | 132 · 1 | 124 · 3 | 116 · 4 | 116 · 15 |
| Optimised blade | normal share | 1 | 69 · 2 | 64 · 3 | 59 · 5 | 59 · 17 |
| Optimised blade | normal share | 3 | 76 · 2 | 71 · 3 | 65 · 5 | 65 · 18 |
| Optimised blade | normal share | 6 | 87 · 2 | 81 · 3 | 74 · 5 | 74 · 18 |
| Optimised blade | normal share | 9 | 97 · 2 | 90 · 3 | 83 · 5 | 83 · 18 |
| Optimised blade | normal share | 12 | 103 · 2 | 95 · 3 | 87 · 5 | 87 · 20 |
| Optimised blade | normal share | 20 | 110 · 2 | 102 · 3 | 94 · 5 | 94 · 19 |
| Optimised blade | all in | 1 | 90 · 1 | 85 · 2 | 80 · 3 | 80 · 12 |
| Optimised blade | all in | 3 | 97 · 1 | 92 · 2 | 86 · 4 | 86 · 13 |
| Optimised blade | all in | 6 | 103 · 1 | 97 · 2 | 90 · 4 | 90 · 15 |
| Optimised blade | all in | 9 | 110 · 1 | 103 · 3 | 96 · 4 | 96 · 16 |
| Optimised blade | all in | 12 | 110 · 2 | 102 · 3 | 94 · 5 | 94 · 18 |
| Optimised blade | all in | 20 | 110 · 2 | 102 · 3 | 94 · 5 | 94 · 19 |

### 4.3 Damage taken, and how long a character lasts against one enemy (normal share)

Each cell: damage taken per enemy turn · enemy turns to take the character from full HP to 0. Target: 3 turns of focus (a tank longer).

**Minion**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 4.9 · 29.6 | 5 · 32.6 | 10.3 · 18.5 | 10.3 · 22.5 | 19.5 · 14.8 | 18.4 · 24.2 |
| Plain blade | 7.2 · 20.2 | 10.4 · 15.7 | 11.6 · 16.4 | 17.2 · 13.6 | 20.7 · 13.9 | 29.9 · 16.7 |
| Optimised gun | 6.9 · 18.8 | 7.9 · 18.2 | 12.4 · 14.1 | 7.4 · 27.2 | 9 · 25.4 | 22.3 · 17.6 |
| Optimised blade | 8.2 · 17.8 | 9.9 · 16 | 11.1 · 17.1 | 13.3 · 17.6 | 19.1 · 13.9 | 35 · 12.7 |
| Tank | 5 · 28.9 | 1.5 · 111.3 | 1.5 · 162.4 | 3.5 · 88.7 | 4.9 · 80.3 | 14.5 · 46.5 |
| Sigil caster | 19 · 6.8 | 23.7 · 6.1 | 24.5 · 7.1 | 27.2 · 7.4 | 19.5 · 12.9 | 53.2 · 7.4 |
| Outburst caster | 18.3 · 7.1 | 19.7 · 7.3 | 19 · 9.2 | 30.4 · 6.6 | 26.8 · 9.4 | 46.2 · 7.3 |
| Faith build | 7.9 · 16.4 | 9.5 · 15.2 | 9.9 · 17.8 | 17.1 · 11.8 | 17.1 · 14.7 | 30.4 · 11.2 |
| Calls leader | 11.7 · 11.1 | 15 · 10.3 | 15.5 · 11 | 17.9 · 10.3 | 25.5 · 7.8 | 47.5 · 8.3 |

**Soldier**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 18.7 · 7.7 | 17.6 · 9.3 | 23.6 · 8.1 | 26.8 · 8.7 | 35.4 · 8.1 | 42.5 · 10.5 |
| Plain blade | 10.1 · 14.3 | 12.4 · 13.1 | 16.1 · 11.8 | 15.2 · 15.4 | 26 · 11.1 | 34.8 · 14.3 |
| Optimised gun | 18.1 · 7.2 | 17.1 · 8.4 | 27.3 · 6.4 | 22.6 · 9 | 19.7 · 11.6 | 48.1 · 8.1 |
| Optimised blade | 11.4 · 12.8 | 16.1 · 9.9 | 14.5 · 13.1 | 15.7 · 14.8 | 20.4 · 13 | 36.8 · 12.1 |
| Tank | 5.1 · 28.7 | 2.2 · 77.3 | 3.7 · 65.2 | 4.9 · 63.4 | 8.4 · 46.7 | 13.9 · 48.3 |
| Sigil caster | 35 · 3.7 | 33.5 · 4.3 | 14.3 · 12.3 | 22.4 · 9 | 20 · 12.6 | 29.4 · 13.3 |
| Outburst caster | 30.6 · 4.2 | 36.3 · 4 | 48.7 · 3.6 | 53.6 · 3.8 | 65.4 · 3.8 | 105.8 · 3.2 |
| Faith build | 19.7 · 6.6 | 20.9 · 6.9 | 27 · 6.5 | 26.3 · 7.7 | 28.9 · 8.7 | 65.7 · 5.2 |
| Calls leader | 25 · 5.2 | 31.5 · 4.9 | 36.7 · 4.6 | 43.9 · 4.2 | 59 · 3.4 | 103.1 · 3.8 |

**Elite**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 17 · 8.5 | 21.1 · 7.7 | 19.5 · 9.7 | 32.3 · 7.2 | 33.4 · 8.6 | 45.2 · 9.8 |
| Plain blade | 14.2 · 10.2 | 17 · 9.6 | 19.8 · 9.6 | 24.7 · 9.4 | 26.9 · 10.7 | 44.6 · 11.2 |
| Optimised gun | 16.7 · 7.8 | 19 · 7.6 | 25.3 · 6.9 | 19.8 · 10.2 | 25.1 · 9.1 | 35.6 · 11 |
| Optimised blade | 19.7 · 7.4 | 16 · 9.9 | 22.2 · 8.6 | 23.7 · 9.8 | 27.7 · 9.6 | 49.8 · 8.9 |
| Tank | 10.3 · 14.1 | 6.4 · 25.9 | 8.8 · 27.2 | 13.2 · 23.6 | 14.3 · 27.3 | 29.2 · 23 |
| Sigil caster | 35.2 · 3.7 | 29.7 · 4.8 | 16.6 · 10.6 | 16.6 · 12.2 | 23.6 · 10.6 | 25.2 · 15.6 |
| Outburst caster | 32.5 · 4 | 33.2 · 4.3 | 36.1 · 4.9 | 38.8 · 5.2 | 44.6 · 5.6 | 70.9 · 4.8 |
| Faith build | 19.1 · 6.8 | 21 · 6.8 | 24.5 · 7.1 | 24.3 · 8.3 | 33.5 · 7.5 | 46.8 · 7.2 |
| Calls leader | 23.8 · 5.5 | 27.4 · 5.7 | 30.8 · 5.5 | 29.8 · 6.2 | 46.1 · 4.3 | 70.6 · 5.6 |

**Boss**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 22.5 · 6.5 | 28.6 · 5.7 | 27.4 · 6.9 | 34.4 · 6.8 | 41.8 · 6.9 | 62.7 · 7.1 |
| Plain blade | 19.6 · 7.4 | 23.8 · 6.8 | 21.5 · 8.8 | 27.6 · 8.5 | 33.5 · 8.6 | 55.8 · 8.9 |
| Optimised gun | 26 · 5 | 27.1 · 5.3 | 27.5 · 6.4 | 32.1 · 6.3 | 38.1 · 6 | 60.2 · 6.5 |
| Optimised blade | 18.8 · 7.7 | 20.6 · 7.7 | 23.6 · 8 | 25.6 · 9.1 | 30.4 · 8.8 | 58.5 · 7.6 |
| Tank | 13.5 · 10.7 | 11.2 · 15 | 14.1 · 17.1 | 17.1 · 18.2 | 21.7 · 18.1 | 42.5 · 15.8 |
| Sigil caster | 40.2 · 3.2 | 46.9 · 3.1 | 20.6 · 8.5 | 22.9 · 8.8 | 32.2 · 7.8 | 48.3 · 8.1 |
| Outburst caster | 38.6 · 3.4 | 35.2 · 4.1 | 48.1 · 3.6 | 54.4 · 3.7 | 60.5 · 4.1 | 95.3 · 3.6 |
| Faith build | 26.3 · 4.9 | 28.5 · 5 | 30.2 · 5.8 | 37.8 · 5.3 | 41.7 · 6 | 75.6 · 4.5 |
| Calls leader | 35.9 · 3.6 | 37.1 · 4.2 | 51.1 · 3.3 | 55.2 · 3.3 | 61.4 · 3.3 | 94.1 · 4.2 |

### 4.4 Focus: every enemy on one character (normal share)

Each cell: percent of fights in which the character went down · the round it went down, on average · percent won.

**4 minions**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Plain blade | 10% · 7 · 90% | 20% · 5 · 80% | 20% · 4.5 · 80% | 30% · 4.7 · 70% | 0% · – · 100% | 30% · 4.3 · 70% |
| Optimised gun | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Optimised blade | 50% · 5.2 · 50% | 30% · 5.7 · 70% | 60% · 5.2 · 40% | 10% · 4 · 90% | 60% · 4.7 · 40% | 50% · 4.4 · 50% |
| Tank | 40% · 7.5 · 60% | 0% · – · 100% | 0% · – · 100% | 0% · – · 60% | 0% · – · 90% | 0% · – · 100% |
| Sigil caster | 100% · 1.8 · 0% | 100% · 2.4 · 0% | 100% · 3 · 0% | 100% · 3.1 · 0% | 80% · 3.8 · 20% | 100% · 2.9 · 0% |
| Outburst caster | 100% · 2.4 · 0% | 90% · 2.6 · 10% | 100% · 2.8 · 0% | 90% · 3.2 · 10% | 90% · 2.7 · 10% | 100% · 2.4 · 0% |
| Faith build | 10% · 6 · 90% | 40% · 6.5 · 50% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 20% · 3 · 80% |
| Calls leader | 100% · 3.1 · 0% | 100% · 3.5 · 0% | 100% · 3.4 · 0% | 100% · 2.7 · 0% | 100% · 2.3 · 0% | 100% · 2.4 · 0% |

**4 soldiers**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 100% · 2 · 0% | 100% · 2.4 · 0% | 100% · 2.2 · 0% | 100% · 2.1 · 0% | 100% · 2.4 · 0% | 100% · 2.1 · 0% |
| Plain blade | 100% · 2.4 · 0% | 100% · 2.5 · 0% | 100% · 2.3 · 0% | 100% · 2.2 · 0% | 100% · 2.3 · 0% | 100% · 2.3 · 0% |
| Optimised gun | 90% · 2.1 · 10% | 90% · 2.6 · 10% | 100% · 2.1 · 0% | 80% · 2.5 · 20% | 100% · 2.2 · 0% | 100% · 2 · 0% |
| Optimised blade | 100% · 2.3 · 0% | 100% · 2.3 · 0% | 100% · 2.3 · 0% | 100% · 2.3 · 0% | 100% · 2.5 · 0% | 100% · 2 · 0% |
| Tank | 100% · 2.6 · 0% | 90% · 6.8 · 0% | 100% · 6.4 · 0% | 100% · 5.1 · 0% | 100% · 4.2 · 0% | 100% · 4.4 · 0% |
| Sigil caster | 100% · 1 · 0% | 100% · 1.1 · 0% | 100% · 2.2 · 0% | 100% · 2.3 · 0% | 100% · 3 · 0% | 100% · 3.1 · 0% |
| Outburst caster | 100% · 1.2 · 0% | 100% · 1.1 · 0% | 100% · 1 · 0% | 100% · 1.1 · 0% | 100% · 1.4 · 0% | 100% · 1 · 0% |
| Faith build | 100% · 2.3 · 0% | 100% · 2 · 0% | 100% · 2 · 0% | 100% · 1.4 · 0% | 100% · 1.8 · 0% | 100% · 1.5 · 0% |
| Calls leader | 100% · 1.2 · 0% | 100% · 1.4 · 0% | 100% · 1.3 · 0% | 100% · 1.2 · 0% | 100% · 1.1 · 0% | 100% · 1 · 0% |

**2 elites**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 90% · 4.8 · 10% | 100% · 5.3 · 0% | 90% · 5.1 · 10% | 90% · 5.9 · 10% | 80% · 4.9 · 20% | 70% · 6 · 30% |
| Plain blade | 100% · 4.5 · 0% | 90% · 4.8 · 10% | 90% · 5.4 · 10% | 90% · 5.9 · 10% | 90% · 7.2 · 10% | 80% · 6 · 20% |
| Optimised gun | 40% · 4 · 60% | 70% · 4.1 · 30% | 20% · 2.5 · 80% | 20% · 4 · 80% | 30% · 4.7 · 70% | 10% · 5 · 90% |
| Optimised blade | 90% · 5 · 10% | 80% · 5.9 · 20% | 90% · 5.1 · 10% | 90% · 6.3 · 10% | 100% · 5.3 · 0% | 90% · 5.3 · 10% |
| Tank | 100% · 5.3 · 0% | 80% · 7.6 · 0% | 90% · 9.8 · 0% | 90% · 9.4 · 0% | 70% · 9.7 · 0% | 60% · 9.8 · 0% |
| Sigil caster | 100% · 2.4 · 0% | 100% · 2.7 · 0% | 90% · 6.1 · 10% | 80% · 6.8 · 20% | 90% · 6.6 · 10% | 80% · 7.4 · 20% |
| Outburst caster | 100% · 2.5 · 0% | 100% · 2.2 · 0% | 100% · 2.7 · 0% | 100% · 2.4 · 0% | 100% · 3.3 · 0% | 100% · 2.3 · 0% |
| Faith build | 100% · 4.6 · 0% | 100% · 4.6 · 0% | 90% · 3.7 · 10% | 90% · 3.9 · 10% | 90% · 4.6 · 10% | 100% · 3.9 · 0% |
| Calls leader | 100% · 2.9 · 0% | 100% · 3.5 · 0% | 100% · 2.8 · 0% | 100% · 3 · 0% | 100% · 3 · 0% | 100% · 3 · 0% |

## 5. Angle B: the AP economy

From the sandbag under fire (soldier numbers, 8 rounds or until the character goes down), normal share. AP a turn is what the turn started with; the shares are of all AP the character had.

| Build | Level | AP a turn | Above 6, a turn | Turns at 9 | Attacks | Techniques | Spells and prayers | Calls | Moving | Reload and jams | Set-up | Unspent | Damage per AP spent | Damage per AP on attacks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Plain gun | 1 | 6 | 0 | 0% | 93% | 0% | 0% | 0% | 0% | 7% | 0% | 0% | 10.4 | 11.2 |
| Plain gun | 9 | 5.9 | 0 | 0% | 94% | 0% | 0% | 0% | 0% | 6% | 0% | 0% | 16.9 | 18 |
| Plain gun | 20 | 5.9 | 0 | 0% | 91% | 0% | 0% | 0% | 0% | 9% | 0% | 0% | 18.8 | 20.5 |
| Plain blade | 1 | 5.9 | 0 | 0% | 85% | 0% | 0% | 0% | 12% | 0% | 0% | 3% | 10.9 | 12.4 |
| Plain blade | 9 | 5.9 | 0 | 0% | 90% | 0% | 0% | 0% | 6% | 0% | 0% | 3% | 18.6 | 19.9 |
| Plain blade | 20 | 5.9 | 0 | 0% | 95% | 0% | 0% | 0% | 4% | 0% | 0% | 1% | 19.9 | 20.8 |
| Optimised gun | 1 | 6 | 0 | 0% | 83% | 0% | 0% | 0% | 0% | 17% | 0% | 0% | 23.5 | 28.3 |
| Optimised gun | 9 | 6 | 0 | 0% | 81% | 0% | 0% | 0% | 0% | 13% | 0% | 6% | 32.1 | 37.1 |
| Optimised gun | 20 | 6 | 0 | 0% | 83% | 0% | 0% | 0% | 0% | 10% | 0% | 6% | 42.8 | 48 |
| Optimised blade | 1 | 5.9 | 0 | 0% | 53% | 33% | 0% | 0% | 13% | 0% | 0% | 2% | 16.3 | 18.7 |
| Optimised blade | 9 | 5.9 | 0 | 0% | 53% | 30% | 0% | 0% | 13% | 0% | 0% | 4% | 19 | 21.9 |
| Optimised blade | 20 | 5.8 | 0 | 0% | 55% | 31% | 0% | 0% | 7% | 0% | 0% | 7% | 25.8 | 27.9 |
| Tank | 1 | 5.9 | 0 | 0% | 46% | 0% | 0% | 0% | 24% | 0% | 20% | 9% | 6.5 | 12.5 |
| Tank | 9 | 5.9 | 0 | 0% | 55% | 0% | 0% | 0% | 15% | 0% | 19% | 11% | 7.3 | 11.7 |
| Tank | 20 | 5.9 | 0 | 0% | 59% | 0% | 0% | 0% | 8% | 0% | 19% | 14% | 12.5 | 18.3 |
| Sigil caster | 1 | 6 | 0 | 0% | 7% | 0% | 15% | 0% | 17% | 0% | 44% | 17% | 11 | 41 |
| Sigil caster | 9 | 6 | 0 | 0% | 0% | 0% | 11% | 0% | 24% | 0% | 57% | 9% | 17.3 | 147.8 |
| Sigil caster | 20 | 6 | 0 | 0% | 0% | 0% | 14% | 0% | 28% | 0% | 54% | 4% | 22.7 | 154.6 |
| Outburst caster | 1 | 6 | 0 | 0% | 0% | 0% | 17% | 0% | 5% | 0% | 78% | 0% | 7.3 | 43.6 |
| Outburst caster | 9 | 5.9 | 0 | 0% | 0% | 0% | 33% | 0% | 0% | 0% | 67% | 0% | 19.1 | 57.6 |
| Outburst caster | 20 | 6 | 0 | 0% | 0% | 0% | 33% | 0% | 0% | 0% | 67% | 0% | 22.5 | 67.5 |
| Faith build | 1 | 6 | 0 | 0% | 92% | 0% | 0% | 0% | 0% | 8% | 0% | 0% | 7.4 | 8 |
| Faith build | 9 | 5.9 | 0 | 0% | 32% | 0% | 51% | 0% | 0% | 1% | 0% | 17% | 22.7 | 23 |
| Faith build | 20 | 6 | 0 | 0% | 33% | 0% | 50% | 0% | 0% | 1% | 0% | 16% | 25.4 | 25.7 |
| Calls leader | 1 | 6 | 0 | 0% | 93% | 0% | 0% | 0% | 0% | 7% | 0% | 0% | 2.7 | 2.9 |
| Calls leader | 9 | 6 | 0 | 0% | 92% | 0% | 0% | 0% | 0% | 8% | 0% | 0% | 3.4 | 3.7 |
| Calls leader | 20 | 6 | 0 | 0% | 91% | 0% | 0% | 0% | 0% | 9% | 0% | 0% | 3.1 | 3.4 |

**Where AP above 6 came from** (the log line of the turn it arrived, times seen):

1. Optimised gun: +N AP (banked). (70)
2. Faith build: +N AP (banked); N lost to the +N cap. (8)
3. Calls leader: +N AP (banked). (3)

**What each build did with its turns** (actions used over the 8-round fights at level 9, normal share, per fight):

| Build | Actions |
|---|---|
| Plain gun | plain shot (hellraiser_service_rifle) 21.8 · end turn 7.8 · clear a jam 1.4 |
| Plain blade | plain cut (sabre) 21.4 · end turn 8 · move 1 |
| Optimised gun | plain shot (long_rifle) 19.4 · end turn 8 · reload 3 · clear a jam 1.5 |
| Optimised blade | plain cut (adamantile_greatsword) 8.3 · end turn 8 · Lunge 4.7 · move 1 |
| Tank | plain cut (sabre) 13 · Raise Shield 8 · end turn 8 · move 2 · brace (Guard) 1 |
| Sigil caster | walk the Line 17.3 · end turn 7.8 · move 6.1 · draw STONE 5.8 · draw FIRE 5.8 · draw CONDENSE 5.7 · draw SEEK 5.7 · Evoke STONE·FIRE·CONDENSE·SEEK 5 |
| Outburst caster | Pump 14.1 · Begin Heart Bolt 6.5 · end turn 3.3 · Release Heart Bolt (stage 4) 3.2 · Release Heart Bolt (stage 0) 2.2 · Release Heart Bolt (stage 1) 1 · Release Heart Bolt (stage 3) 0.1 |
| Faith build | Hymn: Lightning Rod 6.2 · end turn 6.2 · plain shot (hellraiser_service_rifle) 5.8 · move 0.1 · clear a jam 0.1 |
| Calls leader | plain shot (service_pistol) 12.3 · end turn 4.5 · clear a jam 0.6 · reload 0.5 |

## 6. Angle D: accuracy and critical hits

### 6.1 Hit chance of a plain attack (the engine's own number: 4 tiles for a gun, next to the target for a blade, open ground)

The first attack of a turn, with nobody Pressed or hurt. Later shots of a turn are lower (Recoil, Heat), and a Pressed character is at −1. Target: about 65% at equal level.

| Build | Share | Level | Minion (Defense 10) | Soldier (Defense 11) | Elite (Defense 12) | Boss (Defense 13) | Critical × |
|---|---|---|---|---|---|---|---|
| Plain gun | normal share | 1 | 70% | 65% | 60% | 55% | 1.6 |
| Plain gun | normal share | 3 | 70% | 65% | 60% | 55% | 1.7 |
| Plain gun | normal share | 6 | 70% | 65% | 60% | 55% | 1.7 |
| Plain gun | normal share | 9 | 70% | 65% | 60% | 55% | 1.7 |
| Plain gun | normal share | 12 | 70% | 65% | 60% | 55% | 1.7 |
| Plain gun | normal share | 20 | 70% | 65% | 60% | 55% | 1.8 |
| Plain gun | all in | 1 | 85% | 80% | 75% | 70% | 1.7 |
| Plain gun | all in | 3 | 85% | 80% | 75% | 70% | 1.7 |
| Plain gun | all in | 6 | 85% | 80% | 75% | 70% | 1.7 |
| Plain gun | all in | 9 | 80% | 75% | 70% | 65% | 1.7 |
| Plain gun | all in | 12 | 75% | 70% | 65% | 60% | 1.7 |
| Plain gun | all in | 20 | 70% | 65% | 60% | 55% | 1.7 |
| Plain blade | normal share | 1 | 70% | 65% | 60% | 55% | 1.6 |
| Plain blade | normal share | 3 | 70% | 65% | 60% | 55% | 1.7 |
| Plain blade | normal share | 6 | 70% | 65% | 60% | 55% | 1.7 |
| Plain blade | normal share | 9 | 70% | 65% | 60% | 55% | 1.7 |
| Plain blade | normal share | 12 | 70% | 65% | 60% | 55% | 1.7 |
| Plain blade | normal share | 20 | 70% | 65% | 60% | 55% | 1.8 |
| Plain blade | all in | 1 | 85% | 80% | 75% | 70% | 1.7 |
| Plain blade | all in | 3 | 85% | 80% | 75% | 70% | 1.7 |
| Plain blade | all in | 6 | 85% | 80% | 75% | 70% | 1.7 |
| Plain blade | all in | 9 | 80% | 75% | 70% | 65% | 1.7 |
| Plain blade | all in | 12 | 75% | 70% | 65% | 60% | 1.7 |
| Plain blade | all in | 20 | 70% | 65% | 60% | 55% | 1.7 |
| Optimised gun | normal share | 1 | 80% | 75% | 70% | 65% | 1.7 |
| Optimised gun | normal share | 3 | 80% | 75% | 70% | 65% | 1.7 |
| Optimised gun | normal share | 6 | 80% | 75% | 70% | 65% | 1.7 |
| Optimised gun | normal share | 9 | 80% | 75% | 70% | 65% | 1.8 |
| Optimised gun | normal share | 12 | 80% | 75% | 70% | 65% | 1.8 |
| Optimised gun | normal share | 20 | 80% | 75% | 70% | 65% | 1.9 |
| Optimised gun | all in | 1 | 95% | 90% | 85% | 80% | 1.7 |
| Optimised gun | all in | 3 | 95% | 90% | 85% | 80% | 1.7 |
| Optimised gun | all in | 6 | 95% | 90% | 85% | 80% | 1.7 |
| Optimised gun | all in | 9 | 90% | 85% | 80% | 75% | 1.8 |
| Optimised gun | all in | 12 | 85% | 80% | 75% | 70% | 1.9 |
| Optimised gun | all in | 20 | 80% | 75% | 70% | 65% | 2 |
| Optimised blade | normal share | 1 | 80% | 75% | 70% | 65% | 1.6 |
| Optimised blade | normal share | 3 | 80% | 75% | 70% | 65% | 1.6 |
| Optimised blade | normal share | 6 | 80% | 75% | 70% | 65% | 1.6 |
| Optimised blade | normal share | 9 | 80% | 75% | 70% | 65% | 1.6 |
| Optimised blade | normal share | 12 | 80% | 75% | 70% | 65% | 1.6 |
| Optimised blade | normal share | 20 | 80% | 75% | 70% | 65% | 1.6 |
| Optimised blade | all in | 1 | 95% | 90% | 85% | 80% | 1.5 |
| Optimised blade | all in | 3 | 95% | 90% | 85% | 80% | 1.5 |
| Optimised blade | all in | 6 | 95% | 90% | 85% | 80% | 1.5 |
| Optimised blade | all in | 9 | 90% | 85% | 80% | 75% | 1.5 |
| Optimised blade | all in | 12 | 85% | 80% | 75% | 70% | 1.5 |
| Optimised blade | all in | 20 | 80% | 75% | 70% | 65% | 1.5 |
| Tank | normal share | 1 | 70% | 65% | 60% | 55% | 1.6 |
| Tank | normal share | 3 | 70% | 65% | 60% | 55% | 1.6 |
| Tank | normal share | 6 | 70% | 65% | 60% | 55% | 1.6 |
| Tank | normal share | 9 | 60% | 55% | 50% | 45% | 1.6 |
| Tank | normal share | 12 | 60% | 55% | 50% | 45% | 1.7 |
| Tank | normal share | 20 | 65% | 60% | 55% | 50% | 1.7 |
| Tank | all in | 1 | 55% | 50% | 45% | 40% | 1.5 |
| Tank | all in | 3 | 50% | 45% | 40% | 35% | 1.5 |
| Tank | all in | 6 | 45% | 40% | 35% | 30% | 1.5 |
| Tank | all in | 9 | 50% | 45% | 40% | 35% | 1.6 |
| Tank | all in | 12 | 55% | 50% | 45% | 40% | 1.6 |
| Tank | all in | 20 | 70% | 65% | 60% | 55% | 1.7 |

### 6.2 What the fights showed (the sandbag under fire, soldier numbers, normal share)

Each cell: attacks that hit · attacks that were critical · share of all damage that came from criticals. Spells and prayers are not attack rolls of a weapon and are left out of the first two.

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 54% · 2% · 7% | 61% · 6% · 16% | 55% · 4% · 11% | 60% · 5% · 13% | 48% · 4% · 14% | 60% · 4% · 13% |
| Plain blade | 64% · 4% · 10% | 65% · 5% · 12% | 67% · 7% · 16% | 70% · 8% · 20% | 62% · 7% · 20% | 68% · 3% · 8% |
| Optimised gun | 69% · 6% · 14% | 69% · 3% · 8% | 66% · 7% · 17% | 64% · 5% · 14% | 62% · 4% · 10% | 70% · 7% · 19% |
| Optimised blade | 84% · 4% · 8% | 80% · 4% · 7% | 75% · 3% · 6% | 72% · 2% · 5% | 80% · 3% · 6% | 79% · 5% · 10% |
| Tank | 66% · 7% · 17% | 66% · 2% · 6% | 71% · 2% · 6% | 56% · 5% · 16% | 56% · 3% · 9% | 65% · 6% · 16% |
| Sigil caster | 56% · 0% · 0% | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% |
| Outburst caster | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% | 0% · 0% · 0% |
| Faith build | 41% · 4% · 15% | 41% · 7% · 26% | 58% · 9% · 6% | 62% · 9% · 5% | 51% · 9% · 5% | 58% · 7% · 5% |
| Calls leader | 27% · 2% · 14% | 19% · 5% · 36% | 19% · 1% · 6% | 25% · 9% · 48% | 23% · 3% · 22% | 20% · 9% · 56% |

### 6.3 Open ground against ground with cover (one enemy, normal share)

Each cell: the character's hit chance in the fight, open · with cover; then the enemy's hit chance on the character, open · with cover.

| Build | Level | Minion | Soldier | Elite | Boss |
|---|---|---|---|---|---|
| Plain gun | 1 | 72% · 58% ; 32% · 17% | 62% · 48% ; 56% · 42% | 60% · 48% ; 67% · 46% | 51% · 43% ; 72% · 62% |
| Plain gun | 9 | 72% · 59% ; 35% · 15% | 55% · 48% ; 50% · 34% | 52% · 47% ; 70% · 41% | 51% · 49% ; 73% · 48% |
| Plain gun | 20 | 58% · 48% ; 26% · 8% | 61% · 50% ; 51% · 41% | 61% · 47% ; 65% · 44% | 46% · 45% ; 79% · 49% |
| Plain blade | 1 | 71% · 70% ; 41% · 35% | 65% · 64% ; 53% · 52% | 58% · 56% ; 62% · 67% | 58% · 57% ; 81% · 74% |
| Plain blade | 9 | 69% · 68% ; 55% · 22% | 65% · 64% ; 54% · 51% | 63% · 62% ; 71% · 58% | 54% · 54% ; 81% · 71% |
| Plain blade | 20 | 78% · 73% ; 48% · 42% | 70% · 66% ; 58% · 61% | 58% · 59% ; 71% · 66% | 57% · 56% ; 81% · 76% |
| Optimised gun | 1 | 80% · 67% ; 42% · 15% | 77% · 57% ; 64% · 47% | 69% · 56% ; 70% · 54% | 66% · 60% ; 84% · 66% |
| Optimised gun | 9 | 71% · 51% ; 34% · 29% | 74% · 56% ; 55% · 37% | 74% · 59% ; 68% · 42% | 60% · 69% ; 80% · 53% |
| Optimised gun | 20 | 80% · 65% ; 47% · 35% | 69% · 57% ; 68% · 51% | 69% · 63% ; 81% · 53% | 56% · 61% ; 89% · 68% |
| Optimised blade | 1 | 78% · 93% ; 46% · 28% | 80% · 78% ; 60% · 49% | 74% · 71% ; 75% · 60% | 68% · 69% ; 81% · 77% |
| Optimised blade | 9 | 91% · 83% ; 46% · 32% | 75% · 84% ; 58% · 49% | 73% · 74% ; 69% · 61% | 70% · 67% ; 77% · 73% |
| Optimised blade | 20 | 91% · 85% ; 60% · 50% | 83% · 71% ; 64% · 69% | 73% · 68% ; 80% · 72% | 64% · 68% ; 85% · 87% |
| Tank | 1 | 71% · 78% ; 30% · 28% | 71% · 68% ; 45% · 41% | 56% · 62% ; 61% · 49% | 60% · 52% ; 60% · 58% |
| Tank | 9 | 59% · 60% ; 43% · 33% | 57% · 56% ; 47% · 49% | 46% · 46% ; 59% · 59% | 43% · 47% ; 64% · 64% |
| Tank | 20 | 73% · 61% ; 55% · 54% | 59% · 61% ; 63% · 63% | 56% · 53% ; 75% · 69% | 53% · 54% ; 79% · 82% |
| Sigil caster | 1 | 20% · 7% ; 44% · 42% | 27% · 15% ; 64% · 58% | 37% · 5% ; 75% · 68% | 38% · 5% ; 85% · 81% |
| Sigil caster | 9 | – · 10% ; 56% · 43% | – · 6% ; 68% · 53% | 18% · 0% ; 78% · 59% | 17% · 0% ; 87% · 76% |
| Sigil caster | 20 | – · – ; 68% · 54% | – · 13% ; 76% · 72% | – · 11% ; 81% · 78% | 17% · – ; 90% · 90% |
| Outburst caster | 1 | – · – ; 38% · 39% | – · – ; 58% · 54% | – · – ; 78% · 64% | – · – ; 87% · 86% |
| Outburst caster | 9 | – · – ; 49% · 29% | – · – ; 58% · 49% | 0% · – ; 72% · 54% | – · – ; 81% · 67% |
| Outburst caster | 20 | 15% · 0% ; 50% · 36% | 0% · 0% ; 72% · 59% | 0% · 0% ; 85% · 68% | 0% · 0% ; 90% · 75% |
| Faith build | 1 | 66% · 40% ; 42% · 16% | 39% · 35% ; 55% · 49% | 40% · 33% ; 71% · 56% | 37% · 29% ; 80% · 67% |
| Faith build | 9 | 56% · 26% ; 53% · 18% | 51% · 26% ; 58% · 45% | 62% · 34% ; 68% · 52% | 34% · 29% ; 84% · 72% |
| Faith build | 20 | 63% · 40% ; 49% · 33% | 47% · 36% ; 69% · 61% | 59% · 40% ; 79% · 68% | 49% · 36% ; 89% · 76% |
| Calls leader | 1 | 33% · 18% ; 37% · 25% | 25% · 16% ; 56% · 51% | 29% · 12% ; 70% · 59% | 25% · 9% ; 78% · 69% |
| Calls leader | 9 | 33% · 15% ; 43% · 37% | 20% · 7% ; 65% · 56% | 23% · 10% ; 72% · 61% | 10% · 9% ; 89% · 73% |
| Calls leader | 20 | 26% · 18% ; 69% · 58% | 18% · 9% ; 88% · 77% | 19% · 9% ; 92% · 81% | 11% · 7% ; 95% · 87% |

## 7. Angle E: defence stacked on the tank

Every source of "less damage" the tank build holds, and what gets through. The first columns are the engine's own numbers for the enemy's plain attack on it; the last two are measured in the fights (Guard, the shield and the perks act there).

| Level | Share | Enemy | Enemy hits the rifleman | Enemy hits the tank | A hit before armour | After the tank's armour | Tank: damage per enemy turn | Rifleman: damage per enemy turn | What gets through |
|---|---|---|---|---|---|---|---|---|---|
| 1 | normal share | Minion | 55% | 50% | 20 | 5 | 5 | 4.9 | 102% |
| 1 | normal share | Soldier | 65% | 60% | 23 | 8 | 5.1 | 18.7 | 27% |
| 1 | normal share | Elite | 75% | 70% | 29 | 14 | 10.3 | 17 | 61% |
| 1 | normal share | Boss | 70% | 65% | 30 | 15 | 13.5 | 22.5 | 60% |
| 3 | normal share | Minion | 55% | 50% | 21 | 1 | 1.5 | 5 | 30% |
| 3 | normal share | Soldier | 65% | 60% | 24 | 4 | 2.2 | 17.6 | 13% |
| 3 | normal share | Elite | 75% | 70% | 30 | 10 | 6.4 | 21.1 | 30% |
| 3 | normal share | Boss | 70% | 65% | 31 | 11 | 11.2 | 28.6 | 39% |
| 6 | normal share | Minion | 55% | 55% | 22 | 2 | 1.5 | 10.3 | 15% |
| 6 | normal share | Soldier | 65% | 65% | 26 | 6 | 3.7 | 23.6 | 16% |
| 6 | normal share | Elite | 75% | 75% | 33 | 13 | 8.8 | 19.5 | 45% |
| 6 | normal share | Boss | 70% | 70% | 33 | 13 | 14.1 | 27.4 | 51% |
| 9 | normal share | Minion | 55% | 55% | 24 | 4 | 3.5 | 10.3 | 34% |
| 9 | normal share | Soldier | 65% | 65% | 29 | 9 | 4.9 | 26.8 | 18% |
| 9 | normal share | Elite | 75% | 75% | 36 | 16 | 13.2 | 32.3 | 41% |
| 9 | normal share | Boss | 70% | 70% | 37 | 17 | 17.1 | 34.4 | 50% |
| 12 | normal share | Minion | 55% | 60% | 27 | 7 | 4.9 | 19.5 | 25% |
| 12 | normal share | Soldier | 65% | 70% | 32 | 12 | 8.4 | 35.4 | 24% |
| 12 | normal share | Elite | 75% | 80% | 40 | 20 | 14.3 | 33.4 | 43% |
| 12 | normal share | Boss | 70% | 75% | 41 | 21 | 21.7 | 41.8 | 52% |
| 20 | normal share | Minion | 55% | 70% | 36 | 16 | 14.5 | 18.4 | 79% |
| 20 | normal share | Soldier | 65% | 80% | 42 | 22 | 13.9 | 42.5 | 33% |
| 20 | normal share | Elite | 75% | 90% | 53 | 33 | 29.2 | 45.2 | 65% |
| 20 | normal share | Boss | 70% | 85% | 54 | 34 | 42.5 | 62.7 | 68% |
| 1 | all in | Minion | 50% | 50% | 20 | 10 | 5.4 | 5.6 | 96% |
| 1 | all in | Soldier | 60% | 60% | 23 | 13 | 7.7 | 12.3 | 63% |
| 1 | all in | Elite | 70% | 70% | 29 | 19 | 12.2 | 16.1 | 76% |
| 1 | all in | Boss | 65% | 65% | 30 | 20 | 19.2 | 25.5 | 75% |
| 3 | all in | Minion | 40% | 50% | 21 | 11 | 7.2 | 1.2 | 600% |
| 3 | all in | Soldier | 50% | 60% | 24 | 14 | 11.6 | 10.1 | 115% |
| 3 | all in | Elite | 60% | 70% | 30 | 20 | 17 | 16.9 | 101% |
| 3 | all in | Boss | 55% | 65% | 31 | 21 | 21.8 | 21.9 | 100% |
| 6 | all in | Minion | 30% | 55% | 22 | 12 | 10.1 | 1.4 | 721% |
| 6 | all in | Soldier | 40% | 65% | 26 | 16 | 11.2 | 12.4 | 90% |
| 6 | all in | Elite | 50% | 75% | 33 | 23 | 20.3 | 11.2 | 181% |
| 6 | all in | Boss | 45% | 70% | 33 | 23 | 24.6 | 17.2 | 143% |
| 9 | all in | Minion | 20% | 55% | 24 | 14 | 10.5 | 6.6 | 159% |
| 9 | all in | Soldier | 30% | 65% | 29 | 19 | 13.2 | 8.2 | 161% |
| 9 | all in | Elite | 40% | 75% | 36 | 26 | 20.7 | 10.9 | 190% |
| 9 | all in | Boss | 35% | 70% | 37 | 27 | 29 | 19.5 | 149% |
| 12 | all in | Minion | 25% | 60% | 27 | 7 | 5.7 | 6.2 | 92% |
| 12 | all in | Soldier | 35% | 70% | 32 | 12 | 7.4 | 6.1 | 121% |
| 12 | all in | Elite | 45% | 80% | 40 | 20 | 16.8 | 20.7 | 81% |
| 12 | all in | Boss | 40% | 75% | 41 | 21 | 20.5 | 27.6 | 74% |
| 20 | all in | Minion | 45% | 60% | 36 | 16 | 16.7 | 10.1 | 165% |
| 20 | all in | Soldier | 55% | 70% | 42 | 22 | 12.7 | 44.7 | 28% |
| 20 | all in | Elite | 65% | 80% | 53 | 33 | 22.4 | 38.4 | 58% |
| 20 | all in | Boss | 60% | 75% | 54 | 34 | 34 | 56.7 | 60% |

The tank's sources, as built (normal share):

1. Level 1: Defense 12, armour 15, Guard pool 3 (each point takes 10 off a hit), HP 145. skills Durability 3, Pain Threshold 2, Dexterity 2, Guts 1, Athletics 1, Senses 1 · attributes endurance 4, strength 4, agility 3, perception 3 · no class yet · Sabre (masterwork) + Legion riot shield · armour Class 3 · HP 145 · perks Bulwark
2. Level 3: Defense 12, armour 20, Guard pool 5 (each point takes 10 off a hit), HP 167. skills Durability 4, Pain Threshold 3, Dexterity 3, Guts 1, Athletics 1, Senses 1 · attributes endurance 4, strength 4, agility 4, perception 3 · Defender rank 1 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 167 · perks Bulwark, Used to the Pain, Both Hands
3. Level 6: Defense 12, armour 20, Guard pool 5 (each point takes 10 off a hit), HP 240. skills Durability 5, Pain Threshold 4, Dexterity 4, Guts 2, Athletics 1, Senses 1 · attributes endurance 6, strength 4, agility 4, perception 3 · Defender rank 2 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 240 · perks Bulwark II, Used to the Pain, Both Hands
4. Level 9: Defense 12, armour 20, Guard pool 5 (each point takes 10 off a hit), HP 310. skills Durability 7, Pain Threshold 5, Dexterity 4, Guts 2, Athletics 2, Senses 2 · attributes endurance 7, strength 4, agility 4, perception 3 · Defender rank 2 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 310 · perks Bulwark II, Used to the Pain II, Both Hands, Shrug It Off
5. Level 12: Defense 12, armour 20, Guard pool 5 (each point takes 10 off a hit), HP 392. skills Durability 8, Pain Threshold 6, Dexterity 5, Guts 3, Athletics 2, Senses 2 · attributes endurance 8, agility 5, strength 4, perception 3 · Defender rank 3 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 392 · perks Bulwark II, Used to the Pain II, Both Hands II, Shrug It Off, Iron Stomach
6. Level 20: Defense 14, armour 20, Guard pool 5 (each point takes 10 off a hit), HP 672. skills Durability 10, Pain Threshold 9, Dexterity 7, Guts 4, Athletics 4, Senses 4 · attributes endurance 10, agility 7, strength 4, perception 3 · Defender rank 3 · Sabre (masterwork) + Legion riot shield · armour Class 4 · HP 672 · perks Bulwark II, Used to the Pain II, Both Hands II, Shrug It Off II, Iron Stomach, Wind on the Skin, Wall Run, Scar Tissue II, Running Reload, Last Wall (Mastered)

## 8. Angle F: control and saves

From the duels (all four tiers together, open ground), normal share. "Resisted" is the share of conditions aimed at that side that a save or an immunity stopped (a condition with no save counts as landed). "Pressed" and "Suppressed" are the share of that side's turns that started that way (Pressure from being shot at: Suppressed costs 1 AP and the reactions). A lost turn is one the engine passed (Stunned) or that started with no AP. The policies do not use control on purpose, so this shows only what weapons, techniques and spells do on their way.

| Build | Level | Character: conditions aimed | Resisted | Turns Pressed | Turns Suppressed | Turns lost | Longest run | Enemy: conditions aimed | Resisted | Turns Pressed | Turns Suppressed | Turns lost | Longest run |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Plain gun | 1 | 0 | – | 28% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain gun | 9 | 0 | – | 29% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain gun | 20 | 0 | – | 22% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain blade | 1 | 0 | – | 27% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain blade | 9 | 0 | – | 26% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain blade | 20 | 0 | – | 26% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised gun | 1 | 0 | – | 23% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised gun | 9 | 0 | – | 23% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised gun | 20 | 0 | – | 22% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised blade | 1 | 0 | – | 27% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised blade | 9 | 0 | – | 29% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised blade | 20 | 0 | – | 25% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Tank | 1 | 0 | – | 21% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Tank | 9 | 0 | – | 19% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Tank | 20 | 0 | – | 25% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Sigil caster | 1 | 0 | – | 35% | 0% | 0% | 0 | 8 | 36% | 0% | 0% | 0% | 0 |
| Sigil caster | 9 | 0 | – | 12% | 0% | 0% | 0 | 3 | 0% | 0% | 0% | 0% | 0 |
| Sigil caster | 20 | 0 | – | 11% | 0% | 0% | 0 | 5 | 0% | 0% | 0% | 0% | 0 |
| Outburst caster | 1 | 0 | – | 31% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Outburst caster | 9 | 0 | – | 30% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Outburst caster | 20 | 0 | – | 31% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Faith build | 1 | 0 | – | 33% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Faith build | 9 | 269 | 0% | 26% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Faith build | 20 | 250 | 0% | 30% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Calls leader | 1 | 0 | – | 37% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Calls leader | 9 | 0 | – | 30% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Calls leader | 20 | 0 | – | 31% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |

## 9. Angle G: resources

From the sandbag under fire (soldier numbers, 8 rounds or until the character goes down), normal share, level 9 and 20. Earned and spent are per fight. "Empty" and "at its cap" are the share of the character's turns that started that way. Target (proposed): each resource should bind in about one turn out of three; one that is never empty or never spent is cut or re-priced.

| Build | Level | Resource | Cap | Earned | Spent | Turns empty | Turns at its cap |
|---|---|---|---|---|---|---|---|
| Plain gun | 9 | Heat | 8 | 21.8 | 17.9 | 27% | 0% |
| Plain gun | 9 | Rounds in the weapon | 24 | 0 | 21.8 | 0% | 13% |
| Plain gun | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain gun | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Plain gun | 20 | Heat | 8 | 21.5 | 20.5 | 28% | 0% |
| Plain gun | 20 | Rounds in the weapon | 24 | 0 | 21.5 | 0% | 13% |
| Plain gun | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain gun | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Plain blade | 9 | Momentum | 3 | 10.5 | 10.2 | 29% | 9% |
| Plain blade | 9 | Guard | 3 | 0 | 0 | 100% | 0% |
| Plain blade | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain blade | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Plain blade | 20 | Momentum | 3 | 11.9 | 11.3 | 39% | 3% |
| Plain blade | 20 | Guard | 5 | 0 | 0 | 100% | 0% |
| Plain blade | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain blade | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised gun | 9 | Heat | 6 | 19.4 | 18.2 | 36% | 0% |
| Optimised gun | 9 | Rounds in the weapon | 5 | 15 | 19.4 | 8% | 36% |
| Optimised gun | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised gun | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised gun | 20 | Heat | 6 | 18.7 | 16 | 24% | 0% |
| Optimised gun | 20 | Rounds in the weapon | 5 | 14.5 | 18.7 | 16% | 36% |
| Optimised gun | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised gun | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised blade | 9 | Momentum | 5 | 5.9 | 6.3 | 86% | 0% |
| Optimised blade | 9 | Guard | 2 | 0 | 0 | 100% | 0% |
| Optimised blade | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised blade | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised blade | 20 | Momentum | 5 | 6.2 | 6.5 | 94% | 0% |
| Optimised blade | 20 | Guard | 4 | 0 | 0 | 100% | 0% |
| Optimised blade | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised blade | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Tank | 9 | Momentum | 3 | 7.3 | 7.8 | 94% | 0% |
| Tank | 9 | Guard | 5 | 10.3 | 10.3 | 83% | 0% |
| Tank | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Tank | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Tank | 20 | Momentum | 3 | 9.1 | 9.4 | 96% | 0% |
| Tank | 20 | Guard | 5 | 12.1 | 12.1 | 98% | 0% |
| Tank | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Tank | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Sigil caster | 9 | Rounds in the weapon | 12 | 0 | 0 | 0% | 100% |
| Sigil caster | 9 | Flux | 6 | 20.2 | 18 | 35% | 1% |
| Sigil caster | 9 | Core charge | 10 | 35.3 | 38.7 | 13% | 13% |
| Sigil caster | 9 | Spare cores | – | 0 | 3.7 | 0% | – |
| Sigil caster | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Sigil caster | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Sigil caster | 20 | Rounds in the weapon | 12 | 0 | 0 | 0% | 100% |
| Sigil caster | 20 | Flux | 6 | 22.5 | 19.2 | 14% | 4% |
| Sigil caster | 20 | Core charge | 10 | 31 | 37.5 | 3% | 14% |
| Sigil caster | 20 | Spare cores | – | 0 | 3.2 | 0% | – |
| Sigil caster | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Sigil caster | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Outburst caster | 9 | Rounds in the weapon | 6 | 0 | 0 | 0% | 100% |
| Outburst caster | 9 | MP | 300 | 0 | 186 | 0% | 30% |
| Outburst caster | 9 | Strain | 7 | 6.5 | 2.3 | 30% | 0% |
| Outburst caster | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Outburst caster | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Outburst caster | 20 | Rounds in the weapon | 6 | 0 | 0 | 0% | 26% |
| Outburst caster | 20 | MP | 300 | 0 | 166.2 | 0% | 29% |
| Outburst caster | 20 | Strain | 9 | 7 | 2.5 | 29% | 0% |
| Outburst caster | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Outburst caster | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Faith build | 9 | Heat | 8 | 5.8 | 4.9 | 100% | 0% |
| Faith build | 9 | Rounds in the weapon | 24 | 0 | 5.8 | 0% | 16% |
| Faith build | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Faith build | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Faith build | 20 | Heat | 8 | 4.5 | 3.7 | 100% | 0% |
| Faith build | 20 | Rounds in the weapon | 24 | 0 | 4.5 | 0% | 21% |
| Faith build | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Faith build | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Calls leader | 9 | Heat | 6 | 12.3 | 8.9 | 31% | 0% |
| Calls leader | 9 | Rounds in the weapon | 12 | 6 | 12.3 | 7% | 22% |
| Calls leader | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Calls leader | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Calls leader | 20 | Heat | 6 | 9.8 | 6.8 | 36% | 0% |
| Calls leader | 20 | Rounds in the weapon | 12 | 2.4 | 9.8 | 6% | 28% |
| Calls leader | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Calls leader | 20 | Reactions used | 1 | 0 | 0 | 100% | – |

Notes: Strain, Heat and Flux are "bad" meters (empty is good, the cap is the limit). Echo was never spent: the policies do not reroll. A reaction counts as used in a round the engine marked one used.

## 10. Angle H: growth

HP, and damage a turn on the shooting range (soldier numbers, 8 turns), by level. The last column is level 20 ÷ level 1.

**normal share**

| Build | What | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Growth |
|---|---|---|---|---|---|---|---|---|
| Plain gun | HP | 145 | 163 | 190 | 233 | 288 | 445 | ×3.1 |
| Plain gun | Damage a turn | 71.6 | 77.8 | 98.6 | 107.6 | 124.6 | 103.8 | ×1.4 |
| Plain blade | HP | 145 | 163 | 190 | 233 | 288 | 498 | ×3.4 |
| Plain blade | Damage a turn | 65.3 | 76.9 | 87 | 96 | 107.2 | 109.7 | ×1.7 |
| Optimised gun | HP | 130 | 144 | 175 | 202 | 229 | 392 | ×3 |
| Optimised gun | Damage a turn | 149.1 | 153.9 | 183.5 | 185.4 | 211.3 | 232 | ×1.6 |
| Optimised blade | HP | 145 | 159 | 190 | 233 | 266 | 445 | ×3.1 |
| Optimised blade | Damage a turn | 100 | 99 | 112.2 | 132.8 | 138.3 | 144.7 | ×1.4 |
| Tank | HP | 145 | 167 | 240 | 310 | 392 | 672 | ×4.6 |
| Tank | Damage a turn | 45.1 | 57.9 | 68.9 | 53.8 | 60.7 | 76.9 | ×1.7 |
| Sigil caster | HP | 130 | 144 | 175 | 202 | 251 | 392 | ×3 |
| Sigil caster | Damage a turn | 45.6 | 58.8 | 69.4 | 70.5 | 122.1 | 154.7 | ×3.4 |
| Outburst caster | HP | 130 | 144 | 175 | 202 | 251 | 339 | ×2.6 |
| Outburst caster | Damage a turn | 48 | 70.4 | 78.6 | 77.9 | 110.8 | 121.7 | ×2.5 |
| Faith build | HP | 130 | 144 | 175 | 202 | 251 | 339 | ×2.6 |
| Faith build | Damage a turn | 59.6 | 52.5 | 99.5 | 108.7 | 113 | 129.3 | ×2.2 |
| Calls leader | HP | 130 | 155 | 170 | 185 | 200 | 392 | ×3 |
| Calls leader | Damage a turn | 20.3 | 18.5 | 18.5 | 23.9 | 17.7 | 13.3 | ×0.7 |

**all in**

| Build | What | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Growth |
|---|---|---|---|---|---|---|---|---|
| Plain gun | HP | 130 | 140 | 155 | 185 | 230 | 634 | ×4.9 |
| Plain gun | Damage a turn | 119.5 | 128 | 143.3 | 138.1 | 130.2 | 117.4 | ×1 |
| Plain blade | HP | 130 | 140 | 155 | 185 | 230 | 634 | ×4.9 |
| Plain blade | Damage a turn | 108.1 | 116 | 126.2 | 123.6 | 118.4 | 107.1 | ×1 |
| Optimised gun | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Optimised gun | Damage a turn | 222.4 | 243 | 271.7 | 261.2 | 254.8 | 229 | ×1 |
| Optimised blade | HP | 130 | 140 | 155 | 185 | 230 | 452 | ×3.5 |
| Optimised blade | Damage a turn | 118.9 | 127.1 | 132.9 | 140.5 | 129.8 | 145.4 | ×1.2 |
| Tank | HP | 190 | 235 | 325 | 435 | 510 | 710 | ×3.7 |
| Tank | Damage a turn | 24.8 | 22.8 | 25 | 27.1 | 41.5 | 101.2 | ×4.1 |
| Sigil caster | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Sigil caster | Damage a turn | 73.2 | 72.7 | 102.9 | 99.1 | 104 | 128.6 | ×1.8 |
| Outburst caster | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Outburst caster | Damage a turn | 71.1 | 95.7 | 105.7 | 99.5 | 107.8 | 158.1 | ×2.2 |
| Faith build | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Faith build | Damage a turn | 35.4 | 26.7 | 103.1 | 107 | 108.6 | 139.5 | ×3.9 |
| Calls leader | HP | 115 | 125 | 140 | 155 | 170 | 286 | ×2.5 |
| Calls leader | Damage a turn | 11.5 | 9.4 | 8.1 | 3 | 4.2 | 6 | ×0.5 |

## 11. Angle K: squad size

The squad: 1 Optimised gun, 2 Tank, 3 Sigil caster, 4 Calls leader (a squad of 2 is the first two, and so on), normal share. Each cell: percent won · rounds to win · characters that went down, per fight.

**Standard fight: 3 soldiers and 1 elite, open ground**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 20% · 4.5 · 0.8 | 20% · 4.5 · 0.8 | 0% · – · 1 | 0% · – · 1 |
| 2 | 60% · 5.7 · 0.9 | 80% · 6.4 · 0.4 | 50% · 7.2 · 0.7 | 90% · 7.1 · 0.4 |
| 3 | 90% · 5.6 · 0.6 | 100% · 5 · 0.2 | 80% · 6.1 · 0.4 | 100% · 4.9 · 0.1 |
| 4 | 100% · 5.6 · 0.3 | 100% · 4 · 0 | 100% · 4.6 · 0.2 | 100% · 3.9 · 0 |

**Standard fight: 3 soldiers and 1 elite, ground with cover**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 0% · – · 1 | 10% · 6 · 0.9 | 20% · 7.5 · 0.8 | 0% · – · 1 |
| 2 | 50% · 9.4 · 1.4 | 80% · 7.3 · 0.4 | 80% · 6.5 · 0.4 | 90% · 6.4 · 0.3 |
| 3 | 90% · 6.6 · 0.6 | 90% · 5.4 · 0.3 | 100% · 6.2 · 0.2 | 90% · 5.1 · 0.3 |
| 4 | 100% · 5.7 · 0.6 | 100% · 5.1 · 0 | 90% · 5.6 · 0.6 | 100% · 4.8 · 0.2 |

**Boss fight: 1 boss and 2 soldiers, open ground**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 0% · – · 1 | 0% · – · 1 | 0% · – · 1 | 0% · – · 1 |
| 2 | 20% · 9.5 · 1.1 | 30% · 10.7 · 0.9 | 30% · 10.3 · 0.8 | 30% · 9 · 0.8 |
| 3 | 70% · 6.9 · 0.7 | 90% · 8.9 · 0.7 | 80% · 9 · 0.7 | 70% · 7.7 · 0.5 |
| 4 | 80% · 8.9 · 1.6 | 100% · 7.2 · 0.6 | 100% · 7.8 · 0.6 | 100% · 6.3 · 0.1 |

**Boss fight: 1 boss and 2 soldiers, ground with cover**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 0% · – · 1 | 0% · – · 0.7 | 10% · 12 · 0.8 | 0% · – · 1 |
| 2 | 20% · 9 · 1.3 | 60% · 10 · 0.4 | 40% · 11.8 · 0.7 | 70% · 10.9 · 0.4 |
| 3 | 40% · 8.5 · 0.9 | 90% · 8.7 · 0.6 | 80% · 10.6 · 0.6 | 90% · 9.4 · 0.7 |
| 4 | 60% · 8.5 · 1.6 | 100% · 8.5 · 0.6 | 80% · 9 · 1.1 | 100% · 8.9 · 0.7 |

**Who did what in the squad of four** (open ground; damage a turn · damage taken a fight · Calls made a fight):

| Fight | Level | Optimised gun | Tank | Sigil caster | Calls leader |
|---|---|---|---|---|---|
| Standard fight | 1 | 106.4 · 93 · 0 | 15.4 · 24.1 · 0 | 37.3 · 53.4 · 0 | 7.2 · 77.3 · 8.1 |
| Standard fight | 6 | 223.5 · 70.1 · 0 | 14.2 · 20.6 · 0 | 25.2 · 37.1 · 0 | 6.4 · 69.7 · 7.1 |
| Standard fight | 12 | 258 · 82.8 · 0 | 27.8 · 33.6 · 0 | 44.4 · 84.5 · 0 | 5 · 121.9 · 7 |
| Standard fight | 20 | 258.6 · 120 · 0 | 29.3 · 77.6 · 0 | 117.8 · 113.8 · 0 | 5.3 · 228.3 · 7 |
| Boss fight | 1 | 86.5 · 130.4 · 0 | 27.2 · 34.4 · 0 | 20.6 · 120.8 · 0 | 5.4 · 109.1 · 11.5 |
| Boss fight | 6 | 174.8 · 104 · 0 | 25.2 · 24.9 · 0 | 55.5 · 100.4 · 0 | 3.4 · 146.3 · 11.6 |
| Boss fight | 12 | 212.1 · 139.1 · 0 | 25.4 · 53.3 · 0 | 86.6 · 147.3 · 0 | 3.5 · 194.5 · 11.2 |
| Boss fight | 20 | 240.3 · 235.5 · 0 | 32.4 · 106 · 0 | 141.4 · 155.8 · 0 | 2.2 · 267.5 · 11.2 |

## 12. How the player side plays, and what it cannot play

Each build is played the same way every fight, deciding only from what the game's own cards show a player:

1. **Plain (the two plain builds):** the weapon's plain attack at the target with the best expected damage. If nothing can be attacked: reload, clear a jam or brace; else walk the cheapest way to a tile it can attack from. When only the AP is short it stays where it is.
2. **Optimised (gun, blade):** it lists the plain attack and every ready technique that aims at an enemy, against every enemy in sight, works out the expected damage of each (hit chance × damage after armour, criticals counted) and divides by its AP; it uses the best one, and repeats until the AP runs out. It looks one action ahead only.
3. **Peak:** the same list, but it takes the single biggest expected hit it can afford, so the dearest move is used as soon as its price is met. With a melee weapon the Finisher is held until Momentum is full (from round 6: 3 or more), and only plain attacks are made until then. The Outburst caster pours in its best feeling and holds for stage 4; the Sigil caster draws its biggest Line; the Faith build calls its Miracle when the engine allows it.
4. **Tank:** as optimised, but the last AP of a turn goes to Guard (Raise Shield, else Brace); when it has to walk, it walks first and guards with the last AP.
5. **Sigil caster:** the strongest single-target damage Line its words, glyph cap, charge and Flux allow, drawn walking away from the target, finished over as many turns as it takes, Evoked at the best target; a fresh core is loaded when the core runs dry (if the AP is short, the Line waits for the next turn); the kit's pistol when it can do nothing else.
6. **Outburst caster:** Begin the starting Damage design, Pump while the AP still pays for the Release and the Strain stays inside the limit, Release at the best target, Begin again with what is left.
7. **Faith build:** its patron's damaging Hymn whenever the engine allows it by standing (never above its Devotion), plain shots between.
8. **Calls leader:** Rally, Spot, Brief, Threaten, in that order, each when the engine allows it, at most 2 Calls a turn; then the sidearm. Rally and Brief go to the ally holding the hardest-hitting weapon. Alone it has only Threaten, so its own numbers are its pistol's: what a leader is worth shows in the squad tables (section 11).

The ground: 16 × 11 tiles, the two sides start 11 tiles apart; "open" has no cover, "with cover" has half cover in front of both starting lines and in the middle. Enemy weapons: minion service pistol, soldier hellraiser service rifle, elite legion bullpup, boss hellraiser lmg (the first weapon the Proving Ground gives each tier).

**What the simulator does not play** (so the numbers above are a floor for these):

1. Reaction choices: a reaction window offered to a player is declined; Answers, Interpose, Duck and Roll and the other automatic reactions still fire by themselves.
2. Guarding Momentum: the melee builds never spend 1 AP on the Guard technique to keep their Momentum when hit (the tank guards for Guard points only).
3. Watches and Overwatch (holding a shot or a blow for the enemy's turn).
4. Perk and class actions with a button (Earthbreaker, Judgement Day, Shove, Litany, On My Mark, Clean Draw, The Twin Pays, Eye of the Storm, Unstoppable…): none is pressed. Everything a perk or class move does by itself is in the numbers.
5. Anything valued for what it is not damage: conditions, pushes, Pressure, set-ups, Analyze, Hide, cover-seeking, stims and healing, shields, throwing grenades, swapping weapons, picking things up.
6. Echo rerolls, Overreach, vows and rites.
7. Dual wielding and off-hand guns (parked: section 9 of the balance pass).
8. Sigil: only single-target damage Lines with SEEK (no Bursts, fields, traps, turrets, Afflictions, Boons or Workings), finished from the last glyph drawn; no study or word mastery during a fight. It always draws its strongest Line and does not ration cores: when the kit's spare cores are gone it is left with its pistol.
9. Outburst: only the starting Damage design (Heart Bolt); no second school, no modules learned by practice, no tone, no Feed, Steady, Let go, Crystallise or Heart Overwatch.
10. Faith: only the patron's damaging Hymn (and the Miracle on the peak turn); no Whispers, no support Hymns, no interventions asked for.
11. Calls: only Rally, Spot, Brief and Threaten, in a fixed order, 2 a turn; no Order, Cue, Warn, Name It or Taunt, no Calls as reactions. Alone, a leader has only Threaten.

**Other limits.**

1. A fixed way of playing is not a player. A good player beats these numbers with positioning, focus fire and combinations; the tables compare builds played the same simple way.
2. One enemy weapon per tier, one map size, one starting distance. Melee builds pay for the 11 tiles (a turn or more of walking, on the range too); a smaller map would favour them.
3. Damage is counted as dealt, not cut at the last HP: against a minion most of a big hit is wasted, which the "rounds to win" tables show and the "damage a turn" tables do not.
4. The share of damage from criticals counts weapon attacks only: a spell's critical is in its damage but is not marked as one.
5. "Conditions resisted" counts conditions the effects stream reports; a save that is rolled without a condition (a push, a pull) is not counted.
6. Drill, Sigil words and Devotion are assumptions (section 2); change them in `packages/engine/test/balance/builds.ts` and run again.

