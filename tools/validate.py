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
# a skill's attr:<x> tag names its own attribute (13 Nov 2026: Acuity and Improvisation had theirs swapped; the engine's
# skill_mod_tag matches a tag as well as the attribute, so a wrong tag puts a skill under two attributes)
for s in items("skills"):
    if not isinstance(s, dict):
        continue
    at = [t for t in (s.get("tags") or []) if isinstance(t, str) and t.startswith("attr:")]
    if at != ["attr:" + str(s.get("attribute"))]:
        errors.append(f"skills: {s.get('id')} has attr tags {at}, its attribute is {s.get('attribute')} (want exactly ['attr:{s.get('attribute')}'])")

# a skill's text never says the same sentence twice (14 Nov 2026: will_power's Pump sentence was appended eight times
# by a guard that never matched); the sentence must be 30 characters or more to count
def _skill_texts(o, path):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from _skill_texts(v, path + "/" + str(k))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from _skill_texts(v, path + "/" + str(i))

for s in items("skills"):
    if not isinstance(s, dict):
        continue
    for path, text in _skill_texts(s, str(s.get("id"))):
        sents = [x.strip() for x in re.split(r"(?<=[.!?])\s+", text) if len(x.strip()) >= 30]
        for x in sorted({x for x in sents if sents.count(x) > 1}):
            errors.append(f"skills: {path} says the same sentence {sents.count(x)} times: {x[:60]}")

# rules 1.54 item 4119 (the road map): what a point gives is per_point.rows, the one copy: each {at, text}, `at` one of
# each, each from n, every 2, every 3, from n, at n (n 1 to 10); no row twice; no prose per_point.text, no epccg.effect.
# Numbers are placeholders into per_point.numbers; where the engine reads the same number from data, it must be equal.
_AT = re.compile(r"^(each|every 2|every 3|(each from|from|at) (\d+))$")
_ld = lambda stem: data.get(stem) if isinstance(data.get(stem), dict) else {}
_calls_r, _tech_r, _fig_r = (_ld("calls").get("rules") or {}), ((_ld("techniques").get("rules") or {}).get("guard") or {}), ((_ld("figments").get("visualizer") or {}).get("range") or {})
_hymn_r, _cyc_r = (((_ld("patrons").get("prayer") or {}).get("hymn") or {}).get("cooldown_rule") or {}), (_ld("soul_modules").get("cycle") or {})
_SAME = {  # (skill, per_point.numbers key) -> (the engine's data value, where it lives)
    ("durability", "pool"): (_tech_r.get("per_durability"), "techniques.json rules.guard.per_durability"),
    ("durability", "pool_max"): (_tech_r.get("max"), "techniques.json rules.guard.max"),
    ("durability", "guard_base"): (_tech_r.get("gain_base"), "techniques.json rules.guard.gain_base"),
    ("durability", "guard_per_point"): (_tech_r.get("gain_per_point"), "techniques.json rules.guard.gain_per_point"),
    ("durability", "brace"): (_tech_r.get("brace_gain"), "techniques.json rules.guard.brace_gain"),
    ("durability", "shield"): (_tech_r.get("shield_gain"), "techniques.json rules.guard.shield_gain"),
    ("durability", "two_shields"): (_tech_r.get("two_shield_mult"), "techniques.json rules.guard.two_shield_mult"),
    ("visualization", "range"): (_fig_r.get("per_point"), "figments.json visualizer.range.per_point"),
    ("faith", "hymn_cut"): (_hymn_r.get("per_faith"), "patrons.json prayer.hymn.cooldown_rule.per_faith"),
    ("faith", "hymn_floor"): (_hymn_r.get("floor"), "patrons.json prayer.hymn.cooldown_rule.floor"),
    ("will_power", "pumps"): (((_cyc_r.get("free_pumps") or [{}])[0]).get("pumps"), "soul_modules.json cycle.free_pumps.0.pumps"),
}
for s in items("skills"):
    if not isinstance(s, dict):
        continue
    sid, pp = s.get("id"), s.get("per_point") or {}
    rows, nums = pp.get("rows"), pp.get("numbers") or {}
    if "text" in pp: errors.append(f"skills:{sid}: per_point.text is gone (rules 1.54 item 4119): what a point gives is per_point.rows")
    if "effect" in (s.get("epccg") or {}): errors.append(f"skills:{sid}: epccg.effect is gone (rules 1.54 item 4119): per_point.rows is the one copy")
    if not isinstance(rows, list) or not rows:
        errors.append(f"skills:{sid}: per_point.rows is missing or empty (every skill says what a point gives as rows)"); continue
    seen = set()
    for i, r in enumerate(rows):
        w = f"skills:{sid}: per_point.rows.{i}"
        if not isinstance(r, dict) or set(r) != {"at", "text"} or not isinstance(r.get("text"), str) or not r["text"].strip():
            errors.append(f"{w}: a row is {{at, text}} with a text"); continue
        m = _AT.match(str(r["at"]))
        if not m or (m.group(3) and not 1 <= int(m.group(3)) <= 10):
            errors.append(f"{w}: at {r['at']!r} is not each, each from n, every 2, every 3, from n or at n (n 1 to 10)")
        if r["text"] in seen: errors.append(f"{w}: the row {r['text'][:40]!r} is there twice")
        seen.add(r["text"])
        for ref in re.findall(r"\{=([^}|]+)", r["text"]):
            if not ref.startswith("per_point.numbers."): errors.append(f"{w}: {{={ref}}} reads outside per_point.numbers (a row's numbers are its skill's per_point.numbers)")
    for k, v in nums.items():
        if not isinstance(v, (int, float)) or isinstance(v, bool): errors.append(f"skills:{sid}: per_point.numbers.{k} is not a number")
        elif not any("{=per_point.numbers." + k + "}" in r.get("text", "") or "{=per_point.numbers." + k + "|" in r.get("text", "") for r in rows if isinstance(r, dict)):
            errors.append(f"skills:{sid}: per_point.numbers.{k} is read by no row")
    if "call_range" in nums and nums["call_range"] != _calls_r.get("range_per_point"):
        errors.append(f"skills:{sid}: per_point.numbers.call_range {nums['call_range']} is not calls.json rules.range_per_point {_calls_r.get('range_per_point')}")
    for (k_sid, k), (want, where) in _SAME.items():
        if k_sid == sid and nums.get(k) != want: errors.append(f"skills:{sid}: per_point.numbers.{k} {nums.get(k)} is not {where} {want}")
    if sid == "will_power":
        _fp, _sw = ((_cyc_r.get("free_pumps") or [{}])[0]).get("will_power"), (_cyc_r.get("swell_no_strain") or {}).get("will_power")
        if not any("{=per_point.numbers.pumps}" in r.get("text", "") and r.get("at") == f"from {_fp}" for r in rows): errors.append(f"skills:will_power: the free Pump's row is at 'from {_fp}' (soul_modules.json cycle.free_pumps.0.will_power)")
        if not any(r.get("at") == f"from {_sw}" for r in rows): errors.append(f"skills:will_power: a row at 'from {_sw}' says the held Outburst swells without Strain (soul_modules.json cycle.swell_no_strain.will_power)")

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
              if kind == "condition" and isinstance(v, str) and (v.startswith("family:") or v == "incoming" or "{choice}" in v):
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
        # rules 1.38: a weapon that counts as a focus says so with a focus block (the engine reads it), and its
        # counts_as_<kind> property has a block with that door (the Spellslinger's pistol: the block, no property)
        _FD = {"brain_power": "evoker", "will_power": "emanator", "empathy": "attuner", "visualization": "visualizer"}
        fo = w.get("focus")
        if fo is not None and not (isinstance(fo, dict) and fo.get("door") in _FD and fo.get("fuel") in ("core", "mp") and not set(fo) - {"door", "fuel", "hand"}):
            errors.append(f"weapons:{w.get('id')}: focus is {{door: brain_power | will_power | empathy | visualization, fuel: core | mp}}")
        said = sorted(p[len("counts_as_"):] for p in (w.get("properties") or []) if isinstance(p, str) and p.startswith("counts_as_"))
        has = [_FD[fo["door"]]] if isinstance(fo, dict) and fo.get("door") in _FD else []
        if [k for k in said if k not in has]:
            errors.append(f"weapons:{w.get('id')}: its counts_as_ property ({said}) needs a focus block with that door ({has}) (rules 1.38)")

# equipment slots: the armour class slot must be one of the slots
slots = data.get("rules", {}).get("equipment_slots", {})
if slots and slots.get("armour_class_from") not in slots.get("slots", []):
    errors.append("rules.equipment_slots: armour_class_from is not a slot")

# a perk may not share a class's display name (rules 1.30: the perk Bulwark became Stonewall when the Defender became
# the Bulwark): a card, a log line or the preview's damage chain would name two different things the same
_class_names = {c.get("name", "").lower() for c in base + adv if isinstance(c, dict) and c.get("name")}
for _p in items("perks"):
    if isinstance(_p, dict) and _p.get("name", "").lower() in _class_names:
        errors.append(f"perk {_p.get('id')}: name {_p.get('name')!r} collides with a class name")

# Rules 1.60 item 4642 (the spec's section 4.3): the layering shield is Prayer's. A `mend` op that names a `layer` must
# sit inside a prayer (a grant_action with `prayer`): no other door may give a shield that layers on the base shield.
def _layer_outside_prayer(o, where, in_prayer=False):
    if isinstance(o, dict):
        pr = in_prayer or (o.get("op") == "grant_action" and o.get("prayer") is not None)
        if o.get("op") == "mend" and o.get("layer") is not None and not pr:
            errors.append(f"{where}: a mend with layer {o.get('layer')!r} outside a prayer (rules 1.60 item 4642: only Prayer's shield layers)")
        for k, v in o.items(): _layer_outside_prayer(v, where + "." + str(k) if k in ("effects", "moves") else where, pr)
    elif isinstance(o, list):
        for v in o: _layer_outside_prayer(v, where, in_prayer)
for _name, _doc in data.items():
    _layer_outside_prayer(_doc, _name)

# Classes 3.0 step 5, the Chaplain (rules 1.31; chaplain-spec.md section 10): Smite is Rebuke's size; every shield
# layer a move names is a known one; the Judged row exists; no Virtue base-class move costs MP or Strain.
_SHIELD_LAYERS = {"ward"}
conds_ids = ids_of(items("conditions"))
_pool_by = {(m.get("id"), m.get("origin")): m for m in ((data.get("classes") or {}).get("move_pool") or {}).get("moves", []) if isinstance(m, dict)}
def _class_moves(c):
    out = []
    for r in ("I", "II", "III"):
        for m in ((c.get("ranks") or {}).get(r) or {}).get("moves", []):
            if "ref" in m:
                cls_id, mv = m["ref"].split(".", 1)
                out.append(_pool_by.get((mv, cls_id)) or next((x for a in adv if isinstance(a, dict) and a.get("id") == cls_id for x in a.get("moves", []) if x.get("id") == mv), {}))
            else: out.append(m)
    return out + list(c.get("gain") or [])
def _walk_ops(o):
    if isinstance(o, dict):
        yield o
        for v in o.values(): yield from _walk_ops(v)
    elif isinstance(o, list):
        for v in o: yield from _walk_ops(v)
_rebuke = next((w for w in (data.get("patrons") or {}).get("whispers", []) if w.get("id") == "rebuke"), None)
_rebuke_n = -next((e.get("value") for e in (_rebuke or {}).get("effects", []) if e.get("op") == "stat_mod" and e.get("stat") == "hp"), 0)
for c in base:
    if not isinstance(c, dict): continue
    for m in _class_moves(c):
        for e in _walk_ops(m.get("effects") or []):
            if e.get("layer") is not None and e.get("layer") not in _SHIELD_LAYERS:
                errors.append(f"classes:{c.get('id')}.{m.get('id')}: unknown shield layer {e.get('layer')!r} (known: {sorted(_SHIELD_LAYERS)})")
            if c.get("attribute") == "virtue" and (e.get("resource") in ("mp", "strain") or any(k in ("mp", "strain") for k in (e.get("res") or {}))):
                errors.append(f"classes:{c.get('id')}.{m.get('id')}: a Virtue class move costs no MP or Strain (rules 1.31)")
    if c.get("id") == "guardian":
        sm = next((m for m in _class_moves(c) if m.get("id") == "smite"), None)
        if sm is not None:
            for k, b in (sm.get("amounts") or {}).items():
                if b.get("base") != _rebuke_n: errors.append(f"classes:guardian.smite: amounts.{k}.base {b.get('base')} is not Rebuke's {_rebuke_n} (rules 1.31: Smite is Rebuke's size)")
        if "judged" not in conds_ids: errors.append("conditions: the row 'judged' is missing (rules 1.31: the Chaplain's Smite puts it on)")

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
    # Classes 3.0 P9 (owned.ts): an owned block's turn, its auto verb and target, its kind (one tie kind for all)
    _w = f"enemies.companions:{k.get('id')}"
    if k.get("turn", "own") not in ("own", "owner", "auto"): errors.append(f"{_w}: turn is own, owner or auto")
    if k.get("turn") == "auto" and not (isinstance(k.get("auto"), dict) and k["auto"].get("verb") in ("shot", "aimed", "melee") and k["auto"].get("target", "nearest_foe") in ("nearest_foe", "weakest_foe")):
        errors.append(f"{_w}: a turn auto block needs auto {{verb: shot, aimed or melee; target: nearest_foe or weakest_foe}}")
    if "auto" in k and k.get("turn") != "auto": errors.append(f"{_w}: auto is for a turn auto block")
    if "owned_kind" in k and not (isinstance(k["owned_kind"], str) and k["owned_kind"]): errors.append(f"{_w}: owned_kind is a word (companion, figment)")
    for _v in k.get("actions") or []:
        if k.get("turn") in ("owner", "auto") and _v not in ("move", "shot", "aimed", "melee"): errors.append(f"{_w}: an owned unit's verb is move, shot, aimed or melee (owned.ts OWNED_VERBS), not {_v}")
# Rules 1.56 (Figments 2.0; the lead's ruling on the 0.29 wave-2 review, MF5 a and b): the owned data-verb vocabulary
# (figments.json verbs, read by owned.ts OWNED_DATA_VERBS / runDataVerb / ownedVerbInfo). Every key is checked: an
# unknown key is an error, never silently ignored (data/CONVENTIONS.md "Owned units' data verbs").
_FJ = data.get("figments") if isinstance(data.get("figments"), dict) else {}
_COSTS = ((data.get("actions") or {}).get("costs") or {})
_RESN = set(((data.get("actions") or {}).get("resources") or {}).keys())
_AROWS = {r.get("id"): r for r in ((data.get("actions") or {}).get("items") or []) if isinstance(r, dict)}
# owned.ts OWNER_USES: the item uses an owned unit runs for its owner, read from the engine's own table (one copy)
_OWNED_TS = (pathlib.Path(__file__).resolve().parent.parent / "packages/engine/src/owned.ts").read_text(encoding="utf-8")
_OWNER_USES_M = re.search(r"const OWNER_USES\b[^\n]*\{\n(.*?)\n\};", _OWNED_TS, re.S)
_OWNER_USE_TYPES = tuple(re.findall(r"^\s*'([a-z]+/[a-z_]+)'\s*:", _OWNER_USES_M.group(1), re.M)) if _OWNER_USES_M else ()
if not _OWNER_USE_TYPES: errors.append("tools/validate.py: owned.ts OWNER_USES not found (the item uses an owned unit runs)")
_DV_KEYS = {"id", "name", "icon", "site", "text", "provisional", "reach", "effects", "attack", "on_hit", "dash", "unmake", "refund_share", "use", "res", "amounts"}
_DV_REACH = {"tiles", "side", "eyes", "tile", "beside"}
_DVIDS = set()
for _v in _FJ.get("verbs") or []:
    _w = f"figments.verbs:{_v.get('id')}"
    if not (isinstance(_v, dict) and isinstance(_v.get("id"), str)): errors.append(f"figments.verbs: a verb has an id"); continue
    _DVIDS.add(_v["id"])
    for _k in _v:
        if _k not in _DV_KEYS: errors.append(f"{_w}: unknown data-verb field '{_k}' ({', '.join(sorted(_DV_KEYS))})")
    if _v.get("site") not in _COSTS: errors.append(f"{_w}: site names an actions.json cost site")
    _r = _v.get("reach")
    if _r is not None:
        if not isinstance(_r, dict): errors.append(f"{_w}: reach is an object ({', '.join(sorted(_DV_REACH))})")
        else:
            for _k in _r:
                if _k not in _DV_REACH: errors.append(f"{_w}: unknown reach field '{_k}' ({', '.join(sorted(_DV_REACH))})")
            if not (isinstance(_r.get("tiles", 1), int) and not isinstance(_r.get("tiles", 1), bool) and _r.get("tiles", 1) >= 1): errors.append(f"{_w}: reach.tiles is a whole number of tiles")
            if "tile" in _r and _r["tile"] is not True: errors.append(f"{_w}: reach.tile is true (the order aims at a free tile)")
            if _r.get("tile") and any(k in _r for k in ("side", "eyes")): errors.append(f"{_w}: a tile reach takes tiles and beside, not side or eyes")
            if "beside" in _r and (_r["beside"] != "ally" or not _r.get("tile")): errors.append(f"{_w}: reach.beside is ally, with reach.tile")
            if "side" in _r and _r["side"] not in ("foe", "ally"): errors.append(f"{_w}: reach.side is foe or ally")
            if "eyes" in _r and _r["eyes"] is not True: errors.append(f"{_w}: reach.eyes is true (the unit's own sight)")
    if "res" in _v and not (isinstance(_v["res"], dict) and _v["res"] and all(k in _RESN and isinstance(n, (int, float)) and not isinstance(n, bool) for k, n in _v["res"].items())): errors.append(f"{_w}: res maps actions.json resources to numbers")
    if "attack" in _v and _v["attack"] not in ("shot", "aimed", "melee"): errors.append(f"{_w}: attack is shot, aimed or melee")
    if "on_hit" in _v and not ("attack" in _v and isinstance(_v["on_hit"], list)): errors.append(f"{_w}: on_hit is a list of ops, with attack")
    if "effects" in _v and not isinstance(_v["effects"], list): errors.append(f"{_w}: effects is a list of ops")
    if "dash" in _v and not (isinstance(_v["dash"], int) and _v["dash"] >= 1 and "attack" in _v): errors.append(f"{_w}: dash is a whole number of tiles, with attack")
    if "unmake" in _v and _v["unmake"] is not True: errors.append(f"{_w}: unmake is true")
    if "refund_share" in _v and not (_v.get("unmake") and isinstance(_v["refund_share"], (int, float)) and 0 <= _v["refund_share"] <= 1): errors.append(f"{_w}: refund_share is a share from 0 to 1, with unmake")
    if "use" in _v:
        _row = _AROWS.get(_v["use"])
        if not _row: errors.append(f"{_w}: use names an actions.json item (one of its owner's item uses)")
        elif _row.get("type") not in _OWNER_USE_TYPES or "range" in _row: errors.append(f"{_w}: use '{_v['use']}' is not an item use an owned unit can run for its owner ({', '.join(_OWNER_USE_TYPES)}, hand to hand)")
        if not (isinstance(_r, dict) and _r.get("side") == "ally"): errors.append(f"{_w}: use goes with reach.side ally (it is handed to an ally)")
for _fm in _FJ.get("forms") or []:
    _w = f"figments.forms:{_fm.get('id')}"
    for _vv in _fm.get("verbs") or []:
        if _vv not in _DVIDS and _vv not in ("move", "shot", "aimed", "melee", "let_go"): errors.append(f"{_w}: verb '{_vv}' is no figments.json verb")
    if _fm.get("turn") == "auto":
        _a = _fm.get("auto")
        if not (isinstance(_a, dict) and set(_a) <= {"verb", "target"} and (_a.get("verb") in ("shot", "aimed", "melee") or _a.get("verb") in _DVIDS) and _a.get("target", "nearest_foe") in ("nearest_foe", "weakest_foe")):
            errors.append(f"{_w}: a turn auto form needs auto {{verb: shot, aimed, melee or a figments.json verb; target: nearest_foe or weakest_foe}}")
    elif "auto" in _fm: errors.append(f"{_w}: auto is for a turn auto form")
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
        # Rules 1.61 (the opening volley): a technique's want for a target its side already attacked this round
        v = t.get("technique_spread", 0)
        if not isinstance(v, (int, float)) or isinstance(v, bool) or v < 0 or v > 1:
            errors.append(f"enemies:{t.get('id')}: technique_spread must be a number from 0 to 1 (rules 1.61)")
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
# The weapon effects families (rules.json weapons_rules.fx, presentation only) and each weapon's own fx block: how a weapon
# looks and sounds when it fires (apps/web/src/game/fx/weaponFx.ts fxOf; the table: docs/design/handoffs/weapon-fx-table.md).
_REPO = pathlib.Path(__file__).resolve().parent.parent
_SFX_TS = (_REPO / "apps/web/src/game/sfx.ts").read_text()
_BRASS_TS = (_REPO / "apps/web/src/game/fx/brass.ts").read_text()
_SFX_NAMES = set(re.findall(r"\b([a-z0-9_]+): CB\(", _SFX_TS))
def _union(name):
    m = re.search(r"export type " + name + r" = ([^;]+);", _BRASS_TS)
    return set(re.findall(r"'([a-z0-9_]+)'", m.group(1))) if m else set()
_FX_ENUM = {"look": {"bullet", "pellets", "arrow", "lob", "rocket", "flame", "bolt", "beam", "thrown"}, "mark": {"hole", "pellets", "shaft", None},
            "blast": {"frag", "fire", "smoke", "flash", "zap", None}, "eject": {"shot", "reload", None}, "bow": {"bow", "crossbow", None},
            "load": set(_union("Load")) | {None}, "shell": set(_union("Shell")) | {None}, "mag": set(_union("Mag")) | {None},
            "spent_core": set(_union("Core")) | {None}, "color": {"sigil", "soul"}}
def _fx_block(where, b):
    if not isinstance(b, dict):
        errors.append(f"{where}: fx must be an object"); return
    for k, v in b.items():
        if k == "sound":
            if v not in _SFX_NAMES: errors.append(f"{where}: fx.sound {v!r} is not a sound in apps/web/src/game/sfx.ts SFX_FILES")
        elif k == "rate":
            if not (isinstance(v, (int, float)) and 0.2 <= v <= 4): errors.append(f"{where}: fx.rate is a pitch from 0.2 to 4")
        elif k == "cycle":
            if not (isinstance(v, int) and 0 <= v <= 1000): errors.append(f"{where}: fx.cycle is whole ms from 0 to 1000")
        elif k == "stand_in":
            if not (isinstance(v, str) and v): errors.append(f"{where}: fx.stand_in says what sample is wanted")
        elif k in _FX_ENUM:
            if v not in _FX_ENUM[k]: errors.append(f"{where}: fx.{k} {v!r} is not one of {sorted(x for x in _FX_ENUM[k] if x)}")
        else:
            errors.append(f"{where}: fx has unknown field {k}")
_wfx = ((data.get("rules", {}) or {}).get("weapons_rules", {}) or {}).get("fx")
if _wfx is None:
    errors.append("rules:weapons_rules.fx: the weapon effects families are missing")
else:
    _fams = _wfx.get("families") or {}
    for fid, b in _fams.items():
        _fx_block(f"rules:weapons_rules.fx.families.{fid}", b)
        if not isinstance(b, dict) or "sound" not in b or "look" not in b: errors.append(f"rules:weapons_rules.fx.families.{fid}: a family names its sound and its look")
    for key in ("by_ammo", "by_system", "by_category"):
        for k, v in (_wfx.get(key) or {}).items():
            if v not in _fams: errors.append(f"rules:weapons_rules.fx.{key}.{k}: {v} is not a family")
    for w in items("weapons"):
        if w.get("fx") is not None: _fx_block(f"weapons:{w.get('id')}", w["fx"])
        if w.get("category") not in (_wfx.get("by_category") or {}) and w.get("ammo") not in (_wfx.get("by_ammo") or {}):
            errors.append(f"weapons:{w.get('id')}: its category {w.get('category')} (or its ammo) has no effects family in rules.weapons_rules.fx")
ammo_ids = {a.get("id") for a in (data.get("rules", {}).get("weapons_rules", {}) or {}).get("ammo_types", [])}
for x in items("items"):
    if x.get("ammo_type") and x["ammo_type"] not in ammo_ids:
        errors.append(f"items:{x.get('id')}: ammo_type {x['ammo_type']} is not in rules.weapons_rules.ammo_types")
for o in items("objects"):
    if "electronic" in o and not isinstance(o["electronic"], bool):
        errors.append(f"objects:{o.get('id')}: electronic must be true or false")

