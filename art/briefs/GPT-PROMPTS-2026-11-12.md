# Prompts for the artist (image generation), 12 Nov 2026

Copy-paste prompts for everything in [`ART-REQUESTS.md`](ART-REQUESTS.md) that is ready to draw today. Work top to
bottom: the order is by how much the game needs it. Each job says what to **attach** (the generator must see the
references, the words alone won't hold the style) and where the file goes.

Not in here on purpose (don't start): the M813 maps (M2 to M5), the three sketch-campaign maps (M7 to M9), and the
equipment paintings (E1). They wait on a rewrite or on Equipment 2.0.

**Every delivery is a review candidate until Leon approves it.** Send the files to Leon; Claude adds them to the
catalog and runs the checks.

---

## Job 1 — Wick icons (13 icons)

**Attach to every Wick prompt:** `art/icons/traits/mind-without-fog.png` (the master), plus two or three of
`art/icons/perks/*.png` so the line weight is seen. For Rebuke also attach `art/icons/prayers/whisper-luck.png` and one
more `whisper-*.png`.

**Start every Wick prompt with this block:**

> Draw one icon in exactly the style of the attached reference images. The character is Wick, the same mascot as in
> the references: a small figure with a short capelet, a lantern for a heart with a small medical cross on it, a
> pixel-screen face, and a slightly asymmetric build. Keep his proportions, capelet and lantern heart exactly as
> attached. Pure white flat ink (#FFFFFF) on a fully transparent background. No colour, no grey, no gradient, no glow,
> no shadow, no outline colour. Same line weight and level of detail as the references. No text, no letters, no
> numbers, no border, no frame. One figure, centred, with a little clear space around him. Square, 1024 × 1024 PNG
> with transparency. The silhouette must read clearly when shrunk to 44 pixels.

Then add one of these:

| File | Add to the block |
| --- | --- |
| `art/icons/prayers/whisper-rebuke.png` | **Rebuke.** Wick rebuking someone out of frame: one arm raised with the hand held flat and stiff toward them, like a stern "enough", and a single hard straight ray of light leaving the palm. His other hand is at his side. It must read as a scolding word that lands, not as casting a spell: no swirls, no sparks, no magic circle, one ray only. Match the attached Whisper icons: one small light source. |
| `art/icons/perks/both-hands.png` | **Both Hands.** Wick fighting with a sword in one hand and a pistol in the other at the same moment: mid-strike with the blade swept across his body, the pistol in the other hand already levelled straight ahead. A grounded lunge, not a spin. The sword and pistol are simple invented shapes, not real-world models. |
| `art/icons/calls/order.png` | **Order.** Wick giving an order to a squadmate: standing square, one arm thrust out straight with the whole hand pointing "you, go there", mouth open in a shout shown by two short sound lines at his face. Commanding, not angry. |
| `art/icons/calls/rally.png` | **Rally.** Wick rallying the squad: one fist raised high above his head, body leaning forward, three short sound lines fanning up from him. A cheer that lifts people. |
| `art/icons/calls/brief.png` | **Brief.** Wick giving a quick briefing: crouched on one knee, one hand drawing a short plan on the ground with a finger (two small strokes and a dot on the ground line), the other hand held up with two fingers raised. Calm and quick. |
| `art/icons/calls/name-it.png` | **Name It.** Wick naming a fear out loud so it loses its hold: standing firm, one open hand held out palm-up as if presenting something, and in front of that hand a small jagged shape with a simple ring drawn around it, as if circled and labelled. Steady, reassuring. |
| `art/icons/calls/cue.png` | **Cue.** Wick giving a cue: one arm raised with the hand about to drop in a sharp "now!" chop, a single short curved motion line under the hand, his head turned over his shoulder toward someone behind him. |
| `art/icons/calls/spot.png` | **Spot.** Wick pointing out a target: one arm fully extended with a pointing finger, his other hand shading his eyes, and far along the pointing line a small target ring. |
| `art/icons/calls/warn.png` | **Warn.** Wick shouting a warning: both hands cupped around his mouth, body twisted toward someone at his side, and a small sharp zig-zag danger mark above and behind him. Urgent. |
| `art/icons/calls/threaten.png` | **Threaten.** Wick threatening an enemy: leaning forward and looming, shoulders up, one hand drawn across in a slow cutting gesture at chest height, capelet flared. Menacing but still Wick. No weapon. |
| `art/icons/calls/taunt.png` | **Taunt.** Wick goading an enemy: weight on his back foot, one hand beckoning "come on then" with curled fingers, the other hand on his hip, head tilted. Cocky. |

**The nine Calls sit side by side at 44 px:** after generating them, put all nine on one dark sheet (`#10151F`) at
44 px and 64 px and check no two silhouettes can be confused. If two look alike, redo the weaker one with a more
different pose.

---

## Job 2 — Outburst feeling glyphs (25) and module icons (38), test set first

**Attach to every prompt:** `art/icons/prayers/whisper-luck.png` and `art/icons/prayers/hymn-mother_ember-1.png`
(the nearest existing style: flat white ink, no character).

**Do the test set first and wait for Leon's verdict:** feelings Rage, Grief, Fear, Love, Joy, Calm; modules Split,
Ricochet, Orbit, Echo.

### Feelings: start every prompt with

> Draw one abstract glyph in the flat white ink style of the attached references. It is the mark of a feeling, like a
> sigil of a mood. Build it from one or two flowing, gestural ribbon strokes, as if drawn with a soft brush in a single
> movement, with a small heart-shaped knot tied somewhere in the ribbon. Pure white flat ink (#FFFFFF) on a fully
> transparent background. No colour, no grey, no gradient, no glow, no shadow. No figure, no face, no hands, no text,
> no letters, no numbers, no real-world symbols, no emoji. One motif, centred, bold enough that its silhouette reads
> at 40 pixels. Square, 1024 × 1024 PNG with transparency.

Then add: **"The feeling is X:"** and its line.

| File (`art/icons/feelings/`) | The feeling is… |
| --- | --- |
| `feeling-rage.png` | **Rage:** the ribbon snaps upward into a jagged crest, like a flame with teeth. |
| `feeling-grief.png` | **Grief:** the ribbon falls and pools at the bottom like rain running off. |
| `feeling-fear.png` | **Fear:** the ribbon recoils outward from an empty centre, in broken ring fragments. |
| `feeling-love.png` | **Love:** two ribbons wrap around each other into one knot. |
| `feeling-joy.png` | **Joy:** the ribbon leaps in a high arc with a small spark at the peak. |
| `feeling-calm.png` | **Calm:** one long level stroke over two or three still circles, like a horizon over water. |
| `feeling-spite.png` | **Spite:** a hooked ribbon turning back on itself like a barb. |
| `feeling-shame.png` | **Shame:** the ribbon folds inward and hides its own end. |
| `feeling-pride.png` | **Pride:** the ribbon rises into a tall straight spire. |
| `feeling-despair.png` | **Despair:** the ribbon unravels downward into loose threads. |
| `feeling-hope.png` | **Hope:** a small flame-shaped ribbon rising from a low flat line. |
| `feeling-mercy.png` | **Mercy:** an open cupped curve, lowered, like a hand let down. |
| `feeling-cruelty.png` | **Cruelty:** the ribbon tightens into a loop with thorns. |
| `feeling-loneliness.png` | **Loneliness:** one small knot far from a wide empty ring. |
| `feeling-belonging.png` | **Belonging:** several small knots joined along one line. |
| `feeling-dread.png` | **Dread:** the ribbon coils around an empty eye-shaped gap. |
| `feeling-awe.png` | **Awe:** rays opening above a small bowed curve. |
| `feeling-longing.png` | **Longing:** the ribbon reaches toward a distant dot and does not touch it. |
| `feeling-relief.png` | **Relief:** a knot coming loose into a soft breath-like curl. |
| `feeling-contempt.png` | **Contempt:** the ribbon turned away with a lifted, chin-like tilt. |
| `feeling-guilt.png` | **Guilt:** the ribbon drags a small weight behind it. |
| `feeling-jealousy.png` | **Jealousy:** two ribbons, one curling to snatch the other's spark. |
| `feeling-wonder.png` | **Wonder:** a spiral opening into a small star. |
| `feeling-defiance.png` | **Defiance:** the ribbon stands straight against slanted lines pushing at it. |
| `feeling-abandon.png` | **Abandon:** the ribbon flung wide, its knot burst open. |

### Modules: start every prompt with

> Draw one small diagram icon in the flat white ink style of the attached references. It shows how a spell behaves,
> like a diagram of motion. Use clean, even, geometric lines: arrows, rings, dots, straight paths. No brush texture,
> no ribbons, no hearts unless stated. Pure white flat ink (#FFFFFF) on a fully transparent background. No colour, no
> grey, no gradient, no glow, no shadow. No figure, no text, no letters, no numbers, no real-world symbols. One motif,
> centred, bold enough to read at 40 pixels. Square, 1024 × 1024 PNG with transparency.

Then add **"It shows:"** and the line. (Impact is retired: no icon.)

| File (`art/icons/modules/`) | It shows… |
| --- | --- |
| `module-split.png` | one line forking into two |
| `module-ricochet.png` | a zig-zag path bouncing off a wall line |
| `module-orbit.png` | a dot circling a centre dot on a ring path |
| `module-echo.png` | one shape and a fainter (thinner-lined) double of it beside it |
| `module-move.png` | an arrow carrying a dot |
| `module-homing.png` | a curved arrow bending onto a target ring |
| `module-swift.png` | a dot with three speed lines behind it |
| `module-ether.png` | a dot passing through a dashed wall |
| `module-right.png` / `module-left.png` | an arrow curving to the right / to the left (two files, mirror images) |
| `module-time.png` | an hourglass made of two triangles |
| `module-inverse.png` | two arrows swapping direction, one above the other |
| `module-size.png` | a small circle inside a large one |
| `module-random.png` | three scattered dots and one loose curl (no question mark) |
| `module-at_once.png` | three arrows leaving one point together |
| `module-wave.png` | a cone made of three arcs |
| `module-burst.png` | a ring with short radiating marks |
| `module-aura.png` | a ring around a centre dot |
| `module-lance.png` | one long straight line through two dots |
| `module-fuse.png` | a dot on a ground line with a short burning line leading to it |
| `module-return.png` | a loop going out and coming back |
| `module-volley.png` | three small parallel dashes |
| `module-bloom.png` | nested rings growing outward |
| `module-anchor.png` | a dot pinned by a cross-shaped stake |
| `module-lure.png` | an arrow pulling a dot inward |
| `module-shell.png` | a dome over a dot |
| `module-linger.png` | a square patch of dotted ground |
| `module-quiet.png` | a heart with one soft lowered line under it |
| `module-silent.png` | a dot inside a circle with a slash through the circle |
| `module-thread.png` | two dots tied by one line |
| `module-cascade.png` | a stair of small dots growing in size |
| `module-tether.png` | a straight beam between two rings |
| `module-siphon.png` | a curve drawing drops toward a centre |
| `module-phantom.png` | a dot passing through a solid block |
| `module-volatile.png` | a dot cracking open with sparks |
| `module-bastion.png` | three small domes over three dots |
| `module-judgement_mark.png` | a target ring with a heavy downward bar landing on it |
| `module-halo.png` | a ring of light over a small heart |

Three small UI marks in the same module style: `ui-revert.png` (a curved rewind arrow), `ui-practice.png` (a heart
with four tally lines), `ui-felt.png` (a ribbon opening outward).

**Deliver with:** one contact sheet per folder at 40 px and 64 px on `#10151F`.

---

## Job 3 — Two fight maps (top-down), if there is time

**Before starting, ask Leon for the tile guide image of each map** (Claude makes it with
`python3 tools/render_map_guides.py data/campaigns/proving.json <folder>` and `… data/campaigns/own.json <folder>`).
The painting must match the guide tile for tile: cover, walls and open ground exactly where the guide has them.

**Attach:** the tile guide, and `art/_archive/maps/m813/retired-2026-11/outpost.png` for the paint style, scale and
light.

> Paint a top-down battle map for a tactical game, in the same painted style, tile scale and lighting as the attached
> reference map. Follow the attached layout guide exactly: it is a grid of 26 by 26 square tiles; every wall, piece
> of cover and open tile must sit where the guide puts it, aligned to the grid, so game tokens can stand on it. Pure
> top-down view, no perspective, no tilt. Do not draw grid lines, coordinates, text, characters, creatures or UI.
> Muted, dark, readable ground so bright tokens stand out on it; cover and walls clearly darker or taller than open
> ground. Square image, 2600 × 2600 pixels (100 pixels a tile).

| File | Add |
| --- | --- |
| `art/maps/proving-ground.png` | **The Proving Ground:** a military drill yard at night. Packed sand under harsh floodlights, painted lane markings worn away, low concrete barriers and stacked crates as cover, a few steel practice frames. The squad enters from the west edge, the drill units from the east edge: both edges kept clear. Science-fantasy frontier army, nothing from a real country. |
| `art/maps/open-ground.png` | **Open ground:** a nameless stretch of outdoors that could be on any world. Dry earth and scrub, scattered boulders, a low broken wall, a shallow gully, a couple of dead trees as cover. No buildings, no road signs, nothing that names a place. |

---

## What comes back to Claude

File names exactly as above. Claude then adds each to `art/catalog.json`, runs `python3 tools/validate_art.py` (size,
palette, pure white ink) and `npm run assets`, and the game picks them up by name. If the generator returns an opaque
or off-white image, say so: Claude can cut the background and force the ink to pure white.
