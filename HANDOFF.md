# Hand-off: three feature branches (8 Nov 2026)

For Leon and Leon's Claude. Written by the Claude session of Leon's friend, who worked from a separate account. The same file is on all three branches, so it merges cleanly whichever lands first; delete it once all are merged.

No branch is merged, deployed or opened as a pull request. Each was pushed only to its own feature branch.

| Branch | Built from | Commits (oldest first) | Merges into `develop` |
|---|---|---|---|
| `feature/ooc-mission-board` | `develop` at `1436499` | `1a617c9` engine · `f54f4ec` Narrator · `73f90b0` UI · `02eebaf` docs and e2e | Cleanly (checked against `0c4884c`) |
| `feature/combat-layout` | `develop` at `0c4884c` | `d206303` layout · `81e7122` e2e README · `7aaf7cc` keep lines apart from the missions branch | Cleanly |
| `feature/map-zoom` | `feature/combat-layout` | `46c7667` map size | Cleanly; it contains `feature/combat-layout`, so merging it brings both |

The branches also merge cleanly with each other. `feature/ooc-mission-board` and `feature/combat-layout` both touch `apps/web/src/App.tsx` and `apps/web/e2e/README.md`, but on different lines. If you want both combat changes, merge `feature/map-zoom` alone; it includes the layout branch.

---

## 1. `feature/ooc-mission-board`: OOC channel, mission board, end states, pacing rule

Built from Leon's task brief, written after his M813 playtest of 23 rounds. The brief: "OOC channel, mission board, end states and a pacing rule for the AI Narrator".

### What it does

- **OOC channel**
  - A line is out of character when the OOC chip beside Send is on, or when it starts with `[OOC]`, `(OOC`, `OOC:`, `//`, `[to the narrator]` or `[to the narator]`, in any case. The marker is stripped for display.
  - An OOC line never uses the player's Say and never counts as their turn. It works at any time after the session starts: between turns, mid-fight (the combat Say row reads the markers through the engine) and after the campaign ends.
  - It shows muted, labelled "OOC · <player>".
  - The Narrator gets the questions in their own `OUT-OF-CHARACTER QUESTIONS` block, by character name only, and answers in a new optional `ooc` field. The answer shows in a "NARRATOR · OOC" box.
  - **Decision:** an OOC question never triggers a Narrator call of its own. It sets `story.needs`, so the round's close calls the Narrator even if nobody spoke in character. A question asked while a call is in flight waits for the next one (the same rule as perk rulings). Spec item 378.
- **Missions**
  - Campaigns can list `missions`: id, title, act, summary, goal, hidden, objectives (`done_when` is guidance for the Narrator, not code), next (an id or a list of branches), narrator_notes, and end (`act` or `campaign`). They can also name a `board_npc` and list `credits`. The format is in `docs/design/campaign-format.md`, and `validateCampaign` checks it.
  - State lives in `g.story.missions`.
  - At session start, every mission no other mission leads to becomes active.
  - The Narrator sends optional `missions` updates (done, failed, revealed), a `missionNext` branch pick and `side` jobs. Unknown ids are ignored, and the Narrator can't edit main missions.
  - A mission closes when every required objective is settled: complete if all are done, "over" if any failed. Its end and next fire either way; spec item 379.
  - Old saves without missions play as before. `campaign/refresh` starts the board for an old save.
- **M813's missions** (in `data/campaigns/m813.json`, written from its arc and no new plot):
  - `the_shield_line`, the tutorial.
  - `the_ramp`, which ends act 1 and branches: left behind leads to `the_years`, aboard leads to `the_crossing`.
  - `the_years` and `the_crossing`, act 2.
  - `the_demand`, which ends the campaign. The record's repair bay is a hidden optional objective.
- **End states**
  - An act end shows a full-screen MISSION COMPLETE card built from the engine's own records, with no extra call: a recap from the memory's scene summaries, the objectives done, XP this act, facts of importance 4 or more, and the next mission. The Narrator's next turn gets "ACT ENDED: open the next mission …".
  - A campaign end gives the Narrator one turn with the new work kind `epilogue`. Then an end screen shows, and the save is marked complete with `g.story.complete`.
- **Pacing:** short OOC and "missions and pacing" sections in `RULES_PROMPT`, and a per-turn `MISSION` block of about 40–105 tokens.
- **UI**
  - A `MISSIONS · n` button in the main header opens the board: ☐ / ✓ / ✕ marks, optional objectives flagged, side jobs, and completed missions folded below.
  - Every mission change pops up for everyone.
  - The act-end card is shown once per player; seen cards are remembered in localStorage.
  - The room shows a finished campaign.

### Where the code is

The new logic sits in new files, so it stays clear of the perk, trait and class work on `develop`:

- `packages/engine/src/missions.ts`: all the mission and OOC logic.
- `packages/engine/src/game.ts`, small edits only:
  - New types: the `Entry` kind `ooc` and its `mission` field; the story's `missions`, `oocAsk` and `complete`; the work kind `epilogue`; the turn fields `ooc`, `missions`, `missionNext` and `side`.
  - New call sites: `placeBoardNpc` and `startMissions` in `session/start`; the OOC branches in `story/speak` and `combat/say`; `missionTurn` after `narratorTurn` in the `narrator/turn` case; `startMissions` after `campaign/refresh`.
