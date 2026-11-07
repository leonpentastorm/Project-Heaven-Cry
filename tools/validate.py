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

# sigils.json, rules revision 1.4: 40 words in five groups, the grammar block, element identities, enemy defaults
DMG_TYPES_SIGIL = {"physical", "elemental", "fire", "lightning", "emp", "sigil", "soul", "true"}
sg = data.get("sigils")
if isinstance(sg, dict):
    SG_GROUPS = {"subject": {"subject_element", "subject_affliction", "subject_boon", "subject_working"},
                 "reach": {"reach"}, "delivery": {"delivery"}, "burst": {"burst"}, "filter": {"filter"}}
    SG_COUNTS = {"subject_element": 7, "subject_affliction": 7, "subject_boon": 5, "subject_working": 6,
                 "reach": 4, "delivery": 7, "burst": 3, "filter": 1}
    SG_ORDER = {"how_many", "travel", "cover", "after", "stays"}
    SG_PER_COPY = {"range", "allies", "rounds", "missiles", "flux", "pull_tiles", "triggers", "jumps", "leech",
                   "mult", "radius", "cone_length"}
    SG_SAVES = {None, "body", "brain", "heart"}
    sw = items("sigils")
    smap = {w.get("id"): w for w in sw}
    els = sg.get("elements") or {}
    seen = collections.Counter()
    for w in sw:
        wid, g, c = w.get("id"), w.get("group"), w.get("class")
        where = f"sigils:{wid}"
        if g not in SG_GROUPS:
            errors.append(f"{where}: group {g} is not one of {sorted(SG_GROUPS)}")
            continue
        if c not in SG_GROUPS[g]:
            errors.append(f"{where}: class {c} doesn't belong to group {g}")
        seen[c] += 1
        if not isinstance(w.get("charge"), int) or w["charge"] < 1:
            errors.append(f"{where}: charge must be a whole number of at least 1")
        if not isinstance(w.get("flux"), int) or w["flux"] < 1:
            errors.append(f"{where}: flux must be a whole number of at least 1")
        if w.get("word") != str(wid).upper():
            errors.append(f"{where}: word must be the id in capitals")
        if not w.get("text"):
            errors.append(f"{where}: missing text")
        if w.get("provisional") is not True:
            errors.append(f"{where}: every 1.4 number is provisional (provisional: true)")
        mc = w.get("max_copies")
        if mc is not None and (not isinstance(mc, int) or mc < 1):
            errors.append(f"{where}: max_copies must be null or a whole number of at least 1")
        ap = w.get("applies")
        if ap is not None:
            if not isinstance(ap, dict) or not ap.get("condition"):
                errors.append(f"{where}: applies needs a condition")
            elif ap.get("save") not in SG_SAVES or ap.get("save_ends", None) not in SG_SAVES:
                errors.append(f"{where}: applies.save must be body, brain, heart or null")
        if c == "subject_element":
            if not isinstance(w.get("damage"), (int, float)) or w.get("damage_type") not in DMG_TYPES_SIGIL:
                errors.append(f"{where}: an Element needs damage and a damage_type")
            if w.get("element") not in els:
                errors.append(f"{where}: element {w.get('element')} has no identity in sigils.elements")
        if g != "subject":
            if g != "filter" and w.get("order") not in SG_ORDER:
                errors.append(f"{where}: order must be one of {sorted(SG_ORDER)}")
            pc = w.get("per_copy")
            if g != "filter":
                if not isinstance(pc, dict) or not pc:
                    errors.append(f"{where}: per_copy (what each extra copy adds) is missing")
                else:
                    for k, v in pc.items():
                        if k not in SG_PER_COPY or not isinstance(v, (int, float)):
                            errors.append(f"{where}: per_copy.{k} is not a known number field")
                        elif k not in w and k not in ("flux",) and not (k == "rounds" and "lasts_rounds" in w) \
                                and not (k == "allies" and g == "reach") and not (k == "cone_length" and "cone_length" in w):
                            errors.append(f"{where}: per_copy.{k} has no base value on the word")
            if g == "reach" and not isinstance(w.get("range"), (int, float)):
                errors.append(f"{where}: a Reach word needs a range")
            if "mult" in w and not isinstance(w["mult"], (int, float)):
                errors.append(f"{where}: mult must be a number")
        for r in w.get("refuses", []) or []:
            if r not in smap:
                errors.append(f"{where}: refuses unknown word {r}")
    for c, n in SG_COUNTS.items():
        if seen[c] != n:
            errors.append(f"sigils: {seen[c]} words of class {c}, expected {n}")
    if len(sw) != 40:
        errors.append(f"sigils: {len(sw)} words, expected 40 (rules 1.4)")
    for e, v in els.items():
        for k in ("rider", "look", "sound"):
            if not (isinstance(v, dict) and v.get(k)):
                errors.append(f"sigils.elements.{e}: missing {k}")
    gr = sg.get("grammar") or {}
    for k in ("needs", "min_glyphs", "max_glyphs", "shape", "draw", "evoke", "facing", "touch", "repeats", "refused",
              "resolve_order", "limits", "starting", "known_max"):
        if k not in gr:
            errors.append(f"sigils.grammar: missing {k}")
    if gr.get("max_glyphs") != 4 or gr.get("min_glyphs") != 2:
        errors.append("sigils.grammar: a spell is 2 to 4 glyphs (rules 1.4)")
    if (gr.get("draw") or {}).get("glyphs_per_tile") != 1:
        errors.append("sigils.grammar.draw: one glyph per tile (rules 1.4)")
    if set(gr.get("resolve_order") or []) != SG_ORDER:
        errors.append("sigils.grammar.resolve_order must list how_many, travel, cover, after, stays")
    rp = (gr.get("repeats") or {}).get("mult_per_repeated_glyph")
    if not isinstance(rp, (int, float)) or not 0 < rp <= 1:
        errors.append("sigils.grammar.repeats.mult_per_repeated_glyph must be a number in (0, 1]")
    for r in gr.get("refused", []) or []:
        for x in (r.get("words") or []) + ([r["word"]] if r.get("word") else []):
            if x not in smap:
                errors.append(f"sigils.grammar.refused: unknown word {x}")
    st = gr.get("starting") or {}
    dflt = st.get("default") or []
    if len(dflt) != st.get("words", 2) or any(x not in smap for x in dflt):
        errors.append("sigils.grammar.starting.default must be known words, as many as starting.words")
    else:
        if not any(smap[x].get("group") == "subject" for x in dflt) or not any(smap[x].get("group") != "subject" for x in dflt):
            errors.append("sigils.grammar.starting.default must make a spell (a Subject and another word)")
        if st.get("needs_group") and not any(smap[x].get("group") == st["needs_group"] for x in dflt):
            errors.append(f"sigils.grammar.starting.default needs a {st['needs_group']} word")
    for tier, ws in ((sg.get("enemy_ai") or {}).get("default_words") or {}).items():
        if tier not in ids_of(items("enemies")):
            errors.append(f"sigils.enemy_ai: unknown enemy tier {tier}")
        for x in ws:
            if x not in smap:
                errors.append(f"sigils.enemy_ai.{tier}: unknown word {x}")
        if ws and (not any(smap.get(x, {}).get("group") == "subject" for x in ws) or not any(smap.get(x, {}).get("group") != "subject" for x in ws)):
            errors.append(f"sigils.enemy_ai.{tier}: its words can't make a spell")
    for x in gr.get("retired", []) or []:
        if x.get("id") in smap:
            errors.append(f"sigils.grammar.retired: {x.get('id')} is still a word")

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
        hd = w.get("handling")
        if hd is not None:
            if not isinstance(hd, dict) or set(hd) - {"grant", "deny"}:
                errors.append(f"weapons:{w.get('id')}: handling must be {{grant?, deny?}}")
            else:
                for k in ("grant", "deny"):
                    for x in hd.get(k, []) or []:
                        if x not in ("reload", "load", "clear", "brace", "repair", "overwatch", "burst", "auto", "skill"):
                            errors.append(f"weapons:{w.get('id')}: handling.{k} has unknown action {x}")
        if w.get("reload_ap") is not None and not (isinstance(w.get("reload_ap"), (int, float)) and w.get("reload_ap") >= 0):
            errors.append(f"weapons:{w.get('id')}: reload_ap must be a number")
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

