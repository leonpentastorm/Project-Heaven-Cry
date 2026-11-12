# Client boundary 3: action descriptors and one action flow (engine review 4, finding 3)

12 Nov 2026. Wave 3, piece 3 of [the foundation plan](../proposals/2026-11-engine-review/PLAN.md). No rule changed.
`npm run check` ALL GREEN (engine 3,680, web 1,020), validator 0 errors, engine pins (golden, replay-hash, lint) green.

**The rule this piece builds:** the engine describes every action a unit can take (its id, tab, name, cost, whether it
can be used and why not, what must be picked, which switches ride it) and answers what it would do with the picks so
far. The client renders those descriptors and walks their picks with **one** flow. A screen never builds an action, a
cost, a legality check or a target list. Adding an action, or a whole system of actions, needs no client change
unless it wants a bespoke panel.

## 1. The engine side (`packages/engine/src/descriptors.ts`)

```ts
actionsFor(g, unitId, viewer?): ActionDescriptor[]                 // every action now, in tab order (GROUP_ORDER)
previewDescriptor(g, unitId, id, picks, viewer?): DescriptorPreview  // the next pick, the verdict, cost, lines, marks
sendDescriptor(g, unitId, id, picks, viewer?): Action | null        // what Confirm dispatches (null: a pick is missing)
registerActions(system: ActionSystem): () => void                    // a new system's actions, on every screen
nextStep(d, picks, { required? }), stepOn(step, picks)               // which step comes next; whether a step applies
```

(`previewAction(g, action, by)` in `preview.ts` was already the reducer's dry run of a finished action, so the
descriptor preview is named `previewDescriptor`; it calls `previewAction` itself once every required pick is made.)

```ts
interface ActionDescriptor {
  id: string;              // the id the screens and the turn card always used: 'shove', 'tq:main:cut', 'cl:call.order',
                           // 'pr:hymn:x.y', 'pk:<item>#<action>', 'draw', 'outburst'… (saved picks and hotkeys keep working)
  group: 'move' | 'attack' | 'utility' | 'perks' | 'class' | 'sigils' | 'outbursts' | 'faith' | 'calls';
  parent?: string;         // a child row: a technique inside its weapon's pad ('tpad:main'), a Watch in 'twatch'
  name: string; text: string;
  cost: { ap: number; text: string; res?: Record<string, number> };   // from the system's own pricing (effects/cost.ts)
  available: boolean; why: string | null;                              // the engine's refusal sentence
  picks: PickStep[];       // in order
  toggleOn: string | null; // the reducer type whose switches (Ricochet, Heart Surge…) ride it
  preview: 'basic' | 'attack' | 'technique' | 'call' | 'prayer' | 'perk' | 'sigil' | 'outburst' | 'none' | string;
  hidden?: boolean; pad?: boolean; engine?: boolean;
}
interface PickStep {
  key: string;             // the picks field it fills: targetId, targetId2, allyId, tile, opt, line, word, design…
  kind: 'enemy' | 'ally' | 'unit' | 'tile' | 'option' | 'custom';
  prompt: string; optional?: boolean;
  choices?: string[];      // legal unit ids or tiles now, fogged for the viewer (absent: any; a Move's are worked out
                           // by previewDescriptor when the step comes up, from moveOptions)
  options?: { id; label; text?; why? }[]; max?: number;   // an option step (Order's things: max 2 at step 3)
  renderer?: string;       // a custom step's bespoke panel: 'perk-form', 'pile', 'glyph-keyboard', 'stroke', 'evoke',
                           // 'design-cards', 'heart'
  auto?: boolean;          // send as soon as it is picked (a Move's tile, a glyph's tile)
  when?: { key; is?; has?; not? };   // applies only when another pick has this value (Order's tile: opt has 'move')
}
interface DescriptorPreview {
  id; ok; why; ask: string | null; next: PickStep | null;   // the next pick, with its choices worked out
  ap: number; cost: string;                                  // after the picks, the items and anything lent
  lines: { k: 'odds' | 'note' | 'meter' | 'save' | 'cost' | 'ask'; text: string }[];
  marks: { units: { id; tag; tone }[]; tiles: { tile; kind: 'area' | 'pick' | 'choice' | 'reach'; band? }[] };  // fogged
  toggles: ToggleEntry[];  // the switches with their state (picks.mods: the player's ids and '!id' offs)
  rolls?: { unit; pv }[];  // each roll's own to-hit preview (the target card prints its terms)
  action: Action | null;   // what Confirm sends: only when the reducer's dry run says yes
}
```