# Rules 1.34 (ART-REQUESTS C6): a Figment form's or the turret's `portrait` is a catalog id in art/catalog.json `figments`
# (the painted 4:5 portrait; owned.ts puts it on the unit, the web build ships it under the same id). No field: the glyph.
_figp = root.parent / "art" / "catalog.json"
_figcat = set((json.loads(_figp.read_text()).get("figments") or {}).keys()) if _figp.exists() else None
for _fr in (_ld("figments").get("forms") or []) + ([_ld("figments")["turret"]] if isinstance(_ld("figments").get("turret"), dict) else []):
    if "portrait" in _fr and _figcat is not None and _fr["portrait"] not in _figcat:
        errors.append(f"figments:{_fr.get('id')}: portrait {_fr['portrait']!r} is not in art/catalog.json figments")

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
        if aid == "stim" and "stabilise" in _rule_acts and a.get("ap_downed_medic") != _rule_acts["stabilise"].get("ap_bard"):
            errors.append("actions: stim.ap_downed_medic disagrees with rules.json stabilise.ap_bard")
        if aid == "pickup" and (data.get("world_play", {}).get("ap") or {}).get("pickup") not in (None, a.get("ap")):
            errors.append("actions: pickup.ap disagrees with world_play ap.pickup")
    # Engine foundations 2 (review 1, finding F3): `costs` is the base cost of every engine verb that has no row above
    # (the engine's price() reads it: packages/engine/src/effects/cost.ts), `resources` is what an action can cost
    # besides AP. A cost is a whole number; a verb is priced in one place only; `rule` agrees with rules.json.
    _acts_root = data.get("actions", {})
    for cid, c in (_acts_root.get("costs") or {}).items():
        if cid in _seen_acts:
            errors.append(f"actions: costs.{cid} repeats a row of items: one price for one action")
        if not isinstance(c, dict) or not isinstance(c.get("ap"), int) or isinstance(c.get("ap"), bool):
            errors.append(f"actions: costs.{cid} needs a whole-number ap")
            continue
        for k, v in c.items():
            if (k == "ap" or k.startswith("ap_") or k in ("min", "rounds")) and not (isinstance(v, int) and not isinstance(v, bool) and v >= 0):
                errors.append(f"actions: costs.{cid}.{k} must be a whole number of 0 or more")
        if "weapon_own" in c and c["weapon_own"] is not True:
            errors.append(f"actions: costs.{cid}.weapon_own is true or absent (a weapon's own priced action: effects/cost.ts weaponOwnSite)")
        r = c.get("rule")
        if r is not None:
            if r not in _rule_acts:
                errors.append(f"actions: costs.{cid}.rule names {r}, which is not in rules.json combat.actions")
            elif isinstance(_rule_acts[r].get("ap"), int) and c.get("ap") != _rule_acts[r].get("ap"):
                errors.append(f"actions: costs.{cid} costs {c.get('ap')} AP but rules.json {r} says {_rule_acts[r].get('ap')}")
    for rid, r in (_acts_root.get("resources") or {}).items():
        if not isinstance(r, dict) or not r.get("name") or r.get("on") not in ("unit", "character") or not isinstance(r.get("path"), str) or not r.get("path"):
            errors.append(f"actions: resources.{rid} needs a name, on (unit or character) and a path")
        # Classes 3.0 batch row: the item op `resource` gives any row through effects/cost.ts resGive
        for _k in (set(r) - {"name", "on", "path", "whole", "max", "needs", "setter"}) if isinstance(r, dict) else []:
            errors.append(f"actions: resources.{rid} has an unknown field '{_k}' (name, on, path, whole, max, needs, setter)")
        for _k in ("max", "needs", "setter"):
            if isinstance(r, dict) and _k == "needs" and isinstance(r.get(_k), list) and r[_k] and all(isinstance(x, str) and x for x in r[_k]): continue # rules 1.33: one of several paths (an MP focus: mg.emanator, mg.attuner)
            if isinstance(r, dict) and _k in r and not (isinstance(r[_k], str) and r[_k]):
                errors.append(f"actions: resources.{rid}.{_k} must be a path (a setter: its name)")
        if isinstance(r, dict) and r.get("setter") not in (None, "pressure", "devotion"): # rules 1.44: devotion (faith.ts: Devotion XP inside the session's cap)
            errors.append(f"actions: resources.{rid}.setter '{r.get('setter')}' is not a setter the engine registers (pressure, devotion)")

# Truth pass 3: Witnessed's card reads conditions.json witnessed effects[0]; the engine reads patrons.json
# prayer.witnessed.like_bonus (WITNESS_BONUS). One number in two places: they must agree.
_wit = next((o for o in items("conditions") if o.get("id") == "witnessed"), None)
_wb = ((data.get("patrons", {}).get("prayer") or {}).get("witnessed") or {}).get("like_bonus")
if _wit and _wb is not None and ((_wit.get("effects") or [{}])[0].get("value") != _wb):
    errors.append("conditions: witnessed effects[0].value (the card's +2) disagrees with patrons.json prayer.witnessed.like_bonus (the engine's)")

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
    MELEE_PROPS = {"edge", "point", "blunt", "hook", "reach", "heavy", "light", "bare", "thrown", "open_hand"}  # open_hand: the monk's glove family (rules 1.56)
    RANGED_PROPS = {"quick", "auto", "precise", "spread", "heavy", "blast", "arc", "silent", "loud", "drawn", "thrown"}
    GROUPS = {"melee": {"opener", "strike", "link", "finisher", "answer", "follow"}, "ranged": {"fire", "press", "set", "take", "watch"}}
    AIMS = {"enemy", "tile", "ally", "self", "none", "enemy+tile"}
    SHIELD_PROPS = {"shield"}  # rules 1.57 (A1): carried by a shield's weapon row (category shield, 1H melee), and only by one
    FOLLOW_PROPS = {"follows"}  # rules 1.58 (5e item 4522): a follows item, only a shield or a melee row
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
        if not (t.get("rounds") == "up_to" or (isinstance(t.get("rounds"), int) and t.get("rounds") >= 0)):
            errors.append(f"{where}: rounds must be a whole number or 'up_to'")
        if t.get("rounds") == "up_to" and not all(isinstance((t.get("numbers") or {}).get(k), int) and t["numbers"][k] >= 1 for k in ("rounds_per_roll", "max_rolls")):
            errors.append(f"{where}: rounds 'up_to' needs numbers.rounds_per_roll and numbers.max_rolls (whole, 1 or more): the cap is their product (rules 1.38)")
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
    for pr in MELEE_PROPS | RANGED_PROPS | SHIELD_PROPS | FOLLOW_PROPS:
        if pr not in (trules.get("props") or {}):
            errors.append(f"techniques: rules.props has no text for '{pr}'")
    wtiers = {e.get("id") for e in items("enemies") if isinstance(e, dict)}
    for tier in ((trules.get("drill") or {}).get("per_kill") or {}):
        if tier not in wtiers:
            errors.append(f"techniques: drill.per_kill names unknown tier {tier}")
    for e in items("enemies"):
        for sysm in ("melee", "ranged"):
            for tid in ((e.get("techniques") or {}).get(sysm) or []) if isinstance(e, dict) else []:
                if techs.get(tid, {}).get("system") != sysm or techs.get(tid, {}).get("free") or (techs.get(tid, {}).get("needs") or {}).get("shield") or (techs.get(tid, {}).get("innate") and techs.get(tid, {}).get("group") == "answer"):
                    errors.append(f"enemies:{e.get('id')}: techniques.{sysm} names '{tid}', not a {sysm} technique to list")
    skill_ids = {s_.get("id") for s_ in items("skills") if isinstance(s_, dict)}
    attr_ids = {a_.get("id") for a_ in items("attributes") if isinstance(a_, dict)}
    # Rules 1.13: Durability's Guard, the shield's techniques, the technique a skill gives, and heavy armour's gate
    gd = trules.get("guard")
    if not isinstance(gd, dict):
        errors.append("techniques: rules.guard is missing (rules 1.13: Durability's Guard)")
    else:
        for k in ("max", "per_durability", "gain_base", "gain_per_point", "shield_gain", "two_shield_mult", "soak", "pressure_per_point", "interpose_durability", "interpose_cost"):
            if not isinstance(gd.get(k), (int, float)) or isinstance(gd.get(k), bool) or gd.get(k) <= 0:
                errors.append(f"techniques: rules.guard.{k} must be a positive number")
    # rules 1.59 (T5): a class's resource row may raise that resource's cap by the class's rank (classes.json
    # resource.max_by_rank, the Bulwark's Guard): ranks 1 to 3, each a whole number, never below the shared cap
    for cl_ in ((_ld("classes").get("base") or []) if isinstance(_ld("classes").get("base"), list) else []):
        mbr = ((cl_.get("resource") or {}).get("max_by_rank")) if isinstance(cl_, dict) else None
        if mbr is None: continue
        rid = (cl_.get("resource") or {}).get("id")
        if rid not in (cl_.get("resources") or []): errors.append(f"classes:{cl_.get('id')}: resource.max_by_rank is for a resource the class brings ({rid} is not in its resources)")
        if sorted(mbr.keys()) != ["1", "2", "3"] or any(not isinstance(v, int) or isinstance(v, bool) for v in mbr.values()):
            errors.append(f"classes:{cl_.get('id')}: resource.max_by_rank holds ranks 1, 2 and 3, each a whole number")
        elif rid == "guard" and gd and (min(mbr.values()) < gd.get("max", 0) or [mbr["1"], mbr["2"], mbr["3"]] != sorted(mbr.values())):
            errors.append(f"classes:{cl_.get('id')}: resource.max_by_rank never falls below rules.guard.max and never shrinks with rank")
    hg = ((trules.get("gear_gates") or {}).get("heavy_armour") or {})
    if hg.get("skill") not in skill_ids:
        errors.append(f"techniques: rules.gear_gates.heavy_armour.skill '{hg.get('skill')}' is not a skill")
    for cls_, need in (hg.get("classes") or {}).items():
        if cls_ not in ("1", "2", "3", "4", "5") or not isinstance(need, int) or not 1 <= need <= 10:
            errors.append(f"techniques: rules.gear_gates.heavy_armour.classes: '{cls_}': {need} is not an armour class with a skill level")
    # rules 1.57 (A1): shields are weapons.json rows with the Shield property; an items.json row has no phys block, no
    # either_hand (gone with the rows) and is never category shield
    shield_items = [w_ for w_ in items("weapons") if isinstance(w_, dict) and "shield" in ((w_.get("phys") or {}).get("props") or [])]
    for i_ in items("items"):
        if isinstance(i_, dict) and ("phys" in i_ or "either_hand" in i_ or i_.get("category") == "shield"):
            errors.append(f"items:{i_.get('id')}: a shield is a weapons.json row (rules 1.57): no phys, either_hand or category shield on an item")
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
            # 0.28.3 (the tank fit): a door's own technique may also be a Link (Durability's Guard, any weapon in the hand)
            if t.get("group") not in ("answer", "link") or t.get("comes_with") or nd.get("shield") or t.get("free"):
                errors.append(f"techniques:{tid}: a technique a skill gives is an Answer or a Link with no weapon property (the engine lists it with any weapon)")
        gc = (t.get("numbers") or {}).get("guard_cost")
        if gc is not None and (not isinstance(gc, int) or gc < 1):
            errors.append(f"techniques:{tid}: numbers.guard_cost must be a whole number of Guard")
    # rules 1.58 (5e, item 4522): the follow group holds the engine's follow strike only: never free, learned, lent or given
    for tid, t in techs.items():
        if t.get("group") == "follow" and (t.get("free") or t.get("comes_with") or t.get("innate") or t.get("particular") or t.get("system") != "melee"):
            errors.append(f"techniques:{tid}: a follow is the engine's (rules 1.58): a melee row, never free, given or particular")
    for tid in ((st.get("default_melee") or []) + [x for e in items("enemies") if isinstance(e, dict) for x in ((e.get("techniques") or {}).get("melee") or [])]):
        if techs.get(tid, {}).get("group") == "follow":
            errors.append(f"techniques: '{tid}' is a follow: the engine makes it, nobody learns or lists it (rules 1.58)")
    # gear gates (proposal 13.3): what a weapon or an item asks is a skill and a level
    for kind_ in ("weapons", "items"):
        for g_ in items(kind_):
            for sk_, n_ in ((g_.get("requires") or {}) if isinstance(g_, dict) else {}).items():
                if sk_ not in skill_ids or not isinstance(n_, int) or not 1 <= n_ <= 10:
                    errors.append(f"{kind_}:{g_.get('id')}: requires '{sk_}': {n_} is not a skill and a level (1 to 10)")
    for sysm, key in (("melee", "default_melee"), ("ranged", "default_ranged")):
        for tid in st.get(key) or []:
            if (techs.get(tid, {}).get("needs") or {}).get("shield") or (techs.get(tid, {}).get("innate") and techs.get(tid, {}).get("group") == "answer"):
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
            if pr not in ((MELEE_PROPS | SHIELD_PROPS | FOLLOW_PROPS) if sysm == "melee" else RANGED_PROPS):
                errors.append(f"{where}: phys.props names '{pr}', not a {sysm} property")
        # rules 1.57 (A1, Leon, 16 Nov 2026): a shield is a weapon row: the Shield property, category shield, one-handed,
        # melee; the one prop test (character.ts isShieldId) reads the property
        if ("shield" in (ph.get("props") or [])) != (w.get("category") == "shield") or ("shield" in (ph.get("props") or []) and (w.get("hands") != "1H" or sysm != "melee")):
            errors.append(f"{where}: the Shield property and category shield go together, on a one-handed melee row")
        if ph.get("hits_with") not in skill_ids:
            errors.append(f"{where}: phys.hits_with '{ph.get('hits_with')}' is not a skill")
        for sc in (ph.get("scales_with") or []) + (ph.get("also_scales") or []):
            if sc not in skill_ids and sc not in attr_ids:
                errors.append(f"{where}: phys scales with '{sc}', not a skill or an attribute")
        # Rules 1.56 (Balance 2.0) and 1.61 (0.30, G1): phys.profile names the damage profile its Stat term reads
        # (rules.json output.profiles; absent: `weapon`, no slope). A melee blow (melee) and a gun shot (gun) grow with
        # the weapon's Attribute; no profile a weapon reads has a skill slope (the skill buys the hit, rules 1.56 item 1),
        # and a focus's weapon (category mana) reads none with a slope (Leon, 15 and 16 Nov 2026).
        if "profile" in ph:
            _prof = ((((data.get("rules") or {}).get("output") or {}).get("profiles") or {}).get(ph["profile"]))
            if not isinstance(_prof, dict):
                errors.append(f"{where}: phys.profile '{ph['profile']}' is not a profile in rules.json output.profiles")
            elif _prof.get("skill"):
                errors.append(f"{where}: phys.profile '{ph['profile']}' has a skill slope, and a weapon's skill buys the hit only (rules 1.56)")
            elif _prof.get("attr") and w.get("category") == "mana":
                errors.append(f"{where}: phys.profile '{ph['profile']}' has a slope, and a focus's weapon gets nothing from its user (rules 1.56 item 4)")
            elif _prof.get("attr") and not any(sc in attr_ids for sc in ph.get("scales_with") or []):
                errors.append(f"{where}: phys.profile '{ph['profile']}' reads an Attribute, and phys.scales_with names none")
        tch = ph.get("teaches")
        if tch and techs.get(tch, {}).get("system") != sysm:
            errors.append(f"{where}: phys.teaches '{tch}' is not a {sysm} technique")
        if tch and set(techs.get(tch, {}).get("not_with") or []) & set(ph.get("props") or []):
            errors.append(f"{where}: teaches '{tch}', which a weapon with its properties can't use (not_with)")
        if tch and techs.get(tch, {}).get("free"):
            warns.append(f"{where}: teaches '{tch}', which everyone already knows")
        # rules 1.55: a melee weapon with the thrown property offers a technique that comes with it (Throw), by data
        if sysm == "melee" and "thrown" in (ph.get("props") or []) and not any(
                t.get("system") == "melee" and "thrown" in (t.get("comes_with") or [])
                and not set(t.get("not_with") or []) & set(ph.get("props") or []) for t in techs.values()):
            errors.append(f"{where}: has the thrown property, but no melee technique comes with it (rules 1.55: Throw)")

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
AMOUNT_KEYS = {"kind", "base", "per", "profile", "type", "armour", "mults", "provisional", "text", "heal_kind", "min_pct", "gate_hp", "element", "door"}
# rules 1.56 P1 (spell damage names its door): the door a damage block's blow is made through (magic.ts SPELL_DOORS)
AMOUNT_DOORS = {"sigil", "outburst", "prayer", "bond"}
# Classes 3.0 step 5 (rules 1.31): an amount block's element tag (the damage's dmgType: Old Overcast's Smite is lightning)
AMOUNT_ELEMENTS = {"fire", "lightning", "cold", "acid", "emp"}
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
    if "element" in b and (b.get("kind") != "damage" or b["element"] not in AMOUNT_ELEMENTS):
        errors.append(f"{where}: element is one of {sorted(AMOUNT_ELEMENTS)}, on a damage block only")
    # Classes 3.0 (heal-shield-percent-spec.md section 4): the percent gate, on a heal or shield block only
    if "min_pct" in b and (b.get("kind") not in ("heal", "shield") or not (isinstance(b["min_pct"], (int, float)) and 0 <= b["min_pct"] <= 1)):
        errors.append(f"{where}: min_pct (the percent gate) is a share 0 to 1, on a heal or shield block only")
    if "gate_hp" in b and (b.get("kind") not in ("heal", "shield") or not (b["gate_hp"] is None or (isinstance(b["gate_hp"], (int, float)) and b["gate_hp"] > 0))):
        errors.append(f"{where}: gate_hp (the max HP the gate counts up to) is a number or null, on a heal or shield block only")
    if "door" in b and (b.get("kind") != "damage" or b["door"] not in AMOUNT_DOORS):
        errors.append(f"{where}: door is one of {sorted(AMOUNT_DOORS)}, on a damage block only")
    if "heal_kind" in b and (b.get("kind") not in ("heal", "shield") or not isinstance(b["heal_kind"], str) or not b["heal_kind"]):
        errors.append(f"{where}: heal_kind (the heal's kind for heal_in) is a word, on a heal or shield block only")
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

# ---------- conditions.json: the fields the engine reads (packages/engine/src/condtable.ts is its one loader) ----------
# engine foundations 2: the condition table IS this file. Every row needs what the loader reads, in one form each.
COND_UNTIL = {"put_out", "next_turn", "stand", "revealed", "source", "moved", "fight_end", "stabilised", "escape", "recovered", "treated", "repaired", "raised"}
COND_HIT = {"own_attacks", "next_attack", "not_vs_source", "vs_source", "marker_squad_vs_self", "melee_vs_self", "ranged_vs_self"}
# The numbers the engine reads from a row's effects (condtable.ts modsOf), by condition: EXACTLY these, each once. A
# row that loses one, gains one the engine would read, or writes one so the loader skips it (a `when`, a misspelt
# context or stat) fails here. The review of 12 Nov 2026 (conditions-review.json, problem 6) made five such edits and
# this check said 0 errors; it finds all five now. Change this table only together with a ruling on the row.
# The 0.29 consolidation (SF4): a door line's numbers are {=placeholders} of its own row; the Sigil door's Line lengths
# are copied to its row (door_numbers) and must equal the grammar's, and every door tab a door system file opens
# (shadow.json, tending.json, figments.json `tab`) has a skill whose door_title names it on the fight screen.
def check_doors(D, errors):
    sk = {s["id"]: s for s in D["skills"]["items"]}
    g = D["sigils"]["grammar"]
    dn = (sk.get("brain_power") or {}).get("door_numbers") or {}
    if dn.get("line_min") != g.get("min_glyphs") or dn.get("line_max") != g.get("max_glyphs"):
        errors.append(f"skills:brain_power door_numbers {dn.get('line_min')}..{dn.get('line_max')} differ from sigils.json grammar {g.get('min_glyphs')}..{g.get('max_glyphs')}")
    wp = ((sk.get("will_power") or {}).get("door_numbers") or {}).get("no_emanator_strain")
    if wp != D["soul_modules"]["cycle"].get("no_emanator_strain"):
        errors.append(f"skills:will_power door_numbers.no_emanator_strain {wp} differs from soul_modules cycle.no_emanator_strain")
    wdn = (sk.get("will_power") or {}).get("door_numbers") or {}
    if wdn.get("short_at_over") != (D["soul_modules"].get("strain") or {}).get("short_at_over"):
        errors.append(f"skills:will_power door_numbers.short_at_over {wdn.get('short_at_over')} differs from soul_modules strain.short_at_over")
    _share = ((D["soul_modules"].get("strain") or {}).get("shock") or {}).get("hp_share")
    if not isinstance(_share, (int, float)) or not 0 < _share <= 1: errors.append(f"soul_modules: strain.shock.hp_share must be a share of max HP (0 to 1), not {_share!r} (rules 1.56, the Mana Shock)")
    if (D["soul_modules"].get("strain") or {}).get("after_short") not in ("keep", "limit"): errors.append("soul_modules: strain.after_short is keep or limit (magic.ts manaShort)")
    _ms = ((((D["rules"].get("mana") or {}).get("soul") or {}).get("strain") or {}).get("mana_short") or {}) if isinstance(D.get("rules"), dict) else {}
    if not _ms: errors.append("rules.json mana.soul.strain.mana_short is missing (the Mana Short row)")
    if _ms and _ms.get("shock_hp_share") != _share:
        errors.append(f"rules.json mana.soul.strain.mana_short.shock_hp_share {_ms.get('shock_hp_share')} differs from soul_modules strain.shock.hp_share {_share}")
    if wdn.get("shock_hp_share") != _share:
        errors.append(f"skills:will_power door_numbers.shock_hp_share {wdn.get('shock_hp_share')} differs from soul_modules strain.shock.hp_share {_share}")
    for f in ("shadow", "tending", "figments"):
        tab = D[f].get("tab")
        if tab and not any(s.get("door_tab") == tab and isinstance(s.get("door_title"), str) and s["door_title"] for s in sk.values()):
            errors.append(f"{f}.json tab {tab}: no skill has door_tab {tab} with a door_title (the fight screen's tab header)")

COND_READS = {
    "weakened": ["stat_mod:damage_dealt_pct"], "slowed": ["stat_mod:move_mult"], "nausea": ["stat_mod:ap"], "pinned": ["attack_mod:own_attacks"],
    "dazed": ["stat_mod:ap"], "blinded": ["attack_mod:own_attacks", "stat_mod:vision"], "prone": ["attack_mod:melee_vs_self", "attack_mod:ranged_vs_self"],
    "left_brain_debuff": ["skill_mod_tag:core:mind", "stat_mod:sigil_ap"], "right_brain_debuff": ["skill_mod_tag:attr:expression", "skill_mod_tag:core:soul", "stat_mod:soul_cost_pct"],
    "fear": ["attack_mod:not_vs_source"], "shaken": ["stat_mod:save_heart"], "marked": ["attack_mod:marker_squad_vs_self"], "grappled": ["attack_mod:not_vs_source"], "taunted": ["attack_mod:not_vs_source"],
    "suppressed": ["stat_mod:ap"], "withdrawing": ["stat_mod:defense"], "corroded": ["stat_mod:defense"], "quickened": ["stat_mod:ap"],
    "sharpened": ["attack_mod:next_attack", "damage_mult:next_attack"], "hopeful": ["attack_mod:next_attack"], "scorned": ["attack_mod:vs_source"],
    "guarded": ["stat_mod:defense"], "inspired": ["attack_mod:own_attacks"], "read": ["reveal:intent"],
    "exposed": ["stat_mod:defense"], "off_balance": ["stat_mod:ap"],  # Classes 3.0 step 6 (Shadow, rules 1.32)
    # rules 1.33: the feelings given along a Bond (bonds-spec.md 5.1)
    "given_rage": ["stat_mod:defense"], "foe_rage": ["stat_mod:defense"], "given_fear": ["attack_mod:own_attacks", "stat_mod:defense"],
    "given_loneliness": ["stat_mod:defense"], "foe_loneliness": ["attack_mod:own_attacks"], "given_belonging": ["attack_mod:own_attacks", "stat_mod:defense"],
    "given_abandon": ["stat_mod:defense"], "foe_abandon": ["stat_mod:defense"],
}
COND_ENGINE_STATS = {"defense", "move_mult", "vision", "ap", "damage_dealt_pct", "sigil_ap", "soul_cost_pct", "save_body", "save_brain", "save_heart"}
# stat_mod stats and attack_mod contexts a row may carry that the loader does not read (another part of the engine does)
COND_OTHER_STATS = {"can_act", "hp", "next_attack_mult", "random_target_pct", "untargetable"}
COND_OTHER_HIT = {"liked_tag", "emplaced_weapon"}
# Classes 3.0 P4 (rules 1.28): a row's stat_mod of a DECLARED stat (packages/engine/src/effects/stats.ts STATS, or a
# family prefix with a suffix) answers statQuery for its bearer: Slipping's immune:opportunity_attack (rules 1.30).
_STATS_TS = (pathlib.Path(__file__).resolve().parent.parent / "packages/engine/src/effects/stats.ts").read_text()
_STATS_BODY = re.search(r"export const STATS = \{(.*?)\n\} as const", _STATS_TS, re.S).group(1)
DECLARED_STATS = set(re.findall(r"(?:^|[\s,])([a-z_]+):\s*'", _STATS_BODY))
DECLARED_FAMILIES = re.findall(r"'([a-z_]+[:_])':", re.search(r"export const STAT_FAMILIES = \{(.*?)\}", _STATS_TS, re.S).group(1))
def declared_stat(sid):
    return isinstance(sid, str) and (sid in DECLARED_STATS or any(sid.startswith(f) and len(sid) > len(f) for f in DECLARED_FAMILIES))
