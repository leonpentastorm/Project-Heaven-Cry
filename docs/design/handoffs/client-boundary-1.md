# Client boundary 1: costs, previews, card texts and the Perks tab come from the engine

12 Nov 2026. Wave 1 of [the foundation plan](../proposals/2026-11-engine-review/PLAN.md), from
[engine review 4](../proposals/2026-11-engine-review/4-client-boundary.md): its findings **1, 2, 6 and 9**. No rule
changed. Engine 3,399 tests (3,361 before), web 1,006 (989 before), `npm run check` ALL GREEN.

**The rule this piece builds:** the engine owns every rule and number; the client renders. A screen never types a
cost, a range or a legality check, never copies a fight, never binds the game, never reads a card's prose for a rule.
`apps/web/src/game/boundary.test.ts` is a lint that fails when one of those comes back.

Finding 3 (action descriptors, `actionsFor` / one generic flow in the client) and finding 4 (fog in `viewFor`) are
**not** in this piece. What is here is the ground they stand on.

## 1. What the engine now exports for the client

All from `@engine` (`packages/engine/src/index.ts`). New files: `actions.ts`, `preview.ts`, `perkcard.ts`. New data:
`data/actions.json`, `data/perk_cards.json`.

### Basic actions (`actions.ts`, `data/actions.json`)

```ts
interface BasicAction { id: string; label: string; tab: 'move' | 'attack' | 'utility'; ap: number; cost: string; text: string; why: string | null }
interface ActionCtx { c?: Character | null; g?: any }

basicActions(cb: Combat | null, u: Unit, x?: ActionCtx): BasicAction[]
basicCost(cb: Combat | null, u: Unit, id: string, picks?: { targetId?: string | null }, x?: ActionCtx): number | null
reloadBothRows(cb: Combat | null, u: Unit, x?: ActionCtx): BasicAction[]
loadPlan(g: any, cb: Combat | null, u: Unit): { rounds: number; ap: number } | null
pullFreeTargets(cb: Combat | null, u: Unit): Unit[]
pileInReach(cb: Combat | null, u: Unit): MapObject | null
moveAp(u: Unit, how: 'move' | 'sprint' | 'disengage'): number
ACTIONS: ActionDef[]; ACTION: Record<string, ActionDef>          // data/actions.json
```

`basicActions` is the `weaponActions` pattern for everything that is not a weapon's own action, a technique, a Call,
a perk, a prayer or magic: Move, Sprint, Disengage, Prone, Shove, Shoot an object, Pull free, Pick up, a door, a stim,
the song, Put out the fire, Break free, Recover, Reload both guns, Hide, Analyze. Each row carries the AP the engine
would take **for this unit** (the base from `data/actions.json`, then the items through `actionAp`), the cost as text
(always there), the card text with its numbers filled in, and the engine's reason when it can't be used now. Rows that
only apply sometimes are absent otherwise.

`basicCost` is the AP of the action picked, with what was picked for it: a stim on a Downed ally, the unit to pull
free, the rounds a Load takes.

### Where a move may end, where an attack reaches

```ts
interface MoveOptions { tiles: Record<string, { ap: number; tiles: number }>; why: string | null; lend: number }
moveOptions(g: any, cb: Combat, unitId: string, how?: 'move' | 'sprint' | 'disengage' | 'sneak', o?: { mods?: string[] | null; world?: boolean }): MoveOptions

interface Reach { max: number; band: number; los: boolean; melee: boolean }
type ReachWhat = AttackMode | 'shove' | 'analyze' | 'cover' | 'overwatch' | 'paired'
reachOf(cb: Combat | null, u: Unit, what: ReachWhat, o?: { step?: number; fists?: boolean }): Reach
reachTiles(cb: Combat, u: Unit, what: ReachWhat, o?: { step?: number; fists?: boolean }): Map<string, number>   // tile → range band
```

`moveOptions` returns exactly the tiles `moveUnit()` would accept, each with the AP it would take. It asks
`movePlan()`, which **is** `moveUnit()`'s own head (see section 5), for every tile, on a throwaway copy, resetting the
items' counters between tiles (Glass Runner's free first AP prices every tile, not only the first one asked).
`world: true` is a move on the area map, where a Sneak costs 1 AP a tile on top (`world_move_cost`). It copies the
fight once per call: ask it once per state and action (both screens memo it on the game object), not per mouse move.

