# Art asset layout

> **ARTIST: NEXT UP (5 November 2026).** When image generation resumes: (1) the four Review 4 fixes, (2) Real Power, Batch F and **3 new combo perks**, (3) **new Batch G: 27 Mastered perk icons**, one per skill, the game's top-tier perks, with the Mastered mark. Everything is in [`briefs/wick-production-icons.md`](briefs/wick-production-icons.md) (see "NEXT UP" at the top and "Mastered (27)"); the ordered queue is [`traits/wick/pending-at-usage-limit-2026-11-05.json`](traits/wick/pending-at-usage-limit-2026-11-05.json) (55 items). The perk target is now **106** (`scripts/validate_art.py` allows it, and `data/perks.json` on this branch has the Mastered perks).

- `catalog.json` is the integration entry point. All paths in it are relative to the repository root.
- `skills/poc4-palette-v3/` contains the 27 current abstract player-skill portraits. Versioned paths prevent an earlier POC from silently replacing them.
- `character-portraits/` holds 83 painted character portraits: the original three sets of 27 and two new M813 cast candidates. None are skill icons; see its README.
- `traits/wick/mind-without-fog/` contains the exact approved Wick trait icon and trait description.
- `traits/wick/test-set-1/` contains ten review candidates (eight traits and two perks), transparent masters, UI exports and review sheets. Production approval is pending.
- `traits/wick/test-set-1/revisions/` holds seven round-2 fixes. New icons arrive in `traits/wick/production-v1/` and `perks/wick/production-v1/`, each pushed individually; `traits/wick/production-progress.json` records coverage toward 74 traits and 76 perks.
- `traits/wick/library-review-v1/` indexes the 5 November checkpoint: all 74 traits and 55 perks, with 21 perks awaiting the image-generation usage reset. Every delivered icon has 256/128/64/56/48/44/40 px exports; `traits/wick/reference-ui-v1/` supplies missing sizes for the four retained designs while preserving their masters.
- `mascot/wick-welcome.png` is Leon’s approved app mark. The Narrator’s separate 3D brief is retained in `briefs/`.
- `illustrations/m813/v1/` contains the opening landing pad and the separately stored ending-only repair bay. Respect catalog spoiler metadata.
- `briefs/` retains the M813 and Wick art direction and links to all fourteen delivered candidates. **Jobs:** `briefs/wick-production-icons.md` (trait and perk icons), `briefs/wick-narrator-3d.md` (the Narrator's 3D Wick) and `briefs/first-patch-revival-redo.md` (five EPCCG cast portraits); earlier: (fix seven test icons, then all 74 trait and 76 perk icons in six reviewed batches; Batch G adds 27 Mastered perks, for 103).
- `style-guide/v1.3/` contains the one current guide (`PHC-Style-Guide.md`), the palette (pigments, UI inks, UI state colours) and the reference images. `v1.2/` is kept unchanged and holds the illustrated PDF; its numbered-folder references describe the old downloadable pack.

Each collection's `previews/` is for review. Use individual PNG files in gameplay. Collection manifests retain the art briefs; the central catalog provides consistent implementation keys. Do not pick an asset by whichever filename contains "final", by a directory glob, or by a historical set number.

Future revisions should use a new versioned folder and update the central catalog, guide and validation checks together. Keep existing approved files intact. File integrity for the published handoff is recorded in [checksums.sha256](checksums.sha256).
