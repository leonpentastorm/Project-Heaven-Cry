"""Package the reviewed masters and their provenance by source file."""
import hashlib
import json
import math
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

D = Path(__file__).parent
ROOT = D.parents[3]
read = lambda p: json.loads(p.read_text())
rows = read(D / "manifest.json")
progress = read(D / "progress.json")
assert len(rows) == progress["delivered"]
batch = D / "deliveries"
batch.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype("DejaVuSans.ttf", 15)
sheet = Image.new("RGB", (1000, 64 + 168 * math.ceil(len(rows) / 8)), "#10151F")
draw = ImageDraw.Draw(sheet)
draw.text((12, 11), f"Project Heaven Cry | November 19 | {len(rows)} review candidates", font=font, fill="white")
draw.text((12, 37), "Files 01–04 • candidate masters • see individual review sheets for actual UI sizes", font=font, fill="#b2becb")
for i, row in enumerate(rows):
    im = Image.open(ROOT / row["path"]).convert("RGBA")
    im.thumbnail((116, 127), Image.Resampling.LANCZOS)
    x, y = i % 8 * 125, 64 + i // 8 * 168
    sheet.paste(im, (x + (125 - im.width) // 2, y), im)
    name = Path(row["path"]).stem.replace("-", " ")
    draw.text((x + 5, y + 130), f"{row['n']:03} {name[:13]}", font=font, fill="white")
    if len(name) > 13:
        draw.text((x + 5, y + 148), name[13:28], font=font, fill="white")
sheet.save(D / "review" / "all-candidates.jpg", quality=92)

for file in sorted({r["file"] for r in rows}):
    selected = [r for r in rows if r["file"] == file]
    paths = {D / "HANDOFF.md", D / "SPEC-UPDATE.md", D / "progress.json", D / "review/all-candidates.jpg"}
    for row in selected:
        paths.add(D / "records" / f"{row['n']:03}.json")
        paths.update(ROOT / row[key] for key in ["path", "source_path"])
        if row.get("previous_path"):
            paths.add(ROOT / row["previous_path"])
        paths.update(ROOT / p for p in row["exports"].values())
    target = batch / f"file-{file}-candidates.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(paths):
            archive.write(path, path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        for path in paths:
            assert archive.read(path.relative_to(ROOT).as_posix()) == path.read_bytes()
    checksum = hashlib.sha256(target.read_bytes()).hexdigest()
    target.with_suffix(".zip.sha256").write_text(f"{checksum}  {target.name}\n")
    print(f"File {file}: verified {len(selected)} images in {target.name} ({target.stat().st_size} bytes)")
