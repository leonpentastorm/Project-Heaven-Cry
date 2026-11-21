# 01. The number scale (the 0.34 rebalance, design phase; third draft, 21 Nov 2026)

**For the lead.** Nothing here is built; every proposed number is PROVISIONAL. **The numbers are not in this file.** By ruling F (`00-rulings.md`) they live once, in `tools/balance/bible/scale.json`; this file explains them and names each by its key (`scale.<key>`). The tables are printed from the JSON and `data/*.json` (read only) by the checker:

    PYTHONUTF8=1 python tools/balance/check.py --tables scale     # the scale's ten tables
    PYTHONUTF8=1 python tools/balance/check.py --tables columns   # one: factor weapons columns profiles hp mp plate grades margins caps
    PYTHONUTF8=1 python tools/balance/check.py                    # every check; (a) and (b) read the scale against the door and world files

The file shapes are `tools/balance/bible/SCHEMA.md`. `tools/balance/scale.py` is retired into the checker (it now only points there).

Leon's ruling this file answers (the curve, section 17 item 2): *a hit is one or two digits at level 1, four at level 20, five for something super; you feel every level in the power of the hits, your HP, their HP, AP cost, mana cost; nothing is 100 HP because other games do it.* That test is `scale.digits`, and check (a) applies it door by door.

## 0. What changed from the second draft

1. **Every number moved into `scale.json`** and every table into the checker; the prose quotes keys. The second draft's tables were computed by `scale.py` from a `PROPOSAL` block that also typed the door files' Bites and 07's squad sum (critic-consistency-2 1.1): those are gone. A door's Reach, Bite and Push are read from its core file, a sum term from the item that grants it.
2. **T11 (the top of the scale) and T12 (the columns read back) are now checks (a) and (b)**, computed from the door files and `world.json`, so they can no longer go stale.
3. **Ruling 31 applied:** one pair to a hit, and the `elemental` profile and Expression's and Visualization's elemental lines are dropped (critic-consistency-2 1.17).
4. **Ruling 30 applied:** a cash-out counts only its own door's sum terms and one mark on the foe (`scale.stack.scope`).
5. **Ruling 33 applied:** prayer's grade reads the highest standing reached (`scale.grades.prayer`).
6. **Migration has one owner** (ruling 39): the scale's moves on a save (HP and MP by share) are rows of `pacing.migration`; `scale.migration` points there.

## 1. How the engine computes a hit today (checked in code and data)

**The one formula** (`packages/engine/src/effects/output.ts:4-7`; `data/rules.json:1719` `output`): `amount = (base + flat) x Stat x Level x own multipliers x (1 + target bonuses, capped)`, then `dealt = max(1, floor(amount) - armour)`.

- **Stat** is `statTerm` (`output.ts:87-92`): `k x (1 + attr x (A - 1) + skill x S)`, the terms added; a weapon's pair is its row's (`weaponMult`, `character.ts:833-837`). Today's profiles (`rules.json:1814`) pay melee a small Strength slope and no skill, a gun a small Agility slope and no skill, and Sigils, Outbursts and the elemental bonus no slope at all, so most cards promise a number nothing pays. `--tables profiles` prints today's Stat at the normal share beside the new `k`.
- **Level** is `levelFactor` (`output.ts:111-117`); `scaleOf` (`:120`) for everything measured in HP. The columns are `rules.json:1724` `deal`, `:1746` `scale`, `:1768` `mend`; the enemy rows `enemies.json:214` `levels.table`.
- **Own multipliers** (`combat.ts:1536-1547`): rarity, technique, the melee factor (`MELEE_FACTOR`, `combat.ts:46`, applied `:1537`), wear, ammunition, the critical (`critMult`, `character.ts:855`, with `CRIT_BASE` and `CRIT_MAX` at `:853`).
- **Target bonuses** (`stackDamage`, `output.ts:131-134`): added, held at `VS_CAP` (`output.ts:129`).
- **Max HP** is typed in code (`character.ts:801` `maxHp`), and so is max MP (`character.ts:861` `maxMp`).

