# Agility sheet: Dexterity (alpha), Athletics (beta), Reaction Speed (gamma), Skirmisher (`marksman`)

Read-only draft. Sources: `data/skills.json` (dexterity, athletics, reaction_speed), `data/pressure.json`, `data/forks.json` (fork.pressure.*), `data/perks.json`, `data/calls.json` (call.cue and the rules), `data/classes.json` (marksman, move_pool), rules 1.56 "Pressure 2.0" and 1.60 items 4606, 4614 and 4615, `docs/ENGINE-HOOKS.md`. All E:/phc-wt/rel030.

## 1. PROMISE

- **Dexterity:** for gunslingers, snipers, blade masters and point strikers. Every precise hit (gun, bow, throw, light blade) should rattle the target, and the hands should outrun the enemy's: reload, draw, press, move.
- **Athletics:** for the dodger who leaves the vest at base. You live by not being there: no armour, over the cover, out of the line, and you shed the fire you take.
- **Reaction Speed:** for the one who is never caught flat-footed. You act first, cut in first, and snap the squad into motion (Cue). It also removes the gun hand's time tax.

## 2. DEXTERITY: alpha ladder

Every level: **+1 to hit with guns, bows, thrown weapons and light blades · +2% critical damage**. The existing every-point rows stay under it: +½ tile throw and harder saves against your techniques.

