# Insight: the sheet (Empathy · Camaraderie · Insinuation · Mender)

Sources read: ATTACK-PLAN-2026-11-19 (both rulings), scout tables (Insight, list C, primitives D), skill-pages-read, data/skills.json (empathy, camaraderie, implication), tending.json, forks.json (fork.tend.*), perks.json, calls.json (call.taunt and the rules), classes.json (`bard`), conditions.json (bonded, traced, taunted, foe_mercy), rules.json `output.profiles.tend`, ENGINE-HOOKS (a), meetsRequires (effects/collect.ts), perks/skeleton.ts, perks/f.ts, TRIAGE balance.

Facts that shaped the sheet:
- Mercy (Empathy 5) and Veiled Insult (Insinuation 5) have no handler. They fall to the default action, which hands them to the Narrator.
- Nothing in the engine reads Feel Their Pain's `see_hp_state_in_vision` or Nobody Left Behind's `carry_ally_full_move`. Neither is in STATS, and the fight has no way to carry a unit.
- `requires` reads only skill, class and door_pick. Nothing can gate a verb behind a held perk, so a verb that moves into a perk travels as that perk tier's own `grant_action`, the way Rally and Inspire carry theirs.

## 1. PROMISE

- **Empathy:** for the therapist and the human lie detector who feels everyone's pain, enemies included. It must let them tie themselves to anyone, friend or foe, and turn that tie into care for friends and leverage on foes.
- **Camaraderie:** for captains and team players. It must keep the squad standing together: take hits for friends, pick up the fallen, move them out of harm, and be healed better in return. By design it gives the lone wolf little.
- **Insinuation:** for poets, liars and the lovestruck. It must let them hear what is really meant, say what can't be said plainly, goad a foe onto themselves, and talk a beaten enemy into yielding.

## 2. EMPATHY: the alpha ladder

Per point, on every level: **+6% Healing given** (`output.profiles.tend.skill` 0.06).

New door line: "Your door is Bonds: tie yourself to a friend or a foe. Tend a Bonded friend; hurt a Bonded foe."