Three places would leave numbers on the old scale whatever the columns say: a thrown blast, a barrel, a trap and a hazard read no level (`tactics.ts:433-435`, `perks/c.ts:485`, `combat.ts:889-893`, all through `hurtUnit`, `combat.ts:859`); Figments grow their HP by the enemy HP column (`figments.json` `level.hp`); the heal gate counts to `rules.json` `mending.gate.hp` times the old scale (`output.ts:264`).

## 2. The factor (ruling A1): `scale.factor`

**One factor, `factor.value`, on every flat number** of damage, HP, healing, shields, armour, soak, plates, cover, hazards, damage over time, enemy HP and items. *Reason a player sees: damage and HP move together, so every count of hits to drop a foe, to drop you and to heal you stays what it is today for a character who spread its points; only the changes this bible names move a count.*

- **Which numbers:** `factor.walk` names the keys and shapes; `--tables factor` lists every number it finds outside `weapons.json` with today's value and the new one, and `--tables weapons` every weapon row. `factor.walk.extra_keys` are the few the walk cannot find by name (armour classes, cover, the Damage school's base, the intervention, a tier's damage factor, the heal gate).
- **Not touched:** every share and every count (`factor.walk.not_touched`).
- **Self-paid HP leaves the factor:** each row of `factor.self_paid.rows` becomes a share of the payer's max HP (`costs.shares`); the share is today's number over the old reference bar, to a whole percent, and `--tables factor` prints both.
- **Restated elsewhere:** `factor.restated_elsewhere` lists the rows whose new number is another file's (Triage and Inspire are Soul's, Launch the Breaker's, two traits 07's: critic-consistency-2 1.14); each entry points at the key that owns it, and the checker fails if that key does not exist.
- **Level 1 stays one or two digits:** `factor.own_factor`. A row whose level-1 plain hit by the test character (`own_factor.test`) would show three digits takes the largest step of `own_factor.step` under the factor that keeps it two digits, one factor for a category's breaking rows so their order holds. Computed, never typed: today the three rocket tubes, the satchel charge and the arbalest (`--tables weapons`, column "factor"). *Reason: a rocket is still the biggest single hit of a level-1 fight and still throws its splash.*
- **Draw bows:** `factor.draw_bows`: the draw moves onto the Stat term, and the row is pinned so a normal share deals today's blow times the factor. *Reason: on the base, Raw Power made a level-20 longbow shot five digits; on the Stat term a strong archer still draws harder, by the card.*
- **Rounding:** `factor.rounding`; no row is bumped to keep a strict order (rows that meet were under a tenth apart, a gap no player feels).

## 3. The level columns (ruling A2) and the enemy columns (A3): `scale.columns`

Each column is a formula of the level with its own parameters (`--tables columns` prints levels 1 to 20).

| Column | Reads | Reason a player sees |
| --- | --- | --- |
| `columns.deal` | every amount a character deals, max HP, armour, a plate's soak, objects' HP, cover | every level-up makes your hit, your bar and your armour about a fifth bigger |
| `columns.mend` | every heal and shield a character gives | a heal that closes a third of a normal friend's bar at level 1 closes a third of it at 20: the column is the normal bar's growth, built from `scale.hp` at the normal share, so the two can never drift |
| `columns.mp` | max MP, every MP price on the `mp` rule | a pool holds about four full cash-outs at every level |
| `columns.enemy_hp` | every enemy's HP | written for the stated attacker (`world.stated_attacker`): a level-20 fight is a little longer than a level-1 fight in plain hits, room for the long cash-outs; a grade found is a jump in your damage, never cancelled by a jump in theirs |
| `columns.enemy_damage` | every enemy hit and amount; a Figment's HP; a hazard with no dealer | written for the stated defender (`world.stated_defender`): the frail character survives about four same-level Soldier hits at every level |
| `columns.enemy_armour` | every enemy's armour | a foe's plate keeps its bite against a plain level-matched hit |
| `columns.defense_plus`, `columns.attack_plus` | the roll | ruling A3: the roll is bounded |

