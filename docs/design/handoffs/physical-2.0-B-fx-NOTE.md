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
