# Physical 2.0, implementer A: melee technique effects (design)

Branch `claude/awesome-babbage-8gngk8` (A, with the base and C's client merged in). Written 10 Nov 2026. This is the design. The build is the next stage, on this branch: `apps/web/src/game/fx/melee-techniques.ts` for the client, one new event emitted from `packages/engine/src/physical/melee/*` for the engine, and nothing outside those apart from the registration lines listed in section 6.

## 1. Why this exists

Leon asked (10 Nov 2026): **"we using new effects for these?"**

What I told him: no. The melee techniques only reuse the plain melee swing, the shove and the stance effects. C's part 4 (`physical-2.0-C-client.md`) only adds the technique's name over the unit, plus one stronger beat for a Finisher or a Take. Then I pushed back on that: **half the techniques move people or things** (Shove, Drag, Throw Down, Throw, Charge, Sidestep, Run Through's left-in weapon), and **the reused swing won't show what happened**. A Sweep that hits three people looks like three separate Cuts. A Throw plays a gunshot (section 5). A Bind leaves no mark that the two units are locked together. And a Parry looks like the hit went through, except that the number is smaller.

Leon: **"they are both busy, but C seems to have done implementing, so make these effects on your branch and push it with a handoff that describes why I request this."**

So A builds them here, on top of C's merged client, without editing C's files beyond registering the new ones (section 6). The goal is **one clear beat per technique that shows what the rules did**, with no extra waiting: a melee turn may get slower by at most one short beat per technique (section 4).

## 2. What exists today (read from the code, not the plan)

- **Engine events from a melee technique.** `technique` comes from `useTechnique` (`physical/core.ts` ~675) or `answer` (~599). Every strike inside it is the engine's ordinary `melee` event (`combat.ts` ~960, emitted before the damage), followed by `hurt`, `cond` and `down`. `momentum` comes from `strike`. Forced moves go through `forceMove` (`core.ts` ~379), which emits **one `shove` per tile**. Prone goes through `stop` (`core.ts` ~365), which emits `stance {what:'prone'}`, and then `stopped`. A weapon that leaves the hand goes through `loseWeapon`, then `GEAR.lose` (`game.ts` ~1599), then `dropToPile`, which emits `pile`. A nailed unit's weapon falls through `dropNailed` (`combat.ts` ~1182), which emits `pile` when the unit is pulled free (`pull_free`), downed (`magic.ts` ~150) or the fight ends (`game.ts` ~1651).
- **Events the melee files emit themselves.** Three of them: `melee {mode:'grapple'}` (Ambush with the Bare line, `openers.ts` ~201), `shove {ok:false}` (Shove that fails, `links.ts` ~220; Drag's swap, ~291) and `stance prone` (Trip going down with its target, ~253).
- **Client.** `fx/play.ts` plays `melee` as a lunge, two slash sprites and an impact (beat 420 ms at Fast), `shove` as a 220 ms slide with a shake (260), and `stance` as a word (200). C's `fx/physical.ts` floats the technique name (beat 120, or 260 for a Finisher or Take) and the Momentum, Pressure, Watch, Stopped and drill words. Beats are in ms **at Fast**, and `beatOf` multiplies them by the combat speed (Normal = ÷0.85). Every duration in `fx/dom.ts` (`after`, `anim`, `put`, `burst`) is scaled by `fxScale()` = pace ÷ the spotlight tempo, so effects built from those helpers follow both the combat speed and the cut-in slow-mo for free.
- **What is missing.** The events don't say which technique a strike belongs to, which tiles an arc covered, the path of a forced move, where a body was slammed, or that a Parry turned a hit aside. The lasting states (Bound, Grappled, nailed with a weapon in it, on Guard, Feinted) aren't drawn anywhere on the grid.

## 3. The design in one paragraph

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

## 5. A real bug found while reading: Throw plays a gunshot

`fx/play.ts` `gunOf(id, cat)` falls through to `{ sound: 'gun_pistol', look: 'bullet' }` for any category it doesn't know. A thrown melee weapon's `shot {thrown: true}` has `cat: light_melee` (or heavy, or polearm), so **Throw, and Flurry with the Thrown line, play a pistol shot and a bullet tracer today.** The fix is part of this build: a two-line guard in `gunOf` (a melee or unarmed `cat` with `thrown` gives `{ sound: 'swish', rate: 0.8, look: 'thrown' }`), and the shot handler leaves the flight to `melee_fx` `throw` (no tracer). It is the only behaviour change in `play.ts`.

## 6. Where the code goes

- **Engine (A's code, `packages/engine/src/physical/melee/*`):** `meleeFx` in `shared.ts`, and one call in each handler at the point named in section 4. `force` reads its real path from the `shove` events after a remembered `cb.fxSeq`, so the core needs no change. No preview emits anything. **Event budget:** at most two `melee_fx` per use (the beat event, plus at most one `fall`), so the 40-event `FX_CAP` that Spray and Pray scans (code map, trap 7) gains at most two events per technique.
- **Client:** a new `apps/web/src/game/fx/melee-techniques.ts` with `meleeTechHandlers(kit)`, `meleeTechBeat(e)` (pure), `quickStrikes(evs)` (pure), `meleeMarksOf(g, seen)` (pure) and `syncMeleeMarks(items)`. It is registered the way C's `physical.ts` is: `Object.assign(H, meleeTechHandlers({...}))` after `physHandlers` in `play.ts`, a `meleeTechBeat` line in `baseBeat` before `physBeat`, the `quickStrikes` pre-pass in the queue, and one `syncMeleeMarks` line in `FxLayer.tsx`. The kit is C's `PhysKit` plus `centre`, `sawThen` and `seesUnit`.
- **Credits:** no new files. One line in `fx/fxCredits.ts`: "Melee technique effects (arcs, trails, links, guards, clash strokes, cracks, shards) drawn in the game (SVG and CSS) over the Particle Pack sprites". The `what` text of the `ignasd` and `artisticdude` sound entries in `sfxCredits.ts` also gets "(Break's shatter)" and "(Draw Cut)".
- **Tests:** engine (each technique emits its `melee_fx` with the fields above, exactly once; a preview emits none; a fog-stamped `seen`); web unit (`meleeTechBeat` matches the table and stays inside the budget; `quickStrikes`; handlers draw nothing for fogged tiles; reduced motion makes no transform animations; `meleeMarksOf` for each mark and its removal); browser (`e2e/physical.mjs`: a Sweep, a Throw, a Bind then Throw Down, and a Run Through left in each leave their mark on the layer, and the queue's total time for a 3-technique turn stays within the budget).

## 7. Budget

Per technique, the extra queue time is **at most one beat of 260 ms at Normal (221 at Fast)**, and most are under 200. A full 6 AP melee turn of three techniques adds at most 780 ms at Normal over today. The multi-strike techniques come out faster than today, because their later strikes play chained: a three-target Sweep is 210 − 2 × 212 = **−214 ms** against today. Throw and Charge ride beats that already play. Nothing plays during an AI turn that a player can't see, because `at()` and `seen` already drop it.

## 8. Requests for the lead (outside melee/)

1. **Export `chained`** (or give `strike` a `chain` option) so that the later strikes of Sweep, Cleave and Flurry carry the engine's own `chain: true`. Then the client's `quickStrikes` pre-pass can go.
2. **Lunge's Heavy push** is in the lead's reference handler. One `meleeFx(t, 'force', …)` line after its `stop(…'push')` is needed. I'll add it unless you'd rather do it.
3. The **thrown-melee `gunOf` fix** (section 5) touches `play.ts`. It's a bug fix, not a shape change, but it's your client's shared file.
