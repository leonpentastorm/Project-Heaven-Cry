# Validation — files 05 and 07

`python3 tools/validate_nov19_gear.py --complete` passed for all **39** selected drawings: exact current brief filenames; 1024-square RGBA masters; four RGBA exports each (256/128/64/32); transparent backgrounds and margins; catalog/manifest/source/master/prompt/reference/export hashes; candidate flags; exact queue/progress sets. All 22 family comparisons were inspected at actual 64px and 32px on #10151F, beside their existing references.

The actual `emit`, `gear_key`, data-id setup and gear loop from the unchanged `tools/build_web_assets.py` were run in isolation against these39 entries. All78 resulting WebPs decoded as RGBA at64/256px with transparent backgrounds. All212 catalog gear keys are unique. The existing173 gear entries and all other catalog sections exactly match develop2020b5c2. See `web-build-check.json`. This is a targeted builder check; the full site build and app asset map were not regenerated in this sparse checkout.

Required whole-library command `python3 tools/validate_art.py` was attempted. It exits1 at `FAIL: Missing file: art/portraits/world/new-faces/ivara-drenn.png`, an untouched historical file omitted by sparse checkout. It does not validate the whole library here. Re-run it and `npm run assets` on the integrator's full checkout. No historical validator or delivery count was weakened to bypass this.

The checksum rehasher preserves4889 omitted skip-worktree records only when the index blob and the existing checksum agree with HEAD provenance. It explicitly does not claim their materialized bytes were verified. New and present files are rehashed normally. The sparse-helper audit covered unchanged omissions, new/modified files, ordinary deletions, staged omitted changes and tampered checksum records.

Each drawing passed its targeted check and `git diff --check` before its own commit/push. All new production gear paths are additions; no historical painting was replaced. Native attempts and selected sources are retained. Barrier Wall and Tactical Gloves include preserved pre-correction attempts; their selected versions were corrected using image_gen.
