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
  "bespoke" ops (about 80, about 10% of all effect uses) belong to one or two items. Implement a bespoke op as a hook on that item,
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

## Requirements
`requires`: array of `{"skill":"<id>","min":n}`, `{"attr":"<id>","min":n}`, `{"core":"<id>","min":n}`,
`{"perk":"<id>"}`, `{"class":"<id>"}`, `{"deed":"<free text the Narrator checks>"}`, `{"patron":true}`.
`excludes`: array of ids this can't be taken with.

## Text
English, in-universe where the doc is in-universe. No pop-culture references. Keep numbers exactly as the source doc states them; if the source conflicts with the Core Rules spec, the spec wins and you log the conflict in your report.
