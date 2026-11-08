# Blessing 2.0: web hand-off (implementer 2)

Branch **`feature/blessing-ui`**. It has `feature/blessing-engine` merged in, up to `228e34d`, the engine's final hand-off.
Not merged anywhere; nothing deployed. `packages/engine` and `data/` were not edited by this branch. The one shared file,
Stolen Fire's picker in `actionPickers.ts`, is identical on both branches, as the engine hand-off notes.

## Checks

| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` in `apps/web` | 0 errors |
| `npm test -w @phc/web` | 40 files, **290 passed** |
| engine `vitest run` (merged) | 58 files, 1432 passed, 1 skipped |
| `npm run build -w @phc/web` | built |
| e2e `faith.mjs` (new) | **29 / 29 ok** |
| e2e `faith-pg.mjs` (new) | **26 / 26 ok** (run 3 times, stable) |
| e2e `sandbox` / `tabs` / `classes` / `classes-moves` / `turn-card-side` / `playscreen` | 24 / 28 / 34 / 52 / 11 / 10 ok, 0 fail |
| e2e `two-players` | runs to the end; level-up offered after the fight. This script logs; it has no ok/FAIL lines |
| e2e `perks` | 26 ok. The only FAIL is "no page errors": the sandbox's proxy blocks an outside resource (`ERR_TUNNEL_CONNECTION_FAILED`). Not a game error |
| e2e `sandbox-mp` | 23 ok, 3 FAIL in the team fight. **`origin/develop` fails the same 3**: I checked on a worktree of develop served on port 8788. They were already failing before this branch |

## What was built, by screen

### Creation: the Belief step (`screens/create.js`, `templates/create.template.html`)

- A new step 5 of 7, between Traits and Kit. It offers two large choices:
  - **Faithful** ("Sworn to a patron");
  - **Atheist · Pilgrim** ("Belong to no god").
- Faithful shows the 8 patron cards. Each card has:
  - the mark, name and archetype;
  - Open or Jealous, in words;
  - the costume line in Spectral;
  - LIKES ✓ and TABOOS ✕ chips;
  - Hymns I–III and the Miracle;
  - a "Swear to …" button that becomes "✓ Sworn to …".
- The chip says "NOT CHOSEN · YOU START AS AN ATHEIST" until a choice is made. A note says that praying needs Faith 3.
- The sheet's `belief` goes out with `char/add`. Drafts keep it.
- Every creation e2e has one more `Next ›`: `lib.mjs` `makeCharacter`, `magic`, `feel`, `missions`, `playscreen`, `playtest-tools`, `reconnect`, `slate-music`, `slate-stamp`, `two-players` and `vote`.

### The sheet: a FAITH tab (`screens/faithTab.js`, `screens/main.js`, `templates/main.template.html`)

- **Panel** (data from `game/faithView.ts` `faithPanel`):
  - the patron's mark, name and archetype, with a top edge in the patron's accent;
  - FAITH n · DEVOTION n / 10, and the patron's rule;
  - a Devotion meter of 10 cells, with the gates marked in gold: HYMN I, HYMN II, HYMN III · MIRACLE;
  - a Witnessed chip and the vow chip;
  - LIKES and TABOOS chips.
- **Atheists** see "KNOWLEDGE PIECES" (patron N / 3) and their learned Hymns with the dice TN.
- **Prayer buttons**: 6 Whispers, the Hymns and the Miracle.
  - Each button shows its icon, `AP · gate · odds`, for example `3 AP · HYMN I · DEVOTION 3 · SURE` or `OVERREACH · TN 16 · 40%`.
  - An overreach adds "⚠ Overreach: TN n · a miss costs 1 Devotion".
  - A disabled button shows "✕ reason", with the engine's own words.
- **Targets in the story**: a prayer with a target opens chips for the squad, from `previewPrayer().targets`. The engine's preview with those picks is the verdict, then **Pray**. "Two" prayers take two picks.
  - Places and enemies in the story aren't picked. They go to the Narrator (engine item 624), and the button says so.
- **Rites**: each rite shows its state (READY, NOT NOW, ✓ KEPT THIS SESSION, or THE NARRATOR MARKS IT). Engine rites have a "Keep the rite" button (`faith/rite`), with the reason when it's off.
- **Patron line cards in the story stream**: the mark, the patron's name in Virtue ink, and the line in Spectral italic, edged in the patron's accent. They're read from the engine's `system` entries headed with the patron's name (see ask 2).
- The sheet's six tabs now fit on one row (10.5 px labels).

### Under the HP bar (`game/resources.ts`)

- The `faithRows` rows (DEVOTION, WITNESSED, VOW) replace the old pact Devotion row.
- A Faithful sees:
  - Devotion pips, with the next gate under them ("Hymn II at 5"), or FULL with "every Hymn open";
  - WITNESSED · WATCHED;
  - the vow with its words, and BROKEN as an alert.
- An Atheist sees their pieces, as "Patron N / 3".

### Combat (`game/commands.ts`, `screens/faithCombat.js`, `screens/combat.js`, `templates/combat.template.html`)

- **FAITH tab** in the action tabs, in Virtue ink. It shows for a Faithful, or for anyone with Faith 3 or more.
  - Items: `pr:<kind>:<id>`. Labels: "Hearthlight · HYMN II", "✦ Everyone Home · MIRACLE".
  - The cost column shows `AP · odds`. The engine's reason shows when an item can't be used.
- **Targets on the grid** (`prayerView`):
  - the picker comes from `previewPrayer().target`;
  - a click is accepted only when it lands on one of `.targets`;
  - "two" prayers take two clicks;
  - a place must be a tile **in sight**, because the reducer refuses others (see ask 1).
- The selection card reads like "WHISPER · Health · 1 AP · SURE / Target: Vess. … / By standing: no roll". It says "By dice: d20 + n against TN n" or "Overreach: … a miss costs 1 Devotion" as needed. Confirm sends `faith/pray` with `unitId`.
- **Vow prompt** in round 1, on a Faithful fighter's turn: the 6 vows as buttons, with their words and a "Broken when …" tooltip.
  - Shield asks "SHIELD WHOM?". Pick an ally chip, or click an ally on the grid. If there's no ally, it says so.
  - "Fight unsworn" skips it for this fight.
- **Patron lines in the combat log** show as cards, parsed from `Name: "line"` log strings (see ask 3).

### Effects (`game/fx/faith.ts`, wired in `fx/play.ts`)

All 8 FX kinds are handled, fog-aware through the kit's `at()`, and they respect `prefers-reduced-motion`:

- **Whisper:** a chime and a gold ray.
- **Hymn:** a choir swell, the mark as a halo, and rays in the patron's accent.
- **Prayer fail:** the mark fading, with "UNANSWERED" or "REFUSED".
- **Witnessed:** an eye. The word itself is the engine's condition float, so it shows only once.
- **Intervention:** a bell and the mark flashing.
- **Devotion:** a "+1 DEVOTION · TAG" float.
- **Vow:** sworn, kept or broken.
- **Patron line:** a glint.
- **Miracle:** a full-screen answer. The patron's mark opens large, with "MIRACLE · <name>" and the line (when the event carries one). It takes 2.3 s (1.1 s with reduced motion), a click or a key skips it, and it's marked `data-phc-miracle`.

### Proving Ground (`game/sandbox.tsx`, a new **Faith** tab)

- Belief: Faithful or Atheist.
- 8 patron buttons, each with its mark.
- Faith stepper ("Prayer at 3 · Witnessed at 5 · Miracle at 7").
- Devotion stepper, with quick buttons for Hymn I · 3, II · 5, III · 7 and 10.
- An Atheist's pieces per patron (0–3).
- The vow, in a fight. Shield asks for the ally.
- **Reset the limits**: the Miracle, the rites and the cooldowns.
- All of it goes through the engine's `sandbox/faith`.

### Narrator (`narrator/context.ts`)

- `patrons` and `patronMood` are **gone** from `submit_turn`. They're replaced by **`faith`**: `{charId, op: pact | piece | devotion | rite_kept | apostasy, patron?, from?, delta?, reason?, rite?}`, the engine's `NarratorTurn.faith`.
- The rules prompt has a short **FAITH** block:
  - the engine runs prayer, Devotion from tags, vows, Witnessed, interventions, Miracles and every patron line;
  - the Narrator never writes a patron's words and never sets a number;
  - it lists the five ops and when to use them (a piece names an NPC teacher with Faith above 5);
  - it points to `wiki_lookup patron:<id>`.
- Each character's Standing line has a faith clause, for example `faith: Faithful to mother_ember, Devotion 3/10, Faith 4, vow stand sworn` or `faith: Atheist, Faith 4, pieces mother_ember 2/3`.
- `wiki_lookup patron:<id>` returns the glossary entry plus the patron's **rites**, and says whose each one is ("a player button" or "yours: faith rite_kept").
- **Token change** (`callEstimate`, Sonnet 5.5, a two-character party, one Faithful and one Atheist):
  - **stable 21,051 → 21,289 (+238)**: rules +159, party +15, tool schema +34;
  - per turn 1,446 → 1,446 (no change);
  - pinned by `narrator/faith-context.test.ts` (stable < 21,600).
- A human Narrator screen doesn't exist yet ("Coming soon" in the room), so it has nothing to wire.

### View models and art (`game/faithView.ts`, `game/faithArt.ts`)

- `oddsOf` and `oddsText`, `prayerButtons`, `prayAction`, `pickerFor`, `faithPanel`, `patronCards` and `BELIEF_TEXT`. All words; no rules.
- Code-drawn 24 px white line marks for the 8 patrons, the 6 Whispers, the Hymn tiers (the patron mark small in a corner), the Miracles (the mark large behind), the 6 vows and Witnessed.
- Every art lookup checks `assets.json` first, so painted art replaces a placeholder **with no code change**.

## Screenshots (`docs/design/handoffs/blessing-ui-shots/`, deviceScaleFactor 1, all looked at)

| File | What |
|---|---|
| `belief-faithful.png` | Belief step, Faithful, sworn to Mother Ember (8 patron cards) |
| `belief-atheist.png` | Belief step, Atheist |
| `faith-tab.png`, `faith-panel-top.png` | Sheet FAITH tab: panel, meter, chips, prayers, a Whisper's target chips, rites |
| `faith-vow.png` | Round-1 vow prompt; Shield asking whom |
| `faith-combat.png` | Combat FAITH tab, Health aimed at yourself, the selection card |
| `faith-combat-after.png` | After the Whisper: the second Whisper refused, "One Whisper a turn" |
| `faith-pg-tools.png` | Proving Ground Faith tools |
| `faith-miracle.png` | The Miracle's full-screen answer |
| `faith-hymn.png` | Thunderclap at its gate, then WITNESSED in the rows |
| `faith-intervention.png` | After Old Overcast's intervention: Devotion FULL, WITNESSED, VOW KEPT |

## e2e

**`apps/web/e2e/faith.mjs`** covers creation, the story and a fight, through real buttons:

- the Belief step: two choices, 8 patrons, Faithful and then Atheist, then swear to Mother Ember;
- the sheet carries the belief;
- the FAITH tab:
  - Devotion 3 / 10 with the gates;
  - likes and taboos;
  - 6 Whispers, 3 Hymns and the Miracle;
  - a Hymn's `3 AP · HYMN I · DEVOTION 3 · SURE`;
  - an overreach's TN and cost;
  - the Miracle disabled with its reason;
- a story Whisper with a target: the chips, then Pray → "✓ ANSWERED", then "One Whisper a round";
- a rite kept: a RITE entry, and the card reads KEPT THIS SESSION;
- a fight:
  - the vow prompt with 6 vows;
  - Shield asks whom;
  - swear Stand, and the vow shows under the HP bar;
- the FAITH tab: Health → click yourself on the grid → Confirm → 1 AP spent and a log line → "One Whisper a turn".

**`apps/web/e2e/faith-pg.mjs`** covers the Proving Ground:

- with the tools: Faithful to Mother Ember, Faith 7, Devotion 10;
- a vow set from the tools;
- the **Miracle** from the FAITH tab: the full-screen answer, cleared on its own, once a session;
- Reset the limits;
- an Atheist with 2 pieces → 2 Hymns, prayed **by dice**;
- Old Overcast:
  - not Witnessed before a Hymn;
  - Mercy sworn from the prompt;
  - **Thunderclap at its gate** (SURE, aimed at a tile) → **Witnessed** (state and rows);
  - **Gather the Clouds as an overreach** (TN 16; answered, or −1 Devotion);
- two minions spawned next to us:
  - a kill → **"Old Overcast intervenes"**, with 3 patron-line cards in the log;
  - fight won → **Mercy kept** (+1 Devotion, "A vow like thunder: kept!");
- **Stand broken**: a step forward keeps it; a step back the next turn breaks it;
- an **Atheist's Whisper by dice** (TN 12, the d20 shown);
- **conversion**: pact with the Quartermaster (Open; the learned Hymns stay), then Nerukhan (Jealous; they go), with two PACT entries.

Run each with `SHOTS=<dir> node <file>.mjs`, with the dev server on port 8787. Note: in this cloud sandbox, `wrangler dev` sometimes stops serving after `npm run build`, returning 404 on `/`. Restart the server if that happens.

## Colour token proposal (for Leon)

- **Faith light gold `#F2C46A`**: the same value as `SOUL_WARM` in `glyphs.ts`, so no new hue enters the palette.
- It's used for light only: rays, the halo glow, the Devotion gate marks and the Miracle kicker's ✦ heading. It's never body text.
- Proposed name in `docs/design/colour-system.md`: **`--faith-light`**, "the answer's light: rays, halos, gate marks; always beside a word".
- Faith words stay in Virtue ink `#D36A90`. A patron's accent is used only for light, particles and card edges, never for text.