def cond_reads(c):
    out = []
    for e in c.get("effects") or []:
        if not isinstance(e, dict): continue
        if e.get("op") == "stat_mod" and e.get("stat") in COND_ENGINE_STATS and not e.get("when") and isinstance(e.get("value"), (int, float)): out.append("stat_mod:" + e["stat"])
        if e.get("op") == "attack_mod" and (e.get("context") or "own_attacks") in COND_HIT and isinstance(e.get("value"), (int, float)): out.append("attack_mod:" + (e.get("context") or "own_attacks"))
        if e.get("op") == "skill_mod_tag" and isinstance(e.get("value"), (int, float)): out.append("skill_mod_tag:" + str(e.get("tag")))
        if e.get("op") == "damage_mult" and e.get("context") == "next_attack": out.append("damage_mult:next_attack")
        if e.get("op") == "reveal" and e.get("what") == "intent": out.append("reveal:intent")
    return sorted(out)
cond_names = set()
for c in items("conditions"):
    cid = c.get("id"); w = f"conditions:{cid}"
    for k in ("name", "text", "kind", "engine", "duration", "effects"):
        if c.get(k) in (None, ""): errors.append(f"{w}: needs `{k}`")
    if c.get("engine") not in ("table", "flag", "state"): errors.append(f"{w}: engine must be table, flag or state (how the engine keeps it)")
    if c.get("kind") not in ("debuff", "state"): errors.append(f"{w}: kind must be debuff or state")
    # 0.31.0 (the fight panel's status strip): which group its chip sits in, HELPING, HURTING or a neutral state
    if c.get("side") not in ("helps", "hurts", "state"): errors.append(f"{w}: side must be helps, hurts or state (the status strip's group)")
    if c.get("kind") == "debuff" and c.get("side") != "hurts": errors.append(f"{w}: a debuff's side is hurts")
    if not isinstance(c.get("save"), bool): errors.append(f"{w}: save must be true or false (the family says which save)")
    fam = c.get("family")
    if fam not in (None, "body", "brain", "heart"): errors.append(f"{w}: family must be body, brain, heart or null")
    if c.get("save") and fam is None: errors.append(f"{w}: a condition with a save needs a family")
    if c.get("boon") and (c.get("save") or fam is not None): errors.append(f"{w}: a boon has no save and no family")
    if c.get("kind") == "debuff" and fam is None: errors.append(f"{w}: a debuff needs a family")
    d = c.get("duration") or {}
    has_r, has_u = isinstance(d.get("rounds"), int) and d.get("rounds") > 0, isinstance(d.get("until"), str)
    if has_r == has_u: errors.append(f"{w}: duration is exactly one of {{\"rounds\": N}} (the bearer's turn ends) or {{\"until\": \"<word>\"}}")
    if has_u and d["until"] not in COND_UNTIL: errors.append(f"{w}: duration.until '{d['until']}' is not one of {sorted(COND_UNTIL)}")
    if set(d) - {"rounds", "until", "out_of_combat"}: errors.append(f"{w}: duration has unknown keys {sorted(set(d) - {'rounds', 'until', 'out_of_combat'})}")
    for nm in [cid, c.get("key")] + list(c.get("aliases") or []):
        if nm is None: continue
        if nm in cond_names: errors.append(f"{w}: the name '{nm}' is used twice (ids, keys and aliases share one space)")
        cond_names.add(nm)
    for e in c.get("effects") or []:
        if not isinstance(e, dict): continue
        if e.get("op") == "attack_mod" and e.get("context") in (None, *COND_HIT) and not isinstance(e.get("value"), (int, float)): errors.append(f"{w}: attack_mod needs a number")
        if e.get("op") == "tn_mod" and e.get("context") in COND_HIT: errors.append(f"{w}: a to-hit change is `attack_mod` (the engine reads that op), not tn_mod")
        if e.get("op") == "stat_mod" and e.get("stat") in ("defense", "move_mult", "vision", "ap", "damage_dealt_pct", "sigil_ap", "soul_cost_pct", "save_body", "save_brain", "save_heart") and not e.get("when") and not isinstance(e.get("value"), (int, float)):
            errors.append(f"{w}: stat_mod {e.get('stat')} needs a number (the engine applies it as written)")
    got, want = cond_reads(c), sorted(COND_READS.get(cid, []))
    if got != want: errors.append(f"{w}: the engine reads {want or 'no number'} from this row's effects; the row gives it {got or 'none'} (condtable.ts modsOf; tools/validate.py COND_READS)")
    for e in c.get("effects") or []:
        if not isinstance(e, dict): continue
        if e.get("op") == "stat_mod" and e.get("stat") not in COND_ENGINE_STATS | COND_OTHER_STATS and not declared_stat(e.get("stat")): errors.append(f"{w}: stat_mod stat '{e.get('stat')}' is not one the engine knows ({sorted(COND_ENGINE_STATS | COND_OTHER_STATS)})")
        if e.get("op") == "stat_mod" and e.get("stat") in COND_ENGINE_STATS and e.get("when"): errors.append(f"{w}: stat_mod {e.get('stat')} has a `when`, and the engine skips a condition's number with one")
        if e.get("op") == "attack_mod" and (e.get("context") or "own_attacks") not in COND_HIT | COND_OTHER_HIT: errors.append(f"{w}: attack_mod context '{e.get('context')}' is not one the engine knows ({sorted(COND_HIT | COND_OTHER_HIT)})")
        if e.get("op") == "damage_mult" and not e.get("when") and e.get("context") != "next_attack": errors.append(f"{w}: damage_mult is read only with context next_attack (or as an item op with a trigger)")
    if c.get("engine") != "state" and cid in ("bleeding", "burning", "corroded") and not ((c.get("amounts") or {}).get("tick")): errors.append(f"{w}: needs amounts.tick (its damage each turn)")

for op, n in new_ops.items():
    warns.append(f"non-standard effect op '{op}' used {n}x")

# ---------- item ops (engine foundations 3; packages/engine/src/effects/triggers.ts): the closed lists ----------
# An effect whose `when` is a single word is a trigger: it must be in effect_ops.json item_ops.triggers, its op (and
# every op in `and`) must take that trigger, every `if` key must be a predicate with the right kind of value, and the
# `limit` must be { per, n } or { cooldown }. A `when` with spaces is the old prose scope (the item's handler or the
# Narrator reads it). Legacy single-word scopes still claimed by an item's own handler are listed and may only shrink.
IOPS = (data.get("effect_ops") or {}).get("item_ops") or {}
TRIG, PRED, TOPS = IOPS.get("triggers", {}), IOPS.get("predicates", {}), IOPS.get("ops", {})
LIMIT_SCOPES = set(IOPS.get("limit_scopes", []))
# The legacy single-word scopes (prose in a token's clothing, read by the item's own handler or the Narrator). This list
# may only SHRINK: a converted item uses a trigger, never a new word here.
LEGACY_WHEN = {"on_use", "remove", "would_drop_to_0", "on_hit", "on_kill", "on_reaction", "on_analyze", "on_cast",
               "hp_floor_triggered", "long_rest", "vent", "on_downed", "in_combat",
               "adjacent_enemy_moves_away_after_turn_start", "after_release", "cast_fear", "cast_outburst", "companion_destroyed_until_rebuilt",
               "companion_dies_rest_of_arc", "duration+1", "first_pump_each_turn", "full_auto_cone_hit_or_miss", "hands_empty", "hit_by:emp:2_turns",
               "hit_by:emp|lightning", "hit_marked_below_25pct", "next_hit", "next_release_this_turn", "next_turn", "on_brace",
               "on_failed_save_before_initiative", "on_failed_threat", "on_overclock", "on_vanish", "on_vent", "once_per_scene:wreck_plan_or_property",
               "per_3_guard_lost", "reaction:enemy_spell_hits_your_shield", "reaction:melee_miss_against_self", "rest:each_special_type",
               "rest_of_session", "scene_start", "session_start", "stitch_16_20", "supreme_command", "turn_start_save"}
REL = {"self", "ally", "side", "foe", "other", "none", "any"}
# rules 1.56 (P15): self_holds' hands and body halves: the properties any weapon or off-hand item carries, and the
# armour weight class names (rules.json combat.armor.classes)
_THING_PROPS = {pr for _n in ("weapons", "items") for _i in items(_n) for pr in ((_i.get("phys") or {}).get("props") or [])}
_ARMOUR_NAMES = sorted(str(_a.get("name", "")).lower() for _a in (((data.get("rules") or {}).get("combat") or {}).get("armor") or {}).get("classes") or [])
def _hold_ok(v, p):
    if not isinstance(v, dict) or not v or not set(v) <= {"slot", "door", "item", "hands", "body"} or v.get("slot", "hand") not in ("hand", "person"): return False
    if "door" in v and "item" in v: return False
    if "door" in v and v["door"] not in (p.get("values") or ["evoker", "emanator"]): return False
    if "item" in v and not isinstance(v["item"], str): return False
    h, b = v.get("hands"), v.get("body")
    if h is not None and not (isinstance(h, dict) and set(h) <= {"props", "only"} and isinstance(h.get("props"), list) and h["props"] and set(h["props"]) <= _THING_PROPS and isinstance(h.get("only", False), bool)): return False
    if b is not None and not (isinstance(b, dict) and set(b) == {"armour_at_most"} and (b["armour_at_most"] in _ARMOUR_NAMES or (isinstance(b["armour_at_most"], int) and not isinstance(b["armour_at_most"], bool)))): return False
    return any(x in v for x in ("door", "item", "hands", "body"))
# rules 1.56 (P15): a technique that comes with a property only while the holder holds something (comes_while) names it
# in self_holds' shape
for _t in items("techniques"):
    if isinstance(_t, dict) and "comes_while" in _t and not _hold_ok(_t["comes_while"], {}): errors.append(f"techniques:{_t.get('id')}: comes_while is self_holds' shape ({{hands: {{props, only}}, body: {{armour_at_most}}}} or a door or item)")
    if isinstance(_t, dict) and "comes_while" in _t and not _t.get("comes_with"): errors.append(f"techniques:{_t.get('id')}: comes_while gates comes_with, and it names none")
def check_pred(k, v, w):
    p = PRED.get(k)
    if not p: errors.append(f"{w}: unknown predicate '{k}' in `if` (item_ops.predicates)"); return
    a, vals = p["arg"], v if isinstance(v, list) else [v]
    if a == "rel" and not all(x in REL for x in vals): errors.append(f"{w}: `if.{k}` must be one of {sorted(REL)}")
    elif a == "number" and not (isinstance(v, (int, float)) and not isinstance(v, bool)): errors.append(f"{w}: `if.{k}` must be a number")
    elif a == "bool" and not isinstance(v, bool): errors.append(f"{w}: `if.{k}` must be true or false")
    elif a == "ids" and not all(isinstance(x, str) and x in known["condition"] for x in vals): errors.append(f"{w}: `if.{k}` names a condition that is not in conditions.json")
    elif a in ("words", "string") and not all(isinstance(x, str) for x in vals): errors.append(f"{w}: `if.{k}` must be words")
    elif a == "zone" and not ((isinstance(v, str) and v in (p.get("values") or [])) or (isinstance(v, dict) and v.get("kind") in (p.get("values") or []) and v.get("owner", "any") in ("self", "side", "any") and set(v) <= {"kind", "owner"})): errors.append(f"{w}: `if.{k}` is a zone kind ({p.get('values')}) or {{kind, owner: self, side or any}}")
    elif a == "tie" and not ((isinstance(v, str) and v in (p.get("values") or [])) or (isinstance(v, dict) and v.get("kind") in (p.get("values") or []) and v.get("as", "any") in ("from", "to", "any") and v.get("side", "any") in ("foe", "ally", "any") and set(v) <= {"kind", "as", "side"})): errors.append(f"{w}: `if.{k}` is a tie kind ({p.get('values')}) or {{kind, as: from or to, side}}")
    elif a == "hold" and not _hold_ok(v, p): errors.append(f"{w}: `if.{k}` is {{slot: hand or person, door: {p.get('values')}}} or {{slot, item: <id>}}, and / or {{hands: {{props: [weapon properties], only: bool}}, body: {{armour_at_most: {_ARMOUR_NAMES} or a class number}}}}")
    elif a == "skill" and not (isinstance(v, dict) and v and all(sk in known["skill"] and isinstance(n, int) for sk, n in v.items())): errors.append(f"{w}: `if.{k}` maps skills to points ({{empathy: 5}})")
    elif a == "limit" and not (isinstance(v, dict) and (v.get("per") in LIMIT_SCOPES or isinstance(v.get("cooldown"), (int, float))) and set(v) <= {"per", "n", "key", "each", "cooldown"}): errors.append(f"{w}: `if.{k}` is a limit ({{per, n?, key?, each?}} or {{cooldown}})")
    elif a == "res" and not (isinstance(v, dict) and v and all(isinstance(b, dict) and b and set(b) <= {"at_least", "at_most", "at"} and all(isinstance(b[x], (int, float)) and not isinstance(b[x], bool) for x in ("at_least", "at_most") if x in b) and b.get("at", "max") == "max" and r in (p.get("values") or []) for r, b in v.items())): errors.append(f"{w}: `if.{k}` maps resources ({p.get('values')}) to bounds {{at_least: n, at_most: n, at: max}} (rules 1.60, N10)")
    elif a in ("zone", "tie", "hold", "skill", "limit", "res"): pass
    elif p.get("values") and not all(x in p["values"] for x in vals): errors.append(f"{w}: `if.{k}` takes only {p['values']}")
# rules 1.57 (A2): the swell's condition slot (soul_modules.json cycle.swell.unless) is an `if` block of the item ops'
# predicates, and its line is words
_swell = ((data.get("soul_modules") or {}).get("cycle") or {}).get("swell")
if _swell is not None:
    if not isinstance(_swell, dict) or not isinstance(_swell.get("unless"), dict) or not _swell["unless"] or not isinstance(_swell.get("unless_text"), str) or not _swell["unless_text"].strip():
        errors.append("soul_modules: cycle.swell is {unless: {predicates}, unless_text: words}")
    else:
        for k, v in _swell["unless"].items(): check_pred(k, v, "soul_modules:cycle.swell.unless")
# Classes 3.0 P3: a number block {base, per: [{of, value}], min?, max?}; in an item op its `of` names a source
# (effects/triggers.ts sourceOf): res:<id>, event:<field>, self:/actor:/target:<field>.
SOURCE_SPACES = ["res", "event", "self", "actor", "target", "ties", "skill", "feed", "pick"]  # feed: rules 1.60 (N3), a door's beta feed; pick: rules 1.60 (N2), 1 when the holder picked that fork option
# Rules 1.60 (Doors 3.0, N3): a beta's `feed` names the carrier of its alpha door's number (effects/feed.ts); its step is
# per_point.numbers.feed (> 0), each carrier is fed by one beta only, and a `feed:<door>` source names an alpha skill fed so.
FEED_DOORS = set()
_feed_carriers = {}
for _s in (data.get("skills") or {}).get("items") or []:
    _f = _s.get("feed")
    if _f is None: continue
    _w = f"skills:{_s.get('id')}.feed"
    if _s.get("slot") != "beta": errors.append(f"{_w}: only a beta skill feeds its door")
    if not isinstance(_f, dict) or not isinstance(_f.get("carrier"), str) or not _f["carrier"]: errors.append(f"{_w}: needs a carrier (the door's number it raises)"); continue
    if _f["carrier"] in _feed_carriers: errors.append(f"{_w}: the carrier {_f['carrier']!r} is fed by {_feed_carriers[_f['carrier']]} too (one beta a number)")
    _feed_carriers[_f["carrier"]] = _s.get("id")
    _n = ((_s.get("per_point") or {}).get("numbers") or {})
    if not (isinstance(_n.get("feed"), (int, float)) and not isinstance(_n.get("feed"), bool) and _n["feed"] > 0): errors.append(f"{_w}: its step is per_point.numbers.feed, a number above 0")
    if _f.get("provisional") is not True: errors.append(f"{_w}: provisional: true (rules 1.60 numbers are PROVISIONAL)")
    for _k in ("line", "next"):
        if not isinstance(_f.get(_k), str) or not _f[_k]: errors.append(f"{_w}: needs its door tab words `{_k}`")
    _door = next((a for a in (data.get("skills") or {}).get("items") or [] if a.get("attribute") == _s.get("attribute") and a.get("slot") == "alpha"), None)
    if _door: FEED_DOORS.add(_door.get("id"))
def check_number_block(b, w, item_op=True):
    if not isinstance(b.get("base"), (int, float)) or isinstance(b.get("base"), bool) or "kind" in b:
        errors.append(f"{w} is a number block: {{base: <number>, per: [{{of, value}}], min?, max?}}"); return
    for k in set(b) - {"base", "per", "min", "max", "steps"}: errors.append(f"{w}: unknown field '{k}' in a number block")
    for st in b.get("steps") or []:
        if not (isinstance(st, dict) and isinstance(st.get("of"), str) and ":" in st["of"] and st["of"].split(":", 1)[0] in SOURCE_SPACES and isinstance(st.get("at"), (int, float)) and isinstance(st.get("value"), (int, float))):
            errors.append(f"{w}: a number block's step is {{of: <source>, at, value}} (rules 1.33: a door's ladder)")
    for k in ("min", "max"):
        if k in b and not (isinstance(b[k], (int, float)) and not isinstance(b[k], bool)): errors.append(f"{w}: a number block's {k} is a number")
    for pp in b.get("per") or []:
        if not (isinstance(pp, dict) and isinstance(pp.get("of"), str) and isinstance(pp.get("value"), (int, float)) and not isinstance(pp.get("value"), bool)):
            errors.append(f"{w}: a number block's per-point part is {{of, value}}"); continue
        if item_op and pp["of"].split(":", 1)[0] not in SOURCE_SPACES or item_op and ":" not in pp["of"]:
            errors.append(f"{w}: an item op's number block counts '{pp['of']}': name a source ({', '.join(s + ':' for s in SOURCE_SPACES)})")
        elif item_op and pp["of"].startswith("feed:") and pp["of"].split(":", 1)[1] not in FEED_DOORS:
            errors.append(f"{w}: '{pp['of']}' names no door a beta feeds (skills.json <beta>.feed)")
# Classes 3.0 P5: `targets` on any op (the unit set it runs on): its fields and words are item_ops.targets.fields.
def check_targets(t, w):
    fields = (IOPS.get("targets") or {}).get("fields") or {}
    if not isinstance(t, dict): errors.append(f"{w}: `targets` is an object ({sorted(fields)})"); return
    for k, v in t.items():
        f = fields.get(k)
        if f is None: errors.append(f"{w}: unknown targets field '{k}' ({sorted(fields)})")
        elif f == "number" and not (isinstance(v, (int, float)) and not isinstance(v, bool)): errors.append(f"{w}: targets.{k} is a number")
        elif f == "bool" and not isinstance(v, bool): errors.append(f"{w}: targets.{k} is true or false")
        elif isinstance(f, list) and v not in f: errors.append(f"{w}: targets.{k} takes {f}")
        elif f == "string" and not isinstance(v, str): errors.append(f"{w}: targets.{k} is a word")
    _tk = {k.get("id") for k in (((data.get("rules") or {}).get("ties") or {}).get("kinds") or [])}
    if "tied" in t and t["tied"] not in _tk: errors.append(f"{w}: targets.tied names a tie kind (rules.json ties.kinds: {sorted(_tk)})")
    if "aims_at" in t and not (t["aims_at"] == "self" or (isinstance(t["aims_at"], str) and t["aims_at"].startswith("tied:") and t["aims_at"][5:] in _tk)): errors.append(f"{w}: targets.aims_at is self or tied:<a tie kind>")
    if t.get("shape") in ("cone", "line") and not isinstance(t.get("within"), (int, float)): errors.append(f"{w}: a cone or a line in targets needs `within`")
    if t.get("shape") in ("burst", "aura") and not isinstance(t.get("within"), (int, float)): errors.append(f"{w}: a burst or an aura in targets needs `within`")
def check_trigger_effect(e, w):
    t = e.get("when")
    if t not in TRIG:
        if t not in LEGACY_WHEN: errors.append(f"{w}: unknown trigger '{t}' (item_ops.triggers; prose with spaces is the old free-text scope)")
        return
    for x in [e] + list(e.get("and") or []):
        o = TOPS.get(x.get("op"))
        if not o: errors.append(f"{w}: op '{x.get('op')}' does not run on a trigger (item_ops.ops)"); continue
        if t not in o["on"]: errors.append(f"{w}: op '{x.get('op')}' does not run on '{t}' (it runs on {o['on'][:6]}…)")
        if x.get("target") not in (None, "self", "actor", "target"): errors.append(f"{w}: an item op's target is self, actor or target")
        for f in ("value", "value_pct", "max", "add", "set", "min", "at_least", "tiles", "rounds", "count", "share"):
            if f in x and not (isinstance(x[f], (int, float)) and not isinstance(x[f], bool)) and not (f == "value" and x.get("op") == "resource" and x[f] in ("all", "zero")):
                if isinstance(x[f], dict): check_number_block(x[f], f"{w}: '{f}'")
                else: errors.append(f"{w}: '{f}' must be a number (or a number block) in data, never a word")
        if x.get("op") in ("damage_mult", "damage_vs", "roll_mod", "grant_ap", "resource", "floor") and not (isinstance(x.get("value"), (int, float)) or isinstance(x.get("value"), dict) or (x.get("op") == "resource" and x.get("value") in ("all", "zero"))): errors.append(f"{w}: op '{x.get('op')}' needs a numeric value (a number block; a resource: \"all\" or \"zero\")")
        if x.get("op") == "roll_with":  # rules 1.55: roll with this skill (or the best of these) in place of the weapon's, never on top
            _rs = x.get("skill") if isinstance(x.get("skill"), list) else [x.get("skill")]
            if not _rs or not all(isinstance(k_, str) and k_ in known["skill"] for k_ in _rs): errors.append(f"{w}: a roll_with's skill is a skills.json id, or a list of them")
            if "if_higher" in x and not isinstance(x["if_higher"], bool): errors.append(f"{w}: a roll_with's if_higher is true or false")
        if x.get("op") in ("deal", "mend") and isinstance(x.get("amount"), dict):
            for pp in x["amount"].get("per") or []:
                if isinstance(pp, dict) and ":" in str(pp.get("of", "")) and str(pp["of"]).split(":", 1)[0] not in SOURCE_SPACES: errors.append(f"{w}: an amount's per-point part names '{pp['of']}': its source is one of {SOURCE_SPACES}")
        if x.get("op") == "condition" and x.get("condition") == "incoming" and t != "cond_incoming": errors.append(f"{w}: condition \"incoming\" (the condition being put on) runs on cond_incoming only")
        if x.get("op") == "condition" and x.get("condition") not in known["condition"] and x.get("condition") != "incoming" and "{choice}" not in str(x.get("condition")): errors.append(f"{w}: condition '{x.get('condition')}' is not in conditions.json")
        if x.get("op") == "condition" and "{choice}" in str(x.get("condition")) and not any(str(x["condition"]).replace("{choice}", f) in known["condition"] for f in ids_of(items("feelings"))): errors.append(f"{w}: condition '{x.get('condition')}' names no row for any pick")
        if x.get("op") in ("condition", "deal") and x.get("by") not in (None, "source"): errors.append(f"{w}: an op's by is source (a condition row acting as its giver)")
        if x.get("op") == "displace" and x.get("to") not in (None, "tile", "cover"): errors.append(f"{w}: a displace's to is tile or cover")
        if "targets" in x: check_targets(x["targets"], w)
        if x.get("op") == "deal" and "via" in x and not (isinstance(x["via"], str) and x["via"]): errors.append(f"{w}: a deal's `via` is the source skill it counts as (a word: faith)")
        if x.get("op") == "deal" and "nonlethal" in x and not isinstance(x["nonlethal"], bool): errors.append(f"{w}: a deal's `nonlethal` is true or false")
        if x.get("op") == "condition" and "via" in x and not (isinstance(x["via"], str) and x["via"] in known["skill"]): errors.append(f"{w}: a condition's `via` is the skill whose strength its save is against (a skills.json id)")
        if x.get("op") == "tie":
            _tk2 = {k.get("id") for k in (((data.get("rules") or {}).get("ties") or {}).get("kinds") or [])}
            if x.get("kind") not in _tk2: errors.append(f"{w}: a tie's kind is one of rules.json ties.kinds ({sorted(_tk2)})")
            if x.get("clear") not in (None, "all", "target"): errors.append(f"{w}: a tie's clear is all or target")
        if x.get("op") == "zone":
            _zk = (PRED.get("target_in_zone") or {}).get("values") or []
            if x.get("kind") not in _zk: errors.append(f"{w}: a zone's kind is one of {_zk}")
            if x.get("at", "self") not in ("self", "target", "tile"): errors.append(f"{w}: a zone's at is self, target or tile")
        if x.get("op") == "damage_mult" and x.get("round") not in (None, "up"): errors.append(f"{w}: damage_mult's round is up")
        if x.get("op") == "spawn":
            _blocks = {k.get("id") for k in ((data.get("enemies") or {}).get("companions") or [])}
            if x.get("block") not in _blocks: errors.append(f"{w}: a spawn names a block (enemies.json companions: {sorted(_blocks)})")
            if x.get("at", "self") not in ("self", "target", "tile"): errors.append(f"{w}: a spawn's at is self, target or tile")
        if x.get("op") == "unmake" and "refund" in x and not isinstance(x["refund"], bool): errors.append(f"{w}: an unmake's refund is true or false")
        if "delay" in x and not (isinstance(x["delay"], dict) and x["delay"].get("until") in ("target_turn_start", "holder_turn_start", "rounds") and isinstance(x["delay"].get("n", 1), int)): errors.append(f"{w}: delay is {{until: target_turn_start, holder_turn_start or rounds, n?}}")
        if x.get("op") == "redirect" and not isinstance(x.get("share"), dict) and not (0 < (x.get("share") or 0.5) <= 1): errors.append(f"{w}: a redirect's share is over 0 and at most 1")
        if x.get("op") == "redirect" and "type" in x and x["type"] not in ("soul", "true", "physical", "sigil", "elemental"): errors.append(f"{w}: a redirect's type is a damage type")
        if x.get("op") == "redirect" and x.get("split") and "targets" not in x: errors.append(f"{w}: a split redirect names its receivers (targets)")
        if isinstance(x.get("limit"), dict) and "of" in x["limit"] and x["limit"]["of"] != "owner": errors.append(f"{w}: a limit's of is owner (an owned unit's reaction is its owner's)")
    cond = e.get("if")
    if cond is not None:
        if not isinstance(cond, dict): errors.append(f"{w}: `if` must be an object of predicates")
        else:
            for k, v in cond.items(): check_pred(k, v, w)
    lim = e.get("limit")
    if lim is not None and not (isinstance(lim, dict) and (isinstance(lim.get("cooldown"), (int, float)) or "reaction" in lim or (lim.get("per") in LIMIT_SCOPES and isinstance(lim.get("n", 1), int)))):
        errors.append(f"{w}: an item op's limit is {{ per: {sorted(LIMIT_SCOPES)}, n }}, {{ cooldown: rounds }} or {{ reaction: 1 or 2, kind }}")
