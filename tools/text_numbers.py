"""The text-number guard (run by tools/validate.py, so by `npm run check`).

Rule: every number written in a data item's player-facing `text` must equal a number in that item's own structured
fields. A card that says "+25% damage" beside an effect that says 0.2 is the bug this catches; so is a card whose
number is written nowhere but in its prose (nothing can then keep it true).

What is an item: any object in data/*.json that has an "id". Its texts are every string under a key named "text"
inside it (a perk's tiers, a technique's lines, a weapon's grant), down to the next object with an id of its own.
Its structured numbers are every number in it, every number written in its short non-prose strings ("20 + 5*raw_power",
"once_per_turn", a "when" or a "context" of an effect) and every numeric key ({"3": ...}).

How a text number is matched:
    25%      25, 0.25, 1.25 or 0.75 (a share, a multiplier up, a multiplier down)
    ×1.5     1.5, 0.5 or 50
    3        3 (the sign is ignored: "−2 to hit" matches -2 and 2)
Not read as numbers: a rules or item reference ("rules 1.19", "item 953"), and digits that are part of a word
(".32", "d20", "2H", "M813").

The ratchet, tools/text_numbers.json:
    "allow"     {key: reason}  numbers that are right to have no field (a die face, a count in a name). Permanent;
                               every entry says why.
    "baseline"  [key, ...]     the failures of 12 Nov 2026, the day the guard was added. It only shrinks: a key that
                               no longer fails must be taken out (python3 tools/validate.py data --shrink-text-baseline),
                               and a failure that is not listed is an error.
A key is "<file>:<id>[/<nested id>]:<path to the text>:<number as written>".

To fix a failure, in order of preference: make the text read the number from the field (where the screen builds the
line); add the structured field the engine should be reading; correct the text; or allow it with a reason.
"""
import json, re, pathlib

FILE = pathlib.Path(__file__).resolve().parent / "text_numbers.json"
# Strings under these keys are prose (or are the text itself, split up): they never count as structured fields.
PROSE = {"text", "flavour", "lore", "deed", "narrator_hook", "note", "notes", "upsides", "downsides", "name", "tagline", "summary",
         "rule", "shared_rule", "future_home", "source", "source_note", "intro", "persona", "style", "quiet", "wants", "notices",
         "high_levels", "resist", "consequence", "effect", "blurb", "look", "why", "costume", "provisional_note", "tutor", "label", "desc"}
SKIP_FILES = {"effect_ops"}  # the op catalogue: summaries of ops, not rules
REF = re.compile(r"\b(?:rules?|items?|revision|decision|section|step)\s+\d+(?:\.\d+)*(?:\s*(?:,|and|to|–|-)\s*\d+(?:\.\d+)*)*", re.I)
TOKEN = re.compile(r"(?<![\w.])(×\s*)?(\d+(?:\.\d+)?)(\s*%)?(?![\w]|\.\d)")
NUMBER = re.compile(r"(?<![\w.])\d+(?:\.\d+)?(?![\w])")

def text_numbers(text):
    """The numbers a text states: [(as written, the values a field may hold for it)]."""
    out = {}
    for m in TOKEN.finditer(REF.sub(" ", text)):
        v = float(m.group(2))
        if m.group(3):
            shown, ok = m.group(2) + "%", {v, v / 100, 1 + v / 100, 1 - v / 100}
        elif m.group(1):
            shown, ok = "×" + m.group(2), {v, abs(v - 1), abs(v - 1) * 100}
        else:
            shown, ok = m.group(2), {v}
        out.setdefault(shown, set()).update(ok)
    return out

