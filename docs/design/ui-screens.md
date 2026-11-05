# UI screens (prototype)

Prototypes live in `design/canvas/` as Design Component files (`.dc.html`), the format of the claude.ai design canvas: <https://claude.ai/artifact/9kVVNppZERUaCxBCMWbZgM>. Each file is one screen: markup inside `<x-dc>`, logic in a `class Component extends DCLogic` script, with `{{holes}}`, `<sc-for>` and `<sc-if>` for templating. Treat them as interaction specs to rebuild in the real client, not as code to ship. The logic in `Create.dc.html` (point buying, auto-raise and cost preview) is a working reference for the creation rules.

Shared visual language: near-black ground; skills in their attribute's colour (9 hues), cores in Body amber, Mind cyan, Soul violet; Spectral for prose, Chakra Petch for UI. Every colour rule and token is in [`colour-system.md`](colour-system.md). Trait and perk icons are white Wick ink.

## Story mode — `Main.dc.html`

- **Header:** wordmark, Story/Combat switch, Narrator chip ("AI · your key"), room code, settings.
- **Left: character panel.** Portrait, HP/MP/XP bars, Echo, Supplies and Karma. Five tabs, which together cover the 2020 Excel character sheet:
  - **Skills:** core tabs, attributes and skills, modifiers, signature tags.
  - **Status:** derived combat stats, traits, perks, buffs and debuffs.
  - **Gear:** both hands, weapon mastery, 9 armour slots, backpack weight and inventory.
  - **Magic:** Sigils, Soul spells, Blessing.
  - **Bio:** the Character Bio sheet fields.

  The panel scrolls independently.
- **Centre: narrative.** A large opening lore picture and chapter title, then the lore text, then the scene. Prose is in Spectral, with coloured character names, sound-effect lines, co-op players' lines with avatars, inline roll results, and **Inner Voice cards** (for example "SENSORY [Easy 8 · Success]"). The input is docked at the bottom: suggested actions (each tagged with skill, TN and modifier), free text, a Roll button and Send. The story scrolls above it.
- **Right column:**
  - **Area map.** A top-down map drawn by the AI Narrator: a cube on an object, zones, a sound trail, fog over unexplored areas. A human Narrator gets the drawing tools (Select, Cube, Zone, Arrow, Label, Erase); players see it read-only.
  - **Speaking order.** Who is speaking now, who has spoken, who has requested a turn, and who is waiting, plus Pass and Request buttons.
- **Voices** (rules 1.1): each story beat can bring up to 2 private voice cards per player ("ANALYSIS [Passive 13 vs 12]" plus the line in that skill's voice). Clicking a skill in the sheet **asks** it (once per scene). When an Overreach fires, the skill's push appears as a card with two buttons: **Indulge (+1 Echo)** and **Resist (−1 Echo**, −2 if Mastered).
- **Dice overlay:** a full-screen d20 spin showing the skill, TN and modifier, then the sum ("d20 11 + 1 = 12") and the verdict (Success, Failure, Critical Success, Complication). Spend Echo to reroll.

## Combat mode — `Combat.dc.html`

- Initiative strip across the top.
- **Grid:** 16 × 11 tiles of 1.5 m, with move range, half and full cover, round party tokens and square hostile tokens, and an Overwatch line.
- **Turn panel:** the AP bar previews the selected action's cost. The action list scrolls and is grouped as Class, Movement, Attack and Utility (20 actions). **Hover for detail**: rule text, AP cost and requirements. Rank-locked moves are shown locked. Confirm and End turn.
- **Below:** target card and a short combat log in prose.

## Room — `Room.dc.html`

- Four seats with lock-in status, a copy-invite button, "Create a character" and "Bring a saved character". Start Session waits until every seated player has locked in.
- **Who narrates?**
  - **AI Narrator:** pick a provider (Anthropic, OpenAI, Google, OpenRouter, or local OpenAI-compatible), enter an API key and model. The key stays in the browser.
  - **I'll narrate:** a private Narrator screen.
- Tone: Grim, Pulp or Literary.

## Character creation — `Create.dc.html` (+ `CreateCores`, `CreateSkills` open it at those steps)

In-world framing: creation is filling in the EPCCG, Anti-Heaven Operations Command's intake form, whatever the character's affiliation.

Steps: **Identity → Skills → Traits → Kit → Lock in.** (Rules 1.1: creation is 10 skill points, at most 5 in one skill; Attributes and Cores rise automatically. **The prototype's three-pool logic predates this and needs rebuilding.**)

1. **Identity:** name; **Sector** (the Earth Sector by default), then **origin** from that Sector's list (`docs/lore/Sector-Earth.md`), shown as cards with what you know and how people see you; race (once races exist); association, last dream, favourite song, history, and a portrait (upload or generate).
2. **Skills:** one core at a time (three big tabs). Each attribute is a row: an attribute block with diamonds, a plain-words effect, then its **three skill cards** with portrait slots, descriptions, diamonds and a stepper. One budget only: **10 skill points**. Raising a skill raises its Attribute and Core for free; the stepper preview says so ("−1 skill · Endurance 3→4 · Body 3→4 · Mastery 1"). Class presets fill a class's signature skills. **Your archetype** (Soldier, Scholar, Believer, Operator, Crusader, Mystic, Drifter) shows live beside the tabs, chosen from the Cores the skills produced, with its portrait.
3. **Traits:** pick up to two. Incompatible traits grey out.
4. **Kit:** three starting kits.
5. **Lock in:** a checklist, Lock in (only once all 10 points are spent) and Save as draft.

The old **Cores** screen (modelled on Disco Elysium's "Adjust abilities": big rows, descriptor words Feeble → Legendary, `‹ N ›` steppers) moves to **level-up**, where Core and Attribute points are spent.

The Identity, Traits, Kit and Lock-in steps have a side panel with a live preview and the classes you'd qualify for at level 3.
