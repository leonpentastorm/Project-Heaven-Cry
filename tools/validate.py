"""Cross-reference validator for the PHC data pack.

Usage: python3 validate.py /home/claude/phc-data
Checks: every file parses, ids are unique, every skill/attr/class/perk/condition id that
is referenced exists, effect ops are from the known set, signatures cover all 27 skills.
"""
import json, sys, pathlib, collections

root = pathlib.Path(sys.argv[1])
errors, warns = [], []

SKILLS = """dexterity vigilant reaction_speed athletics raw_power guts durability pain_threshold
sensory camaraderie proficiency ingenuity intimidation brain_power visualization rumination
composure analysis eloquence charisma will_power empathy lore_master conscience faith
implication authority""".split()
OPS = set(x["id"] for x in json.load(open(root / "effect_ops.json"))["items"]) if (root / "effect_ops.json").exists() else {"skill_mod", "skill_mod_tag", "stat_mod", "tn_mod", "advantage", "disadvantage",
       "grant_action", "resource", "condition", "narrator"}

data = {}
for p in sorted(root.glob("*.json")):
    try:
        data[p.stem] = json.loads(p.read_text())
    except Exception as e:
        errors.append(f"{p.name}: does not parse ({e})")

def items(name):
    d = data.get(name)
    if d is None:
        return []
    if isinstance(d, dict) and "items" in d:
        return d["items"]
    return d

def ids_of(lst):
    return {x.get("id") for x in lst if isinstance(x, dict)}

# collect ids
cls = data.get("classes", {})
base = cls.get("base", []) if isinstance(cls, dict) else []
adv = cls.get("advanced", []) if isinstance(cls, dict) else []
attrs_doc = data.get("attributes", {})
attrs = attrs_doc.get("items", []) if isinstance(attrs_doc, dict) else []
cores = attrs_doc.get("cores", []) if isinstance(attrs_doc, dict) else []

known = {
    "skill": set(SKILLS),
    "attr": ids_of(attrs),
    "core": ids_of(cores) or {"body", "mind", "soul"},
    "class": ids_of(base) | ids_of(adv),
    "perk": ids_of(items("perks")),
    "trait": ids_of(items("traits")),
    "condition": ids_of(items("conditions")),
}

# uniqueness
for name in ["skills", "traits", "perks", "conditions", "weapons", "sigils", "soul_modules", "patrons", "weapon_mastery", "items"]:
    c = collections.Counter(x.get("id") for x in items(name) if isinstance(x, dict))
    for k, n in c.items():
        if n > 1:
            errors.append(f"{name}: duplicate id {k} x{n}")
c = collections.Counter([x["id"] for x in base + adv])
for k, n in c.items():
    if n > 1:
        errors.append(f"classes: duplicate id {k}")

# skills file matches canonical list
sk = ids_of(items("skills"))
if sk and sk != set(SKILLS):
    errors.append(f"skills.json ids differ: missing {set(SKILLS)-sk}, extra {sk-set(SKILLS)}")

new_ops = collections.Counter()

def walk(obj, where):
    if isinstance(obj, dict):
        if "op" in obj and isinstance(obj["op"], str) and where.split(":")[0] not in ("rules",):
            if obj["op"] not in OPS:
                new_ops[obj["op"]] += 1
        for key, kind in [("skill", "skill"), ("attr", "attr"), ("core", "core"), ("class", "class"),
                          ("perk", "perk"), ("condition", "condition")]:
            v = obj.get(key)
            vals = v if isinstance(v, list) else [v]
            for v in vals:
              if kind == "condition" and isinstance(v, str) and v.startswith("family:"):
                  continue
              if kind == "class" and (v in ("either_parent", "other_parent") or where.startswith(("sigils", "soul_modules"))):
                  continue
              if isinstance(v, str) and known[kind] and v not in known[kind]:
                errors.append(f"{where}: unknown {kind} id '{v}'")
        for k, v in obj.items():
            walk(v, f"{where}.{k}" if not isinstance(v, (dict, list)) else where)
    elif isinstance(obj, list):
        for v in obj:
            walk(v, where)

