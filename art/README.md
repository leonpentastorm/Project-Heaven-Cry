# Art library

Everything the game and the artists use, organised **by use** (tidied for 0.0.1, 9 November 2026). Production files sit in a flat folder per use, named after their catalog id in lower-case kebab-case; everything superseded is in `_archive/` under its old path. Nothing was deleted except byte-identical duplicates (see the end).

- **`catalog.json`** is the index: every production image has an id, a path (relative to the repository root), its sha256, size and metadata. Code looks images up by catalog id, never by globbing folders or by a filename containing "final".
- **`checksums.sha256`** lists every file under `art/` (archive included) plus the art tooling. Regenerate it with `python3 tools/rehash_art_checksums.py`; check everything with `python3 tools/validate_art.py` and `python3 tools/validate_patrons.py`.
- **`briefs/ART-REQUESTS.md`** is the running list of art that is wanted, with direction: the file to hand an artist.
- **`style-guide/PHC-Style-Guide.md`** is the only style guide (v1.3); `AGENTS.md` is the short version for image agents.
- `npm run assets` (`tools/build_web_assets.py`) turns the production files into the game's `apps/web/public/assets/*.webp`.
- **`eye_line`** (`{ "x": 0.5, "y": 0.2 }`) on every `characters` and `patrons` entry: where the eyes are, as fractions of the 4:5 image (y from the top, x the point between the eyes), for the spotlight cut-in's torn eye strip (decision 113). Set from a face detector (OpenCV's YuNet) and checked by eye on contact sheets; the robots, masks and apparitions by eye. `tools/validate_art.py` requires it (0.05 ≤ y ≤ 0.70, 0.15 ≤ x ≤ 0.85); `npm run assets` writes them to `apps/web/src/game/eyelines.json`. A new portrait needs one.

## Layout

```
art/
  README.md  AGENTS.md  catalog.json  checksums.sha256
  portraits/                       character portraits (4:5, 800 x 1000), never skill icons
    epccg/<skill>.png              First-Patch Revival: the EPCCG cast, one per skill they were painted for (27)
    world/original-heavenprint/<skill>.png   NPC pool, unnamed (27)
    world/new-faces/<name>.png               NPC pool, named proposals (27)
    archetypes/<archetype>.png     player cards, one per archetype in data/archetypes.json (46)
    m813/<id>.png                  MPAT, the comrade and the M813 tutorial cast (18)
    patrons/<patron_id>.png        the eight patron apparitions (Blessing 2.0)
  icons/
    skills/<skill>.png             the 27 abstract skill figures (800 x 1000)
    traits/<trait>.png             Wick, white flat ink, 1024 masters (74)
    traits/exports/<px>/<trait>.png      UI sizes 40/44/48/56/64/128/256
    perks/<perk>.png  perks/exports/<px>/<perk>.png   (106)
    prayers/<file>.png             whisper / hymn / miracle icons (38)
    STYLE-LOCK.md                  the Wick icon lock (master: traits/mind-without-fog.png)
    weapons/<weapon_id>.svg        monoline weapon icons, one per data/weapons.json id (60); README.md is the spec
    armour/<item_id>.svg           monoline armour and shield icons, one per data/items.json armour/shield id (19)
    focus/<item_id>.svg            monoline magic-focus icons: the Evoker and the Emanator, both gloves (2)
  emblems/
    ahoc/ahoc-seal-white.png       the AHOC seal used in the UI (+ the red 2020 original)
    patrons/<patron_id>.png        the eight patron marks
  illustrations/m813/<id>.png      M813 banners and story moments; spoilers/ holds ending-only images
  maps/                            empty today: every map is plain colour (rules 1.16). The four M813 map paintings
                                   (16 x 11 tiles) are in _archive/maps/m813/retired-2026-11/; new maps: briefs/ART-REQUESTS.md
  sprites/objects/<object>.png     M813 object sprites (catalog id minus "obj-")
  mascot/wick-welcome.png          the app mark
  mascot/wick-anim/                the five menu clips (a validated package: frames, strips, masters, manifest)
  ui/title-screen/                 the title layers (back, mid, front), the layered PSD, manifest and geometry notes
  style-guide/                     PHC-Style-Guide.md, palette.json, CHANGELOG.md, reference-index.json, references/;
                                   weapon-icons.md (the weapon icon rule) and weapon-icons/ (its contact sheets)
  briefs/                          art direction for jobs (current and done); m813-tutorial/ holds the queue and map guides
  _archive/                        everything superseded, under its old path (see below)
```

