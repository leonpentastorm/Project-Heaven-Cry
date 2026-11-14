# Survival text pass (14 Nov 2026): written to the player

Leon, on a shop shelf headed "Every calibre" with the note "never sold out": "write to the PLAYER bruv not me". This
pass rewrote every string a player reads in Survival and the mode picker. The rules it followed are now in
`docs/design/ui-screens.md`, "Writing for the player". The Classes 3.0 system brief points at that section, so later
builders follow it.

About 175 strings changed and about 140 keeper lines were added. Nothing in the rules changed: no number, price or
legality moved. Two small additions to the view shapes support the new words:

- `RunOption.pays` is what a salvage pays you.
- `RunOption.costs` is a cost that isn't credits, such as a sparring's "40 HP". Both are shown where a price would be.

What the player sees that is new:

- **The keeper speaks as a tab opens.** Each place has data banks in `survival.json` faces `lines`, named after its
  tabs: `stock`, `gear`, `upgrade`, `sell`, `give`, `fit`, `train`, `shrine` and `trade`. The engine passes them
  through `faceTabLines` into `face.says`, and `useKeeperLine` in `FullScreenFrame.tsx` picks the line. After you take
  something at a place, the keeper says a `bought` line.
- **The shrine speaks as its patron's people do.** The shrine face now has `votaries`: a greet, bought and leave bank
  for each of the eight patrons.
- **Solo players have no Give tab**, in the shop or in any place.
- **"Boon room"** replaces "run power x of 50". It is shown as what is left: "Boon room: 30 left", "Uses 7 boon room ·
  43 left after".
- **A Forge card shows the saving**: "In your hand · 300 less than a shop". A shop's card no longer mentions the
  Forge.

## Inventory (old → new)