- **`scale` stops being a column:** `scaleOf` reads `deal`, and the `scale` array is deleted (two columns with one meaning are a second copy of a rule).
- **The heal column against ruling A2's "x65":** the ruling's number was the first draft's HP formula; on A5's formula the same reason (a heal stays the same share of a bar) gives `columns.mend`. **For the lead to confirm in one line** (critic-consistency-2 2.3).
- **An amount reads the column of its kind and its dealer:** a damage amount `deal` (a character's) or `enemy_damage` (an enemy's), whatever profile it names; a heal or shield `mend` (a character's) or the enemy's own multipliers as today.
- **The heal gate** counts to the normal bar at level 1 (the bar `columns.mend` is built from) times `mend`.
- **Defense and to-hit are level-free (A3):** a tier's Defense and to-hit are `world.tiers`. The level gap (`enemies.json:199` `gap`: `to_hit_per_level` up to `max_levels`), the one-hit rule (`one_hit_levels_below`, `:200`) and the Elite and Boss full-HP guard stay, unchanged.
- **The stated attacker and defender, and the tier rows** are `world.json`'s (SCHEMA section 6); check (b) reads the columns back against them at levels 1, 5, 10, 15 and 20.

## 4. The cards (ruling A4, ruling 31): `scale.cards`

**One rule for the nine:** `cards.stat_formula`, the attribute term and the skill term multiplied (`cards.attr_slope`, `cards.skill_slope`). Each profile's `k` is computed so a **normal share** (`cards.normal_share`, read from `rules.json:1981` `output.floor_reference`) deals at level 1 exactly today's number times the factor: *a character who spread its points sits where it sits today; every point above that is the card's promise, every point below it is missing.* A card's promise holds whatever `k` is.

- **One pair to a hit** (`cards.one_pair`, ruling 31): a hit reads the attribute and alpha of the door that makes it. A Break reads Perception and Ingenuity, not the gun's pair as well; a plain shot from the same gun reads Agility and Dexterity. *Reason: a hit carrying two attribute terms would multiply a two-attribute character's cards twice.*
- **A weapon reads its row's pair** (`weapons.json` `phys.scales_with` x `phys.hits_with`, as `weaponMult` does today): so Agility's card reaches every Dexterity weapon through the rows (`cards.dexterity_weapons`), and no hidden pin is needed.
- **Dropped** (`cards.dropped`): the `elemental` profile and the elemental lines on Expression's and Visualization's cards (ruling 31: the cards say what they pay); `output.factors` and `MELEE_FACTOR` fold into their profiles' `k`.
- **The profiles** are `cards.profiles`; each names its pair, its pin, its column and the grade it reads (`--tables profiles`). New rows: `bow`, `thrown`, `guard`.
- **What each card says, door by door,** is the core files' `attributes.<id>.card` and the alpha's `ladders.<alpha>.card` (02, 03, 04): they reference the slopes here and type none of their own.

## 5. Character HP (ruling A5): `scale.hp`

`hp.formula` with `hp.base`, `hp.per_end`, `hp.per_level` and `hp.pt_pct`; perks and traits through `fx('hp')` as today; the numbers move from code (`character.ts:801`) to data (`hp.data`). *Reasons: about four Soldier hits for the frail at level 1 and twice that for the hardy (the charter); every Pain Threshold point is the same share of the bar at every level and from the first point.* `--tables hp` prints the builds.

## 6. MP and every cost (ruling A6): `scale.mp_pool`, `scale.costs`

**The pool:** `mp_pool.formula`, its numbers moved from code (`character.ts:861`) to data. *Reason: about four full cash-outs a pool at every level, so a Syphon, a design's size and the MP left are a real choice at level 1, 10 and 20.*

**One rule a currency** (`costs.rules`): **clock** (AP never scales); **count** (plates, chain, pips, Shadow, glyphs, charge, cores, Flux, Strain, Echo, Devotion: the pool grows by points, the bill by what you build); **design** (an Outburst's parts are flat MP; a Pump is `costs.pump_share` of the Begin); **mp** (every other MP price is its number times `mp` at the payer's level); **share** (HP you pay yourself: `costs.shares`); **deal** (HP you deal to someone else: times the factor on the dealer's column). *Reason for the shares: a price in blood costs the same share of your bar at every level and for every build.*

Every cost a door, class, perk or item names carries `"cost": {"rule": <one of these>, ...}` (SCHEMA 3.3); its number is its owner's file.

## 7. A plate and armour: `scale.plate`, `scale.armour`

**One plate soaks `plate.formula`**: the soak (`techniques.json:38` `rules.guard.soak`, times the factor) on the `guard` profile, `deal` and the worn armour's grade, then the Guard door's beta feed (`body.json`), read at the one site (`guardSoak`, `physical/core.ts`) by the soak and the Slam. *Reason: a plate is what the wall is made of: the door's attribute and alpha make it thicker, as every card makes its door bigger, and its armour's grade hardens it.*

**Armour values:** `armour.formula`: the class value (`rules.json` `combat.armor.classes`, times the factor) on `deal` and the grade. **Cover:** `armour.cover`, on `deal` at the fight's level, as objects are. `--tables plate` prints both.

## 8. The grade ladder (ruling A9, ruling 33): `scale.grades`

One row a grade (`grades.<grade>`: damage, to-hit, armour, mod slots, properties), read by weapons, worn armour and a plate, the four foci (Sigils by the Evoker's grade, Outbursts by the Emanator's, Figments by the Visualizer's, Bonds and Tending by the Attuner's: each rarity row's `with_this`, collected by `effects/collect.ts`), and prayer.

- **Prayer's grade** (`grades.prayer`, ruling 33) reads **the highest standing the character has reached** with its patron, so a Miracle's price is paid in Hymn tiers and the next Miracle, not in every prayer's size for twenty hours; leaving the patron or a taboo's fall lowers it. Prayers land, so only the damage multiplier applies.
- **Properties cost no boon room** (`grades.properties_cost_no_boon_room`; 07 owns the slots and properties).
- **Where a grade is found and sold** is ruling 25, written once in `pacing.grades_by_map` (`grades.where_found` points there).

## 9. Margins (ruling A7): `scale.margins`

**The rule:** every full `margins.step` a roll beats the Defense or TN by is a Margin; a natural 20 lands and adds `margins.natural_20` more. Each adds `margins.per` plus `margins.per_perception` a point of Perception **of the plain hit's own damage**: the weapon's or spell's damage before the cash-out factor (for a Line, its Subject glyph's: critic-consistency-2 1.18). **Margins add to the cash-out factor, they do not multiply it** (`stack.formula`). A landed action (a prayer, a heal, a Smite, a Slam's push, a Snap) has no roll and no Margins.

- **Where the engine resolves it:** the judge of every d20 (`packages/engine/src/rolls.ts:78`; its result already carries `total`, `tn` and `nat`) gains `margins`; its damage term goes where the critical term is pushed today (`combat.ts:1542-1544`), the same at a Sigil's roll and an Outburst's Bolt and Lance. A check against a TN reports its Margins (the Narrator reads "beat it by 8" as degree). Enemies get Margins as characters do.
- **What goes:** `margins.goes`. Every perk, move and gear field that fed the critical is restated in `gear_perks.margins_feeders`.
- **The reading of "25% to 35%"** (`margins.reading`) is this draft's; **for the lead** (critic-consistency-2 2.6).
- `--tables margins` prints the expected worth of one attack in plain hits by to-hit and Defense. *Margins make a skilled attacker about a third faster against a weak foe and change little against an Elite or a Boss: the reward Law 2 names, not taken back in the enemy HP column.*

## 10. The stack rule and the top of the scale (ruling A8, F29, F30): `scale.stack`, `scale.digits`

**`stack.formula`**: the level column, the Stat term (one pair), the grade and the cash-out factor (with Margins added to it) multiply (`stack.multiplies`); **everything else adds into one sum** (`stack.adds`), held at `stack.sum_floor` at least, with no top. *Reason a player sees: the things that make a character bigger each multiply, so each is felt in full; everything else adds, so a seventh perk is worth what its card says and the sheet can never run away.* In code: `stackDamage` (`output.ts:131`) multiplies the first kinds and adds every other term; today's `ctx.mults` that are not one of the multiplying kinds (Pain Eater, the ambush, Weakened, technique, ammunition) move into the sum, and `VS_CAP` goes.

**Scope (ruling 30):** `stack.scope`: a cash-out counts only its own door's sum terms, plus one mark on the foe (`stack.scope.foe_mark`), one mark at a time. Every sum term in the bible names its door (SCHEMA 1.4), so the checker can add each door's own.

**The top of the scale is a check, not a table.** Check (a) computes for each of the nine doors, from its core file: a level-1 specialist's plain hit (`digits.l1_specialist`, `digits.plain_l1`), a level-20 specialist's plain hit (`digits.l20_specialist`, `digits.plain_l20`), the door's full cash-out at level 20 with nothing but its ladder in Relic (`digits.full_cashout_l20`), and **the largest legal turn** at level 20 with everything ruling 29 lists (`digits.largest_turn_l20`): the Bite, the forks (the best of each pair), perks at tier II, class moves, the Celestial grade, Margins from the best legal to-hit (the skill modifier at 10, the grade's to-hit, the best level gap that still takes a real hit, and every to-hit term of the door) against the lowest Defense in `world.tiers`, the Push, and the mark. Bites and fork numbers are set door by door from its result (ruling 29); the second critics' six-digit turns (the Break, the Coup, the Line, the Release) and Snap All's Relic total are the first readings it must clear.

## 11. The enemy columns read back: check (b)

Check (b) reads `world.stated_attacker`'s builds (their points from `pacing.gates`, their grade one under the finds grade of the map where the squad stands, `pacing.grades_by_map`, their ordinary sum `world.stated_attacker.ordinary_sum_per_level`) against same-level foes at levels 1, 5, 10, 15 and 20, and a Soldier against `world.stated_defender`'s frail and hardy builds; it fails a fight under `world.stated_attacker.min_exchanges` hits. `--tables hits` prints the grid. The second draft's reading stands until `world.json` lands: **a two-handed Strength specialist drops a same-level Soldier in under two blows at every level**, which is 06's call on the tier rows (the columns do not cancel it, by A1's rule that only named changes move a count).

## 12. The engine's caps (ruling A10): `scale.caps`

`caps.items` lists each cap with where it is today (`file:line`), the ruling (remove, replace, keep) and the reason. In short: the pooled target-bonus cap, the critical cap, the dead Sigil cap, the half-bar heal cap, the unread reduction cap and reference HP go; the opener's cap and `elite_up` are replaced by Reach and the map's own levels; everything a player sees as a rule stays (the boon cap with 07's change, the start boon and shrine token worths, the variant worth, the finds' ceiling, the budget bands, the camp budget, the Devotion caps, the elemental and ambush caps, and the structural rules). `--tables caps` prints it.

## 13. Migration

**One owner, one stamp** (ruling 39): `pacing.migration` (05). What the scale moves in a save is two of its rows: a character keeps **the same share of its new max HP** as it held of the old one, and the same share of its new MP pool (through the existing `migrateCharacterHp`, `character.ts:810-816`, and `migrateCharacterMp`, under the one revision). A run saved between nodes holds no unit and is safe. A room saved in the middle of a fight before 0.34 is ruling E's: the builder proposes rescale-on-load or reopen-the-fight (`migrateCombatHp`, `game.ts:508-518`, today scales every unit's HP, max, shield and armour) and the lead approves it before it is built. Replays and event logs re-run the reducer, so every number in them moves.

## 14. Defects found on the way (for the lead; not the scale's to fix)

1. **Two copies of the Damage school's base:** `soul_modules.json` `damage.base` (read, `magic.ts:752`) and `schools[damage].damage` (a fallback never reached). One goes.
2. **Numbers typed in code:** max HP and Pain Threshold's per-level HP (`character.ts:801`, `hpPerLevel`); max MP (`character.ts:861`); `syphonMult`'s slopes; the critical's constants (`character.ts:853`); "Bleeding: 5 damage a turn" (`character.ts:775`); `armor_ignore_5` and `armor_ignore_10` read as numbers in their names (`combat.ts:1562`); the glossary's Strain line (`glossary.ts:99`).
3. **Digits typed in data texts:** the prayer texts with numbers (`patrons.json`) and `rules.json:1486` "8 true damage per point over the limit"; they must read their rows (`tools/text_numbers.py`) or they lie after the rescale.
4. **Item ids in code:** `tactics.ts:420-428` switches on `smoke_grenade`, `flashbang`, `bot_scrambler` on the thrown path the rescale moves to `deal()`; under no-rebuild rule 2 they move to the rows' `effects` in the same change (critic-consistency-2 6.4).
5. **A stale comment:** `output.ts:15` says the `deal` column is "x1 at every level today".
6. **The attribute cards' texts disagree with the engine today** (`attributes.json`): they are rewritten from the core files' cards.

## Questions for the lead

1. **The heal column** (section 3): confirm `columns.mend` (the normal bar's growth) in place of ruling A2's "x65" (critic-consistency-2 2.3).
2. **Margins' "25% to 35%"** (section 9): `per + per_perception x Perception` (26% to 35%, this draft) or `per_perception x (Perception - 1)` (25% to 34%)? (critic-consistency-2 2.6)
3. **Does A1's "one or two digits at level 1" cover cash-outs?** `digits.plain_l1` tests plain hits only; a level-1 Coup or Break shows three digits (critic-consistency-2, the note outside the five kinds). Recommended: plain hits only, as the check reads it.

## Built from

| Rule or number | The existing piece and data key that carries it | What must change |
| --- | --- | --- |
| The factor (A1) | each file's own keys (`--tables factor`, `--tables weapons`) | the numbers; the computed own factors; the draw bows' `phys.also_scales` |
| The level columns | `levelFactor` (`effects/output.ts:111-117`); `rules.json output.level` | `deal`, `mend`, `mp` from `scale.columns`; `scaleOf` reads `deal`; the `scale` array and every profile's `level: scale` go |
| The heal gate | `mendGate` (`output.ts:264`); `rules.json mending.gate.hp` | the normal bar at level 1, times `mend` |
| An amount's column by kind and dealer | `openAmount` (`effects/amounts.ts`), `levelOf` (`output.ts`) | the thrown, barrel, trap and hazard paths go through `deal()` |
| Enemy columns | `levelled` (`data.ts:116-120`); `enemies.json levels.table` | the rows from `scale.columns`; the tier rows from `world.tiers` |
| Figment HP | `figments.json level.hp` | reads `enemy_damage`; `figment_hp` on the card rule |
| The cards (A4, 31) | `statTerm`, `normalShareTerm` (`output.ts:87-100`), `weaponMult` (`character.ts:833-837`); `output.profiles` | the attribute bracket times the skill bracket; `k` from `scale.cards.profiles`; new rows `bow`, `thrown`, `guard`; `elemental`, `output.factors` and `MELEE_FACTOR` go |
| One pair to a hit | `statOf(profile, c, pair)` takes a pair today | a cash-out's action names its door's pair (extension 1 below) |
| Character HP (A5) | `maxHp`, `hpPerLevel` (`character.ts:801`), `fx('hp')` | numbers into `attributes.json endurance.derived` and `skills.json pain_threshold numbers.hp_pct` |
| MP and costs (A6) | `maxMp` (`character.ts:861`), `syphonMult`, `pumpMp` (`magic.ts:793-807`), the cost site (`effects/cost.ts`), `STRAIN_BURN` (`magic.ts:734`) | the pool into data; MP prices times `mp`; self-paid prices as shares |
| A plate | `guardSoak` (`physical/core.ts:121`); `techniques.json rules.guard.soak` | the `guard` profile, `deal`, the armour's grade |
| Grades (A9, 33) | `att.dmgMult` (`combat.ts:1536`), `bodyArmourValue` x `armOf` (`character.ts:796`), `focusRarity` (`character.ts:1086`), `with_this` (`effects/collect.ts:220`); `rules.json rarity` | `dmg`, `arm`, `acc` from `scale.grades`; each row's `with_this` for the foci; prayer by the highest standing reached |
| Margins (A7) | the roll judge (`rolls.ts:78`); the critical term sites (`combat.ts:1542-1544`, `sigil.ts:334-339`, `classes/soul.ts:36-39`) | S1; `rules.json rolls.margins`; the critical's constants go |
| The stack rule (A8, 30) | `stackDamage` (`output.ts:131-134`), `ctx.mults`, `ctx.vs` | terms pushed by kind into the two existing buckets (critic-consistency-2 5.2: no `Term.kind` needed); `VS_CAP` goes; Margins add to the cash-out term; each sum row names its door |
| Caps (A10) | `VS_CAP` (`output.ts:129`), `SIGIL_CAP` (`sigil.ts:329`), `mending.cap_pct` (`rules.json:1590`), `reduction_cap_pct` (`rules.json:23`), `reference_hp` (`rules.json:1791`), `max_pct` (`techniques.json:285`), `elite_up` (`survival.json:61`) | as `scale.caps` |
| Migration | `migrateCharacterHp`, `migrateCharacterMp`, `migrateCombatHp` (`game.ts:508`) | rows of `pacing.migration`; ruling E's option once approved |

## Needs a new primitive

From the merged list (critic-consistency-2 section 5); general pieces only.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S1. Margins** | the roll judge returns `margins` (+ the natural 20's on a critical); the attack and spell contexts carry it; its term adds to the cash-out term; numbers in `rules.json rolls.margins` | nothing counts how far a roll beat its target (`rolls.ts` knows only `nat`; the attack only `crit`) |
| **S17. A standing predicate** (`self_devotion`, the highest standing reached) | one predicate, read by the rarity rows' Devotion effects | no predicate reads Devotion's standing |
| Extension 1: **an action's pair** | an amounts block or a cash-out row may name `pair`, passed to `statOf` in place of the weapon's | `weaponMult` reads only the row's pair; `statOf` already takes one |

(S12 "stack kinds" is dropped: the two buckets exist, critic-consistency-2 5.2.)

## What re-records

| What | Why |
| --- | --- |
| Every golden damage table (`test/golden/builds-allin.json`, `builds-normal.json` and the tables behind `golden-damage*.test.ts`) | every base times the factor, the multiplied cards and `k`, the columns, grades on damage, Margins, the stack rule |
| `golden-conditions.test.ts` | ticks times the factor, on the dealer's column |
| `golden-costs*.test.ts` | MP prices on the new pool and `mp`; self-paid prices as shares |
| `golden-itemops`, `golden-mods`, `golden-rules`, `rules-enemies` | amounts; the rarity rows; the enemy table and tier rows |
| `enemy-levels.test.ts`, `level-gains.test.ts`, `levelup-revert.test.ts`, `fx-hp-stamp.test.ts` | the enemy table; max HP by level |
| `heal-pct.test.ts`, `rules120-heal-shield.test.ts`, `bond-heal-shown.test.ts` | `mend`, the gate, the heal cap removed |
| `figments*.test.ts` | forms, `level.hp` on `enemy_damage`, the figment factor folded |
| `sigil-balance.test.ts` | it asserts `SIGIL_CAP` (removed): deleted with it |
| the Outburst, Sigil and faith suites that assert a number | bases, the cards, Margins, the grades on foci and Devotion |
| `test/old-save.test.ts` and its fixtures | the migration's rows (one fixture each) |
| `test/replay-hash.test.ts`, `golden/replays.json` | every seeded game |
| `packages/engine/test/balance/` | readings: every number they print moves |
| `tools/check_spec_tables.py`; `tools/text_numbers.py` and `test/datatext.test.ts` | the spec's tables first (spec, then data); every text reads its row |
| The web and e2e suites that read a number on screen | HP bars, damage lines, the critical's label (now Margins) |
