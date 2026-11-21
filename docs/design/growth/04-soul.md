# The doors of Soul: Bonds, Outbursts, Prayer (0.34 rebalance, design draft 04, third pass)

Drafter's file for the lead. **Nothing here is built.** Since ruling F (`00-rulings.md`) **the numbers live in one place: `tools/balance/bible/soul.json`**; this file explains them and carries no number that file does not hold. Shared numbers (the factor, the columns, the cards, HP, MP and the cost rules, the grades, Margins, the cash-out sum, the stack) are `scale.json`'s; every rate, the clock, the gates, the hours, Devotion's track and the migration are `pacing.json`'s (rulings D22, F36, F39). `soul.json` names them by reference (`@scale...`, `@pacing...`), never by copy. Today's rows are read from `data/` by reference (`{"data": "file.json:path"}`); facts about today carry `file:line`, read in `E:/phc-wt/rel030` (`release/0.34-final`) on 21 Nov 2026. Every number is **PROVISIONAL**, chosen for what a player feels; nothing is fitted to a percentage or a line.

**To see the numbers:** `python tools/balance/check.py --tables doors` prints each Soul door's ladder and its cash-outs at levels 1, 10 and 20; `--tables mp` the pools; `--tables profiles` the Stat terms; `--tables spend` and `--tables calendar` the walks and the hours (pacing's plans). `python tools/balance/check.py` runs the checks; every check on this file passes (section 8).

## 0. The shape every Soul door shares

