# The prompt pack, 19 November 2026: the artist's cover page

This folder is everything to paint for Project Heaven Cry's next releases, in ten files. Each file starts with the style
block(s) to paste first. Each picture then has its id and name, the exact file name and folder to save as, where it shows
in the game, the reference images to attach (every path is in this repository), and one fenced prompt to paste. One
image a prompt: paste the file's style block, then the entry's prompt, and attach what the entry names.

## The order to work in

1. **Today's three:** the APPROACH and LEVEL UP banner signs and Wick's Second Wind (file 01, section 1).
2. **The Wick icon set, file by file:** file 02 (Strength, Agility, Endurance), then file 03 (Expression, Intelligence,
   Perception), then file 04 (Determination, Insight, Virtue). In each file, new pictures first, then the changed ones.
3. **The live gaps** (file 01, sections 2 to 4): the three class-move icons, the two mod paintings, the Scrap Turret
   portrait, then the map kit (the 4 replacements first, then the 24 new pieces).
4. **The new base forms, at the Standard finish:** melee (file 05), guns and bows (file 06), shields and armour (file 07),
   heavy and strange weapons (file 09). Where an entry says "paint after the repaint", paint that gun's repaint from file
   10, section 1, first and attach the new picture.
5. **The gun repaints and the five new gun lines** (file 10): section 1, the 17 repaints; section 2, the 15 new forms,
   each line's base first.
6. **The grades, by file 08's method** (sections A to C): the proof sheet first (8 pictures: `katana` and
   `drifter_revolver`), send it back for review, then one grade set per item, made image to image from its approved
   Standard, in the order of section C1.
7. **The uniques** (file 08, section D).

## The files

| File | What | Pictures |
| --- | --- | --- |
| [`01-today-and-gaps.md`](01-today-and-gaps.md) | 2 banner signs and Second Wind; 3 class-move icons; 2 mod paintings; the Scrap Turret Figment portrait; 4 map-kit replacements and 24 new map-kit pieces | 37 |
| [`02-skills-body.md`](02-skills-body.md) | Wick icons for Strength, Agility and Endurance | 11 |
| [`03-skills-mind.md`](03-skills-mind.md) | Wick icons for Expression, Intelligence and Perception (the four Figment forks among them) and the Darkened sign | 21 |
| [`04-skills-soul.md`](04-skills-soul.md) | Wick icons for Determination, Insight and Virtue and the Blessed Aim sign | 19 |
| [`05-melee-forms.md`](05-melee-forms.md) | New melee weapons in 12 families | 19 |
| [`06-gun-forms.md`](06-gun-forms.md) | 15 new guns and 2 new bows | 17 |
| [`07-shields-armour.md`](07-shields-armour.md) | 6 new shields and 14 new armour pieces | 20 |
| [`08-grades-and-uniques.md`](08-grades-and-uniques.md) | The grade method for every graded item (the proof sheet's 8 written out in full), and 23 uniques | 23 uniques + 656 grade pictures |
| [`09-heavy-and-strange.md`](09-heavy-and-strange.md) | New heavy and strange weapons in 8 families (launchers, rocket tubes, rotary and belt-fed guns, anti-materiel rifles, flamers, powered blades, power gauntlets, thrown weapons) | 16 |
| [`10-rifle-analogues.md`](10-rifle-analogues.md) | 17 repaints of existing guns (same file name, a new picture) and 15 new guns in five maker lines | 32 |

**Totals:** 215 pictures to make now (the counts above, the 23 uniques included), 656 grade pictures (164 graded items x
4 grades, the proof sheet's 8 among them), **871 pictures in all.**

## The rules that hold everywhere

1. No text in any image: no letters, numbers, words, labels or signatures; a glyph is an abstract mark, never a letter.
2. No real names or marks: no real brand, maker, model name, logo, rollmark, insignia, person or faith's symbol.
3. A gun reads as its real-world pattern at a glance (layout, proportions, magazine, sights, stock and furniture kept); only its small maker's touch is ours.
4. Melee weapons, bows, shields, armour and the strange weapons are invented shapes, never a recognisable real model.
5. Every graded item is painted at all five grades: Standard (the master), Fine, Masterwork, Relic, Celestial.
6. Save every picture under the exact file name and folder its entry gives, and never rename. Gear and map-kit file names keep the item id's underscores after the kind prefix (`weapon-snub_revolver.png`, `low_wall.png`), as the files already in those folders do; a grade picture is `<the Standard's file name without .png>--fine.png` (or `--masterwork`, `--relic`, `--celestial`) beside its Standard in `art/icons/gear/`.

## Handing pictures back

- **Format:** PNG. Wick icons and white-ink signs: 1024 x 1024, pure white ink on full transparency. Gear paintings:
  1024 x 1024 with a fully transparent background. The Figment portrait: 800 x 1000, opaque. Kit sprites: 256 x 256 with
  transparency; kit grounds: 1024 x 1024, seamless.
- **Contact sheets:** for gear, one sheet per family or line (the new forms beside the existing ones) and one sheet per
  grade set (the five grades side by side), each picture checked at 64 px and 32 px on `#10151F`.
- **Review:** send each batch back as it is finished, in the order above. A grade set is made only from an approved
  Standard; a picture that fails review is redone from the same prompt with the review's note.
