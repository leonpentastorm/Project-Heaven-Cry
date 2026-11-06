# Art asset layout

> **ICON PRODUCTION COMPLETE (6 November 2026):** all **74 trait and 106 perk icons (180 total)**, including four Review 4 corrections, three added combo perks and 27 Mastered capstones, are drawn and pushed. [Full review and implementation handoff](traits/wick/library-review-v2/README.md). New images await Leon’s visual approval.

- `catalog.json` is the integration entry point. All paths in it are relative to the repository root.
- `skills/poc4-palette-v3/` contains the 27 current abstract player-skill portraits. Versioned paths prevent an earlier POC from silently replacing them.
- `character-portraits/` holds 145 painted character portraits: three original sets of 27, eighteen M813 portraits and 46 archetype player-card candidates. None are skill icons; see its README.
- `traits/wick/mind-without-fog/` contains the exact approved Wick trait icon and trait description.
- `traits/wick/test-set-1/` contains ten review candidates (eight traits and two perks), transparent masters, UI exports and review sheets. Production approval is pending.
- `traits/wick/test-set-1/revisions/` holds seven round-2 fixes. New icons arrive in `traits/wick/production-v1/` and `perks/wick/production-v1/`, each pushed individually; `traits/wick/production-progress.json` records complete coverage of 74 traits and 106 perks.
- `traits/wick/library-review-v2/` indexes the complete 180-icon library; `library-review-v1/` retains the earlier 5 November checkpoint. Every delivered icon has 256/128/64/56/48/44/40 px exports; `traits/wick/reference-ui-v1/` supplies missing sizes for the four retained designs while preserving their masters.
- `mascot/wick-welcome.png` is Leon’s approved app mark. The Narrator’s separate 3D brief is retained in `briefs/`.
- `illustrations/m813/v1/` contains the opening landing pad and the separately stored ending-only repair bay. Respect catalog spoiler metadata.
- `briefs/` retains the current M813 and Wick art direction and historical delivery instructions. **Jobs:** `briefs/wick-production-icons.md` (trait and perk icons), `briefs/wick-narrator-3d.md` (the Narrator's 3D Wick) and `briefs/first-patch-revival-redo.md` (five EPCCG cast portraits); earlier: (the original 150-icon run was expanded by three combo perks and 27 Mastered perks to 180).
- `style-guide/v1.3/` contains the one current guide (`PHC-Style-Guide.md`), the palette (pigments, UI inks, UI state colours) and the reference images. `v1.2/` is kept unchanged and holds the illustrated PDF; its numbered-folder references describe the old downloadable pack.

Each collection's `previews/` is for review. Use individual PNG files in gameplay. Collection manifests retain the art briefs; the central catalog provides consistent implementation keys. Do not pick an asset by whichever filename contains "final", by a directory glob, or by a historical set number.

Future revisions should use a new versioned folder and update the central catalog, guide and validation checks together. Keep existing approved files intact. File integrity for the published handoff is recorded in [checksums.sha256](checksums.sha256).

**M813 campaign production complete (6 November 2026):** 53 images — four banners, sixteen portraits, four map backgrounds, four story moments and twenty-five object sprites (the original 52 plus one shared runtime field lamp). [Review and implementation handoff](campaigns/m813/tutorial-v1/README.md). New art awaits Leon’s visual review. The selected catalog now has 394 primary assets, including the unchanged 180-icon library and two AHOC emblems.

**Archetype player cards:** [46 Heavenprint portraits](character-portraits/archetypes/README.md), with [review sheet](character-portraits/archetypes/previews/all-46.jpg), 48 × 60 thumbnails and casting metadata. Select `pool: player-card` in the catalog. These remain review candidates.

