# Focus in hand: browser follow-up (hand-off)

Branch **`develop`**, on top of `1072de8` (fix/focus-in-hand: decision 103, spec items 630–635) and the Blessing 2.0
merge. The fix branch changed the engine only and never ran the browser suites; six e2e suites failed after the merge.
Nothing deployed. `packages/engine`, `data/` and the spec were not changed here: the rule is clear in items 630–635, and
everything below is web code or test setup.

## The failures: cause and fix

Every failing suite builds on the Proving Ground's Recruit, whose kit is the **soldier** kit: a two-handed Hellraiser
rifle. Under item 635 the magic kit can't put a focus in the off hand beside a 2H weapon, so it goes to the pack, and
under item 630 a focus in the pack casts nothing. The tests were written when a carried focus counted.

| Suite | Failure | Cause | Fix |
|---|---|---|---|
| classes-moves | False Image: Confirm disabled; the decoy isn't drawn; the guest doesn't see it; the fx list misses `image` | Trickster with the Sigil kit on the rifle: Evoker in the pack, so False Image says "Needs an Evoker in hand." (right) | **Test setup**: `withFocus(kind)` gives and equips a one-handed service pistol and empties the off hand before the kit, so the focus lands in the off hand (Trickster, Mage, Channeler) |
| classes-moves | (seen in the same run) the Channeler's panel reads Strain and MP | Emanator in the pack: the resources block hid MP | Fixed by `withFocus`, and by the code fix below (a carried Emanator keeps its MP row) |
| sandbox | a Sigil is drawn in the fight (FIRE at A5) | The kit on the rifle put the Evoker in the pack; giving the revolver later left it there; `combat/draw` refused | **Test setup**: after the revolver is equipped, the Gear tab's Pack button "Equip · off hand: Evoker" puts it in the off hand (the real UI). New checks: the kit line says `✓ Evoker (off hand)`; mid-fight, with the Evoker stowed, Draw a glyph carries "Needs an Evoker in hand."; the Utility tab's new **Hold the Evoker (off hand)** takes it back for 1 AP |
| sigil14 | in the fight with an Evoker: 6 words, 10 charge; then a timeout on the greyed FIRE key | Sigil kit on the rifle: Evoker in the pack | **Test setup**: a service pistol (give + equip) before the Sigil kit |
| heart | a glyph on your tile: Feed shows; Feed eats the glyph | The both kit on the rifle: no Evoker in hand, so the FIRE glyph for Feed was never drawn | **Test setup**: Part A's Soul caster takes the Emanator gauntlet (main hand, Will Power 3) before the both kit, so the kit's Evoker goes to the off hand and both foci are held, as the test meant |
| magic | the Soul section lists Red Hand with its MP bar; the sheet shows the MP the fight left (100) | Sigil student (pistol + Evoker in the off hand) loots an Emanator: the off hand is full, so it is carried. The MAGIC tab hid the MP bar and said "No Emanator carried" for a carried one | **Code fix** (item 630: carried, a focus keeps its store). The test now also checks the sheet says where each focus is |
| resources | area-map HUD: the resources block has EVOKER CHARGE | Both kit, then a 2H rifle equipped: the Evoker is stowed, and the HUD dropped its charge row | **Code fix**: the row stays, marked **STOWED**. New check for the STOWED chip |

## Code changes (web only)

- **`apps/web/src/game/resources.ts`**: Evoker charge, Flux and MP rows show for a focus that is held **or carried**
  (`carriesEvoker` / `carriesEmanator`); a carried one gets a white `STOWED` chip (caution) with a hint that starts
  "Needs an Evoker in hand." / "Needs an Emanator in hand." and says what still works (its charge, its MP).
- **`apps/web/src/game/commands.ts`**:
  - Sigil buttons (Draw a glyph, Evoke, Vent Flux, Swap core) carry `Needs an Evoker in hand.` as their reason when
    no Evoker is held (scuffing needs no focus). Syphon and Crystallise now show for a carried Emanator too, greyed with
    `Needs an Emanator in hand.` Begin an Outburst stays usable without one (item 631) and its text says it draws on
    the air.
  - New Utility actions **Hold the Evoker (off hand)** / **Hold the Emanator (off hand)**, 1 AP, for a focus that is
    only in the pack (`combat/swap` with `to: 'off'`, item 633). The text names what the off hand gives up; with a
    two-handed weapon they are greyed ("Your … fills both hands."). Before this there was no way in the UI to swap a
    focus in mid-fight.
