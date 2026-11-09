# Changelog

Project Heaven Cry is numbered **0.MINOR.PATCH** until the 1.0 release.

- **Every branch merged into `develop` bumps the middle number** (0.0.1 → 0.1.0 → 0.2.0 …). The person who merges bumps `"version"` in the root and every workspace `package.json` and adds an entry here.
- **The first number becomes 1 at the 1.0 release** (the web game is shipped; Leon calls it).
- *Reading for Leon to confirm:* a hotfix committed straight to `develop` without a branch bumps the **last** number (0.3.0 → 0.3.1).

The game shows its version in the corner of the title screen and in every "Report a problem" bundle (`gameVersion`), read from the root `package.json` at build time (`apps/web/src/version.ts`).

## 0.3.0 — 9 November 2026

Branch `feature/world-play-1.1`: **World Play 1.1, rules revision 1.9** (decision 106; `docs/design/world-play-1.1-spec.md`; spec section 14 items 671–700, all provisional; hand-off `docs/design/handoffs/world-play-1.1-HANDOFF.md`). Playtest: rangers ran out of ammo all the time. Dropped magazines were a 10 px mark nobody saw, the fight's floor vanished when the fight ended, an area-map reload deleted the magazine, and enemies dropped nothing.

- **Piles:** what lies on a tile is one pile (a `pile` map object sharing the cache code), drawn as a stack with a count on the combat grid, the area map and the minimap.
  - Hover lists it: "Rifle magazine 7/24", "38 × .32 Decrkm".
  - Pick up (1 AP, your tile or next to it, on any map) opens a checklist. Searching a body is "take everything".
  - Piles keep exact items (rounds, ammo type, rarity, durability, mods), merge per tile (at most 24 entries), and persist between the area map, fights, zones and saves.
  - Players see piles only on tiles the party can see. The Narrator can hide one until it is spotted.
- **The Narrator places piles** with `ground[]`. `loot[]` and `ground[]` can now hand over ammo (`mag:<weapon>`, `rounds:<calibre>`). The Proving Ground has "A PILE (ON THE GROUND)".
- **Reloading is a choice:**
  - speed reload: the current cost; the old magazine drops into the pile;
  - tactical reload: +1 AP; the old magazine goes back in your pack.
- **Gear in a fight, 1 AP a hand:**
  - draw 1, a two-handed weapon 2, swap hands 1, put away 1 a hand;
  - drop is free and lands in the pile;
  - light armour (1.2 kg or less) 1 AP a piece; heavier armour can't change in a fight;
  - Hot-Swap still makes a swap free.
  - A **backpack button** in the fight (key B) opens the inventory with each row's cost. "Hold the Evoker/Emanator" is gone, and a focus still counts only in a hand.
- **Drop tables** (`data/loot_tables.json`):
  - the engine rolls every drop on the fight's dice, once per death, into the pile where the enemy died;
  - enemies always drop the weapon they used (worn) and their leftover magazines;
  - rolled items by kind: parts and cores from machines, personal effects from people, cores and plates from casters;
  - at most 2/3/4/5 rolled items a fight by difficulty; a boss always drops one notable thing;
  - three layers: engine defaults < a campaign's `loot_tables`/`drops` < the Narrator's `drops` for one fight.
- **Paths:** a player's click-path goes around revealed hazards when an affordable detour of at most 2 tiles exists. The preview marks any hazard it still crosses. Enemy paths are unchanged.
- **Fixed:**
  - picked-up off-hand magazines lost at the end of a fight;
  - magazines counted twice after a mid-fight swap;
  - the pack index shifting under an equip;
  - objects lost when a fight ran on another zone's map;
  - an off-hand gun reloading for free;
  - stims and Essences picked up as dead weight.
- **Merged with 0.2.1:**
  - World Play 1.1 is rules **1.9**, since Outburst 4.0 took 1.8;
  - dropped Heart plates never roll a shelved module;
  - the Narrator's stable prompt guard is 25,000 tokens.
