<!-- FINAL: sent to the artist on 15 Nov 2026. Later agents: do not rewrite or regenerate this file; change nothing and report "already written". -->
# GPT prompts, 15 Nov 2026: the Figment art (14 portraits, then 24 icons)

For the artist. Leon, 15 Nov 2026: "request all the new figment art needed we send to the artist". Source of the design:
`docs/design/proposals/2026-11-figments-2.0.md` (14 Figment forms, 22 traits, caster orders, the Visualizer glove).

## Counts and the order to paint

| Priority | Kind | Count | Mode and size |
| --- | --- | --- | --- |
| **1** | **Portraits of the five forms in the game today** (Double, Eye, Wall, Beast, Blade) | **5** | Heavenprint portrait, 800 x 1000 PNG |
| **1** | **Portraits of the nine new forms** (Snare, Hand, Ward, Husk, Sentinel, Glass, Ferry, Breaker, Hush) | **9** | same |
| 2 | Trait icons (the 12 new traits), white flat ink | 12 | Wick icon mode, 1024 x 1024 PNG, transparent |
| 2 | Order icons (12 orders), white flat ink | 12 | same |
| 0 | Visualizer glove item art | **0** (it exists) | see "Not requested" |
| | **Total** | **38** (14 portraits first, then 24 icons) | |

Paint in this order: Double, Eye, Wall, Beast, Blade (in the game today and waiting on art), then Snare, Hand, Ward,
Husk, Sentinel, Glass, Ferry, Breaker, Hush. **Start with the 14 portraits; the 24 icons are the second batch.**

## What a Figment is, and the look the whole set shares

A Figment is a **picture given a body by nanobots** (the bots): a Rigger holds the picture in mind and draws it through
the **Visualizer glove**; the bots gather into the shape, it fights or helps for a while, and when it is let go or
destroyed it comes apart back into bots. It is a made thing, **never flesh**. Everything is in-world: no real-world
names, brands or makes, no text, letters, numbers or logos in any image.

The set must read as one family and as not alive:

- **Expression's pigment** (Expression is the Visualizer's attribute; the Mind family): ONLY deep petrol-blue
  `#075369`, with `#14758B` lighter and `#033443` darker, plus neutral cream `#F2E5C8` on pure black `#000000`. The
  pigment is dark, so **cream carries every light value** and the blue carries shadow and accents.
- **A bot-fleck grain:** the bodies are built of small cream squares, dots and flecks like filings or pixels, denser
  where the form is solid.
- **Edges that fray into motes:** at least one edge (the top, the trailing side, the base) dissolves into drifting
  flecks. Nothing has a clean, finished outline all the way round.
- **No living eyes.** No form has a face or eyes that read as a person's or an animal's. The Double is a faceless copy of
  a person (still no face detail). The Eye is a lens, not an eye.
- **Mode:** the Heavenprint **abstract portrait** mode (`art/style-guide/PHC-Style-Guide.md`, "Abstract skill prompt",
  sections 15 to 17: opaque cream gouache and broken directional ink marks on black), the mode the earlier Figment
  request (`GPT-PROMPTS-2026-11-13-classes-3.0.md`, Job 3) already named. **800 x 1000 PNG, vertical 4:5, opaque, no
  text or border.**
- **Attach to every prompt:** `art/icons/skills/visualization.png` (Expression's own skill: the pigment and the
  mark-making) and two of `art/icons/skills/analysis.png`, `art/icons/skills/charisma.png`,
  `art/icons/skills/durability.png` for composition.

**Safe area (how the game uses a portrait).** Units are drawn on the map, in the turn bar and in the Figments group as
**round tokens cut from the portrait** (40 to 64 px). So **one portrait per form is all that is asked; no separate token
image.** Keep the **whole subject inside the central circle**: about 560 px across, centred at x 400, y 480 of the
800 x 1000 image. Leave the corners black. The silhouette must read at 40 px. Check each on a contact sheet at 40, 64 and
128 px before sending.

