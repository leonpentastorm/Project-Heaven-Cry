# Survival artwork — first trial

45 review candidates are saved: all 24 fight backdrops and the 21 starred AHOC core pieces. The `survival_art` catalog map registers these candidates and records native/export dimensions, hashes and source paths. All have `implementation_ready: false`; this delivery does not wire them into gameplay.

Start with `review/backdrops-01.jpg` through `backdrops-04.jpg`, `review/ahoc-kit.png`, both ground repeat tests, and `review/wall-joins.png`. `review/grid-darkening-test.jpg` is a mechanical preview at 40% brightness with a mock grid, not a screenshot from the game.

**Known failures:** plate ground is not seamless; corner and broken walls still use failed initial camera/geometry candidates; some sprites need a stricter overhead/shadow-free pass. Straight, end and doorway walls have newer footprint-guided candidates. The backdrop native minimum is unmet: native 1672×941, upscaled exports 2560×1440. Read `REVIEW-NOTES.md` before integrating.

**Remaining:** 249 planned renders, plus corrections to existing candidates. `missing-assets.json` enumerates all 249 exact filenames and subjects; `planned-assets.json` records the complete 294-job baseline. This count includes 10 gear replacements and three new magazine icons.

Copy the continuation prompt from `art/briefs/GPT-CONTINUE-2026-11-13-survival.md` into the next art session. The brief's AHOC trial review gate comes before the other five kits. No painted battle maps have been made yet.

The original generation worker and packaging scripts are historical session provenance and retain `/workspace` paths. Use the archived native copies and repository-relative manifest paths to recover the artwork elsewhere. The usage-limit failure and reported reset are in `generation-status.json`.

Validation: `validation.json` records selected PNG dimensions/modes and source hashes. `texture-seams.json` and `wall-geometry.json` record measurements, including failures; they do not certify readiness. Repository-wide integrity is in `art/checksums.sha256`.