- **e2e:** a new `ground.mjs`. `lib.mjs` no longer sends a loopback BASE through `HTTPS_PROXY`.
- **Waiting on Leon:**
  - the light-armour line (1.2 kg);
  - the drop-table weights and the 20 personal effects;
  - whether area-map kills (outside a fight) should drop loot;
  - whether a click-path may walk straight through a revealed hazard on purpose.

## 0.2.1 — 9 November 2026

Branch `hotfix/outburst-4.0-review`: **fixes from the Outburst 4.0 review**, before it went live. Each fix has a regression test.

- **Crash fixed:** Release after pouring Love, Joy or Calm, before picking a tile, no longer breaks the combat screen.
- **Revert Pump** takes back only the last pump. A Feed's stage, AP and glyph now stay.
- **Fuse:** the release hook fires once. Heart Surge and Fusion now reach the delayed blast. A Fuse still waiting when the fight ends fizzles out ("A fuse fizzles out.") instead of going off later on the area map.
- **The 10 advanced-class modules** can no longer be learned or designed while their classes are shelved: not from the Narrator, a plate, a Proving Ground design or a starting Outburst. The Proving Ground shows them locked.
- **Practice** from a release on the area map is counted once (it was counted twice).
- **HEART panel:** while pumping, the stage bar and counter stay in view. "now HEALS"-style lines wrap on their own line, in combat and on the area map.
- **Test fix:** the `feel` e2e suite equips an Evoker in hand, as the focus-in-hand rule (decision 103) requires.
- **Waiting on Leon:**
  - The HEART panel needs one short scroll to reach its second button row (Let go, Overwatch) at 1440×1000. The `heart` e2e check was relaxed to match. Make the panel more compact if both rows must show at once.
  - A Fuse's release effects (Heart Surge's Strain, faith tags) now happen on the cast turn; its damage comes when it goes off.

## 0.2.0 — 9 November 2026

Branch `feature/outburst-4.0`: **Outburst 4.0, Soul magic rules 1.8** (decision 109; `docs/design/outburst-4.0-spec.md`; spec "Soul magic" section 12, items 801–818; hand-off `docs/design/handoffs/outburst-4.0-HANDOFF.md`).

