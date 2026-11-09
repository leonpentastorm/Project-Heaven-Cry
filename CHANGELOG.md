# Changelog

Project Heaven Cry is numbered **0.MINOR.PATCH** until the 1.0 release.

- **Every branch merged into `develop` bumps the middle number** (0.0.1 → 0.1.0 → 0.2.0 …). The person who merges bumps `"version"` in the root and every workspace `package.json` and adds an entry here.
- **The first number becomes 1 at the 1.0 release** (the web game is shipped; Leon calls it).
- *Reading for Leon to confirm:* a hotfix committed straight to `develop` without a branch bumps the **last** number (0.3.0 → 0.3.1).

The game shows its version in the corner of the title screen and in every "Report a problem" bundle (`gameVersion`), read from the root `package.json` at build time (`apps/web/src/version.ts`).

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
