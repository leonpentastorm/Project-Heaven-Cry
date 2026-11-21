# The doors of Body: Guard, Momentum, Pressure (0.34 rebalance, design draft 02, second draft)

Drafter's file for the lead. **Nothing here is built.** This draft applies the lead's rulings (`00-rulings.md`: A4, A5, A7, A8, B11 to B13, C16 to C20, D22, D23) and fixes the critics' findings that name this file (table "Critics' findings" at the end). Above it stand the charter and Leon's rulings (`../proposals/2026-11-21-the-curve.md` sections 10 to 18), its six laws (sections 2 and 3) and the Momentum pattern (section 16), which section 2 completes.

**Every shared number is 01's** (`01-scale.md`, final for this pass; printed by `tools/balance/scale.py`): the factor x0.6, the level columns (T4: `deal`, `mend`, the enemy columns), the cards and profiles (T5, T5b), character HP (T6), a plate's soak (section 7, T8), armour (T8b), the grade ladder (T9), Margins (section 9, T10), the stack rule (section 10.1) and the top-of-scale check (T11). This file quotes them by name and types none of its own. **Every rate is 05's** (`05-pacing.md` section 4: drill, door Marks, the worth of a gain). Facts about today carry `file:line` and were read in `E:/phc-wt/rel030` (`release/0.34-final`) on 21 Nov 2026. Every proposed number is **PROVISIONAL** with one line of reason a player would recognise; nothing is fitted to a percentage, a line or a ceiling.

## 0. Shared rules this file uses (once, for all three doors)

