# PHC data conventions (v1.0)

Every JSON file in this folder follows these rules so the web engine can load them blind.

## File shape
```json
{
  "$schema_version": "1.0",
  "kind": "<skills|traits|perks|classes|...>",
  "source": "<name of the Claude Doc it was built from>",
  "items": [ ... ]
}
```
`rules.json` is the exception: it is one object of constants, not an `items` list.

## IDs
- lowercase snake_case of the English name: "Reaction Speed" -> `reaction_speed`, "Lore Master" -> `lore_master`.
- Cores: `body`, `mind`, `soul`.
- The 27 skill ids (fixed, use exactly these):
  dexterity, vigilant, reaction_speed, athletics, raw_power, guts, durability, pain_threshold,
  sensory, camaraderie, proficiency, ingenuity, intimidation, brain_power, visualization,
  rumination, composure, analysis, eloquence, charisma, will_power, empathy, lore_master,
  conscience, faith, implication, authority
- Cross-references always use ids, never display names.

## Effects: engine vs Narrator
Every rule-bearing item carries both:
- `text`: the player-facing rule text, in-universe voice, verbatim or lightly tidied from the doc.
- `effects`: array of machine-readable effects the engine applies. Use only these ops
  (add a new op only if nothing fits, and list it in your report):
  - `{"op":"skill_mod","skill":"<id>","value":n}` flat bonus to rolls with that skill
  - `{"op":"skill_mod_tag","tag":"<alpha|beta|gamma|core:body|attr:<id>>","value":n}`
  - `{"op":"stat_mod","stat":"<hp|ap|ap_max|move|armor|init|mp_max|echo_max|...>","value":n}`
  - `{"op":"tn_mod","context":"<string>","value":n}`
  - `{"op":"advantage","context":"<string>"}` / `{"op":"disadvantage","context":"<string>"}`
  - `{"op":"grant_action","action":"<id>","ap":n,"uses":"<at_will|per_scene|per_rest|per_session>"}`
  - `{"op":"resource","resource":"<echo|ammo|mana|core|mp|flux|strain|faith>","value":n,"when":"<trigger>"}`
  - `{"op":"condition","condition":"<id>","target":"<self|target|ally|area>","when":"<trigger>"}`
  - `{"op":"narrator","note":"<what the Narrator must judge>"}` for anything the engine can't adjudicate
- The full op list lives in `effect_ops.json`. "core" ops (50) are generic and the engine must implement them;
  "bespoke" ops (113, about 14% of all effect uses) belong to one or two items; the weapon (17), item (11) and Sigil (1) tiers are the ops of weapon skills, items and Sigil words. Implement a bespoke op as a hook on that item,
  or until then hand the item's `text` to the Narrator. An op the engine doesn't recognise always falls back to
  the Narrator; it is never silently ignored.
- Effects may also carry `when`, `context`, `duration`, `target`, `uses`, `limit` keys to scope them.
- A condition reference may be a list plus `"choose": 1`, or `"family:<body|brain|heart>"` for any condition of that family.
- If an effect is pure judgement, `effects` is `[{"op":"narrator","note":"..."}]`.
- `adjudication`: `"engine"` (fully automatable), `"hybrid"`, or `"narrator"`.

## Weapon handling (weapons.json)
- `reload`: `"magazine"` (swap a magazine, speedloader, drum or belt: `reload_unit` names it) or `"loose"` (round by round);
  absent or null: the weapon doesn't reload. `reload_ap`: the reload's AP when it isn't 2 (the breacher tube: 3).
- The weapon-granted actions (Reload, Load a magazine, Clear jam, Brace, Field Repair, Overwatch) follow from the data
  (engine `weaponActions`): Clear jam only for weapons with a `heat_limit` (others fumble on a natural 1 instead), Brace only
  for `requires_braced_or_prone`, `minus2_to_hit_unless_emplaced` or a `braced_bonus` grant, Field Repair only with `durability`.
