# Balance baseline: the fight simulator (generated 2026-11-11)

Made by `packages/engine/test/balance/` (the fight simulator, instrument 1 of `docs/design/proposals/2026-11-balance-pass.md`). **Nothing was changed: this measures the game as it is.** Whole fights are played through the real rules with seeded dice: the player side by a fixed way of playing (section 12 says exactly what each one does and does not do), the enemies by the engine's own AI. 20 fights a row for duels, 10 for the long fights; the run took 567 seconds. Run it again with `BALANCE_SIM_OUT=docs/design/handoffs npx vitest run --root packages/engine test/balance/balance-sim.test.ts`.

**How to read it.** "Normal share" is a character who put 36% of all Skill points in the main attack skill (4 of 10 at creation; the rest in defence and utility). "All in" raises the main skill and its attribute as fast as the level's ceiling allows. "Damage a turn" counts every turn the character took, walking and reloading turns included. Damage is what the hit dealt, not cut off at the target's last HP. Three kinds of fight are used: **the shooting range** (8 turns on a target with a soldier's numbers that never acts: damage with nothing in the way), **the sandbag under fire** (the same target shooting back with a soldier's rifle, for 8 rounds or until the character goes down), and **real fights** (duels, focus, squads) that end when one side is down. **The engine has no enemy levels today: the same four tiers (Minion 30 HP, Defense 10, armour 0; Soldier 60 HP, Defense 12, armour 5; Elite 100 HP, Defense 13, armour 10; Boss 200 HP, Defense 14, armour 10) face a level 1 and a level 20 character.**

## 1. Summary: what matters most, against the targets

1. **Attacks to kill an enemy (minion below the target, soldier below the target, elite below the target, boss below the target).** The yardstick (service rifle, normal share) needs these hits that land to kill, at level 1: minion 1, soldier 2, elite 3, boss 6; at level 20: minion 1, soldier 1, elite 2, boss 4. Target: minion 2, soldier 3 to 4, elite 6 to 8, boss about 20. Enemies have no levels, so the gap widens as characters grow (section 4.2).
2. **Fight length (standard fight: below the target; boss fight: below the target).** A squad of four wins the standard fight in 1.5 to 2.4 rounds on open ground and 2 to 3.4 with cover, and the boss fight in 1.4 to 3.2 and 1.7 to 3.3 (levels 1 to 20; it won 159 of 160). Targets: 4 to 6 rounds, boss 8 to 10 (section 11).
3. **Damage a turn against the plain rifle (100%), normal share, lowest to highest over levels 1 to 20.** On the shooting range, 8 turns: optimised gun 173 to 215%, optimised blade 105 to 152%, Sigil 58 to 111%, Outburst 66 to 98%, Faith 69 to 92%, plain blade 87 to 99%, tank 52 to 73%, Calls leader 20 to 30%. Over the first 4 turns only (a fight of the target length): Sigil 47 to 90%, Outburst 67 to 103%, optimised gun 157 to 217%, optimised blade 96 to 122% (it walks for most of the first turn). Under fire (the target shoots back): optimised gun 170 to 256%, optimised blade 94 to 160%, Sigil 44 to 107%, Outburst 70 to 95%, Faith 64 to 117%, plain blade 86 to 115%, tank 37 to 61%, Calls leader 16 to 31%. Targets: optimised physical 150%, Sigil up to 150% on average over the fight, Outburst 125% steady. The casters are played in a simple fixed way (section 12): read theirs as a floor. Section 3.1 has every level.
4. **What techniques add to the optimised builds.** With the same sheet and gear on the shooting range, the optimised gun with its techniques does 91 to 103% of what it does with plain shots only, and spends 0% of its AP on techniques: it used none, so the spread around 100% is dice (the way it is played picks a technique only when it beats the plain shot for its AP; against a target that is not Pressed none does). The optimised blade with its techniques does 109 to 134% of its own plain cuts (25 to 42% of its AP on techniques). The gun's place against the 150% target is its weapon: a long rifle's base damage is 50, the service rifle's 30, at the same AP a shot.
5. **The biggest single hits in a fight:** 487 (Sigil caster, all in, level 20: Evoke STONE·FIRE·CONDENSE·SEEK, critical); 460 (Optimised blade, all in, level 20: Coup (Adamantile greatsword), critical); 448 (Optimised gun, all in, level 20: plain shot (Long rifle), critical); 386 (Outburst caster, normal share, level 12: Release Heart Bolt (stage 4), critical). Targets: 350 a hit, 500 on a mega critical. Nothing passed 500 in a fight. Nothing passed 350 without a critical. On the engine's own card with the price fully met (section 3.4), against a boss: Dead Centre (Optimised gun, all in, level 20): 188 on a hit, 663 on a critical; Coup (Optimised blade, normal share, level 20): 239 on a hit, 538 on a critical. The reference weapons are not the hardest-hitting in the data (the breacher tube and the bows hit harder: `balance-baseline.md`).
6. **Accuracy starts near the target and climbs past it; a critical is far bigger than ×1.5.** Hit chance of the yardstick's first shot at 4 tiles on open ground, level 1: minion 70%, soldier 60%, elite 55%, boss 50%; level 20: minion 95%, soldier 90%, elite 85%, boss 80% (target: about 65% at equal level; enemy Defense does not move with level). A critical multiplies the yardstick's damage by 2.4 at level 1 and 2.9 at level 20 (2.6 all in) (target: ×1.5, to ×2 with perks and gear). Criticals were 6 to 25% of the weapon builds' damage (proposed limit: 20%).
7. **How hard enemies hit, and how long a character lasts.** A plain hit before armour, with the weapon each tier carries here: minion 20, soldier 30, elite 28, boss 25. Turns of ONE enemy to take the yardstick character from full HP to 0, level 1: minion 28.6, soldier 3.9, elite 8.1, boss 7.9; level 20: minion never hurt, soldier never hurt, elite 27.5, boss 52.2. With every enemy on it, at level 1, 4 minions: down in 0% of fights; 4 soldiers: down in 100% of fights (round 1.6 on average); 2 elites: down in 30% of fights (round 3.3 on average) | at level 9, 4 minions: down in 0% of fights; 4 soldiers: down in 80% of fights (round 2.4 on average); 2 elites: down in 0% of fights | at level 20, 4 minions: down in 0% of fights; 4 soldiers: down in 0% of fights; 2 elites: down in 0% of fights. Target: 3 turns of focus (which of the two readings is meant is question 1).
8. **The tank takes 18 to 62% of the damage the plain rifleman takes from an elite, per enemy turn, and deals 52 to 73% of his damage on the range (37 to 61% under fire).** Under fire it spends 8 to 24% of its AP walking and 19 to 20% on Guard. It wears the heaviest armour it can carry and still walk 1 tile an AP (section 2, assumption 4).
9. **Resources and AP.** The Fighter's Momentum was empty at the start of 50 to 90% of its turns under fire (28 to 40% on the range) (every hit taken costs 1; only a plain cut that lands gives 1). The Outburst caster at level 9 spent 394 MP over 8 turns on the range from a pool of 300, kept going by Syphon (5 a fight); it started 0% of its turns with no MP and 0% at its Strain limit. The Sigil caster started 0% of its turns with no spare core left (a 4-glyph Line and its Evoke burn most of a core; the kit carries 4 spares). No build left more than 16% of its AP unspent; AP above 6 was seen in 4 of the 8-turn rows (section 5 names the sources). Section 9 has every resource.
10. **Growth from level 1 to 20 (normal share, on the range):** plain rifle ×2.5 damage, ×3.1 HP; optimised gun ×2.2 damage, ×3 HP; optimised blade ×2 damage, ×3.1 HP; Sigil ×4.8 damage, ×3 HP; Outburst ×3.7 damage, ×2.6 HP. Target (proposed): damage and HP each about ×3 to ×4, in step. Enemies grow ×1: they have no levels.

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
| Plain gun | 67.7 · 100% | 84.6 · 100% | 114.4 · 100% | 139.2 · 100% | 172.1 · 100% | 170.5 · 100% |
| Plain blade | 64.6 · 95% | 83.8 · 99% | 100 · 87% | 127.1 · 91% | 153.8 · 89% | 162.4 · 95% |
| Optimised gun | 145.4 · 215% | 164.6 · 195% | 210.5 · 184% | 241 · 173% | 297.2 · 173% | 323.6 · 190% |
| Optimised blade | 102.9 · 152% | 103.3 · 122% | 120.5 · 105% | 168.3 · 121% | 213.5 · 124% | 208.5 · 122% |
| Tank | 42.4 · 63% | 61.9 · 73% | 76.4 · 67% | 72.2 · 52% | 89.7 · 52% | 118.1 · 69% |
| Sigil caster | 39.5 · 58% | 58.8 · 70% | 78.6 · 69% | 93.1 · 67% | 146.3 · 85% | 189.3 · 111% |
| Outburst caster | 44.9 · 66% | 70.4 · 83% | 83 · 73% | 99.8 · 72% | 137.2 · 80% | 167.8 · 98% |
| Faith build | 60.2 · 89% | 58.1 · 69% | 105.1 · 92% | 116.4 · 84% | 127.2 · 74% | 147.7 · 87% |
| Calls leader | 20.6 · 30% | 21 · 25% | 23.2 · 20% | 39.1 · 28% | 34.6 · 20% | 35.3 · 21% |

**all in, on the range**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 116.4 · 172% | 133.7 · 158% | 166.1 · 145% | 184.1 · 132% | 179.7 · 104% | 179.8 · 105% |
| Plain blade | 111.3 · 164% | 121.4 · 143% | 141.7 · 124% | 163.3 · 117% | 171.3 · 100% | 168.4 · 99% |
| Optimised gun | 213.1 · 315% | 257 · 304% | 302.4 · 264% | 334.3 · 240% | 336.8 · 196% | 339.3 · 199% |
| Optimised blade | 119.2 · 176% | 129.9 · 154% | 136.2 · 119% | 177.3 · 127% | 172.6 · 100% | 212.5 · 125% |
| Tank | 23.6 · 35% | 24.1 · 28% | 30.1 · 26% | 42.2 · 30% | 65.6 · 38% | 161.5 · 95% |
| Sigil caster | 71.1 · 105% | 72.7 · 86% | 108.7 · 95% | 119.5 · 86% | 161.8 · 94% | 184.8 · 108% |
| Outburst caster | 68.2 · 101% | 95.7 · 113% | 112.6 · 98% | 130 · 93% | 132.4 · 77% | 205.7 · 121% |
| Faith build | 32.1 · 47% | 29.7 · 35% | 107.1 · 94% | 117 · 84% | 119 · 69% | 156 · 91% |
| Calls leader | 9.4 · 14% | 10.5 · 12% | 11.8 · 10% | 10 · 7% | 13.4 · 8% | 18.8 · 11% |

**Normal share, on the range, the first 4 turns only** (a fight of the target length: 4 to 6 rounds). A supply that runs out later does not show here; a walk to the target (melee) weighs double. Each cell: damage a turn · percent of the plain rifle over its own first 4 turns.

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 70.3 · 100% | 83 · 100% | 117.6 · 100% | 148.8 · 100% | 178.5 · 100% | 176.1 · 100% |
| Plain blade | 55.8 · 79% | 70.2 · 85% | 88.8 · 76% | 114.8 · 77% | 141.1 · 79% | 154.3 · 88% |
| Optimised gun | 149.1 · 212% | 179.8 · 217% | 184.9 · 157% | 243.6 · 164% | 322.2 · 181% | 336.3 · 191% |
| Optimised blade | 85.6 · 122% | 94.8 · 114% | 112.5 · 96% | 144.3 · 97% | 184.1 · 103% | 185.1 · 105% |
| Tank | 24.1 · 34% | 36.6 · 44% | 48.9 · 42% | 47.7 · 32% | 68.6 · 38% | 99.1 · 56% |
| Sigil caster | 32.7 · 47% | 43.7 · 53% | 101.7 · 86% | 106 · 71% | 160.9 · 90% | 154.1 · 88% |
| Outburst caster | 46.8 · 67% | 68.1 · 82% | 89.9 · 76% | 119.4 · 80% | 149.5 · 84% | 180.9 · 103% |
| Faith build | 55.7 · 79% | 64.6 · 78% | 110 · 94% | 117.3 · 79% | 129.6 · 73% | 148 · 84% |
| Calls leader | 21.9 · 31% | 20.4 · 25% | 29.9 · 25% | 42.5 · 29% | 40.7 · 23% | 35.1 · 20% |

**What the techniques add** (normal share, on the range): the optimised builds with the same sheet and gear, making plain attacks only. Each cell: damage a turn with plain attacks only · with techniques · techniques as a percent of plain.

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Optimised gun | 140.5 · 145.4 · 103% | 181.3 · 164.6 · 91% | 203.5 · 210.5 · 103% | 255.8 · 241 · 94% | 315.5 · 297.2 · 94% | 328.3 · 323.6 · 99% |
| Optimised blade | 76.6 · 102.9 · 134% | 94.9 · 103.3 · 109% | 104 · 120.5 · 116% | 143.8 · 168.3 · 117% | 161.8 · 213.5 · 132% | 182.7 · 208.5 · 114% |

**Under fire.** The same target, shooting back with a soldier's rifle (Suppress and Burst), for 8 rounds or until the character goes down. Each cell: damage a turn · percent of the plain rifle (normal share, same level, also under fire) · rounds the character lasted, on average. A character that goes down early never finishes what it was setting up.