# Classes 3.0 P5, the standing aura: a stat_mod with `targets` and no `when` (statQuery answers it for every unit of the
# set while its holder stands): a well-formed set centred on the holder, a numeric value.
def check_aura(o, w):
    check_targets(o["targets"], w)
    if isinstance(o["targets"], dict) and o["targets"].get("of", "self") != "self": errors.append(f"{w}: a standing aura is centred on its holder (targets.of: self)")
    if not (isinstance(o.get("value"), (int, float)) and not isinstance(o.get("value"), bool)): errors.append(f"{w}: a standing aura's value is a number")
    if not isinstance(o.get("stat"), str): errors.append(f"{w}: a standing aura names its stat")
def walk_triggers(o, w):
    if isinstance(o, dict):
        if isinstance(o.get("op"), str) and isinstance(o.get("when"), str) and " " not in o["when"] and ";" not in o["when"]:
            check_trigger_effect(o, w)
        if o.get("op") == "stat_mod" and "targets" in o and "when" not in o: check_aura(o, w)
        for v in o.values(): walk_triggers(v, w)
    elif isinstance(o, list):
        for v in o: walk_triggers(v, w)
# an item's own `numbers` (effects/num.ts num(h, key): what a handler that is not data yet reads) are numbers
def check_numbers(o, w):
    n = o.get("numbers") if isinstance(o, dict) else None
    if n is not None and (not isinstance(n, dict) or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in n.values())):
        errors.append(f"{w}: `numbers` must map names to numbers (effects/num.ts)")
for _n in ("perks", "traits"):
    for _x in items(_n):
        check_numbers(_x, f"{_n}:{_x.get('id')}")
        for _t in (_x.get("tiers") or {}).values(): check_numbers(_t, f"{_n}:{_x.get('id')}")
for _m in [m for b in base for r in (b.get("ranks") or {}).values() for m in r.get("moves", [])] + pool + [m for a in adv for m in a.get("moves", [])]:
    check_numbers(_m, f"classes:{_m.get('origin', '')}.{_m.get('id')}")
if TRIG:
    for _n in ("perks", "traits"):
        for _x in items(_n): walk_triggers(_x, f"{_n}:{_x.get('id')}")
    for _x in base + adv: walk_triggers(_x, f"classes:{_x.get('id')}")
    for _m in pool: walk_triggers(_m, f"classes:pool.{_m.get('origin')}.{_m.get('id')}")
    for _x in items("skills"): walk_triggers(_x.get("unlocks"), f"skills:{_x.get('id')}")
    # Rules 1.56 (plan 0.29 primitive 1): a weapon mod's triggered effects are item ops, run with the gun it is fitted to
    for _x in items("items"):
        if _x.get("category") == "mod": walk_triggers(_x, f"items:{_x.get('id')}")
    # Classes 3.0 (P7, ahead of P6's door verbs): a grant_action's `if` is the holder's predicates (Vanish: out of view)
    def _walk_grant_if(o, w):
        if isinstance(o, dict):
            if o.get("op") == "grant_action" and o.get("if") is not None:
                if not isinstance(o["if"], dict): errors.append(f"{w}: a grant_action's `if` is an object of predicates")
                else:
                    for k, v in o["if"].items(): check_pred(k, v, w)
            for v in o.values(): _walk_grant_if(v, w)
        elif isinstance(o, list):
            for v in o: _walk_grant_if(v, w)
    # Classes 3.0 P6: the one action shape. A grant_action's reach, prayer, limit, res and pick are closed lists.
    _RES_ROWS = set(((data.get("actions") or {}).get("resources") or {}).keys())
    def _check_why(o, w):
        if "why" not in o: return
        if not isinstance(o["why"], dict) or not all(isinstance(v, str) and v for v in o["why"].values()): errors.append(f"{w}: why is an object of predicate: sentence"); return
        for k in o["why"]:
            if k not in (o.get("if") or {}): errors.append(f"{w}: why names '{k}', which is not one of its if's predicates")
    def _check_grant(g, w):
        _check_why(g, w)
        r = g.get("reach")
        if r is not None:
            if not isinstance(r, dict): errors.append(f"{w}: a grant_action's reach is an object (tiles, sight, side, self, if, tied)")
            else:
                for k in r:
                    if k not in ("tiles", "sight", "side", "self", "if", "tied", "tile", "beyond", "object", "stand", "over", "why"): errors.append(f"{w}: unknown reach field '{k}'")
                # Classes 3.0 step 10: `why` (on the grant and on its reach) is the screen's sentence for a predicate of its `if`
                _check_why(r, w + ": reach")
                # Classes 3.0 step 5 (rules 1.31): reach.tile: the action aims at a tile (within tiles, in sight), not a unit
                if "tile" in r and (r["tile"] is not True or any(k in r for k in ("side", "self", "tied", "if"))): errors.append(f"{w}: reach.tile is true, with only tiles, sight, object, stand and over beside it")
                # Classes 3.0 step 6, integration (rules 1.32: Pick, Douse, Rig, Vault): what the picked tile must be; an
                # object word is an objects.json kind id, a field of a kind, or a cover grade (engine objects.ts objectIs)
                if any(k in r for k in ("object", "stand", "over")) and r.get("tile") is not True: errors.append(f"{w}: reach.object, stand and over go with reach.tile")
                _OW = {o.get("id") for o in (data.get("objects") or {}).get("items") or []} | {k for o in (data.get("objects") or {}).get("items") or [] for k in o if k not in ("id", "name", "text")} | {"half", "full"}
                if "object" in r and r["object"] not in _OW: errors.append(f"{w}: reach.object '{r['object']}' is no object kind, kind field or cover grade")
                if "stand" in r and r["stand"] is not True: errors.append(f"{w}: reach.stand is true")
                if "over" in r and not (isinstance(r["over"], list) and r["over"] and all(x in _OW for x in r["over"])): errors.append(f"{w}: reach.over is a list of object kinds, kind fields or cover grades")
                if "tiles" in r and isinstance(r["tiles"], dict): check_number_block(r["tiles"], f"{w}: reach.tiles")
                elif "tiles" in r and not (isinstance(r["tiles"], (int, float)) and not isinstance(r["tiles"], bool)): errors.append(f"{w}: reach.tiles is a number (or a number block)")
                if "beyond" in r: check_pred("target_tied", r["beyond"], w)
                if r.get("side", "any") not in ("foe", "ally", "side", "any"): errors.append(f"{w}: reach.side is foe, ally, side or any")
                for k in ("sight", "self"):
                    if k in r and not isinstance(r[k], bool): errors.append(f"{w}: reach.{k} is true or false")
                if isinstance(r.get("if"), dict):
                    for k, v in r["if"].items(): check_pred(k, v, w)
                if "tied" in r: check_pred("target_tied", r["tied"], w) if "target_tied" in PRED else errors.append(f"{w}: reach.tied needs ties (P8)")
        if "prayer" in g and g["prayer"] not in ("whisper", "hymn"): errors.append(f"{w}: a grant_action's prayer is whisper or hymn")
        if "tier" in g and g["tier"] not in (1, 2, 3): errors.append(f"{w}: a prayer's tier is 1, 2 or 3")
        lim = g.get("limit")
        if lim is not None and not (isinstance(lim, dict) and lim.get("per") in LIMIT_SCOPES | {"per_turn", "per_round", "per_combat", "per_scene", "per_session", "per_rest"} and isinstance(lim.get("n", 1), int)): errors.append(f"{w}: a grant_action's limit is {{per, n}}")
        if "res" in g and not (isinstance(g["res"], dict) and all(k in _RES_ROWS and (isinstance(v, (int, float)) or isinstance(v, dict)) for k, v in g["res"].items())): errors.append(f"{w}: a grant_action's res maps actions.json resources to numbers ({sorted(_RES_ROWS)})")
        for k, v in (g.get("res") or {}).items() if isinstance(g.get("res"), dict) else []:
            if isinstance(v, dict): check_number_block(v, f"{w}: res.{k}")
        if "scope" in g and not (isinstance(g["scope"], list) and g["scope"] and set(g["scope"]) <= {"combat", "world", "story"}): errors.append(f"{w}: a grant_action's scope lists combat, world, story")
        # 0.29 wave-2 review MF1: a grant that names an actions.json cost site is priced by that site (its handler charges
        # it), so its own `ap` (what its text reads) must be the site's: one number, held equal here
        _cs = ((data.get("actions") or {}).get("costs") or {}).get(g.get("site")) if isinstance(g.get("site"), str) else None
        if isinstance(_cs, dict) and isinstance(_cs.get("ap"), (int, float)) and g.get("ap") != _cs["ap"]: errors.append(f"{w}: its ap {g.get('ap')} is not its cost site '{g['site']}' ({_cs['ap']} AP, actions.json costs)")
    def _walk_grant(o, w):
        if isinstance(o, dict):
            if o.get("op") == "grant_action": _check_grant(o, w)
            for v in o.values(): _walk_grant(v, w)
        elif isinstance(o, list):
            for v in o: _walk_grant(v, w)
    for _x in base + adv + pool: _walk_grant(_x, f"classes:{_x.get('id')}")
    for _n in ("perks", "traits"):
        for _x in items(_n): _walk_grant(_x, f"{_n}:{_x.get('id')}")
    # Classes 3.0 P8: the kinds of tie (rules.json ties.kinds)
    for _k in ((data.get("rules") or {}).get("ties") or {}).get("kinds") or []:
        w = f"rules.ties.kinds:{_k.get('id')}"
        for f in _k:
            if f not in ("id", "max", "ends_on", "on_end", "about", "provisional", "mark", "gear", "line"): errors.append(f"{w}: unknown field '{f}'")
        if "line" in _k:  # the map draws the tie (screenViews.ts tieLines): an ink, and the dash pattern to another side's unit
            _ln = _k["line"]
            if not (isinstance(_ln, dict) and isinstance(_ln.get("ink"), str) and re.fullmatch(r"#[0-9A-Fa-f]{6}", _ln["ink"]) and set(_ln) <= {"ink", "foe_dash", "about"} and isinstance(_ln.get("foe_dash", ""), str)): errors.append(f"{w}: line is {{ink: '#RRGGBB', foe_dash?: an SVG dash pattern, about?}}")
        if "mark" in _k and _k["mark"] not in known["condition"]: errors.append(f"{w}: mark names a condition (conditions.json)")
        if "gear" in _k and not (isinstance(_k["gear"], dict) and isinstance(_k["gear"].get("door"), str)): errors.append(f"{w}: gear is {{door}} (a focus the near end carries)")
        if "max" in _k and not (isinstance(_k["max"], int) and _k["max"] >= 0): errors.append(f"{w}: max is a whole number")
        _ew = ("from_down", "to_down", "to_dead", "unseen_round", "combat_end")
        if not all((x in _ew) if isinstance(x, str) else (isinstance(x, dict) and x.get("word") in _ew and x.get("side", "foe") in ("foe", "ally") and set(x) <= {"word", "side"}) for x in _k.get("ends_on") or []): errors.append(f"{w}: ends_on takes from_down, to_down, to_dead, unseen_round, combat_end (or {{word, side: foe or ally}})")
        if _k.get("on_end", "none") not in ("none", "unmake"): errors.append(f"{w}: on_end is none or unmake")
    # Classes 3.0 P12: an item's data toggles: [{id, name, on: [action types], if, default_on, effects}]
    def _check_toggles(x, w):
        ts = x.get("toggles")
        if ts is None: return
        if not isinstance(ts, list): errors.append(f"{w}: toggles is a list"); return
        ids = set()
        for t in ts:
            if not (isinstance(t, dict) and isinstance(t.get("id"), str) and t["id"] not in ids): errors.append(f"{w}: a toggle has a unique id"); continue
            ids.add(t["id"])
            for k in t:
                if k not in ("id", "name", "on", "if", "default_on", "effects"): errors.append(f"{w}: unknown toggle field '{k}'")
            if not (isinstance(t.get("on"), list) and t["on"] and all(isinstance(a, str) and "/" in a for a in t["on"])): errors.append(f"{w}: a toggle's on lists action types ('combat/attack')")
            if isinstance(t.get("if"), dict):
                for k, v in t["if"].items(): check_pred(k, v, w)
            for e in t.get("effects") or []:
                if not (isinstance(e, dict) and isinstance(e.get("when"), str)): errors.append(f"{w}: a toggle's effects are item ops with a trigger"); continue
                check_trigger_effect(e, w)
        def _walk_tog(o):
            if isinstance(o, dict):
                tg = (o.get("if") or {}).get("toggle") if isinstance(o.get("if"), dict) else None
                for v in ([tg] if isinstance(tg, str) else tg or []):
                    if v not in ids: errors.append(f"{w}: `if.toggle` names '{v}', not one of the item's toggles")
                for v in o.values(): _walk_tog(v)
            elif isinstance(o, list):
                for v in o: _walk_tog(v)
        _walk_tog(x.get("effects"))
    for _x in [m for _b in base for _r in (_b.get("ranks") or {}).values() for m in _r.get("moves", [])] + pool + [m for _a in adv for m in _a.get("moves", [])]: _check_toggles(_x, f"classes:{_x.get('origin', '')}.{_x.get('id')}")
    for _n in ("perks", "traits"):
        for _x in items(_n): _check_toggles(_x, f"{_n}:{_x.get('id')}")
    # a door verb (item kind `verb`, any data file's items): held by a sheet that meets every `requires`
    _SK = set(known["skill"]); _CL = {b.get("id") for b in base}
    for _fn, _blk in data.items():
        for _x in (_blk.get("items") if isinstance(_blk, dict) else None) or []:
            if not (isinstance(_x, dict) and _x.get("kind") == "verb"): continue
            w = f"{_fn}:{_x.get('id')}"
            req = _x.get("requires")
            if not (isinstance(req, list) and req): errors.append(f"{w}: a verb names what it requires ([{{skill, min}}] or [{{class, rank}}])")
            _fork_ids = {x.get("id") for x in (data.get("forks") or {}).get("items") or [] if isinstance(x, dict)}  # rules 1.60 (N1): a fork option, once picked
            for q in req or []:
                if not (isinstance(q, dict) and ((q.get("skill") in _SK and isinstance(q.get("min", 1), int)) or (q.get("class") in _CL and q.get("rank", 1) in (1, 2, 3)) or (set(q) == {"door_pick"} and q.get("door_pick") in _fork_ids))): errors.append(f"{w}: a verb's requires entry is {{skill, min}}, {{class, rank}} or {{door_pick: <a forks.json id>}}")
            if sum(1 for e in _x.get("effects") or [] if isinstance(e, dict) and e.get("op") == "grant_action") > 1: errors.append(f"{w}: a verb has one grant_action (a passive verb none)")
            _walk_grant(_x, w); walk_triggers(_x, w); _check_toggles(_x, w); check_amounts(_x, w); check_numbers(_x, w)
            for _g in [e for e in _x.get("effects") or [] if isinstance(e, dict) and e.get("op") == "grant_action"]:
                for _e in _g.get("effects") or []:
                    if isinstance(_e, dict) and _e.get("op") in TOPS: check_trigger_effect({**_e, "when": "acted"}, w)

    # Shadow (rules 1.32, shadow-spec.md section 10): a shadow.* verb costs at most the cap its Ingenuity gives; a skill
    # unlock's toggles are item ops; a number block's res: source names a resource; Ingenuity's per_point has no ambush
    # slope; the door's Break term and the Operative's start read the same numbers as rules.json shadow
    _SHR = (data.get("rules") or {}).get("shadow") or {}
    _RESIDS = set(((data.get("actions") or {}).get("resources") or {}).keys())
    def _sh_cap(n):
        return max([v for k, v in (_SHR.get("cap_by_points") or {}).items() if n >= int(k)] or [0])
    for _x in (data.get("shadow") or {}).get("items") or []:
        _g = next((e for e in _x.get("effects") or [] if isinstance(e, dict) and e.get("op") == "grant_action"), {})
        _need = ((_x.get("requires") or [{}])[0] or {}).get("min", 0)
        if ((_g.get("res") or {}).get("shadow") or 0) > _sh_cap(_need): errors.append(f"shadow:{_x.get('id')}: costs more Shadow than the cap at Ingenuity {_need}")
    def _walk_res(o, w):
        if isinstance(o, dict):
            if isinstance(o.get("of"), str) and o["of"].startswith("res:") and o["of"][4:] not in _RESIDS: errors.append(f"{w}: number block source {o['of']} names no actions.json resource")
            for v in o.values(): _walk_res(v, w)
        elif isinstance(o, list):
            for v in o: _walk_res(v, w)
    for _x in items("skills"):
        for _l, _u in (_x.get("unlocks") or {}).items():
            _check_toggles(_u, f"skills:{_x.get('id')}.{_l}"); _walk_res(_u, f"skills:{_x.get('id')}.{_l}")
    _ing = next((x for x in items("skills") if x.get("id") == "ingenuity"), {})
    if "ambush_per_point" in (_ing.get("per_point") or {}): errors.append("skills:ingenuity: per_point has no ambush_per_point (rules 1.32: the Ambush is a flat 1 + rules.json shadow.ambush_bonus)")
    _door = ((_ing.get("unlocks") or {}).get("1") or {})
    _brk = next((t for t in _door.get("toggles") or [] if t.get("id") == "shadow.break"), None)
    if _SHR and _brk:
        _per = {p.get("of"): p.get("value") for e in _brk.get("effects") or [] if isinstance(e.get("value"), dict) for p in e["value"].get("per") or []}
        if _per != {"res:shadow": _SHR.get("per_point"), "event:ambush": _SHR.get("ambush_bonus"), "target:marked": _SHR.get("marked_bonus")}: errors.append("skills:ingenuity.1: the Break's term must read rules.json shadow per_point, ambush_bonus, marked_bonus")
        if any((e.get("limit") or {}).get("key") == "gain" and (e["limit"].get("n") != _SHR.get("door_gains_per_turn")) for e in _door.get("effects") or []): errors.append("skills:ingenuity.1: the gains' shared limit is rules.json shadow.door_gains_per_turn")
    _op = next((m for b in base if b.get("id") == "infiltrator" for m in b.get("gain") or [] if m.get("id") == "tradecraft"), None)
    if _SHR and _op and not any(e.get("op") == "resource" and e.get("when") == "combat_start" and e.get("value") == _SHR.get("operative_start") for e in _op.get("effects") or []): errors.append("classes:infiltrator.tradecraft: its combat_start Shadow is rules.json shadow.operative_start")
    # skills.json unlocks marked `item` are run as items (effects/collect.ts SKILL_ITEMS)
    for _x in items("skills"):
        for _l, _u in (_x.get("unlocks") or {}).items():
            if "item" in _u and _u["item"] is not True: errors.append(f"skills:{_x.get('id')}.{_l}: `item` is true or absent")
    for _x in base + adv + pool: _walk_grant_if(_x, f"classes:{_x.get('id')}")
    for _n in ("perks", "traits"):
        for _x in items(_n): _walk_grant_if(_x, f"{_n}:{_x.get('id')}")
    # (Witnessed's taboo is faith.ts's own rule, read by its words: this list may only shrink)
    COND_LEGACY_WHEN = {"taboo_tag"}
    # Classes 3.0 P4: a condition row is an item its bearer holds: its effects whose op is an item op are checked as
    # triggered effects (a row's own engine rule, Bleeding's turn_start stat_mod, is not an item op and stays prose)
    for _x in items("conditions"):
        for _e in _x.get("effects") or []:
            if isinstance(_e, dict) and _e.get("op") in TOPS and isinstance(_e.get("when"), str) and " " not in _e["when"] and _e["when"] not in COND_LEGACY_WHEN:
                check_trigger_effect(_e, f"conditions:{_x.get('id')}")
else:
    errors.append("effect_ops.json: no item_ops block (the closed lists of item ops)")

# Rules 1.28 (Classes 3.0 P1): every reaction has a kind. An Answer technique names its own (`reaction`: attack or
# protect); a condition's `forbid` of action `reaction` names the kinds it forbids; an item op that is a reaction
# (`limit: {reaction: n, kind}`) names its kind and spends 1 or 2.
REACT_KINDS = ["attack", "move", "protect"]
for _t in items("techniques") if isinstance(items("techniques"), list) else []:
    if _t.get("group") == "answer" and _t.get("reaction") not in REACT_KINDS:
        errors.append(f"techniques:{_t.get('id')}: an Answer names its reaction kind (`reaction`: {REACT_KINDS})")
    elif "reaction" in _t and _t.get("group") != "answer":
        errors.append(f"techniques:{_t.get('id')}: only an Answer has a `reaction` kind")
for _c in items("conditions"):
    for _e in _c.get("effects") or []:
        if _e.get("op") == "forbid" and _e.get("action") == "reaction" and "kinds" in _e and not (isinstance(_e["kinds"], list) and _e["kinds"] and all(k in REACT_KINDS for k in _e["kinds"])):
            errors.append(f"conditions:{_c.get('id')}: a forbidden reaction's kinds are some of {REACT_KINDS}")
def _walk_react(o, w):
    if isinstance(o, dict):
        lim = o.get("limit")
        if isinstance(lim, dict) and "reaction" in lim:
            if lim.get("reaction") not in (1, 2): errors.append(f"{w}: a reaction limit spends 1 or 2 reactions")
            if lim.get("kind") not in REACT_KINDS: errors.append(f"{w}: a reaction limit names its kind ({REACT_KINDS})")
        for v in o.values(): _walk_react(v, w)
    elif isinstance(o, list):
        for v in o: _walk_react(v, w)
for _n in ("perks", "traits"):
    for _x in items(_n): _walk_react(_x, f"{_n}:{_x.get('id')}")
for _x in base + adv + pool: _walk_react(_x, f"classes:{_x.get('id')}")
# rules 1.30 (reactions-spec.md section 10): more reactions only from the Skirmisher (its class gain) and items that say
# so in their text; the suppressed row forbids attacking and moving reactions only (never protective ones).
def _reaction_mods(o, w, text):
    if isinstance(o, dict):
        if o.get("op") == "stat_mod" and o.get("stat") == "reactions" and "reaction" not in (text or "").lower():
            errors.append(f"{w}: gives reactions (stat_mod reactions) but its text never says so")
        for k, v in o.items():
            if k != "text": _reaction_mods(v, w, text)
    elif isinstance(o, list):
        for v in o: _reaction_mods(v, w, text)
for _n in ("perks", "traits"):
    for _x in items(_n): _reaction_mods(_x, f"{_n}:{_x.get('id')}", json.dumps(_x))
for _b in base:
    for _m in _b.get("gain") or []:
        if _b.get("id") != "marksman" and any(e.get("stat") == "reactions" for e in _m.get("effects") or [] if isinstance(e, dict)):
            errors.append(f"classes:{_b.get('id')}.{_m.get('id')}: only the Skirmisher's class gain gives a reaction (rules 1.30)")
        _reaction_mods(_m, f"classes:{_b.get('id')}.{_m.get('id')}", _m.get("text"))
for _c in items("conditions"):
    if _c.get("id") == "suppressed":
        _fb = [e for e in _c.get("effects") or [] if isinstance(e, dict) and e.get("op") == "forbid" and e.get("action") == "reaction"]
        if not _fb or sorted(_fb[0].get("kinds") or []) != ["attack", "move"]:
            errors.append("conditions:suppressed: its reaction `forbid` names kinds attack and move only (rules 1.28, 1.30)")