1. **Reach and Bite on the door row, with the family rule (B13).** Each door's rules row (`techniques.json rules.guard`, `rules.momentum`, `rules.pressure`) gets a `ladder` of rows `{points, reach}` and `{points, bite}` by the alpha's points, read by **S2, the door ladder** (Figments' `ladderAt`, `figments.ts:45`, generalised). **A door's top Reach needs its family:** the Reach step at 7 needs the door's beta at 4; the step at 10 needs the beta at 7 and the gamma at 4. Short of that, the character holds the step below. *Reason: with 38 points one door can be taken to its top and a second held at the step below; the specialist's other skills buy a Reach nobody else can afford twice.* PROVISIONAL, flagged for Leon by the ruling.
2. **The cash-out sum.** A cash-out that spends `n` units pays on `S(n) = (1.2^n - 1) / 0.2` (S(2) 2.2, S(3) 3.64, S(4) 5.37, S(5) 7.44, S(6) 9.93, S(7) 12.92, S(8) 16.5), read from **S3, the cash-out source** (`cash:<resource>` in `SOURCE_SPACES`, `effects/triggers.ts:373`; the ratio in `rules.json output.cash_out.step` 1.2). Each door's row adds its own constant (critic-consistency minor 1): a Finisher and a Take pay `1 + Bite x S(n)` plain hits; a Slam pays `Bite x S(n)` plates. A count payoff (foes struck, a save made harder) is `S(n)` rounded down. Every Body cash-out **spends all** of its counter (as Finishers do today, `physical/core.ts:169 spendMomentum`): the player's choice is *when*, never a slider.
3. **Margins** (01 section 9) add to the cash-out factor `C`, never multiply it (01 section 10.1): a Finisher or a Take that beats the Defense by 8 adds two Margins of the plain hit. A Slam and a Retort have no roll and no Margins.
4. **The Push at skill 8, one shape for all nine doors (critic-consistency M8).** Once a turn, a toggle on the cash-out: for that action the door's Reach is +1 (**S5, `res_max:<resource>`**, the `ties_max:` family generalised, written by a one-action condition) and one unit is added before it spends, so the cash-out pays `S(n + 1)`; its price is a condition on you. *Reason: one more unit than you built, and the bill is yours, the same on every door.*
5. **Marks on a door (05 owns the rate).** Each door row's `marks` are **[2, 11, 17, 23] hours x that door's units an hour for a specialist** (05 section 4), read by the simulator; this file names the unit and the gifts. Counted against worthy foes only (05's worth of a gain, **S7 `growthWorth`**). Carried by **S4, keyed Marks** (the drill bar, `physical/data.ts:118-147`, keyed `door:<id>`), whose gifts are rows run by ops that exist.
6. **Every beta point counts from the first (C20).** The beta's feed gains a flat term (`effects/feed.ts:37 doorFeed`, today `1 + feed x alpha x beta`): **`1 + own x beta + feed x alpha x beta`**, the form 03 also uses (03 question 4), one formula for all nine betas. The three Body betas: `own` **0.02** a point, PROVISIONAL. *Reason: a point of Pain Threshold, Guts or Athletics moves its door on any character, even one whose alpha is low.*
7. **What a cost is** (01 section 6, T7b). AP is the clock and never scales; plates, chain steps and pips are counts and never scale. A unit's *worth* grows with the columns (a plate is a share of a same-level hit at every level), so spending one is the same choice at level 1, 10 and 20. No Body door has an MP or core cost; none is proposed.

## 1. Endurance: the door of Guard (Durability; Pain Threshold; Sensory; the Bulwark, id `defender`)

### 1(a) Today

**The counter.** Plates (`res.guard`). Pool: `min(rules.guard.max 4, floor(Durability x per_durability 1))` (`character.ts:1899 guardPool`; numbers `techniques.json:28-43`). The Bulwark's pool is 5 / 6 / 7 at ranks I / II / III whatever its Durability (`classes.json:71 resource.max_by_rank`); the ladder's row reads the larger (`ladder.ts:18 guard_pool`).

**A plate's worth.** `max(1, round(soak 6 x scaleOf(level) x the feed))` (`physical/core.ts:121 guardSoak`; `soak` at `techniques.json:38`), spent in the `damage_in` listener after shields (`physical/guard.ts:91-97`). One plate is kept back unless the hit would drop you (`keep_back 1`, `:39`). Pressure laid on you comes off plates first, a plate a pip (`pressure_per_point 1`, `:40`). A hit a plate soaked part of costs no Momentum (`physical/rules.ts:70-75`).

**What builds it.** The Guard technique (a Link, 1 AP, `techniques.json:890`): `gain_base 1 + gain_per_point 1 x (Durability - 1)`, +1 with a shield, x2 with a shield in each hand (`physical/core.ts:134 guardGain`; `techniques.json:32-35`), so from Durability 4 one use fills the pool. Brace (the Bulwark's, 2 AP, `classes.json:4364`). Drive (fork) and Siege Engine (Achieved) give plates.

**What spends it.** Soaking (passive). Challenge (`skills.json:86-93`): Durability 2, 1 AP and 1 plate, foes within 2 tiles are Taunted. Slam (`skills.json:189-215`): Durability 5, 2 AP and 2 plates, every adjacent foe pushed 1 tile and Off Balance on a failed Body save, **no damage**. Interpose (`interpose_durability 3`, `interpose_cost 1`, `techniques.json:41-42`). Shield Bash (`techniques.json:2826`): a plate for a Momentum. Retort (`classes.json:104`) and Shrug It Off (`:179`) spend plates and the reaction.

**The ladder** (`skills.json:48`): 1 the door (the Guard technique; roll with Durability while holding Guard); 2 Challenge; 3, 6, 7, 9 perk steps; 4 fork Provoke or Cover Them; 5 Slam; 8 fork Stand Fast or Drive; 10 Mastered Last Wall (`perks.json:11120`).

**Pain Threshold** (beta, `skills.json:448`): the feed `feed 0.01` x Durability x Pain Threshold on a plate (`:463`), `elemental_taken 0.06` a point (`:464`, held by `combat.elemental_taken_cap` 0.8), `hp_per_level 2` (`:465`, read at `character.ts:798`). Perk steps 3, 5, 7, 9; Mastered Walking Wounded (`perks.json:11204`).

**Sensory** (gamma, `skills.json:613`): +1 to sense a point, the Call Warn (`calls.json:296`; steps at 1, 4, 8; 3 AP from 1, 2 from 5, 1 from 9, twice and on the reaction at 10, `calls.json:8-23`). Mastered Skin Map (`perks.json:11248`).

**Endurance's card** is true in the engine but **typed in code**: max HP `100 + 15 x (End - 1) + (level - 1) x (5 + 2 x PT)` (`character.ts:798`, `:801`), injury resistance `10 x (End - 1)` (`:770`).

**What the engine really pays.** Durability above 4 adds no plate; the 1-AP Guard technique gives what the 2-AP Brace gives, so Brace is dominated; Pain Threshold's feed is 0 for a character with no Durability.

**The Bulwark** (`classes.json:58`): rank I Brace and Called Out (Challenge free, the named foe Taunted with no save); rank II (attribute 5, level 6: `classes.json:12-21`) Retort, Shrug It Off; rank III (attribute 8, level 12) Reforge (`:232`), Anchor (`:273`), Stand Behind Me (`:310`). Its class-wide thing is the bigger pool, which C16 moves onto Durability.

### 1(b) Durability's ladder: Reach and Bite

**Reach** is the plates you can hold. **Bite** is what a Slam throws back for each plate it pays on, in plates' soaks (one plate's soak is 01's section 7: one number read by the soak, the Slam and Retort).

| Durability | Exists there (kept) | Reach (plates) | Bite (plates' soak a plate in a Slam) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: the Guard technique; roll with Durability while holding Guard | **2** | **2.5** | **Slam, the door's cash-out** (1(c)) |
| 2 | Challenge | | | |
| 3 | perk step | | | |
| 4 | fork: Provoke or Cover Them | **3** | | |
| 5 | (Slam today) | | | **Slam shoves**: every foe it strikes is pushed 1 tile and saves (Body) or is Off Balance (today's Slam, kept at its point) |
| 6 | perk step | | **3.0** | |
| 7 | perk step | **4** (needs Pain Threshold 4) | | |
| 8 | fork: Stand Fast or Drive | | | **the Push: Overbrace** |
| 9 | perk step | | **3.5** | |
| 10 | Mastered: Last Wall | **6** (needs Pain Threshold 7 and Sensory 4) | | |

PROVISIONAL, all of it. Reach 2 / 3 / 4 / 6 is the curve's row (section 2). *Reasons: a tank who put ten points into the wall holds half again what a 7 holds; a plate thrown back hits two and a half to three and a half times what it would have soaked, so the wall's whole weight lands.* Bite at 9 is set so a Reach-10 Slam reaches five digits on one foe at level 20 in Relic as well as Celestial (A8's test; 1(c)).

Every point is felt: 1, 4, 7, 10 Reach; 1, 6, 9 Bite; 2 and 5 a verb; 3, 6, 7, 9 a perk; 8 the fork and the Push; every point +5% on every plate and every shield blow (Durability's card, 01 4.2) and +1 to hit while holding Guard for a wall whose best melee skill is Durability (kept).

**The Guard technique stops growing with Durability: +1 plate a use** (+1 with a shield; a shield in each hand still doubles it): `gain_base 1`, `gain_per_point 0`. PROVISIONAL. *Reason: on 01's plate a plate is a third to most of a same-level Soldier hit, so raising one is an AP's work; filling six takes six AP (three with a shield), and Brace becomes the Bulwark's way to fill at once.* The per-point row "+1 plate a point from 2" (`skills.json:76-77`) is replaced by the Reach rows.

**A plate's soak is 01's** (section 7, T8): `3.6 x Stat(guard: Endurance, Durability) x deal(level) x the worn armour's grade`, then Pain Threshold's feed (1(g)). 02 adds nothing to it.

### 1(c) The cash-out: Slam, from Durability 1

**Slam** (Durability 1; 2 AP; spends **all** your plates, at least 1): every foe next to you takes `one plate's soak x Bite x S(plates spent)`, its armour applies. From Durability 5 each is also pushed 1 tile and saves (Body) or is Off Balance, as today (Stand Fast and Drive keep their forms). The plate's soak is read **before** Pain Threshold's feed: the beta protects, the alpha and Endurance hit. PROVISIONAL. *Reason: the wall that stood and took it hits back with everything it stood for, and is open afterwards.* Slam's gate in data moves from Durability 5 to 1 (`skills.json:203 if.self_skill.durability`); the push and the save take the `if` of 5.

The other spends (counts, never scaled; a plate is worth the same share of a same-level hit at every level):

| Spend | AP | Plates | Why it stays a choice |
| --- | --- | --- | --- |
| Soak (passive) | 0 | as many as the hit needs, keeping 1 back | each plate soaked is one fewer for the Slam |
| Challenge | 1 | 1 (0 for the Bulwark: Called Out) | a plate for a turn of the foes' attention |
| Interpose | reaction | 1 | your reaction and a plate for a friend's hit |
| Slam | 2 | all | the whole wall for one blow on everything beside you |
| Shield Bash | 1 | 1 (in place of 1 Momentum) | unchanged |

**The compounding rule applied** (one Slam on one adjacent foe, against the same character's plain ram-plate blow: 2 AP, the same AP as a Slam; numbers from `scale.py`'s `plate` and the `melee` profile, T5; a Slam strikes every adjacent foe, so two foes beside you double the column "per foe"):

| Who | Plates spent | Slam per foe | In plain shield blows, per foe | How often it cashes out |
| --- | --- | --- | --- | --- |
| Durability 1, Endurance 4, level 1 | 2 | 3.15 x 2.5 x 2.2 = 17 | 0.6 | every turn (two Guard techniques and a Slam) |
| Durability 4, Endurance 5, a mixed character, level 1 | 3 | 3.88 x 2.5 x 3.64 = 35 | 1.0 | about every turn and a half |
| Durability 6, Endurance 7, level 1 | 3 | 4.80 x 3.0 x 3.64 = 52 | 1.2 | about every turn and a half |
| Durability 7, Endurance 7, level 2 (Reach 4) | 4 | 6.05 x 3.0 x 5.37 = 98 | 1.8 | about every 2 turns |
| Durability 9, Endurance 9, level 10, Masterwork | 4 | 44.9 x 3.5 x 5.37 = 844 | 2.1 | about every 2 turns |
| Durability 10, Endurance 10, level 20, Relic | 6 | 394.6 x 3.5 x 9.93 = 13,715 | 3.9 | about every 3 turns, if the plates are not soaked away first |
| the same, Celestial | 6 | 460.4 x 3.5 x 9.93 = 16,000 | 3.9 | |
| the same, Celestial, with Overbrace | 7 | 460.4 x 3.5 x 12.92 = 20,812 | 5.0 | once a turn at most; it costs an injury roll |

The mixed character Slams more often for a blow a foe; the specialist holds six plates, soaks through them as it goes, and is paid for every plate it did not lose. **For 01's T11:** Guard's row reads Reach 6, Bite 3.5 at 9, Slam = plate x Bite x S(n), Overbrace +1: 16,000 a foe in Celestial, 13,715 in Relic, five digits either way; its largest hit (Overbrace, no roll, no Margins) 20,812 can carry a sum of about +380% under 100,000.

### 1(d) The Push at Durability 8: Overbrace

The shape of 0.4: once a turn, a Slam counts **one plate more than you hold** (Reach +1 for the action, `res_max:guard`). That plate is your own body: when the Slam lands **you roll an injury** (S16, the `injure` op calling `rollInjury`, `combat.ts:1750`; Endurance's +10% a point to ignore it applies, so the hardy pay less often). If the op is refused, the price falls back to Bleeding on yourself, which exists. PROVISIONAL. *Reason: the charter's Guard Push ("soak one blow past your last plate: an injury roll") in the one Push shape.*

### 1(e) Marks on Guard (C18: earned by soaks as well as by Slam)

**The unit:** a plate, counted when it is **spent** (Slam, Retort, Challenge, Interpose, Shield Bash) **or when it soaks part of a worthy foe's blow**. Thresholds: 05's rule, `[2, 11, 17, 23] hours x a Guard specialist's plates an hour` (the simulator reads it; a wall that soaks and Slams spends about 10 to 14 plates a fight, so its bar fills from walling as well as from hitting). *Reason: a player who only wants to be a wall fills its bar by being one.*

| Mark | About (05) | What it gives (PROVISIONAL) | The reason a player sees |
| --- | --- | --- | --- |
| I | hour 2 | each fight starts with 1 plate (**stacks** with Brace's start plate: two `resource` ops on `combat_start`) | you walk in with your guard already up |
| II | hour 11 | Pressure laid on you no longer strips your plates (`wear:guard` 0 at the Pressure site, `links.ts:181`) | gunfire stops wearing you down; only blows do |
| the middle | hour 17 | the Guard technique gives 1 more plate | you raise the wall twice as fast |
| III | hour 23 | Overbrace costs no injury once a fight | the first time you give your body, it holds |

### 1(f) Tags for mixed characters

What wears Guard: a soak (spending, by design) and Pressure laid on you (`links.ts:181-188`). What keeps it, from other doors (each an answer on that move's row to **S6, `wear:<resource>`**): **Slide** and **Head Down** shed your Pressure without a plate going with it; **Duck and Roll** keeps your plates on the step; being **Hidden** lays no Pressure on you already. What Guard keeps for other doors: a plate that soaked part of a hit keeps the chain (exists, `physical/rules.ts:72`); the Guard technique keeps the chain on any hit (exists); **Challenge** on a Pressed foe keeps its Pressure from falling at the end of its next turn.

### 1(g) Pain Threshold and Sensory, points 1 to 10

**Pain Threshold, the beta (how Guard protects you).**

| Points | Exists (kept) | Each point (PROVISIONAL) | New |
| --- | --- | --- | --- |
| every point | +6% elemental damage resisted (under `elemental_taken_cap` 0.8, kept by 01 section 12) | **+6% max HP** (A5, 01 section 5), in place of "+2 HP a level"; the plate feed **`1 + 0.02 x PT + 0.005 x Durability x PT`** | HP and plates from the first point, on any character |
| 3, 5, 7, 9 | perk steps (Numb, Still Standing, Second Wind, Close Guard) | | |
| 4 and 7 | | | open Durability's Reach at 7 and at 10 (B13) |
| 10 | Mastered: Walking Wounded | | |

*Reasons:* +6% of the bar is the same share at every level (01's T6: one point is +5 HP at level 1 and +262 at level 20 for Endurance 4, Pain Threshold 4). The feed's per-pair number halves (0.01 to 0.005) and gains the flat `own` 0.02 (0.6): **on 01's plate, which already grows with both cards and the armour's grade, today's feed would make a level-20 wall's plate swallow a whole same-level Soldier hit** (394.6 x 2.0 = 789 against a hit of 970, 01 T8) and the wall would never need to be rebuilt; at 1.7 it is 671, about two thirds of a hit. At level 1 the specialist's plate soaks 5.8 (4.80 x 1.20), a third of a Soldier hit of 18; a full wall of six at level 20 is about 37% of its bar (6 x 671 against 10,816, T6). A point of Pain Threshold moves three numbers at once: 6% of HP, 6% of elemental, and every plate by 2% plus half a percent a Durability point.

**Sensory, the gamma (Guard outside a fight: Warn, and the voice).**

| Points | Exists (kept) | New (PROVISIONAL) |
| --- | --- | --- |
| 1 | Warn (step 1: the ally steps a tile out of the attack), 3 AP, reach 5; +1 to sense; the voice | |
| 2 | +1 to sense, reach 6 | **A Warn that lands gives you 1 plate** (you read the blow before it came) |
| 3 | perk step | |
| 4 | Warn step 2 (up to 2 tiles) | opens Durability's Reach at 10 (B13) |
| 5 | Warn at 2 AP; perk step; Overreach | |
| 6 | +1 to sense, reach 10 | **the Warn's plate becomes 2** |
| 7 | perk step | |
| 8 | Warn step 3 (the attack at -2 to hit) | |
| 9 | Warn at 1 AP; perk step | |
| 10 | Mastered: Skin Map; Warn twice a turn and on the reaction | |

*Reason:* point 2 was a tile of reach and nothing a fight sees (critic-player 8); the door effect sits there and doubles at 6. The plate is a `resource` op on the Call's own row (`when: acted`), capped by your Reach as every plate is.

### 1(h) Endurance's card made true (01 section 4.2, quoted)

Endurance: **+10 base HP** a point above 1 (A5's formula, 01 section 5), **+10% a plate soaks and a Slam** and **+10% shield blows** (the `guard` and `melee` profiles, 01 T5), **+10% to ignore an injury** (kept; it now also prices Overbrace). The numbers leave code (`character.ts:770`, `:798`, `:801`) for `attributes.json endurance.derived` (01's Built from). A point of Endurance outside your main attribute is never dead: it is HP, injuries and every plate.

### 1(i) The Bulwark

**What only the Bulwark has** (not on the skill chain, C16): it is **paid for being hit**.

- **Hold Their Eyes** (class gain from rank I), new: each blow that lands on you from a Taunted foe gives you 1 plate after the blow is soaked (once a round from each foe). Data: a `resource` op on `damaged`, `if: {actor_has: [taunted], by_hit: true}`, `limit: {per: per_round, each: target}` (all exist). *Reason: Challenge and Called Out draw the fire; this turns the fire into the wall, a loop no other class has.* Those plates soak, so they also fill Guard's Marks (1(e)).
- **Brace** is the Bulwark's alone and the one way to fill to Reach in a single action.

The bigger pool (`max_by_rank` 5 / 6 / 7) goes to Durability's Reach (C16). Its held plates in a saved fight clamp to the new Reach (migration); nothing on the sheet is lost (B15).

**Ranks** (B12: I at level 3, II at 5, III at 15; the attribute thresholds 5 and 8 stay, `classes.json:12-16`; `rank_levels` `classes.json:17-21` becomes `{"I": 3, "II": 5, "III": 15}`; a 0.33 character holding rank III before 15 keeps it, B15).

| Rank | Move | Today, against the test (about 1.5 plain actions of the same AP when its set-up is met) | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| I | Brace (2 AP) | **Fails**: the 1-AP Guard technique gives the same plates | Fill your plates to your Reach; Braced (+2 Defense until you move, and you can't be pushed while Braced); start each fight with 1 plate (stacks with Guard's Mark I). At Reach 4 it is four Guard techniques for two AP, and the Defense on top |
| I | Called Out (passive) | Passes | kept; with Hold Their Eyes, the class's engine |
| I | Hold Their Eyes | new | above |
| II | Retort (reaction) | **Fails**: a plate and the reaction for half a Soldier's blow back | **A one-plate Slam on the striker**: spend 1 plate and the reaction when a melee blow lands on you while you hold Guard; the striker takes `one plate's soak x Bite x S(1)`, its armour applies (Slam's own amount block). At level 10, Durability 9, Masterwork: 44.9 x 3.5 = 157, about 0.4 of a plain blow for no AP |
| II | Shrug It Off (reaction) | Passes | kept |
| III | Reforge (passive) | **Fails at rank III**: +2 plates when at 1 or none | At your turn's start, holding half your Reach or less, fill to half your Reach (3 at Reach 6): the wall rebuilds itself after a Slam |
| III | Anchor | Passes | kept |
| III | Stand Behind Me | Passes | kept; a Taunted shooter's shot it takes gives a plate by Hold Their Eyes |

## 2. Strength: the door of Momentum (Raw Power; Guts; Intimidation; the Breaker, id `fighter`)

This completes the curve's section 16; its ladder, Bite, Coup table, Push and Marks are kept as written.

### 2(a) Today

**The counter.** The chain (`res.momentum`): 3 for everyone, 5 for a Breaker (`techniques.json:8-9 max, fighter_max`); a fight starts at 1 (`:10`; `physical/core.ts:215 momentumStart`, plus the stat `momentum_start`: the Breaker's Wind-up +2, `classes.json:394`).

**What builds it.** A plain melee hit +1; Shield Bash +1; Charge Carries +2 on a Charge that hits (`classes.json:535`); Read the Swing, Unstoppable, Wrecker (`:846`); Rolling Start and Grindstone (`forks.json:806, :847`).

**What spends it.** A Strike or an Opener 1 (`techniques.json:11-13`; the first Opener a fight free); a Finisher all (at least 2, `numbers.momentum` 2 at `:1071`, `:1113`, `:1157`, `:1200`): Coup +25% a step (`:1060`; `physical/melee/finishers.ts:49`), Cleave one more adjacent foe a step (`:1102`; `finishers.ts:73`), Break a Body save at -1 a step or Stunned (`:1146`; `finishers.ts:101-103`), Run Through +20% a step and Pinned (`:1188`; `finishers.ts:151`), Throw Down +25% a step on a held foe (`:1235`; `finishers.ts:236`). Launch (`classes.json:718`) spends all: `22 + 5.5 x Momentum` on the melee profile, then a throw.

**What wears it.** Each tile walked (`step_loss 1`) and each damaging hit taken unless Guard is up, the hit was Parried or a plate soaked part of it (`hit_loss 1`; `physical/rules.ts:62-75`); Guts divides both (`physical/core.ts:226 wearMomentum`, the feed `1 + 0.01 x Raw Power x Guts`, carrying the fraction).

**The ladder** (`skills.json:762`): 1 the door; 2 Grapple; 3, 6, 7, 9 perk steps; 4 fork Rolling Start or Grindstone; 5 Throw Down; 8 fork Spill or Headlong (`forks.json:895, :942`); 10 Mastered Earthbreaker (`perks.json:11288`).

**The cards against the engine.** Strength's card +10% physical and +5 kg a point (`attributes.json:78`); Raw Power's +5% a point. The melee profile (01 T1: k 1.15385, attribute slope 0.05, skill 0) pays about +3.8% a Strength point and nothing for Raw Power; `factors.melee 1.35` held a ceiling. Carry `20 + 5 x (Strength - 1)` is typed (`character.ts:766`).

**Guts** (beta, `skills.json:992`): the feed, +1 on Body saves a point. **Intimidation** (gamma, `skills.json:1155`): Threaten (`calls.json:335`; steps at 1, 4, 8).

**The Breaker** (`classes.json:360`): gain Charge Carries, Four Ways to Finish (`:627`), Launch, Wrecker, Breach (`:881`), Into the Wall (`:923`), Hurl (`:990`); rank I Barrel In (`:4158`), Wind-up; rank II Riposte (`:4211`), Read the Swing; rank III Measured Blow (`:4281`), Unstoppable.

### 2(b) Raw Power's ladder (the curve's section 16, with B13)

**Reach** is the chain's top. **Bite** is a damage Finisher's bonus for each step spent (Coup, Throw Down, Run Through, Launch).

| Raw Power | Exists (kept) | Reach (chain) | Bite (per step spent) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Coup, Cleave, Break | **x3** | **25%** (Run Through 20%: it pins as well) | the cash-out sum on every Finisher |
| 2 | Grapple | | | |
| 3 | perk step | | | |
| 4 | fork: Rolling Start or Grindstone | **x4** | | |
| 5 | Throw Down | | | |
| 6 | perk step | | **30%** (Run Through 25%) | |
| 7 | perk step | **x5** (needs Guts 4) | | |
| 8 | fork: Spill or Headlong | | | **the Push: Overswing** |
| 9 | perk step | | **35%** (Run Through 30%) | |
| 10 | Mastered: Earthbreaker | **x7** (needs Guts 7 and Intimidation 4) | | |

PROVISIONAL (the curve's). Every point besides: +1 to hit (heavy melee, bare hands) and **+5% damage with the rows that hit with Raw Power** (Raw Power's card, now true: 01 4.2, T5). Earthbreaker is restated by 07 as a Finisher row paid by the cash-out source (critic-consistency M9); its point on this ladder is kept.

**The count Finishers under the sum** (0.2): Cleave strikes `S(n)` rounded down more adjacent foes (x3 3, x4 5, x5 7: from x5 everyone beside you), each at full damage; Break's save is harder by `S(n)` rounded down (x3 -3, x4 -5, x5 -7, x7 -12; a Boss is Dazed, as today). PROVISIONAL. *Reason: seven steps of an unbroken chain buy a near-certain Stun on anything short of a Boss.*

**The Breaker's chain of 5 goes to Raw Power** (C16): a Breaker at Raw Power 7 with Guts 4 holds x5 as today; short of that, x4. What only it has is 2(i).

### 2(c) The cash-out: the Finisher

| Spend | AP | Chain | Why it stays a choice |
| --- | --- | --- | --- |
| A Strike or an Opener | the technique's | 1 (first Opener a fight free) | a step now, or a bigger Finisher later |
| A Finisher | the weapon's (as a plain blow) | all (at least 2) | the whole chain; the next walk or hit starts it again from 0 |
| Launch (the Breaker) | 2 | all (at least 2) | as Coup, then the throw |
| Barrel In, Riposte | as today | 1 | |

The Coup in plain hits of the same weapon is the curve's section 16 table, kept: Raw Power 1 at x3 **1.9**; 4 at x4 **2.3**; 7 at x5 **3.2**; 10 at x7 **5.5**; with Overswing at x8 **6.8**; each Margin adds a quarter of the plain blow plus a point of Perception (01 section 9) on top. In numbers: a maul blow (base 27, 01 T5b) at Strength and Raw Power 7, level 1, Standard, is 67 (01 T12), so a x5 Coup is about 214; at level 20 the T11 Coup (an Ork wreck saw, 10 and 10, Celestial) is **35,411**, Relic 30,352: five digits. The mixed character cashes out twice as often for less than half the blow; the specialist waits about four turns for x7.

**Launch** becomes `the weapon's plain blow x (1 + Bite x S(n))` on the melee profile (a `cash:momentum` part on its amount block), then the throw as today. Its `base` and `per` (01 T2b: 13 and 3.3 after x0.6) retire with the change; **01's T2b row for them goes** (a note for 01). PROVISIONAL. *Reason: the Breaker's own Finisher pays what a Coup pays and moves the foe on top.*

### 2(d) The Push at Raw Power 8: Overswing

The shape of 0.4: once a turn, a Finisher counts one step more than you hold (`res_max:momentum` +1 for the action); **you are Off Balance until your next turn** (`conditions.json off_balance`, put on yourself with `skip_save`). Kept from the curve.

### 2(e) Marks on Momentum

**The unit:** a chain step spent by a Finisher (Launch included) that lands on a worthy foe. Thresholds: 05's rule. Gifts kept from the curve section 16: **I** (hour 2) a fight starts at 2, not 1 (the stat `momentum_start` +1; **stacks** with Wind-up's +2, `momentumStart` adds every answer, so a Breaker starts at 4); **II** (hour 11) a hit taken costs a step only once a round (`wear:momentum` on the hit site, once a round); **the middle** (hour 17) a Charge that hits builds one more; **III** (hour 23) Overswing costs nothing once a fight.

### 2(f) Tags for mixed characters

What wears the chain: walking, being hit (`physical/rules.ts:62-75`). Other doors' moves that **keep the chain** (answers to `wear:momentum`): Fire and Move's and Run and Gun's free steps (the Skirmisher's: a free move counts as a walk today), Shadow's Vault and Fade, the step of a Warn or a Cue an ally gives you. The Guard technique and a soaking plate keep it already. What the chain keeps for other doors: a **Finisher on a Pressed foe** does not let its Pressure fall at the end of its next turn; a **Grappled or held foe's** Pressure does not fall.

### 2(g) Guts and Intimidation, points 1 to 10

**Guts, the beta (how the chain sustains you).**

| Points | Exists (kept) | Each point (PROVISIONAL) |
| --- | --- | --- |
| every point | the feed (Momentum kept); +1 on Body saves | the feed gains the flat term (0.6): **`1 + 0.02 x Guts + 0.01 x Raw Power x Guts`**; **+1 on saves against Fear** too (`save_mod` with `context`, which the op has) |
| 3, 5, 7, 9 | perk steps (Into the Dark, Steady, Point Man, Unflinching) | |
| 4 and 7 | | open Raw Power's Reach at 7 and at 10 (B13) |
| 10 | Mastered: Nothing Left to Fear | |

*Reason:* +1 on a d20 save is a twentieth of the die; two saves move on every point, and the chain is kept a little better on any character from the first point.

**Intimidation, the gamma (the chain outside a fight: Threaten, and the voice).**

| Points | Exists (kept) | New (PROVISIONAL) |
| --- | --- | --- |
| 1 | Threaten (step 1), 3 AP, reach 5; the voice | |
| 2 | reach 6, harder to shake | **A Threaten that lands gives you 1 Momentum** (they flinched; you are already moving) |
| 3 | perk step | |
| 4 | Threaten step 2 (it can't move toward you) | opens Raw Power's Reach at 10 (B13) |
| 5 | Threaten at 2 AP; perk step; Overreach | |
| 6 | reach 10, harder to shake | **the Threaten's Momentum becomes 2** |
| 7 | perk step | |
| 8 | Threaten step 3 (-2 AP) | |
| 9 | Threaten at 1 AP; perk step | |
| 10 | Mastered: The Name They Whisper; Threaten twice a turn and on the reaction | |

### 2(h) Strength's card made true (01 section 4.2, quoted)

Strength: **+10% damage with the melee rows that scale with it** (heavy melee, the light melee rows on Strength, bare hands) and on the `physical` profile (Hurl, Grenadier's Arm), multiplied by the alpha's +5% (A4; 01 T5); **+5 kg carried** (kept; moved from `character.ts:766` to `attributes.json strength.derived`). `factors.melee` and `MELEE_FACTOR` fold into the profile's `k` and go (01 4.1). Bows and thrown weapons read Agility and Dexterity (01 4.1), not Strength; a draw bow's Raw Power rides its Stat term (01 section 2). A Strength point outside your main attribute is never dead: every swing and every load.

### 2(i) The Breaker

**What only the Breaker has**: **the room is its weapon.** Wrecker, Breach, Into the Wall and Hurl (cover, doors, bodies and barrels turned into Momentum and damage), and **Launch**, the Finisher only it knows. All kept, class gain from rank I.

| Rank | Move | Against the test | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| gain | Launch (2 AP, all, at least 2) | Borderline (about one plain blow plus the throw at x3) | Coup's payoff, then the throw (2(c)) |
| gain | Into the Wall | Passes | its slam keeps 01's base (T2b: 7.2) on the melee profile and `deal` |
| gain | Four Ways to Finish | Passes | kept; its "x1.2 under 50% HP" is a part of the one sum (A8: +20%) |
| gain | Charge Carries, Wrecker, Breach, Hurl | Pass | kept (Hurl on 01's T2b: 6.0 and 0.15 a kg, `physical` profile) |
| I | Barrel In, Wind-up | Pass | kept (Wind-up +2 stacks with Mark I) |
| II | Riposte, Read the Swing | Pass | kept |
| III | Measured Blow | Passes weakly at rank III | **A Finisher that drops its target leaves you half the steps it spent** (rounded down; once a fight). A x7 chain that kills keeps x3: the Breaker rolls from one body to the next |
| III | Unstoppable | Passes | kept |

## 3. Agility: the door of Pressure (Dexterity; Athletics; Reaction Speed; the Skirmisher, id `marksman`)

### 3(a) Today

**The counter.** Pips on a target (`u.pressure`; `techniques.json:54-94`): a foe holds at most 4, an Elite 3, a Boss 2, a player 3 (`physical/pressure.ts:15-18 pressureCap`, registered with `setResMax('pressure', ...)` at `:98`); Pressed at 2, Suppressed at 3, Broken at 4 (`techniques.json:60-62`). A player never loses AP to Pressure. **Dexterity never moves the cap.** A unit records who pressed it (`Unit.pressBy`).

**What builds it.** The first Dexterity hit a shooter lands on a target each turn +1 (`skills.json:1302`); Press techniques (Suppress `techniques.json:1821`, Rake, Warning Shot, Flush, Mag Dump, Crossfire); a comrade shot down within 3 tiles (`kill_spill`, `:71-72`); the Skirmisher's Relocated (`classes.json:1195`), Hold the Lane (`:1345`), Run and Gun (`:1455`); forks Converging Fire, Walk It In (`forks.json:1018, :1075`).

**What spends it.** A Take needs a Pressed target and spends 2 pips (`take_cost 2`, `:73`): Dead Centre +50% (`techniques.json:2379`, **3 AP flat**, `:2384-2388`), Pin Down, Rout, Stopping Shot, Storm, Last Round (`:2426-2650`). Flush Out (`pressure.json`, Dexterity 5). Its payoff never grows with the pips.

**What wears it.** At the end of the holder's turn 1 (2 in cover and unseen, 2 closing in: `decay`, `decay_hidden`, `decay_closing`, `:66-68`), then Athletics' feed (`physical/rules.ts:109-120`, its `DECAY` list); a melee hit sheds the attacker's own (`:69`).

**The ladder** (`skills.json:1302`): 1 the door; 2 Slide; 3, 6, 7, 9 perk steps; 4 fork Converging Fire or Walk It In; 5 Flush Out; 8 fork Through the Gap or Lockdown (`forks.json:1114, :1205`); 10 Mastered Trick Shot (`perks.json:11490`). Per point today: +1 to hit (guns, light blades, thrown), +2% critical damage.

**The cards against the engine.** Agility's +0.5 tile an AP and +1 Initiative are true, typed (`character.ts:821 movement`, `:817 initiativeBonus`). The gun profile reads Agility at about +2.5% a point (01 T1) and Dexterity not at all; Dexterity's +2% critical sits under `CRIT_MAX` 2.0 (`character.ts:853`).

**Athletics** (beta, `skills.json:1544`): the feed (Pressure shed, Slide's reach), +1 Defense a point **from point 2** (`:1561 defense_from 2`, read at `character.ts:824 athDefense`), though the code comment says "from 1". **Reaction Speed** (gamma, `skills.json:1704`): Initiative, the Call Cue (`calls.json:212`).

**The Skirmisher** (`classes.json:1066`): gain Reflex (`:1094`), Fire and Move (`:1123`), Relocated, Break Them (`:1282`); rank I Hold the Lane, Fire Discipline (`:4020`); rank II Duck and Roll (`:1410`), Special Ammo (`:4087`); rank III Run and Gun, Killzone (`:4119`).

### 3(b) Dexterity's ladder

**Reach** is the most Pressure your hits can lay on one target. **A target's cap is the best Reach anyone laid on it this fight, less 1 for an Elite and 2 for a Boss** (C19); a player still stops at 3 (`player_max`). The offsets are **data on each tier row** (`enemies.json items[].pressure_off`: 0 / 0 / 0 / 1 / 2), never a tier name in code (critic-consistency minor 9, section 5 item 2); the best Reach is read from the units in the target's `pressBy`, inside `pressureCap` (already the registered max). **Bite** is a damage Take's bonus for each pip spent.

| Dexterity | Exists (kept) | Reach (pips on a foe) | Bite (per pip spent) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: hits lay Pressure | **2** (Pressed) | **20%** | every Take spends all and pays on the sum |
| 2 | Slide | | | |
| 3 | perk step | | | |
| 4 | fork: Converging Fire or Walk It In | **3** (Suppressed) | | |
| 5 | Flush Out | | | |
| 6 | perk step | | **25%** | |
| 7 | perk step | **4** (Broken; needs Athletics 4) | | |
| 8 | fork: Through the Gap or Lockdown | | | **the Push: Overpress** |
| 9 | perk step | | **30%** | |
| 10 | Mastered: Trick Shot | **5** (and Broken lasts: a foe at 5 is still Broken after its turn's fall; needs Athletics 7 and Reaction Speed 4) | | |

PROVISIONAL. Reach 2 / 3 / 4 / 5 is the curve's row. *Reason: a shooter learns first to make a foe flinch, then to pin it, then to break it; the specialist's fifth pip Breaks an Elite (4) and Suppresses a Boss (3), which today nobody can.* Bite is smaller than Momentum's because the pips come from the whole squad. Dexterity 1 to 3 no longer drive a foe to Broken alone: Reach is bought (C16); their pips are still the specialist's to cash.

Every point besides: +1 to hit with Dexterity weapons (and through Margins, more than a twentieth) and **+5% damage with them** (Dexterity's card: `numbers.crit` 0.02 becomes `damage` 0.05, 01 4.2; the critical is gone, A7).

### 3(c) The cash-out: the Take

**A Take spends all the target's Pressure** (at least 2), wherever it came from: a damage Take (Dead Centre, Last Round) pays `1 + Bite x S(n)` plain shots (plus its Margins); Pin Down's save is harder by `S(n)` rounded down and its Pinned lasts 1 round more at 3 pips; Rout's save harder by `S(n)` rounded down; Stopping Shot pushes 1 tile and takes 1 AP, +1 of each at 3 pips; Storm's move +1 tile a pip. PROVISIONAL.

**A Take costs what a plain shot of that gun costs** (`ap: {base: "weapon", add: 0}` on the six Take rows, in place of a flat 3 or 2; 19 techniques read the weapon's AP this way today). PROVISIONAL. *Reason: a Take is a shot; at a flat 3 AP Dead Centre on 2 pips paid 1.44 shots for the price of 1.5 of a 2-AP rifle and was worse than shooting, while a 3-AP long rifle paid the same as everyone.*

| Spend | AP | Pips | Why it stays a choice |
| --- | --- | --- | --- |
| A Take | the gun's shot | all on the target (at least 2) | spending frees the foe: Suppressed and Broken end with it |
| Flush Out | 2 | as a Take | the same |
| Slide | 1 | 1 of **your own** | |
| Suppress | 3 | none (it lays 2) | build or shoot |

**The compounding rule applied** (Dead Centre in plain shots of the same gun, for the same AP; the pips can be the squad's):

| Who | Pips spent | One Dead Centre | How often it cashes out |
| --- | --- | --- | --- |
| Dexterity 1 | 2 | 1.44 shots | every turn in a squad, every second turn alone |
| Dexterity 4, a mixed character | 3 | 1.73 shots | about every 2 turns |
| Dexterity 7 (Athletics 4) | 4 | 2.34 shots | about every 2 to 3 turns |
| Dexterity 10, a specialist | 5 | 3.23 shots | about every 3 turns alone, every 2 in a squad |
| the same, with Overpress | 6 | 3.98 shots | once a turn at most |

In numbers: a specialist's service-rifle shot at level 1 (7 and 7, Standard) is 35 (01 T12), so a 4-pip Dead Centre is about 81; at level 20 T11's Dead Centre (a long rifle, 10 and 10, Celestial) is **16,060**, Relic 13,766: five digits (01 T11 "holds"). The Take is a squad's question: who holds the shot that spends what everyone laid.

### 3(d) The Push at Dexterity 8: Overpress

The shape of 0.4: once a turn, a Take counts **one pip more than the foe holds** (above its cap too: `res_max:pressure` +1 for the action). The price, a one-round condition on you (**Overpressed**): you are **Seen** (the stat `always_seen`) and your gun runs hot (the stat `heat_limit` -2: the next bursts jam sooner). Both stats exist. PROVISIONAL. *Reason: the curve's Pressure Push ("the gun is hot and may jam; you are Seen") in the one Push shape, built from what the engine has.*

### 3(e) Marks on Pressure

**The unit:** a pip spent by your Takes and Flush Outs on worthy foes. Thresholds: 05's rule.

| Mark | About (05) | What it gives (PROVISIONAL) | The reason a player sees |
| --- | --- | --- | --- |
| I | hour 2 | your first Dexterity hit each fight lays 1 more pip | the first shot of the fight already rattles them |
| II | hour 11 | Pressure you laid falls by at most 1 a turn (cover unseen and closing in no longer double it; `wear:pressure` asked of the units in the target's `pressBy`) | they can't shake you off by hiding |
| the middle | hour 17 | Suppress lays 1 more pip on a hit | |
| III | hour 23 | Overpress costs nothing once a fight | the first long burst of a fight comes free |

### 3(f) Tags for mixed characters

What wears Pressure on a foe: its turn's fall (`physical/rules.ts:109-120`). Other doors' moves that **keep Pressure** on a foe (answers to `wear:pressure`): a Finisher or a Grapple on it (2(f)); a Challenge (1(f)); a landed Threaten; Shadow's Tag; a Judged foe (prayer). What Pressure's moves keep for other doors: Slide keeps the chain (a forced move is no walk, today) and keeps plates (1(f)); Fire and Move's and Run and Gun's free steps keep the chain (2(f)).

### 3(g) Athletics and Reaction Speed, points 1 to 10

**Athletics, the beta (how Pressure protects you).**

| Points | Exists (kept) | Each point (PROVISIONAL) |
| --- | --- | --- |
| every point | the feed (Pressure shed, Slide's reach); +1 Defense | **+1 Defense from point 1** (`defense_from` 2 becomes 1, C20); the feed gains the flat term (0.6): **`1 + 0.02 x Athletics + 0.01 x Dexterity x Athletics`** |
| 3, 5, 7, 9 | perk steps (Wall Run, Roll With It, Untouchable, Catch) | |
| 4 and 7 | | open Dexterity's Reach at 7 and at 10 (B13) |
| 10 | Mastered: Never There | |

*Reason:* +1 Defense moves every enemy's hit chance on you by a twentieth and, under Margins, takes a Margin off some of their rolls; the first point was dead.

**Reaction Speed, the gamma (Pressure outside a fight: Cue, Initiative, and the voice).**

| Points | Exists (kept) | New (PROVISIONAL) |
| --- | --- | --- |
| 1 | Cue (one more reaction), 3 AP, reach 5; Initiative from -2 to 0; the voice | |
| 2 | +1 Initiative, reach 6 | **A Cued ally's reaction shot lays 1 more pip** (you called the moment; they caught it) |
| 3 | perk step | |
| 4 | Cue step 2 (or a step) | opens Dexterity's Reach at 10 (B13) |
| 5 | Cue at 2 AP; perk step; Overreach | |
| 6 | +1 Initiative, reach 10 | **the Cued shot's extra pips become 2** (still capped by the target's cap) |
| 7 | perk step | |
| 8 | Cue step 3 (they go straight after you) | |
| 9 | Cue at 1 AP; perk step | |
| 10 | Mastered: Before the Blink; Cue twice a turn and on the reaction | |

### 3(h) Agility's card made true (01 section 4.2, quoted)

Agility: **+10% damage with Dexterity weapons** (guns, bows, light blades, thrown: the rows' own pair, 01 4.1; no hidden pin), multiplied by Dexterity's +5% (A4; the `gun`, `bow`, `thrown` profiles of 01 T5); **+0.5 tile of movement an AP** and **+1 Initiative** (kept; their numbers leave `character.ts:817`, `:821` for `attributes.json agility.derived`). An Agility point outside your main attribute is never dead: it is movement for everyone.

### 3(i) The Skirmisher

**What only the Skirmisher has**: **two reactions and fire on the move.** Reflex (a second reaction a round), Fire and Move and Relocated, kept as class gain from rank I. The reaction economy (held shots, Killzone, Duck and Roll) is its game and nobody else's.

| Rank | Move | Against the test | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| gain | Reflex, Fire and Move, Relocated | Pass | kept |
| gain | Break Them (Rout 1 AP less; saves harder by 1 a pip, at most 2) | Passes | Rout 1 AP less than the gun's shot; the save bonus **at most 3** (the Reach an Elite now reaches) |
| I | Hold the Lane, Fire Discipline | Pass | kept |
| II | Duck and Roll (reaction) | Passes | kept |
| II | Special Ammo | **Fails the class test**: three special loads a rest, while Items 2.0 gives every shooter special rounds by calibre and Load Special (`techniques.json:2233`) | **Hot Loads**: once a turn Load Special costs no AP, and a special round you fire lays 1 more pip |
| III | Run and Gun | **Fails at rank III**: a 2-tile free move overlaps Fire and Move | Once a turn after you attack, your next move **up to a full AP of your Movement** is free, with no opportunity attack, and your next hit lays 1 more pip |
| III | Killzone | Passes | kept |

## 4. Weapon drill and the physical techniques (all three doors)

**Today.** 66 techniques (`techniques.json items`). Drill is per weapon id, earned only by kills: everyone who hit the victim gets `per_kill` by its tier (vermin 1, minion 5, soldier 10, elite 25, boss 50, `techniques.json:100-106`), x3 for the three Body classes (`martial_mult`, `:107-112`); marks at 300, 900, 1,800 (`:113-117`): Mark I the weapon's signature technique, Marks II and III a pick (`physical/data.ts:121-130`).

**The rate is 05's** (D22, 05 section 4, quoted): `per_kill` **20 / 35 / 70 / 180 / 360**, `martial_mult` **1.5**, marks **unchanged at 300 / 900 / 1,800**, every gain x its worth by the level gap (S7); Mark III in about 2.6 hours for anyone using the weapon every fight, 1.8 for a martial class. No saved mark moves.

**What a mark gives is 02's** (critic-consistency S10), PROVISIONAL: Mark I the weapon's signature technique (kept); Mark II a pick and **+1 to hit with this weapon** (*it sits in your hand right*); Mark III a pick and **+10% damage with this weapon**, a part of the one sum (A8), and later the slot that copies its Weapon Art (not in 0.34). A pick never offers a technique you know. Data: two numbers on `rules.drill` (`mark_hit`, `mark_damage_pct`), read where the weapon's terms are built.

**The 80% (D23)** counts techniques against all 66: 05's reading is about 17 weapons drilled for 80%, which a specialist reaches at about hour 42 (05 section 4). The ready limit is unchanged.

## 5. How a player spends (38 Skill and 20 Attribute points, B11 and B12)

**The point count** (B11): 10 Skill and 10 Attribute points at creation, 28 and 10 from levelling. **The swap** (B12): odd levels give 2 Skill points and even levels 1 Skill and 1 Attribute point, **except levels 4 and 14 (2 Skill points) and 5 and 15 (1 Skill and 1 Attribute point)**. **Gates:** ceiling 7 to level 4, 8 at 5, 9 at 10, 10 at 15; class at 3, rank II at 5, rank III at 15 (the class's attribute at 8). **The family rule** (B13) opens a door's Reach at 7 and 10. HP is 01's T6 formula; a plate's soak is 01's T8 with 1(g)'s feed; the armour grade is 01's stated grade for the level (section 3.2).

**An Endurance specialist (the Bulwark).** Creation: Endurance 7, Agility 3, Strength 2, Perception 2; Durability 6, Pain Threshold 4.

| Level | Buys | What the player gets | Felt? |
| --- | --- | --- | --- |
| 1 | creation | Reach 3 (Durability 6), Bite 3.0; Slam on 3 plates (52 a foe), Challenge, the fork, perk steps at Durability 3 and 6 and Pain Threshold 3; HP 149; a plate soaks 5.8 | yes |
| 2 | Durability 7; Agility 4 | **Reach 4** (Pain Threshold 4 met), a perk step; Slam 98 a foe; +0.5 tile an AP | yes |
| 3 | Sensory 1, 2; **the Bulwark** | Warn, and a Warn that lands gives a plate; Brace, Called Out, Hold Their Eyes | yes |
| 4 | Pain Threshold 5, 6 | a perk step; +12% HP; plates +8% | yes |
| 5 | Endurance 8; Durability 8; **rank II** | Overbrace, the fork Stand Fast or Drive; Retort, Shrug It Off; +10 base HP, plates +7% | yes |
| 6 | Pain Threshold 7; Strength 3 | a perk step (Durability's Reach at 10 now needs only Sensory 4); +10% shield blows | yes |
| 7 | Sensory 3, 4 | a perk step; Warn step 2 | yes |
| 8 | Pain Threshold 8; Perception 3 | +6% HP and plates; a Margin worth a point more, +2 tiles of vision | yes |
| 9 | Sensory 5, 6 | Warn at 2 AP, a perk step; the Warn's plate becomes 2 | yes |
| 10 | Endurance 9; Durability 9 | Bite 3.5, a perk step; HP 1,266 (End 9, PT 8) | yes |
| 11 | Pain Threshold 9, Sensory 7 | two perk steps | yes |
| 12 | Sensory 8; Agility 5 | Warn step 3; movement | yes |
| 13 | Sensory 9, Raw Power 1 | Warn at 1 AP, a perk step; Momentum's door opens (Coup at x3) | yes |
| 14 | Athletics 1, Raw Power 2 | +1 Defense; Grapple | yes |
| 15 | Endurance 10; Durability 10; **rank III** | **Reach 6**, Last Wall; Reforge, Anchor, Stand Behind Me; HP 3,827 | yes |
| 16 | Pain Threshold 10; Strength 4 | Walking Wounded | yes |
| 17 | Sensory 10, Raw Power 3 | Skin Map; a perk step | yes |
| 18 | Raw Power 4; Perception 4 | the chain at x4, the fork | yes |
| 19 | Athletics 2, 3 | +2 Defense, a perk step | yes |
| 20 | Strength 5; Raw Power 5 | Throw Down; HP 10,816 | yes |

Endurance's three skills reach 30 at level 17 (Durability 10 at 15). No level buys nothing: the swap puts Endurance's point and Durability's rung on 5 and 15 together, and Pain Threshold's +6% makes 4, 6 and 8 felt (critic-player 4 and 7).

**A Dexterity specialist (the Skirmisher).** Creation: Agility 7, Perception 3, Endurance 2, Strength 2; Dexterity 6, Athletics 4.

| Level | Buys | What the player gets | Felt? |
| --- | --- | --- | --- |
| 1 | creation | Reach 3 (Dexterity 6), Bite 25%; Slide, Flush Out, the fork, perk steps; +4 Defense; a service-rifle shot about 33 (18 x 01's `gun` Stat at 7 and 6) | yes |
| 2 | Dexterity 7; Perception 4 | **Reach 4** (Athletics 4 met): it Breaks a foe alone; a perk step | yes |
| 3 | Reaction Speed 1, 2; **the Skirmisher** | Cue, and a Cued shot lays a pip more; Reflex, Fire and Move, Relocated, Break Them, Hold the Lane, Fire Discipline | yes |
| 4 | Athletics 5, 6 | a perk step; +2 Defense | yes |
| 5 | Agility 8; Dexterity 8; **rank II** | **Overpress**, the fork; Duck and Roll, Hot Loads | yes |
| 6 | Athletics 7; Endurance 3 | a perk step; HP | yes |
| 7 | Reaction Speed 3, 4 | a perk step; Cue step 2 | yes |
| 8 | Athletics 8; Perception 5 | +1 Defense; a Margin worth a point more | yes |
| 9 | Reaction Speed 5, 6 | Cue at 2 AP, a perk step; the Cued shot's pips become 2 | yes |
| 10 | Agility 9; Dexterity 9 | Bite 30%, a perk step | yes |
| 11 | Athletics 9, Reaction Speed 7 | two perk steps | yes |
| 12 | Reaction Speed 8; Endurance 4 | Cue step 3; HP | yes |
| 13 | Reaction Speed 9, Ingenuity 1 | Cue at 1 AP, a perk step; the Shadow door opens (03) | yes |
| 14 | Ingenuity 2, 3 | Shadow's rungs (03) | yes |
| 15 | Agility 10; Dexterity 10; **rank III** | **Reach 5**, Trick Shot; Run and Gun, Killzone | yes |
| 16 | Athletics 10; Perception 6 | Never There | yes |
| 17 | Reaction Speed 10, Ingenuity 4 | Before the Blink; Shadow's Reach at 4 (03) | yes |
| 18 | Ingenuity 5; Endurance 5 | Shadow's rung (03); HP | yes |
| 19 | Ingenuity 6, Analysis 1 | Shadow's Bite (03); the search TN from the first point | yes |
| 20 | Perception 7; Ingenuity 7 | Shadow's Reach at 7 needs Analysis 4: it stays at the step below (B13) | yes |

**A sensible mixed character (the wall that hits back, Guard and Momentum).** Creation: Endurance 5, Strength 5, Agility 2, Perception 2; Durability 5, Raw Power 5.

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | Guard Reach 3, Bite 2.5: Slam on 3 plates (37 a foe) with its shove; the chain x4, Bite 25%, Throw Down; HP 100 |
| 2 | Guts 1; Strength 6 | a save, the chain kept better; +10% every blow |
| 3 | Guts 2, 3; the class of the higher attribute: **the Breaker** | a perk step; Launch and the room as a weapon |
| 4 | Guts 4, Raw Power 6 | Bite 30%, a perk step |
| 5 | Endurance 6; Pain Threshold 1; rank II | +6% HP; HP and plates from Endurance; Riposte, Read the Swing |
| 6 | Strength 7; Raw Power 7 | **x5** (Guts 4 met), a perk step |
| 7 | Pain Threshold 2, 3 | a perk step; +12% HP |
| 8 | Endurance 7; Pain Threshold 4 | HP and plates |
| 9 | Durability 6, 7 | Bite 3.0; **Reach 4** (Pain Threshold 4 met); two perk steps |
| 10 | Strength 8; Raw Power 8 | **Overswing**, the fork |
| 11 | Guts 5, 6 | a perk step |
| 12 | Endurance 8; Durability 8 | **Overbrace**, the fork |
| 13 | Guts 7, Intimidation 1 | Threaten |
| 14 | Intimidation 2, 3 | a landed Threaten gives a step; a perk step |
| 15 | Strength 9; Raw Power 9; **rank III** | Bite 35%; Measured Blow, Unstoppable |
| 16 | Endurance 9; Intimidation 4 | Threaten step 2; HP and plates |
| 17 | Durability 9, Pain Threshold 5 | Bite 3.5; two perk steps |
| 18 | Strength 10; Raw Power 10 | **x7** (Guts 7, Intimidation 4 met), Earthbreaker |
| 19 | Pain Threshold 6, 7 | a perk step |
| 20 | Endurance 10; Durability 10 | Last Wall; **Guard's Reach stays 4** (Sensory 0): the second door at the step below (B13) |

The mixed character Slams at 3 or 4 plates and Coups at x4 or x5 every two turns, a Guard technique keeps its chain, and two door bars fill. Taking both doors to the top would need Sensory 4 as well: four points it does not have, which is B13's point. No level of it buys nothing.

## Questions for the lead

None: the rulings settle every question the first draft asked (38 and 20 points, the swap, Margins in place of the critical, the Pressure cap).

## Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency S1 (02 on the charter's x0.45) | FIXED | every absolute number is 01's or computed from 01's formulas (`scale.py`'s `plate`, the profiles of T5, HP of T6); the old 6, 40, 1.35 and the maul of 20 are gone |
| consistency S4 (gun and thrown slopes) | FIXED | A4 as 01 4.2 states it: Agility +10% and Dexterity +5% on Dexterity weapons; Strength on the melee rows and `physical`, not thrown (2(h), 3(h)) |
| consistency S7 (Pain Threshold, Endurance) | FIXED | A5 quoted: +6% max HP a point; Endurance +10 base HP (1(g), 1(h)) |
| consistency S8 (a plate) | FIXED | 01's section 7 plate, quoted; Slam's table re-run on it (1(c)) |
| consistency S9 (Dexterity's critical, Q3) | FIXED | the critical goes (A7); Dexterity's line becomes +5% damage (3(b)); question removed |
| consistency S10 (drill) | FIXED | 05's rates and thresholds quoted; 02 owns only the Mark II and III gifts (section 4) |
| consistency M2 (four-digit cash-outs) | FIXED | Guard: Bite 3.5 at 9 gives 16,000 a foe in Celestial and 13,715 in Relic; Pressure and Momentum already hold on 01's T11 |
| consistency M4 (old-magnitude numbers in 02) | FIXED | `rules.guard.soak` 6 and `factors.melee` are 01's to replace; 02 types neither |
| consistency M8 (two Push shapes) | FIXED | one shape (0.4): Reach +1 for the action through `res_max:<resource>`, one unit added, the price on you |
| consistency M9 (Earthbreaker) | FIXED for 02's part | its rung stays on Raw Power's ladder; 07 restates it as a Finisher row on the cash-out source |
| consistency M10 (48 points) | FIXED | 38 and 20 (B11); every spend table redrawn (section 5) |
| consistency M11 (the gates) | FIXED | the swap (B12), used in the three tables |
| consistency minor 1 (outer formula by door) | FIXED | `cash:` returns S(n); each door row adds its constant (0.2) |
| consistency minor 2 (Marks thresholds) | FIXED | 05's formula; 02 names the unit (0.5, 1(e), 2(e), 3(e)) |
| consistency minor 9, section 5 item 2 (tier names in code) | FIXED | `pressure_off` on each `enemies.json` tier row (3(b)) |
| consistency section 4 (merged primitives) | FIXED | the closing table uses S2 to S7 and S16 by name |
| player 1 (two scales: the wall's plate) | FIXED | as S1 and S8 |
| player 2 (the specialist never ahead) | FIXED | B13's family rule on all three ladders (1(b), 2(b), 3(b)); the mixed table shows the second door held at the step below |
| player 4 (gates and the Attribute point) | FIXED | the swap (B12) |
| player 6 (the wall earns nothing; no cash-out below 5) | FIXED | Guard's Marks count plates soaked (C18); Slam from Durability 1, its shove kept at 5 (1(c)) |
| player 7 (A's levels 4, 6, 14 not felt) | FIXED | +6% HP, the swap; the Bulwark's table has no unfelt level |
| player 8 (gamma 2 is a tile) | FIXED for Sensory, Intimidation, Reaction Speed | the door effect moves to 2 and doubles at 6 (1(g), 2(g), 3(g)); the other six gammas are 03's and 04's |
| player 9 (Brace and Wind-up against Mark I) | FIXED | written "stacks", both read additively (1(e), 2(e)) |
| player 10 (Retort, Slam not worth pressing) | FIXED | Slam 1.2 to 3.9 blows a foe (1(c)); Retort is a one-plate Slam, 0.4 of a blow for no AP |
| player 11 (empty hours for the wall) | NOT FIXED here | soaks now fill the wall's Marks (1(e)); a tank profile in `pacing.py` is 05's |
| player 12 (rewards taken back) | NOT FIXED | the Reach losses (Dexterity 1 to 3 short of Broken, the Breaker's chain of 5, the Bulwark's pool) are ruled by C16; points and ranks are kept by B15; a "your sheet changed" panel is the client's |
| player 17 (damage that swings) | NOT FIXED here | the damage line naming its Margins and its cash-out is the client's text |
| player 18 (a Take spends pips anyone laid) | NOT FIXED | by design (the squad's question, 3(c)); the button's "spends 5 pips (3 yours)" is the client's text |

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| Reach: plates 2 / 3 / 4 / 6 | `guardPool` (`character.ts:1899`) over `techniques.json rules.guard.max, per_durability`; `classes.json defender.resource.max_by_rank` (`:71`); `ladder.ts:18 guard_pool` | the pool reads S2; `max_by_rank` and `per_durability` retired |
| A plate's soak | 01's section 7 (`guardSoak`, `physical/core.ts:121`; the `guard` profile) | 01's; 02 adds the feed's numbers only |
| Pain Threshold's feed `1 + 0.02 x PT + 0.005 x Dur x PT` | `doorFeed` (`effects/feed.ts:37`), `skills.json:463 feed` | `feed` 0.005; the flat term `own` 0.02 (the doorFeed extension, Needs) |
| The Guard technique +1 a use | `guardGain` (`physical/core.ts:134`), `rules.guard.gain_base`, `gain_per_point`; `skills.json` durability `guard_base`, `guard_per_point` | `gain_per_point` 0; the per-point rows retired |
| Slam from Durability 1, its shove at 5, its blow | Slam's `grant_action` (`skills.json:189-215`), ops `condition`, `displace`; op `deal` with an `amounts` block on the `guard` profile | `if.self_skill.durability` 1 on the action, 5 on the two effects; `res.guard` "all"; the amount `plate x Bite x cash:guard` |
| Overbrace | predicate `toggle`; S5 `res_max:guard`; S16 `injure` | data |
| Brace fills to Reach | Brace (`classes.json:4364`), op `resource` | its value reads the pool's max (Needs: `res:` max) |
| Hold Their Eyes | op `resource` on `damaged`, predicates `actor_has`, `by_hit`; `limit per_round each target` | a row on `classes.json defender` |
| Retort as a one-plate Slam; Reforge to half Reach | `retort` (`classes.json:104`), `reforge` (`:232`) op `resource` on `turn_start`, predicate `self_res` | Retort's amount is Slam's block with `n` 1; Reforge's numbers read the pool's max |
| Rank levels 3 / 5 / 15 | `classes.json:17-21 rank_levels`; `classRank` (`character.ts`) | `{"II": 5, "III": 15}`; the held-rank floor (05/06's migration, B15) |
| Pain Threshold +6% HP; Endurance's card | 01 section 5 (`maxHp`, `hpPerLevel`, `character.ts:798-801`; `injuryResistPct`, `:770`) | 01's |
| Gamma 2 and 6 door effects | the Calls' rows (`calls.json:212, :296, :335`), op `resource` on `acted`, `self_skill` | six rows of data |
| The chain x3 / x4 / x5 / x7 | `rules.momentum.max`, `fighter_max` (`techniques.json:8-9`), `classes.json fighter.resource.max`; `ensureMomentum` (`physical/core.ts:161`) | S2; `fighter_max` and the class max retired |
| Bite 25 / 30 / 35% (Run Through 20 / 25 / 30%) | `numbers.per_momentum_pct` on Coup, Throw Down, Run Through, read in `finishers.ts:49, :151, :236` | the number reads S2's Bite; the payoff reads S3 |
| Cleave and Break counts | `finishers.ts:73, :101-103` | the count reads `S(n)` rounded down |
| Launch on Coup's payoff | `launch` amounts (`classes.json:718`) | a `cash:momentum` part; `base` and `per` retired |
| Overswing | predicate `toggle`; S5; `off_balance`, op `condition` with `skip_save` on self | data |
| Measured Blow: half the steps back | `finisher` (`classes.json:4281`), op `resource` on `kill` | its value reads the steps the Finisher spent (`event:`) |
| Strength, Raw Power, Agility, Dexterity cards | 01 T5 (`rules.json output.profiles`; `weaponMult`, `character.ts:833`); `carryLimit` (`:766`), `movement` (`:821`), `initiativeBonus` (`:817`) | 01's profiles; the carry, movement and Initiative numbers into `attributes.json derived` |
| Guts +1 against Fear | op `save_mod` (its `context`); `skills.json:992 per_point` | a row with `context: fear` |
| Pressure Reach 2 / 3 / 4 / 5 with the tier offsets | `pressureCap` (`physical/pressure.ts:15`, registered at `:98`), `Unit.pressBy`; `rules.pressure.max, elite_max, boss_max` | the cap reads the best Reach among `pressBy` less the tier row's `pressure_off`; `elite_max`, `boss_max` retired |
| Takes spend all, at the gun's AP | `take_cost` (`techniques.json:73`); the Take rows' `ap` (`:2384` and the five after); `base: "weapon"` (19 rows use it) | `take_cost` "all, at least 2"; six `ap` blocks to `{base: weapon, add: 0}`; the payoffs read S3 |
| Overpress | predicate `toggle`; S5 `res_max:pressure`; stats `always_seen`, `heat_limit` | a one-round condition row (Overpressed) |
| Athletics Defense from 1 | `skills.json:1561 defense_from`, `athDefense` (`character.ts:824`) | `defense_from` 1 |
| Break Them at most 3; Hot Loads; Run and Gun | `classes.json:1282, :4087, :1455`; `load_special` (`techniques.json:2233`), `cost_mod`, `resource` | data |
| Door Marks and their gifts | the drill bar (`physical/data.ts:118-147`); `momentum_start`, `combat_start` `resource` ops, the Push toggles | S4 keyed `door:guard`, `door:momentum`, `door:pressure`; gifts as rows |
| Drill rates (05) and gifts (02) | `techniques.json:99-117 rules.drill`; `physical/rules.ts:84-94` | 05's numbers; `mark_hit` 1, `mark_damage_pct` 10 read where the weapon's terms are built |
| Mark III's +10% and Four Ways' x1.2 in the sum | 01 S12 (`stackDamage`, `output.ts:131`) | parts of Σ |
| "Keeps the chain / plates / Pressure" | `ctx.part`, `guardUp` (`physical/rules.ts:62-75`), `pressureFilter` (`links.ts:181`), `DECAY` (`physical/rules.ts:116`) | S6 answered on the moves' rows |

## Needs a new primitive

General pieces only, under critic-consistency's merged names; none is per-item, and each is shared with other doors.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S2. The door ladder** | `ladderAt` (`figments.ts:45`) generalised to any door row's `ladder` (`{points, reach}`, `{points, bite}`), each row may name `needs: {<skill>: points}` for B13's family rule, the step below held when unmet | only Figments read a by-points table; Guard's pool is a typed `min()`, Momentum's top a constant plus a class field, Pressure's cap a tier switch |
| **S3. The cash-out source** | `cash:<resource>` in `SOURCE_SPACES` (`effects/triggers.ts:373`) returning `S(n)` of the units the action spent; the step in `rules.json output.cash_out.step` | no source reads units spent in this action; five copies of the per-step rule in `finishers.ts` |
| **S4. Keyed Marks** | the drill bar keyed by string (`door:<id>`), thresholds and gifts from the track's row | the bar is weapon-only and kill-only |
| **S5. `res_max:<resource>`** | the `ties_max:` family generalised; the Push's one-action condition adds 1 | caps are typed per door (`guardPool`, `fighter_max`, `pressureCap`) |
| **S6. `wear:<resource>`** | one stat family read at the wear sites (`physical/rules.ts:64`, `:74`, `:116`; `links.ts:181`), answered by `stat_mod` with `context: {action: [...]}` | the exceptions are typed in each site |
| **S7. `growthWorth`** (05's P1) | read by the drill kill site and S4's adder | `growthHeld` is yes or no |
| **S16. The `injure` op** | one line in `OPS` calling `rollInjury` (`combat.ts:1750`) on the holder or the target | the `injured` row (`conditions.json:992`) is a Narrator op; no item op rolls an injury (fallback: Bleeding on yourself) |
| Extension: **the feed's flat term** | `doorFeed` (`effects/feed.ts:37`) reads `per_point.numbers.own` beside `feed`: `1 + own x beta + feed x alpha x beta` (03's question 4, the same piece) | C20 for all nine betas; one parameter of an existing formula |
| Extension: **a pool's max as a source** | the `res:` source answers `res:<id>.max` (the Reach S5 writes), if it does not already | Brace and Reforge read your Reach |

## What re-records

| Guard | What moves, and why |
| --- | --- |
| The damage tables (`test/golden-damage*.test.ts`, `test/golden/*.json`) | every Finisher (the sum and Bite), Launch, Slam's new blow, Retort, the Takes' payoffs and AP; the plate's feed |
| The costs tables (`golden-costs*`) | Takes at the gun's AP; Rout for the Skirmisher; Slam "all" from Durability 1; the Guard technique's +1; `take_cost` |
| The rules tables (`golden-rules`, `rules-enemies`) | the three Reaches with the family rule; Pressure caps by Reach and `pressure_off`; Break's save; Cleave's count; the three Pushes |
| The item-ops table (`golden-itemops`) | Hold Their Eyes, Retort, Reforge, Measured Blow, Break Them, Hot Loads, Run and Gun, the six Call rows, the Mark gifts |
| The conditions table | Off Balance on self, Overpressed |
| The replay guard (`test/replay-hash.test.ts`) | every seeded game: plates, chain, Pressure, AP |
| Old saves (`test/old-save.test.ts`) | the Bulwark's held Guard clamped to the new Reach in a saved fight; rank III held before 15 kept (B15); drill bars unchanged (05's thresholds) |
| Ladder and screen tests (`ladder.ts` rows, `protodata.json`) | Durability's, Raw Power's and Dexterity's rows (Reach, Bite, the family rule); the Bulwark's pool row; Athletics' first point; the three betas' feed lines |
| The Survival measures (`test/balance/survival-run.ts`) | everything; read, not held to a line |
| The lint baselines | shrink: `guardPool`'s `min()`, `fighter_max`, the five Finisher copies of the per-step rule, Pressure's tier switch leave code |
