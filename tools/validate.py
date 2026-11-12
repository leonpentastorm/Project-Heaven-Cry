"""Cross-reference validator for the PHC data pack.

Usage: python3 validate.py /home/claude/phc-data
Checks: every file parses, ids are unique, every skill/attr/class/perk/condition id that
is referenced exists, effect ops are from the known set, one base class per attribute (Class Roster Rev 3).
"""
import re
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
pool = (cls.get("move_pool") or {}).get("moves", []) if isinstance(cls, dict) else []
# Class Roster Revision 3: the old base class ids live on as move origins (the pool) and in the save migration.
legacy_ids = {m.get("origin") for m in pool} | set(((cls.get("migration") or {}).get("class_ids") or {}).keys()) if isinstance(cls, dict) else set()
attrs_doc = data.get("attributes", {})
attrs = attrs_doc.get("items", []) if isinstance(attrs_doc, dict) else []
cores = attrs_doc.get("cores", []) if isinstance(attrs_doc, dict) else []

known = {
    "skill": set(SKILLS),
    "attr": ids_of(attrs),
    "core": ids_of(cores) or {"body", "mind", "soul"},
    "class": ids_of(base) | ids_of(adv) | legacy_ids,
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
        for m in pool:
            walk(m, f"classes:pool.{m.get('origin')}.{m.get('id')}")
        continue
    for x in items(name) if isinstance(items(name), list) else []:
        if isinstance(x, dict):
            walk(x, f"{name}:{x.get('id')}")

# class checks (Class Roster Revision 3: one base class per attribute; moves by rank, refs into the pool)
attr_core = {x["id"]: x.get("core") for x in attrs}
skill_attr_all = {x["id"]: x.get("attribute") for x in items("skills") if isinstance(x, dict)}
TAG_FIELDS = ("origin", "fantasy_tags", "attributes", "status")
def move_tags(m, where):
    for f in TAG_FIELDS:
        if f not in m:
            errors.append(f"{where}: move {m.get('id')} has no {f}")
    if m.get("status") not in ("active", "shelved"):
        errors.append(f"{where}: move {m.get('id')} status must be active or shelved")
    for a in m.get("attributes", []):
        if a not in attr_core:
            errors.append(f"{where}: move {m.get('id')} unknown attribute {a}")
    if not isinstance(m.get("fantasy_tags"), list) or not m.get("fantasy_tags"):
        errors.append(f"{where}: move {m.get('id')} needs fantasy_tags")
movesByKey = {}
for m in pool:
    movesByKey[f"{m.get('origin')}.{m.get('id')}"] = m
    move_tags(m, "classes.move_pool")
for a in adv:
    for m in a.get("moves", []):
        movesByKey[f"{a.get('id')}.{m.get('id')}"] = m
        move_tags(m, f"advanced {a.get('id')}")
        if m.get("origin") != a.get("id"):
            errors.append(f"advanced {a.get('id')}: move {m.get('id')} origin should be {a.get('id')}")
refd = set()
seen_attr = collections.Counter()
for b in base:
    at = b.get("attribute")
    seen_attr[at] += 1
    if at not in attr_core:
        errors.append(f"class {b.get('id')}: unknown attribute {at}")
        continue
    if b.get("core") != attr_core[at]:
        errors.append(f"class {b.get('id')}: core {b.get('core')} but {at} is {attr_core[at]}")
    want = sorted(k for k, v in skill_attr_all.items() if v == at)
    if sorted(b.get("skills", [])) != want:
        errors.append(f"class {b.get('id')}: skills should be {want}")
    for r in ("I", "II", "III"):
        ms = (b.get("ranks", {}).get(r) or {}).get("moves", [])
        if len(ms) != 2:
            errors.append(f"class {b.get('id')}: rank {r} has {len(ms)} moves (two per rank)")
        for m in ms:
            if "ref" in m:
                if m["ref"] not in movesByKey:
                    errors.append(f"class {b.get('id')}: ref {m['ref']} is not in the move pool or an advanced class")
                elif movesByKey[m["ref"]].get("status") != "active":
                    errors.append(f"class {b.get('id')}: ref {m['ref']} is marked shelved")
                if m["ref"] in refd:
                    errors.append(f"class {b.get('id')}: ref {m['ref']} is used twice")
                refd.add(m["ref"])
            else:
                move_tags(m, f"class {b.get('id')}")
                if m.get("origin") != b.get("id"):
                    errors.append(f"class {b.get('id')}: new move {m.get('id')} origin should be {b.get('id')}")
                if m.get("status") != "active":
                    errors.append(f"class {b.get('id')}: new move {m.get('id')} must be active")
if base and (set(seen_attr) != set(attr_core) or any(n != 1 for n in seen_attr.values())):
    errors.append(f"classes: need exactly one base class per attribute (got {dict(seen_attr)})")
for k, m in movesByKey.items():
    if (m.get("status") == "active") != (k in refd):
        errors.append(f"classes: move {k} status {m.get('status')} but it is {'' if k in refd else 'not '}named by a base class")
# advanced classes: shelved flag; kind / pair / batch consistent (hybrid: two attributes of different cores; squared: one twice)
def pair_ok(kind, pair, where):
    if not isinstance(pair, list) or len(pair) != 2 or any(p not in attr_core for p in pair):
        errors.append(f"{where}: pair must be two attribute ids"); return
    if kind == "squared" and pair[0] != pair[1]:
        errors.append(f"{where}: a squared class pairs one attribute with itself")
    elif kind == "hybrid" and attr_core[pair[0]] == attr_core[pair[1]]:
        errors.append(f"{where}: a hybrid pairs attributes of different cores")
    elif kind not in ("squared", "hybrid"):
        errors.append(f"{where}: kind must be squared or hybrid")
for a in adv:
    w = f"advanced {a.get('id')}"
    if not isinstance(a.get("shelved"), bool):
        errors.append(f"{w}: needs shelved true/false")
    pair_ok(a.get("kind"), a.get("pair"), w)
    if a.get("batch") not in (1, 2, 3):
        errors.append(f"{w}: batch must be 1, 2 or 3")
    if a.get("kind") == "squared" and a.get("batch") != 1:
        errors.append(f"{w}: squared classes are batch 1")
    for p in a.get("parents", []):
        if p not in ids_of(base) | legacy_ids:
            errors.append(f"{w}: parent {p} is not a base class or a Revision 2 class id")
rm = cls.get("advanced_roadmap", []) if isinstance(cls, dict) else []
for r in rm:
    w = f"advanced_roadmap {r.get('slot')}"
    pair_ok(r.get("kind"), r.get("pair"), w)
    if r.get("kind") == "squared" and r.get("batch") != 1:
        errors.append(f"{w}: squared slots are batch 1")
slots = {r.get("slot"): r for r in rm}
for a in adv:
    s = a.get("roadmap")
    if s and s in slots and (slots[s].get("pair") != a.get("pair") or slots[s].get("kind") != a.get("kind")):
        errors.append(f"advanced {a.get('id')}: roadmap slot {s} has pair {slots[s].get('pair')}, the class {a.get('pair')}")
if rm:
    sq = [r for r in rm if r.get("kind") == "squared"]
    if sorted(r["pair"][0] for r in sq) != sorted(attr_core):
        errors.append("advanced_roadmap: batch 1 needs one squared slot per attribute")
    b2 = collections.Counter(p for r in rm if r.get("batch") == 2 for p in r.get("pair", []))
    if b2 and (set(b2) != set(attr_core) or any(n != 2 for n in b2.values())):
        errors.append(f"advanced_roadmap: batch 2 should use each attribute exactly twice ({dict(b2)})")
mig = (cls.get("migration") or {}).get("class_ids", {}) if isinstance(cls, dict) else {}
for o, n in mig.items():
    if n not in ids_of(base):
        errors.append(f"classes.migration: {o} -> {n} is not a base class")

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
    # rules 1.10 (Sigil 1.5): every word has a provisional inflection; study and word mastery numbers
    INFL_STATS = {"cond_rounds", "save_tn", "to_hit", "damage_pct", "push_tiles", "shield_pct", "heal_pct", "charge", "flux",
                  "lasts_rounds", "radius", "teleport_tiles", "barrier_hp_pct", "move_tiles", "range", "turret_def", "pull_tiles",
                  "jump_radius", "leech", "mult", "radius_at_4", "cone_length", "spare_downed"}
    for w in sw:
        inf, where = w.get("inflection"), f"sigils:{w.get('id')}.inflection"
        if not isinstance(inf, dict) or not inf.get("text") or not isinstance(inf.get("effects"), list) or not inf["effects"]:
            errors.append(f"{where}: every word needs an inflection with text and effects (rules 1.10)")
            continue
        if inf.get("provisional") is not True:
            errors.append(f"{where}: inflections are provisional (provisional: true)")
        for e in inf["effects"]:
            if e.get("op") != "inflection" or not isinstance(e.get("value"), (int, float)):
                errors.append(f"{where}: an inflection effect is {{op: inflection, stat, value}}")
            elif e.get("stat") not in INFL_STATS:
                warns.append(f"{where}: stat {e.get('stat')} is not one the engine runs (the Narrator rules it)")
    sd, wm = gr.get("study") or {}, gr.get("word_mastery") or {}
    for k in ("per_evoke", "per_glyph_past_2", "hit_enemy", "first", "step", "copy", "trace_rounds", "mastery_study", "mastered_free_words"):
        if not isinstance(sd.get(k), (int, float)):
            errors.append(f"sigils.grammar.study: {k} must be a number (rules 1.10)")
    if sd and sd.get("provisional") is not True:
        errors.append("sigils.grammar.study: provisional (rules 1.10)")
    for x in sd.get("mastery_skills") or []:
        if x not in SKILLS:
            errors.append(f"sigils.grammar.study.mastery_skills: unknown skill {x}")
    if not (isinstance(wm.get("practised"), int) and isinstance(wm.get("mastered"), int) and 0 < wm["practised"] < wm["mastered"]):
        errors.append("sigils.grammar.word_mastery: practised < mastered, whole numbers (rules 1.10)")

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
        TR, CAPC = cb.get("cores", {}).get("unspent_core_point_trades_for_attribute_points", 0), 10  # no creation caps beyond the tree's own
        at, co = a.get("attributes") or {}, a.get("cores") or {}
        if set(at) != set(skill_attr.values()) or set(co) != {"body", "mind", "soul"}:
            errors.append(f"archetype {aid}: needs all 9 attributes and 3 cores")
        else:
            for s, v in preset.items():
                if s in skill_attr and at[skill_attr[s]] < v:
                    errors.append(f"archetype {aid}: {s} {v} is above its attribute")
            # rules 1.13 (Skeleton 2.0): Cores are group names, not points. An attribute runs 1 to 7 at creation, every
            # Attribute point is spent, and a Core shows the highest attribute of its family.
            A_CAP = cb.get("attributes", {}).get("cap_at_creation", 7)
            for x, v in at.items():
                if v > A_CAP or v < 1:
                    errors.append(f"archetype {aid}: attribute {x} {v} is outside 1-{A_CAP}")
            for c, v in co.items():
                top_attr = max([at[x] for x in at if attr_core[x] == c] + [1])
                if v != top_attr:
                    errors.append(f"archetype {aid}: core {c} should read {top_attr} (the highest attribute of its family)")
            a_sp = sum(v - 1 for v in at.values())
            if A_PTS - a_sp != 0:
                errors.append(f"archetype {aid}: doesn't spend every Attribute point (left {A_PTS - a_sp})")
        # leans: the class of the highest attribute, every tied one (Class Roster Revision 3)
        top_at = max(at.values()) if at else 0
        leans = sorted(b["id"] for b in base if at.get(b.get("attribute")) == top_at)
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
# Rules 1.15: enemy levels. Every tier row is its level 1 block with a damage factor; `levels.table` has one row for
# each level from min to max, in order, with the five columns the engine reads; the gap and the Narrator's shift are numbers.
if isinstance(data.get("enemies"), dict):
    _en = data["enemies"]; _lv = _en.get("levels")
    for t in items("enemies"):
        for f in ("hp", "defense", "attack_bonus", "armour", "damage"):
            if not isinstance(t.get(f), (int, float)) or isinstance(t.get(f), bool):
                errors.append(f"enemies:{t.get('id')}: {f} must be a number (the tier's level 1 value)")
        if isinstance(t.get("damage"), (int, float)) and t["damage"] <= 0:
            errors.append(f"enemies:{t.get('id')}: damage (the factor on its weapon's damage) must be above 0")
    # Rules 1.25: the fire doctrine of each tier (how it chooses among the targets it could attack).
    for t in items("enemies"):
        if t.get("doctrine") not in ("nearest", "spread", "focus"):
            errors.append(f"enemies:{t.get('id')}: doctrine must be nearest, spread or focus (rules 1.25)")
        for f in ("fire_spread", "fire_near"):
            v = t.get(f)
            if not isinstance(v, (int, float)) or isinstance(v, bool) or v < 0 or v > 1:
                errors.append(f"enemies:{t.get('id')}: {f} must be a number from 0 to 1 (rules 1.25)")
        if t.get("doctrine") == "spread" and not t.get("fire_spread"):
            errors.append(f"enemies:{t.get('id')}: a spread doctrine needs fire_spread above 0")
        if t.get("doctrine") == "nearest" and not t.get("fire_near"):
            errors.append(f"enemies:{t.get('id')}: a nearest doctrine needs fire_near above 0")
    if not isinstance(_lv, dict):
        errors.append("enemies: needs a levels block (rules 1.15)")
    else:
        lo, hi, rows = _lv.get("min"), _lv.get("max"), _lv.get("table") or []
        if not (isinstance(lo, int) and isinstance(hi, int) and 1 <= lo <= hi):
            errors.append("enemies.levels: min and max must be whole numbers, 1 <= min <= max")
        elif [r.get("level") for r in rows if isinstance(r, dict)] != list(range(lo, hi + 1)):
            errors.append(f"enemies.levels.table: needs one row for each level {lo} to {hi}, in order")
        for r in rows:
            if not isinstance(r, dict):
                errors.append("enemies.levels.table: every row is an object"); continue
            for f in ("hp_mult", "armour_mult", "damage_mult"):
                if not isinstance(r.get(f), (int, float)) or isinstance(r.get(f), bool) or r[f] <= 0:
                    errors.append(f"enemies.levels.table level {r.get('level')}: {f} must be a number above 0")
            for f in ("defense_plus", "attack_plus"):
                if not isinstance(r.get(f), int) or isinstance(r.get(f), bool):
                    errors.append(f"enemies.levels.table level {r.get('level')}: {f} must be a whole number")
        sh = _lv.get("narrator_shift") or {}
        if not (isinstance(sh.get("min"), int) and isinstance(sh.get("max"), int) and sh["min"] <= 0 <= sh["max"]):
            errors.append("enemies.levels.narrator_shift: min and max must be whole numbers around 0")
        gp = _lv.get("gap") or {}
        for f in ("one_hit_levels_below", "to_hit_per_level", "max_levels"):
            if not isinstance(gp.get(f), int) or isinstance(gp.get(f), bool) or gp[f] < 0:
                errors.append(f"enemies.levels.gap: {f} must be a whole number, 0 or more")
        if _lv.get("provisional") is not True:
            errors.append("enemies.levels: must be flagged provisional (spec section 14, items 1015 to 1024)")
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

# World Play, rules revision 1.7: kinds and weights, avatar pools (ids in art/catalog.json), the hurt table, hazards
wp = data.get("world_play", {})
if wp:
    cat_path = root.parent / "art" / "catalog.json"
    cat_ids = set("char-" + k for k in (json.loads(cat_path.read_text()).get("characters") or {}).keys()) if cat_path.exists() else None
    pools = wp.get("avatar_pools") or {}
    for pid, lst in pools.items():
        for a in lst or []:
            if cat_ids is not None and a not in cat_ids:
                errors.append(f"world_play: avatar pool {pid}: {a} is not a character in art/catalog.json")
    for k in items("world_play"):
        if not isinstance(k.get("weight_kg"), (int, float)) or k["weight_kg"] <= 0:
            errors.append(f"world_play: kind {k.get('id')} needs a positive weight_kg")
        if k.get("avatar_pool") is not None and k["avatar_pool"] not in pools:
            errors.append(f"world_play: kind {k.get('id')} names unknown avatar pool {k['avatar_pool']}")
    if sorted((wp.get("fail_hurt") or {}).keys(), key=int) != ["8", "12", "16", "20"]:
        errors.append("world_play: fail_hurt must give damage for TN 8, 12, 16 and 20")
    for h in wp.get("hazards") or []:
        for sev in ("light", "heavy"):
            if not isinstance((h.get("damage") or {}).get(sev), (int, float)):
                errors.append(f"world_play: hazard {h.get('id')} has no {sev} damage")
            cnd = (h.get("condition") or {}).get(sev)
            if cnd and cnd not in known["condition"] and cnd not in ("prone",):
                errors.append(f"world_play: hazard {h.get('id')} {sev}: unknown condition {cnd}")
        if h.get("save") and h["save"] not in ("body", "brain", "heart"):
            errors.append(f"world_play: hazard {h.get('id')}: save must be body, brain or heart")
    for a in wp.get("hazard_approaches") or []:
        for sk in a.get("skills") or []:
            if sk not in SKILLS:
                errors.append(f"world_play: hazard approach {a.get('id')}: unknown skill {sk}")
    if "cache" not in ids_of(items("objects")):
        errors.append("objects: the cache kind (World Play) is missing")
    # Rules revision 1.9 (World Play 1.1): the pile kind (open, never blocking, a spot TN and range) and its limits
    pile = next((o for o in items("objects") if o.get("id") == "pile"), None)
    if not pile:
        errors.append("objects: the pile kind (World Play 1.1) is missing")
    else:
        if pile.get("blocks_move") or pile.get("blocks_sight") or pile.get("cover") is not None or pile.get("hp") is not None:
            errors.append("objects:pile: a pile never blocks, gives no cover and has no HP")
        sp = pile.get("spot") or {}
        if not all(isinstance(sp.get(k), int) and sp[k] > 0 for k in ("detect_tn", "detect_range")):
            errors.append("objects:pile: spot needs a positive detect_tn and detect_range")
    pl = wp.get("pile") or {}
    for k in ("max_entries", "narrator_entries_per_turn", "narrator_items_per_pile", "rounds_max", "route_slack_tiles", "tactical_reload_extra_ap"):
        if not isinstance(pl.get(k), int) or pl[k] < 0:
            errors.append(f"world_play: pile.{k} must be a whole number of 0 or more")
    if isinstance(pl.get("narrator_items_per_pile"), int) and isinstance(pl.get("max_entries"), int) and pl["narrator_items_per_pile"] > pl["max_entries"]:
        errors.append("world_play: pile.narrator_items_per_pile can't exceed pile.max_entries")
    if not isinstance((wp.get("ap") or {}).get("pickup"), (int, float)):
        errors.append("world_play: ap.pickup (World Play 1.1) is missing")
    # Rules 1.9 gear in a fight (items 684-690): whole AP costs, a positive light-armour limit, and the action list agreeing
    gr = wp.get("gear") or {}
    for k in ("hand_ap", "two_handed_draw_ap", "swap_hands_ap", "put_away_ap_per_hand", "drop_ap", "light_armour_ap"):
        if not isinstance(gr.get(k), int) or gr[k] < 0:
            errors.append(f"world_play: gear.{k} must be a whole number of 0 or more")
    if not isinstance(gr.get("light_armour_max_kg"), (int, float)) or gr["light_armour_max_kg"] <= 0:
        errors.append("world_play: gear.light_armour_max_kg must be a positive weight")
    def _acts(o):
        if isinstance(o, dict):
            for v in o.values():
                r = _acts(v)
                if r is not None:
                    return r
        elif isinstance(o, list):
            if any(isinstance(x, dict) and x.get("id") == "interact" for x in o):
                return o
            for v in o:
                r = _acts(v)
                if r is not None:
                    return r
        return None
    acts = {a.get("id"): a for a in (_acts(data.get("rules", {})) or []) if isinstance(a, dict)}
    for aid, key in (("draw", "hand_ap"), ("draw_two_handed", "two_handed_draw_ap"), ("swap_hands", "swap_hands_ap"), ("put_away", "put_away_ap_per_hand"), ("drop_held", "drop_ap"), ("light_armour", "light_armour_ap")):
        if aid not in acts:
            errors.append(f"rules: action {aid} (rules 1.9 gear in a fight) is missing")
        elif gr.get(key) is not None and acts[aid].get("ap") != gr.get(key):
            errors.append(f"rules: action {aid} costs {acts[aid].get('ap')} but world_play gear.{key} is {gr.get(key)}")
    if "light_armour" in acts and gr.get("light_armour_max_kg") is not None and acts["light_armour"].get("max_kg") != gr.get("light_armour_max_kg"):
        errors.append("rules: action light_armour max_kg disagrees with world_play gear.light_armour_max_kg")

# The perk card in a fight (data/perk_cards.json; rules 1.14, engine review 4 finding 9): the trigger each held item
# waits for is declared here (never read out of card prose). Every id must be a real perk, trait or skill perk.
if "perk_cards" in data:
    _pc = data["perk_cards"]
    _perks = {x.get("id"): x for x in items("perks")}
    _traits = ids_of(items("traits"))
    _skills = ids_of(items("skills"))
    def _card_item(key):
        kind, _, rest = str(key).partition(":")
        if kind == "perk":
            return rest in _perks
        if kind == "trait":
            return rest in _traits
        if kind == "skill":
            sk, _, n = rest.rpartition(".")
            return sk in _skills and n.isdigit()
        return False
    _seen_cards = set()
    for r in _pc.get("items", []):
        rid, tier = r.get("id"), r.get("tier")
        if not _card_item(rid):
            errors.append(f"perk_cards: {rid} is not a perk, a trait or a skill perk in the data")
            continue
        if (rid, tier) in _seen_cards:
            errors.append(f"perk_cards: {rid} {tier or ''} is listed twice")
        _seen_cards.add((rid, tier))
        if str(rid).startswith("perk:"):
            pk = _perks[str(rid)[5:]]
            tiers = list((pk.get("tiers") or {}).keys()) or [pk.get("tier")]
            if tier not in tiers and not (pk.get("tier") == "acquired" and tier in ("I", "II")):
                errors.append(f"perk_cards: {rid} has no tier {tier}")
        elif tier is not None:
            errors.append(f"perk_cards: {rid}: only a perk has a tier")
        t = r.get("trigger")
        if not isinstance(t, str) or len(t.split()) < 3 or t.endswith(".") or t[:1] != t[:1].lower():
            errors.append(f"perk_cards: {rid}: trigger must be the moment in a few words, lower case, with no full stop")
        if "standing" in r and r.get("standing") is not True:
            errors.append(f"perk_cards: {rid}: standing is true or left out")
    for cid in _pc.get("core_wired", []):
        if cid not in _perks and cid not in _traits:
            errors.append(f"perk_cards: core_wired names {cid}, which is not a perk or a trait")
    for key in _pc.get("private_count", []):
        if not _card_item(key):
            errors.append(f"perk_cards: private_count names {key}, which is not an item")

# The basic actions of a fight (data/actions.json; engine review 4, finding 1): the rows the engine hands the client.
# Each needs a name, a text, a tab and an action type; its base AP is a whole number of 0 or more (or null where it is
# not one number), and agrees with the same action in rules.json combat.actions when `rule` names one.
if "actions" in data:
    _rule_acts = {a.get("id"): a for a in ((data.get("rules", {}).get("combat", {}) or {}).get("actions") or []) if isinstance(a, dict)}
    _seen_acts = set()
    for a in items("actions"):
        aid = a.get("id")
        if not aid or aid in _seen_acts:
            errors.append(f"actions: missing or repeated id {aid}")
        _seen_acts.add(aid)
        for k in ("name", "text", "type"):
            if not isinstance(a.get(k), str) or not a.get(k):
                errors.append(f"actions: {aid} needs {k}")
        if a.get("tab") not in ("move", "attack", "utility"):
            errors.append(f"actions: {aid}: tab must be move, attack or utility")
        if not str(a.get("type", "")).startswith("combat/"):
            errors.append(f"actions: {aid}: type must be a combat action")
        if a.get("adjudication") != "engine":
            errors.append(f"actions: {aid}: a basic action is the engine's (adjudication: engine)")
        for k in [k for k in a if k == "ap" or k.startswith("ap_")]:
            v = a.get(k)
            if not (v is None and k == "ap") and not (isinstance(v, int) and not isinstance(v, bool) and v >= 0):
                errors.append(f"actions: {aid}.{k} must be a whole number of 0 or more")
        if a.get("ap") is None and "{" not in str(a.get("cost", "")) and aid not in ("cover", "pullfree"):
            errors.append(f"actions: {aid} has no ap: it needs a cost text")
        for rk, apk in (("rule", "ap"), ("rule_downed", "ap_downed")):
            r = a.get(rk)
            if r is None:
                continue
            if r not in _rule_acts:
                errors.append(f"actions: {aid}.{rk} names {r}, which is not in rules.json combat.actions")
            elif isinstance(_rule_acts[r].get("ap"), int) and a.get(apk) != _rule_acts[r].get("ap"):
                errors.append(f"actions: {aid} costs {a.get(apk)} AP but rules.json {r} says {_rule_acts[r].get('ap')}")
        if aid == "stim" and "stabilise" in _rule_acts and a.get("ap_downed_medic") != _rule_acts["stabilise"].get("ap_combat_medic"):
            errors.append("actions: stim.ap_downed_medic disagrees with rules.json stabilise.ap_combat_medic")
        if aid == "pickup" and (data.get("world_play", {}).get("ap") or {}).get("pickup") not in (None, a.get("ap")):
            errors.append("actions: pickup.ap disagrees with world_play ap.pickup")

# Rules 1.10 (Sigil 1.5): the sigil_mark kind's Investigate numbers, and the marks the campaigns place
_mk = next((o for o in items("objects") if o.get("id") == "sigil_mark"), None)
if _mk is None:
    errors.append("objects: the sigil_mark kind (rules 1.10) is missing")
else:
    mk = _mk.get("mark") or {}
    for sk in mk.get("skills") or []:
        if sk not in SKILLS:
            errors.append(f"objects:sigil_mark: unknown skill {sk}")
    if not mk.get("skills"):
        errors.append("objects:sigil_mark: mark.skills is empty")
    for age in mk.get("ages") or []:
        for dmg in mk.get("damages") or []:
            if ((mk.get("tn") or {}).get(age) or {}).get(dmg) not in (8, 12, 16, 20):
                errors.append(f"objects:sigil_mark: mark.tn {age}/{dmg} must be 8, 12, 16 or 20")
    if mk.get("default_age") not in (mk.get("ages") or []) or mk.get("default_damage") not in (mk.get("damages") or []):
        errors.append("objects:sigil_mark: the default age and damage must be listed")
    if not isinstance(mk.get("study"), int) or mk["study"] <= 0:
        errors.append("objects:sigil_mark: mark.study must be a positive whole number")
    if mk.get("provisional") is not True:
        errors.append("objects:sigil_mark: mark must be flagged provisional (rules 1.10)")
    _words = {w.get("id") for w in items("sigils")}
    for cp in sorted((root / "campaigns").glob("*.json")):
        try:
            camp = json.loads(cp.read_text())
        except Exception:
            continue
        for z in camp.get("zones") or []:
            for o in z.get("objects") or []:
                if o.get("kind") != "sigil_mark":
                    continue
                if o.get("word") not in _words:
                    errors.append(f"campaigns/{cp.name}:{z.get('id')}: sigil mark at {o.get('at')} needs a known word (got {o.get('word')!r})")
                if o.get("age") is not None and o["age"] not in (mk.get("ages") or []):
                    errors.append(f"campaigns/{cp.name}:{z.get('id')}: sigil mark at {o.get('at')}: unknown age {o['age']}")
                if o.get("damage") is not None and o["damage"] not in (mk.get("damages") or []):
                    errors.append(f"campaigns/{cp.name}:{z.get('id')}: sigil mark at {o.get('at')}: unknown damage {o['damage']}")

# Maps, rules 1.16: the limits, the shared layouts, and every campaign zone's size, picture and start tiles
import maplayout as _ml
_maps = data.get("maps")
if not _maps:
    errors.append("maps: data/maps.json (rules 1.16) is missing")
else:
    _lim = _maps.get("limits") or {}
    if _lim.get("max") != 26:
        errors.append("maps: limits.max must be 26 (Leon, 11 Nov 2026: A to Z by 1 to 26)")
    if not (isinstance(_lim.get("min"), int) and 1 <= _lim["min"] <= _lim.get("max", 0)):
        errors.append("maps: limits.min must be a whole number up to the maximum")
    if _lim.get("min_provisional") is not True:
        errors.append("maps: limits.min is provisional (spec section 14) and must be flagged min_provisional")
    if not (_lim.get("deploy_min") == 10 and _lim.get("deploy_max") == 14):
        errors.append("maps: the sides deploy 10 to 14 tiles apart (limits.deploy_min, limits.deploy_max)")
    if _lim.get("full_size") != _lim.get("max"):
        errors.append("maps: limits.full_size (open ground, the Proving Ground) must be the maximum")
    _okinds = ids_of(items("objects"))
    for _ch, _v in (_maps.get("legend") or {}).items():
        if len(_ch) != 1:
            errors.append(f"maps: legend key {_ch!r} must be one character")
        if isinstance(_v, dict) and _v.get("kind") not in _okinds:
            errors.append(f"maps: legend {_ch!r} names unknown object kind {_v.get('kind')!r}")

    def _check_ground(where, w, h, solid, objects, start, enemy):
        """Start tiles on the map, on free ground; objects of known kinds."""
        sol = _ml.expand_refs(solid, w, h)
        blk = {}
        for o in objects or []:
            if o.get("kind") not in _okinds:
                errors.append(f"{where}: unknown object kind {o.get('kind')!r}")
                continue
            kd = next(k for k in items("objects") if k.get("id") == o["kind"])
            if kd.get("blocks_move"):
                for t in _ml.expand_refs([o.get("at")], w, h):
                    blk[t] = o.get("name") or kd.get("name")
        for lst, what in ((start, "start"), (enemy, "enemy start")):
            for r in lst or []:
                ts = _ml.expand_refs([r], w, h)
                if not ts:
                    errors.append(f"{where}: {what} tile {r} is off the map")
                for t in ts:
                    if t in sol:
                        errors.append(f"{where}: {what} tile {_ml.ref(*t)} is inside solid ground")
                    elif t in blk:
                        errors.append(f"{where}: {what} tile {_ml.ref(*t)} is on {blk[t]}, which blocks the way")
        return sol, blk

    def _gap(a, b):
        return min((max(abs(p[0] - q[0]), abs(p[1] - q[1])) for p in a for q in b), default=None)

    for _lid, _lay in (_maps.get("layouts") or {}).items():
        _bad = _ml.size_problem(_maps, _lay.get("w"), _lay.get("h"))
        if _bad:
            errors.append(f"maps:{_lid}: {_bad}")
            continue
        _parts, _errs = _ml.read_layout(_maps, _lay.get("rows"), _lay["w"], _lay["h"], _lay.get("legend"))
        for _e in _errs:
            errors.append(f"maps:{_lid}: {_e}")
        if not _parts["start"] or not _parts["enemyStart"]:
            errors.append(f"maps:{_lid}: a shared layout needs squad (S) and enemy (E) start tiles")
        _check_ground(f"maps:{_lid}", _lay["w"], _lay["h"], _parts["solid"], _parts["objects"], _parts["start"], _parts["enemyStart"])
    for cp in sorted((root / "campaigns").glob("*.json")):
        try:
            camp = json.loads(cp.read_text())
        except Exception as e:
            errors.append(f"campaigns/{cp.name}: does not parse ({e})")
            continue
        for z0 in camp.get("zones") or []:
            _w = f"campaigns/{cp.name}:{z0.get('id')}"
            z, _errs = _ml.expand_zone(_maps, z0)
            for _e in _errs:
                errors.append(f"{_w}: {_e}")
            _bad = _ml.size_problem(_maps, z.get("w"), z.get("h"))
            if _bad:
                errors.append(f"{_w}: {_bad}")
                continue
            if not z.get("start"):
                errors.append(f"{_w}: needs start tiles")
            _check_ground(_w, z["w"], z["h"], z.get("solid"), z.get("objects"), z.get("start"), z.get("enemyStart"))
            if (z.get("art") or {}).get("map"):
                errors.append(f"{_w}: art.map names a map painting, but every map is plain colour until it is repainted (rules 1.16; art/briefs/ART-REQUESTS.md section 3)")
            # A full-size map: the nearest of each side 10 to 14 tiles apart (when it names both starts).
            if z["w"] == _lim.get("full_size") and z["h"] == _lim.get("full_size") and z.get("enemyStart"):
                _g = _gap(_ml.expand_refs(z.get("start"), z["w"], z["h"]), _ml.expand_refs(z.get("enemyStart"), z["w"], z["h"]))
                if _g is not None and not (_lim.get("deploy_min", 0) <= _g <= _lim.get("deploy_max", 99)):
                    errors.append(f"{_w}: the nearest squad and enemy start tiles are {_g} apart; a full-size map deploys them {_lim.get('deploy_min')} to {_lim.get('deploy_max')} apart")

# Soul magic, rules 1.5 (Outburst 2.0): tones, forms, retired modules, the cycle's numbers
soul = data.get("soul_modules", {})
if soul:
    mod_ids = ids_of(items("soul_modules"))
    el_ids = set((data.get("sigils", {}).get("elements") or {}).keys())
    cond_ids = known["condition"]
    RIDERS = {"cond", "spread", "ground", "ground_around", "ignore_cover", "chain", "armour_full", "bonus_damage", "push", "push_around"}
    obj_ids = ids_of(items("objects"))
    sm = (soul.get("cycle") or {}).get("stage_mult")
    if not (isinstance(sm, list) and len(sm) == 5 and all(isinstance(x, (int, float)) for x in sm)):
        errors.append("soul_modules: cycle.stage_mult must list 5 numbers (stages 0-4)")
    tones = soul.get("tones") or []
    if "raw" not in {t.get("id") for t in tones}:
        errors.append("soul_modules: tones must include raw")
    for t in tones:
        tid = t.get("id")
        if t.get("element") is not None and t["element"] not in el_ids:
            errors.append(f"soul_modules: tone {tid} element '{t['element']}' is not in sigils.json elements")
        if t.get("element"):
            for st in ("1", "2", "3", "4"):
                if st not in (t.get("stages") or {}):
                    errors.append(f"soul_modules: tone {tid} has no stage {st}")
        for st, v in (t.get("stages") or {}).items():
            for r in v.get("riders", []):
                if r.get("rider") not in RIDERS:
                    errors.append(f"soul_modules: tone {tid} stage {st}: unknown rider '{r.get('rider')}'")
                if r.get("condition") and cond_ids and r["condition"] not in cond_ids:
                    errors.append(f"soul_modules: tone {tid} stage {st}: unknown condition '{r['condition']}'")
                if r.get("object") and r["object"] not in obj_ids:
                    errors.append(f"soul_modules: tone {tid} stage {st}: unknown object '{r['object']}'")
    for m in items("soul_modules"):
        if m.get("form") and not (m.get("area") or {}).get("shape") in ("cone", "radius", "line"):
            errors.append(f"soul_modules: form {m.get('id')} needs area.shape cone, radius or line")
    for r in soul.get("retired") or []:
        if r.get("id") in mod_ids:
            errors.append(f"soul_modules: retired module {r['id']} is still in items")
        if r.get("becomes") and r["becomes"] not in mod_ids:
            errors.append(f"soul_modules: retired {r.get('id')} becomes unknown module {r['becomes']}")
    # rules 1.8 (Outburst 4.0): gates name Soul skills and real modules; templates use real schools and modules;
    # class-gated modules name a class
    gates = soul.get("gates") or {}
    for sk, ms in (gates.get("skills") or {}).items():
        if known["skill"] and sk not in known["skill"]:
            errors.append(f"soul_modules: gate skill '{sk}' is not a skill")
        for m in ms:
            if m not in mod_ids:
                errors.append(f"soul_modules: gate {sk} names unknown module '{m}'")
    for m in items("soul_modules"):
        g = m.get("gate")
        if g and (g.get("points") not in (2, 4) or m.get("id") not in (gates.get("skills") or {}).get(g.get("skill"), [])):
            errors.append(f"soul_modules: module {m.get('id')} gate {g} disagrees with gates.skills")
        if m.get("locked") and not m.get("class"):
            errors.append(f"soul_modules: locked module {m.get('id')} names no class")
    for t in (soul.get("start") or {}).get("designs") or []:
        if t.get("school") not in {s.get("id") for s in soul.get("schools") or []}:
            errors.append(f"soul_modules: start design {t.get('id')} has unknown school {t.get('school')}")
        for m in t.get("modules") or []:
            if m not in mod_ids:
                errors.append(f"soul_modules: start design {t.get('id')} has unknown module {m}")

# feelings (rules 1.8, Outburst 4.0): 25, numbered 1-25, a family from the list, a step, a trigger, a residue kind;
# the conditions they put on people exist
fe = data.get("feelings") or {}
if isinstance(fe, dict) and fe.get("items"):
    fams = set((fe.get("families") or {}).keys())
    fl = fe["items"]
    if len(fl) != 25 or sorted(x.get("n") for x in fl) != list(range(1, 26)):
        errors.append("feelings: there must be 25 feelings numbered 1-25")
    for x in fl:
        w = f"feelings:{x.get('id')}"
        if x.get("family") not in fams:
            errors.append(f"{w}: unknown family {x.get('family')}")
        if not isinstance(x.get("step"), dict) or not x["step"]:
            errors.append(f"{w}: needs a step")
        if not (x.get("trigger") or {}).get("event"):
            errors.append(f"{w}: needs a trigger event")
        r = x.get("residue") or {}
        if r.get("kind") not in ("helps", "harms", "none"):
            errors.append(f"{w}: residue kind must be helps, harms or none")
        for part in (x.get("pour") or {}, r):
            cs = [part.get("condition")] + list(part.get("random") or []) + list(part.get("cleanse") or [])
            for c in cs:
                if c and known["condition"] and c not in known["condition"] and c not in ("bleeding",):
                    errors.append(f"{w}: unknown condition '{c}'")
    for d0 in fe.get("start_default") or []:
        if d0 not in {x.get("id") for x in fl}:
            errors.append(f"feelings: start_default names unknown feeling {d0}")

# patrons (rules 1.6, Blessing 2.0): tags exist, 3 Hymns at tiers 1-3, a Miracle, an Open or Jealous rule, two rites
# (one an engine button), an intervention, every voice-line bank with 3 lines; Whispers and vows complete.
# Rules 1.6.3 (Faith 2.2): 11 banks (grant: each line calls the devoted by {name}); the intervention's trigger is one
# the engine runs; per-fight limits and the Devotion scaling in prayer.intervention, which scaled interventions match.
INTERVENTION_TRIGGERS = {"enemy_harms_helpless", "you_reload", "core_dry", "mp_out", "enemy_misses_you", "ally_would_die",
                         "ally_below_quarter", "you_kill", "ally_hit_adjacent", "enemy_crits_you"}
pat = data.get("patrons") or {}
if isinstance(pat, dict) and pat.get("tags"):
    tag_ids = {t.get("id") for t in pat.get("tags") or []}
    banks = pat.get("line_banks") or []
    if len(banks) != 11 or "grant" not in banks:
        errors.append(f"patrons: line_banks should list 11 banks, grant among them (rules 1.6.3), has {len(banks)}")
    piv = (pat.get("prayer") or {}).get("intervention") or {}
    pf, pfh, hfd = piv.get("per_fight"), piv.get("per_fight_high"), piv.get("high_from_devotion")
    if not (isinstance(pf, int) and pf >= 1 and isinstance(pfh, int) and pfh >= pf and isinstance(hfd, int) and 1 <= hfd <= 10):
        errors.append("patrons: prayer.intervention needs per_fight (1 or more), per_fight_high (at least per_fight) and high_from_devotion (a level 1-10)")
    amt = piv.get("amount") or {}
    if not (isinstance(amt.get("base"), int) and amt["base"] > 0 and isinstance(amt.get("per_devotion"), int) and amt["per_devotion"] >= 0):
        errors.append("patrons: prayer.intervention.amount needs a whole base above 0 and a whole per_devotion (0 or more)")
    if ((pat.get("prayer") or {}).get("witnessed") or {}).get("until") != ["fight_end", "intervention"]:
        errors.append("patrons: prayer.witnessed.until must be [fight_end, intervention] (rules 1.6.3)")
    # rules 1.6.1 (Faith 2.1): Devotion XP, the curve rising from 0 to its 10 levels; the sources, tag caps and the
    # Narrator's range; the day cooldown after leaving a pact
    dv = pat.get("devotion") or {}
    curve = (dv.get("xp") or {}).get("curve") or []
    if len(curve) != 11 or curve[0] != 0 or any(not isinstance(x, int) or x < 0 for x in curve) or any(b <= a for a, b in zip(curve, curve[1:])):
        errors.append("patrons: devotion.xp.curve needs 11 rising whole numbers from 0 (levels 0-10)")
    if not (isinstance(dv.get("start"), int) and 0 <= dv["start"] <= 10):
        errors.append("patrons: devotion.start must be a level from 0 to 10")
    for grp, keys in (("gain", ("liked_tag", "vow_kept", "rite_kept", "convert_someone", "deed_min", "deed_max", "piece_on_conversion")),
                      ("loss", ("taboo_tag", "taboo_tag_witnessed", "vow_broken", "overreach_miss", "break_character_seen", "judgement")),
                      ("tag_caps", ("fight", "scene", "session")), ("narrator", ("min", "max", "session_gain_cap")), ("apostasy", ("cooldown_days",))):
        for k in keys:
            v = (dv.get(grp) or {}).get(k)
            if not isinstance(v, int) or (grp != "narrator" and v < 0):
                errors.append(f"patrons: devotion.{grp}.{k} must be a whole number" + ("" if grp == "narrator" else " (0 or more; losses are written as positive numbers)"))
    nar = dv.get("narrator") or {}
    if isinstance(nar.get("min"), int) and isinstance(nar.get("max"), int) and not (nar["min"] < 0 < nar["max"]):
        errors.append("patrons: devotion.narrator needs min below 0 and max above 0")
    for k in ("liked_tag_fight_cap", "narrator_delta_max"):
        if k in (dv.get("gain") or {}) or k in dv:
            errors.append(f"patrons: devotion.{k} is retired (Faith 2.1: tag_caps, narrator)")
    # rules 1.6.2 (Miracle 2.1): the Miracle needs Devotion 10 (the gate and prayer.miracle.devotion_min agree, above
    # Hymn III) and lowers Devotion by whole levels (devotion_cost_levels, 1 up to the gate); "spends all" is retired
    gates = dv.get("gates") or {}
    pm = (pat.get("prayer") or {}).get("miracle") or {}
    if not (isinstance(gates.get("miracle"), int) and isinstance(gates.get("hymn_3"), int) and gates["hymn_3"] < gates["miracle"] <= 10):
        errors.append("patrons: devotion.gates.miracle must be a level above hymn_3, at most 10 (rules 1.6.2: 10)")
    if pm.get("devotion_min") != gates.get("miracle"):
        errors.append("patrons: prayer.miracle.devotion_min must equal devotion.gates.miracle")
    cost = pm.get("devotion_cost_levels")
    if not (isinstance(cost, int) and 1 <= cost <= (gates.get("miracle") if isinstance(gates.get("miracle"), int) else 10)):
        errors.append("patrons: prayer.miracle.devotion_cost_levels must be a whole number of levels from 1 to the Miracle's gate")
    if "spends" in pm:
        errors.append("patrons: prayer.miracle.spends is retired (rules 1.6.2: devotion_cost_levels)")
    if "miss_devotion" in ((pat.get("prayer") or {}).get("overreach") or {}):
        errors.append("patrons: prayer.overreach.miss_devotion is retired (Faith 2.1: devotion.loss.overreach_miss, in XP)")
    if "devotion" in (((data.get("rules") or {}).get("mana") or {}).get("prayer") or {}):
        errors.append("rules: prayer.devotion is retired (rules 1.6.1: Devotion lives in patrons.json devotion, in XP)")
    # Devotion is moved in XP (rules 1.6.1): a text giving an amount of Devotion must say XP ("+4 Devotion XP"), never a
    # bare level ("+1 Devotion"); "spend 1 Devotion" style costs name their XP too
    def faith_texts(x, path):
        if isinstance(x, dict):
            for k, v in x.items():
                yield from faith_texts(v, f"{path}.{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                yield from faith_texts(v, f"{path}[{i}]")
        elif isinstance(x, str):
            yield path, x
    for path, t in faith_texts(pat, "patrons"):
        for m in re.finditer(r"[+\-−]\s?\d+ Devotion(?! XP)", t):
            errors.append(f"{path}: '{m.group(0)}' gives Devotion in levels; rules 1.6.1 moves Devotion XP ('{m.group(0)} XP')")
    cond_kinds = {c.get("id"): c.get("adjudication") for c in items("conditions")}
    if len(pat.get("whispers") or []) != 7:
        errors.append("patrons: there should be 7 Whispers (rules 1.21: Rebuke is the seventh)")
    for w in pat.get("whispers") or []:
        for f in ("id", "name", "text", "target", "effects"):
            if f not in w:
                errors.append(f"patrons: Whisper {w.get('id')} has no {f}")
    for v in pat.get("vows") or []:
        for f in ("id", "name", "words", "broken_when"):
            if f not in v:
                errors.append(f"patrons: vow {v.get('id')} has no {f}")
    for p in items("patrons"):
        pid = p.get("id")
        for f in ("costume", "archetype", "accent", "likes", "taboos", "rule", "rites", "intervention", "hymns", "miracle", "lines"):
            if f not in p:
                errors.append(f"patrons:{pid}: no {f}")
        for t in (p.get("likes") or []) + (p.get("taboos") or []):
            if t not in tag_ids:
                errors.append(f"patrons:{pid}: unknown tag '{t}'")
        if len(p.get("likes") or []) != 3 or len(p.get("taboos") or []) != 2:
            errors.append(f"patrons:{pid}: needs 3 liked tags and 2 taboo tags")
        if p.get("rule") not in ("open", "jealous"):
            errors.append(f"patrons:{pid}: rule must be open or jealous")
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(p.get("accent") or "")):
            errors.append(f"patrons:{pid}: accent must be a #RRGGBB colour")
        hy = p.get("hymns") or []
        if sorted(h.get("tier") for h in hy) != [1, 2, 3]:
            errors.append(f"patrons:{pid}: needs 3 Hymns at tiers 1, 2 and 3")
        for h in hy + ([p["miracle"]] if p.get("miracle") else []):
            for f in ("id", "name", "text", "target", "effects"):
                if f not in h:
                    errors.append(f"patrons:{pid}: {h.get('id')} has no {f}")
        rites = p.get("rites") or []
        if len(rites) != 2 or sum(1 for r in rites if r.get("engine")) != 1:
            errors.append(f"patrons:{pid}: needs 2 rites, one of them an engine rite")
        for r in rites:
            if r.get("engine") and (r.get("check") or {}).get("kind") not in ("story", "after_rest", "tithe_item"):
                errors.append(f"patrons:{pid}: engine rite {r.get('id')} needs check.kind story, after_rest or tithe_item")
        iv = p.get("intervention") or {}
        if not iv.get("trigger"):
            errors.append(f"patrons:{pid}: the intervention needs a trigger")
        else:
            # several triggers (the Quartermaster's reload, dry core and empty MP): triggers lists them, trigger is the
            # first, and an effect's when names the one it answers
            trig = iv.get("triggers") or [iv["trigger"]]
            if iv["trigger"] != trig[0]:
                errors.append(f"patrons:{pid}: intervention.trigger must be the first of intervention.triggers")
            for t in trig:
                if t not in INTERVENTION_TRIGGERS:
                    errors.append(f"patrons:{pid}: intervention trigger '{t}' is not one the engine runs ({', '.join(sorted(INTERVENTION_TRIGGERS))})")
            for e in iv.get("effects") or []:
                if "when" in e and e["when"] not in trig:
                    errors.append(f"patrons:{pid}: intervention effect when '{e['when']}' is not one of its triggers")
            if len(trig) > 1 and any("when" not in e for e in iv.get("effects") or []):
                errors.append(f"patrons:{pid}: with several triggers every intervention effect names its trigger (when)")
        if iv.get("scale") not in (None, "devotion"):
            errors.append(f"patrons:{pid}: intervention.scale must be devotion (or absent)")
        if iv.get("scale") == "devotion":
            nums = [e for e in iv.get("effects") or [] if isinstance(e.get("value"), int) and "per_devotion" in e]
            if not nums:
                errors.append(f"patrons:{pid}: a Devotion-scaled intervention needs an effect with a value and per_devotion")
            for e in nums:
                if e.get("op") == "heal":
                    continue  # rules 1.20: a healing intervention carries its own numbers (fitted to a Soldier's turn)
                sign = -1 if e["value"] < 0 else 1
                if abs(e["value"]) != amt.get("base") or e["per_devotion"] != sign * (amt.get("per_devotion") or 0):
                    errors.append(f"patrons:{pid}: intervention effect {e.get('op')} must be {amt.get('base')} + {amt.get('per_devotion')} × Devotion (prayer.intervention.amount)")
            if "Devotion" not in str(iv.get("text") or ""):
                errors.append(f"patrons:{pid}: a Devotion-scaled intervention's text must say so")
        # leaving this patron (rules 1.6.1): Open patrons roll d20 + Faith vs their tn, Jealous ones never let go; the
        # grudge's condition must be one the engine runs (conditions.json, adjudication engine)
        lv = p.get("leave") or {}
        if lv.get("lets_go") not in ("roll", "never"):
            errors.append(f"patrons:{pid}: leave.lets_go must be roll or never")
        if (lv.get("lets_go") == "roll") != (p.get("rule") == "open"):
            errors.append(f"patrons:{pid}: an Open patron rolls to let you go (lets_go roll), a Jealous one never does")
        if lv.get("lets_go") == "roll" and not (isinstance(lv.get("tn"), int) and 2 <= lv["tn"] <= 20):
            errors.append(f"patrons:{pid}: leave.tn must be a TN from 2 to 20")
        gr = lv.get("grudge") or {}
        if not (isinstance(gr.get("sessions"), int) and gr["sessions"] >= 1):
            errors.append(f"patrons:{pid}: leave.grudge.sessions must be 1 or more")
        elif p.get("rule") == "jealous" and not 2 <= gr["sessions"] <= 3:
            errors.append(f"patrons:{pid}: a Jealous patron's grudge is the harder one, 2 to 3 sessions")
        elif p.get("rule") == "open" and gr["sessions"] != 1:
            errors.append(f"patrons:{pid}: an Open patron's grudge is the light one, 1 session")
        if not (isinstance(gr.get("rounds"), int) and gr["rounds"] >= 1):
            errors.append(f"patrons:{pid}: leave.grudge.rounds must be 1 or more")
        if not (isinstance(gr.get("xp_mult"), (int, float)) and 0 <= gr["xp_mult"] <= 1):
            errors.append(f"patrons:{pid}: leave.grudge.xp_mult must be from 0 to 1")
        if cond_kinds.get(gr.get("condition")) != "engine":
            errors.append(f"patrons:{pid}: leave.grudge.condition '{gr.get('condition')}' must be a condition the engine runs")
        if not gr.get("text"):
            errors.append(f"patrons:{pid}: leave.grudge needs its text")
        lines = p.get("lines") or {}
        for b in banks:
            if len(lines.get(b) or []) != 3:
                errors.append(f"patrons:{pid}: line bank {b} needs 3 lines")
        for ln in lines.get("grant") or []:
            if "{name}" not in ln:
                errors.append(f"patrons:{pid}: grant line '{ln}' must call the devoted by {{name}}")

# Rules 1.9 drop tables (World Play 1.1, spec 14 items 691-700): data/loot_tables.json
lt = data.get("loot_tables")
if lt is not None:
    RARITIES = {"standard", "fine", "masterwork", "relic", "celestial"}
    # the engine's enemy kinds (packages/engine/src/tactics.ts KINDS)
    FOE_KINDS = {"human", "robot", "crawler", "ork", "upper_realm", "cursed", "beast", "machine", "turret", "celestial", "drone"}
    tables = {t.get("id"): t for t in items("loot_tables") if isinstance(t, dict)}
    tiers = ids_of(items("enemies"))
    def _qty_ok(q):
        if isinstance(q, int) and not isinstance(q, bool):
            return 1 <= q <= 20
        return isinstance(q, list) and len(q) == 2 and all(isinstance(x, int) and not isinstance(x, bool) for x in q) and 1 <= q[0] <= q[1] <= 20
    def _drop_id_ok(i):
        if i in item_ids or i == "personal":
            return True
        if isinstance(i, str) and i.startswith("mag:"):
            w = next((x for x in items("weapons") if x.get("id") == i[4:]), None)
            return bool(w and w.get("magazine") is not None)
        if isinstance(i, str) and i.startswith("rounds:"):
            return True
        return False
    for tid, t in tables.items():
        if not tid:
            errors.append("loot_tables: a table has no id")
            continue
        if not isinstance(t.get("none"), (int, float)) or t["none"] < 0:
            errors.append(f"loot_tables:{tid}: none (the weight of nothing) must be 0 or more")
        if not isinstance(t.get("entries"), list):
            errors.append(f"loot_tables:{tid}: entries must be a list")
            continue
        if not t["entries"] and not t.get("none"):
            errors.append(f"loot_tables:{tid}: an empty table needs a weight for nothing")
        for e in t["entries"]:
            where = f"loot_tables:{tid}:{e.get('item')}"
            if not _drop_id_ok(e.get("item")):
                errors.append(f"{where}: unknown item or weapon id")
            if not isinstance(e.get("weight"), (int, float)) or e["weight"] <= 0:
                errors.append(f"{where}: weight must be above 0")
            if "qty" in e and not _qty_ok(e["qty"]):
                errors.append(f"{where}: qty must be 1-20 or [min, max] within 1-20")
            if "rarity" in e and e["rarity"] not in RARITIES:
                errors.append(f"{where}: unknown rarity {e['rarity']}")
            if "chance" in e:
                errors.append(f"{where}: a table entry is weighted; chance belongs to drops.items lists")
            if "note" in e and (not isinstance(e["note"], str) or not e["note"].strip() or len(e["note"]) > 40):
                errors.append(f"{where}: note must be a short text (a plate's lesson, item 692)")
    if "personal" in str([e.get("item") for t in tables.values() for e in t.get("entries", [])]):
        pi = lt.get("personal_items") or []
        if not pi or not all(isinstance(x, dict) and x.get("name") and x.get("text") for x in pi):
            errors.append("loot_tables: personal_items needs entries with a name and a text")
    caps = lt.get("caps") or {}
    for d in ("easy", "standard", "hard", "boss"):
        if not isinstance(caps.get(d), int) or caps[d] < 0:
            errors.append(f"loot_tables: caps.{d} must be a whole number of 0 or more")
    wd = lt.get("worn_durability") or {}
    if not all(isinstance(wd.get(k), (int, float)) for k in ("min", "max")) or not 0 < wd["min"] <= wd["max"] <= 1:
        errors.append("loot_tables: worn_durability needs 0 < min <= max <= 1")
    for k in ("spare_mags_max", "inline_max"):
        if not isinstance(lt.get(k), int) or lt[k] < 0:
            errors.append(f"loot_tables: {k} must be a whole number of 0 or more")
    for w in lt.get("natural_weapons") or []:
        if w not in wids:
            errors.append(f"loot_tables: natural weapon {w} is not a weapon")
    rbt = lt.get("rolls_by_tier") or {}
    for tier in tiers:
        if not isinstance(rbt.get(tier), int) or rbt[tier] < 0:
            errors.append(f"loot_tables: rolls_by_tier needs a whole number for tier {tier}")
    for tier in rbt:
        if tier not in tiers:
            errors.append(f"loot_tables: rolls_by_tier names unknown tier {tier}")
    kt = lt.get("kind_tables") or {}
    for k in FOE_KINDS:
        if kt.get(k) not in tables:
            errors.append(f"loot_tables: kind {k} needs a default table (kind_tables)")
    for k in kt:
        if k not in FOE_KINDS:
            errors.append(f"loot_tables: kind_tables names unknown kind {k}")
    for k in ("caster_table", "boss_table"):
        if lt.get(k) not in tables:
            errors.append(f"loot_tables: {k} must name a table")
    bt = tables.get(lt.get("boss_table"))
    if bt and (bt.get("none") or not bt.get("entries")):
        errors.append("loot_tables: the boss table always drops something (no weight for nothing, at least one entry)")

# Rules 1.13, Skeleton 2.0: data/calls.json (the nine Calls, one per gamma skill) and the enemy tiers' Call lists
cq = data.get("calls")
if isinstance(cq, dict):
    CALL_KINDS = {"helping", "hindering"}
    CALL_AIMS = {"ally", "enemy", "self-or-ally"}
    crules = cq.get("rules") or {}
    skill_by_id = {s.get("id"): s for s in items("skills") if isinstance(s, dict)}
    gammas = {sid for sid, s in skill_by_id.items() if s.get("slot") == "gamma"}
    cdefs = {c.get("id"): c for c in items("calls") if isinstance(c, dict)}
    if len(cdefs) != len(items("calls")):
        errors.append("calls: ids must be present and unique")
    for k in ("ap", "cheap_at", "cheap_ap", "free_at", "free_per_turn", "range_base", "range_per_point", "reaction_at", "reactions_per_round", "reaction_ap", "save_tn", "helping_per_round", "hindering_per_round", "mark_rounds"):
        if not isinstance(crules.get(k), int) or isinstance(crules.get(k), bool):
            errors.append(f"calls: rules.{k} must be a whole number")
    steps_at = crules.get("steps_at")
    if not (isinstance(steps_at, list) and len(steps_at) == 3 and steps_at == sorted(steps_at) and steps_at[0] == 1):
        errors.append("calls: rules.steps_at must be three rising point values, the first 1")
    if not isinstance((crules.get("enemy") or {}).get("per_turn"), int) or not isinstance((crules.get("enemy") or {}).get("beats"), (int, float)):
        errors.append("calls: rules.enemy needs per_turn and beats")
    seen_skills = {}
    for cid, c in cdefs.items():
        where = f"calls:{cid}"
        if not isinstance(cid, str) or not cid.startswith("call."):
            errors.append(f"{where}: a Call's id starts with 'call.' (the bare names are taken by techniques, moves and unlocks)")
        sk = c.get("skill")
        if sk not in skill_by_id:
            errors.append(f"{where}: skill '{sk}' is not a skill")
        elif sk not in gammas:
            errors.append(f"{where}: skill '{sk}' is not a gamma (only the gamma skills have Calls)")
        if sk in seen_skills:
            errors.append(f"{where}: {sk} already has a Call ({seen_skills[sk]})")
        seen_skills[sk] = cid
        if c.get("kind") not in CALL_KINDS:
            errors.append(f"{where}: kind '{c.get('kind')}' is not one of {sorted(CALL_KINDS)}")
        if c.get("aim") not in CALL_AIMS:
            errors.append(f"{where}: aim '{c.get('aim')}' is not one of {sorted(CALL_AIMS)}")
        if (c.get("aim") == "enemy") != (c.get("kind") == "hindering"):
            errors.append(f"{where}: a hindering Call is aimed at an enemy, a helping Call at an ally")
        if c.get("save") not in (None, "body", "brain", "heart"):
            errors.append(f"{where}: save must be body | brain | heart")
        if c.get("save") and c.get("kind") != "hindering":
            errors.append(f"{where}: only a hindering Call has a save")
        if not c.get("name") or not isinstance(c.get("text"), str) or not c.get("text"):
            errors.append(f"{where}: needs a name and a text")
        if c.get("adjudication") not in ("engine", "hybrid", "narrator"):
            errors.append(f"{where}: adjudication must be engine | hybrid | narrator")
        if c.get("provisional") is not True:
            errors.append(f"{where}: its numbers are provisional until play settles them (provisional: true)")
        st = c.get("steps")
        if not (isinstance(st, list) and len(st) == 3):
            errors.append(f"{where}: needs exactly three steps")
            continue
        if [x.get("at") for x in st] != steps_at:
            errors.append(f"{where}: its steps open at {[x.get('at') for x in st]}, the ladder's are {steps_at}")
        keys = None
        for i, x in enumerate(st):
            if not isinstance(x.get("text"), str) or not x.get("text"):
                errors.append(f"{where}: step {i + 1} needs a text")
            nums = x.get("numbers")
            if not isinstance(nums, dict) or not nums:
                errors.append(f"{where}: step {i + 1} needs its numbers")
                continue
            for k, v in nums.items():
                if not isinstance(v, (int, float)) or isinstance(v, bool):
                    errors.append(f"{where}: step {i + 1} numbers.{k} must be a number")
            if keys is not None and set(nums) != keys:
                errors.append(f"{where}: step {i + 1} must give the same numbers as step 1 ({sorted(keys)})")
            keys = keys or set(nums)
    for g in sorted(gammas - set(seen_skills)):
        errors.append(f"calls: the gamma skill {g} has no Call")
    for t in items("enemies"):
        if not isinstance(t, dict):
            continue
        lst = t.get("calls")
        if lst is None:
            errors.append(f"enemies:{t.get('id')}: needs a calls list (empty for a tier that never Calls) and a call_level")
            continue
        for cid in lst:
            if cid not in cdefs:
                errors.append(f"enemies:{t.get('id')}: calls names '{cid}', not a Call")
        lv = t.get("call_level")
        if not isinstance(lv, int) or isinstance(lv, bool) or lv < 0 or lv > 10 or (lst and lv < 1):
            errors.append(f"enemies:{t.get('id')}: call_level must be 0 to 10, and at least 1 for a tier with Calls")

# Rules 1.12, Physical 2.0: data/techniques.json and the weapons' phys blocks (docs/design/handoffs/physical-2.0-PLAN.md)
tq = data.get("techniques")
if isinstance(tq, dict):
    MELEE_PROPS = {"edge", "point", "blunt", "hook", "reach", "heavy", "light", "bare", "thrown"}
    RANGED_PROPS = {"quick", "auto", "precise", "spread", "heavy", "blast", "arc", "silent", "loud", "drawn", "thrown"}
    GROUPS = {"melee": {"opener", "strike", "link", "finisher", "answer"}, "ranged": {"fire", "press", "set", "take", "watch"}}
    AIMS = {"enemy", "tile", "ally", "self", "none", "enemy+tile"}
    SHIELD_PROPS = {"shield"}  # carried by an off-hand item (items.json phys.props), never by a weapon
    trules = tq.get("rules") or {}
    techs = {t.get("id"): t for t in items("techniques") if isinstance(t, dict)}
    if len(techs) != len(items("techniques")):
        errors.append("techniques: ids must be present and unique")
    for k in ("momentum", "pressure", "ready", "drill", "starting", "groups", "group_names", "props"):
        if k not in trules:
            errors.append(f"techniques: rules.{k} is missing")
    for tid, t in techs.items():
        where = f"techniques:{tid}"
        sysm = t.get("system")
        if sysm not in GROUPS:
            errors.append(f"{where}: system must be melee or ranged")
            continue
        props_ok = (MELEE_PROPS | SHIELD_PROPS) if sysm == "melee" else RANGED_PROPS  # a shield's techniques come with the Shield property (rules 1.13)
        if t.get("group") not in GROUPS[sysm]:
            errors.append(f"{where}: group '{t.get('group')}' is not a {sysm} group")
        ap = t.get("ap") or {}
        if ap.get("base") not in ("weapon", "flat", "reaction") or (ap.get("base") == "flat" and not isinstance(ap.get("value"), int)):
            errors.append(f"{where}: ap needs base weapon | flat (with a value) | reaction")
        if ap.get("mode") not in (None, "melee", "shot", "aimed", "burst", "auto"):
            errors.append(f"{where}: ap.mode must be melee | shot | aimed | burst | auto")
        if (t.get("group") == "answer") != (ap.get("base") == "reaction"):
            errors.append(f"{where}: an Answer (and only an Answer) costs a reaction")
        if not (t.get("rounds") == "all" or (isinstance(t.get("rounds"), int) and t.get("rounds") >= 0)):
            errors.append(f"{where}: rounds must be a whole number or 'all'")
        if sysm == "melee" and t.get("rounds") not in (0, None):
            errors.append(f"{where}: a melee technique burns no rounds")
        if t.get("aim") not in AIMS:
            errors.append(f"{where}: aim '{t.get('aim')}' is not one of {sorted(AIMS)}")
        if not t.get("name") or not isinstance(t.get("text"), str):
            errors.append(f"{where}: needs a name and a text")
        if t.get("adjudication") not in ("engine", "hybrid", "narrator"):
            errors.append(f"{where}: adjudication must be engine | hybrid | narrator")
        for key in ("comes_with", "home", "not_with"):
            for pr in t.get(key) or []:
                if pr not in props_ok:
                    errors.append(f"{where}: {key} names '{pr}', not a {sysm} property")
        if t.get("particular") and not t.get("home"):
            errors.append(f"{where}: a particular technique needs a home property")
        for i, l in enumerate(t.get("lines") or []):
            if not l.get("props") or not isinstance(l.get("text"), str):
                errors.append(f"{where}: line {i} needs props and a text")
            for pr in l.get("props") or []:
                if pr not in props_ok:
                    errors.append(f"{where}: line {i} names '{pr}', not a {sysm} property")
        for k, v in (t.get("numbers") or {}).items():
            if not isinstance(v, (int, float)) or isinstance(v, bool):
                errors.append(f"{where}: numbers.{k} must be a number")
        if (t.get("numbers") or t.get("free")) and t.get("provisional") is not True:
            errors.append(f"{where}: its numbers are provisional until the balance pass (provisional: true)")
    # every line of a particular technique must be reachable from a weapon that has one of its home properties
    wprops = [(w.get("phys") or {}) for w in items("weapons") if isinstance(w, dict)]
    for tid, t in techs.items():
        if not t.get("particular"):
            continue
        for i, l in enumerate(t.get("lines") or []):
            need = l.get("props") or []
            fits = lambda pr: (all(x in pr for x in need) if l.get("match") == "all" else any(x in pr for x in need))
            if not any(ph.get("system") == t.get("system") and set(t.get("home") or []) & set(ph.get("props") or []) and fits(ph.get("props") or []) for ph in wprops):
                errors.append(f"techniques:{tid}: line {i} ({', '.join(need)}) can never apply: no weapon has it with one of the home properties {t.get('home')}")
    st = trules.get("starting") or {}
    for sysm, key in (("melee", "default_melee"), ("ranged", "default_ranged")):
        for tid in st.get(key) or []:
            if techs.get(tid, {}).get("system") != sysm or techs.get(tid, {}).get("free"):
                errors.append(f"techniques: starting.{key} names '{tid}', not a {sysm} technique that can be picked")
    if st.get("default_melee") and not any(techs.get(tid, {}).get("group") == "opener" for tid in st.get("default_melee")):
        errors.append("techniques: starting.default_melee needs an Opener")
    for pr in MELEE_PROPS | RANGED_PROPS | SHIELD_PROPS:
        if pr not in (trules.get("props") or {}):
            errors.append(f"techniques: rules.props has no text for '{pr}'")
    wtiers = {e.get("id") for e in items("enemies") if isinstance(e, dict)}
    for tier in ((trules.get("drill") or {}).get("per_kill") or {}):
        if tier not in wtiers:
            errors.append(f"techniques: drill.per_kill names unknown tier {tier}")
    for e in items("enemies"):
        for sysm in ("melee", "ranged"):
            for tid in ((e.get("techniques") or {}).get(sysm) or []) if isinstance(e, dict) else []:
                if techs.get(tid, {}).get("system") != sysm or techs.get(tid, {}).get("free") or (techs.get(tid, {}).get("needs") or {}).get("shield") or techs.get(tid, {}).get("innate"):
                    errors.append(f"enemies:{e.get('id')}: techniques.{sysm} names '{tid}', not a {sysm} technique to list")
    skill_ids = {s_.get("id") for s_ in items("skills") if isinstance(s_, dict)}
    attr_ids = {a_.get("id") for a_ in items("attributes") if isinstance(a_, dict)}
    # Rules 1.13: Durability's Guard, the shield's techniques, the technique a skill gives, and heavy armour's gate
    gd = trules.get("guard")
    if not isinstance(gd, dict):
        errors.append("techniques: rules.guard is missing (rules 1.13: Durability's Guard)")
    else:
        for k in ("max", "per_durability", "gain_base", "gain_per_point", "shield_gain", "soak", "pressure_per_point", "interpose_durability", "interpose_cost"):
            if not isinstance(gd.get(k), (int, float)) or isinstance(gd.get(k), bool) or gd.get(k) <= 0:
                errors.append(f"techniques: rules.guard.{k} must be a positive number")
    hg = ((trules.get("gear_gates") or {}).get("heavy_armour") or {})
    if hg.get("skill") not in skill_ids:
        errors.append(f"techniques: rules.gear_gates.heavy_armour.skill '{hg.get('skill')}' is not a skill")
    for cls_, need in (hg.get("classes") or {}).items():
        if cls_ not in ("1", "2", "3", "4", "5") or not isinstance(need, int) or not 1 <= need <= 10:
            errors.append(f"techniques: rules.gear_gates.heavy_armour.classes: '{cls_}': {need} is not an armour class with a skill level")
    shield_items = [i_ for i_ in items("items") if isinstance(i_, dict) and "shield" in ((i_.get("phys") or {}).get("props") or [])]
    for i_ in items("items"):
        ph = i_.get("phys") if isinstance(i_, dict) else None
        if ph is None:
            continue
        if not isinstance(ph, dict) or set(ph.get("props") or []) - SHIELD_PROPS or not ph.get("props") or set(ph) - {"props"}:
            errors.append(f"items:{i_.get('id')}: an item's phys block is {{props: [shield]}} and nothing else")
        elif i_.get("slot") != "off_hand":
            errors.append(f"items:{i_.get('id')}: the Shield property is for an off-hand item")
    for tid, t in techs.items():
        nd, inn = t.get("needs") or {}, t.get("innate")
        if nd.get("shield") and ("shield" not in (t.get("comes_with") or []) or t.get("free")):
            errors.append(f"techniques:{tid}: a shield's technique comes with the Shield property and is never free")
        if ("shield" in (t.get("comes_with") or [])) and not nd.get("shield"):
            errors.append(f"techniques:{tid}: comes with a shield but doesn't need one (needs.shield)")
        if nd.get("shield") and not shield_items:
            errors.append(f"techniques:{tid}: needs a shield, and no item carries the Shield property")
        if inn is not None:
            if not isinstance(inn, dict) or inn.get("skill") not in skill_ids or not isinstance(inn.get("min"), int) or not 1 <= inn.get("min") <= 10:
                errors.append(f"techniques:{tid}: innate needs a skill and a level (1 to 10)")
            if t.get("group") != "answer" or t.get("comes_with") or nd.get("shield") or t.get("free"):
                errors.append(f"techniques:{tid}: a technique a skill gives is an Answer with no weapon property (the engine lists it with any weapon)")
        gc = (t.get("numbers") or {}).get("guard_cost")
        if gc is not None and (not isinstance(gc, int) or gc < 1):
            errors.append(f"techniques:{tid}: numbers.guard_cost must be a whole number of Guard")
    # gear gates (proposal 13.3): what a weapon or an item asks is a skill and a level
    for kind_ in ("weapons", "items"):
        for g_ in items(kind_):
            for sk_, n_ in ((g_.get("requires") or {}) if isinstance(g_, dict) else {}).items():
                if sk_ not in skill_ids or not isinstance(n_, int) or not 1 <= n_ <= 10:
                    errors.append(f"{kind_}:{g_.get('id')}: requires '{sk_}': {n_} is not a skill and a level (1 to 10)")
    for sysm, key in (("melee", "default_melee"), ("ranged", "default_ranged")):
        for tid in st.get(key) or []:
            if (techs.get(tid, {}).get("needs") or {}).get("shield") or techs.get(tid, {}).get("innate"):
                errors.append(f"techniques: starting.{key} names '{tid}', which is given, not learned")
    for w in items("weapons"):
        if not isinstance(w, dict):
            continue
        ph, where = w.get("phys"), f"weapons:{w.get('id')}"
        if not isinstance(ph, dict):
            errors.append(f"{where}: no phys block (rules 1.12: system, props, hits_with, scales_with)")
            continue
        sysm = ph.get("system")
        if sysm not in GROUPS:
            errors.append(f"{where}: phys.system must be melee or ranged")
            continue
        for pr in ph.get("props") or []:
            if pr not in (MELEE_PROPS if sysm == "melee" else RANGED_PROPS):
                errors.append(f"{where}: phys.props names '{pr}', not a {sysm} property")
        if ph.get("hits_with") not in skill_ids:
            errors.append(f"{where}: phys.hits_with '{ph.get('hits_with')}' is not a skill")
        for sc in (ph.get("scales_with") or []) + (ph.get("also_scales") or []):
            if sc not in skill_ids and sc not in attr_ids:
                errors.append(f"{where}: phys scales with '{sc}', not a skill or an attribute")
        tch = ph.get("teaches")
        if tch and techs.get(tch, {}).get("system") != sysm:
            errors.append(f"{where}: phys.teaches '{tch}' is not a {sysm} technique")
        if tch and set(techs.get(tch, {}).get("not_with") or []) & set(ph.get("props") or []):
            errors.append(f"{where}: teaches '{tch}', which a weapon with its properties can't use (not_with)")
        if tch and techs.get(tch, {}).get("free"):
            warns.append(f"{where}: teaches '{tch}', which everyone already knows")

# ---------------------------------------------------------------------------------------------- amount blocks
# Step a6 of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md 2.5; data/CONVENTIONS.md):
# every number an item deals, heals or shields with is in data, as an `amounts` block on the item (read by the engine
# through effects/amounts.ts), or as the numeric `value` of the item's own heal / shield / hp effect.
#   1. every `amounts` block has a known kind, a numeric base, well-formed per-point parts and multipliers, a known
#      profile (rules.json output.profiles), a known type and armour;
#   2. an effect that heals or shields names a number: a numeric `value`, the words "half" / "full" (a state, not an
#      amount), or (a formula written as text) an `amounts` block of that kind on the same item;
#   3. a `deal` or `mend` effect names a block that exists (or carries one);
#   4. one number, one place: where an item has both a plain heal / shield effect with a number and a plain block of
#      that kind (a base, no per-point part), they are the same number.
AMOUNT_KINDS = {"damage", "heal", "shield"}
AMOUNT_TYPES = {"physical", "sigil", "elemental", "soul", "true"}
AMOUNT_KEYS = {"kind", "base", "per", "profile", "type", "armour", "mults", "provisional", "text"}
out_rules = (data.get("rules") or {}).get("output") or {}
PROFILES = set(k for k, v in (out_rules.get("profiles") or {}).items() if isinstance(v, dict))
num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)

