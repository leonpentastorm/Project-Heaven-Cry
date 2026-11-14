# Art integration

## 1. Resolve a stable ID

Load [../art/catalog.json](../art/catalog.json). Its paths are relative to the repository root, not this document or the JSON file. The catalog has five separate maps: `skills`, `characters`, `traits`, `perks`, and `illustrations`.

```js
// Example for a web build that copies the repository's art/ folder to public/art/.
const catalog = await fetch('/art/catalog.json').then(r => r.json());
const durability = catalog.skills['durability'];
const portrait = document.createElement('img');
portrait.src = '/' + durability.path;
portrait.alt = durability.label;
portrait.width = durability.width;
portrait.height = durability.height;
portrait.style.objectFit = 'contain';
```

Use `catalog.characters['orren-vask']` for Orren Vask's character portrait and `catalog.traits['mind-without-fog']` for the Wick trait example. Do not use `characters[*].historical_skill_id` to populate player-skill slots. It only records the former art brief.

The catalog maps asset IDs to files; it does not implement gameplay rules, skill levels or trait effects. Bind these stable IDs to the game's own data model. Display names such as **Vigilant**, **Will Power** and **Lore Master** are preserved as supplied.

Character and patron portraits carry `eye_line` (`{x, y}`, fractions of the 4:5 image): where the eyes are, for the spotlight cut-in's strip crop. The web game reads them from `apps/web/src/game/eyelines.json` (written by `npm run assets`, keyed by asset name); see [art/README.md](../art/README.md).

## 2. Import and display

| Asset | Source | Colour/alpha | Display |
| --- | --- | --- | --- |
| Skill portrait | 800 × 1000 PNG | RGB, opaque black background | Preserve 4:5 ratio; contain rather than stretch/crop |
| Character portrait | 800 × 1000 PNG | RGB, painted local colours | Preserve 4:5 ratio and decisive face/hand framing |
| Wick trait master | 1254 × 1254 PNG | RGBA, white ink with transparency | Square, preserve alpha, preview on dark UI |
| Wick test trait/perk | 1024 × 1024 master; 256/128/64/40 px exports | RGBA, exact white ink and alpha cutouts | Review candidates; use a dark chip on light screens |
| M813 world illustration | 1600 × 900 PNG | RGB, painted local colours | Preserve 16:9; enforce spoiler routing |
| Painted gear icon (`catalog.gear`) | 1024 × 1024 master; 256/128/64/32 px exports | RGBA, full colour, transparent | Square, never tinted or masked; the web build ships `gear-<item id>` (64) and `-lg` (256), resolved by `apps/web/src/game/gearIcons.ts` |

Treat these as colour artwork in the engine's sRGB/color-texture mode, not normal maps or linear data. Begin with ordinary filtered scaling and inspect the result at the actual UI size. Compression and mipmap choices depend on the target engine and device; avoid settings that erase brush gaps or Wick's pixel-face separations.

The skill hue is already painted into the PNG. Do not apply a full-image tint: it would colour the cream body and destroy the palette. Use `skills[id].ui_ink` for the accompanying label, border or attribute UI. `skills[id].color` is the painted pigment; Expression and Virtue pigments are too dark for text on PHC's dark UI (about 2.2:1). The black background is intentional, not an alpha matte to remove. Character paintings keep their own material colours. Render Wick with alpha blending; the approved master is white, without glow or a drop shadow.

These are source assets, not pre-packed atlases. If an engine needs an atlas, smaller exports or different compression, derive them in that project's build pipeline and retain these masters. Labels and UI frames are separate UI elements; they are not baked into the individual portraits.

## 3. Match the current palette

Read [palette.json](../art/style-guide/palette.json). Endurance is #CC2435 crimson, Strength #F68A38 orange, Agility #E3BF51 gold. Expression is #075369 deep petrol-blue and Virtue #86234E dark mulberry. All other current attributes are specified there too. Each attribute also has a `ui_ink` (same hue, at least 4.5:1 on the raised UI surface); the `ui` block holds core, state and neutral colours. Rules: [colour-system.md](design/colour-system.md).

For future skill art: pure black background + neutral cream #F2E5C8 body + the attribute hue for every other mark and shadow. Darker/lighter shades of that hue are allowed. The hex values are art-direction anchors, not a claim that painted PNGs are indexed to three literal pixel values.

Wick trait and perk icons are both pure white; they never take a skill colour. Show a perk's requirements as labelled skill chips beside the icon, each chip in its attribute's `ui_ink`.

## 4. Check before wiring into a screen

