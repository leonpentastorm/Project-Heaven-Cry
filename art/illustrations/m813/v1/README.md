# M813 world illustrations — version 1

Two new Heavenprint review candidates, 1600 × 900 RGB PNGs. Individual assets resolve through `catalog.illustrations`; these are story illustrations, not character or player-skill portraits.

| Catalog ID | Delivery | Visibility |
|---|---|---|
| `outpost813` | [Abandoned rear landing pad](outpost813.png) | Opening-safe |
| `outpost1-repair-bay` | `spoilers/outpost1-repair-bay.png` | **Ending only** |

The [opening-safe overview](previews/opening-safe.png) contains MPAT, the comrade and the landing pad. It deliberately excludes the ending.

The landing-pad image was revised to make the brief's 23 damaged infantry and four medic robots countable: six grey infantry in the nearest row, eight in the middle row and nine in the far row, plus four ivory caped medics. It includes the empty scorch ring, sealed hatch, platinum crates, broken 093 sign and B813 overhead. Canon remains in [MPAT and M813](../../../../docs/lore/MPAT-and-M813.md).

The ending image shows MPAT closing the comrade's chest panel while the repair-bay doors close behind them. Their attention remains on one another. The black hole glimpsed beyond the doors is **not identified as B813**.

All images used the approved Original, New Faces, pilot and First-Patch Revival references. The MPAT portrait provided robot continuity. [Manifest](manifest.json) records source hashes and spoiler flags; shell construction and incidental details remain proposals from [the brief](../../../briefs/m813-mpat.md).

## Integration

Use an explicit asset ID after the ending has been reached. Require `spoiler: true` and `visibility: "ending-only"` for the final image. Exclude the `spoilers/` folder from opening galleries, thumbnail generation, preload manifests and spoiler-free exports. Do not select images with a directory glob. The folder and metadata are routing hints; they are not access control for publicly served static files.
