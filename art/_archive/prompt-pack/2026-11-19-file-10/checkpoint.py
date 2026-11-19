"""Write the File 10 continuation note from accepted and declined generations."""
import json
import shutil
from pathlib import Path

ARCHIVE = Path(__file__).resolve().parent
STAGE = Path("/workspace/work/prompt-pack-10")
DEPENDENCIES = {12: 1, 14: 1, 19: 18, 20: 18, 22: 21, 23: 21, 25: 24, 26: 24,
                28: 27, 29: 27, 31: 30, 32: 30}
DECLINED_IN_FILE_09 = {1, 9, 15, 16}

def read(path):
    return json.loads(path.read_text())

failures = {}
for p in sorted(STAGE.glob("failure-*.json")):
    obj = read(p)
    shutil.copy2(p, ARCHIVE / "generation-failures" / p.name)
    err = obj["error"]
    failures[obj["n"]] = ("image service declined this render" if "moderation_blocked" in err else
                          "image generation usage limit" if "usage_limit_reached" in err else
                          err.splitlines()[0])
delivered = {int(p.stem) for p in (ARCHIVE / "records").glob("*.json")}
jobs = read(ARCHIVE / "queue.json")
lines = [
    "# November 19 File 10 gear art",
    "",
    "Branch `art/2026-11-19-reference-repaints` starts from develop `2020b5c2a`.",
    f"**{len(delivered)} of 32** Standard candidates delivered. Numbers 01–17 are repaints of existing gear.",
    "The prompts describe fictional inventory props for Project Heaven Cry.",
    "Each accepted repaint keeps its original master and exports under superseded.",
    "",
    "| No. | Candidate | Status |",
    "| --- | --- | --- |",
]
for row in jobs:
    n = row["n"]
    parent = DEPENDENCIES.get(n)
    if n in delivered:
        status = "delivered as a review candidate"
    elif parent is not None and parent not in delivered:
        status = f"awaits entry {parent:02}"
    elif (STAGE / f"result-{n}.json").exists():
        status = "draft awaiting review"
    elif n in DECLINED_IN_FILE_09:
        status = "repaint declined during File 09"
    else:
        status = failures.get(n, "pending")
    lines.append(f"| {n:02} | {row['title']} | {status} |")
lines += ["", "Published drafts are review candidates. See records, review and generation-failures for exact results.",
          "File 06 and 09 each have an independent delivery branch and track the forms that await these references."]
(ARCHIVE / "HANDOFF.md").write_text("\n".join(lines) + "\n")
print(lines[3])
