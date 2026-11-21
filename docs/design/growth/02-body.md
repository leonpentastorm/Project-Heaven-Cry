# The doors of Body: Guard, Momentum, Pressure (0.34 rebalance, design draft 02, third draft)

Drafter's file for the lead. **Nothing here is built.** Pass 3 (ruling F): **every number of this file lives in `tools/balance/bible/body.json`**, and every shared number there is an `@` reference to `scale.json` or `pacing.json`. This file explains the design and names the JSON keys; it types no number the JSON does not hold. Every table of computed readings (plain hits, full cash-outs, the largest legal turn at level 20, one Slam on one foe or on a ring) is printed by the checker, never copied here:

```
export PYTHONUTF8=1
python tools/balance/check.py                  # every check; body.json's: (a) DIGITS, (c) LADDERS, (f) SOLO
python tools/balance/check.py --tables doors   # each door's ladder and its cash-outs at levels 1, 10 and 20
python tools/balance/check.py --tables scale   # the shared numbers (factor, columns, profiles, HP, plate, grades, Margins)
```

Above this file stand Leon's rulings and the charter (`../proposals/2026-11-21-the-curve.md` sections 10 to 18; the Momentum pattern is section 16) and the lead's rulings `00-rulings.md` A to F (F wins). Facts about today carry `file:line`, read in `E:/phc-wt/rel030` (`release/0.34-final`) on 21 Nov 2026. Every proposed number is **PROVISIONAL**.

## 0. Shared rules this file uses

