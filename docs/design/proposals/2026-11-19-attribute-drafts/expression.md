# Expression: the sheet (Visualization / Improvisation / Charisma / Rigger)

Sources read: ATTACK-PLAN-2026-11-19 (lane 3 scope, the 18 Nov evening rulings), scout-attribute-tables (Expression, list C, the primitives table), skill-pages-read, data/skills.json (visualization, proficiency, charisma), data/figments.json, data/perks.json, data/calls.json, data/classes.json (trickster, infiltrator.field_fix), the core rules (rules 1.34), docs/ENGINE-HOOKS.md, packages/engine/src/figments.ts and classes/rev3.ts, and the outside-playtest TRIAGE.

## 1. PROMISE

- **Visualization (alpha):** for painters, critics and anyone using a projector. It lets you picture shapes of mana that lie for you, guard for you and fight for you, as decoys, traps, cover and strikers, run on the Visualizer's charge.
- **Improvisation (beta):** for field mechanics and anyone who keeps working after the plan dies. It keeps your gun firing and your machines and Figments standing, and stops an ambush from catching you flat.
- **Charisma (gamma):** for the face of the squad (politicians, merchants, lawyers). It lets you charm, persuade and lie with a smile, talk a fight down before it starts, keep the squad moving with Rally, and pay less of the Figment tax.

## 2. ALPHA LADDER: Visualization

Every level from 2 also gives "+1 tile Figment reach · +1 Figment to hit". The to-hit is the Visualization modifier that Figments roll with.

| Lv | gives | gain shown on the level | existing id or NEW | where it comes from today |
|---|---|---|---|---|
| 1 | **The door, Figments:** Picture the Double or the Snare (Redraw, Cash in and Let go are verbs on the Figment itself). **Glimmer** | Reach 5 · 1 held | unlock `1` Figments; forms `double`, `snare`; item `glimmer` | L1 today, unchanged (it reads as 2 things, not 6) |
| 2 | Small verb: **the Hand** | +1 reach · +1 to hit | form `hand` | L2 today (per_point "at 2") |
| 3 | Perk step (Mastery 1) | +1 reach · +1 to hit · 2 ready designs, 1 trait each | unlock `3` | L3 today |
| 4 | **Fork one:** the Wall or the Ward | +1 reach · +1 to hit | ladder `fork a`, now `of: [wall, ward]` | fork a at 4 (was Eye / Wall / Ward) |
| 5 | Big verb: **the Eye** | +1 reach · +1 to hit · +1 held (2) · +1 design (3) | form `eye` (opens.min 5, no fork); unlock `5` "Two held" with its mastery taken off | The Eye was a fork-a option; Two held and the M2 step were at 5 |
| 6 | Perk step (Mastery 2) | +1 reach · +1 to hit | unlock `6` NEW row (the M2 step moved from 5) | Fork b was here |
| 7 | Perk step (Mastery 3) | +1 reach · +1 to hit · +1 held (3) · 2 traits a design | unlock `7` | L7 today, minus "one more form from the first fork" |
| 8 | **Fork two:** the Beast or the Blade | +1 reach · +1 to hit · +1 design (4) | ladder `fork b`, now `of: [beast, blade]` at points 8 | Fork b was at 6 with four forms; per_point "at 8" lost "one more shape" |
| 9 | Perk step (Mastery 4) | +1 reach · +1 to hit | unlock `9` | L9 today, minus No Snap and "one more form from either fork" |
| 10 | Mastered: **Solid Image** · **every form** | +1 reach · +1 to hit · +1 design (5) | `solid_image`; ladder row 10 `forms` | L10 today |