**Naming and delivery.** Save as `art/portraits/figments/figment-<form>.png` (names are given per row; do not rename).
Each delivery is a **review candidate** until Leon approves it; Claude adds the catalog entries and checksums and runs
`python3 tools/validate_art.py`. Deliver on a branch `art/figments-2026-11-15` with one contact sheet.

## Base prompt (paste first, with the row's fields filled in)

> Create a PHC Heavenprint abstract portrait of a Figment, [Form and meaning], matching the attached newest gestural POC 4-derived reference. A made thing, not a person: [Subject]. Made from opaque cream gouache and broken directional ink marks on pure black, built of small cream flecks and squares like filings, at least one edge fraying into drifting motes. Stature: [Stature]. Pose: [Pose]. Preserve a readable silhouette and weight even where the body dissolves into black. Moderate internal abstraction, no cubist puzzle, no face, no living eyes, no skin, no clothes, no NPC identity. One restrained symbolic cue: [Cue]. Palette: black #000000, neutral cream #F2E5C8 and ONLY Expression deep petrol-blue (#075369, with #14758B as the lighter and #033443 as the darker value) for every remaining mark and shadow. No unrelated undertones. Keep the whole subject inside the central circle; strong silhouette at 40 px. Vertical 4:5, 800 x 1000 PNG, opaque, no text or border. Borrow Heavenprint's tactile mark-making, not another game's composition.

---

## Part 1: the 14 portraits

Each row: what it is and its job on the grid, the silhouette, three things to show, two to avoid, the file, and the
fields for the base prompt.

### In the game today (5)

**1. `art/portraits/figments/figment-double.png`** | Double
- **What and job:** a faceless copy of its owner, built by bots. Lure: it draws fire and taunts nearby enemies.
- **Silhouette:** an upright human-shaped figure, a player's build, with a thinner second outline offset beside it.
- **Show:** a hand half raised, mirroring the viewer; the body edges coming apart into squares; the offset echo outline.
- **Avoid:** any face, hair or clothing detail (it must not look like a real person); a flat solid silhouette with no fraying.
> **Form and meaning:** the Double: a copy of its owner, built by nanobots. **Subject:** a faceless humanoid made only of flecks. **Stature:** average, upright, the same build as a player figure. **Pose:** caught mid-turn toward the viewer, weight on one leg, one hand half raised in greeting, as if mirroring someone who stands where the viewer stands; the edges of its body come apart into tiny squares and flecks. **Cue:** a second, thinner outline of the same figure offset a hand's width beside it, like an echo.

**2. `art/portraits/figments/figment-eye.png`** | Eye
- **What and job:** a small floating sensor that sees for the squad. Scout: it flies, sees far and in the dark.
- **Silhouette:** a small floating sphere with one round lens and a few trailing strands.
- **Show:** one lens ringed by a thin cream band; fine strands trailing behind; one straight sight line leaving the lens.
- **Avoid:** a lifelike eye, lashes, an iris like a person's; a face of any kind.
> **Form and meaning:** the Eye: a small floating sensor that sees for its owner and the squad. **Subject:** a single floating sphere with one round lens or aperture ringed by a thin cream band, not an anatomical eye, no face, trailing a few fine strands. **Stature:** small, compact, centred. **Pose:** hovering and turned toward the upper right as if looking at something far away. **Cue:** one thin straight sight line leaving the lens toward the upper right edge.

