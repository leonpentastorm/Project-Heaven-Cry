# File 08 grade continuation

Branch: `art/2026-11-19-grade-proof`. Source Standards are retained from develop `2020b5c2a`; no Standard is replaced. The later develop update at `c22cc8f7bd` changed tests, not this art brief.

24 registered review-candidate masters: Katana, Combat Knife, Sabre, Legion Gladius, Recurve Bow and Longbow, each Fine/Masterwork/Relic/Celestial. Each has 256/128/64/32 RGBA exports and a catalog entry. Sources and exact prompts are in `drafts/`; registration records are in `delivered/`. No candidate is production-approved or implementation-ready.

[Inventory-size comparison](review/finish-candidates-small.jpg) · [Current native proof sheet](review/complete-proof-progress.jpg) · [Contour measurements](candidate-manifest.json)

Leon repeatedly instructed continuous work. The worker therefore continued review candidates without treating the proof-sheet approval gate as a reason to stop. Visual review accepts resampling and contour drift for artistic review; it does not certify the brief's exact-outline requirement. The Sabre shifts its guard and blade curve. Bow fittings and limb curves drift, especially the Longbow upper fitting: 55/135/162/178 differing solid-mask pixels at 64 px across its four grades. Recurve has 35/53/70/70. These deviations remain an approval risk and are recorded in catalog notes. Uniform scaling and translation for canvas alignment are the only preparation; no creative geometry modification or forced alpha mask is used.

Earlier rejected Fine attempts and their measurements remain archived. Selected Katana Fine uses `fine-retry`. Drifter Fine is still a draft; Drifter Masterwork returned HTTP 400 `moderation_blocked` (response in `drafts/drifter-masterwork-service-response.json`). Its dependent grades are pending. No actual image quota error has occurred.

Next claimed work: `weapon-crossbow` and `weapon-repeating_crossbow`, all four grades (eight pictures). Check WORK-CLAIMS and the shared coordination issue before rendering any other IDs: https://github.com/leonpentastorm/Project-Heaven-Cry/issues/3 . Claims for the three overlapping kept blades were published here first; the other worker was asked to release them and reuse these candidates. Acknowledgment is pending. Their `kemizuchi_duelling_blade`, `adamantile_greatsword`, `ork_machete` grades stay with them. Do not count their duplicate Combat Knife Fine twice.

Last project-wide deduplicated count: 174/871 candidate masters = previous baseline 150 + these 24. Drafts, rejected renders and exports do not increase this count. Recheck branch tips before reporting a newer total. Remaining kept quiver, hafted, glove/focus, shield and armour grade sets have not been claimed by this worker; check the live shared issue before reserving exact IDs.

Workflow: claim exact IDs and push first; generate one image at a time from Standard plus preceding grade; visually inspect; archive and push per picture. `archive-proof.py` reads `/workspace/work/prompt-pack-08/current-grade.json`. `prepare-candidates.py` aligns complete sets and creates the comparison. `register-grade.py ID TIER` refuses existing paths and publishes one candidate with exports; rehash, commit and push each. Stop only on an actual quota or genuine unresolved blocker and leave exact response and next work here.
