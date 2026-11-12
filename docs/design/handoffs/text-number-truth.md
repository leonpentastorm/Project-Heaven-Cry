# Text and number truth: the rules.json and client slice (12 Nov 2026)

The engine review (`docs/design/proposals/2026-11-engine-review/3-data-text-tests.md`, sections 2 and 5.2) found texts,
data fields, spec lines and comments that state a rule the game no longer has, and eight assertions that never ran.
A two-stage review then confirmed 34 mismatches in this slice (`rules.json`, the other data files nothing reads, the
client's and the engine's own strings). This is what was done about them, and the guards that now hold the line.

Branch: `worktree-wf_67430118-ae8-17` (not pushed, not merged). No rule number of the engine changed; no golden line moved.

## 1. What was fixed, by kind

| Kind | Confirmed | Fixed | Left for a ruling |
| --- | --- | --- | --- |
| A text a player or the AI Narrator reads | 7 | 7 | 0 |
| A data field | 19 | 19 | 0 |
| The engine against the spec | 2 | 0 (see section 3) | 2 |
| The spec's body against a later revision | 2 | 1 | 1 |
| An engine comment | 4 | 4 | 0 |
| **All** | **34** | **31** | **3** |

**Texts (7).**

1. Perception's line at creation, level up and the attribute page said +10% critical damage. It is +3%, and the line
   now builds the number from the engine's `CRIT_PER_PERCEPTION` (`apps/web/src/screens/shared.js`).
2. Empathy's "a point gives" text said "from 7, two [free Pumps]". It now says a held Outburst swells without Strain
   (`data/skills.json`: `per_point.text` and its copy `epccg.effect`, which a test holds equal; `protodata.json` was
   rebuilt, and the new freshness check caught that it needed it).
3. The engine refused a Field Repair with "Needs Proficiency 3". It reads the skill's name from data now
   (Improvisation): `combat.ts` (twice, and the action's own text), `game.ts`.
4. Four log lines said "(Vigilant 12 vs 12)". They read the skill's name from data (Vigilance): `hazards.ts`,
   `sigil.ts`, `combat.ts` (twice).
5. The overworld action list printed Analyze at "2 AP" for everyone. It prints the acting character's own cost
   (1 AP from Acuity 3), as the fight menu did, in the list and in the read hint (`apps/web/src/screens/main.js`).
6. The Narrator's rules prompt said "Firing builds Flux". Drawing a glyph builds it; Evoking adds none
   (`apps/web/src/narrator/context.ts`).
7. The wiki's class entries gave a rank's attribute and not its level. They read both from the engine
   (`RANK_ATTR`, `RANK_LEVEL`): "rank II at Endurance 5 and level 6, rank III at 8 and level 12" (`glossary.ts`).

**Data fields (19).** None of these is read by the engine, which is how they went stale.

- `data/rules.json`: the `classes` block is a pointer to `classes.json` `assignment` (the Revision 2 totals and tutors
  are gone); `perks_rules.acquired` and `.achieved` follow `perks.json` (a perk step at 3 / 5 / 7 / 9 points, Mastery 2
  for a combo perk, the engine grants the nine fight deeds); `mana.soul.design.ready_designs` and
  `derived.magic.sigil_ap` take the spec's formulas (Will Power; a glyph's AP); the two `improvise` keys, and
  `reputation_bonus_per_award`, are removed (no such rule in the spec or the engine); `pray` lists the three costs;
  `resolution` states the gamma rule (`skill_track.check_mod`, and the passive and Ask formulas use it);
  `ownership.narrator_owns` loses the patron's mood TN and the tutors and says which Achieved perks the Narrator grants;
  `combat.initiative.surprise_round` became `unaware` (the later rule); the keys named after classes that no longer
  exist are renamed (`ap_bard`, `bard_treats_injuries`, `defender_reactive_plate_3_guard`; the price-list tool and its
  generated doc follow).
- `data/attributes.json`: the `skills` map follows `skills.json` (4 slots were wrong); the elemental multiplier
  (0.1 and 0.05), critical damage taken (Acuity) and the glyph AP formula (`glyph_ap`, 1 − 0.1 a point, minimum 0.5).
- `data/skills.json`: `signature_of` is removed from all 27 skills (it named Revision 2 classes; a class's skills are
  in `classes.json` `base[].skills`); `per_point.effects` is rewritten for 18 skills whose effects named a pre-1.13
  home or missed what the text gives, so that every effect is the text's own number.
- `data/archetypes.json` `rules.preset_style`, `data/soul_modules.json` `notes` (the Damage base is 40) and
  `limits.ready_designs`, `data/sigils.json` `grammar.range_bonus` (Brain Power), `data/perks.json` `rules.achieved`
  (the engine grants nine).

