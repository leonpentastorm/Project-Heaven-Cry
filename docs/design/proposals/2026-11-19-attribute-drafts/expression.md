# Expression: the sheet (Visualization / Improvisation / Charisma / Rigger)

Sources read: ATTACK-PLAN-2026-11-19 (lane 3 scope, the 18 Nov evening rulings), scout-attribute-tables (Expression, list C, the primitives table), skill-pages-read, data/skills.json (visualization, proficiency, charisma), data/figments.json, data/forks.json, data/perks.json, data/calls.json, data/classes.json (trickster, infiltrator.field_fix), the core rules (rules 1.34), docs/ENGINE-HOOKS.md, packages/engine/src/figments.ts, doorpicks.ts, owned.ts, effects/cost.ts, effects/actions.ts, effects/triggers.ts, effects/feed.ts and classes/rev3.ts, and the outside-playtest TRIAGE. Sections 2 and 3 are rewritten to the lead's design of 19 Nov (attribute-proposals.md section 5, "forms are learned, forks upgrade them", Leon's ruling), which binds.

## 1. PROMISE

- **Visualization (alpha):** for painters, critics and anyone using a projector. It lets you picture shapes of mana that lie for you, guard for you and fight for you, as decoys, traps, cover and strikers, run on the Visualizer's charge.
- **Improvisation (beta):** for field mechanics and anyone who keeps working after the plan dies. It keeps your gun firing and your machines and Figments standing, and stops an ambush from catching you flat.
- **Charisma (gamma):** for the face of the squad (politicians, merchants, lawyers). It lets you charm, persuade and lie with a smile, talk a fight down before it starts, keep the squad moving with Rally, and pay less of the Figment tax.

## 2. ALPHA LADDER: Visualization

Every level from 2 also gives "+1 tile Figment reach · +1 Figment to hit", and levels 2 to 9 give "+1 form known". The to-hit is the Visualization modifier that Figments roll with.

| Lv | gives | gain shown on the level | existing id or NEW | where it comes from today |
|---|---|---|---|---|
| 1 | **The door, Figments:** Picture, Redraw and Let go (verbs on the Figment itself) · **Glimmer** · **2 forms known**, your choice of all ten · 1 held | Reach 5 · 1 held · 2 forms known | unlock `1` (text changed); ladder row 1 `known: 2`, its `forms: [double, snare]` removed; item `glimmer` | L1 today gave the Double and the Snare fixed, and Cash in |
| 2 | Small verb: **Cash in** | +1 form known (3) · +1 reach · +1 to hit | NEW unlock `2`; verb `figment_cash_in` gains `requires: [{skill: visualization, min: 2}]` | Cash in was at 1; the Hand (L2 today) is now a form like any other |
| 3 | Perk step (Mastery 1) | +1 form known (4) · +1 reach · +1 to hit · 2 ready designs, 1 trait each | unlock `3` | L3 today |
| 4 | **Fork one:** Hard Light or Sharp Light (section 3) | +1 form known (5) · +1 reach · +1 to hit | NEW forks.json rows; skills.json `visualization.forks` step `a` at 4; unlock `4` text | fork a was the Eye, the Wall or the Ward |
| 5 | Big verb: **a second Figment held** | +1 form known (6) · +1 reach · +1 to hit · +1 design (3) | ladder row 5 `held: 2` (kept); unlock `5` "Two held" with its mastery taken off | Two held and the M2 step were both at 5 |
| 6 | Perk step (Mastery 2) | +1 form known (7) · +1 reach · +1 to hit | NEW unlock `6` (the M2 step moved from 5) | Fork b was here |
| 7 | Perk step (Mastery 3) · a third Figment held | +1 form known (8) · +1 reach · +1 to hit · 2 traits a design | unlock `7` (text minus "one more shape"); ladder row 7 `held: 3` (kept) | L7 today, minus the `more` row |
| 8 | **Fork two:** Many Hands or Masterwork (section 3) | +1 form known (9) · +1 reach · +1 to hit · +1 design (4) | skills.json `visualization.forks` step `b` at 8; NEW unlock `8` | per_point "at 8" lost "one more shape" |
| 9 | Perk step (Mastery 4) | +1 form known (all ten) · +1 reach · +1 to hit | unlock `9` (text minus No Snap) | L9 today, minus `no_snap` and `more` |
| 10 | Mastered: **Solid Image** | +1 reach · +1 to hit · +1 design (5) | `solid_image`; ladder row 10 keeps `designs: 5`, its `forms` list removed (all ten are known from 9) | L10 today |

