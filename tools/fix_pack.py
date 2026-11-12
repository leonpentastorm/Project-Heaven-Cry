"""Normalisation pass over the PHC data pack (idempotent).

1. Adds the conditions other files reference but conditions.json lacked.
2. Rewrites family references (heart_debuff, body_family) to "family:<name>".
3. Turns pipe alternatives ("a|b|c") into lists + "choose": 1.
4. Merges exact-alias effect ops.
5. Writes effect_ops.json: a registry of every op, its tier, params and users.
"""
import json, glob, collections, pathlib, sys

root = pathlib.Path(sys.argv[1])
load = lambda f: json.loads((root / f).read_text())
def save(f, d):
    (root / f).write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")

# ---------- 1. conditions ----------
cond = load("conditions.json")
have = {c["id"] for c in cond["items"]}
NEW = [
    dict(id="grappled", name="Grappled", kind="debuff", family="body", save="body",
         text="Held by an adjacent enemy. You can't move away; attacks other than against the grappler take a −2 to the roll. Break free with an opposed Raw Power or Athletics check (2 AP).",
         effects=[{"op": "forbid", "action": "move_away"}, {"op": "attack_mod", "value": -2, "context": "not_vs_grappler"}],
         duration={"until": "escape"}, ends_on=["escape", "grappler_moves", "grappler_downed"], stacks=False, adjudication="engine"),
    dict(id="taunted", name="Taunted", kind="debuff", family="heart", save="heart",
         text="You must spend your next attack on the one who taunted you, if you can reach or see them.",
         effects=[{"op": "forbid", "action": "attack_other_than_source"}],
         duration={"rounds": 1}, ends_on=["duration", "source_downed"], stacks=False, adjudication="engine"),
    dict(id="commanded", name="Commanded", kind="debuff", family="heart", save="heart",
         text="You obey one short order (one word or one action) on your next turn, unless it would harm you directly.",
         effects=[{"op": "narrator", "note": "Pick the ordered action; refuse it if it is directly self-harmful."}],
         duration={"rounds": 1}, ends_on=["duration"], stacks=False, adjudication="hybrid"),
    dict(id="puppeted", name="Puppeted", kind="debuff", family="brain", save="brain",
         text="The caster controls your next turn's actions (AP still yours). You can't be made to harm yourself or drop to 0 HP by your own hand.",
         effects=[{"op": "narrator", "note": "Caster chooses the target's actions for one turn; no self-harm."}],
         duration={"rounds": 1}, ends_on=["duration", "damage_taken"], stacks=False, adjudication="hybrid"),
    dict(id="disarmed", name="Disarmed", kind="debuff", family="heart", save="heart",
         text="You drop or lower your weapon. Recovering it costs 2 AP (1 AP if it is in your tile).",
         effects=[{"op": "forbid", "action": "weapon_attack"}, {"op": "grant_action", "action": "recover_weapon", "ap": 2, "uses": "at_will"}],
         duration={"until": "recovered"}, ends_on=["recover_weapon"], stacks=False, adjudication="engine"),
    dict(id="injured", name="Injured", kind="debuff", family="body", save=False,
         text="A lasting wound to one location (head, torso, arm, leg). Arm: −2 to attacks with that hand. Leg: half movement. Head: −2 to Mind checks. Torso: −10 max HP. Lasts until treated at rest or by a medic.",
         params={"location": ["head", "torso", "arm", "leg"]},
         effects=[{"op": "narrator", "note": "Apply the listed penalty for the chosen location."}],
         duration={"until": "treated"}, ends_on=["long_rest", "surgery"], stacks=True, adjudication="engine"),
    dict(id="emplaced", name="Emplaced", kind="state", family=None, save=False,
         text="You've set a heavy weapon on a bipod, mount or cover edge. +2 to attacks with it and Recoil halved; moving ends Emplaced.",
         effects=[{"op": "attack_mod", "value": 2, "context": "emplaced_weapon"}, {"op": "stat_mult", "stat": "recoil", "value": 0.5}],
         duration={"until": "move"}, ends_on=["move"], stacks=False, adjudication="engine"),
    dict(id="augment_offline", name="Augment Offline", kind="debuff", family="body", save=False,
         text="One augment, prosthetic or implant stops working: it gives no bonuses and its actions are unavailable.",
         effects=[{"op": "narrator", "note": "Pick the affected augment; suppress its effects."}],
         duration={"until": "repaired"}, ends_on=["field_repair", "long_rest"], stacks=True, adjudication="hybrid"),
]
for c in NEW:
    if c["id"] not in have:
        cond["items"].append(c)
