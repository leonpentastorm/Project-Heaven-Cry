#!/usr/bin/env python3
"""The spec's tables against the data pack: weapons, enemy tiers and levels, conditions.

    python3 tools/check_spec_tables.py            compare; exit 1 on a difference that is not on the known list
    python3 tools/check_spec_tables.py --list     print every difference, known or not
    python3 tools/check_spec_tables.py --prune    drop the known rows that no longer differ (the list only shrinks)

The spec (docs/rules/PHC-Core-Rules-v1.0.md) is the source of truth: when a row differs, the data is the bug, unless a
later "Rules revision" moved the number and the table was not folded, in which case the table gets the house note
("19 (rules 1.18; was 15)": the CURRENT value first). This tool never decides which: it prints the row.

A cell is read by its FIRST number, so a note after it is free text. What is compared:

  weapons     the Starter weapons table and every roster table of "Weapons, version 2" section 7 (7.1 to 7.11), by
              name: damage (a shotgun's two bands; a bow's base and slope), range or reach, magazine, heat limit,
              weight, price, hands. A weapon in data that no table lists is a difference. A spec row with no weapon
              in data is a difference.
  enemies     "Tiers at level 1" (all eight columns) and "What a level adds" (all five), against enemies.json.
  conditions  the Conditions table: the name exists in conditions.json, the family, and the rounds or turns in "Lasts".

Known differences wait for a ruling in tools/spec_tables_known.json: {"key": "why"}. A new difference fails; so does a
known one that no longer differs (run --prune). Wired into `npm run check` (tools/check.py, "spec tables").
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs/rules/PHC-Core-Rules-v1.0.md"
KNOWN = ROOT / "tools/spec_tables_known.json"
LINES = SPEC.read_text(encoding="utf8").split("\n")
load = lambda f: json.loads((ROOT / "data" / f).read_text(encoding="utf8"))

def tables():
    """Every markdown table: (first line number, header cells, [(line number, cells)])."""
    out, i = [], 0
    cells = lambda l: [c.strip() for c in l.strip().strip("|").split("|")]
    while i < len(LINES):
        if LINES[i].startswith("|") and i + 1 < len(LINES) and re.match(r"^\|[\s:|-]+\|?\s*$", LINES[i + 1]):
            head, rows, j = cells(LINES[i]), [], i + 2
            while j < len(LINES) and LINES[j].startswith("|"):
                rows.append((j + 1, cells(LINES[j]))); j += 1
            out.append((i + 1, head, rows)); i = j
        else:
            i += 1
    return out

TABLES = tables()
NUM = re.compile(r"[-+−]?\d[\d,]*(?:\.\d+)?")
def nums(cell):
    return [float(m.replace(",", "").replace("−", "-")) for m in NUM.findall(re.sub(r"[×*_~]", " ", cell))]
def first(cell):
    n = nums(cell); return n[0] if n else None
norm = lambda s: re.sub(r"[^a-z0-9]+", " ", re.sub(r"\(.*?\)", "", s.replace("✓", "")).lower()).strip()
CELLS = [0]  # how many number cells were compared (printed, so a table that stops parsing is seen)
def same(a, b):
    CELLS[0] += 1
    return a is not None and b is not None and abs(float(a) - float(b)) < 1e-9
diffs = []  # (key, message)
def diff(key, line, msg): diffs.append((key, f"spec line {line}: {msg}"))

# ---------------------------------------------------------------------------------------------------- weapons
def section(start_pat, end_pat):
    a = next((i for i, l in enumerate(LINES) if re.search(start_pat, l)), None)
    b = next((i for i, l in enumerate(LINES) if a is not None and i > a and re.search(end_pat, l)), len(LINES))
    return (a + 1, b + 1) if a is not None else (0, 0)

def check_weapons():
    weapons = load("weapons.json")["items"]
    by = {norm(w["name"]): w for w in weapons}
    def find(name):
        n = norm(name)
        if n in by: return by[n]
        hit = [w for k, w in by.items() if k.startswith(n) or n.startswith(k) or n in k]
        return hit[0] if len(hit) == 1 else None
    lo, hi = section(r"^#### 7\. The roster", r"^##### 7\.12 |^#### 8\. ")
    seen = set()
    COL = {"dmg": "damage", "damage": "damage", "range": "range_tiles", "reach": "range_tiles", "mag": "magazine", "magazine": "magazine",
           "heat": "heat_limit", "heat limit": "heat_limit", "kg": "weight_kg", "weight": "weight_kg", "price": "price_credits", "hands": "hands"}
    for line, head, rows in TABLES:
        starter = head[:3] == ["Weapon", "Type", "Damage"]
        if not (starter or (lo <= line < hi and head[0] == "Type")): continue
        cols = [COL.get(re.sub(r"\s*\(.*", "", h).strip().lower()) for h in head]
        for ln, cells in rows:
            w = find(cells[0])
            if not w:
                diff(f"weapon:{norm(cells[0])}:missing-in-data", ln, f"'{cells[0]}' is in the spec's table and not in weapons.json"); continue
            seen.add(w["id"])
            for field, cell in zip(cols, cells):
                if not field or field not in w: continue
                dv, n = w[field], nums(cell)
                key = f"weapon:{w['id']}:{field}"
                if field == "hands":
                    if cell and cell.split()[0] != dv: diff(key, ln, f"{w['name']}: hands {cell} in the spec, {dv} in data")
                elif field == "damage" and isinstance(dv, dict):  # a shotgun's two bands: "40 / 25" or "40 within 4 tiles, 25 within 8"
                    want = [dv.get("within_4"), dv.get("within_8")]
                    if not (n and same(n[0], want[0]) and any(same(x, want[1]) for x in n[1:])): diff(key, ln, f"{w['name']}: damage '{cell}' in the spec, {want[0]} / {want[1]} in data")
                elif field == "damage" and isinstance(dv, str):  # a bow: "20 + 5*raw_power"
                    if n[:2] != nums(dv)[:2]: diff(key, ln, f"{w['name']}: damage '{cell}' in the spec, '{dv}' in data")
                elif not n:  # "none", "throwing range", a thrown weapon's effect in words
                    if isinstance(dv, (int, float)) and dv and field in ("magazine", "heat_limit") and cell.lower() not in ("none", ""): diff(key, ln, f"{w['name']}: {field} '{cell}' in the spec, {dv} in data")
                elif field == "damage" and not dv:  # a thrown weapon with no damage: the cell is its effect in words
                    pass
                elif field == "damage" and "Effect" in head:  # thrown: the effect cell leads with the damage
                    if not same(n[0], dv): diff(key, ln, f"{w['name']}: damage '{cell}' in the spec, {dv} in data")
                elif isinstance(dv, (int, float)):
                    if not same(n[0], dv): diff(key, ln, f"{w['name']}: {field} {cell!r} in the spec, {dv} in data")
                elif dv is None and field in ("magazine", "heat_limit"):
                    diff(key, ln, f"{w['name']}: {field} {cell!r} in the spec, none in data")
    for w in weapons:
        if w["id"] not in seen: diff(f"weapon:{w['id']}:missing-in-spec", lo, f"{w['name']} ({w['id']}) is in weapons.json and in no weapon table of the spec")

# ---------------------------------------------------------------------------------------------------- enemies
def check_enemies():
    e = load("enemies.json")
    tiers = {t["name"].lower(): t for t in e["items"]}
    COL = {"hp": "hp", "armour": "armour", "defense": "defense", "attack bonus": "attack_bonus", "damage factor": "damage", "movement": "movement", "endurance": "endurance", "spare magazines": "spare_mags"}
    t = next((x for x in TABLES if x[1][:2] == ["Tier", "HP"] and "Damage factor" in x[1]), None)
    if not t: diff("enemy:tier-table", 0, "the 'Tiers at level 1' table was not found"); return
    for ln, cells in t[2]:
        d = tiers.get(cells[0].lower())
        if not d: diff(f"enemy:{cells[0].lower()}:missing-in-data", ln, f"tier '{cells[0]}' is not in enemies.json"); continue
        for h, cell in zip(t[1], cells):
            f = COL.get(h.lower())
            if f and not same(first(cell), d.get(f)): diff(f"enemy:{d['id']}:{f}", ln, f"{d['name']}: {h} {cell!r} in the spec, {d.get(f)} in data")
    for name, d in tiers.items():
        if name not in [c[0].lower() for _, c in t[2]]: diff(f"enemy:{d['id']}:missing-in-spec", t[0], f"tier {d['name']} is in enemies.json and not in the table")
    LCOL = {"hp": "hp_mult", "armour": "armour_mult", "defense": "defense_plus", "attack bonus": "attack_plus", "damage": "damage_mult"}
    lt = next((x for x in TABLES if x[1] == ["Level", "HP", "Armour", "Defense", "Attack bonus", "Damage"]), None)
    if not lt: diff("enemy:level-table", 0, "the 'What a level adds' table was not found"); return
    rows = {int(r["level"]): r for r in e["levels"]["table"]}
    for ln, cells in lt[2]:
        lv = int(first(cells[0])); d = rows.get(lv)
        if not d: diff(f"enemy-level:{lv}:missing-in-data", ln, f"level {lv} is not in enemies.json levels.table"); continue
        for h, cell in zip(lt[1], cells):
            f = LCOL.get(h.lower())
            if f and not same(first(cell), d.get(f)): diff(f"enemy-level:{lv}:{f}", ln, f"level {lv}: {h} {cell!r} in the spec, {d.get(f)} in data")
    for lv in rows:
        if lv not in [int(first(c[0])) for _, c in lt[2]]: diff(f"enemy-level:{lv}:missing-in-spec", lt[0], f"level {lv} is in enemies.json and not in the table")

# ------------------------------------------------------------------------------------------------- conditions
def check_conditions():
    conds = load("conditions.json")["items"]
    by = {norm(c["name"]): c for c in conds}
    t = next((x for x in TABLES if x[1] == ["Condition", "Family", "Effect", "Lasts"]), None)
    if not t: diff("condition:table", 0, "the Conditions table was not found"); return
    seen = set()
    for ln, cells in t[2]:
        c = by.get(norm(cells[0]))
        if not c: diff(f"condition:{norm(cells[0])}:missing-in-data", ln, f"'{cells[0]}' is in the spec's table and not in conditions.json"); continue
        seen.add(c["id"])
        if (c.get("family") or "").lower() != cells[1].lower(): diff(f"condition:{c['id']}:family", ln, f"{c['name']}: family {cells[1]} in the spec, {c.get('family')} in data")
        dur, m = c.get("duration") or {}, re.match(r"\s*(\d+) (round|turn)", cells[3])
        dn = dur.get("rounds") if dur.get("rounds") is not None else dur.get("turns")
        if m and not same(float(m.group(1)), dn): diff(f"condition:{c['id']}:lasts", ln, f"{c['name']}: lasts {cells[3]!r} in the spec, {dur} in data")
        if not m and dn is not None: diff(f"condition:{c['id']}:lasts", ln, f"{c['name']}: lasts {cells[3]!r} in the spec, {dur} in data")
    for c in conds:  # every debuff has a row; states are listed under "Helpful states" and in their own sections
        if c.get("kind") == "debuff" and c["id"] not in seen: diff(f"condition:{c['id']}:missing-in-spec", t[0], f"{c['name']} ({c['id']}) is a debuff in conditions.json with no row in the Conditions table")

check_weapons(); check_enemies(); check_conditions()
known = json.loads(KNOWN.read_text(encoding="utf8")) if KNOWN.exists() else {}
keys = {k for k, _ in diffs}
if "--prune" in sys.argv:
    kept = {k: v for k, v in known.items() if k in keys}
    KNOWN.write_text(json.dumps(kept, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(f"spec tables: {len(known) - len(kept)} known rows dropped, {len(kept)} kept"); known = kept
new = [(k, m) for k, m in diffs if k not in known]
gone = [k for k in known if k not in keys]
if "--list" in sys.argv:
    for k, m in diffs: print(("known  " if k in known else "NEW    ") + k + "\n         " + m)
for k, m in new: print(f"error: {k}: {m}")
for k in gone: print(f"error: {k}: on the known list and no longer differs (run: python3 tools/check_spec_tables.py --prune)")
if CELLS[0] < 400: print(f"error: only {CELLS[0]} cells were compared (about 480 expected): a table's header changed and it is no longer read"); new.append(("cells", ""))
print(f"spec tables: {len(new) + len(gone)} errors ({CELLS[0]} cells compared, {len(diffs)} differences, {len(known)} known and waiting for a ruling)")
sys.exit(1 if new or gone else 0)
