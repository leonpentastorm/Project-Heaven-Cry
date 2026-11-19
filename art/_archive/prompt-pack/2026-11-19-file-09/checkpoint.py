"""Write the handoff from the File 09 delivery records and the image service results."""
import json
import shutil
from pathlib import Path

ARCHIVE = Path(__file__).resolve().parent
STAGE = Path("/workspace/work/prompt-pack-09")
BRANCH = "art/2026-11-19-heavy-and-strange"
DEPENDENCIES = {1: [19], 2: [19], 3: [20], 4: [20], 5: [21], 7: [18], 8: [18], 21: [17]}

def read(path):
    return json.loads(path.read_text())

jobs = sorted(read(ARCHIVE / "queue.json"), key=lambda row: row["n"])
delivered = {int(p.stem) for p in (ARCHIVE / "records").glob("*.json")}
failures = {}
for file in sorted(STAGE.glob("failure-*.json")):
    result = read(file)
    message = result["error"]
    if "at most 5 paths" in message:
        continue
    shutil.copy2(file, ARCHIVE / "generation-failures" / file.name)
    failures[result["n"]] = "image service declined this render" if "moderation_blocked" in message else message.splitlines()[0]
drafts = {int(p.stem.split("-")[-1]) for p in STAGE.glob("result-*.json")}
lines = [
    "# November 19 File 09 gear art",
    "",
    f"Delivery branch `{BRANCH}` starts from develop commit `2020b5c2a`.",
    f"**{len(delivered & set(range(1, 17)))} of 16** File 09 Standard masters delivered.",
    "File 09 is independent of the separate File 05 and 07 delivery. The 0.30 hold list contains no matching entries.",
    "The four higher grades wait for approved Standard masters.",
    "",
    "| No. | Candidate | Status |",
    "| --- | --- | --- |",
]
for job in jobs:
    n = job["n"]
    unmet = set(DEPENDENCIES.get(n, [])) - delivered
    status = ("delivered as a review candidate" if n in delivered else
              "awaits prerequisite " + ", ".join(str(x) for x in sorted(unmet)) if unmet else
              "render ready for review" if n in drafts else failures.get(n, "pending"))
    lines.append(f"| {n:02} | {job['title']} | {status} |")
lines += [
    "",
    "Entries 17–21 are File 10 dependencies named by File 09. Each dependent form uses the reviewed repaint.",
    "Queue, exact prompts, original renders, review sheets and the asset hashes are in this archive.",
    "If resuming, consult the current source brief first and verify that its referenced paths still match.",
]
(ARCHIVE / "HANDOFF.md").write_text("\n".join(lines) + "\n")
print(lines[3])