cond.setdefault("families", {
    "body": "Physical debuffs; resisted with a Body save.",
    "brain": "Mental debuffs; resisted with a Brain save.",
    "heart": "Emotional debuffs; resisted with a Heart save.",
})
cond["family_ref"] = "An effect may name 'family:<body|brain|heart>' instead of a single condition id; it means any condition of that family."
save("conditions.json", cond)
cond_ids = {c["id"] for c in cond["items"]}

# ---------- 2-4. rewrite references ----------
RENAME_COND = {"heart_debuff": "family:heart", "body_family": "family:body", "disarmed_by_will": "disarmed",
               "injury_limb": "injured", "injury_chosen": "injured"}
OP_ALIAS = {"action_cost_mod": "action_cost", "to_hit": "attack_mod", "damage_add": "damage_mod"}

def fix(o):
    if isinstance(o, dict):
        if o.get("op") in OP_ALIAS:
            o["op"] = OP_ALIAS[o["op"]]
        c = o.get("condition")
        if isinstance(c, str):
            if c in RENAME_COND:
                if c.startswith("injury_"):
                    o["location"] = "chosen" if c.endswith("chosen") else "limb"
                o["condition"] = RENAME_COND[c]
            elif "|" in c:
                o["condition"] = c.split("|"); o["choose"] = 1
            elif c == "killed":
                o.pop("condition"); o["op"] = "execute"
            elif c == "rewrite":
                o.pop("condition"); o["op"] = "convert_condition"
        s = o.get("skill")
        if isinstance(s, str) and "|" in s:
            o["skill"] = s.split("|"); o["choose"] = 1
        for v in o.values():
            fix(v)
    elif isinstance(o, list):
        for v in o:
            fix(v)

files = [f for f in sorted(glob.glob(str(root / "*.json"))) if not f.endswith(("rules.json", "effect_ops.json"))]
for f in files:
    d = json.loads(pathlib.Path(f).read_text())
    fix(d)
    pathlib.Path(f).write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")

