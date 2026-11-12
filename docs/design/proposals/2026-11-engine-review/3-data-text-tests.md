# Engine review 3: the data pack, the texts and the test estate (12 Nov 2026)

Read-only review at commit `2f66b2c` of `data/*.json` (23 files, 1.33 MB), every place a rule number is written
(data text, `rules.json`, the spec, CLAUDE.md, the glossary, the Narrator prompt, client strings), and the tests
(`packages/engine/test`, `apps/web/src/**/*.test.*`, `apps/web/e2e`). One lens: **a number that lives in more than one
place, and a test that has to be rewritten when a number moves.**

**How this was done, and its limits.** Reading, grepping and small Python over the JSON; the scripts' patterns are
named with each count, so a count is exact for its pattern and a floor for the problem. Both unit suites were run once
to time them, after the browser run of 02:56 had ended (a single `tabs` rerun started while the engine suite was
running; say so if that rerun looked odd). No browser suite was run by me: their times come from the log times of that
02:56 run. Where a line is a judgement or an estimate, it says "estimate" or "guess".

Sizes as in review 1: **S** = one sitting, under about 300 changed lines; **M** = 300 to 1,500 lines over 5 to 15
files; **L** = more. Risk = the risk of moving a number, or of losing a check that was catching something.

---

## 0. The verdict

1. **The data pack is not the source of the engine's numbers. It is one of four copies.** For 223 perks, traits and
   class moves the item's hook says `claims: 'all'` and never reads its own `effects` (0 reads in `perks/a.ts` to
   `h.ts`, `classes/j.ts`, `k.ts`, `rev3.ts`; 1 each in `perks/c.ts` and `classes/i.ts`). The number is a TypeScript
   literal; the `effects` array in the JSON is a description nobody executes; the card `text` is a third hand-written
   copy; the spec is a fourth. 96 of the 192 declared effect ops (225 uses) never appear by name in the engine at all.
2. **`data/rules.json` is mostly a document.** The engine reads six branches of it (`character.creation`,
   `character.levels`, `mana.meter.bands` and `events`, `weapons_rules`, `mending`, `output`). 241 of its 571 distinct
   keys are never named in any source file. AP 6 / 9 / 2, the TN ladder, the armour table, the death save, heat, cover,
   rest, the starter kits: all TypeScript literals, with a copy in `rules.json` that can say anything. Four of its
   blocks already contradict the data or themselves (section 2, C1 to C4).
3. **The spec is an append-only log, not a statement of the rules.** Revisions 1.14 to 1.25 are 1,235 lines appended
   after the body; the body still says the old numbers in at least five places; section 14 is 2,311 lines and 1,109
   numbered items of which nobody can say how many are open (CLAUDE.md says 52). "The spec wins" cannot be checked by a
   person, let alone a tool, while this is its shape. A 25-line prototype checked three spec tables against data
   mechanically (section 3.3): it works.
4. **34 live mismatches today** (section 2), found by sampling, so a floor: 11 in what the game shows or the data says
   it does, 4 inside `rules.json`, 6 in the spec's body, 9 in CLAUDE.md, 4 in engine comments. The one a player can
   read right now: **Heart Surge's card says "past stage 4 it fires at ×2.6"; the engine fires at ×1.8** (two
   revisions stale). And **8 assertions in 6 test lines are dead**: a `//` comment added in the middle of a one-line
   test swallowed the `expect`s after it.
5. **The tests are fast and brittle.** 3,361 engine tests run in 99 s and 989 web tests in 38 s. That is not the cost.
   The cost is edits: 166 older engine test files edited (2,065 lines) across the 11 rules revisions on this branch,
   about 15 files a revision; 23 for one pure number change (rules 1.19), 54 when the map changed size. About 40% of the engine's 13,640 `expect`s compare against a
   number written in the test, and about half of those are tunable rule numbers (estimate from a 78-assertion random
   sample): roughly 2,700 literal balance numbers in tests. The golden tables (5,327 actions, re-recordable in one
   command) already hold exact numbers better than any of them.
6. **The newest systems show the fix is already in the house.** `techniques.json` (65 items) and `calls.json` keep
   every number in a `numbers` block and the engine reads it (`t.num('run_ap', …)`): 1 of 270 keys in
   `techniques.json` and 0 of 52 in `calls.json` are unread, and the `physical/` and `calls/` folders hold about 80 of
   the engine's roughly 1,400 rule literals (`classes/` 404, `perks/` 397). Everything below is "make the old three quarters look like the new
   quarter", plus a guard so it cannot drift back.

---

## 1. Top ten, ranked by pain prevented ÷ (size × risk)

| # | Finding | Evidence | Fix | Size | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | No guard on prose numbers: 1,409 data strings carry 3,331 hand-written numbers | section 2: 34 live mismatches; Heart Surge card ×2.6 vs engine ×1.8 | Validator rule now: every number in an item's text must equal a number in that item's own fields (208 fail today, section 3.1); then placeholders so the text cannot hold a number at all | S, then M | low |
| 2 | Fix the 34 mismatches and the 8 swallowed assertions | section 2, section 5.2 | One commit; a lint test: at most one statement after `//` never happens because tests are one statement a line | S | low |
| 3 | CLAUDE.md restates rules and is wrong in 9 places | section 2, E1 to E9 | Delete the numbers from "The game in one screen"; point at a generated `docs/rules/NUMBERS.md` | S | none |
| 4 | Tests pin data and balance numbers as literals | 166 file edits on the branch; 53 asserts pin a data file's own value; about 2,700 literal balance numbers (estimate) | Rule: a number comes from the data, an engine export or a preview; exact values live only in `golden/`; delete the 53; convert the rest when a revision breaks them, not before | S to start, M over time | low |
| 5 | `rules.json` is 42% unread and contradicts the data | 241 of 571 keys never named in code; C1 to C4 | A `constants` block the engine really reads (AP, TN ladder, armour, kits, death save, heat, rest); delete every branch nothing reads; a test that fails on an unread key | M | low (golden tables hold the numbers) |
| 6 | Perk, trait and class hooks hard-code their numbers; `effects` is decoration | 223 `claims: 'all'`; about 1,400 rule literals, 141 in `classes/k.ts`, 110 in `classes/i.ts` | Each item gets a `numbers` block (as techniques have); the hook reads `h.n.x`; `effects` is deleted where a hook claims it | L | medium |
| 7 | The spec cannot be checked against data | 5 stale body passages; a dead enemy table at line 563; 40 of 60 weapons not in the spec's table | Marked tables checked by `tools/spec_tables.py` in `npm run check`; revisions folded into the body at each merge; section 14 becomes a ledger with a status column | M | low |
| 8 | The validator has no schema and cannot see the engine | 1,407 lines, 346 hand-written rules, 0 unknown-key checks, 0 checks against TypeScript | A vitest `data-contract.test.ts` (ids both ways, unread keys, provisional ledger) and a key whitelist per file | S to M | low |
| 9 | The simulators run inside every `npm test` and there is no standing balance guard | `balance/*` is 91 s of the engine suite's 210 CPU-seconds for 38 ungated tests; 59 env variables | Move the measuring files out of the default run; build `ceilings.test.ts` part 1 (static, under 2 s) now | S | low |
| 10 | Browser suites: half are outside the runner and rot; 1,128 fixed sleeps | 32 of 64 suites in no group; the five stale ones are all among them | Every suite is in a group or deleted (the runner fails on an orphan); a minimal set of 13; rule checks move to unit tests | M | low to medium |

