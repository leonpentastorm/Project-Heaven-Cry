# Text and number truth (12 Nov 2026): two passes

**Read section 7 on first: the second pass.** Sections 1 to 6 are the first pass (the rules.json and client slice), kept as its record; where the second pass changed something of the first, the line says so.

The engine review (`docs/design/proposals/2026-11-engine-review/3-data-text-tests.md`, sections 2 and 5.2) found texts,
data fields, spec lines and comments that state a rule the game no longer has, and eight assertions that never ran.
A two-stage review then confirmed 34 mismatches in this slice (`rules.json`, the other data files nothing reads, the
client's and the engine's own strings). This is what was done about them, and the guards that now hold the line.

First-pass branch: `worktree-wf_67430118-ae8-17`. Second-pass branch (holds both): `worktree-wf_67430118-ae8-19`. Neither is pushed or merged. The first pass changed no rule number; the second changed several and moved four golden lines (section 7.3).

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
  `combat.initiative.surprise_round` became `unaware` (the later rule) *(second pass: restored as the spec has it,
  with `built: false`, until Leon rules on item 1501)*; the keys named after classes that no longer
  exist are renamed (`ap_bard`, `bard_treats_injuries`, `defender_reactive_plate_3_guard`; the price-list tool and its
  generated doc follow).
- `data/attributes.json`: the `skills` map follows `skills.json` (4 slots were wrong); the elemental multiplier
  (0.1 and 0.05), critical damage taken (Acuity) and the glyph AP formula (`glyph_ap`, 1 − 0.1 a point, minimum 0.5).
- `data/skills.json`: `signature_of` is removed from all 27 skills (it named Revision 2 classes; a class's skills are
  in `classes.json` `base[].skills`); `per_point.effects` was rewritten for 18 skills. *(Second pass: the field is
  deleted from all 27. Nothing read it, and a mirror nobody reads is what went stale in the first place.)*
- `data/archetypes.json` `rules.preset_style`, `data/soul_modules.json` `notes` (the Damage base is 40) and
  `limits.ready_designs`, `data/sigils.json` `grammar.range_bonus` (Brain Power), `data/perks.json` `rules.achieved`
  (the engine grants nine).

**The spec's body.** Nothing was rewritten. Each stale statement carries an in-place note in the house style: the
Empathy lines (Derived stats, the skill table, the Outburst cycle rule 6, the module gates table), higher ground (two
places), the surprise round, full auto; and in the weapon tables the hand cannon (38), the Decrkm SMG's roster row (19)
and the Boss's HP cell, which now reads current value first like every other cell.

