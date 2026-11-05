# PHC tech plan, v1

**Status:** proposed, 5 November 2026. The rules spec (`docs/rules/PHC-Core-Rules-v1.0.md`) and the data pack (`data/`) stay the source of truth; this plan says how the web game is built on them. Decisions in section 10 wait for Leon's approval.

## 1. The plan in one screen

- **One engine, written once, in TypeScript.** Pure and deterministic: given a seed and a list of actions it always produces the same game. It runs in the browser for solo play and on the room server for co-op, from the same package.
- **Everything is an action.** A player's click, the AI Narrator's tool call and a human Narrator's button all become actions the engine checks against the rules and applies, or rejects with a reason. Nothing else changes game state.
- **The event log is the game.** Every roll, move, XP award and line of narration is an event. The log is the save file, the replay, the multiplayer sync and the proof the dice aren't fudged.
- **The Narrator is a client of the engine.** It asks for checks, voices the world and grants what the spec lets it grant. It never sets a number the engine owns. Its tools are the spec's `narrator_owns` list (`data/rules.json` → `ownership`), one tool per job.
- **Bring your own key, kept in the browser.** The host's browser calls the AI provider directly; the key never reaches our server.
- **A Narrator call stays at 25–40k tokens** for the whole campaign: cached rules and party sheets, then the scene, a few remembered facts and the last few turns. Estimated cost: about $5 a session for the room on Sonnet 5.5, about $10 on Opus 5.5.
- **Build order:** rules core → creation → solo story with the AI Narrator → combat → the M813 starter slice, playable end to end → co-op rooms → depth (magic, 3D dice, 3D Wick).

## 2. What we already have, and where it goes

| Already built | Becomes |
|---|---|
| Rules spec v1.0 with revision 1.1 and 51 provisional items | The test oracle: every rule gets tests that cite its spec section |
| `data/*.json` (15 files), `tools/validate.py`, `data/CONVENTIONS.md` | `packages/data`: loaded as-is, typed by generated TypeScript types and Zod schemas; the Python validator runs in CI |
| `data/effect_ops.json`: 132 ops, 50 core and 82 bespoke, with every user listed | The effect interpreter's to-do list: the 50 core ops are implemented generically; bespoke ops get per-item hooks when an item is used, and until then fall back to the Narrator with the item's text (never silently ignored) |
| `rules.json` → `ownership` (what the engine owns, what the Narrator owns) | The engine/Narrator split, and the Narrator's tool list |
| 27 voice cards, 46 archetypes, 14 origins, 13 + 15 classes | Loaded straight into creation, voices and class assignment |
| UI prototypes: 11 boards in `design/canvas/`, 759 lines of logic in `design/canvas-build/` | The client's screens, ported board by board (section 6). Reusable logic: creation budgets and legality (`create.logic.js`, `derive()`), movement pathing with AP cost and carry-over (`combat.logic.js`, `paths()`), the EPCCG "?" entries, perk steps, the lightbox |
| `art/catalog.json`, `art/style-guide/v1.3/palette.json` | The asset manifest (asset IDs to files) and the design tokens (CSS variables) |

## 3. Architecture

```
            ┌──────────────────────── browser (each player) ────────────────────────┐
            │  React client ── renders state, sends actions                         │
            │       │                                                               │
            │  engine (same package) ── solo: authoritative; co-op: prediction      │
            │       │                                                               │
            │  Narrator adapter (host only) ── builds context, calls the provider   │──► AI provider
            │       (API key stays here)       with the host's key, turns tool       │    (Anthropic, OpenAI,
            │                                  calls into actions                   │     Google, OpenRouter,
            └───────────────┬───────────────────────────────────────────────────────┘     local)
                            │ WebSocket: actions up, filtered events down
            ┌───────────────▼─────────────── room server (co-op only) ──────────────┐
            │  one Durable Object per room: runs the engine, owns the event log,    │
            │  validates every action, sends each player only what they may see     │
            └───────────────────────────────────────────────────────────────────────┘
```

