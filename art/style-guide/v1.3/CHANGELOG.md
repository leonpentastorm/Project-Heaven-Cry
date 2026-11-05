# Version 1.3 — 5 November 2026

- **Wick review 1 and production rules:** three test icons approved, six to revise, one redo. New binding rules for every trait and perk icon (no lettering, one full figure, a big single prop, an ink-weight range, checks at the UI's 44/48/56 px) in section 14. Production brief for all 74 traits and 76 perks: `art/briefs/wick-production-icons.md`.

- **Brief delivery:** two M813 portraits, two world illustrations and ten Wick test candidates added in new collections. Exact-size exports, 40/128 px reviews, separate perk catalog entries, source hashes and ending-only metadata accompany them. Candidate status does not approve a new style anchor or start icon production. Approved artwork is unchanged.
- **Perks are white.** Trait and perk icons both use pure white #FFFFFF flat ink. The v1.2 rule that mixed a perk's requirement colours into one ink is retired; mixed inks collided with real attribute colours (crimson + gold = Strength's orange). The UI shows requirements as labelled skill chips instead.
- **Pigment vs UI ink.** The nine skill pigments are unchanged. Each attribute gains a `ui_ink`: the same hue, lightened only until it reaches 4.5:1 on the raised UI surface. Changed inks: Endurance #F65157, Expression #5394AC, Determination #9D7ADC, Virtue #D36A90. Pigments stay inside artwork.
- **UI colour system** added to palette.json (`ui`): core colours, state colours (success #6FEA77, MP #5C9EFF, HP/damage #F65157, failure muted, Echo white) and neutrals. Rules in docs/design/colour-system.md.
- **Wick is canon:** the EPCCG's own mascot, drawn after the 258th Medical Unit's field automata (MPAT's unit). The chest cross is the 258th's medical cross; keep its arms thick so it never reads as a gun sight. Lore in docs/lore/Wick.md.
- **One guide.** `PHC-Style-Guide.md` replaces START-HERE, the Heavenprint, Wick and Abstract Skills bibles, the Icon Lock and Prompt Templates (all of which repeated the combined bible). Prompts are in section 12; the icon lock is section 14.
- **Character portraits.** All three Heavenprint sets (Original, First-Patch Revival, New Faces) live in `art/character-portraits/`. First-Patch Revival is the EPCCG cast; the other two are a pool of world characters.
- The illustrated PDF was not regenerated. It remains in v1.2; for v1.3 the Markdown files are authoritative.

# Version 1.2 — 5 November 2026

Separates human-style character paintings, faceless abstract skill portraits and Wick icons. Adds the latest POC 4-derived readable gestural style and strict black/cream/one-hue rule. Skill palette v3: Endurance crimson; Strength orange; Agility gold; Expression deep petrol-blue; Virtue dark mulberry. Other attributes retain their current colours. Updates prompt templates and future-use guidance. Preserves the approved character and Wick references unchanged.

Version 1.1 locked the first Mind Without Fog icon: cape, lantern heart, asymmetry and flat ink. That approval is unchanged.
