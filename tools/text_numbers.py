"""The text-number guard (run by tools/validate.py, so by `npm run check`), second form (12 Nov 2026).

Rule: a number in a data item's player-facing text is not typed. It is a {placeholder} that names the field of the
item it comes from, and the text is rendered from the item's own fields when the data is loaded:

    "Deals +{=grants.effect.mult|more}% damage to a target that is Dazed..."     with  "effect": {"mult": 1.5}
    "Spend {=tiers.I.ap_cost} AP to plead with one humanoid enemy within {=.range} tiles"

So a text cannot state a number its field does not hold: change the field and the card changes with it. A digit typed
straight into a text is an error unless it is on the short allowlist below (a die, a reference) or in the ratchet
file, tools/text_numbers.json.

PLACEHOLDERS   {=path}  or  {=path|format}     (the "=" keeps them apart from the engine's own {name} templates)
    path      keys and list indexes joined by dots, from the item (the nearest enclosing object that has an "id"):
              effects.0.value, tiers.II.effects.1.rounds. A leading dot starts at the object that holds the text
              instead: {=.ap} in an effect's own "text". The path must end at a number.
    format    (none)  the number as it is: 3, 0.5, -2 prints as −2
              abs     without its sign
              signed  with its sign: +2, −2
              pct     a share as a percentage: 0.25 -> 25
              more    a multiplier as "that much more": 1.25 -> 25
              less    a multiplier as "that much less": 0.75 -> 25
Three programs resolve them the same way: this file (validate.py, and design/canvas-build/build.py for the web's
protodata.json), and packages/engine/src/datatext.ts (the engine, when the data is loaded). A test
(packages/engine/test/datatext.test.ts) renders every text with both and compares.

WHAT IS CHECKED (check(), called by validate.py)
    1. every placeholder resolves to a number of its item;
    2. no bare number in a text: the strings under TEXT_KEYS of every item (down to the next object with its own id).
       Not numbers: a rules or item reference ("rules 1.19", "item 953"), digits inside a word (".32", "d20", "2H").
    3. the ratchet: tools/text_numbers.json
         "allow"     {key: reason}   bare numbers that are right to have no field; every entry says why
         "baseline"  {key: count}    the bare numbers of 12 Nov 2026 not yet bound to a field. It only shrinks: a new
                                     key, or a higher count, is an error; a key that is gone must be taken out
                                     (python3 tools/validate.py data --shrink-text-baseline)
         "ceiling"   n               the most the baseline may hold: its size when it was last shrunk. A key added
                                     by hand, or a rewrite that slips a new number in, goes over it and is an error.
       A key is "<file>:<id>[/<nested id>]:<path to the text>:<number as written>".

To fix an error, in order: bind the number to its field with a placeholder; add the field the engine should be
reading and bind to it; or allow it with a reason. Never add to the baseline by hand.
"""
import json, re, pathlib

FILE = pathlib.Path(__file__).resolve().parent / "text_numbers.json"
# The keys whose strings a player reads as rules text.
TEXT_KEYS = {"text", "upsides", "downsides", "grand"}
SKIP_FILES = {"effect_ops", "weapon_mastery", "maps", "archetypes", "loot_tables"}  # no rules texts (the op catalogue, the retired file, layouts, presets, tables)
PH = re.compile(r"\{=(\.?[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*)(?:\|([a-z]+))?\}")
REF = re.compile(r"\b(?:rules?|items?|revision|decision|section|step)\s+\d+(?:\.\d+)*(?:\s*(?:,|and|to|–|-)\s*\d+(?:\.\d+)*)*", re.I)
TOKEN = re.compile(r"(?<![\w.])(×\s*)?(\d+(?:\.\d+)?)(\s*%)?(?![\w]|\.\d)")
FORMATS = ("", "abs", "signed", "pct", "more", "less")

def fmt(v, how=""):
    """A number as a text shows it. The same arithmetic as datatext.ts: round to 4 places, drop trailing zeros."""
    if how == "pct": v = v * 100
    elif how == "more": v = (v - 1) * 100
    elif how == "less": v = (1 - v) * 100
    elif how == "abs": v = abs(v)
    r = round(v + 0.0, 4)
    if r == 0: r = 0.0
    s = str(int(abs(r))) if abs(r) == int(abs(r)) else ("%.4f" % abs(r)).rstrip("0")
    if r < 0: return "−" + s
    return ("+" + s) if how == "signed" else s

def lookup(root, path):
    """The value at a dotted path, or a KeyError."""
    node = root
    for part in path.split("."):
        if isinstance(node, list):
            node = node[int(part)]
        elif isinstance(node, dict):
            node = node[part]
        else:
            raise KeyError(path)
    return node