for name, d in data.items():
    if name == "rules":
        continue
    if name == "classes":
        for x in base + adv:
            walk(x, f"classes:{x.get('id')}")
        continue
    for x in items(name) if isinstance(items(name), list) else []:
        if isinstance(x, dict):
            walk(x, f"{name}:{x.get('id')}")

# class checks
covered = set()
for b in base:
    sig = b.get("signature", [])
    if len(sig) != 3:
        errors.append(f"class {b.get('id')}: signature has {len(sig)} skills")
    for s in sig:
        if s not in SKILLS:
            errors.append(f"class {b.get('id')}: bad signature skill {s}")
    covered |= set(sig)
if base and covered != set(SKILLS):
    errors.append(f"signatures miss skills: {set(SKILLS)-covered}")
for a in adv:
    for p in a.get("parents", []):
        if p not in ids_of(base):
            errors.append(f"advanced {a.get('id')}: parent {p} not a base class")

sig_ids = ids_of(items("sigils"))
def words(o):
    if isinstance(o, dict):
        if o.get("op") in ("unlock_word", "word_cost") and o.get("word") and o["word"] not in sig_ids:
            errors.append(f"unknown Sigil word '{o['word']}'")
        for v in o.values():
            words(v)
    elif isinstance(o, list):
        for v in o:
            words(v)
for d in data.values():
    words(d)

# weapon mastery: families, levels, perks, and every weapon's family
wm = data.get("weapon_mastery")
if isinstance(wm, dict):
    fam_ids = ids_of(wm.get("families", []))
    wperks = {x.get("id"): x for x in wm.get("items", []) if isinstance(x, dict)}
    for pid in set(wperks) & known["perk"]:
        errors.append(f"weapon_mastery: perk id '{pid}' clashes with perks.json")
    cats = {c for f in wm.get("families", []) for c in f.get("categories", [])}
    for f in wm.get("families", []):
        tiers = sorted(wperks[p]["tier"] for p in f.get("perks", []) if p in wperks)
        if tiers != ["I", "II", "III"]:
            errors.append(f"weapon_mastery: family {f.get('id')} needs one perk per tier, has {tiers}")
        for p in f.get("perks", []):
            if p not in wperks:
                errors.append(f"weapon_mastery: family {f.get('id')} lists unknown perk {p}")
    for x in wperks.values():
        if x.get("family") not in fam_ids:
            errors.append(f"weapon_mastery: perk {x.get('id')} has unknown family {x.get('family')}")
    lv = wm.get("rules", {}).get("levels", [])
    kills = [l.get("kills") for l in lv]
    if kills != sorted(kills) or len(set(kills)) != len(kills):
        errors.append("weapon_mastery: level kill thresholds must rise")
    for w in items("weapons"):
        if w.get("mastery_family") not in fam_ids:
            errors.append(f"weapons:{w.get('id')}: unknown mastery_family {w.get('mastery_family')}")
        if w.get("category") not in cats:
            errors.append(f"weapons:{w.get('id')}: category {w.get('category')} is in no mastery family")

# equipment slots: the armour class slot must be one of the slots
slots = data.get("rules", {}).get("equipment_slots", {})
if slots and slots.get("armour_class_from") not in slots.get("slots", []):
    errors.append("rules.equipment_slots: armour_class_from is not a slot")

