"""Record the claim, exact decisions, and delivered-picture counts."""
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ARCHIVE = Path(__file__).resolve().parent
STAGE = Path("/workspace/work/prompt-pack-08-uniques")

def read(path):
    return json.loads(path.read_text())

claim = read(ARCHIVE / "claim.json")
jobs = read(ARCHIVE / "queue.json")
done = {int(p.stem) for p in (ARCHIVE / "records").glob("*.json")}
peer = claim.get("peer", {})
peer_claimed = set(peer.get("claimed", []))
peer_done = set(peer.get("delivered", []))
assert not peer_claimed.intersection(claim["claimed"]), "Another branch owns these exact subjects"
assert peer_done <= peer_claimed and not peer_done.intersection(done)
decisions = {}
quota = None
for failure in sorted(STAGE.glob("failure-*.json")):
    row = read(failure)
    shutil.copy2(failure, ARCHIVE / "generation-failures" / failure.name)
    error = row["error"]
    decisions[row["n"]] = ("service declined the render" if "moderation_blocked" in error else
                          "waiting for image usage" if "usage_limit_reached" in error else
                          error.splitlines()[0])
    if "usage_limit_reached" in error:
        limit = re.search(r'resets_at[^0-9]*(\d+)', error)
        quota = datetime.fromtimestamp(int(limit[1]), timezone.utc).astimezone(ZoneInfo("Asia/Saigon")).isoformat() if limit else "reset time unavailable"
for review in sorted((ARCHIVE / "rejected").glob("*/REVIEW.md")):
    n = int(review.parent.name.split("-")[0])
    decisions.setdefault(n, "draft needs correction")
ts = datetime.now(ZoneInfo("Asia/Saigon")).strftime("%d %B %Y at %H:%M UTC+7")
unique_count = len(done | peer_done)
total = claim["baseline_delivered"] + unique_count
lines = [
    "# File 08 unique inventory paintings", "",
    f"Updated {ts}. Branch `art/2026-11-19-unique-gear`.",
    f"**{unique_count} of 23 uniques delivered across the verified branches. "
    f"{total} of 215 base pictures and uniques. {total} of 871 across the pack.**",
    f"This branch delivered {len(done)}. The 138-candidate baseline predates both unique branches.",
    "These independent unique paintings have been brought forward while the grade proof is open.",
    "The six uniques with missing or unapproved references still depend on those references.", "",
    "| Entry | Target | Status |", "| --- | --- | --- |"
]
for job in jobs:
    n = job["n"]
    if n in done:
        status = "delivered for review"
    elif n in peer_done:
        status = "delivered on unique-melee-bow"
    elif n in peer_claimed:
        status = "claimed on unique-melee-bow"
    elif job["dependency"]:
        status = "awaiting reference approval or a missing reference"
    elif n in decisions:
        status = decisions[n]
    elif n in claim["claimed"]:
        status = "claimed, awaiting render or review"
    else:
        status = "available"
    lines.append(f"| {n:02} · {job['title']} | `{job['path']}` | {status} |")
if quota:
    lines.extend(["", f"The image service reported a usage limit. Reset {quota}."])
if peer:
    lines += ["", "The melee-and-bow branch owns entries 01–07 and 15. "
              "An overlapping local render batch was stopped before any of those entries was delivered here. "
              f"The counts include its verified progress at `{peer['sha'][:9]}`. "
              "[Melee and bow handoff](https://github.com/leonpentastorm/Project-Heaven-Cry/tree/art/2026-11-19-unique-melee-bow/art/_archive/gear/2026-11-19-unique-melee-bow)"]
lines += ["", "Deliveries include the exact native sources, contact sheets, stable archive hashes and 256/128/64/32 px PNG exports.",
          "The art catalogue marks each new master as a review candidate. No grades are implied.",
          "The [other work claims and dependencies](https://github.com/leonpentastorm/Project-Heaven-Cry/blob/art/2026-11-19-gun-forms/art/_archive/prompt-pack/2026-11-19-file-06/WORK-CLAIMS.md) remain available on the File 06 branch."]
(ARCHIVE / "HANDOFF.md").write_text("\n".join(lines) + "\n")
print(lines[3])
