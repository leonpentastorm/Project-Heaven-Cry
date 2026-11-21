# The doors of Soul: Bonds, Outbursts, Prayer (0.34 rebalance, design draft 04)

Drafter's file for the lead. **Nothing here is built.** Written to `docs/design/proposals/2026-11-21-the-curve.md` (the six laws, the Momentum pattern in section 16, the debate rounds and the charter in section 18) and to the checked maps of 21 Nov. Facts about today carry `file:line` and were read by me in `E:/phc-wt/rel030` (`release/0.34-final`) on 21 Nov 2026. Every proposed number is **PROVISIONAL** and carries a reason a player would recognise.

## 0. What this file shares with the other drafts

This file uses the shared pieces that `02-body.md` section 0 already asks for, and the rates `05-pacing.md` section 4 proposes. It does not ask for them again; where it needs one more form of a shared piece it says so.

1. **The door ladder** (02-body, "Needs" row 1): Reach and Bite as rows `{points, reach}` and `{points, bite}` on the door's row, one reader `doorLadder`.
2. **The cash-out sum** (02-body, row 2): `S(n) = 1 + 1.2 + 1.44 + ...` (S(1) 1, S(2) 2.2, S(3) 3.64, S(4) 5.37, S(5) 7.44). A damage or heal payoff is `x(1 + Bite x S(n))` or, where the unit is a whole blow (a Snap), `Bite x S(n)`. A cash-out spends all of its counter. **One more form this file needs:** a cash-out that lands on several units (Snap All) gives each one an even share, `Bite x S(n) / n`.
3. **The keyed practice track** (02-body, row 3) carries every door's Marks; **the wear guard** (02-body, row 4) carries "keeps Grace" (section 3(f)).
4. **Worthy foes** are within two levels (`enemies.json levels.gap`). **Marks** count units spent in cash-outs on worthy foes; each door's thresholds are `[2, 11, 17, 23] hours x a specialist's units an hour` (05-pacing section 4), at 05-pacing's 3.2 worthy fights an hour.
5. **Module practice, feeling marks and the Devotion curve** are 05-pacing's numbers (section 4, rows "Outburst modules", "Feelings", "Devotion"); this file states what they give and checks the 80%.

**Units used for every number below.** The scale file (not yet written) owns the columns. Until it lands I read the charter's numbers:

| Column (name I read) | What it is | Level 1 | Level 10 | Level 20 |
| --- | --- | --- | --- | --- |
| `deal` | the damage level column, about x1.214 a level | 1 | 5.7 | 40 |
| **P** (on `deal`) | a specialist's plain 2-AP shot, build and grade included (charter: 18 and 1,400) | 18 | 140 | 1,400 |
| `hp_ref` (the `mend` column is `hp_ref(L) / hp_ref(1)`) | max HP of an Endurance-4 character (charter: 60 and 120 at level 1, about 3,000 and above 8,000 at level 20) | 90 | 600 | 5,000 |
| **H** (on `mend`) | a specialist's Mend (2 AP): 25% of `hp_ref` at level 1, growing with the healer's own points | 22 | 175 | 1,540 |
| `mp` (NEW, section 2(c)) | the MP column, `1 + 0.06 x (level - 1)` | 1 | 1.54 | 2.14 |

Every damage below is a multiple of P, every heal and shield a multiple of H. If the scale file names its columns differently, its names win; the multiples are what this file decides. A "plain action" (PA) is one 2-AP action at P (or H for a heal).

**Points.** By the rule given (10 Skill points at creation, odd levels 2, even levels 1 Skill and 1 Attribute), a character has **38 Skill points** at level 20, not 48 (10 + 9 x 2 + 10 x 1). 30 of them fill one attribute's three skills; 8 are left. The tables in (j) use 38.

**One rule for all three Soul attributes (section h): the attribute is the engine's size, +10% a point; the alpha skill +5% a point.** Today the cards disagree with each other and with the engine (3(a), 2(a), 1(a)); this is the Momentum pattern (Strength +10%, Raw Power +5%) applied to Soul.

---

## 1. Insight: the door of Bonds and Tending (Empathy; Camaraderie; Insinuation; the Mender, id `bard`)

### 1(a) Today

**The counter: Bonds held** (ties of kind `bond`). Empathy 1 gives one (`tending.json` `tend.threads`, `stat_mod ties_max:bond +1`), Empathy 5 a second (`tending.json:317 tend.bonds_5`), Empathy 8 a third (`:339 tend.bonds_8`), the Mender one more (`:1057 tend.mender_bonds`). Allies and enemies share the count.

**What builds it.** Bond (`tending.json` `tend.bond`): 1 AP, an Attuner in hand, a unit in sight within 6 tiles (+3 at Empathy 6, +3 Long Thread); an enemy makes a Heart save against Empathy (Elite +2, Boss +5; `tending.json:21-26 bond`); machines refuse. The Mender's free Bond (`:941 tend.bond_free`): 0 AP, no range, once a turn.

**What holding pays** (`tend.threads`, all while the Attuner is in hand): 20% of damage you take goes to Bonded enemies, split; +3 to hit a Bonded enemy; 20% of every heal you give to yourself or a Bonded ally reaches each Bonded enemy as Soul damage at its next turn; +5% damage a Bond held; Tending a Bonded ally x1.2; a Bonded ally going Down costs 10 MP; you read a Bonded ally's attackers' intent. While you hold any Bond you are Traced.

**What spends it.** Snap (`tending.json:529 tend.snap`, Empathy 2): 1 AP, once a turn, breaks **one** Bond: an enemy takes `3.0 x Healing given` Soul damage (`:667`, profile `tend`) and is Dazed (it saves); an ally heals `3.0 x` (`:676`). The Mender's Ledger empties into it first.

**Tending verbs.** Mend (`:707`): 2 AP, 24 MP (`:727`, -6 at Empathy 9), heals `3.75 x` (`:781`); Mend Yourself once a turn, same; Shield (`:856`, Empathy 5): 2 AP, 30 MP (`:876`), a Bonded ally only, `4.5 x` (`:930`). The profile `tend` (`rules.json:1970`): k 3.74 x (1 + 0.06 x (Insight - 1) + 0.06 x Empathy) x the `mend` level column (`rules.json:1768`, x11.97 at level 20).

**Empathy's ladder** (`skills.json:3991`; alpha schedule `skills.json` `ladder.alpha`: perk steps 3, 6, 7, 9, forks 4, 8, Mastered 10): 1 Bond and Mend; 2 Snap; 3 perk step; 4 fork Keep the Thread or Short Thread (`forks.json` `fork.tend.*`); 5 Shield; 6 perk step and +3 Bond reach; 7 perk step; 8 fork Shared Pulse or Long Thread, third Bond; 9 perk step, Mend and Shield -6 MP; 10 Mastered, Threads That Hold (Tending a Bonded friend x1.5 in place of x1.2, through a `mend_mult` of 1.25; ally Bonds hold while you are Down). Perks: Taut Thread (+6% / +12% hits on a Bonded foe; II rolls with Empathy), Bitter Balm (10% / more of a heal as Soul damage to Bonded foes).
- Card per point (`skills.json:4018 per_point`): +6% Healing given (**true**: profiles `healing`, `mend`, `tend` skill 0.06); Bonds at 1, 5, 8 (true); +3 reach at 6 (true); -6 MP at 9 (true). **Reach never moves past 3 and Bite never moves**: an Empathy-10 Snap is the Empathy-2 Snap with a bigger Healing given.

**Camaraderie** (beta, `skills.json:4217`): Share a Hit (reaction: take 25% + 5% a point, at most 50%, of a hit on an ally beside you; from 5 a Bonded ally in sight); heal back (`feed`: 1% x Empathy x Camaraderie of Bond healing heals you, to 30%; `effects/feed.ts doorFeed`); +10% healing received a point (**typed in code**, `character.ts:1247 healReceivedMult`, not read from the row's `numbers.heal`). Perk steps 3, 5, 7, 9; Mastered Many Hands. Points 2, 4, 6, 8 move only the per-point numbers, and from 6 the Share a Hit share is already at its 50% cap.

**Insinuation** (gamma, `skills.json:4458`): the Call Taunt (`calls.json` `call.taunt`: steps at 1, 4, 8: the Taunted foe's attack costs it +0 / +1 / +2 AP); its price by points 3 AP, 2 from 5, 1 from 9, twice a turn and on the reaction at 10 (`calls.json` `rules.price`); reach 4 + 1 a point; Outburst modules Anchor, Lure, Linger at 2 (`soul_modules.json` `gates`); as a gamma it adds its full points to checks and Asks. Perk steps 3, 5, 7, 9; Mastered Their Own Idea.

**Insight's card** (`attributes.json:198`): +6% healing given (true, the profiles' attr 0.06), -5% Soul magic MP cost (true, **typed in code**, `character.ts:901 soulCostSaving`), +25 max MP (true, **typed**, `character.ts:860 MP_PER_INSIGHT`).

**The Mender** (`classes.json:2302`): rank I Triage (`classes.json:4505`, from `medic`: 2 AP, 18 MP, heal `4.3 x` a friend beside you or a Bonded friend in sight, stop Bleeding, once an ally a turn), The Ledger (`:2337`: heals and shields you give fill it to a cap of `6.5 x`; your next damaging blow adds 70% of it), and the tend items gated on rank I: the free Bond, One More Bond, Field Surgery (out of a fight, 45 MP: treat a limb injury). Rank II (attribute 5 and level 6, `classes.json:12-21`): Inspire (`:5393`: 1 AP, 30 MP, give a Bonded unit a feeling you have felt), Take the Weight (`:2452`: reaction, a Bonded ally about to go Down stays on 1 HP and you lose 15% max HP, or you take its Stun, Daze or Fear). Rank III (attribute 8 and level 12): Brimming (`:5605`: overheal leaves 50% as a shield), Rally (`:2555`: 2 AP, 60 MP, once a scene, heal `3.1 x` every Bonded ally and every ally within 4, end Fear and Shaken).

### 1(b) Empathy's ladder, points 1 to 10

**Reach is Bonds held. Bite is what one Bond is worth when it is Snapped** (the unit: a lone Snap, 0.6 P of Soul damage on a foe or 0.4 H of healing on a friend, at the specialist's build; the Daze stays). The Momentum rhythm fits: Bonds held moves from 1 / 5 / 8 to 1 / 4 / 7 / 10.

| Empathy | What exists (kept where it is) | Reach (Bonds held) | Bite (a Bond, Snapped) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Bond, Mend, Mend Yourself, Threads | 1 | x1.0 | **Tending ties:** your Mend, Shield or Triage on a friend you are not Bonded to Bonds it, free, if you have room. **Snap All** opens with Snap at 2 |
| 2 | Snap | | | Snap may break one Bond or **all of them** (the cash-out) |
| 3 | perk step | | | |
| 4 | fork: Keep the Thread or Short Thread | **2** (was at 5) | | |
| 5 | Shield | | | |
| 6 | perk step; +3 Bond reach | | **x1.2** | |
| 7 | perk step | **3** (was at 8) | | |
| 8 | fork: Shared Pulse or Long Thread | | | **the Push: Overbind** (1(d)) |
| 9 | perk step; Mend and Shield cost a quarter less (was -6 MP, so it holds on the new MP column) | | **x1.4** | |
| 10 | Mastered: Threads That Hold | **4** | | |

PROVISIONAL, with reasons a player sees:
- **Tending ties.** The medic who keeps you up is tied to you without spending a turn on it; the build of the door becomes the healer's own work, the way Momentum is built by hits.
- **Bite x1.2 at 6 and x1.4 at 9.** Each step makes a full Snap All visibly a fifth bigger.
- **Reach at 4, 7, 10.** The second Bond arrives with the first fork, the fourth only at Mastery: a 10 holds a different web from a 5.
- Per point: Healing given +5% (was 6%: the attribute carries the size now, section h).

### 1(c) The cash-out: Snap, and what everything costs

**The spending moment** is Snap (1 AP, once a turn). Snap All breaks every Bond you hold; it pays `Bite x S(n)` units, shared evenly (`Bite x S(n) / n` to each Bond): a foe takes its share as Soul damage and is Dazed (it saves), a friend heals its share. The Ledger still empties into it first. Then you build again.

**Costs, one by one** (MP on the new `mp` column of 2(c), so a cost is the same share of the pool at every level). PROVISIONAL:

| Verb | AP | MP (x `mp`) | Level 1 / 10 / 20 | Reason |
| --- | --- | --- | --- | --- |
| Bond | 1 | 0 | 0 | a Bond's price is the AP and, on a foe, its save |
| Let Go | 0 | 0 | 0 | unchanged |
| Snap (one or all) | 1 | 0 | 0 | the cash-out is paid by what you built |
| Mend, Mend Yourself | 2 | 12 (was 24) | 12 / 18 / 26 | about 8 to 12 Mends a pool at every level: a healer counts them |
| Shield | 2 | 15 (was 30) | 15 / 23 / 32 | a shield is 1.2 heals for 1.25 the price |
| Triage (Mender) | 2 | 10 (was 18) | 10 / 15 / 21 | the class heals better for less (1(i)) |
| Inspire (Mender) | 1 | 12 (was 30) | 12 / 18 / 26 | it must be worth pressing (1(i)) |
| Rally (Mender) | 2 | 35 (was 60) | 35 / 54 / 75 | once a scene, a quarter of a pool |
| Field Surgery (Mender) | 0 | 30 (was 45) | 30 / 46 / 64 | out of a fight |
| A Bonded ally goes Down | | 8 (was 10) | 8 / 12 / 17 | the thread hurts, on the same scale |

A Mender's pool (2(c) formula; the Mender of 1(j)): Insight 7 and Determination 2 at level 1, 100 MP; Insight 9 and Determination 3 at level 10, 197; Insight 10 and Determination 4 at level 20, 317. Syphon (1 AP, 2(c)) refills it; `survival.json ammo_pack` gives MP back after no fight (Leon, 17 Nov), so Syphon's AP is the real price.

**The compounding rule, in plain actions.** A lone Snap is 0.6 PA of damage (or 0.4 H of heal), for 1 AP, plus a Daze.

| Who | Bonds held | One Snap All is worth | The cycle against plain play, and how often |
| --- | --- | --- | --- |
| Empathy 1 | 1 | 1.0 lone Snap: 0.6 PA | Bond (1 AP) and Snap (1 AP) is a plain action plus a Daze: at par, any turn |
| Empathy 4, a mixed character | 2 | 2.2 lone Snaps: 1.3 PA | a Bond on a foe and a Mend that ties the friend, then Snap: about a fifth over plain, every turn |
| Empathy 7 | 3 | 4.4 lone Snaps: 2.6 PA | about a third over plain, every two turns |
| Empathy 10, a specialist | 4 | 7.5 lone Snaps: 4.5 PA | four Bonds built over a turn (two of them by Mends that were full-value anyway), Snapped the next: about half again over two turns of plain play, every two turns, if no Bond is lost first |

The consequence that makes the web a thing to protect: a foe that saves wastes the AP, a Bonded friend going Down costs MP, every Bond keeps you Traced, and a Snap ends the Bond's passives (the share, the echo, +5% a Bond).

### 1(d) The Push at Empathy 8: Overbind

Once a turn, 0 AP: hold **one Bond past your Reach** until it is Snapped (a condition on you, `ties_max:bond +1`; data). Snap All counts it like any other (`S(n+1)`). **Price:** when that Bond breaks, you take half of its share as Soul damage at the start of your next turn (nothing soaks it). PROVISIONAL. Reason: "you feel half of it" (the curve's own words for Bonds), landing on your next turn as the law asks; the price grows with the Snap, so a greedy web costs more.

Snap All as the normal cash-out and Overbind as the Push differs from the curve's table (which named "Snap every Bond at once" the Push). Why: the cash-out law needs several units spent in one go, and for Bonds those units are the Bonds; snapping one at a time can never compound.

### 1(e) Marks on the door

Earned by **Bonds broken by a Snap** while the fight has a worthy foe (a friend's Bond counts when a worthy foe is in the fight). A specialist breaks about 4.5 a fight, 14 an hour. **Thresholds, PROVISIONAL: Mark I 30, Mark II 160, the middle milestone 245, Mark III 330.**

| Mark | About | Gives | Reason |
| --- | --- | --- | --- |
| I | hour 2 | your first Bond each fight costs 0 AP and has no range limit (a Mender: the second Bond of its first turn is free too) | the door starts primed with 1 |
| II | hour 11 | a foe saves against your Bond at -2 | fewer wasted AP on the web |
| middle | hour 17 | Tending through a Bond is x1.3, not x1.2 | the threads you rely on carry more |
| III | hour 23 | Overbind costs nothing once a fight | the Push made safe once |

### 1(f) Tags for mixed characters

- **This door keeps others'**: Bond, Let Go and Snap are quiet acts at a distance: they carry "keeps the chain" and "keeps plates" (a Bond is not walking away from Momentum; holding Guard while you Bond keeps the plates). Mend, Shield and Triage count as **tending** for the Outburst heart's calming (exists: `soul_modules.json strain.calming` row `tend`) and as the patron tag **heal / protect** (exists, `patrons.json tags`): they lay Grace for a Faithful (3(c)).
- **Others keep this door's**: nothing in another door breaks a Bond today, so no "keeps Bonds" tag is needed. The cross-door relations a mixed character feels are the shares already written: Share a Hit with plates (Guard), a Bonded foe's +3 to hit for any weapon, and the echo of any heal (a prayer's or a stim's) reaching Bonded foes.

### 1(g) Camaraderie (beta) and Insinuation (gamma), points 1 to 10

**Camaraderie: how the door keeps you up.** Every point keeps today's rows (+10% healing received, read from the row's `numbers.heal` in place of `character.ts:1247`; heal back by the feed). PROVISIONAL additions where a point moved nothing a player sees:

| Points | Today (kept) | New |
| --- | --- | --- |
| 1 | Share a Hit 30% | |
| 2 | share 35% | |
| 3 | perk step; share 40% | |
| 4 | share 45% | |
| 5 | perk step; share 50%; Share a Hit reaches a Bonded ally in sight | |
| 6 | (only +10% received) | **Hold Together:** your first Share a Hit each round for a Bonded friend uses no reaction. Reason: the friend you are tied to never waits for your reflexes |
| 7 | perk step | |
| 8 | (only +10% received) | **Both Ways:** heals a Bonded friend gives you are +25%. Reason: the Bond carries care back as well |
| 9 | perk step | |
| 10 | Mastered: Many Hands | |

**Insinuation: the door outside a fight, its Call and its voice.** Every point adds its full points to checks and Asks (the gamma rule) and +1 tile of Taunt reach. Kept: Taunt's steps at 1, 4, 8; the Call price at 1, 5, 9, 10; modules at 2; perk steps 3, 5, 7, 9; Mastered at 10. **New at 6, PROVISIONAL: a foe that fails your Taunt's save may be Bonded to you at once for no AP, if you have room** (the barb that hooks the heart). Reason: point 6 moved only a tile of reach; this is a verb, and it joins Insight's gamma to its door.

### 1(h) Insight's card, made true

| Per point above 1 | Today | Proposed (PROVISIONAL) | Reason |
| --- | --- | --- | --- |
| Healing given | +6% (true) | **+10%**, on every heal you give: Tending, stims, kits, a Soul Buff's heal through `healing` | the attribute is the engine's size; and every character carries stims, so a point of Insight is never dead |
| Soul MP cost | -5% (true, typed in code) | -5%, read from `attributes.json derived` | kept |
| Max MP | +25 (true, typed in code) | **+8 x `mp`** (2(c)) | on the new pool, about a Mend a point |

### 1(i) The Mender (`bard`): what only it has

Ranks: **I at level 3, II at level 5 (attribute 5), III at level 15 (attribute 8)** (charter; `classes.json:17 rank_levels` 3 / 6 / 12 today).

**Only the Mender:** **the Ledger** (a second counter fed by its own healing and cashed by its blows), **Triage** (a heal nobody else has, cheaper and stronger), and **the free Bond** each turn. One More Bond **retires**: its Bond becomes everyone's at Empathy 10 (as the Breaker's chain of 5 went to Raw Power).

| Rank | Move | Today, set-up met | Worth pressing? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| I | Triage | 1.15 Mends for the same 2 AP | **no** | heal **1.5 H** (was 4.3 x, about 1.15 H), 10 MP: the class's own Mend, one and a half of anyone else's |
| I | The Ledger | +70% of up to `6.5 x` banked on the next blow: about 1.5 PA added to one hit | yes | cap **1.75 H**; factor 0.7 kept |
| I | Bond (free) | 1 AP saved a turn, no range | yes | kept |
| I | Field Surgery | out of a fight | (not a fight move) | MP on the column |
| II | Inspire | a felt feeling to a Bonded unit; Love heals `1.9 x` (0.5 H) for 1 AP and 30 MP | **no** | Love heals **0.75 H**, 12 MP; the other feelings' boons kept |
| II | Take the Weight | a Down prevented | yes | kept |
| III | Brimming | passive | (passive) | kept |
| III | Rally | 0.8 H to every Bonded ally and every ally within 4: about 3 H with four friends | yes | heal **0.8 H** each, 35 MP |

### 1(j) How a player spends: the Insight specialist and a mixed medic

**The Mender** (Insight 7, Endurance 3, Agility 2, Determination 2 at creation; Empathy 7, Camaraderie 2, Insinuation 1). Hours from the beat sheet (curve section 12).

| Level (hour) | Buys | What the player gets |
| --- | --- | --- |
| 1 (0) | creation | 3 Bonds, Bite x1.2, Snap All, Shield, fork a, three perk steps; Share a Hit 35% |
| 2 (1) | Camaraderie 3; Endurance 4 | a Camaraderie perk; +HP |
| 3 (2) | Mender rank I; Camaraderie 4, Insinuation 2 | Triage, the Ledger, the free Bond; share 45% |
| 4 (3) | Camaraderie 5; Determination 3 | Share a Hit for a Bonded ally, a perk; +MP |
| 5 (4) | rank II; Camaraderie 6, Insinuation 3 | Inspire, Take the Weight; Hold Together; a perk |
| 6 (6) | Insight 8; Empathy 8 | fork b and **Overbind** (the Push); +10% heals |
| 7 (8) | Camaraderie 7, Insinuation 4 | a perk; Taunt costs a foe +1 AP |
| 8 (11) | Insinuation 5; Endurance 5 | a perk; Taunt for 2 AP |
| 9 (13) | Camaraderie 8, Insinuation 6 | Both Ways; Taunt Bonds |
| 10 (16) | Insight 9; Empathy 9 | **Bite x1.4**, a perk, cheaper Mends |
| 11 (18) | Camaraderie 9, Insinuation 7 | two perks |
| 12 (21) | Insinuation 8; Determination 4 | Taunt +2 AP; +MP |
| 13 (23) | Insinuation 9; 1 point elsewhere (Pain Threshold 1) | a perk; Taunt for 1 AP |
| 14 (26) | 1 point elsewhere; Endurance 6 | **flag: no purchase in the door until Insight 10**; HP |
| 15 (28) | rank III; 2 points elsewhere | Brimming, Rally (felt); **flag: the Skill points are not felt in the door** |
| 16 (31) | Insight 10; Empathy 10 | **Reach 4**, Mastered Threads That Hold |
| 17 (33) | Camaraderie 10, Insinuation 10 | Many Hands, Their Own Idea |
| 18 to 20 (36 to 40) | 4 Skill and 2 Attribute points elsewhere | breadth: Composure, Faith 1 to 2 for Whispers |

The two flags are the gates on fives: the Insight skills wait on Insight 10 (level 16). They are felt elsewhere if the player has a second interest; I recommend the level-up screen says so ("Insight 10 at level 16 opens your last points here").

**A mixed medic** (the rifleman who keeps the squad up: Agility 7, Insight 4, Endurance 2; Dexterity 6, Empathy 4; class at 3 is the Skirmisher).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | 2 Bonds, Snap All, fork a, a perk step; the rifle |
| 2 | Camaraderie 1; Insight 5 | Share a Hit; +10% heals |
| 3 | Dexterity 7, Empathy 5 | the Skirmisher; Shield |
| 4 | Camaraderie 2; Endurance 3 | share 35%; HP |
| 5 | rank II; Athletics 1, 2 | the Agility door's beta |
| 6 | Agility 8; Dexterity 8 | Dexterity's Push |
| 7 | Camaraderie 3, Athletics 3 | a perk |
| 8 | Insight 6; Empathy 6 | Bite x1.2, +3 Bond reach |
| 9 | Camaraderie 4, Athletics 4 | share 45% |
| 10 | Agility 9; Dexterity 9 | Dexterity's Bite |
| 11 | Camaraderie 5, Athletics 5 | Share a Hit through the Bond; a perk |
| 12 | Insight 7; Empathy 7 | **Reach 3** |
| 13 | Athletics 6, Reaction Speed 1 | Cue |
| 14 | Camaraderie 6; Endurance 4 | Hold Together |
| 15 | rank III; Athletics 7, Reaction Speed 2 | the class's rank III |
| 16 | Agility 10; Dexterity 10 | Dexterity Mastered |
| 17 | Athletics 8, Reaction Speed 3 | |
| 18 | Insight 8; Empathy 8 | **Overbind**, fork b |
| 19 | Athletics 9, Camaraderie 7 | two perks |
| 20 | Athletics 10; Endurance 5 | Athletics Mastered |

Every level buys something felt. Insight's skills wait on Insight (every second even level goes to it), so Empathy rises every four levels. The mixed medic cashes two Bonds every turn, holds three from level 12, has the Push at 18 and never reaches Bite x1.4: a different machine, two bars filling.

### 1(k) Heals, shields and shares on the new scale (specialist, before the focus's grade)

| Amount | Multiple | Level 1 | Level 10 | Level 20 |
| --- | --- | --- | --- | --- |
| Mend, Mend Yourself | 1.0 H | 22 | 175 | 1,540 |
| Shield | 1.2 H | 26 | 210 | 1,850 |
| Triage (Mender) | 1.5 H | 33 | 260 | 2,310 |
| A lone Snap on a friend / a foe | 0.4 H / 0.6 P | 9 / 11 | 70 / 84 | 615 / 840 |
| Snap All of 4 at Bite x1.4, each of four | 1.9 x the lone Snap | 17 / 21 | 130 / 160 | 1,150 / 1,580 |
| Ledger cap (Mender) | 1.75 H | 38 | 305 | 2,700 |
| Rally, each friend (Mender) | 0.8 H | 18 | 140 | 1,230 |
| Inspire's Love (Mender) | 0.75 H | 17 | 130 | 1,150 |
| Bond share, echo, Share a Hit, Take the Weight | shares (20%, 20%, 30 to 50%, 15% max HP) | ride the HP they move | | |

The heal reads the `mend` column (`hp_ref`); **Snap's damage reads `deal`** through a new profile row `tend_harm` (Insight and Empathy, level `deal`; data), because a blow should grow with the blows it meets, not with HP (today Snap's damage rides the heal column, `tending.json:667` profile `tend`).

---

## 2. Determination: the door of Outbursts (Will Power; Composure; Lore Master; the Channeler, id `channeler`)

### 2(a) Today

**The counters: the stage** (0 to 4 for everyone, `soul_modules.json:13 max_stage`; `magic.ts:729 MAX_STAGE`) **and Strain** (limit 3, +1 at Composure 1, 2, 4, 6, 8: `soul_modules.json:63`; burn 8 HP a point over, `:65`; 3 over is a Mana Short; Mana Shock 25% max HP a turn).

**What builds the stage.** Begin (2 AP, the design's MP, +1 Strain; `soul_modules.json` `cycle`); Pump (1 AP, MP 10% of the Begin's a stage reached, `:56 pump_mp`); one free Pump a turn at most: the fight's first, and one a round from Will Power 3 (`:27`); a swell (+1 stage, +1 Strain, at your turn's start while held; no Strain from Composure 6); Feed (a glyph); Overdraw (Will Power 2, `skills.json:4688`: once a turn a Pump adds 2 stages, +1 Strain after the fight's first).

**What spends it.** Release (1 AP) at `stage_mult` x0.8 / 1.0 / 1.2 / 1.4 / 1.6 (`soul_modules.json:14`; `magic.ts:728`); a feeling Pump steps its own number (rage +0.5, calm -0.4 ...; `feelings.json`), each feeling once an Outburst, four at most. Damage base 37 (`soul_modules.json:112`, read at `magic.ts:752`; the school row's `damage 40` at `:187` is a dead copy). The Soul multiplier is `statOf('soul')` (`character.ts:878`), profile `soul` k 1.55, **attr 0, skill 0** (`rules.json:1866`): a constant.

**MP.** `100 + 75 x (Determination - 1) + 25 x (Insight - 1)` (`character.ts:860-861`, typed): 550 at Determination 7, flat across levels; a Heart Bolt costs 25. No node gives MP back (`survival.json ammo_pack mp_about`); Syphon (1 AP) gives the air's band (30 / 60 / 90 / 120, `rules.json:1335-1362`) x `1 + 0.1 x (Det - 1) + 0.1 x WP` (`character.ts:903`, typed): 138 MP at 7/7 in normal air. **MP is not a choice today**: a specialist holds nine full cash-outs.

**Will Power's ladder** (`skills.json:4611`): 1 the door (an Emanator in hand); 2 Overdraw, modules Size and Quiet; 3 perk step, a free Pump a round; 4 fork Ride the Edge or Slow Burn; modules Bloom and Volley; 5 Two Schools (a second school at half, +10 MP); 6 perk step, a module slot; 7 perk step; 8 fork Blood Price or Clean Break; 9 perk step, a slot; 10 Mastered The Twin Pays. Every 2 points +1 tile of reach (`character.ts:902`, typed 0.5); a module slot every 3 (`character.ts:907`, typed, beside the data string `soul_modules.json:174`). Perks: Clenched Heart (+5% at stage 3; II also at 2), Resonance (+4% a Release, to 8 / 12%).
- Card per point: **+10% Soul power: false** (the profile's skill slope is 0); +10% syphoned (true, typed); harder to save against (true, `saveTn`). **Reach and Bite never move.**

**Composure** (beta, `skills.json:4853`): +1 on Heart saves a point (true: the Heart save rolls Composure, `character.ts:972`); the Strain limit; modules Homing, Swift, Left, Right, Silent at 2; a held Outburst swells with no Strain from 6. Perk steps 3, 5, 7, 9; Mastered Still Water. Every point already moves a number.

**Lore Master** (gamma, `skills.json:5014`): the Call Name It (+2 / +3 / +4 on saves at 1 / 4 / 8, a fresh save from 4, Fear ends at 8); +1 tile of its reach a point; the first tone at 1; forms Wave, Burst, Aura, Lance and modules Time, Ether, Phantom at 2; Ricochet, Fuse, Return at 4; a ready design +1 at 4, 6, 8, 10 (`soul_modules.json:177`). Perk steps 3, 5, 7, 9; Mastered True Name.

**Determination's card** (`attributes.json:227`): **+5% Soul power: false** (profile attr 0); +75 max MP (true, typed); +10% syphoned (true, typed).

**The Channeler** (`classes.json:2639`): rank I Shape (`:5160`: the free Pump steps +0.12 more on a Damage design; a bespoke handler `classes/i.ts:1147`), Iron Heart (`:2676`: once a fight, on Mana Shock, -2 Strain); rank II Storm Front (`:5190`: once a turn, +10 MP, a Bolt or Lance arcs to 2 more foes within 2 tiles; **the 10, the 2 and the 2 are typed in code**, `classes/i.ts:1173-1199`), Occult Library (`:2716`: a free Syphon once a turn, one more tone); rank III Heart Surge (`:5223`: once a turn a Release one stage higher, never past 4; double Strain), Eye of the Storm (`:2784`: once a scene, the next Release adds no Strain, rider +1 stage). A class dial of value 1 (no effect).

### 2(b) Will Power's ladder, points 1 to 10

**Reach is the highest stage you may hold. Bite is the plain Pump's step.** With the cash-out law the Release multiplier becomes `0.8 + sum over Pumps of (step x 1.2^i)` (i counts the Pumps of this Outburst from 0): a plain Pump steps Bite; a feeling steps its own number plus (Bite - 0.2); a negative step (Calm, Relief) is not multiplied. Swells, Feed and Overdraw's second stage count as plain Pumps.

| Will Power | What exists (kept) | Reach (stage) | Bite (plain step) | New |
| --- | --- | --- | --- | --- |
| 1 | the door | **2** | **0.25** | Soul power +5% a point (was a false +10%) |
| 2 | Overdraw; modules Size, Quiet | | | |
| 3 | perk step; a free Pump a round | | | |
| 4 | fork: Ride the Edge or Slow Burn; modules Bloom, Volley | **3** | | |
| 5 | Two Schools | | | |
| 6 | perk step; a module slot | | **0.30** | |
| 7 | perk step | **4** | | |
| 8 | fork: Blood Price or Clean Break | | | **the Push: Overdraw past the top** (2(d)) |
| 9 | perk step; a slot | | **0.35** | |
| 10 | Mastered: The Twin Pays | **5** (the stage rules 1.60 item 4634 kept "reserved for the door's peak") | | |

The Release multiplier by Reach (plain Pumps): Will Power 1 x1.35 at stage 2; 4 x1.71 at 3; 7 x2.41 at 4; 9 x2.68 at 4; 10 **x3.40 at 5** (today x1.6 at 4 for everyone). PROVISIONAL. Reason: a heart worked to its top pays more than twice a quick one, and the tenth point is a stage nobody else can hold.

**Taken away:** Will Power 1 to 6 can no longer reach stage 4 (today anyone can). This is the one place the ladder removes something a low-point character has (question 4).

### 2(c) The cash-out: the Release, and what everything costs

**AP stays** (Begin 2, Pump 1, Release 1, Steady 1, Feed 1). **MP becomes a choice** (PROVISIONAL):
- **Max MP = (40 + 12 x (Determination - 1) + 8 x (Insight - 1)) x `mp`**, `mp = 1 + 0.06 x (level - 1)` (x2.14 at 20). The Channeler of 2(j): Determination 7, Insight 2 at level 1: 120; 9 and 3 at level 10: 234; 10 and 4 at level 20: 368. A mixed Determination 4: 76 at level 1.
- **A Pump costs 10% of the Begin's MP each** (flat; today 10% for each stage reached, which makes a fifth stage cost 50%). A full cash-out at Reach R costs `Begin x (1 + 0.1 x R)`.
- **Outburst costs grow by the design, not by the level** (a school 20, modules 5 to 20, a tone 5, a second school 10: `soul_modules.json schools`, `items`, `tones`); Tending costs ride `mp` (1(c)), since a Mend never grows richer.
- **Syphon** (1 AP, unchanged): the air's band **10 / 20 / 30 / 40** (was 30 / 60 / 90 / 120) x `(1 + 0.05 x (Determination - 1))` x `mp`. Will Power no longer adds to it.

| | Level 1 (Det 7, WP 7, Ins 2) | Level 10 (Det 9, WP 9, Ins 3) | Level 20 (Det 10, WP 10, Ins 4) |
| --- | --- | --- | --- |
| Pool | 120 | 234 | 368 |
| A typical design's Begin (after Insight's saving) | 24 (Heart Bolt, 25) | 41 (two modules, a tone: 45) | 64 (three modules, two schools, a tone: 75) |
| A full cash-out to Reach | 33 (Reach 4) | 57 (Reach 4) | 96 (Reach 5) |
| Full cash-outs a pool | 3.6 | 4.1 | 3.8 |
| One Syphon in normal air | 26 | 43 | 62 |

Reason: about four full Releases a pool at every level, and a Syphon is about half to three quarters of one; so a Syphon's AP, the air it drains and the MP left are a real choice at level 1, 10 and 20, and a bigger design costs a bigger share.

**Strain on the new scale:** the burn is **6% of max HP a point over the limit** (was 8 HP flat, `soul_modules.json:65`; 8 of 145 was 5.5%); Mana Shock 25% kept. Reason: Strain must hurt the same at level 20 as at level 1.

**The Damage school.** At x1.0 a specialist's Damage design deals **D = 1.4 P** (level 1 25, level 10 200, level 20 1,960; PROVISIONAL, set so the wait in the table below is paid about as Momentum's is). Raw ignores armour, an element counts armour half (kept).

**The compounding rule, in plain actions** (D = 1.4 PA; Overdraw once a turn; one free Pump a turn from Will Power 3):

| Who | Reach, Bite | One full Release | AP, and how often | Against plain play |
| --- | --- | --- | --- | --- |
| Will Power 1 | 2, 0.25 | x1.35: 1.9 PA | 4 to 5 AP (Begin, Pumps, Release) | par at best: a taste of the door |
| Will Power 4, a mixed character | 3, 0.25 | x1.71: 2.4 PA | 4 AP (Begin, the free Pump, Overdraw), every turn | about a fifth over plain, every turn, while Strain lasts (+1 net a turn) |
| Will Power 7 | 4, 0.30 | x2.41: 3.4 PA | 5 AP, every turn | about a third over plain |
| Will Power 10, a specialist | 5, 0.35 | x3.40: 4.8 PA | one turn: 6 AP; held: 3 AP, then the swell, the free Pump and 1 AP next turn | held over two turns, about 45% over two turns of plain play, every two turns, the heart glowing where everyone sees it |

With feelings the top grows: four strong feelings on a Reach-5 heart reach about x5 to x6, and with a Celestial Emanator and Heart Surge a level-20 Release passes 10,000: the "something super" five digits, paid for in Strain.

### 2(d) The Push at Will Power 8: Overdraw past the top

Once a turn, an Overdraw (or a Pump) may take the Outburst **one stage past your Reach** (stage 6 for a 10). **Price:** +2 Strain at once, and your Strain does not fall at the start of your next turn. PROVISIONAL. Reason: the curve's "Overdraw, price Strain", landing on the next turn; a heart pushed past its top stays hot. The Overdraw verb at Will Power 2 stays as it is (two stages in one Pump, within Reach). Heart Surge (the Channeler's) may stack with it (2(i)).

### 2(e) Marks on the door, and the practice tracks

**Door Marks:** earned by **stages Released** on worthy foes (a specialist about 7 a fight, 22 an hour). **Thresholds, PROVISIONAL: 45, 245, 380, 515.**

| Mark | About | Gives |
| --- | --- | --- |
| I | hour 2 | your first Begin each fight starts at stage 1 (primed with 1) |
| II | hour 11 | Strain falls by 2 at the start of your turn, not 1 |
| middle | hour 17 | once a fight, a Mana Short Dazes you instead of Stunning you |
| III | hour 23 | Overdraw past the top costs no Strain once a fight |

**Modules** (05-pacing's rates, adopted): practice as today (`soul_modules.json:1327`: 1 a Release, +1 a stage past 1, +1 a feeling), picks at 10, then every 80; a Mastery level in a gating skill +40. At about 38 practice an hour: a module every 2.1 hours, **23 of the 28 learnable modules by hour 45 (82%)**. A Determination specialist's gates cover 19 of them (Will Power 4, Composure 5, Lore Master 10); two points each in Empathy, Camaraderie and Insinuation (6 of the 8 spare Skill points, 1(j)'s table shows the same spare) open the other 9: **the 80% needs those points**, and I recommend the level-up screen names the module a point opens.

**Feelings** (05-pacing's marks per feeling, adopted): Mark I unlocked (its trigger in a worthy fight, `[2, 6, 12]` for a common trigger, `[1, 3, 6]` for a rare one); II its step +0.1; III **it can be chosen a second time in one Outburst** (the one feeling exempt from "once each"; my reading of "chosen, not only suffered", for the lead). 20 of 25 by hour 45.

**Tones:** the first at Lore Master 1; more from tutors, plates and Occult Library (kept); seven in all. **Ready designs:** Lore Master's (kept).

### 2(f) Tags for mixed characters

- **This door keeps others'**: Begin, Pump and Steady are still acts: they carry "keeps plates" (a held heart behind a Brace) and "keeps the chain". A held Outburst never keeps Hidden (the heart glows, today's rule).
- **Others keep this door's** (the calming rows exist, `soul_modules.json strain.calming`): a weapon attack (the first each turn, -1 Strain: the monk who fights it out), a heal, stim, shield or cleanse given (-1), a Call with Recitation (-1). **New, PROVISIONAL:** a Whisper you say calms 1 Strain once a turn (prayer stills the heart), and holding Guard counts as a still turn for the "still" row. These are the base layer of the Sigil-Outburst, Guard-Outburst and Prayer-Outburst Crossings.

### 2(g) Composure (beta) and Lore Master (gamma), points 1 to 10

**Composure** keeps every row: +1 Heart save a point; the Strain limit +1 at 1, 2, 4, 6, 8 (to 8); modules at 2; no-Strain swells at 6; perk steps 3, 5, 7, 9; Mastered at 10. No point is dead: each moves a save or the limit or opens something. **One change, PROVISIONAL: at 10, besides Still Water, the burn of Strain is 4% of max HP a point over, not 6%.** Reason: Mastered Composure should be felt in the door it guards.

**Lore Master** keeps every row (the tone at 1; forms and modules at 2; modules at 4; designs at 4, 6, 8, 10; Name It's steps 1, 4, 8; the Call price at 1, 5, 9, 10; perk steps 3, 5, 7, 9; Mastered True Name); every point adds its full points to checks and Asks and +1 tile of Name It reach. Point 2 opens 4 forms and 3 modules; point 3 is a perk; 5, 7 and 9 are perks with the Call's price; 6, 8 and 10 a ready design. No point is dead; no change.

### 2(h) Determination's card, made true

| Per point above 1 | Today | Proposed (PROVISIONAL) | Reason |
| --- | --- | --- | --- |
| Soul power | +5%: **false** (profile attr 0) | **+10%**, on every Outburst's damage, heal and shield (profiles `soul`, `soul_mend` attr 0.10 on Determination; Will Power 0.05) | the attribute is the engine's size |
| Max MP | +75 (true, typed) | **+12 x `mp`** | the new pool (2(c)) |
| Mana syphoned | +10% (true, typed) | **+5%**, read from the card | Syphon's band came down; the slope with it |
| (new) Heart saves | | **+1 on Heart saves every 2 points** | everyone meets Fear, Taunt and a Bond's save: a point of Determination outside a caster is never dead |

### 2(i) The Channeler: what only it has

**Only the Channeler: Afterglow** (new, rank I, in place of Shape): after a Release at stage 2 or higher, your next Begin this fight starts at stage 1 (stage 2 from rank III). PROVISIONAL. Reason: the Channeler's heart never goes cold between Outbursts; it cashes out and rebuilds faster, which no Will Power point gives. Shape **retires** (+0.12 on one Pump is about +7% on a full Release: a number, not a thing; the Bite ladder does its job now).

| Rank | Move | Today | Worth pressing? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| I | Afterglow (new) | | (passive) | as above |
| I | Iron Heart | -2 Strain once a fight on Mana Shock | (reactive) | **your Strain falls to your limit** (the shock ends at once), once a fight |
| II | Storm Front | +2 foes for 10 MP | yes (three targets) | kept; its 10 MP, 2 foes and 2 tiles move into the row's `numbers` (they are typed in `classes/i.ts`) |
| II | Occult Library | a free Syphon once a turn, a tone | yes | kept |
| III | Heart Surge | a Release one stage higher, not past 4 | yes | one stage higher **and may pass your Reach by one** (two with the Push): the Channeler's own peak; double Strain kept |
| III | Eye of the Storm | once a scene | yes | kept |

The class dial (value 1) is left at 1: a class is defined by what only it has, not by a percentage.

### 2(j) How a player spends: the Determination specialist and a mixed fighter

**The Channeler** (Determination 7, Endurance 3, Insight 2, Agility 2; Will Power 7, Composure 2, Lore Master 1).

| Level (hour) | Buys | What the player gets |
| --- | --- | --- |
| 1 (0) | creation | Reach 4, Bite 0.30, Overdraw, Two Schools, a free Pump a round, fork a, three perk steps, 3 slots; Strain limit 5; a tone |
| 2 (1) | Lore Master 2; Endurance 4 | four forms, three modules; HP |
| 3 (2) | Channeler rank I; Composure 3, Lore Master 3 | Afterglow, Iron Heart; two perks |
| 4 (3) | Composure 4; Insight 3 | Strain limit 6; MP, cheaper designs |
| 5 (4) | rank II; Lore Master 4, Composure 5 | Storm Front, Occult Library; three modules, a design; a perk |
| 6 (6) | Determination 8; Will Power 8 | fork b, **the Push**; +10% Soul power |
| 7 (8) | Composure 6, Lore Master 5 | no-Strain swells, limit 7; a perk |
| 8 (11) | Lore Master 6; Endurance 5 | a design; HP |
| 9 (13) | Composure 7, Lore Master 7 | two perks |
| 10 (16) | Determination 9; Will Power 9 | **Bite 0.35**, a perk, a slot |
| 11 (18) | Composure 8, Lore Master 8 | limit 8; a design, Name It's top step |
| 12 (21) | Composure 9; Insight 4 | a perk; MP |
| 13 (23) | Lore Master 9, Empathy 1 | a perk |
| 14 (26) | Empathy 2; Endurance 6 | four modules open |
| 15 (28) | rank III; Camaraderie 1, 2 | Heart Surge, Eye of the Storm; three modules open; **flag: the door's own skills wait on Determination 10** |
| 16 (31) | Determination 10; Will Power 10 | **Reach 5**, Mastered The Twin Pays |
| 17 (33) | Composure 10, Lore Master 10 | Still Water and the lighter burn; True Name; a design |
| 18 to 20 (36 to 40) | Insinuation 2; 2 Skill and 2 Attribute points | the last three modules open; breadth |

**A mixed fighter-channeler** (Strength 7, Determination 4; Raw Power 6, Will Power 4: the monk who fights it out and calms the heart with every blow; class at 3 the Breaker).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | Reach 3, Overdraw, a free Pump, fork a; the chain |
| 2 | Composure 1; Determination 5 | Strain limit 4; +10% Soul power |
| 3 | Raw Power 7, Composure 2 | the Breaker; limit 5, five modules |
| 4 | Will Power 5; Endurance 3 | Two Schools |
| 5 | rank II; Guts 1, 2 | Strength's beta |
| 6 | Strength 8; Raw Power 8 | Overswing (Raw Power's Push) |
| 7 | Lore Master 1, 2 | a tone, the four forms |
| 8 | Determination 6; Will Power 6 | Bite 0.30, a slot |
| 9 | Guts 3, 4 | a perk |
| 10 | Strength 9; Raw Power 9 | Raw Power's Bite |
| 11 | Composure 3, 4 | a perk; limit 6 |
| 12 | Determination 7; Will Power 7 | **Reach 4** |
| 13 | Guts 5, 6 | a perk |
| 14 | Lore Master 3; Endurance 4 | a perk |
| 15 | rank III; Guts 7, Composure 5 | two perks |
| 16 | Strength 10; Raw Power 10 | the chain of x7, Mastered |
| 17 | Guts 8, Composure 6 | no-Strain swells, limit 7 |
| 18 | Determination 8; Will Power 8 | **the Push**, fork b |
| 19 | Guts 9, 10 | Guts Mastered |
| 20 | Lore Master 4; Endurance 5 | three modules, a design |

Every level buys something felt. Each blow calms the heart (the `fight` calming row), so the fighter Begins, Overdraws and Releases a stage-3 heart every turn between Finishers: two doors cashing out often, neither at the top.

---

## 3. Virtue: the door of Prayer (Faith; Conscience; Authority; the Chaplain, id `guardian`)

### 3(a) Today

**The run's counter: Devotion** (0 to 10, standing with your patron; `patrons.json:5 devotion`): **start 3** (`:8`); the XP curve `[0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450]` (`:17`); gates Whisper 0, Hymn I 3, II 5, III 7, the Miracle 10. Gains: a liked tag +1 (capped 2 a fight, 2 a scene, 6 a session, `:48 tag_caps`; `faith.ts:95`), a vow +3, a rite +4, a Narrator deed +2 to +5 (10 a session). Losses: a taboo -3 (-6 Witnessed), a broken vow -5, a missed prayer above your standing -3.

**The prayers** (`patrons.json:82 prayer`): a Whisper 1 AP, once a turn (Faith 1); a Hymn 3 AP, then a wait of `9 - 0.75 x Faith - 0.25 x Virtue`, rounded up, at least 3 (`character.ts:1266-1270`); the Miracle 3 AP, once a session, Faith 7 and Devotion 10, costs 5 Devotion levels. Seven Whispers (`patrons.json:205`: Luck +2, Health 8.5, Protection 10, Courage, Guidance, Safe Passage, Rebuke 20 Soul damage); three Hymns and a Miracle a patron; Witnessed (Faith 5, an answered Hymn) and the intervention (20 + 4 x Devotion, x Blessing power). Praying above your standing (`:100 overreach`): any Faithful, TN 12 + 2 a tier. An Atheist prays every tier by dice (TN 12 to 18).

**Blessing power** is profile `blessing` (`rules.json:1874`): 0.956 x (1 + 0.06 x (Virtue - 1) + 0.06 x Faith) x the `scale` column; heals and shields `blessing_mend` (`:1921`) on `mend`.

**There is no in-fight counter**: nothing is built and spent inside a fight; the Hymn's wait is a clock.

**Faith's ladder** (`skills.json:5180`): 1 Whispers; 2 Name the Sinner (a Whisper: Judged 2 rounds; prayers +40% on a Judged or Marked foe); 3 perk step, Hymns open; 4 fork Steadfast or Round of Blessings; 5 Witnessed; 6 perk step; 7 perk step; 8 fork Swift Psalm or Benediction; 9 perk step; 10 Mastered Judgement Day. Perks: Unbroken Litany (the first Hymn a fight -1 AP; II two), Sinner's Due (+8% / +12% on a foe at half HP).
- Card per point (`skills.json:5205`): **+10% Blessing power: false** (the profile reads 6%); Hymns 0.75 round sooner (true, but with Virtue the floor of 3 is reached at Faith 7 and Virtue 7: points 8 to 10 move nothing); harder to save against (true).

**Conscience** (beta, `skills.json:5435`): prayer shields +1% x Faith a point (the feed, true); +10% shields received a point (**typed**, `character.ts:1249`); perk steps 3, 5, 7, 9; Mastered Foreseen. Points 2, 4, 6, 8 only move those two numbers.

**Authority** (gamma, `skills.json:5620`): the Call Order (steps 1, 4, 8; price 1, 5, 9, 10); +1 tile of its reach and Karma +1 a point (Karma is the Narrator's); perk steps 3, 5, 7, 9; Mastered On My Mark.

**Virtue's card** (`attributes.json:256`): "Hymns return sooner": 0.25 round a point, rounded up, so about one point in four is felt; it also gives +6% Blessing power that **the card does not say** (profile attr 0.06).

**The Chaplain** (`classes.json:2836`): its pool is Devotion and no move costs MP; `gain` The Patron at Your Side (while Witnessed, the first intervention keeps Witnessed). Rank I Ward (`:2865`: a Whisper, 1 AP, a fight-long shield of `10 x` on an ally, four at once), Smite (`:2922`: once a turn, a weapon hit adds 20 x Blessing power Soul damage through armour, and Judged); rank II Under the Eye (`lumeri_templar`: Witnessed, allies within 3 +2 to hit), Blessed Arms (load a Hymn into the weapon); rank III Sanctuary (`:5287`: a Hymn only it says, half damage in a 3x3, a pool of `40 x`), Verdict (`classes.json:7716`: 4 AP and 1 Devotion level, once a fight, a plain attack x (1 + Blessing power)).

### 3(b) Faith's ladder, points 1 to 10

**Two layers, because the counter is earned across a run.** Devotion (the run's) keeps its shape: it opens the tiers (Hymn I at standing 3, II 5, III 7, the Miracle 10; Faith gates kept: Hymns 3, Witnessed 5, the Miracle 7). That is the door's long Reach, earned by deeds, not bought. **Inside a fight the door gets the counter it lacks: Grace** (a new resource, "Needs" row 1). **Faith's Reach is the Grace you may hold; Bite is what one step of Grace adds to the prayer that spends it.**

**Grace** (PROVISIONAL): each prayer you say (a Whisper, Ward) lays 1, at most one a turn from prayers; the first act each turn your patron likes (its liked tags, detected as today) lays 1; **a taboo act clears all of it**; a turn in which you neither prayed nor did a liked act loses 1 (the wear). A Hymn, Sanctuary and Verdict **spend all of it**; a Whisper may spend it instead of laying (your choice when you say it). The Miracle neither lays nor spends. Grace is gone when the fight ends.

| Faith | What exists (kept) | Reach (Grace) | Bite (a step, on the prayer that spends it) | New |
| --- | --- | --- | --- | --- |
| 1 | Whispers | **2** | **+15%** | Grace; Blessing power +5% a point (was a false +10%) |
| 2 | Name the Sinner | | | |
| 3 | perk step; Hymns open | | | |
| 4 | fork: Steadfast or Round of Blessings | **3** | | |
| 5 | Witnessed | | | |
| 6 | perk step | | **+20%** | |
| 7 | perk step | **4** | | |
| 8 | fork: Swift Psalm or Benediction | | | **the Push: pray above your standing**, moved here (3(d)) |
| 9 | perk step | | **+25%** | |
| 10 | Mastered: Judgement Day | **5** | | |

**The Hymn's wait, PROVISIONAL: `8 - 0.5 x Faith`, rounded up, at least 3** (Faith 1 8, 4 6, 7 5, 10 3; Virtue leaves it). Reason: every second Faith point takes a round off, up to the tenth (today points past 7 do nothing).

### 3(c) The cash-out: the Hymn, and what it costs

A prayer that spends Grace is worth **x(1 + Bite x S(n))**: Faith 1 x1.33 (2 Grace on a Whisper); Faith 4 x1.55 (3); Faith 7 x2.07 (4); Faith 9 x2.34 (4); Faith 10 **x2.86** (5).

**Costs, one by one.** AP kept (Whisper 1, Hymn 3, the Miracle 3, Ward 1, Sanctuary 3). No MP (kept: the prayer door's fuel is Devotion and the wait). The Miracle's price, 5 Devotion levels, kept: on 05-pacing's curve it is about 13 hours of faith. The Hymn's wait as above. Verdict 3 AP (was 4) and 1 Devotion level (3(i)).

**The compounding rule, in plain actions** (a Hymn is about 2.5 PA for its 3 AP, its wait being its price; a Whisper about 0.6 PA):

| Who | Grace held, Bite | One cash-out is worth | How often | Against plain play |
| --- | --- | --- | --- | --- |
| Faith 1 | 2, 15% | a Whisper x1.33: 0.8 PA | every second turn | a small edge; Hymns are shut below Faith 3 |
| Faith 4, a mixed character | 3, 15% | a Hymn x1.55: 3.9 PA, or a Whisper x1.55 between Hymns: 0.9 PA | a Whisper cash-out every two turns, a Hymn every 6 rounds | about a tenth over plain, often |
| Faith 7 | 4, 20% | a Hymn x2.07: 5.2 PA | every 5 rounds | about a third over plain across the wait |
| Faith 10, a specialist | 5, 25% | a Hymn x2.86: 7.2 PA | every 3 rounds | about 45% over three turns of plain play, if no taboo clears the Grace |

The consequence: one taboo clears the Grace you saved for the Hymn, and Devotion still moves as today.

### 3(d) The Push at Faith 8: pray above your standing

Exists for every Faithful today; it moves to Faith 8 as the door's Push (question 3). Once a fight, a Hymn **one tier past your Devotion standing**: TN 12 + 2 a tier (kept). **Price, whether it lands or not: 10 Devotion XP; 20 if it misses** (was a miss -3). PROVISIONAL. Reason: asking past what you have earned always costs standing, the run remembers; on 05-pacing's curve 10 XP is about an hour of faith early and less than half an hour late.

### 3(e) Marks on the door, and Devotion's pace

**Door Marks:** earned by **Grace spent** on worthy foes (a specialist about 6 a fight, 19 an hour). **Thresholds, PROVISIONAL: 40, 210, 325, 440.**

| Mark | About | Gives |
| --- | --- | --- |
| I | hour 2 | a fight starts with 1 Grace (primed) |
| II | hour 11 | a taboo costs half your Grace (rounded down), not all |
| middle | hour 17 | your Hymn's wait is 1 round shorter (never under its floor) |
| III | hour 23 | praying above your standing costs no Devotion once a fight |

**Devotion** (05-pacing's numbers, adopted): the curve `[0, 10, 25, 42, 68, 100, 140, 185, 225, 260, 300]`; `tag_caps.fight` 3; a run's cap 30 a stage in place of the session's 6 (a Survival run is one session, so 6 is all a whole run gives today); about 8.5 XP an hour: **standing 3 at about hour 5, 5 at 12, 7 at 22, 10 at 35**. **And the start: 0, not 3** (`patrons.json:8`; question 2). Reason: with a start of 3 a Faithful has Hymn I in its first minute and the calendar's first step never happens.

What Reach and Bite mean for a door whose counter is earned across a run: Devotion is the tier ladder, felt as a new prayer every few hours; Faith points buy the fight's engine on top of it (Grace held, Grace's worth, the wait). A Faith 10 at standing 5 has the Hymn I and II of a believer and the Grace of a saint; a Faith 4 at standing 10 the Miracle and a short litany.

### 3(f) Tags for mixed characters

- **This door keeps others'**: a Whisper is quiet: it carries "keeps Hidden" (a Shadow user may whisper without breaking cover), "keeps the chain" and "keeps plates". A Hymn is sung: it keeps none. A Whisper calms 1 Strain once a turn (2(f)).
- **Others keep this door's**: every act a patron likes lays Grace (the tags already detect protect, heal, supply, hold, trick, burn, storm, kill, judge, mercy: `patrons.json tags`), so the Guard user's Brace (hold), the medic's Mend (heal) and the Sigilist's FIRE (burn) feed a Faithful's Grace with no new rule; and they carry "keeps Grace" (the wear guard), so a turn spent on them does not lose a step.

### 3(g) Conscience (beta) and Authority (gamma), points 1 to 10

**Conscience: how prayer keeps you safe.** Kept: prayer shields +1% x Faith a point (the feed), +10% shields received a point (read from the row in place of `character.ts:1249`), perk steps 3, 5, 7, 9, Mastered at 10. New, PROVISIONAL, where a point moved only those two numbers:

| Points | New | Reason |
| --- | --- | --- |
| 2 | **Clear Conscience:** the first taboo each fight costs no Devotion XP | you saw where it led and stopped |
| 4 | **Grace does not wear:** a turn without prayer or a liked act no longer loses a step | the believer's calm holds |
| 6 | your prayer shield on a friend lays 1 Grace for you (once a turn) | protecting is praying |
| 8 | when one of your prayer shields breaks, its holder has +1 Defense until your next turn | the god's guard does not vanish at once |

**Authority: the door outside a fight, its Call and its voice.** Every point adds its full points to checks and Asks and +1 tile of Order reach (Karma as the Narrator's). Kept: Order's steps 1, 4, 8; the price at 1, 5, 9, 10; perks; Mastered On My Mark. New, PROVISIONAL: **at 2, a friend who acts on your Order lays 1 Grace for you if your patron likes what it did**; **at 6, your Order also ends Fear and Shaken on the friend**. Reason: points 2 and 6 moved only a tile; the commanding priest's voice is part of the door.

### 3(h) Virtue's card, made true

| Per point above 1 | Today | Proposed (PROVISIONAL) | Reason |
| --- | --- | --- | --- |
| Blessing power | +6%, unstated | **+10%**, said on the card (profiles `blessing`, `blessing_mend` attr 0.10; Faith 0.05) | the attribute is the engine's size |
| Hymns return sooner | 0.25 round, rounded up | **removed** (the wait is Faith's, 3(b)) | it was felt one point in four |
| (new) Devotion XP | | **+5% Devotion XP from every gain** | everyone is Faithful: a point of Virtue speeds a gunner's standing (Witnessed, interventions) too |
| (new) Shields received | | **+5% shields received** from any source | every squad has a shielder; never dead |

### 3(i) The Chaplain: what only it has

**Only the Chaplain:** Ward, Smite, Sanctuary, The Patron at Your Side and Verdict are its own; all stay.

| Rank | Move | Today, set-up met | Worth pressing? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| I | Ward | a fight-long shield for 1 AP, four at once | yes | **0.6 H**; a Whisper, so it lays Grace |
| I | Smite | +20 x Blessing power on a hit: today about 0.75 of a rifle shot added | yes | **0.5 P** on a hit, once a turn |
| gain | The Patron at Your Side | | (passive) | kept |
| II | Under the Eye | +2 to hit near you while Witnessed | (passive) | kept |
| II | Blessed Arms | a Hymn loaded into the weapon | yes | kept; the loaded Hymn keeps the Grace it spent |
| III | Sanctuary | half damage in a 3x3, a pool of `40 x` | yes | pool **2.0 H**; spends Grace like a Hymn (the pool x the Grace multiplier) |
| III | Verdict | 4 AP and 1 Devotion: a plain attack x (1 + Blessing power), about 2.7 hits for the AP of two plain actions | **no** (1.35 a plain action, and it costs standing) | **3 AP**, once a fight, 1 Devotion level: a plain attack x (1 + Blessing power) **x the Grace multiplier** (it spends Grace). At Faith 10 with 5 Grace, about 9 hits: the Chaplain's five-digit blow at level 20, paid in standing |

### 3(j) How a player spends: the Virtue specialist and a mixed crusader

**The Chaplain** (Virtue 7, Agility 3, Endurance 3; Faith 7, Dexterity 2, Conscience 1: Smite needs hits).

| Level (hour) | Buys | What the player gets |
| --- | --- | --- |
| 1 (0) | creation | Whispers, Name the Sinner, Hymns open (standing 0: none yet), fork a, Witnessed, three perk steps; Grace 4, Bite +20%; wait 5 |
| 2 (1) | Conscience 2; Endurance 4 | Clear Conscience; HP |
| 3 (2) | Chaplain rank I; Authority 1, 2 | Ward, Smite, the Patron at Your Side; Order |
| 4 (3) | Conscience 3; Agility 4 | a perk |
| 5 (4) | rank II; Conscience 4, Authority 3 | Under the Eye, Blessed Arms; Grace does not wear |
| 5 to 6 (5) | (Devotion 3) | **Hymn I** arrives with deeds, not a level |
| 6 (6) | Virtue 8; Faith 8 | fork b, **the Push** |
| 7 (8) | Conscience 5, Authority 4 | a perk; Order moves a friend |
| 8 (11) | Authority 5; Agility 5 | a perk |
| 8 to 9 (12) | (Devotion 5) | **Hymn II** |
| 9 (13) | Conscience 6, Authority 6 | shields lay Grace; Order ends Fear |
| 10 (16) | Virtue 9; Faith 9 | **Bite +25%**, a perk, wait 4 |
| 11 (18) | Conscience 7, Authority 7 | two perks |
| 12 (21) | Conscience 8; Endurance 5 | the broken shield's guard |
| 12 (22) | (Devotion 7) | **Hymn III** |
| 13 (23) | Authority 8, Conscience 9 | Order's top step; a perk |
| 14 (26) | Authority 9; Agility 6 | a perk; Order for 1 AP |
| 15 (28) | rank III; Dexterity 3, 4 | Sanctuary, Verdict; **flag: the door's skills wait on Virtue 10** |
| 16 (31) | Virtue 10; Faith 10 | **Grace 5**, Mastered Judgement Day, wait 3 |
| 17 (33) | Conscience 10, Authority 10 | Foreseen, On My Mark |
| 18 to 19 (35 to 38) | (Devotion 10) | **the Miracle** (Faith 7 met long before) |
| 18 to 20 | 4 Skill and 2 Attribute points | Dexterity, breadth |

**A mixed crusader** (Strength 7, Virtue 4; Raw Power 6, Faith 4; class at 3 the Breaker: no Smite, but Whispers between blows and a Hymn when standing allows).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | creation | Grace 3, Whispers, Name the Sinner, fork a; the chain |
| 2 | Conscience 1; Virtue 5 | prayer shields; +10% Blessing power |
| 3 | Raw Power 7, Faith 5 | the Breaker; Witnessed |
| 4 | Conscience 2; Endurance 3 | Clear Conscience |
| 5 | rank II; Guts 1, 2 | Strength's beta |
| 6 | Strength 8; Raw Power 8 | Overswing |
| 7 | Authority 1, 2 | Order; Orders lay Grace |
| 8 | Virtue 6; Faith 6 | Bite +20% |
| 9 | Guts 3, 4 | a perk |
| 10 | Strength 9; Raw Power 9 | Raw Power's Bite |
| 11 | Conscience 3, 4 | a perk; Grace does not wear |
| 12 | Virtue 7; Faith 7 | **Grace 4**; the Miracle's Faith gate met |
| 13 | Guts 5, 6 | a perk |
| 14 | Conscience 5; Endurance 4 | a perk |
| 15 | rank III; Guts 7, Authority 3 | a perk |
| 16 | Strength 10; Raw Power 10 | Mastered |
| 17 | Guts 8, Conscience 6 | shields lay Grace |
| 18 | Virtue 8; Faith 8 | **the Push**, fork b |
| 19 | Guts 9, 10 | Guts Mastered |
| 20 | Authority 4; Endurance 5 | Order moves a friend |

Every level buys something felt. Every Brace (hold) and every kill a war patron likes lays Grace, so the crusader's Whispers between blows cash out every second turn, and Hymns come when Devotion allows (standing 3 at about hour 5, the Miracle at about hour 35).

### 3(k) Prayers on the new scale (specialist's Blessing power, before the relic's grade)

| Prayer | Multiple | Level 1 | Level 10 | Level 20 |
| --- | --- | --- | --- | --- |
| Rebuke (Whisper) | 0.6 P | 11 | 84 | 840 |
| Health (Whisper) | 0.5 H | 11 | 88 | 770 |
| Protection (Whisper) | 0.6 H shield | 13 | 105 | 920 |
| Ward (Chaplain) | 0.6 H shield, for the fight | 13 | 105 | 920 |
| Smite (Chaplain) | 0.5 P | 9 | 70 | 700 |
| A damage Hymn (Judgement, Lightning Rod's first) | 2.5 P | 45 | 350 | 3,500 |
| Lightning Rod's chain; Thunderclap, each foe | 1.0 P | 18 | 140 | 1,400 |
| Last Crossing on a Boss | 1.8 P | 32 | 250 | 2,520 |
| A heal Hymn (Warm Hands) | 2.0 H | 44 | 350 | 3,080 |
| Saint's Shield | 2.4 H shield | 53 | 420 | 3,700 |
| Absolution's heal | 1.2 H | 26 | 210 | 1,850 |
| Coin for the Ferry | 0.6 H on standing up | 13 | 105 | 920 |
| Hearthlight, each turn in it | 0.4 H | 9 | 70 | 615 |
| Sanctuary's pool (Chaplain) | 2.0 H | 44 | 350 | 3,080 |
| An intervention (damage) | (0.6 + 0.12 x Devotion) P | 11 to 32 | 84 to 250 | 840 to 2,520 |
| Mother Ember's intervention | (0.3 + 0.06 x Devotion) H | 7 to 20 | 53 to 160 | 460 to 1,390 |

A Hymn that spends Grace multiplies these by 3(c)'s multiplier (x2.86 for a specialist). Damage reads `deal`, heals and shields `mend` (today Rebuke, Smite and the damage Hymns read `scale`, `rules.json:1874`; that column goes). The Miracles keep their shapes and ride the same columns.

---

## 4. Questions for the lead (at most five; my recommendation first)

1. **One rule for the Soul cards: attribute +10% a point, alpha skill +5%.** It changes the cards: Insight 6 to 10%, Determination 5 (false today) to 10%, Will Power 10 (false) to 5%, Faith 10 (false) to 5%, Virtue gains +10% Blessing power. **Recommend yes**: the Momentum pattern, and three false promises become true.
2. **Devotion starts at 0, not 3**, with 05-pacing's curve and caps. **Recommend yes**: otherwise Hymn I is there from the first minute and the calendar's first step (standing 3 at hour 5) never happens. Existing characters keep their XP.
3. **Praying above your standing becomes the Push at Faith 8** (today any Faithful may), priced 10 Devotion XP on a success and 20 on a miss. **Recommend yes**: the law puts every Push at 8, and a price on success is what "it always costs" means.
4. **Outburst Reach takes stages 3 and 4 from Will Power 1 to 6** (everyone reaches 4 today). **Recommend yes**: Reach has to be bought or a 10 is not a different machine; Overdraw, the free Pump and swells still make a low-point heart quick.
5. **MP becomes a choice:** pools shrink to about four full cash-outs (`(40 + 12 x (Det - 1) + 8 x (Ins - 1)) x mp`), Pumps cost 10% of the Begin each, Syphon's bands become 10 to 40, Tending costs halve and ride `mp`. **Recommend yes**: today a specialist holds nine cash-outs and Syphon refills a quarter of a pool for 1 AP, so MP is never felt. Old saves keep their share of the bar (as rules 1.24 did).

---

## 5. Built from

| Rule or number | The existing piece and its data key (file) | What must change |
| --- | --- | --- |
| Bonds held 1 / 2 / 3 / 4 at Empathy 1 / 4 / 7 / 10 | stat `ties_max:bond` (`kit.ts:204 tieCap`), `tending.json` `tend.threads`, `tend.bonds_5`, `tend.bonds_8` | the two rows' `requires` to 4 and 7; one new row at 10; `tend.mender_bonds` retires; or all four through the door ladder (shared) |
| Tending ties | op `tie` (kind bond) on `acted`, predicate `target_not_tied` | an effect on `tend.mend`, `tend.shield`, `medic.triage` |
| Snap All, Bite x1.0 / 1.2 / 1.4 | `tend.snap` amounts (`tending.json:667, :676`), the `targets: {tied: bond}` selector (as `tend.threads`' echo) | an "all" choice on the action; the amounts read Bite (door ladder) x the cash-out sum's per-unit share (shared, one more form) |
| Snap's damage on `deal` | `rules.json output.profiles` | a new profile row `tend_harm` (Insight, Empathy, level `deal`): data |
| Overbind | a condition with `stat_mod ties_max:bond +1` (condition rows carry stat_mods, e.g. `conditions.json` `seen_range`), `deal` with `delay: until target_turn_start` (as the echo) | a condition row and a 0-AP grant on Empathy 8 |
| Tending MP costs | each verb's `res.mp` (`tending.json:727, :811, :876`), `classes.json` Triage, Inspire, Rally | new bases; MP read x `mp` in `price` for the `mp` resource (`effects/cost.ts`) when the row says so |
| Healing given +10% / +5% | profiles `healing`, `mend`, `tend` (`rules.json:1970`) attr and skill | data |
| Camaraderie's and Conscience's received bonuses | `heal_received`, `shield_received` stats (`character.ts:1247, :1249`) | read the rows' `numbers` (the typed 0.1 goes) |
| Hold Together, Both Ways | op `redirect` with `limit.reaction` (Share a Hit's rows), `mend_mult` on `heal` with `if.actor_tied` | data rows on Camaraderie 6 and 8 |
| Taunt Bonds (Insinuation 6) | `call.taunt` step; op `tie` on the failed save | a step row |
| Stage Reach 2 / 3 / 4 / 5 | `MAX_STAGE` (`magic.ts:729`, from `soul_modules.json:13`) | read per character through the door ladder (shared); Heart Surge and the Push add one |
| Bite and the compounding Release | `stageMult` (`magic.ts:730`), `feelings.json plain_step`, the held design's `plus` | the multiplier becomes `0.8 + sum(step x 1.2^i)` in the one place it is built (`outburstTerms`, `magic.ts:1371`); the ratio from the cash-out sum's data |
| Soul power +10% / +5% | profiles `soul`, `soul_mend` (`rules.json:1866`) | attr 0.10 on Determination, skill 0.05 on Will Power: data |
| MP pool, Pump MP, Syphon | `maxMp` (`character.ts:860`), `pump_mp` (`soul_modules.json:56`), `syphonMult` (`character.ts:903`), `rules.json` mana bands `syphon_mp` | the typed numbers move to `attributes.json derived` and `rules.json`; a new level column `mp` (data, beside `deal`, `scale`, `mend`); a save migration like `migrateCharacterMp` |
| Strain's burn on HP | `strain.burn_per_point` (`soul_modules.json:65`) | a share of max HP in place of 8 HP |
| Overdraw past the top | Overdraw (`skills.json:4688`), the toggle predicate, Strain via op `resource` | a step on Will Power 8; "no fall next turn" as a condition on the `turn` calming row |
| Door Marks (all three) | the keyed practice track (shared) | three `marks` rows |
| Afterglow, Mark I of Outbursts | stat `begin_stage` (new, "Needs" row 2) answered by a condition laid on a Release at stage 2+ | a condition row; Begin reads the stat |
| Iron Heart, Heart Surge, Storm Front | `classes/i.ts:1147-1240` handlers; their rows | Storm Front's 10 / 2 / 2 into `numbers`; Heart Surge's top reads Reach; Shape's handler retires (the lint count falls by one) |
| Module practice, feeling marks | `soul_modules.json:1327 practice`; `feelings.json` | 05-pacing's numbers |
| Grace | a resource row (new, "Needs" row 1); op `resource` on `acted` (prayer) and in `faith.ts`'s tag recorder (the liked act, the taboo); the wear guard (shared) for "keeps Grace"; flags `mark` / `no_flag` for the turn's wear | the resource row; numbers `grace.per_prayer`, `per_liked`, `taboo` in `patrons.json prayer`; the Hymn's amount x `1 + Bite x S(n)` |
| Grace Reach 2 / 3 / 4 / 5, Bite 15 / 20 / 25% | the door ladder (shared) on the prayer door's row | data |
| The Hymn's wait | `patrons.json:82 cooldown_rule` (`character.ts:1266 HYMN_COOLDOWN`) | base 8, per_faith 0.5, per_virtue 0 |
| Devotion's start, curve and caps | `patrons.json:8, :17, :48`; `faith.ts:95 TAG_CAPS` | 05-pacing's numbers and start 0 |
| Blessing power +10% / +5%, Devotion XP +5%, shields received +5% | profiles `blessing`, `blessing_mend`; `faith.ts` Devotion move (`faith.ts:457`, the one choke point); stat `shield_received` | data, and the choke point reads Virtue's `derived` |
| The Push of prayer | `patrons.json:100 overreach` | `faith_min` 8 on it; the price on success and miss |
| Prayer amounts on `deal` and `mend` | `patrons.json` effect values; profiles `blessing` (level `scale`) | values to the multiples of 3(k); the `blessing` profile's level to `deal` |
| Ward, Smite, Sanctuary, Verdict | `classes.json:2865, :2922, :5287, :7716` | new bases; Verdict 3 AP and the Grace multiplier |
| Conscience 2 / 4 / 6 / 8, Authority 2 / 6 | the Devotion choke point (`faith.ts:457`), the wear guard, op `resource` on `shield`, `defense_bonus` via a condition, `cleanse` on the Order | data rows on the skills |
| Rank levels 3 / 5 / 15 | `classes.json:17 rank_levels` | II 5, III 15 |
| Determination's Heart saves | stat `save_heart` | a row on `attributes.json derived` read through the stat |

## 6. Needs a new primitive

Two of my own; the shared ones are 02-body's (the door ladder, the cash-out sum, the keyed practice track, the wear guard) and are not counted again, except one more form of the cash-out sum.

| Primitive | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **Resource `grace`** | one row in `data/actions.json resources` (`grace`, unit, `res.grace`), its max from the door ladder; laid and spent by op `resource` and by `faith.ts`'s tag recorder reading `patrons.json` numbers | prayer has no in-fight counter: `devotion_xp` is the run's (character-wide, and spending it is the Miracle's price), `ledger` is the Mender's, the rest belong to other doors |
| **Stat `begin_stage`** | one line in `STATS` (`effects/stats.ts`): the stage a Begin starts at; asked by Begin | the twin of `momentum_start` for the heart; `free_pumps` gives AP-free Pumps, held to one a turn by `FREE_PER_TURN`, so it cannot start a heart higher; `rider_stage` moves only the rider |
| (one more form of the shared **cash-out sum**) | the per-unit share `S(n) / n` for a cash-out that lands on several units (`cash_share:<resource>` beside `cash:<resource>`) | Snap All pays each Bond an even share of `Bite x S(n)`; a number block can add and multiply sources but cannot divide by the count |

## 7. What re-records

| Guard | What moves, and why |
| --- | --- |
| Damage tables (`test/golden-damage*.test.ts`, `test/golden/*.json`; the magic, perks, classes and builds tables) | every Outburst (the compounding Release, D, Soul power slopes, `deal`), every heal and shield (Tending bases, `mend` on `hp_ref`, Insight's slope), Snap on `tend_harm`, every prayer (multiples of P and H, Grace, `deal` in place of `scale`), Smite, Verdict, Sanctuary, the Ledger cap, interventions |
| Costs tables (`golden-costs*`, `costs-cooldowns`) | Tending's MP, Pump MP, Syphon, Triage, Inspire, Rally; the Hymn's wait (base 8, Faith only); Verdict 3 AP; Overdraw past the top; Overbind |
| Rules tables (`golden-rules`) | Bonds held by Empathy, Snap All, Tending ties; stage Reach; Grace laid, worn and cleared; Strain's burn and Mana Shock |
| Item-ops table (`golden-itemops`) | Iron Heart, Storm Front, Heart Surge, Shape (retired), Ward, Smite, Take the Weight, the Ledger |
| Conditions table | Overbind's and the Push's conditions, Afterglow's |
| Replay guard (`test/replay-hash.test.ts`) | every seeded game with a Soul caster or a Faithful |
| Old saves (`test/old-save.test.ts`) | an MP revision (as `MP_REV`, `character.ts:864`): each Emanator and Attuner keeps its share of the bar; Devotion XP kept; the Mender's fourth Bond clamped to the new Reach |
| Tests that read today's numbers | soul and outburst suites (the stage table, `MAX_STAGE`, damage base 37), faith suites (the wait, the curve, tag caps, start 3), tending suites (Bonds at 5 and 8, Snap one), class suites (rank levels 6 and 12), `heal-pct.test.ts` |
| Lint and literal baselines | shrink: `maxMp`, `syphonMult`, `soulCostSaving`, `soulRangeBonus`, `moduleSlots`, `healReceivedMult`, `shieldReceivedMult` stop typing numbers; Storm Front's three literals; Shape's handler gone |
| Screen data (`protodata.json`), ladder rows | Empathy's, Will Power's and Faith's per-point rows; the three cards; Camaraderie, Insinuation, Conscience and Authority's new rows; the Channeler's rank I |
| Survival measures (`npm run balance`) | everything; read, not held to a line |
