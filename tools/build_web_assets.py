"""Build the web game's images from art/ (via art/catalog.json), under the same names the canvas prototypes use.

Writes apps/web/public/assets/<name>.webp (screen size) and <name>-lg.webp (click-to-enlarge size), and
apps/web/src/game/assets.json mapping each name to its URL. Idempotent: skips files that are already up to date.
"""
import hashlib
import json, pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "apps/web/public/assets"
MAP = ROOT / "apps/web/src/game/assets.json"
STATIC = ROOT / "apps/web/static"
C = json.loads((ROOT / "art/catalog.json").read_text())
OUT.mkdir(parents=True, exist_ok=True)
assets = {}

def emit(name, src, small, large, quality=82, versioned=False, small_crop=None):
    """small/large are max (w, h) boxes; images are never upscaled. small_crop: (left, top, right, bottom) of the source
    the small copy is cut from (a painting's token square), the large copy stays whole."""
    src = pathlib.Path(src)
    for suffix, box in (("", small), ("-lg", large)):
        if box is None:
            continue
        dst = OUT / f"{name}{suffix}.webp"
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            im = Image.open(src)
            im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
            if small_crop and suffix == "":
                im = im.crop(tuple(small_crop))
            im.thumbnail(box, Image.LANCZOS)
            im.save(dst, "WEBP", quality=quality, method=4)
        # versioned: ?v=<content hash>, so art replaced under the same name is never served from an old cache
        assets[name + suffix] = f"/assets/{name}{suffix}.webp" + ("?v=" + hashlib.sha256(dst.read_bytes()).hexdigest()[:10] if versioned else "")

for sid, a in C["skills"].items():
    emit("skill-" + sid, ROOT / a["path"], (400, 500), (800, 1000), versioned=True)  # recoloured in 0.19 (Acuity, Improvisation)
# Every portrait collection in `characters` (the Survival foes too, collection survival-foes: char-foe-<kind>-<tier>[-a|-b],
# the Bosses' (a setting's boss.portrait), char-vault-guard-<setting>, char-foe-caster-*, picked by data/survival.json foe_faces). The round token is
# the CSS crop of this 4:5 image (object-fit: cover); the eye line goes to eyelines.json below.
for cid, a in C["characters"].items():
    emit("char-" + cid, ROOT / a["path"], (320, 400), (800, 1000))
# Figment portraits (rules 1.34, ART-REQUESTS C6; catalog `figments`): built under their own catalog id, and only when
# data names it (a form's or the turret's `portrait` in data/figments.json), so a form not in the game yet never ships.
# A unit wears it as its face (owned.ts puts the block's portrait on the unit). A Figment fills only the painting's
# central circle, so the small copy (the token, the HUD rows, the FIGMENTS header) is cut from the catalog's token_crop
# square, 320 px; the large copy (the cut-in, the enlarged view) is the whole 4:5 painting, and its token_center goes to
# eyelines.json below for the cut-in strip.
_FIG = json.loads((ROOT / "data/figments.json").read_text(encoding="utf-8"))
FIG_NAMED = {f["portrait"] for f in _FIG.get("forms", []) + [_FIG.get("turret") or {}] if f.get("portrait")}
for fid, a in C.get("figments", {}).items():
    if fid in FIG_NAMED:
        emit(fid, ROOT / a["path"], (320, 320) if a.get("token_crop") else (320, 400), (800, 1000), versioned=True, small_crop=a.get("token_crop"))
for fam, prefix in (("traits", "wick-trait-"), ("perks", "wick-perk-")):
    for iid, a in C[fam].items():
        small = ROOT / a.get("exports", {}).get("128", a["path"])
        # versioned: art replaced under the same name (Both Hands; a placeholder over an old perk's icon, and later its
        # delivery) gets a new address, so no cache keeps showing the old picture
        ver = iid == "both-hands" or "previous_revision_path" in a
        emit(prefix + iid, small, (128, 128), None, 90, versioned=ver)
        emit(prefix + iid, ROOT / a["path"], None, (512, 512), 90, versioned=ver)
        # A renamed item keeps its art file (rules 1.13: Grapple is Iron Grip, Origami Hands is Both Hands): the catalog
        # entry's `data_id` names the item it belongs to now, and the same images also answer to that name, which is
        # the one the screens ask for ("wick-perk-" + the data id with hyphens). No second copy is written.
        alias = a.get("data_id", "").replace("_", "-")
        if alias and alias != iid and alias not in C[fam]:
            for suffix in ("", "-lg"):
                assets[prefix + alias + suffix] = assets[prefix + iid + suffix]
