# November 19 art continuation

Updated 19 November 2026 at 10:38 UTC+7. The 88 entries in files 01–04 have **44 delivered**, **43 to do** and **1 held**. Review candidates require visual approval.

| File | Delivered | Total listed |
| --- | ---: | ---: |
| 01 | 3 | 37 |
| 02 | 11 | 11 |
| 03 | 20 | 21 |
| 04 | 10 | 19 |

## Pickup

Read [the source pack](../../../briefs/prompts-2026-11-19/README.md), queue.json, order.json and progress.json. Commit 2020b5c2a includes the fourth prompt verification. The corrected prompts keep Wick's ceramic screen, lantern and capelet. Hand-Off shares retained guard, Darkened has white dashes, Warding Word has non-letter notches and the City Sigil mark has a chevron.

Hold #164 still applies to the Scrap Turret portrait. Called Out is the active challenge modifier in data/classes.json and has its own November 19 depiction. Wind-up and Read the Swing have new exact paths. Preserve the separate November 16 delivery and the fully remade Breaker.

Use image generation one image per prompt. Set functions.store keys phc19root to the checkout, phc19jobs to the queue and latest-<filename> to each source document. Evaluate generate-ink.js as a function and pass the next ink job IDs. Review 16/32/44/64 px sheets against #10151F. Review paint materials, map joins, firearm silhouettes and grip or part attachment visually. The generated source path is in scratch result-N.json. Preserve sources before a workspace restart.

Run deliver.py review on candidate IDs, inspect the sheet, then run deliver.py deliver on the accepted IDs. Previous files and exports are archived when replaced. Finish with deliver.py verify, the asset build and repository art validation. The full validator currently stops at its fixed perk count once new perks exist. Restore generated app assets.json before committing art-only changes.

## Remaining entries

- 066 | File 03 | Running Script (fork): replaces the existing picture | `art/icons/forks/sigil-running-script.png`
- 080 | File 04 | `pull_together`: Pull Together | `art/icons/perks/pull-together.png`
- 081 | File 04 | `quiet_thread`: Quiet Thread | `art/icons/perks/quiet-thread.png`
- 082 | File 04 | `veiled_insult`: Veiled Insult (a new picture, started from Sweet Talker) | `art/icons/perks/veiled-insult.png`
- 083 | File 04 | `fork.prayer.held_breath`: Swift Psalm (replaces the existing picture) | `art/icons/forks/prayer-held-breath.png`
- 084 | File 04 | `righteous`: Righteous | `art/icons/perks/righteous.png`
- 085 | File 04 | `foresight`: Foresight | `art/icons/perks/foresight.png`
- 086 | File 04 | `five_stars`: Five Stars | `art/icons/perks/five-stars.png`
- 087 | File 04 | `commanding_voice`: Commanding Voice | `art/icons/perks/commanding-voice.png`
- 088 | File 04 | `blessed_aim`: Blessed Aim (condition sign) | `art/icons/conditions/blessed-aim.png`
- 004 | File 01 | `move-draw-fire`: Called Out (Bulwark rank I, `class:defender.draw_fire`) | `art/icons/moves/draw-fire.png`
- 005 | File 01 | `class:fighter.wind_up`: Wind-up (Breaker rank I) | `art/icons/moves/wind-up.png`
- 006 | File 01 | `read_the_swing`: Read the Swing (Breaker rank II) | `art/icons/moves/read-the-swing.png`
- 007 | File 01 | `mod_follow_guard`: Shield follow (mod) | `art/icons/gear/mod-follow_guard.png`
- 008 | File 01 | `mod_afterword`: Afterword's edge (mod) | `art/icons/gear/mod-afterword.png`
- 010 | File 01 | `kit-ahoc-ground-2`: AHOC ground 2 | `art/sprites/kit/ahoc/ground-2.png`
- 011 | File 01 | `kit-shrine-ground-2`: Shrine ground 2 | `art/sprites/kit/shrine/ground-2.png`
- 012 | File 01 | `kit-ahoc-dress-2`: AHOC dress 2 | `art/sprites/kit/ahoc/dress-2.png`
- 013 | File 01 | `kit-rim-wall-corner`: Rim wall corner | `art/sprites/kit/rim/wall-corner.png`
- 014 | File 01 | `kit-ahoc-poi`: Point of interest, ahoc | `art/sprites/kit/ahoc/poi.png`
- 015 | File 01 | `kit-city-poi`: Point of interest, city | `art/sprites/kit/city/poi.png`
- 016 | File 01 | `kit-field-poi`: Point of interest, field | `art/sprites/kit/field/poi.png`
- 017 | File 01 | `kit-works-poi`: Point of interest, works | `art/sprites/kit/works/poi.png`
- 018 | File 01 | `kit-shrine-poi`: Point of interest, shrine | `art/sprites/kit/shrine/poi.png`
- 019 | File 01 | `kit-rim-poi`: Point of interest, rim | `art/sprites/kit/rim/poi.png`
- 020 | File 01 | `kit-ahoc-sigil_wall`: Sigil wall, ahoc | `art/sprites/kit/ahoc/sigil_wall.png`
- 021 | File 01 | `kit-city-sigil_wall`: Sigil wall, city | `art/sprites/kit/city/sigil_wall.png`
- 022 | File 01 | `kit-field-sigil_wall`: Sigil wall, field | `art/sprites/kit/field/sigil_wall.png`
- 023 | File 01 | `kit-works-sigil_wall`: Sigil wall, works | `art/sprites/kit/works/sigil_wall.png`
- 024 | File 01 | `kit-shrine-sigil_wall`: Sigil wall, shrine | `art/sprites/kit/shrine/sigil_wall.png`
- 025 | File 01 | `kit-rim-sigil_wall`: Sigil wall, rim | `art/sprites/kit/rim/sigil_wall.png`
- 026 | File 01 | `kit-ahoc-sigil_mark`: Sigil mark, ahoc | `art/sprites/kit/ahoc/sigil_mark.png`
- 027 | File 01 | `kit-city-sigil_mark`: Sigil mark, city | `art/sprites/kit/city/sigil_mark.png`
- 028 | File 01 | `kit-field-sigil_mark`: Sigil mark, field | `art/sprites/kit/field/sigil_mark.png`
- 029 | File 01 | `kit-works-sigil_mark`: Sigil mark, works | `art/sprites/kit/works/sigil_mark.png`
- 030 | File 01 | `kit-shrine-sigil_mark`: Sigil mark, shrine | `art/sprites/kit/shrine/sigil_mark.png`
- 031 | File 01 | `kit-rim-sigil_mark`: Sigil mark, rim | `art/sprites/kit/rim/sigil_mark.png`
- 032 | File 01 | `kit-ahoc-pile`: Ground pile, ahoc | `art/sprites/kit/ahoc/pile.png`
- 033 | File 01 | `kit-city-pile`: Ground pile, city | `art/sprites/kit/city/pile.png`
- 034 | File 01 | `kit-field-pile`: Ground pile, field | `art/sprites/kit/field/pile.png`
- 035 | File 01 | `kit-works-pile`: Ground pile, works | `art/sprites/kit/works/pile.png`
- 036 | File 01 | `kit-shrine-pile`: Ground pile, shrine | `art/sprites/kit/shrine/pile.png`
- 037 | File 01 | `kit-rim-pile`: Ground pile, rim | `art/sprites/kit/rim/pile.png`

Unreviewed scratch renders currently on disk: 84.