# Modes (rules 1.39, survival-spec section 8.1): the lobby's three cards. The ids are the engine's PlayMode
# (run/state.ts); the lock is `available`; a locked card says why (`coming`); its art is a web asset id (art/catalog.json,
# built into apps/web/src/game/assets.json) or marked `art_pending` until it lands (the card shows a plain panel).
_modes = data.get("modes")
if _modes is not None:
    _mi = _modes.get("items") or []
    _ids = [m.get("id") for m in _mi]
    if _ids != ["survival", "roguelike", "campaign"]: errors.append(f"modes: ids {_ids} are not the engine's PlayMode, in the picker's order (survival, roguelike, campaign)")
    _by = {m.get("id"): m for m in _mi}
    if not (_by.get(_modes.get("default")) or {}).get("available"): errors.append(f"modes: default {_modes.get('default')!r} is not an open mode")
    for _m in _mi:
        _ce = _m.get("characters_each", "missing")
        if not (_ce is None or (isinstance(_ce, int) and not isinstance(_ce, bool) and _ce >= 1)): errors.append(f"modes:{_m.get('id')}: characters_each is a whole number of 1 or more, or null (as many as they like)")
    if _modes.get("old_save") not in _by: errors.append(f"modes: old_save {_modes.get('old_save')!r} is not a mode")
    for _k, _v in (_modes.get("panel_names") or {}).items():
        if not isinstance(_v, str) or not _v.strip(): errors.append(f"modes: panel_names.{_k} must be a text")
    _pg = (_modes.get("proving_ground") or {}).get("panels")
    if not isinstance(_pg, list) or not _pg or any(_p not in (_modes.get("panel_names") or {}) for _p in _pg): errors.append("modes: proving_ground.panels is a non-empty list of panel_names ids")
    _assets_p = root.parent / "apps/web/src/game/assets.json"
    _assets = set(json.loads(_assets_p.read_text()).keys()) if _assets_p.exists() else None
    for m in _mi:
        w = f"modes:{m.get('id')}"
        for k in ("name", "line"):
            if not isinstance(m.get(k), str) or not m.get(k).strip(): errors.append(f"{w}: {k} must be a text")
        if not isinstance(m.get("available"), bool): errors.append(f"{w}: available must be true or false")
        if m.get("narrator") not in ("optional", "required"): errors.append(f"{w}: narrator is optional or required")
        if m.get("start") not in ("run", "session"): errors.append(f"{w}: start is run (run/start) or session (session/start)")
        if m.get("available") is False and not (isinstance(m.get("coming"), str) and m.get("coming").strip()): errors.append(f"{w}: a locked mode says why (coming)")
        if m.get("available") is True and m.get("coming") is not None: errors.append(f"{w}: an open mode has no coming text (null)")
        # Rules 1.52: gear is given by the mode: `loadout` {kind: camp (Survival's camp) | kit (a fixed loadout of the old kits)}
        _lo = m.get("loadout")
        if not isinstance(_lo, dict) or _lo.get("kind") not in ("camp", "kit"): errors.append(f"{w}: loadout is {{kind: camp | kit}} (rules 1.52: gear is given by the mode)")
        elif _lo.get("kind") == "kit":
            _kits = {"medic", "soldier", "sigil", "soul"}  # character.ts KITS
            for _sk, _k in (_lo.get("by_door") or {}).items():
                if _sk not in {x.get("id") for x in (data.get("skills") or {}).get("items", [])}: errors.append(f"{w}: loadout.by_door {_sk!r} is not a skill")
                if _k not in _kits: errors.append(f"{w}: loadout.by_door.{_sk} {_k!r} is not one of the kits {sorted(_kits)}")
            if _lo.get("default") not in _kits: errors.append(f"{w}: loadout.default {_lo.get('default')!r} is not one of the kits {sorted(_kits)}")
        # Rules 1.54 item 11: the right panel by mode (`panels`, ids of `panel_names`), never none; `hides` from the sheet
        _pn = _modes.get("panel_names") or {}
        _pl = m.get("panels")
        if not isinstance(_pl, list) or not _pl: errors.append(f"{w}: panels is a non-empty list (rules 1.54: every mode keeps a right panel)")
        else:
            for _p in _pl:
                if _p not in _pn: errors.append(f"{w}: panel {_p!r} is not in panel_names")
            if len(set(_pl)) != len(_pl): errors.append(f"{w}: a panel is listed twice")
        if not isinstance(m.get("hides"), list) or any(_h not in ("ask", "rest") for _h in m.get("hides") or []): errors.append(f"{w}: hides is a list of ask, rest")
        a = m.get("art")
        if a is not None and _assets is not None:
            if not m.get("art_pending") and a not in _assets: errors.append(f"{w}: art {a!r} is not a web asset (art/catalog.json, npm run assets); mark it art_pending until it lands")
            if m.get("art_pending") and a in _assets: errors.append(f"{w}: art {a!r} has landed: drop art_pending")