- `handling` (optional): `{"grant": ["clear", "brace"], "deny": ["load"]}` overrides that, by action id
  (`reload`, `load`, `clear`, `brace`, `repair`, `overwatch`, `burst`, `auto`, `skill`).

- `damage_type` (rules 1.3): `physical` (default), `elemental`, `fire`, `lightning`, `emp`, `sigil`, `soul`, `true`. Fire and lightning
  count as Elemental for Elemental damage taken. `explosive: true` for grenades, launchers and satchels; `area_radius_<n>`
  in `properties` gives the blast radius. `tags`: `electronic`, `evoker_linked`, `lever` (items read them).
- Special ammo (rules.json `weapons_rules.ammo_types`): items with `ammo_type` (`ammo_armor_piercing` etc.) are loaded out of
  combat; a pack magazine entry may carry `magTypes` (one per spare magazine, null for standard).

## Shared subsystems (rules 1.3)
- `start_item` (traits): an items.json or weapons.json id; an item with `category: "armour"` and a `slot` is worn at creation.
- `enemies.json` `companions`: stat blocks for companions (`id`, `kind`, `hp`, `defense`, `attack_bonus`, `armour`,
  `movement`, `weapon`), used by a character's `companions: [{id, kind, name, hp?}]`.
- `objects.json` `electronic: true` marks devices (terminal, lamp, camera, alarm, turret).
- Condition ids the engine runs are the ones in conditions.json (the long Brain-debuff ids are accepted for `ldebuff`/`rdebuff`).
- **Conditions (conditions.json) are THE table** (engine foundations 2, 12 Nov 2026): the engine has no other. `packages/engine/src/condtable.ts`
  is its one loader; `tools/validate.py` checks every field below; `packages/engine/test/lint-conditions.test.ts` fails on a condition id
  in code that has no row, and on a row nothing uses. A row:
  - `engine`: how the engine keeps it. `"table"` (in a unit's conditions with its rounds left; `applyCond` puts it on, `endCond` ends it),
    `"flag"` (a field of the unit: Bleeding, Dazed, Prone, Hidden, Injured; still only through `applyCond` / `endCond`), or `"state"` (a unit
    state with its own rule and setter in `unitstate.ts`: Braced, Overwatch, Downed; `applyCond` does not put it on).
  - `kind`: `"debuff"` (has a `family`) or `"state"`. `family`: `body` / `brain` / `heart`, or `null`. `save`: `true` (the target rolls its
    family's save unless the source says there is none) or `false`. `boon: true`: a help; never saved against; no family.
  - `duration`: exactly one of `{"rounds": N}` (ONE unit: the ends of the bearer's own turns; one put on during the bearer's own turn does not
    lose a round at that turn's end) or `{"until": "<word>"}` (it lasts until its rule ends it: `put_out`, `next_turn`, `stand`, `revealed`,
    `source`, `moved`, `fight_end`, `stabilised`, `escape`, `recovered`, `treated`, `repaired`, `raised`). `ends_on` stays prose.
  - `key`: the name it is stored under in a unit's conditions when that is not the id (`ldebuff`, `rdebuff`: saved fights hold them).
    `aliases`: other ids the engine answers to. `label`: the word in "X is <label>" when it is not the `name` ("Afraid", "Guarded (+2 Defense)").
  - The numbers the engine applies are read from `effects`, so they are written once: `stat_mod` with `stat` `defense`, `move_mult`, `vision`,
    `ap`, `save_<family>`, `damage_dealt_pct`, `sigil_ap`, `soul_cost_pct`; `skill_mod_tag` (`core:<core>`, `attr:<attribute>`); `attack_mod` with
    `context` `own_attacks` (default), `next_attack`, `not_vs_source`, `vs_source`, `marker_squad_vs_self`, `melee_vs_self`, `ranged_vs_self`;
    `damage_mult` with `context: "next_attack"`. A to-hit change is always `attack_mod` (not `tn_mod`). Damage each turn is `amounts.tick`.
- Campaign zones may carry `tags`, `terrain`, `in_city`, `urban`, `fear`, `upper_realm`, `faction`; zone NPCs `kind` and `tags`.

## Sigil words (sigils.json, rules 1.4 and 1.10)
- Each word carries `inflection` (rules 1.10, Sigil 1.5): `{"text": "...", "effects": [{"op": "inflection", "stat": "<stat>", "value": n}], "provisional": true}`,
  the small upgrade a Mastered word (30 uses) gives its caster. `stat` is one the engine runs: `cond_rounds`, `save_tn`, `to_hit`,
  `damage_pct`, `push_tiles`, `shield_pct`, `heal_pct`, `charge`, `flux`, `lasts_rounds`, `radius`, `teleport_tiles`,
  `barrier_hp_pct`, `move_tiles`, `range`, `turret_def`, `pull_tiles`, `jump_radius`, `leech`, `mult`, `radius_at_4`,
  `cone_length`, `spare_downed`. Any other stat goes to the Narrator with the `text`.
- `grammar.study` (study per Evoke, thresholds, copying, Mastery study) and `grammar.word_mastery` (Practised and Mastered
  use counts) hold the growth numbers; both are provisional.
- `grammar.shape.junction` (rules 1.10): the Junctions gate (`gate_skill`, `gate_points`: Brain Power 10), provisional.
- `objects.json` `sigil_mark` carries `mark`: the Investigate approach the engine writes on every mark (`label`, `skills`,
  `pick: "best"`), the `ages` and `damages`, their defaults, the TN table `tn[age][damage]` (8/12/16/20 only) and the
  `study` a success gives. Campaign marks give `word` (a sigils.json id) and optional `age` and `damage`; the validator
  checks them.

## Physical techniques (techniques.json, rules 1.12)

- One file for both systems. `system` is `melee` or `ranged`; `group` is one of the system's five (`rules.groups`): opener, strike, link, finisher, answer; fire, press, set, take, watch.
- `ap`: `{ "base": "weapon", "add": 0 }` (the weapon's attack cost, plus `add`), `{ "base": "flat", "value": 1 }`, or `{ "base": "reaction" }` (Answers only). Optional `mode` (`shot`, `aimed`, `burst`, `auto`; every flat-cost ranged technique that fires has one): the attack this cost is priced as for items that change an attack's AP (a weapon-based cost is priced as a melee strike or a shot). `rounds` is what it burns in all (`"all"`: the whole magazine); melee techniques burn 0.
- `text` is the base effect, which works with any weapon of the system. `lines` are the "with the right weapon" riders: `props` (one or more weapon properties; `match: "all"` when every one is needed), `text`, and optionally `when: "braced"`, `ap` (added cost when the line applies) and `stack: true` (applies as well as the chosen line). When two lines match a weapon the player picks one.
- `free: true`: everyone knows it and it takes no ready slot. `comes_with`: weapons with one of these properties always offer it. `home` and `particular`: a particular technique used with a weapon that has none of its home properties is weaker (`rules.off_home_penalty`, no line). `not_with`: properties whose weapons can't use it.
- `aim` is what the player picks: `enemy`, `tile`, `ally`, `self`, `none` (a reaction) or `enemy+tile`.
- `numbers` holds every number the handler reads (`t.num('key', fallback)` in the engine); the text says the same numbers in words. All of them are placeholders until the balance pass: `provisional: true` on every technique.
- `rules` holds the shared numbers: `momentum`, `pressure`, `ready`, `drill`, `starting`, the stop save, and `props` (a one-line meaning per property, shown on a "?").
- Each weapon in `weapons.json` has `phys`: `system`, `props` (melee: edge point blunt hook reach heavy light bare thrown; ranged: quick auto precise spread heavy blast arc silent loud drawn thrown), `hits_with` (a skill), `scales_with` and `also_scales` (attributes or skills), and `teaches` (the technique it lends while held and teaches at drill mark I).
- Enemy tiers in `enemies.json` list the techniques they have ready: `techniques: { melee: [...], ranged: [...] }`.

## Calls (calls.json, rules 1.13)

- Nine entries, one per gamma skill. Ids are prefixed `call.` (`call.rally`, `call.spot`): the bare names are taken by techniques, class moves and unlocks.
- `skill` is the gamma that speaks it (the validator refuses any other slot and a second Call on one skill). The name shown for the skill is read from `skills.json`, never written here.
- `kind`: `helping` (aimed at an ally) or `hindering` (aimed at an enemy). `aim`: `ally`, `enemy` or `self-or-ally`. `save` (hindering only): the family the target saves with (`heart` for Threaten and Taunt; Spot has none).
- `steps`: exactly three, opening at `rules.steps_at` (1, 3 and 7 points). Each has a `text` (what the pad shows for a speaker at that step) and `numbers` (every number the handler reads: `t.num('key')` in the engine). All three steps give the same keys.
- `rules` is the shared ladder: `ap` 2, `cheap_at` 5 points for `cheap_ap` 1, `free_at` 10 points for `free_per_turn` 1 free Call, `range_base` 4 + `range_per_point` 1, `reaction_at` 9 points (`reactions_per_round` 1, `reaction_ap` 0), `save_tn` 12 (+ the speaker's strength with the skill), `helping_per_round` and `hindering_per_round` 1, `mark_rounds` (how long a Spot, Warn or Cue can outlive its round), and `enemy` (`per_turn`, and the score a Call must beat: a plain attack's 5).
- `adjudication: "engine"` and `provisional: true` on every Call.
- Enemy tiers in `enemies.json`: `calls` (a list of Call ids, empty for a tier that never Calls) and `call_level` (0 to 10: it stands in for the skill points an enemy doesn't have, and sets its cost, reach and step).
- Enemy tiers in `enemies.json`: `healer_focus` (rules 1.23): how hard the tier turns on whoever is mending the other side. 0: it never looks. Between 0 and 1: when it sorts whom to attack by HP left, the healer counts as having that share of their max HP less. 1: the healer comes first, and with a gun it steps to a tile with a shot at them. The count it reads and its window are `rules.json` `mending.tending`; the medic's kit numbers are `mending.medic`.
- Enemy tiers in `enemies.json`: the fire doctrine (rules 1.25): how the tier chooses among the targets it could attack. Every tier takes the most hurt (HP as a share of max, in tenths) and bends it with two numbers, each a share of the target's max HP from 0 to 1: `fire_spread`, by which a target counts as less hurt for each other enemy that has attacked it this round (1: one each before anybody doubles up), and `fire_near`, the same for each tile the target stands further off than the nearest one (1: always the nearest). `doctrine` names the result and is what the player is told: `nearest` (needs `fire_near`), `spread` (needs `fire_spread`) or `focus`. The healer weight (`healer_focus`) is taken off the same sum, and the healer's place is not moved by distance. Taunt, reach, sight and orders come before all of it.

## The one formula (rules.json `output`; unified damage, stage (a))
- `rules.json` `output` holds the terms of the formula every amount of damage, healing and shield is built from (`packages/engine/src/effects/output.ts`): `profiles` (`k`, `attr`, `skill`: the slopes of a Stat term; `level`: the Level column it reads, `"deal"`, `"mend"` or `null`; `pair`), `pairs` (`attrs`, `skills`: what a Stat term reads; a weapon's own pair comes from its `phys` block) and `level` (`deal`: 20 numbers, one a level; `mend`: the path of the enemy table's damage column, read and not copied).
- A system is re-fitted by changing its profile or the Level table here. Do not add a multiplier in code for it.
- A weapon mod in `items.json` that changes damage carries the number: `damage` (the blow it gives: the bayonet) or `damage_add` (what it adds to the weapon's: the weighted head +3, the suppressor −2).
- **Amount blocks (step a6).** Every number an item deals, heals or shields with is in the item's data, never in TypeScript: `"amounts": { "<name>": { "kind": "damage" | "heal" | "shield", "base": 10, "per": [{ "of": "improvisation", "value": 3 }], "profile": "flat", "type": "elemental", "armour": "half", "mults": { "share": 0.5 }, "provisional": true } }`. `base` is a number (a formula is `base` plus `per` parts: `10 + kg / 4` is `base 10, per kg 0.25`; "10% of max HP" is `base 0, per max_hp 0.1`); `mults` are the item's own named multipliers; `profile` is one of `rules.json output.profiles`. The engine reads a block with `itemAmount('<kind>:<id>', '<name>', multipliers)` (`packages/engine/src/effects/amounts.ts`); blocks that belong to no item are in `rules.json output.amounts`. A prayer's, a condition's or the medic's own heal / shield / hp effect with a numeric `value` is also the number (the kit's are `rules.json mending.medic`). The validator checks every block and that a heal or shield effect written as text has a block; `packages/engine/test/amount-literals.test.ts` fails on a new number handed to a damage, heal or shield sink from code.
- **`deal` and `mend` ops.** `{ "op": "deal", "amount": "<block name>" | { a block }, "target": … }` deals the amount (the `damage_out` hook, armour by the block's `type`, the sink); `{ "op": "mend", … }` heals or shields by the block's `kind`. An item that only deals, heals or shields a number needs no code.
- `rules.json output.systems` names, for each system (a Sigil Line, an Outburst, a prayer, the kit), its base, its Stat term and its own multipliers in the order they apply, and the data field each lives in.
- After any change here, the golden tables (`packages/engine/test/golden/`) say which actions moved. Record them anew only when a number was meant to move (`GOLDEN_RECORD=1`, see `docs/TESTING.md`).

## Requirements
`requires`: array of `{"skill":"<id>","min":n}`, `{"attr":"<id>","min":n}`,
`{"perk":"<id>"}`, `{"class":"<id>"}`, `{"deed":"<free text the Narrator checks>"}`, `{"patron":true}`.
`excludes`: array of ids this can't be taken with.

## Text
**Texts read their numbers (12 Nov 2026).** A number in a rules text (`text`, a trait's `upsides` and `downsides`, a Sigil word's `grand`) is not typed: it is a placeholder that names the field of the same item it comes from, so the card can never disagree with the field.

- `{=path}`: keys and list indexes joined by dots, from the item (the nearest enclosing object with an `id`): `{=effects.0.value}`, `{=tiers.II.ap_cost}`, `{=numbers.push}`. A leading dot starts at the object that holds the text: `{=.ap}`. The path must end at a number.
- `{=path|format}`: `abs` (no sign), `signed` (+2, −2), `pct` (0.25 → 25), `more` (a multiplier 1.25 → 25), `less` (0.75 → 25). With no format a negative field prints its own minus sign: write `{=effects.2.value} Athletics`, not `−{=...|abs}`.
- The `=` keeps them apart from the engine's own templates (`{name}` in a patron's lines).
- They are filled when the data is loaded: `packages/engine/src/datatext.ts` (the engine; every file that imports a data JSON imports it first), and `tools/text_numbers.py` (the validator, and `design/canvas-build/build.py` for the web's `protodata.json`). A test holds the two equal.
- `tools/validate.py` refuses a digit typed into a text unless it is in `tools/text_numbers.json`: `allow` (with a reason) or the `baseline` of numbers not yet bound, which only shrinks. When a number has no field, **add the field the engine reads** and bind to it; do not add a mirror field that nothing reads.
- `ap_cost` is the AP a card's chip shows. When the cost is not a fixed number it is `null` and `ap_cost_is` names it: `weapon_attack` (the AP of your weapon's attack), `twice_shot`, `reload`, `soul_cast_ap`.
- A move's `uses` may also be `reaction` (it spends your reaction; the engine counts it as at will) and `per_combat`.

English, in-universe where the doc is in-universe. No pop-culture references. Keep numbers exactly as the source doc states them; if the source conflicts with the Core Rules spec, the spec wins and you log the conflict in your report.
