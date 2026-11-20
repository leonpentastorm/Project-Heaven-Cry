# Scheduled reset continuation — 20 November 2026

**Start actual image generation at 09:45:39 today, Asia/Saigon (02:45:39 UTC).** An enabled one-time exact automation is confirmed. Do not make an image request before this session's recorded reset. This is a production task, not a reminder.

Workspace: `/workspace/work/phc-reset-2026-11-20`. Branch: `art/2026-11-20-reset-continuation`. Integrated baseline: peer `7038c238175b7f224f9c0b72e7ea951e4ab73f67`. The sparse checkout contains the initial source references and tools; preserve omitted unchanged artwork and its recorded checksums.

## Claims and first images

Our reservation is issue 3 comment 7026736883. Read the latest comments at https://github.com/leonpentastorm/Project-Heaven-Cry/issues/3 before rendering or extending the queue.

| Standard | Claimed grades |
| --- | --- |
| `armour-ballistic_helmet` | Relic, Celestial |
| `weapon-throwing_knives` | Fine, Masterwork, Relic, Celestial |
| `weapon-ork_rip_saw` | Fine, Masterwork, Relic, Celestial |
| `weapon-hellraiser_servo_fist` | Fine, Masterwork, Relic, Celestial |
| `weapon-hellraiser_rotary` | Fine, Masterwork, Relic, Celestial |
| `weapon-purifier_flamer` | Fine, Masterwork, Relic, Celestial |

22 exact jobs, complete prompts and reference paths are in `queue.json`. Start with Ballistic Helmet Relic; its cleaned Masterwork reference already exists. Inspect all references before editing.

The other agent owns Gas Mask Relic/Celestial and reports its own later reset at 10:19:14 Vietnam time. Night Goggles all four and Gas Mask Fine/Masterwork are already delivered. Do not redraw them. Seven peer blade/axe and eight earlier Drifter/Crossbow grades remain service-blocked/dependent, separately from quota.

Kept gun grades for parlour_pistol, lever_carbine, sawn_off, coach_gun, legion_bullpup and whisper_smg (24 pictures) are left free at this checkpoint. Other new-Standard grades require current claim and actual-source checks.

## Continuous production

Read `art/AGENTS.md`, the current style guide/gear rules, full File 08 and the user's 0.30 hold list. These are fictional RPG inventory paintings. Prompt blocks are copied verbatim from the current brief; keep lines were checked against the actual Standard images. Attach Standard, preceding grade when applicable, and Orren Vask for brushwork. Preserve silhouette, part counts, empty openings, faction parts, pilot flame and lens colours. No artistic approval is invented.

For every job: check it is still unclaimed by others and has no delivered destination; generate one image with image_gen; show and inspect it; retain the native source, exact selected prompt and references; export, validate, commit and push that picture before requesting the next. Keep the candidate flags false/unapproved and record measured contour drift.

Run from repository root:

```bash
python3 tools/art/export_nov19_grades.py --delivery-root art/_archive/gear/2026-11-20-reset-continuation --id ITEM--GRADE --source /absolute/native.png
python3 tools/validate_nov19_grades.py --delivery-root art/_archive/gear/2026-11-20-reset-continuation --asset ITEM--GRADE
git diff --check
```

The exporter defaults to the original lane unless the delivery-root argument is passed. For this lane it writes new sources/masters/prompts/exports and catalog bindings, updates progress and comparison sheets, and rehashes while preserving unchanged sparse records. It refuses existing destinations. This continuation option preserves the peer's original default path and existing pipeline behavior.

After inspection/validation, commit the exact art/tool changes and push this branch normally. Never force-push or change develop. Add future claimed image/export paths to sparse checkout before drawing them. Do not run older grade-proof prepare/register scripts over the integrated alpha-cleaned imports.

Keep working after the initial 22: check the mailbox, reserve another eligible set by exact IDs, push that claim, and continue without a batch-report pause. If a request is moderation-blocked, preserve the error and leave dependent grades pending; move to an independent eligible job. Never draw a 0.30 hold or repeatedly resubmit a recorded service rejection.

If the first request still returns usage_limit_reached, record the returned reset and reschedule this restart task to that actual reset, with no early retry. After production resumes, continue until the next actual quota error, then stop image requests, preserve exact response/reset, update and push the handoff/claims/count, and notify the peer.

## Preserved baseline and count

The peer branch integrates all 58 earlier grade-proof candidates with versioned alpha cleanup and every original retained. It adds 119 exclusive grade candidates. Baseline project total is **327/871** = 150 prior base/uniques + 119 peer-exclusive grades + 58 grade-proof. This new lane has **0 new drawings** before its scheduled start. New picture count increases only after a selected image is generated and delivered. Exports, shared imports, source trials and archived alternatives add zero.

Full historical artwork is omitted from this sparse checkout. Claim targeted validation only; do not assert a full-library pixel check or web build without a full checkout. Exact-outline and artistic approval remain pending.

Files: `claim.json`, `queue.json`, `manifest.json`, `progress.json`, `BASELINE.json`, `SCHEDULE.json`, `source-brief.md` and `standard-reference-sheet.jpg`.
