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
| 3500 [2450] | The box: `MIRACLE · <PATRON>`, the Miracle's name, its text, and WHAT IT DID (the engine's summary; "The Narrator rules the rest." when part is the Narrator's), at the top of the map's visible part (never over the action column, the FAITH tab or the story composer; high in the middle with no map on screen), under the dialogs (z-index 46: the Wave-cleared modal is 48). Clicks go through it; it closes itself after 2.4 s [3 s] or on its × |
| ~5.9 s [~5.5 s] | All gone |

- **Focus:** the Miracle's `at` when the viewer can see it (fog: `at()` is null), else the devoted's token (a story Miracle
  on the area map), else the map's centre. In the story the zoom lands on the minimap or the area map, whichever is on
  screen.
- **Skip:** a click on the overlay or any key (Ctrl and Cmd shortcuts still reach the browser). It lands at once, the box
  still follows, and the fx queue moves up by the time saved (`hurryFx`). The key is swallowed so it doesn't also act.
  A key typed into a text box (a co-op partner or a human Narrator typing when someone else's Miracle arrives) goes
  through and skips nothing, and a lone modifier (Shift) skips nothing.
- **The queue:** a Miracle is a fixed hold in `queueFx`: never sped up or skipped, and what follows it in the batch (its
  effects) is planned on its own from the landing, so a Miracle on a crowd or one that ends the fight never plays its hits
  under the portrait; in a decided fight (`keep`) what came before it is skipped and its own effects all play.
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

## Part 3: the web, the rest of section 2 (done)

**Files**

| File | What |
|---|---|
| `apps/web/src/game/faithArt.ts` | `PORTRAIT_FACE` (each painting's face or mask: centre and side as fractions, picked by eye from the eight 800 × 1000 paintings), `faceOf`, `faceImgStyle(patron)` (places the 4:5 `<img>` in a square box so the face is centred), `patronFace(patron, large?)` (`{src, imgStyle, painted}`; the mark, whole, where there is no painting) |
| `apps/web/src/game/fx/faith.ts` | `whisperOverHead(id, p)` (2.1) and `faceOverHead(patron, p, {accent, miss})` (2.2), used by `prayer` and `prayer_fail`; story prayers resolve the character's token on the area map (`posOfChar`); Witnessed's eye waits for the face over the same head; the REFUSED / UNANSWERED word rises from below the token |
| `apps/web/src/game/faithView.ts` | The Faith panel model carries `patronId`, `portrait`, `portraitLarge`, and the grudge's `patron` and `face` |
| `apps/web/src/screens/faithTab.js` | The story faith tab's header portrait (the `patron` lightbox); `faithEventOf` / `faithEventCard` (the pact, switch, grudge and apostasy cards, from the engine's heads); `FACE_BOX`; the voice-line card's round crop; the meter's gate words on one line |
| `apps/web/src/screens/faithCombat.js` | `faithHeadVals` (the fight's FAITH tab header: portrait, Devotion words and XP, Witnessed in words); the combat log card's round crop |
| `apps/web/src/screens/combat.js` | The FAITH tab header wired in; `witnessedWords`: the condition chip reads "WITNESSED · UNTIL THE FIGHT ENDS OR <PATRON> ACTS" (it read "WITNESSED · 99") |
| `apps/web/src/screens/main.js`, `templates/main.template.html`, `templates/combat.template.html` | The faith event cards in the story stream; the header (a grid: the portrait beside the name, the Devotion words, the XP bar and the Witnessed / vow chips; the meter's ten cells and gates under both, full width); the greyed face on the grudge banner; the crops on the voice-line cards |
| Tests | `fx/faith.test.ts` (+5: the Whisper's icon over the praying unit, not the target, no portrait; the Hymn's square face in the accent, over the head, ~1.5 s; the miss greyed, REFUSED by the payload's `why`; a story prayer on the area map; the eye waits), `faithArt.test.ts` (+1: every face box lies inside its painting; the placement math; the fallback), `screens/faith-presence.test.ts` (7: the header and its lightbox, an Atheist's mark, the grudge banner's face, the round crops, the event cards and the greyed grudge, the fight's header and the Witnessed words) |
| e2e | `faith-pg.mjs`: the fight's FAITH header and its lightbox, the Hymn's face (square, over the head, in the accent, gone in ~1.5 s), the missed overreach greyed, the Witnessed chip's words, the round crops in the combat log, the Whisper's icon over the head, the story header and grudge banner, the pact / switch / grudge / apostasy cards. `faith.mjs`: the story header (4:5, the gate words inside it, the lightbox) and the story Whisper's icon over the token on the area map |

**What it looks like** (checked in screenshots at 1600 × 1000, deviceScaleFactor 1)

- **A Whisper:** the Whisper's own icon, lit gold, rises from the head of the one who prays (a tile above the token) with the chime and the small gold rays; a soft gold glow where it lands when that's someone else. A miss: the icon grey, rising a little and sinking back. No portrait.
- **A Hymn:** a square crop of the patron's face (1.25 × the tile, 40–88 px), a 2 px border and a glow in the patron's accent, a soft accent glow behind it, over the head for 1.5 s; the rays and the ring still land on the target. A miss (dice or a refused overreach): the same face greys and dims over 1.1 s, and the word rises from below the token.
- **The faith tab header** (the story sheet): the 76 × 95 portrait (the patron's accent edge) beside the name, the faith line, `DEVOTION 3 · 0/25 XP` with its XP bar and the Witnessed / vow chips; the ten cells with HYMN I / II / III and MIRACLE run under both. A click opens the 800 × 1000 painting in the lightbox (kind "PATRON · CELESTIAL PORTRAIT"). Atheists keep the eye.
- **The fight's FAITH tab:** a compact header above the prayers: the 44 × 55 portrait (the lightbox on a click), the name, the Devotion words and XP, and "WITNESSED · UNTIL THE FIGHT ENDS OR OLD OVERCAST ACTS" (or "NOT WITNESSED · A HYMN ANSWERED MAKES YOU").
- **Cards in the story:** PACT, LEAVING (a switch), GRUDGE and APOSTASY entries become cards with a 40 px square face crop, edged in the patron's accent; a grudge's face is greyed and the card edged in complication red; a switch that leaves a grudge reads red but its face isn't greyed (the grudge's own card is).
- **Voice-line cards:** a round face crop (32 px in the story, 26 px in the combat log) instead of the mark; the mark only for a patron with no painting.

**No new assets.** The crops are of the shipped portraits (`patron-<id>.webp`, 320 × 400; the lightbox uses the `-lg` one); the glow is the shipped Kenney Particle Pack sprite. Reduced motion: the face and the icon fade in and out without moving or scaling; a miss still greys.

**Checks run (part 3):** `npm test -w @phc/engine`, `npm test -w @phc/web`, `npm run typecheck`, `python3 tools/validate.py data` (0 errors); e2e `faith-pg.mjs`, `faith.mjs`, `heart.mjs`, `two-players.mjs`, all green.

## Review fixes (9 Nov 2026)

1. **Old Overcast's chain** (engine): at Devotion 7 its Storm downing the next foe set off the second intervention off the
   same Witnessed. While an intervention's effect runs, that fighter can't be intervened for again; the log reads the
   intervention, then "no longer Witnessed", once. Spec item 747.
2. **The patron's act paid the devoted** (engine): Mother Ember's heal gave Heal XP, Old Overcast's Storm gave Storm and
   Kill XP. The patron's own act now pays no tag, no taboo, and marks no one for harming the helpless (item 747). The
   Matchmaker's share stays a protect (item 600: the devoted takes the hit).
3. **Under the Eye and Witnessed's +2 over a whole fight:** built as ruled, pinned by a test, and put to Leon as a question
   in item 747 (a separate, shorter timer for the riders if he wants one).
4. **Item 714** says eleven banks now.
5. **A Miracle's effects under its portrait** (web): `queueFx` holds for the Miracle (above).
6. **Typing lost to someone else's Miracle** (web): keys in a text box go through (above).
7. **The box over live controls** (web): it moved to the top of the map, takes no clicks (its × does) and sits under the
   dialogs (above).
8. **The Witnessed chip** (web): the faith light and the eye (`◉ WITNESSED`), not the harm red; the how-long in its title
   ("Witnessed: until the fight ends or Old Overcast acts."); hidden once the fight is over.
9. **FULL twice at Devotion 10** (web): the XP bar's word is empty at the top; the Devotion line says FULL.
10. **Licence links** (web): the credits page links each licence name to its deed (`LICENCE_URL` in `game/credits.ts`), as
    CC BY asks; this covers the new CC BY sting and the older music credits.

## Still open

- **The intervention's small cut-in (section 3):** the trigger above; not built, as Leon asked.
- **No combat faith panel header existed before:** the fight's FAITH tab had only its prayer list; part 3 added the compact header there rather than a new panel.
- **Docs:** `docs/HANDOFF.md`, `docs/ROADMAP.md` and `CHANGELOG.md` are not updated, and there is no version bump: whoever merges the branch does both.
- **Face boxes by eye:** Old Overcast's face is the storm cloud itself, so its crop is wider (0.4) and reads as a face less clearly than the others at 26–32 px. If Leon wants a different crop for any patron, it is one line in `PORTRAIT_FACE`.
