# 03. The doors of Mind: Shadow, Sigils, Figments (0.34 rebalance, design phase; third draft, 21 Nov 2026)

> **Pass 4 (section G, 21 Nov 2026).** The Operative's Mark is the squad's damage mark and its old +1 to hit retires (ruling 41: a mark is one size or the other); Spotter is a mark of its own, laid from the dark, no longer an ambush on top of a Mark; Overflux and Written in Advance came down in the sum so the largest Line stays five digits with the mark and the gift (`forks`, `fork_why`); Shadow's counter cannot be held by a plan that names Guard (`counter.broken_by`, check (d)); the area Line is read a creature at a time (`cashouts.evoke_area`, ruling 40). **Costs** (ruling 49, check (h)): `door.resource_use` for Sigils and Figments, on `gear_perks.camp_cores` (three cores, PROVISIONAL): at level 20 a Line or a board every turn of a fight costs more than the cores carry.

**For the lead.** Nothing here is built; every proposed number is PROVISIONAL. **The numbers are not in this file.** By ruling F (`00-rulings.md`) they live once, in `tools/balance/bible/mind.json`; this file explains them and names each by its key (`mind.attributes.<attribute>.<...>`, shortened below to `perception.door.cashouts.break` and so on). Shared numbers are `scale.json`'s and `pacing.json`'s and are read there by reference. The tables are printed from the JSON and `data/*.json` (read only) by the checker:

    PYTHONUTF8=1 python tools/balance/check.py                  # every check; (a) DIGITS, (c) LADDERS, (d) SPEND, (f) SOLO read this file
    PYTHONUTF8=1 python tools/balance/check.py --tables doors   # each door's ladder and its cash-outs at levels 1, 10 and 20

Written to the charter (`../proposals/2026-11-21-the-curve.md` sections 10 to 18), its six laws (sections 2 and 3), the Momentum pattern (section 16) and the lead's rulings A to F (F wins). Facts about today carry file:line, checked at `release/0.34-final`.

## 0. What changed from the second draft

1. **Every number moved into `mind.json`**; the prose names keys. The second draft's tables of computed hits are gone: check (a) prints them, so they cannot go stale (critic-consistency-2 1.1, 1.5, 1.15).
2. **Ruling 29 applied by the checker, door by door.** Shadow's Bite at 9 is `0.5` (critic-consistency-2 1.7, 4.1); Sigils' Bites came down (`brain_power.points.1/6/9.bite`) and its two forks were restated as `+10%` each in the one sum (4.3); Figments' Bite at 9 came down so the Rigger's full board fits (below). Every Mind door now passes check (a): its level-1 and level-20 plain hit, its full cash-out at 20 in Relic, its largest legal turn and its largest plain hit.
3. **Ruling 31 applied:** one pair to a hit. The Break reads Perception and Ingenuity (`perception.door.plain.pair`), a Line Intelligence and Brain Power, a Figment Expression and Visualization. **Expression's card drops the elemental line** (`expression.card.dropped`), and so does Visualization's.
4. **Ruling 30 applied:** each cash-out counts only its own door's sum terms and the squad's one mark on the foe. The Break's own "+0.15 on a Marked foe" (`rules.json` `shadow.marked_bonus`) becomes that mark (`perception.door.cashouts.break.marked`); the Operative's Mark lays it (`perception.class.ranks.3`, `mark.lays`).
5. **Ruling 32 applied:** every move that names an ally says what it does alone (`solo`): Dead Drop, Lend the Dark, Spotter and the three gamma Calls (Spot, Brief, Rally). Check (f) reads them.
6. **Ruling 39 applied:** the Sigilist's Stored Spell carries the rule that a spell stored before the revision, longer than its caster's new Reach, stays castable as stored (`intelligence.class.ranks.3`, `stored_spell.stored_before`); the migration is `pacing.migration`, the one copy. Moves a live character holds stay held, so Core Change and Backdraft can change rank (critic-consistency-2 7.3).
7. **Rates are pacing's** (ruling D22): door Marks (`pacing.door_marks.shadow`, `.sigils`, `.figments`), word Marks (`pacing.tracks.word_marks`), found spells (`pacing.tracks.found_spells`) and form Marks (`pacing.tracks.form_marks`, which settles critic-consistency-2 1.6) are references, never numbers here.
8. **Critic-player-2 finding 6 applied:** each Mind beta's point 10 makes the cash-out keep one unit (the Break keeps a Shadow, the Evoke leaves its first glyph, the Curtain leaves a Figment standing): the full family cashes out more often at the same top, which no Bite step could pay for under the cap.