## Asks for implementer 1

1. **`previewPrayer` should check what the reducer checks.** Today it doesn't check:
   - that a tile is in sight (the reducer says "You can't see that tile");
   - that `two_units` are within 6 tiles;
   - that Together's two allies are adjacent.

   The UI works around the first by accepting only tiles in sight. The others still surface as the reducer's toast after Confirm.
2. **Story patron lines: add `patron: <id>` to the `system` entry.** Today the UI recognises them by `head` being the patron's name in capitals and `text` being in quotes.
3. **Combat patron lines: give them a structured form.** The log is strings, so the UI parses `Name: "line"`. A `patron_line` entry (`{patron, event, text}`) on `cb`, or kept FX, would survive a rename.
4. **Put `name` and `line` on the `miracle` FX.** The overlay takes the name from the data and shows the line only when the event carries it (the client never picks a line, per your note).
5. *(Optional)* **Grid highlights for every legal target.** Today only the chosen ones are ringed. `.targets` is enough; I can add it if Leon wants.

## Art slots still empty (placeholders in use)

- `art/character-portraits/patrons/v1/<id>.png`: patron portraits. The Belief cards show the mark instead.
- `art/emblems/patrons/v1/<id>.png`: patron marks. Code-drawn white line marks are used meanwhile.
- `art/ui/prayers/v1/`:
  - `whisper-<id>.png`;
  - `hymn-<patron>-<1..3>.png`;
  - `miracle-<patron>.png`;
  - `vow-<id>.png`;
  - `witnessed.png`.

  Code-drawn glyphs are used meanwhile.
- `tools/build_web_assets.py` already globs all three folders: `patron-<id>`, `patron-mark-<id>` and `prayer-<stem>`. Dropping the PNGs in and running **`npm run assets`** (which rewrites `apps/web/src/game/assets.json`) is all it takes. No code change.

## Known gaps

- The vow prompt shows on the fighter's own turn in round 1. The engine also accepts a vow before that turn.
- Combat patron-line cards follow the log's last 6 lines, so older lines scroll away, as plain log lines do.
- Story Witnessed doesn't exist (engine item 604), so the sheet's Witnessed chip is only lit in a fight.
- `sandbox-mp`'s 3 team-fight failures were already on `develop` (see Checks). Not touched here.
