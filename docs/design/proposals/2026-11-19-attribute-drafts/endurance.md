# Endurance: Durability (alpha), Pain Threshold (beta), Senses (gamma), Bulwark (`defender`)

Sources read in E:/phc-wt/rel030 (no file changed): data/skills.json (`durability`, `pain_threshold`, `sensory`), data/forks.json (`fork.guard.*`), data/perks.json, data/classes.json (`defender`, move_pool), data/calls.json (`call.warn` and the shared rules), data/techniques.json `rules.guard`, docs/ENGINE-HOOKS.md, the scout tables, the skill-pages read, TRIAGE, and the attack plan's rulings.

Facts from the code that shape this sheet:
- **Guard pool.** It is capped at 4 (`rules.guard.max`); the Bulwark's pool is 5 / 6 / 7. The Guard technique gives 1 plate, +1 for each point from 2. So for anyone who is not a Bulwark, the "+1 plate" per-point gain stops doing anything from Durability 5.
- **Elemental damage.** Pain Threshold's "−10% elemental a point" is capped at −60% (`character.ts:1131` `elementalTakenPct`), so it stops at Pain Threshold 6.
- **Plate soak.** A plate soaks 6 × the level scale × the Pain Threshold feed (1% × Durability × Pain Threshold) (`guardSoak`).

## 1. PROMISE

- **Durability.** For the brawler who tanks for the team: stand in front, take the hits on your plates, and make the foes hit you instead of your friends.
- **Pain Threshold.** For the one who keeps fighting hurt: wounds, fire, poison and the killing blow don't stop you, and your plates soak more.
- **Senses.** For scouts and people who walk for the breeze: nothing sneaks up on you, you read a person's body in a conversation, and you warn a friend before the blow lands.

## 2. ALPHA LADDER (Durability)

**Per-point gain on every level:**
- **Levels 1–4:** "+1 Guard plate held" (pool 1, up to 4).
- **Every level:** "+1 melee to hit while holding Guard". Durability rolls in place of the weapon's skill when it is higher.
- **From level 2:** "+1 plate from the Guard technique".
- **Pain Threshold feed:** "+1% plate soak per Pain Threshold point" on every level.

| Lv | gives (card line) | id | where it comes from today |
|---|---|---|---|
| 1 | **Guard** (the door): "the Guard technique (any weapon) +1 plate; Brace +2 plates; melee rolls with Durability while you hold Guard" | `durability.unlocks.1` (kept) | Level 1 today. The paragraph is cut to the door: the shield rules leave, and so do Close Guard, Set Against the Blow, Retort and Last Plate. |
| 2 | **Challenge**: "1 AP, −1 Guard: every foe you see within 2 tiles makes a Heart save or is Taunted" | action `guard_challenge` (kept) | Gated at Durability 3 today. The gate moves to 2. Keep the effect inside `unlocks.1` so Called Out's key `skill:durability.1#guard_challenge` still matches; the page must draw it at its gate. |
| 3 | Perk step (Mastery 1) | `unlocks.3` (kept) | 3 |
| 4 | **Fork one**: Provoke or Cover Them | `fork.guard.provoke` / `fork.guard.cover_them` | 4 |
| 5 | **Slam**: "2 AP, −2 Guard: every foe next to you is pushed 1 tile and makes a Body save or is Off Balance" | action `guard_slam` (kept) | 5 (gated through `unlocks.1`) |
| 6 | Perk step (Mastery 2) | `unlocks.5`'s perk step moves to key 6 | Was at 5 |
| 7 | Perk step (Mastery 3) | `unlocks.7` | 7 |
| 8 | **Fork two**: Stand Fast or Drive | `fork.guard.stand_fast` / `fork.guard.drive` (step 6 → 8; `forks[b].at` 8) | Was at 6 |
| 9 | Perk step (Mastery 4) | `unlocks.9` | 9 |
| 10 | Mastered: **Last Wall** | perk `last_wall` (kept) | 10 |

The alpha's two perks are kept unchanged on the four steps (3, 6, 7, 9), which buy four tiers:
- **Weight of the Wall** (`bulwark`). I: "+2% weapon damage a plate held (to +10%)". II: "+3% (to +15%)".
- **Answer in Kind** (`shrug_it_off`). I: "+8% weapon damage after a blow hurts you". II: "+12%, and +1 Guard (once a round)".

