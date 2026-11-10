# Physical 2.0, implementer A: the melee technique effects (built)

Branch `claude/awesome-babbage-8gngk8` (A, with the base and C's client merged in). Built 10 Nov 2026 from the design in [`physical-2.0-A-FX.md`](physical-2.0-A-FX.md). This note is the hand-off for the lead and for C: why these effects exist, what changed where, and what is left.

## 1. Why Leon asked for this

Leon asked (10 Nov 2026): **"we using new effects for these?"**

The honest answer was no. The 23 melee techniques only reused the plain melee swing, the shove and the stance effects. C's part 4 (`physical-2.0-C-client.md`) only adds the technique's name over the unit, plus one stronger beat for a Finisher or a Take. I pushed back on that: **half the techniques move people or things, and the reused swing doesn't show what happened.**

- A Sweep that hits three people looked like three separate Cuts.
- A Throw played **a pistol shot and a bullet tracer** (a real bug, section 4).
- A Bind left no mark that the two units are locked together, and a weapon left in a nailed unit was invisible.
- A Parry looked like the hit went through, just with a smaller number.
- A Throw Down, a Drag and a Shove showed a token sliding, but not who did it, or the direction it went.

Leon's answer: **"they are both busy, but C seems to have done implementing, so make these effects on your branch and push it with a handoff that describes why I request this."** So A built them here, on top of C's merged client, without changing C's files beyond the registration lines (section 3).

The goal: **one clear beat per technique that shows what the rules did, with no extra waiting.** A melee turn gets at most one short beat longer per technique (260 ms at Normal at most). The multi-strike techniques (Sweep, Cleave, Flurry) are now *faster* than before, because their later strikes play at the chained beat.

## 2. What each technique shows now

All of it is plain SVG and CSS (arcs, lines, links, rings, trails, chevrons, brackets, shards, cracks), laid over the **already credited** Kenney Particle Pack sprites (dust, dirt, spark bursts, flash star, flash crit, flare) and the weapons' own monoline icons. Every sound is one already credited. No new asset was needed (CLAUDE.md asset rule).

| Technique | The beat | Lasting mark |
| --- | --- | --- |
| Sweep | A white arc band sweeps across the swept tiles and leaves a fading wedge (Heavy: a full ring). A struck ally gets an HP-red ring, as a friendly-fire warning. | |
| Cleave | A white cut that runs from the first target through each extra, in order, bowed toward the user. | |
| Throw (and Flurry's Thrown line) | The weapon's own icon spins along a shallow arc to the target, then drops into the pile on its tile. | |
| Bind, Bare grapple | A Strength-ink double link with a knot snaps from the user to the target. | The link stays while the hold lasts and tears when it ends. |
| Throw Down | The hold tears apart, a skid shows the body's path, then a shock ring, dust and dirt, and a jolt on the landing tile (and a red ring on anyone slammed into). | |
| Shove, Drag, Bash (Heavy push), Lunge (Heavy push) | A tapered Strength-ink skid along the real path, with chevrons the way it went. A Drag swap draws two crossing arrows. | |
| Trip, Charge's Prone, Hamstring (Hook), Throw (Heavy), Keep Back (Hook) | The token tips and drops, with a puff of dust. | (the token's own prone badge) |
| Parry | Two white strokes snap shut into an X between the two units, with a spark and PARRIED. A lost parry shows one muted stroke and THROUGH. | |
| Run Through | A white thrust line through the target (and on behind it, with Point), then a pin mark. | With Reach, the weapon left in is drawn stuck in the token at 35° (with "2 AP", the cost to pull free). It falls when it is pulled out or the unit goes down. |
| Feint | The user jabs, then white corner brackets close on the target, or NOT FOOLED. | The brackets stay for the rest of the turn. |
| Guard | A Body-amber arc rises on the front side (Heavy: a second arc; Reach: a dotted ring at 1 tile). | The guard stays raised while it holds, which is until the user's next turn, the turn its Momentum is held for. |
| Sidestep | An Agility-ink afterimage on the old tile and speed lines along the step. | |
| Keep Back | A white reach line from the holder to the mover, a crossbar where it stops, and the mover snaps back. | |
| Half-Sword | A narrow white thrust into the target and on through it (the armour ignored). | |
| Sunder | Muted armour shards chip off the far side and fall, a muted spark, and ARMOUR was → now. | |
| Flurry | Two or three thin white cuts cross the target, 70 ms apart. | |
| Draw Cut | A white draw streak out of the token's side, with a flare at its tip. | |
| Ambush | A dark streak from where the user was hiding, the user snapping into view, and a flash on the target. (Bare: the grab's link.) | |
| Break | Five jagged white cracks burst across the target, a flash, a spark burst, a screen jolt, and with Blunt, ARMOUR 0. | |
| Charge | Agility-ink dash lines run along the route behind the runner, with dust where it started. | |
| Cut, Lunge, Coup, Riposte | Unchanged: the swing and C's name float already say it. Lunge's Heavy push gets the skid. | |

Frames of every one are in the e2e's shot folder (section 5).

## 3. What changed, where

### Engine (A's own code, `packages/engine/src/physical/melee/*` only)

- `melee/shared.ts`: `meleeFx(t, beat, data)` emits **one new event kind, `melee_fx`** `{ unit, id, beat, at, …data, seen: { pc, foe } }`. A preview emits nothing. `seen` is stamped as it happens (the same way `turn` and `stance` do it), and the view keeps only the viewer's side of it (`sightOwn`). `fxMark` and `movedSince` read a forced move's real path from the core's per-tile `shove` events, so the core needed no change. `fallFx` emits a `fall` only when a unit really went Prone just now. `refuseFx` marks a beat refused when the strike after it refuses, so the client plays nothing for it.
- One call in each handler at the point the design names. **Event budget:** at most two `melee_fx` per use (the beat, and at most one `fall`), so the 40-event `FX_CAP` is safe.
- No core event shape changed. Every position in an event is a tile key and every unit is an id, so the client can fog-check each one.

### Client

- **New** `apps/web/src/game/fx/melee-techniques.ts`: `meleeTechHandlers(kit)` (one handler for `melee_fx`, dispatched by beat), `meleeTechBeat(e)` (pure; the beat table), `quickStrikes(evs)` (pure; marks the later strikes of a Sweep, Cleave or Flurry `_quick`), `meleeMarksOf(g, seen)` (pure; the lasting states from the saved state) and `syncMeleeMarks(items)` (the standing layer, one SVG in viewport pixels, kept in step with the state on every render, never in the queue). It also writes the test hook `window.__phcMeleeFx` `[{ id, kind, at, drawn }]`.
- Registration, the same way C's `physical.ts` is registered: in `fx/play.ts`, `Object.assign(H, meleeTechHandlers(…))` after `physHandlers`, `meleeTechBeat` in `baseBeat` before `physBeat`, `_quick` read as `chain` for `melee` and thrown `shot`, and `quickStrikes` at the start of `queuePlain`. In `fx/FxLayer.tsx`, `syncMeleeMarks` beside `syncAmbient`, cleared with it.
- **Time.** Every duration and delay goes through `fx/dom.ts` (`after`, `anim`, `put`, `burst`, `ring`, `floatText`), so the combat speed (`combatSpeed.ts`) and the spotlight cut-in's slow-mo both apply. The unit test checks that every duration at Normal is the Fast one ÷ 0.85. Nothing waits on an animation, and the standing layer is not in the queue, so `window.__phcHold` is only ever extended by the beats in the table.
- **Reduced motion.** Nothing travels, rotates, scales or shakes. Each beat shows its end state and fades (tested: no transform, translate, rotate, scale or dash keyframe is started).
- **Fog.** Every point goes through the kit's `at()` (null in the fog). A line between two units needs both ends seen. The user's own part (the jab, the draw, the guard, the afterimage, the ambush streak) also needs the engine's `seen` stamp. The standing layer shows a unit of the other side only on a seen tile and not Hidden, and a link only when both ends are seen.
- **A dark edge.** Every stroke has a thin dark drop-shadow (one CSS filter on each SVG), so white lines read over bright portraits.
- **Credits:** one line in `fx/fxCredits.ts` (the effects, drawn in the game over the Particle Pack and the weapon icons). In `sfxCredits.ts`, the shatter now says "Break's shatter" and the sword unsheathe says "Draw Cut".

## 4. A bug fixed on the way: Throw played a gunshot

`fx/play.ts` `gunOf(id, cat)` fell through to `{ sound: 'gun_pistol', look: 'bullet' }` for any category it didn't know. A thrown melee weapon's `shot { thrown: true }` has `cat: light_melee` (or heavy, or polearm), so **Throw and Flurry's Thrown line played a pistol shot with a bullet tracer.** Now a melee or unarmed category gives `{ sound: 'swish', rate: 0.8, look: 'thrown' }`, with no muzzle flash and no tracer: the flight is the `melee_fx` throw's weapon icon. This is the only behaviour change in `play.ts`.

## 5. Tests

- **Engine** (`packages/engine/test/phys-melee-fx.test.ts`, 16 tests): each technique emits its beat exactly once, with the fields above (the arc's tiles and everyone struck, allies too; the real paths of a Shove, a Drag swap, a Bash push and a Throw Down; the landing tile and the occupant; the Parry's won or lost after the swing's own `melee`; Run Through's weapon left in; Feint fooled or not; the Guard's front; the Sidestep's from and to; where Keep Back held the mover). A preview emits none and changes nothing. A refused technique leaves no beat. A hidden user's `seen.foe` is 0, and a view keeps only its own side's stamp. At most two per use.
- **Web unit** (`apps/web/src/game/fx/melee-techniques.test.ts`, 12 tests): the beat table and its budget, `quickStrikes` (and that it never changes the saved events), one element per beat for every technique (and cleaned up after), the right look (the ally's red ring, the weapon icon's data URI, the Strength-ink link, PARRIED, THROUGH, ARMOUR, NOT FOOLED), nothing drawn in the fog or for an unseen user, durations × 1/0.85 at Normal, reduced motion, and the standing marks read, drawn and taken away.
- **Browser** (`apps/web/e2e/melee-fx.mjs`, new): in the Proving Ground, each technique is used for real through `combat/technique` (weapons from `sandbox/give`, Momentum from `sandbox/meter`), and its beat must draw its element (`[data-melee-fx]`) and be recorded drawn. When the dice don't give the beat (a miss, a save made), it is tried again on a fresh turn. The Bind link, the nailed lance and the raised Guard must stand on the layer (`[data-melee-mark]`). Keep Back and Parry are played on the enemy's turn with the AI on. Frames of every technique (deviceScaleFactor 1) go to `SHOTS` (default `e2e/shots/melee-fx/`). `ONLY=sweep,parry` runs a few cases.

The results of the full runs are in section 7.

## 6. Requests for the lead (outside melee/)

1. **Export `chained`** (or give `strike` a `chain` option), so that the later strikes of Sweep, Cleave and Flurry carry the engine's own `chain: true`. Then `quickStrikes` can go.
2. **A Throw Down occupant's fall.** The occupant's Prone is the core's `stance` word only. The slam's ring covers it, but a `fall` would need a third event a use, past the budget. Leave it unless you want the budget at three.
3. **The thrown-melee `gunOf` fix** (section 4) is in C's shared `play.ts`. It is a bug fix, not a shape change.
4. **C's part 4 name float and the Finisher ring** still play alongside these. They read well together in the frames. If either feels like too much, the Finisher ring is the one to drop for Break and Throw Down, which have their own impact.

## 7. Runs (10 Nov 2026, local dev server)

- `npm test -w @phc/engine`: 2116 pass, 1 fails. The failure is `phys-core.test.ts` "a new character knows the defaults…" (it expects "Not built yet." for a technique that is now built). It fails the same way on this branch without these changes. `phys-melee-fx.test.ts`: 16/16.
- `npx tsc --noEmit` in `packages/engine` and `apps/web`: clean. `npm test -w @phc/web`: 77 files, 680 pass (12 of them new). `python3 tools/validate.py data`: 0 errors.
- `e2e/melee-fx.mjs`: **27/27 on two consecutive full runs** (the last two, after the retry counts were raised). Earlier runs each had one case that ran out of dice retries (a Bash push, a Trip, a Keep Back), so the default is now 8 tries a case (10 for Bash's push, 8 rounds for the Answers). A case retries on a fresh turn and says why in a `note` line.
- C's suites and the others: `physical` 33/33, `gear-icons` 14/14, `combat-fixes` 9/9, `cutins` 37/37, `clarity` 48/48, `brass` 17/17, `sandbox` 33/33, `two-players` clean (no errors on host or guest). `reload` 19/21: its two tactical-card checks fail the same way with these changes stashed, so they are not caused by this work (flag for C or the lead).
- **Frames:** every technique was recorded at deviceScaleFactor 1 and looked at. The first round showed three problems, which are fixed: the thrown knife's icon was too small to read (now 0.95 of a tile, with a dark outline); the weapon left in a nailed unit was invisible over the portrait (now 0.9 of a tile, outlined, at 35° out of the token's top right); and the Bind's link was hidden under the two tokens (now shorter inside each token, thicker, with a bigger knot). Every SVG now has a thin dark edge (one CSS drop-shadow), so the white strokes read over bright portraits. A decided fight plays only its last six events (the existing rule), so a technique that ends the fight may not show its beat. The e2e uses elites so that doesn't happen.