# Rules 1.60 (Doors 3.0): the forks' option icons (catalog `fork_icons`, one per data/forks.json row; a placeholder until
# drawn): wick-fork-<id>, read by apps/web/src/game/forkView.ts (forkIconOf), the door's skill portrait when missing
for iid, a in C.get("fork_icons", {}).items():
    emit("wick-fork-" + iid, ROOT / a["path"], (128, 128), (512, 512), 90, versioned=True)
emit("wick-mind-without-fog", ROOT / C["traits"]["mind-without-fog"]["path"], (128, 128), (512, 512), 90)
emit("world-outpost813", ROOT / C["illustrations"]["outpost813"]["path"], (1400, 800), (1600, 900))
emit("emblem-ahoc-seal", ROOT / C["emblems"]["ahoc-seal-white"]["path"], (240, 240), (512, 512), 90)
emit("wick-welcome", ROOT / C["mascot"]["wick-welcome"]["path"], (256, 256), (512, 512), 90)
emit("world-pilot", STATIC / "world-pilot.jpg", (1400, 933), (1400, 933))
emit("wick-narrator-placeholder", STATIC / "wick-narrator-placeholder.jpg", (256, 256), (256, 256))
emit("wick-narrator-placeholder", ROOT / "art/style-guide/references/wick-model-study.png", None, (1024, 1024))
# Campaign art (M813 handoff): zone banners and story moments, map backgrounds, object sprites. Catalog ids, selected paths.
for iid, a in C.get("illustrations", {}).items():
    if a.get("campaign_id"):
        emit("ill-" + iid, ROOT / a["path"], (1400, 788), (1600, 900))
# Rules 1.48 (survival-spec 4.3, the art contract): the path map's overland backdrop of each setting, catalogued under
# illustrations as `survival-map-<setting>` (2560 x 1440); PathMap.tsx draws it, else its field chart.
for iid, a in C.get("illustrations", {}).items():
    if iid.startswith("survival-map-"):
        emit(iid, ROOT / a["path"], (1600, 900), (2560, 1440))
for mid, a in C.get("maps", {}).items():
    emit(mid, ROOT / a["path"], (1600, 1100), None, 80)