**The Razor Beast fix (Leon's ruling).** "Razor Beast" is a player-named design. A level-2 character reaches it because creation allows Visualization 7 and the Beast opens at 6.
- Moving the Beast to fork two at 8 puts it out of reach until level 3 at the earliest: the attribute ceiling is 7 at creation and 8 from level 3.
- The +9 to hit is the Visualization modifier plus Keen's +2. I left Keen alone; the move to 8 is the fix.
- Re-measure with `figments-measure` against `balance.ceilings.figments` (Rigger 150, door 130). If it is still over, turn `output.factors.figment` (0.9) first.

**SURPLUS** (what the alpha gives today that does not fit the shape):

| Item | Destination | Why |
|---|---|---|
| The Eye (a fork-a option) | Alpha level 5, the big verb, for everyone | It gives the whole side sight 8 tiles into the dark, and Stare strips Hidden. That is the biggest change to how a fight plays. |
| The Husk (a fork-b option) | Alpha level 10 only (every form) | It is a Double with the Volatile trait, and a level-3 design already makes that. |
| The Sentinel (a fork-b option) | Alpha level 10 only, plus the Rigger's Scrap Sentinel | The turret becomes the Rigger's signature, so Scrap Sentinel stops copying a fork. |
| "One more form" rows at 7, 8 and 9 (`more`) | Cut | They give back the fork you passed; level 10 gives every form anyway. |
| No Snap at 9 (`no_snap`) | Beta perk Jury-Rig (as +1 AP banked when a Figment is destroyed) | Surviving the door's tax is the beta's job. The banked AP cancels the Snap's −1. |
| The M2 perk step at 5 | Moved to 6 | Leon's shape. |

Data to change:
- `figments.json`: the ladder rows (fork rows at 4 and 8, `more` and `no_snap` removed); `opens` on eye (min 5), beast and blade (min 8, fork b), husk and sentinel (min 10, no fork).
- `skills.json visualization`: unlocks 4, 5, 6, 8, 9 and the per_point rows.

`formWhy` reads `opens`, so no code changes.

## 3. ALPHA FORKS

All four options are built today. Each is a form: it costs Visualizer charge and takes a held slot. The only change is the data of the ladder's `fork` rows (door/pick through `figmentGrants`).

| Fork | Option | Card line | Status |
|---|---|---|---|
| One (4): hold the line | **Wall** (`wall`) | 3 charge · 60 HP · full cover, blocks sight · Press: shove 1 tile | Built |
| One (4) | **Ward** (`ward`) | 3 charge · 40 HP · takes 50% of the first hit a round on an ally beside it · Interpose | Built |
| Two (8): teeth | **Beast** (`beast`) | 4 charge · 45 HP · Strike 30 · Pounce 3 tiles, Prone | Built |
| Two (8) | **Blade** (`blade`) | 3 charge · 25 HP · Cut 25 · Hold: cuts the first foe a round to pass it (your reaction) | Built |

None of them needs a new piece.

## 4. BETA: Improvisation

**Every level, 1 to 10:** "−10% ambush damage taken · Figments +V% HP" (V is your Visualization points; the tab shows the number, for example +7% a point at Visualization 7). Sources: per_point `ambush_taken` 0.1 and `feed` 0.01.

Perk steps at 3, 5, 7 and 9 (keep four of eight tiers); Mastered at 10.

| Perk | Tier I | Tier II changes | id | Engine or narrator | Carried by |
|---|---|---|---|---|---|
| **Field Repair** | 2 AP and 1 spare part, on you or something next to you: clear a jam, +10% durability (+5% a point above 3), or repair 15 (a machine or Figment) | No spare part | NEW perk `field_repair` (the unlock at 3 today; the action id `field_repair` is kept) | engine | `grant_action field_repair`. II: `cost_mod` res parts −1 at the cost site `field_repair`, or a `parts: 0` field on the grant (fieldRepair already takes `parts: 0` for Field Fix). The builder checks the part goes through the price. |
| **Tuned** | Main-hand weapon never jams or breaks | Load the Visualizer −1 AP | NEW perk `tuned` (the unlock at 5 today) | engine | `immunity weapon_jam_and_break`. II: `cost_mod` value −1, when cost, if action [swap_core] |
| **Jury-Rig** | A Figment of yours destroyed: +1 AP next turn (cancels its Snap) | +1 Visualizer charge as well | `jury_rig` kept, CHANGED (the old "a broken weapon works once more" is moot under Tuned) | engine | `grant_ap` bank, when downed, if target ally, target_kind [figment], target_tied {owned, as: to}, limit per_turn 1. II: `and: resource vcharge +1` |
| **Hot-Swap** | One draw, stow or swap a turn: 0 AP (draws the Visualizer free) | Two a turn | `hot_swap` kept, unchanged | engine | `cost_mod` set 0 at swap |
| Mastered: **Overhaul** | Field Repair is yours at 1 AP and repairs ×2 (even without the perk) · after a long rest, one weapon gains a permanent mod slot | n/a | `overhaul` kept, CHANGED: it adds the grant, so it is never dead without the Field Repair perk | engine | `grant_action field_repair` (ap 1), `stat_mult field_repair_amount` 2, `mod_slots` (all exist) |

## 4. GAMMA: Charisma

**Every level, 1 to 10:** "+1 on Charisma checks · +1 tile Rally reach" (reach 5 at 1). The per_point "an offer of terms is harder to refuse" is a check, so it folds into the +1.

Perk steps at 3, 5, 7 and 9; Mastered at 10.

**The Call: Rally** (`call.rally`). Once a turn. The steps are re-fitted to the new costs; the reach is unchanged (4 + 1 a point).

| Lv | Call |
|---|---|
| 1 | Rally: 3 AP, +2 AP to an ally (PROVISIONAL; was +1 at 2 AP, which would cost 3 to give 1) |
| 3 | +2 AP and −1 Pressure (PROVISIONAL; was +1 AP) |
| 5 | Costs 2 AP |
| 7 | +3 AP and −1 Pressure (PROVISIONAL; was +2). The rule "nobody gains more than 3 AP a turn" holds. |
| 9 | Costs 1 AP (replaces the 0-AP reaction at 9) |
| 10 | Pay with your reaction instead; one more Rally that turn for 1 AP (replaces the free first Call; it ends the 9/10 overlap) |

`calls.json`: the `rules` keys (`ap` 3, `cheap_at` 5 → 2, a new step at 9 → 1, the reaction at 10) and Rally's step numbers.

| Perk | Tier I | Tier II changes | id | Engine or narrator | Carried by |
|---|---|---|---|---|---|
| **Smooth** | A failed lie makes them suspicious, not sure | Once a scene, a lie found out can be walked back with a second check | NEW perk `smooth` (the unlock at 3 today) | narrator | `narrator` |
| **Parley** | Before a fight, 0 AP: talk them down (the leader stands down or the ranks walk) | A fight that breaks out of a talk: +2 AP on your first turn; the first enemy to act −1 AP | `talks_broke_down` kept as the perk, renamed Parley; it absorbs the unlock at 5 (action `parley` kept). Talks Broke Down's lost-talk −2 AP is dropped. | hybrid | `grant_action parley`, `narrator` (TN); II: the existing `stat_mod ap` rows |
| **Crowd Pleaser** | One roll for a crowd of 3 or more, +2; in a fight their save is 2 harder | You may turn the crowd on one person | `crowd_pleaser` kept, unchanged | hybrid | `skill_mod`, `narrator` |
| **Showman** (removes the door's tax) | Picture −1 charge (never under 1) | Once a turn, one Figment order (Draw fire, Press, Redraw...) costs 0 AP | NEW `showman` | engine | `cost_mod` res vcharge −1, when cost, if action [picture], min 1. II: `cost_mod` set 0, if action [figment_order], limit per_turn 1. The builder checks that Picture passes its charge through `price()`. |
| Mastered: **Everyone's Friend** | Once a scene, one non-hostile person treats you as a trusted friend; your first lie to them succeeds | n/a | `everyones_friend` kept | hybrid | `narrator`, `auto_success` |

## 5. CLASS: the Rigger (`trickster`)

The gain "The Rigger's Hands" (+1 held, +1 design) is kept.

| Rank | Move | Verdict | Why, or the replacement |
|---|---|---|---|
| I | Double (`false_image`) | KEEP | It is a Double for 0 charge, outside the held count, with no upkeep, lasting 3 rounds and needing no Visualization. No ladder level gives a body outside the count. Code fault: rev3.ts types the form `'double'` in code; give the move a `figment_form` field as Scrap Sentinel has. |
| I | Field Fix (`infiltrator.field_fix`) | REPLACE | It copies Field Repair (now the beta perk, whose tier II already drops the part). Replacement, NEW `trickster.quick_sketch`, **Quick Sketch**: "Once a turn: −1 AP on Picture" (`cost_mod` value −1, when cost, if action [picture], limit per_turn 1, min 1). Field Fix goes back to the move pool, shelved, key kept. |
| II | Salvage (`salvage`) | REPLACE (trim) | Reclaim copies Cash in, and repair copies Field Repair. Keep only the wreck: "1 AP: a wreck next to you, +2 Visualizer charge (each wreck once a fight)". Data only: `pick: ["wreck"]`; the handler is unchanged. |
| II | Redline (`overclock`) | KEEP | No ladder twin: a Figment or machine attacks now at no AP. |
| III | Sleight (`sleight`) | KEEP | No ladder twin (Leon's ruling: the swap stays the Rigger's). |
| III | Scrap Sentinel (`scrap_turret`) | KEEP | With the Sentinel out of the forks (only Mastered gives it), the free turret from scrap is the Rigger's own. |

## 6. Special rulings

- **Expression, Razor Beast:** applied in section 2. The Beast moves to fork two at 8, which is unreachable at creation.
- The other rulings (Strain, Rite in the Field, Iron Heart, Rolling Start, Mender, Shadow) belong to other attributes and are not touched here.

## 7. COUNTS

Rule: per-point lines make a level felt, but they are not counted as things.

| Skill | Felt (of 10) | Most things on one level |
|---|---|---|
| Visualization | 10 | 2 (L1: the door + Glimmer; L10: Mastered + every form). Every other level has 1. Was L1: 6 things. |
| Improvisation | 10 | 1 (perk steps at 3, 5, 7, 9; Mastered at 10). Was 5 felt, 3 things at L3. |
| Charisma | 10 | 2 (L3, L5, L7, L9: a perk + a Call step; L10: Mastered + the reaction Call). Was 5 felt. |

## 7. MIGRATION (what a save keeps)

- **Visualization perk steps:** a step taken at 5 is kept (lane 4's general rule). A save at 5 has two steps, and at 6 gains none.
- **Fork a picks:**
  - Wall or Ward: counts as fork one.
  - Eye: stays open (doorPicks), and fork one is then offered fresh (Wall or Ward), as a gift.
- **Fork b picks:**
  - Beast or Blade: kept, and counts as fork two when the save reaches 8.
  - Husk or Sentinel: kept open, and fork two still offers Beast or Blade at 8, as a gift.
  - A save with the Beast at Visualization 6 or 7 keeps it early (the no-loss rule).
- **"One more form" picks:** kept in doorPicks.
- **Unstamped saves:** the legacy migration (`migration.legacy`) is unchanged.
- **Perks:**
  - `jury_rig`: same tier, new effect.
  - `hot_swap`: unchanged.
  - `talks_broke_down`: becomes Parley at the same tier.
  - `crowd_pleaser`, `overhaul`, `everyones_friend`, `solid_image`, `mirage`, `blueprint`: kept.
- **Old free unlocks:** Field Repair, Tuned, Smooth and Parley were unlocks, so no save holds them; see OPEN 1.
- **Rigger:** class moves are derived from class and rank, so Quick Sketch replaces Field Fix and Salvage loses two ways with no save edit.

## 8. OPEN (for Leon)

1. **Saves at Improvisation or Charisma 3+ lose the free unlocks**, which become perks. Recommended: once, on load (a stamp), re-offer that skill's perk steps so the player can take Field Repair, Tuned, Smooth or Parley. This is a general lane-4 rule for every beta and gamma.
2. **Rally re-stepped** to +2 / +2 and −1 Pressure / +3 at 3 / 2 / 1 AP. Recommended: yes, PROVISIONAL, and measured in the squad runs; at the old +1 for 3 AP no one would cast it.
3. **The Eye leaves the fork** to level 5 for everyone, and the Husk and Sentinel open only at Mastered. Recommended: yes. The Husk is a Volatile Double, and the Sentinel becomes the Rigger's.
4. **Old saves keep a Beast picked at 6 or 7** (it is early under the new ladder). Recommended: keep it (no loss); new characters cannot reach it before level 3.
5. **Jury-Rig answers the Snap with banked AP** rather than removing it (no primitive removes it). Recommended: accept. It nets 0 AP; a true no-Snap needs a stat that is not on the approved list.

