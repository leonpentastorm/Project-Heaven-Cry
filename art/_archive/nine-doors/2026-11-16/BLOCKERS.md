# Remaining limitations

Image generation returned HTTP 429 `usage_limit_reached` on row #324 (Augment Offline). Reported reset: 16 November 2026, 23:57:55 UTC / 17 November, 06:57:55 Bangkok. No further generation was attempted after the quota response.

175 of 375 requested assets are delivered as review candidates. 200 rows remain, including Last Turn #323, which needs a repaint without glow; its rejected render is preserved under superseded/323-glow-repaint-pending/. Both #323 and #324 retain their existing repository placeholders.

Full-library validation and npm assets were actually run but require historical art inputs absent from this delivery checkout; exact failures are retained in full-library-check.txt and asset-build-check.txt. Scoped delivery validation covers all delivered records.

All delivery art is review-candidate, not approved production artwork. No new action-row UI or other game code was introduced.