Rules for new work:

1. A new image goes into the production folder for its use, named after its catalog id. Add or update its catalog entry, run `python3 tools/rehash_art_checksums.py`, then the validators.
2. A replacement keeps the file name. The old file moves to `_archive/` (its old relative path, plus a version or date folder) and the catalog entry records it in `previous_path`.
3. Review sheets, contact sheets, previews, source renders, atlases, prompts and delivery manifests go to `_archive/` from the start; production folders hold only what the game or the artists' references use.
4. Patron, patron-mark and prayer files keep their data ids as file names (`the_quartermaster.png`, `hymn-the_quartermaster-1.png`): the game derives their asset keys from the file names.

## What is in `_archive/`

Each file keeps the path it had before the tidy, minus the leading `art/` (so `art/traits/wick/test-set-1/…` is now `art/_archive/traits/wick/test-set-1/…`). Delivery manifests in there still bind the production files (their `path` fields were rewritten to the new locations), and the validators still read them.

- `traits/wick/`, `perks/wick/`: the Wick icon run: test set 1 and its review rounds, production-v1 manifests and READMEs, superseded revisions, previews, library reviews v1/v2 (the complete 180-icon review and implementation handoff: `_archive/traits/wick/library-review-v2/README.md`), progress files and the original Mind Without Fog delivery note.
- `character-portraits/`: per-set READMEs and manifests, previews (`archetypes/previews/all-46.jpg`), the five First-Patch Revival portraits replaced in revision 3, the M813 v2 sources, previews and replaced revisions, the patron delivery (manifest, package checksums, native 1122 x 1402 source renders, review sheet).
- `skills/poc4-palette-v3/`: the skill delivery manifest, generation briefs, palette and README.
- `campaigns/m813/tutorial-v1/`: the M813 campaign handoff (README, manifest, progress) and its review sheets.
- `illustrations/`, `maps/`, `sprites/`: M813 v1/v2 deliveries, superseded revisions, sources and previews.
- `emblems/`, `ui/prayers/`: delivery READMEs, manifests, package checksums and source atlases for the patron marks and prayer icons.
- `ui/title-screen/`: the title's review previews and native source renders; `history/` holds the earlier title layers (formerly `art/archive/`).
- `mascot/`: the mascot README and the Wick animation sources, plans and previews.
- `style-guide/v1.2/`: the previous six-file guide and its illustrated PDF.
- `briefs/m813-tutorial/maps/archive-2026-11-06/`: the first outpost layout guide.

Byte-identical duplicates were removed and every reference pointed at the copy that stays: the style-guide reference copies of production portraits and of the Mind Without Fog master, the v1.2 reference folder (identical to v1.3's), skill and portrait contact sheets that were also style-guide references, and the M813 sprite sources that a later revision reused unchanged (73 files, 62 MiB).

## Status

- **Icons:** all 74 trait and 106 perk icons are delivered (review candidates; Leon's visual approval pending).
- **M813 campaign:** 53 images delivered (banners, portraits, maps, story moments, sprites); review candidates.
- **Archetype cards:** 46 portraits (`pool: player-card` in the catalog); review candidates.
- **Patrons (Blessing 2.0):** eight portraits, eight marks and 38 prayer icons; review candidates.
- **Title screen:** three layers and the PSD (Part A); the Wick menu clips are review candidates.
