# Art asset layout

- `catalog.json` is the integration entry point. All paths in it are relative to the repository root.
- `skills/poc4-palette-v3/` contains the 27 current abstract player-skill portraits. Versioned paths prevent an earlier POC from silently replacing them.
- `character-portraits/` holds all 81 painted character portraits in three sets: First-Patch Revival (the EPCCG cast), Original Heavenprint and New Faces (a pool of world characters). None are skill icons; see its README.
- `traits/wick/mind-without-fog/` contains the exact approved Wick trait icon and trait description.
- `briefs/` holds production briefs for art that doesn't exist yet: the M813 one-shot (MPAT, its comrade, Outpost-813) and the ten Wick test icons.
- `style-guide/v1.3/` contains the one current guide (`PHC-Style-Guide.md`), the palette (pigments, UI inks, UI state colours) and the reference images. `v1.2/` is kept unchanged and holds the illustrated PDF; its numbered-folder references describe the old downloadable pack.

Each collection's `previews/` is for review. Use individual PNG files in gameplay. Collection manifests retain the art briefs; the central catalog provides consistent implementation keys. Do not pick an asset by whichever filename contains "final", by a directory glob, or by a historical set number.

Future revisions should use a new versioned folder and update the central catalog, guide and validation checks together. Keep existing approved files intact. File integrity for the published handoff is recorded in [checksums.sha256](checksums.sha256).
