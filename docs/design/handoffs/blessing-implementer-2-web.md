# Blessing 2.0, implementer 2: web game, Narrator and art integration

For a Claude Code session on its own account. Written 8 Nov 2026.

Paste this into the session, or point it at this file on GitHub:
https://github.com/leonpentastorm/Project-Heaven-Cry/blob/develop/docs/design/handoffs/blessing-implementer-2-web.md

---

You are building the **player-facing side of Blessing 2.0 (rules revision 1.6)** in Project Heaven Cry, repo
`leonpentastorm/Project-Heaven-Cry`. Implementer 1 builds the rules, data and engine in parallel on
`feature/blessing-engine`.

## Read first

1. `CLAUDE.md`, especially the UI direction and colour rules.
2. `docs/design/colour-system.md`.
3. **`docs/design/blessing-2.0-spec.md`**.
4. `docs/design/handoffs/blessing-implementer-1-engine.md`. The section "Your first push: the contract" is your API.
5. `docs/design/handoffs/blessing-art-brief.md`. The art arrives later; you build with placeholders.
6. Look at how Sigil and Outburst are presented in the web game:
   - `apps/web/src/screens/combat.js` and `main.js`, and `create.js`;
   - `apps/web/src/game/heartView.ts`, `sigilView.ts`, `resources.ts`, `actionPickers.ts`, `commands.ts`, `classView.ts`, `sandbox.tsx`;
   - `apps/web/src/game/fx/*`;
   - `apps/web/src/narrator/context.ts`;
   - the e2e suites in `apps/web/e2e/`.

## Branch and rules

- **Wait until `feature/blessing-engine` has its contract push**, the engine types and action stubs. Check with
  `git fetch origin feature/blessing-engine`.
- Then make **`feature/blessing-ui` from it.** Pull it in often (`git merge origin/feature/blessing-engine`).
- **Don't edit `packages/engine` or `data/`.** If you need an engine change, write it in your handoff, under "asks for
  implementer 1".
- Push only to your branch. Never push to `develop` or `main`, and never deploy.
- Leon's UI rules:
  - **Buttons only.** If it doesn't have a button, it doesn't work. Never a typed field for a game choice.
  - Every disabled button shows its reason.
  - Colour carries meaning and is always paired with a word or glyph.
  - Spectral for prose, Chakra Petch for UI.
- In-universe text only.
- Commit message trailer:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

## What to build

1. **Character creation: the Belief step** (`create.js` and its template).
   - Faithful or Atheist, as two big cards with one line each on what it means. Make the pilgrim path sound attractive.
   - Faithful shows the patron cards (8): mark, portrait, archetype line, likes and taboos (as words), Open or Jealous, the 3 Hymn names.
   - Say clearly that praying needs Faith 3.
   - The choice is saved (old saves read as the engine migrates them).
2. **The Faith panel** (the sheet, and the combat **FAITH** action tab):
   - the patron mark and name;
   - the **Devotion meter** 0–10, with the gate marks at 3, 5 and 7 labelled Hymn I, II and III, and Miracle at 7;
   - the Witnessed state (an open eye, with the word);
   - the vow chip;
   - the rites kept this session.
   - For Atheists:
     - "ATHEIST · PILGRIM";
     - the pieces per patron (e.g. "Mother Ember 2/3");
     - the learned Hymns, with their dice TN.
   - Use `faithView` from the engine.
3. **Praying** (combat tab and story):
   - Whisper buttons: 6, with icons. Placeholder icons are code-drawn white glyphs until the art arrives.
   - Hymn buttons and the Miracle button.
   - Each button shows AP, the gate or the dice TN, and the odds from `previewPrayer`. An overreach shows its TN and "a miss costs 1 Devotion".
   - Targets are picked on the grid (an ally, an enemy, a tile, an area) with the existing picker system in `actionPickers.ts`.
   - Story prayers go through the story action path, with the same buttons.
4. **Vows:** at the start of a fight, a quiet prompt for Faithful characters with the 6 vows as buttons ("Shield" asks you
   to click the ally); skippable. The chip shows sworn, kept or broken.