**Forms known: what carries it, and what changes.** A form is no longer opened by a level or a fork. The player picks forms on the level-up screen, through the door's existing pick, and keeps them for good.
- **Ladder rows (`figments.json ladder`).** Each row gains `known`, read like `held` (a row sets it from its points up): 2 at 1, then 3, 4 … 10 at points 2 to 9. Remove these: rows 1 and 10 `forms`, the `fork` rows at 4 and 6, the `more` rows at 7, 8 and 9, and `no_snap` at 9. `ladderAt` reads `known` with one more line, as it reads `held`. Its `forks`, `more` and `noSnap` fields and the `FigFork` and `FigMore` types then read nothing, and are deleted with their readers in `figmentGrants`, `figmentLadderView` and `migrateCharacterFigments`.
- **`opens` (every form).** Set to `{skill: visualization, min: 1}` with no `fork`. Any form can be a pick from Visualization 1. `formWhy` changes its message from "is a choice at Visualization N" to "is not one of your forms known; choose it when you have a pick open". `formWhy` still reads `opens.min` for a sheet with no Visualization.
- **`figmentGrants` (the door's grants).** It returns one grant, `{id: "known", of: <every form id>, n: ladderAt(points).known}`, in place of the fork and "more" grants. `pendingDoorPicks` already counts every pick against the first grant that has room and lists the options not taken. Each new level therefore opens one more pick. The level-up card already reads that pick through `allPendingDoorPicks`, and `door/pick` (game.ts, `takeDoorPick`) takes it unchanged. The picking UI to add is one thing: when `left` is above 1, as at creation with Visualization 7 (8 forms known), the card must take several picks in a row.
- **`formsOf`.** Unchanged in shape: the ladder's fixed list (now empty), plus `doorPicks`, plus `doorKept`.
- **The door id (one change in code, to avoid a clash).** Today `figments.ts` registers its form picks under the door id `visualization` (`FIG_DOOR`). The fork upgrades need skills.json `visualization.forks`, which `doorpicks.ts`'s existing per-skill loop also registers under `visualization`. That loop runs first, and the figments registration overwrites it. Recommended: the form picks move to their own door id. This needs a NEW data field `figments.json visualizer.picks: "figment_forms"`; the skill stays `visualizer.door`. `formsOf` and `registerDoorPicks` read `picks`, and the `skill`/`steps` fields leave that registration. The forks are then the generic loop's, exactly as for the other eight doors (`doorForkView` shows them). The alternative is to keep one door id and compose the two sources in `figments.ts`. That needs `doorpicks.ts` to export its per-skill fork source, which is a new exported primitive, so it is the lead's call. The migration below moves the stored picks.
- **Cash in at 2.** This uses the verb row's `requires`, read by `figments.ts`'s existing `addOwnedGate` (the projection-range gate) through `effects/collect.ts meetsRequires` on the owner's sheet. It needs no new piece. The descriptors hide the row below 2.

**The level-1 balance note (section 5: "what holds a strong form back at level 1 is what it costs").** Under this ladder a level-1 character at Visualization 1 can know the Beast. Before, the earliest was Visualization 6, which creation's 7 could already reach. The level-1 Beast, today, from data:
- **Cost:** 4 charge of the core's 10 (`charge`, `visualizer.charge`). Picture is 2 AP. Upkeep is 1 charge at each turn start, so one core keeps it about 6 turns. A fresh core costs 2 AP and a spare core.
- **HP** (form 45 × `figment_hp` profile 0.35 × (1 + 0.15 a Visualization point) × level-1 `hp_mult` 1.0 × Improvisation's feed):
  - 18 at Visualization 1;
  - 25 at Visualization 4;
  - 32 at Visualization 7 (Improvisation 0);
  - 48 for a Razor Beast (Armoured ×1.5, plus Keen, 6 charge).
- **To hit:** the Visualization modifier: +0 at 1, +6 at 7 (+8 with Keen).
- **Damage:** Strike, 2 AP, deals 40.5 (claws 30 × `figment` profile 1.5 × `deal` level 1 1.0 × `output.factors.figment` 0.9), before armour. Pounce is 3 AP for the same blow plus Prone. The yardstick rifle shot (2 AP) deals 45. Measured on deals alone, before soak:
  - the Beast deals 90% of the rifle per AP;
  - turn 1 (Picture and two Strikes, 81) is 60% of a rifle-turn (135);
  - a later turn (three Strikes, 121.5) is 90%.
- **Soak:** a level-1 Soldier-turn is 18.5 (`balance.yardsticks.soldier_turn`), so the Beast's HP soaks about 1 Soldier-turn at Visualization 1 and about 1.7 at 7.
- **Against `balance.ceilings.figments`:** door all-in 130, door normal 104, Rigger all-in 150, Rigger normal 120, all as deals plus soak in rifle-turns. By arithmetic, the plain Beast sits under the door's line: 90% in deals plus a share of soak.
- **The upgrades push it:**
  - Sharp Light's +20% takes the Beast's deals to 108% of the rifle alone.
  - With Many-Eyed Dream II at three held (×1.18), it reaches 127% before any soak.
  - Masterwork's free order adds a fourth Strike a round.
- **The measure** (`figments-measure`) must be re-run with builds that pick the Beast and the Wall at level 1, at Visualization 1 and at 7, and with each fork option at 4 and 8. If a row is over its line, the Beast's own numbers are turned (claws damage, `hp`, `charge`), never a level gate (section 5); the dials `output.factors.figment` and `level.hp` move every form at once. The yardstick and levels are PROVISIONAL as they stand; nothing here is measured yet.

**SURPLUS** (what the alpha gives today that does not fit the shape):

| Item | Destination | Why |
|---|---|---|
| Fixed forms by level (the Double and Snare at 1, the Hand at 2, every form at 10) | Forms known: 2 at 1, +1 a level to all ten at 9, the player's choice | Leon's ruling (section 5): forms are learned, not opened |
| Forks a and b as forms (Eye / Wall / Ward; Beast / Blade / Husk / Sentinel) | Forms known; the forks become upgrades (section 3) | A form is a pick at any level; the fork changes every form you know |
| "One more form" rows at 7, 8 and 9 (`more`) | Cut | Forms known gives one a level |
| No Snap at 9 (`no_snap`) | Hard Light's second half (fork one) | The Snap is the door's tax; removing it is now a choice at 4 |
| Cash in at 1 | Level 2, the small verb | Section 5's ladder |
| The M2 perk step at 5 | Moved to 6 | Leon's shape |

Data to change:
- `figments.json`:
  - `ladder`: `known` on every row 1 to 9; `forms`, `fork`, `more` and `no_snap` removed;
  - `opens` on every form: min 1, no fork;
  - `figment_cash_in` `requires`;
  - NEW `visualizer.picks`;
  - `migration` rev 2 (section 7).
- `skills.json visualization`:
  - NEW `forks` `[{id: a, at: 4, of: [fork.figment.hard_light, fork.figment.sharp_light]}, {id: b, at: 8, of: [fork.figment.many_hands, fork.figment.masterwork]}]`;
  - unlocks 1, 2 (NEW), 4, 5, 6 (NEW), 7, 8 (NEW), 9;
  - the per_point rows: "at 2: the Hand", "at 8: one more shape" and "at 10: every shape" go; "each, 2 to 9: one more form known" comes in.
- `forks.json`: four NEW rows (section 3).

Code: `ladderAt` reads `known`; `figmentGrants` returns the one grant; `formWhy`'s message changes; the forms registration reads `visualizer.picks`; the dead fork and "more" code goes. None of this adds to a closed list.

## 3. ALPHA FORKS

The forks no longer give forms. Each option is an upgrade that applies to every form you know, for good. Each is a row of `data/forks.json`, written like the other doors' rows:
- `kind: verb`, `door: visualization`, `step: 4` or `8`;
- `requires: [{door_pick: <its id>}]`;
- effects that are item ops held by the owner.

The owner's rows run on its Figments' events through the predicates `actor_kind` / `target_kind` `[figment]` and `actor_tied` / `target_tied` `{kind: owned, as: to}`, the pattern of `mirage` (Many-Eyed Dream, perks.json), which is live. The pick is `door/pick`, through `doorpicks.ts`'s per-skill loop once `visualization.forks` exists. A step is offered only when both its options are built (a `shelved` row holds its step back). All numbers are PROVISIONAL (section 5); NEW numbers below are marked.

| Fork | Option (id) | Card line | Status |
|---|---|---|---|
| One (4): what they are made of | **Hard Light** (`fork.figment.hard_light`) | +40% Figment HP · No Snap | NEEDS: both halves (see "Needs a new primitive"); a variant buildable today is given |
| One (4) | **Sharp Light** (`fork.figment.sharp_light`) | +20% Figment damage · +1 free order to a Figment that drops a foe (once a round) | First half BUILDABLE FROM EXISTING PIECES; second half BUILDABLE WITH THE APPROVED target-aware price, on one condition (below) |
| Two (8): how you hold them | **Many Hands** (`fork.figment.many_hands`) | +1 Figment held · −1 Picture charge (never under 1) | BUILDABLE FROM EXISTING PIECES (both halves) |
| Two (8) | **Masterwork** (`fork.figment.masterwork`) | +1 trait on your Masterwork · +1 free order a round to it | The mark is BUILDABLE FROM EXISTING PIECES; +1 trait NEEDS a piece; the free order is BUILDABLE WITH THE APPROVED target-aware price, on one condition |

**Hard Light** ("+40% Figment HP · No Snap").
- **+40% HP.** No item reaches a Figment's HP today. `figments.ts figmentBlock` multiplies the form's `hp` by four things: the traits' `hp_mult`, the level row (`level.hp`), the `figment_hp` profile by the maker's Visualization (`statTerm`), and Improvisation's feed (`feedOf(owner, "figment_hp")`). None of these is a stat an item answers. The feed carrier is beta-only by rule N3 ("only that beta raises it"). Status: NEEDS (below).
- **No Snap.** The Snap is `figments.ts`'s own `on_downed` listener: it sets `figSnap` on the owner unless `ladderAt(visPoints(owner)).noSnap`, which reads the ladder only, and charges `let_go.snap_ap` at `turn_start_pre`. No item can switch it off. Status: NEEDS (below).
- **Variant buildable today, both halves:**
  - "Figments take −29% damage" (the same toughness as +40% HP, 1 ÷ 1.4): `damage_mult` 0.71, when `taking`, if `{target: ally, target_kind: [figment], target_tied: {kind: owned, as: to}}`. This is the pattern of the Ward's `redirect` on `taking` with `target: ally` (figments.json). It differs from +40% HP in two ways: armour is applied first, and a repair heals the smaller pool.
  - "+1 AP next turn when a Figment of yours is destroyed (cancels its Snap)": `grant_ap` 1, `bank: true`, when `downed`, if `{target: ally, target_kind: [figment], target_tied: {kind: owned, as: to}}`, `limit {per: per_round, n: 1}`. This is Jury-Rig's row and Wake of the Kill II's banked `grant_ap` (perks.json `blueprint`). Its one leak is that it also pays when the Rigger's free Double dies, which never Snaps.

**Sharp Light** ("+20% Figment damage · +1 free order to a Figment that drops a foe, once a round").
- **+20% damage:**
  - Row: `damage_mult` 1.2, when `dealing`, if `{actor: ally, actor_kind: [figment], actor_tied: {kind: owned, as: to}, hostile: true}`.
  - Status: BUILDABLE FROM EXISTING PIECES. It is Many-Eyed Dream's row (`mirage`, perks.json) with a flat value.
  - It also raises the Husk's Burst and a Volatile burst, which are Figment-dealt.
- **The free order:**
  - Trigger: `downed`, if `{actor: ally, actor_kind: [figment], actor_tied: {kind: owned, as: to}, target: foe}`, `limit {per: per_round, n: 1}` (Wake of the Kill II's trigger).
  - Mark: `tie` with `target: actor` and a NEW tie kind `encore` (a rules.json `ties.kinds` data row: `max: 1`, `ends_on: [combat_end]`). The tie marks the Figment that made the drop.
  - Price: `cost_mod set 0`, when `cost`, if `{action: [figment_strike, figment_pounce, figment_cut, figment_stare, figment_order], target_tied: {kind: encore, as: to}}`.
  - End: `tie clear: all` on `acted` with the same `action` list.
  - Status: BUILDABLE WITH THE APPROVED target-aware price (N20), on one condition. For an owned unit's verb, N20 must resolve the ordered unit as the price's target. `owned.ts verbPrice` already passes `{owned: <id>}` in the price's context.
- **Variant buildable today:**
  - Card: "+1 free Figment order after one of your Figments drops a foe (once a round)".
  - Rows: `mark` flag `encore` on that `downed` row; `cost_mod set 0`, if `{action: [the five sites], flag: encore}`; `mark clear` on `acted` with the same list. This is Fire and Move's flag pattern (classes.json).
  - The free order goes to any Figment, not only the one that dropped the foe.

**Many Hands** ("+1 Figment held · −1 Picture charge, never under 1").
- **+1 held:**
  - Row: `stat_mod ties_max:owned` +1. Status: BUILDABLE FROM EXISTING PIECES; it is the Rigger's Hands' row (classes.json `riggers_hands`), read by `figments.ts heldMax`.
  - Caution: `heldMax` is capped by `limits.held_most` 4. A Rigger at Visualization 7 or more already holds 4 (3 + 1), so Many Hands gives that Rigger nothing (OPEN 3).
- **−1 charge:**
  - Row: `cost_mod`, `res: vcharge`, value −1, `min: 1`, when `cost`, if `{action: ["verb:picture#picture"]}`.
  - Status: BUILDABLE FROM EXISTING PIECES. The pattern is the move pool's Guard Challenge row (`cost_mod res guard`, on the action `skill:durability.1#guard_challenge`).
  - Why that action name: Picture's charge reaches the `cost` hook at the item key and action id (`effects/actions.ts costOf`: `verb:picture#picture`; `figments.ts`'s Picture names no `site`), and its AP reaches it at the site `picture`, inside `ap()`. So a charge row on `action: [picture]` would never fire, and an AP row on `picture` is never asked twice.
  - The builder's reducer test proves the key.

**Masterwork** ("+1 trait on your Masterwork · +1 free order a round to it").
- **The mark ("name one Figment you hold; naming another moves the mark"):**
  - Verb: a `grant_action` `masterwork` at the site `figment_order`, aimed at an ally, gated `{target_kind: [figment], target_tied: {kind: owned, as: to}}`. Its AP is NEW: 0 AP, once a turn (PROVISIONAL).
  - Effects: `tie clear: all` and then `tie`, on a NEW tie kind `masterwork` (rules.json `ties.kinds` data row, `max: 1`, `ends_on: [to_down, combat_end]`).
  - Status: BUILDABLE FROM EXISTING PIECES.
  - Builder check: `owned.ts unmakeOwned` ends only the `owned` tie. A Figment that is let go or cashed in would leave a `masterwork` (or `encore`) tie dangling. The fix belongs in that one door: end every tie to the unmade unit. That is a general fix, not a new piece.
- **+1 trait:** no piece adds a trait to a standing Figment. Traits are read once, at Picture, by `figmentBlock` and `setUp` (`hp_mult`, `tiles`, `roll`, `vision`, `range`, `weight`, upkeep, and the `figtrait_<id>` held verbs). Status: NEEDS (below).
- **The free order:**
  - Row: `cost_mod set 0`, when `cost`, if `{action: [figment_strike, figment_pounce, figment_cut, figment_stare, figment_order], target_tied: {kind: masterwork, as: to}}`.
  - Limit: `limit {per: per_round, n: 1, key: masterwork, peek: true}`, spent by a `use` on `acted` with the same list. This is the Survival boon Quick Sketch's pattern (survival.json `start.quick_sketch`).
  - Status: BUILDABLE WITH THE APPROVED target-aware price (N20), on the same condition as Sharp Light.

### Needs a new primitive (for the lead)

1. **Hard Light, +40% HP.**
   - Smallest general piece: a stat in `STATS` (effects/stats.ts), `owned_hp`: "the HP of the owned units this holder makes, a multiplier", asked once in `figments.ts figmentBlock` beside the feed (and by `spawnOwned` for other systems' companions, if wanted).
   - Near pieces in ENGINE-HOOKS.md: the stat `figment_designs` (the same file already asks `statQuery` for it), and the feed carrier `figment_hp`. The feed carrier is beta-only by N3, so a fork cannot feed it.
   - Variant buildable today: "Figments take −29% damage" (above).
2. **Hard Light, No Snap.**
   - Smallest general piece: `snap` added to `IMMUNE_IDS` (effects/stats.ts, today bleed, knockback, opportunity_attack, shove), so the row is `{op: immunity, to: snap}`. `figments.ts`'s `on_downed` would ask `immune(owner, "snap")` where it now reads `ladderAt().noSnap`, which then goes.
   - Near pieces: the `immune:<…>` stat family and the `immunity` op.
   - Variant buildable today: "+1 AP next turn when a Figment of yours is destroyed (cancels its Snap)" (above). With Jury-Rig it nets +1 AP, the same as the design's "no Snap, plus Jury-Rig's AP".
3. **Masterwork, +1 trait.**
   - Smallest piece: a `figments.ts` rule that gives a standing Figment one trait. It runs the per-trait lines of `figmentBlock` and `setUp` on a live unit; Hollow and Mirror do nothing after making, and Armoured raises the HP and its maximum by the same share. It is reached through the naming verb's pick: a pick list `figment_traits`, registered with the existing `registerPickList`.
   - Near pieces: `registerPickList("forms")`, and the trait loop `figmentBlock` and `setUp` already run at Picture.
   - This is per-system code, not a closed-list item, but it is a new mechanism, so it is listed here.
   - Variant buildable today: "Your Masterwork: +2 to hit and −25% damage taken" (NEW, PROVISIONAL; the worth of Keen and about half of Armoured):
     - `roll_mod` 2, when `to_hit`, if `{actor: ally, actor_tied: {kind: masterwork, as: to}}`;
     - `damage_mult` 0.75, when `taking`, if `{target: ally, target_tied: {kind: masterwork, as: to}}`.
4. **N20's scope (Sharp Light's and Masterwork's free orders).**
   - Both are buildable with the approved target-aware price only if, for a price made on an owned unit's verb, N20 resolves the ordered unit as the target. If N20 is built to resolve the verb's aim (the foe a Strike hits), these rows need that one more line, in `owned.ts verbPrice`, which already passes `owned` in the price's context.
   - Variants buildable today:
     - Sharp Light: "+1 free Figment order after a kill, once a round" (above);
     - Masterwork: "once a round, one Figment order costs 0 AP" (any Figment; the same row with no `target_tied`, as Showman II).

Until 1 to 3 are approved or the variants are chosen, the rows `fork.figment.hard_light` and `fork.figment.masterwork` are `shelved` (`waits_for` naming the piece). Step one and step two are then not offered (doorpicks.ts: a step is offered only when both its options are built).

## 4. BETA: Improvisation

**Every level, 1 to 10:** "−10% ambush damage taken · Figments +V% HP" (V is your Visualization points; the tab shows the number, for example +7% a point at Visualization 7). Sources: per_point `ambush_taken` 0.1 and `feed` 0.01.

Perk steps at 3, 5, 7 and 9 (keep four of eight tiers); Mastered at 10.

| Perk | Tier I | Tier II changes | id | Engine or narrator | Carried by |
|---|---|---|---|---|---|
| **Field Repair** | 2 AP and 1 spare part, on you or something next to you: clear a jam, +10% durability (+5% a point above 3), or repair 15 (a machine or Figment) | No spare part | NEW perk `field_repair` (the unlock at 3 today; the action id `field_repair` is kept) | engine | `grant_action field_repair`. II: `cost_mod` res parts −1 at the cost site `field_repair`, or a `parts: 0` field on the grant (fieldRepair already takes `parts: 0` for Field Fix). The builder checks the part goes through the price. |
| **Tuned** | Main-hand weapon never jams or breaks | Load the Visualizer −1 AP | NEW perk `tuned` (the unlock at 5 today) | engine | `immunity weapon_jam_and_break`. II: `cost_mod` value −1, when cost, if action [swap_core] |
| **Jury-Rig** | A Figment of yours destroyed: +1 AP next turn (cancels its Snap; with Hard Light there is no Snap, so it is a clean +1) | +1 Visualizer charge as well | `jury_rig` kept, CHANGED (the old "a broken weapon works once more" is moot under Tuned) | engine | `grant_ap` bank, when downed, if target ally, target_kind [figment], target_tied {owned, as: to}, limit per_round 1 (was per_turn: the Snap comes at most once between your turns, and per_turn would refresh on every enemy's turn). II: `and: resource vcharge +1`. With Hard Light the two do not stack past +1 AP (section 5). |
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
| **Showman** (removes the door's tax) | Picture −1 charge (never under 1) | Once a turn, one Figment order (Draw fire, Press, Redraw...) costs 0 AP | NEW `showman` | engine | `cost_mod` res vcharge −1, min 1, when cost, if action ["verb:picture#picture"]: Picture's charge is priced at its item key and action id (effects/actions.ts costOf), not at the site `picture`, as for Many Hands (section 3). With Many Hands it is −2, never under 1 a step (a Snare and a Double stay at 1). II: `cost_mod` set 0, if action [figment_order], limit per_turn 1. |
| Mastered: **Everyone's Friend** | Once a scene, one non-hostile person treats you as a trusted friend; your first lie to them succeeds | n/a | `everyones_friend` kept | hybrid | `narrator`, `auto_success` |

## 5. CLASS: the Rigger (`trickster`)

The gain "The Rigger's Hands" (+1 held, +1 design) is kept. With Many Hands it meets the cap `limits.held_most` 4 at Visualization 7 (3 + 1); see OPEN 3.

| Rank | Move | Verdict | Why, or the replacement |
|---|---|---|---|
| I | Double (`false_image`) | KEEP | It is a Double for 0 charge, outside the held count, with no upkeep, lasting 3 rounds, and it needs no Visualization and no form known. No ladder level gives a body outside the count. Code fault: rev3.ts types the form `'double'` in code; give the move a `figment_form` field as Scrap Sentinel has. |
| I | Field Fix (`infiltrator.field_fix`) | REPLACE | It copies Field Repair (now the beta perk, whose tier II already drops the part). Replacement, NEW `trickster.quick_sketch`, **Quick Sketch**: "Once a turn: −1 AP on Picture" (`cost_mod` value −1, when cost, if action [picture], limit per_turn 1, min 1; the AP is priced at the site `picture`, as the Survival boon `start.quick_sketch` does). Field Fix goes back to the move pool, shelved, key kept. |
| II | Salvage (`salvage`) | REPLACE (trim) | Reclaim copies Cash in, and repair copies Field Repair. Keep only the wreck: "1 AP: a wreck next to you, +2 Visualizer charge (each wreck once a fight)". Data only: `pick: ["wreck"]`; the handler is unchanged. |
| II | Redline (`overclock`) | KEEP | No ladder twin: a Figment or machine attacks now at no AP. |
| III | Sleight (`sleight`) | KEEP | No ladder twin (Leon's ruling: the swap stays the Rigger's). |
| III | Scrap Sentinel (`scrap_turret`) | KEEP | Section 5: the Sentinel is now a form anyone may know, and Scrap Sentinel stays the Rigger's own. It is a free turret built from scrap: no charge, outside the forms known and the held count, with its own numbers (`figments.json turret`). |

## 6. Special rulings

- **Expression, Razor Beast:** superseded by section 5 (Leon's ruling of 19 Nov). The Beast is no longer moved to 8: any form, the Beast included, can be known from Visualization 1. What holds it back at level 1 is its cost (4 charge, the one Figment held, 18 to 32 HP), and the measure decides. If it is over, the Beast's own numbers are turned, never a gate (section 2, the balance note).
- The other rulings (Strain, Rite in the Field, Iron Heart, Rolling Start, Mender, Shadow) belong to other attributes and are not touched here.

## 7. COUNTS

Rule: per-point lines make a level felt, but they are not counted as things. "+1 form known" (2 to 9) is a per-point line.

| Skill | Felt (of 10) | Most things on one level |
|---|---|---|
| Visualization | 10 | 2: L1 (the door + Glimmer) and L7 (the perk step + a third held). Every other level has 1: L2 Cash in, L3/L6/L9 a perk step, L4/L8 a fork, L5 a second held, L10 Mastered. Was L1: 6 things. |
| Improvisation | 10 | 1 (perk steps at 3, 5, 7, 9; Mastered at 10). Was 5 felt, 3 things at L3. |
| Charisma | 10 | 2 (L3, L5, L7, L9: a perk + a Call step; L10: Mastered + the reaction Call). Was 5 felt. |

## 7. MIGRATION (what a save keeps)

- **Visualization perk steps:** a step taken at 5 is kept (lane 4's general rule). A save at 5 has two steps, and at 6 gains none.
- **Forms (section 5: "a save keeps every form it has open and counts them against its forms known, never losing one").** This is `figments.json migration` rev 2, `migrateCharacterFigments` with a new stamp:
  - The forms a save has open become picks under the new door id `figment_forms`, counted against the "known" grant. Open forms are the old ladder's fixed ones at its points (the Double and the Snare from 1, the Hand from 2, all from 10), plus `doorPicks.visualization`, plus `doorKept.visualization`.
  - What does not fit the grant goes to `doorKept.figment_forms`: kept, never counted.
  - The old ladder never opened more than the new count; for example, a save at 6 with a Beast has 5 open of 7 known. Only an unstamped save from before the forks can have more (the `migration.legacy` rows: 5 open at 3 against 4 known, 7 at 5 against 6). Its extra form is kept.
  - Every save at 2 to 9 below its count gets the rest as open picks on its next level-up card.
- **The old fork picks** are now forms known, as above. The new fork steps (Hard Light or Sharp Light at 4, Many Hands or Masterwork at 8) are offered fresh to every save past them, as a gift.
- **No Snap at 9:** a save at 9 or more loses the ladder's No Snap unless it takes Hard Light; see OPEN 4.
- **Unstamped saves:** the legacy rows (`migration.legacy`) run first, then rev 2.
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
3. **The held cap and Many Hands.** `limits.held_most` is 4. A Rigger at Visualization 7 or more already holds 4 (3 + the Rigger's Hands), so Many Hands gives that Rigger only the charge. Recommended: raise `held_most` to 5 and `limits.bodies` to 7 (PROVISIONAL), and measure the Rigger all in against its 150 line; otherwise the Rigger is steered to Masterwork.
4. **Saves at Visualization 9+ lose No Snap** (it moves to Hard Light). Recommended: accept, since it is a fork pick now. The step at 4 is re-offered to every save as a gift, so a player who wants it back can take Hard Light.
5. **Hard Light and Masterwork wait on pieces** (section 3, "Needs a new primitive"). Recommended: approve `owned_hp` and `snap` in `IMMUNE_IDS`; both are one line in a closed list and one read in `figments.ts`. For Masterwork's trait, take the variant (+2 to hit, −25% damage taken) for 0.32 and add the live-trait rule later. Until then step one and step two are not offered.
6. **Sharp Light and Wake of the Kill** (`blueprint`) both reward a Figment's kill. Sharp Light's reward is an order and Wake of the Kill's is AP and charge, so they stack to about a fourth Strike a round. Recommended: keep both, and measure them together.
7. **The level-1 Beast** (section 2, the balance note): it is reachable at Visualization 1, with Strikes at 90% of the rifle per AP before any upgrade. Recommended: re-run `figments-measure` with level-1 Beast builds and each fork option. Turn the Beast's own numbers if a row is over its line.
