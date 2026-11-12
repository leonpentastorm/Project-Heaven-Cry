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
| `archetypes.json` | 46 | Creation presets, guidance only: 9 families including All-in (7/1/1 builds); each archetype spends every creation point (10-point skill preset, all 9 attributes, 3 cores; `tools/archetype_fill.py`) plus class leans |
| `traits.json` | 74 | Max 2 at creation; upsides, downsides, excludes, Narrator hooks |
| `perks.json` | 106 | 54 Acquired (2 per skill; one perk step at each Mastery level 3/5/7/9: a Tier I or an upgrade to Tier II), 27 Mastered (one per skill, automatic at 10; provisional), 19 Achieved (combo perks: Mastery 2 in each listed skill plus a deed), 6 Ultimate (secret until granted) |
| `conditions.json` | 29 | Debuffs (body, brain or heart family), helpful states, Downed |
| `weapons.json` | 20 | Starter weapons: damage, range in tiles, AP, ammo, properties, mastery family |
| `weapon_mastery.json` | 10 families, 30 perks | Weapon mastery by kills: levels 0–5 (attack bonus, perk tier) and one weapon perk per family per tier; **provisional numbers** |
| `items.json` | 1 | Items with rules of their own: Essence of Experience (100 XP, cracked by a Mastery 2 Evoker or Emanator user); **provisional numbers** |
| `sigils.json` | 40 | Sigil words in five groups (Subjects: element, affliction, boon, working; Reach; Delivery; Burst; Filter), the rules-1.4 grammar, element identities and enemy casters' default words; **provisional numbers** |
| `soul_modules.json` | 4 schools, 20 modules | Soul spell construction, MP, Strain; **provisional numbers** |
| `patrons.json` | 3 | Nerukhan plus 2 invented patrons (flagged); blessings by Faith tier; **provisional numbers** |
| `effect_ops.json` | 132 | Registry of every effect op: tier (50 core, 82 bespoke), parameters, who uses it, an example |
| `loot_tables.json` | 5 tables | Drop tables (rules 1.9, World Play 1.1): tables by enemy kind (`person`, `machine`, `caster`, `beast`) and the bosses' `notable`, rolls by tier, the per-fight caps, the worn-weapon range, natural weapons and 20 personal effects; the engine rolls them (`packages/engine/src/loot.ts`); **provisional numbers** |
| `techniques.json` | 58 techniques | Physical 2.0 (rules 1.12): 27 melee and 31 ranged techniques (`system`, `group`, `ap`, `rounds`, `needs`, `text`, `lines` by weapon property, `free`, `comes_with`, `home` / `particular`, `aim`, `numbers`), and `rules` (Momentum, Pressure, ready slots, drill, starting picks, property texts). Each weapon in `weapons.json` has a `phys` block (`system`, `props`, `hits_with`, `scales_with`, `teaches`). **Every number is provisional** until the balance pass |
| `calls.json` | 9 Calls | Calls (rules 1.13, Skeleton 2.0): the nine gamma skills' speech actions in a fight, one per skill (`skill`, `kind` helping or hindering, `aim`, `save`, `text`, three `steps` with their `numbers`), and `rules` (the shared ladder: cost, reach, the steps' points, the reaction, the free Call, the one-a-round limits). Enemy tiers in `enemies.json` list `calls` and a `call_level`. **Every number is provisional** |
| `actions.json` | 17 basic actions | The basic actions of a fight that no other file describes (Move, Sprint, Disengage, Prone, Shove, Shoot an object, Pull free, Pick up, a door, a stim, the song, Put out the fire, Break free, Recover, Reload both, Hide, Analyze): `name`, `text` with `{tokens}` the engine fills, `tab`, the reducer's `type`, the base `ap` and the `site` items price it under. The engine's `basicActions()` is the only reader; the client prints its rows and holds no cost. `rule` names the same action in `rules.json` and the validator checks the two agree. `costs` is the base AP of every other engine verb (Brace, Load, Reload, Clear jam, Throw, Parley, magic's verbs…) and `resources` lists what an action can cost besides AP (charge, MP, Supplies…): the engine prices and pays every action through `effects/cost.ts` and types no cost of its own |
| `perk_cards.json` | 67 triggers | The perk card in a fight (rules 1.14): for each perk (by tier), trait and skill perk that names the moment it works, that `trigger` in the card's own words (`standing: true` when it is a state, not a moment); `core_wired` (items the core rules look for by id) and `private_count` (limited passives whose count the card can't read). Read by the engine's `perkCards()`; nothing reads a trigger out of card prose |
| `maps.json` | limits, legend, 1 layout | Maps (rules 1.16): the size limits (26 at most, 8 at least, **provisional**), deployment (10 to 14 tiles), the legend for a map drawn as rows of characters, and the shared open-ground layout (26 × 26). A campaign zone names a layout or draws its own (`docs/design/campaign-format.md`) |

## Loading order
`rules` → `attributes` → `skills` → `conditions` → `effect_ops` → `weapon_mastery` → `weapons`, `items`, `sigils`, `soul_modules`, `patrons` → `traits`, `perks` → `classes`.
All cross-references are by id. Run `python3 tools/validate.py data` after any edit; it must report 0 errors.

## Engine vs Narrator
Every rule-bearing item has `adjudication`:
- `engine`: the engine resolves it fully. The Narrator (AI DM or human) only narrates the result.
- `hybrid`: the engine applies the numbers, and the Narrator decides whether the trigger happened (for example, "when an ally is insulted").
- `narrator`: pure judgement. Send the item's `text` to the Narrator as context.

For the AI DM, send the relevant items' `text`, plus the `narrator_owns` list from `rules.json`, as the system context. Never let the model set numbers the engine owns.
