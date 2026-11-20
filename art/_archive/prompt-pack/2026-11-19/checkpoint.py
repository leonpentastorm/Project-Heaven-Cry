"""Write the current continuation note from the delivered records."""
import json
import re
import sys
from collections import Counter
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

D = Path(__file__).parent
STAGE = Path("/workspace/work/prompt-pack-19")
read = lambda path: json.loads(path.read_text())
queue = {r["n"]: r for r in read(D / "queue.json")}
order = read(D / "order.json")
records = {int(p.stem): read(p) for p in (D / "records").glob("*.json")}
done = set(records)
hold = {n for n, row in queue.items() if row["status"] == "held"}
pending = [n for n in order if n not in done | hold]
assert set(order) == set(queue) and not done & hold
available_drafts = [n for n in pending if (STAGE / f"result-{n}.json").exists()]
zone = ZoneInfo("Asia/Saigon")
stamp = datetime.now(zone).strftime("%d %B %Y at %H:%M UTC+7")
quota = None
if "--quota" in sys.argv:
    failures = [read(p) for p in sorted((D / "generation-failures").glob("*.json"))]
    quota = next((r for r in reversed(failures) if "usage_limit_reached" in r["error"]), None)
    assert quota
    match = re.search(r'resets_at\\?":(\d+)', quota["error"])
    if match:
        quota["reset_local"] = datetime.fromtimestamp(int(match[1]), zone).isoformat()
report = {"updated": stamp, "source_baseline": "2020b5c2aa620ec17103b7c11669f643342ed68f",
          "listed": len(queue), "delivered": len(done), "eligible_remaining": len(pending),
          "held": sorted(hold), "completed": sorted(done), "pending_in_order": pending,
          "unreviewed_drafts_on_disk": available_drafts, "image_generation_quota": quota}
(D / "progress.json").write_text(json.dumps(report, indent=2) + "\n")
by_file = Counter(queue[n]["file"] for n in done)
lines = ["# November 19 art continuation", "",
         f"Updated {stamp}. The 88 entries in files 01–04 have **{len(done)} delivered**, "
         f"**{len(pending)} to do** and **{len(hold)} held**. Review candidates require visual approval.", "",
         "| File | Delivered | Total listed |", "| --- | ---: | ---: |"]
for number in ("01", "02", "03", "04"):
    lines += [f"| {number} | {by_file[number]} | {sum(j['file'] == number for j in queue.values())} |"]
if quota:
    reset = quota.get("reset_local", "not supplied by the tool")
    lines += ["", f"Image generation returned HTTP 429 `usage_limit_reached`. Reported reset {reset}. "
               "The exact failed prompts and service response are under generation-failures/."]
lines += ["", "## Pickup", "",
          "Read [the source pack](../../../briefs/prompts-2026-11-19/README.md), "
          "queue.json, order.json and progress.json. Commit 2020b5c2a includes the fourth prompt verification. "
          "The corrected prompts keep Wick's ceramic screen, lantern and capelet. Hand-Off shares retained guard, "
          "Darkened has white dashes, Warding Word has non-letter notches and the City Sigil mark has a chevron.", "",
          "Hold #164 still applies to the Scrap Turret portrait. Called Out is the active challenge modifier in "
          "data/classes.json and has its own November 19 depiction. Wind-up and Read the Swing have new exact paths. "
          "Preserve the separate November 16 delivery and the fully remade Breaker.", "",
          "Use image generation one image per prompt. Set functions.store keys phc19root to the checkout, "
          "phc19jobs to the queue, phc19arc to this archive's repository-relative path and "
          "latest-<filename> to each source document. Evaluate generate-ink.js or generate-painted.js "
          "as a function and pass the corresponding job IDs. Review 16/32/44/64 px sheets against #10151F. "
          "Review paint materials, map joins, firearm silhouettes and grip or part attachment visually. "
          "The generated source path is in scratch result-N.json. Preserve sources before a workspace restart.", "",
          "Run deliver.py review on candidate IDs, inspect the sheet, then run deliver.py deliver on the accepted IDs. "
          "Previous files and exports are archived when replaced. The 37 new perks have masters at their requested "
          "paths and entries under perk_candidates in art/catalog.json until gameplay rules supply their IDs. "
          "Finish with deliver.py verify, the asset build and repository art validation. "
          "Restore generated app assets.json before committing art-only changes.", "",
          "## Remaining entries", ""]
for n in pending:
    j = queue[n]
    lines += [f"- {n:03} | File {j['file']} | {j['title']} | `{j['path']}`"]
    if n == 13:
        lines += ["  - Preserve the old corner until the replacement passes both joins. At 256 px, "
                  "the left opening must be y64–191 and the bottom opening x64–191. Match the original "
                  "straight wall's steel texture, value, cap and centered cyan strip. The third draft in "
                  "[rejected/013-join-v3](rejected/013-join-v3) was closest in finish but missed both openings."]
    if n == 66:
        lines += ["  - Preserve all the current pose and glyph pixels. Add only one small unfinished "
                  "white three-stroke glyph beside the existing one, pointing toward Wick's stylus. "
                  "Full redraws modified the pose and old glyph. The isolated generated motif is under "
                  "[rejected/066-glyph-only](rejected/066-glyph-only)."]
if available_drafts:
    lines += ["", "Unreviewed scratch renders currently on disk: " + ", ".join(map(str, available_drafts)) + "."]
(D / "HANDOFF.md").write_text("\n".join(lines) + "\n")
print(f"{len(done)} delivered, {len(pending)} eligible remaining, {len(hold)} held")