**Visibility.** Every event carries who may see it: everyone, one player (their own voices and Overreach), or the Narrator only (World Bible truth, hidden enemies, Ultimate perks the player doesn't hold). The room server filters before sending. In solo play the client filters the same way, so secrets never sit in a player's screen data.

## 4. Stack (recommendations; approve in section 10)

| Part | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere, strict mode | One language for engine, client and server |
| Repo | pnpm workspaces monorepo in this repo | Engine, data, Narrator, client and server share types |
| Engine | Plain TypeScript, no dependencies; seeded PRNG (PCG32); state is plain JSON | Deterministic and serialisable: replays, saves and server sync come free |
| Tests | Vitest; fast-check for property tests; Playwright for end-to-end | Fast, and the property tests catch rule-interaction bugs |
| Client | React + Vite; a small store (Zustand) fed by the event log; CSS variables from `palette.json` | Largest ecosystem; the prototypes' template/logic split maps onto components and hooks |
| Grid | SVG/DOM first (maps up to about 30 × 30 tiles) | The prototype already works this way; move to a canvas renderer only if profiling says so |
| Dice | 2D tray first; then the 3D dice table: three.js + Rapier physics, the result decided by the engine and the throw fitted to it | Transparency never depends on the 3D layer |
| Room server | Cloudflare Workers + Durable Objects (one object per room, WebSockets), static site on Cloudflare Pages | Rooms of up to 4 fit one object; cheap at idle; no servers to run |
| Saves | Solo: IndexedDB in the browser. Co-op: the room's log in the Durable Object. Characters: a local library with JSON import/export | No accounts needed in v1 |
| Narrator | Our own thin adapters per provider; tool schemas defined once in Zod and translated per provider | Few dependencies, full control of caching and tool calls |

## 5. The engine

**Shape.** `apply(state, action, rng) → { state, events } | RuleError`. A `RuleError` has a machine code and a plain sentence ("TN 14 isn't on the ladder: use 8, 12, 16 or 20"), which goes back to the Narrator so it can correct itself.

**Modules, in build order:**

1. **Resolution:** d20 + modifier vs TN, the skill-modifier table, nat 20 and nat 1, combined and opposed checks, help, Echo rerolls. Every roll emits a `DiceRolled` event (formula, faces, modifiers, total, TN, outcome): the transparent dice.
2. **Character:** the tree (Skill ≤ Attribute ≤ Core ≤ 10), Mastery and perk steps, derived stats (HP formula, AP, movement per AP, carry), traits, equipment slots (the Veil reserved), weapon mastery.
3. **Creation:** budgets 10 / 10 / 6, the Core-for-Attribute trade, automatic spending, Mind Without Fog, archetype presets, 0–2 traits, lock-in. Port `derive()` and check it against all 46 archetypes (each must spend every point, as `tools/validate.py` already requires).
4. **Voices:** passive 10 + mod against the Narrator's hidden hooks, at most 2 lines per player per beat, Ask-a-skill once per scene, Overreach (indulge or resist, Echo costs).
5. **Progression:** XP by source tag, the level table, points per level, class assignment at level 3 (the closest-class rule), ranks, advanced classes, combo perks (skills plus a deed the Narrator records), Ultimates (automatic, secret).
6. **Effects:** the interpreter for the 50 core ops, the perk AP cap (+3), the turn ceiling and floor (9 / 2). Unknown or unimplemented ops become a `NarratorRuling` event carrying the item's text.
7. **Combat:** grid, initiative, the surprise round, AP, movement (port `paths()`), line of sight and cover, attacks, damage, armour, criticals, injuries, reactions, conditions and saves, death saves, enemy turns (engine tactics for movement and targeting; the Narrator only describes them).
8. **Later:** the mana meter, Sigil magic, Soul magic, prayer and patrons, rests, vehicles.

**Tests are part of every module.**

- **Golden tests from the spec's tables:** skill modifiers, HP, movement per AP, the XP table, Mastery thresholds, perk steps.
- **Property tests:**
  - caps are never broken;
  - AP stays within 2–9;
  - perks add at most +3 AP;
  - budgets are never negative;
  - the same seed and actions produce the same log.
- **Scenario tests:** the M813 rear-pad fight, scripted from start to finish.

Each test names its spec section, so changing a provisional number shows exactly which tests move.

## 6. The client

**Port the prototypes in this order:** Create (all six steps, the EPCCG "?" entries with perk steps, combos and the Mastered card, the lightbox) → Main (story mode, character panel, voices, speaking order) → LevelUp → Combat → Room → Ultimate award.

**Screens the prototypes don't cover yet.** Only the first two are needed for the starter slice:

| Screen | Needed for |
|---|---|
| Narrator settings: provider, key, model, a test call, a cost meter, the privacy line ("your key stays in this browser") | Starter slice (designed inside Room; needs its own screen for solo) |
| Session end: XP by source, level-up prompt, journal entry | Starter slice |
| Title and main menu; character library (drafts, import and export) | Co-op milestone |
| Human Narrator console (private: hidden hooks, TNs, NPC notes, the same actions as the AI's tools) | Co-op milestone |
| Journal and campaign log; inventory management; rest | Depth |
| Sigil builder, Soul spell builder, prayer | Depth (magic) |

## 7. The Narrator

**Its tools** are the Narrator-owned jobs in `rules.json`. Each one is checked by the engine before it takes effect:

| Tool | The engine checks |
|---|---|
| `narrate(text)` | Visibility tags; length |
| `request_check(actor, skill(s), tn, stakes)` | TN is 8 / 12 / 16 / 20; the skill exists; combined checks use 1–3 skills |
| `voice_hooks([skill, tn, truthful])` per beat | Then runs the passive checks itself and returns which hooks passed |
| `voice_lines([skill, line])` | Only for hooks that passed; at most 2 per player |
| `call_overreach(actor, skill)` | Mastery 2 or more; once per scene per skill |
| `award_xp(actor, source, amount)` | The source tag exists; the amount is inside that source's range |
| `record_deed(actor, perk)` | The skills meet the combo's requirement; then the perk is granted |
| `rule_on(item, decision)` | Only for items flagged `narrator` or `hybrid`, or the fallback for an unimplemented op |
| `start_combat(encounter)` / `end_scene(summary)` | The encounter comes from templates; the summary goes to memory |

A rejected call returns the engine's sentence to the Narrator. After two failed retries the host sees the problem and can rule by hand.

**What it sees on each call.** The layers are ordered so the stable ones stay in the provider's cache:

| Layer | About | Changes | Cached |
|---|---|---|---|
| Narrator rules, tone, the Unspoken Name, tool descriptions | 8k tokens | Never | Yes |
| Campaign layer: World Bible slice for the current Sector, location and faction notes | 6k | Per scene | Yes |
| Party: each character's sheet, only Narrator-relevant items, voice cards of the skills they have | 8–10k for 4 players | Per level-up | Yes |
| Memory: facts, NPCs, open threads and promises, retrieved by name and tag from past scene summaries | 3k | Per call | No |
| The scene: location, NPCs present, state; the last few turns verbatim | 6–8k | Per call | No |
| This round: each player's action (speaking order), with the engine's results | 1k | Per call | No |

- **A round:** one call to read the players and request checks, then the engine resolves the checks, then one short call to narrate the results.
- **Voice lines:** written in one batched call on a small model, given only the voice cards of the hooks that passed.
- **Never in its context:** Ultimates the party doesn't hold.
- **Models:** the host picks. Recommended: a Sonnet-class model for narration and a Haiku-class model for voice lines and summaries, both at low or medium effort.
- **Cost meter:** shows tokens and an estimated cost per session, from the provider's own usage numbers.

**The human Narrator** uses the same tools, as buttons and forms on the Narrator console. One contract, two kinds of Narrator.

**Providers.**
- First: Anthropic, called directly from the browser.
- Then: OpenAI-compatible (which also covers OpenRouter and local servers) and Google.
- A JSON-only mode for models without tool calling.
- Tests replay recorded responses, so CI never calls a live model.

## 8. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | **Foundations:** monorepo, CI (validator, type check, tests), `packages/data` types, design tokens, asset pipeline from `art/catalog.json`, a spike calling each provider from a browser | CI is green; each provider answers a test call from the browser |
| M1 | **Rules core:** resolution, character, creation, voices, progression | Golden and property tests pass; all 46 archetypes build legally; seeded replays match |
| M2 | **Creation, playable:** the Create flow ported, the character library | A character can be made, locked in, saved, exported and reloaded, offline |
| M3 | **Solo story with the AI Narrator:** adapters, tools, context builder, memory, the Main screen, Narrator settings, cost meter | A 30-minute story scene runs on a real key with no rule-breaking accepted; the meter matches the provider's bill within 10% |
| M4 | **Combat:** grid, initiative, AP and movement, attacks, the core ops, enemy turns, 2D dice tray, the Combat screen | The scripted M813 fight plays out with every roll on screen |
| M5 | **The M813 starter slice:** opening scene → one fight → level 3 and class → session end; deployed for playtests | Leon plays it start to finish; playtest logs record every roll and ruling |
| M6 | **Co-op rooms:** Durable Object server, up to 4 players, speaking order, reconnect, the human Narrator console, the title screen and character library | Four browsers finish the slice together; a dropped player rejoins mid-scene |
| M7 | **Depth:** mana and magic, prayer, more bespoke ops by how often they're used, the 3D dice table, the 3D Wick avatar, rests and journal; section 14 items settled from playtest logs | Driven by playtests |

## 9. Risks

1. **The AI Narrator bends rules.** The engine checks every tool call; nothing it says changes a number by itself.
2. **Providers differ in tool calling.** Thin adapters, recorded-response tests and the JSON fallback.
3. **Browser access to providers** (cross-origin rules). Checked in M0 before anything depends on it; a host can use a local relay if one provider refuses.
4. **82 bespoke ops.** They fall back to the Narrator with the item's text and get implemented in order of how often playtests use them. The starter slice needs only the ones its characters and enemies hold.
5. **Balance.** 51 provisional items. Playtest logs (rolls, AP spent, damage, XP per session) settle them with numbers.
6. **Cost.** A fixed context budget per layer, caching, small models for small jobs, and the cost meter in front of the host.
7. **Art arriving later.** The UI already handles missing art (placeholders and "icon soon").

## 10. Decisions for Leon

1. **React + Vite** for the client. *Recommended.* The alternative is Svelte, which is smaller but has fewer people and tools.
2. **Cloudflare** (Workers, Durable Objects, Pages) for hosting rooms and the site. *Recommended.*
3. **No accounts in v1:** characters live in the browser and travel as files; rooms join by code. *Recommended.*
4. **Anthropic first**, then OpenAI-compatible, then Google.
5. **The first playable target is the M813 slice, solo with the AI Narrator** (M0–M5), before co-op.
6. **Where code lives:** `packages/` (engine, data, narrator) and `apps/` (web, server) in this repo; work happens on `develop` with a branch per milestone; `design/canvas/` stays as the reference.
