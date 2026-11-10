# Physical 2.0, implementer A: the melee technique effects (hand-off)

Branch `claude/awesome-babbage-8gngk8` (A, with the base and C's client merged in). 10 Nov 2026. **Built, reviewed and fixed** (section 9). This is the hand-off for the lead and for C: why these effects exist, what each technique shows, the design, which files outside A's own code were touched and why, what the lead is asked to do, and what isn't tested. The first build's note, [`physical-2.0-A-FX-RESULT.md`](physical-2.0-A-FX-RESULT.md), is folded in here.

## 1. Why Leon asked for this

Leon asked (10 Nov 2026): **"we using new effects for these?"**

The honest answer was no. The 23 melee techniques only reused the plain melee swing, the shove and the stance effects, and C's part 4 ([`physical-2.0-C-client.md`](physical-2.0-C-client.md)) only adds the technique's name over the unit, plus one stronger beat for a Finisher or a Take. I pushed back on that: **half the techniques move people or things, and the reused swing doesn't show what happened.**

- A Sweep that hits three people looked like three separate Cuts.
- A Throw played **a pistol shot and a bullet tracer** (a real bug, fixed in `play.ts`: section 5).
- A Bind left no mark that the two units are locked together, and a weapon left in a nailed unit was invisible.
- A Parry looked like the hit went through, just with a smaller number.
- A Throw Down, a Drag and a Shove showed a token sliding, but not who did it, or the direction it went.

Leon's answer: **"they are both busy, but C seems to have done implementing, so make these effects on your branch and push it with a handoff that describes why I request this."** The lead and B are busy, and C's client part is done and merged into this branch, so A built the effects here, on top of C's client, and touched C's and the lead's files only where section 5 lists.

The goal: **one clear beat per technique that shows what the rules did, with no extra waiting.** A melee turn gets at most one short beat longer per technique (260 ms at Normal at most). The multi-strike techniques (Sweep, Cleave, Flurry) are now *faster* than before, because their later strikes play at the chained beat. Every effect follows the combat speed (`game/combatSpeed.ts`) and the spotlight cut-in's slow-mo, never extends `window.__phcHold`, respects reduced motion, and shows each player only what their side can see.

## 2. What each technique shows now

All of it is plain SVG and CSS (arcs, lines, links, rings, trails, chevrons, brackets, shards, cracks), laid over the **already credited** Kenney Particle Pack sprites (dust, dirt, spark bursts, flash star, flash crit, flare) and the weapons' own monoline icons (`art/icons/weapons` through `gearIcons.ts`). Every sound is one already credited. No new asset was needed (the CLAUDE.md asset rule).

| Technique | The beat | Lasting mark |
| --- | --- | --- |
| Sweep | A white arc band sweeps across the swept tiles and leaves a fading wedge (Heavy: a full ring). A struck ally gets an HP-red ring, as a friendly-fire warning. | |
| Cleave | A white cut that runs from the first target through each extra, in order, bowed toward the user. | |
| Throw | The weapon's own icon spins along a shallow arc to the unit really struck (a redirected throw goes where it went), then drops into the pile on its tile. | |
| Bind, Bare grapple | A Strength-ink double link with a knot snaps from the user to the target. | The link rises once the beat has played, stays while the hold lasts and tears when it ends (Throw Down tears it in its own beat). |
| Throw Down | The hold tears apart, a skid shows the body's path, then a shock ring, dust and dirt, and a jolt on the landing tile (and a red ring on anyone slammed into). | |
| Shove, Drag, Bash (Heavy push), Lunge (Heavy push) | A tapered Strength-ink skid along the real path, with chevrons the way it went, drawn as the token slides. A Drag swap draws two crossing arrows as the two units cross. | |
| Trip, Charge's Prone, Hamstring (Hook), Throw (Heavy), Keep Back (Hook) | The token tips and drops, with a puff of dust, together with the PRONE word. | (the token's own prone badge) |
| Parry | Two white strokes snap shut into an X between the two units, with a spark and PARRIED under the token (C's name float is above it). A lost parry shows one muted stroke and THROUGH. | |
| Run Through | A white thrust line through the target (and on behind it, with Point), then a pin mark. | With Reach, the weapon left in is drawn stuck in the token at 35° (with "2 AP", the cost to pull free). It falls when it is pulled out or the unit goes down. |
| Feint | The user jabs, then white corner brackets close on the target, or NOT FOOLED. | The brackets stay for the rest of the turn. |
| Guard | A Body-amber arc rises on the front side (Heavy: a second arc; Reach: a dotted ring at 1 tile). | The guard stays raised while it holds, which is until the user's next turn, the turn its Momentum is held for. |
| Sidestep | An Agility-ink afterimage on the old tile and speed lines along the step, as the step plays. | |
| Keep Back | A white reach line from the holder to the mover, a crossbar where it stops, and the mover snaps back. | |
| Half-Sword | A narrow white thrust into the target and on through it (the armour ignored). | |
| Sunder | Muted armour shards chip off the far side and fall, a muted spark, and ARMOUR was → now. | |
| Flurry | Two or three thin white cuts cross the target, 70 ms apart. Thrown: no cuts; each thrown shot flies the weapon's icon to its target as the shot plays, and the last one drops into the pile. | |
| Draw Cut | A white draw streak out of the token's side, with a flare at its tip. | |
| Ambush | A dark streak from where the user was hiding, the user snapping into view, and a flash on the target. (Bare: the grab's link.) | |
| Break | Five jagged white cracks burst across the target, a flash, a spark burst, a screen jolt, and with Blunt, ARMOUR 0. | |
| Charge | Agility-ink dash lines run along the route behind the runner, with dust where it started. Nothing for a runner the squad didn't see start (a Hidden charger gives nothing away). | |
| Cut, Lunge, Coup, Riposte | Unchanged: the swing and C's name float already say it. Lunge's Heavy push gets the skid. | |

Frames of every technique are written by `e2e/melee-fx.mjs` to its `SHOTS` folder (section 8).

## 3. The design in one paragraph

*As designed and built. Where the review changed something (the standing layer's timing, the movement beats' place in the queue, new fields), section 9 says so.*

The engine gets **one new event kind, `melee_fx`**, emitted only from the melee handlers through a helper in `melee/shared.ts`. Each use of a technique emits at most one `melee_fx` that carries a queue beat (a technique with a rider, such as Charge followed by Prone, may add one more `fall` with no beat of its own). The client adds **one handler family** in `fx/melee-techniques.ts` for that event, plus **one standing layer** for the lasting states, which it reads from the game state on every render the same way `ambient.ts` reads fields. A **pre-pass** over the batch lets the second and later strikes of a multi-strike technique play at the existing chained beat. Nothing changes in the core event shapes. All the art is SVG and CSS (arcs, lines, links, rings, trails, tints) laid over the **already credited** Kenney Particle Pack sprites (`dust`, `dirt`, `spark_burst`, `spark_burst_2`, `flash_star`, `flash_crit`, `flare`, `slash`), and all the sounds are already credited too. No new asset is needed.

### 3.1 The engine event

```ts
// melee/shared.ts
export function meleeFx(t: Tech, beat: MeleeBeat, data: Record<string, any> = {}): void
// no-op when t.preview. Emits:
{ k: 'melee_fx', unit, id /* technique id */, beat, at /* user's tile */, ...data,
  seen: { pc: 0|1, foe: 0|1 } /* sideSeesUnit for the user, stamped now (as emitFx does for turn/stance) */ }
type MeleeBeat = 'arc' | 'throw' | 'bind' | 'slam' | 'force' | 'fall' | 'parry' | 'pin' | 'feint'
               | 'guard' | 'sidestep' | 'halt' | 'thrust' | 'sunder' | 'flurry' | 'draw' | 'ambush' | 'break' | 'charge';
```

The data fields per technique are in section 4. Every position in an event is a tile key, so the client can fog-check each one. Ids are unit ids. `sideSeesUnit` is already exported from `combat.ts`.

### 3.2 Visibility (each player sees only what their side can see)

- Every point goes through the kit's `at()`, which returns null for a tile in the fog. An arc draws only its seen tiles, and a trail only its seen segments.
- A link, a clash or a thrust line between two units is drawn only when **both** ends are seen. With one end seen, only that end's part plays (the impact, the word).
- The user-side parts (the draw flash, the guard raise, the sidestep afterimage, the ambush snap-in) also need `sawThen(e)`, the `seen` stamp, because the user may be hidden or out of sight.
- The standing layer filters the same way, using `seenNow()` and the units the squad sees. A Bind link between two enemies in the fog is not drawn.

### 3.3 Speed, slow-mo, hold, reduced motion

- Timings below are **at Normal**. The code stores them at Fast (Normal × 0.85), the way `physBeat` already does, and `beatOf` scales them back.
- Every duration and delay goes through the `dom.ts` helpers (`after`, `anim`, `put`, `burst`, `ring`, `floatText`). There is no raw `setTimeout` and no CSS duration without `var(--phc-k)`, so the combat speed and the spotlight tempo apply.
- **`window.__phcHold`:** the beats only add to the queue's own timeline, the same way every other kind does. The standing layer is not in the queue, so it never extends the hold. An animation may outlive its beat (a fading trail), but nothing waits on it.
- **Reduced motion** (`reducedMotion()` from `sfx`): nothing travels, rotates or shakes. Each beat falls back to its end state appearing in place and fading (opacity only), and the words stay. The fallback for each technique is in its table row.

## 4. Per technique

**Colour** (from `docs/design/colour-system.md`): white `#FFFFFF` is the cut (and a set-up still to use), Strength ink `#F68A38` is force (pushes, pulls, holds, slams), Agility ink `#E3BF51` is footwork (dash, sidestep), Body amber `#F2A54A` is the guard, HP `#F65157` is damage on a struck unit, and muted `#A3AEC2` is failed, held or armour. Each effect is paired with a word or a glyph, as the system asks.

**Beat** = the extra queue time this event adds at Normal, on top of what plays today. Today, at Normal: `melee` 494, chained `melee` 282, `technique` 141 (306 for a Finisher), `shove` 306 per tile, `stance` 235, `stopped` 235.

| Technique | Trigger and fields to add (melee/) | The beat (shape, colour, ms at Normal) | Made of | Sound (credited) | Reduced motion | Beat |
|---|---|---|---|---|---|---|
| **Sweep** | `arc` before the strikes: `tiles` (`sweepTiles`), `struck` (ids in strike order), `dir`, `heavy` | A 90° white arc band sweeps across the swept tiles in 180 ms, leaving a fading wedge (opacity 0.35 → 0, 300 ms). A struck ally's segment and a small ring on them are HP red (friendly fire is a warning). The strikes then play at the chained beat (pre-pass, section 4.1). With Heavy, a full ring. | SVG path (arc band) and ring | `swish`, rate 0.85, at the start | The wedge appears at full opacity and fades over 300 ms | +210 (the later strikes save 212 each) |
| **Cleave** | `arc` before the first strike: `tiles` = the first target's tile, then each extra's tile, in order; `struck` | A white arc that runs from the first target through each extra in order (a polyline with rounded joins, drawn by dash offset over 160 ms) | SVG polyline | `swish`, rate 0.75 | Static polyline, fade | +190 (the extras chained) |
| **Throw** | `throw` before the strike: `from`, `to` (the target's tile), `weapon`; the landing is the engine's own `pile` | The weapon's monoline icon (`gearIconUri(weapon)`, white ink) spins along a shallow arc from the user to the target over the shot's own flight, then drops 0.25 tile into the pile's spot and fades as the pile's stack pops in. With no icon (`hasGearIcon` false), a short white bar. | `<img>` of the gear icon and an SVG arc path | `swish`, rate 0.8, at launch; the hit uses the impact's own sound | The icon appears on the target's tile and fades | 0 (it rides the shot beat; the pile adds its own 235) |
| **Bind** (and Bare's grapple) | `bind` after the hold takes: `target`, `kind: 'bind' or 'grapple'`, `pen` | A Strength-ink link (a double line with a knot in the middle, ±3 px wobble) snaps from the user to the target in 140 ms. The standing layer keeps it while the hold lasts (section 4.2). | SVG lines | `hit_heavy`, rate 1.3, gain 0.35 | The link appears | +160 |
| **Throw Down** | `slam` **after** the throw moves and before the Prone: `target`, `path` (the real tiles from `throwTo`), `land` (the landing tile), `occupant` (the id of anyone already standing there) | The link from the hold tears (two halves fly apart, 120 ms). During the per-tile `shove` slides the token is lifted (scale 1.12, then back). On landing: a dust and dirt burst, a Strength-ink shock ring (1.6 → 0.6), a 0.35 screen shake, and a second ring and shake on the occupant. | Kenney `dust`, `dirt`; SVG ring | `hit_heavy` rate 0.7, then `body_fall` +80 ms | No lift or shake; the ring and dust appear and fade | +260 |
| **Drag, Shove, Bash (Heavy push), Lunge (Heavy push)** | `force` **after** the moves: `target`, `path` (the real tiles, read from the `shove` events after a remembered `fxSeq`), `how: push, pull, swap or carry`, `prone` | The slides are the existing per-tile `shove` events. This adds the skid behind them: a tapered Strength-ink trail along `path`, fading over 360 ms, with a chevron at the end pointing the way it went. Pull: chevrons point toward the user. Swap: two crossing curved arrows. A failed Shove plays as today (HOLDS). | SVG path and chevrons; Kenney `dust` puff at the end | none extra (the slides already thump) | The trail appears and fades; no chevron travel | +120 |
| **Trip, Charge (Prone rider), Hamstring (Hook)** | `fall` right after `stop(..., 'prone')` takes: `target` | The token tips (rotate −14°, drop 0.12 tile, 260 ms, then back, because the token's prone badge carries the state), with a dust puff at its feet. Plays inside the existing `stance` prone beat. | Kenney `dust`; CSS transform | (the `stance` event's `body_fall`) | No tip; the dust fades | 0 |
| **Parry** | `parry` inside the answer: `from` (the attacker's tile), `to` (the defender's tile), `ally` (the id when parrying for an ally), `won` | **Won:** two white crossed strokes at the midpoint of attacker and defender, snapping shut in 90 ms, a Kenney spark burst in warm white, the defender's token pushed back 0.06 tile, and the word PARRIED. **Lost:** one muted stroke and THROUGH. Ordering: the engine's `melee` comes first, then this, then the halved `hurt`. | SVG strokes; Kenney `spark_burst` | `hit_metal`, rate 1.2 (won); `dry_click` (lost) | Strokes and spark appear and fade; the word stays | +180 |
| **Run Through** | `pin` after the pin takes: `target`, `line` (the user's tile, the target's tile, and the tile behind it when Point struck through), `weapon` (only when left in), `behind` (id) | A white thrust line from the user through the target (and on to the unit behind) drawn in 120 ms, then a Strength-ink pin mark on the target. With the weapon left in, the standing layer draws that weapon's icon stuck in the token at 35°, kept while the unit is nailed (section 4.2). | SVG line; gear icon | `slice` then `hit_metal`, rate 0.8 | Static line and icon | +200 |
| **Feint** | `feint`: `target`, `ok` (the save failed), `lowered` (Hook) | The user's token jabs 0.15 tile toward the target and snaps back (160 ms). **ok:** white corner brackets close on the target and stay as the set-up mark (standing). **Not fooled:** NOT FOOLED in muted. | CSS transform; SVG brackets | `swish`, rate 1.4, gain 0.4 | No jab; the brackets appear | +200 |
| **Guard** | `guard`: `front` (the facing vector), `reach`, `heavy` | A Body-amber arc (100°) rises on the front side of the token (from 0.6 to 1 in 160 ms). It stays in the standing layer while `tech.guard.on` (until the user's next turn, the turn its Momentum is held for); a thin second arc shows Heavy's ranged front, and a dotted ring at 1 tile shows Reach's zone. | SVG arcs | `hit_metal`, rate 1.6, gain 0.3 | The arc appears | +180 |
| **Sidestep** | `sidestep` after `stepUser`: `from`, `to`, `foe` | An Agility-ink afterimage (a copy of the token, opacity 0.5 → 0) left on the old tile for 220 ms, and three speed lines along the step. The step itself is the existing `move`. | CSS clone of the token; SVG lines | `swish`, rate 1.5, gain 0.4 | No afterimage; the lines fade | +60 |
| **Keep Back** | `halt` after the stop takes: `target`, `at` (where the mover stopped), `reach` | A white reach line from the holder to the mover, ending in a short crossbar that snaps the mover back 0.08 tile. The engine's `stopped` word (HALTED) follows. | SVG line and bar | `hit_wood`, rate 0.9 | Static line and bar | +160 |
| **Half-Sword** | `thrust` before the strike: `to`, `point` | A narrow white thrust line, short and straight (no wide slash), drawn into the target and 0.3 tile beyond (the armour ignored). It plays over the normal swing. | SVG line | (the swing's) | Static line | +60 |
| **Sunder** | `sunder` after the cut: `target`, `was`, `now` (armour), `broken` | Four to six muted SVG shards (flat triangles) chip off the token's far side and fall 0.4 tile, a muted spark burst, and ARMOUR was→now in muted. | SVG shards; Kenney `spark_burst_2` (tinted muted) | `hit_metal`, rate 0.75; `el_stone_crumble`, gain 0.4 | No fall; shards fade in place | +180 |
| **Flurry** | `flurry` before the strikes: `target(s)`, `n` (strikes), `thrown` | Two or three thin white cut lines cross the target at ±30°, 70 ms apart. The strikes then play at the chained beat (pre-pass). With Thrown, the last strike's icon lands in the pile, as in Throw. | SVG lines | `swish` ×n, rate 1.3, 70 ms apart | The lines appear together and fade | +140 (each later strike saves 212) |
| **Draw Cut** | `draw` before the strike: `weapon`, `to` | A white draw flash: a horizontal streak drawn out of the token's side in 120 ms, with a Kenney `flare` at its tip, then the swing | SVG line; Kenney `flare` | `sg_sharpen` (the sword unsheathe) | Streak and flare fade | +160 |
| **Ambush** (from hiding) | `ambush` before the strike: `to`, `fromHidden`, `bare` | The user's token snaps in from opacity 0 with a short dark streak toward the target (140 ms), then a Kenney `flash_crit` on the target. With Bare, the grab plays as Bind's link (`kind: 'grapple'`). For the side that didn't see the ambusher, only the target-side half plays. | CSS; SVG streak; Kenney `flash_crit` | `whiz`, rate 0.6 (the rush) | No streak; the flash fades | +180 |
| **Break** | `break` after the failed save: `target`, `stun` (or `dazed` on a boss), `armour` (Blunt), `disarm` (Hook) | White jagged crack lines (SVG polylines, 5 rays) burst across the token over 120 ms, a Kenney `flash_star` and `spark_burst`, a 0.35 screen shake, and with Blunt, ARMOUR 0 in muted. It runs alongside C's Finisher ring. | SVG cracks; Kenney `flash_star`, `spark_burst` | `el_shatter` (the ice break) | Cracks appear and fade; no shake | +260 |
| **Charge** | `charge` before the run: `route` (`plan.route`), `tiles` (the run's length) | Agility-ink dash lines stream along the route behind the token as it runs (synced to the `move` beat, at most 450 ms), with a puff of dust at the start. A Prone rider adds `fall`. | SVG lines; Kenney `dust` | `step` (the run's own); `hit_heavy` at the strike | The trail appears and fades | 0 (it rides the move beat) |
| **Cut, Lunge, Coup, Riposte** | none (the lead's reference handlers; the swing and C's name float already say it). Lunge's Heavy push gets `force`, which means one line in the lead's handler, flagged in section 8. | | | | | 0 |

### 4.1 Quick strikes (the pre-pass)

Sweep, Cleave and Flurry strike several times. The second and later strikes should play at the existing chained beat (240 ms at Fast, instead of 420), so a three-target Sweep is quicker than three Cuts are today, not slower. The engine already has a `chain: true` flag on `melee`, but its `chained()` in `combat.ts` isn't exported. Until the lead exposes it (request 1), the client does a pure pre-pass in the queue before `evs.map(beatOf)`: after a `melee_fx` with `beat: 'arc'` or `'flurry'`, it marks the next `n − 1` `melee` events by the same unit as `_quick`, and `baseBeat` reads `_quick` as `chain`. It is pure and tested.

### 4.2 The standing layer (lasting states)

`meleeMarksOf(g, seen)` builds a pure list from the plain saved state on every render; `syncMeleeMarks(items)` adds new marks, removes gone ones and animates each removal. It is called in `FxLayer.tsx` beside `syncAmbient`.

| Mark | Read from | Look | On removal |
|---|---|---|---|
| Bind | `u.tech.bind.target`, both alive, within 1 tile (mirrors `bindOf`) | The Strength-ink double line with a slow 2 s tension shimmer (none with reduced motion) | The link tears into two halves (120 ms) |
| Grapple | `target.condBy.grappled` with `grappled` on | The same link, with a hand-knot glyph | The same tear |
| Nailed | `u.nailed` (`weapon` → that weapon's icon stuck at 35°; no weapon → a short Strength-ink pin mark), and `nailed.ap` as a tiny "2 AP" tag | Static | The icon drops 0.3 tile and fades (240 ms), timed with the `pile` that follows `pull_free` or `down` |
| Guard | `u.tech.guard.on` and `front`, `heavy`, `reach` | The amber front arc (and Heavy's second arc, and Reach's dotted ring) | Fade 200 ms |
| Feint mark | `u.setUp` with `label: 'Feint'` and `t === phys.turnStamp(cb)` | White corner brackets on its target | They open and fade when used or the turn ends |

## 5. Files touched, and why some are outside A's own code

**A's own code** (the lane A owns): `packages/engine/src/physical/melee/*` (`shared.ts`: `meleeFx`, `fxMark`, `movedSince`, `fallFx`, `refuseFx`, `upto`; one call in each handler) and its tests (`packages/engine/test/phys-melee-fx.test.ts`). No core event shape changed: `melee_fx` is a new kind, emitted only from `melee/*`.

**New files** (A's, for this request): `apps/web/src/game/fx/melee-techniques.ts` (the handlers, the beat table, the pre-passes and the standing layer), `apps/web/src/game/fx/melee-techniques.test.ts`, `apps/web/e2e/melee-fx.mjs`.

**Outside A's ownership, because Leon asked A to build this while B and the lead are busy and C is done:**

| File | Owner | What changed | Why |
| --- | --- | --- | --- |
| `apps/web/src/game/fx/play.ts` | C / the lead (shared) | (1) the import and `Object.assign(H, meleeTechHandlers(…))`, registered beside C's `physHandlers`; (2) `meleeTechBeat` in `baseBeat` before `physBeat`; (3) `baseBeat` reads `_quick` as `chain` for `melee` and `shot` (240 / 170 ms at Fast); (4) `queuePlain` runs `meleePrepass` on every batch (it moves a technique's movement beats over their moves, marks quick strikes, and marks a Thrown Flurry's shots to fly the weapon); (5) `gunOf`: a melee or unarmed category gives `{ swish, look: 'thrown' }` (no pistol shot), and the shot handler skips the tracer only for an engine thrown shot (`e.thrown`), so any other melee-category shot still draws one. | The registration is the same pattern C used. (3) to (5) **change the timing and look of C's melee and shot beats** (only for techniques that emit `melee_fx`, and the thrown-melee bug fix); they are listed in section 6 for the lead to confirm. |
| `apps/web/src/game/fx/FxLayer.tsx` | C / the lead | The standing layer's wiring: `syncMarks` (waits until the queue has played the batch, no unit a mark stands on is held, then `syncMeleeMarks`), re-run on `FX_IDLE` and on a returning tab; `clearMeleeMarks` with the other clears. | The lasting states (a Bind, a grapple, a weapon left in a nailed unit, a Guard, a Feint's mark) need one place that reads the state each render, like `syncAmbient`. |
| `apps/web/src/game/fx/fxCredits.ts` | shared | One "drawn in the game" line for these effects. | The credits list says what is drawn in code and what is a sourced asset. |
| `apps/web/src/game/sfxCredits.ts` | shared | Two `what` descriptions: the shatter is now "Break's shatter" and the sword unsheathe "Draw Cut". The sources and licences (CC0) are unchanged. | They say where each credited sound is used. |
| `docs/design/handoffs/README.md`, `physical-2.0-A-RESULT.md` | A / the lead | One line each pointing here. | |

## 6. Requests for the lead

1. **Export `chained`** (or give `strike` a `chain` option), so that the later strikes of Sweep, Cleave and Flurry carry the engine's own `chain: true`. Then `quickStrikes` (and its `upto` bound) can go.
2. **Confirm the `play.ts` behaviour changes** (section 5, items 3 to 5): `_quick` read as `chain`; the `meleePrepass` on every batch (it reorders a technique's `force`, `fall` and `sidestep` beats to just before the first shove, stance or move of their unit in the same use, and marks them `_early`, beat 0); and the thrown-melee `gunOf` fix. None of them changes an event the engine saves: the pre-pass works on copies.
3. **An engine-side order for the movement beats (optional).** The engine emits `force`, `fall` and `sidestep` after the core's shove, stance and move events, because the path is only known after the move. The client moves them back (`leadMoves`). If the core's `forceMove` and `stop` took an `fx` option to emit a `melee_fx` before their first event, the pre-pass could go.
4. **A Throw Down occupant's fall.** The occupant's Prone is only the core's `stance` word. The slam's ring covers it, but a `fall` would be a third event a use, past the budget. Leave it unless you want the budget at three.
5. **C's part 4 name float and the Finisher ring** still play alongside these. They read well together in the frames. If either feels like too much, the Finisher ring is the one to drop for Break and Throw Down, which have their own impact.
6. **`reload` e2e, two tactical-card checks** fail the same way with these changes stashed (seen in the first build's runs): not caused by this work, flagged for C or the lead.

## 7. What isn't tested

- **The standing marks on another player's screen during an enemy turn with a held walker.** The unit test and the e2e check that a mark rises only after its beat (and the e2e on the player's own turn), and the code skips a mark whose unit is still held by `play.ts` (`isHeld`). No e2e drives an enemy that walks and then Binds or Guards, so "the link never draws to an empty tile while the token walks" is by construction (marks wait for the queue's end and are drawn from the token's own rect), not by a test.
- **A redirected Throw on screen.** The engine test checks the beat's `to` follows the redirect; no browser test makes a redirect.
- **A Hidden charger seen by the other side.** The unit test checks nothing is drawn when `sawThen` is false; no two-browser test runs a Hidden enemy's Charge.
- **The spotlight cut-in's slow-mo** on these beats: by construction (every duration goes through `fx/dom.ts`), not checked in a browser.
- **Reduced motion in a browser**: the unit test checks that no transform, translate, rotate, scale or dash animation is started; no e2e runs with `prefers-reduced-motion`.
- **Performance on a slow machine**: the standing layer now rebuilds a mark only when it moved (tested), but nobody measured frame times on a low-end device.
- **Two players**: `two-players.mjs` runs clean (no errors on host or guest), but it plays no melee technique, so it checks nothing of this on the guest's screen.

## 8. Tests and runs

- **Engine** (`packages/engine/test/phys-melee-fx.test.ts`, 19 tests): each technique emits its beat exactly once, with its fields (the arc's tiles and everyone struck, allies too; the real paths of a Shove, a Drag swap, a Bash push and a Throw Down; the landing tile and the occupant; Parry won or lost after the swing's own `melee`; Run Through's weapon left in; Feint fooled or not; the Guard's front; the Sidestep's from and to; where Keep Back held the mover). A preview emits none and changes nothing. A refused technique leaves no beat. A hidden user's `seen.foe` is 0, and a view keeps only its own side's stamp. At most two per use. Review fixes: `upto` on Sweep, Cleave and Flurry; a Thrown Flurry's `land`; a redirected Throw's `to`.
- **Web unit** (`apps/web/src/game/fx/melee-techniques.test.ts`, 18 tests): the beat table and its budget, `quickStrikes` (bounded by `upto` and a turn), `leadMoves` (and that it never crosses a use or changes the saved events), a Thrown Flurry's flights on its shots and no cuts, one element per beat for every technique, the right look, nothing drawn in the fog or for an unseen user (a Hidden charger included), PARRIED under the token, durations at Normal = Fast ÷ 0.85, reduced motion, the standing marks read and drawn, a mark rebuilt only when it moved, and Throw Down taking the hold it tears.
- **Browser** (`apps/web/e2e/melee-fx.mjs`): every technique used for real in the Proving Ground draws its element and is recorded drawn; the Bind, the nailed lance, the Guard and the Feint's brackets stand on the layer **and rose after their beat**; the skid of a Shove and a Bash push, a Trip's fall and a Sidestep play **no later than their first shove, stance or move**; a Thrown Flurry flies the weapon on its shots and draws no cuts; Keep Back and Parry on the enemy's turn. `ONLY=sweep,parry` runs a few cases; `SHOTS=dir` puts the frames elsewhere.

Runs after the review fixes (10 Nov 2026, local dev server after `npm run assets` and `npm run build`):

- `npm test -w @phc/engine`: 2119 pass, 1 skipped, 1 fails: `phys-core.test.ts` "a new character knows the defaults…", which fails the same way without this work (it expects "Not built yet." for a technique that is now built; the lead's test). `phys-melee-fx`: 19/19.
- `npx tsc --noEmit` in `packages/engine` and `apps/web`: clean. `npm test -w @phc/web`: 77 files, 686 pass, 2 skipped. `python3 tools/validate.py data`: 0 errors.
- `e2e/melee-fx.mjs`: **38/38** (a few cases retried on a fresh turn for the dice, as designed). The marks rose 200 to 500 ms after their beats (Bind: beat 180 ms, mark 392 ms; Run Through: pin 823 ms, mark 1311 ms), and each movement beat played 1 to 2 ms before its first shove, stance or move.
- C's suites and the others: `physical` 33/33 (one earlier run printed 32 ok lines; its failing line wasn't captured, and the rerun was clean), `gear-icons` 14/14, `combat-fixes` 9/9, `cutins` 37/37, `clarity` 48/48, `brass` 17/17, `sandbox` 33/33, `two-players` clean (no errors on host or guest).
- **Frames** (deviceScaleFactor 1) were looked at: the Shove's skid now draws under the sliding token, the lance is not in the target before the thrust, and PARRIED / THROUGH sit under the token, clear of C's PARRY name.

## 9. Review fixes (10 Nov 2026)

A review (screen capture at about 60 fps plus a DOM timeline in the Proving Ground at Normal speed, and a code read) found ten problems. Each was checked first; all ten were real (two were the same finding reported twice).

1. **The standing marks showed with the state, ahead of the beats** (reported twice: high and medium). `FxLayer` synced the marks on every state change, but the queue plays that state's events later, so Run Through's lance stood in the unhurt target about half a second before the thrust and the damage, the Feint's brackets, the Guard and the Bind link were already drawn when their "snap" and "rise" beats played, a walking enemy's link or guard was drawn on the tile its held token hadn't reached, and a nailed weapon fell before the kill it belongs to. **Fix:** the marks follow the queue. `FxLayer.syncMarks` waits until the batch is queued and played (`fxBusyUntil`, re-run on `FX_IDLE`) and until no unit a mark stands on is held (`play.ts isHeld`); each mark is drawn from its unit's token rect (`tokOf`), not the tile's centre, so a moving token carries its mark; and Throw Down's slam takes the hold it tears in its own beat. Tested: e2e "the mark rose after its beat" for Bind, Run Through, Guard and Feint; unit test for the slam.
2. **The movement beats played 250 to 500 ms after the movement** (Shove's skid after the slide, Trip's tip after PRONE, Bash's push, Drag's swap arrows, Sidestep's afterimage). **Fix:** a pure client pre-pass, `leadMoves`, moves each `force`, `fall` and `sidestep` beat to just before the first shove, stance (or `stopped`) or move of its unit in the same use, with beat 0, so the trail draws while the token slides and the tip comes with the PRONE word. Engine order can't do it (the path is known only after the move). Tested: unit (`leadMoves`) and e2e (beat no later than the move, for Shove, Bash, Trip and Sidestep).
3. **The standing layer rebuilt every mark's `innerHTML` every frame** (reported twice: medium and low), including the nailed weapon's seven `<image>` data URIs, for as long as a Guard or a Bind stands. **Fix:** each mark keeps a signature of its two ends and its data, and is rebuilt only when that changes. Tested: no rebuild over a dozen frames; one rebuild when the board moves.
4. **Parry's PARRIED / THROUGH overprinted C's PARRY name over the same unit.** **Fix:** the word floats under the token (as Sunder's and Break's do). Tested.
5. **A Thrown Flurry drew sword cuts on a target at range**, with one icon flying in late and nothing travelling for the first strikes. **Fix:** no cuts for a Thrown Flurry; `meleePrepass` marks each of its thrown shots (`_fly`), and when the shot plays (`play.ts` dispatches `phc-fx`), the weapon's icon flies from the thrower to that shot's target; the last one drops into the pile on the engine's `land` tile. Tested: unit and e2e.
6. **A Hidden charger's dash trail gave away its route and start tile.** **Fix:** Charge draws nothing unless the squad saw the runner when the run began (the engine's seen stamp). Tested.
7. **Throw's flight aimed at the chosen target, not the unit really struck after a redirect.** **Fix (engine, `strikes-b.ts`):** after the strike, a redirected throw's beat gets `to` and `target` of the unit really struck (the weapon lands there too). Flurry's thrown flights now follow each real shot, and its `land` is the tile the weapon really lands on. Tested (engine, with a redirect hook).
8. **`quickStrikes` could mark a later, unrelated plain attack as quick** (a Sweep that skips a dead unit, a Flurry that breaks early). **Fix:** the engine stamps `upto` (the last event of the use) on Sweep's, Cleave's and Flurry's beat, and the scan also stops at a `turn`. Tested (engine and unit).
9. **The RESULT note said `gunOf` was the only behaviour change in `play.ts`.** That was wrong: `_quick` and the pre-pass change the timing of C's melee and shot beats. **Fix:** section 5 lists all of them, section 6 asks the lead to confirm, and the shot handler now skips the tracer only for an engine thrown shot (`e.thrown`), so a melee-category shot from any other path still draws one.
