# Faith 2.2 "the god shows up": hand-off (rules 1.6.3, decision 110, branch `feature/faith-presence`)

The design is `docs/design/faith-presence-spec.md` (Leon's accepted direction, 9 Nov 2026). Once written into the rules
spec, `docs/rules/PHC-Core-Rules-v1.0.md` wins.

## Part 1: spec, data, engine (done)

- **Spec:** the 1.6.3 revision note; Witnessed and Interventions rewritten; the grant bank in the voice lines; the patron
  table's intervention column and the condition row; items 603, 608 and 620 superseded; section 14 items 738–746, all
  PROVISIONAL. Decision 110.
- **Data:** `patrons.json` `prayer.witnessed.until = [fight_end, intervention]`; the `prayer.intervention` block (once a
  fight, twice from Devotion 7; 20 + 4 × Devotion, × Blessing power); the widened triggers (the Quartermaster's
  `you_reload`, `core_dry`, `mp_out`; the Laughing Mask's `enemy_misses_you`); the 11th line bank, `grant` (24 lines, `{name}`).
  `conditions.json` Witnessed. `tools/validate.py` checks all of it.
- **Engine:** the fx events the web reads, with no engine call:
  - `miracle {patron, id, at, area, unit, char, name, text, line, summary}` (item 746): emitted before the Miracle's own
    effects; `line` (the grant line, name in capitals) and `summary` (what it did) are filled in after them.
  - `intervention {unit, patron, trigger, target, amount, at}` (item 744).

## Part 2: the web, the Miracle's cut-in and the cut-in system (done)

**Files**

| File | What |
|---|---|
| `apps/web/src/game/cutIn.ts` | The cut-in system: `showCutIn(opts)`, `cutInTiming(size)`, `lineParts(line, name)`, `miracleCutIn(fxEvent, ctx)` (pure: the Miracle's options from its fx event), `playIntervention(event, kit)` (the section 3 hook), `closeCutIns()` |
| `apps/web/src/game/cutIn.test.ts` | Unit tests: the options from a Miracle event (portrait, accent from `patrons.json`, name, line, focus, box, sound; fog sends the view to the map; a story Miracle lands on the devoted's token); the render (portrait, the name in `--faith-light`, the line); the landing, the zoom and the box; skip by key (the key does nothing else, the queue moves up) and by click; reduced motion; `closeCutIns`; the small cut-in; the intervention hook; `hurryFx` |
| `apps/web/src/game/fx/faith.ts` | `miracle` calls `showCutIn(miracleCutIn(e))` and pours the answer onto the area when it lands; `intervention` calls `playIntervention`; `faithBeat('miracle')` is the cut-in's landing time, so the Miracle's effects play as it lands. `miracleOverlay` stays as a wrapper |
| `apps/web/src/game/fx/play.ts` | The characters' names for the kit; `hurryFx(ms)` (a skipped cut-in moves the queue up; the turn hold and the idle signal move with it); `clearFx` closes every cut-in |
| `apps/web/src/game/sfx.ts`, `sfxCredits.ts`, `fx/fxCredits.ts` | The `miracle_sting` sound; the credits |
| `apps/web/e2e/faith-pg.mjs` | The Miracle in the Proving Ground: the cut-in (portrait, larger than the map, z-index 90, the name in the faith light, the grant line in large Spectral), the landing, the box closing itself; a second Miracle skipped with a key, the box closed with a click |

**The Miracle, beat by beat** (`cutInTiming('full')`; reduced motion in brackets)

| ms | What |
|---|---|
| 0 | The sting (`miracle_sting` with `soul_choir` under it); the screen dims, tinted toward the patron's accent; rays (two layers, the accent and the gold, turning slowly), the halo behind the head, motes rising in front; a white flash [no flash, no turning, no motes] |
| 0–450 | The portrait (`patronPortrait(id, true)`, the 800 × 1000 painting; the mark when there is none) cuts in at 118 vh tall, larger than the combat map, above everything (z-index 90), its edges melting into the light; it drifts in slowly [a fade] |
| 280 | The words: `<PATRON> · MIRACLE · <NAME OF THE MIRACLE>` in Virtue ink, and the grant line in Spectral 26–52 px with the devoted's name in `--faith-light`; "CLICK OR PRESS ANY KEY TO SKIP" |
| 1850 | The tile is scrolled into view under the portrait (`phc:focus-tile`, `mine: false`) |
| 2300 [2000] | The pull-away: the portrait shrinks into the tile where the Miracle lands, an iris (a radial-gradient dark) closes on the tile and opens, the map grid punches in on it (scale 1.16 and back). The overlay stops taking input here [a fade, no zoom] |
| 3000 [2250] | It lands: the overlay is gone, the gong, a ring and rays on the area; the fx queue plays the Miracle's own effects (heals, damage, shields) |
| 3500 [2450] | The box: `MIRACLE · <PATRON>`, the Miracle's name, its text, and WHAT IT DID (the engine's summary; "The Narrator rules the rest." when part is the Narrator's). It closes itself after 2.4 s [3 s] or on a click |
| ~5.9 s [~5.5 s] | All gone |

- **Focus:** the Miracle's `at` when the viewer can see it (fog: `at()` is null), else the devoted's token (a story Miracle
  on the area map), else the map's centre. In the story the zoom lands on the minimap or the area map, whichever is on
  screen.
- **Skip:** a click on the overlay or any key (Ctrl and Cmd shortcuts still reach the browser). It lands at once, the box
  still follows, and the fx queue moves up by the time saved (`hurryFx`). The key is swallowed so it doesn't also act.
- **Never blocked:** the overlay takes clicks only until the pull-away; every node has a timer that removes it; a new
  game, a left room or a hidden tab (`clearFx`) closes everything.
- **Everyone sees it:** it is the `miracle` fx event, played by every screen's FxLayer like any other effect.
- **The grant line in the log:** kept. The cut-in shows it, and the engine's `patron_line {event: 'grant'}` still makes a
  card in the combat or story log. The log is the record; a skipped cut-in leaves nowhere else to read it. (Decision 110.)

**Assets** (the project's sound and VFX rule: sourced, credited, only tints, rings, lines and panels in CSS)

| File | Source | Licence |
|---|---|---|
| `apps/web/public/fx/rays.png` | "Sunbursts / 2D Rays" (`sunburst_blackandwhite.png`) by simranzenov, https://opengameart.org/content/sunbursts-2d-rays; blurred and faded at the rim into a white alpha mask, 512 px | CC0 |
| `apps/web/public/fx/halo.png`, `mote.png` | Kenney's Particle Pack (`light_01.png`, `star_06.png`), via https://opengameart.org/content/particle-pack-80-sprites (kenney.nl refused the download from here); white alpha masks | CC0 |
| `apps/web/public/fx/glow.png`, `magic_star.png` | Already shipped (Kenney's Particle Pack) | CC0 |
| `apps/web/public/sfx/cb/miracle_sting.ogg` | `30_revive_03.ogg` from "8 Heals and Buffs SFX" by leohpaz, https://opengameart.org/content/8-heals-and-buffs-sfx: the first rising run (2.8 s), mono, levelled. Master and the ffmpeg line in `audio/sfx/` and `audio/README.md` | CC BY 4.0 |

All four are in the Credits page (`fxCredits.ts`, `sfxCredits.ts`).

**Checks run (part 2):** `npm test -w @phc/engine`, `npm test -w @phc/web`, `npm run typecheck`,
`python3 tools/validate.py data` (0 errors); e2e `faith-pg.mjs`, `faith.mjs`, `heart.mjs`, `two-players.mjs`, all green.
A story Miracle on the area map and the reduced-motion run were checked by hand with screenshots.

## The trigger for the intervention cut-in (spec section 3, not built: Leon's "leave a trigger here")

**Where:** `playIntervention(e, kit)` in `apps/web/src/game/cutIn.ts`. `fx/faith.ts` already routes every `intervention` fx
event to it. Today it plays the old look plus words: a sharp bell, the patron's mark flashing at the trigger's tile, and
"<PATRON> INTERVENES" floating there. The function's comment points back here.

**What to build there** (the draft, from the spec):

1. Call `showCutIn({ size: 'small', ... })`. The small size already exists as a working draft (tested in `cutIn.test.ts`):
   a panel from the left edge, a third of the screen wide (`min(33vw, 420px)`), the portrait cut on a diagonal, never
   over the map's centre, `pointer-events: none` throughout (it never blocks input), about 1.5 s, and **one at a time**:
   a second small cut-in waits in a queue until the first has gone.
2. The options:
   - `id: e.patron`, `portrait: patronPortrait(e.patron, true)`, `mark: patronMarkUri(e.patron)`,
     `accent: accentOf(e.patron, FAITH_PATRON[e.patron].accent)`;
   - `kicker: '<PATRON NAME> INTERVENES'` (the spec puts this in the accent; the small layout already does);
   - `line`: the patron's `intervention` line. The engine speaks it as the `patron_line {event: 'intervention'}` fx event
     right after the `intervention` event; either look it up from the next event in the batch, or add the line to the
     `intervention` fx payload in `packages/engine/src/faith.ts` (one field, no dice: `speak()` picks it; the cleaner fix);
   - `focus: null` (the view does **not** zoom);
   - `box: { title: '<Patron> intervenes: <what>' }`, one line, e.g. "Old Overcast intervenes: 48 Storm to the drill
     sergeant", from `trigger`, `amount` and the target's name (the kit's `posOf`; add a `nameOf` like the Miracle's);
   - `sound`: a short bell (the existing `hit_metal` at rate 1.7, or a sourced, credited sting).
3. Keep the map effect (the bell, the mark, the flash) playing at once, beside the cut-in: the effect itself (the Storm,
   the free reload, the save at 1 HP) is the engine's own fx events right after.
4. Leave the `intervention` beat in `faithBeat` short (650 ms): the small cut-in never holds the queue.
5. Add an e2e check like the Miracle's in `apps/web/e2e/faith-pg.mjs`: its Old Overcast section already provokes an
   intervention (a kill while Witnessed); check `[data-phc-cut="small"][data-phc-cut-id="old_overcast"]` shows the
   portrait and "OLD OVERCAST INTERVENES", that it is gone within 2 s, and that a click on the map still works while it
   is up. Take a screenshot and look at it.

## Not done yet (the rest of section 2, for the next part)

- **2.1 A Whisper:** the Whisper's prayer icon over the praying character's head (fx/faith.ts `prayer`, kind
  `whisper`: today it draws the icon over the target).
- **2.2 A Hymn:** a square crop of the patron's portrait over the head, framed in the accent, ~1.5 s; greyed on a miss.
- **2.4 The faith tab header:** the portrait beside the Devotion meter, the lightbox on a click.
- **2.5 Pact, switch, farewell and grudge cards:** a small portrait; a grudge's banner greyed.
- **2.6 Voice-line cards:** a small round crop of the portrait instead of the mark.
- **Seen in the screenshots, not fixed here:** after a Hymn, the combat card's condition chip reads "WITNESSED · 99"
  (the until-the-fight-ends duration shown as a number); the spec wants "WITNESSED · UNTIL THE FIGHT ENDS OR <PATRON>
  ACTS". The fix belongs with the condition's display (part 1's `ends_on`), in the next part.
- **Docs:** `docs/HANDOFF.md`, `docs/ROADMAP.md` and `CHANGELOG.md` are not updated, and there is no version bump:
  whoever merges the branch does both.
