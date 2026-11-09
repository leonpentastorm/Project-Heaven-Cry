# Wick, fully 3D: the Narrator's avatar

**Status, 5 November 2026:** new brief from Leon. Flat white-ink Wick is for **trait and perk icons only**. Wherever the game shows the Narrator (the AI Narrator and the human "I'll narrate" mode), it shows Wick as a **fully 3D, rendered** figure. Nothing 3D exists yet; until it does, the prototype crops the painted model study.

## Who Wick is here

Wick is the EPCCG's printed mascot (style guide section 08; `docs/lore/Wick.md`), drawn after the 258th Medical Unit's field automata. As the Narrator's avatar Wick is **interface, not a character in the world**: the friendly face of whoever is telling the story. Wick never appears in scenes as an NPC because of this brief.

## Build it from what's approved

- **Construction:** style guide section 09 exactly. About 2.4 head-heights tall; broad ivory ceramic head with one clipped upper corner (Wick's own left, viewer-right from the front); recessed dark screen two-thirds of the head's width and half its height, with a generous ceramic rim; side hinge discs; pear-shaped torso; mitten hands (one thumb, three-finger mitten); broad-soled boots; short asymmetric capelet with an uneven hanging tab and an off-centre fastening; round lantern window high on the chest with the 258th's medical cross, **thick equal arms**.
- **References:** `art/style-guide/references/wick-model-study.png` (turnaround and screen faces: the main source), `art/mascot/wick-welcome.png` (Leon's chosen mark: its pose and attitude), `art/icons/traits/mind-without-fog.png` (asymmetry, cape, personality), and MPAT (`art/portraits/m813/mpat.png`) for 258th automaton materials.
- **Materials:** satin-glazed ivory ceramic with large, intentional wear patches and chips at edges (not a tiny scratch map; not glossy plastic); dark recessed screen with emissive warm pixel glyphs (as in the model study); emissive warm lantern heart; restrained brass fasteners and hinge discs; woven oxide-red capelet cloth with real folds.
- **Look:** a stylised, high-quality render, like a premium designer figure: readable planes, soft studio key light, a warm rim from the lantern, soft contact shadow. Chibi proportions stay; don't make Wick photoreal or mechanical-detailed. No skill colours on the model.

## Deliverables (in this order; Leon reviews each step)

1. **Turnaround** for approval before anything else: front, three-quarter, side and back, neutral pose, on `#10151F`.
2. **Avatar render:** three-quarter view, chest up, a slight head tilt, one mitten raised as if mid-sentence (echo the welcome pose's attitude). 1024 × 1024 PNG with transparency, plus the same on `#10151F`. Keep the face and lantern inside a centred circle of 80% of the frame: the UI crops it to circles from 36 px (speaking order) to about 160 px.
3. **Screen states** with the same camera and pose, only the screen and a small head tilt changing, so the UI can swap them: neutral, speaking (two mouth frames), thinking (three blinking dots), amused, grim, surprised, and "the dice are rolling" (eyes as two small spinning dice). No text or numbers on the screen.
4. **Source:** the model and textures as `.glb` (plus the native file), rigged at least for head tilt and arms. The full client puts a 3D dice table in the game (`docs/design/ui-screens.md`, Dice table); a real-time Wick at that table is likely next.
5. **Optional, later:** a 2–3 s idle loop (lantern pulse, small head bob) as WebM or APNG.

## Pass criteria

1. At 36 px in a circle on `#10151F`, the screen face and the lantern still read.
2. The three recognition anchors are unmistakable: clipped-corner head with recessed screen, chibi body, lantern window.
3. The capelet shows in the three-quarter view.
4. The cross arms are thick and equal; it never reads as a gun sight.
5. It looks like the same Wick as the trait icons and the welcome mark, only rendered.

## Delivery

`art/mascot/wick-3d/` with `turnaround/`, `avatar/`, `screen-states/`, `source/` and a `manifest.json` like the test sets'. Catalog family `mascot`, `status: "review-candidate"`. Update `art/checksums.sha256` and run `python3 tools/validate_art.py`.