**What each system wraps** (no rule is worked out again): basic and weapon rows → `basicActions`, `weaponActions`,
`moveOptions`, `previewAttack`; techniques → `techniquePad`, `packPad`, `pairedPad`, `previewTechnique` (fogged with
`previewSeenBy`), `reachTiles`; perks, traits and class moves → `perkActionsFor`, `previewPerkAction`; Calls →
`callPad`, `previewCall`; prayers → `faithView`, `previewPrayer`; Sigils → `previewDraw` and the Evoke planner's payload;
Outbursts → `previewOutburst`, `previewOutburstPlan`, `previewPump`, `dryRun` of the heart's moves. Every verdict is then
`previewAction` through the reducer. The switches (`mods`) the action carries are resolved by the engine from
`togglesFor` and the player's choices, so no screen works out `mods` either.

Moved into the engine on the way (they were rule copies in the client): the list rows' texts (the old attack rows, the
reload rows, the magic rows), `TECH_OPTIONS` / `techOpt` (a technique's options), `ORDER_THINGS` / `orderMax`,
`oddsPct` / `prayOdds`, `perkCost` / `perkState` / `perkText`, the id helpers (`techId`, `parseTechId`, `prayId`,
`parsePrayId`, `perkId`, `parsePerkId`), a technique's red area (Lunge's step, Charge's run, a shield's Bash), the
"Confirm to …" line of each basic action, a Call's reach, a place prayer's tiles in sight.

**Proof every action is reachable:** `packages/engine/test/descriptors.test.ts` lists the descriptors for 12 reference
builds and states (gunner, fencer, Sigilist, Emanator before and while holding, Faithful, voice, Defender and Bard class
moves, a jammed gun, two pistols, a unit with a medic ally) and sends every legal one through `sendDescriptor`,
comparing the game (whole, serialised) with dispatching the action the old `confirm()` built (a copy of it is in the
test); both refuse with the same words or leave the same game. Custom-pick actions (Evoke) are covered by their panel's
own tests.

## 2. The client side: one flow (`apps/web/src/game/actionFlow.ts`)

```ts
flowView(g, me, cur, S, extra?): FlowView | null
  // .d, .pv, .picks, .cost, .sel { name, text, extra }, .chips (option steps), .ring / .area / .targets / .reach,
  // .click(unit, tile) → state patch | null, .action (Confirm), .after, .peek(unitId), .peekWith(picks)
descriptorsOf(g, unitId, me)   // actionsFor once per game state
FLOW_PREVIEWS                  // the systems on the flow
```

