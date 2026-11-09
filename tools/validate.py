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
    # rules 1.9 (Sigil 1.5): every word has a provisional inflection; study and word mastery numbers
    INFL_STATS = {"cond_rounds", "save_tn", "to_hit", "damage_pct", "push_tiles", "shield_pct", "heal_pct", "charge", "flux",
                  "lasts_rounds", "radius", "teleport_tiles", "barrier_hp_pct", "move_tiles", "range", "turret_def", "pull_tiles",
                  "jump_radius", "leech", "mult", "radius_at_4", "cone_length", "spare_downed"}
    for w in sw:
        inf, where = w.get("inflection"), f"sigils:{w.get('id')}.inflection"
        if not isinstance(inf, dict) or not inf.get("text") or not isinstance(inf.get("effects"), list) or not inf["effects"]:
            errors.append(f"{where}: every word needs an inflection with text and effects (rules 1.9)")
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
            errors.append(f"sigils.grammar.study: {k} must be a number (rules 1.9)")
    if sd and sd.get("provisional") is not True:
        errors.append("sigils.grammar.study: provisional (rules 1.9)")
    for x in sd.get("mastery_skills") or []:
        if x not in SKILLS:
            errors.append(f"sigils.grammar.study.mastery_skills: unknown skill {x}")
    if not (isinstance(wm.get("practised"), int) and isinstance(wm.get("mastered"), int) and 0 < wm["practised"] < wm["mastered"]):
        errors.append("sigils.grammar.word_mastery: practised < mastered, whole numbers (rules 1.9)")

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

# Rules 1.9 (Sigil 1.5): the sigil_mark kind's Investigate numbers, and the marks the campaigns place
_mk = next((o for o in items("objects") if o.get("id") == "sigil_mark"), None)
if _mk is None:
    errors.append("objects: the sigil_mark kind (rules 1.9) is missing")
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
        errors.append("objects:sigil_mark: mark must be flagged provisional (rules 1.9)")
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

# patrons (rules 1.6, Blessing 2.0): tags exist, 3 Hymns at tiers 1-3, a Miracle, an Open or Jealous rule, two rites
# (one an engine button), an intervention, every voice-line bank with 3 lines; Whispers and vows complete.
pat = data.get("patrons") or {}
if isinstance(pat, dict) and pat.get("tags"):
    tag_ids = {t.get("id") for t in pat.get("tags") or []}
    banks = pat.get("line_banks") or []
    if len(banks) != 9:
        errors.append(f"patrons: line_banks should list 9 banks, has {len(banks)}")
    if len(pat.get("whispers") or []) != 6:
        errors.append("patrons: there should be 6 Whispers")
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
        if not (p.get("intervention") or {}).get("trigger"):
            errors.append(f"patrons:{pid}: the intervention needs a trigger")
        lines = p.get("lines") or {}
        for b in banks:
            if len(lines.get(b) or []) != 3:
                errors.append(f"patrons:{pid}: line bank {b} needs 3 lines")

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
