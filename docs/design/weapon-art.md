# Weapon icons: monoline, and every weapon looks cool (rule, Leon, 10 Nov 2026)

Two rulings from Leon on 10 Nov 2026:

1. **Every weapon looks cool, in a mechanical, edgy, 2009 goth gun-nut way.** Not cute, not soft. (A soft line icon of
   the censer gun was "goofy".)
2. **The icons are monoline, like a professional line-icon set** (his reference: a 40-icon outline weapon set).
   Hand-drawn shaded SVG paintings don't reach the quality of painted art, so weapon icons don't try: they are clean
   outline icons, and the edge lives in the silhouette.

| Weapon | Icon |
|---|---|
| Hellraiser service rifle (`hellraiser_service_rifle`) | [`weapon-art/hellraiser_service_rifle.svg`](weapon-art/hellraiser_service_rifle.svg) |
| Lumeri censer gun (`lumeri_censer_gun`) | [`weapon-art/lumeri_censer_gun.svg`](weapon-art/lumeri_censer_gun.svg) |

Preview (each at 256, 64 and 32 px, on the panel and on white): [`weapon-art/preview.png`](weapon-art/preview.png).

## The rule

**The line**
1. **A 64 × 64 viewBox, a 2-unit stroke**, round caps and joins, no fill, `stroke="currentColor"`. The UI sets the
   colour: white ink on the dark panel, or an attribute's ink where the screen colours by meaning.
2. **One closed outline for the silhouette**, then **two to four interior lines** for what matters (a port, a vent,
   a window, the trigger). Never a pile of separate parts.
3. **Gaps never narrower than the stroke.** Two parallel lines sit at least 4 units apart centre to centre, or they
   blur into one at 32 px.
4. **Long guns lie along a slight diagonal** (about −16°, muzzle up and right) and fill the square; pistols and
   blades may sit straight or on the 45°. Centre the weight in the square.
5. **It must read at 32 px.** Check at 256, 64 and 32 before it ships.

**The cool**
6. **The silhouette carries the edge:** a bayonet, a saw-back, trench spikes, a ported brake, a drum, a censer, a
   blade, a hook. Every weapon gets one thing that's sharp, heavy or strange.
7. **A faction signature in one or two lines** (Suggested until Leon confirms each):
   - **Hellraiser Divisions:** bayonets, trench spikes, ported brakes, slab shapes.
   - **Lumeri Church:** lancet windows, the censer, spires, prayer beads, incense.
   - **Adamantile Brigade:** plate shapes, oversized guards, crests.
   - **Science Team / Sigil arms:** a core window, precise straight lines.
   - **Thousand World Legion:** plain, mass-produced shapes.
   - **Rigaz Trade Company:** sleek lines and a tag.
   - **Orks:** jagged, nailed, uneven outlines.
   - **Central City:** clean civilian lines.
8. **Invented, never real.** Real guns are loose reference for how mechanisms work, never a recognisable real model,
   maker mark or name (the Unspoken Name).
9. **Not Wick's mode.** Weapon icons are their own mode: Wick's white flat-ink figures are for traits, perks and
   prayers only.

## Where it's used

The inventory and backpack rows, the Proving Ground's gear list, pile hover lists and the reload card. These two are
the reference; the other 58 weapons in `data/weapons.json` follow the rule as they're drawn.