**3. `art/portraits/figments/figment-wall.png`** | Wall
- **What and job:** a slab of cover the owner can shift. Cover: full cover that moves a tile an AP.
- **Silhouette:** a broad upright slab, wider than tall, the top edge notched and dissolving.
- **Show:** countless small cream blocks like bricks; the top edge dissolving into flecks; one lower corner sliding sideways.
- **Avoid:** a stone wall with mortar, a building or a door; any humanoid shape.
> **Form and meaning:** the Wall: a slab of cover the owner can shift, built of bots. **Subject:** a broad upright slab, wider than tall, built of countless small cream blocks like bricks, its top edge dissolving into flecks; no humanoid, no face. **Stature:** wide, low and heavy. **Pose:** standing square to the viewer, solid, one lower corner starting to slide sideways as if being pushed along the ground. **Cue:** two short dashes beside the sliding corner showing its motion.

**4. `art/portraits/figments/figment-beast.png`** | Beast
- **What and job:** a hound made of cream marks. Striker: fast; Strike and Pounce (a leap that knocks a foe Prone).
- **Silhouette:** a lean, low four-legged hound-shape stretched mid-leap.
- **Show:** forelegs reaching and hind legs just leaving the ground; a long muzzle and ears as marks only; the hind end and tail dissolving into flecks.
- **Avoid:** a realistic dog or wolf, fur, teeth or an eye; a friendly, pet-like pose.
> **Form and meaning:** the Beast: a fast striker built from bots, a hound made of cream marks. **Subject:** a lean four-legged hound-shape with no face and no eyes, only a long muzzle and ears as marks; its hind end and tail dissolve into flecks. **Stature:** low, lean, long. **Pose:** mid-leap toward the upper right, forelegs reaching, hind legs just leaving the ground, the whole body stretched. **Cue:** a few long speed marks trailing from its haunches.

**5. `art/portraits/figments/figment-blade.png`** | Blade
- **What and job:** a floating blade that holds a tile and cuts what passes. Guard of tiles: Cut, and Hold strikes whatever moves next to it.
- **Silhouette:** one long narrow double-edged blade hanging point-down, centred.
- **Show:** fine bots crowding the edge like filings; the point toward the ground, very slightly swaying; a small ring on the ground under the point.
- **Avoid:** a hilt, a hand or a recognisable sword type; a glowing energy blade.
> **Form and meaning:** the Blade: a floating blade that guards one tile and cuts what passes. **Subject:** a single long narrow double-edged blade hanging point-down in the air, its edge sharp in cream, fine bots crowding along the edge like filings; no hilt, no hand. **Stature:** tall and thin, centred. **Pose:** hanging upright and very slightly swaying, point toward the ground, ready. **Cue:** a small ring on the ground under its point, the tile it holds.

### New forms (9)

**6. `art/portraits/figments/figment-snare.png`** | Snare
- **What and job:** a small trap. Trap: holds a tile; an enemy that hits it is cut (Trip) and loses 2 AP, and it is spent.
- **Silhouette:** a low four-pronged caltrop star inside a broken circle.
- **Show:** four sharp prongs, one pointing up; the circle broken and fraying into motes; a low, crouched weight, ready to snap.
- **Avoid:** a bear trap, rope, net or any recognisable real trap; heavy detail (it is small and simple).
> **Form and meaning:** the Snare: a small trap that springs when an enemy comes close. **Subject:** a four-pronged caltrop star made of cream flecks, sitting inside a ring that is broken in one place; no face. **Stature:** small and low, centred. **Pose:** resting flat and ready, one prong up, as if waiting. **Cue:** a short bright spark of cream at the point of the upturned prong.

**7. `art/portraits/figments/figment-hand.png`** | Hand
- **What and job:** a floating hand that carries the owner's stim to an ally. Courier: it flies; Hand over mends an ally next to it; Filch lifts a throwable or a magazine from a foe.
- **Silhouette:** an open gauntlet palm up with a small capsule across it, trailing into motes at the wrist.
- **Show:** the open palm offering; a capsule across the palm; the wrist dissolving into flecks with no arm.
- **Avoid:** a real human hand with skin, nails or a sleeve; a clenched fist or a weapon.
> **Form and meaning:** the Hand: a floating hand that carries a stim from its owner to an ally. **Subject:** a single open gauntlet-like hand, palm up, built of cream flecks, with a small capsule lying across the palm; no arm, no cuff, no person. **Stature:** small and light, centred. **Pose:** hovering, palm up and tilted slightly toward the upper right as if offering something across a gap; the wrist and fingers fray into flecks. **Cue:** a tiny trail of motes from the capsule toward the edge of the image, the journey it takes.

