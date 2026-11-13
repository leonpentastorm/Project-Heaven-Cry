# Shadow: Perception's door, through Ingenuity, and the Operative (spec, 13 Nov 2026)

Status: **a spec, nothing built** (Rev 4 `class-roster-rev4-proposal.md` 4.4; nine doors 5.1). Every number is
**PROVISIONAL** (a section 14 item later). Skill ids: Ingenuity `ingenuity`, Acuity `analysis`, Vigilance `vigilant`.

## 1. The fantasy and the loop

You are never where they are looking. Every turn out of their eyes builds **Shadow**, spent on the one strike that
tells them you were there, or on slipping away again. The Operative builds faster, holds more, reads, marks and
takes their machines apart.

**Worked example** (Operative: Ingenuity 7 so cap 4, Agility 3 so 2 tiles an AP, suppressed service rifle; the
fight starts with Shadow 1, behind a crate, no enemy has the tile in view).

| Turn | Action | AP left | Shadow | Why |
| --- | --- | --- | --- | --- |
| 1 | Hide; Analyze a Soldier who can't see you (1 AP) | 3 | 2 | `hideBlock` passes; the Operative's gain (2.3 d) |
| 1 | Move 2 tiles, crate to low wall, Hidden, ending out of view; Mark the Soldier | 1 | 3 | cover to cover (2.3 b), door gain 1 of 2; Mark: squad +1 to hit |
| 1 | End turn: Hidden, no attack made | | 4 | 2.3 a, door gain 2 of 2; the cap |
| Enemy | A Soldier sees the wall tile: d20 + 2 vs 10 + 6 + 3 = 19: 11, nothing | | 4 | `spotHidden` |
| 2 | Shot with **Break** on the Marked Soldier: 4 points, Marked, fresh ambush: ×(1 + 0.15 × 4 + 0.5 + 0.15) = **×2.25**, crit on 19-20 | 4 | 0 | 2.5; revealed though the rifle is silent |
| 2 | A plain shot; step 1 tile behind the wall, out of view; Vanish | 0 | 0 | Hidden again, a fresh ambush; no turn-end gain: it attacked |

## 2. Rules

**2.1 Sight, in the engine's own words** (all `engine`). Three tests, one door each, no new sight code:

| Word | Test | Where |
| --- | --- | --- |
| **Hidden** | the flag (`u.hidden`, condition row `hidden`); set by `hide`, `hideAgain`, `startHidden`; ended by `reveal` | `tactics.ts`, `unitstate.ts`, `magic.ts` |
| **In view** | some living, standing enemy's eyes reach your tile (range, light, line of sight), Hidden or not | `seenByFoes(cb, u)` (`tactics.ts`) over `unitSees` (`combat.ts`) |
| **Seen** | not Hidden and in view, after the `sees` hook (Spot, Sixth Sense...) | `sideSeesUnit(cb, otherSide, u)` (`combat.ts`) |
| **Can't see you** (a target) | that unit's own eyes don't reach your tile, or you are Hidden | `unitSees(cb, t, u.pos)` false, or `u.hidden` |

Data reads these through one function and its words (primitive P7 of `rev4-primitives.md`): `seen`, `unseen`,
`in_view`, `out_of_view`, in the predicates `self_sight`, `actor_sight`, `target_sight`.
A Silent weapon (`isSilent`: the `silent` property or `mod_suppressor`) attacks without ending Hidden, as today.
"Detection range" (spec table: 2 + Vigilance) is the story's notice range only; in a fight the spotting roll of
`spotHidden` is the detection, and this spec keeps it.

**2.2 The meter.** Shadow is a resource on the unit (`res.shadow`), 0 to its cap, **built the way Guard is**:
anyone with Ingenuity 1 has the pool (`character.ts` `guardPool` is the model). Cap 1 at Ingenuity 1, 2 at 5, 3 at
7; the Operative +1 (4). It starts each fight at 0 (the Operative at 1) and is 0 when the fight ends. `engine`.

**2.3 Gains** (`engine`; every gain is an item op on the Shadow door item, section 10):
a. **+1 at your turn's end** if you are Hidden and made no attack this turn (a hit or a miss marks the turn).
b. **+1, once a turn, for a move from cover to cover unseen:** a move of your own (`how` move or sprint, never a
   push) that starts and ends on a tile next to cover (half, full, or a solid tile), made Hidden, ending out of view.
