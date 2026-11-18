# Scout: the nine attribute tables (ladder, folded perks, class, forks, Call)

Read-only scout, 18 Nov 2026, worktree E:/phc-wt/rel030 (release/0.31, live 0.31.10). Ground truth only; no proposals.
1. Sources: 27 skills in data/skills.json, 9 base classes in data/classes.json, 32 fork options in data/forks.json (14 built, 18 shelved; Figments' forks sit in data/figments.json), 9 Calls in data/calls.json.
2. skills.json alone is NOT the whole ladder: Ingenuity's 16 verbs (shadow.json, requires 1/3/5/7/9), Empathy's 20 verbs (tending.json, 1/2/3/4/5/8/10), Dexterity's Slide (pressure.json), Visualization's ladder (figments.json) and every gamma's Call steps (calls.json) are earned by points too. Tables show skills.json plus an "in other files" column.
3. skills.json alone: 102 of 270 skill-levels carry nothing and 55 carry two or more things; counting the other files: 91 empty, 96 multi.
4. Of the 18 shelved forks: N3b, N12, N9, N20, N7, N21, N22, N14, N15, N18 and N4/N5/N6 do not exist yet; N10 exists except `at: limit`; N1, N2, N3, N23 exist; the `action_id` price predicate exists; seen_range appears nowhere.
5. Class audit (section 3 of each attribute, list C at the end): duplicates concentrate in the Channeler, Rigger and Sigilist; Mender and Bulwark mostly lean on ladder numbers.

Counting rules: a level carries a thing when it has a named unlock (not the Mastery N rows), a fork, a perk step (Mastery 1 to 4 at 3/5/7/9, Mastered perk at 10) or a per_point row with `at` other than "each" that starts there ("every 2" starts at 2, "every 3" at 3, "from N" and "each from N" at N). "at: each" rows are the every-point lines, listed above each table and not counted. A named unlock that also has mastery 1 or 2 counts as the unlock and as its perk step (so Numb at 3 counts 2, matching Leon's section T complaint). The effect column is the first ten words of the unlock's `player` text (else `text`) with placeholders filled; ops are the first four effect ops. Door verbs bundled in an alpha's level-1 text (Durability's Challenge, Slam, Last Plate; Dexterity's Near Miss) are gated by `self_skill` in effects, so they are earned at 3 or 5 but sit in the level-1 unlock row: listed in section 2, not in the level count.

---

## Endurance

Alpha Durability (durability), beta Pain Threshold, gamma Senses (sensory). Base class Bulwark (defender).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Durability (durability, alpha)
Every point (at: each rows, not counted as a level content): Your Guard (plates that soak hits on you) holds 1 more plate, up to ...

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | at 1: The Guard technique gives you 1 plate. / at 1: Brace always gives 2 plates, whatever your points. / from 1: A shield in one hand adds 1 to every plate gain; a ... | **Guard** [Active Skill, mastery 0] Raise plates with the Guard technique (any weapon) or Brace. ... (ops: roll_with:durability, damage_mult, cancel, redirect...) | - | - | - | MULTI(4) |
| 2 | each from 2: The Guard technique gives 1 more plate. | - | - | - | - | - |
| 3 | at 3: Challenge (taunt the foes around you), Retort (throw part of a melee ... | - | - | Mastery 1 | - | MULTI(2) |
| 4 | - | - | Fork: Provoke or Cover Them | - | - | - |
| 5 | at 5: Slam (push away every foe next to you) and Last Plate (once ... | **Second Wind** [Active Skill, mastery 2] 2 AP, once a fight: heal 25% of your max ... (ops: grant_action:second_wind) | - | perk step M2 | - | MULTI(3) |
| 6 | - | - | Fork: Stand Fast or Drive | - | - | - |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Pain Threshold (pain_threshold, beta)
Every point (at: each rows, not counted as a level content): your Guard plates soak more of every hit, by 1% for every point here ...; You take 10% less elemental damage.; Every level gives you 2 more max HP.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Numb** [Passive, mastery 1] One injured arm or leg no longer holds you back. (ops: stat_mod:ignored_limb_injuries, perk_choice:pain_threshold) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Still Standing** [AP Mod, mastery 2] When your HP runs out, you get one more turn ... (ops: grant_action:still_standing) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Senses (sensory, gamma)
Every point (at: each rows, not counted as a level content): You sense what you cannot see 1 better: by sound, smell and touch.; Your Warn reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Read the Air** [Conversation Quirk, mastery 1] Read one tell of someone close to you (pulse, sweat, ... (ops: narrator, skill_mod_tag, perk_choice:sensory) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Tremor** [Combat Starter, mastery 2] Nothing moving on the ground within your Vision range can ... (ops: grant_action:act_in_surprise_round) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | Call as a reaction, 0 AP | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Guard | 1 | skills.json durability.unlocks.1 (Active Skill) | Durability |
| Second Wind | 5 | skills.json durability.unlocks.5 (Active Skill) | Durability |
| Close Guard | 1 | door unlock Guard text | Durability |
| Set Against the Blow | 3 | self_skill 3 | Durability |
| Retort | 3 | self_skill 3 | Durability |
| Challenge | 3 | self_skill 3 | Durability |
| Slam | 5 | self_skill 5 | Durability |
| Last Plate | 5 | self_skill 5 | Durability |
| Guard technique / Brace | 1 | per_point rows | Durability |
| Numb | 3 | skills.json pain_threshold.unlocks.3 (Passive) | Pain Threshold |
| Still Standing | 5 | skills.json pain_threshold.unlocks.5 (AP Mod) | Pain Threshold |
| Read the Air | 3 | skills.json sensory.unlocks.3 (Conversation Quirk) | Senses |
| Tremor | 5 | skills.json sensory.unlocks.5 (Combat Starter) | Senses |

### 3. Base class Bulwark (classes.json base defender): moves and ladder overlap

Resource(s): ['guard']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | brace (ref defender.brace) | Brace | 2, at_will | Costs 2 AP. You gain Guard equal to your Durability points (at least 1; at most your Guard pool's limit) and become Braced: +2 Defense until you move, are pushed or are knocked Prone. While you hold Guard you Interpose: when an en... | resource:guard, condition, stat_mod:defense, grant_action:interpose | DEP: Brace is also named by Durability level 1 ("Brace always gives 2 plates, whatever your points", per_point row; door_line "the Guard technique ... and Brace raise plates"); the class adds Interpose and the bigger pool (5/6/7 vs the ladder pool_max 4). Partly a duplicate of the ladder (Brace itself), partly the pool number. |
| I | draw_fire (ref defender.draw_fire) | Called Out | 0, at_will | Your Challenge costs no Guard, and the foe you name takes it with no save: its next attack must be aimed at you if it can see you, and it is worse at hitting anyone else. A Boss or a Celestial is Taunted too but never forced: it c... | cost_mod, condition | DEP: modifies Challenge, which Durability level 3 grants (door unlock Guard, Challenge needs Durability 3). Needs the ladder; no ladder duplicate. |
| II | unbroken (ref adamantile_knight.unbroken) | Unbroken | 0, per_combat | Once per fight, the first time damage would drop you to 0 HP, you stay at 1 HP instead and gain 3 Guard. | floor | DUP: Last Plate (Durability level 5, door unlock Guard): once a fight a killing blow leaves you on 1 HP. Unbroken is the same floor plus 3 Guard (Last Plate instead breaks every plate). |
| II | shrug_it_off | Shrug It Off | 0, reaction | When you become Bleeding, Slowed, Weakened or Prone, it ends at once. Costs 1 Guard and your reaction, and happens by itself whenever you have both. | reaction, cleanse | DISTINCT: no ladder unlock cleanses Bleeding/Slowed/Weakened/Prone (Pain Threshold 3 Numb is limb injuries only). Depends on Guard. |
| III | reactive_plate (ref defender.reactive_plate) | Reactive Plate | 0, at_will | Your armour is woven with mana and hardens when struck. When you take damage, Guard is spent to block it: each point takes 10 off the damage, as many points as the hit needs. It costs no AP and no reaction. For every 3 Guard spent... | stat_mod:damage_reduction_per_guard, meter | DEP: Guard soak per plate is the ladder number (Pain Threshold every-point row: plates soak 1% more per point; techniques.json rules.guard). Check against it before keeping. |
| III | anchor | Anchor | 0, at_will | While you are Braced, you can't be pushed, pulled or knocked Prone. An enemy that starts its turn next to you and then moves out of your reach provokes your opportunity attack, even if it Disengages. The attack uses your reaction. | anchor, free_attack | DISTINCT, DEP: Braced and Brace come from the ladder; the no-push rule has no ladder twin (Slam pushes others). |

### 4. Forks of the alpha (durability)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Provoke | fork.guard.provoke | built | - | - | - |
| 4 | Cover Them | fork.guard.cover_them | built | - | - | - |
| 6 | Stand Fast | fork.guard.stand_fast | built | - | - | - |
| 6 | Drive | fork.guard.drive | built | - | - | - |

Step 4 offered to players: yes.

Step 6 offered to players: yes.

### 5. Gamma Call: Senses

Warn (call.warn), helping Call, aims at ally. Warn an ally about the next weapon attack on them. Just before it is rolled they step out of the way, for no AP and without provoking an opportunity attack: to a tile you named, or else to the nearest tile that gets them clear. An attack that can no longer reach them is wasted. The warning lasts until the start of your next turn.

| Step at | Effect (short) |
|---|---|
| 1 | They step 1 tile out of the attack's way |
| 3 | Up to 2 tiles out of the way |
| 7 | Up to 2 tiles, and the attack is at -2 to hit |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; as a reaction for 0 AP once a round at 9; the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Strength

Alpha Raw Power (raw_power), beta Guts, gamma Intimidation (intimidation). Base class Breaker (fighter).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Raw Power (raw_power, alpha)
Every point (at: each rows, not counted as a level content): +1 to hit with heavy melee weapons and bare hands.; +5% physical damage.; Your melee techniques are harder to save against.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | each from 2: +1 to your counter-attacks. | - | - | - | - | - |
| 3 | - | **Heavy Hands** [Combat Interaction, mastery 1] A melee technique of yours that pushes its target pushes ... (ops: knockback, perk_choice:raw_power) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | Fork: Rolling Start or Grindstone | - | - | - |
| 5 | - | **Follow Through** [Combat Interaction, mastery 2] When a Finisher (a strike that spends all your Momentum) ... (ops: resource) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | Fork: Spill or Headlong | - | - | - |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Guts (guts, beta)
Every point (at: each rows, not counted as a level content): your Momentum wears off slower when you walk or get hit, by 1% for ...; +1 on Body saves: against poison, knock-downs, pushes and pins.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Steady** [Passive, mastery 1] Fear can't stop you moving or acting; you keep only ... (ops: stat_mod:fear_movement_immune, perk_choice:guts) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Point Man** [Passive, mastery 2] Allies within 3 tiles of you roll their Fear saves ... (ops: stat_mod:aura_fear_save_guts_tiles) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Intimidation (intimidation, gamma)
Every point (at: each rows, not counted as a level content): Your Threaten reaches 1 tile further.; Your Threaten is harder to shake off.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Marrow Talk** [Conversation Quirk, mastery 1] Even a failed threat leaves them Shaken: -2 on their ... (ops: condition, perk_choice:intimidation) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Stare Down** [Combat Starter, mastery 2] Before the first turn, one enemy that can see you ... (ops: grant_action:stare_down, condition) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Heavy Hands | 3 | skills.json raw_power.unlocks.3 (Combat Interaction) | Raw Power |
| Follow Through | 5 | skills.json raw_power.unlocks.5 (Combat Interaction) | Raw Power |
| Counter bonus | 2 | per_point each from 2 | Raw Power |
| Finishers Cleave, Break, Coup, Launch; Charge | 1 | techniques.json, no skill gate found | Raw Power |
| Steady | 3 | skills.json guts.unlocks.3 (Passive) | Guts |
| Point Man | 5 | skills.json guts.unlocks.5 (Passive) | Guts |
| Marrow Talk | 3 | skills.json intimidation.unlocks.3 (Conversation Quirk) | Intimidation |
| Stare Down | 5 | skills.json intimidation.unlocks.5 (Combat Starter) | Intimidation |

### 3. Base class Breaker (classes.json base fighter): moves and ladder overlap

Resource(s): ['momentum']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | lunge (ref fighter.lunge) | Barrel In | None, at_will | Costs the AP of your melee attack and 1 Momentum. Move up to 2 tiles and strike an enemy, all in one action. The move provokes no opportunity attacks. Once a turn, your first hit on a Shaken or Frightened enemy, with any weapon, g... | resource:momentum, stat_mod:move_in_attack, resource:momentum | DISTINCT: a move-and-strike technique; depends on Momentum (door, no unlock row). |
| I | wind_up | Wind-up | 0, at_will | You start each fight with 2 more Momentum than the door gives anyone (within your pool). | stat_mod:momentum_start | DEP: start Momentum +2 is the lever the fork Rolling Start (Raw Power 4, option a, fork.momentum.rolling_start) also pulls: check before both stand. |
| II | riposte (ref fighter.riposte) | Riposte | 0, reaction | You have the Answer Riposte with any melee weapon: when a melee attack misses you and the attacker is within your reach, strike back at once for 0 AP. Your Riposte costs 1 Momentum and adds your Counter bonus to hit; with no Momen... | stat_mod:technique:riposte, roll_mod, resource:momentum, cancel | DEP: the Answer Riposte uses Raw Power counter number (Raw Power each from 2: +1 to your counter-attacks). Class gives the Answer, ladder the bonus. |
| II | read_the_swing | Read the Swing | 0, per_round | Once a round, a melee attack that misses you gives you 1 Momentum. | resource:momentum | DISTINCT: Momentum on a miss against you; no ladder twin (Guts every point slows Momentum loss). |
| III | finisher (ref fighter.finisher) | Measured Blow | 0, per_combat | Once a fight, when one of your Finishers (Cleave, Break, Coup, Launch) is done, 1 of the Momentum it spent comes back to you: a Finisher that did not spend it all. | resource:momentum | DUP: Follow Through (Raw Power level 5): a killing Finisher keeps Momentum. Measured Blow returns 1 Momentum once a fight on any Finisher. |
| III | unstoppable | Unstoppable | 1, per_scene | Costs 1 AP, once per scene. Until your next turn starts, Fear, Shaken, Slowed and Pinned don't affect you, and nobody gets an opportunity attack on you. You also gain 2 Momentum. Any of those conditions you already had are only se... | grant_action:unstoppable, immunity, ignore_opportunity_attacks, resource:momentum | DUP (part): Steady (Guts 3) already stops Fear halting you; Unstoppable adds Shaken/Slowed/Pinned immunity and no opportunity attacks. |

### 4. Forks of the alpha (raw_power)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Rolling Start | fork.momentum.rolling_start | built | - | - | - |
| 4 | Grindstone | fork.momentum.grindstone | built | - | - | - |
| 6 | Spill | fork.momentum.spill | SHELVED | N21 | N21: NOT BUILT: on_kill payload is victim, by, src, ownTurn (ENGINE-HOOKS line 339) | A kill carries no overkill (on_kill has no `over`: N21, not approved). The cheaper wording (the Momentum spent × k to the foe behind) needs the Momentum a Finisher spent as a number, which no source carries (rules 1.60 item 4623). |
| 6 | Headlong | fork.momentum.headlong | SHELVED | (nothing: waits on its step's other option) | - | Its step is not offered (Spill waits on N21), so it is not built in this slice; it needs only approved pieces (N10, N23) and an optional price, built with Spill. |

Step 4 offered to players: yes.

Step 6 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

### 5. Gamma Call: Intimidation

Threaten (call.threaten), hindering Call, aims at enemy. Frighten an enemy. It makes a Heart save against 12 + your strength with Intimidation. If it fails, it is Shaken for 3 rounds and loses AP on its next turn.

| Step at | Effect (short) |
|---|---|
| 1 | If it fails its save: Shaken and 1 AP less |
| 3 | And it can't move toward you on its turn |
| 7 | 2 AP less, and it can't move toward you |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; NO reaction at 9 (a hindering Call only on your own turn); the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Agility

Alpha Dexterity (dexterity), beta Athletics, gamma Reaction Speed (reaction_speed). Base class Skirmisher (marksman).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Dexterity (dexterity, alpha)
Every point (at: each rows, not counted as a level content): +1 to hit with guns, light blades and thrown weapons.; +2% critical damage.; You throw half a tile further.; Your shooting techniques are harder to save against.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | **Pressure** [Active Skill, mastery 0] Every hit you roll with Dexterity adds Pressure (pips that ... (ops: resource, roll_mod, condition, resource...) | - | - | pressure.json verb Slide | - |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | at 3: Near Miss (a held shot that misses still adds Pressure) and Shaken ... | **Speed Load** [AP Mod, mastery 1] Reloading costs 1 AP less. (ops: stat_mod:ap_cost:reload, perk_choice:dexterity) | - | perk step M1 | - | MULTI(3) |
| 4 | - | - | Fork: Converging Fire or Walk It In | - | - | - |
| 5 | at 5: Flush Out opens: your Flush, or a Dexterity blow on a Pressed ... | **Quick Draw** [AP Mod, mastery 2] Once a fight, your first attack with a weapon you ... (ops: cost_mod:attack_with_a_drawn_weapon) | - | perk step M2 | - | MULTI(3) |
| 6 | - | - | Fork: Through the Gap or Lockdown | - | - | - |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Athletics (athletics, beta)
Every point (at: each rows, not counted as a level content): you shake off more of your own Pressure at the end of a plain ...

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | each from 2: +1 Defense: you are harder to hit. | - | - | - | - | - |
| 3 | - | **Vault** [Combat Interaction, mastery 1] Move over cover and obstacles at no extra movement cost. (ops: stat_mod:ignore_obstacle_move_cost, perk_choice:athletics) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Untouchable** [Active Skill, mastery 2] While you wear no torso armour, attacks on you roll ... (ops: disadvantage) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Reaction Speed (reaction_speed, gamma)
Every point (at: each rows, not counted as a level content): +1 Initiative: you act earlier in the round.; Your Cue reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Shoot First** [Combat Starter, mastery 1] You act in the surprise round even when your side ... (ops: grant_action:act_in_surprise_round, perk_choice:reaction_speed) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Cut In** [Conversation Quirk, mastery 2] Once a scene, cut in on someone mid-sentence or mid-action ... (ops: grant_action:cut_in) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | Call as a reaction, 0 AP | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Pressure | 1 | skills.json dexterity.unlocks.1 (Active Skill) | Dexterity |
| Speed Load | 3 | skills.json dexterity.unlocks.3 (AP Mod) | Dexterity |
| Quick Draw | 5 | skills.json dexterity.unlocks.5 (AP Mod) | Dexterity |
| Slide | 1 | pressure.json | Dexterity |
| Near Miss | 3 | per_point at 3 / self_skill 3 | Dexterity |
| Shaken Nerves | 3 | self_skill 3 | Dexterity |
| Flush Out (and its blade twin) | 5 | self_skill 5 | Dexterity |
| Vault | 3 | skills.json athletics.unlocks.3 (Combat Interaction) | Athletics |
| Untouchable | 5 | skills.json athletics.unlocks.5 (Active Skill) | Athletics |
| Shoot First | 3 | skills.json reaction_speed.unlocks.3 (Combat Starter) | Reaction Speed |
| Cut In | 5 | skills.json reaction_speed.unlocks.5 (Conversation Quirk) | Reaction Speed |

### 3. Base class Skirmisher (classes.json base marksman): moves and ladder overlap

Resource(s): ['heat']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | fire_discipline (ref marksman.fire_discipline) | Fire Discipline | 0, at_will | Your Aimed attacks have +1 to hit, and with a weapon that has Heat they add none. Once a turn, on your turn, a weapon technique that costs 3 AP or more costs 1 AP less (a Burst, a Mag Dump, a dear blow: any weapon). The attacks ev... | heat_mod:aimed_shot, cost_mod, use, roll_mod | DUP (family): AP cuts as Speed Load (Dexterity 3: reload 1 AP less) and Quick Draw (Dexterity 5: first drawn attack free); not the same rows. |
| I | speed_loader | Hold the Lane | 0, at_will | Your held shots (Overwatch, Deny, Cover Me, Dead to Rights) cost 1 AP less, never less than 1 AP. | cost_mod | DEP: held shots (Overwatch, Deny, Cover Me, Dead to Rights) are the ones Near Miss (Dexterity 3) rewards; no ladder duplicate. |
| II | special_ammo (ref marksman.special_ammo) | Special Ammo | None, per_rest | You carry one load each of armour-piercing, hollow-point and incendiary ammunition, restocked when you rest, for any weapon but a grenade or other consumable: a weapon that takes a magazine loads it as a magazine, one that draws f... | resource:ammo | DISTINCT: no ladder twin. |
| II | duck_and_roll | Duck and Roll | 0, reaction | When a ranged weapon attack targets you, you step 1 tile before it is rolled, for no AP. It uses your reaction and happens by itself when a step helps. If the step takes you out of the attacker's sight, the attack isn't made; if i... | reaction, free_move, to_hit_against_self | DUP (family): Athletics gives +1 Defense each point from 2, Vault (3), Untouchable (5): defence by movement; the reaction step is distinct. |
| III | killzone (ref marksman.killzone) | Killzone | None, at_will | Hold two attacks with any weapon instead of one, for twice the attack's AP. You make one at each of the first two different enemies that move into your line of fire or your reach, both at +2 to hit. The first one spends 2 reaction... | grant_action:overwatch_double, tn_mod | DISTINCT: no ladder twin. |
| III | run_and_gun | Run and Gun | 0, per_turn | Once a turn, after you attack, your next move of up to 2 tiles costs no AP and draws no opportunity attack, and your next hit this turn, with any weapon, adds 1 more Pressure. It is a free move of its own, apart from Fire and Move... | mark, cost_mod, resource:pressure, mark | DEP: adds Pressure (the Dexterity door) and a free move like Slide (Dexterity 1) and Fire and Move (classes.json fire_and_move); check against Slide. |

### 4. Forks of the alpha (dexterity)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Converging Fire | fork.pressure.converging_fire | built | - | - | - |
| 4 | Walk It In | fork.pressure.walk_it_in | built | - | - | - |
| 6 | Through the Gap | fork.pressure.through_the_gap | built | - | - | - |
| 6 | Lockdown | fork.pressure.lockdown | built | - | - | - |

Step 4 offered to players: yes.

Step 6 offered to players: yes.

### 5. Gamma Call: Reaction Speed

Cue (call.cue), helping Call, aims at ally. Give an ally one more reaction. They must use it before the start of your next turn.

| Step at | Effect (short) |
|---|---|
| 1 | An ally gets one more reaction |
| 3 | Or they step at once to a tile you name |
| 7 | And if they have not acted yet, they go straight after you |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; as a reaction for 0 AP once a round at 9; the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Perception

Alpha Ingenuity (ingenuity), beta Acuity, gamma Vigilance (vigilant). Base class Operative (infiltrator).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Ingenuity (ingenuity, alpha)
Every point (at: each rows, not counted as a level content): Your traps, poisons and unseen acts are harder to save against.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | **Shadow** [Active Skill, mastery 0] You fill Shadow while unseen: 1 for a turn you ... (ops: resource, resource, resource, resource...) | - | - | shadow.json verb Tag | - |
| 2 | every 2: Enemies need 1 more to spot you while you sneak. | - | - | - | - | - |
| 3 | - | - | - | Mastery 1 | shadow.json verb Lift; shadow.json verb Read Intent; shadow.json verb Cut the Strap ... +1 more | - |
| 4 | - | - | Fork: Light Fingers or Lend the Dark | - | - | - |
| 5 | - | - | - | Mastery 2 | shadow.json verb Fade; shadow.json verb Open Seam; shadow.json verb Foul the Action ... +3 more | - |
| 6 | - | - | Fork: Lightkiller or Spotter | - | - | - |
| 7 | - | - | - | Mastery 3 | shadow.json verb Timing; shadow.json verb Plant; shadow.json verb Disable ... +1 more | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | shadow.json verb Hijack | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Acuity (analysis, beta)
Every point (at: each rows, not counted as a level content): While you are Hidden, foes need more to find you: the more points you ...; You take 5% less critical damage.; Analyze reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Quick Read** [AP Mod, mastery 1] Analyze costs 1 AP less. (ops: stat_mod:ap_cost:analyze, perk_choice:analysis) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Read Them** [Passive, mastery 2] Enemies you have analysed deal 15% less damage to your ... (ops: damage_reduction) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Vigilance (vigilant, gamma)
Every point (at: each rows, not counted as a level content): You notice traps, hidden things and hidden enemies 1 better.; You notice them 1 tile further off.; Your Spot reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Cold Spine** [Combat Starter, mastery 1] When a hidden enemy aims at you, you learn which ... (ops: stat_mod:reveal_aimer_direction, perk_choice:vigilant) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **The Tell** [Conversation Quirk, mastery 2] In any conversation, you notice hidden weapons and hostile intent. (ops: narrator) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Shadow | 1 | skills.json ingenuity.unlocks.1 (Active Skill) | Ingenuity |
| Tag | 1 | shadow.json | Ingenuity |
| Break, Go to Ground, First Shade, Tagged | 1 | door unlock Shadow text | Ingenuity |
| Lift, Read Intent, Cut the Strap, Decoy | 3 | shadow.json | Ingenuity |
| Fade, Open Seam, Foul the Action, Vault, Pick, Douse | 5 | shadow.json | Ingenuity |
| Timing, Plant, Disable, Rig | 7 | shadow.json | Ingenuity |
| Hijack | 9 | shadow.json | Ingenuity |
| Quick Read | 3 | skills.json analysis.unlocks.3 (AP Mod) | Acuity |
| Read Them | 5 | skills.json analysis.unlocks.5 (Passive) | Acuity |
| Cold Spine | 3 | skills.json vigilant.unlocks.3 (Combat Starter) | Vigilance |
| The Tell | 5 | skills.json vigilant.unlocks.5 (Conversation Quirk) | Vigilance |

### 3. Base class Operative (classes.json base infiltrator): moves and ladder overlap

Resource(s): ['marks', 'toxins', 'shadow']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | mark (ref assassin.mark) | Mark | 1, at_will | Costs 1 AP. An enemy you can see becomes Marked until the fight ends: your squad gets +1 to hit it, and it can't become Hidden. You can keep 3 enemies Marked; a fourth Mark lifts the oldest one. | condition | DEP: Marked is read by Tagged (Shadow door text) and Read Them (Acuity 5). Tag (shadow.json, Ingenuity 1) is a near-twin verb: check. |
| I | vanish | Vanish | 0, at_will | Your Fade (Ingenuity's door) is 2 Shadow cheaper: it takes none at all. | cost_mod | DEP: Fade is a shadow.json verb at Ingenuity 5; Vanish makes it free. Depends on that verb. |
| II | toxin (ref assassin.toxin) | Toxin | 1, at_will | Costs 1 AP and 1 toxin dose. Coat the weapon in your hand, whatever it is, and choose Weakened, Slowed or Bleeding. Your next hit with it forces a Body save against 12 + your strength with Ingenuity, and the target takes that cond... | resource:toxin, condition | DISTINCT: no ladder twin. |
| II | sabotage | Sabotage | 2, at_will | Costs 2 AP. Disable an enemy machine, turret or drone next to you: it is Stunned for 1 round, with no save and no Shadow spent. Or break a barricade next to you. Or rig your own tile: the next enemy to step on it takes 30 damage, ... | grant_action:sabotage, disable_machine, rig_tile | DUP (family): shadow.json verbs Disable (Ingenuity 7) and Rig (7) disable machines / rig tiles; check overlap with Sabotage. |
| III | execution (ref assassin.execution) | Execution | 0, at_will | When your hit leaves a Marked enemy at a quarter of its max HP or less, it dies outright. Bosses and Celestials are immune. | execute | DEP: reads Marked; no twin. |
| III | called_shot (ref gunslinger.called_shot) | Called Shot | 3, at_will | Costs 3 AP. With any weapon (a shot, a throw, or a strike in reach), name the head, an arm or a leg and attack at -2 to hit, or with no penalty while the target can't see you. A hit causes that injury without needing a critical hi... | attack_mod, condition | DISTINCT: no ladder twin. |

### 4. Forks of the alpha (ingenuity)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Light Fingers | fork.shadow.light_fingers | SHELVED | N12 | N12: NOT BUILT: op take has fields save, via only (ENGINE-HOOKS line 182) | The take op takes a throwable or a magazine to the pile; taking anything carried into the pack needs its fields what and to (N12, not approved). The spec gives no cheaper wording that keeps the point. |
| 4 | Lend the Dark | fork.shadow.lend_the_dark | SHELVED | (nothing: waits on its step's other option) | - | Its step is not offered (Light Fingers waits on N12), so it is not built in this slice; it needs only existing pieces (grant_action with reach, condition hidden on the target) once Light Fingers comes. |
| 6 | Lightkiller | fork.shadow.lightkiller | SHELVED | N9 | N9: NOT BUILT: DATA_ZONE_KINDS = [sanctuary] (magic.ts:60) | The zone op may not lay the smoke kind (N9, not approved); the spec gives no cheaper wording. |
| 6 | Spotter | fork.shadow.spotter | built | - | - | - |

Step 4 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

Step 6 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

### 5. Gamma Call: Vigilance

Spot (call.spot), hindering Call, aims at enemy. Point out an enemy to your allies. There is no save. The mark lasts until the start of your next turn and is used up when an ally attacks that enemy; you can't use it yourself.

| Step at | Effect (short) |
|---|---|
| 1 | The next ally to attack it ignores its cover |
| 3 | And can attack it even while it is Hidden |
| 7 | The next 2 allies, with +1 to hit |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; NO reaction at 9 (a hindering Call only on your own turn); the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Intelligence

Alpha Brain Power (brain_power), beta Rumination, gamma Eloquence (eloquence). Base class Sigilist (mage).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Brain Power (brain_power, alpha)
Every point (at: each rows, not counted as a level content): +10% Sigil power (spells of glyphs drawn on the ground).; You know 1 more Sigil word.; Your Sigils' conditions are harder to save against.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | every 2: Your Sigils reach 1 tile further and last 1 round longer. | - | - | - | - | - |
| 3 | every 3: Each Sigil burns 1 less core charge. | **Overclock** [Active Skill, mastery 1] Draw a spell one word longer than you know (never ... (ops: grant_action:overclock, resource, perk_choice:brain_power) | - | perk step M1 | - | MULTI(3) |
| 4 | - | - | Fork: Overflux or Clean Vent | - | - | - |
| 5 | - | **Twin Draw** [Combat Interaction, mastery 2] Once a fight, draw the glyphs of two Sigil spells ... (ops: grant_action:twin_draw) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | Fork: Written in Advance or Running Script | - | - | - |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Rumination (rumination, beta)
Every point (at: each rows, not counted as a level content): your Flux limit (the heat your glyphs can build) rises by 1% for every ...; +1 on Brain saves: against confusion, illusions and your mind being turned.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Index** [Passive, mastery 1] Once a scene, ask the Narrator one factual question about ... (ops: grant_action:index_question, narrator, perk_choice:rumination) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Proven Formula** [Passive, mastery 2] +3 on saves against a spell or condition that has ... (ops: save_mod) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Eloquence (eloquence, gamma)
Every point (at: each rows, not counted as a level content): Persuading an enemy in a fight is harder for it to resist.; Your Brief reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Objection!** [Conversation Quirk, mastery 1] When someone makes a claim in front of others, roll ... (ops: narrator, perk_choice:eloquence) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Opening Argument** [Combat Starter, mastery 2] Debate the enemy leader before a fight; on a success, ... (ops: grant_action:opening_argument, narrator) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | Call as a reaction, 0 AP | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Overclock | 3 | skills.json brain_power.unlocks.3 (Active Skill) | Brain Power |
| Twin Draw | 5 | skills.json brain_power.unlocks.5 (Combat Interaction) | Brain Power |
| Sigils from 1, Line of 2 to 4 | 1 | door_line | Brain Power |
| charge cut every 3 | 3 | per_point every 3 | Brain Power |
| Index | 3 | skills.json rumination.unlocks.3 (Passive) | Rumination |
| Proven Formula | 5 | skills.json rumination.unlocks.5 (Passive) | Rumination |
| Objection! | 3 | skills.json eloquence.unlocks.3 (Conversation Quirk) | Eloquence |
| Opening Argument | 5 | skills.json eloquence.unlocks.5 (Combat Starter) | Eloquence |

### 3. Base class Sigilist (classes.json base mage): moves and ladder overlap

Resource(s): ['flux']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | barrage (ref mage.barrage) | Barrage | 0, at_will | The damage words FIRE, FREEZE, SHOCK, STONE and ACID cost 1 charge less to draw: 1 instead of 2. SPARK and GALE already cost the least a glyph can and stay there, because no glyph costs less than 1 charge. | word_cost, cost_mod | DUP: Brain Power every 3 ("Each Sigil burns 1 less core charge") is the same lever as Barrage (damage words cost 1 charge less). |
| I | core_change | Core Change | 0, at_will | Swapping a spent mana core costs 1 AP less, but never less than 1 AP. | action_cost:swap_core | DISTINCT (swap a core cheaper). |
| II | overcharge (ref mage.overcharge) | Overcharge | 0, per_combat | Once per fight, for 0 AP: the next glyph you draw costs no charge and no AP, and its spell may hold one word more than your Max Sigil words (never more than 4 glyphs). The glyph still adds Flux. | word_cost | DUP: Overclock (Brain Power 3): a spell one word longer than you know, never past four, for more charge. Overcharge is the same extension free once a fight. |
| II | bleed_the_flux | Bleed the Flux | 0, at_will | Venting costs 1 AP less, so a 1 AP Vent is free. After you Vent, the next glyph you draw adds 1 Flux less. | action_cost:vent, resource:flux | DEP: Flux and Vent are the door; fork Clean Vent (Brain Power 4, shelved) also uses Vent. |
| III | payload (ref mage.payload) | Payload | 0, at_will | Evoke a Line with double area. A SPREAD radius and a PUSH cone's length are doubled; a spell with neither fires one more missile, as one more TWICE would. On top of the Flux its glyphs already added, the Evoke adds Flux equal to i... | area_mult, resource:flux | DISTINCT: no ladder twin (area double). |
| III | stored_spell (ref scribe.stored_spell) | Stored Spell | 0, at_will | Out of a fight, write a whole Sigil spell onto an object: name its words (ones you know, up to your Max Sigil words) and pay its charge now. In a fight, with an Evoker in hand, you set off your oldest stored spell for 1 AP: it goe... | grant_action:trigger_stored_spell | DISTINCT: no ladder twin; reads Rumination modifier. |

### 4. Forks of the alpha (brain_power)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Overflux | fork.sigil.overflux | SHELVED | N15 | N15: NOT BUILT: no overload_lock stat | The Overload's lock is code, not a stat (N15, not approved); the spec gives no cheaper wording. |
| 4 | Clean Vent | fork.sigil.clean_vent | SHELVED | N22 | N22: NOT BUILT: hooks vent, strain, outburst_hold exist; no trigger for vent or held_turn_start (35 triggers) | The Vent is a hook, not a trigger (N22, not approved), so no row hears the Flux vented. Its step is not offered (Overflux waits on N15) either. |
| 6 | Written in Advance | fork.sigil.written_in_advance | SHELVED | N14 | N14: NOT BUILT: no line_age / keep in engine src | A glyph carries no age (N14, not approved). Its step is not offered (Running Script waits on N14 too). |
| 6 | Running Script | fork.sigil.running_script | SHELVED | N14 | N14: NOT BUILT: no line_age / keep in engine src | An Evoke clears its glyphs (N14, not approved); the spec gives no cheaper wording. |

Step 4 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

Step 6 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

### 5. Gamma Call: Eloquence

Brief (call.brief), helping Call, aims at ally. Make an ally's next actions cost less AP. The discount lasts until the end of their next turn, and an action that costs no AP doesn't use it up.

| Step at | Effect (short) |
|---|---|
| 1 | Their next action costs 1 AP less |
| 3 | Their next two actions cost 1 AP less each |
| 7 | Next action 2 AP less, the one after 1 less |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; as a reaction for 0 AP once a round at 9; the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Expression

Alpha Visualization (visualization), beta Improvisation, gamma Charisma (charisma). Base class Rigger (trickster).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Visualization (visualization, alpha)
Every point (at: each rows, not counted as a level content): Your Figments (shapes you build of mana) reach 1 tile further.; Your Figments are more accurate.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | **Figments** [Active Skill, mastery 0] With the Visualizer in hand, Picture a Figment: the Double ... (ops: ) | - | - | figments.json ladder: The door: Picture, the Double and the Snare, 1 held, range 5; Glimmer, Redraw and Cash in. The Visualizer also works out of a fight. | - |
| 2 | at 2: You can Picture the Hand. | - | - | - | figments.json ladder: The Hand. | - |
| 3 | - | - | - | Mastery 1 | figments.json ladder: 2 ready designs, one trait each. | - |
| 4 | - | - | Fork: the Eye, the Wall or the Ward | - | figments.json ladder: Choose one: the Eye, the Wall or the Ward (the first fork). | - |
| 5 | - | **Two held** [Active Skill, mastery 2] Two Figments held at once, and three ready designs. (ops: ) | - | perk step M2 | figments.json ladder: 2 held; 3 ready designs. | MULTI(2) |
| 6 | - | - | Fork: the Beast, the Blade, the Husk or the Sentinel | - | figments.json ladder: Choose one: the Beast, the Blade, the Husk or the Sentinel (the second fork). | - |
| 7 | - | - | - | Mastery 3 | figments.json ladder: 3 held; two traits a design; one more form from the first choice. | - |
| 8 | at 8: Four ready designs, and one more shape from your second fork. | - | - | - | figments.json ladder: 4 ready designs; one more form from the second choice. | - |
| 9 | - | - | - | Mastery 4 | figments.json ladder: A destroyed Figment no longer Snaps; one more form from either choice. | - |
| 10 | at 10: Every shape is yours, and five ready designs. | - | - | Mastered perk | figments.json ladder: Every form; 5 ready designs; the Mastered perk. | MULTI(2) |

#### Improvisation (proficiency, beta)
Every point (at: each rows, not counted as a level content): your Figments have more HP: 1% more for every point here times every point ...; You take 10% less damage from ambushes.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | each from 3: Field Repair restores more. | **Field Repair** [AP Mod, mastery 1] 2 AP and one spare part, on you or something ... (ops: grant_action:field_repair, perk_choice:proficiency) | - | perk step M1 | - | MULTI(3) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Tuned** [Passive, mastery 2] The weapon in your main hand never jams and never ... (ops: immunity) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Charisma (charisma, gamma)
Every point (at: each rows, not counted as a level content): An offer of terms is harder to refuse.; Your Rally reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Smooth** [Conversation Quirk, mastery 1] A failed lie isn't exposed straight away; the listener only ... (ops: narrator, perk_choice:charisma) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Parley** [Combat Starter, mastery 2] Before a fight, one try to talk the enemy down: ... (ops: grant_action:parley, narrator) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | Call as a reaction, 0 AP | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Figments | 1 | skills.json visualization.unlocks.1 (Active Skill) | Visualization |
| Two held | 5 | skills.json visualization.unlocks.5 (Active Skill) | Visualization |
| Double, Snare, Glimmer, Redraw, Cash in | 1 | door unlock Figments text | Visualization |
| the Hand | 2 | per_point at 2 | Visualization |
| 2 ready designs, one trait each | 3 | figments.json ladder | Visualization |
| Eye/Wall/Ward fork | 4 | figments.json | Visualization |
| 2 held, 3 designs | 5 | Two held | Visualization |
| Beast/Blade/Husk/Sentinel fork | 6 | figments.json | Visualization |
| 3 held, two traits, one more form | 7 | figments.json | Visualization |
| 4 designs, one more form | 8 | per_point at 8 | Visualization |
| no Snap, one more form | 9 | figments.json | Visualization |
| every form, 5 designs | 10 | per_point at 10 | Visualization |
| Field Repair | 3 | skills.json proficiency.unlocks.3 (AP Mod) | Improvisation |
| Tuned | 5 | skills.json proficiency.unlocks.5 (Passive) | Improvisation |
| Smooth | 3 | skills.json charisma.unlocks.3 (Conversation Quirk) | Charisma |
| Parley | 5 | skills.json charisma.unlocks.5 (Combat Starter) | Charisma |

### 3. Base class Rigger (classes.json base trickster): moves and ladder overlap

Resource(s): ['vcharge']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | false_image | Double | 2, at_will | The Rigger's Double: 2 AP and no charge, with the Visualizer in hand (Visualization not needed). A bare Double (a Figment of you) appears on a free tile your side sees within your projection range (6 tiles without the door) and la... | grant_action:false_image | DUP: the Double is the first Figment form of Visualization level 1 ("Picture a Figment: the Double or the Snare"); the Rigger gets it for no charge and no Visualization. |
| I | field_fix (ref infiltrator.field_fix) | Field Fix | 2, at_will | Costs 2 AP; no spare part, no Improvisation needed. Field Repair on yourself or a unit of your side within 2 tiles: clear a jammed weapon, restore weapon durability, or repair a robot, drone, turret, Factory Made squadmate or Figm... | grant_action:field_fix | DUP: Field Repair (Improvisation 3: 2 AP, spare part, restores durability, clears jams). Field Fix is the same with no part. |
| II | salvage | Salvage | 1, at_will | Costs 1 AP, next to you, one of: a wreck (a destroyed robot, drone, turret or machine of either side) gives 2 charge to your Visualizer core, each wreck once a fight; one of your Figments is let go with all its charge back; or rep... | grant_action:salvage | DUP (part): Cash in (Visualization 1, unmake a Figment for its charge back) is the "let go with all its charge back" option. |
| II | overclock | Redline | 1, per_turn | Costs 1 AP, once a turn. A Figment, robot, drone or turret of your side within 8 tiles that your side sees takes one of its actions now, of up to 2 AP, at no AP. It takes 5 damage, more at higher levels. Never a squadmate. (Was Ov... | grant_action:overclock | DISTINCT, name clash with Brain Power Overclock (unlock at Brain Power 3). |
| III | sleight | Sleight | 1, per_scene | Costs 1 AP, once per scene. Swap places with one of your Figments or with a standing ally within 6 tiles. The swap provokes no opportunity attacks. | grant_action:sleight, swap_places | DISTINCT: swap places with a Figment. |
| III | scrap_turret | Scrap Sentinel | 3, per_scene | Costs 3 AP, once a scene, one at a time. From a wreck, a pile with a weapon, or a barricade next to you, a Sentinel (the Figment form) stands on a free tile next to it, for no charge and outside your held count, with no upkeep, un... | grant_action:scrap_turret | DUP (part): the Sentinel is a Figment form (Visualization 6, fork b); Scrap Sentinel makes one free from a wreck. |

### 4. Forks of the alpha (visualization)

No forks.json rows. The forks live in figments.json ladder: points 4 (a: the Eye, the Wall or the Ward) and 6 (b: the Beast, the Blade, the Husk or the Sentinel); built (to-do section R lists Figments 4 and 6 as built). Not shelved.

### 5. Gamma Call: Charisma

Rally (call.rally), helping Call, aims at ally. Give an ally AP. They get it this turn if they have not acted yet this round, and on their next turn if they have.

| Step at | Effect (short) |
|---|---|
| 1 | +1 AP to an ally |
| 3 | +1 AP and 1 Pressure less |
| 7 | +2 AP and 1 Pressure less |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; as a reaction for 0 AP once a round at 9; the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Insight

Alpha Empathy (empathy), beta Camaraderie, gamma Insinuation (implication). Base class Mender (bard).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Empathy (empathy, alpha)
Every point (at: each rows, not counted as a level content): Healing you give grows.; With an Attuner, you hold more Bonds and gain more Tending moves as it ...

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | from 1: With an Attuner in hand, it opens Bonds (a thread to a ... | - | - | - | tending.json verb Threads; tending.json verb Bond; tending.json verb Let Go ... +9 more | - |
| 2 | - | - | - | - | tending.json verb Shield | EMPTY(skills.json) |
| 3 | - | **Feel Their Pain** [Combat Interaction, mastery 1] You see the health and morale of every creature in ... (ops: stat_mod:see_hp_state_in_vision, perk_choice:empathy) | - | perk step M1 | tending.json verb Raise; tending.json verb Field Surgery | MULTI(2) |
| 4 | - | - | Fork: Keep the Thread or Short Thread | - | tending.json verb Guide | - |
| 5 | - | **Mercy** [Active Skill, mastery 2] 2 AP: a humanoid enemy below half its HP makes ... (ops: grant_action:mercy) | - | perk step M2 | tending.json verb Two Bonds | MULTI(2) |
| 6 | - | - | Fork: Shared Pulse or Long Thread | - | - | - |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | tending.json verb Three Bonds | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | tending.json verb Threads That Hold | - |

#### Camaraderie (camaraderie, beta)
Every point (at: each rows, not counted as a level content): What you heal through a Bond heals you too: the more points you have ...; +10% healing you receive.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | **Share a Hit** [Reaction, mastery 0] Your reaction when a friend next to you is hit: ... (ops: redirect, redirect) | - | - | - | - |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Hand-Off** [Passive, mastery 1] Once a round, a friend next to you who is ... (ops: stat_mod:defense, perk_choice:camaraderie) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | at 5: Share a Hit also covers a Bonded friend you can see. | **Nobody Left Behind** [Passive, mastery 2] Carry a Downed friend at full Movement, and stabilise them ... (ops: stat_mod:ap_cost:stabilise, stat_mod:carry_ally_full_move) | - | perk step M2 | - | MULTI(3) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Insinuation (implication, gamma)
Every point (at: each rows, not counted as a level content): Your Taunt reaches 1 tile further.; Your Taunt is harder to shake off.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Between the Lines** [Conversation Quirk, mastery 1] When someone speaks in code or hides their meaning, the ... (ops: narrator, perk_choice:implication) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Veiled Insult** [Combat Starter, mastery 2] Before a fight, taunt one enemy in metaphor: it makes ... (ops: grant_action:veiled_insult) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Feel Their Pain | 3 | skills.json empathy.unlocks.3 (Combat Interaction) | Empathy |
| Mercy | 5 | skills.json empathy.unlocks.5 (Active Skill) | Empathy |
| Bonds and Tending open | 1 | per_point from 1 | Empathy |
| Bond, Let Go, Snap, Tug, Mend, Mend Yourself, Touch, Settle, Soothe, Last Thread, Threads | 1 | tending.json | Empathy |
| Shield | 2 | tending.json | Empathy |
| Raise, Field Surgery | 3 | tending.json | Empathy |
| Guide | 4 | tending.json | Empathy |
| Two Bonds | 5 | tending.json | Empathy |
| Three Bonds | 8 | tending.json | Empathy |
| Threads That Hold | 10 | tending.json | Empathy |
| Share a Hit | 1 | skills.json camaraderie.unlocks.1 (Reaction) | Camaraderie |
| Hand-Off | 3 | skills.json camaraderie.unlocks.3 (Passive) | Camaraderie |
| Nobody Left Behind | 5 | skills.json camaraderie.unlocks.5 (Passive) | Camaraderie |
| Between the Lines | 3 | skills.json implication.unlocks.3 (Conversation Quirk) | Insinuation |
| Veiled Insult | 5 | skills.json implication.unlocks.5 (Combat Starter) | Insinuation |

### 3. Base class Mender (classes.json base bard): moves and ladder overlap

Resource(s): ['mp', 'ledger']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | triage (ref medic.triage) | Triage | 2, at_will | Your Touch, the medic's way: 2 AP and 18 MP (less than a Touch), with an Attuner in hand: an ally next to you, or a Bonded ally you see, heals 4.3 × your Healing given, more as you level, as a Touch does, and it also stops Bleedin... | grant_action:triage | DEP: Touch and Mend are tending.json verbs open from Empathy 1; Triage is Touch with a cheaper MP price. Near-duplicate of Touch. |
| I | ledger | The Ledger | 0, at_will | Every heal you give that restores HP and every shield you give, to an ally or to yourself, is counted in your Ledger, up to 6.5 × your Healing given, more as you level. Your next damage to an enemy by your own blow, with any weapo... | resource:ledger, resource:ledger, damage_mod | DISTINCT: no ladder twin (Ledger turns heals into damage). |
| II | inspire (ref bard.inspire) | Inspire | 1, at_will | 1 AP and 30 MP, with an Attuner in hand: give a unit Bonded to you, in sight, a feeling you have felt. An ally gets a bonus on its next roll to hit and the feeling's boon until the end of its next turn (Love heals it 1.9 × your He... | grant_action:inspire | DISTINCT: no ladder twin. |
| II | take_the_weight | Take the Weight | 0, at_will | Your protective reaction: when a Bonded ally you see would go Down, it stays at 1 HP and you lose 15% of your max HP (only while you are above 25% of it, so it never Downs you); or when a Bonded ally would be Stunned, Dazed or Afr... | floor, cancel | DUP (part): Share a Hit (Camaraderie 1) takes a share of a friend hit; Take the Weight prevents Down/Stun on a Bonded ally. |
| III | mend (ref bard.mend) | Brimming | 0, at_will | Tending you give that heals past an ally's max HP leaves 50% of the excess as a shield on it (the larger shield stands). | mend | DEP: overflow of Tending heal as shield; reads Mend, Empathy verb. |
| III | rally | Rally | 2, per_scene | 2 AP and 60 MP, once a scene, with an Attuner in hand: every Bonded ally wherever it is, and every ally within 4 tiles, heals 3.1 × your Healing given, more as you level, and loses Fear and Shaken. It doesn't heal you or a Downed ... | grant_action:rally | DEP: a Tending-type heal in an area; Nobody Left Behind (Camaraderie 5) is the nearest ladder piece, not a twin. |

### 4. Forks of the alpha (empathy)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Keep the Thread | fork.tend.keep_the_thread | built | - | - | - |
| 4 | Short Thread | fork.tend.short_thread | built | - | - | - |
| 6 | Shared Pulse | fork.tend.shared_pulse | built | - | - | - |
| 6 | Long Thread | fork.tend.long_thread | SHELVED | N20 | N20: NOT BUILT: trigger cost has actor only, no target (triggers.ts:86) | A price cannot see its target (the cost trigger resolves no target: N20, not approved), so once per Bonded ally per round cannot be counted; the spec's cheaper wording (uncapped) is the one it rejects. |

Step 4 offered to players: yes.

Step 6 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

### 5. Gamma Call: Insinuation

Taunt (call.taunt), hindering Call, aims at enemy. Goad an enemy. It makes a Heart save against 12 + your strength with Insinuation. If it fails, it is Taunted for 1 round: its next attack must be aimed at you, if it can see you.

| Step at | Effect (short) |
|---|---|
| 1 | If it fails its save, its next attack must be at you |
| 3 | And that attack costs it 1 AP more |
| 7 | That attack costs it 2 AP more |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; NO reaction at 9 (a hindering Call only on your own turn); the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Determination

Alpha Will Power (will_power), beta Composure, gamma Lore Master (lore_master). Base class Channeler (channeler).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Will Power (will_power, alpha)
Every point (at: each rows, not counted as a level content): +10% Soul power and +10% mana syphoned.; Your Outbursts (Soul spells you charge, then release) are harder to save against.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | every 2: +1 Strain limit (what your heart can take), and your Outbursts reach ... / every 2: You keep 1 more design ready. | - | - | - | - | MULTI(2) |
| 3 | every 3: 1 more module slot in a design. / from 3: 1 Pump of an Outburst each round is free. | **Overdraw** [Active Skill, mastery 1] Once a turn, a Pump can add two stages instead ... (ops: grant_action:overdraw, perk_choice:will_power) | - | perk step M1 | - | MULTI(4) |
| 4 | - | - | Fork: Ride the Edge or Slow Burn | - | - | - |
| 5 | - | **Pure Heart** [Combat Interaction, mastery 2] Once a fight, the first Strain that would Mana Short ... (ops: grant_action:pure_heart) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | Fork: Blood Price or Clean Break | - | - | - |
| 7 | from 7: A held Outburst swells without Strain. | - | - | Mastery 3 | - | MULTI(2) |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Composure (composure, beta)
Every point (at: each rows, not counted as a level content): your Strain limit rises by 1% for every point here times every point in ...; +1 on Heart saves: against fear, despair and losing your nerve.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Poker Face** [Conversation Quirk, mastery 1] Anyone questioning you or reading your lies takes −3 against ... (ops: tn_mod, perk_choice:composure) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Stand Still** [Combat Starter, mastery 2] Until you first act in a fight, enemies attacking you ... (ops: stat_mod:defense_until_first_act, grant_action:stand_still_counter) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Lore Master (lore_master, gamma)
Every point (at: each rows, not counted as a level content): Your Name It reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Old Tales** [Passive, mastery 1] Once a scene, ask the Narrator one question about a ... (ops: grant_action:old_tales_question, narrator, perk_choice:lore_master) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Ward** [AP Mod, mastery 2] 1 AP: a friend gets +3 on their next save ... (ops: grant_action:ward) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | Call as a reaction, 0 AP | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Overdraw | 3 | skills.json will_power.unlocks.3 (Active Skill) | Will Power |
| Pure Heart | 5 | skills.json will_power.unlocks.5 (Combat Interaction) | Will Power |
| Free Pump each round | 3 | per_point from 3 | Will Power |
| extra module slot every 3 | 3 | per_point | Will Power |
| extra ready design every 2 | 2 | per_point | Will Power |
| swell without Strain | 7 | per_point from 7 | Will Power |
| Poker Face | 3 | skills.json composure.unlocks.3 (Conversation Quirk) | Composure |
| Stand Still | 5 | skills.json composure.unlocks.5 (Combat Starter) | Composure |
| Old Tales | 3 | skills.json lore_master.unlocks.3 (Passive) | Lore Master |
| Ward | 5 | skills.json lore_master.unlocks.5 (AP Mod) | Lore Master |

### 3. Base class Channeler (classes.json base channeler): moves and ladder overlap

Resource(s): ['strain']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | shape (ref channeler.shape) | Shape | 0, at_will | Your free Pump each turn adds +0.12 to the multiplier. | stat_mod:free_pump_step | DEP/DUP: "from 3 a Pump each round is free" (Will Power per_point) is the free Pump; Shape raises that free Pump by +0.12. Needs the ladder number. |
| I | iron_heart | Iron Heart | 0, per_combat | Once a fight: Strain that would go over your limit stops at it. | resource:strain | DUP: Pure Heart (Will Power 5): once a fight the first Strain that would Mana Short is refused, Strain falls to the limit. Iron Heart: Strain that would go over stops at the limit (Leon 17 Nov: relieve 2 Strain at Mana Shock; not in this data yet). |
| II | storm_front (ref channeler.storm_front) | Storm Front | 0, per_turn | Once per turn, when you Begin a Damage Outburst shaped as a Bolt or a Lance, you can pay 10 MP more. When it lands, it arcs on to up to 2 more enemies within 2 tiles of the first creature it hit. Each arc is rolled on its own, at ... | area_mult, resource:mp | DISTINCT: no ladder twin (arcs to 2 more foes). |
| II | occult_library | Occult Library | 0, at_will | You can keep one more design ready. Once, out of a fight, you learn one more Outburst tone of your choice. | stat_mod:tones_known, stat_mod:ready_designs | DUP: Will Power every 2 ("You keep 1 more design ready") is the same number. The one-tone part has no ladder twin. |
| III | heart_surge (ref channeler.heart_surge) | Heart Surge | 0, per_turn | Once per turn, when you Release an Outburst or snap cast one (Begin and Release at once), you can make it fire one stage higher, never past the top stage (a full heart has nothing to surge into), and a snap cast fires at stage 1. ... | stat_mod:release_stage, resource:strain | DUP (family): Overdraw (Will Power 3): a Pump may add two stages instead of one once a turn. Heart Surge raises the Release stage by one for double Strain. |
| III | eye_of_the_storm | Eye of the Storm | 0, per_scene | Once per scene, on your turn, for 0 AP: your next Release this turn adds no Strain, and its tone's rider counts as one stage higher (stage 4 at most). If you don't Release this turn, the use is lost. | grant_action:eye_of_the_storm, release_mod | DISTINCT: a Release with no Strain. |

### 4. Forks of the alpha (will_power)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Ride the Edge | fork.soul.ride_the_edge | SHELVED | (nothing: waits on its step's other option) | - | Its step is not offered (Slow Burn waits on N22), so it is not built in this slice; it needs N3b and N10's `at: limit` (approved), built with Slow Burn. |
| 4 | Slow Burn | fork.soul.slow_burn | SHELVED | N22 | N22: NOT BUILT: hooks vent, strain, outburst_hold exist; no trigger for vent or held_turn_start (35 triggers) | The held turn's start is a hook, not a trigger (N22, not approved); the spec gives no cheaper wording. |
| 6 | Blood Price | fork.soul.blood_price | SHELVED | N18 | N18: NOT BUILT: no pump cost site among 42 | The Pump is not on the cost hook and a price cannot be paid in HP (N18, not approved); the spec's cheaper wording still needs the Pump on a hook. |
| 6 | Clean Break | fork.soul.clean_break | SHELVED | (nothing: waits on its step's other option) | - | Its step is not offered (Blood Price waits on N18), so it is not built in this slice; it needs N3b (approved), built with Blood Price. |

Step 4 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

Step 6 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

### 5. Gamma Call: Lore Master

Name It (call.name_it), helping Call, aims at self-or-ally. Tell an ally, or yourself, what they are facing, so it can't get into their head. They get a bonus on all their saves until the start of your next turn.

| Step at | Effect (short) |
|---|---|
| 1 | +2 on all saves |
| 3 | +3 on all saves and a new save against one condition |
| 7 | +4 on all saves, a new save, and Shaken and Afraid end |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; as a reaction for 0 AP once a round at 9; the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).

---

## Virtue

Alpha Faith (faith), beta Conscience, gamma Authority (authority). Base class Chaplain (guardian).

### 1. Ladders (data/skills.json items[].unlocks and per_point.rows)

#### Faith (faith, alpha)
Every point (at: each rows, not counted as a level content): +10% Blessing power.; Hymns (strong prayers that must wait) come back 0.75 round sooner, never sooner than ...; Your Blessings' conditions are harder to save against.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Answered Prayer** [Active Skill, mastery 1] Once a fight, reset your prayers' wait. (ops: grant_action:answered_prayer, perk_choice:faith) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | Fork: Round of Blessings or Steadfast | - | - | - |
| 5 | - | **Deliver the Sinner** [Combat Interaction, mastery 2] Your patron's blows (Smite, Amen, Rebuke, a Hymn's or an ... (ops: damage_vs) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | Fork: Benediction or Held Breath | - | - | - |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Conscience (conscience, beta)
Every point (at: each rows, not counted as a level content): Every shield your prayers give (Protection, a Hymn's shield, the Ward) is 1% stronger ...; +10% to every shield you are given.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | **Prayer shields** [None, mastery 0] Prayer shields: +1% per Faith point, for each Conscience point. (ops: mend_mult) | - | - | - | - |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Foresight** [Passive, mastery 1] Before a big decision, ask the Narrator for its worst ... (ops: narrator, perk_choice:conscience) | - | perk step M1 | - | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Righteous** [AP Mod, mastery 2] While you protect innocents, your first action each turn costs ... (ops: stat_mod:ap_cost:first_action_when_protecting, narrator) | - | perk step M2 | - | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | - | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | - | - |
| 10 | - | - | - | Mastered perk | - | - |

#### Authority (authority, gamma)
Every point (at: each rows, not counted as a level content): Karma moves 1 further each time it changes, up or down.; Your Order reaches 1 tile further.

| Lv | per-point rows starting here | unlock (name, category, step, effect, ops) | fork | perk step | in other files | flag |
|---|---|---|---|---|---|---|
| 1 | - | - | - | - | Call step (calls.json) | EMPTY(skills.json) |
| 2 | - | - | - | - | - | EMPTY(skills.json) |
| 3 | - | **Rank Has Privileges** [Conversation Quirk, mastery 1] Lower-ranked people (soldiers, guards, clerks) follow reasonable orders without a ... (ops: narrator, perk_choice:authority) | - | perk step M1 | Call step (calls.json) | MULTI(2) |
| 4 | - | - | - | - | - | EMPTY(skills.json) |
| 5 | - | **Five Stars** [Combat Starter, mastery 2] Your squad has +1 AP in the first round, and ... (ops: stat_mod:squad_ap_round1) | - | perk step M2 | Call costs 1 AP | MULTI(2) |
| 6 | - | - | - | - | - | EMPTY(skills.json) |
| 7 | - | - | - | Mastery 3 | Call step (calls.json) | - |
| 8 | - | - | - | - | - | EMPTY(skills.json) |
| 9 | - | - | - | Mastery 4 | Call as a reaction, 0 AP | - |
| 10 | - | - | - | Mastered perk | first Call each turn free | - |

### 2. Old perks folded into the ladder (abilities in their own right, with the level earned)

| Ability | Level | Where it lives | Skill |
|---|---|---|---|
| Answered Prayer | 3 | skills.json faith.unlocks.3 (Active Skill) | Faith |
| Deliver the Sinner | 5 | skills.json faith.unlocks.5 (Combat Interaction) | Faith |
| Whisper/Hymn/Devotion door | 1 | door_line (prayer) | Faith |
| Prayer shields | 1 | skills.json conscience.unlocks.1 (None) | Conscience |
| Foresight | 3 | skills.json conscience.unlocks.3 (Passive) | Conscience |
| Righteous | 5 | skills.json conscience.unlocks.5 (AP Mod) | Conscience |
| Rank Has Privileges | 3 | skills.json authority.unlocks.3 (Conversation Quirk) | Authority |
| Five Stars | 5 | skills.json authority.unlocks.5 (Combat Starter) | Authority |

### 3. Base class Chaplain (classes.json base guardian): moves and ladder overlap

Resource(s): ['devotion']. Rank I gained at level 3; rank II at attribute 5, rank III at attribute 8 (data threshold).

| Rank | Move id | Name | AP, uses | Text (cut) | Ops | Ladder overlap |
|---|---|---|---|---|---|---|
| I | ward | Ward | 1, at_will | A Whisper only you can say, and it is your Whisper for the turn (1 AP; no MP, no Strain). An ally you can see (not you) gains a shield of 10 × your Blessing power for the rest of the fight; like every prayer's shield it grows with... | grant_action:ward | DEP: the Ward shield grows with Conscience (prayer shields: +1% per Faith point per Conscience point, Conscience level 1). Name clash with Lore Master Ward (1 AP, +3 save; different). |
| I | smite | Smite | 0, per_turn | Once a turn, on your turn, when an attack with your weapon hits an enemy that still stands (a shot, a strike, a throw, two weapons at once, a focus's own attack), your patron strikes it too: 20 × your Blessing power Soul damage, w... | deal, deal, deal, condition | DEP: Deliver the Sinner (Faith 5) adds % damage to the patron blows incl. Smite. |
| II | under_the_eye (ref lumeri_templar.under_the_eye) | Under the Eye | 0, at_will | While you are Witnessed, allies within 3 tiles of you get +2 to hit. Out of a fight they get +2 on checks the Narrator counts as on your patron's theme. | skill_mod_tag | DISTINCT: no ladder twin. |
| II | blessed_shells (ref lumeri_templar.blessed_shells) | Blessed Arms | 0, at_will | When a prayer of yours succeeds, you can load the Hymn into your weapon instead of using it at once, whatever the weapon is (a round, an arrow, an edge, a thrown blade). Your next hit with it releases it: a harmful Hymn lands on t... | grant_action:load_blessing | DISTINCT: no ladder twin. |
| III | sanctuary (ref guardian.sanctuary) | Sanctuary | 3, at_will | A Hymn only you can say (3 AP; no MP, no Strain): it starts your one Hymn wait, and no Hymn of your patron's until the wait ends. Pick a tile you can see within 6 tiles: allies on the 3×3 tiles around it, you included, take half d... | grant_action:sanctuary, grant_action:sanctuary_story, damage_mult, damage_mult | DEP: a Hymn: Answered Prayer (Faith 3) resets its wait; Conscience shield numbers apply. |
| III | judgement (ref lumeri_templar.judgement) | Verdict | 4, per_combat | Costs 4 AP and 1 Devotion (10 Devotion XP), once per fight. Make one plain attack with your weapon, whatever it is (a strike, a shot or a throw; never a Burst, an Aimed shot or a technique), that deals damage × (1 + your Blessing ... | resource:devotion, damage_mult | DISTINCT: no ladder twin. |

### 4. Forks of the alpha (faith)

| Step | Option | Id | Status | Waits for | Does the piece exist now? | Reason in data (why) |
|---|---|---|---|---|---|---|
| 4 | Round of Blessings | fork.prayer.round_of_blessings | SHELVED | N7 | N7: NOT BUILT: no whispers_per_turn stat; hymnCut still faith.ts code (faith.ts:144, 603); hymn_wait stat exists | The Hymn's wait is not a count an op can move and the prayer roll is on no hook (N7, not approved). The cheaper wording (the next Hymn's heal or shield ×1.25) needs a predicate that tells a Hymn's heal from a Whisper's: both reach heal_in as kind blessing. |
| 4 | Steadfast | fork.prayer.steadfast | SHELVED | N6 | N6: NOT FOUND (no prayer reaction kind in ENGINE-HOOKS) | A prayer as a reaction needs N6 (not approved). The cheaper wording (Health or Protection held on an ally, landing at its first hit) needs the Whisper's amount on a condition row, and a Whisper's heal and shield are faith.ts code (prayerAmount), not an amount block a row can deal. |
| 6 | Benediction | fork.prayer.benediction | SHELVED | N5, N7 | N5: NOT FOUND (blessing runner tactics.ts:426 not re-read) / N7: NOT BUILT: no whispers_per_turn stat; hymnCut still faith.ts code (faith.ts:144, 603); hymn_wait stat exists | The blessing runner reads no targets and the Hymn's wait is no count (N5, N7, not approved); the spec's cheaper wording (Intercession) is the one it rejects. |
| 6 | Held Breath | fork.prayer.held_breath | SHELVED | N7 | N7: NOT BUILT: no whispers_per_turn stat; hymnCut still faith.ts code (faith.ts:144, 603); hymn_wait stat exists | Whispers a turn are a literal, not a stat (N7, not approved); the spec's cheaper wording is to drop it. |

Step 4 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

Step 6 offered to players: NO (a step is offered only when every option is built: doorpicks.ts:81-93).

### 5. Gamma Call: Authority

Order (call.order), helping Call, aims at ally. Order an ally to do one thing right now. They do it on their reaction and it costs them no AP. You choose what they do, and it is never an attack.

| Step at | Effect (short) |
|---|---|
| 1 | An ally reloads, stands up or picks up a pile, free |
| 3 | Or moves as far as 1 AP walks them |
| 7 | 2 of those things at once |

Shared ladder (calls.json rules): costs 2 AP, reach 4 + 1 per point; 1 AP at 5; as a reaction for 0 AP once a round at 9; the first Call each turn free at 10; steps at [1, 3, 7]. Overlap: for a helping Call, 9 already gives a free (0 AP) Call, so the free first Call at 10 repeats it (to-do section R).
---

## Cross-attribute lists

### A. Levels that carry nothing

| Skill | Empty levels, skills.json only | Still empty counting other files |
|---|---|---|
| Durability (durability, alpha) | [8] | [8] |
| Pain Threshold (pain_threshold, beta) | [1, 2, 4, 6, 8] | [1, 2, 4, 6, 8] |
| Senses (sensory, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Raw Power (raw_power, alpha) | [1, 8] | [1, 8] |
| Guts (guts, beta) | [1, 2, 4, 6, 8] | [1, 2, 4, 6, 8] |
| Intimidation (intimidation, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Dexterity (dexterity, alpha) | [2, 8] | [2, 8] |
| Athletics (athletics, beta) | [1, 4, 6, 8] | [1, 4, 6, 8] |
| Reaction Speed (reaction_speed, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Ingenuity (ingenuity, alpha) | [8] | [8] |
| Acuity (analysis, beta) | [1, 2, 4, 6, 8] | [1, 2, 4, 6, 8] |
| Vigilance (vigilant, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Brain Power (brain_power, alpha) | [1, 8] | [1, 8] |
| Rumination (rumination, beta) | [1, 2, 4, 6, 8] | [1, 2, 4, 6, 8] |
| Eloquence (eloquence, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Visualization (visualization, alpha) | - | - |
| Improvisation (proficiency, beta) | [1, 2, 4, 6, 8] | [1, 2, 4, 6, 8] |
| Charisma (charisma, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Empathy (empathy, alpha) | [2, 8] | - |
| Camaraderie (camaraderie, beta) | [2, 4, 6, 8] | [2, 4, 6, 8] |
| Insinuation (implication, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Will Power (will_power, alpha) | [1, 8] | [1, 8] |
| Composure (composure, beta) | [1, 2, 4, 6, 8] | [1, 2, 4, 6, 8] |
| Lore Master (lore_master, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |
| Faith (faith, alpha) | [1, 2, 8] | [1, 2, 8] |
| Conscience (conscience, beta) | [2, 4, 6, 8] | [2, 4, 6, 8] |
| Authority (authority, gamma) | [1, 2, 4, 6, 8] | [2, 4, 6, 8] |

### B. Levels that carry two or more things (count in brackets)

| Skill | skills.json only | counting other files |
|---|---|---|
| Durability (durability, alpha) | 1(4), 3(2), 5(3) | 1(4), 3(2), 5(3) |
| Pain Threshold (pain_threshold, beta) | 3(2), 5(2) | 3(2), 5(2) |
| Senses (sensory, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 9(2), 10(2) |
| Raw Power (raw_power, alpha) | 3(2), 5(2) | 3(2), 5(2) |
| Guts (guts, beta) | 3(2), 5(2) | 3(2), 5(2) |
| Intimidation (intimidation, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 10(2) |
| Dexterity (dexterity, alpha) | 3(3), 5(3) | 1(2), 3(3), 5(3) |
| Athletics (athletics, beta) | 3(2), 5(2) | 3(2), 5(2) |
| Reaction Speed (reaction_speed, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 9(2), 10(2) |
| Ingenuity (ingenuity, alpha) | - | 1(2), 3(5), 5(7), 7(5), 9(2) |
| Acuity (analysis, beta) | 3(2), 5(2) | 3(2), 5(2) |
| Vigilance (vigilant, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 10(2) |
| Brain Power (brain_power, alpha) | 3(3), 5(2) | 3(3), 5(2) |
| Rumination (rumination, beta) | 3(2), 5(2) | 3(2), 5(2) |
| Eloquence (eloquence, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 9(2), 10(2) |
| Visualization (visualization, alpha) | 5(2), 10(2) | 1(2), 2(2), 3(2), 4(2), 5(3), 6(2), 7(2), 8(2), 9(2), 10(3) |
| Improvisation (proficiency, beta) | 3(3), 5(2) | 3(3), 5(2) |
| Charisma (charisma, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 9(2), 10(2) |
| Empathy (empathy, alpha) | 3(2), 5(2) | 1(13), 3(4), 4(2), 5(3), 10(2) |
| Camaraderie (camaraderie, beta) | 3(2), 5(3) | 3(2), 5(3) |
| Insinuation (implication, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 10(2) |
| Will Power (will_power, alpha) | 2(2), 3(4), 5(2), 7(2) | 2(2), 3(4), 5(2), 7(2) |
| Composure (composure, beta) | 3(2), 5(2) | 3(2), 5(2) |
| Lore Master (lore_master, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 9(2), 10(2) |
| Faith (faith, alpha) | 3(2), 5(2) | 3(2), 5(2) |
| Conscience (conscience, beta) | 3(2), 5(2) | 3(2), 5(2) |
| Authority (authority, gamma) | 3(2), 5(2) | 3(3), 5(3), 7(2), 9(2), 10(2) |

### C. Class moves that duplicate a ladder unlock (DUP) or lean on a number the ladder grants (DEP)

| Class | Move | Verdict | Note |
|---|---|---|---|
| Bulwark | Brace (rank I) | DEP | Brace is also named by Durability level 1 ("Brace always gives 2 plates, whatever your points", per_point row; door_line "the Guard technique ... and Brace raise plates"); the class adds Interpose and the bigger pool (5/6/7 vs the ladder pool_max 4). Partly a  |
| Bulwark | Called Out (rank I) | DEP | modifies Challenge, which Durability level 3 grants (door unlock Guard, Challenge needs Durability 3). Needs the ladder; no ladder duplicate. |
| Bulwark | Unbroken (rank II) | DUP | Last Plate (Durability level 5, door unlock Guard): once a fight a killing blow leaves you on 1 HP. Unbroken is the same floor plus 3 Guard (Last Plate instead breaks every plate). |
| Bulwark | Reactive Plate (rank III) | DEP | Guard soak per plate is the ladder number (Pain Threshold every-point row: plates soak 1% more per point; techniques.json rules.guard). Check against it before keeping. |
| Breaker | Wind-up (rank I) | DEP | start Momentum +2 is the lever the fork Rolling Start (Raw Power 4, option a, fork.momentum.rolling_start) also pulls: check before both stand. |
| Breaker | Riposte (rank II) | DEP | the Answer Riposte uses Raw Power counter number (Raw Power each from 2: +1 to your counter-attacks). Class gives the Answer, ladder the bonus. |
| Breaker | Measured Blow (rank III) | DUP | Follow Through (Raw Power level 5): a killing Finisher keeps Momentum. Measured Blow returns 1 Momentum once a fight on any Finisher. |
| Breaker | Unstoppable (rank III) | DUP (part) | Steady (Guts 3) already stops Fear halting you; Unstoppable adds Shaken/Slowed/Pinned immunity and no opportunity attacks. |
| Skirmisher | Fire Discipline (rank I) | DUP (family) | AP cuts as Speed Load (Dexterity 3: reload 1 AP less) and Quick Draw (Dexterity 5: first drawn attack free); not the same rows. |
| Skirmisher | Hold the Lane (rank I) | DEP | held shots (Overwatch, Deny, Cover Me, Dead to Rights) are the ones Near Miss (Dexterity 3) rewards; no ladder duplicate. |
| Skirmisher | Duck and Roll (rank II) | DUP (family) | Athletics gives +1 Defense each point from 2, Vault (3), Untouchable (5): defence by movement; the reaction step is distinct. |
| Skirmisher | Run and Gun (rank III) | DEP | adds Pressure (the Dexterity door) and a free move like Slide (Dexterity 1) and Fire and Move (classes.json fire_and_move); check against Slide. |
| Operative | Mark (rank I) | DEP | Marked is read by Tagged (Shadow door text) and Read Them (Acuity 5). Tag (shadow.json, Ingenuity 1) is a near-twin verb: check. |
| Operative | Vanish (rank I) | DEP | Fade is a shadow.json verb at Ingenuity 5; Vanish makes it free. Depends on that verb. |
| Operative | Sabotage (rank II) | DUP (family) | shadow.json verbs Disable (Ingenuity 7) and Rig (7) disable machines / rig tiles; check overlap with Sabotage. |
| Operative | Execution (rank III) | DEP | reads Marked; no twin. |
| Sigilist | Barrage (rank I) | DUP | Brain Power every 3 ("Each Sigil burns 1 less core charge") is the same lever as Barrage (damage words cost 1 charge less). |
| Sigilist | Overcharge (rank II) | DUP | Overclock (Brain Power 3): a spell one word longer than you know, never past four, for more charge. Overcharge is the same extension free once a fight. |
| Sigilist | Bleed the Flux (rank II) | DEP | Flux and Vent are the door; fork Clean Vent (Brain Power 4, shelved) also uses Vent. |
| Rigger | Double (rank I) | DUP | the Double is the first Figment form of Visualization level 1 ("Picture a Figment: the Double or the Snare"); the Rigger gets it for no charge and no Visualization. |
| Rigger | Field Fix (rank I) | DUP | Field Repair (Improvisation 3: 2 AP, spare part, restores durability, clears jams). Field Fix is the same with no part. |
| Rigger | Salvage (rank II) | DUP (part) | Cash in (Visualization 1, unmake a Figment for its charge back) is the "let go with all its charge back" option. |
| Rigger | Scrap Sentinel (rank III) | DUP (part) | the Sentinel is a Figment form (Visualization 6, fork b); Scrap Sentinel makes one free from a wreck. |
| Mender | Triage (rank I) | DEP | Touch and Mend are tending.json verbs open from Empathy 1; Triage is Touch with a cheaper MP price. Near-duplicate of Touch. |
| Mender | Take the Weight (rank II) | DUP (part) | Share a Hit (Camaraderie 1) takes a share of a friend hit; Take the Weight prevents Down/Stun on a Bonded ally. |
| Mender | Brimming (rank III) | DEP | overflow of Tending heal as shield; reads Mend, Empathy verb. |
| Mender | Rally (rank III) | DEP | a Tending-type heal in an area; Nobody Left Behind (Camaraderie 5) is the nearest ladder piece, not a twin. |
| Channeler | Shape (rank I) | DEP/DUP | "from 3 a Pump each round is free" (Will Power per_point) is the free Pump; Shape raises that free Pump by +0.12. Needs the ladder number. |
| Channeler | Iron Heart (rank I) | DUP | Pure Heart (Will Power 5): once a fight the first Strain that would Mana Short is refused, Strain falls to the limit. Iron Heart: Strain that would go over stops at the limit (Leon 17 Nov: relieve 2 Strain at Mana Shock; not in this data yet). |
| Channeler | Occult Library (rank II) | DUP | Will Power every 2 ("You keep 1 more design ready") is the same number. The one-tone part has no ladder twin. |
| Channeler | Heart Surge (rank III) | DUP (family) | Overdraw (Will Power 3): a Pump may add two stages instead of one once a turn. Heart Surge raises the Release stage by one for double Strain. |
| Chaplain | Ward (rank I) | DEP | the Ward shield grows with Conscience (prayer shields: +1% per Faith point per Conscience point, Conscience level 1). Name clash with Lore Master Ward (1 AP, +3 save; different). |
| Chaplain | Smite (rank I) | DEP | Deliver the Sinner (Faith 5) adds % damage to the patron blows incl. Smite. |
| Chaplain | Sanctuary (rank III) | DEP | a Hymn: Answered Prayer (Faith 3) resets its wait; Conscience shield numbers apply. |

Caveat: verdicts come from reading the rows' text and ops, not every effect; a builder re-reads the effects before rewriting a move. DISTINCT means no overlap found in skills.json, shadow.json, tending.json, pressure.json or figments.json.

### D. Primitive status (N1 to N23, checked 18 Nov against ENGINE-HOOKS.md and engine src)

| N | Status |
|---|---|
| N1 | EXISTS (door_pick) |
| N2 | EXISTS (door_pick, pick:) |
| N3 | EXISTS (feed:<door>, SOURCE_SPACES) |
| N10 | PARTLY: self/actor/target_res at_least, at_most, at "max" exist (triggers.ts:278-290); at "limit" NOT (comment: comes with N3b) |
| N3b | NOT BUILT: data/actions.json resources (15) has no strain or flux row |
| N23 | EXISTS (stats momentum_start, momentum_cost:<tech>, tech_num:<tech>.<field>) |
| N12 | NOT BUILT: op take has fields save, via only (ENGINE-HOOKS line 182) |
| N9 | NOT BUILT: DATA_ZONE_KINDS = [sanctuary] (magic.ts:60) |
| N20 | NOT BUILT: trigger cost has actor only, no target (triggers.ts:86) |
| N7 | NOT BUILT: no whispers_per_turn stat; hymnCut still faith.ts code (faith.ts:144, 603); hymn_wait stat exists |
| N5 | NOT FOUND (blessing runner tactics.ts:426 not re-read) |
| N6 | NOT FOUND (no prayer reaction kind in ENGINE-HOOKS) |
| N21 | NOT BUILT: on_kill payload is victim, by, src, ownTurn (ENGINE-HOOKS line 339) |
| N22 | NOT BUILT: hooks vent, strain, outburst_hold exist; no trigger for vent or held_turn_start (35 triggers) |
| N14 | NOT BUILT: no line_age / keep in engine src |
| N15 | NOT BUILT: no overload_lock stat |
| N18 | NOT BUILT: no pump cost site among 42 |
| N13 | unclear: condition op has same_entry for hidden; target-hidden not checked |
| N4 | NOT BUILT: no strike op |
| N16 | NOT BUILT: displaced is a hook, not a trigger |
| N17 | NOT BUILT |
| N19 | NOT BUILT: no uses: source |

Also asked: the `action_id` price predicate EXISTS (ENGINE-HOOKS line 106, used by rite_in_the_field); the target-aware price (N20) does NOT; seen_range: no match anywhere.