- **`apps/web/src/screens/combat.js`**: the Hold actions confirm with no target (1 AP; a footer line; the panel goes
  back to Move after). The footer's action name no longer reads "undefined" for an action without a name.
- **`apps/web/src/screens/main.js`** (the sheet):
  - MAGIC tab: new stat lines **Evoker** and **Emanator** ("in your off hand", "in your main hand", "in the pack (not
    in hand)", "none"); the MP bar shows for a carried Emanator; the notes say "Needs an Evoker in hand. Yours is in
    the pack …" / "Needs an Emanator in hand. Yours is in the pack …" instead of "No … carried".
  - The header MP bar shows a carried Emanator's MP with "· in the pack".
  - GEAR tab: a hand holding a focus is tagged `OFF · EVOKER` / `MAIN · EMANATOR` and so on; a focus in the pack says
    "In the pack: it counts only in a hand (Off hand)." Its existing **Off hand** button moves it (buttons only).
- **`apps/web/src/game/sandbox.tsx`**: the Proving Ground's Gear tab says where each focus is (`✓ Evoker (off hand)`,
  `Emanator in the pack: not in hand`); the FOCI shortcuts offer "+ Evoker" only when none is carried.
- **`apps/web/src/narrator/context.ts`**: the Narrator's party block says "Evoker in the pack, not in hand" (and the
  Emanator's line) instead of "no Evoker carried"; live MP and charge show for a carried focus, marked "(in the pack)".

## Test changes

`apps/web/e2e/`: `classes-moves.mjs` (`withFocus`), `sandbox.mjs` (Pack button to the off hand; the stowed-Evoker
reason and Hold the Evoker in the fight), `sigil14.mjs` (pistol first), `heart.mjs` (Emanator gauntlet first),
`magic.mjs` (where each focus is), `resources.mjs` (STOWED). What each test checks is unchanged.

## Results

Build: `npm run build` (ok), dev server on 8787 (`wrangler dev`).

| Check | Result |
|---|---|
| e2e `classes-moves` | exit 0, 52 ok, 0 FAIL |
| e2e `sandbox` | exit 0, 27 ok, 0 FAIL (3 new checks) |
| e2e `magic` | exit 0, 46 ok, 0 FAIL (1 new check) |
| e2e `sigil14` | exit 0, 36 ok, 0 FAIL |
| e2e `heart` | exit 0, 25 ok, 0 FAIL |
| e2e `resources` | exit 0, 20 ok, 0 FAIL (1 new check) |
| e2e `faith` | exit 0, 29 ok |
| e2e `faith-pg` | first run 25 ok, 1 FAIL ("a kill while Witnessed: Old Overcast intervenes": the loop needs a kill within 14 tries, so it rides on the dice); two reruns exit 0, 26 / 26 ok. Not focus-related (no magic in that step) |
| e2e `classes` / `perks` / `tabs` / `combat-fixes` | exit 0: 34 / 27 / 28 / 9 ok, 0 FAIL |
| e2e `two-players` | exit 0 (this script logs; it has no ok/FAIL lines) |
| `npm test -w @phc/engine` | 59 files, 1447 passed, 1 skipped |
| `PHC_COVERAGE_STRICT=1 npm test -w @phc/engine` | 59 files, 1448 passed |
| `npm test -w @phc/web` | 40 files, 290 passed |
| `npx tsc --noEmit` in `packages/engine` and `apps/web` | 0 errors |
| `python3 tools/validate.py data` | 0 errors, 0 warnings |

Note: a WIP checkpoint of this work (`65aa85c`) was already committed and pushed to `origin/develop` mid-way; the final
commit adds the Hold-action footer fix, the sandbox UI checks and this file.

## Noticed, not fixed

- `equip()` (engine `character.ts`) puts **Fists** in the pack when a weapon goes into an empty main hand (the putBack of
  `fists`). Seen in the Proving Ground after Unequip then Equip: the pack lists "Fists". Harmless, but untidy.
- `unequip(c, 'off')` stores a focus back in the pack with kind `tool`, not `focus`.