c. **+1 for a kill nobody saw:** your hit drops an enemy and, after the attack is resolved (its reveal included),
   you are not Seen. A silent kill from Hidden qualifies; so does a loud kill from out of every enemy's view.
d. **The Operative:** +1, once a turn, when it Analyzes an enemy that can't see it.
e. Gains a-c also count when you are at cap: they are lost, not banked.
f. **The door's gains stop at 2 a turn** (one shared counter, a + b + c). The Operative's d has its own once a turn.

**2.4 Losses** (`engine`): a. a **Break** spends all of it (2.5); **Fade** spends 2 (list). b. **At the start of
each of your turns, −1 if you are Seen** (being spotted is a setback, not a wipe). c. Downed: 0. d. The fight's end: 0.

**2.5 The Break** (`engine`). A toggle on any weapon attack or weapon technique of yours (a shot, an Aimed Shot, a
Burst, a melee Opener or Strike, a thrown weapon), never a spell, prayer, Call or reaction (rules 2.1.4 of Rev 4: a
reaction is a plain attack). It needs Hidden and at least 1 Shadow.
1. **Every roll of that one action** takes **one** named multiplier **`shadow`** = 1 + **0.15 × the Shadow spent**
   + **ambush** (0.5, only on the first attack of a Hidden entry, `ambushReady`) + 0.15 against an enemy you Marked
   (rank I). One term, one number block (P3): the ambush term `attackDamage` keeps is off while the toggle is on, so
   the two never multiply. Crits on 19-20 come with the ambush, as today.
2. The Shadow is spent when the action ends (hit or miss), and **you are revealed** even with a Silent weapon.
3. **Folded in, no double dip:** today's `ambush` term (`ambush_mult`, 1.5 + 0.05 × Ingenuity, `character.ts`
   `ambushMult`) is **replaced** by the `shadow` term: an attack carries one `shadow` term or none. An attack from
   Hidden without the toggle is an ambush as today but at the flat ×1.5 (the Ingenuity slope goes: contract ruling 2,
   no slope on a rolled attack). The **Ambush Opener** keeps its crit lines (point 18-20, bare grab) but no longer
   gives the ambush when the entry is spent (it is a carrier of the Break, like any technique).
4. Each roll's damage still passes the **Elite and Boss guard** (`combat.ts` `BOSS_GUARD`, `bossGuards`): a Break is
   a character's action, so a full-HP Elite or Boss at or above your level is left on 1 HP. See 8.3 for Execution.

**2.6 Silent attacks from Hidden** (`engine`, a change): the target of a silent attack that survives, and whose eyes
reach your tile, rolls to spot you at once (the `spotHidden` roll, for that one looker). No reaction is spent.

