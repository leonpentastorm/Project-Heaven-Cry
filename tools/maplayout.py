"""Maps (rules 1.16): read a map drawn as rows of characters, the same way the engine does
(packages/engine/src/maplayout.ts). Used by validate.py and render_map_guides.py.

A zone may carry "layout": a list of rows (one string per row, one character per tile), or the name of a
layout in data/maps.json ("open_ground"). `.` open, `#` solid, `~` difficult, `S` a squad start, `E` an enemy
start; any other character is an object from the legend (data/maps.json "legend", then the layout's, then the zone's).
"""
import json, pathlib, copy

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def load_maps(data_root):
    return json.loads((pathlib.Path(data_root) / "maps.json").read_text())


def ref(x, y):
    return LETTERS[x] + str(y + 1)


def size_problem(maps, w, h):
    lim = maps["limits"]
    ok = lambda n: isinstance(n, int) and not isinstance(n, bool) and lim["min"] <= n <= lim["max"]
    if ok(w) and ok(h):
        return None
    return f"a map is {lim['min']} to {lim['max']} tiles wide and {lim['min']} to {lim['max']} tall (this one is {w} x {h})"


def read_layout(maps, rows, w, h, legend=None):
    """-> (parts, errors); parts has solid, difficult, start, enemyStart (grid references) and objects."""
    out = {"solid": [], "difficult": [], "start": [], "enemyStart": [], "objects": []}
    errs = []
    if not isinstance(rows, list) or not all(isinstance(r, str) for r in rows):
        return out, ["the layout must be a list of rows of characters"]
    if len(rows) != h:
        errs.append(f"the layout has {len(rows)} rows but the map is {h} tall")
    L = dict(maps.get("legend") or {})
    L.update(legend or {})
    S, E, unknown = [], [], set()
    for y, row in enumerate(rows[:h] if isinstance(h, int) else rows):
        if len(row) != w:
            errs.append(f"layout row {y + 1} has {len(row)} characters but the map is {w} wide")
        for x, ch in enumerate(row[:w]):
            if ch in ". ":
                continue
            if ch == "#":
                out["solid"].append(ref(x, y))
            elif ch == "~":
                out["difficult"].append(ref(x, y))
            elif ch == "S":
                S.append((x, y))
            elif ch == "E":
                E.append((x, y))
            elif isinstance(L.get(ch), dict) and isinstance(L[ch].get("kind"), str):
                o = copy.deepcopy(L[ch])
                o["at"] = ref(x, y)
                out["objects"].append(o)
            else:
                unknown.add(ch)
    for ch in sorted(unknown):
        errs.append(f'the layout uses "{ch}" but the legend does not say what it is')

    def centre_first(ts):
        if not ts:
            return []
        cx = sum(t[0] for t in ts) / len(ts)
        cy = sum(t[1] for t in ts) / len(ts)
        order = sorted(range(len(ts)), key=lambda i: ((ts[i][0] - cx) ** 2 + (ts[i][1] - cy) ** 2, i))
        return [ref(*ts[i]) for i in order]

    out["start"], out["enemyStart"] = centre_first(S), centre_first(E)
    return out, errs


def expand_zone(maps, z):
    """A zone with its layout turned into the plain lists -> (zone, errors). A zone without one comes back as it is."""
    if not isinstance(z, dict) or z.get("layout") is None:
        return z, []
    lay = z["layout"]
    named = (maps.get("layouts") or {}).get(lay) if isinstance(lay, str) else None
    rest = {k: v for k, v in z.items() if k not in ("layout", "legend")}
    if isinstance(lay, str) and named is None:
        return rest, [f'unknown layout "{lay}"']
    rows = named["rows"] if named else lay
    legend = dict((named or {}).get("legend") or {})
    legend.update(z.get("legend") or {})
    parts, errs = read_layout(maps, rows, z.get("w"), z.get("h"), legend)
    for k in ("solid", "difficult", "start"):
        both = list(z.get(k) or []) + parts[k]
        if both or k == "start":
            rest[k] = both
    es = list(z.get("enemyStart") or []) + parts["enemyStart"]
    if es:
        rest["enemyStart"] = es
    rest["objects"] = parts["objects"] + list(z.get("objects") or [])
    if "notes" not in rest and named and named.get("notes"):
        rest["notes"] = copy.deepcopy(named["notes"])
    return rest, errs


def expand_refs(lst, w, h):
    """"N1–P6", "F4–F5, H2" or "C7" -> a set of (x, y)."""
    import re
    out = set()
    for item in lst or []:
        for part in str(item).split(","):
            ends = [e.strip() for e in re.split("[–-]", part)]
            pts = []
            for e in ends[:2]:
                m = re.fullmatch(r"([A-Za-z])(\d{1,3})", e)
                if m:
                    pts.append((LETTERS.index(m.group(1).upper()), int(m.group(2)) - 1))
            if not pts:
                continue
            a, b = pts[0], pts[-1]
            for x in range(min(a[0], b[0]), max(a[0], b[0]) + 1):
                for y in range(min(a[1], b[1]), max(a[1], b[1]) + 1):
                    if x < w and y < h:
                        out.add((x, y))
    return out