## 1. Shared rules this file uses (all read by reference)

- **The cash-out sum** `cash(n)` and its `grow` are `scale.cash_out`; each cash-out's formula is in its row (`...door.cashouts.<id>.formula`): the Break `1 + bite * cash(n)`, the Evoke and the Curtain `bite * cash(n)` (no `1 +`: a Line of two and a Curtain of one are the short spend). Margins add to the factor on the door's plain hit (`scale.margins`); everything else adds into the one sum (`scale.stack`).
- **Reach and Bite** step at points 1, 4, 7, 10 (Reach) and 1, 6, 9 (Bite) on all three alphas. **A door's top Reach needs its family** (ruling B13): the step at 7 needs the beta at 4, the step at 10 the beta at 7 and the gamma at 4 (`...points.7.needs`, `...points.10.needs`; check (c) enforces it).
- **The Push at 8** on each door (`...door.push`), once a turn, one unit past Reach (`reach_plus`), its price on you.
- **Cards** (ruling A4, `scale.cards`): each attribute's line is `scale.cards.attr_slope`, each alpha's `scale.cards.skill_slope`, multiplied, on the door's own profile (`gun` with the door's pair, `sigil`, `figment` and `figment_hp`).
- **Costs** (`scale.costs.rules`): Shadow, glyphs, Flux, charge and Figments are counts and never scale; AP is the clock; HP a Sigilist pays its Evoker is a share of its own max HP (`scale.costs.shares.flux_overload`).
- **Two foci, one pair of hands** (ruling E): Sigils need an Evoker in a hand, Figments a Visualizer; Shadow needs none. A two-door Mind caster holds both foci and no weapon, or a weapon and one focus and pays the 1 AP hand swap each time it changes door.

## 2. Perception: the door of Shadow (Ingenuity; Analysis; Vigilant; the Operative, id `infiltrator`)

**Today.** The meter's cap is by Ingenuity points (`rules.json` `shadow.cap_by_points`, read by `character.ts:1261 shadowCap`), plus the Operative's own add (`shadow.operative_cap_add`, read at `character.ts:1871`), so Ingenuity's last points add no Reach. The Break is one weapon attack from Hidden that spends the whole meter, its multiplier written in `rules.json` `shadow` (`per_point`, `ambush_bonus`, `marked_bonus`) and typed again in the toggle's `value` (`skills.json` ingenuity unlock 1). Perception's card adds nothing to the Break; its critical lines are held by `CRIT_MAX` (`character.ts:853-855`) and dead from Perception 8 (`critTakenPct`, `character.ts:1237`). Measured: the Operative cleared no Survival run in 0.32 (`docs/design/handoffs/0.32-MEASURES.md:180`).

**The door** (`perception.door`). The counter, what builds, spends and wears it are listed in the JSON; kept from today are every verb's own cost (`units: "own"`, `shadow.json`) and the gains a turn (`counter.gains_per_turn`, read from `rules.json`). **The plain hit** is the long rifle on the Break's pair. **The Break** (`cashouts.break`) is `1 + bite * cash(n)`; a fresh ambush moves into the one sum (`cashouts.break.ambush.sum`, its value read from `rules.json` `shadow.ambush_bonus`), so it multiplies the whole blow; a Marked foe is the squad's one mark. *Reason a player sees: the meter is safety while it fills (you are Hidden, nothing targets you) and a blow when you spend it; the specialist waits longer and is paid for the wait.*

**Ingenuity's ladder** (`perception.ladders.ingenuity.points`). Reach 2 / 3 / 4 / 5 at 1 / 4 / 7 / 10 (today's "holds one more" at 5 moves to 4); Bite at 1, 6 and 9. Everything that exists on the ladder today stays at its point (`exists`). The Push at 8 is **Last Shade** (`door.push`): one Shadow past your Reach until your next Break, and that Break leaves you Traced until the end of your next turn (`conditions.json` `traced`). *Reason: the deepest Break of the fight is followed by a turn in the open, so the player chooses when the room can bear it.*

