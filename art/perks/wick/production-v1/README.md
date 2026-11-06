# Wick perk production — version 1

New perk icons are delivered incrementally from [the production brief](../../../briefs/wick-production-icons.md), using the same pure-white Wick ink as traits. Supreme Command is in [round 2](../../../traits/wick/test-set-1/revisions/README.md); the catalog selects the later [round-3 Field Surgeon](../../../traits/wick/test-set-1/revisions/round-3/field-surgeon.png).

Every new icon has a 1024 × 1024 transparent master, 256/128/64/56/48/44/40 px exports, a catalog entry and source hash in `manifest.json`. Each batch gets actual-size review sheets and a light/dark comparison. See [production progress](../../../traits/wick/production-progress.json) for delivered IDs and counts. Each image is shown in chat and pushed separately. New art remains `review-candidate`, `production_approved: false` pending review.

The [complete library handoff](../../../traits/wick/library-review-v2/README.md) covers all 106 perks, with 72/82/92 px medallion comparisons for the 27 Mastered icons. All six Ultimate catalog entries are `visibility: awarded-only`.

## Review 4 — 5 November 2026 (55 perks, plus the review-3 trait fixes)

Reviewed by Claude for Leon on 128 px sheets and 48 px actual-size strips, on `#10151F`. Leon can overrule any verdict. The icons are live in the UI prototype: each skill's "?" entry now lists its two Acquired perks with the icon (click to enlarge).

**Overall:** the strongest run yet. The 55 perks match the traits in line weight, screen faces, capelet and cross; several carry the whole meaning in one prop: Flat Line (the screen itself is the flat line), Footnote (Wick inside the open book), You Get Used to It (umbrella in a storm), Bulwark, Red Line, Wall Run, Rally Cry, Heart Overload.

**Trait fixes from review 3:** Southern Fist, Sworn Sibling and Daggerfall Veteran were redrawn. Southern Fist and Daggerfall Veteran now pass. Sworn Sibling still fails (below).

**Pass (52 perks):** every perk not listed below.

| # | Icon | Verdict | What to change |
|---|---|---|---|
| 9 | Into the Dark | Fix | Wick is seen from behind, so there's no screen, and at 48 px it reads as a stone arch with a blob in it. Turn Wick three-quarter toward the viewer at the threshold, screen glowing, the dark beyond the arch. Keep the arch. |
| 50 | Holy Ordnance | Fix | The head is a knight's visor, not Wick's clipped-corner head with its screen: it loses the first recognition anchor. Keep Wick's head and screen and put the holiness in the prop (a blessed shell or a censer cannon), not in a costume. |
| 76 | Supreme Command | Fix | Four figures at 48 px read as noise, and the brief allows only one full figure. Make it one Wick on the crate, bigger, one mitten pointing forward, with the troops as a row of small helmet shapes or banners beneath. |
| trait 46 | Sworn Sibling | Fix again | It's now two whole Wicks, small and far apart. At 48 px it's two specks, and a second full figure breaks the one-figure rule. One Wick, big, with the cord-tied hand reaching out of frame toward someone we don't see. |

**Still to come (paused at the image limit):** Real Power and the 20 Batch F perks (15 Achieved, 5 Ultimate). The prototype shows a dashed "icon soon" box for Real Power until it lands.

## Review 4 delivery — 6 November 2026

All four requested icons have new selected versions: Into the Dark v2 restores the three-quarter screen at the arch; Holy Ordnance v2 uses the normal Wick head and a blessed shell; Supreme Command round 4 uses one commander and three empty helmets; Sworn Sibling v4 uses Leon’s explicitly requested two-Wick oath toast, closer and larger. His two-person reference overrides the reviewer’s one-figure proposal for that icon. See the [corrections sheet](../../../traits/wick/library-review-v2/review-4/previews/review-4-corrections-128px.png).

Batch F, its three added combo perks, and all 27 Batch G Mastered icons are delivered. Mastered stars use the shared upper-left mark and every master fits the 90% circle; no medal frame is baked into the artwork. Clean Draw and Judgement Day v2 reserve the four-point star for the Mastered mark. Make Way, Verse of War and Last Charge v2 remove translucent source haze without changing the drawing. Earlier versions remain preserved.
