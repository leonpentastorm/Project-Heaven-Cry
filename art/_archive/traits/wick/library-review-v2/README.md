# Wick library — complete icon handoff

All **180 icons** are delivered: **74 traits and 106 perks** (54 Acquired, 19 Achieved, 6 Ultimate, 27 Mastered). This includes the four Review 4 corrections and the three added combo perks. Each drawing was shown in chat and pushed separately; every icon has 256/128/64/56/48/44/40 px UI exports.

New artwork remains `review-candidate`, `production_approved: false`, pending Leon’s visual approval. The central [catalog](../../../../catalog.json) selects the active version; earlier masters and revisions are preserved. The [progress record](../production-progress.json) is the current completion source; the older usage-limit queue is retained as a historical brief snapshot.

## Review sheets

- [74 traits at 128 px](traits/previews/traits-library-128px.png) and [44 px](traits/previews/traits-library-44px.png).
- [106 perks at 128 px](perks/previews/perks-library-128px.png) and [44 px](perks/previews/perks-library-44px.png).
- [27 Mastered medallions at 72 px](mastered/medallions-72px.png), [82 px](mastered/medallions-82px.png) and [92 px](mastered/medallions-92px.png). Rings are review UI only, never baked into an icon.
- [Review 4 corrections at 128 px](review-4/previews/review-4-corrections-128px.png) and [48 px](review-4/previews/review-4-corrections-48px.png).
- Trait/perk folders also contain 40/48/56 px sheets and light/dark 64 px comparisons.

## Implementation

Use catalog paths and `data_id`, never a filename glob. All seven UI sizes are present, including missing sizes added for the four retained designs. Masters are transparent pure-white flat ink; the exact approved Mind Without Fog source remains unchanged and its white UI derivatives are selected separately.

Mastered entries have `tier: mastered`, `mastered_mark` and `medallion_safe_circle: 0.9`. Each uses one upper-left four-point star; Clean Draw and Judgement Day were revised to remove competing star shapes. The validator checks that visible master ink fits the 90% circular safe area. Ultimate entries have `visibility: awarded-only`; show them in gameplay only after award. These full-library review sheets are internal and include the secret Ultimate artwork.

Sworn Sibling v4 retains Leon’s explicit two-Wick oath-toast exception, bringing the figures closer for small-size readability. It supersedes the reviewer’s proposed return to a one-Wick cord composition.

Run `python3 tools/validate_art.py --complete-icons` for full 74/106 coverage, export formats, white ink/alpha, medallion bounds, metadata and checksums.