# ---------- 5. registry ----------
CORE = {
 "skill_mod": "Flat bonus to rolls with one skill (or a choice of skills).",
 "skill_mod_tag": "Flat bonus to every skill with a tag (alpha/beta/gamma, core:x, attr:x).",
 "stat_mod": "Add to a derived stat (hp, ap, move, armor, init, mp_max, ...).",
 "stat_mult": "Multiply a derived stat.",
 "tn_mod": "Shift the target number of a kind of check.",
 "save_mod": "Bonus or penalty to Body/Brain/Heart saves.",
 "attack_mod": "Bonus or penalty to attack rolls.",
 "roll_mod_all": "Bonus or penalty to every d20 roll.",
 "roll_bonus": "One-off bonus to a specific roll.",
 "advantage": "Roll twice, keep the higher.", "disadvantage": "Roll twice, keep the lower.",
 "reroll": "Reroll a die.", "auto_success": "The check succeeds without a roll.", "auto_fail": "The check fails without a roll.",
 "gate_check": "Something can only be attempted after passing a check.",
 "action_cost": "Change (value) or fix (set) the AP cost of an action.",
 "grant_action": "Give a new action with an AP cost and a use limit.",
 "free_action": "An action costs 0 AP under a trigger.", "free_move": "Movement that costs no AP.", "free_attack": "An attack that costs no AP.",
 "reaction": "An action taken off-turn; uses the one reaction per round unless it says otherwise.",
 "interrupt": "Act before a triggering action resolves.",
 "forbid": "An action can't be taken.",
 "resource": "Gain or spend a resource (echo, ammo, mana, core, mp, flux, strain, faith, class resources).",
 "cost_mod": "Change what a spell, blessing or item costs in its resource.",
 "condition": "Apply a condition (or family:x / a choice list).",
 "cleanse": "Remove a condition or family.", "immunity": "Can't gain a condition or damage type.",
 "damage_mod": "Add flat damage.", "damage_mult": "Multiply damage dealt.",
 "damage_reduction": "Reduce damage taken by a flat amount.", "damage_taken_mod": "Change damage taken (signed).",
 "shield": "Temporary HP that absorbs damage first.", "heal": "Restore HP.", "heal_received_mult": "Multiply healing received.",
 "knockback": "Push a target a number of tiles.", "ignore_cover": "Attacks ignore a level of cover.",
 "reveal": "Make hidden things visible.", "aura": "An effect on everyone within N tiles.",
 "state": "A named toggled state with its own rules.", "extra_use": "One more use of a limited ability.",
 "price_mod": "Change buy/sell prices.", "start_item": "Start play with an item.", "xp_mod": "Change XP gained.",
 "perk_choice": "Rank-unlock hook: pick a perk tier.", "spawn_illusion": "Create a decoy on the grid.",
 "merge_action": "Two actions resolve as one for a combined AP cost.", "movement_mode": "A new way to move (climb, swim, jump).",
 "unlock_word": "Learn a Sigil word.", "word_cost": "Change a Sigil word's charge cost.",
 "narrator": "Not automatable: the Narrator (AI or human) decides using the item's text.",
}
uses = collections.defaultdict(lambda: {"count": 0, "params": set(), "used_by": set(), "example": None})
for f in files:
    stem = pathlib.Path(f).stem
    d = json.loads(pathlib.Path(f).read_text())
    def walk(o, owner):
        if isinstance(o, dict):
            if isinstance(o.get("id"), str) and "name" in o:
                owner = f"{stem}:{o['id']}"
            if isinstance(o.get("op"), str):
                u = uses[o["op"]]; u["count"] += 1; u["params"] |= set(o) - {"op"}; u["used_by"].add(owner)
                u["example"] = u["example"] or o
            for v in o.values():
                walk(v, owner)
        elif isinstance(o, list):
            for v in o:
                walk(v, owner)
    walk(d, stem)

reg = {"$schema_version": "1.0", "kind": "effect_ops",
       "how_to_use": ("Engine implements every 'core' op generically. 'bespoke' ops are used by one or two items: "
                      "implement them as a named hook on that item, or until then hand the item's text to the Narrator. "
                      "Any op the engine doesn't recognise must fall back to the Narrator, never be silently ignored."),
       "items": []}
for op, u in sorted(uses.items(), key=lambda kv: (-kv[1]["count"], kv[0])):
    reg["items"].append({"id": op, "tier": "core" if op in CORE else "bespoke",
                         "summary": CORE.get(op, ""), "count": u["count"], "params": sorted(u["params"]),
                         "used_by": sorted(u["used_by"])[:12], "example": u["example"]})
_old = json.loads((root / "effect_ops.json").read_text()) if (root / "effect_ops.json").exists() else {}
if "item_ops" in _old: reg["item_ops"] = _old["item_ops"]  # the closed lists of item ops (engine foundations 3): written from the engine's code, kept
save("effect_ops.json", reg)
core_n = sum(1 for x in reg["items"] if x["tier"] == "core")
print(f"conditions: {len(cond_ids)}; ops: {len(reg['items'])} ({core_n} core, {len(reg['items'])-core_n} bespoke)")
print("bespoke uses:", sum(x["count"] for x in reg["items"] if x["tier"] == "bespoke"),
      "of", sum(x["count"] for x in reg["items"]))