Where a pick lives in the screen's state: a unit in `S.target` (`S.target2` for a second one), a tile in `S.tile`, every
other pick in `S.picks[key]` (tagged with the descriptor's id). A bespoke panel passes what it picked as `extra` (the
pile checklist's `take`, a perk's `form`, the glyph keyboard's `word` and `stroke`, the Evoke planner's `evoke`, the design
card's `design` / `mode` / `aim`). Engine previews are cached per game state, so a mouse move costs nothing.

`commands.ts` `actionGroups()` is now `descriptorGroups()`: the tabs and rows are the descriptors (plus the Perks tab's
read-only rows from `perkShelves`). The two-key hotkeys (tab digit + action digit) read the same list, so they follow
the descriptor order. In `combat.js`: the cost is `flow.cost`, the panel's name/text/extra are `flow.sel`, the option
chips are `flow.chips`, the grid marks come from the flow, a grid click goes to `flow.click` first, Confirm is
`act(flow.action)`, and `cantConfirm` is `!flow.ready`.

## 3. Which systems are on the flow

| System | On the flow | Bespoke panel kept (fills a custom pick) |
| --- | --- | --- |
| Basic and weapon actions | yes (Move: its click sends the descriptor's action; its hover route and range stay the screen's, from `moveOptions`) | the pile checklist (Pick up) |
| Perks, traits, class moves | yes | the move's form (`actionPickers.ts`) |
| Calls | yes | the Calls tab's chip look (`callChips`) |
| Prayers | yes | none |
| Weapon techniques | yes | the technique pad (opens a weapon's chips) |
| Outbursts | yes: ids, costs, legality, Confirm, every heart move | the design cards, the HEART panel, the aim overlay and their words |
| Sigils | yes: ids, costs, legality, Confirm, Draw's click | the glyph keyboard, the stroke picker, the Evoke planner and their words |

Not on it: **reading a glyph with Analyze** (`combat/read`, its own path), **the backpack's gear actions** and a cache's
**Search**, **the story / area-map screen (`main.js`)**: its world actions, move plan and pickers are untouched (the
descriptors are for a fight; the area map's world/act perks and moves would be the next system).

## 4. What was deleted

Client source (tests aside), from the start of this piece: **571 lines deleted, 309 added** (131 of them the new
`actionFlow.ts`); `combat.js` 215,313 → 192,691 bytes, `commands.ts` 40,269 → 25,647 bytes.

- `combat.js`: the 25 basic Confirm branches and every per-system Confirm branch (techniques, Calls, prayers, perks,
  magic): `confirm()` is the flow's action plus reading a glyph. Every `act({ type: 'combat/…' })` literal for a list
  action (the heart's moves, the Begin button, the draw click, a Move). The cost chain (`waCost`, `basicCost`,
  `pairedAp`, `attackApCost`, `magicCost`, the technique, Call, prayer and perk terms). The 2,700-character panel-text
  line's per-action texts, the reload overrides, the technique, Call and perk panel blocks, `TECH_OPTS` / line / Order
  chip code, `magicCant` and the 40-term `cantConfirm`. The Call block (`cId` … `this._call`), the technique block
  (`tChip` … `tPvShown`, `this._tech`), the perk preview (`pkArgs`, `pkPv`), `prayerView`, the simple spells' dry runs,
  the red area's Lunge/Charge rule copies, the click branches for stim, cover, door, friendly fire, Calls, techniques,
  prayers and the perk's primary target.
- `commands.ts`: the hand-built rows (and their legacy attack texts, the magic rows, `prayerItems`, `rowItem`,
  `withBoth`); the perk and prayer helpers are the engine's.
- `callView.ts`: `callTile`, `callTakes`, `callPrompt`, `callPreviewOf`, `callLines`, `callReach`, the Order helpers,
  `callItems`. `techView.ts`: `techPreview`, `previewLines`, `techPrompt`, `needsEnemy`, `needsTile`, `aimOf` (its
  `TECH_OPTS` / `techOptOf` / `parseTech` are the engine's). `faithCombat.js`: `prayerView`.

## 5. Guards

- `apps/web/src/game/boundary.test.ts`: `combat.js` sends no `combat/*` literal but `end-turn`, `say`, `attempt`,
  `search`, `read`; no screen calls the old per-system previews, prompts and pickers or prices an action itself;
  `actionFlow.ts` imports only `actionsFor`, `previewDescriptor`, `stepOn` and types from the engine.
- `apps/web/src/screens/combat-actions.test.ts` (jsdom, the real template): every group (move, attack, utility, perks,
  class, sigils, outbursts, faith, calls) renders and confirms through the flow, and the test-only system below appears
  and works on the screen.

## 6. How to add an action / a whole new system

**An action of an existing system:** add it where that system is defined (a basic action in `data/actions.json` and
`basicActions`; a technique, a Call, a prayer in their data; a perk or class move as the item's `actions`). It appears
in `actionsFor` with its cost and refusal from that system, and on the screen with no client change. If it needs a
pick the existing kinds don't cover, see "a bespoke panel" below.

**A whole new system** (a roguelike relic's actions, Weapon Arts): one `ActionSystem` in the engine.

```ts
import { registerActions } from './descriptors';   // or from '@engine'
registerActions({
  id: 'relics',
  owns: (id) => id.startsWith('relic:'),            // so a preview asks only this system
  list: (x) => relicsOf(x.u).map((r) => ({
    id: 'relic:' + r.id, group: 'utility', name: r.name, text: r.text,
    cost: { ap: price({ cb: x.cb, u: x.u }, 'relic').ap, text: '2 AP' },   // a price from effects/cost.ts, never typed
    available: !whyNotRelic(x, r), why: whyNotRelic(x, r),
    picks: [{ key: 'targetId', kind: 'enemy', prompt: 'Click an enemy.', choices: x.seen.units.filter((v) => v.side !== x.u.side && !v.dead).map((v) => v.id) }],
    toggleOn: null, preview: 'basic',
  })),
  send: (x, d, p) => ({ type: 'combat/relic', unitId: x.u.id, id: d.id.slice(6), targetId: p.targetId }),
  preview: (x, d, p) => ({ lines: [{ k: 'note', text: '…' }] }),   // optional: words beyond the reducer's verdict
});
```

Then add `'relics'`'s preview id to nothing: `preview: 'basic'` is already on the flow (`FLOW_PREVIEWS`). The reducer
case (`combat/relic`) is the rule; `previewDescriptor` asks it on a copy, so its refusal is the screen's. Use
`x.seen` (the fight as the viewer's side sees it) for choices, never `x.cb`. That is all: no client file.

**The worked example is a test:** `test:taunt` in `packages/engine/test/descriptors.test.ts` and
`apps/web/src/screens/combat-actions.test.ts` registers a system with one action (Taunt: 2 AP, pick an enemy, sends an
Analyze). With no other code it appears on the Utility tab with its cost, asks "Click an enemy to taunt.", takes the
click on the enemy's token, and Confirm sends `combat/analyze` at that enemy.

**A system that needs a bespoke panel:** give the step `kind: 'custom'` and a `renderer` name; the screen draws its
panel for that step and passes what it picked to `flowView(…, extra)` under the step's `key`. Its ids, cost, legality,
preview and Confirm still come from the descriptor. Keep the panel's own words if it has them; never its own rules.

**Never, on the client:** a cost, a range, a "can it" check, a list of who may be picked, a `{ type: 'combat/…' }`
literal. If a screen needs one, the descriptor or its preview is missing an answer: add it in `descriptors.ts`.

## 7. What is left

- **`main.js` (the story and area map)** is not on descriptors: its world move plan, attack reach, dry run and perk
  pickers stand as before (review 4: `main.js:129,925-966`). Next system: `actionsFor` for an area-map unit (world/act
  perks, Sneak, a world move).
- **The turn card's `smartCommands`** still prints a few costs itself (`attackApCost` for Cut/Shoot, `SPELL_AP` for a
  Pump); `resolveCommands` already reads the descriptor list. The boundary lint exempts `commands.ts` for this one.
- **The magic panels' words** (Draw's, Evoke's, the Outburst and HEART texts) are still written by `combat.js` from
  the engine's previews (`drawStrip`, `evokeView`, `designCards`, `heartPanel`); only their ids, costs, legality and
  Confirm are the descriptor's. Moving their words into `previewDescriptor` lines would let the magic block go.
- **A Move's hover** (route, crossing hazards, "AP for N tiles") is the screen's own over `moveOptions`; the click sends
  the descriptor's action.
- **Finding 8 (split `renderVals`) was not started.** With the boundary in place the seams in review 4 section 4.4 are
  now mostly presentation; the selection-and-preview seam is gone into the flow.
- Small text changes a player may notice: a technique's panel name drops "· 1 round"; its odds read "Keel: hit 65% ·
  need 8" joined by spaces; a perk's panel no longer ends "Confirm to use it."; a shove out of reach says the reducer's
  own reason instead of "get next to it first"; Release's hover drops the shape line (the HEART panel shows it); a
  prayer's extra line starts with its odds.

## 8. Browser suites to run before merging to live

None was run here (no browser). Read for selectors and texts: `skeleton-screens.mjs` pins "Threaten · 1 AP · within N
tiles", "To Rook." and the save line (kept); `faith.mjs` / `faith-pg.mjs` pin "WHISPER · Health · 1 AP · SURE",
"Target: Vess", "HYMN · Thunderclap · 3 AP · SURE", "WHISPER · Guidance · 1 AP · TN 12" (kept); no suite pins the
removed texts or the old Order chip keys. Run, in this order:

`npm run e2e -- playscreen physical physical-pack perks classes-moves rules114 ground reload world-play tabs resources combat-fixes turn-order faith faith-pg skeleton-screens heart soul feelings40 magic sigil14 sigil15 sigil15-strokes sandbox two-players`
