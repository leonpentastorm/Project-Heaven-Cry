# Wick menu animations — v1 handoff

**36 of 36 frames delivered: run, stop, idle, hello and wave.** Four sheets were generated, shown and pushed individually on 7 November 2026. These are review candidates, not production approved. Exact state is in [production-progress.json](production-progress.json); the previous quota response is retained in its limit history.

Leon requested only the two animated Wick families in [sectionB of the brief](../../briefs/title-screen.md#b-wicks-menu-animations). Title-screen key art, its instructions and screen implementation are excluded from this run. The source brief is unchanged.

The two families require five clips and 36 delivered frames:

| Clip | Frames | FPS | Loop |
|---|---:|---:|---|
| run |8|12|yes|
| stop |4|12|no|
| idle |4|8|yes|
| hello |16|12|no|
| wave |4|10|yes|

Frames: 256×256 RGBA, white ink, transparent, nominal 200 px Wick, registered sole baseline y240. Right-facing identity is never mirrored; hello turns toward the viewer. The run has footfalls on frames 2/6 (one-based). Test every frame at 48 px character height. The welcome mark is primary; preserve the clipped head, pixel screen, capelet, boots and thick equal-arm lantern cross.

[production-plan.json](production-plan.json) retains the exact sequence plan and approved-reference hashes. Four prepared image-generation sheet prompts are in [plans/v1](plans/v1/); wave reuses the hello apex drawings 7–10, so the hold matches its fall. Neutral idle can be reused at stop/hello endpoints for an exact handoff. All creative poses must be drawn with image_gen. Cropping, ink separation, frame registration and animated previews are technical exports only.

Registered frames keep baseline y240. A root-motion track and optional presentation variants carry the hello’s jump without breaking that registration. Native 16-frame hello at 12fps lasts 1.333s; playback acceleration for a screen transition belongs to the consumer. No game/title-screen implementation is part of this art job.

Future revisions: fetch and safely integrate implementer commits; read the current guide/section B, inspect approved references and retained sheets, generate one sheet, show it, export/validate and push before the next render. Use sources/v2 and masters/v2 (or a later version) for revisions; do not replace the v1 drawings. Leave approval false until Leon reviews it.

A one-time continuation resumed on **7 November 2026**. Each generated sheet is shown, technically exported, checked and pushed before the next render. The [manifest](manifest.json) records only actually delivered clips. [Sources](sources/v1/) retain original image-generated sheets and prompts; [masters](masters/v1/) preserve registered frames. Run `python3 scripts/validate_art.py --wick-anim-only` for incremental validation, and add `--complete-wick-anim` at handoff.

The four image-generated sheets supply 30 unique drawings across 36 delivered frame slots. Stop frame 3 and hello frame 15 reuse idle frame 0 exactly. Wave frames 0–3 reuse hello frames 7–10 exactly. No poses were drawn, mirrored or puppeted by code; the exporter only separates ink, crops, scales the sheet uniformly and registers the drawn boot soles.

Use the numbered folders and root strips for fixed registration; `manifest.json` provides `root_motion_y`. Alternatively use `presentation/` frames or strips, which bake in only that translation. Apply one approach: do not add the track to presentation images again. `preview.gif` uses presentation frames on a dark review surface, playing run → stop → idle → hello → wave at the native rates above. Individual GIFs and light/dark 48px body-height contact sheets are in `previews/`. The GIF palette's opaque surface is review-only; gameplay PNGs are white RGBA on transparency.

Run footfalls are indices 1/5 (frames 2/6 one-based). All registered PNGs have the bottom of the sole at y240 (last occupied row239). Root-motion and unambiguous aliases are recorded per frame, with hashes for the sheets, frames, strips, reviews and previews. The central catalog entry is `animation_manifests.wick-menu`. No gameplay or title-screen code was changed for this handoff.

Validation passed for the full existing library and all five animation clips. Animation checks cover white RGBA pixels, y240 registration, source/frame/strip hashes, 48px reviews, exact aliases, root motion and GIF timing. The animation exporter and pixel/GIF validator require Pillow. GIF delays distribute 10ms rounding across frames to preserve native clip timing. The one-time continuation has no future run.