- **Reach** is the counter's top you may hold, bought on the alpha's ladder (`soul.json ... ladders.<alpha>.points.<n>.reach`); the step at 7 needs the beta at 4, the step at 10 the beta at 7 and the gamma at 4 (ruling 13). **Bite** is what one unit spent is worth (`... .bite`). Everyone's top today moves onto the ladder (ruling C16).
- **The cash-out** uses `cash(n)` (`@scale.cash_out`): each unit spent in one go is worth `grow` times the one before. Each door's formula carries its own constant: Snap All none, the Release the stage table's floor, Grace's prayer `1 +`.
- **One pair to a hit** (ruling 31): Bonds read Insight and Empathy (`tend` profile), Outbursts Determination and Will Power (`soul`), prayer Virtue and Faith (`blessing`). The grade is the focus's: the Attuner for Bonds and Tending, the Emanator for Outbursts, Devotion for prayer (`@scale.grades.prayer`, read from the highest standing reached: ruling 33).
- **The one sum** (ruling A8, F30): a cash-out counts only its own door's sum terms plus one mark on the foe (`@scale.stack.scope.foe_mark`). This file's terms: Outbursts' two forks and the Finish way (`soul.json ... determination.door.forks`, `.ways.finish`); prayer's Name the Sinner (Faith 2, today's value read from data) and Judgement's helpless-foe term (`... virtue.door.sums`). Bonds carry none of their own: a Snap ends the passives of the Bonds it breaks (`... insight.door.threads.on_snap`).
- **The Push at 8** (ruling 17), **Marks** earned by using the door (unit here, rate `@pacing.door_marks.<door>`), **tags** in `keeps_tags`.
- **Alone, "an ally" includes yourself** (ruling 32): every move marked `needs_ally` in `soul.json` says what it does solo (check (f) passes).

## 1. Insight: Bonds and Tending (Empathy; Camaraderie; Insinuation, id `implication`; the Mender, id `bard`)

### 1(a) Today

The counter is Bonds held (ties of kind `bond`): one at Empathy 1 (`tending.json:31 tend.threads`), a second at 5 (`:317 tend.bonds_5`), a third at 8 (`:339 tend.bonds_8`), the Mender one more (`:1057 tend.mender_bonds`). Bond (`:361`) is 1 AP; Snap (`:529`) needs Empathy 2 and breaks **one** Bond: a foe takes Soul damage on profile `tend` and is Dazed, a friend heals. Holding pays the Threads (the share and echo, a Bonded foe easier to hit, more damage a Bond held, Tending through a Bond stronger). Mend (`:707`), Mend Yourself and Shield (`:856`, Empathy 5, a Bonded ally only) cost MP. Empathy's ladder (`skills.json:3991`) never moves Reach past 3 and Bite never moves. Camaraderie's healing received is typed in code (`character.ts:1247 healReceivedMult`); Insight's max MP and Soul cost saving are typed (`character.ts:860`, `:901`).

### 1(b) Empathy's ladder

**Reach is Bonds held; Bite is what one Bond is worth when it is Snapped** (the unit is a lone Snap on a foe: today's Snap base read from data, x the factor, on the `tend` profile and the `deal` column; on a friend the same on `mend`). The ten points are `soul.json attributes.insight.ladders.empathy.points`. Reach 1 / 2 / 3 / 4 at points 1 / 4 / 7 / 10 (the third needs Camaraderie 4, the fourth Camaraderie 7 and Insinuation 4); Bite 1.0 / 1.4 / 1.8 at points 1 / 6 / 9.

- **Snap at 1** (C18): the one-Bond medic can pull the thread it tied.
- **Tending ties at 2** (C19): the medic who keeps you up is tied to you without a turn spent on it. Alone, Mend Yourself ties your own thread (one Bond on yourself), which Snap All pays back as a heal.
- **Bite 1.8 at 9** (critic-consistency-2 4.5; ruling 29): Snap All of four reaches five digits in total at Relic at level 20 (the checker's line `DIGITS bonds: full cash-out`). Each Bite step makes a full Snap All visibly bigger on the number.
- **The fourth Bond** belongs to the Insight specialist: a medic who also shoots spends its points on its first door's top and cannot hold it (ruling 32's second half: the specialist is ahead of a gun-medic in its own door).
- Point 9's MP cut becomes a share (`numbers.mp_cut_share`), in place of today's flat cut.

### 1(c) The cash-out: Snap and Snap All

Snap (1 AP, once a turn) breaks one Bond at Bite; **Snap All** breaks every Bond you hold and pays `Bite x cash(n)` lone Snaps in total, an even share to each Bond (`cash_share:bond`): a foe takes its share as Soul damage (no armour) and a Daze it saves, a friend heals its share. The Ledger empties into it first. A Snap lands: no roll, no Margins. The consequence that makes the web a thing to protect: a foe that saves wastes the AP, a Bonded friend going Down costs MP, every Bond keeps you Traced, and a Snap ends the Threads' passives of the Bonds it breaks.

**Costs** (`soul.json ... insight.door.verbs`; MP on `@scale.costs.rules.mp`, x `mp(L)` at the payer's level): Bond, Let Go and Snap cost no MP; Mend and Mend Yourself 12; Shield 15 (on a Bonded friend or yourself); a Bonded ally going Down 8. Reason: about eight to twelve Mends a pool at every level, so a healer counts them (ruling A6).

### 1(d) The Push at 8: Overbind

Once a turn, 0 AP: one Bond more than your Reach until your next Snap (`res_max:bond` +1 for the use, S5). Price: when that Bond breaks you lose a share of your max HP at your next turn's start, nothing soaks it (`push.numbers.hp_share`; HP you pay yourself is a share, `@scale.costs.rules.share`). A torn thread costs more than a point of Strain because it is a whole Bond.

### 1(e) Marks

Unit: a Bond broken by a Snap while the fight has a worthy foe. Rate and thresholds: `@pacing.door_marks.bonds` (05 owns them; this file names the unit only: critic-consistency-2 1.5). Gifts (`marks.gifts`): I, the first Bond each fight is free and has no range limit, and stacks with the Mender's free Bond; II, foes save against your Bond at a penalty; middle, Tending through a Bond is stronger; III, Overbind costs no HP once a fight.

### 1(f) Tags

Bond, Let Go and Snap are quiet acts at a distance: they keep the chain and plates. Mend, Shield and Triage count as tending for the heart's calming (`soul_modules.json:77 strain.calming`) and as the patron tags heal and protect, so they lay Grace for a Faithful (`keeps_tags`). Nothing in another door breaks a Bond, so no "keeps Bonds" tag is needed.

### 1(g) Camaraderie (beta) and Insinuation (gamma)

**Camaraderie** keeps you up through the door. Its feed (`ladders.camaraderie.feed`): a share of what you heal down a Bond comes back to you, `(feed_flat + feed x Empathy) x Camaraderie`, to the row's cap; `feed_flat` 0.02 so a first point is felt (ruling 20; the one key name, critic-consistency-2 1.12). Healing received a point reads the row's `numbers.heal` (the typed code goes). New lines: Hold Together at 6 (the first Share a Hit each round uses no reaction), Both Ways at 8 (heals a Bonded friend gives you are bigger), and at 10, beside Many Hands, **Snap All keeps one Bond standing** (critic-player-2 6: the full family cashes out again sooner, which is not damage). Alone (critic-player-2 2): Share a Hit turns outward, a share of a hit on you passes down a Bond to a Bonded foe; Hold Together applies to that; Both Ways makes every heal you take bigger while you hold a Bond.

**Insinuation** is the door outside a fight, its Call and its voice: every point adds its full points to checks and Asks and a tile of Taunt reach. New: at 2, a foe you Taunted this round saves against your Bond at a penalty (critic-player-2 12: point 2 was Outburst modules a Mender cannot use); at 6, a foe that fails your Taunt's save is Bonded to you at once, for no AP, if you have room. Taunt aims at foes, so every point works alone.

### 1(h) Insight's card

`soul.json attributes.insight.card`: +10% a point on every heal and shield you give (`healing`, `mend`, `tend`: stims and kits included, so no point is dead); the pool's Insight term (`@scale.mp_pool.ins`); Soul MP costs a twentieth less a point, read from `attributes.json` (the typed `soulCostSaving` goes). Empathy's card: +5% a point (`@scale.cards.skill_slope`).

### 1(i) The Mender

Ranks at levels 3 / 5 / 15 (`@pacing.gates.rank_levels`). **Only the Mender** has the Ledger (a second counter fed by its own heals and cashed by its blows), Triage, and the free Bond each turn. **One More Bond retires** (C16): the fourth Bond is everyone's at Empathy 10 with its family. `soul.json attributes.insight.class`:

- **Rank I:** Triage (2 AP, 10 MP, base 3.4 in place of today's row x the factor: about one and a half Mends, because a class heal must be worth its slot; alone, on yourself); the Ledger (today's cap x the factor, factor kept; an add to the blow's base, not a sum term); the free Bond; Field Surgery (30 MP, out of a fight).
- **Rank II:** Inspire (1 AP, 12 MP; Love's base 1.69, about three quarters of a Mend, so the move is worth pressing; alone, on a Bonded foe's foe face or Love on yourself); Take the Weight (its price is already a share; alone, once a fight a blow that would Down you while you hold a Bond breaks that Bond instead and leaves you on 1 HP).
- **Rank III:** Brimming (with the half-bar heal cap gone, `scale.caps.heal_cap`, an overheal is common, so it is felt); Rally (2 AP, 35 MP, today's base x the factor; alone, it heals you and fills the Ledger by the same amount).

`scale.json factor.restated_elsewhere` points the Triage and Love rows here (critic-consistency-2 1.14). The class dial retires under the lead's one rule for dials (critic-consistency-2 1.13).

### 1(j) How a player spends

The walks are `pacing.json spend_plans` (a Mender with a gun is one of the four), printed by `check.py --tables spend`; the hours are pacing's clock (ruling F36). What this file asks of them: the Insight specialist reaches the fourth Bond and Bite 1.8 only with Camaraderie 7 and Insinuation 4 bought; a mixed medic holds three Bonds and the Push and never the fourth (ruling 13's edge). Hands: the Attuner in one hand and a revolver in the other (Survival's recommended row for a caster, `survival.json:52`), no swap.

## 2. Determination: Outbursts (Will Power; Composure; Lore Master; the Channeler, id `channeler`)

### 2(a) Today

The stage runs 0 to 4 for everyone (`soul_modules.json cycle.max_stage`; `magic.ts:729 MAX_STAGE`); the Release reads `cycle.stage_mult` (`magic.ts:730`). Strain has a limit raised by Composure, a burn per point over (`strain.burn_per_point`, `soul_modules.json:65`), a Mana Short and Mana Shock. Profile `soul` reads no attribute and no skill today (`rules.json output.profiles.soul` attr 0, skill 0): Determination and Will Power add nothing. MP is typed in code (`character.ts:860-861`) and the Syphon multiplier too (`:903`); a specialist's pool holds so many full cash-outs that MP is never felt. The Channeler's Shape is a bespoke handler (`classes/i.ts:1147`); Storm Front's literals are typed (`:1173-1199`).

### 2(b) Will Power's ladder

**Reach is the highest stage you may hold** (`res_max:stage`, S5, in place of `MAX_STAGE`); **Bite is the plain Pump's step.** Points: `soul.json attributes.determination.ladders.will_power.points`. Reach 2 / 3 / 4 / 5 at points 1 / 4 / 7 / 10 (stage 4 needs Composure 4; stage 5 Composure 7 and Lore Master 4); Bite 0.25 / 0.30 / 0.35 at points 1 / 6 / 9. Will Power 1 to 3 says it plainly: the door, a taste. Taken away by C16: Will Power 1 to 6 no longer reach stage 4 (the migration is pacing's).

### 2(c) The cash-out: the Release

The Release multiplier is the stage table's floor (today's `cycle.stage_mult[0]`, read) plus `Bite x cash(n)` over the Pumps made: a plain Pump steps Bite, each worth `grow` times the one before (`release`). **With feelings** (`release_felt`): a feeling Pump steps its own number in place of the plain step (Bite is the plain Pump's and is never added to a feeling: the second draft added it, and the top went past 99,999); the checker pours the four strongest feelings in data on the last Pumps of the heart (`door.felt_top`, within `feelings.json max_feelings_per_hold`), so the top of the scale counts everything legal (ruling 29). A Bolt and a Lance roll (`classes/soul.ts:36-39`) and take Margins on the plain design; a Wave, Burst or Aura lands.

**Costs** (`door.verbs`): AP kept (Begin 2, Pump 1, Release 1, Steady 1, Feed 1). A Pump costs a share of the Begin (`@scale.costs.pump_share`), so a full heart's bill grows with the design, never the level (`@scale.costs.rules.design`). Design costs are data (`soul_modules.json` schools, modules, second school, tones); the builder restates each by the share of a full pool it held today (`door.design_costs`). **Syphon** (`door.syphon`): 1 AP, the air's band 10 / 20 / 30 / 40 x `(1 + per_det x (Determination - 1))` x `mp(L)`; Will Power leaves it. The pool is `@scale.mp_pool`; the checker prints it (`--tables mp`).

**Strain** (`door.strain`): the limit and its steps read from data; the burn is a share of max HP (`@scale.costs.shares.strain_burn`), Mana Shock `@scale.costs.shares.mana_shock`. The text at `rules.json:1486` ("8 true damage per point over the limit") reads its row.

### 2(d) The Push at 8: Overdraw past the top

Once a turn, an Overdraw or a Pump may take the heart one stage past your Reach (`res_max:stage` +1 for the use). Price: 2 Strain at once, and your Strain does not fall at your next turn's start (`push.numbers`). A heart pushed past its top stays hot. Overdraw at Will Power 2 stays as it is (two stages in one Pump, within Reach).

### 2(e) Marks and practice

Unit: a stage Released on a worthy foe; rate `@pacing.door_marks.outbursts`. Gifts: I, your first Begin each fight starts at stage 1 (`begin_stage`, S11; it adds with Afterglow in the one stat); II, Strain falls faster at your turn's start; middle, once a fight a Mana Short Dazes instead of Stunning; III, Overdraw past the top costs no Strain once a fight. Modules' and feelings' practice are `@pacing.tracks.modules` and `@pacing.tracks.feelings` (critic-consistency-2 1.15: this file quotes no count). A feeling at its Mark III may be poured a second time in one Outburst, within the four. Modules gated by Empathy, Camaraderie and Insinuation (`soul_modules.json practice.gate_skills`) need those points; the level-up screen names the module a point opens.

### 2(f) Tags

Begin, Pump and Steady are still acts: they keep plates and the chain. A held Outburst never keeps Hidden (the heart glows). The calming rows exist (`soul_modules.json:77`): a weapon attack, a heal, stim, shield or cleanse given, a Call with Recitation. New: a Whisper calms a point of Strain once a turn, and holding Guard counts as a still turn: the base layer of the Prayer-Outburst and Guard-Outburst Crossings.

### 2(g) Composure (beta) and Lore Master (gamma)

**Composure** keeps every row: +1 Heart save a point and the Strain limit's steps count from the first point, so it needs no product feed (ruling 20 is met by the lines; a feed on top would be a second copy of the limit). New: 4 opens stage 4, 7 opens stage 5; at 10, beside Still Water, the burn is a smaller share of max HP (`points.10.numbers.strain_burn_share`): Mastered Composure is felt in the door it guards.

**Lore Master** keeps every row (the tone at 1; forms and modules; ready designs; Name It's steps; the Call's price; perk steps; Mastered True Name); every point adds its full points to checks and Asks and a tile of Name It reach. New: 4 opens stage 5 with Composure 7.

### 2(h) Determination's card

`soul.json attributes.determination.card`: +10% a point on every Outburst's damage, heal and shield (`soul`, `soul_mend`: today false, the profile reads 0); the pool's Determination term (`@scale.mp_pool.det`); Syphon +5% a point (`door.syphon.per_det`). Will Power's card: +5% a point. The first draft's Heart-save line stays withdrawn.

### 2(i) The Channeler

**Only the Channeler:** Afterglow, Heart Surge and Storm Front. `soul.json attributes.determination.class`:

- **Rank I:** Afterglow (new, in place of Shape: after a Release at stage 2 or higher your next Begin this fight starts a stage up, two from rank III, through `begin_stage`); Iron Heart (once a fight, on Mana Shock, your Strain falls to your limit and the shock ends). Shape retires with its handler (`classes/i.ts:1147`): a small bonus on one Pump is a number, not a thing.
- **Rank II:** Storm Front (5 MP x `mp`, restated by Tending's ratio, critic-consistency-2 3.2; a Bolt or a Lance arcs to more foes near the first; each arc takes the design at the stage table's floor, no Margins: the arcs are a thing, the Release is the hit; its literals move into the row's `numbers`); Occult Library (kept).
- **Rank III:** Heart Surge (a Release counts one stage more than it holds, **never past the top you may hold**: your Reach, or one past it with the Push; double Strain kept). This changes the second draft, which let it pass the Reach: ruling 29 counts class moves in the top, and a stage past Reach and the Push would put the Release over 99,999. The Channeler's peak is tempo (a Pump saved, a Begin started higher), not height. Eye of the Storm kept.

The class dial retires under the lead's one rule for dials (critic-consistency-2 1.13). Nothing in the kit needs an ally.

### 2(j) How a player spends

The walks are pacing's (`--tables spend`). Hands for a mixed fighter-channeler (ruling E): the Emanator gauntlet as the weapon (no swap), or a two-handed weapon and 1 AP a hand on every Outburst turn.

## 3. Virtue: Prayer (Faith; Conscience; Authority; the Chaplain, id `guardian`)

### 3(a) Today

Devotion is standing with your patron (`patrons.json devotion`): it starts at 3 (`:8`), climbs a curve (`:17`) by liked tags under caps (`:48 tag_caps`; `faith.ts:95`), vows, rites and deeds, and opens the tiers (`devotion.gates`). A Whisper is 1 AP once a turn; a Hymn 3 AP, then a wait (`prayer.hymn.cooldown_rule`, read at `character.ts:1266-1270`); the Miracle 3 AP once a session for Devotion levels (`prayer.miracle`). Praying above your standing (`prayer.overreach`, `:100`) is open to any Faithful. Blessing power is profile `blessing` on the old scale array; **there is no in-fight counter**. Conscience's shields received are typed (`character.ts:1249`). The Chaplain's Verdict (`classes.json:7716`) is 4 AP and a Devotion level for a plain attack x (1 + Blessing power).

### 3(b) Two layers: Devotion across a run, Grace inside a fight

**Devotion** keeps its shape and opens the tiers (`patrons.json devotion.gates`, kept). It **starts at 0** (ruling 19), follows `@pacing.tracks.devotion` (05 owns its curve, caps and pace: critic-consistency-2 1.4), and **it is the prayer's grade**, read from the highest standing reached (`@scale.grades.prayer`, ruling 33). A live character keeps its Devotion XP, above the new top too (`@pacing.migration`; critic-consistency-2 1.10, 7.2).

**Grace** is the door's counter in a fight (ruling C19; resource `grace`, S10; `soul.json ... virtue.door.grace`): each prayer you say lays one, one a turn from prayers; the first act each turn your patron likes lays one; a taboo act clears all of it; a turn with neither loses one (`wear:grace`, S6). A Hymn, Sanctuary and Verdict spend all of it; a Whisper may spend it instead of laying. The Miracle neither lays nor spends. Grace ends with the fight.

**Faith's ladder** (`ladders.faith.points`): Reach in Grace 2 / 3 / 4 / 5 at points 1 / 4 / 7 / 10 (Grace 4 needs Conscience 4; Grace 5 Conscience 7 and Authority 4); Bite 0.15 / 0.20 / 0.25 at points 1 / 6 / 9. Point 3 reads "Hymns open with standing 3" (critic-player-2 15: Devotion starts at 0).

**The Hymn's wait** (`door.hymn_wait`): `10 - 0.5 x Faith - 0.25 x (Virtue - 1)`, rounded up, never under the floor read from data. Every second Faith point takes a round off, up to the tenth (today points past 7 move nothing), the floor is first met at the top, and Virtue keeps its card's line. Longer than today in the middle: the wait is the Hymn's price now that Grace pays for waiting.

### 3(c) The cash-out: a prayer that spends Grace

A prayer that spends Grace is worth `1 + Bite x cash(n)` of itself (`cashouts.whisper` on Rebuke from point 1; `cashouts.hymn` from Faith 3 on the door's plain, Judgement, the strongest damage Hymn in data). Prayers land: no roll, no Margins. AP kept; no MP (prayer's fuel is Devotion and the wait). The consequence: one taboo clears the Grace you saved for the Hymn.

**The Miracle's price** stays in data (`prayer.miracle.devotion_cost_levels`); under ruling 33 it is paid in Hymn tiers and the next Miracle, never in every later prayer's size (critic-player-2 3 is closed by the ruling, not by a floor).

### 3(d) The Push at 8: pray above your standing

Moved from every Faithful to Faith 8 (C17), once a turn: a Hymn one tier past your Devotion standing (the tier ladder's Reach +1 for the use, S5), at the TN in data (kept). Price, landed or not: 10 Devotion XP; 20 on a miss (`push.numbers`). It raises the tier, not the Grace held, so its `reach_plus` on Grace is 0. Asking past what you have earned always costs standing.

### 3(e) Marks

Unit: a step of Grace spent on a worthy foe; rate `@pacing.door_marks.prayer`. Gifts: I, a fight starts with a Grace (op `resource` on `combat_start`); II, a taboo costs half your Grace, not all; middle, the Hymn's wait is a round shorter, never under its floor; III, praying above your standing costs no Devotion XP once a fight.

### 3(f) Tags

A Whisper is quiet: it keeps Hidden, the chain and plates, and calms a point of Strain once a turn (2(f)). A Hymn is sung: it keeps none. Every act a patron likes lays Grace (the tags already detect protect, heal, supply, hold, trick, burn, storm, kill, judge, mercy: `patrons.json tags`), so another door's Brace, Mend or FIRE feeds a Faithful's Grace with no new rule, and keeps Grace that turn.

### 3(g) Conscience (beta) and Authority (gamma)

**Conscience** keeps you safe through prayer. Its feed: your prayer shields grow by `(feed_flat + feed x Faith) x Conscience`, `feed_flat` 0.04 so a first point is felt (ruling 20). Shields received a point read the row (the typed code goes). New: Clear Conscience at 2 (the first taboo each fight costs no Devotion XP); at 4, Grace wears slower (an idle turn loses a step only after an idle turn) and Grace 4 opens; at 6, your prayer shield on a friend, or alone on yourself, lays a Grace once a turn; 7 opens Grace 5; at 8, a broken prayer shield leaves its holder +1 Defense until your next turn; at 10, beside Foreseen, **a Hymn keeps one Grace** (critic-player-2 6).

**Authority** is the door outside a fight, its Call and its voice: every point adds its full points to checks and Asks, a tile of Order reach and Karma. The Order takes `aim: self-or-ally` (the value Name It uses, `calls.json:174`), on yourself at the step below your own (critic-player-2 1: alone, Authority 1, 2 and 4 must not be dead, and 4 is the toll for Grace 5). New: at 2, a friend who acts on your Order lays a Grace for you if your patron likes what it did (alone, your own act on your own Order); 4 opens Grace 5; at 6, your Order also ends Fear and Shaken on its target.

### 3(h) Virtue's card

`soul.json attributes.virtue.card`: +10% a point on every prayer's damage, heal and shield (`blessing`, `blessing_mend`; today an unstated share); Hymns return sooner (`door.hymn_wait.per_virtue`). Faith's card: +5% a point.

### 3(i) The Chaplain

**Only the Chaplain:** Ward, Smite, Sanctuary and Verdict, and its gain (The Patron at Your Side, Amen, the Canticle, Holy Dread, Last Rites, Hallow: kept). `soul.json attributes.virtue.class`:

- **Rank I:** Ward (today's base x the factor; a Whisper, so it lays Grace; alone, on yourself); Smite (today's base x the factor, on `deal`, once a turn).
- **Rank II:** Under the Eye (allies near you aim truer while Witnessed; alone, you do); Blessed Arms (a Hymn loaded into the weapon keeps the Grace it spent).
- **Rank III:** Sanctuary (today's pool x the factor; it spends Grace like a Hymn); **Verdict**: 3 AP (was 4), once a fight, one Devotion level: a weapon's plain hit (its own pair and grade, ruling 31) x Grace's `1 + Bite x cash(n)`, landed. Today's `(1 + Blessing power)` factor goes: it was a hidden multiplier (A8). Verdict is a class cash-out the checker does not read (section 8).

The class dial retires under the lead's one rule for dials.

### 3(j) How a player spends

The walks are pacing's (`--tables spend`; a Breaker who prays is one of the four). Hands: prayer needs no focus (`survival.json:52 focus_by_door` has no Faith entry), so a two-handed weapon stays in both hands.

## 4. Questions for the lead

None new. Two readings this file takes: Heart Surge no longer passes the Reach (2(i): ruling 29's count of class moves), and the prayer Push's `reach_plus` on Grace is 0 (3(d): it raises a tier).

**Defects found on the way** (data and code; not this file's to fix): `faith.ts:149 interventionHeal` types fallbacks that disagree with Mother Ember's row and with `patrons.json prayer.intervention.text`; under no-rebuild rule 2 they leave code and the text reads its fields (critic-consistency-2 3.1; the row's factor is `scale.json factor.walk.extra_keys`).

## 5. Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency-2 1.3 (hours from 05's first draft) | FIXED | no hour is written here; the clock is pacing's (ruling F36) |
| consistency-2 1.4 (Devotion's pace twice) | FIXED | `@pacing.tracks.devotion`; this file states no rate |
| consistency-2 1.5 (Mark thresholds) | FIXED | each door names its unit; `marks.rate` is `@pacing.door_marks.<door>` |
| consistency-2 1.10, 7.2 (Devotion XP clamped) | FIXED | kept, as the migration says (`door.devotion.live`) |
| consistency-2 1.12 (one key name) | FIXED | `feed_flat` on Camaraderie and Conscience |
| consistency-2 1.13 (class dials) | FIXED for 04's part | the Mender's, Channeler's and Chaplain's dials retire under the one rule; its statement is the lead's |
| consistency-2 1.14 (Triage and Love bases) | FIXED | the bases are held in `insight.class`; `scale.json factor.restated_elsewhere` points here |
| consistency-2 1.15 (module counts) | FIXED | quoted from pacing's tracks, none written |
| consistency-2 3.2 (Storm Front's MP) | FIXED | 5 x `mp` |
| consistency-2 4.4 (the Release with its forks) | FIXED | Ride the Edge and Blood Price are sum terms; the felt Release with both, Finish and the mark is under 99,999 (checker) |
| consistency-2 4.5 (Snap All five digits only at Celestial) | FIXED | Bite 1.8 at 9: five digits at Relic (checker) |
| player-2 1 (solo Calls) | FIXED for Authority | the Order aims self-or-ally; Taunt and Name It aim at foes or self already |
| player-2 2 (the solo Mender) | FIXED | every ally piece of the door and class says what it does alone (check (f)); Threads That Hold's solo half is the Mastered perk's (`gear_perks.json`) |
| player-2 3 (the Miracle demotes prayers) | FIXED by ruling 33 | the grade reads the highest standing reached |
| player-2 6 (the specialist's lead) | FIXED for Camaraderie and Conscience | their 10 keeps one unit; Composure's 10 is the lighter burn (a keep would copy Afterglow) |
| player-2 8 (old clock and thresholds) | FIXED | as 1.3 to 1.5 |
| player-2 12 (Insinuation 1 and 2 dead) | FIXED | 2 opens the heart for the Bond; Taunt works alone |
| player-2 15 (Hymns open waits on standing) | FIXED | point 3's text |
| player 3 (the wide character) | NOT FIXED | ruling B14, flagged for Leon |
| player 12 (rewards taken back) | the migration's | pacing owns it (ruling 39) |
| player 18 (two prayer counters) | NOT FIXED | the client's text |

## 6. Built from

| Rule or number | The existing piece and its data key | What must change |
| --- | --- | --- |
| Every base on the new scale | each row's own key, x the factor (`@scale.factor`) | the factor walk (01's); Triage and Love restated here |
| Heals on `mend`, damage on `deal`, Snap's damage on `deal` | `levelFactor` (`effects/output.ts`); an amount's column by kind and dealer | 01's change |
| Bonds held by Reach with ruling 13's gates | stat `ties_max:bond` (`kit.ts tieCap`), `tend.threads`, `tend.bonds_5`, `tend.bonds_8` | the door ladder (S2) writes `res_max:bond`; `bonds_5`, `bonds_8`, `mender_bonds` retire |
| Snap at Empathy 1 | `tending.json:534-539 tend.snap requires` | the min |
| Tending ties; Taunt Bonds | op `tie` (kind bond) on `acted`, predicate `target_not_tied`; the `call.taunt` step | effects on `tend.mend`, `tend.shield`, `medic.triage`; a step row |
| Snap All, Bite | `tend.snap` amounts, the `targets: {tied: bond}` selector | an "all" choice; the amounts read Bite (S2) x `cash_share:bond` (S3) |
| Overbind; the other Pushes | a one-use condition with `stat_mod res_max:<res> +1` (S5); its price by op `resource` on `turn_start` | condition rows; a 0-AP grant |
| Tending, class and Storm Front MP | each verb's `res.mp`; the cost site (`effects/cost.ts`) | the numbers in `soul.json`, read x `mp` |
| The cards | profiles `healing`, `mend`, `tend`, `soul`, `soul_mend`, `blessing`, `blessing_mend` | 01's slopes (data) |
| Received bonuses | stats `heal_received`, `shield_received` (`character.ts:1247, :1249`) | read the rows' `numbers` |
| The feed's flat term | `doorFeed` (`effects/feed.ts:36`) | `feed_flat` (extension) |
| Hold Together, Both Ways, the outward Share | op `redirect` with `limit.reaction`; `mend_mult` with `if.actor_tied` | data rows |
| Stage Reach; Heart Surge; the Push | `MAX_STAGE` (`magic.ts:729`) | `res_max:stage` per character (S5) |
| The compounding Release | `stageMult` (`magic.ts:730`), `feelings.json plain_step`, `outburstTerms` (`magic.ts:1371`) | the floor plus `Bite x cash(n)`, built in the one place; the ratio from S3's data key |
| MP pool, Pump MP, Syphon | `maxMp` (`character.ts:860`), the pump cost, `syphonMult` (`:903`), `rules.json` mana bands | numbers into data (01's pool, this file's Syphon) |
| Strain's burn; Composure 10 | `strain.burn_per_point` (`magic.ts:734 STRAIN_BURN`) | the share (01's); a Composure 10 row |
| Margins on a Bolt or a Lance | S1 at `classes/soul.ts:36-39` | 01's change |
| Door Marks | keyed Marks (S4) | three `marks` rows; prayer's Mark I is op `resource grace +1` on `combat_start` |
| Afterglow, Outbursts' Mark I | stat `begin_stage` (S11) | a condition row; Begin reads the stat |
| Iron Heart, Storm Front, Shape | `classes/i.ts:1147-1240` handlers | Storm Front's literals into `numbers`; Shape's handler retires |
| Grace | resource `grace` (S10); op `resource` on `acted` and in `faith.ts`'s tag recorder; `wear:grace` (S6) | the resource row; `grace` numbers in `patrons.json prayer` |
| The Hymn's wait | `patrons.json prayer.hymn.cooldown_rule` (`character.ts:1266`) | its three numbers; the typed fallbacks go |
| Devotion's start, curve, caps | `patrons.json devotion` (`:8, :17, :48`), `faith.ts:95` | pacing's numbers; start 0 |
| Prayer graded by the highest standing | the standing predicate (S17) and the rarity rows | 01's change, reading the highest standing |
| The prayer Push | `patrons.json:100 overreach` | Faith 8; once a turn; its price |
| Ward, Smite, Sanctuary, Amen, Verdict | `classes.json` guardian rows, `:7716` | the factor; Verdict's AP and C |
| The Order on yourself | `calls.json items[].aim`, `self-or-ally` (`:174`) | the Order's aim and a self step |
| Rank levels | `classes.json rank_levels` | pacing's gates |

## 7. Needs a new primitive

Names from critic-consistency-2's merged list (section 5). General pieces only; the lead approves each.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S10. The resource `grace`** | one row in `data/actions.json resources`; its max `res_max:grace` | prayer has no in-fight counter |
| **S11. The stat `begin_stage`** | one line in `STATS` | the twin of `momentum_start` for the heart |
| **S3 (`cash:`, `cash_share:`)** | `S(n)` and `S(n) / n` in `SOURCE_SPACES` | Snap All pays each Bond an even share; a number block cannot divide by the count |
| **S5. `res_max:<res>`** | `ties_max:` and `setResMax` generalised | the stage and Grace have no cap a stat can move |
| **S2, S4, S6** | the door ladder, keyed Marks, `wear:<res>` | as the merged list |
| **S17** (01's) | the standing predicate | the prayer grade reads standing |
| **Extension: `feed_flat`** | `doorFeed`'s product gains a flat term | ruling 20 |

## 8. The checker on this file, and what it cannot see

`python tools/balance/check.py`: every check that reads `soul.json` passes (refs; (a) DIGITS for `bonds`, `outbursts`, `prayer`; (c) LADDERS for the nine skills and three doors; (d) SPEND for pacing's Mender with a gun and Channeler; (f) SOLO). The Release's largest legal turn passes with little room: Ride the Edge, Blood Price and Finish were set from the checker's result with `gear_perks.json`'s Outburst terms (Resonance, Heart Overload, Verse of War) in the sum (ruling 29); any new Outburst or `any` sum or to-hit term puts it over.

What the checker does not read: (1) class-move cash-outs (Storm Front's arcs, Verdict, the Ledger's add): they are written in the class rows' `cashout` fields for a later check; (2) Storm Front's arcs added to the Release's turn (each arc is the design at the stage table's floor): with the arcs the Channeler's whole turn may pass 99,999, a question for the lead (ruling 29 counts Snap All and Slam in total).

## 9. What re-records

| Guard | What moves, and why |
| --- | --- |
| Damage tables (golden damage, `test/golden/*.json`) | every Outburst (the compounding Release, the slopes, `deal`, the Emanator's grade, Margins on Bolt and Lance), every heal and shield, Snap on `deal`, Snap All, every prayer (Grace, `deal` in place of `scale`, the Devotion grade), Smite, Verdict, Sanctuary, Triage, Love |
| Costs tables (`golden-costs*`, `costs-cooldowns`) | Tending's MP, Pump MP, Syphon, the class moves, the Hymn's wait, Verdict's AP, the three Pushes' prices |
| Rules tables (`golden-rules`) | Bonds by Empathy with the gates, Snap at 1, Snap All, Tending ties; stage Reach; Grace laid, worn and cleared; Strain's burn as a share |
| Item-ops table | Iron Heart, Storm Front, Heart Surge, Shape (retired), Ward, Smite, Take the Weight, the Ledger |
| Conditions table | the Pushes' conditions, Afterglow's |
| Replay guard (`test/replay-hash.test.ts`) | every seeded game with a Soul caster or a Faithful |
| Old saves (`test/old-save.test.ts`) | pacing's migration (the one copy): the pool, Devotion XP kept, a held stage or a fourth Bond above the new Reach |
| Tests that read today's numbers | soul and outburst suites (`MAX_STAGE`, the damage base), faith suites (the wait, the curve, tag caps, start 3), tending suites (Bonds at 5 and 8, Snap at 2), class suites (rank levels), `heal-pct.test.ts`, `bond-heal-shown.test.ts` |
| Lint and literal baselines | shrink: `maxMp`, `syphonMult`, `soulCostSaving`, `healReceivedMult`, `shieldReceivedMult`, the Hymn's fallbacks, Storm Front's literals, Shape's handler |
| Screen data, ladder rows, `tools/text_numbers.py` | Empathy's, Will Power's and Faith's rows; the three cards; the new beta and gamma rows; the Channeler's rank I; every prayer text that types a digit reads its row |
| Survival measures (`npm run balance`) | everything; read, not held to a line |