**normal share, under fire**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 55.6 · 100% · 4.4 | 91.9 · 100% · 6.2 | 91.2 · 100% · 7.1 | 138.1 · 100% · 7.8 | 146.2 · 100% · 7.7 | 176.8 · 100% · 8 |
| Plain blade | 61.1 · 110% · 7.2 | 79.1 · 86% · 7.9 | 105.2 · 115% · 8 | 145.5 · 105% · 8 | 165.8 · 113% · 8 | 162.4 · 92% · 8 |
| Optimised gun | 142.4 · 256% · 4.7 | 157.8 · 172% · 5.8 | 199.7 · 219% · 5.8 | 234.8 · 170% · 7.7 | 286.4 · 196% · 8 | 333.2 · 188% · 8 |
| Optimised blade | 88.7 · 160% · 7.6 | 101.9 · 111% · 8 | 120.4 · 132% · 7.8 | 129.8 · 94% · 8 | 187.9 · 129% · 8 | 204.8 · 116% · 8 |
| Tank | 34.1 · 61% · 8 | 44.2 · 48% · 8 | 52.3 · 57% · 8 | 51.2 · 37% · 8 | 65 · 44% · 8 | 89.2 · 50% · 8 |
| Sigil caster | 54.9 · 99% · 3.2 | 40 · 44% · 3.6 | 77.7 · 85% · 7.4 | 108.9 · 79% · 7.9 | 147 · 101% · 7.6 | 188.8 · 107% · 8 |
| Outburst caster | 40 · 72% · 3.2 | 64.3 · 70% · 3.1 | 76.6 · 84% · 4.4 | 126.8 · 92% · 4 | 139.6 · 95% · 5 | 166.2 · 94% · 7.4 |
| Faith build | 51.5 · 93% · 4.3 | 58.4 · 64% · 5.3 | 106.6 · 117% · 6.5 | 119 · 86% · 6.1 | 130.9 · 90% · 8 | 149.6 · 85% · 8 |
| Calls leader | 17.5 · 31% · 3.5 | 14.4 · 16% · 4.2 | 14.9 · 16% · 4.6 | 32.6 · 24% · 5.2 | 33 · 23% · 4.6 | 37.9 · 21% · 7.8 |

**all in, under fire**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 112.9 · 203% · 5.1 | 131.6 · 143% · 6.7 | 153.1 · 168% · 7.9 | 154.8 · 112% · 8 | 180.8 · 124% · 8 | 178.2 · 101% · 8 |
| Plain blade | 112.8 · 203% · 8 | 117.7 · 128% · 8 | 135.5 · 149% · 7.7 | 159.8 · 116% · 8 | 160 · 109% · 8 | 182.6 · 103% · 8 |
| Optimised gun | 203.9 · 367% · 4 | 229.8 · 250% · 6.3 | 274.4 · 301% · 7.5 | 305.6 · 221% · 8 | 304.6 · 208% · 8 | 327.3 · 185% · 8 |
| Optimised blade | 98.2 · 177% · 7.1 | 135.4 · 147% · 7.4 | 142.3 · 156% · 7.9 | 166.6 · 121% · 8 | 169.6 · 116% · 8 | 192.5 · 109% · 8 |
| Tank | 20.4 · 37% · 8 | 17.7 · 19% · 8 | 19.1 · 21% · 8 | 28.1 · 20% · 8 | 53.7 · 37% · 8 | 111.2 · 63% · 8 |
| Sigil caster | 77.5 · 139% · 5.9 | 87.4 · 95% · 5.1 | 108.3 · 119% · 5.5 | 114.7 · 83% · 4.5 | 153.3 · 105% · 7 | 137.5 · 78% · 7.3 |
| Outburst caster | 76.5 · 138% · 3.2 | 104.2 · 113% · 3.2 | 122.1 · 134% · 3.4 | 143 · 104% · 4 | 132 · 90% · 3.8 | 203.9 · 115% · 4.6 |
| Faith build | 24.2 · 44% · 3.4 | 22.5 · 24% · 3.4 | 105.2 · 115% · 4.2 | 113.5 · 82% · 5.4 | 112.8 · 77% · 5.7 | 150.2 · 85% · 7.3 |
| Calls leader | 4.6 · 8% · 2.9 | 9.5 · 10% · 3.1 | 9.8 · 11% · 2.9 | 7.4 · 5% · 3.7 | 18.3 · 13% · 3.9 | 20.7 · 12% · 8 |

**Normal share, under fire from a target with a boss's numbers** (Defense 14, armour 10, a light machine gun)

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 54.3 · 100% | 61.8 · 100% | 77.2 · 100% | 101.6 · 100% | 126 · 100% | 152.6 · 100% |
| Plain blade | 39.3 · 72% | 53.5 · 87% | 72.7 · 94% | 105.2 · 104% | 129.5 · 103% | 150.1 · 98% |
| Optimised gun | 123.8 · 228% | 137 · 222% | 177.5 · 230% | 215 · 212% | 289.2 · 230% | 288.1 · 189% |
| Optimised blade | 67.2 · 124% | 98.2 · 159% | 103 · 133% | 125.9 · 124% | 156.3 · 124% | 166.2 · 109% |
| Tank | 26 · 48% | 33.3 · 54% | 38.1 · 49% | 47.7 · 47% | 51.9 · 41% | 77.6 · 51% |
| Sigil caster | 30.7 · 57% | 42.8 · 69% | 45.6 · 59% | 82.8 · 81% | 103.7 · 82% | 183.2 · 120% |
| Outburst caster | 41.6 · 77% | 54.6 · 88% | 76.5 · 99% | 88.1 · 87% | 125.5 · 100% | 155.3 · 102% |
| Faith build | 34.5 · 64% | 43.1 · 70% | 92.7 · 120% | 106.2 · 105% | 119.7 · 95% | 129.3 · 85% |
| Calls leader | 6.6 · 12% | 14.2 · 23% | 16.9 · 22% | 19 · 19% | 29.5 · 23% | 24.8 · 16% |

### 3.2 The biggest single hit of each build, and what made it

Over every fight of this run.

| Build | Share | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|
| Plain gun | normal share | 108 (plain shot (Hellraiser service rifle), critical) | 121 (plain shot (Hellraiser service rifle), critical) | 142 (plain shot (Hellraiser service rifle), critical) | 163 (plain shot (Hellraiser service rifle), critical) | 186 (plain shot (Hellraiser service rifle), critical) | 208 (plain shot (Hellraiser service rifle), critical) |
| Plain gun | all in | 143 (plain shot (Hellraiser service rifle), critical) | 157 (plain shot (Hellraiser service rifle), critical) | 172 (plain shot (Hellraiser service rifle), critical) | 187 (plain shot (Hellraiser service rifle), critical) | 187 (plain shot (Hellraiser service rifle), critical) | 187 (plain shot (Hellraiser service rifle), critical) |
| Plain blade | normal share | 100 (plain cut (Sabre), critical) | 113 (plain cut (Sabre), critical) | 133 (plain cut (Sabre), critical) | 152 (plain cut (Sabre), critical) | 174 (plain cut (Sabre), critical) | 181 (plain cut (Sabre), critical) |
| Plain blade | all in | 133 (plain cut (Sabre), critical) | 142 (plain cut (Sabre), critical) | 155 (plain cut (Sabre), critical) | 174 (plain cut (Sabre), critical) | 174 (plain cut (Sabre), critical) | 169 (plain cut (Sabre), critical) |
| Optimised gun | normal share | 309 (Dead Centre (Long rifle), critical) | 342 (Dead Centre (Long rifle), critical) | 266 (plain shot (Long rifle), critical) | 311 (plain shot (Long rifle), critical) | 355 (plain shot (Long rifle), critical) | 409 (plain shot (Long rifle), critical) |
| Optimised gun | all in | 273 (plain shot (Long rifle), critical) | 295 (plain shot (Long rifle), critical) | 327 (plain shot (Long rifle), critical) | 369 (plain shot (Long rifle), critical) | 396 (plain shot (Long rifle), critical) | 448 (plain shot (Long rifle), critical) |
| Optimised blade | normal share | 152 (Lunge (Adamantile greatsword), critical) | 167 (Lunge (Adamantile greatsword), critical) | 193 (Lunge (Adamantile greatsword), critical) | 310 (Coup (Adamantile greatsword), critical) | 390 (Coup (Adamantile greatsword), critical) | 360 (Coup (Adamantile greatsword), critical) |
| Optimised blade | all in | 189 (plain cut (Adamantile greatsword), critical) | 203 (Lunge (Adamantile greatsword), critical) | 213 (plain cut (Adamantile greatsword), critical) | 344 (Coup (Adamantile greatsword), critical) | 397 (Coup (Adamantile greatsword), critical) | 460 (Coup (Adamantile greatsword), critical) |
| Tank | normal share | 92 (plain cut (Sabre), critical) | 104 (plain cut (Sabre), critical) | 110 (plain cut (Sabre), critical) | 110 (plain cut (Sabre), critical) | 124 (plain cut (Sabre), critical) | 153 (plain cut (Sabre), critical) |
| Tank | all in | 71 (plain cut (Sabre), critical) | 66 (plain cut (Sabre), critical) | 66 (plain cut (Sabre), critical) | 81 (plain cut (Sabre), critical) | 106 (plain cut (Sabre), critical) | 156 (plain cut (Sabre), critical) |
| Sigil caster | normal share | 123 (Evoke FIRE·SEEK, critical) | 296 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 343 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 391 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 436 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 465 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) |
| Sigil caster | all in | 348 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 378 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 408 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 442 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 451 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) | 487 (Evoke STONE·FIRE·CONDENSE·SEEK, critical) |
| Outburst caster | normal share | 154 (Release Heart Bolt (stage 4), critical) | 204 (Release Heart Bolt (stage 4), critical) | 211 (Release Heart Bolt (stage 4), critical) | 228 (Release Heart Bolt (stage 4), critical) | 386 (Release Heart Bolt (stage 4), critical) | 280 (Release Heart Bolt (stage 4), critical) |
| Outburst caster | all in | 325 (Release Heart Bolt (stage 4), critical) | 245 (Release Heart Bolt (stage 4), critical) | 342 (Release Heart Bolt (stage 4), critical) | 280 (Release Heart Bolt (stage 4), critical) | 280 (Release Heart Bolt (stage 4), critical) | 382 (Release Heart Bolt (stage 4), critical) |
| Faith build | normal share | 96 (plain shot (Hellraiser service rifle), critical) | 102 (plain shot (Hellraiser service rifle), critical) | 102 (plain shot (Hellraiser service rifle), critical) | 103 (plain shot (Hellraiser service rifle), critical) | 121 (plain shot (Hellraiser service rifle), critical) | 295 (Miracle: The Sky Answers) |
| Faith build | all in | 75 (plain shot (Hellraiser service rifle), critical) | 75 (plain shot (Hellraiser service rifle), critical) | 95 (Hymn: Lightning Rod) | 100 (Hymn: Lightning Rod) | 100 (Hymn: Lightning Rod) | 295 (Miracle: The Sky Answers) |
| Calls leader | normal share | 56 (plain shot (Service pistol (.32 Decrkm)), critical) | 56 (plain shot (Service pistol (.32 Decrkm)), critical) | 64 (plain shot (Service pistol (.32 Decrkm)), critical) | 68 (plain shot (Service pistol (.32 Decrkm)), critical) | 72 (plain shot (Service pistol (.32 Decrkm)), critical) | 72 (plain shot (Service pistol (.32 Decrkm)), critical) |
| Calls leader | all in | 44 (plain shot (Service pistol (.32 Decrkm)), critical) | 44 (plain shot (Service pistol (.32 Decrkm)), critical) | 44 (plain shot (Service pistol (.32 Decrkm)), critical) | 44 (plain shot (Service pistol (.32 Decrkm)), critical) | 47 (plain shot (Service pistol (.32 Decrkm)), critical) | 50 (plain shot (Service pistol (.32 Decrkm)), critical) |

### 3.3 The peak: each build's dearest move, with its whole price

