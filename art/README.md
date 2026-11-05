# Art asset layout

- `catalog.json` is the integration entry point. All paths in it are relative to the repository root.
- `skills/poc4-palette-v3/` contains the 27 current abstract player-skill portraits. Versioned paths prevent an earlier POC from silently replacing them.
- `character-portraits/` holds 83 painted character portraits: the original three sets of 27 and two new M813 cast candidates. None are skill icons; see its README.
- `traits/wick/mind-without-fog/` contains the exact approved Wick trait icon and trait description.
- `traits/wick/test-set-1/` contains ten review candidates (eight traits and two perks), transparent masters, UI exports and review sheets. Production approval is pending.
- `traits/wick/test-set-1/revisions/` holds seven round-2 fixes. New icons arrive in `traits/wick/production-v1/` and `perks/wick/production-v1/`, each pushed individually; `traits/wick/production-progress.json` records coverage toward 74 traits and 76 perks.
- `illustrations/m813/v1/` contains the opening landing pad and the separately stored ending-only repair bay. Respect catalog spoiler metadata.
- `briefs/` retains the M813 and Wick art direction and links to all fourteen delivered candidates. **Next job:** `briefs/wick-production-icons.md` (fix seven test icons, then all 74 trait and 76 perk icons in six reviewed batches).
- `style-guide/v1.3/` contains the one current guide (`PHC-Style-Guide.md`), the palette (pigments, UI inks, UI state colours) and the reference images. `v1.2/` is kept unchanged and holds the illustrated PDF; its numbered-folder references describe the old downloadable pack.

Each collection's `previews/` is for review. Use individual PNG files in gameplay. Collection manifests retain the art briefs; the central catalog provides consistent implementation keys. Do not pick an asset by whichever filename contains "final", by a directory glob, or by a historical set number.

Future revisions should use a new versioned folder and update the central catalog, guide and validation checks together. Keep existing approved files intact. File integrity for the published handoff is recorded in [checksums.sha256](checksums.sha256).
