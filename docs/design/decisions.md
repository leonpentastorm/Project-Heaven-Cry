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
22. **Accepted in rules 1.1:** creation gives only 10 skill points (max 5 in one skill), with attributes and cores following automatically; attribute and core points come only from levelling.
23. **Colour system (art v1.3).** Skills keep 9 attribute colours. Art uses the pigment; the UI uses a contrast-safe ink of the same hue (Expression and Virtue pigments were about 2.2:1 on the UI). Cores keep amber/cyan/violet for core-level UI. State colours moved off the skill hues: success green `#6FEA77`, MP blue `#5C9EFF`, HP/damage `#F65157` (shared with Endurance on purpose), failure muted, Echo white. → `docs/design/colour-system.md`, `art/style-guide/v1.3/palette.json`.
24. **Trait and perk icons are white.** The perk rule that mixed requirement colours into one ink is dropped (mixes collided with real attribute colours). Requirements show as skill chips beside the icon.
25. **Wick is canon:** the EPCCG's mascot, drawn after the 258th Medical Unit's field automata (MPAT's unit). A printed figure, not an NPC. → `docs/lore/Wick.md`.
26. **The EPCCG is the base layer of the lore.** Its English edition is `docs/lore/EPCCG-Player-Character-Creation-Guide.md`; the World Bible is the Narrator's truth layer on top of it. The First-Patch Revival portraits are its 27 quoted characters. → `docs/lore/README.md`.
27. **Skills are abstract figures, not people.** All three Heavenprint portrait sets (Original Heavenprint, First-Patch Revival, New Faces) were painted as skill icons, one character per skill. Playtesters said it made no sense for the player's own skills to be represented by other people in the world, so the skill page moved to faceless abstract figures. The 81 paintings are character portraits in `art/character-portraits/`: First-Patch Revival is the EPCCG cast; the other two are a pool of world characters for NPCs.
28. **One style guide.** Art v1.3 is a single file, `art/style-guide/v1.3/PHC-Style-Guide.md`; the six overlapping v1.2 files kept drifting apart.
29. **One main branch.** The art library (`main`) and the game context (`game-context`) were merged so rules, data, lore, UI and art live in one tree.
30. **Rules 1.1 (5 Nov 2026).** From the gameplay review (`proposals/2026-11-gameplay-fixes.md`):
    - **Skill modifier = points − 1**, so builds show on the dice; Mastered is +9. Dodge, saves, debuff strength and counter use the modifier; crits are natural 20 (19–20 Aimed or from Hidden).
    - **Voices replace Inner Voice:** every trained skill can speak through Narrator hooks and engine passive checks, toned after its EPCCG speaker. Disco Elysium's core, at last.
    - **Overreach is indulge or resist**, no roll: the old 70–90% failure TNs made rolling pointless.
    - **HP:** +15 per Endurance (was +50), 5 + 2 × Durability per level, so tanks last twice as long, not four times, and conditions matter.
    - **XP and classes:** level 3 (the class) at the end of session 1; a 5e-like curve to level 20 at about session 51; class ranks at 13 / 18.
31. **The Unspoken Name** (lore, 5 Nov 2026). Celestials may LARP anything from real Earth, and players can import any character as a Celestial's LARP, but the Accords forbid saying a real-Earth name in the world. References are plain to the players, never to the characters. Official content stays archetypal. Replaces "no pop culture at all".
32. **Tone line revised.** NPCs are funny the way people are; Celestials are funny the way people are when nothing can hurt them. The tragedy belongs to the NPCs. (The EPCCG's NPCs are the funniest people in the book, so the old line was wrong.)
33. **New canon:** Earth is the in-world homeworld (Central City); campaigns usually start with Celestial mayhem; Crawlers are cursed NPC-2 espers; Operation Daggerfall (~3800) nuked their world; people live ~400 years; real Earth is around year 65,000. → World Bible.
34. **More canon:** the 4000s are the Central City founding calendar (history runs back billions of years); the Crawler curse runs one way; the Thousand World Legion is the Thousand-Planet City's army; Bazaim is a human nation of lifted curses.
35. **AHOC's origin:** the Progenitors, a thousand isekai-powered humans who learned the truth ~5,000 years before Central City and were hunted to extinction; their descendants run AHOC now, in decay. Crawlers will be a race option later; humans first.
