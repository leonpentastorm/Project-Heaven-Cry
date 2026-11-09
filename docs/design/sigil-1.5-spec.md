# Sigil 1.5: the language grows (spec, 9 Nov 2026)

Status: **accepted direction (Leon, 9 Nov 2026). Rules revision 1.9.** Every number here is provisional, for the
damage balance pass. Built on rules 1.4 (`docs/design/sigil-1.4-proposal.md` and the spec's "Rules revision 1.4"),
which this keeps and extends. **This is the only file to hand over**; it links the rest:

- `CLAUDE.md`, especially the working agreements: the asset rule (sound and VFX from credited CC BY 4.0 or CC0
  sources; make it yourself only when it looks good as pure SVG or CSS), versioning, and spec → data → engine;
- `docs/HANDOFF.md`, for how to run, test and deploy;
- `docs/design/outburst-4.0-spec.md`, the sister pass. Its section 8 (collapsible, grouped workshops) is shared work:
  build it once for both magics;
- `docs/design/move-pool.md`: the shelved advanced Mind moves that section 6 points at.

The pen-and-paper version is out of scope (Leon: the tabletop rules get a big rewrite later anyway).

## 0. Why

Sigil players love moment-to-moment play: drawing, walking a Line, the facing rule, fields. Two things hold it back.

1. **Growth is weak.** New words come only from tutors, plates, allies or the Narrator, one per long rest. A session-10
   Mind caster casts what they cast in session 2.
2. **Lines poison each other (playtest).** Any of your side's glyphs that touch, diagonally included, join one group.
   A group that isn't one straight row can't be Evoked. So two Lines drawn near each other, or an ally's glyph next to
   yours, waste both, and players run all over the map to keep a 2-tile empty border around every Line.

**The split stays.** Sigil is shown to the world and grows outward: vocabulary and grammar. Soul (Outburst 4.0) grows
inward: feelings and remembered spells. **No feelings-style live layer is added to Sigil**: its live decision is
already drawing and positioning.

## 1. Strokes: a Line is what you drew as one (fixes the poisoning)

1. **A stroke** is a run of glyphs drawn as one Line. Each glyph records the stroke it belongs to (`strokeId`).
2. **Starting and extending a stroke:**
   - A new glyph **extends** a stroke if it is next to that stroke's **end** glyph **and** continues the stroke's
     straight row (same axis, same direction), and the stroke has fewer than 4 glyphs.
   - A stroke of one glyph can be extended in any of the 8 directions; the second glyph sets its axis.
   - Otherwise the new glyph **starts a new stroke**, even if it touches other glyphs.
3. **When a new glyph could extend more than one stroke**, the player picks which (or "new stroke") with buttons on the
   draw step.
   - The default is the stroke you drew into last.
   - The preview shows the result: a joining line between the glyphs of one stroke, and "starts a new Line" otherwise.
4. **A Line is a stroke of 2–4 glyphs.** Touching glyphs of other strokes no longer matter: they don't join, poison or
   block. Two Lines may run side by side, cross diagonally, or end next to each other.
5. **Co-op:** an ally may extend **your** stroke by drawing at its end along its axis. That's the deliberate co-op
   Line from rule 1.4.8, and the same picker applies. Allies' glyphs never join a stroke by accident.
6. **Enemies** use strokes too. Their glyphs never join yours, as before.
7. **The facing rule, Evoking and fizzling are unchanged.** They read the stroke's tiles exactly as they read a Line
   today.
8. **Scuffing:** scuffing a middle glyph **splits** the stroke into two. Each part that is still 2+ long is a Line;
   a single glyph left alone is just a glyph.
9. **Old saves:** glyphs without a `strokeId` keep the 1.4 reading (touching groups) until they fade.
10. **The UI:**
    - glyphs of one stroke are joined by a faint line;
    - hovering a glyph highlights its stroke;
    - the draw picker names the stroke ("extends FIRE·SEEK" / "new Line").

This replaces rule 1.4 Drawing.3's "the glyphs that touch each other make one group". Update the spec text, the
engine (`groupAt`, `readShape`, `findPattern`, drawing in `sigil.ts`, the AI in `ai-sigil.ts`), the web previews and
the tests. Existing Sigil tests that encoded "touching poisons" become tests that it no longer does.

## 2. Guaranteed new words

The cap on words known stays at 4 + Brain Power.

1. **Study (the engine tracks it):**
   - every Evoke earns **study**: 1, +1 per glyph past 2, +1 if it hit an enemy;
   - at thresholds you **learn a word of your choice**, within your cap: the 1st at 6 study, then +8 each (6, 14, 22…);
   - a study bar sits on the Magic tab.
2. **Copying from the world (Leon: "investigate drawn sigils in the world"):**
   - **In a fight:** Analyze (or read) an enemy's glyph or a scuffed glyph's trace that holds a word you don't know.
     You gain **study toward that word**: once you hit the next threshold, it can be learned even if you've never had
     a source for it.
   - **On the map:** drawn sigils in the world (carved on doors, ruins, Keystones, warding posts and old Sigil plates
     fixed to walls) are points of interest with an **Investigate** approach:
     - Analysis or Rumination, TN by age and damage;
     - success copies the word into your **known-to-study** list, plus study points;
     - a critical teaches it outright.
     - The Narrator places these with `objects[]` (a new kind, `sigil_mark`, with `word`). M813 should get two or three.
   - **Limits:** copying gives study, not instant words, except a critical or a Narrator grant, so it can't be farmed
     in one fight. Each glyph or mark copies once per character.
3. **Mastery** (as Outburst 4.0):
   - each Mastery level (3/5/7/9) in Brain Power, Rumination or Eloquence gives **+5 study**;
   - **Mastered (10)** in one of them gives **one free word**, which ignores the cap.
4. **Bonus sources:** tutors, plates, allies and the Narrator, as today (one per long rest from those).

## 3. Word mastery: your signature words

1. **Each word you know has a use count.** The engine counts every Evoke that includes it, repeats once each.
2. **At 10 uses** a word reaches **Practised**. **At 30** it reaches **Mastered word**, which unlocks that word's
   **inflection**: one small, word-specific upgrade, always on for you. Examples:
   - FIRE: Burning lasts +1 round;
   - SEEK: +1 range;
   - SPREAD: +1 radius at 4 glyphs;
   - WARD: shield +10%;
   - STEP: +1 tile;
   - KIN: also skips Downed enemies you mark.
3. **All 40 words get an inflection** in `data/sigils.json` (`inflection`: text and effects). Each is small: about 10%
   or +1 of something, never a new shape. The implementer drafts all 40, flags them provisional, and lists them in the
   handoff for Leon to strike or change.
4. **The UI:** each word chip shows its use count, a star for Practised and a filled star for Mastered. The word's
   card shows its inflection, greyed until it's earned.

## 4. Late-game grammar (Leon: "cool for late game")

1. **No Lines of 5** (Leon, 9 Nov 2026: "doubling a glyph at one place is already a huge enough reward"). A Line stays
   2–4 glyphs for everyone.
2. **Junctions:** at **Brain Power Mastered (10)**, one glyph may belong to **two strokes** (a crossing):
   - Evoking either Line counts it as a word of that Line;
   - it fades only when the second Line is Evoked;
   - drawing it takes the junction button on the draw picker.
3. **The two-glyph hook** (Stacks, item 586) stays with advanced classes (section 6).

## 5. Fixes found in play

1. **Strokes** (section 1) fix the "wasted Sigil, must scuff" frustration from playtests.
2. **The facing preview** draws the stroke's direction and area before you confirm (rule 1.4, kept); check that it
   holds with strokes.
3. **The draw keyboard** (grouped rows) gains the stroke picker (section 1.3) and word-mastery stars (section 3.4).

## 6. Gated power for advanced Mind classes

These mirror Outburst 4.0's gated modules. They come back with their classes; most of the code exists, shelved
(`docs/design/move-pool.md`).

| Class | What it brings |
|---|---|
| Grand Sigilist (Intelligence²) | Grand forms (items 582–585) |
| Glyph Mason (Intelligence + Endurance) | Keystone (a stroke anchor that never fades) and Junction-from-Keystone |
| Spellslinger (Agility + Intelligence) | inscribed rounds; a stroke drawn by firing |
| Stroke Gambler (Intelligence + Expression) | half-glyphs and Stacks (the two-glyph hook) |
| Blade Scribe (Strength + Intelligence) | a stroke drawn by sword cuts (Sword Form) |

## 7. Workshop, keyboard and Proving Ground

- **Shared with Outburst 4.0, section 8:** the Magic tab's Sigil section becomes collapsible and grouped (the five word
  groups), with study, word mastery and known-to-study words shown.
