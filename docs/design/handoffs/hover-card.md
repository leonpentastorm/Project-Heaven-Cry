# One hover card everywhere (after live 0.24.0, 13 Nov 2026)

Leon, playing 0.24.0: "we have this nice hover panel why not use it everywhere?", feeling popups stacked on each
other, the same facts printed twice, a shelved class's Grand forms shown, "Shoot an object", and two Clear jams for
two guns. This hand-off is what was built for each, and how to keep it that way.

## 1. The primitive

`apps/web/src/game/actionTip.ts` is THE hover card. One floating element per document (`mountActionTips()`, installed
once in `main.tsx`): any element with `data-tip` (a structured card) or `data-tip-text` (prose) shows its card

- on pointer hover (after 350 ms, so a pointer swept down a list does not strobe), on keyboard focus (`:focus-visible`),
  and on a long press on a touch screen;
- **one at a time by construction**: there is one box, and showing a card first removes every other one;
- inside the viewport (`placeTip()`: beside the element, left then right, else below, else above, clamped to the window
  and never over the element itself, so never under the pointer);
- hidden on pointer leave, Escape, scroll, resize, a press anywhere, window blur, and when its element leaves the page;
  redrawn when its element's words change under it.

No element carries a native `title`, so the browser's own box never shows beside it.

**Its input:**

| Way in | Where | What it gives |
| --- | --- | --- |
| `tip="{{x.text}}"` | a template | `dc/runtime.tsx` writes `data-tip-text`, plus `aria-description` with the same words, or `aria-label` on an element with no words of its own (an icon-only button) |
| `data-tip="{{x.tip}}" aria-description="{{x.tipText}}"` | a template, from `tipAttrs(src)` | a structured card: a name, cost chips, a line per sentence, labelled weapon / trait / note lines, the refusal last (`actionTip()`) |
| `{...tipProps(text)}` / `{...tipProps(text, { label: true })}` | React | `data-tip-text` and `aria-description` (or `aria-label` for an icon-only control) |
| `setTip(el, text)` | an element made by hand (`cutIn.ts`, `cameraView.ts`) | the same; empty text takes the card away |

Prose is laid out by `proseTip()` at show time: a line a sentence, a line per " · " part and per line break, a
"Label: text" sentence and each part of a parenthesised note on their own labelled lines. A call site never splits a
hover text by hand.

## 2. How to add a hover text

1. In a template: `tip="{{row.hint}}"` on the element. Never `title=`.
2. In React: `<button {...tipProps('What it does')}>Words</button>`; an icon-only button: `{...tipProps('Close', { label: true })}`.
3. For an action (a name, a cost, what it does, why not now): build the card with `tipAttrs({ name, cost, text, why })`
   in the view model and bind `data-tip` / `aria-description`.
4. A browser suite reads the words with `tipOf(locator)` (`apps/web/e2e/lib.mjs`), never `getAttribute('title')`.
5. `apps/web/src/game/boundary.test.ts` fails on a new `title` in a template, a JSX `title=` on a DOM element, a
   `.title =` or `setAttribute('title', …)`. Its allow-list is empty; a line there needs a reason (an element the card
   cannot reach). `<svg><title>` and components' own `title` props are not this attribute.

## 3. Inventory (generated)

Counted from 0.24.0 (`5fa98bb`) to this branch by a script (native `title` attributes per occurrence in the
templates; JSX / DOM lines in code; the hooks now in each file). Found **298**, converted **298**, kept **0**.

| File | Native `title` in 0.24.0 | Card hooks now (`tip=`, `data-tip`, `tipProps`, `setTip`) | `title` kept |
| --- | ---: | ---: | ---: |
| `game/cameraView.ts` | 3 | 3 | 0 |
| `game/commandsDialog.tsx` | 1 | 3 | 0 |
| `game/cutIn.ts` | 3 | 3 | 0 |
| `game/report.tsx` | 2 | 2 | 0 |
| `game/sandbox.tsx` | 23 | 30 | 0 |
| `game/turnIntro.tsx` | 1 | 3 | 0 |
| `game/voiceSettings.tsx` | 2 | 3 | 0 |
| `templates/combat.template.html` | 82 | 88 | 0 |
| `templates/create.template.html` | 23 | 23 | 0 |
| `templates/epccg.template.html` | 1 | 1 | 0 |
| `templates/levelup.template.html` | 10 | 10 | 0 |
| `templates/main.template.html` | 137 | 137 | 0 |
| `templates/room.template.html` | 3 | 3 | 0 |
| `templates/shell.template.html` | 5 | 5 | 0 |
| `title/Title.tsx` | 2 | 3 | 0 |
| **All** | **298** | **317** | **0** |

Browser check (Proving Ground, DSF 2): 0 elements with `title` on the first screen and at the end; sweeping the
pointer down the HEART panel's 25 feelings, at most 1 card at any moment.

## 4. The stacked feeling popups: the cause

Three things on 0.24.0, all fixed in the primitive or its one caller:

1. **The combat HEART panel had a native title on its container** (`title="{{tp.hv.swell}} {{tp.hv.rider}}"`). Every
   feeling row inside it had the game's card (`data-tip`) and no title of its own, so the browser showed the
   container's "Next turn it swells…" box at the same time as the row's card: two popups on top of each other.
2. **The Magic tab's feelings and the area-map HEART panel used native titles**, each a paragraph that repeated the
   whole row; moving down the grid, the browser's boxes covered the rows next to them. Now each row has the one card.