Below the line but worth doing: shelved content (section 4.1), the hand-off pile (section 6), 897 file-local test
helpers (section 5.3), two condition tables (section 2, A4 and B7), no CI at all (section 5.6).

---

## 2. The live mismatches (34, a floor)

Method: (a) every perk tier, trait, condition, technique, Call step and live class move: structured numbers against
the item's own text, both ways; (b) every text number of perks, traits and live class moves against the literals in
that item's hook (601 numbers, 73 not found, each read by eye); (c) the engine's condition table against
`conditions.json`; (d) the spec's weapon, enemy and condition tables against data by script; (e) probes for the old
value of every number that moved in rules 1.15 to 1.25; (f) CLAUDE.md line by line against `rules.json`,
`classes.json`, `patrons.json`, `soul_modules.json`. The 37 rulings still open in
`docs/design/handoffs/text-pass-mismatches.md` are not counted again, except where the wrong field is still in data.

### A. What a player reads against what the engine does (4)

| # | Where | It says | The engine does |
| --- | --- | --- | --- |
| A1 | `data/classes.json`, pool move `channeler.heart_surge` (text) | "Past stage 4 it fires at ×2.6" | `classes/i.ts:1286` `SURGE_PAST` = one more step of the stage table = **×1.8** since rules 1.19 (×2.8 in rules 1.17). The engine's own preview prints the right number because it interpolates the constant; the card is hand-written |
| A2 | perk `case_closed` (card and `perks/f.ts:354`) | "+20% damage" and the code applies ×1.2 | The spec says the +20% is gone (line 2683, and line 2271 takes it off the stacking list). By Leon's rule the spec wins: the card and the code are the bug. Already reported in the text pass; still live |
| A3 | `data/conditions.json` `fear` | The condition is named "Fear" | `magic.ts:101` shows it as "Afraid"; perk cards say "Afraid" |
| A4 | `magic.ts:98` engine line for Silenced | "No Sigils, Outbursts or prayers." | `calls/core.ts` also refuses Calls; the data text says so, the engine's own line (the one a fight shows) does not |

### B. Data fields that say something the engine does not do (7)

| # | Field | Data | Engine |
| --- | --- | --- | --- |
| B1 | trait `mind_without_fog` `effects[0]` | `creation_points`, pool `core`, value 1 | `character.ts:199` `FOG_CORE = 2`, given as Attribute points; the card says 2 Attribute points |
| B2 | `defender.reactive_plate` `uses` | `reaction` | automatic, no reaction (`classes/i.ts`) |
| B3 | `fighter.lunge` `ap_cost` | 0 | the melee attack's AP and 1 Momentum |
| B4 | `adamantile_knight.unbroken` `uses` | `per_scene` | `per_combat`; the card says once per fight |
| B5 | condition `puppeted` `ends_on` | `damage_taken` | nothing ends it on damage |
| B6 | condition `silenced` `effects[0].actions` | draw_sigil, evoke, outburst, pray | Calls too |
| B7 | conditions `guarded` and `inspired` | not in `conditions.json` | defined only in `magic.ts` `CONDS`; the game has two condition tables (34 entries in TypeScript with their own name, family, rounds and text; 40 in data), kept in step by hand |

B1 to B6 are the proof of verdict 1: these fields can be wrong for a week and nothing fails, because nothing reads them.

### C. `rules.json` against the rest of the data (4)

| # | `rules.json` | It says | The truth |
| --- | --- | --- | --- |
| C1 | `classes` | qualify by "sum points in each base class's 3 signature skills"; rank II at 13, III at 18; advanced classes at parent totals 15 and 9 | Class Roster Revision 3, `classes.json` `assignment`: the highest attribute's class; rank II at attribute 5 and level 6, III at 8 and level 12; advanced classes shelved |
| C2 | `perks_rules.acquired` | Mastery 1 take one, Mastery 3 upgrade, Mastered "both at Tier II" | `perks.json` `rules.acquired`: one perk step at each of Mastery 1 to 4 |
| C3 | `perks_rules.achieved` | "Mastery 1 in every listed skill" | `perks.json` `rules.achieved` and `character.ts:996`: Mastery 2 (5 points) |
| C4 | `mana.soul.design.ready_designs` | "2 + floor(empathy/2)" | `rules.json` `derived.magic.ready_designs` and `character.ts:667`: Will Power, at least 3. The file contradicts itself |

### D. The spec's body against the spec's own later revisions (6)

The revision sections are right; the body was not folded.

| # | Line | Says | Since |
| --- | --- | --- | --- |
| D1 | 143 | level gains give "6 Core points, on top of creation's 10, 10 and 6" | rules 1.13: no Core points |
| D2 | 230 | free Pumps "1 a round from Empathy 3, 2 from 7" | rules 1.19: one, never two |
| D3 | 1712 | "A full turn is ×2.0 … reaches ×2.4" | rules 1.19: the table tops at ×1.6 |
| D4 | 1839 | Heart Surge "past stage 4 ×2.6" | rules 1.19: ×1.8 |
| D5 | 1874 | a feeling's step "instead of the plain +0.4" | rules 1.19: +0.2 |
| D6 | 1379 | Silenced: "no Sigils, Outbursts or prayers" | Calls too (rules 1.13) |

Not counted: the enemy table at line 563 (30 / 60 / 100 / 200 HP) is marked "superseded by rules 1.15" and still
printed in full; the current table at line 2927 carries its own patch inside a cell ("960 *(820 since rules 1.23)*").

### E. CLAUDE.md, "The game in one screen" and around it (9)

| # | CLAUDE.md says | Now |
| --- | --- | --- |
| E1 | "Caps: Skill ≤ Attribute ≤ Core ≤ 10" | rules 1.13: `attribute_le_core: false`; a Core shows its highest attribute |
| E2 | Creation: "10 Skill points, 10 Attribute points and 6 Core points … 7/1/1 is legal" | no Core points; an attribute's ceiling at creation is 7 |
| E3 | "a Core point every 3rd level to 18; … 12 Core points in a career" | `core_points.amount: 0` |
| E4 | HP: "(level − 1) × (5 + 2 × Durability)" | Pain Threshold (rules 1.13; spec line 177; `character.ts:588`) |
| E5 | Release "at ×0.6 / 1 / 1.4 / 1.8 / 2.2" (and, three lines on, "stage 0 ×0.8") | ×0.8 / 1.0 / 1.2 / 1.4 / 1.6 |
| E6 | "50 core ops … 82 bespoke ops (~10% of uses)" | 50 core, 113 bespoke, 29 weapon, item and sigil ops; 192 in all; bespoke is 22% of uses |
| E7 | "Settle the 52 open items in spec section 14" | 1,109 numbered items |
| E8 | "every later revision (to 1.13) is in the repo spec only" | 1.25 |
| E9 | archetypes spend "every creation point (Skill, Attribute and Core)" | no Core points |

