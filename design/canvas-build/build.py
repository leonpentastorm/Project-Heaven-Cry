#!/usr/bin/env python3
"""Build the PHC UI prototype artboards (design/canvas/*.dc.html) from the repo's data.

Usage: python3 design/canvas-build/build.py
Data comes from data/*.json, docs/lore (origins) and the canvas blob map (blobs.json),
so the prototype always shows the real skills, voices, archetypes, origins and traits.

Publishing: on the canvas artifact the boards live under project/ (project/Create.dc.html,
project/canvas.json, ...). A file published at the top level is not a board and never shows up.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "design" / "canvas"
BUILD = ROOT / "design" / "canvas-build"
BLOBS = json.loads((BUILD / "blobs.json").read_text())
PAL = json.loads((ROOT / "art/style-guide/v1.3/palette.json").read_text())

def load(name):
    return json.loads((ROOT / "data" / name).read_text())

INK = {k: v["ui_ink"] for k, v in PAL["attributes"].items()}
CORE = PAL["ui"]["cores"]

ATTR_FX = {
    "endurance": "Max HP and injury resistance",
    "strength": "Physical damage and carry weight",
    "agility": "Initiative and tiles per move",
    "perception": "Vision range and critical damage",
    "intelligence": "Sigil words per spell and Sigil damage",
    "expression": "Sigil AP cost and elemental damage",
    "insight": "Healing given and Soul spell cost",
    "determination": "Soul damage and Mana Syphon",
    "virtue": "Max MP and prayer cooldown",
}
CORE_TEXT = {
    "body": ["Muscle, blood, and how well you command your own flesh.", "Endurance · Strength · Agility", "Runs on ammo, weapons and tech"],
    "mind": ["The brain: absorbing theory and thinking logically.", "Perception · Intelligence · Expression", "Burns mana cores to draw Sigils"],
    "soul": ["The heart: emotional awareness and social perception.", "Insight · Determination · Virtue", "Spends mana on Soul spells and prayer"],
}

def epccg(x):
    """The skill's EPCCG write-up for the "?" pop-up, with its First-Patch Revival portrait."""
    e = x["epccg"]
    return {"entry": e["entry"], "speaker": e["speaker"], "portrait": e["portrait"], "img": BLOBS["char-" + e["portrait_id"]],
            "quote": e["quote"], "intro": e["intro"], "effect": e["effect"], "high": e["high_levels"],
            "good": e["good_for"], "bad": e["bad_for"]}

EP_TPL = (BUILD / "epccg.template.html").read_text()
EP_JS = (BUILD / "epccg.logic.js").read_text()

def with_epccg(tpl, js):
    """Inline the shared EPCCG pop-up where a template or logic file asks for it."""
    return tpl.replace("<!--EPCCG-->", EP_TPL), js.replace("/*EPCCG*/", EP_JS)

def skills():
    out = []
    for x in load("skills.json")["items"]:
        out.append({
            "id": x["id"], "name": x["name"], "attr": x["attribute"], "core": x["core"], "slot": x["slot"],
            "summary": x["summary"], "quiet": x["voice"]["sample_lines"]["quiet"], "notices": x["voice"]["sample_lines"]["notices"],
            "img": BLOBS["skill-" + x["id"].replace("_", "-")], "ep": epccg(x),
        })
    return out

def attrs():
    order = ["endurance", "strength", "agility", "perception", "intelligence", "expression", "insight", "determination", "virtue"]
    a = {x["id"]: x for x in load("attributes.json")["items"]}
    return [{"id": i, "name": a[i]["name"], "core": a[i]["core"], "ink": INK[i], "fx": ATTR_FX[i]} for i in order]

def classes():
    return [{"id": b["id"], "name": b["name"], "core": b["core"], "role": b["role"], "sig": b["signature"]} for b in load("classes.json")["base"]]

def classes_full():
    out = []
    for b in load("classes.json")["base"]:
        m = b["ranks"]["I"]["moves"][0]
        res = b["resource"]
        out.append({"id": b["id"], "name": b["name"], "core": b["core"], "role": b["role"], "sig": b["signature"],
                    "resource": res["id"].capitalize() + (" (max " + str(res["max"]) + ")" if res.get("max") else ""),
                    "move": m["name"].upper(), "moveText": m["text"]})
    return out


def weapon_mastery():
    d = load("weapon_mastery.json")
    return {"levels": d["rules"]["levels"], "families": [{"id": f["id"], "name": f["name"]} for f in d["families"]],
            "perks": [{"id": p["id"], "name": p["name"], "family": p["family"], "mastery_level": p["mastery_level"]} for p in d["items"]]}

