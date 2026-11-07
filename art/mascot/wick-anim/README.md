# Wick menu animations — production queue

**36 of 36 frames delivered: run, stop, idle, hello and wave.** The reset has passed and drawing resumed. This is a review candidate, not production approval. Exact state is in [production-progress.json](production-progress.json); the previous quota response is retained in its limit history.

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

On resume: fetch and safely integrate current implementer commits, read art/AGENTS.md and current guide/sectionB, inspect references and any saved sources, generate one sheet, show it in chat, export/validate and push it before the next sheet. Preserve sources and every revision; never redraw an existing rendered sheet just because its push failed. Deliver the required numbered-frame folders, horizontal strips, GIF and manifest only after actual artwork exists. Leave approval false until Leon reviews it.

A one-time continuation resumed on **7 November 2026**. Each generated sheet is shown, technically exported, checked and pushed before the next render. The [manifest](manifest.json) records only actually delivered clips. [Sources](sources/v1/) retain original image-generated sheets and prompts; [masters](masters/v1/) preserve registered frames. Run `python3 scripts/validate_art.py --wick-anim-only` for incremental validation, and add `--complete-wick-anim` at handoff.