# archetypes: creation presets (guidance only)
arch = data.get("archetypes")
if isinstance(arch, dict):
    rules = arch.get("rules", {})
    fams = {f.get("id") for f in arch.get("families", [])}
    skill_core = {x["id"]: x.get("core") for x in items("skills") if isinstance(x, dict)}
    skill_attr = {x["id"]: x.get("attribute") for x in items("skills") if isinstance(x, dict)}
    attr_core = {x["id"]: x.get("core") for x in attrs}
    seen = collections.Counter(a.get("id") for a in arch.get("items", []))
    for k, n in seen.items():
        if n > 1:
            errors.append(f"archetypes: duplicate id {k}")
    base_names = {b.get("name", "").lower() for b in base + adv}
    for a in arch.get("items", []):
        aid, preset = a.get("id"), a.get("preset", {})
        if a.get("family") not in fams:
            errors.append(f"archetype {aid}: unknown family {a.get('family')}")
        if a.get("name", "").lower() in base_names:
            errors.append(f"archetype {aid}: name collides with a class name")
        bad = [s for s in preset if s not in SKILLS]
        if bad:
            errors.append(f"archetype {aid}: unknown skills {bad}")
        if sum(preset.values()) != rules.get("preset_points", 10):
            errors.append(f"archetype {aid}: preset spends {sum(preset.values())} points")
        if preset and max(preset.values()) > 10:
            errors.append(f"archetype {aid}: a skill is above 10")
        # creation budgets (rules.character.creation): every archetype spends all of them (decision 49)
        cb = data.get("rules", {}).get("character", {}).get("creation", {})
        A_PTS, C_PTS = cb.get("attributes", {}).get("points", 10), cb.get("cores", {}).get("points", 6)
        TR, CAPC = cb.get("cores", {}).get("unspent_core_point_trades_for_attribute_points", 2), 10  # no creation caps beyond the tree's own
        at, co = a.get("attributes") or {}, a.get("cores") or {}
        if set(at) != set(skill_attr.values()) or set(co) != {"body", "mind", "soul"}:
            errors.append(f"archetype {aid}: needs all 9 attributes and 3 cores")
        else:
            for s, v in preset.items():
                if s in skill_attr and at[skill_attr[s]] < v:
                    errors.append(f"archetype {aid}: {s} {v} is above its attribute")
            for x, v in at.items():
                if v > co[attr_core[x]] or v > CAPC or v < 1:
                    errors.append(f"archetype {aid}: attribute {x} {v} breaks a cap")
            if a.get("family") != "all_in" and sum(1 for v in co.values() if v > 1) < 2:
                errors.append(f"archetype {aid}: regular presets spread over at least two Cores (only All-in goes single-Core)")
            for c, v in co.items():
                top_attr = max([at[x] for x in at if attr_core[x] == c] + [1])
                if v != top_attr:
                    errors.append(f"archetype {aid}: core {c} {v} is raised for nothing (its attributes need {top_attr})")
            if any(v > CAPC or v < 1 for v in co.values()):
                errors.append(f"archetype {aid}: a core is outside 1-10")
            a_sp, c_sp = sum(v - 1 for v in at.values()), sum(v - 1 for v in co.values())
            traded = -(-max(0, a_sp - A_PTS) // TR)
            if C_PTS - c_sp - traded != 0 or A_PTS + traded * TR - a_sp != 0:
                errors.append(f"archetype {aid}: doesn't spend every creation point (core left {C_PTS - c_sp - traded}, attribute left {A_PTS + traded * TR - a_sp})")
        tot = {b["id"]: sum(preset.get(s, 0) for s in b.get("signature", [])) for b in base}
        top = sorted(set(tot.values()), reverse=True)[:2]
        leans = sorted(c for c, v in tot.items() if v in top)
        if sorted(a.get("leans", [])) != leans:
            errors.append(f"archetype {aid}: leans should be {leans}")

for op, n in new_ops.items():
    warns.append(f"non-standard effect op '{op}' used {n}x")

print("files:", ", ".join(f"{k}({len(items(k)) if k not in ('classes','rules') else ''})" for k in data))
print(f"base classes {len(base)}, advanced {len(adv)}")
print(f"\n{len(errors)} errors")
for e in errors[:80]:
    print("  ERR", e)
print(f"{len(warns)} warnings")
for w in warns:
    print("  WARN", w)
sys.exit(1 if errors else 0)
