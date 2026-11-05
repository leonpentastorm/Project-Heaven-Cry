# UI screens (prototype)

Prototypes live in `design/canvas/` as Design Component files (`.dc.html`), the format of the claude.ai design canvas: <https://claude.ai/artifact/9kVVNppZERUaCxBCMWbZgM>. Each file is one screen: markup inside `<x-dc>`, logic in a `class Component extends DCLogic` script, with `{{holes}}`, `<sc-for>` and `<sc-if>` for templating. Treat them as interaction specs to rebuild in the real client, not as code to ship. The logic in `Create.dc.html` (point buying, auto-raise and cost preview) is a working reference for the creation rules.

Shared visual language: near-black ground; core colours Body amber, Mind cyan, Soul violet; Spectral for prose, Chakra Petch for UI. Exact tokens are in `CLAUDE.md`.

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

Steps: **Identity → Cores → Skills → Traits → Kit → Lock in.**

1. **Identity:** name, origin, race, association, last dream, favourite song, history, and a portrait (upload or generate).
2. **Cores** (modelled on Disco Elysium's "Adjust abilities"): three big rows, each with a descriptor word (Feeble → Legendary), a `‹ N ›` stepper with diamonds, the core name, a description, the attributes it governs and its economy. Random and Reset. **Your archetype** appears live beside the rows with a portrait, chosen by how the points are spread:
   - **One core leads:** Soldier, Scholar or Believer.
   - **Two cores lead together:** Operator (Body+Mind), Crusader (Body+Soul) or Mystic (Mind+Soul).
   - **All three even:** Drifter.
3. **Skills:** one core at a time (three big tabs). Each attribute is a row: an attribute block with its stepper, diamonds capped by the core, and a plain-words effect, then its **three skill cards** with portrait slots, descriptions, diamonds and a stepper. Hovering a stepper previews the cost (for example "−1 skill · Endurance 3→4 · Mastery 1") and lights the budget bars. Raising a skill past its attribute auto-raises the attribute and core. Class presets fill a class's signature skills. Refund unused gives back attribute and core points no skill needs.
4. **Traits:** pick up to two. Incompatible traits grey out.
5. **Kit:** three starting kits.
6. **Lock in:** a checklist, Lock in (only once all points are spent) and Save as draft.

The Identity, Traits, Kit and Lock-in steps have a side panel with a live preview and the classes you'd qualify for at level 3.
