# The growth bible: the one list of new general engine pieces (0.34 rebalance, closing pass)

Merged from the "Needs a new primitive" tables of 01 to 07 and critic-consistency-2 section 5. **This file supersedes those tables**: where one of them and this list disagree, this list wins, and a builder reads only this one. Under the no-rebuild rules (CLAUDE.md, Leon 14 Nov 2026), **no piece here is built until the lead approves it**, after checking `docs/ENGINE-HOOKS.md` once more for a piece that already does it. Every piece generalises an existing one; none is a per-door or per-item handler. Each carries no number: the numbers are the bible JSON's (`tools/balance/bible/*.json`), and through the build, `data/`'s.

Line numbers in `docs/ENGINE-HOOKS.md` and in code were read in `E:/phc-wt/rel030` on 21 Nov 2026.

## 1. New pieces (13)

| # | Piece | Smallest form | The existing piece it generalises | Bible entries that use it |
| --- | --- | --- | --- | --- |
| S1 | **Margins** | the roll judge returns `margins` (each full `scale.margins.step` over the Defense or TN, plus `natural_20` on a natural 20); the attack and spell contexts carry it; its term adds to the cash-out factor (`scale.stack.formula`'s `per * m`); numbers in `rules.json rolls.margins`. The stats `crit_damage` and `crit_taken` are **renamed** `margins` and `margins_taken` (the stat list does not grow) | the critical term sites: `critMin` (`combat.ts:1644`), `critMult` (`character.ts:853-855`); the stats `crit_damage`, `crit_taken` (ENGINE-HOOKS:561-562); the `attack_roll` hook (ENGINE-HOOKS:345) | `scale.margins`, `scale.stack`, `scale.caps.items.crit_max` (goes); every cash-out with `rolls: true` in body, mind, soul; `mind.attributes.perception.card`; `gear_perks.margins_feeders` (every feeder); `world.stated_attacker` |
| S2 | **The door ladder** | rows `{points, reach, bite, needs}` read for any door's alpha, the `needs` gate of ruling 13 checked against the family's skills | `ladderAt` (`figments.ts:45`) and `holderNumber`'s door-ladder reading (`effects/actions.ts:74`; ENGINE-HOOKS:878) | `attributes.<attr>.ladders.<alpha>.points` in body, mind and soul (all nine doors' Reach and Bite) |
| S3 | **The cash-out source** | `cash:<res>` = S(n) of the units an action spent (`scale.cash_out.sum_formula`), and `cash_share:<res>` = S(n) / n; a `keeps` key leaves units behind (each beta's point 10) | `sourceOf` / `SOURCE_SPACES` (`effects/triggers.ts:356, :373`; ENGINE-HOOKS:642-643) | `scale.cash_out`; every `door.cashouts.*.formula` (Slam, Coup, Run Through, Cleave, Break, Takes, the Break of Shadow, Evoke, Curtain, Snap and Snap All, Release, Hymn); the betas' point-10 keeps; the Breaker's Launch and Measured Blow; the Bulwark's Retort |
| S4 | **Keyed Marks** | the drill bar keyed `weapon:`, `door:`, `form:`, `word:`, `feeling:`, its thresholds from the track's row in data | `drillMarks`, `addDrill` (`physical/data.ts:123, :140`); the `drill` event (ENGINE-HOOKS:1626) | `door.marks` on all nine doors; `body.drill`; `pacing.door_marks`, `pacing.tracks.drill`, `.form_marks`, `.word_marks`; the calendar's Mark streams |
| S5 | **`res_max:<res>`** | one stat family that is a pool's top: written by S2's Reach, +1 for one action by a Push condition; readable as a number source | `ties_max:<kind>` (`tieCap`, `kit.ts:204`; ENGINE-HOOKS:617, :990) **and** `setResMax` (`effects/cost.ts:118`; ENGINE-HOOKS:738), which `self_res {at: "max"}` already reads (ENGINE-HOOKS:151) | every `door.push` (the nine Pushes); Last Shade (mind perception); the stage cap (soul determination); Grace's cap (soul virtue); the Bond cap (soul insight); Brace and Reforge reading your Reach (body endurance class) |
| S6 | **`wear:<res>`** | one stat family read at each wear site, answered by `stat_mod` with `context` on a move's row | `stat_mod`'s `context` (ENGINE-HOOKS:223); today's typed exceptions `guardUp`, `DECAY` (`physical/rules.ts:62-75, :116`), `pressureFilter` (`links.ts:181`) | every `door.keeps_tags` (body, mind, soul); Momentum's Mark II; Shadow's Mark II |
| S7 | **`growthWorth`** | `growthHeld` as a factor: 0 on the field and in a dry run, whole out of a fight, else the worth by the level gap, x `party_pace` for practice and Devotion only (ruling 37) | `growthHeld` (`effects/hooks.ts:37`; ENGINE-HOOKS:818) | `pacing.xp.worth`, `pacing.xp.party_pace`; every Mark and practice stream in `pacing.calendar` |
| S9 | **Firsts** | a keyed set on the character with a load default (`sigil:<sorted words>`, an Outburst design's key) | the felt list (`m.feelings`; the `felt` event, ENGINE-HOOKS:1634) | `mind.attributes.intelligence.door` (the found-spell book); `pacing.tracks.found_spells` |
| S10 | **The resource `grace`** | one row in `data/actions.json resources`; its top is `res_max:grace` (S5) | the resource list (`RESOURCES`, ENGINE-HOOKS:524, :735) | `soul.attributes.virtue.door` (prayer's in-fight counter, ruling 19) |
| S11 | **The stat `begin_stage`** | one line in `STATS` | `momentum_start` (`effects/stats.ts:68`; ENGINE-HOOKS:607), its twin for the heart | `soul.attributes.determination.class` (the Channeler's rebuild), `.door` |
| S13 | **`crit_range`** (merged with 02's "natural-20 range") | a gear field with `_modes`, read once at the attack roll: a natural at or above it lands as a natural 20 (two Margins). `aimed_crit_min` becomes it. Drill Mark III ("a natural 19 lands as a natural 20 with this weapon") is the same field set by the Mark: **one piece, not two** | the weapon op `aimed_crit_min` (ENGINE-HOOKS:287) and `critMin` (`combat.ts:1644`) | `gear_perks.margins_feeders.crit_ranges`; `gear_perks.signatures.revolvers`; `body.drill.gifts.III` |
| S14 | **`targets.past`** | a bool on a `line` target set: the units past the struck one | `TargetSet` / `selectUnits` (ENGINE-HOOKS:647, :651) | `gear_perks.signatures.anti_materiel` |
| S15 | **`GearState.props`** | a list in place of `prop`, migrated on load (a Celestial holds two) | `GearState.prop` (`character.ts`; ENGINE-HOOKS:1516), `setGrade` (ENGINE-HOOKS:1310) | `scale.grades.relic`, `.celestial`; `gear_perks.grade_rows.props_list`; `gear_perks.properties` |
| S17 | **`self_devotion`** (a standing predicate) | `{self_devotion: n}`: the highest standing reached with the patron is at least n (ruling 33) | none reads standing; the stat `devotion_xp` exists (ENGINE-HOOKS:542) | `scale.grades.prayer.reads`; `soul.attributes.virtue.door`, `.ladders`; `pacing.tracks.devotion.grade`; `pacing.migration` |
| S18 | **A condition `slot`** | `slot: "mark"`: a condition put into a filled slot replaces the one there (one mark on a foe, ruling 30) | the `condition` op's `stacks: false` (same condition only; ENGINE-HOOKS:175, :228) | `scale.stack.scope.foe_mark`; `mind.attributes.expression.door` and `mind.attributes.perception.class` (the Operative's Mark); `soul.attributes.insight.class`; `gear_perks.mastered` (Judgement Day, True Name) |

## 2. Extensions (one key or one parameter of an existing piece; no closed list grows)

| Extension | The piece | Bible entries |
| --- | --- | --- |
| An action's **pair** | `statOf(profile, c, pair)` (`effects/output.ts:100`; ENGINE-HOOKS:674): an amounts block or a cash-out row may name `pair` (ruling 31) | the Break reading Perception and Ingenuity (mind perception); every cash-out's one pair |
| **`feed_flat`** | `doorFeed` (`effects/feed.ts:37`): `1 + feed_flat x B + feed x A x B` (ruling 20) | the nine betas' `feed_flat` (body, mind, soul ladders) |
| **A sum term's scope** | `stackDamage` (`effects/output.ts:131`; ENGINE-HOOKS:679): each term states `door: <id>` or `scope: plain` with `hits`; read with S3 (ruling 30) | every `sum` and `to_hit` term in body, mind, soul, gear_perks (checked by `check.py`'s bad-terms failure) |
| `foeLevel`'s body, `fightLevel`'s place level; `levels.fight_level_from` | `foeLevel` (ENGINE-HOOKS:1196) | `world.levels` |
| `from_stage`, `pressure_kind`, the map term's `from` | `budgetFor` (`run/encounter.ts:92`; ENGINE-HOOKS:1200) | `world.budget`, `world.maps` |
| `pressure_off` on a tier row | `pressureCap` (`physical/pressure.ts:15`) reading the best Reach laid | `world.tiers`, `body.attributes.agility.door.cap` |
| `armGuard` reads door blocks; `armDoors` faith by the highest | the enemy arming in `run/encounter.ts` | `world.tiers`, `world.endless.kits` |
| `stageCeiling(stage, purpose)`; the grade step to the same grade (the re-forge) | `stageCeiling` (ENGINE-HOOKS:1235), `priceOf` (`credits.ts:51`; ENGINE-HOOKS:1253) | `pacing.grades_by_map`, `pacing.credits`, `gear_perks.grade_rows` |
| `tallyOf`'s stage scope; `levels.gains.by_level` | the tally and the level gains | `pacing.levels` (ruling 12's swap) |
| Saved fields with a load default: `capGrace`, `rankHeld`, `reachHeld`, `movesHeld`, `pointsOwed`, `respend` | the migration chain `migrateLoaded` (`game.ts:527`) and the `migrateCharacter*` family (`character.ts:810-1507`) | `pacing.migration` (one stamp `GROWTH_REV`, ruling 39) |
| `forge_fit_rate`; `with_this` on worn armour; `FITS` armour; `extraSlots` reads the grade; `gearNum` reads the carried list; `families.json signature`; `rarity.masterwork.default_slot` | `gearNum` (ENGINE-HOOKS:1312), the rarity rows, the mod slots | `gear_perks.signatures`, `.grade_rows`, `.mods` |

## 3. Dropped (asked for once, done by an existing piece)

| Asked | Why it is not built |
| --- | --- |
| S8, the `attr:` source | `skill:` and `holderNumber` already read a character's numbers (critic-consistency-2) |
| S12, stack kinds | `stackDamage` already has the two buckets (multiply, add); only the scope extension is new (critic-consistency-2 5.2) |
| S16, the `injure` op | Overbrace's price is Bleeding (ruling 34), an existing condition |
| `res_start:<res>` | a Mark I's start unit is the `resource` op on `combat_start` (ENGINE-HOOKS:174) |
| a `practice_rate` stat | no bible entry sets one; S7's worth and `party_pace` carry every rate (05 corrected) |
| 02's "a pool's max as a source" | it is S5 read as a number source |

## 4. For the lead

1. Approve each of S1 to S18 above before it is built (no-rebuild rule 1). Every one generalises the piece named; none adds a per-item branch.
2. S13 now carries drill Mark III (02 named it "for the lead" as a separate natural-20 range). If the lead refuses S13, Mark III falls back to "+1 to hit more with this weapon" (a `to_hit` term), and the revolvers' signature and `aimed_crit_min` stay as they are.
3. The consolidation pass (no-rebuild rule 4) reads the diff of `docs/ENGINE-HOOKS.md` after step 2 and after step 5 of `09-build-order.md`.
