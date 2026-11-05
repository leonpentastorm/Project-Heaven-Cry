# Project Heaven Cry: data pack v1.0

Machine-readable rules for the PHC web game. The human-readable source of truth is **PHC Core Rules v1.0 (Game Spec)**: where a file and the spec disagree, the spec wins and the file is the bug.

Read `CONVENTIONS.md` first. It covers ids, effect ops, requirements, and engine vs Narrator adjudication.

## Files

| File | Items | What it holds |
|---|---|---|
| `rules.json` | (object) | Every constant: d20 and the TN ladder, skill Voices, Overreach (indulge/resist), Echo, the XP table, AP economy, the 1.5 m grid, initiative, the action table, derived-stat formulas, damage and armour, rest, mana-meter bands, Flux, Strain, blessing tiers, levelling, multiplayer (4 per room), and the lists of what the engine owns and what the Narrator owns |
| `attributes.json` | 9 + 3 cores | Attributes with their α/β/γ skills and derived-stat formulas; cores with their economies |
| `skills.json` | 27 | Slot, per-point effects, unlocks at 3/5/7/9/10, Overreach, voice card, which classes count the skill as a signature |
| `classes.json` | 13 base, 15 advanced | Signatures, economy, role, resource, rank I–III moves; advanced parents, tutor and moves; `assignment` holds the level-3 closest-class rule as data |
| `archetypes.json` | 37 | Creation presets, guidance only: 8 families; each archetype spends every creation point (10-point skill preset, all 9 attributes, 3 cores; `tools/archetype_fill.py`) plus class leans |
| `traits.json` | 74 | Max 2 at creation; upsides, downsides, excludes, Narrator hooks |
| `perks.json` | 76 | 54 Acquired (2 per skill, Tier I at 3 points and II at 7), 16 Achieved (combo plus a deed), 6 Ultimate |
| `conditions.json` | 29 | Debuffs (body, brain or heart family), helpful states, Downed |
| `weapons.json` | 20 | Starter weapons: damage, range in tiles, AP, ammo, properties, mastery family |
| `weapon_mastery.json` | 10 families, 30 perks | Weapon mastery by kills: levels 0–5 (attack bonus, perk tier) and one weapon perk per family per tier; **provisional numbers** |
| `items.json` | 1 | Items with rules of their own: Essence of Experience (100 XP, cracked by a Mastery 2 Evoker or Emanator user); **provisional numbers** |
| `sigils.json` | 24 | Sigil words (element, effect, form, motion, modifier) and the grammar; **provisional numbers** |
| `soul_modules.json` | 4 schools, 20 modules | Soul spell construction, MP, Strain; **provisional numbers** |
| `patrons.json` | 3 | Nerukhan plus 2 invented patrons (flagged); blessings by Faith tier; **provisional numbers** |
| `effect_ops.json` | 132 | Registry of every effect op: tier (50 core, 82 bespoke), parameters, who uses it, an example |

## Loading order
`rules` → `attributes` → `skills` → `conditions` → `effect_ops` → `weapon_mastery` → `weapons`, `items`, `sigils`, `soul_modules`, `patrons` → `traits`, `perks` → `classes`.
All cross-references are by id. Run `python3 tools/validate.py data` after any edit; it must report 0 errors.

## Engine vs Narrator
Every rule-bearing item has `adjudication`:
- `engine`: the engine resolves it fully. The Narrator (AI DM or human) only narrates the result.
- `hybrid`: the engine applies the numbers, and the Narrator decides whether the trigger happened (for example, "when an ally is insulted").
- `narrator`: pure judgement. Send the item's `text` to the Narrator as context.

For the AI DM, send the relevant items' `text`, plus the `narrator_owns` list from `rules.json`, as the system context. Never let the model set numbers the engine owns.
