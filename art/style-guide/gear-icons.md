# Painted gear icons: the rule (Leon, 13 Nov 2026)

Every weapon and item the engine recognises gets a **Heavenprint painted icon** for the inventory, the backpack, loot
cards and the shop. The monoline SVGs ([`weapon-icons.md`](weapon-icons.md)) are placeholders for that use and stay
for effects and small marks (Sunder's weapon strike, the hover card's weapon glyph) until the painted icons can be
traced or simplified from. The prompts and the per-item list: [`../briefs/GPT-PROMPTS-2026-11-13-gear.md`](../briefs/GPT-PROMPTS-2026-11-13-gear.md).

| | Rule |
| --- | --- |
| **Mode** | Heavenprint object icon: opaque gouache and ink, broken directional strokes, selective dry-brush and hatching, charcoal shadows, ivory accents on focal edges. Not line art, not Wick's flat ink, not a photo, not a 3D render, no gloss |
| **Canvas** | 1024 x 1024 PNG with alpha (the master); the object fills about 80% (inside the central 80 to 85%, about 100 px clear margin). Exports (256, 128, 64, 32) are made by the pipeline |
| **View and light** | One object, three-quarter view, one light from the upper left (as the object sprites), a short painted shading on the object's own underside; no cast shadow, no ground, no scene |
| **Background** | Fully transparent. No frame, no border, no baked label |
| **Palette** | Metal and cloth in the neutrals (charcoal, steel grey, warm ivory highlights, [`palette.json`](palette.json)). **One accent** in the faction's signature colour ([`weapon-icons.md`](weapon-icons.md) signatures; accents listed in the prompts file). The three focus gloves glow in their ink (Evoker `#8BDEEE`, Emanator `#9D7ADC`, Visualizer `#5394AC`), only inside the lens or window |
| **Rarity** | By finish and wear (worn, standard, fine, masterwork, relic, celestial), never a coloured border: the UI adds the frame and marks. The master is Standard; variants are `<stem>--<tier>.png` |
| **Scale in a family** | Every object in a family fills the frame by the same rule (all pistols the same width in frame, all rifles the same length); the silhouette, not the size, tells a derringer from a hand cannon. Heavy things look heavy: thick, dense |
| **Readability** | Bold silhouette first, one or two focal edges of detail. Check at 64 px (shop grid) and 32 px (backpack row) on `#10151F`. Near-twins (two pistols, two helmets) must differ in silhouette at 32 px |
| **Forbidden** | Text, letters, numbers, logos and maker marks; hands, figures, skin; real-world makes, models and emblems (the Unspoken Name; no real red cross: medical goods use a plain plus mark); smoke, sparks and loose floating parts; glow bloom; Wick |
| **Naming** | `art/icons/gear/<kind>-<id>.png`: kind is the data category (`weapon`, `armour`, `shield`, `focus`, `mod`, `tool`, `consumable`, `ammo`, `food`, `light`, `document`, `augment`, `loot`, `companion`), id is the item id with a leading `ammo_` or `mod_` removed; derived gear (not in `items.json`): `armour-torso_class<N>_<name>`, `rounds-<calibre>` (calibre with spaces and dots turned to underscores, `.32 decrkm` is `32_decrkm`), `mag-<family>`, `loot-personal_effects` |
| **Catalog** | A new `gear` map in `art/catalog.json`, key = the file stem (`weapon-service_pistol`), fields as the other maps (`path`, `sha256`, `width`, `height`, `background: transparent`, `status: review-candidate`, `production_approved: false`, `exports`). Claude adds them when files arrive |
| **Beside the monoline set** | Same item id, two files: the painted icon (inventory, shop, loot, inspect view) and the monoline SVG (effects, hover glyph, tinted marks). The painting and the line icon of one item are recognisably the same object, so a faction's silhouette language ([`weapon-icons.md`](weapon-icons.md)) still applies. Painted gear is a different art mode from the object sprites (those are top-down map pieces) and from Wick's icons |