- **Feelings:** 25 (`data/feelings.json`), poured in while you pump:
  - each has its own step on the multiplier and a behaviour (Love heals the allies in the shape, Joy chains, Calm can't miss, Mercy spares…);
  - each unlocks the first time it happens to you (the engine watches; the Narrator can grant one);
  - you start with 2 picked at creation;
  - residue from the strongest one stays on the tiles for 2 rounds;
  - **Revert Pump** takes back a misclick.
- **Modules:** 13 new for everyone (Split, Ricochet, Fuse, Return, Volley, Bloom, Anchor, Lure, Shell, Linger, Quiet, Silent, Thread) and 10 shown locked with their advanced classes. They're gated by Soul skills (never Visualization) and learned by **practice** (picks at 5, 15, then every +15; +5 a Mastery level; a free pick at Mastered).
- **Low level:** 3 starting designs (Heart Bolt, Mend, Heart Wave), the snap cast ×0.8, and the fight's first Pump free. The first tone comes at Lore Master 1.
- **On screen:**
  - the HEART panel's feeling buttons (collapsed past six, with a search), coloured stage segments and the counter's shake and "now HEALS";
  - residue on the grid;
  - the unlock card;
  - the MAGIC tab's collapsible codex (practice, templates, feelings, modules by gate skill);
  - the Proving Ground's grouped tools with a sound and effects test row for each feeling.
- **Art and sound:** SVG icons for the feelings, modules and marks (painted art replaces them by file name); 19 CC0 sounds, credited.
- **Waiting on Leon:** the 25 feeling colours, the readings in items 801–818, the placeholder icons, and the sounds (unheard).

## 0.1.0 — 9 November 2026

Branch `chore/lore-ladder-canon`.

- **The ladder is canon** (decision 108): every layer was made by the one above it and abandoned by it; the title's double meaning. World Bible (marked repo-ahead of the living Doc), `CLAUDE.md`.
- `docs/lore/Wick.md` points at the live master icon, `art/icons/traits/mind-without-fog.png`.
- The spec's revision 1.1 banner notes that Class Roster Revision 3 replaced the 13/18 rank totals (items 551–552).

## 0.0.1 — 9 November 2026

The first numbered version: `develop` as of the repository tidy (branch `chore/tidy-0.0.1`). Live at https://project-heaven-cry.leonpentastorm.workers.dev. What the game contains today, with where to read more:

**Rules and engine** (`docs/rules/PHC-Core-Rules-v1.0.md`, `packages/engine/`)
- The full character tree (3 Cores, 9 Attributes, 27 Skills), d20 checks with transparent dice, inner voices and Overreach, Echo, creation with archetypes and traits, levelling, every perk, trait and class move running in story and combat (decision 94).
- Tactical grid combat: 6 AP turns, reactions, initiative, movement by Agility, the combat fixes and the greyed action panel (the whole panel is inert until it is really your turn; Say stays live).
- **Sigil magic 1.4** (decision 98): glyphs drawn on your own tile, walked into a Line of 2–4 and Evoked; Flux and venting.
- **Outburst 2.0, Soul magic 1.5** (decision 99): Begin, Pump, Release; Strain; crystallising cores.
- **Class Roster Revision 3** (decision 100): nine base classes, one per attribute, earned at level 3; ranks II and III; the 21 advanced classes shelved until they return in batches. The Grand Sigilist's Grand forms and the Sigil damage balance (decision 101).
- **Blessing 2.0, rules 1.6** (decision 102): Faithful or Atheist, eight patrons, Devotion, Whisper/Hymn/Miracle, vows, rites, Witnessed, interventions.
- **Focus in hand** (decision 103): a magic focus counts only when held.
- **World Play 1.0, rules 1.7** (decision 105): the map tells the story: faces and kind badges, carrying, caches, hazards, triggers, Talk, the HERE card, attempts with odds.

**Play modes**
- Story mode with the speaking order, co-op rooms of up to four, solo, and a human Narrator mode; characters locked in before a session.
- The **mission board, OOC channel and end states** (decision 95).
- The **Proving Ground** as real multiplayer practice: friends join, gear up, fight waves co-op or each other (decision 96).
- The M813 one-shot campaign (`data/campaigns/m813.json`) with its maps, sprites, portraits and story moments; map zoom.

**The AI Narrator** (`apps/web/src/narrator/`)
- Bring your own key, **any provider**: Anthropic plus one OpenAI-compatible adapter for OpenRouter, OpenAI, DeepSeek, Gemini, local and third-party sites (decision 104).
- **Narrator craft**: CRAFT, PACING and THE MAP IS THE TRUTH rules, engine-side checks for unplaced names, repeats and running gags (`docs/design/handoffs/narrator-craft-HANDOFF.md`).
- **Narrator voice**: Kokoro TTS in the browser, its model served through this site's Worker (`/hf/`, edge-cached), with Edge's Christopher leading the browser-voice fallback (`docs/design/handoffs/narrator-voice-HANDOFF.md`).

**Screens and polish**
- The painted title screen with Wick's menu clips; it opens once the small images are in.
- Character creation polish (bigger cards, equal heights), screen transitions, the turn card, the adjustable combat layout, map zoom.
- Report a problem: a bundle with the game state, the Narrator calls and the log (the key is stripped).

**Art** (`art/README.md`)
- 27 abstract skill figures, 145 character portraits (EPCCG cast, NPC pool, 46 archetype player cards, the M813 cast), 180 Wick trait and perk icons, the M813 campaign set (banners, story moments, maps, sprites), the title screen and Wick's menu clips.
- Blessing 2.0 art: eight patron portraits (gods as apparitions), eight patron marks and 38 prayer icons.

**Repository (this release)**
- `art/` reorganised by use, with everything superseded in `art/_archive/`; `scripts/` merged into `tools/`; finished hand-offs archived; versioning started (this file); `docs/HANDOFF.md` and `docs/ROADMAP.md` for anyone picking the project up.
