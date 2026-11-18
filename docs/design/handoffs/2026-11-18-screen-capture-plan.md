# Screen capture plan for the whole-game wording pass (to-do section U)

1. Ground truth for a Haiku-class agent (or the script in section 5) to screenshot every screen and state at 1600x900, saving PNGs to `.check/capture/<group>/<nn>-<name>.png` plus `index.md`. It only captures; it changes nothing.
2. Nothing here was run (read-only scouting, 18 Nov 2026, release/0.31, live 0.31.10). Selectors are copied from the e2e suites and templates named beside each; a state marked UNVERIFIED has no suite that proves the route.
3. Cheapest route to almost everything: the Proving Ground (`sandbox/*` actions through `window.__phc.act`) for the sheet, fights and tools; a Survival test room (`phc.testRoom`, `phc.testSeed`, `run/skip`) for the camp, path map and every node kind.
4. No way to jump straight to a node kind: `run/move` takes only reachable nodes (engine `game.ts` case `run/move`, `runMoveProblem`). Walk the map with `run/move` plus `run/skip`, as `survival.mjs` lines 688 to 716 do; seed `PHC-0046` has a stage 1 lane through a training ground, shrine, Forge, crossroads and rest (`survival.mjs:65`).
5. The proposed script (section 5) saves a `.txt` of the screen's visible words beside every PNG, so the lead can read the words without opening images.

## 1. Rules of the road (same for every group)