| Lv | gives (card) | id | where it comes from today |
|---|---|---|---|
| 1 | **Pressure**: each hit you roll with Dexterity adds Pressure | `dexterity.unlocks.1` (kept; its rows 0, 1, 2 and 4 move out, see Surplus) | Dex 1, door |
| 2 | **Slide** (1 AP): dive to cover, −1 own Pressure | `pressure.slide` (kept; `requires` min 1 → 2) | Dex 1 (`pressure.json`) |
| 3 | Perk step | the `perk_choice` row, now on the bare level | Dex 3 (carried by Speed Load) |
| 4 | Fork one: Converging Fire / Walk It In | fork `a` (kept) | Dex 4 |
| 5 | **Flush Out** (2 AP): a Pressed foe is Afraid of you 1 round | NEW door verb `pressure.flush_out` | merges Dex 5's Flush Out (Flush rider) and its blade twin |
| 6 | Perk step | moved | was Dex 5 (Quick Draw's slot) |
| 7 | Perk step | Mastery 3 (kept) | Dex 7 |
| 8 | Fork two: Through the Gap / Lockdown | fork `b` (`at` 6 → 8; forks.json `step` 6 → 8) | Dex 6 |
| 9 | Perk step | Mastery 4 (kept) | Dex 9 |
| 10 | **Trick Shot** (Mastered) | `trick_shot` (kept) | Dex 10 |

**Flush Out card:** "Flush Out · 2 AP, once a turn: a Pressed foe you see within 8 tiles saves or is Afraid of you 1 round; it loses 2 Pressure."

- The 2 AP and the 8 tiles are PROVISIONAL. The 2 Pressure is `rules.pressure.take_cost`, so it works like a Take.
- It works on soldiers and below. The reach `if` is `target_not_tier [elite, boss]`, as the blade twin has it today.
- What carries it, all existing: `grant_action` (`reach` with tiles, sight, side foe, `if` `target_res {pressure: {at_least: 2}}` and `why`), a `condition` row (`fear`, rounds 1, via dexterity), and `resource` (pressure −2 on the target).

**The two perks** stay as they are. The four steps (3, 6, 7, 9) buy all four tiers.
- Pressure Point (`both_hands`)
- Keep Their Heads Down (`running_reload`)

**SURPLUS** (what Dexterity gives today that does not fit the shape):

| Thing today | Goes to | Why |
|---|---|---|
| Speed Load (Dex 3: reloading −1 AP) | Reaction Speed perk `speed_load`, tier I | Cheaper reloads remove the gun's time tax, which is the gamma's job. It also served no rung of the door. |
| Quick Draw (Dex 5: first drawn attack once a fight costs 0 AP) | `speed_load` tier II | Same promise, "moving in time". |
| Near Miss (Dex 3: a held shot that misses adds 1 Pressure) | Class move Hold the Lane (`speed_loader`) | It only touches held shots, which is the Skirmisher's lane. It was measured scoped this way (rules 1.56 5b). Its row moves without the `self_skill` gate. |
| Shaken Nerves (Dex 3: foes save +1 TN per pip, at most 2) | Class gain Break Them (`break_them`) | It is how the best user of the door makes Rout and Flush Out land: control is the class's identity. The row moves as it is. |
| Flush Out rider on the Flush technique (row 2) and the blade twin (row 4) | Merged into the level 5 verb; both rows cut | One verb for every Dexterity weapon in place of two riders. |

## 3. ALPHA FORKS (all four built today, all run on Pressure)

| Step | Option | Card | Status |
|---|---|---|---|
| 4 | Converging Fire `fork.pressure.converging_fire` | +1 Pressure when an ally's Dexterity hit lands on a foe hit that way this round | built |
| 4 | Walk It In `fork.pressure.walk_it_in` | +1 Pressure on your Dexterity miss, once a turn per foe | built |
| 8 | Through the Gap `fork.pressure.through_the_gap` | Hit a foe to its Pressure cap: your next move is −1 AP and draws no opportunity attack | built (uses `target_res at: "max"`) |
| 8 | Lockdown `fork.pressure.lockdown` | Hit a foe to its Pressure cap: Slowed 1 round, no save | built |

Nothing is sealed, so no replacement is needed. Two notes:
- Walk It In is the "every miss" version of Near Miss that was measured past the band (rules 1.56 5b). It was accepted as a fork in Doors 3.0. A Skirmisher holding both gains nothing extra on a held-shot miss, because the two rows share once a turn per target.
- Only the fork-two data moves from 6 to 8.

## 4. ATHLETICS (beta)

**Per point:**

| Level | Card |
|---|---|
| 1 | +1 Defense · Slide reaches further, you shed more Pressure (feeds Pressure) |
| 2 | +1 Defense |
| 3 | Perk step |
| 4 | +1 Defense |
| 5 | Perk step |
| 6 | +1 Defense |
| 7 | Perk step |
| 8 | +1 Defense |
| 9 | Perk step |
| 10 | Mastered: Never There |

- +1 Defense still comes every point; the table shows it on 1, 2, 4, 6 and 8.
- Defense from 1 (it was "each from 2") is PROVISIONAL, so that level 1 is felt.

**Perks** (four, two tiers each; steps at 3, 5, 7 and 9):

| Perk | Tier I | Tier II changes | id | adj. | primitive |
|---|---|---|---|---|---|
| Wall Run | Cover and low obstacles cost no extra movement | Also run along walls and over gaps up to 4 tiles, and attack once mid-run | `wall_run` changed: Vault (Athletics 3) becomes its tier I; the old I and II merge into II | engine | `stat_mod ignore_obstacle_move_cost`; `movement_mode` (existing rows) |
| Untouchable | No torso armour: attacks on you roll twice, take the worse | Also in Light armour (PROVISIONAL) | NEW `untouchable` (from `athletics.unlocks.5`) | engine | `disadvantage` (bespoke, existing). For II the builder checks that its context reads an armour class above 0; if not, it hands back. |
| Roll With It | An attack on you misses: free 1-tile move, no opportunity attack | 2 tiles | `roll_with_it` kept | engine | `free_move` |
| Catch | Catch a grenade or throw aimed at you or a next-door ally (reaction); throw back for 1 AP | Throw back for 0 AP | `catch` changed (its `skills` move from reaction_speed to athletics) | engine | `reaction`, `grant_action` (existing rows) |

- Mastered: Never There (`never_there`, kept).
- Combo perks kept: Dance of Iron (Dexterity + Athletics), Charge! (Intimidation + Athletics).
- The named passives at 3 and 5 (Vault, Untouchable) are now two of the four perks.

## 4. REACTION SPEED (gamma)

**Per point:** +1 Initiative · +1 tile Cue reach.

| Level | Card |
|---|---|
| 1 | **Cue** (3 AP): an ally gets +1 reaction · +1 Initiative |
| 2 | +1 Initiative · +1 Cue reach |
| 3 | Perk step |
| 4 | Cue step 2: or they step at once to a tile you name |
| 5 | Perk step · Cue costs 2 AP |
| 6 | +1 Initiative · +1 Cue reach |
| 7 | Perk step |
| 8 | Cue step 3: if they have not acted, they go straight after you |
| 9 | Perk step · Cue costs 1 AP |
| 10 | Mastered · Cue may be paid with your reaction, and one more Call that turn costs 1 AP |

The Call's ladder in `calls.json` rules (shared by all nine gammas):

| Field | Today | Proposed |
|---|---|---|
| `ap` | 2 | 3 |
| `cheap_at` / `cheap_ap` | 5 / 1 | 5 / 2 |
| New step | none | 9: 1 AP |
| `reaction_at` | 9 | 10 |
| `free_at` / `free_per_turn` | 10 / 1 (first Call free) | gone; replaced by one extra Call at 1 AP at 10 |
| `steps_at` | [1, 3, 7] | [1, 4, 8], off the perk-step levels |
| Limit | none | the Call once a turn |

Reach stays 4 + 1 a point. The step numbers (reactions 1, step 1, order 1) are kept.

**Perks** (four, two tiers each; steps at 3, 5, 7 and 9):

| Perk | Tier I | Tier II changes | id | adj. | primitive |
|---|---|---|---|---|---|
| Shoot First | You act in the surprise round even when surprised (3 AP) | That action has 4 AP (PROVISIONAL) | NEW `shoot_first` (from `reaction_speed.unlocks.3`) | engine | `grant_action act_in_surprise_round` (`ap` field) |
| Cut In | Once a scene, cut in on someone mid-sentence or mid-action and act first | Twice a scene | NEW `cut_in` (from `unlocks.5`) | hybrid | `grant_action cut_in` with limit `{per: per_scene, n: 2}` |
| Speed Load | Reloading −1 AP | Once a fight, your first attack with a weapon you draw costs 0 AP | NEW `speed_load` (from Dexterity 3 and 5) | engine | `stat_mod ap_cost:reload`; `cost_mod attack_with_a_drawn_weapon` (existing rows) |
| Rounding Up | Once a turn, a fraction of an AP rounds up | Also once a fight, carry 1 unspent AP | `rounding_up` kept | engine | `rounding`, `ap_carry` |

- Mastered: Before the Blink (`before_the_blink`, kept: first in round 1, +1 reaction). It works well with the level 10 reaction-paid Cue.
- Combo perk kept: Between Heartbeats (Reaction Speed + Composure).
- The door's tax this gamma removes is the gun's time cost (reload and draw). "Hold a shot while Pressed" would remove a truer Pressure tax, but it needs a new piece (the Watch refusal is code), so it is left out.

## 5. CLASS: Skirmisher (6 moves)

| Rank | Move | Verdict |
|---|---|---|
| I | Fire Discipline (`fire_discipline`) | **KEEP.** Aimed +1 with no Heat, and once a turn a 3+ AP technique costs −1 AP. With Speed Load and Quick Draw out of Dexterity, no ladder level gives this. |
| I | Hold the Lane (`speed_loader`) | **KEEP, widened.** "Held shots −1 AP (min 1); a held shot that misses still adds +1 Pressure." Near Miss's row moves in. `cost_mod` + `resource` (existing). |
| II | Special Ammo (`special_ammo`) | **KEEP.** No twin anywhere. |
| II | Duck and Roll (`duck_and_roll`) | **KEEP.** A reaction step before the roll. Roll With It moves after a miss and Untouchable is passive, so nothing on the ladder does this. |
| III | Killzone (`killzone`) | **KEEP.** No twin. |
| III | Run and Gun (`run_and_gun`) | **KEEP.** A free 2-tile move after any attack, +1 Pressure. Slide costs AP and Through the Gap needs a capped foe, so it is not a ladder duplicate. |

The class gains (Reflex, Fire and Move, Relocated, Break Them) stay. Break Them takes Shaken Nerves: "Rout −1 AP (min 1) · foes save +1 TN per Pressure pip, at most +2."

## 6. Special rulings

None of the six special rulings is Agility's.

On solo sustain (TRIAGE): Agility answers it by avoidance (Untouchable, Roll With It, Slide, Duck and Roll), and the self-stim fix in lane 2 covers healing. No heal is added (see open question 5).

## 7. COUNTS and MIGRATION

| Skill | Felt levels of 10 | Most things on one level |
|---|---|---|
| Dexterity | 10 | 2 (level 1: door + per-point gain) |
| Athletics | 10 | 2 (perk step + Defense) |
| Reaction Speed | 10 | 2 (levels 5, 9 and 10) |

Today the counts are 8 / 6 / 5. All three are within 2 of each other.

**Migration:**

| Save holds | What it gets |
|---|---|
| A Dexterity perk step at 5 | Kept. It counts as the level-6 step; a save at Dexterity 5 keeps a step it would now earn at 6, with no claw-back. |
| Dexterity fork two, picked at 6 or 7 | Kept (`door_pick` stays). |
| Dexterity 1 | Loses Slide until 2. Nothing is stored. |
| Dexterity 3 or 5 | Loses Speed Load, Quick Draw, Near Miss and Shaken Nerves. Nothing is stored; the destinations are above. |
| `wall_run` at I | Now holds Vault (the new I). At II: unchanged plus Vault. |
| `catch`, bought with a Reaction Speed step | Kept, now listed under Athletics. The Reaction Speed step it used comes back unclaimed. |
| Athletics 3 or 5, or Reaction Speed 3 or 5 (Vault, Untouchable, Shoot First and Cut In were free) | One-time re-pick of that skill's steps through the unclaimed-step flow (see open question 3). |
| An old Call | Only prices and levels change. Nothing is stored. |

## 8. OPEN (for Leon)

1. **Shared Call steps at 1 / 4 / 8 for all nine gammas,** so they sit off the perk-step levels? Recommended: yes.
2. **Flush Out on Elites and Bosses?** Recommended: no (soldiers and below), and the gun-only Flush rider is cut. A Boss Afraid for a round is too much control for a 2 AP verb.
3. **Saves losing the free beta/gamma passives** (Vault, Untouchable, Shoot First, Cut In): give a one-time free re-pick of those skills' steps on load? Recommended: yes, through lane 2's unclaimed-step flow. It is not a general re-pick system.
4. **Speed Load and Quick Draw leave Dexterity for Reaction Speed,** so a pure gunner without Reaction Speed loses cheaper reloads. Recommended: yes. The gamma removes the door's tax, and Fire Discipline keeps the Skirmisher's AP edge.
5. **Solo sustain:** does Agility need a self-heal? Recommended: no. Avoidance plus the self-stim fix; measure a stage-1 solo Skirmisher with `simRun` after lane 2.

**PROVISIONAL numbers:**
- Flush Out: 2 AP, 8 tiles
- Athletics: Defense from 1 (was from 2)
- Untouchable II: also in Light armour
- Shoot First II: 4 AP
- Cut In II: twice a scene