**The enemy Bond, explained** (ruling; the numbers are today's `tend.threads` / `tend.bond`). Shown on level 1 and in the door's help:
- Bond a foe (Heart save; Elite +2, Boss +5; a Boss stays Bonded for 3 of its turns)
- +3 to hit it
- 20% of the damage you take goes to it
- It takes 20% of every heal you give
- +5% damage for each Bond you hold
- Snap it: Soul damage and Dazed
- While you hold it, you are Traced

| Lv | gives (card) | id | where it comes from today |
|---|---|---|---|
| 1 | **Door: Bond** (1 AP; ally or foe; Let Go free) **and Mend** (2 AP, 24 MP; a friend, or yourself once a turn) · +1 Bond held · +6% Healing given | tend.threads, tend.bond, tend.let_go, tend.mend, tend.mend_self | Empathy 1 (tending.json); Let Go and Mend Yourself are shown inside Bond and Mend |
| 2 | **Snap** (1 AP, once a turn: break a Bond; a foe takes Soul damage and is Dazed, a friend heals) · +6% Healing given | tend.snap | Empathy 1 |
| 3 | Perk step · +6% Healing given | unlock 3 (perk_choice) | Empathy 3 (Feel Their Pain cut) |
| 4 | **Fork one:** Keep the Thread or Short Thread | unlock 4 | same |
| 5 | **Shield** (2 AP, 30 MP: a Bonded friend anywhere in sight) · +1 Bond held | tend.shield, tend.bonds_5 | Shield was Empathy 2; Two Bonds 5; Mercy goes to the gamma |
| 6 | Perk step · +3 Bond reach | unlock 6 becomes perk_choice; the tend.bond reach step at 6 | the perk step was at 5; the fork moves to 8 |
| 7 | Perk step · +6% Healing given | unlock 7 | same |
| 8 | **Fork two:** Shared Pulse or Long Thread · +1 Bond held | unlock 8 (NEW slot), tend.bonds_8 | the fork was at 6; Three Bonds 8 |
| 9 | Perk step · −6 MP on Mend and Shield | unlock 9; the res steps at 9 | same |
| 10 | **Mastered: Threads That Hold.** Tending through a Bond ×1.5 (not ×1.2) · your Bonds hold while you are Downed | NEW perk `threads_that_hold` (folds tend.hold_down) | Empathy 10; Open Hand moves to the gamma |

Alpha perks (steps 3, 6, 7, 9; two perks × two tiers = four):
- **Taut Thread** (`shared_breath`, changed): I is +6% damage on hits on a Bonded foe (kept). II is +12%, and your attacks on a Bonded foe roll with Empathy if it is higher. Built from `roll_with` on `attack` (if target_tied bond, self_holds attuner, if_higher). This is the solo Mender's to-hit fix.
- **Bitter Balm** (`lay_down_arms`, numbers changed): today it only adds 4% / 8% on top of Threads' 20% echo, too little to feel. New: the echo +10% at I, +20% at II. PROVISIONAL.

**SURPLUS** (what Empathy gives today and the new shape has no place for):

| thing | goes to | why |
|---|---|---|
| Touch (tend.touch) | cut | Triage (the Mender's) is the beside-you heal. Scout list C: the two were near-twins. Short Thread's "Touch reaches 2" moves onto Triage's reach (data step `pick:fork.tend.short_thread`) |
| Settle (tend.settle) | beta: Steady Hands I | save support for friends |
| Soothe (tend.soothe) | beta: Steady Hands II | cleansing a friend is support; its Empathy 5 / 7 steps are cut |
| Raise (tend.raise) + Last Thread (tend.last_thread) | beta: Nobody Left Behind II | picking up the fallen is Camaraderie's promise |
| Tug (tend.tug) | beta: Pull Together I | pulling a friend out of danger; a foe in on the Bond |
| Guide (tend.guide) | beta: Pull Together II | moving a friend (its Empathy 7 step is cut) |
| Field Surgery (tend.field_surgery) | class: the Mender's (requires bard rank 1, as tend.bond_free) | out-of-fight care; the Mender's sustain |
| Feel Their Pain (unlock 3) | cut | nothing in the engine reads its stat; since 0.28.2 health words on tokens show every unit's health to everyone |
| Mercy (unlock 5) | gamma: Open Hand I | talking a beaten enemy down is speech; it also near-duplicated Open Hand |
| Open Hand (Empathy Mastered) | gamma: Open Hand II | same act; Empathy's capstone becomes the door's own |

## 3. EMPATHY FORKS (running on MP through a Bond)

| step | option | card | status |
|---|---|---|---|
| 4 | Keep the Thread (`fork.tend.keep_the_thread`) | Snap: 12 MP · an enemy Bond holds, no Daze | built |
| 4 | Short Thread (`fork.tend.short_thread`) | ×1.4 Tending on a Bonded friend within 2 tiles (not ×1.2) · Triage reaches 2 tiles | built. Text changed (Touch is gone); Triage's reach step is data only |
| 8 | Shared Pulse (`fork.tend.shared_pulse`) | Mend on a Bonded friend: 25% of it runs down every other Bond to a friend | built |
| 8 | Long Thread (`fork.tend.long_thread`) | +3 Bond reach · the first Mend or Shield on each Bonded friend each round costs −1 AP (at least 1) | sealed. Needs only the **approved target-aware price**: the `cost` trigger resolving the target, plus `limit {per: per_round, each: target}`. Buildable in 0.32 |

No replacement is needed: all four options run on approved pieces.

## 4a. CAMARADERIE (beta)

**Per point:** +10% healing you receive · +5% Share a Hit (stops at 50%, reached at 5 points) · Bond heal-back grows (the door tab's feed chip shows the number).

| Lv | gives |
|---|---|
| 1 | **Share a Hit** (reaction: take 30% of a hit on a friend beside you) · gain |
| 2 | gain |
| 3 | perk step |
| 4 | gain |
| 5 | perk step · Share a Hit also covers a Bonded friend in sight (today's "at 5" row) |
| 6 | gain |
| 7 | perk step |
| 8 | gain |
| 9 | perk step |
| 10 | Mastered: Many Hands |

**Perks** (steps 3 / 5 / 7 / 9):

**B1 Hand-Off** (from unlock 3; NEW perk id `hand_off`; engine)
- I: once a round, a friend beside you who is attacked uses your Defense if it is higher.
- II: reaches a friend within 3 tiles.
- Carried by the bespoke handler in perks/skeleton.ts, re-keyed to the perk. `handOffReach` reads the tier in place of `many_hands`; the 3 is today's number.

**B2 Nobody Left Behind** (from unlock 5; NEW id `nobody_left_behind`; engine)
- I: Stabilise −1 AP · a Downed friend beside you takes 50% less damage (PROVISIONAL).
- II: Raise (1 AP, 36 MP, once a turn: a Downed friend beside you or Bonded in sight stands) · after a Bonded friend falls, your next Raise costs 0 AP (Last Thread).
- Carried by:
  - stat `ap_cost:stabilise`
  - `damage_mult` on `taking` (target ally, target_alive false, target_within 1)
  - tend.raise's grant_action and tend.last_thread's mark / cost_mod rows, moved into tier II (one copy)
- The carry half is cut: no fight mechanic carries a unit.

**B3 Steady Hands** (NEW id `steady_hands`; engine)
- I: Settle (1 AP, 15 MP: you, a friend within 3 tiles or a Bonded friend in sight: +2 on every save until the end of its next turn).
- II: Soothe (1 AP, 18 MP: the newest harmful Body or Heart condition comes off).
- Carried by the two verbs' grant_actions moved into the tiers (condition `settled`, `cleanse`).

**B4 Pull Together** (NEW id `pull_together`; engine)
- I: Tug (1 AP, 12 MP: a Bonded unit in sight comes toward you; a friend 3 tiles; a foe makes a Body save or comes 2 tiles, a Boss 1).
- II: Guide (1 AP, 15 MP: a friend within 3 tiles or Bonded in sight steps up to 2 tiles to a tile you pick, provoking nothing).
- Carried by tend.tug and tend.guide's grant_actions (`displace`, condition `reeled`) moved into the tiers.

**Removed:**
- Soulmate (`soulmate`): outside-fight damage share, a twin of Share a Hit and the Bond. A save holding it gets `pull_together` at the same tier.
- Rally Cry (`rally_cry`): its effect does not feed the door, and its name clashes with the Mender's Rally. A save holding it gets `steady_hands` at the same tier.

**Mastered: Many Hands** (`many_hands`, changed)
- Share a Hit reaches any friend within 3 tiles · a friend in sight who has used its reaction may use yours.
- Carried by a second `redirect` row with target_within 3 (the same `reaction` limit), and tactics.ts `reactionDonor` (existing).
- Its old half, Hand-Off's reach, moved to B1 II.

## 4b. INSINUATION (gamma)

**Per point:** +1 Taunt reach · +1 Taunt save TN · +1 on Insinuation checks.

**The Call, Taunt** (`call.taunt`). Costs follow the ruling. The strength steps move from 3 / 7 to 4 / 8 so they sit on the gain levels.

| Lv | gives |
|---|---|
| 1 | **Taunt** (3 AP, 5 tiles: Heart save or Taunted 1 round; its next attack must be at you) |
| 2 | gain |
| 3 | perk step |
| 4 | Taunt: its attack costs it +1 AP |
| 5 | perk step · Taunt 2 AP |
| 6 | gain |
| 7 | perk step |
| 8 | Taunt: its attack costs it +2 AP |
| 9 | perk step · Taunt 1 AP |
| 10 | Mastered · Taunt may be paid with your reaction, and a second Call that turn costs 1 AP |

calls.json `rules` changes for all nine gammas: ap 3 · a cost-step list [5: 2, 9: 1] · steps_at [1, 4, 8] · `free_at` replaced by a reaction payment and extra_call_ap 1 at 10. This is the Call code reading its own data, not a closed-list addition. The old helping-Call reaction at 9 goes (it overlapped 10).

**Perks:**

**G1 Between the Lines** (from unlock 3; NEW id `between_the_lines`)
- I (narrator): when someone speaks in code, the Narrator tells you what they really mean.
- II (engine): +2 TN on your Bond against a foe.
- II is carried by `roll_mod` on `cond_incoming`, cond bonded, roll "tn". PROVISIONAL.

**G2 Veiled Insult** (from unlock 5; NEW id `veiled_insult`; engine, rebuilt, today it is Narrator-default)
- I: 0 AP, once a fight: a foe you see makes a Heart save against your Insinuation or is Taunted for 2 rounds.
- II: twice a fight.
- Carried by grant_action (ap 0, `limit per_combat` n 1 / 2) with condition `taunted` via implication, rounds 2. PROVISIONAL.
- Today's "−2 to hit you" is cut: an outgoing `to_hit` is the attacker's event, so the target's items cannot touch it.

**G3 Quiet Thread** (NEW `quiet_thread`; engine; removes the door's tax)
- I: you are never Traced.
- II: nor are your Bonded friends · a Bonded friend going Down costs you no MP.
- Carried by `cancel` on `cond_incoming` cond traced (target self; target ally + target_tied bond), and `resource` mp +10 on `downed` (target ally, target_tied bond).
- Lane 4 must confirm that a skip_save condition still passes cond_incoming.

**G4 Open Hand** (`open_hand` id kept, moved from Empathy Mastered; Mercy folded in; engine)
- I: 2 AP: a humanoid foe you see below half its HP makes a Heart save against your Insinuation or surrenders (never a Boss or a machine).
- II: 0 AP, once a foe.
- Carried by the existing `offer_mercy` ActionDef (perks/f.ts), re-keyed to this perk, its threshold and AP read from the tier's numbers. No new primitive.

**Removed:**
- Sweet Talker (`sweet_talker`): free-text effects, none engine-run. A save holding it gets `veiled_insult` at the same tier.
- Double Meaning (`double_meaning`): narrator, overlaps Between the Lines. A save holding it gets `between_the_lines` at the same tier.

**Mastered: Their Own Idea** (`their_own_idea`, kept, hybrid; role-play).

## 5. CLASS: Mender (`bard`)

| rank | move | verdict |
|---|---|---|
| I | Triage (`medic.triage`) | **KEEP.** With Touch cut it is the only beside-you heal. It stops Bleeding, and out of a fight it heals ×3 once a stage: the Mender's solo sustain. Text: drop "less than a Touch"; Short Thread reach step |
| I | The Ledger (`ledger`) | **KEEP.** No ladder twin (heals become damage) |
| II | Inspire (`bard.inspire`) | **KEEP.** No ladder twin |
| II | Take the Weight (`take_the_weight`) | **KEEP.** The 1 HP floor and taking a Stun, Daze or Fear are on no level; Share a Hit only splits damage |
| III | Brimming (`bard.mend`) | **KEEP.** Over-heal becoming a shield is on no level |
| III | Rally (`rally`) | **KEEP.** No level heals the squad at once or clears Fear and Shaken |

The Mender's extras stay in tending.json: Bond (free) and One More Bond. Field Surgery joins them.

**Mender solo** (ruling). The levers, all from existing primitives:
1. The enemy Bond is explained on level 1 (+3 to hit, the share and the echo).
2. Taut Thread II: roll with Empathy on a Bonded foe (`roll_with`).
3. Bitter Balm's bigger echo.
4. Quiet Thread removes the Traced tax.
5. Triage's out-of-fight heal.

## 7. COUNTS

"Felt" includes the per-point gain line shown on every level. "Things" counts named items only.

| skill | felt / 10 | named levels | most things on one level |
|---|---|---|---|
| Empathy | 10 | 10 | 2 (levels 1, 5, 6, 8, 9) |
| Camaraderie | 10 | 6 (2 / 4 / 6 / 8 carry the +10% healing-received gain) | 2 (level 5) |
| Insinuation | 10 | 8 | 2 (levels 5, 9, 10) |

All three are within 2 felt levels of each other (today: 8 / 5 / 5).

**MIGRATION**

- **Empathy perk steps.** A step taken at 5 is kept (ruling 3); the steps now sit at 3 / 6 / 7 / 9. Taut Thread and Bitter Balm keep their ids.
- **Empathy fork.** A save holding `fork.tend.shared_pulse` below Empathy 8 keeps it. Nobody holds Long Thread (shelved).
- **Old Empathy Mastered.** A save that holds `open_hand` as Empathy's Mastered drops it; Empathy 10 grants `threads_that_hold`. The gamma's Open Hand needs a perk step.
- **Removed perks.** `soulmate` → `pull_together`; `rally_cry` → `steady_hands`; `sweet_talker` → `veiled_insult`; `double_meaning` → `between_the_lines`. Each keeps its tier.
- **Lost free unlocks.** Hand-Off, Nobody Left Behind, Between the Lines and Veiled Insult were free unlocks and are now perks. Every old save with Camaraderie 3+ or Insinuation 3+ gets one free re-pick of that skill's steps at load, with the mapped picks preselected (OPEN 3).
- **Points-derived items.** Touch, Feel Their Pain, Mercy, Shield at 2, the Soothe and Guide steps and the Call costs are derived from points, so no save holds them and nothing needs migrating.
- **Test.** Lane 4 adds an old-save test: Empathy 6 with a step at 5 and Shared Pulse, Camaraderie 5 with Soulmate I.

## 8. OPEN (for Leon; recommendation first)

1. **Cut Touch** and let the Mender's Triage be the only beside-you heal? **Yes:** it removes the Touch / Triage twin and frees a level.
2. **Move Mercy and Open Hand to Insinuation** (talking a beaten foe down), and make Empathy's Mastered "Threads That Hold" (×1.5 through a Bond, Bonds hold while Downed; PROVISIONAL)? **Yes:** alpha = how you fight through the door; sparing is speech.
3. **Old saves with Camaraderie or Insinuation 3+** lose four free unlocks that are now perks. Offer one free re-pick of those steps at load? **Yes,** with the mapped perks preselected.
4. **The Call at 10, "paid with your reaction":** only on your own turn, or off-turn as an answer? **Own turn only:** off-turn needs a new reaction cue for Calls, which is not an approved piece.
5. **Solo Mender bar:** after Taut Thread II and the Bitter Balm numbers, measure the solo Mender with `survival-run.ts`. If it still trails, raise Threads' to-hit from +3 to +4. **Yes,** and measure before touching anything else.

