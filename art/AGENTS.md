# PHC art work

Read `style-guide/v1.3/START-HERE.md` and the relevant mode's references before generating images. Current explicit user requests override defaults.

Skill slots use the faceless gestural figures in `skills/poc4-palette-v3/`: black background, cream body and one attribute hue for all other pigment and shading. Use `style-guide/v1.3/palette.json` for the current colours. Keep each action and silhouette distinct.

Characters use `characters/heavenprint-new-faces/` and the approved character references in the guide. These are not player-skill portraits. Retain Heavenprint's ink/gouache rendering, restrained face stylization and lore equipment.

Traits and perks use the approved Wick icon in `traits/wick/mind-without-fog/`: cape, lantern heart, pixel face, asymmetry and flat ink. Traits and perks are both pure white; never tint an icon with a skill colour. No gradients or glow.

Preserve approved artwork. Add new versioned collections for revisions, then update `catalog.json`, the guide, checksums and implementation notes. Run `python3 scripts/validate_art.py` after changing the handoff. Routine authorised work needs no additional permission.