def archetypes():
    d = load("archetypes.json")
    return {"families": d["families"], "items": d["items"]}

def origins():
    return json.loads((BUILD / "origins.json").read_text())

def traits():
    out = []
    for t in load("traits.json")["items"]:
        out.append({
            "id": t["id"], "name": t["name"], "cat": t.get("category", ""),
            "flavour": t["text"].split("\n")[0],
            "up": t.get("upsides", []), "down": t.get("downsides", []),
            "ex": t.get("excludes", []) or [],
            "icon": BLOBS.get("wick-trait-" + t["id"].replace("_", "-"), BLOBS["wick-mind-without-fog"]),
        })
    return out

PORTRAITS = [
    {"id": "mpat", "label": "MPAT", "img": BLOBS["char-mpat"]},
    {"id": "mallow-3", "label": "Automaton", "img": BLOBS["char-mallow-3"]},
    {"id": "drava-keel", "label": "Drava Keel", "img": BLOBS["char-drava-keel"]},
    {"id": "ilyen-taal", "label": "Ilyen Taal", "img": BLOBS["char-ilyen-taal"]},
    {"id": "ketta-flint", "label": "Ketta Flint", "img": BLOBS["char-ketta-flint"]},
    {"id": "brother-halden", "label": "Brother Halden", "img": BLOBS["char-brother-halden"]},
    {"id": "inspectant-latch-7", "label": "Inspectant Latch-7", "img": BLOBS["char-inspectant-latch-7"]},
]

KITS = [
    {"id": "medic", "name": "Field medic", "items": ["Service pistol (.32 Decrkm)", "Stim injector, 3 stims", "Medic plate (Class II)", "Field kit"]},
    {"id": "soldier", "name": "Line soldier", "items": ["Hellraiser service rifle, 3 magazines", "Combat knife", "Flak vest (Class III)", "Ration pack"]},
    {"id": "sigil", "name": "Sigil student", "items": ["Evoker, 4 standard cores", "Service pistol", "Padded coat (Class I)", "Chalk and wax"]},
    {"id": "soul", "name": "Soul initiate", "items": ["Emanator", "Drifter revolver", "Padded coat (Class I)", "Prayer beads and incense"]},
]

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&amp;family=Spectral:ital,wght@0,400;0,600;1,400&amp;display=swap" rel="stylesheet">')

HELMET = f"""<helmet>
{FONTS}
<style>
body{{margin:0;background:#0A0D13}}
a{{color:#8BDEEE}}a:hover{{color:#E7EBF3}}
input,select,textarea{{font-family:'Chakra Petch',sans-serif}}
@keyframes phcThrow{{0%{{transform:translate(-220px,140px) rotate(-540deg) scale(.55);opacity:0}}55%{{transform:translate(40px,-30px) rotate(40deg) scale(1.05);opacity:1}}75%{{transform:translate(-12px,8px) rotate(-14deg)}}100%{{transform:translate(0,0) rotate(0) scale(1)}}}}
@keyframes phcThrow2{{0%{{transform:translate(220px,140px) rotate(540deg) scale(.55);opacity:0}}55%{{transform:translate(-40px,-30px) rotate(-40deg) scale(1.05);opacity:1}}75%{{transform:translate(12px,8px) rotate(14deg)}}100%{{transform:translate(0,0) rotate(0) scale(1)}}}}
.phc-icon{{transition:transform .15s ease;transform-origin:center}}.phc-icon:hover{{transform:scale(1.35)}}
.phc-help{{opacity:.3;transition:opacity .15s}}.phc-card:hover .phc-help,.phc-help:hover,.phc-help:focus-visible{{opacity:1}}
@media (prefers-reduced-motion: reduce){{*{{animation:none!important;transition:none!important}}}}
</style>
</helmet>"""


def page(title, body, script, props='{"$preview":{"width":1440,"height":1000}}'):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{HELMET}
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
{script}
</script>
</body>
</html>
"""


def wrapper(title, step, sample_arch="", sample_name="", height=1000):
    body = f"""<div style="min-height: {height}px; background: #0A0D13">
