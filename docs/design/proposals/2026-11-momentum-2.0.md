# Momentum 2.0: the Breaker breaks things (proposal, full size)

15 Nov 2026, first draft. Status: **design, nothing built**. Every number below is PROVISIONAL and a data field
(`data/classes.json` base `fighter` unless named; the meter's own rules in `data/techniques.json rules.momentum`). If
accepted, the spec changes first (the Momentum section of Physical 2.0 and the Breaker's entry, rules 1.29) as a new
revision, its numbers as spec items 2350 to 2399 (the lead renumbers if the range is taken). Every item is
`adjudication: engine`. Sister drafts: `2026-11-figments-2.0.md`, `2026-11-bonds-2.0.md`, `2026-11-guard-2.0.md`
(origin/wip/design-*); this one reuses their P8 and P9 numbering and adds three general pieces (P12 to P14).

Leon, 15 Nov 2026, verbatim: "All players need to feel like they do something only they do best, all player need to
feel satisfy fighting." and, of the newer doors, "feels like mf just standing their doing notthing".

**Only the Breaker:** *"I hit, the number on me goes up, and then I pick what to break: a crowd, a guard, a wall, or the
guy I just threw across the room."*

## 1. Honest diagnosis (three lines)

1. Every unit with a melee weapon already has Momentum (cap 3); the Breaker only lifts it to 5 and adds "closing in"
   (+1 a tile closed, max 2, `classes/i.ts`), so for its first two levels it is anyone with a sword.
2. Only Cut builds it (`physical/core.ts isPlainMelee`) and each tile walked costs 1 (`physical/rules.ts`, `step_loss`),
   so the melee class is taxed for moving: a 4-tile Charge loses 4 and gets back 2; standing still costs nothing.
3. Nothing is seen: no counter on the token (a pip row in the resources panel and an amber float "MOMENTUM n",
   `fx/physical.ts`), no hit grows with it, and the class Lunge, Shove, Finisher and Riposte have no effect of their own.

The measure agrees (`baseline-0.29.md`): heavy melee is the best damage in the game next to its target (maul 203 to
235 against the melee line 165 and the gun ceiling 145), yet melee clears stage 1 solo 17 to 33% against guns' 54%: it
dies walking and getting hit. Momentum 2.0 makes the run pay and the hits visible; it adds little raw damage.

## 2. What builds Momentum (weapon-neutral, stated exactly)

**Today** (checked in code): a hit with **Cut** (the free plain attack, any melee weapon, a shield-hand blow and bare
fists included) gives 1 (`resolveAttack`'s +1); the class **Lunge**'s blow and the class **Finisher**'s blow are plain
blows with no technique, so a hit with either gives the same 1; Shield Bash gives 1 (`landed`); perks: Follow Through
(Raw Power M2), Iron Grip II, Both Hands II (a shot that hits, once a turn); the Breaker's closing in. A **thrown**
weapon gives none (`o.thrown`). A **gun** gives none: no melee technique exists for a gun in hand; a gun-holder has no
meter at all unless the off hand holds a melee weapon or a shield (`ensureMomentum`). **Kept**: Momentum is the melee
door; a Breaker builds it with any melee weapon, a shield or bare fists, never with a gun or a throw (question 3).

## 3. The additions

Kinds: **D** a decision on a turn, **S** something the player sees. "Builds" is **yes** (data rows and client views on
primitives that exist, named by their exact names) or the new piece it waits for.

### 3a. The chain you can see

| # | Kind | Name | Rule a player reads | Data shape | Built from | Builds |
|---|---|---|---|---|---|---|
| 1 | S | **The counter** | Your Momentum is the number on your token: x1 to x5. | client view: the token template reads `u.res.momentum` / `u.resMax.momentum` (already sent); shown for every unit with the meter, the Breaker's ring in Strength ink with the word "x3"; sizes in `techniques.json rules.momentum.show {counter_min: 1}` | resource `momentum` (unit), the token template | yes |
| 2 | S | **Impact grows** | Every melee hit lands a ring as big as your Momentum. | `rules.momentum.show {ring_base: 10, ring_per: 4, crack_at: 5}`; the melee fx reads the `momentum` effects event's `now` that follows the hit | `emitFx 'momentum' {now, was}`, the `melee` fx event | yes |
| 3 | D | **Every blow counts** (Breaker) | Any melee technique that hits gives 1 Momentum, at most {=hit_cap} a turn. | `resource {when: hit, if: {actor: self, melee: true, free_tech: false}, resource: momentum, value: 1, limit: {per: per_turn, n: 3}}` (Cut and the lone blows keep the engine's +1; `free_tech: false` keeps them out, so nothing counts twice) | trigger `hit`, predicates `melee`, `free_tech`, op `resource`, `limit` | yes |
| 4 | D | **Idle bleeds** (Breaker) | End a turn without moving or landing a melee blow: lose 1. | `mark {when: hit, if: {actor: self, melee: true}, flag: busy}`, `mark {when: moved, if: {actor: self}, flag: busy}`, `mark {when: turn_start, if: {actor: self}, flag: busy, clear: true}`, `resource {when: turn_end, if: {actor: self, no_flag: busy}, resource: momentum, value: -1}` | triggers `hit`, `moved`, `turn_start`, `turn_end`; `mark`, `flag` / `no_flag`; op `resource` | yes, **held**: ships with 5 (alone it is only a nerf) |
| 5 | D | **The run carries** (Breaker) | Walking costs you no Momentum. Others still pay 1 a tile. | `stat_mod {stat: "step_loss:momentum", value: -1}` on the class's resource row | **P12** | P12 |
| 6 | D | **Charge carries** (Breaker) | A Charge that hits gives {=charge_gain} Momentum on top of closing in. | `resource {when: hit, if: {actor: self, mode: [charge]}, resource: momentum, value: 2}` | trigger `hit`, predicate `mode` (a technique id), op `resource` | yes |
| 7 | D | **Bowl Over** (Breaker) | Your Charge knocks its target Prone (Body save) with any weapon. | `condition {when: hit, if: {actor: self, mode: [charge], target_alive: true}, condition: prone, target: target, via: raw_power}` (Charge's blunt/heavy line stays; this is the class's, for every weapon) | trigger `hit`, op `condition` (`via`) | yes |

Today's Charge (`techniques.json charge`: 3+ straight tiles, +10% a tile to +50%) is the straight run; the Breaker's
closing in (+1 a tile, max 2) already reads it. With 6 and 7 (and 5 when built) a Charge is +4 Momentum and a foe on
the floor, which Iron Grip's new damage against Prone foes (the other lane's rewrite) then pays.

### 3b. The finishers: one meter, four jobs

The Breaker gets all four at rank I (level 3): Cleave, Break and Coup are techniques that exist (`stat_mod {stat:
"technique:<id>", value: 1}`, the shape of today's `riposte` class row), Launch is the class's own order. A Finisher
needs 2 and spends all (`momentum_needed:<id>`, `spendMomentum`); the action bar shows the four side by side, each
greyed with its reason until the meter reaches 2.

| # | Kind | Name | Rule a player reads | Data shape | Built from | Builds |
|---|---|---|---|---|---|---|
| 8 | D | **Cleave** (the crowd) | Hit the target, then one more adjacent foe per Momentum spent; for you, with any weapon. | `stat_mod technique:cleave`; `roll_mod {when: to_hit, if: {actor: self, mode: [cleave]}, value: 2}` (cancels the off-home −2: weapon-neutral) | stat `technique:<id>`, trigger `to_hit`, op `roll_mod`, predicate `mode` | yes |
| 9 | D | **Break** (the guard) | Stun on a failed save, and for you the foe's Guard is gone and it is Exposed. | `stat_mod technique:break`; `resource {when: hit, if: {actor: self, mode: [break]}, resource: guard, value: "zero", target: target}`; `condition {when: hit, if: {actor: self, mode: [break]}, condition: exposed, target: target, skip_save: true}` | trigger `hit`, op `resource` (`"zero"`), op `condition`, condition `exposed` (Defense −2, 1 round) | yes (check: `resource` takes `target: target` as `condition` does; if not, the Guard half waits and Exposed ships) |
| 10 | D | **Launch** (the throw; 2 AP, needs 2, spends all) | Heave a foe next to you {=launch_tiles} tiles; it takes a blow that grows with Momentum (Body save: 1 tile, half). | `grant_action {action: breaker_launch, ap: 2, uses: at_will, range: 1, res: {momentum: 2}, reach: {side: foe, if: {target_not_tier: [boss]}, why: {...}}, effects: [deal {amount: launch, target: target}, knockback {tiles: 3, target: target, save: body, tn: "12+strength:raw_power", alt: 1}, resource {resource: momentum, value: "all"}]}`; `amounts.launch {kind: damage, profile: melee, base: 0.9, per: [{of: "res:momentum", value: 0.25}], provisional: true}` (read after the 2 are paid: each Momentum beyond 2 adds); a Boss is moved 1 | `grant_action` (`res`, `reach`), op `deal` (amount block, `res:` term), op `knockback` (save, `alt`), op `resource` (`"all"`) | yes |
| 11 | D | **Coup as Execute** (the hurt) | Against a foe under half HP your Coup is +2 to hit and ×{=execute_mult}. | `stat_mod technique:coup`; `roll_mod {when: to_hit, if: {actor: self, mode: [coup], target_hp_below: 0.5}, value: 2}`; `damage_mult {when: dealing, if: {actor: self, mode: [coup], target_hp_below: 0.5}, value: 1.25}` | `roll_mod`, `damage_mult`, predicates `mode`, `target_hp_below` | yes |

The class Finisher (rank III, +20% a point to +100%) stays as the plain fifth choice; Follow Through and Keep Swinging
(the other lane's rewrite: a Finisher that drops an enemy gives 1) feed all five without change. Launch's landing on
a hazard tile works as any forced move (`displace` result text: "lands on a trap"); its slam into a wall or a body is
13 below.

### 3c. The map gives way

| # | Kind | Name | Rule a player reads | Data shape | Built from | Builds |
|---|---|---|---|---|---|---|
| 12 | D | **Wrecker** (Breaker) | Smashing cover, a barricade or a door next to you costs 1 AP less and gives 1 Momentum. | `cost_mod {when: cost, if: {action: [break]}, value: -1, min: 1}`; `resource {when: acted, if: {action: [break]}, resource: momentum, value: 1}` | cost site `break` (`ap_cost:break`, `shootCover`), trigger `acted`, ops `cost_mod`, `resource` | yes (check: the cost site `break` is the cover smash only; the Break technique prices as its own id, as Siege Engine's two rows assume) |
| 13 | D | **Breach** (Breaker) | When you smash cover, every foe within {=breach_reach} of you is Exposed for a round. | `condition {when: acted, if: {action: [break]}, condition: exposed, skip_save: true, targets: {of: self, within: 2, side: foe, seen: true}}` | trigger `acted`, op `condition` with `TargetSet` | yes |
| 14 | S | **The push shows where it lands** | Before a Shove, Bash or Launch you see the landing tile, and the fire, trap or wall waiting there. | client view of the order's preview: `displace(..., {preview: true})` already returns `to`, `path`, `stoppedBy`, `blockedAt`; the card draws the arrow and names the tile ("FIRE", "WALL") | `displace` preview, `DisplaceResult` | yes |
| 15 | D | **Into the Wall** (Breaker, every push) | A foe you push into a wall, object or body takes a slam; the body it hits takes it too. | `deal {when: displaced, if: {actor: self, stopped_by: [wall, object, unit]}, amount: slam, target: target}` and the same `deal` on `targets: {of: stopper}`; `amounts.slam {profile: melee, base: 0.5}`; Breaching Strike becomes this row plus its `when` on any melee push (its code in `perks/skeleton.ts` retired) | **P13** | P13 |
| 16 | D | **Hurl** (Breaker; 2 AP) | Lift a crate, barrel or a Grappled small foe next to you and throw it at a tile within 4. | `object {do: "hurl", has: {loose: true}, at: tile, tiles: 4, amount: hurl}`; a barrel's own `explodes` row goes off where it lands; a Grappled vermin or minion uses Throw Down's landing (its `occupant_pct`) | **P14** (and the objects' `loose` field: data) | P14 |

Enemies behind broken cover are exposed twice over: the cover is gone (sight and cover are read from the objects that
stand, `coverUnits`), and 13 marks them for the squad. Throw Down (a held foe slammed into the tile next to you, heavy
2 tiles) is today's throw of a body and stays.

### 3d. The Breaker's own moves, seen, and its growth

| # | Kind | Name | Rule a player reads | Data shape | Built from | Builds |
|---|---|---|---|---|---|---|
| 17 | S | **The moves are drawn** | Lunge, closing in, Shove, Finisher and Riposte each have their own moment (section 4). | fx handlers keyed by the events the engine emits (`fx.move: fighter.lunge`, `fighter.finisher`, the `shove` event, the `riposte` tech, the `momentum` event with `was`/`now`); the closing-in line moves from `say` in `i.ts` to the effects event's `why` | `emitFx`, the existing fx events | yes |
| 18 | D | **The two Breakers** (Raw Power 5, a fork) | Demolisher or Duelist: one path for good. | `fighter.paths[]` rows: `{id, points: {raw_power: 5}, rows: [...]}`; a pick on the level-up card | **P8** (one fork action) | P8 |
| 19 | D | **Demolisher** | Breach reaches 3; Launch throws 1 tile further; Wrecker gives 2. | path rows: the same ops as 10, 12, 13 with the path's own numbers (`launch_tiles` 4, Wrecker `value` 2, Breach `within` 3), live only on the path P8 records | ops of 10, 12, 13; **P8** | P8 |
| 20 | D | **Duelist** | Coup as Execute below 60% HP; a Riposte that hits gives back 2. | `resource {when: hit, if: {actor: self, mode: [riposte]}, resource: momentum, value: 2}`; 11's `target_hp_below: 0.6` | trigger `hit`, `mode`; **P8** | P8 |

Until P8, the choice that exists today stays: the Raw Power M3 and M4 perk steps choose between Breaching Strike (the
demolisher) and Iron Grip (the wrestler-duelist) in the order the player likes.

## 4. The effects (what a builder draws; `apps/web/src/game/fx/breaker.ts`, beside `figments.ts`)

All SVG lines on the map layer, paced by the combat speed setting (`pace()`), none under Reduce motion except the
words and the counter's number. The acting token moves first. Colour is Strength ink `#F68A38` for Momentum, the
states' colours for results, and every colour is paired with a word.

| Moment | Acting token | What travels | Target | Word |
|---|---|---|---|---|
| Momentum +n (any source) | its counter pops (scale 1.35 to 1 over 160 ms); a ring of `max` arc segments around the token fills one more | nothing | | "x3" (and "+2 CLOSING", "+2 CHARGE" for those sources) |
| Momentum lost (walk, hit taken, idle) | the counter's old number drops 8 px and fades; one arc segment empties | | | "x2" (and "IDLE" for 4) |
| x5 (full) | the arc ring doubles (two 1.5 px strokes, 2 px apart) and stays double | | | "x5 MAX" |
| Melee hit (2) | the existing lunge toward the target | | a ring of radius `ring_base + ring_per × now` px, 2 px stroke, expands and fades in 240 ms; at `crack_at` four 6 px radial lines | the damage number |
| Charge (6, 7) | dash lines behind it along the run (the existing `charge`), a chevron "»" at the front | | the ring, then the token squashes (scaleY 0.6) over a 12 px ground line | "PRONE" or "SAVED" |
| Cleave (8) | the existing 300° arc | | each foe struck gets its own small ring | "CLEAVE x3" |
| Break (9) | rises 3 px, comes down | | a hexagon outline over it splits into three lines that fly apart 10 px; a bracket "[ ]" stays a round | "GUARD BROKEN", "EXPOSED" |
| Launch (10) | steps in 4 px and rises 4 px (the heave) | the target's token travels a parabola (`path` with a 12 px apex) along the `DisplaceResult.path`, three speed lines behind it | a landing ring; on a hazard the hazard's own flash; stopped short (15), a six-line starburst at `blockedAt` | "LAUNCHED 3", "WALL" |
| Coup as Execute (11) | | a vertical slash line 1.2 × the token's height | its HP bar flashes white once | "EXECUTE" |
| Wrecker / Breach (12, 13) | the existing smash | five 8 px line shards from the object's tile, rotating outward; a dust ring | each Exposed foe gets the bracket "[ ]" | "BREACH", "EXPOSED" |
| Push preview (14) | | a dashed arrow from the target to its landing tile; the landing tile outlined | a hazard tile outlined in HP red, a wall stop as a 10 px bar | "FIRE", "TRAP", "WALL", "2 TILES" |
| Class Lunge (17) | dashes the 1 or 2 tiles (no ease-in), two speed lines | | the ring | "LUNGE" |
| Riposte (17) | two crossed 8 px lines flash on its own token first | the strike | the ring | "RIPOSTE" |
| Class Finisher (17) | rises 4 px, comes down hard | | the ring at `ring_per × spent` with the crack lines | "FINISHER x5" |

## 5. Onboarding (the door's three)

1. **The action bar:** for a Breaker in a fight, Launch is always on the bar, beside the three finisher techniques.
   Greyed with its reason: no melee weapon or fists in hand: "Momentum needs a melee weapon or empty hands: swap (1 AP)."
   Under 2 Momentum: "Needs 2 Momentum (you have x1): land melee hits or Charge to build it." No foe next to you:
   "Launch a foe next to you: Charge or Lunge in first." (The order's `why` texts and the `res` refusal, data.)
2. **The tab line** (the class resource's new `how` field, shown under the Momentum row of the sheet's class section
   and as the meter's hover, replacing `MOMENTUM_HINT` typed in `physical/core.ts`): "Hit to build Momentum (the number
   on your token), Charge to build it fast, then spend it on a Finisher: Cleave a crowd, Break a guard, Launch a foe,
   Coup the hurt. Standing idle bleeds it."
3. **The first-fight hint:** I found no once-per-character hint system in `apps/web/src` (checked: `actionTip.ts`, the
   resources rows' `hint`, `missionView.ts toastFor`); the piece that exists is a log line from data. The class row
   gains `use {when: combat_start, if: {actor: self}, limit: {per: per_campaign, n: 1}, say: "{self} feels the weight
   in the hands: every hit builds Momentum, and a Finisher spends it."}` (op `use` with `say`, scope `per_campaign`).
   If the lead names a toast mechanism, the same text goes there instead.

## 6. Numbers (PROVISIONAL, data fields) and the line they sit on

`hit_cap` 3 a turn; `idle_loss` 1; `charge_gain` 2; Launch: `ap` 2, `need` 2, `launch_tiles` 3 (Demolisher 4), the
`launch` block 0.9 + 0.25 per Momentum beyond 2 of the melee profile; Execute +2 to hit, ×1.25 under 0.5 (Duelist 0.6);
Wrecker −1 AP and +1 Momentum (Demolisher 2); `breach_reach` 2 (Demolisher 3); `slam` 0.5 (P13); Hurl 4 tiles (P14);
show: `ring_base` 10, `ring_per` 4, `crack_at` 5.

**The line:** the Breaker's damage stays on the melee line (165, the gun ceiling 145); the perk steps sit on top of it
(the owner's ruling). Momentum 2.0 is meant to move **survival**, not peak damage: a Breaker's turn should more often
end in a Finisher, and its run should not cost it. **Measure:** `packages/engine/test/balance/survival-run.ts` gains
rows `breaker` and `solo_breaker` (melee, the Breaker's door), against the 0.29 baseline's melee rows (solo stage-1
clear 17 to 33%, guns 54%); target: the solo Breaker inside 40 to 55% without its damage per AP rising above the
heavy-melee figures already measured; `npm run try` scenarios: a Charge into a crowd then Cleave, a Launch onto fire, a
Breach then a squad shot; the golden tables are not re-recorded by any of this (no technique number changes).

## 7. Saves

Momentum lives in a fight; no saved state changes. Techniques granted by `stat_mod technique:<id>` are read live, so an
old Breaker has Cleave, Break, Coup and Launch at its next fight. P8's path is a new `c.paths.fighter`, empty; a
Breaker at Raw Power 5 or more is owed the pick on its next level-up card (as the sister drafts' forks). Proof:
`test/old-save.test.ts` with a level-8 Breaker fixture.

## 8. Needs a new primitive (general pieces; each the lead's to approve)

Reused: **P8** (one fork action for every door). The tank draft's P9 (`strike`) is not needed: every finisher here is
a technique that exists or a save-based order. New, three, numbered after the tank draft's P9 to P11:

1. **P12, a holder's stat on a resource's walking loss:** stat `step_loss:<resource>` added to `rules.momentum.step_loss`
   where `physical/rules.ts` reads it (floor 0). Uses: the run carries (5); later any door whose meter walks off.
2. **P13, `displaced` as a data trigger:** fires on the mover's side after a forced move, with predicate `stopped_by`
   (`wall`, `object`, `unit`, `hazard`; from `DisplaceResult.stoppedBy`) and `TargetSet.of: "stopper"` (the unit
   that stopped it). Uses: Into the Wall (15); Breaching Strike moves onto it and its per-perk code in
   `perks/skeleton.ts` (`slam`, `setSlam`, `_push`) goes: one collision rule instead of one perk's.
3. **P14, `object {do: "hurl"}`:** lift a loose object next to the holder (a kind with `loose: true`, data) and throw
   it at a tile within `tiles`: its `amount` to a unit there, the object breaks (its own `explodes` goes off). Uses:
   Hurl (16); later the Grenadier's Arm's per-perk throw (`perks/c.ts THROW_KG`) moves onto it.

No new trigger beyond P13's, no new resource, cost site or condition: Exposed, Prone and Stunned exist.

## 9. Tonight's build (every "yes", small commits, most felt first)

1. The counter on the token (1) and the impact ring that grows (2), with `rules.momentum.show` in data; the gain and
   loss moments of section 4. Proof: client test on the token view; fx test that the ring's radius reads `now`.
2. Every blow counts (3), Charge carries (6), Bowl Over (7). Proof: `npm run try` (a Charge then Cut: the meter reads
   1 + 2 closing + 2 charge + 1); a Cleave cannot give more than 3.
3. The four finishers: Cleave (8), Break (9), Coup as Execute (11) granted and ridden; Launch (10) as a `grant_action`
   with its `launch` block. Proof: each through the reducer (`sendDescriptor`); a Launch onto a fire tile.
4. Wrecker (12) and Breach (13). Proof: a crate smashed for 1 AP less, +1 Momentum, a foe 2 tiles away Exposed.
5. The push preview (14). Proof: the Shove card's preview names "FIRE" over a burning tile.
6. The moves drawn (17), the closing-in line moved to the effects event. Proof: fx tests per event.
7. Onboarding (section 5): the greyed Launch with its three reasons, the `how` line replacing `MOMENTUM_HINT`, the
   first-fight line. Proof: a level-3 Breaker's first fight shows the line once; a second fight does not.

Held: Idle bleeds (4) until P12 ships the run carries (5); 15, 16, 18 to 20 for their pieces. Every slice keeps the
left panel (the sheet, its tabs, Level up) and the mode's right panel; the fight screen is excepted as today.

## 10. Art

**Icons** (white-ink Wick mode, `art/briefs/ART-REQUESTS.md`; monoline placeholders until delivered): **Launch** (Wick
heaving a crate-sized shape over its head, knees bent), **Breach** (Wick's fist through a plank wall, splinters as
lines), **Wrecker** (Wick with a sledge on the shoulder beside a split crate), **Bowl Over** (Wick shoulder-first, mid
stride, a small figure tipping), **Execute** (Wick with both hands over its head on a long haft), **Into the Wall**
(Wick pushing with both palms, a wall line at the far side), **Hurl** (Wick mid-throw of a barrel), and the two paths:
**Demolisher** (Wick standing on rubble) and **Duelist** (Wick side-on in a guard, one hand forward). **Token marks:**
none painted; the counter, arcs and rings are SVG (section 4).

## 11. Questions for Leon

1. **The walking tax for everyone.** P12 frees only the Breaker's run; the measure says all melee dies walking.
   Recommended: Breaker only now, then re-measure before touching the general rule.
2. **Launch has no roll to hit** (a save instead, as a Shove). Recommended: keep it a save, so it is the reliable
   finisher and Cleave, Break and Coup are the rolled ones.
3. **A gun butt.** Should a Breaker with only a gun in hand build Momentum with a butt-stroke? Recommended: no; fists
   and any melee weapon are already neutral, and the gun has its own door.
4. **Hurl's small foes** (P14): vermin and minions only, or Soldiers too at Raw Power 7? Recommended: vermin and
   minions; a Soldier is Throw Down's.

## 12. Built in 0.29 (lane `wip/lane-0.29-momentum-2`), and what was not

Spec: rules 1.56, "the Momentum chain 2.0 (the Breaker)", items 4400 to 4409. Every rule is a row on
`data/classes.json fighter.gain` (held from rank I, read live: an old save's Breaker has them at its next fight).

| # | Item | State | Built from (exact names) |
|---|---|---|---|
| 1 | The counter | built | client: `techView.ts momentumLook` over `physView().momentum` {now, max}; `techniques.json rules.momentum.show.counter_min`; the token template's `data-momentum-chip` |
| 2 | Impact grows | built | fx `melee` + the next fx `momentum` of the same unit (`fx/breaker.ts noteBreaker`); `show.ring_base`, `ring_per`, `crack_at` |
| 3 | Every blow counts | **held** (measured, below) | would be: trigger `hit`, predicates `actor`, `melee`, `free_tech`, op `resource`, `limit` |
| 4 | Idle bleeds | held (ships with 5) | |
| 5 | The run carries | not tonight (P12) | |
| 6 | Charge carries | built (`charge_carries`) | trigger `hit`, predicate `mode` [charge], op `resource` |
| 7 | Bowl Over | built (`charge_carries`) | trigger `hit`, `mode`, `target_alive`, op `condition` prone (`via` raw_power). Prone has no save in its row: it always lands |
| 8 | Cleave | built (`breaker_finishers`) | stat `technique:cleave`; trigger `attack`, op `roll_mod` +2 |
| 9 | Break | built, Exposed only | stat `technique:break`; trigger `hit`, op `condition` exposed `skip_save` |
| 10 | Launch | built (`launch`) | `grant_action` (`res` momentum 2, `reach` tiles 1, side foe, `if` target_alive / target_not_tier [boss], `why`); nested `when: acted` ops: `deal` (amount `launch`, profile melee), `condition` off_balance (the Body save, `via` raw_power), `displace` push 3 `if target_has [off_balance]`, `displace` push 1 `if target_lacks [off_balance]`, `condition` prone `skip_save`, `resource` momentum `all` |
| 11 | Coup as Execute | built (`breaker_finishers`), ×1.2 | stat `technique:coup`; `roll_mod` (trigger `attack`) and `damage_mult` (trigger `dealing`), `mode` [coup], `target_hp_below` 0.5 |
| 12 | Wrecker | built, +1 Momentum (no AP cut: P15) | trigger `acted`, `action` [shoot_cover], op `resource` |
| 13 | Breach | built | trigger `acted`, `action` [shoot_cover], op `condition` exposed with `targets {of: tile, within 2, side foe, seen}` |
| 14 | Push preview | not built tonight (time) | `displace(..., {preview: true})` is there; no client piece yet |
| 15, 16 | Into the Wall, Hurl | not tonight (P13, P14) | |
| 17 | Moves drawn | built in part | `fx/breaker.ts`: Charge chevron, Cleave arc, Break hexagon, Coup slash (on the `technique` event), Launch heave and flight (on `shove`), the smash shards (`object`), the Exposed bracket (`cond`) |
| 18 to 20 | Demolisher, Duelist | not tonight (P8) | |

Changes to existing pieces (no new trigger, predicate, op, stat, cost site or resource; `docs/ENGINE-HOOKS.md` counts
unchanged):
- stat `technique:<id>` gives a technique of any group (it gave only an Answer); its meaning already said "comes with
  a perk". Only Riposte used it before.
- hooks `on_hit` and `damage_out` carry `tech` (the technique the blow is made with), as `attack_roll` did, so `mode`
  and `free_tech` read it on `hit` and `dealing`. No data row used `mode` or `free_tech` on those triggers before.
- `MOMENTUM_HINT` reads `techniques.json rules.momentum.texts.how`.
- The consolidation's finding 1 was wrong in one point: the cover smash fires `acted` as `shoot_cover` (game.ts
  `actedName`: the reducer's action name, not its cost site), so Wrecker and Breach never met the Break finisher. Breach
  takes the struck tile as its centre (`targets.of: tile`).

Onboarding: Launch is a class action, listed in the fight's CLASS tab whether or not it can be used, greyed with the
engine's own reason ("Needs 2 Momentum.", "{target} is too big to throw."); the meter's hover reads `texts.how`; one
`TIPS` row `momentum` reads `skills.json raw_power.door_line` the first time one of your characters with the meter has
the turn. The class tab's header line (the audit lane's `door_line` reader) is not in this lane.

Effects with no event to hang on (listed, not invented): Bowl Over's Prone and Launch's landing Prone (flag
conditions draw no `cond` event); the Momentum Launch spends (the item op `resource` and the `res` payment emit no
`momentum` event: the counter drops on the next render without its moment); Execute's "under half HP" (the client
would have to judge it: the slash plays on every Coup).

### Measured

The blade all in (`balance-contract.test.ts measure`, 6 fights a cell, % of the plain rifle; band 124 to 206):

| | L1 | L5 | L10 | L20 | mean |
|---|---|---|---|---|---|
| before (0.29 at 31e49beb) | 155 | 158 | 149 | 194 | 164 |
| with Every Blow Counts (+1 a technique hit, 3 a turn; also with 1 a turn) | 155 | 173 | 170 | 218 | 179 |
| as built (Every Blow Counts held) | 155 | 164 | 149 | 194 | 166 |

Execute alone moved nothing in this measure (the simulator's policy does not pick Coup under half HP). Every Blow
Counts is held: a Strike's own cost refunded by its hit makes every Strike free for the Breaker; it needs a fit (a
Strike exclusion, or a smaller Coup per Momentum for the Breaker) before it ships.

Survival (`survival-run.ts`, new cells `solo_breaker` and `breaker` (a Breaker and a gunner), the gear route, 16 seeds
SIM-1 to SIM-16, at most 4 stages; "end" is stage + depth / 16):

| cell | stage 1 cleared | mean stages cleared | mean end | errors |
|---|---|---|---|---|
| solo_breaker, before | 6 / 16 | 0.56 | 2.03 | 0 |
| solo_breaker, as built | 6 / 16 | 0.56 | 2.09 | 0 |
| breaker + gunner, before | 0 / 16 | 0 | 1.43 | 0 |
| breaker + gunner, as built | 0 / 16 | 0 | 1.43 | 0 |

The class comes at level 3 (stage 1's Boss), so stage 1 cannot move; past it the solo Breaker goes a little further.
The duo cell loses stage 1 on every seed before and after (a simulator matter of that pairing, not of this lane: the
two are the same build and policy as `solo_melee` and `solo_gunner`); it is listed, not fitted. The draft's target
(the solo Breaker inside 40 to 55% of stage-1 clears) needs the run carries (P12) and the walking tax question (11.1).

Frames (a real Survival fight, level 1, the Wrecking Ball archetype: Strength 7, Raw Power 7, the camp's Ork machete,
normal pace): `momentum-01` the fight's start with the MOMENTUM tip (the door line), `momentum-02` the token's "x1"
chip, `momentum-03` to `07` a Cut that kills (the swing, "−70", then the counter's arc segments and "x2"),
`momentum-09` the action column. At level 1 the character has no class yet: Launch and the four finishers are the
Breaker's, from level 3 (their descriptor through the reducer: `old-save.test.ts`, the Momentum chain block).
