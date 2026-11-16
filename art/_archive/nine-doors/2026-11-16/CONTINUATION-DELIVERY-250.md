# Nine Doors continuation — 250-candidate checkpoint

This continuation delivers **75 new review candidates**, advancing the original ledger from **175 to 250 of 375** painting jobs. The three non-painting rows remain excluded. These are review candidates, not production approvals.

- [Preview all 75 new candidates](review/continuation-overview-250.jpg).
- [Download the cumulative incremental ZIP](deliveries/continuation-250-candidates-increment.zip) and [SHA-256](deliveries/continuation-250-candidates-increment.zip.sha256). This adds the 75 new candidates to the preserved 175-candidate baseline; it is not the complete 250-image library.
- [Current checkpoint](CURRENT-CHECKPOINT.md), [filtered continuation queue](CONTINUE.md), and [separate 0.30 proposal queue](planned-jobs-0.30.json).

The new images cover Durability and Raw Power actions, Dexterity moves, Ingenuity actions, Sigilist actions, Figment traits and Rigger moves, Empathy and Mender moves, Outburst actions, Faith actions, Last Turn and Augment Offline. Per-image records contain the exact prompt, references, native source dimensions and hashes. Actual-size review sheets are in `review/continuation-*.jpg`.

All **28 old hold recipes** remain enforced: 27 are unfinished and held; the previously delivered Palm #258 is preserved. None of the 75 new candidates uses a held recipe. The **41 source-backed 0.30 additions are queued, 0/41 painted**; provisional names, eight options with source questions, replacement depictions and Follow's reuse check remain explicit. Queuing them does not make them completed or approved.

Remaining work: **98 eligible legacy jobs + 27 held legacy jobs + 41 additional 0.30 request records**. The 139 allowed outstanding request records include replacement/reuse checks and do not necessarily require 139 unique paintings. The next legacy priority group starts with technique #325 Lunge.

Verification: all delivered sources, masters, exports and record hashes pass the scoped delivery validator. New ink masters pass the white-ink/alpha audit; changed 44 px exports pass repository safe-box and circular-chip checks. The web asset build passes. All **1,404 master/source/export files for the original 175 candidates match their baseline bytes**, including Palm #258. Native renders were preserved and were not upscaled.

The broader library validator still stops at the pre-existing Bulwark production-manifest export-set mismatch (`Production UI sizes missing: bulwark`). That entry was not changed by this continuation. See [validation results](continuation-validation.json), [full-library log](continuation-full-library-check.txt), and [preservation check](continuation-preservation-check.json).

No gameplay or UI source changes are part of this delivery. Replaced placeholders and rejected drafts are archived. Work is published on `art/nine-doors-2026-11-16`.
