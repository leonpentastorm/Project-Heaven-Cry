# Design decisions log

Why PHC is the way it is. Newest last. Each entry: what was decided, why, and where it lives.

## 2020 (original team)

1. **Disco Elysium's skill web, with combat.** 27 skills under 9 attributes under 3 cores; skills are also inner voices. The 2020 team's aim was to make that web drive tactical combat too. Source: `Official_EPCCG.docx` (Vietnamese, in the claude.ai Project).
2. **Points cap downward.** Core caps Attribute, Attribute caps Skill (the "Đồng chí mèo" example in the EPCCG).
3. **Traits are big trade-offs.** One large upside, one large downside, max two, for roleplay.

## Nov 2026 revival (Leon + Claude)

4. **Skill track 0–10.** The modifier is −2 at 0 points (the 2020 rule was −5), else floor(points ÷ 2). The harsher −5 punished spreading points and made untrained rolls pointless. Mastery unlocks at 3/5/7/9 points reward depth.
5. **Overreach and Echo.** High mastery can fail spectacularly (Overreach), and choosing to play out a failure earns an Echo reroll token. This keeps Disco Elysium's "your strengths are your weaknesses" in a dice system.
6. **Traits must change a decision**, not just add points. Rebalanced on a price list: net upside about +3 SP, and +1 to a roll costs 2 SP. Kept the deliberate racism trait in clean in-world language and added a xenophobe trait (Humanity First). 74 traits total. All pop-culture references were removed in favour of in-universe text.
7. **Perks:** Acquired (two per skill, Tier I at 3 points, II at 7), Achieved (a combo plus a deed, granted by the Narrator), Ultimate. 76 total. Perks can add at most +3 AP per turn.
8. **Lore locked:** simulation world, nanobots = mana, Celestials (trapped Earth humans) bound by Accords, the Knowing, creation ladder, Evoker = Sigil, Emanator = Soul, heart link for Soul casters.
9. **Class economy:** Body classes use ammo, weapons and tech. Mind classes consume cores and create mana. Soul classes consume mana and create cores. Every martial, gun, bow and assassin class is a Body class. Mage cores each have offense, defense, support and debuff classes. Bows and guns share the weapon-neutral **Marksman**.
10. **Classes are earned, not chosen.** At level 3 your skills give you a base class. If you qualify for two, you choose. Advanced classes mix two base classes and need a tutor.
11. **No classless builds.** The first recipe system left 83% of random builds classless. Fix: each base class has three signature skills covering all 27 skills, plus the closest-class rule (choose among your top two signature totals). Monte Carlo over 100k builds: 0% classless, 3.5 options on average, every class reachable by 26–28% of builds.
12. **Patrons:** anyone with a patron and enough Faith can pray. This replaced a "Faithful" class that fit no economy. Tiers: Devotion, Witnessed (Faith 5), Miracle (Faith 7).
13. **Game-ready format:** one canonical rules spec with every number, plus JSON data. Tactical grid. AI Narrator with any provider (bring your own key). Leon left the stack choice open.
14. **Engine vs Narrator.** The engine owns numbers; the Narrator owns judgement. Every data item is tagged engine, hybrid or narrator. Unknown effect ops fall back to the Narrator.
15. **Sigil words keep the 2020 names** (FIRE, FREEZE, SHOCK, BIND, BLIND, SLOW, MUDDLE, WALL) over newer inventions.
16. **Multiplayer:** up to 4 players per room. A human can narrate instead of the AI.
17. **Speaking order in story mode:** everyone speaks once, then the Narrator answers all of it together. Players can request a turn; the host can skip someone who's away.
18. **Characters lock in before a session** or are saved as drafts and brought into any room.
19. **Character creation flow:** Identity → Cores → Skills → Traits → Kit → Lock in. Separate screens for Cores and Skills, so it's clear which skill belongs to which attribute.
20. **No archetype picker.** You place core points and the screen names your archetype live, with a portrait: Soldier, Scholar or Believer when one core leads; Operator, Crusader or Mystic for two; Drifter when all three are even.
21. **Skills screen = attribute rows.** One core at a time; each attribute is a row with its three skill cards to the right, each card with room for 4:5 portrait art. Raising a skill auto-raises its Attribute and Core, with the cost shown before the click.
22. **Pending (proposed, not accepted):** creation gives only 10 skill points, with attributes and cores following automatically; attribute and core points come only from levelling.
23. **Colour system (art v1.3).** Skills keep 9 attribute colours. Art uses the pigment; the UI uses a contrast-safe ink of the same hue (Expression and Virtue pigments were about 2.2:1 on the UI). Cores keep amber/cyan/violet for core-level UI. State colours moved off the skill hues: success green `#6FEA77`, MP blue `#5C9EFF`, HP/damage `#F65157` (shared with Endurance on purpose), failure muted, Echo white. → `docs/design/colour-system.md`, `art/style-guide/v1.3/palette.json`.
24. **Trait and perk icons are white.** The perk rule that mixed requirement colours into one ink is dropped (mixes collided with real attribute colours). Requirements show as skill chips beside the icon.
25. **Wick is canon:** the EPCCG's mascot, drawn after the 258th Medical Unit's field automata (MPAT's unit). A printed figure, not an NPC. → `docs/lore/Wick.md`.
26. **The EPCCG is the main lore source for people and factions.** Its English edition is versioned in `source/2020/english/`; the First-Patch Revival portraits are its 27 quoted characters. → `docs/lore/EPCCG-Cast-and-Factions.md`.