def render(text, item, holder, errors=None, where=""):
    """The text with every placeholder filled from the item (a leading dot: from the object that holds the text)."""
    def one(m):
        path, how = m.group(1), m.group(2) or ""
        try:
            if how not in FORMATS: raise KeyError("format " + how)
            v = lookup(holder, path[1:]) if path.startswith(".") else lookup(item, path)
            if isinstance(v, bool) or not isinstance(v, (int, float)): raise KeyError("not a number")
        except (KeyError, IndexError, ValueError, TypeError) as e:
            if errors is not None: errors.append(f"text numbers: {where} placeholder {m.group(0)} does not resolve ({e})")
            return m.group(0)
        return fmt(v, how)
    return PH.sub(one, text)

def items(node, chain=()):
    """Every object with an id, with the chain of ids that leads to it."""
    if isinstance(node, dict):
        here = chain + (str(node["id"]),) if "id" in node and isinstance(node["id"], (str, int)) else chain
        if here is not chain: yield here, node
        for v in node.values(): yield from items(v, here)
    elif isinstance(node, list):
        for v in node: yield from items(v, chain)

def strings(node, path="", top=True):
    """(holder, key or index, path, string) for every string of an item, not entering a nested object with its own id."""
    if isinstance(node, dict):
        if not top and isinstance(node.get("id"), (str, int)): return
        for k, v in node.items():
            p = f"{path}.{k}" if path else k
            if isinstance(v, str): yield node, k, p, v
            else: yield from strings(v, p, False)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            p = f"{path}.{i}"
            if isinstance(v, str): yield node, i, p, v
            else: yield from strings(v, p, False)

def is_text(path):
    return any(part in TEXT_KEYS for part in path.split("."))

def resolve_pack(data, errors=None):
    """Fill every placeholder of the pack in place ({file stem: parsed JSON}). Returns how many were filled."""
    n = 0
    for stem in sorted(data):
        for chain, item in items(data[stem]):
            for holder, key, path, s in list(strings(item)):
                if "{=" not in s or not PH.search(s): continue
                n += len(PH.findall(s))
                holder[key] = render(s, item, holder, errors, f"{stem}.json {'/'.join(chain)} {path}")
    return n

def resolve_file(obj):
    """One parsed data file, in place (build.py loads the files one at a time)."""
    resolve_pack({"file": obj}); return obj

def bare_numbers(text):
    """{number as written: count} for the digits typed into a text (placeholders taken out first)."""
    out = {}
    for m in TOKEN.finditer(REF.sub(" ", PH.sub(" ", text))):
        shown = ("×" if m.group(1) else "") + m.group(2) + ("%" if m.group(3) else "")
        out[shown] = out.get(shown, 0) + 1
    return out

def scan(data, errors=None):
    """({key: count} of bare numbers, placeholders bound, texts read) over the raw (unresolved) pack."""
    bare, bound, read = {}, 0, 0
    for stem in sorted(data):
        if stem in SKIP_FILES: continue
        for chain, item in items(data[stem]):
            for holder, key, path, s in strings(item):
                where = f"{stem}.json {'/'.join(chain)} {path}"
                if PH.search(s):
                    bound += len(PH.findall(s)); render(s, item, holder, errors, where)
                if not is_text(path): continue
                read += 1
                for shown, n in bare_numbers(s).items():
                    bare[f"{stem}:{'/'.join(chain)}:{path}:{shown}"] = n
    return bare, bound, read

def check(data, errors, argv=()):
    """Called by validate.py with the RAW pack: appends the errors and returns the one-line summary."""
    bare, bound, read = scan(data, errors)
    book = json.loads(FILE.read_text(encoding="utf8")) if FILE.exists() else {"allow": {}, "baseline": {}}
    allow, base = book.get("allow", {}), dict(book.get("baseline", {}))
    ceiling = book.get("ceiling")
    if "--init-text-baseline" in argv:
        if base: raise SystemExit("the baseline exists: it only shrinks (--shrink-text-baseline)")
        base = {k: n for k, n in bare.items() if k not in allow}; ceiling = sum(base.values())
    if "--shrink-text-baseline" in argv:
        base = {k: min(n, bare[k]) for k, n in base.items() if k in bare and k not in allow}
        allow = {k: v for k, v in allow.items() if k in bare}
        ceiling = min(ceiling if ceiling is not None else 10 ** 9, sum(base.values()))
    if "--init-text-baseline" in argv or "--shrink-text-baseline" in argv:
        book = {"what": "tools/text_numbers.py: the text-number guard. allow = bare numbers that are right to have no field, each with its reason; baseline = the bare numbers of 12 Nov 2026 not yet bound to a field with a {placeholder} (key: how many times), which may only shrink.",
                "ceiling": ceiling, "allow": dict(sorted(allow.items())), "baseline": dict(sorted(base.items()))}
        FILE.write_text(json.dumps(book, indent=1, ensure_ascii=False) + "\n", encoding="utf8")
    for k, why in allow.items():
        if not str(why).strip(): errors.append(f"text numbers: allow entry {k} has no reason")
    if ceiling is None or sum(base.values()) > ceiling:  # a key added by hand, or a baseline rewritten around a new bare number
        errors.append(f"text numbers: the baseline holds {sum(base.values())} bare numbers and its ceiling is {ceiling}: the baseline only shrinks, a number is never added to it (bind it or allow it with a reason)")
    new = sorted(k for k, n in bare.items() if k not in allow and n > base.get(k, 0))
    gone = sorted(k for k, n in base.items() if bare.get(k, 0) < n) + sorted(k for k in allow if k not in bare)
    for k in new[:40]:
        stem, ids, path, shown = k.split(":", 3)
        errors.append(f"text number: {stem}.json {ids} {path} has the bare number {shown}: bind it to its field with a {{placeholder}} (tools/text_numbers.py), or allow it with a reason in tools/text_numbers.json (key {k})")
    if len(new) > 40: errors.append(f"text numbers: and {len(new) - 40} more")
    if gone:
        errors.append(f"text numbers: {len(gone)} listed in tools/text_numbers.json are gone or fewer (the list only shrinks: run python3 tools/validate.py data --shrink-text-baseline), e.g. {gone[0]}")
    return f"text numbers: {read} texts read, {bound} numbers bound to a field, {sum(base.values())} bare in the baseline (it only shrinks), {len(allow)} allowed"

