# Physical 2.0, implementer C: result note

Branch: **`feature/physical-2.0-C-client`**, from `origin/claude/charming-gauss-hbq4n0`. Written 10 Nov 2026. The base is
merged in up to `fde0bbe` (the foundation, `9851b9f`, and the lead's fixes after it).

**Status: every part of the brief is on screen.** Part 1 (item icons) came first. Parts 2 to 9 were built once the
foundation landed: the Attack tab with technique pads, Momentum and Pressure pips, held Watches, the effects, the ARMS
tab, the starting picks at creation, the Proving Ground tools, the help text, and the tests. Nothing on screen is keyed
to a technique id: the pads, the ARMS tab and creation list whatever the engine's data and handlers hold, so the
techniques A and B are still building show up greyed as "Not built yet." now and work when they land.

## What is done: parts 2 to 9

**Part 2, the Attack tab** (`apps/web/src/game/techView.ts`, `screens/combat.js`, `templates/combat.template.html`,
`game/commands.ts`).
- One block per held weapon, main hand first. Its header has the weapon's icon and name, and its meter: Momentum pips
  for a melee weapon, with the engine's hint ("+1 more if your next technique isn't Lunge"); rounds loaded and Heat for a
  ranged one.
- In each block, the plain attack row (Cut or Shot) and a Techniques row ("Techniques · 4"; its cost column says "4 of 6
  now"). Selecting the Techniques row opens the weapon's pad inside the row, as the glyph keyboard does. One pad is open
  at a time.
- Hold a shot (under the ranged block) opens the Watches. Melee Answers are in no pad: they fire on their triggers.
- The pad shows `techniquePad` by group. Each chip has its name, AP, rounds, and the property line for this weapon. A chip
  the engine refuses is greyed and says why. A lent signature is marked ◇ and a learned one ◆, with the meaning on hover.
- Picking a chip closes the pad to the selected card ("Lunge · 2 AP"). The card asks for what the technique still needs
  (an enemy, a tile, an ally), then shows `previewTechnique` in words:
  - each roll's hit chance, the number needed and the damage, with the full to-hit terms on the target card;
  - the engine's notes;
  - Momentum now → after;
  - each unit's Pressure change and the state it reaches;
  - any save and its TN.

  The tiles it covers or moves someone to are drawn on the grid, the way Sigil previews are. Confirm is disabled while
  the preview says no.
- A weapon with two of the properties a technique reads shows both lines as chips under the selected line. The pick goes
  as `line` (the engine's name for the brief's `choice`).
- Confirm sends `combat/technique { id, hand, targetId?, tile?, allyId?, line? }`. A pad row or a technique never falls
  through to a plain attack (code map, trap 1).
- The old attack ids live in one shared list (`ATTACK_MODES` in techView.ts). The places that listed them by hand use it.
- Customise, the turn card and the mini-bar use the same list. A pick saved before techniques maps onto the new row
  (`mapLegacy`): Shot, Aimed shot, Burst, Full auto, Melee and the weapon skill go to the plain attack; Overwatch goes to
  Hold a shot. A pick that no longer exists falls back to the smart default without an error.

**Part 3, Momentum, Pressure and states.**
- Pressure pips (up to 4) over every token with Pressure, enemies and allies alike: white, then amber at Pressed and red
  at Suppressed or Broken, always with the word. The state word is in the token's hover card and its aria-label.
- What the engine's view hides (a Silent weapon's pips) is never drawn.
- The You card has chips for your Pressure (its state, what it costs you in words, and who put it there), your held Watch
  ("DENY · F6") and Stopped once. Any unit that can't be stopped again says so in its hover card.
- Held Watches are drawn on the map: the tiles tinted (red for an enemy's, white for your side's), a dotted line of tiles
  from the watcher to the nearest watched tile, and a chip on the watcher ("◎ DENY").

**Part 4, effects** (`game/fx/physical.ts`, registered in `fx/play.ts` in the two places the code map names).
- `technique` floats the technique's name over the unit. Its own shot or swing still plays as before, from the attack
  events that follow. A Finisher or a Take gets one stronger beat (a ring and a low hit).
- `pressure` pulses the pips, and names Suppressed or Broken once per unit.
- `watch_set` rings the holder. `watch_fire` puts a crosshair on the target.
- `stopped` and `drill` float their words; `momentum` floats when it rises.
- The beats are short (60–260 ms at Fast) and follow the combat speed setting. A gunner's turn is not slower: a plain
  technique adds 120 ms.
- Everything is SVG or CSS (rings, words, a pulse), so no sourced asset was needed.

**Part 5, the sheet's ARMS tab** (`screens/armsTab.js`, between GEAR and MAGIC, computed only while open).
- Techniques you know, melee and ranged, by kind. Each shows its text and every property line (the hover explains the
  property from the engine's glossary). A signature names the weapon that teaches it.
- The two ready lists with their caps ("MELEE · READY 3 / 8"). Toggling a technique in or out sends `phys/ready`; at the
  cap the chip says to take one out first.
- One drill bar per weapon drilled or held: its icon, properties, the bar with the three marks, what each mark gives
  ("Coup (its signature)", "a pick of any melee technique"), and the drill to the next mark. When picks are owed, a
  chooser lists `pickable` and sends `phys/pick`.
- The quiver menu for each bow carried: the capacity, a stepper per arrow type you carry, the total, and Load the quiver
  (`phys/quiver`). It says plainly that a quiver can't be refilled in a fight.
- All of it is locked in a fight, with the reason shown.
- WEAPON MASTERY is gone from GEAR. The weapon rows there print the weapon's properties and the technique it teaches.

**Part 6, creation.** The Kit step has a Techniques section: Raw Power or Athletics picks 2 melee (one an Opener),
Dexterity picks 2 ranged. The engine's defaults are already picked, chips swap them, and "Back to …" resets. The engine's
`startingTechniquesError` is the verdict, and it is a line in the Lock-in checklist. The picks go on the sheet as
`techniques` (drafts keep them).

**Part 7, the Proving Ground tools** (the Gear tab).
- Learn and ready any technique; it is readied past the cap here, and a technique with no handler is marked "not built
  yet". Learn every technique and ready all. Forget one or all.
- A weapon's drill: +100, +300, +900, or reset (`sandbox/drill`).
- In a fight (host), any unit's Momentum and Pressure (`sandbox/meter`).
- Search words added.

**Part 8, help.** Every chip's hover gives the technique's text, the line for this weapon and the property explained from
the glossary. The ARMS tab's lines and the Kit chips do the same.

**Part 9, tests.**
- New unit tests: `apps/web/src/game/techView.test.ts` (9: the ids, the blocks and pads from a real fight, the preview in
  words, the pips, a held Watch's marks, the effects' words, the ARMS tab's values).
- Updated, because they asserted the removed rows: `combat-screen.test.ts`, `turnIntro.test.ts`,
  `commands-perks.test.ts`, and `e2e/slate.mjs`.
- New browser test: `apps/web/e2e/physical.mjs` (32 checks). It covers:
  - the Kit step's picks;
  - the ARMS tab: a ready list toggled, drill to mark I with the tools, Coup learned, the quiver menu;
  - two blocks, the pads one at a time, the grid and Confirm in view at 1440 × 900 and 1280 × 720;
  - Lunge then Coup with the Momentum pips;
  - Suppress then Dead Centre (Pressure to Pressed, then −2);
  - Deny held, drawn, and fired when a drill unit walks in;
  - icons in the backpack.

  Two steps depend on dice. If the Lunge misses, the test sets Momentum with the tools and still checks Coup. If
  Suppress misses (+1 only), the Take is skipped. It prints a `note` line, never a failure.

**Also on this branch, at Leon's request** (10 Nov 2026, while the suites ran): the story screen's right column is four
movable modules, built the way the combat screen's panels are (`apps/web/src/game/storyPanels.ts`, `screens/main.js`,
`templates/main.template.html`).
- The mana forecast, the map (with Near you), the quest board and the player card each have a grip. Drag it up or down
  the column, or focus it and use the arrow keys (Home first, End last). Escape cancels a drag.
- The order is kept per browser (`phc.storyPanels`). "Reset the panels" shows once it was changed.
- The player card sticks to the bottom of the column only while it is last, its first place.
- The player card always has room for five seats (four players and the Narrator): a two-a-row grid that keeps three rows.
  The Proving Ground has no Narrator, so it keeps two rows there.
- Tests: `storyPanels.test.ts` (6) and `e2e/right-panels.mjs` (18 checks). Screenshots: `rp-*.png`.

**Read differently from the brief:**
1. **Number keys.** Inside the Attack tab, 1–5 act on the blocks (1 the first weapon's plain attack, 2 its Techniques, 3
   and 4 the second weapon's, 5 Hold a shot) when a pad is open or the keyboard is in the tab's panel. Otherwise they
   switch tabs as before, so a player who isn't in the Attack tab loses nothing.
2. **Rows don't repeat the hand.** The block header names the weapon and its hand.
3. **Companions, puppets and the drone keep the old attack rows.** The engine refuses `combat/technique` for them
   (`COMPANION_ACTS` and the `allowedActions` gate), so a technique row would only fail. See request 1.
4. **The old weapon-skill row is gone** (Fan the Hammer, Suppressing Fire…). The weapon's signature technique replaces
   it, in its pad.
5. **A gun in hand has no "Melee (fists)" row any more** (the brief removes the Melee row). Until the lead's "dry gun
   as a club" lands, a gunner strikes in melee by putting a blade in a hand. Say if a punch row should stay.
6. **A melee weapon no longer "holds a strike".** Hold a shot is ranged only; melee Answers fire on their triggers.
7. **The Watch's line is drawn as a dotted line of tiles** from the watcher to the nearest watched tile, not an SVG
   stroke. It reads the same and needs no new overlay.

## What is done: part 1, item icons

## What is done: part 1, item icons

A weapon's, armour piece's, shield's or magic focus's monoline icon now sits beside its name wherever the item is
listed. An item with no icon (magazines, rounds, ration packs, tools) draws nothing in the slot: no box, no broken
image.

| Where | What shows | Size |
|---|---|---|
| Sheet, GEAR tab | the hand cards (the icon fills the big frame where the old placeholder glyph was), each body slot with a worn piece, every backpack row | hands about 100 px, rows 24 to 28 px |
| Combat backpack | the hands, worn pieces, the pack's weapons and pieces, throwables; muted ink when none of the row's actions can run now | 32 px |
| Reload card | the weapon's icon before the title ("SPEED RELOAD"); with two guns, in each column's MAIN / OFF label | 18 px and 14 px at the base scale (see "Read differently" 2) |
| Pile hover (combat grid and area map) | one row an entry, the item's icon before its words | 24 px |
| Pick-up checklist (combat and area map) | the icon on each row; muted when the pile is out of reach | 24 px |
| Proving Ground tools | Equipped (hands and worn pieces), Pack rows, the Give list | 24 px, Give 32 px |
| Creation, Kit step | each kit's weapons and its off-hand focus, in the card's top-right corner | 48 px |

Enemy drops land in piles (rules 1.9), so the pile hover and the checklist cover them. The Attack tab rows and drill bars
(part 1 point 7) come with parts 2 and 5.

**The Evoker and the Emanator** (Leon, mid-session: "Where are the emanator and evoker, their base from are 2 type of
gloves, read the lore and make their icon too"). There were no icons for the two magic foci (`category: focus` in
`data/items.json`). I drew both, in the same monoline rule, and put them in a new folder, `art/icons/focus/`. Both are
marked **Suggested** in `art/style-guide/weapon-icons.md` until Leon confirms the look:

- **Evoker:** an angular glove, back of the hand. The index finger ends in a stylus point that draws the glyphs; a
  hexagonal core window holds the mana core (the World Bible's *clack, clack, RACK* reload); a cuff seam.
- **Emanator:** a rounded glove, open palm, on a long bracer. A round emitter lens in the palm, and the heart link: one
  line from the lens down the wrist and out of the cuff.

Contact sheet beside the existing gloves: `physical-2.0-shots/c1-focus-gloves-sheet.png`.

### Files

- `apps/web/src/game/gearIcons.ts`: `gearIconUri(id, ink)` (the icon as a data URI in one ink; `''` when none),
  `GEAR_INK` and `GEAR_INK_OFF`; the loader also reads `art/icons/focus/`.
- `apps/web/src/game/worldView.ts`: `pileEntryId`, `PileLook.tipRows`, and icon fields on `PileRow`.
- `apps/web/src/game/backpack.ts`: `BpRow.item`.
- `apps/web/src/game/fx/reload.ts`: the icon on the reload card.
- `apps/web/src/game/sandbox.tsx`: `GearIcon` in Equipped, Pack and Give.
- `apps/web/src/screens/main.js`, `combat.js`, `create.js` and their three templates.
- Tests: `apps/web/src/game/gearIconViews.test.ts` (new), `gearIcons.test.ts` (the data URI; every focus must have
  an icon). Browser test: `apps/web/e2e/gear-icons.mjs` (new, 14 checks).
- Art (Leon's direct request; outside my brief's files, see "Requests for the lead" 1): `art/icons/focus/evoker.svg`,
  `art/icons/focus/emanator.svg`; `art/README.md`, `art/icons/weapons/README.md`, `art/style-guide/weapon-icons.md`;
  `art/checksums.sha256` regenerated with `tools/rehash_art_checksums.py` (only those five lines changed).

### Bundle size

Before this branch nothing imported the loader, so the icons were not in the bundle at all. Now they are (81 SVGs,
40 KB of markup, about 8 KB gzipped on their own). The whole web build's JavaScript went from 6,527,687 to 6,574,856
bytes (+47 KB, +0.7%), and gzipped from 2,179,646 to 2,189,860 bytes (+10 KB, +0.5%). Each data URI is built once per
item and ink, then cached.

## What I read differently from the brief

1. **Icons as `<img>` data URIs, not inline markup.** The template runtime takes text holes only, so an inline `<svg>`
   can't be dropped in. `gearIconUri` puts the ink into the markup instead of CSS `color`, the same way `glyphUri` does
   for Sigil glyphs. Tinting by meaning still works: pass another ink.
2. **The reload card's icon is small** (18 px at the base scale, 14 px in a two-gun label), not 48. The card is a brief
   effect over the unit, and its columns are taken by the magazine well and the pack or pile marker, so the icon goes in
   the title chip. Checked at that size: the silhouettes read.
3. **Magazines and rounds get no icon**, though they carry their gun's id: they are not the gun. Same in pile entries.
4. **The kit's body armour has no icon.** It is an Armour Class from the kit (Medic plate, Flak vest, Padded coat), not
   an item in `data/items.json`.

## Requests for the lead

1. **Companions, puppets and the drone can't use techniques.** The reducer's gates (`COMPANION_ACTS`, the drone's
   `allowedActions`) refuse `combat/technique`. The screen keeps the old rows for them. Say whether they should get
   techniques; the screen then needs no change beyond dropping that branch (`isLegacyUnit` in `game/commands.ts`).
2. **The quiver loader isn't built yet** (implementer B). The ARMS tab's menu sends `phys/quiver` and today shows the
   engine's "The quiver isn't built yet.". Refusing a bow's reload in a fight is B's too; the screen shows whatever the
   engine answers.
3. **Answers' priority** (`phys/answers`) has no screen yet: the brief didn't ask for one. If players should order
   their Answers, the ARMS tab is the place.
4. **`protodata.json` still carries `wm`** (weapon mastery). Nothing on screen reads it now; drop it at your next
   regeneration.
5. **The two focus icons are under `art/`** (part 1, Leon's request), outside my lane. Take them as they are, or move
   them.
6. **A look for the kit armours**, if they should have icons.
7. **Not mine, seen in passing:** the Proving Ground's Practice card shows a broken image ("The Proving Ground: the
   drill yard") on a local build without `npm run assets`.

## Checks (against a local build, after merging the base at `fde0bbe`)

- `npm test -w @phc/engine`: 1,868 tests (1,867 pass, 1 skipped). `npm test -w @phc/web`: 664 tests (662 pass, 2
  skipped). `npx tsc --noEmit` in `packages/engine` and `apps/web`: clean. `python3 tools/validate.py data`: 0 errors,
  0 warnings. `tools/validate_art.py`: OK.
- Browser tests: see "Browser test results" below.

**Browser tests I changed because the new engine or the new rows broke them** (none of these is a screen bug):
- `slate.mjs`: the plain Shot's id is now `tq:main:shot`.
- `feel.mjs`:
  - the knife's row is Cut, not Strike;
  - the Fan the Hammer volley is sent as the old `combat/skill` action (its row is gone and Mag Dump isn't built yet).
    Switch it to the pad when B lands Mag Dump.
- `perks.mjs`: a Fighter now answers a miss with Riposte, so the lone drill unit fell and the wave ended before anything
  hit. The test spawns a champion first, so Used to the Pain gets its hit.
- `ground.mjs`: weapons hit harder under the new damage rule (the rifle does 45 to an object, not 30), so the pillar the
  test shoots breaks in two shots. Its "spend a round" helper now checks the magazine really went down.

**Browser test results** (one run of the whole list against the final build; no failure, no crash):

| Suite | Checks passed |
|---|---|
| `physical.mjs` | 33 |
| `tabs.mjs` | 28 |
| `slate.mjs` | 24 |
| `classes.mjs` | 34 |
| `classes-moves.mjs` | 52 |
| `perks.mjs` | 27 |
| `pg-levelup.mjs` | 53 |
| `right-panels.mjs` | 18 |
| `gear-icons.mjs` | 14 |
| `sandbox.mjs` | 33 |
| `ground.mjs` | 28 |
| `feel.mjs` | 27 |
| `missions.mjs` | 17 |
| `ui-shell.mjs` | 86 |
| `playscreen.mjs` | 10 |
| `creation-layout.mjs` | 25 |
| `two-players.mjs` | no host or guest errors |

`physical.mjs` passes 31 to 33 checks depending on the dice (a missed Lunge or Suppress skips its follow-up step with a
`note` line); it never failed in six runs.

## Screenshots (`physical-2.0-shots/`)

- Part 1:
  - `c1-icons-kit-1440.png`, `c1-icons-kit-1280.png`
  - `c1-icons-pg-1440.png`, `c1-icons-pg-1280.png`
  - `c1-icons-sheet-gear-1440.png`, `c1-icons-sheet-gear-1280.png`
  - `c1-icons-backpack-1440.png`, `c1-icons-backpack-1280.png`
  - `c1-icons-reload-1440.png`
  - `c1-icons-pile-hover-1440.png`
  - `c1-icons-pickup-1440.png`, `c1-icons-pickup-1280.png`
  - `c1-focus-gloves-sheet.png`
- Parts 2 to 9:
  - `c2-pad-main-1440.png`, `c2-pad-main-1280.png` (a weapon's pad open)
  - `c2-pad-watch-1440.png` (Hold a shot)
  - `c2-lunge-preview-1440.png`, `c2-suppress-preview-1440.png` (the selected card with the engine's preview)
  - `c2-coup-1440.png`
  - `c2-pressure-1440.png` (pips over a token)
  - `c2-deny-1440.png` (a held Deny drawn on the map)
  - `c2-arms-1440.png`, `c2-arms-1280.png` (the ARMS tab)
  - `c2-kit-1440.png`, `c2-kit-1280.png` (starting techniques)
- The right column's modules:
  - `rp-default-1440.png`, `rp-default-1280.png`
  - `rp-moved-1440.png`, `rp-dragging-1440.png`
  - `rp-five-seats-1440.png`, `rp-five-seats-1280.png`

## Not tested

- Phone widths for the new rows and pads (the browser tests cover 1440 × 900 and 1280 × 720).
- A two-gun reload card in the browser.
- Techniques whose handlers aren't built yet (A's and B's): they show greyed with "Not built yet." and their previews will
  come from the engine when they land. Nothing on screen names them.
- A guest's view of the pads in a two-player room (two-players.mjs plays the story and one fight, not techniques).