**SURPLUS** (what level 1 and 5 hold today that leaves the ladder):
1. **Shield rules** ("a shield +1 to every plate gain; two shields ×2"): moved to the shields' own item text. The numbers stay in `techniques.json rules.guard`. They are a rule of the gear, not a level.
2. **Close Guard** (25% of a blow on an adjacent ally comes to you): moved to a Pain Threshold perk. It is combat support that feeds the door, and the page read asked for it to leave level 1.
3. **Set Against the Blow** (a critical on you while holding Guard lands as a plain hit, with no injury): moved to Pain Threshold, folded into Numb's tier II. It is defence against injury, which is the beta's promise.
4. **Retort** (−1 Guard and your reaction throw 50% of a melee blow back): moved to the Bulwark's rank II, replacing Unbroken. It is the door's offensive Answer, which makes the class the door's best user.
5. **Last Plate** (once a fight, 1 HP and every plate broken): cut. It is the fourth "survive at 0" in this attribute, next to Last Wall (Mastered 10), Still Standing (Pain Threshold) and Unbroken (class).
6. **Second Wind** (2 AP, once a fight, heal 25%): moved to a Pain Threshold perk. It is survival. See OPEN 1 for the solo-sustain risk.

## 3. ALPHA FORKS (all four are built today and kept; they run on Guard)

**Fork one, at 4:**
- **Provoke**: "While you hold Guard, the first foe each round whose blow lands on your plates is Taunted 1 round, no save." Built (mark + condition, `self_has_res guard`).
- **Cover Them**: "Answer: the first ranged hit each round on an ally within 2 tiles lands on you; −1 Guard and your reaction." Built (redirect, `uses_left`, resource −1).