1. **Reach and Bite** are on the alpha's ladder (`body.json attributes.<attr>.ladders.<alpha>.points.<n>.reach` and `.bite`), read by **S2, the door ladder**. **A door's top Reach needs its family** (ruling 13): the step at 7 needs the beta at 4, the step at 10 the beta at 7 and the gamma at 4 (each step's `needs`); short of that the character holds the step below. Check (c) enforces it.
2. **The cash-out sum** is `scale.cash_out` (`cash(n)` in a formula), read by **S3, the cash-out source**. Each cash-out's `formula` is its factor in plain hits of the door's `plain`: a Finisher and a damage Take pay `1 + bite * cash(n)`; Slam pays a plain blow plus its plates (ruling 34, 1(c)); a count cash-out (Cleave's foes, Break's and Pin Down's save) reads `floor(cash(n))`. Every Body cash-out **spends all** of its counter: the choice is *when*.
3. **Margins** (`scale.margins`) add to the cash-out factor where a cash-out's `rolls` is true. Slam, Retort and Cleave's sweep have none.
4. **The Push at skill 8** (`door.push`, ruling 17): once a turn the door's Reach is +1 for one action (**S5, `res_max:<resource>`**, written by a one-action condition), and the price is a condition on you.
5. **Marks on a door**: `door.marks.rate` is `@pacing.door_marks.<door>` (05 owns the rate and computes the thresholds); this file names the unit and the four gifts. Carried by **S4, keyed Marks**; counted against worthy foes (**S7, `growthWorth`**).
6. **Every beta point counts from the first** (ruling 20): each beta's `feed` is `1 + feed_flat * B + feed * A_alpha * B`, one key name, `feed_flat` (critic-consistency-2 1.12).
7. **Costs** (`scale.costs.rules`): AP is the clock; plates, chain steps and pips are counts. No Body door has an MP or core cost.
8. **One pair to a hit** (ruling 31): a shield blow and a plate read Endurance and Durability, a Finisher Strength and Raw Power, a Take Agility and Dexterity.
9. **Solo** (ruling 32): every move that names an ally carries `needs_ally` and a `solo` line; check (f) fails one without.

## 1. Endurance: the door of Guard (Durability; Pain Threshold; Sensory; the Bulwark, id `defender`)

### 1(a) Today

Plates (`res.guard`): pool `min(rules.guard.max, floor(Durability x per_durability))` (`character.ts:1899 guardPool`; `techniques.json:28-43`); the Bulwark's pool by rank (`classes.json:71 resource.max_by_rank`; `ladder.ts:18 guard_pool`). A plate's soak is `guardSoak` (`physical/core.ts:121`), spent after shields (`physical/guard.ts:91-97`), keeping one back (`keep_back`); Pressure on you strips a plate a pip (`pressure_per_point`). The Guard technique grows with Durability (`physical/core.ts:134 guardGain`), so Brace (`classes.json:4364`) is dominated. Slam (`skills.json:189-215`) does **no damage** and opens at Durability 5. Pain Threshold's feed is `feed x Durability x PT` (`skills.json:463`), zero without Durability; its HP is `hp_per_level` (`:465`, read at `character.ts:798`). Endurance's card is typed in code (`character.ts:770`, `:798`, `:801`).

### 1(b) Durability's ladder

**Reach** is the plates you can hold; **Bite** is how hard a thrown plate lands, in plates' soaks (`scale.plate`, read before Pain Threshold's feed). Values: `ladders.durability.points` 1, 4, 7, 10 (Reach) and 1, 6, 9 (Bite). Every point besides: Durability's card (`ladders.durability.card`, the `guard` and `melee` profiles).

The Guard technique stops growing with Durability: one plate a use (more with shields; `door.builds`), so filling a wall is an AP's work and Brace is the Bulwark's way to fill at once. *Reason a player sees: a tank who put ten points into the wall holds half again what a 7 holds, and throws it all back.* Bite at 9 is set so a full Slam on **one** foe is five digits at level 20 in Relic (check (a) prints the ring; `--tables doors` prints both readings).

### 1(c) The cash-out: Slam, from Durability 1 (ruling 34)

Slam (2 AP, spends all your plates, at least 1, no roll): **every foe beside you takes a plain shield blow and the shove; the plates' weight (one plate's soak x Bite x the cash-out sum) lands on the foe you face.** Two readings of the one move, so the checker counts both: `cashouts.slam` (one foe) and `cashouts.slam_ring` (every foe beside you, `most_foes`, ruling 29's total). From Durability 5 the shove pushes and asks a Body save or Off Balance, as today (Stand Fast and Drive keep their forms). *Reason: the wall swings its shield as it throws its guard, so a Slam is worth pressing from the first point; on a crowd it shoves everyone and still falls on one.* Slam's gate in data moves from Durability 5 to 1 (`skills.json:203`); the shove keeps the gate of 5.

The other spends are `door.spends`: soak, Challenge, Interpose, Shield Bash, Retort.

### 1(d) The Push at Durability 8: Overbrace

Once a turn a Slam counts one plate more than you hold; **you are Bleeding** (ruling 34; `conditions.json` bleeding on yourself with `skip_save`). Endurance does not resist it, so the wall pays as every door pays (critic-player-2 4). Guard's Mark III makes it free once a fight.

### 1(e) Marks on Guard

The unit (`door.marks.unit`): a plate spent **or soaking part of a worthy foe's blow** (ruling 18), so a wall fills its bar by walling. Gifts: `door.marks.gifts` (I: a start plate, stacking with Brace's; II: Pressure no longer strips plates; the middle: the Guard technique gives one more; III: Overbrace's Bleeding waived once a fight).

### 1(f) Tags for mixed characters

`door.keeps_tags` (each an answer to **S6, `wear:<resource>`** on the move's row): a soaking plate and the Guard technique keep the chain; Challenge keeps a Pressed foe's Pressure; Slide, Head Down and Duck and Roll keep your plates.

### 1(g) Pain Threshold and Sensory

**Pain Threshold** (`ladders.pain_threshold`): every point is `@scale.hp.pt_pct` of max HP (ruling A5, in place of HP a level), today's elemental resistance (under `combat.elemental_taken_cap`, kept by `scale.caps`), and the plate feed (`feed`). The feed's per-pair number halves because the plate already grows with both cards and the armour's grade; the flat term makes the first point count on any character. Perk steps at 3, 5, 7, 9; 4 and 7 open Durability's Reach; at 10, Walking Wounded and **a Slam keeps 1 plate** (critic-player-2 6: the full family cashes out more often at the same top).

**Sensory** (`ladders.sensory`): Warn and the voice. The card reads "+1 tile sensed at 3, 6 and 9" from `card.numbers.sense_every`, which leaves `combat.ts:1212` (critic-player-2 13). Point 2: a Warn that lands gives you a plate; at 6 two (critic-player 8: the gamma's second point is felt in a fight). **Solo** (critic-player-2 1, ruling 32): Warn is cast on yourself at the step below your own, at least step 1 (`aim` self-or-ally, a value that exists: Name It, `calls.json:174`), so the plate fires alone too.

### 1(h) Endurance's card

`attributes.endurance.card`: base HP a point (`@scale.hp.per_end`), +10% plates, Slams and shield blows (`@scale.cards.attr_slope`), injuries ignored (today's number, a data reference). The numbers leave code (`character.ts:770`, `:798`, `:801`) for `attributes.json endurance.derived` (01's Built from).

### 1(i) The Bulwark

`attributes.endurance.class`. **What only it has:** it is paid for being hit. **Hold Their Eyes** (rank I, new): a blow from a Taunted foe gives a plate after it is soaked, once a round from each foe (op `resource` on `damaged`, `actor_has: [taunted]`, `by_hit`, `limit per_round each target`: all exist). **Brace** fills to your Reach in one action (+Braced, a start plate). Retort becomes a one-plate Slam on the striker (ruling 34's plain blow plus one plate's weight, for no AP); Reforge refills to half your Reach when you are at half or less. The rank-by-rank pool (`max_by_rank`) goes to Durability's Reach (ruling 16). Stand Behind Me, Interpose and Cover Them carry their `solo` lines.

## 2. Strength: the door of Momentum (Raw Power; Guts; Intimidation; the Breaker, id `fighter`)

This completes the curve's section 16; its ladder, Bite, Push and Marks are kept.

### 2(a) Today

The chain (`res.momentum`): one top for everyone and a bigger one for a Breaker (`techniques.json:8-9 max, fighter_max`); a fight starts at `start` (`physical/core.ts:215 momentumStart`, plus Wind-up, `classes.json:394`). Builds, spends and wears as `door.builds`, `.spends`, `.wears` (`physical/rules.ts:62-75`; Guts divides the wear, `physical/core.ts:226`). Finishers: Coup (`techniques.json:1060`; `physical/melee/finishers.ts:49`), Cleave (`:1102`; `:73`), Break (`:1146`; `:101-103`), Run Through (`:1188`; `:151`), Throw Down (`:1235`; `:236`): five copies of a per-step rule. Launch (`classes.json:718`) has a base and a per of its own. **Reach and Bite never move** with Raw Power.

### 2(b) Raw Power's ladder

`ladders.raw_power.points` (the curve's row, with ruling 13's gates). **Reach** is the chain's top; **Bite** a damage Finisher's bonus for each step spent (Coup, Throw Down, Launch; Run Through bites `cashouts.run_through.bite_less` less, because it pins as well). The Breaker's bigger chain goes to Raw Power (ruling 16). Earthbreaker's point is kept; 07 restates the perk.

### 2(c) The cash-out: the Finisher

`door.cashouts`: Coup, Throw Down (from 5), Run Through, **Cleave** (one roll against the first foe, no Margins: a sweep; it strikes `floor(cash(n))` more foes beside you, up to `most_foes`, each a full plain blow) and **Break** (a plain blow, the save harder by `floor(cash(n))`, or Stunned; a Boss is Dazed). **Launch** (the Breaker's) pays a Coup's payoff, then the throw; its `base` and `per` retire (`scale.factor.restated_elsewhere` points here). *Reason: the mixed character cashes out twice as often for less; the specialist waits about four turns for its top and is paid for the wait.*

### 2(d) The Push at Raw Power 8: Overswing

One step more than you hold; you are Off Balance until your next turn (`conditions.json off_balance` on yourself, `skip_save`).

### 2(e) Marks on Momentum

`door.marks`: the unit is a chain step spent by a Finisher (Launch included) on a worthy foe. Gifts kept from the curve: I a fight starts one step up (**stacks** with Wind-up: `momentumStart` adds every answer); II a hit taken costs a step only once a round; the middle a Charge that hits builds one more; III Overswing free once a fight.

### 2(f) Tags

`door.keeps_tags`: Fire and Move's and Run and Gun's free steps, Shadow's Vault and Fade, and the step of a Warn or a Cue keep the chain; a Finisher or a Grapple on a Pressed foe keeps its Pressure.

### 2(g) Guts and Intimidation

**Guts** (`ladders.guts`): the feed (`feed_flat`, `feed`), +1 on Body saves and now on saves against Fear (`save_mod` with `context`); 4 and 7 open Raw Power's Reach; at 10, Nothing Left to Fear and **a Finisher keeps 1 step** (critic-player-2 6). A per-point line is felt by its sum on the sheet (critic-player-2 14).

**Intimidation** (`ladders.intimidation`): Threaten and the voice; at 2 a landed Threaten gives you a chain step, at 6 two. Threaten aims at a foe, so it works alone.

### 2(h) Strength's card

`attributes.strength.card`: +10% on the melee rows that scale with Strength and on the `physical` profile (`@scale.cards.attr_slope`), the carry from data. `factors.melee` and `MELEE_FACTOR` fold into the profile's `k` (scale.cards.dropped). Bows and thrown weapons read Agility and Dexterity.

### 2(i) The Breaker

`attributes.strength.class`. **What only it has:** the room is its weapon (Wrecker, Breach, Into the Wall, Hurl) and Launch. **Four Ways to Finish** keeps Cleave, Break and Coup with any melee weapon, Cleave's to-hit and Break's Exposed; its **Execute** keeps the to-hit on a foe under half HP and, **in place of today's damage multiplier** (`classes.json:687-698`), leaves a living foe Off Balance with no save (critic-consistency-2 4.2: a thing only the class uses, not a share of the sum; its to-hit is a `to_hit` term the checker counts). Measured Blow at rank III gives back half the steps a killing Finisher spent, once a fight.

## 3. Agility: the door of Pressure (Dexterity; Athletics; Reaction Speed; the Skirmisher, id `marksman`)

### 3(a) Today

Pips on a target (`u.pressure`; `techniques.json:54-94`), capped by tier in code (`physical/pressure.ts:15-18 pressureCap`, registered with `setResMax` at `:98`); **Dexterity never moves the cap**. Builds and wears as `door.builds`, `.wears` (`physical/rules.ts:109-120`). A Take needs a Pressed target and spends `take_cost` (`:73`); Dead Centre is a flat AP cost (`techniques.json:2384-2388`); a Take's payoff never grows with the pips. Dexterity's per-point critical sits under `CRIT_MAX` (`character.ts:853`). Athletics' Defense starts at point 2 (`skills.json:1561 defense_from`, `character.ts:824`).

### 3(b) Dexterity's ladder

`ladders.dexterity.points`. **Reach** is the most Pressure your hits lay on one target. **A target's cap is the best Reach anyone laid on it this fight, less its tier row's `pressure_off`** (ruling 19; the offsets are `world.json tiers`, data, never a tier name in code); a player still stops at `door.cap.player_max`. At 10 Broken lasts through a foe's turn. **Bite** is a damage Take's bonus for each pip spent; it reaches the top Bite at 9 so that a full Take with the common service rifle (`cashouts.dead_centre_rifle`) is five digits at level 20 in Relic as well as with the long rifle (`plain`). *Reason: a shooter learns to make a foe flinch, then to pin it, then to break it; the pips come from the whole squad, and a Take spends at most five where a Finisher spends seven.* Dexterity's card: `numbers.crit` becomes `damage` (the critical is gone, A7).

### 3(c) The cash-out: the Take

`door.cashouts`: **a Take spends all the target's Pressure** (at least 2), whoever laid it, and costs what a plain shot of that gun costs (`ap: {base: "weapon", add: 0}` on the six Take rows; 19 techniques read the weapon's AP this way today). Dead Centre and Last Round pay `1 + bite * cash(n)`; Pin Down's save is harder by `floor(cash(n))`; Flush Out (from 5) is a Take that drives the foe from cover. *Reason: a Take is a shot; at a flat AP a slow gun paid the same as everyone and a fast one was worse than shooting.*

### 3(d) The Push at Dexterity 8: Overpress

One pip more than the foe holds (above its cap); the price is a one-round condition, **Overpressed**: you are Seen (`always_seen`) and your gun runs hot (`heat_limit`). Both stats exist.

### 3(e) Marks on Pressure

`door.marks`: the unit is a pip spent by your Takes and Flush Outs on worthy foes. Gifts: I your first Dexterity hit a fight lays a pip more; II Pressure you laid falls at most one a turn; the middle Suppress lays one more; III Overpress free once a fight.

### 3(f) Tags

`door.keeps_tags`: Slide keeps the chain and your plates; the free steps keep the chain; a Finisher, a Grapple, a Challenge, a landed Threaten, Shadow's Tag and a Judged foe keep a foe's Pressure.

### 3(g) Athletics and Reaction Speed

**Athletics** (`ladders.athletics`): the feed, and +1 Defense **from point 1** (`numbers.defense_from`, ruling 20); 4 and 7 open Dexterity's Reach; at 10, Never There and **a Take leaves 1 pip on the foe** (critic-player-2 6).

**Reaction Speed** (`ladders.reaction_speed`): Cue, Initiative and the voice; at 2 a Cued reaction shot lays a pip more, at 6 two (under the cap). **Solo**: Cue is cast on yourself at the step below your own, at least step 1 (critic-player-2 1).

### 3(h) Agility's card

`attributes.agility.card`: +10% on Dexterity weapons through the row's own pair (no hidden pin), movement and Initiative from data (they leave `character.ts:817`, `:821`).

### 3(i) The Skirmisher

`attributes.agility.class`. **What only it has:** two reactions and fire on the move. Break Them's save bonus tops out where an Elite's cap now is; **Hot Loads** replaces Special Ammo (which Items 2.0's special rounds by calibre and Load Special, `techniques.json:2233`, made redundant); **Run and Gun** at rank III gives a full AP of free movement after an attack and a pip more on the next hit (it overlapped Fire and Move). Converging Fire carries its `solo` line.

## 4. Weapon drill

**The rate and the thresholds are pacing's** (`body.json drill.rate` is `@pacing.tracks.drill`; ruling 22); this file owns what a Mark gives (`drill.gifts`): Mark I the weapon's signature technique; Mark II a pick and +1 to hit with this weapon (a `to_hit` term on each Body door, group `drill:mark_ii`); Mark III a pick and **a natural 19 lands as a natural 20 with this weapon** (two Margins more), in place of the second draft's damage share: a thing a player feels that does not grow the one sum (critic-consistency-2 4.2's reasoning, applied to drill). A pick never offers a technique you know. The 80% counts techniques against all 66 (ruling 23; pacing's collection).

## 5. How a player spends

The four spend plans are pacing's (`pacing.spend_plans`), walked by check (d) on 38 Skill and 20 Attribute points (ruling 11) with the swap at levels 4, 5, 14 and 15 (ruling 12); check (d) fails a level with points and nothing felt. Every point of the nine Body ladders carries a `felt` line (check (c)). The prose spend tables of the second draft are retired: they quoted numbers from the scale and the clock that this file does not own.

What the plans must show, by design: a Bulwark takes Durability to 10 with Pain Threshold 7 and Sensory 4, and every gamma point it buys has a fight effect alone (Sensory 2 and 6); a two-door wall that hits back (Guard and Momentum) holds Momentum's top and Guard one step below, because both tops need four more points than 38 give (ruling 13).

## Critics' findings (pass 2, naming this file)

| Finding | Status | How |
| --- | --- | --- |
| consistency-2 1.11 (drill hours) | FIXED | no hours quoted; `drill.rate` is `@pacing.tracks.drill` |
| consistency-2 1.12 (`own` vs `feed_flat`) | FIXED | `feed_flat` on all three betas |
| consistency-2 1.5 (door Mark thresholds) | FIXED for 02 | `marks.rate` is `@pacing.door_marks.<door>`; no thresholds typed |
| consistency-2 2 (Launch `base` and `per`) | FIXED | retired; `scale.factor.restated_elsewhere` points to `body.attributes.strength.class` |
| consistency-2 4.2 (the Coup with Four Ways, six digits) | FIXED | Execute's multiplier becomes Off Balance with no save; its to-hit is counted; Iron Grip's tier II is a plain-hit term, not a Coup term (07 section 0; the checker's largest legal turn) |
| consistency-2 5.3, 5.4 (a pool's max as a source) | FIXED | it is S5; the extension is dropped from Needs |
| consistency-2 note (level-1 cash-outs of three digits) | OPEN for the lead | check (a) tests level-1 plain hits only (`scale.digits.plain_l1`); the lead's wording decides whether a level-1 cash-out may show three |
| player-2 1 (solo gammas) | FIXED for Sensory, Reaction Speed | Warn and Cue on yourself at the step below; `needs_ally` and `solo` on both |
| player-2 4 (Overbrace has no price) | FIXED | Bleeding on yourself (ruling 34) |
| player-2 5 (Slam at 1 to 4 under par) | FIXED | the plain blow inside every Slam (ruling 34) |
| player-2 6 (the specialist's last family points) | FIXED | each beta's 10 keeps a unit after the cash-out |
| player-2 10 (Reach lost to C16 and B13) | NOT HERE | migration has one owner (`@pacing.migration`, ruling 39) |
| player-2 11 (the one-shield wall's empty hours) | NOT HERE | pacing's calendar (check (e)) |
| player-2 13 (Sensory's card) | FIXED | `sense_every` on the card |
| player-2 14 (a +1 a point felt) | FIXED in the `felt` lines | each reads the sum on the sheet |
| player-2 16 (Strength and shield blows) | FIXED | the spend table is retired; Strength's card names only melee rows on Strength and `physical` |

## Built from

| Rule | The existing piece and data key (file) | What must change |
| --- | --- | --- |
| Guard Reach | `guardPool` (`character.ts:1899`) over `rules.guard.max, per_durability`; `classes.json defender.resource.max_by_rank` (`:71`); `ladder.ts:18 guard_pool` | the pool reads S2; `max_by_rank` and `per_durability` retired |
| A plate's soak | `guardSoak` (`physical/core.ts:121`), the `guard` profile (`scale.plate`) | scale's; this file adds the feed's numbers |
| The beta feeds | `doorFeed` (`effects/feed.ts:37`), `skills.json` `per_point.numbers.feed` | `feed_flat` beside `feed` (an extension, Needs) |
| The Guard technique, one plate a use | `guardGain` (`physical/core.ts:134`), `rules.guard.gain_per_point`; `skills.json` durability `guard_per_point` | `gain_per_point` 0; the per-point rows retired |
| Slam: plain blow on each foe beside you, the plates on the one you face, from Durability 1 | Slam's `grant_action` (`skills.json:189-215`); op `deal` with an `amounts` block (the `melee` profile for the blow, the `guard` profile for the plates); ops `condition`, `displace` | the action's gate 1, the shove's 5; `res.guard` "all"; two deal parts |
| Overbrace, Overswing, Overpress | predicate `toggle`; S5; `conditions.json` bleeding, off_balance (op `condition`, `skip_save`); a condition row Overpressed on the stats `always_seen`, `heat_limit` | data |
| Brace, Reforge read your Reach | Brace (`classes.json:4364`), Reforge (`:232`), op `resource`; S5 read as a number source (`self_res {at: "max"}` exists) | data |
| Hold Their Eyes | op `resource` on `damaged`, `actor_has`, `by_hit`, `limit per_round each target` | a row on `classes.json defender` |
| Retort as a one-plate Slam | `retort` (`classes.json:104`) | Slam's amount block with one unit |
| The chain's Reach | `rules.momentum.max`, `fighter_max` (`techniques.json:8-9`), `ensureMomentum` (`physical/core.ts:161`) | S2; `fighter_max` and the class max retired |
| Bite on Finishers | `numbers.per_momentum_pct` on the Finisher rows, read in `finishers.ts:49, :151, :236` | reads S2's Bite; the payoff reads S3 |
| Cleave's and Break's counts | `finishers.ts:73, :101-103` | `floor(cash(n))`; Cleave's Margins off on the extra foes |
| Execute | `breaker_finishers` (`classes.json:627`), its `damage_mult` row (`:687-698`) | that row becomes op `condition` off_balance, `skip_save` |
| Measured Blow | `classes.json:4281`, op `resource` on `kill` | its value reads the steps spent (`event:`) |
| Pressure Reach and the tier offsets | `pressureCap` (`physical/pressure.ts:15`, `setResMax` at `:98`), `Unit.pressBy`; `rules.pressure.elite_max, boss_max` | the cap reads the best Reach in `pressBy` less the tier row's `pressure_off`; the two maxima retired |
| Takes: all, at the gun's AP | `take_cost` (`techniques.json:73`); the Take rows' `ap`; `base: "weapon"` | `take_cost` "all, at least 2"; six `ap` blocks |
| Athletics from 1 | `skills.json:1561 defense_from`, `athDefense` (`character.ts:824`) | `defense_from` 1 |
| Sensory's card | `combat.ts:1212` `1 + floor(sensory / 3)` | the 3 from `sense_every` |
| Warn and Cue alone | `calls.json:300, :216` `aim`; `calls/core.ts:97` refuses self | `aim: self-or-ally` (exists: `calls.json:174`) at the step below |
| Gamma door effects | the Calls' rows (`calls.json:212, :296, :335`), op `resource` on `acted` | data |
| Guts against Fear | op `save_mod` with `context` | a row |
| Hot Loads, Run and Gun, Break Them | `classes.json:4087, :1455, :1282`; `load_special` (`techniques.json:2233`), `cost_mod`, `resource` | data |
| Door Marks and gifts | the drill bar (`physical/data.ts:118-147`); `momentum_start`, `combat_start` `resource` ops | S4 keyed `door:<id>` |
| Drill gifts | `rules.drill` (`techniques.json:99-117`) | `mark_hit`; Mark III's natural 19 (a `roll_mod`-style crit range: see Needs) |
| Keeps tags | `guardUp` (`physical/rules.ts:62-75`), `pressureFilter` (`links.ts:181`), `DECAY` (`physical/rules.ts:116`) | S6 answered on the moves' rows |

## Needs a new primitive (critic-consistency-2's merged names)

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S2. The door ladder** | `ladderAt` (`figments.ts:45`) generalised to any door row, with `needs` | only Figments read a by-points table |
| **S3. The cash-out source** | `cash:<resource>` in `SOURCE_SPACES` (`effects/triggers.ts:373`) | no source reads the units an action spent |
| **S4. Keyed Marks** | the drill bar keyed `door:<id>` | the bar is weapon-only and kill-only |
| **S5. `res_max:<resource>`** | `ties_max:` and `setResMax` generalised; readable as a number source | caps are typed per door |
| **S6. `wear:<resource>`** | one stat family at the wear sites, answered by `stat_mod` with `context` | the exceptions are typed per site |
| **S7. `growthWorth`** | `growthHeld` as a factor | it is yes or no |
| Extension: `feed_flat` | one key read by `doorFeed` | ruling 20 for all nine betas |
| For the lead: **a natural-20 range** | one stat (`nat20_from`, default 20) read where a roll's natural 20 is decided, set by drill Mark III with the weapon | no existing piece widens the natural 20; if the lead refuses it, Mark III falls back to "+1 to hit more with this weapon" (a `to_hit` term) |

S16 (`injure`) is no longer asked: Overbrace's price is Bleeding, which exists.

## What re-records

| Guard | What moves, and why |
| --- | --- |
| The damage tables (`test/golden-damage*.test.ts`, `test/golden/*.json`) | every Finisher (Bite, the sum), Launch, Slam's blow and plates, Retort, the Takes' payoffs and AP, the plate's feed, Execute without its multiplier |
| The costs tables (`golden-costs*`) | Takes at the gun's AP; Rout for the Skirmisher; Slam "all" from Durability 1; the Guard technique; `take_cost` |
| The rules tables (`golden-rules`, `rules-enemies`) | the three Reaches with the family rule; Pressure caps by Reach and `pressure_off`; Break's save; Cleave's count; the three Pushes |
| The item-ops table (`golden-itemops`) | Hold Their Eyes, Retort, Reforge, Measured Blow, Execute, Break Them, Hot Loads, Run and Gun, the Call rows, the Mark gifts, the beta-10 keeps |
| The conditions table | Bleeding and Off Balance on self, Overpressed |
| The replay guard (`test/replay-hash.test.ts`) | every seeded game: plates, chain, Pressure, AP |
| Old saves (`test/old-save.test.ts`) | pacing's migration (`@pacing.migration`): held plates clamped to the new Reach in a saved fight; ranks kept |
| Ladder and screen tests (`ladder.ts` rows, `protodata.json`) | the three alphas' rows, the Bulwark's pool row, Athletics' first point, the betas' feed lines, Sensory's card |
| The Survival measures (`test/balance/survival-run.ts`) | everything; read, not held to a line |
| The lint baselines | shrink: `guardPool`'s `min()`, `fighter_max`, the five Finisher copies, Pressure's tier switch leave code |
