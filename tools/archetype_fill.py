"""Fill every archetype's Attribute and Core budgets (spec: Creation budget; decision 49).

Usage: python3 tools/archetype_fill.py data
Each archetype's preset places its 10 Skill points. This script places the rest of the
creation budgets so that picking an archetype leaves nothing to spend: Attributes the
preset's skills need first, then the archetype's role priority (EXTRA below), round-robin,
raising a Core when an Attribute is at its cap, trading a spare Core point for 2 Attribute
points only when the Attribute points run out. Leftovers fill the strongest Core's Attributes first. Writes `attributes` and `cores` per item.
"""
import json, pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "data")
rules = json.loads((root / "rules.json").read_text())["character"]["creation"]
ATTR_PTS, CORE_PTS = rules["attributes"]["points"], rules["cores"]["points"]
TRADE = rules["cores"]["unspent_core_point_trades_for_attribute_points"]
# Players have no creation cap (a 7/1/1 build is legal). Presets stay at 5 or below on purpose:
# they are moderate examples for new players, not the extremes the budgets allow.
CAP = 5
skills = {s["id"]: s for s in json.loads((root / "skills.json").read_text())["items"]}
attrs = json.loads((root / "attributes.json").read_text())["items"]
CORE_OF = {a["id"]: a["core"] for a in attrs}
ALL = [a["id"] for a in attrs]

# Where each role puts points its skills don't need (after the attributes the skills use).
EXTRA = {
    "bulwark": ["endurance", "strength"], "bodyguard": ["endurance", "agility"], "brawler": ["strength", "endurance"],
    "berserker": ["strength", "endurance"], "fencer": ["agility", "strength"], "monk": ["agility", "strength", "determination"],
    "sharpshooter": ["perception", "agility"], "heavy_gunner": ["strength", "endurance", "perception"],
    "ranger": ["perception", "agility", "endurance"], "grenadier": ["strength", "perception", "endurance"],
    "infiltrator": ["agility", "perception"], "stalker": ["agility", "perception"], "thief": ["agility", "perception"],
    "spy": ["expression", "perception"], "sigilist": ["intelligence", "expression"], "sentinel": ["intelligence", "determination"],
    "enchanter": ["intelligence", "expression"], "jinx": ["intelligence", "expression"], "detective": ["intelligence", "perception"],
    "engineer": ["perception", "intelligence"], "scholar": ["intelligence", "perception"], "stormcaller": ["determination", "virtue"],
    "mender": ["insight", "virtue"], "confessor": ["virtue", "insight"], "zealot": ["virtue", "determination"],
    "witch": ["determination", "insight"], "harbinger": ["insight", "determination"], "silver_tongue": ["expression", "insight"],
    "troubadour": ["insight", "virtue"], "captain": ["virtue", "insight"], "enforcer": ["strength", "virtue"],
    "spellblade": ["intelligence", "agility"], "crusader": ["virtue", "endurance"], "witch_hunter": ["agility", "perception"],
    "field_medic": ["insight", "endurance", "agility"], "survivor": ["endurance", "agility", "perception"], "drifter": ["endurance", "insight"],
}

def fill(aid, preset):
    attr = {a: 1 for a in ALL}
    for s, v in preset.items():
        attr[skills[s]["attribute"]] = max(attr[skills[s]["attribute"]], v)
    core = {"body": 1, "mind": 1, "soul": 1}
    for a, v in attr.items():
        core[CORE_OF[a]] = max(core[CORE_OF[a]], v)
    core_left = CORE_PTS - sum(v - 1 for v in core.values())
    attr_left = ATTR_PTS - sum(v - 1 for v in attr.values())
    assert core_left >= 0 and attr_left >= 0, (aid, core_left, attr_left)
    used = sorted({skills[s]["attribute"] for s in preset}, key=lambda a: -max(v for s, v in preset.items() if skills[s]["attribute"] == a))
    prio = list(dict.fromkeys(used + EXTRA[aid] + ["endurance"]))

    def raise_attr(a):
        nonlocal core_left, attr_left
        if attr[a] >= CAP:
            return False
        c = CORE_OF[a]
        need_core = attr[a] >= core[c]
        if need_core and (core[c] >= CAP or core_left < 1):
            return False
        cl, al = core_left - (1 if need_core else 0), attr_left
        if al < 1:  # trade a spare Core point for Attribute points
            if cl < 1:
                return False
            cl, al = cl - 1, al + TRADE
        if need_core:
            core[c] += 1
        attr[a] += 1
        core_left, attr_left = cl, al - 1
        return True

    while attr_left > 0 or core_left > 0:  # role priority, round-robin
        if not any([raise_attr(a) for a in prio]):
            break
    # spill: the archetype's strongest Core first, one Attribute at a time
    spill = sorted(ALL, key=lambda a: (-core[CORE_OF[a]], prio.index(a) if a in prio else 99))
    for a in spill:
        while (attr_left > 0 or core_left > 0) and raise_attr(a):
            pass
    # anything still unspent: raise Cores in priority order (room for later levels)
    for a in prio + ALL:
        while core_left > 0 and core[CORE_OF[a]] < CAP:
            core[CORE_OF[a]] += 1; core_left -= 1
    assert core_left == 0 and attr_left == 0, (aid, core_left, attr_left, attr, core)
    return attr, core

if __name__ == "__main__":
    p = root / "archetypes.json"
    d = json.loads(p.read_text())
    for a in d["items"]:
        a["attributes"], a["cores"] = fill(a["id"], a["preset"])
    d["rules"]["budgets"] = "every archetype spends all three creation budgets: its preset places the 10 Skill points, and `attributes` and `cores` place every Attribute and Core point (tools/archetype_fill.py); picking one leaves nothing to spend"
    p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    for a in d["items"]:
        print(f"{a['id']:14} cores {a['cores']}  raised: " + ", ".join(f"{k} {v}" for k, v in a["attributes"].items() if v > 1))