| Fact | Source |
| --- | --- |
| Server: `python3 design/canvas-build/build.py --web`, `npm run build`, then `npm run dev -w @phc/server` (port 8787), or let `npm run e2e -- <suite>` start it. A server someone else started is used as it is. | `tools/e2e.py:155-181`, `CLAUDE.md` "Run locally" |
| `BASE` env var overrides `http://127.0.0.1:8787`; `SHOTS` env var is where `OUT` points; `DSF=2` sharper shots; `FAST=1` makes fights play about 25 times faster (hidden `test` combat speed). | `apps/web/e2e/lib.mjs:5-11,19,29` |
| `player(browser, name, opts)` returns a page with the voice off, tips off (`phc.tips ["*"]`), "press any key" skipped (`sessionStorage phc.pressedAnyKey`), viewport 1440x1000. `opts.play: 'survival'` leaves the new room on Survival (default `campaign` sets `phc.testPlay`). | `lib.mjs:12-27` |
| Test room: localStorage `phc.testRoom = '1'` makes `settings.test` true; only then `run/skip` and `run/start {camp:'recommended'}` work. `phc.testSeed` fixes the run seed. | `apps/web/src/game/modes.ts:19-23`, `game.ts` `run/skip`, `run/start` |
| State is `window.__phc.getState()` (`.screen`, `.game`, `.game.run`, `.game.combat`, `.game.sandbox`); `window.__phc.act(action)` throws on refusal; `window.__phc.go(screen, extra)` changes screen. Screens: `home create room main combat levelup ultimate run` (`run` shows as `main`). | `apps/web/src/game/store.ts:14,65,360` |
| Wait with `until`, `settle(page, ms)`, `fxIdle`, `pause`; never `page.waitForTimeout`. Click buttons by name with `click(page, 'text', {exact})`. | `lib.mjs`, `docs/TESTING.md` rule 6 |
| After every `act`, `settle(p, 300)`. A cut-in (Miracle, round banner) can cover the fight: press Escape and click `(vw-10, vh-10)` up to 3 times while `[data-phc-cutin]` exists (`dismissCut` in `fight-panel.mjs`). | `fight-panel.mjs` |
| Fold open-all snippet (fight and sheet): `for (const f of await p.locator('button[data-fold][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({timeout:3000}).catch(()=>{})`; zero meters: `[data-meter-more]:visible`. | `fight-panel.mjs` ("everything opened") |
| A tooltip/hover card is `data-tip` JSON on the element (also `aria-description` / `data-tip-text`); read it with `tipOf(locator)` from `lib.mjs` for text, and hover the element for the picture. A token's card is `.phc-grid .phc-pop` on `button.phc-tok[aria-label^="F4 ·"]`. | `lib.mjs` `tipOf`; `fight-panel.mjs` U6d |
| Tile name from a unit's `pos` `"x,y"`: `'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y+1)`. | `picking.mjs:ref` |

### Sandbox actions that matter (type, fields) from the `Action` union, `packages/engine/src/game.ts:3224-3260`

`sandbox/start {archetype?, standalone?}`, `sandbox/end`, `sandbox/fight`, `sandbox/stop`, `sandbox/clear`, `sandbox/spawn {tier, weapon, at, level?, caster?}` (tiers `vermin minion soldier elite boss`, `data/enemies.json`), `sandbox/ai {on}`, `sandbox/auto {on}`, `sandbox/give {charId, item, qty?, equip?}`, `sandbox/skill {charId, skill, points}`, `sandbox/skills {charId, points}`, `sandbox/class {charId, classId, rank?}`, `sandbox/level {charId, level}`, `sandbox/perk`, `sandbox/trait {charId, trait, on?}`, `sandbox/faith {charId, belief, patron, faith, devotion, reset}`, `sandbox/learn {charId, word|school|module|tone|feeling}`, `sandbox/design {charId, design}`, `sandbox/technique`, `sandbox/mana {value}`, `sandbox/meter {unitId, shield?, momentum?, pressure?}`, `sandbox/refill`, `sandbox/hazard`, `sandbox/pile`, `sandbox/cache`, `sandbox/npc`, `sandbox/wave`, `sandbox/retry`. Figment design: `{type:'figments/design', charId, design:{id,name,form,traits}}` and `door/pick {charId, door, option}` (`figments.mjs`).

## 2. Helpers per state group (ready snippets)

All snippets assume the `act`, `G` helpers below and `p` a `player()` page.

```js
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const dismissCut = async (p, vw = 1600, vh = 900) => { await p.keyboard.press('Escape'); await settle(p, 300); for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) break; await p.mouse.click(vw - 10, vh - 10); await settle(p, 300); } };
```

### 2.1 Title and menus (suite model: `title.mjs`, `slate-title.mjs`, `lib.mjs titleHoverDuringHello`)

```js
await p.goto(BASE);                       // menu: nav[aria-label="Main menu"], items [data-item="continue|proving|new|join|chars|saved|settings|credits"]
await p.locator('[data-item="chars"]').click();   // the panel opens after Wick's hello (under 1 s): settle(p, 1500)
await p.keyboard.press('Escape');         // back to the menu (lib.mjs titleHoverDuringHello does this)
```

Menu items and their panel ids come from `apps/web/src/title/Title.tsx:125-135` (`setPanel('proving'|'name'|'join'|'characters'|'saved'|'settings'|'credits')`). The "press any key" splash is skipped by `player()`; to capture it use `browser.newContext()` with no init script (UNVERIFIED which element shows it: `.phc-press` per `lib.mjs` ready()). `SAVED GAMES` and `CONTINUE` show only when a saved session exists (`Title.tsx:125,133`): host a room once in the same context, then `page.goto(BASE)` again (UNVERIFIED that the save is written without pressing Save; the shell has a `[data-phc-save]` button for the host).

### 2.2 Lobby (room screen; suite model: `room.mjs`, `survival.mjs:98-110`)

```js
await hostAs(p, 'Leon');                  // NEW GAME, name, "Open a room ›" (lib.mjs); screen 'room'
// mode cards: [data-phc-modes] [data-phc-mode="survival|roguelike|campaign"] with data-locked; Survival open, others locked
// after a character is locked in: text '✓ LOCKED IN', button "Start the run" (Survival) or "Start session" (Campaign, needs narrator)
```

Players and squad section `section[aria-label="Players and squad"]`, Narrator column `aside[aria-label="Narrator"]` (`templates/room.template.html:10,92`). The room shell buttons: `[data-phc-room]` (room dialog), `[data-phc-cog]` (settings), `[data-phc-report]`, `[data-phc-save]`, `[data-phc-leave]` (`templates/shell.template.html`).

### 2.3 Creation (suite models: `creation-points.mjs`; `survival.mjs:76-95`, `lib.mjs makeCharacter`)

```js
await hostAs(p, 'Leon'); await click(p, 'Create a character');       // in a room; from the title, "Make a character" (lib.makeCharacter)
await p.getByPlaceholder('What the squad calls you').fill('Vess');
const step = async (name) => { await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name }).click(); await settle(p, 300); };
// steps (create.js:123): Identity, Archetype, Skills, Traits, Belief, Moves, Lock in
```

| State | Exact route |
| --- | --- |
| Step 1 Identity | open creation; origin cards `[data-origin]`, detail `[data-origin-detail]`: click a card (first `main button[aria-pressed]` is what suites click). |
| Step 2 Archetype | `step('Archetype')`; families are buttons (click by name); archetype cards `[data-arch="<id>"]` (ids in `data/archetypes.json`, 46 in 9 families); preview `[data-arch-preview]`; use button `/^Use .* ›$/`. |
| Step 3 Skills | `step('Skills')` after using an archetype (all points placed) or from scratch; `[data-points]`, steppers `[data-skill-up="<id>"]`, `[data-attr]`. |
| Skill "?" page, ladder open | on Skills: `p.getByRole('button', {name: /^What is .*\? Read its EPCCG entry$/}).first().click()` (`create.template.html:217`, `shared.js epccgVals`). The page (`templates/epccg.template.html`) has a fold `[data-fold]` for "What each point gives", the YOUR CALL ladder `.phc-ep-call-ladder` (γ skills, `data/calls.json`), and the 10-step track `.phc-ep-track`. Click `[data-fold]` if `aria-expanded="false"`; capture a skill of each kind: an α, a β, a γ skill, and a door skill (Dexterity, Raw Power, Durability, Ingenuity, Visualization, Empathy, Will Power, Faith; `fight-panel.mjs everyDoor`). Close with Escape. |
| Attribute page | on the "?" page, click `p.getByRole('button', {name: /what the attribute gives/})` (`shared.js` `attrLabel`). |
| Step 4 Traits | `step('Traits')`; grid `[data-trait-grid]`, a card `[data-trait="<id>"]` (ids `data/traits.json`, 74). Click one for the selected/detail state. |
| Step 5 Belief | `step('Belief')`; `[data-belief="faithful"]` (and the Atheist card), patron cards `[data-patron="<id>"]` grid `[data-patron-grid]`, swear `[data-patron="<id>"] [data-swear]`. Patrons: `nerukhan the_quartermaster the_laughing_mask toll_keeper mother_ember old_overcast the_matchmaker counting_weaver` (`data/patrons.json`). |
| Step 6 Moves | `step('Moves')`: techniques `[data-start-tech]` chips `[data-tech]`; magic block for a casting build (`canSigil` shows the Sigil picker, `hasMagic`); a build with no techniques and no magic shows `[data-no-moves]`. Needs three builds: a gun build (techniques), a Mind-attribute build (Sigil picker), a Soul build (Outburst starting pick `[data-feelings-pick]`, `[data-feeling]`). Pick archetypes by family from `data/archetypes.json`; `survival.mjs`/`faith` suites use `Confessor`, `Holdfast` (id `bulwark`) (`creation-points.mjs`). |
| Step 7 Lock in | `step('Lock in')`; final button `LOCK_IN.room` or `.solo` (`lib.mjs:LOCK_IN`). |
| Sigil picker (creation) | Moves step, UNVERIFIED selectors: look for glyph word chips inside the `canSigil` block (`create.template.html:325+`). |
| Outburst designer (creation) | the Moves step holds only starting picks; the designer itself is in the sheet MAGIC tab (section 2.4). |

### 2.4 The sheet (left panel; any screen except fight and creation)

Fastest: the Proving Ground between fights.

```js
await openGround(p, 'Leon');                                   // lib.mjs: PROVING GROUND, Solo, state ready
const cid = Object.keys((await G(p)).characters)[0];
// give it every door (fight-panel.mjs everyDoor): skills 3 in durability raw_power dexterity ingenuity visualization empathy will_power faith,
// sandbox/faith {belief:'faithful', patron:'mother_ember', faith:3, devotion:3, reset:true}, gear: evoker emanator visualizer attuner, standard_core x4, combat_knife equip
const tab = (id) => p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"][data-tab="' + id + '"]').click();   // ids: skills status perks gear arms magic faith (main.js:473)
```

| State | Route |
| --- | --- |
| SKILLS (core tabs Body/Mind/Soul, a skill card, its "?" ladder) | `tab('skills')`; core tabs are `coreTabs` (click each by name BODY, MIND, SOUL); the skill card's "?" button as in 2.3. |
| STATUS | `tab('status')`; `[data-derived]` rows (`skeleton-screens.mjs:141`). |
| PERKS (3 subfolds: perks, skills, traits) | `tab('perks')`; folds ids `sheet:perks:perks`, `sheet:perks:skills`, `sheet:perks:traits`; open all with the fold snippet. |
| GEAR (worn, carried, pack, make) | `tab('gear')`; heads `[data-phc-gear-head="worn|pack|make|carried"]`; backpack expand `[data-phc-pack-expand]`, big pack `[data-phc-pack-big]`. |
| ARMS | `tab('arms')` (`armsTab.js`); weapon techniques `[data-technique]`. |
| MAGIC | `tab('magic')`; sections `[data-ws-section="magic.soul|magic.sigil|magic.figments"]`, headers `[data-ws-head=...]`, toggles `[data-ws-toggle]`. Open all `[data-ws-toggle]`s one by one (UNVERIFIED which are collapsed: click each and screenshot, close again). |
| Outburst designer, each school | in MAGIC, the design workshop has `select` "SCHOOL" (`main.template.html:357`); options are the four schools `damage buff control status` (`data/soul_modules.json schools`); second school box `aria-label="Second school"` appears from Will Power (rules in `second_school`). Route: give an Emanator, `sandbox/learn {charId, school:'buff'}` etc. (the arg exists: `learn {word?, school?, module?, tone?, feeling?}`), then `p.locator('select').filter({has: p.locator('option[value="buff"]')}).selectOption('buff')`, one shot per school. Tones: `raw fire storm frost stone gale acid`. |
| Sigil tab | MAGIC `[data-ws-section="magic.sigil"]`, picker `[data-stroke-picker]`, word chips; learn words with `sandbox/learn {word}` (`sigil15.mjs:105`: fire seek spark arc spread). |
| Figments | MAGIC `[data-ws-section="magic.figments"]`, ladder `[data-fig-ladder]` (`main.template.html:391`); needs Visualization 4+ and a door pick (`figments.mjs:30-33`). |
| FAITH | `tab('faith')` (`faithTab.js`); needs `sandbox/faith`. |
| Level-up screen | `sandbox/class {classId:'marksman', rank:1}`, `sandbox/level {level:9}`, `sandbox/stop`, then `p.locator('button', {hasText: /Level up\|Earn your class/}).first().click()` and wait for `.phc-lu-core` (`pg-levelup.mjs:145-153`). Or `__phc.go('levelup', {levelupChar: cid})` (`main.js:1515`; UNVERIFIED that it shows without unspent points). Sub-states: a skill's "?" there (`levelup.js:137`), the attribute page (`skeleton-screens.mjs:181`), the class card. |
| Mastered perk screen | `ultimate` screen (`ultimate.template.html`, `mastered.template.html`): shown only when the engine grants a Mastered perk (`ultimate.js:1-2`). UNVERIFIED route: `sandbox/skill {points:10}` on one skill may trigger it; try, else mark MISSING. |

### 2.5 Survival (suite model: `survival.mjs`, helper `lib.mjs campStart`, `campConfirmGo`)

```js
const p = await player(browser, 'host', { play: 'survival' });
await p.context().addInitScript(() => { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', 'PHC-0046'); });
await p.setViewportSize({ width: 1600, height: 900 });
await hostAs(p, 'Leon'); await click(p, 'Create a character');   // then create steps as survival.mjs:76-82 (Next x5 after naming; first archetype Use)
await lockIn(p); await p.waitForSelector('text=✓ LOCKED IN'); await click(p, 'Start the run');
```

| State | Route |
| --- | --- |
| Camp step 1 (free weapon), 2 (focus), 3 (budget) | `await p.waitForSelector('[data-phc-camp]')`; `[data-phc-camp-step="1"]` click; rack `[data-phc-camp-rack]`, picks `[data-phc-camp-pick="weapon:<id>"]`, budget `[data-phc-camp-left]`, compare `[data-phc-camp-compare]`, help `[data-phc-camp-help]`, `[data-phc-camp-next]`, steps 1/2/3 buttons (`lib.mjs campStart`, `survival.mjs:93-100`). Capture each step before pressing Recommended (`[data-phc-camp-recommended]`) and again after. |
| Camp starting boon | `campStart` reaches it: `[data-phc-startboon]` cards (3), then `[data-phc-camp-ready]`. Capture before Ready. |
| Path map | after Ready, state `map`: `[data-phc-pathmap]`; lit nodes `[data-phc-node][data-phc-state="reachable"]`. |
| Node hover card | `p.locator('[data-phc-node="<id>"]').hover()`; text is `getAttribute('data-tip-text')` (`survival.mjs:207`). Capture one reachable, one locked (non-reachable), the vault guard, the gate. |
| Fight (survival) | click a reachable fight node (`run/move` or click); it opens the fight screen; then 2.6. |
| Reward panel | win by `act({type:'run/skip'})`: state `field` first (rules 1.55), `act({type:'run/leave', close:true})` goes to `reward`: `[data-phc-reward-panel]`, `[data-phc-reward-fold]`, `[data-phc-reward-close]`, bar `[data-phc-reward-bar]`; picks `[data-phc-pick]`, materials `[data-phc-pick-materials]`, tally `[data-phc-tally]` (`survival.mjs:283,340-356,419-420,884,889`). |
| The field (after a won fight) | `run/skip` (test room only) then the fight screen holds `[data-phc-field]`, `[data-phc-field-take]`, `[data-phc-field-leave]`, `[data-phc-field-tally]` (`combat.template.html`). |
| Shop (Always in stock, Today's gear, Repair and upgrade, Sell, Give) | walk to a `shop` node (WANT includes 'shop', `survival.mjs:687`); then `[data-phc-tab="always|gear|upgrade|sell|give"]` (`ShopScreen.tsx:118`; `give` only with 2+ characters, `data-phc-tab="give"` count 0 solo). Shelves `[data-phc-shelf]`, cards `[data-phc-card]`, keeper `[data-phc-keeper-name]`. |
| Forge tabs | node kind `forge`: `[data-phc-place="forge"]`, tabs `upgrade` (Repair and upgrade), `stock` (Mods and armour), `fit` (Armour fitting) (`places.ts TABS`). Tab buttons `[data-phc-tab="<id>"]` (UNVERIFIED that PlaceScreen uses this attribute: `survival.mjs` uses it on shop tabs; grep `PlaceScreen.tsx` before the run). |
| Training ground | kind `training`, tab `train`; drill cards `[data-phc-choice]`, `[data-phc-choices]`. |
| Rest with Training cards | kind `rest`, tab `train` ("Small training"). |
| Shrine | kind `shrine`, tab `shrine` (Blessings). |
| Crossroads | kind `event`, tab `trade` (Trades). |
| Cache | kind `cache`: state `reward` with offers right after arriving (`survival.mjs:287-290` crate); capture `[data-phc-reward-panel]`. |
| Vault | stage 2: `vault_guard` then `vault` (`survival.mjs:854,887`); the vault is a dead-end spur off a fork; the guard is a fight (`template vault_watch`). Seed `PHC-0046` stage 1 leaves the vault (stage 2 takes it). |
| Boon pick | after the Boss fight (`run/skip` at the Boss node): state `boon`, `[data-phc-boon]` cards (`survival.mjs:1076+`); `act({type:'run/boon', charId, choice:0})`. |
| Next tile pick | after the boon: state tiles, `[data-phc-tile]`; `act({type:'run/tile', tile})`. |
| Stage cleared / run summary | `StageScreen.tsx` holds `[data-phc-stage-screen]`, `[data-phc-stages]`, `[data-phc-summary]`, `[data-phc-score]`; the summary is state `over` after `act({type:'run/retire'})` (`game.ts` `run/retire`); also `[data-phc-keep]` (keep the character), `[data-phc-to-room]`. |
| Run tally | `[data-phc-tally]` rows on the reward panel and on the summary (`RunTally.tsx`). |

Non-fight nodes open automatically on arrival (`PLACES` check, `survival.mjs:353`); leave with `[data-phc-phase="leave"]` (`survival.mjs:344`) back to `[data-phc-pathmap]`. Walk with this helper (from `survival.mjs:686-710`):

```js
const run = () => p.evaluate(() => window.__phc.getState().game?.run);
async function walkTo(kind) {            // returns true when standing on a node of `kind` (UNVERIFIED for the shop: kind 'shop' sits at the row before the Boss)
  for (let i = 0; i < 40; i++) {
    const r = await run(); if (!r) return false;
    if (r.state === 'fight') { await act(p, { type: 'run/skip' }); await settle(p, 300); continue; }
    if (r.state === 'field') { await act(p, { type: 'run/leave', close: true }); await settle(p, 300); continue; }
    if (r.state === 'reward') { for (const [id, o] of Object.entries(r.offers || {})) await act(p, { type: 'run/pick', charId: id, choice: o.materials && o.materials.length ? 'materials' : 0 }); for (const id of Object.keys(r.lasting || {})) await act(p, { type: 'run/take', charId: id, choice: 0 }); await settle(p, 300); continue; }
    if (r.state === 'shop') { if (kind === 'shop') return true; await act(p, { type: 'run/leave' }); continue; }
    if (r.state === 'map') {
      const at = r.nodes.find((n) => n.id === r.at); if (at && at.kind === kind) return true;
      const ids = r.at ? at.links : r.nodes.filter((n) => n.depth === 1).map((n) => n.id);     // the start: depth-1 nodes
      const by = Object.fromEntries(r.nodes.map((n) => [n.id, n]));
      const next = ids.find((id) => by[id].kind === kind) || ids.find((id) => by[id].kind !== 'vault_guard') || ids[0];
      await act(p, { type: 'run/move', node: next }); await settle(p, 400); continue;
    }
    if (r.state === 'boon' || r.state === 'over') return false;
  }
  return false;
}
```

(Caution: at a fork the first walker's click is a "lean"; solo it commits at once, `game.ts` `run/move`. A place's visit may need `[data-phc-phase="leave"]` before the next move; if `run/move` is refused with a visit open, click it.)

### 2.6 The fight (Proving Ground; suite models: `fight-panel.mjs`, `picking.mjs`, `figments.mjs`, `faith-pg.mjs`, `heart.mjs`)

```js
await openGround(p, 'Leon');   // or fight-panel.mjs open()
const cid = Object.keys((await G(p)).characters)[0];
await act(p, { type: 'sandbox/ai', on: false }); await act(p, { type: 'sandbox/auto', on: false });
/* everyDoor(p, cid) as in fight-panel.mjs:33-45 */
await act(p, { type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await act(p, { type: 'sandbox/clear' });
await act(p, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'combat_knife', at: 'F4' });
/* toMe(p): end other turns until a pc unit has ap >= 5 (fight-panel.mjs:25-33); then dismissCut(p) */
```

| State | Route |
| --- | --- |
| Fight panel, each action tab | tabs `[role="tablist"][aria-label="Actions"] [role="tab"]`, ids `#phc-tab-<id>`: `move attack utility perks class shadow tend figments sigils outbursts faith calls` (`game/commands.ts:28 TAB_NAME`). Click each present tab; screenshot panel `[role="tabpanel"]`. `class` needs `sandbox/class`; `shadow` an Infiltrator (Operative) rank 3 plus Ingenuity 7 (`fight-panel.mjs:152`); `figments` a Visualizer + Visualization; `sigils` an Evoker; `outbursts` an Emanator + a design; `faith` a patron; `tend` an Attuner and Empathy. |
| An action selected, with its preview box | `pickAction(p, /^Hit/)` (it flips to the right tab; `lib.mjs`); the box is `.phc-cb-foot`, `[data-sel-box]`, `[data-sel-name]`, `[data-sel-dmg]`, `[data-sel-roll]`; confirm button `getByRole('button', {name: /^Confirm/})`. Do not confirm. |
| An action tooltip | hover a row: `p.locator('[role="tabpanel"] button.phc-cb-act[data-act]').first().hover()`; its words via `tipOf`. |
| Token hover card | hover `button.phc-tok[aria-label^="F4 ·"]` (enemy) and your own; `.phc-pop` (`fight-panel.mjs:230-238`). |
| Status strip with conditions | `[data-status-strip]`; conditions groups `[data-status-group="helps|..."]`, chips `[data-status="fx-HIDDEN"]`. Route to Hidden: Infiltrator rank 3, Ingenuity 7, `#phc-tab-shadow`, button `/^Fade/`, Confirm (`fight-panel.mjs:152-170`). Hurt conditions: let a spawned `soldier` with a burning/bleeding weapon hit you with AI on (UNVERIFIED which weapon id; read `data/conditions.json` and `data/weapons.json`); or give yourself a shield: `sandbox/meter {unitId, shield:30}` (`fight-panel.mjs:130`). No sandbox action applies a condition directly: MISSING cheap route. |
| Outburst held state | Emanator + MP; `sandbox/design {charId, design:{id:'fb',name:'Heartfire',school:'damage',modules:['burst'],tone:'fire'}}` (`heart.mjs:99`); `pickAction(p, /Begin/)` on the `Outbursts` tab; then Pump from the HEART panel (`heart.mjs` part A:2). Capture after Begin, after a Pump, after Release preview. |
| A prayer selected | `sandbox/faith {charId, belief:'faithful', patron:'old_overcast', faith:7, devotion:5, reset:true}` (`faith-pg.mjs:204`), tab `faith`, pick a Whisper or a Hymn row (e.g. Thunderclap, `faith-pg.mjs:214`); the area picks on the map (`pickOverlay.ts`). |
| A Figment order selected | Visualization 6 + a door pick + `figments/design` (`figments.mjs:27-35`); `pickAction(p, /Picture/)`; then the Hound's rows (Move, Strike, Pounce, Let go) on the Utility tab. |
| A Sigil being drawn | Evoker + learned words (`sigil15.mjs:105`); `pickAction(p, /^Draw a glyph/)`; the glyph keyboard `[data-glyph-keyboard]` (`sigil14.mjs`). |
| Victory panel | win the fight: with the AI off and one weak foe, attack it until dead: loop `act({type:'combat/attack', unitId: me.id, targetId: foe.id, mode:'shot'})` (mode names: UNVERIFIED, read `AttackMode` in `game.ts`; or pick "Hit" with `pickAction` and `Confirm`). Banner and panel: kicker `VICTORY` (`combat.js:1938`), button `Back to the story ›` or `Back to the map ›` (`combat.js:1937`). In a Survival test room `run/skip` wins at once and shows VICTORY then FREE ROAM (`cutins.mjs:88-100`). |
| Defeat panel | Proving Ground: `sandbox/ai {on:true}`, spawn `tier:'boss', level:20` foes (`sandbox/spawn level?`), end turns until `combat.over === 'lose'` (UNVERIFIED how many turns; `sandbox/retry` follows, `game.ts:4179`). Kicker `DEFEAT`. In Survival a lost run returns to the lobby (`store.ts:223`). |
| Field | Survival only, via `run/skip` (2.5). |
| Right panel in fight (squad, log, mana, legend) | `[data-phc-panel="map|mana|log|legend|actions"]` (`combat.template.html`); folds `fight:you`, `fight:squad`, `fight:log`, `fight:bonds`, `fight:shields`, `fight:vow` (`[data-fold="fight:vow"]`); open all with the fold snippet. |
| Say box / Attempt | Proving Ground only (`input[placeholder^="Say something"]`, `data-say="say|attempt|why"`). |
| Story with a Narrator in a fight | `fight-panel.mjs:233-260` (scripted Narrator, M813): heavy; skip unless the lead asks. |

### 2.7 Settings and the Proving Ground's tools

| State | Route |
| --- | --- |
| Settings panel (five tabs: audio, voice, combat, tabs, display) | in any room or Proving Ground: `p.locator('[data-phc-cog]').click()` or `window.__phc` has no direct hook; tabs `[role="tablist"][aria-label="Settings"] [role="tab"]` ids `#phc-set-audio`, `-voice`, `-combat`, `-tabs`, `-display` (`game/settings.tsx:18,135-136`). From the title: `[data-item="settings"]`. |
| Fight tabs customiser (settings tab "tabs") | `fightTabsPanel.tsx`: `[data-phc-fight-tab]`, `[data-phc-tab-show]`. |
| Proving Ground gearing-up (centre tools) | after `openGround`: `aside[aria-label="Proving Ground tools"]`, tabs `nav[role="tablist"][aria-label="Tools"] [role="tab"]`: Gear, Squad, Magic, Faith, and in a field-capable PG also Field, World (`game/sandbox.tsx:274,348`); sub-sections are `[data-pg-card]`. Capture each tab at 1600x900. |
| Proving Ground in a fight (drawer) | `[aria-label="Open the Proving Ground tools"]` then `aside[aria-label="Proving Ground tools"]` (`sandbox.tsx:176`). |
| Room dialog, Report a problem, Music, Memory, Narrator menu | `[data-phc-room]`, `[data-phc-report]`, `[data-phc-float="music"]`, `[data-phc-float="memory"]` (`clarity.mjs`), `[data-phc-narr-menu]` (`main.template.html`). |
| Credits, tips | title `[data-item="credits"]`; tips `game/tips.tsx` (suppressed by `phc.tips ["*"]`: to capture a tip, make a context without it). |

## 3. What `window.__phc` and the test hooks give, in one list

`getState`, `act`, `setNarrator({scripted:true})` (a scripted Narrator, no API key: `fight-panel.mjs:251`), `toast`, `go`, `net` (`store.ts:360`); `window.__phcFxDebug()`, `__phcHold()`, `__phcCamera()`, `__phcCombatSpeed.get()` (used by `settle`, `fxIdle`, `camStill` in `lib.mjs`). localStorage keys: `phc.testRoom`, `phc.testSeed`, `phc.testPlay`, `phc.showCampaigns`, `phc.combatSpeed` (`test` is the fast one), `phc.voice`, `phc.tips`. sessionStorage: `phc.pressedAnyKey`.

## 4. Where the words of each group come from (so the lead knows where to edit)

| Group | Templates and screens | Code that builds words | Data files |
| --- | --- | --- | --- |
| Title and menus | `apps/web/src/title/Title.tsx` (labels, subs, bubbles at lines 125-135 and the panels) | `game/credits.ts`, `game/sfxCredits.ts`, `game/tips.tsx`, `game/settings.tsx` | `data/modes.json` (mode cards also) |
| Lobby | `templates/room.template.html`, `screens/room.js`, `game/modeCentre.tsx`, `game/missionBoard.tsx`, `templates/shell.template.html` (buttons) | `game/storyPanels.ts`, `game/presence.ts` | `data/modes.json` (`name`, `line`), `data/campaigns/*.json` |
| Creation (7 steps) | `templates/create.template.html`, `screens/create.js` (STEPS line 123, LOCK_LABEL 122, origins), `screens/shared.js` (EPCCG "?" page), `templates/epccg.template.html` | `game/skillUnlocks.ts`, `game/doorView.ts`, `game/callView.ts`, `game/derived.ts`, engine `calls/`, `kit.ts` | `data/skills.json` (`summary`, `voice`, `epccg`, `door_line`), `data/calls.json`, `data/perks.json`, `data/traits.json`, `data/archetypes.json`, `data/patrons.json`, `data/techniques.json`, `data/sigils.json`, `data/soul_modules.json`, `data/feelings.json`, `data/attributes.json`, `data/rules.json` |
| Sheet tabs | `templates/main.template.html` (tabs at line 65, magic 341-391), `screens/main.js` (tabs line 473), `screens/armsTab.js`, `screens/faithTab.js`, `screens/figmentsTab.js`, `screens/skilltab` logic in `main.js` | `game/classView.ts`, `game/forkView.ts`, `game/doorView.ts`, `game/heartView.ts`, `game/sigilView.ts`, `game/faithView.ts`, `game/techView.ts`, `game/echoView.ts`, `game/backpack.ts`, `game/perkShelves.ts`, `game/feelingsView.ts`, engine `perkcard.ts`, `gearpreview.ts`, `datatext.ts` (fills `{=placeholder}` numbers) | `data/skills.json`, `perks.json`, `perk_cards.json`, `traits.json`, `classes.json`, `forks.json`, `techniques.json`, `weapons.json`, `weapon_mastery.json`, `items.json`, `recipes.json`, `sigils.json`, `soul_modules.json`, `feelings.json`, `figments.json`, `patrons.json`, `conditions.json` |
| Level-up, Mastered | `templates/levelup.template.html`, `screens/levelup.js`, `templates/ultimate.template.html`, `templates/mastered.template.html`, `screens/ultimate.js` | `screens/shared.js` (`roadMap`, `nextLine`, `ceilingLine`), `game/classView.ts` | `data/classes.json`, `data/skills.json`, `data/perks.json`, `data/forks.json` |
| Survival camp, map, nodes | `game/LoadoutScreen.tsx`, `game/PathMap.tsx`, `game/RunScreen.tsx`, `game/PlaceScreen.tsx`, `game/ShopScreen.tsx`, `game/UpgradeCard.tsx`, `game/RewardPanel.tsx`, `game/rewardCards.tsx`, `game/StageScreen.tsx`, `game/RunTally.tsx`, `game/PlaceBar.tsx`, `game/GiveTab.tsx`, `game/WearBar.tsx` | `game/campView.ts`, `game/runView.ts`, `game/stageView.ts`, `game/rewardPanelView.ts`, `game/tallyView.ts`, `game/runPanels.tsx`, `game/fieldView.ts`, `game/pathMapLabels`, engine `run/placeview.ts`, `run/shopview.ts`, `run/places.ts` (tab labels `TABS`), `run/rewards.ts`, `run/loadout.ts`, `run/progress.ts`, `run/tally.ts`, `run/stage.ts` | `data/survival.json` (`nodes`, `tips`, `faces`, `start_boon`, `boons`, `train`, `rest`, `shrine`, `trades`, `forge`, `shop`, `field`, `give`, `map`, `settings`, `loadout`, `names`, `templates`), `data/modes.json`, `data/weapons.json`, `data/items.json`, `data/recipes.json` |
| Fight screen | `templates/combat.template.html`, `screens/combat.js` (tab names via `game/commands.ts` `TAB_NAME`, victory/defeat kicker lines 1645, 1922, 1938), `screens/faithCombat.js`, `screens/combat-*.test.ts` hold wording checks | `game/actionTip.ts` (tooltips), `game/commands.ts`, `game/previewLines.ts`, `game/statusStrip.ts`, `game/verdict.ts`, `game/heartView.ts`, `game/sigilView.ts`, `game/pickOverlay.ts`, `game/turnIntro.tsx`, `game/cutIn.ts`, `game/fieldView.ts`, `game/bondStrip.ts`, `game/attackAreas.ts`, engine `descriptors.ts`, `preview.ts`, `actions.ts`, `log.ts`, `fighttalk.ts`, `condtable.ts` | `data/actions.json`, `techniques.json`, `conditions.json`, `shadow.json`, `tending.json`, `pressure.json`, `figments.json`, `forks.json`, `sigils.json`, `soul_modules.json`, `feelings.json`, `patrons.json` (lines), `weapons.json`, `enemies.json`, `world_play.json` |
| Settings and Proving Ground | `game/settings.tsx`, `game/voiceSettings.tsx`, `game/music.tsx`, `game/fightTabsPanel.tsx`, `game/sandbox.tsx`, `game/sandboxWorld.ts`, `game/report.tsx` | `game/tabPrefs.ts` | none beyond the above |

Words with numbers are `{=placeholder}`s read from the item's own fields (`CLAUDE.md`; `packages/engine/src/datatext.ts`, `tools/text_numbers.py`); a rewrite in data keeps the placeholders. `docs/design/ui-screens.md` "Writing for the player" is the writing rule the Survival data files cite.

## 5. Proposed `apps/web/e2e/capture-all.mjs` (text only; not created)

Notes for whoever builds it:

- It lives beside the suites, so `apps/web/src/e2e-groups.test.ts` will fail `npm run check` unless the new file is (a) named in `groups.json` (`anim` is the sensible group: it is slow), (b) has an entry in `apps/web/e2e/README.md` as `` `capture-all.mjs` ``, (c) prints at least three `ok   ` lines through a function written as `? 'ok   ' : 'FAIL '` (the test regex is `/\? 'ok +' : 'FAIL +'/`). The script below prints one `ok` per captured state, which satisfies (c). Alternative: keep it out of the folder (put it in `tools/`) and avoid all three.
- Run: `node apps/web/e2e/capture-all.mjs` against a running server (`BASE`), or `npm run e2e -- capture-all` once grouped. It never fails the run for a missing state: it writes `MISSING` into `index.md`.
- Each state is in its own `try`; a thrown state is logged and skipped. Pictures: `.check/capture/<group>/<nn>-<name>.png`, words: the same name with `.txt` (the screen's visible text plus the tooltip text of any hovered element).

```js
// capture-all: every screen and state of the game, 1600x900, one PNG each, for the wording pass (to-do section U).
// Read-only: it changes nothing but the throw-away rooms it opens.
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { chromium, player, click, hostAs, lockIn, openGround, settle, pause, pickAction, campStart, tipOf, BASE, here } from './lib.mjs';

const ROOT = here('../../../.check/capture/', import.meta.url);
const W = 1600, H = 900;
const browser = await chromium.launch();
const index = []; let missing = 0;
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const dismissCut = async (p) => { await p.keyboard.press('Escape'); await settle(p, 300); for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) break; await p.mouse.click(W - 10, H - 10); await settle(p, 300); } };
const counters = {};
/** cap(p, group, name, screen, sources, extraText): one PNG and one TXT. `sources` says where the words are edited. */
async function cap(p, group, name, screen, sources, extra = '') {
  mkdirSync(ROOT + group, { recursive: true });
  const n = String((counters[group] = (counters[group] || 0) + 1)).padStart(2, '0');
  const file = group + '/' + n + '-' + name + '.png';
  await settle(p, 300);
  await p.screenshot({ path: ROOT + file });
  const text = await p.evaluate(() => document.body.innerText).catch(() => '');
  writeFileSync(ROOT + file.replace(/\.png$/, '.txt'), (extra ? extra + '\n----\n' : '') + text);
  index.push({ file, screen, sources });
  ok('captured ' + file, true);
}
/** try a state; on a throw, index it as MISSING with the reason. */
async function state(group, name, screen, sources, fn) {
  try { await fn(); }
  catch (e) { missing++; index.push({ file: 'MISSING ' + group + '/' + name, screen, sources, why: String(e.message || e).split('\n')[0] }); console.log('MISS ' + group + '/' + name + ': ' + String(e.message || e).split('\n')[0]); ok('state ' + group + '/' + name + ' skipped (see index.md)', true); }
}
const hoverText = async (loc) => { await loc.hover({ timeout: 5000 }); await settle(loc.page(), 400); return (await tipOf(loc)) || ''; };
const sized = async (p) => { await p.setViewportSize({ width: W, height: H }); await settle(p, 300); };

// ------------------------------------------------------------------ 01 title
{ const p = await player(browser, 'title'); await sized(p); await p.goto(BASE);
  const T = 'apps/web/src/title/Title.tsx; game/settings.tsx; game/credits.ts; game/tips.tsx';
  await state('01-title', 'menu', 'Title menu', T, async () => { await settle(p, 1500); await cap(p, '01-title', 'menu', 'Title menu', T); });
  for (const [id, name] of [['proving', 'proving-ground-panel'], ['new', 'new-game-name'], ['join', 'join-a-friend'], ['chars', 'characters'], ['saved', 'saved-games'], ['settings', 'settings'], ['credits', 'credits']]) {
    await state('01-title', name, 'Title: ' + id, T, async () => {
      await p.locator('[data-item="' + id + '"]').waitFor({ timeout: 5000 });
      await p.locator('[data-item="' + id + '"]').click(); await settle(p, 1500);
      await cap(p, '01-title', name, 'Title: ' + id, T);
      await p.keyboard.press('Escape'); await settle(p, 800);
      if (!(await p.locator('nav[aria-label="Main menu"]').count())) await p.goto(BASE);
    });
  }
  await p.context().close(); }

// ------------------------------------------------------------------ 02 lobby and 03 creation
{ const p = await player(browser, 'host', { play: 'survival' }); await sized(p);
  const L = 'templates/room.template.html; screens/room.js; game/modeCentre.tsx; data/modes.json; templates/shell.template.html';
  await hostAs(p, 'Leon');
  await state('02-lobby', 'empty-room', 'Room lobby, no character', L, () => cap(p, '02-lobby', 'empty-room', 'Room lobby, no character', L));
  const C = 'templates/create.template.html; screens/create.js; screens/shared.js; data/skills.json; data/archetypes.json; data/traits.json; data/patrons.json';
  await click(p, 'Create a character');
  await p.getByPlaceholder('What the squad calls you').fill('Vess');
  const step = async (name) => { await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name }).click(); await settle(p, 400); };
  await state('03-creation', 'identity', 'Creation 1 Identity', C, () => cap(p, '03-creation', 'identity', 'Creation 1 Identity', C));
  await p.locator('main button[aria-pressed]').first().click();
  await state('03-creation', 'identity-origin-selected', 'Creation 1 Identity, origin selected', C, () => cap(p, '03-creation', 'identity-origin-selected', 'Creation 1 Identity, origin selected', C));
  await click(p, 'Next ›');
  await state('03-creation', 'archetype', 'Creation 2 Archetype', C, () => cap(p, '03-creation', 'archetype', 'Creation 2 Archetype', C));
  await p.locator('[data-arch]').first().click(); await settle(p, 300);
  await state('03-creation', 'archetype-preview', 'Creation 2 Archetype, preview', C, () => cap(p, '03-creation', 'archetype-preview', 'Creation 2 Archetype, preview', C));
  await p.locator('button', { hasText: /^Use .* ›$/ }).first().click(); await settle(p, 400);
  await state('03-creation', 'skills', 'Creation 3 Skills', C, () => cap(p, '03-creation', 'skills', 'Creation 3 Skills', C));
  // the "?" page: one alpha, one beta, one gamma skill; fold open, ladder visible
  const helps = p.getByRole('button', { name: /^What is .*\? Read its EPCCG entry$/ });
  const nHelp = await helps.count();
  for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26].filter((x) => x < nHelp)) {
    await state('03-creation', 'skill-page-' + i, 'Creation skill "?" page #' + i, C + '; templates/epccg.template.html; data/calls.json', async () => {
      await helps.nth(i).click(); await settle(p, 500);
      for (const f of await p.locator('button[data-fold][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {});
      await cap(p, '03-creation', 'skill-page-' + String(i).padStart(2, '0'), 'Creation skill "?" page #' + i, C + '; templates/epccg.template.html; data/calls.json');
      await p.keyboard.press('Escape'); await settle(p, 300);
    });
  }
  await click(p, 'Next ›');
  await state('03-creation', 'traits', 'Creation 4 Traits', C, () => cap(p, '03-creation', 'traits', 'Creation 4 Traits', C));
  await state('03-creation', 'trait-selected', 'Creation 4 Traits, one chosen', C, async () => { await p.locator('[data-trait]').first().click(); await cap(p, '03-creation', 'trait-selected', 'Creation 4 Traits, one chosen', C); });
  await click(p, 'Next ›');
  await state('03-creation', 'belief', 'Creation 5 Belief', C, () => cap(p, '03-creation', 'belief', 'Creation 5 Belief', C));
  await state('03-creation', 'belief-patron', 'Creation 5 Belief, a patron', C, async () => { await p.locator('[data-belief="faithful"]').click(); await settle(p, 300); await p.locator('[data-patron="mother_ember"]').first().click(); await settle(p, 300); await cap(p, '03-creation', 'belief-patron', 'Creation 5 Belief, a patron', C + '; data/patrons.json'); });
  await click(p, 'Next ›');
  await state('03-creation', 'moves', 'Creation 6 Moves', C, () => cap(p, '03-creation', 'moves', 'Creation 6 Moves', C));
  await click(p, 'Next ›');
  await state('03-creation', 'lock-in', 'Creation 7 Lock in', C, () => cap(p, '03-creation', 'lock-in', 'Creation 7 Lock in', C));
  await lockIn(p); await p.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 });
  await state('02-lobby', 'character-locked', 'Room lobby, character locked in', L, () => cap(p, '02-lobby', 'character-locked', 'Room lobby, character locked in', L));
  // (NOT YET CAPTURED: Moves step for a Mind build (Sigil picker) and a Soul build (Outburst picks): run the creation again with another archetype; see plan 2.3)
  await p.context().close(); }

// ------------------------------------------------------------------ 04 sheet, 05 level-up, 06 fight, 07 Proving Ground tools
{ const p = await player(browser, 'pg'); await sized(p); await openGround(p, 'Leon');
  const cid = Object.keys((await G(p)).characters)[0];
  const PG = 'game/sandbox.tsx';
  await state('07-proving-ground', 'tools-gear', 'Proving Ground tools: Gear', PG, () => cap(p, '07-proving-ground', 'tools-gear', 'Proving Ground tools: Gear', PG));
  for (const t of ['Squad', 'Magic', 'Faith']) await state('07-proving-ground', 'tools-' + t.toLowerCase(), 'Proving Ground tools: ' + t, PG, async () => { await p.locator('nav[aria-label="Tools"] [role="tab"]', { hasText: t }).click(); await cap(p, '07-proving-ground', 'tools-' + t.toLowerCase(), 'Proving Ground tools: ' + t, PG); });
  // every door open (fight-panel.mjs everyDoor)
  await act(p, { type: 'sandbox/ai', on: false }); await act(p, { type: 'sandbox/auto', on: false });
  for (const [skill, points] of [['durability', 3], ['raw_power', 3], ['dexterity', 3], ['ingenuity', 3], ['visualization', 3], ['empathy', 3], ['will_power', 3], ['faith', 3]]) await act(p, { type: 'sandbox/skill', charId: cid, skill, points });
  await act(p, { type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'mother_ember', faith: 3, devotion: 3, reset: true });
  for (const item of ['evoker', 'emanator', 'visualizer', 'attuner']) await act(p, { type: 'sandbox/give', charId: cid, item });
  await act(p, { type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 4 });
  await act(p, { type: 'sandbox/give', charId: cid, item: 'combat_knife', equip: true });
  await act(p, { type: 'sandbox/design', charId: cid, design: { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' } });
  for (const w of ['fire', 'seek', 'spark', 'arc', 'spread']) await act(p, { type: 'sandbox/learn', charId: cid, word: w });
  // the sheet: every tab, folds closed then open
  const SH = 'templates/main.template.html; screens/main.js; screens/armsTab.js; screens/faithTab.js; screens/figmentsTab.js';
  await p.goto(BASE); // (the Proving Ground survives a reload through the room save; if it does not, this state is MISSING)
  for (const t of ['skills', 'status', 'perks', 'gear', 'arms', 'magic', 'faith']) {
    await state('04-sheet', t, 'Sheet tab ' + t, SH, async () => {
      await p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"][data-tab="' + t + '"]').click(); await settle(p, 500);
      await cap(p, '04-sheet', t + '-closed', 'Sheet tab ' + t + ' (folds as found)', SH);
      for (let r = 0; r < 3; r++) { for (const f of await p.locator('button[data-fold][aria-expanded="false"], [data-ws-toggle][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {}); await settle(p, 200); }
      await cap(p, '04-sheet', t + '-open', 'Sheet tab ' + t + ' (every fold open)', SH);
    });
  }
  await state('04-sheet', 'outburst-schools', 'Sheet MAGIC: Outburst designer, each school', SH + '; data/soul_modules.json', async () => {
    await p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"][data-tab="magic"]').click(); await settle(p, 400);
    for (const school of ['damage', 'buff', 'control', 'status']) {
      await act(p, { type: 'sandbox/learn', charId: cid, school });
      const sel = p.locator('select').filter({ has: p.locator('option[value="' + school + '"]') }).first();
      await sel.selectOption(school); await settle(p, 400);
      await cap(p, '04-sheet', 'magic-school-' + school, 'Outburst designer, school ' + school, SH + '; data/soul_modules.json');
    } });
  // level-up
  await state('05-levelup', 'levelup', 'Level-up screen', 'templates/levelup.template.html; screens/levelup.js', async () => {
    await act(p, { type: 'sandbox/class', charId: cid, classId: 'marksman', rank: 1 }); await act(p, { type: 'sandbox/level', charId: cid, level: 9 }); await settle(p, 500);
    await p.locator('button', { hasText: /Level up|Earn your class/ }).first().click(); await p.locator('.phc-lu-core').first().waitFor({ timeout: 30000 });
    await cap(p, '05-levelup', 'levelup', 'Level-up screen', 'templates/levelup.template.html; screens/levelup.js; data/classes.json');
    await p.getByRole('button', { name: /^What is .*\? Read its EPCCG entry$/ }).first().click(); await settle(p, 400);
    await cap(p, '05-levelup', 'levelup-skill-page', 'Level-up skill "?" page', 'screens/levelup.js; screens/shared.js; templates/epccg.template.html');
    await p.keyboard.press('Escape'); await settle(p, 300);
    await p.evaluate(() => window.__phc.go('main')); await settle(p, 400);
  });
  // the fight
  const FT = 'templates/combat.template.html; screens/combat.js; game/actionTip.ts; game/commands.ts; data/actions.json; data/techniques.json; data/conditions.json';
  await state('06-fight', 'start', 'Fight screen at the start', FT, async () => {
    await act(p, { type: 'sandbox/skill', charId: cid, skill: 'ingenuity', points: 7 });
    await act(p, { type: 'sandbox/fight' });
    await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
    await act(p, { type: 'sandbox/clear' }); await act(p, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'combat_knife', at: 'F4' });
    for (let i = 0; i < 30; i++) { const cb = (await G(p)).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]); if (cur && cur.side === 'pc' && cur.charId && cur.ap >= 5) break; if (cur) await act(p, { type: 'combat/end-turn', unitId: cur.id }); await settle(p, 250); }
    await settle(p, 800); await dismissCut(p);
    await p.waitForSelector('[role="tablist"][aria-label="Actions"] [role="tab"]', { timeout: 30000 });
    await cap(p, '06-fight', 'start', 'Fight screen at the start', FT);
  });
  const tabs = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  const nTabs = await tabs.count().catch(() => 0);
  for (let i = 0; i < nTabs; i++) await state('06-fight', 'tab-' + i, 'Fight tab #' + i, FT, async () => {
    await tabs.nth(i).click(); await settle(p, 400);
    const id = (await tabs.nth(i).getAttribute('id')) || ('tab' + i);
    await cap(p, '06-fight', id, 'Fight tab ' + id, FT);
    const row = p.locator('[role="tabpanel"] button.phc-cb-act[data-act]').first();
    if (await row.count()) {
      const tip = await hoverText(row);
      await cap(p, '06-fight', id + '-row-tooltip', 'Fight tab ' + id + ', first row hovered', FT, 'TOOLTIP: ' + tip);
      await row.click(); await settle(p, 400);
      await cap(p, '06-fight', id + '-row-selected', 'Fight tab ' + id + ', first row selected (preview box)', FT);
      await p.keyboard.press('Escape'); await settle(p, 200);
    } });
  await state('06-fight', 'token-hover', 'Fight: token hover card', FT, async () => {
    const tok = p.locator('.phc-grid button.phc-tok[aria-label^="F4 ·"]').first(); await tok.scrollIntoViewIfNeeded(); await tok.hover(); await settle(p, 400);
    await cap(p, '06-fight', 'token-hover', 'Fight: token hover card (enemy)', FT, 'LABEL: ' + (await tok.getAttribute('aria-label')));
  });
  await state('06-fight', 'all-open', 'Fight: every fold open', FT, async () => {
    for (const m of await p.locator('[data-meter-more]:visible').all()) await m.click().catch(() => {});
    for (const f of await p.locator('button[data-fold][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {});
    await cap(p, '06-fight', 'all-open', 'Fight: every fold open', FT);
  });
  await state('06-fight', 'shield-strip', 'Fight: shield and status strip', FT, async () => {
    const me = (await G(p)).combat.units.find((u) => u.side === 'pc' && u.charId);
    await act(p, { type: 'sandbox/meter', unitId: me.id, shield: 30 }); await settle(p, 500);
    await cap(p, '06-fight', 'shield-strip', 'Fight: a shield on the HP bar and the status strip', FT);
  });
  await state('06-fight', 'outburst-held', 'Fight: Outburst begun', FT + '; game/heartView.ts', async () => {
    await pickAction(p, /Begin/); await settle(p, 400); await cap(p, '06-fight', 'outburst-begin-selected', 'Fight: Begin selected', FT + '; game/heartView.ts');
    await p.getByRole('button', { name: /^Confirm/ }).first().click(); await settle(p, 800); await dismissCut(p);
    await cap(p, '06-fight', 'outburst-held', 'Fight: an Outburst held (heart panel)', FT + '; game/heartView.ts');
  });
  await state('06-fight', 'victory', 'Fight: victory panel', FT, async () => {
    await act(p, { type: 'sandbox/clear' }); await settle(p, 600);   // (clear leaves no foe: may not end the fight; if the panel is not up, MISSING)
    await p.getByText('VICTORY').first().waitFor({ timeout: 5000 }); await cap(p, '06-fight', 'victory', 'Fight: victory panel', FT);
  });
  await p.context().close(); }

// ------------------------------------------------------------------ 08 Survival
{ const SEED = 'PHC-0046';
  const p = await player(browser, 'host', { play: 'survival' });
  await p.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED);
  await sized(p);
  const S = 'game/LoadoutScreen.tsx; game/PathMap.tsx; game/PlaceScreen.tsx; game/ShopScreen.tsx; game/RewardPanel.tsx; game/StageScreen.tsx; data/survival.json';
  await hostAs(p, 'Leon'); await click(p, 'Create a character');
  await p.getByPlaceholder('What the squad calls you').fill('Kade');
  await p.locator('main button[aria-pressed]').first().click(); await click(p, 'Next ›');
  await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  for (let i = 0; i < 4; i++) await click(p, 'Next ›');
  await click(p, 'Next ›'); await lockIn(p); await p.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 });
  await click(p, 'Start the run');
  await p.waitForSelector('[data-phc-camp]', { timeout: 60000 });
  await state('08-survival', 'camp-1', 'Camp step 1', S, () => cap(p, '08-survival', 'camp-1', 'Camp step 1: free weapon', S));
  for (const n of [2, 3]) await state('08-survival', 'camp-' + n, 'Camp step ' + n, S, async () => { await p.locator('[data-phc-camp-step="' + n + '"]').click(); await cap(p, '08-survival', 'camp-' + n, 'Camp step ' + n, S); });
  await state('08-survival', 'camp-recommended', 'Camp after Recommended', S, async () => { await p.locator('[data-phc-camp-recommended]').click(); await cap(p, '08-survival', 'camp-recommended', 'Camp after Recommended', S); });
  // campStart goes the rest of the way: the starting boon, then Ready
  await p.locator('[data-phc-camp-step="1"]').click();
  await state('08-survival', 'camp-boon', 'Camp starting boon', S, async () => {
    if (await p.locator('[data-phc-camp-next]').count()) await p.locator('[data-phc-camp-next]').click(); else await p.locator('[data-phc-camp-step="2"]').click();
    await settle(p, 300); const b = p.locator('[data-phc-dialog] button', { hasText: /without/ }); if (await b.count()) await b.click();
    await p.waitForSelector('[data-phc-startboon]', { timeout: 30000 }); await cap(p, '08-survival', 'camp-boon', 'Camp: the starting boon', S);
    await p.locator('[data-phc-startboon]').first().click(); await p.locator('[data-phc-camp-ready]').click(); await settle(p, 400);
    const d = p.locator('[data-phc-dialog] button', { hasText: /without/ }); if (await d.count()) await d.click();
  });
  await p.waitForSelector('[data-phc-pathmap]', { timeout: 60000 });
  await state('08-survival', 'path-map', 'Path map', S, () => cap(p, '08-survival', 'path-map', 'Path map, stage 1', S));
  await state('08-survival', 'node-hover-reachable', 'Path map node hover (reachable)', S, async () => {
    const n = p.locator('[data-phc-node][data-phc-state="reachable"]').first(); const t = await hoverText(n); await cap(p, '08-survival', 'node-hover-reachable', 'Node hover card, reachable node', S, 'NODE TIP: ' + (await n.getAttribute('data-tip-text') || t));
  });
  await state('08-survival', 'node-hover-locked', 'Path map node hover (locked)', S, async () => {
    const n = p.locator('[data-phc-node]:not([data-phc-state="reachable"])').first(); await n.hover(); await settle(p, 400); await cap(p, '08-survival', 'node-hover-locked', 'Node hover card, locked node', S, 'NODE TIP: ' + (await n.getAttribute('data-tip-text')));
  });
  // walk to each kind; the helper is plan 2.5's walkTo (inline it here)
  const run = () => p.evaluate(() => window.__phc.getState().game?.run);
  async function walkTo(kind) {
    for (let i = 0; i < 60; i++) {
      const r = await run(); if (!r) return false;
      const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), at = r.at ? by[r.at] : null;
      if (r.state === 'fight') { await act(p, { type: 'run/skip' }); await settle(p, 300); continue; }
      if (r.state === 'field') { await act(p, { type: 'run/leave', close: true }); await settle(p, 300); continue; }
      if (r.state === 'reward') { for (const [id, o] of Object.entries(r.offers || {})) await act(p, { type: 'run/pick', charId: id, choice: o.materials && o.materials.length ? 'materials' : 0 }); for (const id of Object.keys(r.lasting || {})) await act(p, { type: 'run/take', charId: id, choice: 0 }); await settle(p, 300); continue; }
      if (r.state === 'shop') { if (kind === 'shop') return true; await act(p, { type: 'run/leave' }); await settle(p, 300); continue; }
      if (r.state === 'map') {
        if (at && at.kind === kind && r.visit) return true;
        if (r.visit && await p.locator('[data-phc-phase="leave"]').count()) { await p.locator('[data-phc-phase="leave"]').click(); await settle(p, 400); continue; }
        const ids = at ? at.links : r.nodes.filter((n) => n.depth === 1).map((n) => n.id);
        const next = ids.find((id) => by[id].kind === kind) || ids.find((id) => by[id].kind !== 'vault_guard') || ids[0];
        const e = await act(p, { type: 'run/move', node: next }); if (e) return false; await settle(p, 500); continue;
      }
      return false;
    }
    return false;
  }
  const PL = 'game/PlaceScreen.tsx; engine run/places.ts TABS; engine run/placeview.ts; data/survival.json';
  const tabsOf = { shop: ['always', 'gear', 'upgrade', 'sell'], forge: ['upgrade', 'stock', 'fit'], training: ['train'], shrine: ['shrine'], event: ['trade'], rest: ['train'] };
  for (const kind of ['training', 'shrine', 'forge', 'event', 'rest', 'shop']) {
    await state('08-survival', kind, 'Survival node ' + kind, PL, async () => {
      if (!(await walkTo(kind))) throw new Error('no route to a ' + kind + ' node on this seed (plan 2.5)');
      await settle(p, 600); await cap(p, '08-survival', 'node-' + kind, 'Node ' + kind + ' on arrival', PL);
      for (const t of tabsOf[kind]) { const b = p.locator('[data-phc-tab="' + t + '"]'); if (await b.count()) { await b.click(); await settle(p, 400); await cap(p, '08-survival', 'node-' + kind + '-tab-' + t, 'Node ' + kind + ', tab ' + t, PL); } }
    });
  }
  // the fight, the field, the reward panel (a won fight): walk to the next fight node by hand
  await state('08-survival', 'fight-field-reward', 'Survival fight, field, reward', S, async () => {
    for (let i = 0; i < 30; i++) { const r = await run(); if (r.state === 'map' && !r.visit) { const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), at = r.at ? by[r.at] : null, ids = at ? at.links : []; const f = ids.find((id) => by[id].kind === 'fight') || ids[0]; if (!f) break; if (await act(p, { type: 'run/move', node: f })) break; await settle(p, 500); if ((await run()).state === 'fight') break; } else if (r.state === 'map' && r.visit) { await p.locator('[data-phc-phase="leave"]').click(); await settle(p, 400); } else break; }
    if ((await run()).state !== 'fight') throw new Error('no fight node reached');
    await settle(p, 1500); await dismissCut(p); await cap(p, '08-survival', 'fight-start', 'Survival fight start', 'screens/combat.js; templates/combat.template.html');
    await act(p, { type: 'run/skip' }); await settle(p, 1500); await dismissCut(p);
    await cap(p, '08-survival', 'field', 'Survival: the field after a won fight', 'templates/combat.template.html; game/fieldView.ts; data/survival.json field');
    await act(p, { type: 'run/leave', close: true }); await settle(p, 800);
    await cap(p, '08-survival', 'reward-panel', 'Survival: reward panel', 'game/RewardPanel.tsx; game/rewardCards.tsx; game/rewardPanelView.ts');
  });
  // the boss, the boon pick, the next tile, the summary: walk with run/skip to the Boss
  await state('08-survival', 'boon-tile-summary', 'Survival: boon pick, next tile, summary', 'game/StageScreen.tsx; game/stageView.ts; data/survival.json boons', async () => {
    for (let i = 0; i < 80; i++) {
      const r = await run(); if (r.state === 'boon') break;
      if (r.state === 'fight') await act(p, { type: 'run/skip' });
      else if (r.state === 'field') await act(p, { type: 'run/leave', close: true });
      else if (r.state === 'shop') await act(p, { type: 'run/leave' });
      else if (r.state === 'reward') { for (const [id, o] of Object.entries(r.offers || {})) await act(p, { type: 'run/pick', charId: id, choice: o.materials && o.materials.length ? 'materials' : 0 }); for (const id of Object.keys(r.lasting || {})) await act(p, { type: 'run/take', charId: id, choice: 0 }); }
      else if (r.state === 'map') { const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), at = r.at ? by[r.at] : null; if (r.visit && await p.locator('[data-phc-phase="leave"]').count()) { await p.locator('[data-phc-phase="leave"]').click(); } else { const ids = (at ? at.links : r.nodes.filter((n) => n.depth === 1).map((n) => n.id)).filter((id) => by[id].kind !== 'vault_guard'); if (!ids.length || await act(p, { type: 'run/move', node: ids[0] })) break; } }
      await settle(p, 300);
    }
    if ((await run()).state !== 'boon') throw new Error('the Boss was not reached');
    await settle(p, 800); await cap(p, '08-survival', 'boon-pick', 'Survival: boon pick', 'game/StageScreen.tsx; data/survival.json boons');
    const cid = Object.keys((await G(p)).characters)[0];
    await act(p, { type: 'run/boon', charId: cid, choice: 0 }); await settle(p, 600);
    await cap(p, '08-survival', 'next-tile', 'Survival: the next tile', 'game/StageScreen.tsx; data/survival.json world');
    await act(p, { type: 'run/retire' }); await settle(p, 800);
    await cap(p, '08-survival', 'summary', 'Survival: run summary', 'game/StageScreen.tsx; game/RunTally.tsx; game/runReport.ts');
  });
  // settings from inside a room
  await state('09-settings', 'settings', 'Settings panel', 'game/settings.tsx', async () => {
    await p.locator('[data-phc-cog]').click(); await settle(p, 500);
    for (const t of ['audio', 'voice', 'combat', 'tabs', 'display']) { await p.locator('#phc-set-' + t).click(); await settle(p, 400); await cap(p, '09-settings', 'settings-' + t, 'Settings, tab ' + t, 'game/settings.tsx; game/voiceSettings.tsx; game/fightTabsPanel.tsx'); }
  });
  await p.context().close(); }

await browser.close();
mkdirSync(ROOT, { recursive: true });
writeFileSync(ROOT + 'index.md', '# Capture index (' + new Date().toISOString() + ')\n\n| file | screen | where its words are edited | note |\n| --- | --- | --- | --- |\n' + index.map((r) => '| ' + r.file + ' | ' + r.screen + ' | ' + r.sources + ' | ' + (r.why || '') + ' |').join('\n') + '\n');
console.log('done: ' + index.length + ' rows, ' + missing + ' states missing; see ' + ROOT + 'index.md');
```

Known weak points in the script (a builder fixes these in the first run, they are not guesses about the game):

| Weak point | Why |
| --- | --- |
| Reloading the page (`p.goto(BASE)` before the sheet loop) | a Proving Ground is a room; it survives a reload only if the room save resumes (`old-save.mjs`, `reload.mjs` show reload works in a Survival room; UNVERIFIED for `sandbox`). Safer: skip the reload and navigate with `sandbox/stop` (`pg-levelup.mjs:146`) to reach the `main` screen, which shows the sheet and the middle tools. |
| The "victory" state | `sandbox/clear` in a fight removes foes but sets `cb.over = null` (`game.ts` case `sandbox/clear`), so it will not show VICTORY. The real route is to kill the foe through `combat/attack`; mark it MISSING until written. |
| Defeat panel | not in the script (needs AI on and many turns); see plan 2.6. |
| Conditions in the status strip | no sandbox action applies a hurtful condition; only Hidden (Fade) and a shield are reachable cheaply (`fight-panel.mjs`). |
| Prayer, Figment order, Sigil draw | not in the script; each needs its own set-up from `faith-pg.mjs`, `figments.mjs`, `sigil15.mjs` (plan 2.6). Add them as three more `state()` blocks after the Outburst block. |
| Mind and Soul builds' Moves step | the script captures only the Moves step of the first archetype; re-run creation with a Mind and a Soul archetype to see the Sigil picker and the Outburst pick. |
| Vault, vault guard, crossroads, cache | seed `PHC-0046` stage 1 leaves the vault; capture them on stage 2 after the boon and tile picks (`survival.mjs:853-889`). The cache is a `reward` state after arriving at a `cache` node. |
| `Escape` closing the "?" page | UNVERIFIED; if not, click the page's close control (find it with `getByRole('button', {name: /close/i})`). |

## 6. If the capture is run by hand instead (a Haiku agent in the Browser pane)

The e2e route is cheaper. If the script is not built, the order that reaches the most states per step is: (1) Proving Ground from the title (`PROVING GROUND`, `Solo ›`): gives the sheet, the tools, the fight, every `sandbox/*` state through `window.__phc.act` in the page console (`javascript_tool`); (2) a Survival test room: set `localStorage.phc.testRoom='1'` and `phc.testSeed='PHC-0046'` before hosting, so `run/skip` works; (3) the title and creation by clicks. The same action objects are the ones in sections 1 and 2.
