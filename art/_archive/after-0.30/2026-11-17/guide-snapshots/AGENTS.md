# PHC art work

Read `style-guide/PHC-Style-Guide.md` (the only guide; its first table says what to read and attach for each art mode) before generating images, and `README.md` here for where files live. Current explicit user requests override defaults.

Skill slots use the faceless gestural figures in `icons/skills/`: black background, cream body and one attribute hue for all other pigment and shading. Use `style-guide/palette.json` for the current colours. Keep each action and silhouette distinct.

Characters live in `portraits/` (`epccg/` is the EPCCG cast, `world/` the NPC pool, `archetypes/` the player cards, `m813/` the M813 cast, `patrons/` the eight gods). Match the Original Heavenprint and New Faces anchors (`portraits/world/`) for style; use the EPCCG portrait as the casting reference for a named EPCCG character. These are never player-skill portraits. Retain Heavenprint's ink/gouache rendering, restrained face stylization and lore equipment.

Traits and perks use the approved Wick icon `icons/traits/mind-without-fog.png` (lock: `icons/STYLE-LOCK.md`): cape, lantern heart, pixel face, asymmetry and flat ink. Traits and perks are both pure white; never tint an icon with a skill colour. No gradients or glow.

Preserve approved artwork. A replacement goes straight into the production folder under the same file name; the file it replaces moves to `_archive/` (same relative path plus a dated or versioned folder), never deleted. Then update `catalog.json` (`path`, `sha256`, `previous_path`), the guide if the rules changed, run `python3 tools/rehash_art_checksums.py` and `python3 tools/validate_art.py` (and `python3 tools/validate_patrons.py` for patron art). Review sheets, contact sheets, source renders and prompts go to `_archive/` from the start. Routine authorised work needs no additional permission.

