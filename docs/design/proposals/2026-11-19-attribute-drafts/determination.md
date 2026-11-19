# Determination sheet: Will Power / Composure / Lore Master / Channeler

I read: the ATTACK-PLAN rulings, the scout tables and the Outburst/Strain scout, the skill-pages read, skills.json (will_power 4640, composure 4880, lore_master 5044), forks.json 1111-1210, perks.json, classes.json base/7, soul_modules.json (cycle, limits, gates), ENGINE-HOOKS (triggers, predicates, ops, cost sites, stats) and the engine where a claim needed it. I changed no file.

## 1. PROMISE

- **Will Power** (alpha): for Emanator users, monks, crusaders and Bonders. It must let them charge a Soul spell through the heart, push it past what is safe and release it hard, with Strain as the price they manage.
- **Composure** (beta): for guards, iron men and lead men who never move first. It must let the caster carry more Strain, shrug off fear and despair, and stand still under fire until the moment to act.
- **Lore Master** (gamma): for dreamers, divine casters and spellswords. It must let them name what they face so it can't get into their head, know the supernatural, widen what their Outbursts can be, and take the edge off the heart's cost.

## 2. ALPHA LADDER: Will Power

Every level shows: **+10% Outburst power, +10% mana syphoned, +1 Outburst hit and save** (the skill modifier). Some levels show more, in the per-point column.

