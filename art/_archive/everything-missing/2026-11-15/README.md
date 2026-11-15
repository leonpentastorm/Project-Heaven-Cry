# Heavenprint: everything missing, 15 November 2026

66 new review candidates: 13 painted gear images, 29 white-ink boons, 3 map markers, 3 keeper portraits, 12 place backdrops, 5 interface marks and 1 Roguelike card. No rows from this brief remain unpainted. No Wick assets or game code were changed.

Start with art/_archive/everything-missing/2026-11-15/review/ALL-66.jpg, then the eight section sheets beside it. Transparent icons have 1024px masters and a central 820px subject box; the exports beside their production folder cover the UI sizes in the brief. Portraits are opaque 800x1000. Scenes are opaque 2560x1440 exports, all upscaled from native renders. Two scene renders were 4:3 and have recorded central widescreen crops. No upscale adds detail. Every native is retained unchanged.

Production files are under art/icons, art/portraits/survival and art/illustrations/survival. The archive contains manifest.json, per-image records, prompts in those records, exact native dimensions, SHA-256 values, the original brief, audit, scripts, UI-size sheets and superseded paintings. The previous safe-room painting and portrait/Devout revisions are preserved. No previously approved art is discarded.

art/catalog.json is updated; catalog-fragment.json supplies only the new entries for easier intake. New boons and interface_icons maps hold the proposed runtime IDs; the marker sheet's marker_exports also includes the three standalone new masters. The builder still must wire those IDs and remove pending flags after approval; the code fallback remains until then. All entries are review-candidate, production_approved false and implementation_ready false.

Validation covers all 66 master/source hashes, output dimensions, 50 transparent master borders/margins, pure-white ink, every UI export, and the repository PNG/white-alpha decoder on all 37 flat-ink 64px exports. Full historical-library validation is limited by the sparse checkout. Read validation.json and full-library-check.txt. Existing global checksum entries are preserved; new and changed files are rehashed without removing absent historical entries.

See MISSING-AFTER-DELIVERY.md for the separate 202-request backlog and delivered art needing integration. This delivery was audited against develop commit ff4e1d4bec7d07548d3ff3c0a5f89080bfc933d4. Branch: art/everything-missing-2026-11-15. All artwork is for review, not a claim of production approval.