**Engine comments (4 confirmed; ten hunks, of which the second pass took six back out, see 7.6).** `character.ts` (critical damage taken is Acuity's; the orphaned
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

The guards were rebuilt in the second pass: see section 8, which replaces what stood here. (The first form of the
text-number guard let a text number match ANY number anywhere in its item; a review measured that 40% of the numbers
it passed survived a +1 edit, and that it would have caught none of the 34 findings.)

## 6. Before relying on this

- `python3 tools/validate.py data` prints `0 errors`; `npm run check` is the gate.
- Leon's rulings wanted: spec items 1500, 1501, 1502, and the three conditions in `tools/spec_tables_known.json`.
- Other worktrees are editing `combat.ts`, `sigil.ts`, `game.ts`, `hazards.ts`, `glossary.ts` and `main.js`: every
  hunk here is one line or one import, so a merge conflict is a one-line pick.

## 7. Second pass (12 Nov 2026)

The first pass was cut short (a usage limit) after one slice. A two-stage review then confirmed 309 more mismatches
across the other slices, and an independent review of the first pass listed its problems. This pass starts from the
first pass's branch and holds both. Branch: `worktree-wf_67430118-ae8-19` (not pushed, not merged).

### 7.0 What this pass did NOT cover: read this first

**The list of 309 findings reached this pass cut off.** The task text ended in the middle of the faith slice, after
about 167 findings (perks 19, traits 29, classes 27, weapons and techniques 59, magic 26, faith 7). The findings after
that point (the rest of faith, and whatever slices followed: about 140) were never seen and are **not fixed**. The
full list is not on disk either. They need a third pass with the list handed over as a file.

### 7.1 What was fixed, of the about 167 seen

| Slice | Seen | Fixed | Partly | Left |
| --- | --- | --- | --- | --- |
| Perks | 19 | 16 | 1 | 2 |
| Traits | 29 | 27 | 1 | 1 |
| Classes | 27 | 25 | 1 | 1 |
| Weapons, techniques, items, conditions | 59 | 39 | 6 | 14 |
| Magic | 26 | 26 | 0 | 0 |
| Faith (the 7 that arrived) | 7 | 5 | 1 | 1 |
| **All** | **167** | **138** | **10** | **19** |

By kind of change made: 15 engine behaviours (7.2); player-facing texts and data fields in `perks`, `traits`,
`classes`, `weapons`, `items`, `techniques`, `conditions`, `sigils`, `soul_modules`, `patrons`, `skills` and
`rules.json`; 51 in-place notes on spec lines and 17 on section 14 items (nothing rewritten); about 50 engine
comments; CLAUDE.md (6 statements), `data/README.md` (11 rows) and `data/CONVENTIONS.md`.

New spec items: **1503 to 1515** (the two unrecorded rulings of 10 Nov, Mind Without Fog, glasses and mask, the
buckler, Paper, One Breath, Fire Sermon, Linger, the breacher's blast, the engine fixes, the rulings wanted, the
labels, texts that read their numbers).

Two findings were confirmed with their direction corrected by the verifier, and were handled the verifier's way:
**Case Closed's +20%** and **Stand Still's original** are Leon's rulings of 10 Nov 2026 that the spec never took. The
engine and cards were left; the spec rows carry notes and item 1503 records them. Leon should confirm.

### 7.2 Engine behaviour that changed (every one)

Each has a test in `packages/engine/test/truth-pass-2.test.ts` where marked (T), else it was read and type-checked.

1. **Bleeding from a technique lasts 3 rounds** (T). `applyCond(..., 'bleeding')` with no length gave 1 round (one tick
   of 5), so Cut Edge, Draw Cut, Sunder Edge, Sweep, Cleave, Pull Out and Cruelty bled for a third of what the
   Conditions table says. This is the one change that makes fights different in a way a player will feel.
2. **Heavy Bolt's push is a Body save** (it used the stop's default, the better of Guts and Athletics).
3. **Finish It** (the combat knife) counts a **Stunned** target (T), as the spec's line does.
4. **Crawler-Blooded** burns on the patron of the Blessing (T; spec item 114), not on the holder's own patron: a holder
   sworn to Nerukhan was burned by every Blessing, and one sworn elsewhere never by an ally's Nerukhan Hymn.
5. **Proving Ground, Team B:** a character on the enemy's side casts MEND and WARD at a character's bases (10 and 12),
   not the enemy caster's (25 and 30). `sigil.ts` now asks whether a character is behind the caster, not its side.
6. **Absolution** also ends Prone, Bleeding and Dazed (it uses the same `cleanseHarmful` as Everyone Home).
7. **A broken vow unlocks Shame** (the spec's and the card's trigger; nothing did it).
8. **Order refuses a Suppressed ally** (condition or Pressure), as Cue does.
9. **Rally's preview** shows 6 × Healing given × the level factor (it showed the old 20).
10. **Resupply** reloads the off-hand gun too, never takes Supplies past their maximum, and counts for the supply tag
    when prayed for an ally. **A Feint** counts for the trick tag.
11. **Linger:** a Damage design with Inverse leaves no field (it left one that hurt enemies). PROVISIONAL, item 1510.
12. **The breacher tube's blast is 60 within 1 tile** (spec table 7.5), from a new `splash_damage` field. It dealt the
    full 110 to everyone in the radius.
13. **The action list prices Full auto by the weapon** (the SMG's 3 AP; it printed 4 for every weapon).
14. **The Old Blood** claims its Blessing halving as engine-run (it was labelled the Narrator's while the engine ran
    it). **Verse of War** claims all its effects (the audit effect is gone from data).
15. Strings: the taboo chip of the Toll-Keeper and the Matchmaker reads "KILL (the surrendered or Downed only)"; Case
    Closed's log line names the +20%; the shelved Through and Fed texts read the stage table; a shot's event carries
    its own to-hit `step`, and the client's Burst flick shows that number (it showed −2 for a character's −4).

### 7.3 Golden lines re-recorded (on purpose, `GOLDEN_RECORD=1`)

Four lines of `packages/engine/test/golden/enemies.json`, all from change 12 (the second fighter in the blast):

| Line | Was (explosion on the bystander) | Now |
| --- | --- | --- |
| `enemy/boss/breacher_tube/L1/blast` | 117 | 57 |
| `enemy/boss/breacher_tube/L6/blast` | 134 | 66 |
| `enemy/boss/breacher_tube/L12/blast` | 167 | 84 |
| `enemy/boss/breacher_tube/L20/blast` | 225 | 116 |