def structured(node, acc, top=True):
    """Every number an item holds outside its prose."""
    if isinstance(node, bool) or node is None:
        return
    if isinstance(node, (int, float)):
        acc.add(abs(float(node)))
    elif isinstance(node, list):
        for v in node: structured(v, acc, False)
    elif isinstance(node, dict):
        for k, v in node.items():
            if NUMBER.fullmatch(str(k)): acc.add(float(k))
            if isinstance(v, str):
                if k not in PROSE and len(v) <= 160:
                    acc.update(float(x) for x in NUMBER.findall(v))
            else:
                structured(v, acc, False)

def texts(node, path=""):
    """(path, text) for every "text" string of an item, not going into a nested object that has its own id."""
    if isinstance(node, dict):
        for k, v in node.items():
            p = f"{path}.{k}" if path else k
            if k == "text" and isinstance(v, str): yield p, v
            elif isinstance(v, dict) and "id" in v: continue
            else: yield from texts(v, p)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, dict) and "id" in v: continue
            yield from texts(v, f"{path}[{i}]")

def items(node, chain=()):
    """Every object with an id, with the chain of ids that leads to it."""
    if isinstance(node, dict):
        here = chain + (str(node["id"]),) if "id" in node and isinstance(node["id"], (str, int)) else chain
        if here is not chain: yield here, node
        for v in node.values(): yield from items(v, here)
    elif isinstance(node, list):
        for v in node: yield from items(v, chain)

def failures(data):
    """{key: message} for every text number with no field, over the whole pack ({file stem: parsed JSON})."""
    out, checked = {}, 0
    for stem in sorted(data):
        if stem in SKIP_FILES: continue
        for chain, item in items(data[stem]):
            have = None
            for path, text in texts(item):
                for shown, ok in text_numbers(text).items():
                    if have is None:
                        have = set(); structured(item, have)
                    checked += 1
                    if not any(abs(a - b) < 1e-9 for a in ok for b in have):
                        out[f"{stem}:{'/'.join(chain)}:{path}:{shown}"] = f"{stem}.json {'/'.join(chain)} {path} says {shown} and no field of the item holds it"
    return out, checked

def check(data, errors, argv=()):
    """Called by validate.py: appends the errors and returns the one-line summary."""
    fails, checked = failures(data)
    book = json.loads(FILE.read_text(encoding="utf8")) if FILE.exists() else {"allow": {}, "baseline": []}
    allow, base = book.get("allow", {}), set(book.get("baseline", []))
    if "--init-text-baseline" in argv:
        if base: raise SystemExit("the baseline exists: it only shrinks (--shrink-text-baseline)")
        base = {k for k in fails if k not in allow}
    if "--shrink-text-baseline" in argv:
        base = {k for k in base if k in fails and k not in allow}
        allow = {k: v for k, v in allow.items() if k in fails}
    if "--init-text-baseline" in argv or "--shrink-text-baseline" in argv:
        book = {"what": "tools/text_numbers.py: the text-number guard. allow = right to have no field, each with its reason; baseline = the failures of 12 Nov 2026, which may only shrink.",
                "allow": dict(sorted(allow.items())), "baseline": sorted(base)}
        FILE.write_text(json.dumps(book, indent=1, ensure_ascii=False) + "\n", encoding="utf8")
    for k, why in allow.items():
        if not str(why).strip(): errors.append(f"text numbers: allow entry {k} has no reason")
    new = [k for k in fails if k not in base and k not in allow]
    fixed = [k for k in sorted(base | set(allow)) if k not in fails]
    for k in sorted(new)[:40]:
        errors.append(f"text number: {fails[k]} (add the field, make the text read it, or allow it with a reason in tools/text_numbers.json; key {k})")
    if len(new) > 40: errors.append(f"text numbers: and {len(new) - 40} more")
    if fixed:
        errors.append(f"text numbers: {len(fixed)} listed in tools/text_numbers.json no longer fail (the list only shrinks: run python3 tools/validate.py data --shrink-text-baseline), e.g. {fixed[0]}")
    return f"text numbers: {checked} checked against their item's fields, {len(base)} in the baseline (it only shrinks), {len(allow)} allowed"