| Where | Old | New |
| --- | --- | --- |
| `data/survival.json` shop shelf | Every calibre (note: "never sold out") | Ammunition (no note) |
| `ShopScreen.tsx` shelf notes | what your squad carries, first · one of each; the first buyer takes it · back to full durability, priced by the wear; cheaper at a Forge · one grade step a visit, at the full price; cheaper at a Forge · a quarter of the price at its own grade | (none) · One of each · Back to full durability · One upgrade per visit · (none) |
| `PlaceScreen.tsx` group heads | The grade step / one a visit, cheaper than a shop's · Repair / …cheaper than a shop's · The Relic step / pick one named property: it stays on the weapon and counts on your cap · Mods and worn pieces / made for what the squad carries · Armour fitting / the next armour class, fitted to you · Training / what you learn here is yours for the run · The shrine / each of you takes one · Trades / one each, or walk on | Upgrade / One upgrade per visit · Repair / Back to full durability · Relic upgrade / Pick one property. It stays on the weapon. · Mods and armour / Made for what your squad carries · Armour fitting / Lets you wear heavier armour · Training · Blessings / Take one · Trades / One each, or walk on |
| `PlaceScreen.tsx` price foot | Free · COSTS THE NODE; "Worth N." line | Free (or the HP cost, or "+N CREDITS PAID TO YOU"); worth line gone (the card says the boon room it uses) |
| `PlaceScreen.tsx`, `RunScreen.tsx` | Run power 0 of 50 · RUN POWER 0 OF 50 | Boon room: 50 left (places); dropped from the map's choice panel |
| `FullScreenFrame.tsx` | tab label "LATER" · BROWSING · STILL BROWSING | (removed) · SHOPPING · STILL SHOPPING |
| `PathMap.tsx` legend and labels | walked · open now · junction: trails meet and part · ", reachable" · ", a junction" · ", a dead end" · "The camp. The stage starts here: every trail can be taken from it." | Walked · Open now · Fork · ", open now" · ", a fork" · ", off the trail" · "Camp. Every trail starts here." |
| `RunScreen.tsx` hint | Lit nodes are the ones you can reach. Hover a node for what it gives and costs. A trail runs on to the next junction: read ahead before you pick one. Click a lit node to go. / …a tie goes to the host. On a trail with one way on, a click walks the squad on. | Click a lit stop to go there. Hover any stop to see what it holds. / Click a lit stop. At a fork it marks your choice, and the squad goes when everyone has marked. Hover any stop to see what it holds. |
| `RunScreen.tsx` / `runView.ts` header, title, note | Node 3 of 15 · The start · 15 nodes to the Boss · Pick the next node · Pick the first node · FIGHT · NODE 3 OF 15 · "Kade stands up at 1 HP: the squad won." · GRADE STEP / THE RELIC STEP / THE ARMOURER'S STOCK / THE SHRINE · Carries: · free · AWAY? YOU MAY PICK FOR THEM | Stop 3 of 15 · At camp · 15 stops to the Boss · Choose your next stop · Choose your first stop · FIGHT · STOP 3 OF 15 · "Kade is back on their feet at 1 HP." · UPGRADE / RELIC UPGRADE / MODS AND ARMOUR / BLESSINGS · Boons: · Free · YOU MAY PICK FOR THEM |
| `runView.ts` hover card | "Fight · node 3 of 15. A junction: trails meet and part here. … Each of you: 120 XP and 100 credits." · "A dead end off the trail" · "Every trail meets here" | "Fight · stop 3 of 15. A fork: you may change trail here. … Pays each of you 120 XP and 100 credits." · "Off the trail" · (the Gate's own tip says it) |
| `data/survival.json` tips (13) | e.g. training: "A training ground: one big training each, a second for credits. Costs a node not spent fighting." · shrine: "…Costs a node not spent fighting." · rest: "…Costs a node not spent fighting or shopping." · forge: "A Forge: the grade step for less, the Relic step…" · vault_guard: "The trail forks: a guarded vault… it leads nowhere but to the vault, and back. Skip it if you like." | "A drill yard. One training each for free, a second for credits." · "A shrine. A rite, a piece of lore or a token from its patron." · "A rest. Everyone heals in full, and each of you may train once." · "A Forge. Upgrades and repairs, mods, armour pieces and armour fitting." · "A guarded vault, off the trail. A fight harder than an Elite's. Win it to open the vault, then come back to this trail. You may pass it by." |
| `data/survival.json` nodes (8) | e.g. shop: "A shop: every calibre always in stock, today's rolled gear, selling, and gives between players." · forge: "…One grade step each, cheaper than a shop's; the Relic step and its named property; mods and worn pieces made for what you carry…" | "A shop. Buy ammunition and gear, sell what you don't need, repair and upgrade." · "The armourer's Forge. Upgrade and repair a weapon, buy mods and armour pieces, get fitted for heavier armour." |
| `data/survival.json` trades (6) | "One grade step to Fine or Masterwork outside the visit's limit, for a cut of a shop's price…" · "…paid for in a share of the HP you have now." · "…it counts on your cap." · "…twice what a shop pays." | "Upgrade a weapon to Fine or Masterwork for {=cut_rate\|pct}% of a shop's price. It comes back worn." · "Drill with a weapon you carry. It costs {=hp_share\|pct}% of the HP you have now." · "A small blessing for the rest of the run, paid for in max HP." · "…for {=rate\|pct}% of its price." |
| `data/survival.json` boons | "(the ceiling holds)" · "(the most you hold still holds)" · "(inside the session's cap)" · "every node that pays" | "up to your most" · "up to your most" · "within the session's limit" · "every stop that pays" |
| `data/survival.json` setting | Daggerfall-type battlefield | The old battlefield |
| `data/modes.json`, `modes.ts`, `run/state.ts` | Coming after the advanced classes. · Coming when the campaigns are rewritten. · "X is not open yet. Coming later." · Only the host picks this. | Not open yet. · Not open yet. · "X is not open yet." · Only the host picks the mode. |
| `StageScreen.tsx` / `stageView.ts` | RUN POWER 0 of 50 · "7 of your 50 · 43 left after" / "No run power: it takes none of your 50" · "Placeholder: its own enemies…" (and "Still waiting for…" in the tile's card) · MARK A TILE: THE SQUAD GOES WHEN EVERYONE HAS; A TIE GOES TO THE HOST · Nodes / Grade steps · N nodes walked | BOON ROOM 50 LEFT · "Uses 7 boon room · 43 left after" / "Uses no boon room" · (not shown) · MARK A TILE. THE SQUAD GOES WHEN EVERYONE HAS · Stops / Upgrades · N stops walked |
| `GiveTab.tsx`, `give.ts` | "There is nobody to give to: Kade is alone. Gives are for a squad: credits and pack items handed to a friend at any safe node." · a plain give: it arrives at once, nobody is asked · NEVER GIVEN · Not given · "Trainings (drill, study, practice, Devotion)" · "…are never given." · "…past the run's cap (8 of 50 used)." · "Gives are made at a node with no fight (…)" | "No one to hand anything to." (and the tab is hidden solo) · It arrives at once. · YOURS TO KEEP · Yours to keep · "What you have learned (drill, study, practice, Devotion)" · "…can't be handed over." · "Ha has 2 boon room left; the rifle's Keen needs 10." · "Hand things over at a stop with no fight: a shop, a Forge, a drill yard…" |
| `credits.ts` `cantPay`, `run/shop.ts` `shortOf` | "Kade is short 74 credits (has 26, needs 100)." · "Short 74 credits." | "Kade is 74 credits short." (one wording for both) |
| `run/shop.ts` | One of a kind: buy it once. · The shop doesn't sell that. · Buy 1 to 10 at a time. · worth less than a credit here · Only the host closes the shop for everyone: mark Ready to leave. | There is only one of these. · This shop does not sell that. · You can buy 1 to 10 at a time. · is worth nothing here · Only the host can close the shop for everyone. Mark yourself ready to leave instead. |
| `run/progress.ts` refusals | "Stage 1 grades to Fine at most: Masterwork comes in a later stage." · "The Relic step opens in stage 3." · "The Relic step is the Forge's." · "One grade step a visit: Kade has had it here." · "…is graded as far as anyone sells: Celestial is never for sale." · "The X does not wear: there is nothing to repair." · "Study is for a Sigil user (Brain Power 1 or more)." · "Devotion is the shrine's, not the sergeant's." · "One offer at a shrine…" · "The shrine has no token for Kade: nothing in this tile's pool is small enough to fit the cap." · "Nothing here fits Kade's cap." · "…acts for Kade (or the host, for an away player)." | "Masterwork upgrades open in stage 2." (the stage read from data) · "Relic upgrades open in stage 3." · "Only a Forge makes a Relic." · "One upgrade per visit. Kade has had it here." · "…is as good as any armourer can make it." · "The X never wears out." · "Kade needs Brain Power 1 to study the Sigil words." · "Devotion is raised at a shrine, not here." · "One thing per shrine…" · "The shrine has no token Kade has boon room for." · "Kade has no boon room left for a graft." · "…chooses for Kade, or the host while they are away." |
| `run/progress.ts` options and log | "main hand" / "pack" · "· at a Forge: 1200" (on a shop card) · "The Relic step: X" · "X to Relic, Keen" · "Worth 10 of 50; 30 left." · "Fitted by the armourer." · "Drill toward the weapon's next mark." · "For the faithful." / "For the faithless: …" · "Kade drills with the X (+300, the training ground, 300 credits): drill 600" · "(10 of the run's 50)" in log lines | "In your hand" / "In your pack" · on a Forge card: "· 300 less than a shop" · "X: Relic upgrade" · "X: Relic, Keen" · "Uses 10 boon room; you have 30." · "The armourer fits you for heavier armour." · "Toward the X's next mark." · "For those with a patron." / "For an Atheist: …" · "Kade drills with the X: +300, 600 in all." · (dropped) |
| `run/power.ts`, `run/stage.ts` | "True Aim is worth 7 of the run's 50; Nine has 2 left." · "Pick your boons first: the next tile comes after them." | "Nine has 2 boon room left; True Aim needs 7." · "Pick your boon first. The next tile comes after." |
| `run/state.ts` | "You can't reach Shop at depth 3 from here: pick a lit node." · No such node on this map. · Take your picks first: … · Pick the next tile first: its map comes with it. · Survival is one character a player: … · Everyone plays: … · You retire after a Boss: beat this stage's Boss first. | "You can't reach that shop from here. Pick a lit stop." · There is no such stop on this map. · Take your pick first. … · Pick the next tile first. · In Survival each player brings one character. … · "Ha has no character locked in yet." · You can retire only after beating a stage's Boss. |
| `game.ts` run log | Pick the first node. · a fresh path · node 3 of 15 / nodes walked · Only the host sends the squad on… a node. · Mark a node first. · back on the road · "(or the host, for an away player)" | Choose your first stop. · a fresh map · stop 3 of 15 / stops walked · Only the host can send the squad on… a stop. · Mark a stop first. · back on the trail · ", or the host while they are away" |
| `placeview.ts` tabs | Upgrade · Mods and pieces · The shrine · (Give always) | Repair and upgrade · Mods and armour · Blessings · (Give only with someone to give to) |
| `ShopScreen.tsx` misc. | THE RARER PIECE · "your door" · "your weapon" · Hover or focus a card to set it against what you hold. · "…: nothing you hold takes its place; it goes in the pack." · over the limit · Everyone goes back to the map. | RARE · yours · in your hand · Hover a card to compare it with what you hold. · "X goes in your pack. It replaces nothing you hold." · 2.1 kg over · Takes everyone back to the map. |
| `UpgradeCard.tsx` | ✓ You can take this step | ✓ You can upgrade it |
| Combat (Classes 3.0, light sweep): `actionPickers.ts` Field Fix | "A robot, drone, turret, Factory Made squadmate or Figment repaired (rules 1.34: the Field Repair amount, no part)." | "Repair a robot, drone, turret, Factory Made squadmate or Figment by a Field Repair (no spare parts)." |

The rest of the combat screen's Classes 3.0 text was read and left as it was: the Bond strip and its tip, the Ledger
bar, the SHADOW · UNSEEN, TEND · BONDS AND CARE and FIGMENTS · PICTURED groups, and the Attuner quiet lines. They
already speak to the player.

## Left as it was, and why

- **"Seed PHC-…"** on the run header. Players share seeds; it is a word the summary and Report a run use too.
- **The locked mode cards still say "Coming".** That is a status a player understands. Leon's lobby sketch keeps the
  three cards, so the reason is now only "Not open yet."
- **The map's kind words** ("Training", "Crossroads", "Vault guard") are data (`map.words`) and were kept.
- **Report a run's JSON file** is not a screen, and its field names were not touched.
- **Code comments and the `about` fields in data** are written to builders and keep the builders' words.

## Proof

- `survival`: 104 checks, green on port 9061. Its checks now read the data's words:
  - `tips.vault_guard`
  - a face's `lines.gear` (the keeper speaks as Today's gear opens)
  - `modes.json` `coming`
  - the engine's refusal shape
- `room`, `kit-map` and `smoke`: green.
- Engine `survival-*` unit tests and the web unit tests: updated to the new words.
- Validator: 0 errors.
- Screenshots at 1280 (DSF 2) are in the session scratchpad, under `text-pass/`.
