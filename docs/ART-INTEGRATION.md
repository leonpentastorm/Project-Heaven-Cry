# Art integration

## 1. Resolve a stable ID

Load [../art/catalog.json](../art/catalog.json). Its paths are relative to the repository root, not this document or the JSON file. The catalog has three separate maps: `skills`, `characters`, and `traits`.

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

## 2. Import and display

| Asset | Source | Colour/alpha | Display |
| --- | --- | --- | --- |
| Skill portrait | 800 × 1000 PNG | RGB, opaque black background | Preserve 4:5 ratio; contain rather than stretch/crop |
| Character portrait | 800 × 1000 PNG | RGB, painted local colours | Preserve 4:5 ratio and decisive face/hand framing |
| Wick trait master | 1254 × 1254 PNG | RGBA, white ink with transparency | Square, preserve alpha, preview on dark UI |

Treat these as colour artwork in the engine's sRGB/color-texture mode, not normal maps or linear data. Begin with ordinary filtered scaling and inspect the result at the actual UI size. Compression and mipmap choices depend on the target engine and device; avoid settings that erase brush gaps or Wick's pixel-face separations.

The skill hue is already painted into the PNG. Do not apply a full-image tint: it would colour the cream body and destroy the palette. Use `skills[id].color` for the accompanying label/border or attribute UI. The black background is intentional, not an alpha matte to remove. Character paintings keep their own material colours. Render Wick with alpha blending; the approved master is white, without glow or a drop shadow.

These are source assets, not pre-packed atlases. If an engine needs an atlas, smaller exports or different compression, derive them in that project's build pipeline and retain these masters. Labels and UI frames are separate UI elements; they are not baked into the individual portraits.

## 3. Match the current palette

Read [palette.json](../art/style-guide/v1.2/palette.json). Endurance is #CC2435 crimson, Strength #F68A38 orange, Agility #E3BF51 gold. Expression is #075369 deep petrol-blue and Virtue #86234E dark mulberry. All other current attributes are specified there too.

For future skill art: pure black background + neutral cream #F2E5C8 body + the attribute hue for every other mark and shadow. Darker/lighter shades of that hue are allowed. The hex values are art-direction anchors, not a claim that painted PNGs are indexed to three literal pixel values.

Wick traits use white. Requirement-based perk icons use a single colour mixed from their required skills, following the style guide. This handoff does not prescribe an unapproved numeric colour-mixing algorithm; the current deliverable is the white trait example.

## 4. Check before wiring into a screen

- Confirm all 27 skills resolve to `art/skills/`, not the historical character filenames.
- Readability: inspect the supplied [80-pixel thumbnail sheet](../art/skills/poc4-palette-v3/previews/thumbnail-test-80px.png), then inspect the actual UI scale. Keep skill labels accessible; colour alone should not identify a skill.
- Preserve aspect ratio, full gesture, alpha and intended black background. Avoid cropping hands or adding a uniform tint.
- Confirm the current palette matches the relevant UI labels and groupings.
- Run `python3 scripts/validate_art.py` from the root after copying or reorganising the assets.

## Updating the collection

Add revised art under a new versioned directory, update catalog paths and hashes, then update the palette and style guide if needed. Keep existing IDs stable. The local collection manifest describes artwork; the central catalog is the implementation map. Do not silently replace approved masters with a newly named "final" image.

The source art pack used numbered folders. Their repository equivalents are: `01-Style-Guide` → `art/style-guide/v1.2`; `02-Wick-Trait-Example` → `art/traits/wick/mind-without-fog`; `03-Character-Portraits` → `art/characters/heavenprint-new-faces`; `04-POC4-Skill-Portraits` → `art/skills/poc4-palette-v3`.
