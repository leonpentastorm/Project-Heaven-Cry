# Design record: the 19 Nov 2026 prompt pack (final state)

The artist's pack is `art/briefs/prompts-2026-11-19/` (its `README.md` is the cover page). This folder holds the design
material moved out of the artist's files, one file per artist file, brought up to Leon's rulings of 19 Nov 2026: R1
everything proposed approved (names, lines, forms, uniques, the five maker lines of file 10, the 17 repaints, the redraw
notes for 06 and 09); R2 grade scheme S1, all five grades for every graded item, armour and foci included; R3 a gun reads
as its real pattern, with our name, maker and markings; R4 eight heavy and strange families, the core rifle and the censer
gun out of the pack; R5 a variant's second skill is an alpha skill or none. Nothing in the pack waits on Leon.

## Final counts (counted by script from the Save-as lines, second verification, 19 Nov 2026)

| File | Pictures |
| --- | --- |
| 01 today and gaps | 37 |
| 02 skills, Body | 11 |
| 03 skills, Mind | 21 |
| 04 skills, Soul | 19 |
| 05 melee forms | 19 |
| 06 gun and bow forms | 17 |
| 07 shields and armour | 20 |
| 08 uniques (its 8 proof pictures are grade pictures) | 23 |
| 09 heavy and strange (8 families) | 16 |
| 10 gun counterparts (17 repaints + 15 new) | 32 |
| **To make now** | **215** |
| Grade pictures (164 graded items x 4) | 656 |
| **In all** | **871** |

Gear only (file 08, C4): 17 repaints + 87 new Standards + 656 grade pictures = 760; with the 23 uniques, 783 gear
pictures. Graded items: 164 (60 kept, 17 repainted, 87 new).

Intake (the lead's job): add the catalog entries in `art/catalog.json`, run `python3 tools/rehash_art_checksums.py` and
`python3 tools/validate_art.py`, then `npm run assets`; kit grounds also `python3 tools/art/kit_seams.py --sheet <dir>`; a
replaced picture's old file goes to `art/_archive/`.