5. **The patron answers:** a `patron_line` event shows a small card in the story and combat log, with the mark, the
   patron's name and the line, in their accent. Answered, refused, taboo, vow, Witnessed, intervention, Miracle,
   conversion.
6. **FX and sound** (`apps/web/src/game/fx/`, a new `faith.ts`), for each engine FX event:
   - **Whisper:** a soft chime and a small gold ray.
   - **Hymn:** a choir swell, the patron mark drawn as a halo over the target, rays in the patron accent.
   - **Miracle:** a full-screen answer: the sky darkens, the mark opens large, the patron's line, then the effect. Keep it under 2.5 s, and skippable.
   - **Witnessed:** an eye opening above the caster.
   - **Intervention:** a sharp bell and the mark flashing at the trigger.
   - **Devotion change:** a "+1 DEVOTION · <tag word>" float, in Virtue ink with a gold mark.
   - **Prayer fail:** silence and the mark fading.
   - Respect fog (the kit's `at()`) and `prefers-reduced-motion`.
   - Colour:
     - Faith words use Virtue ink `#D36A90`.
     - The light is gold. Check `docs/design/colour-system.md`. If no gold token exists, propose one (e.g. `#F2C46A`, already used as SOUL_WARM in `glyphs.ts`) in your handoff, for Leon.
     - The patron accent is for light and particles only, never for text.
7. **Resources under the HP bar** (`resources.ts`): Devotion (with its gates), the Witnessed state, and the vow. For
   Atheists: the pieces. Follow the existing row style.
8. **The Proving Ground** (`sandbox.tsx`): a FAITH section to set belief, patron, Devotion, Faith, pieces and the vow, using
   implementer 1's sandbox actions.
9. **Narrator** (`apps/web/src/narrator/context.ts` and its tools):
   - Replace the old `patrons` and `patronMood` fields with tools for the Narrator-only actions:
     - pact;
     - piece (it must name the NPC teacher, who has Faith above 5);
     - Devotion (±2 with a reason);
     - Narrator rites;
     - apostasy.
   - A compact FAITH block in the prompt: each character's belief, patron and Devotion, Witnessed, vow and pieces.
   - The patrons' likes, taboos and rites via `wiki_lookup` (`patron:<id>`), not in every prompt.
   - Report the token change before and after: use `callEstimate` as earlier work did.
   - The Narrator never writes patron lines (the engine does) and never sets numbers.
10. **Art integration:**
    - Wire the asset paths from the art brief:
      - `art/portraits/patrons/<id>.png`
      - `art/emblems/patrons/<id>.png`
      - `art/icons/prayers/...`
    - Fallbacks: code-drawn placeholders (a white mark per patron in `classIcons.ts` style, generic prayer glyphs) until the files exist. Dropping the art in later must need no code change.
    - Note in the handoff what `npm run assets` needs.

## Tests

- Unit tests for every view helper and picker.
- `npm test -w @phc/web`, `npx tsc --noEmit` in `apps/web`, and `npm run build`.
- A new e2e **`apps/web/e2e/faith.mjs`**, through real buttons. Start the dev server with `npm run dev -w @phc/server`, port 8787. It covers:
  - creation with the Belief step (Faithful to Mother Ember, and an Atheist);
  - in the Proving Ground:
    - a Whisper;
    - a Hymn at the gate;
    - an overreach;
    - a vow kept and broken;
    - Witnessed;
    - an intervention;
    - a Miracle;
    - an Atheist's dice Whisper;
    - a piece unlocking a Hymn;
    - a conversion to an Open patron and then to a Jealous one;
  - screenshots at deviceScaleFactor 1, which you look at;
  - the existing suites `sandbox`, `perks`, `tabs`, `two-players` and `classes` must still pass.

## Handoff (make it good)

When done, write **`docs/design/handoffs/blessing-ui-HANDOFF.md`**:

- what was built, by screen and file;
- screenshots (paths);
- the e2e list with results;
- the Narrator token change;
- the colour token proposal;
- the asks for implementer 1;
- the art slots still empty;
- known gaps.

Push it. Then tell Leon: "Web done, handoff at <link>". **Don't merge.**