# rules 1.3 (lane 0B): start items, companions, trait excludes, damage types, weapon tags, special ammo, devices
item_ids = ids_of(items("items")) | ids_of(items("weapons"))
def start_items(o, where):
    if isinstance(o, dict):
        if o.get("op") == "start_item" and o.get("item") not in item_ids:
            errors.append(f"{where}: start_item '{o.get('item')}' is not in items.json or weapons.json")
        for v in o.values(): start_items(v, where)
    elif isinstance(o, list):
        for v in o: start_items(v, where)
for name in ("traits", "perks"):
    for x in items(name):
        start_items(x, f"{name}:{x.get('id')}")
for b in base + adv:
    start_items(b, f"classes:{b.get('id')}")
wids = ids_of(items("weapons"))
for k in (data.get("enemies", {}) or {}).get("companions", []) if isinstance(data.get("enemies"), dict) else []:
    if k.get("weapon") not in wids:
        errors.append(f"enemies.companions:{k.get('id')}: unknown weapon {k.get('weapon')}")
    for f in ("hp", "defense", "attack_bonus", "armour", "movement"):
        if not isinstance(k.get(f), (int, float)):
            errors.append(f"enemies.companions:{k.get('id')}: {f} must be a number")
# Enemy Sigil casters (rules 1.4, ai-sigil.ts): a known tier and weapon, known words that make a spell, a Reach word.
_smap = {w.get("id"): w for w in items("sigils")}
_cids = set()
for k in (data.get("enemies", {}) or {}).get("casters", []) if isinstance(data.get("enemies"), dict) else []:
    cid = k.get("id"); where = f"enemies.casters:{cid}"
    if not cid or cid in _cids or cid in ids_of(items("enemies")):
        errors.append(f"{where}: needs a unique id (not a tier id)")
    _cids.add(cid)
    if k.get("tier") not in ids_of(items("enemies")):
        errors.append(f"{where}: unknown tier {k.get('tier')}")
    if k.get("weapon") not in wids:
        errors.append(f"{where}: unknown weapon {k.get('weapon')}")
    ws = k.get("sigils") or []
    for x in ws:
        if x not in _smap:
            errors.append(f"{where}: unknown word {x}")
    if not any(_smap.get(x, {}).get("group") == "subject" for x in ws) or not any(_smap.get(x, {}).get("group") != "subject" for x in ws):
        errors.append(f"{where}: its words can't make a spell")
    if not any(_smap.get(x, {}).get("group") == "reach" for x in ws):
        warns.append(f"{where}: no Reach word (it can only cast by Touch)")
    if not isinstance(k.get("spell_bias", 1), (int, float)) or k.get("spell_bias", 1) <= 0:
        errors.append(f"{where}: spell_bias must be a positive number")
    if k.get("provisional") is not True:
        warns.append(f"{where}: new numbers should be provisional")
