# Project Heaven Cry

A revived 2020 tabletop RPG (a Disco Elysium-style skill web with tactical squad combat), now being built as a web game with an AI or human Narrator and co-op for up to 4 players.

**Start with [`CLAUDE.md`](CLAUDE.md)**, the project brief. Then read the rules in [`docs/rules/PHC-Core-Rules-v1.0.md`](docs/rules/PHC-Core-Rules-v1.0.md), the data in [`data/`](data/README.md), and the UI prototypes in [`design/canvas/`](docs/design/ui-screens.md).

---

## Art library

**27 abstract skill portraits, 81 character portraits in three sets, the approved Wick icon, and one style guide (v1.3).** Skill colours are palette v3; the UI uses each colour's contrast-safe ink ([colour system](docs/design/colour-system.md)).

### Start implementing

1. Read [Art integration](docs/ART-INTEGRATION.md) for asset selection, import settings and usage examples.
2. Load [art/catalog.json](art/catalog.json) to resolve stable IDs to repository-relative PNG paths, dimensions, colours and checksums.
3. Browse the [asset directory](docs/ASSET-DIRECTORY.md) (generated from the catalog) or the preview sheets below.

### Asset families

| Family | Use | Files |
| --- | --- | --- |
| Skill portraits — POC 4 / palette v3 | The player's own skills: faceless brush figures | [27 PNGs](art/icons/skills/) |
| Character portraits | People in the world: the EPCCG cast, the NPC pool, 46 archetype player cards, the M813 cast and the eight patrons | [art/portraits/](art/portraits/) |
| Trait, perk and prayer icons | Wick in pure white ink; the approved master is Mind Without Fog | [art/icons/](art/icons/) · [the lock](art/icons/STYLE-LOCK.md) |
| M813 one-shot | Banners, story moments, maps and object sprites | [illustrations](art/illustrations/m813/) · [maps](art/maps/m813/) · [sprites](art/sprites/objects/) |
| Style guide v1.3 | The one guide for all future art | [PHC-Style-Guide.md](art/style-guide/PHC-Style-Guide.md) · [v1.2 illustrated PDF](art/_archive/style-guide/v1.2/PHC-Heavenprint-and-Wick-Style-Bible.pdf) |
| Briefs | Art direction for each art job | [art/briefs/](art/briefs/) |

The layout (and what was moved to `art/_archive/` in the 0.0.1 tidy) is in [art/README.md](art/README.md).

All three character sets were first painted as skill icons, one character per skill. Playtesters found it made no sense for the player's skills to be other people in the world, so skills became the abstract figures and the paintings became characters ([details](art/_archive/character-portraits/README.md)). Their filenames still record the skill each was painted to embody.

### Skill portraits

![All 27 abstract skills](art/style-guide/references/current-abstract-skills-27.jpg)

Each skill uses a black background, cream body marks and its attribute pigment. See the [palette chart](art/style-guide/references/current-skill-palette.png) and the [machine-readable palette](art/style-guide/palette.json).

### Character portraits

First-Patch Revival, the EPCCG cast:

![First-Patch Revival](art/_archive/character-portraits/first-patch-revival/previews/all-27.jpg)

[Original Heavenprint](art/style-guide/references/approved-original-27.jpg) and [New Faces](art/style-guide/references/approved-new-faces-27.jpg), the world-character pool.

### Validate

Run `python3 tools/validate_art.py` from the repository root. It checks every catalog image, PNG sizes and colour types, catalog paths, checksums, skill colours, UI-ink contrast, exact white ink and alpha in the new icons and their exports, brief coverage, rules-data bindings and ending spoiler metadata. Standard library only.

Source PNGs are unpacked for direct use; there is no ZIP or Git LFS step. Invented character names and imagery don't establish canon by themselves. For new art, attach the guide and the references for that art mode rather than relying on the style name alone.