**Fork two, at 8** (both modify Slam, the big verb at 5):
- **Stand Fast**: "Slam is a shockwave: no push; every foe within 2 tiles is Taunted 1 round, no save, and makes a Body save or is Off Balance." Built (branches on Slam's effects, `door_pick`).
- **Drive**: "Slam pushes 2 tiles; its Off Balance save is at −2; +1 Guard for each foe knocked Off Balance (at most 2 a turn)." Built (`roll_mod` on `cond_incoming`, resource on `cond_landed`).

No approved piece is needed. The only change is fork two's step (6 → 8) in skills.json and forks.json.

## 4. BETA: Pain Threshold

**Per-point gain** (shown on levels 1, 2, 4, 6, 8): "+1% plate soak a Durability point · −10% elemental damage (to −60%) · +2 max HP a level". The elemental part stops at 6.

**Perk steps** at 3 / 5 / 7 / 9. Mastered at 10.

1. **Numb**: perk id `numb` (NEW as a perk; was unlock 3). Engine.
   - I: "One injured limb no longer holds you back."
   - II: "+ a critical on you while you hold Guard lands as an ordinary hit, with no injury."
   - Built from: `stat_mod ignored_limb_injuries`, plus Set Against the Blow's `damage_mult replaces: critical`, cancel on `injury`, and its marks, moved out of Durability's `unlocks.1`. The `self_skill durability 3` gate is dropped and `self_has_res guard` is kept.
2. **Still Standing**: perk id `still_standing` (NEW as a perk; was unlock 5; action `still_standing` kept). Engine.
   - I: "When your HP runs out, one more turn with 3 AP before you fall Downed (once a fight)."
   - II: "that turn has 5 AP" (5 is PROVISIONAL).
   - Built from: `grant_action still_standing`, with `ap` set per tier.
3. **Second Wind**: perk id `second_wind` (NEW as a perk; action `second_wind` kept; moved from Durability 5). Engine.
   - I: "2 AP, once a fight: heal 25% of your max HP."
   - II: "+2 Guard with it" (2 is PROVISIONAL).
   - Built from: `grant_action second_wind`, with a nested resource op in II.
   - Lane 2's TRIAGE row 4 (the action missing from the bar, a possible clash with `boon.second_wind`) must be fixed first.
4. **Close Guard**: perk id `close_guard` (NEW; moved from Durability's door). Engine.
   - I: "Answer: 25% of a foe's blow on an ally next to you comes to you; your plates soak it."
   - II: "50%" (PROVISIONAL).
   - Built from: `redirect` (share, `target_within 1`, `answer_on close_guard`; keep that key so saved Answer lists still match).

**Mastered:** **Walking Wounded** (`walking_wounded`, kept): "Injuries cost no AP or Movement; below half HP, −20% damage taken."

**Removed:**
- **Used to the Pain** (`used_to_the_pain`): fiddly; overlaps the soak. A save holding it gets **Second Wind** at the same tier.
- **Scar Tissue** (`scar_tissue`): duplicates the per-point elemental row. A save holding it gets **Numb** at the same tier.

## 4b. GAMMA: Senses

**Per-point gain** (shown on levels 1, 2, 4, 6, 8): "+1 on Senses checks · +1 to sense the unseen · +1 tile Warn reach" (reach is 4 + 1 a point).

**Perk steps** at 3 / 5 / 7 / 9. Mastered at 10.

1. **Read the Air**: perk id `read_the_air` (NEW as a perk; was unlock 3). Hybrid.
   - I: "Read one tell of someone close: +2 on your next social roll against them."
   - II: "+4" (PROVISIONAL).
   - Built from: `narrator` + `skill_mod_tag social:next_roll_vs_target`, value per tier.
2. **Bedside Manner** (`bedside_manner`, kept). Narrator.
   - I: "Touch someone in a conversation: the Narrator tells you privately if their next words are a lie."
   - II: "+ whether they are afraid, and of whom."
   - Built from: `narrator`.
3. **Wind on the Skin** (`wind_on_the_skin`, kept). Engine.
   - I: "At the fight's start the squad learns the tile of the nearest unseen foe in your Vision."
   - II: "every unseen foe."
   - Built from: `reveal`.
4. **Tremor**: perk id `tremor` (NEW as a perk; was unlock 5). Engine. This perk removes the door's tax: plates start at 0 each fight.
   - I: "Nothing moving on the ground in your Vision surprises you: you act in the surprise round."
   - II: "+2 Guard when a fight starts" (2 is PROVISIONAL).
   - Built from: `grant_action act_in_surprise_round`; `resource guard` on `combat_start`, the same op the Bulwark's Brace uses. Check how the surprise round now meets the approach phase (rules 1.64).

**Mastered:** **Skin Map** (`skin_map`, kept): "No foe within 6 tiles stays Hidden from you; your shots within 6 tiles ignore smoke."

**The Call: Warn** (`call.warn`), on Leon's ruling:

| Level | Card line |
|---|---|
| 1 | "Warn: 3 AP, once a turn: the ally steps 1 tile out of the next attack's way" |
| 4 | "steps up to 2 tiles" (step 2) |
| 5 | "Warn costs 2 AP" |
| 8 | "up to 2 tiles, and that attack is at −2 to hit" (step 3) |
| 9 | "Warn costs 1 AP" |
| 10 | "Warn may be paid with your reaction; one more Warn this turn costs 1 AP" |

Fitting the steps:
- I propose moving the shared `calls.json rules.steps_at` from [1, 3, 7] to **[1, 4, 8]** (PROVISIONAL). The steps then land on levels that only show per-point gains, and no level carries more than two things. This touches all nine Calls, so it is the lead's call across the nine sheets.
- If [1, 3, 7] is kept, levels 3 and 7 carry a perk step plus a Call step: still two, within the target.
- What it needs: `calls.json rules` reshaped (ap 3; cheap steps 5 → 2 and 9 → 1; `per_turn` 1, and 2 at 10; `reaction_at` 10) and read by the Call code. This adds nothing to the closed lists. The old 0-AP reaction at 9 and the free first Call at 10 go.

## 5. CLASS: Bulwark (`defender`)

| Rank | Move today | Verdict | Card line | Primitive |
|---|---|---|---|---|
| I | Brace (`defender.brace`) | **KEEP** | "2 AP: Guard equal to your Durability; Braced +2 Defense; Interpose takes a whole blow on an adjacent ally for 1 Guard and your reaction; a fight starts with 1 Guard" | resource, condition, stat_mod, grant_action |

Brace gives the bigger gain, Braced, Interpose and the starting plate, none of which the ladder has. Lane 1 should fix the name clash with the ladder's 1-AP Brace (+2 plates).

| Rank | Move today | Verdict | Card line | Primitive |
|---|---|---|---|---|
| I | Called Out (`defender.draw_fire`) | **KEEP** | "Challenge costs no Guard; the foe you name gets no save" | cost_mod, condition |

Called Out changes Challenge and duplicates nothing. TRIAGE row 13 (the target still rolls a save) is lane 2's bug.

| Rank | Move today | Verdict | Card line | Primitive |
|---|---|---|---|---|
| II | Unbroken (`adamantile_knight.unbroken`) | **REPLACE** with **Retort**, NEW move id `retort` | "Answer: a foe hits you in melee while you hold Guard: −1 Guard and your reaction throw 50% of the blow back" | Retort's `deal` effect and `amounts.retort`, moved from `durability.unlocks.1` (keep answer key `retort`) |

Unbroken is a floor that duplicates Last Wall and Still Standing. TRIAGE row 5 (Parry eats the reaction, so Retort never fires) must be fixed in lane 2.

| Rank | Move today | Verdict | Card line | Primitive |
|---|---|---|---|---|
| II | Shrug It Off (`shrug_it_off`) | **KEEP** | "Bleeding, Slowed, Weakened or Prone ends at once: −1 Guard and your reaction" | reaction, cleanse (core) |

Shrug It Off's cleanse appears on no ladder level. Note that it shares the id `shrug_it_off` with the perk Answer in Kind, in a different namespace; worth renaming one when convenient.

| Rank | Move today | Verdict | Card line | Primitive |
|---|---|---|---|---|
| III | Reactive Plate (`defender.reactive_plate`) | **REPLACE** with **Reforge**, NEW `reforge` | "+2 Guard at the start of your turn when you hold 1 or none" (2 is PROVISIONAL) | resource on `turn_start`, if `self_res {guard: {at_most: 1}}` (exists) |

Reactive Plate only raises the ladder's plate soak from 6 to 10, and its ambient-mana side is cut.

| Rank | Move today | Verdict | Card line | Primitive |
|---|---|---|---|---|
| III | Anchor (`anchor`) | **KEEP** | "While Braced you can't be pushed, pulled or knocked Prone; a neighbour leaving you provokes your opportunity attack, even if it Disengages" | `anchor` (bespoke, `classes/rev3.ts`), `free_attack` |

Anchor has no ladder twin.

## 6. Special rulings

None of the named rulings is Endurance's. The solo-sustain note from TRIAGE (the tank starves alone) is answered by Second Wind on Pain Threshold and Reforge on the class, plus the self stim fix in lane 2. Measure a solo Bulwark's stage-1 clears with `simRun` before and after.

## 7. COUNTS and MIGRATION

| Skill | Felt levels today | Felt levels new (per-point counted / named only) | Busiest today → new |
|---|---|---|---|
| Durability | 9 | 10 / 10 | L1: 5 things → 1 |
| Pain Threshold | 5 | 10 / 5 | L3: 2 → 1 |
| Senses | 5 | 10 / 8 with steps [1, 4, 8] | 2 → 2 (L5, L9, L10) |

Pain Threshold reaches 8 or more felt levels only because Leon ruled that the per-point gain shows on levels 1, 2, 4, 6 and 8.

**Migration:**
1. **Durability perk steps** move from 3 / 5 / 7 / 9 to 3 / 6 / 7 / 9. A save keeps every step it holds. A new step is offered only when the steps due exceed the steps held.
2. **Fork two** moves from 6 to 8. A save holding `door_pick` `stand_fast` or `drive` keeps it. A save at 6–7 that never picked is offered the fork at 8.
3. **Unlocks are read from points, not held**, so Last Plate, Set Against the Blow, Close Guard, Retort, Second Wind, Numb, Still Standing, Read the Air and Tremor carry no save state. A character who had Second Wind from Durability 5 loses it unless they take the perk. Say this in the changelog.
4. **Removed perks:** `used_to_the_pain` becomes `second_wind` at the same tier; `scar_tissue` becomes `numb` at the same tier.
5. **Class moves** are derived from class and rank, so Unbroken → Retort and Reactive Plate → Reforge need no save change.
6. **Answer toggles** `close_guard` and `retort` keep their keys.

Lane 4 adds a test with an old save at Durability 6 / Pain Threshold 3 that holds M2, fork b and `scar_tissue` I.

## 8. OPEN (for Leon)

1. **Second Wind as an optional Pain Threshold perk**, instead of guaranteed at Durability 5? It is the tank's only self-heal. *Recommended: yes, as a perk, plus Reforge on the class; measure solo clears, and if they drop, make Second Wind the Bulwark's rank-II move instead of Retort.*
2. **Remove Used to the Pain and Scar Tissue?** Scar Tissue repeats the per-point elemental row, and that row is already capped at −60%. *Recommended: remove both, with the mapping above.*
3. **The Guard pool cap of 4.** It makes "+1 plate from the Guard technique" dead from Durability 5 for anyone who is not a Bulwark. *Recommended: keep the cap (the Bulwark's 5 / 6 / 7 is its edge), stop showing the plate gain past 4 points, and show the to-hit and soak gains instead.*
4. **Move the Calls' shared steps from [1, 3, 7] to [1, 4, 8]** (all nine Calls)? *Recommended: yes; it fills the per-point-only levels and keeps every level at two things or fewer.*
5. **Cut Last Plate** (the fourth "survive at 0" in this attribute)? *Recommended: cut; Still Standing, Last Wall and Bite the Bullet (the Guts + Pain Threshold combo) cover it.*