tmap = {t.get("id"): t for t in items("traits")}
for t in items("traits"):
    for x in t.get("excludes", []) or []:
        if x not in tmap:
            errors.append(f"traits:{t.get('id')}: excludes unknown trait {x}")
        elif t.get("id") not in (tmap[x].get("excludes") or []):
            errors.append(f"traits:{t.get('id')}: excludes {x}, but {x} doesn't exclude it back")
DMG_TYPES = {"physical", "elemental", "fire", "lightning", "emp", "sigil", "soul", "true"}
WTAGS = {"electronic", "evoker_linked", "lever"}
for w in items("weapons"):
    if w.get("damage_type") is not None and w.get("damage_type") not in DMG_TYPES:
        errors.append(f"weapons:{w.get('id')}: damage_type {w.get('damage_type')} is not one of {sorted(DMG_TYPES)}")
    if "explosive" in w and not isinstance(w["explosive"], bool):
        errors.append(f"weapons:{w.get('id')}: explosive must be true or false")
    for tg in w.get("tags", []) or []:
        if tg not in WTAGS:
            errors.append(f"weapons:{w.get('id')}: unknown tag {tg}")
ammo_ids = {a.get("id") for a in (data.get("rules", {}).get("weapons_rules", {}) or {}).get("ammo_types", [])}
for x in items("items"):
    if x.get("ammo_type") and x["ammo_type"] not in ammo_ids:
        errors.append(f"items:{x.get('id')}: ammo_type {x['ammo_type']} is not in rules.weapons_rules.ammo_types")
for o in items("objects"):
    if "electronic" in o and not isinstance(o["electronic"], bool):
        errors.append(f"objects:{o.get('id')}: electronic must be true or false")

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