def mutation(data):
    """The guard tested on itself. (1) +1 on every field a placeholder reads must change the rendered text.
    (2) A digit typed into a text must be an error: once as a number the text does not hold, once as a second copy of
    a bare number it already holds (the baseline counts them). Returns the tallies; "missed" must be 0."""
    import copy
    book = json.loads(FILE.read_text(encoding="utf8")) if FILE.exists() else {"allow": {}, "baseline": {}}
    base, allow = book.get("baseline", {}), book.get("allow", {})
    out = {"bound_fields": 0, "bound_missed": [], "typed": 0, "typed_missed": []}
    def set_at(root, path, f):
        parts = path.split("."); node = root
        for part in parts[:-1]: node = node[int(part)] if isinstance(node, list) else node[part]
        last = int(parts[-1]) if isinstance(node, list) else parts[-1]; node[last] = f(node[last])
    for stem in sorted(data):
        for chain, item in items(data[stem]):
            for holder, key, path, s in strings(item):
                where = f"{stem}:{'/'.join(chain)}:{path}"
                for m in PH.finditer(s):
                    ref = m.group(1)
                    if ref.startswith("."): continue  # relative paths: none in the pack today; the absolute form is tested
                    twin = copy.deepcopy(item); set_at(twin, ref, lambda v: v + 1)
                    th = twin
                    for part in path.split(".")[:-1]: th = th[int(part)] if isinstance(th, list) else th[part]
                    out["bound_fields"] += 1
                    if render(s, twin, th) == render(s, item, holder): out["bound_missed"].append(where + " " + m.group(0))
                if stem in SKIP_FILES or not is_text(path): continue
                have = bare_numbers(s)
                for typed in [s + " 987"] + ([s + " " + next(iter(have)).lstrip("×")] if have else []):
                    out["typed"] += 1
                    now = bare_numbers(typed)
                    caught = any(f"{where}:{shown}" not in allow and n > base.get(f"{where}:{shown}", 0) for shown, n in now.items())
                    if not caught: out["typed_missed"].append(where)
    return out

if __name__ == "__main__":
    # python3 tools/text_numbers.py --mutate : the guard tested on itself (mutation()); exit 1 when a mutation is missed
    # python3 tools/text_numbers.py --render : every text of the pack after resolution, as JSON {key: text} (the engine test compares)
    import sys
    root = pathlib.Path(__file__).resolve().parent.parent / "data"
    pack = {p.stem: json.loads(p.read_text(encoding="utf8")) for p in sorted(root.glob("*.json"))}
    if "--render" in sys.argv:
        raw = {}
        for stem in sorted(pack):
            for chain, item in items(pack[stem]):
                for holder, key, path, s in strings(item):
                    if PH.search(s): raw[f"{stem}:{'/'.join(chain)}:{path}"] = render(s, item, holder)
        json.dump(raw, sys.stdout, ensure_ascii=False, sort_keys=True)
    elif "--mutate" in sys.argv:
        r = mutation(pack)
        print(json.dumps({"bound_fields": r["bound_fields"], "bound_missed": len(r["bound_missed"]), "typed": r["typed"], "typed_missed": len(r["typed_missed"]), "examples": (r["bound_missed"] + r["typed_missed"])[:10]}))
        sys.exit(1 if r["bound_missed"] or r["typed_missed"] else 0)
    else:
        errs = []; print(check(pack, errs, sys.argv[1:])); print("\n".join(errs[:50]))