<dc-import name="Create" start-step="{step}" sample-arch="{sample_arch}" sample-name="{sample_name}" hint-size="100%,{height}px"></dc-import>
</div>"""
    script = "class Component extends DCLogic {\n  renderVals() { return {}; }\n}"
    return page(title, body, script, '{"$preview":{"width":1440,"height":%d}}' % height)


def build():
    data = {
        "skills": skills(), "attrs": attrs(), "classes": classes(), "arch": archetypes(), "origins": origins(),
        "traits": traits(), "portraits": PORTRAITS, "kits": KITS, "core": CORE, "coreText": CORE_TEXT,
        "wick": BLOBS["wick-mind-without-fog"],
    }
    tpl, js = with_epccg((BUILD / "create.template.html").read_text(),
                         (BUILD / "create.logic.js").read_text().replace("__DATA__", json.dumps(data, ensure_ascii=False)))
    (OUT / "Create.dc.html").write_text(page("PHC · Character creation (EPCCG)", tpl.replace("__WICKMARK__", BLOBS["wick-welcome"]).replace("__WICK__", BLOBS["wick-mind-without-fog"]).replace("__SEAL__", BLOBS["emblem-ahoc-seal"]), js,
        '{"startStep":{"editor":"enum","options":["identity","archetype","skills","traits","kit","lockin"],"default":"identity"},"sampleArch":{"editor":null},"sampleName":{"editor":null},"$preview":{"width":1440,"height":1000}}'))
    for fname, title, step, arch, name, h in [
        ("CreateArchetype.dc.html", "PHC · Creation · archetype", "archetype", "", "", 1100),
        ("CreateSkills.dc.html", "PHC · Creation · skills", "skills", "field_medic", "MPAT", 1500),
        ("CreateTraits.dc.html", "PHC · Creation · traits", "traits", "field_medic", "MPAT", 1400),
        ("CreateKit.dc.html", "PHC · Creation · kit", "kit", "field_medic", "MPAT", 900),
        ("CreateLockIn.dc.html", "PHC · Creation · lock in", "lockin", "field_medic", "MPAT", 1900),
    ]:
        (OUT / fname).write_text(wrapper(title, step, arch, name, h))
    print("built Create + 5 step artboards")
    mdata = {"skills": skills(), "attrs": attrs(), "core": CORE, "pc": BLOBS["char-mpat"], "p2": BLOBS["char-inspectant-latch-7"],
             "npc": BLOBS["char-drava-keel"], "pilot": BLOBS["world-pilot"], "outpost": BLOBS["world-outpost813"], "wick": BLOBS["wick-mind-without-fog"], "wm": weapon_mastery(), "factoryIcon": BLOBS["wick-trait-factory-made"], "narrator": BLOBS["wick-narrator-placeholder"],
             "perks": [{"id": x["id"], "name": x["name"], "text": x["tiers"]["I"]["text"][0].upper() + x["tiers"]["I"]["text"][1:], "icon": BLOBS.get("wick-perk-" + x["id"].replace("_", "-"), BLOBS["wick-mind-without-fog"])} for x in load("perks.json")["items"] if x["id"] in ("rally_cry", "roll_with_it")]}
    tpl, js = with_epccg((BUILD / "main.template.html").read_text(),
                         (BUILD / "main.logic.js").read_text().replace("__DATA__", json.dumps(mdata, ensure_ascii=False)))
    (OUT / "Main.dc.html").write_text(page("PHC · Story mode · M813", tpl, js, '{"$preview":{"width":1440,"height":1240}}'))
    print("built Main")
    common = {"skills": skills(), "attrs": attrs(), "core": CORE, "pc": BLOBS["char-mpat"], "p2": BLOBS["char-inspectant-latch-7"],
              "p3": BLOBS["char-drava-keel"], "npc": BLOBS["char-drava-keel"], "wick": BLOBS["wick-mind-without-fog"], "pilot": BLOBS["world-pilot"], "outpost": BLOBS["world-outpost813"], "classes": classes_full()}
    for name, fname, title, h in [("combat", "Combat.dc.html", "PHC · Combat · M813 rear pad", 1160),
                                  ("room", "Room.dc.html", "PHC · Room · squad and Narrator", 1500),
                                  ("levelup", "LevelUp.dc.html", "PHC · Level up · level 3 and class", 1200)]:
        tpl, js = with_epccg((BUILD / (name + ".template.html")).read_text(),
                             (BUILD / (name + ".logic.js")).read_text().replace("__DATA__", json.dumps(common, ensure_ascii=False)))
        (OUT / fname).write_text(page(title, tpl, js, '{"$preview":{"width":1440,"height":%d}}' % h))
    print("built Combat, Room, LevelUp")


if __name__ == "__main__":
    build()