def check_block(b, where):
    if not isinstance(b, dict):
        errors.append(f"{where}: an amount block must be an object"); return False
    if b.get("kind") not in AMOUNT_KINDS:
        errors.append(f"{where}: amount kind '{b.get('kind')}' is not one of {sorted(AMOUNT_KINDS)}")
    if not num(b.get("base")):
        errors.append(f"{where}: amount base must be a number (no formulas as text: use per-point parts)")
    for p in b.get("per") or []:
        if not (isinstance(p, dict) and isinstance(p.get("of"), str) and num(p.get("value"))):
            errors.append(f"{where}: a per-point part is {{of: <what it counts>, value: <number>}}")
    if "profile" in b and b["profile"] not in PROFILES:
        errors.append(f"{where}: unknown profile '{b['profile']}' (rules.json output.profiles)")
    if "type" in b and b["type"] not in AMOUNT_TYPES:
        errors.append(f"{where}: unknown damage type '{b['type']}'")
    if "armour" in b and b["armour"] not in ("full", "half", "none"):
        errors.append(f"{where}: armour is full, half or none")
    if "mults" in b and not (isinstance(b["mults"], dict) and all(num(v) for v in b["mults"].values())):
        errors.append(f"{where}: mults is a map of name to number")
    for k in set(b) - AMOUNT_KEYS:
        errors.append(f"{where}: unknown field '{k}' in an amount block")
    return True

