# Strength sheet: Raw Power, Guts, Intimidation; Breaker (`fighter`)

Sources read in E:/phc-wt/rel030 (no file changed): ATTACK-PLAN-2026-11-19.md (both binding sections), the Strength section and lists C and D of scout-attribute-tables, skill-pages-read, skills.json (`raw_power`, `guts`, `intimidation`), forks.json (`fork.momentum.*`), techniques.json (rules.momentum, charge, the Finishers, grapple), classes.json `base.fighter` (ranks and gain), perks.json (13 Strength perks), calls.json (rules, `call.threaten`), the spec items 4400–4409 and 4621–4652, doors-3.0-spec 2.5, momentum-2.0, the TRIAGE balance notes, ENGINE-HOOKS, and `physical/core.ts` (momentumCost, ensureMomentum).

## 1. PROMISE

- **Raw Power (alpha):** for brawlers, wrestlers and berserkers. It must let them hit harder the longer they keep swinging, grab and throw people, and break what stands in the way. Spending the built-up Momentum on a Finisher is the payoff.
- **Guts (beta):** for the one who walks in first. Fear, the dark and the sign saying DANGER don't stop them, and their Momentum holds up under fire while they stand at the front.
- **Intimidation (gamma):** for the one who runs the conversation through fear. One look and the other side talks, backs off or freezes, in a scene and in a fight. It also takes the sting out of being hit by people who are afraid of you.

## 2. ALPHA LADDER: Raw Power

Shown on every level: **"+1 melee hit, +5% damage, +1 to your melee saves' TN"**, plus **"+1 Counter"** from level 2.

| Lv | gives (card) | existing id or NEW | where it comes from today |
|---|---|---|---|
| 1 | **The door: Momentum x3**. Charge builds it, a Finisher spends it all (Coup, Cleave, Break). | existing (`techniques.json rules.momentum`, `raw_power.door_line`) | Today any melee weapon gives the x3 meter (`ensureMomentum`). In skills.json level 1 is empty: the page shows the door here. Open question 2 asks whether Raw Power should gate the meter. |
| 2 | **Grapple** (1 AP: Body save or Grappled) | existing technique `grapple`, re-homed | Today the perk Iron Grip gives it. It becomes `innate: {skill: raw_power, min: 2}` (the primitive Guard and Interpose already use). |
| 3 | Perk step | step (`perk_choice`) | Was 3 (M1), stays at 3 |
| 4 | **Fork one:** Rolling Start or Grindstone | `fork.momentum.rolling_start` / `.grindstone` | Same step (4) |
| 5 | **Throw Down with any weapon or bare hands** (a Grappled foe: slam it down, x1 +25% a Momentum, Prone) | existing technique `throw_down`, now innate | Today only its Bare home has it. It becomes `innate: {skill: raw_power, min: 5}`. |
| 6 | Perk step | step | Was M2 at 5 |
| 7 | Perk step | step | Was M3 at 7 |
| 8 | **Fork two:** Spill or Headlong | `fork.momentum.spill` (reworded) / `.headlong` | Was at 6 and never offered |
| 9 | Perk step | step | Was M4 at 9 |
| 10 | **Mastered: Earthbreaker** | `earthbreaker` | Same |

Felt: 10 of 10, with at most 1 named thing on a level.

