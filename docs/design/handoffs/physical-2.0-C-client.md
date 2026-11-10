# Physical 2.0, implementer C: the screen

For a Claude Code session on its own branch. Written 10 Nov 2026. Suggested settings: Opus 5.5, effort **high**, ultracode **off**.

You are building everything a player sees of **Physical 2.0** in Project Heaven Cry (`leonpentastorm/Project-Heaven-Cry`), and putting the new item icons on screen. Two other sessions build the melee and ranged technique handlers in the engine at the same time, and a lead session owns the engine core, the data and the merge.

## Read first

1. `CLAUDE.md` (the UI direction and the colour rules matter for you).
2. **[`physical-2.0-PLAN.md`](physical-2.0-PLAN.md)**: the rules for all implementers (section 2), the readings already settled (section 4) and the contract (section 5). It wins over everything below it.
3. **[`../proposals/2026-11-ranged-techniques.md`](../proposals/2026-11-ranged-techniques.md) section 10, "The panel":** Leon's ruling on the layout. Then both proposals in full, so you know what the chips mean.
4. [`physical-2.0-code-map.md`](physical-2.0-code-map.md), the parts "Combat screen" and "Sheet, Kit, Proving Ground tools, data": where everything is today, with line numbers and traps. Read the traps before you touch `combat.js`.
5. `art/style-guide/weapon-icons.md` and `apps/web/src/game/gearIcons.ts`: the new icons and their loader.
6. `docs/design/colour-system.md`.

## Your branch

- **Part 1 (item icons) can start now,** from `origin/claude/charming-gauss-hbq4n0` as it is: the icons and their loader are already merged there.
- **Parts 2 to 9 start once `physical-2.0-PLAN.md` says the foundation has landed.** Merge the base into your branch then.
- Push only to your own session branch.

## What you own

Everything under `apps/web/`, except `apps/web/src/game/protodata.json` (never regenerate or edit it). You also write `docs/design/handoffs/physical-2.0-C-RESULT.md` and may add screenshots under `docs/design/handoffs/physical-2.0-shots/`.

You don't edit `packages/engine/`, `data/`, the spec or `art/`. The engine gives you everything as values: **the screen never works a number out itself.** If a value you need is missing from `techniquePad`, `previewTechnique` or the character helpers, put it under "Requests for the lead" and show a plain placeholder meanwhile.

## Part 1: item icons

Leon: "implement item icons". 60 weapon icons and 19 armour and shield icons exist as monoline SVGs in `currentColor`; nothing draws them yet. `gearIcon(id)` returns the markup, `hasGearIcon(id)` says whether there is one.

Put the icon beside the item's name everywhere an item is listed:

