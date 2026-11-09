# Heavenprint divine patrons — eight-colour portrait set

Review candidates; awaiting Leon’s visual approval. No unresolved production question blocks review.

This delivery covers the eight patron portraits (Part A). Patron marks and prayer icons are separate work.

## Direction and overrides

The user’s corrected direction supersedes the brief’s mortal casting: gods appear as monumental sacred apparitions, with ivory effigies, masks or radiant absence. The title-screen Celestial and pilot govern divinity; existing Heavenprint portraits govern gouache and broken ink. Hidden origins are not depicted.

Each patron now has a distinct colour identity. The colour is carried by radiance, vestments and symbolic objects, with ivory and charcoal retained. Palette anchors describe the colour direction, not an indexed palette. The Weaver’s violet, Toll-Keeper’s teal and Matchmaker’s pink intentionally supersede the original overlapping accents.

| PNG / ID | Subject | Accent |
|---|---|---|
| `../../../../portraits/patrons/nerukhan.png` | Ivory judge-effigy, raised hand and nine small halo lights above a tribunal. | pale gold `#E9D6A2` |
| `../../../../portraits/patrons/the_quartermaster.png` | Faceless officer apparition with rectangular aureole, ledger and stamp above a supply citadel. | olive green `#8B9F47` |
| `../../../../portraits/patrons/the_laughing_mask.png` | Floating smiling ivory mask, sweeping bow, theatrical curtains and a blank card. | crimson `#B83243` |
| `../../../../portraits/patrons/the_toll_keeper.png` | Veiled guide with a pole lantern, offered coin and a distant ferry. | silver teal `#79BDB6` |
| `../../../../portraits/patrons/mother_ember.png` | Maternal ivory effigy cradling a kettle within a hearth-flame arc. | ember orange `#ED8A3C` |
| `../../../../portraits/patrons/old_overcast.png` | Cloud-bearded sky apparition bearing an engineered lightning rod beneath a storm ring. | storm blue `#4E8DD1` |
| `../../../../portraits/patrons/the_matchmaker.png` | Ivory figure with spool bandolier, thread-knot halo, planning slab and sheathed scissors. | rose pink `#D879AF` |
| `../../../../portraits/patrons/the_counting_weaver.png` | Faceless auditor apparition with reading-glass arcs, ledger-tape mantle, shuttle and abacus. | violet `#9C82D7` |

## Files and provenance

- Eight named PNGs: 800 × 1000 opaque RGB exports.
- `source-renders/<id>-native.png`: eight untouched final generator outputs.
- `review-sheet.jpg`: labelled four-by-two review sheet; lettering is not in the portraits.
- `manifest.json`: file paths, hashes, actual native dimensions, complete painting and colour-edit prompts.
- `checksums.sha256`: SHA-256 for this package, excluding this checksum file itself.

Native generation sizes: 1122 × 1402. Exports are resized, not claimed as native 800 × 1000 renders. Recolouring was done with image generation, not a global software tint. Original earlier palettes remain outside this delivery.

## Validation

Run `python3 tools/validate_patrons.py` from the repository root. It checks all eight IDs, dimensions, image decoding, unique palettes, native and export hashes, candidate status, catalog bindings and package checksum coverage. Artistic likeness, divinity and colour differentiation were reviewed visually on the contact sheet.
