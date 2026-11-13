# Survival step 4b: the shop and in-run progression joined, every safe node full screen, gives (rules 1.46)

PART A GREEN at cd990ab2 (the merge of step 4, the shop, into step 4a): validator 0 errors, both `npx tsc --noEmit`,
the pins (golden, replay-hash, lint, balance-contract: 23 files, 127 tests), survival-shop, survival-progress,
survival-run (45 passed), `npm run built-from` no smells.

Then step 5 (stages, boons, the next tile; rules 1.44) was merged in at the coordinator's word, and part B built on the
tree holding steps 4, 4a, 5 and 4b. Nothing deployed, no version bump.

## The merges

- **Step 4 into 4a** (ten conflicts): `data/survival.json` keeps both sides' keys (the shop's node and tip words now
  that it opens; 4a's Forge, training, shrine and crossroads words); the reducer has `run/buy`, `run/sell`,
  `run/restock`, `run/leave` beside 4a's `ProgressAction`; the validator both rule blocks; the Core Rules 1.42 then
  1.43 and items 2900s then 3000s; the survival suite one walk (the shop added to the route's wanted kinds). One real
  join: **a shop opens a 4a visit too** (`game.ts runEnter`) and `progress.ts here()` accepts the `shop` state, so the
  grade step's one-a-visit count holds in the shop. The engine catalogue regenerated.
- **Step 5 in** (five conflicts): the run's phases keep `shop` beside `boon` and `tile`; the run screen returns the
  shop, then step 5's StageScreen; ART-REQUESTS rows renumbered (S4 the shop's faces; S5 boons, S6 tile backdrops, S7
  Boss portraits; step 5's hand-off points at the new numbers). Step 5's stage-2 walk in the suite now leaves a shop on
  its way (`run/leave`): step 5 was built without the shop.

## Built (rules 1.46, items 3300 to 3312)

1. **Gives** (`packages/engine/src/give.ts`): `gear/give` takes credits (`credits`) or any pack entry (`idx`, `qty`),
   no confirm; the log line `A GIVE`, the shop's or the visit's log, the keeper's `gave` line. `giveProblem` is the one
   predicate (the spec's `canGive`): where (`survival.json give.where` and `at_start` in a run, out of a fight in a
   campaign), and the refusals in words (fight, fight node, boon/token/graft, training, armour class, the receiver's
   cap, the purse, not yours, solo). Entries arrive whole: `packAdd` merges only what a pickup merges. `giveView` is the
   Give tab's data (each line with its reason per receiver; held items with "Put in the pack and give").
2. **The shop's Upgrade tab** is 4a's grade step through the services seam: `progress.ts gradeCards`, registered with
   `registerShopService`, its action `run/upgrade {place: 'shop'}`; the card shows only the numbers that change.
3. **A focus's grade on its card:** `gearpreview.ts` line `door_acc`, read through `focusAccTerm` on a scratch copy.
4. **Every safe node full screen:** `run/placeview.ts placeView` (face, tabs, cards from `runOptions`, the visit's log
   `RunVisit.log`), `apps/web/src/game/PlaceScreen.tsx` in `FullScreenFrame` (new props `hideClose`, `marks`,
   `emptyLog`); `UpgradeCard.tsx` shared by the shop and the Forge; `GiveTab.tsx` on every place and the shop. A new
   face `broker` (Teo Vant, Suggested) for the crossroads. The frame closes per screen ("To the path map"); the map's
   panel has "Back to the <place>".
5. **Faults fixed:** the red "No fight is under way." toast over the shop was the suite's own deliberate refusal
   check, still on screen when the shop opened: the suite now waits for it to go (and for the short-purse toast before
   the next shots); the shelves keep 56 px of room under the last row and a fade, and the suite scrolls to every Buy
   button and checks it sits above the visit's strip; the path map's hover card avoids the reachable nodes
   (`placeTip(..., avoid)`, the map's `data-tip-avoid`), tested in `actionTip.test.ts` and the suite; node 1's shots are
   pinned to an 18 (as `chaplain.mjs`), so it cannot lose.
6. **The receiver sees a give:** a toast in the engine's words on the receiver's screen (`RunScreen.tsx useGiveToast`),
   the purse float, the visit's log on both screens.

## Built from

| Rule | Primitive |
| --- | --- |
| Credits move | `credits.ts payCredits`, `earnCredits`, `creditsOf` |
| A pack entry moves whole | `containers.ts packAdd` (the pickup's merge), `packOf` |
| Held items given | `gear/unequip` (`character.ts unequip`) first |
| The receiver's cap | `run/power.ts runWorth`, `worthOf`, `BOON_CAP` |
| The shop's grade step | `run/progress.ts runOptions`, `upgradeProblem`, `run/upgrade`; `run/shop.ts registerShopService` |
| Before/after numbers | `gearpreview.ts gearPreview` |
| A focus's grade | `rolls.ts focusAccTerm` |
| The places' options | `runOptions` (rules 1.43), `faceFor` (rules 1.42) |
| The frame | `FullScreenFrame.tsx` (rules 1.42) |
| The log | `push` (game.ts), `shopSays` (the shop's `sayLine`/`logLine`), `RunVisit.log` |

**Needs a new primitive:** item 13 only (`giveProblem` / `giveNow`), as the spec listed. Nothing else is new: the place
view only reads.

## How to add a safe node screen

1. Give the node kind its options in `progress.ts runOptions` (each with `group`, `price`, `why`, `action`).
2. Add its tabs to `TABS` in `run/placeview.ts` (a tab names the option groups it holds; Give is appended).
3. Give it a face in `data/survival.json faces` (`node` = the kind; portrait and backdrop catalog ids or `*_pending`
   with a fallback); the validator refuses a safe kind with no face. List the art in `art/briefs/ART-REQUESTS.md` S4.
4. Add a heading for any new group in `PlaceScreen.tsx HEAD`. Nothing else: RunScreen opens it when `placeOpen`.

## Proof

- Engine: `test/survival-give.test.ts` (9: credits, a Relic weapon with two mods arriving whole beside the receiver's
  own, stacks, every refusal, the Give tab's view, the shop's log and line, the Upgrade card at full price and one a
  visit, the focus's `door_acc`, the places' faces and tabs, the visit log).
- Browser (own server, port 8963, `FAST=1 DSF=2`): `survival` 69 ok (A: the walk with every place full screen and
  checked at 1280 and 1920, the shop upgrade, the solo Give tab; step 5's boon, tile, stage 2, summary; C: two browsers,
  credits and a graded weapon seen arriving, ready and the host's close), `room` 25 ok.
- `npm run check` ALL GREEN at the end (see the final report for the commit).
- Screenshots: the session scratchpad `shots4b/` (survival-shop-upgrade, survival-place-forge, -training, -shrine,
  -event, -rest, survival-shop-give, each at 1280 and 1920).

## Open items

1. The Relic step's cards show the three properties offered (rules 1.43 rule 38, `relic_offer` 3), not all seven; the
   stage 1 walk never reaches it (stage 3), so no browser check sees it yet.
2. A cache is not a place (item 3311): its pick stays on the map's panel.
3. Step 5's StageScreen (boon, tile, summary) is its own full-screen design, not this frame; left as it is.
4. A give's toast primes on the first run screen after a page load: gives made while a page was closed are not toasted.
5. The suite's test purse and the C section's graded rifle are written into the host's state directly (as the
   chaplain suite pins dice); the gives themselves go through the reducer.

## Calls made for Leon (reverse any)

1. Campaign gives are widened too (any pack entry or credits out of a fight), as the spec's primitive 13 says.
2. No give at a fight node after its fight (rule 47's "every node with no fight" read strictly); allowed before the
   first node.
3. Only a character's own player gives (the host does not give for an away player).
4. The crossroads gets a face (Teo Vant, Suggested; stand-in portrait `veyra-salt`).
5. Walking out of a place is per screen, not an action (no Ready mark at a Forge or a training ground).