1. the sheet's GEAR tab: hands, body slots, backpack rows;
2. the combat backpack and the gear-change rows in a fight;
3. the Proving Ground's gear list and its give / equip tools;
4. pile lists (the hover list and the pick-up checklist) and enemy drops;
5. the reload card;
6. the creation Kit step (the kit's weapon and armour);
7. the new weapon rows in the Attack tab (part 2) and the drill bars (part 5).

Rules:

- White ink (`#E7EBF3`) on panels by default; a muted ink when the row is disabled. Don't colour an icon by attribute unless the row is already coloured by meaning.
- 24 to 32 px in rows, 48 px or more on cards. Check each at the sizes you use: the icons were drawn to read at 32.
- An item with no icon shows nothing in the slot (no broken image, no box). Items that aren't weapons, armour or shields have no icons yet.
- The loader bundles every icon as a string. Check what that does to the bundle size and say so in your result note.

## Part 2: the Attack tab

This replaces today's attack rows (Shot, Aimed shot, Burst, Full auto, Overwatch, the weapon skill row, Melee). Leon's ruling: gun techniques and melee techniques each get **their own expandable action**, the way "Draw a glyph" opens the glyph keyboard and "Outburst" opens the design cards.

1. **One block per held weapon,** main hand first, then the off hand if it holds a weapon. Each block has:
   - a header: the weapon's icon and name, and its meter (melee: Momentum pips; ranged: rounds loaded and Heat);
   - the **plain attack** row: Cut for a melee weapon, Shot for a ranged one. It selects like any row today and fires on Confirm;
   - the **Techniques** row, with the count of entries usable right now ("Techniques · 4"). Selecting it opens that weapon's pad.
2. **One row "Hold a shot"** under the ranged block, opening a pad of the Watch techniques (Overwatch, Deny, Cover Me, Dead to Rights). Melee Answers are not in any pad: they fire on their triggers.
3. **The pad** opens inside the row's wrapper, exactly as the glyph keyboard does (the code map, "Expandable pads"). Only one pad is open at a time. It shows `techniquePad(cb, u, hand)`:
   - chips grouped by the groups the engine returns, each group with its label;
   - on each chip: the name, AP, rounds if any, and the property line that applies with this weapon (`entry.line`);
   - a chip with `ok: false` is greyed and shows `why`;
   - a lent technique (`entry.lent`: the weapon's own signature, not yet learned) and a learned signature (`entry.signature`) each get a small mark, with the meaning in words on hover.
4. **Picking a chip** selects it and closes the pad to one line in the selected-action card ("Lunge · 2 AP"). Then the usual flow: pick a target or a tile on the grid, read the preview, Confirm.
5. **The preview** is `previewTechnique(cb, u, id, args)`. Show, in the selected card: the hit chance and number needed for each attack roll in it, the damage, every note the engine returns, Momentum now and after, each unit's Pressure change and the state it would reach, any save with its TN, and the tiles it covers or moves someone to (drawn on the grid like Sigil previews). If `ok` is false, show `why` and disable Confirm.
6. **A choice.** When the held weapon has two properties a technique reads, the engine's entry lists both lines; show them as two small chips under the selected line and send the pick as `choice`.
7. **Confirm** sends `combat/technique { id, hand, targetId?, tile?, allyId?, choice? }`. Read trap 1 in the code map first: `confirm()` falls through to a plain shot for an unknown action id. A technique must never do that.
8. **Keys.** Inside the Attack tab: 1 selects the first weapon's plain attack, 2 opens its Techniques; 3 and 4 the second weapon's; 5 opens Hold a shot. In an open pad, arrow keys move between chips and Enter picks, as on the glyph keyboard. The tab-switching number keys work as today when no pad is open; say in your result note how you resolved the overlap.
9. **Height.** `e2e/tabs.mjs` requires the grid and Confirm on screen with no page scroll at 1440 × 900 and 1280 × 720 with a pad open. That stays true with two weapons held and the longest pad open.
10. **What is not built yet.** Until implementers A and B hand back, most techniques answer "not built yet" from the engine. Show them greyed with that reason. Don't hide them and don't special-case them.
11. **Attack ids are listed by hand in about eight places** in `combat.js` and `commands.ts` (the code map lists them). Replace those lists with one shared constant while you are there.
12. **The turn card, the mini-bar and Customise** use the same action list. Rows you remove must leave them cleanly, and a saved pick that no longer exists must fall back without an error (the code map names the storage key).

## Part 3: Momentum, Pressure and states

1. **Momentum** already draws under the HP bar for a Fighter. It is now on every unit that holds a melee weapon. Add the hint the engine gives ("+1 if different") beside the pips.
2. **Pressure pips on tokens.** Up to 4 pips above every token whose Pressure is above 0, enemies and allies alike. They are public: they don't need Analyze. The state word (Pressed, Suppressed, Broken) goes in the token's hover card and its aria-label. Pair the colour with the word (the colour rules).
3. **Hidden pips.** Pressure from a Silent weapon is hidden from its target's side until it is used. The engine's view for each player already leaves it out; draw what you are given.
4. **On the You card:** your own Pressure with its state and what it costs you in words, and who put it there when the engine says ("the sharpshooter has you Pressed").
5. **Held Watches.** Your own held Watch shows on the You card with its trigger ("Deny · F6"). An enemy's held Watch that your side can see is drawn on the map: the tiles it covers in a red tint and a line from the watcher, so players can plan around it. Your own and allies' Watches use your side's tint.
6. **Stopped once.** A unit that can't be stopped again this round shows it in its hover card, so a gunner doesn't waste a Take.

## Part 4: effects and sounds

The engine emits `technique`, `momentum`, `pressure`, `watch_set`, `watch_fire`, `stopped` and `drill` (the plan, section 5.4). Add one handler family file beside the others (`fx/classes.ts` is the model) and register it in the two places the code map names.

- Keep them short. A gunner's turn must not get slower than it is today. They follow the combat speed setting.
- `technique` reuses the shot and melee effects that already play, plus the technique's name over the unit. A Finisher and a Take get one stronger beat each.
- `pressure`: the pips tick up or down on the token. Reaching Suppressed or Broken gets its word over the token once.
- Leon's asset rule (CLAUDE.md): make an effect yourself only when it works as plain SVG or CSS (rings, lines, tints, pips). Anything with texture comes from a CC BY 4.0 or CC0 asset, credited in `sfxCredits.ts` / `credits.ts`. Never NC, ND or "personal use".

## Part 5: the sheet

1. **A new tab, ARMS,** between GEAR and MAGIC, in its own file modelled on `faithTab.js` (computed only while open).
2. **Known techniques,** in two sections (melee, ranged), grouped by kind: the name, the base text and every property line. A signature shows the weapon that teaches it.
3. **The two ready lists,** each with its cap from the engine (`readyCap(c, system)`). Toggle a technique in or out; the change sends `phys/ready`. Locked in a fight, with the reason shown.
4. **Drill:** one bar per weapon the character has drilled or holds, with its icon, its three marks, what each mark gives (mark I: the signature by name), and the drill to the next one. When a mark has given a pick, a chooser lists the techniques that can be picked (`phys/pick`). Model it on the Sigil study bar and its chooser.
5. **The quiver menu** (Leon: "quiver gets a special loading menu"). For each bow the character carries: the capacity, a stepper per arrow type they carry, and the total. Applying sends `phys/quiver`. It says plainly that a quiver can't be refilled in a fight. Locked in a fight.
6. **Remove the WEAPON MASTERY block** from the GEAR tab: drill replaces it. The weapon rows in GEAR stop printing the old weapon skill text and print the weapon's properties and the technique it teaches instead.

## Part 6: creation

On the Kit step, under the kit: a character with Raw Power or Athletics picks 2 melee techniques (one must be an Opener), and one with Dexterity picks 2 ranged ones. Follow the starting-magic picker end to end (the code map, "Creation: Kit step"), with sensible defaults already picked so a new player can just continue. The engine checks the picks (`startingTechniquesError`).

## Part 7: the Proving Ground tools

A new section in the tools panel: grant or remove any technique, set a weapon's drill, fill the ready lists, and set a unit's Momentum or Pressure for testing. The actions are `sandbox/technique` and `sandbox/drill`; ask the lead for any other you need. Add its search words.

## Part 8: the "?" and the Narrator's words

Each technique chip and each property name has a "?" or hover that explains it in one or two plain sentences, from the data's text. The property explanations come from the engine's glossary entries (the lead adds them).

## Part 9: tests

1. **Unit tests** for each new view module (the pad's view model, the ARMS tab values, the pip view), in the style of `classView.test.ts`.
2. **Update the tests the removed rows break** (the code map lists them: `turnIntro.test.ts`, `combat-screen.test.ts`, and others).
3. **A new browser test, `apps/web/e2e/physical.mjs`,** in the Proving Ground with the enemy AI off:
   - a character with a blade in one hand and a pistol in the other: two blocks, each pad opens and closes, only one open at a time, the grid and Confirm stay on screen at 1440 × 900 and 1280 × 720;
   - Lunge then Coup with the blade: Momentum pips rise and empty;
   - Suppress then Dead Centre with a rifle: the target's Pressure pips rise to Pressed and fall by 2;
   - Deny held on a tile: it is drawn, and it fires when a drone walks in;
   - the ARMS tab: a ready list toggled, a drill bar raised with the tools until mark I, the signature learned;
   - a bow: the quiver menu, and reload refused in a fight;
   - icons present in the backpack and the gear list.
4. **Update the browser tests that click attack rows by name** (the code map lists `tabs.mjs`, `slate.mjs`, `feel.mjs`, `perks.mjs`, `classes-moves.mjs`). Note the name clash: the Fighter's class moves are also called Lunge, Riposte and Finisher until the lead rewires them.
5. Screenshots of each new surface at 1440 × 900 and 1280 × 720 go in `docs/design/handoffs/physical-2.0-shots/`, and your result note lists them.

## Done means

- Every part above is on screen and reads correctly with only the lead's reference techniques built, and still reads correctly when the rest arrive (nothing is keyed to a technique id).
- The checks in the plan (section 2, point 11) pass, and `node apps/web/e2e/physical.mjs`, `tabs.mjs`, `slate.mjs`, `classes.mjs`, `classes-moves.mjs`, `perks.mjs`, `pg-levelup.mjs` and `two-players.mjs` pass against a local build.
- Your result note is pushed, and you have told Leon your branch name.