**8. `art/portraits/figments/figment-ward.png`** | Ward
- **What and job:** a guardian that stands between an ally and the blow. Bodyguard: takes half of the first blow a round aimed at an ally next to it; Interpose steps it beside an ally.
- **Silhouette:** a tall kite shield with a small figure-shaped hollow visible behind it.
- **Show:** a tall kite shield held square; a small empty figure-shaped hollow behind it, the one it protects; the edges and base fraying into flecks.
- **Avoid:** a coat of arms or any faction mark on the shield; a knight or any armoured human.
> **Form and meaning:** the Ward: a guardian shield that stands between an ally and the blow. **Subject:** a tall kite-shaped shield made of dense cream flecks, with a small figure-shaped hollow of black behind it; no wielder, no face. **Stature:** tall, broad, solid. **Pose:** standing square to the viewer, planted, as if just stepped into place. **Cue:** a few flecks flying off the shield's face as if a blow had just landed.

**9. `art/portraits/figments/figment-husk.png`** | Husk
- **What and job:** a hollow decoy that bursts when spent. It lures like the Double; Burst blows it up on everyone within 1 tile, friend or foe.
- **Silhouette:** a hollow human-shaped bust, empty inside, a fuse spark at the crown.
- **Show:** a hollow shell of cream flecks, black inside; one small spark at the crown; hairline petrol-blue cracks running through it.
- **Avoid:** a face, eyes or hair; a cartoon bomb, a skull or a fireball.
> **Form and meaning:** the Husk: a hollow decoy bust that bursts when spent. **Subject:** a hollow, faceless bust or upper body built of cream flecks like a shell, black and empty inside; it echoes the Double but is clearly empty. **Stature:** average, upright, slightly hunched. **Pose:** standing still, shoulders slightly forward, as if holding its breath; hairline cracks run up through the shell. **Cue:** a single small bright spark at the crown, like a fuse about to burn down.

**10. `art/portraits/figments/figment-sentinel.png`** | Sentinel
- **What and job:** a turret the bots build. It does not move; it fires at the nearest enemy each turn (or at one you choose with Fix); the enemy can destroy it.
- **Silhouette:** a tall slender spire on three legs, one lens, one long barrel.
- **Show:** three braced legs under a thin tall body; one round lens and one long barrel pointing right; motes rising off the top.
- **Avoid:** bolted, welded metal like a real turret (that is the Scrap Turret; this is bots); a face or a sniper-like human.
> **Form and meaning:** the Sentinel: a standing turret the bots build, that watches and fires. **Subject:** a tall slender spire of cream flecks on three braced legs, one round lens and one long barrel clamped on and pointing right; no hands, no face. **Stature:** tall and thin, centred. **Pose:** planted square, barrel levelled to the right, perfectly still. **Cue:** one short broken line from the muzzle to show where it points.

**11. `art/portraits/figments/figment-glass.png`** | Glass
- **What and job:** a mirror that returns healing. Mender's mirror: it flies; when an ally near it is healed, another ally next to it is healed too; Reflect heals on order.
- **Silhouette:** a hand mirror with a cross-shaped glint on its face.
- **Show:** a round mirror face on a short handle; a plain plus-shaped glint of cream on the glass; the handle fraying into motes.
- **Avoid:** a reflection of a face or any person in the glass; a red cross or any real medical symbol (a plain plus-shaped glint only).
> **Form and meaning:** the Glass: a floating mirror that returns healing to another ally. **Subject:** a round hand mirror made of cream flecks with a plain plus-shaped glint on its face and a short handle; the glass shows no reflection and no face. **Stature:** small and slim, centred. **Pose:** hovering, tilted slightly toward the upper right as if catching light. **Cue:** a few thin rays of cream leaving the glint in two directions, the mended pair.

