"""Review and export images from the 19 November prompt pack."""
import argparse
import hashlib
import importlib.util
import json
import math
import re
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ARCHIVE = Path(__file__).parent
ROOT = ARCHIVE.parents[3]
STAGE = Path("/workspace/work/prompt-pack-19")
COLLECTION = "prompt-pack-2026-11-19"
RESAMPLE = Image.Resampling.LANCZOS
INK = {"wick", "sign"}


def read(path):
    return json.loads(path.read_text())


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path):
    return path.relative_to(ROOT).as_posix()


def save(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def export(image, size, kind, name):
    image = image.convert("RGBA")
    if kind == "ground" or name == "wall-corner":
        assert min(image.size) >= size
        return image.resize((size, size), RESAMPLE)
    box = image.getchannel("A").getbbox()
    assert box and image.getchannel("A").getextrema() == (0, 255), "Missing transparent background or solid ink"
    cut = image.crop(box)
    scale = min(size * .8 / cut.width, size * .8 / cut.height, 1)
    if kind == "wick":
        y, x = np.where(np.asarray(cut.getchannel("A")) >= 16)
        radius = np.hypot(x - (cut.width - 1) / 2, y - (cut.height - 1) / 2).max()
        scale = min(scale, size * .43 / radius)
    cut = cut.resize(tuple(round(v * scale) for v in cut.size), RESAMPLE)
    out = Image.new("RGBA", (size, size))
    out.alpha_composite(cut, ((size - cut.width) // 2, (size - cut.height) // 2))
    if kind in INK:
        alpha = out.getchannel("A")
        a = np.asarray(alpha)
        ratio = ((a >= 9) & (a <= 119)).sum() / max(1, (a >= 250).sum())
        assert ratio < .15, f"Too much faint alpha ({ratio:.3f})"
        out = Image.new("RGBA", out.size, (255, 255, 255, 0))
        out.putalpha(alpha)
    return out


def thumbnail(image, size, white=False):
    small = image.resize((size, size), RESAMPLE)
    if white:
        alpha = small.getchannel("A")
        small = Image.new("RGBA", small.size, (255, 255, 255, 0))
        small.putalpha(alpha)
    return small


def draft(job):
    n = job["n"]
    assert job["status"] == "pending", job
    result = read(STAGE / f"result-{n}.json")
    source = Path(result["src"])
    dest = ARCHIVE / "native" / f"{n:03}-{Path(job['path']).name}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        assert sha(dest) == sha(source), "Archive the rejected draft before retrying"
    else:
        shutil.copy2(source, dest)
    image = Image.open(dest)
    size = 256 if job["kind"] == "kit" else 1024
    save(export(image, size, job["kind"], Path(job["path"]).stem), STAGE / f"draft-{n}.png")
    return image.size, dest


def review(jobs):
    cell_w, cell_h, cols = 246, 278, 4
    canvas = Image.new("RGB", (cell_w * cols, cell_h * math.ceil(len(jobs) / cols)), "#10151F")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype("DejaVuSans.ttf", 13)
    for i, job in enumerate(jobs):
        n = job["n"]
        draft(job)
        im = Image.open(STAGE / f"draft-{n}.png").convert("RGBA")
        x, y = i % cols * cell_w, i // cols * cell_h
        preview = thumbnail(im, 180)
        canvas.paste(preview, (x + 33, y), preview)
        draw.text((x + 9, y + 181), f"{n:03} {Path(job['path']).stem}", fill="white", font=font)
        for xx, p in zip((12, 57, 112, 169), (16, 32, 44, 64)):
            small = thumbnail(im, p)
            canvas.paste(small, (x + xx, y + 205 + (64 - p) // 2), small)
            draw.text((x + xx, y + 262), str(p), fill="#aeb8c6", font=font)
    path = ARCHIVE / "review" / ("batch-" + "-".join(str(j["n"]) for j in jobs) + ".jpg")
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, quality=94)
    print(path)


def binding(job, catalog):
    path = Path(job["path"])
    candidates = [(family, k) for family, rows in catalog.items() if isinstance(rows, dict)
                  for k, value in rows.items() if isinstance(value, dict)
                  and (value.get("path") == job["path"] or value.get("wanted") == job["path"])]
    if candidates:
        assert len(candidates) == 1, candidates
        return candidates[0]
    stem = path.stem
    if job["n"] in range(49, 53):
        return "fork_icons", "fork-figment-" + stem.removeprefix("figment-").replace("-", "_")
    if job["n"] == 1:
        return "interface_icons", "banner-fight-approach"
    family, prefix = {"perks": ("perks", ""), "banners": ("interface_icons", "banner-"),
                      "moves": ("move_icons", "move-"), "conditions": ("condition_icons", "cond-"),
                      "gear": ("gear", "")}.get(path.parent.name, ("kit", f"kit-{path.parent.name}-"))
    return family, prefix + stem


def archive_previous(path):
    archived = ARCHIVE / "superseded" / path.relative_to(ROOT)
    archived.parent.mkdir(parents=True, exist_ok=True)
    if not archived.exists():
        shutil.copy2(path, archived)
    return {"previous_path": rel(archived), "previous_sha256": sha(archived)}


def deliver(jobs):
    catalog_path = ROOT / "art/catalog.json"
    catalog = read(catalog_path)
    for job in jobs:
        n, kind = job["n"], job["kind"]
        record_path = ARCHIVE / "records" / f"{n:03}.json"
        assert not record_path.exists(), f"Already delivered {n}"
        dimensions, source = draft(job)
        target = ROOT / job["path"]
        image = Image.open(STAGE / f"draft-{n}.png")
        family, key = binding(job, catalog)
        entry = catalog.setdefault(family, {}).get(key, {}).copy()
        old = ROOT / entry.get("path", job["path"])
        if old.is_file():
            entry.update(archive_previous(old))
            for file in entry.get("exports", {}).values():
                if (ROOT / file).is_file():
                    archive_previous(ROOT / file)
        save(image, target)
        exports = {}
        sizes = {"wick": (256, 128, 64, 56, 48, 44, 40, 32, 24),
                 "sign": (256, 128, 64, 48, 44, 32, 24, 16),
                 "gear": (256, 128, 64, 32)}.get(kind, ())
        if family == "perks":
            sizes = (256, 128, 64, 56, 48, 44, 40)
        for size in sizes:
            out = target.parent / "exports" / str(size) / target.name
            save(thumbnail(image, size, kind in INK), out)
            exports[str(size)] = rel(out)
        label = re.sub(r"^\d+\. ", "", job["title"]).split("`: ")[-1]
        entry.update(label=label, path=job["path"], sha256=sha(target), width=image.width,
                     height=image.height, format="png", mode=kind, status="review-candidate",
                     production_approved=False, implementation_ready=False,
                     background="opaque" if kind == "ground" else "transparent",
                     collection=COLLECTION, native_dimensions=list(dimensions), source_path=rel(source),
                     upscaled=False, exports=exports,
                     brief=f"art/briefs/prompts-2026-11-19/{job['source']}:{job['line']}")
        entry.pop("placeholder", None)
        entry.pop("wanted", None)
        if kind in INK:
            entry["ink"] = "#FFFFFF"
        if family == "kit":
            # The delivery is a candidate. Existing map behavior remains in place until visual intake.
            piece = target.stem
            piece_kind = {"poi": "prop", "sigil_wall": "wall", "sigil_mark": "decal",
                          "pile": "dressing"}.get(piece, "floor" if kind == "ground" else
                                                    "wall" if piece.startswith("wall-") else "dressing")
            entry.update(setting=target.parent.name, piece=piece, kind=entry.get("kind", piece_kind),
                         use=False, why="Review candidate from the 19 November prompt pack")
        catalog[family][key] = entry
        result = read(STAGE / f"result-{n}.json")
        result.pop("src")
        write(record_path, {**job, **entry, **result, "family": family, "id": key,
                            "source_sha256": sha(source), "export_sha256":
                                {s: sha(ROOT / p) for s, p in exports.items()}})
    write(catalog_path, catalog)


def verify():
    catalog = read(ROOT / "art/catalog.json")
    files = sorted((ARCHIVE / "records").glob("*.json"))
    rows = [read(p) for p in files]
    spec = importlib.util.spec_from_file_location("art_validator", ROOT / "tools/validate_art.py")
    validator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(validator)
    for row in rows:
        image = ROOT / row["path"]
        assert sha(image) == row["sha256"] == catalog[row["family"]][row["id"]]["sha256"]
        assert sha(ROOT / row["source_path"]) == row["source_sha256"]
        assert list(Image.open(ROOT / row["source_path"]).size) == row["native_dimensions"]
        assert Image.open(image).size == (row["width"], row["height"])
        if row.get("previous_path"):
            assert sha(ROOT / row["previous_path"]) == row["previous_sha256"]
        for size, path in row["exports"].items():
            im = Image.open(ROOT / path)
            assert im.mode == "RGBA" and im.size == (int(size), int(size))
            assert sha(ROOT / path) == row["export_sha256"][size]
            if row["kind"] in INK:
                assert im.convert("RGB").getextrema() == ((255, 255),) * 3
        if row["kind"] in INK:
            small = row["exports"]["44"]
            validator.validate_white_rgba((ROOT / small).read_bytes(), small,
                                          circle=row["kind"] == "wick",
                                          clear_border=True, box_fraction=.85)
    write(ARCHIVE / "manifest.json", rows)
    print(f"Verified {len(rows)} candidate masters, native sources, exact UI exports and prior-file hashes.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["review", "deliver", "verify"])
    parser.add_argument("ids", type=int, nargs="*")
    args = parser.parse_args()
    queue = {job["n"]: job for job in read(ARCHIVE / "queue.json")}
    jobs = [queue[n] for n in args.ids]
    if args.action == "review":
        review(jobs)
    elif args.action == "deliver":
        deliver(jobs)
        verify()
    else:
        verify()