**The spec's body.** Nothing was rewritten. Each stale statement carries an in-place note in the house style: the
Empathy lines (Derived stats, the skill table, the Outburst cycle rule 6, the module gates table), higher ground (two
places), the surprise round, full auto; and in the weapon tables the hand cannon (38), the Decrkm SMG's roster row (19)
and the Boss's HP cell, which now reads current value first like every other cell.

**Engine comments (4 confirmed, 9 corrected).** `character.ts` (critical damage taken is Acuity's; the orphaned
"Attribute can't pass its Core" line; the old free-Pump line; Core points in `levelGains`), `tactics.ts` (a beast's
death is +3), `sigil.ts`, `hazards.ts` and `combat.ts` (passive Vigilance is 10 + its points), `calls/core.ts`
(a Call reaches 4 tiles + 1 a point).

**CLAUDE.md.** "The game in one screen" now has: the caps without Cores, the gamma rule, creation with no Core points
and the ceiling of 7, levelling without Core points, HP on Pain Threshold, the stage table ×0.8 to ×1.6, Flux from
drawing, the Hymn's cooldown. Also: the archetype budgets, the op counts (192), the revision range (to 1.25), the item
count of section 14, the `npm run check` line, and the repo map (tools, `test/golden`, `docs/TESTING.md`,
`proposals/`). The section is the same length as before (7,434 characters against 7,376).

## 2. Dead assertions

Seven lines had a `//` comment in the middle with statements after it: the six of the review and one more that the
lint found (`classes-rev3-moves.test.ts:50`, where the swallowed statement was a set-up call, `order(f, d, foe)`).
Each is split so the comment ends its line. **Ten `expect`s and that call run again, and all of them pass**: no
revived assertion failed, so there is no hidden bug behind them.

| File | Revived |
| --- | --- |
| `classes-k.test.ts` | the stage and the rage after a fed Pump (2) |
| `sigil14-apply.test.ts` | Corroded applied; the field's log line (2) |
| `magic.test.ts` | the Evoke log line (1) |
| `classes-rev3-moves.test.ts` | Unstoppable's effect fired once (1); the turn order set-up |
| `outburst20-review.test.ts` | `mods` cleared (1) |
| `phys-ranged-press.test.ts` | the enemy volley check, and the two that followed it on the line (3) |

## 3. Engine behaviour that changed

Only strings. No number, no roll, no AP cost.

1. The Field Repair refusal and the action's description name Improvisation (they said Proficiency).
2. The four spotting log lines name Vigilance (they said Vigilant).
3. The wiki's class entries state the level of ranks II and III.

**Golden tables:** not re-recorded; no line moved.

## 4. What was not fixed, and why

| Id | Why |
| --- | --- |
| `high-ground-not-in-engine` | The spec gives +1 to hit from higher ground; no map carries a height and the engine has no such term. Building height is a system, not a fix, and the task is to keep hunks small. Spec item **1500** asks for the ruling (build it or cut it); the body lines say "not built"; `rules.json` has `combat.grid.high_ground_built: false`. |
| `surprise-round-3ap` | Not an engine bug: the later rules (an unaware enemy loses round 1; a Hidden attacker opens on its own turn) describe what the engine does, but no revision withdraws the 3 AP surprise round in words. The body line has a note and `rules.json` states the later rule; item **1501** asks Leon to strike the surprise round. |
| `full-auto-cone-vs-line` | The spec says "a 3-tile cone" in four places and "the line" in two; the engine fires a corridor 1.5 tiles to each side of the line to the target. Which is right is a ruling: item **1502**. The engine is unchanged; the spec line says what is built; `rules.json` `full_auto.area_built` records it. |

