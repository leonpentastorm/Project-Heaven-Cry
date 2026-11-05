# Version 1.3 — 5 November 2026

- **Perks are white.** Trait and perk icons both use pure white #FFFFFF flat ink. The v1.2 rule that mixed a perk's requirement colours into one ink is retired; mixed inks collided with real attribute colours (crimson + gold = Strength's orange). The UI shows requirements as labelled skill chips instead.
- **Pigment vs UI ink.** The nine skill pigments are unchanged. Each attribute gains a `ui_ink`: the same hue, lightened only until it reaches 4.5:1 on the raised UI surface. Changed inks: Endurance #F65157, Expression #5394AC, Determination #9D7ADC, Virtue #D36A90. Pigments stay inside artwork.
- **UI colour system** added to palette.json (`ui`): core colours, state colours (success #6FEA77, MP #5C9EFF, HP/damage #F65157, failure muted, Echo white) and neutrals. Rules in docs/design/colour-system.md.
- **Wick is canon:** the EPCCG's own mascot, drawn after the 258th Medical Unit's field automata (MPAT's unit). The chest cross is the 258th's medical cross; keep its arms thick so it never reads as a gun sight. Lore in docs/lore/Wick.md.
- The illustrated PDF was not regenerated. It remains in v1.2; for v1.3 the Markdown files are authoritative.

# Version 1.2 — 5 November 2026

Separates human-style character paintings, faceless abstract skill portraits and Wick icons. Adds the latest POC 4-derived readable gestural style and strict black/cream/one-hue rule. Skill palette v3: Endurance crimson; Strength orange; Agility gold; Expression deep petrol-blue; Virtue dark mulberry. Other attributes retain their current colours. Updates prompt templates and future-use guidance. Preserves the approved character and Wick references unchanged.

Version 1.1 locked the first Mind Without Fog icon: cape, lantern heart, asymmetry and flat ink. That approval is unchanged.
