# Map hover performance (Found by Leon on live 0.25.0: hover halves the frame rate)

Leon, 13 Nov 2026: "If a token is moving and you use your mouse to hover multiple tiles, the FPS drops like half. The
map moving with your mouse in the map forces your mouse to do this." While a unit walks or the camera glides (0.24.0
glides to each unit on its turn), the map slides under a pointer that stands still, the browser says the pointer
entered tile after tile, and each tile entered did expensive work: the frame rate halved exactly when motion mattered.

Client only. Nothing in `packages/engine/` or `data/` changed.

## The cause (profiled, not guessed)

Measured in Chromium (Playwright) on the Proving Ground's 26 × 26 map with 12 enemy units, CPU profile of a pointer
swept across the tiles (`tools/perf/map_hover_probe.mjs --profile`), before the fix:

1. **Every tile entered re-rendered the whole combat screen.** The tile's `onMouseEnter` called
   `setState({ hover: k })`, and a screen in this runtime has one state: `renderVals()` ran for the whole screen and the
   template interpreter rebuilt every node of it, the 676 tiles included. Share of the sampled time during a sweep:
   React's render of the screen **35 %**, of which the template interpreter (`renderNode`) **19 %** and `renderVals`
   **15 %** (the action panel's `actionGroups` / `weaponBlocks` / `packPad`, `paths`, `fightSeenBy`, `visibility`…, none
   of which depend on the hover); React's commit **5 %**; then the camera's per-render `camSync` **2 %** (it redrew the
   small map's canvas and rewrote its words on every render). The rest is the browser's own style, layout, paint and
   raster (the profile's "(program)", about **44 %**).
2. **The map's own motion made those enters.** A glide scrolls the map's window every frame; with the pointer resting on
   the map the browser sends synthetic mouse events and each new tile under the pointer was a full screen render in the
   middle of the glide. One render cost 150 to 450 ms of main-thread script on the test machine (see the caveat below):
   each one is a dropped stretch of the glide.
3. Ruled out or minor: `getBoundingClientRect` in the hover path (1 %); the hover card (`actionTip.ts`) was already one
   card with a 350 ms open delay (an enter costs a `closest` and a timer), but its document-wide `scroll` listener ran
   `hide()` (a `querySelectorAll`) on every frame of a glide; `title`/`aria` rewrites were not the cost (React wrote only
   changed attributes); the route preview (`routeHazards`) is about 1 % per render but ran again on every render for
   the same tile.
4. A memo-blocker found while fixing: every tile's `cost` chip text carried the hovered route's AP and tile count
   (`−2 AP · 2 tiles`) even when its chip was hidden, so every tile's values changed with every hover.

## The fix

| Part | What | Where |
| --- | --- | --- |
| a | **No hover work while the map moves.** A tile enter only notes the tile and the pointer's place; nothing renders in the event. Once a frame (`requestAnimationFrame`) the tile under the pointer is resolved, if the map is still: no camera glide, eased step, arc easing back or drag (`CameraView.moving()`), no scroll of the window in the last 90 ms (`scrolledAt()`: a wheel or a drag that just stopped), and nothing left in the effects queue (beats, a walk, the layer's timers: what the browser suites call idle). While it moves, the hovered tile stays as it was and the frame loop waits; when the motion ends the tile under the pointer is resolved **once** (a hit test at the pointer's last place). A real pointer move while the map is still is told on the next frame, as before. An enter whose pointer did not move cannot ask for a render on its own: nothing is ever told from inside the event, so the client-coordinate test the brief suggests is not needed. A scripted event (`!isTrusted`: the jsdom tests) still hovers at once. Leaving the grid clears at once. | `apps/web/src/game/mapHover.ts` (new) |
| b | **A hover re-renders no tile that did not change.** `<sc-for memo>` in the template runtime: each item is a memoised component that renders again only when its own values changed (compared by value) or a value from outside the item that its body reads changed; its handlers are stable stand-ins that call the newest closure, so a tile that did not render still runs today's click. The fight's tiles use it (one attribute). The cost chip's text is empty unless its chip shows. Measured: a hover renders about **5 tiles** (the route's arrows and the hovered tile), not 676 (`window.__phcMemoWhy(true)` in the console lists why each item rendered). | `apps/web/src/dc/runtime.tsx`, `templates/combat.template.html` (the `memo` attribute), `screens/combat.js` (the `cost:` expression) |
| c | **The route preview at most once a frame and once per tile.** The frame loop of (a) tells the screen at most once a frame; `HoverMemo` keeps the route to the hovered tile per tile for the current game state (the store's state object is the version), so a re-render for the same tile does not work it out again; a waiting resolve is dropped when the pointer leaves; nothing is resolved during an animation. | `mapHover.ts` (`HoverMemo`), `combat.js` (`hvRoute`) |
| d | **The camera's frame loop does no layout.** A move reads the window's size once as it starts (`held`), and `frame()` / `grid()` use it while the move plays; one `scrollTo` a frame instead of two scroll writes; the small map is redrawn and its words rewritten only when they changed (it was every render). | `apps/web/src/game/cameraView.ts` |
| e | **The tile tooltip** already went through the one hover card with its open delay (no card per tile). Its `scroll` listener now does nothing when no card is up or coming. | `apps/web/src/game/actionTip.ts` |

What a hover does when the map is still is unchanged: the path and AP cost preview, the legal-tile highlight, the chips,
the tooltip and the click target (the browser suites below pin them).

`combat.js` edits (the other lane's file, kept to the minimum): the import line; `hvRoute` through `hoverMemo(this)`;
`clearHover`, the tile's `hover` and `gridLeave` through `hoverFor(this)`; the tile's `cost:` is `''` unless its chip
shows. The template edit is the word `memo` on the tiles' `<sc-for>` (line 41).

## Before and after

**Caveat first.** The only machine available was a 4-core container with no GPU (software raster) and a load average
of 16 to 31 from other builds running beside it. Every frame is slow on it, even with nothing hovered (scenario a: 55 to
120 ms mean), and the numbers move ±40 % run to run. The frame-time table is the honest record, but the robust evidence
is in the second table (what work a hover does). Re-run the probe on a real laptop before quoting milliseconds.

Frame times (requestAnimationFrame deltas in the page; 4 runs of each scenario, run back to back, before then after):

| Scenario | before 1× mean / worst | after 1× mean / worst | before 4× mean / worst | after 4× mean / worst |
| --- | --- | --- | --- | --- |
| a. glide, pointer off the map | 115.6 / 533 ms | 70.4 / 433 ms | 55.4 / 317 ms | 93.3 / 617 ms |
| b. glide, pointer resting on the map | 133.3 / 667 ms | **60.7 / 183 ms** | 149.0 / 1300 ms | **110.8 / 883 ms** |
| c. unit walks, pointer sweeping | 149.8 / 883 ms | **55.4 / 867 ms** | 141.7 / 933 ms | **104.0 / 667 ms** |
| d. pointer sweeping, nothing moving | 117.1 / 817 ms | 72.6 / 583 ms | 124.5 / 600 ms | 137.1 / 850 ms |
| frames over 16.7 ms / over 33 ms, b | 26 / 22 of 39 | 45 / 41 of 70 (more frames drawn) | 28 / 28 of 53 | 38 / 34 of 51 |

An earlier pair of runs (load 17 to 31) gave the same picture: before, b was **2.0×** a at 1× (213 vs 105 ms mean,
Leon's "half the FPS") and 1.6× at 4×; after, b was 1.2× a at 1× and 1.8× at 4× with the 4× a itself at 53 ms. The
target "b and c within about 10 % of a" is met at 1× (b 0.86×, c 0.79× of a) and not provably at 4× on this machine
(b 1.19×): the noise is larger than the gap. The target "no frame in a glide over 33 ms at 4× where there was none
before" cannot be judged here: on this machine nearly every frame is over 33 ms with no hover at all.

What the hover makes the page do (robust to the machine's load):

| | before | after |
| --- | --- | --- |
| Screen renders caused by the hover during a glide with the pointer resting on the map | 3 a glide (one per tile the map slid under the pointer) | **1 a glide**, after it ends (the resolve) |
| Hover renders during a unit's walk with the pointer sweeping | one per tile entered (31 in 4 walks) | **0 while the walk plays**; the ones counted (14 to 27 in 4 walks) are after it stopped, in the same sweep |
| Main-thread script in long frames, b (4 glides, 1×) | 2451 ms | **735 ms** (a: 1302 / 1478 ms) |
| Main-thread script in long frames, c (4 walks, 1×) | 9165 ms | **4845 ms** |
| Tiles rendered by one hover (map still) | all 676 (no memo) | **about 5** (the route's arrows and the hovered tile) |
| Main-thread script per hover render, map still (d) | 173 ms (1×), 295 ms (4×) | **92 ms (1×), 196 ms (4×)** |
| Route preview (`routeHazards`) for one tile hovered over several renders | once per render | **once** per tile and game state |

Unit tests: `apps/web/src/game/mapHover.test.tsx` (a hover re-renders no tile: 676 tiles, a hover that changes no tile
renders none, one that changes two renders two, and a tile that did not render runs the newest closure; a pointer-enter
during a camera move tells nothing and the tile under the pointer is told once when the motion ends; five enters in one
frame tell only the last; the route preview is worked out once for a tile hovered across several renders).

Browser suites on our own server (`--base`): `camera mapzoom layout tabs playscreen ground world-play two-players
turn-order combat-speed slate`: see the result line at the end of this file.

## The probe and how to run it

`tools/perf/map_hover_probe.mjs` (not an e2e suite: it is in no pass/fail group, it measures). It opens the Proving
Ground's fight on the 26 × 26 map, spawns 12 enemy units (`--foes N`), turns the enemy AI off, and records the page's own
requestAnimationFrame deltas for the four scenarios, at 1× and 4× CPU throttling (CDP `Emulation.setCPUThrottlingRate`).
For each it prints mean and worst frame time, frames over 16.7 ms and over 33 ms, the tiles the browser said were
entered, the screen's renders (`window.__phcRenderCount`) and how many of them the hover asked for
(`window.__phcHoverTold`), and the Long Animation Frames split into script, forced layout and style+layout.

```
npm run build                                   # or: npx vite build -w apps/web after a change
cd apps/server && npx wrangler dev -c wrangler.dev.jsonc --port 8917 --inspector-port 9417   # your OWN port
node tools/perf/map_hover_probe.mjs --base http://127.0.0.1:8917 --runs 4 --rates 1,4
  [--only abcd] [--foes 12] [--profile out.json --profile-scenario d]   # CPU profile, top functions printed
TOP=1 node tools/perf/map_hover_probe.mjs ...   # also the scripts that spent each scenario's time (LoAF invokers)
```

A served build is fixed at the server's start: restart your `wrangler dev` after each build (it kept serving the old
index otherwise). For function names in a profile, build with `npx vite build --minify false`. Never use port 8787 or a
`pkill -f "wrangler dev"` while other sessions run: they use those (and port 8793 was taken by another session here).

## The next costs (not hover), for a later performance pass

From profiles of a walk with the pointer still and of a glide with the pointer off the map, after the fix:

1. **The combat screen re-renders during a walk or an enemy's turn, and every render runs the whole `renderVals`**:
   about 8 renders per walk from state and effects updates (the action itself, the shown HP, log and turn), each about
   15 % of the walk's sampled time; the panels' work in it does not depend on the map: `actionGroups` /
   `descriptorGroups` / `actionsFor` 2.4 %, `weaponBlocks` 1.7 %, `packPad` 1.9 %, `moveOptions` 1.6 %, `paths` 1.6 %,
   `fightSeenBy` / `visibility` 1.5 %. Caching those by game state (as `this._move` and `this._red` already are) would
   cut most of it; it is the panels' lane (`combat.js`). The same render is also what a still-map hover still pays
   (92 ms of script per hover on this machine, about a tenth of that on a laptop).
2. **The browser's own rendering of the page** (style, layout, paint, raster): about 45 to 50 % of every sampled
   second in every scenario, the glide with nothing hovered included. On this machine it is software raster, so its
   real share on a GPU laptop is unknown: measure there before acting on it.
3. **The camera's scroll itself and the effects layer's per-step DOM work**: the scroll write took about 17 % of a
   glide's samples here (`set` → `scrollTo`; a scroll update of a window with 53 sticky row and column labels and
   1,300 nodes; a lone scroll measured under 1 ms, so most of it is style the frame's earlier writes left dirty), and
   the effects layer's `tileEl` / `findTile` (a `querySelector` and a `getBoundingClientRect` per beat) about 1 to 2 %
   of a walk. Moving the camera to a transform of the grid (with the labels drawn outside the scroller) would remove
   the scroll updates; it is a bigger change than this one.

## DOM grid or canvas?

**Keep the DOM grid for now.** With 0, 12 and 24 enemy units on the 26 × 26 map (grid nodes 1,194 / 1,326 / 1,454),
the glide's and the still sweep's frame times did not grow with the units (1×, 3 runs each: glide 121 / 86 / 89 ms
mean, sweep 97 / 81 / 71 ms: within this machine's noise, and if anything falling), and a hover now renders about five
tiles. Twelve extra units add about 130 nodes to 1,326: the grid's cost is the 676 tiles, not the units. What still
costs is (1) above, which a canvas would not fix (it is the screen's logic, not the grid's drawing), and (2), which a
canvas might: the case for a canvas is the browser's paint and raster of the grid during a glide, and that has to be
measured on a real GPU machine (this one has none). Re-measure with the probe on Leon's laptop and a 40 × 40 map before
the next mode; move to a canvas only if style/layout/paint of the grid is then the largest share of a glide's frame.
