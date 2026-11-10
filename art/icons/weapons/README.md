# Weapon and armour icons

Monoline icons for every weapon (`data/weapons.json`, here) and every armour piece and shield (`data/items.json`
categories `armour` and `shield`, in `../armour/`). One file per item, named by its id. The rule is
`docs/design/weapon-art.md` (Leon, 10 Nov 2026); this is the working spec.

## The line
- Root exactly: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`, then one comment with the item's name. No other
  colours, no fills, no filters, no text. The UI colours it (`currentColor`).
- **One closed outline for the silhouette, then at most three interior lines** (a port, a vent, a trigger, a seam).
- **Nothing floats** (Leon, 10 Nov 2026): every stroke touches the silhouette. No smoke, sparks, motion lines,
  sparkles, separate beads, detached blades or loose straps. A bayonet shares the barrel's edge.
- **Gaps never narrower than the stroke**: parallel lines at least 4 units apart centre to centre.
- **Inside 2–62** on both axes; the weight centred in the square.
- **Simple**: if it still reads with a line removed, remove it.

## Poses
- **Long guns** (rifles, shotguns, SMGs, heavy, crossbows): side profile, muzzle right, in a group rotated −16° about
  the centre (`rotate(-16 32 32)`), about 58 units long.
- **Pistols and revolvers**: side profile, muzzle right, level, as large as fits.
- **Blades, axes, maces, polearms, staves**: on the 45° diagonal, handle bottom-left, head top-right.
- **Bows**: upright on the diagonal, string to the lower left.
- **Thrown items, gauntlets, fists**: upright, front or three-quarter view.
- **Armour and shields**: front view, upright and symmetric where the piece is.

## The cool
- Every item gets one edgy feature drawn into its silhouette: a bayonet, a saw-back, spikes, a ported brake, a drum,
  a hook, rivets on a plate edge, a visor slit.
- A faction signature in one or two lines (see the rule): Hellraiser bayonets, trench spikes and brakes; Lumeri lancet
  windows, spires and the censer; Adamantile plate and crests; Science Team core windows; Legion plain mass-produced
  shapes; Rigaz sleek lines; Ork jagged nailed outlines; Central City clean civilian lines.
- Items in the same category must be told apart at 32 px: different length, magazine, stock, barrel or head.
- Invented, never a recognisable real model or maker mark.

References: `hellraiser_service_rifle.svg`, `lumeri_censer_gun.svg`.

## Where it's used
The game loads every file here and in `../armour/` through `apps/web/src/game/gearIcons.ts` (`gearIcon(id)` gives the
SVG markup or `null`; `hasGearIcon(id)`); screens tint it with CSS `color`. `gearIcons.test.ts` checks every weapon,
armour piece and shield in the data has an icon that follows the line rule. Contact sheets:
`docs/design/weapon-art/weapons-sheet.png`, `docs/design/weapon-art/armour-sheet.png`.
