# Next images when quota permits

Read `art/AGENTS.md`, the style guide, and File08 base prompt G, A2 and A3.7. These are fictional RPG inventory paintings. All are review candidates, not approved art. Keep the Standard geometry, pose, framing, part counts and negative spaces; alter surfaces only. Attach the Standard and, from Masterwork on, the preceding grade. Use image_gen edit mode with transparent background. No text, symbols, added parts or glow outside the outline.

## 1. Ballistic Helmet Relic, then Celestial

Standard: `art/icons/gear/armour-ballistic_helmet.png`. Preceding grade for Relic: `art/icons/gear/armour-ballistic_helmet--masterwork.png`. Fine and Masterwork already exist; do not redraw them. Relic was quota-blocked, not rejected for content.

Keep line: the exact rounded olive-grey ballistic shell with flat brow band, rectangular mounting block on the brow, side riveted fittings, deep U-shaped face opening and dark padded inner liner. No wearer. Every edge, rivet, opening and fitting remains in place.

Relic: warm deep olive-metal patina, darker warm cloth liner, brow inlay dull old gold. One tiny flush blank gilt inset at an existing strap/rivet mount. One old repair is a small older-cloth patch in the existing padded liner, wholly inside its shape. No new damage or silhouette change.

Celestial: flawless pearl-ivory shell and fittings, ivory padded cloth liner and pale straps. Keep the brow inlay route and tiny flush gilt inset location. Inlay has faint ivory-gold inner light only within its surface. No halo, external glow, rays, wearer or new parts. Attach the newly made Relic as the second reference.

## 2. Night Goggles, all four finishes

Standard: `art/icons/gear/armour-night_goggles.png`. Keep line: the exact paired round cyan-glass lens barrels, metal bridge, box-like top mount with cyan inset detail, dark leather head strap and square adjustment buckle. Preserve lens colour, lens count, fittings, strap loop and all negative spaces. No wearer. Focal part: the rings around the lenses; ornament at the strap mount.

Use A3.7 Fine, Masterwork, Relic and Celestial sequentially. The cyan lens glass and cyan mount detail retain their own colour throughout. The grade line belongs only on the metal lens rings; no tint across the glass, no added glow outside the object. Relic repair belongs on existing strap material. Celestial keeps the glass cyan while the frame becomes pearl-ivory.

## 3. Gas Mask, all four finishes

Standard: `art/icons/gear/armour-gas_mask.png`. Keep line: the exact dark rubber hood with top strap and buckle, two angular amber-tinted lens windows in metal frames, paired round olive filter canisters and rectangular lower breathing valve. Same headless empty mask, same part counts, all lens/filter openings and strap loops. Focal part: cheek plates around the filters; ornament at the strap buckle.

Use A3.7 Fine, Masterwork, Relic and Celestial sequentially. Lens glass and filter colours remain their own colours even at Celestial; only the surrounding shell, cheek plates, straps and fittings receive the grade finish. No added hose, canister, head or wearer.

## Delivery steps

Run from repository root. For each native image, create a metadata JSON with `id` (full armour stem), `tier`, `src` (generated local PNG), `prompt` (exact prompt), `refs` (Standard and preceding reference paths), and `previous`. Pass it explicitly to `python3 art/_archive/prompt-pack/2026-11-19-file-08/archive-proof.py /path/to/metadata.json`. The archive command refuses to overwrite an existing source. Rehash, commit and push each picture to the continuation branch before the next picture.

Run `prepare-candidates.py` in the same archive, inspect the inventory-size comparison, and publish each selected candidate with `register-grade.py ID TIER`. The script also writes the four exports and catalog metadata. Rehash and push each registration. `validate-grade-delivery.py` checks the actual delivery. Do not count drafts, alternatives or exports as extra pictures. Keep every native render, prompt and prior version. Exact-outline review is still pending; never call it passed merely because the technical checks pass.
