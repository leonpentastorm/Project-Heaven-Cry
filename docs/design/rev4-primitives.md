# Revision 4: the primitives, consolidated (13 Nov 2026)

A design note for the Revision 4 patch; **nothing is built**. Frame: `class-roster-rev4-proposal.md` sections 2, 2.1
and 2.2 (Leon: "forbidden to write custom code for each system if one already exists"). It reads the six specs written
today (`shadow-spec.md`, `bonds-spec.md`, `figments-spec.md`, `chaplain-spec.md`, `reactions-spec.md`,
`rev4-moves-and-rename.md`) against each other and against the code (checked by grep on 13 Nov), and puts each new
primitive in one place. The closed lists are those of `engine-foundations-3-item-ops.md` section 2 (30 triggers,
54 predicates, 18 ops), `effects/triggers.ts` and `data/effect_ops.json item_ops`.

**Count.** The specs ask for **26** ("Needs a new primitive": Shadow 5, Bonds 11, Figments 1 with 7 parts, Chaplain
5, Reactions 4, moves 0) plus 10 "extensions". Consolidated: **12 primitives** and **one batch of 13 closed-list
rows** (a trigger, predicate, op or field each, with no new mechanism). Three of the specs' asks already exist and
need nothing new: `pick` on an action (`effects/actions.ts pickOptions`), `cb.zones` (`magic.ts Zone`), and stat
`reactions` (`effects/stats.ts`, read by `tactics.ts maxReactions`).

## 1. The consolidated list

