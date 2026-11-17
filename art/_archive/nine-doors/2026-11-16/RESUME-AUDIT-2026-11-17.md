<!-- current-completion -->
> **Current: Legacy: **348/375 candidates**, zero eligible original jobs; **27 unfinished old recipes held**. Separate 0.30 additions: **0/41 candidates**, **41 requests remain**. All images unapproved. The source table has three non-painting rows; do not count them.  Camp signs #271–274 are completed. Pinned revision-2 art proposals for the eight source-question forks were explicitly authorized by Leon. Read CURRENT-CHECKPOINT.md, CONTINUE.md and current-run-validation.json. Earlier quota and 344-item sections below are historical.**
<!-- /current-completion -->

# Resume after actual image limit — 17 November 2026

This is the current handoff. The 16 November RESUME-AUDIT and blockers.json describe historical states. The latest numeric records and progress.json agree on **344/375 legacy candidates**. This continuation adds **94** to checkpoint 250. All 54 techniques, nine door emblems, nine class portraits, four remaining gloves, and 18 of 22 final legacy jobs are delivered.

**Actual blocker:** image generation returned HTTP 429 `usage_limit_reached` on #271–274 at approximately 07:46 Bangkok on 17 November. #270 rendered successfully and was exported/reviewed. No image exists for the four failed jobs; do not mark them delivered. See generation-limit-2026-11-17.json and generation-failures/. The service reports reset **17 November 2026 13:28:30 Asia/Bangkok**, epoch 1794896910. Check current tools at resumption; do not promise automatic continuation or keep retrying before reset.

## Exact remaining work

1. Four eligible legacy signs, in order: **#271 Step 2: Your free focus**, `art/icons/survival/camp/step-focus.png`; **#272 Step 3: Spend your budget**, `art/icons/survival/camp/step-budget.png`; **#273 Step 4: Your starting boon**, `art/icons/survival/camp/step-boon.png`; **#274 Ready**, `art/icons/survival/camp/step-ready.png`. The exact authoritative paths, ids and Paint/Avoid text are in planned-jobs.json and CONTINUE.md; use those even if a descriptive name here differs. These are object-only pure-white signs, no full Wick. Prepared staging is in continuation-tools/remaining-camp-config.json.
2. **All 41 separate 0.30 requests remain undelivered**: 32 forks, Stand Behind Me, four replacement depictions, Follow, Afterword, Mana Shock and Staggered. Read planned-jobs-0.30.json, CONTINUE-0.30.md, the uploaded art-hold-list-0.30.md, and the pinned source spec now archived as source-doors-3.0-revision-2.md. Derive visual recipes from rules rather than names alone. Keep provisional names and eight source questions explicit; do not imply gameplay approval. Follow inspects reuse before painting once. Scrap Turret portrait #164 remains held; do not add a duplicate Sentinel portrait.
3. **27 unfinished old recipes remain held**. All 28 holds are enforced; already-delivered Palm #258 stays preserved and held for review. The four authorized replacement pictures use NEW 0.30 recipes at old bindings, and must not complete or revive the held old recipe records.

Combined outstanding authorized request records: **45 = 4 legacy + 41 additions**. Three original rows #267–269 are non-painting. Ultimate eligible legacy completion is 348/375, not 375 while these holds remain.

## User correction: fresh Breaker

The user rejected two versions of #44 for impossible axe geometry and explicitly required the whole image remade from scratch before continuing. The active `art/portraits/classes/fighter.png` and records/044.json are a fresh generation with NO prior image references: a new person carrying one conventional single-bit axe upright beside the body, continuous shaft through grip and head socket. Both rejected portraits remain under superseded/044-axe-head-geometry-fix/ and superseded/044-rejected-axe-correction/. Never reactivate them or restore the stale shoulder-carry recipe. See USER-CORRECTIONS.md. Review equipment anatomy, grip and contact visually; technical validators cannot certify them.

## Working tools and resumption setup

The repository is `/workspace/work/phc-nine-doors-production`, a separate sparse worktree on the art branch. Original `/workspace/Project-Heaven-Cry` is preserved. Scratch tools are `/workspace/work/nine-doors-run` with `delivery` symlink to this checkout. All helper sources are archived under continuation-tools/. A different runtime should recreate scratch and symlink, then copy the Python helpers there. Do not use stale paths or checkout-wide resets.

For #271–274, load the full legacy jobs as `store('batchJobs', jobs)` and the checkout as `store('production_root', checkout)`. Evaluate generate-ink-batch.js in functions.exec and call it with the prepared config. It uses tools.image_gen__imagegen, saves result-N.json, then yields the generated image. View actual reference images first. Each tool call accepts at most FIVE referenced paths. Use the image tool for all creative work. Gear requires its own painted references, never the flat-ink helper. Brand-new images without style-reference inputs omit both reference fields.

For each successful legacy render: export-one.py N, review_ids.py N... (or review_painted.py for gear/portraits), VIEW the charcoal sheet and actual-size silhouettes, then seal_batch.py N... . Only seal reviewed candidates: the updater collects all numeric records. On rejection, preserve the draft and native before replacement. Do not numerically complete failed calls. Native images must be copied into the archive before runtime loss.

The existing Python export/update/seal pipeline is for numeric LEGACY records only. Before producing 0.30 additions, extend it deliberately or create a separate pipeline writing records-0.30/<key>.json and progress-0.30.json. Do not place added records into numeric records/ or inflate the 375 denominator. Four replacement bindings require archiving prior placeholder/artwork; newly specified fork IDs do not imply implemented UI lookups. Keep unbound proposed bindings explicit in a separate candidate fragment. No game/UI source changes are authorized by this artwork run.

Wick is the canonical ceramic automaton, pixel screen face, ear discs, offset fasteners, short asymmetric capelet, lantern heart, chunky mittens/boots. The Mind Without Fog cup is only that trait's prop. Pure-white flat ink and real transparent holes, no glow or gray. Object-only recipes must stay object-only. Raw chat thumbnails can make faint transparent RGB look like grunge; inspect charcoal composites and alpha. Faint alpha 9..119 divided by solid alpha >=250 must stay below 0.15. No source upscaling. Portraits use centered aspect-preserving 4:5 crop, then 800x1000 export.

## Verified checkpoint

Scoped delivery validator, all ink alpha audits and changed 44px safe-box/circle checks pass at 344. Web asset build passes, 1960 assets. A fresh baseline check confirms all 1,404 master/native/export files from the original 175, including Palm #258, are unchanged. Full-library validation still fails at the pre-existing historical Bulwark export-set mismatch (`Production UI sizes missing: bulwark`); see full-library-check-344.txt. Do not hide this or claim full validation passed.

The 94-candidate incremental ZIP, preview, SHA-256 and delivery note are linked from CONTINUATION-DELIVERY-344.md. It adds to checkpoint 250; it is not a full 344-image library. Old ZIPs are immutable. Preserve every native render and replaced asset. All delivered images are unapproved review candidates. Publish completed work to art/nine-doors-2026-11-16 with current ledgers, previews, checksums and honest handoff; never promise auto-resume.