- `apps/web/src/narrator/context.ts`:
  - The full mission list, with `done_when`, sits in the cached campaign block (`missionsCampaign`).
  - The turn prompt adds `missionBrief`, `actOpening`, the OOC block and the `epilogueJob`.
  - The four new tool fields are optional and enum-free, so the tool definition never changes and the prompt cache holds.
- `apps/web/src/game/missionBoard.tsx` draws the board, pop-ups and end screens; it is mounted with one line in `App.tsx`. `game/missionView.ts` holds their pure display logic.
- `screens/main.js` and `templates/main.template.html` gain new blocks only: the OOC chip, the OOC lines and the MISSIONS button.
- The test Narrator (`anthropic.ts` `scriptedProvider`) answers OOC questions, and marks `done:<objective id>` written in a player's line. That is a test-only convention used by `e2e/missions.mjs`.

### Narrator cost (Leon asked to be told)

```
50h call before: stable 29191 tokens, turn 7131 tokens; worst $0.211 warm $0.100
50h call after:  stable 31376 tokens, turn 7251 tokens; worst $0.220 warm $0.101
```

Most of the increase is M813's mission list in the cached campaign block.

### Tests

| Check | Result |
|---|---|
| Engine tests | 731 passed, 1 skipped (22 new in `test/missions.test.ts`) |
| Web tests | 98 passed (9 new) |
| Type checks and `tools/validate.py data` | Clean, 0 errors |
| Build | Passes |
| `e2e/missions.mjs` (new) | 15 / 15 checks pass |
| `e2e/playscreen.mjs` | 10 / 10 checks pass |

`e2e/two-players.mjs` failed at a dice-table click, but it fails the same way on plain `develop`, so the cause isn't this branch. `develop` has since changed that file.

**Not tested:** a real AI Narrator (there was no key; the cost lines are estimates from the long-campaign test); two browsers sending OOC at once; the campaign end screen in a browser (it has unit tests only); reduced motion; the human-Narrator mode.

### For Leon to decide

1. **`the_crossing`.** The record has no version where the wounded board the ship, so this mission is a minimal "reach Outpost-1". Write it properly or drop the branch.
2. **`first_fight`.** Driving off the scavenger drones is a required objective, as the brief listed. Should it be optional?
3. **Name clash.** `g.story.ended` was already taken by the per-round turn flags, so a finished campaign is `g.story.complete`.
4. **Carrying characters on.** Nothing yet carries a levelled character (XP, gear) into a new campaign; that needs a design.
5. **Secrets in player views (already there before this branch).** `viewFor` sends the whole campaign to players, secrets and Narrator notes included. The board hides them, but the data reaches the browser. Strip Narrator-only fields in `viewFor`.
6. **Provisional limits, spec items 377–382:**
   - OOC answers are about 80 words at most (600 characters kept), with at most 8 questions waiting.
   - OOC never calls the Narrator by itself.
   - A failed required objective closes its mission.
   - At most 12 mission updates and 12 side-job changes a turn, and 24 side jobs in all.
   - The epilogue drops open checks.
   - Branches are the Narrator's pick; there is no player vote.
7. **Numbering.** Decision log entry **95**; spec section 14 items **377–382**. If `develop` has used those numbers meanwhile, renumber.
8. **Combat screen.** It has no OOC chip, because the perk session was working on it. Typing `[OOC]` in its Say row already works.

---

## 2. `feature/combat-layout`: adjustable combat screen

Asked for by Leon's friend, from a screenshot: split the combat UI into panels you can move; a drag bar between the map, legend and log side and the action menu; the four red-boxed panels can be dragged.

### What it does

