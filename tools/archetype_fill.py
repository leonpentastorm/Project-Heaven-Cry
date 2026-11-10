"""Fill every archetype's Attribute and Core budgets (spec: Creation budget; decision 49).

Usage: python3 tools/archetype_fill.py data
Each archetype's preset places its 10 Skill points. This script places the rest of the
creation budgets so that picking an archetype leaves nothing to spend: Attributes the
preset's skills need first, then the archetype's role priority (EXTRA below), round-robin,
raising a Core when an Attribute is at its cap, trading a spare Core point for 2 Attribute
points only when the Attribute points run out. Spare points never leave the role's priority list. Writes `attributes` and `cores` per item.
"""
import json, pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "data")
rules = json.loads((root / "rules.json").read_text())["character"]["creation"]
ATTR_PTS, CORE_PTS = rules["attributes"]["points"], rules["cores"]["points"]
TRADE = rules["cores"].get("unspent_core_point_trades_for_attribute_points", 0)  # rules 1.11: the trade is gone
CAP = 10  # no creation caps beyond the tree's own (decision 50)
skills = {s["id"]: s for s in json.loads((root / "skills.json").read_text())["items"]}
attrs = json.loads((root / "attributes.json").read_text())["items"]
CORE_OF = {a["id"]: a["core"] for a in attrs}
ALL = [a["id"] for a in attrs]

# Where each role puts points its skills don't need (after the attributes the skills use).
# Regular presets spread over at least two Cores (Leon); the last entry is often the second Core's attribute.
# Only the All-in family goes single-Core.
EXTRA = {
    "bulwark": ["endurance", "strength", "determination"], "bodyguard": ["endurance", "agility"], "brawler": ["strength", "endurance", "determination"],
    "berserker": ["strength", "endurance", "determination"], "fencer": ["agility", "strength", "perception"], "monk": ["agility", "strength", "determination"],
    "sharpshooter": ["perception", "agility"], "heavy_gunner": ["strength", "endurance", "perception"],
    "ranger": ["perception", "agility", "endurance"], "grenadier": ["strength", "perception", "endurance"],
    "infiltrator": ["agility", "perception"], "stalker": ["agility", "perception"], "thief": ["agility", "perception"],
    "spy": ["expression", "perception"], "sigilist": ["intelligence", "expression", "endurance"], "sentinel": ["intelligence", "determination"],
    "enchanter": ["intelligence", "expression", "insight"], "jinx": ["intelligence", "expression", "insight"], "detective": ["intelligence", "perception", "insight"],
    "engineer": ["perception", "intelligence", "agility"], "scholar": ["intelligence", "perception", "determination"], "stormcaller": ["determination", "virtue"],
    "mender": ["insight", "virtue", "endurance"], "confessor": ["virtue", "insight", "endurance"], "zealot": ["virtue", "determination"],
    "witch": ["determination", "insight", "intelligence"], "harbinger": ["insight", "determination"], "silver_tongue": ["expression", "insight"],
    "troubadour": ["insight", "virtue", "expression"], "captain": ["virtue", "insight", "endurance"], "enforcer": ["strength", "virtue"],
    "spellblade": ["intelligence", "agility"], "crusader": ["virtue", "endurance"], "witch_hunter": ["agility", "perception"],
    "field_medic": ["insight", "endurance", "agility"], "survivor": ["endurance", "agility", "perception"], "drifter": ["endurance", "insight"],
    # All-in: everything in one Core (7/1/1)
    "living_wall": ["endurance", "strength", "agility"], "wrecking_ball": ["strength", "endurance", "agility"],
    "deadeye": ["agility", "endurance", "strength"], "phantom": ["perception", "intelligence", "expression"],
    "savant": ["intelligence", "expression", "perception"], "illusionist": ["expression", "intelligence", "perception"],
    "heartreader": ["insight", "virtue", "determination"], "unbroken": ["determination", "insight", "virtue"],
    "prophet": ["virtue", "insight", "determination"],
}

def fill(aid, preset):
    """Search every way to raise the role's attributes; keep the ones that spend exactly
    all Attribute and Core points with each Core only as high as its attributes need (no dump
    stats, no Core raised for nothing); pick the most even spread, ties to the role's order."""
    import itertools
    need = {a: 1 for a in ALL}
    for s, v in preset.items():
        need[skills[s]["attribute"]] = max(need[skills[s]["attribute"]], v)
    used = sorted({skills[s]["attribute"] for s in preset}, key=lambda a: -max(v for s, v in preset.items() if skills[s]["attribute"] == a))
    prio = list(dict.fromkeys(used + EXTRA[aid]))
    tried = [prio, list(dict.fromkeys(prio + [a for a in ALL if CORE_OF[a] in {CORE_OF[x] for x in used}]))]
    for pr in tried:
        best = None
        top = min(CAP, 1 + CORE_PTS)  # no Core can pass 1 + the Core budget at creation
        for vals in itertools.product(*[range(need[a], top + 1) for a in pr]):
            attr = dict(need); attr.update(zip(pr, vals))
            core = {"body": 1, "mind": 1, "soul": 1}
            for x, v in attr.items():
                core[CORE_OF[x]] = max(core[CORE_OF[x]], v)
            a_sp, c_sp = sum(v - 1 for v in attr.values()), sum(v - 1 for v in core.values())
            # spend everything: unspent Core points are traded for Attribute points
            if c_sp > CORE_PTS or a_sp + TRADE * c_sp != ATTR_PTS + TRADE * CORE_PTS or (not TRADE and c_sp != CORE_PTS):
                continue
            mean = sum(attr[x] for x in prio) / len(prio)
            outside = sum(attr[x] - need[x] for x in pr if x not in prio)  # borrowed attributes: as few points as possible
            key = (outside, sum((attr[x] - mean) ** 2 for x in pr if x in prio), [-attr[x] for x in pr])
            if best is None or key < best[0]:
                best = (key, attr, core)
        if best:
            return best[1], best[2]
    raise SystemExit(f"{aid}: no allocation spends every point inside its role; change its preset or EXTRA")

if __name__ == "__main__":
    p = root / "archetypes.json"
    d = json.loads(p.read_text())
    base = json.loads((root / "classes.json").read_text())["base"]
    for a in d["items"]:
        a["attributes"], a["cores"] = fill(a["id"], a["preset"])
        # Class Roster Revision 3: the class of the highest attribute (every tied one).
        top = max(a["attributes"].values())
        a["leans"] = sorted(b["id"] for b in base if a["attributes"][b["attribute"]] == top)
    d["rules"]["budgets"] = "every archetype spends all three creation budgets: its preset places the 10 Skill points, and `attributes` and `cores` place every Attribute and Core point (tools/archetype_fill.py); picking one leaves nothing to spend"
    p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    for a in d["items"]:
        print(f"{a['id']:14} cores {a['cores']}  raised: " + ", ".join(f"{k} {v}" for k, v in a["attributes"].items() if v > 1))