### The one dry run (`preview.ts`)

```ts
withGame<T>(g: any, fn: () => T): T                                             // a read-only question, the game bound
preview<T>(g: any, cb: Combat, fn: (cb: Combat, g: any, rng: Rng) => T, o?: PreviewOpts): T
dryRun(g: any, cb: Combat, unitId: string, fn: (cb: Combat, u: Unit, rng: Rng, g: any) => string | null | undefined, o?: PreviewOpts): DryRun
previewAction(g: GameState, action: Action, by: string): ActionVerdict        // the whole action through the reducer
fightSeenBy(cb: Combat, side: 'pc' | 'foe'): Combat                             // units out of the side's sight are absent
previewSeenBy<T extends object>(cb: Combat, side: 'pc' | 'foe', run: (cb: Combat) => T, fields: (keyof T)[], whole?: T): T
fightWith(cb: Combat, mods: string[] | null | undefined): Combat                // the fight with an action's switches set
copyFight(cb: Combat, o?: { mods?: string[] | null }): Combat;  shadowGame(g: any, cb: Combat | null): any

interface PreviewOpts { viewer?: 'pc' | 'foe' | null; mods?: string[] | null }
interface DryRun { err: string | null; u: Unit | null; cb: Combat; ap: number }
interface ActionVerdict { ok: boolean; why: string | null; ap: number; g: GameState | null }
```

- `preview` / `dryRun` copy the fight (deeply), bind a **shadow** of the game (its own characters, story counters and
  dice; the story's entries and the campaign are shared, never written), run, and put the binding back. The live fight
  and game are deeply equal afterwards (`packages/engine/test/preview.test.ts`).
- `viewer` is the fog: the copy holds only what that side sees.
- `previewSeenBy` is how a preview stays honest in fog: the verdict (ok, why, AP) is the whole fight's; the fields that
  mark, count or name units (`attacks`, `pressure`, `saves`, `moves`, `notes`, `area` for a technique) are worked out
  on the fight as the side sees it. Nothing matches names inside sentences any more.
- `previewAction` runs `apply()` on a copy: every gate the reducer has is in its verdict. It copies the whole game, so
  it is for the picked action and for tests (the cost cross-checks use it), not for every tile of a map.

### The perk card in a fight (`perkcard.ts`, `data/perk_cards.json`)

```ts
interface PerkCard {
  key: string; itemId: string; kind: string; tier: string; name: string; text: string;
  shelf: 'rides' | 'always';
  switches: { label: string; on: string[] }[];                 // RIDES AN ACTION: each switch and the actions it rides
  uses: { per: UseScope; n: number; left: number; label: string } | null;
  trigger: string; standing: boolean;                           // from data/perk_cards.json
  state: 'ready' | 'used' | 'waiting' | 'last' | 'active';
  spent: UseScope | null; per: UseScope; privateCount: boolean; button: boolean; last: string;
}
perkCards(x: { u: Unit; c?: Character | null; cb?: Combat | null; g?: any }, o?: { since?: number; up?: Iterable<string> }): PerkCard[]
shelfOf(h: Holder, hasButton: boolean): 'use' | 'rides' | 'always' | null
cardTrigger(key: string, tier?: string | null): { trigger: string; standing: boolean }
cardText(h): string;  coreWired(itemId: string): boolean;  PERK_CARDS;  LOG_LOOKBACK
```

The shelf comes from the item's runtime definition (its actions, switches and hooks: the registry is the engine's to
read). The trigger is **data**: `data/perk_cards.json`, 67 entries by item and tier, each checked by a test to be in
its card's own words. The state comes from the counters the engine keeps and the fight's log. `core_wired` and
`private_count` (the two hand lists the client kept) are in the same data file. `perkShelves.ts` went from 249 lines to
109: it only puts these facts into the row's words.

### Small engine functions now said once (each used by the action and by its row)

