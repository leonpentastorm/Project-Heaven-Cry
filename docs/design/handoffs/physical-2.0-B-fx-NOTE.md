# Physical 2.0 B: why the ranged implementer is doing the ranged effects

Branch `claude/physical-2.0-B-ranged-fx`, started 10 Nov 2026 from `feature/physical-2.0-C-client`.

## What Leon asked, and why

Implementer C pushed the client (`feature/physical-2.0-C-client`). Leon read it and the code reviewer's report. His
verdict: **the effects are minimal**.

C's Part 4 (`apps/web/src/game/fx/physical.ts`, about 100 lines) does four things:
- floats a technique's name over the unit;
- pulses the Pressure pips;
- rings a held Watch and puts a crosshair on its target;
- floats a few words (Stopped, the drill, Momentum).

The technique's own shot is still today's plain shot. On screen, a Burst, a Rake, a Mag Dump, a Punch Through, a
Called Shot or a Lob is a label over an ordinary shot. Nothing shows what the technique did differently.

So Leon asked each lane's implementer to make the effects for its own techniques, because they know what each technique
really does:
- **B** (ranged, this branch) makes them for the 25 ranged techniques, the quiver and the thrown weapons;
- **A** (melee) makes them for the melee techniques.

His words: "C has push his shit and from what i can tell from code reviewer the effects is minimal, start a branch
working on effects for your ranges techniques and push it, the melee implementer have also been asked to do this."

## Rules this branch follows

- **Leon's asset rule (CLAUDE.md):**
  - an effect is made in the game only when it works as plain SVG or CSS (rings, lines, tints, pips, strokes);
  - anything with texture (fire, smoke, sparks, debris, impacts) comes from a CC0 or CC BY 4.0 asset, credited in
    `fxCredits.ts` / `sfxCredits.ts`;
  - never NC, ND or "personal use".
- **C's brief, Part 4:**
  - keep the effects short; a gunner's turn must not get slower than it is today;
  - follow the combat speed setting.
- **Clashes with A:**
  - ranged effects live in their own file beside C's `fx/physical.ts`, so A's melee file and this one don't collide;
  - registration in `fx/play.ts` is one additive line each.
- **The engine is B's:**
  - the effects key on the events the ranged lane emits (`claude/physical-2.0-B-ranged`) and on C's `technique` event;
  - where an effect needs an event the engine doesn't send yet, the event is added on the B engine branch, not faked in
    the client.

## What was built