**Edge cases.** *Fog:* `res.shadow` is on your unit; no human plays the other side (a PvP mode adds `res` to
`fogFight`'s list). *Forced movement* (`displace`) never counts as cover to cover and does not reveal, as today.
*Reactions:* no Break; a held shot from Hidden stays a plain attack. *Downed:* Shadow 0. *Co-op:* each character has
its own meter and counters; sight is per enemy, so a squadmate's lamp or flare can put you in view. *Saves
mid-fight:* `res.shadow` and the `uses()` counters are unit state. *Fight end:* 0; Hidden in the story still starts
the next fight Hidden (`startHidden`).

## 3. The list (21 verbs; all `engine` unless marked)

Costs are AP and Shadow; fuel none. "Unseen target" = it can't see you (2.1). Every verb but Lift needs you Hidden.
Saves are against 12 + your Ingenuity modifier (`saveAgainst` via `ingenuity`); against a machine, against 12 + the
better of your Ingenuity and Acuity modifiers.

| Kind | id | Name | Cost | Does | Opens |
| --- | --- | --- | --- | --- | --- |
| BREAK | `shadow.break` | Break | toggle; all Shadow | 2.5: the action ×(1 + 0.5 ambush + 0.15 a point), then revealed | Ing 1 |
| BREAK | `shadow.fade` | Fade *(was Vanish, Ing 5)* | 2 AP, 2 Shadow | become Hidden while Seen, if a tile next to cover is within one Move; you move there (a Hidden entry: fresh ambush) | Ing 5 |
| BREAK | `shadow.parting_cut` | Parting Cut | toggle; all Shadow, at least 2 | a Break that kills leaves you Hidden (`hideAgain`, same entry: no new ambush) if you are out of view after it | Ing 9 |
| SLIP | `shadow.decoy` | Decoy | 1 AP, 1 Shadow | a sound within 5 tiles of you: each enemy's (`targets: {side: "foe"}`) last-seen tile of you (`cb.lastSeen`) moves there; searchers go there (8.2) | Ing 3 |
| SLIP | `shadow.close_quarters` | Close Quarters | passive | an enemy that ends its turn next to you rolls to spot you (+4) instead of finding you outright (trigger `spot`) | Ing 3 |
| SLIP | `shadow.still` | Still Breath | passive | spot rolls against you are −2 while you stand next to cover (trigger `spot`) | Ing 5 |
| SLIP | `shadow.vault` | Vault | 1 AP | cross one tile of half cover, a barricade or a hole to the free tile beyond (`displace`, willing) | Ing 5 |
| SLIP | `shadow.run` | Shadow Run | passive, once a turn | a cover-to-cover move (2.3 b) costs 1 AP less, at least 1 | Ing 7 |
| MARK | `shadow.read_intent` | Read Intent | 1 AP | an unseen target gets the condition **`read`**: its next action (`enemyIntent`) is shown to your side until its turn ends | Ing 3 |
| MARK | `shadow.case` | Case | 1 AP | an unseen target's weapon, ammo, armour and rolled loot are shown; your Lift on it costs 1 AP less | Ing 3 |
| MARK | `shadow.open_seam` | Open Seam | 1 AP, 1 Shadow | an unseen target is **Exposed** (new condition row: Defense −2) until your next turn | Ing 5 |
| MARK | `shadow.timing` | Timing | 1 AP, 1 Shadow | an unseen target is **Off Balance** (new row: −1 AP on its next turn; never the same enemy two rounds running) | Ing 7 |
| WORK | `shadow.lift` | Lift *(kept, Ing 3)* | 2 AP | take one item, magazine or grenade from an adjacent enemy into the pile on your tile; from Hidden it isn't told (no save); seen, a Body save (12 + Ingenuity mod) | Ing 3 |
| WORK | `shadow.cut_strap` | Cut the Strap | 1 AP, 1 Shadow | an adjacent unseen enemy is **Disarmed** (Heart save) | Ing 3 |
| WORK | `shadow.foul` | Foul the Action | 1 AP, 1 Shadow | an adjacent unseen enemy's gun is **Lowered** (the jam: 1 AP to clear; Body save) | Ing 5 |
| WORK | `shadow.pick` | Pick | 1 AP | open or lock a door or container next to you mid-fight, no check | Ing 5 |
| WORK | `shadow.douse` | Douse | 1 AP | put out a lamp, light or flare within 2 tiles (`objects` hp 0): the dark halves sight there | Ing 5 |
| WORK | `shadow.rig` | Rig | 2 AP, 1 Shadow | a trap object (`objects.json trap`, your side's, hidden) on your tile or next to it, flat 25 at level 1 (`flat` profile); one at a time | Ing 7 |
| WORK | `shadow.plant` | Plant | 2 AP, 1 Shadow | slip a tracker onto an adjacent unseen enemy: it is **Marked** by you (squad +1 to hit, can't hide; the tracker of today's perks) | Ing 7 |
| WORK | `shadow.disable` | Disable | 2 AP, 1 Shadow | a machine, turret, drone or camera within 1 is **Stunned** 1 round (machine save) | Ing 7 |
| WORK | `shadow.hijack` | Hijack | 2 AP, 2 Shadow | a machine, turret or drone within 1 is **Puppeted** 1 round (machine save): you spend its AP | Ing 9 |

## 4. The ladder

| Ingenuity | Gives |
| --- | --- |
| every point (2, 4, 6 and 8 give only this) | your Stealth: the spot TN 10 + Ingenuity mod + ½ Ingenuity (as today, `spotHidden`); the strength (save TN) of what you do unseen. **No longer +5% ambush damage** |
| 1 | the door, its whole loop, smaller: the meter, cap 1; Break (a new unlock row `"1"`: skills.json unlocks start at 3) |
| 3 | Lift, Decoy, Close Quarters, Read Intent, Case, Cut the Strap; perk step (Mastery 1) |
| 5 | cap 2; Fade (Vanish folded), Still Breath, Vault, Open Seam, Foul, Pick, Douse; perk step |
| 7 | cap 3; Shadow Run, Timing, Rig, Plant, Disable; perk step |
| 9 | Parting Cut, Hijack; perk step |
| 10 | the Mastered perk (unchanged) |

**Gear gate:** none (`gear:stealth` gates stealth suits: Stealth, not Shadow). **Acuity (beta)** adds no meter: it
keeps Analyze, −5% critical damage taken, Quick Read, Read Them, and counts against machines (section 3). **Vigilance
(gamma)** is the counter-skill: it finds the Hidden (spot rolls, the Spot Call, Cold Spine); nothing for Shadow.

## 5. The class: the Operative *(Suggested; was Infiltrator, id `infiltrator` kept)*

**Better:** (1) **bigger meter:** starts each fight at 1, cap +1; (2) **one thing cheaper:** its Analyze costs 1 AP
(`cost_mod` set 1; Quick Read is then no further cut) and puts the condition `read` on the target (its next action
shown: Read Intent folded in; the Trickster's Read of Revision 3); (3) **six moves**. An Analyze on an enemy that can't see it gives +1 Shadow, once a turn (2.3 d).

| Rank | Move | Cost | Effect and numbers | Shadow |
| --- | --- | --- | --- | --- |
| I | **Mark** (kept, `assassin.mark`) | 1 AP | an enemy you see is Marked to the fight's end: squad +1 to hit it, it can't hide; 3 at once, a fourth lifts the oldest | a Break on it counts +1 point |
| I | **Vanish** (kept) | 1 AP, once a turn | if you are not in view, become Hidden (a new entry: fresh ambush). Not while Marked | re-opens the gate after a Break |
| II | **Toxin** (kept, `assassin.toxin`) | 1 AP, 1 dose (`res.toxins`, restocked at rest) | coat a blade, bow or thrown weapon: Weakened, Slowed or Bleeding on the next hit (Body save vs 12 + Ingenuity mod); a Break with it adds the Shadow spent to the TN | spends none, rides a Break |
| II | **Sabotage** (kept, moved from III) | 2 AP | within 1: a machine, turret or drone is Stunned 1 round (no Shadow, unlike Disable); or a barricade within 1 breaks (its hp to 0); or Rig your tile (rank II's Rig costs no Shadow) | feeds the gate: a Stunned machine sees nobody |
| III | **Execution** (kept) | passive | your hit that leaves a Marked enemy at ¼ max HP or less kills it; Bosses and Celestials immune; **never on a hit the Elite and Boss guard held, nor on an Elite that was at full HP when the action began** | a Break is its usual set-up |
| III | **Called Shot** (moved in, from `gunslinger.called_shot`) | 3 AP | gun or bow; name head (Dazed), arm (−2 with it) or leg (half Movement): that injury on a hit; −2 to hit, **no −2 if the target can't see you** | may carry a Break |

**Squared and mixed classes** (Rev 4 4.4, the Ghost): **a sketch of the shape only; no rule, primitive or number
here may depend on it** (Leon, 13 Nov: the advanced classes may be shelved for a whole new system).

## 6. On what exists

**Built from** (every rule against the primitive that carries it; verified by grep on 13 Nov 2026):

| Rule or verb | Primitive | Where |
| --- | --- | --- |
| The meter | a resource row like Guard: `RES_RULES` entry + a pool read from data (as `guardPool`), `actions.json resources` row `shadow` (`res.shadow`) | `character.ts` `RES_RULES`, `classResources`; `data/actions.json` |
| Gains 2.3 a | item op `resource` on trigger `turn_end`, `if` `self_has: ["hidden"]`, `no_flag: "struck"`; limit `{per_turn, n 2, key "gain"}` | `effects/triggers.ts`; flag set by op `mark` on `hit` and `miss`, cleared on `turn_start` |
| Gain 2.3 b | op `resource` on `moved`, `how: [move, sprint]`, `self_has: ["hidden"]`, `self_sight` (P7), `by_cover` (batch row); limit `per_turn` 1 and the shared key | triggers.ts |
| Gain 2.3 c | op `resource` on `hit`, `target_hp_at_most: 0`, `self_sight: "unseen"` (P7; `on_hit` is emitted after the attack's `reveal`, `combat.ts` resolveAttack) | triggers.ts |
| Gain 2.3 d | op `resource` on trigger `acted` (P2), `action: ["analyze"]`, `target_sees_self: false`; limit `per_turn` 1 | class item |
| Loss 2.4 b | op `resource` −1 on `turn_start`, `self_sight: "seen"` | door item |
| Loss 2.4 c, d | op `resource` `value: "zero"` (P3) on `downed` and `combat_end` | door item |
| Break term | op `damage_mult` on `dealing`, `if: {toggle: "shadow.break"}` (P12), value a number block (P3: `res:shadow`, `event:ambush`, `target:marked`); label `shadow`; one term | `combat.ts` `attackDamage` drops its `if (o.ambush) M(...)` line while the toggle is on |
| Break spend and reveal | op `resource` `value: "all"` (P3) and op `cleanse` `hidden` (through `reveal`) on `acted` (P2) with the toggle | `tactics.ts` `reveal` |
| Break carriers | data toggles (P12) on the attack card | `effects/actions.ts` `togglesFor` |
| Verbs as buttons | `verb` items in `data/shadow.json` (P6), `requires: [{skill: "ingenuity", min: n}]`, their `grant_action` with `reach` and `if`; class moves as today | `effects/collect.ts`, `effects/actions.ts` |
| Verb costs, limits | `ap`, `res: {shadow: n}` on the action (the `shadow` resource row), `price`/`whyNot`/`pay`; `uses(h).take('per_turn')` | `effects/cost.ts`, `effects/uses.ts` |
| Exposed, Off Balance, `read` | condition rows (`defense` −2; `ap` −1; `read`: the source's side sees the bearer's `enemyIntent`), P4 | `data/conditions.json`, `condtable.ts` |
| Cut the Strap, Foul, Disable, Hijack | existing rows `disarmed`, `lowered`, `stunned`, `puppeted` via op `condition` with the save | `applyCond`, `saveAgainst` (`magic.ts`) |
| Lift, Pick, Douse, Rig, Plant, Sabotage | the pile (`containers.ts`), `door` and `interact` cost sites, object hp, `makeObject('trap')` with a `flat` amount, op `condition` `marked` | `objects.ts`, `combat.ts` |
| Vault, Fade's step | `displace(..., { tile, willing: true })` | `combat.ts` |
| Decoy | `cb.lastSeen` (written by `rawHidden`), over `targets: {side: "foe"}` (P5) | `unitstate.ts` |
| Read Intent, Case | op `condition` `read` (batch row); the Analyze read-out | `combat.ts` `enemyIntent` |
| Spotting, 2.6, Close Quarters, Still Breath | `spotHidden`; trigger `spot` (batch row, on the hook {die, mod, tn, cancel}) | `tactics.ts` |
| Sight tests | `sightOf` (P7) over `seenByFoes`, `sideSeesUnit`, `unitSees` | `combat.ts`, `tactics.ts` |
| The guard | `BOSS_GUARD`, `bossGuards` in `damage_in` | `combat.ts` |
| Log lines | `say` (op `say` field) | `log.ts` |
| Hover text | the one card: `perk_cards.json` rows and the descriptor's `text` | `perkcard.ts` |

**Needs a new primitive** (shapes in `rev4-primitives.md` only): P2 `acted`; P3 number blocks and `"all"` /
`"zero"`; P4 condition rows; P5 `targets`; P6 door verbs; P7 sight words; P12 data toggles; the batch rows `spot`,
`by_cover`, `read`, resource `shadow`.

**Removed or moved:** Ingenuity `per_point.ambush_per_point` and the `ambushMult` slope (2.5.3); the Ingenuity
unlocks 3 (Lift) and 5 (Vanish) are data text with no fight button today (they are not in `SKILL_ITEMS`): they
become `shadow.lift` and `shadow.fade`; the Infiltrator's `field_fix` goes to the Rigger (the one action
`field_repair`, `figments-spec.md` 4); `sabotage` moves to rank II; `called_shot` moves in. The Rev 3 handlers
`classes/rev3.ts` `infiltrator.vanish`, `infiltrator.sabotage` and `trickster.read` and the private `analyze` hook
are replaced by data on the primitives above. **Migration:** class id `infiltrator` stays, display name Operative;
move keys `class:infiltrator.vanish`, `class:infiltrator.sabotage` stay; old saves load with `res.shadow` absent = 0.

## 7. Balance

**The yardstick.** Rifle shot = ⅓ of a rifle-turn (2 AP of 6); estimates from the contract's numbers, not measured.
**The lines (Leon's budget reading, 13 Nov):** the base class all in sits ON the ceiling C; the door all in C ÷ 1.15
(about 13% under); the door at a normal share that ÷ 1.25. For Shadow C = **125** (the three-turn window, below):
door all in 125 ÷ 1.15 = **109**, door normal 109 ÷ 1.25 = **87**. (The squared column, C × 1.13, is not designed.)

**The Break action** is priced with the budget rule as a **peak** (at most once in three turns) with two set-up
turns a target can waste: the Operative's allowance = AP share × 1.65 × (1 + 0.1 × 2) = **AP share × 1.98**; the
door's 1.98 ÷ 1.15 = **1.72**. The `shadow` term at the cap with a fresh ambush:

| Level | Normal share (36%): Ingenuity, cap, term | All in: Ingenuity, cap, term | Operative all in (+ Marked) |
| --- | --- | --- | --- |
| 1 | 3-4, 1, ×1.65 | 7, 3, ×1.95 | 4, ×2.10 (×2.25) |
| 5 | 5-6, 2, ×1.80 | 8, 3, ×1.95 | ×2.10 (×2.25) |
| 10 | 8, 3, ×1.95 | 10, 3, ×1.95 | ×2.10 (×2.25) |
| 20 | 10, 3, ×1.95 | 10, 3, ×1.95 | ×2.10 (×2.25) |

One action against its allowance: the Operative ×2.10 / 1.98 = +6% (Marked ×2.25 / 1.98 = +14%); the door all in
×1.95 / 1.72 = +13%. A peak may sit over its action allowance while the window holds: the window is the line.

**Three turns, loud rifle, door all in (Ingenuity 7):** T1 Hide, Read Intent, a cover move (+1), end Hidden with no
attack (+1): Shadow 2, no damage; T2 a cover move (+1 → 3), Break shot ×1.95, one shot: 2.95 units; T3 three shots.
5.95 of 9 units = 66%, ×1.25 accuracy = **83%**. **Operative all in** (starts at 1): T1 Hide, Analyze unseen (+1),
cover move (+1), Break shot ×1.95: 1.95 units; T2 Mark, Analyze, two shots: 2; T3 three shots. 6.95 of 9 = 77%,
×1.25 = **97%**, **≈ 120%** with Mark's squad value (+1 to hit ≈ +8% on three allies' attacks).

| Window, all in unless named | Line | Estimate | Off the line |
| --- | --- | --- | --- |
| Operative (with Mark's squad value) | 125 | 120 | −4% |
| Operative (no Mark) | 125 | 97 | −22% |
| Door all in | 125 ÷ 1.15 = 109 | 83 | −24% |
| Door, normal share | 109 ÷ 1.25 = 87 | not estimated | |

**The line: a three-turn window with one Break, Operative all in = 125%** (the gun's 145% less the 15% Exposure
allowance Shadow never pays; settled). Dial: **`rules.json shadow.per_point`** (0.15), fitted only after the window
rows are measured (rev4-primitives 3.2); the estimate puts the door under its band (−12%), so expect it raised, and
recheck the single Break against its allowance when it is.

**Stealth as defence** (off the target list, `perceivedFoes`) is worth **0** by the control yardstick (as Taunted: the
doctrine moves the fire onto the other three), except an enemy left with **no target at all**: a denied turn (1.0 a
Soldier, Elite ×1.4, never a Boss's whole turn), counted as measured. **The real risk is the silent shooter** who never
Breaks; 2.6, the Seen-loss and the no-attack turn-end gain hold it. **Measure:** rows `shadow_door`,
`shadow_operative`, `shadow_silent` in `test/balance/refit-measure.ts` (Ingenuity all in and 36%, suppressed rifle,
these sequences, levels 1/5/10/20, a map with cover), and a guard test: no Break (Execution included) takes a
full-HP Elite or Boss at level under 1 HP.

## 8. The other side

1. **Who hides:** enemies carry no Shadow meter. Units with a new enemy tag **`skulk`** (`FOE_TAGS`; Vermin, Minions
   and Soldiers only: stalkers, scouts, Crawler hunters) use Hide when out of view with no shot, and ambush from it
   (the flat ×1.5, today's rule). Elites may be **placed** Hidden by the Narrator (`n.hidden`, `startHidden`); a Boss
   is never Hidden after round 1.
2. **When a target goes unseen** (rules 1.25): the enemy chooses again among those it perceives, doctrine
   unchanged. With nobody perceived it walks to the **last-seen tile** of the nearest Hidden one (`cb.lastSeen`) and
   ends there (ending next to a Hidden unit finds it: Close Quarters makes that a roll). Today it stops (`if
   (!pcs.length) break;`). A Decoy moves the tile. An enemy hit by an unseen attacker searches toward it first.
3. **Bosses:** never one-shot from Shadow: the guard holds every roll of a Break; Execution never fires on a
   guard-held hit or on an Elite at full HP at the action's start (bosses are immune already). This closes the
   hole where the guard's 1 HP is under a quarter and Execution would finish it in the same action.
4. **The healer hunt** is unchanged: `healerMark` skips the Hidden, so a Hidden Mender is safe until spotted; but a
   Mender who tends through a Bond is **Traced** and can't be Hidden (`bonds-spec.md` rule 14).

## 9. The screen

- **The meter**, once, on the unit's resource row beside Momentum and Guard: pips 0 to cap in Perception ink
  `#40BAA0` with the word "Shadow", and an eye glyph with a word: **Unseen**, **In view**, **Seen**.
- **Tab "Shadow"**, groups Slip, Mark, Work, Break; the Break is a toggle on the attack card ("Break: spend 3 Shadow,
  ×1.95 · you will be revealed"); the attack preview lists `shadow ×1.95` as one term. **Hover** (the one card): the
  verb's text, cost and refusal ("An enemy sees you", "It can see you").
- **Works:** a pip fills with a ring (pure SVG); a Break plays the existing `sight` fx `reveal` and logs "X breaks
  from the shadows (3 Shadow): ×1.95". **Fails:** the pip empties with a grey tick, "Seen: −1 Shadow".
- **Art (list for `art/briefs/ART-REQUESTS.md`):** the meter glyph and four group marks (white flat ink, Wick style,
  as prayer icons; the 21 verbs reuse their group's mark until drawn); the Operative's emblem only if renamed.

## 10. Data

`rules.json` gains `"shadow": {"cap_by_points": {"1": 1, "5": 2, "7": 3}, "operative_cap_add": 1, "operative_start":
1, "ambush_bonus": 0.5, "per_point": 0.15, "door_gains_per_turn": 2, "provisional": true}`; `actions.json resources`
gains `"shadow": {"name": "Shadow", "on": "unit", "path": "res.shadow"}`; `output.systems.weapon` (new entry)
names the `shadow` term; `balance.ceilings.shadow` holds 125 and the dial. The door item is Ingenuity's unlock 1:

```json
"1": { "name": "Shadow", "mastery": 0, "adjudication": "engine", "provisional": true,
  "text": "You build Shadow while unseen: +{=effects.0.value} when your turn ends Hidden with no attack made, +{=effects.1.value} for a move from cover to cover unseen, +{=effects.2.value} for a kill nobody saw; at most {=effects.0.limit.n} a turn. While an enemy sees you, {=effects.3.value} at the start of your turn.",
  "effects": [
    {"op": "resource", "resource": "shadow", "value": 1, "when": "turn_end", "if": {"self_has": ["hidden"], "no_flag": "struck"}, "limit": {"per": "per_turn", "n": 2, "key": "gain"}},
    {"op": "resource", "resource": "shadow", "value": 1, "when": "moved", "if": {"how": ["move", "sprint"], "self_has": ["hidden"], "by_cover": ["from", "to"], "self_sight": "out_of_view"}, "limit": {"per": "per_turn", "n": 2, "key": "gain"}, "and": [{"op": "use", "limit": {"per": "per_turn", "n": 1, "key": "cover"}}]},
    {"op": "resource", "resource": "shadow", "value": 1, "when": "hit", "if": {"target_hp_at_most": 0, "self_sight": "unseen"}, "limit": {"per": "per_turn", "n": 2, "key": "gain"}, "say": "{self} kills unseen: Shadow {res:shadow}."},
    {"op": "resource", "resource": "shadow", "value": -1, "when": "turn_start", "if": {"self_sight": "seen"}, "say": "{self} is seen: Shadow {res:shadow}."},
    {"op": "mark", "flag": "struck", "when": "hit", "if": {"actor": "self"}}, {"op": "mark", "flag": "struck", "when": "miss", "if": {"actor": "self"}},
    {"op": "mark", "flag": "struck", "clear": true, "when": "turn_start"},
    {"op": "resource", "resource": "shadow", "value": "zero", "when": "downed"}, {"op": "resource", "resource": "shadow", "value": "zero", "when": "combat_end"}],
  "toggles": [{"id": "shadow.break", "name": "Break", "on": ["combat/attack"], "if": {"self_has": ["hidden"]},
    "text": "This attack spends all your Shadow: every roll of it ×(1 + {=toggles.0.effects.0.value.per.0.value} a point), then you are revealed.",
    "effects": [
      {"op": "damage_mult", "when": "dealing", "if": {"toggle": "shadow.break"}, "label": "shadow",
       "value": {"base": 1, "per": [{"of": "res:shadow", "value": 0.15}, {"of": "event:ambush", "value": 0.5}, {"of": "target:marked", "value": 0.15}]}},
      {"op": "resource", "resource": "shadow", "value": "all", "when": "acted", "if": {"toggle": "shadow.break"}, "and": [{"op": "cleanse", "condition": "hidden"}]}]}]
}
```

The toggle's floor of 1 Shadow is the action's price (`res.shadow` 1). A MARK verb (a `verb` item in
`data/shadow.json`, P6):

```json
{"id": "shadow.open_seam", "name": "Open Seam", "kind": "verb", "requires": [{"skill": "ingenuity", "min": 5}], "adjudication": "engine", "provisional": true,
  "text": "{=effects.0.ap} AP and {=effects.0.res.shadow} Shadow: an enemy that can't see you is Exposed until your next turn (Defense {=effects.1.value}).",
  "effects": [
    {"op": "grant_action", "action": "open_seam", "ap": 1, "res": {"shadow": 1}, "uses": "at_will", "if": {"self_has": ["hidden"]},
     "reach": {"tiles": 8, "side": "foe", "if": {"target_sees_self": false}}},
    {"op": "condition", "condition": "exposed", "target": "target", "when": "acted", "if": {"action": ["open_seam"]}, "skip_save": true, "rounds": 1, "value": -2}]}
```

`conditions.json` gains `exposed` (`stat_mod defense −2`, 1 round, `boon: false`, family none, no save),
`off_balance` (`stat_mod ap −1`, its next turn, family body) and `read` (the batch row). **Validator rules to add:**
a `shadow.*` verb's `res.shadow` is at most the cap at its `requires` points; `toggles[].effects` use only item ops;
a `res:` source names a resource in `actions.json resources`; Ingenuity's `per_point` has no `ambush_per_point`.

## 11. Open questions for Leon

**Settled** (L = Leon; lead = the lead's call, from this spec's recommendation, which Leon can reverse):
1. Every door plays its whole loop at 1 point: the meter and the Break at Ingenuity 1; the other verbs from 3 (lead).
2. Shadow builds only on a turn with no attack (2.3 a); a silent attack lets the target roll to spot (2.6) (lead).
3. Ingenuity loses +5% ambush a point; the ambush is a flat ×1.5, and 0.15 a point spent (lead).
4. The line: 125% all in over a three-turn window, on the budget reading (base class on C, door ÷ 1.15) (L, lead).
5. Execution never fires on a guard-held hit or an Elite at full HP at the action's start (lead).
6. Toxin's doses are the move's own supply (`res.toxins`, restocked at rest; +5% on its line), no core cost (lead).
7. Sabotage Stuns a machine 1 round, not 2 (lead; `rev4-moves-and-rename.md` 2 follows).
8. The Operative's Analyze is a flat 1 AP and puts `read` on the target (lead). 9. No enemy Shadow meter; `skulk`
   enemies Hide and ambush (lead). 10. The advanced classes are a sketch only (L). **Still open:** none.