def effects_of(x):
    """An item's own effects, with those of its tiers (a perk) and nested ones (an aura's)."""
    out = []
    def rec(lst):
        for e in lst or []:
            if isinstance(e, dict):
                out.append(e); rec(e.get("effects"))
    rec(x.get("effects"))
    for t in (x.get("tiers") or {}).values():
        if isinstance(t, dict): rec(t.get("effects"))
    return out

DAMAGE_KINDS = {"blast", "all", "explosion", "trap", "thrown"}

def check_amounts(x, where):
    if not isinstance(x, dict):
        return
    # step a7 (leak 4): which blasts an item's damage bonus speaks about besides weapon attacks and spells
    if "damage_kinds" in x and not (isinstance(x["damage_kinds"], list) and x["damage_kinds"] and set(x["damage_kinds"]) <= DAMAGE_KINDS):
        errors.append(f"{where}: damage_kinds is a list of {sorted(DAMAGE_KINDS)}")
    blocks = x.get("amounts")
    if blocks is not None:
        if not isinstance(blocks, dict) or not blocks:
            errors.append(f"{where}: amounts is a map of name to amount block"); blocks = {}
        for name, b in blocks.items():
            check_block(b, f"{where}: amounts.{name}")
    blocks = blocks or {}
    kinds = {b.get("kind") for b in blocks.values() if isinstance(b, dict)}
    for e in effects_of(x):
        op = e.get("op")
        if op in ("heal", "shield") and "value" in e:
            v = e["value"]
            if not num(v) and v not in ("half", "full") and op not in kinds:
                errors.append(f"{where}: its {op} effect has no number ({v!r}): give the item an `amounts` block of kind {op}")
            plain = [b for b in blocks.values() if isinstance(b, dict) and b.get("kind") == op and not b.get("per") and num(b.get("base")) and b.get("base") > 0]
            if num(v) and len(plain) == 1 and len([f for f in effects_of(x) if f.get("op") == op and num(f.get("value"))]) == 1 and plain[0]["base"] != v:
                errors.append(f"{where}: its {op} effect says {v} and its amount block says {plain[0]['base']}: one number, one place")
        if op in ("deal", "mend"):
            a = e.get("amount")
            if isinstance(a, str):
                if a not in blocks: errors.append(f"{where}: its {op} effect names the amount block '{a}', which the item does not have")
                elif (blocks[a].get("kind") == "damage") != (op == "deal"): errors.append(f"{where}: its {op} effect names the block '{a}' of kind {blocks[a].get('kind')}")
            elif isinstance(a, dict):
                if check_block(a, f"{where}: {op} effect") and (a.get("kind") == "damage") != (op == "deal"):
                    errors.append(f"{where}: a {op} effect with an amount of kind {a.get('kind')}")
            else:
                errors.append(f"{where}: a {op} effect needs an `amount` (a block, or the name of one of the item's amounts)")