- **Proving Ground tools:**
  - grant study;
  - set a word's use count;
  - place a `sigil_mark`;
  - toggle Junctions for testing.

## 8. Assets

- **Sound and VFX** follow the asset rule in CLAUDE.md: CC BY 4.0 or CC0, credited. Needed:
  - a stroke-join sound;
  - an inflection-unlock sting;
  - an Investigate success sound.
- **SVG** (made in code): the stroke join lines, word-mastery stars, and the `sigil_mark` map marker (a glyph in the
  wall style).
- **Painted art:** none needed. If a screen wants an illustration, show **"COMING SOON"** with the item's name, and
  list it for Leon in the handoff.

## 9. Open items (Leon)

1. Study thresholds (6, then +8) and the word-mastery counts (10 / 30): the balance pass.
2. The 40 inflections: the implementer drafts them; Leon strikes or changes them.
3. Junctions at Brain Power Mastered: confirm the gate. (Lines of 5 were dropped, Leon 9 Nov 2026.)

## Build split

- **Part A: spec, data and engine.**
  - Rules 1.9 in the spec.
  - Strokes, the stroke picker and split-on-scuff.
  - Study, copying, `sigil_mark` and Investigate.
  - Mastery study and the Mastered word.
  - Word use counts and inflections.
  - Junctions.
  - Enemy AI on strokes.
  - Narrator fields (`sigil_mark` placement, grants).
  - Proving Ground actions.
  - Tests through `apply()`: "touching no longer poisons" first.
- **Part B: web.**
  - Stroke lines and hover.
  - The draw picker.
  - The study bar, word stars and inflection cards.
  - `sigil_mark` on the map and its Investigate panel.
  - The shared collapsible workshop.
  - Sounds, wired and credited.
  - e2e: two Lines side by side both Evoke; a crossing with Junctions; copying from an enemy glyph; investigating a
    wall sigil.