Code: `apps/web/src/game/fx/ranged.ts` (handlers, tagging, beats), `fx/rangedParts.ts` (the SVG and CSS pieces),
`fx/ranged.test.ts` (39 tests). In `fx/play.ts` the edits are additive: the import, one `wrapRanged(...)` line (its kit
also lends `seesUnit`), one `rangedBeat` line in `baseBeat`, one `rangedBatch` line at the top of `queueFx`, and a
`resetRanged()` in `clearFx`. `physical.ts` (C's file) is untouched. A's melee lane gets nothing from this file: a
push, an object hit or a condition is decorated only when it belongs to a ranged technique's own action.

How a shot is tied to its technique: `queueFx` hands each batch to `rangedBatch`, which tags the batch in the engine's
order before anything plays. A technique's record ends with its action, in any of these cases:
- the batch ends;
- the technique's rolls are used up;
- a Burst's later shot comes unchained;
- a Mag Dump or Watch shoots at a new target;
- a Rake shoots at a target a second time;
- the user starts a new volley, reloads, walks again, or swings.

A new stream (another fight, the area map) or a numbering that goes back (a restart) forgets everything.

Beats are written at Fast (Normal is ×1.18). A plain technique adds at most about 130 ms.

### Per technique

| Technique | What it shows |
|---|---|
| Shot / Aimed Shot | Aimed: a thin aim line, then a glint at the muzzle. A plain Shot is today's. |
| Snap Shot | A quarter arc swept round the gunner outside the token's rim, on an ink under-stroke, with a whip and a rack sound (+60 ms beat). |
| Burst / Walking Fire | Each later roll lifts the token, and a white −1 / −2 flicks off the muzzle. Walking Fire draws its route from the gunner to the tile. |
| Called Shot | A reticle closes on the part (head, arm, leg) and a flash lands there on a hit. The part word sits beside the token, clear of the damage number. |
| Punch Through | The cover bursts as the round passes: debris along the shot, chips, a crack that stays 2.4 s, the material sound, COVER −N. Heavy: the round carries on into the next unit in line, whose hurt waits for it. |
| Lob | A dashed arc, a reticle on the tile, a smoke trail along the grenade's flight, and the blast's radius box. Each grenade lands as what it is: smoke covers the whole radius box with large puffs; flash and scrambler show their own burst, not frag. |
| Suppress | One roll, three rounds: two more tracers crack past within half a tile, and dirt kicks up at the target's feet. |
| Rake | One recording for the run, and a sweep stroke through the targets in order. The later rolls are chained and silent; each beat is shorter than a shot's. |
| Warning Shot / Rout | A tracer over the head, never MISS. An inked stroke marks the near miss over the head, a dust kick lands behind the target, with a whiz. A Loud Warning Shot rings the target. Rout: the routed unit runs with speed streaks and the word ROUTED. |
| Flush | The round lands in the cover and the cover bursts as it lands (a heavier double burst). The target flinches away and shakes. Flush Arc: a dashed arc drops onto the target. |
| Mag Dump | One stream: up to 12 tracers, climbing and spreading. Brass pours out, the gunner judders, the barrel smokes, the dry click, and the Heat strip rises (HEAT 7/8). It plays shorter than today's 4 × 400 ms. |
| Crossfire | Lines from the ally and from the gunner, with an X where they meet. |
| Bead | A held line to the target, a reticle, and a SIGHTS HELD chip under the gunner. A lost Bead: the line snaps, BEAD LOST · WHY. |
| Spot | A pin drops on the target (dashed when only your side sees it), with two pings and SPOTTED. |
| Brace | The token settles, and two strokes plant the feet below its HP bar. Auto: SUPPRESS +1. |
| Load Special | The round's name on a chip under the gunner, and a ring. The round is spent by the next Fire technique's first shot from that hand, which shows it along its flight: incendiary fire bursts (fireflash), AP sparks, hollow-point and broadhead red, enhanced glow. |
| Shift | A muted dashed route, UNHEARD, and muted streaks. |
| Vent | Steam puffs over the token, the vent sound, and the Heat strip draining (HEAT 6 → 2) under the token. |
| Head Down | The token ducks inside a shrinking ring. The Watch it drops ends quietly. |
| Dead Centre | A reticle whose dot turns red, then a crit flash and a screen shake on the hit. COVER IGNORED when the target is Suppressed. |
| Pin Down | Stakes driven down at the target's corners, or an X staple when nailed (NAILED · 2 AP). |
| Stopping Shot | Chevrons push the target away on the hit. −N AP shows only when the engine sends `apLoss` (E15). |
| Storm | A red dashed charge line, NO REACTION on the target, and speed streaks on the walk. |
| Last Round | C's name, the dry click, and a FREE RELOAD chip under the gunner on a kill (no bow). |
| Overwatch / Deny / Cover Me / Dead to Rights | Set: a radar sweep; the denied tiles hatched in red with a lane line; lines to each covered ally with chevrons; a red line to the target with a reticle. Fired: a flash snap line from the holder. Cover Me: the covering burst (three short tracers, dirt, COVERED −2). Dead to Rights: FIRST · WHY. Broken: the ring splits (WATCH LOST · SMOKE GRENADE). It ends quietly when it fired, was replaced, the turn came round, or the holder went Head Down. |

A loose round that jams the gun shows JAMMED and the dry click. In combat, a Hidden actor's Watch, Bead, Heat and
round draw nothing and hold no beat.

### New assets (all CC0)

- **Earth Impact - Magic Effect** by Cethiel, CC0, https://opengameart.org/content/earth-impact-magic-effect.
  - The cover debris: `public/fx/debris_1..4.png` and `debris_chips_1..2.png`.
  - Recoloured to white so the game tints it by material.
  - Credited in `fx/fxCredits.ts`.
- **Impact Sounds: impactMetal_light** by Kenney (www.kenney.nl), CC0, https://kenney.nl/assets/impact-sounds.
  - The brass tinkle.
  - Credited in `sfxCredits.ts`.

Everything else is either drawn as SVG or CSS (lines, arcs, reticles, stakes, the strip, pins, chevrons, cracks) or
reuses sprites that are already credited (Kenney's Particle Pack and Smoke Particles: dust, dirt, flame, fireflash,
puff, smoke).

### Events for the lead (the engine branch `claude/physical-2.0-B-ranged`)

The list is `EVENTS_FOR_THE_LEAD` in `ranged.ts`. Each effect works without its event and gets better with it.

1. E1: technique `line`, `opt`, `ammo`.
2. E1a: shot `tech`, `vi`. This is the most important one: it replaces the client's guesses at where an action ends.
3. E2: `swap_in`.
4. E3: `carry`.
5. E4: `volley` with mode dump, rake or suppress, and the rolls chained.
6. E5: `save` {ok}.
7. E6: `lane` / `lane_end`.
8. E7: `heat` with why `dump`.
9. E8: technique `with`.
10. E9: shot `round`.
11. E10: `routed`.
12. E11: `free_reload`.
13. E12: `covering: true` for Cover Me's round, instead of `cover: true`.
14. E13: `watch_fire` `why`.
15. E14: object `max`.
16. E15: stopped `apLoss`.
17. E16: load `weapon` and `hand`.
18. E17: `only` (or `seen`) on `watch_end`, `bead`, `bead_end` and `heat`, for a holder the other side can't see. `watch_set` already has it.

Engine issues outside the effects:
- `weaponSwapper()` is never registered, so Snap Shot can't draw a stowed weapon.
- A passed save emits nothing.

### What is untested

Nothing here has run against the real ranged handlers: they aren't merged into this branch yet. The effects were
driven by feeding the events those handlers emit:
- in unit tests (jsdom);
- in Proving Ground screenshots, by queueing the events by hand.

Not covered:
- Enemy turns where an AI fires a technique and then a plain shot in the same batch. The heuristics in `endsAction` cover the cases in the review, but a Mag Dump followed by a plain shot at the same target in one batch is still tagged to the dump. E1a fixes it.
- A Spread weapon's Load Special. Every shot of that Fire carries the round, but the client shows it on the first shot only (needs E9).
- Reduced motion. It was only checked that the effects fade.
- Two browsers, where events reach the second client late.