Seen and left alone (outside the 34, or another agent's ground):

- `classes/i.ts:252`, the Momentum comment of the review's list F: the classes files are being refactored in another
  worktree.
- `game.ts` `isMedicChar` still says Medic in its name and comment (cosmetic; the Bard is the class now).
- Three debuffs have no row in the spec's Conditions table (Injured, Weapon lowered, Smitten). They are described
  elsewhere in the spec; they wait in `tools/spec_tables_known.json`.
- The review's lists A, B, D (other than the Empathy lines) and its section 4 belong to the other slices.

## 5. The guards

All run inside `npm run check`, and together take under five seconds.

### a. The text-number guard (`tools/text_numbers.py`, called by `tools/validate.py`)

**Rule:** every number in a data item's `text` must be a number in that item's own structured fields.

- An item is any object with an `id` in `data/*.json`. Its texts are the strings under a `text` key inside it (a perk's
  tiers, a technique's lines, a weapon's grant), down to the next object that has its own id.
- Its structured numbers are every number in it, the numbers in its short non-prose strings (`"20 + 5*raw_power"`, an
  effect's `when`) and numeric keys. Prose keys (`flavour`, `lore`, `note`, `deed` and so on: the `PROSE` set) never count.
- `25%` matches 25, 0.25, 1.25 or 0.75; `×1.5` matches 1.5, 0.5 or 50; a plain number matches itself, sign ignored.
  References ("rules 1.19", "item 953") and digits inside a word (".32", "d20", "2H") are not read.

Today 1,733 numbers are checked and **352 fail**. Those are the baseline in `tools/text_numbers.json`, recorded after
the fixes above. The validator prints one line: `text numbers: 1733 checked ..., 352 in the baseline (it only shrinks),
0 allowed`.

- A failure that is not in the file is an **error** (a new card whose number has no field, or an edited number).
- A baseline entry that no longer fails is an **error** too, until it is taken out:
  `python3 tools/validate.py data --shrink-text-baseline`. So the list can only get shorter.
- A number that is right to have no field (a die face, a count that is part of a name) goes under `"allow"` with a
  reason; an entry with no reason is an error.

To fix a failure, in this order: make the screen build the line from the field; add the field the engine should be
reading; correct the text; allow it with a reason. The 352 are the work list for "texts read their numbers" (the
review's section 3.3): 88 in class moves, 51 in perks, 34 in traits, 29 in Soul modules, 25 in weapons.

To extend: a new prose key goes in `PROSE`; a new way to write a number (a fraction in words, say) goes in
`text_numbers()` with the values a field may hold for it; a file that is not rules goes in `SKIP_FILES`.

What it does not catch: a text and a field that are wrong together; a number hard-coded in a TypeScript hook and
written in no field (those are among the 352); words ("twice", "half").

### b. The test lint (`packages/engine/test/test-lint.test.ts`)

Walks every test file of the repo (engine, web, server, the browser suites) and refuses:

1. a statement after a `//` comment on the same line (an `expect(` anywhere in a trailing comment, or a call ending in
   `);` at its end);
2. `it.skip(`, `describe.skip(`, `test.skip(`, `.todo(`, `.only(` without a comment on the line or the line above that
   holds a date ("12 Nov 2026" or "2026-11-12"). A switch needs none: `(FULL ? it : it.skip)(...)`, `it.skipIf(...)`.

It tests its own two patterns first. To extend: add a directory to `DIRS`, a shape to `swallows` or `SHELVED`.

`packages/engine/test/text-number-truth.test.ts` holds the engine-side checks of this pass: no engine string types a
renamed skill's old name (add a rename to its `OLD` table when a skill is renamed again), and the wiki's class entries
state the rank rule as the engine reads it.

### c. Screen data freshness (`python3 design/canvas-build/build.py --web --check`)

There was no freshness test for `apps/web/src/game/protodata.json` in this worktree, so this is a minimal one: the
build runs, writes nothing, and fails when the committed file is not what the data builds. If another branch brings a
vitest freshness test, keep one of the two.

### d. The spec's tables (`tools/check_spec_tables.py`)

Compares, cell by cell (499 cells), the spec's Starter weapons table and the eleven roster tables of Weapons version 2,
the enemy tiers at level 1, the enemy level table and the Conditions table with `weapons.json`, `enemies.json` and
`conditions.json`. A cell is read by its **first number**, so the house note "19 (rules 1.18; was 15)" works and the
current value must come first. It also fails when a weapon, a tier, a level or a debuff is on one side only, and when
fewer than 400 cells were read (a header changed and a table is no longer parsed).

The tool never decides who is right. When a row differs: the spec wins and the data is the bug, unless a later revision
moved the number, in which case the table's cell takes the note. A difference that needs a ruling goes in
`tools/spec_tables_known.json` with the reason (three conditions today); a known row that stops differing fails until
`--prune` drops it. `--list` prints everything.

What it found on its first run, all settled by the spec's own later revisions (no row needed a stop):

| Row | The table said | Now |
| --- | --- | --- |
| Frontier hand cannon, damage | 40 | 38 (rules 1.18, item 1074), as data |
| Decrkm SMG, damage (the roster row; the Starter row was right) | 15 | 19 (rules 1.18), as data |
| Boss, HP | "960 *(820 since rules 1.23)*" | "820 *(rules 1.23; was 960)*" |
| Bite and claws (a beast companion's weapon) | not in any table | a row in 7.9 Unarmed, from data |

To extend: a new table is one function in the tool (find it by its header, map the columns to fields, call `diff`).

## 6. Before relying on this

- `python3 tools/validate.py data` prints `0 errors`; `npm run check` is the gate.
- Leon's rulings wanted: spec items 1500, 1501, 1502, and the three conditions in `tools/spec_tables_known.json`.
- Other worktrees are editing `combat.ts`, `sigil.ts`, `game.ts`, `hazards.ts`, `glossary.ts` and `main.js`: every
  hunk here is one line or one import, so a merge conflict is a one-line pick.
