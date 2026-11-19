# November 19 art continuation

Updated 19 November 2026 at 11:29 UTC+7. The 88 entries in files 01–04 have **83 delivered**, **4 to do** and **1 held**. Review candidates require visual approval.

| File | Delivered | Total listed |
| --- | ---: | ---: |
| 01 | 33 | 37 |
| 02 | 11 | 11 |
| 03 | 20 | 21 |
| 04 | 19 | 19 |

## Pickup

Read [the source pack](../../../briefs/prompts-2026-11-19/README.md), queue.json, order.json and progress.json. Commit 2020b5c2a includes the fourth prompt verification. The corrected prompts keep Wick's ceramic screen, lantern and capelet. Hand-Off shares retained guard, Darkened has white dashes, Warding Word has non-letter notches and the City Sigil mark has a chevron.

Hold #164 still applies to the Scrap Turret portrait. Called Out is the active challenge modifier in data/classes.json and has its own November 19 depiction. Wind-up and Read the Swing have new exact paths. Preserve the separate November 16 delivery and the fully remade Breaker.

Use image generation one image per prompt. Set functions.store keys phc19root to the checkout, phc19jobs to the queue, phc19arc to this archive's repository-relative path and latest-<filename> to each source document. Evaluate generate-ink.js or generate-painted.js as a function and pass the corresponding job IDs. Review 16/32/44/64 px sheets against #10151F. Review paint materials, map joins, firearm silhouettes and grip or part attachment visually. The generated source path is in scratch result-N.json. Preserve sources before a workspace restart.

Run deliver.py review on candidate IDs, inspect the sheet, then run deliver.py deliver on the accepted IDs. Previous files and exports are archived when replaced. Finish with deliver.py verify, the asset build and repository art validation. The full validator currently stops at its fixed perk count once new perks exist. Restore generated app assets.json before committing art-only changes.

## Remaining entries

- 066 | File 03 | Running Script (fork): replaces the existing picture | `art/icons/forks/sigil-running-script.png`
  - Preserve all the current pose and glyph pixels. Add only one small unfinished white three-stroke glyph beside the existing one, pointing toward Wick's stylus. Full redraws modified the pose and old glyph. The isolated generated motif is under [rejected/066-glyph-only](rejected/066-glyph-only).
- 013 | File 01 | `kit-rim-wall-corner`: Rim wall corner | `art/sprites/kit/rim/wall-corner.png`
  - Preserve the old corner until the replacement passes both joins. At 256 px, the left opening must be y64–191 and the bottom opening x64–191. Match the original straight wall's steel texture, value, cap and centered cyan strip. The third draft in [rejected/013-join-v3](rejected/013-join-v3) was closest in finish but missed both openings.
- 024 | File 01 | `kit-shrine-sigil_wall`: Sigil wall, shrine | `art/sprites/kit/shrine/sigil_wall.png`
- 036 | File 01 | `kit-shrine-pile`: Ground pile, shrine | `art/sprites/kit/shrine/pile.png`