`movePlan(cb, u, to, how, o)`, `moveHowBlock(u, how)`, `sprintTiles(u)`, `meleeReachOf(att, mode)`,
`opticBands(att, mode)`, `MAX_RANGE_BANDS`, `analyzeRange(u)` (all `combat.ts`); `hideBlock(cb, u)` (`tactics.ts`).

## 2. What the client must never compute again

| Never | Ask instead |
| --- | --- |
| An AP cost for a basic action (a literal in a row, in the picked action's cost, on a chip) | `basicActions` row `.ap` / `.cost`; `basicCost` with the picks; `weaponActions` for the weapon's own |
| Whether a move is legal, how far a Sprint goes, what a tile costs | `moveOptions(...).tiles[k]`, `.why` |
| Melee reach, range bands, optics, Analyze's range | `reachTiles` / `reachOf` |
| A copy of the fight for a dry run | `dryRun` / `preview` |
| `bindGame(g)` … `finally` | `withGame(g, fn)`, or `dryRun` / `preview` when it may write |
| `cb.mods = …` for a preview | `fightWith(cb, mods)`, or `{ mods }` on `preview` |
| Hiding units from a preview by id or by name | `fightSeenBy`, `previewSeenBy`, `{ viewer }` |
| Which shelf a perk sits on, its trigger, its state | `perkCards` |
| How many rounds a Load loads, a full gun's refusal on Reload both, who can be pulled free | `loadPlan`, `reloadBothRows`, `pullFreeTargets` |

Lines removed from the client's source (tests aside): **340 deleted, 161 added** (`perkShelves.ts` −175, `combat.js`
−61, `commands.ts` −58, `main.js` −29, `heartView.ts` −14, `backpack.ts` −3). Gone: `dryRun`'s hand copy
(`combat.js`), `dryHeart`'s (`heartView.ts`), `dryMagic`'s (`main.js`), every `bindGame` call (10 sites in 5 files),
`fogPv` / `fogCb` / `unseenNames`, the 1,800-character cost expression's eleven literal AP numbers, `reach()`'s typed
sprint and disengage costs, the red reach's own melee and range rules (twice), `loadInfo` (twice), the copied
Reload-both refusals, `registryOf` / `shelfOf` / `triggerOf` / `spentScope` / `lastLine` and the two hand lists.

## 3. The six live disagreements: before and after

Each has a test on the screen that failed before the change (`apps/web/src/screens/boundary-costs.test.ts`, run against
the old client: 8 of 9 failed) and a test on the engine's side (`packages/engine/test/actions.test.ts`). In every case
the **engine was right against the spec**; only the client moved.

| # | What | Before (client) | After |
| --- | --- | --- | --- |
| 1 | Shove with Siege Engine | Row "2 AP", 2 pips dimmed, chip "SHOVE · 2 AP"; the engine took 1 | 1 AP on the row, the pips and the chip |
| 2 | Sprint with Drill Echo | Row "2 AP"; with 1 AP left no sprint tile lit up | "1 AP"; the tiles light up at 1 AP and the click is taken |
| 3 | Disengage with Live to Fight Another Day | Row "1 AP"; at 0 AP the free one was never offered | "0 AP", not greyed, its tiles light up at 0 AP; the second one that turn is 1 AP again |
| 4 | Move legality | Tiles lit up for a second Sprint in a turn, toward the unit that Threatened you, and for a Disengage an item forbids; the click was refused with a toast | No tile lights up; the row and the panel say the engine's reason ("One Sprint a turn.") |
| 5 | Stim on a Downed ally | 1 pip dimmed, 2 AP taken | 2 pips for a Downed ally (1 for a Bard), 1 for an ally who is up; the row says "1–2 AP" (or "1 AP" for a Bard) |
| 6 | The grand staff's reach | Drawn as a ranged weapon's three range bands (3 tiles with line of sight): the staff is a melee weapon by its technique system, not by its category | 2 tiles, as `previewAttack` allows (the Reach property). The same fix covers the bot-thread banner |