Played to set the move up and use it (a target with a boss's numbers and 5,000 HP that shoots back; 8 rounds or until the character goes down). Each row is **the biggest single action that happened** in those fights (a lucky critical counts), not an average. "Damage" is everything that one use dealt; "one hit" its biggest single hit; the price is everything spent from the first action of the move to the last.

| Build | Share | Level | The biggest action seen | Damage | One hit | Price | On turn | Damage a turn, whole fight |
|---|---|---|---|---|---|---|---|---|
| Optimised gun | normal share | 1 | Aimed Shot (Long rifle), critical | 196 | 196 | 3 AP, +1 Heat, 1 rounds, 1 turn | 6 | 152.2 |
| Optimised gun | normal share | 3 | Aimed Shot (Long rifle), critical | 221 | 221 | 3 AP, 1 rounds, 1 turn | 4 | 141.6 |
| Optimised gun | normal share | 6 | Aimed Shot (Long rifle), critical | 261 | 261 | 3 AP, 1 rounds, 1 turn | 1 | 212.5 |
| Optimised gun | normal share | 9 | Aimed Shot (Long rifle), critical | 301 | 301 | 3 AP, 1 rounds, 1 turn | 2 | 225.4 |
| Optimised gun | normal share | 12 | Aimed Shot (Long rifle), critical | 345 | 345 | 3 AP, 1 rounds, 1 turn | 4 | 240.8 |
| Optimised gun | normal share | 20 | Aimed Shot (Long rifle), critical | 399 | 399 | 3 AP, 1 rounds, 1 turn | 1 | 276.2 |
| Optimised gun | all in | 1 | Aimed Shot (Long rifle), critical | 263 | 263 | 3 AP, +1 Heat, 1 rounds, 1 turn | 5 | 164.2 |
| Optimised gun | all in | 3 | Aimed Shot (Long rifle), critical | 290 | 290 | 3 AP, 1 rounds, 1 turn | 1 | 216.2 |
| Optimised gun | all in | 6 | Aimed Shot (Long rifle), critical | 317 | 317 | 3 AP, 1 rounds, 1 turn | 3 | 257.2 |
| Optimised gun | all in | 9 | Aimed Shot (Long rifle), critical | 359 | 359 | 3 AP, 1 rounds, 1 turn | 6 | 289.3 |
| Optimised gun | all in | 12 | Aimed Shot (Long rifle), critical | 386 | 386 | 3 AP, 1 rounds, 1 turn | 3 | 281.3 |
| Optimised gun | all in | 20 | Aimed Shot (Long rifle), critical | 438 | 438 | 3 AP, 1 rounds, 1 turn | 5 | 296.5 |
| Optimised blade | normal share | 1 | plain cut (Adamantile greatsword), critical | 142 | 142 | 3 AP, +1 Momentum, 1 turn | 3 | 60.4 |
| Optimised blade | normal share | 3 | plain cut (Adamantile greatsword), critical | 157 | 157 | 3 AP, +1 Momentum, 1 turn | 3 | 82.7 |
| Optimised blade | normal share | 6 | plain cut (Adamantile greatsword), critical | 183 | 183 | 3 AP, +1 Momentum, 1 turn | 8 | 93.2 |
| Optimised blade | normal share | 9 | plain cut (Adamantile greatsword), critical | 203 | 203 | 3 AP, +1 Momentum, 1 turn | 4 | 124.1 |
| Optimised blade | normal share | 12 | Coup (Adamantile greatsword), critical | 390 | 390 | 3 AP, 3 Momentum, 1 turn | 7 | 139.2 |
| Optimised blade | normal share | 20 | Coup (Adamantile greatsword) | 239 | 239 | 3 AP, 5 Momentum, 1 turn | 5 | 171.9 |
| Optimised blade | all in | 1 | plain cut (Adamantile greatsword) | 80 | 80 | 3 AP, +1 Momentum, 1 turn | 3 | 82.2 |
| Optimised blade | all in | 3 | plain cut (Adamantile greatsword), critical | 193 | 193 | 3 AP, +1 Momentum, 1 turn | 6 | 109.8 |
| Optimised blade | all in | 6 | plain cut (Adamantile greatsword), critical | 208 | 208 | 3 AP, +1 Momentum, 1 turn | 8 | 113.2 |
| Optimised blade | all in | 9 | plain cut (Adamantile greatsword), critical | 222 | 222 | 3 AP, +1 Momentum, 1 turn | 3 | 130.5 |
| Optimised blade | all in | 12 | Coup (Adamantile greatsword), critical | 397 | 397 | 3 AP, 3 Momentum, 1 turn | 8 | 156.1 |
| Optimised blade | all in | 20 | Coup (Adamantile greatsword), critical | 397 | 397 | 3 AP, 3 Momentum, 1 turn | 6 | 177.5 |
| Tank | normal share | 1 | plain cut (Sabre), critical | 82 | 82 | 2 AP, +1 Momentum, 1 turn | 7 | 21.9 |
| Tank | normal share | 3 | plain cut (Sabre), critical | 94 | 94 | 2 AP, +1 Momentum, 1 turn | 7 | 36.6 |
| Tank | normal share | 6 | plain cut (Sabre), critical | 100 | 100 | 2 AP, +1 Momentum, 1 turn | 6 | 47 |
| Tank | normal share | 9 | plain cut (Sabre), critical | 100 | 100 | 2 AP, +1 Momentum, 1 turn | 3 | 37.3 |
| Tank | normal share | 12 | plain cut (Sabre), critical | 114 | 114 | 2 AP, +1 Momentum, 1 turn | 7 | 44.7 |
| Tank | normal share | 20 | plain cut (Sabre), critical | 143 | 143 | 2 AP, +1 Momentum, 1 turn | 4 | 78.2 |
| Tank | all in | 1 | plain cut (Sabre), critical | 61 | 61 | 2 AP, +1 Momentum, 1 turn | 7 | 15.1 |
| Tank | all in | 3 | plain cut (Sabre), critical | 61 | 61 | 2 AP, +1 Momentum, 1 turn | 8 | 14.3 |
| Tank | all in | 6 | plain cut (Sabre), critical | 61 | 61 | 2 AP, +1 Momentum, 1 turn | 8 | 10.1 |
| Tank | all in | 9 | plain cut (Sabre), critical | 71 | 71 | 2 AP, +1 Momentum, 1 turn | 5 | 26.2 |
| Tank | all in | 12 | plain cut (Sabre), critical | 96 | 96 | 2 AP, +1 Momentum, 1 turn | 5 | 41.7 |
| Tank | all in | 20 | plain cut (Sabre), critical | 151 | 151 | 2 AP, +1 Momentum, 1 turn | 1 | 84.5 |
| Sigil caster | normal share | 1 | Evoke FIRE·SEEK, critical | 118 | 118 | 2.4 AP, +2 Flux, 5 core charge, 1 turn | 2 | 29.6 |
| Sigil caster | normal share | 3 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 288 | 288 | 7.8 AP, 2 Flux, +2 core charge, 1 cores, 2 turns | 3 | 64 |
| Sigil caster | normal share | 6 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 335 | 335 | 4.8 AP, +4 Flux, 7 core charge, 1 turn | 1 | 61 |
| Sigil caster | normal share | 9 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 383 | 383 | 5.8 AP, +4 Flux, +2 core charge, 1 cores, 2 turns | 4 | 74.4 |
| Sigil caster | normal share | 12 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 428 | 428 | 4.8 AP, 6 core charge, +3 Flux, 1 turn | 8 | 140 |
| Sigil caster | normal share | 20 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 457 | 457 | 5 AP, 3 Flux, +3 core charge, 1 cores, 2 turns | 3 | 150.2 |
| Sigil caster | all in | 1 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 340 | 340 | 6.2 AP, +4 Flux, 9 core charge, 2 turns | 2 | 54 |
| Sigil caster | all in | 3 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 370 | 370 | 6.2 AP, +4 Flux, 7 core charge, 2 turns | 2 | 67.4 |
| Sigil caster | all in | 6 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 400 | 400 | 8.2 AP, 3 Flux, +3 core charge, 1 cores, 3 turns | 4 | 78.8 |
| Sigil caster | all in | 9 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 434 | 434 | 6.8 AP, 3 Flux, +4 core charge, 1 cores, 3 turns | 7 | 105.4 |
| Sigil caster | all in | 12 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 443 | 443 | 6 AP, +4 Flux, 6 core charge, 2 turns | 4 | 125.2 |
| Sigil caster | all in | 20 | Evoke STONE·FIRE·CONDENSE·SEEK, critical | 479 | 479 | 5 AP, +4 Flux, 6 core charge, 1 turn | 1 | 142 |
| Outburst caster | normal share | 1 | Release Heart Bolt (stage 4), critical | 154 | 154 | 5 AP, 21 MP, +4 Strain, 2 turns | 2 | 35.6 |
| Outburst caster | normal share | 3 | Release Heart Bolt (stage 4), critical | 204 | 204 | 6 AP, 32 MP, +1 Strain, 1 turn | 4 | 61.7 |
| Outburst caster | normal share | 6 | Release Heart Bolt (stage 4) | 202 | 202 | 5 AP, 32 MP, +1 Strain, 1 turn | 4 | 47.7 |
| Outburst caster | normal share | 9 | Release Heart Bolt (stage 4) | 218 | 218 | 5 AP, 32 MP, +1 Strain, 1 turn | 6 | 72.9 |
| Outburst caster | normal share | 12 | Release Heart Bolt (stage 4), critical | 386 | 386 | 5 AP, 32 MP, +1 Strain, 1 turn | 7 | 137 |
| Outburst caster | normal share | 20 | Release Heart Bolt (stage 4) | 267 | 267 | 5 AP, 28 MP, +1 Strain, 1 turn | 7 | 120.5 |
| Outburst caster | all in | 1 | Release Heart Bolt (stage 4), critical | 325 | 325 | 6 AP, 23 MP, +1 Strain, 2 turns | 3 | 83.8 |
| Outburst caster | all in | 3 | Release Heart Bolt (stage 4) | 234 | 234 | 6 AP, 34 MP, +1 Strain, 1 turn | 4 | 118.4 |
| Outburst caster | all in | 6 | Release Heart Bolt (stage 4), critical | 342 | 342 | 5 AP, 34 MP, +1 Strain, 2 turns | 3 | 133.7 |
| Outburst caster | all in | 9 | Release Heart Bolt (stage 4) | 267 | 267 | 6 AP, 32 MP, +1 Strain, 1 turn | 4 | 154.8 |
| Outburst caster | all in | 12 | Release Heart Bolt (stage 4) | 267 | 267 | 6 AP, 28 MP, +1 Strain, 1 turn | 4 | 130.2 |
| Outburst caster | all in | 20 | Release Heart Bolt (stage 4), critical | 382 | 382 | 4 AP, 21 MP, +1 Strain, 1 turn | 6 | 134.2 |
| Faith build | normal share | 1 | plain shot (Hellraiser service rifle), critical | 86 | 86 | 2 AP, +1 Heat, 1 rounds, 1 turn | 2 | 42 |
| Faith build | normal share | 3 | plain shot (Hellraiser service rifle), critical | 92 | 92 | 2 AP, +1 Heat, 1 rounds, 1 turn | 1 | 47.4 |
| Faith build | normal share | 6 | plain shot (Hellraiser service rifle), critical | 92 | 92 | 2 AP, +1 Heat, 1 rounds, 1 turn | 3 | 99.8 |
| Faith build | normal share | 9 | plain shot (Hellraiser service rifle), critical | 98 | 98 | 2 AP, +1 Heat, 1 rounds, 1 turn | 5 | 105.8 |
| Faith build | normal share | 12 | plain shot (Hellraiser service rifle), critical | 111 | 111 | 2 AP, +1 Heat, 1 rounds, 1 turn | 2 | 120.3 |
| Faith build | normal share | 20 | Miracle: The Sky Answers | 295 | 295 | 3 AP, 1 turn | 1 | 162.5 |
| Faith build | all in | 1 | plain shot (Hellraiser service rifle), critical | 65 | 65 | 2 AP, +1 Heat, 1 rounds, 1 turn | 4 | 16.7 |
| Faith build | all in | 3 | plain shot (Hellraiser service rifle), critical | 65 | 65 | 2 AP, +1 Heat, 1 rounds, 1 turn | 7 | 17.8 |
| Faith build | all in | 6 | Hymn: Lightning Rod | 90 | 90 | 3 AP, 1 turn | 1 | 103.9 |
| Faith build | all in | 9 | Hymn: Lightning Rod | 95 | 95 | 3 AP, 1 turn | 1 | 103.4 |
| Faith build | all in | 12 | Hymn: Lightning Rod | 95 | 95 | 3 AP, 1 turn | 1 | 111.8 |
| Faith build | all in | 20 | Miracle: The Sky Answers | 295 | 295 | 3 AP, 1 turn | 1 | 174.5 |

How often the dearest move was really made in these fights: the optimised gun used Dead Centre 0 times in 120 fights (it needs a Pressed target; one shooter with no Suppress ready gives 1 Pressure a turn, and Pressed is 2, so alone it fires Aimed Shots: its peak is on the card in 3.4, and in a squad). The optimised blade used a Finisher 44 times in 120 fights; the Faith build called its Miracle 20 times in 120.

### 3.4 The weapon builds' dearest technique on its card, with its price fully met

The engine's own card for each technique, against a boss (Defense 14, armour 10), staged so the price is met: Momentum full, the target Pressed as far as Pressure goes, 6 AP. This is what the move does when everything it asks for is there; the fights above show how often that happens. Each cell: the technique · chance to hit · damage on a hit · on a critical · its price.

| Build | Share | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|---|
| Optimised gun | normal share | Dead Centre · 70% · 113 · 299 · 3 AP, 1 round, a Pressed target | Dead Centre · 75% · 126 · 337 · 3 AP, 1 round, a Pressed target | Dead Centre · 80% · 146 · 397 · 3 AP, 1 round, a Pressed target | Dead Centre · 90% · 163 · 457 · 3 AP, 1 round, a Pressed target | Dead Centre · 95% · 183 · 523 · 3 AP, 1 round, a Pressed target | Dead Centre · 95% · 188 · 603 · 3 AP, 1 round, a Pressed target |
| Optimised gun | all in | Dead Centre · 85% · 150 · 400 · 3 AP, 1 round, a Pressed target | Dead Centre · 90% · 163 · 440 · 3 AP, 1 round, a Pressed target | Dead Centre · 95% · 175 · 481 · 3 AP, 1 round, a Pressed target | Dead Centre · 95% · 188 · 544 · 3 AP, 1 round, a Pressed target | Dead Centre · 95% · 188 · 584 · 3 AP, 1 round, a Pressed target | Dead Centre · 95% · 188 · 663 · 3 AP, 1 round, a Pressed target |
| Optimised blade | normal share | Cut · 60% · 59 · 142 · 3 AP | Cut · 65% · 66 · 157 · 3 AP | Cut · 70% · 77 · 183 · 3 AP | Coup · 80% · 208 · 470 · 3 AP, 5 Momentum (of 5) | Coup · 85% · 223 · 504 · 3 AP, 5 Momentum (of 5) | Coup · 90% · 239 · 538 · 3 AP, 5 Momentum (of 5) |
| Optimised blade | all in | Cut · 75% · 80 · 179 · 3 AP | Cut · 80% · 87 · 193 · 3 AP | Cut · 85% · 93 · 208 · 3 AP | Coup · 90% · 239 · 513 · 3 AP, 5 Momentum (of 5) | Coup · 90% · 239 · 513 · 3 AP, 5 Momentum (of 5) | Coup · 90% · 239 · 513 · 3 AP, 5 Momentum (of 5) |
| Tank | normal share | Cut · 50% · 30 · 82 · 2 AP | Cut · 55% · 34 · 94 · 2 AP | Cut · 60% · 36 · 100 · 2 AP | Cut · 60% · 36 · 100 · 2 AP | Cut · 65% · 40 · 114 · 2 AP | Cut · 75% · 50 · 143 · 2 AP |
| Tank | all in | Cut · 35% · 23 · 61 · 2 AP | Cut · 35% · 23 · 61 · 2 AP | Cut · 35% · 23 · 61 · 2 AP | Cut · 50% · 26 · 71 · 2 AP | Cut · 60% · 36 · 96 · 2 AP | Cut · 80% · 54 · 151 · 2 AP |
| Plain gun | normal share | Burst (3 rolls) · 50% · 105 · 294 · 3 AP, 3 rounds | Burst (3 rolls) · 55% · 117 · 333 · 2 AP, 3 rounds | Burst (3 rolls) · 60% · 141 · 396 · 2 AP, 3 rounds | Burst (3 rolls) · 70% · 159 · 459 · 2 AP, 3 rounds | Burst (3 rolls) · 75% · 180 · 528 · 2 AP, 3 rounds | Burst (3 rolls) · 80% · 186 · 594 · 2 AP, 3 rounds |
| Plain gun | all in | Burst (3 rolls) · 65% · 144 · 399 · 3 AP, 3 rounds | Burst (3 rolls) · 70% · 159 · 441 · 2 AP, 3 rounds | Burst (3 rolls) · 75% · 171 · 486 · 2 AP, 3 rounds | Burst (3 rolls) · 80% · 186 · 531 · 2 AP, 3 rounds | Burst (3 rolls) · 80% · 186 · 531 · 2 AP, 3 rounds | Burst (3 rolls) · 80% · 186 · 531 · 2 AP, 3 rounds |
| Plain blade | normal share | Cut · 50% · 32 · 90 · 2 AP | Cut · 55% · 36 · 103 · 2 AP | Cut · 60% · 43 · 123 · 2 AP | Cut · 70% · 48 · 142 · 2 AP | Cut · 75% · 55 · 164 · 2 AP | Cut · 80% · 57 · 171 · 2 AP |
| Plain blade | all in | Cut · 65% · 44 · 123 · 2 AP | Cut · 70% · 48 · 137 · 2 AP | Cut · 75% · 53 · 150 · 2 AP | Cut · 80% · 57 · 164 · 2 AP | Cut · 80% · 57 · 164 · 2 AP | Cut · 80% · 57 · 164 · 2 AP |

## 4. Angle C: time to kill, both ways

### 4.1 Rounds to win, one character against one enemy (open ground, normal share)

Each cell: rounds to win · percent of fights won. A fight stops at 12 rounds.

**Minion**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 1.1 · 100% | 1.1 · 100% | 1.1 · 100% | 1.1 · 100% | 1 · 100% | 1 · 100% |
| Plain blade | 2 · 100% | 1.3 · 100% | 1.3 · 100% | 1.1 · 100% | 1 · 100% | 1 · 100% |
| Optimised gun | 1.1 · 100% | 1.1 · 100% | 1.1 · 100% | 1 · 100% | 1 · 100% | 1 · 100% |
| Optimised blade | 2.2 · 100% | 2 · 100% | 2.1 · 100% | 2 · 100% | 2 · 100% | 2 · 100% |
| Tank | 3.1 · 100% | 2.5 · 100% | 2.2 · 100% | 2.3 · 100% | 2.1 · 100% | 2 · 100% |
| Sigil caster | 1.4 · 95% | 2.4 · 95% | 1.1 · 100% | 1.3 · 100% | 1.1 · 100% | 1 · 100% |
| Outburst caster | 1.4 · 100% | 1.2 · 100% | 1.2 · 100% | 1.1 · 100% | 1 · 100% | 1 · 100% |
| Faith build | 1.1 · 100% | 1.1 · 100% | 1 · 100% | 1 · 100% | 1 · 100% | 1 · 100% |
| Calls leader | 2.7 · 100% | 2 · 100% | 1.5 · 100% | 1.7 · 100% | 1.1 · 100% | 1.1 · 100% |

**Soldier**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 1.6 · 100% | 1.4 · 100% | 1.3 · 100% | 1.3 · 100% | 1 · 100% | 1 · 100% |
| Plain blade | 2.6 · 100% | 2.4 · 100% | 2.1 · 100% | 2 · 100% | 1 · 100% | 1 · 100% |
| Optimised gun | 1.2 · 100% | 1 · 100% | 1.1 · 100% | 1 · 100% | 1 · 100% | 1 · 100% |
| Optimised blade | 2.1 · 100% | 2.1 · 100% | 2 · 100% | 2 · 100% | 2 · 100% | 2 · 100% |
| Tank | 3.8 · 100% | 3.7 · 100% | 3.3 · 100% | 3.2 · 100% | 2.3 · 100% | 2.4 · 100% |
| Sigil caster | 1.1 · 90% | 2.3 · 60% | 1.7 · 100% | 1.4 · 95% | 1.4 · 100% | 1.1 · 100% |
| Outburst caster | 2.5 · 60% | 1.4 · 95% | 1.3 · 100% | 1.3 · 100% | 1 · 100% | 1 · 100% |
| Faith build | 1.8 · 90% | 1.8 · 85% | 1 · 100% | 1 · 100% | 1 · 100% | 1 · 100% |
| Calls leader | 2.9 · 35% | 2.6 · 45% | 2 · 70% | 2.4 · 75% | 2.3 · 90% | 3 · 100% |

**Elite**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 2.3 · 100% | 1.7 · 100% | 1.8 · 100% | 1.4 · 100% | 1 · 100% | 1.2 · 100% |
| Plain blade | 3.3 · 100% | 2.6 · 100% | 2.3 · 100% | 2.2 · 100% | 1.3 · 100% | 1.5 · 100% |
| Optimised gun | 1.3 · 100% | 1.2 · 100% | 1.2 · 100% | 1 · 100% | 1 · 100% | 1 · 100% |
| Optimised blade | 2.5 · 100% | 2.8 · 100% | 2.2 · 100% | 2 · 100% | 2.1 · 100% | 2 · 100% |
| Tank | 5.6 · 95% | 4.7 · 100% | 3.6 · 100% | 3.9 · 100% | 3.4 · 100% | 2.3 · 100% |
| Sigil caster | 3 · 50% | 2.3 · 90% | 2.1 · 100% | 1.9 · 100% | 1.6 · 100% | 1.5 · 100% |
| Outburst caster | 2.7 · 55% | 2.9 · 80% | 2.4 · 95% | 1.8 · 100% | 1.2 · 100% | 1.1 · 100% |
| Faith build | 3.8 · 100% | 3 · 100% | 1.5 · 100% | 1.2 · 100% | 1.6 · 100% | 1.3 · 100% |
| Calls leader | 3.4 · 35% | 5.1 · 35% | 4.6 · 70% | 4.1 · 80% | 4.2 · 85% | 3.5 · 100% |

**Boss**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 4.1 · 100% | 3.8 · 95% | 2.8 · 100% | 2.3 · 100% | 2.2 · 100% | 1.9 · 100% |
| Plain blade | 5.1 · 95% | 4.4 · 100% | 3.1 · 100% | 3.4 · 100% | 2.3 · 100% | 2.2 · 100% |
| Optimised gun | 2.1 · 100% | 1.6 · 100% | 1.9 · 100% | 1.3 · 100% | 1.1 · 100% | 1.2 · 100% |
| Optimised blade | 3.9 · 100% | 4.2 · 100% | 3.3 · 100% | 3.3 · 100% | 3.1 · 100% | 2.2 · 100% |
| Tank | 7.4 · 90% | 6.9 · 95% | 6 · 100% | 6.2 · 100% | 5.3 · 100% | 3.9 · 100% |
| Sigil caster | 4.3 · 15% | 3.7 · 30% | 3.9 · 100% | 4.2 · 100% | 1.5 · 100% | 1.6 · 100% |
| Outburst caster | 4.3 · 15% | 3.3 · 60% | 3.4 · 70% | 3.1 · 90% | 2.3 · 100% | 2.1 · 100% |
| Faith build | 5.8 · 60% | 5.1 · 85% | 2.7 · 100% | 2.2 · 100% | 2.2 · 100% | 2 · 100% |
| Calls leader | – · 0% | – · 0% | 7.5 · 10% | 7.2 · 25% | 5.7 · 35% | 7.9 · 100% |

### 4.2 Attacks that land to kill one enemy (the engine's own numbers for a plain attack at 4 tiles)

Target: minion 2, soldier 3 to 4, elite 6 to 8, boss about 20.

| Build | Share | Level | Minion: damage a hit · hits to kill | Soldier: damage a hit · hits to kill | Elite: damage a hit · hits to kill | Boss: damage a hit · hits to kill |
|---|---|---|---|---|---|---|
| Plain gun | normal share | 1 | 45 · 1 | 40 · 2 | 35 · 3 | 35 · 6 |
| Plain gun | normal share | 3 | 49 · 1 | 44 · 2 | 39 · 3 | 39 · 6 |
| Plain gun | normal share | 6 | 57 · 1 | 52 · 2 | 47 · 3 | 47 · 5 |
| Plain gun | normal share | 9 | 63 · 1 | 58 · 2 | 53 · 2 | 53 · 4 |
| Plain gun | normal share | 12 | 70 · 1 | 65 · 1 | 60 · 2 | 60 · 4 |
| Plain gun | normal share | 20 | 72 · 1 | 67 · 1 | 62 · 2 | 62 · 4 |
| Plain gun | all in | 1 | 58 · 1 | 53 · 2 | 48 · 3 | 48 · 5 |
| Plain gun | all in | 3 | 63 · 1 | 58 · 2 | 53 · 2 | 53 · 4 |
| Plain gun | all in | 6 | 67 · 1 | 62 · 1 | 57 · 2 | 57 · 4 |
| Plain gun | all in | 9 | 72 · 1 | 67 · 1 | 62 · 2 | 62 · 4 |
| Plain gun | all in | 12 | 72 · 1 | 67 · 1 | 62 · 2 | 62 · 4 |
| Plain gun | all in | 20 | 72 · 1 | 67 · 1 | 62 · 2 | 62 · 4 |
| Plain blade | normal share | 1 | 42 · 1 | 37 · 2 | 32 · 4 | 32 · 7 |
| Plain blade | normal share | 3 | 46 · 1 | 41 · 2 | 36 · 3 | 36 · 6 |
| Plain blade | normal share | 6 | 53 · 1 | 48 · 2 | 43 · 3 | 43 · 5 |
| Plain blade | normal share | 9 | 58 · 1 | 53 · 2 | 48 · 3 | 48 · 5 |
| Plain blade | normal share | 12 | 65 · 1 | 60 · 1 | 55 · 2 | 55 · 4 |
| Plain blade | normal share | 20 | 67 · 1 | 62 · 1 | 57 · 2 | 57 · 4 |
| Plain blade | all in | 1 | 54 · 1 | 49 · 2 | 44 · 3 | 44 · 5 |
| Plain blade | all in | 3 | 58 · 1 | 53 · 2 | 48 · 3 | 48 · 5 |
| Plain blade | all in | 6 | 63 · 1 | 58 · 2 | 53 · 2 | 53 · 4 |
| Plain blade | all in | 9 | 67 · 1 | 62 · 1 | 57 · 2 | 57 · 4 |
| Plain blade | all in | 12 | 67 · 1 | 62 · 1 | 57 · 2 | 57 · 4 |
| Plain blade | all in | 20 | 67 · 1 | 62 · 1 | 57 · 2 | 57 · 4 |
| Optimised gun | normal share | 1 | 82 · 1 | 77 · 1 | 72 · 2 | 72 · 3 |
| Optimised gun | normal share | 3 | 90 · 1 | 85 · 1 | 80 · 2 | 80 · 3 |
| Optimised gun | normal share | 6 | 104 · 1 | 99 · 1 | 94 · 2 | 94 · 3 |
| Optimised gun | normal share | 9 | 115 · 1 | 110 · 1 | 105 · 1 | 105 · 2 |
| Optimised gun | normal share | 12 | 129 · 1 | 124 · 1 | 119 · 1 | 119 · 2 |
| Optimised gun | normal share | 20 | 132 · 1 | 127 · 1 | 122 · 1 | 122 · 2 |
| Optimised gun | all in | 1 | 107 · 1 | 102 · 1 | 97 · 2 | 97 · 3 |
| Optimised gun | all in | 3 | 115 · 1 | 110 · 1 | 105 · 1 | 105 · 2 |
| Optimised gun | all in | 6 | 123 · 1 | 118 · 1 | 113 · 1 | 113 · 2 |
| Optimised gun | all in | 9 | 132 · 1 | 127 · 1 | 122 · 1 | 122 · 2 |
| Optimised gun | all in | 12 | 132 · 1 | 127 · 1 | 122 · 1 | 122 · 2 |
| Optimised gun | all in | 20 | 132 · 1 | 127 · 1 | 122 · 1 | 122 · 2 |
| Optimised blade | normal share | 1 | 69 · 1 | 64 · 1 | 59 · 2 | 59 · 4 |
| Optimised blade | normal share | 3 | 76 · 1 | 71 · 1 | 66 · 2 | 66 · 4 |
| Optimised blade | normal share | 6 | 87 · 1 | 82 · 1 | 77 · 2 | 77 · 3 |
| Optimised blade | normal share | 9 | 97 · 1 | 92 · 1 | 87 · 2 | 87 · 3 |
| Optimised blade | normal share | 12 | 103 · 1 | 98 · 1 | 93 · 2 | 93 · 3 |
| Optimised blade | normal share | 20 | 110 · 1 | 105 · 1 | 100 · 1 | 100 · 2 |
| Optimised blade | all in | 1 | 90 · 1 | 85 · 1 | 80 · 2 | 80 · 3 |
| Optimised blade | all in | 3 | 97 · 1 | 92 · 1 | 87 · 2 | 87 · 3 |
| Optimised blade | all in | 6 | 103 · 1 | 98 · 1 | 93 · 2 | 93 · 3 |
| Optimised blade | all in | 9 | 110 · 1 | 105 · 1 | 100 · 1 | 100 · 2 |
| Optimised blade | all in | 12 | 110 · 1 | 105 · 1 | 100 · 1 | 100 · 2 |
| Optimised blade | all in | 20 | 110 · 1 | 105 · 1 | 100 · 1 | 100 · 2 |

### 4.3 Damage taken, and how long a character lasts against one enemy (normal share)

Each cell: damage taken per enemy turn · enemy turns to take the character from full HP to 0. Target: 3 turns of focus (a tank longer).

**Minion**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 5.1 · 28.6 | 4.4 · 36.7 | 7.8 · 24.5 | 8 · 29.1 | 31 · 9.3 | not hit |
| Plain blade | 7.7 · 18.9 | 9.1 · 17.8 | 13.4 · 14.2 | 9.2 · 25.3 | 7.5 · 38.4 | 7 · 71.1 |
| Optimised gun | 7.5 · 17.2 | 7.5 · 19.3 | 7.8 · 22.3 | 4.8 · 42.1 | 5.1 · 44.5 | 3.7 · 106.9 |
| Optimised blade | 10.4 · 13.9 | 9.6 · 16.5 | 8.8 · 21.6 | 7.7 · 30.2 | 9.2 · 29 | 4.8 · 93.7 |
| Tank | 6.9 · 21.1 | 3.3 · 51.4 | 1.9 · 123.5 | 1.7 · 178.6 | 3.2 · 121.8 | 1.4 · 466.7 |
| Sigil caster | 22.3 · 5.8 | 26.9 · 5.4 | 15.4 · 11.4 | 17.7 · 11.4 | 4.3 · 58.3 | 21.2 · 18.5 |
| Outburst caster | 20.3 · 6.4 | 17.9 · 8 | 21.9 · 8 | 27.7 · 7.3 | 16.9 · 14.9 | 10.4 · 32.5 |
| Faith build | 9 · 14.4 | 11 · 13.1 | 6.5 · 26.7 | 12.3 · 16.5 | 7.9 · 31.8 | 7 · 48.4 |
| Calls leader | 12.6 · 10.3 | 14.4 · 10.8 | 13.5 · 12.6 | 14.6 · 12.7 | 8.7 · 22.9 | 13.1 · 29.9 |

**Soldier**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 36.7 · 3.9 | 23.3 · 7 | 27.3 · 7 | 29.4 · 7.9 | 31 · 9.3 | not hit |
| Plain blade | 21.5 · 6.7 | 25.1 · 6.5 | 27.4 · 6.9 | 22.7 · 10.3 | 15.8 · 18.3 | 10.3 · 48.2 |
| Optimised gun | 30.2 · 4.3 | 36.2 · 4 | 29.8 · 5.9 | 25.5 · 7.9 | 24 · 9.5 | 11.5 · 34.1 |
| Optimised blade | 24.3 · 6 | 27.6 · 5.8 | 22.2 · 8.6 | 17.5 · 13.3 | 19 · 14 | 18 · 24.7 |
| Tank | 12.6 · 11.5 | 7.7 · 21.8 | 6.1 · 39.4 | 7 · 44.2 | 11.9 · 33.1 | 1.9 · 355.2 |
| Sigil caster | 49 · 2.7 | 57.6 · 2.5 | 17.5 · 10 | 38.6 · 5.2 | 28.4 · 8.8 | 21.8 · 18 |
| Outburst caster | 42.9 · 3 | 52.8 · 2.7 | 40.5 · 4.3 | 54.3 · 3.7 | 46.1 · 5.4 | 12.4 · 27.3 |
| Faith build | 38.4 · 3.4 | 32.6 · 4.4 | 34.1 · 5.1 | 20.3 · 10 | 11 · 22.8 | 14.5 · 23.3 |
| Calls leader | 39 · 3.3 | 51.1 · 3 | 48.1 · 3.5 | 45.9 · 4 | 48.4 · 4.1 | 45.1 · 8.7 |

**Elite**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 17.8 · 8.1 | 24 · 6.8 | 12 · 15.8 | 26.5 · 8.8 | 20 · 14.4 | 16.2 · 27.5 |
| Plain blade | 14.4 · 10.1 | 20.5 · 7.9 | 18.2 · 10.5 | 19.4 · 12 | 13.7 · 21.1 | 14 · 35.6 |
| Optimised gun | 14.2 · 9.2 | 15.9 · 9.1 | 12.6 · 13.9 | 17.6 · 11.5 | 15.4 · 14.9 | 4.4 · 89.1 |
| Optimised blade | 22.8 · 6.4 | 16.3 · 9.7 | 18.2 · 10.4 | 13.8 · 16.9 | 18.6 · 14.3 | 10.9 · 40.8 |
| Tank | 11.1 · 13 | 6.5 · 25.7 | 5.4 · 44.1 | 4.7 · 65.5 | 6.4 · 61.4 | 3.5 · 191.2 |
| Sigil caster | 37.3 · 3.5 | 38.9 · 3.7 | 17.2 · 10.2 | 18 · 11.2 | 18.8 · 13.4 | 18.9 · 20.7 |
| Outburst caster | 34.2 · 3.8 | 29.8 · 4.8 | 31.4 · 5.6 | 24.2 · 8.3 | 23.8 · 10.6 | 15.3 · 22.2 |
| Faith build | 18.6 · 7 | 22.6 · 6.4 | 18.1 · 9.6 | 22.3 · 9.1 | 15.7 · 16 | 6.8 · 49.7 |
| Calls leader | 26 · 5 | 23.4 · 6.6 | 25.2 · 6.7 | 23 · 8 | 25.2 · 7.9 | 23.2 · 16.9 |

**Boss**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 18.5 · 7.9 | 24.1 · 6.8 | 17.7 · 10.7 | 20.1 · 11.6 | 12.8 · 22.5 | 8.5 · 52.2 |
| Plain blade | 16.2 · 8.9 | 18 · 9.1 | 15.5 · 12.2 | 12 · 19.4 | 10 · 28.9 | 6.8 · 73.6 |
| Optimised gun | 20.3 · 6.4 | 20.5 · 7 | 15.8 · 11 | 17.3 · 11.7 | 17.7 · 13 | 3.6 · 107.8 |
| Optimised blade | 14.7 · 9.9 | 13.5 · 11.8 | 13.4 · 14.2 | 12.5 · 18.6 | 9.4 · 28.4 | 6.7 · 66.4 |
| Tank | 10.5 · 13.9 | 7.6 · 22 | 6.5 · 36.9 | 5.4 · 57.2 | 5.7 · 69.1 | 3.8 · 176.7 |
| Sigil caster | 33.1 · 3.9 | 36.2 · 4 | 8.4 · 20.9 | 10.2 · 19.8 | 17.2 · 14.6 | 11.4 · 34.4 |
| Outburst caster | 29.3 · 4.4 | 31.5 · 4.6 | 32.3 · 5.4 | 37.4 · 5.4 | 36.8 · 6.8 | 29.8 · 11.4 |
| Faith build | 20.2 · 6.4 | 19.9 · 7.3 | 22 · 7.9 | 19 · 10.6 | 16.2 · 15.5 | 12.5 · 27.2 |
| Calls leader | 28.1 · 4.6 | 25.4 · 6.1 | 28.2 · 6 | 26.3 · 7 | 26.7 · 7.5 | 23.7 · 16.6 |

### 4.4 Focus: every enemy on one character (normal share)

Each cell: percent of fights in which the character went down · the round it went down, on average · percent won.

**4 minions**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Plain blade | 10% · 3 · 90% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Optimised gun | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Optimised blade | 30% · 4.3 · 70% | 0% · – · 100% | 10% · 5 · 90% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Tank | 20% · 5.5 · 80% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Sigil caster | 100% · 2.1 · 0% | 100% · 2.5 · 0% | 90% · 4 · 10% | 80% · 4.6 · 20% | 20% · 7 · 80% | 0% · – · 100% |
| Outburst caster | 100% · 2.5 · 0% | 80% · 2.6 · 20% | 40% · 3 · 60% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Faith build | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Calls leader | 90% · 2.9 · 10% | 90% · 3.8 · 10% | 60% · 4.2 · 40% | 80% · 4.6 · 20% | 10% · 5 · 90% | 0% · – · 100% |

**4 soldiers**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 100% · 1.6 · 0% | 90% · 1.4 · 10% | 60% · 2 · 40% | 80% · 2.4 · 20% | 0% · – · 100% | 0% · – · 100% |
| Plain blade | 100% · 1.7 · 0% | 100% · 1.9 · 0% | 80% · 2.3 · 20% | 100% · 2.5 · 0% | 0% · – · 100% | 0% · – · 100% |
| Optimised gun | 80% · 1.1 · 20% | 70% · 1.6 · 30% | 40% · 2 · 60% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Optimised blade | 100% · 1.2 · 0% | 100% · 1.4 · 0% | 100% · 1.8 · 0% | 70% · 2.1 · 30% | 50% · 2.6 · 50% | 0% · – · 100% |
| Tank | 100% · 1.7 · 0% | 100% · 2.3 · 0% | 70% · 4.1 · 30% | 50% · 5.2 · 50% | 10% · 6 · 90% | 0% · – · 100% |
| Sigil caster | 100% · 1 · 0% | 100% · 1 · 0% | 100% · 2.3 · 0% | 100% · 2.5 · 0% | 80% · 3.3 · 20% | 0% · – · 100% |
| Outburst caster | 100% · 1 · 0% | 100% · 1.1 · 0% | 100% · 1.1 · 0% | 100% · 1.2 · 0% | 90% · 1.7 · 10% | 60% · 2.2 · 40% |
| Faith build | 100% · 1.3 · 0% | 100% · 1.3 · 0% | 90% · 1.7 · 10% | 90% · 1.4 · 10% | 30% · 2.7 · 70% | 0% · – · 100% |
| Calls leader | 100% · 1.1 · 0% | 100% · 1.2 · 0% | 100% · 1.2 · 0% | 100% · 1.2 · 0% | 100% · 1.4 · 0% | 100% · 2.2 · 0% |

**2 elites**

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 30% · 3.3 · 70% | 10% · 4 · 90% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Plain blade | 60% · 4.3 · 40% | 10% · 6 · 90% | 10% · 5 · 90% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Optimised gun | 0% · – · 100% | 0% · – · 100% | 10% · 3 · 90% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Optimised blade | 60% · 4.7 · 40% | 30% · 3.7 · 70% | 30% · 4.3 · 70% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Tank | 80% · 5.1 · 20% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Sigil caster | 90% · 2.2 · 10% | 70% · 2.6 · 30% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Outburst caster | 100% · 2.8 · 0% | 100% · 2.5 · 0% | 30% · 3 · 70% | 30% · 2.7 · 70% | 10% · 4 · 90% | 0% · – · 100% |
| Faith build | 40% · 4.8 · 60% | 40% · 4.5 · 60% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% | 0% · – · 100% |
| Calls leader | 100% · 2.9 · 0% | 100% · 3.8 · 0% | 100% · 4 · 0% | 90% · 4 · 10% | 80% · 4.4 · 20% | 10% · 9 · 90% |

## 5. Angle B: the AP economy

From the sandbag under fire (soldier numbers, 8 rounds or until the character goes down), normal share. AP a turn is what the turn started with; the shares are of all AP the character had.

| Build | Level | AP a turn | Above 6, a turn | Turns at 9 | Attacks | Techniques | Spells and prayers | Calls | Moving | Reload and jams | Set-up | Unspent | Damage per AP spent | Damage per AP on attacks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Plain gun | 1 | 6 | 0 | 0% | 91% | 0% | 0% | 0% | 0% | 9% | 0% | 0% | 9.6 | 10.5 |
| Plain gun | 9 | 6 | 0 | 0% | 94% | 0% | 0% | 0% | 0% | 6% | 0% | 0% | 23.1 | 24.6 |
| Plain gun | 20 | 6 | 0 | 0% | 94% | 0% | 0% | 0% | 0% | 6% | 0% | 0% | 29.6 | 31.4 |
| Plain blade | 1 | 5.9 | 0 | 0% | 84% | 0% | 0% | 0% | 13% | 0% | 0% | 3% | 10.7 | 12.4 |
| Plain blade | 9 | 5.9 | 0 | 0% | 90% | 0% | 0% | 0% | 6% | 0% | 0% | 3% | 25.4 | 27.2 |
| Plain blade | 20 | 5.9 | 0 | 0% | 95% | 0% | 0% | 0% | 4% | 0% | 0% | 1% | 27.8 | 29 |
| Optimised gun | 1 | 6 | 0 | 0% | 83% | 0% | 0% | 0% | 0% | 17% | 0% | 0% | 23.9 | 28.8 |
| Optimised gun | 9 | 6 | 0 | 0% | 81% | 0% | 0% | 0% | 0% | 13% | 0% | 6% | 42 | 48.6 |
| Optimised gun | 20 | 6 | 0 | 0% | 83% | 0% | 0% | 0% | 0% | 11% | 0% | 6% | 59.5 | 67.3 |
| Optimised blade | 1 | 5.9 | 0 | 0% | 53% | 31% | 0% | 0% | 14% | 0% | 0% | 2% | 15.2 | 17.7 |
| Optimised blade | 9 | 5.9 | 0 | 0% | 49% | 34% | 0% | 0% | 13% | 0% | 0% | 5% | 23.2 | 26.8 |
| Optimised blade | 20 | 5.8 | 0 | 0% | 68% | 19% | 0% | 0% | 7% | 0% | 0% | 6% | 37.6 | 40.8 |
| Tank | 1 | 5.9 | 0 | 0% | 46% | 0% | 0% | 0% | 24% | 0% | 20% | 9% | 6.3 | 12.3 |
| Tank | 9 | 5.9 | 0 | 0% | 55% | 0% | 0% | 0% | 15% | 0% | 19% | 12% | 9.8 | 15.8 |
| Tank | 20 | 5.9 | 0 | 0% | 59% | 0% | 0% | 0% | 8% | 0% | 19% | 13% | 17.4 | 25.5 |
| Sigil caster | 1 | 6 | 0 | 0% | 10% | 0% | 17% | 0% | 17% | 0% | 39% | 17% | 11.1 | 34.5 |
| Sigil caster | 9 | 6 | 0 | 0% | 0% | 0% | 11% | 0% | 24% | 0% | 57% | 9% | 19.9 | 168.8 |
| Sigil caster | 20 | 6 | 0 | 0% | 0% | 0% | 14% | 0% | 28% | 0% | 54% | 3% | 32.7 | 218.9 |
| Outburst caster | 1 | 6 | 0 | 0% | 0% | 0% | 17% | 0% | 7% | 0% | 76% | 0% | 6.7 | 40 |
| Outburst caster | 9 | 5.9 | 0 | 0% | 0% | 0% | 33% | 0% | 0% | 0% | 67% | 0% | 21.4 | 64.4 |
| Outburst caster | 20 | 6 | 0 | 0% | 0% | 0% | 30% | 0% | 0% | 0% | 70% | 0% | 27.8 | 92.8 |
| Faith build | 1 | 6 | 0 | 0% | 93% | 0% | 0% | 0% | 0% | 7% | 0% | 0% | 8.6 | 9.2 |
| Faith build | 9 | 5.9 | 0 | 0% | 31% | 0% | 51% | 0% | 0% | 1% | 0% | 17% | 24.2 | 24.5 |
| Faith build | 20 | 6 | 0 | 0% | 33% | 0% | 50% | 0% | 0% | 0% | 0% | 16% | 29.8 | 30.1 |
| Calls leader | 1 | 5.9 | 0 | 0% | 95% | 0% | 0% | 0% | 0% | 5% | 0% | 0% | 2.9 | 3.1 |
| Calls leader | 9 | 6 | 0 | 0% | 92% | 0% | 0% | 0% | 0% | 8% | 0% | 0% | 5.5 | 6 |
| Calls leader | 20 | 5.9 | 0 | 0% | 88% | 0% | 0% | 0% | 0% | 13% | 0% | 0% | 6.4 | 7.3 |

**Where AP above 6 came from** (the log line of the turn it arrived, times seen):

1. Calls leader: +N AP (banked); N lost to the +N cap. (36)
2. Calls leader: +N AP (banked). (29)
3. Optimised gun: +N AP (banked). (20)
4. Faith build: +N AP (banked); N lost to the +N cap. (10)

**What each build did with its turns** (actions used over the 8-round fights at level 9, normal share, per fight):

| Build | Actions |
|---|---|
| Plain gun | plain shot (hellraiser_service_rifle) 21.6 · end turn 7.7 · clear a jam 1.4 |
| Plain blade | plain cut (sabre) 21.4 · end turn 8 · move 1 |
| Optimised gun | plain shot (long_rifle) 18.1 · end turn 7.5 · reload 2.9 · clear a jam 1.4 |
| Optimised blade | end turn 8 · plain cut (adamantile_greatsword) 7.6 · Lunge 5.3 · move 1 |
| Tank | plain cut (sabre) 13 · Raise Shield 8 · end turn 8 · move 2 · brace (Guard) 1 |
| Sigil caster | walk the Line 16.9 · end turn 7.6 · move 5.9 · draw STONE 5.7 · draw FIRE 5.7 · draw CONDENSE 5.6 · draw SEEK 5.6 · Evoke STONE·FIRE·CONDENSE·SEEK 4.9 |
| Outburst caster | Pump 13.7 · Begin Heart Bolt 6.3 · end turn 3.2 · Release Heart Bolt (stage 4) 3.1 · Release Heart Bolt (stage 0) 2.1 · Release Heart Bolt (stage 1) 1 · Release Heart Bolt (stage 3) 0.1 |
| Faith build | Hymn: Lightning Rod 5.5 · end turn 5.5 · plain shot (hellraiser_service_rifle) 5.1 · move 0.1 · clear a jam 0.1 |
| Calls leader | plain shot (service_pistol) 12.6 · end turn 4.6 · clear a jam 0.6 · reload 0.5 |

## 6. Angle D: accuracy and critical hits

### 6.1 Hit chance of a plain attack (the engine's own number: 4 tiles for a gun, next to the target for a blade, open ground)

The first attack of a turn, with nobody Pressed or hurt. Later shots of a turn are lower (Recoil, Heat), and a Pressed character is at −1. Target: about 65% at equal level.

| Build | Share | Level | Minion (Defense 10) | Soldier (Defense 12) | Elite (Defense 13) | Boss (Defense 14) | Critical × |
|---|---|---|---|---|---|---|---|
| Plain gun | normal share | 1 | 70% | 60% | 55% | 50% | 2.4 |
| Plain gun | normal share | 3 | 75% | 65% | 60% | 55% | 2.5 |
| Plain gun | normal share | 6 | 80% | 70% | 65% | 60% | 2.5 |
| Plain gun | normal share | 9 | 90% | 80% | 75% | 70% | 2.6 |
| Plain gun | normal share | 12 | 95% | 85% | 80% | 75% | 2.7 |
| Plain gun | normal share | 20 | 95% | 90% | 85% | 80% | 2.9 |
| Plain gun | all in | 1 | 85% | 75% | 70% | 65% | 2.5 |
| Plain gun | all in | 3 | 90% | 80% | 75% | 70% | 2.5 |
| Plain gun | all in | 6 | 95% | 85% | 80% | 75% | 2.6 |
| Plain gun | all in | 9 | 95% | 90% | 85% | 80% | 2.6 |
| Plain gun | all in | 12 | 95% | 90% | 85% | 80% | 2.6 |
| Plain gun | all in | 20 | 95% | 90% | 85% | 80% | 2.6 |
| Plain blade | normal share | 1 | 70% | 60% | 55% | 50% | 2.4 |
| Plain blade | normal share | 3 | 75% | 65% | 60% | 55% | 2.5 |
| Plain blade | normal share | 6 | 80% | 70% | 65% | 60% | 2.5 |
| Plain blade | normal share | 9 | 90% | 80% | 75% | 70% | 2.6 |
| Plain blade | normal share | 12 | 95% | 85% | 80% | 75% | 2.7 |
| Plain blade | normal share | 20 | 95% | 90% | 85% | 80% | 2.7 |
| Plain blade | all in | 1 | 85% | 75% | 70% | 65% | 2.5 |
| Plain blade | all in | 3 | 90% | 80% | 75% | 70% | 2.5 |
| Plain blade | all in | 6 | 95% | 85% | 80% | 75% | 2.6 |
| Plain blade | all in | 9 | 95% | 90% | 85% | 80% | 2.6 |
| Plain blade | all in | 12 | 95% | 90% | 85% | 80% | 2.6 |
| Plain blade | all in | 20 | 95% | 90% | 85% | 80% | 2.6 |
| Optimised gun | normal share | 1 | 80% | 70% | 65% | 60% | 2.5 |
| Optimised gun | normal share | 3 | 85% | 75% | 70% | 65% | 2.6 |
| Optimised gun | normal share | 6 | 90% | 80% | 75% | 70% | 2.6 |
| Optimised gun | normal share | 9 | 95% | 90% | 85% | 80% | 2.7 |
| Optimised gun | normal share | 12 | 95% | 95% | 90% | 85% | 2.8 |
| Optimised gun | normal share | 20 | 95% | 95% | 95% | 90% | 3.1 |
| Optimised gun | all in | 1 | 95% | 85% | 80% | 75% | 2.6 |
| Optimised gun | all in | 3 | 95% | 90% | 85% | 80% | 2.6 |
| Optimised gun | all in | 6 | 95% | 95% | 90% | 85% | 2.7 |
| Optimised gun | all in | 9 | 95% | 95% | 95% | 90% | 2.8 |
| Optimised gun | all in | 12 | 95% | 95% | 95% | 90% | 3 |
| Optimised gun | all in | 20 | 95% | 95% | 95% | 90% | 3.4 |
| Optimised blade | normal share | 1 | 80% | 70% | 65% | 60% | 2.2 |
| Optimised blade | normal share | 3 | 85% | 75% | 70% | 65% | 2.2 |
| Optimised blade | normal share | 6 | 90% | 80% | 75% | 70% | 2.2 |
| Optimised blade | normal share | 9 | 95% | 90% | 85% | 80% | 2.2 |
| Optimised blade | normal share | 12 | 95% | 95% | 90% | 85% | 2.2 |
| Optimised blade | normal share | 20 | 95% | 95% | 95% | 90% | 2.2 |
| Optimised blade | all in | 1 | 95% | 85% | 80% | 75% | 2.1 |
| Optimised blade | all in | 3 | 95% | 90% | 85% | 80% | 2.1 |
| Optimised blade | all in | 6 | 95% | 95% | 90% | 85% | 2.1 |
| Optimised blade | all in | 9 | 95% | 95% | 95% | 90% | 2.1 |
| Optimised blade | all in | 12 | 95% | 95% | 95% | 90% | 2.1 |
| Optimised blade | all in | 20 | 95% | 95% | 95% | 90% | 2.1 |
| Tank | normal share | 1 | 70% | 60% | 55% | 50% | 2.3 |
| Tank | normal share | 3 | 75% | 65% | 60% | 55% | 2.4 |
| Tank | normal share | 6 | 80% | 70% | 65% | 60% | 2.4 |
| Tank | normal share | 9 | 80% | 70% | 65% | 60% | 2.4 |
| Tank | normal share | 12 | 85% | 75% | 70% | 65% | 2.5 |
| Tank | normal share | 20 | 95% | 85% | 80% | 75% | 2.6 |
| Tank | all in | 1 | 55% | 45% | 40% | 35% | 2.1 |
| Tank | all in | 3 | 55% | 45% | 40% | 35% | 2.1 |
| Tank | all in | 6 | 55% | 45% | 40% | 35% | 2.1 |
| Tank | all in | 9 | 70% | 60% | 55% | 50% | 2.2 |
| Tank | all in | 12 | 80% | 70% | 65% | 60% | 2.3 |
| Tank | all in | 20 | 95% | 90% | 85% | 80% | 2.5 |

### 6.2 What the fights showed (the sandbag under fire, soldier numbers, normal share)

Each cell: attacks that hit · attacks that were critical · share of all damage that came from criticals. Spells and prayers are not attack rolls of a weapon and are left out of the first two.

| Build | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 |
|---|---|---|---|---|---|---|
| Plain gun | 46% · 4% · 18% | 62% · 7% · 26% | 60% · 2% · 9% | 76% · 5% · 15% | 72% · 4% · 15% | 84% · 4% · 14% |
| Plain blade | 61% · 4% · 15% | 65% · 5% · 17% | 72% · 6% · 20% | 87% · 8% · 23% | 85% · 8% · 23% | 89% · 2% · 7% |
| Optimised gun | 65% · 6% · 20% | 70% · 3% · 11% | 73% · 5% · 18% | 78% · 6% · 17% | 86% · 5% · 14% | 91% · 7% · 20% |
| Optimised blade | 77% · 4% · 11% | 80% · 4% · 10% | 81% · 3% · 8% | 84% · 2% · 6% | 97% · 2% · 5% | 96% · 5% · 12% |
| Tank | 59% · 7% · 26% | 66% · 2% · 8% | 76% · 2% · 8% | 68% · 5% · 18% | 78% · 3% · 9% | 86% · 4% · 10% |
| Sigil caster | 50% · 0% · 0% | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% |
| Outburst caster | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% | – · – · 0% | 20% · 0% · 0% |
| Faith build | 43% · 5% · 23% | 41% · 8% · 37% | 62% · 10% · 9% | 67% · 10% · 8% | 76% · 8% · 7% | 85% · 8% · 7% |
| Calls leader | 28% · 2% · 19% | 18% · 5% · 52% | 22% · 1% · 10% | 33% · 10% · 50% | 42% · 4% · 20% | 45% · 7% · 32% |

### 6.3 Open ground against ground with cover (one enemy, normal share)

Each cell: the character's hit chance in the fight, open · with cover; then the enemy's hit chance on the character, open · with cover.

| Build | Level | Minion | Soldier | Elite | Boss |
|---|---|---|---|---|---|
| Plain gun | 1 | 69% · 61% ; 29% · 5% | 57% · 42% ; 56% · 39% | 52% · 43% ; 70% · 37% | 46% · 36% ; 72% · 59% |
| Plain gun | 9 | 91% · 67% ; 31% · 8% | 68% · 67% ; 59% · 30% | 64% · 62% ; 69% · 31% | 63% · 57% ; 72% · 50% |
| Plain gun | 20 | 100% · 69% ; 0% · 0% | 95% · 69% ; 0% · 9% | 87% · 70% ; 53% · 25% | 77% · 59% ; 52% · 19% |
| Plain blade | 1 | 71% · 83% ; 40% · 33% | 60% · 52% ; 52% · 53% | 57% · 48% ; 64% · 69% | 53% · 54% ; 84% · 73% |
| Plain blade | 9 | 91% · 87% ; 40% · 11% | 78% · 82% ; 53% · 38% | 77% · 83% ; 67% · 43% | 65% · 68% ; 76% · 64% |
| Plain blade | 20 | 100% · 95% ; 11% · 0% | 91% · 87% ; 25% · 0% | 76% · 87% ; 40% · 38% | 81% · 85% ; 56% · 42% |
| Optimised gun | 1 | 80% · 67% ; 42% · 15% | 67% · 69% ; 63% · 51% | 68% · 61% ; 70% · 57% | 61% · 53% ; 83% · 63% |
| Optimised gun | 9 | 87% · 77% ; 33% · 27% | 83% · 71% ; 59% · 40% | 87% · 57% ; 90% · 27% | 71% · 56% ; 81% · 58% |
| Optimised gun | 20 | 100% · 87% ; 11% · 0% | 91% · 80% ; 40% · 13% | 100% · 69% ; 60% · 14% | 87% · 76% ; 62% · 25% |
| Optimised blade | 1 | 80% · 100% ; 44% · 27% | 74% · 80% ; 60% · 43% | 74% · 67% ; 79% · 53% | 70% · 70% ; 85% · 76% |
| Optimised blade | 9 | 95% · 95% ; 41% · 21% | 91% · 95% ; 52% · 39% | 100% · 88% ; 60% · 49% | 79% · 90% ; 78% · 67% |
| Optimised blade | 20 | 100% · 91% ; 26% · 24% | 95% · 95% ; 39% · 42% | 91% · 95% ; 50% · 36% | 88% · 90% ; 71% · 63% |
| Tank | 1 | 74% · 80% ; 31% · 28% | 67% · 63% ; 45% · 38% | 50% · 55% ; 62% · 48% | 57% · 47% ; 58% · 58% |
| Tank | 9 | 74% · 95% ; 38% · 24% | 68% · 74% ; 46% · 41% | 70% · 59% ; 53% · 50% | 61% · 60% ; 63% · 61% |
| Tank | 20 | 100% · 100% ; 29% · 13% | 83% · 85% ; 30% · 41% | 85% · 87% ; 58% · 38% | 75% · 71% ; 63% · 56% |
| Sigil caster | 1 | 0% · 0% ; 47% · 39% | 0% · 0% ; 63% · 64% | 33% · 6% ; 74% · 67% | 32% · 5% ; 85% · 81% |
| Sigil caster | 9 | – · 0% ; 42% · 36% | – · 15% ; 62% · 50% | – · 0% ; 76% · 58% | – · 15% ; 82% · 72% |
| Sigil caster | 20 | – · 100% ; 39% · 23% | – · 28% ; 40% · 41% | – · 39% ; 56% · 47% | – · 42% ; 84% · 68% |
| Outburst caster | 1 | – · – ; 41% · 34% | – · – ; 61% · 57% | – · – ; 77% · 63% | – · – ; 84% · 85% |
| Outburst caster | 9 | – · – ; 46% · 26% | – · – ; 58% · 39% | – · – ; 64% · 42% | – · – ; 77% · 58% |
| Outburst caster | 20 | 33% · 0% ; 14% · 3% | 42% · 0% ; 21% · 29% | 17% · 0% ; 51% · 37% | 22% · 13% ; 62% · 46% |
| Faith build | 1 | 83% · 39% ; 36% · 11% | 39% · 28% ; 61% · 52% | 37% · 28% ; 73% · 52% | 33% · 23% ; 78% · 67% |
| Faith build | 9 | – · – ; 39% · 16% | – · – ; 50% · 39% | 80% · 50% ; 77% · 52% | 59% · 18% ; 79% · 68% |
| Faith build | 20 | – · – ; 27% · 5% | – · – ; 40% · 24% | 70% · 50% ; 50% · 31% | 83% · 50% ; 66% · 50% |
| Calls leader | 1 | 31% · 18% ; 36% · 22% | 23% · 12% ; 57% · 48% | 27% · 10% ; 72% · 59% | 21% · 6% ; 79% · 70% |
| Calls leader | 9 | 49% · 29% ; 44% · 20% | 36% · 20% ; 61% · 55% | 35% · 21% ; 68% · 60% | 28% · 22% ; 80% · 68% |
| Calls leader | 20 | 71% · 44% ; 50% · 43% | 40% · 35% ; 56% · 46% | 47% · 33% ; 73% · 54% | 39% · 28% ; 77% · 68% |

## 7. Angle E: defence stacked on the tank

Every source of "less damage" the tank build holds, and what gets through. The first columns are the engine's own numbers for the enemy's plain attack on it; the last two are measured in the fights (Guard, the shield and the perks act there).

| Level | Share | Enemy | Enemy hits the rifleman | Enemy hits the tank | A hit before armour | After the tank's armour | Tank: damage per enemy turn | Rifleman: damage per enemy turn | What gets through |
|---|---|---|---|---|---|---|---|---|---|
| 1 | normal share | Minion | 55% | 50% | 20 | 5 | 6.9 | 5.1 | 135% |
| 1 | normal share | Soldier | 65% | 60% | 30 | 15 | 12.6 | 36.7 | 34% |
| 1 | normal share | Elite | 75% | 70% | 28 | 13 | 11.1 | 17.8 | 62% |
| 1 | normal share | Boss | 70% | 65% | 25 | 10 | 10.5 | 18.5 | 57% |
| 3 | normal share | Minion | 55% | 50% | 20 | 1 | 3.3 | 4.4 | 75% |
| 3 | normal share | Soldier | 65% | 60% | 30 | 10 | 7.7 | 23.3 | 33% |
| 3 | normal share | Elite | 75% | 70% | 28 | 8 | 6.5 | 24 | 27% |
| 3 | normal share | Boss | 70% | 65% | 25 | 5 | 7.6 | 24.1 | 32% |
| 6 | normal share | Minion | 50% | 50% | 20 | 1 | 1.9 | 7.8 | 24% |
| 6 | normal share | Soldier | 60% | 60% | 30 | 10 | 6.1 | 27.3 | 22% |
| 6 | normal share | Elite | 70% | 70% | 28 | 8 | 5.4 | 12 | 45% |
| 6 | normal share | Boss | 65% | 65% | 25 | 5 | 6.5 | 17.7 | 37% |
| 9 | normal share | Minion | 50% | 50% | 20 | 1 | 1.7 | 8 | 21% |
| 9 | normal share | Soldier | 60% | 60% | 30 | 10 | 7 | 29.4 | 24% |
| 9 | normal share | Elite | 70% | 70% | 28 | 8 | 4.7 | 26.5 | 18% |
| 9 | normal share | Boss | 65% | 65% | 25 | 5 | 5.4 | 20.1 | 27% |
| 12 | normal share | Minion | 45% | 50% | 20 | 1 | 3.2 | 31 | 10% |
| 12 | normal share | Soldier | 55% | 60% | 30 | 10 | 11.9 | 31 | 38% |
| 12 | normal share | Elite | 65% | 70% | 28 | 8 | 6.4 | 20 | 32% |
| 12 | normal share | Boss | 60% | 65% | 25 | 5 | 5.7 | 12.8 | 45% |
| 20 | normal share | Minion | 25% | 40% | 20 | 1 | 1.4 | 0 | – |
| 20 | normal share | Soldier | 35% | 50% | 30 | 10 | 1.9 | 0 | – |
| 20 | normal share | Elite | 45% | 60% | 28 | 8 | 3.5 | 16.2 | 22% |
| 20 | normal share | Boss | 40% | 55% | 25 | 5 | 3.8 | 8.5 | 45% |
| 1 | all in | Minion | 50% | 50% | 20 | 10 | 7.8 | 2 | 390% |
| 1 | all in | Soldier | 60% | 60% | 30 | 20 | 15.5 | 17 | 91% |
| 1 | all in | Elite | 70% | 70% | 28 | 18 | 11.3 | 17.6 | 64% |
| 1 | all in | Boss | 65% | 65% | 25 | 15 | 14.6 | 23.5 | 62% |
| 3 | all in | Minion | 40% | 50% | 20 | 10 | 10.1 | 2.5 | 404% |
| 3 | all in | Soldier | 50% | 60% | 30 | 20 | 19 | 26.8 | 71% |
| 3 | all in | Elite | 60% | 70% | 28 | 18 | 13.5 | 18.8 | 72% |
| 3 | all in | Boss | 55% | 65% | 25 | 15 | 16.1 | 16.5 | 98% |
| 6 | all in | Minion | 25% | 50% | 20 | 10 | 9.9 | 0 | – |
| 6 | all in | Soldier | 35% | 60% | 30 | 20 | 13.7 | 16.7 | 82% |
| 6 | all in | Elite | 45% | 70% | 28 | 18 | 12.3 | 0.6 | 2050% |
| 6 | all in | Boss | 40% | 65% | 25 | 15 | 16.9 | 12.2 | 139% |
| 9 | all in | Minion | 15% | 50% | 20 | 10 | 10.1 | 8.5 | 119% |
| 9 | all in | Soldier | 25% | 60% | 30 | 20 | 15.4 | 0 | – |
| 9 | all in | Elite | 35% | 70% | 28 | 18 | 11.2 | 6.5 | 172% |
| 9 | all in | Boss | 30% | 65% | 25 | 15 | 13.3 | 9 | 148% |
| 12 | all in | Minion | 15% | 50% | 20 | 1 | 4.1 | 7.7 | 53% |
| 12 | all in | Soldier | 25% | 60% | 30 | 10 | 8.5 | 0.3 | 2833% |
| 12 | all in | Elite | 35% | 70% | 28 | 8 | 6.7 | 7 | 96% |
| 12 | all in | Boss | 30% | 65% | 25 | 5 | 4.6 | 6.9 | 67% |
| 20 | all in | Minion | 15% | 30% | 20 | 1 | 4 | 0 | – |
| 20 | all in | Soldier | 25% | 40% | 30 | 10 | 4.1 | 0 | – |
| 20 | all in | Elite | 35% | 50% | 28 | 8 | 7.7 | 3 | 257% |
| 20 | all in | Boss | 30% | 45% | 25 | 5 | 2.9 | 4.7 | 62% |

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
| Plain gun | 1 | 0 | – | 29% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain gun | 9 | 0 | – | 25% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain gun | 20 | 0 | – | 12% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain blade | 1 | 0 | – | 27% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain blade | 9 | 0 | – | 24% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Plain blade | 20 | 0 | – | 13% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised gun | 1 | 0 | – | 26% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised gun | 9 | 0 | – | 19% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised gun | 20 | 0 | – | 14% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised blade | 1 | 0 | – | 25% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised blade | 9 | 0 | – | 32% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Optimised blade | 20 | 0 | – | 28% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Tank | 1 | 0 | – | 26% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Tank | 9 | 0 | – | 20% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Tank | 20 | 0 | – | 19% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Sigil caster | 1 | 0 | – | 29% | 0% | 0% | 0 | 3 | 33% | 0% | 0% | 0% | 0 |
| Sigil caster | 9 | 0 | – | 19% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Sigil caster | 20 | 0 | – | 26% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Outburst caster | 1 | 0 | – | 29% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Outburst caster | 9 | 0 | – | 25% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Outburst caster | 20 | 0 | – | 22% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Faith build | 1 | 0 | – | 27% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Faith build | 9 | 108 | 0% | 24% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Faith build | 20 | 106 | 0% | 26% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Calls leader | 1 | 0 | – | 33% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Calls leader | 9 | 0 | – | 25% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |
| Calls leader | 20 | 0 | – | 24% | 0% | 0% | 0 | 0 | – | 0% | 0% | 0% | 0 |

## 9. Angle G: resources

From the sandbag under fire (soldier numbers, 8 rounds or until the character goes down), normal share, level 9 and 20. Earned and spent are per fight. "Empty" and "at its cap" are the share of the character's turns that started that way. Target (proposed): each resource should bind in about one turn out of three; one that is never empty or never spent is cut or re-priced.

| Build | Level | Resource | Cap | Earned | Spent | Turns empty | Turns at its cap |
|---|---|---|---|---|---|---|---|
| Plain gun | 9 | Heat | 8 | 21.6 | 17.7 | 27% | 0% |
| Plain gun | 9 | Rounds in the weapon | 24 | 0 | 21.6 | 0% | 13% |
| Plain gun | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain gun | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Plain gun | 20 | Heat | 8 | 22.5 | 20.7 | 28% | 0% |
| Plain gun | 20 | Rounds in the weapon | 24 | 0 | 22.5 | 0% | 13% |
| Plain gun | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain gun | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Plain blade | 9 | Momentum | 3 | 10.6 | 9.7 | 23% | 15% |
| Plain blade | 9 | Guard | 3 | 0 | 0 | 100% | 0% |
| Plain blade | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain blade | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Plain blade | 20 | Momentum | 3 | 7.5 | 6 | 10% | 35% |
| Plain blade | 20 | Guard | 5 | 0 | 0 | 100% | 0% |
| Plain blade | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Plain blade | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised gun | 9 | Heat | 6 | 18.1 | 16.2 | 36% | 0% |
| Optimised gun | 9 | Rounds in the weapon | 5 | 14.5 | 18.1 | 8% | 36% |
| Optimised gun | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised gun | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised gun | 20 | Heat | 6 | 19.8 | 18.5 | 26% | 0% |
| Optimised gun | 20 | Rounds in the weapon | 5 | 15 | 19.8 | 15% | 34% |
| Optimised gun | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised gun | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised blade | 9 | Momentum | 5 | 6.4 | 6.9 | 86% | 0% |
| Optimised blade | 9 | Guard | 2 | 0 | 0 | 100% | 0% |
| Optimised blade | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised blade | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Optimised blade | 20 | Momentum | 5 | 10 | 9.8 | 50% | 0% |
| Optimised blade | 20 | Guard | 4 | 0 | 0 | 100% | 0% |
| Optimised blade | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Optimised blade | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Tank | 9 | Momentum | 3 | 8.9 | 9.4 | 94% | 0% |
| Tank | 9 | Guard | 5 | 11.9 | 11.9 | 79% | 0% |
| Tank | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Tank | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Tank | 20 | Momentum | 3 | 12.1 | 12.9 | 90% | 0% |
| Tank | 20 | Guard | 5 | 15.1 | 15.1 | 78% | 0% |
| Tank | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Tank | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Sigil caster | 9 | Rounds in the weapon | 12 | 0 | 0 | 0% | 100% |
| Sigil caster | 9 | Flux | 6 | 19.9 | 17.4 | 36% | 0% |
| Sigil caster | 9 | Core charge | 10 | 35.3 | 38 | 13% | 13% |
| Sigil caster | 9 | Spare cores | – | 0 | 3.7 | 0% | – |
| Sigil caster | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Sigil caster | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Sigil caster | 20 | Rounds in the weapon | 12 | 0 | 0 | 0% | 100% |
| Sigil caster | 20 | Flux | 6 | 26.4 | 23.4 | 13% | 11% |
| Sigil caster | 20 | Core charge | 10 | 38 | 44.9 | 10% | 13% |
| Sigil caster | 20 | Spare cores | – | 0 | 3.9 | 0% | – |
| Sigil caster | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Sigil caster | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Outburst caster | 9 | Rounds in the weapon | 6 | 0 | 0 | 0% | 100% |
| Outburst caster | 9 | MP | 300 | 0 | 179.6 | 0% | 31% |
| Outburst caster | 9 | Strain | 7 | 6.3 | 2.2 | 31% | 0% |
| Outburst caster | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Outburst caster | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Outburst caster | 20 | Rounds in the weapon | 6 | 0 | 0 | 0% | 50% |
| Outburst caster | 20 | MP | 300 | 37.7 | 314.6 | 0% | 14% |
| Outburst caster | 20 | Strain | 9 | 12.9 | 6.7 | 14% | 0% |
| Outburst caster | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Outburst caster | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Faith build | 9 | Heat | 8 | 5.1 | 4.2 | 100% | 0% |
| Faith build | 9 | Rounds in the weapon | 24 | 0 | 5.1 | 0% | 18% |
| Faith build | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Faith build | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Faith build | 20 | Heat | 8 | 7.9 | 7.9 | 100% | 0% |
| Faith build | 20 | Rounds in the weapon | 24 | 0 | 7.9 | 0% | 13% |
| Faith build | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Faith build | 20 | Reactions used | 1 | 0 | 0 | 100% | – |
| Calls leader | 9 | Heat | 6 | 12.6 | 8.8 | 33% | 0% |
| Calls leader | 9 | Rounds in the weapon | 12 | 6 | 12.6 | 7% | 22% |
| Calls leader | 9 | Echo | 3 | 0 | 0 | 0% | 0% |
| Calls leader | 9 | Reactions used | 1 | 0 | 0 | 100% | – |
| Calls leader | 20 | Heat | 6 | 20.3 | 18.4 | 33% | 0% |
| Calls leader | 20 | Rounds in the weapon | 12 | 12 | 20.3 | 9% | 15% |
| Calls leader | 20 | Echo | 3 | 0 | 0 | 0% | 0% |
| Calls leader | 20 | Reactions used | 1 | 0 | 0 | 100% | – |

Notes: Strain, Heat and Flux are "bad" meters (empty is good, the cap is the limit). Echo was never spent: the policies do not reroll. A reaction counts as used in a round the engine marked one used.

## 10. Angle H: growth

HP, and damage a turn on the shooting range (soldier numbers, 8 turns), by level. The last column is level 20 ÷ level 1.

**normal share**

| Build | What | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Growth |
|---|---|---|---|---|---|---|---|---|
| Plain gun | HP | 145 | 163 | 190 | 233 | 288 | 445 | ×3.1 |
| Plain gun | Damage a turn | 67.7 | 84.6 | 114.4 | 139.2 | 172.1 | 170.5 | ×2.5 |
| Plain blade | HP | 145 | 163 | 190 | 233 | 288 | 498 | ×3.4 |
| Plain blade | Damage a turn | 64.6 | 83.8 | 100 | 127.1 | 153.8 | 162.4 | ×2.5 |
| Optimised gun | HP | 130 | 144 | 175 | 202 | 229 | 392 | ×3 |
| Optimised gun | Damage a turn | 145.4 | 164.6 | 210.5 | 241 | 297.2 | 323.6 | ×2.2 |
| Optimised blade | HP | 145 | 159 | 190 | 233 | 266 | 445 | ×3.1 |
| Optimised blade | Damage a turn | 102.9 | 103.3 | 120.5 | 168.3 | 213.5 | 208.5 | ×2 |
| Tank | HP | 145 | 167 | 240 | 310 | 392 | 672 | ×4.6 |
| Tank | Damage a turn | 42.4 | 61.9 | 76.4 | 72.2 | 89.7 | 118.1 | ×2.8 |
| Sigil caster | HP | 130 | 144 | 175 | 202 | 251 | 392 | ×3 |
| Sigil caster | Damage a turn | 39.5 | 58.8 | 78.6 | 93.1 | 146.3 | 189.3 | ×4.8 |
| Outburst caster | HP | 130 | 144 | 175 | 202 | 251 | 339 | ×2.6 |
| Outburst caster | Damage a turn | 44.9 | 70.4 | 83 | 99.8 | 137.2 | 167.8 | ×3.7 |
| Faith build | HP | 130 | 144 | 175 | 202 | 251 | 339 | ×2.6 |
| Faith build | Damage a turn | 60.2 | 58.1 | 105.1 | 116.4 | 127.2 | 147.7 | ×2.5 |
| Calls leader | HP | 130 | 155 | 170 | 185 | 200 | 392 | ×3 |
| Calls leader | Damage a turn | 20.6 | 21 | 23.2 | 39.1 | 34.6 | 35.3 | ×1.7 |

**all in**

| Build | What | Level 1 | Level 3 | Level 6 | Level 9 | Level 12 | Level 20 | Growth |
|---|---|---|---|---|---|---|---|---|
| Plain gun | HP | 130 | 140 | 155 | 185 | 230 | 634 | ×4.9 |
| Plain gun | Damage a turn | 116.4 | 133.7 | 166.1 | 184.1 | 179.7 | 179.8 | ×1.5 |
| Plain blade | HP | 130 | 140 | 155 | 185 | 230 | 634 | ×4.9 |
| Plain blade | Damage a turn | 111.3 | 121.4 | 141.7 | 163.3 | 171.3 | 168.4 | ×1.5 |
| Optimised gun | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Optimised gun | Damage a turn | 213.1 | 257 | 302.4 | 334.3 | 336.8 | 339.3 | ×1.6 |
| Optimised blade | HP | 130 | 140 | 155 | 185 | 230 | 452 | ×3.5 |
| Optimised blade | Damage a turn | 119.2 | 129.9 | 136.2 | 177.3 | 172.6 | 212.5 | ×1.8 |
| Tank | HP | 190 | 235 | 325 | 435 | 510 | 710 | ×3.7 |
| Tank | Damage a turn | 23.6 | 24.1 | 30.1 | 42.2 | 65.6 | 161.5 | ×6.8 |
| Sigil caster | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Sigil caster | Damage a turn | 71.1 | 72.7 | 108.7 | 119.5 | 161.8 | 184.8 | ×2.6 |
| Outburst caster | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Outburst caster | Damage a turn | 68.2 | 95.7 | 112.6 | 130 | 132.4 | 205.7 | ×3 |
| Faith build | HP | 115 | 125 | 140 | 155 | 170 | 210 | ×1.8 |
| Faith build | Damage a turn | 32.1 | 29.7 | 107.1 | 117 | 119 | 156 | ×4.9 |
| Calls leader | HP | 115 | 125 | 140 | 155 | 170 | 286 | ×2.5 |
| Calls leader | Damage a turn | 9.4 | 10.5 | 11.8 | 10 | 13.4 | 18.8 | ×2 |

## 11. Angle K: squad size

The squad: 1 Optimised gun, 2 Tank, 3 Sigil caster, 4 Calls leader (a squad of 2 is the first two, and so on), normal share. Each cell: percent won · rounds to win · characters that went down, per fight.

**Standard fight: 3 soldiers and 1 elite, open ground**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 30% · 2.3 · 0.7 | 90% · 2.3 · 0.1 | 100% · 2 · 0 | 100% · 2.3 · 0 |
| 2 | 90% · 3.6 · 0.5 | 100% · 2.7 · 0 | 100% · 2 · 0 | 100% · 2 · 0 |
| 3 | 90% · 2.7 · 0.4 | 100% · 2.3 · 0 | 100% · 2.1 · 0 | 100% · 1.2 · 0 |
| 4 | 100% · 2.4 · 0.1 | 100% · 2 · 0 | 100% · 1.8 · 0 | 100% · 1.5 · 0 |

**Standard fight: 3 soldiers and 1 elite, ground with cover**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 0% · – · 1 | 60% · 2.7 · 0.4 | 100% · 2.1 · 0 | 100% · 2.4 · 0 |
| 2 | 40% · 6 · 1.5 | 100% · 3.4 · 0.1 | 100% · 2.3 · 0 | 100% · 2.3 · 0 |
| 3 | 90% · 4.1 · 0.6 | 100% · 3 · 0 | 100% · 2.3 · 0 | 100% · 2.1 · 0 |
| 4 | 90% · 3.4 · 0.6 | 100% · 2.5 · 0 | 100% · 2.1 · 0 | 100% · 2 · 0 |

**Boss fight: 1 boss and 2 soldiers, open ground**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 50% · 3 · 0.5 | 100% · 2.7 · 0 | 100% · 2.1 · 0 | 100% · 2 · 0 |
| 2 | 100% · 4.1 · 0.1 | 100% · 2.5 · 0 | 100% · 2.1 · 0 | 100% · 1.9 · 0 |
| 3 | 100% · 2.6 · 0 | 100% · 2.4 · 0 | 100% · 2 · 0 | 100% · 1.4 · 0 |
| 4 | 100% · 3.2 · 0.3 | 100% · 1.9 · 0 | 100% · 2 · 0 | 100% · 1.4 · 0 |

**Boss fight: 1 boss and 2 soldiers, ground with cover**

| Squad of | Level 1 | Level 6 | Level 12 | Level 20 |
|---|---|---|---|---|
| 1 | 10% · 3 · 0.9 | 90% · 2.8 · 0.1 | 100% · 2.4 · 0 | 100% · 2.2 · 0 |
| 2 | 100% · 4.3 · 0 | 100% · 2.7 · 0 | 100% · 2.6 · 0 | 100% · 2.1 · 0 |
| 3 | 100% · 3.4 · 0.1 | 100% · 2.6 · 0 | 100% · 2.1 · 0 | 100% · 2 · 0 |
| 4 | 100% · 3.3 · 0.2 | 100% · 2.6 · 0 | 100% · 2.1 · 0 | 100% · 1.7 · 0 |

**Who did what in the squad of four** (open ground; damage a turn · damage taken a fight · Calls made a fight):

| Fight | Level | Optimised gun | Tank | Sigil caster | Calls leader |
|---|---|---|---|---|---|
| Standard fight | 1 | 135.9 · 42.2 · 0 | 1.7 · 24.4 · 0 | 43.2 · 29 · 0 | 7.9 · 39.2 · 3.6 |
| Standard fight | 6 | 227.2 · 28.3 · 0 | 5.5 · 19.5 · 0 | 64.3 · 10.6 · 0 | 8.4 · 51.2 · 2.8 |
| Standard fight | 12 | 367.5 · 0 · 0 | 10.4 · 1 · 0 | 51.2 · 12 · 0 | 10 · 3.5 · 2.2 |
| Standard fight | 20 | 332.8 · 6.2 · 0 | 41.4 · 2.6 · 0 | 102.9 · 3.8 · 0 | 11.4 · 10.1 · 2.2 |
| Boss fight | 1 | 98.6 · 62.8 · 0 | 3.1 · 19.1 · 0 | 28.9 · 66 · 0 | 8.2 · 55.4 · 4.4 |
| Boss fight | 6 | 240.5 · 14.2 · 0 | 6.5 · 6.9 · 0 | 16.1 · 8 · 0 | 5.4 · 22 · 2.2 |
| Boss fight | 12 | 325.3 · 11.3 · 0 | 3.6 · 7.9 · 0 | 12.5 · 10.6 · 0 | 9.6 · 26.9 · 2.8 |
| Boss fight | 20 | 283.3 · 6.3 · 0 | 15 · 1.2 · 0 | 130.7 · 4.7 · 0 | 8.6 · 13.3 · 1.4 |

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