**12. `art/portraits/figments/figment-ferry.png`** | Ferry
- **What and job:** a winged sled that carries an ally, or you. Carrier and mount: Carry moves an ally to a free tile within 3; Ride moves you.
- **Silhouette:** a low winged sled with a saddle line along its back.
- **Show:** a long low body with two short wing blades; a saddle line or shallow seat on its back; the tail dissolving into motes.
- **Avoid:** a horse, a boat or a vehicle with wheels, doors or windows; a rider on it.
> **Form and meaning:** the Ferry: a low winged sled that carries an ally across the map, or its owner. **Subject:** a long low sled-shaped body of cream flecks with two short wing blades and a shallow saddle hollow along its back; no rider, no face. **Stature:** long, low and wide. **Pose:** skimming just above the ground, nose raised toward the upper right, wings level. **Cue:** long speed marks trailing from the tail, as if just set down.

**13. `art/portraits/figments/figment-breaker.png`** | Breaker
- **What and job:** a ram that smashes cover and doors. Breaker of cover: heavy, armoured, cannot be knocked back; Batter breaks the cover or door next to it.
- **Silhouette:** a ram's head on a short battering beam, broad and low.
- **Show:** a heavy blunt head with two curled horns as marks; the beam trailing behind it and fraying; the densest, most tightly packed flecks of the set.
- **Avoid:** a realistic animal, eyes or fur; a siege engine with wheels or rope.
> **Form and meaning:** the Breaker: a heavy ram built of bots that smashes cover and doors. **Subject:** a broad blunt ram's head with two curled horns on a short battering beam, built of dense cream flecks; no eye, no face, no body. **Stature:** broad, low and heavy. **Pose:** braced and level, head lowered toward the right, about to drive forward. **Cue:** a few chips of cream flying off the head's face as if it had just struck stone.

**14. `art/portraits/figments/figment-hush.png`** | Hush
- **What and job:** a jammer. It flies; machines near it aim worse; Jam makes an enemy within 4 Silenced for a round.
- **Silhouette:** a round speaker grille with a slash through it.
- **Show:** a round grille of small dots; one clean diagonal slash through it; motes drifting off the rim like a sound fading.
- **Avoid:** a mouth, a face or a finger-on-lips gesture; a radio, antenna or any real device with a dial.
> **Form and meaning:** the Hush: a floating jammer that muffles machines and silences a foe. **Subject:** a round speaker-like grille made of an even grid of small cream dots, with one clean diagonal slash through it and no mouth or face. **Stature:** small, round, compact. **Pose:** hovering, tilted slightly, the slash catching the light. **Cue:** a few concentric arcs of cream fading and breaking up beside it, sound being cut off.

Not in this list: the **Scrap Turret** is a machine the Rigger welds from salvage, not a Figment (angular and welded,
no flecks); its portrait is already requested as number 6 in `GPT-PROMPTS-2026-11-13-classes-3.0.md` Job 3 and is not
repainted here. The **monoline line icons** for the five forms in the game are drawn in-house (branch
`fix/0.28.2-figment-fx`, `art/icons/figments/`), and **the nine new forms' line icons will also be drawn in-house**:
none is requested.

## Not requested: the Visualizer glove

The Visualizer already has painted item art: catalog id **`focus-visualizer`** (`art/icons/gear/focus-visualizer.png`,
with 256, 128, 64 and 32 px exports, `review-candidate`) and a monoline `art/icons/focus/visualizer.svg`. Nothing to
paint. (The glove is always required to Picture; Leon, 15 Nov 2026.)

## Part 2 (SECOND PRIORITY: only after the 14 portraits): 24 Wick icons

