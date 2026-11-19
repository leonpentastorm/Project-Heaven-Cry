"""Write the File 06 continuation note from the delivery records."""
import json
import shutil
from pathlib import Path

ARCHIVE = Path(__file__).resolve().parent
STAGE = Path("/workspace/work/prompt-pack-06")
REPAINTS = {
    1: "Frontier hand cannon",
    2: "Decrkm SMG and autopistol",
    3: "Legion PDW",
    6: "Mandestra drum gun",
    7: "Mandestra drum gun",
    8: "Hellraiser service rifle and LMG",
    9: "Adamantile battle rifle",
    10: "Adamantile battle rifle",
    12: "Brigade auto-shotgun",
    13: "Brigade auto-shotgun",
    14: "Lumeri scattergun",
    15: "Lumeri scattergun",
}

def read(path):
    return json.loads(path.read_text())

failures = {}
for p in sorted(STAGE.glob("failure-*.json")):
    obj = read(p)
    shutil.copy2(p, ARCHIVE / "generation-failures" / p.name)
    error = obj["error"]
    failures[obj["n"]] = ("image service declined this render" if "moderation_blocked" in error else
                          "image generation usage limit" if "usage_limit_reached" in error else
                          error.splitlines()[0])
finished = {int(p.stem) for p in (ARCHIVE / "records").glob("*.json")}
jobs = read(ARCHIVE / "queue.json")
lines = [
    "# November 19 File 06 gear art",
    "",
    "Branch `art/2026-11-19-gun-forms` starts from develop `2020b5c2a`.",
    f"**{len(finished)} of 17** Standard candidates delivered. The 0.30 holds do not match these destinations.",
    "The submitted prompts describe fictional Project Heaven Cry inventory art.",
    "",
    "| No. | Candidate | Status |",
    "| --- | --- | --- |",
]
for job in jobs:
    n = job["n"]
    if n in finished:
        status = "delivered as a review candidate"
    elif job["needs"]:
        status = "awaiting File 10 repaint of " + REPAINTS[n]
    elif (STAGE / f"result-{n}.json").exists():
        status = "draft awaiting review"
    else:
        status = failures.get(n, "pending")
    lines.append(f"| {n:02} | {job['title']} | {status} |")
lines += ["", "Check the source brief's Attach line for the exact repaint requirement. "
          "Recheck develop and active art branches before resuming. Preserve the approved family references.",
          "The archive contains render sources, visual checks, hashes and invocation failures."]
(ARCHIVE / "HANDOFF.md").write_text("\n".join(lines)+"\n")
print(lines[3])
