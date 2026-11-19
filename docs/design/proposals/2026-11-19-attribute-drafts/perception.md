# Perception: the attribute sheet (Ingenuity α · Acuity β · Vigilance γ · Operative)

Sources read: ATTACK-PLAN-2026-11-19 (both rulings), scout-attribute-tables (Perception, lists C and D), skill-pages-read, data/skills.json (ingenuity, analysis, vigilant), shadow.json, forks.json, calls.json, classes.json (infiltrator), perks.json, conditions.json, rules.json `shadow`, actions.json (analyze, resources), ENGINE-HOOKS.md, spec rules 1.32 / 1.56 Shadow 2.0, TRIAGE balance notes. Nothing in E:/phc-wt/rel030 was changed.

## 1. PROMISE

- **Ingenuity:** for rogues, scouts, bandits and gamblers. It lets you be where nobody is looking: slip into Hidden, steal and spoil things from the dark, and land one decisive Break. The price is that you look shifty to anyone in uniform.
- **Acuity:** for detectives, locksmiths, slicers, and anyone who reads an enemy before the shooting starts. It lets you take a lock, a gun or a foe apart in your head. Analyze tells the squad what it faces, and whatever you have read hurts you less.
- **Vigilance:** for snipers, sentries and people on the run. It lets you notice the threat first (traps, hidden foes, a gun aimed from the dark) and point it out to the squad with Spot. The cost is that you never know whether it was real.

## 2. ALPHA LADDER: Ingenuity

Every level: **+1 save TN on your poisons, traps and Shadow verbs** (the via strength, points − 1). Even levels add: **+1 to be spotted while you sneak** (per_point `spot` 1, every 2).

