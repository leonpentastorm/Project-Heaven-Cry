# Survival, build step 4: prices, the shop, the faces, the gear preview (hand-off, 13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4) rules 11, 25 to 27, sections 3.4, 4.2 items 4 and 14, 8.2 (the path
map) and 8.3, section 10 step 4. Rules: `docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.42**, items **2900 to 2918**
(every number PROVISIONAL). Branch: this worktree's, from `claude/charming-gauss-hbq4n0` at 3a7cb76d. No version bump;
nothing deployed. Build step 4a (the grade step, the Forge's rules, training ground, shrine, Crossroads, the focus's
rarity on its door) is another builder's; this step leaves its seams (section 4).

## 1. What was built

| Piece | Where |
| --- | --- |
| `priceOf(id, rarity, mods)`: one door for every price; rounds (`rounds:<calibre>`), full magazines (`mag:<weapon>`), special rounds (`price_mult` x the reference calibre), fitted mods added; `ROUND_PRICE`, `emptyMagPrice` | `packages/engine/src/credits.ts` |
| The magazine price table and the special rounds' reference calibre (the Core Rules' numbers) | `data/rules.json weapons_rules.magazine_prices`, `.special_round_price` |
| The gear preview: `gearPreview(c, inst)` (a scratch fight of two from the fight's own unit build and `previewAttack`: to hit, damage per hit, AP of each mode, magazine, range, traits; a focus's door; armour's Defense, armour, injury resistance; ammunition and items), `compareGear`, `heldAgainst`, `rarityWord`, `rarityMarks`; the reference foe in data | `packages/engine/src/gearpreview.ts`, `data/rules.json gear_preview` |
| The shop's half of the reducer: `openShop`, `rollStock`, `counterLines`, `linePrice`, `buyProblem` / `buy`, `sellProblem` / `sell`, `sellValue`, `restockRoom`, `leaveShop`, `shortOf`; the faces (`FACES`, `faceFor`); the services registry (`registerShopService`, `shopServices`) | `packages/engine/src/run/shop.ts` (new) |
| What the screen draws: `shopView(g, me)` (face, shelves, today's gear, services, sell rows with their asks, purse, hands, pack, carry, party marks, log), each card's numbers from `gearPreview`, its per-quantity totals and reasons from `buyProblem` | `packages/engine/src/run/shopview.ts` (new) |
| `run/buy`, `run/sell`, `run/restock`, `run/leave`; a shop node opens the shop (no node card); the run phase `shop` | `game.ts` (`runAction`, `runEnter`), `run/state.ts` |
| Data: `shop` (the counter's shelves and `per`, `max_qty`, the rolled stock, `restock_price`), `sell_rate`, `faces` (ten: six shopkeepers, armourer, sergeant, medic, patron; names, roles, art ids pending, fallbacks, bias, price, lines); the shop node's panel and hover texts | `data/survival.json` |
| Validator: every always-stocked id priced through the doors; every calibre sold; the shelves present; no mod or armour in the shop's rolled categories; magazine table shape; every face's portrait and backdrop a catalog id or `*_pending`, its fallback a world-pool portrait, its backdrop fallback an illustration, its settings real, all seven kinds of line; every setting has a shopkeeper | `tools/validate.py` |
| The full-screen frame (reusable: the Forge uses it): backdrop under a dark gradient, the keeper (portrait, name in Spectral, role in Chakra Petch caps, the speech card as a polite live region, the line typing in, reduced motion fades), party strip with READY marks, "Leave the shop" / "Ready to leave" and the host's "Close for everyone", the tabs (a `tablist`, arrow keys), the purse with its floating change, the centre and side columns scrolling on their own, the visit's log | `apps/web/src/game/FullScreenFrame.tsx` (new) |
| The shop screen: tabs Always in stock (headed shelves: For your guns first, Every calibre, Special rounds, Thrown, Cores, Field supplies, Restock), Today's gear (the rarer piece a size larger), Upgrade (the services seam), Sell (a graded item asks once), Give (shown, locked until 4b); large cards (painted gear icon, name, grade word and ornament marks, what it is for with the door's attribute ink on the door word only, the preview's numbers, price, the `‹ n ›` stepper, the reason it can't be bought, "Sold to <name>"); You: hands and worn, the compare panel (holding against this, a word and a glyph per row), the pack with weights and the carry bar | `apps/web/src/game/ShopScreen.tsx` (new) |
| The path map polished: an even grid (depth columns evenly across the width; a depth's nodes on one row pitch, centred, in map order), labels on a backplate the links pass under and sized to the column step, the route walked solid, reachable nodes lit and pulsing (reduced motion: still), walked nodes dimmed and passed ones faint, a legend of the ten kinds above the map, the screen fitted to the window | `apps/web/src/game/RunScreen.tsx` |
| The reward pick shows the gear preview's numbers (to hit, damage, AP; a focus's door) | `apps/web/src/game/runView.ts` |
| Fixed on the way (rules 1.41's pick): a picked blade or thrown weapon took "a magazine's worth" and gave a stray plot item named after it (`magazineWorth`) | `run/rewards.ts` |
| Test hook `__phc.gearPreview(charId, inst)` (the suite checks a card against it) | `apps/web/src/game/store.ts` |

## 2. Built from

| Rule | Primitive |
| --- | --- |
| Prices (27) | `price_credits`, `rules.json rarity.<r>.price` (`RARITY`), the calibre table `weapons_rules.calibres`; one door: `priceOf` |
| Paying and earning (2, 25, 27) | `payCredits` (its refusal), `earnCredits`, `creditsOf` (rules 1.41's purse) |
| The goods into the pack | `lootToPack`, `roundsOf`, `packAdd`, `intoCounts` (stims, Essence), `pickedItem` (a focus as a focus, rarity kept) |
| The guns shelf | `gunsOf` (rules 1.41's ammunition pack) |
| Restock | `classResources` (`persist`), `c.res` |
| The rolled stock (25, 26) | `rngFor` (a named stream), `rollTable` (the loot roller's weighted pick), `priceBand`, `cappedRarity` (rules 1.41's pick) |
| Leaving together (11) | `g.run.ready` by player id (the Proving Ground's READY pattern), the host check |
| The gear preview (item 14) | `unitFromCharacter`, `unitFromEnemy` (the reference foe at the holder's level), `previewAttack` (`free: true`), `priced` (the one cost door) for the AP, `attackApCost`, `volleyBaseAp`, `effectiveRange`, `magazineSize`, `layoutMap` |
| Face art | `art/catalog.json` ids (characters, illustrations), the built web assets (`char-<id>`, `ill-<id>`) |
| The hover card, icons | `tipProps` (the one hover card), `gearIconUri` / `roundsGearId` / `magGearId` (the painted gear icons) |

**New primitives** (each general): `priceOf`'s counter shapes and mods (spec item 4's second half), `gearPreview` /
`compareGear` (spec item 14: the backpack screen and loot piles can use it), `registerShopService` (a services
registry for any safe node), `FullScreenFrame` (the client's frame for any full-screen safe node).
`npm run built-from -- 3a7cb76d..HEAD`: **no smells**.

## 3. The seams for build step 4a

- **Services (the grade step):** register once at load, from the module that owns `run/upgrade`:
  ```ts
  registerShopService({ id: 'grade', tab: 'upgrade', kinds: ['shop', 'forge'],
    cards: (g, c, shop) => [{ key, title, id, rarity, price, why, note, lines: [{ label, before, after }], action: { type: 'run/upgrade', charId: c.id, ... } }] });
  ```
  `shop.kind` says whether it is a shop (full price) or a Forge (x `forge.rate`). The Upgrade tab draws the cards
  (title, the lines "before → after", the price, the engine's `why`, a "Take it" button that sends `action` as is);
  `lines` should come from `compareGear(c, {id, rarity: next})` so the client builds no number. With nothing
  registered the tab says the step opens with the next build.
- **The Forge:** open it with the same state (`g.run.shop` with `kind: 'forge'`, `g.run.state` `shop`; `faceFor('forge',
  setting)` is the armourer) and draw it with `FullScreenFrame` and its own tabs (Upgrade, Mods and pieces, Armour
  fitting, Give). `run/leave` and the ready marks already work for any `kind`. `shopView` reads `sh.kind` for the
  services; the counter and Sell are the shop's, so a Forge view should pass its own tabs (or `shopView` grows a
  `kind` branch).
- **Gives (4b):** the Give tab is in the tab list, locked with its reason; the faces' `gave` lines exist.

## 4. How to add

- **A shop item on the counter:** give it a price (`price_credits` in `items.json` or `weapons.json`, or a
  `price_mult`, or a calibre's `price_credits`), then one entry `{ "id": ..., "per": n }` on a shelf of
  `survival.json shop.always`; `python3 tools/validate.py data` (it refuses an unpriced id). A new shelf: a row with
  its `shelf` id and `name`; the screen draws shelves in data order.
- **A face:** one row in `survival.json faces.items` (id, name, role, node, settings, portrait and backdrop ids with
  `*_pending: true` until the art is catalogued, a world-pool `fallback`, an optional `backdrop_fallback`
  illustration, `bias` by tag, `price`, the seven kinds of line, `provisional`); a new setting needs a shopkeeper (the
  validator says so). When the art lands: catalogue it, `npm run assets`, drop the `*_pending` flag.

## 5. Proof

- Engine: `test/survival-shop.test.ts` (10 tests: the shop opens with its face and stock; the stock is the seed's,
  capped at Fine in stage 1 and Masterwork in stage 2 over 500 seeds, priced at the face's price; the counter holds
  all twelve calibres and the always list, each priced, the guns shelf for the gun carried, the magazine and special
  round prices; buying ammunition (exact price, the buyer's pack only, a stim into its count); buying a rolled piece
  and "Sold to <name>."; every refusal in words (short, quantity, not yours, not sold here, no such character, one of
  a kind, no shop, no restock); selling at 25% with the mods, a plot item refused, a stack by quantity; leaving by
  everyone's ready and by the host's close, a guest's close refused; the services registry; the gear preview: a Fine
  weapon one point (5%) more likely to hit, compare reads "better", the character unchanged); `test/survival-run.test.ts`
  (the panel loop drops the shop; the walker leaves a shop).
- Validator: 0 errors; mutation-checked (an unsold calibre, a portrait neither catalogued nor pending, an unknown
  fallback each give their error).
- Browser, port 8961, `FAST=1`: **`survival` 31 of 31** (new: the shop full screen at 1280 and 1920, the Give tab
  locked, all twelve calibres, nothing clipped or overlapping at either size, rifle rounds bought at the card's price,
  a gear card's to-hit and damage equal to `__phc.gearPreview`, the compare panel on hover, "Short N credits." on the
  card and as the refusal, a sale at the row's price, a rolled weapon bought and marked "Sold to", leaving); **`room`
  25 of 25**.
- `npm run check`: **ALL GREEN** (engine 4136 passed, web 1198 passed). The first full run failed one web guard
  (`e2e-groups.test.ts`: the suite's new waits were 15 s; a failing wait must be 30 s); fixed, `npm run check -- web`
  green alone, then the whole check green again. Nothing else was re-run alone.
- **Flaky, not new:** one of five `survival` runs failed at step 3's hand-fought node 1 ("Lost in 48 rounds"): the
  fight's dice follow the room's code, and the suite's Shot loop does not always land its clicks on a loaded machine.
  The two runs after it were 31 of 31. A fix (a `run/skip` fallback when node 1 is lost, or a fixed room code) is
  step 10's suite work.
- Screenshots (deviceScaleFactor 2), in the session scratchpad `shots4/`: `survival-shop-1280.png`,
  `survival-shop-gear-1280.png`, `survival-shop-1920.png`, `survival-shop-gear-1920.png`, `survival-path-map.png`
  (after; before: `shots/survival-path-map.png` from step 3), `survival-path-map-1920.png`, `survival-reward-pick.png`.

## 6. Open items

- **Throwing knives** are the `throwing_knives` light melee weapon; there is no thrown-category knife in data.
- **A focus's card** shows its door and the door skill's modifier; the rarity's accuracy on the door (rule 25a) waits
  for step 4a's reading, then the preview should show it.
- **The hover card on the path map** goes beside the node by the one card's own rule (left, else right); in the dense
  middle of a map it can still sit over other nodes. Changing it is the shared card's placement, not this screen's.
- **Co-op shop** is unit-tested (shared stock, ready marks, the host's close); the two-browser check ("Sold to"
  appearing on the other screen, a give arriving) is build step 10's.
- **Start kits** (rule 28: three spare magazines, `rigger` and `mender` kits) are still as creation gives them.
- The face's line is typed in by a CSS reveal, not letter by letter; any key or click does not skip it (it is short).

## 7. Calls made for Leon (each reversible)

1. **The calibre round prices are the Core Rules' table** already in data (item 2901), not the spec's section 7
   proposal (.700 15, rocket 200, fuel canister 40, core charge 20, arrow 2, bolt 3).
2. **A full magazine is the Core Rules' empty magazine plus its rounds** (item 2902), not "its rounds + 10".
3. **Special rounds are priced on a rifle round** (item 2903): armour-piercing 6, hollow-point 4, incendiary 6.
4. **A sale counts the fitted mods at their own price** (item 2912; the spec's example 675 left them out).
5. **Only a character's own player buys for it** (item 2910; the host may not spend an away player's purse).
6. **The faces' names** (item 2914) and their lines are Suggested; the fallback portraits are picks from the world
   pool by the skill each embodies (Proficiency for the quartermaster, Implication for the dealer, and so on).
7. **The AHOC and works shops draw an M813 illustration** (the outpost hangar, the rear pad) as the backdrop until
   their own land; the other shops the ground colour.
