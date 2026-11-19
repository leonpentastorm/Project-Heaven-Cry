# Unique melee and bow handoff

**5/8 selected unique paintings generated, shown, exported, validated and individually pushed.** Three independent briefs were rejected by image_gen. No usage limit or reset timestamp was returned. Branch: `art/2026-11-19-unique-melee-bow`.

| Entry | Item | Result |
| --- | --- | --- |
| 1 | Last Sentence | Delivered |
| 2 | Grandmother’s Teeth | moderation_blocked, exact error retained |
| 3 | Last Crossing | moderation_blocked, exact error retained |
| 4 | Owed in Full | Delivered |
| 5 | Reveille | moderation_blocked, exact error retained |
| 6 | Breath of Morning | Delivered after material correction; first version retained |
| 7 | Rearguard | Delivered |
| 15 | Windfall | Delivered |

Production masters are the exact brief paths in `art/icons/gear/`,1024RGBA, with256/128/64/32 PNG exports. Every catalog entry has grade:unique, status:review-candidate, production_approved:false. `manifest.json` binds sources, versioned masters, selected prompts, all references and export hashes. `attempts/` retains the first Breath of Morning render. `references/line-icons/` contains technical rasterizations of the named SVG references; originals are also hashed and retained in the repo. No existing production art was overwritten.

All5 delivered candidates pass `python3 tools/validate_nov19_uniques.py` (without --complete: the8-item claim is not complete). Five families were inspected at64/32px on#10151F; aggregate reviews are in `reviews/all-delivered-*.png`. The unchanged actual web-builder gear code generated and decoded10 RGBA WebPs at64/256px, with217 distinct catalog gear keys. All pre-existing catalog entries remain identical to f48fcbd2. See `web-build-check.json`. The full app asset map/build was not regenerated in this sparse checkout.

Whole-library `python3 tools/validate_art.py` is required on a full checkout: here it stops at the omitted historical `art/portraits/world/new-faces/ivara-drenn.png`. The sparse-aware rehasher preserves4889 unchanged omitted HEAD records with provenance checks; it does not claim to read their local bytes. Targeted validation covers the delivered new images. Run rehashing, both workers’ delivery validators, the whole-library validator, `npm run assets` and `git diff --check` after normal integration on a full checkout.

This branch descends from the earlier39-image files05/07 delivery and merged3 File10 repaints; those are not new images from this unique run. Other worker8b0bfbb7 reserves unique entries8,10,11,17,19–23; its7 delivered uniques are not merged or redrawn here. Source briefs are unchanged. Current claims, prerequisites and the150/871 pack count are in `art/briefs/prompts-2026-11-19/WORK-CLAIMS.md`.

No active render remains. Exact blocked requests are under `generation-failures/`; no repeated prompt rewriting to bypass service moderation was attempted. No scheduled quota retry is set because none was reported. If explicitly taking over, refresh live claims, preserve every selected and earlier source, and update claim.json before drawing. If a request can proceed, show the image, export, validate, commit and push immediately before the next. The technical exporter is `tools/art/export_nov19_uniques.py`; it refuses already-delivered ids, so revisions need a new versioned workflow.

Develop and the other workers’ branches remain untouched. No grades, title-screen, pet or held portrait work was performed.
