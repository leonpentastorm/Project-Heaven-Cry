"""Review and deliver File 10 Standard PNGs."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ARCHIVE = Path(__file__).resolve().parent
ROOT = ARCHIVE.parents[3]
DEFAULT_STAGE = Path("/workspace/work/prompt-pack-10")
SIZES = (256, 128, 64, 32)
BASELINE = "2020b5c2aa620ec17103b7c11669f643342ed68f"

def read(path):
    return json.loads(path.read_text())

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def relative(path):
    return path.relative_to(ROOT).as_posix()

def save(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)

def check_frame(image, size):
    alpha = image.getchannel("A")
    assert image.mode == "RGBA" and image.size == (size, size)
    assert alpha.getextrema() == (0, 255), "Missing full transparency or opaque art"
    b = alpha.getbbox()
    assert b and min(b[0], b[1], size - b[2], size - b[3]) >= 1, "Clipped canvas"
    return b

def framed(job, image):
    full = image.convert("RGBA")
    alpha = full.getchannel("A")
    assert alpha.getextrema() == (0, 255), "Missing full transparency in native image"
    box = alpha.getbbox()
    assert box
    cut = full.crop(box)
    span = job.get("span", .87)
    ratio = 1024 * span / max(cut.size)
    fitted = cut.resize(tuple(round(s * ratio) for s in cut.size), Image.Resampling.LANCZOS)
    image = Image.new("RGBA", (1024, 1024))
    image.alpha_composite(fitted, tuple((1024 - s) // 2 for s in fitted.size))
    b = check_frame(image, 1024)
    assert min(b[0], b[1], 1024 - b[2], 1024 - b[3]) >= 50, b
    return image

def scaled(master, size):
    sample = master.resize((size, size), Image.Resampling.LANCZOS)
    if size == 32:
        box = sample.getchannel("A").getbbox()
        if min(box[0], box[1], size - box[2], size - box[3]) == 0:
            sample = Image.new("RGBA", (size, size))
            sample.alpha_composite(master.resize((size - 2, size - 2), Image.Resampling.LANCZOS), (1, 1))
    check_frame(sample, size)
    return sample

def draft(job, stage):
    n = job["n"]
    result = read(stage / f"result-{n}.json")
    raw = Path(result["src"])
    native = ARCHIVE / "native" / f"{n:02}-{Path(job['path']).name}"
    if native.exists():
        assert digest(native) == digest(raw), "Move the earlier source under rejected before retrying"
    else:
        shutil.copy2(raw, native)
    with Image.open(native) as image:
        return framed(job, image), native, list(image.size), result

def preview(jobs, stage):
    canvas = Image.new("RGB", (650, 35 + 245 * len(jobs)), "#10151F")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype("DejaVuSans.ttf", 15)
    draw.text((16, 9), "Project Heaven Cry | Standard candidate review", fill="white", font=font)
    for i, job in enumerate(jobs):
        master, *_ = draft(job, stage)
        y = 35 + 245 * i
        draw.text((16, y + 7), f"{job['n']:02} {job['title']}", fill="white", font=font)
        for x, px in zip((17, 226, 323), (180, 64, 32)):
            thumb = master.resize((px, px), Image.Resampling.LANCZOS)
            canvas.paste(thumb, (x, y + 25), thumb)
            draw.text((x, y + 208), str(px), fill="#b9c2cc", font=font)
        if job["refs"]:
            p = ROOT / job["refs"][0]
            if p.suffix == ".png" and p.is_file():
                with Image.open(p) as anchor:
                    ref = anchor.convert("RGBA")
                    ref.thumbnail((145, 145), Image.Resampling.LANCZOS)
                    canvas.paste(ref, (475, y + 25), ref)
                draw.text((475, y + 208), "Family reference", fill="#b9c2cc", font=font)
    out = ARCHIVE / "review" / ("batch-" + "-".join(str(j["n"]) for j in jobs) + ".jpg")
    canvas.save(out, quality=94)
    print(out)

def register(jobs, stage):
    catalog_file = ROOT / "art/catalog.json"
    catalog = read(catalog_file)
    prepared = []
    for job in jobs:
        n = job["n"]
        record_file = ARCHIVE / "records" / f"{n:02}.json"
        assert not record_file.exists(), f"Already delivered #{n}"
        master, native, dimensions, result = draft(job, stage)
        target = ROOT / job["path"]
        old = catalog["gear"].get(target.stem, {})
        assert not target.exists() or (job.get("repaint") and old.get("sha256") == digest(target)), target
        samples = {size: scaled(master, size) for size in SIZES}
        prepared.append((job, record_file, master, native, dimensions, result, target, old, samples))
    for job, record_file, master, native, dimensions, result, target, old, samples in prepared:
        previous = {}
        if target.exists():
            old_paths = {"master": job["path"], **old.get("exports", {})}
            archived = {}
            for key, old_path in old_paths.items():
                dest = ARCHIVE / "superseded" / old_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                if not dest.exists():
                    shutil.copy2(ROOT / old_path, dest)
                archived[key] = relative(dest)
            previous = {"previous_path": archived.pop("master"), "previous_sha256": old["sha256"],
                        "previous_exports": archived, "previous_source_path": old["source_path"],
                        "previous_native_dimensions": old["native_dimensions"]}
        save(master, target)
        exports = {}
        for size, sample in samples.items():
            out = target.parent / "exports" / str(size) / target.name
            save(sample, out)
            exports[str(size)] = relative(out)
        entry = {**old, "label": job["title"].removesuffix(" (Pattern)").split(" (invented:")[0],
                 "path": job["path"], "sha256": digest(target), "width": 1024, "height": 1024,
                 "background": "transparent", "status": "review-candidate",
                 "production_approved": False, "implementation_ready": False, "exports": exports,
                 "collection": "prompt-pack-2026-11-19-file-10", "native_dimensions": dimensions,
                 "source_path": relative(native), **previous}
        catalog["gear"][target.stem] = entry
        write(record_file, {**job, **entry, "source_sha256": digest(native),
                            "export_sha256": {s: digest(ROOT / p) for s, p in exports.items()},
                            "generator_prompt": result["prompt"]})
    write(catalog_file, catalog)

def verify():
    catalog = read(ROOT / "art/catalog.json")["gear"]
    rows = [read(path) for path in sorted((ARCHIVE / "records").glob("*.json"))]
    for row in rows:
        target = ROOT / row["path"]
        assert digest(target) == catalog[target.stem]["sha256"] == row["sha256"]
        with Image.open(target) as image:
            check_frame(image, 1024)
        native = ROOT / row["source_path"]
        assert digest(native) == row["source_sha256"]
        with Image.open(native) as image:
            assert list(image.size) == row["native_dimensions"]
        for size, path in row["exports"].items():
            sample = ROOT / path
            assert digest(sample) == row["export_sha256"][size]
            with Image.open(sample) as image:
                check_frame(image, int(size))
        if row.get("previous_path"):
            assert digest(ROOT / row["previous_path"]) == row["previous_sha256"]
    write(ARCHIVE / "manifest.json", rows)
    print(f"Verified {len(rows)} Standard candidates, untouched sources and four RGBA exports each.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("review", "deliver", "verify"))
    parser.add_argument("ids", nargs="*", type=int)
    parser.add_argument("--stage", type=Path, default=DEFAULT_STAGE)
    args = parser.parse_args()
    queue = {row["n"]: row for row in read(ARCHIVE / "queue.json")}
    jobs = [queue[n] for n in args.ids]
    if args.action == "review":
        preview(jobs, args.stage)
    if args.action == "deliver":
        register(jobs, args.stage)
    if args.action != "review":
        verify()
