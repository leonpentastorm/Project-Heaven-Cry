# File 08 grade proof

Fine-grade attempts from the two existing Standard masters at develop `2020b5c2a`. These are proof drafts.

| Item | Solid-alpha overlap after uniform frame alignment | Review |
| --- | ---: | --- |
| Katana | 92.4% | The blade and handle boundaries moved and a faint halo appears beyond the sword tip. |
| Drifter revolver | 97.4% | Much closer visually, with local changes around the spur, guard, and tip. |

[Fine proof comparison](review/fine-shape-proof.jpg)

The second pass gave each image edit only its own Standard as a visual reference. It removed the Katana's visible halo and brought the main contours closer.

| Item | Solid-alpha overlap after uniform frame alignment | Differing pixels at 32 px | Differing pixels at 64 px |
| --- | ---: | ---: | ---: |
| Katana | 96.9% | 0 | 3 |
| Drifter revolver | 97.67% | 3 | 8 |

[Second pass with 50% overlays](review/fine-proof-retry.jpg) · [Measurement details](review/fine-proof-retry.json)

Overlap is intersection over union of two masks at alpha 128. Uniform resizing and translation were used only for review. The native PNGs are unchanged in drafts. The source Standards are intact. Both contour masks still differ from their Standards, so File 08's exact-outline check and higher grades are still pending.