# Survival (data/survival.json, rules 1.40 onward; docs/design/survival-spec.md section 7). The file grows a key per build
# step: each key is checked when it is there. `map` (rules 1.40, the path map): the shape, the ten kinds, the placement
# rules and the guarantees. Whether the guarantees hold with these weights is the seeded test (test/survival-map.test.ts).
_sv = data.get("survival")
if _sv is not None:
    if not isinstance(_sv, dict) or _sv.get("kind") != "survival":
        errors.append("survival: the file is one object of kind 'survival'")
        _sv = {}
    _SV_KINDS = {"fight", "elite", "boss", "shop", "forge", "training", "shrine", "rest", "cache", "event", "vault_guard", "vault"}
    _LANE_KINDS = _SV_KINDS - {"boss", "vault_guard", "vault"}  # the kinds a lane or a junction node may take (rules 1.48)
    # Rules 1.54: `music`, the track a run plays in each situation. Every id is one of the engine's OstId list.
    _mu = _sv.get("music")
    if _mu is not None:
        _w = "survival:music"
        _ost_file = root.parent / "packages" / "engine" / "src" / "music.ts"
        _ost_m = re.search(r"export type OstId =(.*?);", _ost_file.read_text(encoding="utf-8"), re.S) if _ost_file.exists() else None
        _ost_ids = set(re.findall(r"'([a-z0-9_]+)'", _ost_m.group(1))) if _ost_m else None
        _sids = {s.get("id") for s in _sv.get("settings") or []}
        def _mtrack(path, v):
            if not isinstance(v, str) or (_ost_ids is not None and v not in _ost_ids):
                errors.append(f"{_w}.{path}: {v!r} is not a track in the engine's OstId list (packages/engine/src/music.ts)")
        if not isinstance(_mu, dict) or set(_mu) - {"about", "camp", "map", "place", "boon", "quiet"} or not {"camp", "map", "place", "boon", "quiet"} <= set(_mu):
            errors.append(f"{_w}: an object of camp, map, place, boon and quiet (and about)")
        else:
            _mtrack("camp", _mu["camp"]); _mtrack("boon", _mu["boon"]); _mtrack("quiet", _mu["quiet"])
            _mm = _mu["map"] if isinstance(_mu["map"], dict) else {}
            if "default" not in _mm: errors.append(f"{_w}.map: needs a `default` track")
            for _k, _v in _mm.items():
                if _k != "default" and _k not in _sids: errors.append(f"{_w}.map.{_k}: not a setting id")
                _mtrack("map." + _k, _v)
            _mpl = _mu["place"] if isinstance(_mu["place"], dict) else {}
            for _k, _v in _mpl.items():
                if _k not in _SV_KINDS: errors.append(f"{_w}.place.{_k}: not a node kind")
                _mtrack("place." + _k, _v)
    _mp = _sv.get("map")
    if _mp is not None:
        _w = "survival:map"
        _whole = lambda v, lo=0: isinstance(v, int) and not isinstance(v, bool) and v >= lo
        _wts = lambda o, ks: isinstance(o, dict) and o and not set(o) - ks and all(isinstance(v, (int, float)) and not isinstance(v, bool) and v >= 0 for v in o.values()) and any(v > 0 for v in o.values())
        _rows = _mp.get("rows")
        if not _whole(_rows, 3):
            errors.append(f"{_w}: rows must be a whole number of 3 or more")
            _rows = 15
        _g, _f, _s, _b = _mp.get("gate_row"), _mp.get("final_row"), _mp.get("shop_rest_row"), _mp.get("boss_row")
        if not (all(_whole(x, 1) for x in (_g, _f, _s, _b)) and 2 < _g < _f - 1 and _f == _s - 1 and _s == _b - 1 and _b == _rows):
            errors.append(f"{_w}: gate_row, final_row, shop_rest_row and boss_row must stand in that order, the last three together, the Boss last (got {_g}, {_f}, {_s}, {_b} of {_rows})")
            _g, _f = 8, 13
        if not _wts(_mp.get("lanes"), {str(i) for i in range(2, 7)}):
            errors.append(f"{_w}.lanes: weights by lane count (2 to 6), one above 0")
        _jn = _mp.get("junction") or {}
        _seg = _jn.get("segment")
        if not _wts(_jn.get("sizes"), {"2", "3", "4"}):
            errors.append(f"{_w}.junction.sizes: weights by how many lanes merge (2 to 4), one above 0")
        if not (isinstance(_seg, list) and len(_seg) == 2 and all(_whole(x, 1) for x in _seg) and _seg[0] <= _seg[1]):
            errors.append(f"{_w}.junction.segment: [shortest, longest], whole numbers of 1 or more")
        else:
            # every span between two all-lane meeting rows either fits one segment or takes one junction row
            for _a, _z in ((0, _g), (_g, _f)):
                _n = _z - _a - 1
                if _n > _seg[1] and not any(_seg[0] <= j - _a - 1 <= _seg[1] and _seg[0] <= _z - j - 1 <= _seg[1] for j in range(_a + 1, _z)):
                    errors.append(f"{_w}.junction.segment: depths {_a + 1} to {_z - 1} can't be split by one junction into segments {_seg[0]} to {_seg[1]} long")
        _jk = _mp.get("junction_kinds")
        if not _wts(_jk, _LANE_KINDS - {"elite"}):
            errors.append(f"{_w}.junction_kinds: weights for the kinds a junction takes ({', '.join(sorted(_LANE_KINDS - {'elite'}))})")
        _th = _mp.get("themes") or []
        if len(_th) < 4:
            errors.append(f"{_w}.themes: at least four, so the lanes leaving one node can each take their own")
        _tid = set()
        for _t in _th:
            _tw = f"{_w}.themes.{_t.get('id')}"
            if not _t.get("id") or _t["id"] in _tid: errors.append(f"{_tw}: an id of its own")
            _tid.add(_t.get("id"))
            if not isinstance(_t.get("name"), str) or not _t["name"].strip(): errors.append(f"{_tw}: a name")
            if not (isinstance(_t.get("weight"), (int, float)) and _t["weight"] > 0): errors.append(f"{_tw}: a weight above 0")
            if not isinstance(_t.get("holds"), list) or set(_t["holds"]) - _LANE_KINDS: errors.append(f"{_tw}: holds is a list of lane kinds")
            if _t.get("fill") is not None and not _wts(_t["fill"], _LANE_KINDS): errors.append(f"{_tw}: fill is weights for lane kinds")
        for _d in _mp.get("fight_rows") or []:
            if not (_whole(_d, 1) and _d < _g):
                errors.append(f"{_w}.fight_rows: {_d} is not a depth before the gate")
        for _k, _v in (_mp.get("from_depth") or {}).items():
            if _k not in _SV_KINDS or not _whole(_v, 1):
                errors.append(f"{_w}.from_depth.{_k}: a known kind and a depth")
        for _k, _v in (_mp.get("not_rows") or {}).items():
            if _k not in _SV_KINDS or not isinstance(_v, list) or any(not _whole(x, 1) or x > _rows for x in _v):
                errors.append(f"{_w}.not_rows.{_k}: a known kind and depths of the map")
        if not isinstance(_mp.get("every_route"), list) or set(_mp["every_route"]) - (_LANE_KINDS - {"fight"}):
            errors.append(f"{_w}.every_route: a list of special lane kinds")
        for _i, _gu in enumerate(_mp.get("guarantees") or []):
            _r = _gu.get("rows") if isinstance(_gu, dict) else None
            if not (isinstance(_gu, dict) and _gu.get("kind") in _LANE_KINDS - {"fight"} and isinstance(_r, list) and len(_r) == 2
                    and all(_whole(x, 1) for x in _r) and _r[0] <= _r[1] < _s):
                errors.append(f"{_w}.guarantees[{_i}]: a special kind and rows [first, last] before row {_s}")
        if not _whole(_mp.get("shop_gap"), 1):
            errors.append(f"{_w}: shop_gap must be a whole number of 1 or more")
        _vt = _mp.get("vault") or {}
        _vd = _vt.get("depths")
        if not (isinstance(_vd, list) and len(_vd) == 2 and all(_whole(x, 2) for x in _vd) and _vd[0] <= _vd[1] < _f) or not isinstance(_vt.get("edge"), bool):
            errors.append(f"{_w}.vault: depths [first, last] inside the map before the final junction, and edge true or false")
        _wo = _mp.get("words") or {}
        if set(_wo) != _SV_KINDS or any(not isinstance(v, str) or not v for v in _wo.values()):
            errors.append(f"{_w}.words: one word for each of the twelve kinds")
        _ex = _mp.get("expect")
        if _ex is not None:
            for _k in list((_ex.get("about") or {}).keys()) + list((_ex.get("path") or {}).keys()):
                if _k not in _SV_KINDS | {"nodes"}:
                    errors.append(f"{_w}.expect: unknown kind {_k}")
        if _mp.get("provisional") is not True:
            errors.append(f"{_w}: every number is provisional (provisional: true)")
    # Rules 1.48: the vault (its guard's budget factor, the chest's grade)
    if "vault" in _sv:
        _vv = _sv["vault"]
        if not (isinstance(_vv.get("guard_factor"), (int, float)) and _vv["guard_factor"] >= 1): errors.append("survival:vault.guard_factor: 1 or more (the guard is at least an Elite fight)")
        if not (isinstance(_vv.get("grade_up"), int) and _vv["grade_up"] >= 1): errors.append("survival:vault.grade_up: a whole number of grades, 1 or more")
        if _vv.get("grade_max") not in ("fine", "masterwork", "relic"): errors.append("survival:vault.grade_max: fine, masterwork or relic (never Celestial)")
        if _vv.get("provisional") is not True: errors.append("survival:vault: provisional: true")
    # Rules 1.41 (build step 3): the run's start, the encounter generator's budget, templates and settings, the rewards.
    _tiers = {t.get("id") for t in (data.get("enemies") or {}).get("items", [])}
    _casters = {c.get("id"): c for c in ((data.get("enemies") or {}).get("casters") or []) + ((data.get("enemies") or {}).get("soul_casters") or [])}
    _wids = {w.get("id") for w in (data.get("weapons") or {}).get("items", [])}
    _kt = set(((data.get("loot_tables") or {}).get("kind_tables") or {}).keys())
    _num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    for _t in (data.get("enemies") or {}).get("items", []):
        if "survival" in data and not (isinstance(_t.get("lag"), list) and _t["lag"] and all(isinstance(r, dict) and _num(r.get("from")) and _num(r.get("lag")) and 0 <= r["lag"] < 5 for r in _t["lag"])):
            errors.append(f"enemies:{_t.get('id')}: lag is a list of {{from, lag}} rows, each lag 0 to 4 (rules 1.41; never 5: the gap rule's one-hit line)")
    if "run" in _sv:
        _r = _sv["run"]
        for _k in ("start_credits", "dead_return_hp"):
            if not _num(_r.get(_k)) or _r.get(_k) < 0: errors.append(f"survival:run.{_k}: a number of 0 or more")
        if _r.get("first_setting") not in {s.get("id") for s in _sv.get("settings") or []}: errors.append("survival:run.first_setting: not a setting")
        _af = _r.get("after_fight")  # the fight cards' line for what follows a fight (docs/design/ui-screens.md)
        if not (isinstance(_af, dict) and all(isinstance(_af.get(_k), str) and _af[_k].strip() for _k in ("won", "lost"))): errors.append("survival:run.after_fight: a won and a lost text")
    # Rules 1.52: the camp's loadout. Every free weapon and focus exists; every stock id has a price (priceOf's shapes:
    # a weapon or item with price_credits, armour:<class> from rules.json armor.classes); the budget is a number.
    if "loadout" in _sv:
        _lo, _w = _sv["loadout"], "survival:loadout"
        _wid = {x.get("id"): x for x in (data.get("weapons") or {}).get("items", [])}
        _iid = {x.get("id"): x for x in (data.get("items") or {}).get("items", [])}
        if not (_num(_lo.get("budget")) and _lo["budget"] >= 0): errors.append(f"{_w}.budget: a number of credits, 0 or more")
        # Leon, 14 Nov 2026: the free list is the most basic weapon of every archetype, the rack the same again and the
        # next one up. An archetype names a weapons.json family and category; every player weapon's family is either an
        # archetype's or named in left_out (so a new family cannot slip past the camp unseen); each has a weapon with a price.
        _ar = _lo.get("archetypes") or {}
        _fams = {(x.get("mastery_family"), x.get("category")) for x in _wid.values() if (x.get("price_credits") or 0) > 0 and not x.get("companion_only")}
        _seen_ar = set()
        for _a in _ar.get("list") or []:
            _aw = f"{_w}.archetypes.{_a.get('id')}"
            if _a.get("id") in _seen_ar: errors.append(f"{_aw}: an id twice")
            _seen_ar.add(_a.get("id"))
            _ws = sorted([x for x in _wid.values() if x.get("mastery_family") == _a.get("family") and x.get("category") == _a.get("category") and x.get("id") not in (_a.get("skip") or []) and (x.get("price_credits") or 0) > 0], key=lambda x: (x["price_credits"], x["id"]))
            if not _ws: errors.append(f"{_aw}: no priced weapon of family {_a.get('family')!r} and category {_a.get('category')!r}")
            for _x in _a.get("skip") or []:
                if _x not in _wid: errors.append(f"{_aw}.skip: {_x!r} is not a weapon")
        _covered = {(a.get("family"), a.get("category")) for a in _ar.get("list") or []}
        for _f in sorted(_fams, key=str):
            if _f not in _covered and _f[0] not in (_ar.get("left_out") or {}) and _f[1] not in (_ar.get("left_out") or {}): errors.append(f"{_w}.archetypes: the family {_f[0]!r} ({_f[1]!r}) is neither an archetype nor left_out with its reason")
        _rec = _lo.get("recommended") or {}
        _ralpha = {s.get("id") for s in (data.get("skills") or {}).get("items", []) if s.get("slot") == "alpha"}
        for _rw in _rec.get("weapon") or []:
            # rules 1.55 item 51: a row names its archetype, or the hands its free weapon takes (scored by the engine)
            if "hands" in _rw:
                if _rw.get("hands") not in ("1H", "2H"): errors.append(f"{_w}.recommended.weapon: hands {_rw.get('hands')!r} is not 1H or 2H")
                if "archetype" in _rw: errors.append(f"{_w}.recommended.weapon: a row names an archetype or hands, not both")
            elif _rw.get("archetype") not in _seen_ar: errors.append(f"{_w}.recommended.weapon: {_rw.get('archetype')!r} is not an archetype")
            if "top" in _rw and _rw["top"] not in _ralpha: errors.append(f"{_w}.recommended.weapon: top {_rw['top']!r} is not an alpha skill")
            # rules 1.56 (the 0.28.3 merge): `character`, the character's own archetype (archetypes.json)
            if "character" in _rw and _rw["character"] not in {a.get("id") for a in (data.get("archetypes") or {}).get("items", [])}: errors.append(f"{_w}.recommended.weapon: character {_rw['character']!r} is not an archetypes.json archetype")
            for _rk in _rw:
                if _rk not in ("when", "skill", "over", "top", "character", "archetype", "hands", "focus", "profile"): errors.append(f"{_w}.recommended.weapon: unknown row key {_rk!r}")
            if "profile" in _rw and _rw["profile"] not in (_rec.get("buys") or {}): errors.append(f"{_w}.recommended.weapon: profile {_rw['profile']!r} has no buys")
        for _k, _ids in (_rec.get("buys") or {}).items():
            for _x in _ids:
                if _x not in (_lo.get("stock") or {}).get("ids", []) and _x not in _iid and _x not in _wid and not _x.startswith(("armour:", "rounds:")): errors.append(f"{_w}.recommended.buys.{_k}: {_x!r} is neither stock, an item nor a weapon")
        for _x in _lo.get("focuses") or []:
            if not (_iid.get(_x) or {}).get("focus"): errors.append(f"{_w}.focuses: {_x!r} is not a focus (items.json focus)")
        def _armour_classes(o):
            if isinstance(o, dict):
                if isinstance(o.get("armor"), dict) and "classes" in o["armor"]: return o["armor"]["classes"]
                for v in o.values():
                    r = _armour_classes(v)
                    if r: return r
            return None
        _classes = {c.get("class"): c for c in (_armour_classes(data.get("rules")) or [])}
        for _x in (_lo.get("stock") or {}).get("ids", []):
            if _x.startswith("armour:") and _x[7:].isdigit(): _ok = (_classes.get(int(_x[7:])) or {}).get("price_credits", 0) > 0
            else: _ok = ((_wid.get(_x) or _iid.get(_x) or {}).get("price_credits") or 0) > 0
            if not _ok: errors.append(f"{_w}.stock: {_x!r} has no price (priceOf)")
            # rules 1.55: the camp lists nothing over its budget, so every fixed stock id is priced within it
            _p = (_classes.get(int(_x[7:])) or {}).get("price_credits", 0) if _x.startswith("armour:") and _x[7:].isdigit() else ((_wid.get(_x) or _iid.get(_x) or {}).get("price_credits") or 0)
            if _ok and _num(_lo.get("budget")) and _p > _lo["budget"]: errors.append(f"{_w}.stock: {_x!r} costs {_p}, over the camp budget of {_lo['budget']} (rules 1.55)")
        for _x, _with in (_lo.get("focus_with") or {}).items():
            if _x not in (_lo.get("focuses") or []): errors.append(f"{_w}.focus_with: {_x!r} is not a free focus")
            for _y in _with:
                if _y.get("id") not in _iid: errors.append(f"{_w}.focus_with.{_x}: {_y.get('id')!r} is not an item")
        if _lo.get("provisional") is not True: errors.append(f"{_w}: provisional: true")
    if "tiers" in _sv:
        for _t in _tiers:
            _row = _sv["tiers"].get(_t)
            if not (isinstance(_row, dict) and _num(_row.get("bulk")) and _num(_row.get("pressure"))): errors.append(f"survival:tiers.{_t}: bulk and pressure for every enemy tier")
        for _k in ("bulk_per_char_round", "bulk_band", "pressure_band", "lag_factor"):
            if not _num(_sv.get(_k)): errors.append(f"survival:{_k}: a number")
        for _k in ("pressure_per_char", "max_foes"):
            if not (isinstance(_sv.get(_k), list) and len(_sv[_k]) == 4 and all(_num(v) for v in _sv[_k])): errors.append(f"survival:{_k}: four numbers, by party size 1 to 4")
    for _ti, _tp in enumerate(_sv.get("templates") or []):
        _w = f"survival:templates.{_tp.get('id', _ti)}"
        if not set(_tp.get("nodes") or []) <= {"fight", "elite", "gate", "boss", "vault_guard"} or not _tp.get("nodes"): errors.append(f"{_w}: nodes are fight, elite, gate, boss or vault_guard")
        if not any(s.get("req") for s in _tp.get("slots") or []): errors.append(f"{_w}: at least one required slot (the anchor)")
        for _s in _tp.get("slots") or []:
            if _s.get("tier") and _s["tier"] not in _tiers: errors.append(f"{_w}: tier {_s['tier']!r} is not an enemy tier")
            for _c in _s.get("caster") or []:
                if _c not in _casters: errors.append(f"{_w}: caster {_c!r} is not in enemies.json casters or soul_casters")
            if _s.get("kind") and (_s["kind"] not in _kt or _s["kind"] == "celestial"): errors.append(f"{_w}: kind {_s['kind']!r} is not a loot kind (never celestial)")
            if _s.get("range") not in (None, "ranged", "melee", "close"): errors.append(f"{_w}: range is ranged, melee or close")
            if _s.get("spawn") not in (None, "far", "near", "between", "back", "central", "flanks", "split"): errors.append(f"{_w}: spawn {_s.get('spawn')!r} is not a spawn")
        if _tp.get("provisional") is not True: errors.append(f"{_w}: provisional: true")
    for _st in _sv.get("settings") or []:
        _w = f"survival:settings.{_st.get('id')}"
        for _k in (_st.get("kinds") or {}):
            if _k not in _kt or _k == "celestial": errors.append(f"{_w}: kind {_k!r} is not a loot_tables kind_tables key (and never celestial: the Accords)")
        _b = _st.get("boss") or {}
        if _b.get("weapon") not in _wids: errors.append(f"{_w}: the Boss's weapon {_b.get('weapon')!r} is not a weapon")
        if _b.get("kind") not in _kt or _b.get("kind") == "celestial": errors.append(f"{_w}: the Boss's kind is not a loot kind")
        for _c in _b.get("casters") or []:
            if _c not in _casters: errors.append(f"{_w}: the Boss's caster {_c!r} is not a caster")
        _vg = _st.get("vault_guard")  # rules 1.48: the vault's named guard
        if "vault" in _sv and not (isinstance(_vg, dict) and isinstance(_vg.get("name"), str) and _vg["name"].strip() and _vg.get("weapon") in _wids and _vg.get("kind") in _kt and _vg.get("kind") != "celestial"):
            errors.append(f"{_w}: vault_guard needs a name, a weapon and a loot kind (never celestial)")
    # Rules 1.45 (survival-spec rule 22, section 4.3): the layout generator's recipe. Stamps 3 to 7 a side, rectangular,
    # in the maps legend's characters (or the layout's own); every setting's stamps exist, its cover kinds give cover,
    # its hazard is a hazard kind, its props are object kinds; its kit names a folder of art/sprites/kit (or "pending").
    if "layout" in _sv:
        _ly, _w = _sv["layout"], "survival:layout"
        _ok_ids = {o.get("id"): o for o in items("objects")}
        if _ly.get("use") not in ("generated", "open_ground"): errors.append(f"{_w}.use: generated or open_ground (the switch)")
        _leg = {**((data.get("maps") or {}).get("legend") or {}), **(_ly.get("legend") or {})}
        for _c, _v in (_ly.get("legend") or {}).items():
            if not (isinstance(_v, dict) and _v.get("kind") in _ok_ids): errors.append(f"{_w}.legend.{_c}: an object of objects.json")
        for _sid, _stp in (_ly.get("stamps") or {}).items():
            _rows = _stp.get("rows") or []
            if not (_rows and all(isinstance(r, str) and len(r) == len(_rows[0]) for r in _rows) and 3 <= max(len(_rows), len(_rows[0])) <= 7):
                errors.append(f"{_w}.stamps.{_sid}: rows of one length, 3 to 7 tiles a side")
            for _ch in set("".join(_rows)) - {".", " ", "#", "~"}:
                if not isinstance(_leg.get(_ch), dict): errors.append(f"{_w}.stamps.{_sid}: {_ch!r} is not in the maps legend or the layout's")
        for _k in ("stamp_count",):
            if set((_ly.get(_k) or {}).keys()) != {str(s["size"]) for s in (_sv.get("map_size") or {}).get("steps") or []}: errors.append(f"{_w}.{_k}: one range for every map size")
        for _k in ("tries", "stamp_gap", "zone_cols", "foe_zone", "full_every", "cover_reach", "start_cover_reach", "dress_pieces", "grounds"):
            if not (_num(_ly.get(_k)) and _ly[_k] >= 0): errors.append(f"{_w}.{_k}: a number of 0 or more")
        for _k in ("cover_share", "cover_run", "barrels", "hazard_size", "dressing"):
            _r = _ly.get(_k)
            if not (isinstance(_r, list) and len(_r) == 2 and all(_num(v) for v in _r) and _r[0] <= _r[1]): errors.append(f"{_w}.{_k}: a range [low, high]")
        if _ly.get("provisional") is not True: errors.append(f"{_w}: provisional: true")
        for _st in _sv.get("settings") or []:
            _sl, _w2 = _st.get("layout") or {}, f"survival:settings.{_st.get('id')}.layout"
            if not _sl: errors.append(f"{_w2}: every setting has a layout block (rules 1.45)"); continue
            for _id in _sl.get("stamps") or []:
                if _id not in (_ly.get("stamps") or {}): errors.append(f"{_w2}: stamp {_id!r} is not in layout.stamps")
            for _g in ("half", "full"):
                for _k in (_sl.get("cover") or {}).get(_g) or []:
                    if (_ok_ids.get(_k) or {}).get("cover") != _g: errors.append(f"{_w2}.cover.{_g}: {_k!r} is not {_g} cover in objects.json")
            _hz = _sl.get("hazard")
            if _hz is not None and not ((_ok_ids.get(_hz.get("kind")) or {}).get("hazard") and _num(_hz.get("chance")) and 0 <= _hz["chance"] <= 1): errors.append(f"{_w2}.hazard: a hazard kind of objects.json and a chance 0 to 1 (or null)")
            for _k in (_sl.get("props") or {}):
                if _k not in _ok_ids: errors.append(f"{_w2}.props: {_k!r} is not an object kind")
            if _sl.get("kit") != "pending" and not (pathlib.Path(__file__).resolve().parent.parent / "art/sprites/kit" / str(_sl.get("kit"))).is_dir(): errors.append(f"{_w2}.kit: {_sl.get('kit')!r} is not a folder of art/sprites/kit (or \"pending\")")
        for _tp in _sv.get("templates") or []:
            if _tp.get("hazard") not in (None, True, False): errors.append(f"survival:templates.{_tp.get('id')}.hazard: true or false")
    for _tier, _ranges in ((_sv.get("pools") or {}).items()):
        if _tier in ("about", "provisional"): continue
        if _tier not in _tiers: errors.append(f"survival:pools.{_tier}: not an enemy tier")
        for _rg, _ids in (_ranges or {}).items():
            for _id in _ids:
                if _id not in _wids: errors.append(f"survival:pools.{_tier}.{_rg}: {_id!r} is not a weapon")
    if "rewards" in _sv:
        _rw = _sv["rewards"]
        for _k, _tbl in (_rw.get("rarity") or {}).items():
            for _rr in _tbl:
                if _rr not in ("standard", "fine", "masterwork", "relic", "celestial"): errors.append(f"survival:rewards.rarity.{_k}: {_rr!r} is not a rarity")
        for _rr in _rw.get("ceiling") or []:
            if _rr not in ("standard", "fine", "masterwork", "relic"): errors.append(f"survival:rewards.ceiling: {_rr!r} (Celestial is never a ceiling)")
    if "tips" in _sv:
        for _k in ("fight", "elite", "gate", "boss", "shop", "forge", "training", "shrine", "event", "cache", "rest", "vault_guard", "vault"):
            if not isinstance(_sv["tips"].get(_k), str) or not _sv["tips"][_k].strip(): errors.append(f"survival:tips.{_k}: the hover card's text")
    if "nodes" in _sv:
        for _k in ("shop", "forge", "training", "shrine", "event", "cache", "rest", "vault"):
            if not isinstance(_sv["nodes"].get(_k), str) or not _sv["nodes"][_k].strip(): errors.append(f"survival:nodes.{_k}: the panel's text")
    for _k in ("run", "stage", "rounds", "tiers", "share", "map_size", "xp", "credits", "ammo_pack", "rewards", "nodes", "tips", "pools", "names", "shop", "sell_rate"):
        if _k in _sv and _sv[_k].get("provisional") is not True: errors.append(f"survival:{_k}: every number is provisional (provisional: true)")
    # Rules 1.43 (build step 4a, in-run progression): the grade ladder, the Forge, the run's cap, the Relic properties
    # and boons (relic items, their ops from the closed lists), the trainings, the shrine, the lasting picks, the trades.
    _all_ids = {i["id"] for i in items("items")} | {i["id"] for i in items("weapons")}
    _gu = _sv.get("grade_up")
    if _gu is not None:
        for _r in ("fine", "masterwork", "relic"):
            if not _num((_gu.get("price") or {}).get(_r)) or _gu["price"][_r] <= 0: errors.append(f"survival:grade_up.price.{_r}: a price above 0")
        _pl = _gu.get("places") or {}
        if set(_pl) != {"shop", "forge"} or not all(_num(v) and 0 < v <= 1 for v in _pl.values()): errors.append("survival:grade_up.places: shop and forge, each a factor above 0 and at most 1")
        if _gu.get("relic_at") not in _pl: errors.append("survival:grade_up.relic_at: one of the places")
        _chit = next((i for i in items("items") if i["id"] == _gu.get("chit")), None)
        if not _chit or _chit.get("stock") is not False: errors.append("survival:grade_up.chit: an items.json item with stock: false (never sold)")
        for _k in ("per_visit", "relic_from_stage", "relic_offer", "cut_rate"):
            if not _num(_gu.get(_k)) or _gu[_k] <= 0: errors.append(f"survival:grade_up.{_k}: a number above 0")
    # Rules 1.50: the repair service (the gunsmith's rate x priceOf x the share missing, a floor, the places' factors).
    _rp = _sv.get("repair")
    if _rp is not None:
        if not _num(_rp.get("rate")) or not 0 < _rp["rate"] <= 1: errors.append("survival:repair.rate: a share of the item's price above 0 and at most 1")
        if not _num(_rp.get("floor")) or _rp["floor"] < 0: errors.append("survival:repair.floor: credits, 0 or more")
        _rpl = _rp.get("places") or {}
        if set(_rpl) != {"shop", "forge"} or not all(_num(v) and 0 < v <= 1 for v in _rpl.values()): errors.append("survival:repair.places: shop and forge, each a factor above 0 and at most 1")
        if _rp.get("provisional") is not True: errors.append("survival:repair: provisional: true (rules 1.50)")
    _wr = ((data.get("rules") or {}).get("weapons_rules") or {}).get("worn") or {}
    if _wr and (not _num(_wr.get("share")) or not 0 < _wr["share"] < 1): errors.append("rules:weapons_rules.worn.share: a share above 0 and below 1")
    if "armour_fit" in _sv and sorted((_sv["armour_fit"].get("price") or {}).keys()) != ["1", "2", "3", "4"]: errors.append("survival:armour_fit.price: a price for classes 1, 2, 3 and 4 (rules 1.52: class 1, for a character who set out with none)")
    if "boon_cap" in _sv and not _num(_sv["boon_cap"].get("cap")): errors.append("survival:boon_cap.cap: a number (percent of a rifle-turn)")
    _FITS = {"guns", "magazine_guns", "melee", "foci"}
    _POOLS = {s.get("pool") for s in _sv.get("settings") or []}
    for _lk in ("relic_props", "boons"):
        _seen = set()
        for _it in _sv.get(_lk) or []:
            _w = f"survival:{_lk}.{_it.get('id')}"
            if _it.get("id") in _seen: errors.append(f"{_w}: an id twice")
            _seen.add(_it.get("id"))
            if _it.get("kind") != "relic": errors.append(f"{_w}: a relic item (kind relic)")
            if not _num(_it.get("worth")) or _it["worth"] < 0: errors.append(f"{_w}: a worth (percent of a rifle-turn, 0 or more)")
            if _it.get("provisional") is not True or _it.get("adjudication") != "engine": errors.append(f"{_w}: provisional, adjudication engine")
            if not _it.get("effects"): errors.append(f"{_w}: its effects (item ops)")
            for _ei, _e in enumerate(_it.get("effects") or []):
                # rules 1.44: a boon may answer a run's stat (Bandolier's run_ammo, Tithe's run_credits; effects/stats.ts STATS)
                if _lk == "boons" and _e.get("when") is None and _e.get("op") == "stat_mult":
                    if _e.get("stat") not in ("run_ammo", "run_supply", "run_credits") or not _num(_e.get("value")): errors.append(f"{_w} effect {_ei}: a boon's stat_mult names run_ammo, run_supply or run_credits and a number")
                    continue
                check_trigger_effect(_e, f"{_w} effect {_ei}")
                if _lk == "relic_props" and (_e.get("if") or {}).get("with_this") is not True: errors.append(f"{_w} effect {_ei}: a property works only with its instance: if.with_this true")
            if _lk == "relic_props" and (not _it.get("fits") or not set(_it["fits"]) <= _FITS): errors.append(f"{_w}: fits names what it goes on ({sorted(_FITS)})")
            if _lk == "boons" and (not _it.get("pools") or not set(_it["pools"]) <= _POOLS | {"faith"}): errors.append(f"{_w}: pools names the settings' pools ({sorted(p for p in _POOLS if p)})")
            if _lk == "boons" and "doors" in _it and not (isinstance(_it["doors"], list) and _it["doors"] and set(_it["doors"]) <= {k["id"] for k in data["skills"]["items"]}): errors.append(f"{_w}: doors names door skills (skills.json ids)")
    for _k, _f in (("train", ("drill", "study", "practice", "devotion")), ("training", ("drill", "study", "practice", "extra_price", "most")), ("shrine", ("rite", "token_max_worth", "tokens_per_stage")), ("forge", ("slots",)), ("graft", ("hp_mult",))):
        for _x in _f:
            if _k in _sv and (not _num(_sv[_k].get(_x)) or _sv[_k][_x] <= 0): errors.append(f"survival:{_k}.{_x}: a number above 0")
    _ls = _sv.get("lasting")
    if _ls is not None:
        for _id in _ls.get("fill") or []:
            if _id not in _all_ids: errors.append(f"survival:lasting.fill: {_id!r} is not an item or weapon")
        if not (_num(_ls.get("offer")) and _num(_ls.get("min")) and _ls["min"] <= _ls["offer"]): errors.append("survival:lasting: offer and min (min at most offer)")
    # Rules 1.56 (plan 0.29 primitives 2 and 3): a weapon instance's number fields are a closed list in rules.json
    # (weapons_rules.gear_fields, read by character.ts gearNum); every gun names its Recoil; `no_recoil` is retired into it;
    # a weapon mod's flat damage is its item op (no `damage_add`); a mod with a triggered effect gates it on `with_this`.
    _gf = ((data.get("rules") or {}).get("weapons_rules") or {}).get("gear_fields") or {}
    _GF = {k for k in _gf if k != "about"}
    for _k in _GF:
        if (_gf[_k] or {}).get("combine") not in ("sum", "max"): errors.append(f"rules:weapons_rules.gear_fields.{_k}: combine is sum or max")
    _rc = ((data.get("rules") or {}).get("weapons_rules") or {}).get("recoil") or {}
    if not (isinstance(_rc, dict) and _num(_rc.get("dex_relief_per")) and _rc["dex_relief_per"] > 0 and _num(_rc.get("braced_mult"))): errors.append("rules:weapons_rules.recoil: dex_relief_per (above 0) and braced_mult")
    _GUNCAT = {"pistol", "revolver", "smg", "rifle", "shotgun", "heavy", "bow"}
    for _w in items("weapons"):
        if "no_recoil" in (_w.get("properties") or []): errors.append(f"weapons:{_w.get('id')}: no_recoil is retired (rules 1.56): write recoil 0")
        if (_w.get("category") in _GUNCAT or (_w.get("category") == "mana" and _w.get("magazine") is not None)) and not (_num(_w.get("recoil")) and _w["recoil"] >= 0): errors.append(f"weapons:{_w.get('id')}: a gun names its recoil (a number, 0 or more; rules 1.56)")
    for _m in items("items"):
        if _m.get("category") != "mod": continue
        _w = f"items:{_m.get('id')}"
        if "damage_add" in _m or "damage" in _m: errors.append(f"{_w}: a mod's damage is its item op (damage_mod on dealing) or melee_damage, not damage / damage_add (rules 1.56)")
        for _k, _v in _m.items():
            if _k.endswith("_modes"):
                if _k[:-6] not in _GF or not (isinstance(_v, list) and _v): errors.append(f"{_w}: {_k} is a list of attack modes for the gear field {_k[:-6]!r} (one of {sorted(_GF)})")
            elif _k in _GF and not _num(_v): errors.append(f"{_w}: {_k} is a gear field: a number")
        for _e in _m.get("effects") or []:
            if isinstance(_e, dict) and _e.get("when") and (_e.get("if") or {}).get("with_this") is not True: errors.append(f"{_w}: a mod's triggered effect acts only with the gun it is fitted to (if.with_this: true)")
        # rules 1.56, the unarmed fighter: a mod's data toggles (the Open Hand's forms) are item ops like any item's, each
        # acting only with the instance that carries it
        _check_toggles(_m, _w)
        for _t in _m.get("toggles") or []:
            for _e in (_t.get("effects") or []) if isinstance(_t, dict) else []:
                if isinstance(_e, dict) and (_e.get("if") or {}).get("with_this") is not True: errors.append(f"{_w}: toggle {_t.get('id')}: a mod's effect acts only with the instance it rides (if.with_this: true)")
    # Rules 1.55: an item the engine does not run yet (`built: false`) has no price (credits.ts priceOf), so no rolled
    # pool holds it; a fixed stock list must not name it either (the shop's counter, the lasting fill, the loadout, a loot table).
    _unbuilt = {i["id"] for i in items("items") if i.get("built") is False} | {i["id"] for i in items("weapons") if i.get("built") is False}
    def _names_unbuilt(o, w):
        if isinstance(o, str):
            if o in _unbuilt: errors.append(f"{w}: {o!r} is built: false (rules 1.55: not sold, rolled or given until it is built)")
        elif isinstance(o, dict):
            for _k2, _v2 in o.items():
                if _k2 not in ("about", "text", "note"): _names_unbuilt(_v2, w + "." + str(_k2))
        elif isinstance(o, list):
            for _n2, _v2 in enumerate(o): _names_unbuilt(_v2, w + "[" + str(_n2) + "]")
    for _k in ("shop", "lasting", "loadout", "forge"):
        if _k in _sv: _names_unbuilt(_sv[_k], "survival:" + _k)
    if "loot_tables" in data: _names_unbuilt(data["loot_tables"], "loot_tables")
    _tr = _sv.get("trades")
    if _tr is not None:
        _DO = {"grade", "drill", "crate", "wayside", "graft", "salvage"}
        for _t in _tr.get("items") or []:
            if _t.get("do") not in _DO: errors.append(f"survival:trades.{_t.get('id')}: do is one of {sorted(_DO)}")
            if not (isinstance(_t.get("text"), str) and _t["text"].strip()) or _t.get("provisional") is not True: errors.append(f"survival:trades.{_t.get('id')}: a text, provisional")
        if not _num(_tr.get("offer")) or _tr["offer"] > len(_tr.get("items") or []): errors.append("survival:trades.offer: at most the number of trades")
    # Rules 1.44 (build step 5): the boon pick, the next tile, the settings' cards; every pool with a boon.
    if "boon_pick" in _sv and not (_num(_sv["boon_pick"].get("offer")) and _sv["boon_pick"]["offer"] >= 1): errors.append("survival:boon_pick.offer: a number of 1 or more")
    if "world" in _sv:
        _wo = _sv["world"]
        if not (_num(_wo.get("offer")) and _num(_wo.get("min")) and 1 <= _wo["min"] <= _wo["offer"]): errors.append("survival:world: offer and min (1 <= min <= offer)")
        for _st in _sv.get("settings") or []:
            _w = f"survival:settings.{_st.get('id')}"
            if not (isinstance(_st.get("line"), str) and _st["line"].strip()): errors.append(f"{_w}: a line of flavour (the tile card)")
            if not (isinstance(_st.get("backdrop"), str) and _st["backdrop"].startswith("survival-backdrop-")): errors.append(f"{_w}: backdrop is the catalog id its tile card draws (survival-backdrop-<setting>-<a..d>)")
            if not isinstance(_st.get("awaiting"), list): errors.append(f"{_w}: awaiting lists what it still waits for (art, its own enemies), [] when nothing")
            if not any(_st.get("pool") in (_b.get("pools") or []) for _b in _sv.get("boons") or []): errors.append(f"{_w}: its pool {_st.get('pool')!r} has no boon")
    # Rules 1.51 (spec rules 48 to 53): the starting boons (relic items on the closed lists, each on one or two lines from
    # start_boon.lines, worth at most start_boon.max_worth, every line with at least two rows, no id in both pools), the
    # offer's counts, the supply pack's new fields and the camp's issue.
    _sb = _sv.get("start_boon")
    if _sb is not None:
        _alpha = {k["id"] for k in data["skills"]["items"] if k.get("slot") == "alpha"}
        _lines = _sb.get("lines") or {}
        if set(_lines) != _alpha: errors.append(f"survival:start_boon.lines: one line for each alpha skill ({sorted(_alpha)})")
        _LN = set(_lines.values())
        if set((_sb.get("names") or {}).keys()) != _LN: errors.append("survival:start_boon.names: words for every line")
        if not set((_sb.get("focus_lines") or {}).values()) <= _LN or set(_sb.get("focus_lines") or {}) != {"evoker", "emanator", "attuner", "visualizer"}: errors.append("survival:start_boon.focus_lines: the four focus kinds, each to a line")
        for _x in ("offer", "main", "second", "max_worth"):
            if not _num(_sb.get(_x)) or _sb[_x] < 1: errors.append(f"survival:start_boon.{_x}: a number of 1 or more")
        if _num(_sb.get("offer")) and _num(_sb.get("main")) and _num(_sb.get("second")) and _sb["main"] + _sb["second"] != _sb["offer"]: errors.append("survival:start_boon: main + second is the offer")
        if _sb.get("provisional") is not True: errors.append("survival:start_boon: provisional: true (rules 1.51)")
        _boon_ids = {b.get("id") for b in _sv.get("boons") or []}
        _per_line = {l: 0 for l in _LN}
        _seen = set()
        for _it in _sv.get("start_boons") or []:
            _w = f"survival:start_boons.{_it.get('id')}"
            if _it.get("id") in _seen: errors.append(f"{_w}: an id twice")
            _seen.add(_it.get("id"))
            if _it.get("id") in _boon_ids: errors.append(f"{_w}: also a Boss boon (the two pools never share a row)")
            if _it.get("kind") != "relic": errors.append(f"{_w}: a relic item (kind relic)")
            if not _num(_it.get("worth")) or not 0 < _it["worth"] <= (_sb.get("max_worth") or 0): errors.append(f"{_w}: a worth above 0 and at most start_boon.max_worth")
            if _it.get("provisional") is not True or _it.get("adjudication") != "engine": errors.append(f"{_w}: provisional, adjudication engine")
            if not _it.get("lines") or not set(_it["lines"]) <= _LN: errors.append(f"{_w}: lines names start_boon.lines' lines ({sorted(_LN)})")
            for _l in _it.get("lines") or []:
                if _l in _per_line: _per_line[_l] += 1
            if not _it.get("effects"): errors.append(f"{_w}: its effects (item ops)")
            for _ei, _e in enumerate(_it.get("effects") or []): check_trigger_effect(_e, f"{_w} effect {_ei}")
        for _l, _n in _per_line.items():
            if _n < 2: errors.append(f"survival:start_boons: the line {_l!r} has {_n} rows (at least two)")
        # a boon's needs (run/power.ts BoonNeeds): a focus kind in hand, a weapon kind, skill points; general rows (none)
        # are the offer's filler, so at least three must work for anyone
        _skill_ids = {k["id"] for k in data["skills"]["items"]}
        for _it in (_sv.get("start_boons") or []) + (_sv.get("boons") or []):
            _nd = _it.get("needs")
            if _nd is None: continue
            _w = f"survival:{_it.get('id')}.needs"
            if not isinstance(_nd, dict) or not set(_nd) <= {"door", "weapon", "skill"}: errors.append(f"{_w}: an object of door, weapon, skill"); continue
            if "door" in _nd and not set([_nd["door"]] if isinstance(_nd["door"], str) else _nd["door"]) <= {"evoker", "emanator", "attuner", "visualizer"}: errors.append(f"{_w}.door: focus kinds")
            if "weapon" in _nd and _nd["weapon"] not in ("gun", "ranged", "melee"): errors.append(f"{_w}.weapon: gun, ranged or melee")
            if "skill" in _nd and not (isinstance(_nd["skill"], dict) and set(_nd["skill"]) <= _skill_ids and all(_num(v) and v >= 1 for v in _nd["skill"].values())): errors.append(f"{_w}.skill: skill ids to points (1 or more)")
        if sum(1 for _it in _sv.get("start_boons") or [] if not _it.get("needs")) < 2: errors.append("survival:start_boons: at least two rows with no needs (the filler every character can use)")
    _ap = _sv.get("ammo_pack") or {}
    if "cores_max" in _ap and not (_num(_ap["cores_max"]) and _num(_ap.get("cores")) and _ap["cores_max"] >= _ap["cores"]): errors.append("survival:ammo_pack.cores_max: a number at least cores")
    if "mp_share" in _ap and not (_num(_ap["mp_share"]) and 0 <= _ap["mp_share"] <= 1): errors.append("survival:ammo_pack.mp_share: a share of max MP from 0 to 1")
    if "mp_doors" in _ap and not set(_ap["mp_doors"]) <= {"emanator", "attuner"}: errors.append("survival:ammo_pack.mp_doors: MP focus kinds (emanator, attuner)")
    for _k in ("grade_up", "forge", "armour_fit", "boon_cap", "graft", "train", "training", "shrine", "lasting", "trades", "boon_pick", "world"):
        if _k in _sv and _sv[_k].get("provisional") is not True: errors.append(f"survival:{_k}: every number is provisional (provisional: true)")
    # Rules 1.42 (spec rules 25, 27, section 3.4): every always-stocked id has a price through credits.ts priceOf's doors
    # (a weapon's or item's price_credits, a special round's price_mult, a calibre's round price, a magazine's), and every
    # face's portrait and backdrop is a catalog id or marked pending, with fallbacks that exist.
    _wr = (data.get("rules") or {}).get("weapons_rules") or {}
    _cal = {c.get("id"): c.get("price_credits") for c in _wr.get("calibres") or []}
    _wmap = {w.get("id"): w for w in (data.get("weapons") or {}).get("items", [])}
    _imap = {i.get("id"): i for i in (data.get("items") or {}).get("items", [])}
    _mp = _wr.get("magazine_prices") or {}
    if _sv.get("shop") is not None:
        if not (_num(_mp.get("default")) and isinstance(_mp.get("by_unit"), dict) and isinstance(_mp.get("by_category"), dict)): errors.append("rules:weapons_rules.magazine_prices: by_unit, by_category and a default price")
        if (_wr.get("special_round_price") or {}).get("calibre") not in _cal: errors.append("rules:weapons_rules.special_round_price.calibre: not a calibre")
        # rules 1.56 (L2): special rounds by calibre: every listed calibre is a calibre, the reference among them
        _spc = (_wr.get("special_round_price") or {}).get("calibres")
        if not (isinstance(_spc, list) and _spc and all(_x in _cal for _x in _spc)): errors.append("rules:weapons_rules.special_round_price.calibres: a list of calibres")
        elif (_wr.get("special_round_price") or {}).get("calibre") not in _spc: errors.append("rules:weapons_rules.special_round_price.calibres: must hold the reference calibre")
        def _priced(_id):
            if _id.startswith("rounds:"): return _num(_cal.get(_id[7:])) and _cal[_id[7:]] > 0
            _d = _wmap.get(_id) or _imap.get(_id)
            if not _d or _d.get("stock") is False: return False
            return (_num(_d.get("price_credits")) and _d["price_credits"] > 0) or (_num(_d.get("price_mult")) and _d["price_mult"] > 0)
        _shelves = set()
        for _s in _sv["shop"].get("always") or []:
            _shelves.add(_s.get("shelf"))
            for _e in _s.get("ids") or []:
                if not _priced(_e.get("id", "")): errors.append(f"survival:shop.always.{_s.get('shelf')}: {_e.get('id')!r} has no price (price_credits, price_mult or a calibre's round price)")
                if not (isinstance(_e.get("per"), int) and _e["per"] >= 1): errors.append(f"survival:shop.always.{_s.get('shelf')}: {_e.get('id')!r} needs `per`, a whole number of 1 or more")
        for _need in ("guns", "calibres", "special", "thrown", "cores", "supplies", "restock"):
            if _need not in _shelves: errors.append(f"survival:shop.always: the {_need!r} shelf is missing (spec rule 25)")
        _calsold = {_e.get("id")[7:] for _s in _sv["shop"].get("always") or [] for _e in _s.get("ids") or [] if str(_e.get("id", "")).startswith("rounds:")}
        for _c in _cal:
            if _c not in _calsold: errors.append(f"survival:shop.always: the calibre {_c!r} is not sold (every calibre the engine knows, spec rule 25)")
        for _c in (_sv["shop"].get("stock") or {}).get("item_categories") or []:
            if _c in ("mod", "armour"): errors.append(f"survival:shop.stock.item_categories: {_c!r} is the Forge's (spec rule 44)")
    if (_sv.get("sell_rate") or {}).get("rate") is not None and not (_num(_sv["sell_rate"]["rate"]) and 0 < _sv["sell_rate"]["rate"] < 1): errors.append("survival:sell_rate.rate: a share between 0 and 1")
    if _sv.get("faces") is not None:
        _catp = root.parent / "art" / "catalog.json"
        _cat = json.loads(_catp.read_text()) if _catp.exists() else {}
        _ids_all = set()
        for _sec in ("characters", "illustrations", "patrons", "gear", "maps", "sprites", "emblems", "survival_art"):  # survival_art: the keepers (S4)
            if isinstance(_cat.get(_sec), dict): _ids_all |= set(_cat[_sec].keys())
        _chars = set((_cat.get("characters") or {}).keys()); _ills = set((_cat.get("illustrations") or {}).keys())
        _setids = {s.get("id") for s in _sv.get("settings") or []}
        # rules 1.56 (L5): the camp's own backdrop is a catalogued painting (survival_art)
        if (_sv.get("loadout") or {}).get("backdrop") is not None and _sv["loadout"]["backdrop"] not in _ids_all: errors.append(f"survival:loadout.backdrop {_sv['loadout']['backdrop']!r} is not in the art catalog")
        for _f in (_sv["faces"].get("items") or []):
            _w = f"survival:faces.{_f.get('id')}"
            for _k in ("name", "role", "node"):
                if not isinstance(_f.get(_k), str) or not _f[_k].strip(): errors.append(f"{_w}: needs a {_k}")
            for _k in ("portrait", "backdrop"):
                if not _f.get(_k): errors.append(f"{_w}: needs a {_k} catalog id")
                elif _f[_k] not in _ids_all and _f.get(_k + "_pending") is not True: errors.append(f"{_w}: {_k} {_f[_k]!r} is not in art/catalog.json; mark it {_k}_pending until it lands")
            if _f.get("fallback") is not None and _f["fallback"] not in _chars: errors.append(f"{_w}: fallback {_f['fallback']!r} is not a portrait in art/catalog.json characters")
            if _f.get("fallback") is None and not _f.get("fallback_patron"): errors.append(f"{_w}: needs a fallback portrait (or fallback_patron)")
            if _f.get("backdrop_fallback") is not None and _f["backdrop_fallback"] not in _ills: errors.append(f"{_w}: backdrop_fallback {_f['backdrop_fallback']!r} is not in art/catalog.json illustrations")
            for _s in _f.get("settings") or []:
                if _s not in _setids: errors.append(f"{_w}: setting {_s!r} is not a setting")
            for _k in ("greet", "bought", "cant_afford", "sold", "sold_to", "gave", "leave"):
                _l = (_f.get("lines") or {}).get(_k)
                if not (isinstance(_l, list) and _l and all(isinstance(x, str) and x.strip() for x in _l)): errors.append(f"{_w}: lines.{_k}: one line or more")
            if _f.get("provisional") is not True: errors.append(f"{_w}: provisional: true")
        for _s in _setids:
            if not any(_f.get("node") == "shop" and _s in (_f.get("settings") or []) for _f in _sv["faces"].get("items") or []): errors.append(f"survival:faces: the setting {_s!r} has no shopkeeper (spec 3.4)")
        # Rules 1.46 (build step 4b): every safe node is a full-screen place with a face
        for _nk in ("shop", "forge", "training", "shrine", "rest", "event"):
            if not any(_f.get("node") == _nk for _f in _sv["faces"].get("items") or []): errors.append(f"survival:faces: no face stands at a {_nk!r} node (rules 1.46: every safe node is a full-screen place)")
    # The faces of Survival's foes (foe_faces; the 14 Nov delivery): every kind a setting fields (and its Boss's and vault
    # guard's) and every caster has a word, and every face the lookup can give (each tier and variant, each caster, each
    # setting's boss.portrait and vault_guard.portrait) is a portrait in art/catalog.json characters.
    _ff = _sv.get("foe_faces")
    if _ff is not None:
        _w, _fw = "survival:foe_faces", _ff.get("words") or {}
        _catp = root.parent / "art" / "catalog.json"
        _fchars = set((json.loads(_catp.read_text()) if _catp.exists() else {}).get("characters") or {})
        for _k in ("asset", "kind", "caster"):
            if not isinstance(_ff.get(_k), str) or not _ff[_k]: errors.append(f"{_w}: needs an `{_k}` pattern")
        _fv = _ff.get("variants") or {}
        _tiers = [t.get("id") for t in items("enemies")]
        for _t in _fv:
            if _t not in _tiers: errors.append(f"{_w}.variants: {_t!r} is not an enemy tier")
        def _fill(_p, **_v): return re.sub(r"\{(\w+)\}", lambda m: str(_v.get(m.group(1), "")), _p or "")
        _want = set()
        for _st in _sv.get("settings") or []:
            _ks = set(_st.get("kinds") or {})
            for _k in sorted(_ks | {(_st.get("boss") or {}).get("kind"), (_st.get("vault_guard") or {}).get("kind")} - {None}):
                if _k not in _fw: errors.append(f"{_w}.words: the kind {_k!r} (settings.{_st.get('id')}) has no word"); continue
                if _k in _ks:
                    for _t in _tiers:
                        if _t == "boss": continue  # a Boss wears its setting's boss.portrait
                        for _vr in _fv.get(_t) or [""]: _want.add(_fill(_ff.get("kind"), kind=_fw[_k], tier=_t, variant=_vr))
            for _o, _p in (("boss", (_st.get("boss") or {}).get("portrait")), ("vault_guard", (_st.get("vault_guard") or {}).get("portrait"))):
                if _p: _want.add(_p)
                else: errors.append(f"survival:settings.{_st.get('id')}.{_o}: needs a portrait (a catalog id; foe_faces)")
        for _c in _casters:
            if _c not in _fw: errors.append(f"{_w}.words: the caster {_c!r} has no word"); continue
            _want.add(_fill(_ff.get("caster"), caster=_fw[_c]))
        for _id in sorted(_want - _fchars): errors.append(f"{_w}: the face {_id!r} is not a portrait in art/catalog.json characters")
    # Rules 1.46 (build step 4b, spec rule 47): where gives are made in a run
    _gv = _sv.get("give")
    if _gv is not None:
        _kinds = {"fight", "elite", "boss", "shop", "forge", "training", "shrine", "rest", "cache", "event"}
        if not _gv.get("where") or not set(_gv["where"]) <= _kinds - {"fight", "elite", "boss"}: errors.append("survival:give.where: node kinds with no fight")
        if not isinstance(_gv.get("at_start"), bool): errors.append("survival:give.at_start: true or false")
        if _gv.get("provisional") is not True: errors.append("survival:give: provisional: true")
    # Rules 1.55 items 35 and 64 (0.28.3): what the field refuses (item ops of effect_ops.json)
    _fd = _sv.get("field")
    if _fd is not None:
        _opids = set((((data.get("effect_ops") or {}).get("item_ops") or {}).get("ops") or {}).keys())
        if not _fd.get("lasting_ops"): errors.append("survival:field: lasting_ops, a list")
        if "carried_res" in _fd: errors.append("survival:field.carried_res: gone in rules 1.55 item 64 (the field's units pay what they spend)")
        for _x in _fd.get("lasting_ops") or []:
            if _x not in _opids: errors.append(f"survival:field.lasting_ops: {_x!r} is not an item op")
        if _fd.get("provisional") is not True: errors.append("survival:field: provisional: true")

