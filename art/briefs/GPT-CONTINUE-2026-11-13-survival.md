# Continue the unfinished Heavenprint Survival commission

Work in `leonpentastorm/Project-Heaven-Cry`, starting from branch `art/survival-trial-2026-11-13` (or its merged successor). Do the artwork using image generation, not a reminder or a plan alone. Preserve the finished gear delivery and all approved art.

Read these repository files first:

- `art/AGENTS.md`
- `art/style-guide/PHC-Style-Guide.md`
- `art/briefs/GPT-PROMPTS-2026-11-13-survival.md` — full subjects, style blocks and production order
- `art/_archive/survival/2026-11-13-trial/HANDOFF.md`
- `art/_archive/survival/2026-11-13-trial/REVIEW-NOTES.md`
- `art/_archive/survival/2026-11-13-trial/manifest.json`
- `art/_archive/survival/2026-11-13-trial/missing-assets.json` — every one of the 249 pending jobs, with exact path and subject

## What exists

45 selected review candidates: all 24 fight backdrops, plus the 21 starred AHOC core kit pieces. These are registered under `survival_art` in `art/catalog.json`; `implementation_ready` and `production_approved` are false. Individual assets are in `art/illustrations/survival/backdrops/` and `art/sprites/kit/ahoc/`. Native originals, superseded attempts, geometry guides, prompts, contact sheets and tests are archived with the handoff. Do not regenerate the whole set by default.

## What is still missing — 249 planned renders

| Group | Pending |
| --- | ---: |
| AHOC kit remainder | 15 |
| Five other settings' kits | 180 |
| Painted battle maps, three per setting | 18 |
| Path-map directions A and B | 2 |
| Node scenes | 8 |
| Character/creature portraits | 10 |
| Gear follow-ups | 13 |
| Optional Survival cards, last | 3 |
| **Total** | **249** |

The 13 gear jobs comprise **10 replacements and 3 new magazine icons**, not 13 new inventory types. The new files are `mag-magistrate.png`, `mag-brigade_shotgun.png`, and `mag-repeating_crossbow.png`. The plain and Emanator katanas are among the replacements. Follow the exact silhouette changes in numbered prompts 45–57.

AHOC's 15 unmade pieces are K3, K6, K13, K16, K18, K22 and K28–K36: ground-3, scorch decal, broken crate/pillar/barricade, trap, turret, camera, alarm, cache, exit, and four dressing pieces. Other kits are K37–K216. Painted maps are M1–M18. Ordinary prompts 25–60 cover the remaining scenes, portraits, gear and cards.

## Corrections needed in addition to the 249 unmade jobs

1. **K2 / `ground-2.png`:** panel floor fails the repeat test, especially its top/bottom join. A fresh repeat-unit prompt was prepared but generation was quota-blocked. Repaint with image generation; verify both axes in a 3×3 repeat. K1 gravel is improved but still needs visual approval; do not label it certified seamless.
2. **K8 / `wall-corner.png` and K11 / `wall-broken.png`:** selected files are failed initial candidates with the wrong camera/footprint. Their overhead corrections were blocked. Repaint with the footprint references under `geometry-guides/`; match the corrected straight/end/doorway family. The wall band must be 128 px thick in a 256 px cell, with the specified flat-cut edge connections.
3. Audit the kit sprites for front-view drift, baked shadows/glow and scale, particularly low wall, barricade, closed/open door, terminal and lamp. Repaint failures before treating the kit as usable. Do not hide unwanted shading by changing the transparency report.
4. Backdrops are native **1672×941**, exported to **2560×1440 by ordinary upscaling**. That falls below the brief's requested native minimum. Preserve native files and disclose this. If a higher native render becomes available, prioritize it; never claim an upscale adds painted detail.

## Order and technical checks

Finish and show the AHOC trial corrections first. The brief explicitly says to stop and show the core trial before making the other five settings' kits. Get the trial feedback, then follow its decision: continue full kits if ground/wall assembly works; otherwise use the brief's engine-drawn-wall/alternate-ground fallback and make the other settings' cover, objects and dressing. Do not silently change the 249-job baseline if that decision changes scope; record the revised queue.

Then continue the 18 painted maps and remaining batches in the brief's order, incorporating any new user steering. Maps are **strict overhead orthographic, square 2600×2600 requested, at least 2080×2080**, approximately 39 m across, with readable floor and cover, no grid, figures, labels or sky. They are training material, not automatically integrated gameplay maps. Use the archived map anchors and the matching setting's backdrop.

Ground: opaque 1024 square, flat lighting, low contrast, tileable in both axes. Show 3×3 repeats at full and game scale and report seam metrics honestly. Wall pieces: transparent 256 square, exact band geometry and butt joins; show joined runs and corners. Sprites: transparent 256 square except container 384×256, overhead, no cast/contact shadow, consistent 1.5 m tile scale; check at 64 px. Use image generation for painting and corrections; mechanical exports and review assemblies are fine.

Match Heavenprint gouache/ink and the approved references; avoid photography, glossy 3D, generic fantasy drift or copying characters. Preserve natural local lighting and quiet tactical centres. No Wick assets are part of this commission.

Archive superseded files, update catalog and manifests, regenerate checksums, and run the applicable art validation. Deliver finished previews and a downloadable package. Push completed work to a new art branch; do not merge automatically. State exactly what remains and any technical limitations.

The previous run hit `usage_limit_reached`; its reported reset was **14 November 2026 around 09:31 Bangkok time**. Check current availability. If still blocked, report that accurately without fake renders, fake layers or promises of an automatic resume.
