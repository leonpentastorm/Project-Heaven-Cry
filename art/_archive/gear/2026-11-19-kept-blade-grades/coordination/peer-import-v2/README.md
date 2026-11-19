# Peer grade import and technical alpha cleanup

Source: `art/2026-11-19-grade-proof` at `676764cfd29663c386e3b79538eef046153cedd3`. **58 drawings, 232 exports;46 new catalog entries and12 canonical shared imports.** This is technical cleanup, not new drawing or artistic approval. All remain review-candidate, production_approved:false, implementation_ready:false. The main renderer's active queue/progress and shared claims were not changed.

Only alpha values below8 are set to zero in each1024 master. RGB, alpha>=8, canvas, pose and solid-alpha silhouette are unchanged. Masters now have at least81px fully clear margins; exports have a transparent one-pixel frame guard. Native sources and original candidate paintings are untouched. All original peer production masters/exports are in `peer-original-production/`. Original metadata/scripts/docs are in `peer-original-metadata/`; earlier peer border revisions remain in their imported original archive. `manifest.json` binds every original and selected file by SHA256. Historical absolute trial-reference paths have explicit mappings in `path-mappings.json`, with original JSON preserved.

The imported peer `delivered/*.json` and `candidate-manifest.json` now select clean v2 masters here, while `candidate-masters/` keeps the original prepared images. Source JSON prompts and their114 selected reference paths are unchanged. `reviews/` contains actual32/64px comparison sheets.

Do not rerun the imported legacy preparation/registration scripts over completed drawings; they precede this technical revision. The copied peer handoff has a notice pointing to these current instructions, and its original bytes are preserved.

## Root integration steps

1. After the concurrent render/export finishes, apply the58 `gear` entries in `catalog-updates.json` using the existing `set_catalog_entry` helper, preserving unrelated catalog formatting and entries. Do not overwrite the whole catalog with the peer catalog.
2. Run `python3 tools/art/import_peer_grades.py --validate --check-catalog`. Run the active grade validator too. This tool never writes catalog.json, checksums.sha256, active queue/progress/HANDOFF or WORK-CLAIMS; it never commits, pushes or renders.
3. Rehash once after all new files are stable, run the relevant validators and `git diff --check`, then stage the tool, this coordination folder, all imported peer archive files,58 peer masters/232 exports, catalog and checksums. Sparse omitted tracked sources may require `git add --sparse`.
4. Update the main handoff/count using distinct IDs: baseline150 +peer58 +main's exclusive delivered count. Shared12 imports, exports, native trials and archived alternatives never count again. Preserve peer quota/blocked-job records and check shared issue3 before claiming released work.

`VALIDATION.json` is the independent artifact check performed before root catalog application. Rerunning `--import` validates an existing completed import without overwriting it.

Peer quota reset:20 November2026 at09:45:39 Vietnam time (02:45:39UTC), epoch1795142739. Ten headgear jobs were released; three separate moderation failures leave eight other pending/dependent grades. The copied peer handoff's229/871 count is a historical snapshot, not this branch's current total.