**SURPLUS (what Raw Power gives today that does not fit the shape)**
1. **Heavy Hands** (level 3: a push goes 1 tile further). It moves into the alpha perk **Iron Grip, tier II**. Iron Grip loses its Grapple grant to level 2, and "manhandling" is its theme. Today it is a skeleton handler (`perks/skeleton.ts`, `push_tiles` in `forceMove`); it gets re-keyed from the unlock to the perk tier.
2. **Follow Through** (level 5: a Finisher kill keeps 1 Momentum). It moves to the **class**, merged into Measured Blow (`fighter.finisher`), which today is its weaker twin (list C: DUP).
3. **The old perk steps at 5 and the old fork at 6** move to 6 and 8 (Leon's ruling 3).

Nothing is cut.

## 3. ALPHA FORKS (all four run on Momentum)

| Step | Option | Card line | Status |
|---|---|---|---|
| 4a | **Rolling Start** (re-ruled) | "Charge from 2 tiles. +1 Momentum on a Charge hit." | **Built today**: delete the `momentum_cost:charge -1` row and keep `tech_num:charge.min_run -1` and the hit-build row. |
| 4b | **Grindstone** | "+1 Momentum on a plain hit against a foe hit in melee in the last 2 rounds." | **Built** (unchanged) |
| 8a | **Spill** (replaced wording) | "A Finisher that drops a foe hits the foe next to it for 22." | **Buildable today, not built.** It uses trigger `kill`, `if {actor: self, tech_group: [finisher]}`, op `deal` with a new amount block `spill` (profile melee, base 22, PROVISIONAL: Launch's base), and `targets {of: target, within: 1, side: foe, max: 1}`. Spill's own damage is not a technique, so it never Spills again. This replaces the overkill wording, which needed N21 (not approved). |
| 8b | **Headlong** | "Once a turn, pay a Charge with 2 Momentum instead of its AP. It builds no Momentum." | **Buildable today, not built.** It uses `cost_mod` on `attack` `set 0`, `if {mode: [charge], door_pick, self_res: {momentum: {at_least: 2}}}` (N10's `at_least` exists), N23 `momentum_cost:charge +2`, and the content condition `headlong_paid`, which Rolling Start's and Charge Carries' build rows read with `self_lacks`. |

**Rolling Start re-ruled (special ruling).** For a Breaker, a Charge that hits gives closing in +2 and Charge Carries +2. Today's Rolling Start adds +1 and makes the Charge free, so the net is +5: from x0 to x5 in one action. Worse, a free Charge can be made at x0, so the loop "Finisher spends all, then a free Charge refills" runs every turn. The re-rule removes the price cut:
- A Charge again costs 1 Momentum (the first Opener of a fight is still free).
- For a Breaker the net is +4, and at x0 the Breaker cannot Charge.
- The loop now runs only on kills (Measured Blow's x1).
- For a non-Breaker, Rolling Start becomes "an Opener that pays for itself" from 2 tiles.

PROVISIONAL. Measure it with `npm run try` (Breaker Charge from x0 and from x1) and survival-run.

## 4. BETA: Guts

Every level shows: **"+1 Body save, −{Raw Power points}% Momentum lost to steps and hits"** (the feed line, filled in live).

Steps at 3, 5, 7 and 9 choose 4 of the 8 tiers. Level 10: **Mastered: Nothing Left to Fear** (`nothing_left_to_fear`, kept): immune to Fear; allies within 3 tiles who see you can't be made Afraid.

| Perk | Tier I | Tier II changes | id | adj. | primitive |
|---|---|---|---|---|---|
| **Steady** (the passive at 3 today) | "Fear can't stop you moving or acting (you keep its −2 to hit)." | "+ Fear and Nausea last at most 1 round on you." | NEW perk `steady` (from unlock 3); `iron_stomach` is retired into it | engine | stat `fear_movement_immune` (exists); `cond_rounds max 1` on `cond_incoming` (as iron_stomach today) |
| **Point Man** (the passive at 5 today) | "Allies within 3 tiles roll Fear saves with your Guts." | "+2 on their other Heart saves." (PROVISIONAL 2) | NEW perk `point_man` (from unlock 5) | engine | stat `aura_fear_save_guts_tiles` (exists); `roll_mod` on `save`, `if {target: ally, target_within: 3, cond_family: [heart]}` |
| **Into the Dark** | "First step onto unseen ground in a fight: no Ambush bonus against you until your next turn." | "+ can't be made Afraid on your first turn in a place of Fear." | `into_the_dark` kept | engine | `immunity` (as today) |
| **Unflinching** | "At x3 Momentum or more: −1 to hit you in melee." | "−1 to hit you with shots too." (PROVISIONAL 1) | NEW `unflinching` | engine | `roll_mod` on `to_hit`, `if {target: self, self_res: {momentum: {at_least: 3}}, melee: true}` (precedent: `relocated`) |

Why Unflinching: a defence that pays for holding Momentum, so it feeds the door. Iron Stomach's tier II (immune to Fear and Nausea) is dropped: the Mastered perk already gives Fear immunity.

## 4. GAMMA: Intimidation

Every level shows: **"+1 Threaten reach, +1 Threaten save TN, +1 Intimidation checks."**

**Threaten (`call.threaten`), new ladder:**

| Level | Threaten |
|---|---|
| 1 | Shaken, 1 AP less. **3 AP**, once a turn. |
| 4 | It can't move toward you (step 2, was at 3). |
| 5 | **2 AP** |
| 8 | 2 AP less (step 3, was at 7). |
| 9 | **1 AP** |
| 10 | It may be paid with your reaction, and one more Call that turn costs 1 AP. |

The free first Call and the 0 AP reaction at 9 are retired.

Data changes:
- calls.json rules: `ap 3`; the cost steps become a list `[[5,2],[9,1]]` (the Calls code reads one `cheap_at` today, so this is a code shape change, not a new primitive); `steps_at [1,4,8]`; `reaction_at 10`; `free_at` replaced by "+1 Call at 1 AP".
- **`steps_at` is shared by all nine Calls** (open question 3).

Perks: steps at 3, 5, 7 and 9 choose 4 of 8 tiers. Level 10: **Mastered: The Name They Whisper** (`the_name_they_whisper`, kept, hybrid).

| Perk | Tier I | Tier II changes | id | adj. | primitive |
|---|---|---|---|---|---|
| **Marrow Talk** (the passive at 3 today) | "A threat that fails in talk still leaves them Shaken: −2 on their next roll against you." | "In a fight too: a Threaten they save against still leaves them Shaken 1 round." | NEW perk `marrow_talk` (from unlock 3) | I hybrid, II engine | I as today; II trigger `acted`, `if {action_id: [call.threaten], target_lacks: [shaken]}`, `condition shaken rounds 1 skip_save` (builder checks that a Call's `acted` carries its target) |
| **Stare Down** (the passive at 5 today) | "Before the first turn, one enemy that sees you saves (Heart) or loses its first turn." | "+ it is Shaken 3 rounds." | NEW perk `stare_down` (the action `stare_down` is kept) | engine | `grant_action stare_down` (as today), plus op `condition` |
| **Bone Talk** | "Name one physical detail: they answer one question truthfully, or refuse and are Shaken." | "A whole group: the leader answers for all." | `bone_talk` kept; its 2 AP fight version is cut (a copy of Threaten) | narrator | `narrator` |
| **Grim Reaper** (removes the door's tax) | "A hit from a Shaken or Afraid foe costs you no Momentum." | "+ a foe you drop on your turn: every foe that sees it saves (Heart) or is Afraid." | `grim_reaper` kept, changed | engine | I: trigger `hit`, `if {actor: foe, target: self, actor_has: [shaken, fear]}`, `resource momentum +1`. II: trigger `kill`, `if {actor: self, own_turn: true}`, `condition fear` with `targets {of: target, within: 8, side: foe, seen: true}` (8 PROVISIONAL, Bone Talk's reach) |

What Grim Reaper loses: the +2 AP on a kill and the −1 AP on the first turn. AP given inside a turn breaks rule 15.7, and they are offence, not the gamma's job.

## 5. CLASS: Breaker (`fighter`)

| Rank | Move | Verdict |
|---|---|---|
| I | Barrel In (`fighter.lunge`) | **KEEP.** Move-and-strike with no opportunity attacks, plus +1 Momentum on a Shaken foe (it links to Intimidation). No ladder twin. |
| I | Wind-up (`wind_up`) | **KEEP.** With Rolling Start re-ruled it is the only lever on the starting Momentum (list C's DEP is gone). Measure the turn-1 x5 Finisher (start 3, first Opener free, Charge +4). |
| II | Riposte (`fighter.riposte`) | **KEEP.** The Answer with any weapon; the ladder gives only the Counter number. |
| II | Read the Swing (`read_the_swing`) | **KEEP.** Momentum from a miss against you; no twin. |
| III | Measured Blow (`fighter.finisher`) | **REPLACE (merge).** New card: "A Finisher that drops its target leaves you x1. Once a fight, any Finisher does." Follow Through's skeleton handler (or `resource +1` on `kill` with `tech_group: [finisher]`), plus today's once-a-fight row. Id kept. |
| III | Unstoppable (`unstoppable`) | **KEEP.** Steady is now a perk, not a level. Unstoppable's Shaken, Slowed and Pinned immunity, no opportunity attacks and +2 Momentum are the class's own. |

The class gains (Charge Carries, Four Ways to Finish, Launch, Wrecker, Breach) stay. Launch remains the Breaker's: the ladder's big verb is Throw Down (open question 1).

## 6. Special ruling applied

Rolling Start is re-ruled in section 3: the price cut goes, the 2-tile run and the +1 build stay.

## 7. COUNTS and MIGRATION

**Counts** ("named" means something other than the per-point line; every level of all three skills shows the per-point line):

| Skill | Named levels | With the per-point line | Most on one level |
|---|---|---|---|
| Raw Power | 10 of 10 | 10 | 1 |
| Guts | 5 of 10 (3, 5, 7, 9, 10) | 10 | 1 |
| Intimidation | 8 of 10 (1, 3, 4, 5, 7, 8, 9, 10) | 10 | 2 (at 5, 9 and 10) |

Guts makes the target of 8 only through Leon's per-point-on-the-level ruling.

**Migration:**
- **Raw Power:**
  - A save holding a step taken at 5: it keeps it; the step at 6 is owed only when the steps owed exceed the steps held.
  - A save holding Rolling Start: it keeps it, re-ruled.
  - No save holds the second fork (never offered).
  - Heavy Hands and Follow Through were free grants, so there is no pick to move. They now live in Iron Grip II and Measured Blow.
  - Iron Grip holders lose nothing: they all have Raw Power 3 or more, so level 2 gives them Grapple. `PERK_RENAMED grapple → iron_grip` stays.
- **Guts:** `iron_stomach` tier I or II becomes `steady` at the same tier. `into_the_dark` is kept. Steady and Point Man were free at 3 and 5 and are now picks, so an old save at Guts 3 or more would lose them. Recommended: a free re-pick of the Guts steps (open question 4).
- **Intimidation:** `grim_reaper` and `bone_talk` keep their ids with the new texts. Marrow Talk and Stare Down were free and are now picks, handled the same way. A save holding Bone Talk loses only the fight version.
- **Calls:** no saved state.

## 8. OPEN

1. **Big verb at 5: Throw Down (innate) or Launch (moved from the Breaker)?** Recommend **Throw Down**. It completes Grapple at 2 into a wrestler's chain from existing techniques, and Launch stays something only the Breaker does.
2. **Should Raw Power 1 gate the Momentum meter** (today any melee weapon gives x3)? Recommend **no**: the door is weapon-neutral, and level 1 shows the door and the per-point gain.
3. **Call ladder for all nine gammas:** shared `steps_at [1,4,8]`, and may a hindering Call (Threaten) be paid with the reaction at 10? Recommend **yes to both**. 4 and 8 fill the empty even levels, and Leon's ruling at 10 names no exception.
4. **Old saves whose betas and gammas had free passives at 3 and 5:** recommend a **free re-pick of that skill's perk steps** at the next camp or out of a fight (iron_stomach maps to steady first). Mapping without a re-pick silently takes Steady, Point Man, Marrow Talk and Stare Down away.
5. **Charge Carries +2:** keep it and measure the Breaker after the Rolling Start re-rule, or cut it to +1 now? Recommend **measure first**. If the Breaker's blade line is still above the melee band at level 20 (206%), set Charge Carries to +1 (PROVISIONAL).

