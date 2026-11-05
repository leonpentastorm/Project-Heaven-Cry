# Wick test set 1

Ten new **review candidates**, generated from the ten actions in [the brief](../../../briefs/wick-test-icons.md) and the approved Mind Without Fog reference. Eight traits and two perks; all use pure white ink. These are not approved production anchors. The 150-icon production run has not started.

![128 px review](previews/review-128px.png)

![40 px review](previews/review-40px.png)

Masters are 1024 × 1024 RGBA PNGs with transparent backgrounds and safe margins. `exports/` supplies transparent 256, 128, 64 and 40 px files. Labels appear only on review sheets. The technical export separates the generated ink into pure white RGB and alpha cutouts, pads the complete drawing, and scales it; it does not redraw poses. Original generation files remain in the task's `/workspace/generated_images/` directory. Source hashes and rules-data IDs are recorded in [manifest.json](manifest.json).

| Catalog family | Catalog ID | Rules-data ID |
|---|---|---|
| traits | `humanity-first` | `humanity_first` |
| traits | `the-old-blood` | `the_old_blood` |
| traits | `factory-made` | `factory_made` |
| traits | `chain-smoker` | `chain_smoker` |
| traits | `raised-by-orks` | `raised_by_orks` |
| traits | `the-brightest-light` | `the_brightest_light` |
| traits | `rabbits-foot` | `rabbits_foot` |
| traits | `forlorn-hope` | `forlorn_hope` |
| perks | `field-surgeon` | `field_surgeon` |
| perks | `supreme-command` | `supreme_command` |

## Review notes

The placard, exclusion circle, seated repair, smoke arrow, inverted page, burning cape, near-miss arrow, charge, leg repair and elevated command give the set different silhouettes. Capelets and round medical-cross hearts remain visible at 64 px. The crosses use thick, equal arms. At 40 px the screwdriver, rabbit charm, bandages and tiny commanded figures lose detail; identify the action and silhouette before reading fine marks. A reviewer still needs to perform the brief's name-matching and body-cover tests; these exports are not evidence of a user-approved pass.

The Factory Made candidate reads as self-repair at the arm joint; its shoulder reattachment could be more explicit. The Brightest Light and Forlorn Hope both use running poses; check that the flame versus exposed charge remains enough distinction at the intended UI size. These are the first items to revisit if the review fails.

The [light/dark comparison](previews/light-dark-64px.png) preserves white ink on both surfaces. On light screens, place the unchanged white icon on a dark UI chip. Do not tint it or add an outline to manufacture contrast.

After human review, record selections and revisions here and update the icon lock with established production rules. Keep `production_approved: false` until that review happens.