for name in ("perks", "traits", "conditions", "sigils", "feelings", "soul_modules", "items", "weapons", "skills"):
    for x in items(name) if isinstance(items(name), list) else []:
        check_amounts(x, f"{name}:{x.get('id') if isinstance(x, dict) else '?'}")
        for lvl, un in ((x.get("unlocks") or {}).items() if isinstance(x, dict) and isinstance(x.get("unlocks"), dict) else []):
            check_amounts(un, f"{name}:{x.get('id')}.{lvl}")
for b in base:
    for r, v in (b.get("ranks") or {}).items():
        for m in v.get("moves") or []:
            if "ref" not in m: check_amounts(m, f"classes:{b.get('id')}.{m.get('id')}")
for m in pool:
    check_amounts(m, f"classes:pool.{m.get('origin')}.{m.get('id')}")
for a in adv:
    for m in a.get("moves") or []:
        check_amounts(m, f"classes:{a.get('id')}.{m.get('id')}")
pat = data.get("patrons") or {}
for w in pat.get("whispers") or []:
    check_amounts(w, f"patrons:whisper.{w.get('id')}")
for p in items("patrons"):
    if isinstance(p, dict):
        for h in (p.get("hymns") or []) + ([p["miracle"]] if isinstance(p.get("miracle"), dict) else []) + ([p["intervention"]] if isinstance(p.get("intervention"), dict) else []):
            check_amounts(h, f"patrons:{p.get('id')}.{h.get('id') or 'intervention'}")
for name, grp in (out_rules.get("amounts") or {}).items():
    if isinstance(grp, dict):
        for bn, b in grp.items():
            check_block(b, f"rules: output.amounts.{name}.{bn}")

for op, n in new_ops.items():
    warns.append(f"non-standard effect op '{op}' used {n}x")

print("files:", ", ".join(f"{k}({len(items(k)) if k not in ('classes','rules') else ''})" for k in data))
print(f"base classes {len(base)}, advanced {len(adv)} (shelved {sum(1 for a in adv if a.get('shelved'))}), move pool {len(pool)}")
print(f"\n{len(errors)} errors")
for e in errors[:80]:
    print("  ERR", e)
print(f"{len(warns)} warnings")
for w in warns:
    print("  WARN", w)
sys.exit(1 if errors else 0)
