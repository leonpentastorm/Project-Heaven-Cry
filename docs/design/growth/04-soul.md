# The doors of Soul: Bonds, Outbursts, Prayer (0.34 rebalance, design draft 04, second draft)

Drafter's file for the lead. **Nothing here is built.** Written to `docs/design/proposals/2026-11-21-the-curve.md` (the six laws, the Momentum pattern of section 16, Leon's rulings in sections 10 to 17, the charter in section 18), to **the lead's rulings `00-rulings.md`** (binding; this draft applies A4, A6, A8, A9, A10, B11 to B15, C16 to C21 and D22) and to **`01-scale.md`, which owns every shared number** (the factor, the columns, the cards, HP, MP and the cost rule, the grade ladder, Margins, the stack rule). Facts about today carry `file:line` and were read in `E:/phc-wt/rel030` (`release/0.34-final`) on 21 Nov 2026. Every proposed number is **PROVISIONAL** and carries a reason a player would recognise; nothing is fitted to a percentage or a line.

## 0. What this file reads from the others

### 0.1 Numbers: all from 01 (quoted by name, none restated)

| What | 01's name for it | Used here for |
| --- | --- | --- |
| x0.6 on every flat number | 01 section 2, T2b | every base below: Mend 2.25, Shield 2.7, Snap 1.8, the Damage school 22.2, every prayer's value |
| the damage column | `deal` (01 T4: x5.74 at 10, x40 at 20) | every amount a character deals: a Snap on a foe, a Release, a damage prayer, Smite |
| the heal column | `mend` (01 T4: x6.31 at 10, x48.4 at 20; the normal bar's growth) | every heal, shield and Bond share: Tending, Triage, the Ledger, Rally, Love, a Snap on a friend, a Soul Buff, heal and shield prayers |
| an amount's column by kind and dealer | 01 section 3.1 ("a Snap's damage on the `tend` profile reads `deal`") | Snap's damage reads `deal` on the `tend` profile; **no new profile row** (the first draft's `tend_harm` is dropped) |
| the MP column and the pool | `mp` (01 T4), Max MP (01 T7a) | every MP price and pool below |
| the cost rule | 01 section 6 items 1 to 6, T7b | which price is a count, a design, `mp`, a share |
| Strain's burn, Mana Shock | 01 T7b (6% of max HP a point over; 25% kept) | section 2(c) |
| the cards | 01 section 4.2, T5, T5b (A4) | sections 1(h), 2(h), 3(h) quote them |
| the grade ladder | 01 T9 (A9) | the Attuner grades Bonds and Tending, the Emanator Outbursts, Devotion prayer |
| Margins | 01 section 9, T10 (A7) | an Outburst Bolt or Lance that rolls; nothing else here rolls |
| the stack rule | 01 section 10.1 (A8) | each door's cash-out factor is `C`; its other bonuses go into the one sum `Σ` |
| the top of the scale | 01 T11, section 10.3 | Bonds' Bite at 9 (section 1(b)); the Release and the Hymn hold five digits |
| the normal bar | 01 T6 (Endurance 4, Pain Threshold 4: 112 / 705 / 5,406 at levels 1 / 10 / 20); the frail 60 / 396 / 3,160 | what a heal's share is read against |

**The specialist** in every table is 01's stated attacker on its door (01 section 3.2): door attribute and alpha 7 / 7 at level 1, 9 / 9 at level 10, 10 / 10 at level 20, at Standard grade. Its focus's grade (01 T9) multiplies every number; at level 20 the Celestial row is 01 T11's. The numbers are printed by a read-only script over 01's functions (`tools/balance/scale.py`: `stat`, `deal`, `mend`, `mp_pool`); each is base x Stat x column.

### 0.2 Rates: all from 05 (ruling D22)

The XP table and its hours (05 section 2: level 2 at hour 0.5, 3 at 1.25, 4 at 2.5, 5 at 4, 6 at 6.4, then 2.4 hours a level: 10 at 16, 15 at 28, 20 at 40); door Marks by `[2, 11, 17, 23] hours x the door's units an hour` (05 section 4); module practice, feeling marks and Devotion (05 section 4). This file names each door's unit and what a mark gives.

### 0.3 Points and gates (rulings B11 to B13)

- **38 Skill and 20 Attribute points in a career** (B11; creation's 10 and 10 included).
- **Gains a level** (B12): odd levels 2 Skill points, even levels 1 Skill and 1 Attribute point, **except levels 4 and 14 (2 Skill) and 5 and 15 (1 Skill and 1 Attribute)**. Ceiling 7 to level 4, 8 at 5, 9 at 10, 10 at 15. Class at 3, rank II at 5 (its attribute 5), rank III at 15 (its attribute 8). Every spend table below is redrawn on these and is legal at every level (skill <= attribute <= ceiling).
- **The specialist's edge** (B13): a door's Reach step at 7 needs its beta at 4; the step at 10 needs its beta at 7 and its gamma at 4. For the Soul doors: Bonds 3 at Empathy 7 needs Camaraderie 4, Bonds 4 at Empathy 10 needs Camaraderie 7 and Insinuation 4; stage 4 at Will Power 7 needs Composure 4, stage 5 at 10 needs Composure 7 and Lore Master 4; Grace 4 at Faith 7 needs Conscience 4, Grace 5 at 10 needs Conscience 7 and Authority 4. PROVISIONAL (flagged for Leon by B13).
- **Every beta point counts from the first** (B20): a beta's feed gains a flat term, `1 + (flat + feed x alpha) x beta` (section 5, extension E1).

### 0.4 The shared pieces (critic-consistency section 4's merged names)

**S2** the door ladder (Reach and Bite rows by points; B13's second and third `points` keys); **S3** the cash-out source `cash:<resource>` returning `S(n)` of the units spent, with `cash_share:<resource>` = `S(n) / n`; the step 1.2 in `rules.json output.cash_out.step`; each door's row carries its own constant (`1 +`, `0.8 +`, none); **S4** keyed Marks; **S5** `res_max:<resource>` (generalised `ties_max:`), which every Reach writes and every Push raises by 1 for the use (one shape, critic M8); **S6** `wear:<resource>`. `S(n) = 1 + 1.2 + 1.44 + ...`: S(1) 1, S(2) 2.2, S(3) 3.64, S(4) 5.37, S(5) 7.44, S(6) 9.93.

**The stack, for these doors** (A8, 01 10.1): `C` is the door's cash-out factor (a Snap All's `Bite x S(n)`, the Release's multiplier, Grace's multiplier); Margins add to `C` where a roll exists (a Bolt or a Lance); **everything else adds into `Σ`**: the Threads' +5% a Bond held, Taut Thread, Bitter Balm's share, Name the Sinner's +40% on a Judged or Marked foe, Sinner's Due, Witnessed, Clenched Heart, Resonance, a Bonded foe's +3 to hit (a roll term, not damage), boons, mods.

---

## 1. Insight: the door of Bonds and Tending (Empathy; Camaraderie; Insinuation; the Mender, id `bard`)

### 1(a) Today

**The counter: Bonds held** (ties of kind `bond`). Empathy 1 gives one (`tending.json:31` `tend.threads`, `stat_mod ties_max:bond +1`), Empathy 5 a second (`tending.json:317 tend.bonds_5`), Empathy 8 a third (`:339 tend.bonds_8`), the Mender one more (`:1057 tend.mender_bonds`). Allies and enemies share the count.

**What builds it.** Bond (`tending.json:361` `tend.bond`): 1 AP, an Attuner in hand, a unit in sight within 6 tiles (+3 at Empathy 6, +3 Long Thread); an enemy makes a Heart save against Empathy (Elite +2, Boss +5); machines refuse. The Mender's free Bond (`:941 tend.bond_free`): 0 AP, no range, once a turn.

**What holding pays** (`tend.threads`, all while the Attuner is in hand): 20% of damage you take goes to Bonded enemies, split; +3 to hit a Bonded enemy; 20% of every heal you give to yourself or a Bonded ally reaches each Bonded enemy as Soul damage at its next turn; +5% damage a Bond held; Tending a Bonded ally x1.2; a Bonded ally going Down costs 10 MP; you read a Bonded ally's attackers' intent. While you hold any Bond you are Traced.

**What spends it.** Snap (`tending.json:529 tend.snap`, **requires Empathy 2**, `:534-539`): 1 AP, once a turn, breaks **one** Bond: an enemy takes `3.0 x` Soul damage on profile `tend` (`:668`) and is Dazed (it saves); an ally heals `3.0 x` (`:677`). The Mender's Ledger empties into it first.

**Tending verbs.** Mend (`:707`): 2 AP, 24 MP, heals `3.75 x` (`:782`); Mend Yourself once a turn, same; Shield (`:856`, Empathy 5): 2 AP, 30 MP, a Bonded ally only, `4.5 x` (`:931`). Profile `tend`: k 3.74 x (1 + 0.06 x (Insight - 1) + 0.06 x Empathy) on the `mend` column (01 T1).

**Empathy's ladder** (`skills.json:3991`): 1 Bond and Mend; 2 Snap; 3 perk step; 4 fork Keep the Thread or Short Thread; 5 Shield; 6 perk step and +3 Bond reach; 7 perk step; 8 fork Shared Pulse or Long Thread, third Bond; 9 perk step, Mend and Shield -6 MP; 10 Mastered, Threads That Hold. Card (`skills.json` empathy `per_point`): +6% Healing given (true), Bonds at 1, 5, 8, +3 reach at 6, -6 MP at 9. **Reach never moves past 3 and Bite never moves.**

**Camaraderie** (beta, `skills.json:4217`): Share a Hit (reaction: 25% + 5% a point of a hit on an ally beside you, at most 50%; from 5 a Bonded ally in sight); the feed `heal_back` (1% x Empathy x Camaraderie of Bond healing heals you, to 30%; `effects/feed.ts doorFeed`); +10% healing received a point (**typed in code**, `character.ts:1247 healReceivedMult`, beside the row's `numbers.heal` 0.1). **Insinuation** (gamma, `skills.json:4458`): the Call Taunt (steps 1, 4, 8; price 3 AP, 2 from 5, 1 from 9); modules Anchor, Lure, Linger at 2. **Insight's card** (`attributes.json:198`): +6% healing given; -5% Soul MP (**typed**, `character.ts:901 soulCostSaving`); +25 max MP (**typed**, `character.ts:860`).

**The Mender** (`classes.json:2302`): rank I Triage (`classes.json` `move_pool` triage: 2 AP, 18 MP, heal `4.3 x`), The Ledger (heals and shields given fill it to a cap of `6.5 x`; the next damaging blow adds 70% of it), the free Bond, One More Bond, Field Surgery; rank II (attribute 5, level 6 today) Inspire (1 AP, 30 MP, Love heals `1.9 x`), Take the Weight; rank III (attribute 8, level 12 today) Brimming, Rally (2 AP, 60 MP, once a scene, `3.1 x`).

### 1(b) Empathy's ladder, points 1 to 10

**Reach is Bonds held. Bite is what one Bond is worth when it is Snapped** (the unit: **a lone Snap**, `1.8 x Stat(tend)` on `deal` against a foe and on `mend` for a friend; the Daze stays).

| Empathy | What exists (kept where it is) | Reach (Bonds held) | Bite (a Bond, Snapped) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Bond, Mend, Mend Yourself, Threads | 1 | x1.0 | **Snap moves here from 2** (C18: the cash-out from point 1), and may break one Bond or all of them (Snap All) |
| 2 | (Snap moved to 1) | | | **Tending ties:** your Mend, Shield or Triage on a friend you are not Bonded to Bonds it, free, if you have room |
| 3 | perk step | | | |
| 4 | fork: Keep the Thread or Short Thread | **2** (was at 5) | | |
| 5 | Shield | | | |
| 6 | perk step; +3 Bond reach | | **x1.3** | |
| 7 | perk step | **3** (was at 8; needs Camaraderie 4, B13) | | |
| 8 | fork: Shared Pulse or Long Thread | | | **the Push: Overbind** (1(d)) |
| 9 | perk step; Mend and Shield cost a quarter less (01 T7b) | | **x1.6** | |
| 10 | Mastered: Threads That Hold | **4** (needs Camaraderie 7 and Insinuation 4, B13) | | |

PROVISIONAL, with reasons a player sees:
- **Snap at 1.** Every door spends from its first point (C18): the one-Bond medic can still pull the thread it tied.
- **Tending ties at 2.** The medic who keeps you up is tied to you without spending a turn on it (C19 accepts it): the web is built by the healer's own work, as Momentum is built by hits.
- **Bite x1.3 at 6 and x1.6 at 9** (the first draft's x1.2 and x1.4 raised). Reason: 01 T11 shows Snap All of four at level 20 is four digits in total at x1.4 (9,187 at Celestial); A8 asks every door's full cash-out to reach five, and 01 10.3 item 2 needs x1.52. At x1.6 it is **10,500 in total** at Celestial (four Bonds; 9,000 at Relic), about 2,600 a Bond. Each Bite step makes a full Snap All a quarter bigger, which a player sees on the number.
- **Reach at 4, 7, 10**, the top two behind the beta and gamma (B13): the fourth Bond is the Insight specialist's, which a medic who also shoots cannot afford.
- Per point: Healing given +5% (01's card, A4).

### 1(c) The cash-out: Snap All, and what everything costs

**The spending moment** is Snap (1 AP, once a turn). **Snap All** breaks every Bond you hold and pays `C = Bite x S(n)` lone Snaps, shared evenly (`cash_share:bond`, `Bite x S(n) / n` to each Bond): a foe takes its share as Soul damage (no armour, as today) and is Dazed (it saves), a friend heals its share. The Ledger still empties into it first. Then you build again. A Snap lands (no roll, no Margins; the foe's save is the Daze's).

**Costs** (01 T7b; MP on the `mp` column at the payer's level):

| Verb | AP | MP (x `mp`) | Level 1 / 10 / 20 | Reason |
| --- | --- | --- | --- | --- |
| Bond | 1 | 0 | 0 | a Bond's price is the AP and, on a foe, its save |
| Let Go | 0 | 0 | 0 | unchanged |
| Snap (one or all) | 1 | 0 | 0 | the cash-out is paid by what you built |
| Mend, Mend Yourself | 2 | 12 | 12 / 18 / 26 | about eight to twelve Mends a pool at every level: a healer counts them |
| Shield | 2 | 15 | 15 / 23 / 32 | a shield is 1.2 Mends for 1.25 the price |
| Triage (Mender) | 2 | 10 | 10 / 15 / 21 | the class heals better for less (1(i)) |
| Inspire (Mender) | 1 | 12 | 12 / 18 / 26 | it must be worth pressing (1(i)) |
| Rally (Mender) | 2 | 35 | 35 / 54 / 75 | once a scene, about a third of a pool |
| Field Surgery (Mender) | 0 | 30 | 30 / 46 / 64 | out of a fight |
| A Bonded ally goes Down | | 8 | 8 / 12 / 17 | the thread hurts, on the same scale |

A Mender's pool (01 T7a's formula): Insight 7 and Determination 2 at level 1, **100 MP**; Insight 9 and Determination 3 at level 10, **197**; Insight 10 and Determination 4 at level 20, **317**. Syphon (1 AP, 2(c)) refills it.

**The compounding rule, in lone Snaps** (a lone Snap is 1 AP plus a Daze; the Bonds were bought with 1 AP each, or free through Tending ties):

| Who | Bonds held, Bite | One Snap All is worth | Each Bond's share | How often |
| --- | --- | --- | --- | --- |
| Empathy 1 | 1, x1.0 | 1.0 lone Snap | 1.0 | Bond and Snap, any turn: par |
| Empathy 4, a mixed character | 2, x1.0 | 2.2 | 1.1 | a Bond on a foe and a Mend that ties the friend, then Snap: every turn |
| Empathy 7 (Camaraderie 4) | 3, x1.3 | 4.7 | 1.6 | every second turn |
| Empathy 10, a specialist | 4, x1.6 | 8.6 | 2.15 | four Bonds over a turn (two of them laid by Mends that were full value anyway), Snapped the next, if no Bond is lost first |

The consequence that makes the web a thing to protect: a foe that saves wastes the AP, a Bonded friend going Down costs MP, every Bond keeps you Traced, and a Snap ends the Bond's passives (the share, the echo, +5% a Bond).

### 1(d) The Push at Empathy 8: Overbind

Once a turn, 0 AP: your Reach in Bonds is one higher until your next Snap (`res_max:bond` +1 by a one-use condition, S5; the Push's one shape). Snap All counts it like any other (`S(n + 1)`). **Price:** when that Bond breaks you lose **10% of your max HP** at the start of your next turn (nothing soaks it; 01 section 6 item 5: HP you pay is a share of your bar). PROVISIONAL. Reason: the curve's "you feel half of it", landing on your next turn as Law 5 asks; a torn thread costs more than a point of Strain (6%) because it is a whole Bond. With Overbind a specialist's Snap All of five is about 14,600 at level 20, Celestial, before the sum.

Snap All is the normal cash-out and Overbind the Push (the curve's table named "Snap every Bond at once" the Push): the cash-out law needs several units spent in one go, and for Bonds those units are the Bonds.

### 1(e) Marks on the door

**The unit: Bonds broken by a Snap** while the fight has a worthy foe (a friend's Bond counts then too). **Thresholds: 05's formula** (`[2, 11, 17, 23] hours x the units an hour`); at this drafter's reading of a specialist's 14 Bonds an hour that is about 28 / 154 / 238 / 322, set from the simulator's count (a reading, not a fit).

| Mark | About | Gives | Reason |
| --- | --- | --- | --- |
| I | hour 2 | your first Bond each fight costs 0 AP and has no range limit. **It stacks with the Mender's free Bond:** a Mender lays two free Bonds in its first turn | the door starts primed with 1 |
| II | hour 11 | a foe saves against your Bond at -2 | fewer wasted AP on the web |
| middle | hour 17 | Tending through a Bond is x1.3, not x1.2 | the threads you rely on carry more |
| III | hour 23 | Overbind costs no HP once a fight | the Push made safe once |

### 1(f) Tags for mixed characters

- **This door keeps others'** (`wear:<resource>`, S6): Bond, Let Go and Snap are quiet acts at a distance: they carry "keeps the chain" and "keeps plates". Mend, Shield and Triage count as **tending** for the Outburst heart's calming (exists: `soul_modules.json:77 strain.calming` row `tend`) and as the patron tag **heal / protect** (exists, `patrons.json tags`): they lay Grace for a Faithful (3(c)).
- **Others keep this door's**: nothing in another door breaks a Bond today, so no "keeps Bonds" tag is needed. The cross-door relations are the shares already written: Share a Hit with plates, a Bonded foe's +3 to hit for any weapon, and the echo of any heal (a prayer's or a stim's) reaching Bonded foes.

### 1(g) Camaraderie (beta) and Insinuation (gamma), points 1 to 10

**Camaraderie: how the door keeps you up.** Every point: +10% healing received (read from the row's `numbers.heal`, in place of `character.ts:1247`); Share a Hit +5%; **the feed with a flat term (B20):** `(2% + 1% x Empathy) x Camaraderie` of what you heal down a Bond comes back to you, to 30% (`feed_flat` 0.02, PROVISIONAL; reason: a first point of Camaraderie gives a one-Bond medic 3% back, not 1%).

| Points | Today (kept) | New |
| --- | --- | --- |
| 1 | Share a Hit 30% | |
| 2 | share 35% | |
| 3 | perk step; share 40% | |
| 4 | share 45% | **opens Bonds' third** (B13, with Empathy 7) |
| 5 | perk step; share 50%; Share a Hit reaches a Bonded ally in sight | |
| 6 | (only the per-point lines) | **Hold Together:** your first Share a Hit each round for a Bonded friend uses no reaction. Reason: the friend you are tied to never waits for your reflexes |
| 7 | perk step | **opens Bonds' fourth** (B13, with Empathy 10 and Insinuation 4) |
| 8 | (only the per-point lines) | **Both Ways:** heals a Bonded friend gives you are +25%. Reason: the Bond carries care back |
| 9 | perk step | |
| 10 | Mastered: Many Hands | |

**Insinuation: the door outside a fight, its Call and its voice.** Every point adds its full points to checks and Asks (the gamma rule) and +1 tile of Taunt reach. Kept: Taunt's steps at 1, 4, 8; the Call price at 1, 5, 9, 10; modules at 2; perk steps 3, 5, 7, 9; Mastered at 10. **New at 6, PROVISIONAL: a foe that fails your Taunt's save may be Bonded to you at once for no AP, if you have room** (the barb that hooks the heart). Reason: point 6 moved only a tile; this is a verb, and it joins Insight's gamma to its door. At 4 it also opens Bonds' fourth (B13).

### 1(h) Insight's card (01 section 4.2, A4)

| Per point above 1 | Today | 01's card | Note |
| --- | --- | --- | --- |
| Healing and shields given | +6% (true) | **+10%**, on every heal and shield you give (`healing`, `mend`, `tend`) | stims and kits included: every character carries stims, so a point of Insight is never dead |
| Max MP | +25 (true, typed in code) | **+8 x `mp`** | 01 T7a |
| Soul MP cost | -5% (true, typed in code) | -5%, read from `attributes.json derived` | kept |

### 1(i) The Mender (`bard`): what only it has

Ranks at levels **3 / 5 / 15** (B12; `classes.json:17 rank_levels` 3 / 6 / 12 today).

**Only the Mender:** **the Ledger** (a second counter fed by its own healing and cashed by its blows), **Triage** (a heal nobody else has, cheaper and stronger), and **the free Bond** each turn. **One More Bond retires** (C16: the bigger counter goes to the ladder: the fourth Bond is now everyone's at Empathy 10 with its family); the Ledger is the counter only the class can use.

| Rank | Move | Today, set-up met | Worth pressing? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| I | Triage | `4.3 x` against Mend's `3.75 x`: 1.15 Mends for the same 2 AP | **no** | base **3.4** (1.5 x Mend's 2.25, in place of 01's x0.6 value 2.58), 10 MP: one and a half of anyone's Mend. Reason: a class heal must be worth its slot |
| I | The Ledger | +70% of up to its cap banked on the next blow | yes | cap 3.9 (01 T2b), factor 0.7 kept; the banked add is a flat add to the blow's base |
| I | Bond (free) | 1 AP saved a turn, no range | yes | kept |
| I | Field Surgery | out of a fight | (not a fight move) | MP on the column |
| II | Inspire | a felt feeling to a Bonded unit; Love heals 0.5 Mend for 1 AP and 30 MP | **no** | Love's base **1.69** (0.75 x Mend's 2.25, in place of 01's 1.14), 12 MP; the other feelings' boons kept |
| II | Take the Weight | a Down prevented | yes | kept (its price, 15% of max HP, is already a share) |
| III | Brimming | passive | (passive) | kept; with the half-bar heal cap gone (A10) an overheal is common, so Brimming's 50% shield is felt |
| III | Rally | about 0.8 Mend to every Bonded ally and every ally within 4 | yes | base 1.86 kept (01 T2b), 35 MP |

### 1(j) How a player spends: the Insight specialist and a mixed medic

**The Mender** (creation: Insight 7, Endurance 3, Determination 2, Agility 2; Empathy 7, Camaraderie 3). Hours from 05 section 2. Every row is legal (skill <= attribute <= ceiling) and spends exactly the level's gains (0.3).

| Level (hour) | Buys | What the player gets |
| --- | --- | --- |
| 1 (0) | creation | **2 Bonds** (the third waits on Camaraderie 4), Bite x1.3, Snap All, Tending ties, Shield, fork a, three perk steps; Share a Hit 40%, a Camaraderie perk |
| 2 (0.5) | Camaraderie 4; Endurance 4 | **Bonds 3** (B13 met); +HP |
| 3 (1.25) | Mender rank I; Insinuation 1, 2 | Triage, the Ledger, the free Bond; Taunt; three modules |
| 4 (2.5) | Camaraderie 5, Insinuation 3 | Share a Hit for a Bonded ally, two perks |
| 5 (4) | rank II; Insight 8; Empathy 8 | Inspire, Take the Weight; fork b and **Overbind** (the Push); +10% heals |
| 6 (6.4) | Camaraderie 6; Determination 3 | Hold Together; +MP |
| 7 (8.8) | Camaraderie 7, Insinuation 4 | a perk; Taunt costs a foe +1 AP; the fourth Bond's beta and gamma gates both met |
| 8 (11.2) | Camaraderie 8; Endurance 5 | Both Ways; HP |
| 9 (13.6) | Insinuation 5, 6 | a perk, Taunt for 2 AP; Taunt Bonds |
| 10 (16) | Insight 9; Empathy 9 | **Bite x1.6**, a perk, Mends a quarter cheaper |
| 11 (18.4) | Camaraderie 9, Insinuation 7 | two perks |
| 12 (20.8) | Insinuation 8; Determination 4 | Taunt +2 AP; +MP |
| 13 (23.2) | Insinuation 9, Pain Threshold 1 | a perk, Taunt for 1 AP; +6% max HP |
| 14 (25.6) | Pain Threshold 2, 3 | +12% max HP; **the door waits one level for Insight 10** (no longer two: the swap at 14 and 15, B12) |
| 15 (28) | rank III; Insight 10; Empathy 10 | **Bonds 4**, Mastered Threads That Hold, Brimming, Rally: the biggest level of the walk |
| 16 (30.4) | Camaraderie 10; Endurance 6 | Many Hands; HP |
| 17 (32.8) | Insinuation 10, Pain Threshold 4 | Their Own Idea; HP |
| 18 (35.2) | Pain Threshold 5; Endurance 7 | HP |
| 19 (37.6) | Pain Threshold 6, 7 | HP; a perk step |
| 20 (40) | Faith 1; Virtue 2 | Whispers: breadth |

**A mixed medic** (the shooter who keeps the squad up: Agility 7, Insight 4, Endurance 2; Dexterity 6, Empathy 4; the Skirmisher at 3). **Hands:** a revolver in one hand and the Attuner in the other, as Survival's Recommended row gives a caster (`survival.json:52`): no hand swap (ruling E's count is 0 AP here). Pressure's steps are 02's; only their names are written here.

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | 2 Bonds, Snap All, Tending ties, fork a, a perk step; Pressure at Dexterity 6 |
| 2 | Camaraderie 1; Insight 5 | Share a Hit; +10% heals |
| 3 | Dexterity 7, Empathy 5 | the Skirmisher; Shield (Pressure's step at 7 waits on Athletics 4) |
| 4 | Athletics 1, 2 | Defense from the first point (B20) |
| 5 | rank II; Dexterity 8; Agility 8 | Dexterity's Push |
| 6 | Athletics 3; Insight 6 | +10% heals |
| 7 | Athletics 4, Empathy 6 | Pressure's step at 7; Bonds Bite x1.3, +3 Bond reach |
| 8 | Camaraderie 2; Insight 7 | share 35% |
| 9 | Empathy 7, Camaraderie 3 | a perk |
| 10 | Dexterity 9; Agility 9 | Dexterity's Bite |
| 11 | Camaraderie 4, Athletics 5 | **Bonds 3** |
| 12 | Empathy 8; Insight 8 | **Overbind**, fork b |
| 13 | Athletics 6, 7 | Pressure's top gate, half met |
| 14 | Reaction Speed 1, 2 | Cue |
| 15 | rank III; Dexterity 10; Agility 10 | Dexterity Mastered (its top Reach waits on Reaction Speed 4) |
| 16 | Reaction Speed 3; Endurance 3 | a perk |
| 17 | Reaction Speed 4, Camaraderie 5 | Pressure's top Reach; Share a Hit through the Bond |
| 18 | Camaraderie 6; Endurance 4 | Hold Together |
| 19 | Athletics 8, Insinuation 1 | Taunt |
| 20 | Athletics 9; Endurance 5 | a perk |

Every level buys something felt. The mixed medic cashes two Bonds every turn and three from level 11, has the Push at 12 and never holds the fourth Bond or Bite x1.6 (B13's edge: its points went to its first door's top): a different machine, two bars filling.

### 1(k) Heals, shields and shares on 01's columns (the specialist, Standard; x the Attuner's grade, 01 T9)

| Amount | Base (01 T2b, or 1(i)) | Level 1 (7/7) | Level 10 (9/9) | Level 20 (10/10) | Share of the normal bar (01 T6) |
| --- | --- | --- | --- | --- | --- |
| Mend, Mend Yourself | 2.25 | 16.5 | 126 | 1,058 | 15% / 18% / 20% |
| Shield | 2.7 | 19.9 | 152 | 1,269 | |
| Triage (Mender) | 3.4 | 25.0 | 191 | 1,598 | 22% / 27% / 30% |
| A lone Snap on a friend | 1.8, `mend` | 13.2 | 101 | 846 | |
| A lone Snap on a foe | 1.8, `deal` | 13.2 | 92 | 699 | |
| Snap All of 4 at x1.6, each Bond's share (2.15 lone Snaps) | | 28 / 28 | 217 / 197 | 1,817 / 1,501 | (friend / foe) |
| Ledger cap (Mender) | 3.9 | 28.7 | 219 | 1,833 | |
| Rally, each friend (Mender) | 1.86 | 13.7 | 104 | 874 | |
| Inspire's Love (Mender) | 1.69 | 12.4 | 95 | 794 | |
| Bond share, echo, Share a Hit, Take the Weight | shares (20%, 20%, 30 to 50%, 15% max HP) | ride the HP they move | | | |

A reading, not a target: a specialist's Mend closes about a sixth of a normal friend's bar at level 1 and a fifth at level 20 (its points grow faster than the normal share's); the `mend` column keeps the rest of the share level by level (01 3.1). The half-bar cap is gone (A10); the per-round brake (`mending.brake`) still prices a stream of heals on one friend.

---

## 2. Determination: the door of Outbursts (Will Power; Composure; Lore Master; the Channeler, id `channeler`)

### 2(a) Today

**The counters: the stage** (0 to 4 for everyone, `soul_modules.json:13 max_stage`; `magic.ts:729 MAX_STAGE`) **and Strain** (limit 3, +1 at Composure 1, 2, 4, 6, 8; burn 8 HP a point over, `soul_modules.json:65`; 3 over is a Mana Short; Mana Shock 25% max HP a turn).

**What builds the stage.** Begin (2 AP, the design's MP, +1 Strain); Pump (1 AP, MP 10% of the Begin's for each stage reached, `soul_modules.json:56 pump_mp`); one free Pump a turn at most (the fight's first, and one a round from Will Power 3); a swell (+1 stage, +1 Strain, at your turn's start while held; no Strain from Composure 6); Feed (a glyph); Overdraw (Will Power 2, `skills.json:4688`: once a turn a Pump adds 2 stages).

**What spends it.** Release (1 AP) at `stage_mult` x0.8 / 1.0 / 1.2 / 1.4 / 1.6 (`soul_modules.json:14`); a feeling Pump steps its own number (`feelings.json`), each feeling once an Outburst, four at most. Damage base 37 (`soul_modules.json damage.base`, read at `magic.ts:752`; the school row's `damage 40` is a dead copy, 01 defect 1). Profile `soul` has **attr 0, skill 0** (01 T1): Determination and Will Power add nothing.

**MP.** `100 + 75 x (Det - 1) + 25 x (Ins - 1)` (`character.ts:860-861`, typed), flat across levels; Syphon gives the air's band (30 / 60 / 90 / 120) x `1 + 0.1 x (Det - 1) + 0.1 x WP` (`character.ts:903`, typed). **MP is not a choice today**: a specialist holds nine full cash-outs.

**Will Power's ladder** (`skills.json:4611`): 1 the door; 2 Overdraw, modules Size and Quiet; 3 perk step, a free Pump a round; 4 fork Ride the Edge or Slow Burn, modules Bloom and Volley; 5 Two Schools; 6 perk step, a module slot; 7 perk step; 8 fork Blood Price or Clean Break; 9 perk step, a slot; 10 Mastered The Twin Pays. Card: **+10% Soul power: false**; +10% syphoned (true, typed). **Reach and Bite never move.** **Composure** (beta, `skills.json:4853`): +1 on Heart saves a point; the Strain limit; modules at 2; no-Strain swells at 6. **Lore Master** (gamma, `skills.json:5014`): Name It; the first tone at 1; forms and modules at 2 and 4; a ready design at 4, 6, 8, 10. **Determination's card** (`attributes.json:227`): **+5% Soul power: false**; +75 max MP (typed); +10% syphoned (typed).

**The Channeler** (`classes.json:2639`): rank I Shape (a bespoke handler, `classes/i.ts:1147`), Iron Heart (once a fight, on Mana Shock, -2 Strain); rank II Storm Front (+10 MP, a Bolt or Lance arcs to 2 more foes within 2 tiles; **the 10, the 2 and the 2 are typed in code**, `classes/i.ts:1173-1199`), Occult Library; rank III Heart Surge (a Release one stage higher, never past 4; double Strain), Eye of the Storm.

### 2(b) Will Power's ladder, points 1 to 10

**Reach is the highest stage you may hold** (`res_max:stage`, S5, in place of `MAX_STAGE`; C16: everyone's stage 4 moves onto the ladder). **Bite is the plain Pump's step.** The Release multiplier is `C = 0.8 + sum over Pumps of (step x 1.2^i)` (i counts this Outburst's Pumps from 0; the ratio from S3's data key): a plain Pump steps Bite; a feeling steps its own number plus (Bite - 0.2); a negative step (Calm, Relief) is not multiplied. Swells, Feed and Overdraw's second stage count as plain Pumps.

| Will Power | What exists (kept) | Reach (stage) | Bite (plain step) | New |
| --- | --- | --- | --- | --- |
| 1 | the door | **2** | **0.25** | Soul power +5% a point (01's card) |
| 2 | Overdraw; modules Size, Quiet | | | |
| 3 | perk step; a free Pump a round | | | |
| 4 | fork: Ride the Edge or Slow Burn; modules Bloom, Volley | **3** | | |
| 5 | Two Schools | | | |
| 6 | perk step; a module slot | | **0.30** | |
| 7 | perk step | **4** (needs Composure 4, B13) | | |
| 8 | fork: Blood Price or Clean Break | | | **the Push: Overdraw past the top** (2(d)) |
| 9 | perk step; a slot | | **0.35** | |
| 10 | Mastered: The Twin Pays | **5** (needs Composure 7 and Lore Master 4, B13) | | |

The Release multiplier at each Reach on plain Pumps: Will Power 1 **x1.35** (stage 2); 4 **x1.71** (3); 7 **x2.41** (4); 9 **x2.68** (4); 10 **x3.40** (5) (today x1.6 at stage 4 for everyone). PROVISIONAL. Reason: a heart worked to its top pays more than twice a quick one, and the tenth point is a stage nobody else can hold. With Will Power 1 to 3 the card says so plainly: "the door, a taste: stage 2" (critic-player 8).

**Taken away by C16:** Will Power 1 to 6 no longer reach stage 4. A held Outburst in a saved fight clamps to the new Reach (section 7).

### 2(c) The cash-out: the Release, and what everything costs

**AP stays** (Begin 2, Pump 1, Release 1, Steady 1, Feed 1). **MP is a choice** (A6; every number is 01 T7a and T7b):
- **Max MP = (40 + 12 x (Determination - 1) + 8 x (Insight - 1)) x `mp`.** The Channeler of 2(j): **120** at level 1 (Determination 7, Insight 2), **234** at 10 (9, 3), **368** at 20 (10, 4). A mixed Determination 4, Insight 1: 76 at level 1.
- **A Pump costs a tenth of the Begin's MP each** (today a tenth for each stage reached). A full cash-out at Reach R costs `Begin x (1 + 0.1 x R)`.
- **Outburst costs grow by the design, not by the level** (a school 20 to 25, modules 5 to 20, a tone 5, a second school 10); Tending's ride `mp` (1(c)).
- **Syphon** (1 AP): the air's band **10 / 20 / 30 / 40** x `(1 + 0.05 x (Determination - 1))` x `mp`; Will Power leaves it. In normal air: 26 / 43 / 62 for the Channeler at levels 1 / 10 / 20.

What the pool buys (01 section 6's table, quoted): a typical design's Begin 25 / 45 / 75 at levels 1 / 10 / 20, a full cash-out 35 / 63 / 112.5, **3.4 / 3.7 / 3.3 full cash-outs a pool**; a Syphon is about two thirds of one. Reason: the MP left, the Syphon's AP and the air it drains are a real choice at level 1, 10 and 20, and a bigger design costs a bigger share.

**Strain** (01 T7b): the burn is **6% of max HP a point over the limit**; Mana Shock 25% kept. Reason: Strain hurts the same share of your bar at every level and for every build. The text at `rules.json:1486` ("8 true damage per point over the limit") reads its row (01 defect 3).

**The Damage school.** Base **22.2** (01: today's 37 x0.6), x Stat(soul) x `deal` x the Emanator's grade. Raw ignores armour, an element counts armour half (kept). A Bolt and a Lance roll (`classes/soul.ts:36-39`): their Margins add to `C` (01 section 9: a quarter of the plain hit, plus a point a Perception point).

| | Level 1 (7/7) | Level 10 (9/9) | Level 20 (10/10) |
| --- | --- | --- | --- |
| The Damage design at x1.0 (Standard) | 48 | 330 | 2,515 |
| The specialist's full Release (Reach, Bite) | 90 (stage 3, x1.89: Composure 4 comes at level 2) | 885 (stage 4, x2.68) | 8,560 (stage 5, x3.40) |
| The same in the stated grade (01 3.2: Standard, Masterwork, Relic) | 90 | 1,150 | 12,840 |
| At Celestial | | | **14,982** (01 T11) |

**The compounding rule, in plain Releases** (a plain Release is the design at x1.0; Overdraw once a turn; one free Pump a turn from Will Power 3):

| Who | Reach, Bite | One full Release | AP, and how often |
| --- | --- | --- | --- |
| Will Power 1 | 2, 0.25 | x1.35 | 4 to 5 AP (Begin, Pumps, Release): a taste of the door |
| Will Power 4, a mixed character | 3, 0.25 | x1.71 | 4 AP (Begin, the free Pump, Overdraw, Release), every turn, while Strain lasts (+1 net a turn) |
| Will Power 7 (Composure 4) | 4, 0.30 | x2.41 | 5 AP, every turn |
| Will Power 10, a specialist | 5, 0.35 | x3.40 | one turn of 6 AP; or held: 3 AP, then the swell, the free Pump and 1 AP next turn: every two turns, the heart glowing where everyone sees it |

With feelings the top grows: four strong feelings on a Reach-5 heart reach about x6 (01 T11's source), and Heart Surge and the Push go past it: the "something super" five digits, paid for in Strain. Its sources' sum is 07's to trim to 01's budget (+127%, 01 10.3 item 5).

### 2(d) The Push at Will Power 8: Overdraw past the top

Once a turn, an Overdraw (or a Pump) may take the Outburst **one stage past your Reach** (`res_max:stage` +1 for the use, S5; stage 6 for a 10). **Price:** +2 Strain at once, and your Strain does not fall at the start of your next turn. PROVISIONAL. Reason: the curve's "Overdraw, price Strain", landing on the next turn; a heart pushed past its top stays hot. The Overdraw verb at Will Power 2 stays as it is (two stages in one Pump, within Reach). Heart Surge (the Channeler's) may stack with it (2(i)).

### 2(e) Marks on the door, and the practice tracks

**The unit: stages Released** on worthy foes. **Thresholds: 05's formula**; at this drafter's reading of 22 stages an hour for a specialist, about 44 / 242 / 374 / 506, set from the simulator.

| Mark | About | Gives |
| --- | --- | --- |
| I | hour 2 | **your first Begin each fight** starts at stage 1 (`begin_stage`, S11). It never overlaps Afterglow (2(i)), which starts every later Begin after a Release: the two are one stat, added |
| II | hour 11 | Strain falls by 2 at the start of your turn, not 1 |
| middle | hour 17 | once a fight, a Mana Short Dazes you instead of Stunning you |
| III | hour 23 | Overdraw past the top costs no Strain once a fight |

**Modules** (05 section 4, quoted): `thresholds` [10], `then_every` 80, `mastery_bonus` 40; about 38 practice an hour, **a module every 2.1 hours, 23 of the 28 learnable by hour 45**. A Determination specialist's gates cover 19 of them (Will Power 4, Composure 5, Lore Master 10); two points each in Empathy, Camaraderie and Insinuation open the other 9 (the Channeler of 2(j) buys them at levels 13 to 19): **the 80% needs those points**, and the level-up screen should name the module a point opens.

**Feelings** (05 section 4, quoted): each row's `marks` [2, 6, 12] for a common trigger, [1, 3, 6] for a rare one: I unlocked, II its step +0.1, III it can be chosen. What "chosen" gives here, PROVISIONAL: **it may be poured a second time in one Outburst** (the one feeling exempt from "once each"). 20 of 25 by hour 45.

**Tones:** the first at Lore Master 1; more from tutors, plates and Occult Library (kept); seven in all. **Ready designs:** Lore Master's (kept).

### 2(f) Tags for mixed characters

- **This door keeps others'** (S6): Begin, Pump and Steady are still acts: they carry "keeps plates" and "keeps the chain". A held Outburst never keeps Hidden (the heart glows, today's rule).
- **Others keep this door's** (the calming rows exist, `soul_modules.json:77 strain.calming`): a weapon attack (the first each turn, -1 Strain), a heal, stim, shield or cleanse given (-1), a Call with Recitation (-1). **New, PROVISIONAL:** a Whisper you say calms 1 Strain once a turn (prayer stills the heart), and holding Guard counts as a still turn for the "still" row. These are the base layer of the Sigil-Outburst, Guard-Outburst and Prayer-Outburst Crossings.

### 2(g) Composure (beta) and Lore Master (gamma), points 1 to 10

**Composure** keeps every row: +1 Heart save a point (counts from the first, B20); the Strain limit +1 at 1, 2, 4, 6, 8 (to 8); modules at 2; no-Strain swells at 6; perk steps 3, 5, 7, 9; Mastered at 10. New: **4 opens stage 4 and 7 opens stage 5** (B13). **At 10, besides Still Water, the burn of Strain is 4% of max HP a point over, not 6%** (PROVISIONAL; reason: Mastered Composure is felt in the door it guards).

**Lore Master** keeps every row (the tone at 1; forms and modules at 2; modules at 4; designs at 4, 6, 8, 10; Name It's steps 1, 4, 8; the Call price at 1, 5, 9, 10; perk steps 3, 5, 7, 9; Mastered True Name); every point adds its full points to checks and Asks and +1 tile of Name It reach. New: **4 opens stage 5** with Composure 7 (B13). No point is dead.

### 2(h) Determination's card (01 section 4.2, A4)

| Per point above 1 | Today | 01's card |
| --- | --- | --- |
| Soul power | +5%: **false** (profile attr 0) | **+10%** on every Outburst's damage, heal and shield (`soul`, `soul_mend`; Will Power +5%, multiplied) |
| Max MP | +75 (true, typed) | **+12 x `mp`** (01 T7a) |
| Mana syphoned | +10% (true, typed) | **+5%**, read from the card |

(The first draft's "+1 Heart save every 2 points" is withdrawn: the card is 01's.)

### 2(i) The Channeler: what only it has

**Only the Channeler: Afterglow** (new, rank I, in place of Shape): after a Release at stage 2 or higher, your next Begin this fight starts at stage 1 (stage 2 from rank III) (`begin_stage`, S11). PROVISIONAL. Reason: the Channeler's heart never goes cold between Outbursts; it cashes out and rebuilds faster, which no Will Power point gives. Shape **retires** (+0.12 on one Pump is about +7% on a full Release: a number, not a thing), and its bespoke handler goes (`classes/i.ts:1147`; the lint count falls by one).

| Rank | Move | Today | Worth pressing? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| I | Afterglow (new) | | (passive) | as above |
| I | Iron Heart | -2 Strain once a fight on Mana Shock | (reactive) | **your Strain falls to your limit** (the shock ends at once), once a fight |
| II | Storm Front | +2 foes for 10 MP | yes (three targets) | kept; its 10 MP (x `mp`, a price on 01's rule 4), 2 foes and 2 tiles move into the row's `numbers` |
| II | Occult Library | a free Syphon once a turn, a tone | yes | kept |
| III | Heart Surge | a Release one stage higher, not past 4 | yes | one stage higher **and may pass your Reach by one** (`res_max:stage`, not a typed 4): the Channeler's own peak; double Strain kept |
| III | Eye of the Storm | once a scene | yes | kept |

The class dial (value 1) is left at 1: a class is defined by what only it has, not by a percentage.

### 2(j) How a player spends: the Determination specialist and a mixed fighter

**The Channeler** (creation: Determination 7, Endurance 3, Insight 2, Agility 2; Will Power 7, Composure 3).

| Level (hour) | Buys | What the player gets |
| --- | --- | --- |
| 1 (0) | creation | **stage 3** (stage 4 waits on Composure 4), Bite 0.30, Overdraw, Two Schools, a free Pump a round, fork a, three perk steps, 3 slots; Strain limit 5; five modules (Composure 2) |
| 2 (0.5) | Composure 4; Endurance 4 | **stage 4**; Strain limit 6; HP |
| 3 (1.25) | Channeler rank I; Lore Master 1, 2 | Afterglow, Iron Heart; a tone, four forms, three modules |
| 4 (2.5) | Composure 5, Lore Master 3 | two perks |
| 5 (4) | rank II; Determination 8; Will Power 8 | Storm Front, Occult Library; fork b, **the Push**; +10% Soul power |
| 6 (6.4) | Lore Master 4; Insight 3 | three modules, a design; MP, cheaper designs |
| 7 (8.8) | Composure 6, 7 | no-Strain swells, limit 7, a perk; stage 5's beta gate met |
| 8 (11.2) | Lore Master 5; Endurance 5 | a perk; HP |
| 9 (13.6) | Composure 8, Lore Master 6 | limit 8; a design |
| 10 (16) | Determination 9; Will Power 9 | **Bite 0.35**, a perk, a slot |
| 11 (18.4) | Composure 9, Lore Master 7 | two perks |
| 12 (20.8) | Lore Master 8; Insight 4 | a design, Name It's top step; MP |
| 13 (23.2) | Lore Master 9, Empathy 1 | a perk |
| 14 (25.6) | Empathy 2, Insinuation 1 | modules open (Empathy's) |
| 15 (28) | rank III; Determination 10; Will Power 10 | **stage 5**, Mastered The Twin Pays, Heart Surge, Eye of the Storm |
| 16 (30.4) | Composure 10; Endurance 6 | Still Water and the lighter burn |
| 17 (32.8) | Lore Master 10, Insinuation 2 | True Name, a design; three modules open |
| 18 (35.2) | Camaraderie 1; Endurance 7 | Share a Hit |
| 19 (37.6) | Camaraderie 2, Pain Threshold 1 | the last modules open; HP |
| 20 (40) | Pain Threshold 2; Agility 3 | HP; movement |

**A mixed fighter-channeler** (Strength 7, Determination 4, Endurance 2; Raw Power 6, Will Power 4: the monk who fights it out and calms the heart with every blow; the Breaker at 3). **Hands** (ruling E): the Emanator is a hand focus. Either the character fights with the **Emanator gauntlet** itself (one-handed, Strength x Raw Power, `weapons.json`; 11 a blow, 01 T3), so the focus is the weapon and no swap is paid, at a third of a maul's blow (27); or it carries the maul and **pays the hand swap** (1 AP a hand, rules `:689`) on every Outburst turn, which makes the Outburst turn below 5 AP, not 4. The Momentum steps are 02's; only their names are written here.

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | stage 3, Overdraw, a free Pump a round, fork a; Momentum at Raw Power 6 |
| 2 | Composure 1; Determination 5 | Strain limit 4; +10% Soul power |
| 3 | Raw Power 7, Composure 2 | the Breaker; limit 5, five modules (Momentum's step at 7 waits on Guts 4) |
| 4 | Will Power 5, Guts 1 | Two Schools; Guts |
| 5 | rank II; Raw Power 8; Strength 8 | Overswing (Raw Power's Push) |
| 6 | Guts 2; Determination 6 | +10% Soul power |
| 7 | Will Power 6, Guts 3 | Bite 0.30, a slot |
| 8 | Guts 4; Endurance 3 | Momentum's step at 7 |
| 9 | Composure 3, 4 | a perk; limit 6; stage 4's beta gate met |
| 10 | Raw Power 9; Strength 9 | Raw Power's Bite |
| 11 | Lore Master 1, 2 | a tone, the four forms |
| 12 | Will Power 7; Determination 7 | **stage 4** |
| 13 | Guts 5, 6 | a perk |
| 14 | Guts 7, Intimidation 1 | a perk |
| 15 | rank III; Raw Power 10; Strength 10 | Mastered (Momentum's top waits on Intimidation 4) |
| 16 | Intimidation 2; Determination 8 | +10% Soul power |
| 17 | Intimidation 3, 4 | Momentum's top Reach |
| 18 | Will Power 8; Endurance 4 | **the Push**, fork b |
| 19 | Composure 5, 6 | no-Strain swells, limit 7 |
| 20 | Lore Master 3; Endurance 5 | a perk |

Every level buys something felt. Each blow calms the heart (the `fight` calming row), so the fighter Begins, Overdraws and Releases a stage-3 heart every turn between Finishers, stage 4 from level 12: two doors cashing out often, neither at the other's top.

---

## 3. Virtue: the door of Prayer (Faith; Conscience; Authority; the Chaplain, id `guardian`)

### 3(a) Today

**The run's counter: Devotion** (0 to 10, standing with your patron; `patrons.json devotion`): **start 3** (`patrons.json:8`); the XP curve `[0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450]` (`:17`); gates Whisper 0, Hymn I 3, II 5, III 7, the Miracle 10. Gains: a liked tag +1 (capped 2 a fight, 2 a scene, 6 a session, `:48 tag_caps`; `faith.ts:95`), a vow +3, a rite +4, a Narrator deed +2 to +5. Losses: a taboo -3 (-6 Witnessed), a broken vow -5, a missed prayer above your standing -3.

**The prayers** (`patrons.json prayer`): a Whisper 1 AP, once a turn (Faith 1); a Hymn 3 AP, then a wait of `9 - 0.75 x Faith - 0.25 x Virtue`, rounded up, at least 3 (`character.ts:1266-1270`); the Miracle 3 AP, once a session, Faith 7 and Devotion 10, costs 5 Devotion levels. Seven Whispers; three Hymns and a Miracle a patron; Witnessed (Faith 5) and the intervention (`20 + 4 x Devotion`, x Blessing power; `faith.ts:116`). Praying above your standing (`patrons.json:100 overreach`): any Faithful, TN 12 + 2 a tier. An Atheist prays every tier by dice.

**Blessing power** is profile `blessing` (01 T1: 0.956 x (1 + 0.06 x (Virtue - 1) + 0.06 x Faith), on the `scale` column); heals and shields `blessing_mend` on `mend`. **There is no in-fight counter**: the Hymn's wait is a clock.

**Faith's ladder** (`skills.json:5180`): 1 Whispers; 2 Name the Sinner; 3 perk step, Hymns open; 4 fork Steadfast or Round of Blessings; 5 Witnessed; 6 perk step; 7 perk step; 8 fork Swift Psalm or Benediction; 9 perk step; 10 Mastered Judgement Day. Card: **+10% Blessing power: false** (the profile reads 6%); Hymns 0.75 round sooner (points past the floor move nothing). **Conscience** (beta, `skills.json:5435`): prayer shields +1% x Faith a point (the feed); +10% shields received a point (**typed**, `character.ts:1249`). **Authority** (gamma, `skills.json:5620`): the Call Order; +1 tile and Karma +1 a point. **Virtue's card** (`attributes.json:256`): "Hymns return sooner" (0.25 a point); it also gives +6% Blessing power that the card does not say.

**The Chaplain** (`classes.json:2836`): no move costs MP; `gain` The Patron at Your Side, Amen. Rank I Ward (a Whisper, 1 AP, a fight-long shield of `10 x` on an ally, four at once), Smite (once a turn, a weapon hit adds `20 x` Blessing power Soul damage through armour, and Judged); rank II Under the Eye, Blessed Arms; rank III Sanctuary (a Hymn only it says, half damage in a 3x3, a pool of `40 x`), Verdict (`classes.json:7716`: 4 AP and 1 Devotion level, once a fight, a plain attack x (1 + Blessing power)).

### 3(b) Faith's ladder, points 1 to 10

**Two layers, because Devotion is earned across a run.** Devotion keeps its shape: it opens the tiers (Hymn I at standing 3, II 5, III 7, the Miracle 10; Faith gates kept: Hymns 3, Witnessed 5, the Miracle 7) and **it is the prayer's grade** (A9, 01 T9: standing 3 / 5 / 7 / 10 as Fine / Masterwork / Relic / Celestial, x1.15 / 1.3 / 1.5 / 1.75; prayers have no roll). **Inside a fight the door has Grace** (C19 accepts it; the resource `grace`, S10). **Faith's Reach is the Grace you may hold (`res_max:grace`); Bite is what one step of Grace adds to the prayer that spends it.**

**Grace** (PROVISIONAL): each prayer you say (a Whisper, Ward) lays 1, at most one a turn from prayers; the first act each turn your patron likes (its liked tags, detected as today) lays 1; **a taboo act clears all of it**; a turn in which you neither prayed nor did a liked act loses 1 (the wear, `wear:grace`, S6). A Hymn, Sanctuary and Verdict **spend all of it**; a Whisper may spend it instead of laying (your choice when you say it). The Miracle neither lays nor spends. Grace is gone when the fight ends.

| Faith | What exists (kept) | Reach (Grace) | Bite (a step, on the prayer that spends it) | New |
| --- | --- | --- | --- | --- |
| 1 | Whispers | **2** | **+15%** | Grace; a Whisper spends it (the cash-out from point 1, C18); Blessing power +5% a point (01's card) |
| 2 | Name the Sinner | | | |
| 3 | perk step; Hymns open | | | |
| 4 | fork: Steadfast or Round of Blessings | **3** | | |
| 5 | Witnessed | | | |
| 6 | perk step | | **+20%** | |
| 7 | perk step | **4** (needs Conscience 4, B13) | | |
| 8 | fork: Swift Psalm or Benediction | | | **the Push: pray above your standing**, moved here (C17; 3(d)) |
| 9 | perk step | | **+25%** | |
| 10 | Mastered: Judgement Day | **5** (needs Conscience 7 and Authority 4, B13) | | |

**The Hymn's wait, PROVISIONAL: `10 - 0.5 x Faith - 0.25 x (Virtue - 1)`, rounded up, at least 3** (`cooldown_rule` base 10, per_faith 0.5, per_virtue 0.25 counted above 1). Faith and Virtue 4: 8 rounds; 7 and 7: 5; 9 and 9: 4; 10 and 10: 3 (the floor is first met at the top). Reason: every second Faith point takes a round off, up to the tenth (today points past 7 do nothing), and Virtue keeps its card's line (01 section 4.2: "Hymns return sooner"). Longer than today in the middle: the wait is the Hymn's price now that Grace pays for waiting.

### 3(c) The cash-out: the Hymn, and what it costs

A prayer that spends Grace is worth **`C = 1 + Bite x S(n)`**: Faith 1 **x1.33** (2 Grace, on a Whisper); Faith 4 **x1.55** (3); Faith 7 **x2.07** (4); Faith 9 **x2.34** (4); Faith 10 **x2.86** (5). Prayers land (no roll, no Margins).

**Costs.** AP kept (Whisper 1, Hymn 3, the Miracle 3, Ward 1, Sanctuary 3). No MP (the prayer door's fuel is Devotion and the wait). The Miracle's price, 5 Devotion levels, kept: on 05's curve about 13 hours of faith. Verdict 3 AP (was 4) and 1 Devotion level (3(i)).

**The compounding rule, in plain prayers** (a prayer at x1):

| Who | Grace held, Bite | One cash-out | How often |
| --- | --- | --- | --- |
| Faith 1 | 2, 15% | a Whisper x1.33 | every second turn; Hymns are shut below Faith 3 |
| Faith 4, a mixed character | 3, 15% | a Hymn x1.55, or a Whisper x1.55 between Hymns | a Whisper cash-out every two turns, a Hymn every 8 rounds |
| Faith 7 (Conscience 4) | 4, 20% | a Hymn x2.07 | every 5 rounds |
| Faith 10, a specialist | 5, 25% | a Hymn x2.86 | every 3 rounds, if no taboo clears the Grace |

At level 20 a specialist's Judgement with five Grace at Devotion 10 (Celestial) is **16,685** before the sum (01 T11): five digits, landed. The consequence: one taboo clears the Grace you saved for the Hymn, and Devotion still moves as today.

### 3(d) The Push at Faith 8: pray above your standing

Exists for every Faithful today; it moves to Faith 8 as the door's Push (C17). **Once a turn** (Law 5, as the eight others; critic M12), a Hymn **one tier past your Devotion standing** (the tier is Devotion's Reach, raised by one for the use): TN 12 + 2 a tier (kept). **Price, whether it lands or not: 10 Devotion XP; 20 if it misses** (was a miss -3). PROVISIONAL. Reason: asking past what you have earned always costs standing; on 05's pace (about 8.5 Devotion XP an hour) 10 XP is an hour of faith. The Hymn's wait spaces it in practice.

### 3(e) Marks on the door, and Devotion's pace

**The unit: Grace spent** on worthy foes. **Thresholds: 05's formula**; at this drafter's reading of 19 Grace an hour for a specialist, about 38 / 209 / 323 / 437, set from the simulator.

| Mark | About | Gives |
| --- | --- | --- |
| I | hour 2 | a fight starts with 1 Grace (primed; op `resource` on `combat_start`) |
| II | hour 11 | a taboo costs half your Grace (rounded down), not all |
| middle | hour 17 | your Hymn's wait is 1 round shorter (never under its floor) |
| III | hour 23 | praying above your standing costs no Devotion XP once a fight |

**Devotion** (05 section 4, quoted; C19): the curve **`[0, 10, 25, 42, 68, 100, 140, 185, 225, 260, 300]`**; `tag_caps.fight` 3; a new `tag_caps.stage` 30 in a run in place of the session's 6; about 8.5 XP an hour: **standing 3 at about hour 5.0, 5 at 11.8, 7 at 21.9, 10 at 35.5**. **Devotion starts at 0** for a new character (ruling 19; `patrons.json:8` today 3); a live character keeps what it has (XP above the new top of 300 is held at 300, standing 10, nothing lost).

What Reach and Bite mean for a door whose counter is earned across a run: Devotion is the tier ladder and the grade, felt as a new prayer every few hours; Faith points buy the fight's engine on top of it (Grace held, Grace's worth, the wait). A Faith 10 at standing 5 has Hymns I and II at Masterwork and the Grace of a saint; a Faith 4 at standing 10 the Miracle, at Celestial, and a short litany.

### 3(f) Tags for mixed characters

- **This door keeps others'** (S6): a Whisper is quiet: it carries "keeps Hidden", "keeps the chain" and "keeps plates". A Hymn is sung: it keeps none. A Whisper calms 1 Strain once a turn (2(f)).
- **Others keep this door's**: every act a patron likes lays Grace (the tags already detect protect, heal, supply, hold, trick, burn, storm, kill, judge, mercy: `patrons.json tags`), so the Guard user's Brace (hold), the medic's Mend (heal) and the Sigilist's FIRE (burn) feed a Faithful's Grace with no new rule; and they carry "keeps Grace", so a turn spent on them does not lose a step.

### 3(g) Conscience (beta) and Authority (gamma), points 1 to 10

**Conscience: how prayer keeps you safe.** Every point: +10% shields received (read from the row, in place of `character.ts:1249`); **the feed with a flat term (B20):** your prayer shields are `(4% + 1% x Faith) x Conscience` stronger (`feed_flat` 0.04, PROVISIONAL; reason: a first point of Conscience is a twentieth on the shield of a Faith-1 prayer, not a hundredth). New, PROVISIONAL:

| Points | New | Reason |
| --- | --- | --- |
| 2 | **Clear Conscience:** the first taboo each fight costs no Devotion XP | you saw where it led and stopped |
| 4 | **Grace wears slower:** an idle turn loses a step only if your last turn was idle too; and **opens Grace 4** (B13, with Faith 7) | the believer's calm holds, but idling still costs (critic-player 14) |
| 6 | your prayer shield on a friend lays 1 Grace for you (once a turn) | protecting is praying |
| 7 | **opens Grace 5** (B13, with Faith 10 and Authority 4) | |
| 8 | when one of your prayer shields breaks, its holder has +1 Defense until your next turn | the god's guard does not vanish at once |

**Authority: the door outside a fight, its Call and its voice.** Every point adds its full points to checks and Asks and +1 tile of Order reach (Karma as the Narrator's). Kept: Order's steps 1, 4, 8; the price at 1, 5, 9, 10; perks; Mastered On My Mark. New, PROVISIONAL: **at 2, a friend who acts on your Order lays 1 Grace for you if your patron likes what it did**; **at 4, it opens Grace 5** with Faith 10 and Conscience 7 (B13); **at 6, your Order also ends Fear and Shaken on the friend**. Reason: points 2 and 6 moved only a tile; the commanding priest's voice is part of the door.

### 3(h) Virtue's card (01 section 4.2, A4)

| Per point above 1 | Today | 01's card |
| --- | --- | --- |
| Blessing power | +6%, unstated | **+10%**, said on the card (`blessing`, `blessing_mend`; Faith +5%, multiplied) |
| Hymns return sooner | 0.25 round, rounded up | **kept**, on the new wait (3(b)) |

The first draft's "+5% Devotion XP" and "+5% shields received" are withdrawn: Devotion's rate is 05's (D22), the card is 01's, and both were under a tenth (critic-player 8).

### 3(i) The Chaplain: what only it has

**Only the Chaplain:** Ward, Smite, Sanctuary, The Patron at Your Side, Amen and Verdict are its own; all stay. Every base below is 01's x0.6 value (T2b) on the prayer's profile and column, x the Devotion grade.

| Rank | Move | Today, set-up met | Worth pressing? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| I | Ward | a fight-long shield for 1 AP, four at once | yes | base 6.0 (01); a Whisper, so it lays Grace |
| I | Smite | +20 x Blessing power on a hit | yes | base 12 (01), on `deal`, once a turn |
| gain | The Patron at Your Side; Amen | | (passive) | kept; Amen's base 6.0 (01) |
| II | Under the Eye | +2 to hit near you while Witnessed | (passive) | kept |
| II | Blessed Arms | a Hymn loaded into the weapon | yes | kept; the loaded Hymn keeps the Grace it spent |
| III | Sanctuary | half damage in a 3x3, a pool of `40 x` | yes | pool base 24 (01); spends Grace like a Hymn (the pool x `C`) |
| III | Verdict | 4 AP and 1 Devotion: a plain attack x (1 + Blessing power), about 2.7 hits for the AP of two plain actions | **no** (1.35 a plain action, and it costs standing) | **3 AP**, once a fight, 1 Devotion level: a plain attack x (1 + Blessing power) **x `C`** (it spends Grace). At Faith 10 with 5 Grace, about 9 plain hits: the Chaplain's five-digit blow at level 20, paid in standing. Its `(1 + Blessing power)` is the door's `C` with Grace's, not a sum term (A8) |

### 3(j) How a player spends: the Virtue specialist and a mixed crusader

**The Chaplain** (creation: Virtue 7, Agility 3, Endurance 3; Faith 7, Conscience 3; Smite's hits come from a pistol from level 4). Devotion standing by 05's hours.

| Level (hour) | Buys | What the player gets |
| --- | --- | --- |
| 1 (0) | creation | Whispers, Name the Sinner, Hymns open (standing 0: none yet), fork a, Witnessed, three perk steps; **Grace 3** (Grace 4 waits on Conscience 4), Bite +20%; Clear Conscience, a Conscience perk; wait 5 |
| 2 (0.5) | Conscience 4; Endurance 4 | **Grace 4**, Grace wears slower; HP |
| 3 (1.25) | Chaplain rank I; Authority 1, 2 | Ward, Smite, the Patron at Your Side, Amen; Order, Orders lay Grace |
| 4 (2.5) | Dexterity 1, 2 | Smite's pistol hits |
| 5 (4) | rank II; Virtue 8; Faith 8 | Under the Eye, Blessed Arms; fork b, **the Push**; +10% Blessing power |
| 5 to 6 (5.0) | (Devotion 3) | **Hymn I**, at Fine: arrives with deeds, not a level |
| 6 (6.4) | Conscience 5; Agility 4 | a perk |
| 7 (8.8) | Conscience 6, 7 | shields lay Grace, a perk; Grace 5's beta gate met |
| 8 (11.2) | Authority 3; Endurance 5 | a perk |
| 8 to 9 (11.8) | (Devotion 5) | **Hymn II**; prayers at Masterwork |
| 9 (13.6) | Authority 4, Conscience 8 | Order moves a friend; the broken shield's guard; Grace 5's gamma gate met |
| 10 (16) | Virtue 9; Faith 9 | **Bite +25%**, a perk, wait 4 |
| 11 (18.4) | Conscience 9, Authority 5 | two perks |
| 12 (20.8) | Authority 6; Agility 5 | Order ends Fear |
| 12 to 13 (21.9) | (Devotion 7) | **Hymn III**; prayers at Relic |
| 13 (23.2) | Authority 7, 8 | a perk; Order's top step |
| 14 (25.6) | Dexterity 3, 4 | Smite lands more often |
| 15 (28) | rank III; Virtue 10; Faith 10 | **Grace 5**, Mastered Judgement Day, wait 3; Sanctuary, Verdict |
| 16 (30.4) | Conscience 10; Endurance 6 | Foreseen |
| 17 (32.8) | Authority 9, 10 | On My Mark; Order for 1 AP |
| 18 (35.2) | Dexterity 5; Agility 6 | (Devotion 10 at 35.5): **the Miracle**, prayers at Celestial |
| 19 (37.6) | Pain Threshold 1, 2 | HP |
| 20 (40) | Pain Threshold 3; Endurance 7 | HP |

**A mixed crusader** (Strength 7, Virtue 4, Endurance 2; Raw Power 6, Faith 4; the Breaker at 3: no Smite, but Whispers between blows and a Hymn when standing allows). **Hands:** prayer needs no focus (`survival.json:52 focus_by_door` has no Faith entry), so the maul stays in both hands: no swap.

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | Grace 3, Whispers, Name the Sinner, fork a; wait 8; Momentum at Raw Power 6 |
| 2 | Raw Power 7; Virtue 5 | +10% Blessing power (Momentum's step at 7 waits on Guts 4) |
| 3 | Faith 5, Guts 1 | the Breaker; Witnessed |
| 4 | Guts 2, 3 | a perk |
| 5 | rank II; Guts 4; Strength 8 | Momentum's step at 7; (Devotion 3 about now: Hymn I) |
| 6 | Raw Power 8; Virtue 6 | Overswing, fork b |
| 7 | Faith 6, Authority 1 | Bite +20%; Order |
| 8 | Conscience 1; Virtue 7 | prayer shields, shields received |
| 9 | Faith 7, Conscience 2 | the Miracle's Faith gate; Clear Conscience |
| 10 | Raw Power 9; Strength 9 | Raw Power's Bite |
| 11 | Conscience 3, 4 | **Grace 4**; Grace wears slower |
| 12 | Guts 5; Virtue 8 | +10% Blessing power |
| 13 | Guts 6, 7 | a perk |
| 14 | Intimidation 1, 2 | Threaten |
| 15 | rank III; Raw Power 10; Strength 10 | Mastered (Momentum's top waits on Intimidation 4) |
| 16 | Faith 8; Endurance 3 | **the Push**, fork b |
| 17 | Intimidation 3, 4 | Momentum's top Reach |
| 18 | Guts 8; Endurance 4 | (Devotion 10 about hour 35: the Miracle) |
| 19 | Authority 2, Conscience 5 | Orders lay Grace; a perk |
| 20 | Conscience 6; Endurance 5 | shields lay Grace |

Every level buys something felt (the critic's note on the first draft's level-2 Conscience 1 is taken: Raw Power 7 is bought there). Every Brace and every kill a war patron likes lays Grace, so the crusader's Whispers between blows cash out every second turn, and Hymns come when Devotion allows.

### 3(k) Prayers on 01's columns (the specialist's Blessing power, Standard; x the Devotion grade, 01 T9, and x `C` when it spends Grace)

Damage reads `deal` on `blessing`, heals and shields `mend` on `blessing_mend` (today `blessing` reads `scale`, which 01 deletes). Each base is 01's x0.6 value (T2b).

| Prayer | Base (01 T2b) | Level 1 (7/7) | Level 10 (9/9) | Level 20 (10/10) |
| --- | --- | --- | --- | --- |
| Rebuke (Whisper) | 12 | 23 | 156 | 1,190 |
| Health (Whisper) | 5.1 | 14 | 110 | 923 |
| Protection (Whisper), Ward (Chaplain) | 6.0 | 17 | 130 | 1,086 |
| Smite (Chaplain) | 12 | 23 | 156 | 1,190 |
| Judgement, Lightning Rod's first | 34 | 64 | 443 | 3,373 |
| Thunderclap, each foe | 12 | 23 | 156 | 1,190 |
| Last Crossing on a Boss | 24 | 45 | 313 | 2,381 |
| Warm Hands | 17 | 48 | 367 | 3,077 |
| Saint's Shield | 20 | 57 | 432 | 3,620 |
| Absolution's heal | 11 | 31 | 238 | 1,991 |
| Coin for the Ferry | 6.6 | 19 | 143 | 1,194 |
| Hearthlight, each turn in it | 5.4 | 15 | 117 | 977 |
| Sanctuary's pool (Chaplain) | 24 | 68 | 518 | 4,343 |
| An intervention (damage) | 12 + 2.4 x Devotion (01, M7) | 23 to 68 | 156 to 469 | 1,190 to 3,571 |
| Mother Ember's intervention | 4.2 + 1.26 x Devotion (its row's `value` 7 and `per_devotion` 2.1, x0.6) | 12 to 48 | 91 to 363 | 760 to 3,040 |
| The Miracles (Nerukhan's, Old Overcast's) | 78, 90 | 147, 169 | 1,017, 1,173 | 7,738, 8,928 |

---

## 4. Questions for the lead

None new: every cross-file question of the first draft is settled by the rulings (the cards A4; MP A6; the stack A8; grades A9; the gates B12, B13; Reach C16; the Pushes C17; the cash-out from 1 C18; Grace, a heal that Bonds and Devotion's start C19; the beta's first point C20; the rates D22). Two readings this file takes, both 01's and stated there: Snap All's five digits are counted in total (01 question 2), and Snap's damage reads `deal` on the `tend` profile (01 3.1).

Defects found on the way (for the lead; data and code, not this file's to fix): `faith.ts:149 interventionHeal` types fallbacks 10 and 3 that disagree with Mother Ember's row (7 and 2.1) and with the prayer text (`patrons.json prayer.intervention.text`: "10 + 3 x your Devotion"); 01 T2b lists Mother Ember's `value` but not its `per_devotion` (2.1, x0.6 by A1: 1.26).

---

## Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency S1 (x0.45 against x0.6) | FIXED | every base is 01's x0.6 value (T2b); P, H and `hp_ref` are gone; every table is base x Stat x 01's column (0.1) |
| consistency S4 (the cards' slopes) | FIXED | A4 and 01 4.2 quoted: Insight, Determination, Virtue +10%; Empathy, Will Power, Faith +5%; multiplied (1(h), 2(h), 3(h)) |
| consistency S5 (Max MP and its price) | FIXED | 04's pool is ruled (A6); every pool, price and Syphon is quoted from 01 T7a, T7b (1(c), 2(c)) |
| consistency S6 (Strain's burn) | FIXED | 6% of max HP a point, 01 T7b; Composure 10's 4% is this door's Mastery line (2(g)) |
| consistency S9 (the critical's feeders) | FIXED for 04's part | `soul_modules.json damage.critical` goes (01 section 9); a Bolt's and a Lance's Margins add to `C` (2(c)); nothing else here rolls |
| consistency S14 (six digits; the stack) | FIXED for 04's part | `C` and `Σ` named for each door (0.4); Verdict's multiplier is `C`; the sum's trim is 07's (01 10.3 item 5) |
| consistency M2 (four-digit cash-outs) | FIXED | Bonds' Bite at 9 raised to x1.6: Snap All of four 10,500 in total at level 20 (1(b)); the Release (14,982) and the Hymn (16,685) hold five digits on 01 T11 |
| consistency M5 (two heal columns) | FIXED | `hp_ref` dropped; every heal reads 01's `mend` (1(k), 3(k)) |
| consistency M6 (Devotion's curve and start) | FIXED | 05's curve and caps quoted, start 0 (ruling 19); live XP clamped to 300 (3(e)) |
| consistency M7 (the intervention) | FIXED | 01's `12 + 2.4 x Devotion` on `blessing`, `deal`, the Devotion grade; the first draft's multiple of P dropped (3(k)) |
| consistency M8 (the Push's shape) | FIXED | every Soul Push raises the door's Reach by one for the use through `res_max:` (S5): a Bond, a stage, a tier (1(d), 2(d), 3(d)) |
| consistency M12 (Grace; the prayer Push) | FIXED | Grace accepted (C19), listed as S10; the prayer Push is once a turn (3(d)) |
| consistency minor 1 (the cash-out's outer form) | FIXED | each door's `C` is its own constant plus S3's `S(n)` (`1 +`, `0.8 +` with the ratio, none for Snap All) (0.4) |
| consistency minor 2 (Marks' thresholds) | FIXED | 05's formula on each door; this file names the unit and gives its reading (1(e), 2(e), 3(e)) |
| consistency section 4 (primitives merged) | FIXED | the list uses the merged names: S2, S3 (`cash_share:`), S4, S5, S6, S10, S11 |
| consistency section 5 item 4 (Shape, Storm Front, Heart Surge's 4) | FIXED | Shape's handler retires; Storm Front's literals into `numbers`; Heart Surge reads `res_max:stage` (2(i)) |
| consistency section 5 item 5 (literals) | FIXED for 04's | `maxMp`, `syphonMult`, `soulCostSaving`, `healReceivedMult`, `shieldReceivedMult`, `HYMN_COOLDOWN`'s fallbacks move to data in the same change (Built from) |
| consistency section 6 M-3 (moved rungs) | FIXED by ruling | C16 and C17 rule the losses (stages 3 and 4, One More Bond, praying above standing); held counters clamp in a saved fight (What re-records) |
| consistency section 6 M-6 (MP revision; Devotion above 300) | FIXED | 01's `MP_REV` by share of the bar; Devotion XP clamped to 300 (3(e)) |
| player 1 (the files on two scales) | FIXED | as consistency S1 |
| player 2 (a specialist never ahead in Reach) | FIXED | B13's gates on all three Soul doors (0.3, 1(b), 2(b), 3(b)); the mixed tables show the second door one step short |
| player 3 (the wide character) | NOT FIXED | ruling B14: no rank III and no Push for it in 0.34, flagged for Leon |
| player 4 (the gates and the Attribute point) | FIXED | B12's swap; all six spend tables redrawn on it; the Mender's dead stretch is one level (14), not two |
| player 5 (two focuses, one hand) | FIXED | each two-door table states its hands: the medic's revolver and Attuner (no swap), the fighter-channeler's gauntlet or 1 AP a hand, the crusader no focus |
| player 8 (dead points: Will Power 1 to 3, Conscience 1, Virtue's +5% Devotion XP) | FIXED | Will Power's card says "a taste"; Conscience's feed gains a flat term (B20); Virtue's small lines withdrawn (3(h)) |
| player 9 (Mark I against class starts) | FIXED | the Mender's free Bond stacks with Bonds' Mark I; Afterglow and Outbursts' Mark I never overlap and add in one stat (1(e), 2(e)) |
| player 12 (rewards taken back) | NOT FIXED here | the stage Reach (C16) and Devotion's start (ruling 19) are ruled; live characters keep their points, ranks (B15) and Devotion XP; a "your sheet changed" panel is the migration owner's and the client's (05, 06) |
| player 14 (actions with too little consequence) | FIXED in part | Conscience 4 no longer removes the wear (an idle turn after an idle turn still loses a step); Bonds at 0 MP and Tending ties stand by ruling C19 |
| player 18 (two counters for prayer) | NOT FIXED here | Grace is ruled (C19); the tooltip is the client's text |

## 5. Built from

| Rule or number | The existing piece and its data key (file) | What must change |
| --- | --- | --- |
| Every base on the new scale | each file's own keys (01 T2b) | 01's values; Triage 3.4 and Love 1.69 in place of 01's 2.58 and 1.14 (1(i)) |
| Heals on `mend`, damage on `deal`, Snap's damage on `deal` | `levelFactor` (`effects/output.ts`); 01's "column by kind and dealer" (`openAmount`, `levelOf`) | nothing of 04's: 01's change |
| Bonds held 1 / 2 / 3 / 4 at Empathy 1 / 4 / 7 / 10 with B13's gates | stat `ties_max:bond` (`kit.ts tieCap`), `tending.json tend.threads`, `tend.bonds_5`, `tend.bonds_8` | the door ladder (S2) writes `res_max:bond`; `tend.bonds_5`, `tend.bonds_8` and `tend.mender_bonds` retire |
| Snap at Empathy 1 | `tending.json:534-539 tend.snap requires` | `min` 2 to 1 |
| Tending ties at Empathy 2 | op `tie` (kind bond) on `acted`, predicate `target_not_tied` | an effect on `tend.mend`, `tend.shield`, `medic.triage` gated on Empathy 2 |
| Snap All, Bite x1.0 / 1.3 / 1.6 | `tend.snap` amounts (`tending.json:668, :677`), the `targets: {tied: bond}` selector (as `tend.threads`' echo) | an "all" choice on the action; the amounts read Bite (S2) x `cash_share:bond` (S3) |
| Overbind | a one-use condition with `stat_mod res_max:bond +1` (S5); its HP price a share, op `resource` on `turn_start` | a condition row and a 0-AP grant on Empathy 8 |
| Tending MP costs | each verb's `res.mp` (`tending.json`), `classes.json` Triage, Inspire, Rally; the cost site (`effects/cost.ts`) | 01 T7b's bases, read x `mp` (01's change) |
| Healing given +10% / +5% | profiles `healing`, `mend`, `tend` | 01 T5 (data) |
| Camaraderie's and Conscience's received bonuses | stats `heal_received`, `shield_received` (`character.ts:1247, :1249`) | read the rows' `numbers` (the typed 0.1 goes) |
| The feed's flat term (B20) | `doorFeed` (`effects/feed.ts:36`) | `per_point.numbers.feed_flat` on Camaraderie (0.02) and Conscience (0.04): extension E1 |
| Hold Together, Both Ways | op `redirect` with `limit.reaction` (Share a Hit's rows), `mend_mult` on `heal` with `if.actor_tied` | data rows on Camaraderie 6 and 8 |
| Taunt Bonds (Insinuation 6) | `call.taunt` step; op `tie` on the failed save | a step row |
| Stage Reach 2 / 3 / 4 / 5 | `MAX_STAGE` (`magic.ts:729`, from `soul_modules.json:13`) | read per character as `res_max:stage` (S5) through the door ladder (S2); Heart Surge and the Push add one |
| The compounding Release | `stageMult` (`magic.ts:730`), `feelings.json plain_step`, the held design's `plus` | `C = 0.8 + sum(step x 1.2^i)` in the one place it is built (`outburstTerms`, `magic.ts:1371`); the ratio from S3's data key |
| Soul power +10% / +5% | profiles `soul`, `soul_mend` | 01 T5 (data) |
| MP pool, Pump MP, Syphon | `maxMp` (`character.ts:860`), `pump_mp` (`soul_modules.json:56`), `syphonMult` (`character.ts:903`), `rules.json` mana bands `syphon_mp` | 01's change (A6): numbers into `attributes.json derived` and `rules.json`; `MP_REV` |
| Strain's burn as a share; Composure 10's 4% | `strain.burn_per_point` (`soul_modules.json:65`, `magic.ts:734 STRAIN_BURN`) | 01's `burn_share` 0.06; a Composure 10 row lowering it (data) |
| Overdraw past the top | Overdraw (`skills.json:4688`), the toggle predicate, Strain via op `resource` | a step on Will Power 8 adding `res_max:stage` +1 for the use; "no fall next turn" as a condition on the `turn` calming row |
| Margins on a Bolt or a Lance | 01's S1 at `classes/soul.ts:36-39` | 01's change |
| Door Marks (all three) | the keyed Marks (S4) | three `marks` rows from 05's formula; Mark I of prayer is op `resource grace +1` on `combat_start` |
| Afterglow, Outbursts' Mark I | stat `begin_stage` (S11) answered by a condition (Afterglow) and the mark (Mark I) | a condition row; Begin reads the stat |
| Iron Heart, Heart Surge, Storm Front | `classes/i.ts:1147-1240` handlers; their rows | Storm Front's 10 / 2 / 2 into `numbers`; Heart Surge reads `res_max:stage`; Shape's handler retires |
| Module practice, feeling marks | `soul_modules.json:1327 practice`; `feelings.json` | 05's numbers |
| Grace | the resource `grace` (S10); op `resource` on `acted` (prayer) and in `faith.ts`'s tag recorder (the liked act, the taboo); `wear:grace` (S6); flags `mark` / `no_flag` for the turn's wear | the resource row; `grace.per_prayer`, `per_liked`, `taboo` in `patrons.json prayer`; the Hymn's amount x `C` |
| Grace Reach 2 / 3 / 4 / 5, Bite 15 / 20 / 25% | the door ladder (S2) on the prayer door's row, writing `res_max:grace` | data |
| The Hymn's wait | `patrons.json:82 cooldown_rule` (`character.ts:1266 HYMN_COOLDOWN`, whose typed fallbacks go) | base 10, per_faith 0.5, per_virtue 0.25 counted above 1 |
| Devotion's start, curve and caps | `patrons.json:8, :17, :48`; `faith.ts:95 TAG_CAPS` | 05's numbers; start 0 for new characters |
| Prayer graded by Devotion | 01's standing predicate and the rarity rows' `with_this` (01 section 8) | 01's change |
| Blessing power +10% / +5% | profiles `blessing`, `blessing_mend` | 01 T5; the `blessing` level `deal` (01) |
| The Push of prayer | `patrons.json:100 overreach` | `faith_min` 8; once a turn; the price on success and on a miss |
| Ward, Smite, Sanctuary, Amen, Verdict | `classes.json` guardian rows, `:7716` | 01's bases; Verdict 3 AP and `C` |
| Conscience 2 / 4 / 6 / 8, Authority 2 / 6 | the Devotion choke point (`faith.ts` `shiftDevotion`), `wear:grace`, op `resource` on `shield`, `defense_bonus` via a condition, `cleanse` on the Order | data rows on the skills |
| Rank levels 3 / 5 / 15 | `classes.json:17 rank_levels` | II 5, III 15 (05's change) |

## 6. Needs a new primitive

Names from critic-consistency's merged list (section 4). General pieces only.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S10. The resource `grace`** | one row in `data/actions.json resources` (`grace`, `res.grace`), its max `res_max:grace` from the door ladder; laid and spent by op `resource` and by `faith.ts`'s tag recorder reading `patrons.json` numbers | prayer has no in-fight counter: `devotion_xp` is the run's, `ledger` is the Mender's, the rest belong to other doors |
| **S11. The stat `begin_stage`** | one line in `STATS` (`effects/stats.ts`): the stage a Begin starts at | the twin of `momentum_start` for the heart; `free_pumps` gives AP-free Pumps and `rider_stage` moves only the rider |
| **S3's `cash_share:<resource>`** (with the shared `cash:`) | `S(n) / n` beside `S(n)` in `SOURCE_SPACES` (`effects/triggers.ts:373`) | Snap All pays each Bond an even share; a number block can add and multiply sources but cannot divide by the count |
| **S5. `res_max:<resource>`** (shared) | `ties_max:<kind>` generalised; Reach writes it, a Push is a one-use condition adding 1 | Bonds already read `ties_max:bond`; the stage (`MAX_STAGE`) and Grace have no cap a stat can move |
| **S2, S4, S6** (shared) | the door ladder (with B13's second and third `points` keys), keyed Marks, `wear:<resource>` | as critic-consistency section 4 |
| **E1. The feed's flat term** (extension) | `doorFeed`'s product becomes `1 + (feed_flat + feed x alpha) x beta`, `feed_flat` 0 where a row gives none | B20: a beta point must count from the first; today a feed is zero with no alpha points and tiny with few |

## 7. What re-records

| Guard | What moves, and why |
| --- | --- |
| Damage tables (`test/golden-damage*.test.ts`, `test/golden/*.json`; magic, perks, classes, builds) | every Outburst (the compounding Release, the Damage school 22.2, the slopes, `deal`, the Emanator's grade, Margins on Bolt and Lance), every heal and shield (01's bases on `mend`, Insight's slope, the Attuner's grade), Snap on `deal`, Snap All's Bite, every prayer (01's bases, Grace, `deal` in place of `scale`, the Devotion grade), Smite, Verdict, Sanctuary, Triage 3.4, Love 1.69, interventions |
| Costs tables (`golden-costs*`, `costs-cooldowns`) | Tending's MP, Pump MP, Syphon, Triage, Inspire, Rally (01 T7b); the Hymn's wait (base 10, Faith and Virtue); Verdict 3 AP; Overdraw past the top; Overbind's share |
| Rules tables (`golden-rules`) | Bonds held by Empathy with B13's gates, Snap at 1, Snap All, Tending ties; stage Reach; Grace laid, worn and cleared; Strain's burn as a share |
| Item-ops table (`golden-itemops`) | Iron Heart, Storm Front, Heart Surge, Shape (retired), Ward, Smite, Take the Weight, the Ledger |
| Conditions table | Overbind's and the Pushes' conditions, Afterglow's |
| Replay guard (`test/replay-hash.test.ts`) | every seeded game with a Soul caster or a Faithful |
| Old saves (`test/old-save.test.ts`) | 01's `MP_REV` (each Emanator and Attuner keeps its share of the bar); Devotion XP kept, above 300 held at 300; the Mender's fourth Bond and a held stage above the new Reach clamped in a saved fight |
| Tests that read today's numbers | soul and outburst suites (the stage table, `MAX_STAGE`, damage base 37), faith suites (the wait, the curve, tag caps, start 3), tending suites (Bonds at 5 and 8, Snap at 2, Snap one), class suites (rank levels 6 and 12), `heal-pct.test.ts`, `bond-heal-shown.test.ts` |
| Lint and literal baselines | shrink: `maxMp`, `syphonMult`, `soulCostSaving`, `healReceivedMult`, `shieldReceivedMult`, `HYMN_COOLDOWN`'s fallbacks stop typing numbers; Storm Front's three literals; Shape's handler gone |
| Screen data (`protodata.json`), ladder rows, `tools/text_numbers.py` | Empathy's, Will Power's and Faith's per-point rows; the three cards (01's texts); Camaraderie, Insinuation, Conscience and Authority's new rows; the Channeler's rank I; every prayer text that types a digit reads its row |
| Survival measures (`npm run balance`) | everything; read, not held to a line |