(The review read bug 6 as "1 tile drawn"; running it showed 3 tiles drawn. Either way the engine's 2 is what is drawn now.)

**Leon's open bug 12 ("an action shows no AP cost on the bar").** Two candidates found and fixed:
*Hold a shot* had an empty cost on its row (now its Watches' own AP, "2 AP" or a range), and the old *Both hands* row
(a companion or a unit that keeps the old rows) dimmed no pips when picked (the cost expression fell through to 0; now
the engine's price for the paired attack against the target). A test checks every row of the Move, Attack and Utility
tabs prints a cost. A Techniques row still shows "1 of 3 now" (it opens a pad; each technique shows its own cost): if
that is the one Leon meant, it needs his word on what to print there.

Also fixed on the way: `previewOutburstPlan` (with `mods`) and Heart Overload's blood price set `cb.mods` on the fight
they were handed for the length of the call (`magic.ts`, `perks/d.ts`): they now read a top-level copy.

## 4. Finding 6: the screen data can't go stale

- `python3 design/canvas-build/build.py --web --check` regenerates the screen data in memory and exits 1, naming the
  keys that changed, when `apps/web/src/game/protodata.json` is not what `data/*.json` builds today. Nothing is written.
- `npm run check` runs it as **screen data** (`tools/check.py`); `npm run check -- web` and `-- data` include it.
- The web package's `prebuild` runs it, so `npm run build` (and so a deploy) refuses to build with stale card texts.
- `build.py` (canvas mode) is untouched.

**Not done: generating the file from the engine at build time.** It is more than the contained change the brief
allowed for: `build.py`'s web half is about 200 lines that shape skills, perks with their meta lines, traits, classes,
archetypes, origins, weapon mastery and ultimates, and it carries rules text typed into Python (`ATTR_FX`, `CORE_TEXT`,
`KITS`, `PERK_TYPE`, `USES`). The plan, in order:

1. Move the typed text into data, validated: `ATTR_FX` to `data/attributes.json` (`effect` on each attribute; Virtue's
   "Prayer cooldown" is stale since Faith 2.x and needs a new line from Leon), `CORE_TEXT` beside the cores, `KITS` from
   the engine's own kit definitions, `USES` from `usesLabel`.
2. Write `apps/web/src/game/screenData.ts`: `D` computed from `@engine`'s `SKILLS`, `PERKS`, `TRAITS`, `CLASSES`,
   `ARCHETYPES` and `assets.json` at import time. Pin: its output deep-equals the committed `protodata.json`, key by
   key (the freshness check already proves that file is current).
3. Point `screens/shared.js`, `main.tsx`, `charfile.ts` and `cast.ts` at it; delete `protodata.json`, `--web` and the
   `prebuild` hook; `tools/e2e.py` stops running the Python script. `build.py` (canvas) stays and, at v1.0, reads the
   module's output instead of its own copy.

Until then the check makes the hand step impossible to forget.

## 5. Hunks in existing engine files (for the merge)

Small, and each replaces a rule with a call to the same rule:

- `combat.ts`: `moveUnit()`'s head (from the block check to "Needs N AP") is now `movePlan()`, which `moveUnit()` calls
  first; `moveHowBlock()` and `sprintTiles()` hold the Sprint and Disengage bans and the 3 × Movement; `movePaths()`
  takes optional base paths; `previewAttack()` asks `meleeReachOf()`, `opticBands()` and `MAX_RANGE_BANDS`;
  `analyze()` asks `analyzeRange()`. `move_cost` handlers are told `preview: true` on a dry run.
- `tactics.ts`: `hideAction()` asks `hideBlock()`.
- `magic.ts` (2 lines), `perks/d.ts` (3 lines): the two previews that set `cb.mods` on the live fight.
- `index.ts`: three export lines appended.
- `tools/validate.py`: two new blocks (actions, perk_cards). `tools/check.py`: the screen data job.

If the foundations piece rewrites `shove()` or the forced-move code, nothing here touches those lines.

## 6. What is left, by the review's own list

- **Finding 3** (wave 3): `actionsFor` / `previewAction(g, unitId, id, picks, toggles)` as descriptors. `basicActions`
  rows are already descriptor-shaped (`id`, `label`, `cost`, `why`, `tab`; `pick` is in the data). The 21 `if`s in
  `confirm()` and the per-system pickers are untouched.
- **Finding 4** (wave 2): `viewFor` still sends unseen units to every guest. The previews are fogged in the engine now,
  so that change is `viewFor` alone.
- Rule copies still in the client (the review's table B; they agree with the engine today): Lunge's step and Charge's
  run for the red area (`combat.js`, passed to `reachTiles` as `step`), the legacy rows' to-hit sentences, the "1 AP
  per N tiles" line, `whyNot()`'s gun and heart reasons for rows the engine gives no reason for, the turn card's
  `smartCommands`, Order's and the techniques' option lists, the HP "looks wounded" bands. They go with finding 3.
- `main.js` keeps a four-row placeholder list (Reload "2 AP"…) for a character with no unit on a map: nothing can be
  confirmed from it; it goes when the story panel stands on the descriptors.
- The base costs in `data/actions.json` are read by the rows; the action functions still hold their own literal
  (`actionAp({ u }, 'shove', 2)`). `packages/engine/test/actions.test.ts` runs each action through the reducer and
  fails when the two differ. Wave 2's "Costs and counters" (`cost` on every action definition) should make the
  functions read the same file and drop the literals.
- A read of a use counter creates the unit's empty counter bag (`effects/uses.ts` `cellsOf`: `u.uses ||= {}`). It is
  harmless, and it is a place where a read-only engine call still writes on the live fight (found by the deep-equal tests).

## 7. How to add an action

**A basic action** (something any unit can do, with no item behind it):

1. Spec first (`docs/rules/PHC-Core-Rules-v1.0.md`), then one entry in `data/actions.json`: `id`, `name`, `tab`,
   `type` (the reducer's `combat/…`), `ap` (the base), `site` (the id items price it under), `text` with `{tokens}`.
   `python3 tools/validate.py data` must print `0 errors`.
2. The action's function in the engine (`combat.ts` / `tactics.ts`) and its `case` in `game.ts`. Price it with
   `actionAp({ u }, site, base)`. If it has a "can't do this at all" check, write it as its own small exported function
   (like `hideBlock`) and call it from the action.
3. One `row(...)` line in `basicActions()` (`packages/engine/src/actions.ts`), with the same block function for `why`.
   If its cost depends on a pick, a branch in `basicCost()`.
4. A case in `packages/engine/test/actions.test.ts` ("a row's cost is what the reducer takes").
5. Client: add the id to the `B(...)` list of its tab in `actionGroups()` (`apps/web/src/game/commands.ts`) and its
   `confirm()` branch in `combat.js`. **No number, no range and no legality check goes in the client.** If you need
   one there, the engine is missing an answer: add it to `actions.ts` and ask.

**An action a weapon grants:** a row in `weaponActions()` (`combat.ts`). **A perk, trait or class action:** its
`actions` in the item's handler (`effects/actions.ts` lists it; `actionPickers.ts` draws its picks). **A technique or
a Call:** its data file and handler. None of these needs a client cost either.

**Anything that needs "what would this do?":** `dryRun(g, cb, unitId, (cb, u, rng) => theEngineFunction(cb, …))` and
read `.err`, `.ap`, `.u`. Never copy the fight, never call `bindGame`.

**A passive that should say what it waits for on the Perks tab:** one entry in `data/perk_cards.json` (`id`, `tier`
for a perk, `trigger` in the card's own words, `standing: true` if it is a state). Nothing in the client.

## 8. Browser suites to run before merging to live

None was run here (the shared port). In order of how much they touch what changed:

`npm run e2e -- playscreen physical physical-pack perks rules114 ground reload world-play heart soul feelings40 sigil14 sigil15 tabs resources combat-fixes turn-order two-players sandbox classes-moves`

No e2e suite pins a text or a cost that changed (searched `apps/web/e2e/*.mjs` for the old row costs, "No AP left",
"An enemy can see you", "Hold a shot"'s cost and the Reload-both refusals). Texts a player may notice: Hide's refusal
is the engine's sentence ("An enemy can see you: get out of sight first." / "Marked: you can't hide."), a Prone unit's
move rows say "Stand up first (1 AP).", and a row short of AP always says "Needs N AP." (it said "No AP left." at 0).