| Lv | gives (card) | id | where it comes from today |
|---|---|---|---|
| 1 | **Shadow** (the door: Hide, Break ×(1 + 0.6 a Shadow, +0.5 ambush, +0.15 Marked), Go to Ground −1 AP Hide, First Shade +1 Shadow) · **Tag** (1 AP, mark a foe within 8 that can't see you; Tagged +1 to hit) · gain: Shadow held 1 | `ingenuity.unlocks.1`, `shadow.tag` | the same, level 1 |
| 2 | small verbs: **Lift** (2 AP, take a grenade or magazine) · **Decoy** (1 AP, 1 Shadow, a noise within 5) · gain: +1 to be spotted | `shadow.lift`, `shadow.decoy` (requires min 3 → 2) | level 3 |
| 3 | perk step · **Ghost Kill** (a kill nobody sees: back into Hidden, once a turn) | `ingenuity.unlocks.3` (Close Quarters removed) | level 3 (the lead's 16 Nov ruling kept) |
| 4 | **fork one**: Light Fingers / Lend the Dark | fork `a`, at 4 | level 4 (never offered) |
| 5 | big verb: **Fade** (2 AP, 2 Shadow: step to cover and go Hidden even when seen) · gain: **+1 Shadow held (2)** | `shadow.fade`, `ingenuity.unlocks.5` (Still Breath removed) | level 5 |
| 6 | perk step · **Cut the Strap** (1 AP, 1 Shadow: disarm an adjacent foe, Heart save) | `shadow.cut_strap` (min 3 → 6) | level 3 |
| 7 | perk step · **Open Seam** (1 AP, 1 Shadow: −2 Defense on a foe for 1 round) · gain: **+1 Shadow held (3)** | `ingenuity.unlocks.7` (Shadow Run removed), `shadow.open_seam` (min 5 → 7) | level 5; step at 7 |
| 8 | **fork two**: Lightkiller / Spotter | fork `b`, moved from 6 to 8 | level 6 (never offered) |
| 9 | perk step · **Timing** (1 AP, 1 Shadow: −1 AP on a foe's next turn) · gain: +1 to be spotted | `ingenuity.unlocks.9`, `shadow.timing` (min 7 → 9) | level 7; the "Parting Cut is listed here" dev text is dropped from the page |
| 10 | **Mastered: Vanishing Act** (once a fight, 2 AP: Hidden where you stand) · gain: +1 to be spotted | `vanishing_act`, kept | the same |

Alpha perks (four steps, so all four tiers): **Long Dark** (`sleight_of_hand`: +8% / +14% from Hidden). **Shadow Step** (`shadow_step`): tier I unchanged (−1 AP on one attack from Hidden). Tier II CHANGED: instead of "twice a turn" it adds **Shadow Run** (once a turn, a Hidden move from cover to cover costs −1 AP, never under 1). It is built from the same `cost_mod` + `limit` rows. Tier II's `requires` min 5 still works under the 3/6/7/9 steps.

**SURPLUS (all of it):**

| thing (today) | destination | why |
|---|---|---|
| Still Breath (Ing 5: −2 to spot rolls next to cover) | Acuity perk `still_breath` tier I | survival in the door is the beta's promise |
| Close Quarters (Ing 3: an adjacent foe must roll at +4) | `still_breath` tier II | same |
| Shadow Run (Ing 7) | Shadow Step tier II | a cost cut on the door, so it belongs with the door's own cost-cut perk; this frees level 7 |
| Read Intent verb (Ing 3) | Vigilance perk `read_intent` (Spot Reads its target) | noticing is the gamma's job; it also duplicates the Read that Tradecraft gives |
| Plant (Ing 7: 2 AP, 1 Shadow, mark an adjacent foe) | cut | Tag does the same from 8 tiles for 1 AP and no Shadow |
| Foul the Action (Ing 5: Lowered) | cut | a weaker twin of Cut the Strap; the Lowered condition stays for other users |
| Vault (Ing 5) | cut | Athletics 3 already has Vault |
| Douse (Ing 5: put out a lamp) | cut; its job goes to the Lightkiller fork | it depends on lamps, and dark maps are not tonight's work |
| Pick (5), Disable (7), Rig (7) | class: Sabotage (rank II) | "takes their machines apart" is the Operative's tagline; Sabotage today duplicates Disable and Rig |
| Hijack (9) | class: Sabotage at rank III | same family; this frees level 9 |
| Parting Cut, Case (pending) | stay pending; when Case's read-out exists it becomes an Acuity tier | they cannot be built today |

## 3. ALPHA FORKS (each runs on Shadow)

| step | option | card line | status |
|---|---|---|---|
| 4a | **Light Fingers** (`fork.shadow.light_fingers`, CHANGED: the N12 version is replaced) | "Lift −1 AP · +1 Shadow for a Lift nobody sees (once a turn)" | buildable today: `cost_mod` on `verb:shadow.lift#lift` (as Vanish does it) + `resource` on `acted` with `target_sees_self: false` and `limit per_turn 1`; the turn's gain cap of 2 still applies |
| 4b | **Lend the Dark** (kept) | "1 AP, 1 Shadow, once a turn: an ally within 4 that no enemy sees: Hidden (fresh ambush)" | buildable today: a verb row with `requires door_pick`, reach `side: ally`, `condition hidden` on the target |
| 8a | **Lightkiller** (`fork.shadow.lightkiller`, CHANGED: N9 smoke is replaced) | "Once a fight, 1 AP, 2 Shadow: −3 sight on you for 2 rounds" (−3 PROVISIONAL) | needs only the approved **seen_range**: a conditions.json row ("darkened", `stat_mod seen_range −3`, 2 rounds) put on the self by the verb |
| 8b | **Spotter** (kept) | "While Hidden: an ally's first weapon hit a round on a Marked foe is an ambush (×1.5), −1 Shadow" | built |

Once Lightkiller is built, both steps can be offered (doorpicks.ts offers a step only when all its options are built).

## 4. BETA: Acuity

Every level (one line): **+1 tile Analyze reach · −5% critical damage taken · +1% to be found while Hidden for each Ingenuity point** (the feed, carrier `spot_tn`, up to +5 at 10/10).

Perk steps at 3 / 5 / 7 / 9 (keep 4 of 8 tiers). Mastered at 10: **Case Closed** (kept).

| perk | tier I | tier II changes | id | adj. | primitive |
|---|---|---|---|---|---|
| **Quick Read** (was the passive at 3) | −1 AP Analyze (2 → 1) | the first Analyze each fight costs 0 AP | NEW `quick_read` | engine | `stat_mod ap_cost:analyze` (already in the data) / `cost_mod` site `analyze` set 0, `per_combat 1`. This retires the points gate `quick_at` in combat.ts analyzeCost. |
| **Read Them** (was the passive at 5) | −15% damage to your squad from foes you analysed | −25% (PROVISIONAL) | NEW `read_them` | engine | a conditions.json row (a `dealing` `damage_mult` against the giver's side) put on by `condition` on `acted` analyze. This retires the typed `analysis >= 5` (combat.ts:2761) and READ_THEM (damage.ts); Case Closed and the fight-start part of Detective's Eye put the same row on. |
| **Still Breath** | −2 to foes' spot rolls while you stand next to cover | + Close Quarters: a foe that ends next to you must roll (+4) instead of finding you | NEW `still_breath` | engine | `roll_mod` on `spot` with `by_cover: here` / `close_roll` (both moved, so one copy) |
| **Pattern Lock** | +2 Defense against an attack type already seen | +4, and +2 for allies | kept `pattern_lock` | engine | existing handler (perks/e.ts) |

Moved out: **Detective's Eye** goes to Vigilance (it is about noticing).

## 4b. GAMMA: Vigilance

Every level (one line): **+1 notice · +1 tile notice range · +1 tile Spot reach** (plus the gamma's +1 on checks a point).

**The Call: Spot** (`call.spot`, hindering, no save), once a turn, reach 4 + 1 a point. Fitted around Leon's costs, the strength steps move to even levels:

| Lv | Call |
|---|---|
| 1 | Spot, **3 AP**: the next ally ignores its cover |
| 4 | step 2 (was 3): and can target it while Hidden |
| 5 | **2 AP** |
| 8 | step 3 (was 7): the next **2** allies, **+1** to hit |
| 9 | **1 AP** |
| 10 | Spot may be paid with your **reaction**, and one more Call that turn costs **1 AP** |

In calls.json `rules`: `ap` 3, a cost table {1: 3, 5: 2, 9: 1}, `steps_at` [1, 4, 8], and the reaction and second Call at 10 (replacing `reaction_at` 9 and `free_at` 10). This is the Call's one price (calls/core.ts) reading a table; no new primitive. Steps and costs are shared by all nine Calls (see OPEN 4).

Perk steps at 3 / 5 / 7 / 9. Mastered at 10: **Nothing Gets Past** (kept: a free Spot on each enemy that moves in sight, once a round).

| perk | tier I | tier II changes | id | adj. | primitive |
|---|---|---|---|---|---|
| **Cold Spine** (the passive at 3, merged) | you learn a hidden aimer's direction · you can't be flanked (half cover and a shield guard every side) | allies next to you can't be flanked either | kept `eyes_in_the_back`, renamed | engine | `stat_mod reveal_aimer_direction` + existing `no_flank` handler (perks/b.ts) |
| **The Tell** (the passive at 5, merged) | in talk you notice hidden weapons and hostile intent · 1 out-of-place detail a scene · a fight starts with 1 trap or weak point shown | 2 details, and whether they connect · 2 traps or weak points | kept `detectives_eye`, renamed, skill analysis → vigilant | hybrid (the narrator parts are hidden in Survival) | `narrator` + perks/g.ts handler + the Read Them row |
| **Got You in My Sight** | +2 AP when a seen enemy hides or leaves sight (once every 3 turns) · −2 AP after an ambush hits you | the drawback goes · the squad knows where it was last seen | kept | engine | existing handler (perks/b.ts) |
| **Read Intent** (removes the door's tax) | your Spot also Reads its target: your side sees its next action | +1 Shadow for a Spot on an enemy that can't see you (once a turn) | NEW `read_intent` (the verb `shadow.read_intent` leaves shadow.json) | engine | `condition read` (skip_save) and `resource shadow` on `acted` with `action_id: call.spot`. **Needs:** the Call to fire the existing `acted` trigger with its id, as Analyze already does (calls/core.ts fires none today). This is one call site, not a new list entry; the lead confirms. |

## 5. CLASS: Operative (`infiltrator`)

| rank | move | verdict | card / primitive |
|---|---|---|---|
| I | Mark (`assassin.mark`) | **KEEP** | marks while seen, 3 at once; the ladder's Tag needs Hidden and a foe that can't see you |
| I | Vanish (`vanish`) | **REPLACE** (id kept) | "Once a turn: Hide 0 AP" (`cost_mod` site `hide`, set 0, `per_turn 1`; PROVISIONAL, measure it against Shadow's 125). Today's version (Fade free) does nothing until Ingenuity 5 and only modifies a ladder verb. |
| II | Toxin (`assassin.toxin`) | **KEEP** | nothing on the ladder does this |
| II | Sabotage (`sabotage`) | **REPLACE** (id kept) | "Pick, Disable, Rig are yours · Disable and Rig cost 0 Shadow · rank III: Hijack". The verbs get `requires {class: infiltrator, rank: 2 / 3}` (meetsRequires) and a `cost_mod res: shadow` on their verb ids. This retires the bespoke `disable_machine` / `rig_tile` / `grant_action:sabotage` (one copy: the `object` lay op, Rig's 25). Its Pin is dropped. |
| III | Execution (`assassin.execution`) | **KEEP** | nothing on the ladder does this |
| III | Called Shot (`gunslinger.called_shot`) | **KEEP** | nothing on the ladder does this |

The class gain **Tradecraft** keeps start 1 Shadow, +1 Shadow held, and Analyze Reads plus +1 Shadow unseen. Its "Analyze costs 1 AP" goes, because Quick Read owns it.

## 7. COUNTS

| skill | felt levels | most things on one level |
|---|---|---|
| Ingenuity | 10 / 10 | 2 (levels 1, 2, 3, 5, 6, 7, 9; 4 and 8 have the fork alone) |
| Acuity | 10 / 10 (5 with a perk or Mastered, 5 with the gain line only) | 1 |
| Vigilance | 10 / 10 | 2 (levels 1, 5, 9, 10) |

Today the counts are 10 / 5 / 5, with Ingenuity's busiest level holding 9 things.

**MIGRATION:**
1. Unlocks and verbs come from points, so no save holds one. A mid-fight save holding a cut verb id (Plant, Foul, Vault, Douse, Read Intent) drops it on load.
2. Ingenuity perk steps move from 3/5/7/9 to 3/6/7/9. A save at Ingenuity 5 with a step taken keeps it (lane 4's old-save test).
3. Shadow forks: neither step was ever offered, so no save holds one. Fork b's move to 8 needs no migration.
4. `detectives_eye` is kept as held (now Vigilance's "The Tell"). The Acuity step it used comes back as an open Acuity pick.
5. `eyes_in_the_back` is the same id, renamed.
6. A save with Acuity 3+ / 5+ gets `quick_read` / `read_them` tier I as held. A save with Vigilance 3+ / 5+ already gets Cold Spine / The Tell's tier I lines through the held perk, or else the tier I is granted. These grants are free and over the step count (see OPEN 2).
7. A non-Operative with Ingenuity 5+ / 7+ / 9 loses Pick, Disable, Rig and Hijack.

## 8. OPEN (for Leon)

1. Should Pick, Disable, Rig and Hijack become the Operative's only, so door users lose them? **Rec: yes.** Machine sabotage is the class's tagline, and the ladder keeps every hand and dark verb.
2. Should a save keep the named passives (Quick Read, Read Them, Cold Spine, The Tell) for free, over its step count? **Rec: yes, grandfather them.** Nobody loses what they had.
3. At Vigilance 10, Spot (a hindering Call) paid with the reaction: own turn only, or off-turn too? **Rec: own turn only for hindering Calls** (the reaction is spent like AP); helping Calls may be off-turn, as today.
4. Should the Call's strength steps move to 1 / 4 / 8 for all nine Calls, so no level holds a perk and a step? **Rec: yes.**
5. Free Hide once a turn (the new Vanish) may push the Operative over Shadow's 125 window. **Rec: build it and measure.** If it goes over, make it once a fight.

The new numbers are PROVISIONAL: Read Them II −25%, Lightkiller −3 sight, Quick Read II 0 AP once a fight, Vanish 0 AP once a turn. Every other number above is taken from data.