- **Splitter** (`.phc-cb-split`, `role="separator"`): a bar between the map zone and the action zone.
  - Drag it to resize; arrow keys move it 24 px (96 px with Shift); double-click or Home resets.
  - The map zone keeps at least 320 px and the action zone at least 360 px. The grid refits its zoom (`fitGrid` reads the zone's width when the player has set one).
- **Four panels with grips** (`.phc-grip`): the map, the legend, the combat log and the action menu.
  - The legend and the log can go anywhere in either zone. In the action zone they sit under the action menu, capped at 30vh, and scroll.
  - Dragging the map or the action menu into the other zone swaps the sides (`flex-direction: row-reverse`).
  - Arrow keys on a grip do the same moves; Escape cancels a drag.
- **Saved per browser** in localStorage under `phc.combatLayout`; it is not game state. A "↺ Layout" button resets it.
- **Kept as before:**
  - With Hide panel (H), panels from the action zone show under the map.
  - Narrow windows (under 1000 px) keep the stacked layout, with no splitter and no grips.

### Where the code is

- `apps/web/src/game/combatLayout.ts` (new): the pure layout functions (`normalise`, `movePanel`, `placement`, `clampWidth`, `keyMovePanel`), pointer dragging (`startPanelDrag`, `startSplit`), its CSS, and `expandLayout`.
- **How the legend and log move zones:** the template marks the legend and the log once with `<!--PANEL:id-->…<!--/PANEL:id-->`. `expandLayout` copies that markup into `<!--SLOT:id-->` inside the aside, so there is one source of markup and only one copy is on at a time. `App.tsx` wraps the combat template with `expandLayout(expand(combatT))`.
- `screens/combat.js`, small edits only:
  - The `LAYOUT` state and the `setLayout` and `layoutVals` methods.
  - `lay` passed to the template, including in the no-fight early return.
  - `rowStyle` and `leftStyle` read the layout.
  - One branch in `fitGrid`.
- `templates/combat.template.html` gains new attributes and blocks: `data-phc-zone` and `data-phc-panel`, a wrapper div around the grid, sc-if wrappers on the legend and log, the splitter, the grips, the ↺ Layout button and the two slots in the aside.

### Tests

| Check | Result |
|---|---|
| `game/combatLayout.test.ts` (new) | 8 / 8 pass |
| Web tests | 99 passed |
| `e2e/layout.mjs` (new) | 18 / 18 checks pass: real drags of the splitter and panels, the side swap, a reload, H, Reset, the narrow window |
| `e2e/tabs.mjs` | 28 / 28 checks pass |
| `e2e/slate.mjs` | 23 / 24 checks pass |

The one `slate.mjs` failure is "slot 1 now reads: … Not now: Already full" (the turn card's customised command). It fails the same way on plain `develop`.

### Watch out

The perk session edits `screens/combat.js` and `templates/combat.template.html`. This branch merges cleanly as of `0c4884c`. If the combat template gets restructured first, re-apply the zone, panel, grip and splitter markers. They are small and self-contained; `e2e/layout.mjs` checks them.

---

## 3. `feature/map-zoom`: map size, with Auto fit for any resolution

Asked for by Leon's friend: make the combat map bigger or smaller, plus an auto mode that fits any resolution. Built on `feature/combat-layout`, because the map's size has to work with the splitter.

### What it does

- **A map toolbar** above the grid: `MAP  −  100%  +  ⤢ Auto`.
- **Auto** (the default) fits the map to its zone at any resolution.
  - It now grows past 100% on big screens, up to 250%. Before this branch it stopped at 100% (140% with the panel hidden).
  - Measured in the browser: 89% at 1280×720, 113% at 1600×900, 142% at 1920×1080, 201% at 2560×1440.
  - It follows the splitter and the hidden-panel mode, and leaves room for the toolbar.
- **Manual** steps between 40% and 250% (40, 50, 60, 70, 80, 90, 100, 110, 125, 140, 160, 180, 200, 225, 250).
  - Controls: the − / + buttons, the − and + (or =) keys, or Ctrl/⌘ with the mouse wheel over the map (the page itself doesn't zoom there). The percentage button sets 100%; Auto goes back to fitting.
  - A step from Auto starts at the size Auto was showing.
  - A map bigger than its zone scrolls inside the zone. The action zone keeps its 410 px.
- **Saved per browser** in localStorage under `phc.mapZoom`. Auto stores nothing.
- **Fix found on the way:** with a big map, the legend and log sit below the fold. Dragging a panel near a zone's top or bottom edge now scrolls the zone, so they can still be dragged above the map.

### Where the code is

- `apps/web/src/game/mapZoom.ts` (new): the steps, `autoFit`, `zoomAction`, the stored preference and the toolbar CSS. Tested in `mapZoom.test.ts`.
- `screens/combat.js`:
  - `fitGrid` returns the manual size in Manual mode; in Auto its cap is now `ZOOM_MAX` (2.5) instead of 1 or `ZOOM_MAX_WIDE`, which is removed. It subtracts the toolbar's height.
  - New methods `zoomBy`, `zoomKey` and `zoomVals`; one keydown call; a non-passive wheel listener for Ctrl+wheel over the map.
  - `leftStyle` gets a `max-width` so a big manual map never squeezes the action zone.
- `templates/combat.template.html`: the toolbar, inside the map panel.
- `game/combatLayout.ts`: edge auto-scroll while dragging a panel.

### Tests

| Check | Result |
|---|---|
| Web tests | 103 passed (4 new for the map size) |
| Engine tests | 709 passed, 1 skipped |
| `e2e/mapzoom.mjs` (new) | 17 / 17 checks pass |
| `e2e/layout.mjs` | 19 / 19 checks pass (now with the edge auto-scroll check) |
| `e2e/tabs.mjs` | 28 / 28 checks pass |
| `e2e/slate.mjs` | 23 / 24 checks pass |

The `slate.mjs` failure is the same one that already fails on `develop`.

### For Leon to decide

1. **Auto now grows past 100%.** That was the brief ("auto fit any resolution"). If a big map should push the legend and log out of view less often, Auto could instead fit the map together with the other panels in its zone.
2. **The 250% ceiling and the step list** are UI choices, not rules, so they aren't in the spec's section 14.

