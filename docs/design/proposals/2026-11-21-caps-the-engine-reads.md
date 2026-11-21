# The caps the engine reads (21 Nov 2026, for the lead)

Written by the ceilings deletion (rules 1.94; Leon, 21 Nov 2026: "delete all the ceiling in the data and balance like a game designer would"). That pass removed the balance contract (`rules.json balance`: the ceilings, tolerance, ratio and the budget rule) and every test that failed on a line. It changed **none** of the caps below: each one changes what the game plays, so each is the lead's to keep, move or delete in the progression redesign (`docs/design/proposals/2026-11-21-the-curve.md`).

Line numbers are at the deletion's commits on `release/0.34-final`.

## Limits a reward (the cap is there to hold a number down)

| Cap | Where it lives (data) | Where the engine reads it | What it limits |
| --- | --- | --- | --- |
| Target bonuses capped at +100% (`VS_CAP` 1.0) | none: a constant in code | packages/engine/src/effects/output.ts:129, :132 (the multiplier); combat.ts:1558 (the "capped at ×2" label) | Every "against this target" bonus adds together and stops at ×2 (e.g. Marked, a flank bonus, a perk against a tier) |
| Critical multiplier at most ×2.0 (`CRIT_MAX`) | none: a constant in code (`CRIT_BASE` 1.5, `CRIT_PER_PERCEPTION` 0.03, `CRIT_PER_DEXTERITY` 0.02) | packages/engine/src/character.ts:853 (`critMult`); combat.ts:1540-1542 (an item's bonus inside it); perks/c.ts:441 (Tunnel Vision's +25% inside it); classes/soul.ts:39 and `spellCritMult` (a spell's critical) | The critical: Perception, Dexterity, perks, traits and gear together never past ×2.0 |
| `SIGIL_CAP` 350, `SIGIL_CAP_CRIT` 500 | none: constants in code | packages/engine/src/sigil.ts:329 (exported through magic.ts:646); `capParts` returns its parts unchanged since rules 1.17 | Nothing today: dead constants of Leon's 8 Nov targets (balance-targets.md). Kept only because removing an export is a code change outside this pass |
| The boon cap 50 (`BOON_CAP`, "run power a character may carry") | data/survival.json:219-223 `boon_cap.cap`; every boon, relic property, graft and shrine token's `worth` (53 fields) | packages/engine/src/run/power.ts:25, :49 `capRoom`, :52, :78; give.ts:78 (a Give refused: "boon room left"); game.ts:3487, :3553 (the log line); run/progress.ts:131, :151, :343; run/placeview.ts:58 (the shown "left") | How many boons, Relic properties and the graft one character holds in a Survival run; a Give or a pick past it is refused |
| The starting boon's worth at most 6 | data/survival.json:322 `start_boon.max_worth` | packages/engine/src/run/stage.ts:62 `START_BOON` | Which boons the camp offers as the first one |
| A shrine token's worth at most 8 | data/survival.json:438 `shrine.token_max_worth` | packages/engine/src/run/progress.ts:48, :343 | Which boons a shrine offers as its token |
| A variant's modifiers at most 20 worth | data/variants.json:8 `worth_cap` (each form's `worth_per`) | Not the engine: tools/validate.py:3467-3468 and its per-row check fail a variant over it; packages/engine/src/variants.ts:52-72 sums `variant_worth`, credits.ts:66 prices with it | How far a named weapon variant may move from its base (and its price, base x (1 + worth/100)) |
| The stage's pick grade ceiling | data/survival.json:147 `rewards.ceiling` ["fine", "masterwork", "relic"] | packages/engine/src/run/rewards.ts:156 `stageCeiling`, :160; :81 (the vault's grade) | The best grade a reward roll can give at stage 1 / 2 / 3+ |
| The vault's grade at most Relic | data/survival.json:580 `vault.grade_up` 1, `grade_max` "relic" | packages/engine/src/run/encounter.ts:44 `VAULT`; run/rewards.ts:81 | The vault chest's pick grade |
| A mod reward priced within 0.5 of the band | data/survival.json:149 `rewards.mods.band` | the rewards roll (run/rewards.ts, through `rewards.reads`) | Which mods a reward may offer |
| The fight budget's bands (bulk ±15%, pressure +10%, at most N foes) | data/survival.json:63-69 `bulk_band`, `pressure_band`, `max_foes`, `pressure_per_char` | packages/engine/src/run/encounter.ts (`composeEncounter`, `anchorDamage`); asserted by test/survival-encounter.test.ts (the generator honouring its own data, kept) | How hard a generated fight may be for the party |
| Elites and Bosses at most 4 levels up | data/survival.json:61 `stage.elite_up` {per 2, max 4} | packages/engine/src/run/encounter.ts:70 `eliteUp` | How far the Elite and Boss pull ahead of the party by stage |
| The camp budget 300 | data/survival.json:42 `loadout.budget` | the camp (run/loadout.ts); tools/validate.py:2821, :2871-2873 fail a fixed stock id priced over it | What a character buys at the camp (Leon: "the budget stays 300", 19 Nov) |
| A melee opener's bonus at most +50% | data/techniques.json:285 `max_pct` (per_tile_pct 10, min_run 3) | packages/engine/src/physical/melee/openers.ts:86 | Charge-style openers: +10% a tile, to +50% |
| A single heal at most half the target's max HP | data/rules.json:1590 `mending.cap_pct` 0.5 | packages/engine/src/effects/output.ts:256, :281, :291 (`MEND_GATE`; a Miracle is `uncapped`) | Any one heal (a shield has no cap) |
| Devotion XP caps (2 a fight, 2 a scene, 6 a session; the Narrator's +10 a session) | data/patrons.json:48 `tag_caps`, :56 `session_gain_cap` | packages/engine/src/faith.ts:95 `TAG_CAPS`, :97 `NARRATOR_XP` | How fast a patron's standing rises |
| Elemental damage taken at most 80% resisted | data/rules.json:857 `combat.elemental_taken_cap` 0.8 (Leon, 19 Nov) | packages/engine/src/data.ts:85 `ELEMENTAL_CAP`; effects/damage.ts:81 | Elemental resistance stacking |
| Ambush damage taken at most 60% | (the sheet's `ambushTakenPct`) | packages/engine/src/effects/damage.ts:81 | Ambush resistance stacking |

## A structural rule a player sees (the cap is part of how the game reads)

| Cap | Where it lives (data) | Where the engine reads it | What it limits |
| --- | --- | --- | --- |
| The Elite and Boss guard: no single character action takes an Elite or Boss of the character's level or above from full HP to nothing (left on 1 HP; a Miracle and an execution are past it) | data/enemies.json:203 `levels.gap.full_hp_guard` | packages/engine/src/combat.ts:752 `BOSS_GUARD`, :763-790 (the guard and its log line); sigil.ts:348 `lineGuards`, :1070; faith.ts:1053 (the Miracle) | One-shotting a Boss (Leon, 12 Nov 2026). Asserted by test/balance/magic-measure.test.ts and shadow-measure.test.ts (kept in the default run) |
| The level gap: an enemy 5 or more levels below dies in one hit (never an Elite or Boss); the gap read at most 5 levels | data/enemies.json:200 `one_hit_levels_below` 5, :202 `max_levels` 5 | packages/engine/src/combat.ts:736, :742 | Fights far below the party's level |
| AP: 9 at most, 2 at least, perks +3 at most a turn | data/perks.json:10-14 `rules.ap_ceiling`; data/rules.json:493 `ceiling` 9 | packages/engine/src/effects/ap.ts:16, :20 (`AP_MAX`, `PERK_AP_CAP`) | A turn's AP |
| Attribute and skill caps: skill <= attribute <= 10; an attribute 7 at creation, 8 / 9 / 10 from levels 3 / 6 / 9 | data/rules.json:193 `cap_at_creation`, :218, :249 | `attrCapAt` and creation (character.ts) | Building a character |
| Echo at most 3 | data/rules.json:117 `echo.max` | the Echo pool | Rerolls |
| The Strain limit (3, +1 at Composure 1 / 2 / 4 / 6 / 8) | data/soul_modules.json:63 `strain.limit` (Leon's ruling, item 5539) | character.ts `strainLimit`; magic.ts:722-735 (the burn over it) | How far a heart is pushed before it burns |
| Light armour's cap (Forlorn Hope: "your armour counts as at most Class I's") | data/rules.json armor.classes, the `light_cap` row | packages/engine/src/character.ts:789 `LIGHT_CAP`; perks/b.ts:710 | One trait's armour |
| Damage reduction at most 60% | data/rules.json:23 `reduction_cap_pct` 60 | no reader found in packages/engine/src (not verified that it is used) | Reduction stacking, if read |
