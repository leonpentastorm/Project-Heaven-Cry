# Art asset layout

- `catalog.json` is the integration entry point. All paths in it are relative to the repository root.
- `skills/poc4-palette-v3/` contains the 27 current abstract player-skill portraits. Versioned paths prevent an earlier POC from silently replacing them.
- `characters/heavenprint-new-faces/` contains the latest 27 painted character portraits. Old skill IDs in filenames are historical only.
- `traits/wick/mind-without-fog/` contains the exact approved Wick trait icon and trait description.
- `style-guide/v1.3/` contains the current guide, palette (pigments, UI inks and UI state colours) and references. `v1.2/` is kept unchanged and holds the illustrated PDF. Its internal numbered-folder references describe the downloadable master pack; use this repository layout and catalog when integrating.

Each collection's `previews/` is for review. Use individual PNG files in gameplay. Collection manifests retain the art briefs; the central catalog provides consistent implementation keys. Do not pick an asset by whichever filename contains "final", by a directory glob, or by a historical set number.

Future revisions should use a new versioned folder and update the central catalog, guide and validation checks together. Keep existing approved files intact. File integrity for the published handoff is recorded in [checksums.sha256](checksums.sha256).
- `briefs/` holds production briefs for art that doesn't exist yet: the M813 one-shot (MPAT, its comrade, Outpost-813) and the ten Wick test icons.
