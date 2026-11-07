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

## Requirements
`requires`: array of `{"skill":"<id>","min":n}`, `{"attr":"<id>","min":n}`, `{"core":"<id>","min":n}`,
`{"perk":"<id>"}`, `{"class":"<id>"}`, `{"deed":"<free text the Narrator checks>"}`, `{"patron":true}`.
`excludes`: array of ids this can't be taken with.

## Text
English, in-universe where the doc is in-universe. No pop-culture references. Keep numbers exactly as the source doc states them; if the source conflicts with the Core Rules spec, the spec wins and you log the conflict in your report.
