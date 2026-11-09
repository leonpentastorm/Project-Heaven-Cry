# Art brief: Outburst 4.0 (feeling glyphs and module icons)

For the artist (ChatGPT Pro). Written 9 Nov 2026 for Project Heaven Cry (PHC), a tactical science-fantasy RPG.
Everything you need is on this page.

**Attach to every job:**

1. The approved prayer icons in `art/icons/prayers/` (for example `whisper-luck.png`, `hymn-mother_ember-1.png`). This
   is the closest existing style: flat white ink, no character.
2. The style guide `art/style-guide/PHC-Style-Guide.md`, the "Soul" visual grammar: gestural flow, imagined forms,
   expressive ribbons, gathering matter.

## The idea

Soul magic (the Outburst) is a spell you **remember** and **feel**. While a caster holds a spell in the heart, they
pour **feelings** into it: Rage, Grief, Love and 22 more. Each feeling changes what the spell does. **Modules** are the
parts of the remembered spell: how it travels, how big it is, what it does to its shape.

- **Feeling glyphs** must read as an emotion at a glance, like a sigil of a mood.
- **Module icons** must read as a behaviour, like a diagram of motion.

## Rules for every icon

1. **Flat pure white `#FFFFFF` ink** on transparency. No colour, glow, gradient or shadow; the game tints and lights
   them.
2. **No text, letters or numbers.** No real-world symbols (religious, national, brand, emoji faces).
3. **No full figure.** A hand, a heart shape, a ribbon or an object is fine. No Wick (he's for traits and perks only).
4. **One motif per icon**, readable at **40 px** on `#10151F`. Meaning must survive in silhouette.
5. **Feelings** are built from **Soul strokes**: flowing, gestural ribbons, with a small heart-knot somewhere in the
   mark (the family resemblance). **Modules** use **clean diagrammatic lines**: arrows, rings, paths. That keeps them
   easy to tell apart from feelings.
6. **Sizes and naming:**
   - master 1024 × 1024 PNG; exports 256, 128, 64, 48 and 40 px;
   - files named by id: `feeling-rage.png`, `module-ricochet.png`.
7. **Folders:** `art/icons/feelings/` and `art/icons/modules/`, each with a `README.md` (every file, the idea, the
   prompt or approach, any rule you bent) and a contact sheet at 40 px and 64 px on `#10151F`.
8. **Order:**
   1. A **test set of 6 feelings** (Rage, Grief, Fear, Love, Joy, Calm) and **4 modules** (Split, Ricochet, Orbit,
      Echo).
   2. Wait for Leon's verdict.
   3. Then the rest, in batches of 10, each shown for review.

   New art is a review candidate until Leon approves it.

## Feeling glyphs (25)

| id | Feeling | Idea (a starting point; improve on it) |
|---|---|---|
| rage | Rage | a ribbon snapping upward into a jagged crest |
| grief | Grief | a ribbon falling, pooling at the bottom like rain |
| fear | Fear | a ribbon recoiling outward from a centre, broken rings |
| love | Love | two ribbons wrapping into one knot |
| joy | Joy | a ribbon leaping in an arc with a spark at the peak |
| calm | Calm | one long level stroke over still circles |
| spite | Spite | a hooked ribbon turning back on itself like a barb |
| shame | Shame | a ribbon folding inward, hiding its end |
| pride | Pride | a ribbon rising into a tall straight spire |
| despair | Despair | a ribbon unravelling downward into loose threads |
| hope | Hope | a small flame-shaped ribbon rising from a low line |
| mercy | Mercy | an open cupped curve, lowered |
| cruelty | Cruelty | a ribbon tightening into a thorned loop |
| loneliness | Loneliness | one small knot far from a wide empty ring |
| belonging | Belonging | several small knots joined on one line |
| dread | Dread | a ribbon coiling around an empty eye-shaped gap |
| awe | Awe | rays opening above a small bowed curve |
| longing | Longing | a ribbon reaching toward a distant dot, not touching |
| relief | Relief | a knot coming loose into a soft exhale |
| contempt | Contempt | a ribbon turned away, chin-like tilt |
| guilt | Guilt | a ribbon dragging a small weight |
| jealousy | Jealousy | two ribbons, one curling to snatch the other's spark |
| wonder | Wonder | a spiral opening into a small star |
| defiance | Defiance | a ribbon standing straight against slanted lines |
| abandon | Abandon | a ribbon flung wide, its knot burst open |

## Module icons (39)

| id | Module | Idea |
|---|---|---|
| move | Move | an arrow carrying a dot |
| homing | Homing | a curved arrow bending onto a target ring |
| swift | Swift | a dot with three speed lines |
| ether | Ether | a dot passing through a dashed wall |
| right / left | Right, Left | an arrow curving right / left |
| time | Time | an hourglass made of two triangles |
| inverse | Inverse | two arrows swapping direction |
| size | Size | a small circle inside a large one |
| random | Random | three scattered dots with a question-like curl (no letters) |
| impact | Impact | a dot hitting a line with burst marks |
| at_once | At once | three arrows leaving one point together |
| wave | Wave | a cone of three arcs |
| burst | Burst | a ring with radiating marks |
| aura | Aura | a ring around a centre dot |
| lance | Lance | a long straight line through two dots |
| split | Split | one line forking in two |
| ricochet | Ricochet | a zig-zag bouncing off a wall |
| fuse | Fuse | a dot on the ground with a short burning line |
| return | Return | a loop out and back |
| volley | Volley | three small parallel dashes |
| bloom | Bloom | nested rings growing |
| anchor | Anchor | a dot pinned by a cross-stake |
| lure | Lure | an arrow pulling a dot inward |
| shell | Shell | a dome over a dot |
| linger | Linger | a square of dotted ground |
| quiet | Quiet | a heart with a soft lowered line |
| silent | Silent | a dot inside a hushed circle with a slash |
| thread | Thread | two dots tied by one line |
| echo | Echo | one shape and its fainter double |
| cascade | Cascade | steps of small dots growing |
| tether | Tether | a beam between two rings |
| siphon | Siphon | a curve drawing drops toward a centre |
| phantom | Phantom | a dot passing through a solid block |
| orbit | Orbit | a dot circling a centre |
| volatile | Volatile | a dot cracking open with sparks |
| bastion | Bastion | domes over several dots |
| judgement_mark | Judgement mark | a target ring with a heavy downward bar |
| halo | Halo | a ring of light over a small heart |

The UI also needs **3 marks**: `ui-revert.png` (a curved rewind arrow), `ui-practice.png` (a heart with tally lines)
and `ui-felt.png` (an opening ribbon for the "you have felt X" card).

## Handoff

- Deliver to the folders above, with the READMEs and contact sheets.
- Note any question for Leon at the top of the README.
- If you can't edit the repo, send the files to Leon. Claude adds them to `art/catalog.json`, runs
  `python3 tools/validate_art.py` and `npm run assets`, and the game picks them up by name.