3. **The unlock card** ("A NEW FEELING · RAGE") was a new fixed element per feeling at the same spot: feelings felt
   together stacked. Now one card at a time (`fx/feelings.ts feltCard`): a feeling felt while it is up joins it
   ("3 NEW FEELINGS · RAGE, GRIEF AND FEAR", past three "and N more"), and one felt while it fades starts a fresh card
   instead of joining a card that is disappearing. Test: `combatSpeed.test.ts`.

## 5. One fact, one place

| Duplicate | Now | Test |
| --- | --- | --- |
| A feeling's step twice ("Rage: +0.5 · +0.5 to the multiplier…", "Grief: +0.2; +0.5 once… · +0.2, or +0.5 if…") | one chip, the base step; the text without the clause that repeated it; a conditional step says only what raises it ("+0.5 if an ally has gone Down…"); "its +0.3" reads "its step". HEART panel, Magic tab, creation, the Proving Ground (all through `feelingsView.ts`); the unlock card has no step | `feelingsView.test.ts` |
| Momentum: the rule in the panel, again under it, and in the card | one summary line in the panel, the rule only in the card | `resources.test.ts`, browser shot 2 |
| Heat, rounds, Momentum, Guard in a weapon's area header and in the unit panel | the unit panel's rows only; the header names the weapon and says JAMMED | `combat-attack-areas.test.ts` |
| HEAT and JAMMED chips beside the Heat row in your own panel | gone in your own panel (an ally's or a target's line keeps them) | same |
| A gun's JAMMED on its ammo row and on its area header (Attack tab) | on the Attack tab only the header; other tabs, the row | same |
| Strain and the held Outburst in the unit panel and the HEART panel | the HEART panel's while it is up | browser shot 1 (no Strain row in the unit panel) |
| The detail line under the tabs: "Stage 0 ×0.8 · Strain 1/6", "Charge 10/10 · Flux 0/6 · 4 spare cores", "MP … · Strain …" | only what is that action's own (the cap left, an overload warning, the design's line, the rider, a warning) | `combat-heart.test.ts` |
| Witnessed as a chip and as a resource row in your own panel | the row (`ownConds` in `combat.js`) | `combat-attack-areas.test.ts` |
| A condition on your unit | once, in your panel | `combat-attack-areas.test.ts` |

Not changed (left on purpose): Pressure pips over every token on the map are everyone's public state, and your own
You card chip carries its cost and source; the map's transient "STRAIN 1/6" float is feedback, not a reading.

## 6. Do not show what does not exist

| Was shown | Now |
| --- | --- |
| A Sigil word card's "Grand form (Grand Sigilist): Lava floor…" (Magic tab) | only to a character who can lay one: `canLayGrandForms(c)` (engine) asks whether a held, active class move carries the `grand_form` op in `data/classes.json`; no class name in code. Shelved today, so nobody. Test: `packages/engine/test/grand-forms-shelved.test.ts` |
| The Codex's "Advanced classes" module group (Magic tab) | hidden while each module's class is shelved (`moduleShelved`) |
| The practice "learn a module" picker offering the ten advanced-class modules, greyed | not offered while shelved |
| The same school twice in a design | checked: neither design builder offers it (`sameSide` drops the design's own school; the engine refuses it with "not open yet"), and no player text shows the schools' `stack` lines |

The Proving Ground's module list hides them too (it showed them greyed and could not grant them; `feelings40` suite).
Kept on purpose: the Narrator's glossary still knows each word's Grand form (lore, not an offer to the player).

## 7. Two guns

**Heat is shared.** The engine keeps one value, `u.heat`, for the pair (spec item 956: limits added, cooling 4 at the
turn start; at the limit the gun that fires jams). The screen shows it once: the unit panel's Heat row, whose card says
the two guns share it. Each gun's jam is its own (`u.jammed`, `u.offJammed`): a red ✕ JAMMED on its own area header,
its rows greyed with "Jammed: clear it first." in their cards.

**Clear jam (Leon's ruling, spec Hands 5d and item 1742):** with a gun that can jam in each hand there is ONE Clear jam,
in the BOTH area, enabled when either is jammed; it clears every jammed gun held for the main hand's price once and
resets the pooled Heat. Its card ends "Clears: the off-hand gun." / "the main-hand gun." / "both guns.". No per-gun
Clear jam rows then; one weapon is unchanged. The retired id `clear-off` resolves to `clear` (a saved turn-card pick).
The golden cost tables did not change: the two-gun `clear` and `clear-off` lines cost and do the same.

**What Leon saw on live (one button cleared both, the other did nothing useful):** the engine already kept the two jams
apart and each row cleared only its own gun, but the screen read only the main gun's jam (the JAMMED chip and the Heat
row's warning came from `u.jammed`), and clearing either reset the shared Heat. After the main hand's Clear jam every
sign of a jam was gone while the off-hand gun stayed jammed, and the off-hand row said "Not jammed." whenever only the
main gun was: one button seemed to clear both, the other never to work.

**Question for Leon (no rule changed):** with pooled Heat, an off-hand *technique* still checks the Heat jam on the main
gun (item 1726 left it so); the paired attack checks it on the gun that fires. Should a Heat jam always land on the gun
that fired?

## 8. Attack an object

"Shoot an object" is "Attack an object" wherever a player sees it (rows, card, the say line "Confirm to attack it",
data texts, the spec's Break entry, the playtest checklist). The log already said "shoots" for a gun and "smashes" for
a melee weapon. The ids (`cover`, `cover-off`, `combat/shoot-cover`) stay.

## Screenshots

`/tmp/…/scratchpad/shots-hover/` on the session's machine (1-release-card, 2-momentum-card, 3-fire-word-card,
4-magic-tab-feelings, 5-heart-feelings-sweep, 6-dual-attack-tab-off-jammed, 7-dual-clear-jam-card), DSF 2, retaken
after these changes.
