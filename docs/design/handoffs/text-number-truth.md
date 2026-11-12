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