for sid, a in C.get("sprites", {}).items():
    w, h = a.get("dimensions", [256, 256])
    emit("sprite-" + sid, ROOT / a["path"], (w // 2, h // 2), None, 90)
# Map kits (rules 1.45; catalog `kit`, written by tools/art/kit_catalog.py): kit-<setting>-<piece>, drawn per tile by the
# fight map (apps/web/src/game/kitMap.ts). A 256 px piece at 128 px (a tile shows at 46 to 64 css px: sharp at 2x), the
# container at 192 x 128; a floor (1024 px, four tiles a side) at 512 px in its four quarter turns, -r0 to -r3 (the map's
# ground turns by the stream, and a CSS background can't turn). A piece with "use": false is not built, so the map draws
# what it drew before (the per-piece fallback). Only what a map shows is fetched: a URL is loaded when a tile names it.
KIT_TURNS = (None, Image.ROTATE_270, Image.ROTATE_180, Image.ROTATE_90)  # r1 = a quarter turn clockwise

def emit_turns(name, src, size):
    src = pathlib.Path(src)
    for r, op in enumerate(KIT_TURNS):
        dst = OUT / f"{name}-r{r}.webp"
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            im = Image.open(src).convert("RGB").resize((size, size), Image.LANCZOS)
            (im if op is None else im.transpose(op)).save(dst, "WEBP", quality=80, method=4)
        assets[f"{name}-r{r}"] = f"/assets/{name}-r{r}.webp"

for kid, a in C.get("kit", {}).items():
    if not a.get("use", True):
        continue
    if a["kind"] == "floor":
        emit_turns(kid, ROOT / a["path"], 512)
    else:
        emit(kid, ROOT / a["path"], (a["width"] // 2, a["height"] // 2), None, 88)
# Survival's tile backdrops (rules 1.44, ART-REQUESTS S5): catalog `survival_art`, mode "backdrop", one file per setting
# and letter (`<setting>-<a..d>-<what>.png`), emitted as `survival-backdrop-<setting>-<letter>`, the id a setting's
# `backdrop` names in data/survival.json. The next tile's card draws it (stageView.ts); missing, it is a plain panel.
for bid, a in C.get("survival_art", {}).items():
    if a.get("mode") != "backdrop":
        continue
    setting, letter = pathlib.Path(a["path"]).stem.split("-")[:2]
    emit(f"survival-backdrop-{setting}-{letter}", ROOT / a["path"], (800, 450), (1600, 900), 80)
# The path screen and the shop (the artist's 14 Nov delivery, catalog `survival_art`; ART-REQUESTS S4 and S9), by catalog id:
#   mode "path-map-backdrop"   survival-map-<setting>     1600 x 900 and 2560 x 1440 (PathMap.tsx; the field chart in code
#                              while one is missing). Fetched only when a run's path map shows that setting.
#   mode "shopkeeper-portrait" survival-keeper-<setting>  4:5, the id a face's `portrait` names (data/survival.json faces)
#   mode "path-node-marker-sheet": each cut marker as survival-node-<kind> (128 px: drawn at 22 to 40 css px, sharp at 2x);
#                              the sheet itself is not shipped. A kind with no marker keeps its SVG line icon (runIcons.ts).
# Not built: mode "painted-map" (the 18 painted battle maps: LoRA training material and reference, rules 1.16 and 1.45:
# fight maps are assembled from kits) and mode "path-map" (S1's two superseded path-map directions).
for key, a in C.get("survival_art", {}).items():
    mode = a.get("mode")
    if mode == "path-map-backdrop":
        emit(key, ROOT / a["path"], (1600, 900), (2560, 1440), versioned=True)
    elif mode == "shopkeeper-portrait":
        emit(key, ROOT / a["path"], (480, 600), (800, 1000), versioned=True)
    elif mode == "path-node-marker-sheet":
        for kind, marker in a["marker_exports"].items():
            emit("survival-node-" + kind, ROOT / marker["path"], (128, 128), None, 95, versioned=True)
# The 15 Nov delivery (art/_archive/everything-missing/2026-11-15), by catalog id, built under its own id:
#   mode "ink" in survival_art: a standalone node marker (survival-node-start, -vault_guard, -vault), as the sheet's are.
#   mode "portrait" / "scene" in survival_art: built only when data names the id (a face's `portrait` or `backdrop` in
#     data/survival.json, a mode card's `art` in data/modes.json), so an unused painting never ships.
#   catalog `boons` (icon-boon-<stem>): boon-<stem>, white ink at 128 px; game/boonIcons.ts draws it as a CSS mask.
NAMED = set()
for f in json.loads((ROOT / "data/survival.json").read_text())["faces"]["items"]:
    NAMED.update(x for x in (f.get("portrait"), f.get("backdrop")) if x)
NAMED.update(m["art"] for m in json.loads((ROOT / "data/modes.json").read_text())["items"] if m.get("art"))
# rules 1.56 (L5): the camp's own backdrop, named by data/survival.json `loadout.backdrop`
NAMED.update(x for x in [json.loads((ROOT / "data/survival.json").read_text())["loadout"].get("backdrop")] if x)
for key, a in C.get("survival_art", {}).items():
    mode = a.get("mode")
    if mode == "ink":
        emit(key, ROOT / a["path"], (128, 128), None, 95, versioned=True)
    elif mode == "portrait" and key in NAMED:
        emit(key, ROOT / a["path"], (480, 600), (800, 1000), versioned=True)
    elif mode == "scene" and key in NAMED:
        emit(key, ROOT / a["path"], (1280, 720), (1920, 1080), 78, versioned=True)
for key, a in C.get("boons", {}).items():
    emit("boon-" + key[len("icon-boon-"):], ROOT / a["path"], (128, 128), None, 95, versioned=True)
# catalog `interface_icons` banner-*: the fight cards' sign (game/turnIntro.tsx), white ink at 128 px, under its own id.
# icon-panel-<panel id> (rules 1.56, L5): the right panel header's icon, built as panel-<panel id> (game/panels.ts, main.js).
for key, a in C.get("interface_icons", {}).items():
    if key.startswith("banner-"):
        emit(key, ROOT / a["path"], (128, 128), None, 95, versioned=True)
    elif key.startswith("icon-panel-"):
        emit("panel-" + key[len("icon-panel-"):], ROOT / a["path"], (128, 128), None, 95, versioned=True)
# Blessing 2.0 (docs/design/handoffs/blessing-art-brief.md): picked up from their folders as they are delivered, so the art
# drops in with no code change (game/faithArt.ts falls back to code-drawn placeholders for anything missing):
#   art/portraits/patrons/<id>.png -> patron-<id> (4:5 portrait)
#   art/emblems/patrons/<id>.png             -> patron-mark-<id> (white mark)
#   art/icons/prayers/<file>.png                -> prayer-<file> (whisper-luck, hymn-<patron>-<n>, miracle-<patron>)
for src in sorted((ROOT / "art/portraits/patrons").glob("*.png")):
    emit("patron-" + src.stem, src, (320, 400), (800, 1000))
for src in sorted((ROOT / "art/emblems/patrons").glob("*.png")):
    emit("patron-mark-" + src.stem, src, (128, 128), (512, 512), 90)
for src in sorted((ROOT / "art/icons/prayers").glob("*.png")):
    emit("prayer-" + src.stem, src, (128, 128), (512, 512), 90)
# Calls are delivered in the catalog; the Calls tab can use call-<kebab-case id>.
for iid, a in C.get("calls", {}).items():
    emit("call-" + iid, ROOT / a["path"], (128, 128), (512, 512), 90)
# Outburst 4.0 (docs/design/handoffs/outburst-4.0-art-brief.md): feeling glyphs and module icons, picked up by file name
# the same way (game/heartIcons.ts draws SVG for anything missing). Either folder may be absent.
#   art/icons/feelings/feeling-<id>.png -> feeling-<id>
#   art/icons/modules/module-<id>.png   -> module-<id>
#   ui-<mark>.png in either folder      -> heart-ui-<mark> (revert, practice, felt)
for folder, prefix in (("feelings", "feeling-"), ("modules", "module-")):
    for src in sorted((ROOT / "art/icons" / folder).glob("*.png")):
        stem = src.stem
        key = "heart-" + stem if stem.startswith("ui-") else prefix + (stem[len(prefix):] if stem.startswith(prefix) else stem)
        emit(key, src, (128, 128), (512, 512), 90)
# Painted gear icons (art/style-guide/gear-icons.md; the catalog's `gear` map, keyed by file stem `<kind>-<id>`): one
# asset per item, keyed by the ITEM ID the engine uses, so a screen asks for "gear-" + item id (game/gearIcons.ts):
#   gear-<id>     from the 64 px export (rows and cells up to 32 css px, sharp at 2x)
#   gear-<id>-lg  from the 256 px export (the hand cards, the hover card's picture)
# The stem's id has a leading ammo_ / mod_ removed (the naming rule); it is put back when that is the data's id. Derived
# gear with no item id (rounds-<calibre>, mag-<family>, armour-torso_class<N>_<name>, loot-personal_effects) keeps
# its kind: gear-rounds-<calibre>. A file whose id is not in the data yet is built under gear-<id>, so the item picks it
# up the day it is added. The 1024 masters never go to the browser.
DATA_IDS = {x["id"] for f in ("weapons", "items") for x in json.loads((ROOT / f"data/{f}.json").read_text())["items"]}
GEAR_DERIVED = ("rounds", "mag", "loot")

def gear_key(stem):
    kind, _, rid = stem.partition("-")
    if kind == "loot" and rid in DATA_IDS:  # a loot painting of an item (Contraband): the item's own key, as any item's
        return "gear-" + rid
    if kind in GEAR_DERIVED or (kind == "armour" and rid.startswith("torso_class")):
        return "gear-" + stem
    for cand in (rid, "ammo_" + rid, "mod_" + rid):
        if cand in DATA_IDS:
            return "gear-" + cand
    return "gear-" + rid

GEAR_KEYS = {}
for stem, a in C.get("gear", {}).items():
    key = gear_key(stem)
    assert key not in GEAR_KEYS.values(), f"two gear icons build to {key}"
    GEAR_KEYS[stem] = key
    ex = a.get("exports", {})
    emit(key, ROOT / ex.get("64", a["path"]), (64, 64), None, 85)
    emit(key, ROOT / ex.get("256", a["path"]), None, (256, 256), 85)
# Title screen (art/briefs/title-screen.md, docs/design/title-screen.md §8). The painted layers are 4096 x 2304 with
# overscan (the central safe rect is art/ui/title-screen/technical-review.json); they are exported whole, at three
# widths, and the title picks one by viewport (srcset): <layer> 1600 w, <layer>-lg 2560 w, <layer>-xl 3840 w.
# Back is opaque; mid (and front, fx) keep their alpha. Stack order: back, mid, front, fx.
TITLE = ROOT / "art/ui/title-screen"
# Leon, 7 Nov 2026: the remade title-front.png landed the same day; layers can be held back here by name.
# The title shows a layer as soon as it is in assets.json.
TITLE_HELD: set = set()  # every layer the artist has delivered is used

def emit_widths(name, src, widths, quality, alpha, versioned=False):
    """versioned: the URL carries ?v=<content hash> (art replaced under the same name, like the title layers, gets a
    new address, so no browser or edge cache keeps showing the old picture; the Worker keys its cache on v)."""
    src = pathlib.Path(src)
    for suffix, w in zip(("", "-lg", "-xl"), widths):
        dst = OUT / f"{name}{suffix}.webp"
        fresh = dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime
        if fresh:
            with Image.open(dst) as d:
                fresh = d.width == w
        if not fresh:
            im = Image.open(src)
            im = im.convert("RGBA") if alpha else im.convert("RGB")
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            im.save(dst, "WEBP", quality=quality, method=6, **({"alpha_quality": 90} if alpha else {}))
        url = f"/assets/{name}{suffix}.webp"
        if versioned:
            url += "?v=" + hashlib.sha256(dst.read_bytes()).hexdigest()[:10]
        assets[name + suffix] = url

for layer in ("back", "mid", "front", "fx"):
    f = TITLE / f"title-{layer}.png"
    if f.exists() and layer not in TITLE_HELD:
        emit_widths("title-" + layer, f, (1600, 2560, 3840), 80 if layer == "back" else 84, layer != "back", versioned=True)
# Wick's menu animations (art/mascot/wick-anim, manifest.json): five clips, each a horizontal strip of 256 x 256
# frames. We use the presentation strips (the hello's jump is baked in), never the root-motion track as well.
WICK = ROOT / "art/mascot/wick-anim"
WICK_CLIPS = json.loads((WICK / "manifest.json").read_text())["clips"] if (WICK / "manifest.json").exists() else {}
for seq, clip in WICK_CLIPS.items():
    f = ROOT / clip.get("presentation_strip", clip["strip"])["path"]
    if f.exists():
        emit("wick-" + seq, f, (256 * clip["count"], 256), None, 92)
MAP.write_text(json.dumps(dict(sorted(assets.items())), indent=1) + "\n", newline="\n")  # LF on every OS
# Spotlight cut-ins (docs/design/cutin-spec.md 9.1): where each portrait's eyes are, keyed by the asset names above, for
# the torn eye strip's crop: {"char-<id>": [x, y], "patron-<id>": [x, y]}.
EYES = {}
for cid, a in C["characters"].items():
    if a.get("eye_line"):
        EYES["char-" + cid] = [a["eye_line"]["x"], a["eye_line"]["y"]]
for pid, a in C.get("patrons", {}).items():
    if a.get("eye_line"):
        EYES["patron-" + pathlib.Path(a["path"]).stem] = [a["eye_line"]["x"], a["eye_line"]["y"]]
# a Figment has no eyes: its strip centres on the painting's token centre (the catalog's token_center, in pixels)
for fid, a in C.get("figments", {}).items():
    if fid in FIG_NAMED and a.get("token_center"):
        EYES[fid] = [round(a["token_center"][0] / a["width"], 3), round(a["token_center"][1] / a["height"], 3)]
(ROOT / "apps/web/src/game/eyelines.json").write_text(json.dumps(dict(sorted(EYES.items())), separators=(",", ":")) + "\n", newline="\n")
print(f"{len(assets)} assets -> {OUT.relative_to(ROOT)}")
