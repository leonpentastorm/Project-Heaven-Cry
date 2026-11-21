# The doors of Body: Guard, Momentum, Pressure (0.34 rebalance, design draft 02)

Drafter's file for the lead. **Nothing here is built.** Written to `docs/design/proposals/2026-11-21-the-curve.md` (the six laws, section 16's pattern, the debate rounds and the charter, section 18) and to the checked maps of 21 Nov. Facts about today carry `file:line` and were read in `E:/phc-wt/rel030` on 21 Nov 2026 (`release/0.34-final`; `rules.json` line numbers are after the ceilings deletion of rules 1.94, so they differ from the maps). Every proposed number is **PROVISIONAL** and carries a reason a player would recognise. Numbers are on the charter's scale: a level column of about x1.214 a level (x5.7 at level 10, x40 at level 20, the scale drafter's to verify), a specialist's plain two-handed blow about 40 at level 1, about 370 at level 10 and about 4,000 at level 20.

## 0. Shared rules this file uses (once, for all three doors)

These are the charter's laws written down in the form the three doors need. The other door drafters need the same pieces; the lead consolidates them (table "Needs a new primitive").

1. **Reach and Bite on the door row.** Each door's rules row (`techniques.json rules.guard`, `rules.momentum`, `rules.pressure`) gets a `ladder`: rows `{points, reach}` and `{points, bite}` by the door skill's points. One reader gives a unit its Reach and Bite (today Figments alone have such a ladder: `figments.ts:45 ladderAt`).
2. **The cash-out sum.** A cash-out that spends `n` units is paid on `S(n) = 1 + 1.2 + 1.44 + ... = (1.2^n - 1) / 0.2` units, not `n`: S(2) 2.2, S(3) 3.64, S(4) 5.37, S(5) 7.44, S(6) 9.93, S(7) 12.92, S(8) 16.5. A **damage** payoff is `x(1 + Bite x S(n))`; a **count** payoff (foes struck, a save made harder, tiles, rounds) is `S(n)` rounded down (2, 3, 5, 7, 9, 12, 16). Every Body cash-out **spends all** of its counter, as Finishers do today (`physical/core.ts spendMomentum`): the player's choice is *when*, never a slider. That keeps one rule and needs no new pick.
3. **The Push at skill 8** is one more unit counted into a cash-out than you hold (`S(n+1)`), switched on for that action (the item-op predicate `toggle` exists), with its price landing on you.
4. **Marks on a door** count the units you spend in that door's cash-outs against **worthy foes** (within two levels of you; the gap is `enemies.json:199 levels.gap`). One threshold set for the three Body doors, PROVISIONAL: **Mark I 60, Mark II 380, the middle milestone 600, Mark III 820** units. Reason: a specialist spends about 30 units an hour early and about 36 late (two cash-outs a fight of 3 to 5 units, five fights an hour), which lands I at about hour 2, II at about hour 11, the middle at about hour 17 and III at about hour 23, as the charter asks; a mixed character spends about half that in each door and reaches Mark I at about hour 4 and Mark II at about hour 22, so the specialist fills one bar faster and the mixed one fills two.
5. **What a cost is.** AP is the clock and never scales (charter). Body costs are AP and the door's own counter; the counter's worth grows with the level column (a plate soaks a level's worth of HP, a step of Momentum is a share of a level's blow, a pip is a share of a level's shot), so spending one is the same choice at level 1, 10 and 20. Body doors have no MP and no core cost; none is proposed.

## 1. Endurance: the door of Guard (Durability; Pain Threshold; Sensory; the Bulwark, id `defender`)

### 1(a) Today

**The counter.** Plates (`res.guard`). Pool: `min(rules.guard.max 4, Durability x per_durability 1)` (`character.ts:1899 guardPool`; numbers at `techniques.json:28-43`). The Bulwark's own pool replaces it: 5 / 6 / 7 at ranks I / II / III whatever its Durability (`classes.json:71 resource.max_by_rank`). Pain Threshold's beta line and the ladder read the larger of the two (`ladder.ts:20 guard_pool`).

**A plate's worth.** It soaks `round(soak 6 x scale(level) x the plate-soak feed)` HP of a hit (`physical/core.ts:121 guardSoak`), after every shield (`physical/guard.ts` the `damage_in` listener, `shield` phase). One plate is kept back for a reaction unless the hit would drop you (`keep_back 1`). Pressure laid on you comes off plates first, one plate a pip (`melee/links.ts:181-188`, `pressure_per_point 1`). While you hold a plate that soaked part of a hit, the hit costs no Momentum (`physical/rules.ts:70-75`).

**What builds it.** The Guard technique (a Link, 1 AP, `techniques.json:890`): `1 + (Durability - 1)` plates, +1 with a shield, x2 with a shield in each hand (`physical/core.ts:134-140 guardGain`); so from Durability 4 one use fills the pool. Brace (the Bulwark's, 2 AP, `classes.json:4364`): plates equal to Durability (`1+mod(durability)`), Braced +2 Defense until you move, 1 plate at the fight's start. Drive (fork) gives a plate a foe floored by Slam. Siege Engine (an Achieved perk) gives a plate a Shove that moves its target.

**What spends it.** Soaking (passive). Challenge (`skills.json:48` unlock 1, effect 1): Durability 2, 1 AP and 1 plate, every foe you see within 2 tiles makes a Heart save or is Taunted. Slam (effect 2): Durability 5, 2 AP and 2 plates, every foe next to you pushed 1 tile and saves (Body) or is Off Balance; **no damage**. Interpose (`techniques.json:2953`, from Durability 3): reaction and 1 plate, take an adjacent ally's hit. Shield Bash (`:2826`): 1 Guard in place of 1 Momentum. Retort, Shrug It Off (the Bulwark's rank II) spend plates and the reaction.

**The ladder** (`skills.json:48`; the alpha schedule `skills.json:18 ladder`: perk steps 3, 6, 7, 9; forks 4, 8; Mastered 10). 1 the door (Guard technique, roll with Durability while holding Guard when higher, Challenge and Slam defined); 2 Challenge; 3 perk step; 4 fork Provoke or Cover Them (`forks.json:8, :90`); 5 Slam; 6 perk step; 7 perk step; 8 fork Stand Fast or Drive (`forks.json:166, :188`); 9 perk step; 10 Mastered (Last Wall, `perks.json:11120`). Perks: Weight of the Wall (`perks.json:23`, +% weapon damage a plate held), Answer in Kind (`:151`). Per point (`per_point.rows`): +1 plate held to 4; the Guard technique +1 plate a point from 2.

**Pain Threshold** (beta, `skills.json:448`): per point +1% plate soak x Durability points (the feed: `1 + 0.01 x Durability x Pain Threshold`, `effects/feed.ts doorFeed`), +6% elemental damage resisted (to the 60% cap, `rules.json:23`), +2 max HP a level (`skills.json:465`; read at `character.ts:798`). Perk steps 3, 5, 7, 9; four perks (Numb `perks.json:318`, Still Standing `:462`, Second Wind `:566`, Close Guard `:699`); Mastered Walking Wounded (`:11204`).

**Sensory** (gamma, `skills.json:613`): +1 to sense what you cannot see, +1 tile of Warn's reach a point. The Call Warn (`calls.json:296`): steps at 1, 4, 8 (step 1 tile, 2 tiles, 2 tiles and -2 to hit); its price by points 3 AP from 1, 2 AP from 5, 1 AP from 9, twice a turn and on the reaction at 10 (`calls.json:8-23`); reach 4 + 1 a point. Four perks (Wind on the Skin `perks.json:828`, Bedside Manner `:907`, Read the Air `:977`, Tremor `:1057`); Mastered Skin Map (`:11248`); Achieved Sixth Sense (`:13245`).

**Endurance's card** (`attributes.json:55`): +15 max HP and +10% to ignore an injury a point above 1. The engine applies both, but **typed in code** (`character.ts:801 maxHp`: `100 + 15 x (Endurance - 1) + (level - 1) x HP a level`, times `scale`; `character.ts:770`: `10 x (Endurance - 1)`; `character.ts:798`: `5 + 2 x Pain Threshold`), not read from the card's own `derived` numbers: a defect under "content is data".

**What the engine really applies against the cards.** The plate count is true to the row. The Guard technique's gain makes Durability above 4 add nothing to plates (the pool stops at 4) and makes **Brace dominated**: for a Bulwark at Durability 5, the 1-AP Guard technique gives 5 plates and the 2-AP Brace gives 5 plates. Pain Threshold's feed is zero for a character with no Durability (a product of the two), so a mixed character's Pain Threshold point buys HP a level and elemental resistance only.

**The Bulwark** (`classes.json:58`): rank I Brace, Called Out (`:4415`: Challenge costs no plate; the named foe is Taunted with no save); rank II (attribute 5, level 6: `classes.json:12, :17`) Retort (`:104`: a melee hit on you while you hold Guard, 1 plate and the reaction throw 50% of the blow back), Shrug It Off (`:179`); rank III (attribute 8, level 12) Reforge (`:232`: at your turn's start, holding 1 plate or none, gain 2), Anchor (`:273`), Stand Behind Me (`:310`, the third rank-III move). It has no `gain` list: its only class-wide thing is the bigger pool, which the charter moves to Durability.

### 1(b) Durability's ladder: Reach and Bite

**Reach** is the plates you can hold. **Bite** is what a Slam throws back for each plate spent, as a share of one plate's soak (the plate's worth is one number, `guardSoak`, read by the soak and by the Slam). The rhythm stays at 1, 4, 7, 10 and 6, 9: Guard is a pool that fills and empties like the chain, nothing in its nature argues for another rhythm.

| Durability | Exists there (kept) | Reach (plates) | Bite (of a plate's soak, per plate in a Slam) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Guard technique, roll with Durability while holding Guard | **2** | **100%** | Slam's payoff defined (below) |
| 2 | Challenge | | | |
| 3 | perk step | | | |
| 4 | fork: Provoke or Cover Them | **3** | | |
| 5 | Slam | | | |
| 6 | perk step | | **120%** | |
| 7 | perk step | **4** | | |
| 8 | fork: Stand Fast or Drive | | | **the Push: Overbrace** |
| 9 | perk step | | **140%** | |
| 10 | Mastered: Last Wall | **6** | | |

PROVISIONAL, all of it. Reach 2 / 3 / 4 / 6 is the curve's own row (`2026-11-21-the-curve.md` section 2). Reason: a tank who has put ten points into the wall holds half again what a 7 holds, so the 10 is a different machine.

Every point is felt: 1, 4, 7, 10 Reach; 2 and 5 a verb; 3, 6, 7, 9 a perk; 6 and 9 Bite; 8 the fork and the Push; and every point is +1 to hit with melee while holding Guard for a tank whose best melee skill is Durability (the `roll_with` of unlock 1, kept).

**Two changes the ladder makes, said plainly.**
- The Guard technique's gain stops growing with Durability: **+2 plates a use** (+1 with a shield; a shield in each hand still doubles it), PROVISIONAL. Reason: so filling six plates takes three turns of work and the specialist is paid for holding them; today one use fills the pool from Durability 4, and there is nothing to build. The per-point row "+1 plate a point from 2" is replaced by the Reach rows.
- Fewer plates for Durability 3 to 6 than today (3 in place of 4), each worth more. No reward is taken back in HP: today Durability 4 holds 4 plates of 6 = 24 HP at level 1; under this draft Durability 4 at Endurance 5 holds 3 plates of 8.4 = 25 HP, and more at every level after (section 1(h): Endurance makes each plate bigger).

**A plate's worth**, PROVISIONAL: `6 x the damage level column x (1 + 0.1 x (Endurance - 1)) x Pain Threshold's feed`. The 6 is today's `rules.guard.soak` kept; what changes is the level column (the damage column in place of `scale`, so a plate keeps pace with the blows it meets) and the Endurance slope (the card, 1(h)). Reason: two plates of a hardy tank (Endurance 7: 9.6 each at level 1) swallow one level-1 Soldier's hit (about 17 on the charter's scale).

### 1(c) The cash-out: Slam

**Slam** (Durability 5; 2 AP; spends **all** your plates, at least 2): every foe next to you takes a blow of `plate soak x Bite x S(plates spent)`, its armour applies, then is pushed 1 tile and saves (Body) or is Off Balance, as today (Stand Fast and Drive keep their forms). PROVISIONAL. Reason: the wall that has stood and taken it hits back with everything it stood for, and is open afterwards. Pain Threshold's feed makes the plate soak more; it does **not** enter the Slam (the Slam reads the plate's soak before the feed): the beta protects, the alpha's Bite and Endurance hit.

The other spending moments and their costs, at levels 1, 10 and 20 (plate soak for a specialist at Endurance 7 / 9 / 10 and Pain Threshold 3 / 6 / 10 with Durability 7 / 9 / 10; a plate is a share of a level's blow, so the price in plates is the same choice at every level):

| Spend | AP | Plates | What a plate is worth: level 1 / 10 / 20 | Why it stays a choice |
| --- | --- | --- | --- | --- |
| Soak (passive) | 0 | as many as the hit needs, keeping 1 back | 12 / 96 / 912 HP | each plate soaked is one fewer for the Slam |
| Challenge | 1 | 1 (0 for the Bulwark: Called Out) | as above | a plate for a turn of the foes' attention |
| Interpose | reaction | 1 | as above | your reaction and a plate for a friend's hit |
| Slam | 2 | all (at least 2) | see the table below | the whole wall for one blow |
| Shield Bash | 1 | 1 (in place of 1 Momentum) | as above | unchanged |

**The compounding rule applied** (one Slam on one adjacent foe, in the charter's reference blows: 40 / 370 / 4,000 at levels 1 / 10 / 20; a Slam hits every adjacent foe, so two foes beside you double it):

| Who | Plates spent | One Slam, per adjacent foe | In reference blows | How often it cashes out |
| --- | --- | --- | --- | --- |
| Durability 4, a mixed character, level 1 (Endurance 5) | 3 | 8.4 x 1.0 x 3.64 = 31 | 0.8 (and the push and Off Balance on each) | about every 2 turns: two Guard techniques fill it |
| Durability 7, level 1 (Endurance 7) | 4 | 9.6 x 1.2 x 5.37 = 62 | 1.5 | about every 2 to 3 turns |
| Durability 9, level 10 (Endurance 9) | 4 | 6 x 5.74 x 1.8 x 1.4 x 5.37 = 466 | 1.3 | about every 2 to 3 turns |
| Durability 10, a specialist, level 20 (Endurance 10) | 6 | 6 x 40 x 1.9 x 1.4 x 9.93 = 6,340 | 1.6 per foe, 3 to 5 with the foes beside you | about every 4 turns, if the plates are not soaked away first |
| the same, with Overbrace | 7 | 6 x 40 x 1.9 x 1.4 x 12.92 = 8,250 | 2.1 per foe | once a turn at most; it costs an injury |

The mixed character Slams twice as often for half the blow; the specialist holds six plates for four turns, soaking through them as it goes, and is paid for every plate it did not lose. Against a single foe the mixed Slam (0.8 of a reference blow, against the mixed character's own weaker blow) passes the pressing test only with its denial (a push and an Off Balance save on everything beside you); at Durability 7 and up it passes on damage alone.

### 1(d) The Push at Durability 8: Overbrace

Once a turn, a Slam may count **one plate more than you hold**. That plate is your own body: when the Slam lands, **you roll an injury** (the injury table, `character.ts injuryText`; Endurance's +10% a point to ignore it applies, so the hardy pay less often). PROVISIONAL. Reason: the curve's Guard Push ("soak one blow past your last plate: an injury roll") turned into the same shape as Overswing, so every Body Push reads the same: one more unit, a price on you.

### 1(e) Marks on Guard

Earned by plates spent on Slam, Challenge, Interpose and Retort against worthy foes (soaks do not count: holding the line is rewarded by the Slam it allows). Thresholds in section 0.4.

| Mark | About | What it gives (PROVISIONAL) | The reason a player sees |
| --- | --- | --- | --- |
| I | hour 2 | each fight starts with 1 plate | you walk in with your guard already up |
| II | hour 11 | Pressure laid on you no longer strips your plates (`links.ts:181` passes you by) | gunfire stops wearing you down; only blows do |
| the middle | hour 17 | the Guard technique gives 1 more plate | you raise the wall a turn faster |
| III | hour 23 | Overbrace costs no injury once a fight | the first time you give your body, it holds |

Guard has no practice track of its own today; none is kept or needed.

### 1(f) Tags for mixed characters

What wears Guard: a soak (spending, by design) and Pressure laid on you (`links.ts:181-188`). What keeps it, from other doors (each is a `wear` answer on that move's row, section "Needs a new primitive"): **Slide** and **Head Down** shed your Pressure without a plate going with it; **Duck and Roll** (the Skirmisher's) keeps your plates on the step; being **Hidden** (Shadow) lays no Pressure, so it keeps plates already.

What Guard keeps for other doors: holding a plate that soaked part of a hit keeps the chain (exists: `physical/rules.ts:72`); the **Guard technique** keeps the chain on any hit (exists); **Challenge** on a Pressed foe keeps its Pressure from falling at the end of its next turn (a Taunted foe that attacks you is still pinned in place by the squad's fire).

### 1(g) Pain Threshold and Sensory, points 1 to 10

**Pain Threshold, the beta (how Guard protects you).**

| Points | Exists (kept) | Each point (PROVISIONAL) | New |
| --- | --- | --- | --- |
| every point | +1% plate soak a Durability point (the feed), +6% elemental resisted (to 60%) | **+6% max HP** in place of "+2 HP a level" | a mixed character's point is never dead: HP from the first point |
| 3, 5, 7, 9 | perk step (Numb, Still Standing, Second Wind, Close Guard: two at Tier II by 9) | | |
| 10 | Mastered: Walking Wounded | | |

Reason for the change: "+2 HP a level" is worth 0 at level 1 and about 19% of the bar at level 20; "+6% max HP" is the same share at every level, so the first point is felt at level 1, and Pain Threshold 7 on Endurance 7 lands at about 8,500 HP at level 20, the charter's "above 8,000" for the hardy. Each point then moves three numbers at once (HP 6%, elemental 6%, every plate by the Durability points in percent): at Durability 7 a Pain Threshold point is +7% on every plate.

**Sensory, the gamma (Guard outside a fight: Warn, and the voice).**

| Points | Exists (kept) | New (PROVISIONAL) |
| --- | --- | --- |
| 1 | Warn (step 1: the ally steps 1 tile out of the attack), 3 AP, reach 5; +1 to sense; the voice | |
| 2 | +1 to sense, reach 6 | |
| 3 | perk step | |
| 4 | Warn step 2 (up to 2 tiles) | |
| 5 | Warn at 2 AP; perk step; Overreach | |
| 6 | +1 to sense, reach 10 | **A Warn that wastes the attack gives you 1 plate** (the door in the Call: you read the blow before it came) |
| 7 | perk step | |
| 8 | Warn step 3 (the attack is at -2 to hit) | |
| 9 | Warn at 1 AP; perk step | |
| 10 | Mastered: Skin Map; Warn twice a turn and on the reaction | |

Every point moves reach by a tile (about a tenth of a 9-tile Call) and a gamma check by its full point; 6 gets the one dead slot a door effect. The plate is a `resource` op on the Call's own row (`when: acted`), nothing new.

### 1(h) Endurance's card made true

One point above 1 gives, in the engine (PROVISIONAL, the numbers moved into `attributes.json derived` and read from there, so `character.ts:770, :801` stop typing them):
- **Max HP +1/6 of the level's base** (on the charter's scale: 60 at level 1 for Endurance 1, 120 for Endurance 7; about 3,000 and 6,000 at level 20 before Pain Threshold). Reason: the charter's frail-and-hardy pair, written as a share so a point is the same weight at every level.
- **+10% to ignore an injury** (kept; it now also prices Overbrace).
- **+10% to what a plate soaks** (new on the card; the curve's Law 1: the attribute is the engine's size). Reason: a hardy body's plates are thicker, so Endurance is the tank's size and Durability its shape.

A point of Endurance outside your main attribute is never dead: it is HP and injuries for everyone.

### 1(i) The Bulwark

**What only the Bulwark has** (not on the skill chain): it is **paid for being hit**. A class-wide gain, new, PROVISIONAL:

- **Hold Their Eyes** (from rank I): each blow that lands on you from a foe that is Taunted gives you 1 plate after the blow is soaked (once a round from each foe). Data: a `resource` op on `damaged`, `if: {actor: foe, actor_has: [taunted], by_hit: true}`, `limit: {per: per_round, each: target}`. Reason: Challenge and Called Out draw the fire; this turns the fire into the wall, a loop no other class has.
- **Brace** is the Bulwark's alone and becomes the one way to fill to Reach in a single action.

The bigger pool (`max_by_rank` 5 / 6 / 7) goes to Durability's Reach, as the Breaker's chain of 5 goes to Raw Power. A Bulwark at rank III with Durability 8 holds 4 plates in place of 7, of 6 x 1.8 = 10.8 in place of 6 x scale each: 43 HP against today's 42 at level 1, and growing faster by level (Endurance's slope), so no HP is taken back.

**Ranks** (charter: I at level 3, II at level 5, III at level 15; the attribute thresholds 5 and 8 stay: `classes.json:12`, `:17` becomes `{"I": 3, "II": 5, "III": 15}`).

| Rank | Move | Today, against the test (worth about 1.5 plain actions of the same AP when its set-up is met) | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| I | Brace (2 AP) | **Fails**: the 1-AP Guard technique gives the same plates from Durability 2 | Fill your plates to your Reach; Braced (+2 Defense until you move, and you can't be pushed while Braced); start each fight with 1 plate. From Reach 4 it is two Guard techniques for the price of two AP and the Defense on top |
| I | Called Out (passive) | Passes (Challenge free, the named foe Taunted with no save) | kept; with Hold Their Eyes it is the class's engine |
| I | Hold Their Eyes | new | above |
| II | Retort (reaction) | **Fails**: 1 plate and the reaction for half a Soldier's blow back (about 0.2 of a plain action) | Spend 1 plate and the reaction: the striker takes **what your plates soaked of that blow** x your Bite, its armour applies. At level 10, Durability 9: a full plate's 96 x 1.4 = 134, about a third of a reference blow for no AP and a plate |
| II | Shrug It Off (reaction) | Passes (ends Bleeding, Slowed, Weakened, Prone: a condition is a quarter to a whole turn) | kept |
| III | Reforge (passive) | **Fails at rank III**: +2 plates when at 1 or none is a third of an action at level 15 | At your turn's start, holding half your Reach or less, fill to half your Reach (3 at Durability 10). The wall rebuilds itself after a Slam |
| III | Anchor | Passes (Braced can't be moved, a foe leaving your reach provokes) | kept |
| III | Stand Behind Me (the third move) | Passes (a ranged attack on the ally behind you lands on you) | kept; with Hold Their Eyes a Taunted shooter's shot on it gives a plate too |

## 2. Strength: the door of Momentum (Raw Power; Guts; Intimidation; the Breaker, id `fighter`)

This completes the curve's section 16 (its ladder, Bite and Coup table are kept as written).

### 2(a) Today

**The counter.** The chain (`res.momentum`): 3 for everyone (`techniques.json:6-27`, `max 3`), 5 for a Breaker (`classes.json:360 resource.max 5`; `fighter_max 5`). A fight starts at 1 (`start 1`; `physical/core.ts:215 momentumStart`, plus `momentum_start`: the Breaker's Wind-up +2, `classes.json:394`).

**What builds it.** A plain melee hit (Cut) +1 (`physical/core.ts landed`); Shield Bash's hit +1; the Breaker's Charge Carries +2 on a Charge that hits (`classes.json:535`); Read the Swing +1 on a melee miss against you (`:431`); Unstoppable +2 (`:481`); Wrecker +1 a blow on cover or a door (`:846`); Rolling Start and Grindstone (`forks.json:806, :847`).

**What spends it.** A Strike or an Opener 1 (the first Opener a fight free; `physical/core.ts momentumCostMod` and `momentumCost`); a Finisher spends all (at least 2): Coup +25% damage a step (`techniques.json:1060`; `physical/melee/finishers.ts:49`), Cleave one more adjacent foe a step at full damage (`:1102`; `finishers.ts:73`), Break a Body save at -1 a step or Stunned (`:1146`; `finishers.ts:101-103`), Run Through +20% a step and Pinned (`:1188`; `finishers.ts:151`), Throw Down +25% a step on a held foe (`:1235`; `finishers.ts:236`). The Breaker's Launch spends all (at least 2): `22 + 5.5 x Momentum` on the melee profile, then a throw (`classes.json:718`). Barrel In (the Breaker's Lunge, `:4158`) 1; Riposte (`:4211`) 1.

**What wears it.** Each tile walked (`step_loss 1`, `physical/rules.ts:62-65`; a step that is part of another action and a forced move do not), each damaging hit taken unless the Guard technique is up, the hit was Parried, or a plate soaked part of it (`hit_loss 1`, `physical/rules.ts:70-75`). Guts divides both (`physical/core.ts:226 wearMomentum`, the feed `1 + 0.01 x Raw Power x Guts`).

**The ladder** (`skills.json:762`): 1 the door; 2 Grapple; 3 perk step; 4 fork Rolling Start or Grindstone; 5 Throw Down; 6 and 7 perk steps; 8 fork Spill or Headlong (`forks.json:895, :942`); 9 perk step; 10 Mastered Earthbreaker (`perks.json:11288`). Perks: Keep Swinging (`perks.json:1167`), Iron Grip (`:1354`); Achieved Siege Engine (`:12980`). Per point: +1 to hit (heavy melee, bare hands), +5% physical damage, melee techniques harder to save against, +1 to counter-attacks from 2.

**The card against the engine.** Strength's card: +10% physical damage and +5 kg a point (`attributes.json:78`). Raw Power's: +5% physical a point. The engine's melee profile (`rules.json:1830`: k 1.15385, attribute slope 0.05, skill slope 0) gives about **+3.8% of the hit a Strength point** at Strength 7 and **0 from Raw Power** on every melee weapon (`character.ts:833 weaponMult` reads the weapon's profile; the 0.05 of Raw Power lives only on the `physical` profile, `rules.json:1815`, which melee weapons with a `phys` block do not read). `factors.melee 1.35` (`rules.json:1987`) was a multiplier to hold a ceiling. Carry `20 + 5 x (Strength - 1)` is true but typed in code (`character.ts:766`).

**Guts** (beta, `skills.json:992`): the feed (Momentum lost divided by `1 + 0.01 x Raw Power x Guts`), +1 on Body saves a point. Four perks (Into the Dark `perks.json:1480`, Steady `:1561`, Point Man `:1650`, Unflinching `:1770`); Mastered Nothing Left to Fear (`:11343`); Achieved Bite the Bullet (`:13193`).

**Intimidation** (gamma, `skills.json:1155`): +1 tile of Threaten's reach a point, Threaten harder to shake off. The Call Threaten (`calls.json:335`): Heart save; steps at 1, 4, 8 (Shaken 3 rounds and -1 AP; and can't approach you; -2 AP). Price as every Call. Four perks (Grim Reaper `perks.json:1884`, Marrow Talk `:2108`, Stare Down `:2240`, Bone Talk `:2359`); Mastered The Name They Whisper (`:11409`); Achieved Charge! (`:12412`), Make Way (`:12456`).

**The Breaker** (`classes.json:360`): gain Charge Carries, Four Ways to Finish (`:627`: Cleave, Break and Coup with any weapon; Cleave +2 to hit; Break leaves Exposed; Coup under 50% HP +2 to hit and x1.2), Launch, Wrecker, Breach (`:881`), Into the Wall (`:923`, a slam of 12 on the melee profile), Hurl (`:990`); rank I Barrel In, Wind-up; rank II Riposte, Read the Swing; rank III Measured Blow (`:4281`), Unstoppable.

### 2(b) Raw Power's ladder

**Reach** is the chain's top. **Bite** is a damage Finisher's bonus for each step spent (Coup, Throw Down, Run Through, Launch). Kept as the curve's section 16 wrote it:

| Raw Power | Exists (kept) | Reach (chain) | Bite (per step spent) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Coup, Cleave, Break | **x3** | **25%** (Run Through 20%: it pins as well) | the cash-out sum on every Finisher |
| 2 | Grapple | | | |
| 3 | perk step | | | |
| 4 | fork: Rolling Start or Grindstone | **x4** | | |
| 5 | Throw Down | | | |
| 6 | perk step | | **30%** (Run Through 25%) | |
| 7 | perk step | **x5** | | |
| 8 | fork: Spill or Headlong | | | **the Push: Overswing** |
| 9 | perk step | | **35%** (Run Through 30%) | |
| 10 | Mastered: Earthbreaker | **x7** | | |

PROVISIONAL (the curve's). Every point is felt besides: +1 to hit and **+5% damage on every melee blow** a point (Raw Power's card made true: the melee profile's skill slope becomes 0.05).

**The count Finishers under the sum** (section 0.2): Cleave strikes `S(n)` rounded down more adjacent foes (x3 3, x4 5, x5 7: from x5 everyone beside you), each at full damage; Break's save is harder by `S(n)` rounded down (x3 -3, x4 -5, x5 -7, x7 -12; a Boss is Dazed, as today). PROVISIONAL. Reason: the specialist's Break at x7 is a near-certain Stun on anything short of a Boss, which is what seven steps of an unbroken chain should buy.

**The Breaker loses its chain of 5** (the charter): a Breaker at Raw Power 7 holds x5 as today; at Raw Power 4 to 6 it holds x4 (one less than today). It keeps Wind-up (+2 at the start) and gains Momentum's Mark I, so it walks into a fight with 4 of its x4 where it walked in with 3 of 5 today.

### 2(c) The cash-out: the Finisher

| Spend | AP | Chain | Its worth at levels 1 / 10 / 20 | Why it stays a choice |
| --- | --- | --- | --- | --- |
| A Strike or an Opener | the technique's | 1 (first Opener a fight free) | one step: a quarter to a third of a blow at every level | a step now, or a bigger Finisher later |
| A Finisher | the weapon's (as a plain blow) | all (at least 2) | the table below | the whole chain, and the next walk or hit starts it again from 0 |
| Launch (the Breaker) | 2 | all (at least 2) | as Coup, then the throw | |
| Barrel In, Riposte | as today | 1 | | |

The Coup table is the curve's section 16 (Coup in plain hits of the same weapon: Raw Power 1 at x3 1.9; 4 at x4 2.3; 7 at x5 3.2; 10 at x7 5.5; with Overswing at x8 6.8). At level 20 a specialist's x7 Coup is 5.5 x about 4,000 = **22,000**, the charter's "x7 Coup above 20,000". The mixed character cashes out twice as often for less than half the blow; the specialist waits about four turns for x7 and is paid for every step it did not walk or bleed away.

**Launch** becomes `blow x (1 + Bite x S(n))` on the melee profile (`launch` amounts block: base the weapon's blow, a `cash:momentum` part), then the throw as today. PROVISIONAL. Reason: the Breaker's own Finisher pays at least what a Coup pays and moves the foe on top.

### 2(d) The Push at Raw Power 8: Overswing

Kept from the curve: once a turn, a Finisher counts one step more than you hold; **you are Off Balance until your next turn** (`conditions.json off_balance`, put on yourself with `skip_save`).

### 2(e) Marks on Momentum

Earned by steps spent on Finishers (Launch included) that land on worthy foes. Kept from the curve section 16: I (about hour 2) a fight starts at 2, not 1; II (hour 11) a hit taken costs a step only once a round; the middle (hour 17) a Charge that hits builds one more; III (hour 23) Overswing costs nothing once a fight.

Weapon drill is a practice track of this attribute's weapons too: section 4.

### 2(f) Tags for mixed characters

What wears the chain: walking, being hit (`physical/rules.ts:62-75`). Other doors' moves that **keep the chain** (no walk or hit cost while they resolve): Fire and Move's free step and Run and Gun's (the Skirmisher's: today a free move still counts as a walk), Shadow's Vault and Fade, the step of a Warn or a Cue an ally gives you, a Whisper prayed while you hold the chain (it does nothing to the chain today: nothing to tag). The Guard technique and a soaking plate keep it already.

What the chain keeps for other doors: a **Finisher on a Pressed foe does not let its Pressure fall** at the end of its next turn (your blow pins it as surely as the fire); a **Grappled or held foe's Pressure does not fall**.

### 2(g) Guts and Intimidation, points 1 to 10

**Guts, the beta (how the chain sustains you).**

| Points | Exists (kept) | Each point (PROVISIONAL) |
| --- | --- | --- |
| every point | Momentum kept (the feed); +1 on Body saves | **+1 on saves against Fear** too (Guts' own word: "Fear doesn't get a vote") |
| 3, 5, 7, 9 | perk step (Into the Dark, Steady, Point Man, Unflinching) | |
| 10 | Mastered: Nothing Left to Fear | |

Reason: +1 on a d20 save is a twentieth of the die; two saves moving at once is felt on every point, and the feed is felt for any character who also holds Raw Power. A Guts point for a character with no Raw Power is never dead: it is two saves.

**Intimidation, the gamma (the chain outside a fight: Threaten, and the voice).**

| Points | Exists (kept) | New (PROVISIONAL) |
| --- | --- | --- |
| 1 | Threaten (step 1), 3 AP, reach 5; the voice | |
| 2 | reach 6, harder to shake | |
| 3 | perk step | |
| 4 | Threaten step 2 (it can't move toward you) | |
| 5 | Threaten at 2 AP; perk step; Overreach | |
| 6 | reach 10, harder to shake | **A Threaten that lands gives you 1 Momentum** (they flinched; you are already moving) |
| 7 | perk step | |
| 8 | Threaten step 3 (-2 AP) | |
| 9 | Threaten at 1 AP; perk step | |
| 10 | Mastered: The Name They Whisper; Threaten twice a turn and on the reaction | |

### 2(h) Strength's card made true

One point above 1 gives (PROVISIONAL; numbers into `attributes.json derived`, read from there):
- **+10% damage on every physical blow**: melee, bare hands, shields, thrown weapons and a bow's draw (the melee and thrown profiles' attribute slope becomes 0.1; `factors.melee 1.35` and `factors.thrown 0.7` go with the scale drafter's new weapon numbers, since they were lines). Reason: the card says it; a specialist's maul (base about 20 on the charter's scale) at Strength 7 and Raw Power 7 is 20 x 1.6 x 1.35 = 43, the charter's "about 40".
- **+5 kg carried** (kept; Hurl's weight and the camp's loads read it).

A Strength point outside your main attribute is never dead: every swing, throw and load.

### 2(i) The Breaker

**What only the Breaker has**: **the room is its weapon.** Wrecker, Breach, Into the Wall and Hurl (cover, doors, bodies and barrels turned into Momentum and damage), and **Launch**, the Finisher only it knows. All kept, all class gain from rank I (`classes.json` `fighter.gain`).

| Rank | Move | Against the test | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| gain | Launch (2 AP, all, at least 2) | Borderline today (`22 + 5.5` a step, about one plain blow plus the throw at x3) | Coup's payoff, then the throw (2(c)) |
| gain | Into the Wall | Passes (free damage on a move you made anyway) | its slam reads the level column and Strength's slope (base 12 kept) |
| gain | Charge Carries, Four Ways, Wrecker, Breach, Hurl | Pass | kept |
| I | Barrel In | Passes (a move and a strike for the strike's AP) | kept |
| I | Wind-up | Passes | kept (+2 at the start; with Mark I a Breaker starts at 4) |
| II | Riposte | Passes (a free blow on a miss) | kept |
| II | Read the Swing | Passes | kept |
| III | Measured Blow | Passes weakly at rank III (a step back after a drop) | **A Finisher that drops its target leaves you half the steps it spent** (rounded down; once a fight, any Finisher does). A x7 chain that kills keeps x3: the Breaker rolls from one body to the next |
| III | Unstoppable (1 AP, once a scene) | Passes | kept |

## 3. Agility: the door of Pressure (Dexterity; Athletics; Reaction Speed; the Skirmisher, id `marksman`)

### 3(a) Today

**The counter.** Pips on a target (`pressure`, a unit's own; `techniques.json:54-94`): a foe holds at most 4, an Elite 3, a Boss 2, a player 3 (`physical/pressure.ts:15-17 pressureCap`); Pressed at 2 (-1 to hit with ranged, no held shots), Suppressed at 3 (-1 AP, no reactions that attack or move it), Broken at 4 (-2 AP, it must reach cover or drop Prone). A player never loses AP to Pressure (`physical/rules.ts:96-106`). **Dexterity never moves the cap.**

**What builds it.** The first Dexterity hit a shooter lands on a target each turn +1 (Dexterity's unlock 1, `skills.json:1302`); Press techniques (Suppress +2 on a hit and +1 on a miss `techniques.json:1821`, Rake, Warning Shot, Flush, Mag Dump, Crossfire); a comrade shot down within 3 tiles +1 (`kill_spill`, `physical/rules.ts:79-82`); the Skirmisher's Relocated (+1, `classes.json:1195`), Hold the Lane (`:1345`), Run and Gun (`:1455`); forks Converging Fire and Walk It In (`forks.json:1018, :1075`); perks Pressure Point and Keep Their Heads Down (`perks.json:2706, :2923`).

**What spends it.** A Take needs a Pressed target and spends 2 pips (`take_cost 2`; `physical/core.ts:1032`): Dead Centre +50% (3 AP, `techniques.json:2379`), Pin Down x0.7 and Pinned (3 AP, `:2426`), Rout no damage, it runs (3 AP, `:2473`), Stopping Shot -1 AP and a push (2 AP, `:2517`), Storm a move then a shot (3 AP, `:2565`), Last Round +3 to hit (2 AP, `:2609`). Flush Out (`pressure.json`, Dexterity 5, 2 AP) spends as a Take does. Its payoff never grows with the pips.

**What wears it.** At the end of the holder's turn 1 (2 in cover and unseen, 2 closing in), then Athletics' feed (`physical/rules.ts:109-120`; the `DECAY` list there lets items change it: Bead). A melee hit sheds the attacker's own Pressure (`physical/rules.ts:42`). Slide sheds 1 (`pressure.json` Slide, Dexterity 2, 1 AP, `3 x feed` tiles to cover).

**The ladder** (`skills.json:1302`): 1 the door; 2 Slide; 3 perk step; 4 fork Converging Fire or Walk It In; 5 Flush Out; 6, 7 perk steps; 8 fork Through the Gap or Lockdown (`forks.json:1114, :1205`); 9 perk step; 10 Mastered Trick Shot (`perks.json:11490`). Perks: Pressure Point (`:2706`), Keep Their Heads Down (`:2923`); Achieved Dance of Iron (`:12714`). Per point: +1 to hit (guns, light blades, thrown), +2% critical damage, +half a tile of throw range, shooting techniques harder to save against.

**The cards against the engine.** Agility's card (`attributes.json:101`): +0.5 tile a AP and +1 Initiative a point. Both true (`character.ts:821 movement`, `:817 initiativeBonus`), typed in code. The card says nothing of damage, yet the gun profile reads Agility (`rules.json:1840`: k 1.275, slope 0.0294: about **+2.5% of the hit a point** at Agility 7). Dexterity's +2% critical a point is true but under the x2.0 cap (`character.ts:854-855 CRIT_MAX`); Dexterity adds **0 damage** (gun profile skill slope 0).

**Athletics** (beta, `skills.json:1544`): the feed (Pressure shed at a plain turn's end and Slide's reach: `1 + 0.01 x Dexterity x Athletics`), +1 Defense a point **from point 2** (`skills.json:1561 defense_from 2`; `character.ts:824 athDefense`): **Athletics 1 gives 0 Defense**, while the code comment says "from 1". Four perks (Wall Run `perks.json:2449`, Roll With It `:2524`, Untouchable `:2598`, Catch `:3400`); Mastered Never There (`:11450`).

**Reaction Speed** (gamma, `skills.json:1704`): +1 Initiative (through the modifier: 0 points -2, 1 point 0, then +1 a point), +1 tile of Cue's reach. The Call Cue (`calls.json:212`): steps at 1, 4, 8 (one more reaction; or a step; and they go straight after you). Four perks (Rounding Up `perks.json:3057`, Shoot First `:3135`, Cut In `:3219`, Speed Load `:3291`); Mastered Before the Blink (`:11541`); Achieved Between Heartbeats (`:12937`).

**The Skirmisher** (`classes.json:1066`; its resource line is Heat): gain Reflex (`:1094`, a second reaction), Fire and Move (`:1123`, a 1-tile move free after a Dexterity attack), Relocated, Break Them (`:1282`: Rout 1 AP less; saves against you harder by 1 a pip, at most 2); rank I Hold the Lane (held shots 1 AP less; a held miss still lays 1), Fire Discipline (`:4020`); rank II Duck and Roll (`:1410`), Special Ammo (`:4087`); rank III Run and Gun (a 2-tile move free after an attack, the next hit +1), Killzone (`:4119`).

### 3(b) Dexterity's ladder

**Reach** is the most Pressure your hits can lay on one target; a target's cap is **the highest Reach of anyone who has laid Pressure on it this fight**, less 1 for an Elite and 2 for a Boss (a player still stops at 3). So a squad's one specialist lifts the whole squad's fire. **Bite** is a damage Take's bonus for each pip spent.

| Dexterity | Exists (kept) | Reach (pips on a foe) | Bite (per pip spent) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: hits lay Pressure | **2** (Pressed) | **20%** | every Take spends all and pays on the sum |
| 2 | Slide | | | |
| 3 | perk step | | | |
| 4 | fork: Converging Fire or Walk It In | **3** (Suppressed) | | |
| 5 | Flush Out | | | |
| 6 | perk step | | **25%** | |
| 7 | perk step | **4** (Broken) | | |
| 8 | fork: Through the Gap or Lockdown | | | **the Push: Overpress** |
| 9 | perk step | | **30%** | |
| 10 | Mastered: Trick Shot | **5** (and Broken lasts: a foe at 5 is still Broken after its turn's fall) | | |

PROVISIONAL. Reach 2 / 3 / 4 / 5 is the curve's row. Reason: a shooter learns first to make a foe flinch, then to pin it, then to break it; the specialist's fifth pip means Broken survives a turn, and it Breaks an Elite (4) and Suppresses a Boss (3), which today nobody can. Bite is smaller than Momentum's because pips come from the whole squad, and a squad cash-out on five pips laid by three guns should not be worth a lone x7 chain.

**One reward moves down, said plainly**: today a Dexterity 1 shooter can drive a foe to Broken; under this draft only to Pressed unless a squad-mate with more Reach has laid on it. The reason is the ladder itself (a 7 is a different machine from a 1); a low-Dexterity shooter's pips are still the specialist's to cash.

Every point is felt besides: +1 to hit (on the d20, and through Margins more than that), +2% critical damage.

### 3(c) The cash-out: the Take

**A Take spends all the target's Pressure** (at least 2, Pressed), wherever it came from, and its payoff grows with the sum: a damage Take (Dead Centre, Last Round) `x(1 + Bite x S(n))`; Pin Down's save harder by `S(n)` rounded down, its Pinned 1 round a 3 pips; Rout's save harder by `S(n)` rounded down; Stopping Shot pushes 1 tile and takes 1 AP, +1 of each a 3 pips; Storm's move +1 tile a pip. PROVISIONAL.

**Every Take costs 2 AP** (Dead Centre, Pin Down, Rout and Storm from 3), PROVISIONAL. Reason: a Take spent on a foe the squad has worked on must be worth pressing over a plain shot of the same AP; at 3 AP Dead Centre on 2 pips is 1.44 shots for the price of 1.5 (worse than shooting); at 2 AP it is 1.44 for 1.

| Spend | AP | Pips | Its worth at levels 1 / 10 / 20 | Why it stays a choice |
| --- | --- | --- | --- | --- |
| A Take | 2 | all on the target (at least 2) | the table below; in shots, the same at every level | spending frees the foe: Suppressed and Broken end with it |
| Flush Out | 2 | as a Take | a save or Afraid for a round | the same |
| Slide | 1 | 1 of **your own** | | |
| Suppress | 3 | none (it lays 2) | half a shot and 2 pips | build or shoot |

**The compounding rule applied** (Dead Centre in plain shots of the same gun at the same 2 AP; the pips can be the squad's):

| Who | Pips spent | One Dead Centre is worth | How often it cashes out |
| --- | --- | --- | --- |
| Dexterity 1 | 2 | 1.44 shots | every turn in a squad, every second turn alone |
| Dexterity 4, a mixed character | 3 | 1.73 shots | about every 2 turns |
| Dexterity 7 | 4 | 2.34 shots | about every 2 to 3 turns |
| Dexterity 10, a specialist | 5 | 3.23 shots | about every 3 turns alone, every 2 in a squad, if nobody spends the pips first |
| the same, with Overpress | 6 | 3.98 shots | once a turn at most |

The Take is a squad's question: who holds the shot that spends what everyone laid. A specialist who waits at 5 keeps a foe Broken (two AP lost a turn) and then takes it apart; the mixed character spends at 3 and keeps it flinching.

### 3(d) The Push at Dexterity 8: Overpress

Once a turn, a Take counts **one pip more than the foe holds** (above its cap too). The price: **your gun is hot** (its Heat goes to one under its limit: the next burst may jam) and **you are Seen until your next turn** (the stat `always_seen`, put on by a condition row of one round). PROVISIONAL. Reason: the curve's Pressure Push ("empty the magazine into one target: the gun is hot and may jam; you are Seen"), in the Body shape: one more unit, the price on you.

### 3(e) Marks on Pressure

Earned by pips spent by your Takes and Flush Outs on worthy foes.

| Mark | About | What it gives (PROVISIONAL) | The reason a player sees |
| --- | --- | --- | --- |
| I | hour 2 | your first Dexterity hit each fight lays 1 more pip | the first shot of the fight already rattles them |
| II | hour 11 | Pressure you laid falls by at most 1 a turn (cover unseen and closing in no longer double it) | they can't shake you off by hiding |
| the middle | hour 17 | Suppress lays 1 more pip on a hit | |
| III | hour 23 | Overpress costs nothing once a fight | the first long burst of a fight comes free |

### 3(f) Tags for mixed characters

What wears Pressure on a foe: its turn's fall (`physical/rules.ts:109-120`, where the `DECAY` list already lets items change it). Other doors' moves that **keep Pressure** on a foe: a Finisher or a Grapple on it (Momentum, 2(f)); a Challenge (Guard, 1(f)); a landed **Threaten** (that foe's Pressure does not fall at the end of its next turn); Shadow's Tag; a Judged foe (prayer). What Pressure's moves keep for other doors: **Slide** keeps the chain (it already does: a forced move is no walk) and keeps plates (1(f)); **Fire and Move's** and **Run and Gun's** free steps keep the chain (2(f)).

### 3(g) Athletics and Reaction Speed, points 1 to 10

**Athletics, the beta (how Pressure protects you).**

| Points | Exists (kept) | Each point (PROVISIONAL) |
| --- | --- | --- |
| every point | the feed (Pressure shed, Slide's reach); +1 Defense | **+1 Defense from point 1** (`defense_from 2` becomes 1: the data has been one point late since rules 1.82 item 7011) |
| 3, 5, 7, 9 | perk step (Wall Run, Roll With It, Untouchable, Catch) | |
| 10 | Mastered: Never There | |

Reason: +1 Defense moves every enemy's hit chance on you by a twentieth; the first point was dead.

**Reaction Speed, the gamma (Pressure outside a fight: Cue, Initiative, and the voice).**

| Points | Exists (kept) | New (PROVISIONAL) |
| --- | --- | --- |
| 1 | Cue (one more reaction), 3 AP, reach 5; Initiative from -2 to 0; the voice | |
| 2 | +1 Initiative, reach 6 | |
| 3 | perk step | |
| 4 | Cue step 2 (or a step) | |
| 5 | Cue at 2 AP; perk step; Overreach | |
| 6 | +1 Initiative, reach 10 | **A Cued ally's reaction shot lays 1 more pip** (you called the moment; they caught it) |
| 7 | perk step | |
| 8 | Cue step 3 (they go straight after you) | |
| 9 | Cue at 1 AP; perk step | |
| 10 | Mastered: Before the Blink; Cue twice a turn and on the reaction | |

### 3(h) Agility's card made true

One point above 1 gives (PROVISIONAL; into `attributes.json derived`):
- **+0.5 tile of movement an AP** and **+1 Initiative** (kept).
- **+5% damage with Dexterity weapons** (guns, bows, thrown weapons, light blades, Dexterity gloves), new on the card: the gun profile's slope becomes 0.05, with no other k to hold a line. Reason: the charter's rifle (base 14 on the new scale) is "about 18" for a specialist at level 1; Agility 7 at +5% a point gives 14 x 1.3 = 18.2. A smaller slope than Strength's because each Agility point also moves every step you take.

An Agility point outside your main attribute is never dead: it is movement for everyone.

### 3(i) The Skirmisher

**What only the Skirmisher has**: **two reactions and fire on the move.** Reflex (a second reaction a round, of any kind), Fire and Move and Relocated (the shot that moved is better), kept as class gain from rank I. The reaction economy (held shots, Killzone's two, Duck and Roll) is its game and nobody else's.

| Rank | Move | Against the test | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| gain | Reflex, Fire and Move, Relocated | Pass | kept |
| gain | Break Them (Rout 1 AP less; saves harder by 1 a pip, at most 2) | Passes | Rout at 1 AP (Takes are 2); the save bonus **at most 3** (the Reach a Broken foe now reaches) |
| I | Hold the Lane | Passes | kept |
| I | Fire Discipline | Passes | kept (its "3+ AP technique 1 AP less" still meets Aimed Shot, Burst, Suppress, Rake, Mag Dump) |
| II | Duck and Roll (reaction) | Passes (a step and -2 to hit in cover for no AP) | kept |
| II | Special Ammo | **Fails the class test**: one load each of three special rounds a rest, while Items 2.0 gives every shooter special rounds by calibre and the Load Special technique (`techniques.json:2233`) | **Hot Loads**: once a turn Load Special costs no AP, and a special round you fire lays 1 more pip. The shooter who lives on special rounds, not a box of three |
| III | Run and Gun | **Fails at rank III**: a 2-tile free move overlaps Fire and Move's 1 tile and is half an AP at Agility 7 | Once a turn after you attack, your next move **up to a full AP of your Movement** is free, with no opportunity attack, and your next hit lays 1 more pip |
| III | Killzone | Passes (two held attacks for twice the AP, +2 to hit) | kept |

## 4. Weapon drill and the physical techniques (all three doors)

**Today.** 66 techniques (`techniques.json items`: melee Strikes 11, Links 7, Openers 5, Finishers 5, Answers 5, Follow 1; ranged Fire 9, Set 7, Press 6, Take 6, Watch 4). Everyone starts knowing the free ones (Cut, Shot, Aimed Shot, Overwatch) and two of each side (`techniques.json:125 starting`: Lunge, Sidestep; Suppress, Shift); ready at once `3 + 0.5 x the weapon's skill` (`:95`). Drill is per weapon id, earned **only by kills**: everyone who hit the victim gets `per_kill` by its tier (vermin 1, minion 5, soldier 10, elite 25, boss 50), x3 for the three Body classes (`techniques.json:99-117`; `physical/rules.ts:84-94`; `physical/data.ts:138 drillMult`); marks at 300, 900, 1,800 (`:113`): Mark I the weapon's signature technique (a pick if it has none), Marks II and III a pick (`physical/data.ts:121-130`). A rest gives 200 drill and a training ground 400 (`survival.json`, checked in the map).

**Under the laws** (PROVISIONAL):
- **What earns drill**: every **worthy** foe you hit with the weapon, when it falls (kill or Down), by its tier: minion 20, soldier 40, elite 100, boss 200 (today's x4); a foe more than two levels below gives none (Law 3: weak foes give nothing). Reason: about 15 worthy foes an hour fall with your hits on them, mostly Soldiers, so about 720 drill an hour.
- **Marks at 600, 1,200, 1,800** (today 300, 900, 1,800): equal steps, so a mark lands about every 50 minutes and Mark III in about 2 hours 30 of use, the chase calendar's rate. Saved bars keep their drill; nobody loses a mark they hold.
- **The martial multiplier x3 becomes x1.5** for the three Body classes. Reason: at x3 a Bulwark would reach Mark III in 50 minutes, a weapon's whole story in one fight; at x1.5 a soldier by trade learns a weapon in about 1 hour 40, everyone else in 2 hours 30.
- **What a mark gives**: Mark I the weapon's signature technique (kept); Mark II a pick and **+1 to hit with this weapon** (it sits in your hand right); Mark III a pick and **+10% damage with this weapon** (felt: a tenth), and later the slot that copies its Weapon Art (not in 0.34). A pick never offers a technique you know.
- **How a capped character holds about 80% (53 of 66)**: at about 2.5 hours a weapon and two to three weapons carried, about 16 weapons reach Mark III and 6 more Mark I by hour 45. 4 known at the start, 16 x 3 and 6 x 1 is 58 techniques offered; the signatures of weapons of one family repeat on about 5 of them; about 53 are known. The ready limit is unchanged.

## 5. How a player spends (j)

**The point count.** `rules.json:227-233` gives 2 Skill points on odd levels and 1 on even levels, plus 1 Attribute point on even levels: **38 Skill points by level 20** (10 at creation and 28 levelling), not the 48 of this task's brief, and 20 Attribute points. With 38, a specialist who puts 30 into one attribute's three skills has 8 for everything else. The table below plays the brief's 48 (**2 Skill points every level**, the Attribute point on even levels: the lead's call, question 1) and marks what goes missing with 38.

**Gates** (charter): class at 3, rank II and ceiling 8 at 5, ceiling 9 at 10, ceiling 10 and rank III at 15. **The Attribute point comes on even levels, so the ceilings that open at 5 and 15 cannot be used until 6 and 16** unless the level-4 or level-14 point is held back (question 2).

**An Endurance specialist** (the Bulwark): creation Endurance 7 (6 of 10 Attribute points), Strength 3, Agility 2, Perception 2; Durability 7, Pain Threshold 3.

| Level | Hour | Buys | What the player gets | Felt? |
| --- | --- | --- | --- | --- |
| 1 | 0 | creation | 4 plates (Reach at 7) of 9.6; Slam; 120 HP x 1.18 (Pain Threshold 3) | yes |
| 2 | 1 | Pain Threshold 5; Strength 4 | a perk step (Second Wind), +12% HP, plates +14% | yes |
| 3 | 2 | Sensory 2; **the Bulwark** | Warn, Brace, Called Out, Hold Their Eyes | yes |
| 4 | 3 | Pain Threshold 7; Agility 3 | a perk step; +12% HP; movement | yes |
| 5 | 4 | Sensory 4; **rank II** | Warn step 2; a perk at 3; Retort, Shrug It Off | yes |
| 6 | 6 | Endurance 8; Durability 8, Sensory 5 | the fork; **Overbrace**; Warn at 2 AP; HP and plates +10% | yes |
| 7 | 8 | Pain Threshold 8, Sensory 6 | HP; Warn's plate | yes |
| 8 | 11 | Sensory 8; Strength 5 | Warn step 3; Guard's Mark II about now | yes |
| 9 | 13 | Raw Power 2 (Grapple), Athletics 1 (with 38: only one of them) | a verb; +1 Defense | yes |
| 10 | 16 | Endurance 9; Durability 9, Pain Threshold 9 | Bite 140%, two perk steps | yes |
| 11 | 18 | Sensory 9, Raw Power 3 | Warn at 1 AP; a perk | yes |
| 12 | 21 | Raw Power 5; Strength 6 (with 38: Raw Power 4) | Throw Down; the chain at x4 | yes |
| 13 | 23 | Athletics 3 | a perk; Guard's Mark III about now | yes |
| 14 | 26 | Guts 2; the Attribute point **held** | two saves | **flag: the Attribute point buys nothing this level** |
| 15 | 28 | the held point: Endurance 10; Durability 10; **rank III** | **Reach 6**, Last Wall, Reforge, Anchor | yes |
| 16 | 31 | Pain Threshold 10, Sensory 10; Strength 7 | two Mastered perks | yes |
| 17-20 | 33-40 | Raw Power 7, Guts 4 to 5, Athletics 4 | the second door at x5; the last perks | yes |

Endurance's three skills reach 30 at level 16. **Flagged levels**: 14 (the held Attribute point; with question 2's answer it is felt); with 38 Skill points, levels 9, 11 and 13 buy one point instead of two and the second door stops at Raw Power 4.

**A sensible mixed character** (the wall that hits back, Guard and Momentum): creation Endurance 5, Strength 5; Durability 5, Raw Power 5.

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | 3 plates, Slam at 3 plates (31 a foe); the chain x4, Throw Down |
| 2 | Pain Threshold 2; Strength 6 | +12% HP; +10% every blow |
| 3 | Guts 2; the class of the higher attribute (Strength: the Breaker) | two saves; Launch and the room as a weapon |
| 4 | Raw Power 6; Endurance 6 | Bite 30%; +HP, plates +7% |
| 5 | Durability 6, Raw Power 7; rank II | Bite 120% on Slam; the chain x5 |
| 6 | Durability 7; Strength 7 | Reach 4 plates; +10% blows |
| 7-10 | Pain Threshold 5, Guts 5, Intimidation 2, Endurance 7, Strength 8, Raw Power 8 | Overswing; two perk steps; HP |
| 11-15 | Durability 8, Raw Power 9, Endurance 8 to 9, Strength 9 | Overbrace; Bite 35% |
| 16-20 | Raw Power 10, Durability 9, Pain Threshold 7 | the chain x7, Earthbreaker |

The mixed character Slams at 3 or 4 plates and Coups at x4 or x5 every two turns, and a Guard technique keeps its chain: two doors, more and smaller cash-outs, and two sets of bars. No level of it buys nothing.

## Questions for the lead

1. **38 or 48 Skill points by level 20?** The data gives 38 (`rules.json:227-233`); the brief says 48. Recommended: **48, two Skill points every level**, so every level opens something in two skills and a specialist's 30 leaves 18 for a second door.
2. **The Attribute point and the gates at 5 and 15.** Points come on even levels; ceilings open on odd. Recommended: **swap the gains of levels 4 and 5 and of 14 and 15** (the Attribute point arrives on 5 and 15, the extra Skill point on 4 and 14), so the gate and the point that uses it land together.
3. **Margins against Dexterity's critical.** Law 2's Margins replace the capped critical; Dexterity's card promises +2% critical a point under the x2.0 cap (`character.ts:854`). Recommended: **keep Dexterity's +2% a point and lift `CRIT_MAX`** once Margins are in, so the point stays felt and the Margins drafter owns the rest.
4. **A target's Pressure cap from the best Reach that laid on it** (3(b)). Recommended: **yes**; the alternative (each shooter stops at its own Reach) makes a low-Dexterity squad-mate's shots worthless on a foe the specialist has already broken.

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| Reach: plates held 2 / 3 / 4 / 6 | `guardPool` (`character.ts:1899`) over `techniques.json rules.guard.max, per_durability`; `classes.json defender.resource.max_by_rank`; `ladder.ts guard_pool` | the pool reads the door's `ladder` (new reader); `max_by_rank` retired; `per_durability` retired |
| A plate's soak `6 x deal column x Endurance x feed` | `guardSoak` (`physical/core.ts:121`), `rules.guard.soak 6`, the feed `plate_soak` | the level column `deal` in place of `scale`; Endurance's slope read from `attributes.json` |
| The Guard technique +2 | `guardGain` (`physical/core.ts:134`), `rules.guard.gain_base`, `gain_per_point` | `gain_base 2`, `gain_per_point 0` |
| Slam's blow, Bite 100 / 120 / 140% | Slam's row (`skills.json` durability unlock 1 effect 2), op `deal` with an `amounts` block | add the block (a `plate` profile row in `rules.json output.profiles`; a `cash:guard` per part); `res.guard` becomes "all, at least 2" |
| Overbrace, its injury | a `toggle` on Slam's action (predicate `toggle`); `rollInjury` (`unitstate.ts`) | the injury op (see "Needs": the `injured` row, `conditions.json:992`, is a narrator op) |
| Brace fills to Reach | Brace (`classes.json:4364`), op `resource` | its `value` reads Reach (the ladder reader) |
| Hold Their Eyes | op `resource` on trigger `damaged`, predicates `actor_has`, `by_hit`; `limit per_round each target` | a new row on `classes.json defender` (data) |
| Retort, Reforge reworked | `retort` (`classes.json:104`) amounts `event:amount`; `reforge` (`:232`) op `resource` | Retort's `per` reads the soak of that blow (`event:` field of the soak, `guardSoaked` in ctx); Reforge's values read Reach |
| Rank levels 3 / 5 / 15 | `classes.json:17 rank_levels` | `{"II": 5, "III": 15}` |
| Pain Threshold +6% HP | `hp_per_level` (`skills.json:465`), `hpPerLevel` (`character.ts:798`), stat `hp` | a `hp_pct` number on the row read by `maxHp`; `hp_per_level` retired |
| Endurance's card | `attributes.json:55 derived`; `maxHp`, `injuryResistPct` (`character.ts:770, :801`) | the code reads the card's numbers (removes typed literals) |
| Sensory 6, Intimidation 6, Reaction Speed 6 door effects | the Calls' rows (`calls.json:212, :296, :335`), op `resource` on `acted`, `self_skill` | three rows of data |
| The chain x3 / x4 / x5 / x7 | `rules.momentum.max`, `fighter_max`, `classes.json fighter.resource.max`; `ensureMomentum` (`physical/core.ts:161-165`) | the door's `ladder`; `fighter_max` and the class `max` retired |
| Bite 25 / 30 / 35% (Run Through 20 / 25 / 30%) | `numbers.per_momentum_pct` on Coup, Throw Down, Run Through (`techniques.json:1060, :1235, :1188`), read in `finishers.ts:49, :151, :236` | the number reads the ladder's Bite; the payoff reads `S(n)` |
| Cleave and Break counts on `S(n)` | `finishers.ts:73, :101-103` | the count reads `S(n)` rounded down |
| Launch on Coup's payoff | `launch` amounts (`classes.json:718`) | its `per` becomes the cash part |
| Overswing | a `toggle` on the Finisher; `off_balance` (`conditions.json`), op `condition` `skip_save` on self | data |
| Measured Blow: half the steps back | `finisher` (`classes.json:4281`) op `resource` | its value reads the steps spent (`event:` field) |
| Raw Power +5% on melee; Strength +10% | `rules.json:1830 profiles.melee` (attr 0.05, skill 0); `factors.melee` (`:1987`) | slopes 0.1 and 0.05; `factors.melee` retired with the scale drafter |
| Guts +1 against Fear | `saveBonus` and `save_heart` (stat family `save_<...>`); `skills.json:992 per_point` | a row with `context: fear` (if `save_mod` takes a context, as its fields say) |
| Pressure Reach 2 / 3 / 4 / 5, tier offsets | `pressureCap` (`physical/pressure.ts:15-17`), `rules.pressure.max, elite_max, boss_max` | the cap reads the best Reach laid this fight less a tier offset (`elite_off 1`, `boss_off 2`): inside the Pressure system's own function |
| Takes spend all, at 2 AP; the payoffs | `take_cost` (`physical/core.ts:948, :1032`); the Take rows' `ap` (`techniques.json:2379-2650`) | `take_cost` becomes "all, at least 2"; four `ap` values 3 to 2; the payoffs read `S(n)` |
| Overpress | a `toggle`; Heat (the gun's); stat `always_seen` | a one-round condition row giving `always_seen` |
| Athletics Defense from 1 | `skills.json:1561 defense_from`, `athDefense` (`character.ts:824`) | `defense_from 1` |
| Agility +5% Dexterity damage | `rules.json:1840 profiles.gun` | slope 0.05, k 1 |
| Break Them at most 3; Hot Loads; Run and Gun | `classes.json:1282, :4087, :1455`; `load_special` (`techniques.json:2233`), `cost_mod`, `resource` | data |
| Door marks I / II / middle / III | the drill bar (`physical/data.ts:118-145` `addDrill`, `drillMarks`) | the keyed practice track (see "Needs") |
| Drill: worthy hits, x4, marks 600 / 1,200 / 1,800, martial x1.5 | `techniques.json:99-117 drill`; `physical/rules.ts:84-94` | the numbers; the worthy test reads `enemies.json levels.gap` |
| Weapon Mark II +1 hit, Mark III +10% | `drillMark` (`physical/data.ts:121`); a weapon's to-hit and damage terms | two numbers on `rules.drill` read where the weapon's terms are built |
| Mark effects (start with a plate, a step, a pip; wear relief; a cheaper Push) | `momentum_start`, `addGuard` at fight start, `DECAY` (`physical/rules.ts:116`), the Push toggles | conditions on a mark held; read by the existing hooks |
| "Keeps the chain / plates / Pressure" | the existing exceptions: `ctx.part` and `guardUp` (`physical/rules.ts:62-75`), `pressureFilter` (`links.ts:181`), `DECAY` | one stat family answered on the moves' rows (see "Needs") |

## Needs a new primitive

Five, all general; the first three are the same pieces every door drafter needs, for the lead to consolidate once.

| Primitive | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **The door ladder** | a `ladder` array on a door's rules row (`{points, reach}`, `{points, bite}`, set-from-points), and one reader `doorLadder(x, door)` returning `{reach, bite}`; Figments' `ladderAt` (`figments.ts:45`) becomes its first user | the only by-points table reader is Figments' own; Guard's pool is a typed `min()`, Momentum's top a constant plus a class field, Pressure's cap a tier switch |
| **The cash-out sum** | `rules.json output.cash_out.step 1.2` and one function `cashSum(n)`; a number-block source `cash:<resource>` (one line in `SOURCE_SPACES`, `effects/triggers.ts:373`) giving `S(n)` of the units the action spent (plus one when its Push toggle is on) | no source reads "units spent in this action"; Finishers multiply by the count inside each handler (`finishers.ts:49, :73, :101, :151, :236`), five copies of one rule |
| **The keyed practice track** | the drill bar (`addDrill`, `drillMarks`, `physical/data.ts:118-145`) keyed by any string (`weapon:<id>`, `door:<id>`), its thresholds and gifts from data | drill is hard-wired to a weapon id and to kills |
| **The wear guard** | a stat family `wear:<resource>` (a multiplier, 0 = no wear) asked at the three wear sites (`physical/rules.ts:64`, `:74`; `links.ts:181`; the Pressure fall, `physical/rules.ts:116`) with the action in ctx; answered by `stat_mod` on the tagged moves' rows | the exceptions today are typed in each site (`ctx.part`, `guardUp`, `parryWon`); a tag from another door has nowhere to go |

| **An injury op** | op `injure` (one line in `OPS`, `effects/triggers.ts`) calling the existing `rollInjury` (`unitstate.ts`) on the holder or the target, with its location rolled as a critical's is | checked: the `injured` row (`conditions.json:992`) is a `narrator` op and rolls nothing, and no item op rolls an injury; Overbrace's price needs it (if refused, Overbrace's price falls back to Bleeding on yourself, which exists) |

## What re-records

| Guard | What moves, and why |
| --- | --- |
| The damage tables (`test/golden-damage*.test.ts`, `test/golden/*.json`) | every melee, gun and thrown number (new slopes, the level column), every Finisher (the sum and Bite), Launch, Into the Wall, Retort, the plate soak (the `deal` column and Endurance), Slam's new blow |
| The costs tables (`golden-costs*`) | Takes 3 to 2 AP; Rout 1 AP for the Skirmisher; Slam "all"; Brace's gain; the Guard technique's gain; `take_cost` |
| The rules tables (`golden-rules`) | Pressure caps and states by Reach; the chain's top; Break's save; Cleave's count; Overswing, Overbrace, Overpress |
| The item-ops table (`golden-itemops`) | Hold Their Eyes, Retort, Reforge, Measured Blow, Break Them, Hot Loads, Run and Gun rows |
| The conditions table | the Push conditions (Off Balance on self, the Seen row) |
| The replay guard (`test/replay-hash.test.ts`) | every seeded game: HP, damage, AP and Pressure all move |
| Old saves (`test/old-save.test.ts`) | a new HP revision (`HP_REV`, `character.ts:807`): a migration keeps each character's share of its bar, as rules 1.36 did; the Bulwark's held Guard is clamped to the new Reach; drill bars keep their totals |
| Ladder and screen tests (`ladder.ts` rows, `protodata.json`) | Durability's, Raw Power's and Dexterity's per-point rows; the Bulwark's pool row; Athletics' first point |
| The Survival measures (`test/balance/survival-run.ts`, `npm run balance`) | everything; read, not held to a line |
| The amount-literals and lint baselines | shrink: `maxHp`, `injuryResistPct`, `carryLimit` stop typing numbers; the five Finisher copies of the per-step rule become one |