# Rules 1.54 (survival-spec 14.2, 14.3): items' pack_kind and plural, the recipes (one converter, recipes.ts) and the
# parity of every row with priceOf (credits.ts: a calibre's round price, an item's price_credits, a special round's
# price_mult x the reference calibre's), and the shop's stock rule (Leon 14 Nov: what a trait grants is not sold, but
# food and drink are).
_rw = (data.get("rules") or {}).get("weapons_rules") or {}
_rcal = {c.get("id"): c.get("price_credits") for c in _rw.get("calibres") or []}
_rref = _rcal.get((_rw.get("special_round_price") or {}).get("calibre"))
_rimap = {i.get("id"): i for i in items("items") if isinstance(i, dict)}
_rwmap = {w.get("id"): w for w in items("weapons") if isinstance(w, dict)}
_PACK_KINDS = {"weapon", "ammo", "tool", "focus", "food", "med", "loot", "plot"}
for _i in _rimap.values():
    if "pack_kind" in _i and _i["pack_kind"] not in _PACK_KINDS: errors.append(f"items:{_i.get('id')}: pack_kind {_i['pack_kind']!r} is not a pack line's kind ({', '.join(sorted(_PACK_KINDS))})")
    if "plural" in _i and not (isinstance(_i["plural"], str) and _i["plural"].strip()): errors.append(f"items:{_i.get('id')}: plural must be a name")
    # consolidation 0.29 (should-fix 4): rules 1.55 item 31: an item counted into a character's count (data.ts COUNTED), not a pack line
    if "counts_into" in _i and not (isinstance(_i["counts_into"], dict) and _i["counts_into"].get("count") in ("stims", "essence") and _i["counts_into"].get("at") in ("first", "last") and set(_i["counts_into"]) == {"count", "at"}):
        errors.append(f"items:{_i.get('id')}: counts_into is {{count: stims | essence, at: first | last}} (the character's counts, containers.ts)")
    if "counts_into" in _i and _i.get("category") != "consumable": errors.append(f"items:{_i.get('id')}: counts_into is for a consumable")
_cnt = [(i.get("counts_into") or {}).get("count") for i in _rimap.values() if isinstance(i.get("counts_into"), dict)]
if len(_cnt) != len(set(_cnt)): errors.append("items: two items name the same counted field (counts_into.count)")
for _i in _rimap.values():
    if "counted" in _i: errors.append(f"items:{_i.get('id')}: `counted` is retired; the item's count is `counts_into` (data.ts COUNTED)")
# rules 1.56 (L2): the special round of each type made and sold by calibre (an ammo_type with a price_mult), and the
# calibres it comes in (credits.ts specialRoundPrice; character.ts SPECIAL_ROUND_ITEM, SPECIAL_CALIBRES)
_rspc = (_rw.get("special_round_price") or {}).get("calibres") or []
_rsp = {_i.get("ammo_type"): _i for _i in _rimap.values() if _i.get("ammo_type") and _num(_i.get("price_mult")) and _i["price_mult"] > 0}
def _rspecial(_cal, _type):
    _d, _p = _rsp.get(_type), _rcal.get(_cal)
    if not _d or _d.get("stock") is False or _d.get("built") is False or not (_num(_p) and _p > 0) or _cal not in _rspc: return None
    return _d["price_mult"] * _p
def _rprice(_id):
    """credits.ts priceOf at the standard grade, or None (unpriced or stock: false)."""
    if _id.startswith("rounds:"):
        _parts = _id[7:].split(":")
        if len(_parts) == 2: return _rspecial(_parts[0], _parts[1])
        _p = _rcal.get(_id[7:]); return _p if _num(_p) and _p > 0 else None
    _d = _rwmap.get(_id) or _rimap.get(_id)
    if not _d or _d.get("stock") is False: return None
    if _num(_d.get("price_credits")) and _d["price_credits"] > 0: return _d["price_credits"]
    if _num(_d.get("price_mult")) and _d["price_mult"] > 0: return _rspecial((_rw.get("special_round_price") or {}).get("calibre"), _d.get("ammo_type"))
    return None
_EACH_CALIBRE_MOST = (data.get("recipes") or {}).get("each_calibre_most")  # recipes.json each_calibre_most (recipes.ts reads it too)
if not (isinstance(_EACH_CALIBRE_MOST, int) and _EACH_CALIBRE_MOST > 0): errors.append("recipes: each_calibre_most must be a whole number above 0"); _EACH_CALIBRE_MOST = 0
def _rexpand(_r):
    """recipes.ts expandRow: an each_calibre row as one row per calibre of special_round_price.calibres (changed together)."""
    if not _r.get("each_calibre"): return [_r]
    _w = f"recipes:{_r.get('id')}"
    _g = _r.get("gives") or []
    if not (isinstance(_g, list) and len(_g) == 1 and (_g[0] or {}).get("item") in _rimap and set(_g[0]) == {"item"}):
        errors.append(f"{_w}: an each_calibre row gives one line, {{item}}: the special round's item"); return []
    _sp = _rimap[_g[0]["item"]]; _type = _sp.get("ammo_type")
    if _rsp.get(_type) is not _sp: errors.append(f"{_w}: an each_calibre row gives a special round made by calibre (an ammo_type with a price_mult)"); return []
    _nd = _r.get("needs") or []
    if not (isinstance(_nd, list) and _nd and all(isinstance(_l, dict) and set(_l) == {"item", "share"} and _num(_l.get("share")) and _l["share"] > 0 for _l in _nd)):
        errors.append(f"{_w}: an each_calibre row's needs are {{item, share}} lines"); return []
    if abs(sum(_l["share"] for _l in _nd) - 1) > 1e-9: errors.append(f"{_w}: the needs' shares add up to 1 (a row is worth what it makes)")
    _out = []
    for _cal in _rspc:
        _id = f"rounds:{_cal}:{_type}"; _v = _rspecial(_cal, _type)
        if not _v: continue
        for _n in range(1, _EACH_CALIBRE_MOST + 1):
            _ns = []
            for _l in _nd:
                _pp = _rprice(_l["item"])
                _ns.append(None if not _pp else _l["share"] * _v * _n / _pp)
            if all(_x is not None and abs(_x - round(_x)) < 1e-9 and round(_x) >= 1 for _x in _ns):
                _row = {k: v for k, v in _r.items() if k != "each_calibre"}
                _row.update(id=f"{_r.get('id')}:{_cal}", needs=[{"item": _l["item"], "n": int(round(_x))} for _l, _x in zip(_nd, _ns)], gives=[{"item": _id, "n": _n}])
                _out.append(_row); break
        else: errors.append(f"{_w}: no whole making of {_id} within {_EACH_CALIBRE_MOST} rounds")
    return _out
_rc = data.get("recipes")
if _rc is not None:
    if _rc.get("provisional") is not True: errors.append("recipes: provisional: true")
    _rows = [_x for _r in items("recipes") for _x in _rexpand(_r)]
    _seen = collections.Counter(r.get("id") for r in _rows)
    for _k, _n in _seen.items():
        if _n > 1: errors.append(f"recipes: id {_k!r} is used {_n} times")
    for _r in _rows:
        _w = f"recipes:{_r.get('id')}"
        for _f in ("id", "name", "does"):
            if not (isinstance(_r.get(_f), str) and _r[_f].strip()): errors.append(f"{_w}: needs a {_f}")
        if _r.get("where") != "between_fights": errors.append(f"{_w}: where must be between_fights (the only place making is done, rules 1.54 item 5)")
        _t = _r.get("tool") or {}
        if not ((set(_t) == {"item"} and _t["item"] in _rimap) or _t == {"focus": "any"}): errors.append(f"{_w}: tool must be {{item: an items.json id}} or {{focus: any}}")
        _lines = {"needs": _r.get("needs"), "gives": _r.get("gives")}
        _worth = {}
        for _side, _l in _lines.items():
            if not (isinstance(_l, list) and _l): errors.append(f"{_w}: {_side} must be a list of {{item, n}}"); continue
            _sum = 0
            for _e in _l:
                _id, _n = (_e or {}).get("item", ""), (_e or {}).get("n")
                if not (isinstance(_n, int) and _n >= 1): errors.append(f"{_w}.{_side}: {_id!r} needs n, a whole number of 1 or more")
                if _side == "needs" and _id not in _rimap: errors.append(f"{_w}.needs: {_id!r} is not an items.json item")
                if _side == "gives" and not (_id in _rimap or (_id.startswith("rounds:") and (_id[7:] in _rcal or _rprice(_id) is not None))): errors.append(f"{_w}.gives: {_id!r} is not an item, rounds:<calibre> or rounds:<calibre>:<type>")
                _p = _rprice(_id)
                if _p is None: errors.append(f"{_w}.{_side}: {_id!r} has no price (priceOf), so the row can't be held to it"); _sum = None
                elif _sum is not None and isinstance(_n, int): _sum += _p * _n
            _worth[_side] = _sum
        if _worth.get("needs") is not None and _worth.get("gives") is not None and _worth["needs"] != _worth["gives"]:
            errors.append(f"{_w}: needs are worth {_worth['needs']} credits and gives {_worth['gives']} (rules 1.54 item 6: a row is worth what it makes, at priceOf)")
# Rules 1.54 items 2 to 4 (survival.json rewards.offer by where, rewards.materials, drops).
_sv54 = data.get("survival") or {}
_rw54 = _sv54.get("rewards") or {}
_WHERE = {"fight", "elite", "boss", "vault_guard", "vault", "crate"}
if "offer" in _rw54:
    _of = _rw54["offer"]
    if not (isinstance(_of, dict) and set(_of) == _WHERE and all(isinstance(v, int) and v >= 1 for v in _of.values())): errors.append(f"survival:rewards.offer: a whole number of 1 or more for each of {sorted(_WHERE)} (rules 1.54 item 2)")
    if "instead_rate" in _rw54: errors.append("survival:rewards.instead_rate: credits instead is retired (rules 1.54 item 2)")
    _ma = _rw54.get("materials") or {}
    if not (isinstance(_ma.get("at"), dict) and set(_ma["at"]) <= _WHERE and all(isinstance(v, bool) for v in _ma["at"].values())): errors.append("survival:rewards.materials.at: true or false by where a pick is made")
    _rd = _rw54.get("reads") or {}
    if not (isinstance(_rd, dict) and set(_rd) <= _SV_KINDS | {"gate"} and set(_rd.values()) <= _SV_KINDS and not set(_rd) & set(_rd.values())): errors.append("survival:rewards.reads: a node kind to the kind whose row it reads (one step)")
    for _e in _ma.get("items") or []:
        if _e.get("item") not in _rimap: errors.append(f"survival:rewards.materials: {_e.get('item')!r} is not an items.json item")
        if "by" in _e:  # rules 1.55 item 23: by where: a chance (absent: certain) and a [min, max] qty
            for _k, _row in (_e["by"] or {}).items():
                _q = (_row or {}).get("qty")
                if _k not in _WHERE or not (isinstance(_q, list) and len(_q) == 2 and all(isinstance(x, int) and x >= 1 for x in _q) and _q[0] <= _q[1]) or not (_row.get("chance") is None or (_num(_row["chance"]) and 0 < _row["chance"] <= 1)):
                    errors.append(f"survival:rewards.materials: {_e.get('item')!r} by {_k!r}: where a pick is made, a [min, max] qty and a chance in (0, 1]")
        elif not (_num(_e.get("per_credits")) and _e["per_credits"] > 0): errors.append(f"survival:rewards.materials: {_e.get('item')!r} needs per_credits above 0 (or a `by` row)")
    for _k, _v in (_ma.get("mult") or {}).items():
        if _k not in _WHERE or not (_num(_v) and _v > 0): errors.append(f"survival:rewards.materials.mult: {_k!r} is where a pick is made, a number above 0 (rules 1.55 item 24)")
    for _k, _v in (_rw54.get("weapon_card") or {}).items():
        if _k != "about" and (_k not in _WHERE or not (_num(_v) and 0 <= _v <= 1)): errors.append(f"survival:rewards.weapon_card: {_k!r} is where a pick is made, a chance from 0 to 1 (rules 1.55 item 21)")
if _sv54.get("drops") is not None:
    _dr, _lt = _sv54["drops"], {t.get("id") for t in items("loot_tables")}
    if _dr.get("provisional") is not True: errors.append("survival:drops: provisional: true")
    for _w, _rows in [("gun", _dr.get("gun") or [])] + [("by_table." + str(k), v) for k, v in (_dr.get("by_table") or {}).items()]:
        if _w.startswith("by_table.") and _w[9:] not in _lt: errors.append(f"survival:drops.{_w}: not a loot_tables.json table")
        for _e in _rows:
            _q = _e.get("qty")
            if _e.get("item") not in _rimap: errors.append(f"survival:drops.{_w}: {_e.get('item')!r} is not an items.json item")
            if not (isinstance(_q, list) and len(_q) == 2 and all(isinstance(x, int) and x >= 1 for x in _q) and _q[0] <= _q[1] <= (data.get("loot_tables") or {}).get("qty_max", 20)): errors.append(f"survival:drops.{_w}: {_e.get('item')!r} qty is a [min, max] range within the loot cap (qty_max)")
            if not (_e.get("chance") is None or (_num(_e["chance"]) and 0 < _e["chance"] <= 1)): errors.append(f"survival:drops.{_w}: {_e.get('item')!r} chance in (0, 1] (rules 1.55 item 26)")
    if "kind_table" in _dr and _dr["kind_table"] is not False: errors.append("survival:drops.kind_table: false or left out (rules 1.55 item 26)")
if not (isinstance((data.get("loot_tables") or {}).get("qty_max"), int) and data["loot_tables"]["qty_max"] >= 1): errors.append("loot_tables: qty_max, the most of one thing a loot entry gives (a whole number)")

# Leon 14 Nov 2026: an item a trait grants is not sold in the shop (stock: false, as the armourer's chit), unless it is food.
for _tr in items("traits"):
    for _gid in [e.get("item") for e in (_tr.get("effects") or []) if isinstance(e, dict) and e.get("op") == "start_item"]:
        _gi = _rimap.get(_gid)
        if _gi and _gi.get("category") != "food" and _gi.get("stock") is not False:
            errors.append(f"items:{_gid}: the trait {_tr.get('id')} grants it, so it is not sold (stock: false; food and drink are the exception)")
        # rules 1.55 item 55: never stocked and never sold are two facts; a granted item is neither bought nor sold
        if _gi and _gi.get("category") != "food" and _gi.get("sell") is not False:
            errors.append(f"items:{_gid}: the trait {_tr.get('id')} grants it, so no shop buys it either (sell: false; food and drink are the exception)")

# rules 1.55 items 55 and 58: `sell` is false or left out; a usable counted item (counts_into) says how it is used (an ITEM's `use`: label,
# via stim or effects) and what its user needs (`requires_to_use`: entries of holds, skill and min, or any_of, each
# with its refusal `why`).
# rules 1.61 addendum item 4766: the use ops (an item use runs them) are the effect_ops.json rows marked use_op
_USE_OPS = {o.get("id") for o in data["effect_ops"]["items"] if o.get("use_op")}
for _it in items("items"):
    _w = f"items:{_it.get('id')}"
    if "sell" in _it and _it["sell"] is not False: errors.append(f"{_w}: sell is false or left out (rules 1.55 item 55)")
    _u = _it.get("use")
    if _u is not None:
        if not (isinstance(_u, dict) and isinstance(_u.get("label"), str) and _u["label"].strip() and _u.get("via") in ("stim", "effects")):
            errors.append(f"{_w}: use is {{label, via: stim or effects}} (rules 1.55 item 58)")
        # rules 1.61 addendum item 4748: a pack item may have a use too (the field kit); `spend` is the pack units a use takes
        if isinstance(_u, dict) and "spend" in _u and not (isinstance(_u["spend"], int) and _u["spend"] >= 1): errors.append(f"{_w}: use.spend is a whole number >= 1 (rules 1.61 addendum)")
        if isinstance(_u, dict) and _u.get("via") == "effects" and not any(isinstance(e, dict) and e.get("op") in _USE_OPS for e in (_it.get("effects") or [])):
            errors.append(f"{_w}: use via effects needs an effect the use runs (an effect_ops.json use_op: {sorted(_USE_OPS)}; rules 1.55 item 58, rules 1.61 addendum)")
    # rules 1.61 addendum item 4748: `serves_as` lists the items this one stands in for (the toolbox for a field kit)
    if "serves_as" in _it and not (isinstance(_it["serves_as"], list) and all(isinstance(x, str) and x in _rimap and x != _it.get("id") for x in _it["serves_as"])):
        errors.append(f"{_w}: serves_as is a list of other items.json ids (rules 1.61 addendum)")
    for _e in (_it.get("effects") or []):
        if isinstance(_e, dict) and _e.get("op") == "xp_grant" and _u is not None and isinstance(_e.get("limit"), dict):
            if _e["limit"].get("per") not in ("per_scene", "per_session", "per_rest", "per_campaign") or not (isinstance(_e["limit"].get("n"), int) and _e["limit"]["n"] >= 1):
                errors.append(f"{_w}: xp_grant limit is {{per: a character's scope (per_scene, per_session, per_rest, per_campaign), n >= 1}}")
    def _req_ok(r):
        if not isinstance(r, dict): return False
        if "any_of" in r: return isinstance(r["any_of"], list) and bool(r["any_of"]) and all(_req_ok(x) for x in r["any_of"])
        if "holds" in r: return isinstance(r["holds"], dict) and (r["holds"].get("door") or r["holds"].get("item")) and r["holds"].get("slot", "hand") in ("hand", "person")
        return r.get("skill") in {k.get("id") for k in items("skills")} and isinstance(r.get("min"), int)
    for _r in (_it.get("requires_to_use") or []):
        if not (_req_ok(_r) and isinstance(_r.get("why"), str) and _r["why"].strip()):
            errors.append(f"{_w}: requires_to_use entries are holds {{slot, door or item}}, skill and min, or any_of, each with its refusal why (rules 1.55 item 58)")