### F. Engine comments that state an old rule (4)

`calls/core.ts:6` ("5 tiles + 1 a point"; it is 4 + 1), `character.ts:655` ("2 from Empathy 7"), `character.ts:818`
("a Core point every 3rd level up to 18"), `classes/i.ts:252` (Momentum "reset after a turn with no attack"). A later
model reads comments before code.

### What it has cost

The text pass of 11 Nov rewrote 1,411 texts and found 37 or more places where card and code disagreed. One day and
one rules revision later, one of those cards is wrong again (A1), and so are the spec body and CLAUDE.md. Each rules
revision this week also carried a "screen data regenerated" commit, a spec section, hand-edited card texts and the
test edits of section 5.2. That is the cost of four copies.

---

## 3. Lens A: numbers that live in more than one place

### 3.1 The map: where one rule number is written

| Place | Size | Generated or by hand | Read by the engine |
| --- | --- | --- | --- |
| `data/*.json` structured fields | 5,630 numbers | by hand | partly: see 3.2 |
| `data/*.json` prose (`text`, `note`, `rule`, `source`) | 1,409 strings holding 3,331 numbers; 95 more strings are formulas written as text (`"100 + 15*(endurance-1) + …"`) | by hand | no (shown to players and the Narrator) |
| Engine literals | about 1,400 rule-like literals (3.4) | by hand | they are the rule |
| Engine preview and log strings | interpolate the engine's constants | generated | n/a; these are the texts that are right (A1's preview says ×1.8) |
| `packages/engine/src/glossary.ts` | 136 lines | half and half: it reads data with `?? fallback` defaults (`sr.damage?.base ?? 20`, while the data says 40), and has hand prose with numbers ("each repeated glyph x0.9", "Bolt … 4 tiles (Far: 8)", "limit 3 + half Will Power") | n/a |
| `apps/web/src` strings | 108 lines hold a rule number in a string: `game/commands.ts` 20, `screens/main.js` 20, `game/resources.ts` 17 ("Vent (1 AP)", "10 damage per Flux over", "heals 6 HP × your Healing given", "Clear it (2 AP)") | by hand | no. Review 4 covers these; the fix is the same as for card texts |
| `apps/web/src/game/protodata.json` | 254 KB | generated by `design/canvas-build/build.py --web`; in step today (160 of 160 perk tier texts, 153 of 153 trait lines, 27 of 27 skill lines verbatim). Its `kits` are hand-written in `build.py:204` ("Medic plate (Class II)") and duplicate `character.ts:524` `KITS`. No check fails when it is stale: this week needed three "screen data regenerated" commits | no |
| `apps/web/src/narrator/context.ts` | 640 lines | mostly generated from state; hand numbers: "TN (8/12/16/20)", "Rank II at that attribute 5 and level 6, III at 8 and level 12" (line 148), `level_shift` minimum −3 maximum 2 (line 479, a copy of `enemies.json` `levels.narrator_shift`) | no |
| The spec | 6,742 lines, 1,537 table rows | by hand | no |
| CLAUDE.md | 148 lines | by hand | no |
| Tests | about 5,500 numeric assertions in the engine suite | by hand | no |

How consistent is a data item with itself today? Text against the item's own structured fields:

| File | Texts with numbers | Numbers in text | Not backed by any field of the item | Fields never mentioned in the text |
| --- | --- | --- | --- | --- |
| perks (160 tier texts) | 112 | 189 | 39 in 33 texts | 5 |
| traits (74) | 68 | 160 | 33 in 22 | 5 |
| conditions (40) | 34 | 51 | 8 in 6 | 5 |
| techniques (65) | 61 | 132 | 9 in 8 | 20 in 14 |
| Calls (27 steps) | 21 | 27 | 3 in 3 | 3 |
| weapons, items, objects, sigil words, soul modules | 142 | 229 | 63 in 49 | not counted |

