# Physical 2.0, implementer C: result note

Branch: **`feature/physical-2.0-C-client`**, from `origin/claude/charming-gauss-hbq4n0` at `a098d07`. Written 10 Nov 2026.

**Status: part 1 (item icons) is done. Parts 2 to 9 have not started,** because the foundation has not landed: the
plan's line still reads "Foundation: not landed yet", and `packages/engine/src/physical/` does not exist. The brief
allows part 1 before the foundation and nothing else. When the lead fills in that line, I merge the base and go on with
part 2.

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

1. **The two focus icons are under `art/`,** which my brief keeps out of my lane. I made them because Leon asked
   directly. If you'd rather own them, take the five art files and the checksum lines as they are; the web side only
   needs the `focus` folder in the loader's glob.
2. **A look for the kit armours**, if they should show: an item id (or an icon id) for each kit armour.
3. **Not mine, seen in passing:** on this base, the Proving Ground's Practice card shows a broken image with the alt text
   "The Proving Ground: the drill yard" on a local build (screenshot `c1-icons-pg-1440.png`). I did not run
   `npm run assets`, so it may be a local missing asset rather than a bug.

## Checks

- `npm test -w @phc/web`: 649 tests, all pass (647 + 2 skipped). `npx tsc --noEmit` in `apps/web`: clean.
- `apps/web/e2e/gear-icons.mjs`: 14 / 14.
- The regression run (`ground.mjs`, `creation-layout.mjs`, `pg-levelup.mjs`, `sandbox.mjs`, `tabs.mjs`,
  `two-players.mjs`, the engine tests and tsc, `tools/validate.py data`): see the commit that adds this note's
  "Regression" line.
- `tools/validate_art.py`: OK (2,789 checksums).

## Screenshots (`physical-2.0-shots/`)

`c1-icons-kit-1440.png`, `c1-icons-kit-1280.png`, `c1-icons-pg-1440.png`, `c1-icons-pg-1280.png`,
`c1-icons-sheet-gear-1440.png`, `c1-icons-sheet-gear-1280.png`, `c1-icons-backpack-1440.png`,
`c1-icons-backpack-1280.png`, `c1-icons-reload-1440.png`, `c1-icons-pile-hover-1440.png`, `c1-icons-pickup-1440.png`,
`c1-icons-pickup-1280.png`, `c1-focus-gloves-sheet.png`.

## Not tested

- Phone widths for the new icon rows (the e2e covers 1440 × 900 and 1280 × 720).
- A two-gun reload card in the browser (the code path is the same as the single-gun card; the e2e reloads one pistol).