# attributes.json's skills map is a copy of skills.json's attribute and slot: it must say the same (it went stale once, 4 slots).
for _a in data["attributes"]["items"]:
    _want = {k["slot"]: k["id"] for k in data["skills"]["items"] if k["attribute"] == _a["id"]}
    if _a.get("skills") != _want: errors.append(f"attributes.json {_a['id']}: skills {_a.get('skills')} is not what skills.json says ({_want})")

# Rules 1.56 (Balance 2.0), L4: variants (data/variants.json; packages/engine/src/variants.ts is the one loader). A
# variant is a base weapon or focus and one or two modifiers of the closed list of kinds. Refused: a third modifier, an
# unknown kind or form, a kind that does not fit the base, two of one kind, a total worth over worth_cap.
_vj = data.get("variants")
if _vj is not None:
    _wmap = {w["id"]: w for w in items("weapons")}
    _imap = {i["id"]: i for i in items("items")}
    _grades = [k for k, v in (data["rules"].get("rarity") or {}).items() if isinstance(v, dict)]
    _vgun = lambda w: bool(w) and w.get("magazine") is not None and bool(w.get("ammo")) and w.get("category") != "thrown"
    _vmelee = lambda w: bool(w) and w.get("category") != "unarmed" and ("melee" in str(w.get("category")) or (w.get("phys") or {}).get("system") == "melee")
    _vfits = {
        "guns": lambda b, w, i: _vgun(w), "magazine_guns": lambda b, w, i: _vgun(w) and w.get("reload") == "magazine",
        "heat_guns": lambda b, w, i: _vgun(w) and isinstance(w.get("heat_limit"), (int, float)), "recoil_guns": lambda b, w, i: _vgun(w) and (w.get("recoil") or 0) > 0,
        "melee": lambda b, w, i: _vmelee(w), "foci": lambda b, w, i: bool(i and i.get("focus")),
    }
    for _fid in [x["id"] for x in items("items") if x.get("focus")]: _vfits[_fid] = (lambda f: (lambda b, w, i: b == f))(_fid)
    _vfields = {"magazine", "range_tiles", "heat_limit", "recoil"}
    _vcap = _vj.get("worth_cap")
    if not isinstance(_vcap, (int, float)) or _vcap <= 0: errors.append("variants.json: worth_cap is a number over 0 (percent of a rifle-turn)")
    _vk = {}
    for _k in _vj.get("kinds") or []:
        _w = f"variants.json kind {_k.get('id')}"
        if _k.get("id") in _vk: errors.append(f"{_w}: a kind id is unique")
        _vk[_k.get("id")] = _k
        if not isinstance(_k.get("neutral", 0), (int, float)): errors.append(f"{_w}: neutral is a number")
        if not _k.get("forms"): errors.append(f"{_w}: a kind has at least one form")
        for _f in _k.get("forms") or []:
            _fw = f"{_w}/{_f.get('id')}"
            if not _f.get("fits") or not set(_f["fits"]) <= set(_vfits): errors.append(f"{_fw}: fits names what it goes on ({sorted(_vfits)})")
            if not isinstance(_f.get("worth_per"), (int, float)) or _f["worth_per"] < 0: errors.append(f"{_fw}: worth_per is a number, 0 or more")
            if not isinstance(_f.get("sentence"), str) or not _f["sentence"]: errors.append(f"{_fw}: a form has its sentence")
            elif re.search(r"\d", re.sub(r"\{[^}]*\}", " ", _f["sentence"])): errors.append(f"{_fw}: a sentence has no typed number (its numbers are {{value}} placeholders)")
            if "field" in _f:
                if _f["field"] not in _vfields: errors.append(f"{_fw}: a field kind changes one of {sorted(_vfields)}")
                if _f.get("sign") not in (1, -1): errors.append(f"{_fw}: a field kind's sign is 1 or -1")
                if _f.get("effects"): errors.append(f"{_fw}: a form is a field or effects, not both")
            else:
                if not _f.get("effects"): errors.append(f"{_fw}: a form changes a field or has effects")
                for _ei, _e in enumerate(_f.get("effects") or []):
                    if _e.get("op") not in OPS: errors.append(f"{_fw} effect {_ei}: unknown op {_e.get('op')}")
                    if isinstance(_e.get("when"), str):
                        check_trigger_effect(_e, f"{_fw} effect {_ei}")
                        if (_e.get("if") or {}).get("with_this") is not True: errors.append(f"{_fw} effect {_ei}: a variant's modifier works only with its instance: if.with_this true")
                    elif _e.get("op") == "stat_mod" and not declared_stat(_e.get("stat")): errors.append(f"{_fw} effect {_ei}: stat '{_e.get('stat')}' is not declared (effects/stats.ts)")
                for _pp in _f.get("puts") or []:
                    _n = {"effects": _f.get("effects") or []}
                    try:
                        for _part in _pp.split("."): _n = _n[int(_part)] if isinstance(_n, list) else _n[_part]
                        if not isinstance(_n, (int, float)): raise KeyError(_pp)
                    except Exception: errors.append(f"{_fw}: puts names a number in its effects ({_pp})")
            if "value_fixed" in _f and not isinstance(_f["value_fixed"], (int, float)): errors.append(f"{_fw}: value_fixed is a number")
    _vseen = set()
    for _v in _vj.get("items") or []:
        _w = f"variants.json {_v.get('id')}"
        if _v.get("id") in _vseen or _v.get("id") in _wmap or _v.get("id") in _imap: errors.append(f"{_w}: a variant's id is its own (no other variant, weapon or item has it)")
        _vseen.add(_v.get("id"))
        _b = _v.get("base"); _bw, _bi = _wmap.get(_b), _imap.get(_b)
        if not (_bw or (_bi and _bi.get("focus"))): errors.append(f"{_w}: base '{_b}' is a weapon or a focus"); continue
        if not isinstance(_v.get("name"), str) or not _v["name"] or re.search(r"\d", _v["name"]): errors.append(f"{_w}: a variant has a name, with no number in it")
        if _v.get("rarity", "standard") not in _grades: errors.append(f"{_w}: rarity is one of {_grades}")
        _ms = _v.get("mods") or []
        if not 1 <= len(_ms) <= 2: errors.append(f"{_w}: a variant has one or two modifiers, never {len(_ms)}")
        if len({m.get("kind") for m in _ms}) != len(_ms): errors.append(f"{_w}: two modifiers of one kind")
        _worth = 0
        _row = dict(_bw or _bi)
        for _m in _ms:
            _k = _vk.get(_m.get("kind"))
            if not _k: errors.append(f"{_w}: unknown kind '{_m.get('kind')}' ({sorted(_vk)})"); continue
            _forms = _k.get("forms") or []
            _f = next((x for x in _forms if x.get("id") == (_m.get("form") or (_forms[0].get("id") if _forms else None))), None)
            if not _f: errors.append(f"{_w}: kind {_k['id']} has no form '{_m.get('form')}'"); continue
            if not any(_vfits[x](_b, _bw, _bi) for x in _f.get("fits") or [] if x in _vfits): errors.append(f"{_w}: {_k['id']} does not fit {_b} (it fits {_f.get('fits')})")
            _val = _f.get("value_fixed", _m.get("value"))
            if not isinstance(_val, (int, float)) or isinstance(_val, bool): errors.append(f"{_w}: {_k['id']} needs a numeric value"); continue
            if "value_fixed" in _f and "value" in _m: errors.append(f"{_w}: {_k['id']} has a fixed value: the line gives none")
            if _val == _k.get("neutral", 0): errors.append(f"{_w}: {_k['id']} at its neutral value changes nothing")
            _worth += abs(_val - _k.get("neutral", 0)) * _f.get("worth_per", 0)
            if "field" in _f:
                if not isinstance(_row.get(_f["field"]), (int, float)): errors.append(f"{_w}: {_k['id']} changes {_f['field']}, which {_b} does not have as a number")
                else:
                    _row[_f["field"]] = _row[_f["field"]] + _f.get("sign", 1) * _val
                    if _row[_f["field"]] < 0: errors.append(f"{_w}: {_k['id']} takes {_f['field']} under 0")
        if isinstance(_vcap, (int, float)) and _worth > _vcap + 1e-9: errors.append(f"{_w}: worth {round(_worth, 2)} is over worth_cap {_vcap}")

# Rules 1.56 (Balance 2.0), Bonds 2.0 slice 1 (spec item 4246): tending.json `bond` is what the Bond card shows
# (screenViews.ts bondView); each number is a copy of an effect value of tend.threads or tend.bond, and those items'
# `numbers` (their texts read them) are copies too. Every copy must equal the value the engine runs.
def _tend_bond_check():
    T = data.get("tending") if isinstance(data.get("tending"), dict) else None
    if not T: return
    B, its = T.get("bond") or {}, {x.get("id"): x for x in T.get("items") or []}
    th, bd = its.get("tend.threads") or {}, its.get("tend.bond") or {}
    def one(effs, pred):
        xs = [e for e in effs or [] if isinstance(e, dict) and pred(e)]
        return xs[0] if xs else {}
    the = th.get("effects") or []
    src = {"share": one(the, lambda e: e.get("op") == "redirect").get("share"),
           "hit": one(the, lambda e: e.get("op") == "roll_mod" and e.get("when") == "to_hit").get("value"),
           "echo": next((p.get("value") for p in ((th.get("amounts") or {}).get("echo") or {}).get("per") or [] if p.get("of") == "event:amount"), None),
           "boss_rounds": one(the, lambda e: e.get("op") == "cond_rounds").get("max")}
    dm = one(the, lambda e: e.get("op") == "damage_mult" and isinstance(e.get("value"), dict)).get("value") or {}
    src["per_bond"] = next((p.get("value") for p in dm.get("per") or [] if p.get("of") == "ties:bond"), None)
    thr = [e.get("value") for e in the if e.get("op") == "mend_mult"]
    if len(set(map(str, thr))) > 1: errors.append(f"tending.json tend.threads: the through multipliers differ ({thr})")
    src["through"] = thr[0] if thr else None
    dn = one(the, lambda e: e.get("op") == "resource" and e.get("when") == "downed").get("value")
    src["down_mp"] = -dn if isinstance(dn, (int, float)) else None
    for tier, k in (("elite", "save_elite"), ("boss", "save_boss")):
        src[k] = one(the, lambda e, t=tier: e.get("op") == "roll_mod" and e.get("when") == "cond_incoming" and (e.get("if") or {}).get("target_tier") == [t]).get("value")
    g = one(bd.get("effects"), lambda e: e.get("op") == "grant_action")
    tl = (g.get("reach") or {}).get("tiles") or {}
    st = (tl.get("steps") or [{}])[0]
    src["make_range"], src["far_at"] = tl.get("base"), st.get("at")
    src["make_range_far"] = (tl.get("base") or 0) + (st.get("value") or 0)
    src["boss_gap"] = (one(g.get("effects"), lambda e: e.get("op") == "condition" and (e.get("if") or {}).get("target_tier") == ["boss"]).get("limit") or {}).get("cooldown")
    for k, v in B.items():
        if k in ("provisional", "about"): continue
        if k not in src: errors.append(f"tending.json bond.{k}: no effect value is known for it (add it to tools/validate.py _tend_bond_check)"); continue
        if src[k] != v: errors.append(f"tending.json bond.{k} is {v}, but the effect the engine runs says {src[k]}")
    for it in (th, bd):
        for k, v in (it.get("numbers") or {}).items():
            if k in src and src[k] != v: errors.append(f"tending.json {it.get('id')} numbers.{k} is {v}, but the effect the engine runs says {src[k]}")
_tend_bond_check()

# Rules 1.56 (the alpha perks, spec item 4208): a number block's step that reads a target's Pressure (`target:pressure`)
# names one of the thresholds of techniques.json rules.pressure (pressed, suppressed, broken), and Pressure Point
# (perks.json both_hands) steps at exactly Pressed and then Suppressed: one source for what "Pressed" means.
def _pressure_steps_check():
    T = data.get("techniques") if isinstance(data.get("techniques"), dict) else {}
    P = ((T.get("rules") or {}).get("pressure")) or {}
    named = {k: P.get(k) for k in ("pressed", "suppressed", "broken") if isinstance(P.get(k), (int, float))}
    if not named:
        errors.append("techniques.json rules.pressure: no pressed / suppressed / broken thresholds (Pressure Point reads them)"); return
    def steps_in(o):
        if isinstance(o, dict):
            if isinstance(o.get("steps"), list):
                for st in o["steps"]:
                    if isinstance(st, dict) and st.get("of") == "target:pressure": yield st
            for v in o.values(): yield from steps_in(v)
        elif isinstance(o, list):
            for v in o: yield from steps_in(v)
    for n in ("perks", "traits"):
        for it in items(n):
            for st in steps_in(it):
                if st.get("at") not in named.values():
                    errors.append(f"{n}:{it.get('id')}: a step on target:pressure at {st.get('at')} is none of techniques.json rules.pressure's thresholds {named}")
    bh = next((x for x in items("perks") if x.get("id") == "both_hands"), None)
    if not bh: return
    for tier, blk in [("", bh)] + list((bh.get("tiers") or {}).items()):
        for e in blk.get("effects") or []:
            v = e.get("value") if isinstance(e.get("value"), dict) else {}
            ats = [s.get("at") for s in v.get("steps") or [] if isinstance(s, dict) and s.get("of") == "target:pressure"]
            want = [named.get("pressed"), named.get("suppressed")][:len(ats)]
            if ats and ats != want: errors.append(f"perks:both_hands{('@' + tier) if tier else ''}: Pressure Point steps at {ats}, but techniques.json rules.pressure's pressed / suppressed are {want}")
_pressure_steps_check()

# ---------- rules 1.60 slice C (Doors 3.0, the forks: N1, N2) ----------
# data/forks.json: one row per fork option, a door verb held only by a sheet that picked it (`requires: [{door_pick:
# <its own id>}]`). Each alpha skill names its two steps in skills.json `forks` ([{id, at, of: [two option ids]}]) at 4
# and 6 points, and `fork_runs_on` (the door's own resource, words). A shelved row is not built: no effects, `waits_for`
# (the primitives it waits on; may be empty when it waits on its step's other option) and `why`. A number a fork changes
# in another row (Slam's reach, Snap's price) is bound here, so the fork's text and the row it changes say one number.
_FK = data.get("forks") if isinstance(data.get("forks"), dict) else None
if _FK is not None:
    _rows = {x.get("id"): x for x in _FK.get("items") or [] if isinstance(x, dict)}
    _alpha = {s.get("id"): s for s in items("skills") if s.get("slot") == "alpha"}
    _named = {}
    for _sid, _s in _alpha.items():
        _fs = _s.get("forks")
        if _fs is None: continue
        _w = f"skills:{_sid}.forks"
        if not (isinstance(_fs, list) and [f.get("at") for f in _fs if isinstance(f, dict)] == [4, 6]): errors.append(f"{_w}: two steps, at 4 and 6 ({{id, at, of}}: rules 1.60)"); continue
        if not isinstance(_s.get("fork_runs_on"), str) or not _s["fork_runs_on"]: errors.append(f"skills:{_sid}: fork_runs_on names the door's own resource (words)")
        for _f in _fs:
            if not (isinstance(_f.get("of"), list) and len(_f["of"]) == 2): errors.append(f"{_w}.{_f.get('id')}: two options"); continue
            for _o in _f["of"]:
                _r = _rows.get(_o)
                if not _r: errors.append(f"{_w}.{_f.get('id')}: '{_o}' is no forks.json row"); continue
                if _o in _named: errors.append(f"{_w}: '{_o}' is in two steps")
                _named[_o] = (_sid, _f.get("at"))
                if _r.get("door") != _sid or _r.get("step") != _f.get("at"): errors.append(f"forks:{_o}: its door and step are {_sid} and {_f.get('at')} (skills.json forks)")
            if str(_f.get("at")) not in (_s.get("unlocks") or {}): errors.append(f"skills:{_sid}.unlocks: a row at {_f.get('at')} says the fork (its text is the choice)")
    for _id, _r in _rows.items():
        _w = f"forks:{_id}"
        if _id not in _named: errors.append(f"{_w}: no alpha skill's `forks` names it")
        if _r.get("requires") != [{"door_pick": _id}]: errors.append(f"{_w}: requires is [{{door_pick: '{_id}'}}] (held only once picked)")
        if _r.get("adjudication") != "engine" or _r.get("provisional") is not True: errors.append(f"{_w}: adjudication engine, provisional true")
        if _r.get("icon") != _id or not _id.startswith("fork."): errors.append(f"{_w}: its id and icon are fork.<door>.<name>, the same (art/briefs/ART-REQUESTS.md)")
        if _r.get("shelved"):
            if _r.get("effects"): errors.append(f"{_w}: a shelved row has no effects (it is not built)")
            if not isinstance(_r.get("waits_for"), list) or not all(isinstance(x, str) and re.match(r"^N\d+b?$", x) for x in _r["waits_for"]): errors.append(f"{_w}: waits_for lists the primitives it waits on (N12…), or none")
            if not isinstance(_r.get("why"), str) or not _r["why"]: errors.append(f"{_w}: a shelved row says why")
    # every door_pick / no_door_pick names a fork option; a built option with no effects of its own is read somewhere
    _picks_read = set()
    def _walk_picks(o, w):
        if isinstance(o, dict):
            c = o.get("if") if isinstance(o.get("if"), dict) else {}
            for k in ("door_pick", "no_door_pick"):
                for v in ([c[k]] if isinstance(c.get(k), str) else c.get(k) or []):
                    if v not in _rows: errors.append(f"{w}: `if.{k}` names '{v}', no forks.json row")
                    elif _rows[v].get("shelved"): errors.append(f"{w}: `if.{k}` names '{v}', a shelved fork")
                    _picks_read.add(v)
                    # a row a fork changes says the fork's numbers: within, rounds, tiles (one number, two places)
                    if k == "door_pick":
                        _n = _rows.get(v, {}).get("numbers") or {}
                        for f, have in (("within", (o.get("targets") or {}).get("within")), ("rounds", o.get("rounds")), ("tiles", o.get("tiles"))):
                            if f in _n and have is not None and have != _n[f]: errors.append(f"{w}: its {f} is {have}, but forks:{v} numbers.{f} is {_n[f]}")
            for x in o.values(): _walk_picks(x, w)
        elif isinstance(o, list):
            for x in o: _walk_picks(x, w)
    for _fn, _blk in data.items():
        if _fn in ("effect_ops",): continue
        _walk_picks(_blk, _fn)
    for _id, _r in _rows.items():
        if not _r.get("shelved") and not _r.get("effects") and _id not in _picks_read: errors.append(f"forks:{_id}: a built option with no effects of its own must be read by a row (door_pick)")
    # numbers a fork shares with the row it changes (one copy: held equal)
    def _fe(i, n=0):
        return ((_rows.get(i) or {}).get("effects") or [{}] * (n + 1))[n] if len((_rows.get(i) or {}).get("effects") or []) > n else {}
    _tend = {x.get("id"): x for x in (data.get("tending") or {}).get("items") or []}
    for _need in ("fork.tend.keep_the_thread", "fork.tend.short_thread", "fork.tend.shared_pulse", "fork.shadow.spotter", "fork.guard.cover_them"):
        if _need not in _rows: errors.append(f"forks: the held-equal check names '{_need}', no forks.json row (rename the check with the row)")
    _tug = ((((_tend.get("tend.tug") or {}).get("effects") or [{}])[0]).get("res") or {}).get("mp")
    if "fork.tend.keep_the_thread" in _rows and not _rows["fork.tend.keep_the_thread"].get("shelved") and _fe("fork.tend.keep_the_thread").get("value") != _tug: errors.append(f"forks:fork.tend.keep_the_thread: the kept Snap's MP is Tug's price ({_tug}), one number")
    _st = _rows.get("fork.tend.short_thread") or {}
    if _st and not _st.get("shelved"):
        _thr = ((data.get("tending") or {}).get("bond") or {}).get("through")
        _nn = _st.get("numbers") or {}
        if _nn.get("through") != _thr: errors.append(f"forks:fork.tend.short_thread: numbers.through is tending.json bond.through ({_thr})")
        for _e in _st.get("effects") or []:
            if _e.get("op") == "mend_mult" and abs(_e.get("value", 0) - round(_nn.get("near", 0) / (_thr or 1), 4)) > 1e-9: errors.append(f"forks:fork.tend.short_thread: a mend_mult is near / through ({round(_nn.get('near', 0) / (_thr or 1), 4)})")
    _sp = _rows.get("fork.tend.shared_pulse") or {}
    if _sp and not _sp.get("shelved"):
        _hb = (((_tend.get("tend.mend") or {}).get("amounts") or {}).get("heal") or {}).get("base")
        _pb = ((_sp.get("amounts") or {}).get("pulse") or {}).get("base")
        if _hb is None or _pb is None or abs(_pb - _hb * (_sp.get("numbers") or {}).get("share", 0)) > 1e-9: errors.append(f"forks:fork.tend.shared_pulse: amounts.pulse.base is Mend's heal base × numbers.share ({_hb} × {(_sp.get('numbers') or {}).get('share')})")
    _sp = _rows.get("fork.shadow.spotter") or {}
    if _sp and not _sp.get("shelved"):
        _ab = ((data.get("rules") or {}).get("shadow") or {}).get("ambush_bonus")
        if _ab is None or abs(_fe("fork.shadow.spotter").get("value", 0) - (1 + _ab)) > 1e-9: errors.append(f"forks:fork.shadow.spotter: the ambush is 1 + rules.json shadow.ambush_bonus ({_ab})")
    _ct = _rows.get("fork.guard.cover_them") or {}
    if _ct and not _ct.get("shelved"):
        _ic = (((data.get("techniques") or {}).get("rules") or {}).get("guard") or {}).get("interpose_cost")
        if ((_fe("fork.guard.cover_them").get("and") or [{}])[0]).get("value") != -(_ic or 0): errors.append(f"forks:fork.guard.cover_them: its Guard is techniques.json rules.guard.interpose_cost ({_ic})")


# No rule references or dev words in player text (rules 1.68 item 5406; CLAUDE.md "Player text never explains a formula").
# Player-facing: these fields of these files. Designer-facing (exempt): note, source, rules, about, *_note, *_about, the
# `pending` and `retired` lists, and a shelved row (status shelved, or shelved: true).
PLAYER_FILES = ["skills", "perks", "traits", "classes", "techniques", "shadow", "tending", "figments", "forks", "calls",
                "patrons", "items", "weapons", "conditions", "survival", "actions", "pressure"]
PLAYER_FIELDS = {"text", "player", "short", "door_line", "summary", "why", "say", "label"}
DEV_WORDS = re.compile(r"rules \d|items? \d{4}|\(a later step\)|beta feed")
def _player_text(o, where, shelved=False):
    if isinstance(o, dict):
        shelved = shelved or o.get("shelved") is True or o.get("status") == "shelved"
        for k, v in o.items():
            if k in ("pending", "retired", "note", "source", "rules", "about") or k.endswith("_note") or k.endswith("_about"): continue
            if isinstance(v, str):
                if k in PLAYER_FIELDS and not shelved:
                    m = DEV_WORDS.search(v)
                    if m: errors.append(f"{where}.{k}: player text names {m.group(0)!r} (a rule reference or a dev word; write it as a card line): {v[:70]}")
            else: _player_text(v, f"{where}.{k}", shelved)
    elif isinstance(o, list):
        for i, v in enumerate(o): _player_text(v, f"{where}[{i}]", shelved)
for _pf in PLAYER_FILES:
    if _pf in data: _player_text(data[_pf], _pf)

# The text-number guard (tools/text_numbers.py): a number in a player-facing text must be a number in the item's own fields.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import text_numbers
check_doors(data, errors)
TEXT_NUMBERS = text_numbers.check(data, errors, sys.argv[2:])

print("files:", ", ".join(f"{k}({len(items(k)) if k not in ('classes','rules') else ''})" for k in data))
print(f"base classes {len(base)}, advanced {len(adv)} (shelved {sum(1 for a in adv if a.get('shelved'))}), move pool {len(pool)}")
print(TEXT_NUMBERS)
print(f"\n{len(errors)} errors")
for e in errors[:80]:
    print("  ERR", e)
print(f"{len(warns)} warnings")
for w in warns:
    print("  WARN", w)
sys.exit(1 if errors else 0)