So the 11 Nov text pass left the cards and the `effects` arrays in step with each other. That is the trap: for a
hooked item both are copies, and the pair can be in step with each other and wrong against the engine (A1, B1). The
"not backed" column (155 numbers in 121 texts in the first five rows and the last) is what a validator rule would
flag on day one: mostly ranges, cooldowns and thresholds that exist only in prose and in a TypeScript literal ("within
8 tiles", "once every 3 turns", "up to 4 AP").

### 3.2 Which data the engine really reads

Key names of each data file that appear nowhere in `packages/engine/src`, `apps/web/src`, `apps/server/src` or
`build.py` (a floor: a key can be named in code for another reason):

| File | Distinct keys | Never named in code |
| --- | --- | --- |
| `rules.json` | 571 | **241** |
| `sigils.json` | 218 | 36 |
| `classes.json` | 155 | 24 |
| `traits.json` | 109 | 23 |
| `effect_ops.json` | 123 | 21 |
| `soul_modules.json` | 192 | 20 (`decay_per_turn`, `short_stun_rounds`, `strain_extra`, `cost_rules` …) |
| `patrons.json` | 165 | 11 (`taboo_mult`, `vow_cuts_per_hymn`, `ends_witnessed` …) |
| `perks.json`, `skills.json` | 108, 93 | 10, 10 |
| `feelings.json` | 85 | 5 (`max_feelings_per_hold`, `strain_per_step`, `hp_per_step` …) |
| `techniques.json`, `calls.json`, `objects.json`, `world_play.json` | 270, 52, 43, 76 | 1, 0, 0, 0 |
| all 23 files | 2,691 | **430** |

Each unread key that looks like a rule is a number someone will change in data, see nothing happen, and lose an hour
to. `feelings.json` `max_feelings_per_hold: 4` is the type: it reads like the cap, and nothing reads it.

What the engine keeps for itself instead of reading `rules.json`:

- `effects/ap.ts:10` `AP_BASE = 6` and again `combat.ts:2297` `const AP_BASE = 6`; the ceiling is read from
  `perks.json` `rules.ap_ceiling` (not from `rules.json` `combat.ap`, which says the same thing and is unread), and
  the literal `9` stands in for it at `classes/j.ts:1041`, `1051` and `classes/k.ts:905`.
- `data.ts:80` `TN_LADDER = [8, 12, 16, 20]` beside `rules.json` `resolution.tn_ladder`.
- `character.ts:586` `ARMOUR` (value, move, dodge by class) beside `rules.json` `combat.armor.classes`.
- `character.ts:524` `KITS` (four starter kits: weapon, armour class, stims, pack) with no data at all, and a third
  copy as display strings in `build.py:204`. A roguelike mode starts with kits.
- `magic.ts:84` `CONDS`: 34 conditions with name, family, rounds and text, beside `conditions.json` (B7).
- Every derived-stat formula of `character.ts`, beside the 95 formula strings in `rules.json` `derived` and
  `attributes.json`. Formulas as prose cannot be executed and cannot be checked.

### 3.3 The mechanism that makes a stale text impossible

Three layers, cheapest first. Each is useful alone.

**Layer 1 (S, now): a validator rule, no data change.** For every item with a `text`: each number in the text must
equal a number in the item's own structured fields (with the usual readings: 0.25 is "25%", ×0.8, "half"). Today 155
numbers in 121 texts fail it. Do not fix them by deleting numbers from cards: fix them by adding the missing field to
the item (`"numbers": {"range": 8, "cooldown_turns": 3}`), which is the first half of layer 2. An allow-list entry
needs a reason. This rule would not have caught A1 (the card and the dead `effects` agreed); layer 2 does.

**Layer 2 (M for data and loader, L with the hooks; this is top-ten row 6): one `numbers` block per item, read by the
hook and by the text.** The shape `techniques.json` already has:

```json
{ "id": "bulwark", "tiers": { "I": { "numbers": { "less": 0.25, "depth": 1 },
    "text": "Allies standing directly behind you, in line with the attacker, take {less:%} less damage from ranged attacks." } } }
```

- The loader (`data.ts`) resolves `{name}`, `{name:%}`, `{name:x}` (×0.8), `{name:+}` (+2) and `{name:tiles}` ("1
  tile", "2 tiles") from the item's own `numbers` when the pack loads. `build.py` does the same in Python, or better,
  stops copying texts and the client asks the engine (review 4's piece).
- Validator: after placeholders are taken out, **a text holds no digit**. Exceptions are written `{=3×3}` so they are
  visible and countable. A placeholder naming a missing number is an error; a number no placeholder and no code reads
  is a warning (the unread-key check of 3.5).
- The hook reads the same block: `h.n.less`, never `0.25`. A lint test fails on a rule-like literal in
  `perks/`, `classes/`, `faith.ts` (the patterns of 3.4), with a per-file ratchet so it can land before the files are
  clean, as `coverage.test.ts` does for gaps.
- For numbers that are not the item's own (a Call's range, the AP ceiling, the level factor, a condition's rounds),
  a placeholder may name a shared constant: `{@ap.ceiling}`, `{@cond.shaken.rounds}`. "(×1.13 at level 6, ×1.38 at
  level 12, ×1.82 at level 20)" is written out by hand in three data files today.
- The `effects` array of an item whose hook claims everything is deleted. It is the copy that lies (B1 to B6).
  Where a generic op really runs an effect, the effect keeps its values and the text reads them (`{effects.0.value:%}`).

This makes the card, the hook and the wiki line one number in one place. A balance change is one edit in `numbers`.

**Layer 3 (M): the spec.** Leon's rule stands: the spec wins. What changes is that the spec becomes checkable.

1. Every spec table that lists per-item numbers is wrapped in a marker:
   `<!-- data: weapons; key: name; cols: Damage=damage, Range=range_tiles, Magazine=magazine, Heat limit=heat_limit -->`.
   `tools/spec_tables.py --check` runs inside `npm run check`, parses the marked tables and compares cell by cell.
   **A mismatch is an error that names the data cell**, because the spec wins. Working order stays "spec first": edit
   the spec cell, the check goes red naming `weapons.json crossbow.damage`, edit the data, green.
2. `tools/spec_tables.py --write` regenerates a marked table from data, for the bulk case (a refit of 12 guns ruled
   by Leon in a table in a proposal: change data, regenerate the spec table, the diff of the spec is the ruling,
   reviewed like any other).
3. I ran a 25-line prototype against three tables as they stand. Weapons (line 603, 20 rows): 0 number mismatches
   in damage, range, magazine, heat and weight; it also shows **40 of the 60 weapons are not in the spec's table at
   all**, so for two thirds of the guns the data is the only source and "the spec wins" has nothing to win with.
   Enemy tiers (line 2927): it flags the cell "960 *(820 since rules 1.23)*". Conditions (line 1373, 24 rows): 0
   number mismatches, D6's wording, and 16 conditions missing from the table. So the checker is cheap and finds things
   on its first run.
4. **Fold, don't append.** A revision section lives in the spec only while its branch is open. Whoever merges the
   branch folds it into the body (the table cells, the paragraphs) and moves the "it was X" sentences to
   `CHANGELOG.md`. The body then has one number for each rule. Folding 1.14 to 1.25 once is the M: 1,235 lines to
   place; about 340 lines today match a "was / before / superseded / (rules 1.x:" patch note.
5. Formulas: the spec keeps them as prose; `rules.json` `derived` stops restating them as strings. If a formula's
   coefficients should be tunable they become numbers (`rules.json` `output.profiles` is already that shape) and the
   spec's line is checked by the same tool; otherwise the formula lives in `character.ts` and the golden tables pin it.

### 3.4 Rule numbers hard-coded in TypeScript

A regex census of `packages/engine/src` (comments and strings stripped). The patterns: `ap: N` in an action
definition; `uses: { per, n: N }`; `dist(…) <= N`; `range|radius|reach|tiles: N`; `applyCond(…, N)`;
`rounds|turns|duration: N`; `tn: N` and `1x + strength`; `* 0.x` and `* 1.x`; `/ 100|2|3|4|10`; a literal inside
`applyDamage|healUnit|grantShield(…)`; comparisons and `+=`/`-=` with a literal above 1; die and chance thresholds.
It over-counts (grid arithmetic, list lengths) and under-counts (ternaries, tables). **About 1,400 hits.**

| Kind | Hits |
| --- | --- |
| Comparison thresholds (`>= 5`, `< 3`) | 344 |
| AP costs in action definitions | 241 |
| Ranges by `dist()` | 165 |
| Divisors (percent, halves, thirds) | 166 |
| Uses per turn, fight, scene | 92 |
| Multipliers | 89 |
| `+=` / `-=` amounts | 77 |
| Durations (`rounds:` and `applyCond`) | 111 |
| Range and radius fields | 46 |
| Save TNs | 35 |
| Flat damage, heal, shield amounts | 26 (the damage audit's ground; being moved now) |
| Chances and die thresholds | 9 |

By file, the worst: `classes/k.ts` 141, `classes/i.ts` 110, `magic.ts` 102, `classes/j.ts` 95, `perks/f.ts` 91,
`combat.ts` 78, `game.ts` 64, `perks/e.ts` 62, `ai-sigil.ts` 56, `classes/rev3.ts` 55, `perks/d.ts` 55, `sigil.ts`
53, `perks/c.ts` 49, `perks/g.ts` 43, `faith.ts` 41, `character.ts` 40, `perks/b.ts` 39, `perks/a.ts` 31. The whole
of `physical/` is 67 and `calls/` 12: those read their numbers.

Three worth naming:

1. **236 hits are in `classes/j.ts` and `classes/k.ts`, which are 57 shelved moves out of 63** (section 4.1). A fifth
   of the problem is code no player can reach.
2. **AP costs (241) and uses (92) are the largest tunable group and every one is also printed on a card.** Review 1's
   "costs and counters" piece puts `cost` on the action definition; it should read `h.n.ap`, not a literal, or the
   card and the cost stay two numbers.
3. **Enemy AI weights** (`ai-sigil.ts` 19 multipliers, `physical/ai.ts`, `ai-soul.ts`) are balance numbers nobody
   lists. The fire doctrine (rules 1.25) put its weights in `enemies.json`; the Sigil AI's are still literals.

### 3.5 Schema and the validator

`tools/validate.py` is 1,407 lines of hand-written checks: 346 error rules, 5 warnings, one block per rules revision.
It is good at what each block was written for (ids resolve, counts are right, tables are complete). What it is not:

| Gap | Evidence | Fix |
| --- | --- | --- |
| No schema; unknown keys pass silently | 0 hits for "unknown key"; a typo like `ap_cots` is accepted | A key whitelist per item kind, generated once from today's data and kept in `data/schema/*.json`; an unknown key is an error. S |
| It cannot see the engine | Python over JSON only | A vitest file, `packages/engine/test/data-contract.test.ts`, does the cross-checks that need TypeScript: (1) every key a hook registers exists in data and is not shelved without saying so; (2) every engine-adjudicated item has a hook, a generic op or an action (this exists: `coverage.test.ts`, baseline 0, for perks, traits and class moves only; extend it to weapons' `grants`, items, patrons and soul modules); (3) every data key is read by something (a Proxy over the loaded pack records reads while the golden tables and the suite run; the unread set must not grow: a ratchet starting at today's 430). S to M |
| "An op the engine does not recognise falls back to the Narrator, never silently ignored" | Half true. For perks, traits and class moves `ownerOf()` gives every effect an owner and `coverage.test.ts` holds the gap count at 0. But "owner: handler" only means a hook said `claims: 'all'`; nothing checks the hook does what the effect says (B1 to B6). And 32 of 59 weapon `grants` are `{"op": "narrator"}`: correct by the rule, and a long way from "90% engine" | With layer 2 the question goes away for hooked items (no decorative effect left to disagree). Count the Narrator share as a number in the contract test: engine 703, hybrid 92, narrator 57 today, so 82.5% engine against the 90% aim |
| `provisional: true` is not tied to section 14 | 897 flags in data; the validator checks the flag is present in 9 places, never that an item number exists; data and code cite item numbers 514 times as free text | The ledger of 3.6: a flag carries an item id, the id must exist and be open |
| Text against numbers | not checked | 3.3 layer 1 |
| Spec against data | not checked | 3.3 layer 3 |
| Generated files fresh | `protodata.json` has no freshness check | `npm run check` runs `build.py --web --check` (build to memory, compare, fail if different). S |
| Data fields against each other across files | C1 to C4 passed | Delete the duplicate blocks (top-ten row 5); what remains has one home |

### 3.6 Section 14

1,109 items numbered 1 to 1,424, 2,311 lines (34% of the spec), average 275 characters, no sub-headings. 12 gaps
(315 unused numbers) because each agent reserves a block (801, 901, 1101, 1200, 1230, 1260, 1280, 1300, 1340, 1380,
1400, 1420) so two agents do not collide again; the order breaks twice. 204 items say "provisional"; 90 say they
replace or are replaced by another. It began as "open items for playtest" and is now also the provisional-number
list, the change log and the design rationale.

Is the numbering sustainable? The ids are fine: stable, never reused, cited 514 times. The **list** is not: it cannot
answer "what is open", "what is provisional in `feelings.json`", or "which item governs this number". Block
reservation runs out of meaning at the next parallel wave.

Fix (M, no risk to the game): `docs/rules/ledger.json` (or a Markdown table generated from it), one row an item:
`id`, `system`, `status` (`open` | `provisional` | `settled` | `superseded`), `superseded_by`, `data` (the JSON paths
it governs), one line of text. Keep every existing number as its id. New ids are `<system>-<n>` (`faith-31`), so
parallel agents never share a counter. The validator checks: every `provisional` flag in data names a ledger id that
exists and is not settled; every `provisional` ledger row names a data path that exists. Section 14 in the spec becomes
the generated list of open and provisional rows only; the settled and superseded ones move to the changelog. CLAUDE.md
then quotes a count the tool printed.

---

## 4. Dead and shelved content

### 4.1 What is carried, and what it costs

| Thing | Carried | Cost each revision |
| --- | --- | --- |
| 21 shelved advanced classes | `classes.json` `advanced` 46.7 KB (63 moves) and 11 unused pool moves; `classes/j.ts` and `k.ts`, 3,004 lines, 57 of their 63 handlers unreachable (6 are reused by base classes); 68 of 122 registered class handlers are shelved in all | `classes-j`, `classes-k`, `sigil14-classes-j`, `sigil14-classes-k`, `outburst20-classes` tests: 1,859 lines, 158 tests, edited 10 times on this branch. `classes/k.ts` edited twice. They are in the golden tables too (`items-traits-classes.json`). The shelved texts were skipped by the text pass and still say old rules (Inner Charge reads "the 1.5 stage table (×1, ×1.4, ×1.8, ×2.2)", `classes.json:5449`, spec line 2015, `k.ts:1462`) |
| Shelved soul modules | 10 of 38 modules `locked` ("only with its advanced class"); 9 `retired` | Every module table, icon list and art brief carries them; the validator has rules for them |
| Grand forms | all 40 sigil words carry a `grand` block for one shelved class | `sigils.json` is a third larger; every Sigil refit must decide whether to touch them |
| Superseded rules in `rules.json` | C1 to C4; `combat.surprise_round`, `classes.advanced`, `rank_thresholds` | Read as current by a new session |
| Superseded spec text | line 563 table; about 340 patch-note lines | 3.3 layer 3, point 4 |
| Stale ids | Buff school option `heal_30` now heals 7; skill ids `analysis` and `proficiency` are shown as Acuity and Improvisation; condition id `fear` is shown as Afraid | Every formula string and comment has to explain the rename ("analysis (the skill named Acuity)") |

**Recommendation.** Do not delete the advanced classes: they are designed, tested content that comes back. Quarantine
them so they stop costing: (1) `data/shelved/classes-advanced.json` and `packages/engine/src/shelved/` hold the 15
classes whose moves no base class uses; the 6 reused moves move into the live files; (2) their tests go to a
`shelved` vitest project that is not in `npm run check` and runs before a release and when anyone touches that
folder; (3) they leave the golden tables and the balance guard; (4) one rule in ENGINE-GUIDE: shelved content is not
maintained through a rules revision and is re-fitted when it returns (it would need refitting to the new ceilings
anyway). Size M, risk low (a base class that secretly depends on a shelved handler shows up at once: 6 known).
This takes 236 literals, 158 tests and about 47 KB of data out of every later sweep.

---

## 5. Lens B: the test estate

### 5.1 Inventory

Timed on this machine (4 cores), each suite alone.

| Family | Files | Tests | Time | What it pins |
| --- | --- | --- | --- | --- |
| Engine, all (`packages/engine/test`) | 160 | 3,361 pass, 24 skipped | **99 s** wall, 210 s summed over files | |
| of which `balance/` (the simulators' default mode) | 10 | 38 run, 22 gated | 91 s summed (43%) | small seeded fights and price lists; the real measurements are behind 59 env variables |
| of which `golden-damage*` | 7 | 12 | 32 s (15%) | 5,327 fixed actions, exact |
| of which everything else | 143 | 3,311 | 87 s | rules, one family a system: `perks-a..h` 344 tests, `phys-ranged-*` 332, `phys-melee-*` 227, `sigil14-*` 216, `classes-*` 191, `completeness-*` 171, `faith*` 161, `outburst20*` 104, `rules114*` 101, `fight-talk*` 100, and 14 `rulesNNN` files (223 tests) that pin one revision each |
| Web (`apps/web/src/**/*.test.*`) | 98 | 989 pass, 2 skipped | **38 s** wall | `screens/` 20 files, 138 tests, 23 s (`combat-screen.test.ts` alone 11.7 s); `game/` 47 files, 478 tests; `game/fx` 15 files, 195; `narrator/` 12 files, 114 |
| Browser, in the runner | 32 suites (20 `rules`, 12 `anim`) | about 1,040 named checks | about 21 min at `--jobs 2` (20 rules suites in 6 min, 12 animation suites in 14) | screens, clicks, animation timing |
| Browser, in no group | 32 suites | | not run | five known stale (`soul`, `heart`, `feelings40`, `sigil15`, `magic`), last touched 8 to 11 Nov |

`engine.test.ts` (911 lines, 74 tests, 371 expects) and `sandbox.test.ts` are the old catch-alls. Lines are dense: 4.3 `expect`s a test, and most tests are several statements on one line.

### 5.2 Brittleness

**The churn, measured** (`git log origin/main..HEAD --numstat -- packages/engine/test`, golden files left out):

| Revision (commits) | Older engine test files edited | Lines changed in them | New test files |
| --- | --- | --- | --- |
| 1.15 enemy levels (`1dfaa36`, `930cf4b`) | 19 | 175 | 8 |
| 1.16 maps to 26 × 26 (`2762b0a`) | 54 | 274 | 2 |
| 1.17 magic step (`de9bdfa`) | 14 | 339 | 11 |
| 1.18 and 1.19 guns and Outburst round 2 (`2805714`, `844caa1`, `5199ac8`) | 28 | 597 | 5 |
| 1.20 and 1.21 heal, shield, Faith fit (`2c31a97`, `d5b66aa`, `ae57167`) | 21 | 294 | 7 |
| 1.22 to 1.24 Faith 2, defence, MP (11 commits) | 26 | 334 | 13 |
| 1.25 fire doctrine (`e45e52a`, `2d7b677`) | 3 | 37 | 10 |
| a bug fix between them (`c09b248`) | 1 | 15 | 5 |
| **All 41 commits that touch tests** | **166 file edits** | **2,065** | 73 |

The 1.16 commit is the lesson learnt once: 54 files named tiles on the real map, so the map changing size touched all
of them; the answer was the frozen practice square (`helpers/yard16.ts`). The same answer has not been applied to
numbers.

What the edits are (read from `844caa1`): the stage table restated as a literal in `outburst20.test.ts:50` and again
in `rules119-outburst.test.ts:48`; `expect(lost(f.foe)).toBe(24)` becoming `20`; `Math.floor(20 * 2.4 * 0.5)`
becoming `Math.floor(20 * 1.6 * 0.5)`; a log regex `/RELEASE \(1 form, 18\)/` becoming `15`; test names rewritten
because the name itself states the number ("the stage table ×0.8, then +0.4 a stage to ×2.4 (rules 1.17)"). Nothing
about behaviour changed in most of those lines.

**The assertions, counted** (regex over all test files):

| | Engine | Web |
| --- | --- | --- |
| `expect(` | 13,640 | 4,816 |
| compared with a bare number (`toBe(24)`) | 3,523 | 476 |
| compared with arithmetic on literals (`Math.floor(20 * 1.6)`) | 335 | 19 |
| `toBeCloseTo`, numeric greater or less than | 619 | 240 |
| arrays and objects holding numbers | 562 | 183 |
| strings and regexes holding a digit ("+2 to hit") | 474 | 543 |
| **number-bearing in all** | **5,513 (40%)** | **1,461 (30%)** |
| booleans, plain strings, relations between two values | about 5,300 | about 2,300 |

A random sample of 78 bare-number assertions from 30 engine files, read by eye: about 40 pin a tunable rule number
(an AP left, a damage, a stage, a charge, a cap, a weight), about 38 are structure (a count of 0 or 1, a list length,
a position, an identity). **Estimate: about 2,700 engine assertions hold a balance number as a literal.** 53 of them,
in 13 files, assert a data file's own value (`expect(WEAPON.crossbow.damage).toBe(55)`,
`expect(ENEMY.boss.hp).toBe(820)`, `expect(MENDING.shield_over_heal).toBe(1.2)`, `expect(STAGE_MULT).toEqual([…])`
twice): a second copy of the JSON that proves nothing the JSON does not.

**Eight assertions are dead.** A rules revision put a `//` comment in the middle of a one-line test, and everything
after it on the line stopped running. The suite stayed green.

| File:line | Swallowed |
| --- | --- |
| `classes-k.test.ts:298` | 2 `expect`s (stage and rage after a fed Pump) |
| `sigil14-apply.test.ts:146` | 2 (Corroded applied; the field's log line) |
| `magic.test.ts:48` | 1 (the Evoke log line) |
| `classes-rev3-moves.test.ts:134` | 1 (Unstoppable's effect fired once) |
| `outburst20-review.test.ts:202` | 1 (`mods` cleared) |
| `phys-ranged-press.test.ts:67` | 1 (the enemy volley check) |

`docs/TESTING.md` rule 7 warns about exactly this for browser one-liners. The cause is the house style of several
statements on one line, in 37,637 lines of tests.

**How tests should read numbers** (the rule for ENGINE-GUIDE, and top-ten row 4):

1. **A test of behaviour never writes a rule number.** It takes it from where the engine takes it:
   `STAGE_MULT[4]`, `WEAPON.crossbow.damage`, `TR.momentum.max`, `devotionThreshold(5)`, or from the engine's own
   preview: `expect(lost(foe)).toBe(pv.dmg.total)`. The suite already does this in places (`faith-review`,
   `phys-melee-finishers`); those lines did not need editing this week.
2. **A test that needs a particular number sets it.** `fightWith(…, { foe: { hp: 999, armour: 0 } })` is already the
   habit for enemies; give the helper the same for a rule (`with: { 'soul.cycle.stage_mult': [1, 2, 3, 4, 5] }`,
   restored after the test) so a mechanism test ("a Pump raises the stage and the Release reads the table") is true
   for any table.
3. **Exact values live in one place: `test/golden/`.** A balance change is then: edit data,
   `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage`, read the diff of the golden JSON (it is the list of
   what moved, by action), commit both. One data file and one golden table, not twenty test files.
4. **Delete on sight:** the 53 data-pin assertions; the second copy of any table (`STAGE_MULT` in two files); a test
   whose name states a number.
5. **Do not convert 2,700 assertions in one go.** The risk of losing a real check in a mass rewrite is higher than
   the cost of leaving them. Rule: when a revision turns a literal red, the fix is to derive it (rule 1 or 2), not to
   type the new literal. A lint test counts bare-number `toBe` in `packages/engine/test/*.test.ts` and holds the count
   as a ratchet (3,523 today); it only goes down.
6. **One statement a line in tests, enforced** (a lint test: no `expect(` after `//` on a line; better, no second
   statement after an `expect`). S. It would have caught all eight.
7. **`rulesNNN-*.test.ts` files are change logs, not tests of a system.** 14 files, 223 tests, each named after a
   revision, each restating that revision's numbers, each edited by the next revision. When a revision is folded into
   the spec body (3.3), its tests are folded into the system's file (`outburst.test.ts`, `faith.test.ts`) in derived
   form, and the numeric half is dropped in favour of the golden tables.

**A stronger option, to spike before promising it (guess: one day to know):** run the mechanism tests against a
frozen copy of the data pack (`test/fixtures/pack/`, the yard16 idea applied to numbers; a vitest alias on the
`data/*.json` imports), and only the golden tables, the contract test and the balance guard against the live pack.
Then a balance change touches no mechanism test at all. The risk is real: the frozen pack must follow every change of
shape, and a rule that only breaks with live numbers is then seen only by the golden tables. I would do rules 1 to 6
first and try this only if the churn is still above five files a revision afterwards.

### 5.3 Scenario cost

There is a shared builder and it is good: `helpers/perkfight.ts` (107 lines; `fightWith`, `storyWith`, `withGame`,
`sheetOf`), used by 79, 64 and 76 of the 150 top-level test files; `physfight.ts` by 29. The long hand-built fight is
mostly gone: 17 files still call `startCombat` and 38 `newGame` directly.

What is not shared is everything around it. **897 file-local helper functions** are defined at the top of test files;
96 files define four or more. The same ones, again and again: `logHas` in 43 files, `rngFor` in 36, `fight` in 34,
`open` in 24, `at` in 20, `charOf` in 16, `sheet` in 15, `rig` and `give` in 14, `me`, `seed`, `fx`, `cls`, `A` in 12
each, `calm`, `turn`, `storyCheck` in 11. Each is three to ten lines and slightly different, so a change to the shape
of the log or of a unit is 43 edits.

Could tests use the `npm run try` language? Yes, and they nearly do: `try.test.ts` is 35 lines over `fightWith`
(units `$pc`, `$foe1`; `set`, `turn`, `steps`, `preview`). What it lacks is assertions.

1. **S: one test kit.** Move the 20 commonest helpers into `helpers/kit.ts` (`logHas`, `rngFor`, `lost`, `fx`,
   `charOf`, `give`, `rig`, `at`, `me`) and delete the copies. No behaviour changes; the diff is mechanical. This is
   the cheap half and most of the saving.
2. **M: declarative scenarios for the table-shaped tests.** A scenario is the `try` JSON plus `expect` rows that name
   state, not numbers: `{"steps": [{"type": "combat/outburst", …}], "expect": [{"unit": "$foe", "lost": "$preview"},
   {"unit": "$foe", "cond": "pinned"}]}`. The big families are tables already (`perk-audit` plays every perk;
   `fx-sweep` plays every weapon × technique): one runner over `test/scenarios/*.json` replaces the bodies of the
   `completeness-*` and `rulesNNN` families (about 400 tests), and the same file is what `npm run try` plays and what
   a browser suite can replay. It also gives a later, weaker model a format to add a case in without reading a helper
   file. Do not force rule tests with real logic into it.

### 5.4 The browser suites

Facts: 64 suites, 11,241 lines. 32 are in the runner; 32 are not, and a suite that is not run rots (all five known
stale ones are among those 32, and so are `sigil14`, `sigil15-strokes`, `sigil15-growth`, `faith`, `missions`,
`ui-shell`, `voice`, the four `slate*`, `layout`, `mapzoom`, `mana-forecast`). **1,128 `waitForTimeout` calls** (576
s if each ran once), against TESTING.md rule 6 ("wait for what a player waits for, not for a number of
milliseconds"): `heart` 65, `faith-pg` 62, `physical` 55, `camera` 47, `skeleton-screens` 47, `ui-shell` 42,
`pg-levelup` 38. Fixed sleeps are why load makes them flaky: on a busy machine the sleep is too short, so someone
makes it longer, so the suite is slower on an idle one.

Which assert wall-clock time (references to `Date.now`, `performance.now` or a millisecond bound): `fx-sweep` 17,
`faith-pg` 16, `camera` 14, `cutins` 12, `reload` 10, `turn-order` 9, `combat-speed` 9, `melee-fx` 9, `coop-stall` 8,
`brass` 7, `clarity` 7, `pg-levelup` 7, `two-players` 5. Those are the ones that cannot share a machine. Six web unit
files and three engine files also read the clock (`fx/queue`, `fx/stall`, `fx/soul`, `fx/elements`, `spotlight`,
`narrator/live-playtest`; `sigil14-ai`, `ai-soul`, `maps`), which is why `tools/check.py` runs the two unit suites
one after the other.

Which duplicate engine tests through the UI (a judgement from each suite's README entry and a skim, not a line-by-line
audit): `physical`, `physical-pack`, `perks`, `classes-moves`, `world-play`, `ground`, `rules114` and `combat-fixes`
mostly set a fight up with `sandbox/*` actions, act through `window.__phc.act`, and read `getState()`. Where the
check is "the state is X after action Y", it is an engine test paying for a browser. Where it is "the button shows
'Pick up 1 of 2 · 1 AP'", it is a screen test, and the screens are functions with unit tests (`screens/*.test.ts`,
138 tests).

**The minimal trustworthy set (13 suites, guess: 8 to 10 minutes):**

- Smoke, every change that touches the client (about 3 min): `old-save`, `two-players`, `turn-order`, `perks`,
  `creation-points`.
- Screens, before a merge to `develop`: `skeleton-screens`, `classes`, `tabs`, `right-panels`, `sandbox`,
  `coop-stall`.
- Animation, only when `fx/`, the camera or the combat speed changed, alone on the machine: `fx-sweep` (it judges
  from the effects layer's own trace, the right design), `camera`.

**Retire or fold:**

1. Delete `soul`, `heart`, `feelings40`, `sigil15`, `magic` (stale, 1,526 lines) and write one `magic-smoke` that
   draws a Line, Evokes it, and Begins, Pumps and Releases an Outburst through the real buttons.
2. `melee-fx`, `reload`, `brass`, `clarity`, `cutins`, `combat-speed`, `faith-pg`: the timing halves belong in
   `apps/web/src/game/fx/*.test.ts` with a fake clock (the queue is already tested that way, 195 tests); keep one
   real-speed check each inside `fx-sweep`'s trace if it is not there.
3. The state-reading halves of `physical`, `physical-pack`, `world-play`, `ground`, `classes-moves`, `rules114`,
   `combat-fixes` become scenarios (5.3); what is left of each is "the button exists and says the engine's label".
4. The other 27 orphans: each is put in a group or deleted, and `tools/e2e.py` exits with an error when a `.mjs` file
   is in no group. No third state.
5. Replace sleeps as suites are touched; a ratchet on the count of `waitForTimeout` (1,128), as for literals.
6. `two-players`, `reconnect` and `vote` print no `ok` line: the runner shows "0 checks". Give them named checks so
   a green line means something was looked at.

### 5.5 The simulator and the standing balance guard

Today: `test/balance/` is 4,400 lines (the simulator, 9 reference builds, policies, 7 measuring files). Every real
measurement is behind an env variable (59 of them) and takes 5 to 35 minutes; the default mode still runs 38 small
tests inside every `npm test`, for 91 of the suite's 210 CPU-seconds, and they assert little (`balance-sim.test.ts`
27 s, `step1-fit` 20 s, `defence-measure` 16 s, `faith-measure` 10 s). The golden tables fire fixed actions at a
target that never acts. So the standing protection is "numbers did not move" (golden) and nothing says "numbers are
still inside the ceilings".

Recommendation:

1. **Now (S): `ceilings.test.ts` part 1 of the unified-damage proposal, section 2.7, the static part.** For every
   source that has an amount in data, evaluate it at the reference pairs and levels and compare with its budget
   class. No fight is played; under 2 s. It needs `data/budgets.json` and the sources through `effects/output.ts`
   (stages a4, a5), so start it with weapons and techniques, which are through, and let it grow with each stage. This
   is the test that stops a roguelike relic at +60% from being merged.
2. **Next (S): the played part as its own command, not inside `npm test`.** `npm run balance` = 9 builds × 2 shares
   × 3 levels, seeded, the proposal's 40 to 60 s, with one results file (`docs/design/balance/latest.json`) checked in
   so the diff of a balance change is visible in review. `npm run check` gains a `--balance` flag; a rules revision's
   hand-off must paste its line.
3. **Move the measuring files out of the default run** (a vitest project `measure`, or `*.measure.ts`). The engine
   suite drops from 99 s to about 60 s and stops tempting anyone to skip it.
4. **Replace the 59 env variables with one argument**: `npm run measure -- guns --levels 1,9,20 --n 24 --out file`.
   A weaker model cannot be expected to find `GUNS_MEASURE_VARIANTS`.
5. **Golden tables: keep, and add the missing half.** They are the pin for refactors. Add 20 to 30 short seeded
   fights with the AI on (the simulator already plays them) recorded the same way, so a change to whom an enemy
   picks, or to turn order, is also seen. Today nothing exact covers the AI.

### 5.6 No CI

There is no `.github/workflows`. `npm run check` runs when an agent remembers to. With parallel agents and
"CHECKPOINT, not verified" commits (8 of the last 40 start with those words), a red `develop` is found by the next session. A workflow that
runs `npm run check` on every push (about 2.5 minutes) and the smoke suites on a pull request to `develop` is S and
costs nothing in tokens. Leon's call (it needs Actions minutes on the repository).

---

## 6. Lens C: docs and hand-offs

Facts: `docs/design/handoffs/` holds 52 Markdown files, 1.8 MB (about 450,000 tokens), 4 in `_archive/`. Its README
lists 28 as "current" and opens with "still worth reading at 0.0.1" (the version is 0.22.0). One revision's report
runs to 46 to 84 KB (`defence-step.md` 84 KB, `heal-shield-pass.md` 57 KB); `action-price-list.md` is 217 KB; two
"code maps" (`skeleton-2.0-code-map.md` 145 KB, `physical-2.0-code-map.md` 60 KB) describe code that has since moved.
Every one of them states numbers that were true on its day. CLAUDE.md's rules paragraph is wrong in 9 places
(section 2, E). A new session that reads what it is told to read gets the Outburst table of rules 1.5.

The smallest structure that stops that:

1. **CLAUDE.md stops restating rules (S).** "The game in one screen" keeps the shape of the game (three Cores, nine
   Attributes, 27 skills that are voices; d20 against a TN; the grid and AP; the two magics; faith) in about ten lines
   with **no number that the balance pass can move**, and one line: "Every number: `docs/rules/NUMBERS.md`, generated
   from data. Never quote a number from memory or from a hand-off." Counts that go stale (ops, open items, revision)
   are removed or replaced by where to look.
2. **`docs/rules/NUMBERS.md` is generated (S)** by `tools/numbers_md.py` from the data pack: budgets and level gains,
   derived-stat coefficients, AP, the stage table, the enemy tiers and level table, the mana bands, the Devotion
   curve, the list of weapons with damage and AP. About 300 lines. `npm run check` fails if it is stale (the same
   `--check` as `protodata.json`). This is what a session reads instead of 6,742 lines of spec when it only needs a
   number.
3. **One live hand-off, the rest archived (S).** `SESSION-HANDOFF.md` (what is live, what is on the branch, what is
   in flight) and `PATCH-TALLY.md` stay. When a revision's branch is merged, its report moves to
   `_archive/<version>/` in the same merge, with one line in the README. Reports are evidence of how a number was
   reached, not instructions; the archive README says so in its first line: "Numbers in here were true on the day.
   The data is current." Today that moves about 40 files.
4. **Delete the generated dumps from the docs tree (S):** `balance-sim-*.json` and `.md` (4 files, 470 KB),
   `skeleton-2.0-before.json`, `action-price-list.md` (217 KB) are tool output; keep the tool and the latest result
   in one place (`docs/design/balance/latest.*`, 5.5).
5. **The spec folded and its tables checked** (3.3 layer 3) is the real fix for "a session reads a wrong number in
   the source of truth". Until that is done, add three lines at the top of the spec: "Sections 'Rules revision 1.14'
   to '1.25' override the body above them. For a number, read `NUMBERS.md`."
6. **`docs/ENGINE-GUIDE.md`** (PLAN.md already plans it) takes the rules of this review as short imperatives: where a
   number goes, how a card text is written, how a test reads a number, how to add an item. That file and
   `NUMBERS.md` are what a weaker model is pointed at; everything else is history.

---

## 7. Order of work, as it fits PLAN.md

1. **Today, one small commit (S):** the 34 mismatches (section 2) and the 8 dead assertions; CLAUDE.md's paragraph;
   the one-statement-a-line lint. Nothing here moves a number in the engine except A2 (Case Closed: by the spec the
   ×1.2 goes; that is a ruling Leon already made in rules 1.13, so re-record the golden line and say so).
2. **With wave 1's "card texts that can't go stale":** validator layer 1; `NUMBERS.md`; `protodata --check`; the
   data-contract test with its three ratchets (unread keys 430, bare-number assertions 3,523, sleeps 1,128).
3. **With wave 2's "costs and counters":** the `numbers` block and `h.n` for perks and traits, one lane file at a
   time, golden tables exact after each (`items-perks.json`, `items-traits-classes.json` cover them); `effects`
   deleted where claimed; `rules.json` cut down to what is read plus the `constants` block.
4. **Before the first roguelike content:** `ceilings.test.ts` part 1; shelved content quarantined; the spec folded
   and its tables marked; the ledger.
5. **Any time, by whoever touches them:** the test kit; scenarios; the browser set.

What I did not do: read the 60 browser suites line by line (5.4's duplicate list is a judgement); check every hooked
item's numbers against its code by hand (73 candidates were read; an item whose text holds no number, or whose code
uses a shared constant, was not); run the coverage report (the owner counts in verdict 1 are from the source, not
from `coverageSummary()`); verify weapons' `grants` texts against `combat.ts`.