No other golden table moved (weapons, flat, faith, outburst, builds, items: all pass unchanged). The Bleeding change
moved none: a golden line is one action, and the two extra ticks come on later turns, so **the tables do not measure
it** (15 HP more from every technique that leaves a target Bleeding). **A Boss with a breacher
tube is weaker against a bunched squad than the rules 1.15 table was fitted with**; the balance pass should look.

### 7.4 Revived assertions that failed

None in this pass. (The first pass revived ten; all passed.)

### 7.5 Not fixed, and why

| Id | Why |
| --- | --- |
| everything after `tag-desecrate-corpse-damage` in the list (about 140 findings) | never received (7.0) |
| `together-duration` | The Hymn ticks on each ally's own turn, so it does not last "until the caster's next turn". The fix is a caster-keyed state like Hold the Gate; not a small hunk. Item 1513 (n). |
| `tags-supply-protect-trick-never-fire` | Partly: Resupply and Feint now tag. The general Brace, Interpose, an item handed over and cover placed do not; each needs an emit in a file another agent is refactoring. Item 1513 (o). |
| `one-breath-plus4-and-no-range-halving` | The card is now true ("+1 more to hit"). Whether the total is +3 or +4, and the range-band halving, need a ruling: item 1508. |
| `servo-fist-wall-bonus`, `rotary-minus2-and-movement`, `spin-up-ap`, `narrator-grants-ap-discounts`, `quick-property-text-vacuous`, `heavy-property-3ap`, `modes-single-not-enforced`, `rip-saw-fuel`, `spellslinger-requires`, `eyes-in-the-back-flank-pressure`, `siege-engine-shove-discount`, `spec-momentum-guard-points` | Each needs Leon's ruling on which side moves; the verifier said so. All in item 1513, with what each side says. Nothing guessed. |
| `fire-sermon-trigger` (the engine half) | The card is fixed. That the hook fires once per target and not for Whispers is item 1509. |
| `effects-omit-combat-form`, and the Guard effect of `siege-engine-shove-discount` | These ask for new `effects[]` entries that nothing reads. An unread mirror field is exactly what went stale; the handlers claim their effects by index, so adding entries is also not free. Only Bone Talk's `ap_cost` (2) and Blueprint's `uses` (once a scene) were set. |
| `traits-adjudication-vs-engine-verdict` (the code half) | The 11 labels are fixed in data. `verdictOf` still calls 16 engine traits "both" because it counts a Narrator note that is only colour (item 1101): a change to `effects/coverage.ts`, item 1514. |
| `grand-staff-range` | The spec row has its note. `range_tiles` was left at 1: for a `mana` weapon the engine reads that field for its attack, unlike a melee weapon's. Reach should be read from one place (the finding says so); that is a refactor. |
| `smg-rake-vs-spray-and-pray` (Rake's own Auto line) | The action list is fixed. Rake's Auto line still costs a flat 4 on the SMG while plain full auto costs 3. |
| `conds-two-tables-names`, `conds-family-of-states` | One table read by the engine is the fix, and it is a refactor of `magic.ts` `CONDS`. Item 1513 (p). The data's `null` family is the truer statement and stays. |
| `spec-cond-table-missing` | Rows for Smitten, Scorned, Hopeful, Last Turn, Guarded and Inspired are a spec addition: Leon's. Smitten and Scorned wait in `tools/spec_tables_known.json`. |
| `focus-durability-missing`, `payload` (half of `payload-special-ammo-ap-cost`), `mwf-unmoving-inert`, `weapons-missing-from-starter-table` | The verifier rated these not a mismatch or not decidable. |
| `thrown-range-fields-dead` | `thrown_range_tiles` is gone and the notes say the `throwable_N` properties give no range. The properties themselves stay (code keys on the prefix). |
| `mods-foregrip-wrapped-grip-not-run`, `torch-flare-pavise-not-run` | Not built. Their `adjudication` no longer says engine (`narrator` or `hybrid`, with a `built` marker). |

### 7.6 The review of the first pass, point by point

1. **The text-number guard was too weak.** Rebuilt: section 8.a. Mutation-tested.
2. **Three CLAUDE.md statements.** Fixed: the "Superseded" sentence now says some stale lines carry a note and many do
   not; the open items are described by the markers they really carry, with no hard count; "+0.2" is rules 1.19's, and
   the Mana paragraph no longer states two stage tables and two bases as current.
3. **`surprise_round`.** Restored in `rules.json` as the spec has it, with `built: false` and a note, like high ground
   and full auto. The spec's note no longer says "Superseded" ahead of the ruling.
4. **Stray hunks.** (a) The six comment-only edits outside the 34 are taken back out (`calls/core.ts:6`,
   `character.ts` free Pumps and `levelGains`, `combat.ts` and `hazards.ts` doc comments). **They are true and the
   old text is stale**; they were removed only because other worktrees are refactoring those files. Whoever merges
   last should put them back: a Call reaches 4 tiles + 1 a point; no Core points since rules 1.13; passive Vigilance is
   10 + its points; the old free-Pump line is dead. (b) `per_point.effects` is deleted from all 27 skills (nothing read
   it). (c) The four spec table edits stay: the task asks for missing weapons to be added to the spec's table, and the
   three values are the spec's own later revisions. **The new row "Bite and claws" in 7.9 is a spec addition made from
   data: Leon should see it.**
5. **The grandfathered Empathy 50%.** The old baseline is gone; the new one cannot absorb a regression (8.a, ceiling).
6. **Skill unlocks 7, 9 and 10** said the old perk rule on all 27 skills. They state the perk step and the Mastered perk.
7. **`price-list.test.ts`** said Analysis and Proficiency; it and its generated doc say Acuity and Improvisation.
8. **Counts.** The first pass revived ten `expect`s (its commit message said nine).
9. **`protodata.json`** is one line, so any text change rewrites it: on a conflict, rebuild
   (`python3 design/canvas-build/build.py --web`), never merge by hand.

Each other guard weakness: section 8, under the guard it belongs to.

## 8. The guards as they stand

All run in `npm run check`. `npm run check -- web` now also runs the screen-data check and the test lint.

### 8.a Texts read their numbers (`tools/text_numbers.py`, `packages/engine/src/datatext.ts`)

**A number in a data text is a `{=placeholder}` that names a field of its own item**, filled when the data loads:

    "Deals +{=grants.effect.mult|more}% damage to a target that is Dazed, Stunned, Bleeding or Downed."
    "Light Up: spend {=effects.0.ap} AP ..."          "{=effects.2.value} Athletics"   (prints −1)

- Path: keys and indexes joined by dots, from the item (the nearest object with an `id`); a leading dot starts at the
  object holding the text. Formats: `abs`, `signed`, `pct` (0.25 → 25), `more` (1.25 → 25), `less` (0.75 → 25).
- The `=` keeps them apart from the engine's own `{name}` templates in the patrons' lines.
- **Three programs fill them the same way:** the engine (`datatext.ts`, imported first by every file that imports a
  data JSON, so no code sees an unfilled text), the validator, and `build.py` for `protodata.json`.
  `test/datatext.test.ts` renders every text with the engine and with the Python tool and compares.
- **The check:** a digit typed into a text (`text`, a trait's `upsides` and `downsides`, a Sigil word's `grand`) is an
  error unless it is in `tools/text_numbers.json`: `allow` (a reason each; empty today) or `baseline`.
- **The ratchet:** `baseline` is `{key: count}` for the bare numbers of today, with a `ceiling` (its size). A new key, a
  higher count, or a baseline over its ceiling is an error; a key that is gone must be dropped
  (`python3 tools/validate.py data --shrink-text-baseline`, which also lowers the ceiling). Nothing raises the ceiling.

**Today: 855 numbers bound, 1,432 bare in the baseline, 1,654 texts read.** They were bound by `tools/once/bind_text_numbers.py` (kept: run it again after adding fields, then shrink the
baseline; it is idempotent), which
only took a field when it was the one candidate: same unit (AP, MP, rounds, tiles), and for a unitless number a word of
the field's own name, op, stat or skill within a few words of the number. About 75 bound texts were read by eye; three looked like coincidences and were unbound again (Quick Read's
"costs 1 AP" on a −1 modifier, Foundation, one of Squad Anchor's). Expect a few more of that kind among the 855.

**Mutation test (run it: `python3 tools/text_numbers.py --mutate`; the engine suite runs it too):**

| Mutation | Tried | Caught |
| --- | --- | --- |
| +1 on a field a placeholder reads: the rendered text must change | 855 | 855 |
| a digit typed into a text (once a number the text does not hold, once a second copy of one it does) | 2,445 | 2,445 |
| +1 on a bare number already in the baseline (its key changes, so it is new) | 1,432 | 1,432 by construction |

The first run caught the test's own blind spot: two fields of −0.5 read with `|abs` (−0.5 + 1 = 0.5 prints the same).
So a negative field now prints its own sign and `abs` is kept for words like "lose 2 Strain".

**What it still cannot see.** A bound text and its field wrong together against the engine (the field is only as true
as whatever reads it). The 1,432 bare numbers when the ENGINE changes and the text does not: most of them live only in
a TypeScript hook. That is the real remaining work (spec item 1515): give each a field that the hook and the text both
read. Numbers in words ("twice", "half"). `rules.json` prose and `attributes.json` formula strings (no item, no field).
A placeholder bound to the wrong field by the script: it renders right today and would follow the wrong field.

To extend: a new text key goes in `TEXT_KEYS`; a new format in `fmt()` here AND `fmtNumber()` in `datatext.ts` (the
test compares them); a data file with no rules text in `SKIP_FILES`.

Also in `validate.py` now: `attributes.json`'s skills map must equal `skills.json` (it went stale once).

### 8.b The test lint (`packages/engine/test/test-lint.test.ts`)

Answering the review: `swallows()` now also sees an assignment or an increment that ends in a semicolon, an `await`, an
`assert`, a call at the end with no semicolon when words come before it, and a semicolon followed by the start of a
statement. String blanking is a small scanner that also blanks regex literals, so a quote inside `/it's/` no longer
hides the rest of the line. Shelved tests: `it.skip.each(`, `it.concurrent.skip(`, `xit(`, `xdescribe(`, `it.fails(`,
`runIf(false)`, `(false ? it : it.skip)(`. A dated reason needs a date and at least three more words. Each shape the
review named is one of the lint's own test cases. Still not seen: an early `return` in a test, vitest `exclude`
patterns, and a statement in a comment that looks like prose. `npm run check -- web` now runs the lint (it walks the web's and
the browser suites' tests); `npm run check -- -t <name>` is a targeted run and skips it, with the data checks, by design.

`text-number-truth.test.ts`: the table of old skill names builds itself from data (an id in title case that is not the
name), so all five renamed skills are covered and a sixth would be the day it is renamed; it reads the client and the
price-list tool as well as the engine. The wiki rank test now also compares the engine's rank gates with
`classes.json` itself.

### 8.c Screen data freshness (`build.py --web --check`)

Unchanged, and no other freshness test exists in this worktree. It proves `protodata.json` is what the data builds,
not that it is right; `build.py` now fills the placeholders, so a `{=` in the built file would be a bug (there is none).

### 8.d The spec's tables (`tools/check_spec_tables.py`)

Answering the review: a row is matched by its exact name or `ALIAS` (no near match); a cell with no number against a
number in data is a difference for every column; a number in the spec for a field the weapon lacks is a difference; a
column header that is neither compared nor in `NOT_COMPARED` is an error; exactly 12 weapon tables must be read; the
floor is 480 cells of 499. It still reads a cell by its first number, cannot see a number moved in prose, and does not
read the mods, armour, items, techniques, Derived stats, skills, XP or class tables. No row needed a stop in this pass.

## 9. Before relying on the second pass

- `python3 tools/validate.py data` prints `0 errors`; `npm run check` is the gate. **On the day, the machine was under
  load from other worktrees (load average 25 to 30) and tests with a 5 second limit timed out at random**
  (`balance-sim`, `balance-baseline`, `engine.test.ts` "keeps voices private", the web's `fx/elements`). Each passes
  alone, and the last run of the pass, once the load had fallen, was **ALL GREEN** (3,377 engine tests, 989 web tests).
  A red `balance-sim` or `fx/elements` line that says "timed out in 5000ms" on a busy machine is this, not a bug.
- Merging with the other worktrees: every engine file that imports a data JSON gained one line at the top
  (`import './datatext'`); `magic.ts`, `sigil.ts`, `faith.ts`, `combat.ts`, the `perks/` and `classes/` files have
  one-line hunks and comment fixes. The data files changed heavily (855 placeholders): a conflict in a data text is
  resolved by taking the other side's words and keeping the placeholder.
- A new data file with texts must be added to the list at the bottom of `datatext.ts`, or its placeholders reach the
  screen unfilled (`datatext.test.ts` checks perks, weapons and traits only for that).
- Leon's rulings wanted: items 1500 to 1502 (first pass) and 1503, 1505, 1506, 1508, 1509, 1513 (second).