**Analysis** (`ladders.analysis`): from the first point, +1 to the TN foes need to find you while Hidden (`feed.feed_flat`, ruling 20), beside today's feed; points 4 and 7 open Reach 4 and 5; point 10 makes the Break keep a Shadow. Its critical-damage-taken line goes with the critical (`analysis.dropped`). **Vigilant** (`ladders.vigilant`): every point a tile of sight, notice and Spot; point 4 opens Reach 5 with Analysis; point 6: a Spot made from Hidden gives a Shadow. Spot names an ally; alone, your own next attack uses the mark (`vigilant.call.solo`).

**Perception's card** (`perception.card`): the door's attribute slope on every Break; a Margin a point better on every roll (`scale.margins.per_perception`); vision kept. The two critical lines are dropped with the reason (`card.dropped`). *A Perception point outside Shadow is never dead.*

**Marks** (`door.marks`): the unit is a Shadow spent in a Break on a worthy foe; the thresholds are pacing's (`pacing.door_marks.shadow`). I primes the meter (stacks with Tradecraft: critic-player 9), II halves the wear while seen, the middle Mark refunds a Shadow on a kill, III makes Last Shade free once a fight.

**Tags** (`door.keeps_tags`): what other doors' moves keep (Shadow through a working, a glyph, an order, a prayer; the chain and the plates through Shadow's quiet steps).