Do these last. They are white flat-ink icons in the house style of the trait and perk icons: pure white `#FFFFFF` on
transparency, 1024 x 1024 PNG, **no colour, no grey, no glow** (the game draws them as a mask in the screen's colour),
readable at 32 px; master `art/icons/traits/mind-without-fog.png`, rule `art/icons/STYLE-LOCK.md`; also attach
`art/icons/perks/mirage.png`, `solid-image.png` and `many-hands.png`. They are objects and gestures, **never a second
Wick and never the Figment itself**; bots are small dots or squares. They show on trait chips, on the unlock card
(design 4.2, item 15) and on order buttons. The ten older trait icons (Armoured, Swift, Loud, Volatile, Tethered,
Mirror, Barbed, Lasting, Keen, Hollow), Picture and Let go are already requested in
`GPT-PROMPTS-2026-11-13-classes-3.0.md` Job 1 batch D and are not repeated. Files: `art/icons/figments/trait-<id>.png`
and `art/icons/figments/order-<id>.png`.

**New traits (12)**

| # | File | Trait | The prop or gesture |
| --- | --- | --- | --- |
| 15 | `trait-kindling.png` | Kindling | a small flame catching on a twig |
| 16 | `trait-rime.png` | Rime | a six-armed frost crystal |
| 17 | `trait-static.png` | Static | a zigzag spark between two points |
| 18 | `trait-bedrock.png` | Bedrock | a heavy block set on layered strata |
| 19 | `trait-gust.png` | Gust | three curling wind lines pushing a leaf |
| 20 | `trait-caustic.png` | Caustic | a drop eating a hole through a plate |
| 21 | `trait-skittish.png` | Skittish | a small shape darting behind a low wall |
| 22 | `trait-spiteful.png` | Spiteful | a cracked shape with a mark above it |
| 23 | `trait-stubborn.png` | Stubborn | a bent post still standing, one dot of life |
| 24 | `trait-kindred.png` | Kindred | two small shapes side by side with a spark between |
| 25 | `trait-quiet.png` | Quiet | a dot inside a closed ring, no lines |
| 26 | `trait-overcharged.png` | Overcharged | a dial past its limit with a fading edge |

**Orders (12)**

| # | File | Order | The prop or gesture |
| --- | --- | --- | --- |
| 27 | `order-draw-fire.png` | Draw fire (Double) | an arrow bending toward a decoy shape |
| 28 | `order-press.png` | Press (Wall) | a flat hand pushing a block |
| 29 | `order-trip.png` | Trip (Snare) | a caltrop with a stumbling line over it |
| 30 | `order-hand-over.png` | Hand over (Hand) | an open palm passing a capsule |
| 31 | `order-interpose.png` | Interpose (Ward) | a shield stepping between two dots |
| 32 | `order-burst.png` | Burst (Husk) | a hollow shell splitting outward |
| 33 | `order-fix.png` | Fix (Sentinel) | a barrel with a crosshair ring |
| 34 | `order-reflect.png` | Reflect (Glass) | a mirror with two rays leaving it |
| 35 | `order-carry.png` | Carry (Ferry) | a sled carrying one dot |
| 36 | `order-batter.png` | Batter (Breaker) | a ram head striking a cracked slab |
| 37 | `order-jam.png` | Jam (Hush) | a grille with a slash and broken waves |
| 38 | `order-redraw.png` | Redraw (any form) | a shape dissolving in one place and re-forming in another |

(The other two caster orders, Cash in and Look through, reuse Let go's icon and the Eye's and need none. Ride shares
Carry's icon and Filch shares Hand over's.)

## Effects

The summon and unravel effects (a form gathering from bots, coming apart) are SVG lines in the game today. **No effect
sheet is requested**; if the artist wishes to offer one (a short sheet of flecks gathering into a shape and unravelling,
Expression petrol blue and cream on transparency), it is welcome but not needed.
