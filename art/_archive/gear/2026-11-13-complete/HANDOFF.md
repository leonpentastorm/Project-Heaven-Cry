# Heavenprint gear: 151 icons — 13 November 2026

149 icons from `art/briefs/GPT-PROMPTS-2026-11-13-gear.md`, plus the user-requested katana and Emanator katana. All remain review candidates, not production-approved.

## Use these files

- Masters: `art/icons/gear/<kind>-<id>.png`, 1024 × 1024 straight-alpha RGBA.
- UI exports: `art/icons/gear/exports/{256,128,64,32}/<same filename>.png`.
- Index: the `gear` map in `art/catalog.json`, keyed by file stem, with repository-relative paths and SHA-256.
- This folder: selected native renders, superseded gun/crossbow candidates, prompts, numbered review sheets, manifest and validation report.
- Start review with `review/new-additions.png`, then `overview-01.png` through `overview-07.png`. Light-background and actual 64/32 px sheets are alongside them.

Native generation dimensions are 1254 × 1254. Masters were mechanically cropped to alpha bounds, uniformly downsampled and centered. The 32 px exports have a one-pixel transparent guard against resampling fringes. No synthetic detail enhancement or AI upscaling was used.

The four starter guns use the refreshed designs. The repeating crossbow uses the corrected string and clean-alpha revision. The other twenty starter icons are retained. Newly added brief items are the Attuner (148) and toxin vial (149). Additions 150–151 are `weapon-katana` and `weapon-emanator_katana`; they are art concepts and do not add weapon statistics or rules IDs.

## Implementation boundary

The catalog now registers all 151 icons and their supplied exports. The monoline SVGs remain available. The current `tools/build_web_assets.py` does not emit the `gear` map yet: wiring painted gear into the web build/runtime is still an implementation task. Use the catalog paths rather than deriving new paths from these review sheets. No game balance, item records, UI behavior or rarity variants are changed by this art branch.

Full provenance retains the original generator workspace paths in historical prompts and records. Those paths document the session; the manifest's `source` paths identify the portable native copies in this repository. Archived packaging scripts reproduce the original download layout, not the repository import layout.

## Validation

Run `python3 tools/validate_gear_art.py` for this delivery, then `python3 tools/rehash_art_checksums.py` and `python3 tools/validate_art.py` for the art library. `art/checksums.sha256` is the repository-wide checksum list. The ZIP handoff's old root checksum file is deliberately not copied because export paths changed on import.