| Lv | Gives | Per-point line on the level | Existing id or NEW | Where it comes from today |
|---|---|---|---|---|
| 1 | **The door: Outbursts**: Begin, Pump, Release, Strain; Steady, Let go and Heart Overwatch; the first Pump of a fight is free | +10% Outburst power | existing (`door_line`, soul_modules `cycle`) | skills.json door_line |
| 2 | **Overdraw** (small verb): once a turn a Pump adds +2 stages; the first of a fight costs no Strain, each after it +1 Strain. Also learn the modules Size and Quiet | +1 Outburst reach | `overdraw`, moved from unlock 3 to 2; module gate tier 1 | skills.json unlocks.3; soul_modules gates |
| 3 | **Perk step** (M1); **+1 free Pump each round** | +1 module slot | `perk_choice` (taken out of Overdraw's row); `cycle.free_pumps` at WP 3 | unlocks.3; per_point "from 3" |
| 4 | **Fork one**: Ride the Edge or Slow Burn. Also learn the modules Bloom and Volley | +1 Outburst reach | fork `a` (`at: 4` kept); module gate tier 2 | forks.json; soul_modules gates |
| 5 | **Two Schools** (big verb): a design carries a second school at half strength, +10 MP | (none beyond the base line) | soul_modules `second_school.from_will_power: 5` (not shown on the ladder today) | soul_modules.json |
| 6 | **Perk step** (M2) | +1 Outburst reach, +1 module slot | perk step moved from 5 to 6 | unlocks.5 (M2) |
| 7 | **Perk step** (M3) | (none) | unlocks.7 kept | skills.json |
| 8 | **Fork two**: Blood Price or Clean Break | +1 Outburst reach | fork `b`, `at: 6` → `at: 8` | forks.json |
| 9 | **Perk step** (M4) | +1 module slot | unlocks.9 kept | skills.json |
| 10 | **Mastered: The Twin Pays** (`the_twin_pays`); resisting Overreach costs 2 Echo | +1 Outburst reach | kept | perks.json |

Module slots stay as today (3 / 6 / 9). Reach stays every 2.

The alpha's two perks stay unchanged and fill its four steps (2 perks x 2 tiers):
- **Clenched Heart** (`heart_overload`): +5% at stage 3+; tier II adds +5% at stage 2 and +10% at 3+.
- **Resonance** (`resonance`): +4% a Release, up to +8%; tier II up to +12%, and an ally's Release counts.

**SURPLUS (what Will Power gives today that does not fit):**
1. **+1 Strain limit every 2 points:** cut from Will Power (ruling 5). Composure carries the limit; Composure's feed (x1% x WP x Comp) is cut too.
2. **+1 design ready every 2 points:** moves to Lore Master's per-point line with the same formula on Lore Master points (3 at least, then 4/5/6/7 at 4/6/8/10). It is the occultist's library and the gamma's quality of life. This leaves Occult Library a duplicate (section 5).
3. **Pure Heart (WP 5):** becomes a Composure perk. It is a safety for the door, which is the beta's job.
4. **"A held Outburst swells without Strain" (WP 7):** moves to Composure 6. It is surviving in the door. Data: `cycle.swell_no_strain {will_power: 7}` → `{composure: 6}` (level PROVISIONAL).
5. **Overdraw** moves from 3 to 2 and stays in the alpha.

## 3. ALPHA FORKS (run on Strain)

Approved pieces used: N3b (Strain as a resource row) and N10 `at: "limit"`. Nothing else new.

| Step | Option (id kept) | Card line | Status | Built from |
|---|---|---|---|---|
| 4 | **Ride the Edge** `fork.soul.ride_the_edge` (kept) | Release at exactly your Strain limit: x1.15 Outburst damage | Sealed until N3b and `at: limit` (both approved) | trigger `dealing`; `damage: [outburst]`; `self_res {strain: {at: "limit"}}`; `damage_mult` 1.15 |
| 4 | **Slow Burn** `fork.soul.slow_burn`, **REPLACED** (the old rule needs N22, a held-turn-start trigger, which is not approved) | Once a turn: Steady the heart costs 0 AP and calms 1 more Strain | The 0 AP half can be built today; the extra Strain is sealed until N3b | `cost` + `action: [steady]` + `cost_mod set 0`, limit per_turn 1; `acted` + `action: [steady]` + `resource strain -1` (calm 1: forks.json number kept) |
| 8 | **Blood Price** `fork.soul.blood_price`, **REPLACED** (the old rule needs N18, a Pump cost site and paying in HP, which is not approved) | Each time your heart burns you: your next Release x1.25 damage (PROVISIONAL 1.25) | **Can be built today**, no new piece | `damaged` + `self_harm: true` → `mark` flag; `dealing` + `damage: [outburst]` + `flag` → `damage_mult` 1.25; `acted` + `action: [release]` → `mark clear`. Checked: heartHarm goes through applyDamage, which emits `on_damaged` (magic.ts:952, damage.ts:128) |
| 8 | **Clean Break** `fork.soul.clean_break`, **REPLACED** (stage 4 needs a stage predicate, which is not approved) | An Outburst that drops a foe: -2 Strain (once a turn) | Sealed until N3b | `kill` + `damage: [outburst]` (the predicate reads `ctx.src` on a kill, triggers.ts:172) + `resource strain -2`, limit per_turn 1 (calm 2: number kept) |

How the pairs read: fork one is hold at the limit or bleed it off; fork two is live over the limit or finish clean.

With N3b and `at: limit` built, all four options are buildable, so both steps can be offered. Still to verify in code before building: that `acted` carries `steady` and `release` as its action names (game.ts actedName → actionName).

## 4. BETA: Composure

**The Strain limit:** 3 at Composure 0, +1 at Composure 1, 2, 4, 6 and 8. That gives 4 / 5 / 5 / 6 / 6 / 7 / 7 / 8 / 8 / 8 at Composure 1 to 10. It is one copy: character.ts `strainLimit` reads soul_modules `strain.limit {base 3, composure_at [1,2,4,6,8]}`; the Will Power term and the feed go.

Every level also shows **+1 Heart saves**.

| Lv | Gives (card) |
|---|---|
| 1 | +1 Strain limit |
| 2 | +1 Strain limit; learn the modules Homing, Swift, Left, Right and Silent (existing gate) |
| 3 | Perk step |
| 4 | +1 Strain limit |
| 5 | Perk step |
| 6 | +1 Strain limit; held Outbursts swell without Strain (from Will Power 7) |
| 7 | Perk step |
| 8 | +1 Strain limit |
| 9 | Perk step |
| 10 | Mastered: **Still Water** (`still_water`, kept) |

**The four perks** (steps at 3 / 5 / 7 / 9; four of eight tiers):

1. **Poker Face**: NEW perk id `poker_face`, made from unlock 3 (named passive).
   - I: -3 to anyone questioning you or reading your lies.
   - II adds: +2 on Brain saves (PROVISIONAL).
   - Engine. Built from `tn_mod` (existing) and `stat_mod save_brain` (the `save_<…>` stat family).
   - Absorbs `you_get_used_to_it` (cut). Its save boost to allies repeats the gamma's Name It.
2. **Stand Still**: NEW perk id `stand_still`, made from unlock 5 (named passive). The grant `stand_still_counter` is kept.
   - I: until you first act, -2 to hit you; the first foe to miss gives you a free attack, once a fight.
   - II changes: Begin, Pump and Steady don't count as acting. This feeds the door.
   - Engine. The existing `defense_until_first_act` handler; its "not acting" list (only Call today) is read from the perk's data.
3. **Pure Heart**: NEW perk id `pure_heart`, moved from Will Power 5. The grant `pure_heart` is kept.
   - I: once a fight, the Strain that would Mana Short you is refused; your Strain falls to your limit.
   - II changes: twice a fight (PROVISIONAL).
   - Engine. The existing handler perks/skills.ts:162-173 on the `strain` hook; its use count is read from data.
4. **Flat Line** (`flat_line`, kept).
   - I: when the fight starts, the most dangerous foe has -1 to its attacks while it sees you.
   - II changes: -2.
   - Engine, existing `attack_mod`.

## 4. GAMMA: Lore Master

Every level shows **+1 Name It reach** and **+1 on checks and Asks**.

**Call: Name It** (`call.name_it`), once a turn.

| Lv | Call |
|---|---|
| 1 | 3 AP; +2 on all saves for the ally (or you) until your next turn |
| 4 | Step 2: +3 on saves, and a new save against one condition |
| 5 | Costs 2 AP |
| 8 | Step 3: +4 on saves, a new save, and Shaken and Afraid end |
| 9 | Costs 1 AP |
| 10 | It may be paid with your reaction (0 AP); one more Call that turn for 1 AP |

- The strength steps move from 1 / 3 / 7 to 1 / 4 / 8 so they sit off the perk-step levels. `steps_at` is shared by all nine Calls (PROVISIONAL).
- calls.json `rules` changes: `ap 3`, cheap steps 5 → 2 AP and 9 → 1 AP, `reaction_at 10`, `free_at` → `extra_at: 10` with `extra_ap: 1`, `per_turn: 1`. The code stays in one place (calls/core.ts callAp / gate).

| Lv | Gives (card) |
|---|---|
| 1 | Name It; your first Outburst tone (existing: LM 1) |
| 2 | Learn the forms Wave, Burst, Aura and Lance, and the modules Time, Ether and Phantom (existing gate) |
| 3 | Perk step |
| 4 | Name It step 2; learn Ricochet, Fuse and Return (gate tier 2); +1 design ready |
| 5 | Perk step; Name It costs 2 AP |
| 6 | +1 design ready |
| 7 | Perk step |
| 8 | Name It step 3; +1 design ready |
| 9 | Perk step; Name It costs 1 AP |
| 10 | Mastered: **True Name** (`true_name`, kept); Name It may be paid with the reaction and a second Call costs 1 AP; +1 design ready |

**The four perks:**

1. **Old Tales**: NEW perk id `old_tales`, made from unlock 3 (named passive). The grant `old_tales_question` is kept.
   - I: once a scene, one true answer about a supernatural creature, curse or relic.
   - II adds: you read and speak any ancient or upper-realm script, and an upper-realm being parleys with you once (holds its attacks a turn).
   - Narrator. Absorbs `old_tongue` (cut, same tier).
2. **Ward**: NEW perk id `lore_ward`, made from unlock 5 (named passive). The grant and cost site `ward` are kept. Show it as "Warding Word": the Chaplain's move is also named Ward.
   - I: 1 AP, an ally within reach gets +3 on their next save against a supernatural effect.
   - II changes: 0 AP once a turn (PROVISIONAL).
   - Engine. `cost` + `action: [ward]` + `cost_mod set 0`, limit per_turn.
3. **Rite in the Field** (`rite_in_the_field`, kept, changed by Leon's ruling).
   - I: every 5 kills in the fight, your next Crystallise costs 0 AP and makes a core without taking mana from the air.
   - II changes: every 3 kills.
   - The old Crystallise and Name It discounts are cut; the Call ladder now prices Name It.
   - Engine. Counting can be built today: `kill` + `actor: [self, ally]` + keyed `use` limits at 5 / 10 / 15 (II: 3 / 6 / 9 / 12 / 15, at most 15 a fight, PROVISIONAL) + `mark` a flag; then `cost` + `action: [crystallise]` + flag → `cost_mod set 0`, and `acted` crystallise → `mark clear`.
   - Needs: a Crystallise that leaves the air alone. That is a field on Crystallise, not an approved piece. See OPEN 1.
4. **Recitation**: NEW. It removes the door's tax.
   - I: once a turn, a Call you make calms 1 Strain.
   - II changes: 2 Strain (PROVISIONAL).
   - Engine. `acted` + `action: [call]` + `resource strain -1/-2` (N3b), limit per_turn.

## 5. CLASS: Channeler

| Rank | Move | Verdict | Card line / primitive |
|---|---|---|---|
| I | **Shape** `shape` | KEEP | +0.12 to your free Pump's multiplier. No ladder level gives it. `stat_mod free_pump_step`. |
| I | **Iron Heart** `iron_heart` | KEEP, re-ruled | Once a fight, on falling into Mana Shock: -2 Strain. Uses the existing bespoke handler `channeler.iron_heart` (already in the lint baseline). Needs a call site after `m.shock = true` (magic.ts:997): emit the existing `strain_change` hook there with why `shock`. Strain comes off through the N3b row. Distinct from Pure Heart, which stops the Short before it happens. |
| II | **Storm Front** `storm_front` | KEEP | The arc to 2 more foes; no ladder twin. |
| II | **Occult Library** `occult_library` | REPLACE half | Its +1 design ready repeats Lore Master's ladder. New card: learn one more tone (once, out of a fight); once a turn, Syphon costs 0 AP (PROVISIONAL). The tone half is the only tone route in Survival and keeps its handler. The Syphon half is `cost` + `action: [syphon]` + `cost_mod set 0`, limit per_turn. |
| III | **Heart Surge** `heart_surge` | KEEP | It works at the Release and the snap cast (a snap fires at stage 1); Overdraw works at the Pump. Same family, different moment. |
| III | **Eye of the Storm** `eye_of_the_storm` | KEEP | A Release with no Strain; no twin. |

## 6. Rulings applied

- **Strain limit:** done in section 4 (Composure); Will Power gives none.
- **Rite in the Field:** done in section 4 (Lore Master).
- **Iron Heart:** done in section 5.
- The Strength, Expression, Insight and Perception rulings belong to other sheets.

**Balance note:** the Strain limit cut lands hardest on casters with no Composure. Will Power 10 with Composure 0 goes from 8 to 3; 10/10 goes from 16 to 8. That also slows the outside playtest's level-2 burst (152 Soul damage for 32 MP). Re-measure with `test/balance/outburst-measure.test.ts`.

## 7. COUNTS and MIGRATION

| Skill | Felt of 10 | Most things on one level |
|---|---|---|
| Will Power | 10 | 2 (levels 2, 3, 4) |
| Composure | 10 | 2 (levels 2, 6) |
| Lore Master | 10 | 2 (levels 1, 4, 5, 9, 10) |

All three are within 2 felt levels of each other.

**Migration:**
1. **Will Power perk steps** (now at 3 / 6 / 7 / 9): a save keeps every step it took. Steps owed = steps at levels up to its points, and no new step comes until the owed count passes what it holds. Example: Will Power 5 holding 2 steps keeps both and gets nothing new at 6.
2. **Will Power forks:** no save holds one, because steps 4 and 6 were never offered (doorpicks.ts:81-93). Fork b moves from 6 to 8; nothing to convert.
3. **Unlocks** are worked out from points: Overdraw now comes at 2, and Pure Heart leaves Will Power 5 (see OPEN 3).
4. **Composure:** `flat_line` is kept; `you_get_used_to_it` → `poker_face` at the same tier.
5. **Lore Master:** `old_tongue` → `old_tales` at the same tier; `rite_in_the_field` keeps its tier under the new rule.
6. The old automatic unlocks (Poker Face, Stand Still, Old Tales, Ward) are now chosen perks (see OPEN 3).
7. **Strain limit and ready designs** are worked out when a fight starts, so they need no save change. Readied designs over the new cap are unreadied, never deleted.
8. **Data and tests to touch:**
   - Composure `feed` block and per_point row; `beta-feeds-1-60.test.ts:107-113`.
   - The limit text in `rules.json:379`, `classes.json:2186` and `glossary.ts:92`.
   - Data bug to fix: skills.json `tags` mark Composure as "gamma" and Lore Master as "beta".

## 8. OPEN (for Leon)

1. **How should Rite in the Field be built?** It can be built today as "every 5th kill (3rd at tier II): +1 spare core in your pack" (`resource cores +1`). Your exact wording needs Crystallise to have an "air untouched" field, which is not an approved piece. *Recommend: the core goes straight into your pack. The card says the kill is the rite.*
2. **Whose kills count for Rite in the Field?** *Recommend: any foe the squad drops (deaths feed the air); the Lore Master is often in support.*
3. **What do old saves get for the automatic unlocks that became chosen perks** (Poker Face, Stand Still, Old Tales, Ward, and Pure Heart from Will Power 5)? *Recommend: one free re-pick of Composure's and Lore Master's perk steps on first load. Nothing extra for Pure Heart.*
4. **Should the Call strength steps move from 1 / 3 / 7 to 1 / 4 / 8 for all nine gammas** (a shared calls.json rule), so no gamma level carries a perk step and a Call step together? *Recommend: yes.*
5. **At 10, may "paid with your reaction" be used on your own turn and for hindering Calls?** *Recommend: only off your own turn, as the reaction Call works today, but now for hindering Calls too.*