| # | Final name and shape | Lives in / extends | Used by (spec: for what) | Folds these names | Deletes when built |
| --- | --- | --- | --- | --- | --- |
| P1 | **`react(cb, u, {kind, event, spend = 1, payer?}, fn)`**: `kind` is `attack`, `move` or `protect`; checks `canReact`, opens `reaction_window`, takes `spend` from the `uses` cell (scope `reaction`) of `payer ?? u`, sets `cb.reacting` while `fn` runs (no reaction inside a reaction), one reaction per unit per `event` id. Item ops: `limit: {reaction: n}` routes through it; trigger **`reaction`** fires inside it (actor, kind) | `tactics.ts`; `limit` keys in `triggers.ts`; TRIGGERS +1 | Reactions (rules 1 to 10, Killzone `spend: 2`); Bonds (Share a Hit, Take the Weight: `protect`); Figments (the Blade's Hold: `payer` = the owner); Many Hands (`payer` = the donor) | Reactions' `react()`, trigger `reaction`, `reactions_spent`; Bonds' `limit {reaction: true}`; `reactionDonor` | `useReaction`, `u.reactUsed`, `u.reactedRound` (old saves read once); `classes/i.ts fighter.riposte`; later `perks/c.ts catch`, `dance_of_iron` to data |
| P2 | **Trigger `acted`**: fired once by the reducer after a unit's own action succeeds, ctx `{action: cost site or action id, target, tile, toggles}`. A `grant_action`'s nested `effects` are sugar for `when: acted, if: {action: [<its id>]}` | TRIGGERS +1 | Shadow (gain 2.3 d on Analyze, the Break's spend and reveal); Chaplain (Ward, Sanctuary); every door verb (P6) | Shadow's `acted`; Chaplain's `on_use`; the data's free-text `when: "on_use"` (Vanish, Brace, Draw Fire, Mark, Toxin) | the private `analyze` hook (`combat.ts` 2328); `classes/rev3.ts infiltrator.vanish` |
| P3 | **Number blocks and amount sources**: any numeric op field may be `{base, per: [{of, value}]}`; `per[].of` gains namespaces `res:<id>` (the holder's resource now), `event:<field>` (the trigger's payload: `amount`, `over`, `ambush`), `self:<field>` / `target:<field>` (a unit field such as `max_hp`, or 1/0 for a condition id). Op `resource` takes `value: "all"` and `"zero"` | `effects/amounts.ts` (`per` reader), `triggers.ts` (field reader) | Shadow (the Break's term from the meter); Bonds (Brimming's overheal, Take the Weight's 15% of max HP, Spite); Momentum's Finisher; Reactive Plate | Shadow's `per_res`; Bonds' "amount counts from the event" and `of: "max_hp"`; the existing `per` | `fighter.finisher`'s `per: "momentum_spent"` handler math; the literal multipliers in `defender.reactive_plate` |
| P4 | **Conditions are items**: a `conditions.json` row's `effects` with `when` run through `runTriggered` (the bearer is the holder, the giver is `source`, `{source}` in `say`); a row's `stat_mod` with any `STATS` id answers `statQuery` (today `condtable.ts modsOf` keeps only seven stats) | `condtable.ts`, `triggers.ts` (holders), `effects/stats.ts` | Bonds (25 given feelings, Traced); Reactions (`slipping` answers `immune:opportunity_attack`); Figments (Stare's `watched`); Shadow (Exposed, Off Balance); Chaplain (Judged); the Operative's Toxin coat (a row with a `hit` op) | Bonds' "a condition runs item ops"; Reactions' "condition rows answer stats" | `classes/i.ts assassin.toxin` (its coat and `next_hit`) |
| P5 | **Unit set selector `targets`** on any op: `{of: self, target or tile, side: foe, ally, side or any, within, shape (burst, aura, cone, line), seen, tied, aims_at, alive, downed, max}`; the op runs once for each unit of the set, in `kit.ts unitsIn` order | `triggers.ts` (op field); `kit.ts` `unitsIn`, `alliesOf`, `foesOf` | Bonds (Rally, the aim read); Figments (Volatile's burst); Shadow (Decoy: each enemy's last-seen tile); the item-ops hand-off's "area targets" gap | Bonds' `targets`; the registry op `aura` (6 items: Nothing Left to Fear, War Footing, Born Officer, Live to Fight Another Day, Squad Anchor, Trench Poet) | `classes/rev3.ts bard.rally`; `perks/e.ts rally_cry`, `grim_reaper` (II); `perks/f.ts the_name_they_whisper`; `perks/a.ts bulwark`; `classes/k.ts shade.lingering_dread` (live: the Fighter's rank II) |
| P6 | **Door verb**: item kind **`verb`**, held by anyone whose sheet meets `requires: [{skill, min}]` (or `{class, rank}`); its `grant_action` is the one action shape: `ap`, `res`, `if` (holder predicates), **`reach`** `{tiles, sight, tied, side, self, if}` (target predicates; builds the pick list and the refusal), `pick` (existing; adds `felt`, `forms`), **`prayer`** `whisper` or `hymn` (routes through `faith.ts combatPray`: slot, wait, Atheist roll, Witnessed), `limit`, nested `effects` (P2) | `effects/collect.ts` (kind, `SKILL_ITEMS` derived from data), `effects/actions.ts` (`defaultActions` reads `reach`, `prayer`) | Shadow (21 verbs); Bonds (`data/tending.json`); Figments (Picture, Let go, the forms' verbs); Chaplain (Ward, Sanctuary); predicates `actor_alive`, `target_alive` | Bonds' kind `verb`, `reach`, `choose {from: felt}`; Shadow's "grant_action on skill unlocks" and `needs`; Chaplain's `prayer`; Figments' `target: owned_or_machine` | `SKILL_ITEMS` hand list; `classes/rev3.ts infiltrator.sabotage`, `infiltrator.field_fix`; `classes/i.ts medic.triage`, `medic.stim_throw`, `medic.field_surgery`, `bard.inspire`, `guardian.will_shield`, `guardian.sanctuary`; `classes/rev3.ts guardian.command`, `trickster.silver_tongue` (retired) |
| P7 | **Sight words**: one function `sightOf(cb, u, by?)` → `seen`, `unseen`, `in_view`, `out_of_view` (shadow-spec 2.1's table over `seenByFoes`, `sideSeesUnit`, `unitSees`); predicates **`self_sight`, `actor_sight`, `target_sight`**; stat **`always_seen`** (a unit the other side sees wherever it is); a unit's `eyes: false` (no sight of its own) | `combat.ts` / `tactics.ts`; PREDICATES +3; `STATS` +1 | Shadow (gains, losses); Bonds (`reach.sight`, Traced = `always_seen`); Figments (the Eye has eyes, the rest `eyes: false`; Stare = `watched` row answering `always_seen` for one unit) | Shadow's `self_sight`; Figments' `owned.sight` and "read by the `sees` hook"; Bonds' Traced read in `healerMark` | `requires_state: "unseen_by_enemies"` (Vanish) |
| P8 | **Ties**: `cb.ties: {kind, from, to}[]`; `tie`, `untie`, `tiesOf` in `kit.ts`; op **`tie`** (`kind`, `clear: "all"`); predicates **`actor_tied`, `target_tied`** (`"<kind>"`, or `{kind, as: from or to}`); cap stat **`ties_max:<kind>`**; each kind a row in `rules.json ties.kinds` (`ends_on`: `from_down`, `to_dead`, `combat_end`; `on_end`: `none` or `unmake`); fog keeps `me`'s side's ties | `kit.ts`, OPS +1, PREDICATES +2, `fog.ts fogFight` | Bonds (`bond`); Figments (`owned`: the held count is `ties_max:owned`, the Rigger's +1 a `stat_mod`); Hexer, Heartbinder, Banner Dancer, Warden (later) | Bonds' Ties; Figments' `owned.by`, rel `owned` / `owner`; `companion`, `twinOf` | nothing now (the Heartbinder's links in `classes/k.ts` are shelved: rebuilt on ties) |
| P9 | **Owned unit**: ops **`spawn`** (a unit from a data block at the owner's level through `levelCompanion`, makes an `owned` tie) and **`unmake`** (`refund`); the block's `turn: owner, own or auto`, `eyes`, `upkeep {res, n}`, `cover`, `lure`; **`payer`** on `price` / `pay` (`{cb, u, payer}`: priced on the unit, paid by the owner); one action system `owned` (`registerActions`) | `owned.ts` (new), `effects/cost.ts`, `descriptors.ts`, OPS +2 | Figments (forms, Double, Scrap Turret); the drone, the beast, the twin migrate (`turn: own`) | Figments' 7 parts | `illusion.ts` FalseImage body (`cb.images` read for old saves); `classes/rev3.ts trickster.false_image`, `trickster.sleight`'s own swap; registry ops `spawn_illusion`, `companion` |
| P10 | **Zones from data**: op **`zone`** (`kind`, `shape`, `at`, `rounds`, `pool`) writes `cb.zones`; predicates **`self_in_zone`, `target_in_zone`** (`{kind, owner: self, side or any}`); `pool` is spent by the op that reads it (`damage_mult` in a zone takes its prevented damage from it) | `magic.ts Zone` (+`pool`), OPS +1, PREDICATES +2 | Chaplain (Sanctuary); Sigil fields; the Seal | Chaplain's `in_zone`; the registry op `state` where it makes an area | `classes/i.ts guardian.sanctuary` (`damage_in`); `warden.seal`'s `sealAt` |
| P11 | **Shield layers**: `grantShield(cb, t, n, by, {layer?, holders?, stack?})`; `u.shields[layer] = {n, by}` beside `u.shield` (the base layer, "the larger stands" as today); layers are spent first, newest first; `holders`: at most N units carry one giver's layer (a new one ends the oldest); op `mend` gains `layer`, `holders` | `effects/damage.ts`, `applyDamage` | Chaplain (Ward); Adamantile Knight's bridge (later). Bonds' Shield and Brimming stay on the base layer (P3 gives Brimming its amount) | Chaplain's `layer`, `layer_holders` | `guardian.will_shield`'s `shieldBy(h)` |
| P12 | **Data toggles**: an item's `toggles: [{id, name, on: [action ids], if, effects}]` read by `togglesFor`; predicate **`toggle`** (the action carries it) | `effects/actions.ts`, PREDICATES +1 | Shadow (the Break, Parting Cut); later Heart Surge | Shadow's "data toggles" | lane `ToggleDef` in `classes/i.ts channeler.heart_surge` (when moved) |

**The batch of closed-list rows** (each one line in `triggers.ts` or a field, added with its first user):

| Row | Kind | First user | Note |
| --- | --- | --- | --- |
| `spot` | trigger (hook exists: `tactics.ts` 153) | Shadow (Close Quarters, Still Breath) | missed by the Shadow spec: it builds on the `spot` hook, which no item op hears today |
| `by_cover` (`from`, `to`) | predicate | Shadow (cover to cover) | |
| `aims_at` (`"tied:<kind>"`, `self`) | predicate on a unit (the enemy's `enemyIntent` target) | Bonds (the aim read, inside P5's `targets`) | |
| `patron` (`words`) | predicate | Chaplain (the presence rows on the class) | |
| `mend_mult` | op on `heal`, `shield`, `heal_given` | Bonds (`through` ×1.2) | the `damage_mult` of mending; `shield_grant` ctx gains `kind` |
| `redirect` (`share`, `target`) | op on `taking` | Bonds (Share a Hit) | the registry's `share_damage` (Heartbinder) folds into it |
| `via`, `nonlethal` | fields on `deal` | Chaplain (Smite as a prayer; the Toll-Keeper's) | `viaOf`, `applyDamage`'s flag |
| `condition: "incoming"` | value of op `condition` | Bonds (Take the Weight) | the condition being cancelled |
| resource rows | `resource` op reaches every `actions.json resources` row through `cost.ts spend`: `mp` (`needs: emanator_in_hand`), `pressure` (a row whose setter is `addPressureTo`, `on: target`), `shadow`, `vcharge` | Bonds, Reactions (Run and Gun), Shadow, Figments | Reactions' `resource: "pressure"`; Bonds' "MP through the resource op" |
| `heal_kind` | field on an amount block, passed by generic `mend` | Bonds (`tending`) | |
| `intervention_keeps_witnessed` | `STATS` id | Chaplain (rule 11) | asked in `faith.ts intervene()` |
| `read` | a condition row (P4), not an op: the source's side sees the bearer's `enemyIntent` until its turn ends | Shadow (Read Intent), the Operative's Analyze, Bonds (`targets {side: foe, seen: true, aims_at: "tied:bond"}`) | replaces Bonds' op `read_intent` and `classes/rev3.ts trickster.read` (sets `readIntent` by hand) |
| `limit.of` | `limit` key: `owner` | Figments (the Blade's reaction is its owner's) | P1's `payer` from data |

**Ties or two relations?** One. A Bond and an owned unit are both an edge between two units with a kind, a cap per
holder, an end rule and a fog rule; with one table the cap is one stat (`ties_max:bond`, `ties_max:owned`), the save
is one field, the fog one list, the predicates one pair, and the Hexer (a Bond to an enemy) and the Warden (the Wall
holds your Guard) need nothing more. What an owned unit has beyond the edge (whose AP, upkeep, turn order, eyes) is the
spawned unit's own block (P9), not the relation.

## 2. What each spec must change (old name → new name)

| Spec | Section | Old | New |
| --- | --- | --- | --- |
| shadow | 6 item 4, 10 | `{per_res: "shadow", base: 1, each: 0.15}` | `{base: 1, per: [{of: "res:shadow", value: 0.15}, {of: "event:ambush", value: 0.5}, {of: "target:marked", value: 0.15}]}` (one term: section 3, contradiction 9) |
| shadow | 6 "Built from" (verbs) | `grant_action` on `skill:ingenuity.<n>` in `SKILL_ITEMS` | `verb` items in `data/shadow.json`, `requires: [{skill: "ingenuity", min: n}]` |
| shadow | 10 Open Seam | `needs: {self_has, target_sees_self}`, `target: "enemy"` | `if: {self_has: ["hidden"]}`, `reach: {tiles: 1 or n, side: "foe", if: {target_sees_self: false}}` |
| shadow | 10 toggles | `needs: {self_has, res}` | `if: {self_has: ["hidden"]}` (the `res` floor is the action's price) |
| shadow | 3 Read Intent; 5 Analyze | `enemyIntent` read by hand | op `condition`, `condition: "read"` |
| shadow | 3 Decoy | "each enemy's last-seen tile" | `targets: {side: "foe"}` |
| shadow | 6 Close Quarters, Still Breath | "`spot` hook" | trigger `spot` |
| bonds | 6.2 item 4, 10 | `limit: {reaction: true}`, `uses: "reaction"` | `limit: {reaction: 1}` |
| bonds | 6.2 item 6 | "a condition runs item ops" | P4 (no field: a row's effects with `when`) |
| bonds | 6.2 item 7 | `grant_action.choose: {from: "felt"}`, `{choice}` | `grant_action.pick: "felt"`, `{pick}` |
| bonds | 6.2 item 8; 10 | `per.of: "event:<f>"`; `{of: "max_hp"}` | `event:over`; `{of: "self:max_hp"}` |
| bonds | 6.2 item 9 | op `read_intent` (`if_aims_at: "tied:bond"`) | op `condition: "read"` with `targets: {side: "foe", seen: true, aims_at: "tied:bond"}` |
| bonds | 6.2 item 1; 10 validator | tie kinds in `tending.json bond.kinds` | `rules.json ties.kinds` |
| bonds | 2 rule 14, 6 extensions | `healerMark` reads `condOn(t, 'traced')` | the `traced` row answers stat `always_seen` (P7) |
| bonds | 3 | `tend.lift` "Lift" | a new name (Shadow's WORK verb is Lift): **Soothe** *(Suggested)* |
| figments | 6.2 | `u.owned: {by, kind, turn, sight, ...}` | the tie `owned` (P8) + the block's `turn`, **`eyes`**, `upkeep`, `cover`, `lure` (P9) |
| figments | 6.2 item 2 | rel `owned`, `owner` | `target_tied: "owned"`, `actor_tied: {kind: "owned", as: "from"}` |
| figments | 2 rule 3; 3; 4; 5 | `held` ladder, "the Rigger +1" | stat `ties_max:owned` (ladder in `figments.json`, the Rigger a `stat_mod` +1) |
| figments | 6.1 Stare | row `watched` "read by the `sees` hook" | row `watched` answering `always_seen` (P4, P7) |
| figments | 10 Overclock | `target: "owned_or_machine"`, `range: 8` | `reach: {tiles: 8, sight: true, side: "ally", if: {target_kind: ["machine"]}}` or `target_tied: "owned"` |
| figments | 6.1 Volatile | "area through `kit.ts unitsIn`" | `targets: {of: "self", shape: "burst", within: 1, side: "any"}` |
| figments | 2 rule 10 | the Blade "spends your reaction" | `limit: {reaction: 1, of: "owner"}` |
| figments | 4, 11 item 1 | the door at Visualization 3 | Visualization 1 (section 3, contradiction 3) |
| chaplain | 6 item 1; 10 | trigger `on_use` | trigger `acted` (or the `grant_action`'s nested `effects`) |
| chaplain | 6 item 2 | `in_zone` | `target_in_zone: {kind: "sanctuary", owner: "self"}`; Sanctuary placed by op `zone` (`pool` = the cap) |
| chaplain | 10 Ward | `layer_holders: "numbers.held"` (a path) | `holders: 2` (a number in the op; the text binds `{=effects.1.holders}`) |
| chaplain | 3.1, 11 item 6 | Judgement | **Verdict** (section 3, contradiction 6) |
| reactions | 6 item 1 | `react(cb, u, kind, event, fn)` | `react(cb, u, {kind, event, spend, payer}, fn)` |
| reactions | 5, 6 Killzone | `"reactions_spent": 2` | `spend: 2` on the held shot |
| reactions | 6 item 3 | `resource: "pressure"` special-cased | an `actions.json resources.pressure` row (`on: target`, setter `addPressureTo`) |
| reactions | 6 item 4 | "if it does already, nothing to add" | it does not (`condtable.ts modsOf` keeps seven stats): P4 |
| moves | 2 Called Shot | `if: {mode: ["called_shot"]}` | `if: {action: ["called_shot"]}` (`called_shot` is not a `mode`) |
| moves | 2 Sabotage; 4.4 frame | "2 rounds, as built" | 1 round (Shadow 11 item 7; the control rule) |

## 3. Contradictions, and the resolution recommended

1. **Killzone: one reaction or two.** Data (`classes.json` text "The two shots use one reaction between them";
   `tactics.ts payHeldShot`, one `uses` cell since the audit) vs the frame (4.3) and `reactions-spec.md` rule 6 (two).
   **Two** (`spend: 2`; with one left, one shot fires): the frame's rule 1 says every shot outside your turn spends
   one, and the Burst's rounds stay one shot. The card text changes in the patch.
2. **The budget reading.** Frame: door = normal line, base +15%, squared +30%, all under the ceiling (can't all hold).
   Bonds: squared on the ceiling. Shadow, Figments and the Chaplain put the **base class** on the ceiling, and so do the
   five built systems: every measured build in `test/balance/builds.ts` carries its class (`classId`). **One reading:
   the base class all in = the contract ceiling C; the door all in = C ÷ 1.15; the door at a normal share = that ÷ 1.25;
   the squared class = C × 1.13 (1.30 ÷ 1.15), its own contract column when the squared batch is built.** The ratios
   are Leon's as written; only the frame's "all under the ceiling" breaks, and only for classes not in this patch.
   Leon to rule (the alternative, Bonds' squared-on-C, cuts every fitted dial by about 12%).

| Mechanic | C (base class all in) | Squared | Door all in | Door normal | The spec now | Change |
| --- | --- | --- | --- | --- | --- | --- |
| Guard (Bulwark) | none: the Tank row (77 / 52 / 74 / 121) is defence | | | | start Guard 1, no row moves | a defence ceiling is still missing |
| Momentum (Breaker) | 165 (melee) | 186 | 143 | 115 | Breaker measured 153 (L20 176) | measure L20 before the Shaken gain |
| Pressure (Skirmisher) | 145 (best gun) | 164 | 126 | 101 | door = plain rifle 114; Skirmisher about 135 | none: "+19% over" falls away; 145 is the line |
| Shadow (Operative) | 125 (its window) | 141 | 109 | 87 | door 83, Operative 97 (120 with Mark) | none; fit `shadow.per_point` after measuring |
| Sigils (Sigilist) | 150 to 200 | 170 to 226 | 130 to 174 | 104 to 139 | Mage 166 | none |
| Figments (Rigger) | 150 | 170 | 130 | 104 | door normal 120, door all in 129, Rigger 148 | door normal target 104, not 120 |
| Tending (Mender) | 200 (healer) | 226 | 174 | 139 | door 154, Mender 177, Heartbinder 200 | raise `tend.k` about ×1.13 (Mender 200, door 174) |
| Outbursts (Channeler) | 135 steady / 165 peak | 152 / 186 | 117 / 143 | 94 / 115 | Channeler 136 / 155 | none |
| Blessings (Chaplain) | 125 (new `chaplain_turn`) | 141 | 109 | 87 | Faith + Dex door 101, Chaplain 136 (+9%) | none; the Whisper turn's 80 stays the prayer-only line |

3. **Where a door opens.** The lead's rule: every door plays its whole loop at 1 point, smaller. **Shadow** already
   does (meter cap 1 and Break at Ingenuity 1); add the unlock row `"1"` (skills.json unlocks start at 3).
   **Figments** must change: at Visualization 1, Picture, the Double, 1 held, range 5; Eye, Wall and 2 designs at 3;
   Beast, Blade and 2 held at 5; 3 held and two traits at 7 (the Rigger +1 held from 1). **Bonds** complies (Bond,
   Mend at Empathy 1; gear: an Emanator for MP). **Faith** does not: prayer opens at Faith 3 (rules 1.6). Recommend the
   ruling binds the new doors; a built door that opens at 3 is a rules change Leon makes on its own.
4. **Field Fix vs Field Repair.** Data's Field Fix: 2 AP, adjacent, 20 on the `flat` profile; the Figments spec's
   Field Repair (everyone's, Improvisation 3, a part): 15 on the `repair` profile, about 28 at a normal share. The
   class move heals less than the door. **One action, `field_repair`**: the Rigger's Field Fix is a class item that
   sets its `res.parts` to 0 (its "one thing cheaper"), drops the Improvisation gate and gives `reach` 2; one amount.
   Deletes `classes/rev3.ts infiltrator.field_fix`; `combat.ts fieldRepair` stays the one door.
5. **Suppressed and protective reactions.** Frame 2.1.5 and Bonds rule 10: protective reactions work while
   Suppressed. Reactions rule 7 and the engine (`maxReactions` returns 0 under the condition `suppressed`; only
   Pressure's state spares Parry, Shield Wall, Interpose in `canAnswer`) have two Suppresseds. **One rule:** both take
   `attack` and `move` reactions, never `protect` (P1's `kind`); the row's `forbid` becomes those kinds. Duck and Roll
   is `move`; Share a Hit and Take the Weight are `protect`.
6. **Judgement.** Frame: 3 Devotion, once a scene; data and the Chaplain spec: 1 Devotion (10 Devotion XP), once a
   fight. **The data** (3 Devotion levels is about a session's XP). And rename it **Verdict**: `patrons.json` 472
   names Nerukhan's Hymn II "Judgement", and the condition "Judged" already reads from it.
7. **Toxin's doses, Supplies, spare parts.** Frame: fuel belongs to the Core (Perception: none; Mind: cores).
   **Consumables are gear, not fuel:** toxin vials, spare parts and field kits are pack items anyone carries (like
   stims and grenades); `toxins` and `supplies` leave every class's `resources`; the Operative's Toxin spends a vial
   as a thrown weapon spends itself. Shadow's "+5% on its line" for the supply stands.
8. **Empathy's free Pump to Will Power.** The fitted `outburst` build (`builds.ts`) holds Empathy at weight 0.16 and
   in its all-in list, so the free Pump came late at a normal share; on Will Power it comes from level 1, and the swell
   from Will Power 7 (all in at level 1, not later). Expect `outburst_steady` up at levels 1 and 5. Rules 1.19's "one
   free stage a turn from any source" also overlaps the Channeler's Shape. Re-measure `outburst_steady` and
   `outburst_peak`; fit `soul_modules.json damage.base` only past +12%. Shape's card ("without Empathy 3") changes.
9. **Shadow's Break term** (found here): 2.5 says one term ×(1 + 0.5 + 0.15 a point); 6 and 10 build a
   `damage_mult` beside the ambush term `attackDamage` keeps, so they multiply (×1.5 × 1.45 = 2.18 at 3 points, not
   1.95; +11%). One term: the number block of section 2, the ambush term off when the toggle is on.
10. **Smaller frame mismatches the specs already fix** (the frame text follows them): Ward 30 → 7; Inspire "+2 next
    roll" → next attack; the Rigger's "first Figment free" → Overclock; the Mender's Strain → MP and HP; Sabotage 2
    rounds → 1 (and the moves spec too). **Name clashes:** Shadow's Lift vs Tending's Lift (above); the Chaplain's Ward
    vs the shelved Warden's Ward (`warden.ward`): keys differ, only the shelved one renames when it returns.

## 4. Live bugs the spec writers found, verified

| Bug | Verified | Now or the patch | The fix in one line |
| --- | --- | --- | --- |
| Execution kills an Elite the guard left on 1 HP | **Yes.** `classes/i.ts` 640-647 checks `isBoss` only; the guard floors a full-HP Elite to 1 HP; Execution's `applyDamage` has `type: 'execution'`, which `combat.ts` 586 `NOT_AN_ACTION` exempts. Live at Infiltrator rank III | **Now** | skip Execution when the guard held the target this action (export a `guardHeld(t, by)` reader of `GUARD_MARK` from `combat.ts`) |
| Lift and Vanish (Ingenuity 3, 5) have no fight button | **Yes.** Not in `effects/collect.ts SKILL_ITEMS` (142); also Mercy (Empathy 5) and Afterimage (Visualization 3, never built) | Patch (P6 derives the list); now only as a Narrator button | add `ingenuity.3`, `ingenuity.5` to `SKILL_ITEMS` (they run as `defaultActions`: the Narrator resolves) |
| An enemy with no perceived target stands still | **Yes.** `combat.ts` 2427 `if (!pcs.length) break;`; `cb.lastSeen` exists (`unitstate.ts` 58) | **Now** (AI only; replays re-recorded on purpose) | walk toward the nearest `cb.lastSeen` tile of its side before the break |
| Acuity tagged `attr:expression` | **Yes, and swapped:** `analysis` carries `attr:expression`, `proficiency` (Improvisation) carries `attr:perception`; `effects/core.ts` 89 matches tags, so Right Brain Debuff (`conditions.json` 339) hits Acuity | **Now** (data) | swap the two tags in `skills.json`; validator: an `attr:` tag equals the skill's `attribute` |
| `weapon_mastery.json` never loaded (Last Word) | **Yes.** Only `tools/validate.py`, `text_numbers.py` and the screen build read it; no engine file. The cards are shown (`design/canvas-build`) | Now: label the cards "not in the engine yet"; the system after the balance pass (Leon's order), Last Word on P1 | one `brief`/badge on the weapon mastery screen until built |
| The Breaker 7% over melee at level 20 | **Measured, not a bug:** 176 vs 165 is inside the per-level ±25%; the mean 153 is inside ±12% | Patch (step 3) | measure level 20 before and after the Shaken Momentum gain |
| The Whisper turn about 101 on Faith 7 / Dexterity 3 | **An estimate on a sheet the contract does not build** (its faith build is Dexterity 0) | Patch (step 4) | add the Faith + Dex sheet to `faith-measure`; under the reading of section 3 the door line is 109 |
| Stale numbers on class move cards | **Not confirmed live:** 22 base-class cards spot-checked against their fields (Rally 6 = data 6 = `mending.ts RALLY_HEAL`) | Patch | the cards that go stale in the patch: Killzone, Shape, Triage (5 → 4.3), Rally (6 → 3.5), Inspire, Judgement |

## 5. Build order of the primitives

Each closes with `npm run check` green and the lints (`lint-item-ops`, `lint-costs`, `lint-conditions`,
`lint-foundations`) with baselines not grown; the pin first, on the old code (ENGINE-GUIDE rule 3).

| Order | Primitive | Stands on | Closes on (lint; golden table) | Unblocks (rev4-moves step) |
| --- | --- | --- | --- | --- |
| 1 | The closed-list batch rows that need no mechanism (`spot`, `by_cover`, `patron`, `via`, `nonlethal`, `heal_kind`, resource rows) and **P2** `acted` | nothing | `item-ops.test.ts` (lists = data); `golden-itemops` (pin Analyze, Vanish, Brace); `lint-item-ops` | all |
| 2 | **P3** number blocks and sources | 1 | `amount-literals`; `golden-damage*` (Finisher, Reactive Plate unchanged) | Shadow, Bonds |
| 3 | **P1** `react()` | 1 (trigger `reaction`) | `lint-costs` (no `useReaction` call left; ratchet); `golden-costs` marks, `golden-rules`, replays re-recorded on purpose; `reactions-once-a-round.test.ts` | step 2 |
| 4 | **P4** conditions are items | 1, 3 | `lint-conditions`; `golden-conditions` (no row moves); `golden-itemops` (Toxin) | steps 5, 6, 7 |
| 5 | **P5** `targets` | 4 (`read` row) | `lint-foundations` (no private filter over `cb.units`); `golden-itemops` (Rally, the six `aura` items, Lingering Dread) | steps 3, 7 |
| 6 | **P7** sight words | 4 (`always_seen`) | `sight-order` oracle (unchanged), `fog-view.test.ts` | step 6 |
| 7 | **P6** door verbs (with `prayer`) | 1, 2, 5, 6 | `descriptors.test.ts`, `boundary.test.ts`, `combat-actions.test.ts`; `lint-item-ops` (the handlers of section 1 deleted, list shrinks) | steps 4, 6, 7, 8 |
| 8 | **P10** zones, **P11** shield layers | 7 | `golden-rules` (zones), `golden-damage` shield and Sanctuary lines | step 4 (the Chaplain) |
| 9 | **P12** data toggles | 7 | `descriptors.test.ts`; `golden-damage` (attack cards) | step 6 (Shadow) |
| 10 | **P8** ties | 5, 7 | `old-save.test.ts`, `fog-view.test.ts` (another side's ties never sent); `golden-itemops` | step 7 (Bonds) |
| 11 | **P9** owned units | 1 (payer), 7, 8, 10 | `old-save` (drone, beast, twin load as owned), replays (companion turn order unchanged), `golden-costs` (the payer), `golden-rules` | step 8 (Figments) |

The live fixes of section 4 marked "Now" go first, on `develop`, each with its own test, before step 0's pin.

## 6. Addendum, 13 Nov (after Leon's rulings on enemy Bonds and the Bond focus)

The rewritten `bonds-spec.md` (section 6.2) needs these, none of which was in the list above. Each is a general
addition to a closed list or to a primitive already listed; none is a handler. They are built with the primitive
they extend (so in step 1b, with P8 and the batch rows), and each needs its test and the catalogue regenerated.

| Addition | Extends | Shape | Who else can use it |
| --- | --- | --- | --- |
| **`delay`** on any op | the op runner | `delay: {until: "target_turn_start" \| "holder_turn_start" \| "rounds", n?}`: the op is queued and run then, with the amount fixed when queued; a queued op on a dead unit is dropped; saved with the fight | the healing echo; any "next turn" effect (today hand-written in several perks: find and move them) |
| P3 source **`ties:<kind>`** | P3 number blocks | `per: [{of: "ties:bond", value}]`: counts the holder's ties of a kind | "harder with more Bonds"; Figments held |
| predicates **`self_holds`** / **`self_lacks_gear`** | the predicate list | `{slot: "hand" \| "person", door or item kind}`: the holder has a focus or item of that kind in a hand or on its person | every focus gate (Evoker, Emanator, Visualizer, the Bond focus): replace the per-door "in hand" checks with it |
| P8 **`ends_on`** words `to_down`, `unseen_round`, and `tie clear: "target"` | P8 ties | a tie ends when its far end goes Down (foes), or has been out of the near end's sight for a full round; an op may clear the ties to one target | enemy Bonds; a Figment out of range |
| **`redirect` `split`** | the `redirect` row | the redirected share is divided among several receivers (`targets`, P5) | the damage share to Bonded enemies; Share a Hit with several allies |

**One thing the Bonds rewrite found that the frame's weapon-neutral rule must settle before step 7:** its to-hit
bonus against a Bonded enemy reaches weapon attacks only, because Sigil and Outburst rolls do not go through the
`attack` hook. Either those rolls are brought onto the same roll primitive's hook (the lead's recommendation: one
place where "a roll to hit this target" can be changed, in `rolls.ts`), or the bonus is stated as weapon-only. Until
ruled, the spec says weapon attacks.