- Confirm all 27 skills resolve to `art/icons/skills/`, not the historical character filenames.
- Readability: inspect the supplied [80-pixel thumbnail sheet](../art/_archive/skills/poc4-palette-v3/previews/thumbnail-test-80px.png), then inspect the actual UI scale. Keep skill labels accessible; colour alone should not identify a skill.
- Preserve aspect ratio, full gesture, alpha and intended black background. Avoid cropping hands or adding a uniform tint.
- Confirm UI labels and borders use `ui_ink`, not the pigment `color`.
- Run `python3 tools/validate_art.py` from the root after copying or reorganising the assets.

## Updating the collection

**Since 0.0.1 (9 November 2026)** production art sits in flat folders by use and everything superseded is in `art/_archive/`; the layout and the rules for new work are in [art/README.md](../art/README.md). The paragraphs below record how the Wick run was delivered; their paths were rewritten to where those files are now.

Wick production was delivered incrementally on `art/briefs-complete`. Seven round-2 fixes resolve through `art/_archive/traits/wick/test-set-1/revisions/`; later traits use `art/icons/traits/` and perks use `art/icons/perks/`. New masters include 44, 48 and 56 px exports alongside 256/128/64/40. Read `art/_archive/traits/wick/production-progress.json` for delivered IDs and current coverage; missing items are not silently reported complete. All new candidates retain `production_approved: false`. The source requirements are in `art/briefs/wick-production-icons.md`.

`python3 tools/validate_art.py --asset <catalog-id>` checks all metadata and checksums and checks pixel ink/alpha for the selected incremental delivery. The default checks every icon's pixels. Add `--complete-icons` only when all 74 traits and 76 perks have been delivered. `tools/art/export_wick_icon.py` uses Pillow for technical white-ink separation, safe padding, exact-size exports and review layouts; it does not draw artwork.

The [Wick tests](../art/_archive/traits/wick/test-set-1/README.md) bind to rules data through `data_id` (underscores), while catalog IDs use hyphens. Two perk icons live in the shared test folder but resolve through `catalog.perks`, not `catalog.traits`. All ten have `production_approved: false`; no icon production lock was inferred from generation.

Use `catalog.characters.mpat` and `catalog.characters['mpat-comrade']` for the M813 cast. Use `catalog.illustrations.outpost813` for the opening. `catalog.illustrations['outpost1-repair-bay']` has `spoiler: true`, `visibility: "ending-only"` and a `spoilers/` path. Resolve it only after the ending; exclude it from opening galleries and preload lists. These flags are not security for publicly served files. See the [world collection](../art/_archive/illustrations/m813/v1/README.md).

Put revised art in the production folder under the same file name and move the old file to `art/_archive/` (see [art/README.md](../art/README.md)), update catalog paths and hashes (`python3 tools/rehash_art_checksums.py`), then update the palette and style guide if needed. Keep existing IDs stable. The local collection manifest describes artwork; the central catalog is the implementation map. Do not silently replace approved masters with a newly named "final" image.

The source art pack used numbered folders. Their repository equivalents are: `01-Style-Guide` → `art/_archive/style-guide/v1.2`; `02-Wick-Trait-Example` → `art/_archive/traits/wick/mind-without-fog`; `03-Character-Portraits` → `art/portraits/world/new-faces`; `04-POC4-Skill-Portraits` → `art/icons/skills`.

**Map kits (rules 1.45).** Survival's generated fight maps are drawn from the setting's kit, never from a painted map:
`catalog.kit['kit-<setting>-<piece>']` (written from `art/sprites/kit/<setting>/` by `python3 tools/art/kit_catalog.py`;
a piece with `use: false` is held back with its reason). `npm run assets` builds each piece as the web asset of the
same id (a ground in four quarter turns, `-r0` to `-r3`); `apps/web/src/game/kitMap.ts` picks pieces per tile from the
map's `skin` and draws the plain fallback for any piece that has no asset. Check grounds with
`python3 tools/art/kit_seams.py --sheet <dir>` (each must print "clean") before taking a delivery in.

**Survival's path screen and shops (14 Nov 2026).** By catalog id from `catalog.survival_art`: a `path-map-backdrop`
is built as its own id, `survival-map-<setting>`, and `apps/web/src/game/PathMap.tsx` draws it (the field chart in code
when missing; a dark band under the lanes for the backdrops listed in its `SCRIM`); a `shopkeeper-portrait` is built as
its own id, `survival-keeper-<setting>`, the id a face's `portrait` names in `data/survival.json` (the validator accepts
`survival_art` ids there); the marker sheet's `marker_exports` are built as `survival-node-<kind>` and drawn by
`PathMap.tsx`'s `NodeGlyph` (a CSS mask, so the state colours apply; the line icon of `runIcons.ts` for any kind
without one). `painted-map` entries are style-model training material and are never built.
