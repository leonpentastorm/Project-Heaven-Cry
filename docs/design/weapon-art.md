# Weapon art: mechanical, edgy, goth gun-nut (rule, Leon, 10 Nov 2026)

**Every weapon in the game looks cool, in a mechanical, edgy, 2009 goth gun-nut way.** Not cute, not soft, not a
friendly UI pictogram. Leon's verdict on a soft line icon was "goofy ass icon"; these two drawings are the reference
for the bar instead:

| Weapon | Reference |
|---|---|
| Hellraiser service rifle (`hellraiser_service_rifle`) | [`weapon-art/hellraiser_service_rifle.svg`](weapon-art/hellraiser_service_rifle.svg) (render: `.png`) |
| Lumeri censer gun (`lumeri_censer_gun`) | [`weapon-art/lumeri_censer_gun.svg`](weapon-art/lumeri_censer_gun.svg) (render: `.png`) |

## The rule

1. **Side profile, muzzle to the right, the whole weapon,** on the game's dark panel (`#10151F`–`#0A0D13`, a
   `#232D3F` frame). **Silhouette first:** it must still read as that weapon at 160 × 60 px.
2. **Over-built and mechanical.** Slab plates, chamfers and bevels, visible bolts and rivets, rails with teeth, ports,
   ejection ports, levers, bands. Exaggerate the part that says what the weapon does: the Hellraiser's ported brake and
   bayonet, the censer gun's caged censer, a drum, a core, a fuel tank.
3. **Edge.** Blades, spikes, saw-backs, teeth, hazard stripes, war paint, unit stencils, trophies, charms, prayer
   beads. Something on every weapon is sharp, painted or hung on it.
4. **Goth.** Blackened iron and gunmetal, aged brass, dark wood, bone and leather. Ornament where the faction would
   put it: lancet windows, filigree, reliquaries, sun marks, skulls only where the faction is that kind of faction.
5. **Light.** A hard rim light on the top edges, deep shadow underneath, a drop shadow under the weapon, and **at most
   one glow** (embers, a mana core, a pilot light).
6. **Faction signature,** so a weapon says who made it (from the EPCCG; Suggested until Leon confirms each):
   - **Hellraiser Divisions:** brutal slabs, war-red paint (`#A3171B`), division numbers (101, 237), bayonets,
     trench spikes, hazard stripes.
   - **Lumeri Church:** gothic church iron, brass, lancet windows on embers, the Lumeri sun, incense, prayer beads.
   - **Adamantile Brigade:** knightly plate, heavy rivets, engraved crests, oversized everything.
   - **Science Team / Sigil arms:** precise machining, glass core windows glowing in the Mind cyan (`#4FC8DF`).
   - **Thousand World Legion:** clean, mass-produced, stencilled serials, practical.
   - **Rigaz Trade Company:** corporate polish, the ™® on everything, a price tag.
   - **Orks:** crude scrap, welds, teeth, tape, nails.
   - **Central City:** chrome, civilian lines, shock-baton blue.
7. **Invented, never real.** Real guns are loose reference for how mechanisms work, never a recognisable real model,
   maker mark or name (the Unspoken Name). Stencils and marks are in-world: division numbers, the Lumeri sun.
8. **Format.** An SVG master on a 640 × 240 viewBox, built from shapes, gradients and line work. Textures (grain,
   rust, scratches) only from CC0 / CC BY 4.0 sources, credited, as the sound and VFX rule says (CLAUDE.md).
   Weapon art never uses the white flat ink of the Wick icons: that ink is for traits, perks and prayers only.

## Where it's used

The inventory and backpack rows, the Proving Ground's gear list, loot piles' hover cards and the reload card. Not
built yet: these two are the reference; the other 58 weapons in `data/weapons.json` follow this rule as they're drawn.