**The Operative** (`perception.class`). What only it has: the Read, Marks, toxins, the machine work, and **Dead Drop** in place of the retired +1 cap (ruling C16: the +1 is everyone's Reach). Mark lays the squad's one mark and keeps today's to-hit (read from `conditions.json` `marked`); Toxin skips the save from Hidden or on a Break and coats two hits; Called Shot drops an AP so it is worth pressing; Rig's blast rides the factor. Ranks at levels 3, 5 and 15 (`pacing.gates.rank_levels`).

## 3. Intelligence: the door of Sigils (Brain Power; Rumination; Eloquence; the Sigilist, id `mage`)

**Today.** A Line's length is set by Intelligence, not Brain Power (`character.ts:881`, typed in code; `MAX_GLYPHS`, `classes/k.ts:298`, `ai-sigil.ts:194`); words known are typed twice (`character.ts:890`, `sigils.json` `grammar.known_max`). The Line multiplier barely grows with length (`sigils.json` `grammar.line_mult.by_glyphs`; its text at `sigils.json:165` is stale). The sigil profile has no slopes (`rules.json` `output.profiles.sigil`), so neither card pays. Overclock sits at Brain Power 2 in a handler with its charge typed in code (`perks/skills.ts:27-60`). Measured: the Sigilist bot clears far fewer runs solo than the Channeler (`docs/design/handoffs/0.33-LANE-BALANCE.md:21-24`).

**The door** (`intelligence.door`). The counter is the glyphs of your Line, with Flux beside it. **The plain hit** is one STONE glyph, the strongest damaging Subject (`door.plain`, its base read from `sigils.json` times the factor): a Line's Margins land on it (critic-consistency-2 1.18). **The Evoke** (`cashouts.evoke`) is `bite * cash(n)`.

**How a Line's words read** (`door.words`), all PROVISIONAL and for the lead:
- **One Subject's damage** (`words.one_subject`): a Line deals its strongest damaging Subject's damage; every other damaging Subject adds its element and condition, not its damage.
- **CONDENSE** (`words.condense`) loses its own damage: length pays a Line now, so a word that only multiplied paid twice, and with it a Line of two was five digits at level 20 (ruling 29 wants it four). It stays a one-charge glyph that keeps a Line on one target; Mastered, it costs no charge.
- **Area and delivery words** (`words.spread_words`) keep their shares as each creature's share of the spell (a factor of the targets, as Cleave's), never the sum.
- **A damage inflection** (STONE's, `words.inflections.stone`, read from `sigils.json`) is a term of the Line's sum.

**Brain Power's ladder** (`intelligence.ladders.brain_power.points`). Reach is the Line's length: 2 / 3 / 4 / 5 at 1 / 4 / 7 / 10 (ruling C19); words held are `door.words_held` (`base + per_point x Brain Power`). Bite at 1, 6 and 9. **Brain Power 2 gives the first core saving** (moved from 3) in Overclock's place. `grammar.max_glyphs` becomes the top Reach and `MAX_GLYPHS` reads it (`door.glyph_top`). **The Push at 8 is Overclock** (`door.push`, moved from 2 by ruling C17): one glyph past your Reach, its extra charge read from today's row, and the Evoke overloads your Evoker as if your Flux went one over, through the one overload path. The handler and its key go. *Reason: the longest Line you can write burns the hand that wrote it, and the Sigilist's Backdraft turns that price into a blow.*

**Forks** (`door.forks`): Overflux and Written in Advance are restated from `damage_mult` rows into the one sum (`fork_why`); Clean Vent and Running Script are kept.

**Rumination** (`ladders.rumination`): +1 Flux limit a point from the first (`feed.feed_flat`; today's feed retires: it reached +1 only at a product no character holds early); points 4 and 7 open Lines of 4 and 5; point 10 leaves the Line's first glyph on the ground. **Eloquence** (`ladders.eloquence`): point 4 opens Lines of 5 with Rumination; point 6: a Brief you give vents a Flux. Brief names an ally; alone, you Brief yourself at the step below your own (`eloquence.call.solo`).

**Intelligence's card** (`intelligence.card`): the attribute slope on the sigil and sigil_mend profiles; the longer Line moves to Brain Power (`card.dropped`).

**Marks** (`door.marks`): the unit is a glyph past the first in a Line Evoked on a worthy foe (`pacing.door_marks.sigils`). Mark II is core charge, not Bite: a Bite step would carry the short Line past four digits. **Word Marks** (`door.word_marks`, counts `pacing.tracks.word_marks`): I a charge less, II the inflection (today's), III a repeat with no penalty. **The book of found spells** (`door.found_spells`, rate `pacing.tracks.found_spells`): a Line whose words you have never Evoked, landed on a worthy foe, is written in your book and pays study; built on S9, firsts.

**Tags** (`door.keeps_tags`): a Line step keeps the chain; Vent calms Strain (the Sigils-Outbursts Crossing's base); a glyph keeps its time while its writer covers a friend.

**The Sigilist** (`intelligence.class`). What only it has: the **Stored Spell**, moved to rank I, set off once a turn as that turn's Evoke (so it saves the set-up and never doubles a turn), and **Backdraft**, now its planned blow with Overclock's price (today's block reads the overload's own amount, which is now a share of max HP). Core Change to rank II, Backdraft to rank III; the dial row goes (`class.retired`).

## 4. Expression: the door of Figments (Visualization; Proficiency; Charisma; the Rigger, id `trickster`)

**Today.** Figments held by Visualization (`figments.json` `ladder`, read by `figments.ts:45 ladderAt`), plus the Rigger's Hands (`classes.json:1986`); the board is capped (`figments.json` `limits`) and pays upkeep a Figment (`figments.json` `upkeep`). Each Figment's blows read the `figment` profile and its factor (`rules.json` `output.profiles.figment`, `output.factors.figment`), with no slopes: nothing on Expression's card reaches Figments. There is no cash-out.

**The door** (`expression.door`). **The plain hit** is a Beast's claws on the figment profile (`door.plain`). **The Curtain** (`cashouts.curtain`, from point 1, ruling C18): every Figment you hold that can reach one foe converges at once, one roll, then comes apart; `bite * cash(n)`; **no charge comes back** (`curtain.refund`: Cash in and Let go keep it; critic-player 14). Upkeep is a charge for every two Figments held, the AP from a fuller board (`door.upkeep`); the board's limits grow to hold Reach, Many Hands and Overhold beside the Rigger's bodies (`door.limits`).

**Visualization's ladder** (`expression.ladders.visualization.points`). Reach is Figments held: 1 / 2 / 3 / 4 at 1 / 4 / 7 / 10 (today's "two held" at 5 moves to 4); Bite at 1, 6 and 9. **The Push at 8 is Overhold** (`door.push`): one Figment past your Reach; it drinks charge every turn it stands and its fall Snaps you harder. *Reason: a crowded stage is held by the hand that pays for it.*

**Forks** (`door.forks`): Sharp Light restated into the one sum; Many Hands' extra Figment is a reach term (below); Masterwork's to-hit is a to-hit term; Hard Light kept.

**Proficiency** (`ladders.proficiency`): from the first point a share of Figment HP (`feed.feed_flat`), a charge in every mana core you load (Visualizer and Evoker), and less ambush damage, so the cap that today ends that line early is reached only at 10 (`feed.ambush_taken_per_point`); points 4 and 7 open three and four held; point 10 leaves a Figment standing after the Curtain. **Charisma** (`ladders.charisma`): point 4 opens four held with Proficiency; point 6: a Rally puts a charge back in your Visualizer. Rally names an ally; alone, you Rally yourself at the step below your own (`charisma.call.solo`).

**Expression's card** (`expression.card`): the attribute slope on every Figment's blows and HP; the glyph AP kept (read from `attributes.json`); the elemental line dropped (ruling 31).

**Marks** (`door.marks`, `pacing.door_marks.figments`); **form Marks** (`door.form_marks`, counts `pacing.tracks.form_marks`): a form held through worthy fights grows hardier, cheaper to order and gains a trait slot.

**Tags** (`door.keeps_tags`): Figment work keeps Shadow; a Ward's soak keeps your plates and chain; a Figment on your Line's tile keeps your glyph (the Figments-Sigils Crossing's base).

**The Rigger** (`expression.class`). What only it has: free Doubles, Salvage, Redline, the Scrap Sentinel, and **a bigger Curtain** in place of the retired +1 held: the Curtain counts every unit tied to you, so the Double and the Sentinel join the board (`only_it_has.bigger_curtain.reach_plus`). Sleight once a turn and the Sentinel once a fight, so its rank III moves are worth pressing; Redline's hurt rides the factor; the dial row goes.

## 5. The checker's readings (where to look, not numbers)

- **Check (a)** prints, for each Mind door: the level-1 plain hit (standard and Fine, the l1 specialist), the level-20 plain hit (Relic and Celestial), the full cash-out at 20 in Relic with nothing but the ladder, the largest legal turn (the Push, the forks, the class, gear_perks' tier-II perks and to-hit, Margins from the best legal to-hit, the mark), and the largest plain hit. All pass.
- **The Line of two stays four digits** at level 20 (ruling 29): it is `brain_power.points.9.bite x cash(2)` of the Celestial plain hit check (a) prints, inside `scale.digits.plain_l20`.
- **Check (c)** passes the nine Mind ladders (ten felt points each), the Reach steps and family gates, the Push at 8 and a cash-out from point 1 on all three doors.
- **Check (d)** walks pacing's `sigilist` and `rigger` plans: every level felt, 38 and 20 spent, the top Reach on one door only.
- **Check (f)** passes every Mind move that names an ally.

## 6. Questions for the lead (each with the recommended answer)

1. **CONDENSE's damage** (`intelligence.door.words.condense`): today it multiplies a Line by half again; under Bite x the cash-out sum, length already pays. Recommended: it keeps its shape (one target, a cheap glyph) and loses its damage, as written. The alternative, a small sum term, does not fit ruling 29 with the forks it names.
2. **The Line's first Bite** is a little under today's Line of two (`brain_power.points.1.bite`): the price of fitting the Overclocked Line under ruling 29 with the forks and a Mastered STONE. Recommended: accept; a level-1 Sigilist's Lines of three and four are far above today's.

## Critics' findings (second round, the ones naming this file)

| Finding | Status | How |
| --- | --- | --- |
| consistency-2 1.1 (01 T11 on stale Bites) | FIXED | check (a) reads this file's Bites; no stale copy exists |
| consistency-2 1.5 (door Mark thresholds) | FIXED | `pacing.door_marks.*` by reference; this file names the unit only |
| consistency-2 1.6 (form Marks) | FIXED | `pacing.tracks.form_marks` by reference |
| consistency-2 1.7, 4.1 (the Break six digits) | FIXED | Bite at 9 is 0.5; check (a) passes with gear_perks' terms |
| consistency-2 1.15 (word counts, Word Mark III) | FIXED | `pacing.tracks.word_marks` and `.study` by reference |
| consistency-2 1.17 (the elemental line) | FIXED | dropped from Expression's and Visualization's cards (ruling 31) |
| consistency-2 1.18 (a Line's plain hit) | FIXED | the plain hit is the Subject glyph (`intelligence.door.plain`) |
| consistency-2 4.3 (the Line six digits with its forks) | FIXED | forks restated in the sum, Bites lowered, CONDENSE's damage removed; check (a) passes |
| consistency-2 5.1 (`res_start:`) | FIXED | dropped: Shadow's Mark I is the `resource` op on `combat_start` (exists) |
| consistency-2 1.13 (dials) | FIXED for Mind | the Sigilist's and Rigger's dial rows go |
| consistency-2 7.3 (moves that change rank) | FIXED | ruling 39: moves held stay held |
| consistency-2 7.5 (stored spells) | FIXED | ruling 39, `stored_spell.stored_before` |
| player-2 1 (solo gamma Calls) | FIXED for Mind | Spot, Brief and Rally carry `solo` (ruling 32) |
| player-2 6 (the specialist's last family points) | FIXED for Mind | each beta's 10 keeps one unit of the cash-out |
| player-2 7 (stale T11) | FIXED | as consistency-2 1.1 |
| player-2 8 (old Mark thresholds) | FIXED | as consistency-2 1.5 |

## Built from

| Rule or number | Existing piece and data key | What must change |
| --- | --- | --- |
| Shadow Reach with the family gates | `rules.json` `shadow.cap_by_points`, `character.ts:1261 shadowCap` | a row of the door ladder (S2) with the beta and gamma keys; `operative_cap_add` and its reader (`character.ts:1871`) go |
| Shadow Bite on the cash-out sum; ambush into the sum; Marked as the squad's mark | the Break toggle's value block (`skills.json` ingenuity unlock 1), `rules.json` `shadow` | the `res:shadow` term becomes the ladder's Bite on `cash:shadow` (S3); the ambush a sum term; `marked_bonus` goes to the mark (S18) |
| The Break reads Perception and Ingenuity | `statOf(profile, c, pair)` | an action's pair (01's extension) |
| Last Shade, Overhold | a data `grant_action`; `conditions.json` `traced`; stat `ties_max:owned` | S5, `res_max:shadow`; Overhold reads `ties_max:owned` as it is |
| Door Marks; form Marks; word Marks | the drill bar; `sigilgrowth.ts`, `sigils.json` `grammar.word_mastery`, the `word_cost` op | S4 keyed `door:`, `form:`; Shadow's Mark I is the `resource` op on `combat_start` |
| The betas' flat terms | `effects/feed.ts:37` | the feed's `feed_flat` (one key, every beta) |
| The gamma 6 effects; the gamma Calls alone | `calls.json` rows, op `resource` on `acted`; `calls/core.ts:97` refuses self | data rows; `aim: self-or-ally` (exists on Name It) |
| Dead Drop, Mark, Toxin, Called Shot, Rig | `classes.json` move pool and Operative ranks; `shadow.json` rig | data rows |
| Line Reach and words held by Brain Power | `character.ts:881`, `:890`, `sigils.json` `grammar.max_glyphs`, `known_max`, `MAX_GLYPHS` | S2 into the stat `max_sigil_words`; one number block in data |
| Line multiplier as Bite x the cash-out sum | `sigils.json` `grammar.line_mult`, read in `sigil.ts:436` | S3; the stale texts read their rows |
| One Subject's damage; CONDENSE; area words as target shares | `rules.json` `output.systems.sigil_damage`; `sigils.json` `grammar.repeats`, items' `mult` | data and their texts; the area share is the targets factor the engine already applies |
| The sigil, figment and figment_hp slopes; the foci's grades | `rules.json` `output.profiles`; `focusRarity`, `with_this` | scale's profile rows and grade ladder |
| Overclock at 8 and its overload | `perks/skills.ts:27-60`, `skills.json` brain_power unlock 2; the overload path | a one-use condition with `stat_mod max_sigil_words` and a `cost_mod`; the handler and its key go |
| Core savings at 2 / 5 / 9 | `skills.json` brain_power `charge_at` | the list |
| Rumination's Flux limit; Proficiency's core charge | stat `flux_max`, `magic.ts fluxMaxOf`; stat `core_charge`, `coreChargeOf` | the betas' flat terms |
| The found-spell book | `SigilGrowth`, `addStudy` | S9 firsts |
| The Curtain, no refund; the Rigger's board | `figments.json` verbs (`figment_order`), op `deal` with targets `tied: owned` | a verb row on `cash:` of `ties:owned` (S3) |
| Upkeep per two; the board's limits | `figments.json` `upkeep`, `limits` | a `per_held` number in the existing reader |
| A cash-out that keeps a unit (each beta's 10) | the cash-out site | a `keeps` key on S3 |
| Sleight, Scrap Sentinel scopes; the dials | `classes.json` `uses`; the dial rows | data |

## Needs a new primitive

Names from critic-consistency-2's merged list (section 5); none is new to this file.

| Name | What the Mind doors use it for |
| --- | --- |
| S1, Margins | every Mind cash-out rolls |
| S2, the door ladder (from `holderNumber`'s door-ladder reading and `ladderAt`) | Shadow's meter, a Line's length, Figments held, the Bites |
| S3, `cash:` (with a `keeps` key) | the Break, the Evoke, the Curtain; each beta's 10 |
| S4, keyed Marks | door, form and word Marks |
| S5, `res_max:` | Last Shade |
| S6, `wear:` | the tags; Shadow's Mark II |
| S9, firsts | the found-spell book |
| S18, a condition `slot` | the Operative's Mark as the squad's one mark |
| an action's pair (01's extension) | the Break reading Perception and Ingenuity |

Dropped: `res_start:` (critic-consistency-2 5.1), the `attr:` source, `practice_rate`.

**Two extensions to the bible's own shape** (`SCHEMA.md` 1.4 and 3.1, and one line of `tools/balance/check.py`): a **reach term** (`"reach_plus": {door, value, group}`), so check (a) counts Many Hands' extra Figment and the Rigger's Double and Sentinel in the largest Curtain; and `units: "own"` for a move whose own cost in data is kept.

## What re-records

| Guard | Why it moves |
| --- | --- |
| `test/golden-damage*` | every Break, Line and Figment blow (Bites, Reach, the pairs, the slopes, the grades, one Subject, CONDENSE, the forks in the sum), Rig and Redline on the factor |
| `test/golden-costs*`, `costs-*.json` | Overclock's move and price; the core saving at 2; upkeep per two; Called Shot; Sleight and Sentinel scopes; Dead Drop; Mark I's free glyph |
| `test/golden-rules*` | the Shadow meter, Last Shade and Traced, Toxin from Hidden, Lines of 5, the Curtain without a refund, the family gates |
| `test/golden-itemops*` | the Break's value block, the alpha unlock rows, the gamma Call rows, Tradecraft, the Rigger's Hands |
| `test/replay-hash.test.ts`, `test/golden/replays.json` | any seeded game with a Mind character or an Evoker-carrying enemy |
| `test/sigil-balance.test.ts` | it pins a spell under the withdrawn `SIGIL_CAP` (`scale.caps.items.sigil_cap`): deleted with it |
| `test/sigil-word-cap.test.ts`, the `sigil14*`, `sigil15*` and `figments*` suites | words held, the Line length rule, form numbers |
| `test/balance/magic-measure.test.ts` and the shadow and figment measures | readings: they print and move |
| `test/old-save.test.ts` | `sigilGrowth` gains the firsts set; Overclock's saved state dropped; the Rigger's extra held gone (a saved one stays until it falls); stored spells (ruling 39) |
| `test/descriptors.test.ts`, `apps/web/src/screens/combat-actions.test.ts`, `test/actions.test.ts` | Curtain, Last Shade, Overhold, Dead Drop; Overclock's rung |
| the text-number guard (`tools/text_numbers.py`, `test/datatext.test.ts`) | the door lines, cards, ladders, Overclock's, Tradecraft's, the stale Line texts |
| `test/lint-item-ops.test.ts` baseline | shrinks: Overclock's handler becomes data |
| `test/survival-run.test.ts` bars | the Operative's, Sigilist's and Rigger's clears move (read, not fitted) |
