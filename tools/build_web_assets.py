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

def emit(name, src, small, large, quality=82, versioned=False):
    """small/large are max (w, h) boxes; images are never upscaled."""
    src = pathlib.Path(src)
    for suffix, box in (("", small), ("-lg", large)):
        if box is None:
            continue
        dst = OUT / f"{name}{suffix}.webp"
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            im = Image.open(src)
            im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
            im.thumbnail(box, Image.LANCZOS)
            im.save(dst, "WEBP", quality=quality, method=4)
        # versioned: ?v=<content hash>, so art replaced under the same name is never served from an old cache
        assets[name + suffix] = f"/assets/{name}{suffix}.webp" + ("?v=" + hashlib.sha256(dst.read_bytes()).hexdigest()[:10] if versioned else "")

for sid, a in C["skills"].items():
    emit("skill-" + sid, ROOT / a["path"], (400, 500), (800, 1000), versioned=True)  # recoloured in 0.19 (Acuity, Improvisation)
for cid, a in C["characters"].items():
    emit("char-" + cid, ROOT / a["path"], (320, 400), (800, 1000))
for fam, prefix in (("traits", "wick-trait-"), ("perks", "wick-perk-")):
    for iid, a in C[fam].items():
        small = ROOT / a.get("exports", {}).get("128", a["path"])
        emit(prefix + iid, small, (128, 128), None, 90, versioned=iid == "both-hands")
        emit(prefix + iid, ROOT / a["path"], None, (512, 512), 90, versioned=iid == "both-hands")
        # A renamed item keeps its art file (rules 1.13: Grapple is Iron Grip, Origami Hands is Both Hands): the catalog
        # entry's `data_id` names the item it belongs to now, and the same images also answer to that name, which is
        # the one the screens ask for ("wick-perk-" + the data id with hyphens). No second copy is written.
        alias = a.get("data_id", "").replace("_", "-")
        if alias and alias != iid and alias not in C[fam]:
            for suffix in ("", "-lg"):
                assets[prefix + alias + suffix] = assets[prefix + iid + suffix]
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
for mid, a in C.get("maps", {}).items():
    emit(mid, ROOT / a["path"], (1600, 1100), None, 80)
for sid, a in C.get("sprites", {}).items():
    w, h = a.get("dimensions", [256, 256])
    emit("sprite-" + sid, ROOT / a["path"], (w // 2, h // 2), None, 90)
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
MAP.write_text(json.dumps(dict(sorted(assets.items())), indent=1) + "\n")
# Spotlight cut-ins (docs/design/cutin-spec.md 9.1): where each portrait's eyes are, keyed by the asset names above, for
# the torn eye strip's crop: {"char-<id>": [x, y], "patron-<id>": [x, y]}.
EYES = {}
for cid, a in C["characters"].items():
    if a.get("eye_line"):
        EYES["char-" + cid] = [a["eye_line"]["x"], a["eye_line"]["y"]]
for pid, a in C.get("patrons", {}).items():
    if a.get("eye_line"):
        EYES["patron-" + pathlib.Path(a["path"]).stem] = [a["eye_line"]["x"], a["eye_line"]["y"]]
(ROOT / "apps/web/src/game/eyelines.json").write_text(json.dumps(dict(sorted(EYES.items())), separators=(",", ":")) + "\n")
print(f"{len(assets)} assets -> {OUT.relative_to(ROOT)}")
